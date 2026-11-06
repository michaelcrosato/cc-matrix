// Dev mode: cheats, give, spawn, travel, world, party, overlays and live balance sliders with Reset to defaults.
import { TUNING_DEFS, defaultTuning } from '../data/tuning.js';
import { MONSTERS, AFFLICTION_IDS } from '../data/monsters.js';
import { ZONES } from '../data/zones.js';
import { SLOTS, RARITIES, LEGENDARIES, SETS, SET_OF_CLASS, GEMS } from '../data/items.js';
import { makeItem } from '../sim/items.js';
import { spawnMonster, giveXp, refreshStats, livingHeroes, dropItem, killMonster, ev } from '../sim/core.js';
import { spawnElitePack } from '../sim/world.js';
import { startBoss } from '../sim/bosses.js';
import { QUESTS } from '../data/quests.js';
import { autoLoadout, applyLastBell } from '../sim/progress.js';
import { xpToNext, DIFFS } from '../sim/stats.js';
import { menu } from './screens.js';
import { MODIFIERS } from '../sim/knell.js';

const CATS = ['CHEATS', 'GIVE', 'SPAWN', 'TRAVEL', 'WORLD', 'PARTY', 'OVERLAYS', 'BALANCE'];
const BOSS_LIST = ['bursar', 'ambrose', 'malison', 'warden_sexton', 'warden_chorister', 'warden_jaw'];

