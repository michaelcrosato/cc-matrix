// Every item. Footprint is in Case cells; `max` is how much stacks in that footprint.
export const ITEMS = {
  // Weapons (data in weapons.js; footprints repeated so the Case needs only this table)
  pistol: { name: 'OSTRANDER .38', kind: 'weapon', w: 3, h: 2, icon: 'pistol', text: 'SERVICE REVOLVER. A HEADSHOT CAN END A CLAIM OUTRIGHT.', sell: 200 },
  scatter: { name: "BOSUN'S SCATTERGUN", kind: 'weapon', w: 7, h: 2, icon: 'scatter', text: 'SAWN-OFF PUMP. EVERYTHING IN FRONT OF YOU BECOMES A CLAIM.', sell: 450 },
  rifle: { name: "SEALER'S RIFLE", kind: 'weapon', w: 8, h: 2, icon: 'rifle', text: 'LONG BOLT-ACTION WITH A BRASS SCOPE. PIERCES ONE BODY.', sell: 900 },
  harpoon: { name: 'HARPOON GUN', kind: 'weapon', w: 6, h: 2, icon: 'harpoon', text: 'PINS A TARGET TO WHATEVER IS BEHIND IT.', sell: 1300 },
  // Ammo
  ammoPistol: { name: '.38 ROUNDS', kind: 'ammo', w: 2, h: 1, max: 50, pickup: 12, icon: 'ammoPistol', for: 'pistol', text: 'BOX OF .38. COMPANY ISSUE. THE COMPANY WOULD LIKE THE BOX BACK.', sell: 40 },
  ammoShells: { name: 'SHELLS', kind: 'ammo', w: 2, h: 1, max: 24, pickup: 5, icon: 'ammoShells', for: 'scatter', text: 'BUCKSHOT. WAXED CARD CASES. SMELLS OF COD.', sell: 60 },
  ammoRifle: { name: 'RIFLE ROUNDS', kind: 'ammo', w: 2, h: 1, max: 20, pickup: 4, icon: 'ammoRifle', for: 'rifle', text: 'FOR SEALS, ORIGINALLY.', sell: 80 },
  ammoBolts: { name: 'HARPOON BOLTS', kind: 'ammo', w: 3, h: 1, max: 6, pickup: 2, icon: 'ammoBolts', for: 'harpoon', text: 'A BARBED IRON BOLT. MR. FATHOM SOLD FOUR HUNDRED OF THESE TO SOMEONE.', sell: 100 },
  // Herbs and medicine
  samphire: { name: 'SAMPHIRE', kind: 'herb', w: 1, h: 2, icon: 'samphire', heal: 0.3, text: 'SALT-MARSH GREEN. RESTORES SOME COVERAGE. COMBINE IT.', sell: 30 },
  dulse: { name: 'DULSE', kind: 'herb', w: 1, h: 2, icon: 'dulse', heal: 0, text: 'RED SEAWEED. DOES NOTHING ALONE. WITH SAMPHIRE, HEALS IN FULL.', sell: 30 },
  holly: { name: 'SEA HOLLY', kind: 'herb', w: 1, h: 2, icon: 'holly', heal: 0, text: 'YELLOW AND SPINY. MIXED IN, RAISES YOUR COVERAGE LIMIT.', sell: 60 },
  mixS2: { name: 'DOUBLE SAMPHIRE', kind: 'herb', w: 1, h: 2, icon: 'mixS2', heal: 0.6, text: 'TWO SAMPHIRE. RESTORES 60%.', sell: 60 },
  mixS3: { name: 'TRIPLE SAMPHIRE', kind: 'herb', w: 1, h: 2, icon: 'mixS3', heal: 1, text: 'THREE SAMPHIRE. RESTORES EVERYTHING.', sell: 90 },
  mixSD: { name: 'SAMPHIRE AND DULSE', kind: 'herb', w: 1, h: 2, icon: 'mixSD', heal: 1, text: 'RESTORES EVERYTHING.', sell: 90 },
  mixSDH: { name: 'THE FULL POLICY', kind: 'herb', w: 1, h: 2, icon: 'mixSDH', heal: 1, maxUp: 10, text: 'RESTORES EVERYTHING AND RAISES YOUR LIMIT BY 10.', sell: 180 },
  tin: { name: 'FIRST-AID TIN', kind: 'herb', w: 1, h: 2, icon: 'tin', heal: 1, text: 'COMPANY FIRST-AID TIN. RESTORES EVERYTHING. KEEP THE RECEIPT.', sell: 200 },
  // Grenades
  flare: { name: 'MAGNESIUM FLARE', kind: 'grenade', w: 1, h: 2, icon: 'flare', text: 'BLINDS EVERYONE NEAR IT. KILLS EVERY LIMPET IT TOUCHES.', sell: 120 },
  depth: { name: 'DEPTH CHARGE', kind: 'grenade', w: 1, h: 2, icon: 'depth', text: 'A SHORT FUSE AND A BIG OPINION. 4 METRES.', sell: 150 },
  oil: { name: 'WHALE-OIL BOTTLE', kind: 'grenade', w: 1, h: 2, icon: 'oil', text: 'LEAVES A BURNING POOL.', sell: 90 },
};

