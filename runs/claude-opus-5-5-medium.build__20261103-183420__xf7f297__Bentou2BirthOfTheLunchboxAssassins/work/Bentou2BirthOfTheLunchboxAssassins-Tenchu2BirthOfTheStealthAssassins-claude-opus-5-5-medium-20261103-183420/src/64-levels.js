/* 64-levels: the maps. Rows are painted from a short list of operations (rect fill, box outline, single cells) into the
 * level format the Workshop shares; then the entities, lights, props, triggers and objectives as data. */
B.paintRows = (w, h, base, ops) => {
  const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill(base));
  const S = (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = c; };
  for (const [k, a, b, c, d, ch] of ops) {
    if (k === 'rect') for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) S(x, y, ch);
    else if (k === 'box') for (let y = b; y <= d; y++) for (let x = a; x <= c; x++) { if (x === a || x === c || y === b || y === d) S(x, y, ch); }
    else if (k === 'set') S(a, b, c);
  }
  return g.map(r => r.join(''));
};
const R = B.paintRows;
const lantern = (x, y, o = {}) => Object.assign({ at: [x, y], z: 22, r: 60, i: .9, color: '#ffb060', kind: 'stoneLantern' }, o);
const paper = (x, y, o = {}) => Object.assign({ at: [x, y], z: 26, r: 56, i: .85, color: '#ff9a40', kind: 'chochin' }, o);

