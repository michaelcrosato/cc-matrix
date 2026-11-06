import { createTuning, resolveDifficulty } from '../config/tuning.js';
import { clampTip, DT, inDrape } from './field.js';
import { FieldPhysics } from './physics.js';
import { makeRng, hashString } from './rng.js';
import { rankFor } from './scoring.js';
import { stepStrains } from './strains.js';
import { moveSeat, stepTools } from './tools.js';
import { getOp } from '../data/ops/index.js';

const COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const WHEEL = ['scalpel', 'forceps', 'suction', 'gel', 'suture', 'laser', 'scanner', 'clamp'];

function playersOf(p) {
  if (typeof p === 'number') {
    return Array.from({ length: Math.max(1, p) }, (_, i) => ({ id: i, name: `Seat ${i + 1}`, color: COLORS[i % 4] }));
  }
  if (!p?.length) return [{ id: 0, name: 'You', color: COLORS[0] }];
  return p.map((pl, i) => ({ id: pl.id ?? i, name: pl.name || `Seat ${i + 1}`, color: pl.color || COLORS[i % 4] }));
}

export class Sim {
  constructor(opts = {}) {
    const op = typeof opts.op === 'string' ? getOp(opts.op) : opts.op;
    if (!op) throw new Error('operation required');
    this.op = structuredClone(op);
    this.tuning = opts.tuning ?? createTuning();
    this.diff = resolveDifficulty(opts.difficulty || 'resident');
    this.rng = opts.rng || makeRng(opts.seed ?? 1);
    this.cheats = { lockVitals: false, freezeTimer: false, infiniteComposure: false, infiniteClamps: false, timeScale: 1, ...(opts.cheats || {}) };
    this.couch = !!opts.couch;
    this.network = !!opts.network;
    this.consult = opts.consult || null;
    this.doctor = op.doctor === 'both' || op.doctor === 'ines' ? (op.doctor === 'ines' ? 'ines' : 'ren') : (op.doctor || 'ren');
    if (op.doctor === 'both') this.doctor = 'ren';
    const players = playersOf(opts.players);
    this.countScale = op.id === 'grand-rounds' ? 1 + 0.5 * (players.length - 1) : 1;
    this.grHp = op.id === 'grand-rounds' ? 1 + 0.25 * (players.length - 1) : 1;
    this.hpScale = this.grHp * this.diff.hp;
    this.mods = {
      drain: this.diff.drains * (this.consult === 'careful' ? 0.8 : 1),
      tool: this.consult === 'aggressive' ? 1.25 : 1,
      score: (this.consult === 'careful' ? 0.9 : 1) * (this.consult === 'aggressive' ? 1.15 : 1),
      hp: this.diff.hp,
      tol: this.diff.tol * (op.brain ? 0.75 : 1),
    };
    this.noFail = !!op.noFail;
    this.noTimer = !!op.noTimer;
    this.noRank = !!op.noRank;
    this.notes = !!opts.notes;
    this.rankCap = this.notes ? 'B' : null;
    this.vitals = 100;
    this.vitalsMin = 100;
    this.timer = (op.timer || 0) * this.diff.timers;
    if (this.consult === 'careful') this.timer += 60;
    if (this.consult === 'aggressive') this.timer = Math.max(45, this.timer - 40);
    this.timerMax = this.timer;
    this.score = 0;
    this.misses = 0;
    this.bestCombo = 0;
    this.tick = 0;
    this.time = 0;
    this.phaseIndex = 0;
    this.phaseTime = 0;
    this.entities = [];
    this.nextId = 1;
    this.events = [];
    this.flags = {};
    this.failCount = {};
    this.clampsUsed = 0;
    this.arrest = null;
    this.arrestsSurvived = 0;
    this.hushPhase = null;
    this.hushT = 0;
    this.sforzandoT = 0;
    this.over = false;
    this.failed = null;
    this.complete = false;
    this.rank = null;
    this.sinceProgress = 0;
    this.barkCd = 0;
    this.lastBark = '';
    this.beat = { bpm: op.bpm || 72, phase: 0, count: 0, bar: 0 };
    this.beatEvents = [];
    this.shockers = [];
    this.injected = 0;
    this.sharedSiteCd = 0;
    this.physics = opts.physics === false ? null : new FieldPhysics();
    this.seats = players.map((pl, i) => this.makeSeat(pl, i));
    this.activeSite = op.sites[0].id;
    for (const s of this.seats) s.site = this.activeSite;
    this.checkpoint = null;
    this.report = null;
    this.enterPhase();
  }

