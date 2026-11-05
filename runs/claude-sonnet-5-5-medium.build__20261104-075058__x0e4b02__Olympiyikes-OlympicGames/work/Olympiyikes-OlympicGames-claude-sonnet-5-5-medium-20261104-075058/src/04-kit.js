// Olympiyikes! event kit: meets, records, the Run (one athlete's turn), mash/hype, CPU results, medals, the road renderer.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp;

// ---------------------------------------------------------------- event registry
O.EVENTS = []; O.EV = {};
O.defEvent = (id, spec) => { spec.id = id; spec.attempts = spec.attempts || 1; O.EVENTS.push(spec); O.EV[id] = spec; };
O.M = 12;   // world units per meter

// ---------------------------------------------------------------- records, laurels, cabinet
O.Records = {
  table(ev) { return O.store.get('top:' + ev.id, []); },
  worldRecord(ev) { const t = O.store.get('wr:' + ev.id, null); return t === null ? ev.wr : t; },
  better(ev, a, b) { return ev.dir > 0 ? a > b : a < b; },
  isWR(ev, v) { return O.Records.better(ev, v, O.Records.worldRecord(ev)); },
  qualifies(ev, v) { const t = O.Records.table(ev); return t.length < 5 || O.Records.better(ev, v, t[t.length - 1].v); },
  add(ev, v, name, nat) {
    const t = O.Records.table(ev); t.push({ n: name, v, nat }); t.sort((a, b) => (ev.dir > 0 ? b.v - a.v : a.v - b.v)); t.length = Math.min(5, t.length); O.store.set('top:' + ev.id, t);
    if (O.Records.isWR(ev, v)) O.store.set('wr:' + ev.id, v);
    return t.findIndex(e => e.v === v && e.n === name);
  },
  laurel(ev, medal) { const l = O.store.get('laurels', {}); if (!l[ev.id] || medal < l[ev.id]) { l[ev.id] = medal; O.store.set('laurels', l); } },   // 1 gold .. 3 bronze
  cabinet(nat, ev, medal) { const c = O.store.get('cabinet', {}); c[nat] = c[nat] || {}; if (!c[nat][ev.id] || medal < c[nat][ev.id]) c[nat][ev.id] = medal; O.store.set('cabinet', c); }
};

