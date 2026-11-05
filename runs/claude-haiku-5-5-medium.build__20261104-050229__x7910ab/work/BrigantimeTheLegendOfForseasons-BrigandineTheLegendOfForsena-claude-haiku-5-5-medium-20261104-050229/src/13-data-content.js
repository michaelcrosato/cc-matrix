// The rest of the content: dials and the gate, more skills, promotions, 22 more monster species (every species now has
// three forms), 10 more battle maps (the Clockwork Sanctum among them), 16 more knights, 9 more castles and their roads,
// and 20 more items. Each table is data: the sims and the scenes read it, and the data suite checks its references.

// ---- terrain for the Clockwork Sanctum: dials turn when a unit ends a move on them; the gate opens when they agree ----
G.def('terrain', 'dial', { name: 'Dial', cost: 1, def: 0, hit: 0, glyph: 'D' });
G.def('terrain', 'gate', { name: 'Gate', cost: Infinity, def: 0, hit: 0, glyph: 'G' });
G.TERRAIN_OF_GLYPH['D'] = 'dial';
G.TERRAIN_OF_GLYPH['G'] = 'gate';

G.PROMOTE_LEVEL = { 2: 10, 3: 20 };
G.PROMOTE_COST = { 2: 6, 3: 12 };

// ---- monster species: 22 more; each family has three forms. Tier 2 and 3 grow from tier 1 by the same rule ----
const grow = (f, tier, name, skill) => {
  if (tier === 2) return Object.assign({}, f, { name, hp: Math.round(f.hp * 1.45), atk: f.atk + 2, def: f.def + 1, size: f.size === 'S' ? 'M' : f.size, cost: f.cost + 2, skill });
  return Object.assign({}, f, { name, hp: Math.round(f.hp * 1.9), atk: f.atk + 4, def: f.def + 2, size: f.size === 'L' ? 'L' : 'L', cost: f.cost + 4, skill });
};
const FAMILY = (id, name, element, look, base, skills, names) => {
  const f1 = Object.assign({}, base, { name: names[0], skill: skills[0] }), f2 = grow(f1, 2, names[1], skills[1]), f3 = grow(f2, 3, names[2], skills[2]);
  G.def('species', id, { name, element, look, forms: [f1, f2, f3] });
};
// the eight species of the first bestiary gain a third form
for (const [id, name, skill, lbl] of [['gleam-slime', 'Gleam Slime', 'drain', 'Ooze Tyrant'], ['dusk-bat', 'Dusk Bat', 'drain', 'Vesper Lord'],
  ['thorn-hare', 'Thorn Hare', 'guard', 'Briar Thane'], ['cinder-imp', 'Cinder Imp', 'breath', 'Forge Tyrant'],
  ['frost-wisp', 'Frost Wisp', 'frost', 'Glacier Spirit'], ['storm-pixie', 'Storm Pixie', 'thunder', 'Storm Sovereign'],
  ['stone-golem', 'Stone Golem', 'rally', 'Basalt Titan'], ['bonewalker', 'Bonewalker', 'charge', 'Dread Sovereign']]) {
  const sp = G.get('species', id);
  sp.forms.push(grow(sp.forms[1], 3, lbl, skill));
}
const B = (hp, atk, def, mov, rng, size, skill, cost) => ({ hp, atk, def, mov, rng, size, skill, cost });
const BL = (kind, extra) => Object.assign({ kind }, extra);
FAMILY('moss-toad', 'Moss Toad', 'verdant', BL('blob', { R: 7, feet: true, mouth: true, colors: { dk: '#2e5a2a', base: '#6aa04a', lt: '#b8d890', spec: '#f0ffe0', eye: '#ffe870', pupil: '#101a08' } }), B(15, 4, 2, 2, 1, 'S', null, 2), ['drain', 'venom', 'guard'], ['Moss Toad', 'Bog Toad', 'Marsh Behemoth']);
FAMILY('lantern-moth', 'Lantern Moth', 'ambered', BL('beast', { body: 'avian', R: 5, wings: true, colors: { dk: '#6a4a10', base: '#e8c060', lt: '#fff0b0', spec: '#ffffff', eye: '#ff8040', pupil: '#201004' } }), B(10, 5, 1, 5, 2, 'S', 'frost', 3), ['frost', 'pierce', 'haste'], ['Lantern Moth', 'Glow Moth', 'Lantern Queen']);
FAMILY('cave-crawler', 'Cave Crawler', 'hour', BL('blob', { R: 5, feet: true, mouth: 'fangs', colors: { dk: '#1a1426', base: '#4a3e66', lt: '#7a6ea0', spec: '#c8c0e8', eye: '#ff5a8a', pupil: '#100010' } }), B(12, 5, 2, 3, 1, 'S', 'venom', 2), ['venom', 'drain', 'venom'], ['Cave Crawler', 'Hollow Crawler', 'Deep Crawler']);
FAMILY('ember-fox', 'Ember Fox', 'solar', BL('beast', { body: 'quadruped', R: 6, ears: 'cat', tail: true, feet: true, colors: { dk: '#7a2a10', base: '#ff8a40', lt: '#ffd0a0', spec: '#fff4e0', eye: '#fff080', pupil: '#301008' } }), B(12, 6, 1, 4, 1, 'S', 'cinder-bolt', 3), ['cinder-bolt', 'stun-strike', 'crush'], ['Ember Fox', 'Blaze Fox', 'Pyre Fox']);
FAMILY('glass-serpent', 'Glass Serpent', 'rime', BL('beast', { body: 'serpent', R: 6, tail: true, mouth: 'fangs', colors: { dk: '#2a4a7a', base: '#8ac0f0', lt: '#e0f4ff', spec: '#ffffff', eye: '#ffffff', pupil: '#0a1828' } }), B(14, 6, 2, 3, 1, 'M', 'venom', 3), ['venom', 'pierce', 'frost'], ['Glass Serpent', 'Crystal Wyrm', 'Glass Leviathan']);
FAMILY('thorn-wight', 'Thorn Wight', 'verdant', BL('blob', { R: 6, horns: true, colors: { dk: '#2a4a20', base: '#5a8a3a', lt: '#9ac870', spec: '#e8ffd0', eye: '#ffe060', pupil: '#101808' } }), B(14, 5, 2, 3, 2, 'M', 'thunder', 3), ['thunder', 'pierce', 'shield'], ['Thorn Wight', 'Briar Wight', 'Thorn King']);
FAMILY('sun-hound', 'Sun Hound', 'solar', BL('beast', { body: 'quadruped', R: 6, ears: 'cat', feet: true, tail: true, mouth: true, colors: { dk: '#8a4a10', base: '#e8a030', lt: '#ffe080', spec: '#fff8d0', eye: '#fff4a0', pupil: '#2a1400' } }), B(13, 6, 2, 4, 1, 'M', 'crush', 3), ['crush', 'sweep', 'warhowl'], ['Sun Hound', 'Dawn Hound', 'Noon Hound']);
FAMILY('tide-eel', 'Tide Eel', 'rime', BL('beast', { body: 'serpent', R: 5, tail: true, colors: { dk: '#1a3a5a', base: '#4aa0c8', lt: '#a0e0f0', spec: '#e0ffff', eye: '#ffffff', pupil: '#041020' } }), B(11, 5, 1, 3, 1, 'S', 'drain', 2), ['drain', 'stun-strike', 'shield'], ['Tide Eel', 'Surge Eel', 'Tide Leviathan']);
FAMILY('iron-sentinel', 'Iron Sentinel', 'hour', BL('human', { build: 'bulky', size: 1.45, colors: { cloth: '#5a5a66', skin: '#7a7a88', metal: '#c8c8d8' } }), B(28, 7, 7, 2, 1, 'L', 'bone-ward', 5), ['bone-ward', 'crush', 'shield'], ['Iron Sentinel', 'Iron Bastion', 'Iron Colossus']);
FAMILY('gloom-owl', 'Gloom Owl', 'ambered', BL('beast', { body: 'avian', R: 6, wings: true, horns: true, colors: { dk: '#3a2a10', base: '#8a6a30', lt: '#c8a060', spec: '#fff0c0', eye: '#ffe060', pupil: '#100800' } }), B(11, 5, 1, 5, 2, 'S', 'dusk-hex', 3), ['dusk-hex', 'pierce', 'haste'], ['Gloom Owl', 'Dusk Owl', 'Night Owl']);
FAMILY('orchard-sprite', 'Orchard Sprite', 'verdant', BL('blob', { R: 5, wings: true, colors: { dk: '#4a7a20', base: '#b8e860', lt: '#f0ffa0', spec: '#ffffff', eye: '#ffffff', pupil: '#102000' } }), B(9, 3, 1, 4, 2, 'S', 'mend', 2), ['mend', 'mend-greater', 'mend-greater'], ['Orchard Sprite', 'Orchard Fairy', 'Orchard Queen']);
FAMILY('bell-spider', 'Bell Spider', 'hour', BL('blob', { R: 6, feet: true, colors: { dk: '#2a2030', base: '#7a6a8a', lt: '#c0b0d8', spec: '#f4f0ff', eye: '#ffd070', pupil: '#100810' } }), B(12, 5, 3, 3, 1, 'M', 'venom', 3), ['venom', 'sweep', 'chain-lightning'], ['Bell Spider', 'Chime Spider', 'Carillon Spider']);
FAMILY('drake-whelp', 'Drake Whelp', 'solar', BL('beast', { body: 'drake', R: 7, horns: true, wings: true, tail: true, mouth: 'fangs', colors: { dk: '#6a1a0a', base: '#d85030', lt: '#ffa070', spec: '#ffe0c0', eye: '#fff060', pupil: '#2a0800' } }), B(16, 7, 3, 3, 2, 'M', 'breath', 5), ['breath', 'cinder-bolt', 'breath'], ['Drake Whelp', 'Young Drake', 'Elder Drake']);
FAMILY('hoar-yeti', 'Hoar Yeti', 'rime', BL('human', { build: 'bulky', size: 1.4, colors: { cloth: '#c0d8e8', skin: '#e8f4ff', metal: '#9ac0d8' } }), B(24, 7, 4, 2, 1, 'L', 'crush', 4), ['crush', 'frost', 'guard'], ['Hoar Yeti', 'Rime Yeti', 'Hoarfrost Yeti']);
FAMILY('salt-gull', 'Salt Gull', 'ambered', BL('beast', { body: 'avian', R: 5, wings: true, mouth: true, colors: { dk: '#5a6a7a', base: '#e8ecf0', lt: '#ffffff', spec: '#ffffff', eye: '#ffb040', pupil: '#101010' } }), B(9, 4, 1, 5, 2, 'S', 'pierce', 2), ['pierce', 'venom', 'haste'], ['Salt Gull', 'Storm Gull', 'Gale Gull']);
FAMILY('amber-beetle', 'Amber Beetle', 'ambered', BL('blob', { R: 6, horns: true, feet: true, colors: { dk: '#5a3a08', base: '#c88a20', lt: '#f0c060', spec: '#fff0c0', eye: '#ffffff', pupil: '#100800' } }), B(15, 5, 4, 2, 1, 'M', 'guard', 3), ['guard', 'shield', 'bone-ward'], ['Amber Beetle', 'Amber Stag', 'Amber Behemoth']);
FAMILY('reed-wraith', 'Reed Wraith', 'verdant', BL('human', { build: 'skeleton', size: 1.3, colors: { bone: '#b8d8a0', cloth: '#2a4a2a' } }), B(13, 6, 1, 4, 1, 'M', 'drain', 3), ['drain', 'venom', 'drain'], ['Reed Wraith', 'Mire Wraith', 'Reed Lich']);
FAMILY('frost-mite', 'Frost Mite', 'rime', BL('blob', { R: 4, feet: true, colors: { dk: '#4a6a8a', base: '#c0e8ff', lt: '#ffffff', spec: '#ffffff', eye: '#ff6080', pupil: '#101820' } }), B(7, 3, 1, 4, 1, 'S', 'frost', 2), ['frost', 'stun-strike', 'shield'], ['Frost Mite', 'Hoar Mite', 'Rime Mite']);
FAMILY('sunflower-ogre', 'Sunflower Ogre', 'solar', BL('human', { build: 'bulky', size: 1.5, colors: { cloth: '#c89a30', skin: '#a8703a', metal: '#e8c060' } }), B(26, 7, 4, 2, 1, 'L', 'sweep', 5), ['sweep', 'crush', 'warhowl'], ['Sunflower Ogre', 'Sun Ogre', 'Sunforge Ogre']);
FAMILY('wyrm-slug', 'Wyrm Slug', 'hour', BL('blob', { R: 8, mouth: true, colors: { dk: '#2a1a30', base: '#6a4a7a', lt: '#9a80b0', spec: '#d8c8f0', eye: '#ffe0ff', pupil: '#100010' } }), B(20, 4, 3, 1, 1, 'M', 'venom', 4), ['venom', 'drain', 'venom'], ['Wyrm Slug', 'Mire Wyrm', 'Hour Wyrm']);
FAMILY('mirror-imp', 'Mirror Imp', 'hour', BL('blob', { R: 5, horns: true, tail: true, colors: { dk: '#4a4a6a', base: '#c8c8e8', lt: '#ffffff', spec: '#ffffff', eye: '#ff80e0', pupil: '#100010' } }), B(10, 6, 1, 4, 2, 'S', 'chain-lightning', 4), ['chain-lightning', 'dusk-hex', 'haste'], ['Mirror Imp', 'Glass Imp', 'Mirror King']);
FAMILY('clock-hound', 'Clock Hound', 'hour', BL('blob', { R: 6, ears: 'cat', feet: true, tail: true, colors: { dk: '#3a3a48', base: '#8a8aa0', lt: '#c8c8e0', spec: '#ffffff', eye: '#ffd060', pupil: '#101010' } }), B(14, 6, 3, 4, 1, 'M', 'charge', 4), ['charge', 'stun-strike', 'charge'], ['Clock Hound', 'Gear Hound', 'Hour Hound']);

