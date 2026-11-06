// The operation: one plain JSON-safe object S and one step function. See PLAN section 19.2.
(() => {
const G = (window.GAME ||= {}), T = G.TUNING, U = G.U, OBJ = G.OBJ, CASES = G.CASES, Tools = G.Tools, Score = G.Score;
const clone = v => typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));

const mkHand = (p, i) => ({ id: p.id ?? i, seat: p.seat ?? i, name: p.name || 'P' + (i + 1), color: p.color || G.SEATS[i % 4], x: 213, y: 116, px: 213, py: 116, ax: 213, ay: 116, tool: 'forceps', swap: 0, trig: 0, down: false, pressed: false, released: false, fine: false, blocked: false,
  held: 0, gx: 0, gy: 0, pa: 0, pv: 0, p0: 0, heldT: 0, stroke: 0, offT: 0, bare: 0, stitch: null, fill: 0, over: 0, cool: 0, filling: false, heat: 0, lock: 0, charT: 0, charSlip: false, dirty: false, lens: 0,
  score: 0, acts: 0, tb: 0, slips: 0, stitches: 0, sucked: 0, burns: 0, gone: false, idle: 0, slipT: -9 });

const Op = G.Op = {
  // ---------------------------------------------------------------- creating
  create(def, o = {}) {
    if (typeof def === 'string') def = CASES[def];
    const diff = G.DIFFS[o.difficulty || 'resident'], players = o.players || [{}];
    const S = { caseId: def.id, mode: o.mode || 'story', seed: o.seed ?? 1234, rng: (o.seed ?? 1234) | 0, diff: diff.id, k: { drain: diff.drain, clock: diff.clock, assist: diff.assist, iv: diff.iv, code: diff.code, hints: diff.hints },
      t: 0, rt: 0, clock: def.clock * diff.clock * T.clockX, clockMax: def.clock * diff.clock * T.clockX, vitals: def.vitals, drain: def.drain,
      ph: -1, phT: 0, phDone: 0, scriptI: 0, phs: {}, status: 'play', rewindT: 0, steady: o.steady || 0, breath: false, doctor: def.doctor, duo: !!def.duo, consultT: 0, noLook: !(def.look || def.duo),
      objs: [], nid: 1, hands: players.map(mkHand), flow: 0, bestFlow: 0, score: 0, bonus: 0, rank: '', star: false, capB: false,
      stats: { tb: 0, cl: 0, sl: 0, slips: 0, tears: 0, stitches: 0, burns: 0, sucked: 0, vSum: 0, vN: 0, rewinds: 0, longBreaths: 0, codes: 0 },
      beatP: 0, beatV: 0, beatN: 0, tilt: [0, 0], tiltOn: 0, dim: 0, silent: 0, jitter: null, tension: 0, crash: 0, drainAdd: 0, flags: {}, marks: [], code: { used: false, on: false, t: 0, k: 1, hits: 0, good: 0 }, close: null, tut: null, seenTut: {}, prompt: null, lost: '', dev: o.dev || null, keep: {}, closeBonus: 0, idle: 0, ev: [] };
    if (o.lightboxBonus) { S.clock += 20; S.clockMax += 20; Score.charge(S, 20); S.flags.lightbox = true; }
    // a jump straight to a later phase still brings what earlier phases left on the table (carry: true)
    for (let i = 0; i < (o.phase || 0); i++) { const ph = def.phases[i]; if (!ph.carry) continue; for (const q of ph.spawn || []) Op.spawn(S, q); if (ph.enter) Op.run(S, ph.enter); }
    Op.enterPhase(S, o.phase || 0, true);
    return S;
  },
  byId(S, id) { const a = S.objs; for (let i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; },
  byTag(S, tag) { const a = S.objs; for (let i = 0; i < a.length; i++) if (a[i].tag === tag && !a[i].done) return a[i]; return null; },
  /** make an object from a plain spec (case data or a strain) */
  spawn(S, spec) {
    const o = clone(spec); o.id = S.nid++; if (o.req === undefined) o.req = OBJ[o.type] && OBJ[o.type].optional ? false : true;
    const reg = OBJ[o.type]; if (!reg) throw new Error('no object type ' + o.type);
    if (reg.strain && o.type !== 'nest') o.surface = true;   // strains ride above the blood; a nest can be under a pool
    if (reg.init) reg.init(o, S);
    S.objs.push(o); return o;
  },
  // ---------------------------------------------------------------- what a tool can act on
  poolR: o => 5 + Math.sqrt(Math.max(0, o.vol)) * 1.55,
  covered(S, o) { if (o.type === 'pool' || o.noCover || o.surface) return false; for (const p of S.objs) if (p.type === 'pool' && !p.done && U.dist(p.x, p.y, o.x, o.y) < Op.poolR(p) * .82 - 1) return true; return false; },
  inDome(S, x, y) { for (const d of S.objs) if (d.type === 'dome' && !d.done && U.dist(d.x, d.y, x, y) < d.r) return d; return null; },
  /** the verb when this tool can act on o now, else null */
  valid(S, o, tool, h) { if (o.done) return null; if (o.hidden && !(o.marked > 0)) return null; if (Op.covered(S, o)) return null; const a = OBJ[o.type].accept; return a ? a(o, tool, S, h) : null; },
  point(S, o, tool) { const p = OBJ[o.type].point; return p ? p(o, S, tool) : [o.x, o.y]; },
  nearest(S, tool, x, y, h, filter) { let best = null, bd = 1e9; for (const o of S.objs) { if (o.done || (filter && !filter(o)) || !Op.valid(S, o, tool, h)) continue; const p = Op.point(S, o, tool), d = U.dist(x, y, p[0], p[1]); if (d <= Tools.reach(S, h, tool, o) && d < bd) { bd = d; best = o; } } return best; },
  /** for the magnet: the nearest thing the held tool can act on, within r */
  magnetTarget(S, tool, x, y, r, h) { let best = null, bd = r; for (const o of S.objs) { if (o.done || !Op.valid(S, o, tool, h)) continue; const pts = Op.magnetPoints(S, o, tool); for (const p of pts) { const d = U.dist(x, y, p[0], p[1]); if (d < bd) { bd = d; best = { o, x: p[0], y: p[1], d }; } } } return best; },
  magnetPoints(S, o, tool) { if (OBJ[o.type].sewable && tool === 'suture') { const st = Op.nextStitch(S, o); return st ? [st.a, st.b] : []; } return [Op.point(S, o, tool)]; },
  /** the prompt beside the cursor: what pressing does here, or null */
  promptAt(S, h) { if (!h) return null; if (h.held) { const o = Op.byId(S, h.held); return o ? 'Release' : null; } const t = Op.magnetTarget(S, h.tool, h.x, h.y, 18, h); if (!t) return null; return Op.valid(S, t.o, h.tool, h); },
  /** the next job and the tool it needs (hints and the bot) */
  nextJob(S, h) {
    let best = null, bs = 1e9;
    for (const o of S.objs) {
      if (o.done) continue; const spec = OBJ[o.type];
      if (!o.req && spec.optionalJob !== true) continue;
      if (spec.job) { const j = spec.job(o, S, h); if (!j) continue; const prio = (spec.prio ?? 5) * 1000; if (prio < bs) { bs = prio; best = Object.assign({ of: o }, j); } continue; }
      let tool = null, target = o;
      if (o.hidden && !(o.marked > 0)) tool = 'sonar';
      else if (Op.covered(S, o)) { let cp = null, cd = 1e9; for (const p of S.objs) if (p.type === 'pool' && !p.done) { const d = U.dist(p.x, p.y, o.x, o.y); if (d < cd) { cd = d; cp = p; } } tool = 'suction'; target = cp || o; }
      else for (const t of G.TOOLS) if (Op.valid(S, o, t, h)) { tool = t; break; }
      if (!tool) continue;
      const prio = (spec.prio ?? 5) * 1000 + U.dist(h ? h.x : 213, h ? h.y : 116, target.x, target.y);
      if (prio < bs) { bs = prio; best = { tool, o: target, of: o }; }
    }
    return best;
  },
  nextStitch(S, o) { const s = o.stitches[o.sewn]; if (!s) return null; if (!o.sway) return s; const k = Math.sin(S.t * 1.1 + o.sewn) * o.sway, ky = Math.cos(S.t * .8 + o.sewn) * o.sway * .5; return { a: [s.a[0] + k, s.a[1] + ky], b: [s.b[0] + k, s.b[1] + ky] }; },
  // ---------------------------------------------------------------- finishing things
  finishObj(S, o, h, grade, worth, tool) {
    if (o.done) return; o.done = true;
    const spec = OBJ[o.type];
    if (grade) Score.award(S, h, o.x, o.y, grade, worth);
    if (S.tut && S.tut.tool === tool) { S.ev.push(['tutDone', tool]); S.tut = null; }
    if (spec.onDone) spec.onDone(S, h, o);
    if (o.leaves) { for (const l of [].concat(o.leaves)) { const q = Object.assign({ x: o.ox ?? o.x, y: o.oy ?? o.y }, l); Op.spawn(S, q); } }
    if (o.then) Op.run(S, o.then);
  },
  healed(S, o, h) { if (o.done) return; const quick = (o.salveT || 0) <= (o.r || 10) * .1 * T.tolX; S.ev.push(['healed', o.x, o.y, h ? h.id : 0]); Score.heal(S, T.salveHeal); Op.finishObj(S, o, h, quick ? 'Textbook' : 'Clean', OBJ[o.type].worth || 40, 'salve'); },
  /** add blood: to a pool nearby, or a new one */
  addPool(S, x, y, vol) { if (vol <= 0) return null; let p = null, bd = 16; for (const q of S.objs) if (q.type === 'pool' && !q.done) { const d = U.dist(q.x, q.y, x, y); if (d < Op.poolR(q) + bd) { p = q; bd = d - Op.poolR(q); } } if (p) { p.vol = Math.min(400, p.vol + vol); return p; } return Op.spawn(S, { type: 'pool', x, y, vol, req: false }); },
  // ---------------------------------------------------------------- phases
  def: S => CASES[S.caseId],
  phaseDef: S => CASES[S.caseId].phases[S.ph],
  enterPhase(S, i, first) {
    const def = CASES[S.caseId], ph = def.phases[i];
    S.ph = i; S.phT = 0; S.phDone = 0; S.scriptI = 0; S.phs = {}; S.prompt = null; S.objs = S.objs.filter(o => !o.done);
    for (const q of ph.spawn || []) Op.spawn(S, q);
    S.tut = null;
    if (ph.tut && !S.seenTut[ph.tut.tool] && !(S.dev && S.dev.noTut)) { S.tut = { tool: ph.tut.tool, text: ph.tut.text }; S.seenTut[ph.tut.tool] = true; }
    if (ph.prompt) S.prompt = ph.prompt;
    if (ph.enter) Op.run(S, ph.enter);
    S.ev.push(['phase', i, ph.obj]); S.ev.push(['sayp', 'enter']);
    const A = G.aux(S); A.cp = { snap: Op.snapshot(S), ph: i };
  },
  /** run a list of actions: [name, ...args] */
  run(S, list) { for (const a of list) { const fn = G.ACTIONS[a[0]]; if (!fn) throw new Error('no action ' + a[0]); fn(S, ...a.slice(1)); } },
  cleared(S) {
    const ph = Op.phaseDef(S), c = ph.clear;
    if (c) { if (c.t !== undefined && S.phT < c.t) return false; if (c.vitals !== undefined && S.vitals < c.vitals) return false; if (c.flag && !S.flags[c.flag]) return false; if (c.found !== undefined && (S.flags.foundN || 0) < c.found) return false; if (c.only) return true; }
    for (const o of S.objs) if (o.req && !o.done) return false;
    return true;
  },
  stepPhase(S, wdt, dt) {
    const ph = Op.phaseDef(S), script = ph.script || []; S.phT += wdt;
    while (S.scriptI < script.length && script[S.scriptI].t <= S.phT) { Op.run(S, script[S.scriptI].do); S.scriptI++; }
    if (S.tut) return;
    if (S.phDone > 0) { S.phDone -= dt; if (S.phDone <= 0) { const def = CASES[S.caseId]; if (S.ph + 1 < def.phases.length) Op.enterPhase(S, S.ph + 1); else Op.beginClose(S); } return; }
    if (Op.cleared(S)) { S.phDone = .9; S.ev.push(['phaseDone', S.ph]); S.ev.push(['sayp', 'done']); Score.charge(S, 4); for (const h of S.hands) { if (h.held) h.held = 0; h.stroke = 0; h.stitch = null; } }
  },
  beginClose(S) {
    const def = CASES[S.caseId];
    S.status = 'closing'; S.breath = false; S.close = { t: 0, x: def.closeAt ? def.closeAt[0] : 213, y: def.closeAt ? def.closeAt[1] : 116, done: false, bonus: 0, r: 46, hit: '' };
    S.ev.push(['closing']); S.ev.push(['say', 'dressing']);
  },
  stepClose(S, inputs, dt) {
    const c = S.close; c.t += dt;
    if (!c.done) {
      c.r = Math.max(0, 46 - c.t * 28);
      const press = inputs.some((inp, i) => inp && inp.trig >= .3 && !(S.hands[i] && S.hands[i].down)); S.hands.forEach((h, i) => { h.down = !!(inputs[i] && inputs[i].trig >= .3); });
      if (press || c.r <= 0) {
        const off = Math.abs(c.r - 12); c.done = true; c.t = 0;
        c.hit = press ? (off <= 2.5 ? 'Textbook' : off <= 7 ? 'Clean' : 'Sloppy') : 'Sloppy'; c.bonus = c.hit === 'Textbook' ? 300 : c.hit === 'Clean' ? 120 : 0;
        S.score += c.bonus; S.closeBonus = c.bonus; Score.finish(S); S.ev.push(['stamp', c.hit]);
      }
    } else if (c.t >= 2.2) { S.status = 'closed'; S.ev.push(['closed']); }
  },
  lose(S, why) { if (S.status === 'lost') return; S.status = 'lost'; S.lost = why; S.breath = false; S.ev.push(['lost', why]); },
  // ---------------------------------------------------------------- Code Blue
  beginCode(S) {
    const c = S.code; c.used = true; c.on = true; c.t = 0; c.k = 1; c.hits = 0; c.good = 0; c.flash = 0; S.status = 'code'; S.breath = false; S.stats.codes++; S.crash = 0;
    for (const h of S.hands) { h.held = 0; h.stroke = 0; h.stitch = null; h.shockDown = false; }
    S.ev.push(['codeBlue']); S.ev.push(['say', 'code']);
  },
  stepCode(S, inputs, dt) {
    const c = S.code; c.t += dt; c.flash = Math.max(0, (c.flash || 0) - dt);
    const every = T.codeEvery, ok = T.codeOk * (S.diff === 'intern' ? 1.35 : 1), peak = c.k * every;
    let shock = false; S.hands.forEach((h, i) => { const on = !!(inputs[i] && inputs[i].shock); if (on && !h.shockDown) shock = true; h.shockDown = on; });
    if (shock) {
      const d = Math.abs(c.t - peak);
      if (d <= ok) { c.hits++; if (d <= T.codeGood) c.good++; c.flash = .2; S.ev.push(['shock', d <= T.codeGood ? 'Textbook' : 'Clean']); }
      else S.ev.push(['shockMiss']);
      c.k++;
    } else if (c.t > peak + ok) { S.ev.push(['shockMiss']); c.k++; }
    if (c.hits >= 2) { c.on = false; S.status = 'play'; S.vitals = T.codeRevive; S.ev.push(['revive']); S.ev.push(['say', 'revive']); if (S.flags.onRevive) { const r = S.flags.onRevive; S.flags.onRevive = null; Op.run(S, r); } return; }
    if (c.k > 4) { c.on = false; Op.lose(S, 'vitals'); }
  },
  // ---------------------------------------------------------------- Second Look and rewinds
  snapshot(S) { const ev = S.ev; S.ev = []; const c = clone(S); S.ev = ev; return c; },
  restore(S, snap) { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, clone(snap)); S.ev = []; },
  /** record a snapshot every .1 s when this case can rewind */
  record(S, dt) { const A = G.aux(S); A.snapT -= dt; if (A.snapT <= 0) { A.snapT += .1; A.hist.push({ rt: S.rt, t: S.t, snap: Op.snapshot(S) }); while (A.hist.length > 62) A.hist.shift(); } },
  canLook(S) { const A = G.aux(S); return !S.noLook && S.status === 'play' && S.doctor === 'sokolova' && S.steady >= T.lookCost && A.hist.length >= 3 && !S.tut; },
  /** take the field back; the player's cursor stays their own, and anything held or mid-stroke is let go */
  rewind(S, secs, o = {}) {
    const A = G.aux(S), now = Op.snapshot(S), target = S.rt - secs; let i = A.hist.findIndex(e => e.rt >= target); if (i < 0) i = 0;
    const span = A.hist.slice(i); if (!span.length) return false;
    const keep = { steady: S.steady, keep: clone(S.keep), stats: clone(S.stats) }, seenTut = clone(S.seenTut);
    const hands = S.hands.map(h => ({ tool: h.tool, x: h.x, y: h.y, px: h.x, py: h.y, score: h.score }));
    A.reverse = span.map(e => e.snap).reverse(); A.reverse.unshift(now); A.revU = 0;
    A.ghosts = { t0: span[0].t, frames: span.map(e => Op.ghostFrame(e.snap)), until: now.t };
    if (o.forced) A.preForced = { snap: now, rt: S.rt };
    Op.restore(S, span[0].snap); A.hist.length = i + 1; A.snapT = .1;
    S.steady = Math.max(0, keep.steady - (o.cost || 0)); S.keep = keep.keep; S.seenTut = seenTut;
    S.stats.rewinds = keep.stats.rewinds + 1; S.stats.slips = S.stats.slips; S.status = 'rewind'; S.rewindT = o.show ?? 1.2; S.breath = false;
    S.hands.forEach((h, n) => { Object.assign(h, hands[n]); h.held = 0; h.stroke = 0; h.stitch = null; h.fill = 0; h.over = 0; h.filling = false; h.down = false; });
    S.ev.push(['rewind', o.forced ? 1 : 0]); if (!o.forced) S.ev.push(['say', 'look']);
    return true;
  },
  /** undo a forced rewind (the Cantor's Recapitulation): "I've seen this one." */
  counter(S) {
    const A = G.aux(S), pf = A.preForced; if (!pf) return false;
    const keep = clone(S.keep), st = S.steady; A.reverse = [Op.snapshot(S), pf.snap]; A.preForced = null;
    Op.restore(S, pf.snap); S.keep = keep; S.steady = st; S.status = 'rewind'; S.rewindT = .6; S.hands.forEach(h => { h.held = 0; h.stroke = 0; h.stitch = null; });
    const n = A.hist.findIndex(e => e.rt >= S.rt); if (n >= 0) A.hist.length = n; S.ev.push(['rewind', 2]); return true;
  },
  ghostFrame(sn) { const strains = []; for (const o of sn.objs) if (!o.done && OBJ[o.type].ghost) strains.push(OBJ[o.type].ghost(o, sn)); return { t: sn.t, hands: sn.hands.map(h => [h.x, h.y, h.tool]), strains }; },
  /** retry from the phase's start: rank capped at B */
  retryPhase(S) {
    const A = G.aux(S), cp = A.cp; if (!cp) return false;
    const fails = (S.keep.fails || 0) + 1, keepSeen = clone(S.seenTut);
    Op.restore(S, cp.snap); S.capB = true; S.keep.fails = fails; S.seenTut = keepSeen; A.hist.length = 0; A.ghosts = null; A.reverse = null; S.ev.push(['retry']);
    return true;
  },
  // ---------------------------------------------------------------- the step
  step(S, inputs, dt) {
    S.ev = [];
    if (S.dev && S.dev.steady) S.steady = 100;
    if (S.status === 'closed' || S.status === 'lost') return;
    if (S.status === 'rewind') { S.rewindT -= dt; if (S.rewindT <= 0) { S.status = 'play'; G.aux(S).reverse = null; } return; }
    if (S.status === 'code') { Op.stepCode(S, inputs, dt); return; }
    if (S.status === 'closing') { Op.stepClose(S, inputs, dt); return; }
    S.rt += dt;
    const f = S.breath ? T.breathFactor : 1, wdt = dt * f;
    S.tension = Math.max(0, (S.tension || 0) - dt * 3);
    // gifts and hand-offs come first, so a rewind's step starts clean
    let gift = false, consult = false;
    for (let i = 0; i < S.hands.length; i++) { const inp = inputs[i]; if (!inp) continue; const h = S.hands[i]; if (inp.gift && !h.giftDown) gift = true; if (inp.consult && !h.consultDown) consult = true; h.giftDown = !!inp.gift; h.consultDown = !!inp.consult; }
    if (gift) { if (Op.useGift(S)) { if (S.status === 'rewind') return; } }
    if (consult && S.duo && S.consultT <= 0) { S.doctor = S.doctor === 'vale' ? 'sokolova' : 'vale'; S.consultT = .4; S.ev.push(['consult', S.doctor]); if (S.prompt === 'consult') S.prompt = null; }
    if (S.consultT > 0) S.consultT -= dt;
    if (S.breath) { S.steady -= T.breathDrain * dt; if (S.steady <= 0) { S.steady = 0; S.breath = false; S.ev.push(['breathEnd']); } }
    else if (!S.tut) Score.charge(S, T.steadyIdle * dt);
    // the ship's roll
    if (S.tiltOn) { S.tilt = [Math.sin(S.t * .55) * 25 * S.tiltOn, Math.cos(S.t * .37) * 10 * S.tiltOn]; }
    // the beat
    const bpm = 66 + (99 - S.vitals) * .55; S.bpm = bpm; S.beatP += wdt * bpm / 60; if (S.beatP >= 1) { S.beatP -= 1; S.beatN++; S.beatT = S.t; S.ev.push(['beat']); } S.beatV = U.beatShape(S.beatP);
    // hands
    const jit = S.jitter;
    for (let i = 0; i < S.hands.length; i++) {
      const h = S.hands[i], inp = inputs[i]; if (h.gone) continue;
      if (!inp) { h.pressed = false; h.released = h.down; h.down = false; }
      else {
        let ax = inp.x, ay = inp.y;
        if (jit && !S.breath && U.dist(ax, ay, jit.x, jit.y) < jit.r) { const a = jit.amp * 5 * (inp.fine ? .35 : 1); ax += Math.sin(S.rt * 61 + i * 3) * a * Math.cos(S.rt * 13); ay += Math.sin(S.rt * 53 + i * 7 + 1) * a * Math.cos(S.rt * 17); }
        h.px = h.x; h.py = h.y; if (S.rt <= dt * 1.5) { h.px = ax; h.py = ay; } h.x = ax; h.y = ay; h.fine = !!inp.fine;
        if (inp.tool !== h.tool && G.TOOLS.includes(inp.tool)) { Op.dropAll(S, h); h.tool = inp.tool; h.swap = .12; h.fill = 0; h.over = 0; h.filling = false; S.ev.push(['swap', h.tool, h.id]); }
        const on = inp.trig >= (h.down ? .18 : .3); h.pressed = on && !h.down; h.released = !on && h.down; h.down = on; h.trig = inp.trig;
        if (inp.cancel) Op.dropAll(S, h);
      }
      if (h.swap > 0) { h.swap -= dt; h.pressed = false; h.blockSwap = true; continue; }
      const dome = Op.inDome(S, h.x, h.y);
      h.blocked = !!dome || S.consultT > 0;
      if (h.blocked) { if (h.pressed) S.ev.push(['domeNo', h.x, h.y, h.id]); h.lens = 0; if (h.tool === 'cautery' || h.tool === 'syringe') { h.heat = Math.max(0, h.heat - T.heatCool * dt); } continue; }
      Tools[h.tool](S, h, dt);
      if (h.tool !== 'sonar') h.lens = 0;
    }
    // the world
    let drain = 0; const frozen = !!S.tut || (S.dev && S.dev.frozen);
    for (let i = 0; i < S.objs.length; i++) {
      const o = S.objs[i]; if (o.done) continue; const spec = OBJ[o.type];
      if (o.marked > 0) o.marked -= dt;
      if (spec.step && !frozen) { spec.step(o, S, spec.strain ? wdt * T.strainSpeed : wdt, dt); if (S.status !== 'play') return; }
      if (spec.hazard) drain += typeof spec.hazard === 'function' ? spec.hazard(o, S) : spec.hazard;
    }
    // vitals and clock
    S.t += wdt;
    if (!frozen) {
      const k = S.k.drain * T.drainX;
      Score.hurt(S, (S.drain + S.drainAdd) * k * wdt + drain * k * wdt);
      if (S.crash) Score.hurt(S, S.crash * wdt);
      if (!(S.dev && S.dev.freeze)) S.clock -= wdt;
      S.stats.vSum += S.vitals * dt; S.stats.vN += dt;
    }
    Op.stepPhase(S, wdt, dt);
    S.objs = S.objs.length > 400 ? S.objs.filter(o => !o.done) : S.objs;
    if (S.objs.some(o => o.done)) S.objs = S.objs.filter(o => !o.done);
    if (!S.noLook) Op.record(S, dt);
    if (S.status !== 'play') return;
    if (S.clock <= 0) { S.clock = 0; Op.lose(S, S.flags.bomb ? 'bomb' : 'clock'); return; }
    if (S.flags.bomb && S.vitals < S.flags.bomb) { Op.lose(S, 'bomb'); return; }
    if (S.vitals <= 0 && !(S.dev && S.dev.lock)) { S.vitals = 0; if (!S.code.used && (S.k.code || S.flags.forceCode)) Op.beginCode(S); else Op.lose(S, 'vitals'); }
  },
  dropAll(S, h) { if (h.held) { const o = Op.byId(S, h.held); if (o) Tools.letGo(S, h, o); h.held = 0; } h.stroke = 0; h.stitch = null; },
  /** the Steady: press to use the doctor's gift (5.7) */
  useGift(S) {
    if (S.status !== 'play') return false;
    if (S.breath) { S.breath = false; S.ev.push(['breathEnd']); return true; }
    if (S.doctor === 'sokolova' && !S.noLook) {
      const A = G.aux(S);
      if (S.flags.recap && A.preForced && S.rt - A.preForced.rt < 3 && S.steady >= T.lookCost * .6) { const r = Op.counter(S); if (r) { S.steady = Math.max(0, S.steady - T.lookCost * .6); G.ACTIONS.recapCounter && G.ACTIONS.recapCounter(S); } return r; }
      if (Op.canLook(S)) { const rec = S.prompt === 'look'; const ok = Op.rewind(S, T.lookSeconds, { cost: T.lookCost }); if (ok && rec) S.prompt = null; if (ok) S.flags.looked = true; return ok; }
      S.ev.push(['giftNo']); return false;
    }
    if (S.steady >= T.breathCost) { S.breath = true; S.stats.longBreaths++; S.ev.push(['breath']); S.ev.push(['say', 'breath']); if (S.prompt === 'breath') S.prompt = null; S.flags.breathed = true; return true; }
    S.ev.push(['giftNo']); return false;
  },
};

