/* ---- THE WORLD: Forseason (§6.1-6.4, §6.11). Positions in world units on a 1024 × 1024 map ---- */
const RE = (id, name, short, season, main, trim, sigil, banner, ruler, capital, o = {}) => G.def('realm', id, Object.assign({ name, short, season, main, trim, sigil, banner, ruler, capital }, o));
RE('verdance', 'Kingdom of Verdance', 'Verdance', 'spring', '#4caf50', '#f0e6c8', 'blossom', 'swallowtail', 'gareth', 'avalorn', { aggression: 1, pitch: ['The orchard prince would wake the Keeper', 'and restore the Concord of the Wheel.'] });
RE('solmark', 'Sun-March of Solmark', 'Solmark', 'summer', '#e0a020', '#b02a2a', 'sun', 'square', 'morgause', 'brazenhold', { aggression: 1.15, pitch: ['A war-loving queen would take the Wheel', 'and set it to a summer of her own.'] });
RE('amberlyn', 'Harvest Throne of Amberlyn', 'Amberlyn', 'autumn', '#c86a1e', '#5a3a2a', 'leaf', 'pointed', 'pellam', 'ambergate', { aggression: .85, pitch: ['An old, quiet king would end the war', 'with the fewest dead.'] });
RE('hoarfast', 'Duchy of Hoarfast', 'Hoarfast', 'winter', '#6ab0e8', '#e8f4ff', 'snowflake', 'triangle', 'mordrain', 'rimeholt', { aggression: 1.1, pitch: ['A mad duke would welcome a winter', 'where nothing rots and nothing ends.'] });
RE('dominion', 'Hourless Dominion', 'Dominion', 'hour', '#4a4a58', '#d8c070', 'hourglass', 'long', 'meliant', 'meridian', { ai: true });
RE('brigands', 'Free Companies', 'Brigands', null, '#7a6a5a', '#2a2a2a', 'axes', 'ragged', null, null, { ai: true });
G.PLAYABLE = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];

