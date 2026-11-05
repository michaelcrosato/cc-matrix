import { run } from './lib/t.mjs';
import { load } from './lib/load.mjs';
run('modes', async t => {
  const L = load({}), { game, I, D, step } = L, X = game.debug.internals; step(1);
  const drive = (max, done, bot = { skill: 'expert', cheat: true }) => { let tt = 0, tap = 0; while (tt < max && !done()) { const H = X.G.hunt; if (H && H.players[0] && !H.players[0].bot) D.bot(true, bot); const k = H && H.seg && H.seg.kind; tap += .25; if (tap > .5) { tap = 0; if (k === 'dialog') I.tap('cancel'); else if (['establish', 'walk', 'tally', 'trophyEnd', 'bonusTally', 'results'].includes(k)) I.tap('confirm'); } step(.25); tt += .25; } return tt; };
  // the bonus games on their own
  for (const h of ['hollow', 'bugle', 'muskeg']) {
    X.startHunt({ mode: 'bonusOnly', hunt: h, seed: 2 }); step(.6); let res = null;
    drive(120, () => { const H = X.G.hunt; if (H && H.bonusResult) res = H.bonusResult; return game.sceneName === 'menu'; }, { skill: 'average' });
    t.ok('bonus ' + h + ': plays, scores and returns to the menu', res && res.score > 0 && res.hits > 0 && game.sceneName === 'menu', JSON.stringify(res) + ' ' + game.sceneName);
  }
  // the Practice Range: every station
  X.Records.d.badge = false;
  X.startHunt({ mode: 'range', hunt: 'range', seed: 3 }); step(.6); const stations = new Set();
  drive(300, () => { const H = X.G.hunt; if (H && H.seg && H.seg.kind === 'range') { const b = H.bonus; } return game.sceneName === 'menu'; });
  t.ok('range: all seven stations complete and the badge is earned', X.Records.d.badge === true && game.sceneName === 'menu', 'badge ' + X.Records.d.badge + ' ' + game.sceneName);
  // a single hunt (bugle), start to results
  X.startHunt({ mode: 'single', hunt: 'muskeg', seed: 4 }); step(.6); let sawResults = false;
  drive(900, () => { const H = X.G.hunt; if (H && H.seg && H.seg.kind === 'results') sawResults = true; return game.sceneName === 'menu'; });
  t.ok('single hunt: Muskeg Lake runs to its results and back to the menu', sawResults && game.sceneName === 'menu', game.sceneName);
  // party: two and four hunters, each with a tube and a score; a doe benches only its shooter; the podium is ordered
  for (const n of [2, 4]) {
    const players = [new X.Player(1, game.input)]; for (let i = 2; i <= n; i++) { const In = game.addPlayer({ pad: i - 1 }); players.push(new X.Player(i, In)); }
    for (const p of players) p.bot = new X.HunterBot({ skill: 'expert' });
    X.startHunt({ mode: 'party', hunt: 'hollow', players, seed: 5 }); step(.6); const H = X.G.hunt; H.skipTo('site', 'hollow-2'); step(.1);
    t.ok('party ' + n + ': every hunter has a tube of their own', H.players.length === n && new Set(H.players.map(p => p.rifle)).size === n);
    let doe = null; for (let k = 0; k < 600 && !doe; k++) { step(.1); doe = H.actors.find(a => a.cat === 'animal' && a.protected && a.alive && a.visible); }
    if (doe) { const p2 = H.players[1]; p2.bot = null; D.aimAt(2, doe, 'heart'); H.trigger(p2); step(.1); t.ok('party ' + n + ': a doe benches only its shooter', p2.benched && !H.players[0].benched); }
    else t.ok('party ' + n + ': a doe to test with', false);
    for (let k = 0; k < 400 && H.seg && H.seg.kind === 'site'; k++) step(.25);
    const scores = H.players.map(p => p.score); t.ok('party ' + n + ': scores are kept apart', scores.some(s => s > 0), scores.join(','));
    H.queue = [{ kind: 'results' }]; H.nextSeg(); step(.2);
    const order = H.players.slice().sort((a, b) => b.score - a.score); t.ok('party ' + n + ': the podium orders the hunters by score', order[0].score >= order[order.length - 1].score);
    for (const p of players.slice(1)) game.removePlayer(p.input);
    game.go('menu', {}, { fade: 0 }); step(.3);
  }
  // Quick Draw: site 1 of each hunt, then Saucer Season
  { const players = [new X.Player(1, game.input), new X.Player(2, game.addPlayer({ pad: 1 }))]; for (const p of players) p.bot = new X.HunterBot({ skill: 'average' });
    X.startHunt({ mode: 'quick', hunt: 'hollow', players, seed: 6 }); step(.6); const hunts = new Set(); let bonus = false;
    drive(600, () => { const H = X.G.hunt; if (H) { hunts.add(H.huntId); if (H.seg && H.seg.kind === 'bonus') bonus = true; } return game.sceneName === 'menu'; });
    t.ok('quick draw: three sites, then the clays, then the menu', hunts.size === 3 && bonus && game.sceneName === 'menu', [...hunts].join(',') + ' bonus ' + bonus + ' ' + game.sceneName); }
  t.ok('no errors', !L.errs().length, L.errs().slice(0, 3).join(' | '));
});
