import { launch } from './lib.mjs';
import { S, adv, press, newGame, newProfile, doMorning, playDay, sleepThrough } from './drive.mjs';
const b = await launch({}); const p = await newGame(b); const t0 = Date.now();
await newProfile(p); let s = await doMorning(p); console.log('day1 plan', s.screen, 'age', s.wobbleAge);
for (let day = 1; day <= 6; day++) {
  s = await playDay(p, { log: (...a) => console.log('  ', ...a) }); s = await S(p); console.log('day', day, 'screen', s.screen, 'step', s.step, 'tilt', s.tilt, 'marbles', s.marbles, 'errs', JSON.stringify(s.errors), ((Date.now() - t0) / 1000).toFixed(0) + 's');
  if (s.screen === 'ending') { for (let i = 0; i < 60; i++) { const q = await S(p); if (q.speech) await press(p, 'ok'); await adv(p, 2); const r = await S(p); if (r.screen === 'island') break; } s = await S(p); console.log('after ending', s.screen, 'levelled', s.levelled, 'day', s.day); break; }
  await sleepThrough(p); s = await doMorning(p); console.log('morning', s.day, s.screen, 'age', s.wobbleAge);
}
console.log(p.errs.join('\n')); await b.close();
