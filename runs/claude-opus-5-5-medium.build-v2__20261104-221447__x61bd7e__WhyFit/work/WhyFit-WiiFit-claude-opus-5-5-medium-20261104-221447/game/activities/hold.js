// Stork Stand and Sun Flow: hold the dot in the ring. Sun Flow adds the breath.
const setFor = T => G.SETS[T.set];
G.setupBal = (ctx, c, set, o = {}) => { c.bal = new G.Balance(set, E.rng(ctx.seed + 100 + c.i * 13), Object.assign({ noFall: ctx.cheat }, o)); };
// every lean-based bot: correct toward the ring
G.leanBotFill = (ctx, c, dt) => { const b = c.bal, [ux, uy] = c.lean.step(dt, b.px - b.ringX, b.py - b.ringY, b.vx, b.vy); c.intent.ux = ux; c.intent.uy = uy; };
const rigStep = (rig, dt, x, y, tgt, wob, pose, extra) => { rig.wob = wob; rig.mocap = pose; rig.body = null; G.place(rig, dt, x, y, 0, tgt, extra); };
G.balPose = (c, poseName, t) => { const b = c.bal; if (b.stumbleT > 0) return G.sampleLoop('Dizzy', t * 1.2); const base = G.samplePose(poseName, t); if (b.lean > .7) { const k = Math.min(1, (b.lean - .7) * 3), hop = G.sampleLoop('Hop_One_Foot_Loop', t); return G.lib.blend(base, hop, k * .6); } return base; };
const drawPlates = (g, r, ctx, o = {}) => { const n = ctx.contestants.length; for (const c of ctx.contestants) { if (!c.bal) continue; const big = n === 1, R = big ? 26 : 15, p = r.w(c.x, c.y, 0), x = big ? r.W / 2 : p[0], y = big ? r.H - 34 : r.H - 20; if (!o.hide) G.drawPlate(g, c.bal, x, y, R, { t: game.real }); if (!big) { G.text(g, c.name, x, y - R - 9, c.color || G.COL.INK, { align: 'center', shadow: '#fff' }); } } };
G.drawPlates = drawPlates;
const coachPos = () => ({ x: -86, y: -6 });
G.drawCoach = (r, ctx, pose, t, tgt = 1.2) => { if (ctx.contestants.length > 2 || !ctx.coachRig) return; G.actor(r, ctx.coachRig); };
G.makeCoach = ctx => { if (ctx.contestants.length > 2) return; ctx.coachRig = G.instructorRig(ctx.coachId, 1.8); };

