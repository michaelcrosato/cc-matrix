/* OLYMPIYIKES! — the EventKit (§5.1-5.4): the event contract, the phase runner, formats (race / attempts / match),
 * CPU simulation in a sandbox, results, qualifying, points, timing widgets and the shared HUD pieces. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, G = O.G, px = E.px, clamp = E.clamp;
O.EVENTS = {}; O.EVENT_LIST = [];

/* ---- timing widgets (§5.4) ---- */
/** a needle sweeping a bar (ping-pong); zones [{ from, to, name, q }]; press() → { q, zone, v } */
class TimingBar {
  constructor(o = {}) { this.hz = o.hz || 1.2; this.zones = o.zones || [{ from: .45, to: .55, name: 'PERFECT', q: 1 }, { from: .3, to: .7, name: 'GOOD', q: .6 }]; this.t = o.t0 || 0; this.v = 0; this.done = null; }
  update(dt) { if (this.done) return; this.t += dt; const u = (this.t * this.hz) % 2; this.v = u < 1 ? u : 2 - u; }
  press() { const ws = O.winScale(); let best = { q: .1, zone: 'MISS', v: this.v }; for (const z of this.zones) { const c = (z.from + z.to) / 2, h = (z.to - z.from) / 2 * ws; if (Math.abs(this.v - c) <= h && z.q > best.q) best = { q: z.q, zone: z.name, v: this.v }; } this.done = best; return best; }
  draw(g, x, y, w, h = 10) {
    px.rect(g, x - 1, y - 1, w + 2, h + 2, '#05060f'); px.rect(g, x, y, w, h, '#2a3060'); const ws = O.winScale();
    for (const z of this.zones.slice().sort((a, b) => a.q - b.q)) { const c = (z.from + z.to) / 2, hh = (z.to - z.from) / 2 * ws; px.rect(g, x + w * Math.max(0, c - hh), y, w * Math.min(1, 2 * hh), h, z.q >= 1 ? '#f2c94c' : z.q >= .6 ? '#4fe0a8' : '#3a7cf0'); }
    const nx = Math.round(x + w * this.v); px.rect(g, nx - 1, y - 3, 3, h + 6, '#ffffff'); px.rect(g, nx, y - 2, 1, h + 4, '#e8443a');
  }
}
O.TimingBar = TimingBar;
/** a ring shrinking onto a target over dur: press() → signed ms error → PERFECT / GOOD / BAD */
class Ring {
  constructor(dur = .9) { this.dur = dur; this.t = 0; this.res = null; }
  update(dt) { if (!this.res) this.t += dt; if (!this.res && this.t > this.dur + .35) this.res = { j: 'BAD', ms: 999 }; }
  press() { if (this.res) return this.res; const ms = (this.t - this.dur) * 1000, ws = O.winScale(), a = Math.abs(ms); this.res = { j: a <= 60 * ws ? 'PERFECT' : a <= 140 * ws ? 'GOOD' : 'BAD', ms }; return this.res; }
  draw(g, cx, cy, R = 22) { const k = Math.max(0, 1 - this.t / this.dur); px.disc(g, cx, cy, R + 1, '#f2c94c'); px.disc(g, cx, cy, R - 1, '#141a3a'); const rr = R + k * 40; for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; px.rect(g, Math.round(cx + Math.cos(t) * rr), Math.round(cy + Math.sin(t) * rr), 2, 2, '#ffffff'); } }
}
O.Ring = Ring;
/** a balance needle b ∈ [-1, 1] with noisy drift, corrected by a stick axis; out of range = lost */
class Balance {
  constructor(rnd, o = {}) { this.rnd = rnd; this.b = 0; this.v = 0; this.drift = o.drift || 1; this.damp = o.damp || 1.2; this.k = o.k || 3.2; this.nt = 0; this.n = 0; this.lost = false; this.inside = 0; }
  update(dt, axis, driftMul = 1) {
    if (this.lost) return; this.nt -= dt; if (this.nt <= 0) { this.nt = .25 + this.rnd() * .35; this.n = (this.rnd() * 2 - 1) + this.b * .6; }
    this.v += (this.n * this.drift * driftMul * 1.6 - this.v * this.damp) * dt; this.v += -axis * this.k * dt; this.v *= Math.pow(.2, dt);
    this.b += this.v * dt; if (Math.abs(this.b) > 1) { this.lost = true; this.b = Math.sign(this.b); }
  }
  draw(g, cx, y, w = 120, label) {
    px.rect(g, cx - w / 2 - 2, y - 2, w + 4, 14, '#05060f'); px.rect(g, cx - w / 2, y, w, 10, '#e8443a'); px.rect(g, cx - w * .35, y, w * .7, 10, '#f2c94c'); px.rect(g, cx - w * .17, y, w * .34, 10, '#4fe0a8');
    const nx = Math.round(cx + this.b * w / 2); px.rect(g, nx - 2, y - 4, 5, 18, '#ffffff'); px.rect(g, nx - 1, y - 3, 3, 16, '#1a1d2e');
    if (label) O.text(g, label, cx, y + 14, '#ffffff', { align: 'center' });
  }
}
O.Balance = Balance;

