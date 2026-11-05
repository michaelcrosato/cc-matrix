// 32-site: a site in play: its script (a coroutine of spawns), the critters on their schedule, the director's camera,
// the end rules (every buck bagged, escaped or lost; time; everyone benched) and each player's results.
class SiteResult {
  constructor(p) { this.p = p; this.n = p.n; this.shots = 0; this.hits = 0; this.pings = 0; this.kills = []; this.critters = []; this.penalties = []; this.bonuses = []; this.score = 0; this.wounds = 0; this.longest = 0; this.stars = 0; this.benched = false; }
  add(points) { this.score = Math.max(0, this.score + points); }
}
class Site {
  constructor(H, def, o = {}) {
    this.H = H; this.def = def; this.id = def.id; this.o = o;
    this.timeBoxed = !!o.timeBoxed; this.limit = (o.time || def.time || 60) * (o.time ? 1 : T('siteTime'));
    this.t = 0; this.actors = []; this.spawned = 0; this.bucksSpawned = []; this.phase = 'play'; this.endT = 0; this.endReason = null; this.done = false;
    this.results = H.players.map(p => new SiteResult(p));
    this.rng = RNG.wrap(RNG.fresh('spawn:' + def.id + ':' + (o.loop || 0)));
    this.cleanup = []; this.placed = []; this.crit = (def.critters || []).map(c => ({ id: c[0], o: c[1], done: false })); this.lastA = null;
    this.camB = def.director && def.director[0] ? def.director[0][1].bearing || 0 : 0; this.camVel = 0; this.dirI = 0; this.dirFrom = this.camB; this.dirT = 0; this.mode = 'keys';
    this.pitch = def.frame.pitch; this.fov = def.frame.fov;
    H.vantageId = def.vantage; H.fanB = def.frame.bearings; H.site = this;
    for (const p of def.props || []) { const w = H.world.at(def.vantage, p[1][0], p[1][1]); this.placed.push(H.world.place(p[0], w.x, w.y, Object.assign({ authored: true, site: def.id }, p[2] || {}))); }
    const S = this.S = this.api();
    // the script runs on the site's own clock (stepped in update), so every copy of a hub round spawns on the same beat
    if (def.script) this.script = new E.Script(G.game, function* () { yield* def.script(S); });
    bus.emit('siteStart', this);
  }
  api() {
    const site = this, H = this.H;
    return {
      get time() { return site.t; }, rng: site.rng, species: H.species, cleanup: site.cleanup, site,
      get bucksLeft() { return site.timeBoxed ? (site.def.bucks || 0) : Math.max(0, (site.def.bucks || 0) - site.bucksSpawned.filter(a => a.resolved).length); },
      get resolved() { return site.timeBoxed ? 0 : site.bucksSpawned.filter(a => a.resolved).length; },
      get allResolved() { return site.timeBoxed ? site.t - (site.lastSpawnT || 0) > 11 : site.bucksSpawned.length > 0 && site.bucksSpawned.every(a => a.resolved); },
      get actors() { return site.actors; }, get players() { return H.players; }, get last() { return site.lastA; },
      pattern: (name, o) => { const out = reg('pattern', name).make(this.S, o || {}); site.lastA = out[0]; return out.length === 1 ? out[0] : out; },
      spawn: (kind, o) => site.spawn(kind, o || {}),
      bark: (cat, o) => G.barks && G.barks.say(cat, o),
      say: (who, line) => G.barks && G.barks.caption(who, line),
      on: (ev, fn) => { const off = bus.on(ev, fn); site.cleanup.push(off); return off; },
      at: (b, d) => H.world.at(site.def.vantage, b, d)
    };
  }
  /** a point list [[bearing, dist], ...] (or world points) -> world points */
  pts(list) { return list.map(p => Array.isArray(p) ? this.H.world.at(this.def.vantage, p[0], p[1]) : (p.x !== undefined ? p : null)).filter(Boolean); }
  spawn(kind, o) {
    const H = this.H, critter = has('critter', kind), sp = o.species || H.species;
    const path = o.path ? this.pts(o.path) : null, at = o.at && o.at.x !== undefined ? o.at : o.at ? this.pts([o.at])[0] : null;
    const a = new Actor(H, Object.assign({}, o, { critter: critter ? kind : null, kind: critter ? null : kind, species: sp, path, at: at || (path ? null : this.pts([[0, 50]])[0]),
      points: o.points || (isTargetKind(kind) ? this.defaultPoints(sp, o.big) : 0), seed: this.rng.int(1, 9999), escape: o.escape ? this.pts(o.escape) : null,
      calm: o.calm, jumps: (o.jumps || []).map(j => Object.assign({}, j)) }));
    if (o.follow) { a.path = o.follow.path; a.d = Math.max(0, o.follow.d - (o.back || 2.5) * M); const p = a.path.at(a.d); a.x = p.x; a.y = p.y; a.z = H.world.height(a.x, a.y); a.heading = p.angle; a.snapRig(); }
    if (o.decoy) a.decoy = true;
    if (o.charge) a.charging = true;
    this.actors.push(a); H.actors.push(a); this.lastA = a; this.lastSpawnT = this.t; (this.log = this.log || []).push(Math.round(this.t * 10) / 10 + ':' + kind);
    if (a.cat === 'animal' && a.target) { this.bucksSpawned.push(a); a.slot = this.bucksSpawned.length - 1; }
    a.siteId = this.id;
    return a;
  }
  defaultPoints(sp, big) {
    if (sp === 'elk') return big ? 12 : this.rng.int(10, 12);
    if (sp === 'moose') return big ? 58 : this.rng.int(40, 55);
    return big ? 10 : this.rng.int(4, 9);
  }
  spawnCritter(c) {
    const o = c.o, n = o.flock || 1, out = [];
    for (let i = 0; i < n; i++) {
      let path = o.path ? o.path.map(p => [p[0] + i * 3, p[1] + i * 2.5]) : null, at = o.pos || o.log || null;
      if (o.tree) path = [[o.tree[0], o.tree[1]], [o.tree[0] + 6, o.tree[1] - 4], [o.tree[0] + 14, o.tree[1] + 2]];
      if (o.log) { at = o.log; path = null; }
      out.push(this.spawn(c.id, Object.assign({}, o, { path, at, delay: i * .5, behavior: o.behavior })));
    }
    return out;
  }
  update(dt) {
    const H = this.H, def = this.def;
    this.t += dt;
    if (this.script && !this.script.done && this.phase === 'play') this.script._step(dt);
    // critters on their schedule
    for (const c of this.crit) if (!c.done && this.t >= (c.o.at || 0)) { c.done = true; this.spawnCritter(c); }
    // the end rules
    if (this.phase === 'play') {
      const benched = H.players.every(p => p.benched), scriptDone = !this.script || this.script.done;
      if (this.timeBoxed) {
        if (scriptDone && this.t < this.limit - 6 && !this.reloopAt) this.reloopAt = this.t + 2;
        if (this.reloopAt && this.t >= this.reloopAt) { this.reloopAt = 0; this.loops = (this.loops || 0) + 1; this.rng = RNG.wrap(RNG.fresh('spawn:' + def.id + ':' + this.loops)); this.S.rng = this.rng; const S = this.S; this.script = new E.Script(G.game, function* () { yield* def.script(S); }); }
        if (this.t >= this.limit) this.finish('time');
      } else {
        if (benched && H.players.length) this.finish('benched');
        else if (scriptDone && this.bucksSpawned.length && this.bucksSpawned.every(a => a.resolved) && !this.actors.some(a => a.state === 'dying')) this.finish('clear');
        else if (this.t >= this.limit) this.finish('time');
      }
    } else if (this.phase === 'end') { this.endT += dt; if (this.endT > 1.6) this.done = true; }
    this.direct(dt);
  }
  finish(reason) {
    if (this.phase !== 'play') return;
    this.phase = 'end'; this.endReason = reason; this.endT = 0;
    if (this.script) this.script.cancel();
    if (reason === 'time') for (const a of this.actors) if (!a.resolved && a.state !== 'dead' && a.state !== 'dying' && a.state !== 'gone') { if (a.state === 'hidden') a.goneOut(); else { a.startle(this.rng.f() * .3, false); if (a.target && a.cat === 'animal') { a.resolved = true; if (a.wounds) a.lost = true; else a.escaped = true; } } }
    for (const a of this.actors) if (a.state === 'hidden') a.goneOut();
    bus.emit('siteEnd', this);
  }
  /** the director: keyframes keyed to site time (never to input, so every player sees the same frame), then in single
   *  player a follow mode that eases toward the bucks in view */
  direct(dt) {
    const K = this.def.director || [], H = this.H;
    while (this.dirI < K.length && this.t >= K[this.dirI][0]) {
      const k = K[this.dirI][1]; if (k.mode) this.mode = k.mode === 'follow' && (H.players.length > 1 || H.hubMode || H.noFollow) ? 'keys' : k.mode;
      if (k.bearing !== undefined) { this.dirFrom = this.camB; this.dirTo = k.bearing; this.dirDur = k.dur || .01; this.dirT = 0; this.dirEase = E.ease[k.ease || 'inOutSine'] || E.ease.inOutQuad; }
      if (k.pitch !== undefined) this.pitchTo = k.pitch; if (k.fov !== undefined) this.fovTo = k.fov;
      this.dirI++;
    }
    if (this.dirTo !== undefined && this.dirT < this.dirDur) { this.dirT += dt; this.camB = lerp(this.dirFrom, this.dirTo, this.dirEase(clamp(this.dirT / this.dirDur, 0, 1))); }
    else if (this.mode === 'follow') {
      const live = this.actors.filter(a => a.cat === 'animal' && a.target && a.alive && (a.visible || a.entered || a.state === 'flee'));
      if (live.length) {
        let s = 0; for (const a of live) s += H.world.bearingOf(this.def.vantage, a.x, a.y)[0]; s /= live.length;
        const half = H.halfFovH || 28, B = this.def.frame.bearings, tgt = clamp(s, B[0] + half * .7, B[1] - half * .7);
        [this.camB, this.camVel] = E.smoothDamp(this.camB, tgt, this.camVel, .8, dt);
      }
    }
    if (this.pitchTo !== undefined) this.pitch = E.approach(this.pitch, this.pitchTo, dt * 2);
    if (this.fovTo !== undefined) this.fov = E.approach(this.fov, this.fovTo, dt * 6);
  }
  dispose() {
    for (const f of this.cleanup) f(); this.cleanup.length = 0;
    if (this.script) this.script.cancel();
    for (const p of this.placed) this.H.world.remove(p); this.placed.length = 0;
    for (const a of this.actors) { const i = this.H.actors.indexOf(a); if (i >= 0) this.H.actors.splice(i, 1); }
  }
}
