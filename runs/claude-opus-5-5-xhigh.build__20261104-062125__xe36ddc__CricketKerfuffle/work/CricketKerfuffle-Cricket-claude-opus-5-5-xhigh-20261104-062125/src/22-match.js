/* ---- THE MATCH: one object holds a whole match's simulation (pure: fixed steps, seeded randomness, no drawing or
 * sound; presentation reads its state and listens on the bus). The delivery director runs each ball as a state
 * machine with explicit exits and a timeout on every state, so play can never stall:
 *   intro -> setup -> runup -> flight -> inPlay -> dead -> between -> (pickBowler | inningsBreak | done) -> setup
 * MatchConfig: { mode: 'story'|'quick'|'showdown'|'nets'|'attract'|'hub'|'versus', teams: [a, b], ground, overs, wickets,
 *   difficulty, kerfuffleRules, timeOfDay, weather, battingFirst (0|1), scenario, humans: { 0: [inputs], 1: [inputs] },
 *   seed, superOver, reviewsPerInnings, fielding: 'assisted'|'manual'|'auto', running: 'manual'|'auto', cheat: {} } */
const PHASE_CAP = { intro: 6, setup: 40, runup: 4, flight: 4, inPlay: 15, dead: 14, between: 6, pickBowler: 15, inningsBreak: 30, rainDelay: 30 };
class Match {
  constructor(cfg) {
    this.cfg = cfg = Object.assign({ mode: 'quick', teams: ['ker', 'mud'], ground: 'green', overs: 2, wickets: 5, difficulty: 'county', kerfuffleRules: true, timeOfDay: null, weather: null,
      battingFirst: 0, scenario: null, humans: {}, seed: 1, superOver: true, reviewsPerInnings: 1, fielding: 'assisted', running: 'manual', cheat: {}, maxOversPerBowler: 'auto', commentary: true }, cfg);
    this.ground = GROUNDS[cfg.ground] || GROUNDS.green;
    this.timeOfDay = cfg.timeOfDay || this.ground.time; this.weather = cfg.weather || this.ground.weather;
    this.teams = cfg.teams.map(id => TEAMS[id]);
    this.names = {}; for (const t of this.teams) this.names[t.id] = t.name;
    RNG.seed(cfg.seed);
    this.time = 0; this.phase = 'intro'; this.pt = 0; this.innings = []; this.innNo = -1; this.result = null; this.events = [];
    this.ball = Ball.make(); this.hype = [0, 0]; this.fire = { bat: 0, bowl: 0, batStreak: 0, bowlStreak: 0, batBalls: 0, bowlBalls: 0 };
    this.items = [[], []]; this.tokens = []; this.targetsHit = {}; this.chaos = []; this.reviews = [cfg.reviewsPerInnings, cfg.reviewsPerInnings];
    this.flags = {}; this.force = { delivery: null, outcome: null }; this.boundaryShrink = 0; this.fog = this.weather === 'fog' ? .6 : 0; this.rain = 0;
    this.hold = 0; this.oversBowled = {}; this.lastBowler = null; this.fieldPreset = 'balanced'; this.over = 0; this.treats = [[], []];
    this.highlights = []; this.stats = { delays: 0, chaosThings: [], targets: [] };
    this.fielders = []; this.batters = []; this.umpires = []; this.batterActors = {};   // (filled at the first innings: the toss shows an empty square)
    this.env = { g: T('gravity'), pitchBounce: T('pitchBounce'), gb: this.ground.pitch.bounce, k: this.ground.k, slope: this.ground.slope };
  }
  /* ---- who plays what ---- */
  get bat() { return this.inn ? this.teams.findIndex(t => t.id === this.inn.bat) : 0; }
  get bowlSide() { return 1 - this.bat; }
  humansOf(side) { return this.cfg.humans[side] || []; }
  isHuman(side) { return this.humansOf(side).length > 0; }
  /** the input playing the striker's shots (or null: the CPU) */
  strikerInput() { const H = this.humansOf(this.bat); if (!H.length) return null; const s = this.striker; return H.length > 1 && s ? H[s.slot % H.length] : H[0]; }
  batterInput(b) { const H = this.humansOf(this.bat); if (!H.length || !b) return null; return H.length > 1 ? H[b.slot % H.length] : H[0]; }
  bowlerInput() { const H = this.humansOf(this.bowlSide); if (!H.length) return null; return H[this.over % H.length]; }
  fielderInput() { const H = this.humansOf(this.bowlSide); if (!H.length || this.cfg.fielding === 'auto') return null; return H.length > 1 ? H[(this.over + 1) % H.length] : H[0]; }
  get inn() { return this.innings[this.innNo] || null; }
  get kerfuffle() { return this.cfg.kerfuffleRules && this.cfg.mode !== 'nets'; }
  emit(type, data = {}) { data.match = this; this.events.push({ type, t: this.time, data }); if (this.events.length > 300) this.events.shift(); bus.emit(type, data); }
  /* ---- starting ---- */
  start() {
    const sc = this.cfg.scenario;
    if (sc && sc.innings === 1) {
      // a story scenario: the first innings already played (a posted total), the chase begins
      const bf = sc.battingFirst, i1 = Rules.newInnings(this.teams[bf].id, this.teams[1 - bf].id, { overs: this.cfg.overs, wickets: this.cfg.wickets, order: this.teams[bf].order.map(p => p.id) });
      i1.runs = sc.firstRuns; i1.wkts = sc.firstWkts || 4; i1.balls = this.cfg.overs * 6; i1.done = true; i1.end = 'overs'; i1.posted = true;
      this.innings.push(i1); this.innNo = 0;
      this.startInnings(1);
    } else this.startInnings(0);
    this.emit('match:start', { ground: this.ground.id });
  }
  startInnings(n) {
    const prev = this.innings[n - 1], sup = n >= 2;
    let batIdx;
    if (n === 0) batIdx = this.cfg.battingFirst;
    else if (n === 1) batIdx = this.teams.findIndex(t => t.id === prev.bowl);
    else if (n === 2) batIdx = this.teams.findIndex(t => t.id === this.innings[1].bat);
    else batIdx = this.teams.findIndex(t => t.id === prev.bowl);
    const team = this.teams[batIdx], opp = this.teams[1 - batIdx];
    const target = n === 1 || n === 3 ? prev.runs + 1 : null;
    const order = sup ? team.order.slice(0, 3).map(p => p.id) : team.order.map(p => p.id);
    const inn = Rules.newInnings(team.id, opp.id, { overs: sup ? 1 : this.cfg.overs, wickets: sup ? 2 : Math.min(this.cfg.wickets, order.length - 1), target, order, superOver: sup });
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub') { inn.wicketsMax = 2; inn.overs = 1; }
    inn.striker = order[0]; inn.nonStriker = order[1]; Rules.card(inn, order[0]); Rules.card(inn, order[1]);
    this.innings[n] = inn; this.innNo = n; this.over = 0; this.oversBowled = {}; this.lastBowler = null;
    this.reviews = [this.cfg.reviewsPerInnings, this.cfg.reviewsPerInnings];
    this.fire = { bat: 0, bowl: 0, batStreak: 0, bowlStreak: 0, batBalls: 0, bowlBalls: 0 };
    this.batSlots = {}; this.batSlots[order[0]] = 0; this.batSlots[order[1]] = 1;
    this.buildActors();
    this.chooseBowler(true);
    this.emit('innings:start', { n, bat: team.id, target, superOver: sup });
    this.setPhase(n === 0 || (this.cfg.scenario && n === 1 && this.innings[0].posted) ? 'intro' : 'setup');
  }
  /* ---- actors: the fielding side's eleven (bowler, keeper, nine fielders), the two batters and the umpires ---- */
  buildActors() {
    const fieldTeam = this.teams[this.bowlSide];
    this.fielders = []; this.batters = []; this.umpires = [];
    const mk = (p, role) => ({ p, role, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, home: [0, 0], speed: 0, task: 'idle', anim: { kind: 'idle', t: 0 }, id: p ? p.id : role, slot: 0, ghost: !!(p && p.ghost), state: {} });
    this.keeper = mk(fieldTeam.keeper, 'keeper');
    this.fielders = fieldTeam.players.filter(p => p !== fieldTeam.keeper).map(p => mk(p, 'fielder'));
    this.fielders.push(this.keeper);
    const ump = UMPIRES[this.ground.umpire];
    if (ump) { this.umpires.push(Object.assign(mk(null, 'umpire'), { u: ump, x: -14, y: 352, facing: -Math.PI / 2, id: 'umpire1' })); this.umpires.push(Object.assign(mk(null, 'umpire'), { u: UMPIRES.neutral, x: 200, y: 26, facing: Math.PI, id: 'umpire2', leg: true })); }
    this.batterActors = {};
    this.syncBatters();
  }
  batterActor(id) {
    if (!this.batterActors[id]) { const p = playerById(id); this.batterActors[id] = { p, role: 'batter', id, x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, anim: { kind: 'stance', t: 0 }, run: null, slot: this.batSlots[id] || 0, hand: p.hand || 1, ghost: !!p.ghost, state: {} }; }
    return this.batterActors[id];
  }
  syncBatters() {
    const inn = this.inn; if (!inn) return;
    this.striker = inn.striker ? this.batterActor(inn.striker) : null; this.nonStriker = inn.nonStriker ? this.batterActor(inn.nonStriker) : null;
    this.batters = [this.striker, this.nonStriker].filter(Boolean);
  }
  get hand() { return this.striker ? this.striker.hand : 1; }
  /** the boundary's distance from the pitch's middle along a direction (the ellipse, shrunk by the tide on the sea side) */
  boundaryAt(dx, dy) {
    const g = this.ground, sc = T('boundaryScale');
    let rx = g.rx * sc; const ry = g.ry * sc;
    if (g.seaSide && sign(dx) === g.seaSide) rx *= 1 - this.boundaryShrink;
    const l = hyp(dx, dy) || 1, ux = dx / l, uy = dy / l;
    return 1 / Math.sqrt((ux * ux) / (rx * rx) + (uy * uy) / (ry * ry));
  }
  /** is (x, y) beyond the rope? */
  outside(x, y) { const dx = x, dy = y - G.MID_Y, l = hyp(dx, dy); return l > this.boundaryAt(dx, dy); }
  /** the distance from the striker's stumps to the rope along batter-frame angle theta (degrees) */
  ropeFrom(theta, hand = this.hand) {
    const [ux, uy] = dirOf(theta, hand); let lo = 0, hi = 2000;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (this.outside(ux * m, uy * m)) hi = m; else lo = m; }
    return lo;
  }
  /** fielders' spots for a preset, in the striker's frame */
  fieldSpots(preset = this.fieldPreset) {
    const F = FIELDS[preset] || FIELDS.balanced, hand = this.hand;
    return F.spots.map(([pos, th, d]) => { const dist = d === 'b' ? this.ropeFrom(th) - 30 : d >= 200 ? Math.min(d * 1.3, this.ropeFrom(th) - 60) : d; const [ux, uy] = dirOf(th, hand); return { pos, x: ux * dist, y: uy * dist }; });
  }
  bowlerFamily() { return this.bowler && this.bowler.p.bowl ? this.bowler.p.bowl.type : 'medium'; }
  keeperSpot() { const f = this.bowlerFamily(); if (this.ground.nets) return [0, -30]; return f === 'spin' || f === 'medium' ? [0, -G.KEEPER_UP] : [0, -G.KEEPER_BACK]; }   // (in the Nets the keeper stands inside the net)
  placeField(snap) {
    const spots = this.fieldSpots(), outfield = this.fielders.filter(a => a !== this.keeper && a !== this.bowler);
    spots.forEach((s, i) => { const a = outfield[i]; if (!a) return; a.pos = s.pos; a.home = [s.x, s.y]; });
    const ks = this.keeperSpot(); this.keeper.home = ks; this.keeper.pos = 'keeper';
    if (this.bowler) { this.bowler.pos = 'bowler'; this.bowler.home = this.bowlerMark(); }
    for (const a of this.fielders) { if (snap || hyp(a.x - a.home[0], a.y - a.home[1]) > T('fieldSpeed') * 3) { a.x = a.home[0]; a.y = a.home[1]; } a.task = 'home'; a.ball = false; a.z = 0; a.down = 0; }
  }
  bowlerMark() { const fam = FAMILY[this.bowlerFamily()] || FAMILY.medium, x = this.overRound === 'round' ? G.RELEASE_X + 6 : -G.RELEASE_X - 6; return [x, G.BOWL_Y + 8 + fam.runLen]; }
  /* ---- the bowler for the next over: a human picks (pickBowler), the CPU captain chooses ---- */
  bowlerOptions() {
    const team = this.teams[this.bowlSide], max = this.cfg.maxOversPerBowler === 'auto' ? Math.max(1, Math.ceil(this.inn.overs / 5)) : this.cfg.maxOversPerBowler;
    let list = team.bowlers.filter(p => (this.oversBowled[p.id] || 0) < max && p.id !== this.lastBowler);
    if (!list.length) list = team.bowlers.filter(p => p.id !== this.lastBowler);
    if (!list.length) list = team.bowlers.slice();
    if (this.cfg.mode === 'showdown' || this.cfg.mode === 'hub') { const m = team.players.find(p => p.machine); if (m && !this.cfg.showdownBowl) list = [m]; }
    if (this.cfg.forceBowler) { const f = team.players.find(p => p.id === this.cfg.forceBowler); if (f) list = [f]; }
    if (this.cfg.forceBowlerFamily) { const fam = team.players.filter(p => p.bowl && p.bowl.type === this.cfg.forceBowlerFamily && p.id !== this.lastBowler); if (fam.length) list = fam; }
    return list.slice(0, 5);
  }
  chooseBowler(first) {
    const opts = this.bowlerOptions();
    if (this.isHuman(this.bowlSide) && opts.length > 1 && !first && this.cfg.mode !== 'attract') { this.pickOptions = opts; this.setPhase('pickBowler'); return; }
    if (this.isHuman(this.bowlSide) && opts.length > 1 && first && this.cfg.mode !== 'attract') { this.pickOptions = opts; this.pendingPick = true; }
    this.setBowler(AI.pickBowler(this, opts).id);
  }
  setBowler(id) {
    const team = this.teams[this.bowlSide], p = team.players.find(q => q.id === id) || team.bowlers[0];
    this.bowlerP = p;
    // the bowler is one of the fielders: swap roles
    let a = this.fielders.find(f => f.p === p && f !== this.keeper);
    if (!a) { a = this.fielders.find(f => f !== this.keeper); }
    this.bowler = a; this.overRound = 'over';
    const deliveries = p.bowl ? p.bowl.d : ['dobber', 'cutter', 'knuckle'];
    this.deliveryChoices = deliveries.slice(0, 3);
    if (this.cfg.mode !== 'nets') this.fieldPreset = AI.pickField(this);
    this.placeField(true);
    this.emit('bowler', { id: p.id });
  }
  setPhase(ph) { this.phase = ph; this.pt = 0; this['enter_' + ph] && this['enter_' + ph](); }
  /* ---- the step ---- */
  step(dt) {
    if (this.phase === 'done') return;
    this.time += dt; this.pt += dt;
    this.env.g = T('gravity'); this.env.pitchBounce = T('pitchBounce');
    if (this.hold > 0) { this.hold = Math.max(0, this.hold - dt); if (this.phase === 'dead' || this.phase === 'between' || this.phase === 'intro' || this.phase === 'setup') { this.animate(dt); return; } }
    const f = this['phase_' + this.phase]; if (f) f.call(this, dt);
    this.animate(dt);
    if (this.pt > (PHASE_CAP[this.phase] || 20)) this.timeout();
  }
  /** a state that ran past its cap: never stall. inPlay: a fielder fetches it and the umpire calls dead */
  timeout() {
    this.emit('timeout', { phase: this.phase });
    if (this.phase === 'inPlay' || this.phase === 'flight') this.deadBall('cap');
    else if (this.phase === 'setup' || this.phase === 'runup') { if (this.phase === 'setup') this.startRunup(this.cpuDelivery()); else this.release(); }
    else if (this.phase === 'dead') this.finishBall();
    else if (this.phase === 'between') this.nextBall();
    else if (this.phase === 'pickBowler') { this.setBowler(this.pickOptions[0].id); this.setPhase('setup'); }
    else if (this.phase === 'inningsBreak') this.afterBreak();
    else if (this.phase === 'rainDelay') this.endRain();
    else this.setPhase('setup');
  }
  phase_intro() { if (this.pt > 2.2) this.setPhase('setup'); }
  /* ---- SETUP: everyone to their places; the human bowler picks a delivery and the pitch marker (or the CPU thinks) ---- */
  enter_setup() {
    this.syncBatters();
    // AI Hub rounds: each ball's gameplay stream comes from the shared seed, so every copy faces identical balls whatever its player did
    if (this.cfg.mode === 'hub') { const n = this.inn ? this.inn.recs.length : 0; RNG.play = window.AIHub && window.AIHub.rng ? window.AIHub.rng('field' + n) : E.rng((this.cfg.seed * 31 + n) >>> 0 || 1); }
    const b = this.ball; Object.assign(b, Ball.make()); b.phase = 'held';
    this.cur = { over: this.over, ballInOver: this.inn.balls % 6, bowler: this.bowlerP.id, striker: this.striker.id, nonStriker: this.nonStriker.id, ran: 0, runs: 0, boundary: 0, extras: {}, wicket: null, bonus: 0, contact: null, shot: null, grade: null, events: [], appeals: [] };
    this.contact = null; this.shotPress = null; this.charge = 0; this.flags.forceRunOut = false; this.padHit = null; this.running = null; this.decision = null; this.thrown = null; this.holder = null; this.catchRing = null; this.settleT = 0; this.throwPick = null; this.overthrowArmed = false;
    this.marker = this.marker || [0, 90]; this.meter = null; this.aftertouch = 0; this.special = null; this.cpuPlan = null; this.batPlan = null; this.deliveryId = null; this.triple = null; this.vanish = null;
    this.reviewWindow = 0; this.appealT = 0; this.signal = null; this.ballSettled = false; this.stumpT = null; this.returnToCrease = false; this.ballFlying = 0; this.batSpecialArmed = this.batSpecialArmed === 'certainty' ? null : this.batSpecialArmed; this.autoSpecialPress = null; this.chaser = null; this.samples = [];
    if (this.cfg.cheat.catchesOnce) this.cfg.cheat.catchesOnce = false; if (this.cfg.cheat.directHitOnce) this.cfg.cheat.directHitOnce = false;
    for (const a of this.fielders) { a.stun = 0; a.passed = false; a.phased = false; a.ball = false; }
    for (const a of this.batters) { a.run = null; a.anim = { kind: 'stance', t: 0 }; a.down = 0; a.slip = 0; }
    const h = this.hand;
    this.striker.x = 6 * h; this.striker.y = G.CREASE_S + 2; this.striker.facing = h > 0 ? Math.PI : 0;
    this.nonStriker.x = -12 * h; this.nonStriker.y = G.CREASE_B + 4; this.nonStriker.facing = -Math.PI / 2;
    this.placeField(false);
    this.bowler.x = this.bowler.home[0]; this.bowler.y = this.bowler.home[1]; this.bowler.facing = -Math.PI / 2; this.bowler.anim = { kind: 'mark', t: 0 };
    this.thinkT = .6 + RNG.cosmetic() * .6;
    if (this.pendingPick) { this.pendingPick = false; this.setPhase('pickBowler'); return; }
    this.emit('ball:setup', {});
    AI.planBowling(this);
  }
  phase_setup(dt) {
    const I = this.bowlerInput();
    for (const a of this.fielders) if (a !== this.bowler) this.moveActor(a, a.home[0], a.home[1], T('fieldSpeed') * .9, dt, true);
    if (this.hold > 0) return;
    if (this.cfg.mode === 'hub' && K.hub && !K.hub.canBowl()) return;
    if (this.force.delivery) return this.startRunup(this.force.delivery.id, this.force.delivery);
    if (I && !(this.cfg.cheat.autoBowl)) {
      Bowling.humanSetup(this, I, dt);
    } else if (this.pt > this.thinkT) this.startRunup(this.cpuDelivery());
  }
  cpuDelivery() { const p = this.cpuPlan || AI.planBowling(this); return p.special ? 'special' : p.id; }
  enter_pickBowler() { this.pickI = 0; }
  phase_pickBowler() { const I = this.bowlerInput(); if (!I || this.cfg.cheat.autoBowl) { this.setBowler(AI.pickBowler(this, this.pickOptions).id); this.setPhase('setup'); } }
  pickBowler(i) { if (this.phase !== 'pickBowler') return; this.setBowler(this.pickOptions[clamp(i, 0, this.pickOptions.length - 1)].id); this.setPhase('setup'); }
  /* ---- moving an actor toward a point at up to `speed`, turning to face its way ---- */
  moveActor(a, tx, ty, speed, dt, faceBall) {
    const dx = tx - a.x, dy = ty - a.y, d = hyp(dx, dy);
    if (d < 1) { a.vx = 0; a.vy = 0; if (faceBall) a.facing = E.approachAng(a.facing, Math.atan2(this.striker.y - a.y, this.striker.x - a.x), dt * 6); return true; }
    const v = Math.min(speed, d / dt), ux = dx / d, uy = dy / d;
    a.vx = approach(a.vx, ux * v, 900 * dt); a.vy = approach(a.vy, uy * v, 900 * dt);
    a.x += a.vx * dt; a.y += a.vy * dt;
    a.facing = E.approachAng(a.facing, Math.atan2(uy, ux), dt * 10);
    this.avoidChaos(a);
    return false;
  }
  /** walking round Doris the cow (fielders path round her) */
  avoidChaos(a) {
    if (a === this.chaser && this.phase === 'inPlay') return;   // the chaser goes round her to the ball, whatever it takes
    for (const c of this.chaos) if (c.id === 'cow' && c.pos) { const dx = a.x - c.pos[0], dy = a.y - c.pos[1], d = hyp(dx, dy); if (d < 30 && d > .01) { a.x = c.pos[0] + dx / d * 30; a.y = c.pos[1] + dy / d * 30; } }
  }
  /* ---- the animation state the presentation reads (timers only: the rigs live in presentation) ---- */
  animate(dt) {
    for (const a of this.fielders) { if (a.anim) a.anim.t += dt; if (a.down > 0) a.down = Math.max(0, a.down - dt); }
    for (const a of this.batters) { if (a.anim) a.anim.t += dt; if (a.down > 0) a.down = Math.max(0, a.down - dt); }
    for (const u of this.umpires) if (u.anim) u.anim.t += dt;
    this.stepTokens(dt);
    this.stepChaos(dt);
  }
  /* ---- DEAD BALL and the end of a ball ---- */
  deadBall(why) {
    if (this.phase === 'dead' || this.phase === 'between') return;
    this.cur.dead = why; if (!(this.ballFlying > 0)) this.ball.phase = this.ball.phase === 'held' ? 'held' : 'dead';
    if (this.running) this.endRunning(true);
    this.setPhase('dead');
  }
  enter_dead() {
    const c = this.cur;
    this.deadT = c.wicket ? 2.4 : c.boundary ? 2.2 : 1.1;
    if (this.decision && this.decision.pending) this.deadT = Math.max(this.deadT, this.decision.umpT + .4);
    this.emit('ball:dead', { why: c.dead, rec: c });
    Umpire.signalFor(this);
  }
  phase_dead(dt) {
    // after a boundary the ball keeps flying for the show: a stadium target, the stands, the sea or the pub
    if (this.ballFlying > 0) {
      this.ballFlying -= dt; const b = this.ball, x0 = b.x, y0 = b.y, z0 = b.z;
      Ball.step(b, dt, this.env); this.checkTargets(x0, y0, z0);
      const S = { terrace: [.2, 16], bleachers: [.35, 30], dome: [.4, 96] }[this.ground.stands], dx = b.x, dy = b.y - G.MID_Y, past = hyp(dx, dy) - this.boundaryAt(dx, dy), stand = S ? clamp(past * S[0], 0, S[1]) : 0;
      if ((stand > 0 && b.z < stand) || this.ballFlying <= 0 || (b.z <= 0 && past > 0 && this.cur.boundary === 6)) {
        if (this.cur.boundary === 6 && !this.cur.landed) {
          this.cur.landed = true; this.emit('six:land', { x: b.x, y: b.y, z: b.z, stand: !!stand });
          // among the spectators (the stands, or the deck chairs and blankets just past a village or beach rope): a crowd catch, often
          const amongCrowd = stand > 0 || (past > 8 && past < 130), catchIt = this.flags.crowdCatchNext || (amongCrowd && RNG.cosmetic() < .55);
          if (catchIt && (amongCrowd || this.flags.crowdCatchNext)) { this.flags.crowdCatchNext = false; this.cur.crowdCatch = true; this.emit('crowd:catch', { x: b.x, y: b.y, z: b.z }); coverage.mark('crowdcatch'); }
        }
        this.ballFlying = 0; b.phase = 'dead';
      }
    }
    for (const a of this.fielders) if (a !== this.holder) this.moveActor(a, a.x + (a.home[0] - a.x) * .02, a.y + (a.home[1] - a.y) * .02, 40, dt, true);
    Umpire.stepDecision(this, dt);
    if (this.decision && (this.decision.pending || this.reviewWindow > 0 || this.decision.reviewing)) return;
    if (this.pt >= this.deadT) this.finishBall();
  }
  /** turn the ball's events into its record and apply it to the innings */
  finishBall() {
    if (this.phase === 'between') return;
    const c = this.cur, inn = this.inn;
    if (this.decision && this.decision.out === false && c.wicket && c.wicket.how === this.decision.kind) c.wicket = null;
    if (c.wicket && this.useItem(this.bat, 'horseshoe', 'wicket')) { c.horseshoe = c.wicket.how; c.wicket = null; this.emit('item:used', { id: 'horseshoe' }); }
    // runs: bat runs, or byes / leg byes when the bat never touched it
    const ex = c.extras = Object.assign({ wd: 0, nb: 0, b: 0, lb: 0 }, c.extras);
    if (c.gullByes && !c.boundary) c.ran = Math.max(c.ran, c.gullByes);
    let batRuns = c.boundary || c.ran;
    if (!c.contact && !ex.wd) { if (batRuns) { if (c.padded) ex.lb += batRuns; else ex.b += batRuns; } batRuns = 0; }
    if (ex.wd) { ex.wd = 1 + (c.boundary || c.ran); batRuns = 0; }
    c.runs = batRuns;
    c.double = batRuns > 0 && this.useItem(this.bat, 'teapot', 'runs');
    const before = inn.runs, wasStriker = c.striker;
    Rules.applyBall(inn, c);
    this.afterBallArcade(c, before);
    if (c.overEnd) { this.oversBowled[c.bowler] = (this.oversBowled[c.bowler] || 0) + 1; this.lastBowler = c.bowler; this.over++; }
    if (c.newBatter) this.batSlots[c.newBatter] = this.batSlots[c.wicket ? c.wicket.batter : wasStriker] || 0;
    this.emit('ball:done', { rec: c });
    if (c.wicket) this.emit('wicket:done', { rec: c });
    this.setPhase('between');
  }
  enter_between() { this.betweenT = this.cur.overEnd ? 1.6 : .9; }
  phase_between() {
    for (const a of this.batters) if (a.down) a.down = 0;
    if (this.pt >= this.betweenT) this.nextBall();
  }
  nextBall() {
    const inn = this.inn;
    if (inn.done) return this.endInnings();
    this.syncBatters();
    if (this.cur.overEnd) {
      this.emit('over:end', { over: this.over, inn: this.innNo });
      if (this.chaosOverStart()) return;
      this.chooseBowler(false);
      if (this.phase === 'pickBowler') return;
    } else this.chaosBetween();
    if (this.phase === 'rainDelay') return;
    this.setPhase('setup');
  }
  endInnings() {
    const n = this.innNo, inn = this.inn;
    this.emit('innings:end', { n, runs: inn.runs, wkts: inn.wkts, end: inn.end });
    const scen = this.cfg.scenario, chaseOnly = scen && scen.innings === 1;
    if (n === 0) { this.setPhase('inningsBreak'); return; }
    if (n === 1) {
      const res = Rules.result(this.innings[0], this.innings[1], this.names);
      if (res.tie && this.cfg.superOver && this.cfg.mode !== 'nets' && this.cfg.mode !== 'showdown' && this.cfg.mode !== 'hub') { this.emit('superover', {}); this.superPending = true; this.setPhase('inningsBreak'); return; }
      return this.finish(res);
    }
    if (n === 2) { this.setPhase('inningsBreak'); return; }
    return this.finish(Rules.superResult(this.innings[2], this.innings[3], this.names));
    void chaseOnly;
  }
  enter_inningsBreak() { this.breakT = this.cfg.mode === 'attract' ? 2 : 3.5; this.treatPick = this.cfg.mode === 'story' && this.isHuman(1 - this.bat) && this.innNo === 0; }
  phase_inningsBreak() { if (this.pt >= this.breakT && !this.treatPick && this.hold <= 0) this.afterBreak(); }
  afterBreak() { const n = this.innNo + 1; this.superPending = false; this.startInnings(n); }
  finish(res) {
    this.result = res; this.setPhase('done');
    this.emit('match:end', { result: res });
  }
  /* ---- helpers the rest use ---- */
  oversText() { return Rules.oversText(this.inn ? this.inn.balls : 0); }
  need() { const i = this.inn; if (!i || i.target === null) return null; return { runs: Math.max(0, i.target - i.runs), balls: i.overs * 6 - i.balls }; }
  sideOf(teamId) { return this.teams.findIndex(t => t.id === teamId); }
}
K.Match = Match;
