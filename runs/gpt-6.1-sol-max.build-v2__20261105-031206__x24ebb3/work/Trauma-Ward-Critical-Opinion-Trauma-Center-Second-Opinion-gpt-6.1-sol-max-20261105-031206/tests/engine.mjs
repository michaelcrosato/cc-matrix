import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {Engine} from '../pixel-engine.js';
import {createGame} from '../game.js';
import {OPS} from '../src/content/ops.js';
import {SCENES} from '../src/content/story.js';
export async function run(test){
 await test('native engine headless run and exact replay',()=>{execFileSync('node',['check.mjs','--headless','game.js','--keys','Enter*1,Space*1,Enter*1,Space*1'],{stdio:'pipe',timeout:60000,maxBuffer:8*1024*1024});});
 await test('native engine browser check',()=>{execFileSync('node',['check.mjs','dist/game.html','--keys','Enter*1,Space*1,Enter*1,Space*1'],{stdio:'pipe',timeout:160000,maxBuffer:8*1024*1024});});
 await test('native model contact sheets',()=>{execFileSync('node',['check.mjs','--sheets','src/content/models.js'],{stdio:'pipe',timeout:60000,maxBuffer:8*1024*1024});});
 await test('whole rendered campaign plays every scene and case to credits',async()=>{
  const e=await Engine.headless(createGame()),a=e.game;try{
   a.newShift('Resident');for(let i=0;i<10;i++){
    assert.equal(a.screen,'story');assert.equal(a.episode,i);
    for(const beat of SCENES[i].beats){assert.ok(beat.who&&beat.say);a.advanceStory(true);e.step(1);}
    assert.equal(a.screen,'briefing');a.startOperation(OPS[i],{campaign:true});a.botPlays=true;a.simSpeed=3;
    for(let n=0;n<6000&&a.screen==='operation';n++)e.step(1);
    assert.equal(a.screen,'results',OPS[i].id+': '+a.status());assert.equal(a.sim.status,'saved',OPS[i].id+': '+a.sim.cause);assert.ok(a.save.cleared[OPS[i].id]);a.afterResults();
   }
   assert.equal(a.episode,10);for(const beat of SCENES[10].beats){a.advanceStory(true);e.step(1);}assert.equal(a.screen,'credits');assert.ok(a.save.finished);assert.equal(Object.keys(a.save.cleared).length,10);assert.deepEqual(e.errors,[]);
  }finally{e.dispose();}
 });
}
