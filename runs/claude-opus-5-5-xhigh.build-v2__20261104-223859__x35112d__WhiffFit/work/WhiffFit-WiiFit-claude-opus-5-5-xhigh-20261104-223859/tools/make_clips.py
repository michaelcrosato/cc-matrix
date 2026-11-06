#!/usr/bin/env python3
"""Writes engine/anim/fit.json: the game's hand-keyed clips, as readable key poses.
Field meanings are in LEGEND at the top of engine/crates/pav_core/src/clips.rs."""
import json, pathlib, copy
ROOT = pathlib.Path(__file__).resolve().parent.parent / "engine/anim"
STAND = {"hips": [0, 0, 100], "body": [0, 0, 0], "chest": [0, 0, 0], "head": [0, 0, 0],
         "armL": [10, 10, -95, 10, 0], "armR": [10, 10, -95, 10, 0],
         "legL": [0, 6, -100, 0, 0], "legR": [0, 6, -100, 0, 0]}
def k(t, **o):
    d = copy.deepcopy(STAND); d.update(o); d["t"] = t
    return d
def clip(name, dur, loop, tags, desc, keys):
    return name, {"clip": name, "dur": dur, "loop": loop, "tags": tags, "desc": desc, "keys": keys}
def hold(name, desc, **pose):
    return clip(name, 2.0, True, ["pose"], desc, [k(0, **pose), k(1.0, **{**pose, "hips": [pose.get("hips", [0, 0, 100])[0], pose.get("hips", [0, 0, 100])[1], pose.get("hips", [0, 0, 100])[2] - 1]}), k(2.0, **pose)])

m2m = json.load(open(ROOT / "mesh2motion.json"))["clips"]
plank = copy.deepcopy(m2m["Pushup"]["keys"][0])
style = json.load(open(ROOT / "style100.json"))["clips"]
carry_arms = {"armL": [95, 12, 5, 72, 0], "armR": [95, 12, 5, 72, 0]}
tray_keys = []
for key in style["Balance_Walk"]["keys"]:
    kk = copy.deepcopy(key)
    kk.update(carry_arms)
    kk["chest"] = [0, -3, 0]
    kk["head"] = [0, 5, 0]
    kk["shL"] = [0, 0]
    kk["shR"] = [0, 0]
    tray_keys.append(kk)
flop_low = copy.deepcopy(plank); flop_low["hips"] = [-7, 0, 14]; flop_low["body"] = [0, 84, 0]; flop_low["armL"] = [40, 80, -10, 20, 0]; flop_low["armR"] = [40, 80, -10, 20, 0]; flop_low["head"] = [0, -6, 8]

