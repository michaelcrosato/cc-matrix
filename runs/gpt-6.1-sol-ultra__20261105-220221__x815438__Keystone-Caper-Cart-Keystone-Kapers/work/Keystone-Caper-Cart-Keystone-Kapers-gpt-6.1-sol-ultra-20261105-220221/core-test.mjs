import RAPIER from './test-deps/rapier/rapier.mjs';
import {ChaseGame, DEFAULTS, FLOOR} from './core.js';

const failures = [];
let checks = 0;
const worlds = [];
const check = (name, pass, detail = '') => { checks++; if (!pass) failures.push(name + (detail ? ': ' + detail : '')); };
const make = (config = {}, count = 1, stage = 1) => {
  const g = new ChaseGame(RAPIER);
  Object.assign(g.config, config);
  g.start(count);
  if (stage !== 1) { g.case = stage; g.resetWorld(); }
  worlds.push(g);
  return g;
};
const advance = (g, frames, input = {}) => {
  for (let i = 0; i < frames; i++) g.step(1 / 60, typeof input === 'function' ? input(i) : [input]);
};
const suite = (name, fn) => { try {fn();} catch(e) {check(name, false, e.stack || String(e));} };
const originalWarn = console.warn;
console.warn = () => {};
try { await RAPIER.init(); } finally { console.warn = originalWarn; }

