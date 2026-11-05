/* =====================================================================================
 * 42-view-creatures: how each monster looks. Cards (the engine's rigs: E.Humanoid, E.Blob, an orb) or bodies drawn with
 * the pen (local +x ahead, +y to its left, z up), animated from the sim's state and a clock of their own
 * ===================================================================================== */
const CREATURES = {
  rat: { blob: { R: 3.6, ears: 'cat', tail: true, feet: true, mouth: 'fangs', colors: { base: '#6a5a50', dk: '#3e342e', lt: '#9a8a7a', eye: '#ff6a4a' } }, r: 3 },
  leech: { pen: 'leech', r: 5 },
  latchkin: { rig: { size: .85, build: 'chibi', hunch: .5, hood: true, outfit: 'tunic', bladeLen: 5, eyeGlow: '#ffd24a', colors: { skin: '#7a8a5a', hair: '#4a3a2a', cloth: '#6a4a32', pants: '#3a2e22', metal: '#9a9aa8' } }, move: 'thrust', keys: true, r: 3.5 },
  ooze: { blob: { R: 8, face: 'front', mouth: true, colors: { base: '#5a8a3a', dk: '#2e5a22', lt: '#9ad06a', spec: '#e8ffd0' } }, r: 7 },
  ratknot: { pen: 'ratknot', r: 7 },
  snick: { rig: { size: 1.0, build: 'bulky', hunch: .3, hat: { style: 'crown', color: '#c8a040' }, armor: true, outfit: 'coat', bladeLen: 9, eyeGlow: '#ffd24a', cape: { len: 5, width: 5, seg: 2.5 }, colors: { skin: '#7a8a5a', cloth: '#5a3a2a', coat: '#5a3a2a', plate: '#a08040', cape: '#4a3a2a', capeIn: '#2a1a12', metal: '#c8c0b0' } }, move: 'overhead', keys: true, r: 5 },
  skeleton: { rig: { size: 1.2, build: 'skeleton', outfit: 'coat', bladeLen: 7, colors: { bone: '#d8cfb4', skin: '#d8cfb4', cloth: '#5a4030', coat: '#5a4030', metal: '#8a8a90' } }, move: 'overhead', hammer: true, r: 5 },
  rustling: { blob: { R: 4.2, horns: true, feet: true, mouth: true, colors: { base: '#b8642a', dk: '#7a3a18', lt: '#e8a060', eye: '#ffe08a' } }, r: 3.5 },
  spider: { pen: 'spider', r: 7 },
  sentinel: { rig: { size: 1.6, build: 'bulky', armor: true, hat: { style: 'helmet', color: '#8a6a3a' }, bladeLen: 14, eyeGlow: '#ff8a3a', colors: { cloth: '#6a4a2a', plate: '#b08a4a', metal: '#c8a868', skin: '#5a4a3a' } }, move: 'twohand', windKey: true, r: 9 },
  hound: { pen: 'hound', r: 6 },
  seer: { rig: { size: 1.25, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', eyeGlow: '#8ae0ff', colors: { cloth: '#d8d0e8', hair: '#3a2a4a', skin: '#b8b0c8', trim: '#6a4a9a' } }, move: 'cast', sigil: true, r: 5 },
  warden: { rig: { size: 1.35, build: 'heroic', armor: true, hat: { style: 'helmet', color: '#2a2434' }, weapon: 'staff', eyeGlow: '#e8e8ff', colors: { cloth: '#2a2434', plate: '#4a4458', metal: '#9a98a8', skin: '#b8b0c8' } }, move: 'thrust', halberd: true, r: 5 },
  gazer: { pen: 'gazer', fly: true, r: 4 },
  golem: { rig: { size: 1.9, build: 'bulky', armor: true, weapon: null, eyeGlow: '#7ad8ff', colors: { cloth: '#3a3e46', plate: '#5a606a', skin: '#4a4e56' } }, move: 'haymaker', padlock: true, r: 9 }
};
B.CREATURES = CREATURES;
/** make a rig from look options (portraits, mobs, cutscenes) */
B.rigOf = look => new E.Humanoid(Object.assign({ speedRef: 50 }, B.clone(look)));

/* ---- the pen bodies. s: { t (its clock), wind (0..1 the wind-up), strike (0..1 after a blow), hurt, dead (seconds), walk } ---- */
const PEN_BODIES = {
  leech(p, s) {
    const n = 5, und = s.dead > 0 ? Math.min(1, s.dead) : 0, lunge = s.wind > 0 ? -s.wind * 3 : s.strike > 0 ? Math.sin(s.strike * PI) * 6 : 0;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), x = 6 - i * 3.4 + lunge * (1 - u), y = Math.sin(s.t * 3 + i * 1.1) * 1.6 * (1 + (s.walk || 0) * .9) * (1 - und), r = 4 - u * 1.5;
      p.ball(x, y + und * Math.sin(i) * 3, r * .9 * (1 - und * .3), r, r, r * .85, i % 2 ? '#b89a9a' : '#a88a8a').ball(x, y, r * .9 + .3, r * .8, r * 1.02, .6, '#7a5a5a');
    }
    for (let k = 0; k < 6; k++) { const a = k * PI / 3; p.ball(9 + lunge, Math.cos(a) * 1.8, 4 + Math.sin(a) * 1.8, .7, .7, .7, '#5a3a3a'); }
    p.ball(8.6 + lunge, 0, 4, 1.6, 1.6, 1.6, '#2a1414').ball(5, -1.6, 5.8, .6, .5, .5, '#ffe8e8');
  },
  ratknot(p, s) {
    const N = 6, spin = s.t * .6, wob = s.wind > 0 ? 1 + s.wind * .25 : 1, d = s.dead > 0 ? Math.min(1, s.dead) : 0;
    const bite = s.strike > 0 ? Math.sin(s.strike * PI) * 5 : 0, hop = Math.abs(Math.sin(s.t * 9)) * 1.8 * (s.walk || 0) * (1 - d);
    for (let i = 0; i < N; i++) {
      const a = spin + i * PI * 2 / N, R = 6.5 * wob + d * 4, x = Math.cos(a) * R + bite * (Math.cos(a) > 0 ? 1 : .4), y = Math.sin(a) * R, z = 4 + Math.sin(s.t * 6 + i) * .6 - d * 2 + hop;
      p.ball(x, y, z, 3.4, 2.4, 2.6, i % 2 ? '#6a5a50' : '#5a4a42');
      const hx = Math.cos(a) * (R + 3) + bite * (Math.cos(a) > 0 ? 1.3 : .4), hy = Math.sin(a) * (R + 3); p.ball(hx, hy, z + .6, 1.8, 1.6, 1.6, '#7a6a5e').cone(hx, hy, z + 1.6, hx + Math.cos(a) * .4, hy + Math.sin(a) * .4, z + 3.4, .8, '#9a8a7a');
      p.ball(hx + Math.cos(a) * 1.6, hy + Math.sin(a) * 1.6, z + .8, .4, .4, .4, '#ff6a4a');
      p.tube(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3), z - .5, Math.cos(a + 1) * 1.5, Math.sin(a + 1) * 1.5, 2.5, .45, '#c8a090');
    }
    p.ball(bite * .6, 0, 2.5 + hop, 2.4, 2.4, 2, '#b89080');
    if (s.crown) for (let i = 0; i < 5; i++) { const a = i * PI * 2 / 5; p.cone(bite * .6 + Math.cos(a) * 2, Math.sin(a) * 2, 4 + hop, bite * .6 + Math.cos(a) * 2, Math.sin(a) * 2, 7 + hop, .7, '#c8b070'); }
  },
  spider(p, s) {
    const d = s.dead > 0 ? Math.min(1, s.dead * 1.3) : 0, lunge = s.wind > 0 ? -s.wind * 2 : s.strike > 0 ? Math.sin(s.strike * PI) * 5 : 0;
    const c = '#b8923a', dk = '#7a5a20', z0 = 9 - d * 6;
    const breath = 1 + Math.sin(s.t * 2.2) * .06 * (1 - d), tw = Math.sin(s.t * 3.1) * .35 * (1 - d);
    p.ball(-6 - d * 2, 0, z0 + 1, 7 * breath, 6 * breath, 5.5 * breath, c).ball(-6, 0, z0 + 4 + (breath - 1) * 8, 4, 3.4, 2, '#d8b860');
    p.ball(2 + lunge, 0, z0, 4.5, 4, 3.4, dk);
    for (let e = 0; e < 4; e++) p.glow(5.6 + lunge, -1.8 + e * 1.2, z0 + 1 + (e % 2) * .8, .45, '#ff3a2a');
    p.tube(5 + lunge, -1, z0 - 1.5, 7.5 + lunge, -1.2 - tw, z0 - 3, .5, '#5a4010').tube(5 + lunge, 1, z0 - 1.5, 7.5 + lunge, 1.2 + tw, z0 - 3, .5, '#5a4010');
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? 1 : -1, k = i % 4, ax = 3 - k * 2.6, ph = s.t * 9 * s.walk + k * 1.6 + (side > 0 ? 0 : PI), lift = Math.max(0, Math.sin(ph)) * 3 * s.walk;
      const knee = [ax + 1.5 - k * .5, side * 9, z0 + 5 - d * 3], foot = [ax + 2.5 - k * 1.5 + Math.cos(ph) * 1.5 * s.walk, side * 15 * (1 + d * .4), lift];
      if (d > .6 && i % 3 === 0) continue;
      p.tube(ax, side * 3, z0, knee[0], knee[1], knee[2], .7, dk).tube(knee[0], knee[1], knee[2], foot[0], foot[1], foot[2], .55, c).ball(knee[0], knee[1], knee[2], .9, .9, .9, '#e0c070');
    }
  },
  hound(p, s) {
    const d = s.dead > 0 ? Math.min(1, s.dead * 1.4) : 0, run = s.walk, ph = s.t * 10 * (run || .2), leap = s.strike > 0 ? Math.sin(s.strike * PI) * 5 : 0, crouch = s.wind > 0 ? s.wind * 2 : 0;
    const c = '#c8b8b0', dk = '#9a8a82', z = 11 + leap - crouch - d * 8, roll = d * 1.2;
    p.ball(0, 0, z, 9, 4.2, 4.6, c).ball(-6, 0, z + .5, 4.4, 4, 4.4, dk);
    const hx = 9 + leap * .5, hz = z + 3 - crouch;
    p.ball(hx, 0, hz, 4, 3.2, 3.2, c).ball(hx + 4.4, 0, hz - 1.4, 3.6, 2, 1.8, '#d8c8c0');
    const jaw = s.wind > 0 ? s.wind : s.strike > 0 ? 1 - s.strike : .1;
    p.ball(hx + 4.2, 0, hz - 3 - jaw * 1.6, 3.2, 1.8, .9, '#a89890').box(hx + 6.4, 0, hz - 2.2 - jaw * .8, .8, 2.4, jaw * 1.6 + .3, '#3a1414');
    for (const sd of [-1, 1]) p.cone(hx - 1, sd * 2, hz + 2, hx - 2.4, sd * 2.6, hz + 5, 1, dk);
    for (const [lx, sd, off] of [[6, 1, 0], [6, -1, PI], [-6, 1, PI], [-6, -1, 0]]) {
      const sw = Math.sin(ph + off) * 3 * run, kz = z - 5;
      p.tube(lx, sd * 2.6, z - 2, lx + sw * .5, sd * 3 + roll * sd * 3, kz, 1.2, dk).tube(lx + sw * .5, sd * 3, kz, lx + sw, sd * 3 + roll * sd * 4, Math.max(0, Math.cos(ph + off) * 1.5 * run) + d * 2, 1, c);
    }
    p.tube(-10, 0, z + 1, -15, Math.sin(s.t * 4) * 2, z + 4 - d * 3, .8, dk);
  },
  gazer(p, s) {
    const d = s.dead > 0 ? Math.min(1, s.dead * 1.4) : 0, fly = (s.walk || 0) * (1 - d), z = 20 + Math.sin(s.t * 2.3) * 1.5 - d * 18 - fly * 1.5, glow = s.wind > 0 ? s.wind : 0;
    const X = -(s.strike > 0 ? Math.sin(s.strike * PI) * 3 : 0) + fly * 1.2;
    p.ball(X, 0, z, 4.4, 4.4, 4.4, '#e8a040').ball(X - 1.2, 0, z + 1.5, 2.4, 2.2, 2.2, '#f0c070');
    const blink = (Math.sin(s.t * 1.7) > .97) ? .2 : 1, lid = d > 0 ? .1 : blink;
    p.ball(X + 3.4, 0, z, 1.2, 2.6 * lid + .2, 2.6 * lid + .2, '#e8e0c8').ball(X + 4.2, 0, z, .8, 1.6 * lid, 1.6 * lid, '#3a8a6a').ball(X + 4.6, 0, z, .4, .8 * lid, .8 * lid, '#0a0a0a');
    p.box(X + 3.2, 0, z + 2.6 * lid + .6, 1.6, 4.2, .8, '#c8802a').box(X + 3.2, 0, z - 2.6 * lid - .6, 1.6, 4.2, .8, '#c8802a');
    for (let i = 0; i < 3; i++) { const a = PI * .7 + i * PI * .3; p.cone(X - 3 * Math.cos(a - PI), Math.sin(a) * 3, z, X - 7 - fly * 3.5, Math.sin(a) * (6 - fly * 2), z + Math.cos(a) * 3 + Math.sin(s.t * (6 + fly * 6) + i) * (1 + fly * .6) + fly * 1.5, 1.2, '#c8802a'); }
    if (glow > 0 || s.zap > 0) p.glow(X + 5.2, 0, z, .8 + glow * 1.2, '#bff4ff').halo(X + 5, 0, z, 6 + glow * 6, [.1, .3, .4]);
    if (s.strike > 0) p.glow(X + 5.4, 0, z, .6 + s.strike * 1.4, '#e8fcff');
  }
};
B.PEN_BODIES = PEN_BODIES;
/** the Bolt-Holder (drawn at the arena's centre cell, facing the party): its eye, its lids, its seven bolts in their cage,
 *  the lightning between their heads. st: { t, phase, locks out (0..6 bolts), iris (0..1 the gaze narrowing), tele, hurt,
 *  dead (seconds), relocked } */
