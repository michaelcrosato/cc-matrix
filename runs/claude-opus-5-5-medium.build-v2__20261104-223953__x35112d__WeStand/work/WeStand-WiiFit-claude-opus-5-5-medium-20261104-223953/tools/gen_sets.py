#!/usr/bin/env python3
"""Writes the room files for Tippy Cay's sets into games/fit/sets/. The .toml files are the data the
game reads, and can be edited by hand; this script is how the big ASCII maps were first drawn."""
import math, pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "engine/crates/pav_core/src/games/fit/sets"
WATER = '{ kind = "water", y0 = -2.0, y1 = 0.0, color = "%s" }'
GUEST = 'gear = { helm = "hood", helm_color = "#f5f2ec" }'
LOOKS = {
 "pip": ('blob','{ skin = "#7cc8ee", shirt = "#7cc8ee", eyes = "#263e54", scale = 0.7, squash = 2.0, parts = [{ kind = "spikes", count = 1, size = 0.45, color = "#ffffff" }] }'),
 "posey": ('biped','{ skin = "#d8b184", shirt = "#d8b184", pants = "#c79f6e", shoes = "#c79f6e", eyes = "#d8b184", scale = 1.05, leg_length = 0.98 }'),
 "kettle": ('blob','{ skin = "#3a4048", shirt = "#3a4048", eyes = "#f4e9c9", scale = 1.0, squash = 0.6, parts = [{ kind = "handle", size = 1.0, color = "#2a2e35" }] }'),
 "bounce": ('blob','{ skin = "#ff9ec4", shirt = "#ff9ec4", eyes = "#263e54", scale = 1.2, squash = 2.2 }'),
 "marjorie": ('biped','{ skin = "#c98d6e", shirt = "#fdfcf8", pants = "#fdfcf8", shoes = "#e8e2d4", %s }' % GUEST),
 "tom": ('biped','{ skin = "#efc4a0", shirt = "#9fd6f0", pants = "#f5f2ec", shoes = "#efc4a0", gear = { belt = "#ffffff", gloves = "#ffffff" } }'),
 "twin": ('biped','{ skin = "#a86f50", shirt = "#ffd166", pants = "#46bec8", shoes = "#fbfaf6", scale = 0.9 }'),
 "guest": ('biped','{ skin = "%s", shirt = "#fdfcf8", pants = "#fdfcf8", shoes = "#e8e2d4", %s }'),
}
SKINS=["#f2cfb0","#d9a57f","#a86f50","#6f4a34","#efc4a0","#c98d6e"]
def npc(name,x,z,yaw=0,y=0,ai=None,hop=0,clips=None,tempo=None,skin=None):
    kind,look=LOOKS[name]
    if name=="guest": look=look % (skin or SKINS[int(x*3+z)%6],GUEST)
    s=f'\n[[npc]]\nname = "{name}"\nkind = "{kind}"\npos = [{x}, {y}, {z}]\nyaw = {yaw}\nlook = {look}\n'
    if ai: s+=f'ai = {ai}\nspeed = 0.3\n'
    if hop: s+=f'hop = {hop}\n'
    if clips: s+='clips = ['+', '.join(f'"{c}"' for c in clips)+']\nhold = 6\n'
    return s
def obj(asset,x,z,y=0,yaw=0,scale=1,body="none",roles=None,name=None,sway=None):
    s=f'\n[[object]]\nname = "{name or asset}"\nasset = "LIB/core/{asset}"\npos = [{x}, {y}, {z}]\nyaw = {yaw}\nscale = {scale}\nbody = "{body}"\n'
    if roles: s+='roles = { '+', '.join(f'"${k}" = "{v}"' for k,v in roles.items())+' }\n'
    if asset in ("fit_palm","fit_umbrella"): sway="leaves"
    if sway: s+=f'sway = "{sway}"\n'
    return s
def shape(kind,x,y,z,color,body="fixed",**k):
    a=', '.join(f'{n} = {v}' for n,v in k.items())
    return f'\n[[object]]\nname = "{kind}"\nshape = {{ type = "{kind}", {a} }}\npos = [{x}, {y}, {z}]\ncolor = "{color}"\nlook = "cel"\nbody = "{body}"\n'
