// Olympiyikes! winter events: Ski Jump, Downhill, Bobsled, Figure Skating, Curling, Ice Hockey (shootout).
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp, M = O.M;
const rr = (l, run) => O.rng(l + ':' + (run ? run.natId + ':' + run.attempt : ''));
const q = (d, w) => clamp(1 - Math.abs(d) / w, 0, 1);

// ================================================================ SKI JUMP
const groundZ = x => (x < 0 ? -0.65 * x : x < 140 ? -0.58 * x : -81.2 - (x - 140) * .08);
O.defEvent('skijump', {
  name: 'Ski Jump', season: 'winter', venue: 'snow', music: 'winter', view: 'side', dir: 1, wr: 235, qual: 100, cpu: { mean: 148, sd: 16 }, fail: 0, unit: 'pts', attempts: 2, attemptLabel: 'JUMP', overDelay: 2.8,
  fmt: v => v.toFixed(1) + ' pts', goal: 'Push off, tuck, jump at the edge, balance in the air, land with a telemark!', maxT: 60,
  desc: 'Press action at the green light to start, hold tuck for speed, press action at the edge to leap, steer the body angle up and down, and press action again just before landing.',
  rows: run => [['action', 'Start / Leap / Land'], ['alt', 'Tuck'], ['up', 'Body angle']],
  init(run) {
    const S = run.S; S.phase = 'gate'; S.s = 0; S.v = 0; S.x = -58.7; S.z = 38.1; S.vx = 0; S.vz = 0; S.pitch = .5; S.tq = 0; S.balT = 0; S.flT = 0; S.lastA = -9; S.go = false; S.lightAt = 1.4 + rr('skijump:light', run)(); S.d = 0; S.style = 0; S.tele = 0; S.crash = false; S.landT = 0; S.edgeQ = 0;
    run.hudMain = ''; run.hudSub = 'WAIT FOR GREEN'; O.sfx('ol_bell'); S.drift = 0;
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'gate') {
      if (run.t > S.lightAt) { if (!S.green) { S.green = true; run.hudSub = 'GO!'; O.sfx('ol_tick'); } }
      if (inp.A && !settle) { if (!S.green) { run.yikesNow('TOO EARLY!', .05); S.v = .3; } else { S.v = 1 + q(run.t - S.lightAt - .15, .6) * 2.2; } S.phase = 'inrun'; S.go = true; run.hudSub = ''; }
      else if (run.t > S.lightAt + 2.4) { S.phase = 'inrun'; S.v = .6; }
    } else if (S.phase === 'inrun') {
      const tuck = inp.alt; S.v += ((tuck ? 5.4 : 4.4) - .0045 * S.v * S.v) * dt; S.s += S.v * dt;
      S.x = -58.7 + S.s * .8387; S.z = 38.1 - S.s * .5446;
      if (inp.A && !S.pressed && S.s > 40) { S.pressed = true; S.pa = (70 - S.s) / Math.max(S.v, 1); }
      if (S.s >= 70) { S.edgeQ = S.pressed ? q(S.pa, .3 * O.win()) : 0; if (!S.pressed) run.yikesNow('LATE LEAP!', .05); else if (S.edgeQ > .8) { run.stamp('PERFECT LEAP!'); run.addHype(.25); }
        S.phase = 'air'; S.x = 0; S.z = 0; S.vx = S.v * .93; S.vz = 1.5 + 4.2 * S.edgeQ; O.sfx('ol_swish'); S.flT = 0; S.lastA = -9; }
      run.hudMain = Math.round(S.v * 3.6) + ' km/h'; run.hudSub = S.s > 40 && !S.pressed ? 'LEAP AT THE EDGE' : '';
    } else if (S.phase === 'air') {
      S.flT += dt; S.drift += (Math.sin(S.flT * 3.1) * .6 + Math.sin(S.flT * 7.3) * .4) * dt * .5;
      S.pitch = clamp(S.pitch + (-inp.mv[1] * .9 + S.drift) * dt, 0, 1);
      const band = 1 - clamp(Math.abs(S.pitch - .5) / .35, 0, 1); S.balT += band * dt; S.band = band;
      S.vz -= 9.8 * dt; S.vz += 3.2 * band * run.tb * dt; S.vx -= .002 * S.vx * S.vx * dt; S.x += S.vx * dt; S.z += S.vz * dt;
      if (inp.A) S.lastA = S.flT;
      if (S.z <= groundZ(S.x)) { S.z = groundZ(S.x); S.phase = 'land'; S.landT = 0; S.touch = S.flT; S.d = S.x * 1.12; O.sfx('ol_thunk'); game.particles.dust(S.x * M, 0, S.z * M, 12); }
      run.hudMain = (S.x * 1.12).toFixed(1) + ' m';
    } else if (S.phase === 'land') {
      S.landT += dt; if (inp.A) S.lastA = S.touch + S.landT;
      if (S.landT > .3 && !S.resolved) {
        S.resolved = true; const dtp = S.touch - S.lastA; S.tele = (S.lastA > -5 && dtp < .6 && dtp > -.3) ? q(dtp - .12, .5 * O.win()) : 0;
        S.crash = S.tele < .15; const bal = S.balT / Math.max(.5, S.flT);
        S.style = clamp(20 * S.tele + 30 * bal + 10 * S.edgeQ, 0, 60);
        const d = S.crash ? S.d * .9 : S.d, pts = Math.max(0, 20 + (d - 60) * 1.8 + (S.crash ? 0 : S.style));
        if (S.crash) { run.yikesNow('FACEPLANT!'); S.tumble = 1; O.Comms.say('bad'); } else { run.stamp(S.tele > .8 ? 'TELEMARK!' : 'STUCK IT!'); run.addHype(S.tele * .3); O.Comms.say(pts > 160 ? 'great' : 'good'); O.sfx('ol_medal'); }
        run.endAttempt(pts, S.d.toFixed(1) + ' m');
        if (O.Records.isWR(run.ev, pts)) { run.stamp('WORLD RECORD!'); O.Fireworks.burst(150, 60); O.Comms.say('record'); }
        S.shown = pts; run.hudMain = pts.toFixed(1);
      }
      if (S.resolved) { S.vx *= Math.exp(-dt * 2.2); S.x += S.vx * dt; S.z = groundZ(S.x); }
    }
    if (S.tumble) S.tumble += dt * 5;
    game.focus(S.x * M + (S.phase === 'inrun' ? 70 : 40), 0, S.z * M + 40);
  },
  draw(run, r) {
    const S = run.S; O.backdrop('snow').draw(r);
    r.decal(g => {
      const P = (x, z) => r.w(x * M, 0, z * M);
      px.poly(g, [P(-80, 52), P(0, 0), P(140, -81.2), P(260, -90.8), P(260, -140), P(-80, -140)], '#f4fbff');
      px.poly(g, [P(-80, 52), P(0, 0), P(140, -81.2), P(260, -90.8), P(260, -86), P(140, -77), P(0, -4), P(-80, 48)], '#dce9f8');
      px.line(g, ...P(-80, 52), ...P(0, 0), '#9fc0e8', 2);
      const t = P(-60, 44); px.rect(g, t[0] - 8, t[1] - 18, 16, 18, '#c9ccd8'); // start hut
      for (let k = 40; k <= 140; k += 20) { const p = P(k, groundZ(k)); px.rect(g, p[0], p[1] - 4, 1, 4, k === 100 ? '#ff4a3a' : '#fff'); O.T(g, k + '', p[0], p[1] + 3, '#6a7ca8', { s: 1, align: 'center' }); }
      const k = P(100, groundZ(100)); px.line(g, k[0], k[1] - 10, k[0], k[1] + 6, '#ff4a3a', 2);
      for (let i = 0; i < 18; i++) { const x = 10 + i * 14, p = P(x, groundZ(x)); px.rect(g, p[0] + 10, p[1] - 2, 3, 3, O.CROWD[i % 8]); }
      for (let i = 0; i < 12; i++) { const x = -90 + i * 9, p = P(x, groundZ(x) - 8 + (x < 0 ? 0 : 0)); px.rect(g, p[0], p[1] - 18, 2, 18, '#5a3a1a'); px.poly(g, [[p[0] - 7, p[1] - 8], [p[0] + 1, p[1] - 34], [p[0] + 9, p[1] - 8]], '#1f6a48'); }
    });
    r.actor(S.x * M, 0, S.z * M, (g, ox, oy) => {
      let ang, pose, sk = 0;
      if (S.phase === 'gate') { ang = -Math.PI / 2 + .5; pose = { armA: -.6, armB: -.6, legA: Math.PI - .5, legB: Math.PI - .5 }; sk = .56; }
      else if (S.phase === 'inrun') { ang = .56 - (run.S.v > 0 ? (1.1) : 0) + (run.hudSub ? 0 : 0); pose = { armA: -2.5, armB: -2.5, elbA: 1.8, elbB: 1.8, legA: 2.4, legB: 2.4, kneeA: -1.9, kneeB: -1.9 }; sk = .56; }
      else if (S.phase === 'air') { const fa = Math.atan2(-S.vz, S.vx); ang = fa + (S.pitch - .5) * 1.2 + .15; pose = { armA: Math.PI * .9, armB: Math.PI * .9, legA: Math.PI + .15, legB: Math.PI - .15 }; sk = ang + .35; }
      else { const tm = S.tele > .15 && S.resolved; ang = S.tumble ? S.tumble * 3 : (S.resolved ? -1.2 : .3); pose = tm ? { armA: -.5, armB: Math.PI * .6, legA: Math.PI - .5, legB: Math.PI + .6 } : { armA: 1, armB: 2, legA: 1.2, legB: 2 }; sk = S.tumble ? ang : .56; }
      O.drawFig(g, ox, oy - 6, ang, pose, run.nat, 1.0);
      const ca = Math.cos(sk), sa = Math.sin(sk); px.line(g, ox - ca * 14, oy - sa * 14 + 1, ox + ca * 18, oy + sa * 18 + 1, '#2a3a5a', 2); px.line(g, ox - ca * 14, oy - sa * 14 - 1, ox + ca * 18, oy + sa * 18 - 1, '#e8443a', 1);
    });
  },
  hudExtra(run, g, r) {
    const S = run.S;
    if (S.phase === 'gate') { const c = S.green ? '#4fe0a8' : '#ff4a3a'; px.disc(g, r.W / 2, 44, 9, '#101533'); px.disc(g, r.W / 2, 44, 7, c); O.T(g, S.green ? 'GO!' : 'WAIT...', r.W / 2, 56, '#fff', { s: 2, align: 'center' }); }
    if (S.phase === 'inrun') { const w = 120, x = r.W / 2 - w / 2; px.rect(g, x, 40, w, 6, '#161a3c'); px.rect(g, x + 1, 41, (w - 2) * S.s / 70, 4, '#7fe0ff'); if (S.s > 40) { const left = (70 - S.s) / Math.max(S.v, 1); px.rect(g, x + w - 18, 36, 18, 14, 'rgba(47,179,106,.5)'); O.T(g, left.toFixed(1) + 's', r.W / 2, 50, left < .35 ? '#4fe0a8' : '#fff', { s: 1, align: 'center' }); } }
    if (S.phase === 'air') { const x = r.W - 34, y = 50; px.rect(g, x, y, 12, 90, '#161a3c'); px.rect(g, x, y + 90 * .325, 12, 90 * .35, '#2fb36a'); px.rect(g, x - 2, y + 90 * (S.pitch) - 2, 16, 4, '#ffe27a'); O.T(g, 'ANGLE', x - 10, y + 94, '#fff', { s: 1 }); O.T(g, 'LAND: PRESS ' + game.input.label('action'), r.W / 2, 40, S.z < 12 ? '#ffe27a' : '#cfd8ff', { s: 1, align: 'center' }); }
    if (S.resolved && S.shown !== undefined) { O.banner(g, r, S.d.toFixed(1) + ' m   ' + S.shown.toFixed(1) + ' pts', r.H * .3, S.crash ? '#ff8a7a' : '#ffe27a', 2); }
  },
  bot(run, inp, dt) { const S = run.S; if (S.phase === 'gate' && S.green && run.t > S.lightAt + .15) inp.A = true; if (S.phase === 'inrun') { inp.alt = true; if (S.s > 40 && (70 - S.s) / Math.max(S.v, 1) < .02) inp.A = true; } if (S.phase === 'air') { inp.mv = [0, clamp((S.pitch - .5) * 4, -1, 1)]; const h = S.z - groundZ(S.x); if (h < 2 + Math.abs(S.vz) * .08) inp.A = true; } if (S.phase === 'land' && S.landT < .1) inp.A = true; if (run.hype >= 1) inp.T = true; }
});

