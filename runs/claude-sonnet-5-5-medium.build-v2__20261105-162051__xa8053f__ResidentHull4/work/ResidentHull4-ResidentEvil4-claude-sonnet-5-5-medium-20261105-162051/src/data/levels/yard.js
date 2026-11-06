// The cannery yard: the Bosun, a crane, and the Dame in the cab.
import { TANNOY_LINES, AFTER_BOSUN } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { Bosun, Crane } from '../../game/bosses.js';
import { cp, cam, timed, lineDuration, nearXZ, shake } from '../../game/kit.js';
import { app } from '../../core/app.js';
import { ui } from '../../core/ui.js';
import { THREE, toonMaterial, PALETTE } from '../../../pixel-engine.js';

function* main(a) {
  a.setObjective('FIND A WAY ACROSS THE YARD'); a.autosave();
  const [ox, oz] = cp(a, 17, 4);
  while (!nearXZ(a, ox, oz, 22)) yield 0.3;
  a.setObjective('BRING DOWN THE BOSUN'); app.mix?.play('boss');
  const [kx, kz] = cp(a, 3, 18);
  const dame = a.addDame(kx, kz); dame.cutscene = true; dame.mode = 'wait'; dame.busy = 'crane'; dame.h.root.position.y = 4;
  a.crane = new Crane(a, 18, 5, 30);
  const boss = new Bosun(a, ox, oz + 3); a.boss = boss; a.enemies.push(boss);
  for (const [dx, dz] of [[-6, -2], [5, 6], [-2, 8], [8, -6]]) a.addBrineBarrel(boss.x + dx, boss.z + dz, false);
  const ls = timed([['COMMODORE', TANNOY_LINES[5], 4.5], ['MAX', 'AND IF HE ONLY HAS THE ONE, IT IS PRIVATE.', 2.5]], 0.5);
  yield* a.cutscene({ shots: [{ at: 0, ...cam(a.player.x + 6, 3, a.player.z - 6, boss.x, 3, boss.z, 55) }, { at: 5, ...cam(boss.x + 8, 4, boss.z + 10, boss.x, 3, boss.z, 55) }], lines: ls, duration: lineDuration(ls) + 0.5, cues: [{ at: 0.4, run: () => { a.audio('roar', boss.x, boss.z); shake(a, 0.6); } }] });
  a.showHint('THE CRANE: PRESS DAME COMMAND WHEN THE LAMP IS LIT AND HE IS UNDER THE PALLET. SHOOT THE SACS ON HIS BACK', 12);
  yield () => boss.dead || a.player.dead;
  if (a.player.dead) return;
  app.mix?.play(null); a.setFlag('bosun-dead');
  dame.busy = null; dame.cutscene = false; dame.mode = 'follow'; dame.x = a.player.x - 2; dame.z = a.player.z - 2; dame.h.root.position.y = 0;
  yield 2;
  const l2 = timed([...AFTER_BOSUN.map(([w, t]) => [w, t]), ['COMMODORE', '...HE ONLY HAD THE ONE.', 2.5]], 0.5);
  yield* a.cutscene({ shots: [{ at: 0, ...cam(a.player.x + 3, 2, a.player.z + 4, a.player.x, 1.5, a.player.z, 46) }, { at: 14, ...cam(a.player.x + 1, 1.7, a.player.z + 2.4, a.player.x, 1.5, a.player.z, 40) }], lines: l2, duration: lineDuration(l2) });
  a.setObjective('SHOP, THEN THE NORTH GATE'); a.autosave();
  const gate = a.level.doors.find((d) => d.kind === 'G'); if (gate) a.openDoor(gate);
  const [gx, gz] = cp(a, 17, 1);
  while (!nearXZ(a, gx, gz, 3)) yield 0.4;
  yield* a.finishArea({ next: 'causeway', title: 'CLAIM 2: WEAR AND TEAR' });
}
function dameCommand(a) {
  const c = a.crane; if (!c || !a.boss || a.boss.dead) return false;
  if (c.state !== 'travel') { a.bark('DAME', 'THE PALLET IS RELOADING. I AM NOT A MIRACLE.', 3); return true; }
  c.release(); return true;
}
export const yard = {
  id: 'yard', name: 'CANNERY YARD', mapId: 'yard', mood: 'rain', music: 'explore', chapter: 1, startYaw: Math.PI,
  theme: { floors: { '.': 'cobbles', ',': 'dirt', r: 'metal-plates' }, walls: { '#': 'bricks' }, cover: 'metal-plates', coverTop: 'night' },
  tannoyLines: [TANNOY_LINES[10]], dress: ['crate', 'barrel', 'crate-stack', 'rope-coil', 'sack'], lamps: [[-10, -10], [10, -10], [-10, 10], [10, 10]],
  scripts: [main], dameCommand,
  setup(a) {
    for (const m of a.level.markers.z || []) { const p = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 1), toonMaterial(PALETTE.sand)); p.position.set(m.x, 0.03, m.z); a.ctx.scene.add(p); }
    const [kx, kz] = [a.level.markers.k[0].x, a.level.markers.k[0].z];
    a.placeModel('crane-cab', kx, kz, 0, { collide: false });
    for (const m of a.level.markers.r || []) {}
    a.hudExtra = () => { const c = a.crane; if (!c || !a.boss || a.boss.dead) return; ui.text(ui.W / 2, ui.H - 60, c.state === 'travel' ? (c.lamp ? 'LAMP LIT: COMMAND!' : 'CRANE READY') : c.state === 'reload' ? 'RELOADING ' + Math.ceil(c.reload) : '', { align: 'center', color: c.lamp ? 'lime' : 'mist' }); };
  },
  fixed(a, dt) { a.crane?.update(dt); },
  botCommand(a) { const c = a.crane, b = a.boss; return !!(c && b && !b.dead && c.state === 'travel' && (c.lamp || b.mode === 'kneel' === false) && Math.hypot(b.x - c.x, b.z - c.z) < 2.4); },
  botPlan(a) { const P = (c, r, o = {}) => ({ x: a.level.wx(c), z: a.level.wz(r), ...o }); return [P(30, 31, { r: 2, shop: true }), P(17, 28), (a.bot && a.bot.opts.cheat ? P(17, 21, { r: 2, hold: (x) => !x.boss || !x.boss.dead }) : P(17, 19, { r: 1, hold: (x) => !x.boss || !x.boss.dead })), P(17, 14, { r: 2, hold: (x) => !x.hasFlag('bosun-dead') }), P(17, 6, { r: 2 }), P(17, 2, { r: 2 })]; },
};
