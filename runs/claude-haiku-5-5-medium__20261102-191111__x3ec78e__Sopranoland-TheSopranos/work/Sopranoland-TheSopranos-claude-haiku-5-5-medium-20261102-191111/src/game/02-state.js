// ---------------------------------------------------------------------------------------------
// 02 · STATE — the game object, its settings and menus, the run's state, and the save slots.
// ---------------------------------------------------------------------------------------------
// The hub client (session.js) sets AIHub before this runs; outside a session there is no AIHub.active.
const HUB = (typeof AIHub !== 'undefined' && AIHub && AIHub.active) ? AIHub : null;
const IN_SESSION = !!HUB;
// Touch-only devices get no touch controls: they see "Controller or keyboard required" and can watch the attract mode.
const TOUCH_ONLY = typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;

const game = new E.Game({
  canvas: 'screen', res: 'snes', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  // the third-person preset, plus V (and the right stick press) to cycle the camera's view
  // the keyboard and mouse: WASD, J or a left click for the bat, Q or a middle click for the piece, V to change the view
  input: Object.assign({}, E.Input.THIRDPERSON, { use: E.Input.THIRDPERSON.use.concat('Mouse1'), view: ['KeyV', 'Pad11'] }),
  menu: {
    controls: { attack: 'Bat and fists', block: 'Guard', dodge: 'Roll', use: 'Pistol', interact: 'Talk, open, pay', jump: 'Jump', sprint: 'Sprint', crouch: 'Crouch', view: 'Camera view' },
    quit: IN_SESSION ? false : 'title',                                // a hub session has no quit to title: the hub ends rounds
    saves: { slots: 3, version: 1, write: saveWrite, read: saveRead },
  },
});
game.settings.define({ key: 'invertStickX', label: 'Invert stick left and right', type: 'toggle', value: false, group: 'Controller',
  help: 'Gamepad only: flips the left stick\'s left and right. Fixes a stick that sometimes reads inverted.' });
game.settings.define({ key: 'invertStickY', label: 'Invert stick up and down', type: 'toggle', value: false, group: 'Controller',
  help: 'Gamepad only: flips the left stick\'s up and down.' });
if (game.settings.glyphs === 'auto') game.settings.set('glyphs', 'playstation');   // PlayStation symbols unless the player picks Xbox
if (TOUCH_ONLY) game.input.touchEnabled = false;

// The run. Saved to a slot as is; a new game starts from newState().
function newState() {
  return {
    chapter: 1, hp: 100, stress: 0, heat: 0, respect: 0, cash: 0, ammo: 12, cannoli: 0, ducks: 0,
    got: { ricci: false, dorothy: false, tina: false }, lou: false, vashti: false, bossDown: false,
    deaths: 0, kills: 0, playTime: 0, done: false, flags: {},
  };
}
let S = newState();
let SAVE_SEQ = 0;   // bumps on every load, so a scene knows it was restored

function saveWrite() {
  return { data: JSON.parse(JSON.stringify(S)), place: CHAPTERS[S.chapter].title, level: S.chapter };
}
function saveRead(save) {
  S = Object.assign(newState(), save.data);
  SAVE_SEQ++;
  game.go('play', { load: true, chapter: S.chapter });
}

// The gamepad's stick, with the player's own inversions applied (the aim keeps the engine's own toggle).
function stickMove(I) {
  const m = I.move();
  if (I.lastDevice !== 'gamepad') return m;
  return [game.settings.invertStickX ? -m[0] : m[0], game.settings.invertStickY ? -m[1] : m[1]];
}
