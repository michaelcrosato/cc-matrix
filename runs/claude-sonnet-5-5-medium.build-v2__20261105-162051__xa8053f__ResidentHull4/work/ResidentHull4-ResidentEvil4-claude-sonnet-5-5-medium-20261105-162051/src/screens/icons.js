// Procedural item pictograms drawn from rectangles (so the Case needs no art files).
import { ITEMS, VALUABLES } from '../data/items.js';
import { WEAPONS } from '../data/weapons.js';

/** Draw an icon for an entry inside the box (x,y,w,h). */
export function drawIcon(ui, kind, id, x, y, w, h, rot = 0) {
  const R = (dx, dy, ww, hh, c) => ui.rect(Math.round(x + dx * w), Math.round(y + dy * h), Math.max(1, Math.round(ww * w)), Math.max(1, Math.round(hh * h)), c);
  if (kind === 'weapon') {
    if (rot) { // vertical layout
      if (id === 'pistol') { R(0.3, 0.1, 0.4, 0.5, 'slate'); R(0.3, 0.55, 0.3, 0.4, 'orange'); return; }
      R(0.35, 0.05, 0.3, 0.6, 'slate'); R(0.3, 0.65, 0.4, 0.3, 'orange'); return;
    }
    if (id === 'pistol') { R(0.1, 0.2, 0.7, 0.3, 'slate'); R(0.15, 0.5, 0.2, 0.4, 'orange'); R(0.8, 0.28, 0.1, 0.1, 'white'); }
    else if (id === 'scatter') { R(0.05, 0.4, 0.9, 0.18, 'slate'); R(0.02, 0.5, 0.35, 0.3, 'orange'); R(0.9, 0.35, 0.06, 0.1, 'white'); }
    else if (id === 'rifle') { R(0.05, 0.45, 0.9, 0.14, 'night'); R(0.02, 0.5, 0.3, 0.3, 'plum'); R(0.35, 0.25, 0.3, 0.14, 'sand'); }
    else { R(0.05, 0.4, 0.8, 0.2, 'slate'); R(0.4, 0.28, 0.55, 0.1, 'cyan'); R(0.03, 0.5, 0.25, 0.3, 'orange'); }
    return;
  }
  const d = ITEMS[id];
  if (!d) { R(0.2, 0.2, 0.6, 0.6, 'mist'); return; }
  const col = d.color || 'sand';
  if (d.kind === 'ammo') { R(0.1, 0.2, 0.8, 0.6, 'slate'); for (let i = 0; i < 4; i++) R(0.18 + i * 0.18, 0.28, 0.1, 0.4, col); }
  else if (d.kind === 'herb') { R(0.42, 0.1, 0.16, 0.8, 'green'); R(0.2, 0.2, 0.25, 0.14, col); R(0.55, 0.45, 0.25, 0.14, col); R(0.25, 0.6, 0.2, 0.12, col); if (id === 'tin') { R(0.1, 0.25, 0.8, 0.5, 'white'); R(0.42, 0.3, 0.16, 0.4, 'red'); R(0.3, 0.42, 0.4, 0.16, 'red'); } }
  else if (d.kind === 'grenade') { R(0.3, 0.3, 0.4, 0.55, col); R(0.4, 0.12, 0.2, 0.18, 'slate'); }
  else R(0.2, 0.2, 0.6, 0.6, col);
}
export function drawValuable(ui, id, x, y, s) {
  const c = { pearl: 'white', blackpearl: 'night', seaglass: 'cyan', amber: 'orange', scrimshaw: 'sand', goldtooth: 'sand', reliquary: 'red' }[id] || 'mist';
  ui.rect(x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.6, c); ui.rect(x + s * 0.3, y + s * 0.3, s * 0.15, s * 0.15, 'white');
}
export { WEAPONS, VALUABLES };
