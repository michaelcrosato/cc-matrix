/** Prompt glyphs. Every element the UI draws carries data-glyph. */

const VERBS = {
  weight: { pad: 'stick', key: 'wasd', mouse: 'move' },
  leftFoot: { pad: 'l2', key: 'q', mouse: 'mouse-left' },
  rightFoot: { pad: 'r2', key: 'e', mouse: 'mouse-right' },
  hop: { pad: 'cross', key: 'space', mouse: 'mouse-both' },
  flail: { pad: 'square', key: 'f', mouse: 'mouse-middle' },
  breathe: { pad: 'r1', key: 'shift', mouse: 'shift' },
  ask: { pad: 'triangle', key: 't', mouse: 't' },
  use: { pad: 'cross', key: 'enter', mouse: 'mouse-left' },
  back: { pad: 'circle', key: 'esc', mouse: 'mouse-right' },
  pause: { pad: 'options', key: 'esc', mouse: 'esc' },
  look: { pad: 'rstick', key: 'mouse', mouse: 'drag' },
  confirm: { pad: 'cross', key: 'enter', mouse: 'mouse-left' },
};

const XBOX = {
  cross: 'a',
  circle: 'b',
  square: 'x',
  triangle: 'y',
  l1: 'lb',
  r1: 'rb',
  l2: 'lt',
  r2: 'rt',
  options: 'menu',
  create: 'view',
  stick: 'ls',
  rstick: 'rs',
};

export function glyphFor(verb, device, set = 'playstation') {
  const row = VERBS[verb] || VERBS.use;
  if (device === 'mouse') return row.mouse;
  if (device === 'key') return row.key;
  const id = row.pad;
  if (set === 'xbox' && XBOX[id]) return XBOX[id];
  return id;
}

export function promptFor(verbs, device, set = 'playstation') {
  return verbs.map((verb) => ({
    verb,
    glyph: glyphFor(verb, device, set),
    device,
    set: device === 'pad' ? set : device,
  }));
}

/** Inline SVG. Tests read data-glyph, not the picture. */
export function glyphSvg(glyph) {
  const ink = '#1A1420';
  const common = `data-glyph="${glyph}" width="36" height="36" viewBox="0 0 36 36"`;
  const shapes = {
    cross: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#8fd0ff" stroke="${ink}" stroke-width="3"/><path d="M12 12 L24 24 M24 12 L12 24" stroke="${ink}" stroke-width="3"/></svg>`,
    circle: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#ffb4c8" stroke="${ink}" stroke-width="3"/><circle cx="18" cy="18" r="6" fill="none" stroke="${ink}" stroke-width="3"/></svg>`,
    square: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#ffd0e0" stroke="${ink}" stroke-width="3"/><rect x="11" y="11" width="14" height="14" fill="none" stroke="${ink}" stroke-width="3"/></svg>`,
    triangle: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#b8f0c8" stroke="${ink}" stroke-width="3"/><path d="M18 10 L26 24 L10 24 Z" fill="none" stroke="${ink}" stroke-width="3"/></svg>`,
    l2: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M10 24 V12 H16 M14 18 H20" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    r2: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M12 12 H20 M16 12 V24 M22 12 V24" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    r1: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M12 12 H20 M16 12 V24 M22 14 V22" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    l1: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M10 24 V12 H16 M22 14 V22" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    options: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#fff" stroke="${ink}" stroke-width="3"/><path d="M12 18 H24 M18 14 V22" stroke="${ink}" stroke-width="3"/></svg>`,
    stick: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#efe7da" stroke="${ink}" stroke-width="3"/><circle cx="18" cy="16" r="5" fill="${ink}"/></svg>`,
    rstick: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#efe7da" stroke="${ink}" stroke-width="3"/><circle cx="20" cy="18" r="5" fill="${ink}"/></svg>`,
    a: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#7dffb3" stroke="${ink}" stroke-width="3"/><path d="M12 24 L18 11 L24 24 M14 20 H22" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    b: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#ff8b8b" stroke="${ink}" stroke-width="3"/><path d="M13 11 H20 A5 5 0 0 1 20 21 H13 Z M13 16 H19" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    x: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#8fd0ff" stroke="${ink}" stroke-width="3"/><path d="M12 12 L24 24 M24 12 L12 24" stroke="${ink}" stroke-width="3"/></svg>`,
    y: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#ffe08a" stroke="${ink}" stroke-width="3"/><path d="M11 12 L18 20 L25 12 M18 20 V25" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    lt: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M9 24 V12 H15 M20 12 H26 M23 12 V24" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    rt: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M10 12 H16 M13 12 V24 M20 12 H26 M23 12 V24" stroke="${ink}" stroke-width="3" fill="none"/></svg>`,
    lb: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M9 24 V12 H15 M19 12 H25 A4 4 0 0 1 25 22 H19 Z" stroke="${ink}" stroke-width="2.5" fill="none"/></svg>`,
    rb: `<svg ${common}><rect x="4" y="8" width="28" height="20" rx="6" fill="#fff6e4" stroke="${ink}" stroke-width="3"/><path d="M10 12 H16 M13 12 V24 M19 12 H25 A4 4 0 0 1 25 22 H19 Z" stroke="${ink}" stroke-width="2.5" fill="none"/></svg>`,
    menu: `<svg ${common}><rect x="6" y="8" width="24" height="20" rx="4" fill="#fff" stroke="${ink}" stroke-width="3"/><path d="M11 16 H25 M11 21 H25" stroke="${ink}" stroke-width="2"/></svg>`,
    view: `<svg ${common}><rect x="6" y="8" width="24" height="20" rx="4" fill="#fff" stroke="${ink}" stroke-width="3"/><rect x="14" y="14" width="8" height="8" fill="${ink}"/></svg>`,
    ls: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#efe7da" stroke="${ink}" stroke-width="3"/><circle cx="14" cy="18" r="4" fill="${ink}"/></svg>`,
    rs: `<svg ${common}><circle cx="18" cy="18" r="15" fill="#efe7da" stroke="${ink}" stroke-width="3"/><circle cx="22" cy="18" r="4" fill="${ink}"/></svg>`,
  };
  if (shapes[glyph]) return shapes[glyph];
  return `<svg ${common}><rect x="4" y="6" width="28" height="24" rx="6" fill="#fffaf2" stroke="${ink}" stroke-width="3"/><path d="M12 23 V13 H18 M22 13 V23" stroke="${ink}" stroke-width="3" fill="none"/></svg>`;
}