def view(sky="#d6eef6",el=52,az=160,sun=0.62,amb=1.15,sea="#8fdde0",extra="",fog=(25,110),sat=.95,bloom=.15,cx=30,cz=30,sea_y=-0.2):
    return f'''
[view]
sky = "{sky}"
exposure = 1.0
saturation = {sat}
bloom = {bloom}
bloom_threshold = 1.3
outlines_on = "objects"
outline_px = 1.0
outline_darken = 0.55
rim = 0.3
fog = true
fog_start = {fog[0]}.0
fog_end = {fog[1]}.0
wind = 0.5
"light.sun_elevation" = {el}.0
"light.sun_azimuth" = {az}.0
"light.sun_intensity" = {sun}
"light.ambient" = {amb}
"cutaway.height_cut" = false
"cutaway.front_cut" = false
"cutaway.fade" = false
"filter.transition" = "iris"
{extra}
[[object]]
name = "far_sea"
shape = {{ type = "cylinder", half_height = 0.05, radius = 600.0 }}
pos = [{cx}.0, {sea_y}, {cz}.0]
color = "{sea}"
look = "flat"
body = "fixed"
'''
def legend(sea, extra="", top=0.0, ripples=True):
    z='{ kind = "water", y0 = -2.0, y1 = %s, color = "%s" }' % (top, sea)
    return f"""
[layout.legend.'~']
blocks = [{{ y0 = -2.5, y1 = {top-0.06}, color = "{sea}", look = "flat" }}]
{("zone = " + z) if ripples else ""}
{extra}
"""
def head(name,about,cols,rows,game=""):
    return f'''# {about}\nname = "{name}"\nabout = "{about}"\nentrance = {{ at = [{cols//2}, {rows//2}], facing = "south" }}\n\n[game]\n{game}\n'''
def spots(**k):
    return "spots = { "+", ".join(f"{n} = [{v[0]}, {v[1]}, {v[2]}]" for n,v in k.items())+" }\n"
def layout(rows):
    return "\n[layout]\norigin = [0.0, 0.0, 0.0]\n\n[[layout.layer]]\ny = 0\nmap = '''\n"+"\n".join(rows)+"\n'''\n"
def sea_set(name,about,cols,rows,sp,v,body,sea="#8fdde0"):
    m=["~"*cols]*rows
    return head(name,about,cols,rows,spots(**sp))+layout(m)+legend(sea)+v+body
