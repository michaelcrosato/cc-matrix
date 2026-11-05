// CURLING (gold medal match) — winter · Glory Curling Club · aim the broom, choose the turn, set the weight, sweep.
// Stones on a top-down sheet (friction, curl, collisions); the CPU skip tries 108 shots in simulation before each throw.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, M = 12, R = .3, TEE = 27, HOG = 22, BACK = 28.8, HALF = 2.375, HOUSE = 1.83, REL = 2;
const W = (x, y) => [x * M, -y * M];   // sheet metres -> world (the house is up the screen)

// the ice: one step for every moving stone (friction along, curl across), then collisions
function physStep(st, dt, T, sweepFn) {
  const mu = T.mu, g = 9.81;
  for (const s of st) {
    if (s.out || !s.v) continue;
    const v = Math.hypot(s.vx, s.vy); if (v < .01) { s.vx = s.vy = 0; s.v = 0; continue; }
    const sw = sweepFn ? sweepFn(s) : 0, ux = s.vx / v, uy = s.vy / v;
    const nv = Math.max(0, v - mu * g * (1 - T.sweepCut * sw) * dt);
    const curl = (s.spin || 0) * T.curlK / (v + .5) * (1 - .5 * sw) * dt;   // across the path: spin +1 curls toward +x going up the sheet
    if (nv <= 0) { s.vx = s.vy = 0; s.v = 0; continue; }
    s.vx = ux * nv + uy * curl; s.vy = uy * nv - ux * curl;
    s.x += s.vx * dt; s.y += s.vy * dt;
  }
  // collisions (equal masses, restitution)
  let clack = 0;
  for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
    const a = st[i], b = st[j]; if (a.out || b.out) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d >= 2 * R || d < 1e-6) continue;
    const nx = dx / d, ny = dy / d, rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    const ov = 2 * R - d; a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
    if (rel <= 0) continue;
    const e = .85, imp = rel * (1 + e) / 2; a.vx -= imp * nx; a.vy -= imp * ny; b.vx += imp * nx; b.vy += imp * ny; a.v = b.v = 1; a.touched = b.touched = true; a.hitBy = a.hitBy || b.thrown; b.hitBy = b.hitBy || a.thrown;
    clack = Math.max(clack, rel);
  }
  for (const s of st) { if (s.out) continue; if (Math.abs(s.x) > HALF - R || s.y > BACK + R) { s.out = true; s.vx = s.vy = 0; s.v = 0; } }
  return clack;
}
const moving = st => st.some(s => !s.out && s.v);
function settle(st) { for (const s of st) if (!s.out && !s.v && s.y < HOG && !s.touched) s.out = true; }
function shot(st) {   // { team, n } scoring now, and the nearest stone per team
  const inH = st.filter(s => !s.out && Math.hypot(s.x, s.y - TEE) <= HOUSE + R).map(s => ({ s, d: Math.hypot(s.x, s.y - TEE) })).sort((a, b) => a.d - b.d);
  if (!inH.length) return { team: null, n: 0, list: inH };
  const team = inH[0].s.team, other = inH.find(q => q.s.team !== team), lim = other ? other.d : 1e9;
  return { team, n: inH.filter(q => q.s.team === team && q.d < lim).length, list: inH };
}
O.CURL = { physStep, shot, TEE, HOG, BACK, HALF, HOUSE, R };

