// Runs one contract at a time, offers others, pays, saves. Data in content/missions.js.
import { TUNING } from '../core/tuning.js';
import { MISSIONS, MISSION_ORDER } from '../content/missions.js';
import { SITES } from '../content/sites.js';
import { STRIPS } from '../content/roads.js';
import { LINES } from '../content/dialogue.js';
import { STEPS } from './steps.js';
import { makeScripts } from './scripts.js';
import { WEAPONS } from '../content/weapons.js';
export class MissionRunner {
  active = null; stepI = 0; done = new Set(); stepsNow = []; tags = {}; altTaken = false; timer = 0; pendingOffer = null; timerFailed = false;
  constructor(game) { this.game = game; this.scripts = makeScripts(); }
  reset() { this.abort(); this.done.clear(); this.tags = {}; this.altTaken = false; }
  isDone(id) { return this.done.has(id); }
  canStart(m) {
    if (this.done.has(m.id) && !m.side) return false;
    if (m.side && this.done.has(m.id)) return false;
    return m.requires.every((r) => this.done.has(r));
  }
  available(giver) { return Object.values(MISSIONS).filter((m) => !m.auto && this.canStart(m) && (giver == null || m.giver === giver)); }
  /** A short FP scene: the camera holds on the giver, subtitles, then Accept or Not Yet. */
  offer(m, npc) {
    const g = this.game;
    if (this.active) return;
    const after = () => {
      g.faceNpc(null);
      g.ui.choice(m.title, [{ label: 'ACCEPT', id: 'accept', onSelect: () => this.start(m.id) }, { label: 'NOT YET', id: 'notyet', onSelect: () => {} }]);
    };
    if (npc) g.faceNpc(npc);
    if (m.brief && LINES[m.brief]?.length) g.dialogue.play(m.brief, { onEnd: after });
    else after();
  }
  start(id) {
    const g = this.game, m = MISSIONS[id];
    this.active = m;
    this.stepI = 0;
    this.altTaken = false;
    this.altOffered = false;
    this.stepsNow = m.steps.map((s) => ({ ...s }));
    this.timer = m.timer ?? 0; this.timerFailed = false;
    if (m.pass) g.story.pass = m.pass;
    if (m.wind) g.wind.pin(m.wind.dir, m.wind.speed);
    if (m.hour != null) g.clock.set(m.hour);
    if (m.weather) g.sky.setWeather(m.weather);
    if (m.give?.guns) for (const w of m.give.guns) { if (!g.weapons.slots[WEAPONS[w].slot] || WEAPONS[w].slot !== 'sidearm') g.weapons.give(w, 100); else g.weapons.give(w, 100, false); g.story.unlocked.add(w); }
    if (m.give?.charges) g.weapons.charges = Math.max(g.weapons.charges, m.give.charges);
    if (m.carry) g.notice('A CRATE ON YOUR SHOULDER', 3);
    // Dov's perk: 2 free charges per mission.
    const dov = g.actors.buddy('dov');
    if (dov?.met && !dov.dead && !m.side) g.weapons.charges = Math.max(g.weapons.charges, 2);
    g.events.emit('mission-start', id);
    this.refreshJobs();
    this.enterStep();
    this.checkAlt();
  }
  checkAlt() {
    const g = this.game, m = this.active;
    if (!m?.alt || this.altOffered) return;
    if (this.stepI !== m.alt.at) return;
    const buddy = this.altBuddy(m);
    this.altOffered = true;
    this.altDecided = !buddy;
    if (!buddy) return; // Write their missions so the alternate plan just doesn't arrive.
    g.after(8, () => {
      if (this.active !== m) return;
      g.sfx.play('radio-squelch');
      const lines = m.id === 'm7' ? [['', 'THE RADIO GIVES A SHORT CRACK.'], [buddy.id, `${buddy.name}. WE WILL HOLD THE EAST ROAD. YOU GO IN BY THE PIT.`]] : m.alt.call;
      g.dialogue.play(lines, { onEnd: () => {
        if (this.active !== m) return;
        g.ui.choice('A BETTER PLAN', [
          { label: 'DO IT THEIR WAY', id: 'alt', onSelect: () => this.takeAlt(buddy) },
          { label: 'IGNORE IT', id: 'ignore', onSelect: () => { this.altDecided = true; } },
        ], { overlay: true });
      } });
    });
  }
  altBuddy(m) {
    const g = this.game, a = m.alt;
    if (a.buddy === 'any') return g.actors.buddies.find((b) => b.met && !b.dead && g.clock.abs >= b.woundedUntil) ?? null;
    const b = g.actors.buddy(a.buddy);
    return b && b.met && !b.dead && g.clock.abs >= b.woundedUntil ? b : null;
  }
  takeAlt(buddy) {
    const g = this.game, m = this.active;
    this.altTaken = true;
    this.altDecided = true;
    this.altBuddyNow = buddy;
    buddy.trust++;
    const at = Math.max(this.stepI, m.alt.at);
    const inserted = m.alt.steps.map((s) => ({ ...s }));
    if (this.stepI === at) { this.exitStep(); this.stepsNow.splice(at, 0, ...inserted); this.enterStep(); }
    else this.stepsNow.splice(at, 0, ...inserted);
    if (m.id !== 'm7') {
      const f = g.player.feet;
      buddy.spawn(g.ctx, f.x + 3, f.z + 3, { hp: 200 });
    }
    g.events.emit('alt-taken', m.id, buddy.id);
  }
  /** A chained mission has no giver to go back to, so a load starts it again. */
  resumeAuto() {
    if (this.active || this.game.story.flags.finished) return;
    const m = MISSION_ORDER.map((id) => MISSIONS[id]).find((x) => x.auto && x.id !== 'm0' && this.canStart(x));
    if (m) this.start(m.id);
  }
  /** Who has work: marked on the sheet, and said aloud once, so nobody wanders. */
  refreshJobs(say = false) {
    const g = this.game;
    g.map.markers = g.map.markers.filter((m) => !m.job);
    if (this.active) { g.map.dirty = true; return; }
    const main = Object.values(MISSIONS).filter((m) => !m.side && !m.auto && this.canStart(m));
    const names = [];
    for (const m of main) {
      const n = g.npcs.byWho[m.giver];
      if (n) { g.map.markers.push({ x: n.x, z: n.z, name: `${m.giver.toUpperCase()} HAS WORK`, job: true }); names.push(m.giver.toUpperCase()); g.map.see(n.siteKey); }
    }
    if (main.some((m) => m.giver === 'note')) names.push('A NOTE AT YOUR SAFEHOUSE');
    g.map.dirty = true;
    if (say && names.length) g.after(4, () => { if (!this.active) g.stepBanner(`WORK: ${names.join(', ')}`); });
  }
  currentStep() { return this.active ? this.stepsNow[this.stepI] : null; }
  enterStep() {
    const g = this.game, s = this.currentStep();
    if (!s) { this.complete(); return; }
    STEPS[s.do].enter(this, s, g);
    if (s.text) g.stepBanner(s.text);
    g.map.setMargin([this.active.title, '', s.text ?? '']);
    g.events.emit('step', this.active.id, this.stepI, s.do);
  }
  exitStep() { const s = this.currentStep(); if (s) STEPS[s.do].exit?.(this, s, this.game); }
  /** Dev mode's "complete current step". */
  forceStep() { if (this.active) { this.exitStep(); this.stepI++; this.afterAdvance(); } }
  afterAdvance() {
    if (!this.active) return;
    if (this.stepI >= this.stepsNow.length) this.complete();
    else { this.enterStep(); this.checkAlt(); }
  }
  fixedUpdate(ctx, dt) {
    const g = this.game, m = this.active;
    if (!m) return;
    if (m.timer) {
      this.timer -= dt;
      if (this.timer <= 0) { this.failSide(); return; }
    }
    const s = this.currentStep();
    if (!s) return;
    if (STEPS[s.do].tick(this, s, g, dt)) {
      STEPS[s.do].exit?.(this, s, g);
      this.stepI++;
      this.afterAdvance();
    }
  }
  failSide() {
    const g = this.game, m = this.active;
    this.exitStep();
    this.active = null;
    g.map.setWaypoint(null);
    g.map.setMargin([]);
    // Fail and she says nothing, which is worse.
    g.stepBanner('TOO LATE');
    g.story.flags.lateCount = (g.story.flags.lateCount ?? 0) + 1;
    g.events.emit('mission-failed', m.id);
    g.interact.clearTagged('mission');
  }
  applyOps(ops, quiet) {
    const g = this.game, st = g.story;
    for (const o of ops ?? []) {
      if (o.burnStrip) g.fire.burnStrip(STRIPS[o.burnStrip].pts, STRIPS[o.burnStrip].width);
      if (o.flag) st.flags[o.flag] = true;
      if (o.smoke) st.smokeUntil = g.clock.abs + 24, st.smokeAt = o.smoke;
      if (o.mapSee) g.map.see(o.mapSee);
      if (o.tablets != null) g.body.tablets += o.tablets;
      if (o.safehouse) st.safehouses.add(o.safehouse);
      if (o.meet) { const b = g.actors.buddy(o.meet); if (b) b.met = true; }
      if (o.act) { st.act = o.act; g.body.feverAct = o.act; }
      if (o.unlock) st.unlocked.add(o.unlock);
      if (o.truce === false) { st.truce = false; st.war = true; }
      if (o.stock) st.stockInLockers = true;
      if (o.moved) g.ledger.add('moved', o.moved);
      if (o.patrols && !g.vehicles.patrols.length) g.vehicles.startPatrols();
      if (o.safehouse) { const b = SITES[o.safehouse].safe.bed; g.lastSafe = g.lastSafe ?? [SITES[o.safehouse].at[0] + b[0] + 1.5, SITES[o.safehouse].at[1] + b[1] + 1.5]; }
      if (o.notice && !quiet) g.notice(o.notice, 5);
      if (o.script && this.scripts[o.script]) { const gen = this.scripts[o.script](g, this, null); let r = gen.next(); while (!r.done) r = gen.next(); }
      if (o.mercy) {
        st.runsDone++;
        if (st.odileRefuses) { st.odileRefuses = false; if (!quiet) g.notice('NOTHING. SHE LOOKS AT YOU. NOTHING.', 4); }
        else { g.body.tablets += 4; if (!quiet) { g.say('odile', 'FOUR. COUNT THEM. I DID.', 3); g.sfx.play('tablet-bottle'); } }
      }
    }
    g.npcs.sync();
  }
  pay(n) {
    const g = this.game;
    const a = Math.round(n * TUNING.stonesReward);
    if (a <= 0) return 0;
    g.story.stones += a;
    g.ledger.add('stones', a);
    return a;
  }
  complete() {
    const g = this.game, m = this.active;
    if (!m) return;
    this.exitStep();
    this.active = null;
    this.done.add(m.id);
    g.interact.clearTagged('mission');
    g.map.setWaypoint(null);
    g.map.setMargin([]);
    if (m.wind) g.wind.unpin();
    let pay = m.pay ?? 0;
    if (this.altTaken && m.alt?.payOverride != null) pay = m.alt.payOverride;
    if (this.altTaken && m.alt?.bonus) pay += m.alt.bonus;
    const paid = this.pay(pay);
    if (paid > 0) { g.stepBanner(`${m.title}: ${paid} STONES`); g.sfx.play('ui-stone'); }
    else if (!m.side) g.stepBanner(`${m.title}: DONE`);
    this.applyOps(m.ops);
    if (m.onDoneScript) { const gen = this.scripts[m.onDoneScript](g, this, null); let r = gen.next(); while (!r.done) r = gen.next(); }
    if (this.altBuddyNow && !this.altBuddyNow.dead) { this.altBuddyNow.despawn(); }
    this.altBuddyNow = null;
    if (g.story.pass) g.story.grace = { faction: g.story.pass, until: g.clock.abs + 1.5 };
    g.story.pass = null;
    g.events.emit('mission-done', m.id);
    g.save.write('mission');
    if (m.next) this.start(m.next);
    else this.refreshJobs(true);
  }
  abort() {
    if (this.active) this.exitStep();
    this.active = null;
    this.game.interact.clearTagged('mission');
  }
  /** Jump: every mission before this is applied quietly, so the world is in the right state. */
  prepareJump(id) {
    const g = this.game;
    const order = MISSION_ORDER;
    const i = order.indexOf(id);
    const m = MISSIONS[id];
    const before = new Set();
    const addReq = (mid) => { if (before.has(mid)) return; before.add(mid); for (const r of MISSIONS[mid].requires) addReq(r); };
    for (const r of m.requires) addReq(r);
    for (const mid of order) {
      if (!before.has(mid)) continue;
      this.done.add(mid);
      this.applyOps(MISSIONS[mid].ops, true);
      const mm = MISSIONS[mid];
      if (mm.give?.guns) for (const w of mm.give.guns) g.story.unlocked.add(w);
    }
    return m;
  }
}
