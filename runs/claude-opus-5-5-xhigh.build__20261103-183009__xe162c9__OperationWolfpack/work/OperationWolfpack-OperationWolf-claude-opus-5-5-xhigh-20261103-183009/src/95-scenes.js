// The play scene (the op card, the Sim, events -> FX, sound and radio, clear and fail) and the campaign flow
// (WP.Flow): title -> briefing -> map -> op card -> play -> tally -> (cutscene) -> map ... -> ending -> credits.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp } = WP;
const OPS = ['op1', 'op2', 'op3', 'op4', 'op5', 'op6'];
WP.OPS = OPS;
const Flow = WP.Flow = Object.assign(WP.Flow || {}, { run: null, sim: null });
/** a new campaign */
Flow.newRun = (o = {}) => { Flow.run = WP.newRun(Object.assign({ diff: WP.settings('difficulty') || 'VETERAN' }, o)); Flow.run.loadouts = {}; Flow.run.scores = {}; return Flow.run; };
Flow.nextOp = run => { for (const op of OPS) if (!run.opsDone.includes(op)) return op; return null; };
/** where to go after an op's tally */
Flow.afterTally = (game, op) => {
  const run = Flow.run;
  if (run.single) { game.go(run.demo ? 'title' : 'title'); return; }
  if (op === 'op2') { game.go('cutscene', { id: 'interrogation', next: 'map' }); return; }
  if (op === 'op5') { game.go('cutscene', { id: 'aftermath', next: 'map' }); return; }
  if (op === 'op6') { game.go('ending', { n: run.hostagesSaved }); return; }
  game.go('map');
};
// ---------- the play scene ----------
const ctx = WP.ctx = {
  game: null, locals: {}, markers: true, demo: false, dev: false, devShapes: false, bigText: false, hi: 0, timeLeft: null, net: null,
  isLocal(pid) { return !!this.locals[pid] || (this.demo && pid === 0); },
  muzzle(pid) { return WP.Gun.muzzle(pid); },
  flash(c, s, k) { if (this.game) this.game.flash(c, s, k); },
  shake(n) { if (this.game) this.game.shake(n * (WP.settings('shakeK') || 1)); },
  freeze(s) { if (this.game && !this.net) this.game.freeze(s); },
  rumble(pid, k, s) { const L = this.locals[pid]; if (L && L.input && L.input.rumble) L.input.rumble(k, s); },
  slowmo() { this._slow = .5; },
  label(a) { const g = this.game, I = g && g.input; return I ? I.label(a) : a; },
  canJoin: false, joinLabel: 'OPTIONS', opLine: '',
  hostageState(i) { const s = Flow.sim; if (!s) return 0; const h = s.ents.find(e => e.type === 'hostage' && e.who === i); if (h) return h.saved ? 2 : h.lost ? -1 : 1; const st = (s.hostageLog || {})[i]; return st === undefined ? (i < s.hostages.n ? 0 : -1) : st; }
};
WP.playScene = {
  pausable: true,
  enter(data = {}) {
    const game = ctx.game, op = data.op || 'op1', run = Flow.run || Flow.newRun(), st = WP.STAGE[op];
    ctx.demo = !!data.demo; ctx.net = data.net || null; ctx.timeLeft = null;
    WP.Rigs.clear(); WP.FX.clear(); WP.HUD.clearRadio(); WP.Input.reset();
    const players = data.players || Flow.localPlayers(game);
    const loadouts = {}; for (const p of players) { const lo = run.loadouts && run.loadouts[p.pid]; if (lo && !data.fresh) loadouts[p.pid] = Object.assign({}, lo, { damage: lo.down ? 50 : lo.damage, down: false }); }
    const seed = data.seed === undefined ? ((WP.hash(op + ':' + (run.loop || 1)) ^ Math.floor((game.real || 0) * 1000)) >>> 0) : data.seed;
    const sim = Flow.sim = new WP.Sim({ stage: st, seed, run, players, loadouts, d: data.d || 0, hub: !!data.net, tempo: data.net ? 1.3 : 1, cheats: data.cheats || WP.Dev.cheats, hostages: data.hostages, tipsSeen: data.demo ? {} : WP.Store.tips(), noTips: !!data.net });
    sim.hostageLog = {};
    if (data.jump) data.jump(sim);
    WP.Render.setStage(st);
    for (const p of sim.players) { const c = WP.Input.cross[p.pid]; void c; }
    ctx.opLine = (WP.TEXT.ops[op] || [st.name, 'TARGET PRACTICE'])[1];
    this.phase = data.noCard ? 'play' : 'card'; this.t = 0; this.cardT = data.demo ? 1.2 : 3.2; this.overT = 0; this.data = data; this.op = op;
    this.startScore = sim.players.map(p => p.score);
    if (!data.net) { run.opStart = run.opStart || {}; run.opStart[op] = { loadouts: Object.fromEntries(sim.players.map(p => [p.pid, WP.Players.loadout(p)])) }; }
    WP.Music.play(game, st.music, { restart: true });
    WP.Dev.bot = WP.Dev.bot || null;
    game.canvas && (game.canvas.style.cursor = 'none');
    if (data.demo) { WP.Input.override(0, WP.Attract.botFrame); }
  },
  exit() { const g = ctx.game; if (g.canvas) g.canvas.style.cursor = ''; if (this.data && this.data.demo) WP.Input.override(0, null); WP.Audio.muteAll = false; if (!ctx.net) ctx.demo = false; },
  update(dt) {
    const game = ctx.game, sim = Flow.sim; if (!sim) return;
    WP.time += dt;
    if (ctx._slow > 0) { ctx._slow -= dt / Math.max(.05, game.timeScale); game.timeScale = ctx._slow > 0 ? .3 : WP.T.timeScale; } else if (!ctx.net) game.timeScale = WP.T.timeScale;
    if (WP.Dev.openOnPlay && this.t === 0 && !this.devOpened) { this.devOpened = true; WP.Dev.openOnPlay = false; game.pause('menu'); WP.Dev.open(game); }
    if (this.data.demo && WP.Attract.update(dt, game)) return;
    if (ctx.net && ctx.net.update(dt)) return;
    if (this.phase === 'card') { this.t += dt; if (this.t >= this.cardT) { this.phase = 'play'; this.t = 0; WP.Audio.play('menuPick'); } WP.Rigs.update(sim, dt); return; }
    // join mid-op (local co-op)
    const frames = WP.Input.frames(game, sim, ctx.locals, dt);
    if (ctx.net && ctx.net.frames) Object.assign(frames, ctx.net.frames());
    sim.step(dt, frames);
    const evs = sim.drain();
    Flow.events(sim, evs);
    if (ctx.net && ctx.net.events) ctx.net.events(evs);
    WP.Rigs.update(sim, dt); WP.FX.update(dt); WP.Gun.update(dt, sim.players); WP.HUD.update(dt); WP.Audio.loops(sim, dt);
    WP.Dev.update(dt, sim);
    // damage states: smoke and fire on hurt vehicles, trails on projectiles
    for (const e of sim.ents) {
      const tp = WP.TYPES[e.type];
      if ((tp.kind === 'vehicle' || tp.kind === 'boat' || tp.kind === 'air' || tp.kind === 'boss') && !tp.scenery && !tp.friendly && WP.fxr() < .3) {
        const k = tp.kind === 'boss' ? WP.Bosses.hp(e) / Math.max(1, WP.Bosses.hpMax(e)) : e.hp / e.maxHp;
        if (e.dead && e.stt < 5) WP.FX.smoke(e.x, e.y, (e.z || 0) + 14, 1, '#3a3430', 1.4);
        else if (!e.dead && k < .5) { WP.FX.smoke(e.x, e.y, (e.z || 0) + 18, 1, '#5a5450'); if (k < .25) WP.FX.fire(e.x, e.y, (e.z || 0) + 16, 1, 1.2); }
      }
      if (tp.kind === 'proj' && !e.gone && WP.fxr() < .7) WP.FX.trail(e.x, e.y, e.z, e.ptype);
    }
    // the op ends
    if (sim.state === 'clear' && !ctx.net) { this.overT += dt; if (this.overT > 1.2) Flow.clear(game, sim, this.op, this.data); }
    if (sim.state === 'fail' && !ctx.net) { this.overT += dt; if (this.overT > 2) Flow.fail(game, sim, this.op, this.data); }
  },
  draw(r) {
    const sim = Flow.sim, game = ctx.game; if (!sim) return;
    WP.Render.draw(r, sim, ctx);
    r.overlay(g => {
      if (WP.settings('showGun') !== false) for (const p of sim.players) if (ctx.isLocal(p.pid) && !ctx.net || ctx.net && ctx.net.isMe(p.pid)) WP.Gun.draw(g, p, sim.players.filter(q => ctx.isLocal(q.pid)).length > 1);
      for (const p of sim.players) if (!p.gone) WP.HUD.crosshair(g, p, sim, { label: sim.players.length > 1, size: WP.settings('crossSize') || 1 });
      if (sim.state === 'fail') px.blend(g, clamp((sim.failT || 0) / 1.5, 0, .6), 'multiply', () => px.rect(g, 0, 0, WP.W, WP.H, '#a02010'));
      WP.HUD.draw(g, sim, Object.assign(ctx, { hi: Math.max(ctx.hi, WP.Store.hi()), canJoin: Flow.canJoin(game), joinLabel: 'OPTIONS', dev: WP.tuneChanged().length > 0 || WP.Dev.anyCheat() }));
      if (this.phase === 'card') WP.Screens.opCard(g, sim, this.t, this.cardT);
      if (ctx.demo) { const on = Math.floor(WP.time * 1.5) % 2 === 0; px.blend(g, .7, 'normal', () => px.rect(g, 0, 108, WP.W, 22, '#000000')); if (on) WP.HUD.F(g, WP.TEXT.hud.demo, WP.W / 2, 112, '#ffd040', { align: 'center', scale: 2 }); }
      if (ctx.net && ctx.net.draw) ctx.net.draw(g);
      WP.Dev.overlay(g, sim);
    });
  }
};
/** local players: player 1 and whoever joined (game.players) */
Flow.localPlayers = game => {
  const ps = game.players || [game.input]; ctx.locals = {};
  return ps.map((inp, i) => { ctx.locals[i] = { input: inp }; return { pid: i, name: WP.CALLSIGNS[i], color: WP.SEATS[i] }; });
};
Flow.canJoin = game => {
  if (ctx.net || ctx.demo) return false;
  const ps = game.players || [game.input]; if (ps.length >= 4) return false;
  let pads = 0; try { pads = [...(globalThis.navigator && navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean).length; } catch (e) { /* blocked */ }
  const used = ps.filter(q => q.padIndex !== null && q.padIndex !== undefined).length;
  return pads > used;
};
/** a player joined (Options on a free controller): in play now, with a fresh loadout; else at the next op */
Flow.onJoin = (game, input, n) => {
  WP.Audio.play('coin');
  const sim = Flow.sim, pid = n - 1;
  if (game.sceneName === 'play' && sim && !ctx.net && !ctx.demo && !sim.players.some(p => p.pid === pid)) {
    ctx.locals[pid] = { input };
    WP.Players.add(sim, { pid, name: WP.CALLSIGNS[pid % 4], color: WP.SEATS[pid % 4] });
    WP.Screens.banner('WOLF ' + n, WP.CALLSIGNS[pid % 4] + ' JOINS THE PACK!', 2);
  }
};
/** the Sim's events for the radio, tips, music and the HUD */
Flow.events = (sim, evs) => {
  const game = ctx.game;
  WP.FX.onEvents(sim, evs, ctx); WP.Audio.onEvents(sim, evs, ctx);
  for (const ev of evs) {
    if (ev.k === 'radio') { const t = WP.TEXT[ev.key]; if (t && !ctx.net || t && ev.key.startsWith('warn')) WP.HUD.say(t.who, WP.fill(t.text, { reload: ctx.label('reload').toUpperCase(), grenade: ctx.label('grenade').toUpperCase(), fire: ctx.label('fire').toUpperCase() })); }
    else if (ev.k === 'tip') WP.Store.tipSeen(ev.key);
    else if (ev.k === 'bossWarn') { WP.Music.play(game, 'boss', { fade: .4 }); WP.Screens.banner('WARNING!', ev.name, 2.6); }
    else if (ev.k === 'bossDefeat') { WP.Music.sting(game, 'stingBoss'); game.flash && game.flash('#ffffff', .18, .8); }
    else if (ev.k === 'fury') WP.Music.sting(game, 'stingFury');
    else if (ev.k === 'hostageLost') { sim.hostageLog[ev.who] = -1; }
    else if (ev.k === 'rescued') sim.hostageLog[ev.who] = 2;
    else if (ev.k === 'quotaMet') { if (sim.quotasMet()) WP.HUD.say('DEN', WP.TEXT.quota.text); }
    else if (ev.k === 'packFury') WP.HUD.say('LOBO', WP.TEXT.packFury.text);
    else if (ev.k === 'chain') WP.HUD.say('FANG', WP.TEXT.chain.text);
    else if (ev.k === 'join') WP.Audio.play('coin');
    else if (ev.k === 'stageSwap') { WP.Render.setStage(WP.STAGE[ev.id]); WP.Music.play(game, WP.STAGE[ev.id].music, { fade: .3 }); WP.FX.clear(); if (game.flash) game.flash('#ffffff', .2, .7); }
    else if (ev.k === 'cut') WP.Screens.banner('', ev.text, 1.6);
  }
  if (WP.HUD.queue.length) WP.Music.duck(game, true); else WP.Music.duck(game, false);
};
// ---------- clear and fail ----------
Flow.clear = (game, sim, op, data) => {
  const run = Flow.run, st = sim.stage;
  if (data.demo) return;
  // carry each player's loadout and score to the next op
  run.loadouts = {};
  for (const p of sim.players) run.loadouts[p.pid] = Object.assign(WP.Players.loadout(p), { down: p.down });
  run.stats.shots += sim.players.reduce((a, p) => a + p.shots, 0); run.stats.hits += sim.players.reduce((a, p) => a + p.hits, 0);
  if (op === 'op5') run.hostagesFreed = sim.hostages.saved;
  if (op === 'op6') run.hostagesSaved = sim.hostages.saved;
  if (!run.opsDone.includes(op)) run.opsDone.push(op);
  WP.Store.cleared(op);
  game.go('tally', { op, sim: sim.snapshot(), players: sim.players.map(p => Object.assign({}, p)), hostages: sim.hostages.saved, quotaMax: sim.quotaMax, objective: sim.objective, part: sim.part, single: run.single });
};
Flow.fail = (game, sim, op, data) => {
  if (data.demo) return;
  game.go('continue', { op, score: Math.max(...sim.players.map(p => p.score)), players: sim.players.map(p => ({ pid: p.pid, score: p.score })) });
};
/** continue: the op again from its start, damage 0, the score kept, the ammo it began with (at least 4 mags, 3 grenades) */
Flow.continueOp = (game, op, scores) => {
  const run = Flow.run; run.continues++;
  const st = run.opStart && run.opStart[op];
  run.loadouts = {};
  if (st) for (const pid in st.loadouts) { const lo = st.loadouts[pid]; const full = Math.round(WP.T.magSize); const sp = lo.spares.slice(); while (sp.length < 3) sp.push(full); run.loadouts[pid] = { damage: 0, mag: Math.max(lo.mag, full), spares: sp, grenades: Math.max(3, lo.grenades), score: (scores && scores[pid] !== undefined) ? scores[pid] : lo.score, down: false }; }
  game.go('opcard', { op });
};
})();
