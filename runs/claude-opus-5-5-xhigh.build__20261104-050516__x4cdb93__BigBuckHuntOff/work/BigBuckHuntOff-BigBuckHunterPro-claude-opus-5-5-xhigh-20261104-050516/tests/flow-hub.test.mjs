import { run } from './lib/t.mjs';
import { load } from './lib/load.mjs';
import { hubStub } from './lib/hubstub.mjs';
const tick = () => new Promise(r => setImmediate(r));
run('hub', async t => {
  const copy = async (me, shoot) => {
    const hub = hubStub({ me }), L = load({ hub }), { game, I, step } = L, X = game.debug.internals; step(.5); await tick(); step(.1);
    return { hub, L, game, I, step, X };
  };
  const A = await copy(0, true);
  t.ok('hub: the game starts in the hub scene', A.game.sceneName === 'hub', A.game.sceneName);
  t.ok('hub: it shows its own card', A.X.HubLink.phase === 'card', A.X.HubLink.phase);
  t.ok('hub: ready() once, with no key press', A.hub.readyCalls === 1, A.hub.readyCalls);
  A.hub.emit('card', { left: 9000, ready: [1], asking: 0 }); A.I.tap('confirm'); A.step(.1);
  t.ok('hub: Enter answers Ready on the card', A.hub.answers.includes('ready'));
  A.I.tap('call'); A.step(.1); t.ok('hub: Triangle asks for more time', A.hub.answers.includes('more'));
  const B = await copy(1, false);
  for (const C of [A, B]) { C.hub.emit('start', { in: 3000 }); C.hub.t = -3000; C.step(.1); }
  t.ok('hub: start brings the countdown', A.X.HubLink.phase === 'countdown');
  // play: the hub's clock drives both copies; A's player is a bot that shoots, B's never does
  A.X.G.hunt = A.X.HubLink.H;
  const segsA = [], logs = [[], []];
  for (let s = 0; s <= 182 * 4; s++) {
    for (const [i, C] of [A, B].entries()) { C.hub.t = s * 250; if (i === 0 && C.X.HubLink.H && C.X.HubLink.H.players[0] && !C.X.HubLink.H.players[0].bot) C.X.HubLink.H.players[0].bot = new C.X.HunterBot({ skill: 'expert' }); C.step(.25); const H = C.X.HubLink.H; if (H && H.site && H.site.log) logs[i][C.X.HubLink.segI] = H.site.log.join(','); }
    const sg = A.X.HubLink.segI; if (segsA[segsA.length - 1] !== sg) segsA.push(sg);
  }
  t.ok('hub: segments change on the hub clock', segsA.join(',') === '0,1,2,3,4,5,6,7', segsA.join(','));
  const prog = A.hub.progressLog; let gaps = 0; for (let i = 1; i < prog.length; i++) if (prog[i].at - prog[i - 1].at > 1600) gaps++;
  t.ok('hub: progress at least once a second', prog.length >= 170 && gaps === 0, prog.length + ' reports, ' + gaps + ' gaps');
  t.ok('hub: exactly one result at the end', A.hub.results.length === 1 && typeof A.hub.results[0].score === 'number' && A.hub.results[0].stats, JSON.stringify(A.hub.results));
  t.ok('hub: the shooting copy scored', A.hub.results[0].score > 0, A.hub.results[0].score);
  const g = A.hub.sends.filter(s => s.d.t === 'g'), shots = A.hub.sends.filter(s => s.d.t === 'shot');
  let burst = 0; for (let i = 10; i < g.length; i++) if (g[i].at - g[i - 10].at < 950) burst++;
  t.ok('hub: ghost updates at most 10 a second, unreliable', g.length > 100 && g.every(s => !s.reliable) && burst === 0, g.length + ' sends, ' + burst + ' bursts');
  t.ok('hub: shots go out reliably', shots.length > 0 && shots.every(s => s.reliable), shots.length);
  t.ok('hub: spawns are the same in a copy that shoots and one that does not', logs[0][1] && logs[0][1] === logs[1][1] && logs[0][3] === logs[1][3], (logs[0][1] || '') + ' | ' + (logs[1][1] || ''));
  A.hub.emit('message', { t: 'g', s: A.X.HubLink.segI, a: [100, -20], sc: 0, p: 500 }, 1);
  t.ok('hub: a ghost message moves the ghost', A.X.HubLink.ghosts.get(1) && A.X.HubLink.ghosts.get(1).p === 500);
  A.hub.emit('end', { reason: 'finished', standings: [[0], [1]] }); A.step(.2);
  t.ok('hub: end stops the round', A.X.HubLink.phase === 'over' && A.game.audio.muted);
  // time-up before the end: a result at once
  const Cc = await copy(0, false); Cc.hub.emit('start', { in: 3000 }); for (let s = 0; s < 120; s++) { Cc.hub.t = -3000 + s * 250; Cc.step(.25); } Cc.hub.emit('time-up', { graceMs: 3000 }); Cc.step(.1);
  t.ok('hub: time-up sends the result at once', Cc.hub.results.length === 1, Cc.hub.results.length);
  Cc.hub.emit('end', { reason: 'finished', standings: [[0]] }); Cc.step(.1); t.ok('hub: never a second result', Cc.hub.results.length === 1);
  t.ok('hub: no errors', !A.L.errs().length && !B.L.errs().length, A.L.errs().concat(B.L.errs()).slice(0, 3).join(' | '));
});
