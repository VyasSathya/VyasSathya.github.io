"""One Monster Band: streamed music, stereo 192k (2026-11-26, d approved).
Every part is cut from its full-quality wav into 10 s chunks (stereo mp3, 192k, 44.1 kHz), each with 0.5 s of song on both
sides, so the page can fetch and decode a few seconds ahead and play the chunks back to back with no gap
(levels/<id>/s/<part>_<k>.mp3). Decoded memory stays at a couple of chunks per part instead of the whole song.
  python tools/stream_encode.py            # every level in levels/levels.json, from level.json's set_folder
  python tools/stream_encode.py canal      # one level
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf
from math import gcd
from scipy.signal import resample_poly

HERE = os.path.dirname(os.path.abspath(__file__)); GAME = os.path.dirname(HERE)
WORK = 'D:/music-battler-work/band-survivors'
CHUNK = 10.0; PAD = 0.5; SR = 44100; KBPS = 192

def load44(p):
    y, sr = sf.read(p, dtype='float32'); y = y if y.ndim > 1 else np.repeat(y[:, None], 2, 1)
    if sr != SR:
        g = gcd(sr, SR); y = resample_poly(y, SR // g, sr // g, axis=0).astype('float32')
    return y

def encode_part(y, dst_dir, part, LE):
    n = int(np.ceil(LE / CHUNK)); pad = int(PAD * SR); ck = int(CHUNK * SR); tot = 0
    for k in range(n):
        a = k * ck - pad; b = (k + 1) * ck + pad
        seg = np.zeros((b - a, 2), 'float32'); lo = max(a, 0); hi = min(b, len(y))
        if hi > lo: seg[lo - a:hi - a] = y[lo:hi]
        dst = os.path.join(dst_dir, f'{part}_{k}.mp3')
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0',
                            '-c:a', 'libmp3lame', '-b:a', f'{KBPS}k', '-ar', str(SR), dst],
                           input=np.clip(seg, -1, 1).tobytes(), capture_output=True)
        if r.returncode: sys.exit(r.stderr.decode()[-2000:])
        tot += os.path.getsize(dst)
    return n, tot

def encode_level(lid):
    L = os.path.join(GAME, 'levels', lid); lj = json.load(open(os.path.join(L, 'level.json')))
    nj = json.load(open(os.path.join(L, 'notes.json'))); LE = nj['loop']['end_s']; S = lj['set_folder']
    out = os.path.join(L, 's'); os.makedirs(out, exist_ok=True); tot = 0; n = 0
    for p in lj['parts']:
        src = os.path.join(S, p + '.wav')
        dry = os.path.join(WORK, 'dry', lid + '_voice_lead.wav')
        if p == 'voice_lead' and os.path.exists(dry): src = dry
        n, t = encode_part(load44(src), out, p, LE); tot += t
    lj['stream'] = {'chunk': CHUNK, 'pad': PAD, 'n': n, 'kbps': KBPS, 'channels': 2}
    json.dump(lj, open(os.path.join(L, 'level.json'), 'w'), indent=1)
    print(lid, 'chunks/part', n, 'MB', round(tot / 1e6, 1), flush=True)

if __name__ == '__main__':
    ids = sys.argv[1:] or [l['id'] for l in json.load(open(os.path.join(GAME, 'levels', 'levels.json')))]
    for i in ids: encode_level(i)
