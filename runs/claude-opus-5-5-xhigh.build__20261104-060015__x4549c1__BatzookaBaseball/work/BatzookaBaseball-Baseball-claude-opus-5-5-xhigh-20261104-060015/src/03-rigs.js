/* =============================================================================
 * 03-rigs: the rig factory (team uniform + a player's own looks + the job's kit),
 * the baseball motions (swing, power swing, bunt, windup and pitch, throws, tags,
 * dives, slides, umpire calls, celebrations) built on the engine's attack specs and
 * poses, the two-handed bat grip, and the Batzooka overdraw.
 * Rigs are cosmetic: gameplay never reads a joint.
 * ========================================================================== */
BZ.MOTION = {
  // the contact swing: wind-up to the plate plane in 0.10 s (contact at the middle of 'active')
  swing: { rel: true, hand: 'both', a0: 2.3, a1: -2.5, z0: -1.5, z1: -3.5, reach: 6.5, lunge: 2.2, twist: 2.2, lean: .25, hold: .35, blade: 1 },
  power: { rel: true, hand: 'both', a0: 2.6, a1: -2.8, z0: -1, z1: -4, reach: 7, lunge: 3, twist: 2.8, lean: .35, hold: .4, blade: 1, crouch: .3 },
  bunt: { rel: true, hand: 'both', a0: .05, a1: .05, z0: 3.5, z1: 3.5, reach: 5.5, lunge: .5, crouch: .5 },
  throwArm: { rel: true, a0: 1.8, a1: -.6, z0: 3, z1: 0, reach: 6, lunge: 2.4, lean: .6, twist: 1.6, hold: .2 },
  pitchKick: 'knee',
  tag: { rel: true, hand: 'L', a0: .9, a1: -.4, z0: -8, z1: -9, reach: 7, lunge: 1.5, crouch: .6, lean: .4 },
  safe: { rel: true, hand: 'both', a0: .3, a1: 1.6, z0: 0, z1: 0, reach: 6, hold: .7 },
  punchOut: { rel: true, a0: .2, a1: -1.2, z0: 2, z1: 1, reach: 6, lunge: 1.2, twist: 1.2, hold: .8 },
  fistPump: 'uppercut'
};
BZ.atk = (spec, phase, u) => ({ spec: typeof spec === 'string' ? E.MOVES[spec] : spec, phase, u: clamp(u, 0, 1) });
/** an attack state for a timed motion: t seconds since it began, w wind, a active, r recover */
BZ.motionAt = (spec, t, w, a, r) => {
  if (t < 0) return null;
  if (t < w) return BZ.atk(spec, 'wind', t / w);
  if (t < w + a) return BZ.atk(spec, 'active', (t - w) / a);
  if (t < w + a + r) return BZ.atk(spec, 'recover', (t - w - a) / r);
  return null;
};

/** dress a Humanoid for a player in a job: 'bat' | 'run' | 'field' | 'catch' | 'pitch' | 'bench' | 'fight' | 'ump' */
BZ.makeRig = (pl, team, job) => {
  const T = team || {}, U = T.uniform || {}, L = pl.look || {};
  const lefty = (pl.bt || 'R/R').split('/')[job === 'bat' ? 0 : 1] === 'L';
  const colors = Object.assign({
    skin: L.skin || '#e0a878', hair: L.hairColor || '#3b2a2f', cloth: U.jersey || '#f4ecd8', pants: U.pants || U.jersey || '#f4ecd8',
    boot: U.socks || '#1e2a5a', belt: U.trim || '#1e2a5a', trim: U.trim || '#1e2a5a', glove: U.gloves || '#f0f0f0',
    mitt: L.mitt || '#8a5228', bat: U.bat || '#c89a5a', plate: U.dark || U.trim || '#1e2a5a', metal: U.metal || '#c8d0e0', eye: '#1a1320'
  }, L.colors || {});
  if (L.build === 'skeleton') colors.bone = U.bone || '#e8e0c8';
  const capC = U.cap || U.trim || '#1e2a5a';
  const o = {
    size: L.size || 1.25, build: L.build || 'heroic', hair: L.hair || 'short', outfit: 'shirt', sleeves: 'short', weapon: null, colors,
    hunch: L.hunch || 0, eyeGlow: L.eyeGlow || null, face: L.face
  };
  if (job === 'bat') Object.assign(o, { weapon: 'bat', hat: { style: 'batting', color: U.helmet || capC, flap: lefty ? 1 : -1 } });
  else if (job === 'run') Object.assign(o, { hat: { style: 'batting', color: U.helmet || capC, flap: lefty ? 1 : -1 } });
  else if (job === 'catch') Object.assign(o, { hat: { style: 'mask', color: U.helmet || capC }, armor: true, mitt: 'catcher', mittHand: lefty ? 'R' : 'L' });
  else if (job === 'field' || job === 'pitch') Object.assign(o, { hat: L.hat ? L.hat : { style: U.hatStyle || 'cap', color: capC }, mitt: pl.pos === '1B' ? 'first' : 'fielder', mittHand: lefty ? 'R' : 'L' });
  else if (job === 'bench' || job === 'fight') Object.assign(o, { hat: L.hat ? L.hat : { style: U.hatStyle || 'cap', color: capC } });
  else if (job === 'ump') Object.assign(o, { outfit: 'coat', sleeves: 'long', hat: { style: 'mask', color: '#1a2238' }, colors: Object.assign(colors, { cloth: '#1a2238', coat: '#1a2238', pants: '#5a6070', boot: '#1a1a1a', belt: '#1a1a1a' }) });
  if (L.outfit) o.outfit = L.outfit;
  if (L.hatOverride) o.hat = L.hatOverride;
  if (U.hatStyle === 'visor' && (job === 'field' || job === 'pitch' || job === 'bench')) o.hat = { style: 'visor', color: capC, tint: U.visor || '#5a7ac8' };
  const rig = new E.Humanoid(o);
  rig.lefty = lefty; rig.job = job;
  if (job === 'bat') BZ.gripBoth(rig);
  return rig;
};
/** the left hand holds the bat's handle below the right in the stance (attacks with hand 'both' grip on their own) */
BZ.gripBoth = (rig) => {
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    if (this._noGrip || !this.o.weapon || (this._lastAtk && this._lastAtk.spec && this._lastAtk.spec.hand === 'both')) return;
    const J = this.J, o = this.o, bd = J.bladeDir; if (!bd || !J.handR) return;
    const tgt = [J.handR[0] - bd[0] * 2.3, J.handR[1] - bd[1] * 2.3, J.handR[2] - bd[2] * 2.3];
    try { const r = E.ik3(J.shL, tgt, o.armUpper, o.armLower, [-1, -.7, -.2]); J.elbowL = r[0]; J.handL = r[1]; } catch (e) { /* keep the pose */ }
  };
};
/** update a rig with a state (skipped when cosmetics are off) */
BZ.rigUpdate = (rig, dt, s) => { if (!rig || !BZ.cosmetic) return; rig._lastAtk = s.attack || null; rig.update(dt, s); };

