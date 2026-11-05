/* 05-game: the game, its settings (the player's, in group 'Game'; balance in group 'Dev'), the HTML shell and the pause
 * menu's items. */
const SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', value: 'ninja', options: [['ninja', 'Ninja'], ['novice', 'Novice'], ['master', 'Grand Master']], help: 'Guard perception, damage taken and Ki range' },
  { key: 'uiSize', label: 'Interface size', type: 'select', value: 'auto', options: [['auto', 'Auto'], ['normal', 'Normal'], ['large', 'Large'], ['huge', 'Huge']], help: 'Menus and panels, for a TV across the room', apply: (g, v) => { E.uiScale = { auto: 1, normal: 1, large: 1.25, huge: 1.5 }[v] || 1; if (g.shell && g.shell.rescale) g.shell.rescale(); B.hudScale = v === 'auto' ? 0 : { normal: 1, large: 1.25, huge: 1.5 }[v]; } },
  { key: 'camAngle', label: 'Camera angle', type: 'select', value: 'low', options: [['low', 'Low'], ['high', 'High']], help: 'Low: isometric. High: from above', apply: (g, v) => { if (g.sceneName === 'mission' || g.sceneName === 'attract') g.setView(v === 'high' ? 'threequarter' : 'iso'); } },
  { key: 'invertCam', label: 'Invert camera turn', type: 'toggle', value: false },
  { key: 'crouchMode', label: 'Crouch', type: 'select', value: 'toggle', options: [['toggle', 'Toggle'], ['hold', 'Hold']] },
  { key: 'cones', label: 'Sight cones', type: 'toggle', value: true, help: 'The faint cones of the guards you can see' },
  { key: 'marker', label: 'Objective marker', type: 'toggle', value: true },
  { key: 'showAll', label: 'Show all enemies (assist)', type: 'toggle', value: false, help: 'Turns Shadow Sight off: every guard is drawn' },
  { key: 'heartbeat', label: 'Ki heartbeat', type: 'toggle', value: true },
  { key: 'textSpeed', label: 'Text speed', type: 'select', value: 'normal', options: [['normal', 'Normal'], ['slow', 'Slow'], ['fast', 'Fast']] },
  { key: 'blood', label: 'Blood', type: 'select', value: 'ink', options: [['ink', 'Ink'], ['off', 'Off']] }
];
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'side', bg: '#07060d', input: B.INPUT, id: 'bentou2',
  menu: { quit: B.HUB ? false : 'title', items: () => B.pauseItems ? B.pauseItems() : [], controls: B.CONTROL_NAMES } });
B.game = game;
const A = game.audio, P = game.particles, L = game.lights;
for (const s of SETTINGS) game.settings.define(Object.assign({ group: 'Game' }, s));
game.settings.define({ key: 'voices', group: 'Sound', label: 'Voices', type: 'slider', value: .8, apply: (g, v) => { if (g.audio.voiceBus) g.audio.voiceBus.gain.value = v; } });
for (const [page, key, label, value, min, max, step] of B.TUNE) game.settings.define({ key, group: 'Dev', label: page + ': ' + label, type: 'slider', value, min, max, step });
E.pauseGuard = g => B.HUB && g.input.down('objectives');   // the hub owns Create + Options
B.ui = new E.Shell(game, { theme: { ink: '#f4ead5', paper: 'rgba(20,12,12,.92)', accent: '#e8b04a', muted: '#b8a890', danger: '#d8402a', line: 'rgba(232,176,74,.35)', font: 'system-ui, sans-serif', titleFont: 'Georgia, "Times New Roman", serif' } });
B.ts = () => ({ normal: 46, slow: 26, fast: 90 })[game.settings.textSpeed] || 46;
B.scenes = {};
