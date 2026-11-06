// A session: Card -> instructor demonstrates -> Breathe in, 3 2 1 -> play -> stars -> Again or Done. Every activity is one
// registry entry and becomes its own pausable scene here. Class, Attract, The Gentle Games and the hub round use the same scene.
G.slots = n => n <= 1 ? [{ x: 0, y: 0, size: 2.1 }] : n === 2 ? [{ x: -44, y: 0, size: 1.9 }, { x: 44, y: 0, size: 1.9 }] : [{ x: -96, y: 0, size: 1.5 }, { x: -32, y: 0, size: 1.5 }, { x: 32, y: 0, size: 1.5 }, { x: 96, y: 0, size: 1.5 }].slice(0, 4);
G.makeCtx = (def, data) => {
  const tier = data.tier || 0, T = def.tiers[tier], seed = data.seed !== undefined ? data.seed : Math.floor(G.rng() * 1e9), rng = E.rng(seed);
  const mode = data.mode || 'free', ctx = { def, id: def.id, tier, T, mode, classMode: mode === 'class', rng, seed, t: 0, done: false, cheat: !!data.cheat, short: !!data.short, festival: !!data.festival, guided: !!data.guided, data, limit: data.limit || null, duel: !!data.duel, contestants: [], local: null, ghosts: data.ghosts || null };
  const list = data.contestants || [{ name: G.state ? G.state.name : 'You', input: game.input, color: G.COL.CORAL, local: true, bot: data.bot || null, rig: data.rig || null }];
  const n = Math.max(list.length, data.mats || 0), slots = data.slots || G.slots(ctx.ghosts ? Math.max(n, 2) : n);
  ctx.contestants = list.map((c, i) => { const slot = slots[i] || slots[0];
    const o = { i, name: c.name, color: c.color, local: !!c.local, input: c.input || null, player1: c.input === game.input, bot: c.bot || null, forScore: c.forScore !== false, intent: G.newIntent(), score: 0, pct: 0, s: {}, slot, x: slot.x, y: slot.y };
    if (c.rig) o.rig = c.rig; else if (G.state && c.local && !def.noRig) o.rig = G.memberRig(def.rigSize || slot.size); else if (!def.noRig) o.rig = G.lookToRig({ hair: 'short', skin: i % 6, top: i % 8, bottom: i % 4 }, def.rigSize || slot.size, {});
    if (o.bot) o.lean = new G.LeanBot(o.bot, E.rng(seed + 11 + i * 7));
    return o; });
  ctx.local = ctx.contestants.find(c => c.local) || ctx.contestants[0];
  if (G.TOOLS.bot && ctx.local && !ctx.local.bot) { ctx.local.bot = G.TOOLS.bot; ctx.local.lean = new G.LeanBot(G.TOOLS.bot, E.rng(seed + 3)); ctx.toolBot = true; }
  ctx.say = (who, line, secs) => { if (ctx.mode === 'round') return; G.chat(who, line, secs); };
  ctx.finish = () => { ctx.done = true; };
  ctx.coachId = data.coach || G.coach();
  return ctx;
};
// local effects of the Lean: the chime that climbs, the creak near the edge, the rumble
G.leanFx = (c, ctx, dt) => { const b = c.bal; if (!b || !c.local) return; const s = c.s;
  s.chT = (s.chT || 0) - dt; if (b.inRing && b.streak > 1.2 && s.chT <= 0) { s.chT = 1.4; G.sfx('chime', { vol: .18, pitch: 1 + Math.min(1, b.streak / 16) }); }
  s.crT = (s.crT || 0) - dt; const e = b.lean; if (e > .72 && s.crT <= 0) { s.crT = .55; G.sfx('creak', { vol: .3 + (e - .72) }); if (c.input && c.input.rumble) c.input.rumble(.2 + (e - .7) * 1.2, .15); }
  if (b.stumbleT > 0 && !s.st) { s.st = true; G.sfx('stumble'); if (c.input && c.input.rumble) c.input.rumble(.7, .35); if (ctx.mode !== 'attract' && ctx.mode !== 'round' && G.rng() < .35) G.chat('tare', G.line('fall')); } if (b.stumbleT <= 0) s.st = false; };
