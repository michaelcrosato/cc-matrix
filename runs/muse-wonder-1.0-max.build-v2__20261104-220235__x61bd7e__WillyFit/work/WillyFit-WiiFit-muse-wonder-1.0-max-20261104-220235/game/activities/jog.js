// Willy Fit — Coastal Jog (pseudo-3D road feel), Slalom, Tray, Laundry.
window.G = window.G || {};
(function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  G.activity({
    id: 'jog', family: 'jog', discipline: 'Cardio', name: 'Coastal Jog', view: 'brawler',
    classOk: false, hubOk: true, room: 'pier', song: 'jog',
    card: 'Alternate left and right to jog. Stay in the calm zone. Too fast earns a Stitch.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 70, params: { k: 12, c: 6, s: 4, A: 2, nf: 1, R: 0.3 } },
      { dur: 70, params: { k: 12, c: 6, s: 5, A: 2.4, nf: 1.1, R: 0.3 }, longer: true }
    ],
    setup(ctx) {
      for (const c of ctx.contestants) {
        c.cadHist = []; c.zoneT = 0; c.cups = 0; c.dist = 0; c.stitch = 0; c.sprintT = 0; c.x = 0; c.obst = [];
        for (let i = 0; i < 10; i++) c.obst.push({ d: 80 + i * 90 + ctx.rng() * 40, x: (ctx.rng() * 2 - 1) * 30, kind: ctx.rng() < 0.5 ? 'pigeon' : 'cup' });
        c.lastPace = null; c.alt = 0;
      }
    },
    update(dt, ctx) {
      for (const c of ctx.contestants) {
        const it = c.getIntent(dt);
        c.bal.step(dt, it.lean);
        c.x = clamp(c.x + it.lean.x * 40 * dt, -40, 40);
        if (c.stitch > 0) c.stitch -= dt;
        // pace input
        let stepped = false;
        if (c.bot) {
          const cad = { passive: 0.4, poor: 2.0, average: 3.0, good: 3.1, expert: 3.0 }[c.bot.skill] || 3;
          c._botAcc = (c._botAcc || 0) + dt * cad;
          if (c._botAcc >= 1) { c._botAcc -= 1; stepped = true; }
        } else if (c.input) {
          try {
            if (c.input.pressed('paceL') && c.lastPace !== 'L') { c.lastPace = 'L'; stepped = true; }
            if (c.input.pressed('paceR') && c.lastPace !== 'R') { c.lastPace = 'R'; stepped = true; }
          } catch (e) {}
        }
        if (stepped) c.cadHist.push(ctx.time);
        while (c.cadHist.length && c.cadHist[0] < ctx.time - 2) c.cadHist.shift();
        const cad = c.cadHist.length / 2;
        c._cad = cad;
        const lo = G.DEV.jogLo, hi = G.DEV.jogHi;
        const inZone = cad >= lo && cad <= hi && c.stitch <= 0;
        if (inZone) c.zoneT += dt;
        if (cad > 4.2) { c.sprintT += dt; if (c.sprintT > 2 && c.stitch <= 0) { c.stitch = 3; c.sprintT = 0; if (ctx.say) ctx.say('Tare', 'A Stitch. The coast will wait. It is mostly waiting.'); } }
        else c.sprintT = Math.max(0, c.sprintT - dt);
        const speed = c.stitch > 0 ? 18 : (20 + cad * 22) * G.DEV.jogSpeed;
        c.dist += speed * dt;
        for (const o of c.obst) {
          const rel = o.d - c.dist;
          if (rel < 4 && rel > -4 && !o.done) {
            o.done = true;
            if (o.kind === 'cup' && Math.abs(c.x - o.x) < 14) { c.cups++; G.sfx('clink'); }
            if (o.kind === 'pigeon' && Math.abs(c.x - o.x) < 10) { c.dist -= 8; G.sfx('gull'); }
          }
        }
        c.rig.wob = [c.bal.p.x * 0.4, c.bal.p.y * 0.4];
        G.setClipPose(c.rig, 'CMU:Run_Loop', ctx.time * Math.max(0.6, cad * 0.35), Math.PI);
        c._speed = speed;
      }
    },
    result(ctx) {
      const c = ctx.contestants[0];
      const maxCups = c.obst.filter(o => o.kind === 'cup').length || 1;
      const pct = clamp(0.7 * (c.zoneT / ctx.tierDef.dur) + 0.3 * (c.cups / maxCups), 0, 1);
      return { pct: pct, detail: Math.round(c.zoneT) + 's in the calm zone · ' + c.cups + ' cups' };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.x / 40, c._cad || 0], s: Math.round(c.dist) }; }
  });
  G.activity({
    id: 'slalom', family: 'slalom', discipline: 'Balance', name: 'Mount Posture Slalom', view: 'brawler',
    classOk: false, hubOk: true, room: 'mount', song: 'ski',
    card: 'Lean to steer through the gates. Lean forward to tuck, back to brake. Snowmen are not gates.',
    stars: [0.35, 0.65, 0.90],
    tiers: [
      { dur: 75, course: 'slalom1', params: { k: 12, c: 6, s: 4, A: 2, nf: 1, R: 0.3 } },
      { dur: 75, course: 'slalom2', fog: true, params: { k: 12, c: 6, s: 5, A: 2.4, nf: 1.1, R: 0.3 } }
    ],
    setup(ctx) {
      const course = G.COURSES[ctx.tierDef.course];
      for (const c of ctx.contestants) {
        c.gate = 0; c.missed = 0; c.tumbles = 0; c.z = 0; c.x = 0; c.speedF = 1; c.finished = false; c.finishT = 0;
        c.obst = course.gates.map((gx, i) => ({ gx: gx, i: i }));
        c.snow = [{ gx: 12, at: 5 }, { gx: -18, at: 11 }];
      }
      ctx.course = course;
    },
    update(dt, ctx) {
      const course = ctx.course;
      for (const c of ctx.contestants) {
        if (c.finished) continue;
        const it = c.getIntent(dt);
        c.bal.step(dt, it.lean);
        let steer = it.lean.x;
        if (c.bot) {
          const target = c.gate < course.gates.length ? course.gates[c.gate] : 0;
          const skillErr = { passive: 30, poor: 16, average: 7, good: 3, expert: 1.5 }[c.bot.skill] || 7;
          steer = clamp((target - c.x) / 30 + Math.sin(ctx.time * 1.3) * skillErr * 0.01, -1, 1);
          if (c.bot.skill === 'passive') steer = 0;
        }
        c.x = clamp(c.x + steer * 90 * dt * (G.DEV.slalomTurn || 1), -55, 55);
        let sp = (G.DEV.slalomSpeed || 220) * 0.052; // course units/s scaled (~60 s lap at speed 1)
        if (it.lean.y < -0.3) sp *= 1.35; if (it.lean.y > 0.3) sp *= 0.6;
        if (c.bot) sp *= { passive: 0.3, poor: 0.8, average: 0.95, good: 1.0, expert: 1.05 }[c.bot.skill] || 1;
        c.z += sp * dt;
        const gateZ = (c.gate + 1) * 38;
        if (c.z >= gateZ) {
          const gx = course.gates[c.gate];
          if (Math.abs(c.x - gx) > course.gateW / 2) { c.missed++; }
          c.gate++;
          if (c.gate >= course.gates.length) { c.finished = true; c.finishT = ctx.time + c.missed * 3 + c.tumbles * 1.2; }
        }
        for (const s of c.snow) { if (!s.done && Math.abs(c.z - (s.at + 1) * 38) < 3 && Math.abs(c.x - s.gx) < 8) { s.done = true; c.tumbles++; c.z -= 6; G.sfx('stumbleS'); } }
        c.rig.wob = [steer * 0.6, c.bal.p.y * 0.3];
        try { c.rig.update(0, {}); } catch (e) {}
      }
    },
    result(ctx) {
      const c = ctx.contestants[0], course = ctx.course;
      const t = c.finished ? c.finishT : ctx.tierDef.dur + c.missed * 3;
      const pct = clamp(1 - (t - course.par) / Math.max(1, course.worst - course.par), 0, 1);
      return { pct: pct, detail: 'Time ' + t.toFixed(1) + 's · ' + c.missed + ' missed · ' + G.LINES.gertrudeTimes };
    },
    ghost(ctx) { const c = ctx.contestants[0]; return { l: [c.x / 55, c.z / 700], s: c.gate }; }
  });
})();
