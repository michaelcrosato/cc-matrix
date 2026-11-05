// The match simulation: the state machine, rules, clock, possession, spotting, play setup. It owns athletes, the ball,
// the rules and the clock in world units and never reads a rig, a camera or the DOM. Everything that controls an
// athlete writes its intent ({ mx, my, turbo, press, held, recv }); the sim consumes intents and emits events on FF.bus.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, u = FF.u, F = FF.F, T = FF.T, YD = 16;
const bus = FF.bus;
const OFF_SLOTS = ['QB', 'C', 'LG', 'RG', 'RB', 'WR1', 'WR2'], DEF_SLOTS = ['DE1', 'NT', 'DE2', 'LB1', 'LB2', 'CB', 'S'];
FF.OFF_SLOTS = OFF_SLOTS; FF.DEF_SLOTS = DEF_SLOTS;
const DIFF = {
  rookie: { react: .38, tackle: .85, open: 4.5, kick: 1.5, cushion: 1.3, assist: true },
  'pro-': { react: .3, tackle: .93, open: 3.6, kick: 1.2, cushion: 1.12 },
  pro: { react: .24, tackle: 1, open: 3, kick: 1, cushion: 1 },
  'pro+': { react: .18, tackle: 1.06, open: 2.5, kick: .8, cushion: .92 },
  fiasco: { react: .13, tackle: 1.12, open: 2, kick: .6, cushion: .85 }
};
FF.DIFF = DIFF;
const blank = () => ({ mx: 0, my: 0, turbo: false, press: 0, held: 0, recv: -1, click: -1 });
FF.blankIntent = blank;
const B1 = 1, B2 = 2, B3 = 4, B4 = 8, LB = 16, RB = 32;
FF.BITS = { B1, B2, B3, B4, LB, RB };

class Match {
  /** spec (a scenario): { home, away, stadium, weather, night, quarterLength, quarter, clock, score, start, kicking, humans,
   *  difficulty, cards, cheats, seed, mode, events, ot, pat, noTurnover } */
  constructor(spec = {}) {
    this.spec = spec; this.mode = spec.mode || 'exhibition';
    FF.rng.seed(spec.seed === undefined ? (Math.random() * 1e9) | 0 : spec.seed);
    this.teams = [FF.data.teams[spec.home || 'fiascos'], FF.data.teams[spec.away || 'mudhogs']];
    this.stadium = spec.stadium || this.teams[0].stadium;
    this.difficulty = spec.difficulty || (FF.game.settings.difficulty) || 'pro';
    this.qLen = spec.quarterLength || FF.game.settings.quarter || 120;
    this.quarter = spec.quarter || 1; this.clock = spec.clock !== undefined ? spec.clock : this.qLen;
    this.score = (spec.score || [0, 0]).slice();
    this.half = this.quarter >= 3 ? 2 : 1;
    this.cheats = Object.assign({}, spec.cheats);
    this.humans = spec.humans || { 0: [], 1: [] };   // side -> list of local player indexes (or 'net:<seat>')
    this.roster = [0, 1].map(s => this.teams[s].players.map((p, i) => this.makeAthlete(p, s, i)));
    this.all = this.roster[0].concat(this.roster[1]);
    this.on = []; this.extra = [];   // the athletes on the field; extras (a mascot on the field)
    this.ball = { state: 'dead', x: F.MID_X, y: F.MID_Y, z: 0, vx: 0, vy: 0, vz: 0, holder: null, last: null, t: 0, spin: 0, angle: 0 };
    this.phase = 'COIN'; this.phaseT = 0; this.t = 0; this.step = 0;
    this.poss = 0; this.los = F.MID_X; this.down = 1; this.toGo = T.yardsToGo; this.ballY = F.MID_Y;
    this.play = null; this.calls = [null, null]; this.flip = [false, false]; this.cardsArmed = [null, null];
    this.cards = [[], []]; this.meter = [0, 0]; this.fiascoFills = [0, 0];
    this.stats = [0, 1].map(() => ({ yards: 0, passYds: 0, rushYds: 0, turnovers: 0, sacks: 0, bigHit: 0, longest: 0, lateHits: 0, tds: 0, firstDowns: 0, plays: 0 }));
    this.log = []; this.drive = [0, 0]; this.playNo = 0; this.qPlays = 0;
    this.openingReceiver = null; this.ot = false; this.over = false; this.winner = null;
    this.mascotPlay = null; this.lateHitT = 0; this.events = (spec.events || []).map(e => Object.assign({ fired: false }, e));
    this.specialsUsed = {}; this.nextKickoffFrom = null; this.patPending = false; this.kickoffSide = 0;
    this.stopClock = true; this.result = null; this.deadT = 0; this.celebrateT = 0; this.pile = null; this.meterK = null;
    this.ots = FF.OTS ? new FF.OTS(this) : null;
    if (spec.cards) for (const s of [0, 1]) { const c = spec.cards[s] || spec.cards[s === 0 ? 'home' : 'away']; if (Array.isArray(c)) this.cards[s] = c.slice(0, 3); }
    // the start: a coin toss and the opening kickoff, or a situation
    const st = spec.start || 'kickoff';
    if (st === 'kickoff' || st === 'coin') {
      if (spec.kicking !== undefined) this.toss = { winner: spec.kicking === 0 ? 1 : 0 };
      this.go('COIN', 1.5);
    } else this.situation(st);
  }
  makeAthlete(p, side, i) {
    const big = ['OL', 'NT', 'DE'].includes(p.pos) || (p.extra && p.extra.boss && p.extra.size >= 1.6);
    return { id: side * 15 + i, side, p, name: p.name, short: p.short, num: p.num, pos: p.pos, homeSlot: p.slot, slot: p.slot, r: p.r, special: p.special,
      x: F.MID_X, y: F.SIDE_B + 40, z: 0, vx: 0, vy: 0, vz: 0, facing: 0, rad: big ? 7.5 : 6, mass: 1 + p.r.STR * .15 + (big ? .6 : 0),
      action: null, pose: 'idle', poseU: 0, poseT: 0, carry: null, turbo: 1, downT: 0, fallBack: false, stunT: 0, intent: blank(), ctl: null,
      engaged: null, heat: 0, hot: 0, dinged: 0, bigHitsDrive: 0, helmetOff: false, onField: false, brain: { beh: 'idle' }, hist: [], tackleCD: 0, evadeT: 0, slowT: 0,
      stats: { yds: 0, rush: 0, rec: 0, recYds: 0, att: 0, comp: 0, passYds: 0, tds: 0, tackles: 0, sacks: 0, ints: 0, bigHits: 0, fumbles: 0, ff: 0, launch: 0 } };
  }
  /** a dir: +1 if side s attacks toward the right end, -1 toward the left */
  dir(s) { const d = this.half === 2 ? -1 : 1; return s === 0 ? d : -d; }
  goalX(s) { return this.dir(s) > 0 ? F.GOAL_R : F.GOAL_L; }   // the goal line side s attacks
  ownGoalX(s) { return this.dir(s) > 0 ? F.GOAL_L : F.GOAL_R; }
  /** world x for "side s's own N yard line" and back */
  xAt(s, ownYd) { return this.ownGoalX(s) + this.dir(s) * ownYd * YD; }
  ydOf(s, x) { return (x - this.ownGoalX(s)) * this.dir(s) / YD; }
  /** the ball spot as a broadcast string: OWN 20, OPP 35, 50 */
  spotText(s = this.poss, x = this.los) { const y = Math.round(this.ydOf(s, x)); return y === 50 ? '50' : y < 50 ? 'OWN ' + Math.max(1, y) : 'OPP ' + Math.max(1, 100 - y); }
  get off() { return this.poss; }
  get def() { return 1 - this.poss; }
  go(phase, t = 0) { const from = this.phase; this.phase = phase; this.phaseT = t; bus.emit('phase', { from, to: phase, m: this }); }
  diff(s) { const human = (this.humans[s] || []).length > 0; return human ? DIFF.pro : DIFF[this.difficulty] || DIFF.pro; }
  isHuman(s) { return (this.humans[s] || []).length > 0 && !(FF.autopilot && (FF.autopilot === true || FF.autopilot === s + 1)); }
  /** a situation: { possession, los (own yard line), down, toGo, ballY } */
  situation(st) {
    this.poss = st.possession === 'away' ? 1 : st.possession === 'home' ? 0 : (st.possession || 0);
    this.los = this.xAt(this.poss, st.los === undefined ? 25 : st.los); this.down = st.down || 1; this.toGo = st.toGo || T.yardsToGo; this.ballY = F.MID_Y;
    this.lineToGain = this.los + this.dir(this.poss) * this.toGo * YD;
    if (st.kickoff) { this.kickoffSide = this.poss; this.toPlaycall('kickoff'); }
    else this.toPlaycall();
  }

