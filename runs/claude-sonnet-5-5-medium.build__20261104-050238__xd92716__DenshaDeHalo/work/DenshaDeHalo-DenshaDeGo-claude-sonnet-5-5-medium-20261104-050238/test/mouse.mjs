import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + resolve(process.argv[2] || 'index.html') + '#stage=S0'); await p.waitForTimeout(2500);
const info = () => p.evaluate(() => { const d = window.__dh.DH.drive, g = window.__dh.game; return { lever: d.run.lever, canDepart: d.run.canDepart, view: d.view, W: g.W, H: g.H, buttons: d.ui.buttons.map(b => [b.kind, b.notch, b.x, b.y, b.w, b.h]) }; });
await p.waitForTimeout(9000);   // doors close at 7 s
let i = await info(); const sc = 1280 / i.W; const click = async (k, n) => { const b = i.buttons.find(b => b[0] === k && (n === undefined || b[1] === n)); await p.mouse.move((b[2] + b[4] / 2) * sc, (b[3] + b[5] / 2) * sc); await p.waitForTimeout(150); await p.mouse.click((b[2] + b[4] / 2) * sc, (b[3] + b[5] / 2) * sc); await p.waitForTimeout(250); };
await click('notch', 3); i = await info(); console.log('click P3 ->', i.lever);
await p.mouse.wheel(0, 100); await p.waitForTimeout(300); i = await info(); console.log('wheel down ->', i.lever);
await p.mouse.wheel(0, -100); await p.waitForTimeout(200); await p.mouse.wheel(0, -100); await p.waitForTimeout(300); i = await info(); console.log('wheel up x2 ->', i.lever);
await click('neutral'); i = await info(); console.log('N button ->', i.lever);
await click('view'); i = await info(); console.log('CAM button -> view', i.view);
await click('eb'); i = await info(); console.log('EB button ->', i.lever);
await p.screenshot({ path: 'shots/mouse.png' });
console.log(errs.join('\n') || 'no errors'); await b.close();
