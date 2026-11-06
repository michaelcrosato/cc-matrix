// Weapons. fp = footprint in Case cells [w,h]. Prices at Mr. Fathom.
export const WEAPONS = {
  pistol: { id: 'pistol', name: 'OSTRANDER .38', damage: 14, pellets: 1, interval: 0.30, mag: 12, reload: 1.35, sway: 0.8, cone: 0, fp: [3, 2], price: 0, ammo: 'ammo_pistol', long: false, text: 'STANDARD ISSUE. HEAD SHOTS HAVE A CHANCE TO POP.', anim: 'pistol' },
  scatter: { id: 'scatter', name: "BOSUN'S SCATTERGUN", damage: 9, pellets: 7, interval: 0.95, mag: 6, reload: 2.4, sway: 0.4, cone: 5.5, fp: [7, 2], price: 900, ammo: 'ammo_shells', long: true, text: 'SEVEN PELLETS. FALLS OFF PAST 9 M. KNOCKS BACK.', anim: 'long' },
  rifle: { id: 'rifle', name: "SEALER'S RIFLE", damage: 55, pellets: 1, interval: 1.3, mag: 5, reload: 2.2, sway: 1.2, cone: 0, fp: [8, 2], price: 1800, ammo: 'ammo_rifle', long: true, scope: true, pierce: 1, text: 'SCOPED. PIERCES ONE BODY.', anim: 'long' },
  harpoon: { id: 'harpoon', name: 'HARPOON GUN', damage: 90, pellets: 1, interval: 1.2, mag: 1, reload: 2.0, sway: 0.5, cone: 0, fp: [6, 2], price: 2600, ammo: 'ammo_bolts', long: true, pin: 4, text: 'PINS AN ENEMY FOR 4 SECONDS. BOLTS CAN BE PICKED UP.', anim: 'long' },
};
export const WEAPON_ORDER = ['pistol', 'scatter', 'rifle', 'harpoon'];
export const TUNE_NAMES = ['POWER', 'RATE', 'RELOAD', 'CAPACITY'];
export const TUNE_PRICES = [300, 600, 1000, 1500];
export const PERKS = { pistol: 'HEAD POP CHANCE 30%', scatter: 'WIDER CONE, PUSHES EVERYONE', rifle: 'PIERCES ALL', harpoon: 'RELOADS ITSELF IN 1 S' };
export const GRENADES = {
  flare: { id: 'flare', name: 'MAGNESIUM FLARE', text: 'BLINDS 6 M FOR 4 S. KILLS LIMPETS.' },
  depth: { id: 'depth', name: 'DEPTH CHARGE', text: 'BOOMS AFTER 1.5 S. 80 DAMAGE, 4 M.' },
  bottle: { id: 'bottle', name: 'WHALE-OIL BOTTLE', text: 'BURNING POOL FOR 3 S.' },
};
export function tunedStat(w, tune) {
  const t = tune || [0, 0, 0, 0];
  return {
    damage: w.damage * (1 + 0.15 * t[0]),
    interval: w.interval * (1 - 0.06 * t[1]),
    reload: w.reload * (1 - 0.1 * t[2]),
    mag: w.mag + Math.ceil(w.mag * 0.25 * t[3]),
    perk: t.every((v) => v >= 4),
  };
}