/* ---- Mission 0: The Trial of the Second Tier (training; dusk) ---- */
def('level', 'training', { name: 'The Trial of the Second Tier', size: [40, 28], time: 'dusk', faction: 'trial', music: 'training', weather: 'petals', par: 420,
  rows: R(40, 28, '.', [['box', 0, 0, 39, 27, '#'], ['rect', 1, 1, 12, 4, 'A'], ['rect', 2, 5, 10, 6, '='], ['rect', 16, 2, 23, 2, 'F'], ['rect', 24, 1, 38, 7, '"'], ['rect', 4, 8, 7, 9, 'P'],
    ['rect', 18, 8, 18, 10, 'W'], ['rect', 22, 8, 22, 10, 'W'], ['rect', 32, 8, 37, 13, 'C'], ['rect', 14, 12, 24, 15, '~'], ['rect', 3, 13, 8, 14, ','], ['rect', 4, 19, 20, 25, ':'], ['rect', 26, 16, 29, 16, '+'], ['rect', 1, 26, 38, 26, '.']]),
  zones: [{ id: 'shop', rect: [1, 1, 12, 6], name: 'The Jubako-ya' }, { id: 'grove', rect: [24, 1, 38, 7], name: 'Bamboo Grove' }, { id: 'pond', rect: [13, 11, 25, 16], name: 'Koi Pond' }, { id: 'ring', rect: [4, 19, 20, 25], name: 'Sparring Ring' }, { id: 'kura', rect: [30, 8, 38, 14], name: 'The Storehouse' }],
  lights: [paper(11, 6), paper(2, 6), lantern(13, 11), lantern(26, 12), lantern(30, 15), lantern(4, 18), lantern(21, 18), lantern(21, 26), lantern(26, 4, { i: .5 }), paper(38, 15)],
  props: [['jubako', 3.5, 5.6], ['jubako', 9.2, 5.5, { facing: .4 }], ['sakeBarrel', 1.6, 7.4], ['waterBarrel', 12.4, 6], ['persimmon', 27, 17], ['dummy', 30, 23], ['dummy', 32.5, 23.4], ['weaponRack', 22.5, 22, { facing: Math.PI }],
    ['riceBale', 31, 15.4], ['riceBale', 31.8, 16.2], ['steppingStone', 13, 16.5], ['steppingStone', 25.5, 16.8], ['mato', 36, 21], ['well', 14, 8.5], ['taiko', 2.5, 22], ['strawMat', 10, 21.6]],
  anchors: [[27, 17, 46]],
  hero: { at: [5, 6], facing: 90 },
  npcs: [{ id: 'granny', rig: 'granny', at: [7, 5], facing: 90, label: 'Report to Granny', line: 'tr_end', speaker: 'granny', when: 'spar', flag: 'trialDone' }],
  guards: [
    { id: 'ume', type: 'disciple', mark: true, color: '#3a6a3a', at: [28, 3], lantern: true, mode: 'patrol', route: [[28, 3, 1.5, 0], [35, 3, 1, 90], [35, 6, 1.5, 180], [28, 6, 1, 270]] },
    { id: 'kiku', type: 'disciple', mark: true, color: '#3a4a7a', at: [25.2, 13.5], facing: 0, mode: 'post' },
    { id: 'masa', type: 'disciple', mark: true, color: '#6a4a2a', at: [31, 11], facing: 90, mode: 'post' },
    { id: 'daikon', type: 'ashigaru', mark: true, harmless: true, name: 'Big Daikon', faction: 'trial', at: [35, 17], facing: 180, mode: 'post' },
    { id: 'bearer1', type: 'disciple', mark: true, color: '#7a3a3a', at: [6, 18], facing: 90, lantern: true, mode: 'post' },
    { id: 'bearer2', type: 'disciple', mark: true, color: '#7a3a3a', at: [18, 18], facing: 90, lantern: true, mode: 'post' }],
  boss: { id: 'ittetsu', at: [12, 22], intro: ['ittetsu', 'itt_intro'], defeat: ['ittetsu', 'itt_defeat'], close: [] },
  pickups: [{ kind: 'tool', tool: 'firecracker', n: 2, at: [26, 10] }, { kind: 'tool', tool: 'riceball', n: 1, at: [16, 10] }],
  objectives: [
    { id: 'ume', type: 'assassinate', target: 'ume', text: 'Take Ume\'s token: a Silent Mark from behind', say: ['ume', 'ume_marked'] },
    { id: 'kiku', type: 'assassinate', target: 'kiku', text: 'Mark Kiku from the pond: dive, then strike from the water', hidden: true, after: ['ume'] },
    { id: 'masa', type: 'assassinate', target: 'masa', text: 'Grapple onto the storehouse; mark Masa from above', hidden: true, after: ['kiku'] },
    { id: 'daikon', type: 'assassinate', target: 'daikon', text: 'Lure Big Daikon with a firecracker, feed him rice, mark him', hidden: true, after: ['masa'] },
    { id: 'spar', type: 'defeat', boss: 'ittetsu', text: 'Spar with Brother Ittetsu at the gravel ring', hidden: true, after: ['daikon'] },
    { id: 'report', type: 'flag', flag: 'trialDone', text: 'Report to Granny on the porch', hidden: true, after: ['spar'] }],
  triggers: [
    { id: 't0', when: 'time:.5', do: [['say', 'granny', 'tr_move'], ['tutorial', 'Moving', '{a:jump} jump, climb, vault.  {a:crouch} crouch to sneak.  {a:sprint} sprint (loud).  A light tilt walks silently.']] },
    { id: 't1', rect: [13, 1, 23, 7], do: [['say', 'granny', 'tr_ki'], ['tutorial', 'The Ki Gauge', 'The number bottom-left is how near the closest guard is. Its color is how aware they are. Hold {a:focus} to sense further.']] },
    { id: 't2', rect: [24, 1, 38, 7], do: [['say', 'granny', 'tr_mark'], ['tutorial', 'Silent Cuts', 'Crouch in the bamboo, get behind the disciple, and press {a:attack} when the prompt shows.']] },
    { id: 't3', when: 'objective:ume', do: [['checkpoint'], ['say', 'granny', 'tr_swim'], ['tutorial', 'Swimming', 'In deep water press {a:crouch} to dive: unseen, but mind your breath. Strike from below with {a:attack}.']] },
    { id: 't4', when: 'objective:kiku', do: [['checkpoint'], ['say', 'granny', 'tr_roof'], ['tutorial', 'The Grappling Hook', 'Tap {a:grapple} to fire at the highlighted roof edge. Hold it to aim (time slows).']] },
    { id: 't4b', rect: [30, 8, 38, 13], z: 40, do: [['say', 'granny', 'tr_above']] },
    { id: 't5', when: 'objective:masa', do: [['checkpoint'], ['say', 'granny', 'tr_tools'], ['tutorial', 'The Bento', 'Pick a tool with {a:toolPrev} {a:toolNext} (wheel or 1-8), use it with {a:useTool}. A firecracker pulls a guard; a rice ball left out feeds him.']] },
    { id: 't5b', when: 'flag:trick', do: [['say', 'granny', 'tr_daikon']] },
    { id: 't6', when: 'objective:daikon', do: [['checkpoint'], ['say', 'granny', 'tr_spar']] },
    { id: 't7', rect: [4, 17, 20, 18], when: 'objective:daikon', do: [['say', 'granny', 'tr_smoke'], ['tutorial', 'Smoke and steel', 'Spotted? A smoke bomb ({a:useTool}) breaks their sight. In a fight: {a:block} blocks, a timed {a:block} parries, {a:block}+{a:jump} rolls.']] },
    { id: 't8', rect: [6, 19, 18, 25], when: 'objective:daikon', do: [['boss', 'ittetsu']] },
    { id: 't9', when: 'objective:spar', do: [['checkpoint'], ['say', 'granny', 'tr_return']] }]
});