  makeSeat(pl, index) {
    return {
      id: pl.id, index, name: pl.name, color: pl.color, out: false,
      x: -1.05, y: 0.62 - index * 0.12, prevX: -1.05, prevY: 0.62,
      vx: 0, vy: 0, speed: 0,
      tool: 'gel', use: 0, steady: false,
      composure: 0, combo: 0, bestCombo: 0, score: 0,
      syringeCd: 0, syringeHold: 0, charge: 0, charging: false,
      laserTime: 0, laserVent: 0, site: this.op.sites[0].id,
      stats: { Cuts: 0, Stitches: 0, Burns: 0, Saves: 0, Accuracy: 100 },
      graded: 0, clean: 0, misses: 0,
      cmd: {}, prev: {},
    };
  }

  get scalpelTol() { return this.tuning.scalpelTol * this.mods.tol; }
  get stitchGateR() { return this.tuning.stitchGateR * this.mods.tol; }
  get missLimit() { return Math.max(1, Math.round(this.tuning.missLimit * (this.diff.miss / 8))); }

  beatScale() {
    const cheat = this.cheats.timeScale ?? 1;
    if (this.hushPhase === 'inhale') return 0;
    if (this.arrest?.stopsBeat) return 0;
    if (this.hushPhase === 'wash') return this.tuning.hushTimeScale * cheat;
    return cheat;
  }

  drainScale() {
    if (this.hushPhase === 'inhale' || this.arrest?.holdVitals) return 0;
    if (this.hushPhase === 'wash') return this.tuning.hushTimeScale;
    return 1;
  }

  timerScale() {
    const cheat = this.cheats.timeScale ?? 1;
    if (this.hushPhase === 'inhale') return 0;
    if (this.hushPhase === 'wash') return this.tuning.hushTimeScale * cheat;
    return cheat;
  }

  giftFor(seat) {
    if (this.forceGift) return this.forceGift;
    if (this.couch || this.network) return seat.index % 2 === 0 ? 'hush' : 'sforzando';
    return this.doctor === 'ines' ? 'sforzando' : 'hush';
  }

  clampTip(x, y) { return clampTip(x, y); }

  input(id, frame) {
    const seat = this.seats.find((s) => s.id === id);
    if (!seat || seat.out || this.over) return;
    seat.cmd = { source: 'stick', x: 0, y: 0, use: 0, ...frame };
  }

  leave(id) {
    const seat = this.seats.find((s) => s.id === id);
    if (!seat) return;
    seat.out = true;
    for (const e of this.entities) if (e.holder === id) e.holder = null;
  }

  step() {
    if (this.over) return;
    this.events = [];
    this.shockers = [];
    const dt = DT;
    const inhale = this.hushPhase === 'inhale';
    for (const seat of this.seats) {
      if (seat.out) continue;
      if (this.cheats.infiniteComposure) seat.composure = 100;
      if (!inhale) moveSeat(this, seat, dt);
    }
    if (!inhale) stepTools(this, dt);
    this.advanceBeat(dt);
    this.advanceGifts(dt);
    stepStrains(this, dt);
    this.advancePhase(dt);
    this.applyVitalsBounds();
    if (this.physics) {
      for (const seat of this.seats) this.physics.tip(seat.id, seat.x, seat.y);
      this.physics.entityById = (id) => this.entities.find((e) => e.id === id);
      this.physics.step();
    }
    this.tick += 1;
    this.time += dt;
    if (this.barkCd > 0) this.barkCd -= dt;
    if (this.sharedSiteCd > 0) this.sharedSiteCd -= dt;
  }

  advanceBeat(dt) {
    const target = (this.op.bpm || 72) + this.tuning.tempoPressure * (1 - this.clamp01(this.vitals) / 100);
    const gap = target - this.beat.bpm;
    this.beat.bpm += gap * Math.min(1, dt / 1);
    this.beatEvents = [];
    const scale = this.beatScale();
    this.beat.phase += dt * scale * this.beat.bpm / 60;
    while (this.beat.phase >= 1) {
      this.beat.phase -= 1;
      this.beat.count += 1;
      const beatInBar = ((this.beat.count - 1) % 4) + 1;
      if (beatInBar === 1) this.beat.bar += 1;
      this.beatEvents.push({ beat: this.beat.count, beatInBar, bar: this.beat.bar });
    }
  }

