// Short cinematics, 4 to 8 s, in-engine and skippable, as coroutines on game.script (section 17): gurney rush, gala collapse, the storm, the last table, the overflowing ER, the scrub-in.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, U = G.U;
const P = () => G.game.particles;
class Stage {
  constructor(o) { const game = G.game; this.o = o; this.t = 0; this.actors = []; this.props = []; this.lights = []; this.cam = { x: o.camX ?? 160, y: o.camY ?? 80 }; this.after = null; this.before = null; this.overlayFn = null; this.map = o.rows ? new E.TileMap({ rows: o.rows, legend: { '#': 1 }, types: { 1: { h: o.wallH ?? 40, cut: true, cutH: 5, top: o.top || '#2c3a38', side: o.side || '#7a908a', face: o.face || 'plaster', roof: 'plain' } }, floorTex: (x, y) => { const k = ((x >> 4) + (y >> 4)) & 1 ? o.floorA || '#6a807c' : o.floorB || '#62786f'; return E.hex(k); }, outside: '#0a1012' }) : null; this.prevView = game.view.id || 'overhead'; game.setView(o.view || 'threequarter'); game.lights.enabled = true; game.lights.ambient = Math.min(1, (o.ambient ?? .6) + .15); }
  rig(id, x, y, o = {}) { const a = { id, rig: G.makeRig(id, o.rigO || {}), x, y, z: 0, vx: 0, vy: 0, facing: o.facing ?? 0, pose: o.pose, down: 0, expr: o.expr, roll: 0, tilt: 0, run: 0, carry: o.carry, shake: 0 }; this.actors.push(a); return a; }
  prop(id, x, y, facing = 0, o = {}) { const p = Object.assign({ id, x, y, facing }, o); this.props.push(p); return p; }
  update(dt) {
    this.t += dt; const game = G.game;
    for (const a of this.actors) { a.x += a.vx * dt; a.y += a.vy * dt; a.rig.t = this.t; a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, pose: a.pose, expr: a.expr, down: a.down, roll: a.roll, tilt: a.tilt, run: a.run }); }
    game.focus(this.cam.x, this.cam.y, 10);
  }
  draw(r) {
    const game = G.game; if (this.before) this.before(r); if (this.map) { this.map.drawFloor(r); this.map.queueWalls(r); }
    for (const p of this.props) r.shape(p.id, p.x, p.y, 0, { facing: p.facing, light: true });
    for (const a of this.actors) { r.shadow(a.x, a.y, 6); r.actor(a.x, a.y, a.z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    for (const l of this.lights) game.lights.add(l[0], l[1], l[2], l[3], l[4] * .5, { color: l[5] });
    if (this.after) this.after(r);
    r.overlay(g => { const W = r.W, H = r.H, bar = 18; px.rect(g, 0, 0, W, bar, '#000000'); px.rect(g, 0, H - bar, W, bar, '#000000'); if (this.overlayFn) this.overlayFn(g, W, H, this.t); const I = game.input, lw = G.Glyph.width(I, 'confirm'); G.Glyph.action(g, I, 'confirm', W - lw - 34, H - 14); Pix.text(g, 'Skip', W - 31, H - 13, '#a8c8c0'); });
  }
  end() { const game = G.game; if (game.scene === G.scenes.story) { game.setView(this.prevView); game.lights.enabled = false; game.focus(game.W / 2, game.H / 2, 0); game.cam.snap = true; } game.cam.bounds = null; }
}
const CORRIDOR = ['######################', '#....................#', '#....................#', '#....................#', '#....................#', '######################'];
const HALL = ['####################', '#..................#', '#..................#', '#..................#', '#..................#', '#..................#', '####################'];
const DEFS = {
  // the crane falls, the gurney comes: a run down the corridor
  *gurney(C) {
    const med1 = C.rig('medic', 30, 44, { pose: 'gurney', facing: 0 }), med2 = C.rig('medic', 60, 62, { pose: 'gurney', facing: 0 }), vale = C.rig('vale', 200, 54, { facing: Math.PI }), tam = C.rig('tam', 44, 52, { facing: 0 }); tam.down = 1; tam.z = 8;
    const g = C.prop('gurney', 44, 54, 1.57); C.cam.x = 60; C.cam.y = 54; C.lights.push([100, 40, 40, 90, .7, '#e8fff8'], [220, 40, 40, 90, .7, '#e8fff8']); G.Sfx.tone(600, 800, 1, 'square', .05, { lp: 1500 });
    for (const a of [med1, med2, tam]) a.vx = 92; let t = 0; while (t < 2.1) { const dt = 1 / 120; t += dt; g.x += 92 * dt; C.cam.x = g.x + 24; yield; }
    vale.pose = 'gurney'; vale.expr = 'shout'; G.Babble.say('vale', 'Okay okay okay!'); vale.vx = 0; vale.facing = Math.PI; yield .5;
    vale.vx = 92; vale.facing = 0; t = 0; while (t < 1.6) { const dt = 1 / 120; t += dt; g.x += 92 * dt; C.cam.x = g.x + 24; yield; }
  },
  // the toast, the cane, the fall
  *gala(C) {
    C.before = r => r.sky(['#1c1426', '#2a1a2c', '#3a2230']); C.cam.x = 150; C.cam.y = 66; C.lights.push([150, 40, 50, 140, .9, '#ffe9a0']);
    for (let i = 0; i < 9; i++) C.rig('guest', 20 + i * 34 + (i % 2) * 8, 22 + (i % 3) * 14, { facing: 1.57 });
    const chief = C.rig('oyelaran', 100, 74, { facing: 0 }), hale = C.rig('hale', 196, 66, { facing: 2.8, expr: 'smile' }); chief.vx = 26; yield 1.8; chief.vx = 0; chief.facing = -1.57; yield .5;
    chief.roll = .12; G.Sfx.thud(); yield .5; chief.pose = 'die'; chief.vy = 3; G.Sfx.thud(); G.game.shake(3); yield 1.1;
    const cane = { x: chief.x + 14, y: chief.y + 8 }, t0 = C.t; C.after = r => { const u = Math.min(1, (C.t - t0) / 1.8); const q = r.w(cane.x + u * 46, cane.y + u * 10, 0); r.overlay(g => { const a = u * 16; px.line(g, Math.round(q[0] - Math.cos(a) * 9), Math.round(q[1] - Math.sin(a) * 3), Math.round(q[0] + Math.cos(a) * 9), Math.round(q[1] + Math.sin(a) * 3), '#7a5030', 2); }); };
    chief.down = 1; for (const a of C.actors) if (a.id === 'guest') { a.pose = 'shout'; } hale.expr = 'smile'; yield 2;
  },
  // the ship in the storm, rocking: a side view painted by hand
  *storm(C) {
    C.before = r => { const W = r.W, H = r.H, t = C.t; r.sky(['#02040a', '#060a18', '#0c1428']); r.overlay(g => {
      if (Math.sin(t * 2.3) > .97) px.blend(g, .4, 'add', () => px.rect(g, 0, 0, W, H, '#c8d8ff'));
      const sea = x => H * .62 + Math.sin(x * .03 + t * 1.7) * 9 + Math.sin(x * .011 - t * 1.1) * 12; const roll = Math.sin(t * 1.1) * .13, cx = W / 2, cy = sea(cx) - 2, ca = Math.cos(roll), sa = Math.sin(roll), R = (x, y) => [cx + x * ca - y * sa, cy + x * sa + y * ca];
      px.poly(g, [R(-110, -14), R(120, -18), R(96, 22), R(-96, 22)], '#2a3238'); px.poly(g, [R(-110, -14), R(120, -18), R(116, -10), R(-108, -6)], '#5a3a2a'); px.poly(g, [R(-46, -14), R(-46, -48), R(30, -48), R(30, -16)], '#d8dcd4'); px.poly(g, [R(-34, -48), R(-34, -62), R(14, -62), R(14, -48)], '#c8ccc4'); px.poly(g, [R(40, -16), R(40, -74), R(48, -74), R(48, -16)], '#1c2228'); px.line(g, ...R(44, -74).map(Math.round), ...R(100, -30).map(Math.round), '#3a4248'); const cr = R(-16, -36); for (let i = 0; i < 5; i++) { const q = R(-40 + i * 14, -36); px.rect(g, Math.round(q[0]), Math.round(q[1]), 8, 6, i === 1 ? '#10161a' : '#e8c068'); } px.rect(g, Math.round(cr[0]) - 2, Math.round(cr[1]) - 16, 4, 10, '#d84a4a'); px.rect(g, Math.round(cr[0]) - 5, Math.round(cr[1]) - 13, 10, 4, '#d84a4a');
      for (let x = 0; x < W; x += 3) { const y = sea(x); px.rect(g, x, Math.round(y), 3, H - Math.round(y), '#0c1a2a'); px.rect(g, x, Math.round(y), 3, 2, Math.sin(x * .3 + t * 3) > .55 ? '#c8d8e8' : '#2a3e54'); } for (let j = 0; j < 4; j++) for (let x = 0; x < W; x += 3) { const y = sea(x + j * 30) + 14 + j * 15; if ((x + j * 5) % 11 < 6) px.rect(g, x, Math.round(y), 3, 1, '#1c2e44'); }
      for (let i = 0; i < 110; i++) { const x = (i * 53 + t * 140) % W, y = (i * 97 + t * 520) % H; px.line(g, Math.round(x), Math.round(y), Math.round(x - 3), Math.round(y + 6), '#7a94b4'); }
      const lx = 40 + ((t * 18) % (W * .5)), ly = sea(lx); px.poly(g, [[lx - 14, ly - 4], [lx + 14, ly - 4], [lx + 10, ly + 3], [lx - 10, ly + 3]], '#d87a24'); px.rect(g, lx - 3, ly - 10, 2, 6, '#e8fbf6');
    }); }; C.map = null; G.Sfx.foghorn(); yield 2; G.Sfx.foghorn(); yield 3.4;
  },
  // everyone around the last table, the gallery above
  *final(C) {
    C.cam.x = 150; C.cam.y = 64; C.lights.push([150, 66, 60, 120, 1, '#fff8d8']); C.prop('gurney', 150, 72, 0); C.prop('surglamp', 150, 72, 0); C.prop('vitalsmon', 200, 46, 1.57); C.prop('crashcart', 100, 50, 1.57);
    const pat = C.rig('clementine', 136, 72, { facing: 0 }); pat.down = 1; pat.z = 8; const vale = C.rig('vale', 150, 90, { facing: -1.57, pose: 'over', rigO: { masked: true, weapon: 'tool' } }), zh = C.rig('sokolova', 150, 54, { facing: 1.57, pose: 'over' }), q = C.rig('quill', 186, 76, { facing: 3.14, pose: 'pass', rigO: { masked: true } });
    const ody = C.rig('odalys', 40, 40, { facing: .4 }), percy = C.rig('percy', 66, 30, { facing: .4 }), chief = C.rig('oyelaran', 240, 30, { facing: 2.6 }), hale = C.rig('hale', 262, 44, { facing: 2.8 }); hale.roll = .08; yield 3; G.Sfx.beep(70); yield 1; G.Sfx.beep(70); yield 1.8;
  },
  // the overflowing ER, the happiest place on earth
  *er(C) {
    C.cam.x = 150; C.cam.y = 70; C.lights.push([100, 50, 50, 120, .8, '#e8fff8'], [220, 50, 50, 120, .8, '#e8fff8']); const list = ['gown', 'agnes', 'slide', 'tam', 'harrow', 'ilse', 'gown', 'yusuf', 'gown', 'perpetua', 'gown', 'crane', 'medic', 'gown'];
    list.forEach((id, i) => { const a = C.rig(id, 26 + (i % 7) * 40 + (i % 2) * 12, 34 + (i / 7 | 0) * 38, { facing: (i * 1.3) % 6.28, pose: i % 3 === 0 ? 'shout' : undefined }); a.expr = i % 2 ? 'shout' : 'smile'; }); const v = C.rig('vale', 150, 70, { facing: 1.57, pose: 'cheer' }); C.prop('gurney', 90, 96, 0); C.prop('ivstand', 212, 96);
    for (let i = 0; i < 6; i++) { G.Babble.say(i % 2 ? 'tam' : 'agnes', 'Doctor I have a headache!'); yield .7; for (const a of C.actors) if (a.id !== 'vale') { a.vx = Math.sin(C.t * 3 + a.x) * 18; a.vy = Math.cos(C.t * 2.3 + a.y) * 10; a.facing = Math.atan2(a.vy, a.vx); } }
    yield .6;
  },
  // the paddles, as they looked from the gallery: a body arching on the table
  *paddles(C) { C.cam.x = 100; C.cam.y = 54; C.lights.push([100, 56, 60, 100, 1, '#fff8d8']); C.prop('gurney', 100, 58, 0); C.prop('surglamp', 100, 58, 0); C.prop('vitalsmon', 150, 38, 1.57); C.prop('crashcart', 60, 40, 1.57); const tam = C.rig('tam', 86, 58, { facing: 0, pose: 'arch' }); tam.down = 1; tam.z = 8; const v = C.rig('vale', 100, 76, { facing: -1.57, pose: 'over', rigO: { masked: true } }), q = C.rig('quill', 136, 62, { facing: 3.14, pose: 'pass', rigO: { masked: true } }); yield .7; for (let i = 0; i < 3; i++) { G.Sfx.whine(); yield .55; G.Sfx.bang(); tam.rig.kick && tam.rig.kick(3); tam.z = 12; G.game.flash('#ffffff', .12, .7); G.game.shake(4); yield .12; tam.z = 8; yield .5; } G.Sfx.beep(40); yield .35; G.Sfx.beep(45); yield .5; },
  // the scrub-in stinger, before every op: 2 seconds
  *scrub(C) { C.cam.x = 90; C.cam.y = 48; C.lights.push([90, 40, 40, 90, .8, '#f0fff8']); const q = C.rig('quill', 118, 52, { facing: 3.14, pose: 'pass', rigO: { masked: true } }), v = C.rig(C.who || 'vale', 72, 52, { facing: 0, pose: 'scrub', rigO: { masked: true } }); C.prop('crashcart', 150, 30, 1.57); C.prop('ivstand', 40, 30); G.Sfx.noise(.6, 1800, 900, 1, .08); yield .6; G.Sfx.palm(); q.pose = 'pass'; yield 1; v.pose = undefined; yield .4; },
};
const OPTS = { paddles: { rows: ['##############', '#............#', '#............#', '#............#', '#............#', '##############'], floorA: '#3c5a60', floorB: '#345056', ambient: .4 }, gurney: { rows: CORRIDOR, camX: 60, camY: 54 }, gala: { rows: HALL, top: '#2a1a2c', side: '#3a2230', face: 'plaster', floorA: '#5a4638', floorB: '#46362c', ambient: .5 }, storm: { view: 'overhead' }, final: { rows: HALL, floorA: '#3c5a60', floorB: '#345056', ambient: .4 }, er: { rows: HALL, ambient: .65 }, scrub: { rows: ['##############', '#............#', '#............#', '#............#', '##############'], floorA: '#566a6e', floorB: '#4e6266', ambient: .55 } };
G.Cine = {
  has: id => !!DEFS[id],
  /** returns { update(dt), draw(r) }; onDone runs when it ends or is skipped */
  start(id, onDone, o = {}) {
    const game = G.game, C = new Stage(OPTS[id] || {}); Object.assign(C, o); let done = false; const fin = () => { if (done) return; done = true; if (scr && scr.cancel) scr.cancel(); C.end(); onDone && onDone(); };
    const scr = game.script(function* () { yield* DEFS[id](C); yield .05; fin(); });
    let wait = .35;
    return { C, update(dt) { C.update(dt); wait -= dt; const I = game.input; if (wait <= 0 && (I.pressed('confirm') || I.pressed('skip') || I.clicked())) fin(); }, draw(r) { if (!done) C.draw(r); } };
  },
};
G.scenes = G.scenes || {};
// the stinger scene: Flow goes through it on the way to the table
G.scenes.stinger = { view: 'threequarter', camera: { zoom: false, wheel: false }, enter(d = {}) { this.d = d; this.c = G.Cine.start('scrub', () => { this.next = true; }, { who: d.who }); this.next = false; G.Music.play(null); }, update(dt) { if (this.next) { this.next = false; G.game.go('op', this.d.op, { fade: 'white', seconds: .2 }); return; } this.c.update(dt); }, draw(r) { this.c.draw(r); r.overlay(g => { E.font.text(g, 'SCRUB IN', r.W / 2, 4, '#5ff0e0', { align: 'center', outline: false }); }); } };
})();