/* ---- Mission 1: Rice and Ash (castle town at night; Kanemori's household) ---- */
def('level', 'm1', { name: 'Rice and Ash', size: [56, 48], time: 'night', faction: 'kanemori', music: 'm1', weather: 'petals', par: 720,
  rows: R(56, 48, '.', [['box', 0, 0, 55, 47, '#'],
    ['box', 2, 2, 45, 15, 'W'], ['rect', 3, 3, 19, 14, ':'], ['rect', 20, 3, 20, 14, 'W'], ['set', 20, 7, ':'], ['set', 20, 8, ':'],
    ['box', 22, 4, 38, 10, 'H'], ['rect', 23, 5, 37, 9, '_'], ['set', 22, 7, 'd'], ['set', 30, 10, 'd'],
    ['rect', 24, 12, 28, 13, '~'], ['rect', 31, 12, 34, 14, ','], ['rect', 36, 11, 39, 13, 'C'], ['rect', 21, 11, 44, 11, '+'], ['set', 24, 15, '.'], ['set', 25, 15, '.'], ['set', 45, 9, '.'],
    ['rect', 47, 4, 48, 5, 'T'],
    ['rect', 3, 18, 6, 21, 'A'], ['rect', 9, 18, 12, 22, 'B'], ['rect', 16, 18, 19, 21, 'D'], ['rect', 28, 18, 31, 22, 'B'], ['rect', 35, 18, 38, 21, 'A'], ['rect', 42, 18, 45, 21, 'D'], ['rect', 48, 18, 52, 22, 'A'],
    ['rect', 20, 24, 34, 28, '+'],
    ['rect', 3, 31, 6, 35, 'B'], ['rect', 10, 31, 14, 34, 'A'], ['rect', 18, 31, 21, 35, 'D'], ['rect', 25, 31, 28, 34, 'A'], ['rect', 32, 31, 35, 35, 'B'], ['rect', 39, 31, 42, 34, 'A'], ['rect', 46, 31, 49, 35, 'C'],
    ['rect', 23, 36, 26, 38, ','], ['rect', 8, 37, 11, 38, ','], ['rect', 44, 37, 52, 39, ':'],
    ['rect', 1, 41, 54, 41, '='], ['rect', 1, 42, 54, 45, '~'], ['rect', 1, 46, 54, 46, '=']]),
  zones: [{ id: 'mansion', rect: [21, 3, 45, 14], name: 'Kanemori Mansion' }, { id: 'court', rect: [3, 3, 19, 14], name: 'The Inner Court' }, { id: 'market', rect: [1, 16, 54, 29], name: 'Market Square' }, { id: 'alleys', rect: [1, 30, 54, 40], name: 'The Rice Alleys' }, { id: 'canal', rect: [1, 41, 54, 46], name: 'The Canal' }],
  lights: [lantern(23, 12), lantern(29, 12), lantern(41, 12), lantern(43, 6), paper(30, 11.2), paper(22.5, 6.5), paper(23, 16.2), paper(26, 16.2), lantern(8, 4), lantern(17, 13), paper(14, 23), paper(27, 23.2), paper(40, 22.6), paper(47, 23),
    { at: [24, 25], z: 18, r: 70, i: 1, color: '#ffb060', kind: null }, paper(33, 29), paper(16, 36), paper(30, 36), paper(44, 36), lantern(52, 40), lantern(4, 40), paper(48, 6.6, { z: 84, r: 70 })],
  props: [['yatai', 22, 26], ['yatai', 32, 26, { facing: Math.PI }], ['sakeBarrel', 21, 24.5], ['sakeBarrel', 34.5, 24.5], ['riceBale', 45, 38], ['riceBale', 46, 38.6], ['riceBale', 50, 38.2], ['waterBarrel', 7.5, 30], ['well', 37, 27],
    ['boat', 52, 43.5], ['boat', 3, 43.5], ['torii', 27, 23.3], ['nobori', 19.5, 16.8], ['nobori', 30, 16.8], ['bambooClump', 33, 13], ['weaponRack', 8, 13.4], ['taiko', 17, 4], ['strawMat', 29, 7], ['strawMat', 33, 7], ['jubako', 31, 7.4], ['moorPost', 10, 41.2], ['moorPost', 40, 41.2]],
  anchors: [],
  hero: { at: [52, 41], facing: 180 }, exit: { at: [3, 41], r: 1.5 },
  bells: [[24, 22.6]], barracks: [[24, 14]],
  guards: [
    { id: 'gate1', type: 'ashigaru', at: [23, 16.5], facing: 90, mode: 'post', lantern: true }, { id: 'gate2', type: 'ashigaru', at: [26.5, 16.5], facing: 90, mode: 'post' },
    { id: 'sam1', type: 'samurai', at: [14, 24], mode: 'patrol', partner: 'sam2', route: [[14, 24, 1], [38, 24, 2, 0], [38, 29, 1], [14, 29, 2, 180]] },
    { id: 'sam2', type: 'samurai', at: [15, 25], mode: 'patrol', route: [[15, 25, 1], [37, 25, 2, 0], [37, 28, 1], [15, 28, 2, 180]] },
    { id: 'ash1', type: 'ashigaru', at: [8, 36], mode: 'patrol', lantern: true, route: [[8, 36, 2, 90], [22, 36, 1], [22, 39, 1], [8, 39, 2]] },
    { id: 'ash2', type: 'ashigaru', at: [30, 37], mode: 'patrol', route: [[30, 37, 2], [44, 36, 1, 0], [30, 39, 2]] },
    { id: 'hound', type: 'hound', at: [40, 37], mode: 'patrol', route: [[36, 37, 1], [43, 38, 2], [40, 39, 1]] },
    { id: 'ash3', type: 'ashigaru', at: [44, 37.5], facing: 0, mode: 'post' },
    { id: 'ash4', type: 'ashigaru', at: [24, 13], mode: 'patrol', lantern: true, route: [[24, 13, 1], [43, 13, 2, 0], [43, 6, 1], [40, 12, 1]] },
    { id: 'ash5', type: 'ashigaru', at: [42, 4], facing: 180, mode: 'post' },
    { id: 'ash6', type: 'ashigaru', at: [27, 11.4], mode: 'chat', partner: 'ash7', facing: 0 }, { id: 'ash7', type: 'ashigaru', at: [28.6, 11.4], mode: 'chat', partner: 'ash6', facing: 180 },
    { id: 'sam3', type: 'samurai', at: [34, 8], facing: 180, mode: 'post' },
    { id: 'sam4', type: 'samurai', at: [10, 8], mode: 'patrol', route: [[5, 5, 2], [17, 5, 1], [17, 12, 2], [5, 12, 1]] },
    { id: 'ash8', type: 'ashigaru', at: [50, 28], mode: 'sleep', facing: 90 },
    { id: 'ash9', type: 'ashigaru', at: [2.5, 28], facing: 0, mode: 'eat' },
    { id: 'archer', type: 'archer', at: [47.5, 4.5], z: 80, facing: 180, mode: 'post', lantern: true }],
  civilians: [{ id: 'kanemori', type: 'target', kind: 'kanemori', target: true, name: 'Magistrate Kanemori', at: [30, 6], facing: 90, mode: 'post', voice: 'kanemori', rig: 'kanemori' },
    { id: 'maid1', kind: 'maid', at: [27, 7], facing: 0, mode: 'post' }, { id: 'maid2', kind: 'maid', at: [34, 6], mode: 'patrol', route: [[34, 6, 2], [25, 8, 2]] },
    { id: 'drunk1', kind: 'drunk', at: [23, 27], facing: 0, mode: 'post' }, { id: 'drunk2', kind: 'drunk', at: [33, 27.5], mode: 'patrol', route: [[33, 27.5, 3], [29, 26, 2]] }],
  boss: { id: 'gonroku', at: [10, 8], intro: ['gonroku', 'gon_intro'], defeat: ['gonroku', 'gon_defeat'], close: [[20, 7, 1, 2, '#', ':']] },
  pickups: [{ id: 'ledger', kind: 'story', name: 'the iron-sealed letter', text: 'Sealed in black iron', at: [37.5, 12], z: 48 }, { kind: 'tool', tool: 'shuriken', n: 4, at: [12, 37] }, { kind: 'tool', tool: 'riceball', n: 2, at: [40, 27] }],
  objectives: [
    { id: 'kill', type: 'assassinate', target: 'kanemori', text: 'Silence Magistrate Kanemori at his feast', say: ['hero', 'm1_after'] },
    { id: 'letter', type: 'retrieve', pickup: 'ledger', optional: true, text: 'Optional: find what he hides (the storehouse roof)', say: ['hero', 'm1_letter'] },
    { id: 'boss', type: 'defeat', boss: 'gonroku', text: 'Defeat Gonroku in the inner court', hidden: true, after: ['kill'] },
    { id: 'escape', type: 'reach', exit: true, text: 'Escape by the canal boat at the west end', hidden: true, after: ['kill', 'boss'] }],
  triggers: [
    { id: 'arrive', when: 'time:.6', do: [['say', 'granny', 'm1_arrive']] },
    { id: 'inside', rect: [21, 3, 44, 14], do: [['checkpoint']] },
    { id: 'killed', when: 'objective:kill', do: [['close', 30, 10, 1, 1, 'H'], ['toast', 'The south door is barred', 'The only way out is the court to the west']] },
    { id: 'court', rect: [3, 3, 18, 14], do: [['boss', 'gonroku']] }],
  timer: null
});

