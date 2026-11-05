// screenshots of canvas screens: node tools/scenes.mjs built.html  (writes shots/s-<name>.png)
import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const file = process.argv[2];
const steps = [
  ['title', "WP.game.go('title')", 1500],
  ['help', "WP.game.go('help')", 800],
  ['about', "WP.game.go('about')", 800],
  ['opcard', "WP.G.newRun(1); WP.G.op=2; WP.game.go('opcard')", 1500],
  ['briefing', "WP.game.go('briefing')", 4500],
  ['tally', "WP.G.tally={op:3,kills:41,acc:63,heads:12,civ:1,saved:4,lost:1,bonus:5200,seats:[{pid:0,score:21800,bonus:5200},{pid:1,score:18200,bonus:5000}]}; WP.game.go('tally')", 2500],
  ['cutscene', "WP.game.go('cutscene')", 3500],
  ['ending', "WP.G.carry=[{active:true,score:48000}]; WP.G.saved=4; WP.game.go('ending')", 2500],
  ['scores', "WP.game.go('scores')", 1200],
  ['dev', "WP.G.newRun(1); WP.G.startOp(1,{d:300}); WP.game.go('play'); setTimeout(()=>{WP.dev.open=true},300)", 2500],
  ['attract', "WP.G.attIdx=0; WP.game.go('attract')", 9000],
];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(2500);
for (const [name, js, wait] of steps) { await p.evaluate(js); await p.waitForTimeout(wait); await p.screenshot({ path: `shots/s-${name}.png` }); }
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no errors'); await b.close();
