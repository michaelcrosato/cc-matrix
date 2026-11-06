// All glyphs are inline SVG / keycaps, every one carries data-glyph for tests.
const INKC = '#1A1420';
const circ = (fill, inner) => `<svg viewBox="0 0 40 40" class="gl"><circle cx="20" cy="20" r="17" fill="${fill}" stroke="${INKC}" stroke-width="3"/>${inner}</svg>`;
const PS = {
  ok: circ('#DDEBFF', `<path d="M12 12l16 16M28 12L12 28" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>`),
  back: circ('#FFE1E0', `<circle cx="20" cy="20" r="8" fill="none" stroke="#E8443A" stroke-width="4"/>`),
  flail: circ('#FFE3F1', `<rect x="12" y="12" width="16" height="16" fill="none" stroke="#E0579B" stroke-width="4"/>`),
  ask: circ('#DFF7E3', `<path d="M20 10L30 28H10Z" fill="none" stroke="#22A04B" stroke-width="4" stroke-linejoin="round"/>`),
};
const XB = { ok: ['A', '#BFF0C8'], back: ['B', '#FFC9C4'], flail: ['X', '#C7DAFF'], ask: ['Y', '#FFEFA8'] };
const pill = (t, cls = '') => `<svg viewBox="0 0 64 40" class="gl wide ${cls}"><rect x="3" y="5" width="58" height="30" rx="13" fill="#EDEDED" stroke="${INKC}" stroke-width="3"/><text x="32" y="26" text-anchor="middle" font-size="17" font-weight="700" fill="${INKC}" font-family="Fredoka,sans-serif">${t}</text></svg>`;
const stick = (label) => `<svg viewBox="0 0 40 40" class="gl"><circle cx="20" cy="20" r="17" fill="#EDEDED" stroke="${INKC}" stroke-width="3"/><circle cx="20" cy="20" r="8" fill="#9AA" stroke="${INKC}" stroke-width="2.5"/><text x="20" y="24" text-anchor="middle" font-size="10" font-weight="700" fill="${INKC}" font-family="Fredoka,sans-serif">${label}</text></svg>`;
const dpad = `<svg viewBox="0 0 40 40" class="gl"><path d="M14 4h12v10h10v12H26v10H14V26H4V14h10z" fill="#EDEDED" stroke="${INKC}" stroke-width="3" stroke-linejoin="round"/></svg>`;
const cap = (t) => `<span class="keycap">${t}</span>`;
const mouse = (lit) => `<svg viewBox="0 0 40 52" class="gl mouse"><rect x="6" y="3" width="28" height="46" rx="14" fill="#fff" stroke="${INKC}" stroke-width="3"/><path d="M6 24h28M20 3v21" stroke="${INKC}" stroke-width="2.5" fill="none"/>${lit === 'L' || lit === 'LR' ? '<path d="M7 24V16a13 13 0 0 1 13-12v20z" fill="#F5B700"/>' : ''}${lit === 'R' || lit === 'LR' ? '<path d="M33 24V16A13 13 0 0 0 20 4v20z" fill="#F5B700"/>' : ''}${lit === 'M' ? '<rect x="17" y="8" width="6" height="13" rx="3" fill="#F5B700"/>' : ''}<path d="M6 24h28M20 3v21" stroke="${INKC}" stroke-width="2.5" fill="none"/></svg>`;

const KEY = { ok: 'Enter', back: 'Esc', hop: 'Space', flail: 'F', feetL: 'Q', feetR: 'E', feet: 'Q E', breathe: 'Shift', ask: 'T', pause: 'Esc', pageL: 'Q', pageR: 'E', recentre: 'C', use: 'E' };
export function glyph(action, device, set) {
  const tag = (inner, id) => `<span class="glyph" data-glyph="${id}">${inner}</span>`;
  if (device === 'pad') {
    const xb = set === 'xbox';
    const mp = {
      ok: xb ? 'A' : 'cross', back: xb ? 'B' : 'circle', flail: xb ? 'X' : 'square', ask: xb ? 'Y' : 'triangle', hop: xb ? 'A' : 'cross', use: xb ? 'A' : 'cross',
      feetL: xb ? 'LT' : 'L2', feetR: xb ? 'RT' : 'R2', feet: xb ? 'LT RT' : 'L2 R2', breathe: xb ? 'RB' : 'R1', pause: xb ? 'Menu' : 'Options',
      move: 'stick', look: 'rstick', nav: 'dpad', pageL: xb ? 'LB' : 'L1', pageR: xb ? 'RB' : 'R1', both: xb ? 'LT RT' : 'L2 R2',
    };
    const k = mp[action] || action; const id = (xb ? 'xbox:' : 'ps:') + k;
    let inner;
    if (k === 'cross') inner = PS.ok; else if (k === 'circle') inner = PS.back; else if (k === 'square') inner = PS.flail; else if (k === 'triangle') inner = PS.ask;
    else if (['A', 'B', 'X', 'Y'].includes(k)) { const x = XB[{ A: 'ok', B: 'back', X: 'flail', Y: 'ask' }[k]]; inner = circ(x[1], `<text x="20" y="27" text-anchor="middle" font-size="20" font-weight="700" fill="${INKC}" font-family="Fredoka,sans-serif">${k}</text>`); }
    else if (k === 'stick') inner = stick('L'); else if (k === 'rstick') inner = stick('R'); else if (k === 'dpad') inner = dpad;
    else if (k.includes(' ')) inner = k.split(' ').map((t) => pill(t)).join(''); else inner = pill(k);
    return tag(inner, id);
  }
  const m = { move: cap('WASD'), look: mouse('R'), nav: cap('Arrows'), both: mouse('LR'), feetL: mouse('L') + cap('Q'), feetR: mouse('R') + cap('E'), feet: mouse('LR') + cap('Q') + cap('E'), flail: cap('F') + mouse('M'), hop: cap('Space') };
  if (m[action]) return tag(m[action], 'kbm:' + action);
  return tag(cap(KEY[action] || action), 'kbm:' + (KEY[action] || action));
}
export function promptBar(items, device, set) {
  return items.map(([a, label]) => `<span class="pr">${glyph(a, device, set)}<span class="pl">${label}</span></span>`).join('');
}
