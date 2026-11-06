// Screenshots for your own eyes: node tools/shots.mjs writes every screen the plan lists to tools/out/ at 1920x1080, plus contact sheets.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { openGame, shot, step, pressKey } from './browser.mjs';
mkdirSync('tools/out', { recursive: true });
const names = [];
const snap = async (page, n) => { await shot(page, `tools/out/${n}.png`); names.push(n); };
const hero = async (clsIdx) => {
  const r = await openGame(); const { page } = r; await step(page, 30); if (clsIdx === 0) await snap(page, 'title');
  await pressKey(page, 'Enter'); await step(page, 5); if (clsIdx === 0) await snap(page, 'menu');
  await pressKey(page, 'Enter'); await step(page, 5); for (let i = 0; i < clsIdx; i++) await pressKey(page, 'ArrowRight'); await step(page, 20); if (clsIdx === 2) await snap(page, 'hero_select');
  await pressKey(page, 'Enter'); await step(page, 3); await page.evaluate(() => { G.ui.focus = 'n:last'; }); await step(page, 2); await pressKey(page, 'Enter'); await step(page, 20);
  await page.evaluate(() => { G.play.hud.toasts = []; G.play.autoDialog = true; G.autoDismiss = true; G.play.world.cheats.god = true; });
  return r;
};
const zone = (page, z) => page.evaluate((id) => { G.play.menus.closeAll(); G.play.world.cheats.god = true; G.play.hud.toasts = []; G.play.command({ c: 'dev', k: 'boss', zone: id }, 0); G.play.bots[0] = true; const w = G.play.world; const h = w.heroes[0]; const r = w.zone.roomRects[Math.floor(w.zone.roomRects.length / 2)]; if (w.zone.spec.kind === 'gen') { const q = w.zone.nav; let x = r.x + r.w / 2; let zz = r.y + r.h / 2; for (let i = 0; i < 9 && !q.walkable(x, zz); i++) x += 1; h.x = x; h.z = zz; h.px = x; h.pz = zz; } }, z);
// Bellwarden: zones and bosses.
{ const { browser, page, errors } = await hero(0);
  await snap(page, 'town');
  await page.evaluate(() => { G.play.autoDialog = false; const w = G.play.world; const c = w.props.find((p) => p.npc === 'crier'); const h = w.heroes[0]; h.x = c.x - 1.2; h.z = c.z + 1; h.px = h.x; h.pz = h.z; }); await step(page, 5); await pressKey(page, 'KeyE'); await step(page, 15); await snap(page, 'dialogue'); await page.evaluate(() => { G.play.dialog = null; G.play.autoDialog = true; });
  for (const z of ['yard', 'causeway', 'pantry', 'ossuary2', 'cloister', 'belfry1']) { await zone(page, z); await page.evaluate(() => { G.play.world.tuning.monsterHp = 4; }); await step(page, 200); await snap(page, `zone_${z}`); }
  await zone(page, 'causeway'); await page.evaluate(() => { const w = G.play.world; w.tuning.monsterHp = 5; for (let i = 0; i < 45; i++) G.play.command({ c: 'dev', k: 'spawn', type: i % 4 ? 'peatwalker' : 'gibbet_drop' }, 0); G.play.bots = {}; for (const m of w.monsters) if (!m.dormant) { m.hp = 1e7; m.maxHp = 1e7; const a = (m.id * 2.4) % 6.283; const r = 2 + (m.id % 6); m.x = w.heroes[0].x + Math.cos(a) * r; m.z = w.heroes[0].z + Math.sin(a) * r * 0.5; m.px = m.x; m.pz = m.z; } }); await step(page, 90); console.log('horde', await page.evaluate(() => G.play.world.active.length)); await snap(page, 'combat_horde');
  await page.evaluate(() => { G.play.world.tuning.monsterHp = 1; }); await zone(page, 'countinghouse'); await step(page, 300); await snap(page, 'boss_bursar');
  await zone(page, 'cloister'); await page.evaluate(() => { const w = G.play.world; const a = w.monsters.find((m) => m.type === 'ambrose'); const h = w.heroes[0]; h.x = a.x + 6; h.z = a.z + 2; h.px = h.x; h.pz = h.z; }); await step(page, 240); await snap(page, 'boss_ambrose');
  await zone(page, 'belfry_top'); await step(page, 400); await snap(page, 'boss_malison1'); await page.evaluate(() => { const m = G.play.world.boss.m; m.hp = m.maxHp * 0.59; }); await step(page, 420); await snap(page, 'boss_malison2'); await page.evaluate(() => { const m = G.play.world.boss.m; m.hp = m.maxHp * 0.24; }); await step(page, 200); await snap(page, 'boss_malison3');
  await page.evaluate(() => { G.play.command({ c: 'dev', k: 'boss', zone: 'town' }, 0); G.play.bots = {}; }); await step(page, 5);
  for (const [t, tab] of [['hero', 0], ['hero', 1], ['hero', 2], ['hero', 3], ['hero', 4], ['vendor', 0], ['vendor', 2], ['brasse', 0], ['brasse', 1], ['ogive', 1], ['stash', 0], ['map', 0], ['knell', 1], ['writs', 0], ['party', 0], ['settings', 0], ['dev', 7], ['about', 0], ['about', 4], ['howto', 0]]) { await page.evaluate(([a, b]) => { G.play.menus.closeAll(); G.play.menus.push(a, { tab: b }); }, [t, tab]); await step(page, 3); await snap(page, `ui_${t}_${tab}`); }
  await page.evaluate(() => { G.play.menus.closeAll(); G.play.command({ c: 'dev', k: 'knellStart' }, 0); G.play.bots[0] = true; G.play.world.knell.meter = G.play.world.knell.total * 0.6; }); await step(page, 200); await snap(page, 'knell_meter');
  console.log(errors.slice(0, 5)); await browser.close(); }
