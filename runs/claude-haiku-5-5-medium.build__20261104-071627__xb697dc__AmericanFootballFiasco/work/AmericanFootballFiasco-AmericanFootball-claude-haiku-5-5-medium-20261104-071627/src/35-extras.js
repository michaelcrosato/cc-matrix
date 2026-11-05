/* AMERICAN FOOTBALL FIASCO: the extras of the match. The referee and the late hit's flag, the mascot's run across the turf, the
 * flying helmets of the Big Hits, the Fiasco meter and its cards, LIGHTS OUT, the instant replay (the last few seconds, slowed,
 * from a camera angle), the Play Lab (the plays, measured), and the practice drills. The sim calls these hooks; they read and
 * write the sim's state (S). */
(() => {
'use strict';
const FF = window.FF, E = FF.E, D = FF.data, S = FF.sim, A = FF.A, { clamp } = FF;
const X = S.extras = { clips: [], label: '', helmets: [], mascot: null, flagT: 0, hist: [], recT: 0, replay: null, angle: 0, lightsT: 0, lightsDone: false, meter: 0, card: null, drill: null, lab: null, lateTimer: 0, lastSpot: 0 };
const PI = Math.PI;

/* ---- the Fiasco meter and its cards: team 0's turnovers fill it; full, the next call can fire a card (juke) ---- */
D.FISCO_CARDS = [
  { key: 'rocket', name: 'ROCKET CLEATS', desc: 'Unlimited turbo for one play.' },
  { key: 'magnet', name: 'MAGNET GLOVES', desc: 'Every catch is a sure catch this play.' },
  { key: 'arm', name: 'CANNON ARM', desc: 'The next throw is fast and flat.' }
];
X.fill = n => { if (X.meter >= 100) return; X.meter = Math.min(100, X.meter + n); };
X.useCard = () => {
  if (X.meter < 100) return false;
  const c = D.FISCO_CARDS[(S.rng() * D.FISCO_CARDS.length) | 0];
  X.card = c.key; X.cardName = c.name; X.meter = 0;
  S.msg = 'FISCO CARD: ' + c.name + '!'; S.msgT = 2.2; A.sfx('select');
  return true;
};
X.throwFactor = () => (X.card === 'arm' ? .6 : 1);
X.catchChance = (covered, base) => (X.card === 'magnet' ? 1 : base);
X.turboFree = s => X.card === 'rocket' && s === S.poss;

/* ---- the referee, the flag, the late hit: a defender's hit after the whistle is a flag, five yards to the offense ---- */
X.enter = () => {
  if (!FF.L) return;
  FF.L.enabled = true; FF.L.ambient = .55;
  X.ref = new E.Humanoid({ build: 'bulky', weapon: null, hat: 'band', sleeves: 'long', colors: { cloth: '#f2f2f2', pants: '#1a1a1e', boot: '#101010', hair: '#3a3a3a', skin: '#c89070', trim: '#202020' } });
  X.refX = S.los;
};
X.onEnd = (kind, spot) => {
  X.lastSpot = spot; X.card = null; X.cardName = null; X.lateTimer = 0.6;
  X.lateSide = S.poss;
  if (S.drill) X.drillEnd(kind, spot);
};
// the late hit: a human defender presses hit in the first moments after the whistle, near where the play ended
X.lateCheck = () => {
  for (const d of S.all) {
    if (d.side === S.poss || d.down) continue;
    const I = S.ctrlOf(d.side); if (!I || !I.pressed('hit')) continue;
    if (Math.abs(d.x - X.lastSpot) > 26 || Math.abs(d.y - S.ball.y) > 26) continue;
    I.consume('hit'); X.lateTimer = 0;
    S.los = clamp(S.los + S.atkDir(S.poss) * 5 * D.YD, D.FX0 + 1, D.FX1 - 1);
    S.msg = 'LATE HIT! FIVE YARDS'; S.msgT = 2.6; S.stats.lateHits = (S.stats.lateHits || 0) + 1;
    X.flagT = 2.4; FF.radio('Flag on the play! Late hit, five yards, and the referee is not happy about it.', 3);
    FF.game.shake(3); A.sfx('whistle');
    return;
  }
};

/* ---- the mascot: a runner across the turf on a big play, the whole crowd on its feet ---- */
X.mascotStart = () => {
  const yFrom = S.rng() < .5 ? D.FY0 - 24 : D.FY1 + 24;
  X.mascot = { x0: D.FX0 + 60, y0: yFrom, x1: D.FX1 - 60, y1: D.FY0 + D.FY1 - yFrom, x: D.FX0 + 60, y: yFrom, t: 0, dur: 3.2, blob: new E.Blob({ R: 6, colors: { dk: '#5a1020', base: '#8a2a3a', lt: '#f0c040', spec: '#ffffff', eye: '#ffffff', pupil: '#111111' }, ears: 'rabbit', feet: true, mouth: true }) };
  FF.radio('And here comes the Fiasco Falcon, the mascot, at a dead sprint, and the falcon is not looking where it is going.', 3);
};

/* ---- the flying helmet: a Big Hit sends it up and over, spinning, into the crowd ---- */
const HELMET = E.sprite(['.hhhh.', 'hhhhhh', 'hffffh', '.hhhh.'], { h: '#f0c040', f: '#8a909c' });
X.helmetFly = (x, y, a) => X.helmets.push({ x, y, z: 14, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, vz: 130, t: 0 });
X.onBigHit = (victim, mega, a) => {
  X.helmetFly(victim.x, victim.y, a);
  X.fill(mega ? 20 : 8);
  if (mega) { X.label = 'MEGA HIT'; X.requestReplay(); }
  if (mega && S.rng() < .5) X.mascotStart();
};
X.onTurnover = (side, kick) => { if (side === 0 && !kick) X.fill(25); };
X.onTouchdown = s => { if (s === 0) X.fill(12); X.label = 'TOUCHDOWN'; X.requestReplay(); if (S.rng() < .5) X.mascotStart(); };

/* ---- LIGHTS OUT: the stadium goes dark for a few seconds, and the lamps on the players are all there is ---- */
X.lightsOutTriggers = () => S.cfg && (S.cfg.chapter && S.cfg.chapter.lightsOut || FF.tune.lightsOut);
X.maybeLightsOut = () => {
  if (X.lightsDone || !X.lightsOutTriggers()) return;
  if (S.qtr === (FF.tune.lightsOut ? 2 : 4) && S.clock < 60) { X.lightsDone = true; X.lightsT = 7; S.msg = 'LIGHTS OUT!'; S.msgT = 2.4; FF.radio('LIGHTS OUT! The stadium is dark, and the crowd is screaming in the dark.', 3); }
};

/* ---- the instant replay: the last few seconds (ten frames a second), slowed, from one of three angles ---- */
X.record = dt => {
  if (S.phase !== 'live' && S.phase !== 'kick') return;
  X.recT -= dt; if (X.recT > 0) return;
  X.recT = .1;
  X.hist.push({ p: S.all.map(p => [p.x, p.y, p.f, p.down > 0 ? 1 : 0]), b: [S.ball.x, S.ball.y, S.ball.z] });
  if (X.hist.length > 26) X.hist.shift();
};
X.requestReplay = () => { if (!X.replay && X.hist.length > 6) X.pending = true; };
X.startReplay = () => {
  X.pending = false; X.angle = (X.angle + 1) % 3;
  X.replay = { frames: X.hist.slice(), i: 0 };
  // the highlight reel: the last few clips of the match, kept with their words
  if (X.clips.length < 6) X.clips.push({ label: X.label || 'HIGHLIGHT', frames: X.hist.slice() });
  FF.game.setZoom(X.angle === 0 ? 1.2 : X.angle === 1 ? .7 : 1.6);
};
X.replaying = () => !!X.replay;
X.replayStep = dt => {
  const R = X.replay; if (!R) return;
  R.i += dt * 5;
  const f = R.frames[Math.min(R.frames.length - 1, Math.floor(R.i))];
  f.p.forEach((a, k) => { const p = S.all[k]; if (p) { p.x = a[0]; p.y = a[1]; p.f = a[2]; p.down = a[3]; } });
  S.ball.x = f.b[0]; S.ball.y = f.b[1]; S.ball.z = f.b[2]; S.ball.mode = 'dead'; S.ball.holder = null;
  if (R.i >= R.frames.length) { X.replay = null; FF.game.resetCamera(); }
};
// the reel: the clips one after another, slowed, each with its name
X.reel = { i: 0, on: false };
X.reelNext = () => {
  const R = X.reel; if (R.i >= X.clips.length) { R.on = false; return false; }
  const c = X.clips[R.i++]; R.on = true; X.label = c.label; X.replay = { frames: c.frames, i: 0 }; FF.game.setZoom(1.2);
  return true;
};

/* ---- the per-step: the helmets fly, the mascot runs, the flag and the lights count down, the late-hit window closes ---- */
X.update = dt => {
  for (const h of X.helmets) { h.t += dt; h.x += h.vx * dt; h.y += h.vy * dt; h.vx *= Math.exp(-dt * .8); h.vy *= Math.exp(-dt * .8); h.vz -= 300 * dt; h.z += h.vz * dt; if (h.z < 0 && h.vz < 0) { h.z = 0; h.vz = -h.vz * .3; } }
  X.helmets = X.helmets.filter(h => h.t < 3.5);
  if (X.mascot) { const m = X.mascot; m.t += dt; const u = Math.min(1, m.t / m.dur); m.x = m.x0 + (m.x1 - m.x0) * u; m.y = m.y0 + (m.y1 - m.y0) * u; m.blob.update(dt, { squash: Math.sin(m.t * 12) * .15, walk: 1, look: [1, 0] }); if (m.t > m.dur) X.mascot = null; }
  X.flagT = Math.max(0, X.flagT - dt); X.lightsT = Math.max(0, X.lightsT - dt); X.lateTimer = Math.max(0, X.lateTimer - dt);
  if (X.lateTimer > 0 && S.phase === 'dead') X.lateCheck();
  if (X.lightsT > 0) X.dark = true; else X.dark = false;
  if (S.phase === 'live') X.maybeLightsOut();
  X.record(dt);
  if (X.pending && (S.phase === 'score' || S.phase === 'dead')) X.startReplay();
  if (X.ref && X.refX !== undefined) { X.refX += (S.ball.x - X.refX) * Math.min(1, dt * 2); X.ref.update(dt, { x: X.refX, y: D.FY1 + 20, z: 0, vx: 0, vy: 0, facing: -PI / 2 }); }
};
// (the drawing)
X.draw = r => {
  if (X.ref) r.actor(X.refX, D.FY1 + 20, 0, (g, ox, oy) => X.ref.draw(g, ox, oy, E.charView(r.view)));
  if (X.flagT > 0 && X.ref) r.queue(X.refX, D.FY1 + 20, 40, g => { const [x, y] = r.w(X.refX, D.FY1 + 20, 40); E.font.text(g, 'FLAG', Math.round(x), Math.round(y), '#ffd928', { align: 'center', font: 'tiny', outline: '#000' }); });
  for (const h of X.helmets) r.queue(h.x, h.y, h.z + 2, g => { const [x, y] = r.w(h.x, h.y, h.z + 2); FF.px.sprite(g, HELMET, Math.round(x) - 2, Math.round(y) - 2); });
  if (X.mascot) { const m = X.mascot; r.shadow(m.x, m.y, 6, .35); r.actor(m.x, m.y, 0, (g, ox, oy) => m.blob.draw(g, ox, oy, E.charView(r.view))); }
};

/* ---- THE PLAY LAB: the plays, measured. CPU against CPU, every card in turn, the yards and the results tallied ---- */
X.labStart = (plays) => {
  X.lab = { plays, n: 0, rows: {}, ci: 0, cards: D.CARDS.filter(k => D.PLAYS[k].kind !== 'kick') };
  S.log = [];
  S.start({ attract: true, human: null, chapter: { title: 'LAB', opp: 1, difficulty: 1, quarter: 9999 }, seed: 1234 });
  S.clock = 9999;
};
X.labStep = budget => {
  const L = X.lab; if (!L) return false;
  for (let k = 0; k < budget && L.n < L.plays; k++) {
    if (S.phase === 'call') { S.pickCall(L.cards[L.ci++ % L.cards.length]); }
    S.update(1 / 120);
    if (S.log.length && S.log.length > L.n) { const e = S.log[S.log.length - 1]; L.n = S.log.length; const row = L.rows[e.p] || (L.rows[e.p] = { plays: 0, yards: 0, td: 0, to: 0 }); row.plays++; row.yards += e.g; if (e.to === 'td') row.td++; if (e.to === 'turnover') row.to++; }
    if (S.phase === 'final' || S.over) { S.start({ attract: true, human: null, chapter: { title: 'LAB', opp: 1, difficulty: 1, quarter: 9999 }, seed: 1234 + L.n }); S.clock = 9999; }
  }
  return L.n >= L.plays;
};
// the endPlay log for the lab, in the sim
X.logPlay = (gain, kind) => { if (S.log) S.log.push({ p: S.play, g: gain, to: kind === 'td' ? 'td' : kind === 'turnover' ? 'turnover' : kind }); };

/* ---- PRACTICE DRILLS: three reps each. JUKE THE LINE (run past one man), HIT THE MARK (a Big Hit on the one man in
 * the way), THROW THE ROUTE (a go route: the catch for ten yards or more). The rest of the field lies down for the drill. ---- */
D.DRILLS = [
  { key: 'juke', name: 'JUKE THE LINE', play: 'RUN_IN', desc: 'Run past the one man in your way and get ten yards clear.' },
  { key: 'hit', name: 'HIT THE MARK', play: 'RUN_IN', desc: 'Hit the one man in the way. A Big Hit counts.' },
  { key: 'throw', name: 'THROW THE ROUTE', play: 'GO', desc: 'Throw the go route. A catch of ten yards or more counts.' }
];
X.startDrill = key => {
  const dr = D.DRILLS.find(d => d.key === key) || D.DRILLS[0];
  X.drillCfg = dr;
  return dr;
};
X.setupDrill = dr => {
  // the drill's own setup: the defense lies down except the one man who matters, placed in the carrier's way
  S.drill = { key: dr.key, name: dr.name, reps: 0, done: 0, need: 3, play: dr.play, bigHits0: 0, pass0: 0, los0: S.los };
  for (const p of S.all) if (p.side !== S.poss && p.role !== 'CB1' && p.role !== 'LB1') p.down = 999;
  const target = S.all.find(p => p.side !== S.poss && p.role === 'LB1');
  if (target && dr.key !== 'throw') { const a = S.atkDir(S.poss); target.down = 0; target.x = S.los + a * 9 * D.YD; target.y = D.FYM; target.f = a > 0 ? PI : 0; }
  X.drillSnap();
};
X.drillEnd = (kind, spot) => {
  const d = S.drill, a = S.atkDir(S.poss);
  let ok = false;
  if (d.key === 'juke') ok = kind !== 'tackle' && (spot - d.los0) * a / D.YD >= 10;
  if (d.key === 'hit') ok = S.stats.bigHits > d.bigHits0;
  if (d.key === 'throw') ok = S.stats.pass > d.pass0 && kind !== 'turnover' && (spot - d.los0) * a / D.YD >= 10;
  d.reps++; if (ok) d.done++;
  S.msg = ok ? 'DRILL: GOOD!' : 'DRILL: NOT THIS TIME'; S.msgT = 2;
  if (d.reps >= d.need) { S.over = true; S.drillDone = d.done; }
};
X.drillSnap = () => { if (S.drill) { S.drill.los0 = S.los; S.drill.bigHits0 = S.stats.bigHits; S.drill.pass0 = S.stats.pass; } };
})();
