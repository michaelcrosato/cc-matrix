/* OLYMPIYIKES! — Glory Curling Club, the CURLING gold medal match (§6.11): aim, curl, weight, sweep; a CPU skip that plans by simulation. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, clamp = E.clamp;
const M = 12, HOG1 = 6, HOG2 = 22, TEE = 27, BACK = 28.8, HALF = 2.375, R = .3, HOUSE = 1.83, OX = 20, OY = 60;
const W = (x, y) => [OX + x * M, OY + y * M];
const sheetTex = (x, y) => {
  const mx = (x - OX) / M, my = (y - OY) / M, n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
  if (Math.abs(my) > HALF + .25 || mx < -1 || mx > BACK + 1.5) return [150 + n * 20, 100 + n * 14, 60 + n * 10];   // the club's wood floor
  if (Math.abs(my) > HALF) return [60, 70, 110];
  for (const cx of [TEE, 1.8]) { const d = Math.hypot(mx - cx, my); if (d < HOUSE) { if (d < .15) return [240, 240, 250]; if (d < .61) return [210, 60, 60]; if (d < 1.22) return [244, 246, 250]; return [60, 110, 210]; } }
  if (Math.abs(mx - HOG1) < .06 || Math.abs(mx - HOG2) < .06) return [200, 50, 60];
  if (Math.abs(mx - TEE) < .03 || Math.abs(mx - BACK) < .03 || Math.abs(my) < .02 && mx > HOG2) return [40, 40, 60];
  const g = 232 + n * 10 + (E.hash2(Math.floor(x / 2), Math.floor(y / 2)) > .97 ? -14 : 0); return [g - 6, g, g + 8];
};
let smap = null;
const sheet = () => { if (smap) return smap; const cols = Math.ceil((OX + (BACK + 3) * M) / 16), rows = Math.ceil((OY + (HALF + 3) * M) / 16), Rw = []; for (let y = 0; y < rows; y++) Rw.push('.'.repeat(cols)); smap = new E.TileMap({ rows: Rw, legend: { '.': { floor: 'ice' } }, floorTex: sheetTex, outside: '#5a3a24', ao: 0, types: {} }); return smap; };

/* ---- the ice: stones, friction, curl, collisions ---- */
function stepIce(stones, dt, T, sweep, thrown) {
  for (const s of stones) {
    if (s.out) continue; const v = Math.hypot(s.vx, s.vy); if (v < 1e-4) { s.vx = s.vy = 0; continue; }
    const sw = s === thrown ? sweep : 0, mu = T.mu * (1 - T.sweepCut * sw), ux = s.vx / v, uy = s.vy / v;
    const dec = Math.min(v, mu * 9.81 * dt); s.vx -= ux * dec; s.vy -= uy * dec;
    const curl = s.spin * T.curlK / (v + .5) * Math.min(1, v * 4) * (1 - .5 * sw) * dt; s.vx += -uy * curl; s.vy += ux * curl;
    s.x += s.vx * dt; s.y += s.vy * dt; s.moved = true;
  }
  let clacks = [];
  for (let i = 0; i < stones.length; i++) for (let j = i + 1; j < stones.length; j++) {
    const a = stones[i], b = stones[j]; if (a.out || b.out) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 2 * R || d < 1e-6) continue;
    const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    const ov = (2 * R - d) / 2; a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    if (rel <= 0) continue; const imp = rel * (1 + .85) / 2;
    a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; b.hit = true; a.hit = true; clacks.push([a, b, rel]);
  }
  for (const s of stones) if (!s.out && (Math.abs(s.y) > HALF - R * .2 || s.x > BACK + R)) { s.out = true; s.vx = s.vy = 0; }
  return clacks;
}
const moving = stones => stones.some(s => !s.out && Math.hypot(s.vx, s.vy) > 1e-3);
/** the end's score now: [team, points] (team 0/1, or null) */
function endScore(stones) {
  const ins = stones.filter(s => !s.out && Math.hypot(s.x - TEE, s.y) <= HOUSE + R).map(s => ({ s, d: Math.hypot(s.x - TEE, s.y) })).sort((a, b) => a.d - b.d);
  if (!ins.length) return [null, 0];
  const t = ins[0].s.team, opp = ins.find(q => q.s.team !== t); let n = 0; for (const q of ins) { if (opp && q.d >= opp.d) break; if (q.s.team === t) n++; }
  return [t, n];
}
O.CurlingSim = { stepIce, endScore, TEE, HOUSE, HOG2, BACK };

