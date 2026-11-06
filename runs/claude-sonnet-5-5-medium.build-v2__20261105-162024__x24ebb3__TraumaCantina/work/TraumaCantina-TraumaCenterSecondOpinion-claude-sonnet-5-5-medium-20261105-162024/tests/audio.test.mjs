import { renderSyllable, toWav, b64, syllableFor, CAST_VOICES } from '../src/audio/voice.js';
import { renderSound } from '../pixel-engine.js';
import { SFX_DEFS } from '../src/content/sfx.js';
import { SONGS } from '../src/content/songs.js';
export async function run(T) {
  for (let t = 0; t < 3; t++) for (let v = 0; v < 5; v++) for (let o = 0; o < 3; o++) { const a = renderSyllable(t, v, o); let m = 0, bad = 0; for (const x of a) { if (!Number.isFinite(x)) bad++; m = Math.max(m, Math.abs(x)); } T.ok(!bad && m > 0.05 && m <= 1, `syllable ${t}${v}${o} non-silent and finite`); }
  const w = toWav(renderSyllable(0, 0, 0)); T.ok(String.fromCharCode(...w.slice(0, 4)) === 'RIFF' && b64(w).length > 100, 'WAV header + base64');
  for (const [k, d] of Object.entries(SFX_DEFS)) { const a = renderSound(d); let m = 0, bad = 0; for (const x of a) { if (!Number.isFinite(x)) bad++; m = Math.max(m, Math.abs(x)); } T.ok(!bad && m > 0.01, `sfx ${k} non-silent and finite`); }
  T.eq(syllableFor('HELLO', 1, CAST_VOICES.reyes), syllableFor('HELLO', 1, CAST_VOICES.reyes), 'letters pick syllables deterministically');
  T.ok(syllableFor('WHAT?', 0, CAST_VOICES.ilya).pitch > syllableFor('WHAT', 0, CAST_VOICES.ilya).pitch, '? raises pitch');
  for (const [k, s] of Object.entries(SONGS)) { T.ok(s.bpm > 40 && s.order.length >= 4, `song ${k} has bars`); for (const p of Object.values(s.patterns)) { const n = Object.values(p).map((x) => x.split(' ').length); T.ok(new Set(n).size === 1, `song ${k}: equal track lengths`); } }
  T.ok(['title', 'ward', 'or-calm', 'or-tense', 'or-critical', 'boss-introit', 'boss-lacrimosa', 'boss-wrath', 'boss-miserere', 'op10', 'results', 'results-sad', 'credits'].every((k) => SONGS[k]), 'every planned song exists');
}