  advanceGifts(dt) {
    if (this.hushPhase === 'inhale') {
      this.hushT -= dt;
      if (this.hushT <= 0) {
        this.hushPhase = 'wash';
        this.hushT = this.tuning.hushDuration;
        this.events.push({ type: 'hush', phase: 'wash' });
      }
    } else if (this.hushPhase === 'wash') {
      this.hushT -= dt;
      if (this.hushT <= 0) {
        this.hushPhase = null;
        this.events.push({ type: 'hush', phase: 'end' });
      }
    }
    if (this.sforzandoT > 0) this.sforzandoT -= dt;
  }

  advancePhase(dt) {
    const phase = this.phase;
    if (!phase || this.over) return;
    const ts = this.timerScale();
    this.phaseTime += dt * (this.hushPhase === 'inhale' ? 0 : 1);
    if (!this.noTimer && !this.cheats.freezeTimer) {
      this.timer -= dt * ts / Math.max(0.05, this.tuning.timerMult);
    }
    this.sinceProgress += dt;
    if (this.scriptDrain) this.hurt(this.scriptDrain * dt, 'bleed');
    for (const line of phase.say || []) {
      if (!line.fired && this.phaseTime >= (line.at || 0)) {
        line.fired = true;
        this.events.push({ type: 'say', who: line.who, text: line.text, mood: line.mood || 'neutral' });
      }
    }
    for (const trig of phase.on || []) {
      if (trig.fired && trig.once !== false) continue;
      if (!this.triggerMet(trig.when)) continue;
      trig.fired = true;
      for (const act of trig.do || []) this.act(act);
    }
    if (this.sinceProgress >= 12) {
      this.sinceProgress = 0;
      this.bark('idle');
      this.events.push({ type: 'hint', tools: phase.tools || [] });
    }
    if (this.timer < 30 && !this.noTimer) this.bark('timerLow');
    if (!this.over && this.phaseCleared(phase)) this.completePhase();
  }

  triggerMet(when) {
    if (!when) return false;
    if (when.all) return when.all.every((w) => this.triggerMet(w));
    if (when.at != null && this.phaseTime >= when.at) return true;
    if (when.phaseTime != null && this.phaseTime >= when.phaseTime) return true;
    if (when.vitalsBelow != null && this.vitals < when.vitalsBelow) return true;
    if (when.beat != null && this.beat.count >= when.beat) return true;
    if (when.bar != null && this.beat.bar >= when.bar) return true;
    if (when.removed) {
      const kind = when.removed;
      const any = this.entities.some((e) => e.kind === kind);
      const left = this.entities.some((e) => e.alive && e.kind === kind && !e.tray);
      if (any && !left) return true;
    }
    if (when.flag && this.flags[when.flag]) return true;
    return false;
  }

  phaseCleared(phase) {
    const d = phase.done || {};
    if (d.cleared) {
      for (const kind of d.cleared) {
        if (this.entities.some((e) => e.alive && e.kind === kind && !e.tray)) return false;
      }
    }
    if (d.vitalsAbove != null && !(this.vitals > d.vitalsAbove)) return false;
    if (d.allClampsOff && this.entities.some((e) => e.alive && e.kind === 'bleeder' && e.clamped)) return false;
    if (d.strainDead && this.entities.some((e) => e.alive && e.strain === d.strainDead && !e.tray)) return false;
    if (d.arrests != null && this.arrestsSurvived < d.arrests) return false;
    if (d.flag && !this.flags[d.flag]) return false;
    if (d.clamped && this.entities.some((e) => e.alive && e.kind === 'bleeder' && !e.clamped)) return false;
    if (d.poolsClear && this.entities.some((e) => e.alive && e.kind === 'pool')) return false;
    if (d.minTime != null && this.phaseTime < d.minTime) return false;
    const keys = Object.keys(d);
    if (!keys.length) return false;
    return true;
  }

  completePhase() {
    const phases = this.op.phases;
    if (this.phaseIndex >= phases.length - 1) {
      if (this.entities.some((e) => e.alive && e.kind === 'bleeder' && e.clamped)) {
        this.bark('clampReminder');
        this.flags.needUnclamp = true;
        this.phase.done = { ...(this.phase.done || {}), allClampsOff: true };
        return;
      }
      this.succeed();
      return;
    }
    this.scriptDrain = 0;
    this.phaseIndex += 1;
    this.enterPhase();
  }

