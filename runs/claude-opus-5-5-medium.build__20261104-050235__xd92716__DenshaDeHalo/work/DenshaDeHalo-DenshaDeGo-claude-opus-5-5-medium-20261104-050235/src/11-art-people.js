/* DENSHA DE HALO! · people: the story's characters (Humanoid rigs for portraits and figures, a Blob for Haro-kun),
 * the platform crowds, staff and track workers, and the things that draw them in the rail view. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px;
const A = DH.ART;

/* ---------- the cast ---------- */
const CAST = DH.CAST = {
  hoshino: { name: 'HOSHINO', color: '#ffd36a', voice: 'hoshino', rig: () => new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, colors: { skin: '#e8b890', hair: '#b8b8c0', cloth: '#1a2a4a', coat: '#1e3058', pants: '#1a2440', boot: '#141418', glove: '#f4f4f4', trim: '#f2c230', belt: '#101420' } }) },
  mika: { name: 'MIKA', color: '#7ad0ff', voice: 'mika', rig: () => new E.Humanoid({ size: 1.1, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'ponytail', hat: { style: 'cap', color: '#1a2a4a' }, face: { eyes: 'big' }, colors: { skin: '#f0c8a0', hair: '#3a2418', cloth: '#22345e', coat: '#22345e', pants: '#1a2440', boot: '#141418', glove: '#f4f4f4', trim: '#f2c230' } }) },
  ota: { name: 'OTA', color: '#ff9a7a', voice: 'ota', rig: () => new E.Humanoid({ size: 1.15, build: 'bulky', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'bald', hat: { style: 'cap', color: '#c02a2a' }, colors: { skin: '#e0b088', cloth: '#5a5a62', coat: '#5a5a62', pants: '#3a3a42', glove: '#f4f4f4', trim: '#c02a2a' } }) },
  kota: { name: 'KOTA', color: '#ffe04a', voice: 'kota', rig: () => new E.Humanoid({ size: .8, weapon: null, outfit: 'shirt', sleeves: 'short', hair: 'short', hat: { style: 'cap', color: '#f0c820' }, face: { eyes: 'big' }, colors: { skin: '#f0c8a0', hair: '#2a1a10', cloth: '#3a8ad0', pants: '#4a4a5a', boot: '#d04030' } }) },
  fuji: { name: 'GRANDMA FUJI', color: '#e8a0d0', voice: 'fuji', rig: () => new E.Humanoid({ size: 1.0, weapon: null, outfit: 'robe', sleeves: 'long', hair: 'long', hunch: .5, colors: { skin: '#e8c0a0', hair: '#d8d8d8', cloth: '#8a3a6a', pants: '#8a3a6a', trim: '#f0c860', belt: '#f0c860' } }) },
  kenji: { name: 'KENJI', color: '#a0e8a0', voice: 'kenji', rig: () => new E.Humanoid({ size: 1.15, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', colors: { skin: '#e8c098', hair: '#1a1a1a', cloth: '#f0f0f0', coat: '#3a3a48', pants: '#2a2a34', trim: '#c02a3a', boot: '#1a1a1a' } }) },
  ren: { name: 'REN', color: '#c08aff', voice: 'ren', rig: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'spiky', hat: { style: 'cap', color: '#4a1a8a' }, colors: { skin: '#e0b088', hair: '#202020', cloth: '#4a1a8a', coat: '#5a2a9a', pants: '#2a1a4a', glove: '#f4f4f4', trim: '#d8d8e8', eye: '#101010', iris: '#101010' } }) },
  sato: { name: 'SATO', color: '#c8c8ff', voice: 'sato', rig: () => new E.Humanoid({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hunch: .3, hat: { style: 'cap', color: '#1a2a4a' }, colors: { skin: '#e0b088', hair: '#e8e8e8', cloth: '#1a2a4a', coat: '#1e3058', pants: '#1a2440', glove: '#f4f4f4', trim: '#f2c230' } }) },
  pa: { name: 'ANNOUNCER', color: '#b8c8e8', voice: 'pa', rig: null },
  dispatch: { name: 'DISPATCH', color: '#9ae0c0', voice: 'pa', rig: null },
  driver: { name: 'YOU', color: '#ffffff', voice: 'driver', rig: null },
  haro: { name: 'HARO-KUN', color: '#fff4c8', voice: 'haro', rig: null }
};
const RIGS = {};
DH.castRig = id => { const c = CAST[id]; if (!c || !c.rig) return null; return RIGS[id] || (RIGS[id] = c.rig()); };

