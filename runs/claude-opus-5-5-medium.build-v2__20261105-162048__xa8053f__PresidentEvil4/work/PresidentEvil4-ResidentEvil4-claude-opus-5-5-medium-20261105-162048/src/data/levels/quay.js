// Chapter 1: CLAIM 1: ACT OF GOD. Mourne Quay, bruised dusk.
import { startSiege, foghornScene, siegeRoomSetup } from '../../game/setpieces.js';
import { Humanoid } from '../../game/actor.js';
const c = (a, col, row, y = 1.5) => [a.level.wx(col), y, a.level.wz(row)];
const arrivalShots = (a) => [{ at: 0, position: c(a, 60, 46, 3.5), target: c(a, 56, 40, 2), fov: 50 }, { at: 8, position: c(a, 54, 43, 2.2), target: c(a, 56, 43, 1.4), fov: 45 }, { at: 16, position: c(a, 56, 38, 3), target: c(a, 56, 43, 1.4), fov: 50 }, { at: 22, position: c(a, 50, 34, 7), target: c(a, 46, 20, 3), fov: 55 }, { at: 30, position: c(a, 56, 47, 2.4), target: c(a, 56, 40, 1.4), fov: 55 }];
export const QUAY = {
  map: 'quay', title: 'MOURNE QUAY', mood: 'dusk', music: 'explore', gulls: true, loops: ['sea'], chapter: 1, chapterCard: 1, hint: 'tannoy', startYaw: Math.PI, fathomYaw: -Math.PI / 2,
  loft: { map: 'loft', col: 22, row: 4 }, treasure: ['pearl', 'seaglass', 'goldtooth'], safeDoors: ['16,22'],
  theme: { '.': 'cobbles', ',': 'dirt', '=': 'deck', '_': 'flagstones', T: 'planks' }, barrels: [[37, 24], [24, 37], [12, 12], [44, 14]],
  groundItems: [['ammo_shells', 45, 18, 6], ['samphire', 7, 26, 1], ['flare', 15, 18, 1], ['ammo_pistol', 33, 9, 12], ['samphire', 25, 8, 1], ['ammo_pistol', 20, 16, 12], ['ammo_pistol', 36, 30, 12]],
  notes: [{ id: 'tide', col: 9, row: 18, y: 0.05 }],
  decor: [['mailboat', 55.5, 36.5, Math.PI / 2], ['foghorn', 57, 7], ['effigy', 23, 26], ['hay-cart', 32.5, 16], ['drying-rack', 12, 3.5], ['drying-rack', 8, 12, 1.57], ['draped-net', 40, 2.8], ['draped-net', 26, 15, 0], ['anchor-prop', 49.5, 8], ['buoy', 58, 28], ['buoy', 53, 18], ['rowboat', 53.3, 12, 0.3], ['rowboat', 53.5, 40, 0.1], ['fish-crate', 50, 20], ['fish-crate', 49.5, 34], ['fish-crate', 44, 26], ['tombstone', 4, 34], ['tombstone', 8, 40], ['tombstone', 4, 41], ['clothesline', 28, 34], ['market-stall', 19, 41], ['market-stall', 29, 41], ['market-stall', 33, 41], ['well', 37, 28], ['sack', 25, 5], ['rope-coil', 34, 6], ['rope-coil', 51, 24], ['bollard', 51.6, 16], ['bollard', 51.6, 26], ['bollard', 51.6, 8], ['bollard', 48.2, 31], ['barrel', 25, 10], ['crate-stack', 35, 11], ['table', 43, 34], ['chair', 44, 35], ['fireplace', 41, 37], ['bench', 10, 22], ['bench', 12, 24], ['altar', 10, 17], ['candles', 12, 17], ['banner', 6, 22, 1.57], ['bed', 44, 18], ['bookshelf', 40, 17], ['table', 43, 8], ['bookshelf', 46, 5]],
  lamps: [['lamp-post', 48, 14], ['lamp-post', 48, 28], ['lamp-post', 48, 41], ['lamp-post', 20, 15], ['lamp-post', 38, 15], ['lamp-post', 18, 30], ['lamp-post', 37, 30], ['campfire', 23, 28, { intensity: 16, radius: 12, color: 0xff8030 }], ['lamp-post', 10, 31], ['lamp-post', 8, 5]],
  lights: [[43, 33, 2.2, 0xffb060, 6, 7, 'torch'], [30, 8, 2.4, 0xffb060, 6, 9, 'torch'], [30, 7, 5.4, 0xffb060, 6, 9, 'torch'], [11, 22, 2.4, 0xffc070, 7, 10, 'torch'], [44, 8, 2.2, 0x60ff90, 4, 6, 'pulse'], [43, 18, 2.2, 0xffb060, 5, 6, 'torch'], [56, 37, 3, 0xff6020, 14, 16, 'torch']],
  dress: { wall: ['barrel', 'crate', 'sack', 'bucket', 'rope-coil', 'fish-crate', 'lobsterpot'], open: ['puddle', 'fish-crate', 'bucket', 'rope-coil', 'reeds'] },
  backdrops: [['backdrop-cliff', -60, -3, -30], ['backdrop-cliff', -50, -3, 40, 1], ['abbey-far', 60, -2, -70, 0], ['backdrop-cliff', 10, -3, -60, 2], ['backdrop-cliff', 80, -2, 30, 1, 1.4]],
  setup(a) { siegeRoomSetup(a); },
  jumps: {
    cottage: (a) => { a.player.teleport(a.level.wx(41), a.level.wz(26), 0, Math.PI * 0); a.run.flags.arrived = true; a.enterStage('cottage', true); },
    presiege: (a) => { a.player.teleport(a.level.wx(46), a.level.wz(14), 0, -Math.PI / 2); a.run.seen.fathom = true; a.enterStage('siege', true); },
    siege: (a) => { a.player.teleport(a.level.wx(28), a.level.wz(20), 0, Math.PI); a.enterStage('siege', true); },
    foghorn: (a) => { a.player.teleport(a.level.wx(28), a.level.wz(20), 0, Math.PI); for (let i = 0; i < 10; i++) a.spawnEnemy('gaffer', a.level.wx(20 + i * 2), a.level.wz(26)); a.addScript([{ wait: 1 }, { run: foghornScene }]); },
    aftermath: (a) => { a.player.teleport(a.level.wx(28), a.level.wz(20), 0, Math.PI); a.enterStage('after', true); },
  },
  first: 'main',
  stages: { get cottage() { return COTTAGE_STEPS(); }, get siege() { return SIEGE_STEPS; }, get after() { return AFTER_STEPS; }, main: [
    { run: (a) => { const n = new Humanoid(a.ctx, 'nils'); n.root.position.set(a.level.wx(56) - 1.2, 0, a.level.wz(44)); n.root.rotation.y = 1.2; n.play('Idle'); a.nils = n; a.def.update = (A, dt) => { A.nils?.update(dt); }; } }, { scene: 'arrival', shots: arrivalShots, duration: 30 }, { run: (a) => { a.nils.play('Walk'); a.ctx.tweens.to(a.nils.root.position, { z: a.nils.root.position.z + 6 }, { duration: 3 }); a.ctx.tweens.call(3, () => { a.nils.remove(); a.nils = null; }); } },
    { objective: 'FIND THE INSURED. TRY THE NEAREST COTTAGE.', hint: 'move' }, { flag: 'arrived' },
    { until: (a) => a.player.pos.distanceTo(a.tannoys[5].pos) < 13 || a.player.pos.z < a.level.wz(38), }, { hint: 'aim' }, { wait: 6 },
    { hint: 'door', stage: 'cottage' },
  ] },
};
export const COTTAGE_STEPS = () => [
  { until: (a) => a.level.doors.find((d) => d.id === '41,30')?.open },
  { zone: [39, 31, 45, 37] },
  { run: (a) => { a.menderE = a.spawnEnemy('gaffer', a.level.wx(43), a.level.wz(35), { work: true, workClip: 'WorkMend', model: 'mender' }); a.calm = true; } },
  { scene: 'mender', duration: 8, shots: (a) => [{ at: 0, position: c(a, 41, 33, 2), target: c(a, 43, 35, 1.2), fov: 50 }, { at: 8, position: c(a, 42, 34, 1.7), target: c(a, 43, 35, 1.3), fov: 38 }] },
  { run: (a) => { a.calm = false; a.menderE?.alert(); } }, { hint: 'head' }, { objective: 'THE MENDER OBJECTS.' },
  { until: (a) => a.menderE?.dead },
  { wait: 0.8 }, { run: (a) => { a.ctx.audio.play('barrel', { volume: 0.7 }); a.ctx.engine.shake.add(0.5); a.ctx.lights.request({ position: [a.level.wx(55), 3, a.level.wz(37)], color: 0xff5010, intensity: 30, radius: 26, flicker: 'torch' }); a.boatFire = true; } },
  { scene: 'boatburns', duration: 3.5, shots: (a) => [{ at: 0, position: c(a, 44, 33, 1.8), target: c(a, 46, 34, 1.7), fov: 40 }, { at: 3.5, position: c(a, 44.5, 33.5, 1.8), target: c(a, 50, 35, 2), fov: 30 }] },
  { run: (a) => { const d = a.level.doors.find((x) => x.id === '41,30'); a.spawnEnemy('gaffer', a.level.wx(41), a.level.wz(28)); a.spawnEnemy('gaffer', a.level.wx(42), a.level.wz(27)); a.showHint('window'); } },
  { objective: 'THE WINDOW. GET TO THE QUAY FRONT, NORTH.' }, { until: (a) => a.player.pos.z < a.level.wz(26) && a.player.pos.x > a.level.wx(44) },
  { spawn: [['gaffer', 49, 15], ['gaffer', 50, 11], ['gaffer', 46, 13]] }, { objective: 'SOMEONE IS SELLING SOMETHING IN THE NET SHED.' },
  { until: (a) => a.run.seen.fathom || a.player.pos.x < a.level.wx(36) }, { run: (a) => { if (!a.caseTipped) { a.caseTipped = true; a.showHint('case'); } } },
  { stage: 'siege' },
];
export const SIEGE_STEPS = [
  { objective: 'THE ROAD WEST GOES THROUGH THE SQUARE.' }, { until: (a) => { const P = a.player, c0 = a.level.col(P.pos.x), r0 = a.level.row(P.pos.z); return c0 >= 16 && c0 <= 38 && r0 >= 14 && r0 <= 31; } },
  { run: (a) => { a.calm = true; for (let i = 0; i < 14; i++) { const ang = (i / 14) * 6.283; a.spawnEnemy('gaffer', a.level.wx(23) + Math.cos(ang) * 4.2, a.level.wz(27) + Math.sin(ang) * 4.2, { work: true, workClip: 'Shout', yaw: ang + 1.57 }); } a.app.mix.play(null, 0.3); } },
  { scene: 'siege', duration: 6, shots: (a) => [{ at: 0, position: c(a, 30, 22, 7), target: c(a, 23, 27, 2), fov: 50 }, { at: 3, position: c(a, 18, 22, 4), target: c(a, 23, 27, 2.6), fov: 45 }, { at: 6, position: c(a, 26, 21, 2.2), target: c(a, 23, 27, 1.4), fov: 40 }] },
  { run: (a) => { a.calm = false; startSiege(a); } }, { objective: 'SURVIVE. THE SQUARE HAS OPINIONS.' }, { music: 'siege' },
];
export const AFTER_STEPS = [
  { music: 'explore' }, { openGate: 'G' }, { objective: 'THE WEST GATE IS OPEN. LOOT THE QUAY, THEN LEAVE.' }, { run: (a) => { a.silent = false; a.run.flags.siegeDone = true; } },
  { until: (a) => { const P = a.player; return a.level.col(P.pos.x) <= 2 && Math.abs(a.level.row(P.pos.z) - 8.5) < 3; } }, { run: (a) => a.showForm(() => a.app.nextChapter('road', 2)) }, { wait: 99999 },
];