  enterPhase() {
    const phase = this.phase;
    if (!phase) return;
    this.phaseTime = 0;
    this.flags.stabilized = false;
    for (const line of phase.say || []) line.fired = false;
    for (const trig of phase.on || []) trig.fired = false;
    this.checkpoint = { score: this.score, vitals: this.vitals, timer: this.timer, index: this.phaseIndex };
    this.lockFail = false;
    this.objective = phase.objective || '';
    for (const act of phase.begin || []) if (act.wipe) this.act(act);
    for (const spec of phase.spawn || []) this.spawnList(spec);
    for (const act of phase.begin || []) if (!act.wipe) this.act(act);
    this.events.push({ type: 'phase', id: phase.id, objective: this.objective });
    this.bark(this.phaseIndex === 0 ? 'start' : 'nextPhase');
  }

  get phase() { return this.op.phases[this.phaseIndex] || null; }

  act(a) {
    if (!a) return;
    if (a.spawn) this.spawnList(a.spawn);
    if (a.vitals != null) this.vitals = Math.max(0, Math.min(100, this.vitals + a.vitals));
    if (a.vitalsSet != null) this.vitals = a.vitalsSet;
    if (a.lockFail) this.lockFail = true;
    if (a.drain) this.hurt(a.drain, 'script');
    if (a.composure != null) for (const s of this.seats) s.composure = a.composure;
    if (a.event === 'arrest') this.beginArrest(a);
    if (a.event === 'fortissimo') this.events.push({ type: 'fortissimo' });
    if (a.flag) this.flags[a.flag] = true;
    if (a.forceGift) this.forceGift = a.forceGift;
    if (a.scriptDrain != null) this.scriptDrain = a.scriptDrain;
    if (a.say) this.events.push({ type: 'say', who: a.who || a.say.who, text: a.text || a.say.text, mood: a.mood || 'neutral' });
    if (a.wipeToSite) {
      this.activeSite = a.wipeToSite;
      for (const s of this.seats) s.site = a.wipeToSite;
    }
    if (typeof a.doctor === 'string') this.doctor = a.doctor;
    if (a.wipe) {
      for (const e of this.entities) if (e.alive && e.kind === a.wipe) e.alive = false;
    }
  }

  beginArrest(a) {
    const savedVitals = this.vitals;
    this.arrest = { clock: a.clock || 8, tutorial: !!a.tutorial, stopsBeat: true, holdVitals: true, source: 0, savedVitals };
    this.vitals = Math.min(this.vitals, 15);
    this.events.push({ type: 'arrest', tutorial: !!a.tutorial });
  }

  spawnList(spec) {
    if (!spec) return;
    if (spec.count) {
      const n = Math.max(1, Math.round(spec.count * (spec.scale === false ? 1 : this.countScale)));
      const ats = spec.ats || (spec.at ? [spec.at] : [[0, 0]]);
      for (let i = 0; i < n; i++) {
        const at = this.placeAt(ats[i % ats.length], i);
        this.spawn({ ...spec, at, count: undefined, ats: undefined });
      }
      return;
    }
    this.spawn(spec);
  }

  placeAt(at, i) {
    if (!i) return at;
    const ang = (i * 2.399) % (Math.PI * 2);
    const rad = 0.12 + (i % 3) * 0.06;
    let x = at[0] + Math.cos(ang) * rad;
    let y = at[1] + Math.sin(ang) * rad * 0.8;
    if (!inDrape(x, y)) { x = at[0]; y = at[1]; }
    return [x, y];
  }

  spawn(spec) {
    if (spec.ifMissing) {
      const have = this.entities.some((e) => e.alive && e.kind === spec.kind && e.site === (spec.site || this.activeSite));
      if (have) return null;
    }
    const site = spec.site || this.activeSite;
    const at = spec.at || [0, 0];
    const e = {
      id: this.nextId++,
      kind: spec.kind,
      site,
      x: at[0], y: at[1],
      alive: true,
      hidden: !!spec.hidden,
      marked: !spec.hidden,
      strain: spec.strain || null,
    };
    if (spec.hp) e.hp = spec.hp * this.tuning.strainHpMult * this.mods.hp * (spec.strain ? this.grHp : 1);
    Object.assign(e, this.decorate(spec, e));
    this.entities.push(e);
    return e;
  }

