#!/usr/bin/env python3
"""Writes the game's props (format-2 JSON) into engine/assets/props/lib/core/. Rerun after an edit,
then rebuild `pav`. Units are centimetres, origin on the floor under the centre, +z the front."""
import json, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "engine/assets/props/lib/core"
INK="#263e54"; DECK="#fbfaf6"; SAND="#f6e7c8"; TEAL="#46bec8"; MINT="#78dcaa"; CORAL="#ff786e"; SUN="#ffd166"; WOOD="#d8b184"; WOOD2="#b98e5e"; WHITE="#ffffff"; LEAF="#6fc78a"; LEAF2="#58b57a"
def box(size,pos,color,**k): return dict(type="box",size=size,pos=pos,color=color,**k)
def rbox(size,pos,color,r=3,**k): return dict(type="rounded_box",size=size,radius=r,pos=pos,color=color,**k)
def cyl(r,h,pos,color,**k): return dict(type="cylinder",radius=r,height=h,pos=pos,color=color,**k)
def sph(r,pos,color,**k): return dict(type="sphere",radius=r,pos=pos,color=color,**k)
def ell(size,pos,color,**k): return dict(type="ellipsoid",size=size,pos=pos,color=color,**k)
def tor(r,m,pos,color,**k): return dict(type="torus",radius=r,minor_radius=m,pos=pos,color=color,**k)
def cone(r,re,h,pos,color,**k): return dict(type="cone",radius=r,radius_end=re,height=h,pos=pos,color=color,**k)
def rod(size,a,b,color,kind="box",**k): return dict(type=kind,size=size,**{"from":a,"to":b},color=color,**k)
def cap(r,a,b,color,**k): return {"type":"cylinder","radius":r,"from":a,"to":b,"color":color,**k}
P={}
def prop(name,desc,parts,cat="furniture",tags=("resort",),**extra):
    P[name]=dict(format=2,name=name,unit="cm",description=desc,tags=list(tags),category=cat,parts=parts,**extra)
prop("fit_palm","A leaning palm: stacked trunk and six radial fronds.",{
 "t1":cap(20,[0,0,0],[14,190,0],"#b48c62"),"t2":cap(16,[14,190,0],[46,370,0],"#a97f58"),"t3":cap(12,[46,370,0],[92,520,0],"#b48c62"),
 "crown":sph(26,[96,530,0],"#8c6a48"),
 "frond":dict(type="ellipsoid",size=[60,16,190],pos=[96,536,0],color=LEAF,radial=dict(count=7,radius=120),pitch=18),
 "nut":sph(14,[108,510,18],"#7a5a3e",mirror="x")},cat="vegetation",tags=("palm","tree","beach"))
prop("fit_mat","An exercise mat, rolled flat, with a stitched border.",{
 "mat":rbox([120,4,200],[0,2,0],"$accent",r=1.8),"stripe":box([100,1,6],[0,4.2,84],WHITE,array=dict(count=2,step=[0,0,-168]))},tags=("mat","gym"))
prop("fit_stepbox","A white aerobic step box with teal risers.",{
 "top":rbox([130,12,60],[0,26,0],DECK,r=5),"grip":rbox([120,2,48],[0,33,0],TEAL,r=1),"foot":rbox([20,20,50],[45,10,0],INK,r=4,mirror="x")},tags=("gym","step"))
prop("fit_board","A springy diving board on a stand.",{
 "plank":rbox([70,8,420],[0,0,210],"#eef6f2",r=3),"tip":rbox([70,2,60],[0,5,380],CORAL,r=1)},tags=("dive",))
prop("fit_tower","A white diving tower with a ladder and flags.",{
 "post":cap(14,[-110,0,-110],[-110,600,-110],WHITE,mirror=["x","z"]),"deck":rbox([300,20,300],[0,600,0],DECK,r=8),
 "rail":cap(5,[-140,600,-140],[-140,700,-140],TEAL,mirror=["x"]),"rail2":cap(5,[-140,700,-140],[140,700,-140],TEAL),
 "rung":cap(4,[-30,50,-160],[30,50,-160],INK,array=dict(count=10,step=[0,58,0])),"rls":cap(5,[-32,0,-160],[-32,600,-160],INK,mirror="x"),
 "flag":box([70,40,3],[35,820,0],CORAL),"mast":cap(4,[0,620,0],[0,840,0],INK),
 "brace":cap(6,[-110,50,-110],[110,300,-110],TEAL,mirror="z")},tags=("dive","tower"))
