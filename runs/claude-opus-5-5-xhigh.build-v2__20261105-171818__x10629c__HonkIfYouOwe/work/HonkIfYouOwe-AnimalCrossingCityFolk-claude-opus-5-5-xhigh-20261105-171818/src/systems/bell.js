// The Old Bell plays the Village Chime on the hour, at doors and at the finale.
const SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
export const noteOf = (i) => SCALE[((i % 10) + 10) % 10];
export function chimeScene(g, { harmonise = false, step = 0.2 } = {}) {
  return (function* () {
    const notes = g.world.chime;
    const a = g.ctx.audio;
    const bell = g.town?.bellPivot;
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n >= 0) {
        a.play('bellNote', { pitch: noteOf(n) - 5, volume: 0.8 });
        if (harmonise) { a.play('bellNote', { pitch: noteOf(n) - 5 + 4, volume: 0.5 }); a.play('bellNote', { pitch: noteOf(n) - 5 - 5, volume: 0.5 }); }
        if (bell) bell.rotation.z = i % 2 ? 0.28 : -0.28;
      }
      yield step;
    }
    if (bell) bell.rotation.z = 0;
  })();
}
export function playChime(g, opts) {
  g.events.emit('chime', {});
  g.world.flags.chimesHeard = (g.world.flags.chimesHeard ?? 0) + 1;
  g.music.suspend = 3.4;
  g.ctx.audio.playMusic(null);
  g.music.current = null;
  g.scripts.run(chimeScene(g, opts), { hold: false, name: 'chime' });
}
