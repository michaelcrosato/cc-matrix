// Olympiyikes! summer events: 100m Dash, Javelin, 50m Freestyle, 10m Diving, Archery, Weightlifting.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp, M = O.M;
const rr = (l, run) => O.rng(l + ':' + (run ? run.natId + ':' + run.attempt : ''));

// the seven CPU lanes of a race (finish times from the event's CPU roll)
O.rivalsFor = (run) => {
  const ev = run.ev, m = O.meet; const out = [];
  const cpu = m ? O.cpuRoll(m, ev) : null;
  const nats = O.NATIONS.filter(n => n.id !== run.natId);
  nats.forEach((n, i) => { out.push({ nat: n, T: cpu ? cpu[n.id] : ev.cpu.mean + i * .1, rig: O.makeRig(n), lane: i });});
  out.sort((a, b) => a.T - b.T);
  return out;
};
const LS = 20;
const prof = u => (u >= 1 ? 1 : 1.25 * u - .25 * u * u);
// attempt-level timing helper: quality 0..1 of a press near a target time
const q = (d, w) => clamp(1 - Math.abs(d) / w, 0, 1);

// ================================================================ 100m DASH
O.defEvent('sprint', {
  name: '100m Dash', season: 'summer', venue: 'stadium', music: 'summer', view: 'brawler', dir: -1, wr: 9.58, qual: 11.9, cpu: { mean: 10.55, sd: .42 }, fail: 30, unit: 's',
  fmt: v => v.toFixed(2) + ' s', goal: 'Mash left and right to sprint. Wait for the gun. Dip at the line!', attemptLabel: 'RACE', maxT: 40,
  desc: 'Alternate the two buttons as fast as you can. A false start costs a full second.',
  rows: run => [[['mashL', 'mashR'], 'Run'], ['action', 'Dip']],
  init(run) {
    const S = run.S; S.x = 0; S.v = 0; S.phase = 'set'; S.gunAt = 1.8 + rr('sprint:gun', run)() * 1.6; S.rt = 0; S.react = null; S.pen = 0; S.dip = false; S.fs = false; S.lean = 0;
    run.rivals = O.rivalsFor(run); run.rivalX = run.rivals.map(() => 0);
    run.hudMain = '0.00'; run.hudSub = 'ON YOUR MARKS'; game.audio.sfx('ol_whistle');
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'set') {
      if (S.gunAt - run.t < 1.1 && run.hudSub !== 'SET') run.hudSub = 'SET';
      if (!settle && (inp.L || inp.R) && !S.fs) { S.fs = true; S.pen = 1; run.yikesNow('FALSE START!'); }
      if (run.t >= S.gunAt) { S.phase = 'run'; O.sfx('ol_gun'); run.hudSub = ''; O.Comms.say('start'); }
    }
    if (S.phase === 'run' && !S.over) {
      S.rt += dt;
      const rate = run.mashStep(inp, dt, 7);
      if (S.react === null && (inp.L || inp.R)) S.react = S.rt;
      const turbo = run.tb;
      S.v += (5.3 * rate * turbo - .43 * S.v) * dt;
      if (rate > .85) run.addHype(dt * .16); else if (rate < .3) run.hype = Math.max(0, run.hype - dt * .05);
      if (inp.A && S.x > 94 && !S.dip) { S.dip = true; S.lean = 1; }
      S.x += S.v * dt;
      if (S.x >= 100) {
        const t = S.rt + S.pen - (S.dip && S.x < 101.5 ? .04 : 0) - (S.x - 100) / Math.max(S.v, 1);
        S.fin = t; run.endAttempt(t, S.fs ? 'False start +1.0' : (S.dip ? 'Dip!' : ''));
        if (O.Records.isWR(run.ev, t)) { run.stamp('WORLD RECORD!'); O.Comms.say('record'); O.Fireworks.burst(160, 80); } else if (t < 10.2) { run.stamp('GREAT RUN!'); O.Comms.say('great'); } else O.Comms.say('good');
        run.addHype(.1);
      }
      run.hudMain = S.rt.toFixed(2);
    }
    if (S.over) { S.v = Math.max(0, S.v - 6 * dt); S.x += S.v * dt; }
    run.rivals.forEach((rv, i) => { const u = S.phase === 'run' || S.over ? Math.max(0, (S.rt) / rv.T) : 0; run.rivalX[i] = 100 * prof(Math.min(1.12, u)) + (u > 1 ? (u - 1) * 8 : 0); rv.lastV = (run.rivalX[i] - (rv.px || 0)) / Math.max(dt, 1e-4); rv.px = run.rivalX[i]; });
    const laneY = 3 * LS, spd = S.v * M * (S.phase === 'set' ? 0 : 1);
    run.rig.update(dt, { x: S.x * M, y: laneY, z: 0, vx: spd, vy: 0, facing: 0, pose: S.phase === 'set' ? 'crouch' : S.lean > 0 && !S.over ? undefined : (S.over && run.score !== null ? 'cheer' : undefined), run: S.phase === 'run' ? clamp(S.v / 10, 0, 1) : 0 });
    run.rivals.forEach((rv, i) => { rv.rig.update(dt, { x: run.rivalX[i] * M, y: (i < 3 ? i : i + 1) * LS, z: 0, vx: S.phase === 'set' ? 0 : Math.max(0, (rv.lastV || 0)) * M, vy: 0, facing: 0, pose: S.phase === 'set' ? 'crouch' : undefined }); });
    game.focus(S.x * M + 90, laneY, 18);
  },
  draw(run, r) {
    const S = run.S, bd = O.backdrop('stadium'); bd.draw(r);
    r.decal(g => {
      const cam = S.x * M, x0 = cam - 320, x1 = cam + 520, ty = Math.min(r.w(cam, -LS, 0)[1], r.w(cam, 8 * LS, 0)[1]);
      O.stands(g, r, ty - 52, 50, 31, run.stampT < 1.5 ? .9 : .35, cam);
      px.rect(g, 0, ty - 2, r.W, r.H, '#4b7a3a');
      O.groundQuad(r, g, x0, -LS / 2, x1, 7.5 * LS, '#c4553a');
      for (let l = 0; l <= 8; l++) O.groundQuad(r, g, x0, l * LS - LS / 2 - .6, x1, l * LS - LS / 2 + .6, '#f4f4f4');
      O.groundQuad(r, g, -1.5, -LS / 2, 1.5, 7.5 * LS, '#f4f4f4');
      O.groundQuad(r, g, 100 * M - 2, -LS / 2, 100 * M + 2, 7.5 * LS, '#fff');
      for (let k = 10; k < 100; k += 10) O.groundQuad(r, g, k * M - .5, -LS / 2, k * M + .5, -LS / 2 + 3, '#fff');
      for (let k = 0; k < 8; k++) { const pa = r.w(100 * M, k * LS - LS / 2, 0); px.rect(g, pa[0] - 1, pa[1] - 6, 2, 6, '#ddd'); }
    });
    const act = (rig, x, y) => r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
    run.rivals.forEach((rv, i) => act(rv.rig, run.rivalX[i] * M, (i < 3 ? i : i + 1) * LS));
    act(run.rig, S.x * M, 3 * LS);
    r.shadow(S.x * M, 3 * LS, 6);
    if (run.turboT > 0) game.particles.fire(S.x * M - 6, 3 * 14, 4, 1, { size: 2 });
  },
  hudExtra(run, g, r) {
    const S = run.S; if (S.phase === 'set' && run.t > 0) { O.banner(g, r, run.hudSub, r.H * .36, '#fff', 3); }
    // speed gauge
    const gw = 70, gx = r.W - gw - 14, gy = r.H - 54; px.rect(g, gx, gy, gw, 8, '#161a3c'); px.rect(g, gx + 1, gy + 1, (gw - 2) * clamp(S.v / 12.4, 0, 1), 6, '#4fe0a8'); O.T(g, 'SPEED', gx, gy - 9, '#fff', { s: 1 });
    const pos = run.rivalX ? run.rivalX.filter(x => x > S.x).length + 1 : 1; if (S.phase === 'run' && !S.over) O.T(g, 'POS ' + pos, gx + gw, gy - 9, '#ffe27a', { s: 1, align: 'right' });
  },
  bot(run, inp, dt) {
    const S = run.S; S.bt = (S.bt || 0) + dt;
    if (S.phase === 'run') { if (S.bt > 1 / 7.6) { S.bt = 0; S.bs = !S.bs; if (S.bs) inp.L = true; else inp.R = true; } if (S.x > 96) inp.A = true; }
    if (run.hype >= 1) inp.T = true;
  }
});

