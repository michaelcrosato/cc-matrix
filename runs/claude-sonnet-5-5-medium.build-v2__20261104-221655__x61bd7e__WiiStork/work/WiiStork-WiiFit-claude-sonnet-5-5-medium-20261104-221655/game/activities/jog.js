// Coastal Jog (E.Road)
(() => {
const E = My3D2dge, G = window.G, { px } = E, C = G.C;
function buildRoad(run) {
  const road = new E.Road({ segment: 200, width: 2000, lanes: 2, rumble: 4, draw: 200, fov: 100, height: 900, square: true,
    colors: { road: ['#efe2c8', '#e8d9bc'], grass: ['#7fd09a', '#74c690'], rumble: ['#ffffff', '#2cc6e6'], lane: '#ffffff' }, fog: { color: '#d8f3fb', density: 4 }, sky: new E.Backdrop('ocean') });
  for (const [n, o] of G.COURSES.jog.blocks) road.add(n, o);
  const L = road.length, rng = E.rng(77);
  const sc = (kind) => ({ w: 320, draw(g, sx, sy, s) {
    if (kind === 'bungalow') { const w = 700 * s, h = 380 * s; px.rect(g, sx - w / 2, sy - h, w, h, '#fdf5ec'); px.rect(g, sx - w / 2 - 3, sy - h - 12 * s * 3, w + 6, 12 * s * 3, '#ff7a59'); px.rect(g, sx - w * .15, sy - h * .6, w * .3, h * .6, '#2cc6e6'); }
    else if (kind === 'palm') { const h = 640 * s; px.rect(g, sx - 3 * s * 2, sy - h, 6 * s * 2, h, '#a07848'); for (let i = -2; i <= 2; i++) px.line(g, sx, sy - h, sx + i * 140 * s, sy - h + 120 * s - Math.abs(i) * 20 * s, '#4fa86a', Math.max(1, 3 * s * 3)); }
    else if (kind === 'post') { px.rect(g, sx - 3 * s * 2, sy - 260 * s, 6 * s * 2, 260 * s, '#c8dde2'); px.disc(g, sx, sy - 270 * s, 8 * s * 3, '#2cc6e6'); }
    else if (kind === 'bench') { const w = 420 * s; px.rect(g, sx - w / 2, sy - 90 * s, w, 20 * s * 2, '#a07848'); px.rect(g, sx - w / 2, sy - 160 * s, w, 14 * s * 2, '#a07848'); px.rect(g, sx - 70 * s, sy - 130 * s, 140 * s, 40 * s, '#6a8f9a'); G.txt(g, 'Zzz', sx, sy - 190 * s, '#fff', { align: 'center' }); }
    else if (kind === 'sign') { px.rect(g, sx - 3, sy - 300 * s, 6, 300 * s, '#8a8f98'); px.rect(g, sx - 30 * s * 3, sy - 360 * s, 60 * s * 3, 80 * s, '#ffffff'); }
  } });
  for (let z = 1500; z < L; z += 1300) { const k = ((z / 1300) | 0) % 5; road.place(z, k % 2 ? 1.5 : -1.5, sc(['palm', 'post', 'bungalow', 'palm', 'post'][k])); if (k === 2) road.place(z + 600, -1.9, sc('palm')); }
  road.place(30000, 1.45, sc('bench')); road.place(31500, -1.7, sc('bungalow')); road.place(90000, 1.45, sc('sign'));
  return road;
}
const pigeon = (g, sx, sy, s, t) => { const f = Math.sin(t * 14) * 4 * s * 3; px.ell(g, sx, sy - 30 * s, 60 * s, 34 * s, '#9aa4ad'); px.ell(g, sx, sy - 26 * s, 36 * s, 18 * s, '#c8d0d6'); px.disc(g, sx + 50 * s, sy - 54 * s, 18 * s, '#7a838c'); px.rect(g, sx + 64 * s, sy - 56 * s, 16 * s, 5 * s, '#f5b700'); px.line(g, sx - 10 * s, sy - 40 * s, sx - 60 * s, sy - 70 * s + f, '#7a838c', 2); };
G.activity({
  id: 'jog', family: 'jog', discipline: 'Cardio', name: 'Coastal Jog', room: 'pier', view: 'brawler', song: 'jog', demoPose: 'Jumping Jacks', hubEvent: true,
  card: 'Alternate your left and right steps. Stay in Marisol\'s zone: not too slow, not too eager. Weave round the pigeons. Grab the cups.',
  how: { pad: 'Alternate L2 and R2 for steps. Left stick steers.', key: 'Alternate J and K for steps. A and D steer.', mouse: 'Alternate left and right buttons. The mouse steers.' },
  stars: [.35, .65, .90],
  tiers: [{ set: 'free', dur: 70 }],
  setup(run) {
    run.road = buildRoad(run); const rng = run.rng, L = run.road.length, J = G.COURSES.jog; run.objs = []; run.pigeonEvery = J.pigeonEvery;
    for (let z = 4000, i = 0; z < L - 6000; z += 1000, i++) { if (i % J.cupEvery === 3) run.objs.push({ kind: 'cup', z, x: (rng() - .5) * 1.4 }); if (i % J.pigeonEvery === 7) { const x = (rng() - .5) * 1.2; for (let k = 0; k < 3; k++) run.objs.push({ kind: 'pigeon', z: z + k * 220, x: x + (k - 1) * .22 }); } if (i % J.joggerEvery === 12) run.objs.push({ kind: 'jogger', z, x: rng() < .5 ? -.4 : .4, v: 1100 }); }
    run.cs.forEach(c => { c.z = 500; c.x = 0; c.cad = 0; c.steps = []; c.lastSide = 0; c.inZone = 0; c.cups = 0; c.sprintT = 0; c.stitch = 0; c.hit = 0; c.turn = 0; c.fig.set('Run_Loop'); c.fig.tgt = -Math.PI / 2; c.fig.x = 0; c.fig.y = 0; c.cupsTotal = run.objs.filter(o => o.kind === 'cup').length; c.cupFlash = 0; });
    run.cupsTotal = Math.max(1, run.objs.filter(o => o.kind === 'cup').length);
  },
  bot(run, c, bot, dt) {
    const P = { poor: { j: .35, a: .18 }, average: { j: .2, a: .1 }, good: { j: .1, a: .05 }, expert: { j: .05, a: .02 } }[bot.skill] || { j: .2, a: .1 };
    const band = this.band(), tgtC = (band[0] + band[1]) / 2 + (c.stitch > 0 ? -.5 : 0);
    c.it.paceL = c.it.paceR = false; c.botT = (c.botT || 0) - dt;
    if (c.botT <= 0) { const nc = tgtC * (1 + P.j * Math.sin(run.time * 1.1 + 3) * .6 + (run.rng() - .5) * P.j); c.botT = 1 / nc; c.botSide = -(c.botSide || 1); if (c.botSide < 0) c.it.paceL = true; else c.it.paceR = true; }
    let tx = 0, best = 1e9; for (const o of run.objs) { const dz = o.z - c.z; if (dz < 120 || dz > 2600 || o.gone) continue; if (o.kind === 'cup') { if (dz < best && Math.abs(o.x - c.x) < .8) { best = dz; tx = o.x; } } else if (Math.abs(o.x - c.x) < .35) { tx = o.x > c.x ? c.x - .6 : c.x + .6; best = 0; break; } }
    c.it.ux = G.clamp((tx - c.x) * 3 + P.a * Math.sin(run.time), -1, 1);
  },
  band() { return [G.DEV.jogLo, G.DEV.jogHi]; },
  update(dt, run) {
    const road = run.road, [lo, hi] = this.band(), L = road.length;
    run.cs.forEach(c => {
      const it = c.it;
      for (const side of [-1, 1]) if (side < 0 ? it.paceL : it.paceR) { c.steps.push(run.time); if (side !== c.lastSide) { c.lastSide = side; } G.snd('step', { pitch: 1 + side * .1 }); c.fig.rig.kick && 0; }
      c.steps = c.steps.filter(t => t > run.time - 1.6); const n = c.steps.length, span = n >= 3 ? c.steps[n - 1] - c.steps[0] : 0, cadRaw = span > .2 && run.time - c.steps[n - 1] < .7 ? (n - 1) / span : 0; c.cad = G.lerp(c.cad, cadRaw, Math.min(1, dt * 6));
      if (c.stitch > 0) { c.stitch -= dt; c.cad = Math.min(c.cad, 1.6); }
      if (c.cad > 4.2) { c.sprintT += dt; if (c.sprintT >= 2 && c.stitch <= 0) { c.stitch = 3; c.sprintT = 0; G.snd('stumble'); if (c.local) G.caption('A stitch! It is only a side-ache. It will walk it off.', 'Marisol', 3); } } else c.sprintT = Math.max(0, c.sprintT - dt);
      const spd = (c.hit > 0 ? .3 : 1) * c.cad * 700 * G.DEV.jogSpeed; c.hit = Math.max(0, c.hit - dt);
      c.z += spd * dt; c.x = G.clamp(c.x + it.ux * 1.5 * dt - road.curveAt(c.z) * spd * dt * .00018, -1.25, 1.25);
      c.turn += road.curveAt(c.z) * spd * dt * .00006;
      if (c.cad >= lo && c.cad <= hi && c.stitch <= 0) c.inZone += dt;
      // objects
      for (const o of run.objs) { if (o.kind === 'jogger') o.z += o.v * dt; if (o.gone) continue; const dz = ((o.z - c.z) % L + L) % L; if (dz < 140 || dz > L - 140) if (Math.abs(o.x - c.x) < (o.kind === 'cup' ? .22 : .2)) { if (o.kind === 'cup') { o.gone = true; c.cups++; c.cupFlash = .6; G.snd('perfect'); G.game.particles.glints(0, 0, 20, 5, '#8fd3f4'); } else if (c.hit <= 0) { c.hit = 1.2; c.cad *= .4; G.snd(o.kind === 'pigeon' ? 'pigeon' : 'stumble'); if (c.local && c.input && c.input.rumble) c.input.rumble(.5, .2); if (o.kind === 'pigeon') o.fly = 1; } } }
      c.cupFlash = Math.max(0, c.cupFlash - dt);
      c.fig.speed = Math.max(.15, c.cad / 2.2); c.fig.update(dt);
    });
    G.game.audio && 0;
  },
  hud(r, run) {
    G.drawTimer(r, run); G.nameTags(r, run); const c = run.cs[0], [lo, hi] = this.band();
    r.overlay(g => {
      const x = r.W / 2 - 60, y = r.H - 26, w = 120, k = v => x + w * G.clamp(v / 6, 0, 1);
      G.rr(g, x - 4, y - 5, w + 8, 16, '#ffffffdd'); px.rect(g, x, y, w, 6, '#e6eef0'); px.rect(g, k(lo), y, k(hi) - k(lo), 6, '#7fe3b8'); px.rect(g, k(4.2), y, w - (k(4.2) - x), 6, '#ffd6c8'); px.rect(g, k(c.cad) - 1, y - 3, 3, 12, C.INK);
      G.txt(g, c.stitch > 0 ? 'Stitch!' : c.cad < lo ? 'Too slow' : c.cad > hi ? 'Too eager' : 'Just right', r.W / 2, y - 14, c.stitch > 0 || c.cad > hi || c.cad < lo ? C.DANGER : '#14a88c', { align: 'center' });
      G.txt(g, 'Cups ' + c.cups, 14, 14, C.ACC2, { scale: 1 }); if (c.cupFlash > 0) G.txt(g, '+1', r.W / 2, 40 - (.6 - c.cupFlash) * 20, C.ACC2, { align: 'center', scale: 2 });
      G.txt(g, 'Zone ' + Math.round(c.inZone / Math.max(1, run.time) * 100) + '%', r.W - 14, 24, C.INK, { align: 'right' });
    });
  },
  draw(r, run) {
    const c = run.cs[0], road = run.road, cars = run.objs.filter(o => !o.gone).map(o => ({ z: o.z, x: o.x, w: o.kind === 'cup' ? .12 : .22, draw: (g, sx, sy, s) => { if (o.kind === 'cup') { px.rect(g, sx - 26 * s, sy - 80 * s, 52 * s, 80 * s, '#ffffff'); px.rect(g, sx - 26 * s, sy - 80 * s, 52 * s, 22 * s, '#2cc6e6'); } else if (o.kind === 'pigeon') pigeon(g, sx, sy, s, run.time + o.x * 10); else { const b = Math.sin(run.time * 8) * 6 * s; px.rect(g, sx - 40 * s, sy - 220 * s + b, 80 * s, 130 * s, '#f58cb4'); px.disc(g, sx, sy - 250 * s + b, 34 * s, '#e8b890'); px.rect(g, sx - 40 * s, sy - 92 * s, 30 * s, 92 * s + b, '#20404c'); px.rect(g, sx + 10 * s, sy - 92 * s, 30 * s, 92 * s - b, '#20404c'); } } }));
    road.draw(r, { z: c.z, x: c.x, h: road.o.height, turn: c.turn, cars });
    const f = c.fig; r.overlay(g => { f.rig.o.size = 2.6; f.rig.draw(g, r.W / 2 + c.x * 10, r.H - 18, r.view); });
  },
  result(run, c) { const zone = c.inZone / run.dur, cups = Math.min(1, c.cups / (run.cupsTotal * .75)); return { pct: G.clamp(.7 * zone + .3 * cups, 0, 1), detail: 'In zone ' + Math.round(zone * 100) + '%  ·  Cups ' + c.cups + ' / ' + run.cupsTotal }; }
});
})();
