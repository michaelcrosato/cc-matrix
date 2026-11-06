from pathlib import Path
import json,math
root=Path('engine/assets/props/lib/merc');root.mkdir(parents=True,exist_ok=True)
def box(size,pos,color='#44413a',**kw):return dict(type='rounded_box',size=size,radius=min(size)*.12,pos=pos,color=color,**kw)
def cyl(r,h,pos,color='#44413a',**kw):return dict(type='cylinder',radius=r,height=h,pos=pos,color=color,**kw)
def asset(name,parts,sockets=None):
 d=dict(format=2,name=name,unit='cm',description=name.replace('_',' ').capitalize()+' assembled from named primitive parts for the last dry season.',tags=['merc',name],parts=parts)
 if sockets:d['sockets']={k:{'pos':v} for k,v in sockets.items()}
 (root/(name+'.json')).write_text(json.dumps(d,indent=2)+'\n')
weapons=['pistol','revolver','flare','sawnoff','ar','battle','smg','shotgun','sniper','dart','lmg','rpg','flamer','mortar']
for i,name in enumerate(weapons):
 short=i<4;length=28 if short else 78
 parts={'receiver':box([6,8,20 if short else 33],[0,5,-12],'#454a46'),'grip':box([5,13,7],[0,-3,0],'#5c4836',pitch=-18),'barrel':cyl(1.5,12 if short else 42,[0,7,-length*.65],'#303733',pitch=90),'front_sight':box([.8,3,1.2],[0,11,-length*.85],'#222a28'),'sight_left':box([.8,2,1],[1.7,10,-length*.85],'#5b635d'),'sight_right':box([.8,2,1],[-1.7,10,-length*.85],'#5b635d'),'rear_sight':box([4,1.5,1.5],[0,10,-8],'#252e2b'),'trigger_guard':box([4,6,1],[0,-1,-8],'#242b28'),'bolt':box([2,2,6],[4,6,-13],'#92928a'),'pin':cyl(.7,7,[0,6,-2],'#9c9e8f',roll=90)}
 if not short:
  parts.update(stock=box([5,12,25],[0,2,20],'#6e432c',pitch=-7),fore=box([6,7,22],[0,4,-38],'#955b37'),mag=box([5,22,8],[0,-9,-17],'#404640',pitch=-12),band=box([6.8,4,3],[0,4,-35],'#b4a682'))
 if i in [8,9]:parts['scope']=cyl(2.6,30,[0,16,-21],'#262f2c',pitch=90);parts['scope_glass']=cyl(2.2,.4,[0,16,-36.2],'#7eac9b',pitch=90)
 if i in [11,13]:
  parts={'tube':cyl(7,95,[0,6,-28],'#62694b',pitch=90),'grip':box([5,15,7],[0,-8,0],'#493e2d'),'sight':box([2,9,5],[0,16,-15],'#353f35'),'ring':cyl(8,6,[0,6,12],'#3a4336',pitch=90),'nose':cyl(5,20,[0,6,-80],'#777d50',pitch=90)}
 if i==12:parts['tank']=cyl(9,34,[8,-5,12],'#a78742');parts['nozzle']=cyl(4,20,[0,7,-62],'#353a31',pitch=90)
 if i==10:parts['belt_box']=box([18,16,19],[7,-6,-10],'#7a704d');parts['bipod']=box([2,22,2],[5,-4,-57],'#414c41',roll=20)
 asset(name,parts,{'grip':[0,-2,0],'fore':[-1,2,-34 if not short else -7],'mag':[0,-16,-17],'muzzle':[0,7,-length]})
asset('syrette',{'body':cyl(1,10,[0,0,0],'#d7c99e'),'plunger':box([4,1,2],[0,6,0],'#d4ba79'),'needle':cyl(.15,5,[0,-7,0],'#deded0')})
asset('pills',{'bottle':cyl(3,10,[0,0,0],'#745433'),'label':box([5.5,4,1],[0,0,-2.6],'#e6d4a0'),'cap':cyl(3.2,2,[0,6,0],'#ded6b9')})
for name in ['gps','tracker','recorder','monocular','pliers','knife','wrench','lighter']:
 if name=='monocular':parts={'body':cyl(4,20,[0,0,-8],'#3c463a',pitch=90),'glass':cyl(3.2,.5,[0,0,-18],'#7a9f9b',pitch=90)}
 elif name in ['pliers','wrench','knife']:parts={'handle':box([3,20,3],[0,0,0],'#8b5e39'),'head':box([6,12,1],[0,14,0],'#b7b8a4')}
 elif name=='lighter':parts={'body':box([4,7,2],[0,0,0],'#ad9d6a'),'top':box([4,2,2],[0,4,0],'#bfc1af')}
 else:parts={'body':box([12,20,4],[0,0,0],'#454c39'),'screen':box([9,10,.5],[0,2,-2.3],'#98ae70',emissive=.3),'dial':cyl(1,1,[3,-6,-2.7],'#272b24',pitch=90),'antenna':cyl(.3,13,[4,16,0],'#c1b79a')}
 asset(name,parts)
