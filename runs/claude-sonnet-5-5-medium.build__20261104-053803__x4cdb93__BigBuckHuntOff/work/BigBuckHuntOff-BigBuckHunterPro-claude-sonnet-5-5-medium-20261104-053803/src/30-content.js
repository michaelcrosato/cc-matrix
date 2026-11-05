/* Content registries: sites, trophies, bonus games, range, story, barks. Data only (designers add here). */
(() => {
const BB = globalThis.BB, clamp = BB.clamp;
const pol = (b, r) => BB.polar(b, r);
/* spawn builders: [kind, t, [bearing, dist], [bearing, dist], opts] */
const buck = (t, f, to, o) => ({ k: 'buck', t, f, to, o: o || {} });
const doe = (t, f, to, o) => ({ k: 'doe', t, f, to, o: o || {} });
const fawn = (t, f, to, o) => ({ k: 'fawn', t, f, to, o: o || {} });
const crit = (type, t, f, to, o) => ({ k: 'critter', type, t, f, to, o: o || {} });

BB.SITES = {};
BB.SITE_ORDER = [];
const defSite = (s) => { BB.SITES[s.id] = s; BB.SITE_ORDER.push(s.id); return s; };

/* ====== HOLLOW CREEK ====== */
defSite({ id: 'hollow1', hunt: 'hollow', name: 'Creek Crossing', vantage: 'stand', camH: 4.5, fov: 34, time: 60, hyf: .44,
  desc: 'A tree stand over the ford. Three bucks, one doe with a fawn.', par: 2600,
  terrain: { amp: 4, fx: .018, fy: .02, seed: 5 }, water: (x, y) => Math.abs(y - (30 + Math.sin(x * .06) * 3)) < 4.5, hills: [{ x: -60, y: 80, r: 24, h: 7 }, { x: 70, y: 100, r: 30, h: 8 }],
  bounds: { x: 80, y: 130 }, yaw: [[0, -6], [22, 8], [44, 0]],
  scatter: [{ type: 'oak', n: 14, b: [-52, 52], r: [14, 110], s: [.9, 1.5], color: ['#c4661f', '#d9962a', '#a8321e'] }, { type: 'maple', n: 7, b: [-52, 52], r: [20, 120], s: [.9, 1.3] }, { type: 'birch', n: 8, b: [-52, 52], r: [18, 100], s: [.9, 1.2] }, { type: 'bush', n: 14, b: [-50, 50], r: [10, 90], s: [.8, 1.4], color: ['#7a5a1c', '#6a6a28'] }, { type: 'rock', n: 5, b: [-50, 50], r: [14, 70], s: [.7, 1.3] }, { type: 'reeds', n: 10, b: [-48, 48], r: [22, 36], s: [.9, 1.3] }],
  spawns: [
    doe(.5, [-38, 44], [42, 50], { gait: 'walk', cross: true }), fawn(1.6, [-40, 45], [42, 51], { gait: 'walk', cross: true }),
    buck(4, [-14, 42], [44, 70], { pts: 6, linger: 16, quick: true }),
    buck(19, [-44, 29], [46, 36], { pts: 8, gait: 'trot', cross: true }), doe(19.8, [-46, 31], [46, 38], { gait: 'trot', cross: true }), buck(20.6, [-48, 29], [46, 33], { pts: 7, gait: 'run', cross: true }),
    crit('squirrel', 3, [10, 30], null, { mode: 'idle', life: 55, peek: true }), crit('rabbit', 8, [-30, 26], [30, 24], { mode: 'run', life: 20 })
  ] });
defSite({ id: 'hollow2', hunt: 'hollow', name: 'Cornfield Edge', vantage: 'blind', camH: 1.8, fov: 28, time: 70, hyf: .46,
  desc: 'A ground blind at the corn. Four bucks, a skunk, and Bessie. Mind Bessie.', par: 3600,
  terrain: { amp: 3, fx: .02, fy: .02, seed: 9 }, hills: [{ x: -80, y: 90, r: 28, h: 6 }, { x: 90, y: 70, r: 22, h: 4 }],
  bounds: { x: 90, y: 150 }, yaw: [[0, 4], [25, -6], [50, 6]],
  scatter: [{ type: 'corn', n: 56, b: [-40, 40], r: [30, 80], s: [1, 1.5], rows: true }, { type: 'fence', n: 12, b: [-45, 45], r: [28, 29], s: [1, 1], line: true }, { type: 'barn', n: 1, b: [38, 38], r: [110, 110], s: [1.4, 1.4] }, { type: 'hay', n: 4, b: [-30, 30], r: [20, 60], s: [1, 1.2] }, { type: 'oak', n: 8, b: [-55, 55], r: [90, 150], s: [1, 1.6], color: ['#c4661f'] }, { type: 'bush', n: 8, b: [-50, 50], r: [14, 40], s: [.9, 1.2] }],
  spawns: [
    crit('cow', 1, [28, 60], [34, 62], { life: 90, scale: 1 }), crit('skunk', 6, [-24, 24], [-8, 22], { life: 30 }),
    buck(3, [-20, 62], [48, 88], { pts: 8, gait: 'run', cross: true, emerge: true, hidden: 1.5 }), doe(3.4, [-24, 64], [48, 90], { gait: 'run', cross: true, emerge: true }),
    buck(14, [6, 52], [50, 90], { pts: 6, gait: 'trot', cross: true }), buck(14.8, [10, 56], [-50, 96], { pts: 9, gait: 'trot', cross: true }),
    buck(30, [-38, 80], [40, 100], { pts: 7, linger: 12 }), doe(31, [-34, 78], [40, 100], { linger: 14 }),
    buck(46, [0, 70], [-50, 100], { pts: 10, linger: 6, gait: 'trot' }),
    crit('turkey', 8, [-34, 40], [38, 36], { life: 40 }), crit('turkey', 9, [-30, 42], [40, 38], { life: 40 }), crit('turkey', 10, [-38, 40], [38, 40], { life: 40 })
  ] });
defSite({ id: 'hollow3', hunt: 'hollow', name: 'Hardwood Ridge', vantage: 'rock', camH: 3, fov: 32, time: 75, hyf: .45,
  desc: 'Deer weave between trunks. Wait for gaps, and watch for the decoy doe.', par: 3500,
  terrain: { amp: 5, fx: .022, fy: .025, seed: 13 }, hills: [{ x: 0, y: 55, r: 18, h: 2.6 }],
  bounds: { x: 80, y: 130 }, yaw: [[0, -12], [28, 10], [55, -2]],
  scatter: [{ type: 'oak', n: 22, b: [-55, 55], r: [14, 100], s: [1.1, 1.7], color: ['#c4661f', '#d9962a'] }, { type: 'maple', n: 12, b: [-55, 55], r: [16, 90], s: [1, 1.5] }, { type: 'birch', n: 10, b: [-55, 55], r: [20, 90], s: [1, 1.3] }, { type: 'log', n: 3, b: [-30, 30], r: [28, 46], s: [1.1, 1.5] }, { type: 'bush', n: 10, b: [-55, 55], r: [14, 80], s: [.8, 1.3] }, { type: 'stump', n: 5, b: [-50, 50], r: [14, 60], s: [1, 1.2] }],
  spawns: [
    buck(2, [-30, 46], [40, 54], { pts: 8, gait: 'walk', cross: true }), doe(4, [-34, 42], [40, 50], { gait: 'walk', cross: true }),
    buck(10, [8, 38], [-45, 70], { pts: 5, linger: 4, gait: 'run', stubborn: true, bedded: true }),
    buck(24, [36, 66], [-40, 60], { pts: 9, gait: 'trot', cross: true }), buck(30, [-12, 56], [44, 80], { pts: 11, linger: 8, gait: 'trot' }),
    doe(40, [-4, 36], [44, 42], { linger: 12 }), buck(44, [26, 74], [-44, 90], { pts: 7, gait: 'run', cross: true }),
    crit('raccoon', 5, [-6, 26], null, { mode: 'idle', life: 70 }), crit('squirrel', 12, [20, 30], [-30, 28], { mode: 'run', life: 20 }), crit('squirrel', 22, [-20, 32], [30, 30], { mode: 'run', life: 20 })
  ] });

/* ====== BUGLE RIDGE ====== */
defSite({ id: 'bugle1', hunt: 'bugle', name: 'Aspen Park', vantage: 'knoll', camH: 2.4, fov: 28, time: 75, hyf: .45,
  desc: 'A herd grazes the meadow. Two bulls, a satellite bull that bugles, and an eagle.', par: 3000,
  terrain: { amp: 3.5, fx: .02, fy: .02, seed: 21 }, hills: [{ x: -70, y: 110, r: 30, h: 9 }, { x: 80, y: 90, r: 24, h: 7 }],
  bounds: { x: 100, y: 180 }, yaw: [[0, 0], [28, 14], [55, -8]],
  scatter: [{ type: 'aspen', n: 26, b: [-55, 55], r: [30, 150], s: [1, 1.5] }, { type: 'spruce', n: 14, b: [-55, 55], r: [60, 190], s: [1.1, 1.8] }, { type: 'rock', n: 8, b: [-50, 50], r: [20, 100], s: [.9, 1.6] }, { type: 'bush', n: 10, b: [-50, 50], r: [14, 70], s: [.8, 1.3], color: ['#7a6a2a'] }],
  spawns: [
    crit('eagle', 0, [-10, 120], null, { life: 80, cx: 0, cy: 130, h0: 28, radius: 60 }),
    buck(1, [-22, 58], [46, 90], { pts: 10, linger: 20 }), doe(1.2, [-26, 60], [46, 92], { linger: 24 }), doe(1.4, [-18, 62], [46, 94], { linger: 22 }), doe(1.6, [-30, 57], [46, 95], { linger: 18 }), doe(2, [-24, 66], [46, 98], { linger: 26 }), doe(2.2, [-16, 55], [46, 90], { linger: 20 }), doe(2.4, [-32, 62], [46, 92], { linger: 24 }),
    buck(6, [20, 66], [-50, 100], { pts: 8, linger: 28 }),
    buck(28, [48, 90], [-6, 62], { pts: 12, linger: 4, call: true, hidden: 2 }),
    crit('marmot', 4, [-4, 40], null, { mode: 'idle', life: 70 }), crit('grouse', 14, [10, 46], [-50, 60], { life: 18, fly: true })
  ] });
defSite({ id: 'bugle2', hunt: 'bugle', name: 'Talus Slope', vantage: 'rock', camH: 3.2, fov: 22, time: 75, hyf: .47,
  desc: 'Across the valley. Long shots: scope up, hold your breath.', par: 3400,
  terrain: { amp: 3, fx: .015, fy: .018, seed: 27 }, hills: [{ x: 0, y: 150, r: 70, ry: 40, h: 14 }, { x: -90, y: 120, r: 30, h: 6 }],
  bounds: { x: 140, y: 230 }, yaw: [[0, -6], [30, 8], [55, 0]],
  scatter: [{ type: 'spruce', n: 24, b: [-30, 30], r: [100, 210], s: [1.3, 2.1] }, { type: 'boulder', n: 14, b: [-30, 30], r: [100, 190], s: [1, 1.7] }, { type: 'aspen', n: 8, b: [-30, 30], r: [100, 170], s: [1.2, 1.7] }, { type: 'rock', n: 8, b: [-50, 50], r: [20, 60], s: [1, 1.5] }],
  spawns: [
    buck(2, [-14, 118], [24, 150], { pts: 10, gait: 'walk', cross: true }), buck(8, [16, 140], [-30, 128], { pts: 8, gait: 'walk', cross: true }), doe(9, [18, 142], [-30, 130], { gait: 'walk', cross: true }),
    buck(26, [-8, 110], [30, 166], { pts: 12, linger: 18 }), crit('coyote', 6, [-28, 160], [28, 150], { life: 40 }),
    { k: 'rockfall', t: 18 }
  ] });
defSite({ id: 'bugle3', hunt: 'bugle', name: 'Timberline Saddle', vantage: 'knoll', camH: 2.2, fov: 26, time: 70, hyf: .43,
  desc: 'Facing the sunset. Backlit silhouettes, a charging bull, and a grouse.', par: 3400,
  terrain: { amp: 5, fx: .02, fy: .02, seed: 31 }, hills: [{ x: -40, y: 70, r: 20, h: 3 }],
  bounds: { x: 100, y: 160 }, yaw: [[0, 12], [30, 22], [55, 14]],
  scatter: [{ type: 'spruce', n: 22, b: [-60, 60], r: [30, 150], s: [1.1, 1.8] }, { type: 'aspen', n: 12, b: [-60, 60], r: [30, 120], s: [1, 1.4] }, { type: 'rock', n: 8, b: [-55, 55], r: [20, 80], s: [1, 1.6] }],
  spawns: [
    buck(3, [-4, 76], [60, 92], { pts: 9, gait: 'walk', cross: true }), doe(5, [-8, 78], [60, 92], { gait: 'walk', cross: true }),
    buck(14, [34, 90], [-30, 86], { pts: 11, gait: 'trot', cross: true }), buck(26, [-34, 120], [-1, 18], { pts: 8, charge: true }),
    buck(42, [10, 100], [60, 120], { pts: 7, linger: 5, gait: 'run' }), crit('grouse', 12, [24, 44], [-40, 70], { life: 14, fly: true }), crit('marmot', 20, [-22, 38], null, { mode: 'idle', life: 40 })
  ] });

/* ====== MUSKEG LAKE ====== */
defSite({ id: 'muskeg1', hunt: 'muskeg', name: 'Reed Shallows', vantage: 'canoe', camH: 1.2, fov: 30, time: 70, hyf: .45,
  desc: 'A canoe offshore. Bulls wade the reeds. A cow and calf cross close. Loons!', par: 3000,
  terrain: { amp: 1.5, fx: .02, fy: .02, seed: 41, waterLevel: -.7 }, water: (x, y) => y < 52 || (y < 70 && Math.abs(x) < 50), hills: [{ x: -90, y: 120, r: 30, h: 6 }, { x: 80, y: 130, r: 34, h: 7 }],
  bounds: { x: 90, y: 160 }, yaw: [[0, -8], [24, 10], [50, -2]],
  scatter: [{ type: 'reeds', n: 36, b: [-55, 55], r: [20, 80], s: [1.2, 1.7] }, { type: 'spruce', n: 18, b: [-60, 60], r: [90, 170], s: [1.2, 1.9], color: '#1b3430' }, { type: 'snag', n: 6, b: [-50, 50], r: [60, 120], s: [1, 1.5] }, { type: 'beaver', n: 1, b: [34, 34], r: [56, 56], s: [1, 1] }],
  spawns: [
    buck(2, [-24, 60], [36, 64], { pts: 48, gait: 'walk', cross: true }), doe(5, [30, 28], [-40, 34], { gait: 'walk', cross: true }), fawn(6, [32, 29], [-40, 35], { gait: 'walk', cross: true }),
    buck(16, [40, 78], [-40, 66], { pts: 52, gait: 'walk', cross: true }), doe(17, [-30, 62], [38, 66], { gait: 'walk', cross: true }), doe(18, [-34, 63], [38, 67], { gait: 'walk', cross: true }),
    crit('loon', 4, [-8, 38], null, { life: 70 }), crit('loon', 4.5, [14, 44], null, { life: 70 }), crit('duck', 12, [-30, 36], [50, 70], { life: 14, fly: true }), crit('beaver', 9, [30, 56], [-20, 48], { life: 30 })
  ] });
defSite({ id: 'muskeg2', hunt: 'muskeg', name: 'Spruce Bog', vantage: 'bog', camH: 1.7, fov: 36, time: 70, hyf: .46,
  desc: 'Fog banks drift. Moose loom out close; one stands and stares.', par: 3200,
  terrain: { amp: 2, fx: .025, fy: .025, seed: 47 }, hills: [{ x: 50, y: 70, r: 18, h: 2.4 }],
  bounds: { x: 80, y: 120 }, yaw: [[0, 8], [26, -8], [52, 6]], fogExtra: 1.1,
  scatter: [{ type: 'spruce', n: 28, b: [-60, 60], r: [14, 100], s: [1, 1.7], color: '#1b3430' }, { type: 'tamarack', n: 12, b: [-60, 60], r: [16, 90], s: [1, 1.5] }, { type: 'reeds', n: 12, b: [-50, 50], r: [14, 50], s: [1, 1.5], color: '#8a7440' }, { type: 'snag', n: 5, b: [-50, 50], r: [20, 80], s: [1, 1.4] }],
  spawns: [
    buck(3, [-24, 32], [40, 40], { pts: 44, gait: 'walk', cross: true }), buck(14, [20, 24], [-40, 36], { pts: 50, linger: 3, stubborn: true, stare: true }),
    doe(22, [0, 28], [40, 34], { linger: 10 }), buck(30, [-30, 46], [30, 56], { pts: 54, gait: 'trot', cross: true }),
    crit('hare', 5, [-12, 20], [26, 24], { mode: 'run', life: 16 }), crit('raven', 20, [-40, 30], [40, 30], { life: 14, fly: true, alt: 6 })
  ] });
defSite({ id: 'muskeg3', hunt: 'muskeg', name: 'Burn Clearing', vantage: 'rise', camH: 2.8, fov: 26, time: 75, hyf: .45,
  desc: 'A snowy rise over the burn. Trotting bulls, a wolf pack, a cow they chase.', par: 3200,
  terrain: { amp: 3, fx: .02, fy: .02, seed: 53 }, hills: [{ x: -40, y: 90, r: 22, h: 5 }],
  bounds: { x: 110, y: 180 }, yaw: [[0, -10], [28, 8], [55, -2]],
  scatter: [{ type: 'snag', n: 30, b: [-60, 60], r: [30, 140], s: [1.1, 1.8] }, { type: 'rock', n: 8, b: [-50, 50], r: [20, 100], s: [1, 1.6], snow: true }, { type: 'snowdrift', n: 8, b: [-50, 50], r: [16, 80], s: [1, 1.5] }],
  spawns: [
    buck(2, [-30, 76], [40, 90], { pts: 50, gait: 'trot', cross: true }), buck(12, [36, 98], [-34, 86], { pts: 46, gait: 'trot', cross: true }),
    buck(14, [34, 100], [-34, 88], { pts: 55, gait: 'trot', cross: true }),
    doe(30, [-40, 64], [44, 70], { gait: 'run', cross: true }),
    crit('wolf', 31, [-48, 62], [44, 68], { life: 18, run: true }), crit('wolf', 31.8, [-50, 64], [44, 70], { life: 18, run: true }), crit('wolf', 32.6, [-52, 66], [44, 72], { life: 18, run: true }),
    buck(44, [-10, 120], [30, 110], { pts: 51, linger: 12, gait: 'trot' }), crit('raven', 10, [30, 40], [-40, 60], { life: 14, fly: true, alt: 5 })
  ] });

/* ====== TROPHIES ====== */
defSite({ id: 'ironrack', hunt: 'hollow', name: 'Old Iron Rack', trophy: 'ironrack', vantage: 'blind', camH: 1.8, fov: 24, time: 45, hyf: .46,
  desc: 'Fog Glade at dawn. Fourteen points. He only shows between the fog banks.', par: 1500,
  terrain: { amp: 2, fx: .02, fy: .02, seed: 61 }, hills: [], bounds: { x: 90, y: 140 }, yaw: [[0, 0]], fogExtra: .6,
  scatter: [{ type: 'oak', n: 12, b: [-55, 55], r: [30, 110], s: [1.2, 1.8], color: ['#c4661f'] }, { type: 'birch', n: 12, b: [-55, 55], r: [24, 100], s: [1, 1.4] }, { type: 'bush', n: 8, b: [-50, 50], r: [16, 60], s: [.9, 1.3] }],
  spawns: [] });
defSite({ id: 'duke', hunt: 'bugle', name: 'The Duke of Bugle Ridge', trophy: 'duke', vantage: 'knoll', camH: 2.4, fov: 24, time: 50, hyf: .45,
  desc: 'A 7x7 bull in the dark timber. Answer his bugle. Make him curious.', par: 1500,
  terrain: { amp: 3, fx: .02, fy: .02, seed: 67 }, hills: [], bounds: { x: 100, y: 170 }, yaw: [[0, 0]],
  scatter: [{ type: 'spruce', n: 26, b: [-55, 55], r: [70, 150], s: [1.4, 2.2] }, { type: 'aspen', n: 10, b: [-55, 55], r: [40, 90], s: [1, 1.5] }, { type: 'rock', n: 6, b: [-50, 50], r: [20, 60], s: [1, 1.4] }],
  spawns: [] });
defSite({ id: 'bigmo', hunt: 'muskeg', name: 'Big Mo', trophy: 'bigmo', vantage: 'stand', camH: 4, fov: 36, time: 45, hyf: .42,
  desc: 'A 72-inch bull on the lake shore. He does not run from you. He runs at you.', par: 1500,
  terrain: { amp: 1.5, fx: .02, fy: .02, seed: 71, waterLevel: -.7 }, water: (x, y) => y > 110 && Math.abs(x) > 20 && y < 160, hills: [], bounds: { x: 100, y: 190 }, yaw: [[0, 0]],
  scatter: [{ type: 'reeds', n: 20, b: [-55, 55], r: [60, 120], s: [1.3, 1.8] }, { type: 'spruce', n: 14, b: [-60, 60], r: [80, 160], s: [1.3, 2], color: '#1b3430' }, { type: 'snag', n: 4, b: [-45, 45], r: [30, 70], s: [1.2, 1.5] }],
  spawns: [] });

/* ====== BONUS GAMES ====== */
BB.BONUS = {
  crows: { id: 'crows', hunt: 'hollow', name: 'Crow Patrol', host: 'granny', time: 30, rounds: 10, rack: .15, desc: 'Crows ate the sweet corn. Shoot crows. Not Hank.', site: 'hollow2' },
  saucers: { id: 'saucers', hunt: 'bugle', name: 'Saucer Season', host: 'loretta', time: 30, rounds: 12, rack: .15, desc: 'Clay saucers from the trap house. Gold ones pay big.', site: 'bugle1' },
  snowballs: { id: 'snowballs', hunt: 'muskeg', name: 'Snowball Standoff', host: 'earl', time: 30, rounds: 12, rack: .15, desc: 'Snowmen lob snowballs. Shoot the balls, knock off hats.', site: 'muskeg1' }
};
BB.BONUS_ORDER = ['crows', 'saucers', 'snowballs'];
/* the site a bonus game is staged on (scenery only) */
defSite({ id: 'bonus_crows', hunt: 'hollow', name: 'Crow Patrol', bonus: 'crows', vantage: 'trail', camH: 1.7, fov: 40, time: 30, hyf: .5, desc: '', par: 1500,
  terrain: { amp: 1, fx: .02, fy: .02, seed: 81 }, hills: [], bounds: { x: 90, y: 100 }, yaw: [[0, 0]],
  scatter: [{ type: 'corn', n: 60, b: [-50, 50], r: [20, 70], s: [1, 1.5], rows: true }, { type: 'barn', n: 1, b: [-30, -30], r: [90, 90], s: [1.3, 1.3] }, { type: 'oak', n: 5, b: [-55, 55], r: [70, 110], s: [1.2, 1.6], color: ['#c4661f'] }], fixed: [{ type: 'scarecrow', x: 0, y: 30, s: 1.2 }], spawns: [] });
defSite({ id: 'bonus_saucers', hunt: 'bugle', name: 'Saucer Season', bonus: 'saucers', vantage: 'knoll', camH: 1.7, fov: 40, time: 30, hyf: .5, desc: '', par: 1500,
  terrain: { amp: 2, fx: .02, fy: .02, seed: 83 }, hills: [], bounds: { x: 90, y: 100 }, yaw: [[0, 0]],
  scatter: [{ type: 'spruce', n: 14, b: [-55, 55], r: [70, 130], s: [1.3, 2] }, { type: 'aspen', n: 10, b: [-55, 55], r: [60, 120], s: [1, 1.5] }], fixed: [{ type: 'trap', x: -10, y: 38, s: 1.2 }, { type: 'trap', x: 12, y: 40, s: 1.2 }], spawns: [] });
defSite({ id: 'bonus_snowballs', hunt: 'muskeg', name: 'Snowball Standoff', bonus: 'snowballs', vantage: 'rise', camH: 1.7, fov: 40, time: 30, hyf: .5, desc: '', par: 1500,
  terrain: { amp: 1, fx: .02, fy: .02, seed: 85 }, hills: [], bounds: { x: 90, y: 100 }, yaw: [[0, 0]],
  scatter: [{ type: 'spruce', n: 12, b: [-55, 55], r: [70, 130], s: [1.3, 2], color: '#1b3430' }, { type: 'snowdrift', n: 8, b: [-45, 45], r: [22, 46], s: [1.4, 1.9] }], fixed: [], spawns: [] });
/* Uncle Dub's practice range */
defSite({ id: 'range', hunt: 'hollow', name: "Uncle Dub's Range", range: true, vantage: 'knoll', camH: 1.7, fov: 30, time: 9999, hyf: .46, desc: '', par: 0,
  terrain: { amp: 1.2, fx: .02, fy: .02, seed: 91 }, hills: [], bounds: { x: 120, y: 200 }, yaw: [[0, 0]],
  scatter: [{ type: 'oak', n: 8, b: [-58, 58], r: [90, 150], s: [1.2, 1.7], color: ['#c4661f', '#d9962a'] }, { type: 'bush', n: 8, b: [-50, 50], r: [60, 120], s: [1, 1.3] }], fixed: [], spawns: [] });

/* ====== HUNTS (campaign order) ====== */
BB.HUNT_LIST = ['hollow', 'bugle', 'muskeg'];
BB.HUNT_PLAN = {
  hollow: { sites: ['hollow1', 'hollow2', 'hollow3'], trophy: 'ironrack', bonus: 'crows' },
  bugle: { sites: ['bugle1', 'bugle2', 'bugle3'], trophy: 'duke', bonus: 'saucers' },
  muskeg: { sites: ['muskeg1', 'muskeg2', 'muskeg3'], trophy: 'bigmo', bonus: 'snowballs' }
};
Object.assign(BB.HUNTS.hollow, { host: 'dub', rivalPar: 9000 }); Object.assign(BB.HUNTS.bugle, { host: 'loretta', rivalPar: 10500 }); Object.assign(BB.HUNTS.muskeg, { host: 'earl', rivalPar: 11000 });
BB.RIVALS = [{ id: 'dwayne', name: 'Cousin Dwayne', f: 1.0 }, { id: 'loretta', name: 'Loretta Pruitt', f: .85 }, { id: 'earl', name: 'Big Earl', f: .55 }];
BB.RANKS = [[0, 'Greenhorn'], [.4, 'Tenderfoot'], [.6, 'Woodsman'], [.8, 'Sharpshooter'], [1, 'Big Game Pro'], [1.25, 'Legend of the Lodge']];
BB.rankFor = (score, par) => { const r = par > 0 ? score / par : 0; let name = BB.RANKS[0][1]; for (const [t, n] of BB.RANKS) if (r >= t) name = n; return name; };

/* ====== CAST, STORY, BARKS ====== */
BB.CAST = {
  emcee: { name: 'EMCEE', color: '#ffd36a', hair: 'short', hat: { style: 'crown', color: '#c0392b' }, outfit: 'coat', skin: '#e8b890', pitch: [330, 560], wave: 'square' },
  dub: { name: 'UNCLE DUB', color: '#9fd18a', hair: 'short', hat: { style: 'cap', color: '#4a6a2a' }, outfit: 'shirt', skin: '#d8a070', pitch: [120, 230], wave: 'triangle' },
  granny: { name: 'GRANNY MAE', color: '#f0a8c8', hair: 'long', hat: { style: 'band', color: '#e86a9a' }, outfit: 'robe', skin: '#f0cba8', pitch: [260, 420], wave: 'triangle' },
  dwayne: { name: 'COUSIN DWAYNE', color: '#ff8a6a', hair: 'spiky', hat: { style: 'cap', color: '#c0392b' }, outfit: 'tunic', skin: '#e8b890', pitch: [180, 320], wave: 'square' },
  loretta: { name: 'LORETTA', color: '#7ab6ff', hair: 'ponytail', hat: null, outfit: 'coat', skin: '#b8805a', pitch: [240, 400], wave: 'pulse' },
  earl: { name: 'BIG EARL', color: '#e0c070', hair: 'bald', hat: { style: 'helmet', color: '#8a6a3a' }, outfit: 'tunic', skin: '#d8a070', pitch: [90, 180], wave: 'saw' }
};
BB.STORY = {
  welcome: [['emcee', 'Welcome to the 41st Annual Big Buck Hunt-Off!'], ['emcee', 'Three hunts. One trophy wall. Zero does!'], ['dub', "Name's Dub. Forty years guidin'. Lost twice. On purpose."], ['dwayne', "Hope you packed a lunch, cuz. You'll be here a while."], ['loretta', "Ignore him. He shot a mailbox in '09."], ['earl', "I'm mostly here for the chili."]],
  hollow_intro: [['dub', 'Whitetails thick as ticks out here.'], ['dub', "Bucks got antlers. Does don't. Can't tell? Don't pull."], ['dub', "Pump after every shot. This rifle's older'n me."], ['dub', 'Hold the scope for the long ones. Give a grunt to stop one.']],
  ironrack: [['dub', 'Old Iron Rack. Fourteen points.'], ['dub', "Walks in the fog so nobody can count 'em."], ['dub', "Been dodgin' hunters since your daddy wore diapers."]],
  crows: [['granny', 'Crows ate my sweet corn. Every last ear!'], ['granny', 'Shoot the crows, sugar. Not Hank.']],
  bugle_intro: [['dub', "Elk hear a bugle, they come lookin' for a fight."], ['dub', "Give 'em a call and they'll stop to see who's talkin'."], ['loretta', 'Sun goes down fast up here. Make it count.']],
  duke: [['dub', "The Duke don't come out for just anybody."], ['dub', 'Answer him back. Make him curious.']],
  saucers: [['loretta', "Pull!... That's what you say. Then you shoot it."], ['loretta', 'Gold ones are worth five hundred. Do not miss gold.']],
  muskeg_intro: [['dub', 'Moose ain\'t skittish. Moose is a truck with opinions.'], ['earl', "Chili's on the fire if you live."]],
  bigmo: [['dub', "Big Mo don't run from you."], ['dub', 'He runs AT you. Hold steady.']],
  snowballs: [['earl', 'The snowmen are back. They want revenge.'], ['earl', 'Hats are worth a hundred fifty. The Snowmoose has the big one.']],
  ceremony_win: [['emcee', 'Our new Hunt-Off champion!'], ['dub', 'Hang it on the wall, kid.']],
  ceremony_lose: [['emcee', "There's always next year!"], ['dub', 'Hang it on the wall anyway, kid.']],
  dwayne_ahead: [['dwayne', 'Told ya. Bring a lunch.']], dwayne_behind: [['dwayne', "Scope's crooked. That's all that is."]]
};
BB.BARKS = {
  start: ['BUCKS ONLY!', 'HERE THEY COME!', 'EYES SHARP, HUNTERS!'], kill: ['NICE SHOT!', 'BAGGED \'EM!', 'WHAT A SHOT!', 'DOWN HE GOES!'],
  long: ['LONG SHOT! CALL THE PAPER!'], running: ['RUNNING SHOT!'], quick: ['QUICK DRAW!'], double: ['DOUBLE!'], triple: ['TRIPLE! THE CROWD GOES MILD!'],
  miss: ['MISSED HIM CLEAN!', 'THAT\'S A LOT OF DIRT YOU KILLED!', 'BARK\'S DEAD, BUCK AIN\'T!'], pump: ['PUMP IT!'], reload: ['RELOAD, HOSS!'],
  doe: ['DOE! YOU\'RE OUT!', 'THAT\'S A DOE! HOLSTER UP!', 'AW, NOT MAMA!'], fawn: ['A FAWN?! GO SIT IN THE TRUCK!'],
  escape: ['HE\'S GETTIN\' AWAY!', 'GONE LIKE A RUMOR!'], lost: ['WOUNDED AND LOST...'], clear: ['SITE CLEAR!'], time: ['TIME!'], sweep: ['CLEAN SWEEP!'],
  trophySpot: ['TROPHY SPOTTED!'], trophyBag: ['TROPHY BAGGED!'], trophyLost: ['THE ONE THAT GOT AWAY...'],
  tips: ['Wait for him to clear that tree.', 'Hold your breath. Steady as a church pew.', 'Give him a grunt.', 'Lead a runner. Aim where he is going.']
};
/* build props for a site from its scatter rules, deterministic by site id */
BB.buildProps = (site, terrain) => {
  const r = BB.rng(BB.hashStr(site.id) + 11), out = [];
  const rr = (a, b) => a + (b - a) * r();
  for (const s of site.scatter || []) {
    if (s.line) { for (let i = 0; i < s.n; i++) { const b = lerpv(s.b[0], s.b[1], i / Math.max(1, s.n - 1)), d = rr(s.r[0], s.r[1]), [x, y] = pol(b, d); out.push({ type: s.type, x, y, z: terrain(x, y), s: rr(s.s[0], s.s[1]), seed: i, bw: BB.PROPS[s.type].bw, bh: BB.PROPS[s.type].bh }); } continue; }
    if (s.rows) { const rows = 5; for (let rrw = 0; rrw < rows; rrw++) for (let i = 0; i < s.n / rows; i++) { const b = lerpv(s.b[0], s.b[1], (i + r() * .4) / (s.n / rows)), d = lerpv(s.r[0], s.r[1], rrw / (rows - 1)) + r() * 2, [x, y] = pol(b, d); out.push({ type: s.type, x, y, z: terrain(x, y), s: rr(s.s[0], s.s[1]), seed: i + rrw * 7 }); } continue; }
    for (let i = 0; i < s.n; i++) {
      const b = rr(s.b[0], s.b[1]), d = rr(s.r[0], s.r[1]), [x, y] = pol(b, d);
      if (terrain.water(x, y) && s.type !== 'reeds' && s.type !== 'beaver') continue;
      const col = Array.isArray(s.color) ? s.color[Math.floor(r() * s.color.length)] : s.color;
      const def = BB.PROPS[s.type]; out.push({ type: s.type, x, y, z: terrain(x, y), s: rr(s.s[0], s.s[1]), seed: i, color: col, snow: site.hunt === 'muskeg', bw: def.bw, bh: def.bh });
    }
  }
  for (const f of site.fixed || []) { const def = BB.PROPS[f.type]; out.push({ type: f.type, x: f.x, y: f.y, z: terrain(f.x, f.y), s: f.s || 1, seed: 1, bw: def.bw, bh: def.bh, fixed: true }); }
  return out;
};
const lerpv = (a, b, t) => a + (b - a) * t;
})();
