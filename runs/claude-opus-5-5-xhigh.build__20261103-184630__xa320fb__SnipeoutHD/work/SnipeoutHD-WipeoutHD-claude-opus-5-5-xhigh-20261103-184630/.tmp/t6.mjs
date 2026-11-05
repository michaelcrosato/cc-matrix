import { load } from '../tests/lib/vm.mjs';
const { SN } = load();
// a human driven by a bot with some random noise, then replay
const T = SN.getTrack('karakum');
const ent = SN.field({ humans: [{ pilot: 'vale', team: 'kestrel' }] });
const R = new SN.Race({ track: T, mode: 'race', cls: 'FLARE', laps: 1, seed: 42, entrants: ent, intro: true });
let n = 0; const rnd = SN.rng(5);
while (R.state !== 'results' && n < 120 * 300) {
  if (n === 200) R.skipIntro();
  const c = Object.assign({}, SN.AI.controls(R.player, R, { skill: 1, brain: 'bot' }));
  c.steer += (rnd() - .5) * .3; c.thrust = c.thrust || (R.state === 'countdown' && R.stateT > 1.6) ? 1 : 0; c.firePressed = rnd() < .01; c.absorb = rnd() < .002;
  R.setControls(0, c); R.step(1/120); n++;
}
console.log('race', R.state, 'steps', n, 'hash', R.hash(), 'player place', R.player.place, 'frames', R.recording.frames[0].length, 'json KB', (JSON.stringify(R.recording).length/1024).toFixed(1));
const v = SN.Replay.verify(R.recording);
console.log('replay ok', v.ok, v.hash, v.want);
