/* ---- SKATER (7.2, 7.4-7.9): the pure skating step (the network prediction runs it too), the skater's actions from its
 * intent (passes, saucers, wrist shots, slapshot wind-ups, one-timers, checks, dekes, pokes, chirps, the gloves), and the
 * rig's motion state. Intent: { mx, my, aim: [x, y] | null, face: angle | null, back, held: { shoot, lob, turbo },
 * press: { pass, shoot, deke, lob, chirp, switch } } ---- */
const Skater = (() => {
  /** speed cap for a skater now */
  function vmax(s, m) {
    let v = T.skateMax * RATE.speed(s.def);
    if (m && m.puck.owner === s) v *= .94;
    if (s.state === 'wind') v *= .6;
    if (s.items.cocoa > 0) v *= 1.2;
    if (s.boost) v *= s.boost;
    if (m && m.teams[s.team].tactic === 'finesse') v *= 1.04;
    return v;
  }
  /** the pure skating step: st { x, y, vx, vy, facing, stopT, turbo }, it { mx, my, turbo, face, back }, p { vmax, accel,
   *  glide, turnSlow, turnFast, stopDecel, inf (infinite turbo) }. Returns events in st.ev (stop) */
  function skateStep(st, it, p, dt) {
    const sp = Math.hypot(st.vx, st.vy), mag = Math.min(1, Math.hypot(it.mx, it.my));
    st.ev = null;
    const turbo = it.turbo && (st.turbo > .02 || p.inf) && mag > .2;
    if (turbo && !p.inf) st.turbo = Math.max(0, st.turbo - T.turboDrain * dt);
    if (!it.turbo) { st.rest = (st.rest || 0) + dt; if (st.rest > .6) st.turbo = Math.min(1, st.turbo + T.turboRegen * dt); } else st.rest = 0;
    if (p.inf) st.turbo = 1;
    st.turboOn = turbo;
    const vm = p.vmax * (turbo ? T.turboMul : 1) * (it.back ? .75 : 1);
    if (st.stopT > 0) {
      st.stopT -= dt; const ns = Math.max(0, sp - T.stopDecel * dt), k = sp > 0 ? ns / sp : 0; st.vx *= k; st.vy *= k;
    } else if (mag > .2) {
      const dir = Math.atan2(it.my, it.mx), va = sp > 4 ? Math.atan2(st.vy, st.vx) : dir;
      if (sp > 60 && Math.abs(U.angDiff(va, dir)) > 2.1 && !it.back) { st.stopT = .22; st.ev = 'stop'; }
      else {
        const rate = lerp(T.turnSlow, T.turnFast, clamp(sp / Math.max(1, vm), 0, 1)) * (it.back ? 1.6 : 1);
        const na = E.approachAng(va, dir, rate * dt), target = vm * mag;
        let ns = sp;
        if (sp < target) ns = Math.min(target, sp + T.skateAccel * (1 - .6 * Math.pow(Math.min(1, sp / vm), 2)) * dt);
        else ns = Math.max(target, sp - (T.iceGlide * 2 + (sp > vm ? 220 : 0)) * dt);
        st.vx = Math.cos(na) * ns; st.vy = Math.sin(na) * ns;
      }
    } else {
      const ns = Math.max(0, sp - T.iceGlide * dt), k = sp > 0 ? ns / sp : 0; st.vx *= k; st.vy *= k;
    }
    st.x += st.vx * dt; st.y += st.vy * dt;
    // facing: toward what it wants to face (an AI skating backward faces the puck), else along its velocity
    const sp2 = Math.hypot(st.vx, st.vy);
    if (it.face !== undefined && it.face !== null) st.facing = E.approachAng(st.facing, it.face, 9 * dt);
    else if (st.stopT > 0) st.facing = E.approachAng(st.facing, Math.atan2(st.vy, st.vx) + 1.2 * (st.stopSide || 1), 14 * dt);
    else if (sp2 > 8) st.facing = E.approachAng(st.facing, Math.atan2(st.vy, st.vx), 11 * dt);
    else if (mag > .2) st.facing = E.approachAng(st.facing, Math.atan2(it.my, it.mx), 8 * dt);
    return st;
  }
  const BUSY = new Set(['down', 'getup', 'stun', 'fight', 'bin', 'frozen', 'buried', 'slip', 'celebrate', 'offbal', 'blasted']);
  const free = s => !BUSY.has(s.state);
  const canAct = s => free(s) && !['check', 'deke', 'poke', 'pass', 'shoot'].includes(s.state);
  function setState(s, st, t = 0) { s.state = st; s.stateT = t; }
  /** the blade point (where it carries the puck) */
  const blade = (s, reach = 11) => [s.x + Math.cos(s.facing) * reach - Math.sin(s.facing) * s.hand * 4, s.y + Math.sin(s.facing) * reach + Math.cos(s.facing) * s.hand * 4];

  /** one step of a skater: its actions from its intent, then its skating */
  function step(m, s, dt) {
    const it = s.intent, live = m.phase === 'play' || m.phase === 'shootout';
    s.stateT -= dt; s.actT = (s.actT || 0) + dt; s.pickupCD = Math.max(0, s.pickupCD - dt); s.cool = Math.max(0, (s.cool || 0) - dt); s.chirpCD = Math.max(0, (s.chirpCD || 0) - dt);
    s.dekeCD = Math.max(0, (s.dekeCD || 0) - dt); s.checkCD = Math.max(0, (s.checkCD || 0) - dt); s.bubbleT = Math.max(0, (s.bubbleT || 0) - dt);
    if (s.twistT > 0) { s.twistT -= dt; if (s.twistT <= 0) { s.twistT = 0; if (m.puck.owner === s && Skater.free(s)) { s.twistShot = true; Shots.shoot(m, s, 'wrist', 0); } } }
    for (const k in s.items) if (s.items[k] > 0 && k !== 'lumber') { s.items[k] -= dt; if (s.items[k] <= 0) { s.items[k] = 0; Bus.emit('item_end', { by: s.id, kind: k }); } }
    // timed states run out
    if (s.stateT <= 0) {
      if (s.state === 'down') { setState(s, 'getup', .5); }
      else if (['getup', 'stun', 'check', 'deke', 'poke', 'pass', 'shoot', 'offbal', 'slip', 'buried', 'frozen', 'blasted'].includes(s.state)) {
        if (s.state === 'frozen') { const w = Rink.wall(s.x, s.y); s.x += 10; Bus.emit('unfreeze', { victim: s.id }); }
        setState(s, 'skate');
      }
    }
    const st = s.state, owner = m.puck.owner === s;
    let mv = { mx: it.mx, my: it.my, turbo: it.held.turbo, face: it.face, back: it.back };
    if (!live || ['down', 'getup', 'frozen', 'buried', 'bin', 'fight', 'blasted'].includes(st)) mv = { mx: 0, my: 0, turbo: false };
    if (st === 'stun' || st === 'slip' || st === 'offbal') mv.mx = mv.my = 0;
    if (st === 'celebrate') mv = { mx: s.celebDir ? s.celebDir[0] * .4 : 0, my: s.celebDir ? s.celebDir[1] * .4 : 0, turbo: false };
    if (live && free(s)) actions(m, s, it, dt, owner);
    // the deke's sideways cut, the check's lunge, a knockdown's slide
    if (st === 'deke' && s.stateT > .2) { const a = s.facing + s.dekeDir * PI / 2; s.vx += Math.cos(a) * 260 * dt; s.vy += Math.sin(a) * 260 * dt; }
    if (st === 'down' || st === 'slip') { const sp = Math.hypot(s.vx, s.vy), k = Math.max(0, sp - 90 * dt) / (sp || 1); s.vx *= k; s.vy *= k; s.x += s.vx * dt; s.y += s.vy * dt; }
    else if (st === 'frozen' || st === 'bin' || st === 'buried' || st === 'fight') { s.vx *= .8; s.vy *= .8; }
    else {
      const p = { vmax: vmax(s, m), inf: s.items.hotsauce > 0 || (m.kaboom[s.team] > 0) || m.cheats.turbo && s.ctrl.kind === 'human' || m.cheats.allTurbo };
      skateStep(s, mv, p, dt);
      if (s.ev === 'stop') { s.stopSide = U.angDiff(Math.atan2(s.vy, s.vx), Math.atan2(mv.my, mv.mx)) > 0 ? 1 : -1; Bus.emit('stop', { by: s.id, x: s.x, y: s.y }); Rink.addScuff(s.x, s.y, .12); }
      if (s.turboOn) s.stats.turbo += dt;
    }
    // the ice scuffs where it skates; KABOOM skates melt it
    const sp = Math.hypot(s.vx, s.vy); if (sp > 20) { Rink.addScuff(s.x, s.y, .0025 * sp / 132); if (m.kaboom[s.team] > 0) Rink.addMelt(s.x, s.y, .05 * dt * 60 / 120); }
    s.phase = (s.phase || 0) + dt * sp / 22 * (s.turboOn ? 1.15 : 1);
  }
  /** what the buttons do (7.4-7.9) */
  function actions(m, s, it, dt, owner) {
    const pr = it.press, puck = m.puck;
    // a pass coming: shoot arms the one-timer
    if (puck.passTo === s && !puck.owner && (pr.shoot || it.held.shoot)) s.otArmed = .5; else s.otArmed = Math.max(0, (s.otArmed || 0) - dt);
    if (owner) {
      // shooting: tap for a wrist shot, hold to wind up a slapshot, let go to fire
      if (pr.shoot && canAct(s)) { s.shootHeld = 0; s.charging = true; }
      if (s.charging) {
        if (it.held.shoot) {
          s.shootHeld += dt;
          if (s.shootHeld > .18) { if (s.state !== 'wind') { setState(s, 'wind', 99); Bus.emit('windup', { by: s.id }); } s.charge = Math.min(1, s.charge + dt / T.slapCharge * (m.kaboom[s.team] > 0 ? 2 : 1)); }
        } else {
          const wrist = s.shootHeld <= .18; s.charging = false;
          if (wrist) Shots.shoot(m, s, 'wrist', 0); else Shots.shoot(m, s, 'slap', s.charge);
          s.charge = 0; s.shootHeld = 0; return;
        }
      }
      if (s.state === 'wind') return;
      if (pr.pass && canAct(s)) return Shots.pass(m, s, false);
      if (pr.lob && canAct(s)) return Shots.pass(m, s, true);
      if (pr.deke && canAct(s) && s.dekeCD <= 0) return deke(m, s, it);
    } else {
      s.charging = false; s.charge = 0; if (s.state === 'wind') setState(s, 'skate');
      if (pr.shoot && canAct(s) && s.checkCD <= 0 && !(puck.passTo === s)) return check(m, s);
      if (pr.deke && canAct(s) && s.cool <= 0) return poke(m, s);
      if (pr.pass && s.ctrl.kind !== 'cpu') { const mate = m.teams[s.team].skaters.find(o => o !== s && puck.owner === o); if (mate && mate.ctrl.kind === 'cpu') { mate.callFor = { by: s, t: 1.2 }; s.calling = .8; Bus.emit('call', { by: s.id }); } }
      // the gloves: hold lob near a rival with a grudge
      if (it.held.lob && s.ctrl.kind !== 'cpu') { s.gloveHold = (s.gloveHold || 0) + dt; if (s.gloveHold >= .5) { s.gloveHold = 0; Fight.challenge(m, s); } } else s.gloveHold = 0;
    }
    if (pr.chirp && s.chirpCD <= 0) chirp(m, s);
  }
  function check(m, s) {
    setState(s, 'check', .3); s.checkCD = .55; s.hitDone = {};
    const lunge = 60 * (s.turboOn ? 1.2 : 1); s.vx += Math.cos(s.facing) * lunge; s.vy += Math.sin(s.facing) * lunge;
    Bus.emit('check_start', { by: s.id });
  }
  function poke(m, s) {
    setState(s, 'poke', .35); s.cool = .6; s.pokeDone = false; Bus.emit('poke_start', { by: s.id });
  }
  function deke(m, s, it) {
    const side = Math.abs(it.mx) + Math.abs(it.my) > .3 ? Math.sign(U.angDiff(s.facing, Math.atan2(it.my, it.mx)) || 1) : (s.lastDeke = -(s.lastDeke || 1));
    setState(s, 'deke', .45); s.dekeDir = side; s.dekeCD = .8; s.spin = s.turboOn; s.dekeAt = m.t;
    // who it is beating: a defender square in front
    const opp = m.teams[1 - s.team].skaters.filter(o => Skater.free(o) && U.dist(o, s) < 40 && Math.abs(U.angDiff(s.facing, U.angTo(s, o))) < .9);
    s.dekeVs = opp.map(o => o.id);
    const g = m.teams[1 - s.team].goalie; if (g && U.dist(g, s) < 80) { g.bitT = .5 * (g.def.boss && !g.cracked ? 1 : g.def.boss ? 1.5 : 1); g.bitBy = s.id; }
    Bus.emit('deke', { by: s.id, spin: !!s.spin });
  }
  function chirp(m, s) {
    const rivals = m.teams[1 - s.team].skaters.filter(o => U.dist(o, s) < 120 && o.state !== 'bin');
    if (!rivals.length) { s.chirpCD = 1; return; }
    const tgt = rivals.sort((a, b) => U.dist(a, s) - U.dist(b, s))[0], line = Math.floor(RNG.sim() * TEXT.chirps.length);
    s.chirpCD = 4; s.bubble = TEXT.chirps[line]; s.bubbleT = 2.2;
    Grudge.add(m, tgt, s, 15);
    Bus.emit('chirp', { by: s.id, target: tgt.id, line });
  }
  /** the rig's state from the skater: stride, stop, stick act, the poses */
  function pose(m, s, dt) {
    const rig = s.rig, hk = rig.hk, sp = Math.hypot(s.vx, s.vy), vm = T.skateMax * 1.45, st = s.state, owner = m.puck.owner === s;
    hk.mode = st === 'fight' ? 'fight' : st === 'bin' ? 'sit' : 'skate';
    hk.ph = s.phase; hk.push = clamp((sp - 10) / 90, 0, 1) * (s.turboOn ? 1 : .85); hk.stop = s.stopT > 0 ? 1 : Math.max(0, (hk.stop || 0) - dt * 4);
    const va = Math.atan2(s.vy, s.vx), rel = U.angDiff(s.facing, va);
    hk.back = sp > 20 && Math.abs(rel) > 2 ? 1 : 0; hk.cross = clamp(U.angDiff(s.prevVa === undefined ? va : s.prevVa, va) / dt * .4, -1, 1); s.prevVa = va;
    hk.lean = .32 + (s.turboOn ? .18 : 0) + (st === 'check' ? .25 : 0) + (hk.stop ? -.1 : 0); hk.crouch = st === 'faceoff' ? .8 : hk.stop ? .7 : .45 + (s.turboOn ? .05 : 0);
    hk.faceoff = st === 'faceoff'; hk.weave = (s.weave = (s.weave || 0) + dt * (owner ? 9 : 2)); hk.stickDrop = false;
    const stick = hk.stick || (hk.stick = {}); stick.aim = 0; stick.saucer = false; stick.big = false;
    if (st === 'wind') { stick.act = 'wind'; stick.u = Math.min(1, (s.shootHeld - .18) / .2 + .2); }
    else if (st === 'shoot') { const u = 1 - s.stateT / .3; if (s.shotKind === 'slap' || s.shotKind === 'onetimer' || s.shotKind === 'kaboom') { if (u < .3) { stick.act = 'slap'; stick.u = u / .3; } else { stick.act = 'follow'; stick.u = (u - .3) / .7; stick.big = true; } } else { if (u < .4) { stick.act = 'wrist'; stick.u = u / .4; } else { stick.act = 'follow'; stick.u = (u - .4) / .6; } } }
    else if (st === 'pass') { stick.act = 'pass'; stick.u = 1 - s.stateT / .2; stick.saucer = s.passKind === 'saucer'; }
    else if (st === 'check') stick.act = 'check';
    else if (st === 'poke') { stick.act = 'poke'; stick.u = 1 - s.stateT / .35; }
    else if (st === 'deke') { stick.act = s.spin ? 'deke' : 'drag'; stick.u = 1 - s.stateT / .45; }
    else if (st === 'faceoff') stick.act = 'faceoff';
    else if (st === 'celebrate') stick.act = s.celeb === 'guitar' ? 'guitar' : s.celeb === 'sniper' ? 'sniper' : 'raise';
    else stick.act = owner ? 'carry' : 'idle';
    // the drawn facing: the spin-o-rama turns the body a full circle
    let face = s.facing;
    if (st === 'deke' && s.spin) face += (1 - s.stateT / .45) * TAU * s.dekeDir;
    if (s.twistT > 0) face += (1 - s.twistT / .6) * TAU;
    if (hk.stop) face = s.facing;
    const down = st === 'down' ? Math.min(1, (1.4 - s.stateT) * 3) : st === 'getup' ? Math.max(0, s.stateT / .5) : st === 'slip' ? .8 : st === 'blasted' ? 1 : 0;
    const pose = st === 'celebrate' && s.celeb === 'pump' ? 'cheer' : st === 'getup' ? 'kneel' : st === 'bin' ? 'kneel' : st === 'buried' ? 'crouch' : (m.phase === 'final' && s.team !== m.winner && m.winner >= 0) ? 'kneel' : null;
    const fightSt = st === 'fight' && s.fight ? s.fight : null;
    rig.update(dt, { x: s.x, y: s.y, z: s.z || 0, vx: 0, vy: 0, facing: face, down, hurt: st === 'stun' || st === 'offbal', pose: fightSt ? fightSt.pose : pose, expr: st === 'celebrate' ? 'shout' : st === 'check' || st === 'fight' ? 'angry' : st === 'down' || st === 'stun' ? 'wince' : null,
      attack: fightSt ? fightSt.attack : null, stance: fightSt ? 'guard' : null, flip: st === 'slip' ? .3 : 0 });
    rig.o.hood = !!(fightSt && fightSt.hood); if (rig.o.hood) rig.C.hair = rig.C.cloth; else rig.C.hair = s.hairColor;
    if (hk.mode === 'fight') { rig.hkGear.stick = false; hk.grip = fightSt && fightSt.grip; } else rig.hkGear.stick = st === 'down' || st === 'getup' ? true : true;
    rig.hkGear.helmet = st === 'fight' ? null : s.helmetColor;
  }
  return { vmax, skateStep, step, free, canAct, setState, blade, pose, check, poke, deke, chirp, BUSY };
})();

/* ---- Grudge (7.7): per ordered pair 0..100; decays 4/s after 3 s of peace ---- */
const Grudge = {
  add(m, holder, against, n) { const g = holder.grudge; g[against.id] = clamp((g[against.id] || 0) + n, 0, 100); holder.peace = 0; },
  get: (holder, against) => holder.grudge[against.id] || 0,
  step(m, dt) { for (const s of m.skaters) { s.peace = (s.peace || 0) + dt; if (s.peace > 3) for (const k in s.grudge) s.grudge[k] = Math.max(0, s.grudge[k] - 4 * dt); } }
};
