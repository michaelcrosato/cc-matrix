// Drawing the six bosses: their hull shapes, moving parts (the dish, turrets, cars, the tower, the rotor), their crews
// (gunners, SGT. SNARL, KRAGG, MAJOR TUSK with his shield), damage and death.
(() => {
const E = My3D2dge, WP = globalThis.WP, { px } = E, { clamp, lerp } = WP, R = WP.Render, DRAW = R.DRAW;
const WRECK = { b: 'charred', c: 'charred', h: 'charred', d: 'charred', m: 'charred', y: 'charred', w: 'charred', r: 'charred', t: 'charred', g: 'charred', l: 'charred' };
const P = (e, n) => e.parts.find(q => q.name === n);
const flashOf = q => q && q.hitT > 0 ? ((q.hitT -= 1 / 60), '#ffffff') : null;
const blink = q => q && !q.dead && Math.floor(WP.time * 6) % 2 === 0;
const crew = (e, tp) => { for (const q of e.parts || []) if (q.kind === 'gunner' && !q.dead && (q.phase || 1) <= (e.phase || 1) && q.name !== 'kragg') { const r = WP.Rigs.pool.get(e.id + ':' + q.name); if (r) R.rig(r, q.x, q.y - .8, q.z + (e.bob || 0), { flash: flashOf(q) }); } };
/** weak points blink with a white outline at 3 Hz (drawn as a ring at the part) */
const weakRing = (e) => {
  for (const q of e.parts || []) {
    if (q.dead || q.phase !== e.phase || q.kind !== 'weak' || q.nohit) continue;
    R.m7.add(q.x, q.y + 1, q.z + (e.bob || 0), (g, sx, sy, k) => { if (Math.floor(WP.time * 6) % 2) return; const r = Math.max(4, q.r * k); for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; px.dot(g, sx + Math.cos(t) * r, sy + Math.sin(t) * r, '#ffffff'); } });
  }
};
const base = (e, tp, extra = {}) => {
  const dead = e.dead, alpha = dead && e.stt > 4 ? clamp(1 - (e.stt - 4) / 1.5, 0, 1) : 1;
  R.shape(tp.shape, e.x, e.y, (e.z || 0) + (e.bob || 0), Object.assign({ facing: e.facing, mats: dead ? WRECK : null, mk: dead ? 'w' : '', alpha }, extra));
  return alpha;
};
DRAW.bigEar = (e, tp) => {
  const a = base(e, tp); if (a <= 0) return;
  const d = P(e, 'dish'), pod = P(e, 'pod');
  if (d && !d.dead) R.shape('radarDish', d.x, d.y, d.z - 22, { facing: e.dishA || 0, size: .8, flash: flashOf(d) });
  if (pod && !pod.dead) R.shape('apcTurret', pod.x, pod.y, pod.z - 4, { facing: Math.atan2(WP.Flow.sim ? 0 : 0, 1) + Math.PI / 2, flash: flashOf(pod) });
  crew(e, tp); weakRing(e);
};
DRAW.crocodile = (e, tp) => {
  const a = base(e, tp); if (a <= 0) return;
  for (const n of ['turretF', 'turretR']) { const q = P(e, n); if (q) R.shape('tankTurret', q.x, q.y, q.z + (e.bob || 0) - 3, { facing: e.facing + Math.PI, size: .7, mats: q.dead ? WRECK : null, mk: q.dead ? 'w' : '', flash: flashOf(q) }); }
  const m = P(e, 'mortar'); if (m && !m.dead) R.shape('apcTurret', m.x, m.y, m.z + (e.bob || 0) - 3, { facing: Math.PI / 2, size: .8, flash: flashOf(m) });
  weakRing(e);
  // its wake
  if (!e.dead && WP.fxr() < .3) WP.FX.splash(e.x + (WP.fxr() - .5) * 40, e.y, 2);
};
DRAW.warthog = (e, tp) => {
  const a = base(e, tp, { flash: e.stunT > 0 && Math.floor(WP.time * 12) % 2 ? '#a8c8ff' : null }); if (a <= 0) return;
  const c = P(e, 'cannon'); if (c) R.shape('tankTurret', c.x, c.y, c.z - 4, { facing: e.turret || e.facing, size: .8, mats: c.dead ? WRECK : null, mk: c.dead ? 'w' : '', flash: flashOf(c) });
  crew(e, tp); weakRing(e);
  if (e.flame) { const q = P(e, e.flame.side); if (q) R.m7.add(q.x, q.y + 2, q.z, (g, sx, sy, k) => px.blend(g, .6, 'add', () => px.disc(g, sx, sy, Math.max(3, 5 * k), '#ff6a20'))); }
};
DRAW.ironHog = (e, tp) => {
  const a = base(e, tp); if (a <= 0) return;
  for (const [n, off, shape] of [['mgCar', -62, 'trainCar'], ['rocketCar', -116, 'trainCar'], ['mortarCar', -170, 'ammoWagon']]) {
    const q = P(e, n), w = WP.Hit.local(e, [0, off, 0]);
    R.shape(shape, w[0], w[1], 0, { facing: e.facing, mats: q && q.dead || e.dead ? WRECK : null, mk: q && q.dead || e.dead ? 'w' : '', flash: flashOf(q) });
  }
  weakRing(e);
  if (!e.dead && WP.fxr() < .25) { const w = WP.Hit.local(e, [0, 22, 30]); WP.FX.smoke(w[0], w[1], w[2], 1, '#2a2a2a', 1.2); }
  if (e.vent) { const b = P(e, 'boiler'); R.m7.add(b.x, b.y + 2, b.z, (g, sx, sy, k) => px.blend(g, .5 + .3 * Math.sin(WP.time * 30), 'add', () => px.disc(g, sx, sy, Math.max(4, 9 * k), '#ffffff'))); }
};
DRAW.tusk = (e, tp, world) => {
  if (e.phase === 1 || (e._fallAt && WP.time - e._fallAt < 2.5)) {
    const fall = e._fallAt ? clamp((WP.time - e._fallAt) / 2, 0, 1) : 0;
    R.shape('bossTower', e.x, e.y, -fall * 60, { facing: e.facing, alpha: 1 - fall * .9, mats: fall > 0 ? WRECK : null, mk: fall > 0 ? 'w' : '' });
    for (const n of ['light1', 'light2']) { const q = P(e, n); if (q && !fall) R.shape('searchlight', q.x, q.y, q.z - 4, { facing: Math.PI / 2 + Math.sin(e.lightA * .5 + (n === 'light2' ? 2 : 0)) * .8, mats: q.dead ? { g: 'steelDk' } : null, mk: q.dead ? 'out' : '', flash: flashOf(q) }); }
    for (const n of ['leg1', 'leg2', 'leg3']) { const q = P(e, n); if (q && !q.dead && !fall) R.m7.add(q.x, q.y + 2, q.z, (g, sx, sy, k) => { if (q.hitT > 0) px.blend(g, .6, 'add', () => px.disc(g, sx, sy, Math.max(3, 6 * k), '#ffffff')); }); }
    const mg = P(e, 'mg'); if (mg && !mg.dead && !fall) { const r = WP.Rigs.gunner(e.id + ':mg', 'tusk'); r.update(1 / 60, { x: mg.x, y: mg.y, z: mg.z - 10, facing: Math.PI / 2, point: true, expr: 'angry' }); R.rig(r, mg.x, mg.y - 1, mg.z - 10, { flash: flashOf(mg) }); }
    weakRing(e);
    if (e.phase === 1) return;
  }
  if (!e.tusk) return;
  const r = WP.Rigs.pool.get(e.id), T = e.tusk; if (!r) return;
  const q = P(e, 'tusk'), alpha = e.dead ? clamp(1 - e.stt / 3, 0, 1) : 1;
  R.rig(r, e.tx, e.ty, 0, { alpha, flash: flashOf(q), after: (g, sx, sy, k) => {
    if (e.dead) return;
    const open = T.shieldOff > 0 || T.st === 'aim' && e.atkT && e.atkT.t > .15, H = WP.RIG_H.bulky * 1.75 * R.m7.view(k).scale;
    if (!open) { px.rect(g, sx - H * .32, sy - H * .8, H * .64, H * .7, '#3a3e48'); px.rect(g, sx - H * .32, sy - H * .8, H * .64, 2, '#8a90a0'); px.rect(g, sx - H * .26, sy - H * .5, H * .52, H * .06, '#5a606a'); E.font.text(g, 'KENNEL', sx, sy - H * .42, '#c8b060', { align: 'center', outline: false }); }
    else if (T.shieldOff > 0) { px.rect(g, sx + H * .4, sy - H * .5, H * .5, H * .12, '#3a3e48'); }
  } });
};
DRAW.hyenaOne = (e, tp) => {
  const a = base(e, tp, { flash: e.stagger > 0 && Math.floor(WP.time * 10) % 2 ? '#ffd0a0' : null }); if (a <= 0) return;
  R.m7.add(e.x, e.y, e.z + 30, (g, sx, sy, k) => { const r = 54 * k, t = WP.time * 28; if (e.dead) return; px.blend(g, .45, 'normal', () => px.ell(g, sx, sy, r, Math.max(1, r * .12), '#c8c8c0')); for (let i = 0; i < 2; i++) { const u = t + i * Math.PI / 2; px.line(g, sx - Math.cos(u) * r, sy - Math.sin(u) * r * .1, sx + Math.cos(u) * r, sy + Math.sin(u) * r * .1, '#1a1a1a', Math.max(1, Math.round(k * 1.2))); } });
  for (const n of ['podL', 'podR', 'nose']) { const q = P(e, n); if (q && q.dead) R.m7.add(q.x, q.y + 1, q.z, (g, sx, sy, k) => px.blend(g, .5, 'add', () => px.disc(g, sx, sy, Math.max(2, 4 * k), '#ff6a20'))); }
  crew(e, tp); weakRing(e);
  const kr = P(e, 'kragg'); if (kr && !kr.dead && e.phase >= 3) { const r = WP.Rigs.pool.get(e.id + ':kragg'); if (r) R.rig(r, kr.x, kr.y - .8, kr.z, { flash: flashOf(kr) }); }
};
})();
