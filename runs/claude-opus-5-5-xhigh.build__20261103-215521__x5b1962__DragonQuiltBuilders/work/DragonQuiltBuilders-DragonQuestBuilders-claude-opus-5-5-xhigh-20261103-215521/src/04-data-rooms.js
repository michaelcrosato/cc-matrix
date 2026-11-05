// Data: room recipes (checked in priority order; the first match wins, otherwise a Snug) and the town levels.
(() => {
const DQ = globalThis.DQ;
DQ.ROOMS = [
  { id: 'hall', name: 'Quilters\' Hall', need: {}, pattern: 'hall', min: 50, max: 64, cheer: 100, maxAwards: 1, effect: 'A landmark! The Professor reads here.' },
  { id: 'guardPost', name: 'Guard Post', need: { rack: 1, light: 2 }, cheer: 30, maxAwards: 1, effect: 'Mortimer stands watch here.' },
  { id: 'smithy', name: 'Smithy', need: { forge: 1, chest: 1 }, cheer: 30, maxAwards: 1, effect: 'The Forge works faster inside.' },
  { id: 'kitchen', name: 'Kitchen', need: { hearth: 1, chest: 1 }, cheer: 25, maxAwards: 1, effect: 'Marigold cooks here.' },
  { id: 'messHall', name: 'Mess Hall', need: { table: 1, stool: 2 }, cheer: 25, maxAwards: 1, effect: 'Residents eat supper here.' },
  { id: 'workshop', name: 'Workshop', need: { bench: 1, chest: 1 }, cheer: 25, maxAwards: 1, effect: 'The Professor tinkers here.' },
  { id: 'bedroom', name: 'Bedroom', need: { bed: 1 }, cheer: 20, maxAwards: 3, effect: 'A bed for every resident!' },
  { id: 'snug', name: 'Snug', need: {}, cheer: 5, maxAwards: 3, effect: 'A cosy little room.' }
];
DQ.ROOM = {}; for (const r of DQ.ROOMS) DQ.ROOM[r.id] = r;
DQ.ROOM_RULE = { min: 2, max: 64, wallH: 2 };
DQ.LEVELS = [
  null,
  { lv: 1, cheer: 0, r: 10, unlocks: ['Mending Bench', 'Lattice Door', 'Straw Bed'], arrives: 'wren' },
  { lv: 2, cheer: 40, r: 13, unlocks: ['Cobble Patch', 'Stool', 'Plank Table', 'Plank Door', 'Plank Stairs', 'a Town Chest'], arrives: 'mortimer' },
  { lv: 3, cheer: 130, r: 16, unlocks: ['Dyes', 'Felt Patches', 'Quilted Vest', 'Cobble Stairs', 'Glow Patch'], arrives: 'marigold' },
  { lv: 4, cheer: 250, r: 18, unlocks: ['Pin Trap', 'Moth Lantern'], arrives: 'professor' },
  { lv: 5, cheer: 450, r: 20, unlocks: ['Hearty Pie for everyone!'], arrives: null }
];
DQ.MAX_LEVEL = 5;
})();
