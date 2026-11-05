/* BATZOOKA BASEBALL: a bot that plays through the same intents a person produces (tests, and checking the human paths). */
BZ.bot = { skill: .9, enabled: false };
BZ.botIntent = null;
BZ.enableBot = (on, skill = .9) => {
  BZ.bot.skill = skill;
  if (!on) { BZ.botIntent = null; return; }
  BZ.botIntent = (i, M) => {
    const it = { mx: 0, my: 0, throwBase: -1 }, ph = M.phase, batSide = M.half, pitchSide = 1 - M.half;
    if (!M.sides[i].human) return it;
    if (i === batSide) {
      if ((ph === 'windup' || ph === 'pitch') && M.pitch && M.pitch.released) {
        const uv = BZ.pitchUV(M.pitch, M.pitch.T); it.mouse = [uv.fu + (BZ.bot.skill < 1 ? (rnd() - .5) * (1 - BZ.bot.skill) * 2 : 0), uv.fv];
        if (!M.sw && M.pitch.t >= M.pitch.T - .09 && M.swCool <= 0 && M.pitch.t < M.pitch.T + .02) { it.swing = true; it.power = M.sides[i].meter >= 100; }
        if (M.pitch.t < M.pitch.T - .3 && !M.steal && rnd() < .0007) it.steal = true;
      }
      if (ph === 'play') { it.advance = M.playTime > .5 && Math.floor(M.playTime * 3) % 2 === 0 && rnd() < .04; it.turbo = true; }
      if (ph === 'rhubarb') it.swing = Math.floor(M.clock * 12) % 2 === 0;
    }
    if (i === pitchSide) {
      if (ph === 'setup' && M.t > .6) { M.aim.u = rr(-.7, .7); M.aim.v = rr(-.7, .7); it.swing = true; it.next = rnd() < .3; it.power = M.sides[i].meter >= 100; }
      if (ph === 'play') {
        const f = BZ.controlled(i), b = M.ball;
        if (f) {
          const tgt = b.state === 'held' ? null : (M.primaryPt || b), dx = tgt ? tgt.x - f.x : 0, dy = tgt ? tgt.y - f.y : 0, d = hyp(dx, dy);
          if (tgt && d > 3) { it.mx = dx / d; it.my = dy / d; }
          it.turbo = true;
          if (b.state === 'held' && b.holder === f) { const c = BZ.throwChoice(f); if (c >= 0 && f.holdT > .1) it.throwBase = c; }
          if (b.state === 'hit' && b.z > 30 && d < 40 && f.jump <= 0) it.jump = true;
        }
      }
      if (ph === 'rhubarb') it.swing = Math.floor(M.clock * 10) % 2 === 0;
    }
    return it;
  };
};
