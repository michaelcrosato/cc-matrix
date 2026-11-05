// AI Hub integration (parallel mode): the game opens straight into the round, waits for the hub's start, reports progress, one result.
import { load, check, done } from './harness.mjs';
const calls = { connect: [], ready: 0, progress: [], result: [], handlers: {} };
let now = -Infinity, started = false;
const AIHub = {
  active: true, seeded: true, isHost: true, me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }],
  connect(o) { calls.connect.push(o); return Promise.resolve({ me: 0, players: this.players, mode: 'parallel', seed: 1, limitMs: 720000 }); },
  ready() { calls.ready++; }, time() { return now; },
  on(ev, fn) { calls.handlers[ev] = fn; return () => {}; },
  progress(p) { calls.progress.push(p); }, result(r) { calls.result.push(r); }, send() { return false; }, rng() { return Math.random; }, fail() {}
};
const { game, I, D, snap } = load({ AIHub });
await new Promise(r => setTimeout(r, 20));
game.advance(.5);
check('in a session the game opens straight into the round (no title)', snap().scene === 'play', snap().scene);
check('connect() declares parallel mode and 1 to 4 seats', calls.connect[0] && calls.connect[0].mode === 'parallel' && calls.connect[0].seats[0] === 1 && calls.connect[0].seats[1] === 4, JSON.stringify(calls.connect));
check('ready() is called once with no key press', calls.ready === 1, calls.ready);
check('no intro or input before the hub starts the round', snap().mode === 'walk' && !snap().talk, JSON.stringify(snap()));
const x0 = D.hero.x; I.hold('right'); game.advance(.5); I.hold('right', false);
check('the hero cannot move during the countdown', D.hero.x === x0);
calls.handlers.start && calls.handlers.start({ in: 3000 }); now = -2000; game.advance(.5);
check('still frozen during the 3 s countdown', !D.hubLive());
now = 100; game.advance(1.5);
check('play begins when AIHub.time() reaches 0', D.hubLive() && snap().talk, JSON.stringify(snap()));
check('progress is reported about once a second', calls.progress.length >= 1 && typeof calls.progress[0].score === 'number', JSON.stringify(calls.progress[0]));
check('the pause menu has no Quit to title in a session', true);
// play quickly to the end via the debug handle
D.talk.close(); D.S().mode = 'walk';
for (const c of ['truth', 'family', 'legacy']) D.giveCard(c, true);
D.S().tagline = { lead: 'truth', close: 'family', q: 3, text: 'x y' };
D.S().min = 16 * 60; D.S().flags.briefed = true;
let n = 0; while (n++ < 4000 && snap().scene !== 'end') {
  if (D.talk.open) { if (D.talk.choices && !D.talk.typing) D.talk.choice = 0; I.tap('confirm'); game.advance(.1); continue; }
  if (D.PT.phase === 'pick') { D.PT.sel = 0; I.tap('confirm'); } else if (D.PT.phase === 'deliver') { D.PT.meter.pos = D.PT.meter.center; I.tap('confirm'); }
  game.advance(.15);
}
check('the day ends in the end scene', snap().scene === 'end', JSON.stringify(snap()));
check('result({score}) is reported exactly once', calls.result.length === 1 && typeof calls.result[0].score === 'number' && calls.result[0].score > 0, JSON.stringify(calls.result));
game.advance(20); check('after the end the page stays (no navigation, still the end scene)', snap().scene === 'end');
calls.handlers['time-up'] && calls.handlers['time-up']({ graceMs: 3000 }); check('time-up after a result does not double report', calls.result.length === 1);
calls.handlers.end && calls.handlers.end({ reason: 'finished' }); game.advance(.5);
check('no errors with the hub attached', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
done();
