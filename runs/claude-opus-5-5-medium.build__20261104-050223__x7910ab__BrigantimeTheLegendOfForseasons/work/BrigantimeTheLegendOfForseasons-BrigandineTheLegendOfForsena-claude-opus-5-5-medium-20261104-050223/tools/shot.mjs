// screenshot helper: node tools/shot.mjs <hash> <out.png> [keys...] (keys: KeyCode or KeyCode*N or wait:ms)
import { createRequire } from 'node:module'; const { chromium } = createRequire(new URL('../engine/package.json', import.meta.url))('playwright');
import { readdirSync } from 'node:fs';
const [, , hash, out, ...keys] = process.argv;
const file = new URL('../../' + readdirSync(new URL('../../', import.meta.url)).find(f => f.endsWith('.html')), import.meta.url).href;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(file + '#' + hash); await p.waitForTimeout(2500);
for (const k of keys) { if (k.startsWith('wait:')) { await p.waitForTimeout(+k.slice(5)); continue; } const [code, n] = k.split('*'); for (let i = 0; i < (+n || 1); i++) { await p.keyboard.down(code); await p.waitForTimeout(60); await p.keyboard.up(code); await p.waitForTimeout(140); } }
await p.waitForTimeout(600); await p.screenshot({ path: out });
const snap = await p.evaluate(() => window.__game && window.__game.game.debug.snapshot());
console.log(JSON.stringify({ scene: snap.scene, flow: snap.flow, panel: snap.panel, errors: snap.errors, pageErrors: errs.slice(0, 3) }));
await b.close();
