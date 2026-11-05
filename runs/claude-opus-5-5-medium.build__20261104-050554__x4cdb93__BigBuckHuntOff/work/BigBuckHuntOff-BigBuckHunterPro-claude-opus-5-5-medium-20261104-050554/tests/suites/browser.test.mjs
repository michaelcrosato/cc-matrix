// Browser checks (node tests/run.mjs --browser): the bundle from file:// at deep links with no errors, screenshots in
// tests/out; the pick-agreement check (what is drawn is what is hit); glyphs follow an emulated gamepad.
import { chromium } from 'playwright';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, done } from '../lib/check.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = 'file://' + resolve(ROOT, '..', 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-medium-20261104-050554.html');
const b = await chromium.launch();
const open = async (hash, o = {}) => { const p = await b.newPage(Object.assign({ viewport: { width: 960, height: 540 } }, o)); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); if (o.init) await p.addInitScript(o.init); await p.goto(FILE + hash); return { p, errs }; };
for (const l of ['title', 'menu', 'hunt/hollow/1', 'hunt/bugle/2', 'hunt/muskeg/3', 'trophy/muskeg', 'bonus/crow', 'range', 'lodge', 'about', 'attract', 'party/2', 'animallab', 'soundlab', 'dev']) {
  const { p, errs } = await open('#' + l); await p.waitForTimeout(5000);
  await p.screenshot({ path: join(ROOT, 'tests/out', 'b-' + l.replace(/\//g, '-') + '.png') });
  const n = await p.evaluate(() => My3D2dge.current.errors.length);
  check('#' + l + ' runs with no errors', !errs.length && n === 0, errs.join(' | '));
  await p.close();
}
// pick agreement: render each live animal flat into an id buffer, sample inside and just outside the silhouettes
{
  const { p } = await open('#hunt/hollow/1'); await p.waitForTimeout(14000);
  const r = await p.evaluate(() => {
    const B = BB, play = B.play, site = play.site, T = B.mainTarget; let inN = 0, inOk = 0, outN = 0, outBad = 0;
    const ids = new Map(); for (const a of site.herd.list) ids.set(100 + (a.id % 60000), a);
    const W = T.W, H = T.H;
    for (let i = 0; i < W * H && inN < 600; i += 3) { const id = T.ids[i]; const a = ids.get(id); if (!a || a.cat !== 'animal' || !a.live) continue; const x = i % W + .5, y = Math.floor(i / W) + .5; const res = B.castShot(site, site.lens, x, y); inN++; if (res.actor === a) inOk++; }
    for (let i = 0; i < W * H && outN < 600; i += 2) { const x = i % W, y = Math.floor(i / W); if (x < 3 || x > W - 4) continue; const here = ids.get(T.ids[i]); if (here) continue; const nb = ids.get(T.ids[i + 3]) || ids.get(T.ids[i - 3]); if (!nb || nb.cat !== 'animal' || !nb.live) continue; const res = B.castShot(site, site.lens, x + .5, y + .5); outN++; if (res.actor === nb) outBad++; }
    return { inN, inOk, outN, outBad };
  });
  check('pick: at least 90% of pixels inside a silhouette hit that animal', r.inN > 20 && r.inOk / r.inN >= .9, JSON.stringify(r));
  check('pick: at most 10% of pixels 3 px outside hit it', r.outN === 0 || r.outBad / r.outN <= .1, JSON.stringify(r));
  await p.close();
}
// glyphs follow a gamepad: a standard pad stub pressing a button
{
  const init = () => { let pressed = false; const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [pad]; window.__pad = pad; };
  const { p, errs } = await open('#menu', { init }); await p.waitForTimeout(3000);
  await p.evaluate(() => { __pad.buttons[13].pressed = true; __pad.buttons[13].value = 1; __pad.timestamp++; }); await p.waitForTimeout(300);
  await p.evaluate(() => { __pad.buttons[13].pressed = false; __pad.buttons[13].value = 0; __pad.timestamp++; }); await p.waitForTimeout(300);
  const g = await p.evaluate(() => [My3D2dge.current.input.lastDevice, BB.glyphFor('confirm').text, BB.glyphFor('call').text]);
  check('a pad switches prompts to PlayStation glyphs', g[0] === 'gamepad' && g[1] === '✕' && g[2] === '△', JSON.stringify(g));
  await p.evaluate(() => My3D2dge.current.settings.set('glyphs', 'xbox'));
  const g2 = await p.evaluate(() => BB.glyphFor('confirm').text); check('the Xbox setting shows A', g2 === 'A', g2);
  await p.mouse.move(300, 200); await p.mouse.move(320, 220); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(200);
  const g3 = await p.evaluate(() => BB.glyphFor('fire').kind); check('the mouse switches prompts to the mouse', g3 === 'mouse', g3);
  check('glyph page has no errors', !errs.length, errs.join('|'));
  await p.close();
}
// a phone, touch-only: the message and the settings button
{
  const { p, errs } = await open('', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await p.waitForTimeout(4000);
  const t = await p.evaluate(() => BB.touchOnly); await p.screenshot({ path: join(ROOT, 'tests/out/b-phone.png') });
  check('a touch-only phone shows the gate', t === true, t);
  await p.close();
}
await b.close();
done();
