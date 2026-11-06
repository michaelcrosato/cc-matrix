/** Prompt marks. One colour key each, drawn by the HUD. */
export const GLYPH = {
  cross: ['..rr..', '.rrrr.', 'rr..rr', 'rr..rr', '.rrrr.', '..rr..'],
  circle: ['..cc..', '.c..c.', 'c....c', 'c....c', '.c..c.', '..cc..'],
  square: ['pppppp', 'p....p', 'p....p', 'p....p', 'p....p', 'pppppp'],
  triangle: ['...t...', '..ttt..', '.t...t.', 't.....t', 'ttttttt'],
  xbox: ['..gg..', '.g..g.', 'g....g', 'g....g', '.g..g.', '..gg..'],
  key: ['kkkk.', 'k..k.', 'kkkk.', 'k....', 'k....'],
  mouse: ['..mm..', '.m..m.', '.m..m.', '..mm..', '...m..'],
};

export const GLYPH_COLOR = {
  cross: { r: 'red' },
  circle: { c: 'red' },
  square: { p: 'plum' },
  triangle: { t: 'lime' },
  xbox: { g: 'lime' },
  key: { k: 'sand' },
  mouse: { m: 'white' },
};
