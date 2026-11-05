import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const steps = [
  ['op3', "WP.G.newRun(1); WP.G.cheats={inv:true}; WP.G.startOp(2,{d:60}); WP.game.go('play')", 9000],
  ['op4', "WP.G.newRun(1); WP.G.cheats={inv:true}; WP.G.startOp(3,{d:215}); WP.game.go('play')", 6500],
  ['heli', "WP.G.newRun(1); WP.G.cheats={inv:true}; WP.G.startOp(0,{d:1085}); WP.game.go('play')", 8000],
  ['op2boss', "WP.G.newRun(1); WP.G.cheats={inv:true}; WP.G.startOp(1,{boss:true}); WP.game.go('play')", 9000],
  ['op3boss', "WP.G.newRun(1); WP.G.cheats={inv:true}; WP.G.startOp(2,{boss:true}); WP.game.go('play')", 9000],
  ['op4boss', "WP.G.newRun(1); WP.G.cheats={inv:true}; WP.G.startOp(3,{boss:true}); WP.game.go('play')", 12000],
];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [], warns = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); else if (m.type() === 'warning') warns.push(m.text()); });
await p.goto(pathToFileURL(resolve(process.argv[2])).href); await p.waitForTimeout(2500);
for (const [name, js, wait] of steps) { await p.evaluate(js); await p.mouse.move(480, 200); await p.waitForTimeout(wait); await p.screenshot({ path: `shots/f-${name}.png` }); }
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 8).join('\n') : 'no errors'); console.log('warnings:', [...new Set(warns)].slice(0, 8).join('\n'));
await b.close();
