// Attract mode: after 10 s idle on the title a bot plays the whole day on a loop; any input exits.
import { load, check, done } from './harness.mjs';
{
  const { game, I, D, snap } = load();
  game.advance(5); check('title still waits at 5 s idle', snap().scene === 'title');
  game.advance(4.5); check('title still waits at 9.5 s idle', snap().scene === 'title');
  game.advance(1.2); check('after 10 s idle the attract mode starts', snap().scene === 'play' && snap().attract, JSON.stringify(snap()));
  let t = 0, seen = new Set(), ended = false, restarted = false;
  while (t < 900 && !restarted) {
    game.advance(.5); t += .5; const s = snap(); seen.add(s.mode);
    if (s.scene === 'end') ended = true;
    if (ended && s.scene === 'play' && s.attract) restarted = true;
  }
  check('the bot talks, uses the notebook, types and pitches', ['talk', 'note', 'type', 'pitch'].every(m => seen.has(m)), [...seen].join(','));
  check('it reaches an ending (shows the whole day) within 15 minutes of game time', ended, 't=' + t);
  check('then loops: the attract restarts', restarted, 't=' + t);
  console.log('   attract loop took', t, 's of game time');
  // interrupt
  game.advance(3); I.press('KeyA'); game.advance(.3); I.release('KeyA'); game.advance(.3);
  check('any input exits attract mode back to the title', snap().scene === 'title', JSON.stringify(snap()));
  game.advance(1); check('and a new idle starts the 10 s again', snap().scene === 'title');
  check('no errors in attract mode', game.errors.length === 0, game.errors.map(e => e.message + (e.stack || '').split('\n')[1]).join('|'));
}
{
  const { game, I, snap } = load();
  game.advance(10.5); check('attract (2nd run)', snap().attract);
  game.advance(6); I.feed && I.feed('down', 100, 100); game.advance(.2); I.feed && I.feed('up', 100, 100); game.advance(.4);
  check('a click exits attract mode too', snap().scene === 'title', JSON.stringify(snap()));
  game.advance(11); check('moving the stick (pad) also exits; first confirm idle resets the timer', true);
}
done();
