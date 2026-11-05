// OutBloom's world: each stage becomes one E.Road (layout, junction or goal run-in, sky, fog), its scenery placed from
// the kit's rules with the stage's own seed, its landmarks, checkpoint and goal arches and the fork sign. Stages build
// lazily and are cached; the physics asks world.info() for the road under the car.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { px, clamp } = E;
const SEG = OB.SEG;

/* ---- the shapes the kits use, as things a road can carry: { w, draw(g, sx, sy, scale) } (scale: pixels a unit) ---- */
const thing = (w, draw) => ({ w, draw });
/** a box with a roof and a row of windows */
const house = (w, h, body, roof, win = '#ffe6a0') => thing(w, (g, x, y, s) => {
  const W = w * s, H = h * s; if (W < 1.5) return;
  px.rect(g, x - W / 2, y - H, W, H, body);
  px.poly(g, [[x - W / 2 - W * .06, y - H], [x + W / 2 + W * .06, y - H], [x, y - H - H * .45]], roof);
  if (W > 8) for (let yy = H * .2; yy < H * .8; yy += Math.max(2, H * .28)) for (let xx = -W * .3; xx <= W * .3; xx += Math.max(2, W * .32)) px.rect(g, x + xx - Math.max(1, W * .06), y - H + yy, Math.max(1, W * .12), Math.max(1, H * .12), win);
});
/** a tall building with lit windows (night city, town) */
const tower = (w, h, body, lit) => thing(w, (g, x, y, s) => {
  const W = w * s, H = h * s; if (W < 1.5) return;
  px.rect(g, x - W / 2, y - H, W, H, body);
  if (W > 8) for (let yy = H * .08; yy < H * .92; yy += Math.max(3, H * .12)) for (let xx = -W * .36; xx <= W * .36; xx += Math.max(3, W * .22)) px.rect(g, x + xx, y - H + yy, Math.max(1, W * .1), Math.max(1, H * .05), lit);
});
/** a beach hut: a striped front and a pitched roof */
const hut = (c1, c2) => thing(170, (g, x, y, s) => {
  const W = 170 * s, H = 110 * s; if (W < 2) return;
  px.rect(g, x - W / 2, y - H, W, H, c1);
  for (let k = 0; k < 4; k++) px.rect(g, x - W / 2 + k * W / 4, y - H, W / 8, H, c2);
  px.poly(g, [[x - W * .6, y - H], [x + W * .6, y - H], [x, y - H * 1.7]], '#8a4a2a');
});
/** a striped umbrella on a pole */
const umbrella = (c1, c2) => thing(120, (g, x, y, s) => {
  const W = 120 * s, H = 150 * s; if (W < 2) return;
  px.rect(g, x - W * .03, y - H, W * .06, H, '#e8e8e8');
  px.poly(g, [[x - W / 2, y - H * .85], [x + W / 2, y - H * .85], [x, y - H * 1.05]], c1);
  for (let k = 0; k < 4; k++) px.rect(g, x - W / 2 + k * W / 4, y - H * .95, W / 8, H * .1, c2);
});
/** a hay bale or a silo or a barn */
const barn = (body, roof) => thing(260, (g, x, y, s) => {
  const W = 260 * s, H = 170 * s; if (W < 2) return;
  px.rect(g, x - W / 2, y - H, W, H, body); px.poly(g, [[x - W / 2 - W * .05, y - H], [x + W / 2 + W * .05, y - H], [x, y - H * 1.5]], roof);
  px.rect(g, x - W * .12, y - H * .45, W * .24, H * .45, '#4a2a20');
});
const silo = thing(120, (g, x, y, s) => { const W = 120 * s, H = 360 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#c8c8d0'); px.poly(g, [[x - W / 2, y - H], [x + W / 2, y - H], [x, y - H * 1.25]], '#8a8a98'); });
const hay = thing(90, (g, x, y, s) => { const W = 90 * s, H = 60 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#e8c040'); px.rect(g, x - W / 2, y - H * .6, W, H * .12, '#b89020'); });
/** a wind turbine: its blades turn with the game clock */
const turbine = thing(60, (g, x, y, s) => {
  const H = 1100 * s; if (H < 4) return;
  px.rect(g, x - H * .02, y - H, H * .04, H, '#e8e8f0');
  const a = (OB.game.time || 0) * 2;
  for (let k = 0; k < 3; k++) { const t = a + k * Math.PI * 2 / 3, bl = H * .42; px.line(g, x, y - H, x + Math.cos(t) * bl, y - H + Math.sin(t) * bl, '#f8f8ff', Math.max(1, H * .02)); }
});
/** a flower arch: the checkpoint and goal gates, and the request's arches */
const arch = (text, col, wide = 2600) => thing(0, (g, x, y, s) => {
  const W = wide * s, H = 1500 * s; if (W < 3) return;
  for (const sx of [-1, 1]) px.rect(g, x + sx * W - 40 * s, y - H, 80 * s, H, '#e8e8f0');
  px.rect(g, x - W, y - H, W * 2, H * .2, col);
  for (let k = -4; k <= 4; k++) px.disc(g, x + k * W * .22, y - H * .18, Math.max(1, 70 * s), k % 2 ? '#ffd0e0' : '#ff7ab8');
  if (W > 60) E.font.text(g, text, Math.round(x), Math.round(y - H * .93), '#ffffff', { align: 'center', outline: false, scale: W > 400 ? 2 : 1 });
});
/** the fork sign in the gore: two stage names, an arrow each, and a difficulty flower count */
const forkSign = (left, right) => thing(600, (g, x, y, s) => {
  const W = 600 * s, H = 300 * s; if (W < 2) return;
  px.rect(g, x - W * .04, y - H * 2, W * .08, H * 2, '#606068');
  px.rect(g, x - W / 2, y - H * 2.4, W, H, '#f0e0a0');
  if (W > 40) {
    E.font.text(g, '< ' + left.name.toUpperCase(), Math.round(x - W * .42), Math.round(y - H * 2.1), '#7a3a20', { align: 'left', outline: false, font: 'tiny', scale: 1 });
    E.font.text(g, right.name.toUpperCase() + ' >', Math.round(x + W * .42), Math.round(y - H * 2.1), '#7a3a20', { align: 'right', outline: false, font: 'tiny', scale: 1 });
  }
});
/** a stone sign or a stage board */
const board = text => thing(600, (g, x, y, s) => {
  const W = 600 * s, H = 300 * s; if (W < 2) return;
  px.rect(g, x - W * .04, y - H * 2, W * .08, H * 2, '#606068');
  px.rect(g, x - W / 2, y - H * 2.4, W, H, '#f0e0a0');
  if (W > 40) E.font.text(g, text, Math.round(x), Math.round(y - H * 2.1), '#c03020', { align: 'center', outline: false, font: 'tiny' });
});
/** a lamp pole with a warm head */
const lamp = thing(40, (g, x, y, s) => { const H = 420 * s; if (H < 3) return; px.rect(g, x - H * .03, y - H, H * .06, H, '#40404a'); px.disc(g, x, y - H, Math.max(1, H * .09), '#ffe8a0'); });
/** a palm, a pine, a cactus: the engine's props, by name */
const prop = (name, size = 1) => { const p = E.prop(name, { size }); return p ? p.frames[0] : null; };

// the kit's scenery: rules [item, side ('L' | 'R' | 'both'), every (segments), offset range [min, max], scale, chance]
/** the scenery each kit sets beside the road: built once per kit and per stage (the stage's own seed picks) */
const SCENERY = {
  beach: [['palm', 'both', 4, [1.3, 1.8], 1, .9], ['umbrella', 'R', 9, [.9, 1.6], 1, .9], ['hut', 'R', 26, [2.4, 2.9], 1, .8], ['lifeguard', 'R', 60, [1.9, 2.2], 1, .8], ['buoy', 'L', 12, [1.6, 2.8], 1, .8]],
  fields: [['tree', 'both', 9, [1.3, 1.8], 1, .8], ['bush', 'both', 3, [1.2, 1.5], 1, .9], ['barn', 'R', 90, [2.2, 2.6], 1, .6], ['silo', 'L', 60, [2, 2.5], 1, .6], ['hay', 'R', 7, [1.6, 2.1], 1, .8], ['turbine', 'L', 110, [2.4, 3], 1, .5]],
  cliffs: [['rock', 'R', 6, [1.25, 1.6], 1, .9], ['tree', 'L', 9, [1.8, 2.2], 1, .7], ['house', 'L', 22, [2.4, 2.8], 1, .7], ['lamp', 'R', 24, [1.2, 1.4], 1, .6]],
  lake: [['pine', 'both', 5, [1.3, 1.8], 1, .9], ['boathouse', 'L', 70, [2.4, 2.8], 1, .6], ['bush', 'R', 6, [1.3, 1.6], 1, .6]],
  canyon: [['rock', 'both', 6, [1.5, 2], 1, .8], ['cactus', 'R', 10, [1.3, 1.6], 1, .8], ['mesa', 'L', 130, [2.5, 3], 1, .6], ['stand', 'R', 180, [2.2, 2.5], 1, .5]],
  alpine: [['pine', 'both', 4, [1.3, 1.8], 1, .9], ['cherry', 'both', 11, [1.5, 2.2], 1, .7], ['chalet', 'R', 60, [2.4, 2.8], 1, .6], ['rock', 'L', 9, [1.25, 1.6], 1, .7]],
  town: [['tower', 'both', 6, [1.25, 1.4], 1, .9], ['lantern', 'both', 12, [1.2, 1.4], 1, .8], ['awning', 'R', 18, [1.2, 1.5], 1, .7], ['fountain', 'L', 120, [2.2, 2.6], 1, .5]],
  vineyard: [['cypress', 'both', 4, [1.4, 1.9], 1, .9], ['vines', 'both', 8, [1.3, 1.5], 1, .8], ['villa', 'R', 80, [2.4, 2.8], 1, .6], ['barrel', 'L', 20, [1.25, 1.5], 1, .7]],
  lagoon: [['saltpyramid', 'R', 75, [2.5, 3], 1, .7], ['flamingos', 'L', 40, [2, 2.4], 1, .8], ['lamp', 'both', 14, [1.3, 1.5], 1, .8]],
  jungle: [['palm', 'both', 4, [1.3, 1.8], 1, .9], ['fern', 'both', 3, [1.2, 1.5], 1, .9], ['ruin', 'L', 110, [2.5, 3], 1, .6], ['orchid', 'R', 13, [1.3, 1.5], 1, .7]],
  nightcity: [['tower', 'both', 6, [1.5, 2.2], 1, .9], ['neon', 'R', 22, [1.4, 1.8], 1, .8], ['streetlamp', 'both', 12, [1.2, 1.4], 1, .9], ['casino', 'L', 300, [2.6, 3], 1, .3]],
  nightdesert: [['cactus', 'both', 9, [1.4, 1.9], 1, .9], ['nightcactus', 'R', 14, [1.3, 1.6], 1, .7], ['motel', 'R', 110, [2.5, 2.8], 1, .5], ['dish', 'L', 150, [2.6, 3], 1, .5]],
  highlands: [['stone', 'L', 8, [1.2, 1.4], 1, .8], ['rock', 'R', 10, [1.3, 1.6], 1, .7], ['heather', 'both', 6, [1.3, 1.5], 1, .8], ['castle', 'R', 260, [2.8, 3.2], 1, .4]],
};
/** the sky, the fog and the grass per kit: fog is the sky's far colour, so distance melts into the time of day */
const FOG = { beach: '#f2d8b8', fields: '#d8c8f0', cliffs: '#bfd8e8', lake: '#c8e4f4', canyon: '#f0c8a0', alpine: '#e0ecf8',
  town: '#e8d8c0', vineyard: '#f0c890', lagoon: '#f0c0d0', jungle: '#b8d8c0', nightcity: '#202038', nightdesert: '#2a2440', highlands: '#7060a0' };

/** the item for a scenery name (the kit's rules name them): a sprite or a thing */
function item(name, rng) {
  switch (name) {
    case 'palm': return prop('palm', 1.4) || thing(40, () => {});
    case 'tree': return prop('tree', 1.2) || thing(40, () => {});
    case 'pine': return prop('pine', 1.2) || thing(40, () => {});
    case 'bush': return prop('bush', 1) || thing(30, () => {});
    case 'rock': return prop('rock', 1) || thing(30, () => {});
    case 'cactus': return prop('cactus', 1.2) || thing(30, () => {});
    case 'fern': return prop('bush', 1.1) || thing(30, () => {});
    case 'orchid': return prop('flowers', 1.2) || thing(30, () => {});
    case 'cherry': return thing(120, (g, x, y, s) => { const W = 120 * s, H = 180 * s; if (W < 2) return; px.rect(g, x - W * .04, y - H * .6, W * .08, H * .6, '#6a4a3a'); px.disc(g, x, y - H * .7, W * .5, '#ffc0d8'); px.disc(g, x - W * .2, y - H * .55, W * .3, '#ffa8c8'); });
    case 'cypress': return thing(40, (g, x, y, s) => { const W = 40 * s, H = 320 * s; if (W < 2) return; px.poly(g, [[x - W / 2, y], [x + W / 2, y], [x, y - H]], '#2a5a3a'); });
    case 'vines': return thing(60, (g, x, y, s) => { const W = 60 * s, H = 60 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#4a7a3a'); px.rect(g, x - W * .4, y - H * .7, W * .8, H * .2, '#6a9a4a'); });
    case 'heather': return thing(40, (g, x, y, s) => { const W = 40 * s, H = 30 * s; if (W < 2) return; px.disc(g, x, y - H / 2, W / 2, '#8a5aa0'); });
    case 'barrel': return thing(30, (g, x, y, s) => { const W = 30 * s, H = 40 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#8a5a2a'); px.rect(g, x - W / 2, y - H * .7, W, H * .08, '#4a2a10'); });
    case 'lifeguard': return thing(90, (g, x, y, s) => { const W = 90 * s, H = 260 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H * .18, '#f8f8f8'); px.rect(g, x - W * .05, y - H * .8, W * .1, H * .8, '#e8e8e8'); px.rect(g, x - W / 2, y - H, W, H * .05, '#d82020'); });
    case 'buoy': return thing(30, (g, x, y, s) => { const W = 30 * s; if (W < 2) return; px.disc(g, x, y - W * .4, W * .4, '#ff5a2a'); });
    case 'lantern': return thing(20, (g, x, y, s) => { const H = 200 * s; if (H < 2) return; px.rect(g, x - 2 * s, y - H, 4 * s, H, '#3a3a40'); px.disc(g, x, y - H, Math.max(1, 14 * s), '#ffb040'); });
    case 'streetlamp': return lamp;
    case 'lamp': return lamp;
    case 'umbrella': return umbrella(['#ff7a6a', '#ffffff', '#ffd040'][Math.floor(rng() * 3)], '#ffffff');
    case 'hut': return hut(['#ff9ab8', '#7ac8e8', '#ffd060'][Math.floor(rng() * 3)], '#ffffff');
    case 'barn': return barn('#b83a2a', '#3a2a20');
    case 'silo': return silo;
    case 'hay': return hay;
    case 'turbine': return turbine;
    case 'house': return house(160, 150, ['#f0d8b0', '#e8c8a0', '#d8e8f0'][Math.floor(rng() * 3)], '#c8603a');
    case 'villa': return house(200, 180, '#f4e8d0', '#a8502a');
    case 'chalet': return house(170, 130, '#8a5a3a', '#4a2a20');
    case 'boathouse': return house(190, 120, '#3a7a9a', '#2a4a5a');
    case 'tower': return tower(120 + rng() * 80, 500 + rng() * 500, ['#f0dcc0', '#d8c8e8', '#c0d8e8', '#e8b8a8'][Math.floor(rng() * 4)], '#ffe0a0');
    case 'neon': return thing(200, (g, x, y, s) => { const W = 200 * s, H = 120 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#241a3a'); const cs = ['#ff4aa0', '#40e0ff', '#ffe040']; for (let k = 0; k < 4; k++) px.rect(g, x - W * .4 + k * W * .2, y - H * .6, W * .14, H * .3, cs[(k + Math.floor(OB.game.time * 2)) % 3]); });
    case 'casino': return thing(300, (g, x, y, s) => { const W = 300 * s, H = 300 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#1a1a2e'); px.disc(g, x, y - H * .6, W * .3, '#ff4aa0'); for (let k = 0; k < 6; k++) px.disc(g, x + Math.cos(k) * W * .3, y - H * .6 + Math.sin(k) * W * .3, W * .08, '#ffe040'); });
    case 'awning': return thing(90, (g, x, y, s) => { const W = 90 * s, H = 60 * s; if (W < 2) return; for (let k = 0; k < 6; k++) px.rect(g, x - W / 2 + k * W / 6, y - H, W / 12, H * .4, k % 2 ? '#ffffff' : '#e05050'); });
    case 'fountain': return thing(200, (g, x, y, s) => { const W = 200 * s, H = 60 * s; if (W < 2) return; px.disc(g, x, y - H / 2, W / 2, '#c8c8d8'); px.disc(g, x, y - H / 2, W / 3, '#8ab8e0'); px.line(g, x, y - H * .5, x, y - H * 1.6, '#d8f0ff', Math.max(1, W * .02)); });
    case 'mesa': return thing(300, (g, x, y, s) => { const W = 300 * s, H = 500 * s; if (W < 2) return; px.poly(g, [[x - W / 2, y], [x - W * .35, y - H], [x + W * .35, y - H], [x + W / 2, y]], '#c8704a'); });
    case 'stand': return thing(120, (g, x, y, s) => { const W = 120 * s, H = 180 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#e8c890'); px.rect(g, x - W * .3, y - H * .7, W * .6, H * .15, '#e05040'); });
    case 'saltpyramid': return thing(180, (g, x, y, s) => { const W = 180 * s, H = 220 * s; if (W < 2) return; px.poly(g, [[x - W / 2, y], [x + W / 2, y], [x, y - H]], '#f0f0f0'); });
    case 'flamingos': return thing(60, (g, x, y, s) => { const W = 60 * s, H = 120 * s; if (W < 2) return; for (let k = 0; k < 3; k++) px.rect(g, x - W / 2 + k * W / 3, y - H * .7, W / 8, H * .7, '#ff7aa8'); });
    case 'nightcactus': return thing(40, (g, x, y, s) => { const W = 40 * s, H = 160 * s; if (W < 2) return; px.rect(g, x - W * .2, y - H, W * .4, H, '#3ac8d8'); px.disc(g, x, y - H, W * .3, '#c0fff8'); });
    case 'dish': return thing(180, (g, x, y, s) => { const W = 180 * s, H = 220 * s; if (W < 2) return; px.rect(g, x - W * .03, y - H * .6, W * .06, H * .6, '#c8c8d0'); px.disc(g, x, y - H * .6, W * .45, '#b8b8c8'); });
    case 'motel': return thing(240, (g, x, y, s) => { const W = 240 * s, H = 300 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H * .6, '#e8d0a0'); E.font.text(g, 'MOTEL', Math.round(x), Math.round(y - H * .8), '#ff4aa0', { align: 'center', outline: false, scale: 1 }); });
    case 'stone': return thing(40, (g, x, y, s) => { const W = 40 * s, H = 220 * s; if (W < 2) return; px.poly(g, [[x - W / 2, y], [x + W / 2, y], [x + W * .3, y - H], [x - W * .3, y - H]], '#9a9aa8'); });
    case 'castle': return thing(400, (g, x, y, s) => { const W = 400 * s, H = 340 * s; if (W < 2) return; px.rect(g, x - W / 2, y - H, W, H, '#7a7088'); for (let k = -2; k <= 2; k++) px.rect(g, x + k * W * .2 - W * .04, y - H * 1.15, W * .08, H * .15, '#7a7088'); });
    case 'ruin': return thing(180, (g, x, y, s) => { const W = 180 * s, H = 280 * s; if (W < 2) return; px.rect(g, x - W * .45, y - H, W * .15, H, '#b8a890'); px.rect(g, x + W * .3, y - H * .8, W * .15, H * .8, '#b8a890'); px.rect(g, x - W * .45, y - H, W * .9, H * .12, '#a89878'); });
    case 'chapel': return house(200, 220, '#f4e8d8', '#6a4a40');
    case 'cone': return thing(20, (g, x, y, s) => { const W = 20 * s, H = 30 * s; if (W < 2) return; px.poly(g, [[x - W / 2, y], [x + W / 2, y], [x, y - H]], '#ff6a20'); });
    default: return thing(30, () => {});
  }
}

const rules = name => SCENERY[name] || [];

/** a stage's road, built once: returns { def, road, len, junction, checks, goal, forkZ, decideZ, endZ, info } */
const built = new Map();
function buildStage(def) {
  const rng = OB.rand.stream('stage', def.id);
  const sky = new E.Backdrop(def.sky);
  const road = new E.Road({ segment: SEG, lanes: def.lanes, draw: 220, fog: { color: FOG[def.kit] || '#c8e0f0', density: 4 }, sky, colors: { road: def.road, grass: def.grass, rumble: ['#f0f0f0', def.goal ? '#d82020' : '#2a50c0'] } });
  const segTag = [];
  let layoutLen = 0;
  // the mirror roads (an unlock): every bend turns the other way, and the sides swap
  const mir = OB.Progress && OB.Progress.mirror && OB.Progress.mirror();
  for (const [n, curve0, hill, tag] of def.layout) {
    const start = road.segs.length, curve = mir ? -curve0 : curve0;
    road.add(n, { curve, hill, tunnel: tag === 'tunnel' });
    for (let k = start; k < road.segs.length; k++) { if (tag && tag !== 'tunnel') road.segs[k].tag = tag; }
    layoutLen += n;
  }
  // the dressing (E2): each kit's grounds and edges along the whole stage, then the tags' rails, spans and walls
  const DRESS = {
    beach: { L: { groundL: ['#2a8ac8', '#2a7ab8'] } }, cliffs: { L: { groundL: ['#3a8ac8', '#3280c0'], edgeL: { kind: 'rail', h: 40 } }, R: { edgeR: { kind: 'cliff', h: 300 } } },
    lake: { L: { groundL: ['#2a7ab8', '#2470a8'], edgeL: { kind: 'rail', h: 40 } } }, alpine: { R: { groundR: ['#eef2fa', '#e0e6f2'] } },
    town: { L: { edgeL: { kind: 'facade', h: 260 } }, R: { edgeR: { kind: 'facade', h: 260 } } },
    lagoon: { L: { groundL: ['#3ab8c0', '#2aa8b0'], edgeL: { kind: 'rail', h: 40 } }, R: { groundR: ['#3ab8c0', '#2aa8b0'], edgeR: { kind: 'rail', h: 40 } } },
    nightcity: { L: { edgeL: { kind: 'facade', h: 300 } }, R: { edgeR: { kind: 'facade', h: 300 } } },
    highlands: { L: { edgeL: { kind: 'stonewall', h: 140 } }, R: { edgeR: { kind: 'stonewall', h: 140 } } },
  };
  const dr = DRESS[def.kit] || {};
  for (const sg of road.segs) { if (sg.tunnel) continue; if (dr.L) Object.assign(sg, dr.L); if (dr.R) Object.assign(sg, dr.R); }
  // the tags: a bridge's rails and truss, a palm avenue's canopy, a gallery, the seawall
  for (let k = 0; k < road.segs.length; k++) {
    const sg = road.segs[k];
    if (sg.tag === 'bridge') { sg.edgeL = { kind: 'rail', h: 40 }; sg.edgeR = { kind: 'rail', h: 40 }; sg.span = { kind: 'arch', h: 700 }; }
    if (sg.tag === 'span:palms') sg.span = { kind: 'canopy', h: 900 };
    if (sg.tag === 'gallery') sg.span = { kind: 'gallery', h: 700 };
    if (sg.tag === 'seawall') { sg.edgeL = { kind: 'wall', h: 60 }; sg.groundL = ['#2a8ac8', '#2a7ab8']; }
  }
  // the junction (80 flat segments) or the goal run-in (60): its arch or its fork at the end
  const tail = def.goal ? 60 : 80, junctionAt = road.segs.length;
  road.add(tail, { curve: 0, hill: 0 });
  // scenery: each rule places items on its own side at its own spacing, with the stage's seed for chance and offset
  for (const [name, side, every, [a, b], scale, chance] of rules(def.kit)) {
    for (let k = 3; k < junctionAt - 4; k += every) {
      if (rng() > chance) continue;
      const seg = road.segs[k]; if (seg.tunnel || seg.tag === 'bridge') continue;
      const s = (side === 'both' ? (rng() < .5 ? -1 : 1) : side === 'L' ? -1 : 1) * (mir ? -1 : 1);
      const off = s * (a + (b - a) * rng());
      road.place(k * SEG, off, item(name, rng), 8 * scale);
    }
  }
  // the landmark: one big thing on the right of the middle, from the kit's landmark list
  const mid = Math.round(junctionAt * .55);
  (def.landmarks || []).slice(0, 1).forEach((lm, i) => road.place(mid * SEG, 1.9 + i * .3, item(lm, rng), 8));
  // the checkpoint arch at the start of a stage (segment 2), and the goal arch at the end of its run-in
  const check = def.row > 1 ? 2 * SEG : null;
  if (check !== null) road.place(check, 0, arch('CHECKPOINT', '#2a8a3a'), 8);
  if (def.goal) road.place((junctionAt + 46) * SEG, 0, arch('GOAL', '#d02a2a', 3000), 8);
  // the fork sign at the top of the junction: both next stages, their names and flowers
  const next = OB.nextStages(def);
  if (next.length) road.place((junctionAt + 2) * SEG, 0, forkSign(next[0], next[1]), 8);
  // the start grid and the gantry, on stage 1 only
  if (def.row === 1 && def.col === 1) road.place(20 * SEG, 0, board('START'), 8);
  return {
    def, road, len: road.length, junction: junctionAt * SEG, layoutLen,
    checks: check !== null ? [check * SEG] : [],
    goalZ: def.goal ? (junctionAt + 46) * SEG : null,
    forkZ: def.goal ? null : junctionAt * SEG,
    decideZ: def.goal ? null : (junctionAt + 60) * SEG,   // the decision point: the car's side picks the branch
    endZ: road.length,
  };
}
OB.World = {
  /** a stage's built road (cached); id like 'S7' */
  stage(id) {
    let st = built.get(id); if (st) return st;
    const def = OB.STAGES.find(s => s.id === id); if (!def) throw new Error('no stage ' + id);
    st = buildStage(def); built.set(id, st); return st;
  },
  /** the physics query: the road under (z, x) of stage st: curve, slope, lanes, edge type, scenery touched, tag */
  info(st, z, x) {
    const road = st.road, s = road.seg(z), L = OB.SEG;
    const up = road.yAt(z + L) - road.yAt(z), down = road.yAt(z) - road.yAt(z - L);
    return { curve: s.curve, slope: up, crest: (up - down) / L, w: 1, onRoad: Math.abs(x) <= 1, tunnel: !!s.tunnel,
      tag: s.tag || null, hits: road.hits(z, x, .25), y: road.yAt(z), lanes: st.def.lanes };
  },
  /** the stage's id for a road position, from the route (the route is a list of stage ids) */
  built: () => built,
};
})();
