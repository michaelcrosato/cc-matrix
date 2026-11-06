// The guns as data (PLAN section 8). Adding a gun means a row here and its parts in art/viewmodels.js.
export const WEAPONS = {
  cane: { id: 'cane', name: 'CANE KNIFE', slot: 'melee', cls: 'melee', rate: 1.6, damage: 55, range: 2.2, wear: 0, price: 0, quiet: true, hear: 6, damageBar: 4, rangeBar: 1, reliabilityBar: 5 },
  m38: { id: 'm38', name: 'SERVICE REVOLVER', slot: 'sidearm', cls: 'pistol', mag: 6, reserve: 36, rate: 3, damage: 34, range: 45, wear: 0.5, price: 0, auto: false, hear: 90, spread: 0.9, kick: 0.018, reload: 2.3, sound: 'gun-m38', damageBar: 3, rangeBar: 2, reliabilityBar: 5, ads: 45 },
  flare: { id: 'flare', name: 'FLARE PISTOL', slot: 'sidearm', cls: 'pistol', mag: 1, reserve: 8, rate: 0.6, damage: 12, range: 70, wear: 0, price: 0, auto: false, projectile: 'flare', hear: 70, spread: 0.2, kick: 0.03, reload: 1.6, sound: 'gun-flare', damageBar: 1, rangeBar: 2, reliabilityBar: 5, ads: 50 },
  tractor: { id: 'tractor', name: '"TRACTOR" RIFLE', slot: 'main', cls: 'rifle', mag: 30, reserve: 150, rate: 9, damage: 24, range: 110, wear: 0.35, price: 6, auto: true, hear: 120, spread: 1.3, kick: 0.009, reload: 2.4, sound: 'gun-tractor', damageBar: 3, rangeBar: 3, reliabilityBar: 2, ads: 45 },
  mule: { id: 'mule', name: '"MULE" PUMP GUN', slot: 'main', cls: 'rifle', mag: 6, reserve: 36, rate: 1.1, damage: 9, pellets: 10, range: 22, wear: 0.8, price: 8, auto: false, hear: 130, spread: 4.2, kick: 0.05, reload: 3.2, sound: 'gun-mule', damageBar: 5, rangeBar: 1, reliabilityBar: 3, ads: 50 },
  empire: { id: 'empire', name: '"OLD EMPIRE" BOLT RIFLE', slot: 'main', cls: 'rifle', mag: 5, reserve: 30, rate: 0.8, damage: 95, range: 320, wear: 1, price: 14, auto: false, scoped: true, hear: 170, spread: 0.6, kick: 0.045, reload: 3, sound: 'gun-empire', damageBar: 5, rangeBar: 5, reliabilityBar: 3, ads: 12 },
  weed: { id: 'weed', name: '"WEED BURNER"', slot: 'special', cls: 'rifle', mag: 120, reserve: 240, rate: 30, damage: 28, range: 14, wear: 0.12, price: 18, auto: true, stream: true, hear: 40, spread: 0, kick: 0, reload: 3.2, sound: 'flamer-start', damageBar: 3, rangeBar: 1, reliabilityBar: 1, ads: 56 },
  tube: { id: 'tube', name: '"LONG TUBE"', slot: 'special', cls: 'tube', mag: 1, reserve: 5, rate: 0.4, damage: 180, blast: 6, range: 160, wear: 2, price: 20, auto: false, projectile: 'rocket', hear: 160, spread: 0.3, kick: 0.07, reload: 2.8, sound: 'gun-tube', damageBar: 5, rangeBar: 4, reliabilityBar: 3, ads: 50 },
  mg: { id: 'mg', name: 'MOUNTED MG', slot: 'mounted', cls: 'mounted', rate: 10, damage: 20, range: 180, wear: 0, hear: 170, auto: true, spread: 1.2, kick: 0.006, sound: 'gun-mg', overheat: 6, cool: 4, damageBar: 3, rangeBar: 4, reliabilityBar: 4 },
};
export const THROWN = {
  molotov: { id: 'molotov', name: 'BOTTLE', carry: 3, igniteR: 4, range: 25, price: 1 },
  charge: { id: 'charge', name: 'REMOTE CHARGE', carry: 2, damage: 220, blast: 7, price: 3 },
};
export const UPGRADES = {
  cleaning: { id: 'cleaning', name: 'CLEANING KIT', price: 6, about: 'YOUR GUNS WEAR SLOWER.' },
  pouch: { id: 'pouch', name: 'SYRETTE POUCH', price: 5, about: 'CARRY FIVE SYRETTES.' },
  belt: { id: 'belt', name: 'AMMO BELT', price: 5, about: 'CARRY HALF AGAIN THE ROUNDS.' },
  vkit: { id: 'vkit', name: 'VEHICLE KIT', price: 6, about: 'FIX A TRUCK IN HALF THE TIME.' },
};
export const SLOT_ORDER = ['melee', 'sidearm', 'main', 'special'];
