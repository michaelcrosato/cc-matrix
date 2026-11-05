/* ---------- the match: laws, scoring, fielding, running, hype and chaos. Pure simulation: no drawing, no audio ---------- */
const SWING_DELAY = .09, SWING_DUR = .36;
const TARGETS = [
  { id: 'window', name: 'PUB WINDOW', ang: -34, r: 46, pts: 10, col: '#7ad0ff' },
  { id: 'urn',    name: 'TEA URN',    ang: 38,  r: 44, pts: 8,  col: '#ffb860' },
  { id: 'clock',  name: 'CLOCK TOWER',ang: 90,  r: 46, pts: 6,  col: '#f0e060' },
  { id: 'bell',   name: 'CHURCH BELL',ang: 150, r: 44, pts: 8,  col: '#d0c0ff' },
];
const targetPos = t => [CX + bndRX() * Math.cos(t.ang * Math.PI / 180), MY + bndRY() * Math.sin(t.ang * Math.PI / 180)];
const newIntent = () => ({ shot: null, aim: null, run: false, runHeld: false, special: false, mx: 0, my: 0, bowl: null, release: false, cycle: false, dive: false });

function mkSide(team, ctrl) {
  const names = []; const r = mkrng(team.length * 977 + team.charCodeAt(0) * 31);
  for (let i = 0; i < 14; i++) names.push(FIRSTNAMES[Math.floor(r() * FIRSTNAMES.length)] + ' ' + SURNAMES[Math.floor(r() * SURNAMES.length)]);
  return { team, ctrl: ctrl || null, score: 0, wkts: 0, balls: 0, fours: 0, sixes: 0, extras: 0, hype: 0, fire: 0, names, nextBat: 2, history: [] };
}

