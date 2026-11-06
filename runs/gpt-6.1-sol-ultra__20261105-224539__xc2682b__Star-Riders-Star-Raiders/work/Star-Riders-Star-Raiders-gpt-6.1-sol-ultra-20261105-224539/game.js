import * as THREE from 'three/webgpu';
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs';
import { AudioEngine } from './audio.js';
import { Network } from './network.js';

const $ = id => document.getElementById(id);
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const audio = new AudioEngine();
const defaults = { enemyDamage: 1, weaponPower: 1, flightSpeed: 1, energyDrain: 1 };
const balance = {...defaults};
const settings = { music: .10, sfx: .7, sensitivity: 1, glyphs: 'ps' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('star-riders-settings')||'{}')); } catch {}
const state = {
  mode: 'loading', screen: 'title', previous: 'title', ready: false, sector: 0, selected: 0,
  hull: 100, energy: 1000, shield: 100, shields: true, kills: 0, score: 0, time: 0,
  yaw: 0, pitch: 0, speed: 0, boost: 0, boostCooldown: 0, fireCooldown: 0, rear: false,
  damageFlash: 0, warp: 0, warpTarget: 0, dock: 0, dockVisits: 0, docked: false,
  target: null, lock: 0, attract: false, attractTime: 0, idle: 0, invincible: false,
  input: 'keyboard', paused: false, ended: false, guided: true, tip: 0, lowWarn: false,
  shots: 0, hits: 0, system: 'ALL SYSTEMS NOMINAL', finale: false, hubEnded: false,
};
const keys = new Set();
const mouse = {dx: 0, dy: 0, fire: false, assist: false};
const touch = {left: null, right: null, lx: 0, ly: 0, rx: 0, ry: 0, active: false, lastTime: -1000};
let gamepad = null, oldButtons = [], menuRepeat = 0, menuFocus = 0;
let renderer, world, eventQueue, playerBody, playerCollider, scene, camera, starfield, station, planet, cockpit;
let lastTime = performance.now(), physicsAccumulator = 0, hudTick = 0, demoTimer = 0;
let entities = [], shots = [], particles = [], mixers = [], ghosts = new Map(), sectors = [];
const colliderEntities = new Map();
const playerPos = V();
const velocity = V();
const aimQuat = new THREE.Quaternion();
const tempV = V(), forward = V(), right = V();
const color = { ink: 0x07151f, paper: 0xe9eddb, orange: 0xff774c, cyan: 0x7ce0d2, yellow: 0xf4d16a };

const network = new Network({
  onStart(seed, info) { startMission({seed, online: true}); notify('WING LINK LIVE', 'Same frontier. Four pilots. Highest mission rating wins.'); },
  onGhost(data, from) { receiveGhost(data, from); },
  onEnd(reason) { state.hubEnded = true; state.paused = true; audio.setMuted(true); document.exitPointerLock?.(); },
  onStatus(text) { if ($('online-status')) $('online-status').textContent = text; if ($('wing-status')) $('wing-status').textContent = text; if ($('result-network')) $('result-network').textContent=network.standingsText()||text; updateLobby(); },
  onTimeUp() { finishMission(false, 'COMMAND RECALL — SORTIE ENDED'); },
});

