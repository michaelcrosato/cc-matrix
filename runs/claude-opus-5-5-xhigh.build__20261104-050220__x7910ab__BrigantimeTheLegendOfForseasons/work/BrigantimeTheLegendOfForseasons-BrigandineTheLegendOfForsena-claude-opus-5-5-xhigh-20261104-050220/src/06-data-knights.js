// KNIGHTS (36): 4 playable rulers, 16 realm knights, 6 Dominion knights (ruler included), the Gray Knight, 5 free
// knights and 4 brigand captains. troop: [[species, level, form]]. look: an E.Humanoid spec. voice: a babble profile
// (42-audio-voice.js): { base Hz, range semitones, wave, formant, rate, vibrato, double }.

const K = (id, o) => G.def('knight', id, Object.assign({ ruler: false, troop: [], items: {}, form: 'vanguard' }, o));
const cape = (len = 6, width = 5) => ({ len, width, seg: 2.5 });

// Verdance (Spring)
K('gareth', { name: 'Prince Gareth Greenmantle', short: 'Gareth', realm: 'verdance', cls: 'springwarden', level: 6, elem: 'spring', castle: 'avalorn', ruler: true, troop: [['unicorn', 4], ['pixie', 4], ['sproutling', 4]],
  bio: 'Earnest, idealistic, quick to forgive; grieving his mother, the late Queen.', voice: { base: 220, range: 7, wave: 'pulse', formant: 1.1, rate: 1.05 },
  look: { build: 'heroic', size: 1.25, armor: true, hair: 'short', hat: { style: 'band', color: '#ffd040' }, cape: cape(7, 6), weapon: 'sword', colors: { hair: '#f0c850', skin: '#f2d0b0', cloth: '#3a8a3a', pants: '#2a5a2a', plate: '#d8e0c8', metal: '#e8f0e0', cape: '#2e7a32', capeIn: '#f0e6c8', trim: '#f0e6c8', boot: '#5a3a1e' } } });
K('lynette', { name: 'Dame Lynette of Thornwick', short: 'Lynette', realm: 'verdance', cls: 'squire', level: 7, elem: 'spring', castle: 'thornwick', troop: [['treant', 4], ['sproutling', 3]], form: 'shield',
  bio: 'His sworn shield; stern, dry humour, protective.', voice: { base: 175, range: 5, wave: 'square', formant: 1.0, rate: 1 },
  look: { build: 'heroic', size: 1.2, armor: true, hair: 'ponytail', hat: { style: 'band', color: '#f0e6c8' }, weapon: 'sword', colors: { hair: '#8a2a1e', skin: '#f0c8a8', cloth: '#f0e6c8', pants: '#3a7a3a', plate: '#b8c0b0', metal: '#e0e8d8', trim: '#3a8a3a', boot: '#4a3020' } } });
K('pelleas', { name: 'Sir Pelleas the Lovelorn', short: 'Pelleas', realm: 'verdance', cls: 'archer', level: 5, elem: 'spring', castle: 'primrose', troop: [['pixie', 4], ['rillserpent', 3]], form: 'column',
  bio: 'A poet-archer, overdramatic and brave.', voice: { base: 260, range: 9, wave: 'triangle', formant: 1.15, rate: 1.1 },
  look: { build: 'heroic', size: 1.15, outfit: 'tunic', hair: 'long', hat: { style: 'cap', color: '#3a8a3a' }, weapon: null, bow: true, colors: { hair: '#8a5a2a', skin: '#f2d0b0', cloth: '#5aa04a', pants: '#e8dcc0', trim: '#f4b8d0', boot: '#6a4a2a' } } });
K('amris', { name: 'Brother Amris', short: 'Amris', realm: 'verdance', cls: 'acolyte', level: 6, elem: 'winter', castle: 'avalorn', troop: [['snowkit', 3], ['sproutling', 3]], form: 'shield',
  bio: 'An old monk from the north; gentle, wry.', voice: { base: 120, range: 4, wave: 'triangle', formant: .9, rate: .8 },
  look: { build: 'heroic', size: 1.15, hunch: .2, outfit: 'robe', hair: 'bald', weapon: 'staff', sleeves: 'long', colors: { skin: '#e0b898', cloth: '#7a7a82', pants: '#6a6a72', trim: '#c8c0a8', orb: '#a8e0ff', boot: '#4a3a2a' } } });
