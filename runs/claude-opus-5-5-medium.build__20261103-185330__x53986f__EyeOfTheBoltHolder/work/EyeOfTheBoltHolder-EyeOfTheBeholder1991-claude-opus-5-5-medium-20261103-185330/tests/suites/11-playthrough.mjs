// playthrough: the walkthrough bot plays New Game to the ending by the real rules on Normal with no cheats, with Veil
// helped, then again with Veil refused (from a floor 3 save). Checkpoints, deeds, pace; a balance report.
import { writeFileSync, mkdirSync } from 'node:fs';
import { kit } from './simkit.mjs';
const SEED = 31, SEED_REFUSE = 31;
export default async check => {
  const { B } = await kit();
  const report = [];
  const play = (o, until, max = 3600) => { B.Bot.start(o); let t = 0; const fl = {}; while (B.Bot.active && t < max && !B.S.over) { const c = B.Bot.step(1 / 120); B.update(1 / 120, c); for (const e of B.drain()) if (e.t === 'ending') fl.ending = true; t += 1 / 120; if (!fl[B.S.floor]) fl[B.S.floor] = { t, lv: B.S.party.members.map(m => m.lvl) }; if (until && until()) break; if (fl.ending) break; } return { t, fl }; };
  for (const m of Object.values(B.CHEATS)) check('cheats are off', m === false);
  B.newState(SEED); B.drain();
  const r = play({ veil: 'help' });
  const S = B.S;
  check('no wipe', !S.over, B.Bot.log.slice(-5).join(' / '));
  check('the bot was never stuck', !B.Bot.stuck, JSON.stringify(B.Bot.stuck));
  check('the ending is reached (✕ at the Stair to the Light)', !!r.fl.ending);
  check('all three deeds are done', Object.keys(S.special).length === 3, JSON.stringify(S.special));
  check('all three secrets were found', S.stats.secrets === 3, S.stats.secrets);
  check('the three wards opened the Undergate', S.wards === 3);
  check('Tamsin, Durgan and Veil (or her ward) came along', S.party.members.some(m => m.npc === 'tamsin') && S.party.members.some(m => m.npc === 'durgan') && (S.party.members.some(m => m.npc === 'veil') || B.countItem('lidlessWard') > 0));
  const lv = f => r.fl[f] ? Math.max(...r.fl[f].lv) : 0;
  check('level pace: about 3 at the end of floor 1', lv('f2') >= 2 && lv('f2') <= 4, lv('f2'));
  check('level pace: about 4 at the end of floor 2', lv('f3') >= 3 && lv('f3') <= 5, lv('f3'));
  check('level pace: 5 or 6 at the boss', lv('f4') >= 4 && lv('f4') <= 7, lv('f4'));
  check('the game takes under 90 minutes of play', S.playTime < 90 * 60);
  report.push('help branch: ' + r.t.toFixed(0) + ' s, kills ' + S.stats.kills + ', potions ' + S.stats.potions + ', rests ' + S.stats.rests + ', deaths ' + S.stats.deaths, 'floors: ' + JSON.stringify(r.fl));
  // the refused branch, from the floor 3 start
  B.newState(SEED_REFUSE); B.drain(); play({ veil: 'refuse' }, () => B.S.floor === 'f3');
  const save = JSON.stringify(B.S); B.S = JSON.parse(save); B.buildRuntime(); B.look();
  const r2 = play({ veil: 'refuse' });
  check('refused branch: Veil stays behind', B.S.flags.veilRefused === 1 && !B.S.party.members.some(m => m.npc === 'veil'));
  check('refused branch: the Barracks way still reaches the iron ward and the ending', !B.S.over && B.S.wards === 3 && !!r2.fl.ending, JSON.stringify({ over: B.S.over, wards: B.S.wards, fl: Object.keys(r2.fl), floor: B.S.floor, i: B.Bot.i, n: B.Bot.plan.length, stuck: B.Bot.stuck }));
  report.push('refuse branch: ' + r2.t.toFixed(0) + ' s, kills ' + B.S.stats.kills + ', over ' + B.S.over);
  // a balance sweep: eight more seeds, both branches, every one must reach the ending with no wipe
  const sweep = [];
  for (const seed of [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008]) {   // (seeds never used while tuning)
    B.newState(seed); B.drain(); const rr = play({ veil: seed % 2 ? 'refuse' : 'help' }); sweep.push(seed + (rr.fl.ending ? ' won' : ' lost on ' + B.S.floor) + ' in ' + rr.t.toFixed(0) + ' s, deaths ' + B.S.stats.deaths + ', potions ' + B.S.stats.potions); check('balance sweep: seed ' + seed + ' reaches the ending', !!rr.fl.ending && !B.S.over, B.S.floor + ' ' + B.Bot.log.slice(-3).join(' / ')); }
  report.push('sweep: ' + sweep.join('; '));
  mkdirSync(new URL('../out/', import.meta.url).pathname, { recursive: true });
  writeFileSync(new URL('../out/balance.txt', import.meta.url).pathname, report.join('\n') + '\n');
};
