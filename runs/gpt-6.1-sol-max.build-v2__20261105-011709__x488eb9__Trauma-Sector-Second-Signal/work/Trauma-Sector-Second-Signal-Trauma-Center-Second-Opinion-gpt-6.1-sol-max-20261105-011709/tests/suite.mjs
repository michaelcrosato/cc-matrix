import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let checks=0,failed=0;const failures=[],results={cases:[]};
const check=(ok,text)=>{checks++;if(!ok){failed++;failures.push(text);}};
const quiet={log(){},warn(){},error(){},info(){}};
const ctx=vm.createContext({console:quiet,performance,structuredClone,setTimeout,clearTimeout,URL});ctx.window=ctx;ctx.globalThis=ctx;
const core=['vendor/my-3d2dge/dist/handoff/my-3d2dge.js','src/config.js','src/data.js','src/sim/op.js','src/sim/cursor.js','src/sim/bot.js'];
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
for(const file of core)vm.runInContext(read(file),ctx,{filename:file});
const G=ctx.GAME,Op=G.Op,dt=1/120;
function isolated(object){const S=Op.create(1);S.objects=[];S.phaseDelay=999;S.learned.forceps=true;const o=Op.add(S,object);return {S,o};}
function frame(S,a={},time=dt){for(let i=0;i<Math.round(time/dt);i++){const p=S.players[0];Op.step(S,[{x:p.x,y:p.y,tool:p.tool,trig:0,...a}],dt);}}
function ready(S,tool,x,y){frame(S,{tool,x,y},.15);}
try{
 for(const c of G.cases){const S=Op.create(c,{seed:517,difficulty:'Resident'}),B=S.players.map(p=>G.Bot.create(p.id));let i=0;
  while(!['won','lost'].includes(S.mode)&&i++<120*1100)Op.step(S,B.map(b=>G.Bot.next(b,S,dt)),dt);
  check(S.mode==='won',`Case ${c.id} ${c.name}: ${S.mode}; phase ${S.phase}; pulse ${S.vitals.toFixed(1)}; clock ${S.clock.toFixed(1)}; left ${JSON.stringify(S.objects.filter(o=>!o.done&&!G.objects[o.type]?.decor).map(o=>({type:o.type,stage:o.stage,progress:o.progress,cut:o.cut,stitches:o.stitches})))}`);
  results.cases.push({id:c.id,name:c.name,mode:S.mode,elapsed:S.elapsed,clock:S.clock,vitals:S.vitals,rank:Op.rank(S),slips:S.players[0].slips});
 }
 for(let n=2;n<=4;n++){const S=Op.create(12,{players:n}),B=S.players.map(p=>G.Bot.create(p.id));let i=0;while(!['won','lost'].includes(S.mode)&&i++<120*400)Op.step(S,B.map(b=>G.Bot.next(b,S,dt)),dt);check(S.mode==='won',`Grand Rounds ${n} bots: ${S.mode}, phase ${S.phase}`);}
 {
  const {S,o}=isolated({type:'shard',x:160,y:116,axis:[1,0],depth:28});ready(S,0,160,116);frame(S,{trig:1});for(let i=1;i<=64;i++)frame(S,{x:160+i*.5,trig:1});frame(S,{trig:0});check(o.done&&S.players[0].slips===0,'Controlled Forceps extraction and discard');
  const b=isolated({type:'shard',x:160,y:116,axis:[1,0],depth:28});ready(b.S,0,160,116);frame(b.S,{trig:1});frame(b.S,{x:185,trig:1});check(b.S.players[0].slips===1&&b.S.objects.some(q=>q.type==='laceration'),'Fast extraction tears tissue');
 }
 {
  const {S,o}=isolated({type:'guide',x:160,y:116,points:[[160,116],[220,116]]});ready(S,1,160,116);frame(S,{trig:1});for(let i=1;i<=60;i++)frame(S,{x:160+i,trig:1});check(o.done&&S.players[0].textbook===1,'Scalpel completes the whole guide with Textbook distance');
  const b=isolated({type:'guide',x:160,y:116,points:[[160,116],[220,116]]});ready(b.S,1,160,116);frame(b.S,{trig:1});frame(b.S,{x:180,y:143,trig:1},.25);check(b.S.players[0].slips>0,'Scalpel off-guide stroke slips');
 }
 for(const good of [true,false]){const {S,o}=isolated({type:'wound',x:200,y:116,n:1,length:20});const pair=Op.stitchPair(S,o);ready(S,2,...pair[0]);frame(S,{trig:1});frame(S,{x:good?pair[1][0]:pair[0][0],y:pair[1][1],trig:1},.2);frame(S,{trig:0});check(good?o.done&&S.players[0].stitches===1:!o.done&&S.players[0].slips===1,good?'Suture crosses and releases':'Loose stitch must be redone');}
 {
  const {S,o}=isolated({type:'patch',x:200,y:116,r:13});ready(S,3,200,116);for(const c of o.cells)frame(S,{x:c[0],y:c[1],trig:1});check(o.done&&o.progress>=.9,'Salve needs ninety percent coverage');
 }
 {
  const {S,o}=isolated({type:'iv',x:200,y:116});S.vitals=30;ready(S,4,200,116);frame(S,{trig:1},.55);frame(S,{trig:0});check(o.done&&S.vitals>47&&S.players[0].textbook===1,'Syringe charges and injects a full IV dose');
 }
 {
  const {S,o}=isolated({type:'polyp',x:200,y:116});ready(S,5,200,116);frame(S,{trig:1},.55);check(o.done&&S.players[0].burns===1,'Cautery seals a polyp');frame(S,{x:285,y:150,trig:1},2);check(S.players[0].lock>0&&S.players[0].slips>0,'Bare cautery chars and overheats');
 }
 {
  const {S,o}=isolated({type:'pool',x:200,y:116,volume:60});ready(S,6,200,116);frame(S,{trig:1},1.1);check(o.done&&S.players[0].suction>=59,'Suction drains its volume');
  const b=isolated({type:'clot',x:200,y:116,hidden:true});check(!Op.visible(b.S,b.o),'Hidden objects cannot be targeted');ready(b.S,7,200,116);frame(b.S,{trig:1},.1);check(Op.visible(b.S,b.o)&&b.o.marked>b.S.worldTime,'Sonar reveals hidden anatomy');
 }
 {
  const {S}=isolated({type:'shard',x:160,y:116});S.gauge=100;const before=S.worldTime;Op.gift(S);frame(S,{},1);check(Math.abs(S.worldTime-before-.25)<.001&&S.gauge<100,'Long Breath runs world time at one quarter');
 }
 {
  const {S}=isolated({type:'patch',x:170,y:110});S.doctor='sokolova';S.gauge=100;frame(S,{x:210,y:115},4);const old=G.clone(Op.history(S).list[0].s);S.vitals=12;S.players[0].score=999;frame(S,{x:240,y:120},.2);const ok=Op.gift(S);
  check(ok&&Math.abs(S.clock-old.clock)<.001&&S.vitals===old.vitals&&S.players[0].score===old.players[0].score&&S.rng===old.rng,'Second Look restores clock, pulse, score and RNG');check(S.players[0].x===240&&S.players[0].y===120&&S.ghosts.length>0&&S.rewindFx===1.2,'Second Look preserves hands and creates ghosts');
 }
 {
  const S=Op.create(1),cp=G.clone(Op.checkpoint(S));S.vitals=1;S.objects[0].done=true;Op.retry(S);check(S.vitals===cp.vitals&&G.hash(S.objects)===G.hash(cp.objects)&&S.rankCap==='B','Checkpoint restores objects with a B cap');
  const B=Op.create(3);Op.triggerBlue(B);for(let i=0;i<240&&B.mode==='blue';i++){const u=B.blue.t%.9;frame(B,{trig:u>.43&&u<.48?1:0});}check(B.mode==='operating'&&B.vitals>=29,'Two on-peak Code Blue shocks revive');const L=Op.create(3);Op.triggerBlue(L);frame(L,{},5);check(L.mode==='lost','Missed Code Blue loses the patient');
 }
 {
  const S=Op.create(8);Op.enterPhase(S,1);const lobes=S.objects.filter(o=>o.type==='lobe');lobes[0].done=true;frame(S,{},10.5);check(lobes.every(o=>!o.done),'Da Capo regrows unfinished phrases');
  const b=isolated({type:'legato',x:180,y:116,segments:8});b.o.stage=1;ready(b.S,0,180,116);frame(b.S,{trig:1});frame(b.S,{y:70,trig:1});check(b.o.hidden&&b.o.stage===0&&b.S.players[0].slips===1,'Legato snaps under tension');
  const c=isolated({type:'fermata',x:200,y:116});c.S.phaseTime=5.3;c.S.domes=[{x:200,y:116,r:34,left:2}];ready(c.S,5,200,116);frame(c.S,{trig:1},.4);check(c.o.progress===0,'Fermata dome suspends tools');
  const d=Op.create(11);Op.enterPhase(d,3);d.gauge=100;frame(d,{},20.1);check(!!Op.history(d).forced,'Cantor forcibly rewinds an uncountered repeat');d.doctor='sokolova';Op.gift(d);check(d.objects.find(o=>o.type==='repeat').hits===1,'Second Look counters the Cantor rewind');
 }
 {
  const S=Op.create(1),p=G.Cursor.create();p.x=50;p.y=100;for(let i=0;i<120;i++)G.Cursor.update(p,{aim:[1,0]},S,dt);check(p.x>=350,'Full stick crosses 300 units in one second');const fine=G.Cursor.create();fine.x=50;fine.y=100;for(let i=0;i<120;i++)G.Cursor.update(fine,{aim:[1,0],fine:true},S,dt);check(fine.x<=171,'Fine stick travels at most 121 units');
  for(let i=0;i<8;i++){const p=G.Cursor.create(),a=-Math.PI/2+i*Math.PI/4;for(let n=0;n<12;n++)G.Cursor.update(p,{wheel:[Math.cos(a),Math.sin(a)]},S,dt);check(p.tool===i,'Wheel direction '+i);}
  const a=Op.create(5,{seed:123}),b=Op.create(5,{seed:123}),A=G.Bot.create(),B=G.Bot.create();for(let i=0;i<1800;i++){Op.step(a,[G.Bot.next(A,a,dt)],dt);Op.step(b,[G.Bot.next(B,b,dt)],dt);}check(G.hash(a)===G.hash(b),'Same seed and virtual-stick inputs produce the same hash');
 }
 const manifest=JSON.parse(read('src/manifest.json'));for(const f of manifest.map(f=>'src/'+f).filter(f=>!core.includes(f)))vm.runInContext(read(f),ctx,{filename:f});
 for(const c of G.cases){check(!!G.sites[c.site]&&!!G.CAST[c.doctor]&&(c.coop||!!G.stories[c.story]&&!!G.stories[c.after]),'Case references resolve: '+c.id);for(const ph of c.phases)for(const o of ph.objects)check(!!G.objects[o.type],'Object resolves '+o.type);}
 for(const [id,node] of Object.entries(G.stories))for(const l of node.lines){check(!!G.CAST[l.who],`Story ${id} speaker resolves`);check(l.say.length<=90,`Story ${id} over 90 characters: ${l.say}`);}
 const game=G.game,I=game.input;game.fadeTime=0;game.advance(.1);check(game.sceneName==='title','Fresh boot enters title');check(game.settings.music===.1,'Fresh music is ten percent');check(game.settings.glyphs==='playstation','Fresh glyphs are PlayStation');
 G.runtime.autoplay=true;I.tap('start');game.advance(.1);I.tap('confirm');game.advance(.1);I.tap('confirm');game.advance(.1);let time=0,credits=false;
 while(time<1600){const name=game.sceneName;if(name==='chart'){game.debug.menu().i=G.cases[G.runtime.caseId-1].lightbox?1:0;I.tap('confirm');}if(name==='ward'){game.debug.teleport(286,237);I.tap('interact');}if(name==='results')I.tap('confirm');if(name==='credits'){credits=true;I.tap('confirm');game.advance(.1);break;}if(name==='lost')break;game.advance(.1);time+=.1;}
 check(credits&&game.sceneName==='title','Full scene playthrough reaches ending, credits and title');check(G.runtime.save.cleared.length===11&&Object.keys(G.runtime.save.ranks).length===11,'Eleven clears and difficulty ranks saved');check(G.runtime.save.ending&&G.runtime.save.unlocked===11,'Ending and unlocks saved');check(game.errors.length===0,'Campaign has no engine errors');
 G.runtime.autoplay=false;game.go('title');game.advance(10.1);check(game.sceneName==='attract','Ten idle seconds start attract');game.advance(294);check(game.debug.snapshot().attract.loops>=2,'Attract loops twice');I.tap('confirm');game.advance(.02);check(game.sceneName==='title','Attract exit consumes input');
 const second=game.addPlayer({keys:'right'});game.advance(10.1);second.tap('confirm');game.advance(.02);check(game.sceneName==='title','A second local player can exit attract mode');
 G.startCase(1,'replay');game.advance(.02);G.dev.open();const base=G.TUNING.drain;I.tap('right');game.advance(.02);check(G.TUNING.drain>base&&G.runtime.S.dev,'Dev slider changes live and tags results');G.dev.state.row=G.Dev.groups[0][1].length;I.tap('confirm');game.advance(.02);check(G.TUNING.drain===G.DEFAULTS.drain,'Dev reset restores defaults');G.dev.state.open=false;
 G.startCase(1,'campaign');game.advance(.02);G.runtime.save.ranks['1:Resident']={rank:'S',score:100};G.runtime.S.rankCap='B';G.runtime.S.players[0].score=100000;game.go('results');game.advance(.02);check(G.runtime.save.ranks['1:Resident'].rank==='S','A capped high score cannot replace a better saved rank');
 G.TUNING.drain=1.5;G.startCase(1,'campaign');game.advance(.02);check(G.runtime.S.dev,'New cases inherit the DEV tag from persisted nonstandard tuning');G.TUNING.drain=1;
 for(const id of Object.keys(G.stories)){game.go('story',{id,next:'menu'});game.advance(.02,{draw:true});}
 for(const c of G.cases.filter(c=>c.id<=11)){G.startCase(c.id,'replay',c.id>=4?1:0);game.advance(.02,{draw:true});}
 for(const scene of ['menu','difficulty','chart','ward','casefiles','lobby','about','cinematic']){game.go(scene);game.advance(.02,{draw:true});}
 check(game.errors.length===0,'All scenes, sites and stages draw without engine errors');game.dispose();
 const about=JSON.parse(read('src/about-data.json'));check(Object.keys(about.sourceInformation).length===15,'Source Information has all fifteen fields');check(about.testingFeedback.length===4&&about.engineFeedback.length===6&&about.promptFeedback.length===4,'Every interview question is answered');check(Object.values(about.sourceInformation).every(v=>typeof v==='string'&&v.length>0),'Source Information is filled');
 for(const f of manifest)check(!/\bTODO\b|\bFIXME\b|\bplaceholder\b|\bstub\b/i.test(read('src/'+f)),'No unfinished markers in '+f);
 if(!process.argv.includes('--fast')){const {testBrowser}=await import('./browser.mjs');await testBrowser(check);const {testHub}=await import('./hub.mjs');await testHub(check);const {testPackage}=await import('./package.mjs');await testPackage(check);}
}catch(e){check(false,'Unhandled test error: '+e.stack);}
for(const s of failures)process.stdout.write('FAIL '+s+'\n');
Object.assign(results,{checks,failed,failures});fs.mkdirSync(path.join(root,'tests/results'),{recursive:true});fs.writeFileSync(path.join(root,'tests/results/summary.json'),JSON.stringify(results,null,2));
process.stdout.write(`${checks} checks, ${failed} failed\n`);process.exitCode=failed?1:0;
