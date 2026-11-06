// Hospital props as data (docs/ASSETS.md), the store's few generic pieces, and the rigs: dressed for a hospital, with new poses (section 17).
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E;
if (window.ASSETS && window.ASSETS['tb-props']) E.addAssets(window.ASSETS['tb-props']);
E.MATERIALS.scrubsteel = { color: '#aebcc8', pattern: 'metal' };
E.MATERIALS.sheet = { color: '#e8ece6', pattern: 'cloth', fold: .6 };
E.MATERIALS.blanket = { color: '#6a9ab0', pattern: 'cloth', fold: .9 };
E.MATERIALS.curtain = { color: '#7fa8a0', pattern: 'cloth', fold: 1.4 };
E.MATERIALS.screen = { color: '#0a2428', glow: 1 };
E.MATERIALS.trace = { color: '#6cf0a0', glow: 1 };
E.MATERIALS.film = { color: '#d8f0ff', glow: 1 };
E.MATERIALS.signglow = { color: '#6cf0a0', glow: 1 };
E.MATERIALS.lamp = { color: '#fff8d8', glow: 1 };
E.MATERIALS.vend = { color: '#b84a3a', pattern: 'glaze' };
const S = E.SHAPES;
S.hospbed = { about: 'hospital bed with rails, white sheets, blue blanket', tags: 'hospital furniture', mats: { f: 'scrubsteel', s: 'sheet', b: 'blanket' }, parts: [['box', 'f', [0, 0, 5], [18, 34, 3]], ['box', 's', [0, 0, 8], [16, 31, 3]], ['box', 'b', [0, 5, 10], [16.5, 20, 2]], ['box', 's', [0, -11, 11], [12, 7, 3]], ['box', 'f', [0, -17, 5], [18, 2, 14]], ['box', 'f', [0, 17, 5], [18, 2, 9]], ['mirror', 'x', ['box', 'f', [8.5, -3, 11], [1, 16, 5]]], ['mirror', 'xy', ['cyl', 'f', [7.5, 14.5, 0], 1.4, 5]]] };
S.ivstand = { about: 'IV stand with a bag', tags: 'hospital', mats: { m: 'scrubsteel', b: 'film' }, parts: [['ring', 4, 4, ['cyl', 'm', [0, 0, 0], 1, 2]], ['cyl', 'm', [0, 0, 1], .8, 34], ['box', 'm', [0, 0, 34], [10, 1, 1]], ['box', 'b', [4, 0, 26], [4, 2, 8]]] };
S.vitalsmon = { about: 'vitals monitor on a stand, glowing trace', tags: 'hospital', mats: { m: 'scrubsteel', s: 'screen', t: 'trace' }, parts: [['cyl', 'm', [0, 0, 0], 4, 2], ['cyl', 'm', [0, 0, 2], 1, 20], ['box', 'm', [0, 0, 22], [14, 5, 11]], ['box', 's', [0, 2.6, 23], [12, .4, 9]], ['box', 't', [0, 3, 27], [10, .3, 1]]], lights: [[0, 4, 28, '#6cf0a0', 26]] };
S.crashcart = { about: 'red crash cart with drawers and paddles', tags: 'hospital', mats: { r: '#b83a32 glaze', m: 'scrubsteel', k: '#20262c' }, parts: [['box', 'r', [0, 0, 3], [15, 11, 20]], ['row', 3, [0, 0, 6], ['box', 'k', [0, 5.8, 7], [12, .4, 1]]], ['box', 'm', [0, 0, 23], [16, 12, 1]], ['box', 'k', [3, 0, 24], [8, 6, 3]], ['mirror', 'xy', ['cyl', 'm', [6, 4.5, 0], 1.3, 3]]] };
S.gurney = { about: 'wheeled gurney', tags: 'hospital', mats: { f: 'scrubsteel', s: 'sheet' }, parts: [['box', 'f', [0, 0, 7], [14, 32, 2]], ['box', 's', [0, 0, 9], [13, 30, 2]], ['mirror', 'xy', ['cyl', 'f', [6, 13, 0], 1.2, 7]]] };
S.curtain = { about: 'privacy curtain on a rail', tags: 'hospital', mats: { c: 'curtain', m: 'scrubsteel' }, parts: [['box', 'm', [0, 0, 36], [32, 1, 1]], ['row', 7, [4.6, 0, 0], ['cyl', 'c', [0, 0, 2], 2.4, 34]]] };
S.surglamp = { about: 'surgical lamp on an arm', tags: 'hospital', mats: { m: 'scrubsteel', g: 'lamp' }, lights: [[0, 0, 38, '#fff8d8', 90]], parts: [['cyl', 'm', [0, 0, 44], 1.2, 26], ['cyl', 'm', [0, 0, 40], 11, 4, { r2: 7 }], ['cyl', 'g', [0, 0, 39], 9, 1]] };
S.lightbox = { about: 'wall lightbox with an X-ray', tags: 'hospital', mats: { f: 'scrubsteel', g: 'film', b: '#2c3e48' }, lights: [[0, 2, 24, '#b8e8ff', 40]], parts: [['box', 'f', [0, 0, 12], [26, 2, 22]], ['box', 'g', [0, 1, 13], [24, .4, 20]], ['box', 'b', [0, 1.4, 15], [10, .3, 15]]] };
S.vending = { about: 'vending machine', tags: 'hospital', mats: { v: 'vend', s: 'film', k: '#20262c' }, lights: [[0, 6, 20, '#ffd8b0', 24]], parts: [['box', 'v', [0, 0, 0], [18, 12, 34]], ['box', 's', [-2, 6, 12], [11, .4, 18]], ['box', 'k', [6, 6, 16], [3, .4, 10]], ['box', 'k', [-2, 6, 4], [12, .4, 4]]] };
S.shipbunk = { about: 'ship\'s bunk, steel, two tier', tags: 'ship', mats: { f: '#5a665e metal', s: 'sheet', b: '#6a7a58 cloth' }, parts: [['mirror', 'xy', ['box', 'f', [8.5, 15.5, 0], [1.6, 1.6, 32]]], ['box', 'f', [0, 0, 8], [18, 32, 2]], ['box', 's', [0, 0, 10], [16, 30, 2]], ['box', 'b', [0, 5, 12], [16.5, 18, 1]], ['box', 'f', [0, 0, 25], [18, 32, 2]], ['box', 's', [0, 0, 27], [16, 30, 2]]] };
S.begonia = { about: 'begonia in a pot', tags: 'plant', mats: { p: 'clay', l: '#3c8a4a foliage', f: '#e85a7a' }, parts: [['cyl', 'p', [0, 0, 0], 3, 4, { r2: 4 }], ['ball', 'l', [0, 0, 7], 4.5], ['ball', 'f', [2, 1, 9], 1.2], ['ball', 'f', [-2, 2, 8], 1.2]] };
S.nextsign = { about: 'glowing sign over a door', tags: 'hospital', mats: { m: 'scrubsteel', g: 'signglow' }, lights: [[0, 0, 40, '#6cf0a0', 50]], parts: [['box', 'm', [0, 0, 38], [34, 2, 8]], ['box', 'g', [0, 1, 39], [32, .4, 6]]] };
S.wardtv = { about: 'television on a wall bracket', tags: 'hospital', mats: { m: '#20262c', s: 'film' }, parts: [['box', 'm', [0, 0, 26], [22, 3, 14]], ['box', 's', [0, 1.6, 27], [20, .3, 12]]] };