  /* ================= THE STEP ================= */
  stepSim(dt) {
    this.t += dt; this.step++; this.phaseT -= dt;
    if (this.ots) this.ots.update(dt);
    switch (this.phase) {
      case 'COIN': if (this.phaseT <= 0) this.coinDone(); break;
      case 'PLAYCALL': this.updatePlaycall(dt); break;
      case 'PRESNAP': this.updatePresnap(dt); break;
      case 'LIVE': this.updateLive(dt); break;
      case 'DEAD': this.updateDead(dt); break;
      case 'CELEBRATE': this.updateMovers(dt, true); if (this.phaseT <= 0) this.afterCelebrate(); break;
      case 'QBREAK': if (this.phaseT <= 0) this.afterBreak(); break;
      case 'HALFTIME': if (this.phaseT <= 0 && !this.holdHalftime) this.secondHalf(); break;
      case 'PILE': this.updatePile(dt); break;
      case 'FINAL': this.updateMovers(dt, true); break;
    }
    if (this.phase === 'PLAYCALL' || this.phase === 'COIN' || this.phase === 'QBREAK' || this.phase === 'HALFTIME') this.updateMovers(dt, false);
  }
  coinDone() {
    const w = this.toss ? this.toss.winner : (FF.r() < .5 ? 0 : 1);
    this.toss = { winner: w }; this.openingReceiver = w; this.kickoffSide = 1 - w;
    bus.emit('coin', { winner: w, m: this });
    this.poss = this.kickoffSide; this.toPlaycall('kickoff');
  }

