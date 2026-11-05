// The EventKit: one contract for all twelve events. O.defEvent(def) registers an event, its tunables, its How to
// Play card and its scene 'ev:<id>'. The runner plays it in its format (race | attempts | program | match): athletes
// and their pilots (human, bot, autopilot, perfect cheat), intents, mash meters, hype and YIKES TURBO, CPU attempts
// simulated in a sandbox (or played live as highlights), slow motion, results, records, laurels and points.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI;

// ---------------------------------------------------------------------------------------------------------------
// widgets
// ---------------------------------------------------------------------------------------------------------------
/** a needle sweeping a bar (ping-pong); zones [{ from, to, name, q, color }]; press() -> { q, zone, v } */
class TimingBar {
  constructor(o = {}) { this.hz = o.hz || 1.2; this.zones = o.zones || [{ from: .42, to: .58, name: 'PERFECT', q: 1, color: '#4fe0a8' }, { from: .3, to: .7, name: 'GOOD', q: .6, color: '#f2b632' }]; this.v = 0; this.t = o.t0 || 0; this.dir = 1; this.stopped = false; this.result = null; }
  update(dt) { if (this.stopped) return; this.t += dt * this.hz; const u = this.t % 2; this.v = u < 1 ? u : 2 - u; }
  zoneAt(v) { const ws = O.windowScale(); let best = null; for (const z of this.zones) { const c = (z.from + z.to) / 2, h = (z.to - z.from) / 2 * ws; if (v >= c - h && v <= c + h && (!best || z.q > best.q)) best = z; } return best; }
  press() { this.stopped = true; const z = this.zoneAt(this.v); this.result = { q: z ? z.q : .15, zone: z ? z.name : 'MISS', v: this.v }; return this.result; }
  draw(g, x, y, w, h, o = {}) {
    px.rect(g, x - 2, y - 2, w + 4, h + 4, '#05060e'); px.rect(g, x, y, w, h, '#2a2f55');
    const ws = O.windowScale();
    for (const z of this.zones.slice().sort((a, b) => a.q - b.q)) { const c = (z.from + z.to) / 2, hw = (z.to - z.from) / 2 * ws; px.rect(g, x + Math.round((c - hw) * w), y, Math.max(1, Math.round(hw * 2 * w)), h, z.color || '#f2b632'); }
    const nx = x + Math.round(this.v * w); px.rect(g, nx - 1, y - 4, 3, h + 8, '#ffffff'); px.rect(g, nx, y - 4, 1, h + 8, '#14182e');
    if (o.label) UI.text(g, o.label, x + w / 2 - UI.tw(o.label, 1) / 2, y - 13, '#ffffff');
  }
}
/** a ring shrinking onto its target over dur; press() -> { ms, j: 'PERFECT' | 'GOOD' | 'BAD' } */
class Ring {
  constructor(dur = .9, o = {}) { this.dur = dur; this.t = 0; this.done = false; this.result = null; this.perfect = o.perfect || 60; this.good = o.good || 140; }
  update(dt) { if (!this.done) { this.t += dt; if (this.t > this.dur + .35) { this.done = true; this.result = { ms: 999, j: 'BAD' }; } } }
  press() { if (this.done) return this.result; this.done = true; const ms = Math.abs(this.t - this.dur) * 1000, ws = O.windowScale(); this.result = { ms, j: ms <= this.perfect * ws ? 'PERFECT' : ms <= this.good * ws ? 'GOOD' : 'BAD' }; return this.result; }
  draw(g, cx, cy, R = 24) { const k = clamp(1 - this.t / this.dur, -.3, 1), r = Math.max(2, R * .4 + R * 1.6 * k); px.disc(g, cx, cy, R * .4 + 2, '#05060e'); px.disc(g, cx, cy, R * .4, '#4fe0a8'); const pts = 28; for (let i = 0; i < pts; i++) { const a = i / pts * Math.PI * 2; px.rect(g, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2, '#ffffff'); } }
}
/** a balance needle b in [-1, 1] drifting with noise, corrected by an axis; out of range = lost */
class Balance {
  constructor(rnd, o = {}) { this.b = 0; this.v = 0; this.t = 0; this.drift = o.drift || 1; this.damp = o.damp || 1.6; this.k = o.k || 3.2; this.rnd = rnd; this.seeds = [rnd() * 100, rnd() * 100, rnd() * 100]; this.lost = false; }
  noise(t) { const [a, b, c] = this.seeds; return Math.sin(t * 1.7 + a) * .55 + Math.sin(t * 3.1 + b) * .3 + Math.sin(t * 5.3 + c) * .15; }
  update(dt, axis, o = {}) { if (this.lost) return; this.t += dt; const dr = this.drift * (o.driftK || 1); this.v += (this.noise(this.t) * dr * 2.4 + this.b * dr * .9 - this.v * this.damp) * dt; this.v += -axis * this.k * dt * (o.corrK || 1); this.b += this.v * dt; if (Math.abs(this.b) > 1) { this.lost = true; this.b = clamp(this.b, -1.2, 1.2); } }
  draw(g, cx, y, w = 120, o = {}) {
    const x = Math.round(cx - w / 2), h = 10; px.rect(g, x - 2, y - 2, w + 4, h + 4, '#05060e'); px.rect(g, x, y, w, h, '#5a1e1e');
    const safe = o.safe || .35; px.rect(g, Math.round(cx - safe * w / 2), y, Math.round(safe * w), h, '#2f8a4a'); px.rect(g, Math.round(cx - .7 * w / 2), y, 1, h, '#f2b632'); px.rect(g, Math.round(cx + .7 * w / 2), y, 1, h, '#f2b632');
    const nx = Math.round(cx + clamp(this.b, -1, 1) * w / 2); px.poly(g, [[nx - 4, y - 6], [nx + 4, y - 6], [nx, y + 1]], '#ffffff'); px.rect(g, nx, y, 1, h, '#ffffff');
    if (o.label) UI.text(g, o.label, cx - UI.tw(o.label, 1) / 2, y + h + 4, '#ffffff');
  }
}
O.Widgets = { TimingBar, Ring, Balance };