O.defEvent({
  id: 'curling', name: 'CURLING', short: 'Curling', season: 'winter', venueName: 'GLORY CURLING CLUB', music: 'lounge', view: 'topdown', input: O.KEYS_AIM,
  format: { type: 'match' }, maxTime: 900,
  measure: { unit: 'pts', better: 'higher', fmt: v => String(v), wr: [6, 'MTP', 'ROCKY SUMMIT'], seedStep: -1, dp: 0 },
  points: v => 0,
  tune: { mu: [.05, .02, .1, .001, 'Ice friction'], sweepCut: [.2, 0, .5, .01, 'Sweep friction cut'], curlK: [.12, 0, .3, .005, 'Curl'], weightHz: [1.1, .4, 2.5, .05, 'Weight meter speed (Hz)'], v0Base: [3.2, 2, 5, .05, 'Release speed base (m/s)'], v0Range: [3, 1, 5, .05, 'Release speed range'], cpuNoise: [1.7, 0, 4, .05, 'CPU execution noise'] },
  howto: { goal: 'A two-end final. Get your stones nearest the button. Aim the broom, pick the turn, set the weight, then sweep to carry the stone further and straighter.', rows: [[['moveH'], 'AIM THE BROOM (OR THE MOUSE)'], [['mashL', 'mashR'], 'IN-TURN / OUT-TURN · THEN SWEEP!'], [['action'], 'SLIDE · RELEASE AT THE WEIGHT'], [['turbo'], 'HYPER SWEEP']] },
  yikesKinds: ['slip', 'owngoal'], turboName: 'HYPER SWEEP!',
  laurel: { id: 'double', name: 'DOUBLE TAKEOUT', text: 'Knock two opposing stones out with one throw', test: (ctx, a) => !!(ctx.s && ctx.s.doubleBy === a) },
  hub: { ok: false }, attract: { seconds: 22, setup(ctx) { ctx.w.attractDouble = true; } },
  phases: ['end 1', 'end 2', 'extra end'],
  build(ctx) {
    const hs = ctx.humans, opp = O.matchOpponent('curling', ctx.meet);
    const A = hs[0] || ctx.athletes.find(a => a.nation === (ctx.meet.mode === 'attract' ? 'MTP' : 'SUN')) || ctx.athletes[0];
    const B = hs[1] || ctx.athletes.find(a => a.nation === (ctx.meet.mode === 'attract' ? 'FRM' : opp) && a !== A) || ctx.athletes.find(a => a !== A);
    ctx.teams = [A, B];
    for (const a of ctx.teams) { a.rig = O.makeRig(a.nation, 'curling'); a.sw1 = O.makeRig(a.nation, 'curling', { mate: 0 }); a.sw2 = O.makeRig(a.nation, 'curling', { mate: 1 }); a.skip = O.makeRig(a.nation, 'curling', { mate: 2 }); }
    ctx.w.mascot = Art.makeYikesy(7);
  },
  start(ctx) {
    const hammer = ctx.rng('hammer')() < .5 ? 0 : 1;
    ctx.s = { phase: 'aim', pt: 0, end: 0, ends: 2, score: [0, 0], endScores: [], hammer, stones: [], n: 0, team: 1 - hammer, aim: 0, spin: -1, w: 0, wt: 0, cur: null, cpu: null, clackT: 0, msg: null, msgT: 0, doubleBy: null, removedOpp: 0, result: null };
    if (ctx.w.attractDouble) { const S = ctx.s; for (const [x, y, t] of [[-.2, 27.2, 1], [.4, 26.8, 1], [-.9, 24, 0]]) S.stones.push({ x, y, vx: 0, vy: 0, v: 0, team: t, spin: 0, out: false }); S.n = 3; S.team = 0; }
    beginThrow(ctx);
  },
  step(ctx, dt) {
    const s = ctx.s, T = ctx.T; s.pt += dt;
    if (s.phase === 'done') return;
    const a = ctx.teams[s.team], I = a.I;
    if (s.msgT > 0) s.msgT -= dt;
    if (s.phase === 'cpu') { cpuThink(ctx); return; }
    if (s.phase === 'aim') {
      if (I.aim && ctx.w.house) { const h = ctx.w.house; s.aim = clamp((I.aim[0] - h.cx) / h.k, -2.1, 2.1); }
      s.aim = clamp(s.aim + I.mv[0] * 1.4 * dt, -2.1, 2.1);
      if (I.L) s.spin = -1; if (I.R) s.spin = 1;
      if ((I.A && s.pt > .25) || s.pt > 20) { s.phase = 'weight'; s.pt = 0; s.wt = 0; }
    } else if (s.phase === 'weight') {
      s.wt += dt * T.weightHz; const u = s.wt % 2; s.w = u < 1 ? u : 2 - u;
      if (I.L) s.spin = -1; if (I.R) s.spin = 1;
      if ((I.A && s.pt > .15) || s.pt > 8) release(ctx);
    } else if (s.phase === 'travel') {
      const st = s.stones, sweepOn = a.turboT > 0 ? 1 : clamp(a.mash.smooth / 8, 0, 1);
      s.sweep = sweepOn;
      let clack = 0; const sub = 2; for (let k = 0; k < sub; k++) clack = Math.max(clack, physStep(st, dt / sub, T, q => q === s.cur ? sweepOn : 0));
      if (clack > .3 && s.clackT <= 0) { s.clackT = .15; ctx.sfx('clack', { vol: clamp(clack / 2, .3, 1) }); if (clack > 2) { ctx.fx(P => P.sparks(s.cur.x * M, -s.cur.y * M, 2, 6)); ctx.cue('takeout', { a }); } }
      if (s.clackT > 0) s.clackT -= dt;
      if (sweepOn > .4 && !O.sandbox && Math.floor(s.pt * 6) !== s.sweepCue) { s.sweepCue = Math.floor(s.pt * 6); game.audio.sfx('brush', { vol: .5 }); if (s.sweepCue % 5 === 0) ctx.cue('sweep', { a }, { cool: 6 }); }
      if (!moving(st) || s.pt > 40) { settle(st); afterThrow(ctx); }
    } else if (s.phase === 'endScore') { if (s.pt > (O.sandbox ? 0 : 3)) nextEnd(ctx); }
    else if (s.phase === 'final') { if (s.pt > (O.sandbox ? 0 : 2.5)) s.phase = 'done'; }
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: (ctx, a) => ctx.teams.includes(a) ? ctx.s.score[ctx.teams.indexOf(a)] : null,
  placings(ctx) {
    const s = ctx.s, [A, B] = ctx.teams, win = s.score[0] > s.score[1] ? 0 : 1, rest = O.Sim.placings('curling', ctx.athletes.filter(a => !ctx.teams.includes(a)).map(a => a.nation), ctx.rng('place'));
    ctx.teams[win].matchRank = 1; ctx.teams[1 - win].matchRank = 2;
    ctx.athletes.forEach(a => { if (!ctx.teams.includes(a)) a.matchRank = 3 + rest.indexOf(a.nation); });
    [A, B].forEach((t, i) => { t.matchPerf = s.score[i]; t.matchDisplay = (i === win ? 'WON ' : 'LOST ') + s.score[i] + '–' + s.score[1 - i]; t.matchPoints = (i === win ? 1100 : 700) + s.score[i] * 20; });
    ctx.athletes.forEach(a => { if (!ctx.teams.includes(a)) { a.matchPerf = null; a.matchDisplay = a.matchRank === 3 ? 'BRONZE MATCH' : ''; a.matchPoints = Math.max(0, 600 - (a.matchRank - 3) * 80); } });
  },
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(); if (!s || ctx.teams[s.team] !== a) return I;
    const plan = s.plan, perfect = a.cheat === 'perfect';
    if (s.phase === 'aim' && plan) { const d = plan.aim - s.aim; I.mv = [clamp(d * 3, -1, 1), 0]; if (s.spin !== plan.spin) { if (plan.spin < 0) I.L = true; else I.R = true; } else if (Math.abs(d) < (a.human ? .12 : .03) && s.pt > .5) I.A = true; if (a.human && Math.abs(d) < .1) I.mv = [0, 0]; }
    else if (s.phase === 'weight' && plan) { const goingUp = (s.wt % 2) < 1; if (goingUp && Math.abs(s.w - plan.w) < .012) I.A = true; }
    else if (s.phase === 'travel' && plan && s.cur) {
      const st = s.cur, v = Math.hypot(st.vx, st.vy), stopY = st.y + (st.vy / Math.max(.01, v)) * v * v / (2 * ctx.T.mu * 9.81), want = plan.smart && plan.ty != null && st.vy > 0 && stopY < plan.ty - .25; if (want) { const hz = perfect ? 10 : 7 + a.skill * 3; const m = O.botMash(a.bs, hz, dt); I.L = m.L; I.R = m.R; }
      if (a.hype >= 1 && want) I.T = true;
    }
    return I;
  },
  cam(ctx, dt) {
    const s = ctx.s; let ty = TEE - 4;
    if (s && s.cur && s.phase === 'travel') ty = clamp(s.cur.y + 5, 6, TEE);
    else if (s && (s.phase === 'aim' || s.phase === 'weight')) ty = 7;
    const w = ctx.w; w.cy = w.cy === undefined ? ty : w.cy + (ty - w.cy) * Math.min(1, dt * 2.2);
    game.focus(0, -w.cy * M, 0);
  },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    game.lights.enabled = true; game.lights.ambient = .62;
    px.rect(g, 0, 0, r.bw, r.bh, '#3a2a20');
    for (let k = 0; k < 40; k++) { const y = r.w(0, -k * 2 * M, 0)[1]; px.rect(g, 0, y, r.bw, M, k % 2 ? '#4a3424' : '#43301f'); }
    // the club: pennants along the walls, the scoreboard, the warm lights
    for (let k = 0; k < 16; k++) { const p = r.w(-HALF * M - 30, -k * 3 * M, 0), q = r.w(HALF * M + 30, -k * 3 * M, 0); for (const [x, y, c] of [[p[0], p[1], O.NATION_IDS[k % 8]], [q[0], q[1], O.NATION_IDS[(k + 3) % 8]]]) Art.flag(g, x - 8, y - 5, 16, 10, c, 1, t + k); game.lights.add(0, -k * 3 * M, 30, 70, .5, { color: '#ffe0b0' }); }
    // the sheet
    const a0 = W(-HALF, -1), a1 = W(HALF, BACK + 2); Art.quad(r, [[a0[0], a0[1], 0], [a1[0], a0[1], 0], [a1[0], a1[1], 0], [a0[0], a1[1], 0]], '#eef6fb');
    for (let i = 0; i < 50; i++) { const hsh = O.hash('peb' + i), x = ((hsh % 450) / 100 - 2.25) * M, y = -((hsh >>> 9) % 300) / 10 * M; px.dot(g, ...r.w(x, y, 0), '#d8e8f2'); }
    for (const [y, c, w] of [[HOG, '#e23b2e', 2], [6, '#e23b2e', 2], [TEE, '#2a2a3a', 1], [BACK, '#2a2a3a', 1], [0, '#2a2a3a', 1]]) Art.wline(r, [-HALF * M, -y * M, 0], [HALF * M, -y * M, 0], c, w);
    Art.wline(r, [0, 0, 0], [0, -(BACK + 1) * M, 0], '#c8d8e8', 1);
    for (const [rr, c] of [[HOUSE, '#2f7fe0'], [1.22, '#ffffff'], [.61, '#e23b2e'], [.15, '#ffffff']]) { const pts = r.groundPts(0, -TEE * M, rr * M, 28); px.poly(g, pts, c); }
    const hk = r.w(0, 0, 0); px.rect(g, hk[0] - 4, hk[1] - 2, 3, 4, '#2a2a2a'); px.rect(g, hk[0] + 1, hk[1] - 2, 3, 4, '#2a2a2a');
    if (!s) return;
    // stones
    for (const st of s.stones) { if (st.out) continue; const [x, y] = W(st.x, st.y), team = ctx.teams[st.team]; r.queue(x, y, 0, gg => stoneDraw(gg, r, x, y, team, st, t)); }
    // the broom target and the predicted path (the first 30%)
    if (s.phase === 'aim' || s.phase === 'weight') {
      const [bx, by] = W(s.aim, TEE); r.queue(bx, by, 0, gg => { const p = r.w(bx, by, 0); px.ell(gg, p[0], p[1], 6, 3, '#f2b632'); px.rect(gg, p[0] - 1, p[1] - 12, 2, 12, '#8a5a2a'); });
      const pr = predict(ctx, s.aim, s.spin, s.phase === 'weight' ? s.w : .59);
      pr.slice(0, Math.ceil(pr.length * .3)).forEach((q, i) => { if (i % 3) return; const p = r.w(q[0] * M, -q[1] * M, 0); px.rect(g, p[0], p[1], 2, 2, '#14182e'); });
    }
    // people: the thrower, the two sweepers, the skip
    const a = ctx.teams[s.team];
    if (a && a.rig) {
      const cur = s.cur && s.phase === 'travel' ? s.cur : null, ty = cur ? Math.min(cur.y, 6) : 0;
      const tx = 0, [wx, wy] = W(tx, ty + (cur ? -1.2 : 0));
      r.actor(wx, wy, 0, (gg, ox, oy) => a.rig.draw(gg, ox, oy, r.view));
      if (s.phase !== 'travel') { const [sx2, sy2] = W(0, .7); r.queue(sx2, sy2, 0, gg => stoneDraw(gg, r, sx2, sy2, a, { spin: s.spin }, t)); }
      if (cur) for (const [rg, side] of [[a.sw1, -1], [a.sw2, 1]]) { const [x, y] = W(cur.x + side * .55, cur.y + .9); r.actor(x, y, 0, (gg, ox, oy) => { rg.draw(gg, ox, oy, r.view); O.Gear.broom(gg, rg, r.view, ox, oy, { color: O.nation(a.nation).colors.b }); }); }
      const [kx, ky] = W(s.phase === 'travel' ? clamp(s.aim, -1.5, 1.5) * .3 : s.aim * .6, TEE + 2.2); r.actor(kx, ky, 0, (gg, ox, oy) => { a.skip.draw(gg, ox, oy, r.view); O.Gear.broom(gg, a.skip, r.view, ox, oy); });
    }
    Art.drawYikesy(r, ctx.w.mascot, (HALF + .9) * M, -(TEE + 1) * M, 0); ctx.w.mascot.update(1 / 60, { squash: Math.sin(t * 3) * .1, look: [-1, 0] });
  },
  hud(ctx, r, g) {
    const s = ctx.s, Wd = r.W, H = r.H, t = game.real; if (!s) return;
    const a = ctx.teams[s.team], [A, B] = ctx.teams;
    // the scoreboard
    UI.panel(g, Wd / 2 - 80, 8, 160, 34, { alpha: .9 });
    [A, B].forEach((tm, i) => { const y = 12 + i * 14; Art.flag(g, Wd / 2 - 74, y, 14, 9, tm.nation); UI.text(g, tm.nation, Wd / 2 - 56, y + 1, i === s.hammer ? '#ffe066' : '#ffffff'); for (let e = 0; e < Math.max(2, s.ends); e++) { const v = s.endScores[e]; UI.text(g, v ? (v.team === i ? String(v.n) : '0') : '·', Wd / 2 - 18 + e * 12, y + 1, '#c8ccec'); } UI.text(g, String(s.score[i]), Wd / 2 + 60, y + 1, '#ffe066'); });
    UI.text(g, 'END ' + (s.end + 1) + ' · STONE ' + Math.min(8, s.n + 1) + '/8', Wd / 2 - 52, 44, '#aab0d0');
    // the house cam
    const hx = Wd - 66, hy = 70, hk = 15; ctx.w.house = { cx: hx, cy: hy, k: hk }; UI.panel(g, hx - 50, hy - 50, 100, 100, { alpha: .9 });
    for (const [rr, c] of [[HOUSE, '#2f7fe0'], [1.22, '#ffffff'], [.61, '#e23b2e'], [.15, '#ffffff']]) px.disc(g, hx, hy, Math.round(rr * hk), c);
    for (const st of s.stones) { if (st.out || Math.abs(st.y - TEE) > 3) continue; const x = Math.round(hx + st.x * hk), y = Math.round(hy - (st.y - TEE) * hk); if (Math.abs(x - hx) > 48 || Math.abs(y - hy) > 48) continue; px.disc(g, x, y, Math.round(R * hk) + 1, '#14161e'); px.disc(g, x, y, Math.round(R * hk), O.nation(ctx.teams[st.team].nation).colors.a); }
    if (s.phase === 'aim' || s.phase === 'weight') { const bx = Math.round(hx + s.aim * hk); px.rect(g, bx - 1, hy - 3, 3, 7, '#f2b632'); }
    const sh = shot(s.stones); if (sh.team !== null) UI.text(g, 'SHOT: ' + ctx.teams[sh.team].nation + ' ' + sh.n, hx - 44, hy + 40, '#ffe066');
    // phase prompts
    const human = a.human;
    if (s.phase === 'cpu') UI.text(g, O.shortName(a.name) + ' IS PLANNING...', 14, 52, '#c8ccec');
    if (human && s.phase === 'aim') O.Prompt.strip(g, [['moveH', 'AIM'], [['mashL', 'mashR'], s.spin < 0 ? 'IN-TURN' : 'OUT-TURN'], ['action', 'SLIDE']], Wd / 2, H - 22, { inp: a.inp });
    if (s.phase === 'weight') {
      const x = 14, y = H - 120, h = 90; px.rect(g, x - 2, y - 2, 18, h + 4, '#05060e'); for (const [f, tt, c, n] of [[.38, .52, '#7fb2ff', 'GUARD'], [.52, .66, '#4fe0a8', 'DRAW'], [.66, 1, '#ff9a6a', 'TAKEOUT']]) { px.rect(g, x, y + h - Math.round(tt * h), 14, Math.round((tt - f) * h), c); UI.text(g, n, x + 18, y + h - Math.round((f + tt) / 2 * h) - 3, c); }
      px.rect(g, x - 3, y + h - Math.round(s.w * h) - 1, 20, 3, '#ffffff');
      if (human) O.Prompt.draw(g, Wd / 2, H - 22, 'action', { inp: a.inp, label: 'RELEASE', align: 'center' });
    }
    if (s.phase === 'travel') { UI.text(g, 'SWEEP', 14, H - 60, '#ffffff'); UI.bar(g, 14, H - 48, 80, 6, s.sweep || 0, '#4fe0a8'); if (human) O.Prompt.pair(g, 14, H - 36, 'mashL', 'mashR', { inp: a.inp, flip: a.mash.flip ^ 1, label: 'HURRY HARD!' }); }
    if (s.phase === 'endScore' || s.phase === 'final') { const e = s.endScores[s.endScores.length - 1], txt = s.phase === 'final' ? (s.score[0] === s.score[1] ? 'DRAW' : ctx.teams[s.score[0] > s.score[1] ? 0 : 1].nationName + ' WINS!') : e && e.team !== null ? ctx.teams[e.team].nation + ' SCORES ' + e.n : 'BLANK END'; UI.text(g, txt, Wd / 2 - UI.tw(txt, 3) / 2, H / 2 - 20, '#ffe066', { scale: 3 }); }
    if (s.msgT > 0 && s.msg) UI.text(g, s.msg, Wd / 2 - UI.tw(s.msg, 2) / 2, 60, '#ffffff', { scale: 2 });
    O.HUD.flame(g, 14, 36, a);
    UI.text(g, (human ? (ctx.humans.length > 1 ? 'P' + (a.player + 1) + ' · ' : 'YOU · ') : '') + a.nationName, 14, 24, a.human ? a.color : '#ffffff');
  }
});
function stoneDraw(g, r, x, y, team, st, t) {
  const p = r.w(x, y, 0), rr = Math.round(R * M * 1.5), c = O.nation(team.nation).colors, gold = O.Records.golden(team.nation, 'curling');
  px.ell(g, p[0], p[1] + 1, rr + 1, rr, '#14161e'); px.ell(g, p[0], p[1], rr, rr - 1, '#8a8e9a'); px.ell(g, p[0] - 1, p[1] - 1, rr - 2, rr - 3, '#a8acb8');
  px.ell(g, p[0], p[1], rr - 3, rr - 4, gold ? '#f2c94c' : c.a === '#f4f8ff' ? c.b : c.a);
  const an = (t * 3 * (st.spin || 0)) % (Math.PI * 2); px.line(g, p[0], p[1], Math.round(p[0] + Math.cos(an) * (rr - 3)), Math.round(p[1] + Math.sin(an) * (rr - 4)), '#ffffff', 2);
}
function newStone(ctx, x, y) { const s = ctx.s; return { x, y, vx: 0, vy: 0, v: 0, team: s.team, spin: s.spin, out: false, thrown: true }; }
function predict(ctx, aim, spin, w) {
  const T = ctx.T, v0 = T.v0Base + T.v0Range * w, dx = aim - 0, dy = TEE - REL, d = Math.hypot(dx, dy), st = [{ x: 0, y: REL, vx: v0 * dx / d, vy: v0 * dy / d, v: 1, spin, team: 0 }], out = [];
  for (let i = 0; i < 400 && st[0].v; i++) { physStep(st, 1 / 20, T); out.push([st[0].x, st[0].y]); }
  return out;
}
function beginThrow(ctx) {
  const s = ctx.s, a = ctx.teams[s.team];
  s.phase = 'aim'; s.pt = 0; s.aim = 0; s.spin = -1; s.w = 0; s.cur = null; s.plan = null; a.bs = {}; a.fresh = O.freshState(); a.mash.reset();
  if (!a.human || O.autoAll || (O.Dev && O.Dev.autopilot && a.player === 0)) { s.phase = a.human ? 'aim' : 'cpu'; s.cpu = { i: 0, best: null, cands: candidates(ctx) }; if (a.human) { while (!cpuThink(ctx, true)); } }
}
function candidates(ctx) { const out = []; for (const sp of [-1, 1]) for (let i = 0; i < 9; i++) for (const w of [.45, .52, .59, .66, .78, .92]) out.push({ aim: -1.6 + i * .4, spin: sp, w }); return out; }
function evaluate(ctx, st, team) {
  const sh = shot(st), me = team, opp = 1 - team; let v = 0;
  if (sh.team === me) v += sh.n * 3; else if (sh.team === opp) v -= sh.n * 3;
  for (const q of st) if (!q.out && q.y > HOG && q.y < TEE - HOUSE - .2 && Math.abs(q.x) < 1) v += q.team === me ? .4 : -.2;
  const near = sh.list[0]; if (near && near.s.team === me) v += (HOUSE - near.d) * .5;
  return v;
}
function cpuThink(ctx, all) {
  const s = ctx.s, a = ctx.teams[s.team], T = ctx.T, C = s.cpu; if (!C) return true;
  const n = all ? 1e9 : 12;
  for (let k = 0; k < n && C.i < C.cands.length; k++, C.i++) {
    const c = C.cands[C.i], st = s.stones.filter(q => !q.out).map(q => Object.assign({}, q)), v0 = T.v0Base + T.v0Range * c.w, dx = c.aim, dy = TEE - REL, d = Math.hypot(dx, dy);
    st.push({ x: 0, y: REL, vx: v0 * dx / d, vy: v0 * dy / d, v: 1, spin: c.spin, team: s.team, out: false, thrown: true });
    for (let i = 0; i < 360 && moving(st); i++) physStep(st, 1 / 12, T);
    settle(st); const v = evaluate(ctx, st, s.team), me = st[st.length - 1];
    if (!C.best || v > C.best.v) C.best = Object.assign({ v, ty: me.out ? null : me.y }, c);
  }
  if (C.i < C.cands.length) return false;
  const r = ctx.rng('cpuexec:' + s.end + ':' + s.n), k = (a.cheat === 'perfect' ? 0 : 1 - a.skill) * T.cpuNoise;
  const b = C.best || { aim: 0, spin: -1, w: .59 };
  s.plan = { aim: clamp(b.aim + O.gauss(r) * .15 * k * 2, -2, 2), spin: b.spin, w: clamp(b.w + O.gauss(r) * .06 * k * 1.5, .3, .97), ty: b.ty, smart: r() < .3 + a.skill * .7 };
  if (ctx.w.attractDouble && a.cheat && s.n === 3) s.plan = { aim: .2, spin: -1, w: .9, sweep: false };
  s.cpu = null; s.phase = 'aim'; s.pt = 0;
  return true;
}
function release(ctx) {
  const s = ctx.s, a = ctx.teams[s.team], T = ctx.T, w = s.w;
  const v0 = T.v0Base + T.v0Range * w, dx = s.aim, dy = TEE - REL, d = Math.hypot(dx, dy), st = newStone(ctx, 0, REL);
  st.vx = v0 * dx / d; st.vy = v0 * dy / d; st.v = 1; s.stones.push(st); s.cur = st; s.phase = 'travel'; s.pt = 0; s.n++;
  s.before = s.stones.filter(q => !q.out && q !== st).map(q => ({ q, team: q.team }));
  s.shotBefore = shot(s.stones.filter(q => q !== st));
  ctx.sfx('swish');
  if (w >= .98 && !O.god(a)) { ctx.yikes(a, 'slip'); }
  ctx.cue('start', { a }, { cool: 20 });
}
function afterThrow(ctx) {
  const s = ctx.s, a = ctx.teams[s.team], st = s.cur;
  const removedOpp = s.before.filter(b => b.team !== s.team && b.q.out).length;
  if (removedOpp >= 2) { s.doubleBy = a; ctx.cue('takeout', { a }, { prio: 5 }); s.msg = 'DOUBLE TAKEOUT!'; s.msgT = 2; ctx.hype(a, .4); if (!O.sandbox) O.CrowdAudio.cheer(); }
  else if (removedOpp === 1) { s.msg = 'TAKEOUT!'; s.msgT = 1.5; ctx.hype(a, .2); }
  const sb = s.shotBefore; if (sb && sb.team === s.team && sb.list[0] && sb.list[0].s.out) { ctx.yikes(a, 'owngoal', { cue: 'own' }); }
  if (!st.out && Math.hypot(st.x, st.y - TEE) < .6) { s.msg = s.msg || 'ON THE BUTTON!'; s.msgT = Math.max(s.msgT, 1.5); ctx.cue('draw', { a }); ctx.hype(a, .15); }
  if (s.n >= 8) { const sh = shot(s.stones); s.endScores.push({ team: sh.team, n: sh.n }); if (sh.team !== null) { s.score[sh.team] += sh.n; s.hammer = 1 - sh.team; } s.phase = 'endScore'; s.pt = 0; ctx.cue('end', {}); if (!O.sandbox) O.CrowdAudio.applause(); return; }
  s.team = 1 - s.team; beginThrow(ctx);
}
function nextEnd(ctx) {
  const s = ctx.s; s.end++;
  if (s.end >= s.ends) { if (s.score[0] === s.score[1] && s.ends < 3) s.ends++; else { s.phase = 'final'; s.pt = 0; return; } }
  s.stones = []; s.n = 0; s.team = 1 - s.hammer; beginThrow(ctx);
}
function animate(ctx, dt) {
  const s = ctx.s, a = ctx.teams[s.team]; if (!a || !a.rig) return;
  const facing = -Math.PI / 2;
  if (s.phase === 'travel') { const sl = s.pt < 1.2; if (sl) O.Pose.set(a.rig, 'curlSlide'); else { O.Pose.clear(a.rig); } a.rig.update(dt, { x: 0, y: 0, z: 0, facing, vx: 0, vy: 0, pose: sl ? undefined : 'wave' }); for (const rg of [a.sw1, a.sw2]) { O.Pose.set(rg, 'sweep', { ph: game.time * (6 + (s.sweep || 0) * 10) }); rg.update(dt, { x: 0, y: 0, z: 0, facing, vx: 0, vy: -40 }); } }
  else { O.Pose.set(a.rig, 'crouchStart'); a.rig.update(dt, { x: 0, y: 0, z: 0, facing, vx: 0, vy: 0 }); }
  O.Pose.set(a.skip, 'skipPoint'); a.skip.update(dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, vx: 0, vy: 0 });
}
})();
