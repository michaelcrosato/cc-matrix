/* ---- THE FLOOD WAGON (the intermission minigame, 7.14): Old Gus's ice resurfacer on E.Car. The period's scuffs and melt
 * are on the ice; drive over them to lay a fresh sheet (a 72 u swath, clean in one pass) within 40 s. Stick steers toward that screen direction, R2 /
 * Shift is gas, ✕ honks. 85% of the scuff cleared (the gold tick on the bar) is a perfect flood: the team's BOOM +30. Skipped, an AI driver fast-forwards 6 s ---- */
const Flood = (() => {
  let car = null, gus = null, st = null;
  function begin(o = {}) {
    car = new E.Car({ x: Rink.X0 + 70, y: Rink.Y0 + 40, angle: 0, top: o.auto ? 260 : 165, accel: o.auto ? 300 : 230, brake: 260, turn: 3.2, grip: 7 });
    gus = gus || Rigs.cast('gus');
    st = { t: 0, len: o.auto ? 6 : 40, auto: !!o.auto, start: Rink.scuffTotal() || 1, done: false, path: 0, perfect: false, honk: 0, wp: 0 };
    if (st.start < 30) { for (let i = 0; i < 260; i++) Rink.addScuff(Rink.X0 + 30 + RNG.fx() * (Rink.HL * 2 - 60), Rink.Y0 + 30 + RNG.fx() * (Rink.HW * 2 - 60), .4 + RNG.fx() * .5); st.start = Rink.scuffTotal(); }
    return st;
  }
  /** the AI driver: laps of a lawnmower pattern */
  const WP = (() => { const out = []; for (let k = 0; k < 6; k++) { const y = Rink.Y0 + 34 + k * 63; if (k % 2 === 0) out.push([Rink.X0 + 60, y], [Rink.X1 - 60, y]); else out.push([Rink.X1 - 60, y], [Rink.X0 + 60, y]); } return out; })();
  function step(dt, I) {
    if (!st || st.done) return;
    st.t += dt;
    let steer = 0, gas = 0, brake = 0, off = 0;
    if (st.auto || !I) { const [tx, ty] = WP[st.wp % WP.length]; if (Math.hypot(tx - car.x, ty - car.y) < 36) st.wp++; off = U.angDiff(car.angle, Math.atan2(ty - car.y, tx - car.x)); steer = clamp(off * 2.2, -1, 1); gas = 1; }
    else {
      const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]);
      if (Math.hypot(d[0], d[1]) > .3) { off = U.angDiff(car.angle, Math.atan2(d[1], d[0])); steer = clamp(off * 2.4, -1, 1); gas = .5; }
      if (I.down('turbo') || I.down('shoot')) gas = 1;
      if (I.pressed('pass')) { Synth.sfx('aooga'); st.honk = .6; }
    }
    st.honk = Math.max(0, st.honk - dt);
    // a hard turn (the stick well off the heading) eases off the gas and brakes, so the wagon turns tight
    if (Math.abs(off) > 1.1 && car.speed > 60) { gas = 0; brake = .7; } else if (Math.abs(off) > .6) gas = Math.min(gas, .45);
    car.update(dt, null, { steer, gas, brake });
    const b = { x: car.x, y: car.y, vx: Math.cos(car.angle) * car.speed, vy: Math.sin(car.angle) * car.speed };
    if (Rink.clampBody(b, 16, .2, .7)) { car.x = b.x; car.y = b.y; car.speed *= .5; Synth.sfx('boards', { vol: .4 }); }
    car.x = b.x; car.y = b.y;
    // the conditioner at the back lays fresh ice 40 u wide
    const bx = car.x - Math.cos(car.angle) * 16, by = car.y - Math.sin(car.angle) * 16, nx = -Math.sin(car.angle), ny = Math.cos(car.angle);
    for (let k = -4; k <= 4; k++) Rink.clearIce(bx + nx * k * 8 - 8, bx + nx * k * 8 + 8, by + ny * k * 8 - 8, by + ny * k * 8 + 8, 0);
    if (Math.floor(st.t * 8) !== Math.floor((st.t - dt) * 8)) Synth.sfx('putter');
    gus.update(dt, { x: car.x, y: car.y, z: 14, vx: 0, vy: 0, facing: car.angle, pose: 'kneel' });
    const J = gus.J; if (J.shC) { J.handR = E.V3.add(J.shC, [5, 1.6, -3]); J.handL = E.V3.add(J.shC, [5, -1.6, -3]); }
    if (st.t >= st.len || clean() >= .98) finish();
  }
  const clean = () => st ? clamp(1 - Rink.scuffTotal() / st.start, 0, 1) : 0;
  const PERFECT = .85;   // the share of the period's scuff a perfect flood clears
  function finish() { if (st.done) return; st.done = true; st.perfect = !st.auto && clean() >= PERFECT; if (st.auto) Rink.clearIce(); Bus.emit('flood_done', { perfect: st.perfect, clean: clean() }); }
  /** the wagon in the world: a boxy body, the cab, the tank, the conditioner, Gus at the wheel */
  function draw(r) {
    if (!car) return;
    drawWagon(r, car.x, car.y, car.angle, true);
    r.actor(car.x - Math.cos(car.angle) * 2, car.y - Math.sin(car.angle) * 2, 14, (g, ox, oy) => gus.draw(g, ox, oy, E.charView(r.view)));
    L.add(car.x + Math.cos(car.angle) * 24, car.y + Math.sin(car.angle) * 24, 10, 90, .8, { color: '#fff4d0' });
  }
  function drawWagon(r, x, y, a, lit) {
    const ca = Math.cos(a), sa = Math.sin(a), P2 = (f, s, z) => r.w(x + ca * f - sa * s, y + sa * f + ca * s, z);
    r.queue(x, y, 0, g => {
      const quad = (pts, c) => px.poly(g, pts, c);
      const box = (f0, f1, s0, s1, z0, z1, top, side, front) => { quad([P2(f0, s0, z1), P2(f1, s0, z1), P2(f1, s1, z1), P2(f0, s1, z1)], top); quad([P2(f0, s1, z0), P2(f1, s1, z0), P2(f1, s1, z1), P2(f0, s1, z1)], side); quad([P2(f0, s0, z0), P2(f1, s0, z0), P2(f1, s0, z1), P2(f0, s0, z1)], side); quad([P2(f1, s0, z0), P2(f1, s1, z0), P2(f1, s1, z1), P2(f1, s0, z1)], front); quad([P2(f0, s0, z0), P2(f0, s1, z0), P2(f0, s1, z1), P2(f0, s0, z1)], front); };
      for (const [f, s] of [[10, -11], [10, 11], [-10, -11], [-10, 11]]) { const q = P2(f, s, 3); px.disc(g, q[0], q[1], 3, '#141418'); }
      box(-20, 18, -11, 11, 3, 13, '#2a6ab8', '#1a4a8a', '#3a7ac8');
      box(-20, -6, -10, 10, 13, 24, '#d8dce4', '#a8b0bc', '#c8ccd4');
      box(6, 16, -9, 9, 13, 22, '#2a4a7a', '#1a2a4a', '#4a6a9a');
      box(-26, -20, -12, 12, 1, 6, '#5a5a6a', '#3a3a44', '#4a4a54');
      const fr = P2(18, 0, 9); px.rect(g, fr[0] - 6, fr[1] - 2, 12, 3, '#e8eef4'); E.font.text(g, 'FLOOD WAGON', P2(-6, 11, 18)[0], P2(-6, 11, 18)[1] - 2, '#ffffff', { font: 'tiny', align: 'center', outline: false });
      if (lit) { const hl = P2(18, -7, 8), hr = P2(18, 7, 8); px.dot(g, hl[0], hl[1], '#fff4c0'); px.dot(g, hr[0], hr[1], '#fff4c0'); }
      const wet = P2(-30, 0, 0); px.blend(g, .35, 'normal', () => px.ell(g, wet[0], wet[1], 10, 4, '#8ab8e8'));
    });
  }
  return { begin, step, draw, drawWagon, clean, WP, PERFECT, get st() { return st; }, get car() { return car; } };
})();

