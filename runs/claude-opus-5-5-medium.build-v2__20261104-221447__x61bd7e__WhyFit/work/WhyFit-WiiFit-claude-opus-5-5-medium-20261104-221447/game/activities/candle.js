// Quiet Candle, and the Grand Stillness duel. The flame reacts to the speed of the dot, not where it is.
const DUEL_BITS = [{ at: 10, id: 'gull', f: 3.5 }, { at: 25, id: 'blender', f: 4 }, { at: 40, id: 'conga', f: 4.5 }, { at: 55, id: 'fireworks', f: 4 }, { at: 68, id: 'tare', f: 4.5 }, { at: 80, id: 'goose', f: 5 }];
G.activity({ id: 'candle', family: 'candle', discipline: 'Stillness', name: 'Quiet Candle', tierName: 'With Company', class: true, hub: true, coachKey: 'hold', song: 'yoga',
  says: 'Sit. Keep the dot in the ring and move it slowly. Fast corrections hurt the flame. Thoughts will come. You may not leave.',
  controls: (src, lean) => [[lean, 'Correct gently']],
  prompts: () => [['lean', 'Correct gently']],
  setup(ctx) { const T = ctx.T; ctx.dur = ctx.duel && !ctx.limit ? 90 : (ctx.limit || T.dur); if (ctx.data.demoT) ctx.t = 0; ctx.thT = ctx.duel ? 99 : 4; ctx.thoughts = []; ctx.time = 0; ctx.her = 1; ctx.bits = ctx.duel ? DUEL_BITS.map(b => Object.assign({}, b)) : (T.extra ? T.extra.map((id, i) => ({ at: 15 + i * 22, id, f: 4 })) : []); ctx.show = {};
    for (const c of ctx.contestants) { G.setupBal(ctx, c, G.SETS.candle); c.s.flame = 1; c.s.sum = 0; c.s.n = 0; c.s.relit = false; c.s.out = false; c.s.pen = 0; c.bal.onFall = () => { c.s.flame -= .3; }; }
    if (ctx.duel) { ctx.gert = G.regularRig('gertrude', 1.9); ctx.gert.wear = G.CAST.gertrude.wear; ctx.gullB = G.Blobs.gull(); ctx.goose = G.Blobs.pigeon(); } ctx.fires = []; },
  botFill(ctx, c, skill, dt) { G.leanBotFill(ctx, c, dt); },
  addThought(ctx, text, f) { const a = ctx.rng() * 6.283; ctx.thoughts.push({ text, x: Math.cos(a), y: Math.sin(a), t: 2.5, f, age: 0, a }); },
  update(dt, ctx) { const T = ctx.T, loc = ctx.local; ctx.thT -= dt;
    if (ctx.thT <= 0) { ctx.thT += T.thoughtEvery; this.addThought(ctx, G.pick(G.LINES.thoughts, ctx.rng), lerp(T.thoughtF[0], T.thoughtF[1], ctx.rng())); }
    for (const b of ctx.bits) if (!b.done && ctx.t >= b.at) { b.done = true; ctx.show[b.id] = 6; this.addThought(ctx, G.LINES.duelBits[b.id], b.f); G.sfx(b.id === 'gull' ? 'gull' : b.id === 'blender' ? 'blender' : b.id === 'goose' ? 'goose' : b.id === 'fireworks' ? 'firework' : 'tick'); if (b.id === 'fireworks') { game.flash('#ffe0a0', .2, .4); for (let i = 0; i < 5; i++) ctx.fires.push({ x: ctx.rng(), y: ctx.rng() * .4, t: i * .5, c: G.pick(['#ff7a59', '#f5c84b', '#2cc6e6', '#e85d8a'], ctx.rng) }); } if (b.id === 'tare') { for (let i = 0; i < 6; i++) game.after(i * .32, () => G.babble('TARE', 'a')); } }
    for (const k in ctx.show) ctx.show[k] -= dt;
    let fx = 0, fy = 0; for (const th of ctx.thoughts) { th.age += dt; th.t -= dt; if (th.t > 0) { fx += th.x * th.f; fy += th.y * th.f; } } ctx.thoughts = ctx.thoughts.filter(t => t.age < 4);
    if (loc && !loc.bot && !ctx.warned && ctx.t >= 20 && !loc.intent.touched && !ctx.duel) { ctx.warned = true; ctx.say('tare', G.line('candleUntouched'), 5); }
    let alive = false;
    for (const c of ctx.contestants) { const s = c.s, b = c.bal; if (s.out) continue; alive = true; b.step(dt, c.intent.ux, c.intent.uy, { fx, fy });
      const sp = Math.hypot(b.vx, b.vy); if (sp > .55) { s.flame -= .4 * dt; if (c.local) { s.fl = (s.fl || 0) - dt; if (s.fl <= 0) { s.fl = .3; G.sfx('flick'); } } } if (b.inRing) s.flame = Math.min(1, s.flame + .12 * dt); if (!b.inRing && b.lean > .6) s.flame -= .05 * dt;
      s.sum += Math.max(0, s.flame); s.n++;
      if (s.flame <= 0) { if (!s.relit && !ctx.cheat) { s.relit = true; s.flame = .5; s.pen = .15; G.sfx('stamp', { vol: .2 }); if (c.local) ctx.say('tare', 'I relit it. Please do not tell the candle.', 3); } else if (ctx.cheat) s.flame = .6; else { s.out = true; s.flame = 0; } } }
    if (ctx.duel && ctx.t > 75 && loc.s.flame > .5) ctx.her = Math.max(0, ctx.her - dt / 12);
    if (!alive || ctx.t >= ctx.dur) ctx.done = true; },
  stop(ctx) { if (ctx.duel) { ctx.won = ctx.her <= .001 && !ctx.local.s.out; } },
  onResults(ctx) { if (ctx.duel && G.state) { if (ctx.won) { G.state.duelWon = true; G.state.age = G.computeAge(G.state); } ctx.say('gertrude', ctx.won ? G.LINES.duelWin : G.LINES.duelLose, 5); G.save(); } },
  animate(dt, ctx) { ctx.time = (ctx.time || 0) + dt; for (const c of ctx.contestants) { c.rig.wob = [c.bal.px * .6, c.bal.py * .6]; c.rig.mocap = c.bal.stumbleT > 0 ? G.sampleLoop('Dizzy', ctx.time) : G.sampleLoop('Meditate', ctx.time * .4); G.place(c.rig, dt, c.x, c.y, 0, 1.57); }
    if (ctx.gert) { ctx.gert.mocap = G.sampleLoop('Meditate', ctx.time * .3); G.place(ctx.gert, dt, 66, -4, 0, 1.3); ctx.gullB.update(dt, { flap: 1 }); ctx.goose.update(dt, { flap: 0, walk: 1 }); } },
  result(ctx, c) { const s = c.s, st = c.bal.steadiness, mf = s.n ? s.sum / s.n : 0; return { pct: .6 * st + .4 * mf - s.pen, detail: ctx.duel ? (ctx.won ? 'Her candle went out. She did not seem surprised.' : 'Her candle is still lit. It has been lit since Thursday.') : 'Steady ' + Math.round(st * 100) + '%. Mean flame ' + Math.round(mf * 100) + '%.' }; },
  draw(r, ctx) { const t = game.real; if (ctx.duel) { G.ROOMS.raft(r, t); r.shape('whyfit:lantern-glass', -100, -18, 0); r.shape('whyfit:lantern-glass', 104, -18, 0); r.shape('whyfit:lantern-glass', -106, 26, 0); r.shape('whyfit:lantern-glass', 110, 26, 0); game.lights.add(-100, -18, 18, 70, .8, { color: '#ffc070' }); game.lights.add(104, -18, 18, 70, .8, { color: '#ffc070' }); } else { G.ROOMS.deck(r, t); G.PROPS.fern(r.ctx, r.W * .14, r.w(0, -30, 0)[1], t); G.PROPS.fern(r.ctx, r.W * .86, r.w(0, -30, 0)[1], t); }
    const cand = (x, y, fl) => { r.queue(x, y + 30, 0, g => { const p = r.w(x, y + 30, 0); G.PROPS.candle(g, p[0], p[1], Math.max(0, fl), game.real); }, { emissive: true }); if (fl > 0) game.lights.add(x, y + 22, 12, 34 + fl * 26, .7, { color: '#ffc070' }); };
    for (const c of ctx.contestants) { if (!ctx.duel) G.mat(r, c.x, c.y + 4, '#e6dcff', 26 * c.slot.size / 2.1, 14); cand(c.x, c.y, c.s.flame); G.actor(r, c.rig, { shadow: 8 }); }
    if (ctx.gert) { cand(66, -4, ctx.her); G.actor(r, ctx.gert); const sh = ctx.show;
      if (sh.gull > 0) r.actor(-20, 6, 8, (g, ox, oy) => ctx.gullB.draw(g, ox, oy, r.view));
      if (sh.goose > 0) r.actor(30 - (6 - sh.goose) * 6, 22, 0, (g, ox, oy) => ctx.goose.draw(g, ox, oy, r.view));
      if (sh.blender > 0) r.queue(-120, -10, 0, g => { const p = r.w(-120, -10, 0); G.PROPS.blender(g, p[0] + Math.sin(game.real * 40), p[1]); });
      if (sh.conga > 0) for (let i = 0; i < 5; i++) { r.queue(-100 + (6 - sh.conga) * 30 + i * -16, -20, 0, g => { const x = -100 + (6 - sh.conga) * 30 + i * -16, p = r.w(x, -20, 0), hop = Math.abs(Math.sin(game.real * 6 + i)) * 3; px.rect(g, p[0] - 3, p[1] - 14 - hop, 6, 14, ['#ff7a59', '#2cc6e6', '#f5c84b', '#7bd389', '#c79be8'][i]); px.disc(g, p[0], p[1] - 17 - hop, 3, '#f0c8a0'); }); } }
    r.overlay(g => { for (const f of ctx.fires) { const u = (ctx.t - (ctx.fireBase || 55)) - f.t; if (u > 0 && u < 1.2) for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, d = u * 26; px.rect(g, f.x * r.W + Math.cos(a) * d, 8 + f.y * r.H * .5 + Math.sin(a) * d, 2, 2, f.c); } } });
    G.drawGhosts(r, ctx); },
  hud(g, r, ctx) { G.hudTop(g, r, null, G.fmtT(ctx.dur - ctx.t)); G.drawPlates(g, r, ctx);
    if (ctx.contestants.length === 1) { const f = Math.max(0, ctx.local.s.flame), x = 12, w = 72, y = r.H - 30; G.round(g, x, y, w + 6, 10, '#ffffff'); if (f > .02) px.rect(g, x + 3, y + 3, w * f, 4, f > .4 ? '#f5a742' : '#e0553a'); G.text(g, 'Flame', x + 3, y - 10, ctx.duel ? '#fff' : G.COL.INK); if (ctx.duel) { const y2 = y - 24; G.round(g, x, y2, w + 6, 10, '#ffffff'); if (ctx.her > .02) px.rect(g, x + 3, y2 + 3, w * ctx.her, 4, '#c79be8'); G.text(g, 'Gertrude', x + 3, y2 - 10, '#fff'); } }
    for (const th of ctx.thoughts) { const fade = th.age < .3 ? th.age / .3 : th.age > 3.5 ? (4 - th.age) / .5 : 1; if (fade <= .2) continue; const w = Math.min(170, E.font.width(th.text) + 16), lines = E.font.wrap(th.text, w - 12), h = lines.length * 10 + 8, cx = r.W / 2 + th.x * r.W * .3, cy = 62 - th.y * 24 - th.age * 2; G.round(g, cx - w / 2 + 1, cy + 1, w, h, '#b9cfd6', 6); G.round(g, cx - w / 2, cy, w, h, '#ffffff', 6); lines.forEach((l, i) => G.text(g, l, cx, cy + 4 + i * 10, G.COL.INK, { align: 'center' })); px.disc(g, cx, cy + h + 3, 2, '#ffffff'); } },
  ghost(ctx) { const b = ctx.local.bal; return { l: [b.px, b.py], s: Math.round(Math.max(0, .6 * b.steadiness + .4 * (ctx.local.s.n ? ctx.local.s.sum / ctx.local.s.n : 0) - ctx.local.s.pen) * 1000) }; } });