function toon(c, extra={}) { return new THREE.MeshToonMaterial({color:c, ...extra}); }
function basic(c, extra={}) { return new THREE.MeshBasicMaterial({color:c, ...extra}); }
const mats = {};
function mesh(geo, mat, parent, pos=[0,0,0], scale=[1,1,1], outline=true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); parent.add(m);
  if(outline) { const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({color:color.ink, transparent:true, opacity:.88})); m.add(lines); }
  return m;
}
function box(parent, mat, pos, size) { return mesh(new THREE.BoxGeometry(1,1,1),mat,parent,pos,size); }
function shipModel(type='fighter', friendly=false) {
  const g = new THREE.Group(); const hull = friendly?mats.cyan:mats.orange;
  const body = mesh(new THREE.OctahedronGeometry(1,0), hull,g,[0,0,0],[2.5,1.3,5]);
  box(g,mats.ink,[0,.3,-1.8],[1.7,.75,2.1]);
  box(g,mats.yellow,[0,.15,-3.6],[.65,.5,.35]);
  const wings = new THREE.Group(); wings.name='wings'; g.add(wings);
  const span = type==='cruiser'?8:5;
  for(const s of [-1,1]) {
    const w = box(wings,hull,[s*span/2,0,1],[span, .5, 3]); w.rotation.z=s*.28; w.rotation.y=s*-.25;
    box(wings,mats.ink,[s*span,0,1.5],[.6,3.5,4]);
    box(wings,mats.paper,[s*span,.1,-.8],[.7,2,.2]);
    mesh(new THREE.ConeGeometry(.8,3,5),mats.cyan,g,[s*1.6,0,4],[1,1,1],false).rotation.x=Math.PI/2;
  }
  if(type==='cruiser') { box(g,mats.ink,[0,1,1],[4,2,5]); box(g,mats.yellow,[0,2,0],[2,.35,3]); }
  if(type==='basestar') {
    g.scale.setScalar(2.5);
    mesh(new THREE.TorusGeometry(4,.65,4,12),hull,g,[0,0,0]).rotation.x=Math.PI/2;
    for(let i=0;i<6;i++) { const a=i*Math.PI/3; box(g,mats.paper,[Math.cos(a)*5,Math.sin(a)*3,1],[1,1,3]); }
  }
  const mixer = new THREE.AnimationMixer(g);
  const clip = new THREE.AnimationClip('ion-wing-cycle',2,[new THREE.NumberKeyframeTrack('wings.rotation[z]',[0,.5,1,1.5,2],[0,.07,0,-.07,0])]);
  mixer.clipAction(clip).play(); mixers.push({mixer,root:g});
  return g;
}
function stationModel() {
  const g=new THREE.Group(); const ring=new THREE.Group(); ring.name='habitat';g.add(ring);
  mesh(new THREE.TorusGeometry(25,2.5,5,16),mats.paper,ring).rotation.y=.12;
  mesh(new THREE.TorusGeometry(28,.5,3,32),mats.cyan,ring);
  for(let i=0;i<8;i++) {let a=i*Math.PI/4;const b=box(ring,i%2?mats.orange:mats.ink,[Math.cos(a)*25,Math.sin(a)*25,0],[8,5,8]);b.rotation.z=a;}
  mesh(new THREE.CylinderGeometry(6,8,20,8),mats.paper,g).rotation.x=Math.PI/2;
  mesh(new THREE.TorusGeometry(7,1,4,10),mats.orange,g,[0,0,-11]);
  mesh(new THREE.CircleGeometry(5.8,10),mats.cyan,g,[0,0,-11.2]).rotation.y=Math.PI;
  for(let i=0;i<4;i++){let a=i*Math.PI/2; const arm=box(g,mats.ink,[Math.cos(a)*14,Math.sin(a)*14,0],[25,2,2]);arm.rotation.z=a;}
  const mx=new THREE.AnimationMixer(g);mx.clipAction(new THREE.AnimationClip('habitat-rotation',40,[new THREE.NumberKeyframeTrack('habitat.rotation[z]',[0,40],[0,Math.PI*2])])).play();mixers.push({mixer:mx,root:g});
  return g;
}
function makeBackground() {
  const positions=[], colors=[]; const rng=seeded(8274);
  for(let i=0;i<2000;i++) {const p=V(rng()-.5,rng()-.5,rng()-.5).normalize().multiplyScalar(1300+rng()*700); positions.push(...p.toArray()); const c=new THREE.Color(i%7===0?color.orange:i%3===0?color.cyan:color.paper);colors.push(c.r,c.g,c.b);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  starfield=new THREE.Points(geo,new THREE.PointsMaterial({size:2.4,sizeAttenuation:true,vertexColors:true}));scene.add(starfield);
  planet=new THREE.Group();scene.add(planet);planet.position.set(260,125,-520);
  mesh(new THREE.SphereGeometry(110,48,24),mats.cyan,planet,[0,0,0],[1,1,1],false);
  mesh(new THREE.TorusGeometry(176,.65,3,100),mats.paper,planet).rotation.x=1.12;
  const ring=mesh(new THREE.RingGeometry(130,175,96),basic(0xe4ba78,{side:THREE.DoubleSide}),planet,[0,0,0],[1,1,1],false);ring.rotation.x=1.12;
  const rings=mesh(new THREE.RingGeometry(145,148,96),basic(color.ink,{side:THREE.DoubleSide}),planet,[0,-.36,.18],[1,1,1],false);rings.rotation.x=1.12;
  for(let i=0;i<24;i++) {const a=rng()*Math.PI*2,b=rng()*Math.PI; const p=V(Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)).multiplyScalar(109.8); const patch=mesh(new THREE.CircleGeometry(8+rng()*18,5),mats.darkCyan,planet,p.toArray(),[1,1,1],false);patch.quaternion.setFromUnitVectors(V(0,0,1),p.clone().normalize());}
  const moon=mesh(new THREE.IcosahedronGeometry(34,1),mats.orange,scene,[-230,155,-620]);moon.rotation.z=.4;
  // A sparse halftone nebula, kept behind every combat sector.
  const neb=new THREE.Group();scene.add(neb);neb.position.set(-330,-80,-1000);neb.rotation.z=-.3;
  for(let i=0;i<14;i++){const m=mesh(new THREE.IcosahedronGeometry(100+i*3,0),basic(i%2?0x17313b:0x122731,{transparent:true,opacity:.17,depthWrite:false}),neb,[i*45,i%3*30,0],[2.2,.45,.2],false);m.rotation.z=i*.3;}
}
function makeCockpit() {
  cockpit=new THREE.Group();camera.add(cockpit);
  for(const s of [-1,1]) {
    const rail=box(cockpit,mats.ink,[s*1.17,-.72,-1.7],[.19,1.1,1.3]);rail.rotation.z=s*-.55;
    const stripe=box(cockpit,mats.cyan,[s*1.15,-.66,-1.75],[.025,.8,.03]);stripe.rotation.z=s*-.55;
    const gun=box(cockpit,mats.paper,[s*.97,-.82,-2.3],[.2,.18,1.9]);gun.rotation.y=s*-.08;
    box(cockpit,mats.orange,[s*.97,-.73,-2.4],[.035,.02,.8]);
  }
}
function seeded(seed) { let s=seed>>>0; return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
function createSectors(seed=1982) {
  const data=[
    ['PORCHLIGHT',0,0,'base'],['TIN CAN ALLEY',2,0,'patrol'],['MOTH FIELD',3,0,'fighters'],['FAR SIGNAL',2,1,'cruisers'],
    ['QUIET WAKE',0,0,'empty'],['EMBER BELT',3,1,'asteroids'],['WAYSTATION',0,0,'base'],['CROWN OF ASH',2,2,'siege'],
    ['BLUE STATIC',0,0,'empty'],['OLD ORBIT',2,1,'cruisers'],['DEAD LETTER',0,0,'empty'],['LAST LIGHT',0,0,'finale'],
  ];
  return data.map((d,i)=>({id:i,name:d[0],fighters:d[1],cruisers:d[2],type:d[3],remaining:d[1]+d[2],cleared:d[1]+d[2]===0,baseHealth:100,pressure:0,seed:seed+i*734,saved:[]}));
}
function removeEntity(e) {scene.remove(e.mesh); if(e.body&&world.getRigidBody(e.body.handle)) world.removeRigidBody(e.body); if(e.collider)colliderEntities.delete(e.collider.handle); mixers=mixers.filter(m=>{if(m.root===e.mesh){m.mixer.stopAllAction();return false;}return true;});}
function clearSpace() {
  entities.forEach(removeEntity);entities=[];shots.forEach(s=>scene.remove(s.mesh));shots=[];particles.forEach(p=>scene.remove(p.mesh));particles=[];
  if(station){scene.remove(station);mixers=mixers.filter(m=>m.root!==station);}station=null;
}
function spawnEnemy(type,pos,index,rng) {
  const model=shipModel(type);scene.add(model);model.position.copy(pos);
  const radius=type==='basestar'?14:type==='cruiser'?7:5;
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(pos.x,pos.y,pos.z));
  const collider=world.createCollider(RAPIER.ColliderDesc.ball(radius).setCollisionGroups(0x00020001).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),body);
  const e={type,mesh:model,body,collider,radius,hp:type==='basestar'?24:type==='cruiser'?6:3,maxHp:type==='basestar'?24:type==='cruiser'?6:3,phase:rng()*6.28,index,age:0,fire:1.4+rng()*3,alive:true,aggressive:type!=='cruiser',hit:0};
  entities.push(e);colliderEntities.set(collider.handle,e);return e;
}
function enterSector(index, preview=false) {
  clearSpace();state.sector=index;state.target=null;state.lock=0;state.yaw=0;state.pitch=0;state.rear=false;state.speed=0;state.docked=false;
  playerPos.set(0,0,0);velocity.set(0,0,0);playerBody.setTranslation(playerPos,true);
  const sec=sectors[index];const rng=seeded(sec.seed);
  planet.position.set(index%2?320:250,100+(index%3)*70,-600);planet.rotation.z=index*.35;
  if(sec.type==='base'&&sec.baseHealth>0) {station=stationModel();station.position.set(preview?45:0,preview?-18:0,preview?-225:-210);station.rotation.y=.1;scene.add(station);}
  if(preview){const e=spawnEnemy('fighter',V(38,8,-65),0,rng);e.mesh.scale.setScalar(2.4);e.preview=true;return;}
  let n=0;
  if(sec.saved.length){for(const saved of sec.saved){const e=spawnEnemy(saved.type,V(...saved.p),n++,rng);e.hp=saved.hp;}}
  else if(sec.type==='finale') {
    if(state.finale&&!sec.cleared){spawnEnemy('basestar',V(0,0,-240),0,rng);spawnEnemy('fighter',V(-65,20,-200),1,rng);spawnEnemy('fighter',V(65,-20,-200),2,rng);}
  } else {
    for(let i=0;i<sec.fighters;i++)spawnEnemy(sec.type==='siege'&&i===0?'basestar':'fighter',V((i%2?1:-1)*(45+rng()*35), (rng()-.5)*45,-160-rng()*100),n++,rng);
    for(let i=0;i<sec.cruisers;i++)spawnEnemy('cruiser',V((rng()-.5)*180,(rng()-.5)*70,-240-rng()*80),n++,rng);
  }
  const count=sec.type==='asteroids'||sec.type==='finale'?35:12;
  for(let i=0;i<count;i++) {
    const p=V((rng()-.5)*900,(rng()-.5)*500,-80-rng()*900);if(Math.abs(p.x)<30&&Math.abs(p.y)<25)p.x+=100;
    const radius=5+rng()*15;const model=mesh(new THREE.IcosahedronGeometry(radius,0),i%3?mats.rock:mats.darkCyan,scene,p.toArray());model.rotation.set(rng()*3,rng()*3,rng()*3);
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(p.x,p.y,p.z));const collider=world.createCollider(RAPIER.ColliderDesc.ball(radius).setCollisionGroups(0x00040001),body);
    const e={type:'asteroid',mesh:model,body,collider,radius,hp:3,maxHp:3,alive:true,phase:rng(),age:0};entities.push(e);colliderEntities.set(collider.handle,e);
  }
  sec.remaining=entities.filter(e=>e.type!=='asteroid').length;sec.cleared=sec.remaining===0;
  if(!preview){notify(sec.type==='base'?'FRIENDLY TRANSPONDER':'SECTOR '+sectorCode(index),sec.type==='base'?'Approach the amber gate. Dock to repair and recharge.':sec.remaining?'Contacts ahead. Keep them centered; hold target assist to track.':'No hostile contacts. Choose your next sector on the chart.');}
}
function sectorCode(i) {return String.fromCharCode(65+i%4)+(Math.floor(i/4)+1);}
function remaining() {return sectors.reduce((a,s)=>a+s.remaining,0);}
function notify(title,text) {if($('radio-speaker'))$('radio-speaker').textContent=title;if($('radio-text'))$('radio-text').textContent=text;$('radio')?.classList.add('active');state.tip=7;audio.play('radio');}
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  state.screen=id;
  if(id)$(id)?.classList.remove('hidden');
  const running=state.mode==='playing'||state.attract;
  $('hud')?.classList.toggle('hidden',!running);
  menuFocus=0;focusItem(0);
  if(id)document.exitPointerLock?.();
}
function focusables() {const el=$(state.screen);return el?[...el.querySelectorAll('button:not([disabled]),input,select')].filter(x=>x.offsetParent!==null):[];}
function focusItem(index) {const items=focusables();if(!items.length)return;menuFocus=(index+items.length)%items.length;items[menuFocus].focus({preventScroll:true});items[menuFocus].scrollIntoView({block:'nearest'});}
function saveSettings(){try{localStorage.setItem('star-riders-settings',JSON.stringify(settings));}catch{}audio.setMusic(settings.music);audio.setSfx(settings.sfx);}
function applySettings(){for(const id of ['music','sfx','sensitivity','glyphs']){if($(id))$(id).value=settings[id];if($(id+'-output'))$(id+'-output').textContent=id==='sensitivity'?settings[id].toFixed(1)+'×':Math.round(settings[id]*100)+'%';}saveSettings();}
function startMission({attract=false,seed=1982,online=false}={}) {
  if(state.hubEnded)return;
  Object.assign(state,{mode:'playing',paused:false,attract,hull:100,energy:1000,shield:100,shields:true,kills:0,score:0,time:0,boost:0,boostCooldown:0,warp:0,dock:0,dockVisits:0,docked:false,shots:0,hits:0,ended:false,system:'ALL SYSTEMS NOMINAL',finale:false,lowWarn:false,invincible:attract,attractTime:0,fireCooldown:0,tip:0});
  Object.assign(balance,defaults);sectors=createSectors(seed);enterSector(attract?1:1);showScreen(null);$('attract')?.classList.toggle('hidden',!attract);audio.play('warp');
  if(!attract)notify('OPERATION LAMPLIGHT','Cadet, the trade lanes are under siege. Clear six patrols, then stop the command ship. Chart is M / △.');
}
function returnTitle() {if(network.hubActive)return;state.mode='title';state.paused=false;state.attract=false;state.idle=0;state.hubEnded=false;$('attract')?.classList.add('hidden');sectors=createSectors();enterSector(0,true);showScreen('title');}
function pause() {if(state.mode!=='playing'||state.attract||state.hubEnded)return;state.paused=!state.paused;showScreen(state.paused?'pause':null);}
function jumpCost(i){const a=state.sector;return 45+22*(Math.abs(i%4-a%4)+Math.abs(Math.floor(i/4)-Math.floor(a/4)));}
function openMap(){if(state.mode!=='playing'||state.warp||state.dock)return;if(state.screen==='map'){state.paused=false;showScreen(null);return;}state.selected=state.sector;state.paused=true;renderMap();showScreen('map');}
function renderMap(){
  const target=$('sector-grid')||$('map-content');if(!target)return;
  target.innerHTML=sectors.map(s=>`<button class="sector ${s.id===state.sector?'current':''} ${s.id===state.selected?'selected':''} ${s.remaining?'hostile':s.type==='base'?'station':'cleared'}" data-sector="${s.id}"><span class="sector-id">${sectorCode(s.id)} ${s.id===state.sector?'◈':''}</span><span class="sector-symbol">${s.type==='base'?(s.baseHealth>0?'◎':'×'):s.remaining?'⌁':s.type==='finale'?'✧':'·'}</span><strong class="sector-name">${s.name}</strong><small class="sector-count">${s.type==='base'?'BASE '+Math.ceil(s.baseHealth)+'%':s.remaining?s.remaining+' HOSTILES':s.type==='finale'&&!state.finale?'SIGNAL MASKED':'CLEAR'}</small></button>`).join('');
  const s=sectors[state.selected];$('map-sector-name').textContent=sectorCode(s.id)+' / '+s.name;
  $('map-sector-description').textContent=s.type==='base'?`Friendly station, ${Math.ceil(s.baseHealth)}% integrity. Intercept nearby patrols to defend it. Dock to restore your ship and reinforce the station.`:s.type==='siege'?'A shielded siege craft and its escorts. Close within 260 metrons to penetrate its armor.':s.type==='finale'?'An encrypted command signal. Clear all patrols to reveal the enemy flagship.':s.remaining?'Intercept this patrol to relieve nearby stations. Fighters attack on sight; cruisers respond when provoked.':'No hostile contacts. The trade lane is secure.';
  $('map-sector-stats').textContent=`${Math.floor(state.energy)} ENERGY AVAILABLE · ${s.id===state.sector?'CURRENT SECTOR':jumpCost(s.id)+' TO JUMP'}`;
  $('jump-button').textContent=s.id===state.sector?'RETURN TO COCKPIT':'ENGAGE HYPERWARP ↗';
}
function engageJump(i=state.selected){
  if(i===state.sector){state.paused=false;showScreen(null);return;}
  const cost=jumpCost(i);if(state.energy<cost){notify('JUMP REFUSED','Insufficient energy. Conserve power or return to a nearby station.');return;}
  saveSector();state.energy-=cost;state.warp=2.6;state.warpTarget=i;state.paused=false;showScreen(null);audio.play('warp');notify('HYPERWARP COMMITTED',sectorCode(i)+' / '+sectors[i].name);
}
function saveSector(){const s=sectors[state.sector];s.saved=entities.filter(e=>e.alive&&e.type!=='asteroid').map(e=>({type:e.type,hp:e.hp,p:e.mesh.position.toArray()}));s.fighters=s.saved.filter(e=>e.type!=='cruiser').length;s.cruisers=s.saved.filter(e=>e.type==='cruiser').length;s.remaining=s.saved.length;}
function dock(){if(!station||state.warp||state.dock)return;if(playerPos.distanceTo(station.position)>330){notify('STARBASE CONTROL','Move within 330 metrons to engage the docking tractor.');return;}state.dock=5;state.docked=false;state.speed=0;audio.play('dock');notify('DOCKING CLEARANCE','Tractor engaged. Energy, shields and damaged systems are being restored.');}
function action(name){
  if(state.hubEnded)return;activity();audio.unlock();audio.play('select');
  if(name==='launch'){if(!network.hubActive){if(network.active)network.leave();startMission();}}
  else if(name==='resume'){state.paused=false;showScreen(null);}
  else if(['settings','manual','about','dev'].includes(name)){state.previous=state.mode==='playing'?'pause':'title';showScreen(name);}
  else if(name==='back'){if(state.screen==='map'){state.paused=false;showScreen(null);}else showScreen(state.previous||'title');}
  else if(name==='pause')pause();
  else if(name==='interact'){if(station)dock();else openMap();}
  else if(name==='abort'){if(!network.hubActive){network.leave();returnTitle();}}
  else if(name==='map')openMap();
  else if(name==='jump')engageJump();
  else if(name==='dock')dock();
  else if(name==='reset-dev'){Object.assign(balance,defaults);syncDev();}
  else if(name==='repair'){state.hull=100;state.shield=100;state.energy=1000;state.system='ALL SYSTEMS NOMINAL';}
  else if(name==='clear-sector'){entities.filter(e=>e.alive&&e.type!=='asteroid').forEach(e=>damageEnemy(e,1000,true));}
  else if(name==='complete'){finishMission(true);}
  else if(name==='invincible'){state.invincible=!state.invincible;syncDev();}
  else if(name==='online'){state.previous='title';showScreen('lobby');}
  else if(name==='host'){network.createRoom().then(updateLobby).catch(e=>notify('LINK ERROR',e.message));}
  else if(name==='join'){network.joinRoom($('room-code').value).then(updateLobby).catch(e=>notify('LINK ERROR',e.message));}
  else if(name==='room-launch')network.launchRoom();
  else if(name==='leave'){network.leave();returnTitle();}
  else if(name==='retry'){if(!network.active)startMission();}
  else if(name==='title'){if(!network.active)returnTitle();}
}
function syncDev(){const ids={'enemy-damage':'enemyDamage','weapon-power':'weaponPower','flight-speed':'flightSpeed','energy-drain':'energyDrain'};for(const[id,key]of Object.entries(ids)){if($(id))$(id).value=balance[key];if($(id+'-output'))$(id+'-output').textContent=balance[key].toFixed(1)+'×';}const b=document.querySelector('[data-action="invincible"]');b?.setAttribute('aria-pressed',String(state.invincible));if(b)b.textContent='INVULNERABILITY: '+(state.invincible?'ON':'OFF');}
function updateLobby(){if(!$('room-info'))return;$('room-info').classList.toggle('hidden',!network.active);$('lobby-code').textContent=network.roomCode||'------';$('lobby-players').textContent=network.players.map(p=>p.name).join(' / ');document.querySelector('[data-action="room-launch"]').disabled=!network.isHost;}
function activity(type=state.input){state.idle=0;state.input=type;if(type!=='touch')touch.active=false;document.body.classList.toggle('touch',type==='touch');if(state.attract){returnTitle();return true;}return false;}