// ================================================================ road racers (Downhill & Bobsled)
function course(seed, len, amp, gateEvery, kind) {
  const r = E.rng(seed), ph = [r() * 6, r() * 6, r() * 6], objs = [];
  const curve = s => amp * (Math.sin(s / 95 + ph[0]) * .8 + Math.sin(s / 41 + ph[1]) * .45 + Math.sin(s / 210 + ph[2]) * .7) * (s < 60 ? s / 60 : 1);
  if (kind === 'ski') {
    for (let s = 120, i = 0; s < len; s += gateEvery, i++) objs.push({ s, x: clamp(curve(s) * -.35, -.9, .9) + (i % 2 ? .25 : -.25), kind: 'gate', col: i % 2 ? '#e8443a' : '#3b82f6', gate: true });
    for (let s = 40; s < len; s += 18) { objs.push({ s, x: -2.4 - r() * 1.6, kind: 'tree' }); objs.push({ s: s + 9, x: 2.4 + r() * 1.6, kind: 'tree' }); }
    for (let s = 230; s < len; s += 170) objs.push({ s, x: 0, kind: 'bump', bump: true });
    for (let s = 300; s < len; s += 260) objs.push({ s, x: (r() - .5) * 1.4, kind: 'rock', rock: true });
  } else {
    for (let s = 30; s < len; s += 70) objs.push({ s, x: -1.5, kind: 'banner', col: '#3b82f6' }), objs.push({ s: s + 35, x: 1.5, kind: 'banner', col: '#e8443a' });
  }
  return { curve, objs, len };
}
function backView(g, cx, cy, lean, nat, mode, sc = 1) {
  const c = nat.colors;
  if (mode === 'ski') {
    px.line(g, cx - 8 * sc + lean * 6, cy + 10 * sc, cx - 11 * sc + lean * 12, cy + 24 * sc, '#2a3a5a', 3); px.line(g, cx + 8 * sc + lean * 6, cy + 10 * sc, cx + 11 * sc + lean * 12, cy + 24 * sc, '#2a3a5a', 3);
    px.rect(g, cx - 7 * sc + lean * 4, cy - 6 * sc, 14 * sc, 17 * sc, c.a); px.rect(g, cx - 7 * sc + lean * 4, cy + 6 * sc, 14 * sc, 5 * sc, c.b); px.rect(g, cx - 2 * sc + lean * 4, cy - 6 * sc, 4 * sc, 14 * sc, c.c);
    px.disc(g, cx + lean * 5, cy - 11 * sc, 5 * sc, c.c); px.disc(g, cx + lean * 5, cy - 12 * sc, 4 * sc, c.a); px.line(g, cx - 8 * sc, cy - 2 * sc, cx - 17 * sc + lean * 3, cy + 12 * sc, '#cfd3e0', 1); px.line(g, cx + 8 * sc, cy - 2 * sc, cx + 17 * sc + lean * 3, cy + 12 * sc, '#cfd3e0', 1);
  } else {
    const w = 26 * sc; px.rect(g, cx - w / 2 + lean * 3, cy - 2 * sc, w, 16 * sc, c.a); px.rect(g, cx - w / 2 + lean * 3, cy + 8 * sc, w, 6 * sc, c.b); px.rect(g, cx - w / 2 - 2 * sc + lean * 3, cy + 14 * sc, w + 4 * sc, 3 * sc, '#cfd3e0');
    for (let i = 0; i < 4; i++) { px.disc(g, cx - 9 * sc + i * 6 * sc + lean * 3, cy - 5 * sc, 3.3 * sc, i % 2 ? c.c : c.a); px.rect(g, cx - 11 * sc + i * 6 * sc + lean * 3, cy - 5 * sc, 4 * sc, 1.5 * sc, '#1c2342'); }
  }
}
function racerDraw(run, r, pal, mode, hook) {
  const S = run.S;
  r.overlay(g => {
    const st = { s: S.s, x: S.x, curve: S.course.curve, objs: S.course.objs, heading: S.heading };
    const info = O.drawRoad(g, r, st, pal);
    const cy = r.H - 58 + (S.air > 0 ? -Math.sin(S.air * 3) * 20 : 0);
    if (S.tumble > 0) { const a = S.tumble * 10; for (let k = 0; k < 6; k++) px.rect(g, r.W / 2 + Math.cos(a + k) * 26, cy + Math.sin(a * 1.3 + k) * 14, 4, 4, ['#fff', '#7fe0ff'][k % 2]); }
    else backView(g, r.W / 2 + S.x * -8 * 0, cy, S.lean, run.nat, mode, 1.2);
    if (S.spark > 0) for (let k = 0; k < 5; k++) px.rect(g, r.W / 2 + (S.x > 0 ? 1 : -1) * 16 + O.crnd() * 6, cy + O.crnd() * 14, 2, 2, '#ffe27a');
    if (hook) hook(g, info);
  });
}