function deliver(stones, team, aimY, w, spin, T) {
  const v0 = T.v0Base + T.v0Range * w, tx = TEE - HOG1, ty = aimY, d = Math.hypot(tx, ty);
  const s = { x: HOG1, y: 0, vx: v0 * tx / d, vy: v0 * ty / d, spin, team, out: false, id: stones.length };
  stones.push(s); return s;
}
function simulate(stones, team, aimY, w, spin, T, sweepPlan) {
  const st = stones.map(s => Object.assign({}, s)); const th = deliver(st, team, aimY, w, spin, T);
  let n = 0; while (moving(st) && n < 900) { stepIce(st, 1 / 20, T, sweepPlan && th.x < TEE - 2 ? sweepPlan : 0, th); n++; }
  for (const s of st) if (!s.out && s.x < HOG2 && !s.hit && s === th) s.out = true;
  return { st, th };
}
function evaluate(st, th, team) {
  const [t, n] = endScore(st); let v = t === team ? n * 10 : t === null ? 0 : -n * 10;
  if (!th.out) { const d = Math.hypot(th.x - TEE, th.y); if (d < HOUSE + R) v += 3 - d; else if (th.x > HOG2 && th.x < TEE - HOUSE && Math.abs(th.y) < 1) v += 1.2; }
  return v;
}

