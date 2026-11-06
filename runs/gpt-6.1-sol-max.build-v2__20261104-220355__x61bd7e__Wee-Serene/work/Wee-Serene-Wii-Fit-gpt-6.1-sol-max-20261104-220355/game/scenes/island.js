(() => {
const G=window.G,E=G.E,game=G.game,{px,clamp}=E,P=G.palette;
E.SHAPES.retreatHouse={about:'little white retreat bungalow with a sea-green roof',mats:{w:'retreatWhite',r:'retreatCyan',p:'retreatWood'},parts:[['box','w',[0,0,0],[56,35,26]],['prism','r',[0,0,26],[[-24,0],[0,14],[24,0]],65,{axis:'x'}],['box','p',[0,18,0],[11,1,18]],['row',2,[34,0,0],['box','r',[0,18,12],[10,1,8]]]]};
const spots=[
 ['stork',420,85],['flow',465,85],['candle',510,85],['squat',558,163],['pushup',602,163],['lunge',646,163],['step',425,351],['hoop',470,351],['jog',515,351],['tray',237,294],['slalom',123,96],['laundry',558,272]
];
G.makeIsland=()=>{const rows=[];for(let y=0;y<26;y++){let row='';for(let x=0;x<44;x++){const d=Math.pow((x-22)/21,2)+Math.pow((y-13)/12,2);row+=d>1?'~':y>20?'.':x<11&&y<8?'^':((Math.abs(y-13)<1.5&&x>7&&x<39)||(Math.abs(x-21)<1.5&&y>7))?'.':',';}rows.push(row);}
 const map=new E.TileMap({rows,legend:{'~':{floor:'sea',block:true},',':{floor:'grass'},'.':{floor:'sand'},'^':{floor:'mountain'}},types:{},block:['sea'],outside:'#54b8c8',ao:0,floorTex:(x,y,tag)=>{const speck=((Math.floor(x)*7+Math.floor(y)*13)%19)/19;return tag==='sea'?[77+speck*10,177+speck*10,192+speck*10]:tag==='mountain'?[211+speck*15,225+speck*13,224+speck*16]:tag==='sand'?[231+speck*10,214+speck*10,175+speck*10]:[166+speck*12,199+speck*12,153+speck*10];}});
 const things=spots.map(([id,x,y])=>({kind:'mat',id,x,y,name:G.activities[id].name}));things.push({kind:'bed',x:113,y:220,name:'Your bungalow'},{kind:'tare',x:300,y:157,name:'Reception'},{kind:'bar',x:337,y:236,name:'Dennis'},{kind:'festival',x:376,y:185,name:'The Gentle Games'});
 const people=G.regulars.slice(0,7).map((a,i)=>({kind:'person',id:i,name:a[0],x:[405,337,548,213,447,199,350][i],y:[115,218,327,255,314,192,275][i],rig:G.regularRig(i,1.1)}));things.push(...people);
 const hero=new E.Body({x:300,y:207,r:5,gravity:700});return {map,flow:new E.FlowField(map),hero,rig:G.playerRig(1.2),things,people,target:null,hover:null,nearest:null,t:0};};
G.island=null;
G.islandUpdate=(s,dt,auto=false)=>{
 s.t+=dt;const I=game.input,m=I.move();let vx=m[0],vy=m[1];
 if(auto){vx=Math.sin(s.t*.6);vy=Math.cos(s.t*.53)*.6;s.hero.x=300+Math.sin(s.t*.3)*100;s.hero.y=210+Math.cos(s.t*.4)*60;}
 else{
  const point=I.pointer();s.hover=null;if(point){const hits=game.r.pick(...point);s.hover=hits.find(h=>h?.kind)||null;}
  const click=I.clicked();if(click){const hit=game.r.pick(...click).find(h=>h?.kind);if(hit){s.target={x:hit.x,y:hit.y,thing:hit};s.flow.update(hit.x,hit.y);}else{const p=s.map.pick(...click);if(p&&s.map.walkable(p.cx,p.cy)){s.target={x:p.x,y:p.y};s.flow.update(p.x,p.y);}}}
  if(Math.hypot(vx,vy)>.05)s.target=null;
  if(s.target){const dd=Math.hypot(s.target.x-s.hero.x,s.target.y-s.hero.y);if(dd<14){if(s.target.thing)G.interact(s.target.thing);s.target=null;vx=vy=0;}else{const d=s.flow.dir(s.hero.x,s.hero.y,s.target.x,s.target.y);vx=d[0];vy=d[1];}}
  s.hero.vx=vx*145;s.hero.vy=vy*145;s.hero.update(dt,s.map);
 }
 const speed=Math.hypot(vx,vy);if(speed>.05)s.facing=Math.atan2(vy,vx);G.poseRig(s.rig,'idle',s.t,{dt,x:s.hero.x,y:s.hero.y,facing:s.facing||1.57,clip:speed>.05?'Walk_Loop':'Idle_Subtle'});
 for(const p of s.people)G.poseRig(p.rig,'idle',s.t+p.id,{dt,x:p.x,y:p.y,clip:p.id===5?'Sleeping':'Idle_Subtle'});
 s.nearest=s.things.filter(a=>a.kind!=='festival'||G.member.day===5).sort((a,b)=>Math.hypot(a.x-s.hero.x,a.y-s.hero.y)-Math.hypot(b.x-s.hero.x,b.y-s.hero.y))[0];if(s.nearest&&Math.hypot(s.nearest.x-s.hero.x,s.nearest.y-s.hero.y)>37)s.nearest=null;
 game.focus(s.hero.x,s.hero.y,10);
 if(!auto){if(I.pressed('interact')&&s.nearest)G.interact(s.nearest);if(I.pressed('more'))G.go('catalog');}
};
G.drawIsland=(r,s,auto=false)=>{
 s.map.drawFloor(r);s.map.queueWalls(r);for(const [x,y,label]of [[104,200,'Bungalow'],[300,129,'Reception'],[590,124,'Iron room'],[465,46,'Stillness deck'],[337,211,'Juice bar']]){r.shape('retreatHouse',x,y,0,{scale:label==='Reception'?.8:.7,pick:{kind:label==='Bungalow'?'bed':label==='Reception'?'tare':'bar',x,y,name:label}});r.textAt(x,y,48,label,P.ink,{align:'center',outline:false,shadow:null});}
 for(let i=0;i<22;i++){const a=i*2.4,x=352+Math.cos(a)*[300,250,290][i%3],y=204+Math.sin(a)*[144,150,133][i%3];if(x<100&&y<120)r.shape('pine',x,y,0,{scale:.8,mats:{w:'retreatWood'}});else if(i%3)G.plant(r,x,y,.8);else r.shape('rock',x,y,0,{scale:.7});}
 for(const m of s.things.filter(t=>t.kind==='mat')){const a=G.activities[m.id],unlocked=G.unlocked(a),color=G.disciplines.find(d=>d.id===a.discipline).color;const hi=(s.hover===m||s.nearest===m);r.shape('mat',m.x,m.y,0,{scale:.75,mats:{a:{color:unlocked?hi?'#e7d6a1':color:'#a4b1ad',pattern:'cloth'}},pick:m});
  if(m.id===G.suggestion()&&unlocked)r.textAt(m.x,m.y,17+Math.sin(s.t*2)*2,'★','#fff5c3',{outline:false,shadow:null});if(!unlocked)r.textAt(m.x,m.y,11,'Day '+a.day,'#667d7a',{outline:false,shadow:null});else if(hi)r.textAt(m.x,m.y,15,a.name,P.ink,{outline:false,shadow:null});
 }
 for(const p of s.people)G.drawRig(r,p.rig,p.x,p.y,0,{pick:p,outline:s.hover===p});
 r.shape('bench',198,192,0,{scale:.8});r.shape('table',337,228,0,{scale:.8});G.tare(r,s.hero.x-16,s.hero.y+8,.7);G.drawRig(r,s.rig,s.hero.x,s.hero.y,0,{xray:true});
 if(!auto){G.dayHUD(r);const n=s.hover||s.nearest;if(n){G.prompt(r,'interact',n.name);r.overlay(g=>{G.tag(g,n.kind==='mat'?G.activities[n.id].discipline:'Lumbar Island',12,r.H-42);});}G.prompt(r,'more','Activities',12,r.H-21);}
};
G.interact=thing=>{if(thing.kind==='mat'){const a=G.activities[thing.id];if(!G.unlocked(a)){G.speech('This mat opens on Day '+a.day+'. It is practicing patience.',{auto:3,modal:false});return;}G.startSession(a.id,1,G.member.ended?'free':'story');}
 else if(thing.kind==='bed')G.go('bungalow');else if(thing.kind==='person'){const bank=G.lines.regulars[Math.min(6,thing.id)],s=bank[(G.member.day-1)%bank.length];G.speech(s,{name:thing.name,portrait:thing.rig,auto:4,modal:false});}
 else if(thing.kind==='bar')G.speech(G.lines.regulars[1][(G.member.day-1)%5],{name:'Dennis',portrait:G.regularRig(1),auto:4,modal:false});
 else if(thing.kind==='festival')G.go('games');else G.speech(G.line('tips'),{auto:4,modal:false});};
G.scenes.island={view:'threequarter',camera:{zoom:false},pausable:true,enter(){G.context=null;G.sessionPhase=null;game.lights.enabled=true;game.lights.ambient=G.member.sessions>=2?.83:.99;G.music(G.member.sessions>=2?'dusk':'island');if(!G.island)G.island=G.makeIsland();game.follow(null);game.cam.bounds=v=>G.island.map.bounds(v);game.cam.smooth=.08;},update(dt){G.islandUpdate(G.island,dt);G.talk.update(dt);},draw(r){G.drawIsland(r,G.island);G.talk.draw(r);}};
let menu,discipline,tier;
function catalogMenu(){
 if(!discipline){menu=new G.Pills([...G.disciplines.map(d=>({label:d.id,value:()=>{const count=Object.values(G.activities).filter(a=>a.discipline===d.id&&G.unlocked(a)).length;return count+' / 3';},fn:()=>{discipline=d.id;catalogMenu();}})),['Back',()=>G.go(G.mode==='story'?'island':'title')]],{x:14,y:71,w:246,h:25,gap:7,back:()=>G.go(G.mode==='story'?'island':'title')});}
 else{const aa=Object.values(G.activities).filter(a=>a.discipline===discipline);menu=new G.Pills([...aa.map(a=>({label:()=>a.name,value:()=>G.unlocked(a,tier)?G.best(a.id,tier).stars?'★'.repeat(G.best(a.id,tier).stars):'New':tier===2?'2★ + Day 4':'Day '+a.day,disabled:!G.unlocked(a,tier),fn:()=>G.startSession(a.id,tier,G.mode)})),{label:()=>tier===1?'Tier 1 · Change to Tier 2':'Tier 2 · Change to Tier 1',fn:()=>{tier=tier===1?2:1;catalogMenu();}},['Back',()=>{discipline=null;catalogMenu();}]],{x:14,y:71,w:()=>Math.min(310,game.W-28),h:25,gap:7,back:()=>{discipline=null;catalogMenu();}});}
}
G.scenes.catalog={view:'brawler',camera:{zoom:false},pausable:true,enter(data){G.context=null;G.sessionPhase=null;discipline=data?.discipline||null;tier=1;catalogMenu();},update(dt){menu.update(dt);},draw(r){G.paper(r);G.header(r,G.mode==='story'?'Find your next mat':'Free Play',discipline||'A little of everything');if(!discipline){r.overlay(g=>{G.flower(g,r.W-58,110);G.text(g,'Gently,',r.W-61,145,{align:'center',color:P.muted});G.text(g,'or not at all.',r.W-61,158,{align:'center',color:P.muted});});}menu.draw(r);}};
})();
