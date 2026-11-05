// The AI Hub session against a mock AIHub (protocol v1, ghost mode)
import { load } from '../lib/vm.mjs';
import { test, check, done, botDrive, errs } from '../lib/t.mjs';
const mk = () => {
  const H = { handlers: {}, t: -Infinity, readyN: 0, answers: [], sends: [], progress: [], results: [], seed: 42 };
  const rng = label => { let a = (H.seed ^ [...label].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  H.info = { me: 0, players: [{ id: 0, name: 'ANNA', color: '#e8443a' }, { id: 1, name: 'BO', color: '#3b82f6' }], mode: 'ghost', round: 1, seed: 42, limitMs: 240000 };
  H.api = { active: true, connect: () => Promise.resolve(H.info), ready: () => { H.readyN++; }, answer: a => H.answers.push(a), time: () => H.t, on: (e, f) => { (H.handlers[e] = H.handlers[e] || []).push(f); return () => {}; },
    progress: p => H.progress.push([H.t, p]), result: r => H.results.push(r), send: (d, o) => { H.sends.push([H.t, d, o]); return true; }, rng, seeded: true };
  H.fire = (e, ...a) => (H.handlers[e] || []).forEach(f => f(...a));
  return H;
};
const tick = () => new Promise(r => setTimeout(r, 0));
await test('a ghost session', async () => {
  const H = mk(), ctx = load({ hub: H.api }), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input, seen = new Set();
  const adv = (s, clock) => { for (let k = 0; k < Math.round(s * 120); k++) { if (clock) H.t += 1000 / 120; botDrive(ctx); g.advance(1 / 120); seen.add(g.sceneName); } };
  g.advance(.1); await tick(); await tick(); adv(.5);
  check(g.sceneName === 'session', 'straight into the session scene', g.sceneName);
  check(H.readyN === 1, 'ready() once, with no key press', H.readyN);
  I.tap('confirm'); g.advance(.05); check(H.answers.includes('ready'), 'Enter answers Ready'); I.tap('camera'); g.advance(.05); check(H.answers.includes('more'), '△ asks for more time');
  H.fire('card', { left: 9000, ready: [0], asking: 0 }); adv(.2);
  H.t = -3000; H.fire('start', { in: 3000 }); adv(.3);
  check(g.sceneName === 'race', 'the race scene after start', g.sceneName);
  const R = SN.scenes.race.race, me = R.humans[0], p0 = me.p; adv(2, true); check(Math.abs(me.p - p0) < 30, 'nothing moves before time() reaches 0', me.p - p0);
  check(R.ships.length === 7 && R.humans.length === 1, 'own craft plus AI (other humans are ghosts)', R.ships.length);
  adv(1.2, true); check(R.state === 'racing' && H.t >= 0, 'racing at time() >= 0', R.state);
  const ps = H.progress.length; adv(3, true); check(H.progress.length - ps >= 2 && typeof H.progress[H.progress.length - 1][1].score === 'number' && H.progress[H.progress.length - 1][1].label, 'progress about once a second with a score and a label', H.progress.slice(-1));
  const recent = H.sends.filter(s => s[0] > H.t - 1000); check(recent.length <= 20 && recent.length >= 5 && recent.every(s => s[2] && s[2].reliable === false && JSON.stringify(s[1]).length < 16384), 'sends at ~10 Hz, unreliable, small', recent.length);
  // an incoming ghost
  for (let k = 0; k < 5; k++) { H.fire('message', { t: 'g', p: me.p + 400 + k * 30, u: 20, h: 14, y: 0, r: 0, v: 1500, lap: 0, fin: 0 }, 1); adv(.1, true); }
  const gl = SN.scenes.race.vw.ghostList; check(gl && gl.length === 1 && gl[0].pose && gl[0].pose.s > 0, 'a message creates and moves a ghost', gl && gl[0] && gl[0].pose);
  H.fire('leave', { id: 1, reason: 'left' }); adv(.2, true); check(!SN.hub.ghosts.has(1), 'leave removes it');
  check(!seen.has('title') && !seen.has('menu') && !seen.has('attract'), 'no title, menus or attract', [...seen]);
  check(SN.pauseItems().length === 0 && SN.scenes.race.pausable === false, 'no pause, restart or quit in a session');
  for (let k = 0; k < 300 && !me.finished; k++) adv(1, true);
  check(me.finished && H.results.length === 1 && H.results[0].time > 0, 'result({ time }) on finishing', H.results);
  adv(12, true); check(g.sceneName === 'race', 'after finishing, the copy spectates (no results menu, no retry)', g.sceneName);
  H.fire('end', { reason: 'finished', standings: [[0], [1]] }); const n = H.sends.length; adv(1, true); check(H.sends.length === n && SN.hubEnded, 'nothing sent after end');
  check(!g.errors.length, 'no errors', errs(g));
});
await test('time-up before the finish', async () => {
  const H = mk(), ctx = load({ hub: H.api }), SN = ctx.SN, g = ctx.My3D2dge.current;
  g.advance(.1); await tick(); await tick(); g.advance(.5); H.t = -3000; H.fire('start', { in: 3000 }); for (let k = 0; k < 120 * 8; k++) { H.t += 1000 / 120; botDrive(ctx); g.advance(1 / 120); }
  H.fire('time-up', { graceMs: 3000 }); H.fire('time-up', { graceMs: 3000 }); g.advance(.1);
  check(H.results.length === 1 && typeof H.results[0].score === 'number' && H.results[0].score > 0, 'result({ score }) once', H.results);
});
await test('connect returns null: the game runs on its own', async () => {
  const H = mk(); H.api.connect = () => Promise.resolve(null); const ctx = load({ hub: H.api }), g = ctx.My3D2dge.current; g.advance(.1); await tick(); await tick(); g.advance(1);
  check(g.sceneName === 'title', 'title', g.sceneName);
});
done();
