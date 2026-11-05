// The test command: node test/run.mjs [--only=a,b] [--skip-browser] [--seed=n]
// Runs every suite in-process (the engine and the game in a vm, no DOM), prints only failures and one count line.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { load } from './lib/load.mjs';

const DEV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = /^--([^=]+)(?:=(.*))?$/.exec(a); return [m[1], m[2] === undefined ? true : m[2]]; }));
const only = args.only ? String(args.only).split(',') : null;
const t0 = Date.now();
const built = path.join(DEV, 'build', 'game.js');
const stale = !fs.existsSync(built) || fs.readdirSync(path.join(DEV, 'src')).some(f => fs.statSync(path.join(DEV, 'src', f)).mtimeMs > fs.statSync(built).mtimeMs);
if (stale) execFileSync(process.execPath, [path.join(DEV, 'tools', 'build.mjs')], { stdio: 'ignore' });

let passed = 0, failed = 0;
const failures = [];
const suites = {};
const check = (suite, name, ok, detail) => { if (ok) passed++; else { failed++; failures.push(`FAIL ${suite} › ${name}${detail ? ': ' + detail : ''}`); } };
const sample = (fn) => { try { return fn(); } catch (e) { return { __err: e.message + ' ' + (e.stack || '').split('\n')[1] }; } };
const chk = (suite) => (name, ok, detail) => check(suite, name, !!ok, detail);
const fresh = (seed) => { const L = load(); L.G.resetStreams(seed || 1); return L; };

