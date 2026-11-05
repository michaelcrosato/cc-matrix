/* ---- START: the game's own Shell (TV-sized menus: engine change E6), then the scenes behind a boot screen ---- */
const SHELL = new E.Shell(game, {
  theme: { ink: '#f4ead8', paper: 'rgba(22,14,10,.92)', accent: '#e8b04a', muted: '#b0a08a', line: 'rgba(232,176,74,.32)', font: 'system-ui, sans-serif', titleFont: 'Georgia, serif',
    scale: (w, h) => clamp(Math.min(w / 900, h / 560), 1, 3.2) }
});
void SHELL;
game.start({
  scenes, scene: SESSION ? 'session' : 'title',
  boot: { title: 'GAUNTLETDOWN', version: VERSION, steps: [
    ['Digging the Gaunt', () => { for (const id of FLOOR_ORDER) { if (!get('floors', id)) { game.fail('floor ' + id, new Error('floor ' + id + ' is not defined')); continue; } const v = validateFloor(get('floors', id)); if (!v.ok) game.fail('floor ' + id, new Error(v.errors.join('; '))); } }],
    ['Setting the table', () => { CAB.table(TABLE_MODE); }],
    ['Waking the ghosts', () => { for (const c of CLASSES) HERO_RIGS[c](); for (const k in MON_RIGS) MON_RIGS[k](2); }]
  ], messages: ['Salting the roasts', 'Counting the keys', 'Sharpening the forks', 'Hiding the stairs'] }
});
