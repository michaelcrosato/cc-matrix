/* ---- THE GAME: 320x240 minimum, full-screen at any shape; the standard pause menu, settings and controls are the engine's ---- */
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', bg: '#07060d', input: INPUT,
  menu: {
    items: () => B.pauseItems ? B.pauseItems() : [],
    settings: [
      { key: 'glyphs', label: 'Button symbols', options: ['PlayStation', 'Xbox'], value: 'PlayStation' },
      { key: 'hints', label: 'Training hints', value: true },
      { key: 'cones', label: 'Show guard sight cones', value: true },
      { key: 'ink', label: 'Ink splatter on cuts', value: true }
    ],
    quit: HUB ? false : 'title'
  } });
B.game = game;
const P = game.particles, L = game.lights, A = game.audio;
B.initAudio(A);
const syncGlyphs = () => { game.input.glyphs = game.settings.glyphs === 'Xbox' ? 'xbox' : 'playstation'; };
B.syncGlyphs = syncGlyphs;
// controller first: the keyboard / mouse labels follow the device used last (input.label does this)
const lbl = a => game.input.label(a) || a;
const lastDev = () => game.input.lastDevice;
const isPad = () => lastDev() === 'gamepad';
const isTouchOnly = () => lastDev() === 'touch';
/* touch-only devices: no touch controls; the title says so and lets the attract mode run */
B.touchOnly = () => { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !navigator.getGamepads().some(Boolean)); } catch (e) { return false; } };