// ---------------------------------------------------------------------------------------------------------------
// HUD pieces shared by every event
// ---------------------------------------------------------------------------------------------------------------
const HUD = O.HUD = {
  tag(g, def, o = {}) { const x = 12, y = 10, w = Math.max(UI.tw(def.name, 2), UI.tw(o.sub || '', 1)) + 40; px.blend(g, .55, 'normal', () => px.rect(g, x - 4, y - 4, w + 8, o.sub ? 36 : 32, '#070914')); O.Art.picto(g, def.id, x, y, 24); UI.text(g, def.name, x + 30, y + 2, '#ffffff', { scale: 2 }); if (o.sub) UI.text(g, o.sub, x + 30, y + 18, '#c8ccec'); },
  big(g, s, x, y, c = '#ffffff', o = {}) { E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ scale: 3, shadow: '#000', outline: '#0b0814' }, o)); },
  flame(g, x, y, a, o = {}) {
    const h = a.hype || 0, full = h >= 1, t = game.real, w = o.w || 46, H = 8;
    px.rect(g, x - 1, y - 1, w + 2, H + 2, '#05060e'); px.rect(g, x, y, w, H, '#2a1a1a');
    const fw = Math.round(w * clamp(h, 0, 1)); for (let i = 0; i < fw; i++) { const u = i / w; px.rect(g, x + i, y + (full ? Math.round(Math.sin(t * 20 + i) * 1) : 0), 1, H, u < .5 ? E.mix('#e2461a', '#ff9a1a', u * 2) : E.mix('#ff9a1a', '#fff6c8', (u - .5) * 2)); }
    if (a.turboT > 0) { const k = a.turboT / O.G.turboTime; px.rect(g, x, y + H - 2, Math.round(w * k), 2, '#ffffff'); }
    for (let i = 0; i < 3; i++) { const fx = x + w + 2 + i * 3, fh = Math.round(3 + h * 6 + Math.sin(t * 15 + i * 2) * 2); px.rect(g, fx, y + H - fh, 2, fh, i === 1 ? '#ffe066' : '#ff7a1a'); }
    if (full && a.human && !(a.turboT > 0)) O.Prompt.draw(g, x + w + 14, y - 2, 'turbo', { inp: a.inp, label: 'TURBO!', pulse: true, color: '#ffe066' });
  },
  board(g, ctx, x, y, n = 4, o = {}) {
    const rows = O.standings(ctx).slice(0, n), humans = ctx.athletes.filter(a => a.human && !rows.some(r => r.a === a));
    const list = rows.concat(humans.map(a => ({ a, perf: O.aggregate(ctx.def, a), rank: O.standings(ctx).findIndex(r => r.a === a) + 1 })));
    const w = o.w || 150, rh = 13; UI.panel(g, x, y, w, 14 + list.length * rh, { title: o.title || 'STANDINGS', alpha: .8 });
    list.forEach((r, i) => { const yy = y + 15 + i * rh, c = r.a.human ? r.a.color : '#e6e9ff'; UI.text(g, String(r.rank || i + 1), x + 6, yy, '#f2b632'); O.Art.flag(g, x + 16, yy, 12, 8, r.a.nation); UI.text(g, O.shortName(r.a.name), x + 32, yy, c); const d = r.perf == null ? '—' : ctx.def.measure.fmt(r.perf); UI.text(g, d, x + w - 6 - UI.tw(d, 1), yy, c); });
  },
  prompts(g, W, H, items, o = {}) { O.Prompt.strip(g, items, W / 2, o.y || H - 22, o); }
};

