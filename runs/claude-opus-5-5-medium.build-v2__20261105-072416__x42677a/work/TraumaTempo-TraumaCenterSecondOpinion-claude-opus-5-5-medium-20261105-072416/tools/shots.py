#!/usr/bin/env python3
"""Drives `pav repl` to look at stages a plain capture can't reach. usage: shots.py"""
import json, subprocess, sys
pav = subprocess.Popen(["./target/debug/pav", "repl"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, stderr=subprocess.DEVNULL)
def send(line):
    pav.stdin.write(line + "\n"); pav.stdin.flush()
    return json.loads(pav.stdout.readline())
def stage(r): return r.get("status", {}).get("stage")
def shot(n): send(f"capture width=1920 height=1080 out=../tests/out/{n}.png")
send("load scene=surgery/case/0")
for _ in range(400):
    r = send("play bot=true ticks=30")
    if stage(r) in ("Complete", "Results"): break
send("input ticks=260"); r = send("play"); shot("results")
send("load scene=surgery/campaign/4"); send("input ticks=30")
for _ in range(10):
    send("play bot=true ticks=4")
send("input ticks=50"); shot("story2")
send("load scene=surgery/campaign/1")
for _ in range(120):
    r = send("play bot=true ticks=3")
    st = r.get("status", {}).get("story")
    if st and st.get("who") == "narrator" and st.get("line", 0) > 6: break
send("input ticks=40"); shot("orwide")
send("load scene=surgery/case/2/0")
send("input ticks=100"); shot("chart_start")
send("load scene=surgery/case/2/3"); send("input ticks=20"); shot("code")
send("load scene=surgery/case/5/1"); send("play bot=true ticks=60"); shot("femur")
pav.stdin.close()
