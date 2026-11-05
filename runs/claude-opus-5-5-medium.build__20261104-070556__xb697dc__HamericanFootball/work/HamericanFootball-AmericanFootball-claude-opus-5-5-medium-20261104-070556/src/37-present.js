/* PRESENTATION: the camera director (broadcast shots, the kick cam, punch-ins), the FX on every event (hit-stop, shake,
 * slow motion, comic bursts, confetti, fireworks, pyro, divots, footprints, breath, fire), the refs and the sideline cast,
 * and the two announcers' commentary with captions and babble voices. It reads the sim and listens to its events; it
 * never changes the sim. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, Y = 16, F = FF.FIELD, bus = FF.bus;
const hyp = Math.hypot, rf = () => FF.rf();
const P = game.particles;

/* ---------------- THE CAMERA ---------------- */
const CAM = FF.cam = {
  x: 1024, y: F.MID_Y, z: 10, zoom: 1, punch: 0, view: 'broadcast', kickView: null, free: false,
  reset() { CAM.x = S.los || 1024; CAM.y = F.MID_Y; CAM.zoom = 1; CAM.punch = 0; },
  baseView() { return game.settings.camera || 'broadcast'; },
  update(dt, o = {}) {
    if (CAM.free) return;
    let tx = CAM.x, ty = CAM.y, tz = 1;
    const B = S.ball, c = S.carrier(), Pl = S.play;
    // the kick cam for field goals and PATs
    const kick = Pl && Pl.kind === 'fg' && (S.phase === 'PRESNAP' || S.phase === 'LIVE' || (S.phase === 'DEAD' && S.phaseT > .4)) && !o.noKickCam;
    const wantView = kick ? (S.dir[S.poss] > 0 ? 'kickR' : 'kickL') : (o.view || CAM.baseView());
    if (wantView !== CAM.view) { CAM.view = wantView; game.setView(wantView); }
    if (o.target) { tx = o.target[0]; ty = o.target[1]; tz = o.target[2] || 1; }
    else if (S.phase === 'PLAYCALL' || S.phase === 'PRESNAP' || S.phase === 'COIN') {
      tx = S.los + S.dir[S.poss] * (S.mode === 'kickoff' ? 18 : 5) * Y; ty = (S.spotY || F.MID_Y) * .6 + F.MID_Y * .4; tz = S.mode === 'kickoff' ? .8 : 1;
      if (kick) { tx = S.los - S.dir[S.poss] * 4 * Y; ty = F.MID_Y; tz = 1.1; }
    } else if (S.phase === 'LIVE' || S.phase === 'DEAD') {
      if (kick && B.state === 'kick') { tx = B.x; ty = B.y; tz = 1; }
      else if (kick) { tx = S.los; ty = F.MID_Y; tz = 1.1; }
      else if (B.state === 'pass' && !B.forced) { tx = (B.x + B.tx) / 2; ty = (B.y + B.ty) / 2; const d = hyp(B.tx - B.x, B.ty - B.y); tz = E.clamp(260 / Math.max(260, d * .9), .62, 1); }
      else if (B.state === 'kick') { tx = B.x; ty = B.y; tz = .75; }
      else if (c) {
        const qbPass = Pl && Pl.kind === 'pass' && !Pl.passThrown && c.slot === 'QB';
        if (qbPass) { const far = S.receivers(c.team).reduce((m, r) => Math.max(m, Math.abs(r.b.x - c.b.x)), 0); tx = c.b.x + S.dir[c.team] * Math.min(far, 25 * Y) * .45; ty = c.b.y * .5 + F.MID_Y * .5; tz = E.clamp(300 / Math.max(300, far * 1.1 + 120), .7, 1); }
        else { tx = c.b.x + c.b.vx * FF.T.camLead; ty = c.b.y + c.b.vy * FF.T.camLead * .6; tz = 1.05; }
      } else { tx = B.x; ty = B.y; tz = 1; }
    } else if (S.phase === 'CELEBRATE' && S.scorer) { tx = S.scorer.b.x; ty = S.scorer.b.y; tz = 1.35; }
    else if (S.phase === 'FINAL' || S.phase === 'HALFTIME' || S.phase === 'QUARTER') { tx = 1024; ty = F.MID_Y; tz = .9; }
    const k = 1 - Math.exp(-dt / Math.max(.02, FF.T.camSmooth));
    CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k;
    CAM.punch = Math.max(0, CAM.punch - dt);
    // zoom snaps to a few levels (each level is a floor bake the engine keeps), with a little hysteresis
    const LV = [.625, .75, 1, 1.25, 1.5], want = CAM.punch > 0 ? Math.min(1.5, tz * 1.25) : tz;
    const lv = LV.reduce((b, v) => Math.abs(v - want) < Math.abs(b - want) ? v : b, LV[0]);
    if (lv !== CAM.zoom) { CAM.zt = (CAM.zt || 0) + dt; if (CAM.zt > (CAM.punch > 0 ? 0 : .35) || Math.abs(lv - CAM.zoom) > .3) { CAM.zoom = lv; CAM.zt = 0; } } else CAM.zt = 0;
    game.setZoom(CAM.zoom);
    game.focus(CAM.x, CAM.y, 10);
  },
  punchIn() { if (!game.reduceMotion) CAM.punch = .5; }
};

