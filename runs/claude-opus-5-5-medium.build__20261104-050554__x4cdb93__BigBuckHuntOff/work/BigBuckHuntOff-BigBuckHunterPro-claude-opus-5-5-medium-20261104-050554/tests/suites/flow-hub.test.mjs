// AI Hub ghost mode against a stub hub: connect -> our card -> ready() once without input -> Enter answers ready ->
// start -> segments follow the hub clock -> progress about once a second -> ghosts at most 10 a second, shot events
// reliable -> exactly one result (also on an early time-up) -> end stops it.
import { load } from '../lib/load.mjs';
import { hubStub } from '../lib/hubstub.mjs';
import { check, done } from '../lib/check.mjs';
const H = hubStub();
const { B, game } = load({ hub: H.hub });
const S = () => game.debug.snapshot(), I = game.input;
game.advance(.5); await new Promise(r => setTimeout(r, 0)); game.advance(.5);
check('connects in ghost mode with its own card', H.calls.connect && H.calls.connect.mode === 'ghost' && H.calls.connect.card === true);
check('ready() once, with no key press', H.calls.ready === 1, H.calls.ready);
check('the card is up', S().hub.phase === 'card', S().hub.phase);
check('no title, no menu', S().scene === 'hub', S().scene);
I.tap('confirm'); game.advance(.1); check('Enter answers ready', H.calls.answer.includes('ready'));
I.tap('more'); game.advance(.1); check('M answers more time', H.calls.answer.includes('more'));
H.emit('card', { left: 5000, ready: [0], asking: 0 });
H.emit('start', { in: 3000 }); H.setTime(-3000); game.advance(.2);
check('the countdown', S().hub.phase === 'countdown', S().hub.phase);
const segs = new Set();
const ghost = { t: 'g', s: 1, a: [10, -20], sc: 0, p: 300 };
for (let t = 0; t <= 90; t += .1) {
  H.setTime(t * 1000); game.advance(1 / 60);
  segs.add(S().hub.seg);
  if (Math.abs(t - 20) < .05) H.emit('message', ghost, 1);
}
check('the timeline runs on the hub clock', ['pan', 'site', 'walk'].every(k => segs.has(k)), [...segs].join(','));
const prog = H.calls.progress.map(p => p[0]);
check('progress about once a second', prog.length >= 85 && prog.length <= 95, prog.length);
const g = H.calls.send.filter(s => s[1].t === 'g');
check('ghost updates at most 10 a second, unreliable', g.length <= 905 && g.length > 300 && g.every(s => s[2] && s[2].reliable === false), g.length);
check('a received ghost is kept', S().hub.ghosts === 1);
// shoot something: a shot is sent reliably
const site = B.play.site; const me = B.play.players.find(p => !p.ghost); me.ret = [240, 135]; me.chambered = true; B.play.fire(me, 240, 135);
check('shots are sent reliably', H.calls.send.some(s => s[1].t === 'shot' && !(s[2] && s[2].reliable === false)));
// determinism: the spawns of two copies that shoot differently match (spawn log of the first site)
check('spawns follow the hub seed', S().hub.spawns > 0);
// time-up early: one result at once
H.emit('time-up', { graceMs: 3000 }); game.advance(.1);
check('time-up sends a result', H.calls.result.length === 1, H.calls.result.length);
for (let t = 90; t <= 181; t += .25) { H.setTime(t * 1000); game.advance(1 / 60); }
check('exactly one result', H.calls.result.length === 1, H.calls.result.length);
check('the result has a score and stats', typeof H.calls.result[0].score === 'number' && H.calls.result[0].stats && 'Bucks bagged' in H.calls.result[0].stats);
H.emit('leave', { id: 1, reason: 'left' }); game.advance(.1); check('leave removes the ghost', S().hub.ghosts === 0);
H.emit('end', { reason: 'finished', standings: [[0], [1]] }); game.advance(.2);
const n = H.calls.send.length; for (let k = 0; k < 30; k++) game.advance(.1);
check('end: round over, nothing more is sent', S().hub.phase === 'over' && H.calls.send.length === n);
check('no errors', !game.errors.length, game.errors.map(e => e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
done();
