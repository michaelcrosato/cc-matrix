import { h } from '../ui/dom.js';
import { MAP } from '../art/island.js';
import { line } from '../data/dialogue.js';
import { TITLE, RESORT, MEDALS } from '../data/config.js';
import * as THREE from 'three/webgpu';
import { refreshJarDisplay } from './jar.js';

const CREDITS = [
  [TITLE, RESORT], ['Head of Alignment', 'Trudy'], ['Stillness', 'Ms. Stillwater'], ['Strength and Cardio', 'Coach Bolster'],
  ['Guests', 'Gentle Margaret, Retired Kevin, Both Sandras, Unsteady Paul, Young Gerald'], ['Gull', 'Gary (uncredited)'],
  ['Everything rolling downhill', 'The oranges'], ['Thank you for attending', 'It was noted'],
];
const _v = new THREE.Vector3();

/** The bubble centres for the first time. Then the slow pan over everything you straightened. */
export class EndingMode {
  constructor(game) { this.game = game; this.name = 'ending'; this.canPause = false; this.t = 0; this.stage = 'level'; }
  enter() {
    const g = this.game, p = g.save.profile;
    g.ui.clear();
    g.setIsland('home');
    if (p) { p.levelled = true; g.save.write(); }
    g.phys.setRest(0); g.phys.restNow = 0; g.phys.snapTilt();
    g.palette.set('golden', 0.5);
    g.audio.stopMusic(0.2);
    g.audio.setTilt(0);
    refreshJarDisplay(g);
    const trudy = g.art.trudy;
    trudy.root.position.set(1.5, 0, -6);
    trudy.feel(0);
    g.phys.setPosition(1.5, -3);
    this.shot = 'trudy';
    this.frameCam(true);
    this.handle = g.scripts.run(this.flow());
  }
  frameCam(snap) {
    const g = this.game, art = g.art;
    art.group.updateWorldMatrix(true, false);
    if (this.shot === 'trudy') {
      _v.set(1.5, 0.5, -6).applyMatrix4(art.group.matrixWorld);
      g.rig.shot(_v.x, _v.y + 0.45, _v.z + 3.1, _v.x, _v.y + 0.05, _v.z, { fov: 30, snap, rate: 2 });
    } else {
      const a = this.t * 0.12;
      const R = 40;
      g.rig.shot(Math.sin(a) * R, 12 + Math.sin(a * 0.6) * 4, Math.cos(a) * R, 0, 3, -2, { fov: 38, snap, rate: 2.2 });
    }
  }
  *flow() {
    const g = this.game, art = g.art;
    yield 1.2;
    // Silence. She has only ever seen the world at nine degrees.
    art.trudy.rig.once('gasp');
    yield* g.say('trudy', 'ending_1');
    yield 0.8;
    yield* g.say('trudy', 'ending_2');
    yield 0.6;
    // The marbles flare, the lighthouse lights, and the credits roll.
    this.stage = 'flare';
    this.shot = 'pan';
    g.audio.sting('ending');
    art.lightGlow.intensity = 40;
    art.lampMat.color.set(0xFFFFFF);
    const lh = MAP.lighthouse;
    g.fx.confetti(lh.x, 12, lh.z, 200, [0xE8443A, 0xF5B700, 0x2CB5A0, 0x5AA9E6, 0xFFF3DC], 12);
    // Every marble you earned goes up out of the jar, in its medal's colour.
    art.group.updateWorldMatrix(true, false);
    _v.set(MAP.jar.x, 2.6, MAP.jar.z).applyMatrix4(art.group.matrixWorld);
    this.marbleBurst = MEDALS.map((m) => m.colour);
    g.fx.burst(_v.x, _v.y, _v.z, 240, { speed: 7, up: 16, size: 0.5, life: 3.4, colours: this.marbleBurst });
    g.rig.shake(0.05);
    g.palette.set('dusk', 8);
    yield 2.6;
    g.audio.music('level');
    this.stage = 'credits';
    let i = 0;
    const scr = g.ui.only({ name: 'credits', passive: true, build: (s) => { this.credEl = h('div', { style: 'margin-top:14rem;text-align:center' }); s.el.append(this.credEl); } });
    for (const [a, b] of CREDITS) {
      this.credEl.innerHTML = '';
      this.credEl.append(h('div.h2', a), h('div.tag', { style: 'display:inline-block;font-size:4rem' }, b));
      yield 2.6;
      i++;
    }
    g.ui.close(scr);
    this.shot = 'trudy';
    g.palette.set('dawn', 4);
    this.stage = 'after';
    yield 1;
    yield* g.say('trudy', 'ending_3');
    yield* g.say('trudy', 'ending_4');
    this.stage = 'done';
    const p = g.save.profile;
    if (p) {
      // Save the levelled state and carry on into Maintenance days.
      if (p.today.day <= 5) g.programme.nextDay();
    }
    art.lightGlow.intensity = 0;
    return i;
  }
  fixed(dt) {
    const g = this.game;
    this.t += dt;
    g.stepIsland(dt, 0);
    if (this.handle && this.handle.done && !this.left) {
      this.left = true;
      g.go(() => g.flow.toIsland({ morning: true }));
    }
  }
  frame(dt) {
    const g = this.game;
    g.syncIsland(dt);
    g.art.trudy.feel(0);
    g.art.trudy.update(dt);
    this.frameCam(false);
  }
  exit() {
    const g = this.game;
    if (this.handle) this.handle.cancel();
    g.ui.clear();
    g.speech.clear();
  }
}
export { line };
