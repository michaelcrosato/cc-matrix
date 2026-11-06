(() => {
const E=My3D2dge,G=window.GAME,{text,box}=G.OpArt;
function make(game,R){let map,hero,look,people=[],flow,walk=null,talking=null,talk,line=0,focus=null;
 const ids=['agnes','slide','tam','harrow','ilse','oyelaran','yusuf','perpetua','hollis','percy','clementine'];
 function enter(){
  game.lights.enabled=true;game.lights.ambient=.65;game.setView('threequarter');game.saves.canSave=true;
  const rows=Array.from({length:18},(_,y)=>y===0||y===17?'######################':'#....................#');
  map=new E.TileMap({rows,legend:{'#':1},types:{1:{h:34,top:'#789a95',side:'#416b70',face:'plaster',cut:true,cutH:9}},floorTex:(x,y)=>{const c=(Math.floor(x/16)+Math.floor(y/16))%2;return E.hex(c?'#5b7c7d':'#638281');},outside:'#153d49'});
  hero=new E.Body({x:270,y:241,r:5});look=G.makeRig(R.caseId>=7&&R.caseId<=9?'sokolova':'vale');flow=new E.FlowField(map);walk=null;talking=null;line=0;
  people=[];const saved=R.save.cleared||[];
  for(const id of saved){if(id<1||id>11)continue;const i=id-1,x=61+(i%4)*65,y=61+Math.floor(i/4)*65;people.push({id:ids[i],name:G.cases[i].patient,x,y,tx:x+25,ty:y+16,caseId:id,rig:G.makeRig(id===6?'oyelaran':'patient',true),patient:true,seen:false});map.solid('hospitalBed',x,y,0);}
  people.push({id:'quill',name:'Nurse Quill',x:92,y:236,tx:104,ty:242,rig:G.makeRig('quill'),seen:false},{id:'odalys',name:'Odalys',x:174,y:236,tx:184,ty:244,rig:G.makeRig('odalys'),seen:false});
  talk=new E.Dialog(game,{speed:40,width:Math.min(376,game.W-20),voice:(ch,i)=>G.Sound.babble(talking?.id==='quill'?'quill':talking?.id==='odalys'?'odalys':'patient',ch,i)});
  game.cam.bounds=v=>map.bounds(v);game.cam.smooth=.1;game.focus(hero.x,hero.y,12);G.Sound.music('ward');
  R.persist();game.saves.autosave();
 }
 function say(npc){talking=npc;npc.seen=true;const lines=G.wardLines[npc.id]||['I can feel the room again. Thank you, Doctor.'];talk.say(lines,{name:npc.name,portrait:(g,x,y,size)=>{g.drawImage(G.Portraits.get(npc.id==='quill'?'quill':npc.id==='odalys'?'odalys':'patient'),x,y,size,size*128/112);E.px.reset(g);},onDone:()=>talking=null});}
 function update(dt){
  if(talk?.update(dt)){look.update(dt,{x:hero.x,y:hero.y,z:hero.z,pose:'hips'});return;}
  const I=game.input,dir=I.move(),click=I.clicked();focus=null;
  const ptr=I.pointer();if(ptr&&I.lastDevice==='mouse'){
   const gp=game.mouseGround();if(gp){const n=people.find(n=>Math.hypot(n.x-gp[0],n.y-gp[1])<24);if(n)focus=n;else if(Math.hypot(294-gp[0],241-gp[1])<24)focus={door:true,name:'NEXT CASE',tx:286,ty:237};}
  }
  if(click){const gp=game.mouseGround();if(gp){walk=focus?{x:focus.tx,y:focus.ty,npc:focus}:{x:gp[0],y:gp[1]};flow.update(walk.x,walk.y);}}
  let d=game.view.screenDirToGround(dir[0],dir[1]);if(Math.hypot(...dir)>.1)walk=null;
  if(walk){const delta=Math.hypot(walk.x-hero.x,walk.y-hero.y);if(delta<9){const n=walk.npc;walk=null;if(n?.door){next();return;}if(n)say(n);}else d=flow.dir(hero.x,hero.y,walk.x,walk.y);}
  hero.vx=d[0]*88;hero.vy=d[1]*88;hero.update(dt,map);if(Math.hypot(hero.vx,hero.vy)>1)hero.facing=Math.atan2(hero.vy,hero.vx);
  look.update(dt,{x:hero.x,y:hero.y,z:hero.z,vx:hero.vx,vy:hero.vy,facing:hero.facing||0,roll:R.caseId>=7&&R.caseId<=9?Math.sin(game.time)*.035:0});
  for(const n of people)n.rig.update(dt,{x:n.x,y:n.y,z:n.patient?15:0,facing:Math.PI/2,down:n.patient?.85:0,pose:n.id==='quill'?'knit':undefined});
  const near=people.filter(n=>Math.hypot(hero.x-n.tx,hero.y-n.ty)<30).sort((a,b)=>Math.hypot(hero.x-a.tx,hero.y-a.ty)-Math.hypot(hero.x-b.tx,hero.y-b.ty))[0];
  if(!focus)focus=near;
  if(I.pressed('interact')||I.pressed('confirm')){if(Math.hypot(hero.x-286,hero.y-237)<35)next();else if(near)say(near);}
  game.focus(hero.x,hero.y,12);
 }
 function next(){if(people.every(n=>n.seen))R.morale=10;game.go('story',{id:'pre'+R.save.next,next:'chart',caseId:R.save.next});}
 function draw(r){map.drawFloor(r);map.queueWalls(r);
  for(const n of people){if(n.patient){r.shape('hospitalBed',n.x,n.y,0);r.shape('ivStand',n.x-17,n.y-8,0);r.shape('vitalsMonitor',n.x+19,n.y-9,0,{scale:.65,light:true});}r.shadow(n.x,n.y,5);r.actor(n.x,n.y,n.patient?15:0,(g,x,y)=>n.rig.draw(g,x,y,E.charView(r.view)),{outline:focus===n?'#e4eab7':undefined});}
  r.shape('ward-furniture:desk-corner',150,240,0,{facing:0,scale:1.1});r.shape('ward-furniture:chair-desk',133,247,0);r.shape('ward-furniture:lamp-round-table',154,241,17,{light:true});r.shape('lightbox',179,222,0,{facing:0,light:true});r.shape('vendingMachine',38,234,0);r.shape('crashCart',275,222,0);
  for(let i=0;i<3;i++){r.prop('window',80+i*78,25,29,{size:1.2,light:true});game.lights.add(100+i*80,110,45,95,.45,{color:'#a8d9c6'});}
  r.actor(hero.x,hero.y,hero.z,(g,x,y)=>look.draw(g,x,y,E.charView(r.view)),{xray:true});
  const door=r.w(295,240,20);r.overlay(g=>{box(g,door[0]-35,door[1]-16,70,16,'#92d4b1');text(g,'NEXT CASE >',door[0],door[1]-11,'#d4efba',{align:'center'});box(g,5,5,130,24);text(g,R.caseId>=7&&R.caseId<=9?'SHIP\'S WARD':'WARD THREE',12,11,'#e6edd1',{scale:2});text(g,'A moment between emergencies.',7,r.H-23,'#b7d9c7');text(g,game.input.label('interact')+' TALK / NEXT CASE',7,r.H-11,'#e3e7ba');if(focus){text(g,focus.name,r.W/2,20,'#fff0bd',{align:'center'});}});
  talk.draw(r);
 }
 return {pausable:true,view:'threequarter',camera:{zoom:false,wheel:false},enter,update,draw,exit(){game.cam.bounds=null;game.lights.enabled=false;game.saves.canSave=false;},state:()=>({hero,people,focus,walk}),next};
}
G.Ward={make};
})();