// ================================================================ JAVELIN
O.defEvent('javelin', {
  name: 'Javelin', season: 'summer', venue: 'stadium', music: 'summer', view: 'brawler', dir: 1, wr: 98.48, qual: 58, cpu: { mean: 79, sd: 6.5 }, fail: 0, unit: 'm', attempts: 2, attemptLabel: 'THROW', overDelay: 2.4,
  fmt: v => v.toFixed(2) + ' m', goal: 'Mash to build speed. Hold to set the angle, release before the line!', maxT: 40,
  desc: 'Run up, hold the throw button while the angle swings, release near 40 degrees. Cross the line first and it is a foul.',
  rows: run => [[['mashL', 'mashR'], 'Run-up'], ['action', 'Hold: angle  Release: throw']],
  init(run) { const S = run.S; S.x = 0; S.v = 0; S.phase = 'run'; S.ang = 0; S.hold = false; S.wind = (rr('javelin:wind', run)() - .5) * 8 * O.tune.wind; S.fl = 38; S.thr = null; S.u = 0; run.hudMain = ''; run.hudSub = 'WIND ' + (S.wind >= 0 ? '+' : '') + S.wind.toFixed(1); S.throwT = 9; O.sfx('ol_whistle'); },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'run') {
      const rate = run.mashStep(inp, dt, 7); S.v += (5.2 * rate * run.tb - .45 * S.v) * dt; S.x += S.v * dt;
      if (rate > .8) run.addHype(dt * .1);
      if (inp.A) S.hold = true;
      if (S.hold) { S.ph = (S.ph || 0) + dt * 1.5; const tri = Math.abs(((S.ph) % 2) - 1); S.ang = 15 + tri * 50; }
      if (S.hold && inp.Au) {   // release: throw
        const vrel = (S.v * .9 + 21) * run.tb; const th = S.ang * Math.PI / 180;
        let d = vrel * vrel / 9.81 * Math.sin(2 * th) * .9 + S.wind * .9; if (S.x > S.fl) d = 0;
        S.thr = { d: Math.max(0, d), th, vrel }; S.phase = 'fly'; S.u = 0; S.throwT = 0; O.sfx('ol_swish');
        S.foul = S.x > S.fl; S.q = q(S.ang - 40, 22);
      } else if (S.x > S.fl + 2) { S.thr = { d: 0, th: .5, vrel: 10 }; S.foul = true; S.phase = 'fly'; S.u = 0; S.throwT = 0; }
      run.hudMain = (S.hold ? Math.round(S.ang) + ' deg' : S.x.toFixed(0) + ' m');
    } else if (S.phase === 'fly') {
      S.throwT += dt; S.u += dt / (S.foul ? .6 : Math.max(1.4, 2 * S.thr.vrel * Math.sin(S.thr.th) / 9.81 * .8));
      if (S.u >= 1 && !S.over) {
        S.phase = 'land'; O.sfx('ol_thunk');
        if (S.foul) { run.yikesNow('FOUL!'); run.endAttempt(0, 'Foul'); }
        else { run.endAttempt(S.thr.d, S.q > .8 ? 'Perfect angle!' : ''); game.particles.dust(S.thr.d * M, 3 * 14, 2, 8);
          if (O.Records.isWR(run.ev, S.thr.d)) { run.stamp('WORLD RECORD!'); O.Comms.say('record'); O.Fireworks.burst(180, 70); } else if (S.thr.d > 86) { run.stamp('MONSTER THROW!'); O.Comms.say('great'); } else if (S.thr.d < 50) O.Comms.say('bad'); else O.Comms.say('good'); run.addHype(S.q * .25); }
        run.hudMain = S.foul ? 'FOUL' : S.thr.d.toFixed(2) + ' m';
      }
    }
    if (S.phase === 'land' || S.over) run.hudMain = S.foul ? 'FOUL' : S.thr.d.toFixed(2) + ' m';
    S.v = S.phase === 'run' ? S.v : S.v * Math.exp(-dt * 3);
    const att = S.throwT < .5 ? E.move('throw', S.throwT / .5) : null;
    run.rig.update(dt, { x: S.x * M, y: 3 * 14, z: 0, vx: S.v * M, vy: 0, facing: 0, run: clamp(S.v / 9, 0, 1), attack: att, pose: S.hold && S.phase === 'run' ? 'hips' : undefined });
    const fx = S.phase === 'fly' || S.phase === 'land' ? (S.x + (S.thr ? S.thr.d : 0) * clamp(S.u, 0, 1) * .5) * M : S.x * M + 90;
    game.focus(S.phase === 'run' ? S.x * M + 90 : Math.max(S.x * M + 60, (S.x + (S.thr ? S.thr.d : 0) * clamp(S.u, 0, 1)) * M - 20), 3 * 14, 18);
  },
  draw(run, r) {
    const S = run.S, bd = O.backdrop('stadium'); bd.draw(r);
    r.decal(g => {
      const cam = game.cam ? S.x * M : 0, cx = Math.max(S.x * M + 60, (S.thr ? (S.x + S.thr.d * clamp(S.u, 0, 1)) * M : 0)), x0 = cx - 380, x1 = cx + 460, ty = Math.min(r.w(cx, -20, 0)[1], r.w(cx, 100, 0)[1]);
      O.stands(g, r, ty - 50, 48, 17, .35, cx);
      px.rect(g, 0, ty - 2, r.W, r.H, '#4b9a4a'); O.groundQuad(r, g, x0, -10, x1, 7 * 14, '#5aa84a');
      O.groundQuad(r, g, -60, 22, S.fl * M + 80, 62, '#c4553a');
      O.groundQuad(r, g, S.fl * M, 20, S.fl * M + 3, 64, '#fff');
      for (let k = 50; k < 110; k += 10) { O.groundQuad(r, g, (S.fl + k) * M, 14, (S.fl + k) * M + 2, 70, 'rgba(255,255,255,.55)'); const p = r.w((S.fl + k) * M, 72, 0); O.T(g, k + '', p[0], p[1] - 9, '#fff', { s: 1, align: 'center' }); }
    });
    r.actor(S.x * M, 3 * 14, 0, (g, ox, oy) => run.rig.draw(g, ox, oy, r.view));
    if (S.thr) { const u = clamp(S.u, 0, 1), dm = S.thr.d, x = (S.x + dm * u) * M, z = 4 * u * (1 - u) * (dm * .26 * Math.sin(S.thr.th) + 4) * M * .55; const ang = -Math.atan2(4 * (1 - 2 * u) * (dm * .26 * Math.sin(S.thr.th) + 4) * .55, dm);
      if (S.phase !== 'run') r.actor(x, 3 * 14, z + 10, (g, ox, oy) => { const ca = Math.cos(-ang * .6), sa = Math.sin(-ang * .6); px.line(g, ox - ca * 12, oy + sa * 12, ox + ca * 12, oy - sa * 12, '#e8e8f0', 2); px.disc(g, ox + ca * 12, oy - sa * 12, 1.5, '#ff4a3a'); }); }
    else if (S.phase === 'run' && S.hold) r.actor(S.x * M + 6, 3 * 14, 30, (g, ox, oy) => { const a = S.ang * Math.PI / 180; px.line(g, ox - Math.cos(a) * 10, oy + Math.sin(a) * 10, ox + Math.cos(a) * 14, oy - Math.sin(a) * 14, '#e8e8f0', 2); });
    else r.actor(S.x * M + 6, 3 * 14, 28, (g, ox, oy) => px.line(g, ox - 10, oy + 1, ox + 14, oy - 3, '#e8e8f0', 2));
  },
  hudExtra(run, g, r) {
    const S = run.S; const gx = r.W / 2 - 60, gy = 38; if (S.phase === 'run') { px.rect(g, gx, gy, 120, 8, '#161a3c'); px.rect(g, gx + 120 * (30 - 15) / 50, gy, 120 * 12 / 50, 8, '#2fb36a'); if (S.hold) px.rect(g, gx + 120 * (S.ang - 15) / 50 - 1, gy - 3, 3, 14, '#ffe27a'); O.T(g, S.hold ? 'RELEASE AT GREEN' : 'LINE IN ' + Math.max(0, S.fl - S.x).toFixed(0) + ' m', r.W / 2, gy + 11, '#fff', { s: 1, align: 'center' }); }
    if (S.foul && S.phase !== 'run') O.banner(g, r, 'FOUL!', r.H * .4, '#ff6a5a', 4);
  },
  bot(run, inp, dt) { const S = run.S; S.bt = (S.bt || 0) + dt; if (S.phase === 'run') { if (S.bt > 1 / 7.6) { S.bt = 0; S.bs = !S.bs; if (S.bs) inp.L = true; else inp.R = true; } if (S.x > 26) { inp.A = true; inp.Ad = true; } if (S.hold && Math.abs(S.ang - 40) < 3 && S.x > 28) inp.Au = true; if (S.x > 35) inp.Au = true; } if (run.hype >= 1) inp.T = true; }
});