// ================================================================ DOWNHILL
O.defEvent('downhill', {
  name: 'Downhill', season: 'winter', venue: 'snow', music: 'snow', view: 'side', dir: -1, wr: 46.0, qual: 66, cpu: { mean: 54.5, sd: 2.6 }, fail: 99.99, unit: 's', attemptLabel: 'RUN',
  fmt: v => v.toFixed(2) + ' s', goal: 'Steer through the gates. Tuck for speed. Pre-jump the bumps!', maxT: 110,
  desc: 'Steer left and right through the gates (each missed gate costs a second). Hold the tuck button on straights, press action just before a bump to pre-jump it, avoid rocks.',
  rows: run => [[['left', 'right'], 'Steer'], ['alt', 'Tuck'], ['action', 'Pre-jump']],
  init(run) {
    const S = run.S; S.course = course(O.hash('downhill' + O.seed), 1500, 1, 85, 'ski'); S.objs = S.course.objs; S.s = 0; S.x = 0; S.v = 0; S.lean = 0; S.air = 0; S.pen = 0; S.phase = 'set'; S.gunAt = 1.6; S.rt = 0; S.hit = 0; S.miss = 0; S.tumble = 0; S.gates = 0; S.spark = 0; S.lastA = -9; S.streak = 0; S.heading = 0;
    run.hudMain = '0.00'; run.hudSub = 'GET READY'; O.sfx('ol_whistle');
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'set') { if (run.t >= S.gunAt) { S.phase = 'run'; run.hudSub = ''; O.sfx('ol_gun'); } }
    if (S.phase === 'run' && !S.over) {
      S.rt += dt; const steer = clamp(inp.mv[0], -1, 1), tuck = inp.alt;
      const k = S.course.curve(S.s);
      S.x += (steer * 2.1 - k * S.v * .0125 * 1.0) * dt; S.lean += (steer - S.lean) * dt * 6; S.heading += (-k * 1.5 - S.heading) * dt * 2;
      const off = Math.abs(S.x) > 1.45; S.spark = off ? 1 : 0;
      const tgt = (tuck ? 37 : 31) * run.tb * (off ? .55 : 1) * (1 - .1 * Math.abs(steer));
      S.v += ((S.tumble > 0 ? 3 : tgt) - S.v) * dt * (S.tumble > 0 ? 2.2 : .5);
      if (tuck && !off) run.addHype(dt * .03);
      S.x = clamp(S.x, -1.9, 1.9);
      if (inp.A) S.lastA = S.rt;
      const s0 = S.s; S.s += S.v * dt;
      if (S.air > 0) S.air -= dt;
      for (const o of S.objs) {
        if (o.s > s0 && o.s <= S.s) {
          if (o.gate) { S.gates++; const ok = Math.abs(S.x - o.x) < .62; o.hit = ok; if (ok) { S.hit++; S.streak++; run.addHype(.045); O.sfx('ol_good'); } else { S.miss++; S.pen += 1; S.streak = 0; run.yikesNow('MISSED GATE +1s', .02); } }
          if (o.bump) { const good = S.rt - S.lastA < .6 && S.rt - S.lastA >= -0.05 || (S.lastA > S.rt - .6); if (S.rt - S.lastA < .55) { S.air = .8; run.stamp('PRE-JUMP!'); run.addHype(.12); O.sfx('ol_swish'); } else { S.v *= .72; S.air = .0; S.spark = 1; run.yikesNow('BUMPED!', .05); } }
          if (o.rock && Math.abs(S.x - o.x) < .3 && S.air <= 0) { S.tumble = 1.6; S.v = 3; run.yikesNow('TUMBLE!'); O.sfx('ol_thunk'); game.shake(6); S.pen += 1.5; }
        }
      }
      if (S.tumble > 0) S.tumble -= dt; if (S.tumble < 0) S.tumble = 0;
      run.hudMain = (S.rt + S.pen).toFixed(2); run.hudSub = Math.round(S.v * 3.6) + ' km/h';
      if (S.s >= S.course.len) { const t = S.rt + S.pen; S.phase = 'fin'; run.endAttempt(t, S.miss + ' missed gates'); O.sfx('ol_whistle'); if (O.Records.isWR(run.ev, t)) { run.stamp('WORLD RECORD!'); O.Fireworks.burst(160, 70); O.Comms.say('record'); } else O.Comms.say(t < 52 ? 'great' : t < 60 ? 'good' : 'bad'); }
    }
    if (S.over) { S.v *= Math.exp(-dt * 1.5); S.s += S.v * dt * .4; }
  },
  draw(run, r) { racerDraw(run, r, { sky: ['#9fd6ff', '#d6efff'], far: '#a8c6e8', g1: '#f2f8ff', g2: '#e4eefa', r1: '#fafcff', r2: '#eef4ff', rw: 150, edge: '#cc3a3a', center: null }, 'ski'); },
  hudExtra(run, g, r) { const S = run.S; O.T(g, 'GATES ' + S.hit + '/' + S.gates, 14, 32, '#ffe27a', { s: 1 }); const w = 100, x = r.W / 2 - w / 2; px.rect(g, x, 32, w, 5, '#161a3c'); px.rect(g, x + 1, 33, (w - 2) * clamp(S.s / S.course.len, 0, 1), 3, '#7fe0ff'); if (S.phase === 'set') O.banner(g, r, 'READY...', r.H * .36, '#fff', 3); },
  bot(run, inp, dt) {
    const S = run.S; if (S.phase !== 'run') return; const k = S.course.curve(S.s);
    const nxt = S.objs.find(o => o.gate && o.s > S.s + 2); const tx = nxt && nxt.s - S.s < 38 ? nxt.x : 0;
    inp.mv = [clamp((tx - S.x) * 2.4 + k * S.v * .0125 / 2.1, -1, 1), 0]; inp.alt = Math.abs(inp.mv[0]) < .4;
    const b = S.objs.find(o => o.bump && o.s > S.s); if (b && b.s - S.s < S.v * .35) inp.A = true;
    const rk = S.objs.find(o => o.rock && o.s > S.s && o.s - S.s < 25 && Math.abs(o.x - S.x) < .45); if (rk) inp.mv = [clamp(S.x - rk.x >= 0 ? 1 : -1, -1, 1), 0];
    if (run.hype >= 1) inp.T = true;
  }
});