  decorate(spec, e) {
    const extra = {};
    switch (spec.kind) {
      case 'gelZone':
        extra.rect = spec.rect;
        extra.parTime = spec.parTime || 8;
        break;
      case 'shard':
      case 'tumor':
      case 'ring':
        Object.assign(extra, {
          grabbable: true, embedded: true, embed: spec.embed ?? 0.25, axis: spec.axis ?? 90, pull: 0,
          homeX: e.x, homeY: e.y, homeSite: e.site,
        });
        break;
      case 'pool':
        extra.vol = spec.vol ?? 0.4;
        extra.cap = spec.cap ?? spec.vol ?? 0.4;
        break;
      case 'incision':
      case 'circleCut':
        extra.points = spec.points;
        extra.along = 0;
        extra.started = false;
        break;
      case 'wound':
        extra.gates = (spec.gates || []).map(([x, y]) => ({ x, y, hit: false }));
        extra.gate = 0;
        break;
      case 'bleeder':
        extra.clamped = false;
        break;
      case 'injection':
        extra.done = false;
        break;
      case 'nodule':
      case 'egg':
        extra.hp = (spec.hp ?? 30) * this.tuning.strainHpMult * this.mods.hp * this.grHp;
        extra.maxHp = extra.hp;
        break;
      case 'tether':
        extra.x1 = spec.x1 ?? e.x - 0.15;
        extra.y1 = spec.y1 ?? e.y;
        extra.x2 = spec.x2 ?? e.x + 0.15;
        extra.y2 = spec.y2 ?? e.y;
        break;
      case 'adagio':
        extra.strain = 'adagio';
        extra.path = spec.path || [spec.at, [spec.at[0] + 0.6, spec.at[1]]];
        extra.hp = (spec.hp ?? 100) * this.hpMult();
        extra.maxHp = extra.hp;
        extra.grande = !!spec.grande;
        extra.along = 0;
        extra.core = false;
        break;
      case 'hole':
      case 'nest':
        extra.hidden = spec.hidden !== false && spec.kind === 'hole' ? !!spec.hidden : !!spec.hidden;
        extra.marked = !extra.hidden;
        extra.sealed = false;
        extra.quota = spec.quota || 0;
        if (spec.kind === 'nest') extra.strain = 'staccato';
        break;
      case 'note':
        extra.born = spec.born ?? this.beat.count;
        extra.life = spec.life;
        extra.grabbable = true;
        extra.hp = 1;
        break;
      case 'spore':
      case 'scratch':
        extra.rate = spec.rate || (spec.kind === 'scratch' ? 0.5 : 0.3);
        break;
      case 'tremolo':
        extra.strain = 'tremolo';
        extra.hp = (spec.hp ?? 40) * this.hpMult();
        extra.maxHp = extra.hp;
        extra.pinned = 0;
        break;
      case 'legato': {
        extra.strain = 'legato';
        const n = spec.links || 8;
        const links = [];
        for (let i = 0; i < n; i++) {
          const x = e.x - 0.45 + i * (0.9 / Math.max(1, n - 1));
          const y = e.y + Math.sin(i * 0.7) * 0.12;
          links.push({ index: i, x, y, cut: false, tray: false });
        }
        extra.links = links;
        extra.active = n - 1;
        break;
      }
      case 'crescendo':
        extra.strain = 'crescendo';
        extra.size = spec.size ?? 0.2;
        extra.exposed = false;
        extra.armed = false;
        break;
      case 'feeder':
        extra.parent = spec.parent;
        extra.hp = (spec.hp ?? 40) * this.hpMult();
        extra.maxHp = extra.hp;
        break;
      case 'fermata':
        extra.strain = 'fermata';
        extra.eye = true;
        extra.hp = (spec.hp ?? 60) * this.hpMult();
        extra.maxHp = extra.hp;
        extra.stage = spec.stage || 'attack';
        extra.tutorial = !!spec.tutorial;
        extra.needed = spec.needed || 1;
        if (spec.tutorial) extra.hp = 0;
        break;
      case 'coda':
        extra.strain = 'coda';
        extra.hp = (spec.hp ?? 300) * this.hpMult();
        extra.maxHp = extra.hp;
        extra.coreOpen = false;
        break;
      case 'baton':
        extra.parent = spec.parent;
        extra.hp = spec.hp ?? 15;
        extra.maxHp = extra.hp;
        break;
      case 'link':
        extra.chain = spec.chain;
        extra.index = spec.index;
        extra.chainActive = spec.chainActive;
        extra.x1 = spec.x1;
        extra.y1 = spec.y1;
        extra.x2 = spec.x2;
        extra.y2 = spec.y2;
        break;
      default:
        break;
    }
    return extra;
  }

  hpMult() {
    return this.tuning.strainHpMult * this.mods.hp * this.grHp;
  }

