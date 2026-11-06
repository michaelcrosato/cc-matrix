#!/usr/bin/env python3
"""Captures the screens the bot does not visit, by pressing through them in `pav repl`."""
import json, subprocess, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
out = ROOT / "notes/cap/menus"; out.mkdir(parents=True, exist_ok=True)
p = subprocess.Popen(["./target/debug/pav", "repl"], cwd=ROOT / "engine", stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
def cmd(c):
    p.stdin.write(c + "\n"); p.stdin.flush()
    return p.stdout.readline()
def press(b, n=1):
    for _ in range(n):
        cmd(f"input press={b} ticks=1"); cmd("input ticks=3")
def cap(name, settle=2):
    cmd(f"input ticks={settle}")
    print(name, cmd(f"capture width=1280 height=720 out={out}/{name}.png")[:40])
cmd("load scene=fit/free")
cmd("input ticks=240")
cap("free_island")
press("confirm", 40)
press("pause"); cap("pause")
press("menu_down", 4); press("confirm"); cap("settings")
press("back")
press("menu_down", 1); press("confirm"); cap("howto")
press("tab_r"); cap("howto2"); press("back")
press("menu_down", 1); press("confirm"); cap("about"); press("tab_r"); press("tab_r"); cap("about3"); press("back")
press("menu_down", 1); press("confirm"); cap("dev")
for t, n in (("tab_r", "dev_cheats"), ("tab_r", "dev_time"), ("tab_r", "dev_tuning"), ("tab_r", "dev_view"), ("tab_r", "dev_save")):
    press(t); cap(n)
press("back"); press("menu_up", 6); press("menu_down", 2); press("confirm"); cap("calendar"); press("back")
press("menu_down", 1); press("confirm"); cap("wardrobe", 90); press("back")
press("pause")
cmd("load scene=fit/credits"); cmd("input ticks=240"); cap("credits")
cmd("load scene=fit"); cmd("input ticks=700"); cap("attract", 60)
for _ in range(2):
    cmd("input ticks=60")
cap("attract2", 400)
p.terminate()