/* ---- common HUD bits ---- */
O.HUD = {
  flame(g, x, y, a, inp) {
    const k = a.turboT > 0 ? a.turboT / G.turboTime : a.hype, full = a.hype >= 1 || a.turboT > 0;
    px.rect(g, x, y, 8, 22, '#05060f'); const h = Math.round(20 * k);
    for (let i = 0; i < h; i++) px.rect(g, x + 1, y + 21 - i, 6, 1, E.mix('#ff5a1a', '#fff6c0', i / 20));
    if (full) { for (let i = 0; i < 3; i++) px.disc(g, x + 4 + Math.sin(game.real * 12 + i * 2) * 2, y - 2 - i * 3, 3 - i, ['#ff6a1a', '#ffb03a', '#fff0a0'][i]); }
    if (a.hype >= 1 && a.turboT <= 0 && a.human) O.Prompt.draw(g, x + 12, y + 6, 'turbo', { input: inp, label: 'TURBO!', color: '#ffd060' });
  },
  power(g, x, y, w, v, col = '#4fe0a8') { px.rect(g, x - 1, y - 1, w + 2, 8, '#05060f'); for (let i = 0; i < 10; i++) px.rect(g, x + i * w / 10, y, w / 10 - 1, 6, i < v * 10 ? (i > 7 ? '#ffd060' : col) : '#2a3060'); },
  header(g, r, ctx, extra) {
    const def = ctx.def; O.Art.picto(g, 10, 8, def.pictogram || def.id, 1, def.season);
    O.text(g, def.name, 30, 9, '#ffffff', { scale: 1 });
    const sub = extra || (ctx.format === 'attempts' ? ('ROUND ' + (ctx.round + 1) + ' OF ' + ctx.rounds) : '');
    if (sub) O.text(g, sub, 30, 19, '#9aa2c8');
  },
  big(g, x, y, s, col = '#ffffff', align = 'right') { const ca = game.cornerArea && game.cornerArea(); if (ca && align === 'right' && y < ca.y1 + 2 && x > ca.x0 - 4) x = ca.x0 - 6; O.text(g, s, x, y, col, { scale: 2, align }); },
  tag(g, x, y, a) { const c = a.color || '#ffffff'; px.rect(g, x, y, E.font.width(a.tag) + 6, 11, c); O.text(g, a.tag, x + 3, y + 2, '#0a0c18', { shadow: false }); }
};

