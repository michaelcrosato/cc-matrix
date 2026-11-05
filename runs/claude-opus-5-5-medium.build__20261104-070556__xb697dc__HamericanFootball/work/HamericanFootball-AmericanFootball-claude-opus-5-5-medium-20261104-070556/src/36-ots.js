/* THE OVER-THE-TOP SYSTEMS: Hot Streak (BLAZING), the Fiasco Meter and its cards, boss specials, late hits, Dinged,
 * flying helmets, celebrations and LIGHTS OUT. All of them listen to the sim's events and act through modifiers, so the
 * core rules never change for them. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, T = FF.T, S = FF.sim, Y = 16;
const hyp = Math.hypot, r = () => FF.r(), bus = FF.bus;
const A = id => S.athlete(id);
const FILL = { fumbleLost: 35, intThrown: 35, safety: 40, sacked: 20, downs: 25, oppTd: 20, drop: 10, bigHitTaken: 10, lateHitTaken: 5 };

const O = FF.ots = {
  setHot(a, plays) { if (!a) return; const team = S.onField(a.team).concat(S.rosters[a.team]); if (team.filter(x => x.hot > 0 && x !== a).length >= 2) return; const was = a.hot > 0; a.hot = Math.max(a.hot, plays || T.hotPlays); a.heat = 0; if (!was) bus.emit('hotOn', { a: a.id, player: a.name, team: a.team }); },
  coolOff(a) { if (a && a.hot > 0) { a.hot = 0; bus.emit('hotOff', { a: a.id, player: a.name, team: a.team }); } a && (a.heat = 0); },
  fill(t, n, why) {
    if (S.hub && false) return;
    S.meter[t] = Math.min(100, S.meter[t] + n * T.fiascoMeterMult);
    bus.emit('fiascoFill', { team: t, n, why, meter: S.meter[t] });
    if (S.meter[t] >= 100) {
      S.meter[t] = 0; S.stats.team[t].fills++;
      const pool = (S.spec && S.spec.cardPool && S.spec.cardPool[t]) || FF.data.cards.map(c => c.id);
      if (S.cards[t].length < 3) { const id = pool[Math.floor(r() * pool.length)]; S.cards[t].push(id); bus.emit('fiascoBreak', { team: t, card: id }); }
      else bus.emit('fiascoBreak', { team: t, card: null });
    }
  },
  /** a boss special, when its star's holder presses L1 + R1 (or the AI decides) and its conditions hold */
  trySpecial(a) {
    const sp = a.p.special; if (!sp || S.phase !== 'LIVE') return false;
    const drive = S.stats.drives, used = a.specialUsed, c = S.carrier();
    const once = (key, scope) => { const k = key + ':' + scope; if (used[k]) return false; used[k] = true; return true; };
    if (sp === 'mudslide' && c === a && once('m', drive)) { a.mudslideT = 1.2; a.act = { id: 'mudslide', t: 0, dur: 1.2, slow: 1.05 }; fire(a, sp); return true; }
    if (sp === 'afterburner' && once('a', S.playNo)) { a.afterburn = 1.0; fire(a, sp); return true; }
    if (sp === 'snowplow' && a.eng && once('s', drive)) { a.snowplow = 1.5; fire(a, sp); return true; }
    if (sp === 'goldenspiral' && c === a && !S.play.passThrown && once('g', drive)) { a.goldenNext = true; fire(a, sp); return true; }
    if (sp === 'seismic' && c && c.team !== a.team && hyp(c.b.x - a.b.x, c.b.y - a.b.y) < 3 * Y && once('q', S.quarter <= 2 ? 1 : 2)) {
      a.act = { id: 'seismic', t: 0, dur: .8, lunge: true }; a.tryT = .9; a.b.vz = 240; a.b.z = 1; a.b.vx = (c.b.x - a.b.x) * 1.4; a.b.vy = (c.b.y - a.b.y) * 1.4; a.seismicT = .6; fire(a, sp); return true;
    }
    return false;
  },
  special: {
    evade(d, c, big) {
      if (c.mudslideT > 0) { const front = Math.abs(E.angDiff(Math.atan2(d.b.y - c.b.y, d.b.x - c.b.x), c.facing)) < 1; if (front && !big) { d.down = 1.2; d.b.vx = Math.cos(c.facing) * 120; d.b.vy = Math.sin(c.facing) * 120; c.mudslideT = 0; bus.emit('mudslideHit', { a: c.id, d: d.id }); return true; } }
      return false;
    }
  },
  /** each step: special timers, the AI's own special use */
  update(dt) {
    for (const a of S.athletes) {
      if (a.mudslideT > 0) a.mudslideT -= dt;
      if (a.snowplow > 0) a.snowplow -= dt;
      if (a.seismicT > 0) { a.seismicT -= dt; if (a.seismicT <= 0) seismicSlam(a); }
      if (S.phase === 'LIVE' && a.ctl < 0 && a.p.special && (S.step + a.id) % 30 === 0) aiSpecial(a);
    }
  },
  /** after the whistle: late hits by humans (b1 near an opponent) and by AI personalities */
  lateHits() {
    if (!FF.game.settings.lateHits && !S.hub) return;
    for (const a of S.athletes) {
      if (a.down > 0 || (a.act && a.act.id === 'lateHit') || a.lateDone) continue;
      const press = a.ctl >= 0 && (a.intent.press & FF.BIT.b1);
      const ai = a.ctl < 0 && S.phaseTime > .25 && !a.lateRolled && (a.lateRolled = true) && r() < S.teams[a.team].ai.lateHit * .1;
      if (!press && !ai) continue;
      const v = S.athletes.filter(o => o.team !== a.team && o.down <= 0 && hyp(o.b.x - a.b.x, o.b.y - a.b.y) < 2 * Y).sort((p, q) => hyp(p.b.x - a.b.x, p.b.y - a.b.y) - hyp(q.b.x - a.b.x, q.b.y - a.b.y))[0];
      if (!v) continue;
      a.lateDone = true; a.act = { id: 'lateHit', t: 0, dur: .5 }; a.facing = Math.atan2(v.b.y - a.b.y, v.b.x - a.b.x);
      a.b.vx = Math.cos(a.facing) * 120; a.b.vy = Math.sin(a.facing) * 120;
      v.down = .9; v.b.vx = Math.cos(a.facing) * 90; v.b.vy = Math.sin(a.facing) * 90; v.b.vz = 80; v.b.z = 1; v.tackledFrom = 'front';
      a.stats.lateHits++; S.stats.team[a.team].lateHits++;
      bus.emit('lateHit', { a: a.id, v: v.id, player: a.name, team: a.team, x: v.b.x, y: v.b.y });
      O.fill(v.team, FILL.lateHitTaken, 'lateHit');
    }
  },
  /** the end of a play: hot streaks count down, dinged players recover, lights out counts, cards expire */
  afterPlay(P, res) {
    for (const a of S.all) {
      a.lateDone = false; a.lateRolled = false;
      if (a.hot > 0 && a.on) { a.hot--; if (a.hot <= 0) bus.emit('hotOff', { a: a.id, player: a.name, team: a.team }); }
      if (a.dinged > 0 && a.on) a.dinged--;
      a.goldenNext = a.goldenNext && !P.passThrown;
    }
    if (S.lightsPlays > 0) { S.lightsPlays--; if (S.lightsPlays <= 0) O.lightsOut(false); }
    void res;
  },
  lightsOut(on, plays = 3) {
    if (on) { S.lights = true; S.lightsPlays = plays; bus.emit('lightsOut', {}); }
    else if (S.lights) { S.lights = false; S.lightsPlays = 0; bus.emit('lightsOn', {}); }
  },
  /** the TD dance: a human picks (b2 Charleston, b3 Body Roll, b4 Helicopter); otherwise random by personality */
  dance(a, k) { const D = ['spike', 'charleston', 'bodyroll', 'helicopter', 'backflip', 'fistpump', 'huddle']; a.dance = k || D[Math.floor(FF.rf() * D.length)]; a.act = { id: 'celebrate', t: 0, dur: 3.5 }; bus.emit('dance', { a: a.id, dance: a.dance }); }
};
function fire(a, sp) { bus.emit('special', { a: a.id, who: a.name, kind: sp, team: a.team }); }
function seismicSlam(a) {
  let tackled = false;
  for (const o of S.athletes) {
    if (o === a || hyp(o.b.x - a.b.x, o.b.y - a.b.y) > 2.5 * Y) continue;
    o.down = 1.1; o.b.vz = 140; o.b.z = 1; o.tackledFrom = 'front';
    if (S.carrier() === o) tackled = true;
  }
  a.down = .6;
  bus.emit('seismic', { a: a.id, x: a.b.x, y: a.b.y });
  if (tackled && S.phase === 'LIVE') { const c = S.carrier(); if (c && c.slot === 'QB' && !S.play.passThrown) { a.stats.sack++; S.stats.team[a.team].sacks++; bus.emit('sack', { defender: a.id, a: a.id, qb: c.id, player: a.name, team: a.team }); } S.deadBall('tackle', { x: c ? c.b.x : a.b.x }); }
}
function aiSpecial(a) {
  const sp = a.p.special, c = S.carrier(), B = S.ball;
  if (sp === 'afterburner' && ((c === a) || (B.state === 'pass' && B.target === a)) && r() < .5) O.trySpecial(a);
  if (sp === 'mudslide' && c === a && S.athletes.some(o => o.team !== a.team && hyp(o.b.x - a.b.x, o.b.y - a.b.y) < 3 * Y)) O.trySpecial(a);
  if (sp === 'snowplow' && a.eng && r() < .4) O.trySpecial(a);
  if (sp === 'goldenspiral' && c === a && S.play.kind === 'pass' && S.play.t > .5 && r() < .3) O.trySpecial(a);
  if (sp === 'seismic' && c && c.team !== a.team && r() < .5) O.trySpecial(a);
}
// the golden spiral rides on the throw
const startThrow = S.startThrow;
S.startThrow = (qb, recv, bullet) => { startThrow(qb, recv, bullet); if (qb.goldenNext) { qb.act.golden = true; qb.goldenNext = false; } };