// ---- 10 more battle maps (13 in all). The Clockwork Sanctum is the final battle at Meridian: three dials, a gate, the keep ----
const MAP = (id, name, season, rows, o = {}) => G.def('map', id, Object.assign({ name, season, keep: true, rows }, o));
MAP('river-crossing', 'River Crossing', 'spring', ['aa.f.~~~..b', 'a..h.~=~.b.', 'a.f..~=~..b', '..h..~=~...', 'a..f..=..K.', 'a..m.~=~.bb', 'aa.f..~..b.', 'a.h...~...b', 'aa.f.~~~.bb']);
MAP('marsh-road', 'Marsh Road', 'spring', ['aa.mm.....b', 'a..mmh....b', 'a.f.mm..h.b', '..f.hmm..bb', 'a..r..f..K.', 'a.h..mmf.b.', 'aa..m.hh.bb', 'a..f..m..b.', 'aa..h...bbb']);
MAP('hilltop-fort', 'Hilltop Fort', 'autumn', ['a..hhh...b.', 'a.h...h..bb', 'aa..#.#..b.', 'a.f.#K#.f.b', 'a..f.#..f..', 'a.h..#...b.', 'aa.hhh..bb.', 'a..f...hbb.', 'aa.hhh.bbb.']);
MAP('clockwork-sanctum', 'The Clockwork Sanctum', 'winter', ['a..###..bb.', 'a.D.#.#.D.b', 'aa...#...b.', 'a..#.G.#..b', 'a..D.K...b.', 'a.#..#...b.', 'aa.#...#.bb', 'a..#####..b', 'a...###...b'], { keep: true, sanctum: true, dials: true });
MAP('orchard-lane', 'Orchard Lane', 'summer', ['a.f...f...b', 'a..h.f..h.b', 'aa..f..r.bb', 'a.r..~~~..b', '..f.~~=~.f.', 'a..f..=.hh.', 'a.h..~=~..b', 'aa..~~~.f.b', 'a.f..K...bb']);
MAP('bog-village', 'Bog Village', 'summer', ['aa.m.m.r..b', 'a.mhm..r.bb', 'a..m.r.mm.b', 'a.f..h..m.b', '..r.K..f..b', 'a..f.h.m..b', 'a.m.mr...bb', 'aa.h..f..bb', 'a..m..m.bbb']);
MAP('frozen-lake', 'Frozen Lake', 'winter', ['aa.~~~~...b', 'a..~..~..bb', 'a.h~..~.h.b', '..f~.K~.f.b', 'a..~...~..b', 'a.h~.~~.f.b', 'aa..~~..h.b', 'a..f.~..h.b', 'aa.h.~~..bb']);
MAP('ruined-bridge', 'Ruined Bridge', 'autumn', ['a..rr.rr..b', 'a.r.~~~.r.b', 'a..~=~=~..b', 'a.f~=~=~.fb', 'a..f~=~..Kb', 'a.r..~~~..b', 'aa..r.r...b', 'a.f....h.bb', 'aa.h..r..bb']);
MAP('thorn-hollow', 'Thorn Hollow', 'spring', ['a.f.h.f..bb', 'aa..fff..b.', 'a.f.h..h.bb', 'a..m..K..b.', 'a.h.m.m.f.b', 'aa.mm.hh..b', 'a..f.m..hbb', 'a.h..ff..bb', 'aa..f...bbb']);
MAP('open-field', 'Open Field', 'summer', ['aa........b', 'a.........b', 'a....h....b', 'a..h.....fb', 'a...K.....b', 'a.f.....h.b', 'a.........b', 'a.h.....f.b', 'aa........b']);
// the map a campaign battle uses for each castle: the Sanctum for Meridian, otherwise a map of the castle's season
G.MAP_FOR_CASTLE = { meridian: 'clockwork-sanctum', stillhold: 'hilltop-fort', bellgate: 'frozen-lake', thornpass: 'thorn-hollow', blackhollow: 'bog-village' };
G.MAP_POOL = ['meadow', 'ford', 'keep', 'river-crossing', 'marsh-road', 'hilltop-fort', 'orchard-lane', 'bog-village', 'frozen-lake', 'ruined-bridge', 'thorn-hollow', 'open-field'];

