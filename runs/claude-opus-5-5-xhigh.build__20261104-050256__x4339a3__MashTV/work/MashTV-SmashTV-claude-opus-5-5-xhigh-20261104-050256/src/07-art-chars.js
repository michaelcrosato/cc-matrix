// ---- characters: contestant looks, the host and co-host, paparazzi, enemy rigs; small painters shared by them ----
const SLOT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
MT.SLOT_COLORS = SLOT_COLORS;
const LOOKS = MT.looks = [
  { id: 'rocket', name: 'ROCKET', o: { hair: 'short', hat: null }, hair: '#3a2214', skin: '#f0c8a0' },
  { id: 'volt', name: 'VOLT', o: { hair: 'ponytail', hat: { style: 'band', color: '#c8d0e0' } }, hair: '#1a1a2a', skin: '#c89070' },
  { id: 'moxie', name: 'MOXIE', o: { hair: 'spiky', hat: { style: 'cap', color: '#fff7e8' } }, hair: '#d03a20', skin: '#f4d0b0' },
  { id: 'goldie', name: 'GOLDIE', o: { hair: 'long', hat: { style: 'band', color: '#ff2e88' } }, hair: '#ffd860', skin: '#8a5a3a' },
];
/** a contestant's rig: the look picks hair and hat, the slot picks the jumpsuit's colour */
function makeContestantRig(slot, look) {
  const L = LOOKS[look % LOOKS.length], col = SLOT_COLORS[slot % 4], t = E.tones(col);
  return new E.Humanoid(Object.assign({ size: 1.1, build: 'heroic', weapon: 'gun', outfit: 'shirt', sleeves: 'long',
    colors: { skin: L.skin, hair: L.hair, cloth: col, pants: t.sh, boot: '#1a1420', belt: '#fff7e8', trim: '#fff7e8', glove: slot === 1 ? '#c8d0e0' : '#1a1420', metal: '#c8d0e0', hilt: '#2a2a34' } }, L.o));
}
function makeLance(size = 1.3) {
  return new E.Humanoid({ size, build: 'heroic', weapon: null, outfit: 'coat', hair: 'spiky', sleeves: 'long',
    colors: { skin: '#f0c8a0', hair: '#e8e8f4', cloth: '#fff7e8', coat: '#7a2ad0', trim: '#ffcc33', pants: '#1a1420', boot: '#120c18', glove: '#ffffff', belt: '#ffcc33' } });
}
function makePenny() {
  return new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, outfit: 'robe', hair: 'long', sleeves: 'none',
    colors: { skin: '#f4d0b0', hair: '#ff8ad8', cloth: '#1ab0b0', trim: '#fff7e8', pants: '#1ab0b0', boot: '#fff7e8', glove: '#ffffff', belt: '#ffcc33' } });
}
function makePaparazzo(i) {
  return new E.Humanoid({ size: .9, build: 'chibi', weapon: null, outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#3a3448' },
    colors: { skin: ['#f0c8a0', '#c89070', '#8a5a3a'][i % 3], hair: '#2a1a10', cloth: '#5a5468', coat: '#b89a6a', trim: '#8a6a3a', pants: '#3a3448', boot: '#1a1420' } });
}
const ENEMY_RIGS = {
  goon: () => new E.Humanoid({ size: 1.0, build: 'bulky', weapon: 'sword', outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#1a2440' }, sleeves: 'short',
    colors: { skin: '#e0b090', hair: '#2a1a10', cloth: '#3a4a6a', pants: '#1a2440', boot: '#0c0a14', belt: '#c8a040', metal: '#1a1a22', hilt: '#3a3a44', trim: '#ffcc33' } }),
  popper: () => new E.Humanoid({ size: 1.0, build: 'chibi', weapon: null, outfit: 'tunic', hair: 'short', hat: { style: 'pointed', color: '#ff2e88' },
    colors: { skin: '#ffd8b0', hair: '#5a2a10', cloth: '#ffcc33', pants: '#2ee6ff', boot: '#ff2e88', trim: '#ff2e88' } }),
  mime: () => new E.Humanoid({ size: 1.0, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#141018' }, sleeves: 'long',
    colors: { skin: '#f8f8fc', hair: '#141018', cloth: '#f0f0f4', pants: '#141018', boot: '#141018', glove: '#ffffff', trim: '#141018', belt: '#d02a3a' } }),
  heckler: () => new E.Humanoid({ size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#d02a3a' },
    colors: { skin: '#f0c090', hair: '#6a3a1a', cloth: '#d02a3a', pants: '#3a4a6a', boot: '#fff7e8', trim: '#fff7e8' } }),
  hecklerKing: () => new E.Humanoid({ size: 1.1, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: { style: 'crown', color: '#ffcc33' },
    colors: { skin: '#f0c090', hair: '#6a3a1a', cloth: '#7a2ad0', pants: '#3a4a6a', boot: '#ffcc33', trim: '#ffcc33' } }),
  brute: () => new E.Humanoid({ size: 1.6, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'long',
    colors: { skin: '#9a6a3a', hair: '#7a4a24', cloth: '#ffcc33', pants: '#8a5a2a', boot: '#5a3a1a', glove: '#9a6a3a', trim: '#d02a3a', belt: '#d02a3a' } }),
  clapbot: () => new E.Blob({ R: 6, horns: true, feet: true, mouth: true, face: 'front', colors: { dk: '#4a5060', base: '#9aa4b8', lt: '#d8e0f0', spec: '#ffffff', eye: '#ff3344', pupil: '#2a0008' } }),
};
MT.makeContestantRig = makeContestantRig; MT.makeLance = makeLance; MT.makePenny = makePenny; MT.makePaparazzo = makePaparazzo; MT.ENEMY_RIGS = ENEMY_RIGS;
/** the host's gold microphone, drawn at his hand */
function drawMic(g, r, rig) {
  const h = rig.hand('R'), [sx, sy] = r.w(h.x, h.y, h.z);
  px.rect(g, sx - .5, sy - 1, 2, 5, '#c8a040'); px.disc(g, sx + .5, sy - 2, 2, '#ffcc33'); px.dot(g, sx, sy - 3, '#ffffff');
}
/** a contestant's player tag on the floor: a ring in the slot's colour with its number (information never in colour alone) */
function drawPlayerTag(r, c, t) {
  const col = SLOT_COLORS[c.slot];
  r.decal(() => { r.groundRing(c.x, c.y, 8, col, .7); });
  if (c.tagT > 0) r.queue(c.x, c.y, 40, g => { const [sx, sy] = r.w(c.x, c.y, 44 + Math.sin(t * 6) * 2); px.poly(g, [[sx - 4, sy - 2], [sx + 4, sy - 2], [sx, sy + 3]], col); E.font.text(g, 'P' + (c.slot + 1), sx, sy - 11, '#fff7e8', { align: 'center', shadow: '#000', outline: false }); }, { bias: 20 });
}
MT.paint = { drawMic, drawPlayerTag };