  /* ---- PLAYCALL: both sides choose; the CPU after a human-like delay; the timer picks COACH SAYS ---- */
  toPlaycall(kind) {
    this.callKind = kind || (this.patPending ? 'pat' : 'scrimmage');
    this.calls = [null, null]; this.flip = [false, false]; this.cardsArmed = [null, null];
    if (this.callKind === 'kickoff') { this.poss = this.kickoffSide; this.los = this.kickoffLos(); this.ballY = F.MID_Y; this.down = 1; this.toGo = T.yardsToGo; }
    this.cpuCallAt = [.6 + FF.r() * .8, .6 + FF.r() * .8];
    this.pcT = 0; this.go('PLAYCALL', T.playcallTime);
    this.placeHuddle();
    bus.emit('playcall', { kind: this.callKind, m: this });
  }
  /** what each side may call now: { tabs, plays by tab, role } */
  options(s) {
    const k = this.callKind, off = s === this.poss, P = FF.data.plays;
    if (k === 'kickoff') return off ? { role: 'kick', tabs: ['KICKOFF'], plays: { KICKOFF: ['ko_deep', 'ko_squib', 'ko_onside'] } } : { role: 'return', tabs: ['RETURN'], plays: { RETURN: ['ret_mid', 'ret_left', 'ret_right', 'hands_team'] } };
    if (k === 'pat') return off ? { role: 'off', tabs: ['PAT'], plays: { PAT: ['pat_kick', 'pat_two'] } } : { role: 'def', tabs: ['BASE', 'SPECIAL'], plays: { BASE: ['cover2', 'man', 'qb_spy'], SPECIAL: ['goal_line', 'fg_block'] } };
    if (k === 'two') return off ? { role: 'off', tabs: ['RUN', 'PASS', 'TRICK'], plays: tabPlays(['RUN', 'PASS', 'TRICK'], 'off') } : { role: 'def', tabs: FF.data.defTabs, plays: tabPlays(FF.data.defTabs, 'def') };
    if (off) return { role: 'off', tabs: FF.data.offTabs, plays: tabPlays(FF.data.offTabs, 'off') };
    const t = tabPlays(FF.data.defTabs, 'def'); t.SPECIAL = t.SPECIAL.concat(['punt_return', 'punt_block']);
    return { role: 'def', tabs: FF.data.defTabs, plays: t };
    function tabPlays(tabs, side) { const o = {}; for (const tb of tabs) o[tb] = Object.values(P).filter(p => p.tab === tb && p.side === side && !p.kickDef).map(p => p.id); if (o.SPECIAL && side === 'def') o.SPECIAL.push('fg_block'); return o; }
  }
  /** a side's choice: play id, flip, card id (or null) */
  callPlay(s, id, flip = false, card = null) {
    if (this.phase !== 'PLAYCALL') return false;
    const pl = FF.data.plays[id]; if (!pl) return false;
    this.calls[s] = id; this.flip[s] = !!flip;
    if (card && this.cards[s].includes(card)) this.cardsArmed[s] = card;
    bus.emit('called', { side: s, id, m: this });
    return true;
  }
  updatePlaycall(dt) {
    this.pcT += dt;
    for (const s of [0, 1]) if (!this.calls[s] && !this.isHuman(s) && this.pcT >= this.cpuCallAt[s] / (this.fastCalls ? 10 : 1)) { const c = FF.coach.call(this, s); this.callPlay(s, c.play, c.flip, c.card); }
    if (this.phaseT <= 0) for (const s of [0, 1]) if (!this.calls[s]) { const c = this.isHuman(s) ? { play: FF.coach.suggest(this, s), flip: false } : FF.coach.call(this, s); this.callPlay(s, c.play, c.flip, null); }
    if (this.calls[0] && this.calls[1] && !this.waitCalls) this.startPresnap();
  }

