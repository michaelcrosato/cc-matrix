export const WEAPONS = {
  pistol: { id: 'pistol', name: 'OSTRANDER .38', damage: 14, interval: 0.3, mag: 12, reload: 1.35, sway: 0.8, ammo: 'ammo_pistol', w: 3, h: 2, price: 0, pellets: 1, popChance: 0.06,
    about: ['COMPANY ISSUE. FIVE STARS FROM NOBODY.', 'HEADSHOTS MAY POP. SEE SECTION 9.'], perk: 'HEAD POP CHANCE 30 PERCENT', clip: 'Pistol', tune: [150, 300, 500, 800] },
  scatter: { id: 'scatter', name: "BOSUN'S SCATTERGUN", damage: 9, interval: 0.95, mag: 6, reload: 2.4, sway: 0.4, ammo: 'ammo_shells', w: 7, h: 2, price: 900, pellets: 7, cone: 5.5, falloff: 9, knock: true,
    about: ['SEVEN PELLETS, NO MANNERS.', 'FALLS OFF PAST NINE METRES. SO DO THEY.'], perk: 'WIDER CONE. PUSHES EVERYONE IN IT', clip: 'Long', tune: [300, 500, 800, 1200] },
  rifle: { id: 'rifle', name: "SEALER'S RIFLE", damage: 55, interval: 1.3, mag: 5, reload: 2.2, sway: 1.2, ammo: 'ammo_rifle', w: 8, h: 2, price: 1800, pellets: 1, scope: true, pierce: 1,
    about: ['HOLD AIM AND PRESS RELOAD ON THE MOVE: NO.', 'A SCOPE. PIERCES ONE BODY.'], perk: 'PIERCES EVERYONE', clip: 'Long', tune: [400, 700, 1000, 1500] },
  harpoon: { id: 'harpoon', name: 'HARPOON GUN', damage: 90, interval: 1.2, mag: 1, reload: 2.0, sway: 0.5, ammo: 'ammo_bolts', w: 6, h: 2, price: 2600, pellets: 1, pin: 4,
    about: ['PINS WHAT IT HITS FOR FOUR SECONDS.', 'THE BOLT CAN BE PICKED UP AGAIN.'], perk: 'RELOADS ITSELF IN ONE SECOND', clip: 'Long', tune: [400, 700, 1000, 1500] },
};
export const WEAPON_ORDER = ['pistol', 'scatter', 'rifle', 'harpoon'];
export const TUNE_STATS = ['power', 'rate', 'reload', 'capacity'];
export const TUNE_NAME = { power: 'POWER', rate: 'RATE', reload: 'RELOAD', capacity: 'CAPACITY' };
/** Effective stats of a weapon under its tune levels (0..4 each). */
export function weaponStats(id, tune = {}) {
  const w = WEAPONS[id];
  const full = TUNE_STATS.every((s) => (tune[s] || 0) >= 4);
  const s = { ...w, perk: full };
  s.damage = w.damage * (1 + 0.18 * (tune.power || 0));
  s.interval = w.interval * (1 - 0.1 * (tune.rate || 0));
  s.reload = w.reload * (1 - 0.12 * (tune.reload || 0));
  s.mag = w.mag + Math.ceil((w.mag * 0.25 + (w.mag < 3 ? 0.5 : 0)) * (tune.capacity || 0));
  if (full) {
    if (id === 'pistol') s.popChance = 0.3;
    if (id === 'scatter') { s.cone = 8.5; s.pushAll = true; }
    if (id === 'rifle') s.pierce = 99;
    if (id === 'harpoon') s.reload = 1;
  }
  return s;
}
export const GRENADES = {
  flare: { id: 'flare', name: 'MAGNESIUM FLARE', fuse: 0.9, radius: 6 },
  depth: { id: 'depth', name: 'DEPTH CHARGE', fuse: 1.5, radius: 4, damage: 80 },
  oil: { id: 'oil', name: 'WHALE-OIL BOTTLE', fuse: 0, radius: 2.6, dps: 15, burn: 3 },
};
