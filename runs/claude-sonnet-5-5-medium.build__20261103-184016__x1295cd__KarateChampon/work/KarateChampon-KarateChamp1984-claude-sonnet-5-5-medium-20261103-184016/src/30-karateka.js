/* ---------- Karateka: one fighter (body, technique state machine, boxes, pose) ---------- */
const PUSH = 18, FOE_Z = 24;   // push-box width; below this height a body counts as grounded for pushing
const secs = f => f * 2;       // 60 fps frames -> 120 Hz steps
const specOf = t => {
  if (t._spec) return t._spec;
  const m = t.move; if (!m) return null;
  const s = Object.assign({ name: t.id, wind: .1, active: .1, recover: .2, hold: .55 }, E.MOVES[m.base], m);
  s.wind = secs(t.f[0]) * STEP; s.active = secs(t.f[1]) * STEP; s.recover = secs(t.f[2]) * STEP; delete s.base;
  return (t._spec = s);
};
KC.riggedColors = (data, side, beltId) => {
  const gi = side === 0 ? KC.GI.white : KC.GI.red, skin = data.rig.colors && data.rig.colors.skin || SKIN;
  const belt = (KC.BELTS.find(b => b.id === beltId) || KC.BELTS[0]).color;
  if (KC.game && KC.game.settings.palette === 'Classic' && KC.unlocks.has('classic')) return { skin: '#f0b080', boot: '#f0b080', glove: '#f0b080', hair: '#101010', cloth: side === 0 ? '#ffffff' : '#e02a2a', pants: side === 0 ? '#ffffff' : '#e02a2a', coat: side === 0 ? '#ffffff' : '#e02a2a', belt: '#101010', trim: '#101010' };
  return Object.assign({ skin, boot: skin, glove: skin, belt, trim: side === 0 ? '#c8c4b8' : '#8a1e1a' }, data.rig.colors, { cloth: gi, pants: gi, coat: gi, belt, boot: skin, glove: skin, skin });
};
KC.makeRig = (data, side, beltId, size) => {
  const r = data.rig;
  return new E.Humanoid({ size: size || r.size, build: r.build || 'heroic', weapon: null, outfit: 'shirt', sleeves: r.sleeves || 'short', hair: r.hair || 'short', hat: r.hat || undefined, hunch: r.hunch || 0, speedRef: 40, colors: KC.riggedColors(data, side, beltId) });
};