/* ---------------- FX ---------------- */
const pops = [], center = [], decals = [], helmets = [], prints = [];
const FX = FF.fx = {
  pops, center, decals, helmets,
  pop(x, y, z, text, o = {}) { pops.push({ x, y, z, text, t: 0, o }); if (pops.length > 8) pops.shift(); },
  center(text, o = {}) { center.length = 0; center.push({ text, t: 0, dur: o.dur || 1.8, o }); },
  clear() { pops.length = 0; center.length = 0; decals.length = 0; helmets.length = 0; prints.length = 0; },
  slowmo(scale, dur) { if (game.reduceMotion || FF.fast || S.hub) return; game.timeScale = scale; FX.slowT = dur; },
  update(dt) {
    const real = dt / Math.max(.05, game.timeScale);
    for (const p of pops) p.t += real; while (pops.length && pops[0].t > (pops[0].o.dur || .9)) pops.shift();
    for (const c of center) c.t += real; while (center.length && center[0].t > center[0].dur) center.shift();
    if (FX.slowT > 0) { FX.slowT -= real; if (FX.slowT <= 0) game.timeScale = 1; }
    for (const h of helmets) { h.body.update(dt, null); h.t += dt; if (h.body.z <= .5) { h.body.vx *= .96; h.body.vy *= .96; } }
    while (helmets.length && helmets[0].t > 8) helmets.shift();
    for (const d of decals) d.t += dt;
    for (const f of prints) f.t += dt; while (prints.length && prints[0].t > 6) prints.shift();
    // fire on blazing athletes, breath in the cold, footprints in snow and mud
    const sd = FF.Stadium.cur;
    for (const a of S.athletes) {
      if (a.hot > 0 && rf() < dt * 20) P.fire(a.b.x, a.b.y, 4 + rf() * 20, 1, { size: 3 });
      if (sd && sd.special === 'breath' && rf() < dt / 1.2) P.smoke(a.b.x + Math.cos(a.facing) * 4, a.b.y + Math.sin(a.facing) * 4, a.b.z + 30, 1, { size: 2, color: '#e8f0ff' });
      if (sd && (sd.surface.snow || sd.surface.mud) && hyp(a.b.vx, a.b.vy) > 60 && rf() < dt / .15) { const s = FF.sim.surface(a.b.x, a.b.y); if (s === 'mud' || sd.surface.snow) { prints.push({ x: a.b.x, y: a.b.y, t: 0, c: s === 'mud' ? '#3a2410' : '#b8c4d4' }); if (prints.length > 200) prints.shift(); } }
      if (a.afterburn > 0 && rf() < dt * 30) P.glints(a.b.x, a.b.y, 16, 1, '#3af0f0', 8);
    }
    const B = S.ball;
    if ((B.state === 'pass' || B.state === 'kick') && B.fire && rf() < dt * 40) P.fire(B.x, B.y, B.z, 1, { size: 2 });
    if (B.state === 'pass' && B.golden && rf() < dt * 40) P.glints(B.x, B.y, B.z, 1, '#ffe060', 4);
  },
  draw(r) {
    for (const d of decals) r.decal(g => { const p = r.w(d.x, d.y, 0); px.blend(g, Math.max(0, .8 - d.t / 60), 'normal', () => { px.ell(g, Math.round(p[0]), Math.round(p[1]), 5, 2, d.c); px.dot(g, p[0] + 3, p[1] - 1, d.c2); }); });
    for (const f of prints) r.decal(g => { const p = r.w(f.x, f.y, 0); px.blend(g, .5 * (1 - f.t / 6), 'normal', () => px.rect(g, Math.round(p[0]), Math.round(p[1]), 2, 1, f.c)); });
    for (const h of helmets) { const b = h.body; r.shadow(b.x, b.y, 4, .3); r.queue(b.x, b.y, b.z + 5, g => { const p = r.w(b.x, b.y, b.z + 5), t = E.tones(h.color); px.disc(g, p[0], p[1], 4, t.sh); px.disc(g, p[0] - .5, p[1] - .5, 3, t.base); px.line(g, p[0] + 2, p[1] - 1, p[0] + 4, p[1] + 2, '#a0a4ac'); px.dot(g, p[0] - 1, p[1] - 2, t.hi); }); }
    for (const p of pops) r.overlay(g => { const [sx, sy] = r.w(p.x, p.y, p.z + 40); UI().burst(g, sx, sy, p.text, p.t, p.o); });
  },
  drawCenter(g) {
    for (const c of center) {
      const k = Math.min(1, c.t / .15), sc = (c.o.scale || 3) * (c.t < .15 ? .5 + k * .5 : 1), a = c.t > c.dur - .3 ? (c.dur - c.t) / .3 : 1;
      if (a <= 0) continue;
      const y = c.o.y || game.H * .3, shine = (c.t * 2) % 2;
      E.font.title(g, c.text, Math.round(game.W / 2), Math.round(y), { scale: Math.max(1, Math.round(sc)), colors: c.o.colors || ['#ffffff', '#ffe890', '#ffb030', '#e0502a'], align: 'center', outline: '#14081a', depth: 2, depthColor: c.o.depth || '#4a1a5a' });
      if (c.o.sub) E.font.text(g, c.o.sub, Math.round(game.W / 2), Math.round(y + 8 * Math.round(sc) + 6), '#f4f0e6', { align: 'center', scale: 2, shadow: '#000', outline: false });
      void shine;
    }
  }
};
const UI = () => FF.ui;
const at = id => S.athlete(id);
const teamColor = t => S.teams[t] ? S.teams[t].colors.primary : '#ffffff';
const surfBits = (x, y) => { const s = FF.sim.surface(x, y), sd = FF.Stadium.cur; return s === 'mud' ? ['#5a3a1a', '#3a2410', '#7a5a30'] : sd && sd.surface.snow ? ['#f0f4ff', '#d8e4f4', '#ffffff'] : ['#4a8a3a', '#2e5a22', '#8a6a40']; };
const divot = (x, y) => { decals.push({ x, y, t: 0, c: '#3a2a14', c2: '#4a8a3a' }); if (decals.length > 40) decals.shift(); };
function crowd(kind, v) { FF.Stadium.excite(v); FF.crowdAudio.react(kind); }
const on = (n, f) => bus.on(n, e => { if (FF.fast) return; try { f(e); } catch (err) { game.fail('fx ' + n, err); } });

