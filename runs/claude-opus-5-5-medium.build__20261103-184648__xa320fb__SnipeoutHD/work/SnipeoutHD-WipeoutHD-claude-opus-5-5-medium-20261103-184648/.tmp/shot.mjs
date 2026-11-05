import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html' + (process.argv[2] || '');
const waits = (process.argv[3] || '8000').split(',').map(Number), out = process.argv[4] || 'tests/out/spike';
const browser = await chromium.launch({ args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text().slice(0, 300)); }); page.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
await page.goto(url);
let k = 0; for (const w of waits) { await page.waitForTimeout(w); await page.screenshot({ path: out + '-' + (k++) + '.png' }); }
const info = await page.evaluate(() => { const g = window.__game, SN = window.SN; return { scene: g && g.sceneName, backend: My3D2dge.World3D && My3D2dge.World3D.backend, errors: g && g.errors.map(e => e.message), state: SN.scenes.race && SN.scenes.race.race && SN.scenes.race.race.state, t: SN.scenes.race && SN.scenes.race.race && SN.scenes.race.race.t, fps: g && g.fps, stats: SN.view && SN.view.world && SN.view.world.stats }; });
console.log(JSON.stringify(info)); console.log(logs.slice(0, 15).join('\n'));
await browser.close();
