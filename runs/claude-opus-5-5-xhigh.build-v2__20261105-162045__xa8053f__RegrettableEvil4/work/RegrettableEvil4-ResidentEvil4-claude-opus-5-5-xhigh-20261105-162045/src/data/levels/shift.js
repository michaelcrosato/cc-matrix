// Night Shift: a 4-minute hold-out on the quay at night in the rain, solo or co-op.
import { dressQuay, QUAY_BACKDROP, QUAY_BUILD, QUAY_THEME } from './quay.js';

export const shift = {
  id: 'shift',
  title: 'NIGHT SHIFT',
  map: 'quay',
  mood: 'rain',
  chapter: 2,
  music: 'siege',
  noFathom: true,
  noDame: true,
  water: { y: -0.35 },
  ambience: [['rainLoop', 0.6], ['seaLoop', 0.25]],
  theme: QUAY_THEME,
  build: { ...QUAY_BUILD, brine: [[34, 22], [24, 14], [20, 25], [38, 21]] },
  backdrop: QUAY_BACKDROP,
  chests: [],
  items: [],
  setup(area, ctx) {
    dressQuay(area, ctx);
    // Every door is open tonight: nothing here to hide behind but each other.
    for (const d of area.level.doors) { area.level.openDoor(d, d.x, d.z - 1); }
    for (const w of area.level.windows) area.breakWindow(w);
    for (const g of area.level.gates) { /* the west gate stays shut */ void g; }
  },
};
