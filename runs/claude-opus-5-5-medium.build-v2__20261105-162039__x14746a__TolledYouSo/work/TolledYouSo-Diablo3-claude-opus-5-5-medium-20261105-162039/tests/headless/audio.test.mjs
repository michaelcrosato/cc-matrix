// Audio: music 10% first run and after Reset. Every zone starts its song. Speaking a line counts and its syllables are the same each time.
import { ok, eq, guarded } from '../lib.mjs';
import { newHero, start } from './lib.mjs';
import { planLine } from '../../src/audio/voice.js';
import { ZONES } from '../../src/data/zones.js';
await guarded(async () => {
  const { game: g, engine: e } = await start(); eq(e.audio.volume.music, 0.1, 'first run'); e.audio.setVolume('music', 0.5); e.audio.resetVolumes(); eq(e.audio.volume.music, 0.1, 'after reset');
  newHero(g, e, 0, true); e.step(3); const w = g.play.world; g.play.autoDialog = true;
  for (const id of Object.keys(ZONES)) { if (['titlescene', 'session', 'knell1', 'knell2'].includes(id)) continue; g.play.command({ c: 'dev', k: 'boss', zone: id }, 0); e.step(2); eq(w.zone.id, id, `travelled to ${id}`); eq(g.music.current, ZONES[id].song, `${id} starts its song`); }
  const a = planLine('crier', 'Hear ye, hear ye!').steps.map((s) => s.syl).join(); const b = planLine('crier', 'Hear ye, hear ye!').steps.map((s) => s.syl).join(); eq(a, b, 'same line, same syllables'); ok(a.length > 0, 'syllables exist');
  const n0 = g.voice.spoken; g.voice.say('malison', 'EVERY VERSE.'); e.step(120); ok(g.voice.spoken > n0, 'line counted'); ok(g.voice.syllablesPlayed > 0, 'syllables played');
  eq(planLine('malison', 'A').double, true, 'Malison is doubled');
  e.dispose();
});
