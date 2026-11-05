/* 13-rigs: the rig factory. A fighter is an E.Humanoid built from the cast data, dressed in her suit (main color on the
 * top, accent on the shorts, trim on the lines) with her accessories. Actions map to rig poses and attack moves. */
G.HAIR = { curly: 'spiky', braid: 'long', puff: 'spiky', twinbuns: 'ponytail', bob: 'short', bun: 'ponytail', long: 'long', spiky: 'spiky', short: 'short', bald: 'bald', ponytail: 'ponytail' };
G.rigFor = function (id, o) {
  o = o || {};
  const c = G.CAST[id] || G.STAFF[id];
  const suit = o.suit && G.SUITS[o.suit] ? G.SUITS[o.suit] : null;
  const acc = o.acc || [];
  const colors = { skin: c.skin, hair: c.hairColor, eye: c.eyes || '#2a2020' };
  if (suit) { colors.cloth = suit.colors[0]; colors.pants = suit.colors[1]; colors.trim = suit.colors[2]; }
  else if (c.cloth) { colors.cloth = c.cloth; colors.pants = c.pants; colors.trim = c.trim; }
  colors.boot = c.skin;
  const opts = { size: c.size || 1.25, build: c.build || 'heroic', hair: G.HAIR[c.hair] || 'short', weapon: null, outfit: suit ? 'swim' : 'shirt', sleeves: 'none', swim: suit ? { cut: suit.cut, pattern: suit.pattern, colors: { main: suit.colors[0], accent: suit.colors[1], trim: suit.colors[2] } } : undefined,
    face: { eyes: 'big', bangs: .5 }, colors };
  if (acc.includes('visor')) opts.hat = { style: 'band', color: '#ffffff' };
  if (acc.includes('sweatband')) opts.hat = { style: 'band', color: '#e8c060' };
  if (o.hat) opts.hat = o.hat;
  const rig = G.ikRig(G.mocapRig(new E.Humanoid(opts)));
  rig.gid = id; rig.suitId = o.suit || null; rig.accs = acc.slice();
  rig.hairExtra = ['twinbuns', 'puff', 'bun', 'braid', 'bob', 'curly'].includes(c.hair) ? c.hair : null;
  rig.hatExtra = acc.includes('sunhat') ? 'sunhat' : acc.includes('visor') ? 'visor' : null;
  return rig;
};
/* the accessory overlay drawn over the head after the rig (sunglasses, ribbons, flowers, necklaces, wristbands) */
G.drawAccessories = function (g, rig, ox, oy, scale) {
  const s = (scale || 1) * (rig.lastScale || 1);
  const hx = Math.round(ox), hy = Math.round(oy - 34 * s);
  const acc = rig.accs || [];
  if (acc.includes('sportshades') || acc.includes('heartshades') || acc.includes('aviators')) {
    const col = acc.includes('heartshades') ? '#ff5fa2' : acc.includes('aviators') ? '#ffd36a' : '#20262e';
    E.px.rect(g, hx - 5, hy + 2, 4, 3, col); E.px.rect(g, hx + 1, hy + 2, 4, 3, col); E.px.rect(g, hx - 1, hy + 2, 2, 1, col);
  }
  if (acc.includes('ribbon')) E.px.rect(g, hx + 5, hy - 3, 3, 3, '#e8283a');
  if (acc.includes('hibiscus')) E.px.rect(g, hx - 6, hy - 1, 3, 3, '#ff3b5c');
  if (acc.includes('shellnecklace')) for (let k = 0; k < 3; k++) E.px.rect(g, hx - 3 + k * 3, hy + 9, 2, 2, '#fff8e8');
};
/* a move's attack state, by phase and progress (0..1) */
G.moveState = function (name, u) { try { return E.move(name, G.clamp(u, 0, 1)); } catch (e) { return null; } };
/* the pose and attack for a player's current action */
G.rigStateFor = function (p, extra) {
  const s = { x: p.x, y: p.y, z: p.z + (p.jumpY || 0), vx: p.vx, vy: p.vy, facing: p.facing };
  const a = p.act, t = p.actT || 0;
  if (a === 'spike' && t < .5) s.attack = G.moveState('overhead', t / .5);
  else if (a === 'serve' && t < .45) s.attack = G.moveState('overhead', t / .45);
  else if (a === 'jumpserve' && t < .5) s.attack = G.moveState('overhead', t / .5);
  else if (a === 'bump' && t < .3) s.pose = 'guard';
  else if (a === 'set' && t < .3) s.pose = 'cast';
  else if (a === 'block' && t < .5) s.pose = 'cheer';
  else if (a === 'toss' && t < .5) s.pose = 'cheer';
  else if (a === 'dive') s.down = Math.min(1, Math.max(0, (p.diveT - .22) / .3));
  else if (a === 'celebrate') s.pose = 'cheer';
  else if (a === 'sad') s.pose = 'kneel';
  else if (a === 'ready' && p.pendingNow) s.pose = 'crouch';
  if (p.down && !s.pose) s.pose = 'down';
  if (extra) Object.assign(s, extra);
  return s;
};