// ================================================================ BOBSLED
O.defEvent('bobsled', {
  name: 'Bobsled', season: 'winter', venue: 'ice', music: 'tense', view: 'side', dir: -1, wr: 47.5, qual: 63, cpu: { mean: 53.2, sd: 2 }, fail: 99.99, unit: 's', attemptLabel: 'RUN',
  fmt: v => v.toFixed(2) + ' s', goal: 'Push hard at the start, jump in, then steer the line. Stay off the walls!', maxT: 110,
  desc: 'Mash to push the sled, press action to jump in near the end of the push, then lean the sled left and right against the curves. Walls scrape and slow you; hit them hard and the sled flips.',
  rows: run => [[['mashL', 'mashR'], 'Push'], ['action', 'Jump in'], [['left', 'right'], 'Steer']],
  init(run) {
    const S = run.S; S.course = course(O.hash('bob' + O.seed), 1600, 1.9, 0, 'bob'); S.s = 0; S.x = 0; S.v = 0; S.lean = 0; S.air = 0; S.pen = 0; S.phase = 'set'; S.gunAt = 1.6; S.rt = 0; S.push = 0; S.pt = 0; S.in = false; S.inQ = 0; S.spark = 0; S.tumble = 0; S.scrape = 0; S.heading = 0; S.objs = S.course.objs;
    run.hudMain = '0.00'; run.hudSub = 'GET READY'; O.sfx('ol_whistle');
  },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'set') { if (run.t >= S.gunAt) { S.phase = 'push'; S.pt = 0; O.sfx('ol_gun'); run.hudSub = 'PUSH!'; } }
    else if (S.phase === 'push') {
      S.pt += dt; S.rt += dt; const rate = run.mashStep(inp, dt, 7); S.v += (4.8 * rate * run.tb - .5 * S.v) * dt; S.s += S.v * dt; S.push = Math.max(S.push, S.v);
      if (rate > .8) run.addHype(dt * .1);
      if (inp.A && !S.in) { S.in = true; S.inQ = q(S.pt - 4.0, 1.1 * O.win()); if (S.inQ > .6) run.stamp('CLEAN LOAD!'); else run.yikesNow('SLOPPY LOAD!', .05); }
      if (S.pt >= 5 || (S.in && S.pt > 3)) { if (!S.in) { S.inQ = 0; run.yikesNow('LEFT BEHIND!', .05); } S.phase = 'run'; S.v *= (.88 + .12 * S.inQ); run.hudSub = ''; }
      run.hudMain = S.rt.toFixed(2);
      S.heading = 0;
    }
    if (S.phase === 'run' && !S.over) {
      S.rt += dt; const steer = clamp(inp.mv[0], -1, 1), k = S.course.curve(S.s);
      S.x += (steer * 2.4 - k * S.v * .0145) * dt; S.lean += (steer - S.lean) * dt * 6; S.heading += (-k * 1.5 - S.heading) * dt * 2;
      const wall = Math.abs(S.x) > 1.12; S.spark = wall ? 1 : 0;
      const tgt = (36 + S.push * .9) * run.tb * (wall ? .72 : 1); S.v += ((S.tumble > 0 ? 4 : tgt) - S.v) * dt * (S.tumble > 0 ? 2 : .45);
      if (!wall) run.addHype(dt * .02);
      if (Math.abs(S.x) > 1.5 && S.tumble <= 0) { S.tumble = 1.8; S.v = 3; S.pen += 1.5; S.x *= .5; run.yikesNow('ROOF-SIDE DOWN!'); O.sfx('ol_thunk'); game.shake(8); }
      S.x = clamp(S.x, -1.55, 1.55);
      if (S.tumble > 0) S.tumble = Math.max(0, S.tumble - dt);
      S.s += S.v * dt; run.hudMain = (S.rt + S.pen).toFixed(2); run.hudSub = Math.round(S.v * 3.6) + ' km/h';
      if (S.s >= S.course.len) { const t = S.rt + S.pen; S.phase = 'fin'; run.endAttempt(t, ''); O.sfx('ol_whistle'); if (O.Records.isWR(run.ev, t)) { run.stamp('WORLD RECORD!'); O.Fireworks.burst(160, 70); O.Comms.say('record'); } else O.Comms.say(t < 51 ? 'great' : t < 58 ? 'good' : 'bad'); }
    }
    if (S.over) { S.v *= Math.exp(-dt * 1.5); S.s += S.v * dt * .4; }
  },
  draw(run, r) { racerDraw(run, r, { sky: ['#0a1030', '#1a2a70'], far: '#1a2766', g1: '#cfe9ff', g2: '#b6d8f5', r1: '#e8f6ff', r2: '#d6ecff', rw: 120, edge: '#4a8adf', wall: '#7fb2ff', center: null }, 'bob'); },
  hudExtra(run, g, r) { const S = run.S; const w = 100, x = r.W / 2 - w / 2; px.rect(g, x, 32, w, 5, '#161a3c'); px.rect(g, x + 1, 33, (w - 2) * clamp(S.s / S.course.len, 0, 1), 3, '#7fe0ff'); if (S.phase === 'push') { px.rect(g, x, 42, w, 7, '#161a3c'); px.rect(g, x + 1, 43, (w - 2) * clamp(S.v / 9, 0, 1), 5, '#4fe0a8'); px.rect(g, x + w * .8 - 1, 40, 2, 11, '#2fb36a'); px.rect(g, x + w * clamp(S.pt / 5, 0, 1) - 1, 40, 3, 11, '#ffe27a'); O.T(g, 'JUMP IN AT THE GREEN LINE', r.W / 2, 53, '#fff', { s: 1, align: 'center' }); } if (S.phase === 'set') O.banner(g, r, 'READY...', r.H * .36, '#fff', 3); },
  bot(run, inp, dt) { const S = run.S; S.bt = (S.bt || 0) + dt; if (S.phase === 'push') { if (S.bt > 1 / 7.6) { S.bt = 0; S.bs = !S.bs; if (S.bs) inp.L = true; else inp.R = true; } if (S.pt > 3.95) inp.A = true; } if (S.phase === 'run') { const k = S.course.curve(S.s); inp.mv = [clamp(-S.x * 2 + k * S.v * .0145 / 2.4, -1, 1), 0]; } if (run.hype >= 1) inp.T = true; }
});

