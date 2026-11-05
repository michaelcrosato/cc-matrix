/* 13-rigs: the rig factory (a cast member in a swimsuit with accessories), the accessory drawers (the engine's extras
 * hook: sunglasses, ribbons, flowers, necklaces, wristbands, chains, whistles, glasses) and portraits. Each match player,
 * NPC and preview owns its own rig: a rig keeps its animation state. */
const accDraw = {
  shades(g, P, c, kind) {
    if (!c.front) return;
    const { Sp, J, R, u } = c, L = Sp(J.head, R * .95, -R * .38, R * .02), Rr = Sp(J.head, R * .95, R * .38, R * .02);
    if (kind === 'heartshades') {
      for (const e of [L, Rr]) { px.disc(g, e[0], e[1], Math.max(1, u * .9), '#ff5fa2'); px.dot(g, e[0] - .6, e[1] - .6, '#ffd0e8'); }
      px.line(g, L[0], L[1], Rr[0], Rr[1], '#ff5fa2');
    } else if (kind === 'aviators') {
      px.line(g, L[0] - 1, L[1] - 1, Rr[0] + 1, Rr[1] - 1, '#ffd36a');
      for (const e of [L, Rr]) { px.disc(g, e[0], e[1], Math.max(1, u * .85), '#2a1e10'); px.dot(g, e[0] - .5, e[1] - .6, '#ffd36a'); }
    } else if (kind === 'glasses') {
      for (const e of [L, Rr]) { px.rect(g, e[0] - 1, e[1] - 1, 3, 1, '#2a2434'); px.rect(g, e[0] - 1, e[1] + 1, 3, 1, '#2a2434'); }
    } else {   // wraparound sport shades
      px.line(g, L[0] - 1.5, L[1], Rr[0] + 1.5, Rr[1], '#20262e', Math.max(2, Math.round(u * 1.1)));
      px.line(g, L[0] - 1.5, L[1] - 1, Rr[0] + 1.5, Rr[1] - 1, '#e8eef2');
      px.dot(g, L[0], L[1], '#5a8ac8');
    }
  },
  ribbon(g, P, c, col) { const t = E.tones(col); px.poly(g, [[P[0], P[1]], [P[0] - 3, P[1] - 2], [P[0] - 3, P[1] + 2]], t.base); px.poly(g, [[P[0], P[1]], [P[0] + 3, P[1] - 2], [P[0] + 3, P[1] + 2]], t.sh); px.rect(g, P[0] - 1, P[1] - 1, 2, 2, t.lt); },
  hibiscus(g, P) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; px.disc(g, P[0] + Math.cos(a) * 1.8, P[1] + Math.sin(a) * 1.8, 1.3, k % 2 ? '#e8283a' : '#ff5a5a'); } px.dot(g, P[0], P[1], '#ffd04a'); },
  necklace(g, P, c) { if (!c.front) return; for (let k = -2; k <= 2; k++) px.dot(g, P[0] + k * 1.5, P[1] + 1 - Math.abs(k) * .5, k % 2 ? '#f8f4e8' : '#e8d8c0'); },
  chain(g, P, c) { if (!c.front) return; for (let k = -3; k <= 3; k++) px.dot(g, P[0] + k * 1.2, P[1] + 2 - Math.abs(k) * .6, '#ffd36a'); px.rect(g, P[0] - 1, P[1] + 2, 2, 2, '#ffe9a0'); },
  whistle(g, P, c) { if (!c.front) return; px.line(g, P[0] - 2, P[1] - 1, P[0], P[1] + 3, '#e83a3a'); px.rect(g, P[0] - 1, P[1] + 3, 3, 2, '#c8ccd8'); },
  band(g, P, c, col) { px.disc(g, P[0], P[1], Math.max(1.2, c.u * .95), E.tones(col).base); px.dot(g, P[0] - .5, P[1] - .5, E.tones(col).lt); }
};
/** extras for a list of accessory ids (plus a character's own: Sonny's chain, Bo's whistle, Pepper's glasses) */
G.accExtras = (accs, accent, own = []) => {
  const X = [];
  for (const id of accs) {
    if (id === 'sportshades' || id === 'heartshades' || id === 'aviators') X.push({ at: 'face', draw: (g, P, c) => accDraw.shades(g, P, c, id) });
    else if (id === 'ribbon') X.push({ at: 'hair', draw: (g, P, c) => accDraw.ribbon(g, P, c, accent || '#d8303a') });
    else if (id === 'hibiscus') X.push({ at: 'hair', draw: (g, P) => accDraw.hibiscus(g, P) });
    else if (id === 'shellnecklace') X.push({ at: 'neck', draw: (g, P, c) => accDraw.necklace(g, P, c) });
    else if (id === 'wristbands') { X.push({ at: 'wristL', draw: (g, P, c) => accDraw.band(g, P, c, accent || '#ffffff') }); X.push({ at: 'wristR', draw: (g, P, c) => accDraw.band(g, P, c, accent || '#ffffff') }); }
  }
  for (const k of own) X.push(k === 'aviators' ? { at: 'face', draw: (g, P, c) => accDraw.shades(g, P, c, 'aviators') } : k === 'glasses' ? { at: 'face', draw: (g, P, c) => accDraw.shades(g, P, c, 'glasses') } : { at: 'neck', draw: (g, P, c) => accDraw[k](g, P, c) });
  return X;
};
/** the hat an accessory list asks for (sweatband, visor, sun hat), or the character's own */
const accHat = (accs, cast) => {
  if (accs.includes('sunhat')) return { style: 'sunhat', color: '#f0d890', band: '#ff5f7a' };
  if (accs.includes('visor')) return { style: 'visor', color: '#ffffff', brim: cast.color || '#3a6ad8' };
  if (accs.includes('sweatband')) return { style: 'band', color: '#ffffff' };
  if (cast.band) return { style: 'band', color: cast.band };
  return cast.hat || null;
};
/**
 * G.makeRig(id, { suit, acc, kit: 'final' | null, size }) -> an E.Humanoid dressed as that character.
 * Fighters wear a swimsuit (their signature one by default); Sonny wears his loud shirt (or his final kit), Pepper her
 * vest (or the Pinstripe racer), the staff their work clothes.
 */
