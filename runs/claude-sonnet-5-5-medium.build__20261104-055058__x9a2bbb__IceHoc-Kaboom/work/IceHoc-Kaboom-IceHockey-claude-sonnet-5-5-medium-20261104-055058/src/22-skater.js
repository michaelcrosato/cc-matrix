/* ---- SKATING: the pure step (the network prediction runs it too) ---- */
const Skating = (() => {
  const mult = (s) => ({ spd: .85 + .05 * s.rt.spd, hit: .8 + .067 * s.rt.hit });
  /** st: { x,y,vx,vy,heading,state,st,turbo,rt,hasPuck,winding,tactic } intent: { mx,my,turbo } returns events array of strings */
  function skateStep(s, it, dt, extra = {}) {
    const ev = [];
    let vmax = T.skateMax * (.85 + .05 * s.rt.spd);
    const wantTurbo = it.turbo && s.turbo > 0 && (Math.hypot(it.mx, it.my) > .2 || Math.hypot(s.vx, s.vy) > 40);
    const free = extra.infiniteTurbo;
    if (wantTurbo) { vmax *= T.turboMul; if (!free) s.turbo = Math.max(0, s.turbo - T.turboDrain * dt); s.turboIdle = 0; s.turboOn = true; }
    else { s.turboOn = false; s.turboIdle = (s.turboIdle || 0) + dt; if (s.turboIdle > .6) s.turbo = Math.min(1, s.turbo + T.turboRegen * dt); }
    if (free) s.turbo = 1;
    if (s.hasPuck) vmax *= .94; if (s.winding) vmax *= .6; if (extra.speedMul) vmax *= extra.speedMul;
    let sp = Math.hypot(s.vx, s.vy), hd = sp > 8 ? Math.atan2(s.vy, s.vx) : s.heading;
    const mlen = Math.min(1, Math.hypot(it.mx, it.my));
    if (s.state === 'stop') {
      const dec = T.stopDecel * dt; sp = Math.max(0, sp - dec); s.vx = Math.cos(hd) * sp; s.vy = Math.sin(hd) * sp;
      s.stopT -= dt; if (s.stopT <= 0 || sp < 20) { s.state = 'skate'; s.st = 0; }
      return ev;
    }
    if (mlen > .15) {
      const ta = Math.atan2(it.my, it.mx), diff = U.angDiff(hd, ta);
      if (sp > 60 && Math.abs(diff) > 2.1 && !extra.noStop) { s.state = 'stop'; s.stopT = .22; s.stopDir = ta; ev.push('stop'); return ev; }
      if (sp < 22) { s.vx += it.mx * T.skateAccel * dt * 1.2; s.vy += it.my * T.skateAccel * dt * 1.2; }
      else {
        const rate = lerp(T.turnSlow, T.turnFast, clamp(sp / vmax, 0, 1)) * (extra.turnMul || 1);
        hd += clamp(diff, -rate * dt, rate * dt);
        const acc = T.skateAccel * (1 - .6 * (sp / vmax) ** 2) * mlen * dt;
        sp = sp > vmax ? Math.max(vmax, sp - 200 * dt) : Math.min(vmax, sp + acc);
        s.vx = Math.cos(hd) * sp; s.vy = Math.sin(hd) * sp;
      }
    } else { sp = Math.max(0, sp - T.iceGlide * dt); if (sp > 0) { s.vx = Math.cos(hd) * sp; s.vy = Math.sin(hd) * sp; } else { s.vx = 0; s.vy = 0; } }
    const sp2 = Math.hypot(s.vx, s.vy); if (sp2 > vmax * 1.02 && sp2 > 8 && mlen > .15) { const k = Math.max(vmax, sp2 - 400 * dt) / sp2; s.vx *= k; s.vy *= k; }
    if (sp2 > 10) { const th = Math.atan2(s.vy, s.vx); s.heading += clamp(U.angDiff(s.heading, th), -9 * dt, 9 * dt); }
    else if (mlen > .15) { const th = Math.atan2(it.my, it.mx); s.heading += clamp(U.angDiff(s.heading, th), -9 * dt, 9 * dt); }
    return ev;
  }
  return { skateStep, mult };
})();
