// ---- animals and critters: their walks, grazing, spooks, wounds and falls ---------------------------------------------
// An animal lives on a lane at a depth d (0 far .. 1 near). Its foot is at footY(d), its height hFrac(d, size). It walks
// across the screen (x in fractions), grazes now and then, bolts when shot or spooked, stares when called, falls when
// it dies, and escapes when it leaves the screen (a bolting wounded animal that escapes is lost).
const LIVE = [];
let liveSeq = 1;

// the engine's animation system drives the motion that has a shape over time: a fall (outBounce), the head going down
// to graze (outCubic), and a snowman's pop (outBack). Each is a tween on the animal, so the engine steps it and a scene
// change ends it.
const tweenOn = (obj, props, secs, opts = {}) => (GAME ? GAME.tween(obj, props, secs, opts) : null);
function knockDown(a) {
  a.dead = true; a.fall = 0;
  if (!tweenOn(a, { fall: 1 }, .7, { ease: 'outBounce' })) a.fall = 1;
}
const headT = a => (a.head == null ? (a.state === 'graze' ? 1 : 0) : a.head);
function setHead(a, v) { tweenOn(a, { head: v }, .35, { ease: 'outCubic' }); }
const isFlyer = sp => !!sp.flies;

function spawnAnimal(species, o = {}) {
  const sp = SPECIES[species];
  const d = o.d == null ? rnd(.15, .95) : o.d;
  const dir = o.dir || (RNG.spawn() < .5 ? 1 : -1);
  const a = {
    id: liveSeq++, species, sex: sp.sex, d, dir, x: o.x == null ? (dir > 0 ? -.12 : 1.12) : o.x,
    fy: footY(d), hn: hFrac(d, sp.size), state: 'walk', phase: RNG.spawn() * 6,
    speed: .085 * (.7 + .6 * d) * TUNING.animalSpeed * (sp.flies ? 2.4 : 1) * (o.speed || 1),
    grazeT: rnd(1.5, 4.5), stateT: 0, fall: 0, dead: false, wounded: false, flash: 0,
    antlers: sp.antlerPts ? Math.round(rnd(4, 10)) : 0, trophy: !!o.trophy, lift: 0, pop: null, life: 0,
    grazes: !!(sp.zone !== 'small' && sp.sex !== 'critter') || (sp.zone === 'small' && sp.kind === 'coon'),
  };
  if (o.trophy) { a.antlers = 14; a.hn *= 1.22; }
  if (o.x != null && o.x >= 0 && o.x <= 1) a.x = o.x;
  LIVE.push(a);
  return a;
}

function doSpook(a, why) {
  if (a.dead || a.state === 'down') return;
  if (a.state !== 'bolt') { a.state = 'bolt'; a.stateT = 3.2; if (isFlyer(SPECIES[a.species])) a.stateT = 4.5; setHead(a, 0); }
  a.spookedBy = why;
}
// after a shot: everything close to the shot runs (a skunk spooks the whole site)
function spookNear(x, fy, range, all = false) {
  for (const a of LIVE) {
    if (a.dead || a.state === 'down') continue;
    if (all || (Math.abs(a.x - x) < range && Math.abs(a.fy - fy) < .22)) doSpook(a, 'near');
  }
}

function updateAnimals(dt) {
  for (let i = LIVE.length - 1; i >= 0; i--) {
    const a = LIVE[i], sp = SPECIES[a.species];
    a.flash = Math.max(0, a.flash - dt * 3);
    if (a.dead || a.state === 'down') {
      a.life += dt;
      if (a.life > 2.6) LIVE.splice(i, 1);
      continue;
    }
    a.stateT -= dt;
    a.phase += dt * a.speed * 22;
    if (a.rig) a.rig.update(dt, { speed: a.speed, state: a.state, head: headT(a) });
    if (a.pop != null) continue;       // bonus pop-ups stand still (see 40-hunt.js)
    if (a.state === 'walk') {
      a.x += a.dir * a.speed * dt;
      if (a.grazes) { a.grazeT -= dt; if (a.grazeT <= 0 && RNG.spawn() < .6) { a.state = 'graze'; a.stateT = rnd(2.2, 4.4); setHead(a, 1); } else a.grazeT = rnd(2, 4.5); }
      if (isFlyer(sp)) a.lift = Math.sin(a.phase * .4) * .02;
    } else if (a.state === 'graze') {
      if (a.stateT <= 0) { a.state = 'walk'; setHead(a, 0); }
    } else if (a.state === 'stare') {
      if (a.stateT <= 0) { a.state = 'walk'; }
    } else if (a.state === 'bolt') {
      a.x += a.dir * a.speed * 3.1 * dt;
      if (a.stateT <= 0) a.state = 'walk';
    }
    if (a.x < -.2 || a.x > 1.2) {
      a.gone = true;
      LIVE.splice(i, 1);
      if (a.wounded) bus.emit('lost', a);
      else bus.emit('escape', a);
    }
  }
}

// call: nearby animals stop and look for a few seconds, the shot they're waiting for
function callNear(x, range) {
  let n = 0;
  for (const a of LIVE) {
    if (a.dead || a.state === 'down' || a.state === 'bolt' || a.pop != null) continue;
    if (Math.abs(a.x - x) < range) { a.state = 'stare'; a.stateT = 3.4; n++; }
  }
  return n;
}

// the site's timeline: spawn events drawn from the hunt's species weights, with enough bucks to bag
function buildTimeline(hunt, seconds, bucksWanted, rng = RNG.spawn) {
  const events = [];
  const keys = Object.keys(hunt.species), weights = keys.map(k => hunt.species[k]);
  const total = weights.reduce((s, w) => s + w, 0);
  const n = Math.max(8, Math.round(seconds / 3.1));
  const pickKind = () => {
    let r = rng() * total;
    for (let i = 0; i < keys.length; i++) { r -= weights[i]; if (r < 0) return keys[i]; }
    return keys[0];
  };
  for (let i = 0; i < n; i++) {
    const at = 1.5 + (i / n) * (seconds - 6) + rng() * 1.2;
    events.push({ at, species: pickKind(), d: rnd(.12, .95, rng), dir: rng() < .5 ? 1 : -1, x: rng() < .3 ? rnd(.2, .8, rng) : null });
  }
  const bucks = keys.filter(k => SPECIES[k].sex === 'buck');
  let have = events.filter(e => SPECIES[e.species].sex === 'buck').length;
  for (let i = 0; have < bucksWanted && i < events.length; i++) {
    const e = events[i];
    if (SPECIES[e.species].sex !== 'buck') { e.species = bucks[Math.floor(rng() * bucks.length)] || e.species; if (SPECIES[e.species].sex === 'buck') have++; }
  }
  events.sort((a, b) => a.at - b.at);
  return events;
}
