// 02-weapons.js: the four weapon roles (plan 4.4), as registry entries. Numbers that the dev panel exposes are read
// through TC.tune at fire time, so a slider takes effect at the next shot. The sim owns ammo and firing; this file is
// data only.
TC.def('weapon', 'handgun', {
  name: 'P9 MARLIN', short: 'HANDGUN', slot: 1, unlimited: true, mag: 9, reloadCover: 0.30,
  rate: 6, autoRate: 3.5, switchT: 0.20, spread: 0, pellets: 1, damage: () => TC.tune.weapon.handgunDmg,
  kind: 'hit', recoil: 0.6, color: '#ffe9a0', pip: '#ffd36a',
});
TC.def('weapon', 'mg', {
  name: 'RIPTIDE', short: 'MACHINE GUN', slot: 2, pool: 240, pickup: 60, rate: () => TC.tune.weapon.mgRate, auto: true,
  switchT: 0.25, spread: 0.6, bloom: 3, bloomRecover: 6, pellets: 1, damage: () => TC.tune.weapon.mgDmg,
  kind: 'hit', recoil: 0.25, color: '#9fe3ff', pip: '#3aa0e8',
});
TC.def('weapon', 'shotgun', {
  name: 'BREAKWATER', short: 'SHOTGUN', slot: 3, pool: 36, pickup: 8, rate: 1.5, auto: false, switchT: 0.30,
  spread: () => TC.tune.weapon.shotSpread, pellets: () => TC.tune.weapon.shotPellets, damage: 0.45,
  kind: 'hit', recoil: 2.2, color: '#ffb36b', pip: '#ff8a3d', knock: true,
});
TC.def('weapon', 'gl', {
  name: 'SQUALL', short: 'GRENADE LAUNCHER', slot: 4, pool: 6, pickup: 2, rate: 1, auto: false, switchT: 0.35,
  spread: 0, pellets: 1, speed: 640, gravity: 240, life: 1.2, radius: () => TC.tune.weapon.glRadius,
  damage: () => TC.tune.weapon.glDmg, kind: 'proj', recoil: 1.5, color: '#ff8a5c', pip: '#ff5a2a',
});

// The weapon cycle order (next / previous) and the number keys.
TC.WEAPON_ORDER = ['handgun', 'mg', 'shotgun', 'gl'];
