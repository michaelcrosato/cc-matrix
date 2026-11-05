/* ---------- the fight scene: story, versus, attract, free spar and online all run through it ---------- */
KC.dev = { open: false, showBoxes: false, showInput: false, showFrame: false, aiThoughts: false, invincible: false, infinite: false, freezeCpu: false, step: 0, slow: false, muteVoices: false, p2mode: 'cpu', unlocked: false, skipCut: false, tab: 0, row: 0, fps: false };
const camTarget = (b, W) => { const a = b.f[0].x, c = b.f[1].x; return clamp((a + c) / 2, 150, 250); };
KC.fightCamera = (scene, dt, b, r) => {
  const g = KC.game, cx = camTarget(b), k = clamp(dt * 6, 0, 1); scene.camX = scene.camX === undefined ? cx : lerp(scene.camX, cx, k);
  const sway = scene.stage && scene.stage.d.sway && !g.reduceMotion ? Math.sin(g.time * 1.3) * .6 : 0;
  g.focus(scene.camX, 0, 50 + sway);
};

KC.scenes.fight = {
  view: 'side', views: ['side', 'brawler'], input: KC_KEYS, res: 'ps1', pausable: !SESSION, touch: [], camera: { zoom: false },
  enter(d) {
    KC.game.setView(KC.game.settings.camera === 'Tatami 2.5D' ? 'brawler' : 'side');
    const g = KC.game; d = d || {}; this.d = d; this.mode = d.mode || 'versus'; this.stage = new Stage(d.stage || 'dojo'); this.camX = undefined; this.done = false; this.t = 0; this.resultT = 0;
    g.follow(null); g.cam.bounds = null; g.cam.snap = true; if (g.cam.room !== undefined) g.cam.room = null;
    const ids = d.ids || ['taro', 'kamaboko'];
    this.readers = [null, null]; this.ais = [null, null];
    const ctrl = [null, null];
    for (let i = 0; i < 2; i++) {
      const who = d.players ? d.players[i] : (i === 0 ? 'human' : 'cpu');
      if ((who === 'human') && KC.autopilot) { const ai = new KarateAI({ id: ids[i], level: KC.autopilot, seed: (d.seed || 1) * 3 + i, mode: 'normal', ignoreTune: true }); this.ais[i] = ai; ctrl[i] = (m, f, b) => ai.intent(m, f, b); }
      else if (who === 'human' || who === 'human2') { const inp = who === 'human2' ? (g.players[1] || g.input) : g.players[0] || g.input; this.readers[i] = new Reader(inp); ctrl[i] = () => (this.paused() ? { posture: 'n', tech: null } : this.readers[i].read()); }
      else if (who === 'cpu' || who === 'showcase' || who === 'dummy') {
        const ai = new KarateAI({ id: ids[i], level: d.level && d.level[i], seed: (d.seed || 1) + i, mode: who === 'showcase' ? 'showcase' : 'normal', diff: g.settings.difficulty, start: d.start ? d.start[i] : 0 });
        this.ais[i] = ai; ctrl[i] = (m, f, b) => KC.dev.freezeCpu || who === 'dummy' ? this.dummy(m, f, b) : ai.intent(m, f, b);
      } else if (typeof who === 'function') ctrl[i] = who;
    }
    this.bout = new Bout({ ids, belts: d.belts, names: d.names, seed: d.seed || 7, ctrl, single: !!d.single, mode: this.mode, intro: d.intro !== false, onMatchEnd: (w, st) => this.onEnd(w, st) });
    this.hud = new FightHUD(this.bout, { names: d.names, tags: d.tags, hideScore: d.hideScore, readers: this.readers });
    this.bout.on('point', p => this.onPoint(p)); this.bout.on('block', p => this.onBlock(p)); this.bout.on('roundEnd', () => this.stage.react('full')); this.bout.on('aiuchi', () => KC.sfx('crowdOoh'));
    this.bout.on('card', () => {}); this.hintIdx = 0; this.hintT = 0;
    if (KC.dev.invincible) this.bout.invincible[1] = true;
    this.bout.infiniteTime = KC.dev.infinite;
    this.bout.start(); KC.music(this.stage.d.music); if (this.d.onStart) this.d.onStart(this.bout, this);
    this.dummyMode = d.dummyMode || 'stand'; KC.current = this;
  },
  exit() { KC.game.timeScale = T().gameSpeed; KC.game.weather = null; },
  paused() { return KC.dev.open; },
  dummy(m, f, b) {
    const mode = this.dummyMode, tgt = { posture: 'n', tech: null };
    if (mode === 'crouch') tgt.posture = 'd'; else if (mode === 'jump' && m.state === 'free') tgt.posture = (b.steps % 160 < 6) ? 'u' : 'n'; else if (mode === 'block' && f.tech && !f.tech.util && f.phase === 'startup') { const fd = f.x > m.x ? 1 : -1; return { posture: fd > 0 ? 'l' : 'r', tech: fd > 0 ? 'r' : 'l' }; }
    else if (mode === 'attack' && m.state === 'free' && b.steps % 200 === 0) { const fd = f.x > m.x ? 'r' : 'l'; return { posture: 'n', tech: fd }; }
    return tgt;
  },
  onPoint(p) {
    const g = KC.game, b = this.bout, A = b.f[p.side], D = b.f[1 - p.side], x = p.x, tech = KC.TECHS[p.tech];
    g.particles.impact(x, 0, 40, p.full ? 1.6 : 1, p.full ? '#ffe070' : '#ffffff'); g.particles.sparks(x, 0, 40, p.full ? 14 : 8, 0);
    g.particles.dust(D.x, 0, 4, 6);
    if (!g.reduceMotion) g.shake(p.full ? 4 : 2); if (p.full) g.flash('#ffffff', .08);
    KC.sfx(p.full ? 'thwackFull' : 'thwackHalf'); KC.sfx('thudFall', { vol: p.full ? 1 : 0 }); this.stage.react(p.full ? 'full' : 'half');
    if (g.input.rumble) g.input.rumble(p.full ? .8 : .4, .15);
    if (p.full && !g.reduceMotion && !this.d.noSlow) { g.timeScale = .35 * T().gameSpeed; g.after(.35 * .35, () => { g.timeScale = T().gameSpeed; }); }
    if (KC.Voice) KC.Voice.kiai(A.d.voice, tech.kiai === 'heavy');
    if (this.d.onPoint) this.d.onPoint(p, b);
  },
  onBlock(p) { KC.game.particles.sparks(p.x, 0, 44, 8, 0); KC.sfx('clack'); this.stage.react('block'); KC.sfx('crowdOoh', { vol: .5 }); },
  onEnd(w, st) { if (this.done) return; this.done = true; if (this.d.onEnd) this.d.onEnd(w, st, this.bout); },
  update(dt) {
    const g = KC.game, b = this.bout; this.t += dt; KC.devPoll(); if (KC.overlayStep(dt)) { this.stage.update(dt); return; }
    if (KC.dev.open && !KC.dev.step) { KC.devUpdate(dt, this); this.stage.update(dt); KC.fightCamera(this, dt, b); return; }
    if (KC.dev.open) KC.devUpdate(dt, this);
    if (KC.dev.step) { KC.dev.step = 0; for (let i = 0; i < 1; i++) b.update(STEP); }
    else if (!(KC.dev.freezeAll)) { this.bout.infiniteTime = KC.dev.infinite; b.update(dt); }
    // skip the reset walk with start after 0.6 s of award
    if (b.phase === 'award' && g.input.pressed('start') && b.pt > b.pace(.6)) b.skipReq = true;
    this.stage.update(dt); KC.updateReferee(b, dt); this.footsteps(); this.hints(dt); KC.fightCamera(this, dt, b);
    if (this.d.update) this.d.update(dt, this);
  },
  footsteps() { const b = this.bout; for (const f of b.f) { if (f.walking && f.state === 'free' && f.z === 0) { f._st = (f._st || 0) + 1; if (f._st % 38 === 0) KC.sfx('stepBare'); } if (f.landed) { f.landed = false; KC.sfx('land'); KC.game.particles.dust(f.x, 0, 2, 3); } if (f.tech && f.t === 2 && !f.tech.util) { KC.sfx(f.tech.height === 'high' || f.tech.spin ? 'whooshH' : 'whooshL'); if (this.d.mode !== 'attract' || true) { if (!this._k) this._k = 0; } } } },
  hints(dt) {
    if (!this.d.hints || KC.game.settings.hints === false) { this.hud.hint = null; return; }
    this.hintT += dt; this.hud.hint = KC.HINTS[Math.floor(this.hintT / 7) % KC.HINTS.length];
  },
  draw(r) {
    const g = KC.game, b = this.bout;
    this.stage.draw(r);
    for (const f of b.f) f.draw(r, {});
    KC.drawReferee && KC.drawReferee(r, b, this.stage);
    if (KC.dev.showBoxes) this.drawBoxes(r);
    this.hud.draw(r);
    if (KC.dev.showFrame || this.mode === 'freeSpar') this.drawFrame(r);
    if (KC.dev.aiThoughts) r.overlay(gg => { this.ais.forEach((a, i) => { if (a) KC.text(gg, 'AI' + (i + 1) + ' L' + a.level + ' ' + a.thought, 8, 56 + i * 10, '#9ad8ff'); }); });
    if (KC.dev.open) KC.drawDev(r, this);
    else if (this.d.prompts !== false) this.drawPrompt(r);
    KC.overlayDraw(r);
    if (this.d.draw) this.d.draw(r, this);
  },
  drawPrompt(r) {
    const b = this.bout; if (b.phase === 'fight' || this.mode === 'attract' || SESSION) return;
    if (b.phase === 'award') KC.promptBar(r, [['start', 'SKIP']]);
  },
  drawBoxes(r) {
    const b = this.bout;
    r.overlay(g => { for (const f of b.f) { const [sx, sy] = r.w(f.x, 0, f.z), w = 9, h = f.crouching ? 30 : 64; px.rect(g, Math.round(sx - w), Math.round(sy - h), w * 2, 1, '#44ff88'); px.rect(g, Math.round(sx - w), Math.round(sy), w * 2, 1, '#44ff88'); px.rect(g, Math.round(sx - w), Math.round(sy - h), 1, h, '#44ff88'); px.rect(g, Math.round(sx + w), Math.round(sy - h), 1, h, '#44ff88');
      if (f.tech && f.phase === 'active' && !f.tech.util) { const reach = f.tech.reach[1] * f.stats.reach * T().reachScale, x1 = f.x + f.face * (PUSH / 2 + reach), [ex, ey] = r.w(x1, 0, f.tech.height === 'high' ? 54 : f.tech.height === 'low' ? 8 : 34); px.disc(g, Math.round(ex), Math.round(ey), 4, '#ff4466'); } } });
  },
  drawFrame(r) {
    const f = this.bout.f[0], l = f.lastInfo || {}; const t = f.tech || KC.TECHS[f.lastTech];
    r.overlay(g => { if (!t) return; const fr = f.fr || t.f.map(v => v * 2); KC.text(g, t.name + '  S' + (fr[0] >> 1) + ' A' + (fr[1] >> 1) + ' R' + (fr[2] >> 1) + '  REACH ' + t.reach.join('-') + '  PTS ' + t.pts.join('-'), 8, r.H - 28, '#ffd060'); });
  }
};
