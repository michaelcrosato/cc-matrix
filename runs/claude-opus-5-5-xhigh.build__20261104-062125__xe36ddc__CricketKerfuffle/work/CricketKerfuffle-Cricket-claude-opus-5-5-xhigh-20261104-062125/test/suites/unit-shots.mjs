import { load } from '../lib.mjs';
export async function run(check) {
  const { K } = load(), rs = K.resolveShot;
  const rows = [['shot', 0, 'full', 0, 'straightDrive'], ['shot', 50, 'full', 6, 'coverDrive'], ['shot', -50, 'full', -4, 'onDrive'], ['shot', -100, 'good', -6, 'flick'], ['shot', -160, 'full', -6, 'glance'], ['shot', 50, 'good', 6, 'punch'], ['shot', -90, 'short', 0, 'pull'], ['shot', 100, 'short', 10, 'cut'], ['shot', 150, 'good', 8, 'lateCut'],
    ['loft', 0, 'full', 0, 'loftStraight'], ['loft', 50, 'full', 6, 'loftCover'], ['loft', -70, 'good', -4, 'slog'], ['loft', -100, 'short', 0, 'hook'], ['loft', 90, 'short', 10, 'upperCut'], ['loft', 170, 'good', 0, 'scoop'], ['loft', 0, 'yorker', 0, 'helicopter'], ['block', null, 'good', 0, 'forwardDefence'], ['block', 20, 'short', 0, 'backDefence']];
  for (const [b, sec, len, line, want] of rows) { const got = rs(b, sec, len, line); check('resolver: ' + b + ' ' + sec + ' ' + len + ' -> ' + want, got === want, got); }
  check('a neutral stick picks the natural shot (full, off side -> cover drive)', rs('shot', null, 'full', 8) === 'coverDrive');
  const w = { perfect: .04, good: .085, ok: .15 }, gr = K.Batting.gradeOf;
  check('delta 0 is PERFECT', gr(0, w) === 'perfect'); check('delta 60 ms is GOOD', gr(.06, w) === 'good'); check('delta -100 ms is EARLY', gr(-.1, w) === 'early'); check('delta +120 ms is LATE', gr(.12, w) === 'late'); check('a press 200 ms early misses', gr(-.2, w) === 'miss');
}