  /** Called after an entity is pushed when it needs children. */
  afterSpawn(e) {
    if (e.kind === 'legato') {
      e.links.forEach((l, i) => {
        const prev = i === 0 ? { x: l.x, y: l.y + 0.14 } : e.links[i - 1];
        this.entities.push({
          id: this.nextId++, kind: 'link', site: e.site, alive: true,
          x: l.x, y: l.y, x1: prev.x, y1: prev.y, x2: l.x, y2: l.y,
          index: i, chain: e.id, chainActive: e.active, cut: false, strain: 'legato',
        });
      });
    }
    if (e.kind === 'crescendo') {
      for (let i = 0; i < 4; i++) {
        const child = this.spawn({
          kind: 'feeder', site: e.site, parent: e.id,
          at: [e.x + Math.cos((i / 4) * Math.PI * 2) * 0.28, e.y + Math.sin((i / 4) * Math.PI * 2) * 0.16],
          hp: 40,
        });
        child.parent = e.id;
      }
      e.armed = true;
    }
    if (e.kind === 'coda') {
      this.spawn({ kind: 'baton', site: e.site, parent: e.id, at: [e.x - 0.28, e.y + 0.05], hp: 9 });
      this.spawn({ kind: 'baton', site: e.site, parent: e.id, at: [e.x + 0.28, e.y + 0.05], hp: 9 });
    }
  }

  hurt(amount, why) {
    if (this.cheats.lockVitals || this.noFail || this.lockFail) return;
    if (this.arrest?.holdVitals) {
      this.vitals = 15;
      return;
    }
    let d = amount * this.tuning.drainMult * this.mods.drain * (this.notes ? 0.7 : 1);
    const timed = why === 'bleed' || why === 'scratch' || why === 'spore' || why === 'tremolo' || why === 'crescendo' || why === 'overflow';
    if (timed) d *= this.drainScale();
    if (!d) return;
    this.vitals -= d;
    if (this.vitals < this.vitalsMin) this.vitalsMin = this.vitals;
    if (this.vitals <= 30 && this.vitals > 0) this.bark(this.vitals <= 15 ? 'vitalsCritical' : 'vitalsLow');
    if (why === 'bleed' || why === 'overflow') this.bark('bleeding');
  }

  applyVitalsBounds() {
    if (!this.arrest?.holdVitals && this.vitals < this.vitalsMin) this.vitalsMin = this.vitals;
    if (this.over) return;
    if (!this.noFail && !this.lockFail && !this.cheats.lockVitals && this.vitals <= 0) {
      this.vitals = 0;
      this.fail('vitals');
      return;
    }
    if (!this.noFail && !this.lockFail && !this.noTimer && this.timer <= 0) {
      this.timer = 0;
      this.fail('time');
      return;
    }
    if (!this.noFail && !this.lockFail && this.misses >= this.missLimit) {
      this.fail('miss');
      return;
    }
    if (this.vitals > 100) this.vitals = 100;
    if (this.vitals < 0) this.vitals = 0;
  }

  fail(reason) {
    if (this.over || this.noFail || this.lockFail) return;
    this.over = true;
    this.failed = reason;
    this.complete = false;
    const id = this.phase?.id || '';
    this.failCount[id] = (this.failCount[id] || 0) + 1;
    this.notesOffer = this.failCount[id] >= 2;
    this.bark('fail');
    this.events.push({ type: 'fail', reason, notes: this.notesOffer });
  }

  succeed() {
    if (this.over) return;
    const left = Math.max(0, this.timer);
    const bonus = (this.vitals * 20 + left * 5 + (this.misses === 0 ? 1500 : 0)) * this.mods.score;
    this.score += Math.round(bonus);
    this.over = true;
    this.complete = true;
    this.failed = null;
    if (!this.noRank) this.rank = rankFor(this.score, this.op.parScore || 1, this.rankCap);
    this.report = this.noRank ? { text: "Tonight's patient survived." } : { rank: this.rank, followUp: this.op.patient?.followUp || '' };
    this.bark('success');
    this.events.push({ type: 'success', rank: this.rank, score: this.score });
    for (const s of this.seats) {
      s.stats.Accuracy = s.graded ? Math.round((100 * s.clean) / s.graded) : 100;
    }
  }