// ---------------------------------------------------------------------------------------------------------------
// athletes and the meet
// ---------------------------------------------------------------------------------------------------------------
O.skillOf = (nid, ev, meet) => { const n = O.nation(nid); let s = (n.skills[ev] || .6) * O.G.cpuSkillScale + O.cpuOffset(); if (meet && meet.rival === nid) s += .03; return clamp(s, .05, .99); };
/** the athletes of an event in a meet: humans (in join order) and CPU nations */
O.makeAthletes = (def, meet) => {
  const out = [], humanN = meet.players.map(p => p.nation);
  meet.players.forEach((p, i) => out.push(athlete(def, meet, p.nation, { human: true, player: i, inp: p.input || game.players[i] || game.input, color: p.color || E.PLAYER_COLORS[i] })));
  if (meet.mode !== 'practice' && meet.mode !== 'hub') for (const n of O.NATIONS) if (!humanN.includes(n.id)) out.push(athlete(def, meet, n.id, {}));
  if (meet.mode === 'attract') out.forEach((a, i) => { a.human = false; a.inp = null; a.cheat = i === (meet.featured || 0) ? 'perfect' : null; });
  return out;
};
function athlete(def, meet, nid, o) {
  const n = O.nation(nid), human = !!o.human;
  return { id: nid + (o.player !== undefined ? 'P' + o.player : ''), nation: nid, nationName: n.name, name: n.athlete.name, human, player: human ? o.player : null, inp: o.inp || null,
    color: o.color || n.colors.a, skill: human ? (O.humanSkill || .9) : O.skillOf(nid, def.id, meet), cheat: null, rival: meet.rival === nid && !human,
    hype: 0, turboT: 0, mash: new O.Mash(), fresh: O.freshState(), held: {}, attempts: [], notes: [], bs: {}, I: O.blankIntent(), yikesN: 0, rig: null };
}

// ---------------------------------------------------------------------------------------------------------------
// the event contract
// ---------------------------------------------------------------------------------------------------------------
O.defEvent = def => {
  def.format = Object.assign({ type: 'race', attempts: 1 }, def.format);
  def.measure = Object.assign({ better: 'lower', fmt: v => String(v) }, def.measure);
  for (const k in def.tune || {}) O.tune.def(def.id, k, def.tune[k]);
  def.T = O.tune.get(def.id);
  O.EVENTS[def.id] = def;
  O.scene('ev:' + def.id, {
    pausable: true, view: def.view || 'brawler', input: def.input || O.KEYS, camera: def.camera === false ? { zoom: false } : (def.cameraZoom || { zoom: false }), touch: [], lock: .3,
    enter(data) { O.Run.enter(def, data); }, exit() { O.Run.exit(); }, update(dt, rdt) { O.Run.update(dt, rdt); }, draw(r) { O.Run.draw(r); }
  });
  return def;
};
O.aggregate = (def, a) => {
  const v = a.attempts.filter(x => x != null && x.perf != null).map(x => x.perf);
  if (def.aggregate === 'sum') return a.attempts.length && a.attempts.every(x => x.done) ? a.attempts.reduce((s, x) => s + (x.perf || 0), 0) : (v.length ? v.reduce((s, x) => s + x, 0) : null);
  if (!v.length) return null;
  return def.measure.better === 'lower' ? Math.min(...v) : Math.max(...v);
};
O.standings = ctx => {
  const def = ctx.def, rows = ctx.athletes.map(a => ({ a, perf: ctx.def.format.type === 'match' ? (a.matchRank ? -a.matchRank : null) : O.aggregate(def, a) }));
  rows.sort((x, y) => { if (x.perf == null && y.perf == null) return 0; if (x.perf == null) return 1; if (y.perf == null) return -1; const lo = def.format.type === 'match' ? false : def.measure.better === 'lower'; if (x.perf !== y.perf) return lo ? x.perf - y.perf : y.perf - x.perf; return def.tie ? def.tie(x.a, y.a) : 0; });
  rows.forEach((r, i) => r.rank = i + 1);
  return rows;
};

