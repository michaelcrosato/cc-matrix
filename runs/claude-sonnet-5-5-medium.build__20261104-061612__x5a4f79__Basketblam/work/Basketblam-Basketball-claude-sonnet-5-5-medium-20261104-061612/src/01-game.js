/* BASKETBLAM - the one E.Game */
let uiHooks = { pauseItems: () => [] };
const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: BROADCAST, views: ['broadcast', 'high'], bg: '#05040a', id: 'basketblam',
  input: KEYS, autoPause: !HUB,
  menu: HUB ? false : { items: () => uiHooks.pauseItems(), settings: GAME_SETTINGS, controls: CONTROL_NAMES, quit: 'title' }
});
const P = game.particles, L = game.lights, A = game.audio;
const touchOnlyDevice = () => HAS_WIN && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !(window.matchMedia && window.matchMedia('(hover: hover)').matches) && !S.padSeen && !S.keySeen;
if (HAS_WIN && window.addEventListener) {   // a real key press (the engine's lastDevice starts as 'keyboard', so it can't say)
  window.addEventListener('keydown', e => { if (e.isTrusted !== false) S.keySeen = true; });
  window.addEventListener('gamepadconnected', () => { S.padSeen = true; });
}
// the pointer in HUD pixels (the engine's mouseScreen is in world-buffer pixels: it adds the camera's origin)
const mouseHud = () => { const m = game.input.mouseScreen && game.input.mouseScreen(); return m ? [m[0] - (game.screen.ix || 0), m[1] - (game.screen.iy || 0)] : null; };
