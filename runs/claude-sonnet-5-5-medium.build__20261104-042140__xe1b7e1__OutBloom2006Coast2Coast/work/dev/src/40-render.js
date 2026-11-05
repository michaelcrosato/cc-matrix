/* Drawing a race: the road, the cars, the passenger, the HUD, smoke and petals. Drawing only reads the sim. */
(() => {
'use strict';
const E = My3D2dge, OB = window.OB, px = E.px, { clamp } = E, game = OB.game;
const sh = (c, k) => E.shade(c, k);
/* ---- the cast: Humanoid rigs, posed and dressed ---- */
const rigs = {};
OB.rigOf = id => {
  if (rigs[id]) return rigs[id];
  const c = OB.CAST[id];
  return (rigs[id] = new E.Humanoid({ size: 1.3, build: 'chibi', weapon: null, hair: c.hair, hat: c.hat || undefined, outfit: id === 'pia' ? 'robe' : 'shirt', sleeves: 'short', colors: Object.assign({ pants: '#3a4a6a', boot: '#3a2e2a' }, c.colors), face: { eyes: 'big' } }));
};
OB.rigUpdate = (id, dt, pose, expr, facing = 0) => OB.rigOf(id).update(dt, { x: 0, y: 0, z: 0, facing, vx: 0, vy: 0, pose, expr });
OB.portrait = (g, id, x, y, size, o = {}) => { try { OB.rigOf(id).drawPortrait(g, x, y, size, Object.assign({ zoom: 3, turn: .4, bg: '#2a1a4a', frame: true }, o)); } catch (e) { px.rect(g, x, y, size, size, '#2a1a4a'); } };
/* ---- text helpers ---- */
OB.txt = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#0a0414', outline: false }, o));
OB.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), Object.assign({ bg: '#2a1346', border: '#ffd6f0' }, o));
/* ---- the player's car, from behind ---- */
const BODIES = {
  roadster: { w: 64, h: 24, wing: 0, nose: 0 }, gt: { w: 70, h: 24, wing: 0, nose: 1 }, turbo: { w: 70, h: 22, wing: 1, nose: 0 }, cabrio: { w: 66, h: 26, wing: 0, nose: 0 }, hyper: { w: 74, h: 20, wing: 2, nose: 1 }
};
OB.drawCar = (g, sx, sy, s, race, t, o = {}) => {
  const B = BODIES[race.car.body], W = B.w * s, Hh = B.h * s, ang = race.drift.angle, lean = (race.bank * 3 + ang * 7) * s, col = OB.COLORS[race.color].c, dark = sh(col, -.35), light = sh(col, .3);
  const jolt = race.crash > 0 ? Math.round(Math.sin(t * 40)) * s : (Math.abs(race.x) > 1.08 && race.speed > 20 ? Math.round(Math.sin(t * 50)) * s : 0);
  let y = sy + jolt - (race.crash > 0 ? Math.abs(Math.sin(race.crash * 9)) * 6 * s : 0);
  const x = sx + (race.crash > 0 ? Math.sin(race.crash * 12) * 5 * s : 0) + ang * 5 * s;
  if (o.ghost) g.globalAlpha = .5;
  px.ell(g, x, sy - 1, W * .56, 5 * s, 'rgba(0,0,0,.35)');
  // tyres
  for (const k of [-1, 1]) { px.rect(g, x + k * W * .39 - 7 * s + lean * .2, y - Hh * .42, 14 * s, Hh * .46, '#14101a'); px.rect(g, x + k * W * .39 - 6 * s + lean * .2, y - Hh * .38, 4 * s, Hh * .3, '#2c2434'); }
  // body: a lower shell, the shoulders, the rear deck
  px.poly(g, [[x - W / 2, y - Hh * .18], [x - W / 2 + 3 * s + lean * .4, y - Hh * .82], [x + W / 2 - 3 * s + lean * .4, y - Hh * .82], [x + W / 2, y - Hh * .18]], col);
  px.rect(g, x - W / 2, y - Hh * .5, W, Hh * .32, dark);
  px.rect(g, x - W / 2 + 2 * s, y - Hh * .82, W - 4 * s, 2 * s, light);
  px.rect(g, x - W * .34 + lean * .4, y - Hh * 1.0, W * .68, Hh * .2, col);     // rear deck and cockpit rim
  px.rect(g, x - W * .3 + lean * .5, y - Hh * 1.06, W * .6, 2 * s, light);
  // lights and plate
  for (const k of [-1, 1]) { px.rect(g, x + k * W * .36 - 4 * s, y - Hh * .46, 8 * s, 4 * s, race.speed > 5 && race.crash <= 0 ? '#ff2a1a' : '#a01810'); px.rect(g, x + k * W * .36 - 2 * s, y - Hh * .46, 3 * s, 2 * s, '#ffb0a0'); }
  px.rect(g, x - 7 * s, y - Hh * .4, 14 * s, 5 * s, '#f4f0e0'); px.rect(g, x - 5 * s, y - Hh * .34, 10 * s, 1.5 * s, '#c04a6a');
  if (B.wing) { px.rect(g, x - W * .46 + lean * .5, y - Hh * 1.28, W * .92, 3 * s, dark); px.rect(g, x - W * .4, y - Hh * 1.12, 3 * s, Hh * .3, dark); px.rect(g, x + W * .4 - 3 * s, y - Hh * 1.12, 3 * s, Hh * .3, dark); }
  // the couple
  const pc = OB.CAST[race.passId], hair = [pc.colors.hair, '#3a2010'];
  const heads = [[-.17, race.o.aiDriver ? '#d8a078' : '#d8a078', '#3a2010', false], [.17, pc.colors.skin, pc.colors.hair, true]];
  for (const [k, skin, hr, isPass] of heads) {
    const hx = x + W * k + lean * .7 + (isPass ? Math.sin(t * 2.3) * s : 0), hy = y - Hh * 1.1 - 6 * s;
    px.rect(g, hx - 4 * s, hy + 3 * s, 8 * s, 6 * s, isPass ? pc.colors.cloth : '#f4f0ea');
    px.disc(g, hx, hy, 5 * s, skin); px.disc(g, hx, hy - 2 * s, 5 * s, hr);
    if (isPass && pc.hair !== 'spiky') { px.rect(g, hx - 6 * s, hy - 2 * s, 2 * s, 8 * s, hr); px.rect(g, hx + 4 * s, hy - 2 * s, 2 * s, 8 * s, hr); }
    if (isPass && race.mood > 66) px.rect(g, hx - 2 * s, hy + 1 * s, 4 * s, 1.5 * s, '#c02a4a');
  }
  px.rect(g, x - W * .3 + lean * .5, y - Hh * 1.05, W * .6, 2 * s, '#c8d8e8');   // windscreen's top
  // exhaust flames while boosting
  if (race.boost > 0 && race.crash <= 0) for (const k of [-1, 1]) { const fl = 3 + Math.round(Math.abs(Math.sin(t * 40 + k)) * 4); px.rect(g, x + k * W * .2 - 2 * s, y - 2 * s, 4 * s, fl * s, '#ffd23a'); px.rect(g, x + k * W * .2 - 1 * s, y - 2 * s, 2 * s, fl * s * .6, '#fff6c0'); }
  if (o.ghost) g.globalAlpha = 1;
};
/* ---- cosmetic particles (their own stream, so effects never touch the sim) ---- */
const FX = { list: [], rng: E.rng(7) };
OB.fx = FX;
FX.clear = () => { FX.list.length = 0; };
FX.spawn = (x, y, vx, vy, life, col, size, kind) => { if (FX.list.length < 260) FX.list.push({ x, y, vx, vy, life, max: life, col, size, kind }); };
FX.step = dt => { for (let i = FX.list.length - 1; i >= 0; i--) { const p = FX.list[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.kind === 'petal') { p.vy += 30 * dt; p.vx += Math.sin(p.life * 6) * 20 * dt; } else p.vy -= 14 * dt; if (p.life <= 0) FX.list.splice(i, 1); } };
FX.draw = g => { for (const p of FX.list) { const u = p.life / p.max; g.globalAlpha = p.kind === 'smoke' ? u * .7 : Math.min(1, u * 2); const sz = p.kind === 'smoke' ? p.size * (1.6 - u * .6) : p.size; px.rect(g, Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), Math.max(1, Math.round(sz)), Math.max(1, Math.round(sz)), p.col); } g.globalAlpha = 1; };
OB.flower = (g, x, y, c = '#ff7ab0') => { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) px.rect(g, x + dx - 1, y + dy - 1, 3, 3, c); px.rect(g, x - 1, y - 1, 3, 3, '#ffe27a'); };
/* ---- the speech bubble: the passenger talks; babble plays ---- */
OB.bubble = null;
OB.passengerSay = (race, text, tone) => {
  const chat = game.settings.chatter || 'Normal', isAsk = tone === 'ask';
  if (chat === 'Off' && !isAsk) return; if (chat === 'Less' && !isAsk && Math.random() < .5) return;
  OB.bubble = { text, t: 0, tone, who: race.passId, life: Math.min(4.5, 2 + text.length * .05) };
  OB.voice.say(text, race.passId, { pitch: tone === 'scare' ? 1.25 : tone === 'sulk' ? .85 : 1 });
};
/* ---- the whole frame ---- */
let camMode = 0;
OB.camHeights = { Chase: 1000, High: 1550, Bumper: 480 };
OB.drawRace = (r, race, o = {}) => {
  const I = game.input, W = o.vp ? o.vp.w : r.W, H = o.vp ? o.vp.h : r.H, t = game.time, st = race.stage, road = st.road;
  const vp = o.vp || null, ox = vp ? vp.x : 0, oy = vp ? vp.y : 0, camName = game.settings.camera || 'Chase', h = OB.camHeights[camName] || 1000, cz = race.z + OB.AHEAD - road.ahead(h);
  road.o.sky = st.sky;
  const cars = race.traffic.concat(race.rivals, o.ghosts || []);
  if (vp) r.viewport = vp;
  road.draw(r, { z: cz, x: race.x * 0.92, h, turn: race.turnSky || 0, cars });
  if (vp) r.viewport = null;
  // cosmetic particles + car + HUD in one overlay
  r.overlay(g => {
    if (vp) { g.save(); g.beginPath(); g.rect(vp.x, vp.y, vp.w, vp.h); g.clip(); g.translate(vp.x, vp.y); }
    const p0 = road.project(race.pz, race.x, 0), p = p0 && [p0[0] - ox, p0[1] - oy, p0[2]], cs = Math.max(.6, H / 200) * (camName === 'Bumper' ? 1.1 : camName === 'High' ? .85 : 1);
    FX.step(game.dt || 1 / 60);
    if (p && camName !== 'Bumper') {
      OB.drawCar(g, p[0], p[1], cs, race, t, {});
      if (race.drift.on && FX.rng() < .8) for (const k of [-1, 1]) FX.spawn(p[0] + k * 26 * cs, p[1] - 3 * cs, k * (6 + FX.rng() * 20) + race.drift.dir * -18, -8 - FX.rng() * 14, .6, FX.rng() < .5 ? '#f4f0ec' : '#c8c0d8', 4 + FX.rng() * 5, 'smoke');
      if (race.boost > 0 && FX.rng() < .8) FX.spawn(p[0] + (FX.rng() - .5) * 20 * cs, p[1] - 4 * cs, (FX.rng() - .5) * 40, 20, .25, '#ffd23a', 3, 'spark');
      if (Math.abs(race.x) > 1.08 && race.speed > 40 && FX.rng() < .6) FX.spawn(p[0] + (FX.rng() - .5) * 50 * cs, p[1] - 2 * cs, (FX.rng() - .5) * 30, -18 - FX.rng() * 20, .5, st.def.biome === 'beach' || st.def.biome === 'desert' ? '#e8d4a0' : '#7a6a58', 3 + FX.rng() * 3, 'smoke');
    }
    FX.draw(g);
    if (race.boost > 0 || race.sling > 0) speedLines(g, W, H, t, Math.min(1, race.boost));
    bloom(g, W, H, race, st.def.tod, t); flare(g, W, H, st.def.tod);
    if (race.flash > 0) { g.globalAlpha = Math.min(.5, race.flash); px.rect(g, 0, 0, W, H, '#ffffff'); g.globalAlpha = 1; }
    if (!o.noHud) OB.drawHud(g, { W, H }, race, o);
    if (vp) g.restore();
  });
};
// a pixel-safe bloom: stepped, additive warm bands over the horizon and sun glare, no gradients
function bloom(g, W, H, race, tod, t) {
  const warm = { dawn: '#ff9a6a', morning: '#ffe8b0', noon: '#fff4d0', afternoon: '#ffd890', sunset: '#ff8a4a', dusk: '#ff7a8a', night: '#7a6aff' }[tod] || '#ffffff';
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) { g.globalAlpha = (.05 - k * .007) * (tod === 'night' ? .7 : 1) + (race.boost > 0 ? .02 : 0); px.rect(g, 0, Math.round(H * .4 + k * 6), W, 7, warm); }
  for (let k = 0; k < 4; k++) { g.globalAlpha = .03; px.rect(g, 0, k * 3, W, 3, warm); px.rect(g, 0, H - 3 - k * 3, W, 3, warm); }
  g.restore(); g.globalAlpha = 1;
}
// a lens flare: ghost discs strung along the line from the sun through the centre of the screen
function flare(g, W, H, tod) {
  const sun = OB.TOD[tod].sun; if (!sun) return; const sx = sun.x * W, sy = sun.y * H, cx = W / 2, cy = H / 2;
  g.save(); g.globalCompositeOperation = 'lighter';
  [[.35, 5, '#ffd890', .09], [.6, 9, '#ff9ad0', .07], [1.0, 4, '#9ad8ff', .08], [1.4, 12, '#ffe8b0', .05]].forEach(([k, r0, c, a]) => { g.globalAlpha = a; px.disc(g, Math.round(sx + (cx - sx) * k), Math.round(sy + (cy - sy) * k), r0, c); });
  g.globalAlpha = .05; px.rect(g, 0, Math.round(sy) - 1, W, 2, '#fff2c0'); g.restore(); g.globalAlpha = 1;
}
function speedLines(g, W, H, t, k) {
  g.globalAlpha = .35 * Math.max(.3, k);
  for (let i = 0; i < 22; i++) { const a = i * 2.399 + Math.floor(t * 20) * .37, d = 60 + ((i * 53 + Math.floor(t * 60)) % 80), r0 = 70 + d, r1 = r0 + 40; const cx = W / 2, cy = H * .45; px.line && px.line(g, cx + Math.cos(a) * r0 * 1.7, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1 * 1.7, cy + Math.sin(a) * r1, '#ffffff'); }
  g.globalAlpha = 1;
}
/* ---- the HUD (anchored to r.W and r.H; big and sparse for a TV at 10 feet) ---- */
OB.drawHud = (g, r, race, o) => {
  const W = r.W, H = r.H, t = game.time, T = OB.txt, U = OB.units(), mx = 8, my = 6;
  const low = !race.countUp && race.clock < 12 && race.state === 'go';
  // clock
  OB.panel(g, W / 2 - 36, my, 72, 34, { bg: '#2a1346cc', border: low && Math.floor(t * 4) % 2 ? '#ff5a5a' : '#ffd6f0' });
  T(g, race.countUp ? 'TIME' : 'DAYLIGHT', W / 2, my + 3, '#ffe27a', { align: 'center', font: 'tiny' });
  const cv = race.countUp ? OB.fmtTime(race.clock) : String(Math.ceil(race.clock));
  T(g, cv, W / 2, my + 12, low && Math.floor(t * 4) % 2 ? '#ff6a6a' : '#ffffff', { align: 'center', scale: race.countUp ? 2 : 3 });
  // score and chain (left)
  if (!o.compact) { T(g, 'SCORE', mx, my, '#ffe27a', { font: 'tiny' }); T(g, OB.pad(race.score, 7), mx, my + 7, '#ffffff', { scale: 2 }); }
  if (race.chain.mult > 1) { const pulse = 1 + (Math.floor(t * 6) % 2) * .0; OB.panel(g, mx, my + 26, 70, 14, { bg: '#7a1a5acc', border: '#ff9ad0' }); T(g, 'BLOOM x' + race.chain.mult, mx + 35, my + 29, '#ffe0f4', { align: 'center' }); px.rect(g, mx + 4, my + 38, Math.round(62 * clamp(race.chain.t / 3.6, 0, 1)), 2, '#ff9ad0'); }
  // stage, fork
  const def = race.stage.def, rowTxt = o.rowLabel || ('STAGE ' + Math.min(5, (def.row + 1)) + '/5');
  const RX = W - mx - (o.rowLabel === 'DEMO' ? 62 : 0);
  T(g, def.name.toUpperCase(), RX, my, '#ffffff', { align: 'right', font: 'tiny' }); T(g, rowTxt + '  ' + OB.TOD[def.tod].label.toUpperCase(), RX, my + 8, '#c8b8ff', { align: 'right', font: 'tiny' });
  const pw = Math.min(140, W / 3), bx = RX - pw, by = my + 18, prog = clamp(race.pz / race.stage.gateZ, 0, 1);
  px.rect(g, bx, by, pw, 4, '#1a1030'); px.rect(g, bx, by, Math.round(pw * prog), 4, '#ff9ad0'); px.rect(g, bx + pw - 1, by - 2, 2, 8, '#ffe27a');
  if (def.next && race.pz > race.stage.gateZ - 15000 && race.state === 'go') {
    const L = OB.STAGES[def.next[0]], R = OB.STAGES[def.next[1]], left = race.x < 0;
    OB.panel(g, W / 2 - 100, my + 44, 200, 24, { bg: '#2a1346cc', border: '#ffd6f0' });
    T(g, '◄ ' + L.name, W / 2 - 96, my + 50, left ? '#ffe27a' : '#a898c8', { font: 'tiny' }); T(g, R.name + ' ►', W / 2 + 96, my + 50, left ? '#a898c8' : '#ffe27a', { font: 'tiny', align: 'right' });
    T(g, 'PICK A ROAD', W / 2, my + 58, '#ff9ad0', { align: 'center', font: 'tiny' });
  }
  // speed and meters (right)
  const sp = Math.round(race.speed * U[1]);
  T(g, OB.pad(sp, 3), W - mx, H - 50, '#ffffff', { align: 'right', scale: o.compact ? 3 : 4 }); T(g, U[0], W - mx, H - 20, '#ffe27a', { align: 'right' });
  T(g, 'GEAR ' + race.gear + (race.manual ? ' M' : ' A'), W - mx - 42, H - 18, race.rpm > .96 && race.manual ? '#ff6a6a' : '#c8b8ff', { align: 'right', font: 'tiny' });
  const mw = 96, mxx = W - mx - mw;
  px.rect(g, mxx, H - 8, mw, 3, '#1a1030'); px.rect(g, mxx, H - 8, Math.round(mw * clamp(race.speed / (race.car.top * 1.12), 0, 1)), 3, race.boost > 0 ? '#ffd23a' : '#7ad8ff');
  if (race.drift.on) T(g, 'SLIDE +' + Math.round(race.drift.pts), W - mx, H - 72, '#ff9ad0', { align: 'right', scale: 2 });
  else if (race.drafting || race.charge > .1) { px.rect(g, mxx, H - 70, mw, 4, '#1a1030'); px.rect(g, mxx, H - 70, Math.round(mw * race.charge), 4, race.charge > .5 ? '#7aff9a' : '#7ad8ff'); T(g, race.charge > .5 ? 'SLINGSHOT READY' : 'SLIPSTREAM', W - mx, H - 80, '#bfffd0', { align: 'right', font: 'tiny' }); }
  if (!o.compact) {
  // passenger card (bottom left)
  const pc = OB.CAST[race.passId], px0 = mx, py0 = H - 66;
  OB.panel(g, px0, py0, 190, 60, { bg: '#2a1346cc' });
  OB.portrait(g, race.passId, px0 + 4, py0 + 4, 40);
  T(g, pc.name.toUpperCase(), px0 + 50, py0 + 5, '#ffe27a', { font: 'tiny' });
  for (let i = 0; i < 5; i++) T(g, '♥', px0 + 50 + i * 9, py0 + 12, race.mood > i * 20 + 10 ? '#ff5a8a' : '#4a2a5a', {});
  OB.flower(g, px0 + 142, py0+ 9); T(g, String(race.petals), px0 + 150, py0 + 5, '#ffd0ec', {});
  const rq = race.req;
  if (rq && race.state === 'go') {
    const d = rq.def, left = Math.max(0, d.time - rq.t), prog2 = clamp(rq.p / d.goal, 0, 1);
    E.font.wrap(d.text, 136, {}).slice(0, 2).forEach((ln, i) => T(g, String(ln), px0 + 50, py0 + 19 + i * 9, '#ffffff', {}));
    px.rect(g, px0 + 50, py0 + 44, 134, 4, '#1a1030'); px.rect(g, px0 + 50, py0 + 44, Math.round(134 * prog2), 4, '#ff9ad0'); px.rect(g, px0 + 50, py0 + 51, Math.round(134 * clamp(left / d.time, 0, 1)), 2, left < 5 ? '#ff6a6a' : '#7ad8ff');
  } else T(g, race.state === 'go' ? 'Enjoying the view' : '', px0 + 50, py0 + 24, '#a898c8', {});
  // the bubble
  const b = OB.bubble; if (b) { b.t += game.dt || 1 / 60; if (b.t > b.life) OB.bubble = null; else { const tw = Math.min(210, E.font.width(b.text) + 14); OB.panel(g, px0 + 196, py0 + 10, tw, 20, { bg: '#fff6fa', border: '#ff9ad0' }); T(g, b.text, px0 + 203, py0 + 17, '#4a1a3a', { shadow: false }); } }
  // radio
  const sd = OB.SONGDEFS[race.station % OB.SONGDEFS.length];
  T(g, '♪ ' + sd.name + '  ' + sd.station, mx, H - 78, '#d8c8ff', {});
  }
  // banner
  const bn = race.banner;
  if (bn) { const u = clamp(bn.t / .4, 0, 1), fade = bn.t > 2.4 ? clamp(1 - (bn.t - 2.4) / .6, 0, 1) : 1; g.globalAlpha = fade; const y = Math.round(H * .26 - (1 - OB.ease.out(u)) * 14);
    if (bn.kind === 'go') E.font.title(g, 'GO!', W / 2, y, { scale: 6, align: 'center', colors: ['#fff6d0', '#ffd060', '#e8402a'], depth: 3 });
    else { E.font.title(g, bn.text, W / 2, y, { scale: 3, align: 'center', colors: bn.kind === 'extended' ? ['#fff6d0', '#9affb0', '#2aa860'] : ['#ffffff', '#ffd0ec', '#ff6aa0'], depth: 2 }); if (bn.sub) T(g, bn.sub.toUpperCase(), W / 2, y + 26, '#ffffff', { align: 'center' }); }
    g.globalAlpha = 1; }
  if (race.state === 'count') { const n = Math.ceil(race.countT - .4); if (n > 0 && n <= 3) E.font.title(g, String(n), W / 2, Math.round(H * .25), { scale: 8, align: 'center', colors: ['#ffffff', '#ffd0ec', '#ff6aa0'], depth: 3 }); }
  // dev overlay readouts
  if (OB.dev.showDebug) T(g, 'z ' + Math.round(race.z) + ' x ' + race.x.toFixed(2) + ' v ' + Math.round(race.speed) + ' c ' + race.road.curveAt(race.pz).toFixed(1) + ' veh ' + race.traffic.length, mx, H - 86, '#9affb0', { font: 'tiny' });
  if (OB.dev.god || OB.dev.infTime) T(g, 'DEV' + (OB.dev.god ? ' GOD' : '') + (OB.dev.infTime ? ' ∞TIME' : ''), W / 2, H - 12, '#ff6a6a', { align: 'center', font: 'tiny' });
};
})();
