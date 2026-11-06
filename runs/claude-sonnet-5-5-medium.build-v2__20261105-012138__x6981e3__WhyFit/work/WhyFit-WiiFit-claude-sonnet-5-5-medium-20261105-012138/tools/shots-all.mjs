// node tools/shots-all.mjs [size] [names...] : screenshots of every screen for judging composition and legibility.
import { openGame, shot } from './lib.mjs';
const size = (process.argv[2] ?? '1920x1080').split('x').map(Number);
const only = process.argv.slice(3);
const g = await openGame({ size });
const P = g.page;
const run = (fn, ...a) => P.evaluate(fn, ...a);
await run(() => { const a = window.__GAME__; a.save.clear(); a.freshSlot('Tester', 4); a.slot.drips = 60; a.slot.ages = [66, 61, 59, 57]; a.slot.tests = [0.3, 0.5, 0.55, 0.6]; a.slot.stars = { tree: 2, squat: 1 }; a.slot.best = { tree: 88, squat: 70 }; a.slot.log = [{ day: 1, drips: 14, stars: 3, minutes: 5 }, { day: 2, drips: 20, stars: 4, minutes: 6 }, { day: 3, drips: 16, stars: 2, minutes: 4 }]; });
const go = async (id, args = {}, frames = 90, after = null) => { await run(async ([id, args]) => { const a = window.__GAME__; await a.go(id, args, { instant: true }); window.__PIXEL_ENGINE__.step(2); }, [id, args]); if (after) await run(after); };
const list = [
  ['title', async () => { await go('title', {}, 60); }, 80],
  ['menu', async () => { await go('title', { menu: true }); }, 60],
  ['settings', async () => { await go('title', { menu: true }); await run(() => { const s = window.__GAME__.scene; s.push(new (s.stack.constructor === Array ? window.__GAME__.constructor : Object)()); }).catch(() => {}); }, 10],
];
const PODIUM = ['podium', 'a.medley = new a.MedleyState([{kind:"bot",skill:"sloppy",name:"Dennis",look:"dennis"},{kind:"bot",skill:"expert",name:"Marguerite",look:"marguerite"},{kind:"bot",skill:"good",name:"June",look:"june"}], ()=>0.5); a.medley.record(0,[300,800,500]);a.medley.record(1,[400,700,600]);a.medley.record(2,[200,900,700]); await a.go("podium",{}, {instant:true});', 80];
const steps = [
  ['title', 'await a.go("title",{}, {instant:true});', 70],
  ['menu', 'await a.go("title",{menu:true}, {instant:true});', 70],
  ['hub', 'await a.go("hub",{}, {instant:true});', 90],
  ['weighin', 'await a.go("weighin",{skill:"good"}, {instant:true});', 200],
  ['report', 'await a.go("report",{}, {instant:true});', 90],
  ['jar', 'await a.go("jar",{}, {instant:true});', 200],
  ['locker', 'await a.go("locker",{}, {instant:true});', 60],
  ['records', 'await a.go("records",{}, {instant:true});', 60],
  ['join', 'await a.go("join",{}, {instant:true});', 60],
  ['ferry', 'await a.go("ferry",{}, {instant:true});', 200],
  ['ending', 'await a.go("ending",{}, {instant:true});', 1500],
];
for (const k of ['tree', 'heron', 'warrior', 'chair', 'fold', 'plank', 'squat', 'lunge', 'press', 'hoop', 'step', 'header', 'slack', 'tray', 'pier', 'jog', 'longstand']) {
  steps.push([`${k}-intro`, `await a.go("activity",{id:"${k}"}, {instant:true});`, 40]);
  steps.push([`${k}-play`, `await a.go("activity",{id:"${k}",skipIntro:true,skill:"good"}, {instant:true});`, k === 'slack' || k === 'pier' ? 900 : k === 'longstand' ? 1400 : 700]);
  steps.push([`${k}-results`, `await a.go("activity",{id:"${k}",skipIntro:true,skill:"good"}, {instant:true}); a.scene.finishNow(2);`, 200]);
}
steps.push(['pause', 'await a.go("activity",{id:"tree",skipIntro:true}, {instant:true}); window.__PIXEL_ENGINE__.step(400); a.scene.openPause();', 10]);
steps.push(['settings', 'await a.go("activity",{id:"tree",skipIntro:true}, {instant:true}); window.__PIXEL_ENGINE__.step(200); a.scene.openPause(); a.scene.stack[0].menu.items.find((i)=>i.label==="Settings").onSelect();', 20]);
steps.push(['about3', 'await a.go("activity",{id:"tree",skipIntro:true}, {instant:true}); window.__PIXEL_ENGINE__.step(200); a.scene.openPause(); a.openAbout(a.scene); a.scene.stack[a.scene.stack.length-1].i = 3;', 20]);
steps.push(['about', 'await a.go("activity",{id:"tree",skipIntro:true}, {instant:true}); window.__PIXEL_ENGINE__.step(200); a.scene.openPause(); a.openAbout(a.scene);', 20]);
steps.push(['dev', 'await a.go("activity",{id:"tree",skipIntro:true}, {instant:true}); window.__PIXEL_ENGINE__.step(200); a.scene.openPause(); a.openDev(a.scene);', 20]);
steps.push(['dropin', 'await a.go("title",{menu:true}, {instant:true}); a.scene.menu.items[1].onSelect();', 20]);
steps.push(['slots', 'await a.go("title",{menu:true}, {instant:true}); a.scene.menu.items[0].onSelect();', 20]);
steps.push(PODIUM);
for (const [name, code, frames] of steps) {
  if (only.length && !only.includes(name)) continue;
  try {
    await P.evaluate(new Function('return (async()=>{ const a = window.__GAME__; ' + code + ' })()'));
    await shot(P, `shots/${name}.png`, frames);
    process.stdout.write(name + ' ');
  } catch (e) { console.log('\nFAILED', name, String(e).slice(0, 200)); }
}
console.log('\nerrors', g.errors.slice(0, 5));
await g.browser.close();
