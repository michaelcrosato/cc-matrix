#!/usr/bin/env python3
"""Runs the real native window under xvfb, sends it real X11 keys, and grabs what's on screen.
Run under: xvfb-run -a -s "-screen 0 1920x1080x24" uv run --with python-xlib python tools/native_check.py"""
import os, subprocess, sys, time
from Xlib import X, XK, display
from Xlib.ext import xtest
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
log = open(f"{out}/native.log", "w")
p = subprocess.Popen(["./target/debug/shardfall", "--scene", "surgery/title", "--no-vsync"], stdout=log, stderr=log)
d = display.Display()
def key(name, hold=0.25):
    code = d.keysym_to_keycode(XK.string_to_keysym(name))
    xtest.fake_input(d, X.KeyPress, code); d.sync(); time.sleep(hold)
    xtest.fake_input(d, X.KeyRelease, code); d.sync(); time.sleep(1.5)
def focus():
    # There's no window manager under xvfb: give the game's window the keyboard ourselves.
    kids = [k for k in d.screen().root.query_tree().children if k.get_attributes().map_state == X.IsViewable]
    if kids:
        d.set_input_focus(kids[-1], X.RevertToParent, X.CurrentTime)
        d.sync()
def shot(n):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "x11grab", "-video_size", f"{W}x{H}", "-i", os.environ["DISPLAY"], "-frames:v", "1", f"{out}/native_{n}.png"], check=False)
r = d.screen().root
W, H = r.get_geometry().width, r.get_geometry().height
time.sleep(6)
assert p.poll() is None, "the window exited"
focus()
shot("title")
key("Return"); time.sleep(1); shot("menu")
key("Down"); key("Return"); shot("difficulty")      # New Game (focus starts on it, or next)
key("Return"); time.sleep(3); shot("story")           # a difficulty: the first scene
key("Return"); key("Return"); time.sleep(1); shot("story2")
ok = p.poll() is None
p.terminate(); p.wait(10)
# Into an operation: the mouse aims and operates, digits pick, Esc pauses.
p = subprocess.Popen(["./target/debug/shardfall", "--scene", "surgery/case/1", "--no-vsync"], stdout=log, stderr=log)
time.sleep(6)
focus()
def mouse(x, y):
    xtest.fake_input(d, X.MotionNotify, x=x, y=y); d.sync(); time.sleep(0.4)
mouse(W // 2 - 200, H // 2)
key("1")
xtest.fake_input(d, X.ButtonPress, 1); d.sync()
for k in range(12):
    mouse(W // 2 - 200 + k * 30, H // 2 + (k % 2))
shot("op")
xtest.fake_input(d, X.ButtonRelease, 1); d.sync()
key("Escape"); time.sleep(1); shot("pause")
key("Escape"); time.sleep(1); shot("resume")
alive = ok and p.poll() is None
p.terminate()
try:
    p.wait(10)
except subprocess.TimeoutExpired:
    p.kill()
log.close()
sizes = {n: os.path.getsize(f"{out}/native_{n}.png") for n in ("title", "menu", "story2", "op", "pause", "resume")}
print("PASS native window: real keys and mouse through menus, an operation and pause" if alive and min(sizes.values()) > 30000 else f"FAIL native window: alive={alive} {sizes}")