function fire(){
  if(state.fireCooldown>0||state.energy<2||state.warp||state.dock)return;
  state.fireCooldown=state.hull<35?.33:.19;state.energy-=2*balance.energyDrain;state.shots++;audio.play('laser');
  camera.getWorldDirection(forward);let dir=forward.clone();
  if(state.target&&state.lock>.4){const e=state.target;const lead=e.velocity?.clone().multiplyScalar(playerPos.distanceTo(e.mesh.position)/520)||V();dir=e.mesh.position.clone().add(lead).sub(playerPos).normalize();}
  for(const side of [-1,1]){
    const origin=playerPos.clone().add(V(side*2,-.7,-4).applyQuaternion(camera.quaternion));
    const m=mesh(new THREE.CapsuleGeometry(.22,5,2,4),mats.cyan,scene,origin.toArray(),[1,1,1],false);m.quaternion.setFromUnitVectors(V(0,1,0),dir);
    shots.push({mesh:m,pos:origin,dir:dir.clone(),speed:520,life:1.8,enemy:false,damage:balance.weaponPower,side});
  }
  state.damageFlash=Math.max(state.damageFlash,.015);
}
function enemyFire(e){
  if(playerPos.distanceTo(e.mesh.position)>530)return;
  const predicted=playerPos.clone().addScaledVector(velocity,.25);const dir=predicted.sub(e.mesh.position).normalize();
  const origin=e.mesh.position.clone().addScaledVector(dir,e.radius+1);
  const m=mesh(new THREE.SphereGeometry(e.type==='basestar'?1.1:.65,6,4),mats.hot,scene,origin.toArray(),[1,1,1],false);
  shots.push({mesh:m,pos:origin,dir,speed:e.type==='basestar'?120:105,life:6,enemy:true,damage:e.type==='basestar'?16:9});audio.play('enemyShot');
}
function damagePlayer(amount){
  if(state.invincible||state.dock||state.ended)return;
  amount*=balance.enemyDamage;state.damageFlash=.6;audio.play('hit');
  if(state.shields&&state.shield>0){const blocked=Math.min(state.shield,amount*.85);state.shield-=blocked;amount-=blocked;}
  state.hull=Math.max(0,state.hull-amount);
  state.system=state.hull<35?'PHOTON TUBES DAMAGED':state.hull<60?'ION ENGINES DAMAGED':'ALL SYSTEMS NOMINAL';
  if(state.hull<=0)finishMission(false,'STARFIGHTER LOST');
}
function damageEnemy(e,amount,bypassArmor=false){
  if(!e.alive)return;
  if(!bypassArmor&&e.type==='basestar'&&playerPos.distanceTo(e.mesh.position)>260){effect(e.mesh.position,8,color.cyan);if(state.time%3<.2)notify('ARMORED CONTACT','Command ship shield rejects long-range fire. Close inside 260 metrons.');return;}
  e.hp-=amount;e.aggressive=true;e.hit=.15;effect(e.mesh.position,3,e.type==='asteroid'?color.paper:color.orange);state.hits++;
  if(e.hp<=0){e.alive=false;effect(e.mesh.position,e.type==='basestar'?70:30,color.orange);audio.play('explosion');removeEntity(e);
    if(e.type!=='asteroid'){state.kills++;state.score+=e.type==='basestar'?1500:e.type==='cruiser'?400:250;const sec=sectors[state.sector];sec.remaining=Math.max(0,sec.remaining-1);saveSector();
      if(sec.remaining===0){sec.cleared=true;state.score+=500;state.energy=Math.min(1000,state.energy+80);notify('SECTOR SECURED','Good shooting, cadet. Chart a new jump, or return to a starbase for service.');audio.play('lock');checkFinale();}
    }
  }
}
function checkFinale(){
  if(!state.finale&&sectors.every(s=>s.id===11||s.remaining===0)){
    state.finale=true;const s=sectors[11];s.cleared=false;s.remaining=3;s.fighters=3;s.cruisers=0;notify('PRIORITY SIGNAL / D3','Command ship located in LAST LIGHT. Close inside its shield and finish this.');
  }else if(state.finale&&remaining()===0)finishMission(true);
}
function effect(pos,count,c){
  for(let i=0;i<count;i++){const m=mesh(new THREE.OctahedronGeometry(.4+Math.random()*1.1),basic(i%4?c:color.paper),scene,pos.toArray(),[1,1,1],false);particles.push({mesh:m,vel:V(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(35+Math.random()*45),life:.4+Math.random()*.8,max:1.2});}
}
function finishMission(won,message){
  if(state.attract){state.attractTime=96;return;}
  if(state.ended)return;state.ended=true;state.mode='results';state.paused=true;document.exitPointerLock?.();
  const saved=sectors.filter(s=>s.type==='base'&&s.baseHealth>0).length;
  if(won)state.score+=Math.floor(state.energy)+saved*1000+Math.max(0,3000-Math.floor(state.time*4));
  const rank=won?(state.score>14000?'STAR COMMANDER':state.score>11000?'FRONTIER ACE':'STAR PILOT'):'CADET — RETURN TO DUTY';
  if($('result-eyebrow'))$('result-eyebrow').textContent=message||(won?'OPERATION LAMPLIGHT / COMPLETE':'COMMAND RECALL');
  if($('result-title'))$('result-title').textContent=won?'LANES CLEAR.':'SIGNAL LOST.';
  if($('result-rank'))$('result-rank').textContent=rank;
  $('result-copy').textContent=won?'The trade lanes are open. The stations will remember this sortie.':'Command has your flight record. Study the chart, refuel early, and take another run.';
  if($('result-network'))$('result-network').textContent=network.active?'WING SCORES / '+(network.standingsText()||'Awaiting other pilots’ debriefs…'):'';
  if($('result-stats'))$('result-stats').innerHTML=`<div><strong>${state.score.toLocaleString()}</strong><span>MISSION RATING</span></div><div><strong>${state.kills}</strong><span>CONTACTS CLEARED</span></div><div><strong>${saved}/2</strong><span>BASES SAVED</span></div><div><strong>${Math.floor(state.time/60)}:${String(Math.floor(state.time%60)).padStart(2,'0')}</strong><span>SORTIE TIME</span></div>`;
  audio.play(won?'victory':'defeat');showScreen('results');
  network.result(state.score,{Kills:state.kills,'Bases saved':saved,'Energy remaining':Math.floor(state.energy)});
}

function updateTarget(dt,assist){
  camera.getWorldDirection(forward);
  let best=null, bestValue=-Infinity;
  for(const e of entities){if(!e.alive||e.type==='asteroid')continue;const d=e.mesh.position.clone().sub(playerPos);const dist=d.length();const alignment=d.normalize().dot(forward);const value=alignment*3-dist*.0005;if(value>bestValue){best=e;bestValue=value;}}
  state.target=best;
  if(best){const d=best.mesh.position.clone().sub(playerPos).normalize();const dot=d.dot(forward);const targetLock=dot>.965?1:0;const previous=state.lock;state.lock=clamp(state.lock+dt*(targetLock?2.5:-4),0,1);if(previous<.75&&state.lock>=.75)audio.play('lock');
    if(assist){const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(playerPos,best.mesh.position,V(0,1,0)));const euler=new THREE.Euler().setFromQuaternion(q,'YXZ');let delta=THREE.MathUtils.euclideanModulo(euler.y-(state.rear?Math.PI:0)-state.yaw+Math.PI,Math.PI*2)-Math.PI;state.yaw+=delta*Math.min(1,dt*3);state.pitch=lerp(state.pitch,euler.x,Math.min(1,dt*3));}
  } else state.lock=0;
}
function updateEnemies(dt){
  for(const e of entities){if(!e.alive||e.type==='asteroid'||e.preview)continue;e.age+=dt;e.hit=Math.max(0,e.hit-dt);
    const to=playerPos.clone().sub(e.mesh.position);const dist=to.length();to.normalize();
    const tangent=V(Math.cos(e.phase+e.age*.45),Math.sin(e.phase+e.age*.6)*.55,Math.sin(e.phase+e.age*.45)).normalize();
    const speed=e.type==='basestar'?9:e.type==='cruiser'?14:24;
    const desired=to.multiplyScalar(dist>210?speed:dist<100?-speed:speed*.1).addScaledVector(tangent,speed*.75);
    e.velocity=desired;e.mesh.position.addScaledVector(desired,dt);e.mesh.lookAt(playerPos);e.mesh.rotateY(Math.PI);
    e.body.setNextKinematicTranslation(e.mesh.position);e.body.setNextKinematicRotation(e.mesh.quaternion);
    e.fire-=dt;if(e.fire<=0&&e.aggressive){enemyFire(e);e.fire=e.type==='basestar'?1.4:2.9+Math.random()*2;}
  }
}
function updateShots(dt){
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];const distance=s.speed*dt;let hit=false;
    if(s.enemy){const delta=playerPos.clone().sub(s.pos);const along=clamp(delta.dot(s.dir),0,distance);if(s.pos.clone().addScaledVector(s.dir,along).distanceTo(playerPos)<5){damagePlayer(s.damage);hit=true;}}
    else {
      const ray=new RAPIER.Ray(s.pos,s.dir);const h=world.castRay(ray,distance,true,undefined,0x00010006,playerCollider);
      if(h){const e=colliderEntities.get(h.collider.handle);if(e?.alive){damageEnemy(e,s.damage);hit=true;}}
    }
    s.pos.addScaledVector(s.dir,distance);s.mesh.position.copy(s.pos);s.life-=dt;
    if(hit||s.life<0){scene.remove(s.mesh);shots.splice(i,1);}
  }
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.rotation.x+=dt*5;p.mesh.rotation.z+=dt*3;p.mesh.scale.setScalar(Math.max(.01,p.life));if(p.life<0){scene.remove(p.mesh);particles.splice(i,1);}}
}
function updateBases(dt){
  for(const s of sectors.filter(s=>s.type==='base'&&s.baseHealth>0)){
    const foes=sectors.filter(t=>t.remaining>0&&t.type!=='finale').reduce((sum,t)=>{const distance=Math.abs(t.id%4-s.id%4)+Math.abs(Math.floor(t.id/4)-Math.floor(s.id/4));return sum+2/(distance+1);},0);if(foes===0)continue;
    s.pressure+=dt;
    if(s.pressure>75){if(!s.warned){s.warned=true;notify('STARBASE DISTRESS',s.name+' is under siege. Intercept nearby patrols to relieve pressure.');}s.baseHealth=Math.max(0,s.baseHealth-dt*foes*.12);if(s.baseHealth===0){if(station&&state.sector===s.id){scene.remove(station);station=null;}notify('STARBASE LOST',s.name+' has fallen. Protect the remaining station.');if(sectors.filter(t=>t.type==='base').every(t=>t.baseHealth<=0))finishMission(false,'ALL STARBASES LOST');}}
  }
}
function updateDemo(dt){
  state.attractTime+=dt;state.invincible=true;state.energy=1000;state.hull=100;
  if(state.ended||state.attractTime>95){startMission({attract:true});return;}
  if(state.warp||state.dock)return;
  if(state.target){updateTarget(dt,true);state.speed=playerPos.distanceTo(state.target.mesh.position)>180?35:4;fire();}
  else {demoTimer+=dt;if(demoTimer>3){demoTimer=0;let next=sectors.find(s=>s.remaining&&s.id!==state.sector);if(!next&&!state.finale){checkFinale();next=sectors[11];}if(state.attractTime>16&&state.attractTime<26)next=sectors[6];if(station&&!state.docked)dock();else if(next){state.selected=next.id;engageJump();}}}
}
function updateGame(dt){
  if(state.paused||state.ended||state.hubEnded)return;
  state.time+=dt;state.fireCooldown=Math.max(0,state.fireCooldown-dt);state.boostCooldown=Math.max(0,state.boostCooldown-dt);state.boost=Math.max(0,state.boost-dt);state.damageFlash=Math.max(0,state.damageFlash-dt);
  if(state.warp>0){state.warp=Math.max(0,state.warp-dt);camera.fov=lerp(camera.fov,105,dt*3);camera.updateProjectionMatrix();if(state.warp===0){enterSector(state.warpTarget);camera.fov=70;camera.updateProjectionMatrix();}return;}
  if(state.dock>0){state.dock=Math.max(0,state.dock-dt);playerPos.lerp(station.position.clone().add(V(0,0,48)),dt*.7);state.hull=Math.min(100,state.hull+dt*30);state.energy=Math.min(1000,state.energy+dt*240);state.shield=Math.min(100,state.shield+dt*30);if(state.dock===0){state.docked=true;state.dockVisits++;sectors[state.sector].baseHealth=Math.min(100,sectors[state.sector].baseHealth+15);state.system='ALL SYSTEMS NOMINAL';notify('SERVICE COMPLETE','Clear skies, cadet. Ship restored; station reinforced. Select a hostile sector on the chart.');audio.play('dock');}return;}
  const pad=gamepad;const ax=pad?.axes||[];
  const dead=v=>Math.abs(v||0)>.14?v:0;
  let lookX=(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0)-dead(ax[2])*1.9-touch.rx*1.7;
  let lookY=(keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0)-dead(ax[3])*1.6-touch.ry*1.5;
  state.yaw+=lookX*dt*settings.sensitivity-mouse.dx*.0022*settings.sensitivity;state.pitch+=lookY*dt*settings.sensitivity-mouse.dy*.0022*settings.sensitivity;state.pitch=clamp(state.pitch,-1.48,1.48);mouse.dx=0;mouse.dy=0;
  const assist=keys.has('KeyE')||pad?.buttons[6]?.pressed||touch.active;
  updateTarget(dt,assist);
  if(state.attract)updateDemo(dt);
  else {
    const thrust=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)-dead(ax[1])-touch.ly;
    const desired=clamp(18+thrust*48,-30,80)*(state.hull<60?.65:1)*balance.flightSpeed;
    state.speed=lerp(state.speed,desired,1-Math.exp(-dt*3));
    if(keys.has('ShiftLeft')||pad?.buttons[5]?.pressed)boost();
    if(keys.has('Space')||mouse.fire||pad?.buttons[7]?.pressed||(touch.active&&state.lock>.6))fire();
  }
  aimQuat.setFromEuler(new THREE.Euler(state.pitch,state.yaw,0,'YXZ'));
  forward.set(0,0,-1).applyQuaternion(aimQuat);right.set(1,0,0).applyQuaternion(aimQuat);
  const strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+dead(ax[0])+touch.lx;
  velocity.copy(forward).multiplyScalar(state.speed*(state.boost?3.2:1)).addScaledVector(right,strafe*38*balance.flightSpeed);
  playerPos.addScaledVector(velocity,dt);playerBody.setNextKinematicTranslation(playerPos);
  state.energy-=dt*(.35+(state.shields?.55:0)+Math.abs(state.speed)*.008)*balance.energyDrain;
  if(state.shields)state.shield=Math.min(100,state.shield+dt*2.5);
  if(state.energy<150&&!state.lowWarn){state.lowWarn=true;notify('ENERGY RESERVE LOW','Return to PORCHLIGHT or WAYSTATION. Toggle shields off to conserve power.');}
  if(state.energy<=0&&!state.invincible){state.energy=0;finishMission(false,'ENERGY DEPLETED');}
  updateEnemies(dt);physicsAccumulator+=dt;
  while(physicsAccumulator>=1/60){world.timestep=1/60;world.step(eventQueue);physicsAccumulator-=1/60;}
  eventQueue.drainCollisionEvents((a,b,started)=>{if(started&&(a===playerCollider.handle||b===playerCollider.handle)){const e=colliderEntities.get(a===playerCollider.handle?b:a);if(e?.alive){damagePlayer(e.type==='asteroid'?18:12);effect(playerPos,12,color.paper);playerPos.addScaledVector(forward,-12);}}});
  updateShots(dt);updateBases(dt);
}
function boost(){if(state.boostCooldown>0||state.energy<20)return;state.boost=1.2;state.boostCooldown=4;state.energy-=20;audio.play('shield');}
function toggleShields(){state.shields=!state.shields;audio.play('shield');notify(state.shields?'SHIELDS RAISED':'SHIELDS LOWERED',state.shields?'Deflectors online. Energy drain increased.':'Energy conservation active. Hull exposed.');}
function receiveGhost(data,from){
  if(data?.gone){const ghost=ghosts.get(from);if(ghost){scene.remove(ghost.mesh);mixers=mixers.filter(m=>m.root!==ghost.mesh);ghosts.delete(from);}return;}
  if(!data||!Array.isArray(data.p))return;
  let ghost=ghosts.get(from);if(!ghost){const m=shipModel('fighter',true);scene.add(m);ghost={mesh:m,data,seen:0};ghosts.set(from,ghost);}ghost.data=data;ghost.seen=state.time;
}
function updateGhosts(dt){for(const g of ghosts.values()){const d=g.data;g.mesh.visible=state.mode==='playing'&&d.sector===state.sector&&state.time-g.seen<5&&playerPos.distanceTo(V(...d.p))>18;if(g.mesh.visible){g.mesh.position.lerp(V(...d.p),Math.min(1,dt*12));if(d.q)g.mesh.quaternion.fromArray(d.q);}}}
function updateCamera(dt){
  if(state.mode==='title'||state.mode==='loading'){
    const t=performance.now()*.00012;camera.position.set(Math.sin(t)*2,Math.cos(t*.7),5);camera.lookAt(12,4,-110);if(entities[0]?.preview){entities[0].mesh.rotation.set(.25+Math.sin(t*3)*.08,-.9+Math.sin(t)*.15,-.25);entities[0].mesh.position.y=8+Math.sin(t*2)*2;}cockpit.visible=false;
  }else{
    camera.position.copy(playerPos);camera.quaternion.setFromEuler(new THREE.Euler(state.pitch,state.yaw+(state.rear?Math.PI:0),Math.sin(state.time*1.2)*.002,'YXZ'));cockpit.visible=!state.rear;
    const desired=state.warp?105:state.boost?83:70;camera.fov=lerp(camera.fov,desired,dt*5);camera.updateProjectionMatrix();
    cockpit.rotation.z=lerp(cockpit.rotation.z,clamp(velocity.x*.0008,-.05,.05),dt*5);
  }
  starfield.position.copy(camera.position);planet.rotation.y+=dt*.015;
}
function hud(){
  if(!$('hull-value'))return;
  $('hull-value').textContent=Math.ceil(state.hull)+'%';$('energy-value').textContent=Math.floor(state.energy).toString().padStart(4,'0');
  $('hull-fill').style.width=state.hull+'%';$('energy-fill').style.width=state.energy/10+'%';
  $('sector-label').textContent=sectorCode(state.sector)+' / '+sectors[state.sector]?.name;
  $('sector-status').textContent=state.rear?'AFT SCAN / REAR TUBES':sectors[state.sector]?.remaining?'HOSTILE CONTACTS':'SECTOR SECURE';
  if($('score-value'))$('score-value').textContent=state.score.toString().padStart(6,'0');
  $('enemy-count').textContent=remaining();
  if($('speed-value'))$('speed-value').textContent=Math.round(Math.abs(state.speed)*(state.boost?3.2:1));
  $('damage-status').textContent=state.system;
  $('objective-text').textContent=state.warp?'HYPERWARP / '+sectors[state.warpTarget].name:state.dock?'DOCKING / SYSTEM RESTORATION':state.finale?'DESTROY THE COMMAND SHIP · D3':'CLEAR THE PATROLS · DEFEND BOTH BASES';
  $('shield-status').textContent=state.shields?'◈ SHIELDS '+Math.ceil(state.shield)+'%':'◇ SHIELDS OFF';$('shield-status').classList.toggle('shield-on',state.shields);
  $('boost-fill').style.width=(1-state.boostCooldown/4)*100+'%';$('boost-status').textContent=state.boost?'AFTERBURNER ACTIVE':state.boostCooldown?'AFTERBURNER CHARGING':'AFTERBURNER READY';
  $('base-status').textContent=sectors.filter(s=>s.type==='base'&&s.baseHealth>0).length+' / 02';
  $('aft-label').classList.toggle('hidden',!state.rear);
  $('reticle')?.classList.toggle('locked',state.lock>.7);$('reticle')?.classList.toggle('hidden',state.warp>0||state.dock>0);
  $('lock-label').textContent=state.lock>.7?'TWIN PHOTONS / LOCKED':state.target?'HOLD '+(state.input==='gamepad'?'L2':'E')+' TO TRACK':'NO CONTACTS';
  const e=state.target;const targetEl=$('target-cue');
  if(e&&targetEl){const p=e.mesh.position.clone().project(camera);const vis=p.z<1&&Math.abs(p.x)<.95&&Math.abs(p.y)<.8;targetEl.classList.toggle('hidden',!vis);targetEl.style.left=((p.x+1)*50)+'%';targetEl.style.top=((-p.y+1)*50)+'%';targetEl.querySelector('.target-name').textContent=e.type==='basestar'?'COMMAND SHIP':e.type.toUpperCase();$('target-range').textContent=`${Math.round(playerPos.distanceTo(e.mesh.position))}m / ${Math.ceil(e.hp/e.maxHp*100)}%`;
    if(!vis)$('lock-label').textContent=(p.x>0?'TURN RIGHT →':'← TURN LEFT')+' / '+(state.input==='gamepad'?'L2':'E')+' TRACK';}
  else targetEl?.classList.add('hidden');
  const canDock=station&&playerPos.distanceTo(station.position)<330&&!state.dock;const canChart=!station&&sectors[state.sector]?.cleared&&!state.warp&&!state.dock;$('context-action').classList.toggle('hidden',!canDock&&!canChart);$('context-key').textContent=canDock?promptFor('dock'):state.input==='gamepad'?(settings.glyphs==='xbox'?'Y':'△'):'M';$('context-label').textContent=canDock?'DOCK & RESUPPLY':'CHART THE NEXT JUMP';
  const prompts=state.input==='gamepad'?(settings.glyphs==='xbox'?[['RT','PHOTONS'],['LT','TRACK'],['RB','BOOST'],['Y','CHART'],['☰','PAUSE']]:[['R2','PHOTONS'],['L2','TRACK'],['R1','BOOST'],['△','CHART'],['OPTIONS','PAUSE']]):[['LMB / SPACE','PHOTONS'],['E','TRACK'],['SHIFT','BOOST'],['M','CHART'],['ESC','PAUSE']];
  const signature=prompts.flat().join('');if($('control-prompts').dataset.signature!==signature){$('control-prompts').innerHTML=prompts.map(([key,label])=>`<span><kbd>${key}</kbd> ${label}</span>`).join('');$('control-prompts').dataset.signature=signature;}
  $('hit-flash').style.opacity=state.damageFlash;$('low-energy-vignette').style.opacity=state.energy<150?.4:0;
  $('jump-overlay').classList.toggle('hidden',!state.warp&&!state.dock);$('jump-overlay').querySelector('span').textContent=state.dock?'DOCKING':'HYPERWARP';$('jump-text').textContent=state.dock?'RESTORING FLIGHT SYSTEMS':sectors[state.warpTarget]?.name;
  drawRadar();
}
function promptFor(type){return state.input==='gamepad'?(settings.glyphs==='xbox'?'X':'□'):'ENTER';}
function drawRadar(){const c=$('radar');if(!c)return;const ctx=c.getContext('2d');const w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.strokeStyle='#77cbbb66';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(w/2,h/2,w*.43,h*.38,0,0,Math.PI*2);ctx.moveTo(w/2,10);ctx.lineTo(w/2,h-10);ctx.moveTo(10,h/2);ctx.lineTo(w-10,h/2);ctx.stroke();
  for(const e of entities){if(!e.alive||e.type==='asteroid')continue;const p=e.mesh.position.clone().sub(playerPos).applyQuaternion(camera.quaternion.clone().invert());const x=clamp(p.x/450,-.43,.43)*w+w/2;const y=clamp(p.z/450,-.38,.38)*h+h/2;ctx.fillStyle=e===state.target?'#f7d572':'#ff7954';ctx.beginPath();ctx.arc(x,y,e.type==='basestar'?5:3,0,7);ctx.fill();}
  ctx.fillStyle='#8ce9d5';ctx.beginPath();ctx.moveTo(w/2,h/2-6);ctx.lineTo(w/2-4,h/2+4);ctx.lineTo(w/2+4,h/2+4);ctx.fill();
}
function pollGamepad(dt){
  const pads=navigator.getGamepads?.()||[];gamepad=[...pads].find(p=>p?.connected)||null;if(!gamepad){oldButtons=[];return;}
  const pressed=gamepad.buttons.map(b=>b.pressed);const any=pressed.some(Boolean)||gamepad.axes.some(v=>Math.abs(v)>.2);
  if(any){if(!audio.context||audio.context.state==='suspended')audio.unlock();if(activity('gamepad')){oldButtons=pressed;return;}}
  const tap=i=>pressed[i]&&!oldButtons[i];
  if(tap(9)&&!pressed[8]){if(state.mode==='playing'&&!state.screen)pause();else if(state.screen==='pause')action('resume');}
  if(state.screen){
    const scrollTarget=state.screen==='about'?$('credits-content'):$(state.screen);const scrollAxis=gamepad.axes[3]||0;if(Math.abs(scrollAxis)>.2)scrollTarget.scrollTop+=scrollAxis*dt*600;
    menuRepeat-=dt;const y=gamepad.axes[1]||0;const up=pressed[12]||y<-.6,down=pressed[13]||y>.6;const left=pressed[14]||(gamepad.axes[0]||0)<-.6,rightward=pressed[15]||(gamepad.axes[0]||0)>.6;
    if((menuRepeat<=0||[12,13,14,15].some(tap))&&(up||down||left||rightward)){
      if(state.screen==='map'){state.selected=clamp(state.selected+(up?-4:down?4:left?-1:1),0,11);renderMap();document.querySelector(`[data-sector="${state.selected}"]`)?.focus();}
      else{const active=document.activeElement;if(active?.tagName==='INPUT'&&active.type==='range'&&(left||rightward)){active.value=Number(active.value)+(rightward?1:-1)*Number(active.step||.1);active.dispatchEvent(new Event('input'));}else if(active?.tagName==='SELECT'&&(left||rightward)){active.selectedIndex=(active.selectedIndex+(rightward?1:-1)+active.options.length)%active.options.length;active.dispatchEvent(new Event('input'));}else focusItem(menuFocus+(up||left?-1:1));}
      menuRepeat=.2;audio.play('select');
    }
    if(tap(0)){if(state.screen==='map')engageJump();else document.activeElement?.click();}
    if(tap(1)){if(['pause','map'].includes(state.screen)){state.paused=false;showScreen(null);}else action('back');}
  }else if(state.mode==='playing'){
    if(tap(3))openMap();if(tap(2))dock();if(tap(4))toggleShields();if(tap(1))state.rear=!state.rear;
  }
  oldButtons=pressed;
}
function loop(now){
  requestAnimationFrame(loop);const elapsed=(now-lastTime)/1000;const dt=Math.min(.05,elapsed);lastTime=now;
  if(!state.ready)return;pollGamepad(dt);
  if(state.mode==='title'&&state.screen==='title'&&!network.active&&!network.hubActive){state.idle+=elapsed;if(state.idle>=10)startMission({attract:true});}
  if(state.mode==='playing')updateGame(dt);
  updateCamera(dt);updateGhosts(dt);for(const m of mixers)m.mixer.update(dt);
  state.tip-=dt;if(state.tip<=0)$('radio')?.classList.remove('active');
  audio.update(dt,{combat:state.mode==='playing'&&!!state.target,boost:state.boost>0,speed:state.speed,paused:state.paused});
  network.update(elapsed,{sector:state.sector,p:playerPos.toArray(),q:aimQuat.toArray(),fire:state.fireCooldown>.05},state.score,`${state.kills} contacts / ${Math.floor(state.energy)} energy`);
  hudTick+=dt;if(hudTick>.05){hudTick=0;hud();}
  renderer.render(scene,camera);
}