// ---- 16 more knights: four per realm, six Dominion knights (the Gray Knight is separate), five free knights, four captains ----
const KN = (id, o) => G.def('knight', id, Object.assign({ mov: 3, bond: 3, skill: null, leader: false, level: 2, items: [], start: null, look: {}, voice: {}, quote: '' }, o));
const look = (hat, hair, outfit, colors, extra = {}) => Object.assign({ hat, hair, outfit, colors }, extra);
KN('liss', { name: 'Liss', title: 'Warden of Briarwatch', realm: 'verdance', element: 'verdant', cls: 'archer', hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'briarwatch', look: look('band', 'long', 'tunic', { cloth: '#4a7a3a', hair: '#c8a040', trim: '#e8f0a0' }), voice: { pitch: 280, lilt: 1.3 }, quote: 'Briars grow where I want them to.' });
KN('corwen', { name: 'Corwen', title: 'Mistmere Lancer', realm: 'verdance', element: 'verdant', cls: 'squire', hp: 21, atk: 7, def: 3, mov: 4, rng: 1, bond: 3, start: 'mistmere', look: look('helmet', 'short', 'shirt', { cloth: '#3a6a4a', hair: '#2a2a2a' }), voice: { pitch: 150, lilt: .9 }, quote: 'Mist hides the ford. It does not hide the horse.' });
KN('aster', { name: 'Aster', title: 'Goldenvale Scholar', realm: 'solmark', element: 'solar', cls: 'adept', hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'goldenvale', look: look('pointed', 'long', 'robe', { cloth: '#8a4a20', hair: '#f0c060', trim: '#ffe080' }), voice: { pitch: 320, lilt: 1.35 }, quote: 'Gold is only sunlight that has agreed to stay.' });
KN('bram', { name: 'Bram', title: 'of the Redmarch', realm: 'solmark', element: 'solar', cls: 'squire', hp: 22, atk: 7, def: 4, mov: 3, rng: 1, bond: 3, start: 'redmarch', look: look('helmet', 'spiky', 'coat', { cloth: '#b04a2a', coat: '#7a2a18', trim: '#ffb060', hair: '#4a2a10' }), voice: { pitch: 130, lilt: .8 }, quote: 'Mark the march, then march.' });
KN('tavin', { name: 'Tavin', title: 'Saltmere Reeve', realm: 'amberlyn', element: 'ambered', cls: 'squire', hp: 22, atk: 6, def: 4, mov: 3, rng: 1, bond: 3, start: 'saltmere', look: look('cap', 'short', 'coat', { cloth: '#7a6a3a', coat: '#5a4a2a', trim: '#e8d890', hair: '#5a4020' }), voice: { pitch: 190, lilt: 1 }, quote: 'Salt keeps the grain and the gate alike.' });
KN('pell', { name: 'Pell', title: 'Orchard Bowman', realm: 'amberlyn', element: 'ambered', cls: 'archer', hp: 15, atk: 6, def: 2, mov: 4, rng: 2, bond: 3, start: 'orchard', look: look('cap', 'bald', 'tunic', { cloth: '#8a7a3a', hair: '#3a2a1a' }), voice: { pitch: 240, lilt: 1.1 }, quote: 'Every apple I drop, I catch again.' });
KN('sorrel', { name: 'Sorrel', title: 'Coldharbour Spear', realm: 'hoarfast', element: 'rime', cls: 'squire', hp: 21, atk: 7, def: 4, mov: 4, rng: 1, bond: 3, start: 'coldharbour', look: look('helmet', 'ponytail', 'shirt', { cloth: '#3a5a7a', hair: '#b8e0f0' }), voice: { pitch: 200, lilt: 1.05 }, quote: 'Cold steel, warm heart, sharp view.' });
KN('undine', { name: 'Undine', title: 'Glassrise Seer', realm: 'hoarfast', element: 'rime', cls: 'adept', hp: 16, atk: 6, def: 2, mov: 3, rng: 2, bond: 3, start: 'glassrise', look: look('pointed', 'long', 'robe', { cloth: '#2a4a7a', hair: '#e8f8ff', trim: '#a0e0ff' }), voice: { pitch: 300, lilt: 1.2 }, quote: 'Glass shows what the ice means to keep.' });
KN('mire', { name: 'Mire', title: 'Bellgate Thrall', realm: 'dominion', element: 'hour', cls: 'squire', hp: 22, atk: 7, def: 5, mov: 3, rng: 1, bond: 3, start: 'bellgate', look: look('helmet', 'bald', 'coat', { cloth: '#2a2438', coat: '#1a1628', trim: '#7a68b0', metal: '#585070' }), voice: { pitch: 110, lilt: .75 }, quote: 'The bell rings once, and everything waits.' });
KN('hollis', { name: 'Hollis', title: 'Stillhold Lancer', realm: 'dominion', element: 'hour', cls: 'squire', hp: 22, atk: 8, def: 4, mov: 4, rng: 1, bond: 3, start: 'stillhold', look: look('helmet', 'short', 'shirt', { cloth: '#3a3050', hair: '#c8c0d8' }), voice: { pitch: 175, lilt: .9 }, quote: 'Nothing moves in Stillhold. Nothing.' });
KN('nocturne', { name: 'Nocturne', title: 'Bellgate Mage', realm: 'dominion', element: 'hour', cls: 'hourmaiden', hp: 17, atk: 7, def: 2, mov: 3, rng: 2, bond: 3, start: 'bellgate', look: look('pointed', 'long', 'robe', { cloth: '#1a1630', hair: '#7a68b0', trim: '#c0a8ff' }), voice: { pitch: 290, lilt: 1.15 }, quote: 'Dusk is only the hour I keep for you.' });
KN('drift', { name: 'Drift', title: 'Thornpass Hunter', realm: 'free', element: 'neutral', cls: 'archer', hp: 16, atk: 6, def: 2, mov: 4, rng: 2, bond: 2, start: 'thornpass', look: look('band', 'short', 'tunic', { cloth: '#4a5a3a', hair: '#8a7a50' }), voice: { pitch: 260, lilt: 1.25 }, quote: 'I do not need to be seen to be sure.' });
KN('gorse', { name: 'Gorse', title: 'Blackhollow Brawler', realm: 'free', element: 'neutral', cls: 'tamer', hp: 22, atk: 6, def: 4, mov: 3, rng: 1, bond: 2, start: 'blackhollow', look: look('cap', 'bald', 'shirt', { cloth: '#5a4a2a', hair: '#2a1a0a' }), voice: { pitch: 120, lilt: .85 }, quote: 'Hit first, ask later.' });
KN('quill', { name: 'Quill', title: 'Traveling Scribe-Blade', realm: 'free', element: 'neutral', cls: 'adept', hp: 15, atk: 6, def: 1, mov: 3, rng: 2, bond: 2, start: 'blackhollow', look: look('pointed', 'long', 'robe', { cloth: '#4a3a5a', hair: '#e0d0a0' }), voice: { pitch: 310, lilt: 1.4 }, quote: 'Every road I have walked is written down.' });
KN('raven', { name: 'Raven', title: 'Thorn Road Captain', realm: 'free', element: 'neutral', cls: 'brigand', hp: 20, atk: 7, def: 3, mov: 4, rng: 1, bond: 2, start: 'thornpass', look: look('cap', 'spiky', 'coat', { cloth: '#1a1a1a', coat: '#0e0e0e', hair: '#101010' }), voice: { pitch: 145, lilt: .95 }, quote: 'The road is ours on alternate Tuesdays.' });
KN('skint', { name: 'Skint', title: 'Blackhollow Pawnbroker', realm: 'free', element: 'neutral', cls: 'brigand', hp: 18, atk: 6, def: 3, mov: 3, rng: 1, bond: 2, start: 'blackhollow', look: look('band', 'bald', 'shirt', { cloth: '#6a5a3a', hair: '#a09070' }), voice: { pitch: 230, lilt: 1.1 }, quote: 'Everything has a price. I write the receipts.' });

