import { writeWish, writeButton } from '../src/input/bot.js';
import { eventIds } from '../src/events/index.js';
import { fresh, tap, until, assert, pressChoice, DT, playBot } from './lib.mjs';

async function leanOf(setup) {
  const game = await fresh();
  game.goto('play', { id: 'poses' });
  setup(game);
  game.advance(1.5);
  return game.state().event.lanes[0].leanX;
}

async function poseScore(setup) {
  const game = await fresh();
  game.goto('play', { id: 'poses' });
  game.advance(0.4);
  setup(game);
  game.advance(DT);
  setup(game, false);
  game.advance(0.3);
  return game.state().event.score;
}

export async function inputTests() {
  const tests = [];

  tests.push(['stick, keys and mouse lean the same way', async () => {
    const pad = await leanOf((game) => writeWish(game.pads[0], 1, 0));
    const keys = await leanOf((game) => game.key('KeyD', true));
    const mouse = await leanOf((game) => {
      game.pointer(960, 540, 0);
      game.pointer(1500, 540, 0);
    });
    assert(pad > 0.05, `pad lean ${pad}`);
    assert(keys > 0.05, `key lean ${keys}`);
    assert(mouse > 0.05, `mouse lean ${mouse}`);
  }]);

  tests.push(['flail from the pad, the key and the mouse costs form', async () => {
    const plain = await poseScore(() => {});
    const key = await poseScore((game, down = true) => game.key('KeyF', down));
    const pad = await poseScore((game, down = true) => writeButton(game.pads[0], 2, down));
    const mouse = await poseScore((game, down = true) => game.pointer(960, 540, down ? 4 : 0));
    assert(key < plain - 1, `key flail ${key} vs ${plain}`);
    assert(pad < plain - 1, `pad flail ${pad} vs ${plain}`);
    assert(mouse < plain - 1, `mouse flail ${mouse} vs ${plain}`);
  }]);

  tests.push(['pad, keyboard and mouse each leave the title', async () => {
    const padGame = await fresh();
    writeButton(padGame.pads[0], 0, true);
    padGame.advance(DT);
    writeButton(padGame.pads[0], 0, false);
    assert(padGame.state().screen === 'who', padGame.state().screen);
    writeButton(padGame.pads[0], 1, true);
    padGame.advance(DT);
    writeButton(padGame.pads[0], 1, false);
    assert(padGame.state().screen === 'title', `pad back ${padGame.state().screen}`);

    const keyGame = await fresh();
    tap(keyGame);
    assert(keyGame.state().screen === 'who', keyGame.state().screen);
    tap(keyGame, 'Escape');
    assert(keyGame.state().screen === 'title', keyGame.state().screen);

    const mouseGame = await fresh();
    mouseGame.pointer(400, 400, 0);
    mouseGame.pointer(400, 400, 1);
    mouseGame.advance(DT);
    mouseGame.pointer(400, 400, 0);
    assert(mouseGame.state().screen === 'who', mouseGame.state().screen);
  }]);

  tests.push(['the d-pad moves the menu focus', async () => {
    const game = await fresh();
    game.goto('menu');
    writeButton(game.pads[0], 13, true);
    game.advance(DT);
    writeButton(game.pads[0], 13, false);
    assert(game.state().focus === 1, `focus ${game.state().focus}`);
  }]);

  tests.push(['Options is ignored while Create is held', async () => {
    const game = await fresh();
    game.goto('play', { id: 'poses' });
    writeButton(game.pads[0], 8, true);
    writeButton(game.pads[0], 9, true);
    game.advance(0.2);
    assert(game.state().screen === 'play', game.state().screen);
    writeButton(game.pads[0], 8, false);
    writeButton(game.pads[0], 9, false);
  }]);

  tests.push(['prompts follow the stick and the Xbox set on that frame', async () => {
    const game = await fresh();
    game.settings.set({ glyphs: 'xbox' });
    writeWish(game.pads[0], 0.6, 0);
    game.advance(DT);
    const state = game.state();
    assert(state.input.lastDevice === 'pad', state.input.lastDevice);
    assert(state.input.glyphSet === 'xbox', state.input.glyphSet);
    assert(state.prompts.some((p) => p.glyph === 'a'), JSON.stringify(state.prompts));
    game.key('KeyA', true);
    game.advance(DT);
    game.key('KeyA', false);
    assert(game.state().input.lastDevice === 'key', game.state().input.lastDevice);
    assert(game.state().prompts.some((p) => p.glyph === 'enter' || p.glyph === 'wasd'), JSON.stringify(game.state().prompts));
  }]);

  tests.push(['four pads join and each lane leans on its own', async () => {
    const game = await fresh();
    game.goto('menu');
    pressChoice(game, 'group');
    for (let i = 0; i < 4; i++) writeButton(game.pads[i], 0, true);
    game.advance(DT);
    for (let i = 0; i < 4; i++) writeButton(game.pads[i], 0, false);
    const names = game.state().group.seats.filter(Boolean);
    assert(names.length === 4, JSON.stringify(game.state().group));
    pressChoice(game, 'raft');
    await until(game, (s) => s.screen === 'intro', 2, 'raft intro');
    tap(game);
    await until(game, (s) => s.screen === 'play', 5, 'raft play');
    assert(game.state().event.lanes.length === 4, `lanes ${game.state().event.lanes.length}`);
    writeWish(game.pads[0], 1, 0);
    writeWish(game.pads[1], -1, 0);
    writeWish(game.pads[2], 0, 1);
    writeWish(game.pads[3], 0, -1);
    game.advance(1.2);
    const lanes = game.state().event.lanes;
    assert(lanes[0].leanX > 0.04, `lane0 ${lanes[0].leanX}`);
    assert(lanes[1].leanX < -0.04, `lane1 ${lanes[1].leanX}`);
    assert(Math.abs(lanes[0].leanX - lanes[1].leanX) > 0.08, 'lanes moved together');
  }]);

  tests.push(['Tippy Raft names a winner', async () => {
    const { state } = await playBot('raft');
    assert(Number.isFinite(state.winner), `winner ${state.winner}`);
    assert(state.winner >= 0 && state.winner < 4, `winner ${state.winner}`);
  }]);

  void eventIds;
  return tests;
}
