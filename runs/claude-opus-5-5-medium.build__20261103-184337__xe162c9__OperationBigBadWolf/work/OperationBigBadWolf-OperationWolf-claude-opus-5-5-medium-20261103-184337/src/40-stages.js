// The six operations as data (8.6): look, rail, holds, scenery, props, beats, quotas, boss, perk.
// Positions: x along the rail from the stage's origin (ox), y = minus the depth from the rail (oy). Spawns in beats are
// in the camera's frame at the moment the beat fires: lx (sideways, + right), dz (depth ahead), z.
(() => {
const E = My3D2dge, WP = globalThis.WP, TY = WP.TYPES, BEH = WP.BEHAV, T = WP.T;
const H = (s, i) => (WP.hash(s + ':' + i) % 1000) / 1000;   // deterministic jitter for layouts
// ---------------------------------------------------------------------------------------------- stage-only types
TY.rockCover = { kind: 'prop', name: 'ROCK', shape: 'rock', hp: Infinity, box: [26, 18, 18], cover: true, mat: 'rock', size: 2.2 };
TY.wreckJeep = { kind: 'prop', name: 'WRECK', shape: 'jeep', hp: Infinity, box: [44, 22, 18], cover: true, mat: 'metal', charred: true };
TY.fuelTruck = { kind: 'prop', name: 'FUEL TRUCK', shape: 'fuelTruck', hp: 8, box: [60, 24, 30], mat: 'metal', keep: true, onBreak: (s, e, p) => s.later.push({ t: .15, fn: () => s.explode(e.x, e.y, 14, 80, 20, p, { src: e }) }) };
TY.forklift = { kind: 'animal', name: 'FORKLIFT', shape: 'forklift', hp: 1, beh: 'animal', r: 16, cz: 12, speed: 34, fadeT: 1 };
TY.wagon.onBreak = (s, e, p) => s.later.push({ t: .15, fn: () => { s.explode(e.x, e.y, 14, 70, 30, p, { src: e }); for (const b of s.ents) if (b.kind === 'boss' && !b.dead && b.type === 'ironHog') WP.bossBlastAt(s, b, e.x, e.y, 90, 30, p); } });
TY.towerGun = Object.assign({}, TY.gunner, { name: 'TOWER GUNNER', beh: 'snipe', atk: 'gun', tele: 1.4, bullets: [3, 4], acc: .35, dmg: 4 });
// knives dropping from branches, then popping up
BEH.drop = (sim, e, dt) => { if (e.st === 'enter') { e.z = e.o.z || 40; e.st = 'fall'; e.pose = 'crouch'; } if (e.st === 'fall') { e.z -= 90 * dt; if (e.z <= 0) { e.z = 0; e.beh = 'popup'; e.st = 'enter'; e.o.cycles = 2; } } };
// jeeps chasing the plane on the runway (camera frame)
BEH.chaseJeep = (sim, e, dt) => {
  if (e.st === 'enter') { e.cam = true; e.st = 'chase'; e.base = e.dz; e.gT = 1 + sim.R.ai(); e.z = 0; }
  if (sim.part === 'B' && sim.tB > 21) { e.gone = true; return; }
  e.dz = e.base + Math.sin(e.t * .7 + e.id) * 30; e.lx = (e.o.lx || 0) + Math.sin(e.t * .5 + e.id * 2) * 50; e.facing = sim.cam.angle + Math.PI;
  if ((e.gT -= dt) <= 0 && !e.tele && e.gunner && !e.gunner.dead) { e.gT = 2.4; sim.telegraph(e, 'ring', 1.2, (s, en, tl) => { en.firing = .3; s.burst(en, tl.pid, 3, .4, 4); }); }
};
const S = WP.SC = {
  // scenery helpers: entries { k: 'shape', id, x, y, z, f (facing), s (size) } or { k: 'draw', fn, x, y, z, o }
  shape: (id, x, y, o = {}) => ({ k: 'shape', id, x, y: -y, z: o.z || 0, f: o.f === undefined ? Math.PI / 2 : o.f, s: o.s || 1, p: o.p }),
  draw: (fn, x, y, o = {}) => ({ k: 'draw', fn, x, y: -y, z: o.z || 0, o }),
  row: (id, x0, x1, dep, every, jit, o = {}) => { const out = []; for (let x = x0, i = 0; x <= x1; x += every, i++) { const jx = (H(id + dep, i) - .5) * jit, jy = (H(id + 'y' + dep, i) - .5) * jit * .6; out.push(S.shape(id, x + jx, dep + jy, Object.assign({}, o, { f: o.f !== undefined ? o.f : H(id, i) * 6.28, s: (o.s || 1) * (.85 + H(id + 's', i) * .3) }))); } return out; },
  rowDraw: (fn, x0, x1, dep, every, jit, o = {}) => { const out = []; for (let x = x0, i = 0; x <= x1; x += every, i++) out.push(S.draw(fn, x + (H(fn + dep, i) - .5) * jit, dep + (H(fn + 'y', i) - .5) * jit * .5, Object.assign({ seed: i }, o))); return out; }
};
// ---------------------------------------------------------------------------------------------- floor painters: (x, y) -> [r, g, b]
const N = E.noise2, mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hx = c => E.hex(c);
WP.FLOORS = {
  hill: (ox, oy) => { const G1 = hx('#8a8a4a'), G2 = hx('#6e7a3a'), D1 = hx('#9a7a52'), D2 = hx('#7a5e3e'); return (x, y) => {
    const dep = oy - y, n = N(x * .02, y * .02), f = N(x * .3, y * .3);
    const road = dep > 66 && dep < 112, rut = road && (Math.abs(dep - 80) < 3 || Math.abs(dep - 98) < 3);
    let c = road ? mix3(D1, D2, f * .6 + (rut ? .5 : 0)) : mix3(G1, G2, n * .8 + f * .3);
    if (!road && N(x * .05 + 9, y * .05) > .72) c = mix3(c, D2, .5);
    if (!road && f > .8) c = mix3(c, [200, 190, 110], .3);
    return c; }; },
  river: (ox, oy) => { const W1 = hx('#4a5a3a'), W2 = hx('#3a4a34'), M1 = hx('#5a4a32'), M2 = hx('#3e3424'); return (x, y) => {
    const lx = x - ox, n = N(x * .03, y * .03), f = N(x * .25, y * .25), bank = 110 + (N(y * .01, 3) - .5) * 30 + (y < oy - 1950 && y > oy - 2250 && lx < 0 ? -150 : 0) + (y < oy - 650 && y > oy - 900 && lx > 0 ? 150 : 0);
    if (Math.abs(lx) < bank) { const rip = Math.sin(y * .25 + N(x * .1, y * .05) * 6) > .85 ? .35 : 0; return mix3(W1, W2, n * .7 + rip); }
    const edge = Math.abs(lx) - bank < 8; return edge ? mix3(M2, [30, 26, 20], .4) : mix3(M1, M2, n * .7 + f * .3); }; },
  village: (ox, oy) => { const S1 = hx('#d8bf8a'), S2 = hx('#c4a470'), C1 = hx('#a89a88'), C2 = hx('#8a7c6c'); return (x, y) => {
    const dep = oy - y, n = N(x * .03, y * .03), f = N(x * .4, y * .4);
    const cob = (dep > 60 && dep < 160 && N(x * .012, y * .012) > .55) || (x > ox + 2580 && dep < 330);
    if (cob) { const cx = ((x * .5) | 0) % 6 === 0 || ((y * .5 + (((x * .5) / 6) | 0) * 3) | 0) % 6 === 0; return cx ? C2 : mix3(C1, C2, f * .5); }
    return mix3(S1, S2, n * .6 + f * .25); }; },
  depot: (ox, oy) => { const C1 = hx('#7a7468'), C2 = hx('#5e5a52'), D1 = hx('#6a5a44'), RL = hx('#3a3430'), TI = hx('#4a3a2a'); return (x, y) => {
    const dep = oy - y, n = N(x * .02, y * .02), f = N(x * .35, y * .35);
    for (const t of [270, 232]) { if (Math.abs(dep - t) < 9) { if (Math.abs(dep - t - 5) < 1 || Math.abs(dep - t + 5) < 1) return [150, 140, 130]; return (x | 0) % 8 < 2 ? TI : RL; } }
    const slab = ((x / 48) | 0) + ((y / 48) | 0); const seam = (x % 48 < 1) || (y % 48 < 1);
    if (dep < 200 && dep > 40) return seam ? C2 : mix3(C1, C2, (slab & 1) * .2 + f * .3 + n * .2);
    return mix3(D1, C2, n * .6 + f * .3); }; },
  kennel: (ox, oy) => { const M1 = hx('#3e3a30'), M2 = hx('#2a2822'), P = hx('#5a6a7a'); return (x, y) => {
    const n = N(x * .02, y * .02), f = N(x * .3, y * .3); if (N(x * .04 + 5, y * .04) > .7) return mix3(P, M2, f * .5);
    return mix3(M1, M2, n * .7 + f * .3); }; },
  airfield: (ox, oy) => { const A1 = hx('#5a5c5e'), A2 = hx('#4a4c50'), G1 = hx('#5a6a3a'), L = hx('#d8d0b0'), Y = hx('#d8b040'); return (x, y) => {
    const dep = oy - y, n = N(x * .02, y * .02), f = N(x * .4, y * .4);
    if (dep > 40 && dep < 360) { if (Math.abs(dep - 220) < 1.5 && (x % 40) < 22) return L; if (Math.abs(dep - 120) < 1 ) return Y; return mix3(A1, A2, f * .4 + n * .3); }
    return mix3(G1, [70, 80, 50], n * .6 + f * .2); }; },
  airB: () => { const A1 = hx('#4a4c50'), L = hx('#e0d8c0'), J1 = hx('#2e5a2a'), J2 = hx('#1e3e1e'), S1 = hx('#2a5a7a'), S2 = hx('#3a7a9a'), SA = hx('#c8b080'); return (x, y) => {
    const n = N(x * .006, y * .006), f = N(x * .05, y * .05), coast = 1300 + (N(x * .002, 7) - .5) * 600;
    if (y < coast) { const w = Math.sin(x * .08 + y * .03) > .9 ? .3 : 0; return mix3(S1, S2, n * .6 + w); }
    if (y < coast + 50) return SA;
    if (Math.abs(x - 1024) < 36 && y > 4400) { if (Math.abs(x - 1024) < 1.5 && (y % 60) < 30) return L; if (Math.abs(Math.abs(x - 1024) - 32) < 1) return L; return A1; }
    if (y > 4300 && Math.abs(x - 1024) < 300) return mix3([90, 100, 60], [70, 80, 50], f);
    const river = Math.abs(x - 1400 - Math.sin(y * .004) * 200) < 14; if (river) return S1;
    return mix3(J1, J2, n * .7 + f * .4); }; },
  coast: () => (x, y) => { const n = N(x * .01, y * .01); return y < 600 + Math.sin(x * .01) * 80 ? [20, 40, 70] : y < 640 + Math.sin(x * .01) * 80 ? [90, 80, 60] : [20 + n * 20, 40 + n * 30, 26]; }
};

// ---------------------------------------------------------------------------------------------- house facades (Op 3, Op 5, Op 6 doors)
// a facade: { x (center), dep (depth), w, h, color, roof, wins: [[cx, z0, w, h, kind]] }; openings give window clips
WP.facade = (x, dep, o = {}) => Object.assign({ x, dep, w: 110, h: 60, color: '#e8e0cc', roof: '#b0583a', wins: [[-32, 34, 18, 16, 'win'], [32, 34, 18, 16, 'win'], [0, 0, 22, 30, 'door']] }, o);
// a spawn in a facade's opening: the enemy stands just behind it, clipped to it
WP.inWin = (st, i, w, extra = {}) => {
  const f = st.facades[i], o = f.wins[Math.min(w, f.wins.length - 1)], x = st.ox + f.x + o[0], y = st.oy - f.dep - 7;
  return Object.assign({ x, y, z: o[1] === 0 ? 0 : o[1] - 22, path: 'window', window: [x - o[2] / 2, x + o[2] / 2, o[1], o[1] + o[3]], stay: true }, extra);
};

// ---------------------------------------------------------------------------------------------- OP 1: RADIO HILL
const op1 = { id: 'op1', n: 1, name: 'RADIO HILL', music: 'op1', time: 'dawn', ox: 700, oy: 1800, len: 2700, floor: 'hill', speed: 16,
  sky: { sky: ['#1d1a3a', '#7a3f6e', '#e88a6a', '#f6c48c'], sun: { x: .72, y: .66, r: 18, color: '#ffd6a0' }, layers: [{ kind: 'mountains', color: '#6a4a6e', y: .6, height: .14, parallax: .08 }, { kind: 'hills', color: '#7a5a6a', y: .66, height: .06, parallax: .14 }, { kind: 'clouds', color: '#f0b0a0', y: .25, parallax: .05 }] },
  fog: { color: '#e0a07c', near: 380, far: 1700 }, grade: ['#ffe6d6', .05],
  rail: [{ d: 0, x: 700, y: 1800, angle: -Math.PI / 2, h: 28, pitch: 6, fov: 60 }, { d: 2700, x: 3400, y: 1800 }],
  holds: [{ d: 520, until: 'beat:b6', max: 15 }, { d: 1720, until: 'air', max: 30 }, { d: 2700, until: 'boss' }],
  quotas: { soldier: 36, vehicle: 3, air: 1 }, objective: { kind: 'MASTS', ids: ['m1', 'm2', 'm3'] }, boss: 'bigEar', perk: 'commsDown', clearHeal: 10, animals: ['goat'],
  props: [['sandbags', 'sbA', 200, -110, { len: 50 }], ['rockCover', 'rk1', 720, -66], ['crate', 'c1', 400, -120, { drop: 'mag' }], ['crate', 'c2', 445, -124, { drop: 'grenade' }], ['ammoCrate', 'c3', 490, -118, { drop: 'ration' }],
    ['mast', 'm1', 900, -380], ['mast', 'm2', 1500, -420], ['mast', 'm3', 2150, -360], ['sandbags', 'sbM', 1407, -605, { len: 60 }], ['barrel', 'rb1', 1470, -205], ['barrel', 'rb2', 1490, -212], ['barrel', 'rb3', 1585, -200],
    ['sandbags', 'sbB', 1935, -170, { len: 54 }], ['crate', 'c4', 2290, -140, { drop: 'fury' }], ['rockCover', 'rk2', 2390, -70], ['rockCover', 'rk3', 2560, -72], ['wreckJeep', 'wj', 1000, -150], ['sandbags', 'sbC', 2700, -150, { len: 60 }], ['ammoCrate', 'c5', 1080, -130], ['crate', 'c6', 1700, -140], ['crate', 'c7', 2600, -130]],
  scenery: [].concat(S.row('palm', -100, 3600, 900, 70, 40, { s: 1.3 }), S.row('palm', -100, 3600, 1300, 90, 50, { s: 1.4 }), S.row('rock', -100, 3600, 520, 110, 60, { s: 1.6 }), S.row('bush', -100, 3600, 300, 55, 40, { s: 1.4 }), S.row('grass', -100, 3600, 140, 30, 20), S.row('grass', -100, 3600, 46, 22, 14, { s: 1.3 }), S.row('rock', -100, 3600, 58, 160, 40, { s: 1.2 }), S.row('bush', -60, 3600, 40, 120, 30, { s: 1.1 }),
    S.row('tent', 300, 700, 260, 130, 20, { f: Math.PI / 2, s: 1.2 }), S.row('wireFence', -60, 3600, 190, 64, 0, { f: Math.PI / 2 }), S.row('sandbags', 100, 3500, 125, 340, 40, { f: Math.PI / 2 }),
    [S.draw('mastBase', 900, 380), S.draw('mastBase', 1500, 420), S.draw('mastBase', 2150, 360), S.shape('radarHut', 2550, 430, { s: 1.4 }), S.draw('dish', 2550, 430, { z: 42 }), S.row('rock', -100, 3600, 1000, 160, 80, { s: 3 })].flat()).flat(),
  beats: [
    { at: 0, tip: 'tip.aim' },
    { at: 40, spawn: [['rifleman', { side: 'R', dz: 200, n: 3, gap: .8, path: 'cross', stops: 1 }]] },
    { at: 160, spawn: [['rifleman', { n: 2, path: 'popup', covers: ['sbA'], dzs: [110], lxs: [0], dx: -12, cycles: 3 }], ['goat', { side: 'L', dz: 130, carry: 'mag', exact: true }]], tip: 'tip.items' },
    { at: 300, spawn: [['grenadier', { lx: 70, dz: 160, path: 'popup' }], ['rifleman', { side: 'L', dz: 240, n: 2, gap: .7, path: 'cross', stops: 1 }]] },
    { at: 420, tip: 'tip.reload' },
    { at: 520, spawn: [['jeep', { side: 'R', dz: 250, path: 'vcross', stop: true }]], tip: 'tip.grenade' },
    { at: 680, spawn: [['knife', { path: 'popup', cover: 'rk1', dz: 66, dx: 8 }], ['rifleman', { n: 2, side: 'R', dz: 300, path: 'sprint', gap: .5 }]] },
    { at: 820, spawn: [['sniper', { x: 1600, y: 1800 - 386, z: 88, path: 'snipe' }], ['rifleman', { n: 3, path: 'popup', lxs: [-120, -30, 70], dz: 250 }]], tip: 'tip.masts' },
    { at: 1000, spawn: [['truck', { side: 'R', dz: 300, stopAt: .2 }]] },
    { at: 1180, spawn: [['officer', { side: 'L', dz: 180 }], ['rifleman', { side: 'R', dz: 200, n: 2, gap: .8, path: 'cross', stops: 1 }]] },
    { at: 1350, spawn: [['mortar', { n: 2, x: 2095, y: 1800 - 615, path: 'mortar', exact: true }], ['mortar', { x: 2122, y: 1800 - 615, path: 'mortar', exact: true }]] },
    { at: 1500, spawn: [['rifleman', { n: 4, sides: ['L', 'R'], dzs: [150, 260, 200, 180], path: 'cross', stops: 1, gap: .6 }]] },
    { at: 1720, spawn: [['vulture', { anchor: 'cam', lx: 300, dz: 900, z: 72 }]] },
    { at: 1900, spawn: [['brute', { path: 'stand', cover: 'sbB', dz: 170 }], ['grenadier', { n: 2, path: 'popup', lxs: [-110, 120], dz: 200 }]], tip: 'tip.brute' },
    { at: 2080, spawn: [['para', { n: 4, lxs: [-140, -50, 40, 130], dz: 230, z: 165, gap: .5 }]] },
    { at: 2250, spawn: [['jeep', { side: 'L', dz: 220, path: 'vcross', stop: true }], ['rifleman', { n: 3, side: 'R', dz: 190, gap: .7, path: 'cross', stops: 1 }]] },
    { at: 2450, spawn: [['knife', { n: 2, path: 'popup', covers: ['rk2', 'rk3'], dz: 70 }], ['rifleman', { n: 3, sides: ['L', 'R'], dz: 230, gap: .8, path: 'cross', stops: 1 }]] },
    { at: 2600, spawn: [['rifleman', { n: 2, path: 'popup', cover: 'sbC', dz: 150, cycles: 3 }]] }
  ] };
// ---------------------------------------------------------------------------------------------- OP 2: MANGROVE RUN
const op2 = { id: 'op2', n: 2, name: 'MANGROVE RUN', music: 'op2', time: 'morning', ox: 1000, oy: 3700, len: 2600, floor: 'river', speed: 20, river: true, forward: true,
  sky: { sky: ['#5a7a6a', '#8aa88a', '#b8c8a8'], layers: [{ kind: 'forest', color: '#2a4a2a', y: .62, height: .2, parallax: .1 }, { kind: 'fog', color: '#a8c0a0', y: .6, parallax: .02 }] },
  fog: { color: '#9ab494', near: 200, far: 1150 }, grade: ['#d8f0d0', .06],
  water: function (x, y) { return Math.abs(x - this.ox) < 105; },
  rail: [{ d: 0, x: 1000, y: 3700, angle: -Math.PI / 2, h: 20, pitch: 4, fov: 60 }, { d: 2600, x: 1000, y: 1100 }],
  holds: [{ d: 1000, until: 'air', max: 30, slow: 8 }, { d: 2600, until: 'boss' }],
  quotas: { soldier: 28, boat: 6, air: 1 }, boss: 'crocodile', perk: 'camp', clearHeal: 10, animals: ['parrot', 'monkey'],
  props: [['crate', 'd1', 150, -1080, { drop: 'mag' }], ['ammoCrate', 'd2', 172, -1086], ['rope', 'ropeL', -112, -1500, { z: 40 }], ['rope', 'ropeR', 112, -1500, { z: 40 }], ['barrel', 'fb1', -80, -2560], ['barrel', 'fb2', -60, -2566], ['barrel', 'fb3', -96, -2552], ['sandbags', 'mb', -260, -2195, { len: 50 }], ['crate', 'd3', -150, -800, { drop: 'grenade' }], ['crate', 'd4', 160, -1960]],
  scenery: [].concat(S.row('mangrove', -380, -150, -3200, 60, 40, { s: 1.4, axis: 'y' }), S.row('mangrove', 150, 380, -3200, 60, 40, { s: 1.4 })).concat(
    (() => { const out = []; for (let y = 0; y < 3300; y += 70) { for (const side of [-1, 1]) { const i = y / 70; out.push(S.shape(H('m', i + side) > .35 ? 'mangrove' : 'palm', side * (150 + H('mx', i * side) * 120), y + H('my', i) * 40, { s: 1.3 + H('ms', i) * .4, f: H('f', i) * 6 })); if (H('fern', i + side) > .4) out.push(S.shape('fern', side * (122 + H('fx', i) * 20), y + 20, { s: 1.3 })); if (H('far', i + side) > .3) out.push(S.shape('palm', side * (320 + H('fx2', i) * 200), y + 30, { s: 1.6 })); } } return out; })(),
    [S.shape('stiltHut', -170, 1080, { s: 1.4, f: 0 }), S.shape('stiltHut', 175, 1060, { s: 1.4, f: Math.PI }), S.shape('dock', 150, 1070, { f: Math.PI }), S.shape('dock', 140, 760, { f: Math.PI }), S.shape('stiltHut', 200, 1700, { s: 1.4, f: Math.PI }),
     S.draw('bridge', 0, 1500, { z: 40 }), S.shape('skiffWreck', -80, 600, { f: .4 }), S.shape('skiffWreck', 70, 1830, { f: 2 }), S.draw('barge', 40, 2200), S.draw('waterfall', 0, 3150), S.draw('floatDock', -78, 2560)]).flat(),
  beats: [
    { at: 0 },
    { at: 60, spawn: [['rifleman', { n: 3, path: 'popup', lxs: [-135, 130, -150], dzs: [200, 230, 260] }]] },
    { at: 200, spawn: [['skiff', { lx: -40, dz: 440, path: 'boat', drift: -8 }]] },
    { at: 380, spawn: [['knife', { n: 2, path: 'drop', lxs: [-62, 64], dz: 75, z: 44, gap: .5 }]], tip: 'tip.knife' },
    { at: 520, spawn: [['monkey', { lx: 150, dz: 250, z: 34, carry: 'gbox', perch: true, exact: true }], ['rifleman', { n: 3, path: 'popup', lxs: [130, 150, 170], dz: 250 }]] },
    { at: 700, spawn: [['skiff', { side: 'R', dz: 300, path: 'boat', cross: -1, gap: 1.2, n: 2 }]] },
    { at: 860, spawn: [['grenadier', { n: 2, path: 'popup', lxs: [-170, 175], dz: 220, z: 16 }]] },
    { at: 1000, spawn: [['vulture', { anchor: 'cam', lx: 0, dz: 900, z: 64, drop: 3 }]] },
    { at: 1250, spawn: [['rifleman', { n: 5, path: 'stand', lxs: [-80, -40, 0, 40, 80], dz: 250, z: 40, bridge: true, exact: true }]], tip: 'tip.rope' },
    { at: 1500, spawn: [['gunboat', { lx: 30, dz: 380, path: 'boat' }], ['mortar', { n: 2, lxs: [-270, -250], dz: 700, path: 'mortar', exact: true }]] },
    { at: 1700, spawn: [['parrot', { side: 'L', dz: 200, z: 60, carry: 'fury', exact: true }], ['parrot', { side: 'L', dz: 230, z: 70, exact: true, carry: 'mag' }], ['rifleman', { n: 4, path: 'popup', lxs: [-140, -160, 140, 160], dzs: [220, 280] }]] },
    { at: 1900, spawn: [['skiff', { lx: 50, dz: 420, path: 'boat' }], ['brute', { lx: 40, dz: 300, z: 6, path: 'stand' }], ['rifleman', { n: 2, path: 'stand', lxs: [20, 60], dz: 306, z: 6 }]] },
    { at: 2100, spawn: [['rifleman', { n: 3, side: 'L', dz: 260, path: 'cross', stops: 1, gap: .7 }], ['sniper', { lx: 210, dz: 500, z: 54, path: 'snipe' }]] },
    { at: 2350, spawn: [['knife', { n: 2, path: 'drop', lxs: [-64, 64], dz: 78, z: 44 }], ['skiff', { lx: -30, dz: 460, path: 'boat' }]] },
    { at: 2500, spawn: [['rifleman', { n: 3, path: 'popup', lxs: [-140, 140, 160], dz: 260 }]] }
  ] };
// ---------------------------------------------------------------------------------------------- OP 3: PALM VILLAGE
const facades3 = []; for (let i = 0; i < 16; i++) { const x = 110 + i * 175; if (x > 2560) break; facades3.push(WP.facade(x, 232 + H('d', i) * 10, { color: ['#ece4d0', '#e8d8b8', '#f0e8e0', '#d8c8a8'][i % 4], roof: ['#b0583a', '#a04a30', '#8a5a3a'][i % 3], h: i % 3 === 1 ? 44 : 60, wins: i % 3 === 1 ? [[-28, 22, 16, 14, 'win'], [24, 0, 22, 30, 'door']] : [[-32, 34, 18, 16, 'win'], [32, 34, 18, 16, 'win'], [0, 0, 22, 30, 'door']] })); }
const op3 = { id: 'op3', n: 3, name: 'PALM VILLAGE', music: 'op3', time: 'noon', ox: 700, oy: 1800, len: 2600, floor: 'village', speed: 15, facades: facades3,
  sky: { sky: ['#3a7ad0', '#7ab4e8', '#c8e4f4'], sun: { x: .3, y: .1, r: 14, color: '#fffbe0' }, layers: [{ kind: 'sea', color: '#3aa0a8', y: .64 }, { kind: 'clouds', color: '#ffffff', y: .22, parallax: .04 }] },
  fog: { color: '#c8e0e8', near: 500, far: 1800 }, grade: ['#fff8e8', .02],
  rail: [{ d: 0, x: 700, y: 1800, angle: -Math.PI / 2, h: 26, pitch: 5, fov: 60 }, { d: 2600, x: 3300, y: 1800 }],
  holds: [{ d: 1600, until: 'beat:b12', max: 30 }, { d: 2600, until: 'boss' }],
  quotas: { soldier: 38, vehicle: 4 }, boss: 'warthog', perk: 'village', clearHeal: 40, animals: ['chicken', 'pig'],
  props: [['crate', 'v1', 380, -150], ['barrel', 'vb1', 900, -160], ['crate', 'v2', 1330, -150, { drop: 'medkit' }], ['ammoCrate', 'v3', 1820, -140], ['crate', 'v4', 2280, -130, { drop: 'dynamite' }], ['sandbags', 'vs1', 1060, -120, { len: 50 }], ['crate', 'v5', 2500, -150], ['barrel', 'vb2', 2780, -190], ['sandbags', 'vs2', 2860, -150, { len: 60 }]],
  scenery: [].concat(facades3.map(f => S.draw('facade', f.x, f.dep, { f })), S.row('palm', -100, 3500, 330, 95, 50, { s: 1.4 }), S.row('palm', -100, 3500, 700, 120, 60, { s: 1.6 }),
    S.row('marketStall', 760, 980, 175, 75, 6, { f: Math.PI / 2, s: 1.3 }), [S.shape('well', 1450, 170, { s: 1.4 }), S.shape('cart', 620, 160, { f: 0, s: 1.3 }), S.shape('cart', 2100, 165, { f: 3, s: 1.3 }), S.draw('chapel', 1800, 450), S.draw('fountain', 2800, 200), S.shape('barrel', 1460, 190, { s: 1.3 }), S.shape('barrel', 1475, 196, { s: 1.3 })],
    S.row('fishBoat', -100, 3500, 1100, 260, 120, { f: 0, s: 1.5 }), S.row('bush', -100, 3500, 300, 80, 40, { s: 1.2 })).flat(),
  beats: [
    { at: 0 },
    { at: 50, spawn: [['villager', { side: 'L', dz: 140, exact: true }], ['villager2', { side: 'R', dz: 150, exact: true, delay: .6 }], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 0, 0)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 0, 1, { delay: .6 })], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 1, 0, { delay: 1.2 })]], tip: 'tip.civ' },
    { at: 200, spawn: [['chicken', { side: 'L', dz: 120, carry: 'mag', exact: true }], ['chicken', { side: 'L', dz: 128, carry: 'ration', exact: true, delay: .4 }], ['chicken', { side: 'L', dz: 135, exact: true, delay: .8 }], ['rifleman', { n: 2, side: 'R', dz: 190, path: 'cross', stops: 1, gap: .8 }]] },
    { at: 350, spawn: [['jeep', { side: 'R', dz: 230, path: 'vcross', stop: true }], ['villager', { side: 'L', dz: 120, exact: true, delay: 1 }]] },
    { at: 500, spawn: [['grenadier', { n: 2, path: 'popup', lxs: [-90, 110], dz: 236, z: 60 }], ['medic', { side: 'R', dz: 110, exact: true }], ['medic', { side: 'R', dz: 112, exact: true, delay: .5 }]] },
    { at: 680, spawn: [['officer', { side: 'L', dz: 190 }], ['rifleman', { n: 4, path: 'popup', lxs: [-40, 10, 60, 110], dz: 185 }]] },
    { at: 850, spawn: [['pig', { side: 'R', dz: 130, carry: 'gbox', exact: true }], ['knife', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 5, 2, { cycles: 2 })], ['knife', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 6, 1)]] },
    { at: 1000, spawn: [['truck', { side: 'L', dz: 200, stopAt: -.2 }], ['villager', { n: 3, side: 'R', dz: 140, gap: .5, exact: true }]] },
    { at: 1200, spawn: [['brute', { lx: 20, dz: 160, path: 'stand' }], ['reporter', { side: 'L', dz: 120, exact: true }]] },
    { at: 1400, spawn: [['rifleman', { n: 5, sides: ['L', 'R'], dzs: [140, 200, 170, 230, 160], path: 'cross', stops: 1, gap: .6 }], ['villager2', { side: 'L', dz: 150, exact: true, delay: .5 }], ['villager', { side: 'R', dz: 180, exact: true, delay: 1.5 }]] },
    { at: 1600, spawn: [['apc', { side: 'R', dz: 300 }]] },
    { at: 1800, spawn: [['sniper', { n: 2, lxs: [-8, 8], dz: 452, z: 60, path: 'snipe', exact: true }], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 10, 0)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 10, 1)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 11, 0)]] },
    { at: 2000, spawn: [['jeep', { side: 'L', dz: 210, path: 'vcross', stop: true }], ['para', { n: 3, lxs: [-100, 0, 100], dz: 220, z: 160, gap: .5 }]] },
    { at: 2200, spawn: [['rifleman', { n: 6, path: 'popup', lxs: [-150, -90, -30, 40, 100, 160], dzs: [200, 240], cycles: 3 }], ['villager', { side: 'L', dz: 320, exact: true }]], tip: 'tip.dynamite' },
    { at: 2400, spawn: [['knife', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 13, 2)], ['knife', WP.inWin({ ox: 700, oy: 1800, facades: facades3 }, 14, 2)], ['grenadier', { n: 2, path: 'popup', lxs: [-120, 130], dz: 210 }], ['villager2', { n: 2, side: 'R', dz: 140, exact: true, gap: .6 }]] }
  ] };