// ---------------------------------------------------------------- the meet (a games, quick games or single event)
O.SCHEDULE = ['sprint', 'skijump', 'swim', 'downhill', 'diving', 'bobsled', 'javelin', 'figure', 'weights', 'curling', 'archery', 'hockey'];
O.PLAYLISTS = { 'Track & Pool': ['sprint', 'javelin', 'swim', 'diving'], 'Snow & Ice': ['skijump', 'downhill', 'curling', 'hockey'], 'Greatest Hits': ['sprint', 'skijump', 'archery', 'figure'], 'Random 4': null };
O.newMeet = (mode, humans, schedule, o = {}) => {
  const seed = o.seed !== undefined ? o.seed : (Date.now() & 0x7fffffff);
  O.setSeed(seed);
  const m = { mode, seed, humans, schedule, day: 0, medals: {}, pts: {}, torches: 3, cpu: {}, yikes: 0, results: [], qualOn: o.qual !== false && mode === 'games', events: {}, started: Date.now() };
  O.NATIONS.forEach(n => { m.medals[n.id] = { g: 0, s: 0, b: 0 }; m.pts[n.id] = 0; });
  O.meet = m; return m;
};
O.humanNats = m => m.humans.map(h => h.nat);
// CPU performance for an event; one roll per nation per event, from a labeled stream
O.cpuRoll = (m, ev) => {
  if (m.cpu[ev.id]) return m.cpu[ev.id];
  const out = {}, rr = O.rng('cpu:' + ev.id);
  for (const n of O.NATIONS) {
    const sk = n.skills[ev.id], z = O.gauss(rr) * .75 + (sk - .8) * 5 + (O.diff().cpu + O.tune.cpuSkill) * 12;
    let v = ev.cpu.mean + ev.dir * ev.cpu.sd * z;
    if (ev.dir > 0) v = Math.min(v, ev.wr * .985); else v = Math.max(v, ev.wr * 1.015);
    out[n.id] = v;
  }
  m.cpu[ev.id] = out; return out;
};
// rows of the event result: [{nat, v, human, p, rank, medal, notes[]}]
O.resolve = (m, ev, humanScores, practice) => {
  const cpu = O.cpuRoll(m, ev), rows = [], used = {};
  m.humans.forEach((h, i) => { const sc = humanScores[i]; if (sc !== undefined && sc !== null) { rows.push({ nat: h.nat, v: sc.v, human: true, p: i, notes: [], dq: sc.dq }); used[h.nat] = true; } });
  for (const n of O.NATIONS) if (!used[n.id]) rows.push({ nat: n.id, v: practice ? null : cpu[n.id], human: false, p: -1, notes: [] });
  const worst = ev.dir > 0 ? -Infinity : Infinity;
  const key = r => (r.v === null || r.v === undefined || r.dq ? worst : r.v);
  rows.sort((a, b) => (ev.dir > 0 ? key(b) - key(a) : key(a) - key(b)) || (a.human ? -1 : 1));
  rows.forEach((r, i) => { r.rank = i + 1; r.medal = !practice && i < 3 && !r.dq ? i + 1 : 0; });
  return rows;
};
O.award = (m, ev, rows) => {
  const PT = [5, 3, 2, 1, 0, 0, 0, 0];
  rows.forEach(r => {
    if (r.medal) { const t = m.medals[r.nat]; if (r.medal === 1) t.g++; else if (r.medal === 2) t.s++; else t.b++; }
    m.pts[r.nat] += PT[r.rank - 1] || 0;
    if (r.human) { O.Records.laurel(ev, r.medal || 4); if (r.medal) O.Records.cabinet(r.nat, ev, r.medal); }
  });
};
O.medalTable = m => O.NATIONS.map(n => Object.assign({ nat: n.id }, m.medals[n.id], { pts: m.pts[n.id] })).sort((a, b) => b.g - a.g || b.s - a.s || b.b - a.b || b.pts - a.pts);

// ---------------------------------------------------------------- reading a player's input into an intent
O.readInput = (pi, run) => {
  const i = {
    L: pi.pressed('mashL'), R: pi.pressed('mashR'), A: pi.pressed('action'), Ad: pi.down('action'), Au: pi.released('action'), T: pi.pressed('turbo'),
    alt: pi.down('alt'), altP: pi.pressed('alt'), Lh: pi.down('mashL'), Rh: pi.down('mashR'),
    left: pi.pressed('left'), right: pi.pressed('right'), up: pi.pressed('up'), down: pi.pressed('down'), mv: pi.move ? pi.move() : [0, 0], aim: null
  };
  const dv = pi.lastDevice;
  if (dv === 'mouse' && pi.pointer) { const p = pi.pointer(); if (p) i.aim = [p[0], p[1]]; }
  return i;
};
O.emptyInput = () => ({ L: false, R: false, A: false, Ad: false, Au: false, T: false, alt: false, altP: false, Lh: false, Rh: false, left: false, right: false, up: false, down: false, mv: [0, 0], aim: null });