asset('acacia',{'trunk':cyl(22,450,[0,225,0],'#5b4932'),'branch_l':cyl(12,280,[-95,420,0],'#5b4932',roll=-48),'branch_r':cyl(10,300,[95,440,25],'#5b4932',roll=55),'canopy':box([850,120,620],[0,580,0],'#747443'),'leaf_l':box([450,90,450],[-290,555,20],'#737943'),'leaf_r':box([430,85,390],[290,570,65],'#85894b')})
asset('baobab',{'trunk':cyl(160,900,[0,450,0],'#84654a'),'branch_l':cyl(45,500,[-180,900,0],'#84654a',roll=-40),'branch_r':cyl(40,500,[180,930,0],'#84654a',roll=40),'leaves':box([600,140,450],[0,1200,0],'#73723d')})
asset('thorn',{'branches':box([160,70,140],[0,35,0],'#7d7743'),'twig':cyl(4,130,[0,65,0],'#725c3b',roll=35)})
asset('boulder',{'rock':box([390,210,280],[0,105,0],'#8b7b6a',roll=8),'rock_top':box([230,150,200],[60,230,0],'#9d8d77',roll=-11)})
asset('termite',{'mound':dict(type='cone',radius=90,height=250,pos=[0,125,0],color='#a66e40')})
asset('sandbag',{'bags':box([300,70,85],[0,35,0],'#a79c77'),'row':box([280,45,85],[8,85,0],'#b7a778')})
asset('fuel_drum',{'drum':cyl(36,110,[0,55,0],'#8a4932'),'band_1':cyl(38,6,[0,25,0],'#4c4032'),'band_2':cyl(38,6,[0,80,0],'#4c4032'),'cap':cyl(5,3,[14,112,0],'#c4ac73')})
asset('tank',{'body':cyl(260,550,[0,275,0],'#b9ad8c'),'rim':cyl(270,25,[0,560,0],'#6b6b56'),'band':cyl(263,30,[0,230,0],'#7b5541'),'pipe':cyl(15,550,[220,220,0],'#5f624f',roll=90),'ladder':box([40,500,12],[-255,240,0],'#494d41')})
for name,c in [('tin_shack','#bcb18d'),('hut','#b99863'),('hotel','#cfbd90'),('church','#d0bca0'),('bar','#bca47a')]:
 w=1000 if name in ['hotel','bar','church'] else 700;depth=850 if name=='hotel' else 600
 parts={'wall_back':box([w,320,25],[0,160,-depth/2],c),'wall_left':box([25,320,depth],[-w/2,160,0],c),'wall_right':box([25,320,depth],[w/2,160,0],c),'front_left':box([w*.3,320,25],[-w*.35,160,depth/2],c),'front_right':box([w*.3,320,25],[w*.35,160,depth/2],c),'roof':box([w+100,25,depth+90],[0,340,0],'#6c6653'),'lintel':box([w*.4,60,25],[0,290,depth/2],c),'step':box([w*.5,18,120],[0,9,depth/2+45],'#8e7b59')}
 if name=='bar':parts.update(counter=box([400,110,80],[-200,55,-180],'#604532'),shelf=box([400,180,30],[-200,210,-280],'#5c4830'))
 if name=='hotel':parts['upper']=box([w,350,20],[0,490,-depth/2],'#b4a27d');parts['balcony']=box([w,20,200],[0,350,depth/2],'#a18e6b')
 if name=='church':parts['cross_v']=box([18,190,18],[0,450,depth/2],'#615c41');parts['cross_h']=box([95,18,18],[0,480,depth/2],'#615c41')
 asset(name,parts)
