/* CUTSCENES: one small 3D stage built at boot with four sets: A the Council Hall at night, B the Drain-gate (also the
 * title's backdrop), C the Vault after the battle, D the city square at dawn. The intro and the ending play their lines
 * over it with the babble voices; any button speeds the text, holding Options or Esc for a second skips. */
B.STAGE_LEVEL = (() => {
  // A the Council Hall (x 1-13), B the Drain-gate (x 16-27), C the Vault (x 30-41), D the city square at dawn (x 44-62)
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let r = '';
    for (let x = 0; x < 64; x++) {
      const inA = x >= 1 && x <= 13 && y >= 1 && y <= 9, inB = x >= 16 && x <= 27 && y >= 1 && y <= 9, inC = x >= 30 && x <= 41 && y >= 1 && y <= 9, inD = x >= 44 && x <= 62 && y >= 1 && y <= 14;
      let c = inA || inB || inC || inD ? '.' : '#';
      if (inA && (x === 3 || x === 11) && y % 2 === 0 && y < 9) c = 'P';
      if (inC && (x === 32 || x === 39) && (y === 3 || y === 6)) c = 'P';
      if ((inA || inB || inC) && (x === 1 || x === 13 || x === 16 || x === 27 || x === 30 || x === 41) && (y === 3 || y === 7)) c = 't';
      r += c;
    }
    rows.push(r);
  }
  return rows;
})();
B.Stage = class {
  constructor(game) {
    this.game = game; this.t = 0; this.area = 'B'; this.bolt = 0; this.boltT = 0; this.blink = 0; this.slam = 0;
    const W3c = E.World3D;
    this.world = new W3c(game, { level: { rows: B.STAGE_LEVEL, legend: { '#': { wall: 48, side: 'block', color: '#4a4048', line: '#2a2228' }, P: { pillar: 48 }, t: { torch: true } }, ground: 'flagstone', colors: { base: '#4a4440', dark: '#2e2a28', light: '#5e5650' } },
      look: 'card', res: 'pixels', torchLights: 6, torchShadows: 1, torchPower: 18, lights: 4, ambient: ['#8a7a8a', '#2a2428', 3.0], fog: { color: '#08060a', near: 80, far: 380 }, sky: '#08060a', camera: { mode: 'fixed' }, onDraw: w => this.onDraw(w) });
    const mk = (rig, x, y, face) => { const a = this.world.mob({ x: x * 16, y: y * 16, rig, r: 4, half: 6 }); a.setSolid(false); a.facing = face; a.data.home = [x * 16, y * 16]; a.data.face = face; return a; };
    const rig = id => new E.Humanoid(Object.assign({ speedRef: 60 }, B.SPEAKERS[id].rig));
    this.strake = mk(rig('strake'), 5.6, 4.6, PI / 2); this.lintel = mk(rig('lintel'), 8.6, 4.6, PI / 2 - .2);
    this.party = B.PREMADE.map((t, i) => mk(B.memberRig(B.makeMember(t, i)), 19.2 + i * 1.9, 5.2, -PI / 2));
    this.dStrake = mk(rig('strake'), 49, 7.4, PI / 2 + .3); this.dLintel = mk(rig('lintel'), 57.5, 7.4, PI / 2 - .3);
    this.dParty = B.PREMADE.map((t, i) => mk(B.memberRig(B.makeMember(t, 10 + i)), 50.8 + i * 1.8, 8, PI / 2));
    this.townsfolk = [['#6a8a4a', '#d8a888', 'short'], ['#8a4a6a', '#c89070', 'long'], ['#4a5a8a', '#e0b090', 'ponytail'], ['#8a6a3a', '#b88060', 'bald']].map(([cl, sk, hair], i) => mk(new E.Humanoid({ speedRef: 60, size: 1.1, hair, outfit: i % 2 ? 'robe' : 'tunic', weapon: null, colors: { cloth: cl, skin: sk, hair: '#4a3020', pants: '#3a3028' } }), [46.5, 60, 47.5, 59][i], [5, 5.5, 11.5, 11][i], [.6, 2.4, -.7, -2.2][i]));
    this.glow = this.world.light({ color: '#ffd8a0', reach: 220, power: 7 }); this.dawn = this.world.light({ color: '#ffc890', reach: 520, power: 22 }); this.eye = this.world.light({ color: '#ffb040', reach: 220, power: 0 }); this.fire = this.world.light({ color: '#ff9a4a', reach: 160, power: 9, flicker: .4 });
    this.world.prepare();
  }
  /** the chosen party takes the places of the premade four on the stages */
  setParty(members) { members.slice(0, 4).forEach((m, i) => { const r = B.memberRig(m); if (this.party[i]) this.party[i].rig = r; if (this.dParty[i]) this.dParty[i].rig = B.memberRig(Object.assign({}, m, { id: m.id + '_d' })); }); }
  show(area) { this.area = area; this.t = 0; }
  update(dt, mode) {
    this.t += dt; this.boltT += dt; this.shotT = (this.shotT || 0) + dt; this.slam = Math.max(0, this.slam - dt); this.blink = Math.max(0, this.blink - dt);
    if (mode === 'title' && this.boltT > 12) { this.boltT = 0; this.bolt = 0; this.slamNow(); }
    this.bolt = Math.min(1, this.bolt + dt * 2);
    const t = this.t;
    for (const a of [...this.party, ...this.dParty, this.strake, this.lintel, this.dStrake, this.dLintel, ...this.townsfolk]) { a.place(a.data.home[0], a.data.home[1]); a.facing = a.data.face; a.anim = { pose: null }; }
    // the hall: Strake leans on the table as she speaks, Lintel turns to the party; the square: the party cheers, the people wave
    if (this.area === 'A') { this.strake.anim = { pose: t % 6 < 3 ? 'hips' : null }; this.lintel.anim = { pose: t % 7 > 4 ? 'cast' : null }; }
    this.party.forEach((a, i) => { a.anim = { pose: this.area === 'B' && this.t < 3 && i === 0 ? 'guard' : null }; });
    this.dParty.forEach((a, i) => { a.anim = { pose: this.area === 'D' && t > 2.5 + i * .3 ? 'cheer' : null }; });
    this.townsfolk.forEach((a, i) => { a.anim = { pose: this.area === 'D' && t > 3 + i * .4 ? 'wave' : null }; });
    this.dStrake.anim = { pose: this.area === 'D' && t > 5 ? 'hips' : null };
    this.world.step(dt);
  }
  slamNow() { this.bolt = 0; this.slam = .6; this.game.shake(6); this.game.audio.sfx('boltSlam'); }
  /** a close-up on whoever speaks (Strake or Lintel), eased in; narration keeps the wide shot */
  speakerShot() {
    const sp = this.speaker, A = this.area, who = sp === 'strake' ? (A === 'A' ? this.strake : this.dStrake) : sp === 'lintel' ? (A === 'A' ? this.lintel : this.dLintel) : null;
    if (!who || (A !== 'A' && A !== 'D')) return null;
    const [hx, hy] = who.data.home, k = Math.min(1, (this.shotT || 0) / .8), e = k * k * (3 - 2 * k), side = sp === 'strake' ? -1 : 1;
    return { x: hx + side * 14, y: hy + 72 - e * 10, z: 30, yaw: Math.atan2(-72, -side * 14), pitch: .02, fov: 54 - e * 4 };
  }
  camera() {
    const close = this.speakerShot(); if (close) return close;
    const t = this.t, A = this.area, ease = k => k * k * (3 - 2 * k);
    if (A === 'A') { const k = ease(Math.min(1, t / 20)); return { x: 7.2 * 16, y: (9.4 - k * 1.6) * 16, z: 31 - k * 3, yaw: -PI / 2, pitch: -.12 + k * .04, fov: 62 }; }
    if (A === 'B') { const k = ease(Math.min(1, t / 30)); return { x: 21.9 * 16 + Math.sin(t * .2) * 3, y: (9.4 - k * 2.2) * 16, z: 30, yaw: -PI / 2, pitch: -.02, fov: 62 }; }
    if (A === 'C') { const k = ease(Math.min(1, t / 14)); return { x: 35.5 * 16, y: (9.4 - k * 1.2) * 16, z: 24 + k * 6, yaw: -PI / 2, pitch: .2 - k * .16, fov: 62 }; }
    const k = ease(Math.min(1, t / 24)); return { x: (51 + k * 4) * 16, y: 14.4 * 16, z: 34 - k * 4, yaw: -PI / 2 - .08 + k * .16, pitch: -.02, fov: 64 };
  }
  draw(r) {
    const cam = this.camera(); this.world.camera.fixed = cam;
    this.glow.x = cam.x; this.glow.y = cam.y - 20; this.glow.z = 40; this.glow.on = this.area !== 'D';
    this.dawn.on = this.area === 'D'; this.dawn.x = 53 * 16; this.dawn.y = 4 * 16; this.dawn.z = 120;
    this.eye.on = this.area === 'C'; this.eye.x = 35.5 * 16; this.eye.y = 2.5 * 16; this.eye.z = 26; this.eye.power = this.area === 'C' ? Math.max(1, 7 - this.t * .6) : 0;
    this.fire.on = this.area === 'A'; this.fire.x = 7 * 16; this.fire.y = 1.8 * 16; this.fire.z = 12;
    this.world.draw(r);
  }
  onDraw(w) {
    const p = w.pen, t = this.t, W = 16;
    p.at().box(43 * W / 2, w.depth / 2, 50, 43 * W, w.depth, 4, '#141016');   // the ceiling over the halls (the square is open to the sky)
    /* A: the Council Hall: a long table with chairs, the hearth, banners with the key and bolt, candlesticks, the city's seal */
    p.at().box(7.2 * W, 3.2 * W, 11, 92, 18, 2.4, '#6a4428').box(7.2 * W, 3.2 * W, 12.4, 88, 15, .4, '#8a2a2a');
    for (const x of [-40, -14, 14, 40]) p.at(7.2 * W + x, 3.2 * W, 0).box(0, -6, 5, 3, 3, 10, '#4a2a18').box(0, 6, 5, 3, 3, 10, '#4a2a18');
    for (const x of [-30, 0, 30]) p.at(7.2 * W + x, 3.2 * W, 12.6).tube(0, 0, 0, 0, 0, 6, .6, '#e8e0d0').glow(0, 0, 7.6 + Math.sin(t * 9 + x) * .3, 1.2, '#ffd890');
    for (const x of [-34, -22, -10, 10, 22, 34]) p.at(7.2 * W + x, 1.9 * W, 0).box(0, 0, 9, 8, 8, 2, '#5a3a22').box(0, -3, 16, 8, 2, 14, '#5a3a22');
    p.at(7.2 * W, 1.1 * W, 0).box(0, 0, 10, 30, 6, 20, '#3a3032').box(0, -1, 8, 20, 4, 12, '#120808').glow(0, 1, 6 + Math.sin(t * 8) * .6, 4, '#ff8a3a').glow(-4, 1.5, 5, 2.4, '#ffd060').glow(4, 1.5, 5.5, 2.2, '#ffb040');
    for (const x of [2.6, 11.8]) p.at(x * W, 1.07 * W, 0).box(0, 0, 32, 16, .8, 26, '#6a1a1a').box(0, -.6, 34, 2, .4, 16, '#e8c050').box(0, -.6, 34, 12, .4, 2, '#e8c050').bar(-6, -.6, 28, 6, -.6, 40, .8, .4, '#c8c8d8');
    p.at(7.2 * W, 1.07 * W, 0).ball(0, 0, 38, 7, .6, 7, '#c8a050').ball(0, -.4, 38, 5, .6, 5, '#2a3a6a').box(0, -.8, 38, 1.2, .3, 7, '#e8c050').box(0, -.8, 38, 6, .3, 1.2, '#c8c8d8');
    /* B: the Drain-gate: worn steps down into the dark, the grate and its great bolt sliding home, chains, a drain */
    const gx = 21.5 * W, gy = 1.25 * W;
    for (let k = 0; k < 7; k++) p.at().box(gx, gy + 18 + k * 5, 6 - k * 1.1, 52, 6, 3, E.shade('#3a3438', -k * .03));
    p.at(gx, gy, 0).box(0, 0, 24, 56, 2, 48, '#060505');
    for (let k = -24; k <= 24; k += 5) p.at(gx, gy, 0).tube(k, 2, 0, k, 2, 46, 1, '#3a3a40');
    for (const z of [10, 24, 38]) p.at(gx, gy, 0).box(0, 2.6, z, 54, 1, 1.6, '#3a3a40');
    const bx = this.area === 'B' ? -36 + this.bolt * 36 : 0; p.at(gx, gy, 0).box(bx, 4.2, 24, 30, 4, 6, '#6a6a72').box(bx + 15, 4.2, 24, 3, 6, 8, '#8a8a92').box(26, 4.2, 24, 6, 7, 10, '#4a4a52');
    for (const x of [-30, 30]) for (let k = 0; k < 9; k++) p.at(gx + x, gy + 4, 0).ball(0, 0, 46 - k * 3.4, 1, .6, 1.8, '#5a5a60');
    p.at(gx, gy + 70, 0).box(0, 0, .2, 18, 12, .3, '#141414'); for (let k = -7; k <= 7; k += 3.5) p.at(gx + k, gy + 70, 0).box(0, 0, .5, .8, 12, .4, '#4a4a48');
    /* C: the Vault after the battle: the cracked Eye sinking, its light going out, the seven bolts flung across the floor */
    if (this.area === 'C') {
      const k = Math.min(1, t / 6), ex = 35.5 * W, ey = 2.6 * W;
      p.at(ex, ey, 34 - k * 18).ball(0, 0, 0, 15, 15, 15, E.shade('#b8b0a0', -k * .55)).ball(0, 14, 0, 3, 8, 8, k > .5 ? '#3a2a1a' : '#c87a20');
      for (let i = 0; i < 7; i++) p.at(ex, ey, 34 - k * 18).bar(-9 + i * 3, 13.4, 12 - i * 2, -7 + i * 3.5, 13.4, -9 + i * 3, .6, .4, '#140a04');
      if (k < 1) p.at(ex, ey, 34 - k * 18).halo(0, 6, 0, 20 * (1 - k), [.14, .09, .02]);
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2, d = 26 + k * 34; p.at(ex + Math.cos(a) * d, ey + 16 + Math.sin(a) * d * .35, 1.5).box(0, 0, 0, 24, 3, 3, '#3a3e48', a + k * 2).box(12, 0, 0, 5, 5, 4, '#4a505a', a + k * 2); }
      for (const [x, y] of [[33, 2], [38, 2]]) p.at(x * W, y * W, 0).ball(0, 0, 30, 9, 1, 9, '#3a3e46').ball(0, 1, 30, 3, 1, 3, '#1a1c22');
    }
    /* D: the city square at dawn: a sky over the rooftops, the sun, house fronts whose doors swing open one by one, a fountain, lamps, bunting */
    const sx = 53 * W;
    p.at(sx, .6 * W, 0).box(0, 0, 110, 40 * W, 1, 130, '#d0845a').box(0, .8, 150, 40 * W, 1, 50, '#a85a5a').box(0, 1.2, 70, 40 * W, 1, 40, '#e8b070');
    for (const side of [-1, 1]) p.at(sx + side * 8.95 * W, 8 * W, 0).box(0, 0, 112, 1, 16 * W, 128, '#c07858');
    p.at(sx + 30, 1.5 * W, 0).glow(0, 0, 66 + Math.min(1, this.t / 20) * 10, 13, '#fff0c0').halo(0, 0, 70, 50, [.5, .35, .15]);
    for (let i = 0; i < 6; i++) {
      const hx = (45.5 + i * 3.2) * W, hy = 1.4 * W, open = this.area === 'D' ? clamp((t - 1.5 - i * .45) * 1.4, 0, 1) : 0, col = ['#8a6a4a', '#7a5a3a', '#9a7a5a', '#6a5a4a', '#8a5a4a', '#7a6a5a'][i];
      p.at(hx, hy, 0).box(0, 0, 26, 48, 6, 52, col).box(0, 0, 54, 52, 10, 4, '#5a2a1a').cone(-14, 0, 56, -14, 0, 66, 9, '#6a3020').cone(14, 0, 56, 14, 0, 66, 9, '#6a3020');
      p.at(hx, hy, 0).box(-14, -3.4, 34, 9, .6, 10, open > .1 ? '#ffd890' : '#3a2a1a').box(14, -3.4, 34, 9, .6, 10, open > .1 ? '#ffd890' : '#3a2a1a').box(0, -3.3, 11, 14, .4, 22, '#140c08');
      const a = open * 1.6; p.at(hx - 7, hy - 3.6, 0).box(Math.cos(a) * 7, -Math.sin(a) * 7, 11, 14, 1.2, 21, '#5a321c', -a);
      if (open > .5) p.at(hx, hy - 4, 0).halo(0, -6, 12, 14, [.25, .18, .06]);
    }
    p.at(53 * W, 4.6 * W, 0).box(0, 0, 3, 34, 34, 6, '#6a6458').box(0, 0, 6.2, 30, 30, .6, '#3a6a8a').tube(0, 0, 6, 0, 0, 20, 2.4, '#8a8478').ball(0, 0, 21, 5, 5, 3, '#8a8478');
    for (let k = 0; k < 6; k++) { const a = t * 2 + k; p.at(53 * W, 4.6 * W, 0).glow(Math.cos(a) * 4, Math.sin(a) * 4, 18 - ((t * 9 + k * 3) % 12), .8, '#bfe8ff'); }
    for (const x of [45.2, 61]) p.at(x * W, 7 * W, 0).tube(0, 0, 0, 0, 0, 40, 1, '#2a2a30').box(0, 0, 41, 5, 5, 6, '#3a3a40').glow(0, 0, 41, 2, '#ffe0a0');
    for (let k = 0; k < 14; k++) { const x0 = 45.2 * W + k * (15.8 * W / 14), sag = Math.sin(k / 13 * PI) * 10; p.at(x0, 7 * W, 38 - sag).box(0, 0, 0, 3, .4, 4, ['#e0463c', '#ffd36a', '#4a8aff'][k % 3]); }
  }
};
/* ---- the cutscene scene ---- */
B.Cutscene = {
  enter(d) {
    this.d = d || {}; this.lines = d.which === 'ending' ? B.ENDING : B.INTRO; this.i = 0; this.shown = 0; this.t = 0; this.skipT = 0; this.plan = null; this.pi = 0; this.lineT = 0;
    B.Music.play(d.which === 'ending' ? 'ending' : 'title');
    if (B.stage && d.then && d.then.party) B.stage.setParty(d.then.party.map((t, i) => B.makeMember(t, i)));
    this.startLine();
  },
  startLine() {
    const L = this.lines[this.i]; if (!L) return;
    if (B.stage && B.stage.area !== L[0] && L[0] !== 'X') B.stage.show(L[0]);
    if (B.stage) { B.stage.speaker = L[1]; B.stage.shotT = 0; }
    this.shown = 0; this.lineT = 0; this.pi = 0; this.plan = B.babble.plan(L[2], B.VOICES[B.SPEAKERS[L[1]].voice]);
    if (L[3] === 'slam' && B.stage) B.stage.slamNow();
    if (L[3] === 'blink') { this.game().audio.sfx('gazeHum'); }
  },
  game() { return B.game; },
  finish() {
    const G = B.game, d = this.d;
    if (d.which === 'ending') { G.go('ending', {}); return; }
    if (d.then && d.then.resume) { G.go('play', { resume: true }); return; }
    B.newState((Date.now() & 0xffff) + 1, d.then && d.then.party || B.PREMADE, { diff: G.settings.difficulty || 'normal' });
    G.go('play', { fresh: true });
  },
  update(dt) {
    const G = B.game, I = G.input; B.UI.t = G.real; this.t += dt; this.lineT += dt;
    if (B.stage) B.stage.update(dt, 'cut');
    // hold Options or Esc for a second (on the wall clock in a browser, so a slow machine does not stretch it) to skip
    const wall = typeof document !== 'undefined' && typeof performance !== 'undefined' ? performance.now() / 1000 : null;
    if (I.down('pause') || I.held.has('Escape') || I.held.has('Pad9')) { if (wall !== null) { if (this.skipAt == null) this.skipAt = wall; this.skipT = wall - this.skipAt; } else this.skipT += dt; if (this.skipT > 1) { this.skipAt = null; I.consumeAll(); return this.finish(); } } else { this.skipT = 0; this.skipAt = null; }
    const L = this.lines[this.i]; if (!L) return this.finish();
    this.shown = Math.min(L[2].length, this.shown + dt * 40);
    while (this.plan && this.pi < this.plan.length && this.plan[this.pi].t <= this.lineT && this.shown < L[2].length) { B.babble.syl(G, this.plan[this.pi], B.VOICES[B.SPEAKERS[L[1]].voice]); this.pi++; }
    const done = this.shown >= L[2].length, adv = I.pressed('confirm') || I.pressed('use') || I.pressed('cancel') || I.clicked() || I.pressed('strike');
    if (adv && !done) this.shown = L[2].length;
    else if ((adv && done) || (done && this.lineT > L[2].length / 40 + 2.6)) { this.i++; if (this.i >= this.lines.length) return this.finish(); this.startLine(); }
  },
  draw(r) {
    const G = B.game, W = r.W, H = r.H; B.UI.W = W; B.UI.H = H;
    const L = this.lines[this.i] || this.lines[this.lines.length - 1];
    if (L[0] !== 'X' && B.stage) B.stage.draw(r);
    r.overlay(g => {
      if (L[0] === 'X') { px.rect(g, 0, 0, W, H, '#000'); const o = Math.sin(Math.min(1, this.lineT / 1.2) * PI); if (this.lineT < 1.6) { g.save(); g.globalAlpha = o; px.ell ? px.ell(g, W / 2, H / 2 - 20, 30 * o + 1, 14 * o + 1, '#e8e0c8') : px.disc(g, W / 2, H / 2 - 20, 20 * o + 1, '#e8e0c8'); px.disc(g, W / 2, H / 2 - 20, 10 * o + 1, '#e8a030'); px.disc(g, W / 2, H / 2 - 20, 4 * o + 1, '#100806'); g.restore(); } }
      if (B.stage && B.stage.slam > 0) { g.save(); g.globalAlpha = B.stage.slam * .4; px.rect(g, 0, 0, W, H, '#000'); g.restore(); }
      const sp = B.SPEAKERS[L[1]], bh = 50, by = H - bh - 8, txt = L[2].slice(0, Math.floor(this.shown));
      B.panel(g, 10, by, W - 20, bh, { alpha: .9 });
      let tx = 18; const rig = sp.rig ? B.speakerRig(L[1]) : null;
      if (rig) { px.rect(g, 15, by + 5, 40, 40, '#14100c'); rig.drawPortrait(g, 16, by + 6, 38, { zoom: 2.2, turn: .3, bg: '#2a2218' }); tx = 62; }
      if (sp.name) B.text(g, sp.name.toUpperCase(), tx, by + 5, B.COL.focus);
      B.wrap(txt, W - tx - 24).slice(0, 4).forEach((l, i) => B.text(g, l, tx, by + (sp.name ? 15 : 8) + i * 10, L[1] === 'narrator' ? '#e8dcc0' : B.COL.text));
      B.text(g, 'Hold ' + B.fillGlyphs(G, '{pause}') + ' to skip', 12, 8, '#8a7a5a', { font: 'tiny' });
      if (this.skipT > 0) E.ui.bar(g, 12, 16, 56, 3, this.skipT, B.COL.focus);
    });
  }
};