export function drawDev(game, ui, nav, o) {
  const hud = ui.hud, w = game.world, h = game.localHero(), d = o.data; const W = ui.hudW; d.cat = d.cat ?? 0;
  hud.rect(0, 0, W, ui.hudH, 'ink'); ui.text(10, 6, 'DEV MODE', { color: 'red', scale: 2 });
  if (nav.tabNext) { d.cat = (d.cat + 1) % CATS.length; ui.setFocus(null); } if (nav.tabPrev) { d.cat = (d.cat + CATS.length - 1) % CATS.length; ui.setFocus(null); }
  CATS.forEach((c, i) => { const x = 6 + i * 52; const z = ui.zone('dc' + i, x, 24, 50, 12, { focusable: false }); hud.rect(x, 24, 50, 12, d.cat === i ? 'plum' : 'night'); ui.text(x + 2, 27, c, { color: d.cat === i ? 'white' : 'mist' }); if (z.clicked) { d.cat = i; ui.setFocus(null); } });
  const F = h.devFlags = h.devFlags || {}; const toggle = (k, n) => ({ label: `${n}: ${F[k] ? 'ON' : 'OFF'}`, fn: () => { F[k] = !F[k]; if (k === 'god') w.devFlags.god = F[k]; } });
  const item = (label, fn) => ({ label, fn });
  let items = [];
  const cat = CATS[d.cat];
  if (cat === 'CHEATS') items = [toggle('god', 'GOD MODE'), toggle('oneHit', 'ONE-HIT KILLS'), toggle('noCd', 'NO COOLDOWNS'), toggle('infRes', 'INFINITE RESOURCE'), toggle('noclip', 'NO COLLISION'), toggle('invisible', 'INVISIBLE TO MONSTERS')];
  if (cat === 'GIVE') items = [
    item('LEVEL UP', () => { giveXp(w, h, xpToNext(h.level)); autoLoadout(h); }), item('LEVEL TO 30', () => { h.level = 30; autoLoadout(h, { tones: true, vows: true }); refreshStats(w, h, true); }),
    item('GOLD +10000', () => { h.gold += 10000; }), item('MATERIALS +100', () => { h.mats.scrap += 100; h.mats.dust += 100; h.mats.shards += 100; }),
    item('RANDOM ITEM: BLESSED', () => give(game, h, 'blessed')), item('RANDOM ITEM: RELIQUARY', () => give(game, h, 'reliquary')),
    item('ANY LEGENDARY (NEXT)', () => { d.leg = ((d.leg ?? -1) + 1) % Object.keys(LEGENDARIES).length; const id = Object.keys(LEGENDARIES)[d.leg]; h.inv.push(makeItem(w.lootRng, { legendary: id, ilvl: Math.max(5, h.level), cls: h.cls })); game.toast('GAVE ' + LEGENDARIES[id].name.toUpperCase()); }),
    item('SET PIECE', () => { h.inv.push(makeItem(w.lootRng, { setPiece: true, rarity: 'set', ilvl: Math.max(5, h.level), cls: h.cls })); }),
    item('ALL GEMS', () => { for (const k of Object.keys(GEMS)) for (let t = 0; t < 3; t++) { h.gems.push({ kind: k, tier: t }); } }), item('GRAND KEY +1', () => { w.acct.grandKeys++; }),
  ];
  if (cat === 'SPAWN') items = [
    ...Object.keys(MONSTERS).filter((k) => !MONSTERS[k].boss && !['collection_plate'].includes(k)).slice(0, 14).map((k) => item('SPAWN ' + MONSTERS[k].name.toUpperCase().slice(0, 16), () => { for (let i = 0; i < 3; i++) spawnMonster(w, k, h.x + 4 + i, h.z + 2, { dormant: false }); })),
    item('ELITE PACK WITH AFFLICTIONS', () => { spawnElitePack(w, w.zoneDef.mon && w.zoneDef.mon.length ? w.zoneDef : ZONES.ossuary1, h.x + 6, h.z, 999, w.zoneDef.level || h.level); for (const m of w.monsters) if (m.pack === 999) m.state = 'aggro'; }),
    item('COLLECTION PLATE', () => spawnMonster(w, 'collection_plate', h.x + 5, h.z, { dormant: false })), item('UNQUIET COFFIN', () => w.spots.push({ id: 90000 + w.tick, kind: 'coffin', x: h.x + 3, z: h.z, r: 0.9, name: 'Unquiet Coffin' })),
    item('KILL ALL', () => { for (const m of w.monsters.slice()) if (!m.prop && !m.dead && m.team !== 'hero') killMonster(w, m, h, 0, {}); }),
  ];
  if (cat === 'TRAVEL') items = [...Object.keys(ZONES).filter((k) => !ZONES[k].knell).map((k) => item('GO: ' + ZONES[k].name.toUpperCase().slice(0, 28), () => { game.closeAll(); w.camp && (w.camp.visited[k] = true); game.enterZone(k); })), item('QUEST STEP FORWARD', () => { if (w.camp && w.camp.q < QUESTS.length) { w.camp.s++; if (w.camp.s >= QUESTS[w.camp.q].steps.length) { w.camp.questsDone.push(QUESTS[w.camp.q].id); w.camp.q++; w.camp.s = 0; if (w.camp.q >= QUESTS.length) w.camp.done = true; } game.toast('QUEST ADVANCED'); } }), item('START A KNELL RUN', () => { game.pushOverlay('knellsetup', {}); }), item('FILL THE KNELL', () => { if (w.knell && w.knell.active) { w.knell.have = w.knell.total; w.knell.fill = 1; } else game.toast('NO KNELL RUNNING'); })];
  if (cat === 'WORLD') items = [
    item('TIME SCALE: ' + (w.devTimeScale || 1) + 'X', () => { const L = [1, 0.5, 0.25, 2, 4]; w.devTimeScale = L[(L.indexOf(w.devTimeScale || 1) + 1) % L.length]; }),
    item('DIFFICULTY: ' + DIFFS.find((q) => q.id === w.diffId).name.toUpperCase(), () => { const i = DIFFS.findIndex((q) => q.id === w.diffId); w.diffId = DIFFS[(i + 1) % DIFFS.length].id; }),
    item('REROLL MAP SEED', () => { game.closeAll(); w.seed = (w.seed * 7 + 13) % 99991; w.root = new w.root.constructor(w.seed); game.enterZone(w.zoneId, { load: { salt: 'r' + w.seed } }); }),
    item('REVEAL THE MAP', () => { if (game.explored) game.explored.fill(1); }),
    item('NEXT BOSS PHASE', () => { const b = w.monsters.find((m) => m.boss && !m.dead); if (b) b.hp = Math.max(1, b.maxHp * (b.hp / b.maxHp > 0.6 ? 0.58 : b.hp / b.maxHp > 0.25 ? 0.23 : 0.02)); else game.toast('NO BOSS HERE'); }),
  ];
  if (cat === 'PARTY') items = [
    item('ADD A BOT SEAT', () => { if (game.seats.length < 4) { const seat = game.seats.length; game.createGuest(['bellwarden', 'lamplighter', 'sexton'][seat % 3], seat, h.level, true); game.seats.push({ seat, kind: 'bot' }); game.couch = true; } }),
    item('REMOVE THE LAST SEAT', () => { const s = game.seats[game.seats.length - 1]; if (s && s.seat > 0) game.leaveSeat(s.seat); }),
    item('BOT PLAYS THIS HERO: ' + (h.bot ? 'ON' : 'OFF'), () => { h.bot = !h.bot; }),
    item('PLAY THE ATTRACT TOUR', () => { game.closeAll(); game.teardownWorld(true); game.forceAttract = true; }),
  ];
  if (cat === 'OVERLAYS') { const D = game.devOverlays || (game.devOverlays = {}); items = ['nav', 'circles', 'ai', 'spawns', 'flow', 'stats'].map((k) => item(`${{ nav: 'NAV GRID', circles: 'HIT CIRCLES', ai: 'AI STATE', spawns: 'SPAWN MARKERS', flow: 'FLOW FIELD', stats: 'FPS AND ENGINE STATE' }[k]}: ${D[k] ? 'ON' : 'OFF'}`, () => { D[k] = !D[k]; })); }
  if (cat === 'BALANCE') {
    const T = w.tuning; d.sc = Math.max(0, Math.min(TUNING_DEFS.length - 1, d.sc ?? 0));
    const per = 9; const start = Math.max(0, Math.min(TUNING_DEFS.length - per, d.sc - 4));
    TUNING_DEFS.slice(start, start + per).forEach((t, k) => {
      const i = start + k; const y = 44 + k * 16; const z = ui.zone('sl' + i, 10, y, W - 20, 14);
      hud.rect(9, y - 1, W - 18, 16, z.focused ? 'sand' : 'slate'); hud.rect(10, y, W - 20, 14, 'night');
      ui.text(14, y + 4, t.name.toUpperCase(), { color: 'white' });
      ui.bar(150, y + 4, 120, 6, (T[t.key] - t.min) / (t.max - t.min), z.focused ? 'sand' : 'sky'); ui.text(276, y + 4, T[t.key].toFixed(2), { color: 'mist' }); ui.text(326, y + 4, 'DEFAULT ' + t.def, { color: 'slate' });
      if (z.focused) { d.sc = i; if (nav.left) T[t.key] = Math.max(t.min, +(T[t.key] - t.step).toFixed(3)); if (nav.right) T[t.key] = Math.min(t.max, +(T[t.key] + t.step).toFixed(3)); if (nav.left || nav.right) refreshAll(w); }
      if (z.clicked) { T[t.key] = t.def; refreshAll(w); }
    });
    menu(game, ui, W - 150, ui.hudH - 38, 140, [{ label: 'RESET TO DEFAULTS', fn: () => { Object.assign(w.tuning, defaultTuning()); refreshAll(w); game.toast('DEFAULTS RESTORED'); } }], { h: 14 });
    ui.prompts([['nav', 'ADJUST'], ['ok', 'RESET ONE'], ['tabNext', 'NEXT'], ['back', 'BACK']], ui.hudH - 14);
    if (nav.back) game.closeOverlay(); return;
  }
  menu(game, ui, 10, 44, 200, items.slice(d.page ? 11 : 0, d.page ? 22 : 11), { h: 14, gap: 2 });
  if (items.length > 11) { const z = ui.zone('pgn', 220, 44, 60, 14); hud.rect(219, 43, 62, 16, z.focused ? 'sand' : 'slate'); hud.rect(220, 44, 60, 14, 'night'); ui.text(224, 48, 'MORE...', { color: 'white' }); if (z.clicked) d.page = d.page ? 0 : 1; }
  ui.prompts([['ok', 'DO IT'], ['tabNext', 'NEXT'], ['back', 'BACK']], ui.hudH - 14);
  if (nav.back) game.closeOverlay();
}
function refreshAll(w) { for (const h of w.heroes) refreshStats(w, h); }
function give(game, h, rarity) { const w = game.world; const it = makeItem(w.lootRng, { slot: SLOTS[w.rng.int(0, 9)], rarity, ilvl: Math.max(1, h.level), cls: h.cls }); h.inv.push(it); game.toast('GAVE ' + it.name.toUpperCase().slice(0, 24)); }
