// THE WORLD: Forseason, a round continent. Realms, 25 castles, 36 roads, quest sites, regional pools, starting state.
// Positions are world units on the 1024 x 1024 map (north up).

/* ---- realms ---- */
const RE = (id, o) => G.def('realm', id, o);
RE('verdance', { name: 'Kingdom of Verdance', short: 'Verdance', season: 'spring', color: '#4caf50', trim: '#f0e6c8', sigil: 'blossom', banner: 'swallowtail', ruler: 'gareth', capital: 'avalorn', mana: 120, pitch: ['The orchard kingdom of the east.', 'Wake the sleeping Keeper; restore the Concord.'], aggression: 1.0 });
RE('solmark', { name: 'Sun-March of Solmark', short: 'Solmark', season: 'summer', color: '#e0a020', trim: '#b02a2a', sigil: 'sun', banner: 'square', ruler: 'morgause', capital: 'brazenhold', mana: 120, pitch: ['The furnace-throne of the south.', 'Set the Wheel to Summer, on our own terms.'], aggression: 1.15 });
RE('amberlyn', { name: 'Harvest Throne of Amberlyn', short: 'Amberlyn', season: 'autumn', color: '#c86a1e', trim: '#5a3a2a', sigil: 'oak', banner: 'pointed', ruler: 'pellam', capital: 'ambergate', mana: 120, pitch: ['The harvest halls of the west.', 'End the war with the fewest dead.'], aggression: .85 });
RE('hoarfast', { name: 'Duchy of Hoarfast', short: 'Hoarfast', season: 'winter', color: '#6ab0e8', trim: '#e8f4ff', sigil: 'snowflake', banner: 'triangle', ruler: 'mordrain', capital: 'rimeholt', mana: 120, pitch: ['The frozen court of the north.', 'A winter where nothing rots and nothing ends.'], aggression: 1.0 });
RE('dominion', { name: 'Hourless Dominion', short: 'Dominion', season: 'hour', color: '#3a3a46', trim: '#d8c070', sigil: 'hourglass', banner: 'long', ruler: 'meliant', capital: 'meridian', mana: 300, ai: true, aggression: 0 });
RE('brigands', { name: 'Free Companies', short: 'Brigands', season: null, color: '#7a6a5a', trim: '#2a2a2a', sigil: 'axes', banner: 'ragged', ruler: null, capital: null, mana: 0, ai: true, aggression: 0 });
G.PLAYABLE = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];
G.REALMS = ['verdance', 'solmark', 'amberlyn', 'hoarfast', 'dominion', 'brigands'];

