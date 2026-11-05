/* OutBloom — cars: the five open-top Fiorettis (and their Bloom Editions), paints, and the island's traffic. */
(() => {
'use strict';
const OB = window.OB;

/* body: the model recipe for OB.Art (proportions in model units: length, width, height, the cockpit's place, the
 * shapes of nose and tail); top km/h, 0-100 s, steer, drift grip, weight; engine cylinders and filter colour */
OB.CARS = {
  primavera: { name: 'Primavera 300 Spider', year: 1962, top: 245, zeroTo100: 5.8, steer: 2.35, grip: .92, weight: .85, cyl: 4, tone: 900, cls: 'Novice', unlock: 'start',
    blurb: 'Round fenders, chrome bumpers, tiny fins. Easy to slide.', paints: ['#f4ead2', '#c83a3a', '#5aa0c8', '#3a6a4a'],
    body: { L: 4.0, Wd: 1.62, H: .62, nose: 'round', tail: 'fins', hoops: 0, chrome: true, deck: .42, lamps: 'round', wheel: '#e8e0d0', windscreen: .34 } },
  orchidea: { name: 'Orchidea Spider', year: 2004, top: 272, zeroTo100: 4.5, steer: 2.2, grip: .85, weight: 1, cyl: 8, tone: 1400, cls: 'Novice+', unlock: 'start',
    blurb: 'The default dream. Soft wedge, twin roll hoops, round tail lamps.', paints: ['#e8463a', '#ffcf3a', '#2a2a32', '#f4f4f8'],
    body: { L: 4.3, Wd: 1.9, H: .6, nose: 'soft', tail: 'round', hoops: 2, deck: .38, lamps: 'twin', wheel: '#c8ccd4', windscreen: .38 } },
  gardenia: { name: 'Gardenia GT Targa', year: 1987, top: 292, zeroTo100: 4.0, steer: 2.0, grip: .78, weight: 1.05, cyl: 12, tone: 1900, cls: 'Intermediate', unlock: 'garden', cost: 600,
    blurb: 'Sharp wedge, pop-up lamps, side strakes, targa bar. Twitchy.', paints: ['#f4f2ee', '#c82a3a', '#1a1a22', '#e8d8a0'],
    body: { L: 4.4, Wd: 1.95, H: .56, nose: 'wedge', tail: 'flat', hoops: 0, targa: true, strakes: true, deck: .36, lamps: 'bar', wheel: '#d8d8e0', windscreen: .34, stripe: '#ff7ab0' } },
  magnolia: { name: 'Magnolia V12 Barchetta', year: 1998, top: 305, zeroTo100: 4.2, steer: 1.95, grip: .84, weight: 1.2, cyl: 12, tone: 1250, cls: 'Intermediate+', unlock: 'garden', cost: 900,
    blurb: 'A long bonnet, no roof at all, twin humps. Smooth V12.', paints: ['#2a3a8a', '#8a1a2a', '#e8e8f0', '#2a5a3a'],
    body: { L: 4.6, Wd: 1.96, H: .58, nose: 'long', tail: 'round', hoops: 0, humps: true, deck: .44, lamps: 'twin', wheel: '#c0c4cc', windscreen: .18 } },
  girasole: { name: 'Girasole Hyper Spider', year: 2026, top: 330, zeroTo100: 3.0, steer: 1.85, grip: .8, weight: 1.1, cyl: 12, tone: 2300, hybrid: true, cls: 'Expert', unlock: 'garden', cost: 1500,
    blurb: 'Canopy-less hypercar, a sunflower-petal diffuser, LED strips.', paints: ['#ffc81a', '#1a1a1e', '#f0f0f4', '#e85a1a'],
    body: { L: 4.6, Wd: 2.04, H: .5, nose: 'hyper', tail: 'diffuser', hoops: 0, fins: true, deck: .3, lamps: 'led', wheel: '#3a3a40', windscreen: .2 } }
};
OB.CAR_ORDER = ['primavera', 'orchidea', 'gardenia', 'magnolia', 'girasole'];
// Bloom Editions: +8 km/h, -0.3 s to 100, +0.1 steer, +0.04 drift grip, petal decals and gold trim
OB.EDITIONS = { primavera: { cost: 400 }, orchidea: { cost: 500 } };
OB.carStats = (id, edition) => {
  const c = OB.CARS[id], e = edition && OB.EDITIONS[id];
  return e ? Object.assign({}, c, { top: c.top + 8, zeroTo100: c.zeroTo100 - .3, steer: c.steer + .1, grip: c.grip + .04, edition: true, name: c.name + ' Bloom' }) : c;
};
// paint packs from the Garage Garden (100 seeds each), 4 paints each
OB.PAINT_PACKS = {
  pastel: { name: 'Pastel pack', paints: ['#ffb0c8', '#b0e0d0', '#c8b8f0', '#fff0a8'] },
  metallic: { name: 'Metallic pack', paints: ['#8a9ab0', '#b08a5a', '#5a7a9a', '#9a5a7a'] },
  retro: { name: 'Retro pack', paints: ['#e8a040', '#4a8a7a', '#c8503a', '#e8d8b0'] },
  neon: { name: 'Neon pack', paints: ['#ff3ab0', '#3affb0', '#3ab0ff', '#e8ff3a'] }
};
OB.paintsFor = (id, profile) => {
  const list = OB.CARS[id].paints.map(c => ({ color: c, pack: null }));
  for (const [k, p] of Object.entries(OB.PAINT_PACKS)) if (profile && profile.unlocked.paints.includes(k)) for (const c of p.paints) list.push({ color: c, pack: k });
  return list;
};

/* traffic: speed range km/h, half width in half roads, length in units, body recipe */
OB.TRAFFIC = {
  hatch: { name: 'hatchback', v: [95, 120], hw: .18, len: 380, paints: ['#e8e0d0', '#5a8ac8', '#e85a4a', '#7ac85a', '#f0c040'], shape: 'hatch' },
  sedan: { name: 'family sedan', v: [100, 130], hw: .2, len: 440, paints: ['#c8c8d0', '#3a4a6a', '#8a2a2a', '#e8e8e8'], shape: 'sedan' },
  taxi: { name: 'city taxi', v: [90, 115], hw: .2, len: 440, paints: ['#ffcf1a'], shape: 'sedan', roof: 'taxi' },
  van: { name: 'delivery van', v: [85, 110], hw: .22, len: 480, paints: ['#f4f4f0', '#a8d8c0'], shape: 'van', decal: 'flower' },
  pickup: { name: 'pickup', v: [90, 115], hw: .21, len: 470, paints: ['#c84a2a', '#4a6a8a', '#d8c8a0'], shape: 'pickup' },
  camper: { name: 'camper van', v: [70, 95], hw: .23, len: 500, paints: ['#f0e0b0', '#a8d0e8'], shape: 'camper', roof: 'surf' },
  bus: { name: 'tour bus', v: [70, 90], hw: .27, len: 1000, paints: ['#ff8a4a', '#3ab0a8'], shape: 'bus' },
  truck: { name: 'flower lorry', v: [65, 85], hw: .3, len: 1000, paints: ['#3a8a5a', '#e8e8e0'], shape: 'truck' },
  tractor: { name: 'tractor', v: [35, 50], hw: .24, len: 400, paints: ['#c83a2a', '#3a8a3a'], shape: 'tractor', farm: true },
  scooter: { name: 'scooter', v: [80, 100], hw: .1, len: 220, paints: ['#8ad0c8', '#f08aa0', '#f0e0a0'], shape: 'scooter' },
  icecream: { name: 'ice-cream truck', v: [60, 75], hw: .24, len: 520, paints: ['#ffd0e0'], shape: 'icecream', jingle: true }
};
OB.TRAFFIC_ORDER = Object.keys(OB.TRAFFIC);
OB.PLAYER_HW = .24; OB.CAR_LEN = 520;
})();
