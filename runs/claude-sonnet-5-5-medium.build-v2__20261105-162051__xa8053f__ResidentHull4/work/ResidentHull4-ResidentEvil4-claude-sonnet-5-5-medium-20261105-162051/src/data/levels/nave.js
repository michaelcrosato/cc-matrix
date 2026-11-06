// The flooded Nave: the Commodore's Bathysphere in three phases, then the Mother.
import { TANNOY_LINES, FINAL_BOSS, HATCH } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { Bathysphere } from '../../game/bosses.js';
import { cp, cam, timed, lineDuration, nearXZ, shake, flashBang } from '../../game/kit.js';
import { app } from '../../core/app.js';
import { THREE } from '../../../pixel-engine.js';
import { makeWater } from '../../game/world.js';

function* main(a) {
  a.setObjective('FIND THE COMMODORE'); a.autosave(); app.mix?.play('explore');
  const dame = a.addDame(a.player.x, a.player.z + 1.5); dame.mode = 'wait';
  a.nave = { water: 0, waterTarget: 0 };
  const [ox, oz] = cp(a, 13, 14);
  while (!nearXZ(a, ox, oz, 30)) yield 0.3;
  const ls = timed(FINAL_BOSS, 0.6);
  const boss = new Bathysphere(a, ox, oz); a.boss = boss; a.enemies.push(boss);
  app.mix?.play('boss');
  yield* a.cutscene({ shots: [{ at: 0, ...cam(a.player.x + 4, 3, a.player.z - 6, ox, 3, oz, 55) }, { at: 6, ...cam(ox + 6, 3.5, oz + 10, ox, 3, oz, 55) }], lines: ls, duration: lineDuration(ls), cues: [{ at: 0.5, run: () => { a.audio('roar', ox, oz); shake(a, 0.7); } }] });
  a.setObjective('BURST THE FOUR VALVES');
  a.showHint('SHOOT THE GLOWING RED VALVES. LURE HIS CHARGE INTO A COLUMN', 12);
  yield () => boss.phase === 2;
  a.setObjective('SHOOT THE HATCH LOCKS'); a.hintT = 0;
  yield () => boss.mode === 'hatchWait';
  // kick prompt: Max climbs and tears the hatch
  boss.mode = 'hatchWait'; a.hatchReady = true; a.setObjective('TEAR OPEN THE HATCH');
  yield () => a.hatchDone;
  a.hatchReady = false;
  const hl = timed(HATCH, 0.8);
  yield* a.cutscene({ shots: [{ at: 0, ...cam(boss.x + 3, 6, boss.z + 4, boss.x, 3, boss.z, 50) }, { at: 5, ...cam(boss.x + 2, 4, boss.z + 4, boss.x, 3.5, boss.z, 42) }], lines: hl, duration: lineDuration(hl), cues: [{ at: 0.3, run: () => { shake(a, 0.8); a.audio('barrel'); } }] });
  boss.beginMother(); a.setObjective('DESTROY THE MICROPHONE'); app.mix?.play('boss');
  a.showHint('THE MOTHER SPITS BRINE. SHOOT THE GLOBS. FLARES KILL ALL LIMPETS AT ONCE', 12);
  yield () => boss.over;
  app.mix?.play(null);
  // Final Settlement: press, press, mash; stamp
  a.setObjective('FINAL SETTLEMENT');
  yield* a.qte({ type: 'press', verb: 'action', window: 1.3, label: 'PRESS' });
  yield* a.qte({ type: 'press', verb: 'dodge', window: 1.3, label: 'PRESS' });
  yield* a.qte({ type: 'mash', verb: 'action', window: 3, need: 12, label: 'STAMP IT' });
  a.setStamp('DENIED', 'red'); flashBang(a, 'white', 0.2); shake(a, 1);
  yield 1.2; a.bark('MAX', 'CLAIM DENIED.', 4);
  yield 3;
  a.run.flags['mother-dead'] = true;
  // the Font cracks, the water floods, the side gate opens
  a.setObjective('RUN TO THE LAUNCH'); a.autosave();
  const gate = a.level.doors.find((d) => d.kind === 'G'); if (gate) a.openDoor(gate);
  a.floodRun = true;
  const [gx, gz] = cp(a, 26, 4);
  while (!nearXZ(a, gx, gz, 3)) yield 0.4;
  yield* a.finishArea({ next: 'launch', title: 'FINAL SETTLEMENT', claim: false });
}
function contexts(a) {
  const out = [];
  const b = a.boss;
  if (a.hatchReady && b && Math.hypot(a.player.x - b.x, a.player.z - b.z) < 5) out.push({ prio: 0, label: 'TEAR OPEN THE HATCH', verb: 'action', run: () => { a.hatchReady = false; a.player.doMelee('kick', 0.7); a.audio('kick'); a.later(0.8, () => { a.hatchDone = true; }); } });
  return out;
}
export const nave = {
  id: 'nave', name: 'THE NAVE', mapId: 'nave', mood: 'abbey', music: null, chapter: 3, startYaw: Math.PI,
  theme: { floors: { '.': 'flagstones', '_': 'flagstones' }, walls: { '#': 'dry-stone' }, cover: 'dry-stone', coverTop: 'mist' },
  tannoyLines: [TANNOY_LINES[14]], dress: ['pew', 'candles', 'column'], lamps: [], water: false, backdrop: false, build: { noWaterWalls: true },
  scripts: [main], contexts,
  setup(a) {
    for (const [c, r] of [[6, 8], [20, 8], [6, 24], [20, 24], [13, 40], [13, 20]]) { const [x, z] = cp(a, c, r); a.ctx.lights.request({ position: [x, 3, z], color: 0xffa860, intensity: 10, radius: 11, flicker: 'torch' }); }
    a.placeModel('font', a.level.wx(13), a.level.wz(8), 0, { collide: false });
    a.placeModel('organ', a.level.wx(13), a.level.wz(2), 0, { collide: false });
    const m = a.level.map; a.naveWater = makeWater(a.ctx, [-m.W / 2, -m.H / 2, m.W / 2, m.H / 2], -0.5, false);
  },
  fixed(a, dt) {
    const n = a.nave; if (!n) return;
    n.water += ((n.waterTarget || 0) - n.water) * Math.min(1, dt); if (a.floodRun) n.waterTarget = 0.5;
    if (a.naveWater) a.naveWater.position.y = -0.5 + n.water + (a.floodRun ? 0.3 : 0);
    a.naveWater?.update(a.time);
    if (n.water > 0.3 && !a.floodRun) a.player.slowT = Math.max(a.player.slowT, 0.2);
  },
  botPlan(a) { const P = (c, r, o = {}) => ({ x: a.level.wx(c), z: a.level.wz(r), ...o }); return [P(13, 40), P(13, 32, { r: 2 }), (x => ({ x: x.boss ? x.boss.x : a.level.wx(13), z: x.boss ? x.boss.z + 3 : a.level.wz(20), r: 1.2, hold: (q) => !q.hatchDone && (!q.boss || q.boss.phase < 3) }))(a), P(13, 24, { r: 3, hold: (x) => !x.run.flags['mother-dead'] }), P(26, 5, { r: 1.5 })]; },
};
