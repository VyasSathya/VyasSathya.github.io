"""Make the src.tar that ci/mac.sh sends to the Mac: ios/ and ci/ as committed, and web/ = the game as committed
(index.html, img/, levels/*.json, mouths.json) plus every level's part mp3s from disk (they are rebuilt by
tools/build_all.sh and kept out of git). Stops if a level is missing an mp3 its level.json lists.

    python ci/pack.py <out.tar> [<commit>]
"""
import io
import json
import subprocess
import sys
import tarfile
from pathlib import Path

GAME = Path(__file__).resolve().parent.parent
REL = 'docs/ideas/play/band-survivors'
out, commit = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'HEAD')
repo = subprocess.run(['git', 'rev-parse', '--show-toplevel'], cwd=GAME, capture_output=True, text=True, check=True).stdout.strip()


def git_tar(paths, prefix=''):
    data = subprocess.run(['git', 'archive', '--format=tar', f'--prefix={prefix}', f'{commit}:{REL}', *paths],
                          cwd=repo, capture_output=True, check=True).stdout
    return tarfile.open(fileobj=io.BytesIO(data))


with tarfile.open(out, 'w') as t:
    for src in (git_tar(['ios', 'ci']), git_tar(['index.html', 'img', 'levels', 'mouths.json', 'vendor', 'sfx'], 'web/')):
        for m in src.getmembers():
            t.addfile(m, src.extractfile(m) if m.isfile() else None)
    levels = json.loads((GAME / 'levels' / 'levels.json').read_text())
    n = 0
    for lv in levels:
        d = GAME / 'levels' / lv['id']
        for p in json.loads((d / 'level.json').read_text())['parts']:
            f = d / f'{p}.mp3'
            if not f.exists():
                sys.exit(f'missing {f}: run tools/build_all.sh')
            t.add(f, arcname=f'web/levels/{lv["id"]}/{p}.mp3'); n += 1
print(f'packed {out}: {len(levels)} levels, {n} part mp3s, {round(Path(out).stat().st_size / 1e6, 1)} MB')
