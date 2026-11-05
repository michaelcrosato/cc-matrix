/* ---- MORE CONTENT: the full bestiary, castles, knights and battle maps ---- */
const MORE_MONS = [
  ['stag', ['Fawnling', 'Greenstag', 'Antlered Sovereign'], 0, 'M', 'melee', 36, 10, 6, 3, 8, 5, 1, 1, 18, 'quad', 0, '#7a9a4a'],
  ['thistle', ['Thistlebur', 'Thornbrute', 'Bramble Giant'], 0, 'L', 'melee', 46, 11, 9, 1, 3, 3, 1, 2, 24, 'brute', 0, '#4a7a52'],
  ['moth', ['Dustmoth', 'Lunar Moth', 'Empress Moth'], 0, 'S', 'magic', 22, 3, 3, 11, 9, 4, 2, 1, 22, 'fly', 1, '#c8e0a8'],
  ['hound', ['Cinderpup', 'Cinderhound', 'Ashen Hellhound'], 1, 'M', 'melee', 32, 11, 5, 2, 8, 5, 1, 1, 20, 'quad', 0, '#c85a2a'],
  ['beetle', ['Sunbeetle', 'Gilded Scarab', 'Solar Colossus'], 1, 'M', 'melee', 34, 9, 9, 1, 5, 4, 1, 1, 20, 'imp', 0, '#e0b030'],
  ['firewisp', ['Sparkmote', 'Ember Wisp', 'Pyre Djinn'], 1, 'S', 'magic', 20, 3, 3, 12, 8, 4, 3, 2, 26, 'wisp', 1, '#ff8a3a'],
  ['boar', ['Piglet Tusker', 'Harvest Boar', 'Ironback Razor'], 2, 'M', 'melee', 40, 11, 7, 1, 6, 4, 1, 1, 18, 'quad', 0, '#8a5a3a'],
  ['scarecrow', ['Strawman', 'Scarecrow', 'Field Reaper'], 2, 'M', 'melee', 30, 10, 6, 2, 6, 4, 1, 1, 18, 'imp', 0, '#b89848'],
  ['owl', ['Owlet', 'Barn Owl', 'Dusk Strix'], 2, 'S', 'ranged', 24, 8, 4, 5, 9, 6, 2, 1, 22, 'fly', 1, '#a89070'],
  ['rimewolf', ['Rimepup', 'Rimewolf', 'Glacial Fenrir'], 3, 'M', 'melee', 34, 11, 6, 2, 8, 5, 1, 1, 20, 'quad', 0, '#a8c8e0'],
  ['falcon', ['Frostchick', 'Frostfalcon', 'Blizzard Roc'], 3, 'S', 'melee', 26, 10, 4, 3, 10, 6, 1, 1, 22, 'fly', 1, '#d0e8f8'],
  ['icegolem', ['Iceblock', 'Rime Golem', 'Glacier Colossus'], 3, 'L', 'melee', 50, 10, 11, 1, 3, 3, 1, 2, 28, 'brute', 0, '#8ab8d8'],
  ['clockhound', ['Tickpup', 'Clockhound', 'Chronohound'], 4, 'M', 'melee', 34, 10, 7, 2, 8, 5, 1, 1, 22, 'quad', 0, '#b0a898'],
  ['sandstalker', ['Hourgrain', 'Sandstalker', 'Dune Reaver'], 4, 'M', 'melee', 32, 11, 6, 2, 7, 4, 1, 1, 22, 'imp', 0, '#c8a868'],
  ['gearwing', ['Cogwing', 'Gearwing', 'Escapement Drake'], 4, 'S', 'ranged', 26, 8, 5, 5, 9, 6, 2, 1, 24, 'fly', 1, '#9aa0b0'],
  ['bellwraith', ['Chime Shade', 'Bellwraith', 'Knell Lord'], 4, 'M', 'magic', 28, 4, 4, 12, 7, 4, 3, 2, 30, 'wisp', 1, '#8a7ac0'],
  ['lantern', ['Lanternling', 'Will-o-Hour', 'Beacon Warden'], 4, 'S', 'magic', 24, 3, 4, 11, 8, 4, 2, 2, 26, 'wisp', 1, '#e8e090'],
  ['mudman', ['Mudling', 'Mudman', 'Bog Titan'], 2, 'L', 'melee', 48, 11, 9, 1, 3, 3, 1, 2, 24, 'brute', 0, '#7a6a48']
];
for (const m of MORE_MONS) G.def('monster', m[0], { id: m[0], names: m[1], el: m[2], size: m[3], kind: m[4], hp: m[5], atk: m[6], def: m[7], int: m[8], spd: m[9], mov: m[10], range: m[11], bond: m[12], cost: m[13], body: m[14], fly: !!m[15], col: m[16], rangeSpec: m[4] === 'melee' ? [1, 1] : [2, 3] });

