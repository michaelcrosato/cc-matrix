// AI Hub with a fake client: the title skipped; connect(ghost, [1, 4], card); ready() without input; the card's answers;
// the start syncs to time() >= 0; ghost sends at 8-12 Hz with area; progress once a second; result({ time }) at the
// goal; time-up reports once; end stops input and sound; no quit, restart or Dev Mode; connect -> null boots the title
import { boot } from '../lib/boot.mjs';
const fake = (o = {}) => { const h = { active: true, calls: [], handlers: {}, t: -Infinity, sent: [], prog: [], results: [], answers: [], readyN: 0,
  connect(a) { h.calls.push(a); return Promise.resolve(o.nullConnect ? null : { me: 0, players: [{ id: 0, name: 'Ana', color: '#e8443a' }, { id: 1, name: 'Bé✿', color: '#3b82f6' }], seed: 77, mode: 'ghost', round: 1, limitMs: 240000 }); },
  ready() { h.readyN++; }, answer(a) { h.answers.push(a); }, on(ev, fn) { (h.handlers[ev] = h.handlers[ev] || []).push(fn); return () => {}; },
  emit(ev, ...a) { for (const fn of h.handlers[ev] || []) fn(...a); }, time() { return h.t; }, send(d, opt) { h.sent.push([d, opt]); return true; }, progress(p) { h.prog.push(p); }, result(r) { h.results.push(r); },
  rng(l) { let x = 12345 + l.length; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }, seeded: true }; return h; };
export default async function (t) {
  { const H = fake(), { OB, game, I } = boot({ aihub: H }); game.advance(.2); await new Promise(r => setTimeout(r, 0)); game.advance(.2);
    t('in a session the title is skipped for the card', game.sceneName === 'hubcard', game.sceneName);
    t('connect: ghost, seats [1, 4], our own card', H.calls[0] && H.calls[0].mode === 'ghost' && H.calls[0].seats[0] === 1 && H.calls[0].seats[1] === 4 && H.calls[0].card === true, JSON.stringify(H.calls[0]));
    t('ready() comes without a key press', H.readyN === 1, H.readyN);
    I.tap('confirm'); game.advance(.1); t('Enter or Cross answers ready', H.answers.includes('ready'), H.answers.join());
    I.tap('alt'); game.advance(.1); t('Triangle or T answers more time', H.answers.includes('more'));
    t('no quit, restart or Dev Mode in the pause menu', OB.game.o.menu.quit === false && OB.game.o.menu.items.length === 0, JSON.stringify(OB.game.o.menu.items));
    H.t = -3000; H.emit('start', { in: 3000 }); game.advance(.2); t('start runs the race', game.sceneName === 'race' && OB.Race.current.mode === 'hub', game.sceneName);
    game.advance(1); t('the cars hold still before time() reaches 0', OB.Race.current.phase === 'countdown' && OB.Race.current.p1.car.v === 0, OB.Race.current.phase);
    H.t = 1; game.advance(.2); t('GO when time() >= 0', OB.Race.current.phase === 'race');
    const s0 = H.sent.length, p0 = H.prog.length; for (let i = 0; i < 300; i++) { H.t += 1000 / 120; game.advance(1 / 120); }
    const n = H.sent.length - s0, hz = n / 2.5; t('ghost sends at 8-12 Hz, unreliable, with an area', hz >= 8 && hz <= 12.5 && H.sent[H.sent.length - 1][0].area === OB.Race.current.p1.stage && H.sent[H.sent.length - 1][1].reliable === false, hz.toFixed(1));
    t('progress once a second', H.prog.length - p0 >= 2 && H.prog.length - p0 <= 3 && typeof H.prog[H.prog.length - 1].score === 'number', H.prog.length - p0);
    // a ghost from another player shows while it shares our stage
    H.emit('message', { t: 'g', area: 'S1', z: OB.Race.current.p1.car.z + 2000, x: .4, v: 250, yaw: 0 }, 1); game.advance(.2);
    t('the other player is drawn as a ghost with a safe name', OB.Race.current.ghosts.length === 1 && /^[\x20-\x7e]+$/.test(OB.Race.current.ghosts[0].name), JSON.stringify(OB.Race.current.ghosts[0] && OB.Race.current.ghosts[0].name));
    // the goal reports the time
    const r = OB.Race.current, d = r.p1; r.place(d, 'S5', OB.World.stage('S5').sprintZ - 3 * 200, 0); d.routeIdx = 2; d.car.v = 200; d.input = null; OB.cheats.noCollide = true; OB.cheats.noTraffic = true; d.brain = { intent: () => ({ steer: -d.car.x, gas: 1, brake: 0 }) };
    for (let i = 0; i < 240; i++) { H.t += 1000 / 120; game.advance(1 / 120); }
    t('the goal reports result({ time })', H.results.length === 1 && typeof H.results[0].time === 'number' && H.results[0].stats, JSON.stringify(H.results));
    H.emit('time-up', { graceMs: 3000 }); game.advance(.1); t('time-up after a result reports nothing more', H.results.length === 1);
    H.emit('end', { reason: 'finished', standings: [[0], [1]] }); game.advance(.2); t('end stops the round and the sound', game.sceneName === 'hubover' && game.audio.muted, game.sceneName);
    t('no errors in the session', game.errors.length === 0, game.errors.map(e => e.message).join(' | ')); }
  { const H = fake(), { OB, game } = boot({ aihub: H }); game.advance(.2); await new Promise(r => setTimeout(r, 0)); H.t = 0; H.emit('start', {}); game.advance(2);
    H.emit('time-up', { graceMs: 3000 }); game.advance(.1); t('time-up during the race reports result({ score }) once', H.results.length === 1 && typeof H.results[0].score === 'number', JSON.stringify(H.results));
    H.emit('time-up', { graceMs: 3000 }); game.advance(.1); t('only once', H.results.length === 1);
    H.emit('leave', { id: 1 }); t('leave drops that player', !OB.Hub.ghosts.has(1)); }
  { const H = fake({ nullConnect: true }), { game } = boot({ aihub: H }); game.advance(.2); await new Promise(r => setTimeout(r, 0)); game.advance(.5); t('connect -> null boots to the title', game.sceneName === 'title', game.sceneName); }
}
