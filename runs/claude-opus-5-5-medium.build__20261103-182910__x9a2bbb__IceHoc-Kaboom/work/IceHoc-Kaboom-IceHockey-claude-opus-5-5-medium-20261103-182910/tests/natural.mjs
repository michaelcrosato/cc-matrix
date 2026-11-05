// Natural play: each story chapter played in full by the bot (the human's skater driven through game.input, as a
// player would), with no warps, no forced events and default tuning. Reports which chapter events happened on their own.
import { load } from './lib.mjs';
import { botStep } from './bot.mjs';
const COUNT = ['fight_end', 'goal', 'hit'];
const SIG = { 1: e => e.type === 'goal' && e.kind === 'onetimer' && e.team === 0, 2: e => e.type === 'thin_ice_break' || e.type === 'kaboom_start', 3: e => e.type === 'fight_end', 4: e => e.type === 'mascot_down' || e.type === 'shootout_end', 5: e => e.type === 'boost_start' || e.type === 'organ_boost' || e.type === 'twister' };
const res = {};
for (let n = 1; n <= 5; n++) for (const seed of n === 1 ? [1, 2, 3] : [1, 2]) {
  const { game, G } = load(''); game.advance(.2);
  G.Story.cur = { n, attempt: seed, choice: { tactic: 'grit', lou: 'loose', bear: 'hunt', doris: 'early' } };
  const cfg = G.Story.config(n, { onOver: () => {}, intros: false }); game.go('match', cfg, { fade: 0 }); game.advance(.1);
  const M = G.M, all = []; G.Bus.on('*', e => all.push(e)); let i = 0;
  while (!M.finished && i++ < 30 * 60 * 14) { botStep(G, game); if (M.phase === 'intermission') game.input.tap('deke'); if (M.phase === 'replay') game.input.tap('confirm'); game.advance(1 / 30); }
  const seen = [...new Set(all.filter(SIG[n]).map(e => e.type + (e.kind ? ':' + e.kind : '')))];
  (res[n] = res[n] || []).push({ seed, finished: !!M.finished, score: M.score.join('-'), seen, fights: all.filter(e => e.type === 'fight_end').length, bigHits: all.filter(e => e.type === 'hit' && e.big).length, onetimers: all.filter(e => e.type === 'goal' && e.kind === 'onetimer').length, errors: game.errors.length });
}
const NAMES = { 1: 'the Muskrats earn the one-timer star through play within 3 attempts (stars persist across retries)', 2: 'thin ice breaking or KABOOM', 3: 'a fight', 4: 'Polar Pete knocked down or the Shootout Showcase', 5: 'the boss set pieces (Golden Twister, Gilded Boost, Doris\'s organ)' };
for (const n in res) { const ok = res[n].some(r => r.seen.length) && res[n].every(r => r.finished && !r.errors); console.log((ok ? 'PASS' : 'FAIL') + ' [natural] chapter ' + n + ' in unforced play: ' + NAMES[n] + ' happens ' + JSON.stringify(res[n])); }