  /* ---- PRESNAP: units take the field and their spots; the offense hikes ---- */
  startPresnap() {
    const off = this.poss, def = 1 - off, oc = FF.data.plays[this.calls[off]], dc = FF.data.plays[this.calls[def]];
    let ocall = oc;
    if (oc.id === 'pat_kick') { this.los = this.xAt(off, 85); }
    if (oc.id === 'pat_two') { this.los = this.xAt(off, 97); ocall = null; }
    // GO FOR 2: one more call from the normal offense tabs
    if (oc.id === 'pat_two') { this.callKind = 'two'; this.calls = [null, null]; this.cardsArmed = [null, null]; this.go('PLAYCALL', T.playcallTime); this.pcT = 0; this.cpuCallAt = [.5, .5]; bus.emit('playcall', { kind: 'two', m: this }); return; }
    void ocall;
    this.play = { off: oc, def: dc, flipO: this.flip[off], flipD: this.flip[def], t: 0, snapped: false, kind: this.callKind, events: [], startLos: this.los, startDown: this.down,
      startToGo: this.toGo, startScore: this.score.slice(), passer: null, target: null, sack: false, completed: false, incomplete: false, turnover: false, carrierStart: null,
      maxGain: 0, cards: this.cardsArmed.slice(), bigPlay: false, excitement: 0, out: false, fakeT: 0 };
    this.playNo++; this.qPlays++;
    // the cards played
    for (const s of [0, 1]) { const c = this.cardsArmed[s]; if (c) this.useCard(s, c); }
    this.setupUnits();
    this.meterK = null;
    if (oc.type === 'kickoff' || oc.type === 'punt' || oc.type === 'fg') this.meterK = { side: off, kind: oc.type === 'kickoff' ? oc.kick : oc.type, stage: 0, t: 0, power: 0, acc: 0, aim: 0, needle: 0, dir: 1, done: false };
    this.hikeAt = this.isHuman(off) ? null : (.6 + FF.r() * 1.2) / (this.fastCalls ? 4 : 1);
    this.go('PRESNAP', 1.1); this.presnapT = 0;
    bus.emit('presnap', { m: this, off: oc, def: dc });
  }
  useCard(s, id) {
    const card = FF.data.cards[id], i = this.cards[s].indexOf(id); if (!card || i < 0) return;
    if (!this.cheats.unlimitedCards || !this.isHuman(s)) this.cards[s].splice(i, 1);
    const ctx = { side: s, match: this, held: this.heldAthlete(s), star: this.starOf(s), mod: (name, m, plays) => bus.addMod(name, Object.assign({ plays, tag: 'card' }, m)) };
    card.apply(ctx);
    bus.emit('cardUsed', { side: s, card: id, team: this.teams[s], m: this });
  }
  heldAthlete(s) { return this.on.find(a => a.side === s && a.ctl !== null) || null; }
  starOf(s) { const t = this.teams[s]; return this.roster[s].find(a => a.p === t.star) || this.roster[s][0]; }
  /** pick the 7 on each side for this play and put them at their spots (from the huddle, they jog there in PRESNAP) */
  setupUnits() {
    const off = this.poss, def = 1 - off, oc = this.play.off, dc = this.play.def, by = slot => s => this.roster[s].find(a => a.homeSlot === slot);
    for (const a of this.all) { a.onField = false; a.slot = a.homeSlot; a.assign = null; a.engaged = null; a.action = null; a.carry = null; a.stunT = 0; a.tackleCD = 0; }
    let oSlots = OFF_SLOTS.slice(), dSlots = DEF_SLOTS.slice(), oSwap = {}, dSwap = {};
    if (oc.type === 'kickoff') { oSlots = ['K', 'DE1', 'DE2', 'LB1', 'LB2', 'CB', 'S']; dSlots = OFF_SLOTS.slice(); }   // the kicking team (its defense unit, with its K) and the receiving team
    else if (oc.formation === 'punt') { oSwap = { K: 'K' }; oSlots = ['K', 'C', 'LG', 'RG', 'RB', 'WR1', 'WR2']; }
    else if (oc.formation === 'fieldgoal') { oSlots = ['QB', 'K', 'C', 'LG', 'RG', 'RB', 'WR2']; }
    void oSwap; void dSwap;
    const unit = (s, slots) => slots.map(sl => { const a = by(sl)(s); a.onField = true; a.slot = sl; return a; });
    const O = unit(off, oSlots), D = unit(def, dSlots);
    this.on = O.concat(D); this.unit = [null, null]; this.unit[off] = O; this.unit[def] = D;
    this.bySlot = [{}, {}]; for (const a of this.on) this.bySlot[a.side][a.slot] = a;
    // the mascot as a 12th player
    this.extra = [];
    if (this.mascotPlay !== null) { const s = this.mascotPlay; this.extra.push(this.makeMascot(s)); this.mascotPlay = null; }
    // the ball at the spot; spots in the offense's frame
    this.ballY = E.clamp(this.ballY, F.MID_Y - F.HASH, F.MID_Y + F.HASH);
    const b = this.ball; b.state = 'dead'; b.holder = null; b.x = this.los; b.y = this.ballY; b.z = 2; b.vx = b.vy = b.vz = 0; b.last = null;
    const fo = FF.data.formations[oc.formation || 'pro'] || FF.data.formations.pro, D0 = this.dir(off), fl = this.play.flipO ? -1 : 1;
    const W = (xy, flip = fl) => ({ x: this.los + D0 * xy[0] * YD, y: this.ballY + D0 * xy[1] * flip * YD });
    this.toWorld = W;
    for (const a of O) { const sp = fo[a.slot] || (a.slot === 'K' ? fo.QB : null) || [-3, 0]; a.spot = W(sp); a.assign = (oc.assign && oc.assign[a.slot]) || null; }
    if (oc.type === 'kickoff') {
      const recv = FF.data.formations.kickreturn, ret = this.play.def;
      for (const a of D) { const sp = recv[a.slot] || [20, 0]; let y = sp[1] + (ret.lane || 0) * 4; if (ret.hands) { a.spot = W([sp[0] < 30 ? 11 : 30, y * .6]); } else a.spot = W([sp[0], y]); a.assign = { ret: true }; }
      this.returner = this.bySlot[def].WR1;
    } else {
      const df = FF.data.formations[dc.formation || (oc.formation === 'punt' ? 'puntreturn' : 'base')] || FF.data.formations.base, Df = this.play.flipD ? -1 : 1;
      const form = oc.formation === 'punt' && dc.type !== 'puntreturn' ? FF.data.formations.puntreturn : oc.formation === 'punt' ? FF.data.formations.puntreturn : df;
      for (const a of D) {
        const sp = form[a.slot] || [8, 0]; let yy = sp[1];
        if (typeof yy === 'string') { const t = this.bySlot[off][yy]; yy = t ? (t.spot.y - this.ballY) / YD * D0 : 0; a.spot = { x: this.los + D0 * sp[0] * YD, y: this.ballY + yy * D0 * YD }; }
        else a.spot = { x: this.los + D0 * sp[0] * YD, y: this.ballY + D0 * yy * Df * YD };
        a.assign = (dc.assign && dc.assign[a.slot]) || null;
        if (oc.formation === 'punt' || oc.formation === 'fieldgoal' || dc.type === 'puntreturn') a.assign = a.slot === 'CB' && oc.formation === 'punt' ? { ret: true } : (dc.block || dc.kickDef || oc.formation === 'fieldgoal' ? { rush: 'A', jump: a.slot === 'NT' || a.slot === 'LB1' } : { rush: 'contain', soft: true });
      }
      if (oc.formation === 'punt') this.returner = this.bySlot[def].CB;
    }
    // stand them by the spots, offense facing the defense
    for (const a of this.on) { a.facing = this.dir(a.side) > 0 ? 0 : Math.PI; a.action = null; a.downT = 0; a.vx = a.vy = a.vz = 0; a.z = 0; a.pose = 'run'; a.brain = { beh: 'formation' }; a.intent = blank(); a.hist.length = 0; a.evadeT = 0; a.slowT = 0; a.drag = null; }
    // off the field: the benches on the near sideline
    let k = 0; for (const a of this.all) if (!a.onField) { a.x = F.MID_X + (a.side ? 1 : -1) * (120 + (k++ % 8) * 22); a.y = F.SIDE_B + 70 + (k % 2) * 8; a.vx = a.vy = 0; a.pose = 'idle'; a.facing = -Math.PI / 2; a.carry = null; }
    for (const m of this.extra) { m.x = F.MID_X + (m.side ? 220 : -220); m.y = F.SIDE_B + 30; }
    // humans take their athletes
    FF.control && FF.control.assignPresnap(this);
    if (this.onSetup) this.onSetup(this);
  }
  makeMascot(s) {
    const t = this.teams[s];
    const p = { name: t.mascot.name, short: t.mascot.name, num: 0, pos: 'LB', slot: 'MASCOT', r: { SPD: 9, ACC: 8, STR: 8, HND: 4, TCK: 8, ARM: 1, AIM: 1, AWR: 7, KCK: 1 }, extra: {}, mascot: true };
    const a = this.makeAthlete(p, s, 14); a.id = 40 + s; a.mascot = true; a.onField = true; a.slot = 'MASCOT'; a.noClip = true; a.facing = 0;
    a.assign = s === this.poss ? { mascotBlock: true } : { rush: 'A', mascot: true };
    bus.emit('mascotOn', { side: s, team: t, m: this });
    return a;
  }
  /** put the units in huddles (and keep the ball dead at the spot) while the plays are called */
  placeHuddle() {
    const off = this.poss, D0 = this.dir(off), k = this.callKind;
    for (const a of this.all) { a.action = null; a.downT = Math.min(a.downT, .3); a.carry = null; a.engaged = null; }
    const b = this.ball; b.state = 'dead'; b.holder = null; b.x = this.los; b.y = E.clamp(this.ballY, F.MID_Y - F.HASH, F.MID_Y + F.HASH); b.z = 2;
    void D0; void k;
  }
  updatePresnap(dt) {
    this.presnapT += dt;
    const off = this.poss, oc = this.play.off;
    // athletes jog to their spots for 1.1 s, then the line sets
    if (this.presnapT < 1.1) { FF.ai.update(this, dt); this.moveAll(dt); }
    else if (!this.set) { this.set = true; for (const a of this.on) { a.x = a.spot.x; a.y = a.spot.y; a.vx = a.vy = 0; const I = a.intent; I.mx = I.my = 0; I.press = 0; a.facing = this.dir(a.side) > 0 ? 0 : Math.PI; a.pose = this.stancePose(a); } this.ball.x = this.los; this.ball.y = this.ballY; }
    else {
      // the defense's human may move his defender behind the line
      FF.control && FF.control.presnapMoves(this, dt);
      for (const m of this.extra) { m.x += (m.side === off ? -1 : 1) * 0; }
    }
    if (!this.set) return;
    // the kick meter, or the hike
    if (this.meterK) { this.updateMeter(dt); return; }
    const hum = this.isHuman(off);
    let hike = false;
    if (hum) { this.autoHikeT = (this.autoHikeT || 0) + dt; if (this.on.some(a => a.side === off && a.ctl !== null && (a.intent.press & B1))) hike = true; if (this.autoHikeT >= T.autoHike) hike = true; if (this.hikeNow) hike = true; }
    else if (this.presnapT - 1.1 >= this.hikeAt) hike = true;
    if (hike) this.snap();
  }
  stancePose(a) {
    const oc = this.play.off;
    if (oc.type === 'kickoff') return a.slot === 'K' ? 'idle' : a.side === this.poss ? 'stance2' : 'stance2';
    if (a.side === this.poss) { if (['C', 'LG', 'RG'].includes(a.slot)) return 'stance3'; if (a.slot === 'QB') return oc.formation === 'pro' || oc.formation === 'tight' ? 'qbUC' : 'qbSG'; if (a.slot === 'K' && oc.formation === 'fieldgoal') return 'idle'; return 'stance2'; }
    if (['DE1', 'NT', 'DE2'].includes(a.slot)) return 'stance3';
    return 'stance2';
  }
  /* ---- the kick meter: aim (stick), then 3 presses: start, power, accuracy ---- */
  updateMeter(dt) {
    const K = this.meterK, s = K.side, kicker = this.on.find(a => a.side === s && a.slot === 'K');
    K.wait = (K.wait || 0) + dt; const hum = this.isHuman(s) && !(K.stage === 0 && K.wait > FF.T.autoHike) && !K.auto; if (!hum && this.isHuman(s)) K.auto = true;   // (a human who never starts the meter gets a CPU kick)
    const needleMul = bus.mod('kick.needle', 1, { side: s }), band = T.accBand * bus.mod('kick.band', 1, { side: s });
    K.band = band;
    let press = false, aimIn = 0;
    if (hum) { const h = this.on.find(a => a.side === s && a.ctl !== null) || kicker; if (h) { press = !!(h.intent.press & B1); aimIn = h.intent.aimX || 0; } if (this.meterPress) { press = true; this.meterPress = false; } }
    else {
      // the CPU kicker: picks its power and accuracy from KCK and difficulty, plus noise
      const d = this.diff(s), want = this.cpuKickWant || (this.cpuKickWant = this.cpuKick(K, kicker, d));
      if (K.stage === 0 && this.presnapT > 1.6) press = true;
      else if (K.stage === 1 && K.power >= Math.min(.97, want.power) - .01) press = true;
      else if (K.stage === 2 && Math.abs(K.needle - want.acc) < .03) press = true;
      else if (K.stage === 2 && K.t > 3) press = true;
      K.aim = want.aim;
    }
    const maxAim = K.kind === 'fg' ? .07 : .26;
    if (K.stage === 0) { K.aim = E.clamp(K.aim + aimIn * dt * .5, -maxAim, maxAim); if (press) { K.stage = 1; K.t = 0; K.power = 0; K.dir = 1; bus.emit('meter', { stage: 1, m: this }); } }
    else if (K.stage === 1) {
      K.t += dt; K.power += K.dir * dt * T.meterSpeed * 1.8 * needleMul; if (K.power >= 1) { K.power = 1; K.dir = -1; } if (K.power <= 0 && K.dir < 0) { K.power = 0; K.dir = 1; }
      if (press) { K.stage = 2; K.t = 0; K.needle = -1; K.ndir = 1; bus.emit('meter', { stage: 2, m: this }); }
    } else if (K.stage === 2) {
      K.t += dt; const sp = T.meterSpeed * 2.2 * needleMul * (K.power > .95 ? 1.5 : 1);
      K.needle += K.ndir * dt * sp; if (K.needle >= 1) { K.needle = 1; K.ndir = -1; } if (K.needle <= -1) { K.needle = -1; K.ndir = 1; }
      if (press) { K.acc = Math.abs(K.needle) <= band ? 0 : K.needle; K.stage = 3; K.done = true; bus.emit('meter', { stage: 3, m: this }); this.cpuKickWant = null; this.snap(); }
    }
    if (this.cheats.perfectKick && K.stage === 3) K.acc = 0;
  }
  cpuKick(K, kicker, d) {
    const R = FF.r, kk = (kicker ? kicker.r.KCK : 5);
    let power = .8 + kk * .02, acc = u.gauss(R) * .1 * d.kick * (1.3 - kk * .06), aim = 0;
    if (K.kind === 'fg') { const dist = this.fgDistance() * 1.16 + 2; power = E.clamp((dist - 25) / (25 + kk * 1.6), .35, .97); }
    if (K.kind === 'punt') { power = E.clamp(.75 + u.gauss(R) * .08, .5, .97); aim = u.gauss(R) * .08; }
    if (K.kind === 'deep') { power = E.clamp(.8 + u.gauss(R) * .08, .55, .98); aim = u.gauss(R) * .1; }
    if (K.kind === 'squib' || K.kind === 'onside') power = .6 + u.gauss(R) * .05;
    power = E.clamp(power + u.gauss(R) * .08 * d.kick, .2, .99);
    if (this.forceKick) { acc = this.forceKick.acc; power = this.forceKick.power || power; }
    return { power, acc: E.clamp(acc, -1, 1), aim };
  }
  fgDistance() { return Math.round(this.ydOf(this.poss === undefined ? 0 : this.poss, this.goalX(this.poss)) - this.ydOf(this.poss, this.los)) + 17; }

