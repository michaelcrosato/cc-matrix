// Everything you hear is written here as SoundDef data. No audio files anywhere.
import { spatialize } from '../../pixel-engine.js';
import { THREE } from '../../pixel-engine.js';
import { clamp } from '../core/rng.js';
const _o = new THREE.Vector3(), _d = new THREE.Vector3();
const n = (freq, decay, volume, extra = {}) => ({ wave: 'noise', freq, decay, volume, attack: 0.001, ...extra });
const crack = (hiss, thump, tail, vol = 0.8) => ({ wave: 'noise', freq: hiss, freqEnd: hiss * 0.4, attack: 0.001, decay: 0.05, volume: vol, layers: [{ wave: 'sine', freq: thump, freqEnd: thump * 0.4, attack: 0.001, decay: 0.12, volume: vol * 0.9 }, { wave: 'noise', freq: 2400, freqEnd: 500, attack: 0.002, decay: tail, volume: vol * 0.4, delay: 0.02 }, { wave: 'square', duty: 0.25, freq: thump * 2.1, freqEnd: thump * 0.8, decay: 0.04, volume: vol * 0.25 }] });
const far = (hiss, thump, tail, vol = 0.5) => ({ wave: 'noise', freq: hiss * 0.25, freqEnd: hiss * 0.12, attack: 0.004, decay: 0.08, volume: vol, layers: [{ wave: 'sine', freq: thump * 0.7, freqEnd: thump * 0.35, decay: 0.2, volume: vol }, { wave: 'noise', freq: 600, freqEnd: 180, decay: tail * 1.5, volume: vol * 0.45, delay: 0.05 }] });
const metal = (freq, decay, volume, extra = {}) => ({ wave: 'square', duty: 0.125, freq, freqEnd: freq * 0.9, attack: 0.001, decay, volume, layers: [{ wave: 'noise', freq: 7000, decay: decay * 0.5, volume: volume * 0.7 }, { wave: 'triangle', freq: freq * 2.76, decay: decay * 0.8, volume: volume * 0.3 }], ...extra });
const step = (hiss, low, vol) => ({ wave: 'noise', freq: hiss, freqEnd: hiss * 0.5, attack: 0.002, decay: 0.07, volume: vol, layers: [{ wave: 'sine', freq: low, freqEnd: low * 0.6, decay: 0.06, volume: vol * 0.8 }] });
export const SOUNDS = {
  // Guns: crack, thump, tail. A distant muffled variant for when someone else is shooting.
  'gun-tractor': crack(5200, 170, 0.2, 0.8), 'gun-tractor-far': far(5200, 170, 0.2),
  'gun-m38': crack(4200, 210, 0.16, 0.8), 'gun-m38-far': far(4200, 210, 0.16),
  'gun-mule': crack(3000, 110, 0.34, 1), 'gun-mule-far': far(3000, 110, 0.34),
  'gun-empire': crack(6200, 130, 0.5, 1), 'gun-empire-far': far(6200, 130, 0.5),
  'gun-mg': crack(4800, 140, 0.14, 0.75), 'gun-mg-far': far(4800, 140, 0.14),
  'gun-flare': { wave: 'noise', freq: 1500, freqEnd: 400, attack: 0.002, decay: 0.08, volume: 0.6, layers: [{ wave: 'sine', freq: 300, freqEnd: 120, decay: 0.1, volume: 0.6 }, { wave: 'noise', freq: 8000, attack: 0.03, sustain: 0.1, decay: 0.3, volume: 0.15, delay: 0.05 }] },
  'flare-hiss': { wave: 'noise', freq: 9000, freqEnd: 5000, attack: 0.02, sustain: 0.5, decay: 0.8, volume: 0.3 },
  'gun-tube': { wave: 'noise', freq: 1300, freqEnd: 240, attack: 0.003, sustain: 0.1, decay: 0.5, volume: 0.8, layers: [{ wave: 'sine', freq: 120, freqEnd: 45, decay: 0.3, volume: 0.9 }] },
  'flamer-start': { wave: 'noise', freq: 3000, freqEnd: 800, attack: 0.01, decay: 0.3, volume: 0.6, layers: [{ wave: 'sine', freq: 90, decay: 0.2, volume: 0.5 }] },
  'flamer-loop': { wave: 'noise', freq: 1800, attack: 0.02, sustain: 0.9, decay: 0.02, volume: 0.55, vibrato: { depth: 3, rate: 13 }, layers: [{ wave: 'noise', freq: 500, attack: 0.02, sustain: 0.9, decay: 0.02, volume: 0.5 }, { wave: 'saw', freq: 62, attack: 0.02, sustain: 0.9, decay: 0.02, volume: 0.12 }] },
  'gun-jam': { wave: 'square', duty: 0.125, freq: 1400, freqEnd: 900, decay: 0.03, volume: 0.45, layers: [{ wave: 'noise', freq: 6000, decay: 0.015, volume: 0.35 }] },
  'gun-slap': { wave: 'noise', freq: 2800, freqEnd: 900, decay: 0.05, volume: 0.6, layers: [{ wave: 'sine', freq: 200, freqEnd: 90, decay: 0.05, volume: 0.45 }] },
  'gun-rack': metal(820, 0.05, 0.42, { layers: [{ wave: 'noise', freq: 7000, decay: 0.03, volume: 0.35 }, { wave: 'square', duty: 0.125, freq: 1200, freqEnd: 700, decay: 0.05, volume: 0.32, delay: 0.09 }, { wave: 'noise', freq: 5000, decay: 0.03, volume: 0.28, delay: 0.09 }] }),
  'gun-mag': metal(520, 0.06, 0.36, { layers: [{ wave: 'noise', freq: 3000, decay: 0.04, volume: 0.3 }, { wave: 'square', duty: 0.25, freq: 700, decay: 0.04, volume: 0.28, delay: 0.18 }] }),
  'gun-shell': { wave: 'square', duty: 0.25, freq: 620, freqEnd: 460, decay: 0.04, volume: 0.34, layers: [{ wave: 'noise', freq: 3500, decay: 0.03, volume: 0.25 }, { wave: 'sine', freq: 180, decay: 0.05, volume: 0.25, delay: 0.05 }] },
  'gun-cylinder': { wave: 'square', duty: 0.125, freq: 1700, decay: 0.02, volume: 0.3, layers: [0.1, 0.2, 0.3, 0.42].map((d) => ({ wave: 'square', duty: 0.125, freq: 1500, decay: 0.02, volume: 0.28, delay: d })) },
  'gun-equip': metal(400, 0.05, 0.28), 'gun-rattle': { wave: 'noise', freq: 4000, decay: 0.02, volume: 0.22, layers: [0.04, 0.09].map((d) => ({ wave: 'square', duty: 0.125, freq: 900, decay: 0.015, volume: 0.2, delay: d })) },
  'gun-apart': { wave: 'square', duty: 0.25, freq: 340, freqEnd: 120, decay: 0.18, volume: 0.5, layers: [{ wave: 'noise', freq: 5000, decay: 0.12, volume: 0.5 }, { wave: 'square', duty: 0.125, freq: 900, decay: 0.05, volume: 0.35, delay: 0.16 }, { wave: 'square', duty: 0.125, freq: 680, decay: 0.05, volume: 0.32, delay: 0.3 }, { wave: 'square', duty: 0.125, freq: 500, decay: 0.04, volume: 0.25, delay: 0.46 }] },
  'bottle-smash': { wave: 'noise', freq: 9500, freqEnd: 3000, decay: 0.2, volume: 0.6, layers: [{ wave: 'square', duty: 0.125, freq: 2500, freqEnd: 1800, decay: 0.08, volume: 0.25 }, { wave: 'noise', freq: 1600, attack: 0.05, sustain: 0.1, decay: 0.5, volume: 0.42, delay: 0.05 }] },
  explosion: { wave: 'noise', freq: 900, freqEnd: 120, attack: 0.002, sustain: 0.04, decay: 0.7, volume: 1, layers: [{ wave: 'sine', freq: 90, freqEnd: 30, attack: 0.002, sustain: 0.05, decay: 0.55, volume: 1 }, { wave: 'noise', freq: 3000, decay: 0.08, volume: 0.6 }] },
  'explosion-big': { wave: 'noise', freq: 600, freqEnd: 70, attack: 0.002, sustain: 0.1, decay: 1.5, volume: 1, layers: [{ wave: 'sine', freq: 70, freqEnd: 22, attack: 0.002, sustain: 0.1, decay: 1.2, volume: 1 }, { wave: 'noise', freq: 2400, decay: 0.15, volume: 0.6 }] },
  ricochet: { wave: 'sine', freq: 2100, freqEnd: 760, decay: 0.28, volume: 0.28, vibrato: { depth: 1.5, rate: 40 } },
  'bullet-whip': { wave: 'noise', freq: 7000, freqEnd: 2200, attack: 0.03, decay: 0.08, volume: 0.42 },
  'hit-flesh': { wave: 'noise', freq: 900, freqEnd: 240, decay: 0.07, volume: 0.6, layers: [{ wave: 'sine', freq: 130, freqEnd: 70, decay: 0.08, volume: 0.6 }] },
  'hit-metal': { wave: 'square', duty: 0.125, freq: 2300, freqEnd: 1500, decay: 0.09, volume: 0.32, layers: [{ wave: 'noise', freq: 7000, decay: 0.04, volume: 0.4 }, { wave: 'sine', freq: 3400, decay: 0.12, volume: 0.15 }] },
  'hit-marker': { wave: 'square', duty: 0.25, freq: 2000, decay: 0.025, volume: 0.25 },
  'knife-swing': { wave: 'noise', freq: 4000, freqEnd: 1500, attack: 0.03, decay: 0.09, volume: 0.45 },
  whoosh: { wave: 'noise', freq: 1600, freqEnd: 700, attack: 0.05, decay: 0.14, volume: 0.4 },
  land: { wave: 'sine', freq: 140, freqEnd: 60, decay: 0.09, volume: 0.5, layers: [{ wave: 'noise', freq: 1400, freqEnd: 500, decay: 0.07, volume: 0.2 }] },
  crash: { wave: 'noise', freq: 2400, freqEnd: 300, decay: 0.4, volume: 0.9, layers: [{ wave: 'square', duty: 0.25, freq: 240, freqEnd: 80, decay: 0.25, volume: 0.5 }, { wave: 'square', duty: 0.125, freq: 900, decay: 0.08, volume: 0.4, delay: 0.1 }] },
  // Feet.
  'step-dirt': step(1500, 95, 0.4), 'step-grass': step(3800, 80, 0.3), 'step-road': step(1100, 130, 0.42), 'step-wood': { wave: 'sine', freq: 190, freqEnd: 120, decay: 0.07, volume: 0.5, layers: [{ wave: 'noise', freq: 1000, decay: 0.03, volume: 0.25 }] }, 'step-water': { wave: 'noise', freq: 2400, freqEnd: 800, attack: 0.01, decay: 0.15, volume: 0.42, layers: [{ wave: 'sine', freq: 300, freqEnd: 180, attack: 0.01, decay: 0.08, volume: 0.25 }] },
  // Body.
  breath: { wave: 'noise', freq: 1700, freqEnd: 900, attack: 0.12, sustain: 0.1, decay: 0.3, volume: 0.22 },
  heartbeat: { wave: 'sine', freq: 62, freqEnd: 44, decay: 0.11, volume: 0.9, layers: [{ wave: 'sine', freq: 56, freqEnd: 40, decay: 0.11, volume: 0.65, delay: 0.2 }] },
  syrette: { wave: 'noise', freq: 8200, freqEnd: 5200, attack: 0.03, sustain: 0.28, decay: 0.2, volume: 0.32, layers: [{ wave: 'sine', freq: 500, freqEnd: 300, decay: 0.02, volume: 0.2 }] },
  pliers: { wave: 'square', duty: 0.125, freq: 900, freqEnd: 500, decay: 0.05, volume: 0.32, layers: [{ wave: 'noise', freq: 1800, decay: 0.22, volume: 0.3, delay: 0.02 }] },
  'knife-dig': { wave: 'noise', freq: 1100, freqEnd: 600, attack: 0.02, sustain: 0.1, decay: 0.16, volume: 0.42, layers: [{ wave: 'sine', freq: 180, freqEnd: 100, decay: 0.16, volume: 0.38 }] },
  'finger-snap': { wave: 'noise', freq: 6000, freqEnd: 1200, decay: 0.02, volume: 0.9, layers: [{ wave: 'square', duty: 0.125, freq: 1200, decay: 0.012, volume: 0.6 }] },
  lighter: { wave: 'square', duty: 0.125, freq: 2600, decay: 0.012, volume: 0.32, layers: [{ wave: 'noise', freq: 5000, attack: 0.02, sustain: 0.5, decay: 0.2, volume: 0.12, delay: 0.05 }] },
  cauterise: { wave: 'noise', freq: 9000, freqEnd: 6000, attack: 0.03, sustain: 0.8, decay: 0.3, volume: 0.32 },
  'tablet-bottle': { wave: 'noise', freq: 7500, decay: 0.02, volume: 0.28, layers: [0.05, 0.11, 0.18, 0.28].map((d) => ({ wave: 'square', duty: 0.125, freq: 2500, decay: 0.012, volume: 0.22, delay: d })) },
  'tablet-swallow': { wave: 'sine', freq: 220, freqEnd: 90, attack: 0.02, decay: 0.2, volume: 0.42 },
  grunt: { wave: 'saw', freq: 165, freqEnd: 105, attack: 0.01, decay: 0.16, volume: 0.42, layers: [{ wave: 'sine', freq: 620, freqEnd: 480, decay: 0.12, volume: 0.15 }, { wave: 'noise', freq: 1200, decay: 0.08, volume: 0.15 }] },
  'grunt-big': { wave: 'saw', freq: 200, freqEnd: 85, attack: 0.02, sustain: 0.05, decay: 0.32, volume: 0.5, layers: [{ wave: 'sine', freq: 760, freqEnd: 420, sustain: 0.05, decay: 0.28, volume: 0.2 }, { wave: 'noise', freq: 1500, decay: 0.2, volume: 0.2 }] },
  'fever-onset': { wave: 'sine', freq: 300, freqEnd: 180, attack: 0.5, sustain: 0.6, decay: 1, volume: 0.25, vibrato: { depth: 1.5, rate: 3 }, layers: [{ wave: 'sine', freq: 307, freqEnd: 184, attack: 0.5, sustain: 0.6, decay: 1, volume: 0.25 }] },
  // Loops.
  'fire-loop': { wave: 'noise', freq: 1100, attack: 0.04, sustain: 1.1, decay: 0.04, volume: 0.6, layers: [{ wave: 'noise', freq: 420, attack: 0.04, sustain: 1.1, decay: 0.04, volume: 0.5 }, ...[0.15, 0.4, 0.62, 0.84, 1.02].map((d) => ({ wave: 'noise', freq: 6500, decay: 0.03, volume: 0.28, delay: d }))] },
  'wind-loop': { wave: 'noise', freq: 620, freqEnd: 820, attack: 0.3, sustain: 1.6, decay: 0.3, volume: 0.32, vibrato: { depth: 2, rate: 0.7 } },
  'insects-loop': { wave: 'sine', freq: 3600, attack: 0.01, sustain: 0.9, decay: 0.01, volume: 0.05, vibrato: { depth: 1.5, rate: 34 }, layers: [{ wave: 'sine', freq: 4300, attack: 0.1, sustain: 0.6, decay: 0.1, volume: 0.04, vibrato: { depth: 1, rate: 22 }, delay: 0.1 }] },
  'birds-loop': { wave: 'sine', freq: 2600, freqEnd: 3200, attack: 0.01, decay: 0.08, volume: 0.1, arp: [0, 4, 7, 4], arpRate: 0.06, layers: [{ wave: 'sine', freq: 2100, freqEnd: 2400, decay: 0.1, volume: 0.09, delay: 0.9 }, { wave: 'sine', freq: 5100, decay: 0.8, attack: 0.3, volume: 0.03, vibrato: { depth: 1, rate: 40 }, delay: 0.3 }, { wave: 'sine', freq: 3000, freqEnd: 2500, decay: 0.08, volume: 0.09, arp: [0, 3, 0, 5], arpRate: 0.05, delay: 1.4 }] },
  'rain-loop': { wave: 'noise', freq: 7000, attack: 0.1, sustain: 1.6, decay: 0.1, volume: 0.5, layers: [{ wave: 'noise', freq: 2200, attack: 0.1, sustain: 1.6, decay: 0.1, volume: 0.34 }] },
  'engine-loop': { wave: 'saw', freq: 58, attack: 0.02, sustain: 0.8, decay: 0.02, volume: 0.42, layers: [{ wave: 'square', duty: 0.25, freq: 116, attack: 0.02, sustain: 0.8, decay: 0.02, volume: 0.14 }, { wave: 'noise', freq: 480, attack: 0.02, sustain: 0.8, decay: 0.02, volume: 0.14 }] },
  // Trucks and rails.
  gravel: { wave: 'noise', freq: 2100, decay: 0.1, volume: 0.28 }, brakes: { wave: 'noise', freq: 5200, freqEnd: 2800, attack: 0.03, sustain: 0.2, decay: 0.2, volume: 0.22 },
  door: { wave: 'noise', freq: 900, freqEnd: 300, decay: 0.09, volume: 0.5, layers: [{ wave: 'square', duty: 0.25, freq: 260, freqEnd: 160, decay: 0.08, volume: 0.32 }] },
  horn: { wave: 'square', duty: 0.5, freq: 330, attack: 0.02, sustain: 0.32, decay: 0.05, volume: 0.32, layers: [{ wave: 'square', duty: 0.5, freq: 415, attack: 0.02, sustain: 0.32, decay: 0.05, volume: 0.25 }] },
  'starter-cough': { wave: 'noise', freq: 620, decay: 0.09, volume: 0.45, layers: [0.14, 0.3, 0.52, 0.7, 1].map((d, i) => ({ wave: 'saw', freq: 50 + i * 3, decay: 0.09, volume: 0.42, delay: d })) },
  wrench: { wave: 'square', duty: 0.125, freq: 1100, freqEnd: 800, decay: 0.05, volume: 0.32, layers: [{ wave: 'noise', freq: 4000, decay: 0.03, volume: 0.28 }] },
  'train-clack': { wave: 'noise', freq: 2000, decay: 0.04, volume: 0.5, layers: [{ wave: 'sine', freq: 110, decay: 0.07, volume: 0.5 }, { wave: 'noise', freq: 2000, decay: 0.04, volume: 0.4, delay: 0.14 }, { wave: 'sine', freq: 100, decay: 0.07, volume: 0.4, delay: 0.14 }] },
  'train-whistle': { wave: 'square', duty: 0.5, freq: 523, freqEnd: 494, attack: 0.08, sustain: 0.9, decay: 0.35, volume: 0.22, layers: [{ wave: 'square', duty: 0.5, freq: 659, freqEnd: 622, attack: 0.08, sustain: 0.9, decay: 0.35, volume: 0.2 }, { wave: 'noise', freq: 6000, attack: 0.1, sustain: 0.9, decay: 0.3, volume: 0.08 }] },
  // Hand things.
  'map-paper': { wave: 'noise', freq: 5200, freqEnd: 2200, attack: 0.03, decay: 0.2, volume: 0.32, layers: [{ wave: 'noise', freq: 3200, decay: 0.06, volume: 0.22, delay: 0.14 }] },
  'tracker-beep': { wave: 'square', duty: 0.5, freq: 1760, decay: 0.05, volume: 0.28 }, 'tracker-near': { wave: 'square', duty: 0.5, freq: 2640, decay: 0.05, volume: 0.32 },
  'radio-squelch': { wave: 'noise', freq: 9000, attack: 0.002, sustain: 0.08, decay: 0.05, volume: 0.28, layers: [{ wave: 'square', duty: 0.125, freq: 1300, decay: 0.03, volume: 0.15, delay: 0.14 }] },
  // Sky.
  thunder: { wave: 'noise', freq: 400, freqEnd: 70, attack: 0.03, sustain: 0.25, decay: 2.3, volume: 0.9, layers: [{ wave: 'sine', freq: 56, freqEnd: 28, attack: 0.05, sustain: 0.3, decay: 1.8, volume: 0.8 }] },
  'distant-fight': { wave: 'noise', freq: 800, freqEnd: 260, decay: 0.09, volume: 0.32, layers: [0.14, 0.26, 0.42, 0.9, 1.05, 1.18].map((d) => ({ wave: 'noise', freq: 620, freqEnd: 200, decay: 0.08, volume: 0.28, delay: d })) },
  // UI.
  'ui-move': { wave: 'triangle', freq: 660, decay: 0.03, volume: 0.18 }, 'ui-confirm': { wave: 'triangle', freq: 440, decay: 0.07, volume: 0.3, arp: [0, 5, 12], arpRate: 0.04 }, 'ui-back': { wave: 'triangle', freq: 440, freqEnd: 300, decay: 0.07, volume: 0.22 },
  'ui-stone': { wave: 'triangle', freq: 880, decay: 0.15, volume: 0.28, arp: [0, 7, 12], arpRate: 0.05 },
  'note-scratch': { wave: 'noise', freq: 6200, freqEnd: 4200, attack: 0.01, decay: 0.07, volume: 0.2, layers: [0.08, 0.17, 0.3].map((d) => ({ wave: 'noise', freq: 6000, decay: 0.04, volume: 0.16, delay: d })) },
};
export class Sfx {
  loops = new Map();
  constructor(game) { this.game = game; }
  build(ctx) { for (const [k, v] of Object.entries(SOUNDS)) ctx.audio.register(k, v); this.audio = ctx.audio; }
  play(name, o) { return this.audio.play(name, o); }
  /** A sound at a place in the world: gain and pan from where your head is. */
  at(name, x, z, { max = 120, volume = 1, pitch, ref = 3 } = {}) {
    const g = this.game;
    const s = spatialize(g.listener(), [x, g.camPos.y, z], { max, ref });
    if (s.gain <= 0.01) return false;
    return this.audio.play(name, { volume: volume * s.gain, pan: s.pan, pitch });
  }
  /** Is the land or a wall between your ears and this place? Asked rarely, for loops. */
  blocked(x, z) {
    const g = this.game, cam = g.camPos, y = g.world.heightAt(x, z) + 2.5;
    _o.set(cam.x, cam.y, cam.z); _d.set(x - cam.x, y - cam.y, z - cam.z);
    const l = _d.length();
    if (l < 3) return false;
    _d.multiplyScalar(1 / l);
    const hit = g.ctx.physics.castRay(_o, _d, l, [], g.player.cc?.body);
    return !!hit && hit.distance < l - 3;
  }
  startLoop(key, name, o) { if (!this.loops.has(key)) this.loops.set(key, this.audio.loop(name, o)); return this.loops.get(key); }
  stopLoop(key) { const v = this.loops.get(key); if (v) { v.stop(); this.loops.delete(key); } }
}
