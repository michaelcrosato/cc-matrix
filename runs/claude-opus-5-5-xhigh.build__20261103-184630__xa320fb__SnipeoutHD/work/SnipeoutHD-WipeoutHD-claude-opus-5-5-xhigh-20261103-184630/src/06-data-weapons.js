// SNIPEOUT HD: the ten weapons and the pickup tables (weighted by race position).
(() => {
const SN = globalThis.SN;
SN.WEAPONS = {
  swarm: { id: 'swarm', name: 'SWARM', color: '#ff4a4a', absorb: 16, kind: 'attack', blurb: 'Three rockets, fanned. Tap to fire.' },
  seeker: { id: 'seeker', name: 'SEEKER', color: '#ff9a2a', absorb: 22, kind: 'attack', blurb: 'Hold a rival in the sights to lock, then fire.' },
  mine: { id: 'mine', name: 'MINEFIELD', color: '#ff3ad8', absorb: 18, kind: 'trap', blurb: 'Five mines dropped behind you.' },
  cannon: { id: 'cannon', name: 'CANNON', color: '#ffe23a', absorb: 14, kind: 'attack', blurb: 'Hold for a stream of 24 bolts.' },
  rail: { id: 'rail', name: 'RAILSHOT', color: '#bff8ff', absorb: 28, kind: 'attack', blurb: 'Hold to charge, release to snipe. Long range.' },
  tremor: { id: 'tremor', name: 'TREMOR', color: '#5aff6a', absorb: 30, kind: 'attack', blurb: 'A shockwave rolls ahead. Airborne craft dodge it.' },
  bulwark: { id: 'bulwark', name: 'BULWARK', color: '#4a9aff', absorb: 12, kind: 'defence', blurb: 'Invulnerable for four seconds.' },
  autopilot: { id: 'autopilot', name: 'AUTOPILOT', color: '#2ae8c8', absorb: 10, kind: 'defence', blurb: 'The craft flies itself for five seconds.' },
  nitro: { id: 'nitro', name: 'NITRO', color: '#ffb000', absorb: 10, kind: 'boost', blurb: 'A long, hard boost.' },
  siphon: { id: 'siphon', name: 'SIPHON', color: '#b8ff3a', absorb: 20, kind: 'attack', blurb: 'Drains shield from the craft ahead into yours.' }
};
SN.WEAPON_ORDER = ['swarm', 'seeker', 'mine', 'cannon', 'rail', 'tremor', 'bulwark', 'autopilot', 'nitro', 'siphon'];
//                     SWARM SEEK MINE CANN RAIL TREM BULW AUTO NITR SIPH
SN.PICKUP_TABLES = {
  front:    [2, 1, 4, 3, 1, 0, 3, 0, 1, 1],
  mid:      [3, 3, 2, 2, 2, 1, 2, 1, 2, 2],
  back:     [2, 3, 1, 1, 2, 3, 1, 3, 3, 2],
  snipeout: [3, 3, 2, 3, 3, 2, 2, 0, 1, 2]
};
})();
