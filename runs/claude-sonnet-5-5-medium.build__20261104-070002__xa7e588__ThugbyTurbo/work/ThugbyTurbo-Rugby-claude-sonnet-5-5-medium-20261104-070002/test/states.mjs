// screenshots of set pieces: node test/states.mjs  (writes /tmp/s55_<name>.png)
import { chromium } from '../tools/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const file = '../ThugbyTurbo-Rugby-claude-sonnet-5-5-medium-20261104-070002.html';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(1000);
const T = window => 0;
const shot = async (name, js, wait = 900) => { await p.evaluate(js); await p.waitForTimeout(wait); await p.screenshot({ path: '/tmp/s55_' + name + '.png' }); };
await p.evaluate("__thugby.game.debug.go('match',{mode:'exh',home:'hawks',away:'mudlarks',venue:'muddington',players:0,half:120})"); await p.waitForTimeout(800);
await p.evaluate("(()=>{const s=__thugby.sim,S=s.S; S.phase='play'; S.sp=null; S.ball.st='loose'; })()");
await shot('scrum', "__thugby.sim.startScrum(0, 500, 300)", 3300);
await shot('lineout', "(()=>{const s=__thugby.sim; s.S.phase='play'; s.startLineout(0, 600, 90)})()", 1500);
await shot('penalty', "(()=>{const s=__thugby.sim; s.S.phase='play'; s.startPenalty(0, 900, 384, false)})()", 1500);
await shot('conv', "(()=>{const s=__thugby.sim; s.S.phase='play'; const S=s.S; s.startConversion(0, S.players[4], 300, 'conv'); S.sp.step='aim';})()", 1500);
await shot('ruck', "(()=>{const s=__thugby.sim,S=s.S; S.phase='play'; S.sp=null; const c=S.players[4],t=S.players[11]; s.place(c,600,384,0); s.place(t,612,384,Math.PI); s.giveBall(c); c.pow=1; t.tkl=10; S.cfg.tackleBonus=1; })()", 100);
await p.evaluate("(()=>{const s=__thugby.sim,S=s.S; const c=S.players[4],t=S.players[11]; S.cfg.tackleBonus=1; })()");
console.log('errors', errs.length ? errs.join('\n') : 'none'); await b.close();
