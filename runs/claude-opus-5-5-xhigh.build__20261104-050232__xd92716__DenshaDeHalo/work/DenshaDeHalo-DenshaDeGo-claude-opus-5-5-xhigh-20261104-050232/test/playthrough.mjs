// the scripted whole game: boot -> title -> (10 s -> attract -> a key -> title) -> the career S0..S5 through the menus,
// driven by the autopilot at skill 1 -> results after each -> the ending and credits -> title; then the Parallel Run as a
// duel (two autopilots). Asserts no errors, S0 passed, every service stage ranked S, every postcard, every event, and the
// same proof hash twice.
export default {
  playthrough({ DH, game, I, check }) {
    const adv = (s, until) => { const n = Math.round(s * 30); for (let i = 0; i < n; i++) { game.advance(1 / 30); if (until && until()) return true; } return !until; };
    const scenesSeen = [], log = s => { if (scenesSeen[scenesSeen.length - 1] !== s) scenesSeen.push(s); };
    DH.Progress.reset(); adv(1); log(game.sceneName); check('it boots to the title', game.sceneName === 'title', game.sceneName);
    DH.lastInput = game.real; adv(10.5); log(game.sceneName); check('idle on the title starts attract', game.sceneName === 'attract', game.sceneName);
    adv(20); I.tap('confirm'); adv(.5); log(game.sceneName); check('a press returns to the title', game.sceneName === 'title', game.sceneName);
    DH.devAuto = true; DH.devAutoSkill = 1;
    const fired = new Set(), ranks = {};
    const origRecord = DH.Progress.record.bind(DH.Progress); DH.Progress.record = (sum, run) => { ranks[sum.stage] = sum.tut ? (sum.tut.passed ? 'PASS' : 'FAIL') : sum.rank; for (const e of run.eventsFired) fired.add(e); return origRecord(sum, run); };
    // the title's CAREER, then the map, then each stage's briefing, drive and results
    I.tap('confirm'); adv(.6); log(game.sceneName); check('CAREER opens the halo map', game.sceneName === 'haloMap', game.sceneName);
    for (const id of DH.CAREER) {
      if (game.sceneName === 'haloMap') { I.tap('confirm'); adv(.6); }
      log(game.sceneName); if (game.sceneName !== 'briefing') { check(id + ': its briefing opens', false, game.sceneName); break; }
      for (let k = 0; k < 20 && game.sceneName === 'briefing'; k++) { I.tap('confirm'); adv(.5); }
      log(game.sceneName); if (game.sceneName !== 'drive') { check(id + ': the drive starts', false, game.sceneName); break; }
      const ok = adv(1500, () => game.sceneName !== 'drive'); log(game.sceneName);
      check(id + ': the drive ends in the results', ok && game.sceneName === 'results', game.sceneName + (DH.drive ? ' ' + JSON.stringify(DH.drive.run.snapshot()).slice(0, 200) : ''));
      if (game.sceneName !== 'results') break;
      adv(3); I.tap('confirm'); adv(.8); log(game.sceneName);
    }
    check('S0 passed', ranks.S0 === 'PASS', JSON.stringify(ranks));
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5']) check(id + ' ranked S', ranks[id] === 'S', JSON.stringify(ranks));
    check('after S5 the ending plays', game.sceneName === 'ending', game.sceneName);
    adv(60, () => DH.scenes.ending && game.sceneName === 'ending' && false); for (let k = 0; k < 12; k++) { I.tap('confirm'); adv(2); } adv(200, () => game.sceneName === 'title'); log(game.sceneName);
    check('the credits roll back to the title', game.sceneName === 'title', game.sceneName);
    const pc = DH.Progress.get().postcards.slice().sort((a, b) => a - b); check('every postcard is unlocked', pc.join() === '1,2,3,4,5,6,7,8', pc.join());
    const want = ['kota', 'oncoming', 'freight', 'festival', 'workers', 'fuji', 'obstruction', 'rival', 'doorRush', 'glare', 'fog', 'flash', 'finale', 'radio'];
    check('every event fired somewhere in the career', want.every(e => fired.has(e)), want.filter(e => !fired.has(e)).join(','));
    // the Parallel Run as a duel, two autopilots
    DH.duelAuto = true; game.go('duelLobby', null, { fade: 0 }); adv(.3); const p2 = game.addPlayer({ keys: 'right' }); I.tap('confirm'); p2.tap('confirm'); adv(.5);
    adv(400, () => game.sceneName !== 'duel'); check('the duel runs to its results', game.sceneName === 'duelResults', game.sceneName); DH.duelAuto = false;
    check('the proof hash is the same twice', DH.proof('S2', 90) === DH.proof('S2', 90));
    check('no errors anywhere', !game.errors.length, game.errors.map(e => e.message).join(' | '));
    DH.devAuto = false; DH.Progress.record = origRecord;
  }
};
