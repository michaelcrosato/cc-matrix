/** Original guns. Locker copies start clean. Ground copies start worn. */
export const WEAPONS = [
  { id: 'cane', name: 'CANE KNIFE', slot: 'melee', mag: 0, reserve: 0, rate: 1.6, damage: 55, range: 2.2, wear: 0, melee: true },
  { id: 'm38', name: 'SERVICE REVOLVER', slot: 'sidearm', mag: 6, reserve: 36, rate: 3, damage: 34, range: 45, wear: 0.5 },
  { id: 'flare', name: 'FLARE PISTOL', slot: 'sidearm', mag: 1, reserve: 8, rate: 0.6, damage: 12, range: 70, wear: 0, ignite: 2, arc: true },
  { id: 'tractor', name: 'TRACTOR RIFLE', slot: 'main', mag: 30, reserve: 150, rate: 9, damage: 24, range: 110, wear: 0.35, auto: true },
  { id: 'mule', name: 'MULE PUMP GUN', slot: 'main', mag: 6, reserve: 36, rate: 1.1, damage: 9, range: 22, wear: 0.8, pellets: 10 },
  { id: 'empire', name: 'OLD EMPIRE', slot: 'main', mag: 5, reserve: 30, rate: 0.8, damage: 95, range: 320, wear: 1, scope: 12 },
  { id: 'weed', name: 'WEED BURNER', slot: 'special', mag: 120, reserve: 240, rate: 8, damage: 28, range: 14, wear: 0.12, ignite: 3, stream: true },
  { id: 'tube', name: 'LONG TUBE', slot: 'special', mag: 1, reserve: 5, rate: 0.4, damage: 180, range: 160, wear: 2, blast: 6, ignite: 6 },
  { id: 'mg', name: 'MOUNTED MG', slot: 'mounted', mag: 999, reserve: 0, rate: 10, damage: 20, range: 180, wear: 0, auto: true, heat: 6 },
  { id: 'molotov', name: 'BOTTLE', slot: 'throw', mag: 1, reserve: 0, rate: 0.8, damage: 5, range: 25, wear: 0, ignite: 4, carry: 3 },
  { id: 'charge', name: 'REMOTE CHARGE', slot: 'throw', mag: 1, reserve: 0, rate: 0.5, damage: 220, range: 3, wear: 0, blast: 7, ignite: 7, plant: true, carry: 2 },
];

export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export const UPGRADES = [
  { id: 'clean', name: 'CLEANING KIT', cost: 6, about: 'WEAR SLOWS' },
  { id: 'pouch', name: 'SYRETTE POUCH', cost: 5, about: 'CARRY FIVE' },
  { id: 'belt', name: 'AMMO BELT', cost: 5, about: 'MORE RESERVE' },
  { id: 'vkit', name: 'VEHICLE KIT', cost: 6, about: 'FASTER REPAIR' },
];

export function freshWeapon(id, cond) {
  const def = WEAPON_BY_ID[id];
  if (!def) return null;
  const reserve = def.reserve ? Math.round(def.reserve * (1)) : 0;
  return {
    id,
    name: def.name,
    slot: def.slot,
    cond,
    jammed: false,
    jamLeft: 0,
    mag: def.mag,
    magSize: def.mag,
    reserve,
    cooldown: 0,
    shots: 0,
  };
}
