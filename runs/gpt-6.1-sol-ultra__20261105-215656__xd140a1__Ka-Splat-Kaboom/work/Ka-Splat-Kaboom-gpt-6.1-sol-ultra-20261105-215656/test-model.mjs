import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import {GameModel,DEFAULT_CONFIG,WAVE_DATA} from './model.js';
const warn=console.warn;console.warn=()=>{};await RAPIER.init();console.warn=warn;
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;}catch(error){failed++;console.error(`FAIL ${name}: ${error.message}`);}}
function make(){const events=[];const model=new GameModel(RAPIER,{onEvent:e=>events.push(e)});model.start();return {model,events};}
function run(m,seconds,inputs=[]){for(let t=0;t<seconds;t+=1/120)m.update(1/120,inputs);}
function live(m){run(m,2.3);assert.equal(m.phase,'playing');m._spawnTimer=100;}

test('full campaign catches every bomb, all special kinds, and ends',()=>{
  const {model:m,events}=make();m.setConfig({autoplay:true});
  for(let n=0;n<120*180&&m.phase!=='won';n++)m.update(1/120);
  assert.equal(m.phase,'won');assert.equal(m.stats.waves,8);
  assert.equal(m.stats.caught,WAVE_DATA.reduce((s,w)=>s+w.total,0));
  assert.equal(m.stats.missed,0);assert.equal(m.stats.perfectWaves,8);
  assert(events.some(e=>e.kind==='gust'));assert(events.some(e=>e.kind==='gold'));
  const score=m.score;run(m,1);assert.equal(m.score,score);m.dispose();
});
test('miss clears bombs, loses a bucket, and grants a breath',()=>{
  const {model:m}=make();live(m);m.spawnBomb('normal',7);m.spawnBomb('normal',-7);
  assert.equal(m.miss(),true);assert.equal(m.lives,2);assert.equal(m.bombs.length,0);assert.equal(m.combo,0);
  assert.equal(m.miss(),false);assert.equal(m.lives,2);m.dispose();
});
test('three actual misses cause stable game over',()=>{
  const {model:m}=make();live(m);
  for(let i=0;i<3;i++){m.miss();run(m,1.3);}
  assert.equal(m.phase,'lost');assert.equal(m.lives,0);run(m,5);assert.equal(m.phase,'lost');m.dispose();
});
test('lower bucket rescues a bomb that missed the top',()=>{
  const {model:m,events}=make();live(m);m._clearBombs();m.players[0].x=0;
  const bomb=m.spawnBomb('normal',0);bomb.body.setTranslation({x:0,y:1.8,z:0},true);
  run(m,.2,[{x:0}]);assert.equal(m.stats.caught,1);
  const caught=events.find(e=>e.type==='catch');assert(Math.abs(caught.y-1.5)<1e-6);m.dispose();
});
test('splash is charged, wide, temporary, and not repeatable',()=>{
  const {model:m}=make();live(m);m._clearBombs();const bomb=m.spawnBomb('normal',2.5);bomb.body.setTranslation({x:2.5,y:3.7,z:0},true);
  assert.equal(m.splash(),true);assert.equal(m.splash(),false);run(m,.15,[{x:0}]);
  assert.equal(m.stats.caught,1);assert.equal(m.stats.splashes,1);assert(m.charge<1);run(m,1.2);assert.equal(m.players[0].splashTime,0);m.dispose();
});
test('active splash preserves a late rescue by a lower bucket',()=>{
  const {model:m}=make();live(m);m._clearBombs();
  const bomb=m.spawnBomb('normal',0);bomb.body.setTranslation({x:0,y:1.8,z:0},true);
  m.splash();run(m,.2,[{x:0}]);assert.equal(m.stats.caught,1);m.dispose();
});
test('high-frequency input queues a splash until a physics step',()=>{
  const {model:m}=make();live(m);m._accumulator=0;
  m.update(.001,[{x:0,splash:true}]);m.update(.009,[{x:0}]);assert.equal(m.stats.splashes,1);m.dispose();
});
test('gold grants bonus points and splash charge',()=>{
  const {model:m}=make();live(m);m._clearBombs();m.charge=0;
  const bomb=m.spawnBomb('gold',0);bomb.body.setTranslation({x:0,y:2.5,z:0},true);
  run(m,.1,[{x:0}]);assert.equal(m.stats.golden,1);assert.equal(m.score,110);assert.equal(m.charge,.38);m.dispose();
});
test('score threshold restores one lost bucket',()=>{
  const {model:m}=make();live(m);m._clearBombs();m.lives=2;m.score=995;
  const bomb=m.spawnBomb('normal',0);bomb.body.setTranslation({x:0,y:1.6,z:0},true);
  run(m,.1,[{x:0}]);assert.equal(m.lives,3);assert.equal(m.stats.repairs,1);m.dispose();
});
test('pause freezes simulation and resumes both play and wave cards',()=>{
  const {model:m}=make();m.pause(true);const time=m.time;run(m,1);assert.equal(m.time,time);m.pause(false);assert.equal(m.phase,'intermission');
  live(m);m.pause();const snap=m.snapshot();run(m,1);assert.equal(m.time,snap.time);m.pause(false);assert.equal(m.phase,'playing');m.dispose();
});
test('co-op can catch using player two and configuration remains bounded',()=>{
  const {model:m}=make();m.start({coop:true});live(m);m._clearBombs();
  const bomb=m.spawnBomb('normal',3);bomb.body.setTranslation({x:3,y:2.5,z:0},true);
  run(m,.1,[{x:-3},{x:3}]);assert.equal(m.stats.caught,1);
  m.setConfig({fallSpeed:999,bucketWidth:-5,moveSpeed:NaN});assert.equal(m.config.fallSpeed,3);assert.equal(m.config.bucketWidth,.65);assert.equal(m.config.moveSpeed,24);
  m.resetConfig();assert.deepEqual(m.config,DEFAULT_CONFIG);m.dispose();
});
test('attract cannot lose and the eight-wave finale remains reachable',()=>{
  const {model:m}=make();m.start({attract:true});live(m);m.miss();assert.equal(m.lives,3);
  for(let i=0;i<8;i++)m.nextWave();assert.equal(m.phase,'won');m.dispose();
});
console.log(`${passed+failed} model checks: ${passed} passed, ${failed} failed`);
if(failed)process.exitCode=1;