K('wren', { name: 'Wren Ashfeather', short: 'Wren', realm: 'verdance', cls: 'tamer', level: 5, elem: 'spring', castle: 'rainmere', troop: [['unicorn', 3], ['pixie', 3], ['sproutling', 3]],
  bio: 'Raised among unicorns; few words.', voice: { base: 300, range: 8, wave: 'pulse', formant: 1.3, rate: 1.25 },
  look: { build: 'heroic', size: 1.1, outfit: 'tunic', hair: 'spiky', hood: true, weapon: null, whip: true, colors: { hair: '#e8e8e0', skin: '#f0d0b8', cloth: '#6ab04a', pants: '#4a6a3a', trim: '#e8e0c0', boot: '#5a4a2a' } } });
// Solmark (Summer)
K('morgause', { name: 'Queen Morgause the Brazen', short: 'Morgause', realm: 'solmark', cls: 'sunsovereign', level: 7, elem: 'summer', castle: 'brazenhold', ruler: true, troop: [['wyvern', 4], ['cinderhound', 4]],
  bio: 'Magnificent and war-loving, honourable on the field, ruthless at court.', voice: { base: 180, range: 6, wave: 'square', formant: 1.05, rate: 1 },
  look: { build: 'heroic', size: 1.3, armor: true, hair: 'long', hat: 'crown', cape: cape(8, 6), weapon: 'sword', bladeLen: 11, colors: { hair: '#c8602a', skin: '#e8b890', cloth: '#b02a2a', pants: '#7a1a1a', plate: '#e8c040', metal: '#fff0c0', cape: '#b02a2a', capeIn: '#e0a020', trim: '#e0a020', boot: '#5a2a10' } } });
K('agravain', { name: 'Sir Agravain Cinderjaw', short: 'Agravain', realm: 'solmark', cls: 'squire', level: 7, elem: 'summer', castle: 'cinderwall', troop: [['cinderhound', 4], ['salamander', 3]],
  bio: 'A hothead champion who craves glory.', voice: { base: 120, range: 5, wave: 'saw', formant: .85, rate: 1.1 },
  look: { build: 'bulky', size: 1.25, armor: true, hat: 'helmet', cape: cape(6, 6), weapon: 'sword', colors: { skin: '#d8a078', cloth: '#8a2a1a', pants: '#5a1a10', plate: '#c8a050', metal: '#f0e0c0', cape: '#c83a1a', capeIn: '#7a1a0a', trim: '#e0a020', boot: '#3a1a0a' } } });
K('elidure', { name: 'Captain Elidure of Goldspur', short: 'Elidure', realm: 'solmark', cls: 'archer', level: 6, elem: 'summer', castle: 'goldspur', troop: [['sunbird', 3], ['salamander', 3]], form: 'column',
  bio: 'Disciplined, loyal and secretly kind.', voice: { base: 280, range: 6, wave: 'sine', formant: 1.25, rate: 1.05 },
  look: { build: 'heroic', size: 1.2, outfit: 'coat', hair: 'ponytail', hat: { style: 'band', color: '#b02a2a' }, weapon: null, bow: true, colors: { hair: '#1a1410', skin: '#c89070', cloth: '#d8b880', coat: '#c8a060', pants: '#8a6a3a', trim: '#b02a2a', boot: '#4a2a14' } } });