/* maps: eight more fields (11 x 9) */
Object.assign(G.MAPS, {
  orchard: ['.....f.....', '.f...f..f..', '.....,,....', '..f..#.....', '....f.K.f..', '..f..#.....', '.....,,....', '.f...f..f..', '.....f.....'],
  marsh: ['..w..,.....', '.ww..f..w..', '..,..ww.f..', '.f...w..#..', '..ww.wK.w..', '.f...w..#..', '..,..ww.f..', '.ww..f..w..', '..w..,.....'],
  cliffs: ['##.........', '#...f...##.', '....#..f...', '.f.##......', '...#..#.K..', '.f.##......', '....#..f...', '#...f...##.', '##.........'],
  village: ['....f.....f', '.##.....##.', '.##..f..##.', '.....,.....', '..f..#K..f.', '.....,.....', '.##..f..##.', '.##.....##.', '....f.....f'],
  bridge: ['f..ww......', '...ww..f...', '...ww......', '.,.....,...', '.f.....K...', '.,.....,...', '...ww......', '...ww..f...', 'f..ww......'],
  barrow: ['.#.f...f.#.', '..,.....,..', '.f..###..f.', '....#......', '.,..#.K..,.', '....#......', '.f..###..f.', '..,.....,..', '.#.f...f.#.'],
  windmill: ['..........f', '.f..,..,...', '...#...#...', '.,.....f.,.', '.....#.K...', '.,.....f.,.', '...#...#...', '.f..,..,...', '..........f'],
  glacier: ['.f.ww......', '..www..f...', '...w.......', '.,.#..#....', '...w..#K...', '.,.#..#....', '...w.......', '..www..f...', '.f.ww......']
});
Object.assign(G.MAP_NAMES, { orchard: 'The Clockwork Orchard', marsh: 'Mistfen Marsh', cliffs: 'The Weathered Cliffs', village: 'Hollin Village', bridge: 'The Long Bridge', barrow: 'The Barrow of Bells', windmill: 'The Windmill Fields', glacier: 'Rimeglass Flats' });
G.PLAIN_MAPS = ['meadow', 'forest', 'river', 'ruins', 'orchard', 'marsh', 'cliffs', 'village', 'bridge', 'barrow', 'windmill', 'glacier'];

/* castles 17-24 and their roads */
const MORE_CS = [
  [17, 'Primrose Gate', .30, .12, 0, 1, ['stag', 'moth', 'wolf'], 'orchard', 0], [18, 'Cinder Reach', .74, .10, 1, 1, ['hound', 'firewisp', 'hawk'], 'cliffs', 1],
  [19, 'Sheaf Hollow', .74, .90, 2, 1, ['boar', 'owl', 'scarecrow'], 'windmill', 2], [20, 'Frostmere', .26, .90, 3, 1, ['rimewolf', 'falcon', 'icegolem'], 'glacier', 3],
  [21, 'Chime Gate', .40, .40, 4, 1, ['clockhound', 'bellwraith', 'imp'], 'bridge', 4], [22, 'Tick Gate', .60, .60, 4, 1, ['sandstalker', 'gearwing', 'lantern'], 'barrow', 4],
  [23, 'Crow\'s Toll', .18, .30, 5, 1, ['bone', 'mudman', 'wolf'], 'marsh', 5], [24, 'Hangman\'s Mile', .82, .30, 5, 1, ['bone', 'scarecrow', 'raven'], 'village', 5]
];
for (const c of MORE_CS) G.CASTLES.push({ id: c[0], name: c[1], x: c[2], y: c[3], region: c[4], tier: c[5], circle: c[6], map: c[7], short: c[1] });
G.CASTLE_OWNER = [4, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 0, 1, 2, 3, 4, 4, 5, 5];
G.ROADS.push([1, 17], [17, 13], [17, 2], [4, 18], [18, 13], [18, 5], [7, 19], [19, 8], [19, 14], [10, 20], [20, 11], [20, 14], [21, 13], [21, 15], [21, 2], [21, 0], [22, 14], [22, 16], [22, 8], [22, 0], [23, 3], [23, 2], [23, 1], [24, 6], [24, 5], [24, 4]);
G.ADJ = G.CASTLES.map(() => []); for (const [a, b] of G.ROADS) { G.ADJ[a].push(b); G.ADJ[b].push(a); }
// every season-region castle gains the new species of its element, and the maps spread across the field list
for (const c of G.CASTLES) {
  if (c.id > 16) continue;
  const extra = G.all('monster').filter(m => m.el === c.region && !c.circle.includes(m.id)).map(m => m.id); for (const e of extra.slice(0, 2)) c.circle.push(e);
  if (c.id && c.map !== 'sanctum' && c.id < 17) c.map = G.PLAIN_MAPS[(c.id * 5) % G.PLAIN_MAPS.length];
}
G.SITES.push(['The Primrose Mill', 1], ['The Slag Orchard', 2], ['The Gleaner\'s Barn', 1], ['The Skating Pond', 2], ['The Muffled Bell', 1], ['The Hourglass Garden', 2], ['The Gibbet Oak', 1], ['The Toll Barrow', 2]);

