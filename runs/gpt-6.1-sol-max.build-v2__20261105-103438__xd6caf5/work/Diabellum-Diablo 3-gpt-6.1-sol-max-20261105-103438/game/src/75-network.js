async function connectHub(){
  if(!SESSION)return false;
  const info=await ROOT.AIHub.connect({mode:'shared-world',seats:[1,4],card:true});if(!info)return false;
  net={info,started:false,starting:false,ended:false,finished:false,card:{left:10000,ready:[],asking:0},sent:0,received:0,lastP:0,lastS:0,lastE:0,lastM:0,lastC:0,personalSeat:0,rotation:0,events:[],commands:[],seq:0};
  const seed=Math.floor(ROOT.AIHub.rng('vigil')()*4294967295);W=newWorld(seed,{authority:info.isHost,session:true,me:info.server?null:info.me});
  for(const [i,p] of info.players.entries()){
    const h=newHero(Object.keys(DB.hero)[i%4],p.id,14,p.color);h.name=p.name;h.local=!info.server&&p.id===info.me;h.remote=!h.local;h.unlockedAll=true;h.slots=DB.hero[h.kind].skills.slice(0,6);h.resource=100;
    for(let s=0;s<8;s++){const item=rollItem(W,h,{slot:s,rarity:3});item.identified=true;h.gear[s]=item;}
    const relic=rollItem(W,h,{rarity:4,relic:Object.values(DB.relic).find(r=>r.hero===h.kind).id});relic.identified=true;h.gear[relic.slot]=relic;
    W.heroes.push(h);
  }
  startVigil(W,1,false);viewRigs.clear();game.go('play',null,{fade:0});
  ROOT.AIHub.on('card',card=>{net.card=card;});
  ROOT.AIHub.on('start',()=>{net.starting=true;audio.bell(140,.22);});
  ROOT.AIHub.on('message',(message,from)=>receiveMessage(message,from));
  ROOT.AIHub.on('time-up',()=>finishRound(false));
  ROOT.AIHub.on('leave',({id})=>{
    if(!W||net.ended)return;const before=W.heroes.length;W.heroes=W.heroes.filter(h=>h.id!==id);
    if(W.authority){const mul=(1+Math.max(0,before-2)*TUNE.coopLife)/(1+Math.max(0,before-1)*TUNE.coopLife);for(const f of W.foes){f.maxHp*=mul;f.hp*=mul;}}
    net.info.players=net.info.players.filter(p=>p.id!==id);if(!W.heroes.length)finishRound(false);
  });
  ROOT.AIHub.on('end',()=>{net.ended=true;net.started=false;audio.stop();game.audio.mute(true);for(const I of game.players)I.clear();});
  // A direct listener is essential when a software frame cannot consume a short Enter press.
  if(HAS_DOM)window.addEventListener('keydown',e=>{if(!net||net.ended||net.started||net.starting)return;if(e.code==='Enter'){ROOT.AIHub.answer('ready');e.preventDefault();}if(e.code==='KeyM'){ROOT.AIHub.answer('more');e.preventDefault();}});
  ROOT.AIHub.ready();return true;
}
function sendNet(data,o={}){if(!net||net.ended)return false;const ok=ROOT.AIHub.send(data,o);if(ok)net.sent++;return ok;}
function queueCommand(command){if(net&&!W.authority&&net.started&&!net.ended){net.commands.push({...command,q:++net.seq});if(net.commands.length>24)net.commands.splice(0,net.commands.length-24);}}
function networkStep(){
  if(!net||net.ended)return;
  const now=HAS_DOM?performance.now():game.real*1000;
  if(net.starting&&ROOT.AIHub.time()>=0){net.started=true;net.starting=false;audio.setCue('vigil');}
  if(!net.started){const I=game.input;if(I.pressed('confirm')||I.pressed('start'))ROOT.AIHub.answer('ready');if(I.pressed('s2')||I.pressed('map'))ROOT.AIHub.answer('more');const click=I.clicked();if(click){const cy=game.H/2+65;if(click[1]>=cy&&click[1]<cy+30)ROOT.AIHub.answer(click[0]<game.W/2?'ready':'more');}return;}
  if(W.authority){
    if(now-net.lastS>=125){net.lastS=now;
      const heroes=W.heroes.map(h=>[h.id,Math.round(h.x*10),Math.round(h.y*10),Math.round(h.hp),Math.round(h.resource),Math.round(h.maxHp),h.alive?1:0,h.evades,Math.round(h.facing*100)]);
      const list=W.foes.filter(f=>f.alive),foes=[];
      for(let i=0;i<Math.min(20,list.length);i++){const f=list[(net.rotation+i)%list.length];foes.push([f.id,Math.round(f.x*10),Math.round(f.y*10),Math.ceil(f.hp/f.maxHp*1000),f.phase,f.attack?1:0]);}
      net.rotation+=20;const payload=['s',ROOT.AIHub.time()|0,heroes,foes,Math.round(W.reckoning*100),W.kills,W.allies.map(a=>[a.id,Math.round(a.x*10),Math.round(a.y*10),Math.round(a.facing*100),Math.round(a.life*10)])];while(JSON.stringify(payload).length>1090&&foes.length)foes.pop();sendNet(payload,{reliable:false});
    }
    if(now-net.lastE>=200){net.lastE=now;const batch=net.events.splice(0,60);if(batch.length)sendNet(['e',batch]);}
    if(now-net.lastM>=300&&W.heroes.length){net.lastM=now;const h=W.heroes[net.personalSeat++%W.heroes.length];if(h.id!==net.info.me)sendNet(['m',{id:h.id,level:h.level,xp:h.xp,gear:h.gear,bag:h.bag,pennies:h.pennies,mats:h.mats,stats:h.stats,deathTimer:h.deathTimer}],{to:h.id});}
    if(W.ended&&W.results)finishRound(W.results.won);
  }else{
    const h=W.heroes.find(h=>h.id===net.info.me);if(!h)return;
    if(now-net.lastP>=84){net.lastP=now;sendNet(['p',ROOT.AIHub.time()|0,[Math.round(h.x*10),Math.round(h.y*10),Math.round(h.facing*100),h.dodge>0?1:0]],{to:net.info.host,reliable:false});}
    if(now-net.lastC>=170&&net.commands.length){net.lastC=now;sendNet(['c',net.commands.splice(0,12)],{to:net.info.host});}
    for(const f of W.foes)if(f.netTarget){const oldx=f.x,oldy=f.y;f.x=lerp(f.x,f.netTarget[0],.25);f.y=lerp(f.y,f.netTarget[1],.25);f.vx=(f.x-oldx)*15;f.vy=(f.y-oldy)*15;if(Math.hypot(f.vx,f.vy)>2)f.facing=Math.atan2(f.vy,f.vx);}
    for(const p of W.heroes)if(p.id!==net.info.me&&p.netTarget){p.vx=(p.netTarget[0]-p.x)*8;p.vy=(p.netTarget[1]-p.y)*8;p.x=lerp(p.x,p.netTarget[0],.3);p.y=lerp(p.y,p.netTarget[1],.3);}
  }
}
function receiveMessage(data,from){
  if(!net||net.ended||!Array.isArray(data))return;net.received++;
  if(W.authority){const h=W.heroes.find(h=>h.id===from);if(!h)return;
    if(data[0]==='p'){if(data[1]<(h.lastPacket??-Infinity))return;h.lastPacket=data[1];const p=data[2],ox=h.x,oy=h.y;h.x=clamp(p[0]/10,24,W.width-24);h.y=clamp(p[1]/10,24,W.height-24);h.facing=p[2]/100;h.dodge=p[3]?.15:0;h.vx=(h.x-ox)*12;h.vy=(h.y-oy)*12;}
    if(data[0]==='c')for(const c of data[1]){if(c.q<=(h.lastCommand||0))continue;h.lastCommand=c.q;if(c.action==='skill')castSkill(W,h,c.slot,c.aim);if(c.action==='evade')evade(W,h,c.dir);if(c.action==='potion')usePotion(W,h);if(c.action==='interact')interactNearest(W,h,null,.17);}
    return;
  }
  if(from!==net.info.host)return;
  if(data[0]==='s'){
    if(data[1]<(net.lastState??-Infinity))return;net.lastState=data[1];W.reckoning=data[4]/100;W.kills=data[5];
    for(const p of data[2]){const h=W.heroes.find(h=>h.id===p[0]);if(!h)continue;h.hp=p[3];h.resource=p[4];h.maxHp=p[5];h.alive=!!p[6];h.evades=p[7];if(h.id!==net.info.me){h.netTarget=[p[1]/10,p[2]/10];h.facing=p[8]/100;}}
    const allyIds=new Set((data[6]||[]).map(p=>p[0]));W.allies=W.allies.filter(a=>allyIds.has(a.id));for(const p of data[6]||[]){const a=W.allies.find(a=>a.id===p[0]);if(a){a.x=p[1]/10;a.y=p[2]/10;a.facing=p[3]/100;a.life=p[4]/10;}}
    for(const p of data[3]){const f=W.foes.find(f=>f.id===p[0]);if(!f)continue;f.netTarget=[p[1]/10,p[2]/10];f.hp=f.maxHp*p[3]/1000;f.phase=p[4];}
  }
  if(data[0]==='e')for(const e of data[1])applyNetEvent(e);
  if(data[0]==='m'){const d=data[1],h=W.heroes.find(h=>h.id===d.id);if(h)Object.assign(h,d);}
}
function applyNetEvent(e){
  if(e.kind==='spawn'&&!W.foes.some(f=>f.id===e.id)){const f=spawnFoe(W,e.kindName||e.foeKind,e.x,e.y,{boss:e.boss,elite:e.elite});f.id=e.id;f.hp=f.maxHp=e.hp;}
  else if(e.kind==='allySpawn'){if(!W.allies.some(a=>a.id===e.p.id))W.allies.push({...e.p,alive:true});}
  else if(e.kind==='allyEnd'){W.allies=W.allies.filter(a=>a.id!==e.id);}
  else if(e.kind==='hazard'){W.hazards.push({...e.p,src:[...W.foes,...W.heroes].find(u=>u.id===e.p.src)});}
  else if(e.kind==='kill'){
    const f=W.foes.find(f=>f.id===e.id);if(f){f.alive=false;const body=new E.Body({x:e.x,y:e.y,z:3,r:f.r,friction:2.3,bounce:.4});Object.assign(body,{id:f.id,kind:f.kind,boss:f.boss,facing:f.facing,age:0,roll:0,used:false});body.push(Math.cos(e.angle)*e.force,Math.sin(e.angle)*e.force,140);W.corpses.push(body);W.foes=W.foes.filter(u=>u.id!==f.id);}
  }else if(e.kind==='hit'){const f=[...W.foes,...W.heroes,...W.allies].find(u=>u.id===e.id);if(f){f.flash=.15;addNumber(W,f,e.amount,e.crit?GOLD:IVORY);}onWorldEvent(e);}
  else if(e.kind==='fx'){W.fx.push({id:W.uid++,verb:e.verb,t:0,life:e.p.life||.5,...e.p});}
  else if(e.kind==='cast'&&e.id!==net.info.me){const h=W.heroes.find(h=>h.id===e.id);if(h){const s=tunedSkill(h,e.sid);h.facing=angle(h,e.aim);h.attack={sid:e.sid,s,aim:e.aim,a:h.facing,elapsed:0,wind:s.wind,total:.6,struck:true,tick:0};}}
  else if(e.kind==='drop'&&!W.drops.some(d=>d.id===e.id))W.drops.push({id:e.id,type:'item',x:e.x,y:e.y,z:3,owner:e.owner,item:e.item});
  else if(e.kind==='phase'){const f=W.foes.find(f=>f.id===e.id);if(f)f.phase=e.phase;onWorldEvent(e);}
  else if(['taunt','notice','level','chord','bossDeath','warden','blessing'].includes(e.kind))onWorldEvent(e);
}
function finishRound(won){
  if(!net||net.ended||net.finished||!W.authority)return;net.finished=true;
  const heroes=W.heroes.filter(h=>net.info.players.some(p=>p.id===h.id)),total=heroes.reduce((n,h)=>n+h.stats.warden,0)||1,scores={},stats={};
  for(const h of heroes){scores[h.id]=Math.max(0,Math.floor(10*h.stats.reckoning+300*h.stats.warden/total+50*h.stats.revives-25*h.stats.deaths));stats[h.id]={kills:h.stats.kills,deaths:h.stats.deaths,revives:h.stats.revives,'objects broken':h.stats.broken};}
  const sorted=heroes.map(h=>h.id).sort((a,b)=>scores[b]-scores[a]),standings=[];for(const id of sorted){const last=standings.at(-1);if(last&&scores[last[0]]===scores[id])last.push(id);else standings.push([id]);}
  const awards=[];for(const [key,title] of [['damage','Bell of the Ball'],['broken','Sacrilegious'],['revives','Good Samaritan'],['deaths','Frequent Flyer']]){const h=[...heroes].sort((a,b)=>b.stats[key]-a.stats[key])[0];if(h)awards.push({id:h.id,title,detail:String(Math.round(h.stats[key]))});}
  ROOT.AIHub.finish({standings,scores,won:!!won,stats,awards});
}
function drawHubCard(g,r){
  if(!net)return;px.blend(g,.88,'normal',()=>px.rect(g,0,0,r.W,r.H,INK));const ww=Math.min(404,r.W-32),x=(r.W-ww)/2,y=r.H/2-109;ornate(g,x,y,ww,218,TEAL);
  E.font.title(g,TITLE.toUpperCase(),r.W/2,y+13,{align:'center',scale:3,colors:[IVORY,GOLD,'#917649'],depth:1});text(g,'FILL THE RECKONING. SLAY THE WARDEN.',r.W/2,y+49,TEAL,{align:'center'});
  net.info.players.forEach((p,i)=>text(g,(net.card.ready?.includes(p.id)?'★ ':'○ ')+p.name,x+26,y+68+i*14,p.color));
  text(g,'WASD / stick move • '+prompt('s0')+' attack',r.W/2,y+133,IVORY,{align:'center'});text(g,prompt('evade')+' evade • '+prompt('potion')+' potion • six skills',r.W/2,y+146,MUTED,{align:'center'});
  const cy=r.H/2+65;smallBox(g,x+22,cy,ww/2-28,27,GOLD);text(g,'ENTER / ✕  READY',x+ww/4+8,cy+10,IVORY,{align:'center'});smallBox(g,r.W/2+6,cy,ww/2-28,27,TEAL);text(g,'M / △  MORE TIME',r.W/2+ww/4-8,cy+10,IVORY,{align:'center'});
  const left=net.starting?Math.ceil(-ROOT.AIHub.time()/1000):net.card.left===null?'WAIT':Math.ceil(net.card.left/1000);text(g,net.starting?'THE WATCH BEGINS IN '+left:net.card.paused?'THE PARISH ASKS FOR MORE TIME':'THE WATCH BEGINS • '+left,r.W/2,y+202,GOLD,{align:'center'});
}
