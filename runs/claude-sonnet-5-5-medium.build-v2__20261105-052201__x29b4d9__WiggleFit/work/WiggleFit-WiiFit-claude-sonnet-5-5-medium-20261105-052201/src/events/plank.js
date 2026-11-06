import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, ball } from '../art/props.js';
import { createWalrus, createGull } from '../art/chars.js';

const TIERS = [{ dur: 30, every: 5, push: [0.2, 0.4], par: 85 }, { dur: 45, every: 4.5, push: [0.2, 0.4], par: 65 }, { dur: 60, every: 4, push: [0.25, 0.45], par: 58 }];
export class Plank extends GameEvent {
  static id = 'plank'; static title = 'Plank & Perch'; static discipline = 'Strength'; static instructor = 'bolster'; static couch = false; static session = false; static music = 'strength'; static palette = 'noon';
  static intro = { line: 'Hold a plank on a low beam. Gary and friends land on you and push the dot. Counter them with your weight.', can: 'You can flail to shake every gull off, for a small penalty.', cant: "You can't stay out of the zone for long: two seconds outside is a belly flop.", prompts: [['move', 'Counter'], ['flail', 'Shake off']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.duration = o.duration || T.dur; this.paletteName = 'noon'; this.music = 'strength'; this.laneGap = 3.6;
    this.makeGround(2.8, 4, '#E8D49A'); for (let i = 0; i < this.lanes.length; i++) this.group.add(box(2.6, 0.12, 0.8, '#B98A52', this.laneX(i), 0.06, 0));
    this.coach = createWalrus(); this.coach.root.position.set(-6.2, 0, -1.5); this.coach.root.scale.setScalar(0.8); this.coach.root.rotation.y = 0.5; this.group.add(this.coach.root); this.cam = { pos: [0, 3.2, 7.5], look: [0, 0.6, 0], fov: 38 };
    this.addDolls({ margin: 0.8, ankleMax: 6 });
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.gulls = []; l.next = 3; l.out = 0; l.inZ = 0; l.n = 0; l.lastSide = 1; l.flop = 0; l.penalty = 0; l.fixedAnim = true; l.stats = { gulls: 0 }; l.rig.play('plank', 0); l.bal.sway = 0.1; l.bal.tremor = 0.04; }
    this.camSnap = true;
  }
  botIntent(lane, dt, it) { const px = lane.gulls.reduce((a, g) => a + g.px, 0), pz = lane.gulls.reduce((a, g) => a + g.pz, 0); const [wx, wz] = lane.bot.steer(-px * 1.4, -pz * 1.4, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; lane.bt = (Math.hypot(lane.bal.cobX, lane.bal.cobZ) > 0.3 / 0.5 * 0.5 ? (lane.bt || 0) + dt : 0); it.flailEdge = lane.bt > 1.2 && lane.bal.leanDeg > 22; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal, T = this.T;
    if (lane.flop > 0) { lane.flop -= dt; if (lane.flop <= 0) { lane.rig.play('plank', 0.2, { force: true }); b.wx = b.wz = 0; } return; }
    if (this.t >= lane.next && lane.gulls.length < 6) { lane.next += T.every; const side = this.r() < 0.7 ? lane.lastSide : -lane.lastSide; lane.lastSide = side; const m = T.push[0] + (T.push[1] - T.push[0]) * this.r(); const g = createGull(); const idx = lane.gulls.length; g.root.position.set(lane.x, 0.2, 0); lane.doll.root.add(g.root); g.root.position.set((idx % 3 - 1) * 0.35, 1.0 + (idx % 2) * 0.2, 0.05); g.root.scale.setScalar(0.7); lane.gulls.push({ g, px: side * m * 0.5, pz: (this.r() - 0.5) * m * 0.4 }); this.game.audio.sfx('squawk'); this.word('SQUAWK', lane.x, 1.8); this.game.bark('bolster', 'gull'); }
    b.pushX = lane.gulls.reduce((a, g) => a + g.px * 5, 0); b.pushZ = lane.gulls.reduce((a, g) => a + g.pz * 5, 0);
    if (it.flailEdge) { for (const g of lane.gulls) g.g.root.removeFromParent(); lane.gulls = []; lane.penalty += 3; this.game.bark('bolster', 'plank'); }
    const d = Math.hypot(b.cobX, b.cobZ); lane.n++; if (d < 0.56) { lane.inZ++; lane.out = 0; } else { lane.out += dt; if (lane.out > 2) { lane.flop = 1.6; lane.out = 0; lane.rig.play('flop', 0.1, { force: true }); this.word('SPLAT', lane.x, 1, 1); this.game.audio.sfx('fall'); for (const g of lane.gulls) g.g.root.removeFromParent(); lane.gulls = []; lane.floorEx++; } }
    lane.stats.gulls = lane.gulls.length; const share = lane.inZ / Math.max(1, lane.n); lane.form = Math.max(0, Math.min(100, 100 * share / (T.par / 100) + 2 * lane.gulls.length - lane.penalty));
  }
  step() { if (this.t >= this.duration) this.finish(); }
  afterRig(lane) { if (lane.bal && lane.rig.curName === 'plank') lane.doll.J.hips.rotation.z -= lane.bal.leanX * 0.8; }
  discInfo() { return { zone: { x: 0, z: 0, r: 0.56, good: true } }; }
  hudInfo(lane) { return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'g', html: `Gulls <b>${lane.gulls ? lane.gulls.length : 0}</b>` }] }; }
  prompts() { return Plank.intro.prompts; }
}
