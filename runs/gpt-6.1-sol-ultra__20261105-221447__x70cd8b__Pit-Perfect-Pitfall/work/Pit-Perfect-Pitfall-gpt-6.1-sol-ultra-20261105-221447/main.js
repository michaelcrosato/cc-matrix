import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
import {createWorld,makeExplorer,makeTreasure,makeHazard} from './world.js';
import {AudioSystem} from './audio.js';
import {Network} from './network.js';
import {renderPanel} from './panels.js';
import {level,defaults,values} from './level.js';
import credits from './credits.json';

const $=id=>document.getElementById(id), clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const tuning={...defaults}, settings={music:.10,sfx:.70,glyphs:'playstation',assist:false,reduced:false};
try{Object.assign(settings,JSON.parse(localStorage.getItem('pit-perfect-settings')||'{}'));}catch{}
const audio=new AudioSystem();audio.setMusic(settings.music);audio.setSfx(settings.sfx);
const state={mode:'loading',score:2000,treasures:new Set(),time:480,lives:3,checkpoint:3,region:0,facing:1,grounded:false,climbing:null,swinging:null,invuln:0,coyote:0,jumpBuffer:0,ropeCooldown:0,best:0,practice:false,metrics:{jumps:0,vineCatches:0,vineReleases:0,climbs:0,hits:0,collections:0,checkpoints:0,wins:0},collected:[]};
try{state.best=+(localStorage.getItem('pit-perfect-best')||0);}catch{}
let renderer,scene,camera,world,body,collider,art,explorer,remoteExplorer,accumulator=0,simTime=0,last=0,ready=false,manual=false,renderEnabled=true,renderFrames=0,physicsDebug=false,debugLines,quicksandCollider,quicksandMesh;
let panel=null,panelReturn=null,menuFocus=0,toastTimer=0,titleIdle=performance.now(),attractTime=0,camX=31,camY=3,lastInput='keyboard',networkError='',netAccumulator=0,actionQueued=false,jumpQueued=false,pauseQueued=false;
let shake=0,goalPulse=0,trailParticles=[],pickupMeshes=[],hazardObjects=[],checkpointMeshes=[],padPrev=[],padMenuTimer=0,peerSnapshot=null,peerAge=0;
const keys=new Set(),touches=new Map(),touchAxis={x:0,y:0},inputOverride={x:0,y:0,jump:false,action:false};
let touchActive=false,quickClosed=false,lastGrounded=false,damageCause='',networkStartPending=false;
const network=new Network(event=>{
 if(event.type==='peer'){peerSnapshot=event.snapshot;peerAge=0;if(remoteExplorer)remoteExplorer.group.visible=true;}
 if(event.type==='leave'){peerSnapshot=null;if(remoteExplorer)remoteExplorer.group.visible=false;}
 if(event.type==='start'){networkStartPending=true;}
 if(event.type==='time-up'){if(state.mode==='playing')finish(false,'The daylight has gone.');}
 if(event.type==='end'){networkStartPending=false;keys.clear();touches.clear();touchAxis.x=0;touchAxis.y=0;padAxis.x=0;padAxis.y=0;jumpQueued=false;actionQueued=false;state.mode='hub-ended';state.reason='The expedition has ended.';if(body)body.setLinvel({x:0,y:0,z:0},true);audio.enabled=false;if(audio.master)audio.master.gain.setValueAtTime(0,audio.context.currentTime);audio.context?.suspend?.().catch(()=>{});}
 if(event.type==='status'){if(network.state.transport==='none'){peerSnapshot=null;if(remoteExplorer)remoteExplorer.group.visible=false;$('peer').classList.add('hidden');}updateNetworkUI();}
});
const getPos=()=>body?body.translation():{x:26,y:.9,z:0};
const getFoot=()=>getPos().y-.9;
function persist(){try{localStorage.setItem('pit-perfect-settings',JSON.stringify(settings));}catch{}}
function setInput(type){if(lastInput!==type){lastInput=type;document.body.classList.toggle('touch-mode',type==='touch');refreshPrompts();}touchActive=type==='touch';}
function markInput(type){if(network.active&&network.ended)return true;setInput(type);titleIdle=performance.now();audio.unlock();if(state.mode==='attract'){showTitle();return true;}return false;}
function glyph(action){if(lastInput==='gamepad'){const ps={jump:'×',action:'□',move:'L',climb:'↑ ↓',pause:'OPTIONS',back:'○'},xb={jump:'A',action:'X',move:'L',climb:'↑ ↓',pause:'MENU',back:'B'};return(settings.glyphs==='xbox'?xb:ps)[action];}if(lastInput==='touch')return{jump:'TAP',action:'TAP',move:'DRAG',climb:'SWIPE',pause:'Ⅱ',back:'BACK'}[action];return{jump:'SPACE',action:'E',move:'A D',climb:'W S',pause:'ESC',back:'ESC'}[action];}
function refreshPrompts(){
 $('controls').innerHTML=[['move','Move'],['jump','Jump / release'],['action','Vine / ladder'],['pause','Pause']].map(([a,b])=>`<span><span class="key">${glyph(a)}</span>${b}</span>`).join('');
 $('title-prompt').textContent=lastInput==='gamepad'?`${glyph('jump')} TO SET OUT`:lastInput==='touch'?'TAP TO SET OUT':'SPACE / ENTER TO SET OUT';
 document.body.classList.toggle('reduced',settings.reduced);
}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');toastTimer=3.2;}
function showPanel(name,backTo=panel){if(network.active&&network.ended)return;panelReturn=backTo;panel=name;menuFocus=0;$('overlay').innerHTML=renderPanel(name,{settings,tuning,state,network:network.state,credits,level,prompts:{move:glyph('move'),jump:glyph('jump'),action:glyph('action'),pause:glyph('pause'),climb:glyph('climb')}});$('overlay').classList.remove('hidden');if(state.mode==='playing')state.mode='paused';setTimeout(()=>focusMenu(0),0);updateNetworkUI();}
function closePanel(){panel=null;panelReturn=null;$('overlay').classList.add('hidden');if(state.mode==='paused')state.mode='playing';titleIdle=performance.now();keys.clear();}
function menuItems(){return [...(panel?$('overlay'):$('title')).querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled&&el.offsetParent!==null);}
function focusMenu(index){const items=menuItems();if(!items.length)return;menuFocus=(index+items.length)%items.length;document.querySelectorAll('.focused').forEach(el=>el.classList.remove('focused'));items[menuFocus].classList.add('focused');if(lastInput==='gamepad'||lastInput==='keyboard')items[menuFocus].focus({preventScroll:true});items[menuFocus].scrollIntoView({block:'nearest'});}
function menuMove(direction){focusMenu(menuFocus+direction);audio.effect('menu');}
function menuConfirm(){const item=menuItems()[menuFocus];if(item?.type==='checkbox'){item.checked=!item.checked;item.dispatchEvent(new Event('change',{bubbles:true}));}else if(item?.tagName==='SELECT'){item.selectedIndex=(item.selectedIndex+1)%item.options.length;item.dispatchEvent(new Event('change',{bubbles:true}));}else item?.click();}
function menuAdjust(direction){const item=menuItems()[menuFocus];if(item?.type==='range'){item.value=clamp(+item.value+direction*+(item.step||.1),+item.min,+item.max);item.dispatchEvent(new Event('input',{bubbles:true}));}else if(item?.tagName==='SELECT'){item.selectedIndex=(item.selectedIndex+direction+item.options.length)%item.options.length;item.dispatchEvent(new Event('change',{bubbles:true}));}}
function back(){if(panel==='pause'){closePanel();return;}if(panel==='win'||panel==='lose'){showTitle();return;}if(panelReturn){const target=panelReturn;showPanel(target,null);return;}if(panel){if(state.mode==='paused')showPanel('pause',null);else closePanel();return;}if(state.mode==='playing')pause();}
function pause(){if(state.mode!=='playing')return;showPanel('pause',null);audio.effect('menu');}
function resetMetrics(){for(const k in state.metrics)state.metrics[k]=0;}
function startGame(){if(!ready)return;if(network.active&&state.mode!=='hub-waiting')return;if(network.active&&!network.canPlay){toast('Waiting for the expedition to begin…');return;}closePanel();Object.assign(state,{mode:'playing',score:2000,treasures:new Set(),time:tuning.clock,lives:3,checkpoint:3,region:0,facing:1,climbing:null,swinging:null,invuln:1,coyote:0,jumpBuffer:0,ropeCooldown:0,practice:false,collected:[]});resetMetrics();if(!network.active)network.reported=false;simTime=0;accumulator=0;keys.clear();jumpQueued=false;actionQueued=false;body.setGravityScale(1,true);body.setTranslation({x:3,y:.95,z:0},true);body.setLinvel({x:0,y:0,z:0},true);pickupMeshes.forEach(m=>m.visible=true);explorer.group.visible=true;camX=12;camY=3;lastGrounded=false;$('title').classList.add('hidden');showGameUI(true);$('demo-label').classList.add('hidden');$('demo-caption').classList.add('hidden');audio.voice('hello');toast('Twelve treasures. Eight minutes. Keep your hat.');updateHUD();}
function showGameUI(yes){for(const id of['hud','routebar','bottom-bar'])$(id).classList.toggle('hidden',!yes);}
function showTitle(){if(network.active)return;closePanel();state.mode='title';$('title').classList.remove('hidden');showGameUI(false);$('context').classList.add('hidden');$('touch-action').classList.add('hidden');$('demo-label').classList.add('hidden');$('demo-caption').classList.add('hidden');titleIdle=performance.now();camY=3;keys.clear();jumpQueued=false;actionQueued=false;state.swinging=null;state.climbing=null;body.setGravityScale(1,true);body.setTranslation({x:42,y:.92,z:0},true);body.setLinvel({x:0,y:0,z:0},true);pickupMeshes.forEach(m=>m.visible=true);explorer.group.visible=true;focusMenu(0);}
function beginAttract(){if(network.active)return;state.mode='attract';attractTime=0;$('title').classList.add('hidden');$('demo-label').classList.remove('hidden');$('demo-caption').classList.remove('hidden');showGameUI(false);pickupMeshes.forEach(m=>m.visible=true);}
function teleport(x,y=.92){state.climbing=null;state.swinging=null;body.setGravityScale(1,true);body.setTranslation({x:clamp(x,1,270),y,z:0},true);body.setLinvel({x:0,y:0,z:0},true);state.invuln=1;camX=x;camY=y<-2?-2.2:3;}
function finish(won,reason){if(state.mode!=='playing')return;state.mode=won?'won':'lost';state.swinging=null;state.climbing=null;body.setLinvel({x:0,y:0,z:0},true);if(won){state.metrics.wins++;state.score+=Math.floor(state.time)*10+state.lives*500;audio.effect('win');audio.voice('win');}else{audio.effect('hit');}state.best=Math.max(state.best,state.score);try{localStorage.setItem('pit-perfect-best',state.best);}catch{}const finalPosition=getPos();network.update({x:finalPosition.x,y:finalPosition.y-.9,facing:state.facing,pose:'idle',score:state.score,treasures:state.treasures.size,time:state.time,finished:true});network.finish(state.score);state.reason=reason||'You kept your hat. Mostly.';showPanel(won?'win':'lose',null);}
function hurt(cause,minor=false){if(state.invuln>0||tuning.invincible||state.mode!=='playing')return;state.metrics.hits++;damageCause=cause;shake=settings.reduced?0:.3;audio.effect('hit');audio.voice('hurt');$('flash').style.opacity=settings.reduced?'0':'.22';setTimeout(()=>$('flash').style.opacity='0',180);state.invuln=2.3;if(minor){state.score=Math.max(0,state.score-200);body.setLinvel({x:-state.facing*2,y:5,z:0},true);toast('A rolling log! −200 points.');return;}state.lives--;if(state.lives<=0){finish(false,cause);return;}teleport(state.checkpoint);state.invuln=2.3;toast(`${cause} ${state.lives} courage left. Back to your trail marker.`);}
function collect(index){if(state.treasures.has(index))return;state.treasures.add(index);state.collected.push(index);state.score+=values[level.treasures[index].type];state.metrics.collections++;pickupMeshes[index].visible=false;audio.effect('treasure');spawnBurst(level.treasures[index].x,level.treasures[index].y,0xf0bc52,20);const t=level.treasures[index].type;toast(`${t==='ring'?'Diamond ring':t==='bag'?'Treasure pouch':t==='gold'?'Gold bar':'Silver bar'}! +${values[t].toLocaleString()} · ${state.treasures.size}/12`);if(state.treasures.size===12)toast('All twelve! The gate is waiting to the east.');}
function updateHUD(){
 $('region-number').textContent=`FIELD NOTES / ${String(state.region+1).padStart(2,'0')}${getFoot()<-2?' · UNDERGROUND':''}`;$('region').textContent=level.sections[state.region].name;
 $('treasure-count').textContent=`${String(state.treasures.size).padStart(2,'0')} / 12`;
 const seconds=Math.max(0,Math.ceil(state.time));$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timer').style.color=seconds<60?'#ef8965':'';
 $('lives').textContent='♥ '.repeat(state.lives)+'♡ '.repeat(3-state.lives);$('routefill').style.width=`${getPos().x/level.length*100}%`;
 $('hint').textContent=level.sections[state.region].hint;
 if(peerSnapshot){$('peer').classList.remove('hidden');$('peer').textContent=`RIVAL EXPLORER · ${peerSnapshot.treasures||0}/12 · ${(peerSnapshot.score||0).toLocaleString()} pts${peerSnapshot.finished?' · FINISHED':''}`;}else $('peer').classList.add('hidden');
}
function fixed(dt){
 simTime+=dt;state.invuln=Math.max(0,state.invuln-dt);state.ropeCooldown=Math.max(0,state.ropeCooldown-dt);state.coyote=Math.max(0,state.coyote-dt);state.jumpBuffer=Math.max(0,state.jumpBuffer-dt);
 updateHazards(simTime,dt);
 let axisX=clamp(inputOverride.x+touchAxis.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+padAxis.x,-1,1);
 let axisY=clamp(inputOverride.y+touchAxis.y+(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+padAxis.y,-1,1);
 let jump=jumpQueued||inputOverride.jump,action=actionQueued||inputOverride.action;jumpQueued=false;actionQueued=false;inputOverride.jump=false;inputOverride.action=false;
 if(jump)state.jumpBuffer=.16;
 let p=getPos(),vel=body.linvel();
 const ray=new RAPIER.Ray({x:p.x,y:p.y-.72,z:0},{x:0,y:-1,z:0});
 const hit=world.castRay(ray,.28,true,undefined,undefined,collider,body);state.grounded=!!hit&&vel.y<=.7;
 if(state.grounded)state.coyote=.13;
 const nearLadder=level.ladders.find(x=>Math.abs(x-p.x)<1.6);
 if(!state.swinging&&!state.climbing&&nearLadder!==undefined&&(action||axisY<-.4&&p.y>-1||axisY>.4&&p.y<-4)){
  state.climbing={x:nearLadder,target:p.y<-2?.92:-6.08};state.metrics.climbs++;state.swinging=null;body.setGravityScale(0,true);body.setTranslation({x:nearLadder,y:p.y,z:0},true);body.setLinvel({x:0,y:0,z:0},true);audio.effect('menu');
 }
 if(state.climbing){
  const c=state.climbing,p=getPos(),direction=Math.sign(c.target-p.y);body.setTranslation({x:c.x,y:p.y+direction*dt*4.7,z:0},true);body.setLinvel({x:0,y:0,z:0},true);
  if(Math.abs(c.target-getPos().y)<.09||direction*(c.target-getPos().y)<0){body.setTranslation({x:c.x+1.4,y:c.target,z:0},true);body.setGravityScale(1,true);state.climbing=null;state.invuln=.45;}
 }else if(state.swinging){
  const v=state.swinging;v.speed=tuning.vineSpeed;const elapsed=simTime*v.speed+v.phase,angle=Math.sin(elapsed)*.95,angular=Math.cos(elapsed)*.95*v.speed;
  v.angle=angle;const x=v.x+Math.sin(angle)*v.length,y=v.y-Math.cos(angle)*v.length-.6;
  body.setTranslation({x,y,z:0},true);body.setLinvel({x:0,y:0,z:0},true);body.setGravityScale(0,true);state.facing=Math.sign(angular)||state.facing;
  if(jump||action||axisY<-.65||((settings.assist||touchActive)&&angle>.65&&angular>0)){
   body.setGravityScale(1,true);body.setLinvel({x:clamp(Math.cos(angle)*angular*v.length,-10,10)+(axisX*2),y:Math.max(6.5,Math.sin(angle)*angular*v.length),z:0},true);state.swinging=null;state.ropeCooldown=.9;state.jumpBuffer=0;state.metrics.vineReleases++;audio.effect('jump');
  }
 }else{
  body.setGravityScale(1,true);
  const target=axisX*tuning.speed*(p.y<-2?1.35:1);let vx=lerp(vel.x,target,Math.min(1,dt*(state.grounded?17:8)));
  if(Math.abs(axisX)>.15)state.facing=Math.sign(axisX);
  let vy=vel.y;
  if((settings.assist||touchActive)&&axisX!==0&&state.grounded){const look=p.x+Math.sign(axisX)*2.3;const danger=hazardObjects.some(h=>h.type!=='crocodile'&&Math.abs(h.x-look)<1.25&&Math.abs(h.y-(p.y-.9))<1);const shaft=level.ladders.some(x=>(x-p.x)*Math.sign(axisX)>0&&(x-p.x)*Math.sign(axisX)<1.8);const edge=level.gaps.some(g=>{const d=((axisX>0?g.a:g.b)-p.x)*Math.sign(axisX);return d>0&&d<1.65;});if(danger||shaft||edge)state.jumpBuffer=.16;}
  if(state.jumpBuffer>0&&state.coyote>0){vy=tuning.jump*(settings.assist||touchActive?1.12:1);state.coyote=0;state.jumpBuffer=0;state.grounded=false;state.metrics.jumps++;audio.effect('jump');spawnBurst(p.x,p.y-.8,0xe6d5a8,5);}
  body.setLinvel({x:vx,y:vy,z:0},true);
  if(state.ropeCooldown===0&&(vy>0||action||!state.grounded)){
   for(const v of level.vines){const a=Math.sin(simTime*tuning.vineSpeed+v.phase)*.95,ex=v.x+Math.sin(a)*v.length,ey=v.y-Math.cos(a)*v.length;if(Math.hypot(p.x-ex,p.y+.65-ey)<(settings.assist||touchActive?3.8:2.1)){
    state.swinging={...v,speed:tuning.vineSpeed,angle:a};state.metrics.vineCatches++;state.jumpBuffer=0;body.setGravityScale(0,true);audio.effect('swing');audio.voice('swing');toast(`Hang on! ${glyph('jump')} to leap off.`);break;
   }}
  }
 }
 world.timestep=dt;world.gravity.y=-tuning.gravity;world.step();
 p=getPos();if(p.x<1||p.x>270)body.setTranslation({x:clamp(p.x,1,270),y:p.y,z:0},true);
 const foot=p.y-.9;
 if(!state.climbing&&!state.swinging){
  for(const gap of level.gaps)if(p.x>gap.a+.15&&p.x<gap.b-.15&&foot<-.65&&p.y>-4){hurt(gap.type==='tar'?'That tar has quite a grip.':gap.type==='quicksand'?'A sinking feeling.':'An unscheduled swim.');break;}
  if(foot<-10)hurt('The jungle has the last laugh.');
  for(const h of hazardObjects){
   const near=Math.abs(p.x-h.x)<(h.type==='crocodile'?1.18:h.type==='fire'?.78:.8);
   if(near&&Math.abs(foot-h.y)<(h.type==='crocodile'?.8:.85)){
    if(h.type==='crocodile'){if(h.open)hurt('Never trust a smiling crocodile.');}
    else if(h.type==='log')hurt('A rolling log.',true);else hurt(h.type==='scorpion'?'A rather pointed welcome.':h.type==='fire'?'A little too warm.':'A rattling reception.');
   }
  }
 }
 for(let i=0;i<level.treasures.length;i++){const t=level.treasures[i];if(!state.treasures.has(i)&&Math.hypot(p.x-t.x,p.y-t.y)<1.25)collect(i);}
 const region=clamp(Math.floor(p.x/34),0,7);if(region!==state.region){state.region=region;if(!state.climbing)toast(level.sections[region].name);}
 for(let i=0;i<level.checkpoints.length;i++){const x=level.checkpoints[i];if(Math.abs(p.x-x)<1.1&&foot>-.2&&x>state.checkpoint){state.checkpoint=x;state.metrics.checkpoints++;state.lives=Math.min(3,state.lives+1);audio.effect('checkpoint');spawnBurst(x,1,0xb7e1a4,14);toast('Trail marked. A little courage restored.');}}
 if(p.x>264&&foot>-.2){if(state.treasures.size===12)finish(true);else if(goalPulse<=0){const missing=level.treasures.map((t,i)=>({...t,i})).filter(t=>!state.treasures.has(t.i)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];toast(`${12-state.treasures.size} treasures still out there. Nearest: ${Math.round(Math.abs(p.x-missing.x))} paces west${missing.y<0?', underground':''}.`);goalPulse=5;}}
 goalPulse=Math.max(0,goalPulse-dt);state.time-=dt;if(state.time<=0)finish(false,'The daylight has gone. The jungle keeps its secrets.');
 if(state.grounded&&!lastGrounded&&vel.y<-.8){audio.effect('land');spawnBurst(p.x,foot,0xd2c398,5);}lastGrounded=state.grounded;
 if(state.grounded&&Math.abs(axisX)>.4&&Math.floor(simTime*3)!==Math.floor((simTime-dt)*3))audio.effect('step');
 updateContext(nearLadder);updateHUD();
 netAccumulator+=dt;if(netAccumulator>.08){netAccumulator=0;network.update({x:p.x,y:p.y-.9,facing:state.facing,pose:state.swinging?'swing':state.climbing?'climb':state.grounded?'run':'jump',score:state.score,treasures:state.treasures.size,time:state.time,finished:state.mode==='won'||state.mode==='lost'});}
}
function updateContext(nearLadder){
 let text='',action='';if(state.swinging){text=`${glyph('jump')} · Leap off the vine`;action='Leap';}else if(state.climbing){text='Taking the scenic route…';}else if(nearLadder!==undefined){text=`${glyph('action')} · ${getFoot()<-2?'Climb to the canopy':'Explore the tunnels'}`;action='Climb';}else if(level.vines.some(v=>Math.abs(v.x-getPos().x)<7)&&getFoot()>-2){text=`${glyph('jump')} · Jump to catch the vine`;action='Jump';}
 $('context').textContent=text;$('context').classList.toggle('hidden',!text);$('touch-action').textContent=action;$('touch-action').classList.toggle('hidden',!action||lastInput!=='touch');
}
function updateHazards(t,dt){
 quickClosed=Math.sin(t*1.1)>.15;if(quicksandCollider)quicksandCollider.setEnabled(quickClosed);if(quicksandMesh){quicksandMesh.visible=quickClosed;quicksandMesh.material.color.set(quickClosed?0xa08e49:0x453d29);}
 for(const h of hazardObjects){
  if(h.type==='log'){h.x=h.base.x+Math.sin(t*tuning.hazardSpeed*.7+h.base.x)*2.2;h.mesh.position.x=h.x;h.mesh.rotation.z=t*2;}
  if(h.type==='scorpion'){h.x=h.base.x+Math.sin(t*tuning.hazardSpeed+h.base.x)*1.5;h.mesh.position.x=h.x;h.mesh.rotation.y=Math.cos(t*tuning.hazardSpeed+h.base.x)>0?0:Math.PI;}
  if(h.type==='snake'){h.mesh.rotation.z=Math.sin(t*3+h.x)*.04;}
  if(h.type==='fire'){h.mesh.scale.y=.95+Math.sin(t*9+h.x)*.16;h.mesh.rotation.y=t*.3;}
  if(h.type==='crocodile'){
   h.open=Math.sin(t*1.25*tuning.hazardSpeed+h.base.x*.15)>.5;
   const jaw=h.mesh.userData.jaw;if(jaw)jaw.rotation.z=h.open?.65:0;
   h.mesh.position.y=h.y+(h.open?-.03:0);
   if(h.warning)h.warning.visible=h.open;
  }
 }
}
function spawnBurst(x,y,color,count){if(settings.reduced)return;for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.OctahedronGeometry(.055+Math.random()*.035),new THREE.MeshBasicMaterial({color}));m.position.set(x,y,.4);scene.add(m);trailParticles.push({m,life:.5+Math.random()*.4,vx:(Math.random()-.5)*5,vy:Math.random()*5});}}
function updateParticles(dt){for(let i=trailParticles.length-1;i>=0;i--){const p=trailParticles[i];p.life-=dt;if(p.life<=0){scene.remove(p.m);p.m.geometry.dispose();p.m.material.dispose();trailParticles.splice(i,1);continue;}p.vy-=dt*9;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.rotation.x+=dt*3;p.m.scale.setScalar(Math.min(1,p.life*3));}}
const padAxis={x:0,y:0};
function pollGamepad(dt){
 if(network.active&&network.ended){padAxis.x=0;padAxis.y=0;return;}const pad=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);padAxis.x=0;padAxis.y=0;if(!pad){padPrev=[];return;}
 const down=pad.buttons.map(b=>b.pressed),pressed=i=>down[i]&&!padPrev[i];let ax=pad.axes[0]||0,ay=pad.axes[1]||0;
 if(down[14])ax=-1;if(down[15])ax=1;if(down[12])ay=-1;if(down[13])ay=1;
 const active=Math.abs(ax)>.25||Math.abs(ay)>.25||down.some(Boolean);if(active){if(markInput('gamepad')){padPrev=down;return;}}
 if(panel||state.mode==='title'){
  padMenuTimer-=dt;if(Math.abs(ay)>.45&&padMenuTimer<=0){menuMove(ay>0?1:-1);padMenuTimer=.2;}if(Math.abs(ax)>.5&&padMenuTimer<=0){menuAdjust(Math.sign(ax));padMenuTimer=.15;}
  if(pressed(0))menuConfirm();if(pressed(1)||(pressed(9)&&!(network.active&&down[8])))back();
 }else if(state.mode==='playing'){
  padAxis.x=Math.abs(ax)>.18?ax:0;padAxis.y=Math.abs(ay)>.25?-ay:0;if(pressed(0))jumpQueued=true;if(pressed(2))actionQueued=true;if(pressed(9)&&!(network.active&&down[8]))pause();
 }
 padPrev=down;
}
const tour=[
 {d:6,a:3,b:28,y:0,text:'A little courage goes a long way.',pose:'run'},
 {d:6,a:29,b:42,y:0,text:'Catch a vine. Keep your hat.',pose:'swing'},
 {d:4,a:47,b:54,y:0,text:'Twelve treasures. Yours for the finding.',pose:'run'},
 {d:3,a:54,b:54,y:0,endY:-7,text:'There is always another way under.',pose:'climb'},
 {d:5,a:56,b:85,y:-7,text:'Shortcuts. Long stings.',pose:'run'},
 {d:6,a:70,b:84,y:.3,text:'Mind the smiles.',pose:'croc'},
 {d:5,a:95,b:117,y:0,text:'Watch your step. Then take it.',pose:'run'},
 {d:5,a:130,b:145,y:0,text:'Nothing ventured…',pose:'swing'},
 {d:5,a:172,b:206,y:0,text:'A rather warm reception.',pose:'run'},
 {d:5,a:214,b:229,y:0,text:'Good feet. Bad footing.',pose:'run'},
 {d:6,a:230,b:247,y:0,text:'…everything gained.',pose:'swing'},
 {d:5,a:249,b:267,y:0,text:'The jungle is calling. Your turn.',pose:'run'}
];
function attract(dt){attractTime+=dt;let elapsed=attractTime%tour.reduce((n,s)=>n+s.d,0),shot=tour[0],u=0;for(const s of tour){if(elapsed<=s.d){shot=s;u=elapsed/s.d;break;}elapsed-=s.d;}let x=lerp(shot.a,shot.b,u),y=shot.y;
 if(shot.pose==='swing'){y=Math.sin(u*Math.PI)*3;explorer.group.rotation.z=-Math.cos(u*Math.PI)*.25;}else if(shot.pose==='climb')y=lerp(shot.y,shot.endY,u);else if(shot.pose==='run')y+=Math.max(0,Math.sin(u*Math.PI*6))*1.5;else if(shot.pose==='croc')y+=Math.abs(Math.sin(u*Math.PI*4))*1.8;
 explorer.group.position.set(x,y,0);explorer.update(dt,{moving:true,grounded:y<.1,climbing:shot.pose==='climb',swinging:shot.pose==='swing',facing:1,vy:0});camX=lerp(camX,x+3,Math.min(1,dt*2));camY=lerp(camY,y<-3?-2.8:3,dt*2);$('demo-caption').textContent=shot.text;
}
function animate(now){
 const dt=Math.min(.08,last?(now-last)/1000:.016);last=now;pollGamepad(dt);if(networkStartPending&&ready&&network.canPlay){networkStartPending=false;if(network.active)startGame();}
 if(!manual&&state.mode==='playing'&&(!network.active||network.canPlay)){accumulator+=dt;while(accumulator>=1/60&&state.mode==='playing'){fixed(1/60);accumulator-=1/60;}}
 if(!manual&&state.mode==='title'&&!panel&&performance.now()-titleIdle>10000)beginAttract();
 const p=getPos();
 if(state.mode==='attract')attract(dt);else{
  explorer.group.position.set(p.x,p.y-.9,0);explorer.group.rotation.z=0;
  explorer.update(dt,{moving:Math.abs(body.linvel().x)>.5,grounded:state.grounded,climbing:!!state.climbing,swinging:!!state.swinging,facing:state.facing,vy:body.linvel().y});
  explorer.group.visible=!(state.mode==='playing'&&state.invuln>0&&Math.floor(now/85)%2===0);
  const targetX=state.mode==='title'?31:clamp(p.x+state.facing*3,12,261),targetY=state.mode==='title'?3:p.y<-2?-2.9:3;
  camX=lerp(camX,targetX,Math.min(1,dt*3.8));camY=lerp(camY,targetY,Math.min(1,dt*4));
 }
 if(state.mode==='title')explorer.update(dt,{moving:false,grounded:true,facing:1});
 const ambientTime=state.mode==='playing'||state.mode==='paused'?simTime:now/1000;art.update(ambientTime,dt);
 if(state.mode!=='playing')updateHazards(ambientTime,dt);
 // Match the rope art to the same pendulum used by physics.
 if(art.vines)for(let i=0;i<art.vines.length;i++){const av=art.vines[i],v=level.vines[i];const a=Math.sin(ambientTime*tuning.vineSpeed+v.phase)*.95;if(av.group)av.group.rotation.z=a;}
 pickupMeshes.forEach((mesh,i)=>{mesh.rotation.y=ambientTime*.8+i;mesh.position.y=level.treasures[i].y+Math.sin(ambientTime*2+i)*.13;});
 checkpointMeshes.forEach((m,i)=>{m.material.color.set(level.checkpoints[i]<=state.checkpoint?0xf4bd50:0x91b88a);m.scale.setScalar(1+Math.sin(ambientTime*2+i)*.05);});
 if(remoteExplorer&&peerSnapshot){peerAge+=dt;remoteExplorer.group.visible=peerAge<15;remoteExplorer.group.position.lerp(new THREE.Vector3(peerSnapshot.x,peerSnapshot.y,.65),Math.min(1,dt*12));remoteExplorer.update(dt,{moving:peerSnapshot.pose==='run',grounded:peerSnapshot.pose==='run',climbing:peerSnapshot.pose==='climb',swinging:peerSnapshot.pose==='swing',facing:peerSnapshot.facing||1,vy:0});}
 if(art.sunLight){art.sunLight.position.set(camX+12,22,12);art.sunLight.target.position.set(camX,0,0);}
 shake=Math.max(0,shake-dt);const s=shake*Math.sin(now*.09);camera.position.set(camX+s,camY+6,26);camera.lookAt(camX,camY,0);
 updateParticles(dt);if(!document.hidden&&!(network.active&&network.ended))audio.update(dt,p.y<-2);if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
 if(physicsDebug){const {vertices,colors}=world.debugRender();debugLines.geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));debugLines.geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));debugLines.visible=true;}else if(debugLines)debugLines.visible=false;
 if(renderEnabled)renderer.render(scene,camera);renderFrames++;
}
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h);const a=w/h,viewH=a<1?24:18;camera.left=-viewH*a/2;camera.right=viewH*a/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();}
function updateNetworkUI(){if($('network-status'))$('network-status').textContent=networkError||network.state.status;if($('room-code')&&network.state.room&&!$('room-code').value)$('room-code').value=network.state.room;}
async function action(name){
 if(network.active&&(network.ended||['start','restart','start-race','title','race','leave-room','local-host','local-join','offer','answer','connect-answer'].includes(name)))return;
 audio.unlock();audio.effect('menu');
 if(name==='start'||name==='restart'||name==='start-race'){startGame();return;}
 if(name==='pause'){pause();return;}if(name==='resume'||name==='close'){closePanel();return;}if(name==='back'){back();return;}
 if(name==='title'){network.leave();showTitle();return;}
 if(name==='dev'&&(network.active||network.state.connected)){toast('The workshop is for solo expeditions. Race on equal footing.');return;}
 if(['settings','guide','dev','about','race'].includes(name)){showPanel(name);return;}
 if(name==='reset-dev'){Object.assign(tuning,defaults);state.time=defaults.clock;showPanel('dev','pause');toast('Expedition balance restored.');return;}
 if(name==='refill'){state.lives=3;state.time=tuning.clock;state.practice=true;toast('Courage and daylight restored.');updateHUD();return;}
 if(name==='collect-all'){level.treasures.forEach((_,i)=>collect(i));state.practice=true;toast('All treasures collected · practice expedition.');return;}
 if(name==='teleport'){const n=+$('teleport-region').value;teleport(level.checkpoints[n]||3);state.practice=true;closePanel();return;}
 if(name==='step-region'){teleport(level.checkpoints[(state.region+1)%8]);state.practice=true;closePanel();return;}
 if(name==='toggle-physics'){physicsDebug=!physicsDebug;toast(`Physics overlay ${physicsDebug?'on':'off'}.`);return;}
 if(name==='leave-room'){network.leave();networkError='';updateNetworkUI();return;}
 if(name==='local-host'){const code=network.host($('room-code')?.value||undefined);if($('room-code'))$('room-code').value=code;updateNetworkUI();return;}
 if(name==='local-join'){try{network.join($('room-code')?.value);networkError='';}catch(e){networkError=e.message;}updateNetworkUI();return;}
 if(['offer','answer','connect-answer'].includes(name)){
  const inp=$('signal-input')?.value||'';networkError='Gathering a path through the jungle…';updateNetworkUI();
  try{let result;if(name==='offer')result=await network.createOffer();else if(name==='answer')result=await network.acceptOffer(inp);else result=await network.acceptAnswer(inp);if(typeof result==='string'&&$('signal-output'))$('signal-output').value=result;networkError='';}catch(e){networkError=e.message;}updateNetworkUI();return;
 }
}
document.addEventListener('click',e=>{if(network.active&&e.target.closest('a')){e.preventDefault();return;}const button=e.target.closest('[data-action]');if(button)action(button.dataset.action);});
document.addEventListener('focusin',e=>{const index=menuItems().indexOf(e.target);if(index>=0)menuFocus=index;});
document.addEventListener('pointerover',e=>{if(network.active&&network.ended)return;const el=e.target.closest('button,input,select,textarea');if(el){const idx=menuItems().indexOf(el);if(idx>=0){menuFocus=idx;document.querySelectorAll('.focused').forEach(n=>n.classList.remove('focused'));el.classList.add('focused');}}});
document.addEventListener('input',e=>{
 if(network.active&&network.ended)return;const el=e.target;if(el.dataset.setting){let v=el.type==='checkbox'?el.checked:el.type==='range'?+el.value:el.value;settings[el.dataset.setting]=v;audio.setMusic(settings.music);audio.setSfx(settings.sfx);refreshPrompts();persist();const out=el.parentElement.querySelector('[data-value]');if(out)out.textContent=typeof v==='number'?`${Math.round(v*100)}%`:v;}
 if(el.dataset.tuning){tuning[el.dataset.tuning]=el.type==='checkbox'?el.checked:+el.value;if(el.dataset.tuning==='clock')state.time=tuning.clock;state.practice=true;const out=el.parentElement.querySelector('[data-value]');if(out)out.textContent=String(tuning[el.dataset.tuning]);}
});
document.addEventListener('change',e=>{if(e.target.dataset.setting||e.target.dataset.tuning)e.target.dispatchEvent(new Event('input',{bubbles:true}));});
window.addEventListener('keydown',e=>{
 if(network.active&&network.ended)return;const focused=document.activeElement;const editing=focused?.tagName==='TEXTAREA'||focused?.tagName==='INPUT'&&!['range','checkbox'].includes(focused.type);if(editing&&!['Escape','Tab'].includes(e.code))return;
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();
 if(markInput('keyboard'))return;if(e.repeat)return;
 if(e.code==='Escape'||e.code==='KeyP'){back();return;}
 if(panel||state.mode==='title'){
  if(e.code==='ArrowDown'||e.code==='KeyS'||e.code==='Tab')menuMove(e.code==='Tab'&&e.shiftKey?-1:1);else if(e.code==='ArrowUp'||e.code==='KeyW')menuMove(-1);else if(e.code==='ArrowLeft'||e.code==='KeyA')menuAdjust(-1);else if(e.code==='ArrowRight'||e.code==='KeyD')menuAdjust(1);else if(e.code==='Enter'||e.code==='Space')menuConfirm();return;
 }
 keys.add(e.code);if(e.code==='Space')jumpQueued=true;if(e.code==='KeyE')actionQueued=true;
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touchAxis.x=0;touchAxis.y=0;if(state.mode==='playing'&&!manual)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='playing'&&!manual)pause();});
window.addEventListener('pointermove',e=>{if(network.active&&network.ended)return;if(e.pointerType!=='touch'&&(Math.abs(e.movementX)+Math.abs(e.movementY)>1))markInput('keyboard');if(e.pointerType==='touch'&&touches.has(e.pointerId)){const t=touches.get(e.pointerId);if(t.left){touchAxis.x=clamp((e.clientX-t.x)/65,-1,1);touchAxis.y=clamp(-(e.clientY-t.y)/70,-1,1);}t.distance=Math.hypot(e.clientX-t.x,e.clientY-t.y);}});
$('canvas').addEventListener('pointerdown',e=>{
 if(markInput(e.pointerType==='touch'?'touch':'keyboard'))return;if(state.mode!=='playing')return;
 if(e.pointerType==='touch'){const left=e.clientX<innerWidth*.5;touches.set(e.pointerId,{x:e.clientX,y:e.clientY,left,distance:0});$('canvas').setPointerCapture(e.pointerId);if(left){$('touch-ripple').style.cssText=`display:block;left:${e.clientX-40}px;top:${e.clientY-40}px`;}else jumpQueued=true;}else if(e.button===2)actionQueued=true;else jumpQueued=true;
});
window.addEventListener('pointerdown',e=>{if(e.target!==$('canvas'))markInput(e.pointerType==='touch'?'touch':'keyboard');});
window.addEventListener('pointerup',e=>{if(touches.has(e.pointerId)){const t=touches.get(e.pointerId);if(t.left){touchAxis.x=0;touchAxis.y=0;$('touch-ripple').style.display='none';}touches.delete(e.pointerId);}});
window.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);touchAxis.x=0;touchAxis.y=0;$('touch-ripple').style.display='none';});
$('touch-action').addEventListener('pointerdown',e=>{if(network.active&&network.ended)return;e.preventDefault();e.stopPropagation();setInput('touch');if(state.swinging||$('touch-action').textContent==='Jump')jumpQueued=true;else actionQueued=true;});
$('canvas').addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('resize',resize);

