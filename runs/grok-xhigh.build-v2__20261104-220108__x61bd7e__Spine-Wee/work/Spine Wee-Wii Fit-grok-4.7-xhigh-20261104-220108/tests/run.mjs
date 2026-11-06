/* One command: node tests/run.mjs [rules|browser|hub|all]
 * Prints failures and a count line. Drives the shipped scripts. */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dev = path.resolve(here, '..');
const work = path.resolve(dev, '..');
const SCRATCH = '/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-220108__x61bd7e/tmp/grok-goal-0c0bba67d95a/implementer';
const TITLE = 'Spine Wee-Wii Fit-grok-4.7-xhigh-20261104-220108';
const HTML = path.join(work, TITLE + '.html');

const FILES = [
  'vendor/session.js',
  'engine/my-3d2dge.js',
  'vendor/readable.js',
  'vendor/mocap.js',
  'vendor/fitclips.js',
  'game/data/lines.js',
  'game/data/content.js',
  'game/balance.js',
  'game/audio.js',
  'game/rigs.js',
  'game/ui.js',
  'game/play.js',
  'game/world.js',
  'game/boot.js'
];

const vmErrors = [];
const ctx = {
  console: {
    log() {}, info() {}, warn() {}, debug() {},
    error(...a) { vmErrors.push(a.map(String).join(' ')); }
  },
  addEventListener() {}, removeEventListener() {},
  setTimeout, clearTimeout, setInterval, clearInterval,
  location: { hash: '', search: '', pathname: '/index.html', href: 'file:///index.html' },
  navigator: { userAgent: 'node', maxTouchPoints: 0, getGamepads() { return []; } },
  performance: { now: () => Date.now() },
  requestAnimationFrame() { return 0; },
  cancelAnimationFrame() {},
  devicePixelRatio: 1,
  HTMLElement: function HTMLElement() {},
  Element: function Element() {}
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.self = ctx;
ctx.parent = ctx;
ctx.top = ctx;
vm.createContext(ctx);
for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(dev, f), 'utf8'), ctx, { filename: f });
const G = ctx.G;
const E = ctx.My3D2dge;
const realAIHub = ctx.AIHub;