def write(k,t): (OUT/f"{k}.toml").write_text(t)
PAV={"studio":(18,12,"#9fd6f0"),"gazebo":(62,12,"#ffd166"),"boardwalk":(62,48,"#ff9ec4"),"lagoon":(18,48,"#78dcaa")}
MATS=dict(breath=(15.5,12.0),pose=(20.5,12.0),squats=(59.5,12.0),plank=(64.5,12.0),step=(59.0,48.0),spin=(62.0,45.5),lap=(65.0,48.0),tide=(14.5,48.5),paddle=(18.0,45.5),tray=(21.5,48.5),cannon=(18.0,51.0),bigstand=(40.0,50.0))
FLOPS=[(15.6,30.0),(70.0,22.0),(41.5,19.5),(26.0,6.0),(46.0,54.0)]
def hub():
    cols,rows=80,70
    m=[]
    for z in range(rows):
        r=''
        for x in range(cols):
            dx,dz=abs(x+.5-40),abs(z+.5-30)
            ox,oz=max(dx-23,0),max(dz-15,0)
            d=math.hypot(ox,oz)  # distance outside the core rectangle: the island's rounded edge
            ring=abs(math.hypot((x+.5-40)/25,(z+.5-30)/18)-1)*21
            # Tiles are the ground to stand on and the grass; smooth objects draw the outlines over them.
            c='~'
            if d<=10.0: c='s'
            if d<=7.4: c='g' if (x*7+z*13)%3==0 else 'h'
            r+=c
        m.append(r)
    sp=dict(arrive=(40,0,28),wake=(40,0,11.5),pip=(40,0,25.6),clam=(48,0,23.5),calendar=(32,0,22.5),cabana=(40,0,10.5),marjorie=(33,0,33),tom=(47,0,34),twins=(36,0,38),posey=(18,0,9.0),kettle=(62,0,9.0),bounce=(62,0,51),gull=(18,0,44.5),wardrobe=(44,0,21.5))
    for k,v in MATS.items(): sp["mat_"+k]=(v[0],0,v[1])
    for i,f in enumerate(FLOPS): sp[f"flop{i}"]=(f[0],0,f[1])
    t=head("Tippy Cay","Tippy Cay: a small wellness resort staffed by talking gym equipment.",cols,rows,spots(**sp))+layout(m)
    t+=legend("#8fdde0",'''
[layout.legend.'g']
blocks = [{ y0 = -2.5, y1 = -0.08, color = "#bfe6b0", look = "flat" }]
grass = { density = 1, height = 0.4, color = "#a3d993" }

[layout.legend.'h']
blocks = [{ y0 = -2.5, y1 = -0.08, color = "#bfe6b0", look = "flat" }]

[layout.legend.'s']
blocks = [{ y0 = -2.5, y1 = -0.08, color = "#f6e7c8", look = "flat" }]

''')
    t+=view(cx=40,cz=30,sea_y=-0.13)
    # The island's smooth shore and lawn: a stadium of boxes and corner discs over the tiles.
    def stadium(hx,hz,rad,y,color,name):
        o=''
        for (a,b) in ((hx+rad,hz),(hx,hz+rad)):
            o+=f'\n[[object]]\nname = "{name}"\nshape = {{ type = "box", half = [{a}, 0.05, {b}] }}\npos = [40.0, {y}, 30.0]\ncolor = "{color}"\nlook = "flat"\nbody = "none"\n'
        for sx in (-1,1):
            for sz in (-1,1):
                o+=f'\n[[object]]\nname = "{name}"\nshape = {{ type = "cylinder", half_height = 0.05, radius = {rad} }}\npos = [{40+sx*hx}.0, {y}, {30+sz*hz}.0]\ncolor = "{color}"\nlook = "flat"\nbody = "none"\n'
        return o
    t+=stadium(23,15,10.5,-0.1,"#f6e7c8","shore")+stadium(23,15,8.2,-0.08,"#bfe6b0","lawn")
    # The ring path as a smooth band, and the walks: pale flat strips.
    n=70
    for i in range(n):
        a=i/n*math.tau
        px,pz=40+25*math.cos(a),30+18*math.sin(a)
        tx,tz=-25*math.sin(a),18*math.cos(a)
        yaw=round(math.degrees(math.atan2(tx,tz)),1)
        ln=math.hypot(tx,tz)*math.tau/n/2+.12
        t+=f'\n[[object]]\nname = "path"\nshape = {{ type = "box", half = [1.35, 0.01, {round(ln,2)}] }}\npos = [{round(px,2)}, -0.015, {round(pz,2)}]\nyaw = {yaw}\ncolor = "#fbfaf6"\nlook = "flat"\nbody = "none"\n'
    for (cx,cz,hx,hz) in ((40,19.5,2.0,9.5),(40,42.5,2.0,12.5),(27.5,30,12.5,1.5),(52.5,30,12.5,1.5),(40,28,5,3.5)):
        t+=f'\n[[object]]\nname = "walk"\nshape = {{ type = "box", half = [{hx}, 0.01, {hz}] }}\npos = [{cx}, -0.012, {cz}]\ncolor = "#fbfaf6"\nlook = "flat"\nbody = "none"\n'
    t+=obj("fit_desk",40,24,body="fixed")+obj("fit_calendar",32,21,yaw=20,body="fixed")+obj("fit_clam",48,22,yaw=-20,body="fixed")
    for i,x in enumerate((28,40,52)):
        t+=obj("fit_cabana",x,6,body="fixed",roles={"accent":["#9fd6f0","#ffd166","#78dcaa"][i]})
    for name,(x,z,c) in PAV.items():
        t+=obj("fit_pavilion",x,z,roles={"accent":c},name=name)
    for k,(x,z) in MATS.items():
        c={"breath":"#9fd6f0","pose":"#9fd6f0","squats":"#ffd166","plank":"#ffd166","step":"#ff9ec4","spin":"#ff9ec4","lap":"#ff9ec4","bigstand":"#ff786e"}.get(k,"#78dcaa")
        t+=obj("fit_mat",x,z,y=0.02,roles={"accent":c},name="mat_"+k)
    for i,(x,z) in enumerate(FLOPS):
        pass
    for i in range(30):
        a=i*2.399; rad=0.82+0.16*math.sin(i*1.7)
        x=40+33*rad*math.cos(a); z=30+25*rad*math.sin(a)
        if math.hypot((x-40)/25,(z-30)/18)-1>-0.08 and math.hypot((x-40)/25,(z-30)/18)-1<0.08: continue
        if abs(x-40)<4: continue
        if any(math.hypot(x-p[0],z-p[1])<6 for p in PAV.values()): continue
        t+=obj("fit_palm",round(x,1),round(z,1),yaw=int(a*57)%360,scale=round(.9+.3*math.sin(i),2),body="none")
    for (x,z,y) in ((10,31,90),(70,30,-90),(29,42,30),(50,41,-30)):
        t+=obj("fit_chair",x,z,yaw=y,roles={"accent":"#46bec8"})+obj("fit_umbrella",x+1.2,z-1.0,roles={"accent":"#ff786e"})
    for i in range(4):
        t+=obj("fit_pier",40,round(56+i*4,1),y=0.05,body="fixed")
    t+=obj("fit_tower",76,14,yaw=-90,scale=.8)+obj("market_stall",28,30,yaw=90)+obj("fit_towels",46,30)+obj("fit_towels",28,27,yaw=30)
    t+=obj("park_bench",52,33,yaw=-90)+obj("lamp_post",36,20)+obj("lamp_post",44,20)+obj("signpost",43,31,yaw=45)
    for x,z in ((40,39),(29,17),(51,17)):
        t+=obj("fit_lamp",x+3,z)
    for i in range(4):
        t+=obj("fence",33+i*2.4,13.5,yaw=0)
    t+=obj("round_table",24,33)+obj("chair",24,34.4,yaw=180)+obj("chair",24,31.6)
    t+=npc("guest",58,30,yaw=-90,clips=["STYLE100/Balance_Walk"])
    t+=npc("pip",*sp["pip"][::2],yaw=0,hop=3)+npc("posey",*sp["posey"][::2],yaw=0)+npc("kettle",*sp["kettle"][::2],yaw=0)+npc("bounce",*sp["bounce"][::2],yaw=180,hop=0.9)
    t+=npc("marjorie",*sp["marjorie"][::2],yaw=60,clips=["CMU/Stretch_Yawn"])+npc("tom",*sp["tom"][::2],yaw=-40,ai='{ type = "wander", radius = 3.0 }')
    t+=npc("twin",36,38,yaw=20,clips=["MESH2MOTION/Jumping Jacks"])+npc("twin",37.4,38,yaw=20,clips=["MESH2MOTION/Jumping Jacks"])
    for i,(x,z) in enumerate(((24,28),(55,26),(30,44),(50,44),(12,22),(68,38))):
        t+=npc("guest",x,z,yaw=i*70,ai='{ type = "wander", radius = 4.0 }')
    write("hub",t)
