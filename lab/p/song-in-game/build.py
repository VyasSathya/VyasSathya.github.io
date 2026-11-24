"""Song in the game: builds index.html from family.html with the families, layers (cleaned sneaky stems plus the extra
family voices), note times for the flashes, the cast pictures, the presets and the auto level.
  python build.py"""
import json, os, shutil, subprocess
import numpy as np, soundfile as sf, librosa, pyloudnorm as pyln
from PIL import Image
from scipy.signal import butter, sosfiltfilt
HERE = os.path.dirname(os.path.abspath(__file__)); S = 'D:/music-battler-work/songs/sneaky_parts/set_clean'
F = 'D:/music-battler-work/songs/sneaky_family'; CAST = 'C:/Dev/music-battler/docs/design/cast/img/chars'
info = json.load(open(f'{S}/stems.json')); SR = 48000; meter = pyln.Meter(SR)
N = len(sf.read(f'{S}/drums.wav', frames=1)[0]) and sf.info(f'{S}/drums.wav').frames; lead_in = int(round(info['first_downbeat_s'] * SR))
FAMS = [('drums', 'Drums', 'band', 'drums', None, ['pebble_drummer', 'circle_caller', 'powder_monkey']),
        ('bass', 'Bass', 'band', 'bass', 'bass_sub', ['thunder_ox', 'tok_echo', 'dread_fundamental']),
        ('brass', 'Brass', 'band', 'brass', None, ['bell_bear', 'bone_thimble']),
        ('woodwinds', 'Woodwinds', 'band', 'woodwinds', None, ['heartsick_crooner', 'lazy_drone']),
        ('strings', 'Strings', 'band', 'strings', None, ['sharp_harmonic', 'scythe_hand']),
        ('guitar', 'Guitar', 'band', 'guitar', None, ['glad_hummer', 'tomorrow_soprano']),
        ('tune', 'Tune', 'sung', None, None, [('moss_riffer', 'tune_lead'), ('island_whistler', 'tune_multi'), ('masquerade_mezzo', 'tune_chorus')]),
        ('bom', 'Bom', 'sung', None, None, [('skip_chorister', 'bom_bass'), ('cutlass_baritone', 'bom_lowend')]),
        ('doowah', 'Doo-wah', 'sung', None, None, [('pit_bellower', 'doowah')])]
os.makedirs(f'{HERE}/parts', exist_ok=True); os.makedirs(f'{HERE}/img', exist_ok=True)
def place(src, advance_ms, tone, target):
    """A converted voice line (score time, beat 0 at 0 s) placed on the set's clock, its tone filter, at a level."""
    y, sr = sf.read(src, dtype='float32'); y = y.mean(1) if y.ndim > 1 else y
    y = sosfiltfilt(butter(2, tone, 'bandpass', fs=SR, output='sos'), y).astype(np.float32)
    a = int(advance_ms / 1000 * SR); z = np.zeros(N, np.float32); k = min(N - (lead_in - a), len(y)); z[lead_in - a:lead_in - a + k] = y[:k]
    z *= 10 ** ((target - meter.integrated_loudness(z)) / 20); return np.stack([z * .97, z], 1)
def write(name, y):
    sf.write(f'{HERE}/parts/{name}.wav', y, SR, subtype='FLOAT')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{HERE}/parts/{name}.wav', '-b:a', '160k', f'{HERE}/parts/{name}.mp3'], check=True)
    os.remove(f'{HERE}/parts/{name}.wav')
for k in ('drums', 'bass', 'brass', 'woodwinds', 'strings', 'guitar'): shutil.copy(f'{S}/{k}.mp3', f'{HERE}/parts/{k}.mp3')
sub, _ = sf.read(f'{F}/bass_sub.wav', dtype='float32'); write('bass_sub', sub[:N])
# every voice goes through the fit pass he chose ("after sounds better", 2026-11-23): raw voices next to the band stems
RAW = 'D:/music-battler-work/songs/sneaky_parts/set_raw'; T = 'D:/music-battler-work/songs/demo_fit'; shutil.rmtree(T, ignore_errors=True); os.makedirs(f'{T}/in')
for k in ('bass', 'brass', 'woodwinds', 'guitar', 'drums', 'strings'): shutil.copy(f'{S}/{k}.wav', f'{T}/in/{k}.wav')
shutil.copy(f'{RAW}/voice_bom.wav', f'{T}/in/bom_bass.wav'); shutil.copy(f'{RAW}/voice_doowah_lo.wav', f'{T}/in/doowah.wav')
for name, adv, tone in (('tune_lead', 60, (180, 6000)), ('tune_multi', 40, (150, 6000)), ('tune_chorus', 60, (180, 6000)), ('bom_lowend', 50, (40, 4000))):
    sf.write(f'{T}/in/{name}.wav', place(f'{F}/c_{name}.wav', adv, tone, -24), SR, subtype='FLOAT')
