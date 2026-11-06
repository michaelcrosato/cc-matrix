// The operation: one JSON-safe state object S, stepped by plain inputs. Rewinds, checkpoints and the network all rest on that.
(() => {
const G = (window.GAME ||= {}), { clamp, ev, clone, rnd } = G, T = G.T;
const O = o => G.OBJ[o.type];
G.CASES = G.CASES || {}; G.CASE_ORDER = G.CASE_ORDER || [];
G.defCase = c => { G.CASES[c.id] = c; if (c.number) { G.CASE_ORDER.push(c.id); G.CASE_ORDER.sort((a, b) => G.CASES[a].number - G.CASES[b].number); } return c; };
G.Scripts = G.Scripts || {};
G.defScript = (n, f) => { G.Scripts[n] = f; };
const RT = new WeakMap(); const rt = S => { let r = RT.get(S); if (!r) RT.set(S, r = { ring: [], ckpt: null, ringT: 0, fails: {} }); return r; };
const mkPlayer = (id, color, x = 213, y = 116) => ({ id, color, x, y, lastX: x, lastY: y, spd: 0, tool: 'forceps', toolNext: 'forceps', swapT: 0, trigPrev: 0, hold: null, heat: 0, lockT: 0, fill: 0, overT: 0, coolT: 0, bareT: 0, drag: 0, tension: 0, nerveT: 0, near: 0, score: 0, stats: { textbook: 0, clean: 0, sloppy: 0, slips: 0, stitches: 0, suction: 0, burns: 0 }, gone: false });
const Op = G.Op = {
  create(c, o = {}) { if (typeof c === 'string') c = G.CASES[c];
    const diffId = o.difficulty || 'resident', diff = G.DIFFS[diffId], clockX = c.noClockScale ? 1 : diff.clock * T.clockX;
    const players = o.players || [{ id: 0, color: G.SEATS[0] }];
    const S = { caseId: c.id, seed: o.seed === undefined ? 1 : o.seed, rng: (o.seed === undefined ? 1 : o.seed) >>> 0, diffId, diff: { iv: diff.iv, drain: diff.drain, hints: diff.hints, codeBlue: diff.codeBlue, assist: diff.assist }, t: 0, ht: 0, v: c.vitals, clock: c.clock * clockX, clock0: c.clock * clockX, drain: c.drain, phaseI: -1, ph: { t: 0, si: 0, d: {} }, objs: [], nextId: 1, players: players.map(q => mkPlayer(q.id, q.color)), steady: o.steady || 0, breath: false, doc: c.doc === 'both' ? 'soko' : c.doc || 'vale', docs: c.doc === 'both' ? ['vale', 'soko'] : [c.doc || 'vale'], consultT: 0, flow: 0, bestFlow: 0, slips: 0, acts: { sloppy: 0, clean: 0, textbook: 0 }, score: 0, flags: {}, marks: [], tut: null, tip: null, codeBlue: null, codeUsed: false, closing: null, done: null, ev: [], ghosts: null, rwT: 0, out: { recap: 0, rewinds: 0, lurched: false }, sinceBeat: 0, beatLen: .9, windowOpen: true, capB: false, assistTol: 0, tilt: null, dim: 0, hush: false, static: false, silent: false, aura: null, markers: o.markers || [], lock: !!o.lock, lab: !!c.lab, attract: !!o.attract, bomb: !!c.bomb, noLac: false, stage: 0, ringOn: c.doc !== 'vale' && c.id !== 'grandrounds', dressBonus: 0, finalScore: 0, N: players.length };
    if (o.clockBonus) S.clock += o.clockBonus; S.level = o.level === undefined ? 99 : o.level;
    S.assistTol = clamp((T.assist + diff.assist + (o.assistPlus || 0)) * 1, 0, 1);
    for (const m of S.markers) void m;
    if (o.phase) Op.carry(S, o.phase); Op.enterPhase(S, o.phase || 0); return S; },
  // Starting part-way (dev Jump, a deep link, the attract reel): what earlier phases left on the table comes along
  carry(S, i) { const c = Op.caseOf(S), keep = { nest: 1, legato: 1, nerve: 1, fermata: 1, cantorbody: 1 }; S.objs = S.objs.filter(o => o.type === 'nerve' ? false : !keep[o.type] ? o : false); for (let k = 0; k < i; k++) for (const sp of c.phases[k].spawn || []) if (keep[sp.t]) { const q = Object.assign({}, sp); if (sp.t === 'legato') { q.hidden = false; if (i >= 3) { q.total = (sp.total || 150) / 2; delete q.splitAt; q.spd = (sp.spd || 34) * 1.5; } } const o = G.spawn(S, q); if (o.type === 'nest') o.mark = 9e9; if (o.type === 'fermata') o.hits = 0; if (o.type === "legato" && i === 2) { S.flags.legato_out = true; o.stage = 'out'; o.exit = [o.slurAt[0], o.slurAt[1]]; o.x = o.exit[0]; o.y = o.exit[1]; o.a = Math.atan2(116 - o.y, 213 - o.x); const g = G.getObj(S, o.gid); if (g) g.dead = true; } } S.objs = S.objs.filter(o => !o.dead); },
  caseOf: S => G.CASES[S.caseId],
  phaseOf: S => G.CASES[S.caseId].phases[S.phaseI],
  enterPhase(S, i) { const c = Op.caseOf(S), ph = c.phases[i]; S.phaseI = i; S.ph = { t: 0, si: 0, d: {} }; S.tip = null; S.tut = null; S.stage = i;
    if (c.lab) S.clock = S.clock0;
    if (ph.clockAdd) S.clock += ph.clockAdd * (S.diffId === 'intern' ? 1.3 : S.diffId === 'attending' ? .8 : 1);
    if (ph.spawn) for (const sp of ph.spawn) G.spawn(S, sp);
    if (ph.enter) G.Scripts[ph.enter](S, ph);
    if (ph.tut && !S.attract) S.tut = { verb: ph.tut.verb, text: ph.tut.text };
    if (ph.tip) S.tip = clone(ph.tip);
    ev(S, 'phase', i); rt(S).ckpt = clone(Object.assign({}, S, { ev: [] })); },
  // Hazards still open: the phase's 'clear' test, and table 7's drains
  openReq: S => S.objs.some(o => !o.dead && o.req && (o.type !== 'pool' || o.vol > 2)),
  drainNow(S) { let n = S.drain; for (const o of S.objs) if (!o.dead) { const d = O(o); if (G.inDome(S, o.x, o.y)) continue; n += d.drainOf ? d.drainOf(o, S) : d.drain; } return n * S.diff.drain * T.drainX; },
  // Where the held tool could act: for the magnet, prompts, hints and the bot
  targets(S, tool) { const out = []; for (const o of S.objs) { if (o.dead || !G.canTouch(S, o)) continue; const d = O(o); let w = d.want ? d.want(o, S) : null; if (w === tool) out.push({ o, at: d.aim ? d.aim(o, S) : [o.x, o.y], verb: d.verb }); } return out; },
  nextTarget(S) { let best = null, score = 1e9; for (const o of S.objs) { if (o.dead || !G.canTouch(S, o)) continue; const d = O(o), w = d.want ? d.want(o, S) : null; if (!w) continue; if (!o.req && o.type !== 'pool') continue; const k = o.type === 'pool' ? (o.req ? 1 : 2) : (d.drainOf ? 3 - d.drainOf(o, S) : 3 - d.drain); if (k < score) { score = k; best = { o, tool: w, at: d.aim ? d.aim(o, S) : [o.x, o.y] }; } } if (!best) for (const o of S.objs) if (!o.dead && o.hidden && !(o.mark > 0) && !G.CHEATS.reveal) return { o, tool: 'sonar', at: [o.x, o.y] }; return best; },
  step(S, inputs, dt) { if (S.done) return;
    if (G.CHEATS.infiniteSteady) S.steady = 100;
    if (S.rwT > 0) { S.rwT -= dt; S.players.forEach((p, i) => { const q = inputs[i]; if (q && !p.gone) { p.lastX = p.x = q.x; p.lastY = p.y = q.y; p.trigPrev = q.trig; } }); return; }
    if (S.codeBlue) return stepCode(S, inputs, dt);
    if (S.closing) return stepClosing(S, inputs, dt);
    if (S.out.hold > 0) { S.out.hold -= dt; if (S.out.hold <= 0) G.Scripts[S.out.holdDone](S); return; }
    S.ht += dt;
    if (S.consultT > 0) { S.consultT -= dt; if (S.consultT <= 0) { S.doc = S.docNext; ev(S, 'consulted', S.doc); } }
    S.players.forEach((p, i) => { const q = inputs[i]; if (!q || p.gone) return; if (q.gift) gift(S, p); if (q.consult && S.docs.length > 1 && S.consultT <= 0) { S.docNext = S.doc === 'vale' ? 'soko' : 'vale'; S.consultT = .4; if (S.breath) S.breath = false; G.releaseHold(S, p); ev(S, 'consult', S.docNext); G.didVerb(S, 'consult'); } });
    if (S.rwT > 0) return;   // (a Second Look just began)
    if (S.breath) { S.steady -= T.breathDrain * dt; if (S.steady <= 0) { S.steady = 0; S.breath = false; ev(S, 'breathoff'); } }
    const w = dt * (S.breath ? T.breathFactor : 1); S.w = w;
    S.t += w; S.ph.t += w; if (!S.breath) G.charge(S, .5 * dt);
    S.sinceBeat += w; S.beatLen = 60 / (56 + (99 - S.v) * .55 + (Op.caseOf(S).bpmUp || 0)); if (S.sinceBeat >= S.beatLen) { S.sinceBeat -= S.beatLen; ev(S, 'beat'); }
    S.players.forEach((p, i) => { const q = inputs[i]; if (q && !p.gone) G.toolStep(S, p, q, dt); });
    S.aura = null;
    for (let k = 0; k < S.objs.length; k++) { const o = S.objs[k]; if (o.dead) continue; o.age += w; if (o.mark > 0) o.mark -= w; const d = O(o); if (d.step) d.step(o, S, w, dt); if (d.drift !== false && S.tilt && o.loose) { o.x = clamp(o.x + S.tilt[0] * 12 * w, 60, 366); o.y = clamp(o.y + S.tilt[1] * 12 * w, 40, 192); if (o.pull) { o.bx = o.x; o.by = o.y; } } }
    if (!S.tut) { if (!(G.CHEATS.freezeClock || S.lab)) S.clock -= w; G.hurt(S, Op.drainNow(S) * w); }
    if (S.aura) { G.hurt(S, .6 * S.aura.amp * w); }
    const ph = Op.phaseOf(S);
    if (ph.script) while (S.ph.si < ph.script.length && S.ph.t >= ph.script[S.ph.si].t) { const a = ph.script[S.ph.si++]; G.Scripts[a.do](S, a); }
    if (ph.step) G.Scripts[ph.step](S, ph, w, dt);
    S.objs = S.objs.filter(o => !o.dead);
    if (S.lab) { S.v = Math.max(S.v, 60); }
    if (S.done) return;
    // done with the phase?
    if (phaseDone(S, ph)) { const c = Op.caseOf(S); if (ph.leave) G.Scripts[ph.leave](S, ph); if (S.rwT > 0 || S.codeBlue) return; if (S.phaseI + 1 < c.phases.length) { S.flow = S.flow; ev(S, 'phasedone', S.phaseI); Op.enterPhase(S, S.phaseI + 1); } else startClosing(S); return; }
    if (S.ringOn) { const r = rt(S); r.ringT += w; if (r.ringT >= .1) { r.ringT -= .1; r.ring.push(snap(S)); const cap = T.lookSeconds * 10 + 12; if (r.ring.length > cap) r.ring.shift(); } }
    if (S.clock <= 0 && !G.CHEATS.freezeClock) { S.clock = 0; return lost(S, S.bomb ? 'bomb' : 'time'); }
    if (S.bomb && S.v < 25 && !G.CHEATS.lockVitals && !S.lock && !S.tut) return lost(S, 'bomb');
    if (S.v <= 0 && !G.CHEATS.lockVitals && !S.lock) { if (S.diff.codeBlue && !S.codeUsed && !S.bomb) startCode(S); else lost(S, 'vitals'); } },
  checkpoint: S => rt(S).ckpt,
  // Retry from this phase: the phase's starting state, its rank capped at B
  retry(S) { const r = rt(S), c = r.ckpt, f = (r.fails[c.phaseI] || 0) + 1, ring = r.ring; for (const k in S) delete S[k]; Object.assign(S, clone(c)); S.capB = true; S.done = null; S.ev = []; S.clock = Math.max(S.clock, 75); S.v = Math.max(S.v, 35); /* a retry costs seconds of replay, never a phase that can't be won */ r.ring = []; r.ringT = 0; r.fails[S.phaseI] = f; ring.length = 0; return f; },
  fails: S => rt(S).fails[S.phaseI] || 0,
  ringOf: S => rt(S).ring,
  reverseOf: S => rt(S).reverse || [],
  rewind(S, secs, forced) { const r = rt(S), ring = r.ring; if (!ring.length) return false; const target = S.t - secs; let i = 0; while (i < ring.length - 1 && ring[i].t < target) i++;
    const snapTo = ring[i], frames = ring.slice(i).map(f => ({ p: f.players.map(q => [Math.round(q.x), Math.round(q.y)]), s: f.objs.filter(o => O(o).ghost && !o.dead).map(o => [o.type, Math.round(o.x), Math.round(o.y), o.open ? 1 : 0, o.id]) }));
    r.reverse = ring.slice(i); r.pre = forced ? snap(S) : null;
    const keep = { steady: S.steady, out: S.out, doc: S.doc, ev: S.ev, players: S.players.map(p => ({ x: p.x, y: p.y, tool: p.tool, toolNext: p.toolNext, trigPrev: p.trigPrev, spd: 0, gone: p.gone })) };
    for (const k in S) delete S[k]; Object.assign(S, clone(snapTo)); S.ev = keep.ev; S.steady = keep.steady; S.out = keep.out; S.doc = keep.doc; S.breath = false; keep.out.rewinds++;
    S.players.forEach((p, k) => { Object.assign(p, keep.players[k], { hold: null, lastX: keep.players[k].x, lastY: keep.players[k].y, tension: 0, fill: 0, overT: 0 }); });
    S.ghosts = { t: 0, dur: secs, fr: frames }; S.rwT = 1.2; r.ring = ring.slice(0, i + 1); ev(S, 'rewind', forced ? 1 : 0); return true; },
  // Cantor's rewind undone: the world as it stood before the forced rewind
  counter(S) { const r = rt(S); if (!r.pre) return false; const pre = r.pre; r.pre = null; const keep = { steady: S.steady, out: S.out, ev: S.ev, doc: S.doc, players: S.players.map(p => ({ x: p.x, y: p.y, tool: p.tool, toolNext: p.toolNext, trigPrev: p.trigPrev })) }; for (const k in S) delete S[k]; Object.assign(S, clone(pre)); Object.assign(S, { steady: keep.steady, out: keep.out, ev: keep.ev, doc: keep.doc, rwT: .8 }); S.players.forEach((p, k) => Object.assign(p, keep.players[k], { hold: null })); ev(S, 'rewind', 2); return true; },
  forceLost(S, why) { lost(S, why || 'vitals'); },
  forceWin(S) { S.objs = []; S.phaseI = Op.caseOf(S).phases.length - 1; S.done = 'won'; G.finalize(S); ev(S, 'won'); },
  triggerCode(S) { S.codeUsed = false; S.v = 0; startCode(S); },
  jumpPhase(S, i) { S.objs = []; S.tut = null; S.breath = false; S.flags = {}; S.hush = false; S.static = false; S.dim = 0; S.lacOpt = false; Op.carry(S, i); Op.enterPhase(S, i); },
};
const snap = S => { const c = {}; for (const k in S) if (k !== 'ev' && k !== 'ghosts') c[k] = clone(S[k]); return c; };
const phaseDone = (S, ph) => { const w = ph.when || 'clear'; if (w === 'clear') return !Op.openReq(S); if (w === 'never') return false; if (w.startsWith('flag:')) return !!S.flags[w.slice(5)]; if (w.startsWith('t:')) return S.ph.t >= +w.slice(2); return !!S.ph.d.done; };
function gift(S, p) {
  if (S.doc === 'vale' || S.caseId === 'grandrounds') { if (S.breath) { S.breath = false; ev(S, 'breathoff'); return; } if (S.steady < 35) { ev(S, 'nogift'); return; } S.breath = true; ev(S, 'breathon', p.id); G.didVerb(S, 'gift'); return; }
  if (S.steady < 45 || S.caseId === 'grandrounds') { ev(S, 'nogift'); return; }
  const r = rt(S); if (S.ph.d.counterOpen > 0 && r.pre) { S.steady -= 45; if (Op.counter(S)) { S.out.recap++; S.ph.d.counterOpen = 0; ev(S, 'countered'); G.didVerb(S, 'gift'); } return; }
  if (!r.ring.length) { ev(S, 'nogift'); return; }
  S.steady -= 45; if (Op.rewind(S, T.lookSeconds)) G.didVerb(S, 'gift'); }
function lost(S, why) { S.done = 'lost'; S.lostWhy = why; S.breath = false; ev(S, 'lost', why); }
// Code Blue: a marker crossing the peak; two hits in four attempts
function startCode(S) { S.codeUsed = true; S.breath = false; for (const p of S.players) G.releaseHold(S, p); S.codeBlue = { t: 0, tries: 0, hits: 0, per: .9, flash: 0, done: 0, res: [], pressed: false }; ev(S, 'codeblue'); S.v = 0; }
function stepCode(S, inputs, dt) { const c = S.codeBlue; if (c.done > 0) { c.done -= dt; if (c.done <= 0) { const ok = c.hits >= 2; if (ok) { S.v = 30; S.flags.revived = true; ev(S, 'revived'); } S.codeBlue = null; if (!ok) lost(S, 'vitals'); } return; }
  c.t += dt; const phase = c.t / c.per, near = Math.round(phase), err = (phase - near) * c.per; if (near > c.tries && err > .14 + (S.assistTol * .03)) { c.tries = near; c.res.push(0); ev(S, 'codemiss'); check(); }
  let press = false; S.players.forEach((p, i) => { const q = inputs[i]; if (q) { if (q.shock) press = true; p.x = q.x; p.y = q.y; p.trigPrev = q.trig; } });
  if (press && near >= 1 && near > c.tries) { const a = Math.abs(err), win = .14 + (S.assistTol * .03); c.tries = near; if (a <= win) { c.hits++; c.res.push(a <= .06 ? 2 : 1); ev(S, 'codehit', a <= .06 ? 'textbook' : 'clean'); G.grade(S, S.players[0], 213, 120, a <= .06 ? 'textbook' : 'clean', 'codeblue'); } else { c.res.push(0); ev(S, 'codemiss'); } check(); }
  function check() { if (c.hits >= 2 || c.tries >= 4 || c.tries - c.hits > 2) c.done = .6; } }
// The dressing, and the stamp
function startClosing(S) { for (const p of S.players) G.releaseHold(S, p); S.breath = false; S.objs = S.objs.filter(o => o.type === 'nerve'); S.closing = { t: 0, per: 1.5, phase: 'ring', hit: 0, stampT: 0, x: Op.caseOf(S).dressAt ? Op.caseOf(S).dressAt[0] : 213, y: Op.caseOf(S).dressAt ? Op.caseOf(S).dressAt[1] : 116, tries: 0 }; ev(S, 'dressing'); }
function stepClosing(S, inputs, dt) { const c = S.closing; c.t += dt; if (c.phase === 'ring') { const k = c.t / c.per;
    let press = false; S.players.forEach((p, i) => { const q = inputs[i]; if (q) { p.x = q.x; p.y = q.y; if (q.trig >= .3 && p.trigPrev < .3) press = true; p.trigPrev = q.trig; } });
    if (press || k >= 1.4) { const err = Math.abs(1 - k), g = !press ? 'late' : err < .08 ? 'textbook' : err < .22 ? 'clean' : 'sloppy'; S.dressBonus = g === 'textbook' ? 60 : g === 'clean' ? 30 : 10; c.g = g; c.phase = 'stamp'; c.t = 0; ev(S, 'stamp', g); }
  } else if (c.t >= (S.attract ? .5 : 2.6)) { S.done = 'won'; G.finalize(S); ev(S, 'won'); } }
G.opGift = gift;
})();
