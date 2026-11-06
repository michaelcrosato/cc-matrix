import { createGame } from '../src/game/director.js';
import { memoryStorage } from '../src/core/save.js';
import { resetRng, setSessionMode } from '../src/core/rng.js';
import { resetTuning, getTune } from '../src/core/tuning.js';
import { detuneCents } from '../src/physics/island.js';
import { eventIds } from '../src/events/index.js';
import { fresh, tap, until, assert, pressChoice, capOf } from './lib.mjs';

async function bootStory(game) {
  assert(game.state().screen === 'title', game.state().screen);
  tap(game);
  await until(game, (s) => s.screen === 'who', 2, 'who');
  tap(game);
  await until(game, (s) => s.screen === 'tutorial', 2, 'tutorial');
  tap(game);
  await until(game, (s) => s.screen === 'morning', 3, 'morning');
}

async function checkIn(game) {
  await until(game, (s) => s.screen === 'morning', 3, 'morning');
  tap(game);
  await until(game, (s) => s.screen === 'question', 3, 'question');
  tap(game);
  await until(game, (s) => s.screen === 'reply', 3, 'reply');
  tap(game);
  await until(game, (s) => s.screen === 'age', 90, 'check-in');
  const age = game.state().wobbleAge;
  assert(age >= 18 && age <= 99, `age ${age}`);
  tap(game);
  await until(game, (s) => s.screen === 'plan', 3, 'plan');
}

async function playOne(game) {
  const state = game.state();
  const id = state.choices[state.focus];
  assert(eventIds().includes(id), `plan focus ${id}`);
  tap(game);
  await until(game, (s) => s.screen === 'intro', 2, `${id} intro`);
  assert(game.state().lines.some((line) => line.length > 0), `${id} intro empty`);
  tap(game);
  await until(game, (s) => s.screen === 'play', 5, `${id} countdown`);
  await until(game, (s) => s.screen === 'results', capOf(id), id);
  const form = game.state().last && game.state().last.form;
  assert(Number.isFinite(form), `${id} form`);
  tap(game);
  await until(game, (s) => s.screen === 'jar' || s.screen === 'ending', 3, `${id} jar`);
  if (game.state().screen === 'jar') {
    tap(game);
    await until(game, (s) => s.screen !== 'jar', 4, `${id} after jar`);
  }
}

async function playDay(game) {
  await checkIn(game);
  let guard = 0;
  while (game.state().screen === 'plan' && guard < 6) {
    await playOne(game);
    guard += 1;
  }
  if (game.state().screen === 'bed') {
    tap(game);
    await until(game, (s) => s.screen === 'morning', 3, 'next morning');
  }
}

