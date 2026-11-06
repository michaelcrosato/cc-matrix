#!/usr/bin/env python3
"""Drives `pav repl` from engine/: lets the bot play until a screen comes up, presses things,
takes captures. Usage: tools/tour.py sheetname step step ...
Steps: goto:SCREEN  bot:TICKS  press:BUTTON  move:X,Y:TICKS  lean:X,Y:TICKS  idle:TICKS  shot:NAME  scene:NAME"""
import json, subprocess, sys
W, H = 640, 360
args = sys.argv[1:]
if args and args[0].startswith("size="):
    W, H = map(int, args[0][5:].split("x")); args = args[1:]
sheet = args[0]
p = subprocess.Popen(["./target/debug/pav", "repl"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
def cmd(line):
    p.stdin.write(line + "\n"); p.stdin.flush()
    return p.stdout.readline()
def screen():
    out = json.loads(cmd("play ticks=1"))
    st = out.get("status") or out
    return st.get("screen"), st
shots = []
cmd("load scene=fit")
for s in args[1:]:
    k, _, v = s.partition(":")
    if k == "scene":
        cmd(f"load scene={v}")
    elif k == "goto":
        for i in range(4000):
            cur, st = screen()
            if cur == v:
                break
            cmd("play bot=true ticks=10")
        else:
            print("never reached", v, st)
    elif k == "bot":
        cmd(f"play bot=true ticks={v}")
    elif k == "idle":
        cmd(f"input ticks={v}")
    elif k == "press":
        cmd(f"input press={v} ticks=2"); cmd("input ticks=10")
    elif k == "move":
        d, t = v.rsplit(":", 1); cmd(f"input move=[{d}] ticks={t}")
    elif k == "lean":
        d, t = v.rsplit(":", 1); cmd(f"input lean=[{d}] ticks={t}")
    elif k == "shot":
        cmd(f"capture width={W} height={H} out=out/t_{v}.png"); shots.append(f"out/t_{v}.png")
p.stdin.close(); p.wait(timeout=20)
rows = [shots[i:i + 3] for i in range(0, len(shots), 3)]
cmdline = ["magick"]
for r in rows:
    cmdline += ["("] + r + ["+append", ")"]
cmdline += ["-append", f"out/{sheet}.png"]
subprocess.run(cmdline, check=True)
print(f"out/{sheet}.png", len(shots))
