// Battle data: terrain, the monster species (two forms each), skills and the battle maps (ASCII, odd-r hexes).

// ---- terrain: cost to enter, defence it gives the unit standing on it, and what it blocks ----
G.def('terrain', 'plain', { name: 'Meadow', cost: 1, def: 0, hit: 0, glyph: '.' });
G.def('terrain', 'forest', { name: 'Forest', cost: 2, def: 2, hit: 0, glyph: 'f' });
G.def('terrain', 'hill', { name: 'Hill', cost: 2, def: 3, hit: -10, glyph: 'h' });
G.def('terrain', 'swamp', { name: 'Swamp', cost: 2, def: -1, hit: 0, glyph: 'm' });
G.def('terrain', 'ruin', { name: 'Ruin', cost: 1, def: 1, hit: 0, glyph: 'r' });
G.def('terrain', 'keep', { name: 'Keep', cost: 1, def: 2, hit: 0, glyph: 'K' });
G.def('terrain', 'bridge', { name: 'Bridge', cost: 1, def: 0, hit: 0, glyph: '=' });
G.def('terrain', 'river', { name: 'River', cost: Infinity, def: 0, hit: 0, glyph: '~' });
G.def('terrain', 'ice', { name: 'Ice', cost: 1, def: 0, hit: 0, glyph: '~' });
G.def('terrain', 'wall', { name: 'Wall', cost: Infinity, def: 0, hit: 0, glyph: '#' });
G.def('terrain', 'ash', { name: 'Ash', cost: 1, def: 0, hit: 0, glyph: ',' });
G.TERRAIN_OF_GLYPH = {};
for (const t of G.all('terrain')) G.TERRAIN_OF_GLYPH[t.glyph] = t.id;
G.TERRAIN_OF_GLYPH['a'] = 'plain';    // side 0's start cells (plain ground)
G.TERRAIN_OF_GLYPH['b'] = 'plain';    // side 1's start cells

// ---- monster species: 8 species, each with two forms (tier 1 is summoned; tier 2 is evolved at a castle) ----
// look: 'blob' (a Blob with these parts) or 'human' (a bulky or skeleton Humanoid). size: S, M or L (hit chance).
const SPECIES = (id, o) => G.def('species', id, o);
SPECIES('gleam-slime', { name: 'Gleam Slime', element: 'verdant', look: { kind: 'blob', R: 6, colors: { dk: '#2a6a3a', base: '#7ad06a', lt: '#c8f8b0', spec: '#ffffff', eye: '#ffffff', pupil: '#102010' } }, forms: [
  { name: 'Gleam Slime', hp: 14, atk: 5, def: 1, mov: 3, rng: 1, size: 'S', skill: null, cost: 2 },
  { name: 'Ooze Brute', hp: 24, atk: 8, def: 3, mov: 3, rng: 1, size: 'M', skill: 'mend', cost: 4 }] });
SPECIES('dusk-bat', { name: 'Dusk Bat', element: 'ambered', look: { kind: 'blob', R: 5, wings: true, mouth: 'fangs', colors: { dk: '#3a2a5a', base: '#6a5a8a', lt: '#9a8ac0', spec: '#e0d8ff', eye: '#ffd36a', pupil: '#201020' } }, forms: [
  { name: 'Dusk Bat', hp: 12, atk: 5, def: 1, mov: 5, rng: 1, size: 'S', skill: null, cost: 2 },
  { name: 'Vesper Bat', hp: 18, atk: 7, def: 2, mov: 5, rng: 1, size: 'S', skill: 'rally', cost: 4 }] });
SPECIES('thorn-hare', { name: 'Thorn Hare', element: 'verdant', look: { kind: 'blob', R: 6, ears: 'rabbit', feet: true, colors: { dk: '#5a4a2a', base: '#b09060', lt: '#e0c890', spec: '#fff8e0', eye: '#ffffff', pupil: '#201810' } }, forms: [
  { name: 'Thorn Hare', hp: 13, atk: 5, def: 1, mov: 4, rng: 1, size: 'S', skill: null, cost: 2 },
  { name: 'Briar Hare', hp: 20, atk: 7, def: 3, mov: 4, rng: 1, size: 'M', skill: 'guard', cost: 4 }] });
SPECIES('cinder-imp', { name: 'Cinder Imp', element: 'solar', look: { kind: 'blob', R: 6, horns: true, tail: true, feet: true, mouth: 'fangs', colors: { dk: '#7a2a10', base: '#e0602a', lt: '#ffb060', spec: '#fff0c0', eye: '#ffe060', pupil: '#300808' } }, forms: [
  { name: 'Cinder Imp', hp: 12, atk: 6, def: 1, mov: 3, rng: 2, size: 'S', skill: 'breath', cost: 3 },
  { name: 'Forge Imp', hp: 18, atk: 9, def: 2, mov: 3, rng: 2, size: 'M', skill: 'breath', cost: 5 }] });
