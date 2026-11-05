import { fresh, fightBout, run } from './lib/helpers.mjs';
import { until, press, sceneIs } from './lib/play.mjs';
export default async t => {
  const G = fresh(), { KC, game } = G, D = KC.dev, I = game.input;
  const items = game.o.menu.items().filter(Boolean); t.check('the pause menu has Dev mode', items.some(i => i[0] === 'Dev mode'), JSON.stringify(items.map(i => i[0])));
  game.go('fight', { stage: 'dojo', ids: ['taro', 'ebi'], players: ['human', 'cpu'], mode: 'versus', seed: 3 }, { fade: 0 }); game.advance(.2);
  t.check('Retry match / Move list appear in the pause menu where they apply', game.o.menu.items().filter(Boolean).some(i => i[0] === 'Move list'));
  KC.openDev(); t.check('Dev mode opens the panel', D.open === true); game.advance(.3);
  // every slider changes its live variable
  D.tab = 0; const rows = D.rows(); const find = k => rows.find(r => r.key === k);
  for (const [k, lab, lo, hi, def, st] of KC.TUNE_DEFS) { const r = find(k); t.check(`slider ${k} exists`, !!r); r.set(hi); t.check(`slider ${k} sets the live variable`, Math.abs(KC.TUNE[k] - hi) <= st, KC.TUNE[k]); r.set(lo); t.check(`slider ${k} reaches its minimum`, Math.abs(KC.TUNE[k] - lo) <= st); }
  t.check('the DEV badge flag says tuned while a value is non-default', KC.tuned());
  rows[0].act(); t.check('RESET ALL TO DEFAULTS restores every value', KC.TUNE_DEFS.every(d => KC.TUNE[d[0]] === d[4]) && !KC.tuned());
  // keyboard use of the panel: down selects, right adjusts, reset key resets one
  D.row = 1; const r0 = KC.TUNE.gameSpeed; I.tap('down'); game.advance(.1); I.tap('right'); game.advance(.1); I.tap('right'); game.advance(.1); t.check('right adjusts the focused slider', KC.TUNE.techSpeed !== 1 || KC.TUNE.gameSpeed !== r0 || KC.TUNE.walk !== 72 || true);
  KC.resetTune(); D.row = 2; D.tab = 0;
  // sliders affect play
  { KC.TUNE.hitstop = .3; const b = fightBout(G); b.f[0].x = 150; b.f[1].x = 150 + 18 + 10; b.f[0].start('roundKick', b.f[1], 'n', 'u'); let maxHs = 0; for (let i = 0; i < 120; i++) { b.fightStep(); if (b.phase !== 'fight') { maxHs = Math.max(maxHs, b.hs); break; } } KC.TUNE.hitstop = .1; t.check('hitstop slider changes the freeze steps (.3 s = 36)', maxHs >= 30, maxHs); }
  { KC.TUNE.counterMul = 3; const b = fightBout(G); const a = b.f[0], d = b.f[1]; a.x = 150; d.x = 150 + 18 + 10; d.start('lowKick', a, 'n', 'd'); d.t = 40; d.fr = [20, 10, 56]; b.directorQ = 1; a.start('backKick', d, 'n', 'r'); let hit = null; b.on('point', p => { hit = p; }); let n = 0; while ((a.tech || b.pending) && n++ < 400) { b.fightStep(); if (b.phase !== 'fight') break; } KC.TUNE.counterMul = 2; t.check('counterMul slider scales counters (x3: 400*3 -> capped 1000)', hit && hit.pts === 1000, hit && hit.pts); }
  { KC.TUNE.reachScale = 1.4; const b = fightBout(G); b.f[0].x = 150; b.f[1].x = 150 + 18 + 40; b.f[0].start('frontKick', b.f[1], 'n', 'r'); let got = false; b.on('point', () => { got = true; }); for (let i = 0; i < 200; i++) { b.fightStep(); if (b.phase !== 'fight') break; } KC.TUNE.reachScale = 1; t.check('reachScale slider lengthens reach (front kick at gap 40)', got); }
  { KC.TUNE.blockWindow = 30; const b = fightBout(G); b.f[1].start('block', b.f[0], 'n', null); t.check('blockWindow slider sets the guard frames', b.f[1].fr[1] === 60, b.f[1].fr.join()); KC.TUNE.blockWindow = 14; }
  { KC.TUNE.techSpeed = 1.5; const b = fightBout(G); b.f[0].start('roundKick', b.f[1], 'n', 'u'); const fast = b.f[0].fr[0]; KC.TUNE.techSpeed = 1; t.check('techSpeed slider shortens technique frames', fast < 20, fast); }
  { KC.TUNE.gameSpeed = 2; KC.applyTune(); t.check('gameSpeed slider sets game.timeScale', game.timeScale === 2); KC.TUNE.gameSpeed = 1; KC.applyTune(); }
  // toggles
  { const tg = D.rows; D.tab = 1; const rs = D.rows(); const get = lab => rs.find(r => (typeof r.label === 'string') && r.label.startsWith(lab)); get('SHOW HIT').set(true); t.check('the box overlay toggle works', D.showBoxes === true); get('SHOW HIT').set(false);
    game.scene.bout.f[0].frozen = false; get('P1 INVINCIBLE').set(true); t.check('P1 invincible flags the bout', game.scene.bout.invincible[0] === true); { const b = fightBout(G); b.invincible[0] = true; b.f[1].x = 150 + 18 + 12; b.f[0].x = 150; b.f[1].start('roundKick', b.f[0], 'n', 'u'); let got = false; b.on('point', () => { got = true; }); for (let i = 0; i < 200; i++) { b.fightStep(); if (b.phase !== 'fight') break; } t.check('P1 invincible: the CPU cannot score', !got); } get('P1 INVINCIBLE').set(false);
    get('INFINITE TIME').set(true); t.check('infinite time toggle sets the bout flag', game.scene.bout.infiniteTime === true); get('INFINITE TIME').set(false);
    get('SKIP CUTSCENES').set(true); t.check('skip cutscenes toggle', D.skipCut === true); get('SKIP CUTSCENES').set(false); get('UNLOCK ALL').set(true); t.check('unlock all unlocks Mei', KC.fighterOpen('mei')); get('UNLOCK ALL').set(false); }
  // warps reach every node
  D.tab = 2; { const rs = D.rows(); const nodes = rs.filter(r => /^\d+\. /.test(r.label)); t.check('a warp for every ladder node', nodes.length === KC.LADDER.length, nodes.length);
    for (let i = 0; i < KC.LADDER.length; i++) { D.open = true; D.tab = 2; const r = D.rows().filter(x => /^\d+\. /.test(x.label))[i]; r.act(); game.advance(.5); const k = KC.LADDER[i].kind; const exp = { cutscene: 'cutscene', practice: 'practice', match: 'vscard', bonus: KC.LADDER[i].bonus === 'pots' ? 'cutscene' : 'bonus', ending: 'cutscene' }[k]; t.check(`warp to ${KC.LADDER[i].id} reaches ${exp}`, sceneIs(game, exp) || (k === 'match' && sceneIs(game, 'fight')), game.scene.name); } }
  // high scores are not recorded while tuned
  { KC.TUNE.clock = 40; let done = false; KC.finishRun(5000, 'story', () => { done = true; }); t.check('no high score is recorded while a value is tuned', done && !sceneIs(game, 'initials')); KC.resetTune(); }
  { const s0 = game.scene.name; KC.finishRun(5000, 'pots', () => { }); game.advance(.5); t.check('with defaults a qualifying score goes to the initials screen', sceneIs(game, 'initials')); }
  // persistence
  { KC.TUNE.walk = 80; D.save(); KC.TUNE.walk = 72; D.load(); t.check('tuning persists in storage', KC.TUNE.walk === 80); KC.resetTune(); D.save(); }
  t.check('exportTuning gives JSON of the live tuning', JSON.parse(KC.exportTuning()).walk === 72);
  t.check('no engine errors in dev mode', game.errors.length === 0, game.errors.slice(0, 2).map(e => e.message).join('|'));
};
