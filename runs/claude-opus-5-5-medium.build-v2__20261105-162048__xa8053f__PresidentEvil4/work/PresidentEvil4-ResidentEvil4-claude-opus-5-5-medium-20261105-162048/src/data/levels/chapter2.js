// Chapter 2: CLAIM 2: WEAR AND TEAR. Rain at night.
import { addWinch, beltFight, bosunBoss, coldRoomSetup } from '../../game/setpieces.js';
const c = (a, col, row, y = 1.5) => [a.level.wx(col), y, a.level.wz(row)];
export const ROAD = {
  map: 'road', exitDoors: ['10,0'], title: 'THE SALT ROAD', mood: 'rain', music: 'explore', loops: ['rain'], chapter: 2, chapterCard: 2, hint: 'barrel', startYaw: Math.PI, fathomYaw: 1.57, waterY: -3, wallH: 8, treasure: ['amber'],
  barrels: [[7, 46], [14, 46], [8, 50], [13, 53]], groundItems: [['samphire', 16, 50, 1], ['ammo_pistol', 5, 45, 12]], notes: [{ id: 'actuary', col: 3, row: 37, y: 0.05 }],
  decor: [['cart', 6.5, 47.5, 0], ['cart', 14, 47.5, 3.14], ['campfire', 11, 49], ['dead-tree', 5, 44], ['dead-tree', 16, 53], ['rowboat', 5, 15, 0.8], ['dead-tree', 6, 12], ['dead-tree', 15, 18], ['boulders', 5, 40], ['boulders', 16, 20], ['rock', 9, 57], ['rock', 13, 36], ['tombstone', 5, 11], ['fence', 10.5, 25, 0], ['fence', 10.5, 34, 0], ['haystack', 16, 45], ['sack', 7, 52], ['barrel', 15, 52], ['tall-grass', 12, 58], ['tall-grass', 9, 40], ['reeds', 3, 39], ['tall-grass', 16, 15]],
  lamps: [['brazier', 9, 45, { intensity: 12, radius: 12, color: 0xff8030 }], ['brazier', 13, 22, { intensity: 12, radius: 12, color: 0xff8030 }], ['lamp-post', 8, 56], ['lamp-post', 13, 35], ['lamp-post', 8, 24], ['brazier', 5, 19, { intensity: 10, radius: 10, color: 0xff8030 }], ['lamp-post', 13, 3]],
  dress: { wall: ['boulders', 'rock', 'tall-grass', 'dead-tree'], open: ['tall-grass', 'puddle', 'reeds'] }, backdrops: [['backdrop-cliff', -40, -3, -40], ['backdrop-cliff', 44, -3, 0, 2], ['backdrop-cliff', -40, -3, 40, 1], ['abbey-far', 0, -2, -90]],
  setup(a) { const L = a.level; a.def.bridgeOK = true; },
  jumps: { bridge: (a) => { a.player.teleport(a.level.wx(10.5), a.level.wz(36), 0, Math.PI); a.enterStage('bridge', true); } }, first: 'main',
  stages: { get bridge() { return BRIDGE_STEPS; }, main: [
    { objective: 'FOLLOW THE SALT ROAD NORTH TO THE CANNERY.', music: 'explore' }, { until: (a) => a.player.pos.z < a.level.wz(58) },
    { spawn: [['gaffer', 8, 49], ['gaffer', 13, 49], ['gaffer', 10, 46], ['gaffer', 11, 52], ['gaffer', 6, 52], ['gaffer', 15, 50], ['bottler', 6, 46, { }]] }, { music: 'combat' }, { say: ['COMMODORE', 'THE ROAD IS CLOSED. IT HAS ALWAYS BEEN CLOSED. HOW DID YOU GET ON IT?'] },
    { until: (a) => a.player.pos.z < a.level.wz(44) }, { music: 'explore' },
    { run: (a) => { a.addScript([{ zone: [1, 36, 5, 40] }, { spawn: [['gaffer', 7, 37], ['gaffer', 7, 40], ['netwife', 4, 42]] }, { say: ['MAX', 'Ambush cover. Extra premium.'] }]); } }, { stage: 'bridge' },
  ] },
};
const BRIDGE_STEPS = [
  { until: (a) => a.player.pos.z < a.level.wz(35) }, { objective: 'CROSS THE BRIDGE. SHOOT THE BOTTLES.' }, { spawn: [['bottler', 5, 22, { perch: 1 }], ['bottler', 16, 13, { perch: 1 }], ['bottler', 6, 20, { perch: 1 }], ['gaffer', 10, 24], ['gaffer', 11, 22]] }, { music: 'combat' },
  { until: (a) => a.player.pos.z < a.level.wz(24) }, { spawn: [['runner', 8, 12], ['runner', 13, 11], ['runner', 6, 16], ['runner', 15, 16]] }, { say: ['PYM', 'Deckhands are not on your schedule of cover. Please advise.'] },
  { until: (a) => a.enemies.filter((e) => !e.dead && !e.perch).length === 0 || a.player.pos.z < a.level.wz(5) }, { music: 'explore' }, { objective: 'THE CANNERY DOOR, NORTH.' },
  { until: (a) => a.level.doors.some((d) => d.open && d.id === '10,0') }, { wait: 0.4 }, { run: (a) => a.go('cannery') }, { wait: 9999 },
];
const WINCH_DOOR = '9,9', COLD_DOOR = '37,9', SAW_DOOR = '5,15', EAST_DOOR = '42,16';
const doorOf = (a, id) => a.level.doors.find((d) => d.id === id);
export const CANNERY = {
  map: 'cannery', safeDoors: ['31,30'], title: 'THOLE CANNERY', mood: 'indoor', music: 'explore', loops: ['conveyor'], chapter: 2, hint: 'barrel', startYaw: Math.PI, water: false, wallH: 7, belts: { north: 1.5, south: -1.5 }, fathomYaw: Math.PI / 2, dame: true, treasure: ['tusk', 'reliquary'],
  hideSpots: [[8, 22, 'lobsterpot'], [38, 12, 'lobsterpot'], [38, 24, 'lobsterpot'], [8, 12, 'lobsterpot']], barrels: [[8, 18], [39, 19], [19, 24]], groundItems: [['ammo_pistol', 19, 11, 12], ['samphire', 30, 11, 1], ['depth', 2, 13, 1]], notes: [{ id: 'timesheet', col: 34, row: 28, y: 0.86 }],
  theme: { '_': 'metal-plates', '#': 'bricks', H: 'rust' },
  decor: [['gut-table', 13, 11.5], ['gut-table', 25, 24.5], ['gut-table', 33, 24.5], ['steam-pipe', 7, 11], ['steam-pipe', 40.5, 24], ['steam-pipe', 18, 11], ['steam-pipe', 28, 24.5], ['can-press', 39.5, 13.5, 0], ['steam-pipe', 7, 24], ['crate-stack', 7.5, 25], ['barrel', 41, 25], ['telegraph-none', 0, 0], ['ice-block', 35.5, 3], ['ice-block', 36, 7], ['ice-block', 43, 7], ['ice-block', 43.5, 6], ['ice-block', 39, 3], ['hoist-chain', 12, 9.8], ['desk', 34, 28], ['chair', 34, 29], ['bookshelf', 38, 27], ['sack', 19, 30], ['crate', 28, 33], ['crate-stack', 28, 28]].filter((p) => p[0] !== 'telegraph-none'),
  lamps: [['hanging-lantern', 14, 16, { y: 3.4, intensity: 14, radius: 14 }], ['hanging-lantern', 30, 16, { y: 3.4, intensity: 14, radius: 14 }], ['hanging-lantern', 24, 30, { y: 2.4, intensity: 12, radius: 12 }], ['hanging-lantern', 9, 5, { y: 3.4, intensity: 10, radius: 10 }], ['hanging-lantern', 24, 6, { y: 3.4, intensity: 12, radius: 12 }], ['wall-lantern', 2, 13, { intensity: 8, radius: 7 }], ['hanging-lantern', 40, 4, { y: 3.4, intensity: 7, radius: 9, color: 0x70c0ff }], ['hanging-lantern', 44, 17, { y: 2.4, intensity: 8, radius: 8 }]],
  dress: { wall: ['barrel', 'crate', 'sack', 'bucket', 'fish-crate', 'can-tin'], open: ['can-tin', 'puddle'] },
  setup(a) { coldRoomSetup(a); },
  jumps: {
    flenser: (a) => { a.player.teleport(a.level.wx(14), a.level.wz(16), 0, -Math.PI / 2); a.enterStage('flenser', true); },
    cold: (a) => { addKey(a); a.player.teleport(a.level.wx(38), a.level.wz(11), 0, Math.PI); a.enterStage('cold', true); },
    boost: (a) => { a.run.flags.dameFree = true; a.spawnDame(); a.player.teleport(a.level.wx(14), a.level.wz(11), 0, -Math.PI / 2); a.dame.pos.set(a.level.wx(16), 0, a.level.wz(11)); a.enterStage('boost', true); },
    winch: (a) => { a.run.flags.dameFree = true; a.spawnDame(); a.level.openDoor(doorOf(a, WINCH_DOOR), null, true); a.player.teleport(a.level.wx(9), a.level.wz(7), 0, 0); a.dame.pos.set(a.level.wx(8), 0, a.level.wz(5)); a.enterStage('winch', true); },
    belt: (a) => { a.run.flags.dameFree = true; a.spawnDame(); a.player.teleport(a.level.wx(20), a.level.wz(17) , 0, Math.PI); a.enterStage('belt', true); },
  },
  first: 'main', stages: { get flenser() { return FLENSER_STEPS; }, get cold() { return COLD_STEPS; }, get boost() { return BOOST_STEPS; }, get winch() { return WINCH_STEPS; }, get belt() { return BELT_STEPS; }, main: [
    { objective: 'THE HALL. FIND THE INSURED.' }, { until: (a) => a.player.pos.z < a.level.wz(26) }, { music: 'combat' },
    { wave: { groups: [['gaffer', 10], ['bottler', 2]], doors: '13', every: 1.2, maxActive: 8 } }, { say: ['COMMODORE', 'A MESSAGE FROM THE CANNERY: WE ARE HIRING.'] },
    { until: (a) => (a.killCount ?? 0) >= 8 }, { stage: 'flenser' },
  ] },
};
function addKey(a) { if (!a.run.keys.includes('coldkey')) a.run.keys.push('coldkey'); }
const FLENSER_STEPS = [
  { run: (a) => { const d = doorOf(a, SAW_DOOR); a.level.breakDoor(d, { pos: a.player.pos }); a.ctx.audio.play('doorkick'); a.ctx.engine.shake.add(0.5); a.flenser = a.spawnEnemy('flenser', a.level.wx(4), a.level.wz(16)); a.flenser.onDeath = () => {}; } }, { objective: 'YOU HEARD HIM FIRST. KILL HIM FOR THE KEY.' }, { until: (a) => a.flenser?.dead }, { run: (a) => { a.spawnDrop(a.flenser.pos.x, a.flenser.pos.z, { id: 'coldkey', count: 1 }); a.app.mix.play('explore'); } }, { stage: 'cold' },
];
const COLD_STEPS = [
  { objective: 'THE COLD ROOM. NORTH EAST.' }, { until: (a) => a.run.keys.includes('coldkey') }, { until: (a) => doorOf(a, COLD_DOOR).open }, { music: null }, { run: (a) => { a.cold = true; a.silent = true; } }, { zone: [34, 2, 44, 8] },
  { run: (a) => { a.dameStatic?.remove(); a.run.flags.dameFree = true; if (!a.dame) a.spawnDame(); } },
  { scene: 'coldroom', duration: 12, shots: (a) => [{ at: 0, position: c(a, 38, 7, 1.7), target: c(a, 41, 4, 0.9), fov: 45 }, { at: 12, position: c(a, 40, 6.5, 1.4), target: c(a, 41, 4, 1), fov: 34 }] },
  { run: (a) => { a.silent = false; a.showHint('dame'); a.dame.setMode('follow'); } }, { stage: 'boost' },
];
const BOOST_STEPS = [
  { music: 'explore' }, { objective: 'THE WINCH ROOM IS CHAINED FROM ABOVE. BOOST THE DAME AT THE HOIST.' },
  { run: (a) => { const u = a.level.markers.u[0]; a.boostDone = false; a.commandSpots.push({ x: u.x, z: u.z, verb: 'BOOST', radius: 2.6, when: () => !a.boostDone && a.dame && !a.dame.carried, act: () => { a.boostDone = true; a.player.startAction('boost', 1); a.dame.goal = null; a.dame.pos.set(u.x, 0, u.z); a.dame.root.position.y = 0; a.dameBark(['Eyes front, young woman.']); a.ctx.tweens.call(1, () => { a.level.openDoor(doorOf(a, WINCH_DOOR), a.player.pos); a.ctx.audio.play('chain'); }); } }); } },
  { until: (a) => a.boostDone }, { wait: 1.2 }, { run: (a) => { const e = a.spawnEnemy('carrier', a.level.wx(43), a.level.wz(18)); a.level.openDoor(doorOf(a, EAST_DOOR), e.pos); a.carrierE = e; a.radio('general'); } }, { say: ['MAX', 'Shoot the big one. Mind the coat.'] }, { until: (a) => a.carrierE?.dead }, { stage: 'winch' },
];
const WINCH_STEPS = [
  { objective: 'WINCH ROOM. THE DAME RAISES THE SHUTTER. HOLD THE DOOR.' }, { run: (a) => { const w = a.level.markers.w[0]; a.dame.goal = { x: w.x + 0.8, z: w.z + 0.8, done: () => { a.dame.machine = { x: w.x, z: w.z, clip: 'DameHoist' }; } }; addWinch(a); } }, { until: (a) => a.dame.machine },
  { music: 'combat' }, { run: (a) => { a.winch.on = true; } },
  { wave: { groups: [['gaffer', 8], ['runner', 6], ['carrier', 1], ['bottler', 2]], doors: '123', every: 3.5, maxActive: 9 } },
  { until: (a) => a.winch.pct >= 100 }, { run: (a) => { a.winch.on = false; a.dame.machine = null; a.dame.setMode('follow'); a.level.openGate(a.level.gates.S[0]); for (const w of a.waves) w.stop(); a.say('DAME', 'Done. Do try to keep up.', 2); a.app.mix.play('explore'); } }, { stage: 'belt' },
];
const BELT_STEPS = [
  { objective: 'THE SHUTTER IS UP. CROSS THE HALL.' }, { until: (a) => { const r = a.level.row(a.player.pos.z), cc = a.level.col(a.player.pos.x); return r <= 15 && r >= 10 && cc >= 8 && cc <= 38; } }, { run: (a) => beltFight(a) }, { until: (a) => a.beltDone },
  { run: (a) => { a.say('PYM', 'Workplace incident logged. Please do not touch the can.', 2); } }, { objective: 'NORTH CORRIDOR. THROUGH THE SHUTTER.' }, { until: (a) => a.level.row(a.player.pos.z) <= 2 }, { run: (a) => a.go('yard') }, { wait: 9999 },
];
export const YARD = {
  map: 'yard', breakCover: 4, title: 'CANNERY YARD', mood: 'rain', music: 'boss', loops: ['rain'], chapter: 2, hint: 'bosun', startYaw: Math.PI, dame: 'always', fathomYaw: -2.4, waterY: -5, treasure: ['blackpearl'], barrels: [[11, 7], [24, 7], [11, 28], [24, 28], [5, 15], [30, 21]],
  groundItems: [['ammo_pistol', 15, 9, 12], ['samphire', 20, 26, 1]], notes: [{ id: 'receipt', col: 4, row: 4, y: 0.6 }],
  theme: { '#': 'bricks', H: 'rust', r: 'metal-plates' }, decor: [['gantry', 18, 18], ['steam-pipe', 3, 25], ['steam-pipe', 32, 10], ['crate-stack', 3, 31], ['crate-stack', 32, 31], ['barrel', 31, 25], ['dead-tree', 5, 30]],
  lamps: [['lamp-post', 5, 6], ['lamp-post', 30, 6], ['lamp-post', 5, 29], ['lamp-post', 30, 29], ['brazier', 18, 8, { intensity: 14, radius: 12, color: 0xff8030 }], ['brazier', 18, 27, { intensity: 14, radius: 12, color: 0xff8030 }]],
  dress: { wall: ['barrel', 'crate', 'sack', 'bucket', 'can-tin'], open: ['puddle', 'can-tin'] }, backdrops: [['backdrop-cliff', -40, -3, -40], ['backdrop-cliff', 40, -3, -40, 1], ['abbey-far', 0, -2, -80]],
  setup(a) {},
  first: 'main', stages: { after: [{ music: 'explore' }, { run: (a) => { a.level.gates.G?.[0] && a.level.openGate(a.level.gates.G[0]); } }, { objective: 'MR. FATHOM, THEN THE NORTH GATE.' }, { until: (a) => a.level.row(a.player.pos.z) <= 3 }, { run: (a) => a.showForm(() => a.app.nextChapter('causeway', 3)) }, { wait: 9999 }], main: [
    { run: (a) => { a.dame.setMode('wait'); const k = a.level.markers.k[0]; a.dame.pos.set(k.x + 1, 0, k.z + 1); } },
    { until: (a) => a.player.pos.z < a.level.wz(30) }, { run: (a) => bosunBoss(a) }, { objective: 'DROP THE PALLET ON HIM. COMMAND THE DAME.' }, { until: (a) => a.boss?.dead }, { wait: 2 },
    { music: 'explore' }, { scene: 'bosundead', duration: 3, shots: (a) => [{ at: 0, position: c(a, 20, 24, 2.4), target: [a.boss.pos.x, 0.8, a.boss.pos.z], fov: 45 }, { at: 3, position: c(a, 21, 25, 3), target: [a.boss.pos.x, 0.6, a.boss.pos.z], fov: 40 }] },
    { run: (a) => a.dame.setMode('follow') }, { wait: 1 },
    { scene: 'afterbosun', duration: 10, shots: (a) => { const k = a.level.markers.k[0]; return [{ at: 0, position: [k.x + 3, 1.6, k.z + 3], target: [k.x + 1, 1, k.z + 1], fov: 42 }, { at: 10, position: [k.x + 2.5, 1.4, k.z + 2.4], target: [k.x + 1, 1, k.z + 1], fov: 32 }]; } },
    { stage: 'after' },
  ] },
};
