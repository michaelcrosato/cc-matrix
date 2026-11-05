// Time Trial (a ghost records, saves, loads and replays to the same positions; medals from par) and Versus (two bots finish; places)
import { boot, raceIn, run } from '../lib/boot.mjs';
export default async function (t) {
  { const B = boot(); const { OB, game } = B; game.advance(.1); OB.cheats.noCollide = true;
    const cfg = OB.Trial.configure({ mode: 'trial', trialKey: 'S1', car: 'orchidea', noIntro: true, seed: 2, players: [{ car: 'orchidea', bot: {} }] });
    const race = OB.Race.create(cfg); race.phase = 'race'; run(race, 120); const R = race.result;
    t('a trial run finishes', R && R.players[0].finished, R && R.reason);
    const out = OB.Trial.after(R); t('the first run is a record with a medal', out.record && out.medal, JSON.stringify(out));
    const rec = OB.Profile.data.records.stage.S1; t('the ghost is saved', rec && rec.ghost.length > 100, rec && rec.ghost.length);
    OB.Profile.save(); OB.Profile.load(); const rec2 = OB.Profile.data.records.stage.S1; t('the ghost survives save and load', rec2 && rec2.ghost.length === rec.ghost.length);
    const cfg2 = OB.Trial.configure({ mode: 'trial', trialKey: 'S1', car: 'orchidea', noIntro: true, seed: 2, players: [{ car: 'orchidea', bot: {} }] });
    const r2 = OB.Race.create(cfg2); r2.phase = 'race'; run(r2, 20); const gh = r2.ghosts[0], s = OB.ghostAt(r2, gh, 'S1'), sample = rec2.ghost[Math.floor(r2.t * 10)];
    t('the ghost replays to the same positions', s && Math.abs(s.z - sample[1]) < 400, s && (Math.round(s.z) + ' vs ' + sample[1]));
    t('medals from par', OB.medalFor('S1', OB.PAR.S1 * .9) === 'bloom' && OB.medalFor('S1', OB.PAR.S1 * 1.2) === 'bronze' && OB.medalFor('S1', OB.PAR.S1 * 2) === 'none'); }
  { const B = boot(); const { OB, game } = B; game.advance(.1); OB.cheats.noCollide = true;
    const p2 = game.addPlayer({ keys: 'right' });
    t('a second player joins on the keyboard', game.players.length === 2 && p2);
    const race = OB.Race.create({ mode: 'versus', route: { stages: ['S1', 'S2', 'S5'], sprint: true }, noIntro: true, seed: 4, startTime: 400, finishWait: 90, players: [{ car: 'orchidea', bot: {} }, { car: 'orchidea', bot: {}, cpu: true }] }); race.phase = 'race';
    run(race, 360); const R = race.result;
    t('a split-screen race of two bots finishes', R && R.players.length === 2 && R.players.every(p => p.finished), R && JSON.stringify(R.players.map(p => [p.finished, p.stage])));
    t('places are given', R && new Set(R.players.map(p => p.place)).size === 2, R && R.players.map(p => p.place).join()); }
}