on('snap', () => { FF.sfx('hike'); });
on('pass', e => { FF.sfx(e.type === 'bullet' ? 'rocketPass' : 'throwWhoosh'); });
on('catch', e => { FF.sfx('catchSlap'); const a = at(e.a); if (a && e.yards >= 20) { crowd('cheerSwell', .7); FX.pop(a.b.x, a.b.y, 20, 'WHAT A CATCH!', { scale: 1 }); } });
on('drop', e => { FF.sfx('drop'); const a = at(e.a); if (a) FX.pop(a.b.x, a.b.y, 20, 'DROPPED!', { bg: '#a8c8ff' }); crowd('groan', .3); });
on('incomplete', e => { if (!e.drop) FX.center('INCOMPLETE', { scale: 2, dur: 1.2, colors: ['#f4f4f4', '#c0c4cc', '#8a8e96'] }); FF.sfx('whistleShort'); });
on('tackle', e => { FF.sfx(e.bigHit ? 'bigHit' : 'padsCrunch'); P.bits(e.x, e.y, 6, 5, surfBits(e.x, e.y)); if (e.yards < 0) crowd('oooh', .4); });
on('bigHit', e => {
  game.hitFx(e.x, e.y, e.z, { power: 1.2, angle: e.angle, sound: null, rumble: true });
  FF.sfx('helmetClang'); P.sparks(e.x, e.y, e.z, 8, e.angle, { color: '#ffffff' }); P.bits(e.x, e.y, 4, 10, surfBits(e.x, e.y)); divot(e.x, e.y);
  if (!game.reduceMotion) { game.freeze(.08); game.shake(4 * (game.settings.shake === undefined ? 1 : game.settings.shake)); } CAM.punchIn(); FX.slowmo(.4, .3);
  FX.pop(e.x, e.y, e.z, ['BOOM!', 'WHAM!', 'KER-RUNCH!', 'POW!'][Math.floor(rf() * 4)], { scale: 2 }); crowd('oooh', .85);
});
on('megaHit', e => {
  game.hitFx(e.x, e.y, e.z, { power: 2, angle: e.angle, sound: null, rumble: true }); FF.sfx('bigHit'); FF.sfx('helmetClang');
  P.sparks(e.x, e.y, e.z, 16, e.angle, { color: '#ffffff' }); P.bits(e.x, e.y, 4, 18, surfBits(e.x, e.y)); divot(e.x, e.y); divot(e.x + 10, e.y + 4);
  if (!game.reduceMotion) { game.freeze(.12); game.shake(7 * (game.settings.shake === undefined ? 1 : game.settings.shake)); if (game.settings.flashes !== 0) game.flash('#ffffff', .12, .6 * (game.settings.flashes === undefined ? 1 : game.settings.flashes)); }
  CAM.punchIn(); FX.slowmo(.25, .6); FX.pop(e.x, e.y, e.z, 'MEGA HIT!', { scale: 2, bg: '#ff6a3a', colors: ['#ffffff', '#fff0a0', '#ffd040'] }); crowd('roar', 1);
});
on('helmetPop', e => { const b = new E.Body({ x: e.x, y: e.y, r: 3, bounce: .5, gravity: 600 }); b.z = e.z; b.vz = 220; b.vx = (rf() - .5) * 160; b.vy = (rf() - .5) * 120; helmets.push({ body: b, t: 0, color: S.teams[e.team].colors.helmet }); });
on('fumble', e => { const a = at(e.a); if (a) FX.pop(a.b.x, a.b.y, 20, 'FUMBLE!', { bg: '#ff4a3a' }); crowd('gasp', .8); FF.sfx('drop'); });
on('pile', e => { P.dust(e.x, e.y, 4, 16, { speed: 50, size: 2.4, color: FF.sim.surface(e.x, e.y) === 'mud' ? '#6a4a2a' : '#c8b898' }); FF.sfx('pileThumps'); FX.pop(e.x, e.y, 10, 'PILE UP!', { bg: '#c8b080' }); CAM.punchIn(); crowd('oooh', .8); });
on('recover', e => { if (e.lost) FX.center('TURNOVER!', { scale: 3, dur: 1.6, colors: ['#ffffff', '#ffc0b0', '#ff5a3a'] }); });
on('int', e => { const a = at(e.a); if (a) FX.pop(a.b.x, a.b.y, 20, 'PICKED OFF!', { bg: '#7ad0ff' }); FX.center('INTERCEPTED!', { scale: 3, dur: 1.4, colors: ['#ffffff', '#c0e8ff', '#3a8aff'] }); crowd('gasp', .9); });
on('sack', e => { const q = at(e.qb); if (q) FX.pop(q.b.x, q.b.y, 20, 'SACKED!', { bg: '#ffb030' }); crowd('roar', .8); });
on('pancake', e => { const a = at(e.d); if (a) FX.pop(a.b.x, a.b.y, 10, 'PANCAKE!', { scale: 1, bg: '#f0c070' }); FF.sfx('padsCrunch'); });
on('brokenTackle', e => { const a = at(e.a); if (a) FX.pop(a.b.x, a.b.y, 20, 'BROKEN TACKLE!', { scale: 1, bg: '#a0ff8a' }); crowd('cheerSwell', .6); });
on('evade', e => { const a = at(e.a); FF.sfx(e.how === 'spin' ? 'spinWhoosh' : 'hurdleHop'); if (a) FX.pop(a.b.x, a.b.y, 20, e.how === 'spin' ? 'SPIN MOVE!' : 'OVER THE TOP!', { scale: 1, bg: '#a0ff8a' }); crowd('cheerSwell', .55); });
on('act', e => { const a = at(e.a); if (!a) return; if (e.act === 'dive' || e.act === 'tackleDive' || e.act === 'diveCatch') { FF.sfx('dive'); } if (e.act === 'stiffArm') FF.sfx('stiffArm'); if (e.act === 'hurdle' || e.act === 'jump') FF.sfx('hurdleHop'); if (e.act === 'spin') FF.sfx('spinWhoosh'); });
on('td', e => {
  const a = at(e.a), c = S.teams[e.team].colors, x = a ? a.b.x : S.ball.x, y = a ? a.b.y : S.ball.y;
  FX.center('TOUCHDOWN!', { scale: 4, dur: 2.6, colors: ['#ffffff', E.mix(c.primary, '#ffffff', .5), c.primary, E.shade(c.primary, -.3)], sub: e.player });
  FF.music.sting('STING_TD'); FF.sfx('airHorn'); FF.sfx('cannon'); crowd('roar', 1);
  for (let k = 0; k < 4; k++) game.after(.3 * k, () => { P.bits(x + (rf() - .5) * 120, y + (rf() - .5) * 80, 160, 24, [c.primary, c.secondary, c.trim, '#ffffff']); FF.sfx('confettiPop'); });
  for (let k = 0; k < 3; k++) game.after(.5 + .4 * k, () => { const fx2 = x + (rf() - .5) * 200, fy = F.SIDE_T - 40; P.explosion(fx2, fy, 300 + rf() * 80, 1.2, { debris: false, shake: 0, freeze: false }); P.ring(fx2, fy, 4, 40, [c.primary, c.trim, '#ffffff'][k % 3], .6); FF.sfx('fireworks'); });
  // pyro at the end zone corners
  const ex = S.dir[e.team] > 0 ? F.GOAL_R + 5 * Y : F.GOAL_L - 5 * Y;
  for (const py of [F.SIDE_T - 8, F.SIDE_B + 8]) for (let k = 0; k < 6; k++) game.after(k * .08, () => P.fire(ex, py, 6 + k * 10, 4, { size: 6 }));
});
on('firstDown', () => { if (S.mode === 'normal') { FX.center('FIRST DOWN!', { scale: 2, dur: 1.4, colors: ['#ffffff', '#fff0a0', '#ffd040'] }); FF.music.sting('STING_FD'); crowd('cheerSwell', .5); } });
on('downs', e => { if (e.down === 3 && e.toGo >= 10) FF.music.sting('STING_DEF'); if (e.down === 4) FX.center('4TH DOWN', { scale: 2, dur: 1.2 }); if (S.mode === 'normal' && S.yardline(S.los, S.poss) >= 80 && !S._rz) { S._rz = true; FX.center('RED ZONE', { scale: 2, dur: 1.2, colors: ['#ffffff', '#ffb0b0', '#ff3a3a'] }); } if (S.yardline(S.los, S.poss) < 80) S._rz = false; });
on('turnoverOnDowns', () => FX.center('TURNOVER ON DOWNS', { scale: 2, dur: 1.6, colors: ['#ffffff', '#ffc0b0', '#ff5a3a'] }));
on('safety', () => { FX.center('SAFETY!', { scale: 3, dur: 2 }); crowd('roar', .9); });
on('touchback', () => FX.center('TOUCHBACK', { scale: 2, dur: 1.2 }));
on('kickoff', () => { FF.sfx('kickThump'); crowd('cheerSwell', .5); });
on('punt', () => FF.sfx('kickThump'));
on('fgKick', () => FF.sfx('kickThump'));
on('kickBlocked', e => { const a = at(e.a); FF.sfx('padsCrunch'); if (a) FX.pop(a.b.x, a.b.y, 30, 'BLOCKED!', { bg: '#ff6a3a' }); crowd('roar', .9); });
on('fg', e => { if (e.doink) { FF.sfx('doink'); FX.pop(S.ball.x, S.ball.y, S.ball.z, 'DOINK!', { bg: '#ffe060' }); } FX.center(e.good ? "IT'S GOOD!" : 'NO GOOD!', { scale: 3, dur: 1.8, colors: e.good ? ['#ffffff', '#c0ffb0', '#3ad04a'] : ['#ffffff', '#ffc0b0', '#ff3a3a'] }); crowd(e.good ? 'roar' : 'groan', e.good ? .9 : .4); if (e.good) FF.music.sting('STING_FD'); });
on('pat', e => { if (e.doink) FF.sfx('doink'); FX.center(e.good ? 'EXTRA POINT GOOD' : 'NO GOOD!', { scale: 2, dur: 1.4 }); });
on('twoGood', () => FX.center('TWO POINTS!', { scale: 3, dur: 1.6 }));
on('hotOn', e => { const a = at(e.a); if (a) { FX.pop(a.b.x, a.b.y, 26, 'BLAZING!', { bg: '#ff6a1a', colors: ['#ffffff', '#fff0a0', '#ffd040'] }); P.fire(a.b.x, a.b.y, 10, 12, { size: 6 }); } FF.sfx('hotOn'); FF.music.layer('hot', 1); crowd('roar', .8); });
on('hotOff', () => { if (!S.athletes.some(a => a.hot > 0)) FF.music.layer('hot', 0); });
on('fiascoBreak', e => { FX.center('FIASCO BREAK!', { scale: 3, dur: 1.8, colors: ['#fff6ff', '#e0a0ff', '#a040e0'], sub: e.card ? FF.card(e.card).name : 'HAND FULL' }); FF.sfx('fiascoBreak'); FF.sfx('cardFlip'); });
on('cardUsed', e => { const c = FF.card(e.card); FX.center(c.name, { scale: 2, dur: 1.6, colors: ['#fff6ff', '#ffe890', '#c08aff'], y: game.H * .22 }); FF.sfx('cardFlip'); });
on('lateHit', e => { FX.pop(e.x, e.y, 20, 'LATE HIT!', { bg: '#ff8a3a', scale: 1 }); FF.sfx('bigHit'); crowd(rf() < .5 ? 'boo' : 'oooh', .7); FF.sfx('refCapPop'); });
on('special', e => { const a = at(e.a); FX.center(e.who, { scale: 2, dur: 1.4, y: game.H * .2, sub: { mudslide: 'MUDSLIDE!', afterburner: 'AFTERBURNER!', snowplow: 'SNOWPLOW!', goldenspiral: 'GOLDEN SPIRAL!', seismic: 'SEISMIC SACK!', nightvision: 'NIGHT VISION' }[e.kind], colors: ['#ffffff', '#ffe890', '#ffb030'] }); FF.sfx(e.kind === 'afterburner' ? 'afterburner' : e.kind === 'goldenspiral' ? 'golden' : 'hotOn'); if (a && e.kind === 'mudslide') P.bits(a.b.x, a.b.y, 4, 20, ['#5a3a1a', '#3a2410']); if (a && e.kind === 'snowplow') P.bits(a.b.x, a.b.y, 4, 20, ['#f0f4ff', '#ffffff']); crowd('roar', .8); });
on('seismic', e => { P.ring(e.x, e.y, 6, 60, '#ffe0a0', .5); P.ring(e.x, e.y, 4, 40, '#ffffff', .35); P.dust(e.x, e.y, 2, 24, { speed: 90, size: 2.5 }); FF.sfx('seismic'); if (!game.reduceMotion) game.shake(7); FX.pop(e.x, e.y, 30, 'SEISMIC!', { bg: '#ffb030' }); CAM.punchIn(); });
on('mascotOn', () => { FF.sfx('mascotSqueak'); crowd('roar', .9); });
on('mascotHit', e => { const a = at(e.a); if (a) FX.pop(a.b.x, a.b.y, 20, e.sack ? 'MASCOT SACK!' : 'BONK!', { bg: '#ffd84a' }); FF.sfx('mascotSqueak'); FF.sfx('padsCrunch'); });
on('lightsOut', () => { FF.sfx('lightsOut'); FX.center('LIGHTS OUT!', { scale: 3, dur: 2, colors: ['#7aff6a', '#3ad04a', '#1a8a2a'] }); });
on('lightsOn', () => FF.sfx('lightsOn'));
on('dead', e => { if (e.res.type !== 'td') FF.sfx(e.res.type === 'incomplete' ? 'whistleShort' : 'whistle'); });
on('quarterEnd', e => FX.center('END OF THE ' + ['1ST', '2ND', '3RD', '4TH'][e.q - 1], { scale: 2, dur: 1.6 }));
on('halftime', () => FX.center('HALFTIME', { scale: 3, dur: 2.5 }));
on('overtime', () => FX.center('OVERTIME!', { scale: 3, dur: 2 }));
on('final', () => { FF.sfx('whistle'); FF.sfx('airHorn'); });
on('coin', () => FF.sfx('coinFlip'));
on('dance', () => FF.sfx('cheerSwell'));
on('twoMinute', () => FX.center('TWO-MINUTE WARNING', { scale: 2, dur: 1.8 }));

