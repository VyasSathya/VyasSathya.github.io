"""Band Survivors: one song in, one playable level out (2026-11-24).

In: a song set made by the song-stems recipe (C:/Dev/toybox/music-kit/stems/recipe.py), i.e. a folder with one wav per
part, full.wav, stems.json and notes.json. Or a split Suno take (fetch.py folder): then recipe.py runs first.
Out: levels/<id>/ in the game folder (one mp3 per part, notes.json, level.json) and the level added to levels/levels.json.

What it does:
  1. (--take) runs recipe.py on the take to make the set;
  2. the lead singer dry: voices_fit.py again on the set's raw folder with distance, early reflections and room left out
     (Vyas 2026-11-24: the roomy lead sounded "like its in a room like at th bak with a bak mic like ahome recording"),
     matched to the wet lead's loudness; backing voices keep their room;
  3. every part as mono mp3 (lead 80k, the rest 56k, 44.1 kHz): a level is about 8 MB to download and about 300 MB
     decoded, which a phone holds (13 stereo parts of a 150 s song would be about 690 MB);
  4. notes.json cut down to what the game reads (loop, bar grid, sections, every note of every part);
  5. the song's big moments from the full mix (per-bar loudness): the section starts with the biggest lift, where the
     bosses come in, and a per-bar energy curve the spawner follows;
  6. the place: enemy, elite and boss pictures copied from the cast pictures (docs/design/cast/img/chars) into img/.

  python make_level.py --set D:/.../set --id day-lawn --title "Day Lawn" --order 2 --diff 2
         --enemies glad_hummer,tiny_peep,rite_singer --elites bell_bear --boss gong_golem
         --ground "#2E6B3F" --accent "#FFD84A"
  python make_level.py --take D:/.../t1 --name "New song" --recipe-args "--melody woodwinds --fill brass" --id ... (rest as above)
"""
import argparse, json, os, shutil, subprocess, sys, tempfile
import numpy as np, soundfile as sf, pyloudnorm as pyln

HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.dirname(HERE)
STEMS = 'C:/Dev/toybox/music-kit/stems'; CAST = os.path.join(GAME, '..', '..', '..', 'design', 'cast', 'img', 'chars')
WORK = 'D:/music-battler-work/band-survivors'
ap = argparse.ArgumentParser()
ap.add_argument('--set'); ap.add_argument('--take'); ap.add_argument('--name'); ap.add_argument('--recipe-args', default='')
ap.add_argument('--id', required=True); ap.add_argument('--title', required=True); ap.add_argument('--order', type=float, default=99)
ap.add_argument('--diff', type=float, default=1, help='1 = first level; each step makes enemies tougher and the run longer')
ap.add_argument('--minutes', type=float, help='run length (default 3.5 + 0.35 per difficulty step)')
ap.add_argument('--lead-pair', help='part the lead voice rides (default: woodwinds, brass or bass, whichever the set has)')
ap.add_argument('--lead-wav', help='an already dry lead (skips the refit)')
ap.add_argument('--keep-room', action='store_true', help='leave the lead as it is in the set')
ap.add_argument('--refit', action='store_true', help='make the dry lead again even if one was made before')
ap.add_argument('--out', help='write the part set to this folder instead of levels/<id>; no tour stop is added and no pictures are copied (Sing Island World reads it this way)')
ap.add_argument('--meta-only', action='store_true', help='only redo notes.json and level.json (no lead refit, no mp3s)')
ap.add_argument('--enemies', default=''); ap.add_argument('--elites', default=''); ap.add_argument('--boss', default='')
ap.add_argument('--ground', default='#1E524C'); ap.add_argument('--accent', default='#FFD84A'); ap.add_argument('--blurb', default='')
ap.add_argument('--source', default='')
a = ap.parse_args()
SR = 48000; meter = pyln.Meter(SR); PY = sys.executable
def run(*cmd):
    r = subprocess.run([str(c) for c in cmd], capture_output=True, text=True)
    if r.returncode: sys.exit(r.stdout[-2000:] + r.stderr[-3000:])
    return r.stdout
def rd(p):
    y, sr = sf.read(p, dtype='float32'); y = y if y.ndim > 1 else np.repeat(y[:, None], 2, 1)
    assert sr == SR, (p, sr); return y

# ---------- 1. the set
S = a.set
if a.take:
    out = os.path.join(WORK, 'sets', a.id); os.makedirs(out, exist_ok=True)
    run(PY, f'{STEMS}/recipe.py', a.take, out, '--name', a.name or a.title, *a.recipe_args.split())
    S = os.path.join(out, 'set')
