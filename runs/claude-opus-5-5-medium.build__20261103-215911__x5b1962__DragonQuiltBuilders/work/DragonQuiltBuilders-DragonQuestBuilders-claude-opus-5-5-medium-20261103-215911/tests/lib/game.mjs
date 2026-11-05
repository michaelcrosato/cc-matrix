// A booted game in a fresh context, with the helpers every suite uses.
import { load } from './load.mjs';
export async function boot(o = {}) {
  const env = load(Object.assign({ quiet: true }, o));
  const game = env.E.current; await game.booted;
  const I = game.input, snap = () => game.debug.snapshot();
  const run = s => game.advance(s);
  const press = (a, s = .1) => { I.tap(a); game.advance(s); };
  const hold = (a, s) => { I.hold(a); game.advance(s); I.hold(a, false); game.advance(1 / 60); };
  const errs = () => game.errors.map(e => e.where + ' [' + e.scene + ']: ' + e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')).join(' | ');
  // a play session at a story beat, without its opening
  const play = (beat, data = {}) => { game.go('play', Object.assign({ fresh: true, skipIntro: true }, data)); game.advance(.4); const ctx = game.debug.ctx; if (beat) { game.debug.beat(beat); game.advance(.3); } return ctx; };
  return Object.assign(env, { game, I, snap, run, press, hold, errs, play });
}
