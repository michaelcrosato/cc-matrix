// Browser smoke: plays the whole Hunt-Off in the built file with draw on, reports engine errors, screenshots key phases.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
const html = process.argv[2], out = process.argv[3];
const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(html).href); await page.waitForTimeout(2000);
await page.evaluate(() => { BB.startRun('huntoff', {}); BB.game.advance(.3, { draw: true }); });
const wants = new Set(['bonus:bonus_crows', 'bonus:bonus_saucers', 'bonus:bonus_snowballs', 'site:ironrack', 'site:duke', 'site:bigmo', 'results', 'ceremony', 'site:bugle3', 'site:muskeg3', 'site:hollow2']);
const shot = new Set();
for (let i = 0; i < 6000; i++) {
  const st = await page.evaluate(() => {
    const H = BB.H, g = BB.game; if (g.sceneName !== 'hunt') return { done: true, scene: g.sceneName };
    const p = BB.players[0]; if (p && !p.bot) { p.bot = BB.makeBot('expert', true); p.bot.auto = true; }
    if (['story', 'tally', 'results', 'ceremony'].includes(H.phase) || H.phase === 'card' && H.pt > 1.5) g.input.tap('confirm');
    g.advance(.5, { draw: true });
    return { phase: H.phase, seg: H.seg ? H.seg.t + ':' + (H.seg.id || '') : '', t: H.ctx ? H.ctx.t : 0, errs: g.errors.length, cam: !!H.cam };
  });
  if (st.done) { console.log('finished in scene', st.scene, 'steps', i); break; }
  const key = st.phase === 'results' || st.phase === 'ceremony' ? st.phase : st.seg;
  if (wants.has(key) && !shot.has(key) && (st.phase === 'play' && st.t > 6 || st.phase === 'results' || st.phase === 'ceremony')) { shot.add(key); await page.screenshot({ path: `${out}/pt_${key.replace(':', '_')}.png` }); }
  if (st.cam && !shot.has('cam')) { shot.add('cam'); await page.screenshot({ path: `${out}/pt_trophycam.png` }); }
}
const e = await page.evaluate(() => BB.game.errors.map(x => x.message + ' | ' + String(x.stack || '').split('\n').slice(0, 3).join(' / ')));
console.log('engine errors:', JSON.stringify(e.slice(0, 6)), 'page errors:', JSON.stringify(errs.slice(0, 5)));
console.log('screenshots:', [...shot].join(','));
await browser.close();
