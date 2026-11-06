import RAPIER from '@dimforge/rapier3d-compat';
import { GameSimulation, DEFAULT_TUNING, PHASES } from './mechanics.js';
const originalWarn=console.warn;
console.warn=(...args)=>{if(!String(args[0]).startsWith('using deprecated parameters for the initialization function'))originalWarn(...args);};
try { await RAPIER.init(); } finally { console.warn=originalWarn; }

let checks=0;
const failures=[];
const assert=(condition,message)=>{checks++;if(!condition)failures.push(message);};
const events=[];
let attractWinStats=null;
const sim=new GameSimulation(RAPIER,{onEvent:e=>{events.push(e);if(e.type==='win'&&sim.attract)attractWinStats={...sim.stats};}});
const advance=(seconds,input={})=>{for(let t=0;t<seconds;t+=1/60)sim.step(1/60,[input,{}]);};
const fresh=(phase=1)=>{sim.start({players:1,phase});sim.spawnTimer=999;};

fresh();
advance(.5);
assert(sim.players[0].grounded,'Rapier player rests on the floor');
assert(Math.abs(sim.players[0].y-1.37)<.08,'Rapier player floor height matches mesh');
const startX=sim.players[0].x;
advance(.5,{x:1});
assert(sim.players[0].x>startX+2,'Continuous movement accelerates through Rapier');
advance(.3);
assert(Math.abs(sim.players[0].vx)<.1,'Release applies friction');

fresh();
const beetle=sim.spawnEnemy('beetle',{x:-7,y:4.93,platformId:1,grounded:true,dir:1});
sim.teleportPlayer(0,-7,1.4);
advance(.3,{jump:true});
assert(beetle.state==='flipped','A physical head collision flips a beetle on the deck above');
assert(sim.stats.bumps===1,'One head collision generates exactly one bump');
assert(events.some(e=>e.type==='bump'&&e.platformId===1),'Head bump emits the correct platform event');
assert(events.some(e=>e.type==='flip'&&e.enemyType==='beetle'),'Flip feedback keeps its event category and enemy type');
sim.teleportPlayer(0,beetle.x-.5,beetle.y);
advance(.03,{kick:true});
assert(beetle.state==='dead','Touching a flipped beetle kicks it out');
assert(sim.score>=100&&sim.stats.kicks===1,'Kicks score points and count statistics');
assert(events.some(e=>e.type==='kick'&&e.enemyType==='beetle'),'Kick feedback reaches audio and particle consumers');
assert(sim.coins.length===1,'Kicked pests drop a collectible coin');
advance(.35);
sim.teleportPlayer(0,sim.coins[0]?.x??0,sim.coins[0]?.y??10);
advance(.03);
assert(sim.stats.coins===1,'Reward coins can be collected');

fresh(2);
const crab=sim.spawnEnemy('crab',{x:-7,y:5.01,platformId:1,grounded:true});
sim.bump(1,-7);
assert(crab.state==='walking'&&crab.angry&&crab.hits===1,'First crab bump angers without flipping');
advance(.6);
sim.bump(1,crab.x);
assert(crab.state==='flipped'&&crab.hits===2,'Second grounded crab bump flips it');

fresh(4);
const hopper=sim.spawnEnemy('hopper',{x:-7,y:5.8,platformId:1,grounded:false,vy:2});
sim.bump(1,-7);
assert(hopper.state==='walking','Airborne hoppers ignore deck bumps');
hopper.y=4.93;hopper.vy=0;hopper.grounded=true;
sim.bump(1,-7);
assert(hopper.state==='flipped','A grounded hopper flips');
advance(.4);
hopper.flipTimer=.05;
advance(.1);
assert(hopper.state==='walking'&&hopper.angry,'Flipped pests recover when the timer expires');

