/* 99-start: boot steps, then the title (or, in an AI Hub session, straight into the round). */
game.start({
  scenes, scene: SESSION ? 'sboot' : 'title',
  boot: { title: 'GAUNTLETDOWN', version: VERSION, steps: [
    ['Digging the Gaunt', () => { for (const id of FLOOR_ORDER) { const e = validateFloor(get('floors', id)); if (e.length) game.fail('floor ' + id, new Error(e.join('; '))); } }],
    ['Setting the table', () => { buildArt(); }],
    ['Waking the ghosts', () => { for (const c of HERO_ORDER) get('heroes', c).rig(); }]
  ], messages: ['Salting the larder', 'Sharpening the forks', 'Counting the bones', 'Stoking the furnace'] }
});
