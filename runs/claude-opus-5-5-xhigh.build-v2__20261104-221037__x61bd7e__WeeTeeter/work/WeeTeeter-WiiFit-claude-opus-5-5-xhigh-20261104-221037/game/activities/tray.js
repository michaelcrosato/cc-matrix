/* activities/tray.js: Tray Service. Lean tilts a tea tray; olives roll; glasses are sensors. Layouts are text in data/trays.js. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px, clamp } = E, game = G.game;
const txt = (...a) => G.txt(...a);
E.VIEWS.tray = E.VIEWS.tray || new E.View('tray', 'Tray', 0, 55, 1.25, 1);
const CELL = 16;
const BOT = { poor: { vmax: 40, noise: .1 }, average: { vmax: 55, noise: .05 }, good: { vmax: 65, noise: .02 }, expert: { vmax: 75, noise: .005 } };
function load(ctx, c, i) {
  const list = G.DATA[ctx.tier.trays], layout = list[i], rows = layout.rows, H = rows.length * CELL, W = rows[0].length * CELL, x0 = -W / 2, y0 = -H / 2;
  const fr = (ctx.tier.friction || 0) + G.DEV.trayF;
  const world = new E.Physics({ gravity: [0, 0], sleep: false, substeps: 4, on: {
    enter(sensor, body) {
      if (!body.data || body.data.kind !== 'olive' || body.off) return;
      if (sensor.data && sensor.data.kind === 'glass') { body.off = true; c.world.remove(body); sensor.data.n++; c.inGlass++; c.olives = c.olives.filter(o => o !== body); if (G.cue(ctx, c)) { G.A.sfx('plop'); G.P.glints(sensor.x, sensor.y, 8, 4, '#bff3e2'); if (c.input) c.input.rumble(.25, .1); } }
      if (sensor.data && sensor.data.kind === 'gap') { body.data.fall = .7; body.vx = body.vy = 0; if (G.cue(ctx, c)) G.A.sfx('drop'); }
    },
    hit(a, b, info) { if (G.cue(ctx, c)) { const ol = (a.data && a.data.kind === 'olive') || (b.data && b.data.kind === 'olive'); if (ol && Math.hypot(a.vx - b.vx, a.vy - b.vy) > 40) { c.clinkT = c.clinkT || 0; if (c.clinkT <= 0) { G.A.sfx('trayClink', { vol: .6 }); c.clinkT = .1; } } } }
  } });
  world.chain([[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]], { closed: true, r: 1, bounce: .35, friction: .1 });
  c.world = world; c.olives = []; c.glasses = []; c.bumpers = []; c.blocks = []; c.gaps = []; c.gecko = null; c.W = W; c.H = H; c.inGlass = c.inGlass || 0;
  rows.forEach((row, ry) => { [...row].forEach((ch, rx) => {
    const x = x0 + (rx + .5) * CELL, y = y0 + (ry + .5) * CELL;
    if (ch === 'o') { const b = world.circle(x, y, 5, { bounce: .35, friction: .1, damping: fr, data: { kind: 'olive', sx: x, sy: y, fall: 0 } }); c.olives.push(b); }
    else if (ch === 'G') { const s = world.add({ shape: 'circle', type: 'static', x, y, r: 6.5, sensor: true, data: { kind: 'glass', n: 0 } }); c.glasses.push(s); }
    else if (ch === 'B') { c.bumpers.push(world.bumper(x, y, 7, { kick: 110 })); }
    else if (ch === '#') { c.blocks.push(world.box(x, y, CELL, CELL, { type: 'static', bounce: .3 })); }
    else if (ch === '~') { const s = world.add({ shape: 'circle', type: 'static', x, y, r: 2.5, sensor: true, data: { kind: 'gap' } }); c.gaps.push(s); }
    else if (ch === 'K') { c.gecko = world.circle(x, y, 7, { type: 'kinematic', data: { kind: 'gecko' }, bounce: .5 }); c.geckoT = 0; c.geckoP = [[x, y], [x + 70, y - 8], [x + 30, y - 40], [x - 10, y - 16]]; c.geckoI = 0; }
  }); });
  c.trayI = i; c.nextT = 0; c.total = c.total || list.reduce((n, L) => n + L.rows.join('').split('o').length - 1, 0);
}
/** a bot's next waypoint: the cheapest way over the tray's cells from an olive to a glass, keeping clear of the gaps */
G.trayPath = (ctx, c) => {
  const rows = G.DATA[ctx.tier.trays][c.trayI].rows, H = rows.length, W = rows[0].length, x0 = -c.W / 2, y0 = -c.H / 2, cell = (x, y) => [Math.floor((x - x0) / CELL), Math.floor((y - y0) / CELL)];
  const at = (i, j) => rows[j] && rows[j][i], blocked = (i, j) => { const ch = at(i, j); return ch === undefined || ch === '~' || ch === '#' || ch === 'B'; };
  const nearGap = (i, j) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (at(i + a, j + b) === '~') return true; return false; };
  const glass = new Set(c.glasses.map(s => cell(s.x, s.y).join(',')));
  let best = null;
  for (const o of c.olives) {
    if (o.data.fall > 0) continue;
    const [si, sj] = cell(o.x, o.y), dist = new Map(), prev = new Map(), q = [[0, si, sj]]; dist.set(si + ',' + sj, 0);
    let goal = null, cost = 0;
    while (q.length) { q.sort((p, r) => p[0] - r[0]); const [d, i, j] = q.shift(), key = i + ',' + j; if (d > dist.get(key)) continue; if (glass.has(key)) { goal = [i, j]; cost = d; break; }
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b, nk = ni + ',' + nj; if (blocked(ni, nj)) continue; const nd = d + 1 + (nearGap(ni, nj) ? 5 : 0); if (!dist.has(nk) || nd < dist.get(nk)) { dist.set(nk, nd); prev.set(nk, [i, j]); q.push([nd, ni, nj]); } } }
    if (!goal) continue;
    let step = goal, cur = goal; while (prev.has(cur.join(','))) { const p = prev.get(cur.join(',')); if (p[0] === si && p[1] === sj) { step = cur; break; } cur = p; }
    if (!best || cost < best.cost) best = { cost, o, x: x0 + (step[0] + .5) * CELL, y: y0 + (step[1] + .5) * CELL, careful: nearGap(si, sj) || nearGap(step[0], step[1]) };
  }
  return best;
};
G.family('tray', {
  camera: { zoom: false },
  setup(ctx) {
    ctx.dur = ctx.durGiven || ctx.tier.dur || 60;
    for (const c of ctx.contestants) { c.bal = new G.Balance(ctx.tier.set, c.rng); c.bal.cheat = true; c.inGlass = 0; c.finT = 0; load(ctx, c, 0); }
    ctx.dennis = G.regularRig('dennis', 1.7); ctx.dennisPoser = new G.Poser(ctx.dennis);
  },
  preview(dt, ctx) { game.focus(0, 8, 0); if (ctx.done) return; ctx.dennisPoser.clip('Idle_Subtle', { loop: true, tgt: 1 }); ctx.dennisPoser.update(dt); ctx.dennis.update(dt, { x: -180, y: -40, z: 0, vx: 0, vy: 0, facing: ctx.dennisPoser.facing }); for (const c of ctx.contestants) c.world.step(dt); },
  update(dt, ctx) {
    game.focus(0, 8, 0);
    for (const c of ctx.contestants) {
      if (c.finT) continue;
      const b = c.bal, I = c.intent; b.step(dt, I.x, I.y);
      c.world.gravity = [b.x * G.DEV.trayG, -b.y * G.DEV.trayG];
      /* the gecko walks, slowly, for reasons of its own */
      if (c.gecko) { const P = c.geckoP[c.geckoI]; if (Math.hypot(c.gecko.x - P[0], c.gecko.y - P[1]) < 3) c.geckoI = (c.geckoI + 1) % c.geckoP.length; c.gecko.moveTo(P[0], P[1], 0, 22, 0); }
      for (const o of c.olives) o.damping = (ctx.tier.friction || 0) + G.DEV.trayF;
      c.world.wake(); c.world.step(dt); c.clinkT = Math.max(0, (c.clinkT || 0) - dt);
      for (const o of c.olives) { const D = o.data; if (D.fall > 0) { D.fall -= dt; o.vx = o.vy = 0; if (D.fall <= 0) { o.x = D.sx; o.y = D.sy; o.vx = o.vy = 0; } } }
      if (!c.olives.length) {
        c.nextT += dt;
        if (c.nextT > .8) { const list = G.DATA[ctx.tier.trays]; if (c.trayI + 1 < list.length) { load(ctx, c, c.trayI + 1); if (G.cue(ctx, c)) G.A.sfx('ok'); } else { c.finT = ctx.time; if (ctx.contestants.every(q => q.finT)) ctx.finished = true; } }
      }
    }
    ctx.dennisPoser.clip('Waiting_Loop', { loop: true, tgt: 1 }); ctx.dennisPoser.update(dt); ctx.dennis.update(dt, { x: -180, y: -40, z: 0, vx: 0, vy: 0, facing: ctx.dennisPoser.facing });
  },
  result(ctx, c) { const t = c.finT || ctx.dur, left = clamp(1 - t / ctx.dur, 0, 1), pct = c.inGlass / c.total * (.8 + .2 * left); return { pct, detail: 'Olives in glasses: ' + c.inGlass + ' of ' + c.total + '. Dennis nods slowly.' }; },
  bot(ctx, c, dt) {
    const B = BOT[c.brain.skill], I = c.intent; c.nz = c.nz || G.noise(c.rng, 1.7);
    /* the olive nearest a glass, along the cells that are clear of gaps, blocks and bumpers */
    c.pathT = (c.pathT || 0) - dt;
    if (c.pathT <= 0 || !c.way) { c.pathT = .2; c.way = G.trayPath(ctx, c); }
    if (!c.way) { I.x = 0; I.y = 0; return; }
    const o = c.way.o, dx = c.way.x - o.x, dy = c.way.y - o.y, D = Math.max(1, Math.hypot(dx, dy)), vm = Math.min(c.way.careful ? 26 : B.vmax, D * 3 + 16), kv = 5 / G.DEV.trayG;
    I.x = clamp((dx / D * vm - o.vx) * kv + B.noise * c.nz(ctx.time), -1, 1); I.y = clamp(-((dy / D * vm - o.vy) * kv + B.noise * c.nz(ctx.time + 3)), -1, 1);
  },
  draw(r, ctx) {
    const g0 = r.ctx, W = r.W + 2, H = r.H + 2;
    /* the Juice Bar, seen from the counter */
    G.ROOMS.juice(r, { dusk: G.roomDusk && G.roomDusk() });
    { const top = Math.round(H * .14); G.bands(g0, 0, top, W, H - top, '#e8cfa8', '#c9a97c', 10); px.rect(g0, 0, top - 2, W, 2, '#a57f54'); for (let i = 1; i < 7; i++) px.rect(g0, 0, top + Math.floor(i * (H - top) / 7), W, 1, '#b8976a'); G.fern(g0, W * .93, H * .34, 1.4); }
    const c = ctx.local || ctx.contestants[0], b = c.bal, T = 9;
    const tz = (x, y) => -(x / (c.W / 2)) * b.x * T + (y / (c.H / 2)) * b.y * T + 8;
    const corners = [[-c.W / 2 - 7, -c.H / 2 - 7], [c.W / 2 + 7, -c.H / 2 - 7], [c.W / 2 + 7, c.H / 2 + 7], [-c.W / 2 - 7, c.H / 2 + 7]].map(p => r.w(p[0], p[1], tz(p[0], p[1])));
    const low = [[-c.W / 2 - 7, c.H / 2 + 7], [c.W / 2 + 7, c.H / 2 + 7]].map(p => r.w(p[0], p[1], tz(p[0], p[1]) - 5));
    // the tray: its shadow, rim and face
    px.polyDither(g0, corners.map(p => [p[0] + 3, p[1] + 9]), '#7a5a3a', .35, r.ix, r.iy);
    px.poly(g0, [corners[3], corners[2], low[1], low[0]].map(p => [p[0], p[1]]), '#9fb5bc');
    px.poly(g0, corners.map(p => [p[0], p[1]]), '#dfe9ea');
    const face = [[-c.W / 2, -c.H / 2], [c.W / 2, -c.H / 2], [c.W / 2, c.H / 2], [-c.W / 2, c.H / 2]].map(p => r.w(p[0], p[1], tz(p[0], p[1])));
    px.poly(g0, face.map(p => [p[0], p[1]]), '#f6fafa');
    for (let i = 1; i < 6; i++) { const y = -c.H / 2 + i * c.H / 6, a = r.w(-c.W / 2, y, tz(-c.W / 2, y)), d = r.w(c.W / 2, y, tz(c.W / 2, y)); px.line(g0, a[0], a[1], d[0], d[1], '#eaf1f2'); }
    const ground = (x, y, z = 0) => r.w(x, y, tz(x, y) + z);
    for (const s of c.gaps) { const p = ground(s.x, s.y); px.ell(g0, p[0], p[1], 8, 6, '#20404c'); px.ell(g0, p[0], p[1] + 1, 7, 4, '#0f2a35'); }
    for (const s of c.glasses) { const p = ground(s.x, s.y); r.queue(s.x, s.y - 1, tz(s.x, s.y), g => { px.ell(g, p[0], p[1] + 2, 8, 5, '#c8dde2'); px.rect(g, p[0] - 1, p[1] - 10, 2, 12, '#dfeef2'); px.poly(g, [[p[0] - 11, p[1] - 19], [p[0] + 11, p[1] - 19], [p[0], p[1] - 8]], '#d6f2f7'); px.line(g, p[0] - 11, p[1] - 19, p[0] + 11, p[1] - 19, '#ffffff'); px.line(g, p[0] - 11, p[1] - 19, p[0], p[1] - 8, '#a8d4de'); px.line(g, p[0] + 11, p[1] - 19, p[0], p[1] - 8, '#a8d4de'); for (let i = 0; i < Math.min(3, s.data.n); i++) { px.disc(g, p[0] - 3 + i * 3, p[1] - 13 - (i % 2), 2, '#7b9a3a'); px.dot(g, p[0] - 3 + i * 3, p[1] - 14 - (i % 2), '#e0553a'); } }); }
    for (const s of c.bumpers) { const p = ground(s.x, s.y); r.queue(s.x, s.y, tz(s.x, s.y), g => { px.ell(g, p[0], p[1] + 1, 10, 7, '#c49c6c'); px.ell(g, p[0], p[1] - 2, 9, 6, '#ffd166'); px.ell(g, p[0] - 2, p[1] - 4, 3, 2, '#fff3c8'); }); }
    for (const s of c.blocks) { const p = ground(s.x, s.y); r.queue(s.x, s.y, tz(s.x, s.y), g => { px.rect(g, p[0] - 10, p[1] - 14, 20, 20, '#fbfdfd'); px.rect(g, p[0] - 10, p[1] - 14, 20, 6, '#ffffff'); px.rect(g, p[0] - 10, p[1] + 5, 20, 1, '#c8dde2'); px.rect(g, p[0] + 7, p[1] - 8, 3, 13, '#dfe9ea'); }); }
    if (c.gecko) { const q = c.gecko, p = ground(q.x, q.y), wig = Math.sin(game.real * 9) * 2; r.queue(q.x, q.y, tz(q.x, q.y), g => { px.line(g, p[0] - 9, p[1] + wig, p[0] - 4, p[1], '#6fbf5a', 2); px.ell(g, p[0], p[1], 6, 3, '#7fd17a'); px.disc(g, p[0] + 6, p[1] - 1, 3, '#8fe08a'); px.dot(g, p[0] + 7, p[1] - 2, '#20404c'); for (const k of [-3, 3]) { px.dot(g, p[0] + k, p[1] - 3 - wig * .3, '#6fbf5a'); px.dot(g, p[0] + k, p[1] + 3 + wig * .3, '#6fbf5a'); } }); }
    for (const o of c.olives) { const fall = o.data.fall > 0 ? (1 - o.data.fall / .7) : 0; if (fall > .5) continue; const p = ground(o.x, o.y, 2 - fall * 6); r.queue(o.x, o.y, tz(o.x, o.y), g => { px.ell(g, p[0] + 1, p[1] + 4, 6, 3, '#20404c40'); px.disc(g, p[0], p[1] - 1, 6, '#5f7f2a'); px.disc(g, p[0] - 1, p[1] - 2, 5, '#7b9a3a'); px.disc(g, p[0] - 2, p[1] - 3, 2, '#a8c060'); px.disc(g, p[0] + 2, p[1] - 3, 1.6, '#e0553a'); }); }
    G.drawRig(r, ctx.dennis, -180, -40);
    if (Math.floor(game.real / 5) % 2 === 0) r.queue(-180, -40, 80, g => {}, {});
    G.drawGhosts && G.drawGhosts(r, ctx);
  },
  hud(g, ctx) {
    const W = game.W, H = game.H, c = ctx.local || ctx.contestants[0];
    if (ctx.live) G.drawTimer(g, G.left(ctx), { x: 36 });
    if (ctx.live) { G.panel(g, W - 100, 8, 92, 16, { r: 7 }); txt(g, 'Olives ' + c.inGlass + ' / ' + c.total, W - 54, 12, '#14a8c8', { align: 'center' }); }
    if (ctx.live) { G.drawPlate(g, c.bal, { x: 34, y: H - 34, r: 26, ring: null, color: c.color }); G.prompts(g, [['lean', 'Tilt']]); }
    if (ctx.live && Math.floor(ctx.time / 5) % 2 === 0) { const p = game.r.w(-180, -40, 62); G.panel(g, p[0] - 16, p[1] - 12, 40, 15, { r: 7 }); txt(g, 'Olive?', p[0] + 4, p[1] - 8, '#5f7f8a', { align: 'center' }); }
  }
});
})();
