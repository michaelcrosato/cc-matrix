/* Operation sim. Plain data in, plain data out. No drawing, no audio, no DOM.
   Cursor and the wheel sit beside it and feed the same inputs a pad does. */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});
  const CFG = GAME.CFG;
  const TAU = Math.PI * 2;

  const DRAIN = {
    shard: 0.1, fragment: 0.1, cork: 0.1, laceration: 0.2, bite: 0.2, wound: 0.4,
    bleeder: 0.5, arteryTear: 1, polyp: 0.1, mass: 0.2, hook: 0.3, gaff: 0.3,
    clot: 0.3, patch: 0.1, nest: 0.15, bead: 0, rupture: 0.45, screw: 0, wire: 0,
    pool: 0, retractor: 0, slur: 0, reed: 0, tremass: 0.4, lobe: 0.2, eye: 0.35,
    tendril: 0.2, uvula: 0.3, voice: 0.4, repeat: 0, spiral: 0, note: 0.2, nerve: 0,
    eloquent: 0, hold: 0,
  };

  function rnd(S) {
    let x = (S.rng >>> 0) || 1;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17; x >>>= 0;
    x ^= x << 5; x >>>= 0;
    if (!x) x = 1;
    S.rng = x;
    return x / 4294967296;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot(x, y) { return Math.hypot(x, y); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function tuneOf(t) { return t || GAME.TUNE || CFG.cloneTune(CFG.TUNING); }
  function diffDrain(S) { return S.diff === 'intern' ? 0.7 : S.diff === 'attending' ? 1.3 : 1; }
  function diffClock(S) { return S.diff === 'intern' ? 1.3 : S.diff === 'attending' ? 0.8 : 1; }
  function syringeDose(S, tune) {
    const base = tune.patient.syringe;
    if (S.diff === 'intern') return 24 * (base / 18);
    if (S.diff === 'attending') return 12 * (base / 18);
    return base;
  }

  function objById(S, id) {
    for (let i = 0; i < S.objects.length; i++) if (S.objects[i].id === id) return S.objects[i];
    return null;
  }

  function pushEv(S, ev) { S.ev.push(ev); }

  function slip(S, p, kind, dmg, tune) {
    S.slips += 1;
    if (p) p.slips += 1;
    S.vitals -= dmg * tune.patient.slip;
    S.streak = 0;
    S.flow = 1;
    pushEv(S, ['slip', kind, dmg, p ? p.id : -1]);
  }

  function award(S, p, grade, base, tune) {
    const mult = grade === 'textbook' ? 1.5 : grade === 'clean' ? 1 : 0.4;
    const pts = base * mult * S.flow;
    S.score += pts;
    p.score += pts;
    p.actions += 1;
    S.techAll += 1;
    if (grade !== 'sloppy') S.techGood += 1;
    if (grade === 'textbook') { p.textbooks += 1; S.steady = Math.min(100, S.steady + 10 * tune.gift.charge); }
    else if (grade === 'clean') S.steady = Math.min(100, S.steady + 5 * tune.gift.charge);
    if (grade === 'sloppy') { S.streak = 0; S.flow = 1; }
    else {
      S.streak += 1;
      S.flow = Math.min(2, 1 + 0.05 * S.streak);
      if (S.flow > S.bestFlow) S.bestFlow = S.flow;
    }
    if (!S.tutDone) S.tutDone = true;
    pushEv(S, ['grade', Math.round(p.x), Math.round(p.y), grade, Math.round(pts)]);
    return grade;
  }

  function makePlayer(i, color) {
    return {
      id: i, x: 213, y: 150, bx: 213, by: 150, tool: 'forceps', trig: 0, prevTrig: 0,
      fine: false, held: 0, stroke: null, heat: 0, lock: 0, fill: 0, over: 0,
      cool: 0, score: 0, slips: 0, actions: 0, textbooks: 0, stitches: 0,
      suctioned: 0, burned: 0, speed: 0, wheelT: 0, wheelDir: -1, swap: 0,
      giftPrev: false, consultPrev: false, color: color || CFG.SEAT[i] || '#e8443a',
      gone: false, lx: 213, ly: 150, charT: 0, charSlip: false, bare: 0, bareT: 0,
    };
  }

  function blank(opts) {
    opts = opts || {};
    const n = opts.players || 1;
    const S = {
      id: opts.id || 'raw', seed: (opts.seed >>> 0) || 1, rng: (opts.seed >>> 0) || 1,
      diff: opts.difficulty || opts.diff || 'resident',
      clock: opts.clock != null ? opts.clock : 180,
      clock0: opts.clock != null ? opts.clock : 180,
      vitals: opts.vitals != null ? opts.vitals : 80,
      drain: opts.drain != null ? opts.drain : 0,
      phase: 0, phaseCount: 1, phaseName: opts.phaseName || 'Work',
      objects: [], nextId: 1, players: [],
      steady: opts.steady || 0, breath: false, worldScale: 1,
      gift: opts.gift || 'breath', doctor: opts.doctor || 'vale', activeDoc: opts.doctor || 'vale',
      consult: !!opts.consult, mode: opts.mode || 'case',
      codeBlueUsed: false, codeBlue: null, lost: false, won: false, closed: false, reason: '',
      score: 0, slips: 0, flow: 1, streak: 0, bestFlow: 1, techGood: 0, techAll: 0,
      t: 0, worldT: 0, phaseT: 0, ev: [], ghosts: [], ghostT: 0,
      ring: [], ringAcc: 0, checkpoint: null, rankCap: null, par: opts.par || 1000,
      site: opts.site || 'abdomen', tutorial: !!opts.tutorial, tutDone: !opts.tutorial,
      strain: null, flags: {}, scripts: [], tiltAmp: 0, dim: 0, dressing: null,
      device: null, windowOpen: 0, dev: !!opts.dev,
    };
    for (let i = 0; i < n; i++) S.players.push(makePlayer(i, opts.colors && opts.colors[i]));
    return S;
  }

  function addObj(S, spec) {
    const o = Object.assign({
      id: S.nextId++, type: 'shard', x: 213, y: 116, alive: true, done: false,
      hidden: false, marked: false, markT: 0, under: 0, prog: 0, order: 0,
      drain: 0, grade: '', tag: '',
    }, spec);
    if (o.drain == null || spec.drain == null) o.drain = spec.drain != null ? spec.drain : (DRAIN[o.type] || 0);
    if (!o.origin) o.origin = [o.x, o.y];
    if (!o.axis) o.axis = [1, 0];
    const al = hypot(o.axis[0], o.axis[1]) || 1;
    o.axis = [o.axis[0] / al, o.axis[1] / al];
    if (o.depth == null) o.depth = 16;
    if (o.type === 'pool' && o.vol == null) o.vol = o.max || 36;
    if (o.type === 'pool' && o.max == null) o.max = o.vol;
    if ((o.type === 'wound' || o.type === 'arteryTear') && !o.pairs) {
      const n = o.stitches || (o.type === 'arteryTear' ? 3 : 4);
      o.pairs = [];
      for (let i = 0; i < n; i++) {
        const y = o.y - (n - 1) * 4 + i * 8;
        o.pairs.push([[o.x - 8, y], [o.x + 8, y]]);
      }
    }
    if (o.pairs) o.stitch = 0;
    if ((o.type === 'laceration' || o.type === 'patch' || o.type === 'bite') && !o.cells) {
      const r = o.r || 12;
      o.cells = [];
      for (let y = -r; y <= r; y += 4) for (let x = -r; x <= r; x += 4) {
        if (x * x + y * y <= r * r) o.cells.push([o.x + x, o.y + y, 0]);
      }
    }
    if ((o.type === 'mass' || o.type === 'spiral' || o.type === 'slur' || o.type === 'tendril' || o.type === 'wire' || o.type === 'repeat') && !o.guide) {
      const len = o.len || 48;
      o.guide = [[o.x - len / 2, o.y], [o.x + len / 2, o.y]];
    }
    if (o.type === 'mass' && !o.ring) {
      o.ring = true;
      const rad = o.rad || 16;
      o.guide = [];
      for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + TAU * i / 12;
        o.guide.push([o.x + Math.cos(a) * rad, o.y + Math.sin(a) * rad]);
      }
    }
    if (o.type === 'retractorHandle') o.type = 'retractor';
    if (spec.underTag) {
      const pool = S.objects.find(q => q.tag === spec.underTag);
      if (pool) o.under = pool.id;
    }
    if (o.need == null) {
      if (o.type === 'polyp') o.need = 0.5;
      else if (o.type === 'bleeder' || o.type === 'rupture') o.need = 0.35;
      else if (o.type === 'bead') o.need = 0.12;
      else if (o.type === 'uvula') o.need = 1.5;
      else if (o.type === 'eye') o.need = 0.3;
      else if (o.type === 'tremass') o.need = 3;
      else o.need = 0.5;
    }
    S.objects.push(o);
    return o;
  }

  function inDome(S, x, y) {
    const st = S.strain;
    if (!st || !st.domes) return false;
    for (let i = 0; i < st.domes.length; i++) {
      const d = st.domes[i];
      if (d.t > 0 && hypot(x - d.x, y - d.y) <= d.r) return true;
    }
    return false;
  }

  function covered(S, o) {
    if (!o.under) return false;
    const p = objById(S, o.under);
    return !!(p && !p.done && p.vol > 1);
  }

  function canTouch(S, o) {
    if (!o || o.done || !o.alive) return false;
    if (covered(S, o)) return false;
    if (o.hidden && !o.marked) return false;
    if (o.needsWindow && S.windowOpen <= 0) return false;
    if (o.needsBoard && S.device && !S.device.shown) return false;
    if (o.type === 'reed' || o.type === 'voice') return !!o.window;
    if (o.type === 'lobe') return !!o.open;
    if (o.type === 'eye') return !!o.open;
    if (o.type === 'repeat') return !!o.open;
    return true;
  }

  function nearest(S, p, rad, pred) {
    let best = null, bd = rad;
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (!pred(o)) continue;
      const d = hypot(o.x - p.x, o.y - p.y);
      if (d <= bd) { bd = d; best = o; }
    }
    return best;
  }

  function lose(S, why) {
    if (S.lost || S.won) return;
    S.lost = true;
    S.reason = why;
    S.breath = false;
    S.worldScale = 1;
    pushEv(S, ['lost', why]);
  }

  function finishCase(S) {
    if (S.won || S.lost) return;
    S.won = true;
    S.closed = true;
    S.breath = false;
    S.worldScale = 1;
    const end = Math.max(0, S.clock) * 2 + Math.max(0, S.vitals) * 3;
    S.score += end;
    S.endBonus = end;
    S.rank = rankLetter(S.score, S.par, S.diff, S.slips, S.rankCap);
    pushEv(S, ['closed', S.rank, Math.round(S.score)]);
  }

  function rankLetter(score, par, diff, slips, cap) {
    const r = par > 0 ? score / par : 0;
    let L = r >= 0.95 ? 'S' : r >= 0.8 ? 'A' : r >= 0.6 ? 'B' : r >= 0.4 ? 'C' : 'D';
    const order = 'DCBAS';
    if (cap === 'B' && order.indexOf(L) > order.indexOf('B')) L = 'B';
    if (diff === 'attending' && L === 'S' && !slips) return 'S+';
    return L;
  }

  function takeCore(S) {
    return {
      rng: S.rng, clock: S.clock, vitals: S.vitals, score: S.score, slips: S.slips,
      phase: S.phase, steady: S.steady, flow: S.flow, streak: S.streak,
      phaseT: S.phaseT, worldT: S.worldT, flags: clone(S.flags),
      objects: clone(S.objects), strain: S.strain ? clone(S.strain) : null,
      device: S.device ? clone(S.device) : null,
      techGood: S.techGood, techAll: S.techAll, bestFlow: S.bestFlow,
      codeBlueUsed: S.codeBlueUsed, tutDone: S.tutDone, tutorial: S.tutorial,
      windowOpen: S.windowOpen, tiltAmp: S.tiltAmp, dim: S.dim,
    };
  }

  function applyCore(S, core) {
    S.rng = core.rng; S.clock = core.clock; S.vitals = core.vitals; S.score = core.score;
    S.slips = core.slips; S.phase = core.phase; S.steady = core.steady; S.flow = core.flow;
    S.streak = core.streak; S.phaseT = core.phaseT; S.worldT = core.worldT;
    S.flags = clone(core.flags); S.objects = clone(core.objects);
    S.strain = core.strain ? clone(core.strain) : null;
    S.device = core.device ? clone(core.device) : null;
    S.techGood = core.techGood; S.techAll = core.techAll; S.bestFlow = core.bestFlow;
    S.codeBlueUsed = core.codeBlueUsed; S.tutDone = core.tutDone; S.tutorial = core.tutorial;
    S.windowOpen = core.windowOpen; S.tiltAmp = core.tiltAmp; S.dim = core.dim;
  }

  function hashCore(core) {
    const s = JSON.stringify(core);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function pushRing(S) {
    const cursors = S.players.map(p => [round3(p.x), round3(p.y)]);
    const strains = strainGhost(S);
    S.ring.push({ t: S.worldT, core: takeCore(S), cursors, strains });
    const keep = S.worldT - 6.05;
    while (S.ring.length > 2 && S.ring[0].t < keep) S.ring.shift();
  }
  function round3(v) { return Math.round(v * 1000) / 1000; }

  function strainGhost(S) {
    const st = S.strain;
    if (!st) return [];
    if (st.kind === 'legato') return (st.worms || []).map(w => [round3(w.x), round3(w.y)]);
    if (st.kind === 'staccato') return (st.beads || []).map(b => [round3(b.x), round3(b.y)]);
    if (st.kind === 'fermata' || st.kind === 'cantor') return st.eye ? [[round3(st.eye.x), round3(st.eye.y)]] : [];
    if (st.kind === 'tremolo') return [[round3(st.x || 213), round3(st.y || 116)]];
    if (st.kind === 'dacapo') return (st.lobes || []).map(L => [round3(L.x), round3(L.y)]);
    return [];
  }

  function restoreCore(S, core, keepHands) {
    const hands = S.players.map(p => ({ id: p.id, x: p.x, y: p.y, bx: p.bx, by: p.by, color: p.color }));
    applyCore(S, core);
    for (let i = 0; i < S.players.length; i++) {
      const p = S.players[i];
      p.held = 0; p.stroke = null; p.fill = 0; p.over = 0; p.trig = 0; p.prevTrig = 0;
      if (keepHands && hands[i]) {
        p.x = hands[i].x; p.y = hands[i].y; p.bx = hands[i].bx; p.by = hands[i].by;
      }
    }
  }

  function secondLook(S, tune) {
    if (S.mode === 'rounds') return false;
    if (S.gift !== 'look' && S.gift !== 'both' && S.activeDoc !== 'sokolova' && S.gift !== 'look') {
      if (!(S.gift === 'both' || S.activeDoc === 'sokolova' || S.gift === 'look')) return false;
    }
    const can = S.gift === 'look' || S.gift === 'both' || S.activeDoc === 'sokolova';
    if (!can) return false;
    if (S.steady < 45) return false;
    if (!S.ring.length) return false;
    const target = S.worldT - (tune.gift.lookSeconds || 6);
    let pick = S.ring[0];
    for (let i = 0; i < S.ring.length; i++) if (S.ring[i].t <= target) pick = S.ring[i];
    const ghosts = [];
    for (let i = 0; i < S.ring.length; i++) {
      if (S.ring[i].t + 1e-6 < pick.t) continue;
      ghosts.push({ t: S.ring[i].t - pick.t, cursors: S.ring[i].cursors, strains: S.ring[i].strains });
    }
    restoreCore(S, pick.core, true);
    S.steady = Math.max(0, S.steady - 45);
    S.ghosts = ghosts;
    S.ghostT = tune.gift.lookSeconds || 6;
    S.breath = false;
    S.worldScale = 1;
    pushEv(S, ['rewind', ghosts.length]);
    return true;
  }

  function forceRewind(S, keepSteady) {
    const steady = S.steady;
    const breath = S.breath;
    if (!S.ring.length) return false;
    const target = S.worldT - 6;
    let pick = S.ring[0];
    for (let i = 0; i < S.ring.length; i++) if (S.ring[i].t <= target) pick = S.ring[i];
    restoreCore(S, pick.core, true);
    if (keepSteady) S.steady = steady;
    S.breath = breath;
    S.worldScale = breath ? 0.25 : 1;
    pushEv(S, ['forced', 1]);
    return true;
  }

  /* ---------- tools ---------- */

  function polyDist(pts, x, y) {
    let best = 1e9, arcAt = 0, along = 0, total = 0;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    total = acc[acc.length - 1] || 1;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
      const vx = bx - ax, vy = by - ay, L = hypot(vx, vy) || 1;
      let t = ((x - ax) * vx + (y - ay) * vy) / (L * L);
      t = clamp(t, 0, 1);
      const px = ax + vx * t, py = ay + vy * t;
      const d = hypot(x - px, y - py);
      if (d < best) { best = d; along = acc[i - 1] + t * L; }
    }
    return { d: best, along, total, tan: tangent(pts, along) };
  }
  function tangent(pts, along) {
    let left = along;
    for (let i = 1; i < pts.length; i++) {
      const L = hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) || 1;
      if (left <= L || i === pts.length - 1) {
        return [(pts[i][0] - pts[i - 1][0]) / L, (pts[i][1] - pts[i - 1][1]) / L];
      }
      left -= L;
    }
    return [1, 0];
  }

  function nerveHit(S, p, tune) {
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (o.type !== 'nerve' && o.type !== 'eloquent') continue;
      const pts = o.guide || [[o.x - 20, o.y], [o.x + 20, o.y]];
      if (polyDist(pts, p.x, p.y).d < 6) { slip(S, p, 'nerve', 12, tune); return true; }
    }
    return false;
  }

  function gradeMean(mean, a, b) {
    if (mean <= a) return 'textbook';
    if (mean <= b) return 'clean';
    return 'sloppy';
  }

  function stepForceps(S, p, dt, tune) {
    const down = p.trig > 0.3;
    let held = p.held ? objById(S, p.held) : null;
    if (p.trigEdge && !held) {
      const o = nearest(S, p, 12, o => canTouch(S, o) && (o.type === 'shard' || o.type === 'fragment' || o.type === 'cork' || o.type === 'hook' || o.type === 'gaff' || o.type === 'clot' || o.type === 'mass' || o.type === 'nest' || o.type === 'note' || o.type === 'retractor' || o.type === 'screw' || (o.type === 'lobe' && o.mode === 'forceps')));
      if (o && o.type === 'clot' && !o.dosed) { /* no grip yet */ }
      else if (o && (o.type === 'hook' || o.type === 'gaff') && o.barbs) { slip(S, p, 'tear', 4, tune); o.tears = (o.tears || 0) + 1; }
      else if (o && o.type === 'mass' && !o.cut) { /* ring first */ }
      else if (o && o.type === 'nest' && !o.cut) { /* slash first */ }
      else if (o && o.type === 'screw') { p.held = o.id; o.lastAng = Math.atan2(p.y - o.y, p.x - o.x); o.spin = o.spin || 0; }
      else if (o && o.type === 'retractor') { p.held = o.id; }
      else if (o) {
        p.held = o.id; o.t0 = o.t0 || 0; o.pullT = o.pullT || 0; o.gripped = true;
        if (!o.origin) o.origin = [o.x, o.y];
        pushEv(S, ['grip', o.id]);
      }
    }
    held = p.held ? objById(S, p.held) : null;
    if (held && down) {
      if (held.type === 'retractor') {
        held.x = p.x; held.y = p.y;
        S.windowOpen = 1;
        return;
      }
      if (held.type === 'screw') {
        const ang = Math.atan2(p.y - held.y, p.x - held.x);
        let d = ang - (held.lastAng || ang);
        while (d > Math.PI) d -= TAU;
        while (d < -Math.PI) d += TAU;
        held.spin = (held.spin || 0) + Math.abs(d);
        held.lastAng = ang;
        if (held.spin >= 3 * TAU) {
          held.done = true; held.alive = false; p.held = 0;
          award(S, p, 'textbook', 100, tune);
          pushEv(S, ['screw', held.id]);
        }
        return;
      }
      const ox = held.origin[0], oy = held.origin[1];
      const dx = p.x - ox, dy = p.y - oy;
      const along = dx * held.axis[0] + dy * held.axis[1];
      const px = dx - along * held.axis[0], py = dy - along * held.axis[1];
      const perp = hypot(px, py);
      const limit = held.tension || 120;
      if (held.tearCd > 0) held.tearCd -= dt;
      if (!held.free) {
        if ((p.inst > limit || perp > 8) && (held.tearCd || 0) <= 0) {
          held.tearCd = 0.28;
          if (held.type === 'note' || held.tag === 'legato-head' || (S.strain && S.strain.kind === 'legato' && held.tag === 'legato-head')) {
            held.snapped = true;
            slip(S, p, 'snap', 4, tune);
            pushEv(S, ['snap', held.id]);
          } else {
            held.tears = (held.tears || 0) + 1;
            held.prog = Math.max(0, (held.prog || 0) - held.depth * 0.3);
            slip(S, p, 'tear', 4, tune);
            addObj(S, { type: 'laceration', x: p.x, y: p.y, r: 6, order: 90, drain: 0.15, tag: 'tear' });
            pushEv(S, ['tear', held.id]);
          }
        }
        held.prog = Math.max(held.prog || 0, along);
        held.pullT = (held.pullT || 0) + dt;
        if (along >= held.depth) {
          held.free = true;
          pushEv(S, ['free', held.id]);
        }
      } else {
        held.x = p.x; held.y = p.y;
        held.pullT = (held.pullT || 0) + dt;
      }
    }
    if (held && p.trigRelease) {
      if (held.type === 'retractor') { p.held = 0; return; }
      if (held.type === 'screw') { p.held = 0; return; }
      const d0 = hypot(p.x - held.origin[0], p.y - held.origin[1]);
      if (held.holdZone && hypot(p.x - held.holdZone[0], p.y - held.holdZone[1]) <= (held.holdZone[2] || 14)) {
        held.clamped = true; held.gripped = false; p.held = 0;
        pushEv(S, ['clamp', held.id]);
        return;
      }
      if (held.free && (d0 >= 24 || outside(p.x, p.y))) {
        const tears = held.tears || 0;
        const parT = held.parTime || (held.depth / 80 + 0.35);
        let g = 'sloppy';
        if (!tears && (held.pullT || 0) <= parT) g = 'textbook';
        else if (tears <= 1) g = 'clean';
        held.done = true; held.alive = false; held.grade = g; p.held = 0;
        if (held.type === 'note') p.score += 0;
        award(S, p, g, 120, tune);
        pushEv(S, ['dish', held.id, g]);
      } else {
        held.gripped = false;
        p.held = 0;
      }
    }
  }

  function outside(x, y) {
    const nx = (x - CFG.CX) / CFG.RX, ny = (y - CFG.CY) / CFG.RY;
    return nx * nx + ny * ny > 1;
  }

  function stepScalpel(S, p, dt, tune) {
    const down = p.trig > 0.3;
    const tol = tune.hands.grade;
    if (p.stroke && p.stroke.kind === 'scalpel') {
      const o = objById(S, p.stroke.id);
      if (!o || o.done) { p.stroke = null; }
    }
    if (p.trigEdge && !p.stroke) {
      /* Press within 8 u of the guide start, not the object's center. A long cut's start sits far from x,y. */
      const reach = 8 + (p.mouse ? 1 : 0);
      let o = null, bd = reach;
      for (let i = 0; i < S.objects.length; i++) {
        const q = S.objects[i];
        if (!canTouch(S, q) || !q.guide) continue;
        if (!(q.type === 'mass' || q.type === 'slur' || q.type === 'tendril' || q.type === 'spiral' || q.type === 'wire' || q.type === 'repeat' || q.type === 'lobe' || q.type === 'cut' || q.type === 'nest')) continue;
        const start = q.guide[0];
        const d = hypot(p.x - start[0], p.y - start[1]);
        if (d <= bd) { bd = d; o = q; }
      }
      if (o) {
        p.stroke = { kind: 'scalpel', id: o.id, far: 0, sum: 0, n: 0, off: 0, slipped: false };
        o.cutting = true;
      }
    }
    if (!(p.stroke && p.stroke.kind === 'scalpel') && down && p.inst > 40) {
      const onGuide = S.objects.some(o => o.guide && !o.done && polyDist(o.guide, p.x, p.y).d < 8);
      if (!onGuide && !outside(p.x, p.y)) {
        p.bare = (p.bare || 0) + hypot(p.x - (p.ox || p.x), p.y - (p.oy || p.y));
        if (p.bare >= 6) { slip(S, p, 'healthy', 3, tune); p.bare = 0; }
      }
    }
    if (p.stroke && p.stroke.kind === 'scalpel' && down) {
      const o = objById(S, p.stroke.id);
      if (o && nerveHit(S, p, tune)) { /* counted */ }
      if (o && o.guide) {
        const hit = polyDist(o.guide, p.x, p.y);
        const st = p.stroke;
        if (hit.along > st.far) st.far = hit.along;
        /* A closed ring's last point is the start, so the vertex reads as along 0. Arriving back after most of the loop finishes it. */
        const g0 = o.guide[0], gN = o.guide[o.guide.length - 1];
        if (o.guide.length > 2 && hypot(g0[0] - gN[0], g0[1] - gN[1]) < 1.5 && st.far > hit.total * 0.72 && hypot(p.x - g0[0], p.y - g0[1]) <= 3) st.far = hit.total;
        st.sum += hit.d; st.n += 1;
        if (hit.d > 9) st.off += dt; else st.off = 0;
        if (st.off >= 0.12 && !st.slipped) {
          st.slipped = true; slip(S, p, 'slip', 3, tune);
          pushEv(S, ['slipcut', o.id]);
        }
        o.prog = st.far / (hit.total || 1);
        if (o.type === 'spiral' && o.beatLock && S.flags.onBeat) {
          if (!st.beatSlip) { st.beatSlip = true; slip(S, p, 'beat', 3, tune); }
          o.prog = Math.min(o.prog, st.safe || 0);
        } else if (o.type === 'spiral') st.safe = o.prog;
        if (st.far >= (hit.total || 1) - 0.5) {
          const mean = st.n ? st.sum / st.n : 99;
          const g = st.slipped ? 'sloppy' : gradeMean(mean, 1.8 * tol, 4 * tol);
          o.done = true; o.alive = false; o.grade = g; o.cut = true;
          if (o.type === 'mass') { o.done = false; o.alive = true; o.cut = true; o.type = 'mass'; }
          if (o.type === 'nest' || (o.type === 'lobe' && o.slash)) {
            o.done = false; o.alive = true; o.cut = true;
            if (o.type === 'lobe') o.mode = 'forceps';
          }
          if (o.type === 'wire') { /* caller checks order */ wireCut(S, p, o, tune); }
          else award(S, p, g, 110, tune);
          p.stroke = null;
          pushEv(S, ['cut', o.id, g]);
        }
      }
    }
    if (p.trigRelease && p.stroke && p.stroke.kind === 'scalpel') {
      const o = objById(S, p.stroke.id);
      if (o && o.prog < 0.98) {
        /* resume later if they come back within 6 */
        p.stroke.paused = true;
      }
    }
    if (p.trigEdge && p.stroke && p.stroke.paused) {
      const o = objById(S, p.stroke.id);
      if (o && o.guide) {
        const hit = polyDist(o.guide, p.x, p.y);
        if (Math.abs(hit.along - p.stroke.far) <= 6 || hit.d <= 6) p.stroke.paused = false;
        else p.stroke = null;
      }
    }
    /* slash variant: a fast stroke across a slash target */
    if (down && p.inst >= 60) {
      const o = nearest(S, p, 10, q => canTouch(S, q) && q.slash && !q.done && !q.cut);
      if (o) {
        o.cut = true;
        if (o.type === 'nest' || o.type === 'lobe') {
          if (o.type === 'lobe') o.mode = 'forceps';
          award(S, p, 'clean', 100, tune);
        } else {
          o.done = true; o.alive = false;
          award(S, p, 'clean', 100, tune);
        }
        pushEv(S, ['slash', o.id]);
      }
    }
  }

  function wireCut(S, p, o, tune) {
    const dev = S.device;
    if (!dev) { o.done = true; award(S, p, 'clean', 80, tune); return; }
    const want = dev.order[dev.next];
    if (o.tag === want) {
      dev.next += 1; o.done = true; o.alive = false;
      award(S, p, 'textbook', 100, tune);
      if (dev.next >= dev.order.length) dev.done = true;
    } else {
      o.done = false; o.alive = true; o.prog = 0; o.cutting = false;
      S.vitals -= 30; S.clock = Math.max(0, S.clock - 30);
      slip(S, p, 'wire', 0, tune);
      pushEv(S, ['badwire', o.tag]);
    }
  }

  function stepSuture(S, p, dt, tune) {
    const down = p.trig > 0.3;
    const extra = (S.activeDoc === 'sokolova' ? 1 : 0);
    if (p.trigEdge) {
      /* Press within 9 u of the next near point. Stitches sit off the wound center. */
      const reach = 9 + extra + (p.mouse ? 1 : 0);
      let o = null, bd = reach;
      for (let i = 0; i < S.objects.length; i++) {
        const q = S.objects[i];
        if (!canTouch(S, q) || !q.pairs || (q.stitch || 0) >= q.pairs.length) continue;
        const a = q.pairs[q.stitch][0];
        const d = hypot(p.x - a[0], p.y - a[1]);
        if (d <= bd) { bd = d; o = q; }
      }
      if (o) {
        p.stroke = { kind: 'suture', id: o.id, i: o.stitch, t: 0 };
        pushEv(S, ['needle', o.id, o.stitch]);
      }
    }
    if (p.stroke && p.stroke.kind === 'suture' && down) p.stroke.t += dt;
    if (p.stroke && p.stroke.kind === 'suture' && p.trigRelease) {
      const o = objById(S, p.stroke.id);
      const st = p.stroke;
      p.stroke = null;
      if (!o || o.done) return;
      const b = o.pairs[st.i][1];
      const tol = 6 + extra + (p.mouse ? 1 : 0);
      if (hypot(p.x - b[0], p.y - b[1]) <= tol) {
        const g = gradeMean(st.t, 0.6, 1.2);
        o.grades = o.grades || [];
        o.grades.push(g === 'textbook' ? 2 : g === 'clean' ? 1 : 0);
        o.times = o.times || [];
        o.times.push(st.t);
        o.stitch = st.i + 1;
        o.prog = o.stitch / o.pairs.length;
        p.stitches += 1;
        const bleedLeft = 1 - o.prog;
        if (o.type === 'arteryTear') o.drain = 1 * bleedLeft;
        else if (o.type === 'wound') o.drain = 0.4 * bleedLeft;
        pushEv(S, ['stitch', Math.round(b[0]), Math.round(b[1]), g]);
        if (o.stitch >= o.pairs.length) {
          const meanT = o.times.reduce((a, c) => a + c, 0) / o.times.length;
          const fg = gradeMean(meanT, 0.6, 1.2);
          o.done = true; o.alive = false; o.grade = fg; o.drain = 0;
          award(S, p, fg, 80 + 20 * o.pairs.length, tune);
        }
      } else {
        slip(S, p, 'loose', 1, tune);
        pushEv(S, ['loose', o.id]);
      }
    }
  }

  function stepSalve(S, p, dt, tune) {
    if (p.trig <= 0.3) return;
    let any = false;
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (!canTouch(S, o) || !o.cells) continue;
      if (!(o.type === 'laceration' || o.type === 'patch' || o.type === 'bite' || (o.type === 'lobe' && o.mode === 'salve'))) continue;
      for (let c = 0; c < o.cells.length; c++) {
        const cell = o.cells[c];
        if (!cell[2] && hypot(cell[0] - p.x, cell[1] - p.y) <= 10) { cell[2] = 1; any = true; }
      }
      let on = 0;
      for (let c = 0; c < o.cells.length; c++) if (o.cells[c][2]) on++;
      o.prog = o.cells.length ? on / o.cells.length : 1;
      if (o.prog >= 0.9 && !o.done) {
        o.done = true; o.alive = false; o.drain = 0;
        S.vitals = Math.min(99, S.vitals + 2 * tune.patient.healing);
        award(S, p, 'clean', 80, tune);
        pushEv(S, ['heal', o.id]);
      }
    }
    if (!any && p.trigEdge) { /* salve cannot harm */ }
  }

  function stepSyringe(S, p, dt, tune) {
    if (p.cool > 0) p.cool -= dt;
    const down = p.trig > 0.3;
    if (down && p.cool <= 0) {
      if (p.fill < 1) p.fill = Math.min(1, p.fill + dt / 0.55);
      else p.over += dt;
    }
    if (p.trigRelease && p.fill > 0.05 && p.cool <= 0) {
      const bubble = p.over >= 0.3;
      /* A closed reed or voice is still a target: the needle finds it and the tissue splits. */
      const tgt = nearest(S, p, 10, o => {
        if (!o || o.done || !o.alive || covered(S, o)) return false;
        if (o.type === 'reed' || o.type === 'voice') return true;
        return canTouch(S, o) && (o.type === 'clot' || (o.type === 'lobe' && o.mode === 'syringe'));
      });
      if (tgt) {
        if ((tgt.type === 'reed' || tgt.type === 'voice') && !tgt.window) {
          addObj(S, { type: 'laceration', x: tgt.x + 6, y: tgt.y, r: 8, order: 50, drain: 0.2 });
          slip(S, p, 'spit', 2, tune);
        } else {
          const g = bubble ? 'sloppy' : (p.fill >= 0.9 ? 'textbook' : 'clean');
          tgt.dosed = true;
          tgt.dose = (bubble ? 0.5 : 1) * p.fill;
          if (tgt.follow === 'salve') {
            tgt.mode = 'salve';
            if (!tgt.cells) {
              const r = tgt.r || 8;
              tgt.cells = [];
              for (let y = -r; y <= r; y += 4) for (let x = -r; x <= r; x += 4) {
                if (x * x + y * y <= r * r) tgt.cells.push([tgt.x + x, tgt.y + y, 0]);
              }
            }
          } else if (tgt.type === 'clot') { tgt.drain = 0.1; }
          else { tgt.done = true; tgt.alive = false; tgt.drain = 0; }
          award(S, p, g, 90, tune);
          pushEv(S, ['inject', tgt.id, g]);
        }
      } else {
        const g = bubble ? 'sloppy' : (p.fill >= 0.9 ? 'textbook' : 'clean');
        const add = syringeDose(S, tune) * p.fill * (bubble ? 0.5 : 1);
        S.vitals = Math.min(99, S.vitals + add);
        award(S, p, g, 40, tune);
        S.flags.iv = (S.flags.iv || 0) + 1;
        pushEv(S, ['iv', Math.round(add), g]);
      }
      p.fill = 0; p.over = 0; p.cool = 0.35;
    }
    if (!down && p.trigRelease === false) { /* keep fill while aiming */ }
  }

  function stepCautery(S, p, dt, tune) {
    if (p.lock > 0) { p.lock -= dt; p.heat = Math.max(0, p.heat - 0.6 * dt); return; }
    const down = p.trig > 0.3;
    if (!down) {
      p.heat = Math.max(0, p.heat - 0.6 * dt);
      p.bareT = 0;
      return;
    }
    p.heat += tune.fluids.cauteryHeat * dt;
    if (p.heat >= 1) { p.lock = 1.2; p.heat = 1; slip(S, p, 'lock', 1, tune); pushEv(S, ['lock', p.id]); return; }
    if (nerveHit(S, p, tune)) return;
    const tgt = nearest(S, p, 6, o => canTouch(S, o) && (o.type === 'polyp' || o.type === 'bleeder' || o.type === 'rupture' || o.type === 'bead' || o.type === 'uvula' || o.type === 'eye' || o.type === 'tremass' || (o.type === 'lobe' && o.mode === 'cautery') || o.type === 'barb'));
    if (tgt) {
      p.bareT = 0;
      tgt.burn = (tgt.burn || 0) + dt;
      tgt.prog = tgt.burn / (tgt.need || 0.5);
      if (tgt.burn >= (tgt.need || 0.5) / Math.max(0.25, tune.strains.health) && !tgt.done) {
        const dirty = tgt.charred || p.lockedDuring;
        const g = (!tgt.charred && p.lock <= 0 && !p.hadLock) ? 'textbook' : 'clean';
        tgt.done = true; tgt.alive = false; tgt.drain = 0; tgt.grade = g;
        p.burned += 1;
        award(S, p, g, 90, tune);
        pushEv(S, ['burn', tgt.id, g]);
      }
    } else {
      p.bareT = (p.bareT || 0) + dt;
      if (p.bareT >= 0.25) {
        /* char on the field */
        p.charT = (p.charT || 0) + dt;
        S.vitals -= 0.8 * dt * tune.patient.slip;
        if (p.bareT >= 0.6 && !p.charSlip) { p.charSlip = true; slip(S, p, 'char', 2, tune); pushEv(S, ['char', Math.round(p.x), Math.round(p.y)]); }
      }
    }
  }

  function stepSuction(S, p, dt, tune) {
    if (p.trig <= 0.3) return;
    const pool = nearest(S, p, 14, o => o.type === 'pool' && !o.done && o.vol > 0);
    if (!pool) return;
    const rate = tune.fluids.suction;
    const before = pool.vol;
    pool.vol = Math.max(0, pool.vol - rate * dt);
    p.suctioned += before - pool.vol;
    pool.prog = 1 - pool.vol / (pool.max || 1);
    if (pool.vol <= 0.2) { pool.done = true; pool.alive = false; pool.vol = 0; pushEv(S, ['dry', pool.id]); }
  }

  function stepSonar(S, p, dt, tune) {
    if (p.trig <= 0.3) return;
    let rad = 38;
    if (S.activeDoc === 'vale' || S.gift === 'breath') rad *= 1.25;
    if (S.gift === 'both' && S.activeDoc === 'vale') rad *= 1.25;
    p.sonarR = rad;
    for (let i = 0; i < S.objects.length; i++) {
      const o = S.objects[i];
      if (!o.hidden || o.done) continue;
      if (hypot(o.x - p.x, o.y - p.y) <= rad) { o.marked = true; o.markT = 4; pushEv(S, ['mark', o.id]); }
    }
    if (S.device && !S.device.shown && hypot(p.x - (S.device.x || 213), p.y - (S.device.y || 116)) <= rad) {
      S.device.shown = true;
      for (const o of S.objects) if (o.needsBoard) { o.hidden = false; o.marked = true; o.markT = 6; }
      pushEv(S, ['board', 1]);
    }
    if (S.strain && S.strain.kind === 'legato') {
      for (const w of S.strain.worms || []) if (hypot(w.x - p.x, w.y - p.y) <= rad) w.marked = true;
    }
  }

  function applyTools(S, p, dt, tune) {
    if (p.gone) return;
    if (inDome(S, p.x, p.y)) return;
    if (p.swap > 0) p.swap -= dt;
    p.ox = p.x; p.oy = p.y;
    const tool = p.tool;
    if (tool === 'forceps') stepForceps(S, p, dt, tune);
    else if (tool === 'scalpel') stepScalpel(S, p, dt, tune);
    else if (tool === 'suture') stepSuture(S, p, dt, tune);
    else if (tool === 'salve') stepSalve(S, p, dt, tune);
    else if (tool === 'syringe') stepSyringe(S, p, dt, tune);
    else if (tool === 'cautery') stepCautery(S, p, dt, tune);
    else if (tool === 'suction') stepSuction(S, p, dt, tune);
    else if (tool === 'sonar') stepSonar(S, p, dt, tune);
    /* marks expire */
  }

  /* ---------- strains ---------- */

  /* Documented defaults are beat 0.5 and spawn 1. Both scales are 1 there, so a case clock does not move. */
  function strainBeat(tune) {
    const b = tune && tune.strains ? tune.strains.beat : 0.5;
    return b > 0 ? b : 0.5;
  }
  function strainSpawn(tune) {
    const s = tune && tune.strains ? tune.strains.spawn : 1;
    return s > 0 ? s : 1;
  }

  function stepStrain(S, worldDt, handDt, tune) {
    const st = S.strain;
    if (!st || st.done) return;
    const sp = tune.strains.speed;
    if (st.kind === 'staccato') stepStaccato(S, st, worldDt, tune, sp);
    else if (st.kind === 'legato') stepLegato(S, st, worldDt, handDt, tune, sp);
    else if (st.kind === 'tremolo') stepTremolo(S, st, worldDt, tune, sp);
    else if (st.kind === 'dacapo') stepDacapo(S, st, worldDt, tune, sp);
    else if (st.kind === 'fermata') stepFermata(S, st, worldDt, tune, sp);
    else if (st.kind === 'cantor') stepCantor(S, st, worldDt, tune, sp);
  }

  function stepStaccato(S, st, dt, tune, sp) {
    st.t += dt;
    const tempo = strainBeat(tune) / 0.5;
    for (const b of st.beads) {
      if (b.dead) continue;
      b.landIn -= dt * sp * tempo;
      if (!b.hopped && b.landIn < 0.5) b.hopped = true;
      if (b.landIn <= 0 && !b.landed) {
        b.landed = true; b.x = b.tx; b.y = b.ty;
        addObj(S, { type: 'laceration', x: b.x, y: b.y, r: 8, order: 40, drain: 0.2, tag: 'bite' });
        pushEv(S, ['bite', Math.round(b.x), Math.round(b.y)]);
      }
      if (!b.landed) {
        const u = clamp(1 - b.landIn / b.flight, 0, 1);
        b.x = b.x0 + (b.tx - b.x0) * u;
        b.y = b.y0 + (b.ty - b.y0) * u;
      }
    }
    /* cautery kills beads: mirrored onto objects of type bead */
    let nests = 0;
    for (const o of S.objects) if (o.type === 'nest' && !o.done && o.tag === st.tag) nests++;
    if (!nests && !st.collapse) { st.collapse = 3; }
    if (st.collapse > 0) {
      st.collapse -= dt;
      if (st.collapse <= 0) {
        for (const b of st.beads) b.dead = true;
        for (const o of S.objects) if (o.type === 'bead' && o.tag === st.tag) { o.done = true; o.alive = false; }
        st.done = true;
      }
    }
    syncBeads(S, st);
    if (st.beads.length && st.beads.every(b => b.dead) && nests === 0) st.done = true;
  }

  function syncBeads(S, st) {
    for (const b of st.beads) {
      if (b.dead) continue;
      let o = b.oid ? objById(S, b.oid) : null;
      if (!o) {
        o = addObj(S, { type: 'bead', x: b.x, y: b.y, need: 0.12, order: 5, tag: st.tag, drain: 0 });
        b.oid = o.id;
      } else {
        o.x = b.x; o.y = b.y;
        if (o.done) b.dead = true;
      }
    }
  }

  function stepLegato(S, st, dt, handDt, tune, sp) {
    for (const w of st.worms) {
      if (w.done) continue;
      w.t += dt * sp;
      /* head crawls along its path until surfaced */
      if (!w.surfaced && !w.out) {
        w.along = Math.min(w.pathLen, w.along + 18 * dt * sp);
        const p = pointAlong(w.path, w.along);
        w.x = p[0]; w.y = p[1];
        /* open a slur guide when the head nears it */
        for (const g of w.slurs) {
          if (g.opened || g.done) continue;
          if (hypot(w.x - g.x, w.y - g.y) < 28) {
            g.opened = true;
            const o = addObj(S, { type: 'slur', x: g.x, y: g.y, len: 18, order: 1, tag: 'slur-' + w.id + '-' + g.i, drain: 0, guide: [[g.x - 9, g.y], [g.x + 9, g.y]] });
            g.oid = o.id;
          }
        }
      }
      for (const g of w.slurs) {
        if (!g.oid || g.done) continue;
        const o = objById(S, g.oid);
        if (o && o.done) g.done = true;
      }
      const slursLeft = w.slurs.filter(g => !g.done).length;
      if (!slursLeft && !w.surfaced) {
        w.surfaced = true; w.marked = true;
        const head = addObj(S, {
          type: 'shard', x: w.x, y: w.y, axis: w.axis || [1, 0], depth: 18, order: 2,
          tag: 'legato-head', worm: w.id, tension: 70, drain: 0.15, hidden: false,
          holdZone: w.hold || null, barbs: w.barbAt || 0,
        });
        w.head = head.id;
      }
      const head = w.head ? objById(S, w.head) : null;
      if (head && head.snapped && !w.snapped) {
        w.snapped = true; st.snapped = true;
        /* regrow a head further along and flee */
        head.done = true; head.alive = false;
        w.surfaced = false; w.out = false; w.head = 0;
        w.along = Math.min(w.pathLen - 4, w.along + 30);
        w.slurs.push({ i: 90 + w.slurs.length, x: w.x + 16, y: w.y, opened: false, done: false });
        pushEv(S, ['regrow', w.id]);
      }
      if (head && head.done && !w.out) {
        w.pulled = (w.pulled || 0) + 1;
        /* barb every 4th segment: if not clamped, snapping already handled via tension */
        if (w.barbAt && w.pulled % 4 === 0 && !head.clamped && !w.barbCleared) {
          /* require a clamp before the next length counts — head.done means the whole pull finished.
             Barbs are separate cautery objects spawned at the hold. */
        }
        w.segments -= 4;
        if (w.segments <= w.half && !w.split && st.worms.length < 3) {
          w.split = true; w.half = -1;
          st.worms.push(makeWorm(S, w.x + 20, w.y + 14, Math.max(4, w.segments >> 1), w.id + 1));
          pushEv(S, ['split', w.id]);
        }
        if (w.segments <= 0) { w.done = true; w.out = true; }
        else {
          /* next length */
          w.out = false; w.surfaced = true;
          const h2 = addObj(S, {
            type: 'shard', x: w.x, y: w.y, axis: [1, 0], depth: 14, order: 2,
            tag: 'legato-head', worm: w.id, tension: 70, drain: 0.1,
            holdZone: w.barbAt && (w.pulled % 4 === 0) ? [w.x + 30, w.y, 16] : null,
          });
          w.head = h2.id;
          if (w.barbAt && w.pulled % 4 === 0) {
            addObj(S, { type: 'barb', x: w.x + 30, y: w.y, need: 0.35, order: 3, tag: 'barb-' + w.id, drain: 0 });
          }
        }
      }
    }
    if (st.worms.every(w => w.done)) st.done = true;
  }

  function makeWorm(S, x, y, segments, id) {
    const path = [];
    for (let i = 0; i < 8; i++) path.push([x + i * 14, y + Math.sin(i) * 8]);
    let pathLen = 0;
    for (let i = 1; i < path.length; i++) pathLen += hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    const slurs = [0.25, 0.5, 0.75].map((u, i) => {
      const p = pointAlong(path, pathLen * u);
      return { i, x: p[0], y: p[1], opened: false, done: false };
    });
    return { id, x, y, path, pathLen, along: 0, segments, half: segments / 2, slurs, surfaced: false, done: false, t: 0, split: false, pulled: 0, barbAt: 4, marked: false, axis: [1, 0] };
  }
  function pointAlong(path, dist) {
    let left = dist;
    for (let i = 1; i < path.length; i++) {
      const L = hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]) || 1;
      if (left <= L) {
        const u = left / L;
        return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u];
      }
      left -= L;
    }
    return path[path.length - 1].slice();
  }

  function stepTremolo(S, st, dt, tune) {
    st.t += dt;
    const period = 0.5 / strainBeat(tune);
    st.beat = (st.t % period) / period;
    const peak = st.beat > 0.7;
    st.flare = peak;
    S.flags.onBeat = st.beat > 0.45 && st.beat < 0.7 ? false : st.beat < 0.15;
    /* vitals shake and drain */
    if (!S.breath) S.vitals -= 0.6 * st.amp * dt * tune.strains.damage;
    for (const o of S.objects) if (o.type === 'reed' && o.tag === 'reed') o.window = !!st.flare;
    const reeds = S.objects.filter(o => o.type === 'reed' && !o.done);
    if (st.stage === 1 && reeds.length === 0) { st.stage = 2; st.amp = Math.min(st.amp, 0.2); }
    if (st.amp <= 0.2 && st.stage === 1) st.stage = 2;
    if (st.stage === 2) {
      st.wake -= dt;
      if (st.wake <= 0) {
        st.wake = 6 / strainSpawn(tune);
        /* a reed returns */
        if (S.objects.filter(o => o.type === 'reed' && !o.done).length < 2) {
          addObj(S, { type: 'reed', x: st.x - 20 + rnd(S) * 40, y: st.y - 10, order: 1, tag: 'reed', drain: 0, window: false });
        }
      }
      const mass = S.objects.find(o => o.type === 'tremass');
      if (mass && mass.done && st.stage === 2) {
        st.stage = 3;
        addObj(S, { type: 'shard', x: st.x, y: st.y, axis: [1, 0], depth: 40, order: 4, tag: 'tremolo-pull', tension: 90, drain: 0.2 });
      }
    }
    if (st.stage === 3) {
      const pull = S.objects.find(o => o.tag === 'tremolo-pull');
      if (pull && pull.done) {
        st.done = true;
        for (const o of S.objects) if (o.type === 'reed' && !o.done) { o.done = true; o.alive = false; }
      }
    }
    /* amp falls when a reed is dosed */
    const deadReeds = st.reed0 - S.objects.filter(o => o.type === 'reed' && !o.done).length;
    st.amp = clamp(1 - deadReeds * 0.2, 0.15, 1);
    if (st.stage >= 2) st.amp = Math.min(st.amp, 0.2);
  }

  function stepDacapo(S, st, dt, tune, sp) {
    st.t += dt * sp;
    let anyDead = false;
    for (const L of st.lobes) {
      if (L.dead) { anyDead = true; continue; }
      const period = L.period / (st.round === 2 ? 2 : 1);
      const openFor = L.openFor / (st.round === 2 ? 2 : 1);
      const u = st.t % period;
      L.open = u < openFor;
      const o = objById(S, L.oid);
      if (o) { o.open = L.open && !L.dead; o.x = L.x; o.y = L.y; if (o.done && !L.dead) { L.dead = true; anyDead = true; if (st.count < 0) st.count = 10; } }
    }
    if (st.count >= 0) {
      st.count -= dt;
      if (st.count <= 0 && st.lobes.some(L => L.dead) && st.lobes.some(L => !L.dead)) {
        /* from the top */
        for (const L of st.lobes) {
          L.dead = false;
          const o = objById(S, L.oid);
          if (o) { o.done = false; o.alive = true; o.prog = 0; o.burn = 0; o.dosed = false; o.open = false; if (o.cells) for (const c of o.cells) c[2] = 0; }
        }
        S.vitals -= 8;
        st.count = -1;
        st.repeated = (st.repeated || 0) + 1;
        if (st.round === 1) { st.round = 2; st.t = 0; spawnBeadsN(S, st, 4, tune); }
        pushEv(S, ['dacapo', st.repeated]);
      } else if (st.count <= 0) st.count = -1;
    }
    if (st.lobes.every(L => L.dead) && st.count < 0) {
      if (st.round === 1) {
        st.round = 2; st.t = 0; st.count = -1;
        for (const L of st.lobes) {
          L.dead = false;
          const o = objById(S, L.oid);
          if (o) { o.done = false; o.alive = true; o.prog = 0; o.burn = 0; o.dosed = false; if (o.cells) for (const c of o.cells) c[2] = 0; }
        }
        spawnBeadsN(S, st, 4, tune);
        pushEv(S, ['round2', 1]);
      } else if (S.objects.every(o => o.type !== 'bead' || o.done)) st.done = true;
    }
    if (st.round === 2 && st.lobes.every(L => L.dead) && S.objects.every(o => o.type !== 'bead' || o.done || o.tag !== 'dacapo-bead')) st.done = true;
  }

  function spawnBeadsN(S, st, n, tune) {
    st.beads = st.beads || [];
    const count = Math.max(1, Math.round(n * strainSpawn(tuneOf(tune))));
    for (let i = 0; i < count; i++) {
      const b = { x: 180 + i * 16, y: 100, tx: 190 + i * 14, ty: 130, x0: 180 + i * 16, y0: 100, landIn: 0.8, flight: 0.8, dead: false, landed: false, hopped: false };
      st.beads.push(b);
      const o = addObj(S, { type: 'bead', x: b.x, y: b.y, need: 0.12, order: 6, tag: 'dacapo-bead', drain: 0 });
      b.oid = o.id;
    }
    if (!st.kindBead) st.kindBead = true;
  }

  function stepFermata(S, st, dt, tune) {
    st.t += dt;
    for (const d of st.domes) if (d.t > 0) d.t -= dt;
    st.domes = st.domes.filter(d => d.t > 0);
    if (st.stage === 1 && st.domes.length === 0 && !(st.eyeOpen > 0)) {
      st.eyeOpen = S.breath ? 2.8 : 0.7;
      st.eye.open = true;
      const o = objById(S, st.eye.oid);
      if (o) o.open = true;
    }
    if (st.eyeOpen > 0) {
      st.eyeOpen -= dt;
      if (st.eyeOpen <= 0) {
        st.eye.open = false;
        const o = objById(S, st.eye.oid);
        if (o && !o.done) o.open = false;
        if (st.hits < 3 && st.stage === 1) {
          /* raise another dome */
          if (st.domes.length < 3) st.domes.push({ x: st.eye.x, y: st.eye.y, r: 34, t: 5 });
        }
      }
    }
    const eye = objById(S, st.eye.oid);
    if (eye && eye.done) { st.hits += 1; eye.done = false; eye.alive = true; eye.burn = 0; eye.prog = 0; eye.open = false; st.eye.open = false; }
    if (st.hits >= 3 && st.stage === 1) {
      st.stage = 2;
      st.eye.x = 250; st.eye.y = 90; st.eye.hidden = true;
      if (eye) { eye.x = 250; eye.y = 90; eye.hidden = true; eye.marked = false; eye.done = false; eye.alive = true; }
      addObj(S, { type: 'shard', x: 160, y: 140, axis: [1, 0], depth: 12, order: 3, tag: 'sliver-a', drain: 0.1, hidden: true });
      addObj(S, { type: 'shard', x: 180, y: 150, axis: [0.6, 0.8], depth: 12, order: 3, tag: 'sliver-b', drain: 0.1, hidden: true });
    }
    if (st.stage === 2 && eye && eye.marked && st.hits < 4) { eye.hidden = false; eye.open = true; }
    if (st.stage >= 2 && eye && st.hits >= 4) { eye.open = false; eye.drain = 0; }
    if (st.stage === 2) {
      const slivers = S.objects.filter(o => o.tag === 'sliver-a' || o.tag === 'sliver-b');
      if (st.hits >= 4 && slivers.length && slivers.every(o => o.done)) {
        st.stage = 3;
        addObj(S, { type: 'note', x: st.eye.x, y: st.eye.y, axis: [0, -1], depth: 28, tension: 40, order: 5, tag: 'fermata-pull', drain: 0.15 });
      }
    }
    if (st.stage === 3) {
      const pull = S.objects.find(o => o.tag === 'fermata-pull');
      if (pull && pull.done) {
        st.done = true;
        if (eye) { eye.done = true; eye.alive = false; eye.open = false; eye.drain = 0; }
      }
    }
  }

  function stepCantor(S, st, dt, tune) {
    st.t += dt;
    if (st.move === 1) {
      /* tendrils then uvulas, objects already spawned by the phase */
      const left = S.objects.filter(o => (o.tag === 'tendril' || o.tag === 'uvula') && !o.done);
      if (!left.length) { st.move = 2; st.t = 0; S.clock += 120; S.flags.hush = true; pushEv(S, ['movement', 2]); spawnVoice(S, st); }
    } else if (st.move === 2) {
      S.flags.hush = true;
      const period = 0.5 / strainBeat(tune);
      st.beat = (st.t % period) / period;
      for (const o of S.objects) if (o.type === 'voice') o.window = st.beat > 0.62;
      if (st.domes) {
        for (const d of st.domes) d.t -= dt;
        st.domes = st.domes.filter(d => d.t > 0);
      }
      st.jitter = true;
      const voices = S.objects.filter(o => o.type === 'voice' && !o.done);
      if (!voices.length) { st.move = 3; st.t = 0; S.clock += 120; S.flags.hush = false; st.signs = 0; pushEv(S, ['movement', 3]); }
    } else if (st.move === 3) {
      st.cycleT = (st.cycleT || 0) + dt;
      if (!st.winding && st.cycleT >= 20) { st.winding = 3; st.cycleT = 0; openRepeat(S, st); }
      if (st.winding > 0) {
        st.winding -= dt;
        if (st.winding <= 0) {
          const sign = S.objects.find(o => o.tag === 'repeat');
          if (sign && !sign.done) {
            forceRewind(S, true);
            const now = S.strain;
            if (now) now.rewound = (now.rewound || 0) + 1;
          } else if (sign && sign.done) {
            st.signs = (st.signs || 0) + 1;
            sign.tag = 'repeat-spent';
          }
          st.winding = 0;
          closeRepeat(S);
        }
      }
      if ((st.signs || 0) >= 6 && S.strain === st) { st.move = 4; st.t = 0; S.clock += 120; pushEv(S, ['movement', 4]); spawnCoda(S, st); }
    } else if (st.move === 4) {
      const period = 0.8 * (0.5 / strainBeat(tune));
      st.beat = (st.t % period) / period;
      S.flags.onBeat = st.beat < 0.25;
      const spiral = S.objects.find(o => o.type === 'spiral' && o.tag === 'last-note');
      const note = S.objects.find(o => o.tag === 'the-note');
      const wound = S.objects.find(o => o.tag === 'final-wound');
      if (spiral && spiral.done && !st.noteOut) {
        st.noteOut = true;
        addObj(S, { type: 'note', x: 213, y: 116, axis: [0, -1], depth: 36, tension: 80, order: 2, tag: 'the-note', drain: 0 });
      }
      if (note && note.done && !wound) {
        addObj(S, { type: 'wound', x: 213, y: 130, stitches: 6, order: 3, tag: 'final-wound', drain: 0.3 });
      }
      if (wound && wound.done) st.done = true;
    }
  }

  function openRepeat(S, st) {
    const existing = S.objects.find(o => o.tag === 'repeat');
    if (existing) { existing.done = false; existing.alive = true; existing.open = true; existing.prog = 0; return existing; }
    return addObj(S, { type: 'repeat', x: 213, y: 100, len: 36, order: 1, tag: 'repeat', open: true, drain: 0, guide: [[190, 100], [236, 100]] });
  }
  function closeRepeat(S) {
    for (const o of S.objects) if (o.tag === 'repeat' && !o.done) { o.open = false; }
  }
  function spawnVoice(S, st) {
    st.domes = [{ x: 90, y: 70, r: 28, t: 4 }, { x: 330, y: 70, r: 28, t: 5 }];
    for (let i = 0; i < 3; i++) addObj(S, { type: 'voice', x: 170 + i * 36, y: 150, hidden: true, order: 1, tag: 'voice', drain: 0.15, window: false });
    st.jitter = true; st.amp = 0.45;
  }
  function spawnCoda(S, st) {
    const guide = [];
    for (let i = 0; i <= 16; i++) {
      const a = i / 16 * Math.PI * 1.6;
      guide.push([213 + Math.cos(a) * (20 + i * 3), 116 + Math.sin(a) * (12 + i * 2)]);
    }
    addObj(S, { type: 'spiral', x: 213, y: 116, guide, order: 1, tag: 'last-note', beatLock: true, drain: 0, ring: false });
  }

  function spawnStrain(S, kind, opts) {
    opts = opts || {};
    if (kind === 'staccato') {
      const st = { kind, tag: opts.tag || 'stacc', t: 0, beads: [], done: false, collapse: 0 };
      const spawn = strainSpawn(tuneOf(null));
      const n = Math.max(1, Math.round((opts.nests || 2) * spawn));
      for (let i = 0; i < n; i++) {
        addObj(S, { type: 'nest', x: opts.x || (180 + i * 40), y: opts.y || 120, hidden: true, order: 2, tag: st.tag, slash: true, drain: 0.15, r: 8 });
      }
      const beads = Math.max(1, Math.round((opts.beads || 4) * spawn));
      for (let i = 0; i < beads; i++) {
        st.beads.push({ x: 160 + i * 12, y: 90, x0: 160 + i * 12, y0: 90, tx: 170 + (i % 3) * 18, ty: 140, landIn: (opts.landIn || 1.1) + i * 0.2, flight: 0.7, dead: false, landed: false, hopped: false });
      }
      S.strain = st;
      return st;
    }
    if (kind === 'legato') {
      const seg = opts.segments || 8;
      const w = makeWorm(S, opts.x || 150, opts.y || 120, seg, 1);
      w.marked = false;
      const st = { kind, worms: [w], done: false, snapped: false };
      /* head starts hidden: a sonar target */
      addObj(S, { type: 'hold', x: w.x, y: w.y, hidden: true, order: 0, tag: 'legato-hide', drain: 0 });
      S.strain = st;
      return st;
    }
    if (kind === 'tremolo') {
      const st = { kind, t: 0, amp: 1, stage: 1, x: opts.x || 213, y: opts.y || 116, wake: 6 / strainSpawn(tuneOf(null)), reed0: 5, done: false, jitter: true, beat: 0, flare: false };
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * TAU / 5;
        addObj(S, { type: 'reed', x: st.x + Math.cos(a) * 28, y: st.y + Math.sin(a) * 18, order: 1, tag: 'reed', drain: 0, window: false });
      }
      addObj(S, { type: 'tremass', x: st.x, y: st.y, need: 3, order: 3, tag: 'tremass', drain: 0.3 });
      S.strain = st;
      return st;
    }
    if (kind === 'dacapo') {
      const lobes = [
        { id: 'A', mode: 'cautery', period: 6, openFor: 2.5, x: 180, y: 110 },
        { id: 'B', mode: 'slash', period: 7, openFor: 2.5, x: 213, y: 130 },
        { id: 'C', mode: 'syringe', period: 9, openFor: 3, x: 246, y: 112 },
      ];
      const st = { kind, t: 0, round: 1, count: -1, lobes, done: false, repeated: 0 };
      for (const L of lobes) {
        const spec = { type: 'lobe', x: L.x, y: L.y, mode: L.mode === 'slash' ? 'scalpel' : L.mode, order: 1, tag: 'lobe-' + L.id, open: false, drain: 0.15, need: L.mode === 'cautery' ? 1 : 0.5 };
        if (L.mode === 'slash') { spec.guide = [[L.x - 10, L.y], [L.x + 10, L.y]]; spec.mode = 'scalpel'; spec.slash = true; }
        if (L.mode === 'syringe') { spec.mode = 'syringe'; spec.follow = 'salve'; }
        const o = addObj(S, spec);
        L.oid = o.id; L.dead = false; L.open = false;
      }
      S.strain = st;
      return st;
    }
    if (kind === 'fermata') {
      const st = { kind, t: 0, stage: 1, hits: 0, eyeOpen: 0, done: false, jitter: false, amp: 0,
        domes: [{ x: 200, y: 116, r: 34, t: 5 }],
        eye: { x: 200, y: 116, open: false, hidden: false } };
      const o = addObj(S, { type: 'eye', x: 200, y: 116, need: 0.3, order: 1, tag: 'eye', open: false, drain: 0.2 });
      st.eye.oid = o.id;
      addObj(S, { type: 'eloquent', x: 150, y: 100, guide: [[140, 90], [180, 110]], order: 0, drain: 0, tag: 'eloq' });
      S.strain = st;
      return st;
    }
    if (kind === 'cantor') {
      const st = { kind, t: 0, move: 1, done: false, signs: 0, jitter: false, amp: 0.4, domes: [] };
      for (let i = 0; i < 3; i++) addObj(S, { type: 'tendril', x: 170 + i * 30, y: 100, len: 28, order: 1, tag: 'tendril', drain: 0.15, guide: [[160 + i * 30, 100], [190 + i * 30, 108]] });
      for (let i = 0; i < 3; i++) addObj(S, { type: 'uvula', x: 180 + i * 26, y: 140, need: 1.5, order: 2, tag: 'uvula', drain: 0.2 });
      S.strain = st;
      return st;
    }
    return null;
  }

  /* ---------- phase / scripts ---------- */

  function phaseClear(S) {
    if (S.strain && !S.strain.done) return false;
    for (const o of S.objects) {
      if (o.done || !o.alive) continue;
      if (o.type === 'nerve' || o.type === 'eloquent' || o.type === 'hold' || o.type === 'retractor') continue;
      if (o.optional) continue;
      if (o.type === 'bead') continue;
      return false;
    }
    if (S.flags.needIv && (S.flags.iv || 0) < S.flags.needIv) return false;
    if (S.strain && S.strain.kind === 'staccato') {
      const live = (S.strain.beads || []).some(b => !b.dead);
      if (live && !S.strain.done) return false;
    }
    return true;
  }

  function runScript(S, id, tune) {
    if (id === 'dip') { S.flags.dip = 40; }
    else if (id === 'crash') { S.flags.crash = 8; }
    else if (id === 'breath') { S.flags.needBreath = true; }
    else if (id === 'look') { S.flags.needLook = true; }
    else if (id === 'lurch') {
      slip(S, S.players[0], 'lurch', 3, tune);
      for (const o of S.objects) if (!o.done) { o.x += 10; o.y += 4; if (o.origin) { o.origin = [o.origin[0] + 10, o.origin[1] + 4]; } }
      S.flags.needLook = true;
      pushEv(S, ['lurch', 1]);
    } else if (id === 'blackout') { S.dim = 1; }
    else if (id === 'roll') { S.tiltAmp = 1; }
    else if (id === 'quiet') { S.flags.quiet = true; S.flags.needBreath = true; }
    else if (id === 'refill') { S.clock += 120; }
    else if (id === 'cantorRewind') { forceRewind(S, true); }
    else if (id === 'code') { S.vitals = 0; }
  }

  function stepWorld(S, worldDt, handDt, tune) {
    if (S.flags.dip) {
      S.vitals += (S.flags.dip - S.vitals) * Math.min(1, worldDt * 2);
      if (Math.abs(S.vitals - S.flags.dip) < 0.4) { S.vitals = S.flags.dip; S.flags.dip = 0; }
    }
    if (S.flags.crash) {
      S.vitals -= S.flags.crash * worldDt;
    }
    if (S.tiltAmp) {
      const drift = Math.sin(S.worldT * 0.7) * 25 * S.tiltAmp;
      for (const o of S.objects) if (o.type === 'pool' && !o.done) {
        o.x = clamp(o.x + drift * worldDt, 60, 360);
      }
    }
    for (const o of S.objects) {
      if (o.markT > 0) { o.markT -= handDt; if (o.markT <= 0 && o.hidden) o.marked = false; }
      if (o.revealWhen && o.hidden) {
        const src = S.objects.find(q => q.tag === o.revealWhen);
        if (src && src.done) { o.hidden = false; o.marked = true; }
      }
      if (o.type === 'bleeder' && !o.done) {
        let pool = S.objects.find(p => p.type === 'pool' && p.tag === 'fed-' + o.id);
        if (!pool) pool = addObj(S, { type: 'pool', x: o.x, y: o.y + 8, vol: 4, max: 40, order: o.order + 1, tag: 'fed-' + o.id, drain: 0 });
        if (!pool.done) pool.vol = Math.min(pool.max, pool.vol + 6 * worldDt * tune.fluids.bleed);
      }
      if (o.type === 'arteryTear' && !o.done) {
        let pool = S.objects.find(p => p.type === 'pool' && p.tag === 'fed-' + o.id);
        if (!pool) pool = addObj(S, { type: 'pool', x: o.x, y: o.y + 6, vol: 6, max: 50, order: o.order + 1, tag: 'fed-' + o.id, drain: 0 });
        if (!pool.done) pool.vol = Math.min(pool.max, pool.vol + 14 * worldDt * tune.fluids.bleed);
      }
    }
    /* solo retractor: Quill holds at half the window */
    const retract = S.objects.find(o => o.type === 'retractor' && !o.done);
    if (retract) {
      const holder = S.players.some(p => p.held === retract.id && p.trig > 0.3);
      if (holder) S.windowOpen = 1;
      else if (S.players.filter(p => !p.gone).length <= 1) S.windowOpen = 0.5;
      else S.windowOpen = 0;
    }
    if (S.lab) {
      for (const o of S.objects) if (o.done && o.lab) {
        o.labT = (o.labT || 0) + worldDt;
        if (o.labT > 1.2) {
          o.done = false; o.alive = true; o.prog = 0; o.cut = false; o.burn = 0; o.dosed = false; o.stitch = 0; o.free = false; o.tears = 0; o.spin = 0;
          o.x = o.origin[0]; o.y = o.origin[1]; o.labT = 0;
          if (o.cells) for (const c of o.cells) c[2] = 0;
        }
      } else o.labT = 0;
    }
    for (let i = 0; i < S.scripts.length; i++) {
      const sc = S.scripts[i];
      if (sc.done) continue;
      if (S.phaseT >= sc.t) { sc.done = true; runScript(S, sc.do, tune); }
    }
  }

  function loadPhase(S, def, index) {
    const ph = def.phases[index];
    S.phase = index;
    S.phaseCount = def.phases.length;
    S.phaseName = ph.name;
    S.phaseT = 0;
    S.objects = S.objects.filter(o => o.persist);
    S.strain = null;
    S.scripts = (ph.at || []).map(a => ({ t: a.t, do: a.do, done: false }));
    S.tutorial = !!ph.tutorial;
    S.tutDone = !ph.tutorial;
    S.flags = Object.assign({}, S.flags, ph.flags || {});
    if (ph.dim != null) S.dim = ph.dim;
    if (ph.tilt) S.tiltAmp = ph.tilt;
    for (const spec of ph.objects || []) addObj(S, clone(spec));
    if (ph.strain) spawnStrain(S, ph.strain, ph.strainOpts || {});
    if (ph.device) S.device = clone(ph.device);
    if (ph.onEnter) runScript(S, ph.onEnter, tuneOf(null));
    S.checkpoint = takeCore(S);
    /* drop the checkpoint's nested copy weight: checkpoint is the core itself */
    pushEv(S, ['phase', index, ph.name]);
  }

  function advancePhase(S) {
    if (S.hold) return;
    const def = (GAME.CASES || {})[S.id];
    if (!def) { finishCase(S); return; }
    if (S.phase + 1 >= def.phases.length) {
      if (!S.dressing && !S.won) {
        S.dressing = { t: 0, done: false };
        pushEv(S, ['dressing', 1]);
        return;
      }
      return;
    }
    loadPhase(S, def, S.phase + 1);
  }

  function create(def, opts) {
    opts = opts || {};
    const diff = opts.difficulty || opts.diff || 'resident';
    const doc = def.doctor || 'vale';
    const S = blank({
      id: def.id, seed: opts.seed || def.seed || 1, players: opts.players || 1,
      difficulty: diff, clock: def.clock, vitals: def.vitals, drain: def.drain,
      gift: doc === 'sokolova' ? 'look' : doc === 'both' ? 'both' : 'breath',
      doctor: doc === 'both' ? 'vale' : doc, site: def.site, par: def.par || 1000,
      mode: def.mode || 'case', consult: !!def.consult || doc === 'both',
    });
    if (doc === 'both') S.activeDoc = 'vale';
    S.clock0 = S.clock;
    if (def.doctor === 'both') S.consult = true;
    loadPhase(S, def, opts.phase || 0);
    if (def.lab) { S.hold = true; S.lab = true; S.cheat = { lockVitals: true, freezeClock: true }; }
    return S;
  }

  function createRaw(opts) {
    const S = blank(opts);
    for (const spec of opts.objects || []) addObj(S, clone(spec));
    if (opts.strain) spawnStrain(S, opts.strain, opts.strainOpts || {});
    if (opts.scripts) S.scripts = opts.scripts.map(a => ({ t: a.t, do: a.do, done: false }));
    S.hold = opts.hold !== false;
    S.checkpoint = takeCore(S);
    return S;
  }

  function readInputs(S, inputs, dt) {
    inputs = inputs || [];
    for (let i = 0; i < S.players.length; i++) {
      const p = S.players[i];
      const inp = inputs[i] || {};
      const ox = p.lx != null ? p.lx : p.x, oy = p.ly != null ? p.ly : p.y;
      if (inp.x != null) { p.x = inp.x; p.y = inp.y; p.bx = inp.x; p.by = inp.y; }
      if (inp.tool) p.tool = inp.tool;
      p.inst = hypot(p.x - ox, p.y - oy) / Math.max(dt, 1e-4);
      p.lx = p.x; p.ly = p.y;
      p.fine = !!inp.fine;
      p.mouse = !!inp.mouse;
      const trig = inp.trig || 0;
      p.trigEdge = trig > 0.3 && p.prevTrig <= 0.3;
      p.trigRelease = trig <= 0.3 && p.prevTrig > 0.3;
      p.prevTrig = trig;
      p.trig = trig;
      const gift = !!inp.gift;
      p.giftEdge = gift && !p.giftPrev;
      p.giftPrev = gift;
      const consult = !!inp.consult;
      p.consultEdge = consult && !p.consultPrev;
      p.consultPrev = consult;
      p.cancelEdge = !!inp.cancel;
      if (p.cancelEdge) { p.held = 0; p.stroke = null; }
    }
  }

  function tryGifts(S, tune) {
    for (const p of S.players) {
      if (!p.giftEdge) continue;
      if (S.breath) { S.breath = false; S.worldScale = 1; pushEv(S, ['breath', 0]); continue; }
      const doc = S.activeDoc;
      const wantLook = doc === 'sokolova' || (S.gift === 'look' && doc !== 'vale');
      const wantBreath = doc === 'vale' || S.gift === 'breath' || (S.gift === 'both' && doc === 'vale');
      if (S.gift === 'both') {
        if (doc === 'sokolova') { if (secondLook(S, tune)) return; }
        else if (S.steady >= 35) { S.breath = true; pushEv(S, ['breath', 1]); return; }
      } else if (S.gift === 'look' || wantLook && S.gift !== 'breath') {
        secondLook(S, tune);
      } else if (wantBreath && S.steady >= 35) {
        S.breath = true;
        pushEv(S, ['breath', 1]);
      }
    }
    for (const p of S.players) {
      if (!p.consultEdge || !S.consult) continue;
      S.activeDoc = S.activeDoc === 'vale' ? 'sokolova' : 'vale';
      pushEv(S, ['consult', S.activeDoc]);
    }
  }

  function stepCodeBlue(S, dt) {
    const cb = S.codeBlue;
    if (!cb) return;
    cb.t += dt;
    const peaks = [0.9, 1.8, 2.7, 3.6];
    const p = S.players[0];
    if (cb.next == null) cb.next = 0;
    if (cb.next < 4) {
      const peak = peaks[cb.next];
      if (p && p.trigEdge) {
        const err = Math.abs(cb.t - peak);
        cb.attempts += 1;
        if (err <= 0.14) {
          cb.hits += 1;
          if (err <= 0.06) cb.textbook = (cb.textbook || 0) + 1;
          pushEv(S, ['shock', cb.hits, err]);
        } else pushEv(S, ['miss', err]);
        cb.next += 1;
      } else if (cb.t > peak + 0.14) {
        cb.attempts += 1;
        cb.next += 1;
        pushEv(S, ['miss', 1]);
      }
    }
    if (cb.next >= 4 && !cb.resolved) {
      cb.resolved = true;
      S.codeBlue = null;
      if (cb.hits >= 2) {
        S.vitals = 30;
        S.flags.crash = 0;
        pushEv(S, ['revived', cb.textbook >= 2 ? 'textbook' : 'clean']);
      } else lose(S, 'code');
    }
  }

  function maybeDie(S) {
    if (S.won || S.lost || S.codeBlue || S.dressing) return;
    if (S.clock <= 0) { lose(S, 'time'); return; }
    if (S.vitals <= 0) {
      if (S.diff === 'attending' || S.codeBlueUsed) { lose(S, 'vitals'); return; }
      S.codeBlueUsed = true;
      S.codeBlue = { t: 0, hits: 0, attempts: 0, next: 0, textbook: 0, resolved: false };
      S.vitals = 0;
      S.breath = false;
      pushEv(S, ['codeblue', 1]);
    }
  }

  function stepDressing(S, dt, tune) {
    const d = S.dressing;
    d.t += dt;
    const u = (d.t % 1.2) / 1.2;
    const edge = Math.min(u, 1 - u);
    const p = S.players[0];
    if (p && p.trigEdge) {
      const bonus = edge < 0.08 ? 80 : 20;
      S.score += bonus;
      d.done = true;
      pushEv(S, ['stamp', bonus]);
      finishCase(S);
    } else if (d.t > 4) {
      d.done = true;
      finishCase(S);
    }
  }

  function step(S, inputs, dt, tune) {
    tune = tuneOf(tune);
    if (!dt || dt < 0) dt = 0;
    S.ev = [];
    if (S.won || S.lost) return S;
    readInputs(S, inputs, dt);
    if (S.codeBlue) { stepCodeBlue(S, dt); return S; }
    tryGifts(S, tune);
    if (S.breath) {
      S.steady = Math.max(0, S.steady - tune.gift.breathDrain * dt);
      if (S.steady <= 0) { S.breath = false; pushEv(S, ['breath', 0]); }
    }
    S.worldScale = S.breath ? tune.gift.breathFactor : 1;
    const worldDt = dt * S.worldScale;
    if (S.dressing) { stepDressing(S, dt, tune); return S; }

    const frozen = S.tutorial && !S.tutDone;
    const ch = S.cheat || {};
    if (ch.reveal) {
      for (const o of S.objects) if (o.hidden) { o.marked = true; o.markT = 4; }
    }
    if (ch.infSteady) S.steady = 100;
    if (!frozen) {
      let hazard = 0;
      for (const o of S.objects) {
        if (o.done || !o.drain) continue;
        if (inDome(S, o.x, o.y)) continue;
        hazard += o.drain;
      }
      const bleed = hazard * tune.fluids.bleed * tune.strains.damage;
      if (!ch.lockVitals) S.vitals -= (S.drain * tune.patient.drain * diffDrain(S) + bleed) * worldDt;
      if (!ch.freezeClock) S.clock -= worldDt * tune.patient.clock / diffClock(S);
      S.steady = Math.min(100, S.steady + 0.5 * tune.gift.charge * worldDt);
      if (ch.infSteady) S.steady = 100;
    }
    S.t += dt;
    S.worldT += frozen ? 0 : worldDt;
    S.phaseT += frozen ? 0 : worldDt;

    const handDt = (S.cheat && S.cheat.oneHit) ? dt * 40 : dt;
    for (const p of S.players) applyTools(S, p, handDt, tune);
    if (!frozen) {
      stepWorld(S, worldDt, dt, tune);
      stepStrain(S, worldDt, dt, tune);
    }
    if (S.ghostT > 0) S.ghostT -= dt;

    if (!frozen) {
      S.ringAcc += worldDt;
      while (S.ringAcc >= 0.1) { S.ringAcc -= 0.1; pushRing(S); }
    }

    maybeDie(S);
    if (!S.lost && !S.won && !S.codeBlue && phaseClear(S)) advancePhase(S);
    return S;
  }

  /* ---------- cursor and wheel ---------- */

  function assistOf(S, tune) {
    let a = tune.hands.assist;
    if (S && S.diff === 'intern') a += 0.2;
    if (S && (S.activeDoc === 'sokolova')) a += 0.2;
    return clamp(a, 0, 1.4);
  }

  function jitterOf(S, p) {
    const st = S && S.strain;
    if (!st || !st.jitter || (S && S.breath)) return [0, 0];
    const amp = 5 * (st.amp == null ? 1 : st.amp) * (p.fine ? 0.35 : 1);
    return [Math.sin((S.worldT || 0) * 17.3 + p.id) * amp, Math.cos((S.worldT || 0) * 13.1 + p.id * 2) * amp];
  }

  function validTarget(S, p, tune) {
    const rad = tune.hands.magnet;
    return nearest(S, p, rad, o => {
      if (!canTouch(S, o)) return false;
      if (o.type === 'pool') return p.tool === 'suction';
      if (o.type === 'nerve' || o.type === 'eloquent' || o.type === 'hold') return false;
      if (p.tool === 'sonar') return !!o.hidden;
      if (p.tool === 'salve') return !!o.cells;
      if (p.tool === 'syringe') return o.type === 'clot' || o.type === 'reed' || o.type === 'voice' || o.type === 'lobe';
      if (p.tool === 'cautery') return o.type === 'polyp' || o.type === 'bleeder' || o.type === 'bead' || o.type === 'uvula' || o.type === 'eye' || o.type === 'rupture' || o.type === 'tremass' || o.type === 'barb' || o.type === 'lobe';
      if (p.tool === 'forceps') return o.type === 'shard' || o.type === 'fragment' || o.type === 'mass' || o.type === 'hook' || o.type === 'gaff' || o.type === 'cork' || o.type === 'note' || o.type === 'retractor' || o.type === 'screw' || o.type === 'nest';
      if (p.tool === 'scalpel') return !!o.guide;
      if (p.tool === 'suture') return !!o.pairs;
      return false;
    });
  }

  function updateCursor(p, dev, S, dt, tune) {
    tune = tuneOf(tune);
    dev = dev || {};
    if (dev.mouse) {
      p.bx = dev.mouse[0]; p.by = dev.mouse[1];
      p.x = p.bx; p.y = p.by;
      p.fine = !!dev.fine;
      return p;
    }
    const aim = dev.aim || [0, 0];
    let mag = hypot(aim[0], aim[1]);
    let dirx = mag > 1e-6 ? aim[0] / mag : 0;
    let diry = mag > 1e-6 ? aim[1] / mag : 0;
    mag = Math.min(1, mag);
    const curved = Math.pow(mag, tune.hands.curve);
    let speed = curved * tune.hands.cursor;
    if (dev.fine) speed *= tune.hands.fine;
    if (S && (S.activeDoc === 'vale')) speed *= 1.15;
    /* 0.06s ramp */
    const k = 1 - Math.exp(-dt / 0.06);
    p.speed += (speed - (p.speed || 0)) * (dt > 0 ? k : 1);
    let vx = dirx * p.speed;
    let vy = diry * p.speed;
    const keys = dev.keys || [0, 0];
    const keySp = 200 * (dev.fine ? tune.hands.fine : 1);
    vx += keys[0] * keySp; vy += keys[1] * keySp;
    const nudge = dev.nudge || [0, 0];
    vx += nudge[0] * 40; vy += nudge[1] * 40;

    const assist = S ? assistOf(S, tune) : tune.hands.assist;
    const tgt = S ? validTarget(S, p, tune) : null;
    if (tgt && mag < 0.95) {
      vx *= 1 - 0.55 * Math.min(1, assist);
      vy *= 1 - 0.55 * Math.min(1, assist);
      if (mag < 0.12) {
        const dx = tgt.x - p.bx, dy = tgt.y - p.by;
        const d = hypot(dx, dy) || 1;
        const pull = 90 * assist;
        vx += (dx / d) * pull; vy += (dy / d) * pull;
      }
    }
    if (S && p.stroke && (p.stroke.kind === 'scalpel' || p.stroke.kind === 'suture')) {
      const o = objById(S, p.stroke.id);
      let tanv = [1, 0];
      if (o && o.guide) tanv = polyDist(o.guide, p.bx, p.by).tan;
      else if (p.stroke.kind === 'suture' && o && o.pairs) {
        const pair = o.pairs[o.stitch] || o.pairs[0];
        const dx = pair[1][0] - pair[0][0], dy = pair[1][1] - pair[0][1];
        const L = hypot(dx, dy) || 1;
        tanv = [dx / L, dy / L];
      }
      const along = vx * tanv[0] + vy * tanv[1];
      const cx = vx - along * tanv[0], cy = vy - along * tanv[1];
      const scale = 1 - 0.8 * Math.min(1, assist);
      vx = along * tanv[0] + cx * scale;
      vy = along * tanv[1] + cy * scale;
    }
    p.bx = clamp(p.bx + vx * dt, 8, CFG.FIELD_W - 8);
    p.by = clamp(p.by + vy * dt, 8, CFG.FIELD_H - 8);
    const j = S ? jitterOf(S, p) : [0, 0];
    p.x = p.bx + j[0];
    p.y = p.by + j[1];
    p.fine = !!dev.fine;
    return p;
  }

  function wheelIndex(x, y) {
    const ang = Math.atan2(y, x); /* 0 east, clockwise because y grows downward */
    let d = ang - (-Math.PI / 2);
    if (d < 0) d += TAU;
    if (d >= TAU) d -= TAU;
    return Math.round(d / (Math.PI / 4)) % 8;
  }

  function updateWheel(p, dev, dt) {
    dev = dev || {};
    if (dev.digit) {
      const i = (dev.digit - 1) % 8;
      if (p.tool !== CFG.TOOLS[i]) { p.tool = CFG.TOOLS[i]; p.swap = 0.12; }
      return p.tool;
    }
    const m = dev.move || [0, 0];
    const mag = hypot(m[0], m[1]);
    if (mag < 0.6) { p.wheelT = 0; p.wheelDir = -1; return p.tool; }
    const dir = wheelIndex(m[0], m[1]);
    if (dir !== p.wheelDir) { p.wheelDir = dir; p.wheelT = 0; }
    p.wheelT += dt;
    if (p.wheelT >= 0.08 && p.tool !== CFG.TOOLS[dir]) {
      p.tool = CFG.TOOLS[dir];
      p.swap = 0.12;
      p.wheelT = 0;
    }
    return p.tool;
  }

  function retryPhase(S) {
    if (!S.checkpoint) return false;
    restoreCore(S, S.checkpoint, false);
    S.rankCap = 'B';
    S.lost = false;
    S.won = false;
    S.codeBlue = null;
    S.reason = '';
    for (const p of S.players) { p.held = 0; p.stroke = null; }
    pushEv(S, ['retry', S.phase]);
    return true;
  }

  GAME.Sim = {
    rnd, clamp, clone, addObj, makePlayer, blank, create, createRaw, step,
    takeCore, applyCore, hashCore, rankLetter, secondLook, forceRewind, retryPhase,
    updateCursor, updateWheel, wheelIndex, spawnStrain, phaseClear, objById,
    polyDist, lose, DRAIN,
  };
  GAME.Op = { create, createRaw, step, takeCore, hash: S => hashCore(takeCore(S)), rankLetter, secondLook, forceRewind, retryPhase, spawnStrain };
  GAME.Cursor = { update: updateCursor, jitterOf, assistOf };
  GAME.Wheel = { update: updateWheel, index: wheelIndex, TOOLS: CFG.TOOLS };
})();
