import * as THREE from 'three/webgpu';
import { RAPIER, groundGroups } from '../physics/world.js';
import { GameEvent } from './base.js';
import { box, cyl, disc } from '../art/props.js';
import { gauss } from '../core/rng.js';
import { tuning } from '../data/tuning.js';
import { toon } from '../render/renderer.js';

const BANDS = { L: [3.5, 5], M: [6.5, 8], S: [9.5, 11] }; const COL = { L: '#3B82F6', M: '#F5B700', S: '#E8443A' };
const TIERS = [{ mix: 'LMS', decay: 0.11 }, { mix: 'LMMS', decay: 0.13 }, { mix: 'LLMMSS', decay: 0.16 }];
export class Plates extends GameEvent {
  static id = 'plates'; static title = 'Plate Spinners'; static discipline = 'Cardio'; static instructor = 'bolster'; static couch = true; static session = true; static music = 'cardio'; static palette = 'golden';
  static intro = { line: 'Circle the stick to drive the hoop. On keys, alternate A and D: each press is half a turn. Keep every plate in its speed band.', can: 'You can change speed to feed different plates.', cant: "You can't fall in this one. Plates fall, you don't.", prompts: [['move', 'Circle'], ['hop', '']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.duration = o.duration || 60; this.paletteName = 'golden'; this.music = 'cardio'; this.makeGround(2.8, 5, '#6FBF6A'); this.laneGap = 5.5; this.cam = { pos: [0, 5.5, 8.6], look: [0, 1.0, 0], fov: 38 };
    this.addDolls({ margin: 0.8, ankleMax: 6 }); this.noFall = true;
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.noFall = true; l.hoop = 0; l.wMeas = 0; l.ang = null; l.tapT = []; l.tapRate = 0; l.hoopAng = 0; l.alive = 0; l.total = 0; l.crashes = 0; l.stats = { crashes: 0 };
      l.plates = [...T.mix].map((k, i) => { const a = (i / T.mix.length) * Math.PI * 2 + 0.4; const px = l.x + Math.cos(a) * 2.2, pz = Math.sin(a) * 2.2; const pole = cyl(0.04, 1.8, '#9A6B3F', px, 0.9, pz, 6); const plate = new THREE.Group(); plate.position.set(px, 1.9, pz); plate.add(cyl(0.45, 0.05, COL[k], 0, 0, 0, 20), cyl(0.12, 0.08, '#FFFFFF', 0, 0.04, 0, 10)); this.group.add(pole, plate); return { k, e: 0.7, plate, pole, x: px, z: pz, dead: 0, shards: [], ang: 0, a }; });
      l.hoopM = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 28), toon('#FF9F80')); l.hoopM.rotation.x = Math.PI / 2; l.hoopM.position.y = 0.8; l.doll.root.add(l.hoopM); l.fixedAnim = true; l.rig.play('hip', 0); }
    this.camSnap = true;
  }
  botIntent(lane, dt, it) {
    const bot = lane.bot; lane.botT = (lane.botT || 0) + dt; let low = null; for (const p of lane.plates) if (!p.dead && (!low || p.e < low.e)) low = p;
    const cur = lane.botPlate; const curP = cur && !cur.dead ? cur : null;
    if (!curP || ((curP.e > 0.92 || (low && low.e < 0.3 && low !== curP)) && lane.botT > bot.skill.lag + 0.4)) { if (low && low !== curP) { lane.botPlate = low; const b = BANDS[low.k]; lane.botTgt = (b[0] + b[1]) / 2 + gauss(this.r) * bot.skill.speedErr * 0.5; lane.botT = 0; } }
    lane.botA = (lane.botA || 0) + (lane.botTgt || 4) * dt; it.ax = it.wx = Math.cos(lane.botA); it.az = it.wz = Math.sin(lane.botA); it.flailEdge = false;
  }
  laneWish(lane, it) { lane.bal.setWish(it.wx * 0.25, it.wz * 0.25); }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal;
    // measure hoop speed
    let target = 0;
    if (lane.kind === 'local' && lane.dev === 'kbm') { if (it.keyA || it.keyD) { const key = it.keyA ? 'A' : 'D'; if (lane.lastKey !== key) { lane.tapT.push(this.t); lane.lastKey = key; } } while (lane.tapT.length > 4) lane.tapT.shift(); if (lane.tapT.length >= 2 && this.t - lane.tapT[lane.tapT.length - 1] < 0.7) { const iv = (lane.tapT[lane.tapT.length - 1] - lane.tapT[0]) / (lane.tapT.length - 1); lane.tapRate = 1 / Math.max(0.08, iv); target = Math.PI * lane.tapRate; } else target = 0; lane.wMeas += ((target || 0) - lane.wMeas) * Math.min(1, dt / 0.12); }
    else { const mag = Math.hypot(it.wx, it.wz); if (mag > 0.5) { const a = Math.atan2(it.wz, it.wx); if (lane.ang !== null) { let d = a - lane.ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const w = Math.abs(d / dt); lane.wMeas += (w - lane.wMeas) * Math.min(1, dt / 0.12); } lane.ang = a; } else { lane.ang = null; lane.wMeas *= Math.max(0, 1 - 3 * dt); } }
    lane.hoop += (lane.wMeas - lane.hoop) * Math.min(1, dt / 0.5); lane.hoopAng += lane.hoop * dt;
    const decay = (this.T.decay / 0.11) * tuning.plateDecay, gain = tuning.plateGain; let alive = 0;
    for (const p of lane.plates) { if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.e = 0.7; p.plate.visible = true; } continue; } const band = BANDS[p.k]; if (lane.hoop >= band[0] && lane.hoop <= band[1]) p.e = Math.min(1, p.e + gain * dt); else p.e -= decay * dt; if (p.e <= 0) { p.e = 0; p.dead = 6; p.plate.visible = false; lane.crashes++; lane.stats.crashes++; this.game.audio.sfx('plateCrash'); this.word('CRASH', p.x, 2.4, p.z); this.shatter(lane, p); this.game.bark('bolster', 'plank'); } else alive++; }
    lane.alive += alive; lane.total += lane.plates.length; const share = lane.alive / Math.max(1, lane.total); lane.form = Math.max(0, 200 * share - 100); lane.score = lane.form;
  }
  shatter(lane, p) { for (let i = 0; i < 6; i++) { const body = this.pw.body(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, 1.9, p.z).setLinvel((this.r() - 0.5) * 3, 2, (this.r() - 0.5) * 3)); this.pw.world.createCollider(RAPIER.ColliderDesc.cuboid(0.15, 0.03, 0.15).setMass(0.05).setCollisionGroups(0x00400001), body); const m = box(0.3, 0.06, 0.3, COL[p.k]); this.group.add(m); p.shards.push({ body, m, t: 0 }); } }
  step() { if (this.t >= this.duration) this.finish(); }
  frameExtra() {
    for (const l of this.lanes) { if (!l.plates) continue; l.hoopM.rotation.z = l.hoopAng; l.hoopM.material.color.set(l.hoop < 5 ? '#3B82F6' : l.hoop < 8.2 ? '#F5B700' : l.hoop < 12 ? '#E8443A' : '#FFFFFF');
      for (const p of l.plates) { p.ang += (p.dead > 0 ? 0 : 6 + (1 - p.e) * 0) * 1 / 60; p.plate.rotation.y = p.ang; const wob = (1 - Math.min(1, p.e / 0.35)) * 0.4; p.plate.rotation.x = Math.sin(this.time * 14) * wob; p.plate.rotation.z = Math.cos(this.time * 12) * wob;
        for (let i = p.shards.length - 1; i >= 0; i--) { const s = p.shards[i]; s.t += 1 / 60; const t = s.body.translation(), q = s.body.rotation(); s.m.position.set(t.x, t.y, t.z); s.m.quaternion.set(q.x, q.y, q.z, q.w); if (s.t > 2.5) { this.pw.removeBody(s.body); s.m.removeFromParent(); p.shards.splice(i, 1); } } } }
  }
  hudInfo(lane) { return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: lane.plates ? [{ id: 'sp', html: `Hoop <b>${lane.hoop.toFixed(1)}</b> rad/s` }, ...lane.plates.map((p, i) => ({ id: 'p' + i, html: `<span class="ring" style="background:${COL[p.k]}"></span> <span class="meter"><i style="width:${Math.round(p.e * 100)}%;background:${COL[p.k]}"></i></span>` }))] : [] }; }
  discInfo() { return {}; }
  prompts() { return [['move', 'Circle the stick'], ['pause', 'Pause']]; }
}