// ------------------------------------------------------------------ actions a phase script can use
const A = G.defAction;
A('spawn', (S, spec) => Op.spawn(S, spec));
A('set', (S, key, v) => { S.flags[key] = v; });
A('setO', (S, tag, key, v) => { const o = Op.byTag(S, tag); if (o) o[key] = v; });
A('add', (S, tag, key, v) => { const o = Op.byTag(S, tag); if (o) o[key] = (o[key] || 0) + v; });
A('dip', (S, to) => { S.vitals = Math.min(S.vitals, to); S.ev.push(['dip']); });
A('crash', (S, rate) => { S.crash = rate; S.ev.push(['crash']); });
A('crashStop', S => { S.crash = 0; });
A('forceCode', (S, list) => { S.flags.forceCode = true; S.code.used = false; S.flags.onRevive = list || null; });
A('steady', (S, n) => { S.steady = Math.max(S.steady, n); });
A('prompt', (S, id) => { S.prompt = id; });
A('say', (S, key) => { S.ev.push(['sayp', key]); });
A('shake', (S, n) => { S.ev.push(['shake', n]); });
A('tilt', (S, amp) => { S.tiltOn = amp; });
A('dim', (S, v) => { S.dim = v; S.ev.push(['dim', v]); });
A('drainAdd', (S, v) => { S.drainAdd = v; });
A('slip', (S, x, y, cost, why) => { Score.slip(S, S.hands[0], x, y, cost, why || 'lurch'); });
A('bomb', (S, v) => { S.flags.bomb = v; });
A('music', (S, id) => { S.ev.push(['music', id]); });
A('clockAdd', (S, n) => { S.clock += n; S.clockMax = Math.max(S.clockMax, S.clock); S.ev.push(['clockAdd', n]); });
A('flag', (S, k) => { S.flags[k] = true; });
})();
