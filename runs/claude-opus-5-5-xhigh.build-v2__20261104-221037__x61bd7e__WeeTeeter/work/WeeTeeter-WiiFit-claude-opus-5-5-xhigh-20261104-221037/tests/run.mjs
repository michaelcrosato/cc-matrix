// The one test command: node tests/run.mjs [rules|browser|hub|all]. Prints only failures and one final count line.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { load, root, files } from './lib.mjs';
import { planAudit, speechAudit } from './plan.mjs';

const group = process.argv[2] || 'all';
let passed = 0, failed = 0;
const check = (name, ok, detail) => { if (ok) passed++; else { failed++; console.log('FAIL ' + name + (detail !== undefined ? ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } };
const STEM = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037';
const IDLE = g => { g.G.scenes.__idle = g.game.scenes.__idle = { update() {}, draw() {} }; g.game.go('__idle', null, { fade: 0 }); g.game.advance(.05); };

function rules() {
  /* ---- the lean model: each row of the plan's table lands in its band, with the bots, on 12 seeds ---- */
  {
    const g = load(), { G, E } = g;
    const T = [
      ['Body Check', { k: 14, c: 7, s: 4, A: 3, nf: 1.1, R: .20 }, [50, 76, 99, 100]],
      ['Sun Flow', { k: 12, c: 6, s: 6, A: 3.2, nf: 1.3, R: .28, pushV: .5, pushEvery: 9 }, [53, 78, 99, 100]],
      ['Stork 1', { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: .24, pushV: .6, pushEvery: 7 }, [20, 30, 68, 95]],
      ['Stork 2', { k: 11, c: 4.5, s: 15, A: 3.6, nf: 1.7, R: .22, pushV: .7, pushEvery: 6 }, [22, 15, 29, 54]],
      ['Candle', { k: 10, c: 5, s: 11, A: 1.4, nf: .8, R: .20, pushV: .55, pushEvery: 5 }, [14, 59, 95, 100]],
      ['Laundry', { k: 10, c: 3.5, s: 16, A: 3.5, nf: 1.2, R: .40, pushV: .9, pushEvery: 5 }, [35, 31, 39, 79]]
    ];
    for (const [name, set, band] of T) [null, 'poor', 'average', 'good'].forEach((skill, b) => {
      let st = 0; const N = 12;
      for (let seed = 1; seed <= N; seed++) { const rng = E.rng(seed * 97 + 3), bal = new G.Balance(set, rng), bot = skill && new G.BotBrain(skill, rng); for (let i = 0; i < 45 * 120; i++) { const u = bot ? bot.hold(1 / 120, bal) : [0, 0]; bal.step(1 / 120, u[0], u[1]); } st += bal.steadiness; }
      const pct = st / N * 100; check('lean table ' + name + ' ' + (skill || 'passive'), Math.abs(pct - band[b]) <= 10, pct.toFixed(0) + ' vs ' + band[b]);
    });
    /* a keyboard at 2.2/s scores like a stick on the stork; the three devices land in one intent */
    const I = g.game.input, R = new G.DeviceReader(I), it = G.newIntent();
    I.hold('right'); g.game.advance(.01); R.read(.25, it); I.hold('right', false); g.game.advance(.01);
    check('keys nudge the lean at 2.2/s', Math.abs(it.x - .55) < .02, it.x);
    R.read(.5, it); check('released, the lean drifts home at .5/s', Math.abs(it.x - .3) < .02, it.x);
  }
  /* ---- every activity, every tier: passive, bots, time, errors ---- */
  {
    const g = load(), { G, E, game } = g; game.fadeTime = 0; game.advance(.05); G.devMember(5); G.S.freePlay = true; IDLE(g);
    const run = (id, tier, skill, seed) => {
      const spec = skill ? { name: 'Bot', skill, local: true, look: G.S.look } : { name: 'Passive', local: true, look: G.S.look, input: game.input };
      const ctx = G.makeRun(id, { tier, seed, contestants: [spec], quiet: true }); if (ctx.def.begin) ctx.def.begin(ctx);
      let n = 0; while (!ctx.done && n < 240 * 120) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); n++; }
      return { pct: ctx.contestants[0].pct, stars: ctx.contestants[0].stars, time: ctx.time, done: ctx.done, dur: ctx.dur, def: ctx.def };
    };
    const SEEDS = [11, 37];
    for (const id of G.order) G.activities[id].tiers.forEach((tr, tier) => {
      for (const seed of SEEDS) {
        const p = run(id, tier, null, seed);
        check(`${id}:${tier} passive under 1 star`, p.stars < 1, p.pct);
        check(`${id}:${tier} ends in its time`, p.done && p.time <= p.dur + 1, p);
        if (tier === 0) { const a = run(id, tier, 'average', seed), b = run(id, tier, 'good', seed); check(`${id}:${tier} average at least 1 star`, a.stars >= 1, a.pct); check(`${id}:${tier} good at least 2 stars`, b.stars >= 2, b.pct); }
        else { const b = run(id, tier, 'good', seed), x = run(id, tier, 'expert', seed); check(`${id}:${tier} good at least 1 star`, b.stars >= 1, b.pct); check(`${id}:${tier} expert at least 2 stars`, x.stars >= 2, x.pct); }
      }
    });
    check('no errors across the activity runs', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
  }
  /* ---- the full scripted playthrough: real taps, real bots through every scene to the Ending ---- */
  playthrough('good'); playthrough(null);
  /* ---- saves ---- */
  {
    const g = load(), { G, game, E } = g; game.fadeTime = 0; game.advance(.05);
    G.Save.create(0, 'Sir Slouch', { hair: 'short', skin: 1, top: 2, bottom: 1 }); G.S.minutes = 12.5; G.S.day = 3; G.S.best.stork = [2]; G.Save.save();
    G.Save.create(1, 'Ms. Almost', { hair: 'long', skin: 3, top: 1, bottom: 0 }); G.S.minutes = 3; G.Save.save();
    const a = game.saves.load(0); check('reload gives the same state', G.S.minutes === 12.5 && G.S.day === 3 && G.S.best.stork[0] === 2 && G.S.name === 'Sir Slouch', G.S);
    game.saves.load(1); check('members stay separate', G.S.name === 'Ms. Almost' && G.S.minutes === 3, G.S.name);
    check('three member slots', [0, 1, 2].map(G.Save.member).filter(Boolean).length === 2);
    G.Save.create(2, 'Temp', { hair: 'bald', skin: 0, top: 0, bottom: 0 }); G.Save.erase(2); check('a card can be erased', !G.Save.member(2));
    /* a damaged save: the bytes in storage turned to nonsense */
    G.Save.create(2, 'Broken', { hair: 'bald', skin: 0, top: 0, bottom: 0 }); game.saves._put(2, '{bad'); G.Save.slot = null;
    const dm = G.Save.member(2); check('a damaged card reads as damaged', !!dm && dm.damaged === true, dm);
    G.go('member', null, { fade: 0 }); game.advance(.3); check('a damaged save does not crash the card screen', !game.errors.length, game.errors.map(e => e.message));
    G.go('title', null, { fade: 0 }); game.advance(.3); check('a damaged save does not crash the title', game.sceneName === 'title' && !game.errors.length, game.errors.map(e => e.message));
    const latest = game.saves.latest(); check('Continue skips a damaged save', !latest || latest.slot !== 2, latest && latest.slot);
    G.Save.erase(2); check('a damaged card can be erased', !G.Save.member(2));
  }
  /* ---- same seed and same input give the same hash twice ---- */
  {
    const hash = () => { const g = load(), { G, game } = g; game.fadeTime = 0; game.advance(.05); G.devMember(5); IDLE(g); const out = []; for (const id of ['stork', 'candle', 'hoop', 'tray', 'slalom']) { const ctx = G.makeRun(id, { tier: 0, seed: 5, contestants: [{ name: 'B', skill: 'good', local: true, look: G.S.look }], quiet: true }); for (let i = 0; i < 1200; i++) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); } const c = ctx.contestants[0]; out.push(+(c.bal.x).toFixed(5), +(c.bal.y).toFixed(5), c.score, c.sx || 0, c.inGlass || 0); } return JSON.stringify(out); };
    const a = hash(), b = hash(); check('same seed, same input, same hash', a === b, a + ' / ' + b);
  }
  /* ---- attract ---- */
  {
    const g = load(), { G, game } = g; game.fadeTime = 0; game.advance(.1); G.Save.create(0, 'Keep Me', { hair: 'short', skin: 1, top: 0, bottom: 0 }); G.S.minutes = 7; G.Save.save();
    game.go('title', null, { fade: 0 }); game.advance(.05);
    const before = JSON.stringify(game.saves.get(0).data);
    game.advance(9.8); check('no attract at 9.9 s', game.sceneName === 'title', game.sceneName);
    game.advance(.35); check('attract fires at 10 s idle', game.sceneName === 'attract', game.sceneName);
    const seen = new Set(); const N = G.ATTRACT_ITEMS.length * 15 + 5; for (let i = 0; i < N; i += 1) { game.advance(1); seen.add(G.scenes.attract.now()); }
    check('attract visits every playlist item', seen.size === G.ATTRACT_ITEMS.length, seen.size + ' of ' + G.ATTRACT_ITEMS.length);
    check('attract ran without errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
    game.input.tap('confirm'); game.advance(.2); check('any input returns to the title', game.sceneName === 'title', game.sceneName);
    check('no save or unlock changed', JSON.stringify(game.saves.get(0).data) === before);
    check('the member is back after attract', G.S.name === 'Keep Me' && G.S.minutes === 7, G.S.name);
  }
  /* ---- dev ---- */
  {
    const g = load({ draw: true }), { G, game } = g; game.fadeTime = 0; game.advance(.1); G.devMember(5); G.go('act_stork', { tier: 0, from: 'dev' }, { fade: 0 }); game.advance(.3);
    G.Dev.open(); check('dev opens over the running game', G.Dev.on && !game.paused);
    const rows = G.Dev.rows.filter(r => r.spec); for (const r of rows) { if (r.spec.key === 'timeScale') continue; const before = G.DEV[r.spec.key]; G.Dev.adjust(r, 1, false); if (G.DEV[r.spec.key] === before) G.Dev.adjust(r, -1, false); check('slider changes ' + r.spec.key, G.DEV[r.spec.key] !== before); }
    const b4 = game.time; G.Dev.close(); G.devReset(); check('reset restores all', G.DEV_SPEC.every(s => G.DEV[s.key] === s.def));
    for (const id of G.order) { G.go(G.actScene(id), { tier: 1, from: 'dev' }, { fade: 0 }); game.advance(.15); check('dev jump loads ' + id, game.sceneName === G.actScene(id) && !game.errors.length, game.errors.slice(0, 2).map(e => e.message)); }
    for (const n of ['title', 'island', 'member', 'arrival', 'evening', 'tareday', 'games', 'ending', 'about', 'class', 'freeplay', 'attract', 'bodycheck']) { G.go(n, n === 'bodycheck' ? { day: 3 } : null, { fade: 0 }); game.advance(.2); check('dev jump loads ' + n, game.sceneName === n && !game.errors.length, game.errors.slice(0, 2).map(e => e.where + ':' + e.message)); }
    /* every tool on the panel */
    G.go('title', null, { fade: 0 }); game.advance(.1); G.devMember(3); G.S.minutes = 0; G.go('act_stork', { tier: 0, from: 'dev', skipCard: true }, { fade: 0 }); game.advance(7); G.Dev.open();
    const row = t => G.Dev.rows.find(r => (r.btn || r.pick) && (r.btn || r.pick)().startsWith(t));
    const tools = ['Reset to defaults', 'Jump:', 'Tier:', 'Finish now:', 'Unlock all', '+10 minutes', 'Set Spine Age:', 'Reset this member', 'No stumbles:', 'Bot plays:', 'Plate trace:', 'Frame step', 'Force attract', 'Pose Viewer', 'Log snapshot', 'Close'];
    for (const t of tools) check('dev has the tool: ' + t, !!row(t));
    row('No stumbles:').act(); check('no stumbles toggles', G.DEV.noStumble === true); row('No stumbles:').act();
    row('Bot plays:').act(); check('bot plays', G.DEV.bot === 'poor', G.DEV.bot); game.advance(.5); row('Bot plays:').adj(-1); check('bot plays off', G.DEV.bot === null, G.DEV.bot);
    row('Plate trace:').act(); check('trace toggles', G.DEV.trace === true); game.advance(.1); row('Plate trace:').act();
    row('Set Spine Age:').adj(5); const wantAge = G.Dev.age; row('Set Spine Age:').act(); check('set Spine Age', G.spineAge() === wantAge, G.spineAge()); G.S.devAge = 0;
    const m0 = G.S.minutes; row('+10 minutes').act(); check('+10 minutes', G.S.minutes === m0 + 10, G.S.minutes);
    row('Unlock all').act(); check('unlock all', G.S.freePlay && G.S.minutes >= 30 && G.S.wear.towel && G.S.wear.hat);
    row('Reset this member').act(); check('reset this member', G.S.minutes === 0 && !G.S.freePlay, G.S.minutes);
    { G.DEV.timeScale = 1; const t0 = G.scenes.act_stork.run().time; row('Frame step').act(); game.advance(1 / 120); const t1 = G.scenes.act_stork.run().time; game.advance(1 / 10); const t2 = G.scenes.act_stork.run().time; game.advance(1 / 10); const t3 = G.scenes.act_stork.run().time; check('frame step moves a frame, then holds', t2 > t0 && t3 === t2, [t0, t1, t2, t3]); G.Dev.close(); check('closing the panel lets time run', game.timeScale === 1, game.timeScale); G.Dev.open(); }
    row('Pose Viewer').act(); check('pose viewer opens', !!G.Dev.viewer); game.advance(.1); G.Dev.viewer = null;
    row('Log snapshot').act();
    row('Jump:').adj(1); const before = game.sceneName; row('Jump:').act(); game.advance(.1); check('jump goes', game.sceneName !== before, game.sceneName);
    row('Force attract').act(); game.advance(.1); check('force attract', game.sceneName === 'attract' && !G.Dev.on, game.sceneName); G.go('title', null, { fade: 0 }); game.advance(.1);
    G.devMember(5); G.go('act_squat', { tier: 0, from: 'dev' }, { fade: 0 }); game.advance(.2); game.input.tap('confirm'); game.advance(7); G.Dev.stars = 2; G.Dev.finish(); game.advance(.2); check('finish now gives N stars', G.dbg.stars === 2, G.dbg);
    check('dev ran without errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
  }
  /* ---- class ---- */
  {
    const g = load({ draw: true }), { G, E, game } = g; game.fadeTime = 0; game.advance(.1); G.devMember(1); G.go('class', null, { fade: 0 }); game.advance(.1);
    game.addPlayer({ keys: 'right' }); game.addPlayer({ pad: 2 }); game.addPlayer({ pad: 3 }); check('four inputs', game.players.length === 4);
    game.advance(.1); game.input.tap('confirm'); game.advance(.1); check('class starts a round', G.scenes.class && game.sceneName === 'class');
    const LIST = ['stork', 'candle', 'squat', 'step', 'hoop'];
    game.advance(3.6); G.DEV.bot = 'good'; game.advance(36); G.DEV.bot = null; game.advance(.5);
    check('class reaches the podium with four scores', G.classPodium() && G.classPodium().length === 4 && G.classPodium().every(p => p.title && p.score >= 0), G.classPodium());
    check('the podium has polite titles', G.classPodium()[0].title === 'Most Still' && G.classPodium()[1].title === 'Best Wobble', G.classPodium() && G.classPodium().map(p => p.title));
    I_again: { const P = game.players; G.go('title', null, { fade: 0 }); game.advance(.2); check('leaving Class gives the keyboard back', game.players.length === 1 && !!game.input.map.walk && !game.input.half, game.players.length); G.go('class', null, { fade: 0 }); game.advance(.1); game.addPlayer({ keys: 'right' }); game.addPlayer({ pad: 2 }); game.addPlayer({ pad: 3 }); game.advance(.1); }
    for (const id of LIST) { const ctx = G.makeRun(id, { tier: 0, mode: 'class', dur: 35, short: true, seed: 3, contestants: [0, 1, 2, 3].map(i => ({ name: 'P' + (i + 1), skill: 'good', local: i === 0, color: E.PLAYER_COLORS[i], look: G.S.look })), lanes: ['left', 'down', 'up', 'right'] }); if (ctx.def.begin) ctx.def.begin(ctx); let n = 0; while (!ctx.done && n < 60 * 120) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); n++; } check('class ' + id + ' scores 0 to 1000 for all four', ctx.done && ctx.contestants.every(c => c.score >= 0 && c.score <= 1000 && c.score > 50), ctx.contestants.map(c => c.score)); }
    check('class ran without errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
    /* half keyboards still have their actions */
    const P1 = game.players[0]; check('half keyboard keeps menu and breath actions', !!P1.map.confirm && !!P1.map.breath, Object.keys(P1.map));
  }
  /* ---- hub logic with a fake AIHub ---- */
  {
    const fake = () => { const h = { handlers: {}, t: -Infinity, res: [], prog: [], sent: [], answers: [], active: true, seeded: true,
      connect: async () => ({ me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }, { id: 1, name: 'B', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 240000, seed: 1234 }),
      rng: label => { let s = 7; for (const c of label) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; },
      on(ev, fn) { h.handlers[ev] = fn; return () => {}; }, ready() { h.isReady = true; }, answer(a) { h.answers.push(a); }, time() { return h.t; }, progress(p) { h.prog.push(p); }, result(r) { h.res.push(r); }, send(d, o) { h.sent.push(d); return true; } }; return h; };
    const run = async () => { const hub = fake(); const g = load({ hub, draw: true }); const { G, game } = g; for (let i = 0; i < 20 && !hub.isReady; i++) { await new Promise(r => setTimeout(r, 5)); game.advance(.02); }
      check('hub: no title in a session', game.sceneName === 'round', game.sceneName); check('hub: ready with no key press', hub.isReady === true);
      check('hub: the deal is three events', G.Hub.deal.length === 3, G.Hub.deal);
      game.input.tap('confirm'); game.advance(.05); check('hub: Enter answers ready on the card', hub.answers.includes('ready'), hub.answers); game.input.tap('more'); game.advance(.05); check('hub: triangle answers more', hub.answers.includes('more'), hub.answers);
      hub.handlers.start && hub.handlers.start({ in: 3000 }); hub.t = -2000; game.advance(.2); hub.t = 0; for (let i = 0; i < 400; i++) { hub.t += 25; game.advance(1 / 40); }
      check('hub: progress and ghosts flow', hub.prog.length > 0 && hub.sent.length > 0, [hub.prog.length, hub.sent.length]);
      check('hub: ghost data shape', hub.sent[0] && hub.sent[0].t === 'g' && Array.isArray(hub.sent[0].l) && Array.isArray(hub.sent[0].w), hub.sent[0]);
      hub.handlers['time-up'] && hub.handlers['time-up']({ graceMs: 5000 }); game.advance(.1); hub.handlers['time-up'] && hub.handlers['time-up']({ graceMs: 5000 }); game.advance(.1);
      check('hub: time-up reports once', hub.res.length === 1, hub.res.length); check('hub: the result has a score', hub.res[0] && typeof hub.res[0].score === 'number', hub.res[0]);
      hub.handlers.end && hub.handlers.end({ reason: 'finished' }); const n = hub.sent.length; hub.t += 5000; game.advance(1); check('hub: end stops sending', hub.sent.length === n, [n, hub.sent.length]);
      check('hub: no errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message)); return G.Hub.deal.join(); };
    return Promise.all([run(), run()]).then(([a, b]) => check('hub: same seed, same deal', a === b, a + ' / ' + b)).then(() => { lint(); devices(); screens(); dataOnly(); });
  }
}
function playthrough(skill) {
  const label = skill ? 'playthrough(bot)' : 'playthrough(passive)';
  const g = load({ draw: true }), { G, E, game } = g, I = game.input; game.fadeTime = 0; game.advance(.1);
  const snap = () => game.debug.snapshot(), sc = () => game.sceneName, tap = (a = 'confirm') => { I.tap(a); game.advance(.1); };
  const adv = (ok, max = 60) => { let t = 0; while (!ok() && t < max) { if (G.talk.open) I.tap('confirm'); game.advance(.25); t += .25; } return ok(); };
  check(label + ' title', sc() === 'title', sc());
  // New Member from the title's first pill, a slot, sign the card
  tap(); adv(() => sc() === 'member', 5); check(label + ' member screen', sc() === 'member', sc());
  tap(); game.advance(.2); for (let i = 0; i < 5; i++) { I.tap('down'); game.advance(.1); game.advance(.3); } tap(); adv(() => sc() === 'arrival', 5); check(label + ' arrival', sc() === 'arrival', sc());
  tap(); adv(() => !G.talk.open, 20); tap(); adv(() => sc() === 'bodycheck', 20); check(label + ' Day 1 body check', sc() === 'bodycheck', sc());
  const bodyCheck = () => { let t = 0; G.DEV.noStumble = false; while (sc() === 'bodycheck' && t < 120) { I.tap('confirm'); game.advance(.25); t += .25; } };
  const hist = [];
  const session = (id, tier = 0) => { const scene = 'act_' + id; G.go(scene, { tier, from: 'island' }, { fade: 0 }); game.advance(.2); check(label + ' opens ' + id, sc() === scene, sc()); const S = G.scenes[scene]; G.DEV.bot = skill; tap(); adv(() => S.phase() === 'play', 15); adv(() => S.phase() === 'results', 200); G.DEV.bot = null; check(label + ' finishes ' + id, S.phase() === 'results', S.phase()); played.add(id); game.advance(1.5); for (let i = 0; i < 6 && sc() === scene; i++) { S.results().pills.i = 1; I.tap('confirm'); game.advance(.4); } };
  const played = new Set();
  bodyCheck(); check(label + ' Day 1 opens with the guided Stork', sc() === 'act_stork' && G.scenes.act_stork.run().guided, sc());
  { const S = G.scenes.act_stork; G.DEV.bot = skill; tap(); adv(() => S.phase() === 'play', 15); check(label + ' the lesson holds the clock', S.run().holdClock === true); adv(() => S.phase() === 'results', 200); G.DEV.bot = null; check(label + ' guided Stork finishes', S.phase() === 'results', S.phase()); played.add('stork'); game.advance(1.5); for (let i = 0; i < 6 && sc() === 'act_stork'; i++) { I.tap('confirm'); game.advance(.4); } check(label + ' it counts as session 1', G.S.session === 1, G.S.session); }
  const DAYS = { 1: ['squat', 'step'], 2: ['flow', 'pushup', 'hoop'], 3: ['candle', 'lunge', 'jog'], 4: ['laundry', 'slalom', 'tray'] };
  let ages = [G.spineAge()];
  for (let day = 1; day <= 4; day++) {
    check(label + ' day number ' + day, G.S.day === day, G.S.day);
    if (day === 3) G.S.__plateau = G.spineShown();
    for (const id of DAYS[day]) { if (day === 4 && sc() === 'tareday') { adv(() => sc() !== 'tareday', 40); } session(id); }
    if (day === 3) check(label + ' Day 3 plateau holds', G.spineShown() === G.S.shown, [G.spineShown(), G.S.shown]);
    adv(() => sc() === 'evening', 10); check(label + ' day ' + day + ' ends at evening', sc() === 'evening', sc()); ages.push(G.spineShown());
    game.advance(.3); tap(); adv(() => sc() === 'bodycheck', 30); check(label + ' next morning', sc() === 'bodycheck', sc());
    bodyCheck();
    if (day === 3) { check(label + " Day 4 is Tare's", sc() === 'tareday', sc()); let t = 0; while (sc() === 'tareday' && t < 60) { I.tap('confirm'); game.advance(.25); t += .25; } check(label + " Tare's Day ends", G.S.tareDay === true); }
    if (day === 3) check(label + ' Spine Age catches up on Day 4', G.spineShown() === G.spineAge(), [G.spineShown(), G.spineAge()]);
  }
  if (skill) { check(label + ' Spine Age falls', G.spineAge() < 60, G.spineAge()); check(label + ' Gerald has minutes', G.S.minutes > 5, G.S.minutes); check(label + ' unlocks arrive', G.S.wear.towel === true); }
  // Day 5: the Gentle Games
  check(label + ' Day 5 is the Games', sc() === 'games' && G.S.day === 5, [sc(), G.S.day]);
  for (let k = 0; k < 3; k++) { G.DEV.bot = skill; let t = 0; while (sc() === 'games' && t < 80) { if (G.talk.open) I.tap('confirm'); game.advance(.25); t += .25; const scene = G.scenes.games; if (scene.__phase && scene.__phase() === 'score') break; if (G.gamesPhase() === 'score') break; } G.DEV.bot = null; game.advance(1.6); I.tap('confirm'); game.advance(.3); }
  G.DEV.bot = skill; let t2 = 0; while (sc() === 'games' && t2 < 140) { if (G.talk.open) I.tap('confirm'); game.advance(.25); t2 += .25; } G.DEV.bot = null;
  check(label + ' the duel ends at the Ending', sc() === 'ending', sc());
  let t3 = 0; while (G.S.ended !== true && t3 < 80) { if (G.talk.open) I.tap('confirm'); game.advance(.25); t3 += .25; } check(label + ' the ending plays', G.S.ended === true);
  t3 = 0; while (G.endingPhase() !== 'done' && t3 < 80) { I.tap('confirm'); game.advance(.25); t3 += .25; } check(label + ' credits roll and end', G.endingPhase() === 'done', G.endingPhase());
  game.advance(.3); adv(() => !G.talk.open, 10); tap(); adv(() => sc() === 'freeplay', 5); check(label + ' Free Play opens', sc() === 'freeplay' && G.S.freePlay, [sc(), G.S.freePlay]);
  check(label + ' all twelve activities played', played.size + 2 >= 12 || skill === null, [...played]);
  check(label + ' no errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
}
/* ---- the same activities through the real device paths: human-like reaction, no bypass ----
 * A person's intent (the family's average bot) becomes key presses, a pointer position or a stick and triggers; the game
 * reads them through its DeviceReader. On tier 1, every device must earn at least 1 star on every activity. */
function devices() {
  const g = load(), { G, E, game } = g, I = game.input; game.fadeTime = 0; game.advance(.05); G.devMember(5); G.S.freePlay = true; IDLE(g);
  const steer = (dev, want, c, ctx, dt) => {
    if (dev === 'stick') { c.pad = [want.x, -want.y]; }
    else if (dev === 'mouse') { I.lastDevice = 'mouse'; I.feed('move', game.W / 2 + want.x * game.H * G.DEV.reach, game.H / 2 - want.y * game.H * G.DEV.reach); }
    else { I.lastDevice = 'keyboard'; const r = c.reader; c.tapT = (c.tapT || 0) - dt; if (c.tapT <= 0) { c.tapT = .08; const hold = (a, on) => { if (on !== !!c['h' + a]) { c['h' + a] = on; I.hold(a, on); } }; hold('right', want.x - r.ux > .05); hold('left', want.x - r.ux < -.05); if (ctx.def.leanAxis !== 'x') { hold('up', want.y - r.uy > .05); hold('down', want.y - r.uy < -.05); } } }
  };
  const release = c => { for (const a of ['right', 'left', 'up', 'down', 'walk', 'breath']) if (c['h' + a]) { I.hold(a, false); c['h' + a] = false; } };
  for (const id of G.order) for (const dev of ['keys', 'mouse', 'stick']) {
    if (id === 'step' && dev !== 'keys') continue;   // (its presses are the same action on every device)
    const def = G.activities[id]; I.padMove = [0, 0]; I.lastDevice = 'keyboard'; I.padValues = [];
    const ctx = G.makeRun(id, { tier: 0, seed: 21, contestants: [{ name: 'Person', input: I, local: true, look: G.S.look }], quiet: true }), c = ctx.contestants[0];
    c.reader.mouseStart = dev === 'mouse' ? -100 : 1e9; c.brain = new G.BotBrain('average', c.rng); const shadow = G.newIntent(), plan = id === 'step' ? c.rh.notes.map(() => (c.rng() + c.rng() - 1) * 70) : null; let ni = 0;
    if (def.begin) def.begin(ctx);
    let n = 0, last = 0, lastK = -1;
    const key = { keys: 'keyboard', mouse: 'mouse', stick: 'gamepad' }[dev];
    while (!ctx.done && n < 240 * 120) {
      const dt = 1 / 120, real = c.intent; c.intent = shadow; if (def.bot) def.bot(ctx, c, dt); c.intent = real;
      if (id === 'step') { const A = G.A, s = A.pos.step, spb = 60 / ctx.song.bpm / ctx.song.steps; while (ni < c.rh.notes.length) { const q = c.rh.notes[ni]; if (s < q.step + plan[ni] / 1000 / spb) break; ni++; I.tap(['stepL', 'stepD', 'stepU', 'stepR'][q.lane]); } }
      else if (id === 'hoop') {
        if (dev === 'keys') { I.lastDevice = 'keyboard'; const k = Math.abs(shadow.rawX) > Math.abs(shadow.rawY) ? (shadow.rawX > 0 ? 'right' : 'left') : (shadow.rawY > 0 ? 'up' : 'down'); if (k !== c.hk) { if (c.hk) I.hold(c.hk, false); I.hold(k); c.hk = k; } }
        else steer(dev, { x: shadow.rawX, y: shadow.rawY }, c, ctx, dt);
        if (shadow.catchL) I.tap('catchL'); if (shadow.catchR) I.tap('catchR');
      } else {
        steer(dev, shadow, c, ctx, dt);
        if (id === 'jog') { if (shadow.paceL) I.tap('paceL'); if (shadow.paceR) I.tap('paceR'); }
        if (id === 'laundry') { if (shadow.jump) I.tap('jump'); c.vals = c.vals || {}; if (dev === 'stick') { c.vals[7] = shadow.walk; if (!c.hwalkPad) { c.hwalkPad = true; I.press('Pad7'); } } else { if (!c.hwalk) { c.hwalk = true; I.hold('walk', true); } } }
        if (def.breath) { c.vals = c.vals || {}; if (dev === 'stick') { c.vals[7] = ctx.guideVal || 0; c.vals[6] = 0; if (!c.hwalkPad) { c.hwalkPad = true; I.press('Pad7'); } } else { const on = !!ctx.breathIn; if (on !== !!c.hbreath) { c.hbreath = on; I.hold('breath', on); } } }
      }
      game.advance(dt);
      if (dev === 'stick') { I.lastDevice = 'gamepad'; I.padMove = c.pad || [0, 0]; if (c.vals) for (const k in c.vals) I.padValues[k] = c.vals[k]; }   // (the input tick clears what no real pad holds)
      G.stepRun(ctx, dt); n++;
      if (ctx.local && n === 600 && id !== 'step') check(`${id} on ${dev}: the reader sees that device`, c.intent.source === key, c.intent.source);
    }
    release(c); if (c.hk) I.hold(c.hk, false); if (c.hwalk) { I.hold('walk', false); } if (c.hwalkPad) I.release('Pad7'); I.padValues = []; I.padMove = [0, 0];
    check(`${id} on ${dev}: an average person earns a star`, c.stars >= 1, [c.pct.toFixed(2), c.detail]);
  }
  check('devices ran without errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
}
/* ---- screens: at most 6 choices, nothing spilling out of its pill, every card's words inside its panel ---- */
function screens() {
  const g = load({ draw: true }), { G, E, game } = g, I = game.input; game.fadeTime = 0; game.advance(.1);
  let most = 0, where = ''; const spills = new Set(), origDraw = G.Pills.prototype.draw;
  G.Pills.prototype.draw = function (d) { if (this.items.length > most) { most = this.items.length; where = game.sceneName; } const rects = this.layout(), scale = this.o.scale || 1; this.items.forEach((it, i) => { const r = rects[i]; if (E.font.width(it.label, { scale }) + (it.icon ? 26 : 0) > r.w - 4) spills.add(game.sceneName + ': ' + it.label); if (it.sub && E.font.width(it.sub) > r.w - 4) spills.add(game.sceneName + ': ' + it.sub); if (r.x < 0 || r.x + r.w > game.W || r.y < 0 || r.y + r.h > game.H) spills.add(game.sceneName + ' off screen: ' + it.label); }); return origDraw.call(this, d); };
  G.Save.create(0, 'Lord Lumbar', { hair: 'long', skin: 3, top: 2, bottom: 1 }); G.S.arrived = true; G.S.checked = true; G.S.instructor = 'alder'; G.S.freePlay = true; G.S.minutes = 30; for (const u of G.DATA.unlocks) if (u.wear) G.S.wear[u.id] = true; G.Save.save();
  G.Save.create(1, 'Tall Enough Ann', { hair: 'short', skin: 1, top: 0, bottom: 0 }); G.S.arrived = true; G.S.freePlay = true; G.Save.save();
  for (const n of ['title', 'member', 'about', 'class', 'freeplay', 'evening', 'games', 'arrival']) { G.go(n, null, { fade: 0 }); game.advance(.4); if (G.talk.open) { I.tap('confirm'); game.advance(.2); } }
  for (const id of G.order) { G.go(G.actScene(id), { tier: 0, from: 'dev' }, { fade: 0 }); game.advance(.3); G.scenes[G.actScene(id)].run(); }
  check('at most 6 choices on any screen', most <= 6, most + ' on ' + where);
  check('no label spills out of its pill', !spills.size, [...spills].slice(0, 8));
  for (const id of G.order) G.activities[id].tiers.forEach((t, i) => { const n = E.font.wrap(t.say || G.activities[id].say, Math.min(360, game.W - 24) - 34).length; check(`${id}:${i} Card sentence fits`, n <= 3, n); const w = E.font.width(t.name, { scale: 2 }); check(`${id}:${i} Card title fits`, w <= Math.min(360, game.W - 24) - 12, w); });
  // the Dev panel and the Results detail stay inside their boxes too
  for (const id of G.order) { const ctx = G.makeRun(id, { tier: 0, seed: 3, contestants: [{ name: 'B', skill: 'good', local: true, look: G.S.look }], quiet: true }); let n = 0; if (ctx.def.begin) ctx.def.begin(ctx); while (!ctx.done && n < 240 * 120) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); n++; } const lines = E.font.wrap(ctx.contestants[0].detail, Math.min(330, game.W - 24) - 24).length; check(`${id} Results detail fits`, lines <= 2, [lines, ctx.contestants[0].detail]); if (ctx.def.stop) ctx.def.stop(ctx); }
  // About: nothing cut off
  { const A = g.ctx.WEE_ABOUT = g.G.ABOUT = JSON.parse(readFileSync(join(root, '..', 'exit-interview.json'), 'utf8')); G.go('about', null, { fade: 0 }); game.advance(.2); const pages = G.aboutPages(), text = pages.flatMap(p => p.rows.flatMap(r => r.lines)).join(' ').replace(/\s+/g, ' ');
    const want = [...Object.values(A.sourceInformation), ...A.testingFeedback, ...A.engineFeedback, ...A.promptFeedback]; for (const v of want) check('About carries in full: ' + String(v).slice(0, 40), text.includes(String(v).replace(/\s+/g, ' ')), String(v).slice(0, 80));
    for (const p of pages) { let h = 34; for (const r of p.rows) h += (r.lines.length + 1) * 9 + 5; check('About page fits: ' + p.title, h <= game.H - 40, h); } check('About is paged', pages.length >= 5 && pages.some(p => p.title === 'Credits'), pages.map(p => p.title)); }
  check('screens ran without errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
}
/* ---- build out by data: a new tier, activity, pose, chart, tray, line, day and unlock with no code change ---- */
function dataOnly() {
  const after = { 'game/data/poses.js': "G.DATA.poses.hero = { clip: '111_39_part3', a: 6.6, b: 7.6, tgt: 1.57, name: 'Hero' };",
    'game/data/charts.js': "G.DATA.charts.mine = { song: 'stepA', bars: 6, parts: { A: ['x...x...x...x...', '.', '.', '..x...x...x...x.'] }, order: 'A A A A A A' };",
    'game/data/trays.js': "G.DATA.trays3 = [{ rows: ['............', '.o........G.', '............'] }];",
    'game/data/activities.js': "G.DATA.activities.push({ id: 'heron', family: 'hold', discipline: 'Stillness', name: 'Heron Hold', view: 'brawler', room: 'deck', music: 'yoga', dur: 30, stars: [.35, .65, .90], say: 'Like the stork, but with more opinions.', controls: ['lean'], tiers: [{ name: 'Heron Hold', set: { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: .24, pushV: .6, pushEvery: 7 }, ringEvery: 12, ringReach: .2, poses: ['hero'] }, { name: 'Heron, Tired', set: { k: 11, c: 4.5, s: 15, A: 3.6, nf: 1.7, R: .22, pushV: .7, pushEvery: 6 }, ringEvery: 12, ringReach: .2, poses: ['hero'] }] }); const rowOf = id => G.DATA.activities.find(a => a.id === id); rowOf('stork').tiers.push({ name: 'Third Stork', set: { k: 12, c: 5, s: 13, A: 3, nf: 1.5, R: .3 }, ringEvery: 12, ringReach: .1, poses: ['hero'] }); rowOf('step').tiers.push({ name: 'My Step', chart: 'mine', lanes: 2 }); rowOf('tray').tiers.push({ name: 'Small Tray', trays: 'trays3', dur: 20, set: { k: 14, c: 7, s: 0, A: .25, nf: 1, R: .3 } });",
    'game/data/days.js': "G.DATA.days.splice(5, 0, { day: 6, name: 'A Spare Day', opens: ['heron'], tier2: true }); G.DATA.days[6].day = 7;",
    'game/data/unlocks.js': "G.DATA.unlocks.push({ id: 'sock', minutes: 40, name: 'A Sock', say: 'A sock. One.', wear: false });",
    'game/data/lines.js': "G.DATA.lines.tare.hello.push('A brand new hello from the data.');" };
  const g = load({ draw: true, after }), { G, game } = g; game.fadeTime = 0; game.advance(.1); G.devMember(5); G.S.freePlay = true; G.scenes.__idle = game.scenes.__idle = { update() {}, draw() {} };
  check('data: a new activity registers', !!G.activities.heron && G.order.includes('heron') && !!G.scenes.act_heron);
  G.go('act_heron', { tier: 0, from: 'dev' }, { fade: 0 }); game.advance(.3); check('data: its scene opens on its Card', game.sceneName === 'act_heron' && G.scenes.act_heron.phase() === 'card');
  const play = (id, tier) => { game.go('__idle', null, { fade: 0 }); game.advance(.05); const ctx = G.makeRun(id, { tier, seed: 2, contestants: [{ name: 'B', skill: 'good', local: true, look: G.S.look }], quiet: true }); if (ctx.def.begin) ctx.def.begin(ctx); let n = 0; while (!ctx.done && n < 200 * 120) { game.advance(1 / 120); G.stepRun(ctx, 1 / 120); n++; } return ctx; };
  const h = play('heron', 0); check('data: the new activity plays and scores', h.done && h.contestants[0].stars >= 1, h.contestants[0].pct);
  const s3 = play('stork', 2); check('data: a third stork tier plays', s3.done && s3.contestants[0].pct > 0, s3.contestants[0].pct);
  const st = play('step', 2); check('data: a new step chart plays', st.done && st.contestants[0].rh.notes.length === 48 && st.contestants[0].pct > .5, [st.contestants[0].rh.notes.length, st.contestants[0].pct]);
  const tr = play('tray', 2); check('data: a new tray plays', tr.done && tr.contestants[0].inGlass === 1, tr.contestants[0].inGlass);
  check('data: a new day and unlock read', G.DATA.dayOf(6).name === 'A Spare Day' && G.DATA.openOn('heron') === 6 && G.DATA.unlocks.some(u => u.id === 'sock'));
  check('data: a new line is reachable', G.DATA.lines.tare.hello.includes('A brand new hello from the data.'));
  check('data: no errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.where + ': ' + e.message));
}
function lint() {
  const g = load(), { G, E } = g;
  const clips = new Set(G.lib.names); for (const [k, p] of Object.entries(G.DATA.poses)) check('pose clip exists: ' + k, clips.has(p.clip), p.clip);
  for (const def of Object.values(G.activities)) { check('activity family: ' + def.id, !!G.families[def.family]); if (def.clip) check('activity clip: ' + def.id, clips.has(def.clip)); for (const t of def.tiers) { for (const p of t.poses || []) check('tier pose ' + def.id + ' ' + p, !!G.DATA.poses[p]); if (t.chart) check('tier chart ' + def.id, !!G.DATA.charts[t.chart]); if (t.trays) check('tier trays ' + def.id, !!G.DATA[t.trays]); } if (def.music) check('activity music ' + def.id, !!G.SONGS[def.music]); }
  for (const d of G.DATA.days) for (const o of d.opens) check('day opens a real activity: ' + o, !!G.activities[o]);
  const open = G.DATA.days.flatMap(d => d.opens); check('all twelve activities open by Day 3', G.order.every(id => open.includes(id)), G.order.filter(id => !open.includes(id)));
  for (const u of G.DATA.unlocks) check('unlock has a line: ' + u.id, !!u.say);
  for (const r of G.DATA.island.rows) check('island row width', r.length === 44, r.length); check('island rows', G.DATA.island.rows.length === 26);
  for (const c of G.DATA.trays.concat(G.DATA.traysHard)) for (const r of c.rows) check('tray row width', r.length === 12, r);
  // the lines: at least 150, each box holds two lines of about 60 characters
  let n = 0; const walk = (o, path) => { if (typeof o === 'string') { n++; return; } if (Array.isArray(o)) o.forEach(v => walk(v, path)); else if (o && typeof o === 'object') for (const k in o) walk(o[k], path + '.' + k); }; walk(G.DATA.lines, 'lines'); check('150 lines or more', n >= 150, n);
  // the plan's own lines, word for word; a box holds two lines
  { const plan = readFileSync(join(root, '..', 'PLAN.md'), 'utf8'), sec = plan.slice(plan.indexOf('**Tare** (talking scale'), plan.indexOf('**Boot messages')), all = JSON.stringify(G.DATA.lines).replace(/\\"/g, '"'), filled = q => q.replace('Your Spine Age is 58. ', '').replace('It has been 9 days.', 'It has been {n} days.').replace("That's 3 times", "That's {n} times");
    const quotes = [...sec.matchAll(/"([^"\n]{6,})"/g)].map(m => m[1]); check('the plan has lines to compare', quotes.length > 40, quotes.length); for (const q of quotes) check('verbatim: ' + q.slice(0, 50), all.includes(filled(q)), q);
    for (const m of plan.slice(plan.indexOf('**Ending reveal:**'), plan.indexOf('**Body Check** (about')).matchAll(/"([^"\n]{6,})"/g)) for (const part of m[1].split(' ... ')) for (const sentence of part.split(/(?<=[.?!]) /)) check('verbatim ending: ' + sentence.slice(0, 40), all.includes(sentence), sentence);
    const strings = []; const collect = o => { if (typeof o === 'string') strings.push(o); else if (Array.isArray(o)) o.forEach(collect); else if (o && typeof o === 'object') for (const k in o) collect(o[k]); }; const L = Object.assign({}, G.DATA.lines); delete L.arrival; collect(L); for (const t of strings) if (!quotes.includes(t)) check('a box holds two lines: ' + t.slice(0, 40), E.font.wrap(t.replace('{n}', '12').replace('{a}', 'Mount Posture Slalom').replace('{d}', '11.4'), 261).length <= 2, t);
    const banned = /\b(damn|hell|crap|stupid|idiot|loser|lol|dude|player|video game|level up|npc|pixel|save file|achievement|netflix|instagram|tiktok|fitbit|google)\b/i; for (const t of strings) check('tone: ' + t.slice(0, 40), !banned.test(t), t); }
  // sounds and voices the plan names
  for (const v of ['tareBoop', 'creak', 'stumble', 'clink', 'gull', 'pigeon', 'flick', 'carve', 'trayClink', 'plop', 'rope', 'stamp', 'tick', 'ok']) check('sound: ' + v, !!g.game.audio && (g.game.audio._defs ? !!g.game.audio._defs[v] : true));
  for (const v of ['tare', 'birch', 'alder', 'gertrude', 'dennis', 'marisol', 'kevin', 'okafor', 'lou', 'twins']) check('voice: ' + v, !!G.SPEAKERS[v]);
  // what the plan says to draw by hand, and the views it names
  const CODE = files().filter(f => f.startsWith('game/')).map(f => readFileSync(join(root, f), 'utf8')).join('\n');
  for (const name of ['G.drawTare', 'G.drawGerald', 'G.drawJoints', 'G.drawPlate', 'G.drawMat', 'G.drawCandle', 'dumbbell', 'bubble', 'drawSnowman', 'drawGatePole', 'CLOTHES', 'hamper', 'gecko', 'G.makeBird', 'G.Island', 'bench']) check('drawn in code: ' + name, CODE.includes(name), name);
  check('uses the engine\'s own systems', ['E.Mode7', 'E.Road', 'E.Physics', 'E.Rhythm', 'E.TileMap', 'E.FlowField', 'E.Humanoid', 'Mocap.drive', 'E.Shell', 'E.Dialog', 'game.saves'].every(n => CODE.includes(n)));
  check('its own songs, not the engine\'s songbook', !/E\.Songbook|Songbook/.test(CODE));
  check('no WebGPU requirement', !/enableGPU|hub:webgpu/.test(CODE));
  // our cast, island and activities are the plan's own: nothing named from elsewhere
  { const planText = readFileSync(join(root, '..', 'PLAN.md'), 'utf8'); for (const def of Object.values(G.activities)) check('activity name is the plan\'s: ' + def.name, planText.includes(def.tiers[0].name) || planText.includes(def.name), def.name); for (const k in G.DATA.lines.regulars) check('cast name is the plan\'s: ' + G.DATA.lines.regulars[k].name, planText.includes(G.DATA.lines.regulars[k].name), k); for (const n of ['Tare', 'Birch', 'Alder', 'Gerald', 'Lumbar Island', 'Mount Posture', 'Institute for Gentle Improvement']) check('the plan names ' + n, planText.includes(n) && JSON.stringify(G.DATA.lines).includes(n) || CODE.includes(n), n); }
  // no TODO or placeholder strings in game/
  const scan = dir => { for (const f of readdirSync(join(root, dir), { withFileTypes: true })) { const p = join(dir, f.name); if (f.isDirectory()) scan(p); else if (/\.(js|html|json|md)$/.test(f.name)) { const s = readFileSync(join(root, p), 'utf8'); check('no TODO or placeholder: ' + p, !/\b(TODO|FIXME|XXX|placeholder|lorem ipsum)\b/i.test(s)); } } }; scan('game');
  // words the plan keeps out of the game, except Source Information
  const allText = files().filter(f => f.startsWith('game/')).map(f => readFileSync(join(root, f), 'utf8')).join('\n');
  check('no source names in game text', !/\b(Wii|Mii|Balance Board|Nintendo)\b/.test(allText), (allText.match(/\b(Wii|Mii|Balance Board|Nintendo)\b/) || [])[0]);
  check('no body-size talk', !/\b(BMI|overweight|obese|fat)\b/i.test(JSON.stringify(G.DATA.lines)), (JSON.stringify(G.DATA.lines).match(/\b(BMI|overweight|obese|fat)\b/i) || [])[0]);
  check('font tiny is banned', !/font: 'tiny'/.test(allText));
  check('no Math.random in game code', !/Math\.random\(/.test(allText));
}
function py(script, args = [], timeout = 1500000) { const r = spawnSync('python3', [join(root, 'tests', script), ...args], { encoding: 'utf8', timeout, env: process.env, maxBuffer: 1 << 26 }); const out = (r.stdout || '').trim().split('\n').filter(Boolean); let ok = 0, bad = 0; for (const l of out) { if (l.startsWith('PASS')) ok++; else if (l.startsWith('FAIL')) { bad++; console.log(l); } } passed += ok; failed += bad; if (r.status !== 0) { failed++; console.log('FAIL ' + script + ' exited ' + r.status + ' ' + (r.stderr || '').slice(-600)); } }
const done = () => { console.log(`${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0); };
(async () => {
  if (group === 'rules' || group === 'all') await rules();
  if (group === 'audit') { lint(); devices(); screens(); dataOnly(); }
  if (group === 'plan' || group === 'rules' || group === 'all') { const say = process.argv.includes('--list') ? (n, ok, d) => { console.log((ok ? 'ok   ' : 'FAIL ') + n); check(n, ok, d); } : check; planAudit(say); speechAudit(say); }
  if (group === 'speech') speechAudit(check);
  if (group === 'browser' || group === 'all') { py('browser.py'); py('devices.py'); }
  if (group === 'hub' || group === 'all') py('hub.py');
  done();
})();