const CA = (id, name, region, tier, owner, mana, map, circle, site, treasury, pos) => G.def('castle', id, { name, region, tier, owner, mana, map, circle, site, treasury, pos });
CA('meridian', 'Meridian', 'hour', 'capital', 'dominion', 60, 'meridian_clockyard', ['minute', 'clockwork', 'gearhound', 'stillwraith', 'pendulumwyrm'], 'sleepingcourt', 'hourglassrod', [512, 512]);
CA('midnight', 'Midnight Keep', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'stillwraith', 'gearhound'], 'bellnoring', 'writ', [512, 392]);
CA('dawnwatch', 'Dawnwatch', 'hour', 'satellite', 'dominion', 30, 'hill_fort', ['minute', 'clockwork', 'gearhound'], 'sunrisestair', 'spurs', [632, 512]);
CA('noonspire', 'Noonspire', 'hour', 'satellite', 'dominion', 30, 'crossroads', ['clockwork', 'gearhound', 'minute'], 'shadowless', 'signet', [512, 632]);
CA('vesperhall', 'Vesper Hall', 'hour', 'satellite', 'dominion', 30, 'ruined_abbey', ['stillwraith', 'minute', 'clockwork'], 'evensong', 'writ', [392, 512]);
CA('rimeholt', 'Rimeholt', 'winter', 'capital', 'hoarfast', 40, 'capital_citadel', ['snowkit', 'frostwolf', 'icegolem', 'yeti', 'frostwyrm:winter'], 'silentbells', 'frostplate', [512, 92]);
CA('wolfsgate', 'Wolfsgate', 'winter', 'flank', 'hoarfast', 20, 'mountain_pass', ['frostwolf', 'snowkit', 'yeti'], 'howlingscar', 'wintershard', [352, 235]);
CA('frostmere', 'Frostmere', 'winter', 'flank', 'hoarfast', 20, 'lakeside', ['snowkit', 'icegolem', 'frostwolf'], 'nimuesmere', 'wardingcharm', [672, 235]);
CA('kestrel', 'Kestrel Spire', 'winter', 'inner', 'hoarfast', 25, 'forest_hold', ['frostwolf', 'yeti', 'snowkit'], 'kestreleyrie', 'yewlongbow', [512, 277]);
CA('avalorn', 'Avalorn', 'spring', 'capital', 'verdance', 40, 'capital_citadel', ['sproutling', 'pixie', 'unicorn', 'treant', 'rillserpent:spring'], 'queensorchard', 'robeofseasons', [932, 512]);
CA('thornwick', 'Thornwick', 'spring', 'flank', 'verdance', 20, 'forest_hold', ['sproutling', 'treant', 'pixie'], 'briarmaze', 'thornmail', [789, 352]);
CA('rainmere', 'Rainmere', 'spring', 'flank', 'verdance', 20, 'river_ford', ['rillserpent', 'sproutling', 'pixie'], 'weepingweir', 'springseed', [789, 672]);
CA('primrose', 'Primrose Ford', 'spring', 'inner', 'verdance', 25, 'lakeside', ['unicorn', 'pixie', 'sproutling'], 'unicornglade', 'tomeofthaw', [747, 512]);
CA('brazenhold', 'Brazenhold', 'summer', 'capital', 'solmark', 40, 'capital_citadel', ['salamander', 'cinderhound', 'sunbird', 'sunmane', 'wyvern:summer'], 'furnacevaults', 'sunforged', [512, 932]);
CA('goldspur', 'Goldspur', 'summer', 'flank', 'solmark', 20, 'crossroads', ['salamander', 'cinderhound', 'wyvern:summer'], 'wyvernroost', 'summerember', [672, 789]);
CA('cinderwall', 'Cinderwall', 'summer', 'flank', 'solmark', 20, 'mountain_pass', ['cinderhound', 'salamander', 'sunmane'], 'ashdunes', 'hauberk', [352, 789]);
CA('lionsreach', 'Lionsreach', 'summer', 'inner', 'solmark', 25, 'hill_fort', ['sunmane', 'sunbird', 'cinderhound'], 'lionsteps', 'bannerpin', [512, 747]);
CA('ambergate', 'Ambergate', 'autumn', 'capital', 'amberlyn', 40, 'capital_citadel', ['jacklamp', 'scarecrow', 'ghoul', 'tusker', 'griffin:autumn'], 'harvestvault', 'lanternstaff', [92, 512]);
CA('ashbarrow', 'Ashbarrow', 'autumn', 'flank', 'amberlyn', 20, 'ruined_abbey', ['ghoul', 'jacklamp', 'scarecrow'], 'barrowdowns', 'autumnacorn', [235, 352]);
CA('russetmoor', 'Russetmoor', 'autumn', 'flank', 'amberlyn', 20, 'marsh_keep', ['tusker', 'jacklamp', 'scarecrow'], 'russetbog', 'horseshoe', [235, 672]);
CA('lanternfall', 'Lanternfall', 'autumn', 'inner', 'amberlyn', 25, 'forest_hold', ['jacklamp', 'ghoul', 'scarecrow'], 'lanternroad', 'mendingring', [277, 512]);
CA('thawgate', 'Thawgate', 'thaw', 'cross', 'brigands', 30, 'river_ford', ['snowkit', 'sproutling', 'slime', 'bat'], 'breakingice', 'draught', [756, 268]);
CA('beltane', 'Beltane Ford', 'beltane', 'cross', 'brigands', 30, 'marsh_keep', ['sproutling', 'salamander', 'slime', 'harpy'], 'oldmill', 'amuletoftides', [756, 756]);
CA('lammas', 'Lammas Cross', 'lammas', 'cross', 'brigands', 30, 'crossroads', ['salamander', 'scarecrow', 'skeleton', 'ogre'], 'lammasfair', 'thornwhip', [268, 756]);
CA('hallowmere', 'Hallowmere', 'hallow', 'cross', 'brigands', 30, 'ruined_abbey', ['jacklamp', 'snowkit', 'skeleton', 'bat'], 'hollowcrypts', 'hawthornbow', [268, 268]);
// the seasons of a region: a cross-quarter castle's bonus applies in both of its seasons
G.REGION_SEASONS = { winter: ['winter'], spring: ['spring'], summer: ['summer'], autumn: ['autumn'], hour: [], thaw: ['winter', 'spring'], beltane: ['spring', 'summer'], lammas: ['summer', 'autumn'], hallow: ['autumn', 'winter'] };
G.REGION_DRESS = { winter: 'winter', spring: 'spring', summer: 'summer', autumn: 'autumn', hour: 'hour', thaw: 'winter', beltane: 'spring', lammas: 'summer', hallow: 'autumn' };
G.ROADS = [
  ['rimeholt', 'wolfsgate'], ['rimeholt', 'frostmere'], ['wolfsgate', 'kestrel'], ['frostmere', 'kestrel'],
  ['avalorn', 'thornwick'], ['avalorn', 'rainmere'], ['thornwick', 'primrose'], ['rainmere', 'primrose'],
  ['brazenhold', 'goldspur'], ['brazenhold', 'cinderwall'], ['goldspur', 'lionsreach'], ['cinderwall', 'lionsreach'],
  ['ambergate', 'ashbarrow'], ['ambergate', 'russetmoor'], ['ashbarrow', 'lanternfall'], ['russetmoor', 'lanternfall'],
  ['thawgate', 'frostmere'], ['thawgate', 'thornwick'], ['beltane', 'rainmere'], ['beltane', 'goldspur'],
  ['lammas', 'cinderwall'], ['lammas', 'russetmoor'], ['hallowmere', 'ashbarrow'], ['hallowmere', 'wolfsgate'],
  ['kestrel', 'midnight'], ['primrose', 'dawnwatch'], ['lionsreach', 'noonspire'], ['lanternfall', 'vesperhall'],
  ['midnight', 'dawnwatch'], ['dawnwatch', 'noonspire'], ['noonspire', 'vesperhall'], ['vesperhall', 'midnight'],
  ['meridian', 'midnight'], ['meridian', 'dawnwatch'], ['meridian', 'noonspire'], ['meridian', 'vesperhall']];
