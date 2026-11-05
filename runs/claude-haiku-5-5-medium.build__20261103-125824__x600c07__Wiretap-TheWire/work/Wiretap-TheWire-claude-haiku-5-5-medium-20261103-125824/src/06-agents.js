// Agents: people with a body, a rig, a routine and (for crew) a role. Civilians wander the street; the crew
// stand the corner; a sale is a customer walking up to the post and back, with an act window the camera can catch.
let FLOW = null;
const PEOPLE = [];                 // every Person in the field
const CORNER = { open: true, shutUntil: 0, nextSale: 9, sales: 0, lastAct: null };

class Person {
  constructor(o) {
    Object.assign(this, { id: o.id || null, name: o.name || 'Unknown', role: o.role || null, watcher: !!o.watcher, crew: !!o.crew, speed: o.speed || 34 });
    this.body = new E.Body({ x: 0, y: 0, r: 4.5 });
    const [x, y] = cellWorld(o.at);
    this.body.x = x; this.body.y = y;
    this.rig = makeRig(o.look);
    this.facing = o.facing != null ? o.facing : 0;
    this.route = o.route || [];          // cells: a loop of stops
    this.ri = 0;                         // index of the next stop
    this.wait = o.wait != null ? o.wait : 2;
    this.idle = o.idle || false;         // stands and looks (a lookout)
    this.job = null;                     // { kind: 'buy' | 'sit' | 'walk', at, t }
    this.act = null;                     // { kind, until } while in an evidentiary act
    this.talk = null;                    // a short line overhead
    this.bob = 0;
    this.lineUntil = 0;
    PEOPLE.push(this);
  }
  get x() { return this.body.x; }
  get y() { return this.body.y; }
  goTo(cell) { this.target = cell; }
  update(dt) {
    const b = this.body;
    let tx = null, ty = null;
    const dwelling = this.job && this.job.kind === 'buy' && !this.job.at;   // standing at the post, buying
    if (this.job && this.job.at) { [tx, ty] = cellWorld(this.job.at); }
    else if (dwelling) { tx = null; }
    else if (this.target) { [tx, ty] = cellWorld(this.target); }
    else if (this.route.length && !this.idle) { [tx, ty] = cellWorld(this.route[this.ri % this.route.length]); }
    const d = tx == null ? 0 : Math.hypot(tx - b.x, ty - b.y);
    if (tx != null && d > 5 && this.wait <= 0) {
      const dir = FLOW ? FLOW.dir(b.x, b.y, tx, ty) : [(tx - b.x) / d, (ty - b.y) / d];
      const sp = this.speed;
      b.vx = dir[0] * sp; b.vy = dir[1] * sp;
      this.facing = Math.atan2(dir[1], dir[0]);
      b.update(dt, MAP);
      this.moving = true;
    } else {
      b.vx = 0; b.vy = 0;
      if (tx != null && d <= 5 && this.wait <= 0) {
        this.arrive();
      }
      this.moving = false;
    }
    if (this.wait > 0) this.wait -= dt;
    if (this.act && this.act.until < game.time) this.act = null;
    if (this.job && this.job.kind === 'buy' && this.job.left > 0) { this.job.left -= dt; if (this.job.left <= 0) this.job = null; }
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z || 0, vx: b.vx, vy: b.vy, facing: this.facing, pose: this.pose || undefined, run: this.moving ? 0.4 : 0 });
  }
  arrive() {
    if (this.job && this.job.at) {
      if (this.job.kind === 'buy') { this.job.left = this.job.dwell || 2.4; this.job.at = null; }
      else { this.job = null; }
      this.wait = 0.2;
    } else if (this.target) {
      this.target = null;
      this.wait = rnd(RNG.cosmetic, 2, 7);
    } else if (this.route.length) {
      this.ri = (this.ri + 1) % this.route.length;
      this.wait = this.wait > 0 ? this.wait : rnd(RNG.cosmetic, 1.5, 6);
    }
  }
  draw(r, sel) {
    r.shadow(this.x, this.y, 6, .35, undefined, this.body.groundZ || 0);
    r.actor(this.x, this.y, this.body.z || 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { every: this.crowd ? 2 : undefined, key: this });
    if (this.talk && this.lineUntil > game.time) {
      r.textAt(this.x, this.y, 30, this.talk, '#ffffff');
    }
  }
}

// Make a civilian from the seeded stream and start them on a loop of stops.
function spawnCivilian(i) {
  const look = makeCivilian(RNG.cosmetic, i);
  const stops = ['walkA', 'walkB', 'walkC', 'walkD', 'walkE', 'walkF', 'bench', 'church', 'lotA', 'carryout', 'barberWin']
    .map(k => SPOTS[k]);
  const at = stops[i % stops.length];
  const a = stops[(i * 3 + 1) % stops.length], b2 = stops[(i * 5 + 2) % stops.length];
  return new Person({ name: '', look, at, route: [a, b2, at], speed: rnd(RNG.cosmetic, 30, 44), wait: rnd(RNG.cosmetic, 0, 4) });
}

// The crew. Watchers are lookouts who see the detail; the rest work the corner.
function spawnCrew() {
  const tee = new Person({ id: 'tee', name: 'Tee', role: 'LIEUTENANT', crew: true, watcher: true, look: CAST.tee, at: [30, 31], facing: -1.2, idle: true });
  const rook = new Person({ id: 'rook', name: 'Rook', role: 'MUSCLE', crew: true, watcher: true, look: CAST.rook, at: [31, 33], facing: .4, idle: true });
  const pigeon = new Person({ id: 'pigeon', name: 'Pigeon', role: 'LOOKOUT', crew: true, watcher: true, look: CAST.pigeon, at: [33, 34], facing: 2.3, idle: true, speed: 30 });
  const corey = new Person({ id: 'corey', name: 'Corey', role: 'STASH', crew: true, look: CAST.corey, at: [27, 36], route: [[27, 36], [26, 38]], speed: 36, wait: 6 });
  const pockets = new Person({ id: 'pockets', name: 'Pockets', role: 'INFORMANT', look: CAST.pockets, at: POI.pockets.c, idle: true, facing: 0 });
  const odessa = new Person({ id: 'odessa', name: 'Miss Odessa', look: CAST.odessa, at: SPOTS.stoopOdessa, idle: true, facing: 1.6 });
  const dukes = new Person({ id: 'dukes', name: 'Officer Dukes', look: CAST.dukes, at: [29, 40], route: [[29, 40], [33, 38]], speed: 28 });
  const lou = new Person({ id: 'lou', name: 'Lou', look: CAST.lou, at: [24, 30], idle: true, facing: 0.2 });
  return { tee, rook, pigeon, corey, pockets, odessa, dukes, lou };
}

// Corner routines: a sale picks a civilian who walks to the post and buys, with an act window for the photo.
function cornerStep(dt, cast) {
  const now = game.time;
  if (CORNER.shutUntil > now) { CORNER.open = false; }
  else { CORNER.open = true; }
  if (!CORNER.open) return;
  CORNER.nextSale -= dt;
  if (CORNER.nextSale > 0) return;
  CORNER.nextSale = rnd(RNG.sim, 22, 34);
  const buyer = PEOPLE.find(p => !p.crew && !p.job && !p.target && p.route.length);
  if (!buyer) return;
  buyer.job = { kind: 'buy', at: [30, 31], left: 0, dwell: 3.2 };
  CORNER.sales++;
  const window = { kind: 'sale-money', until: now + 9.5 };
  cast.tee.act = window;
  buyer.act = window;
  CORNER.lastAct = { t: now, subjects: [cast.tee, buyer] };
}
