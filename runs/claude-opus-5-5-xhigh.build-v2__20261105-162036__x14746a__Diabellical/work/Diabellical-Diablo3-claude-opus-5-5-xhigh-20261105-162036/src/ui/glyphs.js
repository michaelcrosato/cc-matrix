// Prompts follow the last input: PlayStation by default, an Xbox option, keycaps and mouse buttons.
export const ACTIONS = {
  // action: [pad button name, keyboard or mouse name]
  confirm: ['cross', 'ENTER'], back: ['circle', 'ESC'], ctxA: ['square', 'X'], ctxB: ['triangle', 'V'], tabL: ['l1', 'Q'], tabR: ['r1', 'E'],
  s0: ['cross', 'LMB'], s1: ['square', 'RMB'], s2: ['triangle', '1'], s3: ['circle', '2'], s4: ['r1', '3'], s5: ['r2', '4'],
  dodge: ['l2', 'SPC'], potion: ['l1', 'Q'], interact: ['cross', 'E'], hero: ['create', 'I'], pause: ['options', 'ESC'], map: ['dup', 'M'], bell: ['ddown', 'T'], equip: ['dleft', 'F'], cycle: ['dright', 'TAB'], labels: ['r3', 'ALT'], move: ['lstick', 'WASD'], aim: ['rstick', 'MOUSE'], skills: ['create', 'K'], join: ['options', ''], more: ['triangle', 'M'],
};

const circle = ['..KKKKKKK..', '.K.......K.', 'K.........K', 'K.........K', 'K.........K', 'K.........K', 'K.........K', 'K.........K', 'K.........K', '.K.......K.', '..KKKKKKK..'];
const withInner = (inner) => circle.map((r, y) => r.split('').map((c, x) => (inner[y]?.[x] && inner[y][x] !== '.' ? inner[y][x] : c)).join(''));
const blank = Array(11).fill('...........');
const rowsFrom = (art) => blank.map((_, y) => art[y] ?? '...........');

const GLYPH_ART = {
  face_cross: withInner(rowsFrom(['...........', '...........', '...O...O...', '....O.O....', '.....O.....', '.....O.....', '....O.O....', '...O...O...', '...........'])),
  face_circle: withInner(rowsFrom(['...........', '...........', '....OOO....', '...O...O...', '...O...O...', '...O...O...', '....OOO....', '...........'])),
  face_square: withInner(rowsFrom(['...........', '...........', '...OOOOO...', '...O...O...', '...O...O...', '...O...O...', '...OOOOO...', '...........'])),
  face_triangle: withInner(rowsFrom(['...........', '...........', '.....O.....', '....O.O....', '....O.O....', '...O...O...', '...OOOOO...', '...........'])),
  face_a: withInner(rowsFrom(['...........', '...........', '....OOO....', '...O...O...', '...OOOOO...', '...O...O...', '...O...O...', '...........'])),
  face_b: withInner(rowsFrom(['...........', '...........', '...OOOO....', '...O...O...', '...OOOO....', '...O...O...', '...OOOO....', '...........'])),
  face_x: withInner(rowsFrom(['...........', '...........', '...O...O...', '....O.O....', '.....O.....', '....O.O....', '...O...O...', '...........'])),
  face_y: withInner(rowsFrom(['...........', '...........', '...O...O...', '....O.O....', '.....O.....', '.....O.....', '.....O.....', '...........'])),
  dup: ['....KKK....', '...KOOOK...', '...KOOOK...', '...KKOKK...', '.KKK.O.KKK.', 'K....O....K', '.KKK...KKK.', '...K...K...', '...K...K...', '...K...K...', '....KKK....'],
  ddown: ['....KKK....', '...K...K...', '...K...K...', '...K...K...', '.KKK...KKK.', 'K....O....K', '.KKK.O.KKK.', '...KKOKK...', '...KOOOK...', '...KOOOK...', '....KKK....'],
  dleft: ['....KKK....', '...K...K...', '...K...K...', '.KKK...KKK.', 'KOOO....  K', 'KOOOOOO...K', 'KOOO.....KK', '.KKK...KKK.', '...K...K...', '...K...K...', '....KKK....'],
  dright: ['....KKK....', '...K...K...', '...K...K...', '.KKK...KKK.', 'K  ....OOOK', 'K...OOOOOOK', 'KK.....OOOK', '.KKK...KKK.', '...K...K...', '...K...K...', '....KKK....'],
  lmb: ['...KKKKK...', '..KOOK..K..', '.KOOOK...K.', '.KOOOK...K.', '.KOOOK...K.', '.KKKKKKKKK.', '.K.......K.', '.K.......K.', '.K.......K.', '..K.....K..', '...KKKKK...'],
  rmb: ['...KKKKK...', '..K..KOOK..', '.K...KOOOK.', '.K...KOOOK.', '.K...KOOOK.', '.KKKKKKKKK.', '.K.......K.', '.K.......K.', '.K.......K.', '..K.....K..', '...KKKKK...'],
  lstick: ['...KKKKK...', '..K.....K..', '.K..OOO..K.', 'K..O...O..K', 'K..O...O..K', 'K..O...O..K', '.K..OOO..K.', '..K.....K..', '...KKKKK...', '...........', '.....L.....'],
  rstick: ['...KKKKK...', '..K.....K..', '.K..OOO..K.', 'K..O...O..K', 'K..O...O..K', 'K..O...O..K', '.K..OOO..K.', '..K.....K..', '...KKKKK...', '...........', '.....R.....'],
};

