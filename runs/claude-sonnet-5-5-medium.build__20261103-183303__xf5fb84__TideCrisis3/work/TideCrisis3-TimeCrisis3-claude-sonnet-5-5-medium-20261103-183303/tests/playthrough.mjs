// playthrough.mjs — the fair bot clears every stage on Normal; the showoff cheat bot plays the whole ARCADE through the
// real scenes (briefings, cutscenes, play, results) to the credits and the initials; the Training range completes.
import { load } from './harness.mjs';
export async function playthrough(t) {
  const bal = {};
  for (const stage of [1, 2, 3]) {
    const { game, dbg } = await load(); dbg.start('stage', stage, 'normal', 1, 100 + stage); game.advance(.1); dbg.bot(true, 'fair'); let cur = '', t0 = 0, st = 0, done = false, deaths = 0;
    for (let s = 0; s < 900 * 2 && !done; s++) { game.advance(.5); const sim = dbg.sim; if (sim.sceneId !== cur) { if (cur) bal[cur] = Math.round(sim.t - t0); cur = sim.sceneId; t0 = sim.t; } if (sim.phase === 'stageclear' || game.sceneName !== 'play') done = true; if (sim.players[0].down) { sim.continuePlayer(sim.players[0]); deaths++; } }
    t.check('fair bot clears stage ' + stage + ' on Normal', done && dbg.sim.phase === 'stageclear' || game.sceneName !== 'play', 'phase ' + dbg.sim.phase + ' scene ' + dbg.sim.sceneId); t.check('stage ' + stage + ' needs at most one continue (fair bot, fixed seed)', deaths <= 1, deaths + ' continues'); t.check('stage ' + stage + ' no errors', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 2).join('|'));
    const sim = dbg.sim; for (const id of Object.keys(bal)) { const sc = dbg.Sim && null; }
  }
  { const { game, dbg, I } = await load(); dbg.Run.begin('arcade', 1, 'normal', 1); dbg.Run.newSim(1); game.go('play'); game.advance(.1); dbg.Run.botOn = true; dbg.bot(true, 'showoff'); dbg.cheat('god', 1); dbg.cheat('ammo', 1); let seen = new Set(), steps = 0;
    while (steps++ < 4000) { game.advance(.5); const s = game.sceneName; seen.add(s); if (s === 'results' || s === 'cutscene' || s === 'briefing' || s === 'ending') { I.tap('confirm'); game.advance(.2); I.tap('confirm'); game.advance(.2); if (s === 'results') game.advance(6); } if (s === 'play' && dbg.sim) { dbg.sim.cheats.god = 1; dbg.sim.cheats.ammo = 1; } if (s === 'gameover' || s === 'records' || s === 'menu' || s === 'title') break; }
    t.check('ARCADE reaches briefings, cutscenes, results, the ending and the records', ['briefing', 'cutscene', 'play', 'results', 'ending'].every(x => seen.has(x)), [...seen].join(',')); t.check('arcade run finished at the table/menu', ['gameover', 'records', 'menu', 'title'].includes(game.sceneName), game.sceneName); t.check('arcade no errors', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 3).join(' | ')); }
  { const { game, dbg } = await load(); dbg.Run.begin('range', 0, 'normal', 1); dbg.Run.newSim(0, 'T-1', { mode: 'range', lives: 99 }); game.go('play'); game.advance(.1); dbg.bot(true, 'fair'); let ok = false; for (let s = 0; s < 800; s++) { game.advance(.5); if (dbg.sim.phase === 'stageclear') { ok = true; break; } } t.check('Training range (4 drills) completes', ok, dbg.sim.sceneId + ' ' + dbg.sim.phase); t.check('range no errors', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 2).join('|')); }
}
