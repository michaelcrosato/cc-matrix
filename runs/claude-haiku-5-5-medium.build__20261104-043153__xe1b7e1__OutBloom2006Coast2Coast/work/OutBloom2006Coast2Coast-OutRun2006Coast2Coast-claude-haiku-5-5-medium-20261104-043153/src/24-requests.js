// Love in Bloom's requests (plan §7.7, §8.7): each stage's slots become requests, each with a window of road, the
// objects it puts on the road, the count it measures, a rating (perfect, great, good, miss) and petals. The grade and
// the mood come from the petals against the run's maximum.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp } = E;
const WINDOW = 220;               // segments: the window of road a request is active over
const INTRO = 3500;               // units before the window: the passenger's call-out
const PETAL = { perfect: 5, great: 3, good: 2, miss: 0 };
const GRADES = [[.92, 'AAA'], [.82, 'AA'], [.70, 'A'], [.55, 'B'], [.40, 'C'], [.25, 'D'], [0, 'E']];

const R = OB.REQUEST_RULES;
const pick = (rng, a, b) => a + (b - a) * rng();

/** a request for a slot of a stage: its window, its objects are spawned at the call-out */
function make(race, st, slot) {
  const def = OB.REQUESTS[slot.type]; if (!def) return null;
  const len = st.layoutLen * OB.SEG, z0 = slot.at * len, z1 = z0 + WINDOW * OB.SEG;
  if (z1 > st.junction) return null;   // (a request never runs into the junction)
  const rng = OB.rand.stream('req', st.def.id + ':' + slot.type);
  return { type: slot.type, n: slot.n || 0, def, z0, z1, rng, state: 'wait', objs: [], hits: 0, total: 0, rating: null, petals: 0,
    snap: null, winT: 0, fastT: 0, t: 0, stage: st.def.id,
    progress() {
      if (this.state === 'wait') return 0;
      if (this.total) return this.hits + ' / ' + this.total;
      if (this.type === 'pass' || this.type === 'close') return (this.delta(race) ) + ' / ' + this.n;
      return Math.round(this.winT) + ' s';
    },
    delta(r) { if (!this.snap) return 0; return this.type === 'pass' ? r.counters.overtakes - this.snap.overtakes : r.counters.nearmisses - this.snap.nearmisses; },
  };
}

/** the objects on the road for a request (plan §8.7): spaced over its window, in lanes or on the sides */
function spawnObjects(req, race) {
  const st = race.stage, rng = req.rng, n = Math.max(1, req.n || 8);
  const list = [];
  const span = req.z1 - req.z0;
  for (let i = 0; i < n; i++) {
    const z = req.z0 + span * (i + .5) / n;
    let x = -.7 + 1.4 * rng();
    let side = 1;
    if (req.type === 'cones') { side = i % 2 ? 1 : -1; x = side * .55; }
    if (req.type === 'balloons' || req.type === 'gnomes') x = pick(rng, -.75, .75);
    if (req.type === 'arches') x = [-.5, 0, .5][Math.floor(rng() * 3)];
    if (req.type === 'bouquets') x = pick(rng, -.95, .95);
    if (req.type === 'bees') x = pick(rng, -.7, .7);
    if (req.type === 'ribbons') x = pick(rng, -.5, .5);
    list.push({ z, x, kind: req.type, side, state: 'live' });
  }
  if (req.type === 'bees') for (const o of list) o.kind = 'bee';
  if (req.type === 'bouquets') for (const o of list) o.kind = 'bouquet';
  if (req.type === 'ribbons') for (const o of list) o.kind = 'ribbon';
  if (req.type === 'photo') { list.length = 0; list.push({ z: req.z0 + span * .5, x: 0, kind: 'photo', len: 400, side: 1, state: 'live' }); }
  req.objs = list;
  req.total = list.length;
  return list;
}

/** the request's rating from its measure, against the thresholds; returns perfect | great | good | miss */
function rate(req, race) {
  const th = R[req.type] || [1, .7, .4];
  let ratio;
  switch (req.type) {
    case 'balloons': case 'gnomes': case 'arches': case 'cones': case 'ribbons': case 'bouquets': ratio = req.total ? req.hits / req.total : 0; break;
    case 'bees': { const s = race.counters.stings - req.snap.stings; return s === 0 ? 'perfect' : s === 1 ? 'great' : s === 2 ? 'good' : 'miss'; }
    case 'photo': return req.photo || 'miss';
    case 'pass': ratio = req.n ? (race.counters.overtakes - req.snap.overtakes) / req.n : 0; break;
    case 'close': ratio = req.n ? (race.counters.nearmisses - req.snap.nearmisses) / req.n : 0; break;
    case 'speed': ratio = req.winT ? req.fastT / req.winT : 0; break;
    case 'clean': { const c = race.counters.contacts - req.snap.contacts; return c === 0 ? 'perfect' : c === 1 ? 'good' : 'miss'; }
    case 'draft': { const d = race.counters.draftT - req.snap.draftT; return d >= th[0] ? 'perfect' : d >= th[1] ? 'great' : d >= th[2] ? 'good' : 'miss'; }
    case 'drift': { const d = race.counters.driftScore - req.snap.driftScore; const T = 1500; return d >= T * th[0] ? 'perfect' : d >= T * th[1] ? 'great' : d >= T * th[2] ? 'good' : 'miss'; }
    default: ratio = 0;
  }
  return ratio >= th[0] ? 'perfect' : ratio >= th[1] ? 'great' : ratio >= th[2] ? 'good' : 'miss';
}

