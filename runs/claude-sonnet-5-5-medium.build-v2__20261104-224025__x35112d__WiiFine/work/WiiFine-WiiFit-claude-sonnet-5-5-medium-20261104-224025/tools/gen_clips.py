#!/usr/bin/env python3
"""Writes engine/anim/fit.json (Tippy Cay's hand-keyed clips) from readable key poses."""
import json, os
OUT = os.path.join(os.path.dirname(__file__), "..", "engine", "anim", "fit.json")

REST = dict(hips=[0,0,100], body=[0,0,0], chest=[0,0,0], head=[0,0,0],
            armL=[10,10,-95,10,0], armR=[10,10,-95,10,0], legL=[0,6,-100,0,0], legR=[0,6,-100,0,0])

def pose(t, **kw):
    k = {"t": t}
    for name, v in REST.items():
        k[name] = kw.pop(name, v)
    k.update(kw)
    return k

def clip(name, dur, keys, loop=False, tags=None, desc=""):
    return {"clip": name, "dur": dur, "loop": loop, "tags": tags or ["fit"], "desc": desc, "keys": keys}

C = {}
C["Breath"] = clip("Breath", 1.0, [
    pose(0, chest=[0,-1,0], head=[0,0,0]),
    pose(1, chest=[0,-7,0], head=[0,-10,0], armL=[0,70,60,6,0], armR=[0,70,60,6,0])], desc="Exhaled to inhaled; scrub with lungs.")
C["Squat"] = clip("Squat", 1.0, [
    pose(0, armL=[10,10,-95,10,0], armR=[10,10,-95,10,0]),
    pose(1, hips=[-22,0,58], body=[0,28,0], chest=[0,5,0], head=[0,-22,0], armL=[100,4,10,0,0], armR=[100,4,10,0,0],
         legL=[55,10,-60,95,0], legR=[55,10,-60,95,0], footL=[-12,0,0], footR=[-12,0,0])], tags=["exercise"], desc="Stand to deep squat; scrub with depth.")
C["Tree"] = clip("Tree", 2.0, [
    pose(0, legL=[60,45,-35,125,0], armL=[0,12,98,8,0], armR=[0,12,98,8,0], head=[0,-6,0], footL=[0,40,0]),
    pose(2, legL=[60,45,-35,125,0], armL=[0,12,98,8,0], armR=[0,12,98,8,0], head=[0,-6,0], footL=[0,40,0])], True, ["pose"], "The Patient Heron: one-legged, arms overhead.")
C["Warrior"] = clip("Warrior", 2.0, [
    pose(0, hips=[0,0,72], body=[35,0,0], chest=[-35,-4,0], head=[-30,0,0], armL=[0,100,0,0,0], armR=[0,100,0,0,0],
         legL=[70,0,-55,95,0], legR=[-85,20,-60,0,0], footR=[10,40,0]),
    pose(2, hips=[0,0,72], body=[35,0,0], chest=[-35,-4,0], head=[-30,0,0], armL=[0,100,0,0,0], armR=[0,100,0,0,0],
         legL=[70,0,-55,95,0], legR=[-85,20,-60,0,0], footR=[10,40,0])], True, ["pose"], "The Apologetic Lunge.")
C["Lighthouse"] = clip("Lighthouse", 2.0, [
    pose(0, body=[0,0,4], armL=[0,25,100,0,0], armR=[0,100,5,0,0], head=[25,0,8], legL=[0,10,-100,0,0], legR=[0,10,-100,0,0]),
    pose(1, body=[0,0,-4], armL=[0,25,100,0,0], armR=[0,100,5,0,0], head=[-25,0,8], legL=[0,10,-100,0,0], legR=[0,10,-100,0,0]),
    pose(2, body=[0,0,4], armL=[0,25,100,0,0], armR=[0,100,5,0,0], head=[25,0,8], legL=[0,10,-100,0,0], legR=[0,10,-100,0,0])], True, ["pose"], "The Tired Lighthouse.")