// ---- nine more castles (25 in all) and their roads ----
const CASTLE2 = (id, name, realm, x, y, o = {}) => G.def('castle', id, Object.assign({ name, realm, x, y, yield: 3, capital: false }, o));
CASTLE2('briarwatch', 'Briarwatch', 'verdance', 300, 140);
CASTLE2('mistmere', 'Mistmere', 'verdance', 110, 130);
CASTLE2('goldenvale', 'Goldenvale', 'solmark', 700, 140);
CASTLE2('redmarch', 'Redmarch', 'solmark', 900, 200);
CASTLE2('saltmere', 'Saltmere', 'amberlyn', 650, 870);
CASTLE2('orchard', 'Orchard', 'amberlyn', 900, 820);
CASTLE2('coldharbour', 'Coldharbour', 'hoarfast', 120, 880);
CASTLE2('glassrise', 'Glassrise', 'hoarfast', 320, 860);
CASTLE2('bellgate', 'Bellgate', 'dominion', 500, 640, { yield: 4 });
G.ROADS.push(['briarwatch', 'mossgate'], ['briarwatch', 'ferncrest'], ['briarwatch', 'thornpass'],
  ['mistmere', 'mossgate'], ['mistmere', 'larkhold'], ['goldenvale', 'brightwall'], ['goldenvale', 'emberfall'],
  ['redmarch', 'brightwall'], ['redmarch', 'sunspire'], ['saltmere', 'harrowvale'], ['saltmere', 'gildmere'],
  ['orchard', 'quillon'], ['orchard', 'gildmere'], ['coldharbour', 'frostwatch'], ['coldharbour', 'icehollow'],
  ['glassrise', 'rimecrag'], ['glassrise', 'frostwatch'], ['bellgate', 'meridian'], ['bellgate', 'harrowvale'], ['bellgate', 'rimecrag']);

