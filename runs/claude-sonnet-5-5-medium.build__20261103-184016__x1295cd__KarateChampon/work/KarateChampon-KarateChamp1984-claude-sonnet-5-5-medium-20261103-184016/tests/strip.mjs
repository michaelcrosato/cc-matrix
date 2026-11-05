// a contact sheet of techniques: node tests/strip.mjs out-name id1,id2,...
import { chromium } from '../engine/node_modules/playwright/index.mjs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), name = path.basename(root); const [out, ids] = process.argv.slice(2);
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto(pathToFileURL(path.join(root, '..', name + '.html')).href + '#fight/dojo/kamaboko'); await page.waitForTimeout(3500);
const sheet = await page.evaluate(async (ids) => {
  const g = My3D2dge.current, KC = window.KC, sc = KC.current, b = sc.bout; KC.dev.freezeAll = true; b.f.forEach(f => { f.frozen = false; });
  const cv = document.createElement('canvas'), COLS = 7, CW = 140, CH = 125; cv.width = COLS * CW; cv.height = ids.length * CH; b.refActor = null; const cx = cv.getContext('2d');
  for (let r = 0; r < ids.length; r++) {
    const id = ids[r]; b.f[0].reset(); b.f[1].reset(); b.f[0].x = 170; b.f[1].x = 170 + 18 + 30; b.f[1].posePose = 'crouch'; b.f[1].posePose = null;
    b.f[0].start(id, b.f[1], 'n', 'r'); const tot = (b.f[0].fr[0] + b.f[0].fr[1] + b.f[0].fr[2]); const every = Math.max(1, Math.round(Math.min(tot, 110) / COLS));
    for (let c = 0; c < COLS; c++) { for (let k = 0; k < every; k++) { b.f[0].step(b.f[1], null); b.f[0].update(1 / 120, b.f[1]); b.f[1].update(1 / 120, b.f[0]); } g.advance(1 / 120, { draw: true }); const buf = g.screen.buf; sc.hud.call = null; sc.hud.pop = []; b.refActor = null; const sx = Math.round(g.screen.W / 2 - 80), sy = 85; cx.drawImage(buf, sx, sy, CW, CH, c * CW, r * CH, CW, CH); cx.fillStyle = '#ff0'; cx.font = '9px monospace'; if (c === 0) cx.fillText(id, c * CW + 2, r * CH + 10); }
  }
  return cv.toDataURL('image/png');
}, ids.split(','));
const b64 = sheet.split(',')[1]; (await import('node:fs')).writeFileSync(path.join(root, 'tests/out', out + '.png'), Buffer.from(b64, 'base64')); await browser.close(); console.log('ok');
