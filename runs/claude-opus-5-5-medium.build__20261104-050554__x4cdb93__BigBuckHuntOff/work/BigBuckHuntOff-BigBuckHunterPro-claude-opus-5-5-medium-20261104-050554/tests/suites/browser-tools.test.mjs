// Every dev tool, every Animal Lab animal and pose, every Sound Lab item, Xbox glyphs on screen, and each attract clip.
import { chromium } from 'playwright';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, done } from '../lib/check.mjs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), OUT = join(ROOT, 'tests/out');
const FILE = 'file://' + resolve(ROOT, '..', 'BigBuckHuntOff-BigBuckHunterPro-claude-opus-5-5-medium-20261104-050554.html');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const open = async (hash) => { const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto(FILE + hash); return { p, errs }; };
const engineErrors = p => p.evaluate(() => My3D2dge.current.errors.length);
// ---- every dev tool, through the panel ----
{
  const { p, errs } = await open('#hunt/hollow/1'); await p.waitForTimeout(7000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.getByText('Dev mode', { exact: true }).first().click(); await p.waitForTimeout(400);
  const page = async i => { await p.evaluate(i => { BB.dev.stack.length = 1; BB.dev.stack[0].list.i = i; }, i); await p.keyboard.press('Enter'); await p.waitForTimeout(300); };
  const pick = async label => { const ok = await p.evaluate(l => { const pg = BB.dev.stack[BB.dev.stack.length - 1]; const i = pg.list.items.findIndex(x => (typeof x.label === 'function' ? x.label() : x.label) === l); pg.list.i = i; return i >= 0; }, label); await p.keyboard.press('Enter'); await p.waitForTimeout(300); return ok; };
  const S = () => p.evaluate(() => My3D2dge.current.debug.snapshot());
  await page(1);
  // freeze and slow motion
  await pick('FREEZE'); const t0 = (await S()).siteTime; await p.waitForTimeout(800); const t1 = (await S()).siteTime;
  check('freeze stops the sim', t1 === t0, t0 + ' ' + t1); await pick('FREEZE');
  await pick('SLOW MOTION (0.25X)'); check('slow motion sets the time scale', (await S()).timeScale === .25, (await S()).timeScale); await pick('SLOW MOTION (0.25X)');
  // spawns at the reticle
  const n0 = (await S()).actors.length;
  await pick('SPAWN BUCK AT RETICLE'); await pick('SPAWN DOE AT RETICLE'); await pick('SPAWN CRITTER AT RETICLE');
  const sn = await S(), added = sn.actors.slice(n0).map(a => a.kind);
  check('spawn buck, doe and critter at the reticle', added.includes('buck') && added.includes('doe') && added.includes('rabbit'), added.join(','));
  // god mode: shoot a doe, no bench
  await pick('GOD MODE (NO PENALTIES)');
  const benched = await p.evaluate(() => { const site = BB.play.site, d = site.herd.list.find(a => a.kind === 'doe' && a.live); const pl = BB.play.players[0]; const pt = BB.aimPointOf(d, 'heart'), P = site.lens.project(...pt); pl.chambered = true; BB.play.fire(pl, P[0], P[1]); return pl.benched; });
  check('god mode prevents benching', benched === false && await p.evaluate(() => BB.CHEAT.god)); await pick('GOD MODE (NO PENALTIES)');
  // kill all
  await p.evaluate(() => { window.__all = BB.play.site.herd.list.filter(a => a.live); }); await pick('KILL ALL'); check('kill all', await p.evaluate(() => __all.length > 0 && __all.every(a => a.dead)), await p.evaluate(() => __all.length));
  // infinite ammo refills
  await pick('INFINITE AMMO'); const rounds = await p.evaluate(() => { const pl = BB.play.players[0]; for (let k = 0; k < 7; k++) { pl.chambered = true; pl.rack = 0; BB.play.fire(pl, 240, 100); BB.stepPlayer(pl, 1 / 120, { intent: { move: [0, 0], pump: true }, W: 480, H: 270, t: 99 + k }); } return pl.rounds; });
  check('infinite ammo never empties the tube', rounds > 0, rounds); await pick('INFINITE AMMO');
  // bot plays: cycle novice, average, expert, off
  const skills = []; for (let k = 0; k < 4; k++) { await pick('BOT PLAYS'); skills.push(await p.evaluate(() => BB.play.players[0].bot ? BB.play.players[0].bot.skill : 'off')); }
  check('bot plays cycles every skill', skills.join(',') === 'novice,average,expert,off', skills.join(','));
  await pick('SHOW FRAME RATE'); check('frame rate readout toggles', await p.evaluate(() => My3D2dge.current.settings.showFps === true)); await pick('SHOW FRAME RATE');
  await pick('UNLOCK ALL TROPHIES'); check('unlock all trophies', await p.evaluate(() => Object.values(BB.records.trophies).filter(t => t.bagged).length === 3 && BB.records.range));
  await pick('RESET SAVE DATA'); check('reset save data asks first', await p.evaluate(() => Object.values(BB.records.trophies).length === 3));
  await pick('REALLY RESET SAVE DATA?'); check('then resets', await p.evaluate(() => Object.keys(BB.records.trophies).length === 0));
  const logs = []; p.on('console', m => logs.push(m.text())); await pick('COPY SNAPSHOT (CONSOLE)'); await p.waitForTimeout(200);
  check('copy snapshot logs JSON', logs.some(l => { try { return JSON.parse(l).scene === 'hunt'; } catch (e) { return false; } }));
  await p.screenshot({ path: join(OUT, 't-tools.png') });
  // jump to: every site, trophy and bonus of the three hunts
  const visited = [];
  const jumps = await p.evaluate(() => { BB.dev.stack.length = 1; BB.dev.stack[0].list.i = 2; return 0; }); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const count = await p.evaluate(() => BB.dev.stack[BB.dev.stack.length - 1].list.items.length);
  for (let i = 0; i < count; i++) {
    if (i) { await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.getByText('Dev mode', { exact: true }).first().click(); await p.waitForTimeout(400); await p.evaluate(() => { BB.dev.stack[0].list.i = 2; }); await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
    await p.evaluate(i => { const pg = BB.dev.stack[BB.dev.stack.length - 1]; pg.list.i = i; }, i); await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    visited.push((await S()).site);
  }
  check('jump to reaches all 15 sites, trophies and bonus games', count === 15 && new Set(visited).size === 15, visited.join(','));
  check('dev tools: no errors', !errs.length && await engineErrors(p) === 0, errs.join(' | '));
  await p.close();
}
// ---- the Animal Lab: every animal, every pose, the x-ray ----
{
  const { p, errs } = await open('#animallab'); await p.waitForTimeout(2500);
  const seen = new Set();
  for (let a = 0; a < 9; a++) { for (let g = 0; g < 7; g++) { seen.add(await p.evaluate(() => BB.animalLabScene.label + '/' + BB.animalLabScene.gname)); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(120); } if (a === 3) { await p.keyboard.press('Enter'); await p.waitForTimeout(200); await p.screenshot({ path: join(OUT, 't-lab-xray.png') }); await p.keyboard.press('Enter'); } await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150); }
  check('the Animal Lab shows 9 animals in 7 poses', seen.size === 63, seen.size);
  check('animal lab: no errors', !errs.length && await engineErrors(p) === 0, errs.join(' | '));
  await p.close();
}
// ---- the Sound Lab: every song, layer, sfx and voice ----
{
  const { p, errs } = await open('#soundlab'); await p.waitForTimeout(2500); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
  const n = await p.evaluate(() => BB.soundLabScene.list.items.length);
  for (let i = 0; i < n; i++) { await p.evaluate(i => { BB.soundLabScene.list.i = i; }, i); await p.keyboard.press('Enter'); await p.waitForTimeout(60); }
  const st = await p.evaluate(() => [My3D2dge.current.audio.ctx && My3D2dge.current.audio.ctx.state, My3D2dge.current.errors.length]);
  check('the Sound Lab plays all ' + n + ' items', n > 60 && st[0] === 'running' && st[1] === 0, JSON.stringify(st));
  check('sound lab: no errors', !errs.length, errs.join(' | '));
  await p.close();
}
// ---- Xbox glyphs on screen ----
{
  const { p } = await open('#menu'); await p.waitForTimeout(2500);
  await p.evaluate(() => { My3D2dge.current.settings.set('glyphs', 'xbox'); My3D2dge.current.input.lastDevice = 'gamepad'; });
  await p.waitForTimeout(300); await p.screenshot({ path: join(OUT, 't-xbox.png') });
  check('Xbox glyphs drawn', await p.evaluate(() => BB.glyphFor('confirm').text === 'A' && BB.glyphFor('cancel').text === 'B'));
  await p.close();
}
// ---- the attract playlist: each clip in order with the scene it shows, then the loop back ----
{
  const { p, errs } = await open('#attract'); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => { const G = My3D2dge.current, B = BB; G.stop(); const seen = []; let t = 0;
    while (t < 150 && B.attract) { const i = B.attract.i, s = G.debug.snapshot(); if (G._fade == null && !seen.some(x => x[0] === i)) seen.push([i, B.ATTRACT_CLIPS[i].kind, s.scene + (s.site ? ':' + s.site : '')]); G.advance(.25); t += .25; if (B.attract.n > 7) break; }
    const back = B.attract ? B.attract.i : null; G.start(); return { seen, back, errors: G.errors.length }; });
  const want = ['hunt:hollow-1', 'hunt:bugle-2', 'hunt:bonus-saucer', 'hunt:big-mo', 'attract', 'lodge', 'attract'];
  check('the attract mode plays all 7 clips in order and loops', r.seen.length === 7 && r.seen.every((x, k) => x[0] === k && x[2] === want[k]) && r.back === 0, JSON.stringify(r.seen));
  check('attract: no errors', !errs.length && r.errors === 0, errs.join(' | '));
  await p.close();
}
await b.close(); done();
