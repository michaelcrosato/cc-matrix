// Other players in a session: visual only. They never touch your physics.
import { makeDoll } from '../art/doll.js';
// Clip names by index: a ghost message carries only the index.
export const GHOST_CLIPS = ['idle', 'breathe', 'holdHat', 'holdSlab', 'squat', 'hipCircle', 'stepL', 'stepR', 'diveReady', 'pike', 'tuck', 'splay', 'cheer', 'flail', 'hop', 'pose_heron', 'pose_pine', 'pose_chair', 'pose_keeper', 'pose_flamingo', 'pose_goodbye', 'pose_umbrella', 'pose_regret'];
export class Ghost {
  constructor(game, player, event) {
    this.game = game; this.player = player; this.doll = makeDoll({ paint: player.color }); this.tag = document.createElement('div'); this.tag.className = 'ghosttag'; this.tag.textContent = player.name; this.tag.style.color = player.color; game.ui.hud.appendChild(this.tag);
    this.x = 0; this.z = 0; this.lx = 0; this.lz = 0; this.tx = 0; this.tz = 0; this.tlx = 0; this.tlz = 0; this.flop = false; this.clip = -1; this.a = -1; this.parent = null; this.seen = 0; this.score = 0;
  }
  attach(event) { if (this.parent === event) return; this.parent = event; this.doll.group.removeFromParent(); if (event) event.group.add(this.doll.group); }
  remove() { this.doll.group.removeFromParent(); this.tag.remove(); }
  apply(m) { this.tx = m.x; this.tz = m.z; this.tlx = m.lx; this.tlz = m.lz; this.a = m.a; this.flopWant = !!m.f; this.score = m.s; this.clipWant = m.c; this.seen = performance.now(); }
  tick(dt, visible) {
    this.doll.group.visible = visible; this.tag.style.display = visible ? '' : 'none'; if (!visible) return;
    const k = 1 - Math.exp(-dt / .15); this.x += (this.tx - this.x) * k; this.z += (this.tz - this.z) * k; this.lx += (this.tlx - this.lx) * k; this.lz += (this.tlz - this.lz) * k;
    const gp = this.parent?.ghostPos ? this.parent.ghostPos(this.x) : [this.x, 0, this.z]; this.doll.group.position.set(gp[0], gp[1], gp[2]); this.doll.setLean(this.lx, this.lz); this.doll.tick(dt);
    if (this.flopWant !== this.flop) { this.flop = this.flopWant; this.doll.rig.play(this.flop ? 'flop' : 'idle', .1); } else if (!this.flop && this.clipWant !== this.clip) { this.clip = this.clipWant; const nm = GHOST_CLIPS[this.clip]; if (nm) this.doll.rig.play(nm, .15); }
    if (this.game.camera && this.parent) { const v = this.doll.group.getWorldPosition(new ThreeVec()); v.y += 1.8; v.project(this.game.camera); this.tag.style.left = `${(v.x * .5 + .5) * 100}%`; this.tag.style.top = `${(-v.y * .5 + .5) * 100}%`; }
  }
}
import { Vector3 as ThreeVec } from 'three/webgpu';
