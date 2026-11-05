import { load } from '../lib/load.mjs';
export default function (check) {
  const { G, game, I } = load();
  // all-CPU matches end, with plausible scores, no errors
  let ended = 0, lens = [];
  for (let seed = 1; seed <= 5; seed++) {
    const m = new G.Match({ teams: [['mika', 'you'], ['ruby', 'tomo']], seed, skipIntro: true, fastPoints: true });
    let n = 0; while (m.phase !== 'end' && n < 120 * 60 * 10) { m.step(1 / 120); n++; }
    if (m.phase === 'end') ended++; lens.push(n / 120);
    const [a, b] = m.score; check('match ' + seed + ' ends by the rules', m.phase === 'end' && Math.max(a, b) >= m.to && Math.abs(a - b) >= 2, m.score.join('-'));
  }
  check('CPU matches finish', ended === 5);
  check('matches are a sensible length (20s to 8min)', lens.every(l => l > 15 && l < 480), lens.join(','));
  // a human-driven match: toss and serve with scripted input
  game.go('match', { cfg: { teams: [['mika', 'you'], ['ruby', 'tomo']], skipIntro: true }, humanTeam: 0, ctl: [{ type: 'ai' }, G.localCtl(I), { type: 'ai' }, { type: 'ai' }] }, { fade: 0 }); game.advance(.2);
  const m = game.scene.m; check('match scene has a match', !!m);
  game.advance(2); check('serve phase after the intro', m.phase === 'serve', m.phase);
  // team 0 serves first: slot 0 of team 0 is the server; the human is slot 1 ('you'), so the server is mika (CPU)
  game.advance(4);
  check('CPU server serves and the rally starts', m.phase === 'rally' || m.phase === 'point', m.phase);
  // human toss: make you the server
  const m2 = new G.Match({ teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true, ctl: [{ type: 'test', read() {} }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }] });
  m2.phase = 'serve'; m2.phaseT = 0; const sv = m2.serverPlayer(); check('human is the server', sv.human);
  sv.in.play = true; m2.step(1 / 120); sv.in.play = false; m2.step(1 / 120);
  check('Play tosses the ball', m2.ball.state === 'flight' && m2.ball.vz > 0, m2.ball.state);
  for (let i = 0; i < 70; i++) m2.step(1 / 120);
  sv.in.play = true; m2.step(1 / 120); sv.in.play = false;
  for (let i = 0; i < 80; i++) m2.step(1 / 120);
  check('a second press serves it over the net', m2.phase === 'rally' || m2.ball.x > 0 || m2.phase === 'point', m2.phase + ' ' + m2.ball.x);
  // faults: ball landing out gives the point to the other team
  const m3 = new G.Match({ teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }); m3.phase = 'rally'; Object.assign(m3.ball, { x: 100, y: 0, z: 3, vx: 0, vy: 0, vz: -50, state: 'flight', lastTeam: 0, served: true }); m3.step(1 / 120);
  check('ball out: the other team scores', m3.score[1] === 1 && m3.phase === 'point', m3.score.join('-'));
  const m4 = new G.Match({ teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }); m4.phase = 'rally'; Object.assign(m4.ball, { x: -30, y: 0, z: 3, vx: 0, vy: 0, vz: -50, state: 'flight', lastTeam: 1, served: true, touches: 1 }); m4.rally.hits = 2; m4.step(1 / 120);
  check('ball lands in: the other side scores', m4.score[1] === 1, m4.score.join('-'));
  // net: a flat ball into the net does not cross
  const m5 = new G.Match({ teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }); m5.phase = 'rally'; Object.assign(m5.ball, { x: -2, y: 0, z: 10, vx: 100, vy: 0, vz: 0, state: 'flight', lastTeam: 0, served: true }); for (let i = 0; i < 20; i++) m5.step(1 / 120);
  check('the net stops a low ball', m5.ball.x < 0, 'x=' + m5.ball.x);
  // tuning is live: raising the net changes its draw height value read by the sim
  G.T.netHeight = 40; const m6 = new G.Match({ teams: [['you', 'mika'], ['ruby', 'tomo']], skipIntro: true }); m6.phase = 'rally'; Object.assign(m6.ball, { x: -2, y: 0, z: 36, vx: 100, vy: 0, vz: 0, state: 'flight', lastTeam: 0, served: true }); for (let i = 0; i < 10; i++) m6.step(1 / 120);
  check('net height slider is live', m6.ball.x < 0 || m6.ball.vx < 50, m6.ball.x + ' ' + m6.ball.vx); G.resetTuning();
  check('reset restores the defaults', G.T.netHeight === 27, G.T.netHeight);
  check('no engine errors in match tests', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
}