function boot(opts) {
  vmErrors.length = 0;
  return G.boot(Object.assign({ headless: true }, opts || {}));
}
function snap(game) {
  return game.debug.snapshot();
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pumpStory(game, driver) {
  G.setDriver(driver);
  const trace = [];
  let age3 = null;
  let same = 0;
  let lastKey = '';
  const t0 = Date.now();
  for (let i = 0; i < 200000; i++) {
    if (Date.now() - t0 > 240000) throw new Error('playthrough timed out\n' + trace.slice(-20).join('\n'));
    if (game.errors && game.errors.length) throw new Error(game.errors.join(' | ') + '\n' + trace.slice(-12).join('\n'));
    const s = snap(game);
    const talkI = (G.talk && G.talk.open) ? G.talk.i : -1;
    const key = [s.scene, s.day, s.session, s.phase, s.activity, talkI, Math.round((s.left || 0) * 10)].join('|');
    const mark = s.scene + ' d' + s.day + ' ' + s.phase + ' ' + (s.activity || '') + (talkI >= 0 ? ' p' + talkI : '');
    if (trace[trace.length - 1] !== mark) trace.push(mark);
    if (s.day === 3 && s.plateau) {
      if (age3 == null) age3 = s.spineAge;
      else if (s.spineAge !== age3) throw new Error('day 3 Spine Age moved from ' + age3 + ' to ' + s.spineAge);
    }
    if (s.freePlay && s.scene === 'ending') {
      game.advance(1 / 120);
      break;
    }
    if (s.scene === 'free') break;
    if (key === lastKey) same++;
    else { same = 0; lastKey = key; }
    if (same > 40) throw new Error('stuck ' + key + '\n' + trace.slice(-24).join('\n'));
    if (s.phase === 'play' || s.phase === 'auto') {
      G.setDriver(driver);
      const dt = Math.max(1 / 120, Math.min(1, s.left > 0 ? s.left : 1 / 120));
      game.advance(dt);
    } else {
      game.input.tap('confirm');
      game.advance(1 / 120);
    }
  }
  const end = snap(game);
  return { end, age3, trace, profile: G.profile };
}

function runActivity(id, tier, skill) {
  const game = boot();
  G.setDriver(skill);
  game.go('play', { id: id, tier: tier, trial: true, driver: skill, skipToPlay: true, seed: 4 }, { fade: 0 });
  let eyes = false;
  for (let i = 0; i < 40000; i++) {
    const s = snap(game);
    if (G.session && G.session.fam && G.session.fam.eyes) eyes = true;
    if (s.scene === 'play' && s.phase === 'menu' && s.activity === id && i > 2) {
      return { pct: s.pct, stars: s.stars, eyes: eyes, errors: game.errors.slice() };
    }
    if (game.errors.length) return { pct: s.pct, stars: s.stars, eyes: eyes, errors: game.errors.slice() };
    G.setDriver(skill);
    const dt = Math.max(1 / 120, Math.min(0.5, s.left > 0 ? s.left : 0.25));
    game.advance(dt);
  }
  return { pct: 0, stars: 0, eyes: eyes, errors: ['timed out ' + id + ' t' + tier + ' ' + skill] };
}

const tests = [];
function add(group, name, fn) { tests.push({ group, name, fn }); }

add('rules', 'boot smoke', () => {
  const game = boot();
  const s = snap(game);
  assert(s.scene === 'title', 'scene ' + s.scene);
  assert(s.title === 'Spine Wee', s.title);
  assert(game.settings.music === 0.1, 'music ' + game.settings.music);
  assert(game.settings.glyphs === 'playstation', 'glyphs ' + game.settings.glyphs);
  assert(!game.errors.length, game.errors.join(' | '));
  game.advance(0.2);
  assert(snap(game).scene === 'title', 'left title');
});

add('rules', 'section 3 bands', () => {
  const names = ['body', 'sun', 'stork1', 'stork2', 'candle', 'laundry'];
  const skills = ['passive', 'poor', 'average', 'good'];
  const acc = {};
  for (const name of names) for (const skill of skills) acc[name + ' ' + skill] = [];
  for (let s = 1; s <= 12; s++) {
    for (const name of names) {
      const seed = (s * 997 + name.charCodeAt(0) * 13) >>> 0;
      for (const skill of skills) {
        const r = G.bandTrial(name, skill, seed);
        acc[name + ' ' + skill].push(r.pct);
      }
    }
  }
  const bad = [];
  for (const key in acc) {
    const name = key.split(' ')[0];
    const skill = key.split(' ')[1];
    const mean = acc[key].reduce(function (a, b) { return a + b; }, 0) / acc[key].length;
    const expect = G.SETS[name].band[skill];
    if (Math.abs(mean - expect) > 10) bad.push(key + ' mean ' + mean.toFixed(1) + ' vs ' + expect);
  }
  assert(!bad.length, bad.join('\n'));
});

add('rules', 'device lean', () => {
  const padGame = boot();
  const stopPad = padGame.hook('input', function () {
    const p = padGame.input.padMove;
    p[0] = 0.8;
    p[1] = -0.2;
  });
  padGame.advance(1 / 120);
  assert(G.lean.source === 'pad', 'pad source ' + G.lean.source);
  assert(G.lean.ux > 0.5, 'pad ux ' + G.lean.ux);
  stopPad();

  const keyGame = boot();
  keyGame.input.hold('left', true);
  keyGame.advance(0.45);
  assert(G.lean.source === 'keys', 'key source ' + G.lean.source);
  assert(G.lean.ux < -0.4, 'key ux ' + G.lean.ux);
  keyGame.input.hold('left', false);

  const mouseGame = boot();
  const W = mouseGame.screen.W, H = mouseGame.screen.H;
  const stopMouse = mouseGame.hook('input', function () {
    mouseGame.input.feed('move', W * 0.82, H * 0.5);
  });
  mouseGame.advance(1 / 120);
  assert(G.lean.source === 'mouse', 'mouse source ' + G.lean.source + ' ux ' + G.lean.ux);
  assert(G.lean.ux > 0.25, 'mouse ux ' + G.lean.ux);
  stopMouse();
});

add('rules', 'good playthrough', () => {
  const game = boot();
  const out = pumpStory(game, 'good');
  fs.writeFileSync(path.join(SCRATCH, 'play-good.json'), JSON.stringify({
    scene: out.end.scene, day: out.end.day, minutes: out.profile.minutes, age: out.end.spineAge,
    age3: out.age3, unlocks: out.profile.unlocks, played: out.profile.played, duel: out.profile.duelWon,
    free: out.profile.freePlay, trace: out.trace
  }, null, 2));
  assert(out.end.scene === 'free', 'ended in ' + out.end.scene + '\n' + out.trace.slice(-12).join('\n'));
  assert(out.profile.freePlay, 'free play flag');
  assert(out.age3 != null, 'never held day 3');
  assert(out.end.spineAge < 71, 'spine age ' + out.end.spineAge);
  const ids = Object.keys(G.ACTS);
  const played = ids.filter(function (id) { return out.profile.played[id]; });
  assert(played.length === ids.length, 'played ' + played.join(','));
  assert(out.profile.unlocks.indexOf('friend') >= 0, 'minutes ' + out.profile.minutes + ' unlocks ' + out.profile.unlocks.join(','));
});

add('rules', 'passive playthrough', () => {
  const game = boot();
  const out = pumpStory(game, 'passive');
  fs.writeFileSync(path.join(SCRATCH, 'play-passive.json'), JSON.stringify({
    scene: out.end.scene, minutes: out.profile.minutes, age3: out.age3, duel: out.profile.duelWon, trace: out.trace
  }, null, 2));
  assert(out.end.scene === 'free', 'ended in ' + out.end.scene + '\n' + out.trace.slice(-12).join('\n'));
  assert(out.age3 != null, 'never held day 3');
  assert(out.profile.ending, 'no ending flag');
});

add('rules', 'star gates', () => {
  const bad = [];
  const rows = [];
  const ids = Object.keys(G.ACTS);
  for (const id of ids) {
    const gates = G.ACTS[id].stars;
    const cells = [
      [1, 'passive', 0],
      [1, 'average', 1],
      [1, 'good', 2],
      [2, 'passive', 0],
      [2, 'good', 1],
      [2, 'expert', 2]
    ];
    for (const cell of cells) {
      const tier = cell[0], skill = cell[1], need = cell[2];
      const r = runActivity(id, tier, skill);
      rows.push(id + ' t' + tier + ' ' + skill + ' ' + (r.pct || 0).toFixed(3) + ' ★' + r.stars);
      if (r.errors && r.errors.length) bad.push(id + ' t' + tier + ' ' + skill + ' ERR ' + r.errors.join(';'));
      else if (need === 0) { if (r.stars !== 0) bad.push(id + ' t' + tier + ' ' + skill + ' stars ' + r.stars + ' pct ' + r.pct); }
      else if (r.stars < need) bad.push(id + ' t' + tier + ' ' + skill + ' ★' + r.stars + ' need ' + need + ' pct ' + (r.pct || 0).toFixed(3));
      if (id === 'stork' && tier === 2 && skill === 'good' && !r.eyes) bad.push('stork tier 2 did not hide the plate');
    }
  }
  fs.writeFileSync(path.join(SCRATCH, 'gates.txt'), rows.join('\n'));
  assert(!bad.length, bad.join('\n'));
});

add('rules', 'saves', () => {
  const game = boot();
  for (let i = 0; i < 3; i++) {
    G.profile = G.freshProfile(i);
    G.profile.name = 'Card ' + i;
    G.profile.day = i + 1;
    assert(game.saves.save(i) === true, 'save ' + i);
  }
  assert(game.saves.list().length === 4, 'list ' + game.saves.list().length);
  const mem = {};
  for (const k in game.saves._mem) mem[k] = game.saves._mem[k];
  const game2 = boot();
  for (const k in mem) {
    const slot = k === 'auto' ? 'auto' : +k;
    game2.saves._put(slot, mem[k]);
  }
  for (let i = 0; i < 3; i++) {
    const loaded = game2.saves.load(i);
    assert(loaded, 'load ' + i);
    assert(G.profile.name === 'Card ' + i, 'name ' + G.profile.name);
    assert(G.profile.day === i + 1, 'day ' + G.profile.day);
  }
  game2.saves._put(0, '{not json');
  const damaged = game2.saves.get(0);
  assert(damaged && damaged.damaged, 'not damaged');
  assert(game2.saves.load(0) === null, 'damaged load');
  const before = game2.errors.length;
  game2.go('slots', {}, { fade: 0 });
  game2.advance(1 / 120);
  game2.input.tap('confirm');
  game2.advance(1 / 120);
  assert(game2.errors.length === before, game2.errors.join(' | '));
});

add('rules', 'determinism', () => {
  const a = G.hashRun(1);
  const b = G.hashRun(1);
  const c = G.hashRun(2);
  assert(a === b, 'same seed drifted ' + a + ' ' + b);
  assert(a !== c, 'different seeds matched');
});

add('rules', 'attract at 10s', () => {
  const game = boot();
  const memBefore = JSON.stringify(game.saves._mem);
  const minutes = G.profile.minutes;
  const unlocks = G.profile.unlocks.slice();
  game.advance(9.9);
  let s = snap(game);
  assert(!s.attract, 'attract at ' + game.time);
  assert(game.time < 10, 'time ' + game.time);
  let guard = 0;
  while (game.time < 10 && guard++ < 40) game.advance(1 / 120);
  s = snap(game);
  assert(s.attract, 'not attract at ' + game.time + ' idle ' + G.idleSteps);
  assert(game.time >= 9.999, 'early ' + game.time);
  game.advance(0.4);
  assert(G.profile.minutes === minutes, 'attract awarded minutes');
  assert(G.profile.unlocks.join() === unlocks.join(), 'attract unlocked');
  assert(JSON.stringify(game.saves._mem) === memBefore, 'attract wrote a save');
  game.input.tap('confirm');
  game.advance(1 / 120);
  game.advance(1 / 120);
  s = snap(game);
  assert(s.scene === 'title', 'returned to ' + s.scene);
  assert(!s.attract, 'still attracting');
});

add('rules', 'dev sliders', () => {
  const game = boot();
  const items = game.o.menu.items;
  const devItem = items.filter(function (it) { return it[0] === 'Dev Mode'; })[0];
  assert(devItem, 'no dev item');
  devItem[1]();
  assert(G.dev.panel && G.dev.on, 'panel closed');
  assert(game.live === true, 'game not live');
  const rowStep = function (code) {
    const beforeI = G.dev.i;
    game.input.press(code);
    game.advance(1 / 120);
    game.input.release(code);
    game.advance(1 / 120);
    const n = G.dev.keys.length;
    const moved = (beforeI - G.dev.i + n) % n;
    assert(moved === 1, code + ' rows ' + beforeI + ' -> ' + G.dev.i);
  };
  rowStep('ArrowUp');
  rowStep('Pad12');
  game.input.press('ArrowDown');
  game.advance(1 / 120);
  game.input.release('ArrowDown');
  game.advance(1 / 120);
  game.input.press('ArrowDown');
  game.advance(1 / 120);
  game.input.release('ArrowDown');
  game.advance(1 / 120);
  assert(G.dev.i === 0, 'slider not home ' + G.dev.i);
  const before = G.dev.v.k;
  game.input.press('ArrowRight');
  game.advance(1 / 120);
  assert(G.dev.v.k !== before, 'slider stayed ' + G.dev.v.k);
  game.input.release('ArrowRight');
  game.advance(1 / 120);
  G.dev.toolAct(11);
  assert(G.dev.poseMode, 'pose viewer closed');
  assert(G.dev.clipNames().length > 5, 'clips ' + G.dev.clipNames().length);
  game.input.press('ArrowDown');
  game.advance(1 / 120);
  assert(G.dev.poseI === 1, 'clip index ' + G.dev.poseI);
  game.input.release('ArrowDown');
  game.advance(1 / 120);
  game.input.press('ArrowRight');
  game.advance(1 / 120);
  assert(G.dev.poseT > 0, 'did not scrub ' + G.dev.poseT);
  game.input.release('ArrowRight');
  game.advance(1 / 120);
  game.input.tap('confirm');
  game.advance(1 / 120);
  assert(G.dev.printed && G.dev.printed.indexOf("clip: '") >= 0, 'pose row ' + G.dev.printed);
  G.dev.poseMode = false;
  game.input.press('KeyR');
  game.advance(1 / 120);
  assert(G.dev.v.k === 1, 'reset k ' + G.dev.v.k);
  assert(game.timeScale === 1, 'timeScale ' + game.timeScale);
  const tapCode = function (code) {
    game.input.press(code);
    game.advance(1 / 120);
    game.input.release(code);
    game.advance(1 / 120);
  };
  const mores = function (n) { for (let i = 0; i < n; i++) tapCode('KeyM'); };
  const sliderTo = function (key) {
    const want = G.dev.keys.indexOf(key);
    assert(want >= 0, 'no slider ' + key);
    const n = (want - G.dev.i + G.dev.keys.length) % G.dev.keys.length;
    for (let i = 0; i < n; i++) tapCode('ArrowDown');
    assert(G.dev.keys[G.dev.i] === key, 'slider ' + G.dev.keys[G.dev.i]);
  };
  mores(G.dev.tools.length - 1);
  assert(G.dev.tools[G.dev.tool] === 'Jump', 'tool ' + G.dev.tools[G.dev.tool]);
  tapCode('Enter');
  assert(G.dev.jumpMode, 'keyboard did not open jump');
  tapCode('ArrowRight');
  tapCode('ArrowRight');
  tapCode('ArrowDown');
  tapCode('ArrowDown');
  tapCode('ArrowRight');
  tapCode('ArrowDown');
  tapCode('ArrowRight');
  tapCode('Enter');
  let s = snap(game);
  assert(s.scene === 'play' && s.activity === 'stork' && s.tier === 2 && s.day === 3, s.scene + ' ' + s.activity + ' t' + s.tier + ' d' + s.day);
  const botAt = G.dev.tools.indexOf('Bot: good');
  mores((botAt - G.dev.tool + G.dev.tools.length) % G.dev.tools.length);
  assert(G.dev.tools[G.dev.tool] === 'Bot: good', 'bot tool ' + G.dev.tools[G.dev.tool]);
  game.input.press('Pad0');
  game.advance(1 / 120);
  game.input.release('Pad0');
  game.advance(0.6);
  assert(G.dev.bot === 'good', 'bot flag ' + G.dev.bot);
  assert(G.session && G.skillName(G.session.seats[0]) === 'good', 'bot not read');
  assert(G.session.seats[0].bal && G.session.seats[0].bal.skill === 'good', 'balance stayed human');
  const offAt = G.dev.tools.indexOf('Bot: off');
  mores((offAt - G.dev.tool + G.dev.tools.length) % G.dev.tools.length);
  tapCode('Enter');
  assert(G.dev.bot == null, 'bot stayed ' + G.dev.bot);
  const jumpAt = G.dev.tools.indexOf('Jump');
  mores((jumpAt - G.dev.tool + G.dev.tools.length) % G.dev.tools.length);
  tapCode('Enter');
  assert(G.dev.jumpMode, 'second jump closed');
  tapCode('ArrowDown');
  tapCode('ArrowDown');
  for (let i = 0; i < 10; i++) tapCode('ArrowRight');
  assert(G.dev.jumpActs[G.dev.jumpActI] === 'tray', 'act ' + G.dev.jumpActs[G.dev.jumpActI]);
  tapCode('Enter');
  sliderTo('trayFric');
  const fr0 = G.dev.v.trayFric;
  tapCode('ArrowRight');
  assert(G.dev.v.trayFric > fr0, 'tray slider ' + G.dev.v.trayFric);
  game.advance(0.6);
  const olives = G.session && G.session.fam && G.session.fam.world && G.session.fam.world.bodies
    ? G.session.fam.world.bodies.filter(function (b) { return b && b._olive; }) : [];
  assert(olives.length > 0, 'no olives');
  assert(olives[0].friction > 0.12, 'tray friction ' + olives[0].friction);
  mores((G.dev.tools.indexOf('Jump') - G.dev.tool + G.dev.tools.length) % G.dev.tools.length);
  tapCode('Enter');
  tapCode('ArrowDown');
  tapCode('ArrowDown');
  tapCode('ArrowRight');
  assert(G.dev.jumpActs[G.dev.jumpActI] === 'laundry', 'act ' + G.dev.jumpActs[G.dev.jumpActI]);
  tapCode('Enter');
  sliderTo('ropeS');
  const rs0 = G.dev.v.ropeS;
  tapCode('ArrowRight');
  assert(G.dev.v.ropeS > rs0, 'rope slider ' + G.dev.v.ropeS);
  game.advance(0.6);
  const rope = G.session && G.session.seats[0].bal;
  assert(rope && rope.set.s > G.session.fam.rope.s, 'rope s ' + (rope && rope.set.s) + ' base ' + (G.session.fam && G.session.fam.rope && G.session.fam.rope.s));
  G.dev.close();
  assert(!G.dev.on && !G.dev.panel, 'panel left on');
  assert(game.timeScale === 1, 'timeScale left ' + game.timeScale);
});

add('rules', 'local class', () => {
  const game = boot();
  game.go('class', {}, { fade: 0 });
  game.advance(1 / 120);
  assert(G.scenes.class._pills, 'class did not open ' + JSON.stringify(game.errors));
  const labels = (G.scenes.class._pills.items || []).map(function (it) { return it.label; });
  for (const name of ['Stork Stand', 'Quiet Candle', 'Squat Rail', 'Step Class', 'Hoop Hips', 'Surprise me']) {
    assert(labels.indexOf(name) >= 0, 'missing ' + name + ' in ' + labels.join(','));
  }
  while (game.players.length > 1) game.removePlayer(game.players[game.players.length - 1]);
  for (let i = 0; i < 5; i++) {
    game.input.press('ArrowDown');
    game.advance(1 / 120);
  }
  game.input.tap('confirm');
  game.advance(1 / 120);
  let guard = 0;
  while (guard++ < 30000 && !G.podium) {
    const s = snap(game);
    if (s.phase === 'play' || s.phase === 'auto') {
      const dt = Math.max(1 / 120, Math.min(1, s.left > 0 ? s.left : 1 / 120));
      game.advance(dt);
    } else {
      game.input.tap('confirm');
      game.advance(1 / 120);
    }
    if (game.errors.length) throw new Error(game.errors.join(' | '));
  }
  assert(G.podium && G.podium.length >= 2, 'no podium');
  G.podium.forEach(function (q) {
    assert(q.score >= 0 && q.score <= 1000, 'score ' + q.score);
  });
  const regular = G.podium.filter(function (q) { return q.name === 'Regular'; })[0];
  assert(regular && regular.score === 0, 'empty mat scored ' + JSON.stringify(G.podium));
  game.input.release('Act:confirm');
  game.advance(1 / 120);
  game.input.tap('confirm');
  game.advance(1 / 120);
  game.advance(1 / 120);
  assert(snap(game).scene === 'title', 'left class to ' + snap(game).scene + ' err=' + JSON.stringify(game.errors));
});

add('rules', 'class seats', () => {
  const game = boot();
  game.go('class', {}, { fade: 0 });
  game.advance(1 / 120);
  assert(game.players.length >= 2, 'players ' + game.players.length);
  /* Two players: P1 is the left half, so down is KeyS. A fresh press each time, or repeat() waits. */
  game.input.press('KeyS');
  game.advance(1 / 120);
  game.input.release('KeyS');
  game.advance(1 / 120);
  assert(G.scenes.class._pills && G.scenes.class._pills.i === 1, 'pill ' + (G.scenes.class._pills && G.scenes.class._pills.i));
  game.input.tap('confirm');
  game.advance(1 / 120);
  let guard = 0;
  while (guard++ < 200 && (!G.session || G.session.phase !== 'play')) game.advance(1 / 120);
  assert(G.session && G.session.act.id === 'candle', 'activity ' + (G.session && G.session.act.id));
  assert(G.session && G.session.phase === 'play', 'phase ' + (G.session && G.session.phase));
  const seats = G.session.seats;
  assert(seats.length >= 2 && seats[0].human && seats[1].human, 'seats ' + seats.map(function (q) { return q.name + ':' + q.human; }).join(','));
  assert(!seats[0].skill && !seats[1].skill, 'skills ' + seats[0].skill + ' ' + seats[1].skill);
  game.players[1].press('ArrowRight');
  game.advance(1.2);
  assert(Math.abs(seats[1].bal.px) > Math.abs(seats[0].bal.px) + 0.05, 'px ' + seats[0].bal.px + ' ' + seats[1].bal.px);
  guard = 0;
  while (guard++ < 8000 && G.session && G.session.phase !== 'results') game.advance(0.25);
  assert(G.session && G.session.phase === 'results', 'no results');
  assert(seats[0].score !== seats[1].score, 'scores ' + seats[0].score + ' ' + seats[1].score + ' pct ' + seats[0].pct + ' ' + seats[1].pct);
  assert(seats[0].score >= 0 && seats[0].score <= 1000 && seats[1].score >= 0 && seats[1].score <= 1000, 'range');
  game.players[1].release('ArrowRight');
});

add('rules', 'fake hub', async () => {
  const quiet = realAIHub.connect();
  const alone = await quiet;
  assert(alone === null, 'inactive connect ' + alone);
  const sent = [];
  const progress = [];
  let result = null;
  let resultN = 0;
  let answered = null;
  let now = -Infinity;
  const handlers = {};
  ctx.AIHub = {
    active: true,
    connect() {
      return Promise.resolve({ players: [{ name: 'Red Fox', color: '#ff4a4a' }] });
    },
    ready() { ctx.AIHub._ready = true; },
    time() { return now; },
    answer(k) { answered = k; },
    send(m) { sent.push(m); },
    progress(p) { progress.push(p); },
    result(r) { resultN++; result = r; },
    rng() { return E.rng(3); },
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  };
  try {
    const game = boot();
    await new Promise(function (r) { setImmediate(r); });
    assert(G.inSession, 'not in session');
    assert(ctx.AIHub._ready, 'ready was not called');
    assert(snap(game).scene === 'round', snap(game).scene);
    assert(game.o.menu.items.length === 0, 'dev menu in session');
    game.input.tap('confirm');
    game.advance(1 / 120);
    assert(answered === 'ready', 'answer ' + answered);
    now = 0;
    game.advance(2);
    assert(G.morningEvents && G.morningEvents.length === 3, 'deal ' + G.morningEvents);
    const pools = [['stork', 'candle', 'squat', 'push'], ['step', 'hoop'], ['slalom', 'jog']];
    G.morningEvents.forEach(function (id, i) {
      assert(pools[i].indexOf(id) >= 0, 'event ' + id);
    });
    assert(sent.length > 0, 'no ghosts');
    assert(progress.length > 0, 'no progress');
    game.advance(8);
    const live = G.session;
    assert(live && live.seats[0] && !live.seats[0].skill, 'hub skill ' + (live && live.seats[0] && live.seats[0].skill));
    assert(G.driver == null, 'hub driver ' + G.driver);
    const humanPct = live.pct;
    const lean = { ux: G.lean.ux, uy: G.lean.uy, breath: G.lean.breath };
    const ref = new G.Session({ id: live.act.id, tier: 1, limit: 40, skipToPlay: true, trial: true, driver: 'good', seed: live.seed });
    const nStep = Math.max(1, Math.round((live.playTime + 0.45) * 120));
    for (let i = 0; i < nStep; i++) ref.update(1 / 120);
    G.lean.ux = lean.ux; G.lean.uy = lean.uy; G.lean.breath = lean.breath;
    assert(Math.abs(humanPct - ref.pct) > 0.02, 'still posted the good bot ' + humanPct + ' vs ' + ref.pct + ' on ' + live.act.id);
    const before = live.seats[0].bal ? live.seats[0].bal.px : 0;
    game.input.press('KeyD');
    game.advance(0.5);
    const after = live.seats[0].bal ? live.seats[0].bal.px : 0;
    assert(Math.abs(after - before) > 0.02, 'held lean px ' + before + ' -> ' + after + ' on ' + live.act.id);
    game.input.release('KeyD');
    (handlers['time-up'] || []).forEach(function (fn) { fn(); });
    assert(resultN === 1 && result && typeof result.score === 'number', 'result ' + resultN);
    (handlers['time-up'] || []).forEach(function (fn) { fn(); });
    assert(resultN === 1, 'result twice');
    game.input.press('KeyA');
    (handlers['end'] || []).forEach(function (fn) { fn(); });
    assert(G.hubOver, 'not over');
    assert(game.input.held.size === 0, 'input still held');
    const n = sent.length;
    game.advance(1);
    assert(sent.length === n, 'sent after end');
  } finally {
    ctx.AIHub = realAIHub;
  }
});

add('rules', 'hub ghosts', async () => {
  const handlers = {};
  ctx.AIHub = {
    active: true,
    connect() { return Promise.resolve({ players: [{ name: 'Red Fox', color: '#ff4a4a' }] }); },
    ready() { ctx.AIHub._ready = true; },
    time() { return 0; },
    answer() {},
    send() {},
    progress() {},
    result() {},
    rng() { return E.rng(3); },
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); }
  };
  try {
    const game = boot({ draw: true });
    await new Promise(function (r) { setImmediate(r); });
    game.advance(0.5);
    assert(scenesEi(game) === 0, 'event ' + scenesEi(game));
    (handlers.message || []).forEach(function (fn) {
      fn({ t: 'g', a: 0, l: [0.42, -0.25], w: [0.1, 0.05], s: 10 }, 'seat-2');
      fn({ t: 'g', a: 1, l: [0.9, 0.9], w: [0.2, 0.2], s: 1 }, 'seat-3');
    });
    const seen = [];
    const orig = game.r.actor;
    game.r.actor = function (x, y, z, fn, o) {
      seen.push(o || {});
      return orig.apply(this, arguments);
    };
    game.advance(1 / 120);
    game.r.actor = orig;
    const faded = seen.filter(function (o) { return o && o.alpha === 0.5; });
    assert(faded.length >= 1, 'ghost alpha calls ' + seen.length);
    const mine = G.ghosts.filter(function (q) { return q.from === 'seat-2'; })[0];
    const other = G.ghosts.filter(function (q) { return q.from === 'seat-3'; })[0];
    assert(mine && mine.rig, 'matching ghost was not drawn');
    assert(Math.abs(mine.rig.wob[1] - 0.52) < 1e-6 && Math.abs(mine.rig.wob[0] - -0.2) < 1e-6, 'wob ' + mine.rig.wob);
    assert(other && !other.rig, 'wrong event drew a rig');
    assert(!game.errors.length, 'draw errors');
  } finally {
    ctx.AIHub = realAIHub;
  }
});