G.adj = {};
for (const [a, b] of G.ROADS) { (G.adj[a] = G.adj[a] || []).push(b); (G.adj[b] = G.adj[b] || []).push(a); }
G.YIELD = { capital: 40, inner: 25, flank: 20, cross: 30, satellite: 30 };

// quest sites: castle, seasons away, focus (+10 to that outcome), extras
const SI = (id, name, castle, away, focus, o = {}) => G.def('site', id, Object.assign({ name, castle, away, focus }, o));
SI('silentbells', 'The Lake of Silent Bells', 'rimeholt', 2, 'training'); SI('howlingscar', 'The Howling Scar', 'wolfsgate', 1, 'beast');
SI('nimuesmere', "Nimue's Mere", 'frostmere', 1, 'treasure', { ettard: true }); SI('kestreleyrie', 'The Kestrel Eyrie', 'kestrel', 2, 'wanderer');
SI('queensorchard', "The Queen's Orchard", 'avalorn', 1, 'treasure'); SI('briarmaze', 'The Briar Maze', 'thornwick', 1, 'beast', { beasts: { unicorn: 2 } });
SI('weepingweir', 'The Weeping Weir', 'rainmere', 1, 'beast', { addBeast: ['rillserpent'] }); SI('unicornglade', 'The Unicorn Glade', 'primrose', 2, 'beast', { beasts: { unicorn: 3 } });
SI('furnacevaults', 'The Furnace Vaults', 'brazenhold', 1, 'treasure'); SI('wyvernroost', 'The Wyvern Roost', 'goldspur', 2, 'beast', { addBeast: ['wyvern'] });
SI('ashdunes', 'The Ash Dunes', 'cinderwall', 1, 'mana'); SI('lionsteps', 'The Lion Steps', 'lionsreach', 1, 'wanderer', { beasts: { sunmane: 2 } });
SI('harvestvault', 'The Harvest Vault', 'ambergate', 1, 'treasure'); SI('barrowdowns', 'The Barrow Downs', 'ashbarrow', 1, 'beast', { mishap: 5 });
SI('russetbog', 'The Russet Bog', 'russetmoor', 1, 'beast', { beasts: { tusker: 2 } }); SI('lanternroad', 'The Lantern Road', 'lanternfall', 2, 'wanderer', { ettard: true });
SI('breakingice', 'The Breaking Ice', 'thawgate', 1, 'mana', { addItem: ['draught'] }); SI('oldmill', 'The Old Mill of Beltane', 'beltane', 1, 'treasure', { story: 'lunete_joins', storyFlag: 'mill_open' });
SI('lammasfair', 'The Lammas Fair', 'lammas', 1, 'wanderer', { story: 'blanchefleur_hire' }); SI('hollowcrypts', 'The Hollow Abbey Crypts', 'hallowmere', 2, 'treasure', { addBeast: ['skeleton', 'bat'], ettard: true });
SI('bellnoring', "The Bell That Doesn't Ring", 'midnight', 2, 'treasure'); SI('sunrisestair', 'The Sunrise Stair', 'dawnwatch', 1, 'treasure');
SI('shadowless', 'The Shadowless Square', 'noonspire', 1, 'mana'); SI('evensong', 'The Evensong Crypt', 'vesperhall', 2, 'treasure');
SI('sleepingcourt', 'The Sleeping Court', 'meridian', 2, 'treasure', { keeperVignette: true });
G.POOLS = {
  winter: { items: ['herb', 'wintershard', 'rimesteel', 'frostplate', 'wardingcharm', 'yewlongbow'], beasts: ['snowkit', 'frostwolf', 'yeti', 'bat'], wanderers: ['galeron', 'ettard'] },
  spring: { items: ['herb', 'springseed', 'tomeofthaw', 'hawthornbow', 'spurs', 'willowstaff'], beasts: ['sproutling', 'pixie', 'unicorn', 'slime'], wanderers: ['galeron'] },
  summer: { items: ['herb', 'summerember', 'sunforged', 'hauberk', 'bannerpin', 'cleaver'], beasts: ['salamander', 'cinderhound', 'sunbird', 'sunmane'], wanderers: ['blanchefleur'] },
  autumn: { items: ['herb', 'autumnacorn', 'lanternstaff', 'horseshoe', 'robeofseasons', 'jerkin'], beasts: ['jacklamp', 'scarecrow', 'ghoul', 'tusker'], wanderers: ['blanchefleur', 'ettard'] },
  hour: { items: ['ether', 'writ', 'hourglassrod', 'signet', 'amuletoftides', 'spurs'], beasts: ['minute', 'gearhound'], wanderers: [] }
};
G.QUEST_OUTCOMES = [['treasure', 30], ['beast', 20], ['wanderer', 10], ['mana', 15], ['training', 15], ['mishap', 10]];
G.START_ITEMS = { verdance: ['herb', 'herb', 'remedy', 'springseed'], solmark: ['herb', 'herb', 'remedy', 'summerember'], amberlyn: ['herb', 'herb', 'remedy', 'autumnacorn'], hoarfast: ['herb', 'herb', 'remedy', 'wintershard'], dominion: ['ether', 'ether', 'ether'], brigands: [] };
G.START_RESERVE = { avalorn: [['sproutling', 2], ['sproutling', 2]], brazenhold: [['salamander', 2], ['salamander', 2]], ambergate: [['jacklamp', 2], ['jacklamp', 2]], rimeholt: [['snowkit', 2], ['snowkit', 2]], meridian: [['minute', 10], ['minute', 10]] };