function createMatch(cfg) {
  const ground = GROUNDS[cfg.ground || 'green'], diff = DIFFS[cfg.diff == null ? 1 : cfg.diff];
  const M = {
    cfg, ground, diff, hub: !!cfg.hub, attract: !!cfg.attract, cheat: !!cfg.cheat, single: !!cfg.single || !!cfg.hub,
    overs: cfg.overs || 2, maxW: cfg.wickets || 3,
    sides: [mkSide(cfg.teamA || 'kerf', cfg.ctrlA), mkSide(cfg.teamB || 'witt', cfg.ctrlB)],
    inn: 0, bat: cfg.batFirst === 1 ? 1 : 0, target: 0, result: null, over: false,
    ph: 'pre', t: 0, clock: 0, ballNo: 0, freeHit: false, golden: false, wet: false, wetLeft: 0,
    ball: newBall(), balls: [], marker: [CX, 440], delType: 'pace', field: 'balanced', side: 1,
    banner: null, last: null, hit: null, swing: null, runup: null, plan: null, runs: 0, restEnd0: 0, pending: null,
    fielders: [], batters: [], cow: null, umpire: { x: CX + 28, y: BY + 4, signal: 0 }, active: 0, shake: 0, bailsOff: 0,
    commLock: 0, chaosLeft: 0, caughtBy: null, lastRunT: 0, hold: 0, ballLog: [],
  };
  const sideBat = () => M.sides[M.bat], sideBowl = () => M.sides[1 - M.bat];
  M.sideBat = sideBat; M.sideBowl = sideBowl;
  let rBcur = null;
  const rB = () => (rBcur ? rBcur() : RNG.play());
  let rF = () => RNG.play();
  const strikerOf = () => M.batters[M.sIdx || 0];
  const bname = b => (b && sideBat().names[b.nameIdx || 0]) || 'the batter';
  M.striker = strikerOf;

  /* ----- people ----- */
  function resetField() {
    const fp = FIELD_PRESETS[M.field] || FIELD_PRESETS.balanced;
    M.fielders = [];
    M.fielders.push(mkF(0, 'bowler', CX, BY - 30, 'bowler'));
    M.fielders.push(mkF(1, 'keeper', CX, SY - 34, 'keeper'));
    fp.forEach((p, i) => M.fielders.push(mkF(2 + i, 'field', CX + p[0], SY + p[1], 'fielder')));
    for (const f of M.fielders) { f.hx = f.x; f.hy = f.y; }
  }
  function placeBatters() {
    for (const b of M.batters) {
      b.moving = false; b.tgt = b.end; b.y = b.end === 0 ? CR0 : CR1; b.x = b.end === 0 ? CX : CX + 24; b.swingT = -1; b.vy = 0;
      b.face = b.end === 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    M.runs = 0; M.restEnd0 = M.batters[0].end;
  }
  function replaceOut() {
    const out = M.batters.find(b => b.out); if (!out) return;
    if (M.last && M.last.how === 'runout') { out.end = out.tgt; const o = M.batters.find(b => b !== out); o.end = 1 - out.end; }
    out.out = 0; out.nameIdx = sideBat().nextBat++;
  }
  function mkF(id, role, x, y, kind) { return { id, role, kind, x, y, hx: x, hy: y, vx: 0, vy: 0, face: Math.PI / 2, dive: 0, holdT: 0, hasBall: false, celeb: 0, anim: 0, drop: 0, throwT: 0 }; }
  function mkB(id, end) { return { id, end, tgt: end, moving: false, x: end === 0 ? CX : CX + 24, y: end === 0 ? CR0 : CR1, face: end === 0 ? Math.PI / 2 : -Math.PI / 2, out: 0, vy: 0, swingT: -1, swingType: null, turned: 0 }; }
  M.setField = name => { M.field = name; const fp = FIELD_PRESETS[name]; fp.forEach((p, i) => { const f = M.fielders[2 + i]; f.hx = CX + p[0]; f.hy = SY + p[1]; }); };

  /* ----- ball set-up ----- */
  function nextBall() {
    M.ballNo++;
    const S = sideBat();
    resetField(); placeBatters();
    M.batterEnds();
    M.noBall = false; M.padHit = false;
    rBcur = cfg.rngBall ? cfg.rngBall(M.ballNo) : null;
    M.ball = newBall(); M.balls = [];
    M.ball.wet = M.wet; M.ball.groundBounce = ground.pitchBounce * (M.wet ? .8 : 1);
    M.swing = null; M.runup = null; M.plan = null; M.hit = null; M.caughtBy = null;
    M.freeHit = !!M.pendingFreeHit; M.pendingFreeHit = false;
    M.ph = 'setup'; M.t = 0;
    M.golden = M.goldenNext; M.goldenNext = false;
    rF = cfg.rngF ? cfg.rngF(M.ballNo) : () => RNG.play();
    M.setField(M.field);
    M.marker = [CX + rr(-6, 6, rB), rr(430, 470, rB)];
    emit('ball:next', { no: M.ballNo, free: M.freeHit, golden: M.golden });
  }
  M.batterEnds = () => { M.sIdx = M.batters.findIndex(b => b.end === 0); if (M.sIdx < 0) M.sIdx = 0; };

  function startInnings() {
    resetField(); M.ballNo = 0; M.freeHit = false; M.pendingFreeHit = false; M.goldenNext = false;
    for (const s of M.sides) { s.hype = Math.min(s.hype, 40); s.fire = 0; }
    sideBat().nextBat = 2; M.batters = [mkB(0, 0), mkB(1, 1)]; M.batters[0].nameIdx = 0; M.batters[1].nameIdx = 1; placeBatters();
    M.ph = 'intro'; M.t = 0;
    emit('innings:start', { inn: M.inn });
  }

  /* ----- scoring and the end of a ball ----- */
  function banner(text, sub, col, t = 1.8) { M.banner = { text, sub: sub || '', col: col || '#fff', t, t0: t }; }
  function hypeAdd(side, n) {
    const S = M.sides[side]; if (S.fire > 0) return;
    const before = S.hype; S.hype = clamp(S.hype + n * T('hypeGain'), 0, 100);
    if (before < 100 && S.hype >= 100) emit('hype:full', { side });
  }
  function igniteBat(side) {
    const S = M.sides[side]; if (S.hype < 100 || S.fire > 0) return false;
    S.hype = 0; S.fire = Math.round(T('fireBalls')); emit('fire:on', { side, role: 'bat' });
    return true;
  }
  function finish(kind, o = {}) {
    if (M.ph === 'between' || M.ph === 'done') return;
    if (kind === 'wicket' && M.god && sideBat().ctrl) { kind = 'runs'; o = { runs: 0 }; }
    const S = sideBat(), B = sideBowl(), ball = M.ball;
    let runs = o.runs || 0, text = '', sub = '', col = '#fff', legal = true, out = false, how = o.how;
    const nb = M.noBall && kind !== 'wide';
    if (nb) { legal = false; S.extras += 1; S.score += 1; M.pendingFreeHit = true; emit('extra', { kind: 'noball' }); }
    if (kind === 'wide') { legal = false; S.extras += 1; runs = 1; text = 'WIDE'; col = '#ffd860'; emit('extra', { kind: 'wide' }); }
    else if (kind === 'noball') { legal = false; S.extras += 1; runs += 1; M.pendingFreeHit = true; text = 'NO BALL'; sub = 'FREE HIT next ball'; col = '#ff8040'; emit('extra', { kind: 'noball' }); }
    else if (kind === 'wicket') {
      out = !((M.freeHit || nb) && how !== 'runout');
      if (!out) { text = nb ? 'NO BALL!' : 'FREE HIT!'; sub = 'Reprieved - no wicket'; col = '#ffd860'; runs = 0; }
    }
    if (ball.golden || M.golden) { if (kind !== 'wide' && kind !== 'noball') runs *= 2; }
    if (kind === 'wide' || kind === 'noball') { S.score += runs; }
    else S.score += runs + (o.bonus || 0) * 1;
    if (o.bonus) S.score += 0;
    if (legal) { S.balls++; }
    if (kind === 'wicket' && out) { S.wkts++; text = how === 'bowled' ? 'BOWLED!' : how === 'lbw' ? 'LBW!' : how === 'caught' ? 'CAUGHT!' : how === 'runout' ? 'RUN OUT!' : 'OUT!'; col = '#ff5040'; sub = (o.who || '') ; M.umpire.signal = 2;
      hypeAdd(M.bat, -15); hypeAdd(1 - M.bat, 35); emit('wicket', { how, side: M.bat, who: o.who });
      const ob = o.batter || strikerOf();
      if (ob) { ob.out = 1; }
    } else if (kind === 'boundary') {
      const n = o.runs; if (n === 6) S.sixes++; else S.fours++;
      text = n === 6 ? 'SIX!' : 'FOUR!'; col = n === 6 ? '#ffd040' : '#7ae0ff';
      if (o.target) { text = o.target.name + '!'; sub = '+' + o.target.pts + ' BONUS RUNS'; col = o.target.col; }
      hypeAdd(M.bat, n === 6 ? 38 : 22); emit('boundary', { n, target: o.target || null, side: M.bat });
      if (M.golden) sub = (sub ? sub + ' • ' : '') + 'GOLDEN BALL ×2';
    } else if (kind === 'runs') {
      const n = o.runs;
      if (n === 0) { text = M.swing && M.swing.miss ? 'BEATEN!' : (M.padHit ? 'ON THE PADS' : 'DOT BALL'); sub = M.swing && M.swing.miss ? 'Played and missed' : ''; col = '#c8d0c0'; hypeAdd(1 - M.bat, M.swing && M.swing.miss ? 14 : 9); }
      else { text = n + (n === 1 ? ' RUN' : ' RUNS'); col = '#fff'; hypeAdd(M.bat, 3 * n); }
      if (o.perfect) hypeAdd(M.bat, 10);
      emit('runs', { n, side: M.bat });
    }
    if (kind === 'wide') hypeAdd(M.bat, 0);
    if (S.fire > 0 && legal) { S.fire--; if (S.fire <= 0) emit('fire:off', { side: M.bat }); }
    if (B.fire > 0 && legal) B.fire = Math.max(0, B.fire - 1);
    M.last = { kind, runs, how: out ? how : null, text, legal, ballNo: M.ballNo, free: M.freeHit };
    if (nb && !text.startsWith('NO')) { sub = (sub ? sub + ' • ' : '') + 'NO BALL +1, FREE HIT next'; }
    S.history.push(out ? 'W' : kind === 'wide' ? 'Wd' : kind === 'noball' ? 'Nb' : String(runs));
    if (S.history.length > 24) S.history.shift();
    banner(text, sub, col, 1.7);
    M.ph = 'between'; M.t = 0; M.hold = 0;
    emit('ball:end', { kind, runs, legal, out, how });
    const total = S.score;
    if (legal && S.balls % 6 === 0 && S.balls > 0) emit('over:end', { over: S.balls / 6, side: M.bat });
    // a chase can be won mid-over
    if (M.inn === 1 && !M.single && total >= M.target) M.endInnings = 'chased';
    else if (S.wkts >= M.maxW) M.endInnings = 'allout';
    else if (S.balls >= M.overs * 6) M.endInnings = 'overs';
    else M.endInnings = null;
    if (M.hub && M.endInnings) M.endInnings = M.endInnings;
  }
  M.finish = finish;

  function afterBetween() {
    if (M.endInnings) {
      const why = M.endInnings; M.endInnings = null;
      if (M.single || M.inn === 1) return endMatch(why);
      M.target = sideBat().score + 1; M.inn = 1; M.bat = 1 - M.bat;
      emit('innings:end', { why, target: M.target });
      startInnings(); return;
    }
    // end of an over: the strike changes, a new chaos roll
    const S = sideBat();
    if (M.last && M.last.legal && S.balls % 6 === 0) {
      for (const b of M.batters) b.end = 1 - b.end;
      rollChaos();
    }
    replaceOut();
    nextBall();
  }

  function endMatch(why) {
    const a = M.sides[0], b = M.sides[1];
    M.ph = 'done'; M.over = true;
    if (M.single) M.result = { winner: -1, margin: 'single', why };
    else if (a.score === b.score) M.result = { winner: -1, margin: 'tie', why };
    else {
      const w = a.score > b.score ? 0 : 1, ws = M.sides[w];
      let margin = '';
      if (w === M.bat) margin = 'by ' + (M.maxW - ws.wkts) + ' wicket' + (M.maxW - ws.wkts === 1 ? '' : 's');
      else margin = 'by ' + Math.abs(a.score - b.score) + ' run' + (Math.abs(a.score - b.score) === 1 ? '' : 's');
      M.result = { winner: w, margin, why };
    }
    emit('match:end', M.result);
  }

  /* ----- chaos: cows, rain and golden balls ----- */
  function rollChaos() {
    const mode = cfg.chaos || 'all', k = T('chaos');
    if (M.hub || mode === 'none' && !cfg.golden) { return; }
    if (rB() < .3 * k && (mode === 'all' || mode === 'gold')) { M.goldenNext = true; emit('chaos', { id: 'golden' }); }
    if (mode === 'none') return;
    if (!M.cow && (mode === 'cow' || mode === 'all') && rF() < .6 * k) {
      const a = rr(.4, 2.6, rF);
      M.cow = { x: CX + Math.cos(a) * 190, y: MY + Math.sin(a) * 200, vx: 0, vy: 0, tx: CX + 150, ty: MY + 180, mood: 0, stopped: 0, moo: 0 };
      emit('chaos', { id: 'cow' });
    }
    if (!M.wet && (mode === 'all') && rF() < .35 * k) { M.wet = true; M.wetLeft = 2; emit('chaos', { id: 'rain' }); }
    else if (M.wet) { M.wetLeft--; if (M.wetLeft <= 0) { M.wet = false; emit('chaos', { id: 'rain:end' }); } }
  }
  M.rollChaos = rollChaos;

  /* ----- AI: bowling and batting intents (the same inputs a person uses) ----- */
  function aiBowl() {
    const it = newIntent();
    if (M.ph === 'setup') {
      if (M.t > .55) {
        const B = sideBowl(), d0 = rB(), d1 = rB(), mx = rr(-14, 14, rB), my = rr(410, 500, rB), d2 = rB(), wild = rr(-22, 22, rB);
        if (B.hype >= 100 && d0 < .6) it.bowl = 'fire';
        else it.bowl = d1 < .45 ? 'pace' : d1 < .75 ? 'swing' : 'spin';
        M.marker = [CX + mx, my];
        if (d2 < .08) M.marker[0] += wild;   // the odd wild one
      }
    } else if (M.ph === 'runup' && M.runup) {
      const R = M.runup, f = T('meterSpeed'), tm = R.t - R.meterStart;
      if (!R.aiAt) {
        const sigma = diff.bowlSigma / T('aiSkill') * (M.cheat ? .2 : 1), k = Math.floor(rB() * 2), cross = (R.cross + k * .5) / f;
        R.aiAt = R.meterStart + Math.max(.18, cross + rnorm(rB) * sigma * 1.5);
      }
      if (R.t >= R.aiAt) it.release = true;
    }
    return it;
  }

  function aiBat() {
    const it = newIntent(), P = M.plan;
    if (M.ph === 'flight' && P && !M.swing) {
      if (!P.leave && M.clock >= P.at) { it.shot = P.type; it.aim = P.aim; }
    }
    if (M.ph === 'setup' && sideBat().hype >= 100 && sideBat().fire === 0 && M.t > .3) it.special = true;
    if (M.ph === 'inplay') aiRun(it);
    return it;
  }
  function planBat() {
    const b = M.ball, pr = predictPlane(b), wide = Math.abs(pr.b.x - CX) > 24 || pr.b.z > 44;
    const sigma = diff.batSigma / T('aiSkill') * (M.cheat ? .12 : 1) * (sideBat().fire > 0 ? 1.4 : 1);
    const err = rnorm(rB) * sigma, hype = sideBat().hype;
    const lr = rB(), loft = M.cheat ? lr < .55 : lr < (.18 + hype / 400 + (M.inn === 1 ? .1 : 0));
    // aim for the biggest gap among the fielders
    let best = null, bs = -1;
    for (let a = -75; a <= 75; a += 15) {
      const ang = Math.PI / 2 - a * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang);
      let near = 1e9;
      for (const f of M.fielders) { if (f.role === 'keeper') continue; const rx = f.hx - CX, ry = f.hy - YHIT, proj = rx * dx + ry * dy; if (proj <= 0) continue; const perp = Math.abs(rx * dy - ry * dx); if (perp < 40) near = Math.min(near, proj); }
      const score = Math.min(near, 500) + rB() * 90; if (score > bs) { bs = score; best = [dx, dy]; }
    }
    const l0 = rB(), l1 = rB();
    const leave = wide && !M.cheat ? l0 < .9 : (!M.cheat && l0 < .06);
    M.plan = { at: M.clock + pr.t - SWING_DELAY + err, type: loft ? 'loft' : l1 < .1 ? 'defend' : 'ground', aim: best, leave: leave || (wide && M.cheat) };
  }
  /* when can a fielder first reach the ball's path? (the AI's read of the shot) */
  function interceptTime() {
    const c = cloneBall(M.ball);
    for (let i = 1; i <= 80; i++) {
      for (let k = 0; k < 12; k++) stepBall(c, 1 / 120);
      const t = i * .1;
      if (rho(c.x, c.y) >= 1 && c.bounces === 0 || rho(c.x, c.y) >= 1) return { t: 99, x: c.x, y: c.y };
      if (c.z > 14) continue;
      for (const f of M.fielders) {
        if (f.role === 'keeper' && c.y > SY + 40) continue;
        if (hyp(f.x - c.x, f.y - c.y) / T('fieldSpeed') <= t) return { t, x: c.x, y: c.y };
      }
    }
    return { t: 6, x: c.x, y: c.y };
  }
  function aiRun(it) {
    if (M.ph !== 'inplay') return;
    const bt = M.batters, moving = bt.some(b => b.moving), ball = M.ball;
    const tRun = (CR1 - CR0) / T('runSpeed');
    if ((ball.phase === 'held' || ball.thrownTo != null) && !moving) return;
    if (!M.hit.ic || M.clock - M.hit.icAt > .4) { M.hit.ic = interceptTime(); M.hit.icAt = M.clock; }
    const ic = M.hit.ic, air = ball.carried && ball.z > 6;
    const dEnd = Math.min(hyp(ic.x - CX, ic.y - SY), hyp(ic.x - CX, ic.y - BY));
    const tRetr = ic.t - (M.clock - M.hit.icAt) + .42 + dEnd / T('throwSpeed');
    const need = tRun * (M.cheat ? .95 : 1.05);
    if (!moving) { if (air && !M.cheat) return; if (ic.t < 98 && tRetr > need) { it.run = true; it.runHeld = true; } }
    else it.runHeld = ic.t < 98 && tRetr > need * .75;
  }
  M.aiBat = aiBat; M.aiBowl = aiBowl;

  /* ----- running between the wickets ----- */
  function startRun() {
    for (const b of M.batters) { b.tgt = 1 - b.end; b.moving = true; }
  }
  function updateRun(dt, intent) {
    if (M.ph !== 'inplay') return;
    const bt = M.batters, moving = bt.some(b => b.moving);
    if (intent.run) {
      if (!moving) startRun();
      else for (const b of bt) { if (b.moving) b.tgt = b.tgt === 0 ? 1 : 0; }   // turn back
    }
    for (const b of bt) {
      if (!b.moving) { b.vy = 0; continue; }
      const dest = b.tgt === 0 ? CR0 : CR1, dir = Math.sign(dest - b.y) || 1;
      b.vy = dir * T('runSpeed'); b.y += b.vy * dt; b.face = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if ((dir > 0 && b.y >= dest) || (dir < 0 && b.y <= dest)) { b.y = dest; b.end = b.tgt; b.moving = false; b.vy = 0; b.turned = 0; }
    }
    if (!bt.some(b => b.moving)) {
      if (bt[0].end !== M.restEnd0) {
        M.restEnd0 = bt[0].end; M.runs++; M.lastRunT = M.clock;
        emit('run', { n: M.runs });
        if (intent.runHeld && M.ball.phase !== 'held') startRun();
      } else if (intent.runHeld && M.ball.phase !== 'held' && !M.hit.boundaryDone) { /* held but not moving: wait for a fresh call */ }
    }
  }

  /* ----- fielding ----- */
  function throwTo(f, endIdx) {
    const ball = M.ball, ty = endIdx === 0 ? SY + 6 : BY - 6, g = T('gravity');
    const tx = CX + rnorm(rF) * (f.kind === 'keeper' ? 3 : 7), d = hyp(tx - f.x, ty - f.y), t = Math.max(.15, d / T('throwSpeed'));
    ball.phase = 'live'; ball.holder = null; ball.x = f.x; ball.y = f.y; ball.z = 20; ball.vx = (tx - f.x) / t; ball.vy = (ty - f.y) / t; ball.vz = (g * t * t / 2 + 8 - 20) / t;
    ball.thrownTo = endIdx; ball.carried = false; ball.bounces = 0; ball.rolling = false; ball.hitBy = null;
    f.hasBall = false; f.throwT = .35; f.holdT = 0;
    emit('throw', { end: endIdx });
  }
  function runnerEnds() {
    // ends the runners are heading to (and are not yet safe at)
    const out = [];
    for (const b of M.batters) if (b.moving) out.push({ end: b.tgt, b, d: Math.abs(b.y - (b.tgt === 0 ? CR0 : CR1)) });
    return out;
  }
  function arriveThrow(endIdx) {
    const ball = M.ball;
    const risks = runnerEnds().filter(r => r.end === endIdx && r.d > 10);
    if (risks.length && !M.freeHit0) {
      const r = risks[0]; ball.phase = 'held'; ball.thrownTo = null;
      M.fielders[endIdx === 0 ? 1 : 0].hasBall = true;
      M.bailsOff = 1.2; emit('stumps', { end: endIdx });
      // a runner mid-pitch out of his ground
      const who = bname(r.b);
      M.hit.runoutBatter = r.b;
      finish('wicket', { how: 'runout', who, batter: r.b, runs: M.runs });
      return true;
    }
    ball.phase = 'held'; ball.thrownTo = null; ball.vx = ball.vy = 0;
    const rec = M.fielders[endIdx === 0 ? 1 : 0]; rec.hasBall = true; rec.holdT = 0; ball.holder = rec;
    return false;
  }
  function updateFielders(dt, bowlIn) {
    const ball = M.ball, live = ball.phase === 'live' && M.ph === 'inplay';
    M.clock0 = (M.clock0 || 0) + dt;
    // who chases: the two nearest to where the ball will be
    if (live && !ball.thrownTo) {
      M.chaseT = (M.chaseT || 0) - dt;
      if (M.chaseT <= 0) {
        M.chaseT = .15;
        let tx = ball.x + ball.vx * .25, ty = ball.y + ball.vy * .25;
        if (ball.carried && ball.z > 3) { const pr = predictLanding(ball); tx = pr.b.x; ty = pr.b.y; M.landing = [tx, ty]; }
        else M.landing = null;
        tx = clamp(tx, CX - bndRX() * 1.1, CX + bndRX() * 1.1); ty = clamp(ty, MY - bndRY() * 1.1, MY + bndRY() * 1.1);
        const cand = M.fielders.filter(f => f.role !== 'bowler' || ball.y > BY - 120).map(f => ({ f, d: hyp(f.x - tx, f.y - ty) })).sort((a, b) => a.d - b.d);
        for (const f of M.fielders) f.chase = null;
        const n = ball.carried && ball.z > 3 ? 1 : 2;
        cand.slice(0, n).forEach(c => { c.f.chase = [tx, ty]; });
        M.active = cand[0].f.id;
      }
    } else for (const f of M.fielders) f.chase = null;
    const humanField = bowlIn && bowlIn.human;
    for (const f of M.fielders) {
      let tx = f.hx, ty = f.hy, spd = T('fieldSpeed') * (f.role === 'keeper' ? .8 : 1);
      if (f.dive > 0) { f.dive -= dt; spd *= 2.3; }
      if (f.chase && live) { tx = f.chase[0]; ty = f.chase[1]; }
      else if (live && !ball.thrownTo) { tx = f.hx + (ball.x - f.hx) * .08; ty = f.hy + (ball.y - f.hy) * .08; }
      if (M.ph === 'between' || M.ph === 'done') { tx = f.hx; ty = f.hy; }
      if (f.role === 'keeper' && ball.thrownTo === 0) { tx = CX; ty = SY - 10; }
      if (f.role === 'bowler' && ball.thrownTo === 1) { tx = CX; ty = BY - 8; }
      if (f.role === 'bowler' && (M.ph === 'setup' || M.ph === 'pre')) { tx = f.hx; ty = f.hy; }
      let dx = tx - f.x, dy = ty - f.y, d = hyp(dx, dy);
      if (humanField && live && f.id === M.active && (bowlIn.mx || bowlIn.my)) { dx = bowlIn.mx; dy = bowlIn.my; d = hyp(dx, dy); if (d > 1) { dx /= d; dy /= d; } f.vx = dx * spd; f.vy = dy * spd; }
      else if (d > 3) { f.vx = dx / d * Math.min(spd, d * 6); f.vy = dy / d * Math.min(spd, d * 6); }
      else { f.vx *= .6; f.vy *= .6; }
      if (M.ph === 'runup' && f.role === 'bowler') { f.vx = f.vy = 0; }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (hyp(f.vx, f.vy) > 8) f.face = Math.atan2(f.vy, f.vx);
      if (f.throwT > 0) f.throwT -= dt;
      if (f.drop > 0) f.drop -= dt;
      if (f.celeb > 0) f.celeb -= dt;
    }
    // human fielder dives
    if (humanField && bowlIn.dive && live) { const f = M.fielders[M.active]; if (f && f.dive <= 0) { f.dive = .42; emit('dive', { id: f.id }); } }
    if (!live && !(ball.phase === 'held')) return;
    // the ball in hand: wait, then throw to a runner's end or settle
    if (ball.phase === 'held' && ball.holder) {
      const h = ball.holder; ball.x = h.x; ball.y = h.y; ball.z = 18; h.holdT += dt;
      if (M.ph === 'inplay' && h.holdT > .42) {
        const rs = runnerEnds().filter(r => r.d > 6);
        if (rs.length) {
          // throw to the end of the runner with the most to lose
          rs.sort((a, b) => b.d - a.d);
          const e = rs[0].end;
          const rec = M.fielders[e === 0 ? 1 : 0];
          if (h === rec) { /* already at that end: break the stumps */ arriveThrow(e); }
          else throwTo(h, e);
        } else if (h.holdT > .5) { M.hold += dt; }
      }
    }
    // pick-up
    if (live && !ball.thrownTo || (live && ball.thrownTo != null && ball.z < 6 && ball.age > 0)) {
      if (!ball.thrownTo) for (const f of M.fielders) {
        if (f.throwT > 0) continue;
        const rad = f.dive > 0 ? 16 : 8;
        if (ball.z < 14 && hyp(f.x - ball.x, f.y - ball.y) < rad) {
          if (ball.carried) continue;
          ball.phase = 'held'; ball.holder = f; f.hasBall = true; f.holdT = 0; ball.vx = ball.vy = 0;
          emit('pickup', { id: f.id, dive: f.dive > 0 }); break;
        }
      }
    }
    // a throw arriving at a stump end
    if (ball.thrownTo != null && ball.phase === 'live') {
      const ey = ball.thrownTo === 0 ? SY : BY;
      if ((ball.thrownTo === 0 && ball.y <= ey + 8) || (ball.thrownTo === 1 && ball.y >= ey - 8)) {
        if (Math.abs(ball.x - CX) < 16 && ball.z < 40) arriveThrow(ball.thrownTo);
        else { ball.thrownTo = null; emit('overthrow', {}); }
      }
    }
  }
  function tryCatch() {
    const ball = M.ball; if (!ball.carried || ball.phase !== 'live' || M.ph !== 'inplay' || M.hit.caughtTried) return;
    if (ball.z < 2 || ball.z > 34) return;
    for (const f of M.fielders) {
      if (f.role === 'bowler' && ball.y < BY - 140) continue;
      if (f.drop > 0 || (M.hit.tried && M.hit.tried[f.id])) continue;
      const rad = f.dive > 0 ? 15 : 10;
      if (hyp(f.x - ball.x, f.y - ball.y) < rad) {
        M.hit.tried = M.hit.tried || {}; M.hit.tried[f.id] = 1;
        const speed = hyp(ball.vx, ball.vy);
        const p = clamp(T('catchSkill') * (1 - speed / 650) * (f.dive > 0 ? 1.12 : 1) * (M.wet ? .85 : 1) + (M.hit.edge ? .1 : 0), 0, .97);
        if (rF() < p || M.cheatCatch) {
          ball.phase = 'held'; ball.holder = f; f.hasBall = true; ball.vx = ball.vy = 0;
          M.caughtBy = f; f.celeb = 1.5; M.hit.caughtTried = 1;
          finish('wicket', { how: 'caught', who: bname(strikerOf()) , catcher: f.id });
        } else { f.drop = 1; emit('dropped', { id: f.id }); hypeAdd(M.bat, 8); }
        return;
      }
    }
  }
  function checkBoundary() {
    const ball = M.ball; if (ball.hitBy === null || ball.phase !== 'live' || M.ph !== 'inplay') return;
    if (rho(ball.x, ball.y) < 1) return;
    if (ball.thrownTo != null) return;
    const six = ball.bounces === 0;
    let tgt = null, bonus = 0;
    if (six) for (const t of TARGETS) { const p = targetPos(t); if (hyp(ball.x - p[0], ball.y - p[1]) < t.r) { tgt = t; bonus = t.pts; break; } }
    const n = six ? 6 : 4;
    M.hit.boundaryDone = true; ball.phase = 'dead';
    for (const b of M.batters) b.moving = false;
    finish('boundary', { runs: n, bonus, target: tgt });
    if (tgt) emit('target', { t: tgt, x: ball.x, y: ball.y });
  }
  function cowCheck() {
    const c = M.cow; if (!c) return;
    const ball = M.ball;
    if (ball.phase === 'live' && M.ph === 'inplay' && ball.z < 12 && hyp(ball.x - c.x, ball.y - c.y) < 15 && hyp(ball.vx, ball.vy) > 30 && !ball.thrownTo) {
      ball.phase = 'held'; ball.holder = null; ball.vx = ball.vy = 0; c.stopped = 1.6; c.moo = 1; emit('cowstop', {});
      for (const b of M.batters) { if (b.moving) { b.moving = false; b.y = clamp(b.y, CR0, CR1); } }
      M.hit.boundaryDone = true;
      const rr_ = M.runs;
      finish('runs', { runs: rr_ });
    }
  }
  function updateCow(dt) {
    const c = M.cow; if (!c) return;
    if (c.stopped > 0) { c.stopped -= dt; c.vx = c.vy = 0; return; }
    if (hyp(c.tx - c.x, c.ty - c.y) < 8) { const a = rr(0, TAU, rF), d = rr(120, 230, rF); c.tx = CX + Math.cos(a) * d; c.ty = MY + Math.sin(a) * d * 1.1; }
    const d = hyp(c.tx - c.x, c.ty - c.y) || 1; c.vx = (c.tx - c.x) / d * 9; c.vy = (c.ty - c.y) / d * 9; c.x += c.vx * dt; c.y += c.vy * dt;
    if (c.moo > 0) c.moo -= dt;
  }

  /* ----- batting: swing, contact and the umpire ----- */
  function startSwing(type, aim, bi) {
    const b = strikerOf(); if (M.swing || b.swingT >= 0) return;
    M.swing = { t: 0, type, aim: aim || [0, 1], done: false, miss: false }; b.swingT = 0; b.swingType = type;
    emit('swing', { type });
  }
  function resolveContact() {
    const sw = M.swing, b = M.ball, bat = strikerOf(); sw.done = true;
    const fire = sideBat().fire > 0, win = T('window') * (fire ? 1.5 : 1);
    const vy = Math.max(40, Math.abs(b.vy)), err = (b.y - YHIT) / vy, dx = b.x - bat.x;
    const ok = b.phase === 'delivery' && b.z < 42 && Math.abs(dx) < 24 && Math.abs(err) < win * 1.25;
    if (!ok) { sw.miss = true; emit('swing:miss', { err, dx, z: b.z }); return; }
    let q = clamp(1 - Math.abs(err) / win, 0, 1), perfect = Math.abs(err) < win * .22;
    if (sw.type === 'defend') q = clamp(q + .35, 0, 1);
    const edgeP = clamp((Math.abs(err) - win * .62) / (win * .5), 0, 1) * (fire ? .3 : 1) * diff.edge * (sw.type === 'defend' ? .3 : 1);
    const edge = rF() < edgeP;
    const aim = sw.aim && (sw.aim[0] || sw.aim[1]) ? (() => { const l = hyp(sw.aim[0], sw.aim[1]); return [sw.aim[0] / l, sw.aim[1] / l]; })() : [0, 1];
    const v = shotVelocity(b, sw.type, aim, err, q, fire, edge, rF);
    b.phase = 'live'; b.carried = true; b.bounces = 0; b.pitched = true; b.rolling = false;
    b.vx = v.vx; b.vy = v.vy; b.vz = v.vz; b.hitBy = bat.id; b.x = bat.x; b.y = YHIT; b.z = Math.max(b.z, 4); b.fire = fire;
    M.hit = { q, err, perfect, edge, type: sw.type, fire, power: hyp(v.vx, v.vy), phi: v.phi, tried: {}, boundaryCert: false };
    M.ph = 'inplay'; M.t = 0; M.hold = 0; M.chaseT = 0; M.runs = 0; M.restEnd0 = M.batters[0].end;
    if (perfect) hypeAdd(M.bat, 12);
    emit('contact', { q, perfect, edge, type: sw.type, fire, power: M.hit.power, err });
    // dangerous hits get an early boundary certainty so the AI doesn't run needlessly
    const pr = predictUntil(b, c => rho(c.x, c.y) >= 1 || c.vx * c.vx + c.vy * c.vy < 16, 5);
    M.hit.boundaryCert = pr.hit && rho(pr.b.x, pr.b.y) >= 1;
  }
  function trackDelivery(dt) {
    const b = M.ball;
    // the batter tracks the line of the ball
    const bat = strikerOf(); const pr = M.trackX != null ? M.trackX : CX;
    if (!bat.swingStop) {
      const px_ = predictPlane(b).b.x, tx = clamp(px_, CX - 18, CX + 18);
      bat.x += clamp(tx - bat.x, -dt * 150, dt * 150);
    }
    if (M.swing && !M.swing.done && M.swing.t >= SWING_DELAY) { resolveContact(); }
    if (M.swing) { M.swing.t += dt; if (M.swing.t > SWING_DUR) { bat.swingT = -1; if (!M.swing.miss && M.ph === 'inplay') { /* hit */ } M.swing.over = true; } }
    if (M.ph !== 'flight') return;
    // stumps
    if (b.y <= SY + 3 && !M.stumpsDone) {
      if (Math.abs(b.x - CX) < 5.5 && b.z < 13) {
        M.stumpsDone = true; b.phase = 'dead'; M.bailsOff = 1.4; emit('stumps', { end: 0 });
        if (M.freeHit) { finish('wicket', { how: 'bowled' }); } else finish('wicket', { how: 'bowled', who: bname(strikerOf()) });
        return;
      }
    }
    // passes the batter's plane
    if (!M.planeDone && b.y <= YHIT - 6) {
      M.planeDone = true;
      const off = b.x - CX;
      if (!M.swing || M.swing.miss || !M.swing.done) {
        if ((off < -36 || off > 32 || b.z > 48) && !M.swing) { b.phase = 'live'; b.vx *= .4; b.vy *= .4; finish('wide'); return; }
        if (M.swing && M.swing.t > 0) { /* played and missed: carry on to the keeper */ }
        // pads: leg before wicket
        if (Math.abs(b.x - bat.x) < 7 && b.z < 22 && !M.swing) {
          const pr2 = predictUntil(b, c => c.y <= SY, 1);
          if (pr2.hit && Math.abs(pr2.b.x - CX) < 6 && pr2.b.z < 14 && b.pitched) {
            b.phase = 'dead'; emit('pad', {}); if (M.freeHit) { finish('runs', { runs: 0 }); } else finish('wicket', { how: 'lbw', who: bname(strikerOf()) }); return;
          }
          emit('pad', {});
        }
      }
    }
    // the keeper gathers
    if (b.y < SY - 28 && b.phase === 'delivery') {
      b.phase = 'held'; const k = M.fielders[1]; k.hasBall = true; b.holder = k; emit('keeper', {});
      if (M.swing && M.swing.miss) emit('beaten', {});
      finish('runs', { runs: 0 });
    }
  }

  /* ----- bowling: choose, run up, release meter, deliver ----- */
  function startRunup(type, human) {
    const B = sideBowl(), del = DELIVERIES[type];
    if (type === 'fire') { if (B.hype < 100) type = 'pace'; else { B.hype = 0; B.fire = 1; emit('fire:on', { side: 1 - M.bat, role: 'bowl' }); } }
    M.delType = type;
    const dur = type === 'spin' ? .95 : 1.25;
    M.runup = { t: 0, dur, type, meterStart: dur - 1.0, cross: .25, human, p: 0, released: false };
    M.ph = 'runup'; M.t = 0; emit('runup', { type });
  }
  function meterPos(R) {
    const tm = R.t - R.meterStart; if (tm <= 0) return 0;
    return clamp(.5 - .5 * Math.cos(TAU * T('meterSpeed') * tm), 0, 1);
  }
  function release(R) {
    const del = DELIVERIES[R.type], p = meterPos(R); R.p = p; R.released = true;
    const d = Math.abs(p - .5), over = p > .94 && R.human;
    const grade = d < .16 ? 'green' : d < .32 ? 'amber' : 'red';
    const scatter = (grade === 'green' ? 2 : grade === 'amber' ? 8 : 14) * (M.cheat && !R.human ? .4 : 1), pace = grade === 'green' ? 1.02 : grade === 'amber' ? .92 : .82;
    const B = sideBowl(), fire = B.fire > 0 && R.type === 'fire';
    if (R.type === 'fire') { /* the special is always accurate */ }
    const gr = R.type === 'fire' ? { s: 1.5, p: 1.05 } : { s: scatter, p: pace };
    const sc = R.type === 'fire' ? 1.5 : scatter;
    const tx = clamp(M.marker[0] + rr(-1, 1, rB) * sc * 1.2, CX - 40, CX + 40), ty = clamp(M.marker[1] + rr(-1, 1, rB) * sc * 1.6, 372, 580);
    const b = newBall(); b.wet = M.wet; b.groundBounce = ground.pitchBounce * (M.wet ? .8 : 1);
    const rx = CX + (M.round ? -8 : 8) * 0 + 0, ry = BY - 8, rz = 36;
    const sp = del.sp * T('ballSpeed') * ground.speed * gr.p * (fire ? 1.15 : 1) * (R.human ? 1 : .94 + diff.scale * .06);
    const sol = solveDelivery(rx, ry, rz, tx, ty, sp);
    b.x = rx; b.y = ry; b.z = rz; b.vx = sol.vx; b.vy = sol.vy; b.vz = sol.vz; b.phase = 'delivery';
    const swingSign = (rB() < .5 ? -1 : 1);
    b.swingA = del.swing * swingSign; b.turn = del.turn * (rB() < .5 ? -1 : 1);
    b.seamDev = rnorm(rB) * del.seam * .035 * (M.wet ? 1.3 : 1);
    b.bounceMul = del.bounce * (ty > 500 ? 1.9 : 1) * (ty < 392 ? .9 : 1);
    b.golden = M.golden; b.kmh = Math.round(del.kmh * (sp / (del.sp * T('ballSpeed'))));
    // wild bowling gets a "wide" or an overstep; a yorker is a yorker
    M.ball = b; M.speedKmh = Math.round(del.kmh * gr.p * T('ballSpeed') * ground.speed * (fire ? 1.15 : 1));
    M.noBall = over || (b.z > 40 && false);
    if (R.human && ty < 392 && b.vz * 0 === 0) { /* full toss kinds are fine */ }
    M.stumpsDone = false; M.planeDone = false; M.grade = R.type === 'fire' ? 'green' : grade;
    M.ph = 'flight'; M.t = 0; M.release = { grade, p, over }; M.aft = .3; M.aftLeft = .3;
    emit('release', { type: R.type, grade, kmh: M.speedKmh, over, fire });
    if (M.noBall) { /* decided at the end of the ball: the call is made now */ emit('noball:call', {}); }
    planAfterRelease();
  }
  function planAfterRelease() {
    planBat();
  }
  M.planAfterRelease = planAfterRelease;

  /* ----- the main step ----- */
  M.step = function (dt, human) {
    human = human || {};
    M.clock += dt; M.t += dt;
    if (M.banner) { M.banner.t -= dt; if (M.banner.t <= 0) M.banner = null; }
    if (M.bailsOff > 0) M.bailsOff -= dt;
    if (M.umpire.signal > 0) M.umpire.signal -= dt;
    updateCow(dt);
    const batSide = sideBat(), bowlSide = sideBowl();
    const batHuman = human.bat != null && !M.cheat, bowlHuman = human.bowl != null;
    const bi = human.bat || (M.ph === 'flight' || M.ph === 'inplay' || M.ph === 'setup' ? aiBat() : newIntent());
    let wi = human.bowl || (M.ph === 'setup' || M.ph === 'runup' ? aiBowl() : newIntent());
    if (human.bowl) wi.human = true;
    if (!human.bat && M.cheat) { /* autopilot batting already via aiBat */ }
    switch (M.ph) {
      case 'pre': case 'intro':
        if (M.t > (M.ph === 'intro' ? 2.2 : .8)) nextBall();
        break;
      case 'setup':
        // fielders settle; the bowling side picks a delivery
        if (bi.special) igniteBat(M.bat);
        if (wi.cycle) { M.setField(M.field === 'balanced' ? 'attack' : M.field === 'attack' ? 'defend' : 'balanced'); emit('field', { f: M.field }); }
        if (bowlHuman) {
          M.marker[0] = clamp(M.marker[0] + wi.mx * 120 * dt, CX - 36, CX + 36);
          M.marker[1] = clamp(M.marker[1] + wi.my * 130 * dt, 372, 560);
          if (wi.aimPoint) { M.marker[0] = clamp(wi.aimPoint[0], CX - 36, CX + 36); M.marker[1] = clamp(wi.aimPoint[1], 372, 560); }
        }
        if (wi.bowl) {
          if (M.hub && cfg.rngB) { /* deterministic hub deliveries */ }
          startRunup(wi.bowl, !!bowlHuman);
        }
        break;
      case 'runup': {
        const R = M.runup; R.t += dt;
        if (R.human) {
          M.marker[0] = clamp(M.marker[0] + wi.mx * 60 * dt, CX - 36, CX + 36);
          M.marker[1] = clamp(M.marker[1] + wi.my * 65 * dt, 372, 560);
        }
        if (R.type === 'fire' && R.t > .35) release(R);
        else if ((wi.release || wi.bowl) && R.t > R.meterStart + .05 && !R.released) release(R);
        else if (R.t >= R.dur && !R.released) release(R);
        const bf = M.fielders[0]; bf.x = lerp(CX + 8, CX + 4, R.t / R.dur); bf.y = lerp(BY + 80, BY - 8, clamp(R.t / R.dur, 0, 1)); bf.face = -Math.PI / 2; bf.vx = 0; bf.vy = -(88 / R.dur);
        break; }
      case 'flight': {
        const b = M.ball;
        if (M.aftLeft > 0 && b.phase === 'delivery' && !b.pitched) { M.aftLeft -= dt; if (wi.mx) b.vx += wi.mx * 160 * dt; }
        if (bi.special) igniteBat(M.bat);
        if (bi.shot && !M.swing) startSwing(bi.shot, bi.aim);
        const ev = stepBall(b, dt); if (ev === 'pitched') emit('pitched', { x: b.x, y: b.y });
        trackDelivery(dt);
        const bf = M.fielders[0]; if (bf) { bf.y = Math.max(bf.y - 30 * dt, BY - 40); bf.vy = -30; bf.vx = 0; }
        break; }
      case 'inplay': {
        const b = M.ball;
        if (M.swing && !M.swing.over) { M.swing.t += dt; if (M.swing.t > SWING_DUR) { M.swing.over = true; strikerOf().swingT = -1; } }
        updateRun(dt, bi);
        if (b.phase === 'live') {
          const ev = stepBall(b, dt); if (ev === 'bounce') emit('bounce', { x: b.x, y: b.y });
        }
        updateFielders(dt, wi);
        tryCatch(); if (M.ph !== 'inplay') break;
        checkBoundary(); if (M.ph !== 'inplay') break;
        cowCheck(); if (M.ph !== 'inplay') break;
        // the ball is dead once it is in a fielder's hands and nobody is running
        const running = M.batters.some(bb => bb.moving);
        if (b.phase === 'held' && !running && M.hold > .3) {
          finish(M.runs > 0 ? 'runs' : 'runs', { runs: M.runs, perfect: M.hit && M.hit.perfect && M.runs > 0 });
        } else if (M.t > 28 || (b.phase === 'live' && rho(b.x, b.y) > 1.5)) finish('runs', { runs: M.runs });
        break; }
      case 'between': {
        if (M.t < 0.05) { /* just ended */ }
        updateFielders(dt, null);
        for (const bb of M.batters) bb.moving = false;
        if (M.t > 2.0) { M.t = 0; afterBetween(); }
        break; }
      default: break;
    }
    // bowler follow-through & batter swing timers
    const st = strikerOf(); if (st && st.swingT >= 0 && M.ph !== 'flight' && M.ph !== 'inplay') st.swingT = -1;
    if (st && st.swingT >= 0) st.swingT += dt;
    if (M.ph === 'inplay' && st && st.swingT > SWING_DUR) st.swingT = -1;
    if (M.ph === 'inplay' && M.hit && M.ball.phase === 'live') { M.ball.trail.push([M.ball.x, M.ball.y, M.ball.z]); if (M.ball.trail.length > 16) M.ball.trail.shift(); }
    else if (M.ph === 'flight') { M.ball.trail.push([M.ball.x, M.ball.y, M.ball.z]); if (M.ball.trail.length > 10) M.ball.trail.shift(); }
    // the batter who is not out on strike
    for (const b of M.batters) { if (!b.moving && M.ph !== 'inplay' && M.ph !== 'flight') { b.y = b.end === 0 ? CR0 : CR1; } }
  };

  M.endMatch = endMatch;
  M.start = function () { startInnings(); };
  M.winnerName = () => (M.result && M.result.winner >= 0 ? TEAMS[M.sides[M.result.winner].team].name : null);
  M.snapshot = () => ({ ph: M.ph, inn: M.inn, bat: M.bat, score: M.sides.map(s => s.score), wkts: M.sides.map(s => s.wkts), balls: M.sides.map(s => s.balls), hype: M.sides.map(s => Math.round(s.hype)), fire: M.sides.map(s => s.fire), last: M.last, ball: [Math.round(M.ball.x), Math.round(M.ball.y), Math.round(M.ball.z)], result: M.result, target: M.target, ballNo: M.ballNo, over: M.over });
  return M;
}