function scenesEi() { return G.scenes && G.scenes.round ? G.scenes.round.ei : null; }

add('rules', 'data lint', () => {
  assert(G.LINES.count() >= 150, 'lines ' + G.LINES.count());
  const clips = ctx.MOCAP.FITCLIPS.clips;
  for (const k in G.POSES) {
    const name = G.POSES[k].clip;
    assert(clips[name], 'pose ' + k + ' missing clip ' + name);
  }
  const bad = [];
  const re = /\bTODO\b|placeholder|\bstub\b/i;
  for (const f of fs.readdirSync(path.join(dev, 'game'), { recursive: true })) {
    if (!String(f).endsWith('.js')) continue;
    const text = fs.readFileSync(path.join(dev, 'game', f), 'utf8');
    if (re.test(text)) bad.push(String(f));
  }
  assert(!bad.length, 'lint ' + bad.join(','));
});

add('rules', 'draw scenes', () => {
  const names = Object.keys(G.scenes);
  const bad = [];
  for (const name of names) {
    const game = boot({ draw: true });
    try {
      if (name === 'play') game.go('play', { id: 'stork', tier: 1, trial: true, skipToPlay: true, driver: 'good' }, { fade: 0 });
      else if (name === 'attract') G.startAttract();
      else game.go(name, {}, { fade: 0 });
      game.advance(0.15);
      if (game.errors.length) bad.push(name + ': ' + game.errors.join(';'));
    } catch (e) {
      bad.push(name + ': ' + e.message);
    }
  }
  assert(!bad.length, bad.join('\n'));
});

