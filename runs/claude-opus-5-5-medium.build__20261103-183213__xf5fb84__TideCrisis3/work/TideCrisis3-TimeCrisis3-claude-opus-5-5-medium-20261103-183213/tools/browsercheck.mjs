// The single HTML file from file:// in Chromium at four window sizes: the title, the menu, a scene in play, a boss,
// split screen and the attract demo; no page errors; the canvas filled. Prints PASS/FAIL lines; screenshots to .tmp/.
import { chromium } from 'playwright';
const root = new URL('..', import.meta.url).pathname, NAME = 'TideCrisis3-TimeCrisis3-claude-opus-5-5-medium-20261103-183213', url = 'file://' + root + '../' + NAME + '.html';
const sizes = [[1920, 1080], [1280, 720], [2560, 1080], [1024, 768]], links = ['', 'scene=menu', 'play=1:1-1&bot', 'play=2:2-B&bot', 'play=3:3-6&bot'];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [w, h] of sizes) for (const L of links) {
  const p = await b.newPage({ viewport: { width: w, height: h } }), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(url + (L ? '#' + L : '')); await p.waitForTimeout(L.startsWith('play') ? 5000 : 2500);
  const info = await p.evaluate(() => { const c = document.getElementById('screen'), g = document.createElement('canvas'); g.width = 64; g.height = 36; const x = g.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let lit = 0, cols = new Set(); for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] > 30) lit++; cols.add(d[i] >> 4 << 8 | d[i + 1] >> 4 << 4 | d[i + 2] >> 4); } return { lit: lit / (64 * 36), cols: cols.size, snap: JSON.stringify(My3D2dge.current.debug.snapshot()), errors: My3D2dge.current.errors.length }; });
  const name = `${w}x${h} ${L || 'title'}`;
  if (errs.length || info.errors) console.log('FAIL browser ' + name + ': ' + errs.slice(0, 3).join(' | '));
  else if (info.lit < .6 || info.cols < 12) console.log('FAIL browser ' + name + ': the canvas looks empty (' + (info.lit * 100 | 0) + '% lit, ' + info.cols + ' colours)');
  else console.log('PASS browser ' + name);
  if (w === 1280) await p.screenshot({ path: root + '.tmp/bc-' + (L || 'title').replace(/[^a-z0-9]/gi, '_') + '.png' });
  await p.close();
}
await b.close();
