// hub (Node): a stub AIHub, active: the title is skipped for our card; connect gets ghost and [1, 4]; ready() once with
// no input; the card answers ready and more; play starts at time() >= 0; sends at 10 Hz or less, unreliable; progress
// about every second; result once on the finish; messages make ghosts; leave removes one; end stops input and sound;
// no Save or Dev Mode in session menus; Options is ignored while Create is held
import { boot } from '../harness.mjs';
export default async check => {
  const log = { connect: null, ready: 0, answers: [], sends: [], progress: [], results: [] }, handlers = {};
  let now = -Infinity;
  const mk = seed => () => { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; };
  const hub = { active: true, connect(o) { log.connect = o; return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: '<b>Bo</b>', color: '#3b82f6' }], mode: 'ghost', seed: 42 }); },
    ready() { log.ready++; }, answer(a) { log.answers.push(a); }, time: () => now, on(ev, fn) { handlers[ev] = fn; return () => {}; },
    send(d, o) { log.sends.push([now, d, o]); return true; }, progress(p) { log.progress.push([now, p]); }, result(r) { log.results.push(r); }, rng: l => mk(l.length * 7 + 1)() };
  const { B, game, I } = await boot({ hub, hubInfo: hub.connect({ mode: 'ghost', seats: [1, 4], card: true }) });
  check('connect asks for ghost mode and 1 to 4 seats', log.connect && log.connect.mode === 'ghost' && log.connect.seats.join() === '1,4' && log.connect.card === true);
  check('the session opens on our own card, not the title', game.sceneName === 'hubcard', game.sceneName);
  game.advance(.5); check('ready() is called once with no input', log.ready === 1);
  check('the race world is dealt', B.S && B.S.floor === 'race' && B.S.race);
  I.tap('confirm'); game.advance(.1); check('Enter / ✕ answers ready', log.answers.includes('ready'));
  I.tap('alt2'); game.advance(.1); check('△ asks for more time', log.answers.includes('more'));
  handlers.card && handlers.card({ left: 5000, ready: [0], asking: 1 });
  handlers.start({ in: 3000 }); now = -3000; game.advance(.2); check('start moves to the race', game.sceneName === 'race');
  const P = B.S.party, y0 = P.cy; I.hold('fwd', true); game.advance(.5); I.hold('fwd', false); check('input is locked during the countdown', P.cy === y0);
  now = 0; const t0 = Date.now();
  // play the race: time runs with the game's steps
  const step = s => { for (let i = 0; i < s * 120; i++) { now += 1000 / 120; game.advance(1 / 120); } };
  I.hold('fwd', true); step(.6); I.hold('fwd', false); step(.4); check('play begins at time 0', P.cy < y0);
  step(3);
  const sendsInPlay = log.sends.filter(s => s[0] >= 0), rate = sendsInPlay.length / 4;
  check('sends stay at 10 Hz or less', rate <= 10.5 && sendsInPlay.length > 10, rate);
  check('the sends are unreliable position updates', sendsInPlay.every(s => s[2] && s[2].reliable === false && s[1].t === 'g'));
  check('progress about once a second', log.progress.length >= 3 && log.progress.length <= 6, log.progress.length);
  handlers.message({ t: 'g', area: 'race', x: 50, y: 300, yaw: 0, cx: 1, cy: 9, dir: 0, score: 100 }, 1); check('a message makes a ghost', !!B.Ghosts.list[1]);
  check('ghost names stay text', B.Ghosts.list[1].name === '<b>Bo</b>');
  check('standings include both players', B.Hub.standings().length === 2);
  handlers.leave({ id: 1, reason: 'left' }); check('leave removes the ghost', !B.Ghosts.list[1]);
  // finish: the bot runs the race through to the exit
  B.Bot.start({ plan: [['use', 1, 8, 'E'], ['wait', 1.2], ['go', 2, 5], ['clear'], ['use', 1, 2, 'W'], ['stow'], ['go', 4, 1], ['use', 4, 1, 'E'], ['wait', 1], ['go', 8, 4], ['clear'], ['go', 11, 6], ['grabAt', 11, 6], ['go', 10, 5, 'W'], ['hold', 'rock'], ['put'], ['wait', 1.5], ['go', 12, 2], ['go', 12, 1]] });
  for (let i = 0; i < 120 * 120 && !log.results.length; i++) { B.Play.extraCmds = B.Bot.step(1 / 120); now += 1000 / 120; game.advance(1 / 120); }
  check('reaching the exit sends one result with a time', log.results.length === 1 && typeof log.results[0].time === 'number', JSON.stringify(log.results) + ' ' + JSON.stringify(B.Bot.stuck) + ' ' + B.S.party.cx + ',' + B.S.party.cy);
  check('and a reliable done message', log.sends.some(s => s[1].t === 'done' && s[2].reliable));
  handlers['time-up']({ graceMs: 5000 }); check('time-up after a result sends nothing more', log.results.length === 1);
  check('no Save or Dev Mode in the session menu', game.o.menu.items().length === 0 && game.o.menu.saves === false && game.o.menu.quit === false);
  I.press('Pad8'); game.advance(1 / 60); check('Options is ignored while Create is held', !B.RaceScene.pausable || B.Hub.active && !B.Play.pausable); I.release('Pad8');
  handlers.end({ reason: 'finished' }); game.advance(.2); check('end stops input and sound', B.Hub.ended && game.audio.muted);
  check('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
  // time-up before any result: a score
  const log2 = { results: [] }, h2 = {}; let now2 = -Infinity;
  const hub2 = Object.assign({}, hub, { result: r => log2.results.push(r), on: (e, f) => { h2[e] = f; }, time: () => now2 });
  const env2 = await boot({ hub: hub2, hubInfo: hub2.connect({ mode: 'ghost', seats: [1, 4], card: true }) });
  env2.game.advance(.3); h2.start({ in: 0 }); now2 = 0; env2.game.advance(.5); h2['time-up']({ graceMs: 3000 });
  check('time-up with no result sends a score', log2.results.length === 1 && typeof log2.results[0].score === 'number');
};