function buildHtml() {
  const r = spawnSync(process.execPath, ['build.mjs'], { cwd: dev, encoding: 'utf8' });
  if (r.status) throw new Error(r.stdout + '\n' + r.stderr);
  return HTML;
}

function startServer(dir) {
  return new Promise(function (resolve, reject) {
    const child = spawn('python3', ['-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    let settled = false;
    const take = function (chunk) {
      buf += chunk.toString();
      const m = buf.match(/port (\d+)/i);
      if (m && !settled) { settled = true; resolve({ child: child, port: +m[1] }); }
    };
    child.stdout.on('data', take);
    child.stderr.on('data', take);
    child.on('exit', function (code) {
      if (!settled) reject(new Error('http server exited ' + code + ' ' + buf));
    });
  });
}

async function launchOnce(n, html) {
  const { chromium } = await import('playwright');
  const errors = [];
  const net = [];
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const log = { n: n };
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript(function () {
      const pad = {
        id: 'DualSense', index: 0, connected: true, mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, function () { return { pressed: false, value: 0 }; }),
        timestamp: 0
      };
      navigator.getGamepads = function () { return [pad]; };
      window.__pad = pad;
    });
    page.on('pageerror', function (e) { errors.push(String(e && e.stack || e)); });
    page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', function (req) {
      const u = req.url();
      if (/^https?:/i.test(u)) net.push(u.split('?')[0]);
    });
    await page.goto(html);
    await page.waitForFunction(function () {
      const g = window.My3D2dge && My3D2dge.current;
      if (!g || g.sceneName !== 'title') return false;
      const el = document.getElementById('e3-boot');
      if (!el) return true;
      const st = getComputedStyle(el);
      return el.hidden || st.display === 'none';
    }, { timeout: 15000 });
    const before = await page.evaluate(function () {
      const g = My3D2dge.current;
      const c = document.getElementById('screen');
      const ctx = g.screen.buf.getContext('2d');
      const W = g.screen.W, H = g.screen.H;
      const d = ctx.getImageData(0, 0, W, H).data;
      let diff = 0;
      const bg = d[0] | (d[1] << 8) | (d[2] << 16);
      for (let i = 0; i < d.length; i += 16) {
        const k = d[i] | (d[i + 1] << 8) | (d[i + 2] << 16);
        if (k !== bg) diff++;
      }
      const shot = g.debug && g.debug.snapshot ? g.debug.snapshot() : {};
      return {
        scene: g.sceneName, title: shot.title, cw: c.width, ch: c.height, W: W, H: H, diff: diff,
        music: g.settings && g.settings.music, glyphs: g.settings && g.settings.glyphs,
        errors: (g.errors || []).slice()
      };
    });
    log.before = before;
    if (n === 1) {
      await page.screenshot({ path: path.join(SCRATCH, 'title-1920x1080.png') });
      const heard = await page.evaluate(async function () {
        const g = My3D2dge.current;
        const a = g.audio;
        if (a.ctx && a.ctx.state === 'suspended') await a.ctx.resume();
        if (window.G && G.playSong) G.playSong('studio');
        const bus = a._musBus;
        const an = a.ctx.createAnalyser();
        an.fftSize = 2048;
        bus.connect(an);
        await new Promise(function (r) { setTimeout(r, 450); });
        const data = new Uint8Array(an.fftSize);
        an.getByteTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
        const off = new OfflineAudioContext(1, 8000, 44100);
        G.babble('Tare', 'e', off);
        const buf = await off.startRendering();
        const ch = buf.getChannelData(0);
        let voice = 0;
        for (let i = 0; i < ch.length; i++) voice = Math.max(voice, Math.abs(ch[i]));
        return { musicVol: a.musicVolume, bus: bus.gain.value, peak: peak, voice: voice, state: a.ctx.state };
      });
      log.heard = heard;
      await page.evaluate(function () {
        const g = My3D2dge.current;
        g.go('play', { id: 'stork', tier: 1, trial: true });
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCRATCH, 'card-1920x1080.png') });
      await page.evaluate(function () {
        const g = My3D2dge.current;
        g.go('play', { id: 'stork', tier: 1, trial: true, skipToPlay: true, driver: 'good' });
      });
      await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(SCRATCH, 'plate-1920x1080.png') });
      await page.evaluate(function () {
        if (window.G && G.finishNow) G.finishNow(2);
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(SCRATCH, 'results-1920x1080.png') });
      await page.evaluate(function () {
        const g = My3D2dge.current;
        if (window.G) { G.profile.day = 1; G.profile.flags.arrival = true; }
        g.go('island');
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(SCRATCH, 'island-1920x1080.png') });
      await page.evaluate(function () { My3D2dge.current.go('title'); });
      await page.waitForFunction(function () { return My3D2dge.current.sceneName === 'title'; });
    }
    const padOk = await page.evaluate(function () {
      const p = navigator.getGamepads()[0];
      return !!(p && p.connected && p.mapping === 'standard');
    });
    log.pad = padOk;
    await page.keyboard.press('Enter');
    await page.waitForFunction(function () { return My3D2dge.current.sceneName !== 'title'; }, { timeout: 4000 });
    log.after = await page.evaluate(function () {
      const g = My3D2dge.current;
      return { scene: g.sceneName, errors: (g.errors || []).slice() };
    });
    log.pageErrors = errors.slice();
    log.net = net.slice();
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(SCRATCH, 'launch-' + n + '.log'), JSON.stringify(log, null, 2));
  return log;
}