// ---------------------------------------------------------------- the Run: one athlete's turn at an event
class Run {
  constructor(ev, nat, o = {}) {
    this.ev = ev; this.nat = nat; this.natId = nat.id; this.p = o.p === undefined ? -1 : o.p; this.bot = !!o.bot; this.t = 0; this.done = false; this.score = null; this.note = '';
    this.hype = 0; this.turboT = 0; this.stampT = 9; this.stampTxt = ''; this.yikes = 0; this.attempt = 0; this.best = null; this.bestNote = ''; this.S = {}; this.o = o;
    this.mash = { last: null, acc: 0, rate: 0, count: 0, hold: 0 }; this.rig = O.makeRig(nat); this.hudMain = ''; this.hudSub = ''; this.fx = []; this.time = 0;
    this.rivals = []; this.ghosts = []; this.phaseT = 0; this.quiet = !!o.quiet;
    this.start();
  }
  start() { this.S = {}; this.done = false; this.t = 0; this.ev.init(this); }
  get tb() { return this.turboT > 0 ? 1.15 : 1; }
  win() { return O.win(); }
  addHype(a) { const was = this.hype; this.hype = clamp(this.hype + a * O.tune.hype, 0, 1); if (was < 1 && this.hype >= 1 && !this.quiet) { O.Comms.say('hype'); O.sfx('ol_good'); } }
  yikesNow(txt, hype = .12) { this.yikes++; this.stampT = 0; this.stampTxt = txt || 'YIKES!'; if (O.meet) O.meet.yikes++; this.addHype(hype); if (!this.quiet) { O.sfx('ol_yikes'); O.sfx('ol_boo'); O.Comms.say('yikes'); game.shake(4); } }
  stamp(txt) { this.stampT = 0; this.stampTxt = txt; }
  // alternation-based mash rate, 0..1 of the event's cap
  mashStep(inp, dt, cap) {
    const m = this.mash, as = game.settings.mashAssist; let hit = false;
    if (as === 'One button') { if (inp.L || inp.R) { hit = true; } }
    else { if (inp.L && m.last !== 'L') { hit = true; m.last = 'L'; } else if (inp.R && m.last !== 'R') { hit = true; m.last = 'R'; } else if (inp.L || inp.R) { m.acc += 0; } }
    if (hit) { m.acc += 1; m.count++; this.fx.push({ k: 'mash', t: 0 }); }
    m.acc *= Math.exp(-dt * 3);
    let r = m.acc * 3;
    if (as === 'Hold' && (inp.Lh || inp.Rh)) r = Math.max(r, cap * .72);
    m.rate = r; return clamp(r / cap, 0, 1) * clamp(O.tune.mash, 0, 3);
  }
  // finish the whole run (all attempts)
  finish(score, note) { if (this.done) return; this.done = true; this.score = score; this.note = note || ''; this.ev.finishFx && this.ev.finishFx(this); }
  // an attempt ended; keep the best, begin the next after a moment
  endAttempt(v, note) {
    if (v !== null && (this.best === null || O.Records.better(this.ev, v, this.best))) { this.best = v; this.bestNote = note || ''; }
    this.attempt++;
    this.S.over = true; this.S.overT = 0; this.S.nextV = v;
    if (this.attempt >= this.ev.attempts) { this.S.final = true; }
  }
}
O.Run = Run;
// shared per-step update of a run (input -> event -> hype/turbo/attempt flow)
O.stepRun = (run, dt, inp) => {
  const ev = run.ev;
  run.t += dt; run.time += dt; run.stampT += dt;
  if (run.turboT > 0) run.turboT -= dt;
  if (inp.T && run.hype >= 1 && run.turboT <= 0 && !run.S.over) { run.turboT = 5; run.hype = 0; O.sfx('ol_turbo'); run.stamp('TURBO!'); game.flash('#ffd36a', .18, .35); }
  for (const f of run.fx) f.t += dt; run.fx = run.fx.filter(f => f.t < .4);
  if (run.S.over) {
    run.S.overT += dt;
    if (run.S.overT > (run.ev.overDelay || 1.6)) {
      if (run.S.final) run.finish(run.best === null ? ev.fail : run.best, run.bestNote);
      else { const at = run.attempt, b = run.best, bn = run.bestNote, hy = run.hype, tt = run.turboT, ym = run.yikes; run.start(); run.attempt = at; run.best = b; run.bestNote = bn; run.hype = hy; run.turboT = tt; run.yikes = ym; }
    }
    ev.update(run, dt, O.emptyInput(), true);   // let the scene settle visually
    return;
  }
  if (O.cheat.perfect && !run.bot && ev.bot) { inp = O.emptyInput(); ev.bot(run, inp, dt); }
  ev.update(run, dt, inp, false);
  if (run.t > (ev.maxT || 120) && !run.done && !run.S.over) { run.yikesNow('TOO SLOW!'); run.endAttempt(ev.fail, 'Timed out'); }
};