K('hesper', { name: 'Magus Hesper Vey', short: 'Hesper', realm: 'solmark', cls: 'adept', level: 6, elem: 'hour', castle: 'lionsreach', troop: [['salamander', 3], ['minute', 3]], form: 'column',
  bio: 'An ambitious court sorcerer who dabbles in Hour magic.', voice: { base: 190, range: 5, wave: 'sine', formant: .95, rate: .95, breath: .3 },
  look: { build: 'heroic', size: 1.2, outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#5a2a7a' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#d8d8e0', skin: '#e8c8a8', cloth: '#6a2a8a', pants: '#4a1a6a', trim: '#e0b030', orb: '#d8c070', boot: '#2a1a3a' } } });
K('brennoc', { name: 'Old Brennoc', short: 'Brennoc', realm: 'solmark', cls: 'tamer', level: 5, elem: 'summer', castle: 'brazenhold', troop: [['sunmane', 3], ['cinderhound', 3]],
  bio: 'A grizzled, grandfatherly beastkeeper.', voice: { base: 105, range: 4, wave: 'saw', formant: .8, rate: .9 },
  look: { build: 'bulky', size: 1.2, hunch: .3, outfit: 'coat', hair: 'bald', weapon: null, whip: true, colors: { skin: '#c88a60', cloth: '#7a5a3a', coat: '#6a4a2a', pants: '#4a3a2a', trim: '#c8a060', boot: '#3a2414' } } });
// Amberlyn (Autumn)
K('pellam', { name: 'King Pellam the Quiet', short: 'Pellam', realm: 'amberlyn', cls: 'harvestking', level: 8, elem: 'autumn', castle: 'ambergate', ruler: true, troop: [['griffin', 4], ['scarecrow', 4]], form: 'shield',
  bio: 'Silent and wise; speaks rarely and briefly; secretly ill.', voice: { base: 110, range: 3, wave: 'triangle', formant: .9, rate: .7 },
  look: { build: 'heroic', size: 1.2, hunch: .25, outfit: 'robe', hair: 'long', hat: 'crown', weapon: 'staff', sleeves: 'long', cape: cape(7, 6), colors: { hair: '#f0f0e8', skin: '#e0c0a0', cloth: '#c86a1e', pants: '#5a3a2a', trim: '#f0c050', cape: '#5a3a2a', capeIn: '#c86a1e', orb: '#ffb040', boot: '#3a2414' } } });
K('enid', { name: 'Lady Enid Russet', short: 'Enid', realm: 'amberlyn', cls: 'acolyte', level: 6, elem: 'autumn', castle: 'ambergate', troop: [['jacklamp', 3], ['scarecrow', 3]], form: 'shield',
  bio: "The king's daughter; gentle, firm, practical.", voice: { base: 240, range: 6, wave: 'triangle', formant: 1.15, rate: 1 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#c86a1e' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#a0401e', skin: '#f2d4b8', cloth: '#f0e0c0', pants: '#a85a2a', trim: '#a85a2a', orb: '#ffd080', boot: '#5a3a1e' } } });
K('dagonet', { name: 'Sir Dagonet the Motley', short: 'Dagonet', realm: 'amberlyn', cls: 'squire', level: 5, elem: 'autumn', castle: 'russetmoor', troop: [['tusker', 3], ['jacklamp', 3]],
  bio: 'A jester-knight who jokes to hide his fear.', voice: { base: 210, range: 11, wave: 'pulse', formant: 1.1, rate: 1.3 },
  look: { build: 'heroic', size: 1.1, outfit: 'tunic', hair: 'spiky', hat: { style: 'pointed', color: '#c83a8a' }, weapon: 'sword', colors: { hair: '#e0a040', skin: '#f2d0b0', cloth: '#e0a020', pants: '#7a3aa0', trim: '#c83a8a', boot: '#3a2a4a' } } });
K('vesna', { name: 'Vesna of the Lanterns', short: 'Vesna', realm: 'amberlyn', cls: 'adept', level: 6, elem: 'summer', castle: 'lanternfall', troop: [['jacklamp', 4], ['ghoul', 3]], form: 'column',
  bio: 'A lamplighter witch, kind to the dead.', voice: { base: 230, range: 6, wave: 'sine', formant: 1.05, rate: .9, breath: .5 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#1a1418' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#14101a', skin: '#f0d8c0', cloth: '#1a1418', pants: '#e07a1e', trim: '#e07a1e', orb: '#ff9a20', boot: '#1a1418' } } });
K('lamorak', { name: 'Sir Lamorak Ashbarrow', short: 'Lamorak', realm: 'amberlyn', cls: 'squire', level: 8, elem: 'autumn', castle: 'ashbarrow', troop: [['ghoul', 4], ['scarecrow', 3]], form: 'shield',
  bio: 'A gruff old veteran, loyal to Pellam.', voice: { base: 115, range: 4, wave: 'square', formant: .85, rate: .9 },
  look: { build: 'bulky', size: 1.2, armor: true, hat: 'helmet', cape: cape(6, 5), weapon: 'sword', colors: { skin: '#d8a888', cloth: '#6a4a2a', pants: '#4a3a2a', plate: '#8a6a4a', metal: '#b8a890', cape: '#6a4a2a', capeIn: '#3a2a1a', trim: '#c86a1e', boot: '#2a1a10' } } });
// Hoarfast (Winter)
K('mordrain', { name: 'Duke Mordrain the Frostbitten', short: 'Mordrain', realm: 'hoarfast', cls: 'rimeduke', level: 7, elem: 'winter', castle: 'rimeholt', ruler: true, troop: [['frostwyrm', 3], ['snowkit', 4]],
  bio: 'Theatrical, mad and brilliant; speaks in riddles; grief hidden under ice.', voice: { base: 200, range: 12, wave: 'saw', formant: 1.0, rate: 1.15, vibrato: .03 },
  look: { build: 'heroic', size: 1.25, outfit: 'coat', hair: 'long', hat: { style: 'crown', color: '#c8f0ff' }, weapon: 'staff', sleeves: 'long', cape: cape(8, 6), eyeGlow: '#a8e8ff', colors: { hair: '#f0f8ff', skin: '#e0e8f0', cloth: '#e8f0f8', coat: '#f0f4f8', pants: '#8aa8c8', trim: '#6ab0e8', cape: '#a8d0f0', capeIn: '#4a7ab0', orb: '#a8f0ff', boot: '#4a6a8a' } } });
K('ragnell', { name: 'Dame Ragnell Ice-Eye', short: 'Ragnell', realm: 'hoarfast', cls: 'squire', level: 8, elem: 'winter', castle: 'kestrel', troop: [['frostwolf', 4], ['icegolem', 3]],
  bio: 'His cold, calculating marshal, the sane one.', voice: { base: 165, range: 3, wave: 'square', formant: .95, rate: 1 },
  look: { build: 'heroic', size: 1.25, armor: true, hair: 'ponytail', hat: 'helmet', cape: cape(7, 5), weapon: 'sword', colors: { hair: '#f0f4f8', skin: '#f0dcd0', cloth: '#2a3a6a', pants: '#1a2a4a', plate: '#a8b8c8', metal: '#e0f0ff', cape: '#1a2a5a', capeIn: '#6ab0e8', trim: '#6ab0e8', boot: '#1a2030' } } });
K('safir', { name: 'Sir Safir the Pale', short: 'Safir', realm: 'hoarfast', cls: 'archer', level: 6, elem: 'winter', castle: 'wolfsgate', troop: [['frostwolf', 3], ['snowkit', 3]], form: 'column',
  bio: 'A quiet, melancholic hunter.', voice: { base: 150, range: 4, wave: 'triangle', formant: .95, rate: .9 },
  look: { build: 'heroic', size: 1.2, outfit: 'coat', hood: true, hair: 'short', weapon: null, bow: true, colors: { hair: '#e8ecf0', skin: '#e8dcd4', cloth: '#8a8a92', coat: '#7a7a84', pants: '#5a5a64', trim: '#c8d8e8', boot: '#3a3a44' } } });
K('nimue', { name: 'Nimue of Frostmere', short: 'Nimue', realm: 'hoarfast', cls: 'adept', level: 7, elem: 'winter', castle: 'frostmere', troop: [['snowkit', 4], ['snowkit', 3]], form: 'column',
  bio: 'An enigmatic lake witch who makes bargains.', voice: { base: 250, range: 7, wave: 'sine', formant: 1.2, rate: .85, double: 12 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', weapon: 'staff', sleeves: 'long', colors: { hair: '#a8d8f0', skin: '#e8f0f8', cloth: '#2a8a8a', pants: '#1a6a6a', trim: '#a8f0ff', orb: '#80f0ff', boot: '#1a4a4a' } } });
K('gorm', { name: 'Gorm the Bear', short: 'Gorm', realm: 'hoarfast', cls: 'tamer', level: 5, elem: 'autumn', castle: 'rimeholt', troop: [['yeti', 3], ['tusker', 3]],
  bio: 'Huge and gentle; raised in the western woods.', voice: { base: 80, range: 3, wave: 'saw', formant: .75, rate: .8 },
  look: { build: 'bulky', size: 1.35, outfit: 'coat', hair: 'short', weapon: null, whip: true, colors: { hair: '#5a3a1e', skin: '#d8a880', cloth: '#7a5030', coat: '#6a4428', pants: '#4a3420', trim: '#a07a50', boot: '#3a2414' } } });
// the Hourless Dominion
K('meliant', { name: 'Lord Chancellor Meliant', short: 'Meliant', realm: 'dominion', cls: 'chancellor', level: 14, elem: 'hour', castle: 'meridian', ruler: true, troop: [['pendulumwyrm', 10], ['clockwork', 12, 2], ['stillwraith', 12]], form: 'shield',
  bio: 'Cold, grieving and absolute; believes he is merciful.', voice: { base: 130, range: 4, wave: 'square', formant: .9, rate: .9 },
  look: { build: 'heroic', size: 1.25, outfit: 'robe', hair: 'short', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long', cape: cape(7, 5), colors: { hair: '#8a8a92', skin: '#e0c8b0', cloth: '#1a1a24', pants: '#14121c', trim: '#d8c070', cape: '#14121c', capeIn: '#d8c070', orb: '#d8c070', boot: '#14121c' } } });
K('bertilak', { name: 'Marshal Bertilak the Hourward', short: 'Bertilak', realm: 'dominion', cls: 'knight', level: 12, elem: 'hour', castle: 'midnight', troop: [['clockwork', 12, 2], ['gearhound', 10], ['gearhound', 9]],
  bio: 'Courteous, ruthless; loves a duel.', voice: { base: 110, range: 6, wave: 'square', formant: .85, rate: 1.05 },
  look: { build: 'bulky', size: 1.3, armor: true, hat: 'helmet', cape: cape(7, 6), weapon: 'sword', colors: { skin: '#d8b090', cloth: '#1a3a2a', pants: '#14241a', plate: '#c8a850', metal: '#f0e0b0', cape: '#1a3a2a', capeIn: '#14121c', trim: '#d8c070', boot: '#14121c' } } });
K('aurelie', { name: 'Countess Aurelie of Vespers', short: 'Aurelie', realm: 'dominion', cls: 'sorcerer', level: 12, elem: 'hour', castle: 'vesperhall', troop: [['stillwraith', 10], ['minute', 10], ['minute', 9]], form: 'column',
  bio: 'Elegant, bored and cruel.', voice: { base: 200, range: 5, wave: 'sine', formant: 1.0, rate: .8 },
  look: { build: 'heroic', size: 1.2, outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#14101a', skin: '#f0e0d8', cloth: '#4a2a6a', pants: '#14101a', trim: '#d8c070', orb: '#c8a0ff', boot: '#14101a' } } });
K('morholt', { name: 'Sir Morholt the Unmoving', short: 'Morholt', realm: 'dominion', cls: 'knight', level: 11, elem: 'hour', castle: 'noonspire', troop: [['clockwork', 10], ['clockwork', 9]], form: 'shield',
  bio: 'A silent giant.', voice: { base: 70, range: 2, wave: 'saw', formant: .7, rate: .7, grunt: true },
  look: { build: 'bulky', size: 1.45, armor: true, hat: 'helmet', weapon: 'sword', bladeLen: 12, colors: { skin: '#c8a888', cloth: '#14121c', pants: '#0e0c14', plate: '#2a2a36', metal: '#8a8a96', trim: '#d8c070', boot: '#0e0c14' } } });
K('tic', { name: 'Tic', short: 'Tic', realm: 'dominion', cls: 'ranger', level: 10, elem: 'hour', castle: 'dawnwatch', troop: [['gearhound', 9], ['minute', 9]], form: 'column',
  bio: "A clockwork twin who finishes Tac's sentences.", voice: { base: 420, range: 5, wave: 'pulse', formant: 1.4, rate: 1.4 },
  look: { build: 'chibi', size: 1.0, armor: true, hat: { style: 'cap', color: '#d8c070' }, weapon: null, bow: true, colors: { skin: '#e8d0b0', cloth: '#d8c070', pants: '#3a3a46', plate: '#d8c070', hair: '#3a3a46', boot: '#3a3a46' } } });
K('tac', { name: 'Tac', short: 'Tac', realm: 'dominion', cls: 'ranger', level: 10, elem: 'hour', castle: 'dawnwatch', troop: [['gearhound', 9], ['minute', 9]], form: 'column',
  bio: 'The other twin.', voice: { base: 360, range: 5, wave: 'pulse', formant: 1.3, rate: 1.4 },
  look: { build: 'chibi', size: 1.0, armor: true, hat: { style: 'cap', color: '#3a3a46' }, weapon: null, bow: true, colors: { skin: '#e8d0b0', cloth: '#3a3a46', pants: '#d8c070', plate: '#5a5a6a', hair: '#d8c070', boot: '#d8c070' } } });
K('graynight', { name: 'The Gray Knight, Sir Nonesuch', short: 'Gray Knight', realm: 'dominion', cls: 'graynight', level: 25, elem: 'hour', castle: null, boss: true, troop: [['minute', 15, 3], ['minute', 15, 3], ['minute', 14, 3], ['pendulumwyrm', 16, 2]], form: 'shield',
  bio: 'The month that never was: calm, ancient, faintly amused.', voice: { base: 70, range: 3, wave: 'saw', formant: .7, rate: .75, double: -7 },
  look: { build: 'heroic', size: 1.6, armor: true, hat: 'helmet', cape: { len: 9, width: 7, seg: 2.8 }, weapon: 'sword', bladeLen: 13, eyeGlow: '#ffffff', halo: 'clock', colors: { skin: '#b0b0b8', cloth: '#5a5a62', pants: '#4a4a52', plate: '#8a8a92', metal: '#e0e0e8', cape: '#6a6a72', capeIn: '#3a3a42', trim: '#c8c8d0', boot: '#3a3a42' } } });
// free knights
K('lunete', { name: 'Princess Lunete of Meridian', short: 'Lunete', realm: null, cls: 'hourmaiden', level: 8, elem: 'hour', free: 'story',
  bio: "The Keeper's daughter; steady and kind; carries her father's broken watch.", voice: { base: 300, range: 6, wave: 'sine', formant: 1.3, rate: 1 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long', colors: { hair: '#f0d060', skin: '#f6dcc8', cloth: '#f4f0e8', pants: '#d8c070', trim: '#d8c070', orb: '#ffffff', boot: '#a08a50' } } });
K('galeron', { name: 'Sir Galeron the Wanderer', short: 'Galeron', realm: null, cls: 'knight', level: 10, elem: 'spring', free: 'wanderer', regions: ['winter', 'spring'], troop: [['frostwolf', 8]],
  bio: 'An errant knight looking for a cause.', voice: { base: 190, range: 5, wave: 'pulse', formant: 1.0, rate: .9 },
  look: { build: 'heroic', size: 1.25, armor: true, hair: 'short', cape: cape(6, 5), weapon: 'sword', colors: { hair: '#6a4a2a', skin: '#e0b898', cloth: '#5a6a4a', pants: '#3a4a3a', plate: '#8a8a82', metal: '#c8c8c0', cape: '#6a8a5a', capeIn: '#3a4a2a', boot: '#3a2a1a' } } });
K('blanchefleur', { name: 'Blanchefleur the Sellsword', short: 'Blanchefleur', realm: null, cls: 'ranger', level: 10, elem: 'autumn', free: 'wanderer', regions: ['summer', 'autumn'], troop: [['sunmane', 8]],
  bio: 'A mercenary with a code: coin first.', voice: { base: 230, range: 5, wave: 'square', formant: 1.1, rate: 1.2 },
  look: { build: 'heroic', size: 1.2, outfit: 'coat', hair: 'short', weapon: null, bow: true, colors: { hair: '#f0d070', skin: '#e8c0a0', cloth: '#8a4a2a', coat: '#7a3a1e', pants: '#4a2a1a', trim: '#d8a040', boot: '#2a1a0a' } } });
K('owain', { name: 'Owain the Dragonless', short: 'Owain', realm: null, cls: 'beastlord', level: 11, elem: 'summer', free: 'story',
  bio: 'Lost his dragon in the Long Winter; will train yours.', voice: { base: 140, range: 4, wave: 'saw', formant: .9, rate: .95, breath: .4 },
  look: { build: 'bulky', size: 1.25, outfit: 'coat', hair: 'short', weapon: null, whip: true, colors: { hair: '#3a2a1a', skin: '#c89070', cloth: '#6a4a2a', coat: '#5a3a1e', pants: '#3a2a1a', trim: '#c84a2a', boot: '#2a1a0a' } } });
K('ettard', { name: 'Sister Ettard', short: 'Ettard', realm: null, cls: 'priest', level: 10, elem: 'winter', free: 'wanderer', regions: ['hallowmere', 'lanternfall', 'frostmere'], troop: [['snowkit', 7]],
  bio: 'A sharp-tongued healer.', voice: { base: 250, range: 5, wave: 'pulse', formant: 1.2, rate: 1.15 },
  look: { build: 'heroic', size: 1.15, outfit: 'robe', hood: true, hair: 'short', weapon: 'staff', sleeves: 'long', colors: { hair: '#f0f0f8', skin: '#f0dcd0', cloth: '#f0f4f8', pants: '#4a6aa0', trim: '#4a6aa0', orb: '#a8e0ff', boot: '#2a3a5a' } } });
// brigand captains
K('hob', { name: 'Hob Mudspur', short: 'Hob', realm: 'brigands', cls: 'brigand', level: 5, elem: 'winter', castle: 'thawgate', troop: [['snowkit', 4], ['frostwolf', 4], ['bat', 3], ['slime', 3]],
  bio: 'Swaggering, and a coward at heart.', voice: { base: 170, range: 9, wave: 'pulse', formant: 1.0, rate: 1.25 },
  look: { build: 'heroic', size: 1.15, outfit: 'tunic', hair: 'spiky', hat: { style: 'cap', color: '#5a4a3a' }, weapon: 'sword', colors: { hair: '#7a5a2a', skin: '#e0b090', cloth: '#7a6a5a', pants: '#4a3a2a', trim: '#2a2a2a', boot: '#6a4020' } } });
K('gerrow', { name: 'Mother Gerrow', short: 'Gerrow', realm: 'brigands', cls: 'brigand', level: 5, elem: 'spring', castle: 'beltane', troop: [['slime', 4], ['harpy', 4], ['sproutling', 3], ['bat', 3]], form: 'shield',
  bio: 'Motherly and crafty; hides Lunete at her mill.', voice: { base: 200, range: 6, wave: 'triangle', formant: 1.0, rate: .95 },
  look: { build: 'bulky', size: 1.1, outfit: 'robe', hair: 'ponytail', hat: { style: 'band', color: '#7a6a5a' }, weapon: 'sword', colors: { hair: '#a8a098', skin: '#e8c0a0', cloth: '#7a6a5a', pants: '#5a4a3a', trim: '#2a2a2a', boot: '#3a2a1a' } } });
K('dafydd', { name: 'Red Dafydd', short: 'Dafydd', realm: 'brigands', cls: 'brigand', level: 6, elem: 'summer', castle: 'lammas', troop: [['ogre', 4], ['skeleton', 4], ['salamander', 3]],
  bio: 'Boisterous and proud.', voice: { base: 140, range: 8, wave: 'square', formant: .95, rate: 1.15 },
  look: { build: 'bulky', size: 1.25, outfit: 'tunic', hair: 'long', weapon: 'sword', colors: { hair: '#c8401e', skin: '#e8b090', cloth: '#8a2a1e', pants: '#4a3a2a', trim: '#2a2a2a', boot: '#3a2414' } } });
K('abbot', { name: 'The Hollow Abbot', short: 'Abbot', realm: 'brigands', cls: 'brigand', level: 6, elem: 'autumn', castle: 'hallowmere', troop: [['skeleton', 5], ['ghoul', 4], ['bat', 4]], form: 'shield',
  bio: 'Eerie and sorrowful; keeps the dead company.', voice: { base: 100, range: 3, wave: 'triangle', formant: .8, rate: .7, breath: .5 },
  look: { build: 'heroic', size: 1.2, hunch: .3, outfit: 'robe', hood: true, hair: 'bald', weapon: 'sword', sleeves: 'long', eyeGlow: '#c0ff80', colors: { hair: '#2a2a2a', skin: '#c8c0b0', cloth: '#3a3430', pants: '#2a2420', trim: '#7a6a5a', boot: '#1a1410' } } });

/** the four playable rulers by realm */
G.RULER = { verdance: 'gareth', solmark: 'morgause', amberlyn: 'pellam', hoarfast: 'mordrain', dominion: 'meliant' };