/* fifteen more knights */
const MORE_KN = [
  ['ector', 'Ector of the Hedgerow', 0, 4, 4, '', .9, 'Keeps bees in his gauntlets. They obey him better than the army does.'], ['agravain', 'Agravain the Plain', 1, 0, 4, '', .75, 'Insists he is not jealous of Gawain. Says so loudly, often at noon.'],
  ['lucan', 'Lucan the Butler', 2, 3, 4, '', .85, 'Pours tea in the middle of battles. Has never spilled.'], ['gaheris', 'Gaheris of the Ice-Reach', 3, 1, 4, '', 1.05, 'Shoots icicles and apologises to them afterward.'],
  ['hush', 'Sir Hush', 4, 0, 6, '', .6, 'Has not spoken since the Clock stopped, and finds that restful.'], ['pause', 'Dame Pause', 4, 2, 6, '', 1.25, 'Casts spells one syllable at a time, and does not like to be interrupted.'],
  ['linger', 'Brother Linger', 4, 3, 6, '', .8, 'Heals the wounded very slowly, so they stay.'], ['dally', 'Knight Dally', 4, 1, 6, '', 1.1, 'Always has one more arrow to find. Never fires the first.'],
  ['mab', 'Mab the Cutthroat', 5, 0, 5, 'brigand', .7, 'Collects tolls. Does not collect receipts.'], ['nettle', 'Nettle', 5, 1, 5, 'brigand', 1.3, 'Small, quick, and entirely made of elbows.'],
  ['gareth', 'Gareth Kitchener', 5, 0, 6, 'free', .85, 'Was a scullion. Is now unreasonably good with a ladle and a sword.'], ['elyan', 'Elyan the White', 5, 2, 5, 'free', 1.15, 'Wears white in all weathers and keeps it clean by sheer will.'],
  ['pellam', 'Pellam the Fisher', 5, 3, 5, 'free', .9, 'Heals with fish. Nobody has asked him to explain.'], ['bran', 'Bran the Weathered', 5, 4, 6, 'free', .65, 'Walks with a raven who files his taxes.'], ['isolde', 'Isolde Wren', 5, 1, 5, 'free', 1.4, 'Shoots straighter than she tells the truth, and tells the truth quite straight.']
];
for (const k of MORE_KN) G.KNIGHTS[k[0]] = { id: k[0], name: k[1], short: k[1].split(' ')[0], realm: k[2], line: k[3], lvl: k[4], role: k[5], voice: k[6], blurb: k[7] };
G.MORE_PLACE = { ector: 17, agravain: 18, lucan: 19, gaheris: 20, hush: 21, pause: 22, linger: 13, dally: 14, mab: 23, nettle: 24 };
G.FREE_KNIGHTS = ['galahad', 'lunette', 'ywain', 'gareth', 'elyan', 'pellam', 'bran', 'isolde'];