G.activity({ id: 'stork', family: 'hold', discipline: 'Stillness', name: 'Stork Stand', tierName: 'Eyes Closed', class: true, hub: true, coachKey: 'hold', song: 'yoga',
  says: 'Stand on one leg. Keep the dot in the ring. You may not sit down. The gull will not help.',
  tierSays: 'The Plate is gone. Balance by the tilt, the tone and the rumble. Please do not actually close your eyes.',
  controls: (src, lean) => [[lean, 'Lean into the ring']],
  prompts: () => [['lean', 'Lean']],
  setup(ctx) { const T = ctx.T; ctx.dur = ctx.short ? 28 : (ctx.limit || T.dur); ctx.ringT = T.ringMove; ctx.gullT = T.gull.every; ctx.gull = null; ctx.time = 0; if (T.eyesClosed && !game.headless) ctx.tone = new G.BalanceTone();
    for (const c of ctx.contestants) { G.setupBal(ctx, c, setFor(T)); c.bal.onFall = () => { c.s.fellT = 1; }; } G.makeCoach(ctx); ctx.gullBlob = G.Blobs.gull();
    if (ctx.guided) ctx.say(G.coach(), 'First, lean. Move the dot into the ring.', 5); },
  botFill(ctx, c, skill, dt) { G.leanBotFill(ctx, c, dt); },
  update(dt, ctx) { const T = ctx.T; ctx.ringT -= dt;
    if (ctx.ringT <= 0) { ctx.ringT += T.ringMove; const a = ctx.rng() * 6.283, d = T.ringR * (.5 + ctx.rng() * .5); ctx.rx = Math.cos(a) * d; ctx.ry = Math.sin(a) * d; for (const c of ctx.contestants) { c.bal.ringX = ctx.rx; c.bal.ringY = ctx.ry; } if (ctx.guided && ctx.t < 16) ctx.say(G.coach(), 'Good. Now hold. That is all a stork does.', 4); }
    ctx.gullT -= dt; if (!ctx.gull && ctx.gullT <= 0) { ctx.gull = { t: T.gull.stay, side: ctx.rng() < .5 ? -1 : 1 }; G.sfx('gull'); if (ctx.guided && ctx.t < 20) ctx.say(G.coach(), 'A gull. It weighs more than it looks. Recover by leaning away.', 4); }
    if (ctx.gull) { ctx.gull.t -= dt; if (ctx.gull.t <= 0) { for (const c of ctx.contestants) c.bal.vx += -ctx.gull.side * .35; ctx.gullT = T.gull.every; ctx.gull = null; G.sfx('flurry'); } }
    for (const c of ctx.contestants) c.bal.step(dt, c.intent.ux, c.intent.uy, { fx: ctx.gull ? ctx.gull.side * T.gull.f : 0 });
    if (ctx.tone) { const b = ctx.local.bal; ctx.tone.set(b.px, b.py, clamp(b.lean, 0, 1)); if (b.lean > .55 && ctx.local.input && ctx.local.input.rumble) { ctx.rumT = (ctx.rumT || 0) - dt; if (ctx.rumT <= 0) { ctx.rumT = .25; ctx.local.input.rumble(.2 + b.lean * .5, .2); } } }
    if (ctx.t >= ctx.dur) ctx.done = true; },
  stop(ctx) { if (ctx.tone) ctx.tone.stop(); }, cleanup(ctx) { if (ctx.tone) ctx.tone.stop(); },
  animate(dt, ctx) { ctx.time = (ctx.time || 0) + dt; for (const c of ctx.contestants) { rigStep(c.rig, dt, c.x, c.y, 1.57, [c.bal.px, c.bal.py], G.balPose(c, 'stork', ctx.time)); } if (ctx.coachRig) { ctx.coachRig.mocap = G.samplePose('stork', ctx.time + 2); G.place(ctx.coachRig, dt, -92, -14, 0, 1.2); } ctx.gullBlob.update(dt, { flap: ctx.gull ? 0 : 1 }); },
  result(ctx, c) { const b = c.bal; return { pct: b.steadiness - .05 * b.falls, detail: 'Steady ' + Math.round(b.steadiness * 100) + '%. Falls: ' + b.falls + '.' }; },
  draw(r, ctx) { G.ROOMS[ctx.festival ? 'festival' : 'deck'](r, game.real); for (const c of ctx.contestants) G.mat(r, c.x, c.y + 4, ctx.contestants.length > 1 ? E.mix(c.color || '#bfeee0', '#ffffff', .5) : '#bfeee0', 26 * c.slot.size / 2.1, 14);
    r.shape('whyfit:cactus-medium-a', 118, -30, 0); r.shape('whyfit:pot-large', -128, -24, 0); G.drawCoach(r, ctx); for (const c of ctx.contestants) G.actor(r, c.rig, { shadow: 7 });
    if (ctx.gull) { const c = ctx.contestants[0], x = c.x + ctx.gull.side * 12 * c.slot.size / 2, z = 28 * c.slot.size / 2.1 + 8; r.actor(x, c.y, z, (g, ox, oy) => ctx.gullBlob.draw(g, ox, oy, r.view)); }
    G.drawGhosts(r, ctx); if (ctx.T.eyesClosed) r.overlay(g => px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#30405a'))); },
  hud(g, r, ctx) { G.hudTop(g, r, null, G.fmtT(ctx.dur - ctx.t)); drawPlates(g, r, ctx, { hide: ctx.T.eyesClosed }); },
  ghost(ctx) { const b = ctx.local.bal; return { l: [b.px, b.py], s: Math.round(Math.max(0, b.steadiness - .05 * b.falls) * 1000) }; } });

G.activity({ id: 'flow', family: 'hold', discipline: 'Stillness', name: 'Sun Flow', tierName: 'The Long Flow', coachKey: 'breathe', song: 'yoga',
  says: 'Five poses, two breaths each. Stay in the ring and breathe with the circle. You may not skip the breathing.',
  controls: (src, lean, L) => [[lean, 'Stay in the ring'], [L('breath'), 'Breathe in as the circle grows']],
  prompts: () => [['lean', 'Lean'], ['breath', 'Breathe']],
  setup(ctx) { const T = ctx.T; ctx.dur = ctx.limit || T.poses.length * T.breaths * T.cycle; ctx.time = 0; ctx.guide = 0; for (const c of ctx.contestants) { G.setupBal(ctx, c, setFor(T)); c.s.match = 0; c.s.total = 0; } G.makeCoach(ctx); },
  poseAt(ctx, t) { const T = ctx.T, len = T.breaths * T.cycle, i = Math.min(T.poses.length - 1, Math.floor(t / len)), u = t - i * len; return { i, u, a: T.poses[i], b: T.poses[Math.min(i + 1, T.poses.length - 1)], k: u > len - .6 ? (u - (len - .6)) / .6 : 0 }; },
  botFill(ctx, c, skill, dt) { G.leanBotFill(ctx, c, dt); const lag = { poor: .9, average: .35, good: .15, expert: .05 }[skill] || 0; const u = Math.max(0, ctx.t - lag) % ctx.T.cycle; const gl = u < ctx.T.cycle / 2 ? u / (ctx.T.cycle / 2) : 1 - (u - ctx.T.cycle / 2) / (ctx.T.cycle / 2); c.intent.breath = clamp(gl, 0, 1); },
  update(dt, ctx) { const T = ctx.T, u = ctx.t % T.cycle; ctx.guide = u < T.cycle / 2 ? u / (T.cycle / 2) : 1 - (u - T.cycle / 2) / (T.cycle / 2);
    for (const c of ctx.contestants) { c.bal.step(dt, c.intent.ux, c.intent.uy); c.s.total += dt; if (Math.abs(c.intent.breath - ctx.guide) <= .25) c.s.match += dt; }
    if (ctx.t >= ctx.dur) ctx.done = true; },
  animate(dt, ctx) { ctx.time = (ctx.time || 0) + dt; const q = this.poseAt(ctx, ctx.t), Pa = G.POSES[q.a], Pb = G.POSES[q.b]; ctx.poseName = Pa.name;
    const pose = t => q.k > 0 ? G.lib.blend(G.samplePose(q.a, t), G.samplePose(q.b, t), q.k) : G.samplePose(q.a, t), tgt = Pa.tgt + (Pb.tgt - Pa.tgt) * q.k;
    for (const c of ctx.contestants) { rigStep(c.rig, dt, c.x, c.y, tgt, [c.bal.px, c.bal.py], c.bal.stumbleT > 0 ? G.sampleLoop('Dizzy', ctx.time) : pose(ctx.time)); }
    if (ctx.coachRig) { ctx.coachRig.mocap = pose(ctx.time + 1); G.place(ctx.coachRig, dt, -92, -14, 0, tgt); } },
  result(ctx, c) { const st = c.bal.steadiness, br = c.s.total ? c.s.match / c.s.total : 0; return { pct: .6 * st + .4 * br - .03 * c.bal.falls, detail: 'Steady ' + Math.round(st * 100) + '%. Breath ' + Math.round(br * 100) + '%.' }; },
  draw(r, ctx) { G.ROOMS.deck(r, game.real); G.mat(r, 0, 4, '#bfeee0', 30, 14); G.mat(r, -92, -10, '#ffe2b8', 24, 11); r.shape('whyfit:cactus-medium-b', 120, -30, 0); r.shape('whyfit:pot-large', 150, -26, 0); G.drawCoach(r, ctx); for (const c of ctx.contestants) G.actor(r, c.rig, { shadow: 7 }); },
  hud(g, r, ctx) { G.hudTop(g, r, ctx.poseName, G.fmtT(ctx.dur - ctx.t)); drawPlates(g, r, ctx); const c = ctx.local, x = r.W - 54, y = r.H - 54, gr = 8 + ctx.guide * 26, br = 8 + c.intent.breath * 26; px.disc(g, x, y, 36, '#ffffff'); for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; px.rect(g, x + Math.cos(a) * gr, y + Math.sin(a) * gr, 2, 2, G.COL.ACC); } px.disc(g, x, y, br, Math.abs(c.intent.breath - ctx.guide) <= .25 ? '#bfeee0' : '#ffd9c8'); G.text(g, u4(ctx) ? 'In' : 'Out', x, y - 3, G.COL.INK, { align: 'center' }); } });
const u4 = ctx => (ctx.t % ctx.T.cycle) < ctx.T.cycle / 2;
