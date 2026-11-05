import { run } from './lib/t.mjs';
import { load } from './lib/load.mjs';
run('playthrough', async t => {
  const L = load({}), { game, I, D, step } = L, X = game.debug.internals;
  step(1);
  t.ok('boots to the title', game.sceneName === 'title', game.sceneName);
  I.tap('start'); step(.7);
  t.ok('START opens the menu', game.sceneName === 'menu', game.sceneName);
  I.tap('confirm'); step(1);
  t.ok('HUNT-OFF starts the campaign', game.sceneName === 'hunt' && D.snapshot().mode === 'campaign', game.sceneName + ' ' + D.snapshot().mode);
  const seen = { hunts: new Set(), segs: new Set(), cam: false, tsBack: true, autosaveAt2: false, initials: 0, bagged: 0, sites: 0, bonus: 0 };
  let simT = 0, lastKind = null, tap = 0, botKind = null;
  while (simT < 30 * 60) {
    if (game.sceneName !== 'hunt') break;
    const H = X.G.hunt; if (!H) { step(.25); simT += .25; continue; }
    seen.hunts.add(H.huntId);
    if (H.huntId === 'bugle' && game.saves.get('auto')) seen.autosaveAt2 = true;
    const k = H.seg ? H.seg.kind : null; if (k) seen.segs.add(k);
    if (k !== lastKind) { if (k === 'site') seen.sites++; if (k === 'bonus') seen.bonus++; lastKind = k; }
    const want = k === 'trophy' ? 'cheat' : 'average';
    if (want !== botKind) { botKind = want; D.bot(true, want === 'cheat' ? { skill: 'expert', cheat: true } : { skill: 'average' }); }
    if (H.camFX) seen.cam = true; else if (seen.cam && game.timeScale !== 1) seen.tsBack = false;
    tap += .25;
    if (tap >= .5) { tap = 0; if (k === 'dialog') I.tap('cancel'); else if (['establish', 'walk', 'tally', 'trophyEnd', 'bonusTally', 'results'].includes(k)) { I.tap('confirm'); if (X.G.cab.entry) seen.initials++; } }
    step(.25); simT += .25;
  }
  t.ok('all three hunts played', seen.hunts.size === 3, [...seen.hunts].join(','));
  t.ok('every kind of segment ran', ['establish', 'dialog', 'walk', 'site', 'tally', 'trophy', 'trophyEnd', 'bonus', 'bonusTally', 'results'].every(s => seen.segs.has(s)), [...seen.segs].join(','));
  t.ok('nine sites and three bonus games', seen.sites === 9 && seen.bonus === 3, seen.sites + ' sites, ' + seen.bonus + ' bonus');
  t.ok('the Trophy Cam ran and time came back to normal', seen.cam && seen.tsBack && game.timeScale === 1, seen.cam + ' ' + seen.tsBack + ' ' + game.timeScale);
  t.ok('an autosave carried the campaign into the next hunt', seen.autosaveAt2);
  t.ok('initials went on the board', seen.initials > 0 || X.G.cab.table('hollow').length > 0);
  t.ok('the campaign ends at the lodge ceremony, under 30 minutes', game.sceneName === 'lodge' && simT < 30 * 60, game.sceneName + ' at ' + Math.round(simT) + ' s');
  const bagged = ['iron-rack', 'duke', 'bigmo'].filter(id => X.Records.d.trophies[id] && X.Records.d.trophies[id].bagged);
  t.ok('the three trophies were bagged', bagged.length === 3, bagged.join(','));
  t.ok('the lodge hangs the three trophy mounts', X.G.lodge && X.G.lodge.items.filter(i => i.kind === 'trophy' && i.bagged).length === 3);
  // through the ceremony to the credits, then back to the title
  for (let i = 0; i < 80 && game.sceneName === 'lodge'; i++) { I.tap('confirm'); step(.3); }
  t.ok('the ceremony leads to the credits', game.sceneName === 'about', game.sceneName);
  step(.5); I.tap('cancel'); step(.8); t.ok('back to the menu', game.sceneName === 'menu', game.sceneName);
  step(.5); I.tap('cancel'); step(.8); t.ok('and the title', game.sceneName === 'title', game.sceneName);
  t.ok('no errors', !L.errs().length, L.errs().slice(0, 3).join(' | '));
});