G.makeRig = (id, o = {}) => {
  const c = G.CAST[id] || G.CAST.rin, accs = (o.acc || c.acc || []).slice();
  const base = { size: (o.size || c.size || 1.25), build: c.build || 'athletic', weapon: null, hair: c.hair || 'short', face: { eyes: 'big', bangs: c.bangs === undefined ? .5 : c.bangs },
    colors: { skin: c.skin, hair: c.hairColor, eye: c.eyes || '#1a1320', iris: c.iris || '#3a4a8a', boot: c.skin, glove: c.skin } };
  if (c.shoulders) base.shoulderHalf = 2.95 + c.shoulders;   // (the athletic build's, broadened)
  let own = [];
  const kit = o.kit === 'final' && c.finalKit ? c.finalKit : null;
  const suitId = o.suit || (c.host || c.staff ? null : c.suit);
  if (kit || suitId) {
    const S = kit ? { cut: kit.cut, pattern: kit.pattern, colors: kit.colors } : G.SUITS[suitId] || G.SUITS[c.suit];
    base.outfit = 'swim'; base.swim = { cut: S.cut, pattern: S.pattern, colors: S.colors, brief: !!S.brief };
    base.sleeves = S.cut === 'rash' ? (S.sleeves || 'short') : 'none';
    base.colors.cloth = S.colors.main; base.colors.trim = S.colors.trim; base.colors.pants = S.colors.main;
    if (S.cut === 'rash' && id === 'sonny') { base.shorts = .5; base.colors.pants = '#16141c'; }
  } else if (c.outfit) {
    const f = c.outfit;
    base.outfit = c.robe ? 'robe' : 'shirt'; base.sleeves = id === 'bo' ? 'none' : 'short';
    if (id === 'sonny' || id === 'kai') { base.pattern = id === 'sonny' ? 'palms' : (c.pat || 'floral'); base.shorts = .55; }
    if (id === 'bo') base.shorts = .5;
    Object.assign(base.colors, { cloth: f.cloth, trim: f.trim, pants: f.pants, boot: f.boot, pattern: f.pattern, belt: f.trim, strap: f.strap });
  }
  if (id === 'sonny') own = ['aviators', 'chain']; else if (id === 'pepper') own = ['glasses']; else if (id === 'bo') own = ['whistle'];
  if (accs.some(a => G.ACCS[a] && G.ACCS[a].shades)) own = own.filter(k => k !== 'aviators' && k !== 'glasses');
  base.hat = accHat(accs, c);
  if (c.staff || c.host) base.colors.strap = base.colors.strap || '#8a5a32'; else base.colors.strap = o.sandals ? '#e8c060' : null;
  const rig = new E.Humanoid(base);
  rig.extras = G.accExtras(accs, c.accColor || (base.swim && base.swim.colors.accent), own);
  rig.castId = id; rig.suitId = suitId; rig.accs = accs; rig.kit = kit ? 'final' : null;
  return rig;
};
/** dress an existing rig again (try-on, a gift accepted): a new rig in the same place, keeping its position */
G.redress = (rig, id, o) => { const n = G.makeRig(id, o); n.x = rig.x; n.y = rig.y; n.z = rig.z; n.facing = rig.facing; return n; };
/** a portrait with a soft background in the character's color */
G.portrait = (g, rig, x, y, size = 40, o = {}) => {
  const c = G.CAST[rig.castId] || {};
  rig.drawPortrait(g, x, y, size, Object.assign({ zoom: size / 13, turn: .45, bg: o.bg || E.shade(c.color || '#2a6a7a', -.45), border: o.border || '#f6d38a' }, o));
};
/** shared portrait rigs for dialogs and menus (one per character, in their current outfit) */
G.portraitRigs = {};
G.portraitRig = (id) => {
  const want = G.wearOf ? G.wearOf(id) : null, key = id + JSON.stringify(want || {});
  let r = G.portraitRigs[id];
  if (!r || r._key !== key) { r = G.portraitRigs[id] = G.makeRig(id, want || {}); r._key = key; r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); }
  return r;
};