function bindInput(){
  document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){action(b.dataset.action);return;}const s=e.target.closest('[data-sector]');if(s){state.selected=+s.dataset.sector;renderMap();return;}if(state.mode==='playing'&&!state.screen&&!touch.active&&e.target.tagName==='CANVAS'){try{renderer.domElement.requestPointerLock?.();}catch{}}});
  document.addEventListener('pointerover',e=>{const b=e.target.closest('button');if(b&&e.pointerType==='mouse'){b.focus({preventScroll:true});menuFocus=focusables().indexOf(b);}});
  window.addEventListener('keydown',e=>{
    if(activity('keyboard')){e.preventDefault();return;}audio.unlock();
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)&&e.target.tagName!=='INPUT')e.preventDefault();
    if(e.repeat)return;keys.add(e.code);
    if(state.screen){
      if(e.code==='Escape'){if(['pause','map'].includes(state.screen)){state.paused=false;showScreen(null);}else if(state.screen!=='title')action('back');}
      else if(state.screen==='map'){if(e.code==='Enter')engageJump();if(e.code==='KeyM'){state.paused=false;showScreen(null);}const dirs={ArrowUp:-4,ArrowDown:4,ArrowLeft:-1,ArrowRight:1};if(e.code in dirs){state.selected=clamp(state.selected+dirs[e.code],0,11);renderMap();}}
      else if(['ArrowDown','ArrowUp'].includes(e.code))focusItem(menuFocus+(e.code==='ArrowDown'?1:-1));
  else if(e.code==='Enter'&&e.target.tagName!=='BUTTON')document.activeElement?.click();
      return;
    }
    if(state.mode==='playing'){if(e.code==='Escape')pause();if(e.code==='KeyM')openMap();if(e.code==='KeyQ')toggleShields();if(e.code==='KeyR')state.rear=!state.rear;if(e.code==='Enter')dock();}
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();mouse.fire=false;mouse.assist=false;if(state.mode==='playing'&&!state.attract&&!network.active&&!state.paused)pause();});
  window.addEventListener('mousemove',e=>{if(e.sourceCapabilities?.firesTouchEvents||performance.now()-touch.lastTime<600)return;if((state.attract||state.mode==='title')&&Math.abs(e.movementX)+Math.abs(e.movementY)>2){activity('keyboard');return;}if(state.mode==='playing'&&!state.screen&&(document.pointerLockElement||mouse.assist)){mouse.dx+=e.movementX;mouse.dy+=e.movementY;state.input='keyboard';}});
  window.addEventListener('mousedown',e=>{if(e.sourceCapabilities?.firesTouchEvents||performance.now()-touch.lastTime<600)return;if(e.target.closest('.screen,button,input,select'))return;if(activity('keyboard'))return;audio.unlock();if(e.button===0)mouse.fire=true;if(e.button===2)mouse.assist=true;});
  window.addEventListener('mouseup',e=>{if(e.button===0)mouse.fire=false;if(e.button===2)mouse.assist=false;});window.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'){if(e.pointerType==='mouse')activity('keyboard');return;}touch.lastTime=performance.now();if(activity('touch'))return;audio.unlock();document.body.classList.add('touch');if(state.screen||e.target.closest('button'))return;touch.active=true;const v={id:e.pointerId,x:e.clientX,y:e.clientY};if(e.clientX<innerWidth/2)touch.left=v;else touch.right=v;});
  document.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')return;for(const side of ['left','right']){const t=touch[side];if(t?.id===e.pointerId){const dx=clamp((e.clientX-t.x)/75,-1,1),dy=clamp((e.clientY-t.y)/75,-1,1);if(side==='left'){touch.lx=dx;touch.ly=dy;}else {touch.rx=dx;touch.ry=dy;}}}});
  const release=e=>{if(touch.left?.id===e.pointerId){touch.left=null;touch.lx=touch.ly=0;}if(touch.right?.id===e.pointerId){touch.right=null;touch.rx=touch.ry=0;}};document.addEventListener('pointerup',release);document.addEventListener('pointercancel',release);
  for(const id of ['music','sfx','sensitivity','glyphs'])$(id)?.addEventListener('input',e=>{settings[id]=id==='glyphs'?e.target.value:Number(e.target.value);saveSettings();const output=$(id+'-output');if(output)output.textContent=id==='sensitivity'?Number(e.target.value).toFixed(1)+'×':Math.round(Number(e.target.value)*100)+'%';});
  const ids={'enemy-damage':'enemyDamage','weapon-power':'weaponPower','flight-speed':'flightSpeed','energy-drain':'energyDrain'};for(const[id,key]of Object.entries(ids))$(id)?.addEventListener('input',e=>{balance[key]=Number(e.target.value);if($(id+'-output'))$(id+'-output').textContent=balance[key].toFixed(2)+'×';});
  window.addEventListener('resize',resize);
}
function resize(){if(!renderer)return;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}