/* ---- the rig cache: one rig per player and job ---- */
BZ.rigCache = new Map();
BZ.rigFor = (pl, job) => {
  if (!pl) return null;
  const key = pl.id + ':' + job + ':' + (pl.team || '');
  let rg = BZ.rigCache.get(key);
  if (!rg) { rg = BZ.makeRig(pl, BZ.get('teams', pl.team), job); BZ.rigCache.set(key, rg); }
  return rg;
};
BZ.umpireRig = () => BZ.rigCache.get('ump') || (BZ.rigCache.set('ump', BZ.makeRig({ id: 'ump', look: { skin: '#c8906a', hair: 'short', size: 1.25, build: 'bulky' } }, null, 'ump')), BZ.rigCache.get('ump'));

/* ---- the Batzooka overdraw: glowing barrel, nozzle and fins over the bat while it is armed ---- */
BZ.drawBatzooka = (g, rig, project, k, t, colors) => {
  const J = rig.J; if (!J.handR || !J.bladeDir) return;
  const bd = J.bladeDir, at = d => { const w = rig.worldOffset([J.handR[0] + bd[0] * d, J.handR[1] + bd[1] * d, J.handR[2] + bd[2] * d]); return project(rig.x + w[0], rig.y + w[1], rig.z + w[2]); };
  const a = at(4), b = at(12.5), c = at(14.5); if (!a || !b || !c) return;
  const col = colors || ['#ff7a1a', '#ffd040', '#fff6c0'];
  const rr = Math.max(1, k * 1.15);
  px.line(g, a[0], a[1], b[0], b[1], '#3a3a48', Math.max(2, Math.round(rr * 2.1)));
  px.line(g, a[0], a[1], b[0], b[1], col[0], Math.max(1, Math.round(rr * 1.3)));
  px.line(g, a[0] - .5, a[1] - .5, b[0] - .5, b[1] - .5, col[1], 1);
  // fins near the handle, a nozzle ring at the barrel's end
  const f = at(5.5), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * rr * 2, ny = dx / L * rr * 2;
  if (f) { px.poly(g, [[f[0], f[1]], [f[0] + nx - dx / L * rr * 2, f[1] + ny - dy / L * rr * 2], [f[0] - dx / L * rr * 3, f[1] - dy / L * rr * 3]], '#d83a2a'); px.poly(g, [[f[0], f[1]], [f[0] - nx - dx / L * rr * 2, f[1] - ny - dy / L * rr * 2], [f[0] - dx / L * rr * 3, f[1] - dy / L * rr * 3]], '#d83a2a'); }
  px.disc(g, c[0], c[1], Math.max(1.5, rr * 1.4), '#3a3a48'); px.disc(g, c[0], c[1], Math.max(1, rr * .9), col[1]);
  const fl = Math.max(1, rr * (1.2 + .5 * Math.sin(t * 40)));
  px.blend(g, .8, 'add', () => { px.disc(g, c[0] + dx / L * fl, c[1] + dy / L * fl, fl, col[0]); px.disc(g, c[0] + dx / L * fl * 1.5, c[1] + dy / L * fl * 1.5, fl * .6, col[2]); });
};

/* ---- Blob mascots, gulls, drones ---- */
BZ.makeBlob = (spec) => new E.Blob(Object.assign({ R: 7 }, spec));