add('browser', 'engine check and file launch', async () => {
  const html = buildHtml();
  const out = path.join(SCRATCH, 'check-output');
  const r = spawnSync(process.execPath, ['engine/tools/check.mjs', html, '--size', '1280x720', '--out', out, '--seconds', '2'], {
    cwd: dev, encoding: 'utf8', env: process.env
  });
  fs.writeFileSync(path.join(SCRATCH, 'check-mjs.log'), (r.stdout || '') + '\n' + (r.stderr || ''));
  assert(r.status === 0, 'check.mjs failed\n' + (r.stdout || '').slice(-1500) + '\n' + (r.stderr || '').slice(-800));
  const a = await launchOnce(1, 'file://' + html);
  const b = await launchOnce(2, 'file://' + html);
  function problems(log) {
    const p = [];
    if (log.pageErrors.length) p.push('page ' + log.pageErrors.join(' | '));
    if (log.net.length) p.push('net ' + log.net.join(' '));
    if (!(log.before && log.before.scene === 'title' && log.before.title === 'Spine Wee')) p.push('title ' + JSON.stringify(log.before));
    if (log.before.cw === 300 && log.before.ch === 150) p.push('default canvas');
    if (log.before.diff < 30) p.push('unpainted ' + log.before.diff);
    if (log.before.music !== 0.1) p.push('music ' + log.before.music);
    if (log.before.glyphs !== 'playstation') p.push('glyphs ' + log.before.glyphs);
    if (!log.pad) p.push('no pad stub');
    if (!log.after || log.after.scene === 'title') p.push('enter stayed on title');
    if (log.after && log.after.errors && log.after.errors.length) p.push('game ' + log.after.errors.join(' | '));
    return p;
  }
  const pa = problems(a), pb = problems(b);
  assert(!pa.length, 'launch 1 ' + pa.join('; '));
  assert(!pb.length, 'launch 2 ' + pb.join('; '));
  assert(a.after.scene === b.after.scene, 'launches disagree ' + a.after.scene + ' vs ' + b.after.scene);
  assert(a.before.W === b.before.W && a.before.H === b.before.H, 'size disagree');
  if (a.heard) {
    assert(a.heard.musicVol === 0.1, 'bus music ' + a.heard.musicVol);
    assert(a.heard.bus > 0.05 && a.heard.bus < 0.2, 'mus bus ' + a.heard.bus);
    assert(a.heard.peak > 0, 'music silent');
    assert(a.heard.voice > 0.01, 'voice silent ' + a.heard.voice);
  }
});

