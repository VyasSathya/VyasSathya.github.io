#!/usr/bin/env bash
# Wait until the App Store Connect app record for com.vyassathya.bandsurvivors exists (it is made once in the browser),
# then upload build N to TestFlight. Checks every 3 minutes for up to 24 hours. Run through the jobs ledger:
#   python C:/Users/vyass/.codex/brain/tools/jobs.py start --name band-survivors-tf-N --keep -- bash <this file> N
N=${1:-1}
HERE="$(cd "$(dirname "$0")" && pwd)"
scp -q "$HERE/asc_setup.py" mac-build:Dev/mac-build-hub/artifacts/band-survivors/asc_setup.py
for i in $(seq 1 480); do
  line=$(timeout 240 ssh -o ConnectTimeout=60 mac-build "cd ~/Dev/mac-build-hub/artifacts/band-survivors && zsh -lc 'python3 asc_setup.py'" 2>&1 | grep 'ASC app record:')
  echo "$(date +%H:%M) $line"
  if [ -n "$line" ] && ! echo "$line" | grep -q 'NOT YET'; then
    exec bash "$HERE/mac.sh" testflight "$N"
  fi
  sleep 180
done
echo "no app record after 24 hours"; exit 1