// ---------------------------------------------------------------------------------------------------------------
// ctx: what the runner gives every hook
// ---------------------------------------------------------------------------------------------------------------
function makeCtx(def, meet, athletes) {
  const ctx = {
    def, meet, game, athletes, T: def.T, G: O.G, t: 0, phase: 'intro', phaseT: 0, round: 0, attempt: 0, s: null, cur: null, live: true, w: {},
    mode: meet.mode, humans: athletes.filter(a => a.human),
    rng: label => O.rng(def.id + ':' + label + ':r' + ctx.round),
    hype(a, v) { if (!a) return; a.hype = clamp((a.hype || 0) + v * O.G.hypeGain, 0, 1); },
    turbo(a, mult) { return a && a.turboT > 0 ? 1 + (mult - 1) * O.G.turboPower : 1; },
    yikes(a, kind, o) { O.Yikes.trigger(a, kind, Object.assign({ cue: kind }, o)); },
    cue(key, vars, o) { if (O.sandbox) return; const a = vars && vars.a; O.Comms.cue(key, Object.assign(a ? { name: a.name, nation: a.nationName } : {}, vars || {}), o); },
    sfx(n, o) { if (!O.sandbox) game.audio.sfx(n, o); },
    fx(fn) { if (!O.sandbox && !O.headlessFx) fn(game.particles); },
    shake(n) { if (!O.sandbox) game.shake(n); },
    flash(c, s) { if (!O.sandbox) game.flash(c || '#ffffff', s || .1); },
    slowmo(scale, seconds) { if (O.sandbox) return; const rm = game.settings.motion; O.Run.slow = { k: rm ? Math.max(scale, .6) : scale, t: rm ? seconds * .4 : seconds }; },
    stamp(word, o) { O.Stamps.add(word, o); },
    note(a, n) { if (a && !a.notes.includes(n)) a.notes.push(n); },
    emit(name, data) { if (!O.sandbox) O.bus.emit(def.id + ':' + name, data); }
  };
  return ctx;
}
O.makeCtx = makeCtx;
/** the intent of an athlete this step (human input, autopilot or bot) */
function intentOf(ctx, a, dt) {
  if (a.human && a.inp && !O.sandbox) {
    const I = O.humanIntent(a.inp, a.fresh);
    if ((O.Dev && O.Dev.autopilot && a.player === 0) || (O.autoAll && a.human)) O.AutoPlayer.feed(a.inp, ctx.def.bot(ctx, a, dt) || O.blankIntent(), a.held);
    if (O.Dev && O.Dev.perfect && a.player === 0) a.cheat = 'perfect';
    return I;
  }
  return ctx.def.bot ? (ctx.def.bot(ctx, a, dt) || O.blankIntent()) : O.blankIntent();
}
function pilot(ctx, a, dt) {
  const I = a.I = intentOf(ctx, a, dt);
  const assist = a.human ? game.settings.mashAssist : 'off';
  a.mash.update(dt, I.L, I.R, assist, I.Lh || I.Rh);
  if (a.cheat === 'perfect' || (O.Dev && O.Dev.infHype && a.player === 0)) a.hype = Math.max(a.hype, a.turboT > 0 ? 0 : 1);
  if (I.T && a.hype >= 1 && !(a.turboT > 0) && ctx.def.turboOk !== false && (!ctx.def.canTurbo || ctx.def.canTurbo(ctx, a))) {
    a.turboT = O.G.turboTime; a.hype = 0; a.turbos = (a.turbos || 0) + 1;
    if (!O.sandbox) { O.Music.hype(true); O.Crowd.bump(1); O.Crowd.startWave(); O.CrowdAudio.cheer(); game.audio.sfx('fire'); if (ctx.def.turboName) O.Stamps.add(ctx.def.turboName, { dur: 1.2, scale: 2, y: 92, colors: ['#ffffff', '#ffe066', '#ff9a1a', '#ff4a1a'], sub: '' }); ctx.cue('turbo', { a }); }
    if (ctx.def.onTurbo) ctx.def.onTurbo(ctx, a);
  }
  if (a.turboT > 0) { a.turboT -= dt; if (a.turboT <= 0) { a.turboT = 0; if (!O.sandbox && !ctx.athletes.some(b => b.turboT > 0)) O.Music.hype(false); } }
  else if (a.hype < 1) a.hype = Math.max(0, a.hype - O.G.hypeDecay * dt);
}
O.pilot = pilot;

// ---------------------------------------------------------------------------------------------------------------
// sandbox: a CPU attempt simulated instantly with the same rules (no drawing, sound or comms)
// ---------------------------------------------------------------------------------------------------------------
O.sandbox = false;
O.simAttempt = (ctx, a, o = {}) => {
  const def = ctx.def, keep = { s: ctx.s, cur: ctx.cur, t: ctx.t, live: ctx.live, phaseT: ctx.phaseT }, was = O.sandbox;
  O.sandbox = true; ctx.live = false; ctx.cur = a; a.bs = {}; a.fresh = O.freshState(); a.turboT = 0;
  let perf = null, extra = null, st = null;
  try {
    def.start(ctx, a); ctx.t = 0;
    const dt = o.dt || 1 / 60, max = (def.maxTime || 120) / dt;
    for (let i = 0; i < max && !def.done(ctx); i++) { pilot(ctx, a, dt); def.step(ctx, dt); ctx.t += dt; }
    perf = def.perf(ctx, a); extra = def.attemptInfo ? def.attemptInfo(ctx, a) : null; st = ctx.s;
  } catch (e) { game.fail('sim ' + def.id, e); }
  O.sandbox = was; Object.assign(ctx, keep);
  return { perf, info: extra, done: true, s: o.keepState ? st : undefined };
};
/** finish the current live attempt instantly (✕ on a highlight, the dev panel's skip) */
O.fastForward = ctx => {
  const def = ctx.def, a = ctx.cur, was = O.sandbox; O.sandbox = true;
  try { const dt = 1 / 60; for (let i = 0; i < 20000 && !def.done(ctx); i++) { if (def.format.type === 'race') for (const b of ctx.athletes) pilot(ctx, b, dt); else pilot(ctx, a, dt); def.step(ctx, dt); ctx.t += dt; } } catch (e) { game.fail('ff ' + def.id, e); }
  O.sandbox = was;
};