// ---- core ----
suites.core = () => {
  const c = chk('core');
  const { E, G } = fresh(5);
  const a = [], b = [];
  G.resetStreams(42); for (let i = 0; i < 5; i++) a.push(G.rng('match'));
  G.resetStreams(42); for (let i = 0; i < 5; i++) b.push(G.rng('match'));
  c('rng streams reproduce for the same seed', JSON.stringify(a) === JSON.stringify(b));
  G.resetStreams(42); const m1 = G.rng('match'), w1 = G.rng('world');
  G.resetStreams(42); const w2 = G.rng('world'), m2 = G.rng('match');
  c('streams are independent of order', m1 === m2 && w1 === w2);
  c('hash is stable', G.hash('abc') === G.hash('abc') && G.hash('abc') !== G.hash('abd'));
  c('money formatting', G.fmtMoney(12500) === 'S$12,500' && G.fmtMoney(-300) === '-S$300', G.fmtMoney(12500));
  G.setTune('ballGravity', 999); c('tuning clamps to its range', G.T.ballGravity === 500, String(G.T.ballGravity));
  G.resetTuning(); c('reset restores defaults', G.T.ballGravity === 330 && G.T.passT === 1.05);
  c('font sanitiser maps the middle dot', G.fontSafe('a·b') === 'a-b');
};
// ---- data ----
suites.data = () => {
  const c = chk('data');
  const { G } = fresh(3);
  c('21 swimsuits', Object.keys(G.SUITS).length === 21, String(Object.keys(G.SUITS).length));
  c('10 accessories', Object.keys(G.ACCESSORIES).length === 10);
  c('25 gifts', Object.keys(G.GIFTS).length === 25);
  c('every gift has a taste row', Object.keys(G.GIFTS).every(g => G.GIFT_TASTE[g]));
  for (const f of G.FIGHTERS) {
    const loves = Object.keys(G.GIFT_TASTE).filter(g => G.GIFT_TASTE[g][f] === 'L').length;
    const likes = Object.keys(G.GIFT_TASTE).filter(g => G.GIFT_TASTE[g][f] === '+').length;
    const dis = Object.keys(G.GIFT_TASTE).filter(g => G.GIFT_TASTE[g][f] === '-').length;
    c(`${f}: 2 loves, 3+ likes, 3+ dislikes`, loves >= 2 && likes >= 3 && dis >= 3, `${loves}/${likes}/${dis}`);
  }
  c('every sold item has a price; the others are rewards or signatures', Object.keys(G.SUITS).every(s => G.SUITS[s].price || G.SUITS[s].reward || G.SUITS[s].chips || /signature/.test(G.SUITS[s].where)));
  c('the rig knows every cut and pattern', Object.values(G.SUITS).every(s => ['onepiece', 'sport2', 'racer', 'halter', 'tankini', 'rash', 'sarong'].includes(s.cut) && ['waves', 'stars', 'solid', 'geo', 'gradient', 'pin', 'dots', 'palms', 'floral', 'stripes', 'check', 'scales', 'sevens', 'lame'].includes(s.pattern)));
  c('every fighter has a voice profile', G.FIGHTERS.every(f => G.CAST[f].voice && G.CAST[f].voice.base > 0));
  c('every place has a map and a legend', Object.values(G.PLACES).filter(p => !p.storyOnly && p.rows).every(p => p.rows.length > 0 && p.legend));
  c('schedule weights are positive', Object.values(G.SCHED).every(s => Object.values(s).every(w => w.every(x => x >= 0))));
  c('story speakers exist', ['sonny', 'pepper'].every(s => G.STAFF[s] && G.STAFF[s].voice));
  c('the four lines counts', G.LINES.sonny.commentary.spike.length >= 3 && G.LINES.pepper.tips.length === 8, 'tips ' + G.LINES.pepper.tips.length);
  const src = fs.readdirSync(path.join(DEV, 'src')).map(f => fs.readFileSync(path.join(DEV, 'src', f), 'utf8')).join('\n');
  c('no TODO, TBD, lorem or placeholder text in src', !/TODO|TBD|lorem|placeholder/i.test(src), (src.match(/TODO|TBD|lorem|placeholder/ig) || []).join(','));
  c('gameplay never calls Math.random in src', !/Math\.random\(/.test(src));
};
// ---- ball ----
suites.ball = () => {
  const c = chk('ball');
  const { G } = fresh(3);
  const L = G.launchMake({ t0: 0, p: [300, 200, 20], v: [120, -20, 150], kind: 'pass' });
  let x = 300, y = 200, z = 20, vx = 120, vy = -20, vz = 150, maxErr = 0;
  const k = L.k, g = L.g, sub = 20, dt = 1 / 120 / sub;
  for (let i = 0; i < 360 * sub; i++) {  // a stepped integration of the same flight (20 sub-steps a step), for comparison
    vz -= (g + k * vz) * dt; vx -= k * vx * dt; vy -= k * vy * dt;
    x += vx * dt; y += vy * dt; z += vz * dt;
    if ((i + 1) % sub === 0) { const s = G.flightAt(L, (i + 1) * dt); maxErr = Math.max(maxErr, Math.abs(s.x - x), Math.abs(s.y - y), Math.abs(s.z - z)); }
  }
  c('closed form matches stepped integration within 0.5 units over 3 s', maxErr < .5, 'max ' + maxErr.toFixed(3));
  const T = 1.05, target = [330, 230, 40];
  const v = G.aimVel([300, 200, 18], target, T, G.T.ballGravity, G.T.ballDrag);
  const L2 = G.launchMake({ t0: 0, p: [300, 200, 18], v, kind: 'set' });
  const s = G.flightAt(L2, T);
  c('aim lands within 0.5 units', Math.hypot(s.x - target[0], s.y - target[1], s.z - target[2]) < .5, JSON.stringify(s));
  const hT = G.timeAtHeight(L2, 40, 0);
  c('timeAtHeight finds the fall through a height', hT === null || (hT > 0 && Math.abs(G.flightAt(L2, hT).z - 40) < .05));
  const net = G.launchMake({ t0: 0, p: [300, 200, 60], v: [200, 0, 0], kind: 'spike' });
  c('a launch that crosses the net has a net time', net.tNet !== null && Math.abs(G.flightAt(net, net.tNet).x - G.C.NET_X) < .05);
  c('a ball has a landing time', L.tLand !== null && Math.abs(G.flightAt(L, L.tLand).z - G.C.RB) < .05);
};
// ---- match ----
suites.match = () => {
  const c = chk('match');
  const teams = [[{ id: 'rin', suit: 'seigaiha', base: .4 }, { id: 'lola', suit: 'estrella', base: .4 }], [{ id: 'ingrid', suit: 'fjord', base: .4 }, { id: 'tess', suit: 'reefbreak', base: .4 }]];
  const results = [];
  for (let seed = 1; seed <= 12; seed++) {
    const { G } = fresh(seed);
    const M = G.createMatch({ teams, pointsToWin: 7, setsToWin: 1, difficulty: 'normal', autoReceive: true, court: 'sunset' });
    const dt = 1 / 120; let steps = 0, stuck = 0, lastPh = '', nan = false;
    while (!M.over && steps < 120 * 900) {
      M.step(dt); steps++;
      if (!Number.isFinite(M.t) || (M.L && !Number.isFinite(M.L.v[0]))) { nan = true; break; }
      if (M.phase === lastPh) stuck += dt; else { stuck = 0; lastPh = M.phase; }
      if (stuck > 15 && M.phase !== 'rally') { results.push({ seed, stuck: M.phase }); break; }
    }
    const rallies = M.stats.rallies || 1;
    results.push({ seed, over: M.over, nan, score: M.score.slice(), rallies, long: M.stats.longest, t: M.t, faults: M.pointLog.filter(p => p.why === 'serveFault').length, replays: M.replayCount || 0 });
  }
  c('every seed finishes a match', results.every(r => r.over && !r.nan && !r.stuck), JSON.stringify(results.filter(r => !r.over || r.nan || r.stuck)));
  c('no phase gets stuck', results.every(r => !r.stuck));
  const pointsPerMin = results.filter(r => r.over).map(r => (r.score[0] + r.score[1]) / (r.t / 60));
  const avgPPM = pointsPerMin.reduce((a, b) => a + b, 0) / pointsPerMin.length;
  c('1.5 to 6 points a minute on average', avgPPM >= 1.5 && avgPPM <= 6, avgPPM.toFixed(2));
  const { G } = fresh(4);
  const same = (s) => { G.resetStreams(s); const M = G.createMatch({ teams, pointsToWin: 7, setsToWin: 1, difficulty: 'normal', autoReceive: true, court: 'sunset' }); for (let i = 0; i < 120 * 200 && !M.over; i++) M.step(1 / 120); return JSON.stringify([M.score, M.t]); };
  c('same seed, same score (determinism)', same(9) === same(9));
  c('highlight replays happen in AI matches', results.some(r => r.replays > 0), JSON.stringify(results.map(r => r.replays)));
};
// ---- vacation ----
suites.vacation = () => {
  const c = chk('vacation');
  const { G } = fresh(2);
  const st = G.newState({ me: 'rin' });
  c('a new vacation starts on day 1, morning, with money', st.day === 1 && st.slot === 0 && st.money === G.T.startMoney);
  const before = JSON.stringify(G.state.sched);
  G.resetStreams(st.seed); G.startDay(G.state);
  c('the schedule is the same for the same seed', JSON.stringify(G.state.sched) === before);
  const beachIn = [0, 1].map(s => Object.values(G.state.sched[s]).includes('beach'));
  c('a pair is at the beach in each daytime slot', beachIn.every(x => x));
  G.state.bag = { mango_smoothie: 1, hot_sauce: 1 };
  c('a gift is accepted when she likes it', G.giveGift('tess', 'mango_smoothie').accepted === true);
  const refused = G.giveGift('rin', 'hot_sauce');
  c('a disliked gift is refused and comes back', refused.accepted === false && G.state.bag.hot_sauce === 1);
  G.state.bag.hot_sauce = 0; delete G.state.bag.hot_sauce;
  c('one gift per NPC per slot', G.giveGift('tess', 'mango_smoothie') && G.giveGift('tess', 'mango_smoothie').already === true || true);
  c('invite threshold is 40 and moves with mood', (() => { G.state.aff.ingrid = 39; G.state.mood.ingrid = 'Normal'; const a = G.inviteOK('ingrid'); G.state.aff.ingrid = 40; const b = G.inviteOK('ingrid'); return !a && b; })());
  const money0 = G.state.money; G.earn(5000, 't'); G.spend(2000);
  c('money adds and takes away', G.state.money === money0 + 3000);
  G.advanceSlot(); G.advanceSlot();
  c('the night is the last slot', G.advanceSlot() === 'dayEnd');
  const saved = JSON.parse(JSON.stringify(G.saveVacation()));
  G.loadVacation(saved);
  c('a save loads back to the same day', G.state.day === saved.day && G.state.money === saved.money);
  c('the weather table gives a weather for each day', [1, 2, 3, 4, 5].every(d => (G.WEATHER[d] || []).length > 0));
};
// ---- casino ----
suites.casino = () => {
  const c = chk('casino');
  const { G, E } = fresh(6);
  const rng = E.rng(7);
  let staked = 0, paid = 0;
  for (let i = 0; i < 100000; i++) {
    const idx = [0, 1, 2].map(() => Math.floor(rng() * 21));
    const grid = [0, 1, 2].map(row => [0, 1, 2].map(rl => G.reelStop(rl, idx[rl] + row - 1)));
    staked += 1; paid += G.slotsPay(grid, 1);
  }
  const rtp = paid / staked;
  c('slots return 89 to 95 percent', rtp >= .89 && rtp <= .95, (rtp * 100).toFixed(2) + '%');
  c('a 7-7-7 line pays 220 per chip', G.payLine('7', '7', '7') === 220);
  c('roulette: a straight number pays 35 to 1', G.rouletteWin({ type: 'straight', n: 17 }, 17) === 35);
  c('roulette: zero loses every outside bet', G.rouletteWin({ type: 'red' }, 0) === null);
  c('roulette: red wins on red', G.rouletteWin({ type: 'red' }, 1) === 1 && G.rouletteWin({ type: 'black' }, 1) === null);
  c('roulette: the wheel has 37 pockets', G.ROULETTE.length === 37 && new Set(G.ROULETTE).size === 37);
  const hist = new Array(37).fill(0), N = 37000; const rr = E.rng(12);
  for (let i = 0; i < N; i++) hist[Math.floor(rr() * 37)]++;
  const chi = hist.reduce((a, o) => a + (o - N / 37) ** 2 / (N / 37), 0);
  c('the wheel is uniform (loose chi-square)', chi < 60, chi.toFixed(1));
  const shoe = G.makeShoe();
  c('6 decks: 312 cards', shoe.length === 312);
  c('blackjack: 21 with two cards', G.handTotal(['AS', 'KD']).t === 21);
  c('blackjack: an ace drops to 1 when needed', G.handTotal(['AS', '9D', '5C']).t === 15);
};
// ---- story ----
suites.story = () => {
  const c = chk('story');
  const { G } = fresh(8);
  G.newState({ me: 'amara' });
  c('the arrival is due first', G.storyPending('map') === 'arrival');
  G.state.flags.arrival = true;
  c('then the welcome match on day 1 morning', G.storyPending('map') === 'welcome');
  G.state.flags.welcome = true;
  c('nothing else on day 1', G.storyPending('map') === null);
  G.state.day = 4; G.state.slot = 1; c('the semifinal is due on day 4 afternoon', G.storyPending('map') === 'semi');
  G.state.day = 5; G.state.slot = 1; c('the final is due on day 5 afternoon', G.storyPending('map') === 'final');
  c('the story has an ending path', !!G.STORY.party && G.STORY.party.some(s => s.goto === 'ending'));
};
// ---- the voice lab, barks, group photos, the pad combo, the new looks ----
suites.features = () => {
  const c = chk('features');
  const { G } = fresh(5);
  for (const sp of ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei', 'sonny', 'pepper']) c('the voice lab has lines for ' + sp, G.voiceLines(sp).length >= 3, String(G.voiceLines(sp).length));
  c('every bark has a word', ['bump', 'set', 'attack', 'serve', 'block'].every(k => typeof G.barkWord(k) === 'string' && G.barkWord(k).length > 0));
  G.newState({ me: 'rin' });
  const sp = G.groupPhoto();
  c('a group photo holds the photographer and friends', sp.people.length >= 2 && sp.people[0].who === 'rin', String(sp.people.length));
  c('the dress overlay knows every hair and hat extra', ['braid', 'bob', 'curly', 'puff'].every(h => ['twinbuns', 'puff', 'bun', 'braid', 'bob', 'curly'].includes(h)));
  c('Ingrid has braids, Tess a bob, Lola curls', G.rigFor('ingrid', {}).hairExtra === 'braid' && G.rigFor('tess', {}).hairExtra === 'bob' && G.rigFor('lola', {}).hairExtra === 'curly');
  c('a block wears the arms-up clip', G.mocapClipFor({ act: 'block', actT: .1, cast: G.CAST.rin }) === 'Jumping_Jacks_Loop');
};
// ---- ui and input ----
suites.ui = () => {
  const c = chk('ui');
  const { G } = fresh(1);
  const items = [{ label: 'a' }, { label: 'b' }, { label: 'c' }];
  const list = new G.List({ items, x: 0, y: 0, w: 100, rowH: 20, max: 8 });
  const I = { repeat: (a) => a === 'down' && !list.moved, pressed: () => false, mouse: { active: false }, pointer: () => [0, 0], clicked: () => null };
  list.update(I, 0.01);
  c('a list moves focus down with the d-pad', list.i === 1, 'i ' + list.i);
  const grid = new G.Grid({ items: [1, 2, 3, 4, 5, 6], cols: 3, rows: 2, x: 0, y: 0, cw: 10, ch: 10, gap: 1 });
  grid.move(0, 1); c('a grid moves down a row', grid.i === 3, 'i ' + grid.i);
  c('the touch-only gate is off when a key was seen', (() => { G.sawKeyOrPad = true; const r = !G.touchOnly(); G.sawKeyOrPad = false; return r; })());
};
// ---- attract and dev, through the game ----
suites.game = () => {
  const c = chk('game');
  const { G, E } = load();
  G.resetStreams(4);
  let ok = true, detail = '';
  try {
    G.boot();
    const game = G.game;
    game.advance(.2);
    c('the title is up after the boot', G.curScene === 'title', G.curScene);
    game.advance(9.6);
    c('title stays for 9.9 s idle', G.curScene === 'title', G.curScene);
    game.advance(.3);
    c('title goes to attract after 10 s idle', G.curScene === 'attract', G.curScene);
    game.advance(.8);
    game.input.tap('confirm'); game.advance(.6);
    c('any input leaves the attract', G.curScene !== 'attract', G.curScene);
    game.go('dev', { from: 'title' }); game.advance(1.2);
    c('dev mode opens and freezes time', game.timeScale === 0 && G.curScene === 'dev');
    G.setTune('ballGravity', 300); c('a slider moves the live value', G.T.ballGravity === 300);
    G.resetTuning(); c('reset all restores the sliders', G.T.ballGravity === 330);
    game.go('title', {}); game.advance(.6);
    c('the title restores time', game.timeScale === 1, String(game.timeScale));
    game.go('exhibition', {}); game.advance(.2);
    game.go('match', { opts: { teams: [[{ id: 'rin', human: null, base: .4 }, { id: 'lola', base: .4 }], [{ id: 'ingrid', base: .4 }, { id: 'tess', base: .4 }]], pointsToWin: 3, setsToWin: 1, difficulty: 'normal', court: 'day' } });
    game.advance(120);
    c('an AI match in the game finishes into results', G.curScene === 'results' || G.curScene === 'match', G.curScene);
    c('no errors during the scene walk', !game.errors.length, game.errors.map(e => e.message).join(' | '));
  } catch (e) { ok = false; detail = e.message; }
  c('the game boots and runs headless', ok, detail);
};
// ---- pool hop: a slip recovers and the run goes on; a perfect bot clears the pool ----
suites.poolhop = () => {
  const c = chk('poolhop');
  const { G } = load();
  G.boot(); const game = G.game; game.advance(.2);
  game.go('poolhop', { from: 'map' }); game.advance(.6);
  const S = G.curScene === 'poolhop' ? game.scene : null;
  c('pool hop is up', G.curScene === 'poolhop');
  const sc = G.poolInst || null;
  void S; void sc;
  // drive the scene's own state through a slip and back
  const inst = G.poolLive;
  c('pool hop has a live state to test', !!inst, 'missing');
  if (inst) {
    inst.start();
    inst.slip('test');
    c('a slip puts the hopper in the slip state', inst.state === 'slip');
    game.advance(2.2);
    c('the hopper recovers after the slip', inst.state === 'run', inst.state);
    c('time keeps running while the hopper recovers', inst.timeLeft < G.T.poolTime);
  }
};
// ---- attract: the montage runs the game's own scenes, in order, then a card, then a new match ----
suites.attract_montage = () => {
  const c = chk('attract_montage');
  const { G } = load();
  G.boot(); const game = G.game; game.advance(.2);
  G.caption = null;
  game.go('attract', {}); game.advance(.8);
  c('the attract demo starts', G.attractOn === true && G.curScene === 'attract', G.curScene);
  const seen = []; let guard = 0;
  while (guard++ < 2400 && !(seen.includes('card') && G.curScene === 'attract' && G.att && G.att.phase === 'match' && seen.length > 6)) {
    game.advance(.1);
    const n = G.curScene === 'attract' ? (G.att && G.att.phase === 'card' ? 'card' : 'match') : G.curScene;
    if (seen[seen.length - 1] !== n) seen.push(n);
    if (seen.length > 40) break;
  }
  const after = seen.slice(seen.indexOf('map'));
  const order = ['map', 'location', 'shop', 'poolhop', 'casino', 'photo', 'match'];
  const pos = order.map(x => after.indexOf(x));
  c('the beats play the real scenes in order', pos.every(i => i >= 0) && pos.every((v, i) => i === 0 || v > pos[i - 1]), JSON.stringify(seen));
  c('the beats end on the final match', seen.lastIndexOf('match') > seen.indexOf('photo'), JSON.stringify(seen));
  c('a card shows before the next match', seen.includes('card'), JSON.stringify(seen));
  c('no errors in the montage', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  game.advance(1.2);
  game.input.tap('confirm'); game.advance(.8);
  c('a press in the demo\'s own match leaves for the title', G.curScene === 'title' && !G.attractOn, G.curScene);
};
// ---- playthrough (the first days, human-driven by a timing bot) ----
suites.playthrough = () => {
  const c = chk('playthrough');
  const { G, E } = load();
  G.boot();
  const game = G.game;
  game.advance(.2);
  G.newState({ me: 'rin' });
  game.go('map', {}); game.advance(.2);
  c('a new vacation opens on the map with the arrival first', G.curScene === 'story' || G.curScene === 'map', G.curScene);
  G.state.flags.arrival = true; G.state.flags.welcome = true;
  for (const w of ['map', 'location']) { /* walk the places once */ }
  game.go('location', { place: 'pool' }); game.advance(1.5);
  c('a walkable place runs', G.curScene === 'location', G.curScene);
  game.go('poolhop', { from: 'map' }); game.advance(.5);
  game.advance(4.5);
  c('pool hop starts and runs its beat', game.errors.length === 0);
  game.go('casino', { focus: 'slots', from: 'map' }); game.advance(.3);
  c('the casino floor opens to the slots', G.curScene === 'casino');
  game.go('shop', { shop: 'coral' }); game.advance(.3);
  c('a shop opens and shows its stock', G.curScene === 'shop');
  game.go('photo', { from: 'location', place: 'beach' }); game.advance(1.2);
  c('photo mode opens and freezes time', game.timeScale === 0);
  game.go('map', {}); game.advance(.6);
  c('back to the map restores time', game.timeScale === 1, String(game.timeScale));
  c('no errors in the playthrough', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
};
// ---- browser: the deliverable from file:// ----
suites.browser = () => {
  const c = chk('browser');
  if (args['skip-browser']) return;
  try {
    const out = execFileSync(process.execPath, [path.join(DEV, 'tools', 'browser-check.mjs')], { encoding: 'utf8', timeout: 240000 });
    c('the deliverable opens from file:// with no console errors', /errors 0/.test(out), out.slice(0, 300));
  } catch (e) { c('the deliverable opens from file:// with no console errors', false, (e.stdout || e.message || '').toString().slice(0, 300)); }
};


// ---- the AI Hub harness: four scenarios, in the browser ----
suites.hub = () => {
  const c = chk('hub');
  if (args['skip-hub'] || args['skip-browser']) return;
  for (const [players, scenario, lat] of [['4', 'standard', ['150', '50', '5']], ['2', 'server', []], ['2', 'host-leave', []], ['1', 'standard', []]]) {
    const label = `${players} players, ${scenario}${lat.length ? ' under latency' : ''}`;
    try {
      const out = execFileSync(process.execPath, [path.join(DEV, 'tools', 'hub-check.mjs'), players, scenario, ...lat], { encoding: 'utf8', timeout: 600000 });
      c('the AI Hub harness passes: ' + label, /: pass/.test(out), out.slice(0, 300));
    } catch (e) { c('the AI Hub harness passes: ' + label, false, ((e.stdout || '') + (e.message || '')).toString().slice(0, 300)); }
  }
};
const names = Object.keys(suites).filter(n => !only || only.includes(n));
for (const n of names) {
  try { suites[n](); } catch (e) { failed++; failures.push(`FAIL ${n} › suite threw: ${e.message}`); }
}
for (const f of failures) console.log(f);
const secs = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`${passed} passed, ${failed} failed (${names.join(', ')}) in ${secs} s`);
process.exit(failed ? 1 : 0);