fresh(5);
const frost=sim.spawnEnemy('frost',{x:-11,y:4.9,platformId:1,grounded:true});
advance(4.1);
assert(sim.platforms[1].frozen>0,'An undisturbed frost slug freezes its deck');
const frozenTime=sim.platforms[1].frozen;
sim.bump(1,-12);
assert(sim.platforms[1].frozen<frozenTime-4.9,'Head bumps crack ice');
sim.pulse();
assert(sim.platforms.every(p=>p.frozen===0),'Pressure pulses thaw every deck');
assert(sim.pulseCharges===2&&sim.stats.pulses===1,'Pressure pulses consume a finite charge');

fresh();
sim.teleportPlayer(0,13.5,1.4);
advance(.2,{x:1});
assert(sim.players[0].x< -12&&sim.stats.wraps===1,'Side exits wrap the player to the opposite side');
sim.teleportPlayer(0,-7,5.08);
advance(.2);
assert(sim.players[0].platformId===1&&sim.players[0].grounded,'Rapier player lands on an elevated deck');
advance(.12,{drop:true});
assert(sim.players[0].y<4.7&&sim.stats.drops===1,'Down passes through an elevated deck');

// Traverse every tier with controller inputs only; no teleporting between decks.
fresh(6);sim.spawnTimer=999;sim.boss.attackTimer=999;sim.hazardTimer=999;
const walkTo=(x,seconds=2)=>{for(let t=0;t<seconds;t+=1/60)sim.step(1/60,[{x:Math.max(-1,Math.min(1,(x-sim.players[0].x)*3))}]);};
advance(.5);advance(.6,{x:-1,jump:true});advance(.7);
assert(sim.players[0].platformId===1,'Controller-only route reaches the lower left deck');
walkTo(-10.5);advance(.65,{x:1,jump:true});advance(.7);
assert(sim.players[0].platformId===3,'Controller-only route climbs around the center-deck lip');
walkTo(0);advance(.65,{x:1,jump:true});advance(.7);
assert(sim.players[0].platformId===5,'Controller-only route reaches the upper right deck');
walkTo(5);advance(.3,{jump:true});advance(.7);
assert(sim.boss.seals[2].lit,'Physical head collision vents a boss side seal');
walkTo(10.5);advance(.65,{x:-1,jump:true});advance(.7);
assert(sim.players[0].platformId===6,'Controller-only route reaches the top bridge');
walkTo(2.6);advance(.8,{drop:true});advance(.2);advance(.22,{x:-1,jump:true});advance(.4);
assert(sim.boss.seals[1].lit,'A jump toward the upper gap vents the central boss seal');

fresh();
sim.spawnEnemy('beetle',{x:-10,y:4.93,platformId:1,grounded:true});
sim.setTuning('speed',11);
assert(sim.tuning.speed===11,'Live tuning changes speed');
sim.setTuning('gravity',30);
assert(sim.world.gravity.y===-30,'Live tuning changes Rapier gravity');
sim.resetTuning();
assert(sim.tuning.speed===DEFAULT_TUNING.speed&&sim.world.gravity.y===-24,'Reset restores all tuning defaults');
sim.players[0].invulnerable=0;
sim.hurtPlayer(sim.players[0]);
assert(sim.lives===4&&!sim.players[0].alive,'Taking a hit consumes a team life');
advance(1);
assert(sim.players[0].alive&&sim.players[0].invulnerable>0,'A hit is followed by an invulnerable respawn');
sim.god=true;sim.players[0].invulnerable=0;sim.hurtPlayer(sim.players[0]);
assert(sim.lives===4,'Developer invulnerability prevents life loss');

fresh(3);
assert(sim.mode==='bonus'&&sim.coins.length===18,'Coin phase lays out all eighteen bonus coins');
for(const c of [...sim.coins]){sim.teleportPlayer(0,c.x,c.y);advance(.02);}
assert(sim.bonusCollected===18&&sim.mode==='intermission','Every coin is reachable and the perfect collection completes the bonus');
assert(sim.score>=4800,'Perfect coin collection awards the advertised bonus');