// ---------------------------------------------------------------------------------------------------------------
// the runner (the scene 'ev:<id>')
// ---------------------------------------------------------------------------------------------------------------
const Run = O.Run = {
  ctx: null, def: null, slow: null, queue: [], turnCard: null, banner: null, hlSpeed: 1,
  enter(def, data) {
    const meet = O.meet || O.flow.quickMeet(def.id);
    this.def = def; this.slow = null; this.banner = null; this.turnCard = null; this.hlSpeed = 1; this.endT = 0;
    const athletes = data.athletes || O.makeAthletes(def, meet);
    const ctx = this.ctx = makeCtx(def, meet, athletes);
    ctx.wr0 = O.Records.wr(def.id); ctx.retry = !!data.retry;
    athletes.forEach((a, i) => { a.lane = i; a.attempts = []; a.notes = []; a.hype = (meet.hypeBonus && a.human ? meet.hypeBonus : 0); a.turboT = 0; });
    if (meet.hypeBonus) meet.hypeBonus = 0;
    O.Comms.reset(); O.Comms.event = def.id; O.Stamps.list = [];
    game.lights.enabled = false; game.weather = null;
    if (def.build) def.build(ctx);
    if (meet.mode === 'attract' && def.attract && def.attract.setup) def.attract.setup(ctx);
    if (def.music === null) O.Music.stop(.2); else O.Music.play(def.music || 'sprint', { sync: true });
    O.CrowdAudio.set(true); O.Crowd.set(.35);
    this.plan();
    const skipIntro = meet.mode === 'attract' || meet.mode === 'hub' || ctx.retry || !def.intro;
    this.setPhase(skipIntro ? 'next' : 'intro');
    if (O.Hub && O.Hub.active) O.Hub.eventEnter(ctx);
  },
  exit() { game.timeScale = 1; if ((game.zoom || 1) !== 1) game.setZoom(1); O.Music.hype(false); for (const a of (this.ctx ? this.ctx.athletes : [])) if (a.inp) O.AutoPlayer.release(a.inp, a.held); O.CrowdAudio.set(false); },
  /** the turn plan: [{ kind: 'race' } | { kind: 'turn', a, round, live } | { kind: 'standings', round } | { kind: 'match' }] */
  plan() {
    const ctx = this.ctx, def = ctx.def, f = def.format, q = this.queue = [], meet = ctx.meet;
    if (f.type === 'race' || f.type === 'match') { q.push({ kind: f.type }); return; }
    const rounds = meet.mode === 'hub' ? (def.hub && def.hub.attempts) || 1 : meet.mode === 'attract' ? 1 : f.attempts, hs = ctx.athletes.filter(a => a.human), cpus = ctx.athletes.filter(a => !a.human).sort((x, y) => x.skill - y.skill);
    for (let r = 0; r < rounds; r++) {
      if (meet.mode === 'attract') { const feat = ctx.athletes[meet.featured || 0]; q.push({ kind: 'turn', a: feat, round: r, live: true }); continue; }
      const hl = def.highlights === false ? [] : pickHighlights(ctx, cpus);
      const order = [];
      cpus.forEach(a => { if (!hl.includes(a)) order.push({ a, live: false }); });
      if (hl[0]) order.push({ a: hl[0], live: true });
      hs.forEach(a => order.push({ a, live: true }));
      if (hl[1]) order.push({ a: hl[1], live: true });
      order.forEach(o => q.push({ kind: 'turn', a: o.a, round: r, live: o.live }));
      if (r < rounds - 1 && meet.mode !== 'practice') q.push({ kind: 'standings', round: r });
    }
    if (meet.mode === 'practice') this.practice = true;
  },
  setPhase(p) { const ctx = this.ctx; ctx.phase = p; ctx.phaseT = 0; },
  next() {
    const ctx = this.ctx, def = ctx.def;
    for (;;) {
      const it = this.queue.shift();
      if (!it) { this.setPhase('end'); return; }
      if (it.kind === 'race' || it.kind === 'match') { ctx.round = 0; ctx.cur = null; def.start(ctx); ctx.t = 0; ctx.athletes.forEach(a => { a.fresh = O.freshState(); a.bs = {}; }); this.setPhase('play'); if (def.onPlay) def.onPlay(ctx); return; }
      if (it.kind === 'standings') { this.setPhase('standings'); return; }
      ctx.round = it.round;
      if (!it.live) { const res = O.simAttempt(ctx, it.a); it.a.attempts[it.round] = res; continue; }
      ctx.cur = it.a; ctx.curLive = it; this.hlSpeed = it.a.human ? 1 : (ctx.meet.mode === 'attract' ? 1 : 1.5);
      this.turnCard = { a: it.a, round: it.round, t: 0 };
      this.setPhase('turn'); return;
    }
  },
  beginAttempt() {
    const ctx = this.ctx, a = ctx.cur; a.bs = {}; a.fresh = O.freshState(); a.turboT = 0; if (a.inp) a.inp.consumeAll();
    ctx.def.start(ctx, a); ctx.t = 0; this.setPhase('play'); if (ctx.def.onPlay) ctx.def.onPlay(ctx);
  },
  finishAttempt() {
    const ctx = this.ctx, def = ctx.def, a = ctx.cur, f = def.format.type;
    if (f === 'race' || f === 'match') {
      for (const b of ctx.athletes) b.attempts[0] = { perf: def.perf(ctx, b), done: true, info: def.attemptInfo ? def.attemptInfo(ctx, b) : null };
      if (f === 'match' && def.placings) def.placings(ctx);
    } else {
      const perf = def.perf(ctx, a); a.attempts[ctx.round] = { perf, done: true, info: def.attemptInfo ? def.attemptInfo(ctx, a) : null };
      if (a.human && def.laurel) checkLaurel(ctx, a);
    }
    if (f === 'race' || f === 'match') for (const b of ctx.humans) if (def.laurel) checkLaurel(ctx, b);
    this.banner = this.finishBanner();
    this.setPhase('finish');
    if (O.Hub && O.Hub.active) O.Hub.attemptDone(ctx);
  },
  finishBanner() {
    const ctx = this.ctx, def = ctx.def, f = def.format.type;
    if (f === 'race' || f === 'match') return null;
    const a = ctx.cur, at = a.attempts[ctx.round], perf = at && at.perf;
    const wr = ctx.wr0, isWR = perf != null && O.better(def, perf, wr) && def.aggregate !== 'sum';
    return { a, text: perf == null ? (a.notes.slice(-1)[0] || 'NO MARK') : def.measure.fmt(perf), wr: isWR };
  },
  update(dt, rdt) {
    const ctx = this.ctx; if (!ctx) return;
    const def = ctx.def;
    ctx.phaseT += rdt;
    // time scale: dev speed, highlights, slow motion
    if (!(O.Dev && O.Dev.isOpen && !O.Dev.live)) {
      let k = O.G.gameSpeed * (ctx.phase === 'play' ? this.hlSpeed : 1);
      if (this.slow) { this.slow.t -= rdt; k *= this.slow.k; if (this.slow.t <= 0) this.slow = null; }
      if (O.Dev && O.Dev.speed) k *= O.Dev.speed;
      game.timeScale = k;
    }
    if (O.Hub && O.Hub.active && O.Hub.tickEvent(ctx, dt, rdt)) return;
    const anyConfirm = () => game.players.some(p => p.pressed('confirm'));
    switch (ctx.phase) {
      case 'intro': {
        const done = def.intro(ctx, dt);
        if (done || (ctx.phaseT > .5 && anyConfirm())) { if (def.introEnd) def.introEnd(ctx); this.next(); }
        break;
      }
      case 'next': this.next(); break;
      case 'turn': {
        const tc = this.turnCard; tc.t += rdt;
        const need = ctx.cur.human ? (ctx.humans.length > 1 || ctx.round > 0 ? 1.6 : .9) : ctx.meet.mode === 'attract' ? .4 : 1.1;
        if (def.preview) def.preview(ctx, dt);
        if (tc.t > need || (tc.t > .3 && anyConfirm())) { this.turnCard = null; this.beginAttempt(); }
        break;
      }
      case 'play': {
        ctx.t += dt;
        if (def.format.type === 'race' || def.format.type === 'match') for (const a of ctx.athletes) pilot(ctx, a, dt);
        else pilot(ctx, ctx.cur, dt);
        def.step(ctx, dt);
        if (ctx.cur && !ctx.cur.human && ctx.meet.mode !== 'attract' && ctx.phaseT > .4 && anyConfirm()) O.fastForward(ctx);
        if (this.practice && game.players.some(p => p.pressed('start')) && ctx.phaseT > .5) { O.fastForward(ctx); }
        if (def.done(ctx)) this.finishAttempt();
        if (ctx.meet.mode === 'attract' && O.Attract && O.Attract.segmentOver(ctx)) { this.setPhase('end'); }
        break;
      }
      case 'finish': {
        if (def.finishStep) def.finishStep(ctx, dt);
        const minT = ctx.cur && !ctx.cur.human ? .9 : 1.3, maxT = def.finishTime || 2.6;
        if (ctx.phaseT > maxT || (ctx.phaseT > minT && anyConfirm())) {
          this.banner = null;
          if (this.practice) { this.setPhase('practiceMenu'); this.pmenu = 0; break; }
          this.next();
        }
        break;
      }
      case 'practiceMenu': {
        if (game.players.some(p => p.pressed('up') || p.pressed('down'))) { this.pmenu = 1 - this.pmenu; UI.sfx('select'); }
        if (anyConfirm()) { UI.sfx('confirm'); if (this.pmenu === 0) { this.queue = [{ kind: def.format.type === 'race' || def.format.type === 'match' ? def.format.type : 'turn', a: ctx.humans[0], round: 0, live: true }]; ctx.athletes.forEach(a => a.attempts = []); this.next(); } else this.setPhase('end'); }
        if (game.players.some(p => p.pressed('cancel'))) this.setPhase('end');
        break;
      }
      case 'standings': if (ctx.phaseT > 3 || (ctx.phaseT > .5 && anyConfirm())) this.next(); break;
      case 'end': {
        if (this.endT === 1) break; this.endT = 1;
        game.timeScale = 1;
        if (ctx.meet.mode === 'attract') { O.Attract && O.Attract.segmentDone(); break; }
        if (ctx.meet.mode === 'hub') break;
        if (this.practice) { O.flow.practiceDone(def.id); break; }
        O.flow.eventDone(O.buildResults(ctx));
        break;
      }
    }
    if (def.cam) def.cam(ctx, dt);
  },
  draw(r) {
    const ctx = this.ctx; if (!ctx) return;
    const def = ctx.def;
    try { def.draw(ctx, r); if (O.Hub && O.Hub.active) O.drawHubGhosts(ctx, r); } catch (e) { game.fail('draw ' + def.id, e); }
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (!(O.Dev && O.Dev.hideHud)) {
        try { if (def.hud) def.hud(ctx, r, g); } catch (e) { game.fail('hud ' + def.id, e); }
        HUD.tag(g, def, { sub: this.subTitle() });
        if (ctx.phase === 'turn' && this.turnCard) this.drawTurn(g, W, H);
        if (ctx.phase === 'finish' && this.banner) this.drawBanner(g, W, H);
        if (ctx.phase === 'standings') this.drawStandings(g, W, H);
        if (ctx.phase === 'practiceMenu') this.drawPractice(g, W, H);
        if (ctx.phase === 'play' && ctx.cur && !ctx.cur.human && ctx.meet.mode !== 'attract') O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'SKIP', align: 'right' });
        if (ctx.phase === 'intro') O.Prompt.draw(g, W - 14, H - 22, 'confirm', { label: 'SKIP', align: 'right' });
        if (this.practice && ctx.phase === 'play') O.Prompt.draw(g, W - 14, 34, 'start', { label: 'END ATTEMPT', align: 'right' });
      }
      O.Comms.draw(g, W, H, { top: def.commsTop !== undefined ? def.commsTop : 44, compact: true });
    });
  },
  subTitle() { const ctx = this.ctx, def = ctx.def, f = def.format; if (ctx.meet.mode === 'practice') return 'PRACTICE'; if (f.type === 'attempts' || f.type === 'program') { const n = ctx.meet.mode === 'hub' ? (def.hub && def.hub.attempts) || 1 : f.attempts; return (def.roundName || 'ROUND') + ' ' + (ctx.round + 1) + ' OF ' + n; } return def.venueName || ''; },
  drawTurn(g, W, H) {
    const tc = this.turnCard, a = tc.a, ctx = this.ctx, k = Math.min(1, tc.t / .2), w = 260, x = Math.round(W / 2 - w / 2), y = Math.round(H * .3 - (1 - k) * 20);
    UI.panel(g, x, y, w, 64, { trim: a.human ? a.color : '#f2b632' });
    O.Art.flag(g, x + 10, y + 12, 30, 20, a.nation, 1.5);
    const top = a.human ? (ctx.humans.length > 1 ? 'P' + (a.player + 1) + ' — YOUR TURN' : 'YOUR TURN') : a.rival ? 'THE RIVAL STEPS UP' : 'UP NEXT';
    UI.text(g, top, x + 48, y + 8, a.human ? a.color : '#f2b632', { scale: 2 });
    UI.text(g, a.name, x + 48, y + 28, '#ffffff'); UI.text(g, a.nationName, x + 48, y + 40, '#aab0d0');
    const best = O.aggregate(ctx.def, a); if (best != null) UI.text(g, 'BEST ' + ctx.def.measure.fmt(best), x + w - 10 - UI.tw('BEST ' + ctx.def.measure.fmt(best), 1), y + 40, '#f2b632');
    if (ctx.def.turnInfo) ctx.def.turnInfo(ctx, g, x, y + 66, w);
    O.Prompt.draw(g, x + w - 10, y + 50, 'confirm', { label: a.human ? 'GO' : 'SKIP', align: 'right' });
  },
  drawBanner(g, W, H) {
    const b = this.banner, t = this.ctx.phaseT, k = Math.min(1, t / .15), w = 240, x = Math.round(W / 2 - w / 2), y = Math.round(54 - (1 - k) * 30);
    UI.panel(g, x, y, w, 40, { trim: b.wr ? '#fff1a8' : b.a.human ? b.a.color : '#f2b632' });
    O.Art.flag(g, x + 8, y + 10, 24, 16, b.a.nation);
    UI.text(g, O.shortName(b.a.name), x + 38, y + 6, '#c8ccec');
    E.font.text(g, b.text, x + 38, y + 17, b.wr ? '#fff1a8' : '#ffffff', { scale: 2, shadow: '#000', outline: false });
    if (b.wr) UI.text(g, 'WR!', x + w - 30, y + 6, '#ffe066');
  },
  drawStandings(g, W, H) { HUD.board(g, this.ctx, Math.round(W / 2 - 100), Math.round(H * .2), 8, { w: 200, title: 'STANDINGS AFTER ' + (this.ctx.def.roundName || 'ROUND') + ' ' + (this.ctx.round + 1) }); O.Prompt.draw(g, W / 2, H - 24, 'confirm', { label: 'CONTINUE', align: 'center' }); },
  drawPractice(g, W, H) { const x = Math.round(W / 2 - 80), y = Math.round(H * .4); UI.panel(g, x, y, 160, 56, { title: 'PRACTICE' }); ['AGAIN', 'DONE'].forEach((s, i) => UI.text(g, (this.pmenu === i ? '▸ ' : '  ') + s, x + 14, y + 18 + i * 18, this.pmenu === i ? '#f2b632' : '#ffffff', { scale: 2 })); }
};