/* ---- castles: [id, name, region, tier, owner, mana, map, circle, site, treasury, x, y] ---- */
const CASTLES = [
  ['meridian', 'Meridian, the Calendar City', 'hour', 'capital', 'dominion', 60, 'meridian_clockyard', ['minute', 'clockwork', 'gearhound', 'stillwraith', 'pendulumwyrm'], 'sleepingcourt', 'hourglassrod', 512, 512],
  ['midnight', 'Midnight Keep', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'stillwraith', 'gearhound'], 'bellnoring', 'writ', 512, 392],
  ['dawnwatch', 'Dawnwatch', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'clockwork', 'gearhound'], 'sunrisestair', 'spurs', 632, 512],
  ['noonspire', 'Noonspire', 'hour', 'satellite', 'dominion', 30, 'crossroads', ['clockwork', 'gearhound', 'minute'], 'shadowless', 'signet', 512, 632],
  ['vesperhall', 'Vesper Hall', 'hour', 'satellite', 'dominion', 30, 'ruined_abbey', ['stillwraith', 'minute', 'clockwork'], 'evensong', 'writ', 392, 512],
  ['rimeholt', 'Rimeholt', 'winter', 'capital', 'hoarfast', 40, 'capital_citadel', ['snowkit', 'frostwolf', 'icegolem', 'yeti', 'frostwyrm:winter'], 'silentbells', 'frostplate', 512, 92],
  ['wolfsgate', 'Wolfsgate', 'winter', 'flank', 'hoarfast', 20, 'mountain_pass', ['frostwolf', 'snowkit', 'yeti'], 'howlingscar', 'wintershard', 352, 235],
  ['frostmere', 'Frostmere', 'winter', 'flank', 'hoarfast', 20, 'lakeside', ['snowkit', 'icegolem', 'frostwolf'], 'nimuesmere', 'wardingcharm', 672, 235],
  ['kestrel', 'Kestrel Spire', 'winter', 'inner', 'hoarfast', 25, 'forest_hold', ['frostwolf', 'yeti', 'snowkit'], 'kestreleyrie', 'yewlongbow', 512, 277],
  ['avalorn', 'Avalorn', 'spring', 'capital', 'verdance', 40, 'capital_citadel', ['sproutling', 'pixie', 'unicorn', 'treant', 'rillserpent:spring'], 'queensorchard', 'robeofseasons', 932, 512],
  ['thornwick', 'Thornwick', 'spring', 'flank', 'verdance', 20, 'forest_hold', ['sproutling', 'treant', 'pixie'], 'briarmaze', 'thornmail', 789, 352],
  ['rainmere', 'Rainmere', 'spring', 'flank', 'verdance', 20, 'river_ford', ['rillserpent', 'sproutling', 'pixie'], 'weepingweir', 'springseed', 789, 672],
  ['primrose', 'Primrose Ford', 'spring', 'inner', 'verdance', 25, 'lakeside', ['unicorn', 'pixie', 'sproutling'], 'unicornglade', 'tomeofthaw', 747, 512],
  ['brazenhold', 'Brazenhold', 'summer', 'capital', 'solmark', 40, 'capital_citadel', ['salamander', 'cinderhound', 'sunbird', 'sunmane', 'wyvern:summer'], 'furnacevaults', 'sunforged', 512, 932],
  ['goldspur', 'Goldspur', 'summer', 'flank', 'solmark', 20, 'crossroads', ['salamander', 'cinderhound', 'wyvern:summer'], 'wyvernroost', 'summerember', 672, 789],
  ['cinderwall', 'Cinderwall', 'summer', 'flank', 'solmark', 20, 'mountain_pass', ['cinderhound', 'salamander', 'sunmane'], 'ashdunes', 'hauberk', 352, 789],
  ['lionsreach', 'Lionsreach', 'summer', 'inner', 'solmark', 25, 'hill_fort', ['sunmane', 'sunbird', 'cinderhound'], 'lionsteps', 'bannerpin', 512, 747],
  ['ambergate', 'Ambergate', 'autumn', 'capital', 'amberlyn', 40, 'capital_citadel', ['jacklamp', 'scarecrow', 'ghoul', 'tusker', 'griffin:autumn'], 'harvestvault', 'lanternstaff', 92, 512],
  ['ashbarrow', 'Ashbarrow', 'autumn', 'flank', 'amberlyn', 20, 'ruined_abbey', ['ghoul', 'jacklamp', 'scarecrow'], 'barrowdowns', 'autumnacorn', 235, 352],
  ['russetmoor', 'Russetmoor', 'autumn', 'flank', 'amberlyn', 20, 'marsh_keep', ['tusker', 'jacklamp', 'scarecrow'], 'russetbog', 'horseshoe', 235, 672],
  ['lanternfall', 'Lanternfall', 'autumn', 'inner', 'amberlyn', 25, 'forest_hold', ['jacklamp', 'ghoul', 'scarecrow'], 'lanternroad', 'mendingring', 277, 512],
  ['thawgate', 'Thawgate', 'thaw', 'cross', 'brigands', 30, 'river_ford', ['snowkit', 'sproutling', 'slime', 'bat'], 'breakingice', 'draught', 756, 268],
  ['beltane', 'Beltane Ford', 'beltane', 'cross', 'brigands', 30, 'marsh_keep', ['sproutling', 'salamander', 'slime', 'harpy'], 'oldmill', 'amuletoftides', 756, 756],
  ['lammas', 'Lammas Cross', 'lammas', 'cross', 'brigands', 30, 'crossroads', ['salamander', 'scarecrow', 'skeleton', 'ogre'], 'lammasfair', 'thornwhip', 268, 756],
  ['hallowmere', 'Hallowmere', 'hallow', 'cross', 'brigands', 30, 'ruined_abbey', ['jacklamp', 'snowkit', 'skeleton', 'bat'], 'hollowabbey', 'hawthornbow', 268, 268]
];
G.CROSS = { thaw: ['winter', 'spring'], beltane: ['spring', 'summer'], lammas: ['summer', 'autumn'], hallow: ['autumn', 'winter'] };
for (const [id, name, region, tier, owner, mana, map, circle, site, treasury, x, y] of CASTLES)
  G.def('castle', id, { name, region, tier, owner, mana, map, circle: circle.map(c => { const [sp, season] = c.split(':'); return { sp, season: season || null }; }), site, treasury, pos: [x, y], roads: [] });
