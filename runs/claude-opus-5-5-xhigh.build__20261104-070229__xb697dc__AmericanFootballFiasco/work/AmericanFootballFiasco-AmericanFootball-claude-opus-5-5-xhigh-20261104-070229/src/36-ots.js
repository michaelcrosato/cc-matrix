// The over-the-top systems, all as bus listeners and modifiers: Hot Streak (BLAZING), the Fiasco Meter and its card draws,
// Dinged, drives (for once-a-drive specials), LIGHTS OUT and scripted match events.
(() => {
'use strict';
const FF = window.FF, T = FF.T, bus = FF.bus;
const FILL = { fumbleLost: 35, intThrown: 35, safety: 40, sacked: 20, downs: 25, oppTD: 20, drop: 10, bigHitTaken: 10, lateHitTaken: 5 };
FF.FIASCO_FILL = FILL;
class OTS {
  constructor(m) {
    this.m = m; this.off = []; this.lightsOut = 0; this.lastPoss = m.poss; m.driveId = 1;
    const on = (ev, fn) => this.off.push(bus.on(ev, d => { if (d.m === m) fn(d); }));
    const big = a => { if (!a) return; a.heat++; a.heatAge = 0; if (a.heat >= 3 && !(a.hot > 0)) this.setHot(a, T.hotPlays, 'streak'); };
    const reset = a => { if (!a) return; a.heat = 0; if (a.hot > 0 && a.hotWhy === 'streak') this.coolOff(a); };
    on('td', d => { big(d.player); for (const a of m.roster[1 - d.side]) { a.heat = 0; if (a.hot > 0 && a.hotWhy === 'streak') this.coolOff(a); } this.fill(1 - d.side, FILL.oppTD); m.lastScoreSide = d.side; });
    on('catch', d => { if (d.yards >= 20) { big(d.receiver); bus.emit('bigCatch', { player: d.receiver, yards: d.yards, m }); } });
    on('bigRun', d => big(d.player));
    on('sack', d => { big(d.defender); reset(d.qb); this.fill(d.qb.side, FILL.sacked); });
    on('int', d => { big(d.defender); reset(d.thrower); if (d.thrower) this.fill(d.thrower.side, FILL.intThrown); });
    on('fumble', d => { big(d.forcer); });
    on('recover', d => { if (d.lost) this.fill(1 - d.side, FILL.fumbleLost); });
    on('bigHit', d => { big(d.tackler); this.fill(d.carrier.side, FILL.bigHitTaken); });
    on('megaHit', d => { big(d.tackler); big(d.tackler); this.fill(d.carrier.side, FILL.bigHitTaken); });
    on('safety', d => this.fill(1 - d.side, FILL.safety));
    on('turnoverOnDowns', d => this.fill(1 - d.side, FILL.downs));
    on('drop', d => this.fill(d.receiver.side, FILL.drop));
    on('lateHit', d => this.fill(d.victim.side, FILL.lateHitTaken));
    on('tackle', d => { const pl = m.play; if (pl && (d.carrier.x - pl.losX) * m.dir(d.carrier.side) < -YD) reset(d.carrier); });
    on('playEnd', () => this.afterPlay());
    on('presnap', () => this.beforePlay());
  }
  dispose() { for (const f of this.off) f(); this.off = []; }
  setHot(a, plays, why) {
    a.hot = plays; a.hotWhy = why; a.heat = Math.max(a.heat, 3);
    bus.emit('hotOn', { player: a, side: a.side, m: this.m });
  }
  coolOff(a) { a.hot = 0; a.heat = 0; bus.emit('hotOff', { player: a, m: this.m }); }
  /** fill side s's Fiasco Meter; full: a card (up to 3 held), then it empties */
  fill(s, n) {
    const m = this.m; if (m.mode === 'drill') return;
    m.meter[s] = Math.min(100, m.meter[s] + n * T.fiascoMeterMult);
    bus.emit('fiascoFill', { side: s, value: m.meter[s], m });
    if (m.meter[s] >= 100) {
      m.meter[s] = 0; m.fiascoFills[s]++;
      const pool = (m.cardPool && m.cardPool[s]) || FF.data.cardList, held = m.cards[s];
      if (held.length < 3) { const id = FF.u.pick(pool); held.push(id); bus.emit('fiascoBreak', { side: s, card: id, team: m.teams[s], m }); }
      else bus.emit('fiascoBreak', { side: s, card: null, team: m.teams[s], m });
    }
  }
  beforePlay() {
    const m = this.m;
    if (m.poss !== this.lastPoss) { this.lastPoss = m.poss; m.driveId++; for (const a of m.all) a.bigHitsDrive = 0; }
    for (const a of m.all) { a.helmetOff = false; a.fairCatch = false; a.danced = false; a.dance = undefined; a.celebrating = false; a.seismicAt = 0; }
    // scripted match events: { when: { quarter, play }, do: 'lightsOut', plays }
    for (const e of m.events) if (!e.fired && e.when && (e.when.quarter === undefined || e.when.quarter === m.quarter) && (e.when.play === undefined || m.qPlays >= e.when.play)) { e.fired = true; this.trigger(e.do, e); }
    if (m.cheats.alwaysBlazing) for (const a of m.on) if (m.isHuman(a.side) && !(a.hot > 0)) { a.hot = 99; a.hotWhy = 'cheat'; }
  }
  trigger(what, e = {}) {
    const m = this.m;
    if (what === 'lightsOut') { this.lightsOut = e.plays || 3; FF.lightsOut = true; bus.emit('lightsOut', { m }); }
    if (what === 'mascot') m.mascotPlay = e.side !== undefined ? e.side : m.poss;
  }
  afterPlay() {
    const m = this.m;
    for (const a of m.all) {
      if (a.hot > 0 && a.hotWhy !== 'cheat') { a.hot--; if (a.hot <= 0) this.coolOff(a); }
      if (a.dinged > 0) a.dinged--;
      if (a.heat > 0 && !(a.hot > 0) && ++a.heatAge >= 5) { a.heat--; a.heatAge = 0; }   // (heat cools off after five quiet plays)
      a.turbo = Math.min(1, a.turbo + T.turboDeadRefill);
    }
    if (this.lightsOut > 0) { this.lightsOut--; if (this.lightsOut <= 0) { FF.lightsOut = false; bus.emit('lightsOn', { m }); } }
    // recent play types (the Fiasco difficulty's coach reads them)
    const pl = m.play; if (pl && pl.off) { m.recentTypes = m.recentTypes || [[], []]; const s = pl.offSide === undefined ? m.poss : pl.offSide; const L = m.recentTypes[s] || (m.recentTypes[s] = []); L.push(pl.off.type); if (L.length > 5) L.shift(); }
  }
  update(dt) { void dt; }
}
const YD = 16;
FF.OTS = OTS;
})();