class Karateka {
  constructor(id, side, o = {}) {
    this.id = id; this.d = KC.FIGHTER[id] || KC.ROSTER[0]; this.side = side; this.o = o;
    this.belt = o.belt || 'white'; this.rig = o.rig || KC.makeRig(this.d, side, this.belt);
    this.mark = KC.ARENA.marks[side]; this.reset();
    this.score = 0; this.name = o.name || this.d.name; this.puppet = !!o.puppet;
  }
  reset() {
    this.x = this.mark; this.z = 0; this.vz = 0; this.vxw = 0; this.face = this.side === 0 ? 1 : -1; this.ang = this.face > 0 ? 0 : Math.PI; this.spinAng = 0;
    this.tech = null; this.t = 0; this.fr = null; this.crouching = false; this.state = 'free'; this.recoil = 0; this.hitDone = false; this.buf = null; this.bufT = 0;
    this.downW = 0; this.hurtT = 0; this.kime = 0; this.pivot = 0; this.upg = null; this.guard = false; this.flipU = 0; this.launched = false; this.posePose = null; this.exprT = 0; this.expr = null; this.air = false;
    this.lastTech = null; this.lastInfo = null; this.walking = 0; this.frozen = false; this.invuln = false; this.returning = false;
  }
  get stats() { return this.d.stats; }
  get busy() { return this.state === 'tech'; }
  get airborne() { return this.z > 1; }
  get hurtable() { return !this.invuln && !this.frozen && this.state !== 'down' && this.state !== 'rise' && this.state !== 'pose'; }
  get phase() { if (!this.tech || !this.fr) return null; const t = this.t, f = this.fr; return t < f[0] ? 'startup' : t < f[0] + f[1] ? 'active' : 'recovery'; }
  get isFlip() { return !!(this.tech && (this.tech.flip || this.tech.roll)); }
  // the foe is on this side: +1 right, -1 left
  foeDir(foe) { return foe.x >= this.x ? 1 : -1; }
  toward(foe, ch) { const fd = this.foeDir(foe); return ch === 'r' ? fd > 0 : ch === 'l' ? fd < 0 : false; }
  // resolve a (posture, strike) pair, in screen terms, into a technique id
  resolve(posture, strike, foe) {
    const fd = this.foeDir(foe), rel = c => c === 'n' ? 'n' : (c === 'u' || c === 'd') ? c : ((c === 'r') === (fd > 0) ? 't' : 'a');
    const p = rel(posture), s = strike === 'u' || strike === 'd' ? strike : ((strike === 'r') === (fd > 0) ? 't' : 'a');
    return this.closeFix(KC.MATRIX[p + s] || null, foe);
  }
  closeFix(id, foe) {
    const t = KC.TECHS[id]; if (!t) return id;
    const gap = Math.abs(foe.x - this.x) - PUSH;
    if (id === 'frontKick' && gap < 12) return 'revPunch';
    if (id === 'midLunge') return gap < 12 ? 'revPunch' : gap < 18 ? 'frontKick' : id;
    if (id === 'upLunge' && gap < 18) return 'roundKick';
    return id;
  }
  start(id, foe, posture, strike) {
    const t = KC.TECHS[id]; if (!t) return false;
    const spd = this.stats.speed * T().techSpeed;
    this.tech = t; this.t = 0; this.state = 'tech'; this.hitDone = false; this.recoil = 0; this.launched = false; this.crouching = false; this.guard = false; this.kime = 0;
    this.fr = t.f.map((f, i) => i === 1 && (t.id === 'block') ? T().blockWindow * 2 : Math.max(i === 1 && !f ? 0 : 1, Math.round(secs(f) / spd)));
    if (t.id === 'crouch') this.fr = [6, 0, 10];
    this.startPosture = posture || 'n'; this.pressR = strike || null; this.startGap = Math.abs(foe.x - this.x) - PUSH;
    this.spinAng = 0; this.lastTech = id; this.travelLeft = t.travel;
    if (t.air && !(t.id === 'jump' || t.flip)) this.launch();
    return true;
  }
  launch() {
    const t = this.tech, vz = t.air.vz * T().jump / 360, tair = 2 * vz / T().gravity;
    this.vz = vz; this.z = .01; this.vxw = t.travel / tair * this.face; this.launched = true; this.air = true;
  }
  // end the technique
  endTech() { this.tech = null; this.fr = null; this.state = 'free'; this.t = 0; this.spinAng = 0; this.flipU = 0; this.vxw = 0; this.upg = null; }
  /** one fixed step (1/120 s). ctrl = { posture, tech } in screen directions (or null: no input). foe = the other Karateka. walls inside the arena. */
  step(foe, ctrl, bout) {
    if (this.frozen) { this.vxw = 0; return; }
    const A = KC.ARENA, tune = T(), fd = this.foeDir(foe);
    this.walking = 0;
    if (this.kime > 0) this.kime--;
    if (this.state === 'down' || this.state === 'rise' || this.state === 'pose') { this.vxw = 0; return; }
    const c = ctrl || { posture: 'n', tech: null };
    // buffering: a strike pressed while busy fires on the first free step (0.15 s)
    if (this.state !== 'free') { if (c.tech) { this.buf = c.tech; this.bufT = 18; } else if (this.bufT > 0 && --this.bufT <= 0) this.buf = null; }
    if (this.state === 'free') {
      // facing: turn toward the foe when free and grounded
      if (!this.air && this.face !== fd) { this.face = fd; this.pivot = 12; }
      const posture = c.posture, press = c.tech || (this.bufT > 0 ? this.buf : null);
      if (press) {
        this.buf = null; this.bufT = 0;
        const id = this.resolve(posture, press, foe);
        if (id) this.start(id, foe, posture, press);
      } else if (posture === 'u' && !this.prevUp) this.start('jump', foe, 'u', null);
      this.prevUp = posture === 'u';
      if (this.state === 'free') {
        this.crouching = posture === 'd';
        if (posture === 'l' || posture === 'r') {
          const toward = (posture === 'r') === (fd > 0), sp = tune.walk * this.stats.walk * (toward ? 1 : .78);
          this.vxw = sp * (posture === 'r' ? 1 : -1); this.walking = toward ? 1 : -1;
        } else this.vxw = 0;
        if (this.crouching) this.vxw = 0;
        this.x += this.vxw * STEP; if (this.pivot > 0) this.pivot--;
      }
    }
    if (this.state === 'tech') this.stepTech(foe, c);
    // arena walls
    this.x = clamp(this.x, A.x0 + PUSH / 2, A.x1 - PUSH / 2);
  }
  stepTech(foe, c) {
    const t = this.tech, f = this.fr, tune = T(), fd = this.face, total = f[0] + f[1] + f[2] + this.recoil;
    // late-posture upgrade (8 steps = 4 frames): a standing technique swaps to the variant of the posture that arrives late
    if (this.t < 8 && this.startPosture === 'n' && this.pressR && !t.air && !t.util && c.posture !== 'n' && this.t > 0) {
      const id = this.resolve(c.posture, this.pressR, foe);
      if (id && id !== t.id) { const keep = this.t; this.start(id, foe, c.posture, this.pressR); this.t = Math.min(keep, this.fr[0] - 1); return; }
    }
    // a jump still in its squat becomes the posture+strike variant when the strike arrives
    if (t.id === 'jump' && !this.launched && c.tech) {
      const id = this.resolve('u', c.tech, foe);
      if (id && id !== 'jump') { const keep = this.t; this.buf = null; this.bufT = 0; this.start(id, foe, 'u', c.tech); this.t = keep; return; }
    }
    if (t.air && !this.launched && this.t >= f[0] && (t.id === 'jump' || t.flip)) this.launch();
    // body travel along the technique's startup+active (ground techniques)
    if (!t.air && t.travel && this.t < f[0] + f[1]) {
      const per = t.travel / (f[0] + f[1]), nx = this.x + per * fd;
      if (!(per > 0 && Math.abs(foe.x - nx) < PUSH && foe.z < FOE_Z)) this.x = nx;
    }
    if (this.air || this.z > 0) {
      this.vz -= tune.gravity * STEP; this.z += this.vz * STEP; this.x += this.vxw * STEP;
      if (this.z <= 0 && this.vz < 0) {
        this.z = 0; this.vz = 0; this.air = false; this.vxw = 0; this.landed = true;
        // landing lag: the rest of the recovery, at least a few steps
        const lag = t.util ? 10 : Math.max(24, Math.min(50, Math.round((total - this.t) * .5)));
        this.t = Math.max(this.t, f[0] + f[1]); this.fr = [f[0], f[1], this.t - f[0] - f[1] + lag]; 
      }
      if (this.flipU !== undefined && t.flip) this.flipU = clamp((this.t - f[0]) / Math.max(1, 2 * this.vzStart() * 120 / tune.gravity), 0, 1);
    }
    this.t++;
    if (t.id === 'crouch') { this.crouching = true; }
    if (this.t >= f[0] + f[1] + f[2] + this.recoil && !this.air) this.endTech();
    else if (this.air && this.t > 600) { this.air = false; this.z = 0; this.endTech(); }
  }
  vzStart() { return this.tech && this.tech.air ? this.tech.air.vz * T().jump / 360 : 360; }
  // can this fighter currently be hit by a technique of the given height? returns 'hit' | 'whiff' | 'block'
  vulnerable(tech, atk) {
    if (!this.hurtable) return 'whiff';
    const dt = this.tech, h = tech.height;
    const crouchLow = this.crouching || (dt && dt.roll) || (dt && dt.id === 'crouch');
    const flipping = dt && dt.flip && this.z > 1;
    const inAir = this.z > 6;
    if (dt && dt.id === 'block' && this.t >= 1 && this.t < this.fr[0] + this.fr[1] && (h === 'high' || h === 'mid') && !tech.unblockable) return 'block';
    if (flipping) return (h === 'high' || tech.rising) ? 'hit' : 'whiff';
    if (h === 'high' && crouchLow && !tech.rising) return 'whiff';
    if (h === 'low' && inAir) return 'whiff';
    if (tech.rising && inAir) return this.vz > -40 || this.z < 40 ? 'hit' : 'whiff';
    if (h === 'mid' && crouchLow && !tech.hitsCrouch) return 'whiff';
    if (dt && dt.roll && h !== 'low') return 'whiff';
    return 'hit';
  }
  counterable() { return this.state === 'tech' && this.tech && (this.tech.id !== 'jump' && this.tech.id !== 'crouch') && !this.tech.util || this.recoil > 0; }
  /** the rig input from serializable state only */
  riggedState(dt, foe) {
    const t = this.tech, f = this.fr, s = { x: this.x, y: 0, z: this.z, vx: this.vxw, vy: 0 };
    const base = this.face > 0 ? 0 : Math.PI, k = clamp(dt * 14, 0, 1);
    let want = base, spin = 0;
    if (t && f) {
      const sp = t.spin || 0;
      if (sp) { const u0 = sp === .5 ? .35 : 0, u = clamp((this.t / Math.max(1, f[0]) - u0) / (1 - u0), 0, 1); spin = (this.face > 0 ? -1 : 1) * TAU * E.ease.inOut(u); }
    }
    this.ang = want; s.facing = base + spin;
    if (this.pivot > 0 && !t) s.facing = base + (this.face > 0 ? -1 : 1) * Math.PI * (this.pivot / 12) * .5;
    if (t && f && t.move) {
      const ph = this.phase, tt = this.t;
      s.attack = ph === 'startup' ? { spec: specOf(t), phase: 'wind', u: clamp(tt / f[0], 0, 1) } : ph === 'active' ? { spec: specOf(t), phase: 'active', u: clamp((tt - f[0]) / Math.max(1, f[1]), 0, 1) } : { spec: specOf(t), phase: 'recover', u: clamp((tt - f[0] - f[1]) / Math.max(1, f[2] + this.recoil), 0, 1) };
      if (t.rising && ph !== 'startup') s.attack.spec = Object.assign({}, specOf(t), {});
    }
    if (t && t.id === 'block') s.pose = 'block';
    else if (this.crouching || (t && (t.id === 'crouch' || t.roll || (t.id === 'squatPunch')))) s.pose = this.state === 'tech' && t.move ? undefined : 'crouch';
    if (t && (t.air || this.air) && this.z > 1) { s.air = true; }
    if (t && t.flip && this.z > 1) { s.flip = clamp(this.flipU, .02, .98) * (t.flip < 0 ? 1 : 1); s.air = true; }
    if (t && t.roll) { s.flip = clamp((this.t - f[0]) / Math.max(1, f[1]), .02, .98); }
    if (this.state === 'down') { s.down = this.downW; }
    else if (this.downW > 0) s.down = this.downW;
    if (this.state === 'hurt' || this.hurtT > 0) s.hurt = true;
    if (this.posePose) s.pose = this.posePose;
    if (!t && !this.posePose && this.state === 'free' && !s.pose) s.stance = 'guard';
    if (this.expr) s.expr = this.expr;
    return s;
  }
  update(dt, foe) { this.rig.update(dt, this.riggedState(dt, foe)); if (this.hurtT > 0) this.hurtT--; }
  // serializable snapshot for netplay (positions in 0.1 units)
  snap() { return [this.id, Math.round(this.x * 10) / 10, Math.round(this.z * 10) / 10, this.face, this.state, this.tech ? this.tech.id : '', this.t, this.fr ? this.fr.join(',') : '', this.recoil, this.crouching ? 1 : 0, Math.round(this.downW * 100) / 100, this.posePose || '', this.kime]; }
  apply(s) {
    this.x = s[1]; this.z = s[2]; this.face = s[3]; this.state = s[4]; this.tech = s[5] ? KC.TECHS[s[5]] : null; this.t = s[6]; this.fr = s[7] ? s[7].split(',').map(Number) : null; this.recoil = s[8]; this.crouching = !!s[9]; this.downW = s[10]; this.posePose = s[11] || null; this.kime = s[12];
    this.air = this.z > 1; this.flipU = this.tech && this.tech.flip ? clamp((this.t - (this.fr ? this.fr[0] : 0)) / 78, 0, 1) : 0;
  }
  draw(r, o = {}) {
    r.shadow(this.x, 0, 9 * (1 - clamp(this.z / 120, 0, .5)), .5);
    r.actor(this.x, 0, this.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), o);
  }
}
KC.Karateka = Karateka;
KC.PUSH = PUSH;
