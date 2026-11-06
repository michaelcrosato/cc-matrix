import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, disc, ball, cone } from '../art/props.js';
import { createHeron } from '../art/chars.js';

const TIERS = [{ r: 0.15, sw: [0.07, 0.18], sneezes: 2 }, { r: 0.12, sw: [0.1, 0.22], sneezes: 3 }, { r: 0.10, sw: [0.12, 0.26], sneezes: 4 }];
export class StillWater extends GameEvent {
  static id = 'stillWater'; static title = 'Still Water'; static discipline = 'Stillness'; static instructor = 'stillwater'; static couch = false; static session = false; static music = 'stillness'; static palette = 'golden';
  static intro = { line: 'Sit on a lily pad for sixty seconds and stay in the small calm zone. Creatures arrive as the calm fills.', can: 'You can stifle a sneeze by pressing Flail while the warning shows.', cant: "You can't hurry calm: it fills slowly and drains quickly.", prompts: [['move', 'Lean'], ['flail', 'Stifle a sneeze']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.duration = o.duration || 60; this.paletteName = 'golden'; this.music = 'stillness'; this.laneGap = 4;
    this.pw.ground(2 + this.lanes.length * 2, 0.5, 4); this.cam = { pos: [0, 5.5, 8], look: [0, 1, 0], fov: 38 };
    this.group.add(disc(12, 0.1, '#2E9DB8', 0, -0.06, 0)); for (let i = 0; i < 7; i++) this.group.add(disc(0.8 + (i % 3) * 0.3, 0.05, '#5DBB63', Math.cos(i * 0.9) * 5, 0.0, Math.sin(i * 0.9) * 4 - 3));
    this.heron = createHeron(); this.heron.root.position.set(-5, 0, -1); this.heron.root.visible = false; this.group.add(this.heron.root);
    this.addDolls({ maxLean: 14 }); this.sneezeAt = Array.from({ length: T.sneezes }, (_, i) => 10 + (this.duration - 20) * (i + this.r() * 0.6) / T.sneezes);
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.calm = 0; l.peak = 0; l.inZ = 0; l.n = 0; l.warn = 0; l.fixedAnim = true; l.sn = 0; l.stifled = 0; l.pad = disc(1.1, 0.12, '#4DB760', l.x, 0.0, 0); this.group.add(l.pad); l.rings = []; l.rig.play('sit', 0); l.creatures = this.makeCreatures(l); l.stats = { calm: 0 }; }
    this.camSnap = true;
  }
  makeCreatures(l) { const g = new THREE.Group(); g.position.x = l.x; this.group.add(g); const mk = (o) => { o.visible = false; g.add(o); return o; };
    const fly = new THREE.Group(); fly.add(ball(0.04, '#3B82F6'), box(0.3, 0.01, 0.1, '#BFEAFF')); const frog = ball(0.14, '#6BCB5B'); const koi = ball(0.2, '#FF8A1F'); koi.scale.set(1.8, 0.5, 0.8); const turtle = ball(0.35, '#7A6A3A'); turtle.scale.y = 0.5;
    return [mk(fly), mk(frog), mk(koi), mk(turtle)]; }
  botIntent(lane, dt, it) { const [wx, wz] = lane.bot.steer(0, 0, lane.bal.cobX, lane.bal.cobZ, dt, true); it.wx = wx; it.wz = wz; it.flailEdge = lane.warn > 0 && lane.warn < 1.2 - lane.bot.skill.lag && !lane.flailed; if (it.flailEdge) lane.flailed = true; }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal, T = this.T; const k = this.t / this.duration; b.sway = T.sw[0] + (T.sw[1] - T.sw[0]) * k; b.tremor = 0.05;
    const d = Math.hypot(b.cobX, b.cobZ); const inz = d < T.r / 0.5 * 0.5 + 0.0 && d < T.r * 1.9; lane.n++; if (inz) { lane.inZ++; lane.calm = Math.min(1, lane.calm + dt / 30); } else lane.calm = Math.max(0, lane.calm - dt / 8); lane.peak = Math.max(lane.peak, lane.calm);
    if (lane.sn < this.sneezeAt.length && this.t >= this.sneezeAt[lane.sn] && lane.warn <= 0) { lane.warn = 1.2; lane.flailed = false; lane.sn++; this.word('Ah... ah...', lane.x, 2.2); this.game.audio.sfx('gasp'); this.game.bark('stillwater', 'sneeze'); }
    if (lane.warn > 0) { if (it.flailEdge) { lane.warn = 0; lane.stifled++; this.word('Hmph.', lane.x, 2.2); lane.flailed = true; } else { lane.warn -= dt; if (lane.warn <= 0) { b.shove(2.2 * (this.r() < 0.5 ? -1 : 1), 0, 0.3); this.word('ACHOO!', lane.x, 2.2); this.game.audio.sfx('whoosh'); } } }
    const move = Math.hypot(b.leanX - (lane.pl ?? 0), b.leanZ - (lane.pz ?? 0)); lane.pl = b.leanX; lane.pz = b.leanZ; lane.ripple = (lane.ripple || 0) + move * 60;
    lane.form = 100 * 0.5 * (lane.inZ / Math.max(1, lane.n) + lane.calm); lane.score = lane.form; lane.stats.calm = Math.round(lane.calm * 100);
  }
  step() { if (this.t >= this.duration) { for (const l of this.lanes) if (l.bal) l.form = 100 * 0.5 * (l.inZ / Math.max(1, l.n) + l.calm); this.finish(); } }
  frameExtra() { for (const l of this.lanes) { if (!l.creatures) continue; const c = l.calm; l.creatures.forEach((m, i) => { m.visible = c > 0.2 * (i + 1) - 0.0 && (i < 3 || c > 0.6); }); const [fly, frog, koi, turtle] = l.creatures; fly.position.set(Math.sin(this.time * 2) * 0.3, 2.2 + Math.sin(this.time * 5) * 0.1, 0.3); frog.position.set(0, 2.0, 0); koi.position.set(Math.cos(this.time * 0.8) * 2.2, 0.1, Math.sin(this.time * 0.8) * 1.6); turtle.position.set(2.4, 0.15, 1.2); if (l.calm > 0.99) { this.heron.root.visible = true; this.heron.root.position.x = Math.min(l.x - 1.4, this.heron.root.position.x + 0.02); }
      if ((l.ripple || 0) > 4 && l.rings.length < 4) { l.ripple = 0; const r = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 40), new THREE.MeshBasicNodeMaterial({ color: 0xe8fbff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); r.rotation.x = Math.PI / 2; r.position.set(l.x, 0.08, 0); r.userData.t = 0; this.group.add(r); l.rings.push(r); } for (let i = l.rings.length - 1; i >= 0; i--) { const r = l.rings[i]; r.userData.t += 1 / 60; r.scale.setScalar(1 + r.userData.t * 2.5); r.material.opacity = Math.max(0, 0.8 - r.userData.t * 0.5); if (r.userData.t > 1.6) { r.removeFromParent(); l.rings.splice(i, 1); } } } }
  discInfo(lane) { return { zone: { x: 0, z: 0, r: this.T.r * 1.9, good: true } }; }
  hudInfo(lane) { return { score: lane.form, left: Math.max(0, this.duration - this.t), widgets: [{ id: 'c', html: `Calm <span class="meter"><i style="width:${Math.round(lane.calm * 100)}%;background:#22C55E"></i></span>` }, ...(lane.warn > 0 ? [{ id: 's', html: 'Ah... press Flail!' }] : [])] }; }
  prompts() { return StillWater.intro.prompts; }
}