suite('Rapier initialization and world creation', () => {
  const g = make({invincible:true}, 2);
  check('Actual Rapier 0.19.3 creates two independently simulated officers', g.players.length === 2 && g.players.every(p => p.body.isDynamic()) && RAPIER.version() === '0.19.3');
  advance(g, 90, () => [{x:-1}, {x:1}]);
  check('Both keyboard/controller input slots drive separate bodies', g.players[0].x < 0 && g.players[1].x > 16);
  check('Floor collision keeps both officers above the store floor', g.players.every(p => Number.isFinite(p.y) && p.y > -.09 && p.y < .09));
});
suite('Movement, jumping and crouching', () => {
  const g = make({invincible:true});
  g.teleport(0, -9, 0); advance(g, 8);
  let max = 0;
  for (let i = 0; i < 70; i++) {g.step(1/60,[{jump:true,x:0}]); max = Math.max(max, g.players[0].y);}
  check('Jump creates a real ballistic arc and lands on its floor', max > 1.55 && max < 2.1 && Math.abs(g.players[0].y) < .09);
  check('Held jump does not auto-repeat', g.events.jumps === 1);
  advance(g, 1, {jump:false}); advance(g, 1, {jump:true});
  check('Releasing and pressing jump produces a second jump', g.events.jumps === 2);
  advance(g, 65); advance(g, 1, {down:true});
  check('Duck shrinks the Rapier capsule and retains floor contact', g.players[0].duck && g.players[0].collider.shape.halfHeight < .1 && g.events.ducks === 1);
  advance(g, 1);
  check('Releasing duck restores the full-height capsule', !g.players[0].duck && g.players[0].collider.shape.halfHeight > .4);
});
suite('Actual sensor collision penalties and evasions', () => {
  const hit = make({hazardSpeed:0});
  hit.teleport(0, -6, 0); hit.players[0].invuln = 0;
  const before = hit.time;
  advance(hit, 1);
  check('A radio intersection deducts the configured time penalty', hit.events.hits === 1 && Math.abs(before-hit.time-DEFAULTS.hitPenalty-1/60) < .05);
  advance(hit, 20);
  check('Hit invulnerability prevents a stack of penalties', hit.events.hits === 1);
  const jump = make({hazardSpeed:0});
  jump.teleport(0,-9,0); advance(jump, 8); jump.players[0].invuln=0;
  advance(jump,1,{jump:true,x:1}); advance(jump,44,{x:1});
  check('A timed jump physically clears the radio sensor', jump.events.jumps === 1 && jump.events.hits === 0 && jump.players[0].x > -4);
  const standing = make({hazardSpeed:0},1,2);
  const plane = standing.hazards.find(h=>h.kind==='plane'&&h.floor===0);plane.x=5;
  standing.teleport(0,5,0);standing.players[0].invuln=0;advance(standing,2);
  check('A standing officer hit by a plane loses one badge', standing.events.hits === 1 && standing.lives === 3);
  const ducking = make({hazardSpeed:0},1,2);
  ducking.hazards.find(h=>h.kind==='plane'&&h.floor===0).x=5;
  ducking.teleport(0,5,0);ducking.players[0].invuln=0;advance(ducking,2,{down:true});
  check('Duck physically passes beneath the same plane sensor', ducking.players[0].duck && ducking.events.hits === 0 && ducking.lives === 4);
});
suite('Escalators, rooftop and lift travel', () => {
  const g = make({invincible:true,thiefSpeed:0});
  g.teleport(0,-13.5,0);advance(g,1,{x:-1});
  check('Running into an escalator starts its upward ride', g.players[0].ride?.type==='escalator' && g.events.escalators===1);
  advance(g,90);
  check('An escalator deposits the officer on the next physical floor', g.players[0].floor===1 && !g.players[0].ride && Math.abs(g.players[0].y-FLOOR)<.1);
  g.teleport(0,-13.5,2);advance(g,1,{x:-1});advance(g,90);
  check('The final escalator reaches the rooftop', g.players[0].floor===3 && !g.players[0].ride && Math.abs(g.players[0].y-3*FLOOR)<.1);
  const lift = make({invincible:true,thiefSpeed:0});
  lift.teleport(0,0,0);advance(lift,30);advance(lift,1,{up:true});
  check('Up enters the lift only while its door is open at that floor', lift.players[0].ride?.type==='lift' && lift.events.lifts===1);
  advance(lift,210);
  check('The automatic lift delivers a rider to its next stop', lift.players[0].floor===1 && !lift.players[0].ride && Math.abs(lift.players[0].y-FLOOR)<.1);
  const closed = make({invincible:true,thiefSpeed:0});
  closed.teleport(0,0,0);advance(closed,120);advance(closed,1,{up:true});
  check('A closed moving lift cannot be boarded', !closed.players[0].ride && closed.events.lifts===0 && !closed.lift.open);
});
suite('Loot, capture, retries and final results', () => {
  const g = make({invincible:true,thiefSpeed:0});
  g.teleport(0,0,0);advance(g,1);
  check('Recovered loot scores once and disappears from the snapshot', g.events.loot===1 && g.score===100 && g.snapshot().loot.find(l=>l.id===1).taken);
  advance(g,15);
  check('Revisiting collected loot does not score twice', g.events.loot===1 && g.score===100);
  g.teleport(0,g.thief.x,1);advance(g,1,{act:true});
  check('Cuff action closes a case and banks a timer-based score', g.state==='caught' && g.events.catches===1 && g.score>1100 && g.players[0].cuffs===1);
  advance(g,170);
  check('Case intermission creates the next complete hazard layout', g.case===2 && g.state==='playing' && g.hazards.length===10 && g.events.catches===1);
  const timeout = make({invincible:true,thiefSpeed:0});
  timeout.time=.001;advance(timeout,1);
  check('Timer expiry consumes one badge and resets the same case', timeout.lives===3 && timeout.case===1 && timeout.state==='playing' && timeout.time===DEFAULTS.roundTime);
  for(let i=0;i<3;i++){timeout.time=.001;advance(timeout,1);}
  check('Exhausting all badges produces a stable loss state', timeout.lives===0 && timeout.state==='lost');
  const escape = make({invincible:true});
  escape.thief.floor=3;escape.thief.y=3*FLOOR;escape.thief.x=15.79;escape.thief.dir=1;advance(escape,1);
  check('Rooftop escape consumes a badge and respawns the chase', escape.lives===3 && escape.state==='playing' && escape.thief.floor===1 && escape.players[0].floor===0);
});
suite('Scripted whole-game playthrough and attract loop', () => {
  const g = make();
  let frames=0;
  while(!['won','lost'].includes(g.state)&&frames++<60*180){
    const input=g.ai();
    // The finale's shortcut is a player decision: catch the first lift, then chase on foot.
    // Physics, collisions, timer, badges and all default tuning remain fully active.
    if(g.case===3&&g.players[0].floor===0&&!g.players[0].ride){input.x=Math.abs(g.players[0].x)<.3?0:Math.sign(-g.players[0].x);input.up=true;}
    g.step(1/60,[input]);
  }
  check('A full three-case scripted playthrough reaches victory with default tuning and collisions', g.state==='won' && g.case===4 && g.events.catches===3, JSON.stringify({state:g.state,case:g.case,events:g.events}));
  check('The whole-game script exercises jumps, ducks, hazards, loot, the lift and escalators', g.events.jumps>0 && g.events.ducks>0 && g.events.hits>0 && g.events.loot>0 && g.events.escalators>0 && g.events.lifts>0);
  check('Victory preserves nonnegative timer, lives and a banked final score', g.lives>0 && g.time>0 && g.score>7000 && frames<60*180);
  const attract = make();attract.start(1,true);attract.time=.001;
  advance(attract,1);
  check('Attract mode protects the clock and can never lose a badge to a hazard', attract.time>=30 && attract.lives===4 && attract.state==='playing');
  attract.thief.floor=3;attract.thief.y=3*FLOOR;attract.thief.x=15.79;attract.thief.dir=1;advance(attract,1);
  check('An attract-mode rooftop escape loops the thief without ending the demo', attract.state==='playing'&&attract.lives===4&&attract.thief.x<0);
});
for(const game of worlds)try{game.world?.free();}catch{}
if(process.argv.includes('--json'))console.log(JSON.stringify({checks,failures}));
else {for(const failure of failures)console.log('FAIL: '+failure);console.log(`${checks-failures.length}/${checks} core checks passed`);}
process.exitCode=failures.length?1:0;