  retryPhase() {
    if (!this.checkpoint) return;
    const c = this.checkpoint;
    this.over = false;
    this.failed = null;
    this.complete = false;
    this.vitals = Math.max(c.vitals, 60);
    this.timer = Math.max(c.timer, 90);
    this.score = c.score;
    this.phaseIndex = c.index;
    this.entities = this.entities.filter(() => false);
    this.arrest = null;
    this.lockFail = false;
    for (const s of this.seats) s.combo = 0;
    this.enterPhase();
    if (this.notes) this.timer *= 1.3;
  }

  acceptNotes() {
    this.notes = true;
    this.rankCap = 'B';
    this.mods.drain *= 0.7;
    this.notesOffer = false;
    this.retryPhase();
  }

  restart() {
    const tuning = this.tuning;
    const fresh = new Sim({
      op: this.op, tuning, difficulty: this.diff.id, rng: makeRng(this.rng.seed || 1),
      players: this.seats.map((s) => ({ id: s.id, name: s.name, color: s.color })),
      consult: this.consult, couch: this.couch, network: this.network, cheats: this.cheats, physics: !!this.physics,
    });
    Object.assign(this, fresh);
  }

  skipTo(phaseId) {
    const idx = this.op.phases.findIndex((p) => p.id === phaseId);
    if (idx < 0) return false;
    this.over = false;
    this.failed = null;
    this.complete = false;
    this.phaseIndex = idx;
    this.entities = [];
    this.arrest = null;
    this.enterPhase();
    return true;
  }

  swapLead(seat) {
    if (this.op.doctor !== 'both' && !this.op.swap) return;
    this.doctor = this.doctor === 'ren' ? 'ines' : 'ren';
    this.events.push({ type: 'swap', doctor: this.doctor, seat: seat.id });
  }

  setSite(seat, index) {
    const sites = this.op.sites;
    if (!sites[index]) return;
    this.assignSite(seat, sites[index].id);
  }

  nudgeSite(seat, delta) {
    const sites = this.op.sites;
    const cur = sites.findIndex((s) => s.id === (this.couch ? this.activeSite : seat.site));
    const next = (cur + delta + sites.length) % sites.length;
    this.assignSite(seat, sites[next].id);
  }

  assignSite(seat, id) {
    if (this.couch) {
      if (this.sharedSiteCd > 0 || id === this.activeSite) return;
      this.sharedSiteCd = 0.8;
      this.activeSite = id;
      for (const s of this.seats) s.site = id;
    } else {
      seat.site = id;
      this.activeSite = id;
    }
    this.events.push({ type: 'site', id, seat: seat.id });
  }

  bark(key) {
    if (this.barkCd > 0 && this.lastBark === key) return;
    this.lastBark = key;
    this.barkCd = 1.5;
    this.events.push({ type: 'bark', key, who: this.voice() });
  }

  voice() {
    if (this.op.voice === 'pip') return 'pip';
    if (this.op.doctor === 'ines' && this.op.id === 'legato') return 'bea';
    return 'bea';
  }

  onRemoved(e) {
    if (e.kind === 'coda') {
      for (const a of this.entities) if (a.alive && a.kind === 'baton' && a.parent === e.id) a.alive = false;
    }
    if (e.kind === 'link') {
      const chain = this.entities.find((c) => c.id === e.chain);
      const link = chain?.links?.[e.index];
      if (link) link.tray = true;
    }
    if ((e.kind === 'shard' || e.kind === 'tumor') && !e.pooled) {
      e.pooled = true;
      this.spawn({ kind: 'pool', site: e.homeSite || e.site, at: [e.homeX ?? e.x, e.homeY ?? e.y], vol: e.kind === 'tumor' ? 0.3 : 0.4, cap: 0.5 });
    }
  }

  onFeederDead() {}

  clamp01(v) { return Math.max(0, Math.min(100, v)); }

  /** Hook spawn so children are created. */
  spawn(spec) {
    const e = Sim.prototype.spawnRaw ? null : null;
    return this._spawn(spec);
  }
}

// The class method spawn above is replaced by the implementation that also builds children.
Sim.prototype._spawn = Sim.prototype.spawn;

const rawSpawn = function spawn(spec) {
  if (spec.ifMissing) {
    const site = spec.site || this.activeSite;
    if (this.entities.some((e) => e.alive && e.kind === spec.kind && e.site === site)) return null;
  }
  const site = spec.site || this.activeSite;
  const at = spec.at || [0, 0];
  const e = {
    id: this.nextId++, kind: spec.kind, site, x: at[0], y: at[1],
    alive: true, hidden: !!spec.hidden, marked: !spec.hidden, strain: spec.strain || null,
  };
  Object.assign(e, this.decorate(spec, e));
  if (spec.strain) e.strain = spec.strain;
  this.entities.push(e);
  this.afterSpawn(e);
  return e;
};
Sim.prototype.spawn = rawSpawn;