// The other two classes casting.
for (const c of [1, 2]) { const { browser, page, errors } = await hero(c); await zone(page, 'ossuary2'); await page.evaluate(() => { const w = G.play.world; w.tuning.monsterHp = 5; for (let i = 0; i < 20; i++) G.play.command({ c: 'dev', k: 'spawn', type: 'rattlebones' }, 0); }); await step(page, 240); await snap(page, `class_${c}_casting`); console.log(errors.slice(0, 5)); await browser.close(); }
// The couch: four pads, one screen.
{ const pads = () => { const mk = (i) => ({ index: i, id: `s${i}`, connected: true, mapping: 'standard', buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] }); window.__pads = [mk(0), mk(1), mk(2), mk(3)]; navigator.getGamepads = () => window.__pads; window.__press = (i, b, on) => { const p = window.__pads[i]; p.buttons[b].pressed = on; p.buttons[b].value = on ? 1 : 0; }; };
  const { browser, page } = await openGame({ init: pads }); const tap = async (b, pad = 0) => { await page.evaluate(([x, y]) => { __press(y, x, true); E.step(3); __press(y, x, false); E.step(3); }, [b, pad]); };
  await step(page, 30); await tap(0); await tap(0); await tap(0); await page.evaluate(() => { G.ui.focus = 'n:last'; }); await step(page, 2); await tap(0); await step(page, 5);
  for (const pad of [1, 2, 3]) { await tap(9, pad); await step(page, 3); await page.evaluate((c) => { G.ui.focus = `jc:${c}`; }, ['lamplighter', 'sexton', 'bellwarden'][pad - 1]); await step(page, 2); await tap(0, pad); await step(page, 3); }
  await page.evaluate(() => { G.play.hud.toasts = []; G.play.command({ c: 'dev', k: 'knellStart' }, 0); G.play.bots = { 0: true, 1: true, 2: true, 3: true }; for (const h of G.play.world.heroes) h.attractGod = true; }); await step(page, 400); await snap(page, 'couch_hud');
  await page.evaluate(() => { G.play.bots = {}; G.menuOwner = 2; G.play.menus.push('hero', { seat: 2, tab: 0 }); }); await step(page, 3); await snap(page, 'couch_seat_menu'); await browser.close(); }
// Attract, and touch.
{ const { browser, page } = await openGame(); await step(page, 640); await step(page, 120); await snap(page, 'attract_town'); await page.evaluate(() => { const a = G.shell.attract; a.i = 0; a.t = 99; }); await step(page, 400); await snap(page, 'attract_causeway'); await browser.close(); }
{ const { devices } = await import('playwright'); const d = devices['Pixel 7']; const { browser, page } = await openGame({ width: d.viewport.width, height: d.viewport.height, context: { ...d, viewport: d.viewport } }); await step(page, 30); await snap(page, 'touch'); await browser.close(); }
// magick exits non-zero when it finds no label font, yet still writes the sheet.
for (let i = 0; i * 12 < names.length; i++) { try { execFileSync('magick', ['montage', ...names.slice(i * 12, i * 12 + 12).map((n) => `tools/out/${n}.png`), '-tile', '4x3', '-geometry', '480x270+2+2', `tools/out/sheet${i}.png`], { stdio: 'ignore' }); } catch { /* the sheet is there */ } }
console.log(names.length, 'shots');