G.playStep = (ctx, dt) => { const def = ctx.def;
  for (const c of ctx.contestants) { if (c.bot) { if (def.botFill) def.botFill(ctx, c, c.bot, dt); } else if (c.input) G.fillDevice(c, ctx, dt); }
  def.update(dt, ctx); for (const c of ctx.contestants) G.leanFx(c, ctx, dt);
  ctx.t += dt; if (ctx.limit && ctx.t >= ctx.limit) ctx.done = true; };
G.resultOf = (ctx, c) => { const def = ctx.def, res = def.result(ctx, c), pct = clamp(res.pct, 0, 1); c.pct = pct; c.score = Math.round(pct * 1000); c.stars = G.starsFor(def, pct); c.detail = res.detail || ''; return c; };
G.record = (ctx, c) => { const st = G.state; if (!st) return { minutes: 0, unlocked: [] }; const id = ctx.id, b = st.best[id] = st.best[id] || {}, k = ctx.tier, prev = b[k]; if (!prev || c.pct > prev.pct) b[k] = { pct: c.pct, stars: c.stars }; st.played[id] = true;
  const before = G.unlockedItems(st).length, suggested = st.suggestion === id, m = 2 * (1 + .25 * c.stars) * (suggested ? 1.5 : 1) * G.DEV.minutes; st.minutes = Math.round((st.minutes + m) * 10) / 10; st.age = st.day === 3 && !st.finished ? st.heldAge : G.computeAge(st); if (c.stars >= 2 && st.day === 2) st.flags.nod = true; return { minutes: m, suggested, unlocked: G.unlockedItems(st).slice(before) }; };
