// Dev Mode: the standard tools for testing the game quickly, and every balance number as a live slider.
import { CLASSES, CLASS_IDS } from '../data/classes.js';
import { LEGENDARIES, RARITIES, SETS, SLOTS } from '../data/items.js';
import { AFFLICTION_IDS, MONSTERS } from '../data/monsters.js';
import { makeTuning, TUNING_DEFS } from '../data/tuning.js';
import { ZONES } from '../data/zones.js';
import { footer } from './glyphs.js';
import { QUESTS } from '../sim/quests.js';
import { scrollList } from './menus.js';

export const DEV_TABS = ['CHEATS', 'GIVE', 'SPAWN', 'TRAVEL', 'WORLD', 'PARTY', 'VIEW', 'SLIDERS'];
export const OVERLAYS = [['nav', 'NAV GRID'], ['hit', 'HIT CIRCLES'], ['ai', 'AI STATE'], ['spawn', 'SPAWN MARKERS'], ['flow', 'FLOW FIELD'], ['fps', 'FPS AND ENGINE STATE']];

export function devItems(tab, play, w, h) {
  const dev = (k, extra = {}) => () => play.command({ c: 'dev', k, ...extra }, h.seat);
  switch (DEV_TABS[tab]) {
    case 'CHEATS': return [['god', 'GOD MODE'], ['oneHit', 'ONE-HIT KILLS'], ['noCd', 'NO COOLDOWNS'], ['infRes', 'INFINITE RESOURCE'], ['noClip', 'NO COLLISION'], ['invisible', 'INVISIBLE TO MONSTERS']].map(([id, label]) => ({ label, on: () => w.cheats[id], run: dev('cheat', { id }) }));
    case 'GIVE': return [
      { label: 'LEVEL UP', run: dev('levelup') }, { label: 'LEVEL TO 30', run: dev('level30') }, { label: 'GOLD: 10,000', run: dev('gold') }, { label: 'MATERIALS AND KEYS', run: dev('mats') }, { label: 'ALL GEMS', run: dev('gems') },
      ...['blessed', 'reliquary'].flatMap((r) => SLOTS.map((slot) => ({ label: `${RARITIES[r].name} ${slot.toUpperCase()}`, run: dev('item', { slot, rarity: r }) }))),
      ...LEGENDARIES.map((l) => ({ label: `LEGENDARY: ${l.name}`, run: dev('legendary', { id: l.id }) })),
      ...Object.values(SETS).map((s) => ({ label: `SET: ${s.name}`, run: dev('set', { id: s.id }) })),
    ];
    case 'SPAWN': return [
      { label: 'KILL ALL', run: dev('killall') }, { label: 'COLLECTION PLATE', run: dev('plate') }, { label: 'UNQUIET COFFIN', run: dev('coffin') }, { label: 'CHAMPION PACK', run: dev('elite', { kind: 'champion' }) }, { label: 'RARE PACK', run: dev('elite', { kind: 'rare' }) },
      ...AFFLICTION_IDS.map((a) => ({ label: `ELITE WITH ${a.toUpperCase().replace('_', ' ')}`, run: dev('elite', { kind: 'champion', affl: [a] }) })),
      ...Object.values(MONSTERS).map((m) => ({ label: m.boss ? `BOSS: ${m.name}` : m.name, run: dev('spawn', { type: m.id }) })),
    ];
    case 'TRAVEL': return [
      ...Object.values(ZONES).filter((z) => !['titlescene', 'session'].includes(z.id) && !z.knell).map((z) => ({ label: z.name, run: dev('boss', { zone: z.id }) })),
      { label: 'START A KNELL RUN', run: dev('knellStart') }, { label: 'FILL THE KNELL', run: dev('knellFill') },
      ...QUESTS.flatMap((q, i) => q.steps.map((s, j) => ({ label: `Q${i + 1}.${j + 1} ${s.text}`, run: dev('quest', { q: i, step: j }) }))),
    ];
    case 'WORLD': return [
      { label: `TIME SCALE: ${play.devTime}`, run: () => play.cycleTime() }, { label: `DIFFICULTY: ${w.diff.name}`, run: dev('difficulty') }, { label: 'REROLL MAP SEED', run: dev('reseed') }, { label: 'REVEAL MAP', run: dev('reveal') }, { label: 'NEXT BOSS PHASE', run: dev('nextphase') },
    ];
    case 'PARTY': return [
      ...CLASS_IDS.map((c) => ({ label: `ADD BOT: ${CLASSES[c].name}`, run: () => play.addBot(c) })), { label: 'REMOVE A BOT', run: () => play.removeBot() }, { label: 'BOT PLAYS THIS HERO', on: () => !!play.bots[h.seat], run: () => play.toggleBot(h.seat) }, { label: 'PLAY THE ATTRACT TOUR', run: () => play.game.shell.startAttractFromDev() },
    ];
    case 'VIEW': return OVERLAYS.map(([id, label]) => ({ label, on: () => !!play.overlays[id], run: () => { play.overlays[id] = !play.overlays[id]; } }));
    default: return [];
  }
}
export function drawDevMode(menus, ui, s, w, h, m) {
  const play = menus.play;
  ui.rect(0, 0, ui.W, ui.H, 'ink');
  ui.frame(0, 0, ui.W, 22, 'plum', 'night'); ui.text(12, 7, 'DEV', { color: 'sand' });
  if (m.tabL) { s.tab = (s.tab + DEV_TABS.length - 1) % DEV_TABS.length; ui.focus = null; ui.ctx.audio.play('ui_tab'); }
  if (m.tabR) { s.tab = (s.tab + 1) % DEV_TABS.length; ui.focus = null; ui.ctx.audio.play('ui_tab'); }
  let x = 36; DEV_TABS.forEach((n, i) => { const w2 = ui.measure(n) + 6; const hit = ui.router.click && ui.py < 22 && ui.px >= x && ui.px < x + w2; if (hit) { s.tab = i; ui.focus = null; } if (i === s.tab) ui.rect(x, 3, w2, 16, 'slate'); ui.text(x + 3, 7, n, { color: i === s.tab ? 'white' : 'mist' }); x += w2 + 1; });
  const y0 = 28; const rows = Math.floor((ui.H - y0 - 22) / 14);
  if (DEV_TABS[s.tab] === 'SLIDERS') {
    const defs = TUNING_DEFS;
    if (ui.button('tune:reset', 12, ui.H - 34, ui.W - 30, 13, 'RESET TO DEFAULTS', { color: 'sand', first: false })) play.resetTuning();
    scrollList(ui, s, 'tune', defs, 12, y0, ui.W - 30, 14, rows - 1, (d, i, rx, ry, id) => {
      const W = ui.W - 30;
      const st = ui.widget(id, rx, ry, W, 13, {}); ui.frame(rx, ry, W, 13, st.focused ? 'sand' : 'slate', st.focused ? 'plum' : 'night');
      const v = w.tuning[d.k]; ui.text(rx + 4, ry + 3, d.label); const bx = rx + 136; const bw = W - 136 - 110;
      ui.rect(bx, ry + 4, bw, 5, 'ink'); ui.rect(bx, ry + 4, Math.max(1, (bw * (v - d.min)) / (d.max - d.min)), 5, 'sand'); const dx = bx + (bw * (d.def - d.min)) / (d.max - d.min); ui.rect(dx, ry + 2, 1, 9, 'white');
      ui.textR(rx + W - 40, ry + 3, Number(v.toFixed(2)), { color: 'white' }); ui.textR(rx + W - 4, ry + 3, `/${d.def}`, { color: 'mist' });
      if (st.focused && (m.left || m.right)) { const dirn = m.left ? -1 : 1; m.left = false; m.right = false; play.setTuning(d.k, Math.max(d.min, Math.min(d.max, Math.round((v + dirn * d.step) / d.step) * d.step))); ui.ctx.audio.play('ui_move'); }
      if (ui.router.click && st.hover && ui.px >= bx && ui.px <= bx + bw) { play.setTuning(d.k, Math.round((d.min + ((ui.px - bx) / bw) * (d.max - d.min)) / d.step) * d.step); }
      return false;
    });
    footer(ui, [['tabL', 'TABS'], ['back', 'BACK']]);
    return;
  }
  const items = devItems(s.tab, play, w, h);
  const act = scrollList(ui, s, `dv${s.tab}`, items, 12, y0, ui.W - 30, 14, rows, (it, i, rx, ry, id) => ui.button(id, rx, ry, ui.W - 30, 13, `${it.on ? (it.on() ? '[X] ' : '[ ] ') : ''}${it.label}`.slice(0, Math.floor((ui.W - 40) / 6)), { align: 'left', color: it.on?.() ? 'lime' : 'white' }));
  if (act >= 0) items[act].run();
  footer(ui, [['confirm', 'DO IT'], ['back', 'BACK']]);
}
export { makeTuning };
