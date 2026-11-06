/* activities/jog.js: Coastal Jog. Alternate left and right to set a cadence, lean to steer, stay in Marisol's zone. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game, lib = G.lib;
const txt = (...a) => G.txt(...a);
const SEG = 200, CAM_H = 900;
let ROAD = {};
const viewCache = new Map();
const scaleView = k => { const key = Math.max(1, Math.round(k * 8)); if (!viewCache.has(key)) viewCache.set(key, new E.View('wt' + key, 'wt', 0, 18, key / 8)); return viewCache.get(key); };
G.scaleView = scaleView;
function buildRoad(tierIdx, len) {
  const key = tierIdx + ':' + len; if (ROAD[key]) return ROAD[key];
  const J = G.DATA.courses.jog, road = new E.Road({ segment: SEG, lanes: 2, draw: 150, fog: null, height: CAM_H, sky: new E.Backdrop('ocean'),
    colors: { road: ['#e6d3af', '#dcc8a2'], grass: ['#f2e6c4', '#ead9b2'], rumble: ['#fbfdfd', '#7fd8ea'], lane: '#fbfdfd' } });
  for (const [n, o] of J.stretches) road.add(Math.round(n * len), Object.assign({}, o));
  const PALM = E.prop('palm').frames[0], BUSH = E.prop('bush').frames[0], ROCK = E.prop('rock', { size: 2 }).frames[0];
  const bungalow = { w: 1300, draw(g, x, y, s) { const W = 1300 * s, H = 800 * s; if (W < 3) return; px.rect(g, x - W / 2, y - H, W, H, '#fbf6ec'); px.poly(g, [[x - W * .6, y - H], [x + W * .6, y - H], [x, y - H * 1.7]], '#ff9a7a'); px.rect(g, x - W * .14, y - H * .7, W * .28, H * .7, '#c49c6c'); if (W > 10) px.rect(g, x + W * .22, y - H * .75, W * .18, H * .3, '#a8e4f2'); } };
  const louBench = { w: 900, draw(g, x, y, s) { const W = 900 * s; if (W < 4) return; px.rect(g, x - W / 2, y - W * .34, W, W * .08, '#c49c6c'); px.rect(g, x - W * .45, y - W * .26, W * .05, W * .26, '#7a8a94'); px.rect(g, x + W * .4, y - W * .26, W * .05, W * .26, '#7a8a94'); px.ell(g, x - W * .08, y - W * .42, W * .3, W * .1, '#9aa8b0'); px.disc(g, x + W * .28, y - W * .46, W * .09, '#e8bd96'); if (W > 40) txt(g, 'z', x + W * .36, y - W * .7 - Math.sin(game.real * 2) * 4, '#5f7f8a'); } };
  const pier = { w: 1400, draw(g, x, y, s) { const W = 1400 * s; if (W < 4) return; px.rect(g, x - W / 2, y - W * .25, W, W * .05, '#b89a72'); for (let i = 0; i < 5; i++) px.rect(g, x - W / 2 + i * W / 4 - W * .015, y - W * .25, W * .03, W * .25, '#8a6a4a'); px.rect(g, x - W * .3, y - W * .55, W * .02, W * .3, '#6a7a84'); px.rect(g, x - W * .34, y - W * .58, W * .1, W * .04, '#ffe7a8'); } };
  const signOf = text => ({ w: 700, draw(g, x, y, s) { const W = 700 * s, H = 340 * s; if (W < 3) return; px.rect(g, x - W * .03, y - H * 2, W * .06, H * 2, '#7a8a94'); px.rect(g, x - W / 2, y - H * 2.2, W, H, '#fbfdfd'); if (W > 44) txt(g, text, x, y - H * 1.9, '#14a8c8', { align: 'center' }); } });
  const total = road.length;
  for (let z = 600; z < total; z += SEG * 3) { const i = z / (SEG * 3) | 0, side = i % 2 ? 1 : -1, v = (i * 7919) % 100;
    if (i % 17 === 5) road.place(z, side * 1.9, bungalow, 1);
    else if (i % 23 === 9) road.place(z, side * 1.6, louBench, 1);
    else if (i % 29 === 13) road.place(z, side * 2.1, pier, 1);
    else if (i % 31 === 21) road.place(z, side * 1.5, signOf('Gently'), 1);
    else if (v < 45) road.place(z, side * (1.5 + v / 100), PALM, 60);
    else if (v < 70) road.place(z, side * (1.5 + v / 150), BUSH, 40);
    else if (v < 80) road.place(z, side * (1.7 + v / 150), ROCK, 40);
  }
  return (ROAD[key] = { road, ahead: road.ahead(CAM_H) });
}
const BOT = { poor: { cad: 2.45, jit: .5, steer: .6, seen: 1800 }, average: { cad: 3, jit: .28, steer: 1, seen: 2600 }, good: { cad: 3, jit: .14, steer: 1.4, seen: 3400 }, expert: { cad: 3, jit: .05, steer: 2, seen: 4000 } };
G.family('jog', {
  camera: { zoom: false },
  setup(ctx) {
    const { tier } = ctx, J = G.DATA.courses.jog, B = buildRoad(ctx.tierIdx, tier.length);
    ctx.road = B.road; ctx.ahead = B.ahead; ctx.turn = 0; ctx.things = []; ctx.finishZ = ctx.road.length - 40 * SEG; ctx.sTotal = 0;
    /* pigeons, joggers, cups: from the seeded stream */
    let z = 1800; const rng = ctx.rng, cups = [];
    while (z < ctx.finishZ - 400) { const pick = rng(), x = (rng() - .5) * 1.5;
      if (pick < .52) cups.push({ z, x: (rng() - .5) * 1.5, kind: 'cup' });
      else if (pick < .52 + .4 * tier.pigeons) ctx.things.push({ z, x, kind: 'pigeons', flock: 3 + Math.floor(rng() * 3), t: 0 });
      else ctx.things.push({ z, x, kind: 'jogger', v: 0.45 + rng() * .25, col: ['#f08fb0', '#6fcf8e', '#f5c84b', '#b08be0'][Math.floor(rng() * 4)], rigK: rng() });
      z += 1100 + rng() * 800; }
    ctx.things.push(...cups); ctx.things.sort((a, b) => a.z - b.z); ctx.cupsTotal = cups.length;
    ctx.rigs = {};
    for (const c of ctx.contestants) { c.z = 0; c.xr = 0; c.cad = 0; c.lastFoot = 0; c.lastStep = -9; c.zone = 0; c.cups = 0; c.stitch = 0; c.over = 0; c.bump = 0; c.fly = []; c.bal = new G.Balance({ k: 20, c: 8, s: 0, A: .2, nf: 1, R: .3 }, c.rng); c.bal.cheat = true; c.nextFoot = -1; c.botT = 0; c.runT = 0; c.poser.clip('Run_Loop', { loop: true, fade: 0, tgt: -1.57 }); }
  },
  preview(dt, ctx) { if (ctx.done) return; const c = ctx.contestants[0]; c.poser.clip('Waiting_Loop', { loop: true, tgt: -1.57 }); c.poser.update(dt); c.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: c.poser.facing }); game.focus(0, 0, 0); ctx.pv = (ctx.pv || 0) + dt * 200; },
  update(dt, ctx) {
    const d = G.DEV, band = ctx.tier.band || 1, mid = (d.jogLo + d.jogHi) / 2, half = (d.jogHi - d.jogLo) / 2 * band, lo = mid - half, hi = mid + half; ctx.lo = lo; ctx.hi = hi; game.focus(0, 0, 0);
    for (const c of ctx.contestants) {
      const I = c.intent;
      /* a step counts only when feet alternate */
      if (I.paceL && c.lastFoot !== -1) { c.lastFoot = -1; G.jogStep(ctx, c); }
      if (I.paceR && c.lastFoot !== 1) { c.lastFoot = 1; G.jogStep(ctx, c); }
      const since = ctx.time - c.lastStep; if (since > .55) c.cad = Math.max(0, c.cad - dt * 3.2);
      if (c.cad > 4.2) { c.over += dt; if (c.over >= 2 && c.stitch <= 0) { c.stitch = 3; c.over = 0; if (G.cue(ctx, c)) { G.A.sfx('stumble'); G.mutter('marisol', G.DATA.lines.regulars.marisol.stitch, { auto: 2.6 }); if (c.input) c.input.rumble(.6, .3); } } } else c.over = 0;
      if (c.stitch > 0) c.stitch -= dt;
      const hobble = c.stitch > 0, v = (hobble ? .35 : 1) * (c.bump > 0 ? .5 : 1) * Math.min(c.cad, 4.6) * 390 * d.jogSpeed;
      if (!hobble && c.cad >= lo && c.cad <= hi) c.zone += dt;
      c.runT += dt; c.z += v * dt; c.bump = Math.max(0, c.bump - dt);
      /* steer: the road bends gently against you */
      c.bal.step(dt, I.x, 0);
      const pct = Math.min(1, v / 1200); c.xr += c.bal.x * dt * 1.5 * Math.min(1, pct * 2 + .1); c.xr -= ctx.road.curveAt(c.z + ctx.ahead) * pct * pct * dt * .22; c.xr = clamp(c.xr, -1.05, 1.05);
      ctx.turn += ctx.road.curveAt(c.z) * v * dt * .004 / ctx.contestants.length;
      /* what you meet */
      for (const q of ctx.things) {
        if (q.done) continue; const dz = q.z - (c.z + ctx.ahead);
        if (dz < -400) { if (q.kind === 'jogger' && !q.passed) q.passed = true; continue; }
        if (dz > 300) continue;
        if (q.kind === 'cup' && Math.abs(q.x - c.xr) < .24 && Math.abs(dz) < 240) { q.done = true; c.cups++; if (G.cue(ctx, c)) { G.A.sfx('cup'); } }
        if (q.kind === 'pigeons' && !q.t && Math.abs(q.x - c.xr) < .26 && Math.abs(dz) < 240) { q.t = .01; c.bump = .7; if (G.cue(ctx, c)) { G.A.sfx('pigeon'); if (c.input) c.input.rumble(.3, .15); } }
        if (q.kind === 'jogger' && Math.abs(q.x - c.xr) < .22 && Math.abs(dz) < 200 && c.bump <= 0) { c.bump = .8; c.xr += c.xr < q.x ? -.2 : .2; if (G.cue(ctx, c)) { G.A.sfx('thud'); } }
      }
      const P = c.poser, k = c.cad / 3;
      if (hobble) P.clip('Dizzy', { loop: true, tgt: -1.57, fade: .2 }); else if (c.cad < .6) P.clip('Waiting_Loop', { loop: true, tgt: -1.57, fade: .2 }); else P.clip('Run_Loop', { loop: true, tgt: -1.57, fade: .2 });
      if (P.cur) P.cur.speed = clamp(k, .3, 1.8);
      P.update(dt); c.rig.wob = [c.bal.x * .35, 0]; c.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: P.facing, expr: hobble ? 'wince' : 'smile' });
      if (c.z >= ctx.finishZ - ctx.ahead) { c.fin = true; }
    }
    for (const q of ctx.things) { if (q.kind === 'jogger') q.z += 1170 * q.v * dt; if (q.kind === 'pigeons' && q.t) q.t += dt; }
    G.jogCrowd(dt);
    if (ctx.contestants.every(c => c.fin)) ctx.finished = true;
    if (ctx.local) { const me = ctx.local; ctx.pz = me.z; ctx.px = me.xr; } else { ctx.pz = ctx.contestants[0].z; ctx.px = ctx.contestants[0].xr; }
  },
  result(ctx, c) { const zone = c.runT > 0 ? c.zone / c.runT : 0, cup = ctx.cupsTotal ? c.cups / ctx.cupsTotal : 0, progress = clamp((c.z + ctx.ahead) / ctx.finishZ, 0, 1); return { pct: (.7 * zone + .3 * cup) * (ctx.durGiven ? 1 : Math.min(1, progress * 1.1)), detail: 'In the zone ' + Math.round(zone * 100) + '%. Water ' + c.cups + ' of ' + ctx.cupsTotal + '.' }; },
  bot(ctx, c, dt) {
    const B = BOT[c.brain.skill], I = c.intent; c.botT -= dt; I.paceL = I.paceR = false;
    if (c.botT <= 0) { const cad = B.cad + B.jit * Math.sin(ctx.time * .6 + c.i); c.botT = 1 / cad; c.nextFoot = -c.nextFoot; if (c.nextFoot < 0) I.paceL = true; else I.paceR = true; }
    /* look ahead: go for the next cup, away from the next thing in the way */
    let want = 0, avoid = 0, wantD = 1e9; const zz = c.z + ctx.ahead;
    for (const q of ctx.things) { if (q.done || q.t) continue; const dz = q.z - zz; if (q.kind === 'cup' && want && dz > wantD) continue; if (q.kind === 'cup' && dz > 100) wantD = dz; if (dz < 100 || dz > B.seen) continue; if (q.kind === 'cup') { if (!want) want = q.x; } else if (Math.abs(q.x - c.xr) < .34) avoid = (c.xr >= q.x ? 1 : -1) * .8; }
    const tx = avoid ? c.xr + avoid : (want || 0); I.x = clamp((tx - c.xr) * 1.6 * B.steer, -1, 1); I.y = 0;
  },
  ghost(ctx, c) { return { z: Math.round(c.z), x: +c.xr.toFixed(2), c: +c.cad.toFixed(1) }; },
  draw(r, ctx) {
    const pz = ctx.live || ctx.pz ? (ctx.pz || 0) : (ctx.pv || 0), px0 = ctx.px || 0, W = r.W, H = r.H;
    const cars = [];
    for (const q of ctx.things) { if (q.done) continue; const dz = q.z - pz; if (dz < 0 || dz > 26000) continue; cars.push(Object.assign(q, { w: q.kind === 'cup' ? 200 : q.kind === 'jogger' ? 300 : 500, draw: q.drawFn || (q.drawFn = G.jogThing(q)) })); }
    const ghosts = G.jogGhosts ? G.jogGhosts(ctx) : []; for (const gh of ghosts) cars.push(gh);
    ctx.road.draw(r, { z: pz, x: px0, h: CAM_H, turn: ctx.turn, cars });
    r.overlay(g => {
      for (const c of ctx.contestants) {
        if (!c.local && ctx.local) continue;
        const p = ctx.road.project(c.z + ctx.ahead, c.xr, 0); if (!p) continue; const sx = p[0], sy = p[1], k = Math.max(1, H / 150) * .8, v = scaleView(k);
        px.ell(g, sx, sy - 16, 14 * k, 4 * k, '#20404c44');
        c.rig.draw(g, Math.round(sx), Math.round(sy) - 16, v);
      }
    });
  },
  hud(g, ctx) {
    if (!ctx.live) return;
    const W = game.W, H = game.H, c = ctx.local || ctx.contestants[0];
    G.drawTimer(g, G.left(ctx), { x: 36 });
    /* the calm gauge: Marisol's pacing zone */
    const gx = W / 2 - 76, gy = 22, gw = 152, mx = 5.2, xOf = v => gx + clamp(v / mx, 0, 1) * gw;
    G.panel(g, gx - 8, gy - 16, gw + 16, 36, { r: 8 });
    px.rect(g, gx, gy, gw, 8, '#e8f0f2'); px.rect(g, xOf(ctx.lo), gy, xOf(ctx.hi) - xOf(ctx.lo), 8, '#7fe0c3'); px.rect(g, xOf(4.2), gy, gx + gw - xOf(4.2), 8, '#ffc0ac');
    const n = xOf(c.cad); px.rect(g, n - 1, gy - 3, 3, 14, '#20404c'); px.disc(g, n, gy - 4, 3, c.color || '#ff7a59');
    const word = c.stitch > 0 ? 'A stitch' : c.cad < ctx.lo ? (c.cad < .6 ? 'Standing' : 'A little faster') : c.cad > 4.2 ? 'Far too fast' : c.cad > ctx.hi ? 'Slow down' : "Marisol's pace";
    txt(g, word, W / 2, gy - 13, c.cad >= ctx.lo && c.cad <= ctx.hi ? '#14a8c8' : '#e0553a', { align: 'center' });
    txt(g, c.cad.toFixed(1) + ' steps a second', W / 2, gy + 10, '#5f7f8a', { align: 'center' });
    /* progress and water */
    G.panel(g, W - 92, 8, 84, 28, { r: 7 }); txt(g, 'Water ' + c.cups + ' / ' + ctx.cupsTotal, W - 50, 11, '#14a8c8', { align: 'center' });
    const pr = clamp((c.z + ctx.ahead) / ctx.finishZ, 0, 1); E.ui.bar(g, W - 86, 23, 72, 6, pr, '#2cc6e6', { bg: '#e8f0f2' });
    G.prompts(g, [['paceL', 'Left'], ['paceR', 'Right']]);
  }
});
G.jogStep = (ctx, c) => {
  const now = ctx.time, iv = now - c.lastStep; c.lastStep = now;
  if (iv > 0 && iv < 2) { const inst = 1 / iv; c.cad = c.cad <= 0 ? inst * .7 : c.cad + (inst - c.cad) * .32; } else c.cad = Math.max(c.cad, 1);
  if (G.cue(ctx, c)) G.A.sfx('click', { vol: .4 });
};
/** the other joggers: Regulars, on the same run */
const CROWD = {};
G.jogRig = q => { const id = ['kevin', 'twin1', 'twin2', 'okafor'][Math.floor(q.rigK * 4) % 4]; if (!CROWD[id]) { const r = G.regularRig(id, 1.05); CROWD[id] = r; r.poser = new G.Poser(r); r.poser.clip('Run_Loop', { loop: true, tgt: -1.57, fade: 0 }); } return CROWD[id]; };
G.jogCrowd = dt => { for (const k in CROWD) { const r = CROWD[k]; r.poser.update(dt); r.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: r.poser.facing, expr: 'smile' }); } };
G.jogThing = q => {
  if (q.kind === 'cup') return (g, x, y, s) => { const W = 200 * s; if (W < 2) return; const h = W * 1.3; px.rect(g, x - W * .8, y - W * 2.4, W * 1.6, W * .2, '#c49c6c'); px.rect(g, x - W * .08, y - W * 2.4, W * .16, W * 2.4, '#a57f54'); px.poly(g, [[x - W * .34, y - W * 2.4 - h * .8], [x + W * .34, y - W * 2.4 - h * .8], [x + W * .24, y - W * 2.4], [x - W * .24, y - W * 2.4]], '#a8e4f2'); px.rect(g, x - W * .34, y - W * 2.4 - h * .8, W * .68, Math.max(1, W * .1), '#ffffff'); };
  if (q.kind === 'pigeons') { const birds = []; for (let i = 0; i < q.flock; i++) birds.push({ a: i * 2.4, r: (i % 3) * 90 + 50, b: G.makeBird('pigeon') }); return (g, x, y, s) => { const W = 120 * s; if (W < 1) return; const k = Math.min(3, Math.max(.3, W / 5)), up = q.t ? q.t * 1800 * s : 0; for (const b of birds) { const bx = x + Math.cos(b.a) * b.r * s + (q.t ? Math.cos(b.a) * q.t * 900 * s : 0), by = y - up - (q.t ? Math.sin(b.a) * 300 * s * q.t : 0); b.b.update(1 / 60, { flap: q.t ? 1 : 0 }); b.b.draw(g, Math.round(bx), Math.round(by), scaleView(k)); } }; }
  const rig = G.jogRig(q);
  return (g, x, y, s) => { const W = 300 * s; if (W < 2) return; const k = Math.min(3, W / 10); px.ell(g, x, y, W * .8, W * .22, '#20404c33'); rig.draw(g, Math.round(x), Math.round(y), scaleView(k)); };
};
})();
