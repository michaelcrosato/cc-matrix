// The Causeway: a 90 m stone road as the tide comes in. Four minutes. Drowned, harpooners, a wheel at the gate.
import { TANNOY_LINES, CAUSEWAY } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { cp, cam, timed, lineDuration, nearXZ, shake } from '../../game/kit.js';
import { app } from '../../core/app.js';
import { ui } from '../../core/ui.js';

const TIDE_S = 240;
function* main(a) {
  const ls = timed(CAUSEWAY, 0.6);
  app.mix?.play('tide1');
  yield* a.cutscene({ shots: [{ at: 0, ...cam(a.player.x + 5, 3, a.player.z + 6, a.player.x, 1.5, a.player.z - 8, 55) }, { at: 8, ...cam(a.player.x - 3, 2.5, a.player.z + 3, a.player.x, 1.6, a.player.z - 6, 48) }], lines: ls, duration: lineDuration(ls) });
  const dame = a.addDame(a.player.x - 1.5, a.player.z + 1.5); dame.mode = 'follow';
  a.setObjective('REACH THE ABBEY GATE BEFORE THE TIDE'); a.autosave();
  a.tide = { t0: a.time, left: TIDE_S, level: 0 };
  a.tideGauge = { level: 0, left: TIDE_S };
  const marks = [['1', 75], ['2', 58], ['3', 45], ['4', 25], ['5', 15]];
  const risen = new Set();
  // drowned rise as you pass spawn points
  a.scripts.start(function* () {
    while (!a.ended) {
      for (const [d] of marks) { if (risen.has(d)) continue; const m = a.level.markers[d]?.[0]; if (m && Math.abs(a.player.z - m.z) < 10) { risen.add(d); for (let i = 0; i < 2; i++) { const e = a.spawn('drowned', m.x + (i ? 1.5 : -1.5), m.z, { state: S.RISE }); e.setState(S.RISE); } a.audio('splash', m.x, m.z); } }
      yield 0.5;
    }
  }, 'rise');
  // two rowboats shadow you at 10 m
  const boats = []; for (const sx of [-8.5, 8.5]) { const hp = a.spawn('harpooner', a.player.x + sx, a.player.z - 6, { state: S.APPROACH, noBody: true }); hp.speedBase = 0; hp.boat = a.placeModel('rowboat', hp.x, hp.z, Math.PI / 2, { collide: false, y: -0.3 }).object; boats.push(hp); }
  a.scripts.start(function* () { while (!a.ended) { for (const [i, hp] of boats.entries()) { if (hp.dead) continue; const tz = a.player.z - 7 + i * 4; hp.z += (tz - hp.z) * 0.05; hp.px = hp.x; hp.x = a.player.x + (i ? 9 : -9); hp.boat?.position.set(hp.x, -0.3, hp.z + 0.6); } yield 0.05; } }, 'boats');
  // the gate and the wheel
  const [gx, gz] = cp(a, 7, 3);
  while (!nearXZ(a, gx, gz, 5)) yield 0.3;
  a.setObjective('HOLD THE LINE WHILE THE DAME TURNS THE WHEEL');
  dame.mode = 'wait'; dame.busy = 'wheel'; dame.x = gx; dame.z = gz + 1.2;
  let turned = 0;
  for (let i = 0; i < 5; i++) a.spawn('drowned', gx + (i - 2) * 1.2, gz + 12, { state: S.APPROACH });
  while (turned < 6) { if (nearXZ(a, gx, gz, 6)) turned += 0.1; yield 0.1; if (a.player.dead) return; }
  const gate = a.level.doors.find((d) => d.kind === 'G'); if (gate) a.openDoor(gate);
  dame.busy = null; dame.mode = 'follow'; a.bark('DAME', 'DAMP. BUT OPEN.', 3);
  a.ended = false; a.tideGauge = null; a.tideDone = true;
  yield* a.finishArea({ next: 'abbey', claim: false });
}
export const causeway = {
  id: 'causeway', name: 'THE CAUSEWAY', mapId: 'causeway', mood: 'moon', music: null, chapter: 2, startYaw: Math.PI,
  theme: { floors: { '.': 'flagstones', ',': 'wet-sand', '=': 'planks', '%': 'shallow-water' }, walls: { '#': 'dry-stone' } }, build: { noWaterWalls: false },
  tannoyLines: [TANNOY_LINES[11]], dress: ['rock', 'bollard', 'buoy', 'reeds'], lamps: [[0, 40], [0, 10], [0, -20]], backdropKinds: ['sea-stack', 'foghorn-tower'],
  scripts: [main],
  fixed(a, dt) {
    const t = a.tide; if (!t || a.tideDone) return;
    t.left = Math.max(0, TIDE_S - (a.time - t.t0)); const k = 1 - t.left / TIDE_S; t.level = k; a.tideGauge.level = k; a.tideGauge.left = t.left;
    const y = -0.6 + 1.5 * k; if (a.water) a.water.position.y = y;
    const p = a.player; const [c, r] = a.level.cellOf(p.x, p.z); const dry = (r >= 34 && r <= 40) || (r >= 62 && r <= 68);
    if (!dry && y > 0) { p.slowT = Math.max(p.slowT, 0.2); if (y > 0.7) a.hurtPlayer(2 * dt, p.x, p.z, 'water', true); }
    if (t.left <= 0 && !p.dead) { a.run.hp = 0; a.playerDied('drowned'); }
    const tl = k < 0.33 ? 'tide1' : k < 0.66 ? 'tide2' : 'tide3'; if (a.tideSong !== tl && !a.scripts.cut) { a.tideSong = tl; app.mix?.play(tl); }
  },
  botPlan(a) { const out = []; for (let r = 90; r >= 4; r -= 6) { out.push({ x: a.level.wx(7), z: a.level.wz(r) }); if (r === 66) out.push({ x: a.level.wx(3), z: a.level.wz(65), r: 1.5, shop: true }); } out.push({ x: a.level.wx(7), z: a.level.wz(3), r: 2 }); return out; },
};