prop("fit_paddleboard","A long coral paddleboard.",{
 "hull":ell([85,16,360],[0,4,0],CORAL),"deck":ell([60,6,240],[0,11,0],"#fff2e2"),"stripe":ell([12,5,300],[0,11,0],SUN)},tags=("water",))
prop("fit_buoy","A red and white channel buoy.",{
 "bottom":sph(46,[0,0,0],CORAL),"mid":cyl(26,50,[0,50,0],WHITE),"top":sph(26,[0,84,0],CORAL),"rod":cap(4,[0,100,0],[0,190,0],INK),"pennant":box([44,26,3],[22,180,0],SUN)},tags=("water",),cat="vegetation")
prop("fit_raft","A square floating tide raft of pale planks, with low rails.",{
 "deck":rbox([800,18,800],[0,-9,0],"#f2e6cf",r=5),"plank":box([800,1,4],[0,1,-360],"#dcc9a5",array=dict(count=10,step=[0,0,80])),
 "rail":rbox([830,22,18],[0,4,409],WOOD2,r=6,mirror="z"),"rails":rbox([18,22,830],[409,4,0],WOOD2,r=6,mirror="x")},tags=("water",))
prop("fit_pool","A shallow tide pool sunk in the raft.",{
 "lip":tor(62,10,[0,3,0],"#e7d3ad"),"water":cyl(58,3,[0,1,0],"#58c3d6",look="flat"),"glint":ell([30,1,10],[12,3,16],"#c8f4f7",look="flat")},tags=("water",))
prop("fit_shell","A hermit crab in a spiral shell.",{
 "shell":sph(13,[0,13,0],"#ffb37a"),"whorl":sph(7,[0,21,-4],"#ffd0a5"),"tip":sph(3.5,[0,27,-7],"#fff0da"),
 "claw":sph(4,[7,5,12],CORAL,mirror="x"),"eye":sph(2,[3.5,11,14],INK,mirror="x")},tags=("crab",),cat="vegetation")
prop("fit_bumper","A soft rubber bumper post.",{"post":cyl(50,40,[0,20,0],MINT),"top":cyl(34,6,[0,42,0],WHITE)},tags=("water",))
prop("fit_tray","A round serving tray.",{"tray":cyl(44,3,[0,0,0],"#f4f1ea"),"rim":tor(44,2,[0,2,0],TEAL)},tags=("tray",))
prop("fit_smoothie","A tall smoothie with a straw and a slice.",{
 "glass":cone(7,10,24,[0,12,0],"$accent"),"foam":sph(9,[0,25,0],"#fff7ec"),"straw":cap(1,[1,20,0],[6,40,2],CORAL),"slice":tor(6,1.5,[9,24,0],SUN)},tags=("drink",))
prop("fit_ring","An inflatable pool ring with candy stripes.",{"ring":tor(46,12,[0,0,0],"$accent"),"band":tor(46,12.4,[0,0,0],WHITE,arc=50,radial=dict(count=2,radius=0))},tags=("float",))
prop("fit_chair","A striped lounge chair.",{
 "seat":rbox([70,8,130],[0,32,-10],"$accent",r=3),"back":rbox([70,8,80],[0,56,-98],WHITE,r=3,pitch=-35),
 "leg":cap(3,[30,0,40],[30,30,40],WOOD2,mirror="x"),"legb":cap(3,[30,0,-70],[30,30,-70],WOOD2,mirror="x")},tags=("seat","beach"),sockets={"sit":{"pos":[0,36,-10]}})