// ================================================================ FIGURE SKATING (rhythm)
const LANES = ['left', 'down', 'up', 'right', 'action'];
O.defEvent('figure', {
  name: 'Figure Skating', season: 'winter', venue: 'ice', music: 'ceremony', view: 'side', dir: 1, wr: 98, qual: 38, cpu: { mean: 74, sd: 10 }, fail: 0, unit: 'pts', attemptLabel: 'PROGRAM',
  fmt: v => v.toFixed(1) + ' pts', goal: 'Hit the arrows on the beat. Jump with the action button!', maxT: 90,
  desc: 'Press the matching direction when each note reaches the line. The big circle notes are jumps: press action. Misses make you wobble; too many make you fall.',
  rows: run => [[['left', 'down', 'up', 'right'], 'Notes'], ['action', 'Jump']],
  init(run) {
    const S = run.S, rg = rr('figure:chart', run), bpm = 100, step = 60 / bpm / 2; S.notes = []; let t = 2.2;
    for (let i = 0; i < 52; i++) { const lane = rg() < .14 ? 4 : Math.floor(rg() * 4); S.notes.push({ t, lane, state: 0 }); t += step * (rg() < .55 ? 2 : rg() < .6 ? 1 : 3); }
    S.endT = t + 1.5; S.score = 0; S.max = S.notes.length; S.combo = 0; S.best = 0; S.miss = 0; S.streak = 0; S.fall = 0; S.judge = ''; S.jt = 9; S.bpm = bpm; S.spin = 0; S.hit = 0;
    run.hudMain = '0'; run.hudSub = ''; O.music('ceremony');
  },
  update(run, dt, inp, settle) {
    const S = run.S; if (S.fall > 0) S.fall -= dt; S.jt += dt;
    const w = O.win() * (run.turboT > 0 ? 1.4 : 1), W1 = .07 * w, W2 = .12 * w, W3 = .18 * w;
    const presses = LANES.filter(l => inp[l === 'action' ? 'A' : l]);
    for (const l of presses) {
      const li = LANES.indexOf(l); let best = null;
      for (const n of S.notes) if (n.state === 0 && n.lane === li && Math.abs(n.t - run.t) < W3) { if (!best || Math.abs(n.t - run.t) < Math.abs(best.t - run.t)) best = n; }
      if (best) { const d = Math.abs(best.t - run.t); best.state = d < W1 ? 3 : d < W2 ? 2 : 1; S.score += [0, .5, .8, 1][best.state]; S.combo++; S.best = Math.max(S.best, S.combo); S.streak = 0; S.hit++; S.judge = ['', 'GOOD', 'GREAT', 'PERFECT'][best.state]; S.jt = 0; O.sfx('ol_good', { pitch: 1 + (best.lane) * .12 }); run.addHype(best.state === 3 ? .05 : .02); S.spin = best.lane === 4 ? 1 : S.spin; if (best.lane === 4) S.jump = 1; }
    }
    for (const n of S.notes) if (n.state === 0 && run.t - n.t > W3) { n.state = -1; S.combo = 0; S.miss++; S.streak++; S.judge = 'MISS'; S.jt = 0; if (S.streak === 3) { S.fall = 1.4; run.yikesNow('SPLAT! (THE ICE WON)'); O.Comms.say('bad'); } }
    if (S.spin > 0) S.spin -= dt * .6; if (S.jump > 0) S.jump -= dt * 1.4;
    const sc = S.score / S.max * 100; run.hudMain = sc.toFixed(1); run.hudSub = 'COMBO ' + S.combo;
    if (S.combo === 10 || S.combo === 25) { run.stamp(S.combo + ' COMBO!'); O.crowd(.6); }
    run.rig.update(dt, { x: -130, y: 0, z: Math.max(0, Math.sin(Math.max(0, S.jump || 0) * Math.PI)) * 24, vx: 30, vy: 0, facing: S.fall > 0 ? 0 : S.spin > 0 ? run.time * 12 : 0, pose: S.fall > 0 ? 'down' : S.combo > 8 ? 'cheer' : 'hips', down: S.fall > 0 ? 1 : 0 });
    if (run.t > S.endT && !S.over) { const fin = clamp(sc + (S.miss === 0 ? 2 : 0), 0, 100); run.endAttempt(fin, S.best + ' best combo'); run.stamp(fin > 90 ? 'SPARKLING!' : 'BOW!'); O.Comms.say(fin > 85 ? 'great' : fin > 55 ? 'good' : 'bad'); if (O.Records.isWR(run.ev, fin)) { O.Fireworks.burst(160, 70); O.Comms.say('record'); } }
    game.focus(0, 0, 30);
  },
  draw(run, r) {
    const S = run.S; O.backdrop('ice').draw(r);
    r.decal(g => { const a = r.w(-300, 0, 0); O.stands(g, r, a[1] - 82, 56, 77, .5, 0); px.rect(g, 0, a[1] - 26, r.W, r.H, '#d6ecff'); px.rect(g, 0, a[1] - 26, r.W, 3, '#fff'); for (let k = 0; k < 14; k++) px.rect(g, (k * 53 + 20) % r.W, a[1] - 20 + (k * 19) % 80, 30, 1, 'rgba(120,170,230,.45)'); });
    r.actor(-130, 0, 0, (g, ox, oy) => { run.rig.draw(g, ox, oy, r.view); px.rect(g, ox - 8, oy + 1, 16, 2, '#cfd3e0'); });
    // note highway (screen space)
    r.overlay(g => {
      const hy = r.H - 70, top = 44, lane = 36, cx = r.W / 2, x0 = cx - lane * 2.5 + lane / 2, sp = 140;
      px.rect(g, cx - lane * 2.5, top, lane * 5, hy - top + 20, 'rgba(8,12,44,.62)');
      for (let i = 0; i <= 5; i++) px.rect(g, cx - lane * 2.5 + i * lane, top, 1, hy - top + 20, 'rgba(255,255,255,.18)');
      for (let l = 0; l < 5; l++) { const x = x0 + l * lane; drawArrow(g, x, hy, l, 'rgba(255,255,255,.2)', 1.1, '#fff'); }
      for (const n of S.notes) { const y = hy - (n.t - run.t) * sp; if (y < top - 10 || y > hy + 24 || n.state > 0) continue; drawArrow(g, x0 + n.lane * lane, y, n.lane, n.state < 0 ? '#555' : ['#ff8fd8', '#7fb2ff', '#4fe0a8', '#ffd36a', '#ff6b6b'][n.lane], 1, '#10142c'); }
      if (S.jt < .6 && S.judge) O.T(g, S.judge, cx, hy + 22, S.judge === 'MISS' ? '#ff6a5a' : S.judge === 'PERFECT' ? '#ffe27a' : '#fff', { s: 2, align: 'center' });
    });
  },
  hudExtra() {},
  bot(run, inp, dt) { const S = run.S; for (const n of S.notes) if (n.state === 0 && Math.abs(n.t - run.t) < dt * .7 + 0.004) { const k = LANES[n.lane]; inp[k === 'action' ? 'A' : k] = true; } if (run.hype >= 1) inp.T = true; }
});
function drawArrow(g, x, y, lane, col, s, ol) {
  const a = 11 * s;
  if (lane === 4) { px.disc(g, x, y, a, ol); px.disc(g, x, y, a - 2, col); px.disc(g, x, y, a - 6, ol === '#fff' ? 'rgba(0,0,0,.2)' : '#fff3'); return; }
  const dir = [[-1, 0], [0, 1], [0, -1], [1, 0]][lane], px_ = -dir[1], py_ = dir[0];
  const P = (f, sd) => [x + dir[0] * f + px_ * sd, y + dir[1] * f + py_ * sd];
  px.poly(g, [P(a, 0), P(-a * .1, a), P(-a * .1, a * .45), P(-a, a * .45), P(-a, -a * .45), P(-a * .1, -a * .45), P(-a * .1, -a)], ol);
  const b = a - 2; px.poly(g, [P(b, 0), P(0, b * .85), P(0, b * .3), P(-b * .9, b * .3), P(-b * .9, -b * .3), P(0, -b * .3), P(0, -b * .85)], col);
}

