#!/usr/bin/env python3
"""Plays the game by bot through `pav repl`, and captures each screen the first time it shows."""
import json, subprocess, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
out = ROOT / "notes/cap/tour"; out.mkdir(parents=True, exist_ok=True)
scene = sys.argv[1] if len(sys.argv) > 1 else "fit"
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20000
step = int(sys.argv[3]) if len(sys.argv) > 3 else 3
p = subprocess.Popen(["./target/debug/pav", "repl"], cwd=ROOT / "engine", stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
def cmd(c):
    p.stdin.write(c + "\n"); p.stdin.flush()
    return p.stdout.readline()
print(cmd(f"load scene={scene}")[:120])
seen = {}
t = 0
try:
    while t < limit:
        r = cmd(f"play bot=true ticks={step}")
        t += step
        try:
            s = json.loads(r)
        except Exception:
            print("bad", r[:200]); break
        st = s.get("status") or s.get("game", {}).get("status") or {}
        name = st.get("screen", "?")
        ev = st.get("event") or ""
        key = name + ("-" + ev if name in ("card", "event", "result") else "")
        if key not in seen:
            seen[key] = t
            # A moment later the screen has settled.
            cmd("play bot=false ticks=2")
            print(key, t, cmd(f"capture width=1280 height=720 out={out}/{key.replace(' ','_')}.png")[:60], flush=True)
        if s.get("outcome") not in (None, "playing"):
            print("outcome", s.get("outcome")); break
finally:
    p.terminate()
