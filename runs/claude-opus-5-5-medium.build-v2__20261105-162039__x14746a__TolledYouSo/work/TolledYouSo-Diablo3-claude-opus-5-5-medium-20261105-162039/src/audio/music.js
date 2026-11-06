// Music and spatial effects, through the engine's audio. Music defaults to 10% and returns to it on reset.
import { FLAG_KEY } from '../data/meta.js';
import { LOOPS, SFX } from './sfxdata.js';
import { SONGS } from './songs.js';

export function setupAudio(ctx, storage) {
  const a = ctx.audio;
  for (const [k, d] of Object.entries(SFX)) a.register(k, d);
  // First run: music at 10%. Later runs keep what the player set.
  let first = true;
  try { first = !storage?.getItem(FLAG_KEY); if (first) storage?.setItem(FLAG_KEY, '1'); } catch { first = true; }
  if (first) a.setVolume('music', 0.1);
  const reset = a.resetVolumes.bind(a);
  a.resetVolumes = () => { reset(); a.setVolume('music', 0.1); };
}
export class Music {
  constructor(ctx) { this.ctx = ctx; this.current = null; this.loops = {}; }
  play(id) {
    if (this.current === id) return;
    this.current = id;
    if (!id) { this.ctx.audio.playMusic(null); return; }
    this.ctx.audio.playMusic(SONGS[id], id);
  }
  ambience(kind) {
    const a = this.ctx.audio;
    for (const k of Object.keys(this.loops)) if (k !== kind) { this.loops[k].stop?.(); delete this.loops[k]; }
    if (kind && !this.loops[kind]) this.loops[kind] = a.loop(LOOPS[kind], { volume: 1 });
  }
  stopAll() { this.ctx.audio.playMusic(null); this.current = null; this.ctx.audio.stopLoops(); this.loops = {}; }
}
const lastPlayed = {};
export function playAt(ctx, id, x, z, focus, o = {}) {
  // Quiet with distance, panned by screen side (right on screen is +X -Z).
  let vol = o.volume ?? 1; let pan = 0;
  if (x !== undefined && focus) {
    const dx = x - focus.x; const dz = z - focus.z; const d = Math.hypot(dx, dz);
    if (d > 26) return false;
    vol *= Math.max(0.15, 1 - d / 26);
    pan = Math.max(-1, Math.min(1, ((dx - dz) * 0.707) / 12));
  }
  // Avoid machine-gun stacks of the same sound in the same frame.
  const now = ctx.time; if (lastPlayed[id] === now) return false; lastPlayed[id] = now;
  ctx.audio.play(id, { volume: vol, pan, pitch: o.pitch ?? 0 });
  return true;
}
