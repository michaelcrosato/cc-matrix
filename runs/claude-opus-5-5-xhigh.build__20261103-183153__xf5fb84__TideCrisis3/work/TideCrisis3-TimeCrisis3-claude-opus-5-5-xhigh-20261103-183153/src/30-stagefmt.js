/* 30-stagefmt: the stage and scene schema, the Director (rail travel -> ACTION -> waves by time, by carrier distance,
 * after a clear, after kills, on a cue -> clear -> ride on -> boss -> outro) and the content validators.
 *   def('stage', n, { name, place, clock, music, env, build(G, S), carriers, intro, outro, scenes: [ids] })
 *   def('scene', id, { title, time, arrive: { path, speed, look }, slots: [{ stand: { at, look }, cover: { at, look } }],
 *     carrier, covers: { id: { at, h, peek, face, ledge, water, floor } }, waves: [{ id, at | after | atD | kills | on,
 *     delay, spawn: [[type, coverId, opts]] }], civilians, allies, cues: [{ at | on, say, prompt, do }], boss, objective })
 * Slots 3 and 4 (AI Hub) are slot 1 moved 28 units to its left and slot 2 moved 28 units to its right. */
const EYE = 24, EYE_COVER = 12;
function lookAngles(from, to) { const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2]; return [Math.atan2(dy, dx), Math.atan2(dz, Math.hypot(dx, dy))]; }
TC.lookAngles = lookAngles;

/** prepare a scene for play: derived slots, cover faces, lists */
function prepScene(sc) {
  if (sc._prepped) return sc; sc._prepped = true;
  const s0 = sc.slots[0];
  const off = (slot, k) => {
    const st = slot.stand, look = st.look || [st.at[0] + 100, st.at[1], st.at[2]], [yaw] = sc.carrier ? [(st.yaw || 0) * DEG] : lookAngles(st.at, look);
    const r = [-Math.sin(yaw) * k, Math.cos(yaw) * k], mv = p => p && [p[0] + r[0], p[1] + r[1], p[2]];
    if (sc.carrier) return { stand: Object.assign({}, st, { at: [st.at[0], st.at[1] + k, st.at[2]] }), cover: Object.assign({}, slot.cover, { at: [slot.cover.at[0], slot.cover.at[1] + k, slot.cover.at[2]] }), auto: true };
    return { stand: { at: mv(st.at), look: mv(st.look) }, cover: { at: mv(slot.cover.at), look: mv(slot.cover.look) }, auto: true };
  };
  if (sc.slots.length === 1) sc.slots.push(off(sc.slots[0], 26));
  sc.slots[2] = sc.slots[2] || off(sc.slots[0], -28);
  sc.slots[3] = sc.slots[3] || off(sc.slots[1], 28);
  sc.coverList = []; sc.coversById = {};
  const tgt = sc.carrier ? null : s0.stand.at;
  for (const [id, c] of Object.entries(sc.covers || {})) {
    const cv = Object.assign({ id, h: 20, peek: ['up'] }, c);
    if (cv.face === undefined) cv.face = tgt ? Math.atan2(tgt[1] - cv.at[1], tgt[0] - cv.at[0]) : Math.PI;
    else cv.face *= DEG;
    sc.coverList.push(cv); sc.coversById[id] = cv;
  }
  return sc;
}
TC.prepScene = prepScene;