// ---------------------------------------------------------------- HUD shared by every event
O.hud = (g, r, run) => {
  const ev = run.ev, s = O.textScale(), nm = run.p >= 0 && O.meet && O.meet.humans.length > 1;
  px.rect(g, 0, 0, r.W, 26, 'rgba(8,10,34,.72)'); px.rect(g, 0, 26, r.W, 1, '#f2b632');
  O.picto(g, ev.id, 22, 14, 1.0, '#fff'); O.T(g, ev.name.toUpperCase(), 40, 4, '#fff', { s: 2 });
  if (nm) { const col = E.PLAYER_COLORS[run.p]; O.T(g, 'P' + (run.p + 1), 40, 17, col, { s: 1 }); O.T(g, run.nat.name, 58, 17, '#cfd8ff', { s: 1 }); } else O.T(g, run.nat.name, 40, 17, '#cfd8ff', { s: 1 });
  const rx = r.W - 120; let ry = 30;
  O.T(g, run.hudMain || '', rx + 108, 30, '#fff', { s: s + 1, align: 'right' }); ry = 30 + (s + 1) * 7 + 4;
  if (run.hudSub) O.T(g, run.hudSub, rx + 108, ry, '#ffe27a', { s: 1, align: 'right' });
  if (run.attempt !== undefined && ev.attempts > 1) O.T(g, ev.attemptLabel + ' ' + Math.min(ev.attempts, run.attempt + 1) + '/' + ev.attempts, 14, 32, '#ffe27a', { s: 1 });
  // hype flame (bottom left)
  const fx = 12, fy = r.H - 54;
  px.rect(g, fx, fy, 60, 8, '#161a3c'); px.rect(g, fx + 1, fy + 1, 58 * run.hype, 6, run.hype >= 1 ? ((game.real * 8 | 0) & 1 ? '#ffe27a' : '#ff8a1c') : '#ff6a2a'); px.rect(g, fx, fy, 60, 1, '#f2b632');
  O.T(g, run.hype >= 1 && run.turboT <= 0 ? 'TURBO!' : run.turboT > 0 ? 'ON FIRE' : 'HYPE', fx, fy - 9, run.hype >= 1 || run.turboT > 0 ? '#ffd36a' : '#fff', { s: 1 });
  if (run.hype >= 1 && run.turboT <= 0) O.Prompt.draw(g, fx + 40, fy - 11, 'turbo', { pi: run.p >= 0 ? run.p : 0 });
  if (run.turboT > 0) { px.rect(g, fx, fy + 9, 60 * clamp(run.turboT / 5, 0, 1), 2, '#ffe27a'); }
  if (run.stampT < 1.7 && run.stampTxt) O.stamp(g, r, run.stampTxt, run.stampT, run.stampTxt.indexOf('!') >= 0 && /TURBO|WORLD|GOLD|PERFECT|GREAT|NICE|GOOD|SAFE|MAKE/.test(run.stampTxt) ? '#ffe27a' : '#ff5a3a');
};
O.hudPrompts = (g, r, run) => {
  const pi = run.p >= 0 ? run.p : 0; if (run.bot) return;
  const rows = run.ev.rows(run); let x = 12; const y = r.H - 18; px.rect(g, 0, y - 4, r.W, 22, 'rgba(8,10,34,.78)');
  for (const row of rows) {
    if (Array.isArray(row[0])) { if (row[0].length === 2 && row[0][0] === 'mashL') x += O.Prompt.pair(g, x, y, 'mashL', 'mashR', { pi }) + 3; else for (const a of row[0]) x += O.Prompt.draw(g, x, y, a, { pi }) + 2; }
    else x += O.Prompt.draw(g, x, y, row[0], { pi }) + 3;
    O.T(g, row[1], x, y + 1, '#dfe6ff', { s: 1 }); x += O.TW(row[1], 1) + 10;
  }
};

