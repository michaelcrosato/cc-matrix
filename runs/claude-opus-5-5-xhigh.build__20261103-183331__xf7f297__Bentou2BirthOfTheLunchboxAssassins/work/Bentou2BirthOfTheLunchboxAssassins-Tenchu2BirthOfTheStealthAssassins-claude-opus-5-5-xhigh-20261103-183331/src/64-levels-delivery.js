/* ---- "NIGHT DELIVERY": the Shadow Trial and the AI Hub round. The rice broker Sakubei's walled yard by the canal:
 * silence him in his counting hall and leave by the canal gate. Static data, the same in every copy; patrols run on the
 * seeded Math.random, so every player's round starts alike ---- */
(() => {
  const L = LG(34, 30);
  L.rect(1, 1, 32, 3, '~');                                                      // the canal
  L.frame(2, 4, 31, 22, 'W'); L.rect(16, 4, 17, 4, 'd');                         // the compound wall, the canal gate
  L.rect(3, 5, 30, 21, '.');
  L.rect(5, 6, 8, 9, 'C'); L.rect(25, 6, 28, 9, 'C'); L.rect(20, 6, 21, 7, 'T');
  L.frame(13, 11, 20, 16, 'H'); L.rect(14, 12, 19, 15, '_'); L.set(16, 16, 'd'); L.set(13, 13, 'd');
  L.rect(9, 17, 14, 20, '~'); L.rect(3, 11, 5, 14, ','); L.rect(26, 17, 29, 19, ','); L.rect(3, 19, 7, 21, ',');
  L.rect(15, 5, 18, 10, '+'); L.rect(15, 17, 18, 21, '+');
  L.rect(1, 23, 32, 28, '.'); L.rect(1, 23, 32, 23, ',');
  const P = (id, x, y, o) => [id, x, y, o || {}];
  B.def('level', 'delivery', { id: 'delivery', name: 'Night Delivery', size: [34, 30], time: 'night', faction: 'sakubei', rows: L.rows(), music: 'm1', weather: null, par: 300, target: 'sakubei',
    zones: [{ id: 'yard', rect: [3, 5, 30, 21], name: 'Sakubei\'s yard' }, { id: 'hall', rect: [13, 11, 20, 16], name: 'The counting hall' }, { id: 'outside', rect: [1, 23, 32, 28], name: 'Outside the south wall' }],
    lights: [{ at: [9, 13], kind: 'stoneLantern', r: 64 }, { at: [25, 13], kind: 'stoneLantern', r: 64 }, { at: [16, 13], kind: 'paperLantern', r: 60 }, { at: [16, 5], kind: 'torch', r: 64 }, { at: [17, 21], kind: 'paperLantern', r: 56 },
      { at: [21, 7], kind: 'none', z: 86, r: 70, color: '#ffb060' }, { at: [8, 26], kind: 'paperLantern' }, { at: [26, 26], kind: 'paperLantern' }],
    props: [P('kotatsu', 17, 13), P('jubako', 15, 14), P('strongbox', 18, 12, { facing: 3.14 }), P('riceBale', 4, 6), P('riceBale', 4, 7), P('riceBale', 10, 6), P('riceBale', 23, 8), P('riceBale', 24, 9), P('cart', 11, 9),
      P('sakeBarrel', 29, 11), P('sakeBarrel', 29, 12), P('bonsaiPine', 22, 18), P('steppingStones', 15, 19), P('cherry', 7, 16), P('boat', 16, 2, { facing: 0 }), P('mooringPost', 14, 3), P('nobori', 3, 5, { color: '#5a4a3a' }),
      P('waterBarrel', 30, 20), P('cart', 6, 25), P('riceBale', 28, 25), P('riceBale', 29, 25)],
    anchors: [],
    hero: { at: [16, 26], facing: 270 }, exit: { at: [16, 3], r: 1.5 },
    guards: [
      { id: 'lantern', type: 'ashigaru', at: [11, 10], mode: 'patrol', lantern: true, route: [[11, 10, 1], [22, 10, 1], [22, 18, 1], [11, 18, 1]] },
      { id: 'gateash', type: 'ashigaru', at: [16, 6], facing: 90, mode: 'post' }, { id: 'westash', type: 'ashigaru', at: [4, 16], mode: 'patrol', route: [[4, 16, 2, 0], [10, 16, 1]], loop: false },
      { id: 'doorsam', type: 'samurai', at: [17, 17], facing: 90, mode: 'post' }, { id: 'eastsam', type: 'samurai', at: [28, 14], mode: 'patrol', route: [[28, 14, 2, 180], [28, 20, 2, 180]], loop: false },
      { id: 'tower', type: 'archer', at: [20, 6], facing: 100, mode: 'post' }, { id: 'roofninja', type: 'ninja', at: [6, 7], z: 48, mode: 'patrol', route: [[6, 7, 2], [7, 8, 2]] },
      { id: 'hound', type: 'hound', at: [6, 19], mode: 'patrol', route: [[5, 19, 1], [8, 19, 1]], loop: false }],
    civilians: [{ id: 'sakubei', type: 'sakubei', at: [17, 12], facing: 90, mode: 'sit', target: true }, { id: 'clerk1', type: 'clerk', at: [15, 13], facing: 0 }, { id: 'clerk2', type: 'clerk', at: [10, 7], facing: 90, route: [[10, 7, 4], [12, 7, 3]] }],
    bells: [], barracks: [],
    pickups: [],
    objectives: [
      { id: 'kill', type: 'assassinate', target: 'sakubei', text: 'Silence Sakubei the rice broker' },
      { id: 'escape', type: 'reach', after: ['kill'], text: 'Leave by the canal gate' }],
    triggers: [{ id: 's', when: 'time:.5', do: [['say', 'granny', 'd_start']] }, { id: 'k', when: 'objective:kill', do: [['say', 'granny', 'd_target']] }],
    timer: null });
})();