/* ---------- Haro-kun: the mascot, a winged white blob with a gold halo and headlight eyes ---------- */
DH.haro = new E.Blob({ R: 7, colors: { dk: '#c8c0a8', base: '#fff8ec', lt: '#ffffff', spec: '#ffffff', eye: '#202030', pupil: '#ffe890' }, wings: true, feet: true, mouth: true });
const HV = new E.View('haro', 'Haro', 0, 10, 2, 1);
DH.haroView = sc => { HV._s = sc; return sc === 2 ? HV : (DH._hv || (DH._hv = new Map())).get(sc) || (DH._hv.set(sc, new E.View('haro', 'Haro', 0, 10, sc, 1)), DH._hv.get(sc)); };
DH.drawHaro = (g, x, y, scale = 2, t = 0, o = {}) => {
  const bob = Math.sin(t * 4) * 2 * (o.still ? 0 : 1), hop = o.hop || 0;
  DH.haro.update(1 / 60, { squash: Math.sin(t * 8) * .12 * (o.still ? 0 : 1) + (hop > 0 ? -.3 : 0), flap: o.flap === undefined ? .6 : o.flap, look: [0, 0] });
  const yy = Math.round(y + bob - hop * 10);
  DH.haro.draw(g, Math.round(x), yy, DH.haroView(scale));
  // the halo ring, spinning and glowing
  const r = 6 * scale, hy = yy - 17 * scale, sp = t * 3;
  px.blend(g, .4, 'add', () => px.ell(g, x, hy, r + 2, r * .35 + 1, '#ffe27a'));
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2 + sp, cx = x + Math.cos(a) * r, cy = hy + Math.sin(a) * r * .3; px.rect(g, Math.round(cx), Math.round(cy), Math.max(1, scale - 1) || 1, Math.max(1, scale - 1) || 1, Math.sin(a) > 0 ? '#ffe27a' : '#c89a20'); }
};
DH.haroPortrait = (g, x, y, size) => { px.rect(g, x, y, size, size, '#2a3a6a'); DH.drawHaro(g, x + size / 2, y + size * .95, size / 22, DH.game ? DH.game.real : 0, { flap: .4 }); };

/* ---------- crowds: seeded looks per zone and time ---------- */
const SKIN = ['#f0c8a0', '#e8b890', '#d8a878', '#c89870', '#f4d0b0'], HAIR = ['#1a1a1a', '#2a1a10', '#3a2418', '#5a3a20', '#8a8a8a', '#d8d8d8', '#6a3a1a'];
const LOOKS = {
  commuter: rr => ({ outfit: 'coat', sleeves: 'long', hair: rr() < .5 ? 'short' : 'ponytail', colors: { cloth: '#f0f0f0', coat: ['#2a2a34', '#3a3a48', '#4a4038', '#1e2838'][Math.floor(rr() * 4)], pants: '#2a2a34', boot: '#1a1a1a' }, bag: 'briefcase' }),
  student: rr => ({ outfit: 'shirt', sleeves: rr() < .5 ? 'short' : 'long', hair: rr() < .5 ? 'short' : 'long', colors: { cloth: rr() < .5 ? '#f4f4f4' : '#1a2440', pants: ['#1a2440', '#3a2a5a', '#2a3a2a'][Math.floor(rr() * 3)], trim: '#c02a3a' }, bag: 'pack' }),
  elder: rr => ({ outfit: 'robe', sleeves: 'long', hair: 'short', hunch: .4, colors: { cloth: ['#6a5a4a', '#5a6a5a', '#7a6a7a'][Math.floor(rr() * 3)], hair: '#d8d8d8' } }),
  kid: rr => ({ size: .78, outfit: 'shirt', sleeves: 'short', hair: 'short', hat: rr() < .5 ? { style: 'cap', color: ['#f0c820', '#e04a3a', '#3a8ad0'][Math.floor(rr() * 3)] } : undefined, colors: { cloth: ['#e04a3a', '#3aa0e0', '#f0c820', '#4ac060'][Math.floor(rr() * 4)], pants: '#3a3a4a' }, kid: true }),
  festival: rr => ({ outfit: 'robe', sleeves: 'long', hair: rr() < .5 ? 'ponytail' : 'short', colors: { cloth: ['#e04a7a', '#3a6ac8', '#f0a030', '#8a3ac8', '#e8e8f0'][Math.floor(rr() * 5)], trim: '#f0e0a0', belt: ['#f0c040', '#c02a3a'][Math.floor(rr() * 2)] } }),
  tourist: rr => ({ outfit: 'shirt', sleeves: 'short', hair: 'short', hat: { style: 'cap', color: '#f0f0f0' }, colors: { cloth: ['#f0a040', '#40c0a0', '#e06080'][Math.floor(rr() * 3)], pants: '#c8b890' }, bag: 'pack' })
};
DH.makePerson = (rr, mix, rain) => {
  const kinds = Object.keys(mix), tot = kinds.reduce((a, k) => a + mix[k], 0);
  let u = rr() * tot, kind = kinds[0]; for (const k of kinds) { u -= mix[k]; if (u <= 0) { kind = k; break; } }
  const L = LOOKS[kind](rr), colors = Object.assign({ skin: SKIN[Math.floor(rr() * SKIN.length)], hair: HAIR[Math.floor(rr() * HAIR.length)] }, L.colors);
  const rig = new E.Humanoid({ size: L.size || (.95 + rr() * .15), weapon: null, outfit: L.outfit, sleeves: L.sleeves, hair: L.hair, hat: L.hat, hunch: L.hunch || 0, colors });
  return { rig, kind, kid: !!L.kid, bag: L.bag, umbrella: rain ? ['#e04a5a', '#3a7ad0', '#f0c030', '#2a2a30', '#e8e8f0'][Math.floor(rr() * 5)] : null, seed: Math.floor(rr() * 1000), col: colors.coat || colors.cloth };
};
DH.makeStaff = () => new E.Humanoid({ size: 1.1, weapon: null, outfit: 'coat', sleeves: 'long', hair: 'short', hat: { style: 'cap', color: '#1a2a4a' }, colors: { skin: '#e8c098', hair: '#1a1a1a', cloth: '#1a2a4a', coat: '#1e3058', pants: '#1a2440', glove: '#f4f4f4', trim: '#f2c230' } });
DH.makeWorker = lookout => new E.Humanoid({ size: 1.1, weapon: null, outfit: 'shirt', sleeves: 'long', hair: 'short', hat: { style: 'helmet', color: lookout ? '#f4f4f4' : '#f0c820' }, colors: { skin: '#d8a878', cloth: '#f07a20', pants: '#3a4a6a', boot: '#2a2a2a', trim: '#e8f040' } });