/* ---- Mission 2: The Fort at Kiri Lake (rain and lightning; Red Lantern hold) ---- */
def('level', 'm2', { name: 'The Fort at Kiri Lake', size: [60, 52], time: 'rain', faction: 'redlantern', music: 'm2', weather: 'rain', par: 900,
  rows: R(60, 52, ',', [['box', 0, 0, 59, 51, '#'], ['rect', 13, 1, 30, 50, '~'], ['rect', 2, 3, 5, 6, 'A'], ['rect', 2, 30, 5, 33, 'A'], ['rect', 7, 42, 10, 45, 'A'], ['rect', 6, 14, 11, 20, '.'], ['rect', 1, 22, 12, 22, '-'],
    ['box', 31, 2, 56, 46, '#'], ['rect', 32, 3, 55, 45, ':'], ['rect', 32, 3, 33, 4, 'T'], ['rect', 54, 3, 55, 4, 'T'], ['rect', 32, 43, 33, 44, 'T'], ['rect', 54, 43, 55, 44, 'T'],
    ['rect', 36, 6, 42, 12, 'B'], ['rect', 46, 6, 50, 10, 'C'], ['rect', 37, 18, 41, 22, 'C'], ['rect', 46, 24, 52, 29, 'B'], ['rect', 35, 34, 39, 37, 'A'],
    ['rect', 36, 41, 52, 41, '='], ['rect', 35, 42, 53, 45, '~'], ['rect', 18, 31, 30, 33, '='], ['rect', 28, 26, 30, 30, 'R'], ['set', 31, 32, '#'],
    ['rect', 52, 13, 54, 15, '+'], ['rect', 34, 30, 44, 30, '+']]),
  zones: [{ id: 'reeds', rect: [1, 1, 12, 50], name: 'The Reed Shore' }, { id: 'lake', rect: [13, 1, 30, 50], name: 'Kiri Lake' }, { id: 'fort', rect: [32, 3, 55, 45], name: 'Red Lantern Fort' }, { id: 'dock', rect: [35, 40, 53, 45], name: 'The Rice Dock' }],
  lights: [lantern(34, 14), lantern(44, 14), lantern(53, 18), lantern(36, 30), lantern(48, 32), lantern(44, 39), paper(36, 40.4), paper(52, 40.4), paper(32.5, 3.5, { z: 84, r: 80 }), paper(54.5, 3.5, { z: 84, r: 80 }), paper(32.5, 43.5, { z: 84, r: 80 }), paper(54.5, 43.5, { z: 84, r: 80 }),
    paper(19, 32, { z: 16 }), paper(29, 32, { z: 16 }), paper(4, 7.2), paper(9, 17)],
  props: [['boat', 9, 24], ['cage', 53, 14, { solid: false }], ['lever', 36, 32.2], ['moorPost', 39, 41.4], ['moorPost', 45, 41.4], ['moorPost', 51, 41.4], ['bargeRice', 40, 43.5], ['bargeRice', 46, 43.5], ['bargeRice', 51, 43.5],
    ['riceBale', 44, 20], ['riceBale', 45, 20.8], ['sakeBarrel', 34, 26], ['sakeBarrel', 35, 26.6], ['weaponRack', 43, 13.4], ['nobori', 44, 4], ['nobori', 33.6, 15], ['strawMat', 8, 15], ['waterBarrel', 6.6, 13.2]],
  anchors: [],
  hero: { at: [8, 18], facing: 0 }, exit: { at: [9, 22], r: 1.8 },
  bells: [[44, 16]], barracks: [[39, 13.5], [49, 30]],
  guards: [
    { id: 'arc1', type: 'archer', at: [32.5, 3.5], z: 80, facing: 180, mode: 'post', lantern: true }, { id: 'arc2', type: 'archer', at: [32.5, 43.5], z: 80, facing: 180, mode: 'post', lantern: true },
    { id: 'arc3', type: 'archer', at: [54.5, 3.5], z: 80, facing: 135, mode: 'post' },
    { id: 'nin1', type: 'ninja', at: [48, 8], z: 48, mode: 'patrol', route: [[46.5, 6.5, 2], [49.5, 6.5, 1], [49.5, 9.5, 2], [46.5, 9.5, 1]] },
    { id: 'nin2', type: 'ninja', at: [39, 9], z: 64, mode: 'post', facing: 90 }, { id: 'nin3', type: 'ninja', at: [49, 26], z: 64, mode: 'post', facing: 180 },
    { id: 'sam1', type: 'samurai', at: [44, 17], mode: 'post', facing: 180 }, { id: 'sam2', type: 'samurai', at: [52, 17], mode: 'patrol', route: [[52, 17, 2], [52, 22, 1], [45, 22, 2]] },
    { id: 'sam3', type: 'samurai', at: [42, 39], mode: 'patrol', route: [[36, 39, 2, 90], [52, 39, 2, 90]] },
    { id: 'ash1', type: 'ashigaru', at: [35, 25], mode: 'patrol', lantern: true, route: [[34, 15, 1], [34, 38, 2], [44, 38, 1], [44, 25, 1]] },
    { id: 'ash2', type: 'ashigaru', at: [53, 32], mode: 'patrol', route: [[53, 32, 2], [53, 40, 1], [47, 36, 2]] },
    { id: 'ash3', type: 'ashigaru', at: [38, 31], facing: 0, mode: 'post' }, { id: 'ash4', type: 'ashigaru', at: [42, 27], mode: 'chat', partner: 'ash5', facing: 0 }, { id: 'ash5', type: 'ashigaru', at: [43.5, 27], mode: 'chat', partner: 'ash4', facing: 180 },
    { id: 'ash6', type: 'ashigaru', at: [50, 12], mode: 'sleep' },
    { id: 'hnd1', type: 'hound', at: [47, 33], mode: 'patrol', route: [[45, 33, 1], [51, 35, 1]] }, { id: 'hnd2', type: 'hound', at: [36, 20], mode: 'patrol', route: [[35, 17, 1], [35, 24, 2]] }],
  escort: { id: 'tobei', at: [53, 14], hp: 60 },
  boss: { id: 'hotaru', at: [21, 32], intro: ['hotaru', 'hot_intro'], defeat: ['hotaru', 'hot_defeat'], close: [] },
  interact: [{ id: 'cage', at: [52, 14], hold: 1.5, text: 'Open the cage', do: [['free'], ['checkpoint']] },
    { id: 'lever', at: [36, 31.4], hold: 1.2, text: 'Open the water gate', do: [['open', 31, 32, 1, 1, '='], ['say', 'granny', 'm2_gate']] },
    { id: 'post1', at: [39, 40.6], hold: 1.5, text: 'Cut the barge loose', count: 'barges', do: [['barges']] }, { id: 'post2', at: [45, 40.6], hold: 1.5, text: 'Cut the barge loose', count: 'barges', do: [['barges']] },
    { id: 'post3', at: [51, 40.6], hold: 1.5, text: 'Cut the barge loose', count: 'barges', do: [['barges']] }],
  pickups: [{ kind: 'tool', tool: 'smoke', n: 1, at: [33, 36] }, { kind: 'tool', tool: 'riceball', n: 2, at: [55, 21] }],
  objectives: [
    { id: 'rescue', type: 'rescue', interact: 'cage', text: 'Rescue Tobei from the bamboo cage (north-east)' },
    { id: 'gate', type: 'interact', interact: 'lever', text: 'Open the water gate (the lever inside the west wall)', hidden: true, after: ['rescue'] },
    { id: 'barges', type: 'interact', flag: 'barges', count: 3, optional: true, text: 'Optional: cut the 3 rice barges loose at the dock' },
    { id: 'hotaru', type: 'defeat', boss: 'hotaru', text: 'Defeat Hotaru on the pier', hidden: true, after: ['gate'] },
    { id: 'escort', type: 'escort', exit: true, text: 'Bring Tobei to the boat in the reeds', hidden: true, after: ['hotaru'] }],
  triggers: [{ id: 'arrive', when: 'time:.6', do: [['say', 'granny', 'm2_arrive']] }, { id: 'inside', rect: [32, 3, 55, 45], do: [['checkpoint']] },
    { id: 'pier', rect: [19, 30, 29, 34], when: 'objective:gate', do: [['boss', 'hotaru']] }],
  timer: null
});