/* ---- athletes ---- */
O.makeAthletes = (meet, def) => {
  const humans = meet.players || [];
  const out = [];
  const nats = meet.practice ? humans.map(p => O.NAT[p.nat]) : O.NATIONS.slice();
  for (const nat of nats) {
    const hp = humans.findIndex(p => p.nat === nat.id);
    const a = { id: nat.id, nat, name: nat.athlete, short: nat.athlete.split(' ')[0], human: hp >= 0, player: hp >= 0 ? hp : null, hype: 0, turboT: 0, attempts: [], notes: [], best: null, total: null, yikes: 0, S: {},
      color: hp >= 0 ? (meet.players[hp].color || E.PLAYER_COLORS[hp]) : null, tag: hp >= 0 ? 'P' + (hp + 1) : nat.id };
    a.input = hp >= 0 ? (game.players[meet.players[hp].input || hp] || game.input) : null;
    const rival = meet.rival === nat.id;
    a.pilot = a.human ? { kind: 'human', skill: .95, cheat: null } : { kind: 'bot', skill: O.effSkill(nat.skills[def.id] || .7, rival), cheat: null };
    if (meet.mode === 'attract') { a.pilot = { kind: 'bot', skill: O.effSkill(nat.skills[def.id] || .7) + .1, cheat: meet.featured === nat.id ? 'perfect' : null }; a.human = false; }
    a.rival = rival; a.golden = O.Cabinet.golden(nat.id, def.id);
    out.push(a);
  }
  return out;
};
O.rivalFor = humans => { if (!humans.includes('TRB')) return 'TRB'; const avg = n => Object.values(n.skills).reduce((s, v) => s + v, 0); return O.NATIONS.filter(n => !humans.includes(n.id)).sort((a, b) => avg(b) - avg(a))[0].id; };

/* ---- the event contract ---- */
O.defEvent = def => {
  def.format = Object.assign({ type: 'race', rounds: 1, combine: 'best' }, def.format || {});
  def.measure = Object.assign({ better: 'higher', fmt: v => String(v) }, def.measure || {});
  O.EVENTS[def.id] = def; O.EVENT_LIST.push(def);
  for (const k in def.tune || {}) O.tune.def(def.id, k, def.tune[k]);
  O.scene('ev:' + def.id, eventScene(def));
  return def;
};

const NOFX = { sfx() {}, shake() {}, flash() {}, stamp() {}, banner() {}, say() {}, slowmo() {}, P: { explosion() {}, fire() {}, smoke() {}, glints() {}, dust() {}, sparks() {}, bits() {}, ring() {}, text() {}, add() {}, impact() {} } };
function makeFx(ctx) {
  return { sfx: (n, o) => { if (!ctx.fast) O.sfx(n, o); }, shake: n => { if (!ctx.fast) game.shake(n); }, flash: (c, s) => { if (!ctx.fast) game.flash(c, s); },
    stamp: (w, o) => { if (!ctx.fast) O.stamp(w, o); }, banner: (w, o) => { if (!ctx.fast) O.banner(w, o); },
    say: (k, v, o) => { if (!ctx.fast && !ctx.attractQuiet) O.Comms.cue(k, v, o); },
    slowmo: (sc, s) => { if (ctx.fast || ctx.sandbox) return; const k = game.reduceMotion ? .6 : 1; ctx.slow = { scale: sc, t: s * k }; },
    get P() { return ctx.fast ? NOFX.P : game.particles; } };
}

/** a context for one event run (or a sandbox for CPU attempts) */
O.makeCtx = (def, meet, o = {}) => {
  const ctx = {
    def, meet, format: def.format.type, rounds: def.format.rounds, round: 0, attempt: 0, phase: 'card', phaseT: 0, t: 0, T: O.tune.get(def.id), G,
    athletes: o.athletes || O.makeAthletes(meet, def), active: [], cur: null, sandbox: !!o.sandbox, fast: !!o.sandbox, attract: meet.mode === 'attract', hub: meet.mode === 'hub',
    events: [], live: true, slow: null, S: {}, results: null,
    rng(label) { return O.rng(def.id + ':' + label + ':' + ctx.round + ':' + (ctx.cur ? ctx.cur.id : 'all') + (ctx.sandbox ? ':s' : '') + ':' + (ctx.retry || 0)); },
    emit(k, d) { ctx.events.push([k, d]); if (!ctx.sandbox) O.bus.emit('ev:' + k, Object.assign({ ctx }, d)); },
    finish(a, perf, note) { if (a.fin) return; a.fin = true; a.cur = perf; if (note) a.notes.push(note); },
    dnf(a, why) { if (a.fin) return; a.fin = true; a.cur = null; a.notes.push(why || 'DNF'); },
    god(a) { return a.human && O.Dev && O.Dev.cheats.god; },
    yikes(a, word, kind) { O.Yikes.trigger(ctx, a, word, kind); },
    hype(a, k) { O.Hype.gain(ctx, a, k); },
    turboMult(a, m) { return O.Hype.mult(a, m); },
    skill(a) { return a.pilot.cheat === 'perfect' ? 1 : a.pilot.skill; }
  };
  ctx.fx = o.sandbox ? NOFX : makeFx(ctx);
  ctx.humans = ctx.athletes.filter(a => a.human);
  return ctx;
};

