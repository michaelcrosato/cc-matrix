/** Native engine + actual bundled app, using the supported DOM-free draw stand-in. */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url);
const plain=value=>JSON.parse(JSON.stringify(value));
function virtualAction(action){return {tagName:'BUTTON',dataset:{action},closest:()=>null,classList:{toggle(){}},focus(){}};}
export async function runEngineTests(){
 const results=[],logs=[],warnings=[],pads=[];
 const makePad=index=>({index,id:'Native standard pad '+index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0});
 const test=async(name,fn)=>{try{await fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.stack||String(error)});}};
 const ctx={
  console:{log:(...v)=>logs.push(v.join(' ')),warn:(...v)=>warnings.push(v.join(' ')),error:(...v)=>warnings.push(v.join(' '))},
  navigator:{getGamepads:()=>pads},crypto:webcrypto,performance,setTimeout,clearTimeout,setInterval,clearInterval,TextEncoder,TextDecoder,
 };
 vm.createContext(ctx);
 let app,game;
 await test('native engine and actual shipped classic-script bundle boot headlessly',async()=>{
  vm.runInContext(readFileSync(new URL('vendor/my-3d2dge.js',root),'utf8'),ctx,{filename:'vendor/my-3d2dge.js'});
  // Do not transform the bundle here: a stray ESM export must fail just as it does in the exported HTML.
  vm.runInContext(readFileSync(new URL('game.bundle.js',root),'utf8'),ctx,{filename:'game.bundle.js'});
  await Promise.resolve();await Promise.resolve();app=ctx.__OI;game=app.game;game.advance(.5);
  assert(app);assert(game.headless);assert.equal(game.o.draw,true);assert.equal(app.ui.screen,'title');assert.equal(game.sceneName,'cabinet');assert.equal(game.errors.length,0);
 });
 if(!app){return {passed:0,failed:results.length,results,logs,warnings};}
 try{
  await test('native input confirms launch and starts a clean campaign',()=>{
   // DOM menu rows are replaced only by focus-target stand-ins. The real Interface.update and native Input route confirm.
   app.ui.rows=[virtualAction('launch')];game.input.tap('confirm');game.advance(.025);assert.equal(app.ui.screen,'launch');
   app.ui.rows=[virtualAction('start')];game.advance(.25);game.input.tap('confirm');game.advance(.025);assert.equal(app.ui.screen,'play');assert(app.activeRun);assert.equal(app.world.assisted,false);assert.equal(app.world.players.length,1);assert.equal(app.world.score,0);
  });
  await test('native movement and held fire drive simulation without draw errors',()=>{
   game.advance(.2);const x=app.world.players[0].x;game.input.hold('right');game.input.hold('fire');game.advance(.6);game.input.hold('right',false);game.input.hold('fire',false);assert(app.world.players[0].x>x+40);assert(app.world.stats.shots>0);assert.equal(game.errors.length,0);
  });
  await test('native pause freezes standalone simulation and settings preserve it',()=>{
   game.input.tap('pause');game.advance(.025);assert.equal(app.ui.screen,'pause');const tick=app.world.tick;game.advance(.5);assert.equal(app.world.tick,tick);
   app.ui.activate('settings');game.advance(.5);assert.equal(app.ui.screen,'settings');assert.equal(app.world.tick,tick);app.ui.activate('back');assert.equal(app.ui.screen,'pause');
  });
  await test('settings reset restores music10%, touch assistance, and glyph family toggles',()=>{
   app.ui.show('settings',{parent:'pause'});game.settings.set('music',.75);game.settings.set('touchAssist',false);app.resetSettings();assert.equal(game.settings.music,.1);assert.equal(game.settings.touchAssist,true);
   const glyph=game.settings.glyphs;app.ui.activate('glyphs');assert.notEqual(game.settings.glyphs,glyph);app.ui.activate('glyphs');assert.equal(game.settings.glyphs,glyph);
  });
  await test('developer controls apply live presets and mark world changes assisted',()=>{
   app.ui.show('dev',{parent:'pause'});app.devAction('charges');assert(app.world.players.every(p=>p.charges===3));assert(app.world.assisted);
   app.tune('playerSpeed',220);assert.equal(app.world.tuning.playerSpeed,220);app.devAction('resetTuning');assert.equal(app.world.tuning.playerSpeed,155);
   const reserve=app.world.reserve;app.devAction('reserve');assert.equal(app.world.reserve,reserve+1);app.devAction('overlay');assert(app.overlays);
   const tick=app.world.tick;app.devAction('step');assert.equal(app.world.tick,tick+1);
  });
  await test('native draw traverses every authored formation and both flagship phases',()=>{
   for(let i=0;i<7;i++){
    if(app.world.encounter!==i)app.devAction('encounter');
    app.ui.show('play');game.advance(.3);assert.equal(app.world.encounter,i);assert.equal(game.errors.length,0,JSON.stringify(game.errors));app.ui.show('dev',{parent:'pause'});
   }
   assert.equal(app.world.boss.phase,1);app.devAction('phase');assert.equal(app.world.boss.phase,2);app.ui.show('play');game.advance(2);assert.equal(game.errors.length,0,JSON.stringify(game.errors));
  });
  await test('one repair input edge spends one charge at double simulation speed',()=>{
   app.startRun(137);game.advance(.2);const p=app.world.players[0];p.x=186;p.charges=3;app.world.bunkers[1].mask.fill(0);app.speed=2;
   game.input.tap('repair');game.advance(1/120);assert.equal(p.charges,2);assert.equal(p.repairs,1);assert.equal(app.world.stats.cellsRepaired,app.world.tuning.repairYield);
  });
  await test('zero-time developer play remains still and single-step remains available',()=>{
   app.speed=0;const tick=app.world.tick;game.advance(.3);assert.equal(app.world.tick,tick);app.ui.show('dev',{parent:'pause'});app.devAction('step');assert.equal(app.world.tick,tick+1);
  });
  await test('replay resets simulation ownership, debug state, clocks, overlays and resources',()=>{
   app.invulnerable=true;app.overlays=true;app.speed=.25;app.world.score=321;app.world.assisted=true;game.timeScale=.2;app.startRun(99);
   assert.equal(app.speed,1);assert.equal(app.invulnerable,false);assert.equal(app.overlays,false);assert.equal(game.timeScale,1);assert.equal(game.hitstop,0);assert.equal(app.world.tick,0);assert.equal(app.world.score,0);assert.equal(app.world.assisted,false);assert.equal(app.world.reserve,2);assert.equal(app.world.seed,99);
  });
  await test('solo standard gamepad survives launch, removal, reclaim and return-to-title menus',()=>{
   const pad=makePad(0);pads.push(pad);app.playerCount=1;app.startRun(219);game.advance(.2);assert.equal(game.input.padIndex,0);
   const start=app.world.players[0].x;pad.axes[0]=.8;pad.buttons[0]={pressed:true,touched:true,value:1};game.advance(.3);assert(app.world.players[0].x>start+20);assert(app.world.stats.shots>0);
   pads.length=0;game.advance(.1);assert.equal(game.input.padIndex,null);const stop=app.world.players[0].x;game.advance(.15);assert.equal(app.world.players[0].x,stop);
   pad.axes[0]=-.8;pad.buttons[0]={pressed:false,touched:false,value:0};pads.push(pad);game.advance(.2);assert.equal(game.input.padIndex,0);assert(app.world.players[0].x<stop);
   pad.axes[0]=0;app.toTitle();app.ui.rows=[virtualAction('launch')];game.advance(.25);pad.buttons[0]={pressed:true,touched:true,value:1};game.advance(.025);assert.equal(app.ui.screen,'launch');
   pads.length=0;game.advance(.025);
  });
  await test('two standard gamepads keep distinct locked seats through device removal and reclaim',()=>{
   const a=makePad(0),b=makePad(1);pads.push(a,b);app.playerCount=2;app.startRun(220);game.advance(.25);assert.equal(game.players[0].padIndex,0);assert.equal(game.players[1].padIndex,1);
   const start=app.world.players.map(p=>p.x);a.axes[0]=-.8;b.axes[0]=.8;game.advance(.2);assert(app.world.players[0].x<start[0]);assert(app.world.players[1].x>start[1]);
   a.axes[0]=0;pads[1]=null;game.advance(.1);assert.equal(game.players[1].padIndex,null);assert.equal(app.world.players.length,2);
   b.axes[0]=-.8;pads[1]=b;const x=app.world.players[1].x;game.advance(.2);assert.equal(game.players[1].padIndex,1);assert(app.world.players[1].x<x);assert.equal(app.world.players.length,2);
   pads.length=0;app.playerCount=1;app.startRun(221);game.advance(.2);
  });
  await test('local simultaneous co-op locks two native input seats and restores solo roster',()=>{
   app.playerCount=2;app.startRun(99);assert.equal(game.players.length,2);assert.equal(app.world.players.length,2);assert.equal(app.world.reserve,4);game.advance(.2);
   const before=app.world.players.map(p=>p.x);game.players[0].hold('left');game.players[1].hold('right');game.advance(.3);game.players[0].hold('left',false);game.players[1].hold('right',false);assert(app.world.players[0].x<before[0]);assert(app.world.players[1].x>before[1]);
   app.playerCount=1;app.startRun(99);assert.equal(game.players.length,1);assert.equal(app.world.players.length,1);
  });
  await test('ordinary defeat creates one local record and results permit immediate replay',()=>{
   app.startRun(37);game.advance(.2);app.world.status='defeat';app.world.reason='BREACH — THE SKY CROSSED THE LINE';app.world.score=540;const before=app.records.length;game.advance(.025);assert.equal(app.ui.screen,'results');assert.equal(app.records.length,before+1);game.advance(.5);assert.equal(app.records.length,before+1);app.ui.activate('restart');assert.equal(app.ui.screen,'play');assert.equal(app.world.score,0);
  });
  await test('ten-second front-end idle enters attract and all demo encounters render',()=>{
   app.toTitle();const records=app.records.length;game.advance(9.9);assert.equal(app.ui.screen,'title');game.advance(.3);assert.equal(app.ui.screen,'attract');
   const seen=new Set([app.world.encounter]);for(let i=0;i<7;i++){game.advance(12.05);seen.add(app.world.encounter);assert.equal(game.errors.length,0);}
   assert(seen.has(0)&&seen.has(1)&&seen.has(3)&&seen.has(5)&&seen.has(6));assert.equal(app.records.length,records);
  });
  await test('attract wake consumes input and restores isolated clean title state',()=>{
   assert.equal(app.activity('keyboard'),true);assert.equal(app.ui.screen,'title');assert.equal(app.world.seed,101);assert.equal(app.world.tick,0);assert.equal(app.world.assisted,false);assert.equal(app.idle,0);assert.equal(app.activeRun,false);assert(app.drain>0);
   app.startRun(121);assert.equal(app.world.seed,121);assert.equal(app.world.score,0);assert.equal(app.world.assisted,false);
  });
  await test('About feedback pagination and accessible screen transitions retain readable content',()=>{
   app.toTitle();app.ui.activate('about');assert(app.ui.pages.length>=10);const seen=new Set();for(let i=0;i<app.ui.pages.length;i++){seen.add(app.ui.pages[app.ui.page].title);app.ui.activate('next');game.advance(.01);}assert(seen.has('Testing feedback'));assert(seen.has('Engine feedback'));assert(seen.has('Prompt feedback'));app.ui.activate('back');assert.equal(app.ui.screen,'title');
  });
  await test('native audio stays gesture-safe and headless renderer reports no engine errors',()=>{
   assert.equal(app.audio.unlock(),false);assert.equal(app.audio.diagnostics().unlocked,false);assert.equal(game.errors.length,0,JSON.stringify(plain(game.errors)));assert.equal(warnings.length,0,warnings.join('\n'));
  });
 }finally{app.audio.stop();game.dispose();}
 return {passed:results.filter(r=>r.pass).length,failed:results.filter(r=>!r.pass).length,results,logs,warnings};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const report=await runEngineTests();for(const r of report.results)if(!r.pass)console.error(`FAIL ${r.name}\n${r.error}`);console.log(`${report.passed} passed, ${report.failed} failed`);process.exitCode=report.failed?1:0;}
