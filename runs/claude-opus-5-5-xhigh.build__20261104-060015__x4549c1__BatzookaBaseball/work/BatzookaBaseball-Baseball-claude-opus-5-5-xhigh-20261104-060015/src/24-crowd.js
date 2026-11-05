/* =============================================================================
 * 24-crowd: ballpark life. The crowd reacts by side (cheers, groans, the jump),
 * sways with the meter, does THE WAVE above 70; the jumbotron shows the batter,
 * MAKE SOME NOISE, the replay; the home mascot dances on the beat; fireworks at
 * night parks and confetti cannons by day; vendors shout; and the between-innings
 * shows: the Mascot Race, Dance Cam, the T-Shirt Cannon, the Grounds Crew Shuffle.
 * ========================================================================== */
BZ.crowdWave = null; BZ.crowdJump = 0;
BZ.crowd = {
  show: null, murmurT: 0, vendorT: 4, waveT: 0, boardMsg: null, boardT: 0, fx: [], mascots: null,
  install(M) {
    const on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    this.show = null; this.fx = []; this.boardMsg = null; this.mascots = null;
    const homeSide = () => BZ.offense(M).side === 1;
    on('contact', d => { BZ.sfx(d.zooka ? 'krakoom' : d.Q > .55 ? 'crack' : 'tink', { vol: .9 }); if (BZ.cosmetic) { const b = M.ball; BZ.game.particles.sparks(b.x, b.y, b.z, d.zooka ? 30 : 8 + Math.round(d.Q * 12), Math.atan2(b.vy, b.vx)); if (d.Q > .6 || d.zooka) BZ.game.flash('#ffffff', .06, d.zooka ? 1 : .5); BZ.cams.shake = .15; BZ.game.freeze(d.zooka ? .12 : .06); for (const T of M.teams) for (const h of T.humans) h.input.rumble(clamp(.3 + d.Q, 0, 1) * (d.zooka ? 1 : .6), .15); } });
    on('homer', d => { this.react(M, homeSide(), 'big'); BZ.sting('homerun'); this.boardMsg = d.batzooka ? 'BATZOOKA!!!' : 'HOME RUN!'; this.boardT = 4; this.celebrate(M, d.x, d.y); });
    on('hit', d => { if (!d.dead) { this.react(M, homeSide(), d.bases >= 2 ? 'big' : 'cheer'); this.boardMsg = d.bases >= 2 ? 'TWO-BAGGER!' : 'BASE HIT!'; this.boardT = 2; } });
    on('strikeout', () => { this.react(M, !homeSide(), 'cheer'); BZ.sting('strikeout'); this.boardMsg = 'K!'; this.boardT = 2; });
    on('catch', d => { if (d.fly && (d.dive || d.wall)) { this.react(M, !homeSide(), 'big'); this.boardMsg = d.wall ? 'ROBBED!' : 'WHAT A CATCH!'; this.boardT = 3; } else if (d.fly) BZ.sfx('glove'); });
    on('fielded', () => BZ.sfx('glove'));
    on('throw', d => { BZ.sfx(d.laser ? 'zap' : 'throwWhoosh'); });
    on('error', () => { this.react(M, homeSide(), 'oooh'); });
    on('doublePlay', () => this.react(M, !homeSide(), 'big'));
    on('bowlOver', () => { BZ.sfx('crash'); this.react(M, true, 'oooh'); if (BZ.cosmetic) { const H = M.park.H; BZ.game.particles.dust(H.x, H.y, 30, 1.5); BZ.game.shake(4); } });
    on('meterFull', () => { BZ.sfx('ding'); this.boardMsg = 'MAKE SOME NOISE!'; this.boardT = 3; });
    on('meter', d => { const hype = BZ.supers.hype(M); BZ.layer('hype', hype >= 1 ? 1 : 0, 1); });
    on('walkoff', () => { this.react(M, true, 'big'); BZ.sting('victory'); });
    on('gameEnd', d => { if (BZ.cosmetic) { const H = M.park.H; for (let i = 0; i < 6; i++) BZ.wait(i * .35, () => this.firework(M, H.x + BZ.Fr(-400, 400), H.y - BZ.Fr(500, 900))); } });
    on('dive', () => BZ.sfx('dive'));
    on('climb', () => BZ.sfx('climb'));
    on('slide', () => { BZ.sfx('slide'); });
    on('land', d => { BZ.sfx('bounce', { vol: .5 }); if (BZ.cosmetic) BZ.game.particles.dust(d.x, d.y, 4, .8); });
    on('fenceHit', () => BZ.sfx(M.park.def.ironFence ? 'clang' : 'thudWall'));
    on('foul', () => this.react(M, true, 'groan-soft'));
    on('release', d => { BZ.sfx('pitchWhoosh', { pitch: d.speed / 90 }); if (M.ab && BZ.PITCHES[M.ab.type] && BZ.PITCHES[M.ab.type].scream) BZ.sfx('scream'); if (M.ab && M.ab.type === 'overclock') BZ.sfx('laserPitch'); });
    on('pitchCross', d => { BZ.sfx(d.call === 'ball' && d.z < 4 ? 'dirtThud' : 'mitt'); });
    on('halfStart', () => BZ.sting('inning'));
    on('leadChange', () => BZ.sfx('organStab'));
    on('batterUp', () => { if (BZ.F() < .3) BZ.sfx('organStab', { vol: .6 }); });
  },
  /** the crowd reacts: home (true) or away fans, how */
  react(M, home, how) {
    if (how === 'big') { BZ.sfx('bigCheer'); BZ.crowdJump = 1.2; }
    else if (how === 'cheer') { BZ.sfx('cheer'); BZ.crowdJump = .6; }
    else if (how === 'oooh') BZ.sfx('oooh');
    else if (how === 'groan-soft') { if (BZ.F() < .5) BZ.sfx('groan', { vol: .4 }); }
    if (!home && (how === 'big' || how === 'cheer') && BZ.F() < .5) BZ.sfx('groan', { vol: .5 });
  },
  celebrate(M, x, y) {
    if (!BZ.cosmetic) return;
    const night = M.park.def.night;
    for (let i = 0; i < 5; i++) BZ.wait(i * .3 + .2, () => night ? this.firework(M, x + BZ.Fr(-200, 200), y + BZ.Fr(-150, 100)) : this.confetti(x + BZ.Fr(-120, 120), y + BZ.Fr(-80, 80)));
  },
  firework(M, x, y) {
    BZ.sfx('firework');
    const cols = ['#ff5a5a', '#ffd040', '#5affd0', '#ff7aff', '#7ab0ff'], c = BZ.pickF(cols), P = BZ.game.particles;
    for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; P.add({ kind: 'spark', x, y, z: 220 + BZ.Fr(-20, 20), vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, vz: BZ.Fr(-40, 60), life: 1.1, color: c }); }
    P.add({ kind: 'glint', x, y, z: 220, life: .3, color: '#ffffff' });
  },
  confetti(x, y) {
    const P = BZ.game.particles, cols = ['#ff5a5a', '#ffd040', '#5affd0', '#ff7aff', '#7ab0ff', '#ffffff'];
    BZ.sfx('pow', { vol: .5 });
    for (let i = 0; i < 30; i++) P.add({ kind: 'bit', x, y, z: 40, vx: BZ.Fr(-80, 80), vy: BZ.Fr(-80, 80), vz: BZ.Fr(120, 260), life: 2, color: BZ.pickF(cols) });
  },
  step(M, dt) {
    BZ.crowdJump = Math.max(0, BZ.crowdJump - dt * 1.5);
    const hype = BZ.supers.hype(M);
    // the wave above 70
    if (hype > .7 && M.phase !== 'between') { this.waveT += dt; BZ.crowdWave = ((this.waveT * 1.4) % (Math.PI * 2)) - Math.PI; } else { this.waveT = 0; BZ.crowdWave = null; }
    if (this.boardT > 0) this.boardT -= dt;
    // the murmur, the vendors
    this.murmurT -= dt; if (this.murmurT <= 0) { this.murmurT = .7; BZ.sfx('murmur', { vol: .4 + hype * .8 }); }
    this.vendorT -= dt; if (this.vendorT <= 0 && !M.fast) { this.vendorT = 9 + BZ.Fr(0, 9); this.vendor(M); }
    if (this.show) this.showStep(M, dt);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < f.life);
    if (!this.mascots && BZ.cosmetic) this.makeMascots(M);
    if (this.mascots) for (const m of this.mascots) { m.blob.update(dt, { squash: m.squash || 0, walk: m.walk || 0, flap: m.wings ? 1 : 0 }); m.squash *= .9; }
  },
  vendor(M) {
    const line = BZ.pickF(BZ.LINES.vendor), s = BZ.pickF(M.park.standCells || []);
    if (!s) return;
    this.fx.push({ kind: 'text', text: line, x: s.x, y: s.y, z: 90, t: 0, life: 2 });
    BZ.babble.say(line, 'vendor', { vol: .5 });
  },
  makeMascots(M) {
    const T = M.teams[1].def, mk = (spec, x, y) => ({ blob: BZ.makeBlob(Object.assign({}, spec, { colors: spec.colors })), x, y, z: 22, squash: 0, wings: spec.wings, ghost: spec.ghost });
    const P = M.park, s = Math.SQRT1_2, along = 170, H = P.H;
    this.mascots = [mk(T.mascot, H.x + along * s + s * 82, H.y - along * s + s * 82)];
    if (BZ.game.audio && BZ.game.audio.onBeat && !this._beat) this._beat = BZ.game.audio.onBeat(() => { if (this.mascots) for (const m of this.mascots) { m.squash = -.35; m.blob.kick(.6); } });
  },
  drawField(r, M, t) {
    if (this.mascots) for (const m of this.mascots) { if (m.race) continue; r.actor(m.x, m.y, m.z, (g, ox, oy) => { if (m.ghost) px.blend(g, .7, 'normal', () => m.blob.draw(g, ox, oy, r.view)); else m.blob.draw(g, ox, oy, r.view); }); }
    for (const f of this.fx) {
      if (f.kind === 'text') r.queue(f.x, f.y, f.z, g => { const q = r.w(f.x, f.y, f.z + f.t * 10); E.font.text(g, f.text, q[0], q[1], '#ffffff', { align: 'center', shadow: '#000' }); }, { bias: 10 });
      if (f.kind === 'shirt') r.queue(f.x, f.y, 0, g => { const u = f.t / f.life, x = f.x + (f.tx - f.x) * u, y = f.y + (f.ty - f.y) * u, z = 30 + Math.sin(u * Math.PI) * 140, q = r.w(x, y, z); px.rect(g, q[0] - 3, q[1] - 2, 6, 4, f.color); px.rect(g, q[0] - 4, q[1] - 2, 8, 2, f.color); }, { bias: 10 });
    }
    if (this.show) this.drawShow(r, M, t);
  },
  /* ---- the between-innings shows ---- */
  startShow(M) {
    const kinds = ['race', 'dance', 'shirts', 'crew'], kind = kinds[M.shows++ % kinds.length], P = M.park, H = P.H;
    this.show = { kind, t: 0, dur: 4.6 };
    BZ.sting('show');
    BZ.talk.say('between', {}, 2);
    if (kind === 'race') {
      const cols = [M.teams[1].def.mascot, M.teams[0].def.mascot, { R: 7, colors: { dk: '#7a5a1a', base: '#f4c840', lt: '#fff0a0', spec: '#ffffff', eye: '#2a1a0a', pupil: '#000' }, feet: true }];
      this.show.racers = cols.map((c, i) => ({ blob: BZ.makeBlob(Object.assign({}, c)), lane: i, u: 0, sp: .17 + BZ.F() * .05, trip: i === Math.floor(BZ.F() * 3) ? .3 + BZ.F() * .4 : 9, down: 0 }));
      BZ.hud.stamp('MASCOT RACE!', { prio: 2, scale: 3 });
    } else if (kind === 'dance') { BZ.hud.stamp('DANCE CAM!', { prio: 2 }); this.boardMsg = 'DANCE CAM'; this.boardT = 4.5; }
    else if (kind === 'shirts') { BZ.hud.stamp('T-SHIRT CANNON!', { prio: 2 }); this.show.fired = 0; }
    else { BZ.hud.stamp('GROUNDS CREW SHUFFLE!', { prio: 2, scale: 2 }); this.show.crew = [0, 1, 2, 3].map(i => ({ x: H.x - 90 + i * 60, y: H.y - 330, rig: BZ.makeRig({ id: 'crew' + i, look: { build: 'heroic', size: 1.2, skin: SKINS[i * 2 % SKINS.length], hair: 'short' } }, { uniform: { jersey: '#2a6a3a', pants: '#e8d8b0', cap: '#2a6a3a' } }, 'bench') })); }
  },
  showStep(M, dt) {
    const S = this.show; S.t += dt;
    if (S.kind === 'race') for (const r of S.racers) { if (r.down > 0) { r.down -= dt; continue; } r.u = Math.min(1, r.u + r.sp * dt); if (r.u > r.trip) { r.trip = 9; r.down = 1; BZ.sfx('slideWhistle'); } r.blob.update(dt, { walk: 1, squash: Math.sin(S.t * 12 + r.lane) * .2 }); }
    if (S.kind === 'shirts' && S.t > .5 + S.fired * .5 && S.fired < 6) {
      S.fired++; BZ.sfx('pow');
      const P = M.park, s = BZ.pickF(P.standCells.filter(c => c.behind === false) || P.standCells); const H = P.H;
      if (s) this.fx.push({ kind: 'shirt', x: H.x, y: H.y - 60, tx: s.x, ty: s.y, t: 0, life: 1.3, color: BZ.pickF(M.teams[1].def.colors) });
    }
    if (S.kind === 'crew') for (const c of S.crew) BZ.rigUpdate(c.rig, dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2, attack: E.move(['jab', 'cross', 'hook', 'uppercut'][Math.floor(S.t * 2 + c.x) % 4], (S.t * 2) % 1, 'active'), expr: 'smile' });
  },
  showDone(M) { return !this.show || this.show.t >= this.show.dur; },
  endShow(M) { this.show = null; },
  showFocus(M) { const H = M.park.H, S = this.show; if (!S) return [{ x: H.x, y: H.y - 300 }]; if (S.kind === 'race') { const R = M.park.R(-.6); return [{ x: H.x - 380, y: H.y - R * .7 }, { x: H.x + 380, y: H.y - R * .7 }]; } if (S.kind === 'crew') return [{ x: H.x - 140, y: H.y - 380 }, { x: H.x + 140, y: H.y - 280 }]; return [{ x: H.x - 200, y: H.y - 200 }, { x: H.x + 200, y: H.y + 40 }]; },
  drawShow(r, M, t) {
    const S = this.show, P = M.park, H = P.H;
    if (S.kind === 'race') for (const rc of S.racers) {
      const th = -.75 + rc.u * 1.5, R = P.R(th) - 26 - rc.lane * 12, x = H.x + Math.sin(th) * R, y = H.y - Math.cos(th) * R;
      r.shadow(x, y, 7, .4);
      r.actor(x, y, rc.down > 0 ? 0 : 0, (g, ox, oy) => rc.blob.draw(g, ox, oy, r.view));
      if (rc.down > 0) r.queue(x, y, 30, g => { const q = r.w(x, y, 26); for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; E.font.text(g, '★', q[0] + Math.cos(a) * 7, q[1] + Math.sin(a) * 3, '#ffd040'); } }, { bias: 5 });
    }
    if (S.kind === 'crew') for (const c of S.crew) { r.shadow(c.x, c.y, 6, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view)); }
  }
};
/** the jumbotron or scoreboard screen, drawn on its face's projected quad */
BZ.drawBoardScreen = (g, q, t, pr) => {
  const M = BZ.M, C = BZ.crowd;
  const [p0, p1, p2, p3] = q, x0 = Math.min(p0[0], p3[0]), x1 = Math.max(p1[0], p2[0]), y0 = Math.min(p2[1], p3[1]), y1 = Math.max(p0[1], p1[1]);
  px.poly(g, q, pr.id === 'bz_barnboard' ? '#0e1a0e' : '#06080e');
  const w = x1 - x0, h = y1 - y0; if (w < 6 || h < 4) return;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (!M) { E.font.text(g, 'BATZOOKA', cx, cy - 3, '#ffd040', { align: 'center' }); return; }
  // bulbs on the barn board, a message or the batter on a video board
  if (C && C.boardT > 0 && C.boardMsg) {
    const blink = Math.floor(t * 6) % 2; E.font.text(g, C.boardMsg, cx, cy - 3, blink ? '#ffd040' : '#ff7a1a', { align: 'center', scale: w > 120 ? 2 : 1 });
    if (C.show && C.show.kind === 'dance') { const k = Math.sin(t * 9); px.disc(g, cx + k * 6, cy + 6, 3, '#f1c7a0'); px.rect(g, cx - 3 + k * 6, cy + 9, 6, 6, '#d83a2a'); }
    return;
  }
  if (h > 16 && M.batter && pr.megatron !== false) {
    const rig = BZ.rigFor(M.batter, 'bench');
    if (rig && BZ.cosmetic && h > 26) rig.drawPortrait(g, Math.round(x0 + 3), Math.round(y0 + 2), Math.round(Math.min(h - 4, 40)), { zoom: 2, frame: false });
    E.font.text(g, M.batter.short, x0 + Math.min(h - 4, 40) + 6, cy - 6, '#ffffff');
    E.font.text(g, M.teams[0].def.abbr + ' ' + M.teams[0].runs + '  ' + M.teams[1].def.abbr + ' ' + M.teams[1].runs, x0 + Math.min(h - 4, 40) + 6, cy + 3, '#ffd040');
  } else E.font.text(g, M.teams[0].runs + ' - ' + M.teams[1].runs, cx, cy - 3, '#ffd040', { align: 'center' });
};