// Treasure goes on the Valuables tab: no footprint. Mr. Fathom pays full listed value.
export const TREASURE = {
  pearl: { name: 'PEARL', value: 500, icon: 'pearl', text: 'A GOOD ROUND PEARL. A SOCKET IN THE RELIQUARY WOULD FIT IT.' },
  blackPearl: { name: 'BLACK PEARL', value: 1500, icon: 'blackPearl', text: 'NOBODY KNOWS WHAT IT GREW IN. A SOCKET IN THE RELIQUARY WOULD FIT IT.' },
  seaGlass: { name: 'SEA GLASS SET', value: 400, icon: 'seaGlass', text: 'A TIED BUNDLE OF SMOOTH GLASS FROM SHIPS THAT DID NOT COME HOME.' },
  amber: { name: 'AMBER', value: 700, icon: 'amber', text: 'SOMETHING SMALL IS STUCK IN IT, AND LOOKING AT YOU. A SOCKET WOULD FIT IT.' },
  scrimshaw: { name: 'SCRIMSHAW TUSK', value: 900, icon: 'scrimshaw', text: 'CARVED WITH A LIST OF NAMES. THE LAST ONE IS STILL WET.' },
  goldTooth: { name: 'GOLD TOOTH', value: 150, icon: 'goldTooth', text: 'NOT YOURS. NOBODY ELSE IS USING IT.' },
  reliquary: { name: 'EMPTY RELIQUARY', value: 1200, icon: 'reliquary', sockets: 3, text: 'THREE EMPTY SOCKETS: PEARL, BLACK PEARL, AMBER. FULL, IT IS WORTH 8000.' },
  reliquaryFull: { name: 'FULL RELIQUARY', value: 8000, icon: 'reliquary', text: 'ALL THREE SOCKETS FILLED. IT HUMS WHEN THE TIDE TURNS.' },
};
export const RELIQUARY_SOCKETS = ['pearl', 'blackPearl', 'amber'];

export const KEY_ITEMS = {
  coldKey: { name: 'COLD ROOM KEY', icon: 'key', text: 'FROM THE FLENSER. IT IS WARM. DO NOT THINK ABOUT IT.' },
  chart: { name: 'TANNOY CHART', icon: 'chart', text: 'THE MAP TAB NOW MARKS THE LOUDSPEAKERS.' },
  crypt: { name: 'SEXTON\'S LEVER', icon: 'key', text: 'THE DAME TOOK IT OFF THE WALL. SHE SAYS IT WAS LOOSE.' },
  tithe: { name: 'THE TITHE PAPERS', icon: 'chart', text: 'THE RENEWAL. UNSIGNED. SHE WOULD LIKE THAT NOTED.' },
};

export const COMBINE_RECIPES = [
  { a: 'samphire', b: 'samphire', out: 'mixS2' },
  { a: 'mixS2', b: 'samphire', out: 'mixS3' },
  { a: 'samphire', b: 'dulse', out: 'mixSD' },
  { a: 'mixSD', b: 'holly', out: 'mixSDH' },
  { a: 'samphire', b: 'mixSD', out: 'mixS3' }, // a generous mistake
];
export function recipeFor(a, b) {
  return COMBINE_RECIPES.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))?.out ?? null;
}

// Doubloon pickup appearance.
export const MONEY = { min: 25, max: 80 };