prop("fit_umbrella","A beach umbrella.",{"pole":cap(4,[0,0,0],[8,240,0],WOOD),"canopy":cone(150,6,70,[8,240,0],"$accent"),"cap":sph(9,[8,276,0],WHITE)},tags=("beach",))
prop("fit_cabana","A little guest cabana on stilts, with a striped roof and a deck.",{
 "floor":rbox([420,20,420],[0,30,0],DECK,r=6),"wall":rbox([380,240,16],[0,160,-180],"$accent",r=4),
 "side":rbox([16,240,330],[190,160,-20],WHITE,r=4,mirror="x"),"door":rbox([110,190,8],[0,125,-170],"#eef6f2",r=4),
 "post":cap(8,[195,50,195],[195,300,195],WOOD,mirror="x"),"roof":dict(type="wedge",size=[500,110,500],peak=0,pos=[0,335,0],color=CORAL),
 "step":rbox([140,8,60],[0,14,235],WOOD,r=3),"bed":rbox([180,30,100],[60,62,-110],"#ffffff",r=8)},tags=("cabin",),cat="architecture")
prop("fit_desk","The reception desk: a white curved counter with a teal band and a small bell.",{
 "body":rbox([420,100,90],[0,50,0],DECK,r=12),"band":rbox([430,14,96],[0,66,0],TEAL,r=5),"top":rbox([440,10,110],[0,105,0],"#f6efe0",r=5),
 "bell":sph(10,[120,120,0],SUN),"papers":rbox([40,4,30],[-90,112,0],WHITE,r=1,array=dict(count=3,step=[34,1.4,2]))},tags=("desk",))
prop("fit_pavilion","An open round pavilion with six white columns and a coloured roof.",{
 "floor":cyl(420,16,[0,8,0],DECK),"col":dict(type="cylinder",radius=16,height=320,pos=[0,176,0],color=WHITE,radial=dict(count=6,radius=380)),
 "ring":tor(390,16,[0,336,0],WHITE),"roof":cone(450,50,160,[0,420,0],"$accent"),"cupola":sph(50,[0,510,0],SUN),"mast":cap(4,[0,540,0],[0,620,0],INK),"flag":box([60,34,3],[30,600,0],"$accent")},tags=("pavilion",),cat="architecture")
prop("fit_calendar","The calendar wall: five big paper days on a pale board, bordered in teal.",{
 "wall":rbox([520,300,20],[0,190,0],DECK,r=10),"frame":rbox([540,12,24],[0,346,0],TEAL,r=4),"foot":cap(10,[220,0,0],[220,40,0],WOOD2,mirror="x"),
 "day":rbox([84,120,4],[0,200,12],"#ffffff",r=1.5,array=dict(count=5,step=[98,0,0])),"bar":rbox([84,24,5],[0,266,13],CORAL,r=2,array=dict(count=5,step=[98,0,0]))},tags=("board",))
prop("fit_clam","A giant smiling clam on a pedestal, its shell open.",{
 "base":cyl(120,26,[0,13,0],"#f2e6cf"),"bottom":ell([260,70,230],[0,62,0],"#e8c8e8"),"top":ell([260,70,220],[0,150,-60],"#f0d6f0",pitch=-40),
 "rib":ell([20,74,210],[-80,152,-60],"#d9b5d9",array=dict(count=5,step=[40,0,0]),pitch=-40),"pearl":sph(40,[0,108,20],"#fffaf0"),
 "eye":sph(12,[60,186,-30],INK,mirror="x")},tags=("clam",))
prop("fit_flipflop","A single lost flip-flop.",{"sole":ell([22,3,54],[0,2,0],"$accent"),"strap":tor(8,1.6,[0,5,8],WHITE,axis="z")},tags=("shoe",))
prop("fit_gull","A gull's body: white, grey back, orange beak.",{
 "body":ell([24,24,52],[0,0,0],WHITE),"back":ell([20,10,40],[0,8,-4],"#c7d1da"),"head":sph(11,[0,10,26],WHITE),"beak":cone(4,1,14,[0,8,38],"#ffb04a",pitch=90),
 "eye":sph(2,[6,14,30],INK,mirror="x"),"tail":ell([14,4,24],[0,2,-32],"#c7d1da")},tags=("bird",),cat="vegetation")
