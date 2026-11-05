// Dev mode in a real browser, from the real pause menu: Escape pauses, the Dev mode item opens the panel, a slider
// turns live, overlays (hit volumes, states, the fan) draw, a tool bags the bucks, the free camera moves the lens.
import { chromium } from 'playwright';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, done } from '../lib/check.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = 'file://' + resolve(ROOT, '..', 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-medium-20261104-050554.html');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(FILE + '#hunt/hollow/1'); await p.waitForTimeout(6000);
await p.keyboard.press('Escape'); await p.waitForTimeout(600);
check('Escape pauses the hunt', await p.evaluate(() => My3D2dge.current.paused));
const btn = p.getByText('Dev mode', { exact: true });
check('the pause menu lists Dev mode', await btn.count() > 0);
await btn.first().click(); await p.waitForTimeout(500);
check('Dev mode opens and play resumes under it', await p.evaluate(() => BB.devOpen && !My3D2dge.current.paused));
await p.screenshot({ path: join(ROOT, 'tests/out/d-root.png') });
// tuning: open the sliders page, turn the first (animal speed) right twice
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
check('a slider turns live', await p.evaluate(() => BB.TUNING.animalSpeed) > 1);
await p.screenshot({ path: join(ROOT, 'tests/out/d-tuning.png') });
// reset all: the last item of the tuning page
await p.evaluate(() => { const pg = BB.dev.stack[BB.dev.stack.length - 1]; pg.list.i = pg.list.items.length - 1; }); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
check('reset to defaults', await p.evaluate(() => BB.TUNE_SPEC.every(([k, , d]) => BB.TUNING[k] === d)));
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
// overlays page: all three on
await p.evaluate(() => { BB.dev.stack[0].list.i = 3; }); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
for (let k = 0; k < 3; k++) { await p.keyboard.press('Enter'); await p.waitForTimeout(150); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); }
check('the three overlays are on', await p.evaluate(() => Object.values(BB.CHEAT.overlays).every(Boolean)));
await p.keyboard.press('Escape'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
await p.waitForTimeout(3000); await p.screenshot({ path: join(ROOT, 'tests/out/d-overlays.png') });
// tools: bag all, then the free camera
await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.getByText('Dev mode', { exact: true }).first().click(); await p.waitForTimeout(400);
await p.evaluate(() => { BB.dev.stack[0].list.i = 1; }); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
const pick = async label => { await p.evaluate(l => { const pg = BB.dev.stack[BB.dev.stack.length - 1]; pg.list.i = pg.list.items.findIndex(i => (typeof i.label === 'function' ? i.label() : i.label) === l); }, label); await p.keyboard.press('Enter'); await p.waitForTimeout(300); };
const before = await p.evaluate(() => { window.__live = BB.play.site.herd.list.filter(a => a.cat === 'animal' && a.legal && a.live && !a.hidden); return __live.length; });
await pick('BAG ALL BUCKS');
const after = await p.evaluate(() => __live.filter(a => a.dead).length);
check('the Bag all tool bags the live bucks', before > 0 && after === before, before + ' -> ' + after);
await pick('INFINITE AMMO'); check('infinite ammo toggles', await p.evaluate(() => BB.CHEAT.infinite));
await pick('FREE CAMERA'); await p.waitForTimeout(300);
const x0 = await p.evaluate(() => [BB.play.site.lens.x, BB.play.site.lens.y]);
await p.keyboard.down('KeyW'); await p.waitForTimeout(900); await p.keyboard.up('KeyW'); await p.waitForTimeout(200);
const x1 = await p.evaluate(() => [BB.play.site.lens.x, BB.play.site.lens.y]);
check('the free camera moves the lens', Math.hypot(x1[0] - x0[0], x1[1] - x0[1]) > 5, JSON.stringify([x0, x1]));
await p.screenshot({ path: join(ROOT, 'tests/out/d-freecam.png') });
check('no errors', !errs.length && await p.evaluate(() => My3D2dge.current.errors.length) === 0, errs.join(' | '));
await b.close(); done();
