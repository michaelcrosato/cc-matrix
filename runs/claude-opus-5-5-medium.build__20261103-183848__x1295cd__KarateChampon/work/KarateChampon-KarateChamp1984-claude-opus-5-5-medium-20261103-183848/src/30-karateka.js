/* ---- KARATEKA: one fighter. Body, state machine, the twin-stick technique system, boxes, pose and draw ----
 * state st: idle walk crouch tech hurt down auto pose. A technique runs in 120 Hz steps through phases s (startup),
 * a (active), r (recovery); air techniques launch after a short prep and land into recovery. Everything that poses the
 * rig is serializable state (st, tech, k, face, x, z...), so online guests, replays and the attract mode pose the same. */
const GI = { white: { cloth: '#f2eee4', pants: '#f2eee4' }, red: { cloth: '#c8302a', pants: '#c8302a' } };
const CLASSIC = { white: { cloth: '#ffffff', pants: '#ffffff' }, red: { cloth: '#ff2020', pants: '#ff2020' } };
/** read a human intent from an input: posture (screen u d l r n; vertical wins) and the technique press edge */
KC.readIntent = I => {
  if (!I || KC.Dev.active) return KC.NEUTRAL;
  const up = I.down('up'), dn = I.down('down'), lf = I.down('left'), rt = I.down('right');
  const posture = up ? 'u' : dn ? 'd' : lf && !rt ? 'l' : rt && !lf ? 'r' : 'n';
  const press = I.pressed('tUp') ? 'u' : I.pressed('tDown') ? 'd' : I.pressed('tLeft') ? 'l' : I.pressed('tRight') ? 'r' : null;
  return { posture, press };
};
KC.NEUTRAL = { posture: 'n', press: null };
// rotate joints (local frame [f, r, z]) about a pivot in the f-z plane: + bends forward
const rotJ = (J, keys, pv, a) => { const c = Math.cos(a), s = Math.sin(a); for (const k of keys) { const p = J[k]; if (!p) continue; const df = p[0] - pv[0], dz = p[2] - pv[2]; p[0] = pv[0] + df * c + dz * s; p[2] = pv[2] - df * s + dz * c; } };
const UPPER = ['shC', 'shL', 'shR', 'head', 'elbowL', 'handL', 'elbowR', 'handR', 'bladeDir'];
const ALLJ = ['hipL', 'hipR', 'kneeL', 'footL', 'kneeR', 'footR', 'hipC', 'shC', 'shL', 'shR', 'head', 'elbowL', 'handL', 'elbowR', 'handR'];
const ST_CODES = ['idle', 'walk', 'crouch', 'tech', 'hurt', 'down', 'auto', 'pose'];
const TECH_IDS = KC.DATA.techniques.map(t => t.id);

