// full scripted playthrough: New Member -> every scene -> Ending -> Free Play, with real input taps and bots
import { loadGame } from './lib.mjs';
const SESS = [['squat', 'step'], ['flow', 'pushup', 'hoop'], ['candle', 'lunge', 'jog'], ['slalom', 'tray', 'laundry']];
export async function playthrough(T, opts) {
  opts = opts || {}; const label = opts.passive ? 'passive ' : '';
  const { G, game, E } = loadGame({ draw: false }); const tap = (a, adv) => { game.input.tap(a); game.advance(adv == null ? .12 : adv); };
  const S0 = () => G.S, scene = () => game.sceneName; const err = () => game.errors.map(e => e.where + ': ' + e.message).slice(0, 2).join(' | ');
  const clearTalk = () => { for (let i = 0; i < 30 && G.talk.open; i++) tap('confirm', .7); };
  const until = (cond, max, step) => { for (let i = 0; i < (max || 200) && !cond(); i++) game.advance(step || .5); return cond(); };
  if (!opts.passive) G.devFlags.bot = 'good';
  game.advance(.3); T.ok(scene() === 'title', label + 'boots to title');
  // title -> New Member -> slot -> builder -> Begin
  tap('confirm'); game.advance(.3); T.ok(scene() === 'member', label + 'New Member opens the card scene (' + scene() + ')'); tap('confirm'); game.advance(.2);
  for (let i = 0; i < 6; i++) tap('down'); tap('confirm', .5); T.ok(scene() === 'arrival', label + 'Begin goes to arrival (' + scene() + ')');
  for (let i = 0; i < 40 && G.scenes.arrival.stage === 'talk'; i++) tap('confirm', .7); T.ok(G.scenes.arrival.stage === 'pick', label + 'arrival reaches the instructor choice'); tap('confirm', .3);
  for (let i = 0; i < 40 && scene() === 'arrival'; i++) { tap('confirm', .7); } T.ok(scene() === 'bungalow', label + 'bungalow after arrival (' + scene() + ')'); T.ok(['birch', 'alder'].includes(G.S.inst), label + 'instructor chosen');
  if (!opts.passive) G.devFlags.bot = 'good';
  const bcPlay = () => { for (let i = 0; i < 400 && G.scenes.bodycheck.st !== 'age'; i++) { if (G.scenes.bodycheck.st === 'question' && !G.devFlags.bot) tap('confirm', .5); else game.advance(.5); } };
  const ages = [], mins = [];
  let guided = false;
  for (let day = 1; day <= 4; day++) {
    T.ok(S0().day === day, label + 'day ' + day + ' (' + S0().day + ')');
    if (scene() !== 'bungalow') until(() => scene() === 'bungalow', 40); tap('confirm', .3); T.ok(scene() === 'bodycheck', label + 'body check day ' + day + ' (' + scene() + ')');
    bcPlay(); ages.push(G.S.shownAge); if (process.env.PLAYDBG) console.error('age stage', day, scene(), G.scenes.bodycheck.st, G.S.shownAge, G.S.day); game.advance(1.8); tap('confirm', .3); until(() => scene() !== 'bodycheck', 20, .3); game.advance(.5);
    if (day === 1) { T.ok(scene() === 'act_stork', label + 'guided stork first (' + scene() + ')'); await act('stork', true); guided = true; }
    if (day === 4) { T.ok(scene() === 'recal', label + 'recalibration on day 4 (' + scene() + ')'); until(() => G.scenes.recal.stage === 'press', 40, .5); tap('confirm', .3); until(() => scene() === 'island', 60, .5); }
    T.ok(scene() === 'island', label + 'island day ' + day + ' (' + scene() + ')');
    for (const id of SESS[day - 1]) { clearTalk(); const isl = G.scenes.island; T.ok(S0().done < 3, label + 'session slot open'); const mat = isl.mats.find(m => m.id === id); isl.interact(mat); game.advance(.5); T.ok(scene() === 'act_' + id, label + 'mat opens ' + id + ' (' + scene() + ')'); await act(id, false); }
    T.ok(S0().done === 3, label + 'three sessions done day ' + day + ' (' + S0().done + ')'); mins.push(S0().minutes);
    // bed
    clearTalk(); const isl = G.scenes.island; isl.interact(isl.things[0]); game.advance(.4); tap('confirm', .4); T.ok(scene() === 'evening', label + 'evening (' + scene() + ')'); until(() => G.scenes.evening.stage === 'recap' && G.scenes.evening.t > 2.2, 30, .5); tap('confirm', .3); until(() => scene() === 'bungalow', 30, .5); T.ok(scene() === 'bungalow', label + 'bed leads to the next morning (' + scene() + ')'); }
  async function act(id, guidedRun) {
    until(() => G.scenes['act_' + id] && G.curRun && G.curRun.def.id === id, 20, .3); tap('confirm', .3); tap('confirm', .3); tap('confirm', .3); const run = G.curRun; if (!run) { T.ok(false, label + 'no run ' + id); return; }
    until(() => run.done, 400, 1); game.advance(4); const pills = () => { for (let i = 0; i < 3; i++) tap('down', .1); tap('confirm', .5); }; until(() => scene() !== 'act_' + id || true, 1); tap('down', .1); tap('confirm', .6); game.advance(.5); T.ok(!game.errors.length, label + id + ' played without errors: ' + err()); game.errors.length = 0; }
  T.ok(ages[0] === 71, label + 'spine age starts 71 (' + ages[0] + ')'); T.ok(ages[2] === ages[1], label + 'day 3 plateau holds (' + ages.join(',') + ')'); T.ok(opts.passive ? ages[3] <= 71 : ages[3] < ages[2], label + 'day 4 drops (' + ages.join(',') + ')');
  T.ok(G.S.minutes > 0, label + 'minutes banked ' + G.S.minutes.toFixed(1)); if (!opts.passive) { T.ok(G.hasUnlock('towel') && G.hasUnlock('headband'), label + 'unlocks arrive'); }
  // day 5
  T.ok(S0().day === 5, label + 'day 5 arrives (' + S0().day + ')'); tap('confirm', .3); bcPlay(); game.advance(1.8); tap('confirm', .3); until(() => scene() === 'games', 30, .3); T.ok(scene() === 'games', label + 'games on day 5 (' + scene() + ')');
  until(() => scene() === 'ending', 600, 1); T.ok(scene() === 'ending', label + 'ending (' + scene() + ')'); for (let i = 0; i < 200 && scene() === 'ending'; i++) tap('confirm', .8); until(() => scene() === 'credits', 40, .5);
  for (let i = 0; i < 60 && scene() === 'credits'; i++) tap('confirm', 1); game.advance(1); T.ok(scene() === 'island', label + 'credits lead to free play island (' + scene() + ')');
  T.ok(G.S.ending && G.S.free, label + 'ending flag and free play open'); T.ok(G.actList.filter(a => a.discipline !== 'Duel').every(a => G.bestStars(a.id) >= 0 && (opts.passive || G.S.best[a.id])), label + 'all 12 activities played'); const fin = G.spineAge(); T.ok(opts.passive ? fin <= 71 : fin < 71, label + 'spine age fell: ' + fin);
  T.ok(!game.errors.length, label + 'playthrough errors: ' + err());
  game.go('title'); game.advance(.5); T.ok(G.scenes.title.pills.items.find(i => i.label === 'Free Play') && !G.scenes.title.pills.items.find(i => i.label === 'Free Play').disabled, label + 'title offers Free Play');
}
export async function run(T) { await playthrough(T, {}); await playthrough(T, { passive: true }); }