export async function flowTests() {
  const tests = [];

  tests.push(['scripted week through the menus', async () => {
    resetRng(1);
    resetTuning();
    const game = await fresh();
    game.bot('sharp');
    await bootStory(game);
    const marblesBefore = game.state().marbles;
    for (let day = 0; day < 6 && game.state().screen !== 'ending'; day++) {
      await playDay(game);
    }
    await until(game, (s) => s.screen === 'ending', 4, 'ending');
    const mid = game.state();
    assert(mid.levelled, 'island not levelled');
    assert(mid.tilt === 0, `tilt ${mid.tilt}`);
    assert(detuneCents(mid.tilt, 1) === 0, 'detune');
    assert(mid.profile.ages.length >= 5, `ages ${mid.profile.ages.join(',')}`);
    for (const age of mid.profile.ages) assert(age >= 18 && age <= 99, `age ${age}`);
    assert(mid.profile.ages[4] < mid.profile.ages[0], `ages did not fall ${mid.profile.ages.join(',')}`);
    assert(mid.marbles > marblesBefore, `marbles ${mid.marbles}`);
    assert(mid.profile.stamps.length >= 4, 'stamps');
    tap(game);
    await until(game, (s) => s.screen === 'credits', 3, 'credits');
    tap(game);
    await until(game, (s) => s.screen === 'menu', 3, 'menu');
    assert(game.state().choices.length === 6, `menu choices ${game.state().choices.length}`);
    assert(game.state().day === 6, `day ${game.state().day}`);
    tap(game);
    await checkIn(game);
    const plan = game.state().choices.filter((id) => eventIds().includes(id));
    assert(plan.length === 3, `maintenance ${plan.join(',')}`);
    tap(game, 'Escape');
    await until(game, (s) => s.screen === 'menu', 2, 'back to menu');
    pressChoice(game, 'free');
    const seen = new Set();
    for (let page = 0; page < 6; page++) {
      const state = game.state();
      for (const id of state.choices) if (eventIds().includes(id)) seen.add(id);
      if (!state.choices.includes('page')) break;
      const at = state.choices.indexOf('page');
      game.activate(at);
      tap(game, 'ArrowRight');
    }
    assert(seen.size === eventIds().length, `free play ${[...seen].join(',')} of ${eventIds().length}`);
  }]);

  tests.push(['a save resumes on the next morning', async () => {
    resetRng(2);
    resetTuning();
    const storage = memoryStorage();
    const game = await createGame({ manual: true, storage });
    game.bot('sharp');
    await bootStory(game);
    await playDay(game);
    assert(game.state().day === 2, `day ${game.state().day}`);
    assert(game.state().profile.stamps.length === 1, 'stamp');
    const again = await createGame({ manual: true, storage });
    assert(again.state().screen === 'title', again.state().screen);
    assert(again.state().day === 2, `resumed day ${again.state().day}`);
    tap(again);
    await until(again, (s) => s.screen === 'menu', 2, 'resume menu');
    tap(again);
    await until(again, (s) => s.screen === 'morning', 3, 'resume morning');
    assert(again.state().heading.length > 0, 'morning heading');
  }]);

  tests.push(['ten seconds on the title starts attract and swallows the key', async () => {
    const game = await fresh();
    game.advance(10);
    const started = game.state();
    assert(started.screen === 'attract', started.screen);
    game.advance(80);
    assert(game.state().attractSeen.length >= 4, game.state().attractSeen.join(','));
    game.key('Enter', true);
    game.advance(1 / 120);
    assert(game.state().screen === 'title', `woke onto ${game.state().screen}`);
    game.advance(0.2);
    assert(game.state().screen === 'title', 'the swallowed key was used');
    game.key('Enter', false);
  }]);

  tests.push(['attract also starts on the real clock', async () => {
    resetTuning();
    const game = await createGame({ manual: false, storage: memoryStorage() });
    await new Promise((resolve) => setTimeout(resolve, 11000));
    const state = game.state();
    game.loop.stop();
    assert(state.attract || state.screen === 'attract', `clock screen ${state.screen}`);
  }]);

  tests.push(['dev mode opens only from pause and sliders reset', async () => {
    const game = await fresh();
    assert(game.goto('dev') === false, 'dev from title');
    assert(game.state().screen === 'title', game.state().screen);
    game.bot('sharp');
    game.goto('play', { id: 'poses' });
    assert(game.tuning.get('maxLean') === 18, 'default lean');
    game.tuning.set('maxLean', 10);
    assert(game.tuning.get('maxLean') === 10, 'live slider');
    game.advance(0.5);
    assert(game.state().screen === 'play', 'event kept running');
    assert(game.tuning.get('maxLean') === 10, 'slider stuck');
    game.goto('pause');
    assert(game.goto('dev') === true, 'dev from pause');
    assert(game.state().choices.length === 6, `dev choices ${game.state().choices.length}`);
    pressChoice(game, 'reset-tune');
    assert(getTune('maxLean') === 18, `reset ${getTune('maxLean')}`);
    for (let i = 0; i < 5; i++) pressChoice(game, 'next');
    pressChoice(game, 'gust');
    game.goto('play');
    game.advance(0.5);
    assert(game.state().errors.length === 0, 'gust error');
  }]);

  tests.push(['touch-only offers settings and no play', async () => {
    const game = await fresh({ coarse: true });
    assert(game.state().screen === 'touch', game.state().screen);
    assert(game.state().lines.some((line) => line.includes('Controller or keyboard required')), game.state().lines.join('|'));
    assert(game.state().choices.length === 1 && game.state().choices[0] === 'settings', game.state().choices.join(','));
    tap(game);
    await until(game, (s) => s.screen === 'settings', 2, 'touch settings');
    assert(!game.state().choices.includes('poses'), 'touch started a class');
  }]);

  tests.push(['pause lists six choices', async () => {
    const game = await fresh();
    game.goto('play', { id: 'stillWater' });
    tap(game, 'Escape');
    await until(game, (s) => s.screen === 'pause', 2, 'pause');
    assert(game.state().choices.length === 6, game.state().choices.join(','));
  }]);

  tests.push(['a hub slot keeps one score through the end of the minute', async () => {
    const previous = globalThis.AIHub;
    let ms = 0;
    const stepMs = 1000 / 120;
    const scores = [];
    globalThis.AIHub = {
      me: 0,
      players: [],
      time: () => {
        const now = ms;
        ms += stepMs;
        return now;
      },
      rng: (label) => {
        let n = 0;
        return () => (label === 'deal' && n++ === 0 ? 0.99 : 0.5);
      },
      on: () => {},
      ready: () => {},
      answer: () => {},
      send: () => {},
      progress: (body) => { scores.push(body.score); },
      result: () => {},
    };
    try {
      const game = await fresh();
      game.runSession({ room: 'test' });
      game.advance(45);
      const mid = game.state();
      assert(mid.sessionRound && mid.sessionRound.id === 'springboard', `slot ${mid.sessionRound && mid.sessionRound.id}`);
      assert(mid.sessionRound.slot === 0, `slot index ${mid.sessionRound.slot}`);
      assert(mid.sessionRound.parts.length === 1, `parts at 45s ${mid.sessionRound.parts.join(',')}`);
      assert(mid.screen === 'results', `screen at 45s ${mid.screen}`);
      assert(mid.event === null, 'the finished class was started again');
      const held = mid.sessionRound.total;
      game.advance(16.9);
      const end = game.state();
      assert(end.sessionRound.slot === 0, `left slot 0 at ${end.sessionRound.slot}`);
      assert(end.sessionRound.parts.length === 1, `parts at the end ${end.sessionRound.parts.join(',')}`);
      assert(end.sessionRound.total === held, `score changed from ${held} to ${end.sessionRound.total}`);
      assert(end.sessionRound.total <= 1000, `score ${end.sessionRound.total}`);
      assert(end.screen === 'results', `screen at the end ${end.screen}`);
      assert(scores.length > 0 && scores[scores.length - 1] <= 1000, `progress ${scores[scores.length - 1]}`);
      assert(scores.every((score) => score <= 1000), `progress climbed ${scores.join(',')}`);
    } finally {
      globalThis.AIHub = previous;
      setSessionMode(false);
    }
  }]);

  tests.push(['a 6fps hub clock scores one 50s class', async () => {
    const previous = globalThis.AIHub;
    let ms = 0;
    const scores = [];
    globalThis.AIHub = {
      me: 0,
      players: [],
      time: () => ms,
      rng: (label) => {
        let n = 0;
        return () => (label === 'deal' && n++ === 0 ? 0.6 : 0.5);
      },
      on: () => {},
      ready: () => {},
      answer: () => {},
      send: () => {},
      progress: (body) => { scores.push(body.score); },
      result: () => {},
    };
    try {
      const game = await fresh();
      game.runSession({ room: 'test' });
      game.bot('sharp');
      const frame = 1 / 6;
      for (let i = 0; i < 372; i++) {
        ms = i * frame * 1000;
        game.advance(frame);
      }
      const end = game.state();
      assert(end.sessionRound && end.sessionRound.id === 'plates', `class ${end.sessionRound && end.sessionRound.id}`);
      assert(end.sessionRound.slot === 0, `slot ${end.sessionRound.slot}`);
      assert(end.sessionRound.parts.length === 1, `parts ${end.sessionRound.parts.join(',')}`);
      assert(end.sessionRound.total > 0 && end.sessionRound.total <= 1000, `score ${end.sessionRound.total}`);
      assert(end.sessionRound.total === end.sessionRound.parts[0], 'the part is not the total');
      assert(end.screen === 'results', `screen ${end.screen}`);
      assert(end.event === null, 'the class was still live');
      assert(scores.some((score) => score === end.sessionRound.total), 'progress never showed the score');
      assert(scores.every((score) => score <= 1000), 'progress climbed past one class');
    } finally {
      globalThis.AIHub = previous;
      setSessionMode(false);
    }
  }]);

  return tests;
}