function drawEye(p, st) {
  const t = st.t, d = st.dead || 0, bob = Math.sin(t * 1.3) * 3 * (d > 0 ? 0 : 1), z = 28 + bob - (d > 2 ? (d - 2) * 10 : 0);
  const crack = st.phase === 3 || d > 0, hurt = st.hurt > 0;
  // the cage: seven radial bolts round the eye; two slide out per Great Lock turned (the keystone, the seventh, never)
  for (let i = 0; i < 7; i++) {
    const a = -PI / 2 + i * PI * 2 / 7, out = i < 6 ? (i < st.out ? 1 : 0) : 0, fly = d > 1.2 ? (d - 1.2) * 40 : 0;
    const r0 = 15 + out * 9 + fly, r1 = r0 + 22, cy = Math.cos(a), cz = Math.sin(a);
    p.bar(0, cy * r0, z + cz * r0, 0, cy * r1, z + cz * r1, 2.5, 2.5, i === 6 ? '#5a5e6a' : '#6a6e7a');
    p.box(0, cy * r0, z + cz * r0, 5, 5, 3, '#8a8e9a');
    p.ball(0, cy * r1, z + cz * r1, 2.2, 2.2, 2.2, '#4a4e5a');
    if (!d && i < 6) { const b = (i + 1) % 7, a2 = -PI / 2 + b * PI * 2 / 7, rr = 15 + ((b < 6 && b < st.out) ? 9 : 0); if ((Math.floor(t * 12) + i) % 3 === 0) p.bar(0, cy * r0, z + cz * r0, 0, Math.cos(a2) * rr, z + Math.sin(a2) * rr, .6, .3, '#8af4ff'); }
  }
  if (d > 3.2) return;
  // the eye: sclera with red veins, an amber iris toward the party, a pupil that dilates
  const sc = hurt ? '#ffd8d0' : '#e8e0c8';
  p.ball(0, 0, z, 14, 14, 14, sc);
  for (let i = 0; i < 9; i++) { const a = i * .7 + 1; p.bar(6 + Math.cos(a) * 2, Math.cos(a) * 9, z + Math.sin(a) * 9, 10, Math.cos(a) * 4, z + Math.sin(a) * 4, .5, .3, '#c8402a'); }
  const narrow = 1 - (st.iris || 0) * .75, dil = st.tele && st.tele.k === 'lightning' ? 1.3 : 1;
  p.ball(11.6, 0, z, 3, 7 * narrow, 7, st.relocked ? '#e86a30' : '#e8a030').ball(13.6, 0, z, 1.6, 3.5 * dil * narrow, 3.5 * dil, '#0a0806');
  p.ball(14.2, -2, z + 2.4, .8, .8, .8, '#fff6e0');
  // the lids: they narrow for the gaze and blink
  const blink = (t % 5) > 4.85 ? 1 : 0, lid = Math.max(blink, (st.iris || 0) * .55, d > 0 ? Math.min(1, d) : 0);
  p.slab(2, -13, z + 14 - lid * 12, 2, 13, z + 14 - lid * 12, 1, 0, 0, 22, 3, '#8a7a6a').slab(2, -13, z - 14 + lid * 10, 2, 13, z - 14 + lid * 10, 1, 0, 0, 22, 3, '#8a7a6a');
  if (crack) { p.bar(13, -4, z + 8, 14.6, 1, z + 2, .5, .4, '#2a0a06').bar(14.6, 1, z + 2, 14, -2, z - 5, .5, .4, '#2a0a06'); if (d > 0) p.glow(12, 0, z, 4 + d * 4, '#fff6d8'); }
  if (st.tele && st.tele.k === 'lightning') p.glow(14, 0, z, 3 + Math.sin(t * 40) * 1, '#8af4ff');
  if (st.tele && st.tele.k === 'rain') p.glow(0, 0, z + 20, 2.5, '#ffb84a');
}
B.drawEye = drawEye;
