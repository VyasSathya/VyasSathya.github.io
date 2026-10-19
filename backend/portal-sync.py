"""Feed the studio's bars from what already exists on Vyas's PC.

For every portal project, reads its feeds (set in Studio > Settings):
  hub    - task ids on the live hub (progress.json); each subtask becomes a checklist item
  brain  - Brain project id; current handoff heads give last activity and remaining count
  repo   - local git folder; last commit time
  github - owner/name; last commit time when there is no local folder (needs gh)
New items land in the project's current milestone, hidden from the client until shown in Studio.
Keys live in %USERPROFILE%/.vyasapps-portal/keys.json (never in a repo). Logs to sync.log beside it.
Run: python portal-sync.py   (scheduled every 30 min with pythonw, no window)
"""
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HOME = Path(os.environ.get("USERPROFILE", Path.home()))
CONF = HOME / ".vyasapps-portal"
HUB = Path(r"C:\Dev\sparktory\apps\spark-set\data\comedy-knowledge\louis-resplit-2026-09-18\pages\progress.json")
BRAIN = HOME / ".codex" / "brain" / "handoffs"
ENDPOINT = "https://ihmayqzxqyednchbezya.supabase.co/functions/v1/portfolio-portal"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlobWF5cXp4cXllZG5jaGJlenlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzcyOTgsImV4cCI6MjA4Mzc1MzI5OH0._xhGhkqoy7AMm7M5dxSHXM_yeP8zVAJG-BaGMICtHFo"
NO_WINDOW = 0x08000000 if os.name == "nt" else 0


def log(msg):
    CONF.mkdir(exist_ok=True)
    line = f"{datetime.now().isoformat(timespec='seconds')} {msg}\n"
    with open(CONF / "sync.log", "a", encoding="utf-8") as f:
        f.write(line)
    try:  # keep the log small
        p = CONF / "sync.log"
        if p.stat().st_size > 400_000:
            p.write_text("".join(p.read_text(encoding="utf-8").splitlines(True)[-2000:]), encoding="utf-8")
    except OSError:
        pass
    if sys.stdout:
        print(msg)


def call(key, op, **body):
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps({"op": op, **body}).encode(),
        headers={"Content-Type": "application/json", "apikey": ANON, "Authorization": "Bearer " + ANON, "x-portal-key": key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def run(cmd, cwd=None):
    try:
        out = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=30, creationflags=NO_WINDOW)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.TimeoutExpired):
        return ""


def hub_items(task_ids, hub):
    by_id = {t.get("id"): t for t in hub.get("items", [])}
    out = []
    for tid in task_ids:
        t = by_id.get(tid)
        if not t:
            continue
        subs = [s for s in (t.get("items") or []) if isinstance(s, dict) and s.get("title")]
        if subs:
            for s in subs:
                out.append({"ref": f"{tid}/{s.get('id') or s['title'][:60]}", "title": s["title"], "done": s.get("status") == "done"})
        elif t.get("title"):
            out.append({"ref": tid, "title": t["title"], "done": t.get("status") == "done"})
    return out


def brain_signal(project):
    d = BRAIN / project
    if not project or not d.is_dir():
        return {}
    heads = []
    for f in d.glob("*.json"):
        try:
            heads.append(json.loads(f.read_text(encoding="utf-8")))
        except (OSError, ValueError):
            continue
    if not heads:
        return {}
    return {
        "handoff_at": max(h.get("created_at", "") for h in heads),
        "remaining": sum(len(h.get("remaining") or []) for h in heads),
        "heads": len(heads),
    }


def commit_time(repo, github):
    if repo and Path(repo).is_dir():
        t = run(["git", "log", "-1", "--format=%cI"], cwd=repo)
        if t:
            return t
    if github:
        t = run(["gh", "api", f"repos/{github}/commits?per_page=1", "--jq", ".[0].commit.committer.date"])
        if t:
            return t
    return ""


def iso(t):
    try:
        return datetime.fromisoformat(t.replace("Z", "+00:00")).astimezone(timezone.utc).isoformat()
    except ValueError:
        return ""


def main():
    try:
        key = json.loads((CONF / "keys.json").read_text())["sync"]
    except (OSError, ValueError, KeyError):
        log("no sync key in keys.json")
        return 1
    try:
        projects = call(key, "view").get("projects", [])
    except Exception as e:  # network or auth
        log(f"view failed: {e}")
        return 1
    try:
        hub = json.loads(HUB.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        hub = {}
        log(f"hub unreadable: {e}")

    items, signals = [], {}
    for p in projects:
        s = p.get("sources") or {}
        for it in hub_items(s.get("hub") or [], hub):
            items.append({**it, "project_id": p["id"], "source": "hub"})
        sig = brain_signal(s.get("brain") or "")
        commit = commit_time(s.get("repo") or "", s.get("github") or "")
        if commit:
            sig["last_commit"] = iso(commit)
        times = [t for t in (sig.get("handoff_at"), sig.get("last_commit")) if t]
        if times:
            sig["last_activity"] = max(iso(t) or t for t in times)
        if sig:
            sig["synced_at"] = datetime.now(timezone.utc).isoformat()
            signals[p["id"]] = sig

    try:
        r = call(key, "sync", source="pc", items=items, signals=signals, note=f"{len(projects)} projects")
        log(f"ok added={r.get('added')} changed={r.get('changed')} skipped={r.get('skipped')} items={r.get('items')} projects={r.get('projects')}")
        return 0
    except Exception as e:
        log(f"sync failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
