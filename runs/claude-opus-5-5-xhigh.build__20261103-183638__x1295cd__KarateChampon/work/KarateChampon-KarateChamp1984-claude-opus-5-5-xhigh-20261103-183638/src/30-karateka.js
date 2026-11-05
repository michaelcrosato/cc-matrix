/* =====================================================================================================================
 * KARATEKA: one fighter. A body on the mat (x, z feet; a push box w x h), a state machine stepped at 120 Hz, the technique
 * table's frame data, and the hit rules. Its rig is posed only from serializable state (KC.Karateka.pose), so a puppet fed
 * snapshots (online guests), a replay or the attract mode pose exactly as the host does.
 * States: idle walk crouch (free) | tech (any technique, evasion or block) | land | hurt | down | rise | script (the bout
 * drives it: walk to a mark, bow, yoi, win, lose, seiza).
 * ===================================================================================================================== */
const ST_CODES = ['idle', 'walk', 'crouch', 'tech', 'land', 'hurt', 'down', 'rise', 'script'];
const TECH_IDS = KC.DATA.techniques.map(t => t.id);
const POSES = [null, 'bow', 'yoi', 'kamae', 'win', 'lose', 'seiza', 'kneel', 'cheer', 'hips', 'cross', 'wave', 'point', 'chop', 'breathe', 'nod', 'trampled', 'dizzy'];
KC.Karateka = class {
  /** new KC.Karateka({ fid, side: 0 (white, left) | 1 (red, right), x, rank, classic, bus }) */
  constructor(o) {
    this.fid = o.fid; this.F = KC.FIGHTER[o.fid] || KC.FIGHTER.taro; this.side = o.side || 0; this.bus = o.bus || null;
    const size = this.F.rig.size || 2.15;
    this.size = size; this.w = Math.round(8 * size); this.h = Math.round(30 * size);
    this.x = o.x !== undefined ? o.x : KC.ARENA.marks[this.side]; this.z = 0; this.vx = 0; this.vz = 0;
    this.face = this.side === 0 ? 1 : -1; this.x0 = KC.ARENA.x0; this.x1 = KC.ARENA.x1;
    this.st = 'idle'; this.k = 0; this.tech = null; this.fr = [0, 0, 0]; this.extra = 0; this.resolved = false; this.blockedBy = false; this.hold = false;
    this.buf = null; this.bufAge = 0; this.lastP = 'n'; this.air = false; this.spose = null; this.walkTo = null; this.walkSpeed = 1; this.inv = 0;
    this.ctl = { posture: 'n', press: null, held: null }; this.ctlOn = false; this.react = null; this.reactT = 0; this.prevVz = 0;
    this.rank = o.rank || this.F.rank;
    this.rig = KC.makeRig(this.fid, this.side === 0 ? 'white' : 'red', this.rank, { classic: o.classic });
    this.faceAng = this.face > 0 ? 0 : PI; this.stats = { full: 0, half: 0, blocks: 0, attempts: 0, best: null, bestPts: 0, used: {} };
    this.lastInputs = [];   // the input display: the last few technique presses
  }
  get T() { return this.tech ? KC.TECH[this.tech] : null; }
  get free() { return this.st === 'idle' || this.st === 'walk' || this.st === 'crouch'; }
  get airborne() { return this.z > .01 || this.air; }
  /** the gap between the push boxes' edges */
  gapTo(foe) { return Math.abs(foe.x - this.x) - (this.w + foe.w) / 2; }
  /** where the technique is: 'wind' (startup), 'active', 'recover', or null */
  get phase() { if (this.st !== 'tech') return null; const [S, A] = this.fr; return this.k < S ? 'wind' : this.k < S + A ? 'active' : 'recover'; }
  /** the scaled steps of a technique for this fighter now: [startup, active, recovery] */
  frames(t) {
    const spd = (t.scoring ? this.F.stats.speed : 1) * KC.TUNE.techSpeed, s = n => Math.max(1, Math.round(n * F2S / spd));
    if (t.id === 'block') return [s(t.f[0]), Math.round(KC.TUNE.blockWindow * F2S), s(t.f[2])];
    if (t.id === 'jump') return [s(t.f[0]), 0, s(t.f[2])];
    return [s(t.f[0]), t.f[1] ? s(t.f[1]) : 0, s(t.f[2])];
  }
  /** the start-gap band in which technique t connects (its table reach, by the fighter's reach and the tuning) */
  band(t) { const s = this.F.stats.reach * KC.TUNE.reachScale; return [t.reach[0] * s, t.reach[1] * s]; }
  // how far a technique carries the body toward the foe (a lunge's step, a jump kick's flight)
  travel(t) { return t.air ? t.air.travel : t.flip ? t.flip.travel : t.travel || 0; }
  /** the gap band at the moment of contact (the start band less the distance the technique travels) */
  contactBand(t) {
    const s = this.F.stats.reach * KC.TUNE.reachScale;
    let tr = Math.max(0, this.travel(t));
    if (t.air) { const airSteps = 2 * KC.TUNE.jump / KC.TUNE.gravity / STEP, f = this.frames(t); tr *= Math.min(1, (f[0] + f[1]) / airSteps); }   // a jump kick's flight: what it has flown by the end of its strike
    return [Math.max(0, t.reach[0] * s - tr), Math.max(4, t.reach[1] * s - tr)];
  }
  /** the body's profile now, for the height rules: stand, crouch, roll, air, flip, or null (can't be hit) */
  profile() {
    if (this.st === 'down' || this.st === 'rise' || this.st === 'script' || this.inv > 0) return null;
    if (this.st === 'crouch') return 'crouch';
    if (this.st === 'tech') {
      const t = this.T;
      if (t.prof === 'flip') return this.airborne ? 'flip' : 'stand';
      if (t.prof === 'roll') return this.phase === 'active' ? 'roll' : 'crouch';
      if (t.prof === 'crouch' || t.id === 'crouch') return 'crouch';
      if (t.prof === 'air') return this.airborne ? 'air' : 'stand';
    }
    return this.airborne ? 'air' : 'stand';
  }
  /** can a technique of this height land on this body now */
  static heightOK(height, prof, def) {
    if (!prof) return false;
    if (height === 'air') return prof !== 'roll';
    if (height === 'high') return prof === 'stand' || prof === 'air' || prof === 'flip';
    if (height === 'mid') return prof === 'stand' || prof === 'air';
    if (height === 'midlow') return prof === 'stand' || prof === 'crouch' || prof === 'roll';
    if (height === 'low') return prof === 'stand' || prof === 'crouch' || prof === 'roll';
    if (height === 'rising') return prof === 'stand' || ((prof === 'air' || prof === 'flip') && def.vz > 0);
    return false;
  }
  // the effective height of a technique (jump kicks come down from above: they hit crouchers too)
  static heightOf(t) { return t.prof === 'air' && t.scoring ? 'air' : t.height; }
  /** is the fighter in a technique's frames (a hit on it now is a counter: x2) */
  get countering() { return this.st === 'tech' && this.T.scoring; }
  emit(k, d) { if (this.bus) this.bus.emit(k, Object.assign({ f: this }, d)); }

  /* ---- starting things ---- */
  /** start technique id now (close substitutions by the gap to foe); returns the id it started */
  startTech(id, foe, keepK) {
    let t = KC.TECH[id]; if (!t) return null;
    for (let n = 0; n < 3 && t.close && foe && this.gapTo(foe) < t.close.gap * KC.TUNE.reachScale; n++) t = KC.TECH[t.close.id];
    if (foe && foe.x !== this.x && !keepK) this.face = foe.x > this.x ? 1 : -1;
    this.st = 'tech'; this.tech = t.id; this.fr = this.frames(t); this.extra = 0; this.resolved = false; this.blockedBy = false; this.hold = false;
    if (!keepK) this.k = 0;
    this.vx = 0;
    if (t.air && !this.airborne) this._launch(KC.TUNE.jump, t.air.travel);   // a jump kick leaves the ground at once
    this.stats.used[t.id] = (this.stats.used[t.id] || 0) + 1;
    if (t.scoring && foe && this.gapTo(foe) <= this.band(t)[1] + 6) this.stats.attempts++;
    this.emit('start', { tech: t.id });
    return t.id;
  }
  _launch(vz, travel) {
    const g = KC.TUNE.gravity, airT = 2 * vz / g;
    this.vz = vz; this.vx = this.face * travel / airT; this.air = true; this.z = Math.max(this.z, .01);
  }
  /** the control intent for this step (a human's KC.Reader or a CPU's), in screen directions */
  control(c) { this.ctl = c || { posture: 'n', press: null, held: null }; }

  /* ---- one step ---- */
  update(dt, foe) {
    const T = KC.TUNE, c = this.ctlOn ? this.ctl : { posture: 'n', press: null, held: null };
    const P = KC.relDir(c.posture, this.face);
    if (this.inv > 0) this.inv -= dt;
    // a technique press while busy is kept for 0.15 s and fires on the first free step
    if (c.press) { this.buf = c.press; this.bufAge = 0; this.lastInputs.push([P, KC.relDir(c.press, this.face)]); if (this.lastInputs.length > 12) this.lastInputs.shift(); }
    else if (this.buf && ++this.bufAge > 18) this.buf = null;
    this.k++;
    if (this.st === 'script') this._script(dt, foe);
    else if (this.st === 'down' || this.st === 'rise' || this.st === 'hurt') this._react(dt);
    else if (this.free) {
      if (foe && foe.x !== this.x && !this.airborne) this.face = foe.x > this.x ? 1 : -1;   // (it faces the foe whenever free on the ground)
      const Pn = KC.relDir(c.posture, this.face);
      if (this.ctlOn && this.buf) { const td = KC.relDir(this.buf, this.face), id = KC.MATRIX[Pn][td]; this.buf = null; if (id === 'crouch') { this._setFree('crouch'); } else this.startTech(id, foe); }
      else if (this.ctlOn && Pn === 'u') this.startTech('jump', foe);
      else if (this.ctlOn && Pn === 'd') this._setFree('crouch');
      else if (this.ctlOn && (Pn === 'f' || Pn === 'b')) { this._setFree('walk'); this.vx = this.face * (Pn === 'f' ? 1 : -.78) * T.walk * this.F.stats.walk; }
      else { this._setFree('idle'); this.vx = 0; }
      if (this.st === 'crouch') this.vx = 0;
    } else if (this.st === 'tech') this._techStep(dt, foe, Pn => Pn, P);
    else if (this.st === 'land') { this.vx = 0; if (this.k >= (this.landK || 10)) this._setFree('idle'); }
    this._physics(dt);
  }
  // reactions: a stagger (hurt) or lying down, held while the referee stops the fight (stay), then up again
  _react(dt) {
    if (!this.airborne) this.vx = approach(this.vx, 0, (this.st === 'down' ? 300 : 500) * dt);
    if (this.st === 'hurt' && !this.stay && this.k >= 60) { this.st = this.scripted ? 'script' : 'idle'; this.k = 0; }
    else if (this.st === 'down' && !this.stay && this.k >= 70 && !this.airborne) { this.st = 'rise'; this.k = 0; }
    else if (this.st === 'rise' && this.k >= 40) { this.st = this.scripted ? 'script' : 'idle'; this.k = 0; this.inv = .2; }
  }
  _setFree(st) { if (this.st !== st) { this.st = st; this.k = 0; } if (st !== 'tech') { this.tech = null; } }
  _techStep(dt, foe, _f, P) {
    const t = this.T, [S, A, R] = this.fr, total = S + A + R + this.extra;
    // the late posture upgrade: a standing technique's posture changed within 8 steps: its variant takes over
    if (this.ctlOn && this.k <= 8 && t.input[0] === 'n' && P !== 'n' && t.scoring) {
      const td = t.input[1] === 'f' && t.id === 'revPunch' ? 'f' : t.input[1], alt = KC.MATRIX[P] && KC.MATRIX[P][td];
      if (alt && alt !== t.id && alt !== 'crouch') { const k = this.k; this.startTech(alt, foe, true); this.k = k; return this._techStep(dt, foe, _f, P); }
    }
    if (t.id === 'jump' && this.k < S && this.ctlOn && this.buf) {   // the pre-jump crouch: a technique now is its jumping variant
      const id = KC.MATRIX.u[KC.relDir(this.buf, this.face)]; this.buf = null;
      if (id && id !== 'jump') { this.startTech(id, foe); return; }
    }
    if (t.id === 'jump' && this.k === S) this._launch(KC.TUNE.jump, 0);
    if (t.flip && this.k === S) this._launch(t.flip.vz, t.flip.travel);
    if (this.k === S && A > 0) this.emit('active', { tech: t.id });
    // ground travel: lunges step in over the startup and the strike; the roll slides back over its active frames
    const tr = t.travel || 0;
    if (!this.airborne && tr && !this.blockedBy) {
      if (t.prof === 'roll') this.vx = this.k >= S && this.k < S + A ? this.face * tr / (A * STEP) : 0;
      else this.vx = this.k < S + A ? this.face * tr / ((S + A) * STEP) : 0;
    } else if (!this.airborne) this.vx = this.blockedBy ? this.vx : 0;
    if (this.hold && this.k >= S + A + Math.round(R * .35)) this.k = S + A + Math.round(R * .35);   // the kime: held while the referee stops the fight
    if (t.hold && this.k >= S) this.k = S;   // a held crouch
    if (this.blockedBy && !this.airborne) this.vx = approach(this.vx, 0, 900 * dt);
    if (this.k >= total && !this.airborne && !t.hold) { this._setFree('idle'); this.vx = 0; }
  }
  _physics(dt) {
    const g = KC.TUNE.gravity;
    this.prevVz = this.vz;
    if (this.airborne) {
      this.vz -= g * dt; this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0; this.vz = 0; this.air = false; this.vx = 0;
        const t = this.T;
        if (this.st === 'tech' && (t.id === 'jump' || t.flip)) { this.landK = t.flip ? 24 : 10; this.st = 'land'; this.k = 0; this.tech = null; this.emit('land', {}); }
        else if (this.st === 'tech' && t.air) { const [S, A, R] = this.fr; this.k = Math.max(this.k, S + A + Math.max(0, R - 12)); this.emit('land', {}); }
        else if (this.st === 'hurt' || this.st === 'down') this.emit('land', { heavy: true });
      }
    }
    this.x += this.vx * dt;
    const h = this.w / 2;
    if (this.x - h < this.x0) { this.x = this.x0 + h; if (this.vx < 0 && !this.airborne) this.vx = 0; }
    if (this.x + h > this.x1) { this.x = this.x1 - h; if (this.vx > 0 && !this.airborne) this.vx = 0; }
  }
  /* ---- scripted (the bout drives it: walk to a mark, poses) ---- */
  script(pose, walkTo, speed = 1) {
    this.scripted = true; this.stay = false; this.spose = pose || null; this.walkTo = walkTo === undefined ? null : walkTo; this.walkSpeed = speed; this.ctlOn = false; this.hold = false; this.buf = null;
    if (this.st === 'down') { this.st = 'rise'; this.k = 0; }
    else if (this.st !== 'rise' && this.st !== 'script') { this.st = 'script'; this.k = 0; this.tech = null; this.vx = 0; }
  }
  _script(dt, foe) {
    if (this.walkTo !== null) {
      const d = this.walkTo - this.x, sp = 72 * this.walkSpeed;
      if (Math.abs(d) < 1.5) { this.x = this.walkTo; this.walkTo = null; this.vx = 0; }
      else this.vx = Math.sign(d) * sp;
    } else this.vx = 0;
    if (this.walkTo === null && foe && foe.x !== this.x && this.spose !== 'win' && this.spose !== 'lose') this.face = foe.x > this.x ? 1 : -1;
    if (this.airborne) this.vx = 0;
  }
  /** release to play: free, standing, facing the foe */
  release(foe) { this.scripted = false; this.stay = false; this.st = 'idle'; this.k = 0; this.tech = null; this.spose = null; this.walkTo = null; this.vx = 0; this.vz = 0; this.z = 0; this.air = false; this.hold = false; this.buf = null; if (foe) this.face = foe.x > this.x ? 1 : -1; }
  /** a reaction to a scoring hit: 'hurt' (half) or 'down' (full, or any sweep), pushed away from the attacker */
  hit(kind, fromX) {
    const dir = this.x >= fromX ? 1 : -1;
    this.st = kind === 'down' ? 'down' : 'hurt'; this.k = 0; this.tech = null; this.hold = false; this.buf = null; this.stay = true;
    this.vx = dir * (kind === 'down' ? 120 : 80); if (this.airborne) { this.vz = Math.max(this.vz, 60); }
  }
  /* ---- the strike: during the active frames, does it connect with foe ---- */
  strike(foe) {
    if (this.st !== 'tech' || this.resolved || this.phase !== 'active') return null;
    const t = this.T; if (!t.scoring) return null;
    const dir = foe.x > this.x ? 1 : foe.x < this.x ? -1 : this.face;
    if (dir !== this.face) return null;   // (the foe flipped over it: the strike goes the wrong way)
    const prof = foe.profile(), H = KC.Karateka.heightOf(t);
    if (!KC.Karateka.heightOK(H, prof, foe)) return null;
    const gap = this.gapTo(foe), [lo, hi] = this.contactBand(t);
    if (gap > hi || gap < lo - 10) return null;
    const [S, A] = this.fr, u = (this.k - S) / Math.max(1, A);
    const timingQ = u <= .4 ? 1 : lerp(1, .3, (u - .4) / .6);
    const top = lo + (hi - lo) * .7, spacingQ = gap >= top ? 1 : clamp((gap - lo) / Math.max(1, top - lo), 0, 1);
    return { tech: t.id, gap, timingQ, spacingQ, prof, height: H };
  }
  /** blocks technique t now (its guard frames, facing the attacker, high or mid) */
  blocks(att) {
    if (this.st !== 'tech' || this.tech !== 'block' || this.phase !== 'active') return false;
    const t = att.T; if (!t || t.unblockable) return false;
    return (att.x > this.x ? 1 : -1) === this.face;
  }
  /** a strike was blocked: the attacker recoils (pushed back, 10 more frames of recovery: open to a counter) */
  recoil() { this.resolved = true; this.blockedBy = true; this.extra += 20; if (!this.airborne) this.vx = -this.face * 159; }
  /** the guard did its job: the block ends early (free 6 frames sooner) */
  guarded(att) { const [S, A, R] = this.fr; this.k = S + A; this.fr = [S, A, Math.max(0, R - 12)]; this.blockHi = KC.Karateka.heightOf(att.T) !== 'mid' && KC.Karateka.heightOf(att.T) !== 'midlow'; this.stats.blocks++; }

  /* ---- snapshots (online): the serializable state, compact ---- */
  snap() { return [Math.round(this.x * 10) / 10, Math.round(this.z * 10) / 10, this.face, ST_CODES.indexOf(this.st), this.tech ? TECH_IDS.indexOf(this.tech) : -1, this.k, POSES.indexOf(this.spose), (this.air ? 1 : 0) | (this.hold ? 2 : 0) | (this.blockHi ? 4 : 0) | (this.ctlOn ? 8 : 0), this.fr[0], this.fr[1], this.fr[2] + this.extra, Math.round(this.vx), Math.round(this.vz)]; }
  applySnap(s) {
    this.x = s[0]; this.z = s[1]; this.face = s[2]; this.st = ST_CODES[s[3]] || 'idle'; this.tech = s[4] >= 0 ? TECH_IDS[s[4]] : null; this.k = s[5]; this.spose = POSES[s[6]] || null;
    this.air = !!(s[7] & 1); this.hold = !!(s[7] & 2); this.blockHi = !!(s[7] & 4); this.ctlOn = !!(s[7] & 8); this.fr = [s[8], s[9], s[10]]; this.extra = 0; this.vx = s[11] || 0; this.vz = s[12] || 0;
  }

  /* ---- posing the rig from the state above (and only from it) ---- */
  pose(dt) {
    const t = this.T, rig = this.rig, base = this.face > 0 ? 0 : PI;
    let spin = 0, attack = null, pose = null, flip = 0, air = false, expr = null, stance = null, hurt = false, down;
    const want = { kamae: 0, bow: 0, yoi: 0, seiza: 0, blockHi: 0, blockMid: 0, cross: 0, point: 0, nod: 0 };
    if (this.st === 'land') { pose = 'crouch'; stance = 'guard'; }
    else if (this.st === 'tech' && t) {
      const [S, A, R0] = this.fr, R = R0 + this.extra, k = this.k;
      const phase = k < S ? 'wind' : k < S + A ? 'active' : 'recover', u = phase === 'wind' ? k / Math.max(1, S) : phase === 'active' ? (k - S) / Math.max(1, A) : (k - S - A) / Math.max(1, R);
      if (t.move) attack = { spec: t.move, phase, u: clamp(u, 0, 1) };
      if (t.spin === .5) spin = phase === 'wind' ? PI * KC.ease.inOut(u) : phase === 'active' ? PI : PI + PI * KC.ease.inOut(clamp((u - .35) / .65, 0, 1));
      else if (t.spin === 1) spin = phase === 'wind' ? TAU * .78 * KC.ease.inOut(u) : phase === 'active' ? TAU * (.78 + .22 * u) : 0;
      if (t.id === 'block') { if (this.blockHi) want.blockHi = 1; else want.blockMid = 1; }
      if (t.prof === 'crouch' || t.id === 'crouch') pose = 'crouch';
      if (t.flip) { if (this.airborne) { const airSteps = 2 * t.flip.vz / KC.TUNE.gravity / STEP, ft = clamp((k - S) / airSteps, 0, 1); flip = t.flip.travel > 0 ? clamp(ft, .02, .98) : clamp(1 - ft, .02, .98); } else if (k < S) pose = 'crouch'; }
      if (t.prof === 'roll' && phase === 'active') flip = clamp(1 - u, .02, .98);
      if (t.prof === 'roll' && phase !== 'active') pose = 'crouch';
      if (t.id === 'jump' && k < S) pose = 'crouch';
      air = this.airborne && !t.flip;
      expr = phase === 'wind' ? 'angry' : 'shout';
      if (!t.scoring && t.id !== 'block') expr = null;
      stance = 'guard';
    } else if (this.st === 'hurt') { hurt = true; expr = 'wince'; }
    else if (this.st === 'down') { down = 1; expr = 'wince'; }
    else if (this.st === 'rise') { pose = this.k < 24 ? 'kneel' : 'crouch'; expr = 'wince'; }
    else if (this.st === 'crouch') { pose = 'crouch'; stance = 'guard'; }
    else if (this.st === 'land') { pose = 'crouch'; stance = 'guard'; }
    else if (this.st === 'script') {
      const p = this.spose;
      if (p === 'bow') want.bow = 1; else if (p === 'yoi') want.yoi = 1; else if (p === 'seiza') want.seiza = 1; else if (p === 'cross') want.cross = 1; else if (p === 'point') want.point = 1; else if (p === 'nod') want.nod = 1;
      else if (p === 'win') { pose = 'cheer'; expr = 'shout'; } else if (p === 'lose') { pose = 'kneel'; expr = 'wince'; } else if (p === 'kneel') pose = 'kneel';
      else if (p === 'cheer') { pose = 'cheer'; expr = 'smile'; } else if (p === 'hips') pose = 'hips'; else if (p === 'wave') pose = 'wave';
      else if (p === 'kamae' || p === null) stance = 'guard';
      else if (p === 'breathe') { want.yoi = 1; expr = 'angry'; }
      else if (p === 'trampled') { down = 1; expr = 'wince'; }
      else if (p === 'dizzy') { hurt = true; expr = 'wince'; }
      if (p === 'chop') attack = this.chop || null;
      if (this.walkTo !== null) stance = 'guard';
    } else { stance = 'guard'; }
    KC.poseStep(rig, dt, want);
    // the pivot: the facing turns over a few frames when it changes (a spin adds to it, toward the camera)
    const tgt = base;
    let dA = ((tgt - this.faceAng + PI * 3) % TAU) - PI; this.faceAng += clamp(dA, -dt * 26, dt * 26);
    if (Math.abs(dA) < 1e-3) this.faceAng = tgt;
    const facing = this.faceAng + spin * this.face;
    rig.update(dt, { x: this.x, y: 0, z: this.z, vx: this.st === 'walk' || (this.st === 'script' && this.walkTo !== null) ? this.vx : 0, vy: 0, facing, attack, pose, flip: flip || undefined, air, expr, stance, hurt, down });
  }
  /** draw it: the rig (with its beard), a flash on a fresh hit, an afterimage on somersaults */
  draw(r, o = {}) {
    const rig = this.rig, ghost = this.st === 'tech' && this.T && (this.T.flip || this.T.spin) && this.phase !== 'recover' ? { color: this.side ? '#ff8a7a' : '#e8f0ff', life: .16, alpha: .35, owner: this } : undefined;
    r.actor(this.x, o.y || 0, this.z, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); if (rig.kcBeard) KC.drawBeard(g, rig, r, rig.kcBeard, ox, oy); }, { flash: o.flash, flashMix: .7, ghost, key: this });
    if (!this.airborne) r.shadow(this.x, o.y || 0, this.w * .8, .35);
  }
};