// ---------------------------------------------------------------------------------------------- OP 4: POWDER KEG DEPOT
const facades4 = [WP.facade(2400, 300, { w: 170, h: 70, color: '#6a6a72', roof: '#4a4a52', wins: [[-50, 0, 30, 40, 'door'], [0, 0, 30, 40, 'door'], [50, 0, 30, 40, 'door']] })];
const op4 = { id: 'op4', n: 4, name: 'POWDER KEG DEPOT', music: 'op4', time: 'dusk', ox: 700, oy: 1800, len: 2700, floor: 'depot', speed: 16, facades: facades4,
  sky: { sky: ['#2a1a4a', '#7a3a6a', '#e07a4a', '#f0b060'], sun: { x: .2, y: .7, r: 22, color: '#ffb070' }, layers: [{ kind: 'city', color: '#2a2030', y: .6, height: .1, parallax: .06 }, { kind: 'clouds', color: '#c06a6a', y: .3, parallax: .05 }] },
  fog: { color: '#a0606a', near: 300, far: 1500 }, grade: ['#ffd8c8', .08], embers: true,
  rail: [{ d: 0, x: 700, y: 1800, angle: -Math.PI / 2, h: 27, pitch: 6, fov: 60 }, { d: 2700, x: 3400, y: 1800 }],
  holds: [{ d: 950, until: 'air', max: 25 }, { d: 2000, until: 'air', max: 25 }, { d: 2700, until: 'boss' }],
  quotas: { soldier: 37, vehicle: 3, air: 2 }, boss: 'ironHog', perk: 'supplies', clearHeal: 10, animals: [],
  props: [['fuelTank', 'ftA', 160, -205], ['ammoCrate', 'a1', 250, -200], ['ammoCrate', 'a2', 275, -206], ['ammoCrate', 'a3', 300, -200], ['sandbags', 'sd1', 820, -150, { len: 60 }], ['crate', 'a4', 600, -130], ['barrel', 'db1', 1320, -170], ['barrel', 'db2', 1338, -176],
    ['fuelTank', 'ftB', 1760, -230], ['fuelTank', 'ftC', 1830, -236], ['fuelTank', 'ftD', 1900, -230], ['ammoCrate', 'a5', 1500, -140], ['crate', 'a6', 2150, -130, { drop: 'dynamite' }], ['ammoCrate', 'a7', 2050, -200], ['ammoCrate', 'a8', 2075, -206],
    ['wagon', 'w1', 2500, -232], ['wagon', 'w2', 2620, -232], ['wagon', 'w3', 2740, -232], ['barrel', 'db3', 2300, -160], ['crate', 'a9', 1050, -140, { drop: 'mag' }]],
  scenery: [].concat(facades4.map(f => S.draw('facade', f.x, f.dep, { f, metal: true })), S.row('shed', -100, 3500, 420, 220, 40, { f: Math.PI / 2, s: 1.4 }), S.row('crateStack', -100, 3500, 300, 150, 60, { s: 1.3 }), S.row('floodlight', 0, 3500, 180, 300, 10, { s: 1.4 }),
    [S.draw('waterTower', 1600, 400), S.shape('crane', 900, 520, { s: 2 }), S.shape('crane', 2300, 560, { s: 2 }), S.row('flatcar', 0, 3500, 270, 160, 30, { f: 0 })].flat(), S.row('wireFence', -60, 3500, 110, 64, 0, { f: Math.PI / 2 })).flat(),
  beats: [
    { at: 0 },
    { at: 60, spawn: [['rifleman', { n: 4, side: 'R', dz: 220, path: 'cross', stops: 1, gap: .5 }]] },
    { at: 220, spawn: [['rpg', { n: 2, path: 'kneel', lxs: [-10, 40], dz: 205, z: 14 }]] },
    { at: 400, spawn: [['jeep', { side: 'L', dz: 240, path: 'vcross', stop: true }], ['mortar', { n: 2, lxs: [-30, -10], dz: 650, path: 'mortar', exact: true }]] },
    { at: 560, spawn: [['cargoPlane', { dz: 420, z: 190, drop: 5, crate: true }]], radio: 'air' },
    { at: 760, spawn: [['brute', { path: 'stand', cover: 'sd1', dz: 150 }], ['rifleman', { n: 3, path: 'popup', cover: 'sd1', dz: 150, lxs: [0], dx: -20 }]] },
    { at: 950, spawn: [['vulture', { anchor: 'cam', lx: -300, dz: 900, z: 80 }]] },
    { at: 1150, spawn: [['forklift', { side: 'L', dz: 160, carry: 'gbox', exact: true }], ['rifleman', { n: 3, side: 'R', dz: 200, path: 'cross', stops: 1, gap: .6 }]] },
    { at: 1350, spawn: [['apc', { side: 'R', dz: 300 }]], radio: 'armor' },
    { at: 1600, spawn: [['sniper', { x: 2300, y: 1800 - 404, z: 70, path: 'snipe' }], ['rifleman', { n: 4, sides: ['L', 'R'], dz: 190, path: 'cross', stops: 1, gap: .6 }]] },
    { at: 1800, spawn: [['rifleman', { n: 6, path: 'popup', lxs: [-80, -40, 0, 40, 80, 120], dz: 220, cycles: 3 }]] },
    { at: 2000, spawn: [['vulture', { anchor: 'cam', lx: 300, dz: 900, z: 80 }], ['rpg', { n: 2, path: 'kneel', lxs: [-100, -60], dz: 210 }]] },
    { at: 2200, spawn: [['knife', { n: 2, path: 'popup', lxs: [-50, 60], dz: 72 }], ['officer', { side: 'R', dz: 180 }]] },
    { at: 2400, spawn: [['jeep', { side: 'R', dz: 200, path: 'vcross', stop: true }], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades4 }, 0, 0)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades4 }, 0, 1)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades4 }, 0, 2)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades4 }, 0, 0, { delay: 4 })]] }
  ] };