C["DeckChair"] = clip("DeckChair", 2.0, [
    pose(0, hips=[-38,0,56], body=[0,-12,0], chest=[0,-8,0], head=[0,10,0], armL=[55,18,-55,45,0], armR=[55,18,-55,45,0],
         legL=[88,8,-28,8,0], legR=[88,8,-28,8,0], footL=[-20,0,0], footR=[-20,0,0]),
    pose(2, hips=[-38,0,56], body=[0,-12,0], chest=[0,-8,0], head=[0,10,0], armL=[55,18,-55,45,0], armR=[55,18,-55,45,0],
         legL=[88,8,-28,8,0], legR=[88,8,-28,8,0], footL=[-20,0,0], footR=[-20,0,0])], True, ["pose"], "The Folded Deck Chair.")
C["Bridge"] = clip("Bridge", 2.0, [
    pose(0, hips=[22,0,88], body=[0,-24,0], chest=[0,-14,0], head=[0,-18,0], armL=[-25,12,92,4,0], armR=[-25,12,92,4,0],
         legL=[-12,14,-98,8,0], legR=[-12,14,-98,8,0]),
    pose(2, hips=[22,0,88], body=[0,-24,0], chest=[0,-14,0], head=[0,-18,0], armL=[-25,12,92,4,0], armR=[-25,12,92,4,0],
         legL=[-12,14,-98,8,0], legR=[-12,14,-98,8,0])], True, ["pose"], "The Reluctant Bridge.")
C["Seated"] = clip("Seated", 2.0, [
    pose(0, hips=[0,0,34], body=[0,10,0], chest=[0,12,0], head=[0,30,0], armL=[40,25,-60,50,0], armR=[40,25,-60,50,0],
         legL=[62,50,-25,135,0], legR=[62,50,-25,135,0], footL=[0,40,0], footR=[0,40,0]),
    pose(2, hips=[0,0,34], body=[0,10,0], chest=[0,12,0], head=[0,32,0], armL=[40,25,-60,50,0], armR=[40,25,-60,50,0],
         legL=[62,50,-25,135,0], legR=[62,50,-25,135,0], footL=[0,40,0], footR=[0,40,0])], True, ["pose"], "Seated Disappointment.")
C["ArmFlail"] = clip("ArmFlail", 0.6, [
    pose(0, armL=[0,100,80,0,0], armR=[0,40,-20,30,0]),
    pose(0.3, armL=[0,40,-20,30,0], armR=[0,100,80,0,0]),
    pose(0.6, armL=[0,100,80,0,0], armR=[0,40,-20,30,0])], True, ["upper"], "Upper-body flail near the edge.")
C["Stumble"] = clip("Stumble", 1.0, [
    pose(0), 
    pose(0.25, hips=[8,0,92], body=[0,18,0], chest=[0,8,0], armL=[0,90,60,0,0], armR=[0,90,60,0,0], legL=[40,8,-90,20,0]),
    pose(0.6, hips=[-6,0,95], body=[0,-8,0], armL=[0,80,40,0,0], armR=[0,80,40,0,0], legR=[30,8,-95,15,0]),
    pose(1.0)], False, ["fit"], "A wobble that nearly isn't a fall.")
C["StepL"] = clip("StepL", 0.5, [
    pose(0), pose(0.25, legL=[50,6,-60,85,0], armR=[40,10,-70,20,0], armL=[-20,10,-80,20,0]), pose(0.5)], False, ["step"], "Left knee up.")
C["StepR"] = clip("StepR", 0.5, [
    pose(0), pose(0.25, legR=[50,6,-60,85,0], armL=[40,10,-70,20,0], armR=[-20,10,-80,20,0]), pose(0.5)], False, ["step"], "Right knee up.")
C["HipCircle"] = clip("HipCircle", 1.0, [
    pose(0, hips=[8,0,100], armL=[0,70,10,0,0], armR=[0,70,10,0,0]),
    pose(0.25, hips=[0,8,100], armL=[0,70,10,0,0], armR=[0,70,10,0,0]),
    pose(0.5, hips=[-8,0,100], armL=[0,70,10,0,0], armR=[0,70,10,0,0]),
    pose(0.75, hips=[0,-8,100], armL=[0,70,10,0,0], armR=[0,70,10,0,0]),
    pose(1.0, hips=[8,0,100], armL=[0,70,10,0,0], armR=[0,70,10,0,0])], True, ["floatie"], "Hips in circles.")
C["CarryTray"] = clip("CarryTray", 1.0, [
    pose(0, armL=[75,15,-12,70,0], armR=[75,15,-12,70,0], chest=[0,-3,0]),
    pose(1, armL=[75,15,-12,70,0], armR=[75,15,-12,70,0], chest=[0,-3,0])], True, ["upper"], "Both hands out front, carrying.")