prop("fit_wing","A gull's wing, root at the origin, spreading along +x.",{"wing":ell([64,4,26],[32,0,0],"#e8eef2"),"tip":ell([24,4,14],[58,0,0],INK)},tags=("bird",),cat="vegetation")
prop("fit_cap","A tiny captain's cap.",{"crown":cyl(13,8,[0,6,0],WHITE),"band":cyl(13.5,3,[0,3,0],INK),"peak":ell([16,2,14],[0,2,10],INK)},tags=("hat",))
prop("fit_card","A judge's score card on a stick.",{"card":rbox([56,40,3],[0,80,0],WHITE,r=1),"stick":cap(2,[0,0,0],[0,60,0],WOOD2)},tags=("card",))
prop("fit_lotus","A lotus: rings of pink petals on a green pad.",{
 "pad":cyl(44,2,[0,1,0],LEAF,look="flat"),"p1":dict(type="ellipsoid",size=[16,12,34],pos=[0,8,0],color="#ffc0d6",radial=dict(count=8,radius=18)),
 "p2":dict(type="ellipsoid",size=[12,14,24],pos=[0,14,0],color="#ffe0ea",radial=dict(count=6,radius=10)),"heart":sph(6,[0,18,0],SUN)},tags=("flower",),cat="vegetation")
prop("fit_smallraft","A small round audience raft.",{"hull":tor(90,22,[0,4,0],"$accent"),"floor":cyl(84,6,[0,4,0],"#f2e6cf")},tags=("water",))
prop("fit_towels","A neat stack of towels.",{"t":rbox([60,12,44],[0,6,0],"$accent",r=5,array=dict(count=3,step=[0,12,0]))},tags=("towel",))
prop("fit_towel","A towel laid out on the sand, with a stripe.",{"t":rbox([90,2,180],[0,1,0],"$accent",r=1),"s":box([92,1,24],[0,2.4,0],WHITE)},tags=("towel",))
prop("fit_crab","A sideways-walking beach crab.",{"body":ell([54,24,38],[0,16,0],CORAL),"eye":sph(5,[10,34,14],INK,mirror="x"),"claw":ell([20,16,24],[36,18,12],"#ff5c52",mirror="x"),"leg":cap(2.5,[20,10,-6],[40,0,-14],"#d95048",mirror="x",array=dict(count=3,step=[0,0,12]))},tags=("crab",),cat="vegetation")
prop("fit_ribbon","A floating fitness ribbon.",{"loop":tor(30,4,[0,70,0],SUN,axis="z"),"tail":box([10,50,2],[0,28,0],CORAL,mirror=None) ,"tail2":box([10,44,2],[12,30,0],MINT,roll=-14)},tags=("ribbon",))
prop("fit_post","A tiny post standing in the bay, just wide enough for one.",{"post":cyl(52,300,[0,-150,0],"#f2e6cf"),"top":cyl(58,8,[0,-4,0],WOOD),"ring":tor(58,5,[0,-10,0],CORAL)},tags=("post",))
prop("fit_guidepost","A signpost pointing to a pavilion.",{"pole":cap(5,[0,0,0],[0,190,0],WOOD2),"arm":rbox([110,28,5],[30,170,0],"$accent",r=2)},tags=("sign",))
prop("fit_pier","A section of pier planks on piles.",{"deck":rbox([360,14,400],[0,-7,0],"#e8d5ae",r=2),"plank":box([360,1,3],[0,0.6,-180],"#c9b184",array=dict(count=10,step=[0,0,40])),"pile":cap(12,[170,-300,190],[170,0,190],WOOD2,mirror=["x","z"])},tags=("pier",))
prop("fit_lamp","A tall string-light post.",{"pole":cap(5,[0,0,0],[0,320,0],WHITE),"lamp":sph(16,[0,330,0],"#fff2c4",emissive=1.2,light=dict(color="#ffd9a0",radius=9,intensity=1.2))},tags=("light",))
for name,doc in P.items():
    for part in doc["parts"].values():
        for k in [k for k,v in part.items() if v is None]: del part[k]
    (OUT/f"{name}.json").write_text(json.dumps(doc))
print(len(P),"props")