SPECIES('frost-wisp', { name: 'Frost Wisp', element: 'rime', look: { kind: 'blob', R: 6, colors: { dk: '#2a5a8a', base: '#9ad8ff', lt: '#e8f8ff', spec: '#ffffff', eye: '#ffffff', pupil: '#102030' } }, forms: [
  { name: 'Frost Wisp', hp: 11, atk: 4, def: 1, mov: 4, rng: 2, size: 'S', skill: 'frost', cost: 3 },
  { name: 'Glacier Wisp', hp: 17, atk: 6, def: 3, mov: 4, rng: 2, size: 'M', skill: 'frost', cost: 5 }] });
SPECIES('storm-pixie', { name: 'Storm Pixie', element: 'rime', look: { kind: 'blob', R: 5, wings: true, colors: { dk: '#2a3a7a', base: '#7ab0ff', lt: '#d0e8ff', spec: '#ffffff', eye: '#fff080', pupil: '#101830' } }, forms: [
  { name: 'Storm Pixie', hp: 10, atk: 5, def: 1, mov: 5, rng: 2, size: 'S', skill: 'thunder', cost: 3 },
  { name: 'Thunder Pixie', hp: 15, atk: 8, def: 2, mov: 5, rng: 2, size: 'M', skill: 'thunder', cost: 5 }] });
SPECIES('stone-golem', { name: 'Stone Golem', element: 'hour', look: { kind: 'human', build: 'bulky', size: 1.5, colors: { cloth: '#6a6670', skin: '#8a8690', metal: '#aaa6b0' } }, forms: [
  { name: 'Stone Golem', hp: 30, atk: 8, def: 6, mov: 2, rng: 1, size: 'L', skill: 'guard', cost: 5 },
  { name: 'Basalt Colossus', hp: 44, atk: 11, def: 9, mov: 2, rng: 1, size: 'L', skill: 'rally', cost: 8 }] });
SPECIES('bonewalker', { name: 'Bonewalker', element: 'hour', look: { kind: 'human', build: 'skeleton', size: 1.25, colors: { bone: '#d8d0c0', cloth: '#3a3048' } }, forms: [
  { name: 'Bonewalker', hp: 16, atk: 6, def: 2, mov: 3, rng: 1, size: 'M', skill: null, cost: 4 },
  { name: 'Dread Warden', hp: 24, atk: 9, def: 4, mov: 3, rng: 1, size: 'M', skill: 'charge', cost: 7 }] });
G.SIZE_HIT = { S: { S: 0, M: 0, L: -5 }, M: { S: 5, M: 0, L: 0 }, L: { S: 10, M: 5, L: 0 } };   // hit bonus by attacker, then defender size
G.speciesForm = (id, form) => { const s = G.get('species', id); return Object.assign({ species: id, element: s.element, look: s.look }, s.forms[form]); };
G.MONSTER_FORMS = id => G.get('species', id).forms.length;

// ---- battle maps: ASCII rows (odd-r hexes). a: side 0's start, b: side 1's start, K: the Keep (side 0 wins by standing on it).
// glyphs: . meadow  f forest  h hill  m swamp  r ruin  ~ river  = bridge  # wall  K keep  a b start cells
G.def('map', 'meadow', { name: 'Border Meadow', season: 'spring', keep: true, tutorial: true, rows: [
  'aa..f....bb', 'a.f..h...b.', 'a..f.~~~..b', '..h..~=~...', '..f..~=~.K.', '....~=~.f..', 'a..f...h..b', 'a.a....f.bb', 'aa.h.....bb'] });
G.def('map', 'ford', { name: 'The Ford', season: 'summer', keep: true, rows: [
  'aa.f...ff.b', 'a..~~~....b', 'a.f~=~..h.b', '..h~=~.....', 'a..f.~.~..K', 'a.h....ff.b', 'a..~~~.f..b', 'aa...h...bb', 'a.f.....bbb'] });
G.def('map', 'keep', { name: 'The Sunken Keep', season: 'autumn', keep: true, rows: [
  'a..#####..b', 'a..#...#..b', 'aa.#.h.#.bb', 'a.f#...#.b.', 'a..f.K..b..', 'a.f#...#.bb', 'aa.#.h.#.bb', 'a..#...#..b', 'a..#####..b'] });
G.MAP_ROWS_WIDTH = 11;
