// Every glyph is inline SVG, drawn in code. Every element carries data-glyph.
const INK = '#1A1420';
const face = (inner, fill = '#FFF8EE', w = 56) => `<svg viewBox="0 0 ${w} 56" width="${w * .9}" height="50" aria-hidden="true"><rect x="2" y="2" width="${w - 4}" height="52" rx="14" fill="${fill}" stroke="${INK}" stroke-width="4"/>${inner}</svg>`;
const round = (inner, fill = '#FFF8EE') => `<svg viewBox="0 0 56 56" width="50" height="50" aria-hidden="true"><circle cx="28" cy="28" r="25" fill="${fill}" stroke="${INK}" stroke-width="4"/>${inner}</svg>`;
const text = (t, size = 26, y = 37, w = 56) => `<text x="${w / 2}" y="${y}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="600" font-size="${size}" fill="${INK}">${t}</text>`;
const PS = {
  cross: round(`<path d="M18 18 L38 38 M38 18 L18 38" stroke="#3B6FD8" stroke-width="5" stroke-linecap="round"/>`),
  circle: round(`<circle cx="28" cy="28" r="12" fill="none" stroke="#E8443A" stroke-width="5"/>`),
  square: round(`<rect x="17" y="17" width="22" height="22" fill="none" stroke="#D45FB0" stroke-width="5"/>`),
  triangle: round(`<path d="M28 15 L41 38 L15 38 Z" fill="none" stroke="#22A67A" stroke-width="5" stroke-linejoin="round"/>`),
  l2: face(text('L2', 24)), r2: face(text('R2', 24)), r1: face(text('R1', 24)), l1: face(text('L1', 24)),
  options: face(text('OPT', 18, 35, 74), '#FFF8EE', 74),
};
const XB = {
  cross: round(text('A'), '#BFE8A8'), circle: round(text('B'), '#F4B0A8'), square: round(text('X'), '#B4CCF4'), triangle: round(text('Y'), '#F7E08A'),
  l2: face(text('LT', 24)), r2: face(text('RT', 24)), r1: face(text('RB', 24)), l1: face(text('LB', 24)), options: face(text('MENU', 15, 34, 74), '#FFF8EE', 74),
};
const stick = (lbl) => round(`<circle cx="28" cy="28" r="13" fill="#D9D3C4" stroke="${INK}" stroke-width="3"/>${text(lbl, 16, 34)}`);
const dpad = round(`<path d="M22 12h12v10h10v12H34v10H22V34H12V22h10z" fill="#D9D3C4" stroke="${INK}" stroke-width="3"/>`);
const key = (t) => { const w = Math.max(56, 26 + t.length * 15); return `<svg viewBox="0 0 ${w} 56" width="${w * .9}" height="50" aria-hidden="true"><rect x="2" y="2" width="${w - 4}" height="48" rx="9" fill="#FFF8EE" stroke="${INK}" stroke-width="4"/><rect x="2" y="46" width="${w - 4}" height="8" rx="4" fill="${INK}"/>${text(t, t.length > 3 ? 20 : 26, 34, w)}</svg>`; };
const mouse = (lit) => { const m = (b) => lit.includes(b) ? '#E8443A' : '#FFF8EE'; return `<svg viewBox="0 0 44 56" width="40" height="50" aria-hidden="true"><path d="M4 22 a18 18 0 0 1 18 -18 v18 z" fill="${m('l')}" stroke="${INK}" stroke-width="3"/><path d="M40 22 a18 18 0 0 0 -18 -18 v18 z" fill="${m('r')}" stroke="${INK}" stroke-width="3"/><path d="M4 22 h36 v12 a18 18 0 0 1 -36 0 z" fill="#FFF8EE" stroke="${INK}" stroke-width="3"/><rect x="19" y="8" width="6" height="12" rx="3" fill="${m('m')}" stroke="${INK}" stroke-width="2"/></svg>`; };
// Which parts each verb uses, per device.
const VERBS = {
  lean:    { pad: [['stickL', 'stick']], kbm: [['key:WASD', 'WASD'], ['mouse:move', 'mouse']] },
  walk:    { pad: [['stickL', 'stick']], kbm: [['key:WASD', 'WASD']] },
  look:    { pad: [['stickR', 'stick']], kbm: [['mouse:r', 'mouse']] },
  left:    { pad: [['l2', 'L2']], kbm: [['key:Q', 'Q'], ['mouse:l', 'mouse']] },
  right:   { pad: [['r2', 'R2']], kbm: [['key:E', 'E'], ['mouse:r', 'mouse']] },
  feet:    { pad: [['l2', 'L2'], ['r2', 'R2']], kbm: [['key:Q', 'Q'], ['key:E', 'E']] },
  hop:     { pad: [['cross', 'x']], kbm: [['key:Space', 'Space'], ['mouse:lr', 'mouse']] },
  flail:   { pad: [['square', 's']], kbm: [['key:F', 'F'], ['mouse:m', 'mouse']] },
  breath:  { pad: [['r1', 'R1']], kbm: [['key:Shift', 'Shift']] },
  ask:     { pad: [['triangle', 't']], kbm: [['key:T', 'T']] },
  use:     { pad: [['cross', 'x']], kbm: [['key:Enter', 'Enter'], ['mouse:l', 'mouse']] },
  useIsl:  { pad: [['cross', 'x']], kbm: [['key:E', 'E'], ['mouse:l', 'mouse']] },
  back:    { pad: [['circle', 'o']], kbm: [['key:Esc', 'Esc'], ['mouse:r', 'mouse']] },
  pause:   { pad: [['options', 'opt']], kbm: [['key:Esc', 'Esc']] },
  move:    { pad: [['dpad', 'dpad']], kbm: [['key:Arrows', 'Arrows']] },
  recentre:{ pad: [], kbm: [['key:C', 'C']] },
  circle:  { pad: [['stickL', 'stick']], kbm: [['key:A', 'A'], ['key:D', 'D'], ['mouse:move', 'mouse']] },
  more:    { pad: [['triangle', 't']], kbm: [['key:M', 'M']] },
};
let xbox = false;
export const setGlyphStyle = (s) => { xbox = s === 'xbox'; };
export const glyphStyle = () => (xbox ? 'xbox' : 'ps');
function one(id) {
  if (id === 'stickL') return stick('L'); if (id === 'stickR') return stick('R'); if (id === 'dpad') return dpad;
  if (id.startsWith('key:')) return key(id.slice(4));
  if (id.startsWith('mouse:')) { const b = id.slice(6); return mouse(b === 'move' ? '' : b); }
  return (xbox ? XB : PS)[id] || '';
}
export function glyphHtml(verb, device) {
  const d = device === 'pad' ? 'pad' : 'kbm'; const v = VERBS[verb]; if (!v) return '';
  return v[d].map(([id]) => `<span class="glyph" data-glyph="${d === 'pad' ? (xbox ? 'xbox' : 'ps') + ':' : 'kbm:'}${id}">${one(id)}</span>`).join('');
}
export const VERB_NAMES = Object.keys(VERBS);
