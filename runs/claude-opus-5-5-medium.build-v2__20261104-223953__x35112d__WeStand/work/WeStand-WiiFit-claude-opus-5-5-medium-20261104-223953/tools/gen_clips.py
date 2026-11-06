#!/usr/bin/env python3
"""Writes engine/anim/fit.json: the hand-keyed moves. Field meanings: LEGEND in pav_core/src/clips.rs."""
import json, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "engine/anim/fit.json"
STAND = dict(hips=[0,0,100],body=[0,0,0],chest=[0,0,0],head=[0,0,0],armL=[0,10,-95,10,0],armR=[0,10,-95,10,0],legL=[0,6,-100,0,0],legR=[0,6,-100,0,0])
def k(t,**over):
    d=dict(STAND); d.update(over); d["t"]=t; return d
def hold(pose,dur=2.0):
    return [k(0,**pose),k(dur,**pose)]
C={}
def clip(name,dur,loop,keys,desc,tags=("exercise",)):
    C[name]=dict(clip=name,dur=dur,loop=loop,tags=list(tags),desc=desc,keys=keys)
clip("Breath",1.0,False,[k(0,chest=[0,4,0],head=[0,6,0]),k(1.0,hips=[0,0,101],chest=[0,-9,0],head=[0,-8,0],armL=[0,34,-60,14,0],armR=[0,34,-60,14,0])],"Exhaled to inhaled: scrub with the lungs.")
clip("Squat",1.0,False,[k(0),k(1.0,hips=[-22,0,58],body=[0,28,0],chest=[0,5,0],head=[0,-22,0],armL=[100,4,10,0,0],armR=[100,4,10,0,0],legL=[55,10,-60,95,0],legR=[55,10,-60,95,0],footL=[-12,0,0],footR=[-12,0,0])],"Stand to deep squat; scrub with depth.")
TREE=dict(hips=[0,0,99],armL=[4,18,100,30,0],armR=[4,18,100,30,0],legR=[12,48,-58,120,0],footR=[30,40,0],legL=[0,1,-100,0,0],chest=[0,-3,0])
clip("Tree",2.0,True,hold(TREE),"The Patient Heron: one foot up, arms overhead.",("pose",))
WAR=dict(hips=[0,0,72],body=[35,0,0],chest=[-35,-4,0],head=[-30,0,0],armL=[0,100,0,0,0],armR=[0,100,0,0,0],legL=[70,0,-55,95,0],legR=[-85,20,-60,0,0],footR=[10,40,0])
clip("Warrior",2.0,True,hold(WAR),"The Apologetic Lunge: deep lunge, arms out, head turned as if to say sorry.",("pose",))
LIGHT=dict(hips=[0,0,100],body=[0,0,14],chest=[0,0,12],head=[0,10,-8],armL=[0,10,-95,8,0],armR=[0,48,88,6,0])
clip("Lighthouse",2.0,True,hold(LIGHT),"The Tired Lighthouse: one arm up, leaning, head lolling.",("pose",))
DECK=dict(hips=[-30,0,62],body=[0,62,0],chest=[0,20,0],head=[0,-50,0],armL=[95,6,-35,0,0],armR=[95,6,-35,0,0],legL=[12,6,-90,10,0],legR=[12,6,-90,10,0])
clip("DeckChair",2.0,True,hold(DECK),"The Folded Deck Chair: bent double at the hips, arms hanging forward.",("pose",))
BR=dict(hips=[20,0,88],body=[0,-30,0],chest=[0,-20,0],head=[0,-18,0],armL=[-40,10,100,0,0],armR=[-40,10,100,0,0],legL=[-10,8,-96,8,0],legR=[-10,8,-96,8,0])
clip("Bridge",2.0,True,hold(BR),"The Reluctant Bridge: arched backward, arms overhead, unconvinced.",("pose",))
SEAT=dict(hips=[-12,0,44],body=[0,22,0],chest=[0,16,0],head=[0,28,0],armL=[60,6,-55,50,0],armR=[60,6,-55,50,0],legL=[80,12,-34,92,0],legR=[80,12,-34,92,0])
clip("Seated",2.0,True,hold(SEAT),"Seated Disappointment: sitting on nothing, shoulders down, head down.",("pose",))
clip("ArmFlail",0.7,True,[k(0,armL=[-20,70,50,20,0],armR=[30,80,-10,40,0]),k(0.23,armL=[30,80,-10,40,0],armR=[-20,70,50,20,0]),k(0.46,armL=[-30,90,20,10,0],armR=[10,70,40,30,0]),k(0.7,armL=[-20,70,50,20,0],armR=[30,80,-10,40,0])],"Windmilling arms for the edge of balance.",("reaction",))
clip("Stumble",0.9,False,[k(0),k(0.25,hips=[10,0,88],body=[0,24,10],armL=[40,70,30,10,0],armR=[-20,80,40,10,0],legL=[30,10,-90,20,0]),k(0.55,hips=[-6,0,92],body=[0,-10,-8],armL=[-10,80,60,10,0],armR=[30,70,10,10,0],legR=[25,10,-90,20,0]),k(0.9)],"A stumble and a recovery.",("reaction",))
clip("StepL",1.0,False,[k(0,legL=[30,8,-85,55,0],armR=[30,8,-70,70,0],armL=[-20,8,-85,20,0],hips=[0,0,102]),k(1.0)],"A step with the left foot: scrub from lifted to planted.",("exercise",))
clip("StepR",1.0,False,[k(0,legR=[30,8,-85,55,0],armL=[30,8,-70,70,0],armR=[-20,8,-85,20,0],hips=[0,0,102]),k(1.0)],"A step with the right foot: scrub from lifted to planted.",("exercise",))
def hip(t,f,r): return k(t,hips=[f,r,99],body=[0,f*.6,r*.6],armL=[0,60,30,70,0],armR=[0,60,30,70,0])
clip("HipCircle",0.8,True,[hip(0,8,0),hip(.2,0,8),hip(.4,-8,0),hip(.6,0,-8),hip(.8,8,0)],"Hips going round, arms up and out of the way.")
# The plan's "Balance_Walk plus an upper-body CarryTray", baked into one clip: the engine has one
# clip slot, and the walk is driven by position. The legs and hips are Balance_Walk's; the arms hold the tray.
BW = json.load(open(OUT.parent / "style100.json"))["clips"]["Balance_Walk"]
tray_keys = []
for key in BW["keys"]:
    k2 = {f: v for f, v in key.items() if f not in ("shL", "shR", "blade", "root")}
    k2["armL"] = [85, 8, -5, 70, 0]
    k2["armR"] = [85, 8, -5, 70, 0]
    k2["chest"] = [0, -4, 0]
    tray_keys.append(k2)