/** a human's or bot's intent this step */
function intentOf(ctx, a, dt) {
  if (a.pilot.kind === 'human' && !(a.pilot.cheat === 'perfect') && !(O.Dev && O.Dev.cheats.autopilot && a.player === 0)) {
    const I = O.humanIntent(a, a.input);
    if (O.hubFrozen) return O.blankIntent();
    return I;
  }
  const I = def_bot(ctx, a, dt);
  if (a.human && a.input && !ctx.sandbox && !ctx.fast && !(O.Dev && O.Dev.isOpen)) { O.AutoPlayer.drive(a.input, I); const H = O.humanIntent(a, a.input); return Object.assign(H, { mv: I.mv, aim: I.aim, ptr: null }); }
  return I;
}
function def_bot(ctx, a, dt) { const I = O.blankIntent(); try { const r = ctx.def.bot(ctx, a, dt, I); return r || I; } catch (e) { game.fail('bot ' + ctx.def.id, e); return I; } }

/** one simulation step for the active athletes */
O.simStep = (ctx, dt) => {
  for (const a of ctx.active) {
    a.I = intentOf(ctx, a, dt);
    if (a.mash) { const asst = a.pilot.kind === 'human' && !a.pilot.cheat ? game.settings.mashAssist : 'off'; if (a.I.L) a.mash.press('L', asst); if (a.I.R) a.mash.press('R', asst); a.mash.update(dt, a.I.Lh || a.I.Rh, asst); }
    O.Hype.update(ctx, a, dt);
    if (a.I.T) O.Hype.fire(ctx, a);
  }
  ctx.def.step(ctx, dt);
  ctx.t += dt;
};
/** run an attempt to its end without drawing (CPU attempts, fast-forward) */
O.runToEnd = (ctx, limit = 240) => {
  let n = 0; const dt = ctx.def.simDt || 1 / 60, max = limit / dt;
  while (!ctx.def.done(ctx) && n < max) { O.simStep(ctx, dt); n++; }
  if (!ctx.def.done(ctx)) for (const a of ctx.active) if (!a.fin) ctx.dnf(a, 'DNF');
};
/** a CPU athlete's attempt simulated in a sandbox; returns its perf */
O.simAttempt = (ctx, a) => {
  const sb = O.makeCtx(ctx.def, ctx.meet, { sandbox: true, athletes: ctx.athletes });
  sb.round = ctx.round; sb.attempt = ctx.attempt; sb.cur = a; sb.active = [a]; sb.retry = ctx.retry; sb.S = Object.assign({}, ctx.S);
  if (ctx.def.simPerf) { const v = ctx.def.simPerf(sb, a); return v; }
  const was = { hype: a.hype, turboT: a.turboT, S: a.S };
  a.fin = false; a.cur = undefined; a.mash = new O.Mash();
  ctx.def.start(sb); O.runToEnd(sb, ctx.def.maxTime || 120);
  if (!a.fin) sb.dnf(a, 'DNF');
  const perf = a.fin ? (a.cur === undefined ? ctx.def.perf(sb, a) : a.cur) : null;
  a.hype = was.hype; a.turboT = 0;
  return perf;
};