// Colours of the face buttons in each scheme.
const PS = { cross: ['face_cross', 'sky'], circle: ['face_circle', 'red'], square: ['face_square', 'plum'], triangle: ['face_triangle', 'lime'] };
const XB = { cross: ['face_a', 'lime'], circle: ['face_b', 'red'], square: ['face_x', 'sky'], triangle: ['face_y', 'sand'] };
const SHOULDER_PS = { l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', options: 'OPT', create: 'CRE', r3: 'R3', l3: 'L3' };
const SHOULDER_XB = { l1: 'LB', r1: 'RB', l2: 'LT', r2: 'RT', options: 'MEN', create: 'VIE', r3: 'RS', l3: 'LS' };

export function glyphWidth(ui, action) {
  const name = glyphName(ui, action);
  if (!name) return 0;
  if (name.key) return name.key.length * 6 + 5;
  if (name.tag) return name.tag.length * 6 + 3;
  return 11;
}

export function glyphName(ui, action) {
  const a = ACTIONS[action];
  if (!a) return null;
  if (ui.game.input.lastDevice !== 'pad') {
    if (a[1] === 'LMB') return { art: 'lmb', color: 'white' };
    if (a[1] === 'RMB') return { art: 'rmb', color: 'white' };
    return a[1] ? { key: a[1] } : null;
  }
  const b = a[0];
  const scheme = ui.game.settings?.glyphs === 'xbox';
  if (PS[b]) { const [art, color] = (scheme ? XB : PS)[b]; return { art, color }; }
  const sh = (scheme ? SHOULDER_XB : SHOULDER_PS)[b];
  if (sh) return { tag: sh };
  return { art: b, color: 'white' };
}

/** Draw a prompt glyph; returns its width. */
export function drawGlyph(ui, action, x, y) {
  const n = glyphName(ui, action);
  if (!n) return 0;
  const hud = ui.hud;
  if (n.key) {
    const w = n.key.length * 6 + 3;
    hud.rect(x, y, w, 11, 'white');
    hud.rect(x + 1, y + 1, w - 2, 9, 'night');
    ui.text(x + 2, y + 2, n.key, { color: 'white', shadow: false, glyph: true });
    return w + 2;
  }
  if (n.tag) {
    const w = n.tag.length * 6 + 3;
    hud.rect(x, y, w, 11, 'mist');
    ui.text(x + 2, y + 2, n.tag, { color: 'ink', shadow: false, glyph: true });
    return w + 2;
  }
  const art = GLYPH_ART[n.art];
  hud.sprite(x, y, art, { K: n.color === 'white' ? 'mist' : n.color, O: n.color === 'white' ? 'white' : 'white', L: 'mist', R: 'mist' }, { shadow: false });
  return 13;
}

export const glyphSet = (ui) => (ui.game.input.lastDevice === 'pad' ? (ui.game.settings?.glyphs === 'xbox' ? 'xbox' : 'ps') : 'kbm');
