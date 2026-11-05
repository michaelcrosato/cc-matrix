/* ---- MISSION 2, "The Fort at Kiri Lake": rain and lightning. West, the reed shore and the escape boat; the lake
 * channel (archers sweep it from the towers); the Red Lanterns' fort with its barracks, bell, storehouses, Tobei's cage,
 * the lever of the water gate, and the dock of rice barges; Hotaru waits on the pier of the escape route ---- */
(() => {
  const L = LG(60, 52);
  L.rect(1, 1, 12, 50, ','); L.rect(5, 2, 7, 49, '.'); L.rect(8, 8, 11, 9, '.'); L.rect(1, 12, 3, 14, '~');        // the reed shore, its path, the boat's inlet
  L.rect(13, 1, 29, 50, '~'); L.rect(30, 1, 30, 50, '-');                            // the channel; a wading strip under the fort wall
  L.rect(19, 30, 28, 34, '='); L.rect(29, 31, 30, 32, '-');                          // the pier (Hotaru's), the shallows to the water gate
  L.frame(31, 1, 58, 50, '#'); L.rect(32, 2, 57, 49, ':');                           // the fort
  L.rect(33, 3, 34, 4, 'T'); L.rect(55, 3, 56, 4, 'T'); L.rect(33, 41, 34, 42, 'T'); L.rect(55, 41, 56, 42, 'T');
  L.rect(36, 7, 41, 12, 'B'); L.rect(48, 7, 53, 11, 'C'); L.rect(44, 24, 47, 27, 'A'); L.rect(36, 34, 39, 37, 'C');
  L.rect(32, 14, 35, 20, ','); L.rect(54, 25, 57, 30, ','); L.rect(40, 16, 42, 18, ',');
  L.rect(33, 44, 56, 44, '='); L.rect(33, 45, 56, 48, '~');                          // the quay and the dock basin
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'm2', { id: 'm2', name: 'The Fort at Kiri Lake', size: [60, 52], time: 'rain', faction: 'redlantern', rows: L.rows(), music: 'm2', weather: 'rain', par: 900,
    zones: [{ id: 'shore', rect: [1, 1, 12, 50], name: 'The reed shore' }, { id: 'channel', rect: [13, 1, 30, 50], name: 'The lake channel' }, { id: 'fort', rect: [32, 2, 57, 43], name: 'The Red Lantern fort' }, { id: 'dock', rect: [32, 44, 57, 49], name: 'The barge dock' }, { id: 'pier', rect: [19, 30, 28, 34], name: 'The pier' }],
    lights: [{ at: [34, 4], kind: 'none', z: 86, r: 70, color: '#ff6a3a' }, { at: [56, 4], kind: 'none', z: 86, r: 70, color: '#ff6a3a' }, { at: [34, 42], kind: 'none', z: 86, r: 70, color: '#ff6a3a' },
      { at: [44, 10], kind: 'paperLantern', r: 64 }, { at: [43, 14], kind: 'paperLantern', r: 60 }, { at: [52, 15], kind: 'paperLantern', r: 60 }, { at: [35, 30], kind: 'torch', r: 64 }, { at: [46, 22], kind: 'paperLantern' },
      { at: [40, 43], kind: 'torch', r: 64 }, { at: [50, 43], kind: 'torch', r: 64 }, { at: [24, 30], kind: 'paperLantern', r: 60 }, { at: [6, 6], kind: 'none', z: 14, r: 40, i: .5 }, { at: [6, 42], kind: 'none', z: 14, r: 40, i: .5 },
      { at: [45, 32], kind: 'paperLantern' }],
    props: [P('hut', 4, 6), P('hut', 4, 40), P('nets', 9, 22), P('nets', 9, 30), P('boat', 2, 13, { facing: 1.57 }), P('mooringPost', 4, 12), P('riceBale', 8, 5), P('waterBarrel', 3, 8),
      P('bambooCage', 52, 17), P('lever', 34, 31, { facing: 0 }), P('hansho', 44, 9), P('weaponRack', 43, 13), P('weaponRack', 35, 13, { facing: 1.57 }), P('sakeBarrel', 47, 13), P('sakeBarrel', 48, 13),
      P('riceBale', 54, 13), P('riceBale', 55, 13), P('riceBale', 54, 14), P('riceBale', 42, 31), P('riceBale', 43, 31), P('cart', 49, 31), P('nobori', 32, 6, { color: '#c8242a' }), P('nobori', 57, 6, { color: '#c8242a' }),
      P('nobori', 32, 40, { color: '#c8242a' }), P('mooringPost', 37, 44), P('mooringPost', 45, 44), P('mooringPost', 53, 44), P('riceBarge', 37, 46), P('riceBarge', 45, 46), P('riceBarge', 53, 46),
      P('mooringPost', 19, 31), P('mooringPost', 28, 33), P('boat', 16, 32, { facing: 1.57 }), P('waterBarrel', 51, 21), P('crate', 46, 29), P('crate', 47, 29)],
    anchors: [],
    hero: { at: [6, 9], facing: 0 }, exit: { at: [5, 13], r: 2.5 },
    escort: { id: 'tobei', at: [52, 17], hp: 60, caged: true },
    guards: [
      { id: 'archerNW', type: 'archer', at: [33, 3], facing: 150, mode: 'post', lantern: true }, { id: 'archerNE', type: 'archer', at: [55, 3], facing: 120, mode: 'post' },
      { id: 'archerSW', type: 'archer', at: [33, 41], facing: 200, mode: 'post', lantern: true },
      { id: 'ninja1', type: 'ninja', at: [38, 9], z: 64, mode: 'patrol', route: [[37, 8, 2], [40, 11, 2]] }, { id: 'ninja2', type: 'ninja', at: [50, 9], z: 48, mode: 'post', facing: 90 },
      { id: 'ninja3', type: 'ninja', at: [37, 35], z: 48, mode: 'post', facing: 180 },
      { id: 'cagesam', type: 'samurai', at: [50, 19], facing: 90, mode: 'post' }, { id: 'leversam', type: 'samurai', at: [36, 29], facing: 0, mode: 'post' },
      { id: 'loopsam', type: 'samurai', at: [40, 20], mode: 'patrol', route: [[40, 20, 1], [54, 20, 1], [54, 38, 1], [40, 38, 1]] },
      { id: 'gatepat', type: 'ashigaru', at: [33, 22], mode: 'patrol', lantern: true, route: [[33, 22, 2, 180], [33, 39, 2, 180]], loop: false },
      { id: 'northpat', type: 'ashigaru', at: [36, 15], mode: 'patrol', route: [[36, 15, 1], [56, 15, 2]], loop: false },
      { id: 'dockpat', type: 'ashigaru', at: [34, 43], mode: 'patrol', lantern: true, route: [[34, 43, 2, 90], [56, 43, 2, 90]], loop: false },
      { id: 'bellash', type: 'ashigaru', at: [44, 11], facing: 90, mode: 'post' }, { id: 'midpat', type: 'ashigaru', at: [45, 29], mode: 'patrol', route: [[45, 29, 1], [45, 38, 2]], loop: false },
      { id: 'shed', type: 'ashigaru', at: [43, 26], facing: 180, mode: 'chat', partner: 'midpat' },
      { id: 'hound1', type: 'hound', at: [42, 19], mode: 'patrol', route: [[42, 19, 1], [42, 30, 1]], loop: false }, { id: 'hound2', type: 'hound', at: [50, 35], mode: 'patrol', route: [[50, 35, 1], [56, 35, 1]], loop: false }],
    civilians: [],
    bells: [[44, 9]], barracks: [[38, 13]],
    pickups: [{ id: 'pot', kind: 'tool', tool: 'smoke', n: 1, at: [46, 30] }, { id: 'onigiri2', kind: 'tool', tool: 'riceball', n: 1, at: [55, 22] }],
    interact: [
      { id: 'cage', at: [52, 18], hold: 1.5, text: 'Open the cage', do: [['release']], sfx: 'lever' },
      { id: 'lever', at: [34, 31], hold: 1.2, text: 'Open the water gate', do: [['open', 31, 31, 1, 2, '-'], ['prop', 'lever', 34, 31, 'leverDown'], ['toast', 'The water gate groans open', '']], sfx: 'gate' },
      { id: 'rope1', at: [37, 43], hold: 1.5, text: 'Cut the barge loose', do: [['drift', 37, 46]], sfx: 'slash' },
      { id: 'rope2', at: [45, 43], hold: 1.5, text: 'Cut the barge loose', do: [['drift', 45, 46]], sfx: 'slash' },
      { id: 'rope3', at: [53, 43], hold: 1.5, text: 'Cut the barge loose', do: [['drift', 53, 46]], sfx: 'slash' }],
    boss: { id: 'hotaru', at: [22, 32], facing: 0, arena: [19, 30, 28, 34], ambush: true },
    objectives: [
      { id: 'rescue', type: 'rescue', text: 'Free Tobei from the bamboo cage' },
      { id: 'gate', type: 'interact', interact: 'lever', text: 'Open the water gate (the lever inside)' },
      { id: 'boss', type: 'defeat', boss: 'hotaru', secret: true, text: 'Defeat Hotaru of the Red Lantern' },
      { id: 'escort', type: 'escort', zone: [1, 10, 9, 16], after: ['rescue', 'gate', 'boss'], text: 'Bring Tobei to the boat in the reeds' },
      { id: 'barges', type: 'interact', interact: ['rope1', 'rope2', 'rope3'], count: 3, optional: true, text: 'Cut the rice barges loose (0/3)' }],
    triggers: [
      { id: 's', when: 'time:.8', do: [['say', 'hero', 'm2_start'], ['tutorial', 'Rain and lightning', 'Rain hides your steps. Lightning shows everyone for a moment: stay out of the open when the sky growls.']] },
      { id: 'in', rect: [32, 2, 57, 43], do: [['checkpoint'], ['say', 'granny', 'm2_cage']] },
      { id: 'r', when: 'objective:rescue', do: [['checkpoint'], ['say', 'granny', 'm2_gate'], ['tutorial', 'Escort', '{a:interact} near Tobei: wait here, or follow me. He crouches when you crouch and swims where you swim.']] },
      { id: 'dock', rect: [33, 42, 56, 44], do: [['say', 'granny', 'm2_barges']] },
      { id: 'amb', rect: [19, 30, 28, 34], when: ['objective:rescue', 'objective:gate'], do: [['objective', 'boss', 'show'], ['boss', 'hotaru']] }],
    timer: null });
})();
