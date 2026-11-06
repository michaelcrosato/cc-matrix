#!/usr/bin/env python3
"""Writes rules.toml from the defaults in rules.rs, so the two can't drift."""
import pathlib, re
F = pathlib.Path(__file__).resolve().parent.parent / "engine/crates/pav_core/src/games/fit"
src = (F / "rules.rs").read_text()
names = {"CoreRules": "core", "InputRules": "input", "FlowRules": "flow", "CheckRules": "check", "BreathRules": "breath", "PoseRules": "pose",
         "SquatRules": "squats", "PlankRules": "plank", "StepRules": "step", "SpinRules": "spin", "LapRules": "lap", "TideRules": "tide",
         "PaddleRules": "paddle", "TrayRules": "tray", "DiveRules": "dive", "StandRules": "stand"}
out = ["# Every balance number. Running from engine/, this file is read at each load, so a change here needs no rebuild.\n# The dev mode's Tuning tab changes these live; Reset to Defaults goes back to this file.\n"]
for m in re.finditer(r"group!\((\w+) \{(.*?)\}\);", src, re.S):
    out.append(f"\n[{names[m.group(1)]}]\n")
    for line in m.group(2).strip().splitlines():
        lm = re.match(r'\s*(\w+): ([-\d.]+), [-\d.]+, [-\d.]+, "(.*)";', line)
        out.append(f"{lm.group(1)} = {lm.group(2)}   # {lm.group(3)}\n")
(F / "rules.toml").write_text("".join(out))
