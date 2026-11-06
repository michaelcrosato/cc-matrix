from pathlib import Path
import json,math
root=Path(__file__).resolve().parents[1]/'engine'
asset=root/'assets/props/lib/core'
C={'deck':'#fbfaf6','teal':'#46bec8','coral':'#ff887c','mint':'#78dcaa','sand':'#f6e7c8','wood':'#c99872','ink':'#263e54','yellow':'#ffd166','leaf':'#98c99b','pink':'#eba5bd'}
def part(t,color,pos=(0,0,0),**kw):return {'type':t,'color':C.get(color,color),'pos':list(pos),**kw}
def box(size,pos,color='deck',r=0.07):return part('rounded_box',color,pos,size=size,radius=min(r,min(size)*.49))
def ell(size,pos,color):return part('ellipsoid',color,pos,size=size)
def cyl(rad,h,pos,color):return part('cylinder',color,pos,radius=rad,height=h)
def tor(rad,minor,pos,color):return part('torus',color,pos,radius=rad,minor_radius=minor)
def save(name,parts,tags=['resort','wellness']):
 d={'format':2,'name':'fit_'+name,'unit':'m','description':f'Tippy Cay {name.replace("_"," ")}.','category':'tool','tags':tags,'parts':parts,'lineage':{'method':'authored','origin':'agent','parents':[],'license':'CC0-1.0','credit':'Original Wobble Wit resort art.'}}
 (asset/f'fit_{name}.json').write_text(json.dumps(d,indent=2))
