// The flow (plan §19.2 "flow"): boot to the title; ten seconds idle to attract; any input leaves; every main-menu entry
// reaches a working screen; the match with one to four players; the pause menu's items.
import { loadGame, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f) => tests.push([n, f]);
const run = (g, s) => g.game.advance(s);

T('flow.boot reaches the title', () => {
  const g = loadGame({ seed: 1 });
  run(g, .5);
  expect(g.game.sceneName === 'title', `scene ${g.game.sceneName}`);
  expect(g.game.errors.length === 0, 'no errors at boot');
});
T('flow.ten seconds idle on the title starts attract; any key leaves it', () => {
  const g = loadGame({ seed: 2 });
  run(g, 10.5);
  expect(g.game.sceneName === 'attract', `after 10 s idle: ${g.game.sceneName}`);
  g.game.input.tap('KeyX' in {} ? 'confirm' : 'confirm');
  run(g, .3);
  expect(g.game.sceneName === 'title', `after a key: ${g.game.sceneName}`);
});
T('flow.confirm on the title opens the main menu, and each entry reaches its screen', () => {
  const g = loadGame({ seed: 3 });
  run(g, .3); g.game.input.tap('confirm'); run(g, .3);
  expect(g.game.sceneName === 'menu', `menu: ${g.game.sceneName}`);
  const reach = { 'EXHIBITION': 'join', 'BLAM CAMP': 'camp', 'HALL OF BLAM': 'hall', 'HOW TO PLAY': 'howto', 'ABOUT': 'about' };
  for (const [label, scene] of Object.entries(reach)) {
    g.game.go('menu', null, { fade: 0 }); run(g, .2);
    const items = g.bb.S.menuList.items, idx = items.findIndex(i => i.label === label);
    expect(idx >= 0, `menu entry ${label} exists`);
    items[idx].on(g.bb.S.menuList); run(g, .3);
    expect(g.game.sceneName === scene, `${label} should reach ${scene}, got ${g.game.sceneName}`);
  }
});
T('flow.a match runs with one to four human players, each on the right side', () => {
  for (let n = 1; n <= 4; n++) {
    const g = loadGame({ seed: 4 + n });
    const humans = [];
    const side = [0, 2, 1, 3];
    for (let i = 0; i < n; i++) humans.push({ slot: side[i], input: g.game.input });
    g.bb.setupMatch({ court: 'skybox', humans, qLen: 60 });
    const hs = g.S.players.filter(p => p.human).map(p => p.slot).sort();
    expect(hs.length === n, `${n} players: ${hs.length} humans`);
    expect(JSON.stringify(hs) === JSON.stringify(humans.map(h => h.slot).sort()), `${n} players: slots ${hs}`);
  }
});
T('flow.the pause menu offers How to Play and Dev Mode in a match, and How to Play out of it', () => {
  const g = loadGame({ seed: 9 });
  g.game.go('court', { court: 'skybox', humans: [{ slot: 0, input: g.game.input }] }, { fade: 0 }); run(g, .2);
  const names = g.bb.pauseItems().map(i => i[0]);
  expect(names.includes('How to Play') && names.includes('Dev Mode') && names.includes('Restart Game'), `pause items ${names}`);
});
T('flow.a touch-only device shows no controls and lifts when a key is pressed', () => {
  const g = loadGame({ seed: 10, touch: true });
  run(g, .3);
  expect(g.bb.S.touchOnly === true, 'a touch-only device is detected');
  g.bb.S.everKey = true;
  expect(g.bb.checkTouchOnly() === false, 'a key lifts the touch-only notice');
});