clips = dict([
    clip("Breath", 1.0, False, ["exercise"], "Exhaled to inhaled; scrub clip time with the lungs.", [
        k(0, chest=[0, 8, 0], head=[0, 8, 0], armL=[20, 18, -85, 20, 0], armR=[20, 18, -85, 20, 0]),
        k(1.0, hips=[0, 0, 102], chest=[0, -8, 0], head=[0, -8, 0], armL=[0, 80, 62, 10, 0], armR=[0, 80, 62, 10, 0])]),
    clip("Squat", 1.0, False, ["exercise"], "Stand to deep squat; scrub clip time with depth.", [
        k(0, armL=[10, 10, -95, 10, 0], armR=[10, 10, -95, 10, 0]),
        k(1.0, hips=[-22, 0, 58], body=[0, 28, 0], chest=[0, 5, 0], head=[0, -22, 0], armL=[100, 4, 10, 0, 0], armR=[100, 4, 10, 0, 0],
          legL=[55, 10, -60, 95, 0], legR=[55, 10, -60, 95, 0], footL=[-12, 0, 0], footR=[-12, 0, 0])]),
    hold("Tree", "The Patient Heron: one foot on the other knee, palms up overhead.",
         hips=[0, 3, 98], body=[0, 0, -2], armL=[6, -6, 100, 25, 0], armR=[6, -6, 100, 25, 0],
         legL=[6, 30, -55, 115, 62], legR=[0, 1, -100, 0, 0], footL=[35, 0, 0]),
    hold("Warrior", "The Apologetic Lunge: deep lunge, arms out.",
         hips=[0, 0, 72], body=[35, 0, 0], chest=[-35, -4, 0], head=[-30, 8, 0], armL=[0, 100, 0, 0, 0], armR=[0, 100, 0, 0, 0],
         legL=[70, 0, -55, 95, 0], legR=[-85, 20, -60, 0, 0], footR=[10, 40, 0]),
    hold("Lighthouse", "The Tired Lighthouse: one arm up like a beam, head sagging.",
         hips=[0, -3, 100], body=[0, 0, -6], chest=[0, 0, -8], head=[0, 22, 10], armR=[0, 18, 100, 5, 0], armL=[0, 8, -100, 18, 0],
         legL=[0, 8, -100, 2, 0], legR=[0, 4, -100, 0, 0]),
    hold("DeckChair", "The Folded Deck Chair: folded in half, hands near the feet.",
         hips=[-18, 0, 76], body=[0, 88, 0], chest=[0, 14, 0], head=[0, 8, 0], armL=[56, 8, -90, 0, 0], armR=[56, 8, -90, 0, 0],
         legL=[6, 6, -100, 28, 0], legR=[6, 6, -100, 28, 0]),
    hold("Bridge", "The Reluctant Bridge: an arched back, arms flung back without enthusiasm.",
         hips=[14, 0, 92], body=[0, -28, 0], chest=[0, -24, 0], head=[0, -18, 0], armL=[-34, 12, 100, 8, 0], armR=[-34, 12, 100, 8, 0],
         legL=[8, 8, -100, 22, 0], legR=[8, 8, -100, 22, 0]),
    hold("Seated", "Seated Disappointment: cross-legged on the floor, looking at the floor.",
         hips=[0, 0, 26], body=[0, 16, 0], chest=[0, 18, 0], head=[0, 30, 0], armL=[42, 16, -70, 44, 0], armR=[42, 16, -70, 44, 0],
         legL=[76, 44, -6, 128, 0], legR=[76, 44, -6, 128, 0], footL=[0, 30, 0], footR=[0, 30, 0]),
    clip("Plank", 1.0, True, ["exercise"], "A held plank (from one frame of MESH2MOTION/Pushup).", [dict(plank, t=0), dict(plank, t=1.0)]),
    clip("Flop", 1.0, False, ["exercise"], "From a plank to flat on the floor; scrub clip time.", [dict(plank, t=0), dict(flop_low, t=1.0)]),
    clip("ArmFlail", 0.7, True, ["upper"], "Arms windmilling for balance (upper body).", [
        k(0, armL=[10, 90, 40, 12, 0], armR=[10, 90, -30, 12, 0], chest=[0, 0, 4]),
        k(0.35, armL=[10, 90, -30, 12, 0], armR=[10, 90, 40, 12, 0], chest=[0, 0, -4]),
        k(0.7, armL=[10, 90, 40, 12, 0], armR=[10, 90, -30, 12, 0], chest=[0, 0, 4])]),
    clip("Stumble", 0.95, False, ["fall"], "A stumble and a recovery.", [
        k(0),
        k(0.22, hips=[10, 0, 90], body=[0, 26, 0], chest=[0, 10, 0], armL=[60, 50, 20, 20, 0], armR=[60, 50, 20, 20, 0], legL=[26, 6, -90, 30, 0], legR=[-16, 6, -96, 10, 0]),
        k(0.55, hips=[16, 0, 78], body=[0, 42, 0], chest=[0, 8, 0], head=[0, -12, 0], armL=[40, 90, 10, 10, 0], armR=[40, 90, -20, 10, 0], legL=[50, 8, -70, 70, 0], legR=[-26, 6, -92, 14, 0]),
        k(0.95)]),
    clip("StepL", 0.42, False, ["step"], "A left step up and down.", [
        k(0), k(0.14, hips=[0, 2, 104], legL=[34, 6, -84, 54, 0], armR=[30, 12, -80, 24, 0]), k(0.42)]),
    clip("StepR", 0.42, False, ["step"], "A right step up and down.", [
        k(0), k(0.14, hips=[0, -2, 104], legR=[34, 6, -84, 54, 0], armL=[30, 12, -80, 24, 0]), k(0.42)]),
    clip("HipCircle", 1.0, True, ["dance"], "Hips going round; scrub clip time with the spin.", [
        k(0, hips=[0, 9, 98], body=[0, 0, 7], chest=[0, 0, -7], armL=[0, 80, 30, 20, 0], armR=[0, 80, 30, 20, 0]),
        k(0.25, hips=[9, 0, 98], body=[0, -6, 0], chest=[0, 6, 0], armL=[0, 80, 30, 20, 0], armR=[0, 80, 30, 20, 0]),
        k(0.5, hips=[0, -9, 98], body=[0, 0, -7], chest=[0, 0, 7], armL=[0, 80, 30, 20, 0], armR=[0, 80, 30, 20, 0]),
        k(0.75, hips=[-9, 0, 98], body=[0, 6, 0], chest=[0, -6, 0], armL=[0, 80, 30, 20, 0], armR=[0, 80, 30, 20, 0]),
        k(1.0, hips=[0, 9, 98], body=[0, 0, 7], chest=[0, 0, -7], armL=[0, 80, 30, 20, 0], armR=[0, 80, 30, 20, 0])]),
    clip("CarryTray", 1.0, True, ["upper"], "Both hands out under a tray (upper body).", [k(0, **carry_arms), k(1.0, **carry_arms)]),
    clip("TrayWalk", style["Balance_Walk"]["dur"], True, ["walk"], "STYLE100/Balance_Walk's legs with CarryTray's arms.", tray_keys),
    clip("Paddle", 2.0, True, ["water"], "Standing on a board, knees soft, arms out low.", [
        k(0, hips=[0, 0, 94], armL=[30, 40, -50, 30, 0], armR=[30, 40, -50, 30, 0], legL=[4, 14, -96, 18, 0], legR=[4, 14, -96, 18, 0]),
        k(1.0, hips=[0, 2, 95], body=[0, 0, 2], armL=[30, 44, -44, 30, 0], armR=[30, 36, -54, 30, 0], legL=[4, 14, -96, 18, 0], legR=[4, 14, -96, 18, 0]),
        k(2.0, hips=[0, 0, 94], armL=[30, 40, -50, 30, 0], armR=[30, 40, -50, 30, 0], legL=[4, 14, -96, 18, 0], legR=[4, 14, -96, 18, 0])]),
    clip("Tuck", 1.0, False, ["dive"], "Open to tucked; scrub clip time with the tuck.", [
        k(0, armL=[0, 40, 60, 10, 0], armR=[0, 40, 60, 10, 0]),
        k(1.0, hips=[0, 0, 62], body=[0, 44, 0], chest=[0, 22, 0], head=[0, 28, 0], armL=[80, 2, -24, 102, 0], armR=[80, 2, -24, 102, 0],
          legL=[86, 8, 8, 132, 0], legR=[86, 8, 8, 132, 0], footL=[35, 0, 0], footR=[35, 0, 0])]),
    clip("DiveEntry", 1.0, True, ["dive"], "Arms overhead, straight as a pencil.", [
        k(0, armL=[0, 0, 100, 0, 0], armR=[0, 0, 100, 0, 0], legL=[0, 2, -100, 0, 0], legR=[0, 2, -100, 0, 0]),
        k(1.0, armL=[0, 0, 100, 0, 0], armR=[0, 0, 100, 0, 0], legL=[0, 2, -100, 0, 0], legR=[0, 2, -100, 0, 0])]),
    clip("Tread", 1.2, True, ["water"], "Treading water, arms sculling.", [
        k(0, armL=[30, 70, -6, 30, 0], armR=[30, 70, -6, 30, 0], legL=[20, 10, -90, 30, 0], legR=[-10, 10, -96, 20, 0]),
        k(0.6, armL=[-10, 80, 2, 20, 0], armR=[-10, 80, 2, 20, 0], legL=[-10, 10, -96, 20, 0], legR=[20, 10, -90, 30, 0]),
        k(1.2, armL=[30, 70, -6, 30, 0], armR=[30, 70, -6, 30, 0], legL=[20, 10, -90, 30, 0], legR=[-10, 10, -96, 20, 0])]),
    clip("Wake", 1.8, False, ["gesture"], "Waking: head up, a big stretch, a sigh.", [
        k(0, chest=[0, 14, 0], head=[0, 26, 0]),
        k(0.7, hips=[0, 0, 102], chest=[0, -10, 0], head=[0, -14, 0], armL=[6, 30, 90, 16, 0], armR=[6, 30, 90, 16, 0]),
        k(1.2, hips=[0, 0, 102], chest=[0, -12, 0], head=[0, -10, 0], armL=[6, 34, 92, 10, 0], armR=[6, 34, 92, 10, 0]),
        k(1.8)]),
    hold("Sleep", "Sitting, asleep, head on chest.", hips=[0, 0, 26], body=[0, 20, 0], chest=[0, 22, 0], head=[0, 40, 0],
         armL=[40, 12, -70, 30, 0], armR=[40, 12, -70, 30, 0], legL=[76, 34, -6, 120, 0], legR=[76, 34, -6, 120, 0]),
    clip("Sigh", 1.6, False, ["gesture"], "The shoulders rise and fall.", [
        k(0), k(0.6, chest=[0, -6, 0], head=[0, -6, 0], shL=[0, 14], shR=[0, 14]), k(1.6, chest=[0, 6, 0], head=[0, 12, 0])]),
    clip("Bow", 1.2, False, ["gesture"], "A polite bow.", [
        k(0), k(0.5, body=[0, 45, 0], chest=[0, 10, 0], head=[0, 10, 0]), k(1.2)]),
])
doc = {"set": "FIT", "title": "Tippy Cay moves", "format": 1, "credit": "Hand-keyed for this game (CC0); TrayWalk's legs from 100STYLE's Balance_Walk.",
       "legend": [], "fps": 30, "sources": {}, "clips": clips}
(ROOT / "fit.json").write_text(json.dumps(doc, indent=0) + "\n")
print(len(clips), "clips")
