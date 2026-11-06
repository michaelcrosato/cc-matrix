// Which tune plays: the hour's, the venue's, your stereo, a festival's. Bell plays the chime first.
import { hourSong, tune } from './composer.js';
import { weatherNow, hourNow } from '../systems/time.js';

export class MusicDirector {
  constructor(g) { this.g = g; this.current = null; this.override = null; this.suspend = 0; }
  /** Force a tune (a scene, a festival) until cleared with null. */
  setOverride(id) { this.override = id; this.refresh(); }
  wanted() {
    const g = this.g;
    if (this.override) return this.override;
    if (g.mode === 'title') return 'title';
    if (g.mode === 'attract') return g.attract.tune ?? 'title';
    const fest = g.festivals?.music?.();
    if (fest) return fest;
    const p = g.place;
    if (p?.music) { const m = typeof p.music === 'function' ? p.music(g) : p.music; if (m) return m; }
    const w = g.world;
    const h = hourNow(w);
    const k = weatherNow(g);
    const v = k === 'rain' || k === 'storm' ? 'rain' : k === 'snow' ? 'snow' : '';
    return `hour:${h}:${v}`;
  }
  refresh() {
    if (this.suspend > 0) return;
    const id = this.wanted();
    if (id === this.current) return;
    this.current = id;
    const a = this.g.ctx.audio;
    if (id === 'silence') { a.playMusic(null); return; }
    let song;
    if (id.startsWith('hour:')) { const [, h, v] = id.split(':'); song = hourSong(Number(h), v || null); } else song = tune(id);
    a.playMusic(song, id);
  }
  update(dt) { if (this.suspend > 0) { this.suspend -= dt; if (this.suspend <= 0) this.refresh(); } else if (this.g.ctx.time % 2 < dt) this.refresh(); }
}