// ================================================================ 50m FREESTYLE
O.defEvent('swim', {
  name: '50m Freestyle', season: 'summer', venue: 'pool', music: 'summer', view: 'brawler', dir: -1, wr: 20.91, qual: 32, cpu: { mean: 24.6, sd: 1.1 }, fail: 99.99, unit: 's',
  fmt: v => v.toFixed(2) + ' s', goal: 'Stroke on the beat. Breathe when the bubbles run low. Flip at the wall!', attemptLabel: 'RACE', maxT: 70,
  desc: 'Alternate the arm buttons in time. Hold the breathe button to gulp air, but you slow down. Press the action button at the wall to flip.',
  rows: run => [[['mashL', 'mashR'], 'Stroke'], ['alt', 'Breathe'], ['action', 'Dive / Flip']],
  init(run) { const S = run.S; S.pos = 0; S.v = 0; S.phase = 'set'; S.gunAt = 1.8 + rr('swim:gun', run)() * 1.4; S.rt = 0; S.breath = 1; S.gasp = 0; S.flip = false; S.flipped = false; S.dive = 0; S.stroke = 0; S.pen = 0; S.fs = false;
    run.rivals = O.rivalsFor(run); run.rivalX = run.rivals.map(() => 0); run.hudMain = '0.00'; run.hudSub = 'TAKE YOUR MARKS'; O.sfx('ol_whistle'); },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'set') {
      if (S.gunAt - run.t < 1 && run.hudSub !== 'SET') run.hudSub = 'SET';
      if (!settle && inp.A && run.t < S.gunAt - .05 && !S.fs) { S.fs = true; S.pen = 1; run.yikesNow('FALSE START!'); }
      if (run.t >= S.gunAt) { S.phase = 'dive'; S.react = null; O.sfx('ol_gun'); run.hudSub = ''; }
    }
    if (S.phase === 'dive') { S.rt += dt; if (S.react === null && inp.A) { S.react = S.rt; S.dive = q(S.rt - .22, .5) * 4 + 1.5; S.v = 1.8 + S.dive * .6; S.phase = 'swim'; O.sfx('ol_splash'); game.particles.dust(0, 3 * LS, 2, 8); if (S.dive > 4.5) run.stamp('PERFECT DIVE!'); }
      else if (S.rt > .9) { S.dive = 1; S.v = 1.4; S.phase = 'swim'; O.sfx('ol_splash'); } }
    if (S.phase === 'swim' && !S.over) {
      S.rt += dt;
      const rate = run.mashStep(inp, dt, 6), gasping = S.gasp > 0;
      const breathing = inp.alt && !gasping;
      S.breath += (breathing ? .5 : -.075 * (.4 + rate)) * dt; S.breath = clamp(S.breath, 0, 1);
      if (S.breath <= 0 && !gasping) { S.gasp = 1.6; run.yikesNow('GLUB GLUB!'); }
      if (S.gasp > 0) { S.gasp -= dt; if (S.gasp <= 0) S.breath = .4; }
      const eff = gasping ? .25 : breathing ? .55 : 1;
      S.v += (3.0 * rate * eff * run.tb - 1.25 * S.v) * dt;
      if (rate > .85 && S.breath > .3) run.addHype(dt * .14);
      S.stroke += (S.v * .55 + .3) * dt * 6;
      // flip turn at the wall
      const lap = S.pos < 25 ? 0 : 1;
      if (S.pos < 25 && S.pos + S.v * dt >= 24.2 && !S.flip && !S.flipped) { S.flip = true; S.flipT = 0; }
      if (S.flip) { S.flipT += dt; if (inp.A && !S.flipHit) { S.flipHit = q(S.flipT - .35, .5); } if (S.pos >= 25 || S.flipT > .8) { if (S.flipHit === undefined) { S.v *= .5; run.yikesNow('LATE FLIP!', .05); } else if (S.flipHit > .5) { S.v *= 1.06; run.stamp('SMOOTH FLIP!'); run.addHype(.12); } else { S.v *= .8; } S.flip = false; S.flipped = true; } }
      S.pos += S.v * dt;
      if (S.pos >= 49.99) { const t = S.rt + S.pen; run.endAttempt(t, S.fs ? 'False start +1.0' : ''); S.pos = 50;
        if (O.Records.isWR(run.ev, t)) { run.stamp('WORLD RECORD!'); O.Comms.say('record'); O.Fireworks.burst(160, 80); } else if (t < 23.5) { run.stamp('FANTASTIC!'); O.Comms.say('great'); } else O.Comms.say('good'); }
      run.hudMain = (S.rt + S.pen).toFixed(2); if (S.breath < .25 && !gasping) run.hudSub = 'BREATHE!'; else run.hudSub = '';
    }
    if (S.over) S.v *= Math.exp(-dt * 2);
    run.rivals.forEach((rv, i) => { const u = S.phase === 'swim' || S.phase === 'dive' || S.over ? S.rt / rv.T : 0; run.rivalX[i] = 50 * prof(Math.min(1.1, Math.max(0, u))); });
    game.focus(this.worldX(S.pos) * M, 3 * LS, 6);
  },
  worldX(p) { return p <= 25 ? p : 50 - p; },
  draw(run, r) {
    const S = run.S, bd = O.backdrop('pool'); bd.draw(r); const cx = this.worldX(S.pos) * M;
    r.decal(g => {
      const ty = Math.min(r.w(cx, -20, 0)[1], r.w(cx, 8 * LS, 0)[1]);
      O.stands(g, r, ty - 50, 48, 9, run.stampT < 1.5 ? .9 : .3, cx);
      px.rect(g, 0, ty - 2, r.W, r.H, '#cfe9f5'); O.groundQuad(r, g, -90, -8, 25 * M + 90, 8 * LS + 2, '#2f9be0'); O.groundQuad(r, g, -90, -8, 25 * M + 90, 8 * LS + 2, 'rgba(255,255,255,.1)');
      for (let l = 0; l < 8; l++) { O.groundQuad(r, g, 0, l * LS + LS / 2 - .6, 25 * M, l * LS + LS / 2 + .6, '#e8f3ff'); O.groundQuad(r, g, 0, l * LS - .4, 25 * M, l * LS + .4, 'rgba(10,50,120,.35)'); for (let k = 0; k < 25 * M; k += 18) { const p = r.w(k, l * LS + LS / 2, 0); px.rect(g, p[0], p[1] - 1, 4, 2, l % 2 ? '#e8443a' : '#fff'); } }
      O.groundQuad(r, g, -6, -8, 0, 8 * LS + 2, '#fff'); O.groundQuad(r, g, 25 * M, -8, 25 * M + 6, 8 * LS + 2, '#fff');
      for (let k = 0; k < 8; k++) { const p = r.w(-2, k * LS, 0); px.rect(g, p[0] - 4, p[1] - 12, 6, 12, '#ddd'); }
      const bt = game.real; for (let k = 0; k < 14; k++) { const x = cx - 160 + (k * 57 + bt * 20) % 340, p = r.w(x, 3 * LS + 8, 0); px.rect(g, p[0], p[1] + Math.sin(bt * 3 + k) * 2, 5, 1, 'rgba(255,255,255,.35)'); }
    });
    const fig = (nat, p, lane, stroke, swimming, vis) => {
      const dir = p <= 25 ? 1 : -1, x = this.worldX(p) * M; const lx = lane * LS;
      r.actor(x, lx, 0, (g, ox, oy) => {
        const ang = dir > 0 ? 0 : Math.PI, s = Math.sin(stroke), c = Math.cos(stroke);
        const pose = { armA: dir * (s * 1.3 - .3) + (dir < 0 ? Math.PI * 0 : 0), armB: dir * (-s * 1.3 - .3), legA: Math.PI + c * .3, legB: Math.PI - c * .3, kneeA: 0, kneeB: 0 };
        if (dir < 0) { pose.armA = -(s * 1.3 - .3); pose.armB = -(-s * 1.3 - .3); }
        O.drawFig(g, ox, oy + 2, ang, swimming ? { armA: (dir > 0 ? 1 : -1) * (.3 + s * .75), armB: (dir > 0 ? 1 : -1) * (.3 - s * .75), legA: Math.PI + c * .25, legB: Math.PI - c * .25 } : pose, nat, 1.5);
        px.rect(g, ox - 14, oy + 4, 32, 1, 'rgba(255,255,255,.5)'); }, { alpha: 1 });
    };
    run.rivals.forEach((rv, i) => fig(rv.nat, run.rivalX[i], (i < 3 ? i : i + 1), game.real * (5 + i * .1) * 2, true));
    fig(run.nat, S.pos, 3, S.stroke, S.phase === 'swim' || S.phase === 'dive' || S.over);
    if (S.phase === 'set') { r.actor(0, 3 * LS, 0, (g, ox, oy) => run.rig.draw(g, ox, oy, r.view)); }
  },
  hudExtra(run, g, r) {
    const S = run.S; const bx = r.W - 84, by = r.H - 54;
    px.rect(g, bx, by, 70, 8, '#161a3c'); px.rect(g, bx + 1, by + 1, 68 * S.breath, 6, S.breath < .25 ? '#ff4a3a' : '#7fe0ff'); O.T(g, 'BREATH', bx, by - 9, S.breath < .25 ? '#ff8a7a' : '#fff', { s: 1 });
    O.T(g, Math.min(50, Math.round(S.pos)) + ' / 50 m', r.W / 2, 32, '#fff', { s: 1, align: 'center' });
    if (S.flip) O.banner(g, r, 'FLIP!', r.H * .38, '#ffe27a', 3, .9);
    if (S.phase === 'dive') O.banner(g, r, 'DIVE!', r.H * .38, '#ffe27a', 3);
    if (S.phase === 'set') O.banner(g, r, run.hudSub, r.H * .36, '#fff', 3);
  },
  bot(run, inp, dt) {
    const S = run.S; S.bt = (S.bt || 0) + dt;
    if (S.phase === 'dive' && S.rt > .22) inp.A = true;
    if (S.phase === 'swim') { if (S.bt > 1 / 6.6) { S.bt = 0; S.bs = !S.bs; if (S.bs) inp.L = true; else inp.R = true; } if (S.breath < .35) inp.alt = true; if (S.flip && S.flipT > .3) inp.A = true; }
    if (run.hype >= 1) inp.T = true;
  }
});