// ================================================================ CURLING
O.defEvent('curling', {
  name: 'Curling', season: 'winter', venue: 'ice', music: 'ceremony', view: 'side', dir: 1, wr: 292, qual: 90, cpu: { mean: 168, sd: 36 }, fail: 0, unit: 'pts', attemptLabel: 'STONE',
  fmt: v => v.toFixed(0) + ' pts', goal: 'Aim, pick a curl, hold for power, then sweep like mad to reach the button!', maxT: 150,
  desc: 'Move the aim with the stick (or mouse). Tap the left or right button to choose the curl. Hold action to charge and release to throw. Mash left and right to sweep. Three stones: closer to the button scores more.',
  rows: run => [[['left', 'right'], 'Aim'], [['mashL', 'mashR'], 'Curl / Sweep'], ['action', 'Charge / Throw']],
  init(run) { const S = run.S; S.n = 0; S.stones = []; S.phase = 'aim'; S.aim = 0; S.curl = 1; S.pow = 0; S.chg = false; S.cph = 0; S.cur = null; S.pts = []; S.cx = 0; S.wait = 0; run.hudMain = '0'; run.hudSub = 'STONE 1/3'; S.mouseX = null; },
  update(run, dt, inp, settle) {
    const S = run.S;
    if (S.phase === 'aim') {
      if (inp.aim) S.aim = clamp((inp.aim[0] - S.cx) / 14, -2.3, 2.3); else S.aim = clamp(S.aim + inp.mv[0] * 1.4 * dt, -2.3, 2.3);
      if (inp.L) { S.curl = -1; O.sfx('ol_tick'); } if (inp.R) { S.curl = 1; O.sfx('ol_tick'); }
      if (inp.Ad) { S.chg = true; S.cph += dt * 1.2; S.pow = Math.abs((S.cph % 2) - 1); }
      if (inp.Au && S.chg) {
        const p = S.pow, v0 = 2.4 + 2.6 * p; S.cur = { x: 0, d: 0, v: v0, vlat: 0, head: Math.atan2(S.aim, 34), curl: S.curl, sweep: 0, live: true }; S.phase = 'slide'; S.chg = false; O.sfx('ol_slide');
      }
    } else if (S.phase === 'slide') {
      const c = S.cur, sw = run.mashStep(inp, dt, 8), swEff = sw * run.tb; S.sweepNow = swEff;
      const mu = .23 * (1 - .32 * swEff), sdt = dt * 1.6;
      c.v = Math.max(0, c.v - mu * sdt); c.d += c.v * sdt * Math.cos(c.head);
      c.vlat += c.curl * .0085 * (1 - swEff * .55) * sdt * (c.v > .15 ? 1 : 0);
      c.x += (c.v * Math.sin(c.head) + c.vlat) * sdt;
      if (swEff > .6) run.addHype(dt * .06);
      if (c.v <= 0.02 || c.d > 39) {
        c.live = false; S.phase = 'stop'; S.wait = 0;
        const dx = c.x, dy = c.d - 34, dist = Math.hypot(dx, dy); let pts = 0, note = '';
        if (c.d < 25) { run.yikesNow('HOGGED! (TOO SHORT)'); note = 'short'; } else if (c.d > 38.3 || Math.abs(c.x) > 2.4) { run.yikesNow('GONE FISHING!'); note = 'gone'; } else { pts = clamp(100 * (1 - dist / 2.2), 0, 100); if (pts > 85) { run.stamp('BUTTON!'); run.addHype(.3); O.Comms.say('great'); } else if (pts > 50) { run.addHype(.1); O.Comms.say('good'); } }
        c.pts = pts; S.pts.push(pts); S.stones.push({ x: c.x, d: c.d, col: run.nat.colors.a, out: !!note }); O.sfx(pts > 0 ? 'ol_thunk' : 'ol_nope');
      }
    } else if (S.phase === 'stop') { S.wait += dt; if (S.wait > 1.6) { S.n++; S.cur = null; if (S.n >= 3) { const tot = S.pts.reduce((a, b) => a + b, 0); S.phase = 'done'; run.endAttempt(tot, ''); if (O.Records.isWR(run.ev, tot)) { O.Fireworks.burst(170, 70); O.Comms.say('record'); } } else { S.phase = 'aim'; S.aim = 0; S.pow = 0; S.cph = 0; } } }
    run.hudMain = Math.round(S.pts.reduce((a, b) => a + b, 0)) + ''; run.hudSub = 'STONE ' + Math.min(3, S.n + 1) + '/3';
  },
  draw(run, r) {
    const S = run.S; S.cx = r.W / 2;
    r.overlay(g => {
      const cx = r.W / 2, ys = r.H * .62, ppm = 14, curD = S.cur ? S.cur.d : 0, camD = S.phase === 'aim' ? 22 : Math.max(22, curD + 2), yOf = d => ys - (d - camD) * ppm + 0;
      px.rect(g, 0, 0, r.W, r.H, '#0f1840');
      px.rect(g, cx - 2.6 * ppm - 8, 0, 5.2 * ppm + 16, r.H, '#2a2f58'); px.rect(g, cx - 2.6 * ppm, 0, 5.2 * ppm, r.H, '#eaf6ff');
      for (let k = 0; k < 90; k++) px.rect(g, cx - 2.6 * ppm + (k * 37) % (5.2 * ppm), (k * 61) % r.H, 2, 1, 'rgba(160,200,235,.5)');
      const hy = yOf(34); const rings = [[1.83, '#2e6fd8'], [1.22, '#fff'], [.61, '#e8443a'], [.15, '#fff']];
      for (const [rd, col] of rings) px.disc(g, cx, hy, rd * ppm, col); px.rect(g, cx - 2.6 * ppm, hy, 5.2 * ppm, 1, '#222');
      px.rect(g, cx - 2.6 * ppm, yOf(25), 5.2 * ppm, 2, '#e8443a'); px.rect(g, cx - 2.6 * ppm, yOf(38.3), 5.2 * ppm, 2, '#222'); px.rect(g, cx - 1, 0, 1, r.H, 'rgba(120,150,200,.4)');
      const stone = (x, d, col, glow) => { const sx = cx + x * ppm, sy = yOf(d); px.disc(g, sx, sy, 6, '#6a6f86'); px.disc(g, sx, sy, 5, '#aab0c8'); px.disc(g, sx, sy, 3.2, col); px.rect(g, sx - 1, sy - 1, 2, 2, '#fff'); if (glow) px.disc(g, sx, sy, 8, 'rgba(255,230,120,.25)'); };
      for (const s of S.stones) if (!s.out) stone(s.x, s.d, s.col);
      if (S.cur && S.cur.live) { stone(S.cur.x, S.cur.d, run.nat.colors.a, run.turboT > 0); if (S.sweepNow > .1) for (let k = 0; k < 6; k++) px.rect(g, cx + S.cur.x * ppm - 9 + k * 3, yOf(S.cur.d) - 14 - (k % 2) * 3 + Math.sin(game.real * 30 + k) * 2, 2, 2, '#fff'); }
      if (S.phase === 'aim') {
        const sx = cx + S.aim * 2 * ppm * 0 + S.aim * ppm * (34 - 0) / 34 * 1; const ay = hy; px.line(g, cx, yOf(0.5 + camD - 22), cx + S.aim * ppm, ay, 'rgba(255,230,120,.7)', 1); px.disc(g, cx + S.aim * ppm, ay, 3, '#ffe27a');
        stone(0, camD - 20, run.nat.colors.a); const ca = S.curl; O.T(g, ca < 0 ? '← IN-TURN' : 'OUT-TURN →', cx, ys + 22, '#cfd8ff', { s: 1, align: 'center' });
        px.rect(g, cx - 40, r.H - 56, 80, 8, '#161a3c'); const gx = cx - 40; px.rect(g, gx + 80 * .48, r.H - 56, 80 * .22, 8, 'rgba(47,179,106,.55)'); px.rect(g, gx + 1, r.H - 55, 78 * S.pow, 6, S.chg ? '#ffd36a' : '#555b80'); O.T(g, S.chg ? 'RELEASE!' : 'HOLD TO CHARGE', cx, r.H - 46, '#fff', { s: 1, align: 'center' });
      }
      if (S.phase === 'slide') { O.T(g, 'SWEEP!  ' + '|'.repeat(Math.round((S.sweepNow || 0) * 8)), cx, r.H - 50, '#ffe27a', { s: 2, align: 'center' }); }
      S.pts.forEach((p, i) => O.T(g, Math.round(p) + '', 16, 60 + i * 12, '#ffe27a', { s: 1 }));
      run.rig.drawPortrait(g, r.W - 52, 74, 38);
    });
  },
  bot(run, inp, dt) {
    const S = run.S; S.bt = (S.bt || 0) + dt;
    if (S.phase === 'aim') { S.curl = 1; S.aim = -0.8; S.cph = S.cph || 0; inp.Ad = true; if (Math.abs(S.pow - .355) < .02 && S.chg) inp.Au = true; }
    if (S.phase === 'slide') { if (S.bt > 1 / 7.5) { S.bt = 0; S.bs = !S.bs; if (S.bs) inp.L = true; else inp.R = true; } }
    if (run.hype >= 1) inp.T = true;
  }
});