def studio():
    c=(30,0,30); b=shape("cylinder",30,-.25,30,"#fbfaf6",half_height=.25,radius=7.0)
    b+=shape("cylinder",30,.005,30,"#eef8f6",body="none",half_height=.01,radius=5.2)
    for a in (200,250,290,340):
        r=math.radians(a); b+=obj("fit_lamp",round(30+6.4*math.cos(r),1),round(30+6.4*math.sin(r),1))
    for i in range(12):
        a=i*.9+.3; b+=obj("fit_lotus",round(30+10*math.cos(a)*(1+.3*(i%3)),1),round(16+9*abs(math.sin(a))*(1+.3*(i%2)),1),y=-.01,scale=.9)
    for x,z,s in ((14,16,1.1),(46,18,1.),(10,30,.9),(50,32,1.2)):
        b+=obj("fit_palm",x,z,scale=s)+shape("cylinder",x,-.1,z,"#f6e7c8",body="none",half_height=.14,radius=4.0)
    b+=npc("posey",33.2,29.2,yaw=-15)+npc("pip",26.6,30.2,yaw=20,hop=4)
    write("studio",sea_set("Stillness Studio","A round white deck on a calm dawn lagoon.",60,60,dict(center=c,posey=(33.2,0,29.2),pip=(26.6,0,30.2)),
      view(sky="#f5dfe4",el=18,az=110,sun=.62,amb=1.15,sea="#a8dfe8"),b,"#a8dfe8"))