class Karateka {
  constructor(id, side, o = {}) {
    const R = KC.ROSTER[id]; this.id = id; this.R = R; this.side = side; this.name = o.name || R.name;
    this.x = o.x === undefined ? (side ? 250 : 150) : o.x; this.z = 0; this.vx = 0; this.vz = 0; this.face = side ? -1 : 1; this.ang = side ? Math.PI : 0;
    this.st = 'idle'; this.tech = null; this.k = 0; this.ph = ''; this.air = false; this.launched = false; this.hitDone = false; this.extraR = 0; this.blocked = false;
    this.posture = 'n'; this.buf = null; this.t = 0; this.stT = 0; this.poseName = null; this.frozen = false; this.kime = false; this.downW = 0; this.hurtT = 0;
    this.autoX = null; this.pivotT = 0; this.belt = o.belt || R.belt; this.size = R.rig.size; this.w = 8 * this.size; this.lastTech = null; this.history = []; this.flipU = 0;
    this.stats = { full: 0, half: 0, blocks: 0, best: null, bestPts: 0, attempts: 0, thrown: {} };
    this.buildRig(o.palette);
  }
  buildRig(palette) {
    const R = this.R, sideC = (palette === 'Classic' ? CLASSIC : GI)[this.side ? 'red' : 'white'], skin = R.rig.colors.skin;
    const colors = Object.assign({ trim: '#d8d0c0', eye: '#2a1a14' }, R.rig.colors, sideC, { boot: skin, glove: skin, belt: BELT[this.belt] || BELT.white });
    this.rig = new E.Humanoid(Object.assign({ weapon: null, outfit: 'shirt', sleeves: 'short' }, R.rig, { colors, speedRef: 50 }));
    const base = this.rig.solvePose, self = this;
    this.rig.solvePose = function () { base.call(this); self._post(this); };
    this.rig.update(1 / 120, this.rigState());
  }
  setBelt(b) { this.belt = b; this.rig.C.belt = BELT[b] || BELT.white; }
  get T() { return this.tech ? KC.TECH[this.tech] : null; }
  spd() { return (this.R.stats.speed || 1) * TUNE.techSpeed; }
  steps(i, t = this.T) { return Math.max(1, Math.round(U.steps(i === 1 && t.kind === 'block' ? TUNE.blockWindow : t.f[i]) / this.spd())); }
  get S() { return this.steps(0); } get A() { return this.steps(1); } get Rr() { return this.steps(2) + this.extraR; }
  free() { return !this.frozen && (this.st === 'idle' || this.st === 'walk' || this.st === 'crouch'); }
  grounded() { return this.z <= .01 && !this.air; }
  isAir() { return this.z > 3 || (this.air && this.launched); }
  isLow() { const t = this.T; return this.st === 'crouch' || (this.st === 'tech' && t && (t.L === 'd' || t.id === 'frontSweep' || t.id === 'backSweep' || t.kind === 'roll' || t.kind === 'crouch' || (t.kind === 'flip' && !this.launched) || (t.kind === 'jump' && !this.launched))); }
  inTech() { return this.st === 'tech' && this.T && (this.T.pts || this.T.kind === 'block' || this.T.kind === 'flip'); }
  hittable() { return !['down', 'auto', 'pose'].includes(this.st) && !this.invuln; }
  gapTo(o) { return Math.abs(o.x - this.x) - (this.w + o.w) / 2; }
  reach(t = this.T) { const k = (this.R.stats.reach || 1) * TUNE.reachScale; return [t.reach[0] * k, t.reach[1] * k]; }