// ================================================================ 10m DIVING
const DIVES = [{ name: 'FORWARD 1.5 PIKE', k: 1, tw: 0 }, { name: 'FORWARD 2.5 TUCK', k: 2, tw: 0 }, { name: 'REVERSE 1.5 TWIST', k: 1, tw: 1 }, { name: 'FORWARD 2.5 TWIST', k: 2, tw: 1 }];
O.defEvent('diving', {
  name: '10m Diving', season: 'summer', venue: 'pool', music: 'summer', view: 'side', zoom: .8, dir: 1, wr: 98.5, qual: 40, cpu: { mean: 72, sd: 9 }, fail: 0, unit: 'pts', attempts: 2, attemptLabel: 'DIVE', overDelay: 2.6,
  fmt: v => v.toFixed(1) + ' pts', goal: 'Jump on the beat. Hold tuck or pike to spin. Enter the water head-first!', maxT: 40,
  desc: 'Press action when the marker hits the middle. Hold tuck to spin fast, pike for medium, nothing to straighten. Tap left or right for twists.',
  rows: run => [['action', 'Take off'], ['mashL', 'Tuck'], ['mashR', 'Pike'], [['left', 'right'], 'Twist']],
  init(run) {
    const S = run.S, d = DIVES[Math.floor(rr('diving:card', run)() * DIVES.length)]; S.dive = d; S.phase = 'stand'; S.mk = 0; S.th = 0; S.x = 0; S.z = 10 * M; S.vz = 0; S.vx = 0; S.tw = 0; S.pose = 'layout'; S.req = 180 + 360 * d.k; S.fl = 0; S.q = 0; S.j = null; S.splash = 0;
    run.hudMain = ''; run.hudSub = ''; O.sfx('ol_whistle');
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'stand') { S.mk += dt * 1.1 * (1 + O.win() * 0); const pos = Math.abs(((S.mk) % 2) - 1); S.mp = pos; if (inp.A && !settle) { S.q = q(pos - .5, .5 / Math.max(.6, O.win() * .9)); S.phase = 'air'; S.vz = 3.2 * M + S.q * 2.2 * M; S.vx = 1.2 * M; S.t0 = run.t; S.th = 0; O.sfx('ol_dive'); S.fl = 0; if (S.q > .9) { run.stamp('GREAT JUMP!'); run.addHype(.1); } } else if (run.t > 14) { S.mp = .1; S.q = 0; S.phase = 'air'; S.vz = 2.4 * M; S.vx = 1 * M; } }
    else if (S.phase === 'air' && !S.over) {
      S.fl += dt; const grav = 11 * M * (S.q > .9 ? .9 : 1);
      S.vz -= grav * dt; S.x += S.vx * dt; S.z += S.vz * dt;
      const tuck = (inp.Lh || (game.settings.mashAssist === 'One button' && inp.Rh)), pike = inp.Rh && !tuck;
      S.pose = tuck ? 'tuck' : pike ? 'pike' : 'layout';
      const sp = (tuck ? 560 : pike ? 410 : 240) * run.tb;
      S.th += sp * dt;
      if (inp.left || inp.right) { S.tw++; O.sfx('ol_tick'); }
      if (S.z <= 0) {   // entry
        S.z = 0; const err = S.th - S.req; S.err = err; const rot = Math.abs(err);
        let j = 10 - rot / 14 - (1 - S.q) * 1.6 - (S.tw !== S.dive.tw ? Math.min(2, Math.abs(S.tw - S.dive.tw) * 1.2) : 0); if (rot < 9) j += .6;
        const rj = rr('judges:diving', run); const js = [0, 1, 2].map(() => clamp(j + (rj() - .5) * .8, 0, 9.9)); const tot = (js.reduce((a, b) => a + b, 0) / 3) * 10 * (O.cheat.perfect && run.bot ? 1 : 1);
        S.j = js; S.tot = tot; S.phase = 'splash'; S.splash = 1; O.sfx('ol_splash'); game.particles.dust(S.x, 0, 0, 12); game.shake(rot > 60 ? 6 : 2);
        if (rot > 70) { run.yikesNow('BELLY FLOP!'); O.Comms.say('bad'); } else if (rot < 10) { run.stamp('RIPPLE-FREE!'); O.Comms.say('great'); run.addHype(.3); } else { O.Comms.say(tot > 70 ? 'good' : 'bad'); }
        run.endAttempt(clamp(tot, 0, 100), rot < 10 ? 'Rip entry' : '');
        if (O.Records.isWR(run.ev, tot)) { run.stamp('WORLD RECORD!'); O.Fireworks.burst(170, 70); }
        run.hudMain = tot.toFixed(1);
      }
      run.hudMain = Math.round(S.th / 360 * 10) / 10 + ' / ' + (S.req / 360).toFixed(1);
    }
    if (S.phase === 'splash') S.splash = Math.max(0, S.splash - dt * .6);
    const ang = -Math.PI / 2 + S.th * Math.PI / 180;
    S.ang = ang; S.fx = S.x;
    game.focus(S.phase === 'stand' ? 30 : Math.max(0, S.x) + 10, 0, S.phase === 'splash' ? 40 : Math.max(30, S.z * .55 + 6));
  },
  draw(run, r) {
    const S = run.S; const bd = O.backdrop('pool'); bd.draw(r);
    r.decal(g => {
      const a = r.w(-60, 0, 0), b = r.w(300, 0, 0), t0 = r.w(-60, 0, 10 * M);
      O.stands(g, r, a[1] - 130, 56, 4, .4, S.x);
      px.rect(g, 0, a[1] - 74, r.W, 74, '#cfe9f5'); px.rect(g, 0, a[1], r.W, r.H, '#1e8fd8'); px.rect(g, 0, a[1], r.W, 2, '#bfeaff');
      for (let k = 0; k < 20; k++) px.rect(g, (k * 41 + game.real * 14) % r.W, a[1] + 6 + (k * 17) % 60, 8, 1, 'rgba(255,255,255,.3)');
      const tw = r.w(-8, 0, 0); px.rect(g, tw[0] - 24, a[1] - 10 * M * 1.0 - 2, 10, 10 * M + 2, '#c9ccd8'); px.rect(g, tw[0] - 24, a[1] - 10 * M - 3, 54, 3, '#6a7088'); px.rect(g, tw[0] - 22, a[1] - 10 * M - 6, 48, 3, '#ffe27a');
    });
    r.actor(S.phase === 'stand' ? 0 : S.x, 0, S.phase === 'stand' ? 10 * M : Math.max(S.z, 0), (g, ox, oy) => {
      if (S.phase === 'stand') { O.drawFig(g, ox, oy - 10, -Math.PI / 2, { armA: -.4, armB: -.4, legA: Math.PI, legB: Math.PI }, run.nat, 1.1); return; }
      const poses = { layout: { armA: 0, armB: 0, legA: Math.PI, legB: Math.PI }, tuck: { armA: 2.5, armB: 2.5, elbA: -2.2, elbB: -2.2, legA: 2.2, legB: 2.2, kneeA: 2.0, kneeB: 2.0 }, pike: { armA: 2.7, armB: 2.7, legA: 1.5, legB: 1.5, kneeA: 0, kneeB: 0 } };
      O.drawFig(g, ox, oy - 6, S.ang, poses[S.pose] || poses.layout, run.nat, 1.1);
      if (S.phase === 'splash' && S.splash > 0) for (let k = 0; k < 10; k++) px.rect(g, ox - 12 + k * 2.5 + Math.sin(k * 3) * 4, oy - (1 - S.splash) * 22 * (1 + (k % 3) * .3), 2, 3, 'rgba(255,255,255,' + S.splash + ')');
    });
  },
  hudExtra(run, g, r) {
    const S = run.S;
    if (S.phase === 'stand') { const bw = 140, bx = r.W / 2 - bw / 2, by = 40; px.rect(g, bx, by, bw, 10, '#161a3c'); px.rect(g, bx + bw / 2 - 14, by, 28, 10, '#2fb36a'); px.rect(g, bx + bw * (S.mp || 0) - 2, by - 3, 5, 16, '#ffe27a'); O.T(g, 'PRESS IN THE GREEN', r.W / 2, by + 14, '#fff', { s: 1, align: 'center' }); }
    if (S.phase === 'air') { O.T(g, S.pose.toUpperCase(), r.W / 2, 40, '#ffe27a', { s: 2, align: 'center' }); O.T(g, 'SPINS ' + (S.th / 360).toFixed(1) + ' / ' + (S.req / 360).toFixed(1) + '   TWISTS ' + S.tw + '/' + S.dive.tw, r.W / 2, 58, '#fff', { s: 1, align: 'center' }); }
    if (S.j) { const bx = r.W / 2 - 60; S.j.forEach((v, i) => { px.rect(g, bx + i * 42, 44, 36, 26, '#1c2760'); px.rect(g, bx + i * 42, 44, 36, 1, '#f2b632'); O.T(g, v.toFixed(1), bx + i * 42 + 18, 51, '#fff', { s: 1, align: 'center' }); }); }
    O.T(g, S.dive.name, r.W / 2, 32, '#9fb0ff', { s: 1, align: 'center' });
  },
  bot(run, inp, dt) {
    const S = run.S; if (S.phase === 'stand' && S.mp > .47 && S.mp < .53) inp.A = true;
    if (S.phase === 'air') { const g = 11 * M * (S.q > .9 ? .9 : 1), tleft = Math.max(.04, (S.vz + Math.sqrt(S.vz * S.vz + 2 * g * Math.max(0, S.z))) / g), need = (S.req - S.th) / tleft; if (need > 500) inp.Lh = true; else if (need > 325) inp.Rh = true; if (S.tw < S.dive.tw && S.th > 150) inp.right = true; }
    if (run.hype >= 1) inp.T = true;
  }
});