/** the seasons a castle's region counts as (cross-quarters count as both neighbours) */
G.regionSeasons = region => (G.CROSS[region] || (G.SEASONS.includes(region) ? [region] : []));
/** the pool region(s) a castle draws quest rewards from */
G.regionPools = region => (G.CROSS[region] || [region]);

/* ---- roads ---- */
const ROADS = 'rimeholt-wolfsgate rimeholt-frostmere wolfsgate-kestrel frostmere-kestrel avalorn-thornwick avalorn-rainmere thornwick-primrose rainmere-primrose brazenhold-goldspur brazenhold-cinderwall goldspur-lionsreach cinderwall-lionsreach ambergate-ashbarrow ambergate-russetmoor ashbarrow-lanternfall russetmoor-lanternfall thawgate-frostmere thawgate-thornwick beltane-rainmere beltane-goldspur lammas-cinderwall lammas-russetmoor hallowmere-ashbarrow hallowmere-wolfsgate kestrel-midnight primrose-dawnwatch lionsreach-noonspire lanternfall-vesperhall midnight-dawnwatch dawnwatch-noonspire noonspire-vesperhall vesperhall-midnight meridian-midnight meridian-dawnwatch meridian-noonspire meridian-vesperhall'.split(' ').map(s => s.split('-'));
G.ROADS = ROADS;
for (const [a, b] of ROADS) { G.get('castle', a).roads.push(b); G.get('castle', b).roads.push(a); }
G.adjacent = (a, b) => G.get('castle', a).roads.includes(b);

/* ---- regional pools ---- */
G.POOLS = {
  winter: { items: ['herb', 'wintershard', 'rimesteel', 'frostplate', 'wardingcharm', 'yewlongbow'], beasts: ['snowkit', 'frostwolf', 'yeti', 'bat'], wanderers: ['galeron', 'ettard'] },
  spring: { items: ['herb', 'springseed', 'tomeofthaw', 'hawthornbow', 'spurs', 'willowstaff'], beasts: ['sproutling', 'pixie', 'unicorn', 'slime'], wanderers: ['galeron'] },
  summer: { items: ['herb', 'summerember', 'sunforged', 'hauberk', 'bannerpin', 'cleaver'], beasts: ['salamander', 'cinderhound', 'sunbird', 'sunmane'], wanderers: ['blanchefleur'] },
  autumn: { items: ['herb', 'autumnacorn', 'lanternstaff', 'horseshoe', 'robeofseasons', 'jerkin'], beasts: ['jacklamp', 'scarecrow', 'ghoul', 'tusker'], wanderers: ['blanchefleur', 'ettard'] },
  hour: { items: ['ether', 'writ', 'hourglassrod', 'signet', 'amuletoftides', 'spurs'], beasts: ['minute', 'gearhound'], wanderers: [] }
};