// ---------------------------------------------------------------- shared drawing helpers
O.groundQuad = (r, g, x0, y0, x1, y1, col, z = 0) => { px.poly(g, [r.w(x0, y0, z), r.w(x1, y0, z), r.w(x1, y1, z), r.w(x0, y1, z)], col); };
// pseudo-3D road: scanline renderer used by Downhill and Bobsled
// st: { s (distance m), x (lateral -1.5..1.5), curve(s) -> k, objs: [{s, x, kind}], pal }
O.drawRoad = (g, r, st, pal) => {
  const W = r.W, H = r.H, hz = Math.round(H * .4), D = 150;
  px.rect(g, 0, 0, W, hz, pal.sky[1]); px.rect(g, 0, 0, W, hz * .5, pal.sky[0]);
  // distant range follows the heading
  const head = st.heading || 0;
  for (let i = 0; i < 9; i++) { const bx = ((i * 71 + head * 90) % (W + 90) + (W + 90)) % (W + 90) - 45, bh = 14 + (i * 13) % 22; px.poly(g, [[bx - 38, hz], [bx, hz - bh], [bx + 38, hz]], pal.far); }
  const off = new Float32Array(H + 2), wid = new Float32Array(H + 2), zd = new Float32Array(H + 2);
  let acc = 0;
  for (let y = H - 1; y > hz; y--) { const k = y - hz, z = D / k; zd[y] = z; acc += st.curve(st.s + z * 4) * .0105 * z * z * .5; off[y] = acc; wid[y] = k * pal.rw / 60; }
  for (let y = H - 1; y > hz; y--) {
    const z = zd[y], sIdx = st.s + z * 4, band = (Math.floor(sIdx / 6) & 1), cx = W / 2 + off[y] - st.x * wid[y] * .5, w = wid[y];
    px.rect(g, 0, y, W, 1, band ? pal.g1 : pal.g2);
    px.rect(g, cx - w, y, w * 2, 1, band ? pal.r1 : pal.r2);
    if (pal.edge) { px.rect(g, cx - w - w * .12, y, w * .12, 1, band ? pal.edge : '#fff'); px.rect(g, cx + w, y, w * .12, 1, band ? pal.edge : '#fff'); }
    if (pal.wall) { const wh = Math.min(y - hz, w * .5); px.rect(g, cx - w - w * .12, y - wh * .5, w * .12, wh * .5 + 1, pal.wall); px.rect(g, cx + w, y - wh * .5, w * .12, wh * .5 + 1, pal.wall); }
    if (pal.center && band) px.rect(g, cx - 1, y, 2, 1, pal.center);
  }
  const L = (st.objs || []).filter(o => o.s > st.s + 3 && o.s < st.s + 4 * D / 1.6).sort((a, b) => b.s - a.s);
  for (const o of L) {
    const z = (o.s - st.s) / 4; if (z < 1.1) continue; const y = Math.min(H - 1, Math.round(hz + D / z)); if (y <= hz + 1) continue;
    const cx = W / 2 + off[y] - st.x * wid[y] * .5 + o.x * wid[y], sz = Math.max(2, wid[y] * .18);
    if (o.kind === 'tree') { px.rect(g, cx - sz * .12, y - sz * .6, sz * .24, sz * .6, '#5a3a1a'); px.poly(g, [[cx - sz * .6, y - sz * .5], [cx, y - sz * 1.8], [cx + sz * .6, y - sz * .5]], '#1f6a3a'); px.poly(g, [[cx - sz * .45, y - sz * 1.0], [cx, y - sz * 2.1], [cx + sz * .45, y - sz * 1.0]], '#2a8a4a'); }
    else if (o.kind === 'gate') { const gw = wid[y] * .5; const col = o.col; px.rect(g, cx - gw, y - sz * 1.3, Math.max(1, sz * .12), sz * 1.3, col); px.rect(g, cx + gw, y - sz * 1.3, Math.max(1, sz * .12), sz * 1.3, col); px.rect(g, cx - gw, y - sz * 1.3, gw * 2, Math.max(1, sz * .1), col); if (o.hit) px.rect(g, cx - gw, y - sz * 1.3, gw * 2, sz * 1.3, 'rgba(120,255,160,.25)'); }
    else if (o.kind === 'bump') { px.rect(g, cx - wid[y] * .5, y - sz * .25, wid[y], Math.max(1, sz * .25), '#dfe9ff'); }
    else if (o.kind === 'rock') { px.disc(g, cx, y - sz * .4, sz * .5, '#6a6a7a'); px.disc(g, cx - sz * .1, y - sz * .5, sz * .3, '#8a8a9a'); }
    else if (o.kind === 'banner') { px.rect(g, cx - sz * .08, y - sz * 2, sz * .16, sz * 2, '#ddd'); px.rect(g, cx, y - sz * 2, sz * .9, sz * .6, o.col || '#e8443a'); }
  }
  return { hz, off, wid };
};
})();