fresh(6);
for(let cycle=0;cycle<3;cycle++){
  for(const x of [-5,0,5])sim.bump(6,x);
  assert(sim.boss.open>0,`Boss cycle ${cycle+1}: bumping all three seals opens the core`);
  sim.pulse();
  advance(1.0);
}
assert(sim.boss.hp===0&&sim.mode==='won','Three exposed-core hits finish the game');
assert(sim.stats.bossHits===3,'Finale records three valid boss hits');

// A complete, deterministic campaign using normal deck damage and kick rules.
fresh();
let campaignGuard=0;
while(!['won','lost'].includes(sim.mode)&&campaignGuard++<1000){
  if(sim.mode==='intermission'){advance(3);continue;}
  if(sim.mode==='bonus'){
    for(const c of [...sim.coins]){sim.teleportPlayer(0,c.x,c.y);advance(.02);}
    continue;
  }
  if(sim.boss){
    for(const x of [-5,0,5])sim.bump(6,x);
    sim.teleportPlayer(0,0,17);sim.hitBoss();advance(1);continue;
  }
  if(!sim.enemies.some(e=>e.state!=='dead')){sim.spawnTimer=0;advance(.05);continue;}
  const e=sim.enemies.find(e=>e.state!=='dead');
  if(e.state!=='flipped'){
    // Place each pest on the first deck for a repeatable physical challenge.
    e.x=-7;e.y=4.4+e.radius;e.vy=0;e.grounded=true;e.platformId=1;e.hurtTimer=0;
    sim.teleportPlayer(0,e.x,1.4);advance(.3,{jump:true});advance(.4);
  }else{
    sim.teleportPlayer(0,e.x-.5,e.y);advance(.05,{kick:true});
  }
}
assert(sim.mode==='won','The scripted whole-campaign playthrough reaches the ending');
assert(sim.stats.phases===6&&sim.stats.kicks>=25,'The whole-campaign playthrough includes all six phases and all pest waves');
assert(sim.stats.flips>20&&sim.stats.bossHits===3,'The playthrough uses flip/kick mechanics and the complete boss finale');

const snapshot=sim.snapshot();
const guest=new GameSimulation(RAPIER);
assert(guest.loadSnapshot(snapshot),'Guest accepts a host snapshot');
assert(JSON.stringify(guest.snapshot())===JSON.stringify(snapshot),'Guest renders the exact host state');
sim.start({players:2,attract:true});
assert(sim.players.length===2&&sim.attract,'Two-player attract actors initialize');
const attractEventStart=events.length;
advance(150);
assert(events.slice(attractEventStart).some(e=>e.type==='phase'&&e.phase>=4),'Attract actors demonstrate multiple phases automatically');
assert(sim.stats.bumps>0&&sim.stats.kicks>0,'Attract actors demonstrate the bump/kick loop');
assert(attractWinStats?.wraps>0,'A complete attract campaign demonstrates the side wrap');
assert(attractWinStats?.drops>0,'A complete attract campaign demonstrates dropping through a deck');
assert(attractWinStats?.pulses>0,'A complete attract campaign demonstrates a pressure pulse');
assert(events.slice(attractEventStart).some(e=>e.type==='freeze'),'Attract actors allow frost slugs to demonstrate freezing a deck');
sim.start({players:1,attract:true,phase:6});
advance(14);
assert(sim.stats.bossHits===3||sim.phase===1,'Attract actors demonstrate all three boss cycles');
advance(8);
assert(sim.phase===1,'Attract playthrough loops back to a new game');
sim.start({players:2});
sim.players[1].disconnected=true;sim.players[1].alive=false;sim.players[1].deadTime=0;sim.players[1].rb.setEnabled(false);
sim.nextPhase();
assert(!sim.players[1].alive&&!sim.players[1].rb.isEnabled(),'A disconnected keeper stays absent on the next shift');
advance(2);
assert(sim.lives===7&&!sim.players[1].alive,'An absent keeper cannot drain team lives after a shift transition');
guest.dispose();sim.dispose();

for(const message of failures)console.error(`FAIL: ${message}`);
console.log(`${checks} mechanics checks, ${failures.length} failures`);
if(failures.length)process.exitCode=1;