G.activity = def => {
  Object.assign(def, G.ACTDATA[def.id] || {}); G.acts[def.id] = def; G.actOrder.push(def.id);
  const scene = { pausable: true, view: def.view || 'brawler', camera: { zoom: false }, phase: 'card',
    enter(data) { data = data || {}; this.data = data; G.talk.close(); const ctx = this.ctx = G.makeCtx(def, data); this.t = 0; this.resT = 0; this.pills = null; this.line = null;
      def.setup(ctx); if (def.animate) def.animate(1 / 120, ctx);
      const mode = ctx.mode; this.phase = data.skipCard || mode === 'class' ? 'count' : mode === 'attract' || mode === 'round' ? 'play' : 'card';
      if (this.phase === 'card') this.makeCardPills(); G.music(def.song || (ctx.T && ctx.T.song) || 'studio', ctx.T && ctx.T.song ? { restart: false } : undefined);
      if (data.again) this.phase = 'count'; if (this.phase === 'count') this.countIn(); if (this.phase === 'play' && mode !== 'round' && def.begin) def.begin(ctx); this.pausable = mode !== 'attract'; G.lastAct = { name: 'act_' + def.id, data };
      G.lightFor(ctx.duel ? 'dusk' : def.light || null); if (def.enterView) def.enterView(ctx); },
    exit() { const ctx = this.ctx; if (def.cleanup) def.cleanup(ctx); G.lightFor(null); game.input.stopRumble && game.input.stopRumble(); G.setHand(false); },
    countIn() { this.t = 0; if (this.ctx.mode !== 'class') G.sfx('boop', { vol: .2 }); },
    makeCardPills() { const items = [{ label: 'Begin', on: () => { this.phase = 'demo'; this.t = 0; G.talk.close(); const line = G.coachLine(def.coachKey || 'hold'); if (!def.noDemoLine) G.chat(G.coach(), line, 3); } }];
      const st = G.state, ctx = this.ctx; if (ctx.mode !== 'games' && st && def.tiers[1] && (ctx.tier === 1 || G.tier2Open(st, def.id))) items.push({ label: ctx.tier === 1 ? 'Back to the first tier' : 'Harder: ' + (def.tierName || 'Second tier'), on: () => { game.go(this.name, Object.assign({}, this.data, { tier: ctx.tier === 1 ? 0 : 1 }), { fade: 0 }); } });
      if (ctx.mode !== 'games') items.push({ label: 'Not now', on: () => this.leave(true) });
      this.pills = new G.Pills(items, { dir: 'h', onBack: ctx.mode === 'games' ? null : () => this.leave(true) }); },
    leave(skip) { const ctx = this.ctx, st = G.state; G.talk.close(); if (skip && ctx.mode === 'story') G.nextChat = G.LINES.quit;
      if (this.data.onDone) { this.data.onDone(ctx.local, skip); return; }
      if (!skip && ctx.mode === 'story' && st) { st.session++; st.lastActivity = def.id; G.save(); }
      game.go(ctx.mode === 'free' && this.data.from ? this.data.from : 'island'); },
    update(dt) { const ctx = this.ctx; this.t += dt; if (G.talk.update(dt)) return;
      if (this.phase === 'card') { if (this.pills) this.pills.update(dt); if (def.animate) def.animate(dt, ctx); return; }
      if (this.phase === 'demo') { if (def.animate) def.animate(dt, ctx); if (this.t > 3 || game.input.pressed('confirm')) { this.phase = 'count'; this.countIn(); } return; }
      if (this.phase === 'count') { if (def.animate) def.animate(dt, ctx); if (Math.floor(this.t) !== Math.floor(this.t - dt) && this.t < 3 && this.t > 0) G.sfx('tick', { vol: .4 }); if (this.t >= 3) { this.phase = 'play'; this.t = 0; G.sfx('boop', { vol: .3 }); if (def.begin) def.begin(ctx); } return; }
      if (ctx.mode === 'round') { G.Round.step(this, dt); return; } if (this.phase === 'play') { G.setHand(G.source(game.input) === 'mouse'); G.playStep(ctx, dt); if (def.animate) def.animate(dt, ctx); if (ctx.done) this.finish(); return; }
      if (this.phase === 'results') { this.resT += dt; if (def.animate) def.animate(dt, ctx); this.tickResults(dt); if (this.pills && this.resT > 1.2) this.pills.update(dt); } },
    finish() { const ctx = this.ctx; G.setHand(false); for (const c of ctx.contestants) G.resultOf(ctx, c); if (def.stop) def.stop(ctx);
      if (ctx.mode === 'attract') { G.Attract.next(); return; }
      if (ctx.mode === 'round') return;
      if (ctx.mode === 'class') { this.data.onDone(ctx); return; }
      const c = ctx.local; this.phase = 'results'; this.resT = 0; this.reward = G.record(ctx, c); G.stars = c.stars; this.coins = []; this.coinT = 0; this.stampT = 0; this.stamped = 0; G.save(); G.stopMusic();
      const leave = { label: 'Done', on: () => this.leave(false) }, again = { label: 'Again', on: () => game.go(this.name, Object.assign({}, this.data, { again: true, tier: ctx.tier }), { fade: 0 }) };
      this.pills = new G.Pills(ctx.mode === 'games' ? [leave] : [again, leave], { dir: 'h', start: ctx.mode === 'games' ? 0 : 1 });
      G.talk.say(G.line('star' + c.stars), Object.assign(G.speaker('tare'), { auto: 4.5, modal: false, place: 'top' }));
      if (def.onResults) def.onResults(ctx, c); },
    tickResults(dt) { const c = this.ctx.local; this.stampT += dt; if (this.stamped < c.stars && this.stampT > .35 + this.stamped * .35) { this.stamped++; G.sfx('stamp'); G.sting('star' + this.stamped); game.shake(1); } if (this.stampT > .4 + c.stars * .35 && !this.spawned) { this.spawned = true; const n = Math.ceil(this.reward.minutes); for (let i = 0; i < n; i++) this.coins.push({ t: -i * .14, x: 0 }); }
      for (const k of this.coins) { const b = k.t; k.t += dt; if (b < .7 && k.t >= .7) { G.sfx('clink', { vol: .4, pitch: 1 + G.rng() * .1 }); this.gulp = 1; } } this.gulp = Math.max(0, (this.gulp || 0) - dt * 5);
      if (this.spawned && !this.announced && this.coins.every(k => k.t > .8)) { this.announced = true; if (this.reward.unlocked.length) { G.sting('unlock'); const u = this.reward.unlocked[0]; G.talk.say(G.LINES.unlock[u.id], Object.assign(G.speaker('tare'), { auto: 4, modal: false, place: 'top' })); } else if (G.rng() < .4) G.talk.say(G.line('gerald'), Object.assign(G.speaker('tare'), { auto: 4, modal: false, place: 'top' })); } },
    draw(r) { const ctx = this.ctx; def.draw(r, ctx); r.overlay(g => { if (this.phase === 'play' || this.phase === 'count' || this.phase === 'demo') { if (def.hud) def.hud(g, r, ctx); } if (ctx.festival) G.drawFestivalBanner(g, r); if (ctx.mode === 'round') G.Round.overlay(g, r, ctx); });
      if (this.phase === 'card') r.overlay(g => { G.drawActCard(g, r, ctx); this.pills.draw(g); });
      if (this.phase === 'count') r.overlay(g => { const n = 3 - Math.floor(this.t); G.text(g, 'Breathe in', r.W / 2, r.H * .28, G.COL.INK, { align: 'center', scale: 2, shadow: '#fff' }); G.text(g, String(Math.max(1, n)), r.W / 2, r.H * .28 + 22, G.COL.ACCD, { align: 'center', scale: 3, shadow: '#fff' }); });
      if (this.phase === 'demo') r.overlay(g => G.text(g, def.name, r.W / 2, 26, G.COL.INK, { align: 'center', scale: 2 }));
      if (this.phase === 'results') r.overlay(g => { G.drawResults(g, r, ctx, this); this.pills.draw(g); });
      if (this.phase === 'play' && def.prompts && !(ctx.contestants.length > 1 && ctx.id === 'step')) G.prompt(r, def.prompts(ctx));
      if (this.phase === 'card' || this.phase === 'results') G.prompt(r, [['confirm', 'Choose']]);
      G.talk.draw(r); if (this.phase === 'play') G.drawHand(r); } };
  scene.name = 'act_' + def.id; def.scene = scene; G.scene(scene.name, scene); return def;
};
G.drawFestivalBanner = (g, r) => { const s = 'The Gentle Games', w = E.font.width(s) + 12; G.round(g, r.W - w - 118, 8, w, 14, '#f5c84b'); G.text(g, s, r.W - w - 112, 12, G.COL.INK); };
G.deviceText = (ctx, lines) => { const src = G.source(game.input); return lines[src] || lines.keys; };
G.drawActCard = (g, r, ctx) => { const def = ctx.def, w = Math.min(r.W - 60, 320), h = 112, x = (r.W - w) >> 1, y = Math.max(14, (r.H - h - 30) >> 1) - 6, st = G.state;
  G.panel(g, x, y, w, h); G.text(g, def.name + (ctx.tier ? ': ' + (def.tierName || 'Second tier') : ''), x + 12, y + 9, G.COL.INK, { scale: 2 }); G.text(g, def.discipline, x + w - 12, y + 12, G.COL.ACCD, { align: 'right' });
  let yy = y + 30; yy += G.wrapText(g, ctx.tier && def.tierSays ? def.tierSays : def.says, x + 12, yy, w - 24, G.COL.INK) + 4;
  for (const row of G.controlsFor(def)) { const lab = row[0], wl = E.font.width(lab) + 8; G.round(g, x + 12, yy - 2, wl, 11, G.COL.ACC); G.text(g, lab, x + 16, yy, '#fff'); G.text(g, row[1], x + 16 + wl, yy, G.COL.INK); yy += 13; }
  const sx = x + 16, sy = y + h - 12; const stars = def.stars; for (let i = 0; i < 3; i++) { const cx = sx + i * 58; G.starSprite(g, cx, sy, st && G.bestStars(st, def.id) > i, 1); G.text(g, Math.round(stars[i] * 100) + '%', cx + 9, sy - 3, G.COL.MUT); }
  const b = st && st.best[def.id] && st.best[def.id][ctx.tier]; G.text(g, b ? 'Best ' + Math.round(b.pct * 100) + '%' : 'Not yet tried', x + w - 12, sy - 3, G.COL.CORAL, { align: 'right' }); };
