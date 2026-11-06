import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, disc, ball } from '../art/props.js';
import { gauss } from '../core/rng.js';
import { SEAT_COLORS } from '../data/config.js';

export class Raft extends GameEvent {
  static id = 'raft'; static title = 'Tippy Raft'; static discipline = 'Balance Play'; static instructor = 'bolster'; static couch = true; static session = false; static music = 'balance'; static palette = 'golden';
  static intro = { line: 'Everyone shares one seesaw raft. Walk with the stick, shove with Flail, hop with Hop. Stay on the raft: last doll standing wins the round.', can: 'You can shove the others and ride the swells.', cant: "You can't stand still forever: the raft shrinks and the swells come.", prompts: [['move', 'Walk'], ['flail', 'Shove'], ['hop', 'Hop']] };
  constructor(game, o) {
    super(game, o); this.noBal = true; this.paletteName = 'golden'; this.music = 'balance'; this.duration = o.duration || 200; if (this.lanes.length < 2) { while (this.lanes.length < 4) this.lanes.push(new (this.lanes[0].constructor)(this.lanes.length, { kind: 'bot', skill: ['sharp', 'average', 'clumsy'][this.lanes.length - 1] || 'average', name: ['Kevin', 'Sandra', 'Sandra', 'Paul'][this.lanes.length], paint: this.lanes.length + 4, hat: this.lanes.length, colorIdx: this.lanes.length })); }
    this.R0 = 6; this.R = 6; this.round = 0; this.wins = this.lanes.map(() => 0); this.tx = 0; this.tz = 0; this.vx = 0; this.vz = 0; this.nextSwell = 3; this.swellWarn = 0; this.swell = null; this.roundT = 0; this.roundOver = 0;
    this.raft = new THREE.Group(); this.group.add(this.raft); this.raftMesh = disc(6, 0.4, '#B98A52', 0, -0.2, 0); this.raft.add(this.raftMesh); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; this.raft.add(cyl(0.3, 0.6, '#E8443A', Math.cos(a) * 5.7, 0.1, Math.sin(a) * 5.7, 8)); } this.raft.add(box(0.2, 2.5, 0.2, '#7A4F2A', 0, 1.2, 0), box(1.2, 0.8, 0.05, '#F5B700', 0.6, 2.2, 0)); this.cam = { pos: [0, 12, 12], look: [0, 0, 0], fov: 40 };
    this.addDolls({}); this.noBal = true; for (const l of this.lanes) { l.p = new THREE.Vector3(Math.cos(l.id * 1.57 + 0.8) * 3, 0, Math.sin(l.id * 1.57 + 0.8) * 3); l.vel = new THREE.Vector3(); l.out = false; l.shoveCd = 0; l.shoveV = new THREE.Vector3(); l.y = 0; l.vy = 0; l.fixedAnim = true; l.doll.root.parent && this.raft.add(l.doll.root); l.stats = { rounds: 0 }; l.form = 40; if (l.tag) l.tag.visible = false; }
    this.camSnap = true;
  }
  botIntent(lane, dt, it) {
    const p = lane.p; let tx = 0, tz = 0; const hiX = this.tx, hiZ = this.tz; tx = -hiX * 8; tz = -hiZ * 8; let near = null, nd = 9; for (const o of this.lanes) { if (o === lane || o.out) continue; const d = o.p.distanceTo(p); if (d < nd) { nd = d; near = o; } }
    if (near && (lane.bot.skill.lag < 0.4)) { const away = near.p.clone().sub(p); if (nd < 4) { tx += away.x * 0.4; tz += away.z * 0.4; } if (nd < 1.3 && lane.shoveCd <= 0) it.flailEdge = true; }
    const dx = tx - p.x, dz = tz - p.z, m = Math.hypot(dx, dz) || 1; it.wx = dx / m * Math.min(1, m * 0.5); it.wz = dz / m * Math.min(1, m * 0.5); const sw = this.swellWarn > 0 ? 0 : 0; if (lane.p.length() > this.R - 1) { it.wx = -p.x / (p.length() || 1); it.wz = -p.z / (p.length() || 1); }
  }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play' || lane.out || this.roundOver > 0) return; const sp = 3; const slopeX = this.tx * 10, slopeZ = this.tz * 10;
    lane.vel.x += (it.wx * sp - lane.vel.x) * Math.min(1, dt * 8); lane.vel.z += (it.wz * sp - lane.vel.z) * Math.min(1, dt * 8);
    lane.p.x += (lane.vel.x + slopeX + lane.shoveV.x) * dt; lane.p.z += (lane.vel.z + slopeZ + lane.shoveV.z) * dt; lane.shoveV.multiplyScalar(Math.max(0, 1 - 3 * dt)); lane.shoveCd -= dt;
    if (it.hopEdge && lane.y <= 0.001) { lane.vy = 4; this.game.audio.sfx('hop'); } lane.vy -= 9.81 * dt; lane.y = Math.max(0, lane.y + lane.vy * dt); if (lane.y === 0) lane.vy = 0;
    if (it.flailEdge && lane.shoveCd <= 0) { lane.shoveCd = 2; lane.rig.play('flail', 0.05, { force: true }); this.game.audio.sfx('whoosh'); const f = new THREE.Vector3(Math.sin(lane.face ?? 0), 0, Math.cos(lane.face ?? 0)); for (const o of this.lanes) { if (o === lane || o.out) continue; const d = o.p.clone().sub(lane.p); if (d.length() < 1.3) { d.normalize(); o.shoveV.addScaledVector(d, 6); this.word('BONK', o.p.x, 1.8, o.p.z); this.game.audio.sfx('thud'); } } }
    if (Math.hypot(it.wx, it.wz) > 0.1) lane.face = Math.atan2(it.wx, it.wz);
    if (lane.p.length() > this.R + 0.2) { lane.out = true; this.word('SPLOSH!', lane.p.x, 1, lane.p.z); this.game.audio.sfx('splash'); lane.rig.play('flop', 0.05); lane.sink = 0; }
  }
  step() {
    const dt = 1 / 120; this.roundT += dt; this.R = Math.max(2, this.R0 - Math.floor(this.roundT / 12)); this.raftMesh.scale.set(this.R / 6, 1, this.R / 6);
    // tilt: one seesaw
    let sx = 0, sz = 0; for (const l of this.lanes) if (!l.out) { sx += l.p.x; sz += l.p.z; } const K = 6, C = 3.5; const targetX = THREE.MathUtils.clamp(sx / 6 * (14 * Math.PI / 180) / 1, -0.45, 0.45) * 0.5, targetZ = THREE.MathUtils.clamp(sz / 6 * (14 * Math.PI / 180), -0.45, 0.45) * 0.5;
    this.vx += (K * (targetX - this.tx) - C * this.vx) * dt; this.vz += (K * (targetZ - this.tz) - C * this.vz) * dt; this.tx += this.vx * dt; this.tz += this.vz * dt; const lim = 26 * Math.PI / 180; const m = Math.hypot(this.tx, this.tz); if (m > lim) { this.tx *= lim / m; this.tz *= lim / m; }
    this.nextSwell -= dt; if (this.nextSwell <= 0 && !this.swell) { const a = this.r() * Math.PI * 2; this.swell = { a, t: 1 }; this.nextSwell = 6 + this.r() * 2; this.game.audio.sfx('wind'); this.word('SWELL', Math.cos(a) * 5, 1.5, Math.sin(a) * 5); } if (this.swell) { this.swell.t -= dt; if (this.swell.t <= 0) { this.vx += 2.5 * Math.cos(this.swell.a); this.vz += 2.5 * Math.sin(this.swell.a); this.swell = null; } }
    const alive = this.lanes.filter((l) => !l.out);
    if (this.roundOver > 0) { this.roundOver -= dt; if (this.roundOver <= 0) this.nextRound(); } else if (alive.length <= 1 || this.roundT > 90) { const w = alive[0] || this.lanes[0]; this.wins[w.id]++; w.stats.rounds = this.wins[w.id]; this.roundOver = 2; this.word(w.name + ' wins!', 0, 3, 0); this.game.audio.sfx('bell'); this.round++; }
    for (const l of this.lanes) l.form = 40 + 30 * this.wins[l.id];
    if (this.wins.some((w) => w >= 2) || this.round >= 3) { if (this.roundOver <= 0 || this.wins.some((w) => w >= 2)) this.finish(); }
    if (this.t >= this.duration) this.finish();
  }
  nextRound() { if (this.wins.some((w) => w >= 2) || this.round >= 3) return; this.roundT = 0; this.R = this.R0; this.tx = this.tz = this.vx = this.vz = 0; for (const l of this.lanes) { l.out = false; l.p.set(Math.cos(l.id * 1.57 + 0.8) * 3, 0, Math.sin(l.id * 1.57 + 0.8) * 3); l.vel.set(0, 0, 0); l.shoveV.set(0, 0, 0); l.rig.play('idle', 0.1, { force: true }); l.sink = 0; l.y = 0; } }
  frameExtra() {
    this.raft.rotation.set(this.tz, 0, -this.tx);
    for (const l of this.lanes) { const d = l.doll.root; if (l.out) { l.sink = (l.sink || 0) + 1 / 60; d.position.set(l.p.x, Math.max(-3, -l.sink * 2) , l.p.z); } else d.position.set(l.p.x, l.y, l.p.z); d.rotation.set(0, l.face ?? 0, 0); if (!l.out && l.rig.curName !== 'flail' && l.rig.curName !== 'flop') l.rig.play(Math.hypot(l.vel.x, l.vel.z) > 0.5 ? 'walk' : 'idle', 0.2); l.rig.update(1 / 60); }
    const alive = this.lanes.filter((l) => !l.out); }
  hudInfo(lane) { return { score: this.wins[lane.id] * 100, left: null, widgets: [{ id: 'w', html: 'Round ' + Math.min(3, this.round + 1) + ' · ' + this.lanes.map((l, i) => `<span style="color:${l.color}">${this.wins[i]}</span>`).join(' ') }] }; }
  discInfo() { return {}; } prompts() { return Raft.intro.prompts; }
}