/* ---------------- REFS AND THE SIDELINE CAST (cosmetic) ---------------- */
const CAST = FF.cast = {
  refs: [], side: [],
  build() {
    CAST.bandRigs = null;
    CAST.refs = [0, 1, 2].map(i => ({ rig: FF.Rigs.ref(), b: { x: 1024, y: F.MID_Y + (i - 1) * 100, z: 0, vx: 0, vy: 0 }, facing: Math.PI / 2, pose: 'IDLE', poseU: 0, id: 900 + i, down: 0, sig: 0 }));
    CAST.side = [];
    const home = S.teams[0], away = S.teams[1];
    for (let k = 0; k < 4; k++) CAST.side.push({ rig: FF.Rigs.cheerleader(home, k), b: { x: 820 + k * 34, y: F.SIDE_B + 36, z: 0, vx: 0, vy: 0 }, facing: -Math.PI / 2, pose: 'CHEERLEADER', id: 910 + k, role: 'cheer' });
    CAST.side.push({ rig: FF.Rigs.mascot(home), b: { x: 960, y: F.SIDE_B + 50, z: 0, vx: 0, vy: 0 }, facing: -Math.PI / 2, pose: 'IDLE', id: 920, role: 'mascot', team: 0 });
    CAST.side.push({ rig: FF.Rigs.mascot(away), b: { x: 1300, y: F.SIDE_B + 50, z: 0, vx: 0, vy: 0 }, facing: -Math.PI / 2, pose: 'IDLE', id: 921, role: 'mascot', team: 1 });
    CAST.side.push({ rig: FF.Rigs.cast({ build: home.coach.build, skin: home.coach.skin, cloth: home.coach.cloth, cap: home.coach.hat, headset: true }), b: { x: 700, y: F.SIDE_B + 26, z: 0, vx: 0, vy: 0 }, facing: -Math.PI / 2, pose: 'COACH_YELL', id: 930, role: 'coach', team: 0 });
    CAST.side.push({ rig: FF.Rigs.cast({ build: away.coach.build, skin: away.coach.skin, cloth: away.coach.cloth, cap: away.coach.hat, headset: true }), b: { x: 1350, y: F.SIDE_B + 26, z: 0, vx: 0, vy: 0 }, facing: -Math.PI / 2, pose: 'COACH_YELL', id: 931, role: 'coach', team: 1 });
    if (!S.mascotRig || S.mascotRigTeam === undefined) S.mascotRig = null;
  },
  update(dt) {
    const los = S.los, d = S.dir[S.poss] || 1, c = S.carrier();
    const spots = [[los + d * 7 * Y, F.MID_Y + 40], [los + d * 22 * Y, F.MID_Y - 60], [los, F.SIDE_T - 20]];
    CAST.refs.forEach((rf2, i) => {
      if (rf2.down > 0) { rf2.down -= dt; rf2.pose = 'DOWN'; FF.Rigs.driveRig(rf2.rig, rf2, dt); return; }
      let [tx, ty] = S.phase === 'LIVE' && c && i < 2 ? [c.b.x - d * (i ? -12 : 6) * Y, c.b.y + (i ? 80 : -60)] : spots[i];
      if (S.mode === 'kickoff') { tx = spots[i][0] + d * 20 * Y; }
      const dx = tx - rf2.b.x, dy = ty - rf2.b.y, dd = hyp(dx, dy), sp = Math.min(dd * 2, 110);
      rf2.b.vx = dd > 2 ? dx / dd * sp : 0; rf2.b.vy = dd > 2 ? dy / dd * sp : 0; rf2.b.x += rf2.b.vx * dt; rf2.b.y += rf2.b.vy * dt;
      rf2.facing = dd > 8 ? Math.atan2(dy, dx) : -Math.PI / 2;
      rf2.sig = Math.max(0, rf2.sig - dt);
      rf2.pose = rf2.sig > 0 ? rf2.sigPose : hyp(rf2.b.vx, rf2.b.vy) > 12 ? 'RUN' : 'IDLE';
      // a play running through a ref knocks him over
      if (S.phase === 'LIVE' && c && hyp(c.b.x - rf2.b.x, c.b.y - rf2.b.y) < 10 && rf2.down <= 0 && rf() < .5) { rf2.down = 1.5; rf2.b.vx = c.b.vx * .5; rf2.b.vy = c.b.vy * .5; bus.emit('refDown', {}); FF.sfx('padsCrunch'); FX.pop(rf2.b.x, rf2.b.y, 20, 'ZEBRA DOWN!', { scale: 1 }); }
      FF.Rigs.driveRig(rf2.rig, rf2, dt);
    });
    CAST.band(dt);
    const E01 = FF.Stadium.E, phase = S.phase;
    for (const s of CAST.side) {
      if (s.role === 'mascot') { s.pose = phase === 'CELEBRATE' && S.patTeam === s.team ? 'DANCE' : E01 > .8 ? 'BACKFLIP' : 'IDLE'; if (s.team === 0 && FF.sim.teams[0].mascot.head === 'tumbleweed' && phase === 'CELEBRATE' && S.patTeam === 0 && rf() < dt * 20) P.fire(s.b.x, s.b.y, 30, 1, { size: 4 }); }
      if (s.role === 'coach') s.pose = phase === 'LIVE' ? 'COACH_YELL' : 'IDLE';
      FF.Rigs.driveRig(s.rig, s, dt);
    }
    // the mascot on the field (Mascot Mayhem)
    const m = S.mascot;
    if (m && !m.done) { if (!CAST.fieldMascot || CAST.fieldMascot.team !== m.team) CAST.fieldMascot = { rig: FF.Rigs.mascot(S.teams[m.team]), team: m.team, b: m, facing: 0, pose: 'RUN' }; const fm = CAST.fieldMascot; fm.b = m; fm.facing = Math.atan2(m.vy, m.vx); fm.pose = 'RUN'; FF.Rigs.driveRig(fm.rig, fm, dt); }
  },
  /** the halftime show: a marching band of 8 in the home colors crosses midfield in two ranks (drums and horns) */
  band(dt) {
    const show = S.phase === 'HALFTIME';
    if (!show) { CAST.bandT = 0; return; }
    if (!CAST.bandRigs) { const t = S.teams[0], c = t.colors; CAST.bandRigs = [0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ rig: FF.Rigs.cast({ build: 'heroic', skin: 1 + k % 6, hair: 'short', cloth: c.primary, coat: c.primary, cap: c.secondary }, 1.15), b: { x: 0, y: 0, z: 0, vx: 0, vy: 0 }, facing: 0, pose: 'RUN', id: 940 + k, drum: k < 4 })); }
    CAST.bandT = (CAST.bandT || 0) + dt;
    CAST.bandRigs.forEach((m, k) => { const step = Math.sin(CAST.bandT * 6 + k) * 2; m.b.x = 1024 - 120 + CAST.bandT * 40 + (k % 4) * 24; m.b.y = F.MID_Y - 20 + Math.floor(k / 4) * 40 + step; m.b.vx = 40; m.b.vy = 0; m.facing = 0; m.pose = 'RUN'; FF.Rigs.driveRig(m.rig, m, dt); });
  },
  drawBand(r) {
    if (S.phase !== 'HALFTIME' || !CAST.bandRigs) return;
    const view = E.charView(r.view);
    for (const m of CAST.bandRigs) {
      r.shadow(m.b.x, m.b.y, 6, .3); r.actor(m.b.x, m.b.y, 0, (g, ox, oy) => m.rig.draw(g, ox, oy, view));
      r.queue(m.b.x + 3, m.b.y + 2, 14, g => { const p = r.w(m.b.x + 3, m.b.y + 2, 14); if (m.drum) { px.disc(g, p[0], p[1], 4, '#f4f0e6'); px.disc(g, p[0], p[1], 3, '#d8d0c0'); px.line(g, p[0] - 4, p[1], p[0] + 4, p[1], '#c03a2a'); } else { px.line(g, p[0], p[1] - 6, p[0] + 5, p[1] - 9, '#ffd84a', 2); px.disc(g, p[0] + 6, p[1] - 10, 2, '#ffd84a'); } });
    }
  },
  signal(pose, dur = 1.5) { for (const r of CAST.refs) { r.sig = dur; r.sigPose = pose; } },
  draw(r) {
    const view = E.charView(r.view);
    CAST.drawBand(r);
    for (const x of CAST.refs.concat(CAST.side)) { if (!r.visible(x.b.x, x.b.y, 20) && !r.visible(x.b.x, x.b.y, 0)) continue; r.shadow(x.b.x, x.b.y, 6, .3); r.actor(x.b.x, x.b.y, x.b.z || 0, (g, ox, oy) => x.rig.draw(g, ox, oy, view)); }
    const m = S.mascot;
    if (m && !m.done && CAST.fieldMascot) { const fm = CAST.fieldMascot; r.shadow(m.x, m.y, 7, .35); r.actor(m.x, m.y, 0, (g, ox, oy) => fm.rig.draw(g, ox, oy, view)); }
  }
};
on('td', () => CAST.signal('REF_TD', 2.5));
on('firstDown', () => CAST.signal('REF_FD', 1.4));
on('incomplete', () => CAST.signal('REF_INC', 1.4));
on('lateHit', () => CAST.signal('REF_SHRUG', 1.2));
on('fg', e => CAST.signal(e.good ? 'REF_TD' : 'REF_INC', 1.8));

