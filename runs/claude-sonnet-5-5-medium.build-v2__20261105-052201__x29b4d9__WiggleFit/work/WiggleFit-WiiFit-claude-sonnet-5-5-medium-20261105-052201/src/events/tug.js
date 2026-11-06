import * as THREE from 'three/webgpu';
import { GameEvent } from './base.js';
import { box, cyl, ball } from '../art/props.js';
import { createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { gauss } from '../core/rng.js';

const TIERS = [{ their: 0.35, ease: 0 }, { their: 0.5, ease: 12 }, { their: 0.54, ease: 9 }];
export class Tug extends GameEvent {
  static id = 'tug'; static title = 'Tug of Peace'; static discipline = 'Strength'; static instructor = 'bolster'; static couch = true; static session = false; static music = 'strength'; static palette = 'golden';
  static intro = { line: 'Best of three pulls. When the caller shouts Heave, squeeze both feet and lean back. Lean back too far when they ease off and you sit down hard.', can: 'You can choose how far to lean: that choice is the game.', cant: "You can't win by leaning at the wrong time: timing counts as much as strength.", prompts: [['both', 'Squeeze'], ['move', 'Lean back (down)'], ['flail', 'Flail']] };
  constructor(game, o) {
    super(game, o); const T = this.T = TIERS[this.tier]; this.duration = o.duration || 150; this.paletteName = 'golden'; this.music = 'strength'; this.laneGap = 4.2;
    this.makeGround(2.8, 4, '#EBD9A0'); this.cam = { pos: [3.5, 3, 9], look: [0, 1.0, -1], fov: 38 };
    this.addDolls({ margin: 0.8, ankleMax: 6 });
    this.opp = []; for (const l of this.lanes) { const d = createDoll({ paint: 6, hat: 1 }); d.root.position.set(l.x, 0, -3.4); const rig = new Rig(d); rig.play('tug', 0); this.group.add(d.root); this.opp.push({ d, rig }); this.group.add(cyl(0.05, 4.4, '#C99A62', l.x, 1.0, -1.5, 8).rotateX(Math.PI / 2)); }
    this.callT = 0; this.callN = 0; this.nextCall = 2;
    for (const l of this.lanes) { if (l.kind === 'ghost') continue; l.rope = 0; l.won = 0; l.lost = 0; l.power = 0; l.pressT = -9; l.leanBack = 0; l.ease = 0; l.easeAt = T.ease || 1e9; l.nextEase = T.ease ? T.ease : 1e9; l.sit = 0; l.fixedAnim = true; l.callPow = 0; l.stats = { pulls: 0 }; l.rig.play('tug', 0); l.marker = box(0.3, 0.3, 0.05, '#E8443A', l.x, 1.4, -1.5); this.group.add(l.marker); l.bal.sway = 0.05; l.bal.tremor = 0.03; }
    this.camSnap = true;
  }
  botIntent(lane, dt, it) { it.wx = 0; it.wz = 0.9 * (lane.ease > 0 ? 0.6 : 1); it.L = it.R = 0; it.footL = it.footR = false; if (this.callPend && !lane.botDone && this.t - this.callT >= (lane.botAt ?? 0.05)) { it.L = it.R = 1; lane.pressT = this.t; lane.botDone = true; } it.flailEdge = lane.sitWarn > 0 && lane.bal.leanDeg > 12; }
  laneWish(lane, it) { const b = lane.bal; lane.leanBack = Math.max(0, Math.min(1, b.cobZ)); b.setWish(it.wx * 0.3, Math.max(-1, Math.min(1, it.wz))); }
  laneFixed(lane, it, dt) {
    if (this.phase !== 'play') return; const b = lane.bal; const both = it.L > 0.5 && it.R > 0.5; if (both && !lane.bothPrev) lane.pressT = this.t; lane.bothPrev = both;
    const their = this.T.their; const ext = 0.1 + 0.3 * their; b.pushZ = -ext * (lane.ease > 0 ? 0 : 1);
    if (this.callPend && !lane.judged) { const err = Math.abs(lane.pressT - this.callT); if (this.t - this.callT > 0.5) { lane.judged = true; const timing = Math.max(0, 1 - err / 0.3); const share = lane.leanBack; const mine = timing * share; const theirs = their * (0.8 + this.r() * 0.4); lane.rope = Math.max(-1, Math.min(1, lane.rope + (mine - theirs) * 0.33)); lane.stats.pulls = lane.won; this.word('HEAVE', lane.x, 2); this.game.audio.sfx('thud'); } }
    if (this.T.ease && this.t >= lane.nextEase && lane.ease <= 0) { lane.ease = 0.8; lane.nextEase = this.t + this.T.ease; if (lane.leanBack > 0.72) { lane.sitWarn = 0.5; b.shove(0, -3.2, 0.5); this.word('WHOA', lane.x, 2); } }
    if (lane.ease > 0) lane.ease -= dt; if (lane.sitWarn > 0) lane.sitWarn -= dt;
    if (Math.abs(lane.rope) >= 1) { if (lane.rope > 0) { lane.won++; } else { lane.lost++; } lane.rope = 0; this.word(lane.rope >= 0 && lane.won > lane.lost ? 'PULL WON' : 'PULL LOST', lane.x, 2.4); this.game.audio.sfx('bell'); }
    lane.form = Math.max(0, Math.min(100, 40 + 30 * lane.won - 5 * lane.falls));
  }
  step() {
    if (this.t >= this.nextCall) { this.callT = this.t; this.callPend = true; this.nextCall += 1.2; this.callN++; this.game.audio.sfx('tick'); for (const l of this.lanes) if (l.bal) { l.judged = false; l.botDone = false; l.botAt = l.bot ? 0.02 + Math.abs(l.bot.gaussT()) : 0; } this.game.bark('bolster', 'tug'); }
    if (this.callPend && this.t - this.callT > 0.5) this.callPend = false;
    if (this.lanes.every((l) => l.kind === 'ghost' || l.won >= 2 || l.lost >= 2) || this.t >= this.duration) { for (const l of this.lanes) if (l.bal) l.form = Math.max(0, Math.min(100, 40 + 30 * l.won - 5 * l.falls)); this.finish(); }
  }
  frameExtra() { this.lanes.forEach((l, i) => { if (!l.marker) return; l.marker.position.z = -1.5 + l.rope * 1.2; this.opp[i].d.root.position.z = -3.4 + l.rope * 1.2; this.opp[i].rig.update(1 / 60); }); }
  discInfo(l) { return { marks: this.callPend ? [{ x: 0, z: 0.9, r: 0.15 }] : [] }; } banner() { return this.callPend ? 'HEAVE!' : ''; }
  hudInfo(lane) { return { score: lane.form || 0, left: null, widgets: [{ id: 'w', html: `Pulls won <b>${lane.won ?? 0}</b> · lost ${lane.lost ?? 0}` }, { id: 'r', html: `Rope <span class="meter"><i style="width:${Math.round(((lane.rope ?? 0) + 1) * 50)}%;background:#F5B700"></i></span>` }] }; }
  prompts() { return Tug.intro.prompts; }
}