async function init(){
  try{
    await RAPIER.init();
    scene=new THREE.Scene();scene.background=new THREE.Color(0x091923);scene.fog=new THREE.Fog(0x091923,950,2400);
    camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,4000);scene.add(camera);
    renderer=new THREE.WebGPURenderer({antialias:true,alpha:false,forceWebGL:new URLSearchParams(location.search).has('webgl')});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
    await renderer.init();renderer.domElement.id='space';document.body.prepend(renderer.domElement);
    scene.add(new THREE.AmbientLight(0x91b8b0,1.8));const key=new THREE.DirectionalLight(0xffd6a6,3);key.position.set(-100,150,100);scene.add(key);const rim=new THREE.DirectionalLight(0x7cfff1,2);rim.position.set(100,-20,-100);scene.add(rim);
    mats.ink=toon(color.ink);mats.paper=toon(color.paper);mats.orange=toon(color.orange);mats.cyan=basic(color.cyan);mats.yellow=basic(color.yellow);mats.hot=basic(0xff6552);mats.darkCyan=toon(0x317a7c);mats.rock=toon(0x657b78);
    world=new RAPIER.World({x:0,y:0,z:0});eventQueue=new RAPIER.EventQueue(true);
    playerBody=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());playerCollider=world.createCollider(RAPIER.ColliderDesc.ball(4).setCollisionGroups(0x00010006).setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),playerBody);
    makeBackground();makeCockpit();sectors=createSectors();enterSector(0,true);bindInput();applySettings();syncDev();
    if(matchMedia('(pointer:coarse)').matches){document.body.classList.add('touch');state.input='touch';}
    state.ready=true;state.mode='title';$('loading')?.classList.add('hidden');
    if(network.hubActive)showScreen(null);else showScreen('title');
    requestAnimationFrame(loop);await network.init();network.ready();
  }catch(e){console.error(e);if($('loading'))$('loading').innerHTML=`<div class="load-error"><strong>FLIGHT COMPUTER OFFLINE</strong><p>${e.message}</p><p>Use a current browser with WebGPU or WebGL 2, and an internet connection for the engine libraries.</p><button onclick="location.reload()">RETRY</button></div>`;globalThis.AIHub?.fail(e.message);}
}

// Deterministic hooks exercise real game systems; they are also the pause-menu developer tools.
window.__STAR_RIDERS__={state,settings,balance,get sectors(){return sectors;},get entities(){return entities;},get network(){return network;},get audio(){return audio;},get renderer(){return renderer;},get world(){return world;},get playerPos(){return playerPos;},start:startMission,action,jump:engageJump,dock,damagePlayer,damageEnemy,fire,finish:finishMission,enterSector,checkFinale,step(dt){updateGame(dt);updateCamera(dt);hud();},setPosition(p){playerPos.fromArray(p);playerBody.setTranslation(playerPos,true);},getSnapshot(){return{mode:state.mode,ready:state.ready,screen:state.screen,sector:state.sector,remaining:remaining(),kills:state.kills,score:state.score,hull:state.hull,energy:state.energy,attract:state.attract,backend:renderer?.backend?.isWebGPUBackend?'webgpu':'webgl2',bodies:world?.bodies.len(),physicsVersion:RAPIER.version(),threeRevision:THREE.REVISION};}};
init();
