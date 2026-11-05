/* BATZOOKA BASEBALL: the match scene (exhibition, tour, lessons, derby and the attract mode all run here). */
const ring = (r, x, y, rad, col, t = 0) => r.queue(x, y, 0, g => { const c = r.w(x, y, 0); const k = r.view && r.view.sy || .82; for (let a = 0; a < 20; a++) { const th = a / 20 * TAU + t; px.rect(g, Math.round(c[0] + Math.cos(th) * rad), Math.round(c[1] + Math.sin(th) * rad * .55), 2, 2, col); } }, { bias: -1, emissive: true });
function bindFx(scene) {
  const M = BZ.M, H = BZ.hud;
  BZ.on('homer', d => { scene.cheerTeam(d.side, 3.5); });
  BZ.on('run', d => { scene.cheerTeam(d.side, 1.4); });
  BZ.on('strikeout', () => { });
  BZ.on('meterfull', d => { if (M.sides[d.side].human && game.input.rumble) game.input.rumble(.5, .2); });
  BZ.on('contact', d => { if (M.sides[d.side === undefined ? M.half : d.side].human) game.input.rumble && game.input.rumble(clamp(d.Q, .2, 1) * .8, .12); });
  BZ.on('gameover', d => { scene.overT = 0; });
  BZ.on('lessondone', () => { scene.lessonDoneT = 0; if (scene.data.lesson) BZ.markLesson(scene.data.lesson); BZ.sfx('coin'); BZ.charge(); });
  BZ.on('batterup', d => { if (M.mode !== 'derby' && BZ.hud.radioCool < 0 && rfx() < .25) BZ.say('start', 1); });
  BZ.on('rhubarbend', d => { game.flash('#ffffff', .2, .5); });
}
BZ.scenes.match = {
  pausable: true, view: 'threequarter', input: BZ.PRESET, res: 'ps1', canHelp: true, camera: false,
  enter(data) {
    data = this.data = data || {};
    const humans = data.humans || [true, false];
    const lv = data.diff == null ? BZ.levelDiff() : data.diff;
    const aw = Object.assign({ team: 'hay' }, data.away), ho = Object.assign({ team: 'cin' }, data.home);
    if (data.derby) {
      const pl = (data.players || ['P1']).map((n, i) => ({ name: n, ctl: game.players[Math.min(i, game.players.length - 1)] || game.input, human: true }));
      BZ.M = null; BZ.newDerby({ park: data.park, players: pl, outs: data.outs || 7, seed: data.seed, hub: data.hub, pitchSeq: data.pitchSeq });
    } else {
      BZ.newMatch({ park: data.park || 'corn', away: aw, home: ho, innings: data.innings || 3, seed: data.seed, diff: lv, attract: !!data.attract, lesson: data.lesson, mode: 'game', noBetween: false });
      const M0 = BZ.M;
      M0.sides[0].human = !!humans[0] && !data.attract; M0.sides[1].human = !!humans[1] && !data.attract;
      M0.sides[0].ctl = M0.sides[0].human ? game.players[0] : null;
      M0.sides[1].ctl = M0.sides[1].human ? (game.players[1] || game.players[0]) : null;
      if (data.lesson) BZ.applyLessonSides(data.lesson);
      if (data.tour) { M0.sides[0].up = data.tour.up; }
    }
    const M = BZ.M; this.M = M; M.attract = !!data.attract;
    BZ.clearListeners(); BZ.hudReset(); BZ.hudBind(); bindFx(this);
    BZ.cosmetic = true; this.park = BZ.buildPark(M.parkDef);
    game.cam.bounds = v => this.park.map.bounds(v);
    game.follow(null); game.resetCamera(); game.cam.smooth = .12;
    this.camX = G.HX; this.camY = G.HY - 100;
    const pd = M.parkDef;
    game.lights.enabled = !!pd.lights; game.lights.ambient = pd.ambient;
    game.weather = pd.weather ? { kind: pd.weather, amount: .35, wind: .2 } : null;
    BZ.music(pd.song || 'play');
    this.over = false; this.overT = 0; this.lessonDoneT = -1; this.dev = null; this.cheer = [0, 0]; this.talkT = 0;
    this.rhubarbRigs = null; this.endCalled = false; this.attractT = 0; this.hubT = 0;
    if (M.mode === 'game') BZ.emit('half', { inn: 1, half: 0 });
    game.input.consumeAll();
    if (data.onEnter) data.onEnter(this);
    if (data.lesson) BZ.hud.banner = { text: 'LESSON ' + data.lesson, sub: BZ.get('lessons', data.lesson).name, t: 0, life: 2.6, color: '#7affc0' };
    BZ.mascotInit && BZ.mascotInit(M);
  },
  exit() { game.weather = null; game.lights.enabled = false; BZ.clearListeners(); if (BZ.M) BZ.M.derbyLeave = true; },
  cheerTeam(side, s) { this.cheer[side] = s; },
  openDev() { BZ.openDev(this); },
  openHelp() { this.helpOpen = true; },
  update(dt) {
    const M = this.M;
    if (this.helpOpen) { if (game.input.pressed('confirm') || game.input.pressed('cancel') || game.input.pressed('start')) { this.helpOpen = false; game.input.consumeAll(); } return; }
    if (this.dev && this.dev.open) { BZ.devUpdate(this, dt); if (!this.dev.running) return; }
    // attract: any input leaves
    if (M.attract) { this.attractT += dt; if (this.attractT > .6 && (game.input.anyPressed() || game.input.pointerMoved && game.input.pointerMoved())) { game.go('title'); return; } if (M.over && this.overT > 3) { this.restartAttract(); return; } }
    // intents: humans through their controller; the bot or tests may override
    for (let i = 0; i < 2; i++) {
      const sd = M.sides[i];
      M.intent[i] = BZ.botIntent ? BZ.botIntent(i, M) : (sd.human && sd.ctl) ? BZ.readIntent(game, sd.ctl, i) : {};
    }
    if (this.data.hub && BZ.hubTick(this, dt) === 'wait') { BZ.hudUpdate(dt); this.updateCosmetics(dt); this.updateCamera(dt); return; }
    BZ.hudUpdate(dt);
    BZ.updateSim(dt);
    if (M.over) { this.overT += dt; if (!this.endCalled && this.overT > (M.attract ? 3 : 3.2)) { this.endCalled = true; this.finish(); } }
    if (this.lessonDoneT >= 0) { this.lessonDoneT += dt; if (this.lessonDoneT > 3) { game.go('training'); return; } }
    this.cheer[0] = Math.max(0, this.cheer[0] - dt); this.cheer[1] = Math.max(0, this.cheer[1] - dt);
    for (const a of M.sides[0].actors.concat(M.sides[1].actors)) { if (a.mood === 'cheer' && M.phase !== 'homer' && M.phase !== 'rhubarbwin' && (M.phase === 'setup')) a.mood = null; }
    this.updateCosmetics(dt);
    this.updateCamera(dt);
    this.updateAudio(dt);
    if (M.shake > 0) game.shake(M.shake * 3), M.shake = 0;
    if (this.data.onUpdate) this.data.onUpdate(this, dt);
  },
  restartAttract() { game.go('match', Object.assign({}, this.data, { seed: (this.data.seed || 1) + 1, park: pickOf(['corn', 'moon', 'magma', 'mega'], rfx), away: { team: pickOf(['hay', 'lem'], rfx) }, home: { team: pickOf(['cin', 'meg'], rfx) } })); },
  finish() {
    const M = this.M;
    if (this.data.onFinish) return this.data.onFinish(this, M);
    if (M.attract) return;
    if (this.data.derby) { if (this.data.hub) return; return game.go('derbyend', { players: M.derby.players.map(p => Object.assign({}, p, { ctl: null })) }); }
    game.go('results', { M: BZ.summary(M), data: this.data });
  },
  updateCosmetics(dt) {
    const M = this.M;
    if (BZ.cosmetic) {
      BZ.updateRigs(dt, M); BZ.umpireUpdate(dt);
      if (M.phase === 'rhubarb' || M.phase === 'rhubarbwin') this.updateRhubarbRigs(dt);
    }
    // the dugouts, the mascot, the crowd cheer
    if (BZ.mascot) BZ.mascot.tick && BZ.mascot.tick(dt);
  },
  updateRhubarbRigs(dt) {
    const M = this.M;
    if (!this.rhubarbRigs) {
      this.rhubarbRigs = [];
      for (let s = 0; s < 2; s++) for (let i = 0; i < 5; i++) { const a = M.sides[s].actors[(i * 2 + s) % 9], rig = BZ.rigFor(a, M.sides[s].team, false); this.rhubarbRigs.push({ a, rig, s, i, t: rfx() * 3 }); }
    }
    for (const q of this.rhubarbRigs) {
      q.t += dt; const ang = q.i / 5 * TAU + (q.s ? PI / 5 : 0) + Math.sin(M.clock * 3 + q.i) * .3, rad = 16 + Math.sin(q.t * 6) * 4;
      q.x = Math.cos(ang) * rad; q.y = Math.sin(ang) * rad * .6 - 6;
      const u = (q.t * 2.2) % 1, attack = { spec: E.MOVES[['haymaker', 'cross', 'hook', 'jab'][q.i % 4]], phase: u < .35 ? 'wind' : u < .6 ? 'active' : 'recover', u: u < .35 ? u / .35 : u < .6 ? (u - .35) / .25 : (u - .6) / .4 };
      q.rig.update(dt, { x: q.x, y: q.y, z: 0, facing: ang + PI, vx: 0, vy: 0, attack });
    }
  },
  updateCamera(dt) {
    const M = this.M, ph = M.phase;
    let tx, ty;
    if (ph === 'play' && game.settings.camMode !== 'wide') {
      const b = M.ball; let bx = b.x, by = b.y;
      if (b.state === 'held' && b.holder) { bx = b.holder.x; by = b.holder.y; }
      const rn = M.runners.filter(r => r.state === 'run' && r.dir !== 0)[0];
      tx = G.HX + (rn ? (bx + rn.actor.x) / 2 : bx); ty = G.HY + (rn ? (by + rn.actor.y) / 2 : by);
      if (M.stealPlay) { tx = G.HX; ty = G.HY - 230; }
    } else if (ph === 'play' || ph === 'foul' || ph === 'resolved') { tx = G.HX; ty = G.HY - 300; }
    else if (ph === 'homer') { const b = M.ball; tx = G.HX + b.x * .7; ty = G.HY + b.y * .75 - 30; }
    else if (ph === 'between') { tx = G.HX; ty = G.HY - 230; }
    else if (ph === 'over') { tx = G.HX; ty = G.HY - 200; }
    else if (ph === 'rhubarb' || ph === 'rhubarbwin') { tx = G.HX; ty = G.HY - 10; }
    else { tx = G.HX; ty = G.HY - 96; }
    const k = Math.min(1, dt * (ph === 'play' ? 5 : 3.5));
    this.camX = lerp(this.camX, tx, k); this.camY = lerp(this.camY, ty, k);
    game.focus(this.camX, this.camY, 0);
    const zz = ph === 'play' ? (game.settings.camMode === 'wide' ? .42 : 0.6) : ph === 'homer' ? .42 : ph === 'between' || ph === 'resolved' ? .45 : ph === 'foul' ? .5 : .66;
    this.zoomT = lerp(this.zoomT || 1, zz, Math.min(1, dt * 1.5));
    if (Math.abs((game.zoom || 1) - this.zoomT) > .03) game.setZoom(this.zoomT);
  },
  updateAudio(dt) {
    const M = this.M, H = BZ.hud;
    this.audT = (this.audT || 0) - dt;
    if (this.audT <= 0) {
      this.audT = .5;
      const tense = M.runners.some(r => r.state === 'run' && r.pos >= 2) || H.hype > .45;
      try { game.audio.layer('drums', tense ? 1 : 0, 1.2); } catch (e) { /* no such layer in this song */ }
      if (H.hype > .3 && rfx() < .1) BZ.sfx('crowd', { vol: .5 * H.hype });
    }
  },
  draw(r) {
    const M = this.M, P = this.park, H = BZ.hud;
    // light the park
    if (M.parkDef.lights) {
      for (const s of [-1, 1]) for (const k of [.55, 1]) game.lights.add(G.HX + s * (BZ.fenceR(0) * .7 * k + 40), G.HY - BZ.fenceR(0) * .62 * k - 70, 90, 330, .9, { color: '#fff4d0' });
      game.lights.add(G.HX, G.HY - 200, 40, 280, .8, { color: '#fff0c0' }); game.lights.add(G.HX, G.HY - 10, 40, 160, .7, { color: '#fff0c0' });
      const b = M.ball; if (b.fire) game.lights.add(G.HX + b.x, G.HY + b.y, b.z + 8, 80, 1, { color: '#ff9a40' });
    }
    P.map.drawFloor(r);
    BZ.drawField(r, M);
    P.map.queueWalls(r);
    BZ.drawScenery(r, M);
    if (game.settings.crowdFx) BZ.drawCrowd(r, M, H.hype);
    // players
    const bs = M.sides[M.half], ds = M.sides[1 - M.half];
    const ctlF = M.phase === 'play' && ds.human ? BZ.controlled(1 - M.half) : null;
    for (const a of ds.actors) { if (M.mode === 'derby' && a.pos !== 'P' && a.pos !== 'C') continue; if (a.rig) BZ.drawActor(r, a, a.rig, M); }
    for (const rn of M.runners) if ((rn.state === 'run' || rn.state === 'score') && rn.actor.rig) BZ.drawActor(r, rn.actor, rn.actor.rig, M);
    if (M.batter && !M.runners.find(q => q.actor === M.batter) && M.batter.rig && M.phase !== 'over') BZ.drawActor(r, M.batter, M.batter.rig, M);
    r.actor(G.HX, G.HY + 36, 0, (g, ox, oy) => BZ.umpireRig.draw(g, ox, oy, r.view));
    if (BZ.mascot && BZ.mascot.draw) BZ.mascot.draw(r);
    if (this.rhubarbRigs && (M.phase === 'rhubarb' || M.phase === 'rhubarbwin')) {
      for (const q of this.rhubarbRigs) r.actor(G.HX + q.x, G.HY + q.y, 0, (g, ox, oy) => q.rig.draw(g, ox, oy, r.view));
      const R = M.rhubarb;
      r.queue(G.HX, G.HY - 2, 30, g => { const c = r.w(G.HX, G.HY - 2, 12); for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + M.clock * 2.6, rad = 14 + Math.sin(M.clock * 9 + i * 1.7) * 5; px.disc(g, c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad * .6, 7 + (i % 3) * 2, i % 2 ? 'rgba(230,214,170,.78)' : 'rgba(200,180,140,.82)'); } if (rfx() < .5) E.font.text(g, ['POW', 'BAM', 'WHAP', 'OOF'][Math.floor(M.clock * 9) % 4], c[0] + Math.sin(M.clock * 8) * 14 - 8, c[1] - 20, '#ffe070', { outline: '#a02010' }); }, { bias: 5 });
    }
    // controlled fielder ring, landing marker
    if (ctlF && !M.over) ring(r, G.HX + ctlF.x, G.HY + ctlF.y, 11, '#ffee66', M.clock * 2);
    if (M.phase === 'play' && ds.human && M.pred && M.ball.state === 'hit' && M.ball.z > 12) {
      const lp = M.pred.find(p => p.z <= 3 && p.bounces >= 0 && p.t > .05) || M.pred[M.pred.length - 1];
      if (lp && !lp.homer) ring(r, G.HX + lp.x, G.HY + lp.y, 9 + Math.sin(M.clock * 12) * 2, '#ffffff', 0);
    }
    BZ.drawBall(r, M);
    r.overlay(g => this.drawHud(g, r));
  },
  drawHud(g, r) {
    const M = this.M, W_ = r.W, H_ = r.H, H = BZ.hud, bs = M.sides[M.half], ds = M.sides[1 - M.half];
    if (H.flashT > 0) px.rect(g, 0, 0, W_, H_, 'rgba(255,255,255,' + Math.min(.6, H.flashT * 2) + ')');
    if (this.data.derby) { BZ.drawDerbyHud(g, game, M, W_, H_); }
    else BZ.drawScorebug(g, M, W_);
    // pitch info
    const ph = M.phase;
    if (!M.over) {
      const batMode = bs.human && !(M.mode === 'derby' ? false : false), pitchMode = ds.human && M.mode !== 'derby';
      if (ph === 'setup' || ph === 'windup' || ph === 'pitch' || ph === 'call') {
        const role = M.mode === 'derby' ? 'bat' : (bs.human && ds.human) ? 'both' : ds.human ? 'pitch' : 'bat';
        const zw = 66, zh = 70;
        BZ.drawZone(g, game, M, role, W_ - zw - 6, H_ - zh - 56, zw, zh);
        if (M.mode !== 'derby') {
          const nm = G.PITCHES[M.pitch ? M.pitch.type : G.ORDER[M.sel % 4]].name;
          if (ds.human && (ph === 'setup' || ph === 'windup')) { shadowText2(g, nm, W_ - zw / 2 - 6, H_ - zh - 66, '#ffe070'); }
          else if (M.pitch && M.pitch.released) shadowText2(g, H.lastType + ' ' + H.mph + ' MPH', W_ - zw / 2 - 6, H_ - zh - 66, '#ffffff');
          const p = fielderOf('P'), b = M.batter;
          shadowText2(g, p.name + ' vs ' + b.name, W_ - zw / 2 - 6, H_ - zh - 76, '#e8e8ff');
        }
      } else if (ph === 'play' || ph === 'homer') {
        if (H.mph && ph === 'play' && M.lastHit) shadowText2(g, 'EXIT ' + BZ.mph(M.lastHit.v) + ' MPH  ' + (M.lastHit.kind === 'bz' ? 'BATZOOKA' : ''), W_ - 60, 6, '#ffe070');
      }
    }
    radioBox(g, M, W_, H_);
    BZ.drawStamps(g, W_, H_);
    if (!M.attract) BZ.drawPrompts(g, game, M, W_, H_, bs.human ? bs.ctl : ds.ctl);
    if (M.derbyPopup && M.derbyPopup.t < 2) { M.derbyPopup.t += .016; E.font.title(g, M.derbyPopup.text, W_ / 2, H_ * .48, { scale: 3, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' }); }
    if (M.phase === 'rhubarb' && M.rhubarb) {
      const R = M.rhubarb, w = Math.min(220, W_ - 40), x = (W_ - w) / 2, y = H_ * .22;
      px.rect(g, x - 1, y - 1, w + 2, 12, '#000'); px.rect(g, x, y, w, 10, '#202040'); px.rect(g, x + w / 2, y, w / 2 * R.bar, 10, M.sides[0].team.chip === '#f2d544' ? '#f2d544' : M.sides[0].team.chip);
      px.rect(g, x + w / 2 + w / 2 * R.bar * 0, y, 1, 10, '#fff');
      shadowText2(g, M.sides[0].team.short, x - 20, y + 2, M.sides[0].team.chip); shadowText2(g, M.sides[1].team.short, x + w + 20, y + 2, M.sides[1].team.chip);
      shadowText2(g, 'MASH ' + game.input.label('swing') + '!   TIME ' + Math.ceil(R.dur - R.t), W_ / 2, y + 16, '#ffe070');
    }
    if (this.lessonDoneT >= 0 || this.data.lesson) {
      const L = BZ.get('lessons', this.data.lesson);
      if (L) { px.rect(g, W_ / 2 - 150, 52, 300, 22, 'rgba(8,10,26,.8)'); const ls = E.font.wrap(this.lessonDoneT >= 0 ? L.done : L.hint, 292); shadowText2(g, ls[0] || '', W_ / 2, 55, this.lessonDoneT >= 0 ? '#7affc0' : '#ffffff'); if (ls[1]) shadowText2(g, ls[1], W_ / 2, 64, this.lessonDoneT >= 0 ? '#7affc0' : '#ffffff'); }
    }
    if (M.attract) { if (Math.floor(game.time * 1.4) % 2) E.font.title(g, 'DEMO', W_ - 38, 10, { scale: 2, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' }); shadowText2(g, 'PRESS ANY BUTTON', W_ / 2, H_ - 14, '#ffffff'); }
    if (M.over && !M.derby) {
      const w = M.winner; E.font.title(g, w < 0 ? 'A TIE!' : M.sides[w].team.name + ' WIN!', W_ / 2, H_ * .38, { scale: 2, colors: ['#ffffff', '#ffd23a'], outline: '#101020', align: 'center' });
    }
    if (this.helpOpen) BZ.drawHelp(g, game, W_, H_);
    if (this.dev && this.dev.open) BZ.devDraw(this, g, r);
  }
};
const shadowText2 = (g, t, x, y, c) => E.font.text(g, t, x, y, c, { align: 'center', shadow: '#000', outline: false });
BZ.summary = M => ({ score: M.score.slice(), line: M.line.map(l => l.slice()), winner: M.winner, teams: M.sides.map(s => s.team.id), stat: M.sides.map(s => Object.assign({}, s.stat)), park: M.parkDef.id, inn: M.inn, humans: M.sides.map(s => s.human), best: M.bestDist, innings: M.innings });
BZ.applyLessonSides = n => {
  const M = BZ.M, L = BZ.get('lessons', n), s = L.setup;
  if (s.role === 'bat' || s.role === 'run') { M.sides[0].human = true; M.sides[0].ctl = game.players[0]; M.sides[1].human = false; M.half = 0; }
  else { // pitching and fielding lessons: you defend (the second side is the home team in the field)
    M.sides[0].human = false; M.sides[1].human = true; M.sides[1].ctl = game.players[0]; M.sides[0].ctl = null; M.half = 0;
  }
  if (s.runners) for (const b of s.runners) { const a = M.sides[M.half].actors[(b + 3) % 9]; addRunner(a, b); a.rig = null; }
  if (s.meter) M.sides[M.half].meter = s.meter;
  M.innings = 99; BZ.startHalfKeep && 0;
  M.sides[M.half].order = 0; BZ.nextBatter();
};