Sim.prototype.exportState = function exportState() {
  const num = (n) => (typeof n === 'number' ? Math.round(n * 1000) / 1000 : n);
  return {
    tick: this.tick,
    op: this.op.id,
    phase: this.phase?.id || null,
    phaseIndex: this.phaseIndex,
    objective: this.objective,
    vitals: num(this.vitals),
    vitalsMin: num(this.vitalsMin),
    timer: num(this.timer),
    score: this.score,
    misses: this.misses,
    combo: this.bestCombo,
    bpm: num(this.beat.bpm),
    beat: this.beat.count,
    beatInBar: this.beat.count > 0 ? ((this.beat.count - 1) % 4) + 1 : 0,
    beatPhase: num(this.beat.phase),
    bar: this.beat.bar,
    site: this.activeSite,
    doctor: this.doctor,
    hush: this.hushPhase,
    arrest: this.arrest ? { clock: num(this.arrest.clock), tutorial: !!this.arrest.tutorial } : null,
    complete: this.complete,
    failed: this.failed,
    over: this.over,
    rank: this.rank,
    report: this.report,
    notesOffer: !!this.notesOffer,
    notes: !!this.notes,
    clampsUsed: this.clampsUsed,
    tools: WHEEL,
    seats: this.seats.map((s) => ({
      id: s.id, name: s.name, color: s.color, x: num(s.x), y: num(s.y),
      tool: s.tool, use: num(s.use), site: s.site, score: s.score, combo: s.combo,
      composure: num(s.composure), gift: this.giftFor(s), stats: { ...s.stats }, out: s.out,
      syringeCd: num(s.syringeCd), charge: num(s.charge || 0),
    })),
    tuning: {
      tipSpeed: this.tuning.tipSpeed, stickCurve: this.tuning.stickCurve, steadyFactor: this.tuning.steadyFactor,
      pullTol: this.tuning.pullTol, clampWindow: this.tuning.clampWindow, scannerRadius: this.tuning.scannerRadius,
      gelRadius: this.tuning.gelRadius,
    },
    phaseTools: this.phase?.tools || [],
    sites: this.op.sites.map((s) => s.id),
    flags: { ...this.flags },
    windups: this.entities.filter((e) => e.alive && e.windup).map((e) => e.id),
    entities: this.entities.filter((e) => e.alive && !(e.hidden && !e.marked)).map((e) => ({
      id: e.id, kind: e.kind, site: e.site, x: num(e.x), y: num(e.y),
      hp: e.hp != null ? num(e.hp) : undefined,
      hidden: e.hidden || undefined, marked: e.marked || undefined,
      tray: e.tray || undefined, clamped: e.clamped || undefined,
      need: e.need, strain: e.strain || undefined,
      coverage: e.coverage != null ? num(e.coverage) : undefined,
      vol: e.vol != null ? num(e.vol) : undefined,
      size: e.size != null ? num(e.size) : undefined,
      pinned: e.pinned || undefined, core: e.core || undefined,
      holder: e.holder, embedded: e.embedded || undefined,
      axis: e.axis, embed: e.embed, pull: e.pull != null ? num(e.pull) : undefined,
      rect: e.rect, points: e.points, along: e.along != null ? num(e.along) : undefined,
      gates: e.gates, gate: e.gate, readyTie: e.readyTie || undefined,
      parent: e.parent, tutorial: e.tutorial || undefined,
      chain: e.chain, index: e.index, chainActive: e.chainActive,
      cut: e.cut || undefined, x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2,
      grabbable: e.grabbable || undefined, exposed: e.exposed || undefined, fleeing: e.fleeing || undefined,
      stunned: e.stunned > 0 ? num(e.stunned) : undefined,
      core: e.core || undefined, coreOpen: e.coreOpen || undefined, windup: e.windup || undefined,
      pinned: e.pinned > 0 ? num(e.pinned) : undefined,
      started: e.started || undefined,
    })),
  };
};

Sim.prototype.hash = function hash() {
  const s = this.exportState();
  delete s.objective;
  return hashString(JSON.stringify(s)).toString(16);
};

Object.defineProperty(Sim.prototype, 'state', { get() { return this.exportState(); } });

export { WHEEL, inDrape };
