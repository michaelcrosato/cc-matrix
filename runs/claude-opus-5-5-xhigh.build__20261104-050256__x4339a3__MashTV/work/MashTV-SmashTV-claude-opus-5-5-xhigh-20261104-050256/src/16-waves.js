// ---- the room-script runner: a small coroutine runner on the world's own clock, wave triggers, spawn entries, key rules ----
// A coroutine yields: a number (seconds), a function (until it returns true), { any: [...] } (the first of them), or
// nothing (one step). The world steps its coroutines, so dev mode's FREEZE and tests control them exactly.
class Co {
  constructor(gen) { this.g = gen; this.wait = null; this.done = false; this.cancelled = false; this._adv(); }
  _mk(w) { if (typeof w === 'number') return { t: w }; if (typeof w === 'function') return { f: w }; if (w && w.any) return { any: w.any.map(x => this._mk(x)) }; if (w instanceof Co) return { co: w }; return { step: true }; }
  _ready(w, dt) {
    if (w.t !== undefined) { w.t -= dt; return w.t <= 0; }
    if (w.f) return !!w.f();
    if (w.co) return w.co.done;
    if (w.any) { let ok = false; for (const x of w.any) if (this._ready(x, dt)) ok = true; return ok; }
    if (w.step) return true;   // a bare yield: the next step
    return true;
  }
  _adv() { try { const r = this.g.next(); if (r.done) { this.done = true; this.wait = null; } else this.wait = this._mk(r.value); } catch (e) { this.done = true; if (game) game.fail('room script', e); else throw e; } }
  step(dt) { if (this.done) return; if (this.wait && !this._ready(this.wait, dt)) return; this._adv(); }
  cancel() { if (this.done) return; this.done = this.cancelled = true; try { this.g.return(); } catch (e) { /* finally threw */ } }
}
MT.Co = Co;
const any = list => ({ any: list.filter(x => x !== undefined && x !== null) });
/** n spawns scaled by players, difficulty and the wave-size slider */
function scaleN(world, n) { const P = Math.max(1, world.playerCount()); return Math.max(1, Math.round(n * (1 + .35 * (P - 1)) * MT.T.waveSize * diffOf().wave)); }
MT.scaleN = scaleN;
/** a boss's adds: scaled by players and difficulty, not by the rooms' wave size */
MT.scaleAdds = (world, n) => { const P = Math.max(1, world.playerCount()); return Math.max(1, Math.round(n * (1 + .35 * (P - 1)) * diffOf().wave)); };
/** run one spawn entry [door, kind, n, gap] */
function spawnEntry(world, ent) {
  const [where, kind, n0, gap = .25, opt] = ent, n = scaleN(world, n0);
  const doors = where === 'all' ? DOOR_IDS : where === 'sides' ? ['E', 'W'] : where === 'ends' ? ['N', 'S'] : DOORS[where] ? [where] : null;
  if (doors && opt && opt.keyOn !== undefined) { for (const d of doors) for (let i = 0; i < n; i++) world.arena.queueSpawn(d, kind, 1, gap, i === Math.min(opt.keyOn, n - 1) && d === doors[0] ? { key: true } : undefined); return; }
  if (doors) { for (const d of doors) world.arena.queueSpawn(d, kind, n, gap); return; }
  if (where === 'audience') { for (let i = 0; i < n; i++) world.delayed(i * .35, () => world.spawnAudience(kind)); return; }
  if (where === 'drop') { for (let i = 0; i < n; i++) world.delayed(i * .3, () => world.spawnDrop(kind)); return; }
  if (Array.isArray(where)) { const [x, y] = cellW(where[0], where[1]); for (let i = 0; i < n; i++) world.spawnEnemy(kind, x + i * 4, y, { inside: true }); }
}
MT.spawnEntry = spawnEntry;
/** an item: [pickup, where]: 'center' | 'drop' | [cx, cy] (weapons become capsules; on a pedestal in armories) */
function placeItem(world, id, where, o = {}) {
  let x = AR.CX, y = AR.CY;
  if (Array.isArray(where)) [x, y] = cellW(where[0], where[1]);
  else if (where === 'drop') { const p = world.freePoint(50); x = p[0]; y = p[1]; }
  const kind = WEAPONS[id] && WEAPONS[id].kind !== 'instant' ? 'capsule' : id === 'bomb' ? 'bomb' : id === 'life' ? 'life' : id;
  const p = MT.makePickup(kind, x, y, Object.assign({ wpn: kind === 'capsule' ? id : undefined, z: where === 'drop' ? 80 : 0, vz: where === 'drop' ? -10 : 0 }, o));
  if (where === 'drop') world.event('dropShadow', { x, y });
  world.addPickup(p);
  return p;
}
MT.placeItem = placeItem;
/** the room's waves as a coroutine */
function* roomScript(world, room) {
  const alive = () => world.countedAlive() + world.arena.pendingSpawns() + world.pendingDelayed();
  for (const [t, id, where] of room.items || []) world.delayed(t, () => placeItem(world, id, where, { placed: Array.isArray(where) && room.type === 'armory', pedestal: room.type === 'armory' && Array.isArray(where) }));
  if (room.survive) { yield* surviveScript(world, room); return; }
  const waves = room.waves || [];
  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const since = world.time, early = () => world.time - since >= MT.T.waveGap;
    if (i === 0) yield (w.at || 0);
    else if (w.at !== undefined && w.left !== undefined) yield any([w.at, () => early() && alive() <= w.left]);
    else if (w.at !== undefined) yield w.at;
    else if (w.left !== undefined) yield () => early() && alive() <= w.left;
    world.wave = i + 1; world.event('wave', { n: i + 1 });
    for (const ent of w.spawn || []) spawnEntry(world, ent);
    for (const [id, where] of w.items || []) placeItem(world, id, where);
    if (w.script && MT.SCRIPTS[w.script]) yield* MT.SCRIPTS[w.script](world, w);
  }
  world.wavesSpawned = true;
}
MT.roomScript = roomScript;
/** survive rooms: streams from the doors until the clock runs out, then a last wave */
function* surviveScript(world, room) {
  const S = room.survive, t0 = world.phaseT;
  world.surviveLeft = S.time;
  let a = 0, b = 0, c = 0;
  world.wave = 1;
  while (world.surviveLeft > 0) {
    yield;
    const dt = world.lastDt; world.surviveLeft -= dt; a -= dt; b -= dt; c -= dt;
    if (a <= 0) { a += 1.2; const k = (world._sk = (world._sk || 0) + 1); for (const d of [DOOR_IDS[k % 4], DOOR_IDS[(k + 2) % 4]]) world.arena.queueSpawn(d, 'goon', MT.scaleAdds(world, 1), .2); }
    if (b <= 0) { b += 4; world.arena.queueSpawn(rpick(RNG.spawn, DOOR_IDS), 'clapbot', MT.scaleAdds(world, 2), .2); }
    if (c <= 0) { c += 7; world.arena.queueSpawn(rpick(RNG.spawn, DOOR_IDS), 'popper', 1, .2); }
    if (world.cage && !world.cage.opened && S.time - world.surviveLeft >= S.cage) world.openCage();
  }
  world.surviveLeft = 0; world.wave = 2;
  if (world.cage && !world.cage.opened) world.openCage();
  for (const ent of S.last || []) spawnEntry(world, ent);
  world.wavesSpawned = true;
}
/** named scripted events a wave can run */
MT.SCRIPTS = {
  *finaleBurst(world, w) {   // every pyro vent fires twice, each with its 1 s telegraph
    const h = world.arena.pyro(); if (!h) return;
    h.burst = true; world.event('banner', { text: 'FINALE BURST!', color: '#ff9a3c' });
    for (const v of h.vents) { v.state = 'tele'; v.t = 0; v.again = true; }
    yield 5;
    h.burst = null;
  },
};