/* ---------------- LISTENERS: heat, the meter, dinged, helmets ---------------- */
const heat = (a, n = 1) => { if (!a || a.hot > 0) return; a.heat += n; if (a.heat >= 3) O.setHot(a); };
bus.on('td', e => { const a = A(e.scorer); heat(a); for (const d of S.athletes) if (d.team !== e.team) d.heat = 0; O.fill(1 - e.team, FILL.oppTd, 'oppTd'); if (a) a.dance = null; });
bus.on('catch', e => { if (e.yards >= 20) heat(A(e.a)); });
bus.on('tackle', e => {
  const c = A(e.carrier), d = A(e.tackler);
  if (e.yards >= 15 && c) heat(c);
  if (e.bigHit && d) heat(d);
  if (e.yards < 0 && c && c.team === S.play.startPoss) c.heat = 0;
});
bus.on('sack', e => { heat(A(e.defender)); const q = A(e.qb); if (q) { q.heat = 0; if (q.hot > 0) O.coolOff(q); } O.fill(1 - e.team, FILL.sacked, 'sacked'); });
bus.on('int', e => { heat(A(e.defender)); const q = A(e.qb); if (q) { q.heat = 0; if (q.hot > 0) O.coolOff(q); } O.fill(1 - e.team, FILL.intThrown, 'int'); });
bus.on('fumble', e => { heat(A(e.forcer)); });
bus.on('recover', e => { if (e.lost) O.fill(1 - e.team, FILL.fumbleLost, 'fumbleLost'); });
bus.on('safety', e => O.fill(1 - e.team, FILL.safety, 'safety'));
bus.on('turnoverOnDowns', e => O.fill(e.team, FILL.downs, 'downs'));
bus.on('drop', e => O.fill(e.team, FILL.drop, 'drop'));
bus.on('bigHit', e => { const v = A(e.carrier); if (v) { O.fill(v.team, FILL.bigHitTaken, 'bigHit'); v.bigHitsDrive = (v.bigHitsDrive || 0) + 1; if (v.bigHitsDrive >= 2) { v.dinged = 2; bus.emit('dinged', { a: v.id }); } if (FF.rf() < .25) popHelmet(v); } });
bus.on('megaHit', e => { const v = A(e.carrier); if (v) { O.fill(v.team, FILL.bigHitTaken, 'megaHit'); v.dinged = 2; bus.emit('dinged', { a: v.id }); popHelmet(v); } });
bus.on('possession', () => { for (const a of S.all) a.bigHitsDrive = 0; });
bus.on('presnap', () => { for (const a of S.all) a.helmetOff = false; });
function popHelmet(v) { v.helmetOff = true; bus.emit('helmetPop', { a: v.id, x: v.b.x, y: v.b.y, z: v.b.z + 26, team: v.team }); }
// halftime adjustments (story mode): modifiers that last the rest of the game
O.adjust = (team, kind) => {
  const add = (n, fn) => bus.addMod(n, fn, { tag: 'half' });
  if (kind === 'ground') { add('tackle.p', x => x.c && x.c.team === team ? -.05 : 0); add('shed.t', x => x.blockerTeam === team ? .3 : 0); }
  if (kind === 'air') { add('catch.p', x => x.team === team ? .06 : 0); FF.bus.addMod('aim.err', x => x.team === team ? .9 : 1, { tag: 'half', kind: 'mul' }); }
  if (kind === 'hit') { add('tackle.p', x => x.d && x.d.team === team ? .05 : 0); add('fumble.p', x => x.d && x.d.team === team && x.big ? .05 : 0); }
  if (kind === 'trick') { const pool = FF.data.cards.map(c => c.id); if (S.cards[team].length < 3) S.cards[team].push(pool[Math.floor(r() * pool.length)]); }
  bus.emit('adjust', { team, kind });
};
// Night Vision: the Owls' QB sees an extra yard and throws truer
bus.addMod('aim.err', x => x.a && x.a.p && x.a.p.special === 'nightvision' ? .8 : 1, { kind: 'mul', tag: 'perm' });
const clear = bus.clearMods;
bus.clearMods = tag => { clear(tag); if (!tag) bus.addMod('aim.err', x => x.a && x.a.p && x.a.p.special === 'nightvision' ? .8 : 1, { kind: 'mul', tag: 'perm' }); };
})();