O.defEvent({
  id: 'curling', name: 'CURLING FINAL', short: 'Curling', season: 'winter', venue: 'Glory Curling Club', pictogram: 'curling', music: 'lounge', view: 'topdown', sport: 'curling', input: O.KEYS_MOUSE, lights: .6,
  format: { type: 'match' }, maxTime: 900, turbo: 'HYPER SWEEP!', matchEvent: true,
  measure: { better: 'higher', unit: '', fmt: v => String(v), wr: [6, 'MTP', 'ROCKY SUMMIT'] },
  points: v => v * 140,
  tune: { mu: [.019, .008, .04, .001, 'Ice friction'], sweepCut: [.35, 0, .7, .01, 'Sweep cuts friction'], curlK: [.05, 0, .15, .005, 'Curl'], weightHz: [1.1, .4, 2, .05, 'Weight meter (Hz)'],
    v0Base: [1.8, 1, 2.5, .01, 'Release speed base'], v0Range: [2, 1, 3, .05, 'Release speed range'], cpuNoise: [1, 0, 3, .05, 'CPU execution noise'] },
  howto: { goal: 'Two ends, four stones each. Closest to the button scores.', rows: [[['aim'], 'Aim the skip\'s broom'], [['mashL', 'mashR'], 'Curl: in-turn / out-turn'], [['action'], 'Start the slide, then release on the weight'], ['pair', 'Mash to SWEEP while it travels']] },
  yikesKinds: ['OVER-THROW SLIP!', 'OWN GOAL!'],
  laurel: { id: 'doubletake', name: 'DOUBLE TAKEOUT', text: 'Remove two opponent stones with one throw', test: (ctx, a) => !!a.S.double },
  hub: { ok: false }, attract: { seconds: 22, after: 3, setup(ctx) { const S = ctx.S; S.stones = [{ x: TEE - .3, y: .5, vx: 0, vy: 0, spin: 0, team: 1, out: false }, { x: TEE + .6, y: -.4, vx: 0, vy: 0, spin: 0, team: 1, out: false }, { x: TEE + 1.1, y: .9, vx: 0, vy: 0, spin: 0, team: 0, out: false }]; S.n = 5; S.turn = 0; S.attractShot = true; } },
  phases: [['end 2', ctx => { const S = ctx.S; S.end = 1; S.n = 0; S.stones = []; S.phase = 'aim'; }], ['last stone', ctx => { ctx.S.n = 7; ctx.S.phase = 'aim'; }]],
  build(ctx) { sheet(); },
  start(ctx) {
    const hum = ctx.athletes.filter(a => a.human), meet = ctx.meet;
    const A = hum[0] || ctx.athletes.find(a => a.pilot.cheat) || ctx.athletes[0];
    let B = hum.length > 1 && !meet.coop ? hum[1] : null;
    if (!B) { const pref = A.id === 'MTP' ? null : ctx.athletes.find(a => a.id === 'MTP'); B = pref || ctx.athletes.filter(a => a !== A && !a.human).sort((x, y) => y.nat.skills.curling - x.nat.skills.curling)[0]; }
    ctx.active = [A, B]; ctx.teams = [A, B];
    if (meet.coop && hum[1]) { ctx.sweeper = hum[1]; ctx.active.push(hum[1]); }
    for (const a of ctx.active) { a.S = { score: 0, double: false }; a.fin = false; }
    const r = ctx.rng('hammer');
    ctx.S = { end: 0, ends: 2, n: 0, hammer: r() < .5 ? 0 : 1, stones: [], phase: 'aim', aimY: 0, spin: 1, w: 0, wT: 0, slideX: 0, thrown: null, sweep: 0, scores: [[], []], planning: null, t: 0, msg: null, msgT: 0, over: false, overT: 0 };
    ctx.S.turn = 1 - ctx.S.hammer;
  },
  bot(ctx, a, dt, I) {
    const S = ctx.S, me = ctx.teams.indexOf(a);
    if (S.over) return I;
    if (S.turn !== me) { if (S.phase === 'travel' && S.thrownBy === me && S.botSweep) O.botMash(a, S.botSweep * 8, dt, I); return I; }
    if (S.phase === 'aim') {
      if (!S.plan) planShot(ctx, a, me);
      if (S.plan && S.plan.done) { const p = S.plan.best; const dy = p.aimY - S.aimY; I.mv = [clamp(dy * 2, -1, 1), 0]; if (Math.abs(dy) < .03) { if (S.spin !== p.spin) { if (p.spin < 0) I.L = true; else I.R = true; } else I.A = true; } }
      return I;
    }
    if (S.phase === 'slide') { const p = S.plan && S.plan.best; if (p && Math.abs(S.w - p.w) < .025 && S.wT > .1) I.A = true; return I; }
    if (S.phase === 'travel' && S.botSweep) O.botMash(a, S.botSweep * 8, dt, I);
    if (a.hype >= 1 && S.phase === 'travel') I.T = true;
    return I;
  },
  step(ctx, dt) {
    const S = ctx.S, T = ctx.T; S.t += dt;
    if (S.msgT > 0) S.msgT -= dt;
    if (S.over) { S.overT += dt; return; }
    const thrower = ctx.teams[S.turn], I = thrower.I || O.blankIntent();
    if (S.planning) continuePlan(ctx);
    if (S.phase === 'aim') {
      if (I.mouse && I.ptr && S._toWorld) { const w = S._toWorld(I.ptr); if (w) S.aimY = clamp(w[1], -HALF + .3, HALF - .3); }
      else S.aimY = clamp(S.aimY + I.mv[0] * 1.2 * dt, -HALF + .3, HALF - .3);
      if (I.L) { S.spin = -1; if (thrower.human) ctx.fx.sfx('select', { vol: .5 }); } if (I.R) { S.spin = 1; if (thrower.human) ctx.fx.sfx('select', { vol: .5 }); }
      if (I.A) { S.phase = 'slide'; S.wT = 0; S.slideX = 0; ctx.fx.sfx('swish'); }
    } else if (S.phase === 'slide') {
      S.wT += dt; const u = (S.wT * T.weightHz) % 2; S.w = u < 1 ? u : 2 - u; S.slideX = Math.min(HOG1 - .5, S.wT * 2.4);
      if (I.A && S.wT > .05 || S.slideX >= HOG1 - .5) {
        const w = S.w, s = deliver(S.stones, S.turn, S.aimY, w, S.spin, T); S.thrown = s; S.thrownBy = S.turn; S.phase = 'travel'; S.before = S.stones.filter(q => !q.out && q !== s).map(q => [q, q.team]);
        if (w >= .98 && !ctx.god(thrower)) { ctx.yikes(thrower, 'OVER-THROW SLIP!', 'slip'); s.vx *= 1.05; }
        ctx.fx.sfx('rumble'); S.plan = S.plan && S.plan.best ? S.plan : null;
        if (!thrower.human && S.plan && S.plan.best) { const nz = T.cpuNoise * (1 - ctx.skill(thrower)); s.vy += (ctx.rng('nz' + S.n)() * 2 - 1) * .15 * nz * .3; const k = 1 + (ctx.rng('nw' + S.n)() * 2 - 1) * .06 * nz; s.vx *= k; s.vy *= k; S.botSweep = S.plan.best.sweep; }
        else S.botSweep = 0;
      }
    } else if (S.phase === 'travel') {
      const sweeper = ctx.sweeper && S.thrownBy === 0 ? ctx.sweeper : ctx.teams[S.thrownBy];
      const sw = sweeper.turboT > 0 || ctx.teams[S.thrownBy].turboT > 0 ? 1 : clamp(sweeper.mash.rate / 8, 0, 1); S.sweep = sw;
      if (sweeper !== thrower && sweeper.I) { /* the co-op sweeper's mash fills its own meter */ }
      const cl = stepIce(S.stones, dt, T, S.thrown && S.thrown.x < TEE + 2 ? sw : 0, S.thrown);
      for (const [a, b, rel] of cl) if (rel > 2) { ctx.fx.sfx('clack'); const p = W(a.x, a.y); ctx.fx.P.sparks(p[0], p[1], 2, 6); } else ctx.fx.sfx('clack', { vol: .4 });
      if (!moving(S.stones)) settle(ctx);
    } else if (S.phase === 'between') {
      S.bT += dt; if (S.bT > 2.2 || (S.bT > .6 && (game.input.pressed('confirm')))) nextStone(ctx);
    }
    if (!ctx.sandbox) for (const a of ctx.active) animate(ctx, a, dt);
  },
  done(ctx) { return ctx.S.over && (ctx.S.overT > 3 || ctx.fast); },
  perf(ctx, a) { return a.S.score; },
  matchRows(ctx) { return O.matchRows(ctx, ctx.teams, ctx.teams.map(a => a.S.score), 'curling'); },
  camera(ctx) {
    const S = ctx.S; let x = TEE - 4, z = 1.6;
    if (S.phase === 'slide') { x = S.slideX + 6; z = 1.5; } else if (S.phase === 'travel' && S.thrown) { x = Math.max(HOG1 + 4, Math.min(TEE - 2, S.thrown.x)); z = S.thrown.x > HOG2 - 3 ? 2.3 : 1.4; } else if (S.phase === 'aim') { x = TEE - 6; z = 1.5; }
    const p = W(x, 0); game.focus(p[0], p[1], 0); game.setZoom(z);
  },
  draw(ctx, r) {
    r.sky(['#2a1a10', '#3a2414', '#4a2e18']);
    sheet().drawFloor(r);
    const S = ctx.S; if (!S.stones) return;
    S._toWorld = p => { if (!game.view.toGround) return null; const gnd = r.view && r.view.inv ? null : null; void gnd; const g = game.mouseGround ? game.mouseGround() : null; return g ? [(g[0] - OX) / M, (g[1] - OY) / M] : null; };
    // side boards, pennants, warm club lights
    for (const sd of [-1, 1]) r.queue(OX + BACK * M / 2, OY + sd * (HALF + .2) * M, 0, g => { const a = r.w(OX - 10, OY + sd * (HALF + .2) * M, 0), b = r.w(OX + (BACK + 2) * M, OY + sd * (HALF + .2) * M, 0); px.rect(g, Math.min(a[0], b[0]), a[1] - 3, Math.abs(b[0] - a[0]), 4, '#7a4a2a'); });
    for (let k = 0; k < 6; k++) game.lights.add(OX + k * 60, OY, 60, 110, .8, { color: '#ffd8a0' });
    const T1 = ctx.teams[0].nat.colors, T2 = ctx.teams[1].nat.colors;
    for (const s of S.stones) { if (s.out) continue; const p = W(s.x, s.y); r.queue(p[0], p[1], 0, g => { const q = r.w(p[0], p[1], 0), rr = Math.max(2, R * M * (game.zoom || 1)); px.disc(g, q[0], q[1] + 1, rr, '#3a3a44'); px.disc(g, q[0], q[1], rr, '#8a8a96'); px.disc(g, q[0], q[1], rr * .65, s.team === 0 ? T1.a : T2.a); px.rect(g, q[0] - rr * .4, q[1] - 1, rr * .8, 2, s.team === 0 ? T1.b : T2.b); }); }
    // the skip's broom target and the predicted path dots
    if (S.phase === 'aim' || S.phase === 'slide') {
      const b = W(TEE, S.aimY); r.queue(b[0], b[1], 0, g => { const q = r.w(b[0], b[1], 0); px.rect(g, q[0] - 1, q[1] - 6, 3, 12, '#5a3a1a'); px.rect(g, q[0] - 4, q[1] + 4, 9, 3, ctx.teams[S.turn].nat.colors.a); });
      for (let k = 1; k <= 9; k++) { const u = k / 30, p = W(HOG1 + (TEE - HOG1) * u, S.aimY * u); r.queue(p[0], p[1], 0, g => { const q = r.w(p[0], p[1], 0); px.rect(g, q[0], q[1], 2, 2, '#ffd060'); }); }
      const sx = S.phase === 'slide' ? S.slideX : 0, sp = W(sx + .5, 0);
      r.queue(sp[0], sp[1], 0, g => { const q = r.w(sp[0], sp[1], 0), rr = Math.max(2, R * M * (game.zoom || 1)); px.disc(g, q[0], q[1], rr, '#8a8a96'); px.disc(g, q[0], q[1], rr * .65, ctx.teams[S.turn].nat.colors.a); E.font.text(g, S.spin > 0 ? '↻' : '↺', q[0], q[1] - rr - 8, '#ffffff', { align: 'center', outline: false }); });
    }
    // the curlers
    for (const a of ctx.active) if (a.rig && a.cpos) r.actor(a.cpos[0], a.cpos[1], 0, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view));
    if (ctx.mascot) O.Art.drawMascot(r, ctx.mascot, OX + (BACK + 1.6) * M, OY - (HALF + .9) * M, 0);
  },
  hud(ctx, r, g) {
    O.HUD.header(g, r, ctx, 'END ' + (ctx.S.end + 1) + (ctx.S.end >= 2 ? ' (EXTRA)' : ' OF 2') + ' · STONE ' + (Math.floor(ctx.S.n / 2) + 1) + ' OF 4');
    const S = ctx.S; if (!ctx.teams) return;
    // the scoreboard
    const x = r.W - 150, y = 8; O.panel(g, x, y, 140, 38, { alpha: .9 });
    ctx.teams.forEach((a, k) => { const yy = y + 6 + k * 15; O.Art.flag(g, x + 6, yy, 14, 9, a.nat); O.text(g, a.nat.id + (S.hammer === k ? '•' : ''), x + 24, yy + 1, a.human ? (a.color || '#ffd060') : '#ffffff'); S.scores[k].forEach((v, e) => O.text(g, String(v), x + 64 + e * 12, yy + 1, '#c8d0f0')); O.text(g, String(a.S.score), x + 130, yy + 1, '#ffffff', { align: 'right', scale: 1 }); });
    // the house-cam inset
    const iw = 90, ih = 90, ix = r.W - iw - 10, iy = 54; px.rect(g, ix - 2, iy - 2, iw + 4, ih + 4, '#f2b632'); px.rect(g, ix, iy, iw, ih, '#e8eef6');
    const k = iw / 5, cx = ix + iw / 2, cy = iy + ih / 2; for (const [rr, c] of [[HOUSE, '#3a6ed2'], [1.22, '#f4f6fa'], [.61, '#d23c3c'], [.15, '#f4f6fa']]) px.disc(g, cx, cy, rr * k, c);
    for (const s of S.stones) if (!s.out && Math.abs(s.x - TEE) < 2.5) { px.disc(g, cx + (s.x - TEE) * k, cy + s.y * k, R * k, '#6a6a76'); px.disc(g, cx + (s.x - TEE) * k, cy + s.y * k, R * k * .6, s.team === 0 ? ctx.teams[0].nat.colors.a : ctx.teams[1].nat.colors.a); }
    const th = ctx.teams[S.turn];
    if (S.phase === 'slide') { const w = 160, bx = r.W / 2 - w / 2, by = r.H - 40; px.rect(g, bx, by, w, 10, '#2a3060'); px.rect(g, bx + w * .25, by, w * .2, 10, '#3a7cf0'); px.rect(g, bx + w * .45, by, w * .2, 10, '#4fe0a8'); px.rect(g, bx + w * .65, by, w * .35, 10, '#e8443a'); px.rect(g, bx + w * S.w - 1, by - 3, 3, 16, '#ffffff'); O.text(g, 'GUARD', bx + w * .35, by + 13, '#c8d0f0', { align: 'center', font: 'tiny' }); O.text(g, 'DRAW', bx + w * .55, by + 13, '#c8d0f0', { align: 'center', font: 'tiny' }); O.text(g, 'TAKEOUT', bx + w * .82, by + 13, '#c8d0f0', { align: 'center', font: 'tiny' }); if (th.human) O.Prompt.draw(g, r.W / 2, by - 18, 'action', { input: th.input, label: 'RELEASE', align: 'center' }); }
    if (S.phase === 'aim' && th.human) O.Prompt.strip(g, r, [['aim', 'Aim'], ['mashL', 'In-turn'], ['mashR', 'Out-turn'], ['action', 'Slide']], { input: th.input });
    if (S.phase === 'aim' && !th.human) O.text(g, S.plan && S.plan.done ? th.nat.id + ' SKIP CALLS THE SHOT' : th.nat.id + ' SKIP IS THINKING...', r.W / 2, r.H - 30, '#c8d0f0', { align: 'center' });
    if (S.phase === 'travel') { const sweeper = ctx.sweeper && S.thrownBy === 0 ? ctx.sweeper : ctx.teams[S.thrownBy]; O.text(g, 'SWEEP', 14, r.H - 44, '#ffffff'); O.HUD.power(g, 54, r.H - 43, 80, S.sweep, '#7fd8ff'); if (sweeper.human) { O.Prompt.pair(g, 14, r.H - 30, { input: sweeper.input, label: 'HURRY HARD!', phase: sweeper.mash.last === 'L' ? 1 : 0 }); O.HUD.flame(g, 140, r.H - 46, sweeper, sweeper.input); } }
    if (S.msgT > 0 && S.msg) O.text(g, S.msg, r.W / 2, r.H * .22, '#ffd060', { align: 'center', scale: 2 });
    if (S.over) { const wn = ctx.teams[0].S.score >= ctx.teams[1].S.score ? ctx.teams[0] : ctx.teams[1]; O.title(g, wn.nat.name + ' WINS!', r.W / 2, r.H * .35, 3); }
  },
  ghostState() { return [0, 0, 0, 0, 0]; }, ghostDraw() { return null; }
});
function planShot(ctx, a, me) {
  const S = ctx.S; S.plan = { list: [], i: 0, best: null, bestV: -1e9, done: false, me };
  for (let ai = 0; ai < 9; ai++) for (const w of [.3, .45, .52, .58, .75, .95]) for (const sp of [-1, 1]) S.plan.list.push({ aimY: -1.4 + ai * .35, w, spin: sp, sweep: w < .5 ? .6 : 0 });
  S.planning = true; if (ctx.fast || ctx.sandbox) while (S.planning) continuePlan(ctx);
  if (a.pilot.cheat === 'perfect' && S.attractShot) { S.plan.list = [{ aimY: .1, w: .95, spin: 1, sweep: 0 }]; }
}
function continuePlan(ctx) {
  const S = ctx.S, P = S.plan, T = ctx.T; if (!P) { S.planning = false; return; }
  for (let k = 0; k < 12 && P.i < P.list.length; k++, P.i++) { const c = P.list[P.i], res = simulate(S.stones, P.me, c.aimY, c.w, c.spin, T, c.sweep); const v = evaluate(res.st, res.th, P.me) + (ctx.rng('tie' + P.i)() * .01); if (v > P.bestV) { P.bestV = v; P.best = c; } }
  if (P.i >= P.list.length) { P.done = true; S.planning = false; }
}
function settle(ctx) {
  const S = ctx.S, th = S.thrown, by = ctx.teams[S.thrownBy];
  if (th && !th.out && th.x < HOG2 && !th.hit) { th.out = true; S.msg = 'HOGGED!'; S.msgT = 1.5; }
  // own goal / double takeout
  const before = S.before || []; let oppOut = 0, ownOut = 0; for (const [q, t] of before) if (q.out) { if (t === S.thrownBy) ownOut++; else oppOut++; }
  if (oppOut >= 2) { by.S.double = true; S.msg = 'DOUBLE TAKEOUT!'; S.msgT = 2; ctx.fx.say('curling'); ctx.hype(by, .4); }
  else if (ownOut >= 1 && oppOut === 0 && !ctx.god(by)) ctx.yikes(by, 'OWN GOAL!', 'owngoal');
  else if (th && !th.out && Math.hypot(th.x - TEE, th.y) < .5) { S.msg = 'ON THE BUTTON!'; S.msgT = 1.5; ctx.hype(by, .2); ctx.fx.say('curling'); }
  S.phase = 'between'; S.bT = 0; S.plan = null; S.thrown = null;
}
function nextStone(ctx) {
  const S = ctx.S; S.n++;
  if (S.n >= 8) {
    const [t, n] = endScore(S.stones);
    S.scores[0].push(t === 0 ? n : 0); S.scores[1].push(t === 1 ? n : 0);
    if (t !== null) { ctx.teams[t].S.score += n; S.hammer = 1 - t; S.msg = ctx.teams[t].nat.id + ' SCORES ' + n; } else S.msg = 'BLANK END';
    S.msgT = 2.5; S.end++; S.n = 0; S.stones = [];
    const tied = ctx.teams[0].S.score === ctx.teams[1].S.score;
    if (S.end >= S.ends && !tied) { S.over = true; S.overT = 0; const wn = ctx.teams[0].S.score > ctx.teams[1].S.score ? ctx.teams[0] : ctx.teams[1]; ctx.fx.sfx('cheerSwell'); ctx.fx.say('win', { nation: wn.nat.name, name: wn.short }); for (const a of ctx.teams) a.fin = true; return; }
  }
  S.turn = (S.n % 2 === 0) ? 1 - S.hammer : S.hammer; S.phase = 'aim'; S.aimY = 0; S.spin = 1;
  for (const a of ctx.teams) O.armReset(a);
}
function animate(ctx, a, dt) {
  const S = ctx.S, me = ctx.teams.indexOf(a), rig = a.rig; if (!rig) return;
  let x = OX + -1 * M, y = OY + (me ? 1.2 : -1.2) * M, pose = null, fac = 0;
  if (S.turn === me && S.phase === 'slide') { x = OX + (S.slideX) * M; y = OY - .3 * M; pose = 'curlSlide'; }
  else if (S.thrownBy === me && S.phase === 'travel' && S.thrown) { x = OX + (S.thrown.x + .9) * M; y = OY + (S.thrown.y - .5) * M; pose = 'sweep'; }
  else if (S.turn !== me) { x = OX + (TEE + 2.2) * M; y = OY + (me ? 1.6 : -1.6) * M; pose = 'skipPoint'; fac = Math.PI; }
  a.cpos = [x, y];
  O.Pose.set(rig, pose === 'skipPoint' ? null : pose, { t: S.t });
  rig.update(dt, { x, y, z: 0, vx: 0, vy: 0, facing: fac, pose: S.over && a.S.score >= Math.max(...ctx.teams.map(b => b.S.score)) ? 'cheer' : pose === 'skipPoint' ? 'wave' : null });
}
/** match results: the two finalists, then a simulated bronze match and placings (§5.3) */
O.matchRows = (ctx, teams, scores, ev) => {
  let [A, B] = teams, sa = scores[0], sb = scores[1];
  if (ctx.forceWinner) { if (ctx.forceWinner === B) { [A, B] = [B, A]; [sa, sb] = [sb, sa]; } if (sa <= sb) sa = sb + 1; }
  const win = sa >= sb ? A : B, lose = win === A ? B : A, ws = Math.max(sa, sb), ls = Math.min(sa, sb);
  const rest = ctx.athletes.filter(a => a !== A && a !== B), r = ctx.rng('placings');
  const ranked = rest.map(a => ({ a, k: a.nat.skills[ev] + O.gauss(r) * .06 })).sort((x, y) => y.k - x.k).map(q => q.a);
  const rows = [{ a: win, v: 8, display: 'GOLD · ' + ws + '–' + ls }, { a: lose, v: 7, display: 'SILVER · ' + ls + '–' + ws }];
  ranked.forEach((a, i) => rows.push({ a, v: 6 - i, display: i === 0 ? 'BRONZE MATCH WIN' : i === 1 ? 'BRONZE MATCH' : 'PLACED ' + (i + 3) }));
  if (ctx.forceDnf) { const h = ctx.humans[0]; const row = rows.find(q => q.a === h); if (row) { row.v = null; row.display = 'DNF'; rows.splice(rows.indexOf(row), 1); rows.push(row); } }
  return rows;
};
})();
