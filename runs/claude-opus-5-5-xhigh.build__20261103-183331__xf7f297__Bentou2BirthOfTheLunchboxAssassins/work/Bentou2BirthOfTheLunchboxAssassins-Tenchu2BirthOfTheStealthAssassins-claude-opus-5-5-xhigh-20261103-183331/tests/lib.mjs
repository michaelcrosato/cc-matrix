// a small test yard (fixed spots for the suites): a compound wall (30), a townhouse (40), a storehouse (48), a fence (14),
// a deep pond with shallows, tall grass, gravel, a lantern in the north-west, darkness elsewhere
export function yard(t, extra = {}) {
  const { B } = t, L = B.LG(30, 24);
  L.rect(4, 4, 4, 8, 'W');            // a wall to climb (x 4, y 4..8)
  L.rect(8, 4, 10, 6, 'A');           // a townhouse to grapple (40)
  L.rect(14, 4, 16, 6, 'C');          // a storehouse (48)
  L.rect(20, 4, 20, 8, 'F');          // a fence to vault
  L.rect(4, 14, 9, 18, '~'); L.rect(10, 14, 11, 18, '-');   // the pond, its shallows
  L.rect(14, 14, 18, 18, ',');        // tall grass
  L.rect(22, 14, 26, 18, ':');        // gravel
  const spec = Object.assign({ id: 'yard', name: 'Test yard', size: [30, 24], time: 'night', faction: 'kanemori', rows: L.rows(), music: 'm1', weather: null, par: 300,
    zones: [], lights: [{ at: [2, 2], kind: 'stoneLantern', r: 64, i: 1 }], props: [], anchors: [], hero: { at: [2, 20], facing: 0 }, exit: { at: [28, 21], r: 1 },
    guards: [], civilians: [], bells: [], barracks: [], pickups: [], objectives: [{ id: 'never', type: 'flag', flag: 'never', text: 'Test' }], triggers: [], timer: null }, extra);
  B.def('level', 'yard', spec);
  return spec;
}
/** load the yard (optionally with guards), the hero placed; cutscenes cleared */
export function loadYard(t, extra = {}, o = {}) {
  yard(t, extra);
  t.game.debug.load('yard', Object.assign({ mode: 'story', char: 'sojiro' }, o)); t.game.advance(1 / 30);
  t.B.Cutscene.clear();
  return t.B.M;
}
export const C = c => (c + .5) * 16;
/** hold an intent for some seconds */
export function act(t, it, s) { t.intent(it, s); }