// ================================================================ ARCHERY
O.defEvent('archery', {
  name: 'Archery', season: 'summer', venue: 'range', music: 'summer', view: 'side', dir: 1, wr: 50, qual: 30, cpu: { mean: 41, sd: 4.5 }, fail: 0, unit: 'pts', attemptLabel: 'ARROW',
  fmt: v => v.toFixed(0) + ' pts', goal: 'Aim, hold to draw, hold breath to steady, release. Watch the wind!', maxT: 120,
  desc: 'Move the sight with the stick or mouse. Hold action to draw the bow, hold the breath key to steady the sight, release to shoot. Five arrows.',
  rows: run => [['up', 'Aim'], ['action', 'Draw / Shoot'], ['alt', 'Hold breath']],
  init(run) {
    const S = run.S; S.n = 0; S.pts = []; S.ax = 0; S.ay = 0; S.draw = 0; S.breath = 1; S.arrow = null; S.wind = [(rr('archery:wind', run)() - .5) * 10 * O.tune.wind, (rr('archery:windy', run)() - .5) * 5 * O.tune.wind]; S.phase = 'aim'; S.hits = []; S.wob = 0; S.ph = 0; S.wait = 0; S.cx = 0; S.cy = 0; S.over = false;
    run.hudMain = '0'; run.hudSub = 'ARROW 1/5';
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'aim') {
      const sp = 60;
      if (inp.aim) { S.ax = clamp(inp.aim[0] - S.cx, -82, 82); S.ay = clamp(inp.aim[1] - S.cy, -82, 82); } else { S.ax = clamp(S.ax + inp.mv[0] * sp * dt, -82, 82); S.ay = clamp(S.ay + inp.mv[1] * sp * dt, -82, 82); }
      S.ph += dt; const hold = inp.alt && S.breath > 0; S.breath = clamp(S.breath + (hold ? -.33 : .22) * dt, 0, 1);
      const steady = hold ? (.18 / run.tb) : (S.breath <= 0 ? 1.7 : 1), full = S.draw >= 1;
      S.wob = (full ? 1.25 : 1) * steady * (11 + (inp.Ad ? 3 : 0)) * (inp.altP ? 1 : 1);
      if (inp.Ad) S.draw = clamp(S.draw + dt / .8, 0, 1); else if (S.draw > 0 && !inp.Au) S.draw = Math.max(0, S.draw - dt * 2);
      if (inp.Au && S.draw > 0) {   // release
        if (S.draw < .95) { run.yikesNow('LIMP ARROW!', .05); S.pts.push(0); S.hits.push({ x: S.ax, y: 82, p: 0 }); O.sfx('ol_nope'); S.phase = 'wait'; S.wait = 0; }
        else {
          const wx = Math.sin(S.ph * 9.1) * S.wob * .9, wy = Math.cos(S.ph * 7.3) * S.wob * .9;
          const hx = S.ax + wx + S.wind[0] * 1.3, hy = S.ay + wy + S.wind[1] * 1.3 + 3; const d = Math.hypot(hx, hy);
          const p = d < 3.5 ? 10 : d < 8 ? 10 : Math.max(0, 11 - Math.ceil(d / 7)); const pts = d > 80 ? 0 : Math.min(10, p);
          S.pts.push(pts); S.hits.push({ x: hx, y: hy, p: pts }); O.sfx('ol_arrow'); game.shake(1.5);
          S.arrow = { t: 0, x: hx, y: hy }; S.phase = 'fly'; S.wait = 0;
          if (pts === 10) { run.stamp(d < 3.5 ? 'BULLSEYE!' : 'TEN!'); run.addHype(.3); O.Comms.say('good'); } else if (pts >= 8) run.addHype(.12); else if (pts <= 3) run.addHype(0);
        }
        S.draw = 0;
      }
    } else if (S.phase === 'fly') { S.wait += dt; if (S.wait > .5 && !S.counted) { S.counted = true; O.sfx('ol_thunk'); } if (S.wait > 1.5) { S.counted = false; S.phase = 'aim'; S.n++; this.next(run); } }
    else if (S.phase === 'wait') { S.wait += dt; if (S.wait > 1.2) { S.n++; this.next(run); S.phase = 'aim'; } }
    const tot = S.pts.reduce((a, b) => a + b, 0); run.hudMain = tot + '/' + (S.n * 10 || 0); run.hudSub = 'ARROW ' + Math.min(5, S.n + 1) + '/5';
    if (S.phase === 'aim' && inp.aim === null && S.ph === 0) { /* noop */ }
  },
  next(run) { const S = run.S; S.ph = 0; S.wind = [S.wind[0] + (rr('archery:w' + S.n, run)() - .5) * 3, S.wind[1] + (rr('archery:wy' + S.n, run)() - .5) * 1.6]; S.draw = 0; if (S.n >= 5) { const tot = S.pts.reduce((a, b) => a + b, 0); S.phase = 'done'; run.endAttempt(tot, S.pts.filter(p => p === 10).length + ' tens'); O.Comms.say(tot >= 44 ? 'great' : tot >= 32 ? 'good' : 'bad'); if (O.Records.isWR(run.ev, tot)) { run.stamp('PERFECT!'); O.Fireworks.burst(200, 60); } } },
  draw(run, r) {
    const S = run.S; O.backdrop('range').draw(r); S.cx = r.W / 2; S.cy = r.H / 2 + 6;
    r.overlay(g => {
      const cx = S.cx, cy = S.cy, R = 86;
      px.rect(g, 0, 0, r.W, r.H, 'rgba(6,20,10,.45)');
      px.rect(g, cx - 6, cy + R - 4, 12, 70, '#6a4a2a'); px.rect(g, cx - 36, cy + R + 60, 72, 6, '#4a3418');
      const cols = [['#f6f6f6', 10], ['#f6f6f6', 9], ['#222', 8], ['#222', 7], ['#3b82f6', 6], ['#3b82f6', 5], ['#e8443a', 4], ['#e8443a', 3], ['#ffd23a', 2], ['#ffd23a', 1]];
      for (let i = 0; i < 10; i++) px.disc(g, cx, cy, R - i * 7.5, cols[i][0]);
      for (let i = 0; i < 10; i++) { const rad = R - i * 7.5; px.disc(g, cx, cy, rad, 'rgba(0,0,0,.25)'); px.disc(g, cx, cy, rad - 1, cols[i][0]); }
      for (const h of S.hits) { const sx = cx + h.x, sy = cy + h.y; px.rect(g, sx - 1, sy - 1, 3, 3, '#7a4a1a'); px.line(g, sx, sy, sx + 7, sy - 12, '#cfcfd8', 1); px.rect(g, sx + 6, sy - 14, 3, 3, '#e8443a'); }
      if (S.phase === 'aim') {
        const wx = Math.sin(S.ph * 9.1) * S.wob, wy = Math.cos(S.ph * 7.3) * S.wob, sx = cx + S.ax + wx, sy = cy + S.ay + wy;
        px.disc(g, sx, sy, 7, 'rgba(255,255,255,.2)'); px.line(g, sx - 12, sy, sx + 12, sy, '#ff4a3a', 1); px.line(g, sx, sy - 12, sx, sy + 12, '#ff4a3a', 1); px.rect(g, sx - 1, sy - 1, 3, 3, '#fff');
      }
      // wind sock + draw gauge
      const wx0 = r.W - 90, wy0 = 96; O.T(g, 'WIND', wx0, wy0 - 10, '#fff', { s: 1 }); px.line(g, wx0 + 30, wy0 + 6, wx0 + 30 + S.wind[0] * 3.2, wy0 + 6 + S.wind[1] * 3.2, '#ffe27a', 2); px.disc(g, wx0 + 30, wy0 + 6, 2, '#fff'); O.T(g, Math.abs(S.wind[0]).toFixed(1) + (S.wind[0] > 0 ? ' >' : ' <'), wx0, wy0 + 20, '#cfd8ff', { s: 1 });
      const dx = 16, dy = r.H - 60; px.rect(g, dx + 56, dy - 56, 8, 56, '#161a3c'); px.rect(g, dx + 57, dy - 1 - 54 * S.draw, 6, 54 * S.draw, S.draw >= .95 ? '#4fe0a8' : '#ffb04a'); O.T(g, 'DRAW', dx + 48, dy + 3, '#fff', { s: 1 });
      px.rect(g, dx + 76, dy - 56, 8, 56, '#161a3c'); px.rect(g, dx + 77, dy - 1 - 54 * S.breath, 6, 54 * S.breath, '#7fe0ff'); O.T(g, 'AIR', dx + 74, dy + 3, '#fff', { s: 1 });
      run.rig.drawPortrait(g, 14, 34, 42);
      const ptsStr = S.pts.map(p => p).join(' '); O.T(g, ptsStr, r.W / 2, 32, '#ffe27a', { s: 2, align: 'center' });
    });
  },
  bot(run, inp, dt) {
    const S = run.S; if (S.phase !== 'aim') return; const tx = 0 - S.wind[0] * 1.3, ty = -3 - S.wind[1] * 1.3;
    inp.mv = [clamp((tx - S.ax) / 6, -1, 1), clamp((ty - S.ay) / 6, -1, 1)]; inp.Ad = true; inp.alt = true; S.bw = (S.bw || 0) + dt;
    if (S.draw >= 1 && Math.abs(tx - S.ax) < 3 && Math.abs(ty - S.ay) < 3 && S.bw > 1.2) { S.bw = 0; inp.Au = true; inp.Ad = false; }
    if (run.hype >= 1) inp.T = true;
  }
});

