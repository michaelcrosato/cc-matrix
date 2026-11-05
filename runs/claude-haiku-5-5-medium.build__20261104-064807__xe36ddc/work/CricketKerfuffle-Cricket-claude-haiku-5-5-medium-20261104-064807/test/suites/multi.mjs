// co-op and 2 v 2, played: every joined player presses the buttons their moment calls for (the batter, the bowler, the
// fielder, the runner), and the match's own rules route each press to the right player. A full match to a result.
import { loadGame } from '../lib.mjs';
function playMulti(layout, humans) {
  const g = loadGame();
  g.game.advance(0.3);
  for (let i = 1; i < humans; i++) g.game.addPlayer(i === 1 ? { keys: 'right' } : { pad: i - 2 });
  g.game.advance(0.2);
  g.game.debug.setLayout(layout);
  const sides = layout === 'coop' ? [0] : [0, 1];
  g.game.debug.startMatch({ teams: [0, 1], ground: 'green', overs: 2, wickets: 5, kerf: false, batFirst: 0, seed: 61, humanSides: sides, mode: 'multi' }, {});
  const P = g.game.players;
  let now = 0;
  let s = g.game.debug.live(), steps = 0, shots = 0, catches = 0, ballsSeen = new Set();
  const cap = 120 * 60 * 25;
  let last = { contact: 0, release: 0, ring: 0, throwFor: -1, flightCheck: -1 };
  while (steps < cap && s.scene !== 'results' && s.scene !== 'lessonresult' && !(s.phase === 'end')) {
    // every human reads the moment: a batter at contact, a bowler on the meter, a fielder on the ring, a runner calls
    // each moment is decided once, and then every joined player presses: the routing gives each press to the right person
    const contactNow = s.phase === 'flight' && s.until !== null && s.until <= 0.125 && s.until > 0.03 && last.contact !== s.logLen;
    const setupNow = s.phase === 'setup' && now - (last.setupAt || -9) > 0.5;
    const releaseNow = s.phase === 'runup' && s.meter !== null && s.dt > s.dur - 0.7 && Math.abs(s.meter - 0.5) < 0.05 && last.release !== 'rel' + s.logLen;
    const throwNow = s.held && last.throwFor !== s.logLen;
    if (contactNow) { last.contact = s.logLen; shots++; }
    if (setupNow) last.setupAt = now;
    if (releaseNow) last.release = 'rel' + s.logLen;
    if (throwNow) last.throwFor = s.logLen;
    for (const p of P) {
      if (contactNow) p.tap('shot');
      if (setupNow) p.tap('shot');
      if (releaseNow) p.tap('shot');
      if (s.ring) { p.tap('shot'); catches++; }
      if (throwNow) p.tap('shot');
      if (s.phase === 'play' && steps % 170 === 0) p.tap('run');
      if (s.fielders.length && s.ball && (s.phase === 'play' || s.phase === 'flight')) {
        const [fx, fy] = s.fielders[0], [bx, by] = s.ball;
        const d = { right: bx - fx > 6, left: bx - fx < -6, down: by - fy > 6, up: by - fy < -6 };
        for (const k of ['left', 'right', 'up', 'down']) p.hold(k, !!d[k]);
      }
    }
    g.game.advance(1 / 120); steps++; now += 1 / 120;
    s = g.game.debug.live();
    ballsSeen.add(s.logLen);
  }
  for (const p of P) for (const k of ['left', 'right', 'up', 'down']) p.hold(k, false);
  const snap = g.snap();
  return { g, steps, shots, catches, balls: s.logLen, scene: s.scene, phase: s.phase, errors: g.errs(), result: snap.match && snap.match.result, coverage: snap.coverage };
}
export async function run({ check }) {
  for (const [layout, humans] of [['coop', 2], ['2v2', 4]]) {
    const r = playMulti(layout, humans);
    check(`${layout}: a match is played to a result with ${humans} players`, r.balls >= 6 && (r.result !== null || r.scene === 'results'), `balls ${r.balls}, scene ${r.scene}, phase ${r.phase}`);
    check(`${layout}: the human batters and bowlers made contacts and deliveries`, r.shots > 3 && (r.coverage.release || 0) > 3, `shots ${r.shots}, releases ${r.coverage.release}`);
    check(`${layout}: no errors in play`, r.errors.length === 0, r.errors.slice(0, 2).join(' | '));
  }
}
