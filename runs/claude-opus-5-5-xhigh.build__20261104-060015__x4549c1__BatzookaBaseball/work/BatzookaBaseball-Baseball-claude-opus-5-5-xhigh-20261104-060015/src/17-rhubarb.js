/* =============================================================================
 * 17-rhubarb: the bench-clearing brawl, a 12-second slapstick scrum around home
 * plate built on the engine's beat-'em-up tools (E.Combo, E.Attack, knockback).
 * Each human controls one fighter: ✕ punch combo, □ shove, △ grab and toss,
 * ○ dodge. Three hits knock a fighter down (dizzy stars, then up again). The
 * side with more knockdowns gets +50 meter. Cartoon only: bonks, POW, no blood.
 * ========================================================================== */
BZ.rhubarb = {
  start(M, why, o = {}) {
    const P = M.park, H = P.H, R = BZ.rng.fx;
    const pick = (T, n, first) => { const l = [first].concat(T.lineup.filter(p => p !== first)).filter(Boolean); return l.slice(0, n); };
    const O = BZ.offense(M), D = BZ.defense(M);
    const sides = o.crew ? [[M.batter], o.crew] : [pick(O, 6, M.batter), pick(D, 6, D.pitcher)];
    const F = [];
    sides.forEach((list, s) => list.forEach((pl, i) => {
      const a = (s ? -1 : 1) * (.4 + i * .35), r0 = 60 + i * 12;
      const f = { side: s, pl, x: H.x + (s ? 1 : -1) * (20 + i * 14), y: H.y - 40 - i * 10, vx: 0, vy: 0, facing: s ? Math.PI : 0, hits: 0, down: 0, knocks: 0, cool: 0, wind: 0, rig: BZ.rigFor(pl, 'fight'), combo: new E.Combo(['jab', 'cross', 'hook'], { window: .35 }), bash: new E.Attack('bash'), toss: new E.Attack('throw'), dodge: 0, human: null, aiT: R() * .5, sx: 0, sy: 0 };
      void a; void r0;
      // the dugouts pour out: they start at the dugouts and run in
      f.x = H.x + (s ? 1 : -1) * (150 + i * 10); f.y = H.y - 120 - i * 8;
      F.push(f);
    }));
    const offI = o.human || BZ.ctl.who(M, O.side, 'bat'), defI = BZ.ctl.who(M, D.side, 'pitch');
    if (offI) F[0].human = offI;
    if (defI && !o.crew) { const pf = F.find(f => f.side === 1 && f.pl === D.pitcher) || F.find(f => f.side === 1); if (pf) pf.human = defI; }
    M.rhubarb = { t: 0, dur: o.dur || 12, F, why, score: [0, 0], ended: false, endT: 0, punches: 0, shoves: 0, tosses: 0, training: !!o.crew };
    this.prev = M.phase;
    M.phase = 'rhubarb'; M.phaseT = 0;
    BZ.bus.emit('rhubarbStart', { why });
    BZ.hud.stamp('RHUBARB!', { prio: 3, scale: 4, dur: 2 });
    BZ.talk.say('rhubarb_start', {}, 3);
    BZ.music('rhubarb');
  },
  update(M, dt) {
    const R = M.rhubarb, F = R.F;
    R.t += dt;
    if (R.ended) { R.endT += dt; for (const f of F) { f.vx *= .9; f.vy *= .9; BZ.rigUpdate(f.rig, dt, { x: f.x, y: f.y, z: 0, vx: 0, vy: 0, facing: f.facing, pose: f.down > 0 ? 'down' : 'hips' }); } if (R.endT > 2.4) this.finish(M); return; }
    for (const f of F) {
      f.cool = Math.max(0, f.cool - dt); f.dodge = Math.max(0, f.dodge - dt);
      if (f.down > 0) { f.down -= dt; f.vx = f.vy = 0; BZ.rigUpdate(f.rig, dt, { x: f.x, y: f.y, z: 0, facing: f.facing, down: Math.min(1, f.down) }); continue; }
      const foes = F.filter(o => o.side !== f.side && o.down <= 0);
      const near = foes.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y))[0];
      let mx = 0, my = 0, punch = false, shove = false, grab = false, dodge = false;
      if (f.human) {
        const I = f.human, m = I.move(), d = BZ.game.view.screenDirToGround ? BZ.game.view.screenDirToGround(m[0], m[1]) : m;
        mx = d[0]; my = d[1]; punch = I.pressed('south'); shove = I.pressed('west'); grab = I.pressed('north'); dodge = I.pressed('east');
        if (Math.hypot(mx, my) > .2) f.facing = Math.atan2(my, mx); else if (near) f.facing = Math.atan2(near.y - f.y, near.x - f.x);
      } else if (near) {
        const dx = near.x - f.x, dy = near.y - f.y, d = Math.hypot(dx, dy);
        f.facing = Math.atan2(dy, dx);
        if (d > 13) { mx = dx / d; my = dy / d; }
        f.aiT -= dt;
        if (d < 15 && f.aiT <= 0) { f.wind += dt; if (f.wind > .25) { f.wind = 0; f.aiT = .45 + BZ.F() * .6; const r = BZ.F(); if (r < .65) punch = true; else if (r < .85) shove = true; else grab = true; } }
      }
      const sp = f.dodge > 0 ? 190 : 85;
      if (dodge && f.cool <= 0) { f.dodge = .25; f.cool = .5; BZ.sfx('turbo'); }
      f.vx = mx * sp; f.vy = my * sp; f.x += f.vx * dt; f.y += f.vy * dt;
      if (punch && f.combo.press()) { R.punches += f.human ? 1 : 0; BZ.sfx('swing'); }
      if (shove && f.bash.start()) { R.shoves += f.human ? 1 : 0; }
      if (grab && near && Math.hypot(near.x - f.x, near.y - f.y) < 14 && f.toss.start()) { R.tosses += f.human ? 1 : 0; this.hit(M, f, near, 3, 260, 'toss'); BZ.sfx('slideWhistle'); }
      f.combo.update(dt); f.bash.update(dt); f.toss.update(dt);
      const inReach = o => Math.hypot(o.x - f.x, o.y - f.y) < 16 && Math.abs(BZ.ang(Math.atan2(o.y - f.y, o.x - f.x) - f.facing)) < 1.2 && o.dodge <= 0 && o.down <= 0;
      f.combo.hits(foes, inReach, o => this.hit(M, f, o, 1, 60, 'punch'));
      f.bash.hits(foes, inReach, o => this.hit(M, f, o, 1, 160, 'shove'));
      BZ.rigUpdate(f.rig, dt, { x: f.x, y: f.y, z: 0, vx: f.vx, vy: f.vy, facing: f.facing, attack: f.combo.state || f.bash.state || f.toss.state, stance: 'guard', expr: 'angry' });
      // stay near home plate
      const H = M.park.H, dx = f.x - H.x, dy = f.y - (H.y - 50), d = Math.hypot(dx, dy); if (d > 110) { f.x = H.x + dx / d * 110; f.y = H.y - 50 + dy / d * 110; }
    }
    if (R.t >= R.dur) this.end(M);
  },
  hit(M, a, o, dmg, push, how) {
    const R = M.rhubarb;
    o.hits += dmg; const d = Math.hypot(o.x - a.x, o.y - a.y) || 1;
    o.x += (o.x - a.x) / d * push * .08; o.y += (o.y - a.y) / d * push * .08;
    BZ.sfx(how === 'toss' ? 'crash' : 'bonk');
    if (BZ.cosmetic) { BZ.game.particles.text(o.x, o.y, 30, ['POW!', 'BONK!', 'WHAM!', 'BOP!'][Math.floor(BZ.F() * 4)], '#ffd040', { scale: 1, bounce: true }); BZ.game.particles.impact && BZ.game.particles.impact(o.x, o.y, 20, 1, '#ffffff'); }
    if (a.human) a.human.rumble(.4, .1);
    if (o.hits >= 3) { o.hits = 0; o.down = 2; o.rig.kick(-1); R.score[a.side]++; a.knocks++; BZ.bus.emit('knockdown', { side: a.side }); }
  },
  end(M) {
    const R = M.rhubarb; R.ended = true; R.endT = 0;
    BZ.sfx('whistle');
    BZ.hud.stamp('BREAK IT UP!', { prio: 3, scale: 3, dur: 2 });
    BZ.talk.show('barb', 'Break it up! Everybody back in your dugouts before I eject the volcano!', 3);
  },
  finish(M) {
    const R = M.rhubarb, O = BZ.offense(M), D = BZ.defense(M);
    const [a, b] = R.score;
    if (!R.training) {
      if (a > b) BZ.supers.gain(M, O.side, BZ.GAINS.rhubarb, 'rhubarb'); else if (b > a) BZ.supers.gain(M, D.side, BZ.GAINS.rhubarb, 'rhubarb'); else { BZ.supers.gain(M, O.side, 20, 'rhubarb'); BZ.supers.gain(M, D.side, 20, 'rhubarb'); }
    }
    BZ.bus.emit('rhubarbEnd', { score: R.score, punches: R.punches, shoves: R.shoves, tosses: R.tosses });
    BZ.talk.say('rhubarb_end', {}, 2);
    M.rhubarb = null;
    BZ.music(M.park.def.music);
    if (R.training) { M.phase = 'training'; M.phaseT = 0; return; }
    // back to baseball: the batter is already on first for the hit-by-pitch
    M.phase = 'atBat'; M.phaseT = 0; M.ab.sub = 'settle'; M.ab.t = 0; M.ab.next = 'batter';
  },
  draw(r, M, t) {
    const R = M.rhubarb; if (!R) return;
    const humans = R.F.filter(f => f.human);
    // AI-only fights far from a human become cartoon fight clouds
    const inCloud = new Set();
    for (const f of R.F) { if (f.human || f.down > 0) continue; const foe = R.F.find(o => o.side !== f.side && !o.human && o.down <= 0 && Math.hypot(o.x - f.x, o.y - f.y) < 16); if (foe && humans.every(h => Math.hypot(h.x - f.x, h.y - f.y) > 50)) { inCloud.add(f); inCloud.add(foe); } }
    for (const f of R.F) {
      if (inCloud.has(f)) continue;
      r.shadow(f.x, f.y, 6, .4);
      r.actor(f.x, f.y, 0, (g, ox, oy) => f.rig.draw(g, ox, oy, r.view), { outline: f.human ? E.PLAYER_COLORS[(f.human.player - 1) % 4] : undefined });
      if (f.down > 0) r.queue(f.x, f.y, 20, g => { const q = r.w(f.x, f.y, 14); for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; E.font.text(g, '★', q[0] + Math.cos(a) * 8, q[1] + Math.sin(a) * 3, '#ffd040'); } }, { bias: 5 });
      if (f.human) BZ.hud.playerArrow(r, f, f.human.player);
    }
    const done = new Set();
    for (const f of inCloud) {
      if (done.has(f)) continue; done.add(f);
      r.queue(f.x, f.y, 10, g => {
        const q = r.w(f.x, f.y, 12), k = Math.max(1, r.view.scale * (r.game.zoom || 1));
        for (let i = 0; i < 7; i++) { const a = t * 9 + i, rr = 9 * k + Math.sin(t * 13 + i) * 2; px.disc(g, q[0] + Math.cos(a) * rr * .8, q[1] + Math.sin(a) * rr * .5, 6 * k, i % 2 ? '#e8e0d0' : '#c8c0b0'); }
        if (Math.floor(t * 8) % 3 === 0) E.font.text(g, ['POW', 'BAM', 'ZOK'][Math.floor(t * 3) % 3], q[0] + 10 * k, q[1] - 10 * k, '#ffd040', { shadow: '#000' });
        px.disc(g, q[0] + Math.cos(t * 17) * 12 * k, q[1] + Math.sin(t * 11) * 6 * k, 2 * k, '#f1c7a0');
      }, { bias: 3 });
    }
  },
  hud(g, r, M) {
    const R = M.rhubarb; if (!R) return;
    E.font.title(g, 'RHUBARB!', r.W / 2, 14, { scale: 2, align: 'center', colors: ['#fff6c0', '#ffb030', '#d8501a'] });
    E.font.text(g, BZ.offense(M).def.abbr + ' ' + R.score[0] + '  -  ' + R.score[1] + ' ' + (R.training ? 'CREW' : BZ.defense(M).def.abbr), r.W / 2, 34, '#ffffff', { align: 'center', shadow: '#000', scale: 1 });
    E.ui.bar(g, r.W / 2 - 50, 46, 100, 4, 1 - R.t / R.dur, '#ffd040');
    for (const f of R.F) if (f.human) BZ.drawPrompts(g, f.human, [['south', 'PUNCH'], ['west', 'SHOVE'], ['north', 'TOSS'], ['east', 'DODGE']], r.W / 2, r.H - 26, { align: 'center' });
  }
};