/* ---- the runner ---- */
function eventScene(def) {
  let ctx = null;
  const R = {
    pausable: true, view: def.view || 'brawler', input: def.input || O.KEYS, camera: false, lock: .3,
    enter(data) {
      O.meet = O.meet || O.flow.quickMeet(def.id);
      ctx = O.ctx = O.makeCtx(def, O.meet, {});
      ctx.retry = data.retry || 0; ctx.intro = !data.retry && !ctx.attract && !ctx.hub && !!def.intro && !data.noIntro;
      O.Comms.reset(); O.clearOverlays(); O.Crowd.on = true; O.Crowd.level = .4;
      game.setView(def.view || 'brawler');
      if (def.lights) { game.lights.enabled = true; game.lights.ambient = def.lights; }
      for (const a of ctx.athletes) { a.rig = def.rig ? def.rig(ctx, a) : O.makeRig(a.nat, def.sport || def.id); a.mash = new O.Mash(); }
      def.build && def.build(ctx);
      if (data.attract) { ctx.attractSetup = true; }
      buildTurns(ctx);
      ctx.phase = ctx.intro ? 'intro' : 'card'; ctx.phaseT = 0;
      if (ctx.hub && O.Hub) O.Hub.eventEnter(ctx);
      O.music(def.music || 'sprint', { sync: true });
      game.audio.layer('hype', 0, 0);
      if (ctx.attract && def.attract && def.attract.setup) { ctx.phase = 'play'; nextTurn(ctx, true); def.attract.setup(ctx); }
    },
    exit() { if (ctx) for (const a of ctx.athletes) if (a.input) O.AutoPlayer.release(a.input); game.timeScale = 1; O.Crowd.on = false; game.audio.layer('hype', 0, 0); },
    update(dt) { if (ctx) runner(ctx, dt); },
    draw(r) {
      if (!ctx) return;
      try { def.draw(ctx, r); } catch (e) { game.fail('draw ' + def.id, e); }
      if (ctx.hub && O.Hub) O.Hub.drawGhosts(ctx, r);
      r.overlay(g => { if (O.photoMode) return; if (!(O.Dev && O.Dev.hideHud) && ctx.turnI >= 0) { try { def.hud(ctx, r, g); } catch (e) { game.fail('hud ' + def.id, e); } } phaseOverlay(ctx, r, g); });
    },
    back() { return false; }
  };
  return R;
}
O.currentCtx = () => O.ctx;

/** the turn list: race/match = one turn for everyone; attempts = rounds × athletes in start order */
function buildTurns(ctx) {
  const def = ctx.def;
  if (ctx.format !== 'attempts') { ctx.turns = [{ all: true }]; ctx.rounds = 1; }
  else {
    const humans = ctx.athletes.filter(a => a.human), cpus = ctx.athletes.filter(a => !a.human).sort((a, b) => a.pilot.skill - b.pilot.skill);
    ctx.order = humans.concat(cpus); ctx.rounds = ctx.hub ? (def.hub && def.hub.attempts || 1) : def.format.rounds;
    if (ctx.attract) ctx.rounds = 1;
    ctx.turns = [];
  }
  ctx.round = 0; ctx.turnI = -1;
}
function roundTurns(ctx) {
  // humans live; one highlighted CPU per round (the rival, else the leader); the rest simulated
  const def = ctx.def, cpus = ctx.order.filter(a => !a.human);
  let hl = null;
  const hlRounds = def.format.highlight || 'all';
  const showHl = !ctx.hub && (hlRounds === 'all' || (hlRounds === 'last' && ctx.round === ctx.rounds - 1) || (Array.isArray(hlRounds) && hlRounds.includes(ctx.round)));
  if ((showHl || ctx.attract) && cpus.length) { hl = cpus.find(a => a.rival) || leader(ctx, cpus) || cpus[cpus.length - 1]; if (ctx.attract) hl = cpus.find(a => a.pilot.cheat) || cpus[cpus.length - 1]; }
  return ctx.order.map(a => ({ a, live: a.human || a === hl || (ctx.attract && a === hl) })).filter(t => !ctx.attract || t.live);
}
function leader(ctx, list) { let b = null; for (const a of list) if (O.better(ctx.def, agg(ctx, a), b ? agg(ctx, b) : null)) b = a; return b; }
/** an athlete's standing value: best or sum of attempts */
function agg(ctx, a) {
  const c = ctx.def.format.combine, xs = a.attempts;
  if (!xs.length) return null;
  if (c === 'sum') return xs.reduce((s, v) => s + (v || 0), 0);
  if (c === 'sumTime') return xs.some(v => v == null) ? null : xs.reduce((s, v) => s + v, 0);
  let b = null; for (const v of xs) if (O.better(ctx.def, v, b)) b = v; return b;
}
O.agg = agg;