/** the CPU attempts played live in a round: the rival, then the strongest other CPU (def.highlights: how many) */
function pickHighlights(ctx, cpus) {
  const n = ctx.def.highlights === undefined ? 2 : ctx.def.highlights; if (!n || !cpus.length) return [];
  const out = [], riv = cpus.find(a => a.rival); if (riv) out.push(riv);
  const rest = cpus.filter(a => !out.includes(a)).sort((a, b) => b.skill - a.skill);
  if (rest[0] && out.length < n) out.push(rest[(ctx.round || 0) % Math.min(2, rest.length)]);
  return out.slice(0, n);
}
function checkLaurel(ctx, a) {
  const L = ctx.def.laurel; if (!L || O.Records.hasLaurel(L.id) || ctx.meet.mode === 'attract' || ctx.meet.mode === 'practice' || O.inHub) return;
  let ok = false; try { ok = L.test(ctx, a); } catch (e) { game.fail('laurel ' + L.id, e); }
  if (ok && O.Records.award(L.id)) { ctx.meet.laurels = (ctx.meet.laurels || []).concat([L.id]); UI.toast('LAUREL EARNED: ' + L.name, L.text, '#f2c94c', { icon: (g, x, y) => O.Art.laurel(g, x, y, 20, true) }); O.Music.sting('laurel'); }
}
O.checkLaurel = checkLaurel;

