// babble: the voice plan is deterministic; vowels pick their formants; punctuation pauses; profiles differ
import { kit } from './simkit.mjs';
export default async check => {
  const { B } = await kit();
  const a = B.babble.plan('Every lock is a promise. I KEEP THEM ALL!', B.VOICES.eye), b = B.babble.plan('Every lock is a promise. I KEEP THEM ALL!', B.VOICES.eye);
  check('the plan is deterministic', JSON.stringify(a) === JSON.stringify(b) && a.length > 10);
  const o = B.babble.plan('o', B.VOICES.narrator)[0]; check('the vowel o picks its formants', Math.round(o.f1) === 450 && Math.round(o.f2) === 800);
  const p = B.babble.plan('a. a', B.VOICES.narrator); check('a full stop pauses', p[1].t - p[0].t >= .15);
  const q = B.babble.plan('ah?', B.VOICES.narrator), q2 = B.babble.plan('ah', B.VOICES.narrator); check('a question rises', q[q.length - 1].f > q2[q2.length - 1].f);
  check('profiles differ', B.babble.plan('hello', B.VOICES.tamsin)[0].f !== B.babble.plan('hello', B.VOICES.durgan)[0].f);
  check('plosives click', B.babble.plan('kaka', B.VOICES.narrator).some(e => e.noise === 'click'));
  check('every speaker has a voice', Object.values(B.SPEAKERS).every(s => B.VOICES[s.voice]));
};
