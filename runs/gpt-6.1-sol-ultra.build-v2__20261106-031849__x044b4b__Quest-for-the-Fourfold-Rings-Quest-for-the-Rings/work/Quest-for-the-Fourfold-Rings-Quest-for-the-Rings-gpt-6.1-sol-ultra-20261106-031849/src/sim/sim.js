(function(G){
  'use strict';
  const C=G.RingContent, E=G.My3D2dge, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const runtime=new WeakMap(), randomProviders=new WeakMap(), ZERO=()=>({mx:0,my:0,ax:0,ay:0,primary:false,power:false,dodge:false,interact:false,ping:false});
  function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
  function random(w,label){const provider=randomProviders.get(w);if(provider)return provider(label)();let x=w.random[label]||(w.random[label]=hash(w.seed+':'+label)||1);x^=x<<13;x^=x>>>17;x^=x<<5;w.random[label]=x>>>0;return (x>>>0)/4294967296;}
  function emit(w,type,data={}){const e={id:++w.eventId,tick:w.tick,type,...data};w.events.push(e);if(w.events.length>80)w.events.shift();if(['room-enter','ring-pickup','ring-pass','ring-secured','room-complete','seal-bound','victory','failure','retry','cache'].includes(type))w.history.push(e);return e;}
  function hero(id,classId){return {id,classId,x:0,y:0,z:0,vx:0,vy:0,facing:-Math.PI/2,hp:5,maxHp:5,down:false,phase:0,cloak:0,guard:0,dodge:0,hurt:0,attack:null,carry:false,powerCd:0,primaryCd:0,dodgeCd:0,revive:0,ward:0,pose:'',ai:id===2,owner:id===1?'local':null,device:id===1?'keyboard':'ai',aiState:'follow',stuck:0,safe:{x:0,y:0}};}
  function create(options={}){
    const w={version:3,seed:options.seed||'fourfold-dawn',random:{},time:0,roomTime:0,tick:0,epoch:0,eventId:0,events:[],history:[],mode:'courtyard',roomId:'courtyard',site:null,roomIndex:0,dread:0,rings:[false,false,false,false],caches:{cacheCrystal:false,cacheShift:false},shortcuts:[],heroes:[hero(1,options.classes?.[0]||'warrior'),hero(2,options.classes?.[1]||'wizard')],enemies:[],projectiles:[],hazards:[],lures:[],stations:[],shift:0,reveal:0,contactReveal:[],director:{budget:0,next:0,event:'none',reason:'Teaching sanctuary',count:0},tuning:C.defaults(),stats:{hits:0,revives:0,passes:0,retries:0,rooms:0,steps:0},assisted:false,invulnerable:false,checkpointRequested:0,cacheWard:false,finalBeat:'watch',bound:0,ping:0,transition:0,announcement:'',announcementUntil:0};
    if(options.humans)w.heroes.forEach((h,i)=>{h.ai=!options.humans.includes(i);h.owner=h.ai?null:'seat'+i;h.device=h.ai?'ai':'remote';});
    enterRoom(w,'courtyard');return w;
  }
  const classMoves={warrior:'slash',wizard:'cast',phantom:'rising',changeling:'throw'};
  function attackSpec(classId,recovery){const name=classMoves[classId]||'slash';return {name,hitAt:.35,...E.MOVES[name],wind:.15,active:.18,recover:recovery,reach:classId==='warrior'?26:8,...(classId==='warrior'?{}:{blade:0})};}
  function getRT(w){let r=runtime.get(w);if(!r){r={attacks:w.heroes.map(h=>new E.Attack(attackSpec(h.classId,w.tuning.recovery))),pending:[null,null],ai:[{},{}],enemyPaths:new Map()};runtime.set(w,r);}return r;}
  function tile(w,x,y,shift=w.shift){const r=C.rooms[w.roomId];if(!r)return '#';const c=r.rows[Math.floor(y/16)]?.[Math.floor(x/16)]||'#';if(c==='s')return shift===0?'w':'.';if(c==='t')return shift===1?'w':'.';return c;}
  function solid(w,x,y,phase=false,shift=w.shift){const c=tile(w,x,y,shift);return c==='#'||(c==='w'||c==='c')&&!phase;}
  function walkable(w,x,y,r=4.2,phase=false,shift=w.shift){
    return [[-r,-r],[r,-r],[-r,r],[r,r],[0,0]].every(([dx,dy])=>!solid(w,x+dx,y+dy,phase,shift)&&tile(w,x+dx,y+dy,shift)!=='~');
  }
  function safe(w,x,y,phase=false){return walkable(w,x,y,4.3,phase)&&danger(w,x,y)<.5;}
  function nearestSafe(w,p,shift=w.shift,max=40){
    const cx=Math.floor(p.x/16),cy=Math.floor(p.y/16);let best=null,bestD=1e9;
    for(let radius=0;radius<max;radius++){
      for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
        if(radius&&Math.abs(x-cx)!==radius&&Math.abs(y-cy)!==radius)continue;
        const q={x:x*16+8,y:y*16+8};if(!walkable(w,q.x,q.y,4.5,false,shift)||danger(w,q.x,q.y)>.2)continue;
        const dist=d(q,p);if(dist<bestD){best=q;bestD=dist;}
      }if(best)return best;
    }return {...C.rooms[w.roomId].fallback};
  }
  function move(w,h,dx,dy,phase=false){
    const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3));let hit=false;
    for(let i=0;i<n;i++){
      if(walkable(w,h.x+dx/n,h.y,4.1,phase))h.x+=dx/n;else hit=true;
      if(walkable(w,h.x,h.y+dy/n,4.1,phase))h.y+=dy/n;else hit=true;
    }return hit;
  }
  function line(w,a,b,phase=false){const dist=d(a,b),n=Math.max(1,Math.ceil(dist/5));for(let i=1;i<n;i++){const t=i/n;if(solid(w,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,phase))return false;}return true;}
  function path(w,a,b,opts={}){
    const room=C.rooms[w.roomId],W=room.rows[0].length,H=room.rows.length;
    let sx=clamp(Math.floor(a.x/16),1,W-2),sy=clamp(Math.floor(a.y/16),1,H-2),tx=clamp(Math.floor(b.x/16),1,W-2),ty=clamp(Math.floor(b.y/16),1,H-2);
    if(!walkable(w,tx*16+8,ty*16+8,4,opts.phase)){const q=nearestSafe(w,b);tx=Math.floor(q.x/16);ty=Math.floor(q.y/16);}
    const start=sy*W+sx,target=ty*W+tx,prev=new Int16Array(W*H).fill(-1),cost=new Float64Array(W*H).fill(Infinity),open=[start];cost[start]=0;prev[start]=start;
    while(open.length){let k=0;for(let j=1;j<open.length;j++)if(cost[open[j]]<cost[open[k]])k=j;const at=open.splice(k,1)[0];if(at===target)break;const x=at%W,y=Math.floor(at/W);
      for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){const nx=x+dx,ny=y+dy;if(nx<1||ny<1||nx>=W-1||ny>=H-1)continue;const q=ny*W+nx,xx=nx*16+8,yy=ny*16+8;if(!walkable(w,xx,yy,4,opts.phase))continue;const risk=opts.ignoreDanger?0:danger(w,xx,yy);const nc=cost[at]+1+risk*16;if(nc>=cost[q])continue;cost[q]=nc;prev[q]=at;if(!open.includes(q))open.push(q);}
    }
    if(prev[target]<0)return [];
    const arr=[];let t=target;while(t!==start){arr.push({x:(t%W)*16+8,y:Math.floor(t/W)*16+8});t=prev[t];}return arr.reverse();
  }
  function danger(w,x,y){
    if(tile(w,x,y)==='~')return 10;
    let v=0;for(const h of w.hazards){if(x>=h.x-5&&x<=h.x+h.w+5&&y>=h.y-5&&y<=h.y+h.h+5)v=Math.max(v,h.phase==='active'?1:h.phase==='warn'?.7:0);}
    for(const e of w.enemies){if(e.kind==='spider'&&e.wind>0&&e.target&&d({x,y},e.target)<22)v=Math.max(v,.9);if(e.kind==='dragon')continue;if(!e.stun&&e.state==='wind'&&d({x,y},e)<26)v=Math.max(v,.7);}
    return v;
  }
  function announce(w,text,seconds=5){w.announcement=text;w.announcementUntil=w.time+seconds;}
  function enterRoom(w,id){
    const r=C.rooms[id];if(!r)throw Error('Unknown room '+id);w.roomId=id;w.room=r;w.mode=id==='courtyard'?'courtyard':'room';w.roomTime=0;w.epoch++;w.shift=0;w.reveal=r.family==='crystal'?2.5:0;w.contactReveal=[];w.projectiles=[];w.lures=[];w.transition=.8;w.ping=0;w.stations=(r.stations||[]).map((p,i)=>({...p,index:i,active:false,progress:0}));w.finalBeat='watch';w.bound=0;
    w.ring=r.ring?{...r.ring,carrier:0,picked:false,secured:false,lastSafe:{...r.ring}}:null;
    w.hazards=r.hazards.map(h=>({...h,phase:'idle',progress:0}));w.shiftOffset=0;w.forcedShiftAt=0;w.shiftWarning=false;
    w.enemies=r.enemies.map((e,i)=>spawnSpec(w,e,id+'-'+i));
    w.director={budget:Math.min(4,2+Math.floor(w.dread/3)),next:14,event:'none',reason:'Teaching grace',count:0};
    runtime.delete(w);
    w.heroes.forEach((h,i)=>{const p=nearestSafe(w,{x:r.entry.x+(i?15:0),y:r.entry.y});Object.assign(h,{...p,z:0,vx:0,vy:0,hp:Math.max(3,h.hp),down:false,phase:0,cloak:0,guard:0,dodge:0,hurt:1.5,attack:null,carry:false,powerCd:0,primaryCd:0,dodgeCd:0,revive:0,pose:'',safe:{...p},stuck:0,ward:w.cacheWard?1:h.ward});});
    w.cacheWard=false;emit(w,'room-enter',{room:id});announce(w,r.fiction,6);w.checkpointRequested++;
  }
  function spawnSpec(w,e,id){return {...e,id,z:0,vx:0,vy:0,facing:Math.PI/2,hp:e.kind==='dragon'?999:e.kind==='fighter'||e.kind==='fire'?2:999,stun:0,resist:0,wind:0,attack:0,cooldown:2.5+(hash(id)%20)/10,state:'idle',target:null,life:e.kind==='echo'?12:9999};}
  function siteAvailable(w,id){const s=C.sites.find(s=>s.id===id);if(!s)return false;if(s.final)return w.rings.every(Boolean);if(s.cache)return w.rings[0]&&!w.caches[id];if(w.rings[s.index])return false;return s.index===0||w.rings[0];}
  function enterSite(w,id){
    if(w.mode!=='board'||!siteAvailable(w,id))return false;const s=C.sites.find(s=>s.id===id);w.site=id;w.roomIndex=0;w.dread=Math.min(6,w.dread+1);enterRoom(w,s.rooms[0]);emit(w,'dread',{value:w.dread,reason:'entry'});return true;
  }
  function board(w,abandon=false){
    if(w.mode==='victory')return false;
    if(abandon)emit(w,'abandon',{room:w.roomId});w.mode='board';w.epoch++;w.site=null;w.roomIndex=0;w.ring=null;w.projectiles=[];w.lures=[];w.enemies=[];w.heroes.forEach(h=>{if(h.down||h.hp<=0)h.hp=3;h.carry=false;h.down=false;h.phase=0;h.cloak=0;h.attack=null;});runtime.delete(w);announce(w,C.dialogue.board,6);w.checkpointRequested++;return true;
  }
  function complete(w){
    if(w.transition>0||w.mode!=='room'&&w.mode!=='courtyard')return false;
    const r=C.rooms[w.roomId];
    if(w.mode==='courtyard'){board(w);return true;}
    if(w.roomId==='final'){
      if(w.bound!==4||w.finalBeat!=='escape'||w.heroes.some(h=>!h.down&&d(h,r.exit)>38))return false;
      w.mode='victory';w.epoch++;w.heroes.forEach(h=>{h.down=false;h.hp=5;h.pose='cheer';});w.projectiles=[];w.enemies=[];emit(w,'victory',{rings:4});announce(w,C.dialogue.victory,30);w.checkpointRequested++;return true;
    }
    if(r.ring&&(!w.ring?.carrier||w.heroes[w.ring.carrier-1].down||d(w.heroes[w.ring.carrier-1],r.exit)>24))return false;
    if(w.ring?.secured)return false;
    if(w.ring)w.ring.secured=true;
    emit(w,'room-complete',{room:w.roomId});w.stats.rooms++;
    if(r.cache){
      if(!w.caches[w.site]){w.caches[w.site]=true;if(r.reward==='ward'){w.cacheWard=true;w.heroes.forEach(h=>h.ward=1);}if(r.reward==='heal')w.heroes.forEach(h=>{h.hp=5;h.down=false;});emit(w,'cache',{site:w.site,reward:r.reward});}board(w);return true;
    }
    const s=C.sites.find(s=>s.id===w.site);
    if(w.roomIndex+1<s.rooms.length){w.roomIndex++;enterRoom(w,s.rooms[w.roomIndex]);return true;}
    if(!w.rings[s.index]){w.rings[s.index]=true;w.shortcuts.push(s.shortcut);emit(w,'ring-secured',{site:w.site,index:s.index});}
    board(w);announce(w,C.dialogue.secured+' '+s.shortcut+' is open.',7);return true;
  }
  function fail(w){if(w.mode!=='room')return;w.mode='failed';w.projectiles=[];emit(w,'failure',{room:w.roomId});announce(w,'Both lights have fallen. The rings already secured remain yours.',30);}
  function retry(w){if(w.mode!=='failed')return false;w.dread=Math.min(6,w.dread+1);w.stats.retries++;w.heroes.forEach(h=>h.hp=5);const id=w.roomId;enterRoom(w,id);emit(w,'retry',{room:id,dread:w.dread});return true;}
  function changeHero(w,seat,classId){if(!C.heroes[classId]||!['board','courtyard'].includes(w.mode))return false;const h=w.heroes[seat];if(!h)return false;h.classId=classId;h.powerCd=0;h.phase=0;h.cloak=0;runtime.delete(w);w.checkpointRequested++;emit(w,'hero-change',{hero:h.id,classId});return true;}
  function hurt(w,h,amount,source){
    if(h.down||h.hurt>0||h.dodge>.08||w.invulnerable||w.transition>0)return false;
    if(h.guard>0&&source){const a=Math.atan2(source.y-h.y,source.x-h.x);if(Math.cos(a-h.facing)>.1){emit(w,'deflect',{hero:h.id,x:h.x,y:h.y});h.hurt=.25;return false;}}
    if(h.ward){h.ward--;h.hurt=1;emit(w,'ward-block',{hero:h.id,x:h.x,y:h.y});return false;}
    h.hp=Math.max(0,h.hp-amount);h.hurt=1.4;h.revive=0;w.stats.hits++;emit(w,'hurt',{hero:h.id,x:h.x,y:h.y,amount});
    if(h.hp<=0){h.down=true;h.pose='down';h.phase=0;getRT(w).attacks[h.id-1].cancel();h.attack=null;
      if(w.ring?.carrier===h.id){const p=nearestSafe(w,h.safe||h);Object.assign(w.ring,{...p,carrier:0,lastSafe:{...p}});h.carry=false;emit(w,'ring-drop',{x:p.x,y:p.y});}
      emit(w,'down',{hero:h.id,x:h.x,y:h.y});announce(w,C.dialogue.down);}
    return true;
  }
  function stun(w,e,duration,source){
    if(e.kind==='dragon'){emit(w,'deflect',{x:e.x,y:e.y,enemy:e.id});return;}
    const large=['spider','nightmare','echo'].includes(e.kind);e.stun=Math.max(e.stun,duration*(large?(e.resist>0?.3:.7):1));e.resist=5;e.wind=0;e.attack=0;e.state='stun';emit(w,'stun',{x:e.x,y:e.y,enemy:e.id,source});
  }
  function primary(w,h,a){
    if(h.primaryCd>0||h.down)return;
    const rt=getRT(w),attack=rt.attacks[h.id-1];attack.spec.recover=w.tuning.recovery;
    if(!attack.start())return;h.primaryCd=.15+.18+w.tuning.recovery;h.pose='cast';rt.pending[h.id-1]=h.classId;emit(w,'attack-wind',{hero:h.id,classId:h.classId,x:h.x,y:h.y});
  }
  function releasePrimary(w,h,classId){
    emit(w,'attack',{hero:h.id,classId,x:h.x,y:h.y});
    if(classId==='wizard'){w.projectiles.push({id:++w.eventId,team:'hero',owner:h.id,x:h.x+Math.cos(h.facing)*9,y:h.y+Math.sin(h.facing)*9,z:10,vx:Math.cos(h.facing)*155,vy:Math.sin(h.facing)*155,life:1.4,kind:'rune',r:3});}
    if(classId==='phantom'){w.reveal=Math.max(w.reveal,4.5);for(const e of w.enemies)if(d(e,h)<58)stun(w,e,.9,h.id);emit(w,'reveal',{hero:h.id,x:h.x,y:h.y});}
    if(classId==='changeling'){w.lures=w.lures.filter(l=>l.owner!==h.id);const p=nearestSafe(w,{x:h.x+Math.cos(h.facing)*45,y:h.y+Math.sin(h.facing)*45});w.lures.push({...p,owner:h.id,life:4.5});emit(w,'lure',{hero:h.id,x:p.x,y:p.y});}
  }
  function power(w,h){
    if(h.powerCd>0||h.down)return false;h.powerCd=w.tuning.powerCooldown;const duration=w.tuning.powerDuration;
    if(h.classId==='warrior')h.guard=duration;
    if(h.classId==='wizard'){h.wardTime=duration;emit(w,'ward',{hero:h.id,x:h.x,y:h.y});}
    if(h.classId==='phantom'){h.phase=duration;h.phaseSafe={...h.safe};w.reveal=4;}
    if(h.classId==='changeling')h.cloak=duration+1;
    emit(w,'power',{hero:h.id,classId:h.classId,x:h.x,y:h.y});return true;
  }
  function context(w,h){
    if(h.down)return null;const other=w.heroes.find(p=>p.id!==h.id);
    if(other?.down&&d(h,other)<25&&line(w,h,other))return {type:'revive',target:other.id,label:'Revive '+C.heroes[other.classId].name,progress:h.revive/w.tuning.reviveTime};
    if(w.roomId==='final'){
      const st=w.stations.find(s=>!s.active&&d(h,s)<22);
      if(st&&w.finalBeat==='bind')return {type:'station',target:st.index,label:'Bind the '+['stone','glass','ember','clock'][st.index]+' seal',progress:st.progress/1.1};
    }
    const r=C.rooms[w.roomId];
    if(r&&d(h,r.exit)<23&&(!r.ring||w.ring?.carrier===h.id)&& (w.roomId!=='final'||w.finalBeat==='escape'&&w.heroes.every(p=>p.down||d(p,r.exit)<38)))return {type:'exit',label:w.mode==='courtyard'?'Unfold the expedition map':w.roomId==='final'?'Escape the breaking shadow':r.ring?'Carry the ring into the light':'Enter the next chamber'};
    if(w.ring&&!w.ring.carrier&&!w.ring.secured&&d(h,w.ring)<22)return {type:'pickup',label:r.cache?'Take the cache ember':r.practice?'Take the oath-ring':'Take the stolen ring'};
    if(w.ring?.carrier===h.id&&other&&!other.down&&d(h,other)<24&&line(w,h,other))return {type:'pass',target:other.id,label:'Pass ring · partner must hold context',progress:0};
    return null;
  }
  function interact(w,h,cmd,commands,dt){
    const c=context(w,h);h.context=c;
    if(!cmd.interact||!c){h.revive=0;return;}
    if(c.type==='revive'){const other=w.heroes.find(p=>p.id===c.target);h.pose='kneel';h.revive+=dt;if(h.revive>=w.tuning.reviveTime){other.down=false;other.hp=3;other.hurt=2.5;other.pose='';h.revive=0;w.director.next=Math.max(w.director.next,w.roomTime+5);w.stats.revives++;emit(w,'revive',{hero:other.id,x:other.x,y:other.y});announce(w,C.dialogue.revive);}}
    if(c.type==='pickup'&&w.time-(h.lastInteract||-999)>.3){w.ring.carrier=h.id;w.ring.picked=true;h.carry=true;h.lastInteract=w.time;emit(w,'ring-pickup',{hero:h.id,x:h.x,y:h.y,room:w.roomId});announce(w,C.dialogue.ring);}
    if(c.type==='pass'&&w.time-(w.lastPass||-999)>.8){const other=w.heroes.find(p=>p.id===c.target),oc=commands[other.id-1];if(oc?.interact||other.ai){h.carry=false;other.carry=true;w.ring.carrier=other.id;w.lastPass=w.time;w.stats.passes++;emit(w,'ring-pass',{hero:h.id,to:other.id,x:h.x,y:h.y});}}
    if(c.type==='station'){const st=w.stations[c.target];if(!st.active){st.progress+=dt;if(st.progress>=1.1){st.active=true;st.progress=1.1;w.bound=w.stations.filter(s=>s.active).length;emit(w,'seal-bound',{index:st.index,x:st.x,y:st.y});w.director.next=Math.max(w.director.next,w.roomTime+3);w.heroes.forEach(p=>{if(!p.down)p.hurt=2;});if(w.bound===4){w.finalBeat='escape';w.projectiles=[];w.hazards.forEach(h=>h.phase='idle');announce(w,C.dialogue.bound,10);emit(w,'dragon-bound',{x:200,y:56});}}}}
    if(c.type==='exit'&&w.time-(h.lastInteract||-999)>.4){h.lastInteract=w.time;complete(w);}
  }
  function wardAt(w,x,y){return w.heroes.some(h=>!h.down&&h.wardTime>0&&Math.hypot(h.x-x,h.y-y)<42);}
  function updateHazards(w,dt){
    const room=C.rooms[w.roomId],t=w.roomTime;
    for(const h of w.hazards){const period=h.period||10,phase=((t+(h.offset||0))%period),warn=w.tuning.telegraph;const prev=h.phase;h.phase=phase<warn?'warn':phase<warn+h.duration?'active':'idle';h.progress=h.phase==='warn'?phase/warn:h.phase==='active'?(phase-warn)/h.duration:0;if(w.finalBeat==='escape'&&w.roomId==='final')h.phase='idle';if(h.forcedUntil>t)h.phase=h.forcedUntil-t>h.duration?'warn':'active';if(prev!==h.phase&&h.phase==='active')emit(w,'flame',{x:h.x+h.w/2,y:h.y+h.h/2});}
    if(room.rows.some(r=>/[st]/.test(r))){const period=room.shiftPeriod,at=t%period;w.shiftWarning=at>period-w.tuning.telegraph||w.forcedShiftAt>t;
      if(w.forcedShiftAt&&t>=w.forcedShiftAt){w.shiftOffset=(w.shiftOffset||0)^1;w.forcedShiftAt=0;}
      const desired=(Math.floor(t/period)+(w.shiftOffset||0))%2;
      if(desired!==w.shift){const previous=w.shift;w.shift=desired;for(const p of [...w.heroes,...w.enemies]){if(!walkable(w,p.x,p.y,4,false,desired)){// Resolve only a swept partition, to its nearest floor on the original side.
          const q=nearestSafe(w,p,desired);p.x=q.x;p.y=q.y;if(p.id===1||p.id===2){p.safe={...q};p.hurt=Math.max(p.hurt,.7);}}}emit(w,'shift',{from:previous,to:desired});}}
    if(room.family==='crystal'||room.family==='final'){if(t%room.reveal.period<room.reveal.duration)w.reveal=Math.max(w.reveal,.1);}
    w.reveal=Math.max(0,w.reveal-dt);
    w.contactReveal=w.contactReveal.filter(q=>q.until>w.roomTime);
    for(const h of w.heroes){if(h.down)continue;
      for(const lane of w.hazards)if(lane.phase==='active'&&h.x>=lane.x-3&&h.x<=lane.x+lane.w+3&&h.y>=lane.y-3&&h.y<=lane.y+lane.h+3&&!wardAt(w,h.x,h.y))hurt(w,h,w.tuning.damage,{x:lane.x+lane.w/2,y:lane.y+lane.h/2});
      if(tile(w,h.x,h.y)==='~'){hurt(w,h,2*w.tuning.damage);const p=nearestSafe(w,h.safe||room.fallback);h.x=p.x;h.y=p.y;}
    }
  }
  function companion(w,h,dt,forceObjective=false){
    const cmd=ZERO(),r=C.rooms[w.roomId],other=w.heroes.find(p=>p.id!==h.id),rt=getRT(w).ai[h.id-1];let target=null;
    const nearest=w.enemies.filter(e=>!e.dead&&e.kind!=='dragon').sort((a,b)=>d(a,h)-d(b,h))[0];
    if(danger(w,h.x,h.y)>.4){h.aiState='escape hazard';target=nearestSafe(w,h);}
    else if(other.down){h.aiState='rescue';target=other;cmd.interact=d(h,other)<25;cmd.power=cmd.interact&&h.powerCd<=0;}
    else if(w.roomId==='final'&&w.finalBeat==='bind'&&(forceObjective||w.ping>0)){h.aiState='bind seal';target=w.stations.filter(s=>!s.active).sort((a,b)=>d(h,a)-d(h,b))[0];cmd.interact=!!target&&d(h,target)<22;}
    else if(w.ring?.carrier===h.id){h.aiState='carry to exit';target=r.exit;cmd.interact=d(h,target)<22;}
    else if(forceObjective||w.ping>0){h.aiState='objective';target=w.roomId==='final'?r.exit:w.ring&&!w.ring.carrier?w.ring:r.exit;cmd.interact=d(h,target)<22;}
    else if(w.ring?.carrier){h.aiState='support carrier';target=other;}
    else {h.aiState='follow';target=other;}
    if(!target)target=other;
    let stop=(h.aiState==='follow'||h.aiState==='support carrier')?27:5;
    if(d(h,target)>stop&&!cmd.interact){
      if(!rt.path||w.roomTime>(rt.next||0)||rt.epoch!==w.epoch||rt.shift!==w.shift||d(rt.goal||target,target)>20){rt.path=path(w,h,target);rt.next=w.roomTime+w.tuning.companionResponse;rt.epoch=w.epoch;rt.shift=w.shift;rt.goal={x:target.x,y:target.y};}
      while(rt.path.length&&d(h,rt.path[0])<4)rt.path.shift();const p=rt.path[0]||target;const dist=d(h,p);if(dist>1){cmd.mx=(p.x-h.x)/dist;cmd.my=(p.y-h.y)/dist;}
      if(danger(w,h.x+cmd.mx*13,h.y+cmd.my*13)>.65&&danger(w,h.x,h.y)<.3){cmd.mx=0;cmd.my=0;h.aiState='wait for safe crossing';cmd.power=h.classId==='wizard'&&h.powerCd<=0;}
    }
    if(nearest&&d(nearest,h)<95&&line(w,h,nearest)){const dist=d(nearest,h)||1;cmd.ax=(nearest.x-h.x)/dist;cmd.ay=(nearest.y-h.y)/dist;cmd.primary=d(nearest,h)<(h.classId==='warrior'?28:90);if(d(nearest,h)<37&&h.powerCd<=0)cmd.power=true;if(nearest.state==='wind'&&d(nearest,h)<24&&h.dodgeCd<=0)cmd.dodge=true;}
    if(h.classId==='phantom'&&w.reveal<.2&&r.family==='crystal'&&h.primaryCd<=0)cmd.primary=true;
    return cmd;
  }
  function updateHeroes(w,dt,commands){
    const rt=getRT(w);for(const h of w.heroes){
      const cmd=commands[h.id-1]||ZERO();h.vx=0;h.vy=0;
      for(const k of ['powerCd','primaryCd','dodgeCd','guard','cloak','hurt','dodge','wardTime'])h[k]=Math.max(0,(h[k]||0)-dt);
      if(h.down){h.pose='down';h.attack=null;continue;}
      const oldPhase=h.phase;h.phase=Math.max(0,h.phase-dt);
      if(oldPhase>0&&!h.phase&&!walkable(w,h.x,h.y)){const p=walkable(w,h.safe.x,h.safe.y)?h.safe:nearestSafe(w,h.phaseSafe||h);h.x=p.x;h.y=p.y;emit(w,'phase-return',{hero:h.id,x:h.x,y:h.y});}
      h.pose=h.guard>0?'guard':h.cloak>0?'crouch':h.phase>0?'phase':'';
      let mx=clamp(+cmd.mx||0,-1,1),my=clamp(+cmd.my||0,-1,1),n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n;}
      if(Math.hypot(cmd.ax||0,cmd.ay||0)>.2)h.facing=Math.atan2(+cmd.ay||0,+cmd.ax||0);else if(n>.05)h.facing=Math.atan2(my,mx);
      if(cmd.dodge&&h.dodgeCd<=0){h.dodge=.34;h.dodgeCd=1.65;h.dodgeDir=n>.1?Math.atan2(my,mx):h.facing;emit(w,'dodge',{hero:h.id,x:h.x,y:h.y});}
      if(cmd.power)power(w,h);
      if(cmd.primary)primary(w,h);
      const attack=rt.attacks[h.id-1];attack.update(dt);h.attack=attack.state;
      if(rt.pending[h.id-1]&&attack.active&&attack.u>=attack.spec.hitAt){const classId=rt.pending[h.id-1];rt.pending[h.id-1]=null;releasePrimary(w,h,classId);}
      if(h.classId==='warrior')attack.hits(w.enemies,e=>!e.dead&&d(h,e)<31&&Math.cos(Math.atan2(e.y-h.y,e.x-h.x)-h.facing)>.08&&line(w,h,e),e=>{
        if(['fighter','fire'].includes(e.kind)){e.hp-=2;if(e.hp<=0){e.dead=true;emit(w,'enemy-fall',{enemy:e.id,x:e.x,y:e.y});}}
        else stun(w,e,.9,h.id);emit(w,'hit',{hero:h.id,x:e.x,y:e.y});
      });
      const speed=w.tuning.heroSpeed*(h.guard>0?.45:h.phase>0?.66:h.cloak>0?.62:1)*(attack.busy&&h.classId==='warrior'?.55:1);
      if(h.dodge>0){mx=Math.cos(h.dodgeDir);my=Math.sin(h.dodgeDir);h.vx=mx*155;h.vy=my*155;}else{h.vx=mx*speed;h.vy=my*speed;}
      const ox=h.x,oy=h.y,hit=move(w,h,h.vx*dt,h.vy*dt,h.phase>0);w.stats.steps+=Math.hypot(h.x-ox,h.y-oy);
      if(hit){const cx=Math.floor((h.x+mx*9)/16),cy=Math.floor((h.y+my*9)/16);if(C.rooms[w.roomId].rows[cy]?.[cx]==='c')w.contactReveal.push({cx,cy,until:w.roomTime+2});}
      if(safe(w,h.x,h.y)&&!solid(w,h.x,h.y))h.safe={x:h.x,y:h.y};
      if(h.ai&&n>.3&&Math.hypot(h.x-ox,h.y-oy)<.03)h.stuck+=dt;else h.stuck=0;
      if(h.ai&&h.stuck>4){const human=w.heroes.find(o=>!o.ai&&!o.down);if(human&&d(human,h)>35){const route=path(w,h,human,{ignoreDanger:true});if(route.length){const candidate=nearestSafe(w,{x:human.x+18,y:human.y+10});if(d(candidate,human)<38&&line(w,human,candidate)){h.x=candidate.x;h.y=candidate.y;emit(w,'companion-return',{hero:h.id,...candidate});}}}h.stuck=0;}
      if(cmd.ping){w.ping=9;emit(w,'ping',{hero:h.id,x:h.x,y:h.y});announce(w,'Companion: I shall seek the objective, or your hand if you fall.',3);}
    }
    // Context is resolved after all movement so a same-tick pass/revive sees one consistent party.
    const ep=w.epoch;for(const h of w.heroes){if(!h.down)interact(w,h,commands[h.id-1]||ZERO(),commands,dt);if(w.epoch!==ep)return;}
    if(w.ring?.carrier){const h=w.heroes[w.ring.carrier-1];w.ring.x=h.x;w.ring.y=h.y;if(walkable(w,h.x,h.y)&&tile(w,h.x,h.y)!=='~')w.ring.lastSafe={x:h.x,y:h.y};}
    if(w.ring&&!w.ring.carrier&&!walkable(w,w.ring.x,w.ring.y)){const p=nearestSafe(w,w.ring.lastSafe||C.rooms[w.roomId].ring);Object.assign(w.ring,p);emit(w,'ring-return',p);}
  }
  function chooseTarget(w,e){
    let arr=w.heroes.filter(h=>!h.down&&(!h.cloak||h.carry));
    const lure=w.lures.filter(l=>l.owner!==e.id&&d(l,e)<115).sort((a,b)=>d(a,e)-d(b,e))[0];
    if(lure&&e.kind!=='dragon')return lure;
    if(!arr.length)return null;return arr.sort((a,b)=>(d(a,e)-(a.carry?36:0))-(d(b,e)-(b.carry?36:0)))[0];
  }
  function updateEnemies(w,dt){
    const rt=getRT(w);
    for(const e of w.enemies){
      if(e.dead)continue;
      if(e.kind==='dragon'){for(const h of w.heroes)if(!h.down&&h.cloak>0&&d(e,h)<18)hurt(w,h,w.tuning.damage,e);continue;}
      e.life-=dt;if(e.life<=0){e.dead=true;continue;}e.stun=Math.max(0,e.stun-dt);e.resist=Math.max(0,e.resist-dt);e.cooldown-=dt;
      if(e.stun>0){e.state='stun';e.vx=0;e.vy=0;continue;}
      // Cloak redirects awareness; it never makes a body intangible. This check also
      // applies when both heroes are hidden and chooseTarget consequently returns null.
      for(const h of w.heroes)if(!h.down&&(h.cloak>0||e.kind==='echo')&&d(e,h)<10)hurt(w,h,w.tuning.damage,e);
      const echoClass=e.kind==='echo'?(e.classId||'warrior'):null,ranged=e.kind==='fire'||echoClass==='wizard';
      e.attackMove=echoClass?classMoves[echoClass]:e.kind==='fire'?'cast':'slash';
      const target=chooseTarget(w,e);if(!target){e.state='idle';continue;}const dist=d(e,target);e.facing=Math.atan2(target.y-e.y,target.x-e.x);
      if(e.wind>0){e.wind=Math.max(0,e.wind-dt);e.state='wind';if(e.wind<=0){e.state='active';e.attack=.22;
          if(ranged){const a=Math.atan2(e.target.y-e.y,e.target.x-e.x);w.projectiles.push({id:++w.eventId,x:e.x+Math.cos(a)*8,y:e.y+Math.sin(a)*8,z:10,vx:Math.cos(a)*69,vy:Math.sin(a)*69,life:3,team:'enemy',kind:echoClass==='wizard'?'echo-rune':'fire',r:3});emit(w,echoClass==='wizard'?'possession-rune':'fire-shot',{enemy:e.id,x:e.x,y:e.y});}
          else if(echoClass==='phantom'){for(const h of w.heroes)if(!h.down&&d(h,e)<40){const dist=d(h,e)||1;if(hurt(w,h,w.tuning.damage,e))move(w,h,(h.x-e.x)/dist*14,(h.y-e.y)/dist*14);}w.reveal=Math.max(w.reveal,1.5);emit(w,'possession-pulse',{enemy:e.id,x:e.x,y:e.y,radius:40});}
          else if(echoClass==='changeling'){w.lures=w.lures.filter(l=>l.owner!==e.id);const a=Math.atan2(e.target.y-e.y,e.target.x-e.x),p=nearestSafe(w,{x:e.x+Math.cos(a)*45,y:e.y+Math.sin(a)*45});w.lures.push({...p,owner:e.id,team:'enemy',life:4.5});emit(w,'possession-lure',{enemy:e.id,x:p.x,y:p.y});}
          else if(e.kind==='spider'){const p=e.target;for(const h of w.heroes)if(d(h,p)<19)hurt(w,h,w.tuning.damage,e);emit(w,'spider-drop',{x:p.x,y:p.y});}
          else {for(const h of w.heroes)if(d(h,e)<24&&Math.cos(Math.atan2(h.y-e.y,h.x-e.x)-e.attackFacing)>.1)hurt(w,h,w.tuning.damage,e);emit(w,'enemy-strike',{x:e.x,y:e.y});}
          e.cooldown=w.tuning.attackCadence*(e.kind==='spider'?1.3:1);}
        continue;}
      if(e.attack>0){e.attack-=dt;e.state='recover';continue;}
      const range=ranged?140:e.kind==='spider'?92:echoClass==='phantom'?62:echoClass==='changeling'?110:24;
      if(dist<range&&e.cooldown<=0&&line(w,e,target,e.kind==='nightmare')){e.windDuration=e.kind==='spider'?1.5:ranged?1.15:echoClass==='phantom'?1.1:echoClass==='changeling'?1:.9;e.wind=e.windDuration;e.target={x:target.x,y:target.y};e.attackFacing=e.facing;e.state='wind';emit(w,'enemy-wind',{enemy:e.id,kind:e.kind,classId:echoClass,x:e.kind==='spider'?target.x:e.x,y:e.kind==='spider'?target.y:e.y});continue;}
      if(e.kind==='spider'||ranged&&dist<105){e.state='idle';continue;}
      if(dist>18){let p=target;if(e.kind!=='nightmare'){
        let nav=rt.enemyPaths.get(e.id);if(!nav||w.roomTime>nav.next||nav.shift!==w.shift){nav={path:path(w,e,target,{ignoreDanger:true}),next:w.roomTime+.7,shift:w.shift};rt.enemyPaths.set(e.id,nav);}while(nav.path.length&&d(e,nav.path[0])<4)nav.path.shift();p=nav.path[0]||e;}
        const l=d(e,p)||1,speed=w.tuning.enemySpeed*(e.kind==='nightmare'?1.2:e.kind==='echo'?.9:1);e.vx=(p.x-e.x)/l*speed;e.vy=(p.y-e.y)/l*speed;
        if(e.kind==='nightmare'){const nx=e.x+e.vx*dt,ny=e.y+e.vy*dt;if(tile(w,nx,ny)!=='#'){e.x=nx;e.y=ny;}}
        else move(w,e,e.vx*dt,e.vy*dt);e.state='walk';
      }
    }
    w.enemies=w.enemies.filter(e=>!e.dead);
  }
  function updateProjectiles(w,dt){
    for(const p of w.projectiles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(solid(w,p.x,p.y)){p.life=0;continue;}
      if(p.team==='enemy'){if(wardAt(w,p.x,p.y)){p.life=0;emit(w,'deflect',{x:p.x,y:p.y});continue;}for(const h of w.heroes)if(!h.down&&d(p,h)<9){hurt(w,h,w.tuning.damage,p);p.life=0;break;}}
      else for(const e of w.enemies)if(d(p,e)<11){stun(w,e,w.tuning.stunDuration,p.owner);p.life=0;break;}
    }w.projectiles=w.projectiles.filter(p=>p.life>0);
  }
  function director(w,dt){
    const r=C.rooms[w.roomId],dr=w.director;
    if(w.mode!=='room'||!r.directorEvents.length||w.roomTime<12||w.transition>0||w.heroes.some(h=>h.revive>0)||w.roomId==='final'&&w.finalBeat!=='bind'){dr.reason='Teaching, rescue or transition grace';return;}
    if(w.roomTime<dr.next||dr.budget<=0)return;
    if(w.hazards.some(h=>h.phase!=='idle')||w.enemies.some(e=>e.wind>0)){dr.next=w.roomTime+2;dr.reason='Waiting for a clear telegraph window';return;}
    const events=r.directorEvents.filter(e=>e!=='reinforcement'||w.enemies.length<r.enemyBudget);
    const event=events[Math.floor(random(w,'director')*events.length)];dr.event=event;dr.reason=w.ring?.carrier?'Treasure carried · bounded extraction pressure':'Dread tier '+Math.floor(w.dread/2)+' · authored '+r.family+' event';
    let used=false;
    if(event==='lane'&&w.hazards.length){const h=w.hazards[Math.floor(random(w,'director')*w.hazards.length)];if(!w.heroes.some(p=>d(p,{x:h.x+h.w/2,y:h.y+h.h/2})<28)){h.forcedUntil=w.roomTime+w.tuning.telegraph+h.duration;used=true;}}
    if(event==='shift'&&r.rows.some(row=>/[st]/.test(row))&&!w.forcedShiftAt){w.forcedShiftAt=w.roomTime+w.tuning.telegraph;w.shiftWarning=true;w.reveal=3;emit(w,'shift-warn',{at:w.forcedShiftAt});used=true;}
    if(event==='reinforcement'||event==='echo'){
      const points=[C.at(3,3),C.at(21,15),C.at(12,3),C.at(21,9)].filter(p=>walkable(w,p.x,p.y)&&w.heroes.every(h=>d(h,p)>85));
      if(points.length){const p=points[Math.floor(random(w,'director')*points.length)],kind=event==='echo'?'echo':'fighter';const e=spawnSpec(w,{...p,kind},'director-'+w.epoch+'-'+dr.count);if(kind==='echo'){e.classId=w.heroes[Math.floor(random(w,'director')*2)].classId;announce(w,C.dialogue.echo,5);}e.cooldown=2.5;w.enemies.push(e);used=true;}
    }
    if(used){dr.budget--;dr.count++;emit(w,'director',{event,reason:dr.reason});}dr.next=w.roomTime+w.tuning.directorCadence-Math.min(5,w.dread*w.tuning.dreadInfluence*.6);
  }
  function step(w,dt,inputs=[]){
    if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Simulation requires 0 < dt <= .1');
    if(!['room','courtyard'].includes(w.mode))return;
    w.tick++;w.time+=dt;w.roomTime+=dt;w.transition=Math.max(0,w.transition-dt);w.ping=Math.max(0,w.ping-dt);
    const epoch=w.epoch;
    updateHazards(w,dt);
    if(w.roomId==='final'&&w.finalBeat==='watch'&&w.roomTime>7){w.finalBeat='bind';announce(w,C.dialogue.final,7);emit(w,'seals-exposed',{});}
    const commands=w.heroes.map((h,i)=>h.ai?companion(w,h,dt):inputs[i]||ZERO());
    updateHeroes(w,dt,commands);if(w.epoch!==epoch)return;
    updateEnemies(w,dt);updateProjectiles(w,dt);director(w,dt);
    w.lures.forEach(l=>l.life-=dt);w.lures=w.lures.filter(l=>l.life>0);
    if(w.heroes.every(h=>h.down))fail(w);
  }
  function intent(w,seat,value,chooser=0){
    if(!Number.isInteger(seat)||seat<0||seat>1||!value||typeof value!=='object')return false;
    if(value.type==='hero')return changeHero(w,seat,value.value);
    if(seat!==chooser)return false;
    if(value.type==='route')return enterSite(w,value.value);
    if(value.type==='retry')return retry(w);
    if(value.type==='board'&&['room','failed','courtyard'].includes(w.mode))return board(w,true);
    if(value.type==='courtyardContinue'&&w.mode==='courtyard')return board(w);
    return false;
  }
  // Checkpoints describe only safe transitions, never an in-flight projectile.
  function checkpoint(w){return {version:3,seed:w.seed,mode:w.mode==='victory'?'victory':w.mode==='board'?'board':w.mode==='courtyard'?'courtyard':'room',roomId:w.roomId,site:w.site,roomIndex:w.roomIndex,dread:w.dread,rings:[...w.rings],caches:{...w.caches},shortcuts:[...w.shortcuts],classes:w.heroes.map(h=>h.classId),health:w.heroes.map(h=>h.hp>0?h.hp:3),assisted:!!w.assisted,tuning:{...w.tuning},cacheWard:w.cacheWard,stats:{...w.stats},time:w.time,eventId:w.eventId,tick:w.tick,epoch:w.epoch,random:{...w.random},history:w.history.slice(-150).map(e=>({...e}))};}
  function validSave(s){return !!(s&&s.version===3&&['room','board','courtyard','victory'].includes(s.mode)&&C.rooms[s.roomId]&&Number.isInteger(s.dread)&&s.dread>=0&&s.dread<=6&&Array.isArray(s.rings)&&s.rings.length===4&&s.rings.every(x=>typeof x==='boolean')&&Array.isArray(s.classes)&&s.classes.length===2&&s.classes.every(x=>C.heroes[x])&&Number.isInteger(s.roomIndex)&&s.roomIndex>=0&&s.roomIndex<2&&typeof s.seed==='string'&&Number.isFinite(s.time)&&s.time>=0&&s.caches&&['cacheCrystal','cacheShift'].every(k=>typeof s.caches[k]==='boolean')&&(s.mode!=='room'||C.sites.some(x=>x.id===s.site&&x.rooms[s.roomIndex]===s.roomId))&&(s.roomId!=='final'||s.rings.every(Boolean))&&['eventId','tick','epoch'].every(k=>s[k]===undefined||Number.isSafeInteger(s[k])&&s[k]>=0)&&(s.history===undefined||Array.isArray(s.history)&&s.history.every(e=>e&&Number.isSafeInteger(e.id)&&e.id>=0&&Number.isSafeInteger(e.tick)&&e.tick>=0&&typeof e.type==='string'))&&(s.health===undefined||Array.isArray(s.health)&&s.health.length===2&&s.health.every(hp=>Number.isFinite(hp)&&hp>0&&hp<=5))&&(s.assisted===undefined||typeof s.assisted==='boolean')&&(s.tuning===undefined||s.tuning&&typeof s.tuning==='object'&&!Array.isArray(s.tuning)&&Object.entries(s.tuning).every(([k,v])=>C.tuning[k]&&Number.isFinite(v)&&v>=C.tuning[k].min&&v<=C.tuning[k].max))&&(s.stats===undefined||s.stats&&typeof s.stats==='object'&&!Array.isArray(s.stats)&&Object.entries(s.stats).every(([k,v])=>['hits','revives','passes','retries','rooms','steps'].includes(k)&&Number.isFinite(v)&&v>=0))&&(s.random===undefined||s.random&&typeof s.random==='object'&&!Array.isArray(s.random)&&Object.values(s.random).every(n=>Number.isInteger(n)&&n>=0&&n<=4294967295)));}
  function restore(s){if(!validSave(s))return null;const w=create({seed:s.seed,classes:s.classes}),history=(s.history||[]).map(e=>({...e}));Object.assign(w,{dread:s.dread,rings:[...s.rings],caches:{...s.caches},shortcuts:Array.isArray(s.shortcuts)?s.shortcuts.filter(x=>typeof x==='string'):[],site:s.site,roomIndex:s.roomIndex,cacheWard:!!s.cacheWard,stats:{...w.stats,...s.stats},time:s.time,assisted:!!s.assisted,tuning:{...C.defaults(),...s.tuning},history,events:[],random:{...s.random},eventId:Math.max(s.eventId||0,...history.map(e=>e.id)),tick:Math.max(s.tick||0,...history.map(e=>e.tick)),epoch:s.epoch||0});
    w.heroes.forEach((h,i)=>{h.hp=s.health?.[i]??5;h.down=false;});
    if(s.mode==='board'){board(w);}else if(s.mode==='victory'){w.mode='victory';w.roomId=s.roomId;w.room=C.rooms[s.roomId];}else enterRoom(w,s.roomId);return w;
  }
  function setTuning(w,key,value){const t=C.tuning[key];if(!t||!Number.isFinite(value))return false;w.tuning[key]=clamp(value,t.min,t.max);w.assisted=true;return true;}
  function debug(w,action,value){w.assisted=true;if(action==='heal'){w.heroes.forEach(h=>{h.hp=5;h.down=false;h.hurt=2;});}else if(action==='invulnerable')w.invulnerable=!!value;else if(action==='restart'){w.heroes.forEach(h=>h.hp=5);enterRoom(w,w.roomId);}else if(action==='jump'&&C.rooms[value]){const s=C.sites.find(s=>s.rooms.includes(value));if(s){w.site=s.id;w.roomIndex=s.rooms.indexOf(value);}enterRoom(w,value);}else if(action==='spawn'){const p=nearestSafe(w,{x:320,y:80});if(w.heroes.every(h=>d(h,p)>35))w.enemies.push(spawnSpec(w,{...p,kind:['fighter','fire','spider','nightmare'].includes(value)?value:'fighter'},'debug-'+w.eventId++));}else if(action==='hazard'){const p=nearestSafe(w,{x:240,y:160});w.hazards.push({id:'debug-'+w.eventId++,x:p.x-16,y:p.y-8,w:48,h:16,offset:0,period:10,duration:1.5,phase:'warn',progress:0});}else if(action==='reset'){w.tuning=C.defaults();}emit(w,'debug',{action});}
  function objective(w){const r=C.rooms[w.roomId];if(w.mode==='board')return 'Choose the next castle';if(w.mode==='victory')return 'Morning belongs to two';if(w.mode==='failed')return 'A hand was lost to the dark';if(w.roomId==='final')return w.finalBeat==='watch'?'Read the dragon’s breath':w.finalBeat==='bind'?`Bind the four seal stations · ${w.bound}/4`:'Escape together through the golden waystone';if(w.mode==='courtyard')return 'Reach the golden waystone';if(w.ring)return w.ring.carrier?'Carry the ring to the lit exit':r.cache?'Retrieve the cache ember':r.practice?'Learn the burden: take the oath-ring':'Take the ring from its shrine';return 'Find the lit passage to the next chamber';}
  // Array snapshot for transport. Static room geometry stays in content, not in every packet.
  const q=n=>Math.round((n||0)*10)/10;
  function snapshot(w){return {v:3,e:w.epoch,k:w.tick,t:q(w.time),rt:q(w.roomTime),m:w.mode,r:w.roomId,s:w.site,i:w.roomIndex,d:w.dread,g:w.rings.map(Number).join(''),c:[+w.caches.cacheCrystal,+w.caches.cacheShift],h:w.heroes.map(h=>[h.classId,h.x,h.y,h.facing,h.hp,+h.down,q(h.phase),q(h.cloak),q(h.guard),q(h.dodge),q(h.hurt),q(h.powerCd),+h.carry,+h.ai,h.pose,q(h.revive),h.ward,q(h.wardTime),h.attack?[h.attack.phase,q(h.attack.u)]:null,h.phaseSafe?[q(h.phaseSafe.x),q(h.phaseSafe.y)]:null].map(x=>typeof x==='number'?q(x):x)),n:w.enemies.map(e=>[e.id,e.kind,q(e.x),q(e.y),q(e.facing),q(e.stun),q(e.wind),e.state,e.classId||'',e.target?[q(e.target.x),q(e.target.y)]:null,e.attackMove||'',q(e.windDuration),q(e.attack)]),p:w.projectiles.map(p=>[q(p.x),q(p.y),p.kind,q(p.vx),q(p.vy),p.team]),l:w.lures.map(l=>[q(l.x),q(l.y),q(l.life),l.owner,l.team||'hero']),o:w.ring?[q(w.ring.x),q(w.ring.y),w.ring.carrier,+w.ring.secured]:null,z:w.shift,sw:!!w.shiftWarning,sf:q(w.forcedShiftAt),rv:q(w.reveal),hz:w.hazards.map(h=>[h.phase,q(h.progress),q(h.forcedUntil)]),hx:w.hazards.slice(C.rooms[w.roomId].hazards.length).map(h=>[h.id,q(h.x),q(h.y),q(h.w),q(h.h),h.period,h.offset||0,h.duration]),st:w.stations.map(s=>[+s.active,q(s.progress)]),b:w.finalBeat,a:w.assisted,iv:w.invulnerable,u:Object.fromEntries(Object.entries(w.tuning).filter(([key,value])=>value!==C.tuning[key]?.value)),dr:w.director,an:[w.announcement,q(w.announcementUntil)],stats:w.stats,ev:w.events.slice(-8),seed:w.seed};}
  function applySnapshot(current,s){if(!s||s.v!==3||!C.rooms[s.r]||!Array.isArray(s.h)||s.h.length!==2)return current;let w=current;if(!w)w=create({seed:s.seed});if(w.epoch>s.e||w.epoch===s.e&&w.tick>s.k)return w;
    if(w.roomId!==s.r||w.epoch!==s.e)enterRoom(w,s.r);
    Object.assign(w,{epoch:s.e,tick:s.k,time:s.t,roomTime:s.rt,mode:s.m,site:s.s,roomIndex:s.i,dread:s.d,rings:s.g.split('').map(x=>x==='1'),caches:{cacheCrystal:!!s.c[0],cacheShift:!!s.c[1]},shift:s.z,shiftWarning:!!s.sw,forcedShiftAt:s.sf||0,reveal:s.rv,finalBeat:s.b,assisted:s.a,invulnerable:s.iv,tuning:{...C.defaults(),...s.u},director:s.dr,announcement:s.an[0],announcementUntil:s.an[1],stats:s.stats,events:s.ev||[]});
    w.heroes.forEach((h,i)=>{const v=s.h[i];Object.assign(h,{classId:v[0],x:v[1],y:v[2],facing:v[3],hp:v[4],down:!!v[5],phase:v[6],cloak:v[7],guard:v[8],dodge:v[9],hurt:v[10],powerCd:v[11],carry:!!v[12],ai:!!v[13],pose:v[14],revive:v[15],ward:v[16],wardTime:v[17],attack:v[18]?{spec:attackSpec(v[0],w.tuning.recovery),phase:v[18][0],u:v[18][1]}:null,phaseSafe:v[19]?{x:v[19][0],y:v[19][1]}:null});});
    w.enemies=s.n.map(v=>({id:v[0],kind:v[1],x:v[2],y:v[3],z:0,facing:v[4],stun:v[5],wind:v[6],state:v[7],classId:v[8],target:v[9]?{x:v[9][0],y:v[9][1]}:null,attackMove:v[10]||classMoves[v[8]]||'slash',windDuration:v[11]||.9,attack:v[12]||0,hp:1}));w.projectiles=s.p.map(v=>({x:v[0],y:v[1],z:10,kind:v[2],vx:v[3],vy:v[4],team:v[5]}));w.lures=s.l.map(v=>({x:v[0],y:v[1],life:v[2],owner:v[3],team:v[4]||'hero'}));w.ring=s.o?{x:s.o[0],y:s.o[1],carrier:s.o[2],secured:!!s.o[3]}:null;
    w.hazards=[...C.rooms[s.r].hazards,...(s.hx||[]).map(v=>({id:v[0],x:v[1],y:v[2],w:v[3],h:v[4],period:v[5],offset:v[6],duration:v[7]}))].map((h,i)=>({...h,phase:s.hz[i]?.[0]||'idle',progress:s.hz[i]?.[1]||0,forcedUntil:s.hz[i]?.[2]||0}));w.stations=(C.rooms[s.r].stations||[]).map((p,i)=>({...p,index:i,active:!!s.st[i]?.[0],progress:s.st[i]?.[1]||0}));w.bound=w.stations.filter(s=>s.active).length;return w;
  }
  G.RingSim={create,step,enterRoom,enterSite,board,complete,retry,changeHero,context,hurt,power,primary,stun,walkable,tile,safe,nearestSafe,path,danger,line,companion,checkpoint,validSave,restore,intent,setTuning,debug,objective,snapshot,applySnapshot,random,setRandomProvider:(w,p)=>randomProviders.set(w,p),emit,ZERO};
})(typeof window!=='undefined'?window:globalThis);
