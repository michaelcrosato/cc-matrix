// the whole story, played: New Game from the title, the prologue, the five chapters (each a match played by the bot
// through its own inputs, with the chapters' cutscenes and results pressed through), a retry when a chapter is lost,
// and the ending back to the title. Umpire mistakes in these matches give reviews, which the batter's bot calls.
import { loadGame } from '../lib.mjs';

// one step of the bot in a match: a single human who bats, bowls and fields as the moment calls for
export function matchStep(s, st, now, I) {
  const contactNow = s.phase === 'flight' && s.until !== null && s.until <= 0.125 && s.until > 0.03 && st.contact !== s.logLen;
  const setupNow = s.phase === 'setup' && now - st.setupAt > 0.5;
  const releaseNow = s.phase === 'runup' && s.meter !== null && s.dt > s.dur - 0.7 && Math.abs(s.meter - 0.5) < 0.05 && st.release !== s.logLen + 'r';
  const throwNow = !!s.held && st.throwFor !== s.logLen;
  if (contactNow) { st.contact = s.logLen; I.tap('shot'); }
  if (setupNow) {
    st.setupAt = now; I.tap('shot');
    // the bowler's marker: the stick nudges it up the pitch in each set-up, a line the bot found by trying the four
    // directions (the marker stays where it is, so the nudges are what set the line for the delivery)
    st.dir = 'up'; st.holdUntil = now + 0.35;
  }
  if (s.phase === 'setup' && st.dir && now < st.holdUntil) I.hold(st.dir, true);
  else if (st.dir) { for (const k of ['up', 'down', 'left', 'right']) I.hold(k, false); st.dir = null; }
  if (releaseNow) { st.release = s.logLen + 'r'; I.tap('shot'); }
  if (s.ring) I.tap('shot');
  if (throwNow) { st.throwFor = s.logLen; I.tap('shot'); }
  if (s.phase === 'play' && now >= st.runAt) { I.tap('run'); st.runAt = now + 1.4; }
  if (s.phase === 'dead' && s.reviewable && st.reviewFor !== s.logLen) { st.reviewFor = s.logLen; I.tap('special'); }
  if (s.fielders && s.fielders.length && s.ball && (s.phase === 'play' || s.phase === 'flight')) {
    const [fx, fy] = s.fielders[0], [bx, by] = s.ball;
    const d = { right: bx - fx > 6, left: bx - fx < -6, down: by - fy > 6, up: by - fy < -6 };
    for (const k of ['left', 'right', 'up', 'down']) I.hold(k, !!d[k]);
  }
}

export async function run({ check }) {
  const g = loadGame({ storage: true });
  g.game.advance(0.3);
  g.game.settings.difficulty = 'Village';
  const I = g.I;
  let now = 0, steps = 0, lastTap = -9, prevScene = '', downs = 0, storyEntries = 0, reviews = 0, resultsDone = false, matches = 0;
  const st = { contact: -1, setupAt: -9, release: '', throwFor: -1, runAt: 0, reviewFor: -1, dir: null, holdUntil: -1, nBall: 0 };
  const CAP = 120 * 60 * 240, RETRY_CAP = 40;
  let stop = '';
  while (steps < CAP) {
    const s = g.game.debug.live();
    const prof = g.game.debug.profile();
    if (s.scene !== prevScene) {
      if (s.scene === 'story') { storyEntries++; downs = Math.max(0, prof.chapter - 1); }
      prevScene = s.scene; lastTap = now - 0.3;
    }
    if (s.scene === 'title') {
      if (prof.chapter > 5) { stop = 'ending'; break; }
      if (now - lastTap > 0.5) { I.tap('confirm'); lastTap = now; }
    } else if (s.scene === 'cutscene') {
      if (now - lastTap > 0.35) { I.tap('confirm'); lastTap = now; }
    } else if (s.scene === 'story') {
      if (now - lastTap > 0.25) {
        if (downs > 0) { I.tap('down'); downs--; } else { I.tap('confirm'); }
        lastTap = now;
      }
      if (storyEntries > RETRY_CAP) { stop = 'too many retries'; break; }
    } else if (s.scene === 'match') {
      matchStep(s, st, now, I);
    } else if (s.scene === 'results') {
      if (!resultsDone) { resultsDone = true; matches++; reviews += g.snap().coverage.review || 0; }
      if (now - lastTap > 0.5) { I.tap('confirm'); lastTap = now; }
    }
    if (s.scene !== 'results') resultsDone = false;
    g.game.advance(1 / 120); steps++; now += 1 / 120;
  }
  for (const k of ['left', 'right', 'up', 'down']) I.hold(k, false);
  const prof = g.game.debug.profile();
  check('the story runs from New Game to the ending', stop === 'ending' && prof.chapter === 6, 'stop ' + (stop || 'cap') + ', chapter ' + prof.chapter + ', matches ' + matches);
  check('every chapter is won and earns stars', prof.stars.length >= 5 && prof.stars.slice(0, 5).every(x => x >= 0) && prof.stars.slice(0, 5).some(x => x > 0), JSON.stringify(prof.stars));
  check('the story shows at least one review', reviews > 0, 'reviews ' + reviews);
  check('no errors in the story', g.errs().length === 0, g.errs().slice(0, 3).join(' | '));
}