// ------------------------------------------------------------------ dressing and new poses
const mv = (J, name, tgt, w) => { const a = J[name]; for (let i = 0; i < 3; i++) a[i] += (tgt[i] - a[i]) * w; };
const H = E.Humanoid;
H.hat('surgcap', h => { const { g, at, c, dk, r } = h, a = at(0, -r * 1.05, r * .1), b = at(0, r * 1.05, r * .1), t0 = at(0, -r * .85, r * 1.05), t1 = at(0, r * .85, r * 1.05), f = at(r * .9, 0, r * .25); px.poly(g, [[a[0], a[1]], [t0[0], t0[1]], [t1[0], t1[1]], [b[0], b[1]]], c); px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), dk, 2); });
H.weapon('cane', { length: 13, rest: [.1, .2, -1], blade: false, draw(w) { const { g, Q, Sp, J } = w, hd = J.handR, tip = Sp(hd, 1, 0, -11.5), Hn = Q.handR; w.ops.push({ d: Hn[2], f: () => { px.line(g, Math.round(Hn[0]), Math.round(Hn[1]), Math.round(tip[0]), Math.round(tip[1]), '#4a3020', 2); } }); } });
H.weapon('clip', { length: 6, rest: [.6, .1, .2], blade: false, draw(w) { const { g, Q, J } = w, Hn = Q.handR; w.ops.push({ d: Hn[2], f: () => { px.rect(g, Math.round(Hn[0]) - 3, Math.round(Hn[1]) - 5, 6, 8, '#efe8d0'); } }); } });
H.weapon('tool', { length: 7, rest: [.8, .1, -.2], blade: false, draw(w) { const { g, Q, Sp, J } = w, hd = J.handR, tip = Sp(hd, 6, 0, -1), Hn = Q.handR; w.ops.push({ d: Hn[2], f: () => { px.line(g, Math.round(Hn[0]), Math.round(Hn[1]), Math.round(tip[0]), Math.round(tip[1]), '#d4e0ea'); } }); } });
H.pose('scrub', (J, w) => { mv(J, 'handL', [3, -2.5, 22], w); mv(J, 'handR', [3, 2.5, 22], w); mv(J, 'elbowL', [1.5, -6, 16], w); mv(J, 'elbowR', [1.5, 6, 16], w); });
H.pose('gurney', (J, w) => { mv(J, 'handL', [9, -3, 14.5], w); mv(J, 'handR', [9, 3, 14.5], w); mv(J, 'elbowL', [4, -5, 15], w); mv(J, 'elbowR', [4, 5, 15], w); });
H.pose('pass', (J, w) => { mv(J, 'handR', [10, 3, 16], w); mv(J, 'elbowR', [4.5, 5, 16], w); });
H.pose('over', (J, w, rig) => { const k = Math.sin((rig.t || 0) * 6) * 1; mv(J, 'handL', [9, -2 + k * .5, 12], w); mv(J, 'handR', [9, 2 - k * .5, 12 + k * .3], w); mv(J, 'elbowL', [4, -5, 14], w); mv(J, 'elbowR', [4, 5, 14], w); mv(J, 'head', [2, 0, 23.5], w); });
H.pose('knit', (J, w, rig) => { const k = Math.sin((rig.t || 0) * 5) * .8; mv(J, 'handL', [6, -1.5 + k, 15], w); mv(J, 'handR', [6, 1.5 - k, 15 + k * .5], w); mv(J, 'elbowL', [2, -5, 15], w); mv(J, 'elbowR', [2, 5, 15], w); });
H.pose('arch', (J, w) => { mv(J, 'head', [-2, 0, 24.5], w); mv(J, 'handL', [-1, -6, 9], w); mv(J, 'handR', [-1, 6, 9], w); });
H.pose('shout', (J, w) => { mv(J, 'handL', [5, -6, 24], w); mv(J, 'handR', [5, 6, 24], w); mv(J, 'elbowL', [2, -7, 20], w); mv(J, 'elbowR', [2, 7, 20], w); });

