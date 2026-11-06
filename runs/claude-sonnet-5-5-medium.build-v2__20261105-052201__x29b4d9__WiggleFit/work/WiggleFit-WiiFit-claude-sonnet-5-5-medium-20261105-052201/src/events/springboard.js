import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, disc, ball } from '../art/props.js';
import { createGull } from '../art/chars.js';
import { gauss } from '../core/rng.js';
import { tuning } from '../data/tuning.js';

const TOWERS = [5, 7, 9];
export class Springboard extends GameEvent {
  static id = 'springboard'; static title = 'Springboard'; static discipline = 'Balance Play'; static instructor = 'trudy'; static couch = true; static session = true; static music = 'balance'; static palette = 'noon';
  static intro = { line: 'Pump the board by squeezing both feet as it goes down. Hop near the top to launch. In the air, steer the spin; hold Hop to tuck.', can: 'You can win two ways: a clean entry (Grace) or a perfect belly flop (Splash).', cant: "You can't fall off: the water is the only way down.", prompts: [['both', 'Pump'], ['hop', 'Launch / Tuck'], ['move', 'Spin']] };
  constructor(game, o) {
    super(game, o); this.noBal = true; this.tower = TOWERS[this.tier]; this.dives = 3; this.diveI = 0; this.duration = o.duration || (o.session ? 50 : 70); this.paletteName = 'noon'; this.music = 'balance'; this.laneGap = 4;
    for (let i = 0; i < this.lanes.length; i++) { const x = this.laneX(i); this.group.add(box(1.4, this.tower, 1.4, '#E8443A', x - 1.2, this.tower / 2 - 0.5, 0), box(2.8, 0.15, 1, '#F5B700', x, this.tower - 0.35, 0)); this.group.add(disc(10, 0.1, '#16A8B0', x, 0, 0)); }
    this.cam = { pos: [0, this.tower * 0.5 + 1, 14 + this.tower], look: [0, this.tower * 0.5 + 1.8, 0], fov: 38 }; this.gull = createGull(); this.gull.root.position.set(5, this.tower + 2, -2); this.group.add(this.gull.root);
    this.addDolls({}); this.noBal = true;
    for (const l of this.lanes) { if (!l.doll) continue; l.st = 'pump'; l.y = 0; l.vy = 0; l.bounce = 0.3; l.pumpT = 0; l.pump = 0; l.x0 = l.x; l.pos = new THREE.Vector3(l.x, this.tower, 0); l.rot = 0; l.spin = 0; l.vel = new THREE.Vector3(); l.best = []; l.splash = null; l.fixedAnim = true; l.stats = { dive: 0 }; l.rig.play('diveReady', 0); l.pumpLast = 0; l.air = 0; l.result = ''; l.tuck = false; l.pumpPrev = 0; l.rings = []; }
    this.camSnap = true; this.slow = 1;
  }
  w0() { return 2 * Math.PI / 0.9; }
  botIntent(lane, dt, it) {
    const sk = lane.bot.skill; it.hop = false; it.hopEdge = false; it.L = it.R = 0;
    if (lane.st === 'pump') { const down = lane.vy < 0; const jit = Math.sin(this.t * 2.1 + lane.id) * sk.timing * 6; it.L = it.R = (down ? 1 : 0); if (lane.pumpT > 3.2 + lane.id * 0.3 && lane.y > 0.08 && lane.vy > 0 && Math.abs(lane.vy) > 0.5) it.hopEdge = true; }
    if (lane.st === 'air') { lane.flop = lane.flop ?? (this.r() < 0.55); const want = lane.flop ? Math.PI * 0.5 : Math.PI; // bot picks a belly flop or a dive
      it.wx = 0; it.wz = 0; const target = lane.flop ? 0 : 0; const ang = lane.rot; const need = (lane.flop ? (0.5 * Math.PI) : Math.PI) - ((ang % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); lane.botDirT = (lane.botDirT || 0) + dt;
      const t = lane.air; const timeLeft = (lane.tFall || 1.6) - t; if (lane.flop) { const cur = ((lane.rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); const goal = 0.5 * Math.PI + 0.0; const ahead = timeLeft * (lane.spin || 0); const err = (goal - cur - ahead * 0); it.wz = (cur < goal - 0.2) ? -1 : 0; } else { const cur = ((lane.rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); it.wz = (cur > 0.25 && cur < Math.PI * 1.9) ? -0.6 : 0; } }
  }
  laneFixed(lane, it, dt) {
    if (!lane.doll || lane.kind === 'ghost') return; const s = dt * this.slow;
    if (this.phase !== 'play' || lane.done) { return; }
    if (lane.st === 'pump') {
      const w = this.w0(), z = 0.035; const squeeze = lane.kind === 'local' && lane.dev === 'kbm' ? (it.L > 0.5 && it.R > 0.5 ? 1 : 0) : Math.min(it.L, it.R);
      const pumping = squeeze > 0.4 && lane.vy < 0; const ay = -w * w * lane.y - 2 * z * w * lane.vy - (pumping ? tuning.boardGain : 0) + (lane.pumpT < 0.3 ? 4 : 0) * 0;
      lane.vy += ay * s; lane.y += lane.vy * s; lane.pumpT += s; if (lane.pumpT < 0.5) lane.vy += 6 * s; if (pumping && !lane.pumping) { this.game.audio.sfx('tick'); } lane.pumping = pumping;
      if (it.hopEdge) { const up = Math.max(3, lane.vy); lane.vy0 = up; lane.st = 'air'; lane.air = 0; lane.pos.set(lane.x, this.tower + lane.y - 0.3, 0); lane.vel.set(0.4 * 0, up, 0); lane.rot = 0; lane.spin = 0; lane.rig.play('hop', 0.05, { force: true }); this.game.audio.sfx('spring'); lane.flop = undefined; lane.tFall = null; }
      lane.stats.speed = lane.vy;
    } else if (lane.st === 'air') {
      const g = tuning.gravity; lane.air += s; lane.vel.y -= g * s; lane.pos.addScaledVector(lane.vel, s); lane.vel.x += 0; const maxSpin = tuning.airTorque * (it.hop ? 1.8 : 1); lane.tuck = it.hop; const want = it.wz * maxSpin; lane.spin += (want - lane.spin) * Math.min(1, s * 9); lane.rot += lane.spin * s; lane.pos.x += it.wx * 1.5 * s;
      if (lane.tuck) lane.rig.play('tuck', 0.1); else lane.rig.play('diveReady', 0.1);
      if (lane.pos.y <= 0.1) this.enter(lane);
    } else if (lane.st === 'water') { lane.wt += s; if (lane.wt > 2.4) { lane.dive++; if (lane.dive >= this.dives) { lane.done = true; lane.st = 'done'; } else { lane.st = 'pump'; lane.y = 0; lane.vy = 0; lane.pumpT = 0; lane.rig.play('diveReady', 0.2, { force: true }); lane.flopRes = null; lane.splashM && (lane.splashM.visible = false); this.slow = 1; } } }
    lane.stats.dive = lane.dive ?? 0;
  }
  enter(lane) {
    const a = ((lane.rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); // 0 = feet down, PI = head down, PI/2 = belly flop (front flat)
    const toDeg = 180 / Math.PI; const feet = Math.min(a, 2 * Math.PI - a) * toDeg, head = Math.abs(a - Math.PI) * toDeg, flop = Math.abs(a - Math.PI / 2) * toDeg; const clean = Math.min(feet, head);
    const height = this.tower, mult = 1 + (height - 5) / 10; let grace = clean <= 12 ? 100 * (1 - clean / 12) * mult : 0, splash = flop <= 20 ? 100 * (1 - flop / 20) * mult : 0; const score = Math.max(grace, splash);
    lane.dive = lane.dive ?? 0; lane.best.push(score); lane.res = splash > grace && splash > 0 ? 'SPLASH!' : grace > 0 ? 'GRACE' : 'Technically a Dive'; lane.st = 'water'; lane.wt = 0; lane.score = score; const top2 = [...lane.best].sort((x, y) => y - x).slice(0, 2); lane.form = Math.min(100, (top2.reduce((x, y) => x + y, 0) / (2 * 100 * (1 + (height - 5) / 10))) * 100 * 1.0); lane.score = top2.reduce((x, y) => x + y, 0);
    const big = splash > 0; this.word(lane.res, lane.x, 2, 1); this.game.audio.sfx('splash', big ? 1.5 : 0.4); this.game.rumble(lane, big ? 0.9 : 0.3, 300); lane.splashAt = lane.pos.x; lane.splashBig = big; if (big) { this.slow = 0.35; this.game.audio.sfx('squawk'); this.word('SQUAWK', lane.x + 3, this.tower + 2, 0.5); this.gull.root.position.y = this.tower + 2; this.gullFall = 1; }
    lane.pos.y = -0.3; lane.vel.set(0, 0, 0);
  }
  step() { if (this.lanes.every((l) => l.kind === 'ghost' || l.done) || this.t >= this.duration) { for (const l of this.lanes) if (l.best && l.best.length) { const top2 = [...l.best].sort((x, y) => y - x).slice(0, 2); l.form = Math.min(100, top2.reduce((x, y) => x + y, 0) / (2 * 100 * (1 + (this.tower - 5) / 10)) * 100); } this.finish(); } }
  frameExtra() {
    for (const l of this.lanes) { if (!l.doll || l.kind === 'ghost' && !l.pos) continue; const d = l.doll.root; if (l.st === 'pump' || l.st === undefined) { d.position.set(l.x, this.tower - 0.35 + l.y, 0); d.rotation.set(0, 0, 0); } else if (l.st === 'air') { d.position.copy(l.pos); d.rotation.set(l.rot, 0, 0); d.position.y = l.pos.y - 0.75 * Math.cos(l.rot) * 0 ; } else if (l.st === 'water' || l.st === 'done') { d.position.set(l.pos.x, Math.max(-1.2, -0.5 - l.wt * 0.3 + Math.sin(l.wt * 3) * 0.1), 0); if (l.wt < 1.5) d.rotation.set(l.rot, 0, 0); else d.position.y = -0.2 + Math.sin(l.wt * 4) * 0.05; }
      if (l.rig) l.rig.update(1 / 60);
      if (l.splashBig && l.wt !== undefined && l.wt < 1.5) { if (!l.splashM) { l.splashM = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 1, 12), this.game.mat('#C8F4FF')); this.group.add(l.splashM); } l.splashM.visible = true; l.splashM.position.set(l.splashAt ?? l.x, 2 * Math.sin(Math.min(1, l.wt / 0.5) * Math.PI / 2) , 0); l.splashM.scale.set(1, 1 + 5 * Math.min(1, l.wt * 2), 1); } else if (l.splashM) l.splashM.visible = false; }
    if (this.gullFall) { this.gull.root.position.y -= 0.05; this.gull.root.rotation.z += 0.2; if (this.gull.root.position.y < 0) this.gullFall = 0; } else this.gull.root.position.x = 5 + Math.sin(this.time) * 0.5;
    const l0 = this.lanes[0]; if (l0 && l0.st === 'air') { this.cam.pos[1] = Math.max(2, l0.pos.y * 0.7 + 1.5); this.cam.look[1] = Math.max(1, l0.pos.y * 0.8); } else if (l0) { this.cam.pos[1] = this.tower * 0.5 + 1; this.cam.look[1] = this.tower * 0.5 + 1.8; }
  }
  hudInfo(lane) { return { score: lane.score || 0, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'd', html: `Dive <b>${Math.min(this.dives, (lane.dive ?? 0) + 1)}</b> / ${this.dives}` }, { id: 'r', html: lane.st === 'water' ? lane.res : lane.st === 'pump' ? `Board speed ${(lane.vy || 0).toFixed(1)}` : 'Steer the spin' }] }; }
  discInfo() { return {}; } banner() { return ''; }
  prompts() { return Springboard.intro.prompts; }
}
