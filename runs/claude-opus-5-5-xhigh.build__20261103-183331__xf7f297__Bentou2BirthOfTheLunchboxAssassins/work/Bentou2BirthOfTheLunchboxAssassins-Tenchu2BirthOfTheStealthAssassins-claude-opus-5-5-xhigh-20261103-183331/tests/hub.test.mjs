// hub (mock): a fake AIHub before load. connect({ ghost, [1, 4], card }); ready() with no key; Enter answers Ready and
// triangle More time; no Math.random on the card; play at time() >= 0; progress every second from 0; sends at about 10 Hz,
// unreliable; ghosts drawn and removed on leave; the result at once on time-up; end stops input and sound; no quit, no dev
const calls = [], handlers = {}; let now = -Infinity;
const fake = { active: true, seeded: true, connect(o) { calls.push(['connect', o]); return Promise.resolve({ me: 0, players: [{ id: 0, name: 'Ana', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], mode: 'ghost', round: 1, seed: 7, limitMs: 300000 }); },
  ready() { calls.push(['ready', now]); }, answer(a) { calls.push(['answer', a]); }, time: () => now, on(ev, fn) { handlers[ev] = fn; return () => {}; },
  progress(p) { calls.push(['progress', p, now]); }, result(r) { calls.push(['result', r, now]); }, send(d, o) { calls.push(['send', d, o, now]); return true; }, finish() {}, rng: () => () => .5, fail(m) { calls.push(['fail', m]); } };
export const context = { hub: fake };
export default async function (t) {
  const { B, check, game, ctx } = t;
  game.advance(.2); await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0)); game.advance(.2);
  const c = calls.find(c => c[0] === 'connect');
  check('connect({ mode: ghost, seats: [1, 4], card: true })', c && c[1].mode === 'ghost' && c[1].seats[0] === 1 && c[1].seats[1] === 4 && c[1].card === true, JSON.stringify(c));
  check('ready() with no key press', calls.some(c => c[0] === 'ready'), calls.map(c => c[0]).join(','));
  check('the game\'s own card', game.sceneName === 'hubCard', game.sceneName);
  check('no title, no attract', game.sceneName !== 'title' && game.sceneName !== 'attract', game.sceneName);
  const vm = await import('node:vm'), Mth = vm.runInContext('Math', ctx), mr = Mth.random; let n = 0; Mth.random = () => { n++; return mr(); }; handlers.card({ left: 15000, paused: false, starting: false, ready: [], asking: 0, asked: false }); game.advance(3); Mth.random = mr;
  check('the card draws no Math.random numbers', n === 0, n + ' calls');
  t.tap('confirm'); game.advance(.05); check('Enter / cross answers Ready', calls.some(c => c[0] === 'answer' && c[1] === 'ready'), '');
  t.tap('interact'); game.advance(.05); check('triangle answers More time', calls.some(c => c[0] === 'answer' && c[1] === 'more'), '');
  now = -3000; handlers.start({ in: 3000 }); game.advance(.1);
  check('start enters the round', game.sceneName === 'mission' && B.M.mode === 'hub', game.sceneName);
  const x0 = B.M.hero.x; t.hold('right'); game.advance(1); t.hold('right', false); now = -1500; game.advance(.1);
  check('nothing moves before time() reaches 0', Math.abs(B.M.hero.x - x0) < .5, B.M.hero.x - x0);
  const p0 = calls.filter(c => c[0] === 'progress').length; now = 0; game.advance(.05);
  check('progress from the first moment of play', calls.filter(c => c[0] === 'progress').length > p0, '');
  const s0 = calls.filter(c => c[0] === 'send').length, q0 = calls.filter(c => c[0] === 'progress').length;
  for (let i = 0; i < 30; i++) { now += 100; game.advance(.1); }
  const sends = calls.filter(c => c[0] === 'send').slice(s0), progs = calls.filter(c => c[0] === 'progress').length - q0;
  check('sends at about 10 Hz, unreliable', sends.length >= 26 && sends.length <= 34 && sends.every(c => c[2] && c[2].reliable === false && c[1].t === 'g'), sends.length);
  check('progress about once a second', progs >= 2 && progs <= 4, progs);
  handlers.message({ t: 'g', a: 'delivery', x: 200, y: 300, z: 0, f: 0, s: 0, k: 0 }, 1); game.advance(.2);
  check('a ghost appears where the other player is', B.Hub.ghosts[1] && Math.abs(B.Hub.ghosts[1].x - 200) < 20, JSON.stringify(B.Hub.ghosts[1] && { x: B.Hub.ghosts[1].x }));
  handlers.leave({ id: 1, reason: 'left' }); game.advance(.1); check('leave removes the ghost', !B.Hub.ghosts[1], '');
  check('no quit, no dev mode in a session', game.o.menu.quit === false && B.pauseItems().length === 0, JSON.stringify(game.o.menu.quit));
  handlers['time-up']({ graceMs: 3000 }); const r = calls.find(c => c[0] === 'result');
  check('time-up: the result at once', r && typeof r[1].score === 'number' && Object.keys(r[1].stats).length <= 6 && r[1].awards.length <= 3, JSON.stringify(r && r[1]));
  check('only one result', calls.filter(c => c[0] === 'result').length === 1, '');
  const s1 = calls.filter(c => c[0] === 'send').length; handlers.end({ reason: 'finished', standings: [[0], [1]] }); game.advance(.5);
  const xe = B.M.hero.x; t.hold('right'); game.advance(.5); t.hold('right', false);
  check('end: no more input', Math.abs(B.M.hero.x - xe) < .5, B.M.hero.x - xe);
  check('end: sound off, nothing more sent', game.audio.muted && calls.filter(c => c[0] === 'send').length === s1 + 0, calls.filter(c => c[0] === 'send').length - s1);
}
