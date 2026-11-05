import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto(pathToFileURL(resolve('../TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303.html')).href); await p.waitForTimeout(2500);
console.log(await p.evaluate(() => { const E = My3D2dge; const test = (o, st) => { const r = new E.Humanoid(o); for (let i = 0; i < 3; i++) r.update(.016, st); return r.J && r.J.head && Number.isFinite(r.worldOffset(r.J.head)[2]); };
  const base = { build: 'bulky', size: 1.6, outfit: 'coat', hat: 'helmet', armor: true, weapon: 'gun', colors: { cloth: '#4a4a56', coat: '#4a4a56', plate: '#7a828e', metal: '#9aa0aa', pants: '#2a2a30' } };
  const st = { x: 262, y: 0, z: 0, facing: Math.PI / 2, point: false, run: 0, vy: 10, expr: 'angry' };
  const out = {}; for (const k of ['x', 'y', 'vy', 'run', 'point', 'expr']) { const o2 = { x: 0, y: 0, z: 0, facing: 1.57 }; o2[k] = { x: 262, y: 0, vy: 10, run: 0, point: false, expr: 'angry' }[k]; out[k] = test(base, o2); } out.x0 = test(base, { x: 0, y: 0, z: 0, facing: 1.57 }); out.x262 = test(base, { x: 262, y: 0, z: 0, facing: 1.57 }); out.size1x262 = test(Object.assign({}, base, { size: 1 }), { x: 262, y: 0, z: 0, facing: 1.57 }); return JSON.stringify(out); }));
await b.close();