asset('watchtower',{'leg_l':box([25,650,25],[-150,325,0],'#726147'),'leg_r':box([25,650,25],[150,325,0],'#726147'),'platform':box([420,30,360],[0,600,0],'#8b7958'),'roof':box([480,25,400],[0,850,0],'#6a6b54'),'post_l':box([15,250,15],[-185,725,130],'#726147'),'post_r':box([15,250,15],[185,725,130],'#726147')})
asset('silo',{'concrete':cyl(500,1900,[0,950,0],'#a79c83'),'top':cyl(520,70,[0,1900,0],'#787a68'),'stain':box([180,1400,20],[150,1000,-490],'#8b866c')})
asset('mast',{'spine':box([40,3200,40],[0,1600,0],'#6a6b58'),'cross_low':box([800,30,30],[0,1900,0],'#6a6b58'),'cross_high':box([500,30,30],[0,2700,0],'#6a6b58'),'light':dict(type='sphere',radius=25,pos=[0,3220,0],color='#df502b',emissive=2)})
asset('sign',{'post':box([12,260,12],[0,130,0],'#5c4d32'),'board':box([240,85,10],[0,240,0],'#d4c397'),'stripe':box([220,10,12],[0,215,-1],'#9b3c29')})
for name,kind in [('technical',0),('jeep',1),('truck',2),('boat',3)]:
 if kind==3:parts={'hull':box([220,55,650],[0,30,0],'#6b7254'),'rail_l':box([15,80,650],[-110,70,0],'#656849'),'rail_r':box([15,80,650],[110,70,0],'#656849'),'bench':box([200,20,50],[0,85,100],'#9f8f61'),'engine':box([80,110,50],[0,10,330],'#3b4940'),'gun':cyl(6,110,[0,160,-150],'#303c32',pitch=90)}
 else:
  length=650 if kind==2 else 470
  parts={'chassis':box([190,45,length],[0,80,0],'#4e5141'),'hood':box([185,65,140],[0,130,-length/2+70],'#8a8557'),'cab_back':box([190,160,20],[0,160,15],'#7b7950'),'roof':box([205,15,160],[0,240,-65],'#777b55'),'pillar_l':box([10,100,10],[-90,190,-140],'#777b55'),'pillar_r':box([10,100,10],[90,190,-140],'#777b55'),'dash':box([180,40,30],[0,155,-125],'#444d3b'),'seat':box([160,50,70],[0,120,-10],'#514c35'),'bed':box([185,30,length/2-20],[0,110,length/4],'#867e4f'),'tail':box([190,80,15],[0,140,length/2],'#867e4f'),'bed_l':box([12,70,length/2],[-90,135,length/4],'#867e4f'),'bed_r':box([12,70,length/2],[90,135,length/4],'#867e4f'),'grill':box([150,40,5],[0,105,-length/2-2],'#333f35')}
  for side in [-1,1]:
   for z in [-length*.32,length*.32]:parts[f'wheel_{side}_{int(z)}']=cyl(43,28,[side*103,45,z],'#292d28',roll=90)
   parts[f'lamp_{side}']=box([26,22,8],[side*70,132,-length/2-3],'#e5d4a0',emissive=.3)
  if kind==0:parts['gun_pole']=cyl(6,130,[0,180,100],'#3b4738');parts['gun_receiver']=box([20,20,65],[0,250,70],'#384035');parts['gun_barrel']=cyl(4,130,[0,250,-20],'#303b32',pitch=90)
 asset(name,parts,{'driver':[-40,150,-50],'gunner':[0,200,100],'hood':[0,160,-170]})
# Native pose clips. The view samples these keys and pins hands to weapon sockets with the engine IK.
base=dict(hips=[0,0,100],body=[0,0,0],chest=[0,0,0],head=[0,0,0],armL=[95,12,-25,55,0],armR=[65,12,-60,75,0],legL=[0,0,-100,5,0],legR=[0,0,-100,5,0])
names=['idle','sprint','draw','holster','reload','reload_belt','reload_shell','reload_break','reload_rocket','jam','bolt_slap','throw','machete','backstab','syrette','wound_0','wound_1','wound_2','wound_3','wound_4','wound_5','pills','map','monocular','tracker','recorder','wheel','repair','overdose','pickup','break','dragged','stand']
clips={}
for index,name in enumerate(names):
 dur=4 if name.startswith('wound') else 2.1 if name in ['reload','pills'] else 1
 keys=[]
 for t in [0,.25,.5,.75,1]:
  k=base.copy();k['t']=t*dur
  phase=math.sin(t*math.pi)
  k['armL']=[int(95-55*phase),int(12+20*phase),int(-25+40*phase),int(55+40*phase),int((index%5-2)*12*phase)]
  k['armR']=[int(65+20*phase),12,int(-60+45*phase),int(75+20*phase),0]
  keys.append(k)
 clips[name]=dict(dur=dur,loop=name in ['idle','sprint','wheel'],desc='Original first-person '+name.replace('_',' ')+' pose sequence.',keys=keys)
Path('engine/anim/merc_fp.json').write_text(json.dumps(dict(set='MERC_FP',title='Field actions',format=1,credit='Original key poses, CC0-1.0.',fps=30,clips=clips),indent=2)+'\n')
clips2={}
q=json.loads(Path('engine/anim/quaternius.json').read_text());s=json.loads(Path('engine/anim/style100.json').read_text())
for n in ['Pistol_Aim_Neutral','Pistol_Shoot','Pistol_Reload','Crouch_Fwd_Loop','Death01','Sitting_Idle_Loop','Walk_Carry_Loop','OverhandThrow']:
 c=q['clips'][n].copy();c['src']='';clips2[n.lower()]=c
for n in ['panic','burning','drag','prone','fire']:
 c=clips['sprint' if n=='panic' else 'dragged' if n=='drag' else 'idle'].copy();clips2[n]=c
Path('engine/anim/merc_npc.json').write_text(json.dumps(dict(set='MERC_NPC',title='Field soldiers',format=1,credit='Original poses plus Quaternius Universal Animation Library, CC0-1.0.',fps=30,clips=clips2),indent=2)+'\n')
# Procedural materials.
for name,color in [('rust_tin','#8b5c3b'),('laterite','#a4552f'),('stained_concrete','#a79c83'),('thatch','#a08a4e'),('burnt_wood','#2a2420'),('painted_steel','#62694b')]:
 d=dict(format=1,name=name,unit='cm',description=name.replace('_',' '),tags=['merc'],color=color,roughness=.8,layers=[dict(type='noise',size=15,cover=.3,shade=.7)])
 Path('engine/assets/materials/'+name+'.json').write_text(json.dumps(d)+'\n')
