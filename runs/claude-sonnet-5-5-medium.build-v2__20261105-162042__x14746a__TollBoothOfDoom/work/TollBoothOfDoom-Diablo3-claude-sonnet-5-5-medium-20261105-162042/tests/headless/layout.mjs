// Tier 2: every screen's text stays inside the 427 x 240 layout area, and no two texts overlap.
import { boot, newHeroByKeys, press, hero } from './driver.mjs';
import { makeItem } from '../../src/sim/items.js';
export const name = 'layout';
export async function run(t) {
  const g = await boot(); const { game, engine } = g;
  await newHeroByKeys(g, 0, true); engine.step(20);
  const w = game.world; const h = hero(game);
  for (let i = 0; i < 12; i++) h.inv.push(makeItem(w.lootRng, { slot: ['head', 'chest', 'main', 'ring'][i % 4], rarity: ['blessed', 'reliquary', 'legendary', 'set'][i % 4] === 'legendary' ? 'reliquary' : 'reliquary', ilvl: 20, cls: h.cls }));
  w.acct.stash[0].push(makeItem(w.lootRng, { slot: 'ring', rarity: 'blessed', ilvl: 5, cls: h.cls }));
  const check = (label) => {
    const ui = game.ui; const W = ui.real.width, H = ui.real.height; const vw = Math.min(W, 427), vh = Math.min(H, 240); const ox = Math.floor((W - vw) / 2), oy = Math.floor((H - vh) / 2);
    const d = ui.drawnText; t.ok(d.length > 0, `${label}: draws no text`);
    for (const q of d) if (q.x < ox - 0.5 || q.y < oy - 0.5 || q.x + q.w > ox + vw + 0.5 || q.y + q.h > oy + vh + 0.5) t.fail(`${label}: "${q.text.slice(0, 30)}" outside the layout area (${Math.round(q.x - ox)},${Math.round(q.y - oy)} w${q.w})`);
    let ov = 0, ex = '';
    for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) { const a = d[i], b = d[j]; if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) { ov++; if (!ex) ex = `"${a.text.slice(0, 20)}" x "${b.text.slice(0, 20)}"`; } }
    if (ov) t.fail(`${label}: ${ov} overlapping texts, e.g. ${ex}`);
  };
  const open = (type, data = {}) => { game.closeAll(); game.pushOverlay(type, data); engine.step(6); };
  for (const tab of [0, 1, 2, 3, 4]) { open('hero', { tab }); check('hero tab ' + tab); }
  for (const [type, data] of [['pause'], ['map'], ['settings'], ['howto'], ['party'], ['stash'], ['writs'], ['knellsetup'], ['vendor', { npc: 'penny' }], ['smith', { npc: 'brasse' }], ['reliquary', { npc: 'ogive' }], ['dev', { cat: 0 }], ['dev', { cat: 1 }], ['dev', { cat: 2 }], ['dev', { cat: 7 }], ['death'], ['lore', { lore: 0 }]]) { open(type, data || {}); check(type + (data && data.cat != null ? ' ' + data.cat : '')); }
  for (const mode of [0, 1, 2]) { open('smith', { npc: 'brasse', mode }); check('smith mode ' + mode); open('vendor', { npc: 'penny', mode }); check('vendor mode ' + mode); open('reliquary', { npc: 'ogive', mode }); check('reliquary mode ' + mode); }
  game.closeAll(); for (let p = 0; p < 5; p++) { game.aboutPage = p; game.pushOverlay('about', {}); engine.step(6); check('about page ' + p); game.closeAll(); }
  open('dialog', { npc: 'crier', spot: { x: h.x, z: h.z }, i: 0 }); game.closeAll(); game.cut = null;
  // title, menu, create steps
  const g2 = await boot(); const e2 = g2.engine, gm = g2.game; e2.step(30);
  const chk2 = (label) => { game2check(gm, t, label); };
  chk2('title'); press(e2, 'Enter'); e2.step(6); chk2('menu'); press(e2, 'ArrowDown'); press(e2, 'Enter'); e2.step(6); chk2('create slots'); press(e2, 'Enter'); e2.step(6); chk2('create class'); press(e2, 'Enter'); e2.step(6); chk2('create name');
  gm.mode = 'about'; gm.aboutPage = 0; e2.step(6); chk2('about from menu'); gm.mode = 'settingsMenu'; e2.step(6); chk2('settings from menu');
}
function game2check(game, t, label) {
  const ui = game.ui; const W = ui.real.width, H = ui.real.height; const vw = Math.min(W, 427), vh = Math.min(H, 240); const ox = Math.floor((W - vw) / 2), oy = Math.floor((H - vh) / 2); const d = ui.drawnText;
  t.ok(d.length > 0, `${label}: draws no text`);
  for (const q of d) if (q.x < ox - 0.5 || q.y < oy - 0.5 || q.x + q.w > ox + vw + 0.5 || q.y + q.h > oy + vh + 0.5) t.fail(`${label}: "${q.text.slice(0, 30)}" outside the layout area (${Math.round(q.x - ox)},${Math.round(q.y - oy)} w${q.w})`);
  let ov = 0, ex = ''; for (let i = 0; i < d.length; i++) for (let j = i + 1; j < d.length; j++) { const a = d[i], b = d[j]; if (a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5) { ov++; if (!ex) ex = `"${a.text.slice(0, 20)}" x "${b.text.slice(0, 20)}"`; } }
  if (ov) t.fail(`${label}: ${ov} overlapping texts, e.g. ${ex}`);
}
