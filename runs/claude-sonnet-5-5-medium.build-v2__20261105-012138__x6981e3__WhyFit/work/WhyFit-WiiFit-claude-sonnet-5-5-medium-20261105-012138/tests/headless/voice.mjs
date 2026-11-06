// Test 12: syllabify is pure, stable and deterministic; same word, same syllables; a question rises; speakers differ.
import { syllabify, meanPitch, SPEAKERS, voiceDuration, renderVoice } from '../../src/audio/voice.js';
export default function (t) {
  const a = syllabify('Thank you. I have written that down.', 'ounce'), b = syllabify('Thank you. I have written that down.', 'ounce');
  t.eq(a, b, 'syllabify is stable');
  const w1 = syllabify('wobble', 'coach').map((s) => `${s.vowel}${s.cons}`), w2 = syllabify('Wobble', 'coach').map((s) => `${s.vowel}${s.cons}`);
  t.eq(w1, w2, 'the same word gives the same syllables');
  const q = syllabify('Is that close?', 'ounce'), d = syllabify('Is that close.', 'ounce');
  t.ok(q[q.length - 1].f0 > d[d.length - 1].f0, 'a question rises at the end');
  t.ok(syllabify('Hello there!', 'ounce').at(-1).f0 > syllabify('Hello there.', 'ounce').at(-1).f0, 'an exclamation lifts');
  t.ok(meanPitch(a) > meanPitch(syllabify('Thank you. I have written that down.', 'coach')), "Ounce's mean pitch exceeds Coach's");
  t.ok(syllabify('Hello there', 'june').every((s) => s.f0 === SPEAKERS.june.f0), 'June has no contour at all');
  t.ok(a.every((s) => s.charIndex >= 0 && s.dur > 0), 'syllables carry charIndex and duration');
  t.ok(voiceDuration(a) > 1, 'a sentence takes time');
  const slow = voiceDuration(syllabify('Hold... please.', 'coach')), fast = voiceDuration(syllabify('Hold please.', 'coach')); t.ok(slow > fast, 'ellipsis slows');
  t.ok(syllabify('', 'ounce').length === 0, 'empty text, no syllables');
  // declination
  const long = syllabify('One two three four five six seven eight.', 'ounce'); t.ok(long.at(-1).f0 < long[0].f0, 'declination across a sentence');
  t.ok(typeof renderVoice === 'function', 'renderVoice exists');
}
