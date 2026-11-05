// ---- the match: config, sides, innings and scorecards, the laws (5.7), boundaries, result and Super Over, the Kerfuffle
// Method. The per-ball play (the delivery director) is in 22-play.js; controllers (human and CPU) in 23-ai.js.
const SETTINGS_DEFAULT = { assistField: 'Assisted', running: 'Manual', marker: true, timing: true, replays: 'Big moments', captions: true, voices: true };
function S(k) { const v = game && game.settings ? game.settings[k] : undefined; return v === undefined ? SETTINGS_DEFAULT[k] : v; }

function normConfig(c) {
  return Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, difficulty: difficulty, kerfuffle: true, timeOfDay: null, weather: null,
    humans: [[], []], seed: (Math.random() * 1e9) >>> 0, superOver: true, reviews: 1, chapter: null, scenario: null, batFirst: null, cheat: null, toss: false, script: null, noReplays: false }, c);
}

class Match {
  constructor(cfg) {
    this.cfg = cfg = normConfig(cfg);
    difficulty = cfg.difficulty || difficulty;
    reseed(cfg.seed);
    this.g = GROUNDS[cfg.ground];
    this.time = cfg.timeOfDay || this.g.time; this.weather = cfg.weather || this.g.weather;
    this.env = { bounce: this.g.bounce, turn: this.g.turn, seam: this.g.seam, outfield: this.g.outfield, sand: !!this.g.sand, wet: this.weather === 'rain' };
    this.teams = cfg.teams.map(id => TEAM[id]);
    this.squads = this.teams.map(squad);
    this.humans = cfg.humans.map(h => h.slice());
    this.inn = []; this.i = -1;
    this.hype = [0, 0]; this.items = [null, null]; this.fire = { bat: 0, bowl: 0, batOn: false, bowlOn: false, batBalls: 0, bowlBalls: 0 };
    this.targetsHit = []; this.flags = {}; this.sixes = [0, 0]; this.fours = [0, 0]; this.chaosActive = {}; this.chaosLog = [];
    this.ball = newBall(); this.holos = [];
    this.state = 'pre'; this.st = 0; this.t = 0;
    this.result = null; this.superOver = false; this.soStats = null;
    this.events = []; this.callouts = []; this.records = [];
    this.fieldPreset = ['balanced', 'balanced']; this.overRound = 'over';
    this.marker = { x: 0, y: 110 }; this.token = null; this.revisedTarget = null; this.rainDone = false;
    this.dev = { forceDelivery: null, forceOutcome: null, invincible: false, infiniteHype: false, alwaysFire: false, noChaos: false };
    this.special = null; this.pendingSpecial = [null, null]; this.effects = {};
    this.bonusThisBall = 0; this.ballNo = 0; this.lastDecision = null;
    this.reviewsLeft = [cfg.reviews, cfg.reviews];
    this.fielders = []; this.batters = []; this.umps = [];
    this.won = false;
    if (cfg.scenario) this._scenario(cfg.scenario); else this._startInnings(this._firstBat());
  }
  get I() { return this.inn[this.i]; }
  get batT() { return this.I.bat; }
  get bowlT() { return 1 - this.I.bat; }
  _firstBat() { const f = this.cfg.batFirst; if (f) return this.cfg.teams.indexOf(f) < 0 ? 0 : this.cfg.teams.indexOf(f); return 0; }
  _scenario(sc) {
    // a story chapter that starts in the second innings: the first innings is on the card already
    const first = this.cfg.teams.indexOf(sc.battingFirst);
    this._startInnings(first < 0 ? 0 : first);
    const I = this.I; I.runs = sc.firstRuns; I.legal = I.overs * 6; I.wkts = Math.min(this.cfg.wickets - 1, 4); I.done = true;
    const sq = this.squads[I.bat]; let left = sc.firstRuns;
    for (let k = 0; k < 6 && left > 0; k++) { const r = Math.min(left, k === 0 ? Math.ceil(sc.firstRuns * .4) : Math.ceil(left / 2)); I.cards[k].runs = r; I.cards[k].balls = Math.max(1, Math.round(r * .9)); left -= r; if (k < I.wkts) I.cards[k].out = 'caught'; }
    this._startInnings(1 - I.bat);
  }
  _startInnings(batT, o = {}) {
    const so = !!o.superOver, overs = so ? 1 : this.cfg.overs, wk = so ? 2 : Math.min(10, this.cfg.wickets);
    const sq = this.squads[batT];
    const I = { bat: batT, runs: 0, wkts: 0, legal: 0, extras: { wd: 0, nb: 0, b: 0, lb: 0 }, bonus: 0, fours: 0, sixes: 0, overs, wmax: wk, so,
      cards: sq.map(p => ({ p, runs: 0, balls: 0, fours: 0, sixes: 0, out: null })), next: 2, bowl: {}, bowler: null, lastBowler: null, over: [], overs_: [], log: [], freeHit: false, target: null, done: false, dotsThisOver: 0, runsThisOver: 0 };
    if (so) { const order = this._soOrder(batT); I.order = order; I.next = 2; }
    else I.order = sq.map((p, k) => k);
    const mi = sq.findIndex(p => p.machine); if (mi >= 0 && !so) I.order = I.order.filter(k => k !== mi).concat([mi]);
    const ov = this.cfg.order && this.cfg.order[this.teams[batT].id];
    if (ov && !so) { const first = ov.map(id => sq.findIndex(p => p.id === id)).filter(k => k >= 0); I.order = first.concat(I.order.filter(k => !first.includes(k))); }
    I.strikeCard = I.order[0]; I.nonCard = I.order[1];
    this.inn.push(I); this.i = this.inn.length - 1;
    if (this.i >= 1) { const prev = this.inn[this.i - 1]; if (!so || prev.so) I.target = prev.runs + 1; }
    if (so && !this.inn[this.i - 1].so) I.target = null;
    if (so && this.inn[this.i - 1].so) I.target = this.inn[this.i - 1].runs + 1;
    this.revisedTarget = null;
    this.reviewsLeft = [this.cfg.reviews, this.cfg.reviews];
    this.fire = { bat: 0, bowl: 0, batOn: false, bowlOn: false, batBalls: 0, bowlBalls: 0 };
    this.fieldPreset[this.bowlT] = 'balanced';
    this._newOver(true);
    emit('innings:start', { n: this.i, team: this.teams[batT].code });
  }
  _soOrder(t) { // the Super Over: the side's three best batters
    const sq = this.squads[t]; return sq.map((p, k) => [k, p.bat * 2 + p.pow]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  }
  target() { return this.revisedTarget || this.I.target; }
  need() { const t = this.target(); return t ? Math.max(0, t - this.I.runs) : null; }
  ballsLeft() { return this.I.overs * 6 - this.I.legal; }
  overStr(I = this.I) { return Math.floor(I.legal / 6) + '.' + (I.legal % 6); }
  striker() { return this.I.cards[this.I.strikeCard]; }
  nonStriker() { return this.I.cards[this.I.nonCard]; }
  bowlerP() { return this.squads[this.bowlT].find(p => p.id === this.I.bowler); }
  bowlCard(id = this.I.bowler) { const B = this.I.bowl; return B[id] || (B[id] = { balls: 0, runs: 0, wkts: 0, maidens: 0, overs: 0 }); }
  maxOvers() { return Math.max(1, Math.ceil(this.I.overs / 5)); }
  eligibleBowlers() {
    const sq = this.squads[this.bowlT], mx = this.maxOvers();
    let list = sq.filter(p => p.bowl && !p.keeper && (this.bowlCard(p.id).overs < mx) && p.id !== this.I.lastBowler);
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub' || this.cfg.netsMachine) { const m = sq.find(p => p.machine); if (m) return [m]; }
    if (this.cfg.boss && this.I.overs * 6 - this.I.legal <= 6 && this.teams[this.bowlT].id === 'thr') { const m = sq.find(p => p.machine); if (m) return [m]; }
    list = list.filter(p => !p.machine);
    if (!list.length) list = sq.filter(p => p.bowl && !p.keeper && !p.machine && p.id !== this.I.lastBowler);
    if (!list.length) list = sq.filter(p => p.bowl && !p.machine);
    return list;
  }
  _newOver(first) {
    const I = this.I;
    I.over = []; I.dotsThisOver = 0; I.runsThisOver = 0;
    this.overBallsBowled = 0;
    if (!first) { I.lastBowler = I.bowler; }
    I.bowler = null;   // chosen in 'between' by the captain (CPU) or the bowler picker (human)
  }
  setBowler(id) {
    const I = this.I; I.bowler = id; this.bowlCard(id);
    const p = this.bowlerP();
    if (p && p.bowl && p.bowl.fam === 'spin' && this.fieldPreset[this.bowlT] !== 'defensive') this.fieldPreset[this.bowlT] = 'spin';
    else if (this.fieldPreset[this.bowlT] === 'spin') this.fieldPreset[this.bowlT] = 'balanced';
    emit('bowler', { id, name: p ? p.short : id });
  }
  sideHumans(t) { return this.humans[t] || []; }
  isHumanSide(t) { return this.sideHumans(t).length > 0; }
  assistMode() { return this.cfg.assist || S('assistField'); }
  // the boundary: an ellipse centred on the middle of the pitch; the tide shrinks the sea side (x < 0) at the bay
  boundary() { const k = T('boundaryScale'); return { rx: this.g.rx * k, ry: this.g.ry * k, tide: this.tide || 0 }; }
  outside(x, y) { const b = this.boundary(), rx = x < 0 ? b.rx * (1 - b.tide) : b.rx; return (x / rx) ** 2 + ((y - 160) / b.ry) ** 2 > 1; }
  boundaryDist(dx, dy) { // distance from the striker's stumps (0, 0) to the rope along a direction
    let lo = 0, hi = 2000; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (this.outside(dx * m, dy * m)) hi = m; else lo = m; } return lo;
  }
  // apply a finished ball's record to the scorecard (pure bookkeeping): returns events
  applyBall(rec) {
    const I = this.I, ev = [], bc = this.bowlCard(), sc = I.cards[rec.strikerCard];
    const legal = !rec.wide && !rec.noBall;
    const extraRuns = (rec.wide ? 1 : 0) + (rec.noBall ? 1 : 0);
    let batRuns = rec.byes || rec.legByes ? 0 : rec.runs;
    let total = rec.runs + extraRuns + (rec.bonus || 0);
    if (rec.wide) { I.extras.wd += 1 + rec.runs; batRuns = 0; }
    if (rec.noBall) I.extras.nb += 1;
    if (rec.byes) I.extras.b += rec.runs;
    if (rec.legByes) I.extras.lb += rec.runs;
    I.runs += total; I.bonus += rec.bonus || 0;
    if (!rec.wide) { sc.balls++; sc.runs += batRuns; if (rec.boundary === 4 && !rec.byes) sc.fours++; if (rec.boundary === 6) sc.sixes++; }
    if (rec.boundary === 4 && !rec.byes) { I.fours++; this.fours[I.bat]++; }
    if (rec.boundary === 6) { I.sixes++; this.sixes[I.bat]++; }
    bc.runs += (rec.byes || rec.legByes) ? extraRuns : total - (rec.bonus || 0);
    if (legal) { I.legal++; bc.balls++; this.overBallsBowled++; }
    I.runsThisOver += total;
    if (rec.wicket) {
      I.wkts++;
      const out = I.cards[rec.wicket.card]; out.out = rec.wicket.how; out.by = rec.wicket.by;
      if (rec.wicket.how !== 'run out') bc.wkts++;
      ev.push(['wicket', rec.wicket]);
    }
    const sym = rec.wicket ? 'W' : rec.wide ? 'wd' : rec.noBall ? 'nb' : rec.boundary ? String(rec.boundary) : total ? String(total) : '•';
    I.over.push(sym); I.log.push(rec); this.records.push(rec);
    if (!rec.wicket && total === 0 && legal) I.dotsThisOver++;
    // the strike: odd runs swap it (the batters crossed); a new batter comes in at the end the dismissed one left
    const ends = rec.endsSwapped ? [I.nonCard, I.strikeCard] : [I.strikeCard, I.nonCard];
    if (rec.wicket) {
      const newCard = I.next < I.order.length ? I.order[I.next] : null; I.next++;
      const k = ends.indexOf(rec.wicket.card); if (k >= 0) ends[k] = newCard;
      if (newCard === null) I.allOut = true;
    }
    I.strikeCard = ends[0]; I.nonCard = ends[1];
    I.freeHit = !!rec.noBall;
    if (legal && I.legal % 6 === 0) {
      ev.push(['over:end', {}]);
      bc.overs++;
      if (I.runsThisOver === 0 && I.over.every(s => s === '•' || s === 'W')) { bc.maidens++; ev.push(['milestone', { kind: 'maiden' }]); }
      const s = I.strikeCard; I.strikeCard = I.nonCard; I.nonCard = s;   // a new over from the other end
    }
    if (this.inningsOver()) ev.push(['innings:end', {}]);
    return ev;
  }
  inningsOver() {
    const I = this.I, t = this.target();
    return I.wkts >= I.wmax || I.allOut || I.legal >= I.overs * 6 || (t && I.runs >= t) || I.wkts >= I.order.length - 1;
  }
  // after an innings: the next, a Super Over, or the result
  nextInnings() {
    const I = this.I; I.done = true;
    const so = I.so, n = this.inn.length;
    if (this.cfg.single && n === 1) return this._finish(I.bat, 'scored ' + I.runs + '/' + I.wkts);
    if (!so && n === 1) { this._startInnings(1 - I.bat); return 'innings'; }
    if (so && this.inn.filter(x => x.so).length === 1) { this._startInnings(1 - I.bat, { superOver: true }); return 'innings'; }
    // decide
    const a = this.inn[n - 2], b = this.inn[n - 1];
    if (a.runs === b.runs) {
      if (!so && this.cfg.superOver && this.cfg.mode !== 'showdown' && this.cfg.mode !== 'hub' && this.cfg.mode !== 'nets') {
        this.superOver = true; emit('superover', {});
        this._startInnings(b.bat, { superOver: true }); return 'superover';
      }
      if (so) {
        const ba = a.fours + a.sixes, bb = b.fours + b.sixes;
        if (ba !== bb) return this._finish(ba > bb ? a.bat : b.bat, 'on boundaries in the Super Over');
      }
      return this._finish(null, 'Match tied');
    }
    const wIdx = a.runs > b.runs ? a.bat : b.bat;
    let margin;
    if (wIdx === a.bat) margin = (a.runs - b.runs) + ' run' + (a.runs - b.runs === 1 ? '' : 's');
    else { const w = b.wmax - b.wkts; const spare = b.overs * 6 - b.legal; margin = w + ' wicket' + (w === 1 ? '' : 's') + (spare > 0 ? ', ' + spare + ' ball' + (spare === 1 ? '' : 's') + ' to spare' : ''); }
    return this._finish(wIdx, 'won by ' + margin + (so ? ' in the Super Over' : ''));
  }
  _finish(w, text) {
    const hum = this.humans.findIndex(h => h.length);
    this.result = { winner: w, text: w === null ? text : this.teams[w].name + ' ' + text, short: text };
    this.won = hum >= 0 ? w === hum : false;
    if (this.cfg.mode === 'story') this.won = w === this.cfg.teams.indexOf('ker');
    emit('match:end', { winner: w === null ? 'tie' : this.teams[w].code });
    return 'result';
  }
  // the Kerfuffle Method (5.7.5): resources R(o, w) = (o / O) (1 - 0.07 w)
  kerfuffleMethod(oversLost) {
    const I = this.I, O = I.overs, left = (O * 6 - I.legal) / 6, w = I.wkts, first = this.inn[this.i - 1];
    const Rb = (left / O) * (1 - .07 * w), Ra = (Math.max(0, left - oversLost) / O) * (1 - .07 * w);
    const t = Math.max(I.runs + 1, Math.floor(first.runs * Ra / Rb + 1e-9) + 1);   // the plan's formula: floor(first x R_after / R_before) + 1
    return { target: t, overs: Math.max(Math.ceil(I.legal / 6) || 1, O - oversLost) };
  }
  applyRain(oversLost) {
    const I = this.I; if (this.i < 1 || I.so) { I.overs = Math.max(Math.ceil((I.legal + 1) / 6), I.overs - oversLost); return null; }
    const r = this.kerfuffleMethod(oversLost);
    I.overs = Math.max(Math.ceil((I.legal + 1) / 6), r.overs); this.revisedTarget = r.target;
    return r;
  }
  // the batting/bowling human for a role: batting: the striker's player; bowling: alternate overs; fielding: the other
  ctlFor(role) {
    const I = this.I, tb = role === 'bat' || role === 'run' || role === 'runNon' ? I.bat : 1 - I.bat, hs = this.sideHumans(tb);
    if (this.cfg.cheat || (role === 'bat' || role === 'run' || role === 'runNon') && this.dev.autoBat || (role === 'bowl' || role === 'field') && this.dev.autoBowl) return null;
    if (!hs.length) return null;
    if (role === 'bat') return hs[(I.strikeCard) % hs.length];
    if (role === 'run') return hs[(I.strikeCard) % hs.length];
    if (role === 'runNon') return hs.length > 1 ? hs[(I.nonCard) % hs.length] : null;
    const ov = Math.floor(I.legal / 6);
    if (role === 'bowl') return hs[ov % hs.length];
    if (role === 'field') return hs[(ov + (hs.length > 1 ? 1 : 0)) % hs.length];
    if (role === 'review') return hs[0];
    return hs[0];
  }
  hypeAdd(t, n, why) {
    if (!this.cfg.kerfuffle) return;
    const before = this.hype[t]; this.hype[t] = clamp(this.hype[t] + n * T('hypeGain'), 0, 100);
    if (before < 100 && this.hype[t] >= 100) emit('hype:full', { team: t });
  }
  // what a ball would be called right now (for the HUD and commentary)
  scoreStr(I = this.I) { return I.runs + '/' + I.wkts; }
}
