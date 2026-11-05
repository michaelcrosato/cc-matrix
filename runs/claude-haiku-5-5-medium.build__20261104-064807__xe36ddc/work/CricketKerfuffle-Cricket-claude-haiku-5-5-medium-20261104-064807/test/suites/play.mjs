// play: a scripted person plays the game through its own inputs (the buttons and the stick), step by step, and the
// match's own rules decide the result. Every Nets lesson is played to its goal or its last ball; two co-op and two
// 2-v-2 matches are played through every joined player's inputs to a result.
import { loadGame } from '../lib.mjs';
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// the bot for one lesson: presses the buttons on the right step of each ball, reading the live state
export function lessonBot(id, I) {
  let pressedFor = -1, holdUntil = -1, runAt = -1, dir = null, lastShot = -1, setupAt = -9, flightAt = -9, prevPhase = '', heldAt = -9;
  return function step(s, now) {
    if (!s.phase) return;
    const ball = s.logLen;
    // the moment the ball left the hand: the start of its flight, as the screen shows it
    if (s.phase === 'flight' && prevPhase !== 'flight') flightAt = now;
    prevPhase = s.phase;
    const sinceRelease = now - flightAt;
    if (holdUntil > 0 && now >= holdUntil) { if (dir) I.hold(dir, false); dir = null; holdUntil = -1; }
    switch (id) {
      case 1: case 2: case 3: case 8: case 11: {
        // batting: the shot (or loft, or defence) at the contact moment of each ball; 11 leaves every ball
        if (s.phase === 'flight' && s.until !== null && s.until <= 0.125 && s.until > 0.03 && pressedFor !== ball) {
          pressedFor = ball;
          if (id === 1) I.tap('shot');
          else if (id === 2) I.tap('loft');
          else if (id === 3) I.tap('block');
          else if (id === 8) I.tap('special');
          else if (id === 11) { /* a lesson in not playing: the LBW call is the point */ }
        }
        if (id === 11 && s.phase === 'dead' && s.reviewable) I.tap('special');
        if (id === 4 && s.phase === 'play') {
          if (runAt < 0) runAt = now + 0.35;
          if (now >= runAt) { I.tap('run'); runAt = now + 1.4; }
        }
        if (s.phase !== 'play') runAt = -1;
        break;
      }
      case 4: {
        if (s.phase === 'flight' && s.until !== null && s.until <= 0.125 && s.until > 0.03 && pressedFor !== ball) { pressedFor = ball; I.tap('shot'); }
        // the batter calls a run after each good hit, and turns for another when he is running
        if (s.phase === 'play') {
          if (runAt < 0) runAt = now + 0.35;
          if (now >= runAt) { I.tap('run'); runAt = now + 1.4; }
        }
        if (s.phase !== 'play') runAt = -1;
        break;
      }
      case 5: {
        // charge at the start of the flight, then the shot at the (new, earlier) contact moment
        if (s.phase === 'flight' && sinceRelease < 0.05 && pressedFor !== ball) { pressedFor = ball; I.tap('charge'); }
        if (s.phase === 'flight' && s.until !== null && s.until <= 0.125 && s.until > 0.03 && lastShot !== ball) { lastShot = ball; I.tap('shot'); }
        break;
      }
      case 6: {
        // bowling: start the run-up, then release on the sweet spot of the meter
        // a person presses again if the first press is lost (the screen was still fading in)
        if (s.phase === 'setup' && now - setupAt > 0.5) { setupAt = now; I.tap('shot'); }
        if (s.phase === 'runup' && s.meter !== null && s.dt > s.dur - 0.7 && Math.abs(s.meter - 0.5) < 0.03 && lastShot !== ball) { lastShot = ball; I.tap('shot'); }
        break;
      }
      case 7: {
        // aftertouch: bowl, then push the stick sideways in the first quarter second of the flight
        if (s.phase === 'setup' && now - setupAt > 0.5) { setupAt = now; I.tap('shot'); }
        if (s.phase === 'runup' && s.meter !== null && s.dt > s.dur - 0.7 && Math.abs(s.meter - 0.5) < 0.05 && lastShot !== ball) { lastShot = ball; I.tap('shot'); }
        if (s.phase === 'flight' && sinceRelease < 0.06 && lastShot === ball && dir === null) { dir = 'right'; I.hold('right', true); holdUntil = now + 0.1; }
        break;
      }
      case 9: case 10: {
        // fielding: steer the active fielder to the ball; the catch ring is pressed when it closes; a held ball is thrown
        if (s.phase === 'setup' && now - setupAt > 0.5) { setupAt = now; I.tap('shot'); }
        if (s.phase === 'runup' && s.meter !== null && s.dt > s.dur - 0.7 && Math.abs(s.meter - 0.5) < 0.05 && lastShot !== ball) { lastShot = ball; I.tap('shot'); }
        if ((s.phase === 'play' || s.phase === 'flight') && s.fielders.length && s.ball) {
          const [fx, fy] = s.fielders[0], [bx, by] = s.ball;
          const want = [bx - fx, by - fy];
          const d = { right: want[0] > 6, left: want[0] < -6, down: want[1] > 6, up: want[1] < -6 };
          for (const k of ['left', 'right', 'up', 'down']) I.hold(k, !!d[k]);
        }
        // a catch is pressed when the ring is at its moment, not before it
        if (s.ring && s.ringT !== null && Math.abs(s.ringT) < 0.03 && lastShot !== 'ring' + ball) { lastShot = 'ring' + ball; I.tap('shot'); }
        // a held ball is thrown: the striker's end (shot) or the bowler's end (loft), pressed again if the first is lost
        if (s.held && now - heldAt > 0.4) { heldAt = now; I.tap(id === 9 ? 'shot' : (s.throws % 2 ? 'loft' : 'shot')); }
        break;
      }
    }
  };
}

export async function run({ check }) {
  for (const id of LESSONS) {
    const g = loadGame();
    g.game.advance(0.3);
    g.game.debug.lesson(id);
    const I = g.I;
    const bot = lessonBot(id, I);
    let steps = 0, now = 0;
    const cap = 120 * 60 * 30;
    let s = g.game.debug.live();
    while (steps < cap && s.scene !== 'lessonresult') {
      // the bot reads the state before each step, as a person looks at the screen before pressing
      bot(s, now);
      g.game.advance(1 / 120); steps++; now += 1 / 120;
      s = g.game.debug.live();
      if (s.lesson === true) break;
    }
    for (const k of ['left', 'right', 'up', 'down']) I.hold(k, false);
    g.game.advance(0.05);
    const after = g.game.debug.live();
    check(`lesson ${id} is played to its goal through the inputs`, after.lesson === true, `balls ${after.balls}, time ${(steps / 120).toFixed(0)} s, scene ${after.scene}`);
    check(`lesson ${id} runs without errors`, g.errs().length === 0, g.errs().join(' | '));
  }
}