function nextTurn(ctx, force) {
  const def = ctx.def;
  if (ctx.format !== 'attempts') {
    if (ctx.turnI >= 0 && !force) return endEvent(ctx);
    ctx.turnI = 0; ctx.active = ctx.athletes.slice(); ctx.cur = null;
    for (const a of ctx.active) { a.fin = false; a.cur = undefined; O.armReset(a); a.mash.reset(); }
    ctx.t = 0; def.start(ctx); return;
  }
  for (;;) {
    if (!ctx.turns.length || ctx.turnI >= ctx.turns.length - 1) {
      if (ctx.turnI >= 0 && ctx.turns.length) { ctx.round++; if (ctx.round >= ctx.rounds) return endEvent(ctx); }
      ctx.turns = roundTurns(ctx); ctx.turnI = -1;
      if (!ctx.turns.length) { ctx.round++; if (ctx.round >= ctx.rounds) return endEvent(ctx); continue; }   // nobody to play this round
      if (ctx.round > 0 && !ctx.attract && !ctx.hub) { ctx.phase = 'standings'; ctx.phaseT = 0; ctx.afterStandings = true; }
    }
    ctx.turnI++;
    const t = ctx.turns[ctx.turnI]; if (!t) continue;
    const a = t.a; ctx.attempt = a.attempts.length;
    if (def.skipTurn && def.skipTurn(ctx, a)) { a.attempts.push(null); continue; }
    if (!t.live) { const v = O.simAttempt(ctx, a); a.attempts.push(v); a.best = agg(ctx, a); continue; }
    ctx.cur = a; ctx.active = [a]; a.fin = false; a.cur = undefined; O.armReset(a); a.mash.reset(); ctx.t = 0; ctx.highlight = !a.human;
    def.start(ctx);
    if (ctx.phase !== 'standings') { ctx.phase = 'card'; ctx.phaseT = 0; }
    return;
  }
}

function endEvent(ctx) {
  const def = ctx.def;
  ctx.phase = 'over'; ctx.phaseT = 0; game.timeScale = 1;
  const rows = ctx.format === 'match' ? def.matchRows(ctx) : ctx.athletes.map(a => ({ a, v: agg(ctx, a) }));
  if (ctx.format !== 'match') rows.sort((x, y) => (x.v == null) - (y.v == null) || (x.v == null ? 0 : def.measure.better === 'lower' ? x.v - y.v : y.v - x.v) || (def.tieBreak ? def.tieBreak(x.a, y.a) : 0));
  const wr = O.Records.wr(def);
  rows.forEach((r, i) => {
    r.rank = i + 1; r.medal = r.v != null && i < 3 ? i + 1 : 0; r.display = r.v == null ? (r.a.notes.find(n => /DQ|DNF|FOUL|NM/.test(n)) || 'DNF') : (r.display || def.measure.fmt(r.v));
    r.points = r.v == null ? 0 : Math.round(def.points ? def.points(r.v) : 0); r.notes = [];
    if (r.v != null && wr && !def.matchEvent && O.better(def, r.v, wr.v) && i === 0) r.notes.push('WR');
  });
  ctx.results = { event: def.id, rows, records: [], laurels: [] };
  O.flow.eventDone(ctx);
}
O.endEvent = endEvent;