/** a person in the rail view: { s, x, y, p: person or { rig }, facing (world angle: 0 faces +x, the track to its right),
 *  pose, vx, vy, hidden }; full rigs within 60 m, a 2-tone figure beyond */
DH.personThing = (o) => Object.assign({ y: 1.1, facing: 0, pose: null, far: false, draw(g, sx, sy, k, C, th) {
  if (th.hidden || k < .35) return;
  const P = th.p, rig = P.rig;
  const mirror = C.dir < 0, f = mirror ? th.facing + Math.PI : th.facing;
  if (C.d > 60 || k < 4) {   // the far figure: a coat, a head
    const h = (P.kid ? 1.2 : 1.65) * k, w = Math.max(1, .45 * k), col = C.tint(P.col || '#3a3a48', C.d);
    px.rect(g, Math.round(sx - w / 2), Math.round(sy - h * .82), Math.round(w) || 1, Math.max(1, Math.round(h * .82)), col);
    px.rect(g, Math.round(sx - w * .35), Math.round(sy - h), Math.max(1, Math.round(w * .7)), Math.max(1, Math.round(h * .2)), C.tint('#e0b890', C.d));
    if (P.umbrella && k > 1) px.ell(g, sx, sy - h * 1.05, w * 1.6, Math.max(1, w * .5), C.tint(P.umbrella, C.d));
    return;
  }
  const v = C.rail.view(k, 0, 6);
  rig.draw(g, Math.round(sx), Math.round(sy), v);
  // what they carry, at the hand
  if (P.umbrella) { const hx = sx + Math.cos(f) * .3 * k; px.line(g, hx, sy - 1.2 * k, hx, sy - 2.1 * k, '#303030'); px.ell(g, hx, sy - 2.1 * k, .75 * k, .28 * k, C.tint(P.umbrella, C.d)); px.ell(g, hx, sy - 2.2 * k, .55 * k, .15 * k, C.tint(E.shade(P.umbrella, .25), C.d)); }
  else if (P.bag === 'briefcase' && k > 8) { px.rect(g, Math.round(sx + .25 * k), Math.round(sy - .75 * k), Math.max(1, Math.round(.35 * k)), Math.max(1, Math.round(.25 * k)), C.tint('#3a2418', C.d)); }
  if (th.flag && k > 4) { const hx = sx + .45 * k * (mirror ? -1 : 1), hy = sy - 2.15 * k; px.line(g, hx, hy, hx, hy - .5 * k, '#f0f0f0'); px.rect(g, Math.round(hx), Math.round(hy - .5 * k), Math.max(1, Math.round(.4 * k)), Math.max(1, Math.round(.28 * k)), th.flag); }
} }, o);
/** update a person's rig each step (the crowd system calls it with its state) */
DH.stepPerson = (th, dt, mirrorDir) => {
  const v = Math.hypot(th.vx || 0, th.vy || 0);
  th.p.rig.update(dt, { x: 0, y: 0, z: 0, vx: (th.vx || 0) * 15, vy: (th.vy || 0) * 15, facing: th.facing, pose: th.pose || null, run: v > 2.5 ? 1 : 0 });
};
})();
