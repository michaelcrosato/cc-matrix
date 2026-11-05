/* =============================================================================
 * 12-bat: the sweet-spot reticle, the swings (contact, power, BATZOOKA, bunt)
 * and the contact model: timing error and aim offset -> spray, launch and exit
 * speed. The result comes straight from timing and aim, so it is readable.
 * ========================================================================== */
BZ.SWINGS = {
  contact: { delay: .10, r: 4.2, ev: 720, add: 0 },
  power: { delay: .14, r: 2.8, ev: 860, add: 6 },
  batzooka: { delay: .16, r: 6.3, ev: 780, add: 0, zooka: true },
  bunt: { delay: 0, r: 6, ev: 160, add: 0, bunt: true }
};
/** the batting assists by difficulty for a human batter: { sweet, window } multipliers */
BZ.assistFor = (M, side) => {
  const human = M.teams[side].humans.length > 0, lv = M.difficulty || 'pro';
  if (!human) return { sweet: 1, window: 1 };
  const base = { rookie: [1.25, 1.25], pro: [1, 1], allstar: [1, 1], batzooka: [.9, .9] }[lv] || [1, 1];
  const set = BZ.game && BZ.game.settings ? BZ.game.settings.batAssist : 'off';
  return { sweet: base[0] * (set === 'big' ? 1.25 : 1), window: base[1] * (set === 'big' ? 1.1 : 1) };
};
BZ.swingWindow = (assist) => .09 * TUNE.swingTiming * (assist ? assist.window : 1);
/** the reticle's radius for a swing type and batter */
BZ.reticleR = (type, batter, assist) => (BZ.SWINGS[type] || BZ.SWINGS.contact).r * BZ.factor(batter.con) * TUNE.sweetSpot * (assist ? assist.sweet : 1);

/**
 * the contact model. sw: { type, e (s, + late), rx, rz (reticle center at contact) }, ball: { x, z } (the crossing),
 * pitch speed (U/s), batter, park, lefty. Returns { kind: 'miss' | 'foultip' | 'dribble' | 'contact', grade, ... }
 */
BZ.contact = (sw, ball, pitchSpeed, batter, park, lefty, assist, o = {}) => {
  const S = BZ.SWINGS[sw.type] || BZ.SWINGS.contact, win = BZ.swingWindow(assist);
  const r = BZ.reticleR(sw.type, batter, assist) * (o.rMul || 1);
  const e = sw.e, ae = Math.abs(e);
  // vertical offset costs less than sideways: aiming a touch under the ball lofts it without killing it
  const dx = ball.x - sw.rx, dz = ball.z - sw.rz, d = Math.hypot(dx, dz * .65), dn = d / r;
  const out = { e, d, dn, r, window: win, ms: Math.round(e * 1000) };
  out.grade = ae <= .022 * TUNE.swingTiming * (assist ? assist.window : 1) ? 'PERFECT' : ae <= .05 * TUNE.swingTiming * (assist ? assist.window : 1) ? 'GOOD' : 'OK';
  if (ae > win || dn > 1.6) { out.kind = 'miss'; return out; }
  if (o.needGood && out.grade === 'OK') { out.kind = 'foultip'; return out; }
  if (dn > 1) { out.kind = (o.rand || BZ.R)() < .3 ? 'dribble' : 'foultip'; }
  else out.kind = 'contact';
  const timing = 1 - Math.pow(ae / win, 1.5), Q = out.kind === 'contact' ? (1 - Math.min(dn, 1)) * timing : .08;
  const rnd = o.rand || BZ.R;
  let theta = (lefty ? -1 : 1) * (e / win) * 48 + (dx / r) * 10 + (rnd() - .5) * 8;   // degrees, + toward right field
  let phi = 12 - (-(dz) / r) * 35 * TUNE.launchSpread + S.add;                          // swinging above the ball (reticle high) drives it down
  if (out.kind === 'dribble') { phi = -15 + rnd() * 10; theta = theta * .6 + (rnd() - .5) * 40; }
  if (S.zooka) phi = clamp(phi, 28, 38);
  const pow = BZ.factor(batter.pow), evMax = S.zooka ? S.ev * TUNE.batzookaPower : S.ev;
  let EV = lerp(280, evMax, Math.pow(Math.max(0, Q), .92)) * pow * (.9 + .1 * pitchSpeed / 340) * TUNE.exitVelocity * (park ? park.evMul : 1) * (o.evMul || 1);
  if (out.kind === 'dribble') EV = 120 + rnd() * 90;
  Object.assign(out, { Q, theta, phi, EV, spin: (lefty ? -1 : 1) * Math.sign(e) * Math.min(1, ae / win) * 110 });
  const t = theta * Math.PI / 180, p = phi * Math.PI / 180;
  out.v = [EV * Math.cos(p) * Math.sin(t), -EV * Math.cos(p) * Math.cos(t), EV * Math.sin(p)];
  out.feedback = out.grade === 'PERFECT' ? 'PERFECT!' : (e < 0 ? 'EARLY ' : 'LATE ') + Math.abs(out.ms) + ' MS';
  out.feedback2 = dz < -r * .45 ? 'TOPPED' : dz > r * .45 ? 'UNDER IT' : '';
  return out;
};
/** a bunt: the ball crosses within the bunt radius of the reticle -> a soft roller */
BZ.buntContact = (ball, rx, rz, batter, park, rand = BZ.R) => {
  const r = BZ.SWINGS.bunt.r * BZ.factor(batter.con) * TUNE.sweetSpot, dx = ball.x - rx, dz = ball.z - rz, d = Math.hypot(dx, dz);
  if (d > r) return { kind: 'miss', d, r };
  const theta = (dx / r) * 34 + (rand() - .5) * 16, phi = -6 + (dz / r) * 10 + rand() * 4, EV = 150 + rand() * 50;
  const t = theta * Math.PI / 180, p = phi * Math.PI / 180;
  return { kind: 'contact', bunt: true, theta, phi, EV, Q: .2, spin: 0, grade: 'BUNT', ms: 0, v: [EV * Math.cos(p) * Math.sin(t), -EV * Math.cos(p) * Math.cos(t), EV * Math.sin(p)], feedback: 'BUNT!' };
};
