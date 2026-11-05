// ---------------------------------------------------------------- the room script runner: waves, items, key rules, survive rooms
MT.scaleN = (n) => {
  const pl = MT.W ? Math.max(1, MT.W.contestants.filter(c => c.state !== 'gone').length) : 1;
  return Math.max(1, Math.round(n * (1 + .35 * (pl - 1)) * MT.T.waveSize * MT.diff().wave));
};
MT.spawnEntry = (W, entry) => {
  let [door, kind, n, gap] = entry; gap = gap === undefined ? .25 : gap;
  const N = MT.scaleN(n), opts = entry[4] || {};
  const list = door === 'all' ? ['N', 'E', 'S', 'W'] : door === 'sides' ? ['E', 'W'] : door === 'ends' ? ['N', 'S'] : null;
  if (list) { for (const d of list) W.arena.queueSpawn(d, kind, N, gap, opts); return N * list.length; }
  if (door === 'audience') { for (let i = 0; i < N; i++) W.later(i * .35 * MT.T.spawnGap, () => W.spawnAudience(kind, i % 2 ? 'E' : 'W', opts), true); return N; }
  if (door === 'drop') { for (let i = 0; i < N; i++) W.later(i * .3 * MT.T.spawnGap, () => W.spawnDrop(kind, opts), true); return N; }
  if (Array.isArray(door)) { const [x, y] = MT.cell(door[0], door[1]); for (let i = 0; i < N; i++) W.spawnAt(kind, x + i * 6, y, opts); return N; }
  W.arena.queueSpawn(door, kind, N, gap, opts); return N;
};
MT.runRoom = function* (W, room) {
  W.waveIdx = -1; W.wavesTotal = (room.waves || []).length; W.allSpawned = false;
  if (room.survive) { yield* MT.runSurvive(W, room); }
  else {
    for (let i = 0; i < (room.waves || []).length; i++) {
      const w = room.waves[i];
      if (i === 0) yield w.at || 0;
      else { const c = []; if (w.at !== undefined) c.push(w.at); if (w.left !== undefined) c.push(() => W.alive() + W.pending() <= MT.scaleLeft(w.left)); if (!c.length) c.push(0); yield E.any(c); }
      W.waveIdx = i; W.waveStart = W.t; W.event('wave', { i, n: W.wavesTotal });
      for (const s of w.spawn || []) MT.spawnEntry(W, s);
      for (const it of w.items || []) W.placeItem(it[0], it[1]);
      if (w.script && MT.SCRIPTS[w.script]) yield* MT.SCRIPTS[w.script](W, room);
    }
  }
  yield E.until(() => W.queuesEmpty());
  W.allSpawned = true;
};
MT.scaleLeft = (left) => Math.round(left * (1 + .35 * Math.max(0, (MT.W ? MT.W.contestants.length : 1) - 1)));
MT.runSurvive = function* (W, room) {
  const S = room.survive; W.surviveT = S.dur; W.jumboClock = S.dur; W.waveIdx = 0; W.wavesTotal = 2;
  const timers = S.streams.map(s => ({ s, t: s[0] * .5 }));
  let t = 0, cage = false;
  while (t < S.dur) {
    const dt = W.lastDt || 1 / 120;
    yield; t += dt; W.surviveT = S.dur - t; W.jumboClock = Math.max(0, S.dur - t);
    if (!cage && t >= S.cageAt) { cage = true; if (W.arena.cage) W.arena.cage.lift = true; W.event('cageOpen', {}); }
    for (const tm of timers) { tm.t -= dt; if (tm.t <= 0) { tm.t += tm.s[0]; const door = tm.s[1] === 'each' ? 'all' : tm.s[1] === 'random' ? MT.Rpick(['N', 'E', 'S', 'W'], 'spawn') : tm.s[1]; MT.spawnEntry(W, [door, tm.s[2], tm.s[3], .3]); } }
  }
  W.jumboClock = null; W.waveIdx = 1; W.event('wave', { i: 1, n: 2 });
  for (const s of S.final) MT.spawnEntry(W, s);
};
MT.SCRIPTS = {
  finaleBurst: function* (W) {
    W.event('finaleBurst', {});
    for (let k = 0; k < 2; k++) { W.arena.fireVents('all', 1); yield 2.6; }
  }
};
// key rules: each yields exactly one key per room
MT.keyRules = {
  setup(W, room) {
    const K = room.key; if (!K || !W.keysOn) return;
    W.keyRule = K.rule; W.keyGiven = false;
    if (K.rule === 'place' || K.rule === 'belt') { const [x, y] = MT.cell(K.at[0], K.at[1]); W.dropKey(x, y, true); }
    if (K.rule === 'crate') { const crates = W.enemies.filter(e => e.kind === 'crate'); if (crates.length) crates[MT.Ri(0, crates.length - 1, 'spawn')].hasKey = true; }
    if (K.rule === 'survive') { W.arena.cage = { h: 26, lift: false }; W.dropKey(AR.cx, AR.cy, true); }
    if (K.rule === 'vault') { W.arena.safe = { open: false }; for (const [cx] of [[1], [3], [5], [7]]) { const [x] = MT.cell(cx, 0); W.spawnAt('lock', x, 20, {}); } }
  },
  onKill(W, e) {
    const K = W.room.key; if (!K || W.keyGiven || !W.keysOn) return;
    if (K.rule === 'mimes' && e.kind === 'mime' && e.placed && !W.enemies.some(o => o !== e && !o.dead && o.kind === 'mime' && o.placed)) W.dropKey(e.x, e.y);
    if (K.rule === 'carrier' && e.carrier) W.dropKey(e.x, e.y);
    if (K.rule === 'crate' && e.hasKey) W.dropKey(e.x, e.y);
  },
  onSpawn(W, e) {
    const K = W.room.key; if (!K || K.rule !== 'carrier' || W.keyGiven || !W.keysOn) return;
    if (e.kind === K.kind) { W._carrierN = (W._carrierN || 0) + 1; if (W._carrierN === (K.nth || 1) && (K.wave === undefined || W.waveIdx === K.wave)) e.carrier = true; else if (K.wave !== undefined && W.waveIdx !== K.wave) W._carrierN--; }
  },
  onRoomEnd(W) {
    const K = W.room.key; if (!K || W.keyGiven || !W.keysOn) return;
    if (K.rule === 'final') W.dropKey(AR.cx, AR.cy, true, true);
  }
};
