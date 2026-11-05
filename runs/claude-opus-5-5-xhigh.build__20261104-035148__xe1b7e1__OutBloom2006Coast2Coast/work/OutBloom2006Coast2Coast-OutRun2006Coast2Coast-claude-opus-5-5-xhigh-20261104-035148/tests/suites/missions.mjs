// missions: each one runs with its rules to a result (cleared by its bot with the cheats that help a bot, failing
// when it should), rewards pay once per rank improvement, unlock chains open postcards, the Finale opens at 9; economy
import { boot, raceIn, run } from '../lib/boot.mjs';
export default async function (t) {
  for (const m of boot().OB.MISSIONS) {
    if (m.kind === 'love') continue;
    const B = boot(); const { OB, game } = B; game.advance(.1);
    const cfg = OB.Missions.configure({ mode: 'mission', mission: m.id, car: 'orchidea', passenger: 'marisol', noIntro: true, seed: 3 });
    cfg.players = [{ car: 'gardenia', passenger: 'marisol', bot: { targets: true, drift: true, driftAt: 3, nearMiss: m.id === 'J1' } }]; cfg.after = () => {};
    OB.cheats.perfectRequests = true; OB.cheats.noCollide = m.kind !== 'clean' && m.id !== 'J1'; OB.cheats.autoDrift = m.kind === 'driftduel';
    if (m.kind === 'heartbreak' || m.kind === 'knockout' || m.kind === 'draftdash') OB.tuning.rivalSkill = .9;
    const race = OB.Race.create(cfg); race.phase = 'race';
    run(race, 400);
    const R = race.result || {};
    t(m.id + ' ' + m.title + ': runs to a result', race.phase === 'done' && R.stats, race.phase + ' ' + JSON.stringify(R.stats));
    t(m.id + ': a rank when cleared', !R.cleared || OB.RANKS.includes(R.rank), JSON.stringify({ c: R.cleared, r: R.rank }));
    if (['sprint', 'collect', 'count', 'photo3', 'memory', 'speedkeep', 'driftduel'].includes(m.kind)) t(m.id + ': the bot clears it', R.cleared, JSON.stringify(R.stats) + ' ' + R.reason);
  }
  // failure paths: a scratch ends Not a Scratch; Heartbreakers drains to zero behind them
  { const B = boot(); const { OB, game } = B; game.advance(.1); const cfg = OB.Missions.configure({ mode: 'mission', mission: 'V1', car: 'orchidea', passenger: 'vivi', noIntro: true, seed: 3 }); cfg.after = () => {};
    const race = OB.Race.create(cfg); race.phase = 'race'; run(race, 1); OB.bus.emit('car:bump', { car: race.p1.id }); run(race, 1); t('V1 fails on a scratch', race.phase === 'done' && !race.result.cleared); }
  // rewards and unlocks
  { const { OB } = boot(); const P = OB.Profile; P.reset();
    let r = P.missionResult('B1', { cleared: true, rank: 'C' }); t('a first clear pays the base seeds', r.paid === 150, r.paid);
    r = P.missionResult('B1', { cleared: true, rank: 'C' }); t('the same rank pays nothing again', r.paid === 0, r.paid);
    r = P.missionResult('B1', { cleared: true, rank: 'AAA' }); t('a better rank pays the improvement', r.paid === 150, r.paid);
    t('clearing B1 opens B2', P.missionOpen('B2') && !P.missionOpen('B3'));
    t('the Finale is locked before 9 clears', !P.missionOpen('F'));
    for (const id of ['M1', 'M2', 'M3', 'V1', 'V2', 'V3', 'J1', 'J2']) P.missionResult(id, { cleared: true, rank: 'C' });
    t('the Finale opens at 9 clears', P.missionOpen('F'), P.clearedCount());
    // the economy: 14 missions at A plus 6 arcade runs buy every bed
    P.reset(); for (const m of OB.MISSIONS) P.missionResult(m.id, { cleared: true, rank: 'A' }); for (let i = 0; i < 6; i++) P.grant(Math.floor(400000 / OB.ECONOMY.scorePerSeed) + 50 + 100, "run");
    let bought = 0; for (const b of OB.BEDS) if (P.buy(b.id)) bought++;
    t('14 A-ranks and 6 arcade runs buy every bed', bought === OB.BEDS.length, bought + ' of ' + OB.BEDS.length + ', seeds left ' + P.data.seeds);
    P.reset(); t('buying with too few seeds is refused', !P.buy('gardenia') && !P.buy('pastel'));
    P.data.seeds = 1000; t('a locked bed is refused', !P.buy('gardenia')); t('an open bed is bought', P.buy('pastel') && P.data.unlocked.paints.includes('pastel'));
    t('a bought paint pack shows in the garage', OB.paintsFor('orchidea', P.data).length === 8); }
}