G.controlsFor = def => { const src = G.source(game.input), lean = G.leanLabel(); return def.controls(src, lean, a => G.promptLabel(a)); };
G.drawResults = (g, r, ctx, sc) => { const c = ctx.local, w = Math.min(r.W - 70, 300), h = 104, x = (r.W - w) >> 1, y = Math.max(44, (r.H - h - 30) >> 1) - 4; G.panel(g, x, y, w, h);
  G.text(g, ctx.def.name, x + 12, y + 9, G.COL.INK, {}); G.text(g, Math.round(c.pct * 100) + '%', x + w - 12, y + 7, G.COL.CORAL, { align: 'right', scale: 2 });
  for (let i = 0; i < 3; i++) { const on = i < sc.stamped, k = on && sc.stamped === i + 1 ? 1 + Math.max(0, .5 - (sc.stampT - (.35 + i * .35)) * 2) : 1; G.starSprite(g, x + 30 + i * 34, y + 38, on, 2, k); }
  G.wrapText(g, c.detail, x + 12, y + 60, w - 90, G.COL.MUT); const gx = x + w - 40, gy = y + h - 12; G.drawGeraldAt(g, gx, gy, 1.2, G.state && G.state.minutes >= 30, sc.gulp || 0);
  for (const k of sc.coins) if (k.t > 0 && k.t < .75) { const u = k.t / .7, cx = x + w * .45 + (gx - x - w * .45) * u, cy = y + 70 + (gy - 28 - y - 70) * u - Math.sin(u * Math.PI) * 26; px.disc(g, cx, cy, 3, '#f5c84b'); px.rect(g, cx - 1, cy - 1, 1, 1, '#fff2c0'); }
  const m = sc.reward; G.text(g, '+' + (Math.round(m.minutes * 10) / 10) + ' min' + (m.suggested ? ' (Suggested)' : ''), x + 12, y + h - 13, G.COL.ACCD); };
// with a mouse: hide the OS cursor over the canvas during activities and draw a small soft hand instead
G.setHand = on => { G.handOn = on; if (typeof document === 'undefined' || !document.getElementById) return; const c = document.getElementById('screen'); if (c && c.style) c.style.cursor = on ? 'none' : ''; };
G.drawHand = r => { if (!G.handOn) return; const p = game.input.pointer && game.input.pointer(); if (!p) return; r.overlay(g => { px.disc(g, p[0], p[1], 3, '#ffd9c8'); px.disc(g, p[0] - 1, p[1] - 1, 1, '#ffffff'); for (let i = -1; i <= 1; i++) px.rect(g, p[0] + i * 2, p[1] - 5, 1, 2, '#ffd9c8'); }); };
G.restartSession = () => { if (G.lastAct && game.sceneName === G.lastAct.name && !G.inSession) { game.resume(); game.go(G.lastAct.name, Object.assign({}, G.lastAct.data, { again: true }), { fade: 0 }); } else game.resume(); };
