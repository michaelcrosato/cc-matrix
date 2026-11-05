/* ---- THE MATCH: a pure simulation of innings, overs, the delivery director, batting, bowling, fielding, running, the
 * umpire, Hype and the arcade layer. It runs in fixed steps (G.DT) with a seeded RNG (the play stream), emits events
 * for the presentation, and takes human input through its methods. Every state has a timeout, so play cannot stall.
 *
 * Director: innings -> setup -> runup -> flight -> play -> dead -> between (-> setup, or break, or end). ---- */
const CONTACT_Y = 452;                       // the front-foot contact plane: 16 units in front of the batter's crease
const FAMILIES = ['pace', 'spin', 'swing', 'medium'];   // a team's bowlers in order: the first is the quick, the second the spinner
G.PRESETS = {
  attacking: [[165, 190, 'slip'], [158, 190, 'slip'], [132, 200, 'gully'], [95, 230, 'point'], [58, 260, 'cover'], [14, 300, 'mid-off'], [-14, 300, 'mid-on'], [-160, 300, 'fine-leg'], [151, 320, 'third-man']],
  balanced: [[165, 190, 'slip'], [95, 240, 'point'], [55, 270, 'cover'], [12, 320, 'mid-off'], [-12, 320, 'mid-on'], [-60, 270, 'mid-wkt'], [-95, 250, 'sq-leg'], [-160, 300, 'fine-leg'], [155, 300, 'third-man']],
  defensive: [[95, 260, 'point'], [55, 360, 'deep-cover'], [12, 360, 'long-off'], [-12, 360, 'long-on'], [-60, 360, 'deep-mid-wkt'], [-95, 360, 'deep-sq'], [-160, 340, 'fine-leg'], [155, 340, 'third-man'], [40, 260, 'cover']],
  spin: [[160, 110, 'slip'], [-100, 100, 'short-leg'], [100, 100, 'silly-point'], [55, 240, 'cover'], [12, 280, 'mid-off'], [-12, 280, 'mid-on'], [-60, 240, 'mid-wkt'], [-95, 360, 'deep-sq'], [-15, 360, 'long-on']]
};
G.PRESET_ORDER = ['attacking', 'balanced', 'defensive', 'spin'];
G.PRESET_LABEL = { attacking: 'ATTACKING', balanced: 'BALANCED', defensive: 'DEFENSIVE', spin: 'SPIN ATTACK' };
// a spot in the batter's frame (degrees from straight, + off side) at a distance from the pitch's middle
G.presetSpot = (theta, dist, hand = 1) => {
  const r = theta * PI / 180;
  return { x: 576 - hand * Math.sin(r) * Math.min(dist, 520), y: 576 + Math.cos(r) * Math.min(dist, 500) };
};

