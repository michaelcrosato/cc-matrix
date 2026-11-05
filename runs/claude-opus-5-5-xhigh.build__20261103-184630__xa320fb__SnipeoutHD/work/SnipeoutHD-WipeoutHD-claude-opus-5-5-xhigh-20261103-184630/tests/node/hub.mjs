// hub (a Node mock of AIHub): a session opens straight into the round (no title, menus or attract), ready() once with
// no key press, nothing moves before start, the card's answers (Enter: ready, △: more), the countdown on the hub's
// clock, progress every second, sends at most 20 a second (unreliable, small), an incoming message makes and moves a
// ghost, leave removes it, the result on finishing, time-up before the finish gives one result with a score, and end
// stops input, sound and sends.
import { load } from '../lib/vm.mjs';
import { bot, drive } from '../lib/bot.mjs';
function mockHub(game0) {
  const L = {}, log = { sent: [], progress: [], results: [], ready: 0, answers: [], scenes: new Set() };
  let t0 = null, clock = () => (globalThis.__G ? globalThis.__G.real * 1000 : 0);
  const rngs = {};
  const H = {
    active: true, seeded: true, log,
    connect: async () => (H.info = { me: 0, players: [{ id: 0, name: 'ALEX', color: '#e8443a' }, { id: 1, name: 'SAM', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 180000, seed: 99 }),
    ready() { log.ready++; }, answer(a) { log.answers.push(a); },
    time: () => t0 === null ? -Infinity : clock() - t0,
    on(ev, fn) { (L[ev] = L[ev] || []).push(fn); return () => {}; },
    emit(ev, ...a) { for (const f of L[ev] || []) f(...a); },
    start(ms = 3000) { t0 = clock() + ms; H.emit('start', { in: ms }); },
    send(d, o) { log.sent.push({ d, o, t: clock(), size: JSON.stringify(d).length }); return true; },
    progress(p) { log.progress.push(Object.assign({ t: clock() }, p)); }, result(r) { log.results.push(r); }, finish() {}, fail() {},
    rng(label) { let s = (label.length * 2654435761 + 99) >>> 0; return () => { s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0; return (s >>> 0) / 4294967296; }; }
  };
  return H;
}
export async function run(T) {
  // a full round: the card, the start, ghosts, progress, the result
  {
    const hub = mockHub(); const { SN, game, ctx } = load({ quiet: true, hub, before: c => { c.__G = null; } }); ctx.__G = game; globalThis.__G = game; await game.booted;
    const snap = () => game.debug.snapshot(), seen = new Set(), adv = s => { const n = Math.round(s * 120); for (let k = 0; k < n; k++) { game.advance(1 / 120); seen.add(game.sceneName); } };
    adv(2); T.check('a session opens on its own card (the session scene)', snap().scene === 'session' && !SN.hub.started, snap().scene);
    T.check('ready() once, with no key press', hub.log.ready === 1, hub.log.ready);
    const R = game.debug.race(), p0 = R.player.p; adv(2); T.check('nothing moves before start', R.player.p === p0 && R.state === 'countdown', [p0, R.player.p, R.state]);
    game.input.tap('confirm'); adv(.1); T.check('Enter answers ready on the card', hub.log.answers.includes('ready'), hub.log.answers);
    game.input.tap('more'); adv(.1); T.check('△ / M asks for more time', hub.log.answers.includes('more'), hub.log.answers);
    hub.emit('card', { left: 9000, paused: false, starting: false, ready: [0], asking: 0, asked: false }); adv(.1);
    hub.start(3000); adv(1); T.check('the countdown waits on the hub clock', R.state === 'countdown' && R.player.p === p0, R.state);
    // the other player's ghost
    hub.emit('message', { t: 'g', p: 200, u: 0, h: 14, y: 0, r: 0, v: 0, lap: 1, fin: 0 }, 1); adv(.2); hub.emit('message', { t: 'g', p: 260, u: 10, h: 14, y: 0, r: 0, v: 300, lap: 1, fin: 0 }, 1); adv(.3);
    const gs = R.ships.find(s => s.ghost); T.check('a message makes a ghost craft', gs && !gs.hidden, gs && [gs.hidden, gs.p]);
    adv(2.2); T.check('racing begins at time 0', R.state === 'racing' && hub.time() >= 0, [R.state, hub.time()]);
    const b = bot(SN, game); let t = 0; while (!hub.log.results.length && t < 200) { drive(game, [b], .5); t += .5; for (const n of [game.sceneName]) seen.add(n); }
    b.stop();
    T.check('the result: a time when the player finishes', hub.log.results.length === 1 && hub.log.results[0].time > 0, hub.log.results);
    T.check('never a title, menu or attract in a session', !seen.has('title') && !seen.has('front') && !seen.has('attract'), [...seen]);
    const P = hub.log.progress; T.check('progress about every second, with a score and a label', P.length > 60 && P.every(p => typeof p.score === 'number' && typeof p.label === 'string'), P.length);
    let maxRate = 0; for (let i = 0; i < hub.log.sent.length; i++) { const t1 = hub.log.sent[i].t; maxRate = Math.max(maxRate, hub.log.sent.filter(q => q.t >= t1 && q.t < t1 + 1000).length); }
    T.check('sends at most 20 a second', maxRate <= 20, maxRate); T.check('ghost sends are unreliable and small', hub.log.sent.filter(q => q.d.t === 'g').every(q => q.o && q.o.reliable === false && q.size < 16000), hub.log.sent.slice(0, 2));
    T.check('a done message on finishing (reliable)', hub.log.sent.some(q => q.d.t === 'done' && (!q.o || q.o.reliable !== false)));
    hub.emit('leave', { id: 1, reason: 'left' }); adv(.2); T.check('leave removes the ghost', gs.hidden, gs.hidden);
    const nSent = hub.log.sent.length; hub.emit('end', { reason: 'finished', standings: [[0], [1]] }); adv(1);
    game.input.tap('confirm'); adv(1); T.check('end: no more sends', hub.log.sent.length === nSent, hub.log.sent.length - nSent);
    T.check('end: the round is over and the sound stops', SN.hub.ended && SN.audio.muted, [SN.hub.ended, SN.audio.muted]);
    T.check('a session has no pause items, no quit', game.o.menu.quit === false && (game.o.menu.items() || []).length === 0, game.o.menu.quit);
    T.check('no errors in the session', game.errors.length === 0, game.errors.map(e => e.message));
  }
  // time-up before the finish: one result with a score
  {
    const hub = mockHub(); const { SN, game, ctx } = load({ quiet: true, hub }); globalThis.__G = game; await game.booted;
    game.advance(1); hub.start(3000); game.advance(10);
    hub.emit('time-up', { graceMs: 3000 }); game.advance(.5); hub.emit('time-up', { graceMs: 3000 }); game.advance(.5);
    T.check('time-up before the finish: one result, a score', hub.log.results.length === 1 && typeof hub.log.results[0].score === 'number' && hub.log.results[0].time === undefined, hub.log.results);
  }
}
