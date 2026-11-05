// 62-bonus: thirty-second shooting galleries on the hunt's own landscape: a timeline of targets on arcs or paths, the
// rifle with a bigger tube and a faster rack, points per target, protected targets that cost, PERFECT (every target hit,
// no misses: the total doubles), and a tally. Crow Patrol, Saucer Season and Snowball Standoff.
class BonusRun {
  constructor(H, def) {
    this.H = H; this.def = def; this.t = 0; this.targets = []; this.score = 0; this.shots = 0; this.hits = 0; this.misses = 0; this.scoreable = 0; this.taken = 0; this.penalty = 0; this.lines = [];
    this.r = RNG.wrap(RNG.fresh('bonus:' + def.id)); this.done = false; this.scores = H.players.map(() => 0);
    const self = this; this.script = G.game.script(function* () { yield* def.timeline(self); });
  }
  /** add a target: { kind, x, y, z, vx, vy, vz, g, r (radius, units), points, golden, protected, draw, life, path, ... } */
  add(o) { const T2 = Object.assign({ alive: true, t: 0, g: 9.8 * M, life: 8, points: 0, r: .4 * M, counts: true }, o); this.targets.push(T2); if (T2.counts && T2.points > 0) this.scoreable++; return T2; }
  at(b, d, up = 0) { const w = this.H.world.at(this.def.vantage, b, d); return { x: w.x, y: w.y, z: w.z + up * M }; }
  update(dt) {
    this.t += dt; const H = this.H;
    for (const T2 of this.targets) {
      if (!T2.alive) { T2.deadT = (T2.deadT || 0) + dt; continue; }
      T2.t += dt;
      if (T2.update) T2.update(T2, dt, this);
      else if (T2.path) { T2.d = (T2.d || 0) + T2.speed * dt; const p = T2.path.at(T2.d), z = lerp(T2.z0, T2.z1, clamp(T2.d / T2.path.len, 0, 1)) + (T2.hump ? Math.sin(clamp(T2.d / T2.path.len, 0, 1) * Math.PI) * T2.hump : 0); T2.vx = (p.x - T2.x) / dt; T2.vy = (p.y - T2.y) / dt; T2.x = p.x; T2.y = p.y; T2.z = H.world.height(p.x, p.y) + z; T2.heading = p.angle; if (T2.d >= T2.path.len) T2.gone = true; }
      else { T2.vz -= T2.g * dt; T2.x += T2.vx * dt; T2.y += T2.vy * dt; T2.z += T2.vz * dt; if (T2.z < H.world.height(T2.x, T2.y) - .2 * M) T2.gone = true; }
      if (T2.rig) T2.rig.update(dt, { x: T2.x, y: T2.y, z: T2.z, vx: T2.vx, vy: T2.vy, vz: T2.vz, flap: T2.flap === undefined ? 1 : T2.flap, walk: 0, facing: T2.heading });
      if (T2.t > T2.life) T2.gone = true;
      if (T2.gone) { T2.alive = false; T2.missed = true; if (T2.onGone) T2.onGone(T2, this); }
    }
    this.targets = this.targets.filter(T2 => T2.alive || (T2.deadT || 0) < 1.5);
    if (this.t >= (this.def.time || 30) && !this.done) this.finish();
  }
  finish() {
    if (this.done) return; this.done = true; if (this.script) this.script.cancel();
    this.perfect = this.scoreable > 0 && this.taken >= this.scoreable && this.misses === 0 && this.penalty === 0;
    if (this.perfect) { for (const p of this.H.players) { p.addScore(this.scores[p.i]); } this.scores = this.scores.map(s => s * 2); this.score *= 2; }
    bus.emit('bonusEnd', this);
  }
  /** this step's shots against the targets (then the world, for the dust) */
  resolve(shots) {
    for (const s of shots) {
      const p = s.p, ray = s.ray; this.shots++; p.stats.shots++;
      let best = null, bt = Infinity;
      for (const T2 of this.targets) { if (!T2.alive) continue; const zs = T2.zones ? T2.zones(T2) : [{ a: [T2.x, T2.y, T2.z + (T2.zc || 0)], r: T2.r * (T2.big || 1.25) }]; for (const z of zs) { const t = z.b ? rayCapsule(ray, ray, z.a, z.b, z.r) : raySphere(ray, ray, z.a, z.r); if (t !== null && t < bt) { bt = t; best = T2; best._z = z; } } }
      const R = resolveRay(this.H, ray, { maxT: best ? bt : undefined });
      if (best && (R.kind === 'sky' || R.t >= bt - 1)) this.hit(best, p, ray, bt);
      else { this.misses++; bus.emit('impact', { p, R }); if (R.kind === 'sky' || R.kind === 'ground' || R.kind === 'prop') bus.emit('bonusMiss', { p, R }); }
      bus.emit('shot', { p, R, ray });
      for (const a of this.H.actors) a.hear && a.hear(ray.x, ray.y, 1, false);
    }
  }
  hit(T2, p, ray, t) {
    const pts = T2.points, pt = [ray.x + ray.dx * t, ray.y + ray.dy * t, ray.z + ray.dz * t];
    if (T2.protected) { this.penalty++; this.score += pts; this.scores[p.i] += pts; p.addScore(pts); this.lines.push([T2.label || 'PENALTY', pts]); if (T2.onHit) T2.onHit(T2, this, p); HUD.pop(pt[0], pt[1], pt[2] + M, fmt(pts) + ' ' + (T2.label || ''), '#ff6a4a'); bus.emit('bonusHit', { T: T2, p, pts, pt }); return; }
    this.hits++; p.stats.hits++; this.taken += T2.counts ? 1 : 0; this.score += pts; this.scores[p.i] += pts; p.addScore(pts);
    if (T2.onHit) T2.onHit(T2, this, p, pt); else T2.alive = false;
    HUD.pop(pt[0], pt[1], pt[2] + .5 * M, '+' + fmt(pts) + (T2.golden ? ' GOLDEN!' : ''), T2.golden ? '#ffd040' : p.color);
    bus.emit('bonusHit', { T: T2, p, pts, pt });
  }
  items(items) { for (const T2 of this.targets) { if (!T2.alive && !(T2.deadT < 1.5 && T2.drawDead)) continue; const it = T2._it || (T2._it = { box: T2.box || [24, 24], outline: '#140c08', bias: T2.bias === undefined ? 6 : T2.bias, scale: 1 }); it.x = T2.x; it.y = T2.y; it.z = T2.z; it.draw = (g, ox, oy, k, view) => (T2.alive ? T2.draw : T2.drawDead)(g, ox, oy, k, view, T2); items.push(it); } }
  dispose() { if (this.script) this.script.cancel(); }
}
SEG.bonus = (H, o) => {
  const def = reg('bonus', o.id); let B, t = 0, phase = 'card';
  return { kind: 'bonus', canShoot: true, canCall: false,
    enter() {
      H.camAt(def.vantage, def.bearing || 0, def.pitch || 4, def.fov || 34); if (H.site) { H.site.dispose(); H.site = null; } H.actors.length = 0; H.vantageId = def.vantage; H.fanB = [-60, 60];
      for (const p of H.players) { p.resetSite({ tube: def.tube, rack: .15 }); p.rx = H.W / 2 + (p.i - (H.players.length - 1) / 2) * 30; p.ry = H.H * .5; }
      this.scoreAt = H.players.map(p => p.score);
      HUD.banner(def.name.toUpperCase(), { scale: 3, dur: 1.6, sub: def.rules, colors: ['#ffffff', '#7ad0ff', '#3a8ae8'] });
      if (G.sfx) G.sfx.music('jamboree', { fade: .5 });
      if (def.setup) def.setup(H);
    },
    update(dt) {
      t += dt;
      if (phase === 'card') { if (t > 1.6) { phase = 'play'; B = H.bonus = new BonusRun(H, o.time ? Object.assign({}, def, { time: o.time }) : def); } return false; }
      B.update(dt); H.camAt(def.vantage, def.bearing || 0, def.pitch || 4, def.fov || 34);
      if (B.done && this.closed) return true;
      if (B.done) { this.closed = true; H.bonusResult = { id: def.id, name: def.name, score: B.score, scores: B.scores.slice(), hits: B.hits, shots: B.shots, perfect: B.perfect, lines: B.lines }; Records.setBest(def.id, Math.max(...B.scores)); return true; }
      return false;
    },
    get canShoot() { return phase === 'play'; },
    resolve(shots) { if (B) B.resolve(shots); },
    items(items) { if (B) B.items(items); if (def.decor) def.decor(H, items, B); },
    draw(g, W, Ht) { if (!B) return; const left = Math.max(0, (def.time || 30) - B.t); E.font.text(g, def.name.toUpperCase(), W / 2, 6, '#f4ead8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, left.toFixed(1), W / 2, 15, left < 5 ? '#ff6a4a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); E.font.text(g, 'HITS ' + B.hits + '  MISSES ' + B.misses, W / 2, 33, B.misses ? '#d8c8a8' : '#7ad0ff', { align: 'center', shadow: '#000', outline: false }); },
    exit() { if (B) B.dispose(); H.bonus = null; if (def.teardown) def.teardown(H); }
  };
};
SEG.bonusTally = (H, o) => {
  let t = 0; const R = H.bonusResult || { score: 0, hits: 0, shots: 0, name: '' };
  return { block: true, canShoot: false, showReticles: false, cinema: true,
    enter() { if (G.sfx) { G.sfx.music('results'); if (R.perfect) G.sfx.sting('fanfare'); } },
    update(dt) { t += dt; return t > .8 && (anyConfirm(H) || (H.mode === 'attract' || H.hubMode) && t > 3) || t > 14; },
    draw(g, W, Ht) {
      dim(g, W, Ht, .55); const bw = 300, bh = 150, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2;
      E.ui.box(g, x, y, bw, bh, { bg: ['#1e2a3a', '#0e141e'], border: '#7ad0ff' });
      E.font.title(g, R.name.toUpperCase(), W / 2, y + 10, { scale: 2, colors: ['#ffffff', '#7ad0ff', '#3a8ae8'], outline: '#0a1420', depth: 2, depthColor: '#1a3050', align: 'center' });
      E.font.text(g, 'HITS ' + R.hits + ' OF ' + R.shots + ' SHOTS', W / 2, y + 40, '#e8f0f8', { align: 'center', outline: false });
      for (const [l, v] of (R.lines || []).slice(0, 3)) E.font.text(g, l + ' ' + fmt(v), W / 2, y + 54 + (R.lines.indexOf(l) * 10), '#ff8a7a', { align: 'center', outline: false });
      if (R.perfect && t > .4) E.font.title(g, 'PERFECT! x2', W / 2, y + 76, { scale: 2, colors: ['#fff6d8', '#ffd040', '#c87a10'], outline: '#1a0c08', align: 'center' });
      E.font.text(g, '+' + fmt(R.score), W / 2, y + 100, '#ffffff', { align: 'center', scale: 3, outline: '#0a1420' });
      if (H.players.length > 1) H.players.forEach((p, i) => E.font.text(g, p.name + ' ' + fmt(R.scores[i]), x + 30 + i * 66, y + 132, p.color, { outline: false }));
      if (t > .8) Glyph.cue(g, 'confirm', 'CONTINUE', W / 2, y + bh + 12, H.players[0].input);
    }
  };
};
/* ---------- target art ---------- */
function drawClay(g, ox, oy, k, view, T2) { const r = Math.max(1.5, .55 * M * k * .5), tilt = .45; px.ell(g, ox, oy, r + 1, r * tilt + 1, '#1a0c08'); px.ell(g, ox, oy, r, r * tilt, T2.golden ? '#ffd040' : '#e8743a'); px.ell(g, ox - r * .2, oy - r * .15, r * .5, r * tilt * .4, T2.golden ? '#fff4b0' : '#ffb070'); }
function drawShards(g, ox, oy, k, view, T2) { const s = T2.deadT || 0; for (let i = 0; i < 7; i++) { const a = i * 1.1 + T2.t, r = s * 30 * k * (1 + i % 3) * .4; px.rect(g, ox + Math.cos(a) * r, oy + Math.sin(a) * r * .6 + s * s * 40 * k, Math.max(1, k * 2), Math.max(1, k * 1.5), T2.golden ? '#ffd040' : i % 2 ? '#e8743a' : '#c85a28'); } }
function drawHank(g, ox, oy, k, view, T2) {
  const u = M * k, wob = Math.sin((T2.wobT || 0) * 20) * (T2.wobT || 0) * .3, C = E.tones('#6a8ac8'), straw = E.tones('#d8b45a');
  const top = [ox + wob * u, oy - 2.1 * u];
  px.line(g, ox, oy, top[0], top[1], E.tones('#6a5040').sh, Math.max(1, u * .12));
  px.line(g, top[0] - .9 * u, top[1] + .45 * u, top[0] + .9 * u, top[1] + .45 * u, E.tones('#6a5040').sh, Math.max(1, u * .1));
  px.poly(g, [[top[0] - .45 * u, top[1] + .3 * u], [top[0] + .45 * u, top[1] + .3 * u], [top[0] + .38 * u, top[1] + 1.25 * u], [top[0] - .38 * u, top[1] + 1.25 * u]], C.base);
  if (u > 4) for (let i = 0; i < 4; i++) px.line(g, top[0] - .4 * u, top[1] + (.4 + i * .22) * u, top[0] + .4 * u, top[1] + (.4 + i * .22) * u, C.sh);
  for (const sd of [-1, 1]) { px.line(g, top[0] + sd * .45 * u, top[1] + .45 * u, top[0] + sd * .95 * u, top[1] + .5 * u, C.sh, Math.max(1, u * .14)); for (let i = 0; i < 3; i++) px.line(g, top[0] + sd * .95 * u, top[1] + .5 * u, top[0] + sd * (1.05 + i * .05) * u, top[1] + (.45 + i * .1) * u, straw.base); }
  px.disc(g, top[0], top[1], .3 * u, E.tones('#c8a878').base);
  if (u > 4) { px.dot(g, top[0] - .1 * u, top[1] - .05 * u, '#1a0c08'); px.dot(g, top[0] + .1 * u, top[1] - .05 * u, '#1a0c08'); px.line(g, top[0] - .12 * u, top[1] + .12 * u, top[0] + .12 * u, top[1] + .12 * u, '#1a0c08'); }
  px.ell(g, top[0], top[1] - .25 * u, .55 * u, .12 * u, straw.sh); px.rect(g, top[0] - .25 * u, top[1] - .55 * u, .5 * u, .3 * u, straw.base);
}
function drawSnowman(g, ox, oy, k, view, T2) {
  const u = M * k, rise = clamp(T2.rise || 0, 0, 1), y0 = oy + (1 - rise) * 1.8 * u, sn = E.tones('#eef2f6'), arm = (T2.throwT || 0) > 0 ? -1.2 + (T2.throwT) * 2.6 : .2;
  px.disc(g, ox, y0 - .5 * u, .55 * u, sn.sh); px.disc(g, ox - .1 * u, y0 - .58 * u, .45 * u, sn.base);
  px.disc(g, ox, y0 - 1.3 * u, .4 * u, sn.sh); px.disc(g, ox - .08 * u, y0 - 1.36 * u, .32 * u, sn.base);
  px.disc(g, ox, y0 - 1.9 * u, .3 * u, sn.sh); px.disc(g, ox - .06 * u, y0 - 1.95 * u, .24 * u, sn.base);
  if (u > 3) { px.dot(g, ox - .1 * u, y0 - 1.95 * u, '#1a1418'); px.dot(g, ox + .1 * u, y0 - 1.95 * u, '#1a1418'); px.line(g, ox, y0 - 1.88 * u, ox + .25 * u, y0 - 1.84 * u, '#e8742a', Math.max(1, u * .06)); px.line(g, ox - .12 * u, y0 - 1.78 * u, ox + .12 * u, y0 - 1.74 * u, '#1a1418'); }
  px.line(g, ox + .35 * u, y0 - 1.35 * u, ox + .9 * u, y0 - (1.6 + arm * .5) * u, '#5a4030', Math.max(1, u * .06)); px.line(g, ox - .35 * u, y0 - 1.35 * u, ox - .85 * u, y0 - 1.1 * u, '#5a4030', Math.max(1, u * .06));
  if (T2.hat && !T2.hatOff) { px.rect(g, ox - .32 * u, y0 - 2.22 * u, .64 * u, .08 * u, '#1a1418'); px.rect(g, ox - .2 * u, y0 - 2.6 * u, .4 * u, .4 * u, '#1a1418'); px.rect(g, ox - .2 * u, y0 - 2.3 * u, .4 * u, .06 * u, '#c83a2a'); }
}
function drawSnowball(g, ox, oy, k, view, T2) { const r = Math.max(1.5, .2 * M * k); px.disc(g, ox, oy, r + .5, '#8a98a8'); px.disc(g, ox - r * .15, oy - r * .15, r, '#f4f8fc'); }
function drawTopHat(g, ox, oy, k, view, T2) { const u = M * k * (T2.hs || 1); px.rect(g, ox - .5 * u, oy - .1 * u, u, .14 * u, '#1a1418'); px.rect(g, ox - .32 * u, oy - .75 * u, .64 * u, .68 * u, '#1a1418'); px.rect(g, ox - .32 * u, oy - .25 * u, .64 * u, .1 * u, '#c83a2a'); px.rect(g, ox - .26 * u, oy - .7 * u, .12 * u, .4 * u, '#3a343a'); }
function drawSnowmoose(g, ox, oy, k, view, T2) { const rig = T2.rig; if (!rig) return; const save = rig.C; rig.C = Object.assign({}, rig.C, { coat: '#e8eef4', back: '#d8e2ea', belly: '#f4f8fc', leg: '#dfe8f0', muzzle: '#c8d4e0', nose: '#2a3a4a', hoof: '#8a98a8', throat: '#eef2f6', antler: '#b8c8d8', bell: '#e0e8f0' }); rig.draw(g, ox, oy, view); rig.C = save; }

/* ---------- the three games ---------- */
def('bonus', 'crow-patrol', {
  hunt: 'hollow', name: 'Crow Patrol', host: 'granny', blurb: 'Shoot the crows off the corn. Not Hank.', rules: 'CROWS 100 · GOLDEN CROW 500 · NOT HANK!', vantage: 'porch', time: 30, tube: 10, bearing: 0, pitch: 4, fov: 34,
  setup(H) { H.hank = { x: 0, y: 0, z: 0, wobT: 0 }; const w = H.world.at('porch', -4, 26); Object.assign(H.hank, w); },
  decor(H, items, B) { if (!H.hank) return; const h = H.hank; h.wobT = Math.max(0, (h.wobT || 0) - (H.dt || 0)); items.push({ x: h.x, y: h.y, z: h.z, box: [24, 40], outline: '#140c08', draw: (g, ox, oy, k, v) => drawHank(g, ox, oy, k, v, h) }); },
  teardown(H) { H.hank = null; },
  timeline: function* (B) {
    const H = B.H, h = H.hank;
    // Hank himself is a target nobody should shoot
    B.add({ kind: 'hank', protected: true, points: -250, label: "HANK'S GOT FEELIN'S!", life: 99, x: h.x, y: h.y, z: h.z, update: (T2) => { T2.x = h.x; T2.y = h.y; T2.z = h.z; }, zones: T2 => [{ a: [h.x, h.y, h.z + .3 * M], b: [h.x, h.y, h.z + 2.2 * M], r: .4 * M }, { a: [h.x - .9 * M, h.y, h.z + 1.6 * M], b: [h.x + .9 * M, h.y, h.z + 1.6 * M], r: .2 * M }], draw: () => {}, counts: false, onHit: (T2) => { h.wobT = 1; if (G.sfx) G.sfx.play('bonk'); Barks.caption('granny', "Hank's got feelin's!"); } });
    const crow = (b, d, golden, land) => {
      const start = B.at(b, d), mid = B.at(b * .5 - 4, (d + 26) / 2), end = land ? B.at(-4 + (B.r.f() - .5) * 2, 26) : B.at(b < 0 ? 50 : -50, 70);
      const path = new APath([start, mid, end]), rig = new E.Bird({ kind: golden ? 'golden' : 'crow', seed: B.r.int(1, 99) });
      return B.add({ kind: 'crow', golden, points: golden ? 500 : 100, path, d: 0, speed: (golden ? 13 : 9) * M, z0: 0, z1: land ? 1.7 : 6, hump: (6 + B.r.f() * 5) * M, x: start.x, y: start.y, z: start.z, rig, r: .55 * M, life: 9, box: [10, 10],
        update: (T2, dt) => {
          if (T2.sitting) { T2.sitT -= dt; T2.flap = 0; if (T2.sitT <= 0) { T2.sitting = false; T2.flap = 1; T2.path = new APath([{ x: T2.x, y: T2.y }, B.at(b < 0 ? 55 : -55, 80)]); T2.d = 0; T2.z0 = 1.7; T2.z1 = 14; T2.hump = 0; } return; }
          T2.d += T2.speed * dt; const p = T2.path.at(T2.d), u = clamp(T2.d / T2.path.len, 0, 1); T2.vx = (p.x - T2.x) / dt; T2.vy = (p.y - T2.y) / dt; T2.x = p.x; T2.y = p.y; T2.z = H.world.height(p.x, p.y) + lerp(T2.z0, T2.z1, u) * M + Math.sin(u * Math.PI) * T2.hump; T2.heading = p.angle;
          if (u >= 1) { if (land && !T2.landed) { T2.landed = true; T2.sitting = true; T2.sitT = 1.5; if (G.sfx) G.sfx.critter('caw', T2); } else T2.gone = true; }
        },
        draw: (g, ox, oy, k, view) => rig.draw(g, ox, oy, view), drawDead: (g, ox, oy, k, view, T2) => { if (T2.deadT < .2) FXW.burst(T2.x, T2.y, T2.z, 10, 'feather', { g: 2 * M, life: 1.4 }); },
        onHit: (T2) => { T2.alive = false; FXW.burst(T2.x, T2.y, T2.z, 12, T2.golden ? 'gold' : 'feather', { g: 2 * M, life: 1.5 }); if (G.sfx) G.sfx.play('flap'); } });
    };
    yield .4; if (G.sfx) G.sfx.critter('caw', B.at(0, 60));
    const waves = [[2, -20], [3, 10], [2, 26], [4, -8], [3, 18], [5, 0]];
    for (let w = 0; w < waves.length && B.t < 27; w++) {
      const [n, b0] = waves[w];
      for (let i = 0; i < n; i++) { crow(b0 + (i - n / 2) * 7 + B.r.range(-3, 3), 52 + B.r.f() * 60, false, i === 0 && w % 2 === 0); yield .25; }
      if (w === 3) crow(-30, 90, true, false);
      yield 3.2 + B.r.f();
    }
    yield E.until(() => B.t >= 30);
  }
});
def('bonus', 'saucer-season', {
  hunt: 'bugle', name: 'Saucer Season', host: 'loretta', blurb: 'Clays from the trap house. Pull!', rules: 'CLAYS 75 · GOLDEN CLAY 500', vantage: 'traphouse', time: 30, tube: 12, bearing: 0, pitch: 1, fov: 36,
  timeline: function* (B) {
    const H = B.H, L = (from, b, speed, up, golden) => {   // a clay thrown from a house at `from` toward bearing b
      const o = B.at(from[0], from[1], from[2] || .8), a = (H.world.vant[B.def.vantage].yaw + b) * DEG, sp = speed * M;
      if (G.sfx) G.sfx.play('throw');
      return B.add({ kind: 'clay', golden, points: golden ? 500 : 75, x: o.x, y: o.y, z: o.z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: up * M, g: 9.8 * M * .55, r: .32 * M, big: 1.5, life: 5, box: [8, 6], draw: drawClay, drawDead: drawShards, onHit: (T2) => { T2.alive = false; if (G.sfx) G.sfx.play('clay'); FXW.burst(T2.x, T2.y, T2.z, 10, T2.golden ? 'gold' : 'clay', { g: 6 * M, life: .9, size: .06 }); } });
    };
    const house = [0, 16, .3], left = [-28, 22, 3], right = [28, 22, 3], tower = [34, 30, 12];
    yield .6; Barks.caption('loretta', 'Pull!');
    const seq = [['single', 2], ['single', 2.2], ['double', 2.6], ['cross', 2.8], ['single', 2], ['tower', 2.8], ['double', 2.6], ['cross', 2.6], ['golden', 2.6], ['double', 2.4], ['tower', 2.4]];
    for (const [kind, gap] of seq) {
      if (B.t > 27) break;
      if (kind === 'single') L(house, B.r.range(-25, 25), 22, 9);
      else if (kind === 'double') { L(house, B.r.range(-30, -8), 21, 8.5); L(house, B.r.range(8, 30), 21, 9.5); }
      else if (kind === 'cross') { L(left, 55, 20, 7); yield .25; L(right, -55, 20, 7); }
      else if (kind === 'tower') L(tower, -70, 14, 2);
      else if (kind === 'golden') { L(house, B.r.range(-10, 10), 26, 10, true); }
      yield gap;
    }
    yield E.until(() => B.t >= 30);
  },
  decor(H, items) {}
});
def('bonus', 'snowball-standoff', {
  hunt: 'muskeg', name: 'Snowball Standoff', host: 'earl', blurb: 'The snowmen want revenge. Shoot first.', rules: 'SNOWBALLS 75 · HATS 150 · THE SNOWMOOSE 1000', vantage: 'earlFire', time: 30, tube: 12, bearing: 0, pitch: 3, fov: 34,
  timeline: function* (B) {
    const H = B.H, spots = [[-26, 28], [-10, 34], [8, 30], [24, 36], [-18, 44], [16, 46]];
    const snowman = (spot) => {
      const w = B.at(spot[0], spot[1]);
      const S2 = B.add({ kind: 'snowman', points: 0, counts: false, x: w.x, y: w.y, z: w.z, rise: 0, life: 7, hat: true, box: [20, 46], r: .5 * M,
        zones: T2 => T2.rise > .6 && !T2.hatOff ? [{ a: [T2.x, T2.y, T2.z + 2.35 * M], r: .38 * M }] : [],
        update: (T2, dt) => { T2.rise = T2.t < .5 ? T2.t / .5 : T2.t > 5.5 ? Math.max(0, 1 - (T2.t - 5.5) / .5) : 1; if (T2.t > 1.2 && !T2.thrown) { T2.throwT = Math.min(1, (T2.throwT || 0) + dt / .6); if (T2.throwT >= 1) { T2.thrown = true; T2.throwT = 0; ball(T2); } } if (T2.t > 3.6 && !T2.thrown2 && T2.rise >= 1) { T2.thrown2 = true; ball(T2); } },
        draw: drawSnowman, onHit: (T2, B2, p, pt) => { if (T2.hatOff) return; T2.hatOff = true; T2.points = 0; B.taken++; hatFly(T2); if (G.sfx) G.sfx.play('bonk'); }, points: 150 });
      B.scoreable++; S2.counts = false;
      return S2;
    };
    const hatFly = (T2) => B.add({ kind: 'hat', counts: false, points: 0, x: T2.x, y: T2.y, z: T2.z + 2.3 * M, vx: 0, vy: 0, vz: 6 * M, g: 9.8 * M, life: 1.4, draw: drawTopHat, zones: () => [] });
    const ball = (from) => {   // a snowball lobbed at the camera: shoot it in the air or wear it
      const c = H.cam, o = { x: from.x, y: from.y, z: from.z + 1.8 * M }, tgt = { x: c.x + (B.r.f() - .5) * 2 * M, y: c.y + (B.r.f() - .5) * 2 * M, z: c.z - .2 * M }, v = E.arc(o, tgt, 9.8 * M, { time: 1.7 });
      if (G.sfx) G.sfx.play('throw');
      return B.add({ kind: 'snowball', points: 75, x: o.x, y: o.y, z: o.z, vx: v.vx, vy: v.vy, vz: v.vz, g: 9.8 * M, r: .22 * M, big: 1.6, life: 1.9, draw: drawSnowball, box: [6, 6],
        onHit: (T2) => { T2.alive = false; FXW.burst(T2.x, T2.y, T2.z, 12, 'snow', { g: 6 * M, life: .8 }); if (G.sfx) G.sfx.play('splat', { vol: .6 }); },
        onGone: (T2) => { if (T2.t > 1.5) { H.splats.push({ x: H.W * (.25 + B.r.f() * .5), y: H.H * (.25 + B.r.f() * .45), r: 40 + B.r.f() * 30, t: 0, dur: 2, seed: B.r.f() * 6 }); if (G.sfx) G.sfx.play('splat'); B.misses += 0; } } });
    };
    yield .6;
    const order = [0, 3, 1, 4, 2, 5, 0, 2, 4, 1, 3, 5];
    for (let i = 0; i < order.length && B.t < 26; i++) {
      snowman(spots[order[i]]); if (i % 3 === 2) { yield .4; snowman(spots[(order[i] + 2) % spots.length]); }
      yield 1.5 + B.r.f() * .6;
      if (B.t >= 20 && !B.moose) {   // the Snowmoose rises from the big drift
        B.moose = true; const w = B.at(0, 52), rig = new E.Quadruped({ species: 'moose', sex: 'm', antlers: { points: 12, spread: 60, seed: 5 }, size: 1.6 });
        const SM = B.add({ kind: 'snowmoose', counts: false, points: 0, x: w.x, y: w.y, z: w.z - 3 * M, rig: null, life: 12, box: [80, 90], rise: 0, update: (T2, dt) => { T2.z = Math.min(w.z, T2.z + dt * 2.5 * M); rig.update(dt, { x: T2.x, y: T2.y, z: T2.z, vx: 0, vy: 0, facing: (H.world.vant.earlFire.yaw + 180) * DEG, ground: () => T2.z, alert: 1, call: Math.sin(T2.t * 1.4) > .6 ? 1 : 0 }); }, draw: drawSnowmoose, zones: () => [] });
        SM.rig = rig; rig.update(0, { x: w.x, y: w.y, z: w.z - 3 * M, ground: () => w.z - 3 * M, facing: (H.world.vant.earlFire.yaw + 180) * DEG });
        if (G.sfx) G.sfx.call('moose', null, 1.2); Barks.caption('earl', 'THE SNOWMOOSE! AIM FOR THE HAT!');
        B.add({ kind: 'tophat', points: 1000, x: w.x, y: w.y, z: w.z, life: 10, hs: 2.2, r: .7 * M, big: 1.3, update: (T2) => { const J = rig.J.skull; if (J) { const s = 1; T2.x = SM.x + J[0] * s; T2.y = SM.y + J[1] * s; T2.z = SM.z + J[2] * s + 1.4 * M; } }, draw: drawTopHat, box: [20, 20], onHit: (T2) => { T2.alive = false; hatFly(T2); if (G.sfx) G.sfx.sting('fanfare'); HUD.banner('HAT TRICK!', { scale: 3 }); } });
      }
    }
    yield E.until(() => B.t >= 30);
  }
});