P = ['bom_bass=bass', 'bom_lowend=bass', 'doowah=guitar', 'tune_lead=woodwinds', 'tune_multi=woodwinds', 'tune_chorus=woodwinds']
HP = ['bom_bass=110', 'bom_lowend=110', 'doowah=160', 'tune_lead=200', 'tune_multi=200', 'tune_chorus=200']
subprocess.run(['python', 'C:/Dev/toybox/music-kit/stems/voices_fit.py', f'{T}/in', f'{T}/out', *sum([['--pair', x] for x in P], []), '--shape', 'doowah=brass',
                *sum([['--hp', x] for x in HP], []), '--room', 'D:/music-battler-work/songs/suno_sneaky/stems/reverb_ir.npy', '--target', '-1', '--skip', 'eq,comp,distance', '--wet', '.9'],
               check=True, capture_output=True)
for name in ('bom_bass', 'bom_lowend', 'doowah', 'tune_lead', 'tune_multi', 'tune_chorus'):
    write(name, sf.read(f'{T}/out/{name}.wav', dtype='float32')[0])
layers = {}
for f in sorted(os.listdir(f'{HERE}/parts')):
    if not f.endswith('.mp3'): continue
    k = f[:-4]; y, _ = librosa.load(f'{HERE}/parts/{f}', sr=22050, mono=True)
    on = librosa.onset.onset_detect(y=y, sr=22050, units='time', delta=.12); rms = librosa.feature.rms(y=y, hop_length=512)[0]; thr = rms.max() * 10 ** (-30 / 20)
    layers[k] = dict(src=f'parts/{f}', on=[round(float(t), 3) for t in on if rms[min(len(rms) - 1, int(t * 22050 / 512))] > thr])
families = []
for fid, name, kind, layer, third, mem in FAMS:
    ms = []
    for m in mem:
        ch, lay = (m, None) if isinstance(m, str) else m
        if not os.path.exists(f'{HERE}/img/{ch}.webp'):
            im = Image.open(f'{CAST}/{ch}.webp').convert('RGBA'); im = im.crop(im.getbbox()); im = im.resize((int(im.width * 240 / im.height), 240), Image.LANCZOS); im.save(f'{HERE}/img/{ch}.webp', 'WEBP', quality=88)
        d = dict(id=ch, img=f'img/{ch}.webp')
        if lay: d['layer'] = lay
        ms.append(d)
    families.append(dict(id=fid, name=name, kind=kind, layer=layer, third=third, members=ms))
bars = round((info['seconds'] - info['first_downbeat_s']) // info['bar_seconds'])
data = dict(bpm=info['bpm'], bar=info['bar_seconds'], fd=info['first_downbeat_s'], loopEnd=round(info['first_downbeat_s'] + bars * info['bar_seconds'], 4),
            sectionBars=8, togetherSection=3, layers=layers, families=families,
            fullBand=['drums', 'bass', 'brass', 'woodwinds', 'strings', 'guitar', 'tune'],
            presets=dict(full=['pebble_drummer', 'thunder_ox', 'bell_bear', 'heartsick_crooner', 'sharp_harmonic', 'glad_hummer', 'moss_riffer'],
                         thin=['thunder_ox', 'moss_riffer']),
            autoLevel=[['p', 'pebble_drummer', 10], ['p', 'thunder_ox', 12], ['p', 'moss_riffer', 7], ['p', 'tok_echo', 13], ['p', 'bell_bear', 2],
                       ['p', 'island_whistler', 17], ['p', 'heartsick_crooner', 22], ['p', 'sharp_harmonic', 4], ['p', 'glad_hummer', 14],
                       ['p', 'dread_fundamental', 11], ['p', 'masquerade_mezzo', 1], ['p', 'skip_chorister', 20], ['e', 'bell_bear', 0, 1],
                       ['e', 'moss_riffer', 0, 2], ['e', 'pebble_drummer', 0, 2], ['p', 'circle_caller', 10, 4], ['c', '', 0, 2]])
page = open(f'{HERE}/family.html', encoding='utf-8').read().replace('__DATA__', json.dumps(data))
open(f'{HERE}/index.html', 'w', encoding='utf-8', newline='\n').write(page)
for f in ('page.html', 'data.json'):
    if os.path.exists(f'{HERE}/{f}'): os.remove(f'{HERE}/{f}')
print('layers', {k: len(v['on']) for k, v in layers.items()})
