// Weapon data. Footprint is in Case cells. `tune` is per level: 4 levels of each stat, price rising.
export const WEAPONS = {
  pistol: {
    id: 'pistol', name: 'OSTRANDER .38', text: 'SERVICE REVOLVER. A HEADSHOT CAN END A CLAIM OUTRIGHT.', icon: 'pistol', model: 'w-pistol', long: false,
    damage: 14, interval: 0.3, mag: 12, reload: 1.35, sway: 0.8, pellets: 1, w: 3, h: 2, price: 0, sound: 'pistol', ammo: 'ammoPistol', aimClip: 'AimPistol', fireClip: 'FirePistol', reloadClip: 'ReloadPistol', reloadSfx: ['reloadOut', 'reloadIn'],
    headPop: 0.06, perkText: 'PERK: HEAD POP CHANCE 30%',
  },
  scatter: {
    id: 'scatter', name: "BOSUN'S SCATTERGUN", text: 'SAWN-OFF PUMP. EVERYTHING IN FRONT OF YOU BECOMES A CLAIM.', icon: 'scatter', model: 'w-scatter', long: true,
    damage: 9, interval: 0.95, mag: 6, reload: 2.4, sway: 0.4, pellets: 7, cone: 5.5, falloff: 9, knock: true, w: 7, h: 2, price: 900, sound: 'scatter', ammo: 'ammoShells', aimClip: 'AimLong', fireClip: 'FireLong', reloadClip: 'ReloadPump', reloadSfx: ['shellIn', 'shellIn', 'reloadRack'],
    perkText: 'PERK: WIDER CONE, PUSHES EVERYONE IN IT',
  },
  rifle: {
    id: 'rifle', name: "SEALER'S RIFLE", text: 'LONG BOLT-ACTION WITH A BRASS SCOPE. PIERCES ONE BODY.', icon: 'rifle', model: 'w-rifle', long: true,
    damage: 55, interval: 1.3, mag: 5, reload: 2.2, sway: 1.2, pellets: 1, pierce: 1, scope: true, w: 8, h: 2, price: 1800, sound: 'rifle', ammo: 'ammoRifle', aimClip: 'AimLong', fireClip: 'FireLong', reloadClip: 'ReloadBolt', reloadSfx: ['reloadRack', 'reloadIn', 'reloadRack'],
    perkText: 'PERK: PIERCES EVERYTHING',
  },
  harpoon: {
    id: 'harpoon', name: 'HARPOON GUN', text: 'PINS A TARGET TO WHATEVER IS BEHIND IT. YOU CAN GO AND GET THE BOLT BACK.', icon: 'harpoon', model: 'w-harpoon', long: true,
    damage: 90, interval: 1.2, mag: 1, reload: 2.0, sway: 0.5, pellets: 1, pin: 4, w: 6, h: 2, price: 2600, sound: 'harpoon', ammo: 'ammoBolts', aimClip: 'AimLong', fireClip: 'FireLong', reloadClip: 'ReloadPump', reloadSfx: ['shellIn', 'chain', 'reloadRack'],
    perkText: 'PERK: RELOADS ITSELF IN 1 S',
  },
};
export const WEAPON_ORDER = ['pistol', 'scatter', 'rifle', 'harpoon'];

export const TUNE_STATS = {
  power: { label: 'POWER', per: 0.15, text: 'DAMAGE +15% A LEVEL' },
  rate: { label: 'RATE', per: 0.1, text: 'FIRES 10% FASTER A LEVEL' },
  reload: { label: 'RELOAD', per: 0.12, text: 'RELOADS 12% FASTER A LEVEL' },
  cap: { label: 'CAPACITY', per: 0.25, text: 'HOLDS 25% MORE A LEVEL' },
};
export const TUNE_STAT_IDS = ['power', 'rate', 'reload', 'cap'];
export const TUNE_MAX = 4;
export const TUNE_PRICES = [300, 600, 1000, 1500];

export function statsOf(weaponId, state) {
  const w = WEAPONS[weaponId];
  const tune = state?.tune ?? {};
  const lv = (k) => tune[k] ?? 0;
  const perk = TUNE_STAT_IDS.every((k) => lv(k) >= TUNE_MAX);
  return {
    ...w,
    damage: w.damage * (1 + lv('power') * TUNE_STATS.power.per),
    interval: w.interval * (1 - lv('rate') * TUNE_STATS.rate.per * 0.6),
    reload: (perk && weaponId === 'harpoon') ? 1 : w.reload * (1 - lv('reload') * TUNE_STATS.reload.per),
    mag: Math.max(w.mag, Math.round(w.mag * (1 + lv('cap') * TUNE_STATS.cap.per))),
    headPop: perk && weaponId === 'pistol' ? 0.3 : (w.headPop ?? 0),
    cone: perk && weaponId === 'scatter' ? 8.5 : w.cone,
    pushAll: perk && weaponId === 'scatter',
    pierce: perk && weaponId === 'rifle' ? 99 : (w.pierce ?? 0),
    perk,
  };
}

export const KNIFE = { damage: 8, time: 0.4, reach: 2, arc: 1.3, downed: 3 };
export const GRENADES = {
  flare: { id: 'flare', radius: 6, blind: 4, fuse: 0.9, sound: 'flareHiss' },
  depth: { id: 'depth', radius: 4, damage: 80, fuse: 1.5, sound: 'depthCharge' },
  oil: { id: 'oil', radius: 2.4, burn: 3, dps: 15, fuse: 0, sound: 'bottleSmash' },
};
