/* ---- THE GAME: input presets, settings, the pause menu ---- */
const MENU_K = { start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1', 'Mouse2'],
  l1: ['KeyQ', 'Pad4'], r1: ['KeyE', 'Pad5'], dev: ['F2', 'Backquote'], l3: ['Pad10'], r3: ['Pad11'], more: ['KeyT', 'Pad3'], slow: ['KeyZ', 'Pad6'], copy: ['KeyC', 'Pad7'], click: ['Mouse0'] };
const KC_KEYS = KC.KEYS = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  tUp: ['KeyI', 'Numpad8', 'PadRAxisUp', 'Pad3'], tDown: ['KeyK', 'Numpad2', 'Numpad5', 'PadRAxisDown', 'Pad0'],
  tLeft: ['KeyJ', 'Numpad4', 'PadRAxisLeft', 'Pad2'], tRight: ['KeyL', 'Numpad6', 'PadRAxisRight', 'Pad1']
}, MENU_K);
// two on one keyboard: P1 WASD + T F G H, P2 arrows + I J K L / numpad (each keeps its pad codes)
const padOnly = a => KC_KEYS[a].filter(c => c.startsWith('Pad'));
KC.KEYS_P1HALF = Object.assign({}, KC_KEYS, { up: ['KeyW', ...padOnly('up')], down: ['KeyS', ...padOnly('down')], left: ['KeyA', ...padOnly('left')], right: ['KeyD', ...padOnly('right')],
  tUp: ['KeyT', ...padOnly('tUp')], tDown: ['KeyG', ...padOnly('tDown')], tLeft: ['KeyF', ...padOnly('tLeft')], tRight: ['KeyH', ...padOnly('tRight')], start: ['Digit1', 'Pad9'], confirm: ['Space', 'Pad0'], cancel: ['Escape', 'Pad1'] });
KC.KEYS_P2HALF = Object.assign({}, KC_KEYS, { up: ['ArrowUp', ...padOnly('up')], down: ['ArrowDown', ...padOnly('down')], left: ['ArrowLeft', ...padOnly('left')], right: ['ArrowRight', ...padOnly('right')],
  tUp: ['KeyI', 'Numpad8', ...padOnly('tUp')], tDown: ['KeyK', 'Numpad5', 'Numpad2', ...padOnly('tDown')], tLeft: ['KeyJ', 'Numpad4', ...padOnly('tLeft')], tRight: ['KeyL', 'Numpad6', ...padOnly('tRight')],
  start: ['Digit2', 'Enter', 'Pad9'], pause: ['Digit2', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'] });
KC.KEYS_PAD = Object.assign({}, KC_KEYS);
// give each player its map: a half keyboard when two share it
KC.applyMaps = () => {
  const P = game.players, I = P[0], sharing = P.some(q => q !== I && q.half);
  const want = sharing ? KC.KEYS_P1HALF : KC_KEYS; if (I._kcMap !== want) { I.use(want); I._kcMap = want; }
  for (const q of P.slice(1)) { const w = q.half ? KC.KEYS_P2HALF : KC.KEYS_PAD; if (q._kcMap !== w) { q.use(w); q._kcMap = w; } }
};

const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', options: ['Normal', 'Easy', 'Hard'], value: 'Normal' },
  { key: 'calls', label: 'Referee calls', options: ['English', 'Japanese'], value: 'English' },
  { key: 'hints', label: 'Tutorial hints', value: true },
  { key: 'camera', label: 'Fight camera', options: ['Arcade side', 'Tatami 2.5D'], value: 'Arcade side' },
  { key: 'techNames', label: 'Technique names', value: true },
  { key: 'inputDisplay', label: 'Input display', value: false },
  { key: 'palette', label: 'Fighter palette', options: ['Modern', 'Classic'], value: 'Modern', help: 'Classic: a white and red recolour (unlocked by finishing the Champon Road)' }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', id: 'karate-champon', input: KC_KEYS,
  defaults: { glyphs: 'playstation' },   // (EC2: PlayStation symbols by default)
  autoPause: !SESSION,
  menu: { items: () => SESSION ? [] : [['Move list', () => KC.openMoveList()], KC.canRetry() && ['Retry match', () => KC.retryMatch()], ['Dev mode', () => KC.Dev.open()]].filter(Boolean),
    settings: SETTINGS, controls: { tUp: 'Technique ↑ high', tDown: 'Technique ↓ low', tLeft: 'Technique ← spin', tRight: 'Technique → toward', l1: false, r1: false, dev: false, l3: false, r3: false, more: false, slow: false, copy: false, click: false },
    quit: SESSION ? false : 'title' } });
KC.game = game;
game.cam.smooth = .15;
KC.canRetry = () => !!(game.sceneName === 'fight' && KC.F && KC.F.mode !== 'attract' && KC.F.mode !== 'online');
KC.retryMatch = () => { game.resume && game.resume(); KC.F && KC.F.retry(); };
KC.openMoveList = () => { game.resume && game.resume(); KC.MoveList.open(game.sceneName); };
KC.calls = id => (KC.CALLS[id] || [id, id])[game.settings.calls === 'Japanese' ? 1 : 0];
KC.diff = () => game.settings.difficulty;
// saved data (E.store), mirrored in memory so it lasts the visit where storage is blocked
const MEM = {};
KC.store = (k, v) => { if (v === undefined) { const NO = {}, s = E.store.get('kc:' + k, NO); return s !== NO ? s : k in MEM ? MEM[k] : null; } MEM[k] = v; return E.store.set('kc:' + k, v); };
KC.unlocks = () => Object.assign({ kyabetsu: false, mei: false, classic: false }, KC.store('unlocks') || {});
KC.unlock = k => { const u = KC.unlocks(); if (!u[k]) { u[k] = true; KC.store('unlocks', u); } };
KC.isUnlocked = id => { const f = KC.ROSTER[id]; return !f.unlock || DEV.unlocked || KC.unlocks()[f.unlock]; };
