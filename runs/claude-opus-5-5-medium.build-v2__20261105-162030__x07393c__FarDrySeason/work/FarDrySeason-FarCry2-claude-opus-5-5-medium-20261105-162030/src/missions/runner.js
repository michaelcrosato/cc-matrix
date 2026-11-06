// The mission runner. Steps are data; the runner gives each type its meaning. Bots drive these same steps.
import { missionById, MISSIONS } from '../content/missions.js';
import { siteById } from '../content/sites.js';
import { TUNING } from '../core/tuning.js';
import { dist2 } from '../world/geom.js';
import { SCRIPTS } from './scripts.js';
import { mixin } from '../core/mixin.js';
import { StepsPart } from './steps.js';
export class Missions {
  active = null; stepI = 0; steps = []; st = {}; altPending = null; altT = 0; textT = 0; textStr = '';
  constructor(game) { this.game = game; }
  build(ctx) { this.ctx = ctx; this.rng = ctx.random.fork('missions'); const g = this.game; g.events.on('destroyed', (d) => this.onDestroyed(d)); g.events.on('actorDied', (a, o) => { if (a.tag) this.st.killed = (this.st.killed ?? 0) + 1; void o; }); }
  done(id) { return !!this.game.story.done[id]; }
  /** The next contract this giver has for you. */
  availableFor(giver) { if (this.active) return null; return MISSIONS.find((m) => m.giver === giver && !this.done(m.id) && !m.auto && m.requires.every((r) => this.done(r))) ?? null; }
  available() { if (this.active) return []; return MISSIONS.filter((m) => !this.done(m.id) && !m.auto && m.requires.every((r) => this.done(r))); }
  start(id) {
    const m = missionById[id], g = this.game;
    this.active = m; this.stepI = 0; this.st = {}; this.altTaken = false; this.altPending = null;
    this.steps = [...m.steps];
    g.story.current = id;
    if (m.act) g.story.act = m.act;
    if (m.hour !== undefined && (m.forceHour || m.auto)) g.world.setHour(m.hour, true);
    if (m.weather) g.world.setWeather(m.weather);
    g.world.pinWind(m.wind);
    g.story.pass = m.pass ?? null;
    if (m.give?.flare && !g.player.guns.sidearm?.id?.includes('flare')) { g.story.hasFlare = true; g.combat.give('flare', 100, false); g.player.flareAmmo = 8; }
    if (m.give?.tracker) { g.story.hasTracker = true; g.talk.say('you', 'THE TRACKER IS IN YOUR LEFT POCKET.', 3); }
    if (m.spawnAt) g.player.teleport(m.spawnAt[0], m.spawnAt[1]);
    if (id === 'm2') g.people.showInCage();
    if (m.alt && this.altEligible(m)) { this.altPending = m.alt; this.altT = 6; }
    g.events.emit('missionStart', m);
    this.beginStep();
  }
  altEligible(m) { const b = this.game.buddies, id = m.alt.buddy; if (id === 'any') return b.alive().length > 0; if (m.alt.always) return b.state[id].alive; return b.state[id].met && b.state[id].alive; }
  acceptAlt() {
    const a = this.altPending, m = this.active, g = this.game; if (!a) return;
    this.altPending = null; this.altTaken = true; g.prompt.setChoice(null);
    const steps = this.steps.slice(), at = this.stepI;
    steps.splice(at, 0, ...a.steps); this.steps = steps;
    let buddy = a.buddy === 'any' ? g.buddies.highestTrust() : a.buddy;
    g.story.altTaken = g.story.altTaken ?? {}; g.story.altTaken[m.id] = true;
    if (a.buddy === 'dov') g.buddies.state.dov.met = true;
    g.buddies.addTrust(buddy, 1);
    if (!g.buddies.followers.some((f) => f.buddy === buddy && f.alive)) g.buddies.spawnFollower(buddy, g.player.x + 3, g.player.z + 3);
    g.audio.play('radio');
    g.events.emit('altAccepted', m);
    if (a.steps.length) this.beginStep();
  }
  ignoreAlt() { this.altPending = null; this.game.prompt.setChoice(null); }
  get step() { return this.steps[this.stepI] ?? null; }
  beginStep() {
    const g = this.game, s = this.step; this.st = { t: 0, killed: 0, partner: this.st.partner };
    if (!s) return;
    this.textStr = s.text; this.textT = 5;
    g.hud.touch(); g.audio.play('map-paper', { volume: 0.2 });
    if (s.spawn) this.spawnFor(s.spawn);
    if (s.do === 'destroy') { this.st.destroyed = g.world.destructibles.filter((d) => d.tag === s.tag && d.destroyed && (!s.site || d.site === s.site)).length; if (s.givesCharges) { g.player.charges = Math.max(g.player.charges, s.givesCharges); g.talk.say('you', 'THE COLONEL SENT CHARGES. HOLD THROW TO PLANT.', 4); } }
    if (s.do === 'use') this.addUse(s);
    if (s.do === 'hold') { this.st.left = s.seconds; this.st.waveT = 2; }
    if (s.do === 'ride' || s.do === 'script' || s.do === 'choice') { const sc = SCRIPTS[s.script]; if (sc?.start) sc.start(g, s, this.st); }
    if (s.lines && !s.scene && s.do !== 'talk' && s.do !== 'report' && s.do !== 'use' && s.do !== 'deliver') g.talk.playLines(s.lines);
    g.autoWaypoint();
    g.events.emit('stepStart', s);
  }
  onDestroyed(d) { const s = this.step; if (s?.do === 'destroy' && d.tag === s.tag && (!s.site || d.site === s.site)) { this.st.destroyed = (this.st.destroyed ?? 0) + 1; } }
  next() {
    const s = this.step; this.stepI++;
    if (s?.script) SCRIPTS[s.script]?.end?.(this.game, s, this.st);
    if (this.stepI >= this.steps.length) this.complete(); else this.beginStep();
  }
  complete() {
    const m = this.active, g = this.game;
    this.active = null; g.story.done[m.id] = true; g.story.current = null; g.story.pass = null;
    g.world.pinWind(null); g.world.setWeather('clear');
    const alt = this.altTaken ? (m.alt?.bonus ?? 0) : 0;
    const pay = Math.round(Math.max(0, (m.pay ?? 0) + alt) * TUNING.stonesReward);
    if (pay) { g.player.stones += pay; g.story.ledger.stones += pay; g.notice(`+${pay} STONES`); }
    for (const a of m.onDone ?? []) {
      if (a.give?.tablets) { g.player.tablets += a.give.tablets; g.notice(`+${a.give.tablets} TABLETS`); g.story.feverOn = true; g.body.resetFever(); }
      if (a.flag) g.story.flags[a.flag] = true;
      if (a.burnStrip) g.world.burnStrip(a.burnStrip);
      if (a.script) SCRIPTS[a.script]?.run?.(g, m);
      if (a.smoke) g.story.smoke = { at: a.smoke, until: g.world.totalHours + 24 };
      if (a.line) g.talk.playLines(a.line);
      if (a.ledger?.paid) g.story.ledger.paidFor = (g.story.ledger.paidFor ?? 0) + 0;
    }
    if (m.id === 'm4') g.buddies.state.dov.met = true;
    g.buddies.clear();
    g.people.showFriends();
    g.events.emit('missionDone', m);
    g.prompt.missionUse.length = 0;
    g.save.write();
    const nx = (m.onDone ?? []).find((a) => a.start);
    if (nx) this.start(nx.start);
    else if (this.available().length === 1 && this.available()[0].id === 'm7') g.talk.say('you', 'THERE IS A NOTE AT YOUR SAFEHOUSE.', 4);
  }
  fixed(dt) {
    const g = this.game, p = g.player, s = this.step;
    if (this.textT > 0) this.textT -= dt;
    if (!this.active || !s || g.ui.top || g.talk.locksPlayer()) return;
    this.st.t += dt;
    // The buddy's call.
    if (this.altPending) {
      this.altT -= dt;
      if (this.altT <= 0 && !this.altCalled) { this.altCalled = true; g.audio.play('radio'); g.talk.playLines(this.altPending.call); this.st.altWindow = 16; }
      if (this.altCalled) { this.st.altWindow -= dt; g.prompt.setChoice({ use: 'TAKE THE PLAN', finish: 'NOT THIS TIME', radio: true }); }
      if (this.altCalled && (this.ctx.input.consumeAny(['PadSquare', 'KeyE']))) { this.altCalled = false; this.acceptAlt(); return; }
      if (this.altCalled && (this.ctx.input.consumeAny(['PadTriangle', 'KeyF']) || this.st.altWindow <= 0)) { this.altCalled = false; this.ignoreAlt(); }
    }
    const site = s.site ? siteById[s.site] : null;
    const dTo = (at) => dist2(at[0], at[1], p.x, p.z);
    let ok = false;
    switch (s.do) {
      case 'goto': ok = dTo(s.at ?? site.at) < (s.r ?? 20); break;
      case 'leave': ok = dTo(site.at) > s.r; break;
      case 'talk': case 'report': this.ensureTalk(s); ok = !!this.st.talked; break;
      case 'use': ok = !!this.st.used; if (ok && s.lines) { const l = s.lines; this.st.used = false; g.talk.startScene({ lines: [l], at: [p.x, p.y + 1.5, p.z + 2], onDone: () => this.next() }); return; } break;
      case 'deliver': ok = dTo(s.at) < s.r; if (ok && s.lines) g.talk.playLines(s.lines); break;
      case 'destroy': ok = (this.st.destroyed ?? 0) >= s.n; break;
      case 'kill': ok = (this.st.killed ?? 0) >= s.n; break;
      case 'collect': ok = !!g.story.collected?.[s.tag]; break;
      case 'steal': ok = p.vehicle?.tag === s.tag; break;
      case 'hold': ok = this.tickHold(s, dt); break;
      case 'ride': case 'script': case 'choice': { const sc = SCRIPTS[s.script]; ok = sc?.tick ? sc.tick(g, s, this.st, dt) : true; break; }
      case 'timer': ok = this.st.t >= s.seconds; break;
      case 'escort': { const a = this.st.escort; ok = a && dist2(a.x, a.z, s.to[0], s.to[1]) < 8; break; }
    }
    if (ok) this.next();
  }
}
const g2 = (id) => ({ odile: 'SISTER ODILE', tibor: 'TIBOR', vance: 'COL. VANCE', ansa: 'MOTHER ANSA', harrow: 'HARROW', bakr: 'OLD BAKR' })[id] ?? id.toUpperCase();
export const npcTitle = g2;
mixin(Missions, StepsPart);
