// The Abbey: monks and knights, a lens puzzle, a trapdoor, the Dame alone in the crypt, then the armoury.
import { TANNOY_LINES, CRYPT } from '../dialogue.js';
import { S } from '../../game/enemy.js';
import { cp, cam, timed, lineDuration, nearXZ, inCells, shake, alive, waitAllDead } from '../../game/kit.js';
import { app } from '../../core/app.js';
import { ui } from '../../core/ui.js';
import { THREE, toonMaterial, glowMaterial, PALETTE, buildModel, setLookLayer } from '../../../pixel-engine.js';
import { MODELS } from '../../models/index.js';
import { angleDiff, turnToward } from '../../game/geom.js';

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
// facing index k: yaw = k * 45 degrees, 0 = +z (south on the map). We name them for the player's arrows.
function requiredFacing(a, s, lens) { const ang = Math.atan2(lens.x - s.x, lens.z - s.z); return ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8; }

function* main(a) {
  a.setObjective('LIGHT THE THREE LAMPS'); a.autosave(); app.mix?.play('explore');
  const dame = a.addDame(a.player.x, a.player.z + 1.5); dame.mode = 'follow';
  const monks = [];
  for (const [c, r] of [[14, 22], [29, 22], [22, 30]]) { const [x, z] = cp(a, c, r); monks.push(a.spawn('monk', x, z, { work: true, state: S.WORK, group: 'cloister' })); }
  for (const [c, r] of [[12, 12], [31, 12]]) { const [x, z] = cp(a, c, r); monks.push(a.spawn('knight', x, z, { work: true, state: S.WORK, group: 'cloister' })); }
  a.showHint('LAMP STATUES TURN WITH ACTION. THE FLOOR MOSAIC SHOWS WHERE THEY LOOK', 10);
  yield () => a.hasFlag('lens-solved');
  a.setObjective('CROSS THE ARCADE'); a.audio('stoneGrind');
  const gate = a.level.doors.find((d) => d.kind === 'G'); if (gate) a.openDoor(gate);
  const [vx, vz] = cp(a, 10, 20);
  while (!nearXZ(a, vx, vz, 1.6)) yield 0.2;
  // the floor drops under the Dame: the crypt
  app.mix?.play(null); shake(a, 0.9); a.audio('stoneGrind');
  yield* crypt(a);
  // back with Max: finish the fight in the arcade
  app.mix?.play('combat'); a.setObjective('FINISH THE ARCADE');
  const [ax, az] = cp(a, 7, 30);
  for (let i = 0; i < 4; i++) a.spawn('monk', a.level.wx(30) + i, a.level.wz(24), { state: S.APPROACH });
  yield () => !alive(a.enemies.filter((e) => e.type === 'monk' && e.group !== 'cloister')).length;
  a.setObjective('THE ARMOURY: DOOR EAST'); a.autosave();
  const [ex, ez] = cp(a, 22, 3);
  while (a.player.z > -13.5 || !nearXZ(a, ex, ez, 6)) yield 0.4;
  yield* a.finishArea({ next: 'nave', title: 'CLAIM 3: ACT OF COMMODORE', claim: false });
}
/** The Dame alone. Walk 2.2, run 3.2 (loud), whack, hide in niches, throw lamps. Two hits restart. */
function* crypt(a) {
  const dame = a.dame, lv = a.level;
  const [sx, sz] = cp(a, 3, 12);
  a.player.noMove = true; a.control = 'dame';
  dame.mode = 'wait'; dame.x = sx; dame.z = sz; dame.px = sx; dame.pz = sz; dame.cutscene = true;
  const ls = timed(CRYPT, 0.6);
  yield* a.cutscene({ shots: [{ at: 0, ...cam(sx + 4, 3.5, sz + 5, sx, 1, sz, 55) }, { at: 7, ...cam(sx + 2, 2, sz + 3, sx, 1, sz, 44) }], lines: ls, duration: lineDuration(ls) });
  a.setObjective('FIND THE LEVER. DO NOT BE HEARD'); a.showHint('YOU ARE THE DAME. ACTION: WHACK / HIDE. RUN IS LOUD. G: THROW A LAMP', 10);
  const [lx, lz] = cp(a, 3, 33); const [dx, dz] = cp(a, 7, 30);
  // three blind knights patrol
  const knights = [];
  const paths = [[[3, 16], [3, 24], [4, 18]], [[2, 26], [5, 30], [2, 22]], [[4, 14], [2, 20], [5, 24]]];
  paths.forEach((pth, i) => { const [x, z] = cp(a, pth[0][0], pth[0][1]); const k = a.spawn('knight', x, z, { state: S.APPROACH, noBody: true }); k.blindKnight = { path: pth.map(([c, r]) => cp(a, c, r)), i: 1, hunt: null, stun: 0, huntT: 0 }; k.helmet = 0; k.speedBase = 0.9; knights.push(k); });
  a.crypt = { knights, hits: 0, whackCd: 0, lever: false, hidden: null, noise: null };
  yield () => a.crypt.lever && a.crypt.done;
  // the door opens; control returns to Max
  a.control = null; a.player.noMove = false; a.player.h.root.visible = true; a.player.invuln = 0; dame.cutscene = false; dame.mode = 'follow'; dame.hidden && dame.unhide();
  for (const k of knights) if (!k.dead) { k.dead = true; k.h.root.visible = false; k.h.shadow && (k.h.shadow.visible = false); }
  a.crypt = null; a.cryptDone = true; app.mix?.play(null);
  const [mx, mz] = cp(a, 8, 31); a.player.teleport(mx + 1, mz); dame.x = mx; dame.z = mz + 1.5;
  a.bark('DAME', 'THAT WAS NOT IN THE BROCHURE.', 3);
}
function cryptStep(a, dt) {
  const c = a.crypt; if (!c) return;
  const dame = a.dame, i = a.cur, lv = a.level;
  c.whackCd = Math.max(0, c.whackCd - dt);
  const hidden = !!dame.hidden;
  if (!hidden && !a.cutsceneActive) {
    const mag = Math.min(1, Math.hypot(i.mx, i.my));
    if (mag > 0.05) {
      const cy = a.cam.yaw; const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
      let dx = fx * i.my + rx * i.mx, dz = fz * i.my + rz * i.mx; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const sp = i.run ? 3.2 : 2.2; const nx = dame.x + dx * sp * dt, nz = dame.z + dz * sp * dt;
      if (lv.nav.walkable(nx, nz)) { dame.x = nx; dame.z = nz; } else if (lv.nav.walkable(nx, dame.z)) dame.x = nx; else if (lv.nav.walkable(dame.x, nz)) dame.z = nz;
      dame.yaw = turnToward(dame.yaw, Math.atan2(dx, dz), 9 * dt); dame.speed = sp; c.noise = { x: dame.x, z: dame.z, r: i.run ? 9 : 4 };
    } else { dame.speed = 0; c.noise = null; }
    // keep Max out of the way and the camera on her
    a.player.teleport(dame.x - 0.01, dame.z - 0.01); a.player.invuln = 99; a.player.h.root.visible = false;
    if (i.actionPressed) {
      const [lx, lz] = cp(a, 3, 33);
      const niche = (lv.markers.h || []).find((m) => Math.hypot(m.x - dame.x, m.z - dame.z) < 1.6);
      if (Math.hypot(lx - dame.x, lz - dame.z) < 1.8 && !c.lever) { c.lever = true; a.audio('stoneGrind'); const dr = a.doorAtCell(7, 30); if (dr) a.openDoor(dr); a.bark('DAME', 'A LEVER. HOW DRAMATIC.', 3); a.crypt.done = true; }
      else if (niche) { dame.hide(niche); }
      else if (c.whackCd <= 0) { c.whackCd = 8; a.audio('whoosh'); for (const k of c.knights) if (Math.hypot(k.x - dame.x, k.z - dame.z) < 1.8 && !k.dead) { k.blindKnight.stun = 2; a.audio('hit', k.x, k.z); } }
    }
    if (i.grenade) { c.noise = { x: dame.x + Math.sin(dame.yaw) * 6, z: dame.z + Math.cos(dame.yaw) * 6, r: 9, thrown: true }; a.audio('glass', c.noise.x, c.noise.z); }
  } else if (i.actionPressed) dame.unhide();
  // knights: hearing radius run 9, walk 4, still 0
  for (const k of c.knights) {
    if (k.dead) continue; const b = k.blindKnight;
    k.px = k.x; k.pz = k.z;
    if (b.stun > 0) { b.stun -= dt; k.h.play('StunHands'); continue; }
    let target = null;
    if (c.noise && !hidden && Math.hypot(k.x - c.noise.x, k.z - c.noise.z) < c.noise.r) { b.hunt = { x: c.noise.x, z: c.noise.z }; b.huntT = 4; }
    if (b.huntT > 0) { b.huntT -= dt; target = b.hunt; } else { const w = b.path[b.i % b.path.length]; target = { x: w[0], z: w[1] }; if (Math.hypot(k.x - w[0], k.z - w[1]) < 0.8) b.i++; }
    const dx = target.x - k.x, dz = target.z - k.z, d = Math.hypot(dx, dz) || 1;
    k.yaw = turnToward(k.yaw, Math.atan2(dx, dz), 3 * dt);
    const sp = (b.huntT > 0 ? 1.6 : 0.9); const nx = k.x + dx / d * sp * dt, nz = k.z + dz / d * sp * dt; if (lv.nav.walkable(nx, nz)) { k.x = nx; k.z = nz; }
    k.h.play('KnightWalk'); k.h.setLowerSpeed(sp / 0.9);
    if (!hidden && Math.hypot(k.x - dame.x, k.z - dame.z) < 1.3 && (b.cool || 0) <= 0) { b.cool = 2; if (!a.dev.god) c.hits++; a.audio('hurt'); shake(a, 0.5); a.bark('DAME', 'DEDUCTED.', 2); dame.h.flash(2); if (c.hits >= 2) { c.hits = 0; const [sx, sz] = cp(a, 3, 12); dame.x = sx; dame.z = sz; for (const kk of c.knights) { const p0 = kk.blindKnight.path[0]; kk.x = p0[0]; kk.z = p0[1]; kk.blindKnight.huntT = 0; } a.bark('DAME', 'VERY WELL. AGAIN.', 3); } }
    if (b.cool > 0) b.cool -= dt;
  }
}
/** Lens puzzle: three statues, each turns in 45 degree steps. */
function setupPuzzle(a) {
  const lv = a.level; const lens = { x: lv.wx(22), z: lv.wz(7) };
  a.puzzle = { statues: [], lens, solved: false };
  for (const m of lv.markers.s || []) {
    const b = buildModel('lens-statue', { catalog: MODELS }); b.object.position.set(m.x, 0, m.z); a.ctx.scene.add(b.object); setLookLayer(b.object, 'actors');
    const turn = b.object.getObjectByName('Turn');
    const st = { x: m.x, z: m.z, k: a.rng.int(0, 7), turn, obj: b.object, busy: 0, need: 0 };
    st.need = requiredFacing(a, st, lens); if (st.k === st.need) st.k = (st.k + 3) % 8;
    if (turn) turn.rotation.y = st.k * Math.PI / 4;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1), glowMaterial(PALETTE.sand)); beam.castShadow = false; a.ctx.scene.add(beam); st.beam = beam;
    a.puzzle.statues.push(st);
  }
  // floor mosaic shows each statue's facing
  const q = lv.markers.q?.[0];
  if (q) a.puzzle.mosaic = q;
}
function puzzleStep(a, dt) {
  const P = a.puzzle; if (!P) return;
  for (const s of P.statues) {
    if (s.busy > 0) { s.busy -= dt; if (s.turn) s.turn.rotation.y = turnToward(s.turn.rotation.y, s.k * Math.PI / 4, 4 * dt); }
    else if (s.turn) s.turn.rotation.y = s.k * Math.PI / 4;
    const yaw = s.k * Math.PI / 4; const len = 12;
    s.beam.position.set(s.x + Math.sin(yaw) * len / 2, 1.75, s.z + Math.cos(yaw) * len / 2); s.beam.rotation.y = yaw; s.beam.scale.set(1, 1, len);
    s.beam.visible = P.solved || true;
  }
  if (!P.solved && P.statues.every((s) => s.k === s.need)) { P.solved = true; a.setFlag('lens-solved'); a.audio('beam'); a.ctx.engine.shake.add(0.5); }
}
function contexts(a) {
  const out = [];
  if (a.puzzle && !a.puzzle.solved) for (const s of a.puzzle.statues) if (Math.hypot(a.player.x - s.x, a.player.z - s.z) < 1.9 && s.busy <= 0) out.push({ prio: 3, label: 'TURN LAMP', verb: 'action', run: () => { s.k = (s.k + 1) % 8; s.busy = 1.2; a.player.doMelee('pickup', 0.6); a.audio('stoneGrind'); } });
  return out;
}
export const abbey = {
  id: 'abbey', name: 'THE ABBEY', mapId: 'abbey', mood: 'abbey', music: 'explore', chapter: 2, startYaw: Math.PI,
  theme: { floors: { '.': 'flagstones', ',': 'ruined-mosaic', '_': 'flagstones', ':': 'flagstones' }, walls: { '#': 'dry-stone' }, cover: 'dry-stone', coverTop: 'mist' },
  tannoyLines: TANNOY_LINES.slice(12, 14), dress: ['candles', 'column', 'tombstone', 'pew', 'brazier'], lamps: [], build: { noWaterWalls: true }, water: false, backdrop: false,
  scripts: [main], contexts,
  setup(a) { setupPuzzle(a); for (const m of a.level.markers.v || []) { /* trapdoor sits under the arcade */ }
    for (const m of [[14, 14], [29, 14], [22, 25], [21, 3], [5, 20], [38, 20]]) { const [x, z] = cp(a, m[0], m[1]); a.ctx.lights.request({ position: [x, 2.2, z], color: 0xffa860, intensity: 9, radius: 9, flicker: 'torch' }); }
    a.hudExtra = () => {
      const q = a.level.markers.q?.[0]; if (q && a.puzzle && !a.puzzle.solved && Math.hypot(a.player.x - q.x, a.player.z - q.z) < 3.2) {
        ui.panel(ui.W / 2 - 80, 40, 160, 44, { fill: 'ink' }); ui.text(ui.W / 2, 46, 'FLOOR MOSAIC', { align: 'center', color: 'sand' });
        a.puzzle.statues.forEach((s, i) => { ui.text(ui.W / 2 - 60 + i * 56, 62, `LAMP ${i + 1}: ` + ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'][s.need], { color: 'white' }); });
      }
      if (a.crypt) { ui.text(ui.W / 2, 10, 'HITS ' + a.crypt.hits + '/2', { align: 'center', color: a.crypt.hits ? 'red' : 'mist' }); ui.text(ui.W / 2, 22, a.crypt.whackCd > 0 ? 'WHACK ' + Math.ceil(a.crypt.whackCd) : 'WHACK READY', { align: 'center', color: 'mist' }); }
    };
  },
  fixed(a, dt) { puzzleStep(a, dt); cryptStep(a, dt); },
  cameraTargetOverride(a) { return a.control === 'dame' && a.dame ? { x: a.dame.x, z: a.dame.z } : null; },
  botPlan(a) {
    const P = (c, r, o = {}) => ({ x: a.level.wx(c), z: a.level.wz(r), ...o });
    const st = (i, c, r) => P(c, r, { r: 0.6, act: true, hold: (x) => x.puzzle && x.puzzle.statues[i] && x.puzzle.statues[i].k !== x.puzzle.statues[i].need, skip: (x) => !x.puzzle });
    return [P(22, 36), st(2, 22, 26), st(0, 14, 15), st(1, 29, 15), P(22, 24, { r: 2, hold: (x) => !x.hasFlag('lens-solved') }), P(10, 20, { r: 1.0, hold: (x) => !x.crypt && !x.cryptDone }), P(3, 33, { r: 1.2, act: true, hold: (x) => !!x.crypt && !x.crypt.lever }),
      P(8, 31, { r: 2, hold: (x) => !x.cryptDone }), P(22, 29, { r: 2 }), P(22, 20, { r: 2 }), P(34, 20, { r: 1.2 }), P(40, 18, { r: 2, shop: true }), P(30, 20, { r: 2 }), P(22, 12, { r: 2 }), P(22, 3, { r: 1 })];
  },
};