if not S or not os.path.exists(os.path.join(S, 'notes.json')): sys.exit('need --set <recipe set folder> or --take')
info = json.load(open(os.path.join(S, 'stems.json'))); nj = json.load(open(os.path.join(S, 'notes.json')))
parts = sorted(f[:-4] for f in os.listdir(S) if f.endswith('.wav') and f != 'full.wav')
parts = [p for p in parts if p in nj['compact'] and nj['compact'][p]]   # a part with no notes cannot attack
L = a.out or os.path.join(GAME, 'levels', a.id); os.makedirs(L, exist_ok=True)
log = {}

# ---------- 2. the lead dry
lead_src = os.path.join(S, 'voice_lead.wav')
if 'voice_lead' in parts and not a.keep_room and not a.meta_only:
    wet = rd(lead_src); target = meter.integrated_loudness(wet)
    cache = os.path.join(WORK, 'dry', a.id + '_voice_lead.wav')
    if a.lead_wav: dry = rd(a.lead_wav); log['lead'] = 'dry, given file ' + a.lead_wav
    elif os.path.exists(cache) and not a.refit: dry = rd(cache); log['lead'] = 'dry, made earlier ' + cache
    else:
        raw = os.path.join(os.path.dirname(S), 'raw')
        if not os.path.exists(os.path.join(raw, 'voice_lead.wav')): sys.exit(f'no raw lead at {raw}; pass --lead-wav or --keep-room')
        pair = a.lead_pair or next(p for p in ('woodwinds', 'brass', 'bass') if os.path.exists(os.path.join(raw, p + '.wav')))
        tmp = os.path.join(WORK, 'fit', a.id); shutil.rmtree(tmp, ignore_errors=True)
        run(PY, f'{STEMS}/voices_fit.py', raw, tmp, '--pair', f'voice_lead={pair}', '--hp', 'voice_lead=200',
            '--target', '-3', '--skip', 'eq,comp,distance,early,room')
        dry = rd(os.path.join(tmp, 'voice_lead.wav')); log['lead'] = f'dry refit from {raw}, rides {pair}, skip eq,comp,distance,early,room'
    n = min(len(dry), len(wet)); dry = np.pad(dry[:n], ((0, len(wet) - n), (0, 0)))
    dry *= 10 ** ((target - meter.integrated_loudness(dry)) / 20)
    pk = np.abs(dry).max(); dry *= min(1, .95 / pk) if pk else 1
    os.makedirs(os.path.join(WORK, 'dry'), exist_ok=True); lead_src = os.path.join(WORK, 'dry', a.id + '_voice_lead.wav')
    sf.write(lead_src, dry, SR, subtype='FLOAT'); log['lead_lufs'] = round(target, 1)

# ---------- 3. mp3 per part
sizes = {p: os.path.getsize(os.path.join(L, p + '.mp3')) for p in parts if os.path.exists(os.path.join(L, p + '.mp3'))}
for p in ([] if a.meta_only else parts):
    src = lead_src if p == 'voice_lead' else os.path.join(S, p + '.wav'); dst = os.path.join(L, p + '.mp3')
    run('ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-b:a', '80k' if p == 'voice_lead' else '56k', dst)
    sizes[p] = os.path.getsize(dst)
for f in ([] if a.meta_only else os.listdir(L)):   # parts no longer in the set
    if f.endswith('.mp3') and f[:-4] not in parts: os.remove(os.path.join(L, f))

# ---------- 4. notes
loop = nj['loop']; BAR = nj['bar_seconds']; LS, LE = loop['start_s'], loop['end_s']
compact = {p: [[round(n[0], 3), int(n[1]), round(n[2], 3)] for n in nj['compact'][p]] for p in parts}
# ---------- 5. big moments: per-bar loudness of the full song over the loop
full = rd(os.path.join(S, 'full.wav')).mean(1)
nb = int(round((LE - LS) / BAR)); db = []
for i in range(nb):
    x = full[int((LS + i * BAR) * SR):int((LS + (i + 1) * BAR) * SR)]
    db.append(10 * np.log10(np.mean(x ** 2) + 1e-10))