// ================================================================ WEIGHTLIFTING
O.defEvent('weights', {
  name: 'Weightlifting', season: 'summer', venue: 'hall', music: 'ceremony', view: 'side', dir: 1, wr: 205, qual: 150, cpu: { mean: 172, sd: 14 }, fail: 0, unit: 'kg', attempts: 3, attemptLabel: 'LIFT', overDelay: 2.0,
  fmt: v => v.toFixed(0) + ' kg', goal: 'Mash to pull the bar up. Press in the green. Keep it level!', maxT: 120,
  desc: 'Alternate the buttons to clean the bar to your shoulders, then press action in the green to jerk it overhead while the stick keeps it level. Three lifts.',
  rows: run => [[['mashL', 'mashR'], 'Pull'], ['action', 'Jerk'], [['left', 'right'], 'Balance']],
  init(run) {
    const S = run.S, m = run.nat; run.W = run.W || 150; S.W = run.W; S.h = 0; S.phase = 'pull'; S.mk = 0; S.bal = 0; S.balV = 0; S.q = 0; S.hold = 0; S.fall = 0; S.ok = false; S.t0 = 0; run.hudMain = S.W + ' kg'; run.hudSub = ''; O.sfx('ol_clang');
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'pull') {
      const hit = (inp.L && run.mash.last !== 'L') || (inp.R && run.mash.last !== 'R') || (game.settings.mashAssist === 'One button' && (inp.L || inp.R));
      run.mashStep(inp, dt, 7);
      if (hit) { S.h += (.8 * 260 / S.W * .1) * O.tune.mash * run.tb; O.sfx('ol_tick'); }
      if (game.settings.mashAssist === 'Hold' && (inp.Lh || inp.Rh)) S.h += .5 * dt * (170 / S.W);
      S.h -= (.14 + S.W / 700) * dt; S.h = clamp(S.h, 0, 1.01);
      if (S.h >= 1) { S.phase = 'jerk'; S.mk = 0; S.bal = 0; S.balV = 0; S.t0 = run.t; O.sfx('ol_clang'); run.addHype(.12); }
      if (run.t > 12) { run.yikesNow('TOO HEAVY!'); S.fall = 1; S.phase = 'fail'; O.sfx('ol_nope'); run.endAttempt(this.recordLift(run, false), 'No lift'); }
      run.hudSub = 'PULL!';
    } else if (S.phase === 'jerk') {
      const wob = (.35 + S.W / 260) * run.tb ** -1;
      S.balV += (Math.sin(run.t * 2.3) * 0.9 + Math.sin(run.t * 5.1) * .5) * wob * dt * 3 + inp.mv[0] * -0 + (inp.mv[0]) * 1.6 * dt * 3 * 0; S.balV -= S.bal * .0; S.bal += S.balV * dt; S.balV *= Math.exp(-dt * .6);
      S.bal += (inp.mv[0]) * 1.5 * dt;
      const wid = (.2 + .06 * (240 - S.W) / 100) * O.win();
      S.mk += dt * 1.3; const pos = Math.abs(((S.mk) % 2) - 1); S.mp = pos; S.gw = wid;
      if (inp.A && !settle) { S.q = q(pos - .5, wid * 1.1); const bq = 1 - clamp(Math.abs(S.bal) / .55, 0, 1); S.good = S.q > .35 && bq > .2; S.jq = (S.q + bq) / 2; S.phase = 'press'; S.pt = 0; if (!S.good) { run.yikesNow(S.q <= .35 ? 'OFF BEAT!' : 'WOBBLY!'); } }
      if (Math.abs(S.bal) > 1) { S.phase = 'fail'; S.fall = 1; run.yikesNow('DROPPED IT!'); O.sfx('ol_clang'); game.shake(6); run.endAttempt(this.recordLift(run, false), 'Dropped'); }
      if (run.t - S.t0 > 7 && S.phase === 'jerk') { S.phase = 'fail'; run.yikesNow('TOO SLOW!'); run.endAttempt(this.recordLift(run, false), 'Timed out'); }
      run.hudSub = 'JERK IN GREEN';
    } else if (S.phase === 'press') {
      S.pt += dt; if (S.pt > .5 && !S.res) { S.res = true; if (S.good) { S.ok = true; run.stamp(S.jq > .8 ? 'GOOD LIFT! +25' : 'GOOD LIFT!'); O.sfx('ol_medal'); run.addHype(S.jq * .35); O.Comms.say(S.jq > .8 ? 'great' : 'good'); run.W = S.W + (S.jq > .8 ? 25 : 15); run.endAttempt(this.recordLift(run, true), ''); game.shake(3); } else { run.W = S.W; S.fall = 1; run.endAttempt(this.recordLift(run, false), 'No lift'); } }
    }
    if (S.fall) S.fall = Math.max(0, S.fall - dt);
    // pose
    const hz = 3 + S.h * 34 + (S.phase === 'press' && S.good ? Math.min(S.pt, .5) * 40 : 0);
    S.barZ = hz;
    run.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: S.phase === 'pull' && S.h < .6 ? 'crouch' : S.ok ? 'cheer' : S.phase === 'fail' ? 'down' : 'hips' });
    game.focus(0, 0, 36);
  },
  recordLift(run, ok) { const S = run.S; return ok ? S.W : null; },
  draw(run, r) {
    const S = run.S; O.backdrop('hall').draw(r);
    r.decal(g => { const a = r.w(-200, 0, 0), b = r.w(200, 0, 0); px.rect(g, 0, a[1] - 90, r.W, 90, '#2a2468'); O.stands(g, r, a[1] - 90, 44, 5, .3, 0); px.rect(g, 0, a[1], r.W, r.H, '#5a3a22'); px.rect(g, r.W / 2 - 70, a[1] + 2, 140, 12, '#c33'); px.rect(g, r.W / 2 - 70, a[1] + 2, 140, 1, '#fff'); });
    r.actor(0, 0, 0, (g, ox, oy) => run.rig.draw(g, ox, oy, r.view));
    r.actor(0, 0, S.barZ + 26, (g, ox, oy) => {
      const tilt = clamp(S.bal, -1, 1) * 8; const x0 = ox - 40, x1 = ox + 40, y0 = oy + tilt, y1 = oy - tilt;
      px.line(g, x0, y0, x1, y1, '#cfd3e0', 2); const nW = Math.max(1, Math.round(S.W / 60));
      for (let k = 0; k < nW; k++) { const w = 3 + (k % 2) * 1; px.rect(g, x0 - 2 - k * 4, y0 - 12 + k, w, 24 - 2 * k, k % 2 ? '#e8443a' : '#3b82f6'); px.rect(g, x1 - 1 + k * 4, y1 - 12 + k, w, 24 - 2 * k, k % 2 ? '#e8443a' : '#3b82f6'); }
    });
  },
  hudExtra(run, g, r) {
    const S = run.S; const bx = r.W - 30, by = 70;
    px.rect(g, bx, by, 14, 90, '#161a3c'); px.rect(g, bx + 1, by + 89 - 88 * clamp(S.h, 0, 1), 12, 88 * clamp(S.h, 0, 1), '#4fe0a8'); O.T(g, 'BAR', bx - 4, by + 93, '#fff', { s: 1 });
    
    if (S.phase === 'jerk' || S.phase === 'press') {
      const cx = r.W / 2, wid = (S.gw || .3) * 80; px.rect(g, cx - 70, 54, 140, 9, '#161a3c'); px.rect(g, cx - wid * .5, 54, wid, 9, '#2fb36a'); px.rect(g, cx - 70 + 140 * (S.mp || 0) - 2, 51, 4, 15, '#ffe27a');
      px.rect(g, cx - 70, 70, 140, 6, '#161a3c'); px.rect(g, cx - 1, 68, 3, 10, '#4fe0a8'); px.rect(g, cx + clamp(S.bal, -1, 1) * 68 - 2, 69, 5, 8, Math.abs(S.bal) > .6 ? '#ff4a3a' : '#ffe27a'); O.T(g, 'LEVEL', cx, 79, '#cfd8ff', { s: 1, align: 'center' });
    }
  },
  bot(run, inp, dt) { const S = run.S; S.bt = (S.bt || 0) + dt; if (S.phase === 'pull') { if (S.bt > 1 / 8.5) { S.bt = 0; S.bs = !S.bs; if (S.bs) inp.L = true; else inp.R = true; } } if (S.phase === 'jerk') { inp.mv = [clamp(-S.bal * 3, -1, 1), 0]; if (S.mp > .47 && S.mp < .53 && Math.abs(S.bal) < .3) inp.A = true; } if (run.hype >= 1) inp.T = true; }
});
})();
