/* ---- MISSION 1, "Rice and Ash": the castle town by the canal. North, Magistrate Kanemori's walled mansion (the gravel
 * court, the feast hall, the garden and his storehouse); the middle, the market square with its alarm bell; the south,
 * alleys and rooftops and the rice merchant's yard; the canal along the bottom (arrive east, leave by the west boat) ---- */
(() => {
  const L = LG(56, 48);
  // the mansion compound
  L.frame(2, 2, 46, 16, 'W');
  L.rect(3, 3, 20, 11, ':'); L.rect(3, 12, 20, 12, 'W');                    // the inner gravel court (Gonroku's), its closed south gate
  L.frame(21, 3, 39, 11, 'H'); L.rect(22, 4, 38, 10, '_'); L.set(21, 7, 'd'); L.set(30, 11, 'd');   // the feast hall
  L.rect(40, 3, 45, 11, '.'); L.rect(41, 4, 44, 7, 'C');                    // Kanemori's storehouse
  L.rect(3, 13, 20, 15, ','); L.rect(21, 12, 45, 15, ','); L.rect(5, 13, 9, 15, '~'); L.rect(26, 12, 34, 15, '+'); L.rect(30, 12, 30, 15, '+');
  L.rect(24, 16, 25, 16, 'd'); L.set(46, 9, 'd');                           // the front gate, the side door
  // the east strip and its watchtower
  L.rect(47, 1, 54, 16, '.'); L.rect(50, 4, 51, 5, 'T');
  // the market square
  L.rect(1, 17, 54, 30, '.'); L.rect(20, 18, 34, 29, '+');
  for (const [x, ch] of [[2, 'A'], [8, 'A'], [14, 'B'], [37, 'B'], [43, 'A'], [49, 'A']]) L.rect(x, 18, x + 3, 21, ch);
  for (const [x, ch] of [[2, 'D'], [8, 'A'], [14, 'D'], [37, 'D'], [43, 'A'], [49, 'D']]) L.rect(x, 25, x + 3, 28, ch);
  // the south: alleys, roofs, the rice merchant's yard
  for (const [x, ch] of [[2, 'A'], [9, 'B'], [15, 'A'], [21, 'C'], [28, 'A']]) L.rect(x, 31, x + 3, 34, ch);
  for (const [x, ch] of [[2, 'D'], [8, 'A'], [14, 'B'], [21, 'A'], [28, 'D']]) L.rect(x, 36, x + 3, 39, ch);
  L.frame(36, 31, 48, 38, 'W'); L.rect(37, 32, 47, 37, ':'); L.set(42, 31, 'd'); L.set(36, 35, 'd');
  L.rect(50, 32, 53, 35, 'A');
  L.rect(1, 40, 54, 40, ','); L.rect(1, 41, 54, 46, '~'); L.rect(1, 40, 3, 41, '='); L.rect(50, 40, 54, 41, '=');
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'm1', { id: 'm1', name: 'Rice and Ash', size: [56, 48], time: 'night', faction: 'kanemori', rows: L.rows(), music: 'm1', weather: 'petals', par: 720,
    zones: [{ id: 'court', rect: [3, 3, 20, 11], name: 'The inner court' }, { id: 'hall', rect: [21, 3, 39, 11], name: 'The feast hall' }, { id: 'garden', rect: [3, 12, 45, 15], name: 'The magistrate\'s garden' },
      { id: 'tower', rect: [47, 1, 54, 16], name: 'The east lane' }, { id: 'market', rect: [1, 17, 54, 30], name: 'The market square' }, { id: 'yard', rect: [36, 31, 48, 38], name: 'The rice merchant\'s yard' },
      { id: 'alleys', rect: [1, 31, 35, 39], name: 'The south alleys' }, { id: 'canal', rect: [1, 40, 54, 46], name: 'The canal' }],
    lights: [{ at: [12, 14], kind: 'stoneLantern' }, { at: [18, 14], kind: 'stoneLantern' }, { at: [37, 13], kind: 'stoneLantern' }, { at: [44, 14], kind: 'stoneLantern' }, { at: [30, 12], kind: 'paperLantern', r: 56 },
      { at: [26, 7], kind: 'paperLantern', r: 70, i: .9 }, { at: [35, 7], kind: 'paperLantern', r: 70, i: .9 }, { at: [22, 17], kind: 'torch', r: 72 }, { at: [27, 17], kind: 'torch', r: 72 },
      { at: [22, 20], kind: 'none', z: 22, r: 60, color: '#ffb060' }, { at: [32, 27], kind: 'none', z: 22, r: 60, color: '#ffb060' }, { at: [7, 23], kind: 'paperLantern' }, { at: [19, 23], kind: 'paperLantern' },
      { at: [36, 23], kind: 'paperLantern' }, { at: [48, 23], kind: 'paperLantern' }, { at: [12, 30], kind: 'paperLantern' }, { at: [34, 30], kind: 'paperLantern' }, { at: [10, 40], kind: 'stoneLantern' },
      { at: [30, 40], kind: 'stoneLantern' }, { at: [46, 40], kind: 'stoneLantern' }, { at: [42, 34], kind: 'torch', r: 56 }, { at: [6, 22], kind: 'window', r: 34, i: .5 }, { at: [16, 24], kind: 'window', r: 34, i: .5 },
      { at: [45, 22], kind: 'window', r: 34, i: .5 }, { at: [17, 35], kind: 'window', r: 30, i: .45 }],
    props: [P('kotatsu', 30, 7), P('folding', 30, 4), P('kotatsu', 25, 6, { facing: 1.57 }), P('jubako', 33, 6), P('sakeBarrel', 23, 5), P('sakeBarrel', 37, 5), P('strongbox', 42, 5, { z: 48, facing: 1.57 }),
      P('cherry', 4, 14), P('cherry', 16, 13), P('bonsaiPine', 43, 13), P('steppingStones', 11, 13), P('steppingStones', 28, 14), P('weaponRack', 4, 4, { facing: 1.57 }), P('weaponRack', 4, 9, { facing: 1.57 }), P('mato', 18, 4),
      P('yatai', 22, 20, { facing: 1.57 }), P('yatai', 32, 27, { facing: -1.57 }), P('hansho', 27, 22), P('sakeBarrel', 23, 22), P('sakeBarrel', 24, 22), P('cart', 34, 21, { facing: 1.2 }), P('riceBale', 21, 26), P('riceBale', 22, 26),
      P('nobori', 20, 18, { color: '#8a6a2a' }), P('nobori', 34, 18, { color: '#8a6a2a' }), P('nobori', 20, 29, { color: '#c8342a' }), P('waterBarrel', 13, 22), P('waterBarrel', 42, 24),
      P('riceBale', 38, 33), P('riceBale', 39, 33), P('riceBale', 38, 34), P('riceBale', 45, 36), P('riceBale', 46, 36), P('riceBale', 46, 35), P('cart', 41, 36), P('sack', 44, 33),
      P('boat', 53, 42), P('boat', 2, 42), P('mooringPost', 50, 40), P('mooringPost', 4, 40), P('nets', 20, 40), P('jubako', 52, 40), P('sakeBarrel', 26, 33), P('waterBarrel', 13, 35), P('cherry', 34, 40), P('cherry', 7, 30),
      P('stoneLantern', 0 + 47, 10), P('torii', 52, 12, { facing: 0 })],
    anchors: [],
    hero: { at: [53, 40], facing: 180 }, exit: { at: [2, 40], r: 1.5 },
    guards: [
      { id: 'court', type: 'ashigaru', at: [5, 4], mode: 'patrol', lantern: true, route: [[5, 4, 1], [18, 4, 1, 0], [18, 10, 1], [5, 10, 1, 180]] },
      { id: 'garden', type: 'ashigaru', at: [22, 13], mode: 'patrol', lantern: true, route: [[22, 13, 2, 270], [44, 13, 1], [44, 15, 1], [22, 15, 1]] },
      { id: 'hallguard', type: 'samurai', at: [24, 9], facing: 0, mode: 'post' },
      { id: 'gate1', type: 'ashigaru', at: [23, 17], facing: 90, mode: 'post' }, { id: 'gate2', type: 'ashigaru', at: [26, 17], facing: 90, mode: 'post' },
      { id: 'side', type: 'ashigaru', at: [47, 9], facing: 0, mode: 'post', lantern: true },
      { id: 'archer', type: 'archer', at: [50, 4], facing: 110, mode: 'post', lantern: true },
      { id: 'east', type: 'samurai', at: [48, 2], mode: 'patrol', route: [[48, 2, 1], [48, 15, 2, 90], [53, 15, 1], [53, 2, 1]] },
      { id: 'sam1', type: 'samurai', at: [21, 23], mode: 'patrol', route: [[21, 23, 1], [34, 23, 1], [34, 24, 1], [21, 24, 1]], partner: 'sam2' },
      { id: 'sam2', type: 'samurai', at: [22, 23], mode: 'patrol', route: [[22, 23, 1], [35, 23, 1], [35, 24, 1], [22, 24, 1]], partner: 'sam1' },
      { id: 'bellguard', type: 'ashigaru', at: [27, 21], facing: 90, mode: 'post' },
      { id: 'south1', type: 'ashigaru', at: [3, 35], mode: 'patrol', lantern: true, route: [[3, 35, 2], [33, 35, 2, 0]], loop: false },
      { id: 'south2', type: 'ashigaru', at: [26, 30], mode: 'patrol', route: [[26, 30, 1], [26, 39, 2, 90]], loop: false },
      { id: 'south3', type: 'ashigaru', at: [13, 39], facing: 270, mode: 'post' },
      { id: 'hound', type: 'hound', at: [38, 33], mode: 'patrol', route: [[38, 33, 1], [47, 33, 1], [47, 37, 1], [38, 37, 1]] }],
    civilians: [{ id: 'kanemori', type: 'kanemori', at: [30, 6], facing: 90, mode: 'sit', target: true }, { id: 'maid1', type: 'maid', i: 0, at: [27, 8], facing: 0 }, { id: 'maid2', type: 'maid', i: 1, at: [33, 8], facing: 180 },
      { id: 'drunk1', type: 'drunk', at: [22, 21], facing: 90 }, { id: 'drunk2', type: 'drunk', at: [31, 26], facing: 270, route: [[31, 26, 3], [33, 26, 4]] }],
    bells: [[27, 22]], barracks: [[25, 17]],
    pickups: [{ id: 'ledger', kind: 'story', at: [42, 5], z: 48, text: 'The letter with the black iron seal' }, { id: 'onigiri1', kind: 'tool', tool: 'riceball', n: 1, at: [22, 27] }, { id: 'stars1', kind: 'tool', tool: 'shuriken', n: 5, at: [44, 37] }],
    boss: { id: 'gonroku', at: [11, 7], facing: 0, arena: [3, 3, 20, 11], open: [[11, 12, 1, 1, ':'], [30, 11, 1, 1, 'd']] },
    objectives: [
      { id: 'kill', type: 'assassinate', target: 'kanemori', text: 'Silence Magistrate Kanemori' },
      { id: 'ledger', type: 'retrieve', pickup: 'ledger', optional: true, text: 'Find what he hides (his storehouse roof)' },
      { id: 'boss', type: 'defeat', boss: 'gonroku', secret: true, text: 'Defeat Gonroku the Iron Ox' },
      { id: 'escape', type: 'reach', after: ['kill', 'boss'], text: 'Escape by the canal boat (west)' }],
    triggers: [
      { id: 's', when: 'time:.8', do: [['say', 'hero', 'm1_start']] },
      { id: 'in', rect: [3, 3, 45, 15], do: [['checkpoint'], ['say', 'granny', 'm1_inside']] },
      { id: 'k', when: 'objective:kill', do: [['say', 'hero', 'm1_kill'], ['close', 30, 11, 1, 1, 'H'], ['objective', 'boss', 'show'], ['boss', 'gonroku'], ['toast', 'The doors slam shut', 'The only way out is the court.']] },
      { id: 'c', rect: [3, 3, 20, 11], do: [['objective', 'boss', 'show'], ['boss', 'gonroku']] },
      { id: 'a', when: 'alert', do: [['cower', 'kanemori', 6, 5]] },
      { id: 'cornered', at: [6, 5], r: 3, when: 'boss:gonroku', do: [['say', 'kanemori', 'kanemori_cornered']] },
      { id: 'l', when: 'pickup:ledger', do: [['say', 'hero', 'm1_ledger']] },
      { id: 'b', when: 'boss:gonroku', do: [['say', 'hero', 'm1_escape']] }],
    timer: null });
})();