  /* ---- THE SNAP ---- */
  snap() {
    const off = this.poss, oc = this.play.off, b = this.ball;
    this.play.snapped = true; this.play.t = 0; this.set = false; this.autoHikeT = 0; this.hikeNow = false;
    for (const a of this.on) a.hist.length = 0;
    FF.ai.snap(this);
    this.go('LIVE'); this.stopClock = false;
    if (this.blocks) this.blocks.length = 0;
    this.lockLines();
    this.play.losX = this.los;
    const C = this.bySlot[off].C, QB = this.bySlot[off].QB;
    if (oc.type === 'kickoff') { b.state = 'tee'; b.x = this.los; b.y = this.ballY; b.z = 4; const K = this.bySlot[off].K; K.action = { id: 'kickRun', t: 0, dur: .55 }; bus.emit('snap', { m: this, kick: true }); return; }
    if (oc.type === 'kneel') { b.state = 'held'; b.holder = QB; QB.carry = 'R'; QB.action = { id: 'kneel', t: 0, dur: .5 }; QB.pose = 'kneel'; bus.emit('snap', { m: this }); return; }
    if (C) { C.action = { id: 'snap', t: 0, dur: .25 }; C.pose = 'snap'; }
    // the snap goes to the QB (under center: in hand; shotgun: an arc), the punter, or the holder
    const to = oc.formation === 'punt' ? this.bySlot[off].K : QB;
    if (to) {
      const d = u.dist(to, { x: this.los, y: this.ballY });
      if (d < 2.2 * YD) { b.state = 'held'; this.giveBall(to, 'snap'); }
      else { const t = oc.formation === 'punt' ? .5 : .3; this.throwBall({ x: this.los, y: this.ballY, z: 6 }, { x: to.x, y: to.y, z: 18 }, t, 'snap', C, to); }
    }
    bus.emit('snap', { m: this, qb: QB });
  }

