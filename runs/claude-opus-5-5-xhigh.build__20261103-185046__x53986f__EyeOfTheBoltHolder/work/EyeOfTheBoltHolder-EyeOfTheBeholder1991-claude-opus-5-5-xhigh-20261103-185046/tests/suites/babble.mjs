// babble: plan() is deterministic; vowels pick formants; punctuation pauses and lifts; profiles differ
import { fresh } from '../util.mjs';
export async function run(t) {
  const { B } = await fresh(), V = B.Voices, p = B.VOICE_PROFILES.tamsin;
  const a = V.plan('Took you long enough!', p), b = V.plan('Took you long enough!', p);
  t.check('the same line plans the same', JSON.stringify(a) === JSON.stringify(b) && a.length > 4);
  const o = V.plan('ooo', p)[0], i = V.plan('iii', p)[0]; t.check('vowels pick their formants', o.f1 === 450 && i.f2 === 2300);
  const q = V.plan('Is it?', p), s = V.plan('Is it.', p); t.check('a question rises at its end', q[q.length - 1].f > s[s.length - 1].f);
  const d1 = V.plan('a. b', p), d2 = V.plan('a b', p); t.check('a full stop pauses', d1[d1.length - 1].t > d2[d2.length - 1].t);
  const e = V.plan('Hello there', B.VOICE_PROFILES.eye)[0], n = V.plan('Hello there', B.VOICE_PROFILES.narrator)[0]; t.check('profiles differ', e.f !== n.f);
  t.check('plosives click', V.plan('a ta pa ka', p).some(x => x.noise === 'click'));
  t.check('every speaker has a voice', Object.keys(B.PEOPLE).every(k => V.profile(k).base > 0));
}
