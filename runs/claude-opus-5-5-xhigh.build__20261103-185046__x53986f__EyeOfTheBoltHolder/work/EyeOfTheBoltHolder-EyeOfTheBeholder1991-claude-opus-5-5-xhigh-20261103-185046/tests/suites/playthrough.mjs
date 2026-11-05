// playthrough: the walkthrough bot plays New Game -> floors 1-4 -> the ending on Normal with no cheats, by the real rules,
// then again from a floor 3 save with Veil refused. It writes tests/out/balance.txt and fails on gross bands only.
import { fresh } from '../util.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const SEED = +(process.env.SEED || 11);
export async function run(t) {
  const { B, game } = await fresh(), dt = 1 / 120, report = [];
  B.newGame({ seed: SEED }); B.beginCampaign();
  const bot = B.Bot.campaign({});
  let tt = 0, floor = null, f3save = null; const per = {}, lv = {}, fights = [], fightAt = { t: null, hp: 0 };
  const hpSum = () => B.S.party.members.reduce((a, m) => a + (m.state === 'ok' ? m.hp : 0), 0);
  try {
    for (; tt < 90 * 60 && !B.S.won && !B.S.over; tt += dt) {
      B.update(dt, bot.tickAll(dt), dt);
      if (B.S.floor !== floor && !B.S.transit) { if (floor) { per[floor] = tt - per[floor + '_t']; lv[floor] = Math.max(...B.S.party.members.map(m => m.lvl)); } floor = B.S.floor; per[floor + '_t'] = tt; if (floor === 'f3' && !f3save) f3save = JSON.stringify(B.serialize()); }
      if (B.S.combat && fightAt.t === null) { fightAt.t = tt; fightAt.hp = hpSum(); } else if (!B.S.combat && fightAt.t !== null) { fights.push([B.S.floor, +(tt - fightAt.t).toFixed(1), fightAt.hp - hpSum()]); fightAt.t = null; }
    }
  } catch (e) { t.check('the bot plays without a throw', false, e.stack); }
  const S = B.S;
  t.check('the campaign is won', S.won, `floor ${S.floor} at ${S.party.cx},${S.party.cy} t ${tt.toFixed(0)} over ${S.over} step ${JSON.stringify(bot.steps[bot.i])}`);
  t.check('no wipe', !S.over);
  t.check('the three hidden deeds', ['sq1', 'sq2', 'sq3'].every(k => S.special[k]), JSON.stringify(S.special));
  t.check('the three secrets', S.stats.secrets === 3);
  t.check('Tamsin and Durgan joined', S.party.members.some(m => m.npc === 'tamsin') && S.party.members.some(m => m.npc === 'durgan'));
  t.check('the level pace: about 3 after floor 1', lv.f1 >= 2 && lv.f1 <= 4, lv.f1);
  t.check('about 4 after floor 2', lv.f2 >= 3 && lv.f2 <= 5, lv.f2);
  t.check('5 or 6 at the boss', lv.f3 >= 4 && lv.f3 <= 7, lv.f3);
  t.check('under 90 minutes of game time', tt < 90 * 60);
  t.check('no fight over 3 minutes (the boss: 6)', fights.every(([f, d]) => d < (f === 'f4' ? 360 : 180)), JSON.stringify(fights.filter(([f, d]) => d >= 180)));
  t.check('no game errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
  t.check('no skipped steps', !bot.skipped.length, bot.skipped.join(' / '));
  report.push(`seed ${SEED}: won ${S.won} in ${(tt / 60).toFixed(1)} min of game time; kills ${S.stats.kills}, deaths ${S.stats.deaths}, downs ${S.stats.downs}, potions ${S.stats.potions}, rests ${S.stats.rests}`);
  for (const f of ['f1', 'f2', 'f3', 'f4']) report.push(`${f}: ${((per[f] || tt - per[f + '_t']) / 60).toFixed(1)} min, top level ${lv[f] || Math.max(...S.party.members.map(m => m.lvl))}`);
  report.push('fights (floor, seconds, party HP lost):'); for (const f of fights) report.push('  ' + f.join(' '));
  // Veil refused, from the floor 3 save
  if (f3save) {
    B.load(JSON.parse(f3save)); const b2 = B.Bot.campaign({ choices: { veil: 1 } }); b2.floor = 'f3'; b2.steps = B.FLOORS.f3.walk.slice(); let t2 = 0;
    for (; t2 < 40 * 60 && !B.S.won && !B.S.over && B.S.floor !== 'f4'; t2 += dt) B.update(dt, b2.tickAll(dt), dt);
    t.check('refused: Veil stays, the barracks way reaches the iron ward and floor 4', B.S.flags.veilRefused && B.S.floor === 'f4', `floor ${B.S.floor} at ${B.S.party.cx},${B.S.party.cy} step ${JSON.stringify(b2.steps[b2.i])} over ${B.S.over}`);
    report.push(`Veil refused: reached floor 4 ${B.S.floor === 'f4'} in ${(t2 / 60).toFixed(1)} min`);
  }
  mkdirSync(new URL('../out/', import.meta.url), { recursive: true }); writeFileSync(new URL('../out/balance.txt', import.meta.url), report.join('\n') + '\n');
}