def gazebo():
    b=shape("rounded_box",25,-.4,25,"#bfe6b0",half="[13.0, 0.4, 13.0]",radius=.3)+obj("fit_pavilion",25,21,yaw=30,roles={"accent":"#ffe0a3"},scale=1.1)
    b+=shape("rounded_box",25,.01,25.5,"#3d4650",body="none",half="[1.1, 0.015, 1.7]",radius=.01)
    for x,z in ((15,15),(35,15),(13,29),(37,30)):
        b+=obj("fit_palm",x,z,scale=1.1)
    for i in range(4):
        b+=obj("fit_chair",16+i*6,17,yaw=180,roles={"accent":"#ff786e"})
    for i,(x,z) in enumerate(((17,19),(33,20))):
        b+=npc("guest",x,z,yaw=140 if i else -140,clips=["MESH2MOTION/Sitting_Idle"])
    b+=npc("guest",20,26,yaw=70,clips=["MESH2MOTION/Pushup"])
    b+=npc("kettle",28.4,24.6,yaw=-30)
    write("gazebo",sea_set("Iron Gazebo","A white iron gazebo at golden hour.",50,50,dict(center=(25,0,25.5),kettle=(28.4,0,24.6)),
      view(sky="#ffe5bd",el=20,az=250,sun=.8,amb=1.05,sea="#a9dfd8",cx=25,cz=25,sat=1.0,bloom=.25),b,"#a9dfd8"))
def boardwalk():
    b=shape("rounded_box",25,-.4,22,"#f6e7c8",half="[20.0, 0.4, 12.0]",radius=.2)
    b+=shape("rounded_box",25,-.05,27,"#e8d5ae",half="[20.0, 0.1, 3.0]",radius=.05)
    for i in range(10): b+=shape("box",7+i*4,.06,27,"#c9b184",body="none",half="[0.04, 0.01, 3.0]")
    b+=obj("fit_stepbox",25,26.6,y=.05,scale=1.0)+obj("market_stall",12,17,yaw=20)+obj("market_stall",38,17,yaw=-20)
    for x,z in ((8,14),(42,14),(18,12),(32,12)): b+=obj("fit_palm",x,z)
    for x,z in ((14,20),(36,20)): b+=obj("fit_umbrella",x,z,roles={"accent":"#ff9ec4"})+obj("fit_chair",x+1.4,z,roles={"accent":"#46bec8"})
    for i in range(7):
        b+=npc("guest",13+i*4,20.5+(i%2),yaw=0,clips=["MESH2MOTION/Cheering_Two_Hands"] if i%3==0 else (["CMU/Hop_One_Foot_Loop"] if i==4 else ["QUATERNIUS/Dance_Loop"]))
    b+=npc("bounce",29.6,25.0,hop=.625)
    write("boardwalk",sea_set("Boardwalk","A beach boardwalk at bright midday.",50,50,dict(center=(25,0,26.6),bounce=(29.6,0,25.0)),
      view(sky="#cfeefa",el=68,az=170,sun=.7,amb=1.2,cx=25,cz=25,sat=1.0),b))
def tide():
    b=''
    for x,z in ((10,10),(50,12),(8,44),(52,46)):
        b+=shape("cylinder",x,-.1,z,"#f6e7c8",body="none",half_height=.15,radius=4.5)+obj("fit_palm",x,z)
    write("tide",sea_set("Tide Table","A square raft on the lagoon.",60,60,dict(center=(30,0,30)),view(el=58,az=140,sun=.65,amb=1.15),b))