const mask = rigColor => ({ over(g, Q, rig) { const h = Q.head; if (!h) return; px.rect(g, Math.round(h[0]) - 4, Math.round(h[1]) + 1, 8, 4, rigColor); px.rect(g, Math.round(h[0]) - 4, Math.round(h[1]) + 1, 8, 1, E.tones(rigColor).hi); } });
const LOOK = {
  vale: { hat: { style: 'surgcap', color: '#2bb0a2' }, hair: 'ponytail', outfit: 'shirt', sleeves: 'short', colors: { skin: '#f6d0b2', hair: '#c9562a', cloth: '#2f9c8e', pants: '#2f9c8e', boot: '#e8e4dc', belt: '#2f9c8e', iris: '#3f8a58' }, mask: '#bfe6dc' },
  quill: { hat: { style: 'surgcap', color: '#35558f' }, hair: 'short', outfit: 'shirt', sleeves: 'short', build: 'bulky', colors: { skin: '#dcae8e', hair: '#8d8a88', cloth: '#3d62a6', pants: '#3d62a6', boot: '#20262c', belt: '#3d62a6' }, mask: '#a9cfe0' },
  oyelaran: { hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#7c4a2e', hair: '#c9c5bb', cloth: '#2e2c36', coat: '#ece7da', pants: '#2e2c36', boot: '#201c1c', belt: '#2e2c36' }, weapon: 'cane' },
  sokolova: { hair: 'long', hat: { style: 'band', color: '#c8382e' }, outfit: 'tunic', sleeves: 'short', colors: { skin: '#e8c6aa', hair: '#dedad2', cloth: '#6b7a48', pants: '#57643c', boot: '#2c2a22', belt: '#3a3a2a' } },
  percy: { hair: 'short', outfit: 'coat', sleeves: 'long', build: 'heroic', colors: { skin: '#f0cfae', hair: '#6a4426', cloth: '#26424e', coat: '#f6f4ec', pants: '#26424e', boot: '#16181c', belt: '#26424e' } },
  odalys: { hair: 'spiky', outfit: 'tunic', sleeves: 'long', colors: { skin: '#b98258', hair: '#2a1a1e', cloth: '#b0603c', pants: '#3c3a4a', boot: '#3a2a22', belt: '#3c3a4a' } },
  hale: { hair: 'short', outfit: 'coat', sleeves: 'long', build: 'heroic', colors: { skin: '#e4bd9c', hair: '#c8ccd4', cloth: '#232a40', coat: '#2e3650', pants: '#232a40', boot: '#101218', belt: '#232a40' } },
  clementine: { hair: 'short', outfit: 'robe', sleeves: 'short', colors: { skin: '#efe4dc', hair: '#c8b49a', cloth: '#9fc0cc', pants: '#9fc0cc', boot: '#efe4dc' } },
  gown: { hair: 'short', outfit: 'robe', sleeves: 'short', colors: { skin: '#e0b898', hair: '#6a5a4a', cloth: '#9fc0cc', pants: '#9fc0cc', boot: '#e0b898' } },
  medic: { hair: 'short', outfit: 'shirt', sleeves: 'long', colors: { skin: '#c8966e', hair: '#2a2028', cloth: '#d87a24', pants: '#2c3a54', boot: '#16181c', belt: '#2c3a54' } },
  guest: { hair: 'short', outfit: 'coat', sleeves: 'long', colors: { skin: '#d8b090', hair: '#3a2a22', cloth: '#1c1626', coat: '#2a2036', pants: '#1c1626', boot: '#101014', belt: '#1c1626' } },
};
const PATIENT_TINT = { agnes: ['#ecc8ac', '#e8e4dc'], slide: ['#5e3a26', '#b4ada2'], tam: ['#e0a888', '#b84a26'], harrow: ['#c8966e', '#d8d4cc'], ilse: ['#f4d8c4', '#e0c068'], yusuf: ['#c89468', '#1e1a1c'], perpetua: ['#e8c8a8', '#1c2030'], crane: ['#dcc0a8', '#6a6660'] };
G.makeRig = (id, o = {}) => {
  const L = LOOK[id] || LOOK.gown, colors = Object.assign({}, L.colors), t = PATIENT_TINT[id]; if (t) { colors.skin = t[0]; colors.hair = t[1]; }
  const r = new H(Object.assign({ size: 1.3, build: L.build || 'chibi', weapon: L.weapon || null, hat: L.hat, hair: L.hair, outfit: L.outfit, sleeves: L.sleeves, colors }, o, (o.masked && L.mask) ? { draw: mask(L.mask) } : {}));
  return r;
};
})();
