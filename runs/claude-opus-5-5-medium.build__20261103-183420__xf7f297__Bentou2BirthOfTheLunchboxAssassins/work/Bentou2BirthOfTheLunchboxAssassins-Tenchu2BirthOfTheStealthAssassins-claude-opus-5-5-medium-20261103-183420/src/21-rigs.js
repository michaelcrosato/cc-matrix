/* 21-rigs: the cast as Humanoid rigs (with the patched masks, hats and weapons), faction colors, and the Hound, a
 * quadruped of its own drawn through the view's projection. */
const HU = o => new E.Humanoid(o);
B.FACTION = { kanemori: '#8a6a2a', redlantern: '#8a2a2a', kokaku: '#2a3a6a', trial: '#3a5a3a' };
B.RIGS = {
  sojiro: () => HU({ size: 1.25, build: 'heroic', hood: true, mask: { color: '#232a44' }, outfit: 'coat', sleeves: 'long', weapon: 'sword', bladeLen: 8, cape: { len: 4, width: 3, seg: 2 },
    colors: { hair: '#232a44', cloth: '#2a3050', coat: '#2a3050', pants: '#1e2236', belt: '#b0302a', boot: '#2a2a2e', glove: '#2a2a2e', cape: '#b0302a', capeIn: '#6a1a18', metal: '#d8dce8', trim: '#b0302a' } }),
  kaede: () => HU({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#2a1a2a' }, outfit: 'tunic', sleeves: 'long', weapon: 'sword', bladeLen: 5.5, offhand: { len: 5.5 }, cape: { len: 3, width: 2, seg: 2 },
    colors: { hair: '#18141c', cloth: '#4a2a44', pants: '#2a1a28', belt: '#2a8a8a', boot: '#1e1a1e', glove: '#2a1e2a', cape: '#2a8a8a', capeIn: '#1a5a5a', metal: '#e0e4ec', trim: '#2a8a8a' } }),
  granny: () => HU({ size: 1.0, build: 'chibi', hunch: .35, outfit: 'robe', hair: 'ponytail', weapon: 'staff', colors: { hair: '#b8b0a8', cloth: '#5a4030', pants: '#4a3426', trim: '#e8dcc0', staff: '#c8a878', orb: '#e8dcc0', skin: '#e0c0a0' } }),
  takanori: () => HU({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'ponytail', weapon: null, colors: { hair: '#1a1418', cloth: '#2a3a6a', pants: '#1e2a4a', trim: '#e8b04a', belt: '#e8b04a' } }),
  kurogane: () => HU({ size: 1.8, build: 'bulky', armor: true, hat: { style: 'kabuto', color: '#2a2a30', crest: '#c8a040' }, weapon: 'sword', bladeLen: 14, colors: { cloth: '#2a2a30', pants: '#1e1e24', plate: '#2a2a30', belt: '#8a1c1c', trim: '#8a1c1c', metal: '#d8dce8' } }),
  kuroganeRobe: () => HU({ size: 1.3, build: 'bulky', outfit: 'robe', hair: 'short', weapon: null, colors: { hair: '#3a3a40', cloth: '#5a5a62', pants: '#4a4a52', trim: '#2a2a30' } }),
  kuroganeOni: () => HU({ size: 2.1, build: 'bulky', armor: true, mask: { style: 'oni', color: '#b0201a' }, eyeGlow: '#ff5a2a', weapon: 'sword', bladeLen: 15, hair: 'spiky', colors: { hair: '#1a1418', cloth: '#2a1a1a', pants: '#1e1214', plate: '#3a1a1a', belt: '#d8402a', metal: '#ff9a6a' } }),
  kanemori: () => HU({ size: 1.25, build: 'bulky', outfit: 'robe', hat: { style: 'band', color: '#2a1a10' }, weapon: null, colors: { cloth: '#6a4a2a', pants: '#4a3420', trim: '#e8b04a', belt: '#e8b04a' } }),
  gonroku: () => HU({ size: 1.9, build: 'bulky', hair: 'spiky', sleeves: 'none', weapon: 'club', bladeLen: 13, colors: { hair: '#2a1a10', cloth: '#6a4a2a', pants: '#4a3420', belt: '#2a1a10', metal: '#3a3a40', skin: '#c89070' } }),
  hotaru: () => HU({ size: 1.2, build: 'heroic', hair: 'ponytail', mask: { color: '#1a1018' }, weapon: 'sword', bladeLen: 5, offhand: { len: 5 }, outfit: 'tunic', sleeves: 'long', cape: { len: 4, width: 2.5, seg: 2 },
    colors: { hair: '#2a0a10', cloth: '#8a1a2a', pants: '#3a0a14', belt: '#1a1018', cape: '#1a1018', capeIn: '#8a1a2a', metal: '#e8c8c8', trim: '#ff6a4a' } }),
  tobei: () => HU({ size: 1.1, outfit: 'tunic', hat: { style: 'band', color: '#3a6a3a' }, weapon: null, cape: { len: 3, width: 4, seg: 1.6 }, colors: { cloth: '#6a5a3a', pants: '#3a4a2a', cape: '#3a6a3a', capeIn: '#2a4a2a' } }),
  ittetsu: () => HU({ size: 1.4, build: 'bulky', hair: 'bald', outfit: 'robe', weapon: 'sword', bladeLen: 10, colors: { cloth: '#6a5a4a', pants: '#4a3a2a', metal: '#8a6a4a', hilt: '#5a3a2a' } }),
  disciple: c => HU({ size: 1.15, build: 'heroic', hood: true, mask: { color: '#1a1a20' }, outfit: 'tunic', weapon: null, colors: { hair: c, cloth: c, pants: '#2a2a30' } }),
  ashigaru: f => HU({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#2a2a2e' }, armor: true, weapon: 'spear', colors: { cloth: B.FACTION[f] || '#8a6a2a', pants: '#3a3028', plate: '#4a4a50', metal: '#c8ccd4' } }),
  samurai: f => HU({ size: 1.25, build: 'heroic', hat: { style: 'kabuto', color: '#2a2a32' }, armor: true, sashimono: B.FACTION[f] || '#8a6a2a', weapon: 'sword', bladeLen: 10, colors: { cloth: B.FACTION[f] || '#8a6a2a', pants: '#2a2a30', plate: '#3a3a44', metal: '#dce0e8' } }),
  archer: f => HU({ size: 1.15, build: 'heroic', hat: { style: 'jingasa', color: '#2a2a2e' }, armor: true, weapon: 'bow', colors: { cloth: B.FACTION[f] || '#8a6a2a', pants: '#3a3028', plate: '#4a4a50' } }),
  ninja: () => HU({ size: 1.2, build: 'heroic', hood: true, mask: { color: '#1a1418' }, outfit: 'tunic', sleeves: 'long', weapon: 'sword', bladeLen: 6, colors: { hair: '#6a1a1a', cloth: '#1a1418', pants: '#1a1418', belt: '#c8302a', boot: '#1a1418', glove: '#1a1418', metal: '#c8ccd4' } }),
  civilian: kind => {
    const C = { merchant: { cloth: '#5a6a4a', hat: { style: 'band', color: '#3a2a1a' } }, maid: { cloth: '#c85a7a', hair: 'ponytail' }, monk: { cloth: '#d8902a', hair: 'bald' }, drunk: { cloth: '#7a5a4a', skin: '#e8a090' },
      noble: { cloth: '#6a2a8a', hair: 'ponytail' }, servant: { cloth: '#6a6a6a' }, clerk: { cloth: '#4a5a6a', hat: { style: 'band', color: '#2a2a2a' } } }[kind] || { cloth: '#6a6a6a' };
    return HU({ size: 1.1, outfit: 'robe', weapon: null, hair: C.hair || 'short', hat: C.hat || null, colors: { cloth: C.cloth, pants: E.shade(C.cloth, -.3), skin: C.skin || '#e8c09a', hair: '#1a1418', trim: '#e8dcc0' } });
  },
  ghost: color => HU({ size: 1.2, build: 'heroic', hood: true, mask: { color: '#101018' }, outfit: 'tunic', weapon: 'sword', bladeLen: 6, cape: { len: 4, width: 2.5, seg: 2 }, colors: { hair: '#101018', cloth: '#181820', pants: '#101018', cape: color, capeIn: E.shade(color, -.4), belt: color } })
};

/* ---- the Hound: an Akita on four two-segment legs, a curled tail, states walk, run, sniff, bark, eat, down ---- */
class Hound {
  constructor() { this.t = crand() * 10; this.phase = 0; this.facing = 0; this.x = this.y = this.z = 0; this.speed = 0; this.head = 0; this.mouth = 0; this.down = 0; this.hurtW = 0; }
  update(dt, s) {
    this.t += dt; Object.assign(this, { x: s.x, y: s.y, z: s.z || 0, facing: s.facing });
    const sp = Math.hypot(s.vx || 0, s.vy || 0); this.speed = sp; this.phase += dt * (sp > 70 ? 13 : 8) * Math.min(1, sp / 30 + .05);
    this.head = approach(this.head, s.sniff || s.eat ? -1 : s.bark ? .6 : 0, dt * 5); this.mouth = s.bark ? (Math.sin(this.t * 22) > 0 ? 1 : 0) : s.eat ? (Math.sin(this.t * 10) > 0 ? .6 : 0) : 0;
    this.down = approach(this.down, s.down ? 1 : 0, dt * 3); this.hurtW = approach(this.hurtW, s.hurt ? 1 : 0, dt * 8);
  }
  draw(g, ox, oy, view) {
    const ca = Math.cos(this.facing), sa = Math.sin(this.facing), k = 1.15, sc = view.scale || 1;
    const P = (f, r, z) => { const wx = (f * ca - r * sa) * k, wy = (f * sa + r * ca) * k, q = view.p(wx, wy, z * k); return [ox + q[0], oy + q[1], (view.dx || 0) * wx + (view.dy || 0) * wy + (view.dz || 0) * z * k]; };
    const dn = this.down, run = this.speed > 70, sw = Math.sin(this.phase), lift = dn * 0;
    const bodyZ = 11 - dn * 7, tan = '#c88a4a', cream = '#f0e0c0', dark = '#7a4a2a', T = E.tones(tan);
    const parts = [];
    const leg = (f, r, ph) => { const s = Math.sin(this.phase + ph) * (run ? 4 : 2.5) * (1 - dn); const hip = P(f, r, bodyZ - 1), knee = P(f + s * .5, r, bodyZ - 6), foot = P(f + s, r, dn ? bodyZ - 3 : Math.max(0, (Math.cos(this.phase + ph) > 0 ? 1.2 : 0))); parts.push({ d: hip[2] - .2, f: () => { px.line(g, hip[0], hip[1], knee[0], knee[1], r < 0 ? E.shade(tan, -.25) : tan, Math.max(1, Math.round(sc * 1.3))); px.line(g, knee[0], knee[1], foot[0], foot[1], cream, Math.max(1, Math.round(sc))); } }); };
    leg(6, -2.2, 0); leg(6, 2.2, Math.PI); leg(-6, -2.2, Math.PI); leg(-6, 2.2, 0);
    const b0 = P(-7, 0, bodyZ + sw * .3), b1 = P(7, 0, bodyZ + 1 + sw * .3), chest = P(6, 0, bodyZ - 1), neck = P(9, 0, bodyZ + 3 + this.head * 2), hd = P(11.5, 0, bodyZ + 5 + this.head * 5), snout = P(15, 0, bodyZ + 3.5 + this.head * 5.5);
    parts.push({ d: (b0[2] + b1[2]) / 2, f: () => {
      const w = Math.max(2, Math.round(sc * 4.2)); px.line(g, b0[0], b0[1], b1[0], b1[1], T.sh, w + 1); px.line(g, b0[0], b0[1] - 1, b1[0], b1[1] - 1, T.base, w - 1); px.line(g, chest[0], chest[1] + 1, b1[0], b1[1] + 1, cream, Math.max(1, w - 2));
      const tl = P(-8, 0, bodyZ + 3), tt = P(-6, 0, bodyZ + 7); px.disc(g, tl[0], tl[1], Math.max(1, sc * 1.6), cream); px.disc(g, tt[0], tt[1], Math.max(1, sc * 1.8), T.base);
    } });
    parts.push({ d: hd[2] + .1, f: () => {
      px.line(g, neck[0], neck[1], hd[0], hd[1], T.base, Math.max(2, Math.round(sc * 3))); px.disc(g, hd[0], hd[1], Math.max(1.5, sc * 3), T.base); px.line(g, hd[0], hd[1], snout[0], snout[1], cream, Math.max(1, Math.round(sc * 2)));
      for (const s of [-1, 1]) { const e1 = P(11, s * 1.6, bodyZ + 9 + this.head * 5); px.line(g, e1[0], e1[1], e1[0], e1[1] - Math.max(1, sc * 1.5), dark, Math.max(1, Math.round(sc))); }
      const eye = P(13, 1.2, bodyZ + 6.2 + this.head * 5); px.dot(g, eye[0], eye[1], '#1a1010'); px.dot(g, snout[0], snout[1], '#1a1010');
      if (this.mouth > .5) { const m = P(14.5, 0, bodyZ + 2.2 + this.head * 5.5); px.dot(g, m[0], m[1], '#8a2a2a'); }
    } });
    parts.sort((a, b) => a.d - b.d); for (const p of parts) p.f(); void lift;
  }
}
B.Hound = Hound;
