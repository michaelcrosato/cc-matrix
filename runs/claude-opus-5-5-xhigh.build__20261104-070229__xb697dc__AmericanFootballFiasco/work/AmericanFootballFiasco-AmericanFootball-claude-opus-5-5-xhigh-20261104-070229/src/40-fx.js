// FX: everything cosmetic that a play's events set off: hit sparks and stars, comic pops over the hit, divots, footprints,
// flying helmets, pile-up dust, confetti, fireworks and pyro on scores, fire on a Blazing athlete, breath in the cold,
// slow motion, flashes and the big center text. Cosmetic randomness only (FF.rf): the sim never reads any of it.
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, F = FF.F, YD = 16, game = FF.game, bus = FF.bus, P = () => game.particles;
const rf = () => FF.rf();
const fx = FF.fx = { pops: [], divots: [], prints: [], helmets: [], center: null, slow: 0, slowK: 1, t: 0, on: true, trail: [] };
const L = () => FF.data.lines.pops;
fx.reset = () => { fx.pops.length = 0; fx.divots.length = 0; fx.prints.length = 0; fx.helmets.length = 0; fx.center = null; fx.slow = 0; game.timeScale = 1; fx.trail.length = 0; };
fx.pop = (x, y, z, text, o = {}) => { fx.pops.push(Object.assign({ x, y, z, text, t: 0, dur: .9 }, o)); if (fx.pops.length > 8) fx.pops.shift(); if (FF.replay) FF.replay.event('pop', { x, y, z, text }); };
fx.say = (text, o = {}) => { fx.center = Object.assign({ text, t: 0, dur: 1.8, colors: ['#fffbe8', '#ffe08a', '#ffb347', '#e0662a'], scale: 3 }, o); };
fx.slowmo = (k, seconds) => { if (game.settings.motion || FF.fast) return; fx.slow = seconds; fx.slowK = k; game.timeScale = k; };
fx.surfaceColors = (m, x, y) => { const s = m && m.surface ? m.surface(x, y) : 'grass'; return s === 'mud' ? ['#5a3a1a', '#3a2410', '#7a5a3a'] : s === 'ice' || (m && m.snow) ? ['#f0f4ff', '#d8e4f0', '#ffffff'] : ['#4a8a3a', '#2e5a22', '#6aa04a']; };
const quiet = () => FF.fast || !fx.on;
/* ---- events to effects ---- */
const on = (ev, fn) => bus.on(ev, d => { if (!quiet() && FF.match && d.m === FF.match) fn(d, d.m); });
on('bigHit', (d, m) => {
  game.hitFx(d.x, d.y, 14, { power: 1.2, angle: d.ang, sound: false, rumble: .7 });
  P().bits(d.x, d.y, 4, 10, fx.surfaceColors(m, d.x, d.y)); P().dust(d.x, d.y, 2, 6);
  fx.pop(d.x, d.y, 40, FF.u.pick(L().bigHit, rf)); fx.divot(d.x, d.y); FF.cam.punch(1.25); game.freeze(.08); game.shake(4);
  fx.slowmo(.4, .3);
});
on('megaHit', (d, m) => {
  game.hitFx(d.x, d.y, 14, { power: 2, angle: d.ang, sound: false, rumble: 1 });
  P().bits(d.x, d.y, 4, 18, fx.surfaceColors(m, d.x, d.y)); P().sparks(d.x, d.y, 18, 14, d.ang); P().ring(d.x, d.y, 4, 40, '#fff4c0', .4);
  fx.pop(d.x, d.y, 44, 'MEGA HIT!', { scale: 3, dur: 1.2 }); fx.divot(d.x, d.y); FF.cam.punch(1.4); game.freeze(.12); game.shake(7);
  game.flash('#ffffff', .12, .8); fx.slowmo(.25, .6);
});
on('tackle', (d, m) => { P().dust(d.x, d.y, 2, 4); if (rf() < .3) fx.pop(d.x, d.y, 34, FF.u.pick(L().tackle, rf), { scale: 1, dur: .6 }); void m; });
on('sack', d => fx.pop(d.qb.x, d.qb.y, 40, 'SACKED!'));
on('int', d => fx.pop(d.defender.x, d.defender.y, 40, 'PICKED OFF!'));
on('fumble', d => { fx.pop(d.carrier.x, d.carrier.y, 40, 'FUMBLE!'); P().dust(d.carrier.x, d.carrier.y, 2, 6); });
on('pancake', d => { fx.pop(d.rusher.x, d.rusher.y, 34, 'PANCAKE!', { scale: 1 }); P().dust(d.rusher.x, d.rusher.y, 2, 6); });
on('brokenTackle', d => fx.pop(d.carrier.x, d.carrier.y, 38, 'BROKEN TACKLE!', { scale: 1 }));
on('evade', d => { if (d.how === 'spin') P().ring(d.carrier.x, d.carrier.y, 4, 16, '#ffffff', .25); });
on('drop', d => fx.pop(d.receiver.x, d.receiver.y, 40, 'DROPPED!', { scale: 1 }));
on('doink', d => { fx.pop(d.x, d.y, d.z + 20, 'DOINK!'); P().sparks(d.x, d.y, d.z, 8, 0); });
on('hotOn', d => { fx.pop(d.player.x, d.player.y, 44, 'BLAZING!', { colors: ['#ffffff', '#ffd84a'], bg: '#ff7a2a', bg2: '#c8301a' }); P().fire(d.player.x, d.player.y, 10, 8); });
on('fiascoBreak', d => { if (d.card) fx.say('FIASCO BREAK!', { colors: ['#ffffff', '#e8c0ff', '#a050e0', '#5a1a8a'], scale: 3, dur: 1.6 }); });
on('pile', d => { for (let k = 0; k < 4; k++) P().dust(d.x + (rf() - .5) * 30, d.y + (rf() - .5) * 20, 2, 5); P().bits(d.x, d.y, 4, 10, fx.surfaceColors(d.m, d.x, d.y)); FF.cam.punch(1.2, 1.2); });
on('seismic', d => { P().ring(d.x, d.y, 6, 70, '#ffe0a0', .5); P().ring(d.x, d.y, 4, 50, '#ffffff', .35); P().dust(d.x, d.y, 2, 14); game.shake(7); fx.pop(d.x, d.y, 50, 'SEISMIC!', { scale: 3, dur: 1.2 }); game.flash('#ffe0a0', .1, .5); });
on('special', d => { const a = d.who; P().glints(a.x, a.y, 20, 10, '#ffe890'); if (d.kind === 'MUDSLIDE') P().bits(a.x, a.y, 2, 16, ['#5a3a1a', '#3a2410']); if (d.kind === 'SNOWPLOW') P().bits(a.x, a.y, 4, 16, ['#f0f4ff', '#d8e4f0']); if (d.kind === 'AFTERBURNER') P().ring(a.x, a.y, 2, 20, '#3af0f0', .3); });
on('bowled', d => { fx.pop(d.who.x, d.who.y, 36, 'WHAM!', { scale: 1 }); P().bits(d.who.x, d.who.y, 2, 10, ['#5a3a1a', '#3a2410']); });
on('helmet', d => { const a = d.a; fx.helmets.push({ x: a.x, y: a.y, z: 26, vx: Math.cos(d.ang) * 120, vy: Math.sin(d.ang) * 120, vz: 170, t: 0, team: d.m.teams[a.side], spin: 0 }); });
on('lateHit', d => { fx.pop(d.victim.x, d.victim.y, 38, 'LATE HIT!', { scale: 1 }); P().dust(d.victim.x, d.victim.y, 2, 5); });
on('kickLanded', d => { const b = d.m.ball; P().dust(b.x, b.y, 1, 3); });
on('td', (d, m) => {
  fx.say('TOUCHDOWN!', { colors: [d.team.colors.trim, E.shade(d.team.colors.primary, .4), d.team.colors.primary, E.shade(d.team.colors.primary, -.3)], scale: 4, dur: 2.6, shine: true });
  const x = m.goalX(d.side) + m.dir(d.side) * 5 * YD;
  for (let k = 0; k < 3; k++) game.after(.2 + k * .35, () => { if (quiet()) return; P().explosion(x + (rf() - .5) * 200, F.MID_Y + (rf() - .5) * 300, 300 + rf() * 100, 1, { debris: false, shake: 0, freeze: false }); P().ring(x, F.MID_Y, 10, 80, [d.team.colors.primary, d.team.colors.trim, '#ffffff'][k], .6, 320); });
  fx.confetti(m, d.side); fx.pyro(m);
});
on('safety', () => fx.say('SAFETY!', { scale: 3 }));
on('fg', d => { fx.say(d.good ? 'IT\'S GOOD!' : 'NO GOOD!', d.good ? { scale: 3 } : { scale: 3, colors: ['#ffe0e0', '#ff8a7a', '#c8302a', '#6a1010'] }); if (d.good) fx.pyro(d.m); });
on('pat', d => { if (d.type === 1) fx.say(d.good ? 'IT\'S GOOD!' : 'NO GOOD!', { scale: 2, dur: 1.2 }); else fx.say(d.good ? '2-POINT GOOD!' : 'NO GOOD!', { scale: 3, dur: 1.4 }); });
on('firstDown', () => fx.say('FIRST DOWN!', { scale: 2, dur: 1.2, colors: ['#ffffff', '#fff4a0', '#ffd84a', '#c89a1a'] }));
on('turnover', () => fx.say('TURNOVER!', { scale: 3, dur: 1.4, colors: ['#ffffff', '#ffc0c0', '#ff6a5a', '#8a1a1a'] }));
on('turnoverOnDowns', () => fx.say('TURNOVER ON DOWNS!', { scale: 2, dur: 1.4, colors: ['#ffffff', '#ffc0c0', '#ff6a5a', '#8a1a1a'] }));
on('touchback', () => fx.say('TOUCHBACK', { scale: 2, dur: 1 }));
on('fourthDown', () => fx.say('4TH DOWN', { scale: 2, dur: 1 }));
on('lightsOut', () => { fx.say('LIGHTS OUT!', { scale: 3, colors: ['#ffffff', '#c0f0ff', '#3af0f0', '#0a4a5a'] }); game.flash('#000000', .3, .9); });
on('lightsOn', () => game.flash('#ffffff', .1, .5));
on('overtime', () => fx.say('OVERTIME!', { scale: 3 }));
on('twoMinute', () => fx.say('TWO-MINUTE WARNING', { scale: 2 }));
on('final', d => { fx.say('FINAL', { scale: 4, dur: 3 }); if (d.winner >= 0) fx.confetti(d.m, d.winner); });
on('playEnd', d => { const m = d.m, pl = d.play; if (pl && !pl.firstDown) { const g = m.goalX(m.poss); if (Math.abs(m.los - g) <= 20 * YD && m.down === 1 && !m.redZoneSaid) { m.redZoneSaid = true; fx.say('RED ZONE', { scale: 2, dur: 1, colors: ['#ffffff', '#ffc0c0', '#ff4a3a', '#8a1010'] }); } if (Math.abs(m.los - g) > 20 * YD) m.redZoneSaid = false; } });
on('action', d => { if ((d.id === 'dive' || d.id === 'tackleDive' || d.id === 'bigHit') && rf() < .5) game.after(.45, () => fx.divot(d.a.x, d.a.y)); });
fx.divot = (x, y) => { fx.divots.push({ x, y, t: 0, k: Math.floor(rf() * 3), a: rf() * Math.PI }); if (fx.divots.length > 40) fx.divots.shift(); };
fx.confetti = (m, side) => { const t = m.teams[side], cols = [t.colors.primary, t.colors.trim, t.colors.secondary, '#ffffff']; const c = FF.cam.pos; for (let k = 0; k < 6; k++) game.after(k * .25, () => { if (!quiet()) P().bits(c.x + (rf() - .5) * 300, c.y + (rf() - .5) * 160, 160, 14, cols); }); };
fx.pyro = m => { if (!m || !FF.stadium) return; for (const p of FF.stadium.props) if (p.id === 'pyroCannon') for (let k = 0; k < 4; k++) game.after(k * .15, () => { if (!quiet()) P().fire(p.x, p.y, 24 + k * 14, 6, { size: 1.4 }); }); };
/** each step: timers, helmets bouncing, footprints, breath, fire trails */
fx.update = (m, dt, rdt) => {
  fx.t += rdt;
  if (fx.slow > 0) { fx.slow -= rdt; if (fx.slow <= 0) game.timeScale = 1; }
  for (const p of fx.pops) p.t += rdt; while (fx.pops.length && fx.pops[0].t > fx.pops[0].dur) fx.pops.shift();
  if (fx.center) { fx.center.t += rdt; if (fx.center.t > fx.center.dur) fx.center = null; }
  for (const d of fx.divots) d.t += dt;
  for (const h of fx.helmets) { h.t += dt; h.vz -= 600 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt; h.spin += dt * 9; if (h.z < 0) { h.z = 0; h.vz = -h.vz * .5; h.vx *= .6; h.vy *= .6; } }
  while (fx.helmets.length && fx.helmets[0].t > 6) fx.helmets.shift();
  if (!m || quiet()) return;
  const snowy = m.snow || m.surfaceMud;
  fx.printT = (fx.printT || 0) - dt;
  if (fx.printT <= 0 && (m.snow || (FF.stadium && FF.stadium.def.surface.mud))) {
    fx.printT = .15;
    for (const a of m.on) if (Math.hypot(a.vx, a.vy) > 60 && a.z < 1 && (m.snow || (m.surface && m.surface(a.x, a.y) === 'mud'))) { fx.prints.push({ x: a.x, y: a.y, t: 0, a: Math.atan2(a.vy, a.vx), mud: !m.snow }); if (fx.prints.length > 200) fx.prints.shift(); }
  }
  for (const p of fx.prints) p.t += dt; while (fx.prints.length && fx.prints[0].t > 6) fx.prints.shift();
  // breath puffs in the cold; fire on Blazing athletes
  fx.breathT = (fx.breathT || 0) - dt;
  if (m.snow && fx.breathT <= 0) { fx.breathT = 1.2; for (const a of m.on) if (rf() < .5) P().smoke(a.x + Math.cos(a.facing) * 4, a.y + Math.sin(a.facing) * 4, 30, 1, { size: .4, color: '#e8f0ff' }); }
  fx.fireT = (fx.fireT || 0) - dt;
  if (fx.fireT <= 0) { fx.fireT = .05; for (const a of m.on) if (a.hot > 0) { P().fire(a.x + (rf() - .5) * 6, a.y + (rf() - .5) * 4, 2 + rf() * 20, 1, { size: .45 }); } }
  void snowy;
};
/** world-space draws: divots and prints on the ground, helmets, the pops */
fx.drawWorld = (r, m) => {
  for (const d of fx.divots) { const al = Math.max(0, 1 - d.t / 60); if (al <= 0) continue; r.decal(g => { const [x, y] = r.w(d.x, d.y, 0); px.blend(g, .7 * al, 'normal', () => { px.ell ? px.ell(g, x, y, 5, 2, '#3a2a14') : px.rect(g, x - 4, y - 1, 8, 3, '#3a2a14'); px.rect(g, x - 2 + d.k, y - 2, 3, 1, '#5a8a3a'); }); }); }
  for (const p of fx.prints) { const al = 1 - p.t / 6; r.decal(g => { const [x, y] = r.w(p.x, p.y, 0); px.blend(g, .45 * al, 'normal', () => px.rect(g, x, y, 2, 1, p.mud ? '#2a1a0a' : '#a8b8d0')); }); }
  for (const h of fx.helmets) { r.shadow(h.x, h.y, 4, .3); r.queue(h.x, h.y, h.z, g => { const [x, y] = r.w(h.x, h.y, h.z), c = h.team.colors, t = E.tones(c.helmet), rr = 4 * (game.zoom || 1); px.disc(g, x, y - rr, rr + 1, t.sh); px.disc(g, x - .5, y - rr - .5, rr, t.base); px.line(g, x - rr * Math.cos(h.spin), y - rr, x + rr * Math.cos(h.spin), y - rr + 1, c.stripe); px.line(g, x + Math.sin(h.spin) * rr, y - rr + 1, x + Math.sin(h.spin) * rr * 1.4, y - rr + 3, '#9a9aa4', 1); }); }
  for (const p of fx.pops) r.queue(p.x, p.y, p.z + 30, g => { const [x, y] = r.w(p.x, p.y, p.z + 10); ui().burst(g, x, y - 18 - p.t * 10, p.text, { t: p.t, scale: p.scale || 2, colors: p.colors, bg: p.bg, bg2: p.bg2 }); }, { emissive: true, bias: 50 });
  void m;
};
/** the big center text (the HUD's overlay) */
fx.drawCenter = (g, r) => {
  const c = fx.center; if (!c) return;
  const t = c.t, k = t < .25 ? E.ease.outBack(t / .25) : t > c.dur - .3 ? Math.max(0, (c.dur - t) / .3) : 1, sc = Math.max(1, Math.round(c.scale * Math.min(1, k + .2)));
  if (k <= 0) return;
  const y = Math.round(r.H * .3);
  E.font.title(g, c.text, Math.round(r.W / 2), y, { scale: sc, colors: c.colors, outline: '#140a10', depth: 2, align: 'center' });
  if (c.shine) { const w = E.font.width(c.text, { scale: sc }), sx = Math.round(r.W / 2 - w / 2 + ((t * 1.4) % 1.6) * w); px.blend(g, .5, 'add', () => px.rect(g, sx, y, 3 * sc, 7 * sc + 2, '#ffffff')); }
};
const ui = () => FF.ui;
})();