/** one step of a request: the call-out at the intro, the window's objects and counts, the rating at its end */
function step(req, race, dt) {
  const car = race.car;
  if (req.state === 'wait' && car.z >= req.z0 - INTRO) {
    req.state = 'intro'; req.t = 0; req.snap = { overtakes: race.counters.overtakes, nearmisses: race.counters.nearmisses, contacts: race.counters.contacts,
      draftT: race.counters.draftT, driftScore: race.counters.driftScore, stings: race.counters.stings };
    spawnObjects(req, race);
    OB.bus.emit('req:start', { type: req.type, call: req.def.call.replace('{n}', req.n), n: req.n, who: race.passenger });
  }
  if (req.state === 'intro') { req.t += dt; if (car.z >= req.z0) { req.state = 'active'; req.t = 0; } }
  if (req.state === 'active') {
    req.winT += dt; if (car.v > req.n && req.type === 'speed') req.fastT += dt;
    // objects: a hit as the car passes one in its place, a miss as it goes by
    for (const o of req.objs) {
      const ev = OB.Objects.judge(o, car, race);
      if (!ev) continue;
      if (ev.type === 'hit') { req.hits++; OB.bus.emit(o.kind === 'gnomes' ? 'obj:bonk' : o.kind === 'arches' ? 'obj:arch' : o.kind === 'bouquet' ? 'obj:bouquet' : 'obj:pop', { kind: o.kind }); }
      else if (ev.type === 'sting') { race.counters.stings++; OB.bus.emit('obj:sting', {}); }
      else if (ev.type === 'cut') { req.hits++; OB.bus.emit('obj:snap', {}); }
      else if (ev.type === 'photo') { req.photo = ev.rating; req.hits = ev.rating === 'miss' ? 0 : 1; OB.bus.emit('obj:photo', { rating: ev.rating }); }
    }
    if (req.type === 'photo' && req.objs.length && req.objs[0].state === 'live' && car.z >= req.z1) req.photo = 'miss';
    if (car.z >= req.z1) finish(req, race);
  }
}

/** the rating and the petals: the petals a rating gives, with the passenger's favourite request (×1.2, rounded up) */
function finish(req, race) {
  req.state = 'done';
  req.rating = rate(req, race);
  const loves = race.passenger && OB.CAST[race.passenger] && OB.CAST[race.passenger].loves.includes(req.type);
  let p = PETAL[req.rating] * race.petalScale();
  if (loves && p > 0) p = Math.ceil(p * 1.2);
  p = Math.round(p);
  req.petals = p; race.petals += p;
  if (req.rating === 'perfect') { race.addChain(800); race.score += 800 * race.bloom.level; }
  const who = race.passenger;
  OB.bus.emit('req:end', { type: req.type, rating: req.rating, petals: p, who });
  OB.bus.emit('petals', { delta: p, reason: 'request' });
  race.reqDone.push({ type: req.type, rating: req.rating, petals: p, stage: req.stage, loves: !!loves });
  // the objects still on the road go away (the window ends with the car)
  for (const o of req.objs) if (o.state === 'live') o.state = 'miss';
}

/** the grade of a run: its petals against the most it could have had. Mood: Bloom (A or better), Bud (B-C), Wilt. */
function grade(race) {
  const max = Math.max(1, race.petalMax + (race.prefTaken + race.prefMissed) * 2);
  const share = clamp(race.petals / max, 0, 1);
  let g = 'E';
  for (const [t, name] of GRADES) if (share >= t) { g = name; break; }
  const mood = ['AAA', 'AA', 'A'].includes(g) ? 'Bloom' : ['B', 'C'].includes(g) ? 'Bud' : 'Wilt';
  return { grade: g, share: +share.toFixed(3), mood, petals: race.petals, max };
}

OB.Requests = { make, step, grade, rate, WINDOW, PETAL, GRADES };
// the race asks the requests' module for its grade
OB.Race.prototype.grade = function () { return OB.Requests.grade(this); };
})();