  /** start a technique (by id) toward the foe; k: steps already elapsed (the posture upgrade keeps them) */
  start(id, foe, k = 0) {
    let t = KC.TECH[id]; if (!t) return false; this.reqTech = id;
    if (foe && t.closeAlt) { const g = this.gapTo(foe); if (g < t.closeGap) { t = KC.TECH[t.closeAlt]; if (t.closeAlt && g < t.closeGap) t = KC.TECH[t.closeAlt]; } }
    if (t.kind === 'crouch') { this.st = 'crouch'; return true; }
    this.st = 'tech'; this.tech = t.id; this.k = k; this.ph = 's'; this.hitDone = false; this.extraR = 0; this.launched = false; this.blocked = false; this.flipU = 0; this.blockH = null;
    this.techFace = this.face; this.startX = this.x; this.vx = 0; this.lastTech = t.id; this.history.push(t.id); if (this.history.length > 40) this.history.shift();
    this.stats.thrown[t.id] = (this.stats.thrown[t.id] || 0) + 1;
    if (t.pts && foe && this.gapTo(foe) <= this.reach(t)[1] + (t.travel || 0) + 30) this.stats.attempts++;
    if (this.onStart) this.onStart(this, t);
    return true;
  }
  /** one step of control: intent { posture, press } in screen directions, against foe */
  control(intent, foe, dt) {
    const toward = foe ? Math.sign(foe.x - this.x) || this.face : this.face;
    const rel = d => d === 'l' || d === 'r' ? ((d === 'r') === (toward > 0) ? 't' : 'a') : d;
    const P = rel(intent.posture), R = rel(intent.press); this.posture = P;
    if (R) this.buf = { R, P, t: .15 };
    else if (this.buf) { this.buf.t -= dt; if (this.buf.t <= 0) this.buf = null; }
    if (this.frozen) return;
    // the posture upgrade: a standing technique started with L neutral swaps to the posture's variant within 4 frames
    if (this.st === 'tech' && this.T && this.k <= 8 && this.upgradeR && P !== 'n' && this.T.L === 'n') {
      const id = KC.MATRIX[P][this.upgradeR]; if (id && id !== this.tech && KC.TECH[id].kind !== 'crouch') { const k = this.k; this.upgradeR = null; this.start(id, foe, Math.min(k, 6)); return; }
    }
    // a plain jump still on the ground takes a technique press: it becomes that air move
    if (this.st === 'tech' && this.tech === 'jump' && !this.launched && this.buf) { const id = KC.MATRIX.u[this.buf.R]; if (id !== 'jump') { this.buf = null; this.start(id, foe, 0); return; } }
    if (!this.free()) return;
    if (this.buf) { const bp = P === 'n' ? this.buf.P : P, id = KC.MATRIX[bp][this.buf.R]; this.upgradeR = bp === 'n' ? this.buf.R : null; this.buf = null; if (id === 'crouch') { this.st = 'crouch'; return; } this.start(id, foe); return; }
    if (P === 'u') { this.upgradeR = null; this.start('jump', foe); return; }
    if (P === 'd') { this.st = 'crouch'; this.vx = 0; return; }
    if (P === 't' || P === 'a') { this.st = 'walk'; this.vx = toward * (P === 't' ? 1 : -.78) * TUNE.walk * (this.R.stats.walk || 1); return; }
    this.st = 'idle'; this.vx = 0;
  }
  /** physics and the technique clock, one step */
  step(dt, foe, arena) {
    this.t += dt; this.stT += dt; if (this.hurtT > 0) this.hurtT -= dt;
    if (this.frozen && !this.kime && this.st !== 'down' && this.st !== 'hurt') { this.vx = 0; }
    const t = this.T;
    if (this.st === 'tech' && t && !this.frozen) {
      this.k++; const S = this.S, A = this.A;
      if (t.air) {
        const prep = t.kind === 'jump' || t.kind === 'flip' ? S : Math.min(S, U.steps(4));
        if (!this.launched && this.k >= prep) { this.launched = true; this.air = true; this.vz = t.kind === 'jump' ? TUNE.jump : t.air.vz * TUNE.jump / 360; this.vx = (t.air.vx || 0) * this.techFace; game.audio.sfx('whooshL', { vol: .5 }); }
        if (this.launched && this.air) { this.ph = t.kind ? 'a' : this.k < S ? 's' : this.k < S + A ? 'a' : 'r'; if (t.kind === 'flip') this.flipU = clamp(this.flipU + dt / .68, 0, .999); }
        else if (!this.launched) this.ph = 's';
        else { this.ph = 'r'; if (this.k >= this.landK + this.steps(2) * (t.pts ? .3 : 1) + this.extraR) this.endTech(foe); }
      } else if (t.kind === 'block') {
        this.ph = this.k < S ? 's' : this.k < S + A ? 'a' : 'r'; if (this.k >= S + A + this.Rr) this.endTech(foe);
      } else {
        const tot = S + A, trav = t.travel || 0;
        if (this.k <= tot && trav) { const d = trav / tot * this.techFace; this.x += d; }
        this.ph = this.k < S ? 's' : this.k < tot ? 'a' : 'r';
        if (this.kime && this.ph === 'r') this.k = Math.min(this.k, tot + 2);
        if (this.k >= tot + this.Rr && !this.kime) this.endTech(foe);
      }
      if (this.ph === 'a' && this.k === S && t.pts) { KC.Voice.kiai(this.id, t.kiai === 'heavy'); game.audio.sfx(t.kiai === 'heavy' ? 'whooshH' : 'whooshL'); }
    }
    // body motion
    if (this.air || this.z > 0) {
      this.vz -= TUNE.gravity * dt; this.z += this.vz * dt; this.x += this.vx * dt;
      if (this.z <= 0 && this.vz < 0) { this.z = 0; this.vz = 0; this.air = false; this.landK = this.k; this.vx = 0; this.rig.land(.4); game.audio.sfx('land'); if (this.st !== 'tech') this.st = 'idle'; if (this.onLand) this.onLand(this); }
    } else if (this.st === 'walk' || this.st === 'auto' || this.st === 'hurt' || this.st === 'down') {
      if (this.st === 'auto' && this.autoX !== null) { const d = this.autoX - this.x, sp = TUNE.walk * 2 * dt; if (Math.abs(d) <= sp) { this.x = this.autoX; this.autoX = null; this.st = 'idle'; this.vx = 0; } else { this.vx = Math.sign(d) * TUNE.walk * 2; this.x += this.vx * dt; } }
      else if (this.st === 'walk' && !this.frozen) this.x += this.vx * dt;
      else if ((this.st === 'hurt' || this.st === 'down') && this.slide) { const s = this.slide * Math.min(1, dt * 8); this.x += s; this.slide -= s; }
    }
    if (arena) this.x = clamp(this.x, arena[0] + this.w / 2, arena[1] - this.w / 2);
    // facing: free and grounded fighters turn to the foe (a short pivot)
    if (foe && this.grounded() && (this.free() || this.st === 'auto' && this.autoX === null)) { const want = Math.sign(foe.x - this.x) || this.face; if (want !== this.face) { this.face = want; this.pivotT = U.steps(6) / 120; game.audio.sfx('pivot'); } }
    if (this.pivotT > 0) this.pivotT = Math.max(0, this.pivotT - dt);
  }
  endTech(foe) { this.st = this.posture === 'd' ? 'crouch' : 'idle'; this.tech = null; this.ph = ''; this.k = 0; this.extraR = 0; this.launched = false; this.flipU = 0; this.kime = false; if (foe) { const want = Math.sign(foe.x - this.x) || this.face; if (want !== this.face) { this.face = want; this.pivotT = U.steps(6) / 120; } } }
  // reactions (the bout calls these)
  hurt(dir, full, sweep) { this.st = full || sweep ? 'down' : 'hurt'; this.tech = null; this.ph = ''; this.air = false; this.z = Math.max(0, this.z); this.vz = 0; this.vx = 0; this.slide = dir * (full || sweep ? 18 : 10); this.stT = 0; this.hurtT = .3; this.kime = false; }
  toMark(x) { this.st = 'auto'; this.autoX = x; this.tech = null; this.ph = ''; this.frozen = false; this.kime = false; this.z = 0; this.vz = 0; this.air = false; this.poseName = null; }
  setPose(p) { this.st = 'pose'; this.poseName = p; this.tech = null; this.ph = ''; this.vx = 0; this.stT = 0; }
  reset(x) { Object.assign(this, { x, z: 0, vx: 0, vz: 0, st: 'idle', tech: null, ph: '', k: 0, air: false, launched: false, frozen: false, kime: false, buf: null, poseName: null, slide: 0, autoX: null, flipU: 0, extraR: 0 }); }