// ---------------------------------------------------------------------------------------------- OP 5: THE KENNEL
const towers5 = [400, 1000, 1950, 2650];
const op5 = { id: 'op5', n: 5, name: 'THE KENNEL', music: 'op5', time: 'night', wind: .4, ox: 700, oy: 1800, len: 2500, floor: 'kennel', speed: 14, dark: .78, rain: true, hostages: true,
  sky: { sky: ['#05070f', '#0e1424', '#1a2236'], moon: { x: .8, y: .18, r: 10 }, stars: 60, layers: [{ kind: 'mountains', color: '#0a0e18', y: .6, height: .12, parallax: .06 }] },
  fog: { color: '#141a26', near: 260, far: 1200 }, grade: ['#a8b8e0', .1],
  rail: [{ d: 0, x: 700, y: 1800, angle: -Math.PI / 2, h: 26, pitch: 6, fov: 60 }, { d: 1500, x: 2200, y: 1800, angle: -Math.PI / 2 }, { d: 1700, x: 2400, y: 1800, angle: -Math.PI / 2 + .26 }, { d: 2500, x: 3200, y: 1800, angle: -Math.PI / 2 + .26 }],
  holds: [{ d: 1450, until: 'escort', max: 70 }, { d: 2500, until: 'boss' }],
  quotas: { soldier: 35, vehicle: 3 }, boss: 'tusk', perk: 'hostages', clearHeal: 10, animals: [],
  props: [['ammoCrate', 'k1', 280, -120, { drop: 'flare' }], ['searchlight', 'sl1', 400, -400, { z: 76 }], ['searchlight', 'sl2', 1000, -400, { z: 76, phase: 2 }], ['searchlight', 'sl3', 1950, -400, { z: 76, phase: 4 }], ['crate', 'k2', 700, -130], ['barrel', 'kb1', 1150, -160], ['ammoCrate', 'k3', 1600, -130], ['crate', 'k4', 2200, -130, { drop: 'medkit' }], ['sandbags', 'ks1', 880, -150, { len: 50 }]],
  scenery: [].concat(S.row('wireFence', -100, 3400, 80, 64, 0, { f: Math.PI / 2 }), S.row('wireFence', -100, 3400, 100, 64, 0, { f: Math.PI / 2 }), towers5.map(x => S.shape('watchtower', x, 400, { s: 1.6 })), S.row('barracks', 100, 3300, 300, 260, 30, { f: 0, s: 1.5 }),
    S.row('fireDrum', 50, 3300, 170, 230, 40), [S.draw('cageBlock', 1640, 230), S.draw('flagpole', 1300, 360), S.draw('cliff', 1500, 1000)].flat(), S.row('floodlight', 0, 3300, 260, 420, 20, { s: 1.4 })).flat(),
  searchlights: ['sl1', 'sl2', 'sl3'],
  beats: [
    { at: 0 },
    { at: 60, spawn: [['rifleman', { n: 3, side: 'R', dz: 160, path: 'cross', stops: 1, gap: .9, speed: 40 }]], tip: 'tip.searchlight' },
    { at: 250, spawn: [['rifleman', { n: 3, sides: ['L', 'R'], dz: 200, path: 'cross', stops: 1, gap: .7 }]], tip: 'tip.flare' },
    { at: 420, spawn: [['jeep', { side: 'L', dz: 220, path: 'vcross', stop: true }]] },
    { at: 600, spawn: [['sniper', { x: 1100, y: 1800 - 404, z: 70, path: 'snipe' }], ['grenadier', { n: 2, path: 'popup', lxs: [-60, 90], dz: 200 }]] },
    { at: 800, spawn: [['rifleman', { n: 4, side: 'R', dz: 200, path: 'cross', stops: 1, gap: .6 }], ['knife', { n: 2, path: 'popup', lxs: [-40, 50], dz: 70 }]] },
    { at: 1000, spawn: [['brute', { path: 'stand', cover: 'ks1', dz: 150 }]] },
    { at: 1200, spawn: [['truck', { side: 'R', dz: 260, stopAt: .1 }]] },
    { at: 1450, fn: (sim, b) => WP.breakout(sim, b), radio: 'breakout' },
    { at: 1750, spawn: [['rifleman', { n: 4, path: 'popup', lxs: [-120, -40, 40, 120], dz: 290, cycles: 2 }]] },
    { at: 1950, spawn: [['towerGun', { x: 2650, y: 1800 - 404, z: 70 }], ['jeep', { side: 'R', dz: 200, path: 'vcross', stop: true }]] },
    { at: 2200, spawn: [['rifleman', { n: 5, sides: ['L', 'R'], dz: 180, path: 'cross', stops: 1, gap: .6 }], ['grenadier', { n: 2, path: 'popup', lxs: [-100, 100], dz: 210 }]] }
  ],
  update: (sim, dt) => {
    for (const id of sim.stage.searchlights) {
      const s = sim.prop(id); if (!s || s.dead) continue; s.sweep += dt * .6;
      const [lx, dz] = sim.w2c(s.x, s.y), bx = lx + Math.sin(s.sweep) * 220, bd = dz * (.55 + .45 * Math.cos(s.sweep * .7));
      s.beam = sim.c2w(bx, bd); s.beamD = bd;
      if (bd < 40 && Math.abs(bx) < 40 && sim.spotted <= 0 && !sim.attract) { sim.spotted = 3; sim.ev('spotted', {}); }
    }
  } };
