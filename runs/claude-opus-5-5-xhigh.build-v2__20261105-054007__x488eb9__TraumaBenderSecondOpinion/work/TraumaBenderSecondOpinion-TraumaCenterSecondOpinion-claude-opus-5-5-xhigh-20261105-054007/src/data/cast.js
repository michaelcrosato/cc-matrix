// Who is who: bust data (Appendix C's shape), names and voices. defCast(id, spec) adds a character.
(() => {
const G = (window.GAME ||= {});
const CAST = G.CAST = {};
const defCast = G.defCast = (id, c) => { CAST[id] = c; };
const K = {   // a small parts kit, in face space (x from the centre, y down)
  crop: [[[[-27, 16], [-26, 0], [-12, -8], [14, -8], [26, 0], [27, 16], [18, 8], [4, 11], [-12, 8]], 'base'], [[[-27, 16], [-26, 0], [-12, -8], [-6, 8], [-14, 8]], 'sh']],
  neat: [[[[-27, 18], [-27, 2], [-12, -10], [16, -10], [27, 0], [27, 18], [22, 8], [10, 2], [-6, 6], [-18, 2]], 'base'], [[[-27, 18], [-27, 2], [-12, -10], [-6, 6], [-18, 2]], 'sh'], [[[8, -8], [20, -6], [24, 0], [12, -2]], 'lt']],
  curls: [[[[-32, 22], [-34, 6], [-26, -6], [-14, -12], [2, -14], [18, -12], [30, -4], [34, 8], [32, 22], [26, 14], [18, 8], [8, 14], [-4, 8], [-14, 14], [-24, 10]], 'base'], [[[-32, 22], [-34, 6], [-26, -6], [-14, -12], [-8, 8], [-14, 14], [-24, 10]], 'sh'], [[[6, -12], [16, -10], [14, -4], [6, -6]], 'lt'], [[[-22, -4], [-14, -6], [-14, 2], [-22, 2]], 'lt']],
  bun: [[[[-27, 14], [-26, 0], [-12, -8], [14, -8], [26, 0], [27, 14], [16, 6], [0, 10], [-16, 6]], 'base'], [[[-27, 14], [-26, 0], [-12, -8], [-6, 6], [-16, 6]], 'sh'], [[[-9, -8], [-8, -18], [0, -22], [8, -18], [9, -8]], 'lt']],
  long: [[[[-28, 26], [-27, 2], [-12, -9], [14, -9], [27, 2], [28, 26], [20, 8], [0, 4], [-20, 8]], 'base'], [[[-28, 26], [-27, 2], [-12, -9], [-6, 4], [-20, 8]], 'sh']],
  longBack: [[[-28, 6], [-34, 40], [-30, 76], [-16, 70], [-18, 14]], [[28, 6], [34, 40], [30, 76], [16, 70], [18, 14]]],
  bald: [[[[-27, 18], [-27, 8], [-22, 8], [-22, 18]], 'sh'], [[[27, 18], [27, 8], [22, 8], [22, 18]], 'base']],
};
const beardOver = (hex, chin = 1) => (g, c) => { const E = My3D2dge, cx = 56, top = 20, f = (x, y) => [cx + x * (c.wide || 1), top + y], T = E.tones(hex); E.px.poly(g, [f(-24, 44), f(-14, 52), f(0, 55), f(14, 52), f(24, 44), f(20, 58), f(10, 68 * chin), f(0, 72 * chin), f(-10, 68 * chin), f(-20, 58)], T.base); E.px.poly(g, [f(-24, 44), f(-14, 52), f(-6, 60), f(-10, 68 * chin), f(-20, 58)], T.sh); E.px.line(g, ...f(-5, 58), ...f(5, 58), '#4a2a24', 1); };
const hardHat = (hex) => (g, c) => { const E = My3D2dge, cx = 56, top = 20, f = (x, y) => [cx + x * (c.wide || 1), top + y], T = E.tones(hex); E.px.poly(g, [f(-33, 14), f(-24, -6), f(-10, -14), f(12, -14), f(24, -6), f(33, 14)], T.base); E.px.poly(g, [f(-33, 14), f(-24, -6), f(-10, -14), f(-4, 14)], T.sh); E.px.poly(g, [f(-36, 13), f(36, 13), f(36, 18), f(-36, 18)], T.lt); E.px.rect(g, ...f(-3, -14), 6, 28, T.hi); };
const captainCap = (g, c) => { const E = My3D2dge, cx = 56, top = 20, f = (x, y) => [cx + x * (c.wide || 1), top + y], T = E.tones('#20344e'); E.px.poly(g, [f(-30, 8), f(-26, -10), f(26, -10), f(30, 8)], '#f0ece2'); E.px.poly(g, [f(-30, 8), f(30, 8), f(28, 14), f(-28, 14)], T.base); E.px.poly(g, [f(-24, 12), f(24, 12), f(30, 20), f(-30, 20)], T.deep); E.px.rect(g, ...f(-4, 2), 8, 6, '#e8c43a'); };
const pork = (g, c) => { const E = My3D2dge, cx = 56, top = 20, f = (x, y) => [cx + x * (c.wide || 1), top + y], T = E.tones('#3a2c44'); E.px.poly(g, [f(-24, 6), f(-22, -12), f(22, -12), f(24, 6)], T.base); E.px.poly(g, [f(-34, 8), f(34, 8), f(30, 13), f(-30, 13)], T.sh); E.px.rect(g, ...f(-23, 2), 46, 4, '#d8b04a'); };
const wimple = (g, c) => { const E = My3D2dge, cx = 56, top = 20, f = (x, y) => [cx + x, top + y]; E.px.poly(g, [f(-30, 30), f(-30, 0), f(-18, -12), f(18, -12), f(30, 0), f(30, 30), f(26, 20), f(24, 8), f(14, 6), f(-14, 6), f(-24, 8), f(-26, 20)], '#1c2030'); E.px.poly(g, [f(-26, 12), f(-14, 4), f(14, 4), f(26, 12), f(22, 16), f(14, 10), f(-14, 10), f(-22, 16)], '#f4f0e6'); };

const data = {
  vale: { name: 'DR. VALE', title: 'Dr. Imogen Vale', skin: '#f6d0b2', hair: '#c9562a', iris: '#3f8a58', cloth: '#2f9c8e', cap: '#2bb0a2', mask: '#bfe6dc', undershirt: '#e9fff6', blush: '#f0a48c', wide: .95, freckles: true,
    backHair: [[[-27, 14], [-30, 40], [-24, 52], [-16, 40], [-16, 14]], [[27, 14], [30, 40], [24, 52], [16, 40], [16, 14]]],
    frontHair: [[[[-27, 12], [-24, 24], [-16, 16], [-10, 22], [-3, 14], [3, 21], [10, 14], [18, 22], [27, 12], [14, 8], [-14, 8]], 'base'], [[[-27, 12], [-24, 24], [-16, 16], [-14, 10]], 'sh']], tag: '#c8452f',
    voice: { base: 340, syl: .055, wave: 'triangle' }, side: 'left', say: 'Imogen', chip: '#2f9c8e' },
  quill: { name: 'NURSE QUILL', title: 'Bartholomew Quill', skin: '#dcae8e', hair: '#8d8a88', iris: '#4a4a55', cloth: '#3d62a6', cap: '#35558f', undershirt: '#dfe6f2', moustache: '#a7a3a0', lines: true, wide: 1.08, jaw: 1.04, browW: 3, brow: '#7c7875', browDrop: 2, mask: '#a9cfe0', frontHair: [],
    voice: { base: 105, syl: .095, wave: 'sawtooth', lp: 1400 }, side: 'right', chip: '#3d62a6' },
  oyelaran: { name: 'CHIEF OYELARAN', title: 'Dr. Marguerite Oyelaran', skin: '#7c4a2e', hair: '#c9c5bb', iris: '#2a1a12', cloth: '#2e2c36', coat: '#ece7da', undershirt: '#3a3644', lines: true, jaw: .98, glasses: '#d8c070',
    backHair: [], frontHair: [[[[-27, 18], [-27, 2], [-14, -8], [14, -8], [27, 2], [27, 18], [20, 10], [8, 6], [-8, 6], [-20, 10]], 'base'], [[[-27, 18], [-27, 2], [-14, -8], [-8, 6], [-20, 10]], 'sh'], [[[6, -7], [16, -6], [22, 0], [12, 0]], 'lt']],
    voice: { base: 170, syl: .09, wave: 'triangle', clip: true }, side: 'right', chip: '#ece7da' },
  sokolova: { name: 'DR. SOKOLOVA', title: 'Dr. Yevgenia Sokolova', skin: '#e8c6aa', hair: '#dedad2', iris: '#6a8aa8', cloth: '#6b7a48', undershirt: '#f0ece0', lines: true, wide: 1.02, jaw: 1.02, scar: [10, 14, 17, 40], browW: 3, brow: '#b8b4ac',
    backHair: [[[-28, 6], [-34, 34], [-30, 58], [-20, 50], [-20, 10]], [[28, 6], [36, 26], [46, 52], [38, 64], [28, 44], [22, 10]]], frontHair: [[[[-27, 16], [-26, 2], [-12, -8], [14, -8], [27, 2], [27, 16], [16, 6], [-2, 12], [-16, 8]], 'base'], [[[-27, 16], [-26, 2], [-12, -8], [-6, 8], [-16, 8]], 'sh']],
    extra(g, c) { const E = My3D2dge, f = (x, y) => [56 + x * c.wide, 20 + y]; E.px.poly(g, [f(-28, 6), f(28, 6), f(28, 12), f(-28, 12)], '#c8382e'); E.px.line(g, ...f(4, 54), ...f(26, 62), '#3a2c20', 2); E.px.disc(g, ...f(28, 60), 3, '#5a3c24'); },
    voice: { base: 150, syl: .08, wave: 'sawtooth', trem: 28 }, side: 'left', chip: '#6b7a48' },
  percy: { name: 'DR. WHITLOCK', title: 'Dr. Percival Whitlock', skin: '#f0cfae', hair: '#6a4426', iris: '#3a5a8a', cloth: '#26424e', coat: '#f6f4ec', undershirt: '#b8d4e0', wide: .98, jaw: 1, frontHair: K.neat, hairGlint: [[[10, -7], [20, -4], [22, 0], [12, -2]]],
    voice: { base: 210, syl: .07, wave: 'square', nasal: true }, side: 'right', chip: '#f6f4ec' },
  odalys: { name: 'ODALYS', title: 'Odalys Ferreira', skin: '#b98258', hair: '#2a1a1e', iris: '#2a1a12', cloth: '#b0603c', undershirt: '#f0e0c8', wide: .96, frontHair: K.curls, glasses: '#e8506a', blush: '#c86a50',
    extra(g, c) { const E = My3D2dge, f = (x, y) => [56 + x * c.wide, 20 + y]; for (const s of [-1, 1]) { const x = s * 13; E.px.line(g, ...f(x - 10, 22), ...f(x + 10, 22), '#e8506a', 2); E.px.line(g, ...f(x - 10, 22), ...f(x - 10, 35), '#e8506a', 2); E.px.line(g, ...f(x + 10, 22), ...f(x + 10, 35), '#e8506a', 2); E.px.line(g, ...f(x - 10, 35), ...f(x + 10, 35), '#e8506a', 2); } },
    voice: { base: 300, syl: .05, wave: 'triangle', bubble: true }, side: 'right', chip: '#b0603c' },
  hale: { name: 'DR. HALE', title: 'Dr. Lucian Hale', skin: '#e4bd9c', hair: '#c8ccd4', iris: '#5a8aa8', cloth: '#232a40', coat: '#2e3650', undershirt: '#eef0f6', lines: true, wide: 1, jaw: 1.02, frontHair: K.neat, hairGlint: [[[10, -7], [20, -4], [22, 0], [12, -2]]],
    voice: { base: 125, syl: .11, wave: 'sine', vib: 5, breath: true }, side: 'right', chip: '#c8ccd4' },
  clementine: { name: 'CLEMENTINE', title: 'Clementine Hale', skin: '#efe4dc', hair: '#c8b49a', iris: '#5ff0e0', cloth: '#9fc0cc', undershirt: '#dfeef2', wide: .92, frontHair: K.crop, underglow: '#7ce8dc', blush: '#e8d4d0',
    voice: { base: 390, syl: .09, wave: 'sine', still: true }, side: 'right', chip: '#5ff0e0' },
  // patients, from the parts kit
  agnes: { name: 'AGNES PELLOW', title: 'Agnes Pellow', skin: '#ecc8ac', hair: '#e8e4dc', iris: '#6a7a9a', cloth: '#9fc0cc', undershirt: '#dfeef2', lines: true, wide: .96, frontHair: K.bun, glasses: '#8a6a4a', voice: { base: 260, syl: .08, wave: 'triangle' }, side: 'right' },
  slide: { name: 'SLIDE ACHEBE', title: 'Desmond "Slide" Achebe', skin: '#5e3a26', hair: '#b4ada2', iris: '#1e120c', cloth: '#9fc0cc', undershirt: '#dfeef2', lines: true, wide: 1.06, jaw: 1.02, moustache: '#b4ada2', frontHair: K.crop, extra: pork, voice: { base: 118, syl: .085, wave: 'sawtooth', lp: 1800 }, side: 'right' },
  tam: { name: 'BIG TAM', title: 'Tam Rennie', skin: '#e0a888', hair: '#b84a26', iris: '#3a5a6a', cloth: '#d87a24', undershirt: '#44505a', wide: 1.14, jaw: 1.08, browW: 3, frontHair: K.crop, moustache: '#b84a26', extra: (g, c) => { beardOver('#b84a26')(g, c); hardHat('#f0c030')(g, c); }, voice: { base: 92, syl: .1, wave: 'sawtooth', lp: 1200 }, side: 'right' },
  harrow: { name: 'CAPT. HARROW', title: 'Captain Ned Harrow', skin: '#c8966e', hair: '#d8d4cc', iris: '#3a6a8a', cloth: '#20344e', undershirt: '#f0ece2', lines: true, wide: 1.06, jaw: 1.02, browW: 3, frontHair: [], extra: (g, c) => { beardOver('#d8d4cc', 1.05)(g, c); captainCap(g, c); }, voice: { base: 112, syl: .09, wave: 'sawtooth', lp: 1500 }, side: 'right' },
  ilse: { name: 'ILSE BRANDT', title: 'Ilse Brandt', skin: '#f4d8c4', hair: '#e0c068', iris: '#5a8ab8', cloth: '#9fc0cc', undershirt: '#dfeef2', wide: .92, backHair: K.longBack, frontHair: K.long, blush: '#f0b0a0', voice: { base: 360, syl: .07, wave: 'sine' }, side: 'right' },
  yusuf: { name: 'YUSUF DEMIR', title: 'Yusuf Demir', skin: '#c89468', hair: '#1e1a1c', iris: '#2a1a12', cloth: '#3c5a6a', undershirt: '#e8e4dc', wide: 1.02, frontHair: K.crop, moustache: '#1e1a1c', voice: { base: 135, syl: .075, wave: 'triangle' }, side: 'right' },
  perpetua: { name: 'SISTER PERPETUA', title: 'Sister Perpetua', skin: '#e8c8a8', hair: '#1c2030', iris: '#5a6a5a', cloth: '#1c2030', undershirt: '#f4f0e6', lines: true, wide: .98, frontHair: [], extra: wimple, voice: { base: 230, syl: .085, wave: 'sine' }, side: 'right' },
  crane: { name: 'DR. CRANE', title: 'Dr. Hollis Crane', skin: '#dcc0a8', hair: '#6a6660', iris: '#4a5a4a', cloth: '#5a6a72', coat: '#d8d8d0', undershirt: '#eef0f0', lines: true, wide: .9, jaw: 1.06, frontHair: K.bald, glasses: '#28302c', voice: { base: 160, syl: .07, wave: 'square', shaky: true }, side: 'right' },
};
for (const k in data) defCast(k, data[k]);
G.castName = id => (CAST[id] && CAST[id].name) || id.toUpperCase();
})();