G.Match = class Match {
  constructor(cfg) {
    this.cfg = Object.assign({ overs: 2, wickets: 5, kerf: true, batFirst: 0, teams: [0, 1], ground: 'green', seed: 1 }, cfg);
    this.ground = G.GROUNDS[this.cfg.ground] || G.GROUNDS.green;
    this.env = G.envOf(this.ground);
    this.rng = E.rng(this.cfg.seed);
    this.t = 0;                                // match time in seconds, counted in fixed steps
    this.events = [];                          // presentation events, drained each frame by the scene
    this.log = [];                             // every ball bowled, for the scorecard and the report
    this.innings = [];
    this.hype = [0, 0]; this.streak = [0, 0]; this.fire = [false, false]; this.dots = [0, 0];
    this.items = [null, null]; this.targetsHit = {};
    this.teapot = [false, false]; this.horseshoe = [false, false];
    this.review = [1, 1];
    this.result = null;
    this.coverage = {};
    this.stats = { fours: 0, sixes: 0, wickets: 0, catches: 0, runouts: 0, items: 0, targets: 0, specials: 0, bowled: 0, lbw: 0, dropped: 0, wides: 0, noballs: 0, byes: 0, chaos: 0, rain: 0, reviews: 0, reviewsWon: 0,
      stumpings: 0, dives: 0, lofts: 0, groundHits: 0, runsCompleted: 0, chargedHits: 0, greenReleases: 0, aftertouch: 0, throws: 0, thirdUmpire: 0 };
    this.dotRun = 0;
    this.ballNo = 0;
    this.phase = 'idle';
    this.timer = 0;
    this.delivery = null; this.ball = null; this.pressed = null; this.bat = null;
    this.fielders = []; this.preset = this.cfg.preset || 'balanced';
    this.runs = null;
    this.pending = null;
    this.chaos = null; this.rainUsed = false;
    this.catchRing = null; this.throwing = null; this.humanFieldHold = null;
    this.cpuPressAt = null; this.cpuIntent = null; this.arriveAbs = null;
    this.startInnings(0);
  }

  /* ---- the event bus and coverage ---- */
  emit(type, data) {
    this.events.push({ type, data: data || {}, t: this.t });
    if (this.events.length > 400) this.events.shift();
    this.coverage[type] = (this.coverage[type] || 0) + 1;
  }
  drain() { const e = this.events; this.events = []; return e; }

  /* ---- sides, players ---- */
  team(side) { return G.TEAMS[this.cfg.teams[side]]; }
  get I() { return this.innings[this.innings.length - 1]; }
  get battingSide() { return this.I.side; }
  get bowlingSide() { return 1 - this.I.side; }
  get striker() { return this.I.bat.find(b => b.end === 'A' && !b.out) || this.I.bat.find(b => !b.out); }
  get nonStriker() { return this.I.bat.find(b => b !== this.striker && !b.out); }
  batterName(bt) { return this.team(this.battingSide).squad[bt.p]; }
  bowlerName() { return this.team(this.bowlingSide).squad[this.I.bowler]; }
  familyOf(idx) { const team = this.team(this.bowlingSide); return FAMILIES[team.bowlers.indexOf(idx) % 4] || 'pace'; }
  // the human sides: cfg.humanSides lists the sides a person plays (side 0 is Kerfuffle, the captain's side)
  isHumanSide(side) { return (this.cfg.humanSides || []).indexOf(side) >= 0; }
  humanBats() { return !this.cfg.autoBat && this.isHumanSide(this.battingSide); }
  humanBowls() { return !this.cfg.autoBowl && this.isHumanSide(this.bowlingSide); }
  humanFields() { return !this.cfg.autoBowl && this.isHumanSide(this.bowlingSide); }
  // the delivery stream: a hub round's deliveries come from its own seeded stream, so every copy faces the same balls
  dRand() { return this.cfg.deliveryRng ? this.cfg.deliveryRng() : this.rng(); }

  /* ---- innings ---- */
  startInnings(k) {
    const isSuper = k >= 2;
    const side = isSuper ? (k === 2 ? this.superBattingFirst() : 1 - this.superBattingFirst()) : (k === 0 ? this.cfg.batFirst : 1 - this.cfg.batFirst);
    const I = {
      k, side, isSuper, runs: 0, wkts: 0, legal: 0, extras: { w: 0, nb: 0, b: 0, lb: 0 }, boundaries: 0,
      overs: isSuper ? 1 : this.cfg.overs, wk: isSuper ? 2 : this.cfg.wickets, over: 0, ballInOver: 0, overRuns: 0,
      bat: [{ p: 0, end: 'A', y: G.W.BAT_CREASE, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' },
        { p: 1, end: 'B', y: G.W.BOWL_CREASE, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' }],
      nextP: 2, bowler: this.team(1 - side).bowlers[0], bowlerLast: -1, target: null, endReason: null, fow: []
    };
    if (k === 1) I.target = this.innings[0].runs + 1;
    if (k === 3) I.target = this.innings[2].runs + 1;
    this.innings.push(I);
    this.emit('innings', { k, side, isSuper, target: I.target, overs: I.overs, wickets: I.wk });
    this.placeFielders();
    this.startOver();
  }
  superBattingFirst() { return 1 - this.cfg.batFirst; }   // the side batting second in the match bats first in the Super Over
  startOver() {
    const I = this.I;
    I.ballInOver = 0; I.overRuns = 0;
    I.bowler = this.pickBowler();
    this.overSetupChance();
    this.setPhase('setup', 0.7);
  }
  // the chaos and items of an over start: items float for the batting side, chaos happens between overs
  overSetupChance() {
    if (!this.cfg.kerf || this.cfg.noChaos) return;
    const I = this.I;
    // the story's rain (the fourth chapter): the second innings is rained off once
    if (this.cfg.forceRain && I.k === 1 && !this.rainUsed && I.over === 1 && !this.chaosNow) { this.chaosNow = 'rain'; }
    if (I.over > 0 && this.rng() < 0.3 * G.T('chaosRate') && this.ground.chaos.length && !this.chaosNow) {
      let pool = this.ground.chaos.filter(c => c !== 'rain' || (I.k === 1 && !this.rainUsed && !I.isSuper));
      if (pool.length) {
        const id = pool[Math.floor(this.rng() * pool.length)];
        this.chaosNow = id;
      }
    }
    if (I.ballInOver === 0 && this.items[this.battingSide] === null && this.rng() < 0.35 * G.T('chaosRate')) this.spawnItem();
  }
  pickBowler() {
    const I = this.I, team = this.team(this.bowlingSide);
    const list = team.bowlers.filter(i => i !== I.bowlerLast);
    const pool = list.length ? list : team.bowlers;
    const idx = pool[I.over % pool.length];
    I.bowlerLast = I.bowler;
    return idx;
  }
  setPhase(p, t) { this.phase = p; this.timer = t; }

  /* ---- fielders: the bowling side's eleven, placed by a preset in the batter's frame ---- */
  placeFielders() {
    const spots = G.PRESETS[this.preset];
    const side = this.bowlingSide;
    const hand = 1;
    const old = this.fielders;
    this.fielders = spots.map(([th, d, role], i) => {
      const s = G.presetSpot(th, d, hand);
      const prev = old[i];
      return { id: i, side, role, x: prev ? prev.x : s.x, y: prev ? prev.y : s.y, hx: s.x, hy: s.y, hold: false, speed: G.T('fieldSpeed'), human: false, keeper: false, slowT: 0, dive: false };
    });
    const ghostIdx = this.team(this.bowlingSide).ghostIdx || [];
    this.fielders.forEach((f, i) => { f.ghost = ghostIdx.indexOf(i) >= 0; });
    const ky = this.preset === 'spin' ? G.W.SY - 24 : G.W.SY - 12;
    this.fielders.push({ id: spots.length, side, role: 'keeper', x: G.W.PX, y: ky, hx: G.W.PX, hy: ky, hold: false, speed: G.T('fieldSpeed'), human: false, keeper: true, slowT: 0, dive: false });
    if (this.humanFields()) this.setActiveHuman();
  }
  stepFielders(dt) {
    for (const f of this.fielders) {
      if (f.slowT > 0) f.slowT -= dt;
      // a ghost fielder of the Eternal XI is intangible for half a second in every six: the ball passes through him
      if (f.ghost) f.intangible = ((this.t + f.id * 1.7) % 6) < 0.5;
      if (f.hold || f.human || f.keeper || (this.catchRing && this.catchRing.f === f)) continue;
      const dx = f.hx - f.x, dy = f.hy - f.y, d = Math.hypot(dx, dy);
      if (d > 1) {
        const sp = f.speed * (f.slowT > 0 ? 0.7 : 1) * dt;
        const s = Math.min(d, sp);
        f.x += dx / d * s; f.y += dy / d * s;
      }
    }
    // a chasing CPU fielder runs for the ball
    const b = this.ball;
    if (b && this.phase === 'play' && !this.throwing && !this.catchRing) {
      const chaser = this.chaserFor();
      if (chaser) {
        const L = b.carried && b.z > 0.5 && this.landing ? this.landing : { x: b.x, y: b.y };
        const dx = L.x - chaser.x, dy = L.y - chaser.y, d = Math.hypot(dx, dy);
        if (d > 1) { const s = Math.min(d, chaser.speed * (chaser.slowT > 0 ? 0.7 : 1) * dt * 1.1); chaser.x += dx / d * s; chaser.y += dy / d * s; }
      }
    }
  }
  // the CPU fielder nearest the ball's landing point is the one that chases it
  chaserFor() {
    const b = this.ball;
    const L = b.carried && b.z > 0.5 && this.landing ? this.landing : { x: b.x, y: b.y };
    let best = null, bd = 1e9;
    for (const f of this.fielders) {
      if (f.hold || f.keeper || f.human) continue;
      const d = Math.hypot(f.x - L.x, f.y - L.y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  setActiveHuman() {
    const b = this.ball;
    let best = null, bd = 1e9;
    for (const f of this.fielders) {
      f.human = false;
      if (f.keeper && !b) continue;
      const d = b ? Math.hypot(f.x - b.x, f.y - b.y) : 0;
      if (!f.hold && d < bd) { bd = d; best = f; }
    }
    if (best) best.human = true;
  }
  humanField() { return this.fielders.find(f => f.human) || null; }

  /* ---- the director ---- */
  update(dt) {
    this.t += dt;
    if (this.phase === 'idle' || this.phase === 'end') return;

    this.timer -= dt;
    this.stepFielders(dt);
    // the human fielder is always the one nearest the ball while it is in play
    if (this.humanFields() && (this.phase === 'play' || this.phase === 'flight') && !this.catchRing) this.setActiveHuman();
    if (this.chaosNow && this.phase === 'setup' && this.timer > 0 && this.timer < 0.7) this.startChaos();
    switch (this.phase) {
      case 'setup': return this.stepSetup(dt);
      case 'runup': return this.stepRunup(dt);
      case 'flight': return this.stepFlight(dt);
      case 'play': return this.stepPlay(dt);
      case 'dead': if (this.timer <= 0) this.commit(); return;
      case 'between': if (this.timer <= 0) this.afterBetween(); return;
      case 'break': if (this.timer <= 0) this.afterBreak(); return;
      case 'rain': if (this.timer <= 0) this.endRain(); return;
      case 'chaos': if (this.timer <= 0) this.endChaos(); return;
    }
  }
  stepSetup(dt) {
    if (this.humanBowls()) return;     // the human picks a delivery
    if (this.timer <= 0) this.cpuBowl();
  }
  // the CPU's bowler: a delivery from the bowler's family (or the machine's list), aimed with a length
  cpuBowl() {
    const fam = this.familyOf(this.I.bowler);
    const kit = G.BOWL_KIT[fam];
    const key = this.cfg.machine ? this.cfg.machine[this.ballNo % this.cfg.machine.length] : kit[Math.floor(this.dRand() * kit.length)];
    const len = this.dRand() < 0.15 ? 'yorker' : this.dRand() < 0.45 ? 'full' : this.dRand() < 0.8 ? 'good' : 'short';
    const ty = { yorker: G.W.BAT_CREASE + 12, full: G.W.BAT_CREASE + 40, good: G.W.BAT_CREASE + 92, short: G.W.BAT_CREASE + 150 }[len];
    const sc = this.cfg.bowlScatter !== undefined ? this.cfg.bowlScatter : G.T('aiBowlAccuracy');
    // a CPU bowler with a full meter bowls his special, half the time
    if (this.hype[this.bowlingSide] >= 100 && this.dRand() < 0.5) {
      const sp = this.bowlSpecialOf(this.I.bowler);
      if (sp) { this.hype[this.bowlingSide] = 0; this.stats.specials++; this.emit('special', { id: sp, name: G.SPECIALS[sp].name, owner: this.bowlerName() }); this.startRunup({ key, target: { x: G.W.PX, y: ty }, cpu: true, fam, special: sp }); return; }
    }
    const x = this.cfg.bowlX !== undefined ? G.W.PX + this.cfg.bowlX : G.W.PX + (this.dRand() - 0.5) * sc;
    this.startRunup({ key, target: { x, y: ty + (this.dRand() - 0.5) * sc }, cpu: true, fam });
  }
  startRunup(D) {
    const fam = D.fam || (G.DELIVERIES[D.key] ? G.DELIVERIES[D.key].fam : 'pace');
    const family = fam === 'swing' ? 'swing' : fam === 'medium' ? 'medium' : fam === 'spin' ? 'spin' : 'pace';
    const dur = { pace: 2.0, swing: 1.8, medium: 1.5, spin: 0.9 }[family];
    this.delivery = Object.assign({ dur, t: 0, released: false, meter: 0.5, quality: null, key: D.key }, D);
    this.setPhase('runup', dur);
    this.emit('runup', { key: D.key, fam: family, cpu: !!D.cpu });
  }
  stepRunup(dt) {
    const D = this.delivery;
    D.t += dt;
    if (D.released) return;
    if (D.cpu && D.t >= D.dur - 0.25) return this.release('green');
    if (!D.cpu && D.t >= D.dur) return this.release('amber');   // no press: an amber release
    if (!D.cpu && D.t >= D.dur - 0.7) D.meter = 0.5 + 0.5 * Math.sin(D.t * TAU * G.T('meterSpeed'));
  }
  // the human's release on the meter: green in the sweet zone, amber and red around it, a no-ball at the far tip
  bowlRelease() {
    const D = this.delivery;
    if (!D || D.released || this.phase !== 'runup' || D.t < D.dur - 0.7) return false;
    const u = 0.5 + 0.5 * Math.sin(D.t * TAU * G.T('meterSpeed'));
    const d = Math.abs(u - 0.5) * 2;
    const sweet = G.T('meterSweet');
    const q = u > 0.94 ? 'noball' : d <= sweet ? 'green' : d <= sweet * 2.2 ? 'amber' : 'red';
    this.release(q);
    return true;
  }
  // the bowl: the release point and the velocity that lands on the target, with the meter's scatter
  release(quality) {
    const D = this.delivery;
    if (!D || D.released) return;
    D.released = true;
    const special = D.special;
    const del = special ? this.specialDelivery(special) : G.DELIVERIES[D.key];
    const scat = { green: 2, amber: 10, red: 18, noball: 18, cpu: 1 }[quality] || 4;
    const fac = { green: 1, amber: 0.9, red: 0.8, noball: 0.8, cpu: 1 }[quality] || 1;
    const tgt = D.target || { x: G.W.PX, y: G.W.BAT_CREASE + 60 };
    const target = {
      x: clamp(tgt.x + (this.dRand() - 0.5) * 2 * scat, G.W.PX - 34, G.W.PX + 34),
      y: clamp(tgt.y + (this.dRand() - 0.5) * 2 * scat * 0.5, G.W.BAT_CREASE + 10, G.W.BOWL_CREASE - 12)
    };
    const kmh = (del.kmh[0] + this.dRand() * (del.kmh[1] - del.kmh[0])) * fac;
    const b = G.newBall(0, 0, 0);
    const rel = { x: G.W.PX - 4, y: G.W.RELEASE_Y, z: G.W.RELEASE_Z };
    Object.assign(b, rel, G.solveDelivery(rel, target, kmh));
    b.phase = 'delivery';
    const hand = this.handOf(this.striker);
    b.swingA = del.swing * (special === 'kfBall' ? 2 : 1) * hand;
    b.turn = del.turn;
    b.spinGrip = del.fam === 'spin' ? 0.05 : 0;
    b.bounceMul = del.bounce;
    b.vanish = special === 'vanish'; b.sawn = special === 'sawn'; b.wobble = special === 'dibbly'; b.triple = special === 'triple';
    if (quality === 'green' && !D.cpu) this.stats.greenReleases++;
    this.stumpRisk = false;
    b.seamDev = (this.dRand() + this.dRand() + this.dRand() - 1.5) * 2 * G.T('seam') * (del.seam || 1);
    b.delivery = D.key; b.kmh = Math.round(kmh);
    this.ball = b;
    this.ballNo++;
    this.noBall = quality === 'noball';
    this.bowlQuality = quality;
    this.lastDel = { key: D.key, label: del.label || D.key, fam: del.fam || D.fam || 'pace', kmh: Math.round(kmh), target, quality, special: special || null };
    this.fastestKmh = Math.max(this.fastestKmh || 0, this.lastDel.kmh);
    this.releaseAt = this.t;
    this.touched = false;
    this.path = [];                       // the ball's recorded path, for the Owl-Eye review
    this.shock = special === 'grandad';   // the batter is shocked by a Grandad: his timing windows halve
    this.grudgeBall = special === 'grudge';
    this.chirpActive = !!this.chirpNext; this.chirpNext = false;
    this.ghostFielder = null; this.charging = false;
    this.ballStartRuns = this.I.runs;
    this.crossed = false; this.pitchedFlag = false; this.pressed = null; this.missed = false;
    this.bat = null; this.runs = null; this.landing = null; this.catchRing = null; this.catchResolved = false;
    this.arriveAbs = null;
    const tt = G.timeToPlane(b, this.env, CONTACT_Y, 3);
    this.arriveAbs = this.releaseAt + (tt !== null ? tt : 1);
    this.setPhase('flight', 6);
    this.phase = 'flight';
    this.emit('release', { key: D.key, label: this.lastDel.label, fam: this.lastDel.fam, kmh: this.lastDel.kmh, quality, cpu: !!D.cpu });
    if (this.noBall) this.emit('noball:warn', {});
    if (this.cpuBatting()) this.cpuPlanBat();
  }
  // a bowling special's delivery: its speed, swing, turn, bounce and seam
  specialDelivery(key) {
    const L = {
      vicar: { label: "VICAR'S REVENGE", kmh: [150, 158], swing: -1.2, turn: 0, bounce: 0.9, fam: 'pace', seam: 0.5 },
      sunburn: { label: 'SUNBURN BOUNCER', kmh: [150, 156], swing: 0, turn: 0, bounce: 1.3, fam: 'pace', seam: 1 },
      kfBall: { label: 'KERFUFFLE BALL', kmh: [138, 148], swing: 0.1, turn: 0, bounce: 1, fam: 'pace', seam: 1 },
      grandad: { label: 'THE GRANDAD', kmh: [78, 88], swing: 0, turn: 9, bounce: 1.25, fam: 'spin', seam: 0.3 },
      peregrine: { label: 'PEREGRINE SWOOP', kmh: [125, 135], swing: 3, turn: 0, bounce: 1, fam: 'swing', seam: 1 },
      dibbly: { label: 'DIBBLY-DOBBLY DOOM', kmh: [80, 80], swing: 0, turn: 0, bounce: 0.9, fam: 'medium', seam: 4 },
      sawn: { label: 'SAWN IN HALF', kmh: [76, 86], swing: 0.2, turn: -8, bounce: 1.05, fam: 'spin', seam: 0.3 },
      grudge: { label: 'THE GRUDGE BALL', kmh: [136, 146], swing: 0.15, turn: 0, bounce: 0.9, fam: 'pace', seam: 0.5 },
      vanish: { label: 'THE VANISHING BALL', kmh: [80, 90], swing: 0.3, turn: -8, bounce: 1.0, fam: 'spin', seam: 0.3 },
      triple: { label: 'TRIPLE THREAT', kmh: [138, 148], swing: 0, turn: 0, bounce: 1, fam: 'pace', seam: 1 }
    };
    return L[key] || G.DELIVERIES.express;
  }
  // the batter's hand: -1 for a left-hander (every third squad member), 1 for a right-hander
  handOf(bt) { return bt && bt.p % 3 === 2 ? -1 : 1; }
  // the batter's press: a shot (button), the aim (a batter-frame angle, or null), and a special if one is played
  batPress(button, aim, special) {
    if (this.phase !== 'flight' || this.pressed || this.missed || !this.ball || this.ball.phase !== 'delivery') return false;
    this.pressed = { button, aim: aim === undefined ? null : aim, special: special || null, t: this.t, charged: !!this.charging };
    const sh = this.shotFor(this.pressed);
    this.pressed.shot = sh.key;
    let gr = this.gradeOf(this.pressed, sh.contactAt);
    const S = special ? G.SPECIALS[special] : null;
    if (S && S.minGrade && (gr.grade === 'EARLY' || gr.grade === 'LATE')) gr = { ms: gr.ms, grade: S.minGrade };
    this.pressed.grade = gr.grade; this.pressed.ms = gr.ms;
    if (gr.grade === 'MISS') {
      this.missed = true;
      // a charged batter who misses can be stumped
      if (this.charging) this.stumpRisk = true;
      this.pressed = null;
      this.emit('press', { button, grade: 'MISS', shot: sh.key, ms: gr.ms });
      return true;
    }
    this.pressed.dueAt = this.arriveAbs;   // the bat meets the ball at the contact plane
    this.emit('press', { button, grade: gr.grade, shot: sh.key, ms: Math.round(gr.ms) });
    return true;
  }
  // the timing grade: the press's contact moment against the moment the ball reaches the contact plane. A Grandad's
  // shock halves the windows (for the ball it bowls) and a chirp narrows them; ON FIRE widens them
  gradeOf(pr, contactAt) {
    const contactAbs = pr.t + contactAt;
    const ms = (contactAbs - this.arriveAbs) * 1000;
    let w = this.fireBat() ? 1.5 : 1;
    if (this.shock) w *= 0.5;
    if (this.chirpActive) w *= 0.7;
    const a = Math.abs(ms), P = G.T('perfectMs') * w, Gd = G.T('goodMs') * w, Ok = G.T('okMs') * (this.chirpActive ? 0.7 : 1);
    const grade = a <= P ? 'PERFECT' : a <= Gd ? 'GOOD' : a <= Ok ? (ms < 0 ? 'EARLY' : 'LATE') : 'MISS';
    return { ms, grade };
  }
  shotFor(pr) {
    const S = pr.special ? G.SPECIALS[pr.special] : null;
    if (S && S.shot) return Object.assign({ key: S.shot }, G.SHOTS[S.shot], { special: true });
    const pitchY = this.ball.pitchY !== undefined ? this.ball.pitchY : this.predictPitch().y;
    const len = G.lengthOf(pitchY);
    const sector = pr.aim !== null ? pr.aim : this.sectorOfBall();
    const button = pr.button === 'shot' ? 'shot' : pr.button === 'loft' ? 'loft' : 'block';
    const key = G.resolveShot(button, len, sector);
    return Object.assign({ key }, G.SHOTS[key]);
  }
  predictPitch() {
    const r = G.predictUntil(this.ball, this.env, c => c.pitched, 2.5);
    return r ? r.b : { x: this.ball.x, y: G.W.BAT_CREASE + 80 };
  }
  // a neutral stick reads the line the ball is on, from its contact-plane position (mirrored for a left-hander)
  sectorOfBall() {
    const r = G.predictUntil(this.ball, this.env, c => c.y <= CONTACT_Y, 2.5);
    const x = r ? r.b.x : this.ball.x;
    return clamp(-(x - G.W.PX) * 3 * this.handOf(this.striker), -120, 120);
  }
  // the bat's contact: the outgoing ball, an edge, or a defence. A special changes the shot, the power and the ball's
  // flags (unstoppable, passes the first fielder, a catch trap, a forced four)
  contactNow(pr) {
    const b = this.ball, sh = G.SHOTS[pr.shot];
    if (pr.charged) this.stats.chargedHits++;
    if (sh.lofted) this.stats.lofts++; else this.stats.groundHits++;
    this.pressed = null;
    const grade = pr.grade;
    const S = pr.special ? G.SPECIALS[pr.special] : null;
    if (S) { this.stats.specials++; this.emit('special', { id: pr.special, name: S.name, owner: this.batterName(this.striker) }); }
    if (sh.defend) {
      b.vx *= 0.15; b.vy = -Math.abs(b.vy) * 0.1; b.vz = 4; b.phase = 'hit'; b.carried = false;
      this.afterContact({ shot: pr.shot, grade, lofted: false, defended: true });
      return;
    }
    const hand = this.handOf(this.striker);
    if (!S && (grade === 'EARLY' || grade === 'LATE') && !sh.lofted && this.rng() < 0.22 * G.T('edge')) {
      const ang = (this.rng() < 0.5 ? -1 : 1) * (150 + this.rng() * 25) * PI / 180;
      b.vx = Math.sin(ang) * 120 * hand; b.vy = -Math.cos(ang) * 120; b.vz = 40; b.phase = 'hit'; b.carried = true;
      b.hitBy = this.battingSide; b.touchedGround = false; b.trail = [];
      this.afterContact({ shot: pr.shot, grade, lofted: false, edge: true });
      this.bat.edge = true;
      this.emit('edge', {});
      return;
    }
    const perf = S && S.perfect ? 'PERFECT' : grade;
    const power = { PERFECT: 1, GOOD: 0.85, EARLY: 0.6, LATE: 0.6 }[perf] || 0.6;
    const err = { PERFECT: 2, GOOD: 6, EARLY: 14, LATE: 14 }[perf] || 14;
    const base = pr.aim !== null ? pr.aim : sh.nat;
    let theta = base + (this.rng() - 0.5) * 2 * err;
    if (grade === 'EARLY') theta -= 12; else if (grade === 'LATE') theta += 12;
    const r = theta * PI / 180;
    const mult = (S && S.mult ? S.mult : 1) * (!this.humanBats() && this.cfg.cpuPower ? this.cfg.cpuPower : 1);
    const speed = sh.speed * (sh.lofted ? G.T('loftPower') : G.T('batPower')) * power * mult * (this.fireBat() ? 1.2 : 1) * (1 + 0.25 * (b.speed || 300) / 386);
    const launch = (sh.launch + (grade === 'EARLY' && sh.lofted ? 6 : 0)) * PI / 180;
    b.vx = -Math.sin(r) * hand * speed * Math.cos(launch);
    b.vy = Math.cos(r) * speed * Math.cos(launch);
    b.vz = speed * Math.sin(launch);
    b.phase = 'hit'; b.carried = true; b.hitBy = this.battingSide; b.touchedGround = false; b.bounces = 0;
    b.z = Math.max(b.z, sh.lofted ? 12 : 2);
    b.trail = [];
    // a feeding drill: the CPU's shot is aimed to land at the human fielder, so a catch or a gather comes to him
    if (this.cfg.feedFielder && !this.humanBats()) {
      const f = this.fielders.find(q => q.human);
      if (f) {
        const dx = f.x - b.x, dy = f.y - b.y, d = Math.max(1, Math.hypot(dx, dy));
        const dir = [dx / d, dy / d];
        if (sh.lofted) { const th = 40 * PI / 180, v = Math.sqrt(d * G.T('gravity') / Math.sin(2 * th)); b.vx = dir[0] * v * Math.cos(th); b.vy = dir[1] * v * Math.cos(th); b.vz = v * Math.sin(th); }
        else { const v = d * this.env.k; b.vx = dir[0] * v; b.vy = dir[1] * v; b.vz = 0; }
      }
    }
    b.unstoppable = !!(S && S.unstoppable);
    b.passFirst = !!(S && S.passFirst);
    this.catchTrap = !!(S && S.catchTrap);
    this.forceFour = !!(S && S.forceFour);
    this.bat = { shot: pr.shot, grade, lofted: !!sh.lofted, special: pr.special || null, theta: Math.round(theta), speed: Math.round(speed) };
    this.emit('contact', { grade, shot: pr.shot, lofted: !!sh.lofted, theta: Math.round(theta), speed: Math.round(speed), special: pr.special || null });
    this.afterContact({ shot: pr.shot, grade, lofted: !!sh.lofted });
  }
  // the batter steps down the pitch: the contact plane moves 24 units toward the bowler, and the ball arrives sooner
  charge() {
    if (this.phase !== 'flight' || this.pressed || !this.ball || this.ball.phase !== 'delivery' || this.charging) return false;
    const tt = G.timeToPlane(this.ball, this.env, CONTACT_Y + 24, 3);
    if (tt === null) return false;
    this.charging = true;
    this.arriveAbs = this.t + tt;
    this.emit('charge', {});
    return true;
  }
  // a dive for the crease: a runner who is close to his crease grounds his bat a fifth of a second sooner
  dive() {
    const th = this.throwing;
    if (!th || !th.runner) return false;
    const d = Math.abs(th.runner.y - (th.end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE));
    if (d > 50) return false;
    th.runnerTime -= 0.15;
    this.stats.dives++;
    this.emit('dive', {});
    return true;
  }
  // aftertouch: a bowler's stick pushed sideways in the first quarter second moves the ball that way
  aftertouch(dx) {
    const b = this.ball;
    if (!b || this.phase !== 'flight' || b.phase !== 'delivery' || b.pitched || b.age > 0.25 || this.touched) return false;
    this.touched = true;
    b.vx += dx * 45;
    this.stats.aftertouch++;
    this.emit('aftertouch', { dx });
    return true;
  }
  // a fielder's special: Fortescue's silver tray guarantees the next catch; Pip's chirp unsettles the next batter
  fieldSpecial() {
    const squad = this.team(this.bowlingSide).squad;
    const owner = squad.find(n => G.OWNERS[n] && G.OWNERS[n].field);
    if (!owner || this.hype[this.bowlingSide] < 100) return null;
    const id = G.OWNERS[owner].field;
    if (id === 'silverTray') this.silverArmed = true;
    if (id === 'chirp') this.chirpNext = true;
    if (id === 'lightning') this.lightningOver = true;   // the stumping window triples for one over
    this.hype[this.bowlingSide] = 0;
    this.stats.specials++;
    this.emit('special', { id, name: G.SPECIALS[id].name, owner });
    return id;
  }
  // a special played by the batter spends his side's Hype
  spendHype(side) { this.hype[side] = 0; }
  // the special a bowler or a batter carries, by name (null when none)
  bowlSpecialOf(idx) { const o = G.OWNERS[this.team(this.bowlingSide).squad[idx]]; return o && o.bowl ? o.bowl : null; }
  batSpecialOf(bt) { const o = G.OWNERS[this.batterName(bt)]; return o && o.bat ? o.bat : null; }
  cpuBatting() { return !this.humanBats(); }


  /* ---- batting: the press, the grade, the contact ---- */
  // the batter presses a shot (button) with an aim (the batter-frame angle, or null for a neutral stick)
  fireBat() { return this.fire[this.battingSide]; }
  // the timing grade: the press's contact moment against the moment the ball reaches the contact plane
  predictPitch() {
    const r = G.predictUntil(this.ball, this.env, c => c.pitched, 2.5);
    return r ? r.b : { x: this.ball.x, y: G.W.BAT_CREASE + 80 };
  }
  // a neutral stick reads the line the ball is on, from its contact-plane position
  // the contact: the outgoing ball, an edge, or a defence
  afterContact(info) {
    this.bat = Object.assign(this.bat || {}, info);
    this.setPhase('play', 14);
    this.phase = 'play';
    this.runs = { active: false, run: 0, awaitCall: 2.6, human: false, endHuman: false };
    this.stampContact = this.t;
    this.boundaryFlag = false;
    this.landing = this.landingFor(this.ball);
    this.ballTouchedGround = false;
    this.catchChanceDone = false;
    this.cpuDecideRun();
  }
  landingFor(b) {
    const L = G.landingOf(Object.assign({}, b, { phase: 'hit' }), this.env, 4);
    return L ? { x: L.x, y: L.y, t: L.t } : null;
  }
  // a delivery passes the batter: a wide, a no-ball, bowled, LBW, or a beaten bat
  stepFlight(dt) {
    const b = this.ball;
    G.stepBall(b, this.env, (type, d) => { if (type === 'pitch') { this.pitchedFlag = true; this.pitchAt = d; this.emit('pitch', d); } });
    if (b.pitched && !this.pitchedFlag) this.pitchedFlag = true;
    if (b.trail) { b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 10) b.trail.shift(); }
    if (this.path && this.path.length < 600) this.path.push({ x: b.x, y: b.y, z: b.z });
    if (this.pressed && this.t >= this.pressed.dueAt) { this.contactNow(this.pressed); return; }
    if (this.cpuBatting() && !this.pressed && !this.missed && this.cpuPressAt !== null && this.t >= this.cpuPressAt) this.cpuFire();
    if (!this.crossed && b.y <= G.W.BAT_CREASE + 10) { this.crossed = true; this.deliveryPassed(); return; }
    if (this.phase === 'flight' && b.y < G.W.SY - 26) this.dead('beaten', { beaten: true });
  }
  deliveryPassed() {
    const b = this.ball;
    if (this.pressed) return;   // the bat met it (the contact will come)
    const off = b.x - G.W.PX;
    if (off < -26 || off > 18 || b.z > 40) return this.dead('wide', { wide: true });
    if (this.noBall) return this.dead('noball', { noball: true });
    const r = G.predictUntil(b, this.env, c => c.y <= G.W.SY, 2.5);
    // the stumps, with the batter's pad in front of them: a ball that would hit the stumps past the pad (within seven
    // units of the middle stump) is an LBW candidate; a ball pitched on the stumps and going straight through is bowled
    const hits = r && Math.abs(r.b.x - G.W.PX) <= 7 && r.b.z <= 12;
    if (this.stumpRisk && this.rng() < (this.lightningOver ? 0.9 : 0.45)) { this.stats.stumpings++; return this.dismiss('stumped', {}); }
    if (!hits) return this.dead('beaten', { beaten: true });
    const pitch = this.predictPitch();
    if (Math.abs(pitch.x - G.W.PX) <= 3.5) {
      this.stats.bowled++;
      this.sawnSplit = !!b.sawn;
      return this.dismiss('bowled', {});
    }
    // LBW: the umpire's call, with his accuracy and the truth (pitched in line)
    const truth = Math.abs(pitch.x - G.W.PX) <= 14;
    const acc = this.umpireAccuracy();
    const call = this.rng() < acc ? truth : !truth;
    this.lbw = { truth, call };
    this.emit('appeal', { how: 'lbw' });
    if (call) { this.stats.lbw++; return this.dismiss('lbw', { review: truth !== call }); }
    if (truth) this.reviewable = { batter: this.striker, call: 'notout', truth: 'out', side: this.battingSide, how: 'lbw' };
    return this.dead('notout', { how: 'lbw', notOut: true });
  }
  umpireAccuracy() { return (this.cfg.umpireAccuracy !== undefined ? this.cfg.umpireAccuracy : (this.innings.length && this.I.isSuper ? 0.95 : 0.9)) + (this.grudgeBall ? 0.1 : 0); }
  // the ball in play after a contact: a boundary, a catch, a gather, the throw, the run
  stepPlay(dt) {
    const b = this.ball;
    // the batters keep running while the ball is thrown in
    if (this.runs && this.runs.active) this.stepRuns(dt);
    if (this.throwing) return this.stepThrow(dt);
    G.stepBall(b, this.env, (type) => { if (type === 'bounce') this.emit('bounce', {}); });
    if (b.trail) { b.trail.push({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 10) b.trail.shift(); }
    if (this.path && this.path.length < 600) this.path.push({ x: b.x, y: b.y, z: b.z });
    if (b.touchedGround) this.ballTouchedGround = true;
    if (this.catchRing) return this.stepCatchRing(dt);
    this.checkTargets();
    const bs = this.ground.boundary * G.T('boundaryScale') * (1 - (this.tide || 0));
    const ex = (b.x - G.W.PX) / (G.W.RX * bs), ey = (b.y - G.W.CY) / (G.W.RY * bs);
    // a peacock on the outfield deflects a low ball that passes it (a quarter turn either way)
    const dv = this.deflector;
    if (dv && !dv.used && b.z >= (dv.zMin || 0) && b.z < dv.zMax && Math.hypot(b.x - dv.x, b.y - dv.y) < dv.r) {
      dv.used = true;
      const a = (this.rng() < 0.5 ? -1 : 1) * dv.deg * PI / 180, c = Math.cos(a), s = Math.sin(a);
      const vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx; b.vy = vy;
      this.emit('deflect', {});
    }
    if (!this.boundaryFlag && ex * ex + ey * ey > 1) {
      this.boundaryFlag = true;
      return this.boundary(this.forceFour || this.ballTouchedGround ? 4 : 6);
    }
    // a catch chance: the ball airborne and low, close to a fielder
    // a passes-through special: the first fielder the ball meets is a ghost for this ball
    if (b.passFirst) { const pf = this.nearestFielder(b.x, b.y); if (pf && Math.hypot(pf.x - b.x, pf.y - b.y) <= 10) { this.ghostFielder = pf; b.passFirst = false; this.emit('pass-through', {}); } }
    if (b.carried && b.z < 12 && !this.catchChanceDone && !b.unstoppable && !this.cfg.noCatch) {
      const f = this.nearestFielder(b.x, b.y);
      if (f && Math.hypot(f.x - b.x, f.y - b.y) <= 10) return this.catchChance(f);
    }
    // a ground ball: a fielder gathers it when it is slow enough and near
    if (!b.carried || b.z <= 0.01) {
      if (b.speed < 260 && !this.gathered && !b.unstoppable) {
        const f = this.nearestFielder(b.x, b.y);
        if (f && Math.hypot(f.x - b.x, f.y - b.y) <= 7) return this.gather(f);
      }
    }
    if (this.runs.awaitCall > 0) this.runs.awaitCall -= dt;
    if (this.runs.awaitCall > 0 && !this.runs.active && this.ballTouchedGround && this.humanBats() && G.setting('running') === 'Auto' && this.bat && !this.bat.defended) this.startRun();
    if (this.humanFieldHold) { this.humanFieldHold.timer -= dt; if (this.humanFieldHold.timer <= 0) this.throwTo(this.humanFieldHold.f, this.bestEnd()); }
    if (b.speed < 2 && b.z <= 0.01 && !this.runs.active && this.t - this.stampContact > 1.0) return this.dead('settled', {});
    // the hard cap: no ball is in play for more than 15 seconds; runs in hand are called off
    if (this.t - this.stampContact > 13) { this.runs.active = false; return this.dead('settled', {}); }
  }
  nearestFielder(x, y) {
    let best = null, bd = 1e9;
    for (const f of this.fielders) {
      if (f.hold || f === this.ghostFielder || f.intangible) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }
  // a catch chance: the CPU's catch is a roll; a human's is a catch ring, pressed on its moment
  catchChance(f) {
    this.catchChanceDone = true;
    const b = this.ball;
    const speed = b.speed || 300;
    const base = f.keeper ? 0.85 : (f.role.indexOf('slip') >= 0 ? 0.85 : 0.82);
    let p = clamp(base - 0.25 * (speed / 400) - (f.dive ? 0.3 : 0), 0.05, 0.97);
    if (this.catchTrap) p = Math.min(0.95, p * 2);            // Boardwalk Bludgeon: caught if a fielder is under it
    if (this.silverArmed) { this.silverArmed = false; this.emit('silver-tray', {}); this.resolveCatch(f, true, 1); return; }
    const auto = game.settings.fielding === 'Auto' || (game.settings.fielding === 'Assisted' && p > 0.85);
    if (f.human && !auto) {
      this.catchRing = { f, p, t: G.T('catchRing'), total: G.T('catchRing'), role: f.role };
      this.emit('catch-ring', { role: f.role, t: this.catchRing.total });
      return;
    }
    const caught = this.rng() < p;
    this.resolveCatch(f, caught, p);
  }
  stepCatchRing(dt) {
    const R = this.catchRing;
    R.t -= dt;
    // the ball falls onto the fielder's hands at the ring's end
    const k = clamp(1 - R.t / R.total, 0, 1);
    const b = this.ball;
    b.x = lerp(b.x, R.f.x, 0.25); b.y = lerp(b.y, R.f.y, 0.25); b.z = Math.max(1, b.z * (1 - k * 0.1));
    if (R.t <= -G.T('catchWindow') / 1000) { this.catchRing = null; this.resolveCatch(R.f, false, R.p); }
  }
  // the human's catch press: caught if it lands inside the window around the ring's end
  catchPress() {
    const R = this.catchRing;
    if (!R) return false;
    const off = Math.abs(R.t) * 1000;
    const ok = off <= G.T('catchWindow');
    const caught = ok && this.rng() < 0.6 + 0.4 * R.p;
    const perfect = ok && off <= G.T('catchWindow') * 0.5;
    this.catchRing = null;
    this.resolveCatch(R.f, caught, R.p, perfect);
    return true;
  }
  resolveCatch(f, caught, p, screamer) {
    if (caught) {
      f.hold = true; this.gathered = true;
      this.ball.x = f.x; this.ball.y = f.y; this.ball.z = 2; this.ball.vx = this.ball.vy = this.ball.vz = 0; this.ball.phase = 'held'; this.ball.carried = false;
      this.emit('catch', { role: f.role, id: f.id, keeper: !!f.keeper, screamer: !!screamer, p: Math.round(p * 100) });
      this.stats.catches++;
      this.hypeGain(this.bowlingSide, screamer ? 15 : 8, 'catch');
      return this.dismiss('caught', { catcher: f.role });
    }
    this.stats.dropped++;
    this.emit('catch:dropped', { role: f.role });
    this.ball.carried = false;
    this.ball.vx *= 0.3; this.ball.vy *= 0.3; this.ball.vz = Math.abs(this.ball.vz) * 0.3;
    this.catchChanceDone = true;
  }
  // a gather: a ground ball taken. A human chooses where to throw (3 s); the CPU throws to the better end
  gather(f) {
    const b = this.ball;
    this.gathered = true;
    f.hold = true;
    // the gulls steal a stopped ball in the outfield: two byes, and a glare
    if (this.gulls && b.carried === false) { this.I.runs += 2; this.I.extras.b += 2; this.stats.byes += 2; this.emit('byes', { n: 2 }); }
    // a gathered ball is no catch chance: it is in the fielder's hands, and the throw follows
    b.carried = false; this.catchChanceDone = true;
    b.vx = b.vy = b.vz = 0; b.phase = 'held'; b.z = 1; b.x = f.x; b.y = f.y;
    this.emit('gather', { role: f.role });
    if (f.human) { this.humanFieldHold = { f, timer: 3 }; this.emit('throw-pick', {}); return; }
    this.throwTo(f, this.bestEnd());
  }
  // the end a throw should go to: the end where a runner is closest to his crease, and not the bowler's end unless needed
  bestEnd() {
    if (!this.runs || !this.runs.active) return 'A';
    const I = this.I;
    const r = I.bat.find(b => !b.out && b.end === 'B') || null;
    return r ? 'A' : 'B';
  }
  // a fielder throws to an end: a direct hit runs a batter out if he is still short of his crease
  throwTo(f, end) {
    if (this.humanFieldHold && this.humanFieldHold.f === f) this.humanFieldHold = null;
    const stump = end === 'A' ? { x: G.W.PX, y: G.W.SY } : { x: G.W.PX, y: G.W.BY };
    const d = Math.hypot(f.x - stump.x, f.y - stump.y);
    const err = (this.rng() - 0.5) * 2 * G.T('throwError') * d / 480;
    const tt = d / G.T('throwSpeed');
    const hit = Math.abs(err) < 8;
    const runner = this.runs && this.runs.active ? this.I.bat.find(bt => !bt.out && bt.end !== end) : null;
    const runnerTime = runner ? Math.abs(runner.y - (end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE)) / G.T('runSpeed') : 0;
    this.throwing = { f, end, t: tt, total: tt, hit, runner, runnerTime, from: { x: f.x, y: f.y }, to: stump };
    this.stats.throws++;
    this.emit('throw', { end, t: tt });
  }
  stepThrow(dt) {
    const th = this.throwing;
    th.t -= dt;
    const k = 1 - Math.max(0, th.t) / Math.max(0.001, th.total);
    const b = this.ball;
    b.x = lerp(th.from.x, th.to.x, k); b.y = lerp(th.from.y, th.to.y, k); b.z = 4;
    if (th.t > 0) return;
    this.throwing = null;
    if (th.runner && th.hit && Math.abs(th.runnerTime - th.total) < 0.15) { this.stats.thirdUmpire++; this.emit('third-umpire', { out: th.runnerTime > th.total, margin: Math.round((th.runnerTime - th.total) * 1000), name: this.batterName(th.runner) }); }
    if (th.runner && th.hit && th.runnerTime > th.total) return this.runOut(th.runner);
    if (th.hit && th.runner) this.emit('throw:miss', {});
    // the ball is dead when the runners are home: a run in progress is finished first
    if (this.runs && this.runs.active) return;
    this.dead('settled', {});
  }
  runOut(bt) {
    bt.out = true; bt.how = 'run out';
    this.I.wkts++;
    this.stats.runouts++;
    this.stats.wickets++;
    this.emit('runout', { name: this.batterName(bt) });
    this.hypeGain(this.bowlingSide, 30, 'wicket');
    this.runs.active = false;
    this.dead('runout', { how: 'run out' });
  }
  // a boundary, a four or a six, the Hype, and the ball goes to the stands
  boundary(n) {
    this.addRuns(n);
    this.emit('boundary', { n, x: this.ball.x, y: this.ball.y });
    if (n === 4) this.stats.fours++; else this.stats.sixes++;
    this.I.boundaries++;
    this.hypeGain(this.battingSide, n === 6 ? 25 : 15, 'boundary');
    this.streakAdd(this.battingSide);
    this.dead('boundary', { n });
  }
  streakAdd(side) {
    this.streak[side]++;
    this.dots[side] = 0;
    if (this.streak[side] >= G.T('fireStreak') && !this.fire[side]) { this.fire[side] = true; this.emit('fire:on', { side }); }
  }
  streakEnd(side) { if (this.fire[side]) this.emit('fire:off', { side }); this.fire[side] = false; this.streak[side] = 0; }
  // the ball is dead: the umpire signals, and the commit follows after a beat
  dead(reason, d) {
    if (this.phase !== 'flight' && this.phase !== 'play') return;
    this.deadReason = reason;
    this.deadData = d || {};
    this.ball.phase = 'dead';
    this.pressed = null;
    this.catchRing = null;
    this.throwing = null;
    this.humanFieldHold = null;
    if (this.runs) this.runs.active = false;
    this.setPhase('dead', this.reviewable ? 4.2 : 1.4);
    this.emit('dead', { reason, n: d && d.n || 0, how: d && d.how });
  }
  // the run, from the play: both batters walk to the far crease; both grounded is a run
  stepRuns(dt) {
    const R = this.runs, I = this.I;
    if (!R.active) return;
    const sp = G.T('runSpeed') * (this.ground.outfieldK > 0.8 ? 0.85 : 1);
    let arrived = 0;
    for (const bt of I.bat) {
      if (bt.out) continue;
      const goal = bt.end === 'A' ? G.W.BOWL_CREASE : G.W.BAT_CREASE;
      const d = Math.abs(goal - bt.y);
      if (d > 0.5) bt.y += Math.sign(goal - bt.y) * Math.min(d, sp * dt);
      else arrived++;
    }
    if (arrived >= I.bat.filter(b => !b.out).length) {
      R.run++;
      this.stats.runsCompleted++;
      I.bat.forEach(bt => { if (!bt.out) { bt.end = bt.end === 'A' ? 'B' : 'A'; bt.y = bt.end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE; } });
      R.active = false;
      this.addRuns(1);
      this.emit('run', { n: R.run });
      if (R.human && R.more) { R.more = false; this.startRun(); }
      else if (this.cpuDecideMore()) this.startRun();
    }
  }
  startRun() {
    const R = this.runs;
    if (!R || R.active || this.phase !== 'play') return false;
    R.active = true;
    R.awaitCall = 0;
    this.emit('running', {});
    return true;
  }
  // the batter's R1: a run, or (while running) to turn for another
  callRun() {
    if (this.phase !== 'play' || !this.runs) return false;
    if (this.runs.active) { this.runs.more = true; return true; }
    return this.startRun();
  }
  cpuDecideRun() {
    if (!this.cpuBatting()) return;
    const bt = this.bat;
    if (!bt || bt.defended) return;
    if (bt.lofted && !this.ballTouchedGround && bt.grade !== 'PERFECT') return;
    if (this.runs.awaitCall > 0 && this.rng() < 0.55 + 0.25 * G.T('aiAggression')) this.startRun();
  }
  cpuDecideMore() {
    if (!this.cpuBatting()) return false;
    return this.rng() < 0.2 + 0.2 * G.T('aiAggression');
  }
  addRuns(n) {
    const I = this.I;
    if (this.teapot[this.battingSide] && n > 0) { n *= 2; this.teapot[this.battingSide] = false; this.emit('item:used', { id: 'teapot', n }); }
    I.runs += n;
    I.overRuns += n;
    I.bat.forEach(bt => { if (!bt.out && bt.end === 'A') bt.runs += 0; });
    const s = this.striker; if (s) s.runs += n;
  }

  /* ---- the dismissal ---- */
  dismiss(how, d) {
    const I = this.I;
    const bt = this.striker;
    // a free hit: the only dismissal is a run out
    if (this.freeHit && how !== 'runout' && how !== 'run out') return this.dead('notout', { freeHit: true });
    if (this.cfg.invincible && how !== 'runout' && how !== 'run out') return this.dead('notout', { invincible: true });
    if (this.horseshoe[this.battingSide] && how !== 'bowled') {
      this.horseshoe[this.battingSide] = false;
      this.emit('item:used', { id: 'horseshoe', n: 0 });
      return this.dead('notout', { how, overturned: true });
    }
    bt.out = true; bt.how = how; I.wkts++; this.stats.wickets++;
    this.hypeGain(this.bowlingSide, 30, 'wicket');
    this.streakEnd(this.battingSide);
    this.emit('wicket', { how, name: this.batterName(bt), review: !!(d && d.review) });
    if (d && d.review) this.reviewable = { batter: bt, call: 'out', truth: 'notout', side: this.battingSide, how };
    this.dead('wicket', { how, review: !!(d && d.review) });
  }
  // the review (the human's Y during the dead beat): an LBW call the truth contradicts is overturned, once an innings
  reviewPress() {
    const rv = this.reviewable;
    if (!rv || this.phase !== 'dead' || this.review[rv.side] <= 0) return false;
    this.review[rv.side]--;
    this.stats.reviews++;
    const won = rv.truth !== rv.call;
    if (won) {
      this.stats.reviewsWon++;
      if (rv.call === 'out') {
        rv.batter.out = false; rv.batter.how = ''; this.I.wkts--; this.stats.wickets--;
        this.streak[rv.side] = 0;
      } else {
        rv.batter.out = true; rv.batter.how = rv.how || 'lbw'; this.I.wkts++; this.stats.wickets++;
      }
    }
    this.emit('review', { won, call: rv.call, truth: rv.truth });
    this.reviewable = null;
    return won;
  }
  // the commit: the ball goes into the record. Wides and no-balls are extras and are bowled again.
  commit() {
    const I = this.I;
    const r = this.deadReason, d = this.deadData || {};
    const legal = !(r === 'wide' || r === 'noball');
    if (r === 'wide') { I.runs += 1; I.extras.w += 1; I.overRuns += 1; this.stats.wides++; this.emit('extra', { kind: 'wide' }); }
    if (r === 'noball') { I.runs += 1; I.extras.nb += 1; I.overRuns += 1; this.stats.noballs++; this.freeHit = true; this.emit('extra', { kind: 'noball' }); }
    if (legal) { I.legal++; I.ballInOver++; }
    const ballRuns = I.runs - (this.ballStartRuns || 0);
    const striker = this.striker;
    if (legal && striker) striker.balls++;
    if (r === 'boundary' && striker) { if (d.n === 4) striker.fours++; else striker.sixes++; }
    const rec = {
      n: this.ballNo, inn: I.k, over: I.over, ball: I.ballInOver, bowler: this.bowlerName(), batter: this.batterName(striker),
      runs: I.runs, wkts: I.wkts, reason: r, shot: this.bat ? this.bat.shot : '', grade: this.bat ? this.bat.grade : '',
      delivery: this.lastDel ? this.lastDel.key : '', kmh: this.lastDel ? this.lastDel.kmh : 0, legal, lofted: !!(this.bat && this.bat.lofted), ballRuns
    };
    this.log.push(rec);
    this.emit('ball', rec);
    if (this.bat && this.bat.grade === 'PERFECT') this.hypeGain(this.battingSide, 8, 'perfect');
    this.dotRun = legal && ballRuns === 0 && r !== 'wicket' && r !== 'runout' ? this.dotRun + 1 : 0;
    if (legal && ballRuns === 0 && r !== 'wicket' && r !== 'runout') this.dotBall();
    this.bat = null; this.lbw = null; this.reviewable = null; this.noBall = false; this.gathered = false; this.humanFieldHold = null;
    this.shock = false; this.grudgeBall = false; this.chirpActive = false; this.catchTrap = false; this.forceFour = false; this.ghostFielder = null;
    this.freeHit = this.freeHit && !legal;
    this.delivery = null;
    // the innings goes on: wickets fall, the target is passed, the over ends
    if (I.wkts >= I.wk) return this.endInnings('allout');
    if (this.chaseWon()) return this.endInnings('target');
    if (r === 'wicket' || r === 'runout') this.nextBatterIn();
    if (legal && I.ballInOver >= 6) return this.endOver();
    this.setPhase('between', 0.9);
    this.phase = 'between';
  }
  chaseWon() { const I = this.I; return I.target !== null && I.runs >= I.target; }
  dotBall() {
    this.hypeGain(this.bowlingSide, 6, 'dot');
    this.dots[this.bowlingSide]++;
    this.streakEnd(this.battingSide);
    // the church bells ring for a dot ball while the bells chaos lasts: Hype for the bowlers, and a roar
    if (this.bells > 0) { this.bells--; this.hypeGain(this.bowlingSide, 10, 'bells'); this.emit('bells', {}); }
    if (this.dots[this.bowlingSide] >= G.T('fireStreak') && !this.fire[this.bowlingSide]) { this.fire[this.bowlingSide] = true; this.emit('bowl:fire', { side: this.bowlingSide }); }
  }
  // the next batter walks in at the striker's end
  nextBatterIn() {
    const I = this.I;
    const slot = I.bat.findIndex(b => b.out && b.end === 'A');
    const dead = I.bat.findIndex(b => b.out);
    const idx = slot >= 0 ? slot : dead;
    if (idx < 0) return;
    if (I.nextP >= this.team(I.side).squad.length) return;
    const yy = I.bat[idx].end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE;
    I.bat[idx] = { p: I.nextP++, end: I.bat[idx].end, y: yy, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, how: '' };
  }
  endOver() {
    const I = this.I;
    I.over++;
    this.gulls = false; this.deflector = null; this.lightningOver = false;
    if (I.overRuns === 0) this.hypeGain(this.bowlingSide, 20, 'maiden');
    I.bat.forEach(b => { if (!b.out) { b.end = b.end === 'A' ? 'B' : 'A'; b.y = b.end === 'A' ? G.W.BAT_CREASE : G.W.BOWL_CREASE; } });
    this.emit('over', { n: I.over, runs: I.overRuns, wkts: I.wkts });
    if (I.over >= I.overs) return this.endInnings('overs');
    this.setPhase('between', 1.6);
    this.phase = 'between';
    this.startOverFlag = true;
  }
  afterBetween() {
    if (this.startOverFlag) { this.startOverFlag = false; this.startOver(); return; }
    this.setPhase('setup', 0.7);
    this.phase = 'setup';
    this.placeFielders();
  }
  endInnings(reason) {
    const I = this.I;
    I.endReason = reason;
    this.emit('innings:end', { k: I.k, runs: I.runs, wkts: I.wkts, reason });
    this.phase = 'between';
    this.setPhase('between', 0);
    if (I.k === 0 && this.cfg.singleInnings) return this.finish('single', I.side);
    if (I.k === 0) { this.setPhase('break', 3.0); this.phase = 'break'; return; }
    if (I.k === 1) {
      const a = this.innings[0], b = this.innings[1];
      if (b.runs > a.runs) return this.finish('chase', b.side);
      if (b.runs < a.runs) return this.finish('defend', a.side);
      this.setPhase('break', 3.0); this.phase = 'break'; this.superNext = true; return;
    }
    if (I.k === 2) { this.setPhase('break', 3.0); this.phase = 'break'; return; }
    if (I.k === 3) {
      const s1 = this.innings[2], s2 = this.innings[3];
      if (s2.runs > s1.runs) return this.finish('super', s2.side);
      if (s2.runs < s1.runs) return this.finish('super', s1.side);
      const b1 = s1.boundaries, b2 = s2.boundaries;
      if (b2 !== b1) return this.finish('super', b2 > b1 ? s2.side : s1.side);
      return this.finish('tie', -1);
    }
  }
  afterBreak() {
    if (this.superNext) { this.superNext = false; this.startInnings(2); this.emit('super', {}); return; }
    if (this.I.k === 0) return this.startInnings(1);
    if (this.I.k === 2) return this.startInnings(3);
  }
  finish(kind, winner) {
    this.phase = 'end';
    const a = this.innings[0], b = this.innings[1] || null;
    const side = winner;
    const margin = kind === 'chase' ? (2 + 0) : kind === 'defend' ? a.runs - b.runs : 0;
    const wkLeft = kind === 'chase' ? this.innings[1].wk - this.innings[1].wkts : 0;
    this.result = { kind, winner: side, margin, wicketsLeft: wkLeft, A: a.runs, B: b ? b.runs : 0, super: this.innings.length > 2 };
    this.emit('match:end', this.result);
  }
  // the powers: Hype, ON FIRE, items and targets
  hypeGain(side, n, why) {
    const before = this.hype[side];
    this.hype[side] = clamp(this.hype[side] + n * G.T('hypeGain'), 0, 100);
    if (before < 100 && this.hype[side] >= 100) this.emit('hype:full', { side, why });
  }
  spawnItem() {
    const side = this.battingSide;
    const ids = Object.keys(G.ITEMS);
    const id = ids[Math.floor(this.rng() * ids.length)];
    const x = G.W.PX + (this.rng() - 0.5) * 300, y = G.W.CY + (this.rng() - 0.5) * 220;
    this.items[side] = { id, x, y, r: 14 };
    this.emit('item:spawn', { id, x, y, side });
  }
  checkTargets() {
    const b = this.ball;
    if (!b.carried) return;
    for (const tg of this.ground.targets) {
      if (this.targetsHit[tg.id]) continue;
      if (Math.hypot(b.x - tg.x, b.y - tg.y) <= tg.r && b.z <= tg.z + 14) {
        this.targetsHit[tg.id] = true;
        this.stats.targets++;
        this.addRuns(tg.bonus);
        this.hypeGain(this.battingSide, 30, 'target');
        this.emit('target:hit', { id: tg.id, name: tg.name, bonus: tg.bonus, x: tg.x, y: tg.y });
      }
    }
    const it = this.items[this.battingSide];
    if (it && Math.hypot(b.x - it.x, b.y - it.y) <= it.r + 4 && b.z < 30) {
      this.items[this.battingSide] = null;
      this.stats.items++;
      if (it.id === 'cake') this.hypeGain(this.battingSide, 40, 'cake');
      else if (it.id === 'teapot') this.teapot[this.battingSide] = true;
      else if (it.id === 'horseshoe') this.horseshoe[this.battingSide] = true;
      this.emit('item:got', { id: it.id, side: this.battingSide });
    }
  }
  // chaos: between overs. A rain delay in the second innings revises the target by the Kerfuffle Method
  startChaos() {
    const id = this.chaosNow;
    this.chaosNow = null;
    if (id === 'rain') {
      this.rainUsed = true; this.stats.rain++;
      this.setPhase('rain', 6); this.phase = 'rain';
      this.emit('rain:start', {});
      return;
    }
    this.stats.chaos++;
    this.chaos = id;
    this.setPhase('chaos', 2.2); this.phase = 'chaos';
    this.emit('chaos', { id });
    // each chaos has its effect on the match, and each one ends by itself
    if (id === 'bees') { const f = this.fielders[(this.ballNo * 3) % 9]; if (f) f.slowT = 4; }
    if (id === 'tide') this.tide = Math.min(0.15, (this.tide || 0) + 0.04);
    if (id === 'gulls') this.gulls = true;
    if (id === 'bells') this.bells = 3;
    if (id === 'peacock') this.deflector = { x: G.W.PX + 70, y: G.W.CY + 60, zMax: 6, deg: 25, r: 16, used: false };
    if (id === 'dust') this.deflector = { x: G.W.PX - 110, y: G.W.CY + 20, zMin: 8, zMax: 30, deg: 10, r: 26, used: false };
    if (id === 'cow') this.deflector = { x: G.W.PX + 170, y: G.W.CY - 40, zMax: 8, deg: 25, r: 16, used: false };   // Doris, at deep midwicket: she turns a low ball too
  }
  endChaos() { this.chaos = null; this.setPhase('setup', 0.6); this.phase = 'setup'; }
  endRain() {
    const I = this.I;
    if (I.k === 1 && !I.isSuper) {
      const O = this.cfg.overs, o = Math.max(1, I.overs - 1), w = I.wkts;
      const first = this.innings[0].runs;
      const rev = Math.max(I.runs + 1, G.kerfTarget(first, O, o, w));
      const Rb = G.kerfResources(O, O, w), Ra = G.kerfResources(o, O, w);
      I.overs = o; I.target = rev;
      this.kmRevision = { first, before: first + 1, after: rev, O, o, w, Ra: +Ra.toFixed(3), Rb: +Rb.toFixed(3) };
      this.emit('kerf-method', this.kmRevision);
    }
    this.emit('rain:end', {});
    this.setPhase('setup', 0.6); this.phase = 'setup';
  }
  // the human side's review: once an innings, after an LBW or a caught-behind, the truth decides
  // ---- CPU batting ----
  cpuPlanBat() {
    const mistime = (this.chirpActive ? 2 : 1) * (this.lastDel && this.lastDel.special === 'dibbly' ? 2 : 1);
    const err = this.cfg.cheatPerfect ? 0 : (this.rng() - 0.5) * 2 * G.T('aiBatSkill') / 1000 * mistime;
    const pitch = this.predictPitch();
    const len = G.lengthOf(pitch.y);
    // a CPU batter with a full meter plays his special
    const sp = this.hype[this.battingSide] >= 100 ? this.batSpecialOf(this.striker) : null;
    if (sp) { this.hype[this.battingSide] = 0; this.cpuIntent = { button: 'loft', aim: null, special: sp }; this.cpuPressAt = this.arriveAbs - 0.14 + err; return; }
    const pLoft = this.cfg.cpuLoft !== undefined ? this.cfg.cpuLoft : G.T('aiAggression') * 0.6;
    const loft = this.rng() < pLoft && len !== 'yorker';
    const button = len === 'yorker' ? 'block' : loft ? 'loft' : 'shot';
    // a CPU batter leaves what is wide of the line, the way a sensible batter does
    const off = pitch.x - G.W.PX;
    if ((len === 'full' || len === 'good') && (off < -26 || off > 22) && this.rng() < 0.85) { this.cpuIntent = null; this.cpuPressAt = null; return; }
    this.cpuIntent = { button, aim: null, special: null };
    this.cpuPressAt = this.arriveAbs - G.SHOTS.drive.contactAt + err;
  }
  cpuFire() {
    if (!this.cpuIntent) { this.cpuPressAt = null; return; }
    const it = this.cpuIntent;
    this.cpuPressAt = null;
    this.batPress(it.button, it.aim);
  }
  // ---- human inputs: the stick aims the batter, the field moves the active fielder ----
  fieldMove(dx, dy, dt) {
    const f = this.humanField();
    if (!f || f.hold) return;
    const sp = f.speed * 1.15;
    f.x = clamp(f.x + dx * sp * dt, 40, 1112); f.y = clamp(f.y + dy * sp * dt, 40, 1112);
  }
  // a human fielder's button: the throw to an end ('A' the striker's, 'B' the bowler's), or a catch press
  fieldAct(end) {
    if (this.catchRing) return this.catchPress();
    if (this.humanFieldHold) { const f = this.humanFieldHold.f; this.throwTo(f, end); return true; }
    return false;
  }
};

