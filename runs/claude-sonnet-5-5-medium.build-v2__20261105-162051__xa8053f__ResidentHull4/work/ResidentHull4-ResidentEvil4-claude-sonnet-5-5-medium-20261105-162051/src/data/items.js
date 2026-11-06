// Items. fp [w,h] cells; stack = ammo per box.
export const ITEMS = {
  ammo_pistol: { id: 'ammo_pistol', name: 'PISTOL ROUNDS', kind: 'ammo', fp: [2, 1], stack: 50, price: 60, sell: 20, text: 'BOX OF .38 ROUNDS.', color: 'sand' },
  ammo_shells: { id: 'ammo_shells', name: 'SHELLS', kind: 'ammo', fp: [2, 1], stack: 24, price: 90, sell: 30, text: 'SHOTGUN SHELLS, BRASS HEADED.', color: 'red' },
  ammo_rifle: { id: 'ammo_rifle', name: 'RIFLE ROUNDS', kind: 'ammo', fp: [2, 1], stack: 20, price: 110, sell: 40, text: 'LONG BRASS CASES.', color: 'orange' },
  ammo_bolts: { id: 'ammo_bolts', name: 'HARPOON BOLTS', kind: 'ammo', fp: [3, 1], stack: 6, price: 150, sell: 50, text: 'ALL OF THEM RECEIPTED.', color: 'cyan' },
  samphire: { id: 'samphire', name: 'SAMPHIRE', kind: 'herb', fp: [1, 2], price: 120, sell: 40, heal: 0.3, text: 'GREEN. HEALS 30%. MIX WITH MORE.', color: 'green' },
  dulse: { id: 'dulse', name: 'DULSE', kind: 'herb', fp: [1, 2], price: 100, sell: 30, heal: 0, text: 'RED. HEALS NOTHING ALONE.', color: 'red' },
  seaholly: { id: 'seaholly', name: 'SEA HOLLY', kind: 'herb', fp: [1, 2], price: 300, sell: 100, heal: 0, text: 'YELLOW. +10 MAX WHEN MIXED.', color: 'sand' },
  tin: { id: 'tin', name: 'COMPANY FIRST-AID TIN', kind: 'herb', fp: [1, 2], price: 800, sell: 400, heal: 1, text: 'HEALS 100%. PREMIUM PLAN.', color: 'white' },
  flare: { id: 'flare', name: 'MAGNESIUM FLARE', kind: 'grenade', fp: [1, 2], price: 250, sell: 80, text: 'BLINDS 6 M. KILLS LIMPETS.', color: 'white' },
  depth: { id: 'depth', name: 'DEPTH CHARGE', kind: 'grenade', fp: [1, 2], price: 400, sell: 140, text: '80 DAMAGE, 4 M, 1.5 S FUSE.', color: 'slate' },
  bottle: { id: 'bottle', name: 'WHALE-OIL BOTTLE', kind: 'grenade', fp: [1, 2], price: 200, sell: 70, text: 'BURNING POOL, 3 S.', color: 'orange' },
};
export const WEAPON_ITEM_COLOR = { pistol: 'sand', scatter: 'red', rifle: 'orange', harpoon: 'cyan' };
export const VALUABLES = {
  pearl: { id: 'pearl', name: 'PEARL', value: 500, text: 'FIT FOR A RELIQUARY.' },
  blackpearl: { id: 'blackpearl', name: 'BLACK PEARL', value: 1500, text: 'HEAVY AND COLD.' },
  seaglass: { id: 'seaglass', name: 'SEA GLASS SET', value: 400, text: 'BLUE, GREEN, LITTLE ELSE.' },
  amber: { id: 'amber', name: 'AMBER', value: 700, text: 'SOMETHING IS INSIDE IT.' },
  scrimshaw: { id: 'scrimshaw', name: 'SCRIMSHAW TUSK', value: 900, text: 'A LADY AND A WHALE. NEITHER HAPPY.' },
  goldtooth: { id: 'goldtooth', name: 'GOLD TOOTH', value: 150, text: 'NOT YOURS.' },
  reliquary: { id: 'reliquary', name: 'EMPTY RELIQUARY', value: 1200, sockets: ['pearl', 'blackpearl', 'amber'], full: 8000, text: 'THREE SOCKETS: PEARL, BLACK PEARL, AMBER.' },
};
export const KEY_ITEMS = {
  coldkey: { id: 'coldkey', name: 'COLD ROOM KEY', text: 'BORROWED FROM A MAN WITH A SAW.' },
  chart: { id: 'chart', name: 'TANNOY CHART', text: 'SHOWS EVERY LOUDSPEAKER ON THE ISLAND.' },
  wheel: { id: 'wheel', name: 'GATE WHEEL', text: 'THE DAME TURNS IT. YOU HOLD THE LINE.' },
  lever: { id: 'lever', name: 'CRYPT LEVER', text: 'IT IS A LEVER.' },
};
export function itemDef(id) { return ITEMS[id] || null; }
// Herb mixes (made in the Case, not sold).
ITEMS.mix60 = { id: 'mix60', name: 'SAMPHIRE MIX', kind: 'herb', fp: [1, 2], price: 0, sell: 60, heal: 0.6, text: 'TWO GREENS. HEALS 60%.', color: 'green', noShop: true };
ITEMS.mix100 = { id: 'mix100', name: 'GREEN-RED MIX', kind: 'herb', fp: [1, 2], price: 0, sell: 120, heal: 1, text: 'HEALS 100%.', color: 'lime', noShop: true };
ITEMS.mix100h = { id: 'mix100h', name: 'FULL TIDE MIX', kind: 'herb', fp: [1, 2], price: 0, sell: 400, heal: 1, maxUp: 10, text: 'HEALS 100% AND +10 MAX COVERAGE.', color: 'cyan', noShop: true };
export function combineHerbs(a, b) {
  const k = [a, b].sort().join('+');
  const table = {
    'samphire+samphire': 'mix60', 'mix60+samphire': 'mix100', 'dulse+samphire': 'mix100',
    'dulse+mix100': null, 'mix100+seaholly': 'mix100h', 'seaholly+mix100h': null, 'mix60+seaholly': null,
  };
  if (k === 'dulse+samphire') return 'mix100';
  return table[k] ?? null;
}
