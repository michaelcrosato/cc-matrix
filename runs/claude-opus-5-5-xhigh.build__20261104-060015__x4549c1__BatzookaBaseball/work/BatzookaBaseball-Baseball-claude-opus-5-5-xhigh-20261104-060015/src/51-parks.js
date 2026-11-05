/* =============================================================================
 * 51-parks: the six ballparks. Fence distances (LF, LC, CF, RC, RF) in world
 * units, the sky (an E.Backdrop spec), the light, the ground beyond the fence,
 * per-park physics, props and the hazard plug-in id.
 * ========================================================================== */
BZ.def('parks', 'kernel', {
  name: 'Kernel Field', team: 'comets', city: 'Kernel Falls', time: 'dusk', music: 'kernel', hazard: 'silo', wind: true,
  fence: [980, 1080, 1180, 1060, 950], fenceH: 40, pad: '#2a6a3a', padTop: '#f2c230',
  backdrop: { sky: ['#2a3a7a', '#c86a5a', '#f4b060'], sun: { x: .78, y: .55, r: 18, color: '#ffd080' },
    layers: [{ kind: 'clouds', color: '#f0a080', y: .25, parallax: .05 }, { kind: 'hills', color: '#4a5a3a', y: .62, height: .18, parallax: .1 }, { kind: 'forest', color: '#2f4a2a', y: .72, height: .1, parallax: .2 }] },
  grass: ['#4a9a3a', '#3f8a33'], mow: 'stripes', dirt: '#b07a4a', track: '#9a6a40', beyond: 'corn', beyondColor: ['#6a8a2a', '#8aa83a'],
  ambient: .8, lightTint: '#ffd8a0', standFace: 'plank', standColor: '#8a5a3a', standTop: '#c8a070', crowd: ['#f4ecd8', '#1e2a5a', '#f2c230', '#c83a2a'],
  props: ['silo', 'barnboard', 'windmill', 'cornrows'], weather: { kind: 'leaves', amount: .25, wind: .3 }, towers: 4, night: false
});
BZ.def('parks', 'barnacle', {
  name: 'Barnacle Bay Park', team: 'krakens', city: 'Harbor City', time: 'noon', music: 'barnacle', hazard: 'gulls', wind: true, windDir: -2.4,
  fence: [1000, 1100, 1150, 1000, 900], fenceH: 40, fenceSections: [{ from: 20, to: 50, h: 30 }], pad: '#1f6a8a', padTop: '#ff7a5c',
  backdrop: 'ocean', grass: ['#5aaa48', '#4c9a3e'], mow: 'checker', dirt: '#c8a070', track: '#b08858', beyond: 'water', beyondColor: ['#2a7ab0', '#3a8ac8'],
  ambient: 1, lightTint: '#ffffff', standFace: 'plank', standColor: '#3a7a8a', standTop: '#a8d0d8', crowd: ['#1f8a8a', '#ff7a5c', '#f4f4f4', '#e8d8b0'],
  props: ['lighthouse', 'boats', 'pier'], weather: null, towers: 0, night: false
});
BZ.def('parks', 'caldera', {
  name: 'Caldera Field', team: 'eruptors', city: 'Magma City', time: 'dusk', music: 'caldera', hazard: 'vents', wind: true,
  fence: [920, 1060, 1200, 1100, 1000], fenceH: 50, pad: '#2a2a30', padTop: '#ff6a1a',
  backdrop: { sky: ['#1a0808', '#6a1a10', '#c84a1a'], sun: { x: .3, y: .5, r: 26, color: '#ff8a3a' },
    layers: [{ kind: 'mountains', color: '#3a1a14', y: .5, height: .35, parallax: .08, seed: 4 }, { kind: 'fog', color: '#8a3a1a', y: .62, height: .1, parallax: .15 }, { kind: 'mountains', color: '#24100c', y: .7, height: .14, parallax: .2, seed: 9 }] },
  grass: ['#5a7a2a', '#4e6c24'], mow: 'stripes', dirt: '#6a4a3a', track: '#3a2a24', beyond: 'lava', beyondColor: ['#ff5a0a', '#ffb020'],
  ambient: .6, lightTint: '#ffb080', standFace: 'stone', standColor: '#3a3238', standTop: '#5a4a48', crowd: ['#ff6a1a', '#2b2b30', '#ffd040', '#e8e8e8'],
  props: ['volcano', 'basalt', 'vents'], weather: { kind: 'ash', amount: .45, wind: .2 }, towers: 4, night: true
});
BZ.def('parks', 'tranquility', {
  name: 'Tranquility Dome', team: 'meteors', city: 'Moonbase One', time: 'lunar night', music: 'tranquility', hazard: 'meteors', wind: false,
  fence: [1350, 1450, 1550, 1450, 1350], fenceH: 60, pad: '#3a3a5a', padTop: '#8a6aff',
  backdrop: { sky: ['#000008', '#05051a', '#10103a'], stars: true, moon: { x: .7, y: .25, r: 30, color: '#4a8ad8' },
    layers: [{ kind: 'mountains', color: '#3a3a44', y: .66, height: .16, parallax: .08, seed: 2 }, { kind: 'hills', color: '#55555f', y: .74, height: .08, parallax: .15 }] },
  grass: ['#3aa86a', '#34985e'], mow: 'astro', dirt: '#8a8a94', track: '#6a6a74', beyond: 'regolith', beyondColor: ['#7a7a84', '#8e8e98'],
  ambient: .6, lightTint: '#c8d8ff', standFace: 'stone', standColor: '#5a5a6a', standTop: '#9a9aaa', crowd: ['#c8d0e0', '#6a4cff', '#ffffff', '#4a4a5a'],
  props: ['habitat', 'antenna', 'rover', 'dish'], weather: null, towers: 4, night: true,
  gravityMul: .55, evMul: .8, jumpMul: 2, depth: 200, domeRibs: true
});
BZ.def('parks', 'boneyard', {
  name: 'Boneyard Ballpark', team: 'haunts', city: 'Hollowmoor', time: 'midnight', music: 'boneyard', hazard: 'phantom', wind: true,
  fence: [1000, 1080, 1120, 1080, 1000], fenceH: 36, pad: '#2a2830', padTop: '#7dffb0', ironFence: true,
  backdrop: { sky: ['#05040e', '#141430', '#2a2a50'], stars: true, moon: { x: .25, y: .22, r: 22, color: '#f0f0d8' },
    layers: [{ kind: 'forest', color: '#14141e', y: .62, height: .16, parallax: .08, seed: 5 }, { kind: 'fog', color: '#5a6a7a', y: .66, height: .1, parallax: .12 }, { kind: 'castle', color: '#0c0c14', y: .7, height: .2, parallax: .18 }] },
  grass: ['#4a6a3a', '#425e34'], mow: 'diamonds', dirt: '#5a4a40', track: '#3a3028', beyond: 'graves', beyondColor: ['#2a3a2a', '#34442e'],
  ambient: .45, lightTint: '#a8ffd0', standFace: 'stone', standColor: '#3a3440', standTop: '#5a5460', crowd: ['#e8e0c8', '#1a1630', '#7dffb0', '#8a8aa0'],
  props: ['tombstones', 'crypt', 'deadtrees', 'pumpkins'], weather: { kind: 'leaves', amount: .35, wind: .5 }, towers: 4, night: true
});
BZ.def('parks', 'megadome', {
  name: 'MegaMax MegaDome', team: 'mechanicals', city: 'MegaMax Corp', time: 'neon night', music: 'megadome', hazard: 'drones', wind: false, locked: true,
  fence: [1000, 1060, 1100, 1060, 1000], fenceH: 40, fenceSections: [{ from: -50, to: -20, h: 90 }], pad: '#1a1a2a', padTop: '#2de2e6',
  backdrop: 'city-night', grass: ['#2a8a5a', '#24804f'], mow: 'neon', dirt: '#4a4a5a', track: '#2a2a3a', beyond: 'concourse', beyondColor: ['#14142a', '#1c1c34'],
  ambient: .55, lightTint: '#ff80e0', standFace: 'stone', standColor: '#2a2a3a', standTop: '#5a5a7a', crowd: ['#e01e3c', '#2de2e6', '#b8c0cc', '#ffffff'],
  props: ['megatron', 'billboards', 'luxurybox', 'drones'], weather: null, towers: 4, night: true, bounceMul: 1.1, domeRibs: true
});
BZ.PARK_ORDER = ['kernel', 'barnacle', 'caldera', 'tranquility', 'boneyard', 'megadome'];