db = np.array(db); lo, hi = np.percentile(db, 5), np.percentile(db, 98)
energy = np.clip((db - lo) / max(1e-6, hi - lo), 0, 1)
dens = np.zeros(nb)
for p in parts:
    for t, _, _ in compact[p]:
        b = int((t - LS) // BAR)
        if 0 <= b < nb: dens[b] += 1
dens = dens / max(1, dens.max())
lift = []
for b in range(0, nb, 4):
    nxt = energy[b:b + 8].mean(); prv = energy[max(0, b - 4):b].mean() if b else energy[:4].mean() - .2
    lift.append((float(.6 * nxt + .4 * (nxt - prv) + .15 * dens[b:b + 8].mean()), b))
lift.sort(reverse=True); moments = []
for s, b in lift:
    if all(abs(b - m) >= 12 for m in moments): moments.append(b)
    if len(moments) == 3: break
drop = moments[0]; moments = sorted(moments)
# drum fills: a bar whose second half has far more drum hits than usual; a ring of enemies lands on the next downbeat
dr = compact.get('drums') or compact.get('percussion') or []
half = np.zeros(nb); first = np.zeros(nb)
for t, _, _ in dr:
    x = (t - LS) / BAR; b = int(x)
    if 0 <= b < nb: (half if x - b >= .5 else first)[b] += 1
medh = np.median(half[half > 0]) if (half > 0).any() else 0
ends = [b for b in range(3, nb, 4) if half[b] > 0]   # phrase ends, where a drummer plays a fill
lift_ = {b: half[b] / max(1, first[b]) * min(1.5, half[b] / max(1, medh)) for b in ends}
fills = sorted(int(b) for b in sorted(ends, key=lambda b: -lift_[b])[:max(2, nb // 12)] if lift_[b] >= 1.05)
# chorus downbeats: a 4-bar block much louder than the one before it (elites land there)
blocks = [float(energy[b:b + 4].mean()) for b in range(0, nb, 4)]; p70 = float(np.percentile(blocks, 70))
chorus = [i * 4 for i in range(len(blocks)) if blocks[i] >= p70 and (i == 0 or blocks[i - 1] < blocks[i] - .08)]
notes = dict(bpm=nj['bpm'], beat_seconds=round(60 / nj['bpm'], 5), bar_seconds=BAR, first_downbeat_s=nj['first_downbeat_s'],
             loop=dict(start_s=LS, end_s=LE, bars=nb), compact=compact)
json.dump(notes, open(os.path.join(L, 'notes.json'), 'w'), separators=(',', ':'))

# ---------- 6. place pictures
from PIL import Image
def pic(name, h):
    if a.out: return name   # another game: it brings its own pictures
    src = os.path.join(CAST, name + '.webp')
    if not os.path.exists(src):
        if os.path.exists(os.path.join(GAME, 'img', name + '.webp')): return name
        sys.exit('no cast picture ' + name)
    im = Image.open(src).convert('RGBA'); bb = im.getbbox(); im = im.crop(bb)
    im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
    key = 'c_' + name; im.save(os.path.join(GAME, 'img', key + '.webp'), 'WEBP', quality=88, method=6); return key
spl = lambda s: [x for x in s.split(',') if x]
level = dict(id=a.id, title=a.title, blurb=a.blurb, order=a.order, diff=a.diff,
             minutes=a.minutes or round(3.5 + .35 * (a.diff - 1), 2), bpm=nj['bpm'], parts=parts,
             loop_bars=nb, moments=[int(b) for b in moments], drop=int(drop), fills=fills, chorus=chorus, energy=[round(float(e), 3) for e in energy],
             enemies=[pic(n, 150) for n in spl(a.enemies)], elites=[pic(n, 260) for n in spl(a.elites)],
             boss=pic(a.boss, 360) if a.boss else '', ground=a.ground, accent=a.accent,
             source=a.source or info.get('source') or S, set_folder=os.path.abspath(S).replace(os.sep, '/'), lead=log.get('lead', 'as in the set'))
old = os.path.join(L, 'level.json')
if os.path.exists(old): level['hard'] = json.load(open(old)).get('hard', 1)   # keep the balance check's knob
json.dump(level, open(os.path.join(L, 'level.json'), 'w'), indent=1)
idx = None if a.out else os.path.join(GAME, 'levels', 'levels.json')
lv = json.load(open(idx)) if idx and os.path.exists(idx) else []
lv = [x for x in lv if x['id'] != a.id] + [dict(id=a.id, order=a.order)]
lv.sort(key=lambda x: x['order'])
if idx: json.dump(lv, open(idx, 'w'), indent=1)
print(json.dumps(dict(id=a.id, parts=parts, bars=nb, moments=level['moments'], drop=drop, fills=len(fills), chorus=chorus, mb=round(sum(sizes.values()) / 1e6, 1), lead=log.get('lead')), indent=1))