/* ---- the Director: one scene at a time ---- */
class Director {
  constructor(sim, sc) {
    this.sim = sim; this.sc = prepScene(sc); this.t = 0; this.fired = new Set(); this.kills = 0; this.cues = new Set(); this.pending = [];
    this.waves = (sc.waves || []).map((w, i) => ({ w, id: w.id || 'w' + i, started: false, ids: [], i }));
    this.civs = (sc.civilians || []).map(c => ({ c, done: false }));
    this.allies = [];
  }
  start() {
    const sim = this.sim, sc = this.sc;
    for (const cv of sc.coverList) cv.taken = 0;
    if (sim.players.length === 1 && sim.mode !== 'attract' || sim.mode === 'attract') for (const a of sc.allies || []) this.allies.push(spawnEnemy(sim, 'ally', null, { who: a.who, from: a.at, facing: a.facing, every: a.every, kills: a.kills }));
    if (sc.onStart) sc.onStart(sim);
  }
  waveDone(W) { return W.started && W.ids.every(id => { const e = this.sim.enemyById(id); return !e || !e.alive || e.civ; }) && !this.pending.some(p => p.wave === W.id); }
  step(dt) {
    const sim = this.sim, sc = this.sc; this.t += dt;
    for (const W of this.waves) {
      if (W.started) continue;
      const w = W.w; let go = false;
      if (w.at !== undefined) go = this.t >= w.at;
      else if (w.atD !== undefined) go = sim.carrierD() >= w.atD;
      else if (w.kills !== undefined) go = this.kills >= w.kills;
      else if (w.on) go = this.cues.has(w.on);
      else if (w.after === 'clear' || !w.after) go = this.waves.slice(0, W.i).every(o => this.waveDone(o));
      else go = this.waves.some(o => o.id === w.after && this.waveDone(o));
      if (go && w.delay) { if (W.wait === undefined) W.wait = this.t + w.delay; go = this.t >= W.wait; }
      if (!go) continue;
      W.started = true;
      for (const s of w.spawn || []) { const o = Object.assign({ wave: W.id }, s[2] || {}); if (o.delay) this.pending.push({ at: this.t + o.delay, s, o, wave: W.id }); else W.ids.push(spawnEnemy(sim, s[0], s[1], o).id); }
      if (w.say) sim.say(w.say[0], w.say[1]);
      if (w.cue) sim.cue(w.cue);
      if (w.do) w.do(sim);
    }
    for (const P of this.pending.slice()) if (this.t >= P.at) { this.pending.splice(this.pending.indexOf(P), 1); const W = this.waves.find(x => x.id === P.wave); const e = spawnEnemy(sim, P.s[0], P.s[1], P.o); if (W) W.ids.push(e.id); }
    for (const C of this.civs) if (!C.done && this.t >= C.c.at) { C.done = true; spawnEnemy(sim, 'civilian', null, { route: C.c.route, from: C.c.route[0], look: C.c.look, leave: C.c.leave, speed: C.c.speed }); if (C.c.say) sim.say(C.c.say[0], C.c.say[1]); }
    for (const c of sc.cues || []) if (c.at !== undefined && !this.fired.has(c) && this.t >= c.at) { this.fire(c); }
  }
  cue(name, data) {
    this.cues.add(name);
    for (const c of this.sc.cues || []) if (c.on === name && !this.fired.has(c)) this.fire(c, data);
  }
  fire(c, data) {
    const sim = this.sim; if (!c.repeat) this.fired.add(c);
    if (c.say) sim.say(c.say[0], c.say[1]);
    if (c.prompt) sim.ev({ type: 'prompt', id: c.prompt });
    if (c.do) c.do(sim, data);
    if (c.music) sim.ev({ type: 'music', song: c.music });
  }
  clear() {
    const sim = this.sim;
    if (this.waves.some(W => !W.started) || this.pending.length) return false;
    if (!this.waves.every(W => this.waveDone(W))) return false;
    if (sim.boss && !sim.boss.dead) return false;
    if (sim.enemies.some(e => e.alive && !e.civ && !e.ally)) return false;
    if (this.sc.objective && !this.sc.objective(sim)) return false;
    return true;
  }
}
TC.Director = Director;

/* ---- validators (the tests run them over every stage) ---- */
function validateContent() {
  const errs = [], E2 = m => errs.push(m);
  for (const st of regAll('stage')) {
    for (const id of st.scenes) {
      const sc = reg('scene', id); if (!sc) { E2('stage ' + st.id + ': scene ' + id + ' missing'); continue; }
      prepScene(sc);
      if (!sc.title) E2(id + ': no title');
      if (!(sc.time > 0)) E2(id + ': no time');
      if (!sc.arrive || !sc.arrive.path || (typeof sc.arrive.path === 'function' ? sc.arrive.path(null) : sc.arrive.path).length < 1) E2(id + ': no arrive path');
      for (const w of sc.waves || []) for (const s of w.spawn || []) { if (!reg('enemy', s[0])) E2(id + ': unknown enemy ' + s[0]); if (s[1] && !sc.coversById[s[1]]) E2(id + ': unknown cover ' + s[1]); }
      for (const c of sc.cues || []) if (c.say && !reg('speaker', c.say[0])) E2(id + ': unknown speaker ' + c.say[0]);
      for (const a of sc.allies || []) if (!reg('speaker', a.who)) E2(id + ': unknown ally ' + a.who);
      if (sc.boss && !reg('boss', sc.boss)) E2(id + ': unknown boss ' + sc.boss);
      if (sc.carrier && !(st.carriers && st.carriers[sc.carrier])) E2(id + ': unknown carrier ' + sc.carrier);
      if (sc.slots.length < 4) E2(id + ': slots not derived');
    }
    if (st.intro && !reg('cutscene', st.intro)) E2('stage ' + st.id + ': intro ' + st.intro + ' missing');
    if (st.outro && !reg('cutscene', st.outro)) E2('stage ' + st.id + ': outro ' + st.outro + ' missing');
    if (st.music && !reg('song', st.music)) E2('stage ' + st.id + ': song ' + st.music + ' missing');
  }
  for (const h of regAll('highlight')) if (!reg('scene', h.scene)) E2('highlight ' + h.id + ': scene ' + h.scene + ' missing');
  return errs;
}
TC.validateContent = validateContent;
