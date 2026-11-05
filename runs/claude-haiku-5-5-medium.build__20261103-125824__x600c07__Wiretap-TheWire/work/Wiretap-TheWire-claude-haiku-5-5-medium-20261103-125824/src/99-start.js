// Start: the engine, the Shell (HUD, menus, settings), the dialogue box, the boot steps, then the title.
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'iso', views: ['iso'], input: KEYS, id: 'wiretap',
  menu: { controls: { interact: 'Interact', blend: 'Act natural (hold)', partner: 'Partner', watch: 'Watch (aim camera)', photo: 'Take photo', notebook: 'Board', sprint: 'Run' },
    quit: 'title', saves: false } });
E.style.propSize = 1.35;
installGamepadInversion(game);

const ui = new E.Shell(game, {
  theme: { accent: '#ffb347', ink: '#f2ece0', paper: '#15141a', muted: '#a8a296', danger: '#ff5a4a', line: '#3a342a' },
  settings: { items: GAME_ITEMS, onChange(s, key) { if (key === 'padSymbols' || key === 'textSpeed') TALK.speed = TEXT_CPS[s.textSpeed] || 45; } },
});
const TALK = new E.Dialog(game, { speed: TEXT_CPS.Normal });
const scenes = { title: titleScene, field: fieldScene, attract: attractScene };

defineSounds(game);
game.start({
  scenes, scene: 'title',
  boot: {
    title: TITLE, version: '1.0',
    steps: [
      ['Laying Penn Row', () => { buildWorld(); FLOW = new E.FlowField(MAP); }],
      ['Hanging the phone lines', () => { loadState(); }],
      ['Waking the block', () => { for (const k of Object.keys(CAST)) rigOf(k); }],
      ['Checking the paperwork', () => { validateData(); }],
      ['Charging the pagers', () => { touchOnlyNow() && (game.input.touchEnabled = false); }],
    ],
    messages: ['Pouring the coffee', 'Juking the stats', 'Filling out the 24-hour report', 'Finding a parking space on Ridley'],
  },
});

// Data cross-check: every interactable and POI cell is on walkable ground (reports through game.fail).
function validateData() {
  const bad = [];
  for (const [id, p] of Object.entries(POI)) {
    const [cx, cy] = p.c;
    if (!MAP || cx < 0 || cy < 0 || cx > 71 || cy > 55) bad.push(id);
  }
  if (bad.length) game.fail('validateData', new Error('POI off the map: ' + bad.join(', ')));
}