function runner(ctx, dt) {
  const def = ctx.def;
  const rd = game.timeScale > 0 ? dt / game.timeScale : 0;
  ctx.phaseT += rd;
  if (O.Dev && O.Dev.pending) { const p = O.Dev.pending; O.Dev.pending = null; devAction(ctx, p); }
  // slow motion
  const baseScale = (ctx.highlight && !ctx.attract ? 1.5 : 1) * G.gameSpeed;
  if (ctx.slow) { ctx.slow.t -= rd; game.timeScale = ctx.slow.t > 0 ? ctx.slow.scale * baseScale : baseScale; if (ctx.slow.t <= 0) ctx.slow = null; } else if (!(O.Dev && O.Dev.isOpen && !O.Dev.live)) game.timeScale = baseScale;
  const I = game.input;
  switch (ctx.phase) {
    case 'intro': {
      const done = def.intro(ctx, rd) || (ctx.phaseT > .6 && (I.pressed('confirm') || I.pressed('action')));
      if (done) { ctx.phase = 'card'; ctx.phaseT = 0; nextTurn(ctx); }
      if (def.camera) def.camera(ctx, rd, 'intro');
      return;
    }
    case 'standings': {
      if (def.camera) def.camera(ctx, rd, 'standings');
      if (ctx.phaseT > 3.2 || (ctx.phaseT > .5 && (I.pressed('confirm') || I.pressed('action')))) { ctx.phase = 'card'; ctx.phaseT = 0; }
      return;
    }
    case 'card': {
      if (ctx.turnI < 0) nextTurn(ctx);
      if (ctx.phase !== 'card') return;
      if (def.camera) def.camera(ctx, rd, 'card');
      const need = ctx.attract || ctx.hub ? 0 : ctx.cur && ctx.cur.human && ctx.humans.length > 1 ? 1.4 : ctx.cur ? .9 : 1.1;
      if (ctx.phaseT >= need || (ctx.phaseT > .3 && I.pressed('confirm'))) { ctx.phase = 'play'; ctx.phaseT = 0; for (const a of ctx.active) O.armReset(a); for (const p of game.players) p.consumeAll(); }
      return;
    }
    case 'play': {
      if (ctx.highlight && ctx.phaseT > .5 && I.pressed('confirm')) { ctx.fast = true; O.runToEnd(ctx, def.maxTime || 120); ctx.fast = false; }
      O.simStep(ctx, dt);
      if (def.camera) def.camera(ctx, dt, 'play');
      const limit = def.maxTime || 120;
      if (ctx.t > limit) for (const a of ctx.active) if (!a.fin) ctx.dnf(a, 'DNF');
      if (def.done(ctx)) {
        for (const a of ctx.active) { const v = a.cur === undefined ? def.perf(ctx, a) : a.cur; a.lastPerf = v; if (ctx.format === 'attempts') { a.attempts.push(v); a.best = agg(ctx, a); } else if (ctx.format === 'race') { a.attempts = [v]; a.best = v; } }
        if (ctx.format === 'attempts' && ctx.cur && !ctx.attract) { const v = ctx.cur.lastPerf; if (!def.noPopup) ctx.fx.banner(v == null ? (ctx.cur.notes[ctx.cur.notes.length - 1] || 'NO MARK') : def.measure.fmt(v), { y: .22, life: 2, scale: 3, sub: ctx.cur.name }); }
        checkLaurel(ctx);
        ctx.phase = 'finish'; ctx.phaseT = 0;
        if (ctx.hub && O.Hub) O.Hub.attemptDone(ctx);
      }
      return;
    }
    case 'finish': {
      if (def.post) def.post(ctx, dt);
      if (def.camera) def.camera(ctx, dt, 'finish');
      const hold = ctx.attract ? (def.attract && def.attract.after || 2) : ctx.hub ? 1.5 : (def.finishTime || 2.4);
      if (ctx.phaseT > hold || (ctx.phaseT > .7 && !ctx.attract && (I.pressed('confirm')))) { ctx.slow = null; game.timeScale = 1; if (ctx.attract) { O.Attract && O.Attract.segmentDone(); return; } nextTurn(ctx); }
      return;
    }
    case 'over': return;
  }
}
O.runnerStep = runner;

function checkLaurel(ctx) {
  const L = ctx.def.laurel; if (!L || ctx.attract || ctx.hub || ctx.meet.practice) return;
  for (const a of ctx.active) if (a.human) { let ok = false; try { ok = L.test(ctx, a); } catch (e) { game.fail('laurel', e); } if (ok) O.Laurels.award(L.id, L.name); }
}

