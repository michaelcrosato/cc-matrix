export const UNLOCKS = [
  { at: 6, kind: 'hat', id: 1, name: 'Visor' }, { at: 14, kind: 'paint', id: 4, name: 'Plum paint' }, { at: 24, kind: 'hat', id: 2, name: 'Beret' },
  { at: 36, kind: 'hat', id: 3, name: 'Bucket hat' }, { at: 50, kind: 'hat', id: 5, name: 'Wizard hat' }, { at: 60, kind: 'hat', id: 6, name: 'Tiny crown' },
];
export const PAINT_UNLOCKS = { 4: 14, 5: 20, 6: 30, 7: 44, 8: 55, 9: 62 };
export const hatLocked = (id, marbles) => { const u = UNLOCKS.find((x) => x.kind === 'hat' && x.id === id); return u ? marbles < u.at : false; };
export const paintLocked = (id, marbles) => (id >= 4 ? marbles < (PAINT_UNLOCKS[id] || 14) : false);
