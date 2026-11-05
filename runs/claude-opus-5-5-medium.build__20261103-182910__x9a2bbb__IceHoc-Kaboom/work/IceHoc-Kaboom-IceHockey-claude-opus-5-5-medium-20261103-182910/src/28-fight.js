/* ---- Fight: gloves off. Jab, haymaker, duck, yank; balance and stamina; the sin bin and the power play (PLAN 7.11) ---- */
const Fight = (() => {
  const MOVES = { jab: { dur: .25, active: .4, dmg: 6, sta: 8, move: 'jab' }, hay: { dur: .8, active: .5, dmg: 18, sta: 22, move: 'haymaker' }, yank: { dur: .3, active: .5, dmg: 0, sta: 6, move: 'cross' } };
  let F = null;
  function reset() { F = null; if (M) { M.fight = null; M.challenge = null; M.gear = []; } }
  const canFight = () => M && M.phase === 'play' && !M.cfg.noFights && M.fights < T.fightMax && (M.lastFightClock - M.clock >= 60 || M.lastFightClock === 1e9 || M.ot || M.cfg.practice || M.attract);
  /** s holds lob near a rival with a grudge: challenge them */
  function challenge(s) {
    if (!canFight()) return false;
    const rivals = M.skaters.filter(o => o.team !== s.team && Skater.free(o) && Math.hypot(o.x - s.x, o.y - s.y) < 60 && ((s.grudge[o.id] || 0) >= T.fightGrudge || (o.grudge[s.id] || 0) >= T.fightGrudge || M.cfg.practice || M.attract));
    const o = rivals.sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
    if (!o) return false;
    Bus.emit('gloves', { by: s.id, target: o.id, team: s.team });
    if (o.ctrl === 'cpu' || M.attract) {
      const g = Math.max(o.grudge[s.id] || 0, s.grudge[o.id] || 0), p = clamp(.4 + .12 * (o.def.fgt - 3) + g / 200 + (o.challengeBias || 0), .1, .95);
      const forced = M.challengy && (o.def.name.includes('Bruiser') || s.def.name.includes('Bruiser'));
      if (forced || M.cfg.practice || M.attract || RNG.sim() < p) begin(s, o); else turtle(o);
    } else M.challenge = { from: s, to: o, t: 3 };
    return true;
  }
  function turtle(o) { Bus.emit('turtle', { by: o.id, team: o.team, name: o.name }); o.grudge = {}; }
  /** the CPU's enforcers challenge a human who's earned it; a pending human answer counts down */
  function watch(dt) {
    if (M.challenge) {
      const c = M.challenge, h = c.to.human; c.t -= dt;
      const held = h && (h.remote ? Net.heldFor(h, 'lob') : h.input && h.input.down('lob'));
      if (held) { c.hold = (c.hold || 0) + dt; if (c.hold > .5) { M.challenge = null; begin(c.from, c.to); return; } } else c.hold = 0;
      if (c.t <= 0) { M.challenge = null; turtle(c.to); }
      return;
    }
    if (!canFight() || M.cfg.practice) return;
    M.cpuFightT = (M.cpuFightT || 0) - dt; if (M.cpuFightT > 0) return; M.cpuFightT = 1;
    // the Grindhouse: the Bruise Brothers go looking for a scrap, grudge or not
    if (M.challengy) for (const s of M.skaters) {
      if (s.ctrl !== 'cpu' || !Skater.free(s) || s.def.fgt < 5) continue;
      const o = M.skaters.filter(x => x.team !== s.team && Skater.free(x) && !x.off && Math.hypot(x.x - s.x, x.y - s.y) < 60).sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      if (o && RNG.sim() < .12) { s.grudge[o.id] = Math.max(s.grudge[o.id] || 0, 60); if (o.human) { Bus.emit('gloves', { by: s.id, target: o.id, team: s.team }); M.challenge = { from: s, to: o, t: 3 }; } else begin(s, o); return; }
    }
    for (const s of M.skaters) {
      if (s.ctrl !== 'cpu' || !Skater.free(s) || s.def.fgt < 4) continue;
      for (const o of M.skaters) {
        if (o.team === s.team || !Skater.free(o)) continue;
        const g = s.grudge[o.id] || 0, need = M.challengy ? 30 : o.ctrl === 'cpu' ? 34 : 55;
        if (g < need || Math.hypot(o.x - s.x, o.y - s.y) >= 60) continue;
        if (o.human) { Bus.emit('gloves', { by: s.id, target: o.id, team: s.team }); M.challenge = { from: s, to: o, t: 3 }; return; }
        if (o.ctrl === 'cpu' && RNG.sim() < .5) { challenge(s); return; }
      }
    }
  }
  function fighter(s) { return { s, bal: T.fightBalance, sta: 100, mv: null, u: 0, hold: 0, duck: 0, open: 0, stag: 0, yanks: [], blind: 0, ai: { t: .4 }, x: 0, wins: 0 }; }
  function begin(a, b) {
    const mx = (a.x + b.x) / 2, my = clamp((a.y + b.y) / 2, Rink.Y0 + 40, Rink.Y1 - 40);
    F = { a: fighter(a), b: fighter(b), t: 0, mx, my, saved: M.skaters.map(s => [s, s.x, s.y]), over: 0 };
    M.fight = F; F.who = [a, b]; M.fights++; M.lastFightClock = M.clock;
    for (const [f, side] of [[F.a, -1], [F.b, 1]]) { const s = f.s; s.state = 'fight'; s.stateT = 0; s.x = mx + side * 12; s.y = my; s.vx = s.vy = 0; s.facing = side < 0 ? 0 : PI; s.rig.noStick = true; f.side = side; }
    M.gear = (M.gear || []).concat([{ x: a.x - 6, y: a.y + 3, c: a.rig.C.glove }, { x: a.x - 3, y: a.y - 4, c: a.rig.C.glove }, { x: b.x + 6, y: b.y + 3, c: b.rig.C.glove }, { x: b.x + 4, y: b.y - 3, c: b.rig.C.glove }]);
    if (M.puck.owner) Skater.release(M.puck.owner, 0, 0, 0, 'drop');
    M.puck.held = true; M.puck.vx = M.puck.vy = 0;
    Match.setPhase('fight');
    Bus.emit('fight_start', { a: a.id, b: b.id, an: a.name, bn: b.name, x: mx, y: my });
  }
  function ctrl(f, dt) {
    const s = f.s, h = s.human;
    if (h && !M.attract) {
      if (h.remote) return { jab: Net.pressedFor(h, 'pass'), hay: Net.pressedFor(h, 'shoot'), hayHeld: Net.heldFor(h, 'shoot'), duck: Net.pressedFor(h, 'deke'), yank: Net.pressedFor(h, 'lob'), mx: Net.moveFor(h)[0] };
      const I = h.input; return { jab: I.pressed('pass'), hay: I.pressed('shoot'), hayHeld: I.down('shoot'), duck: I.pressed('deke'), yank: I.pressed('lob'), mx: I.move()[0] };
    }
    // the CPU: duck a telegraphed haymaker by skill, else jab, haymaker or yank by temperament
    const o = f === F.a ? F.b : F.a, c = { jab: false, hay: false, hayHeld: false, duck: false, yank: false, mx: 0 }, skill = s.ai ? s.ai.skill : .5;
    f.ai.t -= dt;
    if (o.mv && o.mv.k === 'hay' && o.u < .45 && !f.ai.read) { f.ai.read = true; if (RNG.sim() < skill * (M.cfg.practice ? .3 : 1)) c.duck = true; }
    if (!o.mv) f.ai.read = false;
    if (f.ai.t <= 0 && !f.mv) {
      f.ai.t = lerp(.7, .3, skill) * (M.cfg.practice ? 1.8 : 1) * (.8 + RNG.sim() * .4);
      const r = RNG.sim(), heavy = s.def.fgt >= 4;
      if (r < (heavy ? .35 : .55)) c.jab = true; else if (r < (heavy ? .75 : .8)) c.hay = true; else c.yank = true;
    }
    c.hayHeld = f.mv && f.mv.k === 'hay' && RNG.sim() < .5;
    return c;
  }
  function step(dt) {
    if (!F) return;
    F.t += dt;
    if (F.over > 0) {
      F.over -= dt; anim(dt);
      if (F.over <= 0) finish();
      return;
    }
    for (const f of [F.a, F.b]) {
      const o = f === F.a ? F.b : F.a, c = ctrl(f, dt), slow = f.sta <= 0 ? .6 : 1;
      f.duck = Math.max(0, f.duck - dt); f.open = Math.max(0, f.open - dt); f.stag = Math.max(0, f.stag - dt); f.blind = Math.max(0, f.blind - dt);
      f.sta = Math.min(100, f.sta + 25 * dt);
      f.x = clamp(f.x + (c.mx || 0) * 20 * dt, -6, 6);
      if (f.blind <= 0 && f.s.rig.o.hood) { f.s.rig.o.hood = false; f.s.rig.C.hair = f.hair0; }
      if (!f.mv && f.stag <= 0) {
        if (c.duck && f.duck <= 0) { f.duck = .35; f.sta -= 10; Bus.emit('fight_move', { by: f.s.id, kind: 'duck' }); }
        else if (c.jab && f.duck <= 0) { f.mv = { k: 'jab', spec: MOVES.jab, hit: false }; f.u = 0; f.sta -= 8; }
        else if (c.hay && f.duck <= 0) { f.mv = { k: 'hay', spec: MOVES.hay, hit: false, alt: (f.alt = !f.alt) }; f.u = 0; f.hold = 0; f.sta -= 22; Bus.emit('fight_move', { by: f.s.id, kind: 'windup' }); }
        else if (c.yank && f.duck <= 0) { f.mv = { k: 'yank', spec: MOVES.yank, hit: false }; f.u = 0; f.sta -= 6; }
      }
      if (f.mv) {
        const sp = f.mv.spec, dur = sp.dur / slow;
        if (f.mv.k === 'hay' && c.hayHeld && f.u < .4 && f.hold < .6) { f.hold += dt; }
        else f.u += dt / dur;
        if (!f.mv.hit && f.u >= sp.active) {
          f.mv.hit = true;
          const k = f.mv.k, dmgMul = .8 + .067 * f.s.def.fgt;
          if (k === 'jab') { const d = sp.dmg * dmgMul * (o.duck > 0 ? .5 : 1) * (o.open > 0 ? 1.5 : 1); o.bal -= d; o.stag = .12; Bus.emit('fight_hit', { by: f.s.id, victim: o.s.id, kind: 'jab', dmg: d, x: o.s.x, y: o.s.y }); }
          else if (k === 'hay') {
            if (o.duck > 0) { f.open = .5; Bus.emit('fight_whiff', { by: f.s.id }); }
            else { const d = (sp.dmg + 6 * Math.min(1, f.hold / .6)) * dmgMul * (o.open > 0 ? 1.4 : 1); o.bal -= d; o.stag = .3; Bus.emit('fight_hit', { by: f.s.id, victim: o.s.id, kind: 'hay', dmg: d, x: o.s.x, y: o.s.y, big: d > 20 }); }
          } else if (k === 'yank') {
            if (o.duck > 0) Bus.emit('fight_whiff', { by: f.s.id });
            else {
              o.open = .6; o.sta -= 15; f.yanks.push(F.t); f.yanks = f.yanks.filter(t => F.t - t < 4);
              Bus.emit('fight_hit', { by: f.s.id, victim: o.s.id, kind: 'yank', dmg: 0, x: o.s.x, y: o.s.y });
              if (f.yanks.length >= 3) { f.yanks = []; o.blind = 1.5; o.hair0 = o.hair0 || o.s.rig.C.hair; o.s.rig.o.hood = true; o.s.rig.C.hair = o.s.rig.C.cloth; Bus.emit('jersey_over', { by: f.s.id, victim: o.s.id }); }
            }
          }
        }
        if (f.u >= 1) f.mv = null;
      }
      if (o.blind > 0 && f.mv && f.mv.k !== 'yank') { /* blind fighters swing at air */ }
    }
    for (const f of [F.a, F.b]) if (f.bal <= 0 && F.over <= 0) { const o = f === F.a ? F.b : F.a; end(o, f); break; }
    if (F.t > 20 && F.over <= 0) end(null, null);
    anim(dt);
    watchOthers(dt);
  }
  function anim(dt) {
    for (const f of [F.a, F.b]) {
      const s = f.s, o = f === F.a ? F.b : F.a;
      s.x = F.mx + f.side * 11 + f.x - (f.stag > 0 ? f.side * -2 : 0); s.y = F.my; s.facing = f.side < 0 ? 0 : PI;
      const mv = f.mv, att = mv && f.u < 1 ? E.move(mv.k === 'hay' ? (mv.alt ? 'hook' : 'haymaker') : mv.spec.move, f.u) : null;
      const lost = F.over > 0 && F.loser === f, won = F.over > 0 && F.winner === f;
      s.rig.update(dt, { x: s.x, y: s.y, z: 0, vx: 0, vy: 0, facing: s.facing, stance: 'guard', attack: att, pose: won ? 'cheer' : f.duck > 0 ? 'crouch' : null, down: lost ? Math.min(1, (1.6 - F.over) * 3) : 0, hurt: f.stag > 0, expr: won ? 'shout' : f.stag > 0 ? 'wince' : 'angry' });
    }
  }
  function watchOthers(dt) {   // the rest circle at 50 and watch
    for (const s of M.skaters) {
      if (s.state === 'fight' || s.state === 'bin' || s.off) continue;
      const a = Math.atan2(s.y - F.my, s.x - F.mx) + dt * .25, tx = F.mx + Math.cos(a) * 55, ty = F.my + Math.sin(a) * 40;
      s.vx = (tx - s.x) * 2; s.vy = (ty - s.y) * 2; s.x += s.vx * dt; s.y += s.vy * dt; Rink.clamp(s, 7); s.facing = Math.atan2(F.my - s.y, F.mx - s.x);
    }
    const [r0, r1] = M.refs; r0.x += (F.mx - 30 - r0.x) * dt * 2; r0.y += (F.my - 20 - r0.y) * dt * 2; r1.x += (F.mx + 30 - r1.x) * dt * 2; r1.y += (F.my + 18 - r1.y) * dt * 2;
  }
  function end(w, l) {
    F.over = 1.6; F.winner = w; F.loser = l;
    if (!w) Bus.emit('fight_end', { draw: true, a: F.a.s.id, b: F.b.s.id });
    else Bus.emit('fight_end', { winner: w.s.id, loser: l.s.id, winnerTeam: w.s.team, winnerName: w.s.name, loserName: l.s.name });
  }
  function finish() {
    const w = F.winner, l = F.loser;
    for (const f of [F.a, F.b]) { f.s.state = 'skate'; f.s.rig.noStick = false; f.s.grudge = {}; if (f.s.rig.o.hood) { f.s.rig.o.hood = false; f.s.rig.C.hair = f.hair0 || f.s.rig.C.hair; } }
    if (l) {
      const s = l.s; s.state = 'bin'; s.x = Rink.C.x + (s.team ? 36 : -36); s.y = Rink.Y0 - 10; s.vx = s.vy = 0; s.facing = PI / 2;
      M.sinBin.push({ s, t: T.sinBin }); Bus.emit('sin_bin', { who: s.id, team: s.team, t: T.sinBin, name: s.name }); Bus.emit('powerplay', { team: 1 - s.team });
    }
    const dot = Rink.nearestDot(F.mx, F.my); F = null; M.fight = null;
    Match.setupFaceoff(dot);
  }
  return { reset, challenge, watch, begin, step, get F() { return F; } };
})();