// ---- 20 more items (33 in all) ----
const ITEM = (id, name, desc, atk, def, mov, extra = {}) => G.def('item', id, Object.assign({ name, desc, atk, def, mov, icon: id }, extra));
ITEM('ash-cloak', 'Ash Cloak', 'Defence +1. Smells of old fires.', 0, 1, 0);
ITEM('thorn-mail', 'Thorn Mail', 'Defence +3. Scratches the wearer too.', 0, 3, 0);
ITEM('quick-sash', 'Quick Sash', 'Move +1. Tied in a hurry.', 0, 0, 1);
ITEM('sun-torque', 'Sun Torque', 'Attack +1. Holds a little daylight.', 1, 0, 0);
ITEM('rime-blade', 'Rime Blade', 'Attack +3. Frosts the hand that holds it.', 3, 0, 0);
ITEM('oak-bow', 'Oak Bow', 'Attack +2. For those who can wait.', 2, 0, 0);
ITEM('lodestone', 'Lodestone', 'Defence +2. Pulls at the wrong blades.', 0, 2, 0);
ITEM('wayfarer-cape', 'Wayfarer Cape', 'Move +1, defence +1. Very well travelled.', 0, 1, 1);
ITEM('hourglass-charm', 'Hourglass Charm', 'Move +2. Counts the seconds for you.', 0, 0, 2);
ITEM('emberstone', 'Emberstone', 'Attack +2, defence +1. Warm in the hand.', 2, 1, 0);
ITEM('verdant-seed', 'Verdant Seed', 'Mends a knight for 4 HP when a battle begins.', 0, 0, 0, { heal: 4 });
ITEM('saltbread', 'Saltbread', 'Mends a knight for 6 HP when a battle begins.', 0, 0, 0, { heal: 6 });
ITEM('tide-pearl', 'Tide Pearl', 'Defence +2. Cool to the touch.', 0, 2, 0);
ITEM('glass-buckler', 'Glass Buckler', 'Defence +2. It shows you the blow coming.', 0, 2, 0);
ITEM('banner-of-amber', 'Banner of Amber', 'Attack +2. Carried high on the march.', 2, 0, 0);
ITEM('bellrope', 'Bellrope', 'Move +1, attack +1. Rings when you move.', 1, 0, 1);
ITEM('mirror-shard', 'Mirror Shard', 'Attack +1, defence +1. Shows a second you.', 1, 1, 0);
ITEM('gilded-spur', 'Gilded Spur', 'Move +2. Expensive and very noisy.', 0, 0, 2);
ITEM('frostcoat', 'Frostcoat', 'Defence +3, move -1. Heavy with rime.', 0, 3, -1);
ITEM('clockwork-key', 'Clockwork Key', 'Attack +1, move +1. Opens something, somewhere.', 1, 0, 1);
ITEM('iron-gauntlet', 'Iron Gauntlet', 'Attack +1, defence +1.', 1, 1, 0);
ITEM('sunstone-ring', 'Sunstone Ring', 'Attack +1. Glows in the dark.', 1, 0, 0);
ITEM('shadow-shawl', 'Shadow Shawl', 'Defence +2. Hides the wearer from the sun.', 0, 2, 0);
ITEM('reed-flute', 'Reed Flute', 'Mends a knight for 3 HP when a battle begins.', 0, 0, 0, { heal: 3 });
ITEM('healer-kit', 'Healer\'s Kit', 'Mends a knight for 10 HP when a battle begins.', 0, 0, 0, { heal: 10 });
ITEM('winged-boots', 'Winged Boots', 'Move +2, defence +0. Do not run in them.', 0, 0, 2);
ITEM('torch', 'Torch', 'Attack +1. Lights the way and the enemy.', 1, 0, 0);
ITEM('bronze-bell', 'Bronze Bell', 'Defence +1. Rings the alarm before a blow.', 0, 1, 0);
