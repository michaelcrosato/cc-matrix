import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Engine, checkModel, validateClip, analyzeClip, HERO_RIG, compileClips, parseSong, validateTexture, HERO_MODEL } from '../../pixel-engine.js';
import { App } from '../../src/app.js';
import { Dot, BalanceBot, rng } from '../../src/core/dot.js';
import { Tunables, REGISTRY, DEFAULTS } from '../../src/core/tunables.js';
import { ActivityRun, ActivityBot } from '../../src/core/activity.js';
import { ACTIVITIES, BY_ID } from '../../src/data/activities.js';
import { LINES, ALL_LINES } from '../../src/data/lines.js';
import { Save, guest, award, confess, nextDay, recordMorning, SAVE_KEY } from '../../src/core/save.js';
import { UNLOCKS, MEDLEY } from '../../src/data/week.js';
import { OWN_MODELS, MODELS } from '../../src/art/models.js';
import { OWN_CLIPS } from '../../src/art/clips.js';
import { tile } from '../../src/art/textures.js';
import { SONGS } from '../../src/audio/songs.js';
import { syllabify } from '../../src/audio/voice.js';
const pump=async(e,n=1)=>{for(let j=0;j<n;j++){e.step(1);await Promise.resolve();}};
async function settle(e){for(let j=0;j<4;j++){await Promise.resolve();if(e.game.app.loading)await e.game.app.loading;}await pump(e,1);}
async function key(e,k){e.input.setKey(k,true);await pump(e);e.input.setKey(k,false);await pump(e);await settle(e);}
export async function runHeadless(check){
 await check('engine byte identical',()=>{const wanted=readFileSync('vendor/pixel-engine.sha256','utf8').split(' ')[0];assert.equal(createHash('sha256').update(readFileSync('pixel-engine.js')).digest('hex'),wanted);});
 for(const skill of ['idle','average','good','expert'])await check('dot distribution '+skill,()=>{let total=0;for(let seed=1;seed<=40;seed++){const random=rng(seed),dot=new Dot(random),bot=new BalanceBot(skill,random);let inside=0;for(let k=0;k<35*60;k++){const u=bot.read(dot,1/60);dot.step(1/60,u.x,u.y,new Tunables());if(k>120&&Math.hypot(dot.x,dot.y)<=.3)inside++;}total+=inside/(33*60);}const mean=total/40;if(skill==='idle')assert(mean<.2,mean);if(skill==='average')assert(mean>.35&&mean<.65,mean);if(skill==='good')assert(mean>.80,mean);if(skill==='expert')assert(mean>.95,mean);});
 for(const m of OWN_MODELS)await check('model '+m.id,()=>assert.deepEqual(checkModel(m,{catalog:MODELS}).problems,[]));
 await check('tile texture',()=>assert.deepEqual(validateTexture(tile).problems,[]));
 for(const c of OWN_CLIPS)await check('clip validation '+c.name,()=>assert.deepEqual(validateClip(c,HERO_RIG),[]));
 for(const [id,s]of Object.entries(SONGS))await check('song '+id,()=>{parseSong(s);assert(Object.values(s.tracks).reduce((a,t)=>a+t.volume,0)*.1*.8>=.03);});
 await check('line bank',()=>{assert(ALL_LINES.length>=120);for(const a of ACTIVITIES)assert(LINES[a.id].length>=6);for(const s of ALL_LINES)assert(s.length<=156,s);});
 await check('voice deterministic syllables and rising question',()=>{const a=syllabify('Please stand.','Ounce');assert.deepEqual(a,syllabify('Please stand.','Ounce'));const q=syllabify('Please stand?','Ounce');assert(q.at(-1).f0>a.at(-1).f0);assert(syllabify('Please stand.','Ounce')[0].f0>syllabify('Please stand.','Coach')[0].f0);});
 for(const a of ACTIVITIES)await check('activity idle / sloppy / expert '+a.id,()=>{const results=[];for(const skill of ['idle','sloppy','expert']){const run=new ActivityRun(a,new Tunables(),{seed:200}),bot=new ActivityBot(skill,200);for(let k=0;k<10000&&!run.done;k++)run.step(1/60,bot.read(run,1/60));assert(run.done);const result=run.result();assert(Number.isFinite(result.score));assert(result.score>=0);if(['pose','long','step','jog','reps'].includes(a.kind))assert(result.score<=100.01,result.score);results.push(result);}assert.equal(results[0].stars,0);assert(results[2].stars>=2,JSON.stringify(results));assert(results[1].score<results[2].score,JSON.stringify(results));const g=guest();const r=award(g,a,results[2],new Tunables());assert.equal(g.drips,2+3*results[2].stars+Math.floor(results[2].seconds/30)+(r.bonus?5:0));});
 await check('save corrupt, storage blocked, reload',()=>{const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},s=new Save(storage);s.data.slots[1]=guest('June',2);s.data.slots[1].day=4;s.write();assert.equal(new Save(storage).data.slots[1].day,4);memory.set(SAVE_KEY,'{bad');assert.equal(new Save(storage).data.slots[1],null);const no=new Save({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});no.write();assert.equal(no.data.version,1);});
 await check('wobble age and exact confession',()=>{const e=guest(),a=guest();for(let d=0;d<7;d++){e.morning=a.morning=false;recordMorning(e,.97,.5);recordMorning(a,.45,.5);}assert(e.ages.at(-1)<a.ages.at(-1));const before=[...a.ages];confess(a);assert.deepEqual(a.ages,before.map(x=>x-7));confess(a);assert.deepEqual(a.ages,before.map(x=>x-7));});
 let app,e;await check('headless engine boots real title',async()=>{app=new App();e=await Engine.headless(app.first(),{camera:app.first().camera(),seed:271828});e.step(2);assert.equal(app.state().scene,'title');assert.equal(e.audio.volume.music,.10);assert.equal(e.errors.length,0);});
 if(!e)return;
 await check('all authored clips analyzed on real rig',async()=>{const root=(await app.scene.ctx.loadModel(HERO_MODEL,{castShadow:false})).scene,clips=compileClips(OWN_CLIPS,HERO_RIG,root);for(let i=0;i<OWN_CLIPS.length;i++){const p=analyzeClip(root,HERO_RIG,OWN_CLIPS[i],clips[i]).problems;assert.deepEqual(p,[],OWN_CLIPS[i].name+': '+JSON.stringify(p));}});
 await check('menus: new residency through real keys',async()=>{await key(e,'Enter');assert.equal(app.menu.kind,'main');await key(e,'Enter');assert.equal(app.menu.kind,'slots');await key(e,'Enter');assert.equal(app.menu.kind,'name');app.nameValue='Tester';app.menu.selection=29;await key(e,'Enter');await settle(e);assert.equal(app.menu.kind,'avatar');app.menu.selection=1;await key(e,'Enter');await settle(e);assert.equal(app.scene.id,'ferry');await key(e,'Enter');await settle(e);assert.equal(app.scene.id,'weighin');});
 await check('full week: mornings, all activities, goals, unlocks, ending and week two',async()=>{
  if(!app.guest){app.guest=guest('Tester');app.mode='week';app.save.data.slots[0]=app.guest;}app.setDriver('expert');const visited=new Set();
  for(let day=1;day<=7;day++){
   app.guest.day=day;app.guest.morning=false;await app.go('weighin');await key(e,'Enter');e.step(905);assert.equal(app.scene.phase,'question','day '+day);await key(e,'Enter');assert.equal(app.guest.ages.length,day);await key(e,'Enter');await settle(e);if(app.dialogue){await key(e,'Enter');await key(e,'Enter');}
   if(app.scene.id!=='hub')await app.go('hub');
   for(const a of ACTIVITIES.filter(a=>a.day===day&&a.id!=='long')){
    await app.go('activity',{id:a.id});app.scene.practice=false;await key(e,'Enter');e.step(181);for(let n=0;n<6500&&app.scene.phase!=='results';n++)e.step(1);assert.equal(app.scene.phase,'results',a.id);assert(app.lastResult.stars>=2,a.id);assert(app.guest.played[a.id]);visited.add(a.id);
   }
   if(day===6){await app.go('activity',{id:'tree',hard:true});app.scene.practice=false;await key(e,'Enter');e.step(2200);assert.equal(app.scene.phase,'results');}
   if(day===7){await app.go('activity',{id:'long'});app.scene.practice=false;await key(e,'Enter');e.step(6100);assert.equal(app.scene.phase,'results');app.scene.resultAction(2);await settle(e);assert.equal(app.scene.id,'ending');const before=[...app.guest.ages];e.step(750);assert(app.guest.confessed);assert.deepEqual(app.guest.ages,before.map(x=>x-7));e.step(900);assert.equal(app.scene.phase,'credits');await key(e,'Enter');await settle(e);assert.equal(app.guest.week,2);assert.equal(app.guest.day,1);}
   else {assert(app.guest.today.length>0);await app.go('report');await key(e,'Enter');await settle(e);assert.equal(app.guest.day,day+1);}
  }
  assert.equal(visited.size,16);assert(app.guest.drips>=175);assert.equal(app.guest.items.length,7);
 });
 await check('all presentation scenes run',async()=>{for(const id of ['hub','jar','records','locker','animation','join','report']){await app.go(id);e.step(5);assert.equal(e.errors.length,0,id);app.closeMenu();}});
 await check('pause freezes fixed game time, resumes exactly',async()=>{app.mode='dropin';await app.go('activity',{id:'tree'});app.scene.practice=false;await key(e,'Enter');e.step(500);await key(e,'Escape');const t=app.scene.lanes[1].run.t;assert.equal(e.timeScale,0);e.step(100);assert.equal(app.scene.lanes[1].run.t,t);await key(e,'Enter');assert(e.timeScale>0);e.step(60);assert(app.scene.lanes[1].run.t>t);});
 await check('pause also restores plaza and Medley music',async()=>{await app.go('hub');app.pause();assert.equal(e.audio.playing,'');app.closeMenu();assert.equal(e.audio.playing,'plaza');app.mode='family';await app.go('medley');app.pause();app.closeMenu();assert.equal(e.audio.playing,'still');});
 await check('all tunables reset and dev tool pages',()=>{for(const [tab,fields]of Object.entries(REGISTRY)){for(const [k,[d,min,max,step]]of Object.entries(fields))app.tunables[k]=max;app.tunables.reset(tab);for(const [k,[d]]of Object.entries(fields))assert.equal(app.tunables[k],d);}for(let i=0;i<7;i++){app.devMenu(i);e.step(1);assert.equal(app.menu.kind,'dev');}app.closeMenu();});
 await check('local four-lane medley and display-only ghosts',async()=>{app.mode='family';app.family=[{type:'bot',name:'One',skill:'expert'},{type:'bot',name:'Two',skill:'good'},{type:'bot',name:'Three',skill:'average'},{type:'bot',name:'Four',skill:'sloppy'}];await app.go('medley');e.step(11200);assert.equal(app.scene.phase,'podium');for(const score of app.scene.totals)assert(score>=0&&score<=3000,score);assert(new (await import('../../src/core/drivers.js')).GhostDriver().displayOnly);});
 await check('attract starts after 10 seconds, loops and exits on input',async()=>{await app.go('title');e.step(605);await settle(e);assert(app.attract);for(let i=0;i<10;i++){e.step(845);await settle(e);assert.equal(e.errors.length,0);}await key(e,'KeyX');assert(!app.attract);assert.equal(app.scene.id,'title');});
 await check('menu attract, no attract in class, and pointer exit',async()=>{await app.go('title');app.settingsMenu();e.step(605);await settle(e);assert(app.attract);e.input.setPointer(.8,.5);e.step(2);await settle(e);assert(!app.attract);await app.go('activity',{id:'tree'});app.scene.phase='play';e.step(700);assert(!app.attract);});
 await check('live designer values affect physics and tools award unlocks',async()=>{const low=new Dot(rng(9)),high=new Dot(rng(9)),t=new Tunables();t.dotNoise=0;t.dotInstability=0;t.dotAuthority=1;for(let i=0;i<60;i++)low.step(1/60,1,0,t);t.dotAuthority=5;for(let i=0;i<60;i++)high.step(1/60,1,0,t);assert(high.x>low.x*2);app.guest=guest('Designer');app.devMenu(5,0);app.menu.rows[3].action();assert.equal(app.guest.drips,50);assert(app.guest.items.includes('Towel cape'));app.menu.rows[4].action();assert.equal(app.guest.items.length,7);assert.equal(app.guest.day,7);app.closeMenu();});
 await check('all tray boards and third cup resolve as data',()=>{for(const [seed,hard]of[[200,false],[201,false],[200,true]]){const r=new ActivityRun(BY_ID.tray,new Tunables(),{seed,hard});assert.equal(r.trayCups.length,hard?3:2);if(seed===201)assert(r.trayWalls.length>0);while(!r.done)r.step(1/60,{x:0,y:0});assert(Number.isFinite(r.score));}});
 await check('activity recording deterministic replay',async()=>{app.setDriver('expert');app.mode='dropin';await app.go('activity',{id:'tree',demo:true});app.scene.phase='play';e.step(300);const recording=e.recording(),end=app.scene.fingerprint();await e.replay(recording,async()=>{await app.go('activity',{id:'tree',demo:true});app.scene.phase='play';});assert.equal(app.scene.fingerprint(),end);});
 e.dispose?.();app.dispose();
}
