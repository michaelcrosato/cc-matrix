// Section 8's table. Add a weapon here (and a viewmodel in src/art/viewmodels.js).
export const WEAPONS = {
  cane: { id: 'cane', name: 'CANE KNIFE', slot: 'melee', rate: 1.6, damage: 55, range: 2.2, wear: 0, price: 0, noise: 0, melee: true, reliability: 10 },
  m38: { id: 'm38', name: 'SERVICE REVOLVER', slot: 'sidearm', mag: 6, reserve: 36, rate: 3, damage: 34, range: 45, wear: 0.5, price: 0, noise: 90, spread: 1.4, adsSpread: 0.35, kick: 0.016, sound: 'gun-revolver', reloadT: 2.3, reliability: 8 },
  flare: { id: 'flare', name: 'FLARE PISTOL', slot: 'sidearm', mag: 1, reserve: 8, rate: 0.6, damage: 12, range: 70, wear: 0, price: 0, noise: 40, projectile: 'flare', kick: 0.03, sound: 'flare-pop', reloadT: 1.7, reliability: 9 },
  tractor: { id: 'tractor', name: '"TRACTOR" RIFLE', slot: 'main', mag: 30, reserve: 150, rate: 9, damage: 24, range: 110, wear: 0.35, price: 6, noise: 120, auto: true, spread: 1.7, adsSpread: 0.45, kick: 0.009, sound: 'gun-rifle', reloadT: 2, reliability: 5 },
  mule: { id: 'mule', name: '"MULE" PUMP GUN', slot: 'main', mag: 6, reserve: 36, rate: 1.1, damage: 9, pellets: 10, range: 22, wear: 0.8, price: 8, noise: 110, spread: 3.2, adsSpread: 2.6, kick: 0.05, sound: 'gun-shotgun', reloadT: 2.7, pump: true, reliability: 6 },
  empire: { id: 'empire', name: '"OLD EMPIRE" BOLT RIFLE', slot: 'main', mag: 5, reserve: 30, rate: 0.8, damage: 95, range: 320, wear: 1, price: 14, noise: 160, spread: 1.5, adsSpread: 0.03, kick: 0.05, sound: 'gun-bolt', reloadT: 2.7, pump: true, scope: true, adsFov: 12, reliability: 7 },
  weed: { id: 'weed', name: '"WEED BURNER"', slot: 'special', mag: 120, reserve: 240, rate: 12, damage: 28, range: 14, wear: 0.12, price: 18, noise: 30, stream: true, sound: 'flame-roar', reloadT: 2.3, reliability: 3 },
  tube: { id: 'tube', name: '"LONG TUBE" ROCKETS', slot: 'special', mag: 1, reserve: 5, rate: 0.4, damage: 180, blast: 6, range: 160, wear: 2, price: 20, noise: 150, projectile: 'rocket', kick: 0.1, sound: 'rocket', reloadT: 3, reliability: 6 },
  mg: { id: 'mg', name: 'MOUNTED MG', slot: 'mounted', rate: 10, damage: 20, range: 180, wear: 0, noise: 140, auto: true, spread: 1.1, adsSpread: 1.1, kick: 0.006, sound: 'gun-mg', overheat: 6, cool: 4, reliability: 9 },
};
export const THROWABLES = {
  molotov: { id: 'molotov', name: 'BOTTLE', carry: 3, price: 1, ignite: 4, range: 25 },
  charge: { id: 'charge', name: 'REMOTE CHARGE', carry: 2, price: 3, damage: 220, blast: 7 },
};
export const UPGRADES = [
  { id: 'cleaning', name: 'CLEANING KIT', price: 6, about: 'YOUR GUNS WEAR 40% SLOWER.' },
  { id: 'pouch', name: 'SYRETTE POUCH', price: 5, about: 'CARRY FIVE SYRETTES.' },
  { id: 'belt', name: 'AMMO BELT', price: 5, about: 'CARRY HALF AS MUCH AMMO AGAIN.' },
  { id: 'vehicle', name: 'VEHICLE KIT', price: 6, about: 'REPAIR A TRUCK IN HALF THE TIME.' },
];
export const SHOP_ORDER = ['tractor', 'mule', 'empire', 'weed', 'tube'];
export const STAGES = { flare: 'm3' };
