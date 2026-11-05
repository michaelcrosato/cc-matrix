/* ---- game.debug: the game's handle for tests and tools (tools/check.mjs prints the snapshot) ---- */
function snapshot() {
  const by = {}; let total = 0;
  if (W) for (const m of W.monsters) if (!m.dead) { by[m.type] = (by[m.type] || 0) + 1; total++; }
  return {
    scene: game.sceneName, floor: W ? W.id : null, floorNo: W ? W.F.no || W.id : null, descent: W ? W.descent : RUN ? RUN.descent : 1, t: W ? +W.t.toFixed(2) : 0, role: W ? W.role : null,
    state: game.scene && game.scene.state || null, attract: game.sceneName === 'attract', touchOnly: TOUCH_ONLY,
    heroes: W ? W.heroes.map(h => ({ id: h.id, cls: h.cls, x: Math.round(h.x), y: Math.round(h.y), hp: Math.round(h.hp), score: h.score, keys: h.keys, flasks: h.flasks, amulet: h.amulet ? h.amulet.type : null,
      specials: Object.keys(h.specials), alive: h.alive, stunned: h.stun > 0, queasy: h.queasy > 0, goal: h.bot ? h.bot.goal : null, onMenu: h.onMenu > 0 })) : PARTY.map(h => ({ id: h.id, cls: h.cls, score: h.score })),
    monsters: { byType: by, total }, generators: W ? W.gens.filter(g => !g.dead).length : 0, items: W ? W.items.filter(i => !i.gone).length : 0,
    doors: W ? W.doors.filter(d => !d.open).length : 0, impatience: W ? W.impatience : 0, boss: W && W.boss ? { hp: Math.round(W.boss.hp), max: W.boss.max, phase: W.boss.phase, state: W.boss.state, dead: W.boss.dead } : null,
    narrator: NARR.lastKey, caption: NARR.caption ? NARR.caption.text : null, done: W && W.done ? W.done.to : null,
    net: typeof NET !== 'undefined' ? NET.stats() : null, errors: game.errors.length
  };
}
/** a hash of the world's state (two runs from the same seed and inputs give the same hash) */
function stateHash() {
  if (!W) return 0;
  let h = 2166136261;
  const mix = v => { h ^= Math.round(v * 16) | 0; h = Math.imul(h, 16777619); };
  for (const q of W.heroes) { mix(q.x); mix(q.y); mix(q.hp); mix(q.score); }
  for (const m of W.monsters) if (!m.dead) { mix(m.x); mix(m.y); mix(m.hp); }
  mix(W.items.filter(i => !i.gone).length); mix(W.t);
  return h >>> 0;
}
game.debug = {
  snapshot, stateHash,
  teleport(x, y, z, id = 0) { const h = W && (HB(id) || W.heroes[0]); if (h) { h.x = x; h.y = y; } },
  warp(n) { const i = typeof n === 'number' ? FLOOR_ORDER.findIndex(id => get('floors', id).no === n) : FLOOR_ORDER.indexOf(n); warpTo(i < 0 ? 0 : i); },
  give(what, n = 1, id = 0) { const h = HB(id) || W.heroes[0]; if (what === 'keys') h.keys += n; else if (what === 'flasks') h.flasks += n; else if (what === 'hp') h.hp += n; else if (get('specials', what)) h.specials[what] = true; else if (get('amulets', what)) h.amulet = { type: what, t: AMULET_TIME }; else addItem(what, h.x + 12, h.y); },
  spawn(type, x, y, rank = 1) { return spawnMonster(type, x, y, rank); },
  setTune(k, v) { game.settings.set('tune_' + k, v); return TUNE[k]; },
  bot(on = true, id = 0) { const h = HB(id) || W.heroes[0]; h.bot = on ? makeBot({ cheat: false }) : null; },
  world: () => W, party: () => PARTY, run: () => RUN, tune: TUNE, cheats: CHEATS, net: () => typeof NET !== 'undefined' ? NET : null,
  api: { buildWorld, startRun, stepWorld, validateFloor, parseFloor, damage, take, useMagic, rise, descend, spawnMonster, addGen, addItem, makeBot, botIntent, inputIntent, FLOOR_ORDER, REG, get, all, LINES, NARR, bus, rng, CAB, TABLE_MODE, ATTRACT, dropOut, joinMidPlay, CHEATS, TUNE, TUNE_DEFAULTS, resetTuning, screenRect, cheating, keysIn, devTools, warpTo, warpBoss, descentTwo, stepNarrator, speak, decorate }
};