async function init(){
 try{
  const hubConnection=network.init();
  $('load-status').textContent='Warming the sunlight…';await RAPIER.init();
  renderer=new THREE.WebGPURenderer({canvas:$('canvas'),antialias:true,forceWebGL:new URLSearchParams(location.search).has('webgl')});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xc1d5b3);await renderer.init();
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-16,16,9,-9,.1,180);camera.position.set(31,9,26);camera.lookAt(31,3,0);
  world=new RAPIER.World({x:0,y:-tuning.gravity,z:0});
  const gaps=[...level.gaps,...level.ladders.map(x=>({a:x-.8,b:x+.8}))].sort((a,b)=>a.a-b.a);let cursor=0;
  const floor=(a,b,y)=>world.createCollider(RAPIER.ColliderDesc.cuboid((b-a)/2,.35,2.3).setTranslation((a+b)/2,y-.35,0).setFriction(.2));
  for(const gap of gaps){if(gap.a>cursor)floor(cursor,gap.a,0);cursor=gap.b;}floor(cursor,272,0);floor(-5,280,-7);
  quicksandCollider=floor(103,108,0);quicksandCollider.setEnabled(false);
  for(const x of level.walls)world.createCollider(RAPIER.ColliderDesc.cuboid(.6,3.1,2.3).setTranslation(x,-3.85,0));
  for(const h of level.hazards.filter(h=>h.type==='crocodile'))world.createCollider(RAPIER.ColliderDesc.cuboid(1.15,.23,1).setTranslation(h.x,-.03,0));
  body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(26,.95,0).lockRotations().enabledTranslations(true,true,false).setCcdEnabled(true));
  collider=world.createCollider(RAPIER.ColliderDesc.capsule(.55,.35).setFriction(0).setRestitution(0).setDensity(1),body);
  $('load-status').textContent='Growing a very unreasonable jungle…';art=createWorld(scene,level);explorer=makeExplorer(0xe58245);scene.add(explorer.group);remoteExplorer=makeExplorer(0x61bfc0);remoteExplorer.group.visible=false;scene.add(remoteExplorer.group);
  level.treasures.forEach((t,i)=>{const mesh=makeTreasure(t.type);mesh.position.set(t.x,t.y,0);scene.add(mesh);pickupMeshes.push(mesh);});
  level.hazards.forEach(h=>{const mesh=makeHazard(h.type);mesh.position.set(h.x,h.y,0);scene.add(mesh);const obj={...h,base:h,mesh,open:false};if(h.type==='crocodile'){const warning=new THREE.Mesh(new THREE.ConeGeometry(.12,.4,3),new THREE.MeshBasicMaterial({color:0xf1ba51}));warning.position.set(0,1.1,0);warning.rotation.z=Math.PI;mesh.add(warning);obj.warning=warning;}hazardObjects.push(obj);});
  level.checkpoints.forEach(x=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.42,.055,5,20),new THREE.MeshBasicMaterial({color:0x91b88a}));m.position.set(x,.7,.3);scene.add(m);checkpointMeshes.push(m);});
  quicksandMesh=new THREE.Mesh(new THREE.BoxGeometry(5,.12,3.4),new THREE.MeshToonNodeMaterial({color:0xa08e49}));quicksandMesh.position.set(105.5,-.06,0);scene.add(quicksandMesh);
  debugLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,depthTest:false}));debugLines.renderOrder=100;scene.add(debugLines);debugLines.visible=false;
  resize();if(matchMedia('(pointer:coarse)').matches)setInput('touch');refreshPrompts();await hubConnection;ready=true;
  if(network.active){state.mode='hub-waiting';$('title').classList.add('hidden');showGameUI(false);toast('Expedition ready. Waiting for the starting signal…');}else{state.mode='title';showTitle();}
  network.ready();$('loading').classList.add('hide');
  renderer.setAnimationLoop(animate);
  window.__game={
   ready:true,version:'1.0.0',level,settings,tuning,audio,network,
   get state(){return{...state,treasures:[...state.treasures],position:{...getPos()},velocity:{...body.linvel()},renderer:renderer.backend?.isWebGPUBackend?'webgpu':'webgl2-fallback',renderFrames,physics:world.numRigidBodies?world.numRigidBodies():world.bodies.len(),panel,lastInput,quickClosed,damageCause,network:network.state,peer:peerSnapshot};},
   start:startGame,pause,showPanel,showTitle,teleport,
   setManual(v){manual=v;},setRenderEnabled(v){renderEnabled=!!v;},input(data){Object.assign(inputOverride,data);},
   step(n=1){for(let i=0;i<n;i++)if(state.mode==='playing')fixed(1/60);return this.state;},
   jump(){jumpQueued=true;},interact(){actionQueued=true;},
   attract(){beginAttract();},setIdle(seconds){titleIdle=performance.now()-seconds*1000;},collect,
   getHazards(){return hazardObjects.map(h=>({type:h.type,x:h.x,y:h.y,open:h.open}));},
   getVines(){return level.vines.map(v=>{const a=Math.sin(simTime*tuning.vineSpeed+v.phase)*.95;return{...v,angle:a,ex:v.x+Math.sin(a)*v.length,ey:v.y-Math.cos(a)*v.length};});},
   snapshot(){return JSON.stringify(this.state);}
  };
 }catch(error){console.error(error);if(globalThis.AIHub?.active)globalThis.AIHub.fail(error.message||String(error));$('load-status').innerHTML=`The jungle needs a little help.<br>${String(error.message).replace(/[<>]/g,'')}<br>Open this file in a current Chrome or Edge browser with internet access.`;window.__gameError=String(error.stack||error);}
}
init();