WP.breakout = (sim, b) => {
  const n = sim.host.n; sim.host.pendingOut = n;
  if (!n) return;
  const order = [0, 1, 2, 3, 4].slice(0, n);
  order.forEach((i, k) => sim.later.push({ t: .5 + k * 8, fn: () => {
    sim.host.pendingOut--;
    const h = sim.spawn('hostage' + i, { lx: 180, dz: 150 + (k % 3) * 12, goal: [-210, 150 + (k % 3) * 10], beat: b.id });
    for (let c = 0; c < 2; c++) sim.later.push({ t: 1 + c * 1.2, fn: () => { const e = sim.spawn('chaser', { side: c ? 'R' : 'L', dz: 170 + c * 30, target: h.id, beat: b.id }); b.ids.push(e.id); } });
    sim.ev('cell', { idx: i });
  } }));
  b.pending += 0;
};
// ---------------------------------------------------------------------------------------------- OP 6: LAST FLIGHT OUT
const facades6 = [200, 900, 1600].map(x => WP.facade(x, 320, { w: 190, h: 80, color: '#6a7068', roof: '#4a5048', hangar: true, wins: [[-45, 0, 50, 50, 'door'], [45, 0, 50, 50, 'door']] }));
const op6 = { id: 'op6', n: 6, name: 'LAST FLIGHT OUT', music: 'op6', time: 'storm', wind: 1, ox: 700, oy: 1800, len: 2000, floor: 'airfield', speed: 18, hostages: true, facades: facades6, rain: true,
  sky: { sky: ['#2a2a3a', '#5a5060', '#a07a6a', '#d8a080'], sun: { x: .5, y: .78, r: 20, color: '#ffc890' }, layers: [{ kind: 'clouds', color: '#4a4454', y: .2, parallax: .06 }, { kind: 'clouds', color: '#6a5a64', y: .38, parallax: .09 }, { kind: 'hills', color: '#3a3a3a', y: .64, height: .05, parallax: .1 }] },
  fog: { color: '#7a6a6a', near: 300, far: 1500 }, grade: ['#e8d8d8', .06],
  rail: [{ d: 0, x: 700, y: 1800, angle: -Math.PI / 2, h: 27, pitch: 6, fov: 60 }, { d: 2000, x: 2700, y: 1800 }],
  holds: [{ d: 450, until: 'air', max: 25 }, { d: 850, until: 'beat:b6', max: 40 }, { d: 1500, until: 'escort', max: 60 }, { d: 2000, until: 'quota', max: 90 }],
  quotas: { soldier: 27, vehicle: 4, air: 2 }, boss: 'hyenaOne', perk: null, clearHeal: 0, animals: [],
  props: [['fuelTruck', 'ft1', 1330, -260, { facing: 0 }], ['fuelTruck', 'ft2', 1450, -250, { facing: Math.PI }], ['crate', 'f1', 500, -150, { drop: 'mag' }], ['ammoCrate', 'f2', 1100, -150], ['barrel', 'fb1', 760, -200], ['barrel', 'fb2', 776, -206], ['ammoCrate', 'f3', 1800, -150, { drop: 'medkit' }], ['crate', 'f4', 2100, -140, { drop: 'fury' }], ['sandbags', 'fs1', 1950, -130, { len: 60 }]],
  scenery: [].concat(facades6.map(f => S.draw('facade', f.x, f.dep, { f, hangar: true })), [S.draw('controlTower', 1200, 500), S.shape('propPlane', 600, 260, { f: .6, s: 1.3 }), S.shape('propPlane', 1300, 380, { f: 2.4, s: 1.3 }), S.draw('oldHowler', 2050, 180), S.draw('windsock', 1000, 210), S.draw('radar', 300, 600)],
    S.row('runwayLight', -100, 3000, 110, 60, 0), S.row('runwayLight', -100, 3000, 330, 60, 0), S.row('palm', -100, 3000, 800, 110, 60, { s: 1.6 })).flat(),
  beats: [
    { at: 0 },
    { at: 60, spawn: [['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades6 }, 0, 0)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades6 }, 0, 1)], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades6 }, 0, 0, { delay: 3 })], ['rifleman', WP.inWin({ ox: 700, oy: 1800, facades: facades6 }, 0, 1, { delay: 3 })]] },
    { at: 250, spawn: [['jeep', { side: 'L', dz: 200, path: 'vcross' }], ['jeep', { side: 'R', dz: 260, path: 'vcross', delay: 1.5 }]] },
    { at: 450, spawn: [['vulture', { anchor: 'cam', lx: 300, dz: 900, z: 80 }]] },
    { at: 650, spawn: [['rpg', { n: 2, path: 'kneel', lxs: [-30, 90], dz: 255, z: 26 }]] },
    { at: 850, spawn: [['tank', { x: 1600, y: 1800 - 300, dir: -1 }]], radio: 'armor' },
    { at: 1100, spawn: [['para', { n: 5, lxs: [-160, -80, 0, 80, 160], dz: 240, z: 165, gap: .4 }], ['sniper', { n: 2, x: 1890, y: 1800 - 504, z: 80, path: 'snipe', exact: true }]] },
    { at: 1300, spawn: [['apc', { side: 'L', dz: 280 }]] },
    { at: 1500, fn: (sim, b) => WP.boarding(sim, b) },
    { at: 1900, spawn: [['rifleman', { n: 4, sides: ['L', 'R'], dz: 200, path: 'cross', stops: 1, gap: .5 }], ['knife', { n: 2, path: 'popup', lxs: [-50, 70], dz: 72 }]] }
  ],
  partB: {
    floor: 'airB', bossAt: 30,
    sky: { sky: ['#3a3a4a', '#7a6070', '#d09080', '#f0c090'], sun: { x: .5, y: .8, r: 26, color: '#ffd0a0' }, layers: [{ kind: 'clouds', color: '#5a5060', y: .25, parallax: .06 }, { kind: 'clouds', color: '#8a7078', y: .45, parallax: .1 }] },
    fog: { color: '#b08a80', near: 600, far: 2600 },
    cam: (t, sim) => { const v = t < 20 ? 30 + 3 * t : 90, s = t < 20 ? 30 * t + 1.5 * t * t : 1200 + 90 * (t - 20); const up = E.clamp((t - 20) / 15, 0, 1), e = up * up * (3 - 2 * up);
      return { x: 1024, y: 5900 - s + 40, angle: Math.PI / 2, h: 28 + 232 * e + (t > 20 ? Math.sin(t * 1.3) * 3 : 0), pitch: 6 + 22 * e, fov: 60 }; },
    beats: [
      { t: 0, radio: 'op6.board', spawn: [['jeep', { lx: -60, dz: 90, path: 'chaseJeep', exact: true }], ['jeep', { lx: 40, dz: 130, path: 'chaseJeep', exact: true }], ['jeep', { lx: 100, dz: 160, path: 'chaseJeep', exact: true }]] },
      { t: 10, radio: 'op6.sam', fn: sim => { const w = WP.camToWorld(sim.cam, 0, 520); const e = sim.spawn('samTruck', { x: w[0], y: w[1], path: 'sam' }); e.facing = 0; } },
      { t: 20, radio: 'op6.lift' }
    ]
  } };
TY.jeep2 = TY.jeep;
WP.boarding = (sim, b) => {
  const n = sim.host.n; sim.host.pendingOut = n;
  const order = [0, 1, 2, 3, 4].slice(0, n);
  sim.spawn('truck', { side: 'L', dz: 170, stopAt: -.5, unload: 0, beat: b.id }).friendly = true;
  order.forEach((i, k) => sim.later.push({ t: 2.5 + k * 3.5, fn: () => {
    sim.host.pendingOut--;
    const h = sim.spawn('hostage' + i, { lx: -170, dz: 150 + (k % 3) * 15, goal: [sim.hw(180) + 30, 170], beat: b.id });
    for (let c = 0; c < 2; c++) sim.later.push({ t: .8 + c * 1.1, fn: () => { const e = sim.spawn('chaser', { side: c ? 'R' : 'L', dz: 160 + c * 40, target: h.id, beat: b.id }); b.ids.push(e.id); } });
  } }));
  const rest = Math.max(0, 10 - n * 2);
  for (let i = 0; i < rest; i++) sim.later.push({ t: 1 + i * 2.2, fn: () => { const f = WP.inWin(sim.stage, 2, i % 2); const e = sim.spawn('rifleman', Object.assign(f, { beat: b.id })); b.ids.push(e.id); } });
  sim.later.push({ t: 4, fn: () => { const e = sim.spawn('vulture', { anchor: 'cam', lx: -300, dz: 900, z: 80, beat: b.id }); b.ids.push(e.id); } });
  if (!n) sim.host.list.length = 0;
};
WP.STAGES.push(op1, op2, op3, op4, op5, op6);
// the playlist of the attract mode: [op, d or part, seconds]
WP.ATTRACT = [[1, 1720, 25], [2, 2600, 25], [3, 2200, 20], [4, 1800, 20], [5, 1450, 25], [6, 'B', 30]];
})();
