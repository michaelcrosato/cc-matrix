// Button prompts: PlayStation glyphs, Xbox glyphs, keycaps and mouse icons, drawn as pixel sprites.
import { drawText, textWidth } from './font.js';

const ROUND = ['..#####..', '.#######.', '#########', '#########', '#########', '#########', '#########', '.#######.', '..#####..'];
const FACE = { cross: '✕', circle: '○', square: '□', triangle: '△' };
const FACE_COLOR = { cross: 'sky', circle: 'red', square: 'plum', triangle: 'green' };
const XBOX = { cross: 'A', circle: 'B', square: 'X', triangle: 'Y' };
const XBOX_COLOR = { cross: 'green', circle: 'red', square: 'blue', triangle: 'sand' };
const SHOULDER = { l1: ['L1', 'LB'], r1: ['R1', 'RB'], l2: ['L2', 'LT'], r2: ['R2', 'RT'], options: ['OPT', 'MENU'], dup: ['D↑', 'D↑'], ddown: ['D↓', 'D↓'], dleft: ['D←', 'D←'], touch: ['PAD', 'VIEW'], stick: ['LS', 'LS'] };
const MOUSE_L = ['.##.##.', '#..#..#', '####..#', '####..#', '#.....#', '#.....#', '.#####.'];
const MOUSE_R = ['.##.##.', '#..#..#', '#..####', '#..####', '#.....#', '#.....#', '.#####.'];
const WHEEL = ['.##.##.', '#..#..#', '#..#..#', '#.....#', '#.....#', '#.....#', '.#####.'];
const COL = { '#': 'ink' };
/** A prompt per action and device. */
const KEY_FOR = {
  confirm: 'E', back: 'Esc', use: 'Space', pockets: 'Tab', tools: '1-6', map: 'M', almanac: 'J', emote: 'G', pause: 'Esc', camera: 'Q R', run: 'Shift', sneak: 'Ctrl', more: 'R', random: 'Tab', rubout: 'Bksp', done: 'Enter', zoom: '+ -', tabs: 'Q R', fill: 'F', mirror: 'M', undo: 'Z', pick: 'E',
};
const PAD_FOR = {
  confirm: 'cross', back: 'circle', use: 'square', pockets: 'triangle', map: 'touch', almanac: 'ddown', emote: 'dleft', pause: 'options', camera: 'l2', run: 'circle', more: 'triangle', random: 'triangle', rubout: 'square', done: 'cross', zoom: 'stick', tools: 'l1', tabs: 'l1', fill: 'square', mirror: 'triangle', undo: 'l2', pick: 'cross',
};
const MOUSE_FOR = { confirm: MOUSE_L, pick: MOUSE_L, use: MOUSE_R, back: MOUSE_R };

function faceGlyph(hud, x, y, which, xbox) {
  const color = xbox ? XBOX_COLOR[which] : FACE_COLOR[which];
  hud.sprite(x, y - 1, ROUND, { '#': 'ink' }, { shadow: false });
  hud.sprite(x + 1, y, ROUND.slice(1, 8).map((r) => r.slice(1, 8)), { '#': 'white' }, { shadow: false });
  drawText(hud, x + 2, y + 1, xbox ? XBOX[which] : FACE[which], { color });
  return 10;
}
function capGlyph(hud, x, y, label) {
  const w = textWidth(label) + 6;
  hud.rect(x, y - 1, w, 10, 'ink');
  hud.rect(x + 1, y, w - 2, 7, 'white');
  hud.rect(x + 1, y + 7, w - 2, 1, 'mist');
  drawText(hud, x + 3, y, label, { color: 'ink' });
  return w;
}
const padCapLabel = (code, xbox) => { const s = SHOULDER[code]; return (s ? s[xbox ? 1 : 0] : code ?? '?').replace('↑', '^').replace('↓', 'v').replace('←', '<'); };
/** How wide drawPromptGlyph will draw this action, so a row of prompts can make room for it. */
export function promptGlyphWidth(action, device, xboxGlyphs, mouseUsed) {
  if (device === 'pad') { const code = PAD_FOR[action]; return FACE[code] ? 10 : textWidth(padCapLabel(code, xboxGlyphs)) + 6; }
  if (mouseUsed && MOUSE_FOR[action]) return 8;
  return textWidth(KEY_FOR[action] ?? action) + 6;
}
export function drawPromptGlyph(hud, x, y, action, device, xboxGlyphs, mouseUsed) {
  if (device === 'pad') {
    const code = PAD_FOR[action];
    if (FACE[code]) return faceGlyph(hud, x, y, code, xboxGlyphs);
    return capGlyph(hud, x, y, padCapLabel(code, xboxGlyphs));
  }
  if (mouseUsed && MOUSE_FOR[action]) {
    hud.sprite(x, y, MOUSE_FOR[action], COL, { shadow: false });
    return 8;
  }
  return capGlyph(hud, x, y, KEY_FOR[action] ?? action);
}
export const promptGlyphText = (action, device, xbox) => {
  if (device === 'pad') {
    const c = PAD_FOR[action];
    return FACE[c] ? (xbox ? XBOX[c] : FACE[c]) : (SHOULDER[c]?.[xbox ? 1 : 0] ?? c);
  }
  return KEY_FOR[action] ?? action;
};
export const WHEEL_ICON = WHEEL;