  /** the rig's input, from serializable state only */
  rigState() {
    const t = this.T, base = this.face > 0 ? 0 : Math.PI, s = { x: this.x, y: 0, z: this.z, vx: this.st === 'walk' || this.st === 'auto' ? this.vx : 0, vy: 0, facing: base, stance: 'guard' };
    if (this.pivotT > 0) s.facing = base + (this.face > 0 ? -1 : 1) * Math.PI * (this.pivotT / (U.steps(6) / 120));
    if (this.st === 'crouch') s.pose = 'crouch';
    if (this.st === 'hurt') { s.hurt = true; s.expr = 'wince'; }
    if (this.st === 'down') { s.down = 1; s.expr = 'wince'; }
    if (this.st === 'pose') { const p = this.poseName; if (p === 'win') { s.pose = 'cheer'; s.expr = 'shout'; } else if (p === 'lose' || p === 'seiza' || p === 'kneel') s.pose = 'kneel'; else if (p === 'wave' || p === 'hips' || p === 'cheer') s.pose = p; else if (p === 'down') s.down = 1; }
    if (this.st === 'tech' && t) {
      const S = this.S, A = this.A, k = this.k;
      if (t.move) {
        let phase, u;
        if (t.air) { phase = !this.launched ? 'wind' : k < S ? 'wind' : k < S + A ? 'active' : 'recover'; u = phase === 'wind' ? clamp(k / S, 0, 1) : phase === 'active' ? clamp((k - S) / A, 0, 1) : this.air ? 0 : clamp((k - this.landK) / 12, 0, 1); s.air = this.air; }
        else { phase = k < S ? 'wind' : k < S + A ? 'active' : 'recover'; u = phase === 'wind' ? k / S : phase === 'active' ? (k - S) / A : this.kime ? 0 : clamp((k - S - A) / Math.max(1, this.Rr), 0, 1); }
        const spec = t.spin === .5 ? Object.assign({}, t.move, { a0: Math.PI + (t.move.a0 || 0), a1: Math.PI + (t.move.a1 || 0) }) : t.move;
        s.attack = { spec, phase, u };
        if (t.spin) { const turnSteps = t.spin === 1 ? S + A * .5 : S; s.facing = base + (this.techFace > 0 ? 1 : -1) * Math.PI * 2 * t.spin * U.ease(clamp(k / turnSteps, 0, 1)); if (t.spin === .5 && this.ph === 'r') s.facing = base + Math.PI * (1 - U.ease(clamp((k - S - A) / Math.max(1, this.Rr), 0, 1))); }
        if (t.L === 'd' && t.id !== 'upperPunch') s.pose = 'crouch';
        if (t.id === 'upperPunch' && phase === 'wind') s.pose = 'crouch';
        s.expr = phase === 'active' ? 'shout' : 'angry';
      } else if (t.kind === 'block') s.pose = 'guard';
      else if (t.kind === 'flip' || t.kind === 'jump') { s.air = this.air; if (!this.launched) s.pose = 'crouch'; }
      else if (t.kind === 'roll') { s.pose = 'crouch'; }
    }
    return s;
  }
  // rig post-processing: bows, blocks, flips and rolls rotate or place joints after the engine solves the pose
  _post(rig) {
    const J = rig.J, t = this.T;
    if (this.st === 'pose' && this.poseName === 'bow') rotJ(J, UPPER, J.hipC, .55 * clamp(this.stT / .3, 0, 1) * (this.stT < .7 ? 1 : clamp(1 - (this.stT - .7) / .25, 0, 1)));
    if (this.st === 'pose' && this.poseName === 'yoi') { J.handR[0] = 2.5; J.handR[2] = 13; J.handL[0] = 2.5; J.handL[2] = 13; J.handR[1] = 1.2; J.handL[1] = -1.2; J.elbowR[0] = 1; J.elbowL[0] = 1; }
    if (this.st === 'tech' && t && t.kind === 'block' && this.ph !== 'r') {
      const hi = this.blockH === 'high', sh = J.shR;
      if (hi) { J.elbowR = [sh[0] + 3, sh[1] - .5, sh[2] + 2]; J.handR = [sh[0] + 3.5, sh[1] - 4, sh[2] + 5]; }
      else { J.elbowR = [sh[0] + 3.5, sh[1], sh[2] - 3]; J.handR = [sh[0] + 5, sh[1] - 4.5, sh[2] - 2]; }
    }
    if (this.st === 'tech' && t && t.kind === 'flip' && this.launched && this.air) { const a = (t.air.vx > 0 ? 1 : -1) * Math.PI * 2 * this.flipU, pv = [J.hipC[0], 0, J.hipC[2] + 2]; rotJ(J, ALLJ, pv, a); }
    if (this.st === 'tech' && t && t.kind === 'roll') { const u = clamp((this.k - this.S) / this.A, 0, 1); if (u > 0 && u < 1) rotJ(J, ALLJ, [0, 0, 7], -Math.PI * 2 * u); }
    if (this.st === 'tech' && t && t.kind === 'jump' && this.launched) { for (const k of ['kneeL', 'kneeR']) { J[k][0] += 3; J[k][2] += 3; } for (const k of ['footL', 'footR']) { J[k][2] += 5; J[k][0] -= 1; } }
  }
  update(dt) { this.rig.update(dt, this.rigState()); }
  draw(r, o = {}) {
    const R = this.R, flash = this.hurtT > .2 ? '#ffffff' : null;
    r.shadow(this.x, 0, 10 * this.size / 2, .45);
    r.actor(this.x, 0, this.z, (g, ox, oy) => {
      this.rig.draw(g, ox, oy, r.view);
      if (R.rig.beard) { const h = this.rig.worldOffset(this.rig.J.head), a = r.w(this.x + h[0], h[1], this.z + h[2]), b = r.w(this.x, 0, this.z); const hx = Math.round(ox + a[0] - b[0]), hy = Math.round(oy + a[1] - b[1]); px.ell(g, hx + this.face * 2, hy + 7, 4, 4, R.rig.colors.beard || '#e8e8e0'); px.rect(g, hx + this.face * 2 - 2, hy + 9, 4, 4, E.shade(R.rig.colors.beard || '#e8e8e0', -.1)); }
    }, { flash, flashMix: .6, ghost: this.st === 'tech' && this.T && this.T.kind === 'flip' && this.air ? { color: this.side ? '#ff8070' : '#d0e0ff', life: .15, alpha: .35, owner: this } : undefined, key: this });
    if (this.st === 'tech' && this.ph === 'a' && this.T && this.T.pts) this.rig.drawSmear(r, this.side ? ['#ffffff', '#ffd0c8', '#ff8a7a', '#c8302a'] : undefined);
  }
  // online: the state that poses the fighter (and the puppet that applies it)
  snap() { return [Math.round(this.x * 10) / 10, Math.round(this.z * 10) / 10, this.face, ST_CODES.indexOf(this.st), this.tech ? TECH_IDS.indexOf(this.tech) : -1, this.k, (this.air ? 1 : 0) | (this.launched ? 2 : 0) | (this.kime ? 4 : 0) | (this.frozen ? 8 : 0), Math.round(this.flipU * 1000), ['', 'win', 'lose', 'bow', 'seiza', 'kneel', 'yoi'].indexOf(this.poseName || ''), this.landK || 0, this.blockH === 'high' ? 1 : 0]; }
  apply(a) {
    this.x = a[0]; this.z = a[1]; this.face = a[2]; this.st = ST_CODES[a[3]] || 'idle'; this.tech = a[4] >= 0 ? TECH_IDS[a[4]] : null; this.k = a[5];
    this.air = !!(a[6] & 1); this.launched = !!(a[6] & 2); this.kime = !!(a[6] & 4); this.frozen = !!(a[6] & 8); this.flipU = a[7] / 1000; this.poseName = ['', 'win', 'lose', 'bow', 'seiza', 'kneel', 'yoi'][a[8]] || null; this.landK = a[9]; this.blockH = a[10] ? 'high' : 'mid';
    if (this.tech) { const S = this.S, A = this.A; this.ph = this.k < S ? 's' : this.k < S + A ? 'a' : 'r'; } else this.ph = '';
  }
}
KC.Karateka = Karateka;
