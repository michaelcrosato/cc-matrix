/* ---- ANIMATION: the engine's procedural Humanoid, driven from the simulation's actor states. Four tools:
 * (a) attack specs (strokes in the vertical 'side' plane for straight bats, the ground plane for horizontal ones; the
 *     bowling arm's windmill over the top) timed so the bat meets the ball at the shot's contactAt;
 * (b) poses (stance crouch, cheer, cast, kneel, down) and expressions;
 * (c) a solvePose wrapper (Anim.patch) that places hands by E.ik3 for the umpire's signals and appeals;
 * (d) the facing and velocity the walk and run cycles read.
 * Every stroke winds up, strikes and settles back, so nothing snaps. ---- */
const STROKES = {
  // straight-bat strokes: a vertical arc from the back-lift, down through the line, into the follow-through
  drive: { plane: 'side', a0: 2.25, a1: 7.4, reach: 8.2, hand: 'both', lunge: 2.5, lean: .25, crouch: .4, twist: .3 },
  flick: { plane: 'side', a0: 2.2, a1: 6.9, reach: 8, hand: 'both', lunge: 1.5, twist: -.5 },
  loft: { plane: 'side', a0: 2.0, a1: 8.0, reach: 8.6, hand: 'both', lunge: 2.2, lean: .1, twist: .4 },
  scoop: { plane: 'side', a0: 4.6, a1: 2.0, reach: 7.6, hand: 'both', crouch: .8, lean: .3 },
  block: { plane: 'side', a0: 2.4, a1: 4.95, reach: 7.4, hand: 'both', lunge: 2, lean: .3, crouch: .3, hold: .8 },
  // horizontal-bat strokes: the ground plane at chest height
  pull: { a0: 1.9, a1: -2.1, z0: 24, z1: 18, reach: 8.6, hand: 'both', lunge: -1, twist: .8 },
  cut: { a0: 1.4, a1: -1.6, z0: 22, z1: 14, reach: 8.6, hand: 'both', lunge: 1, lean: .2 },
  helicopter: { plane: 'side', a0: 4.4, a1: 10.6, reach: 8.4, hand: 'both', crouch: .5, spin: false },
  // the bowler's arm: over the top in the vertical plane, released at the top front
  windmill: { plane: 'side', a0: 3.9, a1: .25, reach: 9.4, hand: 'R', hop: 2.5, lean: .45, lunge: 3, crouch: .2 },
  spinArm: { plane: 'side', a0: 3.4, a1: .5, reach: 8.8, hand: 'R', hop: 1, lean: .25, lunge: 2, twist: .6 },
  stump: { a0: 1.2, a1: -1.2, z0: 10, z1: 6, reach: 7, hand: 'both' },
  throwArm: 'throw'
};
const FAM_STROKE = { drive: 'drive', flick: 'flick', loft: 'loft', pull: 'pull', cut: 'cut', scoop: 'scoop', block: 'block' };
const Anim = {
  /** the attack state for a stroke at time t since the press (wind ends at the shot's contactAt) */
  stroke(name, t, at, recover = .35) {
    const spec = STROKES[name]; if (!spec) return null;
    const wind = Math.max(.05, at - .035), act = .07;
    if (t < wind) return { spec, phase: 'wind', u: t / wind };
    if (t < wind + act) return { spec, phase: 'active', u: (t - wind) / act };
    if (t < wind + act + recover) return { spec, phase: 'recover', u: (t - wind - act) / recover };
    return null;
  },
  /** a fielder's, batter's or bowler's rig state from its actor (sim units in, map units out) */
  state(a, B, m, role) {
    const an = a.anim || { kind: 'idle', t: 0 }, s = { x: a.x + B.OX, y: a.y + B.OY, z: a.z || 0, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing || 0 };
    const k = an.kind, t = an.t || 0;
    if (role === 'bat') {
      const hand = a.hand || 1, stanceF = hand > 0 ? Math.PI : 0;
      if (k === 'stance') { s.facing = stanceF; s.vx = s.vy = 0; s.crouch = .35; s.attack = null; s.expr = null; }
      else if (k === 'shot') {
        const sh = SHOTS[an.shot] || SHOTS.push, name = an.shot === 'helicopter' ? 'helicopter' : FAM_STROKE[sh.fam] || 'drive';
        const th = (m && m.contact && m.contact.theta !== undefined && an.contact) ? m.contact.theta : (m && m.shotPress && m.shotPress.sector !== null && m.shotPress.sector !== undefined ? m.shotPress.sector : sh.nat);
        const [dx, dy] = dirOf(th, hand), shotF = Math.atan2(dy, dx), turn = name === 'block' ? .55 : name === 'pull' || name === 'cut' ? .5 : .75;
        s.facing = stanceF + wrapAng(shotF - stanceF) * turn * Math.min(1, t / Math.max(.05, sh.at));
        s.attack = Anim.stroke(name, t, sh.at, name === 'block' ? .9 : .45); s.vx = s.vy = 0; s.crouch = .2;
        if (!s.attack) { s.facing = stanceF + wrapAng(shotF - stanceF) * turn; s.crouch = .15; }
        if (an.grade === 'perfect' && an.contact) s.expr = 'smile';
        if (an.grade === 'miss' || (m && m.cur && m.cur.beaten)) s.expr = 'wince';
      }
      else if (k === 'leave') { s.facing = stanceF; s.attack = { spec: { plane: 'side', a0: 1.9, a1: 1.9, reach: 8, hand: 'both' }, phase: 'active', u: 1 }; s.vx = s.vy = 0; }
      else if (k === 'duck') { s.facing = stanceF; s.crouch = 1; s.pose = 'crouch'; s.vx = s.vy = 0; }
      else if (k === 'charge') { s.facing = Math.PI / 2; s.run = .8; s.vy = 90; }
      else if (k === 'run' || k === 'slip') { s.run = 1; if (k === 'slip') s.hurt = true; }
      else if (k === 'dive') { s.down = .55; s.vx = s.vy = 0; }
      else if (k === 'celebrate') { s.pose = 'cheer'; s.expr = 'smile'; s.vx = s.vy = 0; }
      else if (k === 'out') { s.expr = 'wince'; s.pose = 'kneel'; s.vx = s.vy = 0; }
      if (a.down > 0) s.down = .6;
      return s;
    }
    if (role === 'bowl') {
      if (k === 'runup') { s.run = 0; }
      else if (k === 'deliver') {
        const spin = m && m.bowlerFamily() === 'spin', mach = m && m.bowlerFamily() === 'machine';
        if (!mach) { s.attack = Anim.stroke(spin ? 'spinArm' : 'windmill', t, .16, .35); s.facing = -Math.PI / 2; }
        if (t > .5 && !mach) { s.vx = 0; s.vy = -40 * Math.max(0, 1 - t); }
      } else if (k === 'appeal' || k === 'celebrate') { s.pose = 'cheer'; s.expr = 'shout'; s.vx = s.vy = 0; }
      else if (k === 'mark') { s.vx = s.vy = 0; }
      if (an.kind === 'appeal' || an.kind === 'celebrate') return s;
    }
    switch (k) {
      case 'walkin': s.crouch = .45; break;
      case 'ready': case 'crouch': s.crouch = role === 'keep' ? .9 : .5; if (role === 'keep') s.pose = 'crouch'; break;
      case 'gather': s.crouch = .7; s.pose = t < .3 ? 'cast' : null; break;
      case 'catch': s.pose = t < .6 ? 'cast' : 'cheer'; s.expr = t > .4 ? 'shout' : null; s.vx = s.vy = 0; break;
      case 'divecatch': s.down = t < .9 ? .8 : 0; s.pose = t > .9 ? 'cheer' : 'cast'; s.expr = 'shout'; break;
      case 'divestop': s.down = t < .5 ? .7 : 0; break;
      case 'drop': s.hurt = t < .4; s.expr = 'wince'; s.pose = t < 1 ? 'kneel' : null; break;
      case 'fumble': s.hurt = t < .3; s.expr = 'wince'; break;
      case 'throw': s.attack = t < .45 ? E.move('throw', Math.min(1, t / .45)) : null; break;
      case 'stump': s.attack = Anim.stroke('stump', t, .08, .3); s.crouch = .6; break;
      case 'appeal': case 'celebrate': s.pose = 'cheer'; s.expr = 'shout'; s.vx = s.vy = 0; break;
      case 'sad': s.pose = 'kneel'; s.expr = 'wince'; break;
    }
    if (a.down > 0 && !s.down) s.down = .7;
    return s;
  },
  /** the umpire's hands by E.ik3, on top of the solved pose: OUT, FOUR, SIX, WIDE, NO BALL, BYE, LEG BYE, FREE HIT,
   *  REVIEW (a TV rectangle drawn in the air) and DEAD BALL */
  patch(rig) {
    const base = rig.solvePose;
    rig.solvePose = function () {
      base.call(this);
      const sig = this.sig, t = this.sigT || 0; if (!sig || sig === 'notout') return;
      const o = this.o, J = this.J, L = o.armUpper + o.armLower, slow = (this.umpire && this.umpire.slowFinger) || .5;
      const set = (side, target) => { const sh = side > 0 ? J.shR : J.shL, [el, h] = E.ik3(sh, target, o.armUpper, o.armLower, [-1, side * .7, -.2]); J[side > 0 ? 'elbowR' : 'elbowL'] = el; J[side > 0 ? 'handR' : 'handL'] = h; };
      const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], k = Math.min(1, t / .25);
      if (sig === 'out') { const u = Math.min(1, t / slow); set(1, add(J.shR, [.6 + (1 - u) * 3, .3, -L * .6 + u * L * 1.55])); }
      else if (sig === 'four') { const w = Math.sin(t * 7); set(1, add(J.shC, [3.5, w * 6, -1 + k])); }
      else if (sig === 'six') { set(1, add(J.shR, [.5, .8, L * .95 * k])); set(-1, add(J.shL, [.5, -.8, L * .95 * k])); }
      else if (sig === 'wide') { set(1, add(J.shR, [.2, L * .95 * k, 0])); set(-1, add(J.shL, [.2, -L * .95 * k, 0])); }
      else if (sig === 'noball') set(1, add(J.shR, [.2, L * .95 * k, 0]));
      else if (sig === 'bye') set(1, add(J.shR, [2.5, .5, L * .75 * k]));
      else if (sig === 'legbye') { set(1, add(J.kneeR || J.hipR, [2.5, .5, 2])); }
      else if (sig === 'freehit') set(1, add(J.shR, [Math.cos(t * 9) * 2.5, .5 + Math.sin(t * 9) * 2.5, L * .9]));
      else if (sig === 'review') { const p = (t * .9) % 1, rx = p < .25 ? p * 4 : p < .5 ? 1 : p < .75 ? 1 - (p - .5) * 4 : 0, ry = p < .25 ? 0 : p < .5 ? (p - .25) * 4 : p < .75 ? 1 : 1 - (p - .75) * 4; set(1, add(J.shC, [5, 1 + rx * 5, 2 + ry * 5])); set(-1, add(J.shC, [5, -1 - rx * 5, 2 + ry * 5])); }
      else if (sig === 'dead') { set(1, add(J.shC, [4, -1.5, -5])); set(-1, add(J.shC, [4, 1.5, -5])); }
    };
  }
};
K.Anim = Anim; K.STROKES = STROKES;