def channel():
    b=''
    for i in range(16):
        for sx in (-1,1):
            x=20+sx*17; z=8+i*19+(sx+1)*5
            b+=shape("rounded_box",x+sx*2,-.1,z,"#f6e7c8",body="none",half="[4.0, 0.2, 10.0]",radius=.1)+obj("fit_palm",x+sx*2,z,yaw=i*40,scale=round(1+.2*math.sin(i*2.1),2))
    b+=shape("rounded_box",20,-.05,4,"#e8d5ae",half="[5.0, 0.1, 4.0]",radius=.05)
    rows=[("~" if (r//50)%2==0 else "^")*40 for r in range(300)]
    sea="#8fdde0"
    t=head("Paddle Channel","A long channel between palm banks.",40,300,spots(start=(20,0,10)))+layout(rows)+legend(sea,f'''
[layout.legend.'^']
blocks = [{{ y0 = -2.5, y1 = -0.059, color = "{sea}", look = "flat" }}]
zone = {{ kind = "water", y0 = -2.0, y1 = 0.001, color = "{sea}" }}
''')+view(el=48,az=200,sun=.62,amb=1.15,cx=20,cz=150,fog=(40,170))+b
    write("channel",t)
def pier():
    b=''
    for i in range(20):
        b+=obj("fit_pier",20,10+i*4,y=0.9,body="none")
    b+=shape("rounded_box",20,.45,50,"#e8d5ae",half="[1.8, 0.42, 42.0]",radius=.04,body="fixed").replace('look = "cel"','look = "flat"')
    for i in range(10):
        b+=obj("fit_lamp",17.8 if i%2 else 22.2,12+i*8,y=.9)
    b+=shape("rounded_box",20,.45,90,"#e8d5ae",half="[5.0, 0.42, 4.0]",radius=.05)+obj("fit_umbrella",17,91,y=.9,roles={"accent":"#ff786e"})
    b+=npc("marjorie",20,91.0,y=.9,yaw=180)
    b+=npc("guest",22.5,90.0,y=.9,yaw=180)
    write("pier",sea_set("Smoothie Pier","A long pier out over the sea.",40,110,dict(start=(20,.9,8),end=(20,.9,88)),view(el=44,az=210,sun=.62,amb=1.15,cx=20,cz=50,fog=(30,130)),b))
def tower():
    b=shape("rounded_box",30,-.4,12,"#f6e7c8",half="[12.0, 0.45, 9.0]",radius=.2)+obj("fit_tower",30,17,scale=1.0)
    b+=obj("fit_smallraft",35,36,y=.02,scale=1.6,roles={"accent":"#ffd166"})
    for x,z in ((22,6),(38,6)): b+=obj("fit_palm",x,z)
    for i in range(6):
        b+=npc("guest",20+i*3.6,8.0,yaw=120,clips=["MESH2MOTION/Cheering_Two_Hands"])
    write("tower",sea_set("Cannonball Tower","A diving tower above a deep blue basin.",60,60,dict(board=(30,3.0,20),judges=(35,.1,36)),view(el=50,az=130,sun=.66,amb=1.15),b))
def bay():
    b=obj("fit_post",40,40)
    cast=[("pip",6,14),("posey",-5,12),("kettle",9,8),("bounce",-9,8),("marjorie",2,-16),("tom",-3,-17),("twin",6,-15),("twin",7.4,-15),("guest",-8,-14),("guest",-11,-11),("guest",11,-12),("guest",13,-8)]
    used={}
    for i,(n,dx,dz) in enumerate(cast):
        x,z=40+dx,40+dz
        b+=obj("fit_smallraft",x,z,y=.02,roles={"accent":["#ff786e","#ffd166","#46bec8","#78dcaa"][i%4]},scale=1.15)
        yaw=math.degrees(math.atan2(-dx,-dz))
        b+=npc(n,x,z,yaw=round(yaw),y=0.08,hop=0.9 if n=="bounce" else 0)
    for a in range(10):
        r=math.radians(a*36); b+=obj("fit_lamp",round(40+22*math.cos(r),1),round(40+22*math.sin(r),1),y=-.6)
    write("bay",sea_set("The Bay","A tiny post in the bay at sunset.",80,80,dict(post=(40,0,40)),
      view(sky="#ffb98a",el=9,az=280,sun=.9,amb=.85,sea="#f4b79e",cx=40,cz=40,sat=1.05,bloom=.45,fog=(30,120)),b,"#f4b79e"))
for f in (hub,studio,gazebo,boardwalk,tide,channel,pier,tower,bay): f()
print("sets written")
