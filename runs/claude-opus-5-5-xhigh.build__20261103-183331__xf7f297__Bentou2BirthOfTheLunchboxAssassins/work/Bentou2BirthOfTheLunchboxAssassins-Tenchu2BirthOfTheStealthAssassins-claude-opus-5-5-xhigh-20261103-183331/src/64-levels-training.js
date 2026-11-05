/* ---- LEVELS are data (the Workshop edits and exports the same JSON). LG builds a level's rows from rectangles, so a
 * campaign map reads as its plan. Legend: . earth , grass " bamboo : gravel = boards _ tatami + paving ~ deep water
 * - shallow  # castle wall (56)  W compound wall (30)  F bamboo fence (14)  H hall wall (40)  d doorway  A townhouse (40)
 * B inn (64)  C storehouse (48)  D shop (40)  S shrine (56)  T tower (80)  G K M keep tiers (64 112 160)  P planter (10)
 * R rocks (20). Actors, lights and props are lists, never letters in the rows ---- */
const LG = (w, h, fill = '.') => {
  const g = Array.from({ length: h }, () => Array(w).fill(fill));
  const L = {
    w, h, g,
    rect(x0, y0, x1, y1, ch) { for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = ch; return L; },
    frame(x0, y0, x1, y1, ch) { for (let x = x0; x <= x1; x++) { L.set(x, y0, ch); L.set(x, y1, ch); } for (let y = y0; y <= y1; y++) { L.set(x0, y, ch); L.set(x1, y, ch); } return L; },
    set(x, y, ch) { if (x >= 0 && y >= 0 && x < w && y < h) g[y][x] = ch; return L; },
    rows() { return g.map(r => r.join('')); }
  };
  return L.frame(0, 0, w - 1, h - 1, '#');
};
B.LG = LG;
(() => {
  const L = LG(40, 28);
  L.rect(1, 1, 10, 4, 'A');                       // the Jubako-ya (its back porch faces the yard)
  L.rect(3, 8, 4, 9, 'P'); L.rect(8, 9, 9, 9, 'P');   // planters
  L.rect(1, 12, 14, 12, 'W');                     // the yard's low south wall (climb it)
  L.rect(14, 1, 14, 11, 'F');                     // the bamboo fence (vault it)
  L.rect(15, 1, 19, 4, ','); L.rect(20, 1, 37, 9, '"'); L.rect(26, 3, 28, 6, '.'); L.rect(21, 6, 34, 7, '.');   // tall grass, the bamboo grove and its path
  L.rect(16, 14, 26, 19, '~'); L.rect(15, 14, 15, 19, '-'); L.rect(17, 20, 25, 20, '-');   // the koi pond
  L.rect(31, 14, 36, 18, 'C');                    // the kura storehouse
  L.rect(2, 16, 12, 25, ':');                     // the raked-gravel sparring ring
  L.rect(1, 15, 1, 26, ','); L.rect(28, 22, 38, 26, '+');
  L.rect(13, 21, 14, 26, '.');
  B.def('level', 'training', { id: 'training', name: 'The Trial of the Second Tier', size: [40, 28], time: 'dusk', faction: 'trial', rows: L.rows(), music: 'training', weather: 'petals', par: 420,
    zones: [{ id: 'yard', rect: [1, 5, 13, 11], name: 'The back yard' }, { id: 'grove', rect: [15, 1, 38, 10], name: 'The bamboo grove' }, { id: 'pond', rect: [15, 13, 27, 21], name: 'The koi pond' }, { id: 'kura', rect: [29, 13, 38, 21], name: 'The storehouse' }, { id: 'ring', rect: [1, 15, 13, 26], name: 'The gravel ring' }],
    lights: [{ at: [5, 5], kind: 'paperLantern', r: 60, i: .8 }, { at: [9, 5], kind: 'paperLantern', r: 60, i: .8 }, { at: [17, 12], kind: 'stoneLantern', r: 56 }, { at: [29, 12], kind: 'stoneLantern', r: 56 },
      { at: [28, 20], kind: 'stoneLantern', r: 64 }, { at: [13, 16], kind: 'stoneLantern', r: 60 }, { at: [13, 24], kind: 'stoneLantern', r: 60 }, { at: [38, 23], kind: 'torch', r: 70 }, { at: [2, 6], kind: 'window', r: 40, i: .6, z: 14 }],
    props: [['jubako', 7, 5, { facing: 1.57, dy: -2 }], ['sakeBarrel', 2, 6], ['riceBale', 11, 6, { facing: .3 }], ['riceBale', 11, 7, { facing: -.2 }], ['waterBarrel', 12, 10], ['cherry', 7, 11], ['bonsaiPine', 2, 10],
      ['steppingStones', 6, 7], ['steppingStones', 16, 11], ['cherry', 22, 12], ['persimmonTree', 29, 21], ['strawMat', 34, 23], ['mato', 38, 25], ['weaponRack', 3, 15, { facing: 1.57 }], ['dummy', 14, 23], ['dummy', 14, 25],
      ['taiko', 7, 26, { facing: -1.57 }], ['torii', 26, 11, { facing: 0 }], ['bamboo', 25, 2, { params: { seed: 4, n: 5 } }], ['bonsaiPine', 38, 13], ['riceBale', 37, 19], ['riceBale', 38, 19], ['nobori', 1, 13, { color: '#3e5a32' }], ['nobori', 12, 26, { color: '#c8342a' }]],
    anchors: [[29, 21, 40, 31, 24]],
    hero: { at: [5, 6], z: 0, facing: 90 }, exit: { at: [5, 6], r: 1.5 },
    npcs: [{ id: 'granny', rig: 'granny', at: [6, 5], facing: 90 }],
    guards: [
      { id: 'ume', type: 'disciple', color: '#3e6a3a', at: [27, 6], mode: 'patrol', lantern: true, mark: true, route: [[24, 7, 1], [33, 7, 1.5, 0], [33, 6, 0], [24, 6, 1, 180]], loop: true },
      { id: 'kiku', type: 'disciple', color: '#2a4a7a', at: [27, 16], facing: 0, mode: 'post', mark: true },
      { id: 'masa', type: 'disciple', color: '#6a4a2a', at: [33, 20], facing: 90, mode: 'post', mark: true },
      { id: 'daikon', type: 'daikon', at: [36, 24], facing: 180, mode: 'post', mark: true }],
    bells: [], barracks: [[39, 24]],
    pickups: [{ id: 'cracker', kind: 'tool', tool: 'firecracker', n: 2, at: [30, 22] }, { id: 'riceT', kind: 'tool', tool: 'poisonball', n: 1, at: [31, 24] }],
    boss: { id: 'ittetsu', at: [7, 21], facing: 270, arena: [2, 16, 12, 25] },
    objectives: [
      { id: 'vault', type: 'flag', flag: 'vaulted', text: 'Vault the bamboo fence' },
      { id: 'ume', type: 'assassinate', target: 'ume', after: ['vault'], text: 'Silent Mark: Ume, from behind' },
      { id: 'kiku', type: 'assassinate', target: 'kiku', after: ['ume'], text: 'Silent Mark: Kiku, from the water' },
      { id: 'roof', type: 'reach', zone: [31, 14, 36, 18], z: 48, after: ['kiku'], text: 'Grapple onto the storehouse roof' },
      { id: 'masa', type: 'assassinate', target: 'masa', after: ['roof'], text: 'Silent Mark: Masa, from above' },
      { id: 'daikon', type: 'assassinate', target: 'daikon', after: ['masa'], text: 'Lure Big Daikon, put him to sleep, mark him' },
      { id: 'smoke', type: 'flag', flag: 'used_smoke', after: ['daikon'], text: 'Spotted! Smoke, and slip away' },
      { id: 'spar', type: 'defeat', boss: 'ittetsu', after: ['smoke'], text: 'Spar with Brother Ittetsu' },
      { id: 'return', type: 'reach', after: ['spar'], text: 'Return to Granny on the porch' }],
    triggers: [
      { id: 't0', when: 'time:.5', do: [['say', 'granny', 't_move'], ['tutorial', 'Move and sneak', 'Run with {a:up}{a:left}{a:down}{a:right} or the stick. {a:crouch} crouches. Tilt the stick a little to walk.']] },
      { id: 't1', rect: [11, 1, 13, 11], do: [['say', 'granny', 't_fence'], ['tutorial', 'Jump, vault, climb', '{a:jump} jumps. Run at a low fence or wall and press {a:jump} to vault or climb it.']] },
      { id: 't2', rect: [15, 1, 19, 11], do: [['flag', 'vaulted'], ['say', 'granny', 't_ki'], ['tutorial', 'The Ki Gauge', 'Bottom left: how near the nearest guard is, colored by what they know. Hold {a:focus} to focus your ki and sense further.']] },
      { id: 't3', rect: [20, 1, 23, 9], do: [['say', 'granny', 't_mark'], ['tutorial', 'Silent Cut', 'Crouch in the bamboo. Come up behind Ume unseen and press {a:attack} when the prompt shows.']] },
      { id: 't4', when: 'objective:ume', do: [['say', 'granny', 't_mark_done'], ['checkpoint'], ['say', 'granny', 't_swim']] },
      { id: 't5', rect: [15, 13, 27, 21], do: [['tutorial', 'Swim and dive', 'In deep water you swim. {a:crouch} dives: unseen, but your breath runs out. Near a guard on the bank, {a:attack} pulls them in.']] },
      { id: 't6', when: 'objective:kiku', do: [['checkpoint'], ['say', 'granny', 't_roof'], ['tutorial', 'The grappling hook', 'Face a roof edge and tap {a:grapple}. Hold it to aim. Only the rope reaches the roofs.']] },
      { id: 't7', when: 'objective:roof', do: [['say', 'granny', 't_above']] },
      { id: 't8', when: 'objective:masa', do: [['checkpoint'], ['say', 'granny', 't_tools'], ['tutorial', 'Tools', 'Pick a tool with {a:toolPrev} {a:toolNext} (or the wheel, 1-8). {a:useTool} throws it. A firecracker pulls a guard to look; a rice ball left on the ground feeds him.']] },
      { id: 't9', when: 'objective:masa', do: [['say', 'granny', 't_herb'], ['flag', 'sleepHerb']] },
      { id: 't10', when: 'objective:daikon', do: [['checkpoint'], ['flag', 'used_smoke', false], ['give', 'smoke', 1], ['spawn', { id: 'lb1', type: 'disciple', color: '#5a3a5a', at: [16, 23], facing: 0, mode: 'post', lantern: true }], ['spawn', { id: 'lb2', type: 'disciple', color: '#5a3a5a', at: [16, 25], facing: 0, mode: 'post', lantern: true }], ['say', 'granny', 't_smoke'], ['tutorial', 'Smoke and slip away', 'Throw a smoke bomb with {a:useTool} (hold {a:block} to drop it at your feet). Inside the cloud nobody sees you.']] },
      { id: 't11', when: 'objective:smoke', do: [['remove', 'lb1'], ['remove', 'lb2'], ['say', 'granny', 't_spar'], ['tutorial', 'Fighting', '{a:attack} strikes in a combo. Hold {a:block} to block; press it just before a blow lands to parry, then {a:attack} ripostes. {a:block} + {a:jump} rolls.']] },
      { id: 't12', rect: [2, 16, 12, 25], when: 'objective:smoke', do: [['boss', 'ittetsu']] },
      { id: 't13', when: 'boss:ittetsu', do: [['say', 'granny', 't_return']] }],
    timer: null });
})();
