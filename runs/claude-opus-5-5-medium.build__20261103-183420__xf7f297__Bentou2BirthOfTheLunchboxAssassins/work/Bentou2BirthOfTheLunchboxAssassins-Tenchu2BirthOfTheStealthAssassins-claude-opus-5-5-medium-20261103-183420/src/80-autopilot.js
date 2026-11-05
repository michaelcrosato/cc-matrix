/* 80-autopilot: an intent producer that runs beats (teleport, go to, wait, press, hold, grapple, use a tool, Silent Cut
 * a guard, fight), shared by attract mode and the playthrough test. It never touches game.input, so its activity can't
 * count as the player's. Each beat times out (8 s by default) and the next one runs, so a loop can't get stuck.
 * Then the attract director: seven vignettes, looping, any input returns to the title. */
B.Autopilot = {
  start(M, beats) { M.ap = { beats: beats.slice(), i: 0, t: 0, log: [], timeouts: 0 }; },
  done(M) { return !M.ap || M.ap.i >= M.ap.beats.length; },
  next(M, timedOut) { const ap = M.ap; if (timedOut) { ap.timeouts++; ap.log.push('timeout:' + ap.i); } ap.i++; ap.t = 0; ap.st = null; },
  goTo(M, I, tx, ty, gait, near = 6, tz) {
    const h = M.hero, d = Math.hypot(tx - h.x, ty - h.y); if (d < near && (tz === undefined || Math.abs(h.z - tz) < 10)) return true;
    const W = M.world, key = Math.floor(tx / 8) + ',' + Math.floor(ty / 8);
    if (!M.ap.flow || M.ap.flowKey !== key) { M.ap.flow = new E.FlowField(W.map, { climb: 30, drop: 48, jump: 60 }); M.ap.flow.update(tx, ty); M.ap.flowKey = key; }
    const nx = M.ap.flow.next(h.x, h.y), gx = nx ? nx.x : tx, gy = nx ? nx.y : ty, l = Math.hypot(gx - h.x, gy - h.y) || 1;
    I.move = [(gx - h.x) / l, (gy - h.y) / l]; if (gait === 'walk') I.move = I.move.map(v => v * .5); if (gait === 'sprint') I.sprint = true;
    if (gait === 'crouch' && !h.crouch) I.crouchPressed = true; if (gait !== 'crouch' && h.crouch && !h.swim) I.crouchPressed = true;
    if (nx && h.onGround && (nx.kind === 'climb' || nx.kind === 'jump') && nx.edge < h.r + 5) I.jumpPressed = true;
    return false;
  },
  intent(M, dt) {
    const I = B.emptyIntent(), h = M.hero, ap = M.ap; if (!ap || !h || ap.i >= ap.beats.length) return I;
    const b = ap.beats[ap.i]; ap.t += dt; const max = b.max || 8;
    if (ap.t > max) { this.next(M, true); return I; }
    if (b.at) { Object.assign(h, { x: cc(b.at[0]), y: cc(b.at[1]), z: b.at[2] || 0, vx: 0, vy: 0, vz: 0, action: null, onGround: true }); if (b.facing !== undefined) h.facing = b.facing * Math.PI / 180; if (b.crouch !== undefined) h.crouch = b.crouch; B.game.cam.snap = true; this.next(M); return I; }
    if (b.fn) { b.fn(M); this.next(M); return I; }
    if (b.wait !== undefined) { if (b.crouch) { if (!h.crouch) I.crouchPressed = true; } if (b.focus) I.focusDown = true; if (ap.t >= b.wait) this.next(M); return I; }
    if (b.until) { if (b.until(M)) this.next(M); return I; }
    if (b.press) { I[b.press] = true; if (b.press === 'grapplePressed') I.grappleDown = true; this.next(M); return I; }
    if (b.hold) { I[b.hold] = true; if (ap.t >= (b.s || .5)) this.next(M); return I; }
    if (b.goto) { if (this.goTo(M, I, cc(b.goto[0]), cc(b.goto[1]), b.gait || 'run', b.near || 6, b.z)) this.next(M); return I; }
    if (b.face) { h.facing = b.face * Math.PI / 180; this.next(M); return I; }
    if (b.grapple) {
      const [gx, gy, gz] = b.grapple, x = cc(gx), y = cc(gy); const L = M.world.anchorsNear(h, B.T('grappleRange') + 40, 120); let best = null, bd = 1e9;
      for (const a of L) { const d = Math.hypot(a.x - x, a.y - y) + Math.abs(a.z - (gz || a.z)); if (d < bd) { bd = d; best = a; } }
      if (!ap.st) { if (!best) { this.next(M, true); return I; } ap.st = { a: best, k: 0 }; }
      ap.st.k++; I.grappleTarget = ap.st.a; if (ap.st.k === 1) { I.grapplePressed = true; I.grappleDown = true; } else { I.grappleReleased = true; }
      if (ap.st.k >= 2 && !(h.action && h.action.name === 'grapple')) { if (ap.st.k > 3) this.next(M); }
      return I;
    }
    if (b.use) {
      if (!ap.st) { const k = M.bento.slots.findIndex(s => s && s.tool === b.use && s.n > 0); if (k < 0) { B.Bento.add(M, b.use, 1); } ap.st = { k: M.bento.slots.findIndex(s => s && s.tool === b.use && s.n > 0) }; I.toolSlot = ap.st.k + 1; return I; }
      I.usePressed = true; if (b.target) I.aimPoint = { x: cc(b.target[0]), y: cc(b.target[1]) }; this.next(M); return I;
    }
    if (b.cut) {
      const g = M.guards.find(q => q.id === b.cut); if (!g || !g.alive) { if (!g || !(h.action && h.action.name === 'silentCut')) this.next(M); return I; }
      const c = B.cutCandidate(h, M); if (c && c.g === g) { I.attackPressed = true; return I; }
      const behind = { x: g.x - Math.cos(g.facing) * 12, y: g.y - Math.sin(g.facing) * 12 };
      if (b.from === 'water' || h.swim) { this.goTo(M, I, g.x, g.y, 'crouch', 4); return I; }
      if (b.from === 'above') { I.move = [0, 0]; return I; }
      this.goTo(M, I, behind.x, behind.y, b.gait || 'crouch', 3); return I;
    }
    if (b.fight) {
      const foes = M.guards.filter(q => q.alive && !q.civilian && !q.dying).concat(M.bosses.filter(q => q.alive && q.active)), f = foes.sort((p, q) => dist2(p, h) - dist2(q, h))[0];
      if (!f || ap.t > b.fight) { this.next(M); return I; }
      const d = Math.hypot(f.x - h.x, f.y - h.y), wind = f.move ? f.move.phase === 'wind' : f.swing && f.swing.phase === 'wind';
      if (f.staggerT > 0 && d < 28) { I.attackPressed = true; return I; }
      if (wind && d < 40) { if (f.swing && f.swing.u > .7 || (f.move && f.move.S && f.move.S.parry && f.move.t > f.move.S.wind * .7)) I.blockPressed = true; I.blockDown = true; if (f.move && !f.move.S.parry && d < 30) { I.jumpPressed = true; const a = Math.atan2(h.y - f.y, h.x - f.x) + 1.2; I.move = [Math.cos(a), Math.sin(a)]; } return I; }
      if (d > 20) { this.goTo(M, I, f.x, f.y, 'run', 16); return I; }
      h.facing = Math.atan2(f.y - h.y, f.x - h.x); if (Math.floor(ap.t * 4) % 2 === 0) I.attackPressed = true; return I;
    }
    if (b.say) { M.say(b.say[0], b.say[1]); this.next(M); return I; }
    this.next(M); return I;
  }
};
/* ---- the attract director ---- */
const keepOnly = (M, ids) => { M.guards = M.guards.filter(g => ids.includes(g.id)); };
B.VIGNETTES = [
  { name: 'Rooftops', level: 'm1', cap: 24, setup(M) { keepOnly(M, ['guardB']); M.guards.push(new Guard({ id: 'guardB', type: 'ashigaru', at: [36.5, 33], facing: 90, mode: 'post', lantern: true }, M)); },
    beats: [{ at: [11, 32, 40], facing: 0 }, { wait: .6 }, { goto: [20, 33], gait: 'run', z: 40 }, { goto: [26, 32.5], gait: 'run', z: 40 }, { goto: [28, 32.5], gait: 'walk', near: 4 }, { grapple: [32, 33, 64] }, { wait: 1.2 }, { goto: [35.3, 33], gait: 'crouch', near: 3 }, { wait: .4, crouch: true }, { cut: 'guardB', from: 'above', max: 3 }, { wait: 2 }] },
  { name: 'Silent Cut', level: 'm1', cap: 22, setup(M) { keepOnly(M, ['ash1']); const g = M.guards[0]; Object.assign(g, { x: cc(9), y: cc(36.5) }); g.route = [{ x: cc(22), y: cc(36.5), wait: 0, look: null }]; g.ri = 0; },
    beats: [{ at: [6, 36.5, 0], facing: 0, crouch: true }, { wait: 1.5, crouch: true, focus: true }, { cut: 'ash1', gait: 'crouch', max: 14 }, { wait: 2.2 }] },
  { name: 'Rice for the Hungry', level: 'm1', cap: 24, setup(M) { keepOnly(M, ['ash6']); const g = M.guards[0]; Object.assign(g, { x: cc(26), y: cc(11.5), facing: 0, mode: 'post' }); g.home = { x: g.x, y: g.y, z: 0, facing: 0 }; },
    beats: [{ at: [33, 13.2, 0], facing: 180, crouch: true }, { wait: .5 }, { use: 'poison', target: [29.5, 12.2] }, { until: M => !M.guards[0].alive, max: 12 }, { wait: 1 }, { goto: [29.5, 12.2], gait: 'run', near: 10 }, { press: 'interactPressed' }, { goto: [32.5, 13], gait: 'walk', near: 4 }, { press: 'interactPressed' }, { wait: 2 }] },
  { name: 'The Moat', level: 'm2', cap: 22, setup(M) { keepOnly(M, ['arc2', 'pg']); M.guards.push(new Guard({ id: 'pg', type: 'ashigaru', faction: 'redlantern', at: [25, 31.2], facing: 90, mode: 'post', lantern: true }, M)); },
    beats: [{ at: [17, 24, 0], facing: 0 }, { goto: [21, 27], gait: 'run' }, { wait: .2, crouch: true }, { goto: [24.8, 30.2], gait: 'crouch', near: 4 }, { cut: 'pg', from: 'water', max: 6 }, { wait: 2.5 }] },
  { name: 'Smoke and Steel', level: 'm2', cap: 26, setup(M) { keepOnly(M, ['ash4', 'ash5', 'sam1']); for (const g of M.guards) g.mind.level = 0; },
    beats: [{ at: [43, 31, 0], facing: 270 }, { wait: 2.5 }, { until: M => M.guards.some(g => g.mind.state === 'alert'), max: 4 }, { use: 'smoke', target: [43, 28.5] }, { goto: [40, 33], gait: 'sprint' }, { wait: 2 }, { fight: 12 }, { wait: 1 }] },
  { name: 'Oni on the Roof', level: 'm3', cap: 26, setup(M) { keepOnly(M, []); const b = M.bosses[0]; b.hp = b.hpMax * .52; },
    beats: [{ at: [15, 33.5, 160], facing: 0 }, { fn: M => { M.startBoss('kurogane'); M.cine = null; M.bosses[0].start(); } }, { fight: 9 }, { fn: M => { const b = M.bosses[0]; if (b.phase === 1) b.enterPhase2(); } }, { fight: 9 }, { fn: M => { const b = M.bosses[0]; if (b.alive) b.takeHit(M.hero, 9999, { pierce: true }); } }, { wait: 2.5 }] },
  { name: 'Report', report: true, cap: 7 }
];
B.scenes.attract = {
  view: 'iso', views: ['iso'], res: 'ps1', expand: true, input: B.INPUT, touch: [], camera: { zoom: [1, 1.4], start: 1.2, rotate: false, wheel: false },
  enter(d) { this.vi = (d && d.start) || 0; this.loops = 0; this.visited = new Set(); this.t = 0; this.inputT = 0; B.idle = 0; this.startVignette(); },
  exit() { const G = B.game; G.timeScale = 1; G.weather = null; G.lights.enabled = false; if (B.mission === this.M) B.mission = null; this.M = null; },
  startVignette() {
    const V = B.VIGNETTES[this.vi], G = B.game; this.t = 0; this.visited.add(V.name); G.timeScale = 1;
    if (V.report) { this.M = null; G.lights.enabled = false; G.weather = null; B.music.play('results'); this.fake = { total: 2840, rank: 'Grand Kaiseki' }; return; }
    const M = this.M = new Mission(V.level, { mode: 'attract', auto: true, character: this.vi % 2 ? 'kaede' : 'sojiro', cheats: { god: true, infTools: true }, missionId: V.level });
    M.objectives = []; M.triggers = []; M.timer = null; V.setup(M); B.setupMissionView(M); G.setZoom(1.2); B.music.play(V.level === 'm3' ? 'boss' : M.level.music);
    B.Autopilot.start(M, V.beats);
  },
  update(dt) {
    const G = B.game, I = G.input; this.t += dt / Math.max(.1, G.timeScale);
    this.inputT += dt;
    if (this.inputT > .4 && (B.anyInput || I.anyPressed() || B.padActive())) { B.anyInput = false; G.go('title'); return; }
    if (this.inputT <= .4) B.anyInput = false;
    const V = B.VIGNETTES[this.vi];
    if (this.M) { const M = this.M; const Ii = B.Autopilot.intent(M, dt); B.cameraUpdate(M, dt, Ii); M.update(dt, Ii); }
    if (this.t > V.cap || (this.M && B.Autopilot.done(this.M) && this.t > 3)) { this.vi = (this.vi + 1) % B.VIGNETTES.length; if (this.vi === 0) this.loops++; this.startVignette(); }
  },
  draw(r) {
    const V = B.VIGNETTES[this.vi];
    if (this.M) B.drawMission(r, this.M, { reveal: true });
    else { r.sky(['#1a120c', '#241810', '#1a120c']); }
    r.overlay(g => {
      if (V.report) {
        const w = Math.min(280, r.W - 40), x0 = Math.round(r.W / 2 - w / 2); px.rect(g, x0, 20, w, r.H - 50, '#f4ead5'); px.rect(g, x0 - 4, 16, w + 8, 6, '#6a3a1a'); px.rect(g, x0 - 4, r.H - 32, w + 8, 6, '#6a3a1a');
        E.font.text(g, 'Moon over Kokaku', r.W / 2, 28, '#1a1418', { align: 'center', outline: false });
        [['Silent Cuts', 14], ['Times detected', 0], ['Civilians harmed', 0], ['Optional tasks', 1]].forEach(([k, v], i) => { E.font.text(g, k, x0 + 16, 46 + i * 12, '#3a2a20', { outline: false }); E.font.text(g, String(v), x0 + w - 80, 46 + i * 12, '#1a1418', { align: 'right', outline: false }); });
        E.font.text(g, 'SCORE ' + Math.round(this.fake.total * Math.min(1, this.t / 1.5)), x0 + 16, 100, '#1a1418', { outline: false, scale: 2 });
        if (this.t > 2) { const sx = x0 + w - 50, sy = 70; px.rect(g, sx - 22, sy - 22, 44, 44, '#c8302a'); px.rect(g, sx - 19, sy - 19, 38, 38, '#f4ead5'); px.rect(g, sx - 17, sy - 17, 34, 34, '#c8302a'); E.font.text(g, 'GRAND', sx, sy - 8, '#f4ead5', { align: 'center', outline: false }); E.font.text(g, 'KAISEKI', sx, sy + 2, '#f4ead5', { align: 'center', outline: false }); }
        if (this.t > 3.2) { px.rect(g, 0, 0, r.W, r.H, '#05060f'); E.font.title(g, 'BENTOU 2', r.W / 2, Math.round(r.H * .35), { align: 'center', scale: 4, colors: ['#fff4d8', '#e8b04a', '#d8402a', '#8a1c1c'], depth: 3 }); E.font.text(g, 'Birth of the Lunchbox Assassins', r.W / 2, Math.round(r.H * .35) + 36, '#f4ead5', { align: 'center', outline: false }); }
      }
      E.font.title(g, 'BENTOU 2', 6, 6, { scale: 1, colors: ['#fff4d8', '#e8b04a'], depth: 1 });
      E.font.text(g, 'DEMO PLAY', r.W - 6, 26, '#e8b04a', { align: 'right', outline: false, shadow: '#000' });
      if (!V.report) E.font.text(g, V.name.toUpperCase(), r.W - 6, 36, '#b8a890', { align: 'right', outline: false, shadow: '#000' });
      if (Math.floor(B.game.real * 2) % 2 === 0) B.rich(g, B.touchOnly ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', r.W / 2, r.H - 16, '#f4ead5', { align: 'center' });
    });
  }
};