C["Tuck"] = clip("Tuck", 0.4, [
    pose(0), pose(0.4, hips=[0,0,60], body=[0,35,0], chest=[0,25,0], head=[0,20,0], armL=[60,-8,-35,95,0], armR=[60,-8,-35,95,0],
                   legL=[82,6,-28,125,0], legR=[82,6,-28,125,0])], False, ["dive"], "Cannonball tuck.")
C["DiveEntry"] = clip("DiveEntry", 0.8, [
    pose(0, armL=[0,4,100,0,0], armR=[0,4,100,0,0], body=[0,6,0]),
    pose(0.8, armL=[0,4,100,0,0], armR=[0,4,100,0,0], body=[0,6,0])], True, ["dive"], "Arms overhead.")
C["Plank"] = clip("Plank", 1.0, [
    {"t": 0, "hips": [-7,0,49], "body": [0,75,0], "chest": [0,-12,0], "head": [0,17,0], "shL": [0,0], "shR": [0,0],
     "armL": [95,28,-17,61,23], "armR": [95,28,-17,61,-23], "legL": [-4,0,-100,4,-3], "legR": [-4,0,-100,4,3], "footL": [-3,0,48], "footR": [-3,0,48]},
    {"t": 1, "hips": [-7,0,48], "body": [0,76,0], "chest": [0,-12,0], "head": [0,17,0], "shL": [0,0], "shR": [0,0],
     "armL": [95,28,-17,61,23], "armR": [95,28,-17,61,-23], "legL": [-4,0,-100,4,-3], "legR": [-4,0,-100,4,3], "footL": [-3,0,48], "footR": [-3,0,48]}], True, ["exercise"], "A plank, from the Pushup key.")
C["Flop"] = clip("Flop", 0.8, [
    pose(0, hips=[-7,0,49], body=[0,75,0], chest=[0,-12,0], head=[0,17,0], armL=[95,28,-17,61,23], armR=[95,28,-17,61,-23], legL=[-4,0,-100,4,-3], legR=[-4,0,-100,4,3]),
    pose(0.8, hips=[-8,0,20], body=[0,86,0], chest=[0,-4,0], head=[0,10,20], armL=[60,70,-30,10,0], armR=[60,70,-30,10,0], legL=[-6,10,-100,0,0], legR=[-6,10,-100,0,0])], False, ["exercise"], "Comic collapse.")
C["Bow"] = clip("Bow", 1.6, [
    pose(0), pose(0.7, body=[0,55,0], chest=[0,15,0], head=[0,10,0], armL=[30,10,-80,15,0], armR=[30,10,-80,15,0]),
    pose(1.0, body=[0,55,0], chest=[0,15,0], head=[0,10,0], armL=[30,10,-80,15,0], armR=[30,10,-80,15,0]), pose(1.6)], False, ["fit"], "A polite bow.")
C["Sleep"] = clip("Sleep", 3.0, [
    pose(0, hips=[0,0,96], body=[0,8,0], chest=[0,10,0], head=[0,35,6]),
    pose(1.5, hips=[0,0,95], body=[0,9,0], chest=[0,12,0], head=[0,38,6]),
    pose(3, hips=[0,0,96], body=[0,8,0], chest=[0,10,0], head=[0,35,6])], True, ["fit"], "Standing asleep.")
C["Wake"] = clip("Wake", 1.6, [
    pose(0, head=[0,30,4]), pose(0.8, chest=[0,-8,0], head=[0,-12,0], armL=[0,60,95,5,0], armR=[0,60,95,5,0]), pose(1.6)], False, ["fit"], "A big stretch.")
C["Sigh"] = clip("Sigh", 1.4, [
    pose(0), pose(0.5, chest=[0,-5,0], head=[0,-6,0], armL=[0,40,-70,5,0], armR=[0,40,-70,5,0]),
    pose(1.0, chest=[0,6,0], head=[0,14,0]), pose(1.4)], False, ["fit"], "A deep sigh.")

doc = {"set": "FIT", "title": "Tippy Cay moves", "format": 1, "credit": "Hand-keyed for this game (CC0).", "legend": [], "fps": 30, "sources": {}, "clips": C}
json.dump(doc, open(OUT, "w"), indent=0)
print("clips:", len(C))
