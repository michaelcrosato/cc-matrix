// Every prompt glyph is inline SVG drawn here. data-glyph lets a test read what is showing.
const INK = '#1A1420', PAPER = '#FFF8EA';
const wrap = (id, inner, w = 64, h = 64) => `<svg class="glyph" data-glyph="${id}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${inner}</svg>`;
const disc = (fill = INK) => `<circle cx="32" cy="32" r="29" fill="${fill}" stroke="${INK}" stroke-width="4"/>`;
const label = (t, x = 32, y = 43, s = 30, c = PAPER) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="600" font-size="${s}" fill="${c}">${t}</text>`;
const pill = (t, w = 84, fill = INK) => `<rect x="3" y="11" rx="14" width="${w - 6}" height="42" fill="${fill}" stroke="${INK}" stroke-width="4"/>${label(t, w / 2, 43, 28)}`;

const PS = {
  cross: () => wrap('ps:cross', `${disc()}<path d="M21 21L43 43M43 21L21 43" stroke="#7FB4E8" stroke-width="6" stroke-linecap="round"/>`),
  circle: () => wrap('ps:circle', `${disc()}<circle cx="32" cy="32" r="13" fill="none" stroke="#E8707A" stroke-width="6"/>`),
  square: () => wrap('ps:square', `${disc()}<rect x="20" y="20" width="24" height="24" rx="2" fill="none" stroke="#E79AC4" stroke-width="6"/>`),
  triangle: () => wrap('ps:triangle', `${disc()}<path d="M32 17L47 43H17Z" fill="none" stroke="#6FD6B8" stroke-width="6" stroke-linejoin="round"/>`),
  l1: () => wrap('ps:l1', pill('L1'), 84), r1: () => wrap('ps:r1', pill('R1'), 84),
  l2: () => wrap('ps:l2', pill('L2'), 84), r2: () => wrap('ps:r2', pill('R2'), 84),
  options: () => wrap('ps:options', `${pill('', 84)}<path d="M28 25h28M28 32h28M28 39h28" stroke="${PAPER}" stroke-width="4" stroke-linecap="round"/>`, 84),
  lstick: () => wrap('ps:lstick', `${disc('#4A4453')}<circle cx="32" cy="32" r="18" fill="${INK}"/>${label('L', 32, 42, 26)}`),
  rstick: () => wrap('ps:rstick', `${disc('#4A4453')}<circle cx="32" cy="32" r="18" fill="${INK}"/>${label('R', 32, 42, 26)}`),
  dpad: () => wrap('ps:dpad', `<path d="M24 6h16v18h18v16H40v18H24V40H6V24h18Z" fill="${INK}"/>`),
};
const XB = {
  cross: () => wrap('xb:a', `${disc('#3C9B4A')}${label('A')}`),
  circle: () => wrap('xb:b', `${disc('#D1483F')}${label('B')}`),
  square: () => wrap('xb:x', `${disc('#3F73C8')}${label('X')}`),
  triangle: () => wrap('xb:y', `${disc('#D8A61F')}${label('Y')}`),
  l1: () => wrap('xb:lb', pill('LB'), 84), r1: () => wrap('xb:rb', pill('RB'), 84),
  l2: () => wrap('xb:lt', pill('LT'), 84), r2: () => wrap('xb:rt', pill('RT'), 84),
  options: () => wrap('xb:menu', `${pill('', 84)}<path d="M28 25h28M28 32h28M28 39h28" stroke="${PAPER}" stroke-width="4" stroke-linecap="round"/>`, 84),
  lstick: () => wrap('xb:lstick', `${disc('#4A4453')}<circle cx="32" cy="32" r="18" fill="${INK}"/>${label('L', 32, 42, 26)}`),
  rstick: () => wrap('xb:rstick', `${disc('#4A4453')}<circle cx="32" cy="32" r="18" fill="${INK}"/>${label('R', 32, 42, 26)}`),
  dpad: () => wrap('xb:dpad', `<path d="M24 6h16v18h18v16H40v18H24V40H6V24h18Z" fill="${INK}"/>`),
};
const key = (t, w = Math.max(64, 26 + t.length * 20)) => wrap(`key:${t.toLowerCase()}`,
  `<rect x="3" y="5" rx="10" width="${w - 6}" height="54" fill="${PAPER}" stroke="${INK}" stroke-width="4"/><rect x="3" y="5" rx="10" width="${w - 6}" height="46" fill="#fff" stroke="${INK}" stroke-width="4"/>${label(t, w / 2, 39, 28, INK)}`, w);
const mouse = (lit) => {
  const on = '#F5B700', off = PAPER;
  const L = lit === 'left' || lit === 'both' ? on : off, R = lit === 'right' || lit === 'both' ? on : off, W = lit === 'middle' ? on : off;
  const extra = lit === 'move' ? `<path d="M6 30l-5 4 5 4M58 30l5 4-5 4M28 4l4-4 4 4" fill="none" stroke="${INK}" stroke-width="3"/>` : lit === 'drag' ? `<path d="M2 34h8M54 34h8" stroke="${INK}" stroke-width="4"/>` : '';
  const R2 = lit === 'drag' ? on : R;
  return wrap(`mouse:${lit}`, `${extra}<rect x="14" y="6" rx="18" width="36" height="52" fill="${off}" stroke="${INK}" stroke-width="4"/>
  <path d="M32 6a18 18 0 0 0-18 18v4h18Z" fill="${L}" stroke="${INK}" stroke-width="3"/><path d="M32 6a18 18 0 0 1 18 18v4H32Z" fill="${R2}" stroke="${INK}" stroke-width="3"/>
  <rect x="28" y="12" width="8" height="14" rx="4" fill="${W}" stroke="${INK}" stroke-width="3"/>`);
};

// Each verb, per device. kbm lists every way to do it, keys first.
const VERBS = {
  lean: { pad: ['lstick'], kbm: [() => key('WASD'), () => mouse('move')] },
  move: { pad: ['lstick'], kbm: [() => key('WASD')] },
  steer: { pad: ['lstick'], kbm: [() => key('WASD'), () => mouse('move')] },
  footL: { pad: ['l2'], kbm: [() => key('Q'), () => mouse('left')] },
  footR: { pad: ['r2'], kbm: [() => key('E'), () => mouse('right')] },
  feet: { pad: ['l2', 'r2'], kbm: [() => key('Q'), () => key('E'), () => mouse('both')] },
  hop: { pad: ['cross'], kbm: [() => key('Space'), () => mouse('both')] },
  launch: { pad: ['cross'], kbm: [() => key('Space'), () => mouse('middle')] },
  flail: { pad: ['square'], kbm: [() => key('F'), () => mouse('middle')] },
  breathe: { pad: ['r1'], kbm: [() => key('Shift')] },
  ask: { pad: ['triangle'], kbm: [() => key('T')] },
  more: { pad: ['triangle'], kbm: [() => key('M')] },
  look: { pad: ['rstick'], kbm: [() => mouse('drag')] },
  use: { pad: ['cross'], kbm: [() => key('Enter'), () => mouse('left')] },
  interact: { pad: ['cross'], kbm: [() => key('E'), () => mouse('left')] },
  back: { pad: ['circle'], kbm: [() => key('Esc'), () => mouse('right')] },
  pause: { pad: ['options'], kbm: [() => key('Esc')] },
  page: { pad: ['l1', 'r1'], kbm: [() => key('PgUp'), () => key('PgDn')] },
  menu: { pad: ['dpad'], kbm: [() => key('Arrows'), () => mouse('move')] },
  recentre: { pad: [], kbm: [() => key('C')] },
  circle: { pad: ['lstick'], kbm: [() => key('A'), () => key('D'), () => mouse('move')] },
  join: { pad: ['cross'], kbm: [() => key('Enter')] },
};

export function glyphHTML(verb, device, set) {
  const v = VERBS[verb];
  if (!v) return '';
  if (device === 'pad') {
    const table = set === 'xbox' ? XB : PS;
    return v.pad.map((n) => table[n]()).join('');
  }
  return v.kbm.map((f) => f()).join('');
}
export function promptHTML(verb, text, device, set) {
  const g = glyphHTML(verb, device, set);
  if (!g) return '';
  return `<span class="prompt">${g}<span class="prompt-text">${text}</span></span>`;
}
