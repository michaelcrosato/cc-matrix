// ---- the contestant: a player's body, rig and state; its controllers (local input, bot, remote report, mirror) ----
const DIFF = MT.DIFF = {
  ROOKIE: { hp: 5, lives: 5, enemySpeed: .85, enemyBullet: .8, wave: .8, label: 'ROOKIE', blurb: 'MORE HEALTH, MORE LIVES, SLOWER FOES.' },
  CONTESTANT: { hp: 3, lives: 3, enemySpeed: 1, enemyBullet: 1, wave: 1, label: 'CONTESTANT', blurb: 'THE SHOW AS IT AIRS.' },
  CHAMPION: { hp: 1, lives: 3, enemySpeed: 1.15, enemyBullet: 1, wave: 1.2, label: 'CHAMPION', blurb: 'ONE HIT AND YOU ARE MASHED. THE CLASSIC RULE.' },
};
const EXTRA_LIVES = [250000, 750000, 1500000, 3000000];
const diffOf = () => DIFF[(MT.run && MT.run.diff) || 'CONTESTANT'] || DIFF.CONTESTANT;
const maxHpNow = () => MT.T.hpPerLife > 0 ? MT.T.hpPerLife : diffOf().hp;
const startLivesNow = () => MT.T.startLives > 0 ? MT.T.startLives : diffOf().lives;
MT.maxHpNow = maxHpNow; MT.startLivesNow = startLivesNow;
/** a run's record of a player (cash, lives, prizes...): kept across rooms */
function makePlayerRecord(slot, look, name) {
  return { slot, look: look === undefined ? slot : look, name: name || LOOKS[(look === undefined ? slot : look) % 4].name, color: SLOT_COLORS[slot], cash: 0, lives: startLivesNow(), prizes: [], kills: 0, deaths: 0, boatGain: 0, continues: 0, nextLife: 0, epCash: 0, bombs: 2, id: slot };
}
MT.makePlayerRecord = makePlayerRecord;
let CID = 1;
class Contestant {
  constructor(pr, o = {}) {
    this.cid = CID++; this.pr = pr; this.slot = pr.slot; this.netId = o.netId === undefined ? pr.slot : o.netId;
    this.body = new E.Body({ x: AR.CX, y: AR.CY, r: 6 }); this.r = 6;
    this.rig = makeContestantRig(pr.slot, pr.look);
    this.ctl = o.ctl || 'local'; this.input = o.input || null; this.botOpts = o.bot || null;
    this.state = 'play'; this.hp = maxHpNow(); this.invuln = 0; this.hurtT = 0; this.slideT = 0; this.slideCD = 0; this.slideDir = [1, 0];
    this.facing = -Math.PI / 2; this.aim = -Math.PI / 2; this.lastAim = -Math.PI / 2; this.firing = false; this.fireCD = 0;
    this.weapon = 'blaster'; this.wT = 0; this.wMax = 0; this.addons = { records: 0, shield: 0, speed: 0 };
    this.boatCD = 0; this.boatT = 0; this.boatPose = 0; this.boatHit = false; this.deadT = 0; this.dropT = 0; this.walk = null; this.tagT = 3;
    this.slowT = 0; this.laserAng = null; this.recA = 0; this.recHit = new Map(); this.nearMissT = 0; this.nearMissN = 0; this.pose = null; this.expr = null;
    this.hurtCount = 0; this.lowHpSaid = false; this.cheer = 0; this.exitTo = null;
    this.rs = { x: 0, y: 0, z: 0, face: 0, aim: 0, vx: 0, vy: 0, state: 'play', hurt: false, slideU: 0, pose: null, flash: 0, alpha: 1, wpn: 'blaster', slot: this.slot };
  }
  get x() { return this.body.x; } set x(v) { this.body.x = v; }
  get y() { return this.body.y; } set y(v) { this.body.y = v; }
  get z() { return this.body.z; } set z(v) { this.body.z = v; }
  get alive() { return this.state === 'play' || this.state === 'walkin' || this.state === 'drop' || this.state === 'exit'; }
  get targetable() { return this.state === 'play' || this.state === 'exit'; }
  /** god mode, i-frames from the slide or a hit, the shield, a cutscene walk */
  get invulnerable() { return this.invuln > 0 || (this.slideT > 0 && this.slideT > .06) || this.addons.shield > 0 || this.state !== 'play' || (MT.cheats.god && this.ctl !== 'remote') || this.godMode; }
  place(x, y, facing) { this.body.x = x; this.body.y = y; this.body.z = 0; this.body.vx = this.body.vy = 0; if (facing !== undefined) { this.facing = facing; this.aim = facing; this.lastAim = facing; } }
  /** walk from the entry door to a formation point (invulnerable, no input) */
  walkIn(fromDoor, idx, n) {
    const D = DOORS[fromDoor], inward = [D.nx, D.ny], side = [-D.ny, D.nx];
    const spread = n > 1 ? (idx % 2 ? 1 : -1) * 12 * (1 + Math.floor(idx / 2) * .0) : 0, row = Math.floor(idx / 2);
    const sx = D.x + inward[0] * 4 + side[0] * spread, sy = D.y + inward[1] * 4 + side[1] * spread;
    const tx = D.x + inward[0] * (40 + row * 16) + side[0] * spread, ty = D.y + inward[1] * (40 + row * 16) + side[1] * spread;
    this.place(sx, sy, Math.atan2(inward[1], inward[0]));
    this.walk = { sx, sy, tx, ty, t: 0, dur: 1.2 }; this.state = 'walkin'; this.tagT = 3;
  }
  dropIn(x, y) { this.place(x, y, -Math.PI / 2); this.state = 'drop'; this.dropT = 0; this.body.z = 70; this.hp = maxHpNow(); this.invuln = 2.5; this.pr.bombs = Math.max(1, this.pr.bombs); this.tagT = 3; MT.sfx('zip'); }
  /** one step of the contestant's own simulation (authoritative for local and bot contestants) */
  step(dt, world, intent) {
    const T = MT.T;
    this.invuln = Math.max(0, this.invuln - dt); this.hurtT = Math.max(0, this.hurtT - dt); this.slideCD = Math.max(0, this.slideCD - dt);
    this.boatCD = Math.max(0, this.boatCD - dt); this.tagT = Math.max(0, this.tagT - dt); this.slowT = Math.max(0, this.slowT - dt); this.nearMissT = Math.max(0, this.nearMissT - dt);
    for (const k in this.addons) if (this.addons[k] > 0) { this.addons[k] = Math.max(0, this.addons[k] - dt); if (this.addons[k] === 0) world.event('expire', { c: this, what: k }); }
    if (this.weapon !== 'blaster') { this.wT -= dt; if (this.wT <= 0) { this.weapon = 'blaster'; this.wT = 0; world.event('expire', { c: this, what: 'weapon' }); } }
    const B = this.body;
    if (this.state === 'walkin') {
      const w = this.walk; w.t += dt; const k = clamp(w.t / w.dur, 0, 1);
      const nx = lerp(w.sx, w.tx, k), ny = lerp(w.sy, w.ty, k); B.vx = (nx - B.x) / dt; B.vy = (ny - B.y) / dt; B.x = nx; B.y = ny;
      if (k >= 1) { this.state = 'play'; B.vx = B.vy = 0; }
      return;
    }
    if (this.state === 'exit') {
      const D = DOORS[this.exitTo]; const a = Math.atan2(D.y - B.y, D.x - B.x), sp = 80;
      B.vx = Math.cos(a) * sp; B.vy = Math.sin(a) * sp; B.x += B.vx * dt; B.y += B.vy * dt; this.facing = a;
      return;
    }
    if (this.state === 'dead') { this.deadT -= dt; B.vx = B.vy = 0; if (this.deadT <= 0) world.afterDeath(this); return; }
    if (this.state === 'drop') { this.dropT += dt; B.z = 70 * (1 - easeOut(clamp(this.dropT / .5, 0, 1))); if (this.dropT >= .5) { B.z = 0; this.state = 'play'; this.rig.land(.5); MT.sfx('land'); world.event('respawn', { c: this }); } return; }
    if (this.state === 'out') { B.vx = B.vy = 0; return; }
    // play
    intent = intent || { move: [0, 0], aim: null, fire: false };
    if (this.boatT > 0) {   // showboating: a pose for the cameras, no moving or firing
      this.boatT -= dt; B.vx = B.vy = 0; this.firing = false;
      if (this.boatT <= 0) world.showboatDone(this);
      return;
    }
    if (intent.showboat && this.boatCD <= 0 && this.slideT <= 0) { this.boatT = .6; this.boatCD = 3; this.boatPose = (this.boatPose + 1) % 3; this.boatHit = false; MT.sfx('flourish'); world.event('boatStart', { c: this }); return; }
    if (intent.bomb && (this.pr.bombs > 0 || MT.cheats.infBombs || this.infBombs)) world.showstopper(this);
    let mx = intent.move[0], my = intent.move[1];
    const ml = Math.hypot(mx, my);
    if (intent.slide && this.slideCD <= 0 && this.slideT <= 0) {
      const d = ml > .2 ? [mx / ml, my / ml] : [Math.cos(this.facing), Math.sin(this.facing)];
      this.slideDir = d; this.slideT = .28; this.slideCD = T.slideCooldown * (this.addons.speed > 0 ? .6 : 1);
      MT.sfx('whoosh'); if (game.particles) game.particles.dust(B.x, B.y, 0, 6);
      world.event('slide', { c: this });
    }
    let speed = T.playerSpeed * (this.addons.speed > 0 ? 1.45 : 1) * (this.slowT > 0 ? .6 : 1);
    if (this.slideT > 0) { this.slideT -= dt; B.vx = this.slideDir[0] * T.slideSpeed; B.vy = this.slideDir[1] * T.slideSpeed; }
    else { B.vx = mx * speed; B.vy = my * speed; }
    B.vx += world.arena.beltAt(B.x, B.y);
    if (MT.cheats.noclip && this.ctl === 'local') { B.x += B.vx * dt; B.y += B.vy * dt; }
    else { B.update(dt, world.arena.map); }
    clampInterior(B, 5);
    // aim and fire
    if (intent.aim !== null && intent.aim !== undefined) { this.aim = intent.aim; this.lastAim = intent.aim; }
    this.firing = !!intent.fire;
    if (this.firing) this.facing = this.aim; else if (ml > .2) this.facing = Math.atan2(my, mx);
    this.fireCD -= dt;
    MT.fireWeapon(world, this, dt);
  }
  /** the rig follows the state (skipped in fast headless runs) */
  animate(dt) {
    if (MT.cfg.skipRigs) return;
    const B = this.body, dead = this.state === 'dead', poses = ['cheer', 'hips', 'wave'];
    const pose = this.pose || (this.boatT > 0 ? poses[this.boatPose] : dead ? 'die' : this.cheer > 0 ? 'cheer' : null);
    this.rig.update(dt, { x: B.x, y: B.y, z: B.z, vx: B.vx, vy: B.vy, facing: this.facing, point: this.firing && !dead, hurt: this.hurtT > 0, flip: this.slideT > 0 ? 1 - this.slideT / .28 : 0, pose, expr: this.boatT > 0 || this.cheer > 0 ? 'smile' : this.hurtT > 0 ? 'wince' : this.expr, down: dead && this.deadT < 1.4 ? 1 : 0 });
  }
  syncRs() {
    const B = this.body, s = this.rs;
    s.x = B.x; s.y = B.y; s.z = B.z; s.face = this.facing; s.aim = this.aim; s.vx = B.vx; s.vy = B.vy; s.state = this.state; s.hurt = this.hurtT > 0; s.slideU = this.slideT > 0 ? 1 - this.slideT / .28 : 0;
    s.wpn = this.weapon; s.firing = this.firing; s.invuln = this.invuln; s.shield = this.addons.shield > 0; s.records = this.addons.records > 0; s.speed = this.addons.speed > 0; s.boat = this.boatT > 0;
  }
  draw(r, t, world) {
    const s = this.rs; if (this.state === 'out' || world.phase === 'HOLD') return;
    if (this.state !== 'dead') MT.paint.drawPlayerTag(r, this, t);
    if (this.state === 'drop') r.queue(s.x, s.y, s.z + 30, g => { const a = r.w(s.x, s.y, s.z + 36), b = r.w(s.x, s.y, 200); px.line(g, a[0], a[1], b[0], b[1], '#c8d0e0'); }, { bias: -1 });
    if (this.state === 'drop') game.lights.add(s.x, s.y, 0, 40, .8, { color: '#fff6d0' });
    const blink = s.invuln > 0 && this.state === 'play' && Math.floor(t * 12) % 2 === 0;
    r.shadow(s.x, s.y, 6, .5);
    r.actor(s.x, s.y, s.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { flash: this.hurtT > .9 ? '#ffffff' : false, alpha: blink ? .35 : 1, xray: true, ghost: s.speed ? { color: SLOT_COLORS[this.slot], life: .2, alpha: .5, owner: s } : undefined });
    if (s.shield) {
      r.queue(s.x, s.y, 12, g => { const [sx, sy] = r.w(s.x, s.y, 12); px.blend(g, .35, 'add', () => px.disc(g, sx, sy, 15, '#2ee6ff')); px.blend(g, .6, 'normal', () => { px.ell(g, sx, sy, 15, 15, '#2ee6ff'); px.ell(g, sx, sy, 13, 13, '#141018'); }); if (Math.floor(t * 8) % 3) E.font.text(g, 'KRUNCH-O', sx, sy - 3, '#ffcc33', { align: 'center', outline: false, font: 'tiny' }); }, { emissive: true, bias: 2 });
      game.lights.add(s.x, s.y, 12, 36, .5, { color: '#2ee6ff' });
    }
    if (s.records) for (let i = 0; i < 2; i++) { const a = this.recA + i * Math.PI, x = s.x + Math.cos(a) * 26, y = s.y + Math.sin(a) * 26; r.queue(x, y, 10, g => { const [sx, sy] = r.w(x, y, 10); px.disc(g, sx, sy, 4.5, '#8a5a08'); px.disc(g, sx, sy, 3.6, '#ffcc33'); px.disc(g, sx, sy, 1.2, '#140a24'); px.dot(g, sx - 2, sy - 2, '#fff6b0'); }, { emissive: true }); }
    if (this.weapon === 'laser' && this.laserSeg) MT.drawLaser(r, this, t);
  }
}
MT.Contestant = Contestant;
