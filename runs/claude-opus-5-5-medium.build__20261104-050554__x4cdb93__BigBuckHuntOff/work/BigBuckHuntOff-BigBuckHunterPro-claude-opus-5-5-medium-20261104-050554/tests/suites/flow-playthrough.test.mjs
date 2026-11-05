// The scripted playthrough of the whole game: title -> menu -> HUNT-OFF -> three hunts (sites with the bot, tallies,
// walk-ins, the trophy, the bonus, results with initials) -> ceremony -> the Lodge -> About -> title.
import { load } from '../lib/load.mjs';
import { check, done } from '../lib/check.mjs';
const { B, game } = load();
const S = () => game.debug.snapshot(), I = game.input;
const step = (s = .25) => game.advance(s);
step(1); check('boots to the title', S().scene === 'title', S().scene);
I.tap('start'); step(.6); check('start opens the menu', S().scene === 'menu', S().scene);
I.tap('confirm'); step(1); check('HUNT-OFF starts the campaign', S().scene === 'hunt' && S().mode === 'hunt-off', JSON.stringify(S()).slice(0, 200));
const seen = { sites: [], segs: new Set(), trophyCam: false, initials: 0, results: 0 };
let simT = 0, lastSeg = null, lastHunt = null;
while (simT < 60 * 40) {
  const s = S();
  if (s.scene !== 'hunt') break;
  seen.segs.add(s.seg);
  if (s.seg === 'site') {
    if (lastSeg !== 'site' || seen.sites[seen.sites.length - 1] !== s.site) { seen.sites.push(s.site); game.debug.bot(true, { skill: 'expert', cheat: true }); }
    if (s.trophyCam) seen.trophyCam = true;
    step(.25); simT += .25;
  } else {
    if (s.initials) seen.initials++;
    if (s.seg === 'results' && lastSeg !== 'results') seen.results++;
    I.tap('confirm'); step(.35); simT += .35;
  }
  lastSeg = s.seg;
  if (game.errors.length) break;
}
const s = S();
check('no errors during the campaign', !game.errors.length, game.errors.map(e => e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')).join(' || '));
check('every site of the three hunts was played', ['hollow-1', 'hollow-2', 'hollow-3', 'iron-rack', 'bonus-crow', 'bugle-1', 'bugle-2', 'bugle-3', 'duke', 'bonus-saucer', 'muskeg-1', 'muskeg-2', 'muskeg-3', 'big-mo', 'bonus-snowball'].every(x => seen.sites.includes(x)), seen.sites.join(','));
check('tallies, walk-ins, cards, stories and results were shown', ['tally', 'walk', 'card', 'story', 'bonusTally', 'results'].every(k => seen.segs.has(k)), [...seen.segs].join(','));
check('three results screens', seen.results === 3, seen.results);
check('the Trophy Cam ran and time scale came back', seen.trophyCam && game.timeScale === 1, seen.trophyCam + ' ' + game.timeScale);
check('the ceremony leads to the Lodge', s.scene === 'lodge', s.scene + ' ' + s.seg);
check('the lodge records hold trophies', Object.values(B.records.trophies).filter(t => t.bagged).length >= 2, JSON.stringify(B.records.trophies));
check('under 40 simulated minutes', simT < 60 * 40, simT);
check('the campaign autosave is cleared at the end', B.records.campaign === null, JSON.stringify(B.records.campaign));
// the lodge, about, back to the title
step(1); I.tap('cancel'); step(1.4); check('lodge back goes to the menu', S().scene === 'menu', S().scene + ' ts ' + game.timeScale + ' fade ' + JSON.stringify(game._fade) + ' talk ' + B.talk.open);
// about: the last entry
for (let k = 0; k < 7; k++) { I.tap('down'); step(.12); }
I.tap('confirm'); step(.6); check('about opens', S().scene === 'about', S().scene);
for (let k = 0; k < 6; k++) { I.tap('right'); step(.12); }
I.tap('cancel'); step(.6); I.tap('cancel'); step(.6); check('back to the title', S().scene === 'title', S().scene);
check('no errors at all', !game.errors.length, game.errors.map(e => e.message).join(' | '));
done();
