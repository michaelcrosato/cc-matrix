// The scripted playthrough of the whole game: from the title through every Champon Road node to the ending, credits,
// initials and back to the title, with real inputs for the menus and an Autopilot for the fights, drills and bonuses.
import { loadGame } from './lib/load.mjs';
export function drive(G, o = {}) {
  const { KC, game, I } = G, log = [], belts = [], seen = new Set(); let last = '', guard = 0, nodeT = 0, lastNode = -1;
  KC.TUNE.pointsToWin = o.points || 1; if (o.cpuLevel) KC.TUNE.cpuLevel = o.cpuLevel; if (o.invincible) KC.DEVT.invincible = true;
  for (let step = 0; step < (o.maxSteps || 9000); step++) {
    const sc = game.sceneName, S = game.scene; seen.add(sc);
    if (sc !== last) { log.push(sc + (KC.Story.s ? '@' + KC.Story.s.node : '')); last = sc; }
    if (KC.Story.s && KC.Story.s.node !== lastNode) { lastNode = KC.Story.s.node; nodeT = 0; } nodeT += .25;
    if (nodeT > 600) return { log, error: 'node ' + lastNode + ' took over 10 minutes', seen };
    if (sc === 'title') { if (o.stopAtTitle && log.length > 3) break; if (S.mode === 'press') I.tap('start'); else { const i = S.menu.items.findIndex(it => it.id === 'road'); S.menu.i = i; I.tap('confirm'); } }
    else if (sc === 'cutscene' || sc === 'road' || sc === 'vs' || sc === 'promotion' || sc === 'records') I.tap('confirm');
    else if (sc === 'fight') { if (!S._auto) { S._auto = true; game.debug.autopilot(0, o.level || 10); if (o.lose && KC.Story.s.node === o.lose.node && (o.lose.n -= 1) >= 0) game.debug.control(0, { posture: 'n', press: null }); } if (S.result) I.tap('start'); }
    else if (sc === 'practice') { S.d.autopilot = true; }
    else if (sc === 'bonus') { S.B.auto = true; }
    else if (sc === 'continue') { if (o.onContinue) o.onContinue(S); else I.tap('confirm'); }
    else if (sc === 'gameover') I.tap('confirm');
    else if (sc === 'credits') I.tap('start');
    else if (sc === 'initials') I.tap('confirm');
    if (sc === 'promotion' && KC.Story.s) belts.push(KC.Story.s.rank);
    G.adv(.25);
    if (o.until && o.until()) break;
    if (log.length > 4 && sc === 'title' && KC.Story.s && KC.Story.s.done) break;
  }
  return { log, belts: [...new Set(belts)], seen };
}
export default async t => {
  const G = loadGame(), { KC, game } = G; G.adv(.5);
  const r = drive(G, { invincible: true, cpuLevel: 1 });
  const s = KC.Story.s;
  t.check('the playthrough reaches the end of the Champon Road', s && s.done, r.error || r.log.join(' > '));
  t.check('back on the title after the ending', game.sceneName === 'title', game.sceneName);
  for (const sc of ['cutscene', 'practice', 'road', 'vs', 'fight', 'promotion', 'bonus', 'credits']) t.check('visited ' + sc, r.seen.has(sc));
  t.check('ranks rise to CHAMP in order', JSON.stringify(r.belts) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]), r.belts);
  t.check('the score grew', s && s.score > 20000, s && s.score);
  t.check('Mei and Kyabetsu unlocked, and the classic palette', KC.unlocks().mei && KC.unlocks().kyabetsu && KC.unlocks().classic, KC.unlocks());
  t.check('a tuned run records no high score (dev values changed)', KC.cab.table('story').length === 0, KC.cab.table('story'));
  t.check('no errors', !game.errors.length, game.errors.map(e => e.message).slice(0, 3));
  // CONTINUE: lose the first match once (P1 stands still), continue, and the score resets
  { const G2 = loadGame(), K2 = G2.KC; G2.adv(.5); let cont = 0, scoreBefore = -1;
    const r2 = drive(G2, { level: 10, lose: { node: 2, n: 1 }, until: () => K2.Story.s && K2.Story.s.node >= 3, onContinue: S => { cont++; scoreBefore = K2.Story.s.score; K2.DEVT.invincible = true; G2.I.tap('confirm'); } });
    t.check('a lost match offers CONTINUE', cont === 1, r2.log.join(' > ')); t.check('continuing retries and wins the match', K2.Story.s.node >= 3 && K2.Story.s.conts === 1, K2.Story.s); }
  // GAME OVER: lose and give up -> initials (if it qualifies) -> title
  { const G3 = loadGame(), K3 = G3.KC; G3.adv(.5);
    let over = false; const r3 = drive(G3, { level: 10, lose: { node: 2, n: 1 }, until: () => { if (G3.game.sceneName === 'gameover') over = true; return over && G3.game.sceneName === 'title'; }, onContinue: S => { S.menu.i = 2; G3.I.tap('confirm'); } });
    t.check('giving up shows GAME OVER and returns to the title', r3.log.includes('gameover@2') || r3.log.some(l => l.startsWith('gameover')), r3.log.join(' > ')); t.check('the save is cleared after game over', !K3.store('save')); }
  // an honest run: an Autopilot L7 vs the normal ladder on Normal, 2 points to win: no soft-locks through the first 6 nodes
  { const G4 = loadGame(), K4 = G4.KC; G4.adv(.5); const r4 = drive(G4, { level: 7, points: 2, until: () => K4.Story.s && K4.Story.s.node >= 6, maxSteps: 12000, onContinue: S => G4.I.tap('confirm') });
    t.check('an honest run reaches the harbor without soft-locks', K4.Story.s && K4.Story.s.node >= 6 && !r4.error, (r4.error || '') + r4.log.join(' > ')); t.check('honest run: no errors', !G4.game.errors.length, G4.game.errors.map(e => e.message).slice(0, 3)); }
};
