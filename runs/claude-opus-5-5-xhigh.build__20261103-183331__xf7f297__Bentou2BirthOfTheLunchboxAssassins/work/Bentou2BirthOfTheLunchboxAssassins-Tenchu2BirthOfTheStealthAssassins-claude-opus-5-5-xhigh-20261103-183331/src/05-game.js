/* ---- THE GAME: one E.Game for every scene (title, story, missions, Workshop, attract, the hub). The pause menu's items
 * come from B.pauseItems() each time it opens (a hub session gets Resume, Settings and Controls only) ---- */
const HUBACTIVE = typeof window !== 'undefined' && !!(window.AIHub && window.AIHub.active);
GAME_SETTINGS.forEach(s => { const ap = s.apply; if (ap) s.apply = (g, v) => { if (g.audio && g.settings) { try { ap(g, v); } catch (e) { /* not ready yet */ } } }; });
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso', 'threequarter'], input: B.INPUT, bg: '#05040a', id: 'bentou2',
  menu: { items: () => (B.pauseItems ? B.pauseItems() : []), settings: GAME_SETTINGS.concat(DEV_SETTINGS), controls: CONTROL_NAMES, quit: HUBACTIVE ? false : 'title' },
  camera: { zoom: false }, corner: !HUBACTIVE });   // (in a session the hub's own corner bar stands in for the engine's)
B.game = game;
const Pt = game.particles, Lt = game.lights, Au = game.audio;
Au.voiceVolume = game.settings.voices;
const ui = new E.Shell(game, { theme: { ink: '#f4ead5', paper: 'rgba(20,12,12,.92)', accent: '#e8b04a', muted: '#b8a890', danger: '#d8402a',
  line: 'rgba(232,176,74,.35)', font: 'system-ui, sans-serif', titleFont: 'Georgia, "Times New Roman", serif' } });
B.ui = ui;
E.style.propSize = 1.4;
if (hasDOM && typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'Tab' || e.code === 'Space') { if (!(ui.screen)) e.preventDefault(); } }, true);
