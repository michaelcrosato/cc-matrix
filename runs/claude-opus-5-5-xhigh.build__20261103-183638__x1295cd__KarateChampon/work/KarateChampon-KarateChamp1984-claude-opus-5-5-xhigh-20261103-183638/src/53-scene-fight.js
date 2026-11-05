/* =====================================================================================================================
 * THE FIGHT SCENE, for every mode: story, versus, kachinuki (winner stays on), attract (CPU showcase), freeSpar (a dummy,
 * no referee) and online (driven by KC.Net). data: { mode, stage, sides: [{ fid, rank, input | null, cpu: level,
 * name, color }, ...], rules, hints, onEnd(winner, bout) }.
 * ===================================================================================================================== */
KC.views = () => (KC.settings && KC.settings.camera === 'Tatami 2.5D' ? 'kctatami' : 'kcside');
KC.camera = (game, xs, extraZ = 0) => {
  const v = game.view, s = v.scale, mid = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 200;
  const half = game.W / 2 / s, cx = clamp(mid, Math.min(200, KC.ARENA.x0 - 40 + half), Math.max(200, KC.ARENA.x1 + 40 - half));
  const floorAt = game.H <= 300 ? game.H - 62 : Math.round(game.H * .62), fz = (floorAt - game.H / 2) / s / Math.max(.5, Math.cos(v.pitch || 0));   // the mat 62 px above the bottom; lower-middle on a tall screen
  game.focus(cx, v.isSide ? 0 : 6, fz + extraZ);
};
KC.fx = {
  // the shared effects of a bout's events (sound, particles, the crowd, slow motion)
  attach(bout, game, o = {}) {
    const P = game.particles, B = bout.bus;
    B.on('active', d => { const t = KC.TECH[d.tech]; if (!t) return; if (t.kiai) KC.Voice.kiai(t.kiai, d.f.fid); KC.sfx(t.kiai === 'heavy' ? 'whooshH' : 'whooshL', { pitch: .9 + d.f.side * .1 }); });
    B.on('point', d => {
      const full = d.full, c = full ? '#ffe070' : '#ffffff';
      P.impact(d.x, 0, d.z, full ? 12 : 8, c); P.sparks(d.x, 0, d.z, full ? 16 : 9, null, { color: c }); P.dust(d.x, 0, 4, 6);
      game.shake(full ? 4 : 2); if (full) game.flash('#ffffff', .08, .6);
      for (const I of KC.inputs()) I.rumble && I.rumble(full ? .8 : .45, full ? .25 : .12);
      KC.sfx(full ? 'thwackFull' : 'thwackHalf'); KC.Voice.crowd(full ? 1 : .6, full ? 1.6 : 1.1); KC.Stage.cheer = Math.min(1, KC.Stage.cheer + (full ? 1 : .6));
      KC.HUD.popup(game, d);
      if (full && !game.reduceMotion && !o.noSlow) { game.timeScale = KC.TUNE.gameSpeed * .35; o.slowT = .35; }
    });
    B.on('aiuchi', () => { const [a, b] = bout.f, x = (a.x + b.x) / 2; P.impact(x, 0, 50, 10, '#ffffff'); P.sparks(x, 0, 50, 12, null, { color: '#ffd0a0' }); KC.sfx('thwackHalf'); KC.sfx('clack'); game.shake(2); KC.Voice.crowd(.5, .9); });
    B.on('block', d => { P.sparks(d.x, 0, d.z, 8, null, { color: '#8ac8ff' }); P.impact(d.x, 0, d.z, 6, '#a0d8ff'); KC.sfx('clack'); KC.Voice.crowd(.35, .7); });
    B.on('land', d => { if (d.heavy) { KC.sfx('thudFall'); P.dust(d.f.x, 0, 0, 10); game.shake(1.5); } else KC.sfx('land', { vol: .6 }); });
    B.on('card', d => { KC.sfx('gong'); if (d.last) KC.sfx('taikoHit'); });
    B.on('whistle', () => KC.sfx('whistle'));
    B.on('flag', () => KC.sfx('flagSnap'));
    B.on('roundEnd', d => { KC.Voice.crowd(1, 2); KC.Stage.cheer = 1; KC.sting(d.perfect ? 'perfect' : 'victory'); });
    B.on('start', d => { const t = KC.TECH[d.tech]; if (t && (t.flip || t.id === 'backRoll')) { KC.sfx('whooshL', { pitch: .7 }); } if (t && t.spin) KC.sfx('pivot'); });
  },
  step(game, o, dt) { if (o.slowT > 0) { o.slowT -= game.real - (o._real || game.real); if (o.slowT <= 0) game.timeScale = KC.TUNE.gameSpeed; } o._real = game.real; }
};