/* the dev panel's in-event actions (§13) */
function devAction(ctx, p) {
  const def = ctx.def, hum = ctx.humans[0] || ctx.athletes[0];
  if (p === 'next') { for (const a of ctx.active) if (!a.fin) ctx.dnf(a, 'SKIPPED'); return; }
  if (p === 'dnf' || p === 'win' || p === 'lose') {
    const wr = def.measure.wr[0], lower = def.measure.better === 'lower';
    for (const a of ctx.athletes) { if (p === 'dnf' && a === hum) a.attempts = [null]; else if (a === hum) a.attempts = [p === 'win' ? (lower ? wr * .98 : wr * 1.02) : (lower ? wr * 3 : wr * .1)]; else if (!a.attempts.length || a.attempts.every(v => v == null)) a.attempts = [lower ? wr * (1.05 + O.NATIONS.indexOf(a.nat) * .01) : wr * (.95 - O.NATIONS.indexOf(a.nat) * .01)]; a.best = agg(ctx, a); }
    if (ctx.format === 'match') ctx.forceWinner = p === 'win' ? hum : p === 'lose' ? ctx.athletes.find(a => a !== hum) : null, ctx.forceDnf = p === 'dnf';
    game.timeScale = 1; endEvent(ctx); return;
  }
  if (p.startsWith('phase:')) { const name = p.slice(6), ph = (def.phases || []).find(q => q[0] === name); if (ph) { if (ctx.phase !== 'play') { ctx.phase = 'play'; ctx.phaseT = 0; if (ctx.turnI < 0) nextTurn(ctx); } ph[1](ctx); } }
}

/** the phase overlays: turn cards, standings, intro skip hint */
function phaseOverlay(ctx, r, g) {
  const def = ctx.def;
  if (ctx.phase === 'intro') O.Prompt.strip(g, r, [['confirm', 'Skip']]);
  if (ctx.phase === 'card' && ctx.cur && !ctx.attract) {
    const a = ctx.cur, w = 240, x = r.W / 2 - w / 2, y = r.H * .3;
    O.panel(g, x, y, w, 50, { border: a.color || '#f2b632' });
    const who = a.human ? (ctx.humans.length > 1 ? a.tag + ' — YOUR TURN' : 'YOUR TURN') : a.name;
    O.text(g, who, r.W / 2, y + 8, a.color || '#ffffff', { align: 'center', scale: 2 });
    O.text(g, (def.turnLabel ? def.turnLabel(ctx) : 'ATTEMPT ' + (a.attempts.length + 1) + ' OF ' + ctx.rounds) + '  ·  ' + a.nat.name, r.W / 2, y + 30, '#c8d0f0', { align: 'center' });
  } else if (ctx.phase === 'card' && !ctx.attract && ctx.format !== 'attempts') {
    O.text(g, 'GET READY', r.W / 2, r.H * .3, '#ffffff', { align: 'center', scale: 3 });
  }
  if (ctx.phase === 'play' && ctx.highlight && !ctx.attract) { O.text(g, 'HIGHLIGHT · ' + ctx.cur.name, r.W / 2, 34, '#ffd060', { align: 'center' }); O.Prompt.draw(g, r.W / 2, 46, 'confirm', { align: 'center', label: 'Skip' }); }
  if (ctx.phase === 'standings') standings(ctx, r, g);
}
function standings(ctx, r, g) {
  const def = ctx.def, rows = ctx.athletes.map(a => ({ a, v: agg(ctx, a) })).sort((x, y) => (x.v == null) - (y.v == null) || (x.v == null ? 0 : def.measure.better === 'lower' ? x.v - y.v : y.v - x.v));
  const show = rows.filter((row, i) => i < 4 || row.a.human).slice(0, 8), w = Math.min(320, r.W - 40), x = r.W / 2 - w / 2, y = 40;
  O.panel(g, x, y, w, 30 + show.length * 18);
  O.text(g, 'STANDINGS AFTER ROUND ' + ctx.round, r.W / 2, y + 8, '#f2b632', { align: 'center' });
  show.forEach((row, i) => { const yy = y + 24 + i * 18, rk = rows.indexOf(row) + 1; O.text(g, String(rk), x + 12, yy, '#ffffff'); O.Art.flag(g, x + 26, yy - 1, 16, 10, row.a.nat); O.text(g, row.a.name, x + 48, yy, row.a.human ? (row.a.color || '#ffd060') : '#e8ecff'); O.text(g, row.v == null ? '—' : def.measure.fmt(row.v), x + w - 10, yy, '#ffffff', { align: 'right' }); });
}
})();