// ---------------------------------------------------------------------------------------------------------------
// results: ranks, medals, records, qualifying, points
// ---------------------------------------------------------------------------------------------------------------
O.buildResults = ctx => {
  const def = ctx.def, rows = O.standings(ctx), wr = ctx.wr0, meet = ctx.meet;
  const res = { event: def.id, rows: [], records: [], mode: meet.mode };
  rows.forEach((r, i) => {
    const a = r.a, perf = def.format.type === 'match' ? a.matchPerf : r.perf, notes = a.notes.slice();
    const row = { nation: a.nation, name: a.name, human: a.human, player: a.player, color: a.color, perf, display: def.format.type === 'match' ? a.matchDisplay || '' : perf == null ? (notes.find(n => ['DNF', 'DQ', 'FOUL', 'NM'].includes(n)) || 'NM') : def.measure.fmt(perf), rank: i + 1, medal: i < 3 && (perf != null || def.format.type === 'match') ? 'gsb'[i] : null, notes, points: def.format.type === 'match' ? (a.matchPoints || 0) : O.points(def.id, perf) };
    if (perf != null && wr != null && def.format.type !== 'match' && O.better(def, perf, wr) && i === 0) { row.notes.push('WR'); res.records.push({ kind: 'WR', row }); }
    res.rows.push(row);
  });
  return res;
};

// the quick meet used by deep links and the dev panel's JUMP: P1 plays SUN against the CPU nations
O.Sim = {
  /** match events: rank the nations not in the final by skill-weighted draws */
  placings(ev, nations, rnd) { return nations.map(n => ({ n, v: O.skillOf(n, ev) + O.gauss(rnd) * .08 })).sort((a, b) => b.v - a.v).map(x => x.n); }
};
})();
