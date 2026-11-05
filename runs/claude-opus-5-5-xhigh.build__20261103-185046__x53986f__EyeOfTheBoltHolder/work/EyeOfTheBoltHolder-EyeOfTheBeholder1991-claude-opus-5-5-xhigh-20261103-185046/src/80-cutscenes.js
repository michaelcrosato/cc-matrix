/* =====================================================================================
 * 80-cutscenes: the stages, small 3D sets built at boot (A the Council Hall at night, B the Drain-gate (the title's too),
 * D the city square at dawn; C is the Vault itself), and the cutscene runner: lines in the dialogue box, the camera moved
 * by script, a sting or a shake on a beat. Any button speeds the text; holding Options or Esc for a second skips.
 * ===================================================================================== */
Object.assign(VIEW_THINGS, {
  table(p) { p.box(0, 0, 14, 60, 18, 3, '#5a3a22').box(0, 0, 15.8, 58, 16, .6, '#7a5a3a'); for (const [x, y] of [[-27, -7], [27, -7], [-27, 7], [27, 7]]) p.box(x, y, 7, 3, 3, 14, '#3a2414'); p.ball(-12, 2, 17, 2, 2, 1.4, '#c8a050').box(10, -3, 16.6, 8, 6, .4, '#e8dcb8').tube(20, 4, 16, 20, 4, 22, .5, '#e8e4d8').glow(20, 4, 23, .8, '#ffd8a0'); },
  bigBolt(p, t) { const k = clamp(t.k || 0, 0, 1); p.box(-24 + k * 24, 0, 30, 30, 5, 5, '#7a7e8a').box(-38 + k * 24, 0, 30, 3, 7, 9, '#5a5e6a').box(0, 0, 30, 4, 7, 9, '#3a3e48'); },
  houseDoor(p, t) { const o = clamp(t.open || 0, 0, 1), b = o * 1.6; p.box(-9, 0, 15, 2, 4, 30, '#5a4030').box(9, 0, 15, 2, 4, 30, '#5a4030').box(0, 0, 31, 20, 4, 2, '#5a4030'); p.box(-8 + Math.cos(b) * 8, Math.sin(b) * 8, 14, 16, 2, 28, t.color || '#7a4a2a', b); p.ball(-8 + Math.cos(b) * 13, Math.sin(b) * 13 + 1, 14, .8, .8, .8, '#d8b04a'); }
});
if (W3) Object.assign(W3.THINGS, VIEW_THINGS);
const STAGE_LEVELS = {
  A: { rows: ['################', '#t............t#', '#..P........P..#', '#..............#', '#..............#', '#..P........P..#', '#t............t#', '################'],
    legend: { '#': { wall: 48, side: 'block', color: '#4a4040', top: '#3a3030' }, P: { pillar: 52, color: '#5a5050' }, '.': {}, t: { torch: true } }, ground: 'flagstone' },
  B: { rows: ['##############', '######..######', '######..######', '####t#..#t####', '#............#', '#............#', '#............#', '#............#', '#............#', '#............#', '##############'],
    legend: { '#': { wall: 48, side: 'brick', color: '#4a5048', top: '#2a302c' }, '.': {}, t: { torch: true } }, ground: 'flagstone' },
  D: { rows: ['######################', '#....................#', '#.HHH...HHH....HHH...#', '#.HHH...HHH....HHH...#', '#....................#', '#....................#', '#....................#', '#....................#', '######################'],
    legend: { '#': { wall: 24, side: 'block', color: '#8a7a6a', top: '#6a5a4a' }, H: { wall: 44, side: 'planks', color: '#8a6a4a', top: '#6a3a2a' }, '.': {} }, ground: 'flagstone' }
};
const Stages = {
  w: {}, cast: {}, t: 0, boltT: 0, title: null,
  build(id) {
    const L = STAGE_LEVELS[id];
    const o = id === 'A' ? { ambient: ['#5a4a6a', '#1a1418', 2.4], fog: { color: '#05040a', near: 60, far: 260 }, sky: '#05040a', torchColor: '#ffa860' }
      : id === 'B' ? { ambient: ['#3a4a6a', '#141820', 2.2], fog: { color: '#04060c', near: 50, far: 220 }, sky: '#04060c', torchColor: '#ffb070' }
        : { ambient: ['#ffc8a0', '#4a4060', 3.2], fog: { color: '#e8a888', near: 160, far: 520 }, sky: ['#3a4a8a', '#ffb888'], sun: { color: '#ffd8b0', intensity: 2.2, dir: [-.5, .4, -.6], shadow: true } };
    const world = new W3(game, Object.assign({ level: { rows: L.rows, legend: L.legend, ground: L.ground, side: 'block' }, look: 'card', torchLights: 4, torchShadows: 1, lights: 3, camera: { mode: 'fixed' } }, o));
    const S0 = { world, mobs: [], things: {} };
    const eye = world.hero({ x: 64, y: 64, r: 4, visible: false }); world.camera.follow(eye); world.camera.set('fixed'); S0.eye = eye;
    const mob = (look, x, y, facing) => { const a = world.mob({ x, y, r: 4, half: 6, rig: B.rigOf(look), facing }); a.setSolid(false); S0.mobs.push(a); return a; };
    if (id === 'A') { world.thing('table', 128, 64, 0, {}); S0.strake = mob(B.PEOPLE.strake.look, 112, 88, -PI / 2); S0.lintel = mob(B.PEOPLE.lintel.look, 146, 88, -PI / 2); for (const [x, y] of [[40, 18], [216, 18]]) world.thing('banner', x, y, 0, { yaw: 0, color: '#2a3a6a' }); }
    if (id === 'B') { S0.gate = world.thing('door', 112, 64, 0, { w: 32, h: 46, color: '#26242c', frame: '#4a5048' }); S0.bolt = world.thing('bigBolt', 112, 63, 0, { yaw: 0, k: 0 }); B.PREMADE.forEach((d, i) => { S0['p' + i] = mob(d.look, 84 + i * 18, 92 + (i % 2) * 6, -PI / 2); }); world.thing('grate', 56, 66, 0, { yaw: PI }); world.thing('chain', 168, 66, 0, { yaw: PI }); }
    if (id === 'D') { S0.doors = []; for (const x of [2, 8, 15]) S0.doors.push(world.thing('houseDoor', (x + 1.5) * 16, 4 * 16, 0, { yaw: 0, open: 0, color: ['#6a3a2a', '#3a4a6a', '#5a6a3a'][S0.doors.length] })); S0.strake = mob(B.PEOPLE.strake.look, 156, 70, PI / 2); S0.lintel = mob(B.PEOPLE.lintel.look, 178, 72, PI / 2); B.PREMADE.forEach((d, i) => { S0['p' + i] = mob(d.look, 132 + i * 16, 92 + (i % 2) * 4, -PI / 2); }); }
    this.w[id] = S0; return S0;
  },
  /** the title: the Drain-gate at night, the camera creeping toward the grate, the bolt slamming home every 12 s */
  enterTitle() { this.t = 0; this.boltT = 0; },
  titleStep(dt) {
    this.t += dt; const S0 = this.w.B; if (!S0) return;
    this.boltT += dt; if (this.boltT > 12) { this.boltT = 0; game.shake(3); Sound.sfx('boltSlam'); }
    S0.bolt.k = this.boltT < .5 ? this.boltT * 2 : this.boltT > 10 ? 1 - (this.boltT - 10) / 2 : 1; S0.gate.open = 0;
    S0.world.step(dt);
  },
  camB(t) { const u = clamp(t / 40, 0, 1); return { x: 112 + Math.sin(t * .1) * 6, y: 156 - u * 30, z: 34, yaw: -PI / 2, pitch: -.03, fov: 66 }; },
  drawTitle(r) { const S0 = this.w.B; if (!S0) return; S0.world.camera.fixed = this.camB(this.t); S0.eye.place(112, 120, 0); S0.world.draw(r); },
  drawEndingBack(r) { const S0 = this.w.D; if (!S0) return; this.t += 1 / 60; S0.world.camera.fixed = { x: 168 + Math.sin(this.t * .1) * 24, y: 136, z: 44, yaw: -PI / 2 - .1, pitch: -.12, fov: 72 }; S0.eye.place(176, 100, 0); for (const d of S0.doors) d.open = 1; S0.world.step(1 / 60); S0.world.draw(r); }
};
B.Stages = Stages;
/** the cutscene scene: { id: 'intro' | 'ending', then } */
const scenesCut = {};
scenesCut.cutscene = {
  input: KEYS,
  enter(d) { this.d = d || { id: 'intro' }; this.lines = this.d.id === 'ending' ? B.ENDING : B.INTRO; this.i = -1; this.t = 0; this.lt = 0; this.skipT = 0; this.fxT = 0; this.next(); Sound.music(this.d.id === 'ending' ? 'ending' : 'title'); UI.closeAll(); game.timeScale = 1; },
  next() {
    this.i++; this.lt = 0; this.fxT = 0;
    const L = this.lines[this.i]; if (!L) { this.finish(); return; }
    const [who, text, stage, fx] = L; this.stage = stage; this.fx = fx || null;
    TalkBox.set(who, text, this.d.id + this.i);
    if (fx === 'bolt') { Sound.sfx('boltSlam'); Sound.sfx('doorShut'); game.shake(5); }
    if (fx === 'blink') Sound.sfx('hum', { pitch: .5 });
    if (fx === 'doors') Sound.sting('victory');
    if (fx === 'knock') for (let k = 0; k < 3; k++) game.after(.6 + k * .7, () => Sound.sfx('boltSlam', { pitch: .5 }));
  },
  finish() { if (this.done) return; this.done = true; const d = this.d; this.done = false; if (d.id === 'ending') game.go(d.then === 'play' ? 'play' : 'credits'); else game.go('play', d.then === 'play' ? { resume: true } : { newGame: true }); },
  update(dt) {
    this.t += dt; this.lt += dt; this.fxT += dt;
    const I = game.input;
    if (I.down('pause') || I.held.has('Pad9')) { this.skipT += dt; if (this.skipT > 1) { this.skipT = 0; this.finish(); return; } } else this.skipT = 0;
    const r = TalkBox.update(dt, null);
    if (r === 'next' || (B.Attract.on && this.lt > 4)) this.next();
    const st = Stages.w[this.stage];
    if (st) { st.world.step(dt); if (this.stage === 'D') for (const d of st.doors) d.open = this.fx === 'doors' ? clamp(this.fxT / 1.5, 0, 1) : this.i > 2 ? 1 : 0; if (this.stage === 'B') { st.bolt.k = this.fx === 'bolt' ? clamp(this.fxT * 2, 0, 1) : this.i > 7 ? 1 : 0; st.gate.open = this.i === 6 ? clamp(this.fxT, 0, 1) * (this.fxT < 3 ? 1 : 0) : 0; } }
  },
  draw(r) {
    UI.W = r.W; UI.H = r.H;
    const st = Stages.w[this.stage], t = this.t;
    if (st) {
      if (this.stage === 'A') st.world.camera.fixed = { x: 70 + Math.min(this.t * 4, 110), y: 30, z: 34, yaw: PI / 2 - .1 + Math.sin(t * .2) * .05, pitch: -.1, fov: 64 };
      if (this.stage === 'B') st.world.camera.fixed = { x: 112, y: 168 - Math.min(this.lt * 6, 40), z: 30 + (this.fx === 'bolt' && this.fxT < .6 ? Math.sin(this.fxT * 40) * 1.5 : 0), yaw: -PI / 2, pitch: .02, fov: 64 };
      if (this.stage === 'D') st.world.camera.fixed = { x: 168 + Math.sin(t * .1) * 14, y: 136, z: 40, yaw: -PI / 2 - .05, pitch: -.1, fov: 70 };
      st.eye.place(st.world.camera.fixed.x, st.world.camera.fixed.y - 30, 0); st.world.draw(r);
    } else if (this.stage === 'C' && B.view.worlds.f4) {
      B.view.enter('f4'); const Wv = B.view.worlds.f4; Wv.world.camera.fixed = { x: mid(6), y: mid(5) + 10, z: 26, yaw: -PI / 2, pitch: .1, fov: 70 }; Wv.eyeHero.place(mid(6), mid(5), 0); if (S && S.boss) S.boss.dead = Math.max(S.boss.dead, 1.6); B.view.lightsFrame(Wv); Wv.world.step(1 / 60); Wv.world.draw(r);
    }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!st && this.stage !== 'C') px.rect(g, 0, 0, W, H, '#000000');
      if (this.fx === 'blink') { const k = clamp(Math.min(this.fxT - .6, 1.2 - this.fxT) * 4, 0, 1); if (k > 0) { px.ell ? px.ell(g, W / 2, H * .4, 26, 10 * k, '#e8a030') : px.disc(g, W / 2, H * .4, 10 * k, '#e8a030'); px.disc(g, W / 2, H * .4, 4 * k, '#0a0806'); } }
      const bh = Math.round(H * .1); px.rect(g, 0, 0, W, bh, '#000000'); px.rect(g, 0, H - bh, W, bh, '#000000');
      TalkBox.draw(g, r, null, { y: H - bh - 62 });
      TXT(g, 'Hold', 6, 6, '#8a7e68'); const gw = glyph(g, 'pause', 30, 4); TXT(g, 'to skip', 34 + gw, 6, '#8a7e68');
      if (this.skipT > 0) E.ui.bar(g, 6, 17, 70, 2, this.skipT, COL.focus);
    });
  }
};
B.scenesCut = scenesCut;
