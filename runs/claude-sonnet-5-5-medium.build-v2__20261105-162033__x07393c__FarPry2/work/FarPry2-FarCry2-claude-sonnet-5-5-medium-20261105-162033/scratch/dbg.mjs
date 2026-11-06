import { chromium } from 'playwright';
import { GAME_HTML, CHROME_FLAGS } from '../tests/lib/serve.mjs';
process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64';
const b = await chromium.launch({ args: CHROME_FLAGS }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.goto('file://' + GAME_HTML); await p.evaluate(() => window.__PIXEL_READY__);
console.log(JSON.stringify(await p.evaluate(() => { const g = window.__GAME__, e = window.__PIXEL_ENGINE__; e.step(30); const n = g.npcs.view('tibor'); const o = n.view.object; o.updateMatrixWorld(true); const bx = new (g.player.feet.constructor)(); let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], nan = 0; o.traverse((m) => { if (m.isMesh) { const p = new m.position.constructor().setFromMatrixPosition(m.matrixWorld); if (isNaN(p.x)) nan++; else { mn = [Math.min(mn[0], p.x), Math.min(mn[1], p.y), Math.min(mn[2], p.z)]; mx = [Math.max(mx[0], p.x), Math.max(mx[1], p.y), Math.max(mx[2], p.z)]; } } }); return { mn, mx, nan, wp: o.position.toArray() }; })));
await b.close();