/* ---------------- COMMENTARY ---------------- */
const PRI = { td: 10, int: 9, fumble: 9, megaHit: 9, special: 8, bigHit: 8, sack: 8, bigRun: 7, hotOn: 7, mascot: 7, fgGood: 7, fgMiss: 7, fgDoink: 7, fgDoinkOut: 7, lateHit: 6, card: 6, safety: 8, pile: 7, drop: 5, firstDown: 4, kickoff: 4, punt: 4, incomplete: 3, thirdLong: 4, fourthDown: 5, redZone: 5, weather: 2, idle: 1, final: 10, halftime: 9, lightsOut: 8, lightsOn: 6, refDown: 6, brokenTackle: 5, pancake: 5, touchback: 3, twoMinute: 6, overtime: 9, fiascoBreak: 7, recover: 8, pat: 3, twoGood: 6, twoFail: 5, turnoverOnDowns: 7, hotOff: 4 };
const TALK = FF.talk = {
  cur: null, queue: [], recent: {}, gap: 0, idleT: 12,
  rigs: null,
  portraits() { if (!TALK.rigs) TALK.rigs = { C: FF.Rigs.cast(FF.data.cast.chet.rig), L: FF.Rigs.cast(FF.data.cast.lou.rig) }; return TALK.rigs; },
  say(ev, vars = {}, force) {
    if (game.settings.commentary === 'off' && !force) return;
    const bank = FF.data.lines[ev]; if (!bank || !bank.length) return;
    const pri = PRI[ev] || 3;
    if (TALK.cur && TALK.cur.pri >= pri && !force && TALK.cur.t < TALK.cur.dur * .7) return;
    if (!force && TALK.gap > 0 && (!TALK.cur || pri <= TALK.cur.pri) && pri < 7) return;
    const rec = TALK.recent[ev] || (TALK.recent[ev] = []);
    let opts = bank.map((l, i) => i).filter(i => !rec.includes(i)); if (!opts.length) { rec.length = 0; opts = bank.map((l, i) => i); }
    const i = opts[Math.floor(rf() * opts.length)]; rec.push(i); if (rec.length > Math.min(8, bank.length - 1)) rec.shift();
    const [who, line] = bank[i];
    TALK.show(who, fill(line, vars), pri);
    if (pri >= 7 && who === 'C' && rf() < .4) { const lb = bank.filter(l => l[0] === 'L'); const extra = lb.length ? lb[Math.floor(rf() * lb.length)] : FF.data.lines.idle.find(l => l[0] === 'L'); if (extra) TALK.queue.push({ who: 'L', text: fill(extra[1], vars), pri: pri - 1, at: 1.6 }); }
  },
  show(who, text, pri = 3) {
    TALK.cur = { who, text, pri, t: 0, dur: text.length / 15 + 1.5 };
    TALK.gap = FF.T.commentaryGap;
    if (game.settings.commentary === 'on') FF.voice.say(text, who === 'C' ? 'chet' : 'lou', { commentary: true });
  },
  update(dt) {
    TALK.gap = Math.max(0, TALK.gap - dt);
    if (TALK.cur) { TALK.cur.t += dt; if (TALK.cur.t > TALK.cur.dur) TALK.cur = null; }
    for (const q of TALK.queue) q.at -= dt;
    const next = TALK.queue.find(q => q.at <= 0); if (next && !TALK.cur) { TALK.queue.splice(TALK.queue.indexOf(next), 1); TALK.show(next.who, next.text, next.pri); }
    TALK.queue = TALK.queue.filter(q => q.at > -4);
    if (S.phase === 'PLAYCALL' && !TALK.cur) { TALK.idleT -= dt; if (TALK.idleT <= 0) { TALK.idleT = 14 + rf() * 10; const w = S.weatherKind; TALK.say(w && rf() < .5 ? 'weather_' + w : 'idle'); } }
  },
  /** the caption: a non-modal box at the bottom left with the speaker's portrait, typed at 45 letters a second */
  draw(g) {
    const c = TALK.cur; if (!c || game.settings.commentary === 'off') return;
    const W = game.W, H = game.H, w = Math.min(230, W * .5), h = 40, x = FF.T.safeMargin, y = H - h - FF.T.safeMargin - 26;
    E.ui.box(g, x, y, w, h, { bg: ['#14142a', '#0a0a18'], border: c.who === 'C' ? '#ffb02e' : '#7ad0ff', alpha: .86 });
    const R = TALK.portraits()[c.who]; if (R) R.drawPortrait(g, x + 3, y + 3, 34, { zoom: 3, turn: .5, bg: c.who === 'C' ? '#3a2a5a' : '#1a3a4a', frame: true });
    E.font.text(g, c.who === 'C' ? 'CHET THUNDERBUNS' : 'LOU DIGGS', x + 41, y + 3, c.who === 'C' ? '#ffb02e' : '#7ad0ff', { font: 'tiny', outline: false });
    const shown = c.text.slice(0, Math.floor(c.t * 45));
    E.font.text(g, shown, x + 41, y + 11, '#f4f0e6', { wrap: w - 46, outline: false, shadow: '#000' });
  }
};
function fill(line, v) { return line.replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? String(v[k]) : m); }
const T2 = (ev, f) => bus.on(ev, e => { if (FF.fast || S.replaying) return; try { f(e); } catch (err) { game.fail('talk ' + ev, err); } });
const tn = t => S.teams[t] ? S.teams[t].short : '';
T2('td', e => TALK.say('td', { player: e.player, team: tn(e.team), yards: e.yards }, true));
T2('int', e => TALK.say('int', { player: e.player }));
T2('fumble', () => TALK.say('fumble'));
T2('recover', e => { if (e.lost) TALK.say('recover', { player: e.player, team: tn(e.team) }); });
T2('pile', () => TALK.say('pile'));
T2('megaHit', e => TALK.say('megaHit', { player: e.player }));
T2('bigHit', e => TALK.say('bigHit', { player: e.player }));
T2('sack', e => TALK.say('sack', { player: e.player }));
T2('drop', () => TALK.say('drop'));
T2('lateHit', () => TALK.say('lateHit'));
T2('hotOn', e => TALK.say('hotOn', { player: e.player }));
T2('hotOff', () => TALK.say('hotOff'));
T2('cardUsed', e => TALK.say('card_' + e.card, { mascot: e.mascot }) || TALK.say('card'));
T2('fiascoBreak', () => TALK.say('fiascoBreak'));
T2('fg', e => TALK.say(e.good ? (e.doink ? 'fgDoink' : 'fgGood') : (e.doink ? 'fgDoinkOut' : 'fgMiss')));
T2('punt', () => TALK.say('punt'));
T2('kickoff', () => TALK.say('kickoff'));
T2('safety', () => TALK.say('safety'));
T2('firstDown', e => TALK.say('firstDown', { team: tn(e.team) }));
T2('downs', e => { if (e.down === 3 && e.toGo >= 12) TALK.say('thirdLong'); if (e.down === 4) TALK.say('fourthDown'); });
T2('turnoverOnDowns', () => TALK.say('turnoverOnDowns'));
T2('halftime', () => { const w = S.score[0] >= S.score[1] ? 0 : 1; TALK.say('halftime', { team: tn(w), score: Math.max(...S.score) + '-' + Math.min(...S.score) }, true); });
T2('final', e => TALK.say('final', { team: tn(e.winner < 0 ? 0 : e.winner), score: Math.max(...S.score) + '-' + Math.min(...S.score) }, true));
T2('special', e => TALK.say('special_' + e.kind));
T2('mascotOn', () => TALK.say('mascot'));
T2('refDown', () => TALK.say('refDown'));
T2('lightsOut', () => TALK.say('lightsOut', {}, true));
T2('lightsOn', () => TALK.say('lightsOn'));
T2('incomplete', e => { if (!e.drop) TALK.say('incomplete'); });
T2('brokenTackle', () => TALK.say('brokenTackle'));
T2('pancake', () => TALK.say('pancake'));
T2('touchback', () => TALK.say('touchback'));
T2('overtime', () => TALK.say('overtime', {}, true));
T2('twoGood', () => TALK.say('twoGood'));
T2('tackle', e => { if (e.yards >= 15) TALK.say('bigRun', { player: S.athlete(e.carrier) ? S.athlete(e.carrier).name : '', yards: e.yards }); });
T2('catch', e => { if (e.yards >= 25) TALK.say('bigRun', { player: e.player, yards: e.yards }); });
})();
