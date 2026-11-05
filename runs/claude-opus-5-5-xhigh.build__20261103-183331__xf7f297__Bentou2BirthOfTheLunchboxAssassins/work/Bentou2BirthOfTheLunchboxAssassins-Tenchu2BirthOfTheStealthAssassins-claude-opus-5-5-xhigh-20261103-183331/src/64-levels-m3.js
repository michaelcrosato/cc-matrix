/* ---- MISSION 3, "Moon over Kokaku": the festival night of the moon-viewing. Swim the outer moat, hook the stone wall,
 * find the poisoned flask in the tea pavilion of the festival garden before the moon is high (12:00), unmask the three
 * Red Lanterns among the servants, then climb the keep's three tiers to Kurogane and his oni mask under the moon ---- */
(() => {
  const L = LG(64, 56);
  L.rect(1, 1, 62, 54, '~');                                                    // the outer moat
  L.frame(3, 3, 60, 52, '+'); L.frame(4, 4, 59, 51, '#');                       // the stone berm, the ishigaki wall
  L.rect(5, 5, 58, 50, ':');
  L.rect(5, 5, 6, 6, 'T'); L.rect(57, 5, 58, 6, 'T'); L.rect(5, 49, 6, 50, 'T'); L.rect(57, 49, 58, 50, 'T');
  // the second bailey: the festival garden
  L.rect(5, 34, 58, 50, ','); L.rect(7, 46, 56, 47, '+'); L.rect(30, 34, 33, 50, '+'); L.rect(22, 36, 56, 37, '+');
  L.frame(12, 38, 21, 45, 'H'); L.rect(13, 39, 20, 44, '_'); L.set(16, 45, 'd'); L.set(21, 41, 'd');   // the tea pavilion
  L.rect(40, 41, 45, 44, 'D'); L.rect(50, 39, 54, 42, 'S');
  L.rect(5, 33, 58, 33, 'W'); L.rect(31, 33, 32, 33, 'd');                      // the inner wall and its gate
  // the honmaru: the keep's three tiers, the barracks, the bell
  L.rect(12, 10, 27, 25, 'G'); L.rect(14, 12, 25, 23, 'K'); L.rect(16, 14, 23, 21, 'M');
  L.rect(38, 9, 45, 13, 'B'); L.rect(48, 18, 53, 22, 'A'); L.rect(36, 26, 40, 29, 'C');
  L.rect(30, 8, 33, 31, '+'); L.rect(7, 27, 28, 28, '+');
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'm3', { id: 'm3', name: 'Moon over Kokaku', size: [64, 56], time: 'festival', faction: 'kokaku', rows: L.rows(), music: 'm3', weather: 'maple', par: 960, bigMoon: true,
    zones: [{ id: 'moat', rect: [1, 1, 62, 54], name: 'The outer moat' }, { id: 'bailey', rect: [5, 34, 58, 50], name: 'The festival garden' }, { id: 'pavilion', rect: [12, 38, 21, 45], name: 'The tea pavilion' },
      { id: 'honmaru', rect: [5, 5, 58, 32], name: 'The honmaru' }, { id: 'keep', rect: [12, 10, 27, 25], name: 'Kokaku keep' }],
    lights: [{ at: [26, 37], kind: 'lanternString', r: 72 }, { at: [36, 37], kind: 'lanternString', r: 72 }, { at: [46, 37], kind: 'lanternString', r: 72 }, { at: [26, 47], kind: 'lanternString', r: 72 }, { at: [40, 47], kind: 'lanternString', r: 72 },
      { at: [14, 40], kind: 'paperLantern', r: 60 }, { at: [19, 43], kind: 'paperLantern', r: 60 }, { at: [10, 47], kind: 'paperLantern' }, { at: [52, 47], kind: 'paperLantern' }, { at: [35, 42], kind: 'none', z: 22, r: 60 },
      { at: [31, 32], kind: 'torch', r: 72 }, { at: [34, 32], kind: 'torch', r: 72 }, { at: [44, 15], kind: 'paperLantern' }, { at: [19, 27], kind: 'torch', r: 70 }, { at: [29, 18], kind: 'stoneLantern' }, { at: [9, 18], kind: 'stoneLantern' },
      { at: [50, 25], kind: 'stoneLantern' }, { at: [6, 6], kind: 'none', z: 86, r: 70, color: '#ffb060' }, { at: [58, 6], kind: 'none', z: 86, r: 70, color: '#ffb060' }, { at: [20, 18], kind: 'moonpool', z: 175, r: 80, i: .5 }],
    props: [P('yatai', 30, 40, { facing: 1.57 }), P('yatai', 40, 39, { facing: 1.57 }), P('yatai', 48, 45, { facing: -1.57 }), P('lanternString', 26, 37), P('lanternString', 36, 37), P('lanternString', 46, 37), P('lanternString', 26, 47), P('lanternString', 40, 47),
      P('sakeFlask', 14, 40), P('kotatsu', 17, 41), P('folding', 17, 39), P('taiko', 35, 44), P('maple', 8, 36), P('maple', 24, 42), P('maple', 55, 36), P('maple', 9, 49), P('maple', 46, 49), P('bonsaiPine', 28, 44), P('steppingStones', 24, 39),
      P('nobori', 22, 35, { color: '#2a3a6a' }), P('nobori', 56, 44, { color: '#c8342a' }), P('nobori', 7, 44, { color: '#2a3a6a' }), P('sakeBarrel', 33, 41), P('sakeBarrel', 34, 41), P('riceBale', 42, 38), P('torii', 52, 44, { facing: 1.57 }),
      P('hansho', 44, 14), P('weaponRack', 42, 15), P('weaponRack', 46, 15), P('shachihoko', 16, 14, { z: 160 }), P('shachihoko', 23, 21, { z: 160 }), P('maple', 9, 9), P('maple', 54, 9), P('bonsaiPine', 9, 28), P('stoneLantern', 30, 25)],
    anchors: [],
    hero: { at: [22, 53], facing: 270 }, exit: null,
    npcs: [{ id: 'takanori', rig: 'takanori', at: [17, 42], facing: 270 }],
    guards: [
      { id: 'bpat1', type: 'ashigaru', at: [8, 38], mode: 'patrol', lantern: true, route: [[8, 38, 2], [28, 38, 1], [28, 49, 1], [8, 49, 2]] },
      { id: 'bpat2', type: 'ashigaru', at: [36, 49], mode: 'patrol', route: [[36, 49, 1], [56, 49, 2], [56, 35, 1], [36, 35, 1]] },
      { id: 'gatesam', type: 'samurai', at: [31, 35], facing: 90, mode: 'post' }, { id: 'bhound', type: 'hound', at: [44, 46], mode: 'patrol', route: [[44, 46, 1], [52, 46, 1]], loop: false },
      { id: 'tower1', type: 'archer', at: [5, 49], facing: 315, mode: 'post' }, { id: 'tower2', type: 'archer', at: [57, 5], facing: 135, mode: 'post' },
      { id: 'gsam', type: 'samurai', at: [12, 10], z: 64, mode: 'patrol', route: [[12, 10, 1], [27, 10, 1], [27, 25, 1], [12, 25, 1]] },
      { id: 'gninja', type: 'ninja', at: [27, 18], z: 64, mode: 'post', facing: 0 },
      { id: 'ksam', type: 'samurai', at: [14, 12], z: 112, mode: 'patrol', route: [[14, 12, 1], [25, 12, 1], [25, 23, 1], [14, 23, 1]] },
      { id: 'karcher1', type: 'archer', at: [25, 23], z: 112, facing: 45, mode: 'post' }, { id: 'karcher2', type: 'archer', at: [14, 12], z: 112, facing: 225, mode: 'post' },
      { id: 'doorsam', type: 'samurai', at: [19, 27], facing: 90, mode: 'post' }, { id: 'hsam1', type: 'samurai', at: [34, 20], mode: 'patrol', route: [[34, 20, 1], [56, 20, 1], [56, 30, 1], [34, 30, 1]] },
      { id: 'hsam2', type: 'samurai', at: [7, 8], mode: 'patrol', route: [[7, 8, 1], [29, 8, 2], [29, 30, 1], [7, 30, 2]] },
      { id: 'hash1', type: 'ashigaru', at: [44, 15], facing: 90, mode: 'post' }, { id: 'hash2', type: 'ashigaru', at: [9, 12], mode: 'patrol', lantern: true, route: [[9, 12, 2], [9, 30, 2]], loop: false },
      { id: 'hash3', type: 'ashigaru', at: [48, 8], mode: 'patrol', route: [[48, 8, 1], [56, 8, 1], [56, 16, 1]], loop: false }, { id: 'hash4', type: 'ashigaru', at: [36, 31], facing: 270, mode: 'chat', partner: 'hash5' },
      { id: 'hash5', type: 'ashigaru', at: [38, 31], facing: 90, mode: 'chat', partner: 'hash4' }, { id: 'bninja', type: 'ninja', at: [41, 11], z: 64, mode: 'post', facing: 180 },
      { id: 'hhound', type: 'hound', at: [40, 24], mode: 'patrol', route: [[40, 24, 1], [54, 24, 1]], loop: false }],
    civilians: [
      { id: 'n1', type: 'noble', i: 0, at: [25, 40], facing: 0 }, { id: 'n2', type: 'noble', i: 1, at: [27, 41], facing: 180 }, { id: 'n3', type: 'noble', i: 2, at: [37, 45], facing: 270 },
      { id: 's1', type: 'servant', at: [33, 39], route: [[33, 39, 3], [42, 39, 3]] }, { id: 's2', type: 'servant', at: [50, 47], route: [[50, 47, 3], [38, 47, 3]] }, { id: 'n4', type: 'noble', i: 3, at: [10, 44], facing: 0 },
      { id: 'dis1', type: 'servant', at: [22, 46], disguised: true, route: [[22, 46, 2], [29, 46, 2]] }, { id: 'dis2', type: 'servant', at: [46, 40], disguised: true, route: [[46, 40, 3], [46, 44, 2]] },
      { id: 'dis3', type: 'servant', at: [12, 47], disguised: true, route: [[12, 47, 2], [12, 36, 2]] }],
    bells: [[44, 14]], barracks: [[41, 14]],
    pickups: [{ id: 'onigiri3', kind: 'tool', tool: 'riceball', n: 1, at: [54, 48] }, { id: 'fc3', kind: 'tool', tool: 'firecracker', n: 2, at: [8, 30] }, { id: 'smoke3', kind: 'tool', tool: 'smoke', n: 1, at: [26, 26], z: 64 }],
    interact: [{ id: 'sake', at: [14, 40], hold: 1, text: 'Swap the poisoned sake', do: [['stopTimer']], sfx: 'pickup' }],
    boss: { id: 'kurogane', at: [20, 18], z: 160, facing: 90, arena: [16, 14, 23, 21] },
    objectives: [
      { id: 'sake', type: 'stopTimer', interact: 'sake', text: 'Find the poisoned sake before the moon is high' },
      { id: 'climb', type: 'reach', zone: [16, 14, 23, 21], z: 160, after: ['sake'], text: 'Climb the keep' },
      { id: 'boss', type: 'defeat', boss: 'kurogane', after: ['climb'], text: 'Defeat Chamberlain Kurogane' },
      { id: 'dis', type: 'killAll', targets: ['dis1', 'dis2', 'dis3'], optional: true, text: 'Silence the 3 disguised Red Lanterns (Ki Focus shows them)' }],
    triggers: [
      { id: 's', when: 'time:.8', do: [['say', 'hero', 'm3_start'], ['tutorial', 'The moon rises', 'The moon timer (top right) runs to 12:00. Find the poisoned flask in the tea pavilion before it is high.']] },
      { id: 'b', rect: [5, 34, 58, 50], do: [['checkpoint'], ['say', 'granny', 'm3_bailey'], ['tutorial', 'Ki Focus', 'Hold {a:focus}: your sense reaches further, sight cones show through walls, and disguised ninja glow red.']] },
      { id: 'sw', when: 'objective:sake', do: [['checkpoint'], ['say', 'granny', 'm3_swapped']] },
      { id: 'kp', rect: [12, 10, 27, 25], z: 64, do: [['say', 'granny', 'm3_keep']] },
      { id: 'k2', rect: [14, 12, 25, 23], z: 112, do: [['checkpoint']] },
      { id: 'top', rect: [16, 14, 23, 21], z: 160, when: 'objective:sake', do: [['checkpoint'], ['boss', 'kurogane']] }],
    timer: { seconds: 720, fail: 'The lord raises his cup... The Red Lanterns have won.', stopOn: 'objective:sake' } });
})();
