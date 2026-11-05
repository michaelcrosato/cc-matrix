// Attract mode (§7.23), Echo Run solo (§7.24) and the AI Hub session flow against a stand-in hub.
import { boot } from '../lib/node-harness.mjs';
export default async (T) => {
  // ---- attract: 10 s idle on the title starts it; 180 s run every vignette and loop; any input returns ----
  {
    const { game, S7, sim, I, step } = boot({ seed: 2 });
    step(10.6);
    T.eq('ten idle seconds on the title start attract mode', S7.sceneName(game), 'attract');
    for (let k = 0; k < 190; k++) step(1);
    const A = S7.attractInfo;
    T.check('every vignette plays', Object.keys(A.seen).length === S7.VIGNETTES.length, JSON.stringify(A.seen));
    T.check('and the loop restarts', A.loops >= 2, A.loops);
    T.check('attract mode runs without errors', !game.errors.length, game.errors.map(e => e.message).slice(0, 3).join(' | '));
    I.tap('confirm'); step(.6);
    T.eq('any input returns to the title', S7.sceneName(game), 'title');
    T.check('attract mode never saves', !game.saves || !game.saves.latest || !game.saves.latest());
  }
  // ---- Echo Run solo: the countdown, the course, the finish, a rank ----
  {
    const { game, S7, sim, I, step } = boot({ seed: 3 });
    step(.5); game.go('echorun', {}); step(.5);
    T.eq('Echo Run starts at the start gate', sim.W.node, 'st');
    step(3.2);
    T.check('after the countdown the run is on', !!sim.echoRun && sim.echoRun.started);
    sim.o.bot = true; S7.bot.run([{ goto: 'vb', timeout: 400 }], { honest: true });
    let pens = 0; S7.bus.on('stumble', () => pens++);
    for (let k = 0; k < 600 && !(sim.echoRun && sim.echoRun.done); k++) { const I2 = S7.bot.intents(sim); sim.update(0, I2); step(.25); }
    const E1 = sim.echoRun;
    T.check('the bot finishes the course', !!E1 && E1.done, E1 && JSON.stringify({ t: E1.t, dist: E1.metres() }));
    T.check('the time counts crits and penalties', E1 && Math.abs(E1.final - (E1.t + E1.pen - E1.crits * .5)) < .6);
    T.check('a rank is given', !!S7.echoRank(E1.final));
    T.check('the run is recorded every 0.1 s', E1 && E1.rec.length > E1.t * 9, E1 && E1.rec.length);
    T.check('Echo Run has no errors', !game.errors.length, game.errors.map(e => e.message).slice(0, 3).join(' | '));
  }
  // ---- the AI Hub: connect, ready with no key, the countdown on AIHub.time(), sends, progress, one result, time-up, end ----
  {
    const calls = [], handlers = {}; let t0 = 0;
    const AIHub = { active: true, connect: async (o) => { calls.push('connect:' + o.mode); return { me: 0, players: [{ id: 0, name: 'ME', color: '#e8443a' }, { id: 1, name: 'YOU', color: '#3b82f6' }], mode: 'ghost', seed: 1 }; },
      ready: () => calls.push('ready'), on: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); return () => {}; }, time: () => t0, progress: (p) => calls.push('progress'), result: (r) => calls.push('result:' + Object.keys(r).join(',')),
      send: (d, o) => { calls.push('send:' + d.t); return true; }, rng: () => { let s = 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }, fail: (m) => calls.push('fail') };
    const { game, S7, sim, I, step } = boot({ seed: 4, globals: { AIHub } });
    S7.inSession = true;
    await S7.hubConnect(game, sim);
    T.check('connect() asks for ghost mode', calls[0] === 'connect:ghost');
    game.go('echorun', {}); step(.6);
    T.check('ready() is called with no key press', calls.includes('ready'));
    handlers.start.forEach(f => f({ in: 3000 })); t0 = -2000; step(1); t0 = 0; step(.3);
    T.check('play begins at AIHub.time() 0', sim.echoRun.started);
    handlers.message.forEach(f => f({ t: 'g', area: 'blackrun', e: 1, s: 40, a: 0, y: 0 }, 1));
    for (let k = 0; k < 30; k++) { t0 += 100; step(.1); }
    T.check('our place is sent and progress reported', calls.includes('send:g') && calls.includes('progress'));
    T.check('the other player is drawn as an echo', (S7.ghosts || []).some(g => g.id === '1'));
    handlers['time-up'].forEach(f => f({ graceMs: 3000 })); step(.2);
    T.check('time-up reports a score at once', calls.some(c => c === 'result:score'));
    handlers.end.forEach(f => f({ reason: 'finished' })); step(.5);
    T.check('end stops the round', S7.hub.ended);
    T.eq('one result only', calls.filter(c => c.startsWith('result')).length, 1);
    T.check('the session never saves', !calls.includes('fail') && !game.errors.length, game.errors.map(e => e.message).join(' | '));
  }
};