/* ---- Mission 3: Moon over Kokaku (festival night; the keep) ---- */
def('level', 'm3', { name: 'Moon over Kokaku', size: [64, 56], time: 'festival', faction: 'kokaku', music: 'm3', weather: 'maple', par: 960,
  rows: R(64, 56, '~', [['box', 0, 0, 63, 55, '#'], ['box', 3, 3, 58, 50, '#'], ['rect', 4, 4, 57, 20, ','], ['rect', 8, 6, 52, 18, '+'], ['box', 12, 8, 19, 13, 'H'], ['rect', 13, 9, 18, 12, '_'], ['set', 15, 13, 'd'], ['set', 16, 13, 'd'],
    ['rect', 4, 21, 57, 21, 'W'], ['set', 30, 21, '.'], ['set', 31, 21, '.'], ['rect', 4, 22, 57, 49, ':'], ['rect', 10, 26, 25, 41, 'G'], ['rect', 12, 28, 23, 39, 'K'], ['rect', 14, 30, 21, 37, 'M'],
    ['rect', 4, 4, 5, 5, 'T'], ['rect', 56, 4, 57, 5, 'T'], ['rect', 4, 48, 5, 49, 'T'], ['rect', 56, 48, 57, 49, 'T'], ['rect', 36, 26, 41, 31, 'B'], ['rect', 44, 38, 50, 43, 'C'], ['rect', 28, 44, 32, 46, 'P']]),
  zones: [{ id: 'moat', rect: [1, 51, 62, 54], name: 'The Outer Moat' }, { id: 'bailey', rect: [4, 4, 57, 20], name: 'The Festival Garden' }, { id: 'honmaru', rect: [4, 22, 57, 49], name: 'The Honmaru' }, { id: 'keep', rect: [10, 26, 25, 41], name: 'Kokaku Keep' }],
  lights: [paper(9, 7), paper(14, 7), paper(20, 7), paper(26, 7), paper(32, 7), paper(38, 7), paper(44, 7), paper(50, 7), paper(9, 17), paper(22, 17), paper(30, 17), paper(40, 17), paper(50, 17), lantern(24, 12), lantern(36, 12),
    lantern(28, 24), lantern(34, 24), lantern(28, 35), lantern(44, 35), lantern(52, 25), lantern(8, 44), paper(15.5, 13.6), { at: [17.5, 33.5], z: 170, r: 90, i: .7, color: '#ffd8a0', kind: null }, { at: [17.5, 27], z: 118, r: 70, i: .6, color: '#ffb060', kind: null }],
  props: [['yatai', 26, 15], ['yatai', 34, 15, { facing: Math.PI }], ['yatai', 44, 10], ['taiko', 30, 10], ['nobori', 22, 9], ['nobori', 38, 9], ['torii', 30.5, 19.4], ['sakeBarrel', 40, 15], ['sakeBarrel', 41, 15.6], ['bambooClump', 6, 10], ['bambooClump', 55, 12],
    ['strawMat', 14.5, 10.5], ['jubako', 16, 10.2], ['weaponRack', 34, 34], ['riceBale', 46, 36], ['well', 52, 30], ['boat', 20, 53.5]],
  anchors: [],
  hero: { at: [24.5, 52.5], facing: 270 }, exit: null,
  bells: [[45, 32]], barracks: [[38.5, 32.5]],
  guards: [
    { id: 'sam1', type: 'samurai', faction: 'kokaku', at: [30, 23], facing: 90, mode: 'post', lantern: true }, { id: 'sam2', type: 'samurai', faction: 'kokaku', at: [31.5, 19.5], facing: 90, mode: 'post' },
    { id: 'sam3', type: 'samurai', faction: 'kokaku', at: [10.5, 26.5], z: 64, mode: 'patrol', route: [[10.5, 26.5, 1], [24.5, 26.5, 1], [24.5, 40.5, 1], [10.5, 40.5, 1]] },
    { id: 'sam4', type: 'samurai', faction: 'kokaku', at: [12.5, 28.5], z: 112, mode: 'patrol', route: [[12.5, 28.5, 2], [22.5, 28.5, 1], [22.5, 38.5, 2], [12.5, 38.5, 1]] },
    { id: 'sam5', type: 'samurai', faction: 'kokaku', at: [44, 24], mode: 'patrol', route: [[44, 24, 2], [55, 24, 1], [55, 46, 2], [44, 46, 1]] }, { id: 'sam6', type: 'samurai', faction: 'kokaku', at: [8, 14], mode: 'patrol', route: [[8, 14, 2], [8, 6, 2]] },
    { id: 'ash1', type: 'ashigaru', faction: 'kokaku', at: [28, 30], mode: 'patrol', lantern: true, route: [[28, 24, 1], [28, 46, 2], [8, 46, 1], [8, 24, 2]] }, { id: 'ash2', type: 'ashigaru', faction: 'kokaku', at: [48, 34], mode: 'post', facing: 180 },
    { id: 'ash3', type: 'ashigaru', faction: 'kokaku', at: [33, 40], mode: 'chat', partner: 'ash4', facing: 0 }, { id: 'ash4', type: 'ashigaru', faction: 'kokaku', at: [34.5, 40], mode: 'chat', partner: 'ash3', facing: 180 },
    { id: 'ash5', type: 'ashigaru', faction: 'kokaku', at: [52, 18], mode: 'patrol', route: [[52, 18, 2], [52, 6, 2]] }, { id: 'ash6', type: 'ashigaru', faction: 'kokaku', at: [7, 33], mode: 'sleep' },
    { id: 'arc1', type: 'archer', faction: 'kokaku', at: [4.5, 4.5], z: 80, facing: 45, mode: 'post' }, { id: 'arc2', type: 'archer', faction: 'kokaku', at: [56.5, 4.5], z: 80, facing: 135, mode: 'post' },
    { id: 'arc3', type: 'archer', faction: 'kokaku', at: [4.5, 48.5], z: 80, facing: 315, mode: 'post', lantern: true }, { id: 'arc4', type: 'archer', faction: 'kokaku', at: [56.5, 48.5], z: 80, facing: 225, mode: 'post', lantern: true },
    { id: 'nin1', type: 'ninja', faction: 'redlantern', at: [38.5, 28.5], z: 64, mode: 'post', facing: 180 }, { id: 'nin2', type: 'ninja', faction: 'redlantern', at: [46.5, 40.5], z: 48, mode: 'post', facing: 270 },
    { id: 'hnd1', type: 'hound', faction: 'kokaku', at: [40, 44], mode: 'patrol', route: [[36, 44, 1], [44, 47, 1]] }],
  civilians: [{ id: 'nob1', kind: 'noble', at: [27, 12], facing: 0, mode: 'post' }, { id: 'nob2', kind: 'noble', at: [33, 12], facing: 180, mode: 'post' }, { id: 'nob3', kind: 'noble', at: [42, 16], mode: 'patrol', route: [[42, 16, 3], [47, 12, 3]] },
    { id: 'srv1', kind: 'servant', at: [24, 9], mode: 'patrol', route: [[24, 9, 2], [36, 9, 2]] }, { id: 'srv2', kind: 'servant', at: [46, 8], facing: 90, mode: 'post' }, { id: 'srv3', kind: 'servant', at: [20, 16], mode: 'patrol', route: [[20, 16, 2], [12, 16, 2]] },
    { id: 'dis1', kind: 'servant', disguised: true, at: [36, 16], mode: 'patrol', route: [[36, 16, 3], [28, 17, 2]] }, { id: 'dis2', kind: 'servant', disguised: true, at: [50, 13], facing: 180, mode: 'post' }, { id: 'dis3', kind: 'servant', disguised: true, at: [10, 18], mode: 'patrol', route: [[10, 18, 2], [10, 11, 2]] }],
  boss: { id: 'kurogane', at: [17.5, 33.5], z: 160, intro: ['kurogane', 'kur_intro'], defeat: ['kurogane', 'kur_defeat'], close: [], bpm: 132 },
  interact: [{ id: 'sake', at: [16, 10.4], hold: 1, text: 'Swap the poisoned sake', do: [['swap'], ['say', 'granny', 'm3_swapped'], ['checkpoint']] }],
  pickups: [{ kind: 'tool', tool: 'riceball', n: 2, at: [24, 40.5], z: 64 }, { kind: 'tool', tool: 'smoke', n: 1, at: [44, 30] }],
  objectives: [
    { id: 'sake', type: 'stopTimer', interact: 'sake', text: 'Find the poisoned sake in the tea pavilion before the moon is high' },
    { id: 'disguised', type: 'flag', flag: 'disguisedDown', count: 3, optional: true, text: 'Optional: silence the 3 disguised Red Lanterns (Ki Focus shows them)' },
    { id: 'climb', type: 'reach', at: [17.5, 33.5], r: 4, z: 160, text: 'Climb the keep to the top roof', hidden: true, after: ['sake'], say: ['granny', 'm3_keep'] },
    { id: 'kurogane', type: 'defeat', boss: 'kurogane', text: 'Defeat Chamberlain Kurogane', hidden: true, after: ['climb'] }],
  triggers: [{ id: 'arrive', when: 'time:.6', do: [['say', 'granny', 'm3_arrive']] }, { id: 'bailey', rect: [4, 4, 57, 20], do: [['checkpoint']] },
    { id: 'tier2', rect: [12, 28, 23, 39], z: 112, do: [['checkpoint']] }, { id: 'arena', rect: [14, 30, 21, 37], z: 160, when: 'objective:sake', do: [['boss', 'kurogane']] }],
  timer: { seconds: 720, fail: 'The lord raised his cup. The moon drank him.', stopOn: 'objective:sake' }
});

