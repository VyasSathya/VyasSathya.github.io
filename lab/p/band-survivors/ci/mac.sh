#!/usr/bin/env bash
# From the PC: send the committed game (plus its level mp3s) to the Mac, run ci/mac_run.py there, wait, copy results back.
#   bash ci/mac.sh sim                 simulator build + screenshots; results in received/sim-<sha>/
#   bash ci/mac.sh testflight <N>      archive + upload build N (App Store Connect latest + 1), internal group Team
#   bash ci/mac.sh testers             make sure the internal tester group exists and holds his tester
# One-time setup on the Mac: ci/asc_setup.py (bundle id and App Store profile). Long runs go through the jobs ledger:
#   python C:/Users/vyass/.codex/brain/tools/jobs.py start --name band-survivors-tf-N -- bash <this file> testflight N
set -u
MODE=$1
BUILD=${2:-}
GAME="$(cd "$(dirname "$0")/.." && pwd)"
SHA=$(git -C "$GAME" rev-parse HEAD)
if [ -n "$(git -C "$GAME" status --porcelain -- . ':!levels/*/*.mp3')" ]; then echo "note: uncommitted changes in the game folder are NOT in this build"; fi
if [ "$MODE" = sim ] || [ "$MODE" = testflight ]; then
  python C:/Dev/mac-build-hub/scripts/encoding_check.py --git "$(git -C "$GAME" rev-parse --show-toplevel)" HEAD || { echo "encoding check failed: fix the text first, nothing was sent to the Mac"; exit 1; }
fi
NAME="$MODE-${BUILD:+$BUILD-}${SHA:0:12}"
D="Dev/mac-build-hub/artifacts/band-survivors/$NAME"
SSH="ssh -o ConnectTimeout=120 mac-build"
TMP="D:/music-battler-work/band-survivors/pack"
mkdir -p "$TMP"
python "$GAME/ci/pack.py" "$TMP/src.tar" "$SHA" || exit 1

started=""
for attempt in $(seq 1 10); do
  if timeout 180 $SSH "mkdir -p ~/$D" &&
     timeout 1800 $SSH "cat > ~/$D/src.tar" < "$TMP/src.tar" &&
     timeout 180 $SSH "cat > ~/$D/mac_run.py" < "$GAME/ci/mac_run.py" &&
     timeout 180 $SSH "cd ~/$D && nohup zsh -lc 'python3 mac_run.py $MODE $SHA $BUILD' > run.log 2>&1 < /dev/null & disown; echo started"; then
    started=yes; echo "started $D (attempt $attempt)"; break
  fi
  sleep 60
done
[ -n "$started" ] || { echo "could not reach the Mac"; exit 1; }

for i in $(seq 1 160); do
  sleep 30
  out=$(timeout 150 $SSH "pgrep -f 'mac_run.py $MODE $SHA' >/dev/null && echo __RUNNING__ || echo __STOPPED__" 2>/dev/null)
  if echo "$out" | grep -q __STOPPED__; then break; fi
done
OUT="D:/music-battler-work/band-survivors/received/$NAME"
mkdir -p "$OUT"
scp -q -r "mac-build:~/$D/run.log" "mac-build:~/$D/qa.log" "$OUT/" 2>/dev/null
scp -q -r "mac-build:~/$D/shots" "$OUT/" 2>/dev/null
grep -vE '^\s*$' "$OUT/run.log" | grep -E '=== |QA|SHOT|TAP|GAME_FILES|SIMULATOR|DONE_TESTERS|INFO_PLIST|PRIVACY_MANIFEST|DEVICE_FAMILY|IPA_MB|error:|FAILED|DONE|BETA|TESTERS|build [0-9]+:|NO_ASC|NO_LEVEL|Traceback|Error' | tail -120
echo "results: $OUT"