// ================================================================ ICE HOCKEY (3-on-3 match, 60 seconds)
const RK = { w: 380, h: 160, gy: 22 };   // rink size in overlay px, goal half-height
O.defEvent('hockey', {
  name: 'Ice Hockey', season: 'winter', venue: 'ice', music: 'tense', view: 'side', dir: 1, wr: 50, qual: 5, cpu: { mean: 14, sd: 5 }, fail: 0, unit: 'pts', attemptLabel: 'PERIOD',
  fmt: v => v.toFixed(0) + ' pts', goal: 'A 3-on-3 sprint match! Skate, pass, check and shoot at the right-hand goal. Goals win it.', maxT: 140,
  desc: 'Skate with the stick. Hold action to charge and release to shoot at the goal on the right (mouse: shoot at the cursor). Left button passes, right button checks the puck carrier or switches skater, hold the burst key to skate faster. Sixty seconds: score = 5 + 3 per goal for, minus 2 per goal against, plus a point per second you held the puck.',
  rows: run => [[['left', 'right'], 'Skate'], ['action', 'Shoot'], ['mashL', 'Pass'], ['mashR', 'Check'], ['alt', 'Burst']],
  init(run) {
    const S = run.S; S.clock = 60; S.gf = 0; S.ga = 0; S.hold = 0; S.pow = 0; S.chg = false; S.cph = 0; S.pause = 0; S.c = 0; S.stamina = 1; S.cd = 0; S.flash = 0; S.rn = O.rng('hockey:ai:' + run.natId);
    S.rr = Math.floor(O.rng('hockey:opp')() * 7); S.opp = O.NATIONS.filter(n => n.id !== run.natId)[S.rr % 7];
    this.reset(run); run.hudMain = '0 - 0'; run.hudSub = '60';
  },
  reset(run) {
    const S = run.S, W = RK.w / 2;
    S.sk = [[-W * .5, 0, 0], [-W * .3, -40, 0], [-W * .3, 40, 0], [W * .5, 0, 1], [W * .3, -40, 1], [W * .3, 40, 1]].map(a => ({ x: a[0], y: a[1], vx: 0, vy: 0, team: a[2] }));
    S.puck = { x: 0, y: 0, vx: 0, vy: 0, own: null }; S.c = 0; S.cd = 0; S.pause = 1.2;
  },
  update(run, dt, inp, settle) {
    const S = run.S, W = RK.w / 2, H = RK.h / 2, P = S.puck;
    if (S.cph === undefined) S.cph = 0;
    if (S.pause > 0) { S.pause -= dt; if (S.pause <= 0 && !S.over && S.clock > 0) { if (!S.started) { S.started = true; O.sfx('ol_whistle'); } } return; }
    if (S.over) return;
    if (!S.started) { S.started = true; O.sfx('ol_whistle'); }
    S.clock -= dt; S.cd = Math.max(0, S.cd - dt); S.flash = Math.max(0, S.flash - dt);
    const me = S.sk[S.c];
    // control
    const burst = inp.alt && S.stamina > .05; S.stamina = clamp(S.stamina + (burst ? -.35 : .15) * dt, 0, 1);
    const sp = (burst ? 105 : 72) * (run.turboT > 0 ? 1.2 : 1);
    me.vx += (inp.mv[0] * sp - me.vx) * Math.min(1, dt * 7); me.vy += (inp.mv[1] * sp - me.vy) * Math.min(1, dt * 7);
    const havePuck = P.own === me;
    if (havePuck) { run.addHype(dt * .01); S.hold += dt; }
    if (inp.Ad && havePuck) { S.chg = true; S.cph += dt * 1.3; S.pow = Math.abs((S.cph % 2) - 1); }
    if (inp.Au && S.chg && havePuck) {
      const gx = W, ty = inp.aim ? clamp(inp.aim[1] - S.cy, -RK.gy, RK.gy) : clamp(inp.mv[1] * RK.gy * 1.3, -RK.gy, RK.gy), p = S.pow, rg = S.rn, err = (rg() - .5) * 2 * (3 + 22 * p * p);
      const dx = gx - me.x, dy = ty + err - me.y, d = Math.hypot(dx, dy) || 1, v = (150 + 150 * p) * (run.turboT > 0 ? 1.25 : 1);
      P.vx = dx / d * v; P.vy = dy / d * v; P.own = null; S.cd = .35; S.chg = false; S.cph = 0; O.sfx('ol_puck');
    } else if (!inp.Ad) { S.chg = false; S.cph = 0; }
    if (inp.L && havePuck) { const mates = S.sk.filter((k, i) => k.team === 0 && i !== S.c).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)); const t = mates[0], dx = t.x + 14 - me.x, dy = t.y - me.y, d = Math.hypot(dx, dy) || 1; P.vx = dx / d * 170; P.vy = dy / d * 170; P.own = null; S.cd = .25; O.sfx('ol_swish'); }
    if (inp.R) {
      const holder = P.own && P.own.team === 1 ? P.own : null;
      if (holder && Math.hypot(holder.x - me.x, holder.y - me.y) < 18 && S.rn() < .75) { P.own = me; S.cd = .1; O.sfx('ol_thunk'); game.shake(2); run.addHype(.06); }
      else { let bi = S.c, bd = 1e9; S.sk.forEach((k, i) => { if (k.team === 0 && i !== S.c) { const d = Math.hypot(k.x - P.x, k.y - P.y); if (d < bd) { bd = d; bi = i; } } }); S.c = bi; O.sfx('ol_tick'); }
    }
    // the ai skaters
    const opp = O.diff().cpu + O.tune.cpuSkill;
    S.sk.forEach((k, i) => {
      if (i === S.c) return;
      const goalX = k.team === 0 ? W : -W; let tx, ty, sp2 = (k.team === 1 ? 62 + opp * 60 : 58);
      const mine = P.own === k, ownSide = P.own && P.own.team === k.team;
      const nearest = S.sk.filter(q => q.team === k.team && (q !== S.sk[S.c] || k.team === 1)).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0] === k;
      if (mine) { tx = goalX * .9; ty = 0; if (Math.abs(k.x - goalX) < 110 && S.cd <= 0) { const dx = goalX - k.x, dy = (S.rn() - .5) * RK.gy * 1.6 - k.y, d = Math.hypot(dx, dy) || 1; P.vx = dx / d * 190; P.vy = dy / d * 190; P.own = null; S.cd = .5; O.sfx('ol_puck'); } }
      else if (nearest && !ownSide) { tx = P.x; ty = P.y; if (P.own && Math.hypot(k.x - P.own.x, k.y - P.own.y) < 14 && S.rn() < dt * 1.5 && S.cd <= 0) { P.own = k; S.cd = .2; } }
      else if (nearest && ownSide && P.own !== k) { tx = P.own.x + (k.team === 0 ? 30 : -30); ty = P.own.y * -1; }
      else { tx = goalX * (ownSide ? .45 : -.4) + (i % 3 - 1) * 20; ty = (i % 3 - 1) * 45; }
      const dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy) || 1; k.vx += (dx / d * Math.min(sp2, d * 3) - k.vx) * Math.min(1, dt * 5); k.vy += (dy / d * Math.min(sp2, d * 3) - k.vy) * Math.min(1, dt * 5);
    });
    S.sk.forEach(k => { k.x = clamp(k.x + k.vx * dt, -W + 6, W - 6); k.y = clamp(k.y + k.vy * dt, -H + 6, H - 6); });
    // puck
    if (P.own) { const o = P.own, dir = o.team === 0 ? 1 : -1; P.x = o.x + dir * 8; P.y = o.y + 2; P.vx = P.vy = 0; }
    else {
      P.x += P.vx * dt; P.y += P.vy * dt; P.vx *= Math.exp(-dt * .7); P.vy *= Math.exp(-dt * .7);
      if (Math.abs(P.y) > H - 3) { P.y = Math.sign(P.y) * (H - 3); P.vy *= -.8; }
      if (S.cd <= 0) for (const k of S.sk) if (Math.hypot(k.x - P.x, k.y - P.y) < 8) { P.own = k; if (k.team === 0 && S.sk[S.c] !== k && Math.hypot(k.x - S.sk[S.c].x, k.y - S.sk[S.c].y) < 60) S.c = S.sk.indexOf(k); break; }
      // goals and goalies
      for (const side of [1, -1]) {
        const gx = side * W, gy = this.goalieY(S, side, dt);
        if ((side === 1 && P.x > gx - 5) || (side === -1 && P.x < gx + 5)) {
          if (Math.abs(P.y) < RK.gy && Math.abs(P.y - gy) > 7 + (side === 1 ? 0 : 2)) { this.scored(run, side === 1); return; }
          P.vx = -side * Math.abs(P.vx) * .6; P.x = gx - side * 6; if (Math.abs(P.y) < RK.gy) { O.sfx('ol_clang'); if (side === 1) run.stamp('SAVED!'); } else P.vx = -side * 40;
        }
      }
    }
    if (Math.abs(P.x) > W) P.x = Math.sign(P.x) * W;
    const sc = this.score(run); run.hudMain = S.gf + ' - ' + S.ga; run.hudSub = Math.ceil(Math.max(0, S.clock)) + 's';
    if (S.clock <= 0) { const v = this.score(run); S.over = true; run.endAttempt(v, S.gf + '-' + S.ga + ' vs ' + S.opp.id); O.Comms.say(v > 12 ? 'great' : v > 6 ? 'good' : 'bad'); if (O.Records.isWR(run.ev, v)) O.Fireworks.burst(200, 80); }
  },
  score(run) { const S = run.S; return Math.max(0, 5 + 3 * S.gf - 2 * S.ga + Math.floor(S.hold)); },
  goalieY(S, side, dt) { const k = side === 1 ? (S.gyR = (S.gyR || 0)) : (S.gyL = (S.gyL || 0)); const tgt = clamp(S.puck.y, -RK.gy + 5, RK.gy - 5), sp = side === 1 ? 38 + (O.diff().cpu + O.tune.cpuSkill) * 80 : 42, v = k + clamp(tgt - k, -sp * .016, sp * .016); if (side === 1) S.gyR = v; else S.gyL = v; return v; },
  scored(run, forUs) {
    const S = run.S; if (forUs) { S.gf++; run.stamp('GOAL!'); O.sfx('ol_bell'); O.crowd(1); O.Fireworks.burst(200, 70); run.addHype(.25); O.Comms.say('good'); } else { S.ga++; run.yikesNow('THEY SCORED!', .06); }
    game.shake(4); this.reset(run);
  },
  draw(run, r) {
    const S = run.S; S.cy = 120; S.cx = r.W / 2; O.backdrop('ice').draw(r);
    r.overlay(g => {
      const cx = r.W / 2, cy = 120, W = RK.w / 2, H = RK.h / 2;
      px.rect(g, 0, 28, r.W, r.H, '#0f1a44'); O.stands(g, r, 30, 36, 91, .5, 0);
      px.rect(g, cx - W - 8, cy - H - 8, RK.w + 16, RK.h + 16, '#e8443a'); px.rect(g, cx - W - 4, cy - H - 4, RK.w + 8, RK.h + 8, '#f4f4f4'); px.rect(g, cx - W, cy - H, RK.w, RK.h, '#dff0ff');
      px.rect(g, cx - 1, cy - H, 2, RK.h, '#e8443a'); px.disc(g, cx, cy, 16, '#7fb2ff'); px.disc(g, cx, cy, 14, '#dff0ff'); px.rect(g, cx - W + 40, cy - H, 2, RK.h, '#7fb2ff'); px.rect(g, cx + W - 40, cy - H, 2, RK.h, '#7fb2ff');
      for (const side of [-1, 1]) { const gy = side === 1 ? (S.gyR || 0) : (S.gyL || 0), gx = cx + side * W; px.rect(g, gx - (side === 1 ? 2 : 6), cy - RK.gy, 8, RK.gy * 2, '#ff6a5a'); px.rect(g, gx - 6 * side - 3, cy + gy - 6, 7, 12, side === 1 ? S.opp.colors.a : run.nat.colors.a); px.rect(g, gx - 6 * side - 3, cy + gy - 2, 7, 4, '#fff'); }
      S.sk.forEach((k, i) => { const nat = k.team === 0 ? run.nat : S.opp, x = cx + k.x, y = cy + k.y; px.disc(g, x, y + 1, 6, 'rgba(0,0,40,.25)'); px.disc(g, x, y, 5, nat.colors.a); px.rect(g, x - 5, y + 1, 10, 3, nat.colors.b); px.disc(g, x, y - 5, 3, nat.athlete.skin); px.rect(g, x + (k.team === 0 ? 3 : -8), y + 4, 6, 2, '#6a4a2a'); if (i === S.c) { px.rect(g, x - 3, y - 15, 7, 3, '#ffe27a'); px.poly(g, [[x - 3, y - 12], [x + 4, y - 12], [x, y - 9]], '#ffe27a'); } });
      px.disc(g, cx + S.puck.x, cy + S.puck.y, 3, '#111'); px.disc(g, cx + S.puck.x, cy + S.puck.y, 2, '#444');
      if (S.chg) { px.rect(g, cx - 40, r.H - 56, 80, 8, '#161a3c'); px.rect(g, cx - 39, r.H - 55, 78 * S.pow, 6, S.pow > .8 ? '#ff6a4a' : '#ffd36a'); }
      px.rect(g, 12, r.H - 40, 60, 5, '#161a3c'); px.rect(g, 12, r.H - 40, 60 * S.stamina, 5, '#7fe0ff'); O.T(g, 'BURST', 12, r.H - 49, '#fff', { s: 1 });
      O.T(g, run.nat.id + '  ' + S.gf + ' - ' + S.ga + '  ' + S.opp.id, cx, 31, '#fff', { s: 1, align: 'center' });
    });
  },
  bot(run, inp, dt) {
    const S = run.S, me = S.sk[S.c], P = S.puck, W = RK.w / 2;
    if (P.own === me) { const ty = (S.sk[3].y > 0 ? -1 : 1) * 10; inp.mv = [1, clamp((ty - me.y) / 20, -1, 1)]; inp.alt = true; if (me.x > W - 130) { inp.Ad = true; if (S.pow > .55 && S.chg) inp.Au = true; } }
    else { const own = P.own && P.own.team === 0; if (own) inp.mv = [1, 0]; else inp.mv = [clamp((P.x - me.x) / 15, -1, 1), clamp((P.y - me.y) / 15, -1, 1)]; if (P.own && P.own.team === 1 && Math.hypot(P.own.x - me.x, P.own.y - me.y) < 16) inp.R = true; inp.alt = true; }
    if (run.hype >= 1) inp.T = true;
  }
});
})();
