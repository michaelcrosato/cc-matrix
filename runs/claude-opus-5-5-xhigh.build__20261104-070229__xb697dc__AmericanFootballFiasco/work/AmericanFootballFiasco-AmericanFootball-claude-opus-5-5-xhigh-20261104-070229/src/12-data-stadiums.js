// Stadiums: light, weather, the field's paint, the backdrop, the stands, the props around the field, the music.
// Prop positions: [shape or prop id, x yards from the left goal line, y yards from the far sideline (negative: behind
// it, toward the stands; 53+: the near sideline), options]
(() => {
'use strict';
const FF = window.FF;
FF.data.stadiums = {
  tumbleweed: { id: 'tumbleweed', name: 'TUMBLEWEED FIELD', home: 'fiascos', music: 'DUST_DEVIL',
    light: { ambient: .66, tint: '#ffb070', sun: { x: -1, color: '#ffb060' }, towers: false, strings: true }, night: { ambient: .32, towers: false, flicker: true },
    weather: null, surface: { stripes: ['#5a8a34', '#6a9a3e'], worn: .55, dirt: 10, mud: 0, ice: 0, glowLines: false, endzone: '#4a2a6a', ezText: 'TUM', mid: 'fiascos' },
    backdrop: { sky: ['#2a1a4a', '#c8506a', '#ffb070'], sun: { x: .15, y: .62, r: 18, color: '#ffd890' }, layers: [{ kind: 'mountains', color: '#8a4a5a', y: .64, height: .2, parallax: .1 }, { kind: 'hills', color: '#6a3a40', y: .78, height: .12, parallax: .2 }] },
    stands: { tiers: 3, face: 'plank', side: '#8a6a4a', top: '#b89060', density: .35, sections: ['#e8742a', '#4a2a6a', '#f4e8c8'] },
    props: [['waterTower', -8, -7, {}], ['pickupTruck', 104, -4, { facing: 0 }], ['oldScoreboard', 50, -8, {}], ['fiasco-store:hay-bale', 2, -1.5, {}], ['fiasco-store:hay-bale', 98, -1.5, {}],
      ['cactus', -6, 20, {}], ['cactus', 106, 34, {}], ['bench', 30, 56, { facing: Math.PI / 2 }], ['cooler', 46, 56, {}], ['teamBench', 60, 56, {}]],
    chant: 'thin', crowdScale: .6, specials: ['crickets'] },
  hogwallow: { id: 'hogwallow', name: 'THE HOG WALLOW', home: 'mudhogs', music: 'SWAMP_STOMP',
    light: { ambient: .56, tint: '#9aa4b0', towers: false },
    weather: { kind: 'rain', amount: .6, wind: .2, lightning: .1 }, surface: { stripes: ['#3e6a2e', '#4a7a36'], worn: .4, dirt: 0, mud: 12, ice: 0, glowLines: false, endzone: '#6a4a2a', ezText: 'BAY', mid: 'mudhogs' },
    backdrop: { sky: ['#3a4450', '#5a6470', '#8a949a'], layers: [{ kind: 'forest', color: '#2a3a2a', y: .62, height: .25, parallax: .2 }, { kind: 'fog', color: '#8a9490', y: .8, height: .15, parallax: .1, drift: 6 }] },
    stands: { tiers: 5, face: 'plank', side: '#6a6a6a', top: '#8a8a88', roof: 'slab', density: .8, sections: ['#4a6a2a', '#6a4a2a', '#e8c040'] },
    props: [['airboat', -8, -3, {}], ['grill', 100, -2, {}], ['lantern', 10, -1, { anchor: 'top' }], ['crate', 104, 2, {}], ['crate', 105, 4, {}], ['lamp', 20, 56, { light: true }], ['teamBench', 60, 56, {}], ['cooler', 44, 56, {}]],
    chant: 'mid', crowdScale: .9, specials: ['lightning', 'puddles'] },
  afterglow: { id: 'afterglow', name: 'AFTERGLOW ARENA', home: 'owls', music: 'NEON_NIGHTDRIVE',
    light: { ambient: .38, tint: '#6a6aa0', towers: true, neon: ['#3af0f0', '#f03ab0'] },
    weather: null, surface: { stripes: ['#2a4a32', '#30543a'], worn: .1, dirt: 0, mud: 0, ice: 0, glowLines: true, endzone: '#1a1a2a', ezText: 'NEO', mid: 'owls' },
    backdrop: { sky: ['#06061a', '#1a1040', '#3a1a5a'], stars: 40, moon: { x: .8, y: .2, r: 10, color: '#e0e8ff' }, layers: [{ kind: 'city', color: '#140c2a', y: .6, height: .3, parallax: .15 }] },
    stands: { tiers: 7, face: 'stone', side: '#2a2a3a', top: '#3a3a4a', density: .9, sections: ['#1a1a2a', '#3af0f0', '#f03ab0'] },
    props: [['neonSign', 20, -2, { text: 'HOOT', color: '#3af0f0' }], ['neonSign', 80, -2, { text: 'GLOW', color: '#f03ab0' }], ['lightTower', -6, -6, {}], ['lightTower', 106, -6, {}],
      ['fiasco-store:speaker', 104, 56, {}], ['table', 100, 57, {}], ['teamBench', 60, 56, {}], ['cooler', 44, 56, {}]],
    chant: 'loud', crowdScale: 1, specials: ['lasers', 'lightsOut'] },
  frostbite: { id: 'frostbite', name: 'FROSTBITE FIELD', home: 'yetis', music: 'FROSTBITE_FANFARE',
    light: { ambient: .54, tint: '#a8c0e0', towers: true },
    weather: { kind: 'snow', amount: .7, wind: .3 }, surface: { stripes: ['#7a9a7a', '#86a688'], snow: .5, worn: .2, dirt: 0, mud: 0, ice: 2, glowLines: false, endzone: '#2a3a6a', ezText: 'GLB', mid: 'yetis' },
    backdrop: { sky: ['#0a1a3a', '#2a4a7a', '#7a9ac0'], stars: 30, aurora: true, layers: [{ kind: 'mountains', color: '#d8e4f0', y: .58, height: .3, parallax: .12 }, { kind: 'forest', color: '#1a3a3a', y: .8, height: .12, parallax: .2 }] },
    stands: { tiers: 6, face: 'stone', side: '#8a96a8', top: '#d8e4f0', density: .75, sections: ['#8ac8f0', '#f0f4f8', '#2a3a6a'] },
    props: [['pine', -6, -3, {}], ['pine', -4, 60, {}], ['pine', 105, 58, {}], ['bulldozer', 104, -3, { color: '#3a6ac8' }], ['firedrum', 30, 56, { light: true }], ['firedrum', 80, 56, { light: true }], ['crystal', 50, -2, { size: 2.2, color: '#bfe8ff' }], ['teamBench', 60, 56, {}]],
    chant: 'mid', crowdScale: .85, specials: ['breath', 'ice'] },
  megadome: { id: 'megadome', name: 'THE MEGA DOME', home: 'dynasty', music: 'MEGA_DOME',
    light: { ambient: .58, tint: '#e0e8ff', towers: false, spots: 6, indoor: true },
    weather: null, surface: { stripes: ['#3a8a3a', '#46963f'], worn: 0, dirt: 0, mud: 0, ice: 0, glowLines: false, endzone: '#f0c040', ezText: 'GCD', mid: 'dynasty' },
    backdrop: { sky: ['#06060c', '#14141e', '#22222e'], truss: true, layers: [] },
    stands: { tiers: 8, face: 'stone', side: '#2a2a32', top: '#3a3a44', density: 1, sections: ['#f0c040', '#18161e', '#f4f4f0'] },
    props: [['pyroCannon', -2, -2, {}], ['pyroCannon', 102, -2, {}], ['pyroCannon', -2, 55, {}], ['pyroCannon', 102, 55, {}], ['inflatableHelmet', -7, 56, {}], ['jumbotron', 50, -9, {}],
      ['tvCamera', 20, 56, {}], ['tvCamera', 80, 56, {}], ['teamBench', 60, 56, {}]],
    chant: 'huge', crowdScale: 1.3, specials: ['pyro', 'band', 'blimp'] }
};
FF.data.stadiumList = Object.keys(FF.data.stadiums);
})();