KC.FightScene = {
  view: 'kcside', views: ['kcside', 'kctatami'], input: KC_KEYS, res: 'ps1', pausable: !SESSION, touch: [], camera: { zoom: false }, propSize: 1.4,
  enter(d) {
    const game = KC.game; d = d || {}; this.d = d; this.mode = d.mode || 'versus'; this.stage = d.stage || 'dojo'; game.setView(KC.views());
    this.fx = { noSlow: this.mode === 'online' }; game.timeScale = KC.timeScale(); KC.scene = this; this.ended = false; this.endT = 0; this.over = false;
    const sides = d.sides || [{ fid: 'taro' }, { fid: 'kamaboko', cpu: 1 }], classic = KC.settings && KC.settings.palette === 'Classic';
    this.fighters = sides.map((s, i) => new KC.Karateka({ fid: s.fid, side: i, rank: s.rank, classic }));
    this.readers = sides.map(s => s.input ? new KC.Reader(s.input) : null);
    const diff = (KC.settings && KC.settings.difficulty) || 'Normal';
    this.ai = sides.map((s, i) => s.input ? null : new KC.KarateAI({ fid: s.fid, level: KC.TUNE.cpuLevel > 0 && this.mode !== 'attract' ? KC.TUNE.cpuLevel : s.cpu || KC.FIGHTER[s.fid].ai.level, difficulty: this.mode === 'story' ? (d.assist ? 'Easy' : diff) : 'Normal', seed: (d.seed || 1) * 7 + i, showcase: !!s.showcase }));
    this.sides = sides;
    if (this.mode === 'freeSpar') { this.spar = { dummy: d.dummy || 'stand', last: null, hits: [] }; this.bout = null; this.fighters[0].release(this.fighters[1]); this.fighters[1].release(this.fighters[0]); this.fighters[0].ctlOn = true; this.fighters[1].ctlOn = true; this.bus = new KC.Bus(); for (const f of this.fighters) f.bus = this.bus; KC.fx.attach({ bus: this.bus, f: this.fighters }, game, this.fx); this.ref = null; }
    else {
      this.ref = new KC.Referee(); this.bout = new KC.Bout({ fighters: this.fighters, referee: this.ref, seed: d.seed || 1, rules: d.rules || {}, mode: this.mode, onMatchEnd: (w, b) => this._end(w, b) });
      KC.fx.attach(this.bout, game, this.fx);
    }
    KC.Stage.enter(game, this.stage); KC.music(KC.STAGE[this.stage].music);
    this.hint = null; this.hintT = 0; this.hintI = (d.seed || 0) % KC.HINTS.length;
    KC.camera(game, this.fighters.map(f => f.x));
    game.cam.snap = true;
  },
  exit() { KC.game.timeScale = 1; KC.scene = null; KC.game.weather = null; },
  _end(w, b) { this.over = true; this.winner = w; if (this.d.onEnd) this.d.onEnd(w, b, this); },
  /** the control intents for this step: players read their sticks, CPUs think */
  controls(dt) {
    const F = this.fighters;
    F.forEach((f, i) => {
      if (this.d.net && this.d.net.control) { f.control(this.d.net.control(i, f)); return; }
      const R = this.readers[i];
      if (i === 1 && KC.DEV.p2 !== 'cpu' && (this.mode === 'story' || this.mode === 'versus')) { if (KC.DEV.p2 === 'pad2') { const P = KC.game.players[1]; f.control(P ? (this._p2r || (this._p2r = new KC.Reader(P))).read() : { posture: 'n', press: null }); } else { const was = this.spar; this.spar = { dummy: KC.DEV.p2 }; f.control(this._dummy(f, F[0], dt)); this.spar = was; } return; }
      if (R) { R.blocked = KC.game.paused; f.control(R.read()); }
      else if (this.mode === 'freeSpar' && i === 1) f.control(this._dummy(f, F[0], dt));
      else f.control(this.ai[i].intent(f, F[1 - i], dt));
    });
  },
  _dummy(f, foe, dt) {
    const m = this.spar.dummy;
    if (m === 'crouch') return { posture: 'd', press: null };
    if (m === 'jump') return { posture: f.free && Math.floor(KC.game.time * 1.2) % 2 === 0 ? 'u' : 'n', press: null };
    if (m === 'block') { const near = foe.st === 'tech' && foe.phase === 'wind'; return near && f.free ? { posture: KC.scrDir('b', f.face), press: KC.scrDir('f', f.face) } : { posture: 'n', press: null }; }
    if (m === 'attack') { if (!this.sparAI) this.sparAI = new KC.KarateAI({ fid: f.fid, level: 3, seed: 5 }); return this.sparAI.intent(f, foe, dt); }
    return { posture: 'n', press: null };
  },
  update(dt) {
    const game = KC.game, F = this.fighters;
    KC.fx.step(game, this.fx, dt); KC.Stage.update(dt);
    if (this.d.net && this.d.net.puppet) { this.d.net.puppet(this, dt); KC.camera(game, F.map(f => f.x)); return; }
    this.controls(dt);
    if (this.bout) {
      if (KC.anyPressed('skip') && this.bout.phase === 'award') this.bout.skip = true;
      this.bout.update(dt);
      if (this.d.net && this.d.net.after) this.d.net.after(this, dt);
    } else this._sparStep(dt);
    // hints (story's first matches): one line at a time
    if (this.d.hints && KC.settings && KC.settings.hints !== false && this.bout) { this.hintT -= dt; if (this.hintT <= 0) { this.hint = KC.HINTS[this.hintI++ % KC.HINTS.length]; this.hintT = 6; } }
    if (this.over && this.d.afterEnd) { this.endT += dt; this.d.afterEnd(this, dt); }
    KC.camera(game, F.map(f => f.x));
    if (this.mode === 'attract' && this.d.director) this.d.director(this, dt);
  },
  // free spar: no referee; a hit flashes, shows its points and the dummy reels; boxes and frame data in the dev overlay
  _sparStep(dt) {
    const [a, b] = this.fighters;
    a.update(dt, b); b.update(dt, a); KC.Bout.push(a, b);
    for (const [p, q] of [[a, b], [b, a]]) {
      const s = p.strike(q); if (!s) continue; p.resolved = true;
      if (q.blocks(p)) { p.recoil(); q.guarded(p); this.bus.emit('block', { side: q.side, x: (p.x + q.x) / 2, z: p.z + p.h * .6 }); continue; }
      const sc = KC.Bout.prototype._score.call({}, p, q, s); this.spar.last = sc; this.spar.hits.unshift(sc); if (this.spar.hits.length > 4) this.spar.hits.pop();
      q.hit(sc.full || KC.TECH[sc.tech].knockdown ? 'down' : 'hurt', p.x); q.stay = false;
      this.bus.emit('point', Object.assign({ x: (p.x + q.x) / 2 + p.face * 6, z: p.z + p.h * .6 }, sc));
    }
    for (const f of this.fighters) { f.pose(dt); if (f.st === 'idle' && !f.ctlOn) f.ctlOn = true; }
    if (b.x < 60 || b.x > 340 || a.x < 30 || a.x > 370) { if (a.free && b.free) { b.x = clamp(b.x, 60, 340); } }
  },
  draw(r) {
    const d = this.d, F = this.fighters;
    KC.Stage.draw(r, this.stage, { mei: d.mei, noCrowd: d.noCrowd });
    if (this.ref) this.ref.draw(r);
    for (const f of F) f.draw(r, { flash: (f.st === 'hurt' || f.st === 'down') && f.k < 8 ? '#ffffff' : undefined });
    if (d.bench) d.bench.forEach((b, i) => { const rig = b.rig || (b.rig = KC.makeRig(b.fid, 'white', null, { colors: { belt: b.color, trim: b.color } })); KC.poseStep(rig, 1 / 60, { seiza: 1 }); const x = i % 2 ? 374 : 26; rig.update(1 / 60, { x, y: 6, z: 0, facing: x < 200 ? 0 : PI }); r.actor(x, 6, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view)); });
    if (KC.DEV && (KC.DEV.boxes || this.mode === 'freeSpar')) KC.DevDraw.boxes(r, F);
    if (this.bout) KC.HUD.draw(r, this.bout, { names: this.sides.map(s => s.name), colors: this.sides.map(s => s.color), tags: this.sides.map(s => s.tag), hint: this.hint, score: d.score !== undefined ? d.score + this.bout.score[0] : undefined, hi: d.hi, inputs: (KC.settings && KC.settings.inputDisplay === 'on') || (KC.DEV && KC.DEV.inputDisplay) ? F : null, noBelt: d.noBelt });
    else KC.DevDraw.spar(r, this);
    if (d.overlay) r.overlay(g => d.overlay(g, r.W, r.H, this));
  }
};