/* ---- quest sites: [id, name, castle, seasons away, focus, extra] ---- */
const SITES = [
  ['silentbells', 'The Lake of Silent Bells', 'rimeholt', 2, 'training', {}, 'A black lake under the citadel, where drowned bells are said to ring.'],
  ['howlingscar', 'The Howling Scar', 'wolfsgate', 1, 'beast', {}, 'A wind-cut gorge where the frost wolves den.'],
  ['nimuesmere', "Nimue's Mere", 'frostmere', 1, 'treasure', { ettard: true }, 'A mere that never fully freezes; offerings sink there.'],
  ['kestreleyrie', 'The Kestrel Eyrie', 'kestrel', 2, 'wanderer', {}, 'A spire of nests above the pines, a waypoint for travellers.'],
  ['queensorchard', "The Queen's Orchard", 'avalorn', 1, 'treasure', {}, 'The late Queen planted it; its oldest apple has not blossomed.'],
  ['briarmaze', 'The Briar Maze', 'thornwick', 1, 'beast', { beastMul: { unicorn: 2 } }, 'A hedge maze gone wild; unicorns shelter at its heart.'],
  ['weepingweir', 'The Weeping Weir', 'rainmere', 1, 'beast', { addBeasts: ['rillserpent'] }, 'Water falls over the old weir like tears.'],
  ['unicornglade', 'The Unicorn Glade', 'primrose', 2, 'beast', { beastMul: { unicorn: 3 } }, 'A sunlit glade where the herds come to drink.'],
  ['furnacevaults', 'The Furnace Vaults', 'brazenhold', 1, 'treasure', {}, 'Vaults under the furnace-throne, warm as an oven.'],
  ['wyvernroost', 'The Wyvern Roost', 'goldspur', 2, 'beast', { addBeasts: ['wyvern'], beastMul: { wyvern: .5 } }, 'Red cliffs where the wyverns nest.'],
  ['ashdunes', 'The Ash Dunes', 'cinderwall', 1, 'mana', {}, 'Grey dunes where old fires left mana in the sand.'],
  ['lionsteps', 'The Lion Steps', 'lionsreach', 1, 'wanderer', { beastMul: { sunmane: 2 } }, 'Carved steps where the sunmanes bask.'],
  ['harvestvault', 'The Harvest Vault', 'ambergate', 1, 'treasure', {}, 'A granary-vault older than the throne.'],
  ['barrowdowns', 'The Barrow Downs', 'ashbarrow', 1, 'beast', { mishap: 5 }, 'Grave-mounds where the dead do not rest easily.'],
  ['russetbog', 'The Russet Bog', 'russetmoor', 1, 'beast', { beastMul: { tusker: 2 } }, 'A red bog; the tuskers wallow there.'],
  ['lanternroad', 'The Lantern Road', 'lanternfall', 2, 'wanderer', { ettard: true }, 'A road of lanterns lit for the dead.'],
  ['breakingice', 'The Breaking Ice', 'thawgate', 1, 'mana', { addItems: ['draught'] }, 'A river where the ice cracks like thunder each thaw.'],
  ['oldmill', 'The Old Mill of Beltane', 'beltane', 1, 'treasure', { story: 'lunete' }, 'A mill on the ford, whose wheel no longer turns.'],
  ['lammasfair', 'The Lammas Fair', 'lammas', 1, 'wanderer', { story: 'blanchefleur' }, 'A brigand fair where anything is for sale.'],
  ['hollowabbey', 'The Hollow Abbey Crypts', 'hallowmere', 2, 'treasure', { addBeasts: ['skeleton', 'bat'], ettard: true }, 'Crypts beneath an abbey of empty bells.'],
  ['bellnoring', "The Bell That Doesn't Ring", 'midnight', 2, 'treasure', {}, 'A great bell, cracked at the Thirteenth Hour.'],
  ['sunrisestair', 'The Sunrise Stair', 'dawnwatch', 1, 'treasure', {}, 'A stair that climbs toward a sunrise that never quite comes.'],
  ['shadowless', 'The Shadowless Square', 'noonspire', 1, 'mana', {}, 'A square where nothing casts a shadow.'],
  ['evensong', 'The Evensong Crypt', 'vesperhall', 2, 'treasure', {}, 'A crypt where the evening hymn never ends.'],
  ['sleepingcourt', 'The Sleeping Court', 'meridian', 2, 'treasure', { keeper: true }, 'The court where the Keeper sleeps between two seconds.']
];
for (const [id, name, castle, away, focus, extra, desc] of SITES) G.def('site', id, Object.assign({ name, castle, away, focus, desc }, extra));

/* ---- quest outcomes: base weights ---- */
G.QUEST_OUTCOMES = [['treasure', 30], ['beast', 20], ['wanderer', 10], ['mana', 15], ['training', 15], ['mishap', 10]];
G.QUEST_GOOD = ['treasure', 'beast', 'wanderer', 'mana'];

/* ---- starting state ---- */
G.START_RESERVE = { avalorn: [['sproutling', 2], ['sproutling', 2]], brazenhold: [['salamander', 2], ['salamander', 2]], ambergate: [['jacklamp', 2], ['jacklamp', 2]], rimeholt: [['snowkit', 2], ['snowkit', 2]], meridian: [['minute', 10], ['minute', 10]] };
G.START_ITEMS = {
  verdance: ['herb', 'herb', 'remedy', 'springseed'], solmark: ['herb', 'herb', 'remedy', 'summerember'],
  amberlyn: ['herb', 'herb', 'remedy', 'autumnacorn'], hoarfast: ['herb', 'herb', 'remedy', 'wintershard'],
  dominion: ['ether', 'ether', 'ether'], brigands: []
};
G.TIER_MANA = { capital: 40, inner: 25, flank: 20, cross: 30, satellite: 30 };