add('browser', 'touch notice', async () => {
  const { chromium, devices } = await import('playwright');
  const html = fs.existsSync(HTML) ? HTML : buildHtml();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  try {
    const device = devices['iPhone 13'] || devices['iPhone 12'];
    const context = await browser.newContext(Object.assign({}, device));
    const page = await context.newPage();
    await page.addInitScript(function () {
      const orig = window.matchMedia;
      window.matchMedia = function (q) {
        const s = String(q);
        if (s.indexOf('pointer') >= 0 && s.indexOf('coarse') >= 0 && s.indexOf('any-pointer') < 0) return { matches: true, media: s, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
        if (s.indexOf('any-pointer') >= 0 && s.indexOf('fine') >= 0) return { matches: false, media: s, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
        return orig.call(window, q);
      };
    });
    const errors = [];
    page.on('pageerror', function (e) { errors.push(String(e)); });
    await page.goto('file://' + html);
    await page.waitForFunction(function () {
      return document.body && document.body.innerText.indexOf('Controller or keyboard required') >= 0;
    }, { timeout: 10000 });
    const settings = await page.locator('button', { hasText: 'Settings' }).count();
    assert(settings >= 1, 'no settings button');
    await page.waitForFunction(function () {
      const g = window.My3D2dge && My3D2dge.current;
      return g && g.sceneName === 'attract';
    }, { timeout: 20000 });
    assert(!errors.length, errors.join(' | '));
  } finally {
    await browser.close();
  }
});

add('hub', 'five harness cases and standalone title', async () => {
  buildHtml();
  const srv = await startServer(path.join(dev, 'tests/hub'));
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const cases = [
    'players=1&auto=1',
    'players=2&auto=1',
    'players=3&latency=150&jitter=50&loss=5&auto=1',
    'players=4&latency=150&jitter=50&loss=5&auto=1',
    'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'
  ];
  try {
    for (const q of cases) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', function (e) { errors.push(String(e)); });
      const url = 'http://127.0.0.1:' + srv.port + '/harness.html?game=game.html&' + q;
      await page.goto(url);
      await page.waitForFunction(function () { return document.body.dataset.complete === 'true'; }, { timeout: 90000 });
      const report = await page.evaluate(function () { return window.__hubCheck; });
      await page.close();
      if (!report || !report.pass) {
        const failed = (report && report.checks || []).filter(function (c) { return !c.pass; }).map(function (c) { return c.name + ' ' + (c.detail || ''); });
        throw new Error(q + '\n' + failed.join('\n') + (errors.length ? '\n' + errors.join(' | ') : ''));
      }
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', function (e) { errors.push(String(e)); });
    page.on('console', function (m) { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://127.0.0.1:' + srv.port + '/game.html');
    await page.waitForFunction(function () {
      return window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title';
    }, { timeout: 15000 });
    const scene = await page.evaluate(function () { return My3D2dge.current.sceneName; });
    assert(scene === 'title', scene);
    assert(!errors.length, errors.join(' | '));
    await page.close();
  } finally {
    await browser.close();
    srv.child.kill('SIGTERM');
  }
});

const which = process.argv[2] || 'all';
const filter = which === 'all' ? '' : (process.argv[3] || '');
const prog = path.join(SCRATCH, 'suite-progress.txt');
fs.mkdirSync(SCRATCH, { recursive: true });
fs.appendFileSync(prog, '\nRUN ' + which + ' ' + filter + ' ' + new Date().toISOString() + '\n');

const fails = [];
let passed = 0;
for (const t of tests) {
  if (which !== 'all' && t.group !== which) continue;
  if (filter && t.name.indexOf(filter) < 0 && t.group.indexOf(filter) < 0) continue;
  fs.appendFileSync(prog, 'START ' + t.group + ' ' + t.name + '\n');
  try {
    await t.fn();
    passed++;
    fs.appendFileSync(prog, 'OK ' + t.name + '\n');
  } catch (e) {
    fails.push({ name: t.group + ' ' + t.name, err: e && e.stack ? e.stack : String(e) });
    fs.appendFileSync(prog, 'FAIL ' + t.name + '\n' + (e && e.stack ? e.stack : e) + '\n');
  }
}
for (const f of fails) console.log('FAIL ' + f.name + '\n' + f.err + '\n');
console.log(passed + ' passed, ' + fails.length + ' failed');
process.exit(fails.length ? 1 : 0);