scenes.flood = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'topdown'], camera: { zoom: false },
  enter(d) {
    d = d || {}; this.d = d; this.m = d.m || null; this.phase = d.ask ? 'card' : d.auto ? 'drive' : 'drive'; this.t = 0;
    this.map = this.m ? World.prepare(this.m) : Rink.build('icebox', 'muskrats'); if (!this.m) Crowd.build('icebox', 'muskrats');
    game.cam.bounds = v => this.map.bounds(v); L.enabled = true; L.ambient = .5;
    Synth.music('flood'); Cam.set(Cam.playView(), .72);
    if (this.phase === 'drive') Flood.begin({ auto: !!d.auto });
    UI.Idle.reset();
  },
  update(dt) {
    const I = game.input; this.t += dt;
    if (this.phase === 'card') {
      if (UI.anyP('pass') || UI.anyP('confirm')) { this.phase = 'drive'; Flood.begin({ auto: false }); Synth.sfx('menuSel'); }
      else if (UI.anyP('deke') || UI.anyP('cancel')) { this.phase = 'drive'; Flood.begin({ auto: true }); Synth.sfx('menuBack'); }
      game.focus(Rink.C.x, Rink.C.y, 0); return;
    }
    if (this.phase === 'drive') {
      Flood.step(dt, this.d.attract ? null : I);
      const c = Flood.car; if (c) game.focus(c.x, c.y, 10);
      if (Flood.st && Flood.st.done) { this.phase = 'done'; this.t = 0; if (Flood.st.perfect && this.m) { Boom.add(this.m, this.m.teams.findIndex(t => t.human) >= 0 ? this.m.teams.findIndex(t => t.human) : 0, Boom.GAIN.flood); UI.toast('PERFECT FLOOD! BOOM +30'); } }
    } else if (this.phase === 'done' && this.t > (Flood.st && Flood.st.auto ? .6 : 2.2)) this.leave();
    if (!this.m && UI.anyP('cancel') && this.phase !== 'done') this.leave();
  },
  leave() { if (this.left) return; this.left = true; if (this.m) game.go('match', { resume: true }, { fade: 'wipe' }); else game.go('title', { menu: true }); },
  exit() { this.left = false; },
  draw(r) {
    this.map.drawFloor(r); Rink.drawScuff(r); Rink.drawBoards(r, this.m ? this.m.arena.id : 'icebox', this.m ? this.m.teams[0].def.dark : TEAMS.muskrats.dark, game.real); Rink.drawNets(r, game.real);
    Crowd.draw(r, this.m); this.map.queueWalls(r);
    if (this.phase !== 'card') Flood.draw(r);
    L.add(Rink.C.x, Rink.C.y, 140, 600, .5, { color: '#ffd8a0' });
    r.overlay(g => {
      const m = this.m;
      if (this.phase === 'card') {
        UI.panel(g, r.W / 2 - 150, 30, 300, 150, {});
        E.font.title(g, m ? 'END OF THE ' + U.ord(m.period) : 'INTERMISSION', r.W / 2, 38, { align: 'center', scale: 2 });
        if (m) { const A2 = m.teams[0], B = m.teams[1]; [['GOALS', A2.score, B.score], ['SHOTS', A2.shots, B.shots], ['HITS', A2.hits, B.hits]].forEach(([lab, a, b], i) => { const y = 66 + i * 24; E.font.text(g, String(a), r.W / 2 - 70, y, '#ffffff', { scale: 2, align: 'center', outline: '#000' }); E.font.text(g, lab, r.W / 2, y + 4, UI.MUTED, { align: 'center', outline: false }); E.font.text(g, String(b), r.W / 2 + 70, y, '#ffffff', { scale: 2, align: 'center', outline: '#000' }); }); E.font.text(g, A2.def.abbr, r.W / 2 - 70, 56, A2.def.trim, { align: 'center', outline: false }); E.font.text(g, B.def.abbr, r.W / 2 + 70, 56, B.def.trim, { align: 'center', outline: false }); }
        Glyphs.text(g, '{pass} DRIVE THE FLOOD WAGON     {deke} SKIP', r.W / 2, 150, { align: 'center', color: UI.GOLD });
        return;
      }
      const s = Flood.st; if (!s) return;
      UI.panel(g, r.W / 2 - 90, 6, 180, 30, {}); E.font.text(g, s.auto ? "OLD GUS FLOODS THE ICE" : 'FLOOD THE ICE!', r.W / 2, 10, UI.GOLD, { align: 'center', outline: '#000' });
      E.ui.bar(g, r.W / 2 - 82, 22, 96, 6, Flood.clean(), Flood.clean() >= Flood.PERFECT ? '#7ad87a' : '#4ab8e8'); px.rect(g, r.W / 2 - 82 + Math.round(96 * Flood.PERFECT), 20, 1, 10, '#ffd36a'); E.font.text(g, Math.round(Flood.clean() * 100) + '%', r.W / 2 + 18, 21, '#ffffff', { outline: '#000' }); E.font.text(g, U.mmss(Math.max(0, s.len - s.t)), r.W / 2 + 84, 21, '#ffffff', { align: 'right', outline: '#000' });
      if (!s.auto && this.phase === 'drive') Glyphs.text(g, 'STICK STEER   {turbo} GAS   {pass} HONK', r.W / 2, r.H - 16, { align: 'center', color: '#cfe0f4' });
      if (this.phase === 'done') E.font.title(g, s.perfect ? 'PERFECT FLOOD!' : s.auto ? 'FRESH SHEET' : 'NICE ICE!', r.W / 2, r.H * .4, { align: 'center', scale: 3 });
    });
  }
};
