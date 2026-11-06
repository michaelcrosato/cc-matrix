// The Old Bell plays the Village Chime on the hour.
import { chimeSong } from '../audio/composer.js';
export const chime = {
  hourly(g, h) { if (g.place !== 'town' || g.mode === 'title') { return; } g.sfx('bell'); g.town.bellSwing = 0.5; const w = g.world; g.ctx.audio.playMusic(chimeSong(w.chime), 'chime'); g.musicName = ''; g.after(2.8, () => g.updateMusic(true)); },
};
