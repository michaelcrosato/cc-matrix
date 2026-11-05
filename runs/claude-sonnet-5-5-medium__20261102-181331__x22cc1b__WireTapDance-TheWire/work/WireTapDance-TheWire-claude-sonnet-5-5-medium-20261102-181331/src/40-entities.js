/* ============================================================================
 * people: the detective, the unit, the crew, the lookouts, the street
 * ========================================================================== */
const T16 = 16;
const cellXY = (cx, cy) => [(cx + .5) * T16, (cy + .5) * T16];
const rigOf = o => new E.Humanoid(o);
const RIGS = {
  hero: () => rigOf({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { skin: '#a8714f', hair: '#1e1612', coat: '#3c4658', cloth: '#556070', pants: '#2a2c34', boot: '#1a1614', belt: '#caa24a', trim: '#caa24a' } }),
  kowalczyk: () => rigOf({ size: 1.25, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'long', colors: { skin: '#d9a98a', cloth: '#b8b2a0', pants: '#3a3a42', boot: '#222', belt: '#4a3a2a', trim: '#7a2a2a' } }),
  pruitt: () => rigOf({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#8a5a40', hair: '#2a1a14', coat: '#22304a', cloth: '#d8d4cc', pants: '#1c2434', boot: '#14141a', trim: '#c8b070' } }),
  tooley: () => rigOf({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', hat: 'cap', sleeves: 'long', hunch: .5, colors: { skin: '#7a4f38', hair: '#2a2420', coat: '#6a5a3a', cloth: '#80806a', pants: '#3a3a30', boot: '#2a2420' } }),
  lorne: () => rigOf({ size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'bald', sleeves: 'long', colors: { skin: '#5a3a2a', coat: '#1c1c20', cloth: '#6a1c1c', pants: '#22262e', boot: '#111', trim: '#d8b030' } }),
  sweets: () => rigOf({ size: 1.1, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', sleeves: 'short', colors: { skin: '#8a5a40', hair: '#1a1410', cloth: '#d8c040', pants: '#2a3a5a', boot: '#e8e8e8' } }),
  dray: () => rigOf({ size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'spiky', hat: 'band', sleeves: 'long', colors: { skin: '#6a4430', hair: '#14100c', cloth: '#3a6a5a', pants: '#2a2a32', boot: '#e0e0e0', trim: '#e8e8e8' } }),
  hopper: i => rigOf({ size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: i % 2 ? 'cap' : undefined, sleeves: 'short', colors: { skin: ['#7a4f38', '#a8714f', '#5a3a2a', '#c89a78'][i % 4], cloth: ['#c04a3a', '#3a6ac0', '#c0a03a', '#6a3ac0', '#3ac07a', '#c03a8a'][i % 6], pants: '#2a2c38', boot: '#e8e8e8' } }),
  walker: i => rigOf({ size: 1.1 + (i % 3) * .04, build: i % 2 ? 'chibi' : 'heroic', weapon: null, outfit: ['coat', 'shirt', 'robe'][i % 3], hair: ['short', 'long', 'ponytail', 'bald', 'spiky'][i % 5], hat: i % 4 === 0 ? 'cap' : undefined, sleeves: 'long', colors: { skin: ['#d9a98a', '#a8714f', '#6a4430', '#e4bda0'][i % 4], cloth: ['#7a6a5a', '#4a5a6a', '#6a4a4a', '#5a6a4a', '#8a8070'][i % 5], coat: ['#3a3a48', '#5a4a3a', '#2a3a3a'][i % 3], pants: '#30303a', boot: '#222' } })
};

class Person {
  constructor(tag, x, y, rig, o = {}) {
    this.tag = tag; this.name = o.name || tag; this.voice = o.voice || 'narr'; this.rig = rig;
    this.body = o.mover ? new E.Mover({ x, y, r: 5, run: o.run || 90, walk: o.walk || 40, sprintSpeed: o.sprint || 108 }) : new E.Body({ x, y, r: 5 });
    this.home = { x, y }; this.facing = o.facing === undefined ? 1.57 : o.facing; this.body.facing = this.facing;
    this.pose = o.pose || null; this.expr = null; this.aim = null; this.hidden = false; this.wary = 0; this.mode = 'idle';
    this.t = Math.random() * 10; this.lane = o.lane || null; this.dir = 1; this.speed = o.speed || 28;
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z || 0; }
  set x(v) { this.body.x = v; } set y(v) { this.body.y = v; }
  face(tx, ty) { this.facing = Math.atan2(ty - this.y, tx - this.x); this.body.facing = this.facing; }
  update(dt, map, hero) {
    const b = this.body; this.t += dt;
    if (this.mode === 'walk' && this.lane) {   // a pedestrian: back and forth along the pavement
      const L = this.lane, tx = L.a + (L.b - L.a) * (this.dir > 0 ? 1 : 0);
      if (L.axis === 'x') { b.vx = this.dir * this.speed; b.vy = 0; if ((this.dir > 0 && this.x >= L.b) || (this.dir < 0 && this.x <= L.a)) this.dir *= -1; this.facing = this.dir > 0 ? 0 : Math.PI; }
      else { b.vy = this.dir * this.speed; b.vx = 0; if ((this.dir > 0 && this.y >= L.b) || (this.dir < 0 && this.y <= L.a)) this.dir *= -1; this.facing = this.dir > 0 ? 1.57 : -1.57; }
      b.facing = this.facing; void tx;
    } else if (this.mode === 'idle' && !(b instanceof E.Mover)) { b.vx = b.vy = 0; }
    if (!(b instanceof E.Mover && this.mode === 'run')) b.update(dt, map);
    const moving = Math.hypot(b.vx || 0, b.vy || 0) > 4;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z || 0, vx: b.vx || 0, vy: b.vy || 0, facing: this.facing, pose: this.pose || undefined, expr: this.expr || undefined, point: false, stance: undefined, sprint: this.mode === 'run' ? 1 : 0, run: moving && this.mode === 'run' ? 1 : undefined });
  }
}

/** a lookout: a kid on a post whose gaze sweeps. alert rises in the cone; at 1 he whistles. */
class Lookout {
  constructor(post, i) {
    const [x, y] = cellXY(post.cx, post.cy);
    this.post = post; this.name = post.name; this.x = x; this.y = y; this.z = 0; this.base = post.face; this.facing = post.face; this.alert = 0; this.cool = 0; this.t = i * 2.3;
    this.rig = RIGS.hopper(i); this.range = post.avenue ? 130 : 116; this.fov = 1.5; this.seen = false; this.body = new E.Body({ x, y, r: 4 }); this.whistled = 0;
  }
  update(dt) {
    this.t += dt; this.cool = Math.max(0, this.cool - dt); this.whistled = Math.max(0, this.whistled - dt);
    this.facing = this.base + Math.sin(this.t * this.post.speed) * this.post.sweep;
    this.rig.update(dt, { x: this.x, y: this.y, z: 0, vx: 0, vy: 0, facing: this.facing, pose: this.whistled > 0 ? 'cheer' : undefined, expr: this.alert > .5 ? 'shout' : undefined });
  }
}

/* ---------- perception: can a lookout see the detective? ---------- */
function lookoutSees(lk, hero, map, state) {
  const crouch = !!hero.crouch;
  const tgt = { x: hero.x, y: hero.y, z: hero.z || 0, exposure: crouch ? 1 : 1, crouch };
  const r = E.sees({ x: lk.x, y: lk.y, z: 0 }, tgt, { range: lk.range * (state.sprinting ? 1.15 : 1) * (crouch ? .8 : 1) * (state.camera ? 1.1 : 1), fov: lk.fov, facing: lk.facing, map });
  return r;
}
