import { DAYS, MAINTENANCE, HANDICAP, wobbleAge, restTilt, marblesFor, CHECKIN_MARBLES } from '../data/programme.js';
import { hasEvent } from '../events/index.js';
import { EVENTS, TIER_NAMES } from '../data/events.js';
import { medalFor } from '../data/config.js';
import { UNLOCKS, HATS, STARTER_PAINTS, LATE_PAINTS } from '../data/unlocks.js';
import { rng } from '../core/rng.js';
import { tun } from '../core/tuning.js';
import { newProfile } from '../core/save.js';

/** Days, classes, medals, marbles and how crooked the island is. Plain rules, no scenes. */
export class Programme {
  constructor(game) { this.game = game; }
  get profile() { return this.game.save.profile; }
  dayDef(day) {
    if (day <= DAYS.length) {
      const d = DAYS[day - 1];
      return { ...d, classes: d.classes.filter(hasEvent) };
    }
    return { day, name: MAINTENANCE.name, tests: 'random', classes: null, maintenance: true };
  }
  get totalSteps() {
    let n = 0;
    for (const d of DAYS) n += d.classes.filter(hasEvent).length;
    return Math.max(1, n);
  }
  /** Today's classes. Maintenance days get three random ones from Trudy, fixed once dealt. */
  classesToday() {
    const p = this.profile;
    if (!p) return [];
    const def = this.dayDef(p.today.day);
    if (def.classes) return def.classes;
    if (!p.today.plan) {
      const r = rng(`maintenance-${p.today.day}`);
      const pool = Object.keys(EVENTS).filter((id) => hasEvent(id) && id !== 'grandHold');
      const out = [];
      while (out.length < MAINTENANCE.classes && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      p.today.plan = out;
    }
    return p.today.plan;
  }
  /** Tests today: fixed list, your three best, or a random three. */
  testsToday() {
    const p = this.profile;
    const def = this.dayDef(p.today.day);
    if (Array.isArray(def.tests)) return def.tests;
    const all = ['standStill', 'leanMatch', 'stepTime', 'quickLean', 'oneFoot'];
    if (def.tests === 'best') {
      const best = p.testBest || {};
      return all.slice().sort((a, b) => (best[b] ?? 0) - (best[a] ?? 0)).slice(0, 3);
    }
    const r = rng(`tests-${p.today.day}`);
    const pool = all.slice(), out = [];
    while (out.length < 3) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    return out;
  }
  handicap(day) { return day <= HANDICAP.length ? HANDICAP[day - 1] : 0; }
  ageFor(mean, day) { return wobbleAge(mean, this.handicap(day)); }
  stepsDone() { const p = this.profile; return p ? Math.min(p.stepsDone, this.totalSteps) : 0; }
  restDeg() {
    const p = this.profile;
    if (!p) return tun.islandRest;
    return p.levelled ? 0 : restTilt(p.stepsDone, this.totalSteps, tun.islandRest);
  }
  syncIsland() { if (this.game.phys) this.game.phys.setRest(this.restDeg()); }
  /** Tier used in the programme: Tier 1 for Days 1-5, the highest open on Maintenance days. */
  programmeTier(id) {
    const p = this.profile;
    if (p.today.day <= DAYS.length) return 0;
    return this.highestTier(id);
  }
  highestTier(id) { const p = this.profile; return p ? Math.max(0, Math.min(EVENTS[id].tiers.length - 1, p.tiers[id] ?? 0)) : 0; }
  tierOpen(id, t) { return t <= this.highestTier(id); }
  seen(id) { const p = this.profile; return !!(p && (p.seen[id] || p.levelled)); }
  freePlayList() { return Object.keys(EVENTS).filter((id) => hasEvent(id) && this.seen(id)); }
  medalOf(id, tier) { const p = this.profile; return p && p.medals[`${id}:${tier}`]; }
  planLeft() {
    const p = this.profile;
    return this.classesToday().filter((id) => !p.today.done.includes(id));
  }
  nextClass() { return this.planLeft()[0] || null; }
  /**
   * Record a finished class. Returns what changed: marbles, medal, first clear, unlocks, notch.
   * programme: this class counted toward today's plan.
   */
  record(id, tier, form, activeSec, programme) {
    const p = this.profile;
    const scaled = form / tun.medalScale;
    const m = medalFor(scaled);
    const key = `${id}:${tier}`;
    const prev = p.medals[key];
    const firstClear = !prev;
    if (!prev || prev.form < scaled) p.medals[key] = { form: Math.round(scaled), medal: m.id };
    const out = { medal: m, firstClear, marbles: 0, notch: false, tierOpened: null, unlocks: [] };
    p.seen[id] = true;
    p.classes++;
    p.minutes += activeSec / 60;
    if (tier === 0 && scaled >= 65 && (p.tiers[id] ?? 0) < 1 && EVENTS[id].tiers.length > 1) { p.tiers[id] = 1; out.tierOpened = 1; }
    if (tier === 1 && scaled >= 85 && (p.tiers[id] ?? 0) < 2 && EVENTS[id].tiers.length > 2) { p.tiers[id] = 2; out.tierOpened = 2; }
    if (programme && !p.today.done.includes(id) && this.classesToday().includes(id)) {
      p.today.done.push(id);
      if (p.today.day <= DAYS.length) { p.stepsDone++; out.notch = true; }
    }
    out.marbles = marblesFor(activeSec / 60, m.bonus, firstClear, tun.marblesPerMinute);
    this.addMarbles(out.marbles, m.id, out);
    this.syncIsland();
    this.game.save.write();
    return out;
  }
  addMarbles(n, medalId, out = {}) {
    const p = this.profile;
    const before = p.marbles;
    p.marbles += n;
    p.marbleLog = p.marbleLog || [];
    for (let i = 0; i < n; i++) p.marbleLog.push(medalId);
    if (p.marbleLog.length > 320) p.marbleLog.splice(0, p.marbleLog.length - 320);
    out.unlocks = out.unlocks || [];
    for (const u of UNLOCKS) if (before < u.at && p.marbles >= u.at) out.unlocks.push(u);
    return out;
  }
  hatsOpen() { const p = this.profile; return HATS.filter((x) => (p ? p.marbles >= x.at : x.at === 0) || (p && p.allUnlocked)); }
  paintsOpen() {
    const p = this.profile;
    const open = STARTER_PAINTS.slice();
    for (const l of LATE_PAINTS) if (p && (p.marbles >= l.at || p.allUnlocked)) open.push(l.id);
    return open;
  }
  checkinDone(age, scores) {
    const p = this.profile;
    p.today.checkin = true; p.today.age = age;
    p.ages.push({ day: p.today.day, age });
    p.testBest = p.testBest || {};
    for (const k of Object.keys(scores)) p.testBest[k] = Math.max(p.testBest[k] ?? 0, scores[k]);
    const out = this.addMarbles(CHECKIN_MARBLES, 'attended');
    this.game.save.write();
    return out;
  }
  /** Bed: stamp the day and turn to the next. */
  nextDay() {
    const p = this.profile;
    p.stamps.push({ day: p.today.day, at: Date.now() });
    p.day = p.today.day + 1;
    p.today = { day: p.day, checkin: false, age: null, done: [], question: false };
    p.lastSeen = Date.now();
    this.game.save.write();
  }
  createProfile(slot, name, paint) {
    const d = this.game.save.data;
    d.profiles[slot] = newProfile(name, paint);
    d.activeProfile = slot;
    this.game.save.write();
    this.syncIsland();
  }
  selectProfile(slot) { this.game.save.data.activeProfile = slot; this.game.save.write(); this.syncIsland(); }
  tierName(t) { return TIER_NAMES[t] || ''; }
}
