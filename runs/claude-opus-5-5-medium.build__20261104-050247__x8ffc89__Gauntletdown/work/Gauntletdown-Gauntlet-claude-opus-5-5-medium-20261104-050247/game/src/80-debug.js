/* 80-debug: the pause menu's items, its How to Play (the shell's help screen), and game.debug for tests and tools. */

function menuItems() {
  if (SESSION) return [];
  const playing = game.sceneName === 'play' && !(SC.play && SC.play.attract);
  return [
    playing && ['Dev Tools', () => openDev()],
    playing && ['Restart floor', () => { game.resume(); for (const h of PARTY) if (!h.alive) { h.alive = true; h.hp = startHealth(); } gotoFloor(RUN.floorIdx, { card: false }); }],
    playing && game.pausedBy > 1 && PARTY[game.pausedBy - 1] && ['Drop out (P' + game.pausedBy + ')', () => { dropOut(game.pausedBy - 1); game.resume(); }]
  ].filter(Boolean);
}
// the pause menu's How to Play: the same eight cards, with the player's own keys
const shell = new E.Shell(game, { theme: { accent: '#e8a840', paper: '#1e1410', ink: '#f4e8d8', muted: '#b8a890' }, screens: { help: {
  title: 'How to Play',
  keys: () => { const I = game.input; return [[I.lastDevice === 'gamepad' ? 'L stick' : 'WASD', 'Move'], [I.lastDevice === 'gamepad' ? 'R stick' : 'Mouse', 'Aim'], [I.label('fire'), 'Fire (hold); strikes up close'], [I.label('magic'), 'Magic: a Blast Flask'], [I.label('plant'), 'Plant: stand and shoot'], [I.label('pause'), 'Pause']]; },
  sections: () => HOWTO.map(([h, t]) => [h, fillKeys(t)])
} } });

/* ---- game.debug: the tests' and tools' handle ---- */
function snapshot() {
  return {
    scene: game.sceneName, mode: SESSION ? 'session' : RUN.mode, floor: W ? W.id : null, no: W ? W.no : null, t: W ? +W.t.toFixed(2) : 0, loop: RUN.loop, idx: RUN.floorIdx,
    heroes: PARTY.map(h => ({ cls: h.cls, x: Math.round(h.x), y: Math.round(h.y), hp: h.hp, score: h.score, keys: h.keys, flasks: h.flasks, amulet: h.amulet, specials: Object.keys(h.specials), alive: h.alive, stunned: h.stun > 0, queasy: h.queasy > 0, continues: h.continues, menu: h.menu > 0 })),
    monsters: W ? { total: W.mons.length, byType: W.mons.reduce((a, m) => (a[m.type] = (a[m.type] || 0) + 1, a), {}) } : null,
    generators: W ? W.gens.length : 0, items: W ? W.items.length : 0, doors: W ? W.doorGroups.map(g => g.open) : [], impatience: W ? W.stage : 0,
    boss: W && W.boss ? { hp: Math.round(W.boss.hp), max: W.boss.maxHp, phase: W.boss.phase, alive: W.boss.alive, state: W.boss.state } : null,
    done: W ? W.done : null, narrator: NARR.last, caption: NARR.cur ? NARR.cur.text : null, attract: ATTRACT.on, touchOnly: TOUCH.only, dev: DEV.open, cheated: RUN.cheated,
    net: NET.stats(), errors: game.errors.length
  };
}
function stateHash() {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= (Math.round(v * 16) | 0); h = Math.imul(h, 16777619) >>> 0; };
  if (W) { mix(W.t); for (const x of PARTY) { mix(x.x); mix(x.y); mix(x.hp); mix(x.score); } for (const m of W.mons) { mix(m.x); mix(m.y); mix(m.hp); } mix(W.items.length); }
  return h.toString(16);
}
game.debug = {
  snapshot, stateHash,
  teleport(x, y) { const h = PARTY[0]; if (!h) return; h.x = x; h.y = y; h.body.x = x; h.body.y = y; },
  warp(i) { gotoFloor(typeof i === 'string' ? FLOOR_ORDER.indexOf(i) : i, { card: false }); },
  give(what, n = 1, pi = 0) { const h = PARTY[pi]; if (!h) return; if (what === 'key') h.keys += n; else if (what === 'flask') h.flasks += n; else if (what === 'hp') h.hp += n; else if (SPECIALS[what]) h.specials[what] = true; else if (AMULETS[what]) { h.amulet = what; h.amuletT = AMULET_TIME; } },
  spawn(type, x, y, rank = 1) { return spawnMon(type, x, y, rank, { awake: true }); },
  drop(kind, x, y, sub) { return dropItem(kind, x, y, sub); },
  setTune, resetTune, TUNE, CHEAT, PARTY, get W() { return W; }, RUN, NARR, DEV, ATTRACT, SCORES, TOUCH, NET, SESSIONS: null,
  bot(pi = 0, on = true, cheat = false, o = {}) { const h = PARTY[pi]; if (h) h.bot = on ? makeBot(h, { cheat, ...o }) : null; },
  start(classes, o) { startDescent(classes, o); }, gotoFloor, validateFloor, deadContent, floors: () => FLOOR_ORDER.map(id => get('floors', id)),
  // a test arena: an open floor of the given rows (or a plain room), played at once with the party
  arena(rows, meta = {}) {
    const R0 = rows || ['########################################', ...Array.from({ length: 18 }, (_, i) => '#' + (i === 1 ? '@@' : '..') + '....................................#'), '########################################'];
    def('floors', 'arena', Object.assign({ name: 'ARENA', realm: 'larder', no: 1, rank: 1, genRank: 1, par: 120 }, meta, { rows: R0 }));
    newWorld('arena', {}); if (game.sceneName !== 'play') game.go('play', {}, { fade: 0 }); return W;
  },
  openDev, devRows, devAct, menuItems, LINES, HOWTO, ABOUT, SOURCE_INFO, FEEDBACK, AIHUB_ENTRY, voiceSay, SONGS, SFX
};