clip("CarryTray", BW["dur"], True, tray_keys, "Balance_Walk's legs, with a tray held out in both hands.", ("walk",))
def pad(t,s): return k(t,hips=[0,0,92],body=[s*0.6,8,0],chest=[s,4,0],armL=[80,20,10+s,50,0],armR=[60,20,-20-s,70,0],legL=[12,14,-92,20,0],legR=[-6,14,-92,20,0])
clip("Paddle",1.6,True,[pad(0,18),pad(.8,-18),pad(1.6,18)],"Knees bent on a board, paddling.",("exercise",))
clip("Tuck",1.0,False,[k(0,armL=[20,30,60,20,0],armR=[20,30,60,20,0]),k(1.0,hips=[0,0,70],body=[0,40,0],chest=[0,30,0],head=[0,20,0],armL=[85,4,-40,120,0],armR=[85,4,-40,120,0],legL=[80,4,-10,150,0],legR=[80,4,-10,150,0])],"Star to a cannonball: scrub with the tuck.",("dive",))
DE=dict(armL=[10,10,100,0,0],armR=[10,10,100,0,0],chest=[0,-6,0],head=[0,-8,0],legL=[0,2,-100,0,0],legR=[0,2,-100,0,0])
clip("DiveEntry",1.0,False,hold(DE,1.0),"Arms overhead, stretched long, in the air.",("dive",))
clip("Flop",1.2,False,[k(0),k(.5,hips=[10,0,60],body=[0,50,0],armL=[60,30,0,10,0],armR=[60,30,0,10,0]),k(1.2,hips=[20,0,14],body=[0,88,0],head=[0,-30,0],armL=[20,70,-10,10,0],armR=[20,70,-10,10,0],legL=[-10,12,-100,0,0],legR=[-10,12,-100,0,0])],"A comic flop, face down.",("reaction",))
clip("Bow",1.4,False,[k(0),k(.5,hips=[-4,0,98],body=[0,40,0],chest=[0,16,0],head=[0,20,0]),k(1.0,hips=[-4,0,98],body=[0,40,0],chest=[0,16,0],head=[0,20,0]),k(1.4)],"A polite bow.",("emote",))
clip("Sleep",2.0,True,hold(dict(hips=[0,0,30],body=[0,90,0],head=[0,0,20],armL=[0,20,-90,10,0],armR=[0,20,-90,10,0])),"Lying flat, asleep.",("emote",))
clip("Wake",1.6,False,[k(0,chest=[0,20,0],head=[0,30,0],armL=[60,10,-40,60,0],armR=[60,10,-40,60,0]),k(.9,chest=[0,-8,0],head=[0,-20,0],armL=[0,30,100,20,0],armR=[0,30,100,20,0]),k(1.6)],"Waking up with a stretch.",("emote",))
clip("Sigh",1.0,False,hold(dict(chest=[0,10,0],head=[0,12,0],armL=[0,8,-98,6,0],armR=[0,8,-98,6,0]),1.0),"Shoulders down, a sigh.",("emote",))
# The plank starts from Mesh2Motion's Pushup key (its plan's note: a hand-keyed one pointed its legs up).
PL=dict(hips=[-7,0,49],body=[0,75,0],chest=[0,-12,0],head=[0,17,0],shL=[0,0],shR=[0,0],armL=[95,28,-17,61,23],armR=[95,28,-17,61,-23],legL=[-4,0,-100,4,-3],legR=[-4,0,-100,4,3],footL=[-3,0,48],footR=[-3,0,48])
clip("Plank",1.0,False,hold(PL,1.0),"Held at the top of a push-up.",("exercise",))
doc=dict(set="FIT",title="Tippy Cay moves",format=1,credit="Hand-keyed for this game (CC0).",legend=[],fps=30,sources={},clips=C)
OUT.write_text(json.dumps(doc,indent=0))
print(len(C),"clips")
