// The attract mode, dev mode, saves and determinism.
import { load } from '../lib/load.mjs';
import { check, done } from '../lib/check.mjs';
const { B, game, store } = load();
const S = () => game.debug.snapshot(), I = game.input;
game.advance(1);
// ---- attract: 10 s idle on the title starts it; it cycles; a key returns to the title ----
check('title', S().scene === 'title');
game.advance(8); check('not before 10 s', !S().attract, S().scene);
game.advance(2.5); check('10 s idle starts the attract mode', S().attract && S().scene === 'hunt' && S().mode === 'attract', S().scene + ' ' + S().mode);
const clips = new Set();
for (let k = 0; k < 140 * 4; k++) { game.advance(.25); const s = S(); clips.add(s.scene + ':' + (s.site || '')); if (s.scene === 'title' && k > 20) break; }
check('the playlist plays sites, the tables and the lodge', ['hunt:hollow-1', 'hunt:bugle-2', 'hunt:bonus-saucer', 'hunt:big-mo', 'attract:', 'lodge:'].every(c => clips.has(c)), [...clips].join(','));
B.startAttract(); game.advance(1.5);
I.press('KeyX'); game.advance(.05); I.release('KeyX'); game.advance(.8);
check('any key returns to the title', S().scene === 'title' && !S().attract, S().scene);
game.advance(10.5); check('idle again: attract again', S().attract);
I.feed && I.feed('move', 10, 10); I.feed && I.feed('move', 60, 60); game.advance(.1);
I.tap('confirm'); game.advance(.8); check('a button returns to the title', S().scene === 'title', S().scene);
// idle on a top-level menu page starts it too
I.tap('start'); game.advance(.6); check('menu', S().scene === 'menu'); game.advance(11); check('idle on the main menu starts the attract mode', S().attract, S().scene);
I.tap('cancel'); game.advance(.8);
// ---- dev mode ----
check('the pause menu lists Dev mode', game.o.menu.items.some(i => i[0] === 'Dev mode'));
const p = new B.Player(0, I, { name: 'YOU' });
game.go('hunt', { run: B.newRun({ mode: 'single', hunts: ['hollow'], players: [p] }), segment: { kind: 'site', id: 'hollow-1' } }); game.advance(.6);
check('a deep segment loads the site', S().site === 'hollow-1', S().site);
B.openDev(); game.advance(.1); check('dev mode opens', S().devOpen);
const site = B.play.site; site.co = { step() {}, done: false };
const a = site.S.pattern('cross', { kind: 'buck', path: [[-20, 45], [0, 45], [30, 45]], gait: 'walk' });
game.advance(.5); const v1 = a.speed; B.setTuning('animalSpeed', 2); game.advance(.5); const v2 = a.speed;
check('the animal speed slider doubles a walking deer', Math.abs(v2 / v1 - 2) < .1, v1 + ' ' + v2);
B.setTuning('rounds', 8); B.setTuning('scopeMag', 5); B.resetTuning();
check('reset to defaults restores every slider', B.TUNE_SPEC.every(([k, , d]) => B.TUNING[k] === d));
check('sliders are saved', JSON.parse(store.get('my3d2dge:bbho:tuning') || '{}').rounds === 5);
// dev list input: down and right adjust a slider
B.closeDev(); B.openDev(); game.advance(.3); I.tap('confirm'); game.advance(.3); I.tap('right'); game.advance(.2);
check('a slider turns with right', B.TUNING.animalSpeed > 1, B.TUNING.animalSpeed); B.resetTuning(); B.closeDev();
game.settings.set('trophyCam', 'off'); B.bagAll(); game.advance(.1); check('bag all bucks', a.dead);
B.dev.freeCam = { yaw: 0, pitch: 0, dx: 0, dy: 0, dz: 0 }; const x0 = site.lens.x; I.hold('up'); game.advance(.5); I.hold('up', false);
check('the free camera moves the lens', Math.hypot(site.lens.x - x0, site.lens.y - site.v.y) > 2, site.lens.x - x0); B.dev.freeCam = null; site.camOverride = null;
B.jump('muskeg', { kind: 'site', id: 'muskeg-2' }); game.advance(.8); check('jump to a site', S().site === 'muskeg-2', S().site);
game.go('animallab'); game.advance(.5); I.tap('down'); game.advance(.2); check('the animal lab runs', S().scene === 'animallab');
game.go('soundlab'); game.advance(.5); I.tap('confirm'); game.advance(.2); check('the sound lab runs', S().scene === 'soundlab');
// ---- saves: records and the campaign survive a reload ----
B.records.trophies['duke'] = { seen: true, bagged: true, best: 99 }; B.records.campaign = { hi: 1, totals: { hollow: 5000 }, seed: 9, total: 5000 }; B.saveRecords();
B.records = null; B.loadRecords();
check('records survive a reload', B.records.trophies.duke && B.records.trophies.duke.bagged && B.records.campaign.hi === 1);
game.go('menu'); game.advance(.6); I.tap('confirm'); game.advance(1);
check('CONTINUE resumes at the next hunt', S().hunt === 'bugle' && S().mode === 'hunt-off', S().hunt);
B.records.campaign = null; B.saveRecords();
// ---- determinism: same seed and inputs, same state ----
const hashOf = (extraFx) => {
  B.reseed(42); B.resetIds(); const pl = new B.Player(0, null); pl.bot = new B.Bot(pl, { skill: 'average' });
  const play = new B.Play({ players: [pl] }); const st = play.startSite('hollow-2');
  for (let k = 0; k < 120 * 40; k++) { play.update(1 / 120); if (extraFx && k % 7 === 0) B.fx(); }
  return [JSON.stringify(st.herd.spawnLog), B.hashStr(JSON.stringify(st.herd.list.map(a => [a.x.toFixed(3), a.y.toFixed(3), a.state, a.dead]))), pl.site.score];
};
const h1 = hashOf(false), h2 = hashOf(false), h3 = hashOf(true);
check('the same seed and inputs give the same game', h1[1] === h2[1] && h1[2] === h2[2], h1[1] + ' ' + h2[1]);
check('cosmetic draws never change the spawns', h1[0] === h3[0]);
check('no errors', !game.errors.length, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
done();
