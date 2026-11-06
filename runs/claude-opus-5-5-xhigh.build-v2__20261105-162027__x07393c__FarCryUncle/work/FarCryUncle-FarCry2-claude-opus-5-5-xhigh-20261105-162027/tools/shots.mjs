// node tools/shots.mjs name1 name2 ... : runs named setups from below in one browser, 1080p.
import { launch } from '../tests/lib/browser.mjs';
import { OUT, ROOT } from '../tests/lib/paths.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
const names = process.argv.slice(2);
mkdirSync(join(ROOT, 'tests', 'shots'), { recursive: true });
const SETUPS = {
  day: `g.dev.startMission('m2'); e.step(5); g.clock.set(10); g.player.teleport(-235, 140); g.player.setYaw(2.8, -0.02); g.weapons.give('tractor', 90, true); e.step(60); g.dialogue.stopAll(); g.ui.menu.clear();`,
  rust: `g.dev.startMission('m2'); e.step(5); g.clock.set(14); g.player.teleport(40, -140); g.player.setYaw(0.2, -0.06); g.weapons.give('tractor', 22, true); e.step(60); g.ui.menu.clear(); g.dialogue.stopAll();`,
  town: `g.dev.startMission('m2'); e.step(5); g.clock.set(11); g.player.teleport(-4, 56); g.player.setYaw(0.15, -0.04); g.weapons.give('m38', 100, true); e.step(60); g.ui.menu.clear(); g.dialogue.stopAll();`,
  map: `g.dev.startMission('m3'); e.step(5); g.clock.set(16); g.player.teleport(-120, 40); g.map.see('mile-forty'); g.map.see('pump-shed'); g.map.see('three-wells'); g.map.see('fort-clement'); g.map.addNote('A MAP IS A PROMISE MADE BY SOMEONE WHO HAS ALREADY LEFT.'); e.step(10); g.fire.burnStrip([[430,-60],[330,-190],[220,-280],[150,-300]], 18); g.map.raise(true); e.step(30); g.ui.menu.clear(); g.dialogue.stopAll();`,
  nightfire: `g.dev.startMission('m6'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); const s=[-260,-300]; g.clock.set(22); g.wind.pin([0.9,0.2],5); g.player.teleport(s[0]-110, s[1]+40); g.player.setYaw(-1.5, 0.0); g.actors.squads.get('long-field').disabled=true; g.fire.ignite(s[0]-80, s[1]+30, 14, 'player'); for(let i=0;i<4*14;i++) g.fire.tick(g.wind,0.25); e.step(60);`,
  truckmap: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(17); g.player.teleport(-100,35); const v=g.vehicles.spawn('pickup',-105,35,1.5); e.step(30); g.driving.enter(v); e.step(30); g.map.raise(true); e.step(30);`,
  fort2: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(15); g.story.pass='concord'; g.player.teleport(-405,-228); g.player.setYaw(1.95,0.1); e.step(40);`,
  fort3: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(15); g.story.pass='concord'; g.player.teleport(-430,-170); g.player.setYaw(-1.57,0.08); e.step(40);`,
  shift: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(9); g.player.teleport(90,65); const v=g.vehicles.spawn('technical',95,66,1.3); e.step(30); g.driving.enter(v); e.step(30); g.driving.shiftDir=1; setInterval(()=>{g.driving.gear=0; g.driving.shiftT=0.25;},5); e.step(1);`,
  cabtruck: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(9); g.player.teleport(90,65); const v=g.vehicles.spawn('truck',95,66,1.3); e.step(30); g.driving.enter(v); e.step(30);`,
  cabtanker: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(9); g.player.teleport(90,65); const v=g.vehicles.spawn('tanker',95,66,1.3); e.step(30); g.driving.enter(v); e.step(30);`,
  flag: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(15); g.story.pass='concord'; g.wind.pin([0.9,0.3],6); g.player.teleport(-433.6,-165.2); g.player.setYaw(-0.32,0.55); e.step(90);`,
  ridge: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(10); g.player.teleport(-200,-480); g.player.setYaw(-1.0,0.05); e.step(40);`,
  gameover: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.ui.openGameOver(); e.step(4);`,
  xbox2: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.actions.device='pad'; g.settings.glyphs='xb'; g.shell.openSettings(); e.step(4);`,
  ps2: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.actions.device='pad'; g.settings.glyphs='ps'; g.shell.openSettings(); e.step(4);`,
  regrow: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.timers.length=0; g.missions.abort(); g.clock.set(11); g.dev.god=true; g.player.teleport(-420,-30); e.step(40); const f=g.player.feet; g.fire.ignite(f.x+6,f.z-22,14,'world'); e.step(4); g.fire.extinguishAll(); e.step(2); g.fire.hours+=60; g.fire.regrowTick(); g.player.setYaw(0,0.12); e.step(90);`,
  fogplan: `g.dev.startMission('m2'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(10); g.player.teleport(90,65); g.player.setYaw(1.3,-0.02); e.step(40); const f=g.sky.fog; f.top.value=-60; f.amount.value=0.55; e.step(10);`,
  fogmine: `g.dev.startMission('m2'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(10); g.player.teleport(90,65); g.player.setYaw(1.3,-0.02); e.step(40); const f=g.sky.fog; f.top.value=1; f.amount.value=0.55; e.step(10);`,
  cab: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(9); g.player.teleport(90,65); const v=g.vehicles.spawn('technical',95,66,1.3); e.step(30); g.driving.enter(v); e.step(30);`,
  rack: `g.dev.startMission('m2'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(12); const n=g.npcs.byWho.tibor; g.player.teleport(n.x+1,n.z+3.5); g.player.setYaw(0.3,-0.05); e.step(30); g.story.stones=30; g.ui.openRack(); e.step(10);`,
  talk: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(15); const n=g.npcs.byWho.vance; g.player.teleport(n.x+1.5,n.z+3); e.step(20); g.faceNpc(n); g.dialogue.play('m3.brief'); e.step(60);`,
  surgery: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(13); g.player.teleport(90,-60); g.player.setYaw(2,-0.1); g.body.hp=10; e.step(5); g.body.startSurgery(); e.step(55); e.engineFreeze=true;`,
  surgery2: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(13); g.player.teleport(90,-60); g.player.setYaw(2,-0.1); g.body.hp=10; g.body.surgeryIndex=1; e.step(5); g.body.startSurgery(); e.step(70);`,
  fight: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(10); g.story.pass=null; const P=[90,-80]; g.player.teleport(P[0]+6,P[1]+24); g.player.setYaw(0,0); e.step(40); for(const s of g.actors.soldiers) if(s.active) s.alertTo(g.player.feet.x,g.player.feet.z,'player'); g.weapons.give('tractor',80,true); e.step(120);`,
  dev: `g.dev.startMission('m2'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(12); e.step(5); g.shell.openPause(); g.dev.open(); const s=g.ui.menu.top; s.tab=5; e.step(5);`,
  pause: `g.dev.startMission('m2'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(12); e.step(5); g.shell.openPause(); e.step(3);`,
  ledger: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.ledger.add('moved',240); g.ledger.add('paid',31); g.ledger.add('friends',1); g.ledger.add('stones',57); g.ui.openLedger(); e.step(3);`,
  ending: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.ui.openEnding('column'); e.step(3);`,
  nofog: `g.sky.paint = ((orig) => function(h){ orig.call(this,h); this.fog.amount.value=0; })(g.sky.paint); g.dev.startMission('m2'); e.step(5); g.clock.set(10); g.player.teleport(-235, 140); g.player.setYaw(2.8, -0.02); g.weapons.give('tractor', 90, true); e.step(60); g.dialogue.stopAll(); g.ui.menu.clear();`,
  rescue: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(16); g.player.teleport(-210,80); g.player.setYaw(0.4,0); const b=g.actors.buddy('ines'); b.met=true; e.step(20); g.body.hp=1; g.body.hurt(10,'bullet'); e.step(100);`,
  m0: `g.dev.startMission('m0'); e.step(400);`,
  soldiers: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(11); g.story.pass='concord'; const P=[90,-80]; g.player.teleport(P[0]+5,P[1]+11); g.player.setYaw(0.4,-0.02); g.weapons.give('m38',100,true); e.step(60);`,
  convoy: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(15); g.story.noPatrols=true; g.player.teleport(190,440); g.player.setYaw(2.8,-0.02); const v=g.vehicles.spawn('technical',196,428,0.2,{paint:'slate',hood:'night',roof:'mist'}); const u=g.vehicles.spawn('truck',188,422,0.1); const w=g.vehicles.spawn('tanker',204,424,-0.2); e.step(60);`,
  train: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(9); g.player.teleport(-14,58); g.player.setYaw(-0.3,0.04); e.step(30);`,
  herd: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(8); g.player.teleport(-320,195); g.player.setYaw(0,-0.04); e.step(40);`,
  night: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(23); g.actors.squads.get('p2').disabled=true; g.player.teleport(-260,215); g.player.setYaw(2.9,0); e.step(40);`,
  ads: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(12); g.story.pass='concord'; const P=[90,-80]; g.player.teleport(P[0]+5,P[1]+20); g.player.setYaw(0.2,-0.02); g.weapons.give('tractor',45,true); e.step(40); g.actions.bot={held:new Set(['aim']),queue:new Set(),taps:new Set(),move:{x:0,y:0},analog:{},only:false}; e.step(40);`,
  scope: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(12); g.story.pass='concord'; const P=[90,-80]; g.player.teleport(P[0]+5,P[1]+60); g.player.setYaw(0.1,-0.02); g.weapons.give('empire',100,true); e.step(40); g.actions.bot={held:new Set(['aim']),queue:new Set(),taps:new Set(),move:{x:0,y:0},analog:{},only:false}; e.step(40);`,
  kill: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.dev.god=true; g.clock.set(14); g.story.pass=null; const P=[90,-80]; g.player.teleport(P[0]+4,P[1]+12); g.player.setYaw(0.1,-0.05); g.weapons.give('tractor',60,true); e.step(40); const so=g.actors.soldiers.filter(s=>s.active&&!s.dead); for(const s of so.slice(0,3)){ s.ignite(); } const s4=so[3]; if(s4){ const d={x:0,y:0,z:1}; s4.hurt(999,'player',d,'body',{});} e.step(70);`,
  card: `g.startRound('solo'); e.step(3); g.round.s.advance=()=>{}; g.round.phase='card'; g.round.card={left:14000,ready:[1],asking:0,asked:false}; e.step(3);`,
  cash: `g.startRound('solo'); e.step(3); e.step(260); g.dev.god=true; const c=g.round.cases[0]; g.player.teleport(c.x-8,c.z+6); g.player.setYaw(-0.9,-0.05); e.step(60);`,
  about: `e.step(5); g.shell.openAbout(); g.ui.menu.top.page=Number(1); e.step(3);`,
  about2: `e.step(5); g.shell.openAbout(); g.ui.menu.top.page=8; e.step(3);`,
  xbox: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.settings.glyphs='xb'; g.actions.device='pad'; g.ui.choice('A BETTER PLAN',[{label:'DO IT THEIR WAY'},{label:'IGNORE IT'}]); e.step(3); g.actions.device='pad'; g.actions.track=function(){return false;};`,
  burn: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.dev.god=true; g.clock.set(20.5); g.story.pass=null; const P=[90,-80]; g.player.teleport(P[0]+3,P[1]+22); g.player.setYaw(0.1,-0.03); g.weapons.give('flare',100,true); e.step(40); for(const s of g.actors.soldiers) if(s.active&&!s.dead&&Math.hypot(s.x-P[0],s.z-P[1])<30) s.ignite(); e.step(50); e.timeScale=0.15;`,
  title: `e.step(90);`,
  main: `e.step(30); g.ctx.input.setKey('Enter',true); e.step(2); g.ctx.input.setKey('Enter',false); e.step(30);`,
  harrow: `g.dev.startMission('m9'); g.dev.god=true; e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); const s=[-130,-520]; g.player.teleport(s[0],s[1]+3.5); e.step(10); g.ending.harrowScene(g.npcs.byWho.harrow); e.step(90); g.ending.layMap(); e.step(180);`,
  fort: `g.dev.startMission('m3'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(15); g.story.pass='concord'; g.player.teleport(-430,-118); g.player.setYaw(0,0.02); e.step(40);`,
  mine: `g.dev.startMission('m7'); e.step(5); g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(16); g.player.teleport(240,-280); g.player.setYaw(1.3,-0.1); e.step(60);`,
  river: `g.dev.startMission('m3'); e.step(5); g.timers.length=0; g.ui.menu.clear(); g.dialogue.stopAll(); g.clock.set(9); g.player.teleport(95,222); g.player.setYaw(-1.55,-0.1); e.step(40);`,
};
const browser = await launch();
for (const name of names) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e.message).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await page.goto('file://' + OUT);
  await page.waitForFunction(() => window.__GAME__, null, { timeout: 120000 });
  const r = await page.evaluate(async (code) => {
    const e = await window.__PIXEL_READY__;
    const g = window.__GAME__;
    e.manual = true;
    e.step(200); // past the epigraph
    const fn = new (Object.getPrototypeOf(async function () {}).constructor)('g', 'e', code);
    await fn(g, e);
    e.manual = false;
    return { status: g.status(), errs: e.errors.slice(0, 3) };
  }, SETUPS[name]);
  await page.waitForTimeout(14000);
  await page.screenshot({ path: join(ROOT, 'tests', 'shots', `${name}.png`) });
  const st = await page.evaluate(() => ({ status: window.__GAME__.status(), errors: window.__PIXEL_ENGINE__.errors.slice(0, 3), gpu: window.__PIXEL_ENGINE__.state().gpuErrors.slice(0, 2), fps: window.__PIXEL_ENGINE__.fps }));
  console.log(name, JSON.stringify(st).slice(0, 400), errs.slice(0, 3).join(' | '));
  await ctx.close();
}
await browser.close();