save('palm',{'trunk':part('cone','wood',(0,2.15,0),radius=.22,radius_end=.12,height=4.3,roll=-9),'crown':ell([.65,.45,.65],(.3,4.2,0),'leaf'),**{f'frond{i}':{**ell([.65,.17,2.8],(.3+math.sin(i*math.tau/7)*.9,4.15,math.cos(i*math.tau/7)*.9),'leaf'),'yaw':i*360/7,'pitch':-14,'sway':'leaves'}for i in range(7)}})
save('mat',{'body':box([1.25,.07,2.25],(0,.05,0),'teal',.025),'trim':box([1.1,.015,.12],(0,.095,.95),'mint',.007)})
save('step',{'top':box([1.7,.2,.7],(0,.26,0),'teal'),'leg':box([.25,.2,.5],(.55,.1,0),'ink',.03),'leg2':box([.25,.2,.5],(-.55,.1,0),'ink',.03)})
save('paddleboard',{'hull':ell([1.25,.23,3.5],(0,.06,0),'deck'),'stripe':box([.6,.02,2.4],(0,.19,0),'teal',.008),'stripe2':box([.2,.02,2.5],(.39,.19,0),'coral',.008)})
save('buoy',{'base':ell([.65,.6,.65],(0,.25,0),'coral'),'stripe':cyl(.32,.15,(0,.28,0),'deck'),'post':cyl(.04,1.4,(0,.9,0),'ink'),'flag':box([.5,.3,.04],(.25,1.5,0),'yellow',.015)})
save('raft',{'deck':box([6.,.22,6.],(0,.1,0),'wood'),'rim':box([6.,.16,.14],(0,.3,2.9),'deck'),'rim2':box([6.,.16,.14],(0,.3,-2.9),'deck'),'rim3':box([.14,.16,6.],(2.9,.3,0),'deck'),'rim4':box([.14,.16,6.],(-2.9,.3,0),'deck')})
save('pool',{'rim':tor(.43,.09,(0,.035,0),'teal'),'water':cyl(.38,.025,(0,.025,0),'#8fdde0')})
save('shell',{'shell':ell([.43,.33,.38],(0,.18,0),'coral'),'spiral':tor(.11,.04,(.04,.32,.02),'deck'),'feet':ell([.55,.08,.4],(0,.045,0),'yellow'),'eye':part('sphere','ink',(.1,.29,.18),radius=.035),'eye2':part('sphere','ink',(-.1,.29,.18),radius=.035)})
save('tray',{'tray':box([1.5,.07,.85],(0,.04,0),'wood'),'rim':box([1.5,.1,.05],(0,.1,.4),'coral')})
save('smoothie',{'glass':part('cone','deck',(0,.2,0),radius=.1,radius_end=.15,height=.4),'drink':cyl(.135,.05,(0,.4,0),'pink'),'straw':part('cylinder','yellow',(.05,.55,0),radius=.018,height=.3,roll=15),'umbrella':part('cone','coral',(-.03,.7,0),radius=.16,radius_end=0.,height=.12)})
save('floatie',{'ring':tor(.65,.16,(0,.18,0),'coral'),'stripe':tor(.65,.045,(0,.31,0),'yellow')})
save('lounge',{'seat':box([.8,.13,1.5],(0,.45,.2),'deck'),'back':{**box([.8,.12,.9],(0,.8,-.7),'teal'),'pitch':-50},'leg1':box([.12,.5,1.1],(-.3,.23,.2),'wood'),'leg2':box([.12,.5,1.1],(.3,.23,.2),'wood')})
save('umbrella',{'pole':cyl(.045,3.,(0,1.5,0),'wood'),'canopy':part('cone','coral',(0,3.,0),radius=1.65,radius_end=0.,height=.55),'cap':part('sphere','deck',(0,3.3,0),radius=.09)})
save('cabana',{'floor':box([4.,.2,3.],(0,.1,0),'deck'),'roof':part('wedge','sand',(0,2.9,0),size=[4.5,1.,3.5],peak=0),'post1':cyl(.08,2.4,(-1.8,1.4,-1.3),'wood'),'post2':cyl(.08,2.4,(1.8,1.4,-1.3),'wood'),'post3':cyl(.08,2.4,(-1.8,1.4,1.3),'wood'),'post4':cyl(.08,2.4,(1.8,1.4,1.3),'wood'),'bed':box([1.5,.45,2.2],(0,.5,0),'teal'),'pillow':ell([1.1,.3,.5],(0,.85,-.65),'deck')})
save('desk',{'front':box([3.,1.,.85],(0,.5,0),'wood'),'counter':box([3.3,.15,1.1],(0,1.05,0),'deck'),'stripe':box([2.8,.16,.025],(0,.63,.44),'teal'),'bell':part('sphere','yellow',(.8,1.2,0),radius=.14)})
save('pavilion',{'base':cyl(4.,.16,(0,.08,0),'deck'),'roof':part('cone','teal',(0,3.5,0),radius=4.2,radius_end=.35,height=1.0),**{f'post{i}':cyl(.1,3.,(math.sin(i*math.tau/6)*3.5,1.6,math.cos(i*math.tau/6)*3.5),'deck')for i in range(6)}})
save('calendar',{'board':box([3.2,2.2,.18],(0,1.5,0),'deck'),'post1':box([.13,2.5,.13],(-1.3,1.25,0),'wood'),'post2':box([.13,2.5,.13],(1.3,1.25,0),'wood'),**{f'day{i}':box([.43,.55,.06],((i-2)*.53,1.45,.13),'teal',.025)for i in range(5)}})
save('clam',{'bottom':ell([2.6,.75,1.7],(0,.45,0),'pink'),'inside':ell([2.4,.2,1.5],(0,.72,0),'coral'),'top':{**ell([2.6,.3,1.7],(0,1.,-.4),'pink'),'pitch':-38},'pearl':part('sphere','deck',(0,.86,.1),radius=.29)})
save('flipflop',{'sole':ell([.27,.065,.55],(0,.04,0),'yellow'),'strap1':{**box([.04,.1,.3],(.06,.09,0),'coral',.015),'roll':-35},'strap2':{**box([.04,.1,.3],(-.06,.09,0),'coral',.015),'roll':35}})
save('gull',{'body':ell([.6,.42,.8],(0,.32,0),'deck'),'head':part('sphere','deck',(0,.6,.29),radius=.22),'beak':part('cone','yellow',(0,.58,.55),radius=.09,radius_end=0.,height=.24,pitch=90),'eyes':part('sphere','ink',(.15,.64,.4),radius=.035),'eyes2':part('sphere','ink',(-.15,.64,.4),radius=.035),'wing':ell([1.25,.09,.4],(0,.43,0),'deck'),'cap':cyl(.22,.12,(0,.82,.28),'ink')})
save('scorecard',{'card':box([.65,.8,.05],(0,1.,0),'deck'),'handle':cyl(.035,.7,(0,.35,0),'wood')})
save('lotus',{'lily':ell([1.1,.03,.95],(0,.02,0),'leaf'),**{f'petal{i}':{**ell([.2,.18,.58],(math.sin(i*math.tau/7)*.2,.15,math.cos(i*math.tau/7)*.2),'pink'),'yaw':i*360/7}for i in range(7)},'heart':part('sphere','yellow',(0,.22,0),radius=.11)})
save('towels',{'towel1':box([.8,.17,.5],(0,.1,0),'deck'),'towel2':box([.8,.17,.5],(.04,.27,0),'teal'),'towel3':box([.8,.17,.5],(-.02,.44,0),'deck')})
save('kettle',{'body':part('sphere','ink',(0,.7,0),radius=.7),'handle':{**tor(.5,.12,(0,1.45,0),'ink'),'pitch':90},'eye1':part('sphere','deck',(.21,.85,.63),radius=.065),'eye2':part('sphere','deck',(-.21,.85,.63),radius=.065)})
save('tower',{'deck':box([3.,.25,2.4],(0,4.,0),'deck'),'leg1':box([.22,4.,.22],(-1.2,2.,-.9),'wood'),'leg2':box([.22,4.,.22],(1.2,2.,-.9),'wood'),'leg3':box([.22,4.,.22],(-1.2,2.,.9),'wood'),'leg4':box([.22,4.,.22],(1.2,2.,.9),'wood'),'ladder':box([.65,4.,.1],(1.4,2.,0),'teal'),'board':box([3.4,.11,.65],(2.2,4.2,0),'coral')})
save('diving_board',{'base':box([.8,.4,.7],(-1.1,.2,0),'teal'),'spring':tor(.25,.07,(-.8,.6,0),'ink'),'board':box([3.2,.13,.7],(0,.85,0),'coral')})
save('small_raft',{'logs':{**cyl(.18,3.,(0,.15,0),'wood'),'pitch':90,'array':{'count':5,'step':[.38,0,0]}},'flagpole':cyl(.03,2.,(.6,1.,-.8),'wood'),'flag':box([.5,.4,.025],(.84,1.8,-.8),'coral',.01)})
save('crab',{'body':ell([.55,.2,.35],(0,.18,0),'coral'),'legs':{**box([.65,.04,.05],(0,.08,0),'coral',.015),'array':{'count':3,'step':[0,0,.15]}},'claw1':part('sphere','coral',(.38,.23,.15),radius=.12),'claw2':part('sphere','coral',(-.38,.23,.15),radius=.12)})
save('ribbon',{'ring':{**tor(.32,.06,(0,1.,0),'yellow'),'pitch':90},'tail':box([.15,.45,.04],(-.15,.6,0),'coral',.015),'tail2':box([.15,.45,.04],(.15,.6,0),'coral',.015)})
save('pip',{'cushion':ell([1.4,.48,1.4],(0,.28,0),'#8ccbdc'),'ring':tor(.58,.06,(0,.48,0),'deck'),'eye1':part('sphere','ink',(.18,.42,.61),radius=.055),'eye2':part('sphere','ink',(-.18,.42,.61),radius=.055),'valve':cyl(.07,.15,(.7,.25,0),'teal')})
# Island and every activity are separate native rooms, with the same palette.
sets=['hub','studio','gazebo','boardwalk','tide','channel','pier','tower','bay']
for n,name in enumerate(sets):
 yaw,tilt,dist,fov=[(10,38,32,42),(0,12,10,38),(-22,18,11,38),(0,20,12,40),(0,62,13,42),(0,22,11,42),(0,19,11,40),(90,6,15,42),(0,18,12,40)][n]
 text=f'''name = "{name.title()} · Tippy Cay"
about = "A small place to stand."
entrance = {{ at = [16, 18], facing = "south" }}
[camera]
yaw = {float(yaw)}
tilt = {float(tilt)}
distance = {float(dist)}
fov = {float(fov)}
[view]
sky = "{'#eddbd5' if n==8 else '#d6eef6'}"
exposure = 1.0
saturation = 0.95
bloom = 0.15
bloom_threshold = 1.3
outlines_on = "objects"
outline_px = 1.0
outline_darken = 0.45
rim = 0.3
fog = true
fog_start = 32.0
fog_end = 125.0
wind = 0.5
"light.sun_elevation" = {24.0 if n in [2,8] else 52.0}
"light.sun_azimuth" = 160.0
"light.sun_intensity" = 0.62
"light.ambient" = 1.15
"cutaway.height_cut" = false
"cutaway.front_cut" = false
"cutaway.fade" = false
[layout]
origin = [{n*200-16}.0, 0.0, -12.0]
[[layout.layer]]
y = 0
map = """
'''
 for z in range(24):text+=''.join('P' if (x,z)==(16,12) else '.' for x in range(32))+'\n'
 text+='"""\n[layout.legend.\'.\']\n[layout.legend.\'P\']\nmarker = "player"\n'
 def obj(key,pos,shape=None,color=None,assetname=None,scale=None,yaw=None):
  nonlocal_dummy=None
  s=f'\n[[object]]\nname = "{key}"\npos = {json.dumps(pos)}\n'
  if assetname:s+=f'asset = "LIB/core/{assetname}"\n'
  if shape:s+='shape = '+shape+'\n'
  if color:s+=f'color = "{color}"\nlook = "cel"\n'
  if scale:s+=f'scale = {scale}\n'
  if yaw is not None:s+=f'yaw = {float(yaw)}\n'
  s+='body = "fixed"\n';return s
 def P(x,y,z):return [x+16,y,z+12]
 text+=obj('sea',P(0,-.2,0),'{ type = "cylinder", half_height = 0.05, radius = 130.0 }','#8fdde0')
 # Floor extends below the water so routed activities never enter swimming posture.
 text+=obj('support',P(0,-.21,-40),'{ type = "box", half = [42.0, 0.15, 100.0] }','#8fdde0')
 if n==0:
  text+=obj('sand',P(0,-.05,0),'{ type = "cylinder", half_height = 0.2, radius = 25.0 }','#f6e7c8')
  text+=obj('grass',P(0,.12,0),'{ type = "cylinder", half_height = 0.04, radius = 22.7 }','#bfe6b0')
  text+=obj('reception_deck',P(0,.19,0),'{ type = "cylinder", half_height = 0.08, radius = 7.0 }','#fbfaf6')
  text+=obj('path1',P(0,.18,0),'{ type = "box", half = [2.2, 0.04, 20.0] }','#f6e7c8')
  text+=obj('path2',P(0,.18,0),'{ type = "box", half = [21.0, 0.04, 1.8] }','#f6e7c8')
  for i,(x,z)in enumerate([(-13,-8),(13,-8),(-13,8),(13,8)]):
   text+=obj('pavilion'+str(i),P(x,.2,z),assetname='fit_pavilion',scale=.9)
   text+=obj('mat'+str(i),P(x,.35,z+1.5),assetname='fit_mat')
  for i,(key,x,z)in enumerate([('fit_desk',0,-2),('fit_clam',3,1),('fit_calendar',-4,-3),('fit_cabana',-6,16),('fit_cabana',0,17),('fit_cabana',6,16),('fit_towels',-2,0)]):text+=obj(key+str(i),P(x,.22,z),assetname=key)
  for i in range(18):
   a=i*math.tau/18;text+=obj('palm'+str(i),P(math.sin(a)*22.5,.18,math.cos(a)*22.5),assetname='fit_palm',scale=.7+(i%3)*.15,yaw=i*67)
  for i,(x,z)in enumerate([(-19,-4),(19,2),(-18,12),(18,-12)]):
   text+=obj('umbrella'+str(i),P(x,.18,z),assetname='fit_umbrella',scale=.8)
   text+=obj('lounge'+str(i),P(x+1,.18,z+1),assetname='fit_lounge',scale=.9,yaw=-25)
  text+=obj('pier',P(15,.22,14),'{ type = "box", half = [2.0, 0.15, 9.0] }','#c99872')
  text+=obj('rowboat',P(19,0,18),assetname='rowboat')
 else:
  if n in [1,2,3]:
   text+=obj('deck',P(0,.03,0),'{ type = "cylinder", half_height = 0.1, radius = 7.2 }','#fbfaf6')
   text+=obj('edge',P(0,-.03,0),'{ type = "cylinder", half_height = 0.1, radius = 7.45 }','#c99872')
   for i in range(5):text+=obj('lily'+str(i),P((i-2)*2.4,0.,-8.-(i%2)*1.5),assetname='fit_lotus')
   for i in [-1,1]:
    text+=obj('palm'+str(i),P(i*9,0,-4),assetname='fit_palm')
    text+=obj('lounge'+str(i),P(i*5,.12,-3),assetname='fit_lounge',yaw=-i*35)
   text+=obj('mat',P(0,.15,0),assetname='fit_mat')
   if n==2:text+=obj('kettle',P(3,.12,0),assetname='fit_kettle',scale=1.2)
   if n==3:text+=obj('step',P(0,.15,.1),assetname='fit_step')
  elif n==4:text+=obj('raft',P(0,.03,0),assetname='fit_raft')
  elif n==5:
   for j in range(11):
    x=math.sin(j*1.7)*2.4
    for side in [-1,1]:text+=obj(f'buoy{j}_{side}',P(x+side*1.5,0,-(j+1)*8.),assetname='fit_buoy')
  elif n==6:
   text+=obj('long_pier',P(0,.1,-30),'{ type = "box", half = [2.0, 0.15, 40.0] }','#c99872')
   for j in range(20):text+=obj('plank'+str(j),P(0,.26,-j*3.5),'{ type = "box", half = [2.0, 0.01, 0.015] }','#f6e7c8')
  elif n==7:
   text+=obj('platform',P(-1,-.1,0),'{ type = "box", half = [3.5, 0.2, 3.0] }','#fbfaf6')
   text+=obj('board',P(0,.05,0),assetname='fit_diving_board')
   text+=obj('tower',P(-5,0,-3),assetname='fit_tower')
   for j in range(3):text+=obj('judge'+str(j),P(4,0,(j-1)*2.),assetname='fit_gull',yaw=-90)
  elif n==8:
   text+=obj('post',P(0,-.35,0),'{ type = "cylinder", half_height = 0.6, radius = 0.65 }','#c99872')
   for j in range(9):
    a=(j+1)*math.tau/10;text+=obj('raft'+str(j),P(math.sin(a)*7.,0,math.cos(a)*7.-2.),assetname='fit_small_raft',yaw=j*36)
  for j in range(4):text+=obj('distant_palm'+str(j),P((j-1.5)*9,-.3,-22),assetname='fit_palm',scale=.7)
 # Every set has quiet company.
 for i,(x,z)in enumerate([(-4,-2),(4,-3),(-5,2)] if n else [(-2,5),(4,5),(7,1),(8.3,1),(-9,14)]):
  text+=f'\n[[npc]]\nname = "guest_{n}_{i}"\nkind = "biped"\npos = {P(x,.3,z)}\nlook = {{ skin = "#cf946e", shirt = "#faf8ee", pants = "#faf8ee", shoes = "#c99872", scale = 0.9, gear = {{ helm = "hood", helm_color = "#fbfaf6" }} }}\n'
 if n==1:text+='\n[[npc]]\nname = "Posey"\nkind = "biped"\npos = [19.0,0.2,12.0]\nlook = { skin = "#d8b184", shirt = "#d8b184", pants = "#c79f6e", shoes = "#c79f6e", eyes = "#d8b184", scale = 1.05 }\n'
 if n in [0,3]:text+=f'\n[[npc]]\nname = "Bounce"\nkind = "blob"\npos = {P(3,.2,-1)}\nlook = {{ skin = "#eba5bd", shirt = "#eba5bd", scale = 1.2 }}\n'
 (root/'crates/pav_core/src/games/fit/sets'/f'{name}.toml').write_text(text)