  /* ---- LIVE ---- */
  updateLive(dt) {
    const pl = this.play; pl.t += dt;
    if (!this.cheats.freezeClock && !this.stopClock && this.mode !== 'drill') this.clock = Math.max(0, this.clock - dt);
    FF.ai.update(this, dt);
    this.runScript(dt);
    this.updateActions(dt);
    this.moveAll(dt);
    this.collide(dt);
    this.updateBall(dt);
    this.checkContacts(dt);
    this.checkDead(dt);
    for (const a of this.on) { a.hist.push([a.x, a.y, a.vx, a.vy]); if (a.hist.length > 60) a.hist.shift(); }
  }
  runScript(dt) {
    const pl = this.play, oc = pl.off, off = this.poss, QB = this.bySlot[off].QB, b = this.ball;
    if (!oc.qb && !oc.assign) return;
    const q = oc.qb || {};
    // handoffs and pitches
    if (q.handoff && !pl.handed && b.holder === QB && pl.t >= q.at) {
      const to = this.bySlot[off][q.handoff];
      if (to && to.downT <= 0) {
        const d = u.dist(QB, to);
        if (q.pitch) { pl.handed = true; this.throwBall({ x: QB.x, y: QB.y, z: 16 }, { x: to.x + to.vx * .4, y: to.y + to.vy * .4, z: 16 }, .4, 'pitch', QB, to); QB.action = { id: 'lateral', t: 0, dur: .3 }; }
        else if (d < 1.6 * YD || pl.t > q.at + .7) { pl.handed = true; this.giveBall(to, 'handoff'); QB.action = { id: 'handoffGive', t: 0, dur: .35 }; to.action = { id: 'handoffTake', t: 0, dur: .3 }; bus.emit('handoff', { from: QB, to, m: this }); }
      }
    }
    // the flea flicker: the RB pitches it back to the QB
    if (q.flea && pl.handed && !pl.flea && pl.t >= q.flea.back) { const rb = this.bySlot[off].RB; if (b.holder === rb && rb.downT <= 0) { pl.flea = true; this.throwBall({ x: rb.x, y: rb.y, z: 16 }, { x: QB.x, y: QB.y, z: 18 }, .45, 'pitch', rb, QB); rb.action = { id: 'lateral', t: 0, dur: .3 }; } }
    // the fumblerooski: the QB sets it down; the center scoops it up
    if (q.setDown && !pl.setDown && pl.t >= q.setDown && b.holder === QB) { pl.setDown = true; b.state = 'placed'; b.holder = null; QB.carry = null; b.x = this.los - this.dir(off) * 1.2 * YD; b.y = this.ballY; b.z = 1; }
    if (pl.setDown && !pl.scooped && pl.t >= .6) { const C = this.bySlot[off].C; if (C && b.state === 'placed') { pl.scooped = true; this.giveBall(C, 'scoop'); C.engaged = null; } }
    // the QB sneak: he keeps it
    if (q.keep && !pl.kept && b.holder === QB) { pl.kept = true; QB.brain.beh = 'carry'; }
  }
  /* ---- after the play: DEAD ---- */
  /** the ball is dead: why ('tackle' | 'out' | 'incomplete' | 'td' | 'touchback' | 'safety' | 'kneel' | 'fg' | 'downed' | 'fairCatch') */
  dead(why, o = {}) {
    if (this.phase !== 'LIVE' && this.phase !== 'PILE') return;
    const b = this.ball, pl = this.play;
    pl.result = Object.assign({ why }, o); pl.endX = o.x !== undefined ? o.x : b.holder ? b.holder.x : b.x;
    b.state = 'dead'; b.vx = b.vy = b.vz = 0;
    this.stopClock = true; this.go('DEAD', why === 'td' ? 1.0 : 1.3); this.deadT = 0; this.lateHitT = T.lateHitWindow;
    bus.emit('whistle', { why, m: this });
    this.resolve(why, o);
  }
  resolve(why, o) {
    const pl = this.play, off = pl.offSide === undefined ? this.poss : pl.offSide, b = this.ball, holder = o.holder || b.holder;
    const posSide = holder ? holder.side : (o.side !== undefined ? o.side : this.poss);
    const spotX = E.clamp(o.x !== undefined ? o.x : holder ? holder.x : b.x, F.END_L, F.END_R);
    const spotY = E.clamp(o.y !== undefined ? o.y : holder ? holder.y : b.y, F.MID_Y - F.HASH, F.MID_Y + F.HASH);
    this.ballY = spotY; this.result = { why, side: posSide };
    const kickPlay = pl.off.type === 'kickoff' || pl.off.type === 'punt' || pl.kickoff;
    // a score
    if (why === 'td') return this.scoreTD(posSide, holder, o);
    if (why === 'safety') return this.scoreSafety(1 - posSide);
    if (why === 'fg') return o.good ? this.scoreFG(off, o) : this.missFG(off, o);
    if (why === 'patFail') { this.patPending = false; this.afterScoreKickoff(off); return; }
    // touchbacks
    if (why === 'touchback') { const recv = posSide; this.poss = recv; this.los = this.xAt(recv, o.at || 25); this.newDowns(); this.endPlay(); return; }
    // the play's yards and the spot
    let x = spotX;
    // inside its own end zone after a change of possession: a touchback
    const ownEZ = s => this.dir(s) > 0 ? x < F.GOAL_L : x > F.GOAL_R;
    if (posSide !== this.poss || kickPlay) {
      if (ownEZ(posSide)) { x = this.xAt(posSide, kickPlay ? 25 : 20); }
      const was = this.poss; this.poss = posSide; this.los = x;
      if (!kickPlay || posSide === was) { this.stats[1 - posSide].turnovers += was !== posSide ? 1 : 0; }
      if (was !== posSide && !kickPlay) bus.emit('turnover', { side: posSide, m: this });
      if (kickPlay && posSide === was && pl.off.type === 'kickoff') bus.emit('onsideRecovered', { side: posSide, m: this });
      this.newDowns(); this.endPlay(); return;
    }
    // the same side keeps it
    if (why === 'incomplete') { x = this.los; pl.incomplete = true; }
    const gain = (x - this.los) * this.dir(off) / YD;
    this.recordGain(off, gain, pl);
    this.los = x;
    if (pl.kind === 'two') { this.patPending = false; bus.emit('pat', { good: false, type: 2, m: this }); this.afterScoreKickoff(off); return; }
    if (pl.kind === 'pat') { this.patPending = false; this.afterScoreKickoff(off); return; }
    const lineX = this.lineToGain;
    const made = this.dir(off) > 0 ? x >= lineX - .5 : x <= lineX + .5;
    if (made) { this.newDowns(); this.stats[off].firstDowns++; bus.emit('firstDown', { side: off, team: this.teams[off], m: this }); }
    else if (this.down >= 4) { this.poss = 1 - off; this.newDowns(); bus.emit('turnoverOnDowns', { side: this.poss, m: this }); }
    else { this.down++; this.toGo = Math.round((lineX - x) * this.dir(off) / YD); if (this.down === 3 && this.toGo >= 10) bus.emit('thirdLong', { m: this }); if (this.down === 4) bus.emit('fourthDown', { m: this }); }
    // the clock runs on after an in-bounds play that wasn't an incompletion, a score or a turnover (not late in a half)
    this.runoff = (why === 'tackle' || why === 'downed' || why === 'kneel') && !(this.clock < 30 && (this.quarter === 2 || this.quarter >= 4)) ? T.runoff : 0;
    this.endPlay();
  }
  newDowns() { this.down = 1; this.toGo = T.yardsToGo; this.lineToGain = this.los + this.dir(this.poss) * this.toGo * YD; const g = this.goalX(this.poss); if ((this.lineToGain - g) * this.dir(this.poss) > 0) { this.lineToGain = g; this.toGo = Math.round(Math.abs(g - this.los) / YD); } }
  recordGain(s, gain, pl) {
    this.stats[s].yards += Math.round(gain); this.stats[s].plays++;
    const carrier = pl.carrier; if (carrier) { carrier.stats.yds += Math.round(gain); }
    if (pl.passer && pl.completed) { this.stats[s].passYds += Math.round(gain); pl.passer.stats.passYds += Math.round(gain); if (pl.catcher) pl.catcher.stats.recYds += Math.round(gain); }
    else if (carrier) { this.stats[s].rushYds += Math.round(gain); carrier.stats.rush += Math.round(gain); }
    if (gain > this.stats[s].longest) this.stats[s].longest = Math.round(gain);
    pl.gain = gain;
    if (gain >= 15 && !pl.passer) bus.emit('bigRun', { player: carrier, yards: Math.round(gain), m: this });
  }
  endPlay() { const pl = this.play; this.lineToGain = this.down === 1 ? this.lineToGain : this.lineToGain; bus.emit('playEnd', { m: this, play: pl }); bus.tickPlays(); }
  scoreTD(s, scorer, o) {
    this.score[s] += 6; const pl = this.play; this.stats[s].tds++;
    if (scorer) scorer.stats.tds++;
    if (pl.passer && pl.completed && pl.passer.side === s) pl.passer.stats.tds++;
    const yards = Math.round(Math.abs((scorer ? scorer.x : this.ball.x) - (pl.carrierStart !== null && pl.carrierStart !== undefined ? pl.carrierStart : this.los)) / YD);
    this.poss = s; this.patPending = true;
    bus.emit('td', { side: s, team: this.teams[s], player: scorer, how: o.how || (pl.completed ? 'pass' : 'run'), yards, m: this });
    if (this.ot) { this.patPending = false; this.final(); return; }
    if (pl.kind === 'two') { this.score[s] -= 4; this.patPending = false; bus.emit('pat', { good: true, type: 2, m: this }); this.go('CELEBRATE', 2.6); this.afterCeleb = () => this.afterScoreKickoff(s); return; }
    this.go('CELEBRATE', this.quickCelebrate ? 1.2 : 3.5); this.celebrateT = 0;
    this.afterCeleb = () => { this.los = this.xAt(s, 85); this.ballY = F.MID_Y; this.toPlaycall('pat'); };
  }
  scoreSafety(s) {
    this.score[s] += 2; bus.emit('safety', { side: s, m: this });
    if (this.ot) { this.final(); return; }
    this.kickoffSide = 1 - s; this.nextKickoffFrom = 20; this.poss = 1 - s;
    this.go('CELEBRATE', 2); this.afterCeleb = () => { this.toPlaycall('kickoff'); };
  }
  scoreFG(s, o) {
    const pat = this.play.off.pat; this.score[s] += pat ? 1 : 3;
    bus.emit(pat ? 'pat' : 'fg', { good: true, side: s, yards: o.yards, doink: o.doink, type: 1, m: this });
    if (pat) this.patPending = false;
    if (this.ot && !pat) { this.final(); return; }
    this.go('CELEBRATE', 1.8); this.afterCeleb = () => this.afterScoreKickoff(s);
  }
  missFG(s, o) {
    const pat = this.play.off.pat;
    bus.emit(pat ? 'pat' : 'fg', { good: false, side: s, yards: o.yards, doink: o.doink, m: this });
    if (pat) { this.patPending = false; this.go('CELEBRATE', 1.2); this.afterCeleb = () => this.afterScoreKickoff(s); return; }
    // a missed FG: the other side takes it at the spot of the kick (or its 20)
    const other = 1 - s, spot = this.play.losX - this.dir(s) * 7 * YD, own = this.ydOf(other, spot);
    this.poss = other; this.los = own < 20 ? this.xAt(other, 20) : spot; this.newDowns(); this.endPlay();
  }
  afterScoreKickoff(scoring) { this.kickoffSide = scoring; this.poss = scoring; this.nextKickoffFrom = null; this.checkClockThen(() => this.toPlaycall('kickoff')); }
  afterCelebrate() { const f = this.afterCeleb; this.afterCeleb = null; if (f) f(); }
  updateDead(dt) {
    this.deadT += dt; this.lateHitT -= dt;
    this.updateMovers(dt, true);
    if (this.phaseT > 0) return;
    if (this.phaseAfterDead) { const f = this.phaseAfterDead; this.phaseAfterDead = null; f(); return; }
    // the clock's runoff, then the quarter's end or the next call
    if (this.runoff) { this.clock = Math.max(0, this.clock - this.runoff); this.runoff = 0; }
    this.checkClockThen(() => this.toPlaycall());
  }
  /** the quarter ends when the ball is dead at 0:00 */
  checkClockThen(next) {
    if (this.patPending) { next(); return; }
    if (this.clock > 0 || this.mode === 'drill') { next(); return; }
    this.endQuarter(next);
  }
  endQuarter() {
    const q = this.quarter;
    bus.emit('quarterEnd', { quarter: q, m: this });
    if (this.ot) { this.final(); return; }
    if (q === 2 && this.mode === 'hub') { this.final(); return; }
    if (q === 2) { this.go('HALFTIME', this.halftimeLen || 3); bus.emit('halftime', { m: this }); return; }
    if (q >= 4) {
      if (this.score[0] === this.score[1] && this.spec.ot !== false && this.mode !== 'hub') { this.startOT(); return; }
      this.final(); return;
    }
    if (q === 1 && this.mode === 'hub' && this.hubHalf) { /* one half: Q1 then Q2 */ }
    this.quarter++; this.clock = this.qLen; this.qPlays = 0;
    this.go('QBREAK', 1.5); bus.emit('quarterStart', { quarter: this.quarter, m: this });
  }
  afterBreak() { this.toPlaycall(); }
  secondHalf() {
    if (this.mode === 'hub' && this.hubHalf) { this.final(); return; }
    this.quarter = 3; this.half = 2; this.clock = this.qLen; this.qPlays = 0;
    const recv = this.openingReceiver === null ? 1 : 1 - this.openingReceiver;
    this.kickoffSide = 1 - recv; this.poss = this.kickoffSide; this.nextKickoffFrom = null;
    bus.emit('quarterStart', { quarter: 3, m: this });
    this.toPlaycall('kickoff');
  }
  startOT() {
    this.ot = true; this.quarter = 5; this.clock = this.qLen; this.half = 1;
    bus.emit('overtime', { m: this });
    const w = FF.r() < .5 ? 0 : 1; this.kickoffSide = 1 - w; this.poss = this.kickoffSide;
    this.go('QBREAK', 2); this.afterBreak = () => { this.afterBreak = Match.prototype.afterBreak; this.toPlaycall('kickoff'); };
  }
  final() {
    if (this.over) return; this.over = true;
    this.winner = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
    this.go('FINAL', 0); this.stopClock = true;
    bus.emit('final', { winner: this.winner, score: this.score.slice(), team: this.winner >= 0 ? this.teams[this.winner] : null, m: this });
  }
  /** win now / lose now (Dev, tests) */
  finishNow(winner) { if (winner === 0 || winner === 1) { if (this.score[winner] <= this.score[1 - winner]) this.score[winner] = this.score[1 - winner] + 7; } this.final(); }
  /** the kickoff spot: the kicking team's 30 (or its 20 after a safety) */
  kickoffLos() { return this.xAt(this.kickoffSide, this.nextKickoffFrom || 30); }
  /** a hash of the sim's state (determinism and replay tests) */
  hash() {
    const parts = [this.phase, this.score.join(','), this.down, this.toGo, Math.round(this.los), this.poss, Math.round(this.clock * 10), this.quarter, this.ball.state, Math.round(this.ball.x), Math.round(this.ball.y)];
    for (const a of this.on) parts.push(a.id, Math.round(a.x), Math.round(a.y), a.pose);
    return u.hash(parts.join('|'));
  }
}
FF.Match = Match;
})();