/* ---- Night Delivery: the Shadow Trial and the AI Hub round ---- */
def('level', 'delivery', { name: 'Night Delivery', size: [34, 30], time: 'night', faction: 'kanemori', music: 'm1', weather: null, par: 300,
  rows: R(34, 30, '.', [['box', 0, 0, 33, 29, '#'], ['rect', 1, 1, 32, 3, '~'], ['box', 2, 4, 31, 25, 'W'], ['set', 16, 4, 'd'], ['set', 17, 4, 'd'], ['rect', 3, 5, 30, 24, ':'],
    ['rect', 6, 7, 9, 10, 'C'], ['rect', 24, 7, 27, 10, 'C'], ['rect', 19, 7, 20, 8, 'T'], ['box', 14, 12, 20, 17, 'H'], ['rect', 15, 13, 19, 16, '_'], ['set', 17, 17, 'd'],
    ['rect', 3, 13, 6, 16, ','], ['rect', 25, 19, 29, 22, ','], ['rect', 10, 18, 14, 21, '~'], ['rect', 3, 5, 30, 5, '+'], ['rect', 16, 18, 18, 24, '+']]),
  zones: [{ id: 'yard', rect: [3, 5, 30, 24], name: 'Sakubei\'s Yard' }, { id: 'canal', rect: [1, 1, 32, 3], name: 'The Canal' }],
  lights: [lantern(10, 15), lantern(23, 15), lantern(17, 22), paper(17, 18.2), paper(19.5, 7.5, { z: 84, r: 70 }), paper(15, 6), paper(19, 6), lantern(4, 27), lantern(29, 27)],
  props: [['riceBale', 4, 7], ['riceBale', 4.8, 7.6], ['sakeBarrel', 29, 13], ['waterBarrel', 12, 7], ['boat', 16.5, 2], ['strawMat', 17, 14.5], ['jubako', 16, 14.4]],
  anchors: [],
  hero: { at: [16.5, 27], facing: 270 }, exit: { at: [16.5, 4], r: 1.4 },
  bells: [], barracks: [],
  guards: [
    { id: 'd_ash1', type: 'ashigaru', at: [8, 22], mode: 'patrol', lantern: true, route: [[5, 22, 1], [28, 22, 1], [28, 11, 1], [11, 11, 1]] },
    { id: 'd_ash2', type: 'ashigaru', at: [12, 6], mode: 'patrol', route: [[5, 6, 2], [14, 6, 1]] }, { id: 'd_ash3', type: 'ashigaru', at: [29, 17], facing: 180, mode: 'post' },
    { id: 'd_sam1', type: 'samurai', at: [17, 18.5], facing: 90, mode: 'post' }, { id: 'd_sam2', type: 'samurai', at: [10, 17], mode: 'patrol', route: [[9, 17, 2], [9, 23, 1]] },
    { id: 'd_arc', type: 'archer', at: [19.5, 7.5], z: 80, facing: 90, mode: 'post', lantern: true }, { id: 'd_nin', type: 'ninja', at: [25.5, 8.5], z: 48, mode: 'patrol', route: [[24.5, 7.5, 2], [27.5, 9.5, 2]] },
    { id: 'd_hnd', type: 'hound', at: [11, 9], mode: 'patrol', route: [[11, 8, 1], [11, 11, 1]] }],
  civilians: [{ id: 'sakubei', type: 'target', kind: 'merchant', target: true, name: 'Broker Sakubei', at: [17, 14], facing: 90, mode: 'post', voice: 'sakubei' }, { id: 'clerk1', kind: 'clerk', at: [15.5, 15.5], facing: 0, mode: 'post' }, { id: 'clerk2', kind: 'clerk', at: [23, 6], mode: 'patrol', route: [[23, 6, 3], [27, 6, 3]] }],
  pickups: [], interact: [],
  objectives: [{ id: 'kill', type: 'assassinate', target: 'sakubei', text: 'Silence Broker Sakubei in his counting hall' }, { id: 'escape', type: 'reach', exit: true, text: 'Out through the canal gate', hidden: true, after: ['kill'] }],
  triggers: [], timer: null
});

/* ---- missions: metadata, briefings, loadouts, unlocks, the story order ---- */
def('mission', 'training', { title: 'The Trial of the Second Tier', level: 'training', next: 'm1', loadoutHint: ['riceball', 'poison', 'firecracker', 'smoke', 'shuriken', 'caltrops', 'riceball', 'firecracker'], par: 420, num: 'Prologue' });
def('mission', 'm1', { title: 'Rice and Ash', level: 'm1', next: 'm2', loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'riceball', 'shuriken'], par: 720, num: 'Mission 1' });
def('mission', 'm2', { title: 'The Fort at Kiri Lake', level: 'm2', next: 'm3', loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'riceball', 'smoke'], par: 900, num: 'Mission 2' });
def('mission', 'm3', { title: 'Moon over Kokaku', level: 'm3', next: 'end', loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'riceball', 'riceball'], par: 960, num: 'Mission 3' });
def('mission', 'delivery', { title: 'Night Delivery', level: 'delivery', next: null, loadoutHint: ['riceball', 'poison', 'shuriken', 'smoke', 'firecracker', 'caltrops', 'shuriken', 'riceball'], par: 300, num: 'Shadow Trial' });
B.STORY_ORDER = ['training', 'm1', 'm2', 'm3'];
