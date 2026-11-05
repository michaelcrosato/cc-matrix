/* ---- KNIGHTS (§6.5): class, level, element, realm, castle, troop [species, level, tier], look (E.Humanoid), voice ---- */
const KDEF = (id, name, short, cls, lvl, elem, realm, castle, troop, look, voice, o = {}) => G.def('knight', id, Object.assign({ name, short, cls, lvl, elem, realm, castle, troop, look, voice }, o));
const V = (base, range, wave, o = {}) => Object.assign({ base, range, wave, formant: 1, rate: 1, vib: 0 }, o);
const cape = (c, i) => ({ len: 6, width: 5, seg: 2.5, c, i });
const L = (o, cl) => { if (o.cape && o.cape.c) { cl.cape = o.cape.c; cl.capeIn = o.cape.i; o.cape = { len: o.cape.len, width: o.cape.width, seg: o.cape.seg }; } o.colors = cl; return o; };
// Verdance (Spring)
KDEF('gareth', 'Prince Gareth Greenmantle', 'Gareth', 'springwarden', 6, 'spring', 'verdance', 'avalorn', [['unicorn', 4], ['pixie', 4], ['sproutling', 4]],
  L({ size: 1.25, build: 'heroic', armor: true, hair: 'short', hat: { style: 'crown', color: '#f0d060' }, cape: cape('#3a9a40', '#1a5a20'), weapon: 'sword' }, { cloth: '#3a8a3a', hair: '#f0c860', trim: '#f0e6c8', plate: '#d8e0e8', pants: '#2a5a2a' }), V(220, 7, 'pulse', { formant: 1.1, rate: 1.15 }), { ruler: true, title: 'Prince of Verdance' });
KDEF('lynette', 'Dame Lynette of Thornwick', 'Lynette', 'squire', 7, 'spring', 'verdance', 'thornwick', [['treant', 4], ['sproutling', 3]],
  L({ size: 1.2, build: 'heroic', armor: true, hair: 'ponytail', hat: { style: 'band', color: '#f0e6c8' }, weapon: 'sword' }, { cloth: '#f0e6c8', hair: '#a02a20', trim: '#3a9a40', pants: '#3a6a3a' }), V(190, 4, 'square', { formant: 1.05 }));
KDEF('pelleas', 'Sir Pelleas the Lovelorn', 'Pelleas', 'archer', 5, 'spring', 'verdance', 'primrose', [['pixie', 4], ['rillserpent', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'tunic', hair: 'long', hat: { style: 'cap', color: '#5ab04a' }, weapon: null }, { cloth: '#5ab04a', hair: '#8a4a20', pants: '#d8c8a0', trim: '#f4b8d0' }), V(260, 9, 'sine', { formant: 1.2, vib: .02 }), { bow: true });
KDEF('amris', 'Brother Amris', 'Amris', 'acolyte', 6, 'winter', 'verdance', 'avalorn', [['snowkit', 3], ['sproutling', 3]],
  L({ size: 1.15, build: 'heroic', hunch: .2, outfit: 'robe', hair: 'bald', weapon: 'staff', sleeves: 'long' }, { cloth: '#8a8a90', pants: '#6a6a70', skin: '#e0b898', trim: '#5a5a60', orb: '#a8d8ff' }), V(120, 4, 'triangle', { rate: .8 }));
KDEF('wren', 'Wren Ashfeather', 'Wren', 'tamer', 5, 'spring', 'verdance', 'rainmere', [['unicorn', 3], ['pixie', 3], ['sproutling', 3]],
  L({ size: 1.1, build: 'heroic', outfit: 'tunic', hair: 'spiky', hood: true, weapon: null }, { cloth: '#6ac04a', hair: '#e8e8e0', pants: '#4a6a3a' }), V(320, 8, 'pulse', { rate: 1.3 }), { whip: true });
// Solmark (Summer)
KDEF('morgause', 'Queen Morgause the Brazen', 'Morgause', 'sunsovereign', 7, 'summer', 'solmark', 'brazenhold', [['wyvern', 4], ['cinderhound', 4]],
  L({ size: 1.3, build: 'heroic', armor: true, hair: 'long', hat: { style: 'crown', color: '#ffd040' }, cape: cape('#b02a2a', '#6a1010'), weapon: 'sword', bladeLen: 9 }, { cloth: '#b02a2a', hair: '#c8602a', plate: '#e8c060', metal: '#f0e0b0', trim: '#e0a020', pants: '#6a1a1a' }), V(180, 6, 'square'), { ruler: true, title: 'Queen of Solmark' });
KDEF('agravain', 'Sir Agravain Cinderjaw', 'Agravain', 'squire', 7, 'summer', 'solmark', 'cinderwall', [['cinderhound', 4], ['salamander', 3]],
  L({ size: 1.25, build: 'bulky', armor: true, hat: 'helmet', cape: cape('#c83a2a', '#7a1a10'), weapon: 'sword' }, { cloth: '#8a2a1a', plate: '#a8a8b0', pants: '#4a2a1a' }), V(130, 5, 'saw'));
KDEF('elidure', 'Captain Elidure of Goldspur', 'Elidure', 'archer', 6, 'summer', 'solmark', 'goldspur', [['sunbird', 3], ['salamander', 3]],
  L({ size: 1.2, build: 'heroic', outfit: 'coat', hair: 'ponytail', hat: { style: 'band', color: '#e0a020' }, weapon: null }, { cloth: '#d8b880', coat: '#c8a060', hair: '#1a1a1a', pants: '#8a5a2a', trim: '#b02a2a' }), V(300, 6, 'sine', { formant: 1.25 }), { bow: true });
KDEF('hesper', 'Magus Hesper Vey', 'Hesper', 'adept', 6, 'hour', 'solmark', 'lionsreach', [['salamander', 3], ['minute', 3]],
  L({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#5a2a8a' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#6a3aa0', hair: '#d8d8e0', pants: '#4a2a7a', trim: '#e0c040', orb: '#d8c070' }), V(200, 5, 'sine', { formant: .95, vib: .01 }));
KDEF('brennoc', 'Old Brennoc', 'Brennoc', 'tamer', 5, 'summer', 'solmark', 'brazenhold', [['sunmane', 3], ['cinderhound', 3]],
  L({ size: 1.2, build: 'bulky', hunch: .3, outfit: 'coat', hair: 'bald', weapon: null }, { cloth: '#8a6a4a', coat: '#6a4a2a', pants: '#4a3a2a', skin: '#c89070' }), V(110, 4, 'saw', { rate: .85 }), { whip: true });
// Amberlyn (Autumn)
KDEF('pellam', 'King Pellam the Quiet', 'Pellam', 'harvestking', 8, 'autumn', 'amberlyn', 'ambergate', [['griffin', 4], ['scarecrow', 4]],
  L({ size: 1.2, build: 'heroic', hunch: .25, outfit: 'robe', hair: 'long', hat: { style: 'crown', color: '#e0b040' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#c87a2a', hair: '#f0f0f0', pants: '#5a3a2a', trim: '#5a3a2a', orb: '#ffb040' }), V(110, 3, 'triangle', { rate: .7 }), { ruler: true, title: 'King of Amberlyn' });
KDEF('enid', 'Lady Enid Russet', 'Enid', 'acolyte', 6, 'autumn', 'amberlyn', 'ambergate', [['jacklamp', 3], ['scarecrow', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#a85a1e' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#f0e0c0', hair: '#a8481a', pants: '#a85a1e', trim: '#a85a1e', orb: '#ffd080' }), V(250, 6, 'sine', { formant: 1.1 }));
KDEF('dagonet', 'Sir Dagonet the Motley', 'Dagonet', 'squire', 5, 'autumn', 'amberlyn', 'russetmoor', [['tusker', 3], ['jacklamp', 3]],
  L({ size: 1.1, build: 'heroic', outfit: 'tunic', hat: { style: 'pointed', color: '#e0a020' }, hair: 'short', weapon: 'sword' }, { cloth: '#c83a2a', pants: '#e0a020', hair: '#8a5a2a', trim: '#3a2a20' }), V(240, 10, 'pulse', { rate: 1.3 }));
KDEF('vesna', 'Vesna of the Lanterns', 'Vesna', 'adept', 6, 'summer', 'amberlyn', 'lanternfall', [['jacklamp', 4], ['ghoul', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'pointed', color: '#1a1a1a' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#2a2020', hair: '#101010', pants: '#e07020', trim: '#f08030', orb: '#ff9030' }), V(230, 5, 'sine', { formant: .9 }));
KDEF('lamorak', 'Sir Lamorak Ashbarrow', 'Lamorak', 'squire', 8, 'autumn', 'amberlyn', 'ashbarrow', [['ghoul', 4], ['scarecrow', 3]],
  L({ size: 1.2, build: 'bulky', armor: true, hat: 'helmet', cape: cape('#6a4a2a', '#3a2a1a'), weapon: 'sword' }, { cloth: '#5a3a2a', plate: '#8a6a50', pants: '#3a2a1a' }), V(120, 4, 'saw', { rate: .9 }));
// Hoarfast (Winter)
KDEF('mordrain', 'Duke Mordrain the Frostbitten', 'Mordrain', 'rimeduke', 7, 'winter', 'hoarfast', 'rimeholt', [['frostwyrm', 3], ['snowkit', 4]],
  L({ size: 1.25, build: 'heroic', outfit: 'coat', hair: 'long', hat: { style: 'crown', color: '#c8f0ff' }, weapon: 'staff', cape: cape('#8ac0e8', '#4a7aa8'), eyeGlow: '#a0e8ff' }, { cloth: '#e8f0f8', coat: '#d8e4f0', hair: '#ffffff', pants: '#8aa8c8', trim: '#6ab0e8', orb: '#a0f0ff' }), V(200, 12, 'saw', { vib: .03 }), { ruler: true, title: 'Duke of Hoarfast' });
KDEF('ragnell', 'Dame Ragnell Ice-Eye', 'Ragnell', 'squire', 8, 'winter', 'hoarfast', 'kestrel', [['frostwolf', 4], ['icegolem', 3]],
  L({ size: 1.25, build: 'heroic', armor: true, hat: 'helmet', hair: 'ponytail', cape: cape('#2a3a6a', '#1a2040'), weapon: 'sword' }, { cloth: '#4a5a7a', plate: '#c8d0dc', hair: '#f0f0f0', pants: '#2a3a5a' }), V(170, 2, 'square', { rate: .9 }));
KDEF('safir', 'Sir Safir the Pale', 'Safir', 'archer', 6, 'winter', 'hoarfast', 'wolfsgate', [['frostwolf', 3], ['snowkit', 3]],
  L({ size: 1.2, build: 'heroic', outfit: 'coat', hood: true, weapon: null }, { cloth: '#8a8a90', coat: '#9a9aa0', hair: '#f0f0f0', pants: '#5a5a60' }), V(170, 4, 'sine', { rate: .85 }), { bow: true });
KDEF('nimue', 'Nimue of Frostmere', 'Nimue', 'adept', 7, 'winter', 'hoarfast', 'frostmere', [['snowkit', 4], ['snowkit', 3]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', weapon: 'staff', sleeves: 'long' }, { cloth: '#2a8a8a', hair: '#a8d8f0', pants: '#1a5a6a', trim: '#e0f8ff', orb: '#80f0ff' }), V(240, 7, 'sine', { vib: .02, double: 12 }));
KDEF('gorm', 'Gorm the Bear', 'Gorm', 'tamer', 5, 'autumn', 'hoarfast', 'rimeholt', [['yeti', 3], ['tusker', 3]],
  L({ size: 1.35, build: 'bulky', outfit: 'coat', hair: 'short', weapon: null }, { cloth: '#6a4a2a', coat: '#7a5a3a', hair: '#3a2a1a', pants: '#4a3a2a' }), V(80, 3, 'triangle', { rate: .8 }), { whip: true });
// The Hourless Dominion (Hour)
KDEF('meliant', 'Lord Chancellor Meliant', 'Meliant', 'chancellor', 14, 'hour', 'dominion', 'meridian', [['pendulumwyrm', 10], ['clockwork', 12, 2], ['stillwraith', 12]],
  L({ size: 1.25, build: 'heroic', outfit: 'robe', hair: 'short', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#1e1e26', hair: '#8a8a90', pants: '#2a2a32', trim: '#d8c070', orb: '#f0e0a0' }), V(130, 4, 'square', { formant: .9, rate: .9 }), { ruler: true, title: 'Lord Chancellor of the Hourless Dominion' });
KDEF('bertilak', 'Marshal Bertilak the Hourward', 'Bertilak', 'knight', 11, 'hour', 'dominion', 'midnight', [['clockwork', 10, 1], ['gearhound', 9], ['gearhound', 8]],
  L({ size: 1.3, build: 'bulky', armor: true, hat: 'helmet', cape: cape('#1a3a2a', '#0a1a10'), weapon: 'sword' }, { cloth: '#3a3020', plate: '#c8a850', pants: '#2a2418' }), V(100, 6, 'saw'));
KDEF('aurelie', 'Countess Aurelie of Vespers', 'Aurelie', 'sorcerer', 11, 'hour', 'dominion', 'vesperhall', [['stillwraith', 9], ['minute', 9], ['minute', 8]],
  L({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#6a3a8a' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#4a2a5a', hair: '#101018', pants: '#1a1a20', trim: '#c8a0e0', orb: '#c080ff' }), V(210, 5, 'sine', { rate: .75 }));
KDEF('morholt', 'Sir Morholt the Unmoving', 'Morholt', 'knight', 11, 'hour', 'dominion', 'noonspire', [['clockwork', 9], ['clockwork', 8]],
  L({ size: 1.45, build: 'bulky', armor: true, hat: 'helmet', weapon: 'sword' }, { cloth: '#1a1a1e', plate: '#3a3a42', pants: '#121216' }), V(70, 2, 'saw', { rate: .6 }));
KDEF('tic', 'Tic', 'Tic', 'ranger', 10, 'hour', 'dominion', 'dawnwatch', [['gearhound', 8], ['minute', 8]],
  L({ size: 1, build: 'chibi', armor: true, hat: 'cap', weapon: null }, { cloth: '#c8a040', plate: '#d8b050', pants: '#6a5a3a', hair: '#3a3020' }), V(420, 5, 'pulse', { rate: 1.4 }), { bow: true });
KDEF('tac', 'Tac', 'Tac', 'ranger', 10, 'hour', 'dominion', 'dawnwatch', [['gearhound', 8], ['minute', 8]],
  L({ size: 1, build: 'chibi', armor: true, hat: 'cap', weapon: null }, { cloth: '#6a5a3a', plate: '#a08040', pants: '#c8a040', hair: '#3a3020' }), V(360, 5, 'pulse', { rate: 1.4 }), { bow: true });
KDEF('graynight', 'The Gray Knight, Sir Nonesuch', 'Gray Knight', 'graynight', 25, 'hour', 'dominion', null, [['minute', 14, 2], ['minute', 14, 2], ['minute', 14, 2], ['pendulumwyrm', 14, 1]],
  L({ size: 1.6, build: 'heroic', armor: true, hat: 'helmet', cape: { len: 8, width: 6, seg: 3, c: '#6a6a70', i: '#3a3a40' }, weapon: 'sword', bladeLen: 11, eyeGlow: '#ffffff', hair: 'bald' }, { cloth: '#5a5a62', plate: '#8a8a92', metal: '#d0d0d8', pants: '#3a3a42', skin: '#4a4a52', hair: '#3a3a42', eye: '#ffffff', iris: '#ffffff' }), V(70, 3, 'saw', { rate: .7, double: -7 }), { boss: true, halo: true });
// Free knights
KDEF('lunete', 'Princess Lunete of Meridian', 'Lunete', 'hourmaiden', 8, 'hour', null, null, [],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'band', color: '#d8c070' }, weapon: 'staff', sleeves: 'long' }, { cloth: '#f4f0e8', hair: '#f0d070', pants: '#d8c070', trim: '#d8c070', orb: '#fff0b0' }), V(300, 6, 'sine', { formant: 1.3 }), { free: true });
KDEF('galeron', 'Sir Galeron the Wanderer', 'Galeron', 'knight', 10, 'spring', null, null, [['frostwolf', 8]],
  L({ size: 1.25, build: 'heroic', armor: true, hair: 'short', cape: cape('#5a7a4a', '#3a4a2a'), weapon: 'sword' }, { cloth: '#6a7a5a', plate: '#9a9aa0', hair: '#6a4a2a', pants: '#3a4a3a' }), V(180, 5, 'pulse', { rate: .9 }), { free: true, wander: ['winter', 'spring'] });
KDEF('blanchefleur', 'Blanchefleur the Sellsword', 'Blanchefleur', 'ranger', 10, 'autumn', null, null, [['sunmane', 8]],
  L({ size: 1.2, build: 'heroic', outfit: 'coat', hair: 'short', weapon: null }, { cloth: '#8a4a2a', coat: '#7a3a1a', hair: '#f0d080', pants: '#4a2a1a' }), V(260, 5, 'square', { rate: 1.2 }), { free: true, bow: true, wander: ['summer', 'autumn'] });
KDEF('owain', 'Owain the Dragonless', 'Owain', 'beastlord', 11, 'summer', null, null, [],
  L({ size: 1.25, build: 'bulky', outfit: 'coat', hair: 'short', weapon: null }, { cloth: '#6a4a3a', coat: '#5a3a2a', hair: '#2a1a10', pants: '#3a2a20' }), V(140, 4, 'saw', { rate: .9 }), { free: true, whip: true });
KDEF('ettard', 'Sister Ettard', 'Ettard', 'priest', 10, 'winter', null, null, [['snowkit', 7]],
  L({ size: 1.15, build: 'heroic', outfit: 'robe', hood: true, weapon: 'staff', sleeves: 'long' }, { cloth: '#e8f0f8', hair: '#4a6aa8', pants: '#4a6aa8', trim: '#4a6aa8', orb: '#c0e0ff' }), V(260, 5, 'square', { rate: 1.1 }), { free: true, wander: ['winter', 'autumn'] });
// Brigand captains
const BRIG = (id, name, short, lvl, elem, castle, troop, cl, voice) => KDEF(id, name, short, 'brigand', lvl, elem, 'brigands', castle, troop,
  L({ size: 1.2, build: 'bulky', outfit: 'coat', hair: 'spiky', hat: { style: 'band', color: cl.band }, weapon: 'sword' }, cl), voice, { captain: true });
BRIG('hob', 'Hob Mudspur', 'Hob', 5, 'winter', 'thawgate', [['snowkit', 4], ['frostwolf', 4], ['bat', 3], ['slime', 3]], { cloth: '#6a5a4a', coat: '#5a4a3a', hair: '#8a6a3a', pants: '#3a3a3a', band: '#6ab0e8' }, V(200, 8, 'pulse', { rate: 1.2 }));
BRIG('gerrow', 'Mother Gerrow', 'Gerrow', 5, 'spring', 'beltane', [['slime', 4], ['harpy', 4], ['sproutling', 3], ['bat', 3]], { cloth: '#7a6a5a', coat: '#6a5a4a', hair: '#c8c8c8', pants: '#4a4a3a', band: '#4caf50' }, V(230, 6, 'triangle', { rate: .9 }));
BRIG('dafydd', 'Red Dafydd', 'Dafydd', 6, 'summer', 'lammas', [['ogre', 4], ['skeleton', 4], ['salamander', 3]], { cloth: '#8a3a2a', coat: '#7a2a1a', hair: '#c83a1a', pants: '#3a2a2a', band: '#e0a020' }, V(150, 7, 'square', { rate: 1.1 }));
BRIG('abbot', 'The Hollow Abbot', 'Abbot', 6, 'autumn', 'hallowmere', [['skeleton', 5], ['ghoul', 4], ['bat', 4]], { cloth: '#4a4a4a', coat: '#3a3a3a', hair: '#e0e0e0', pants: '#2a2a2a', band: '#c86a1e' }, V(100, 5, 'triangle', { rate: .7, vib: .02 }));
KDEF('sergeant', 'The Patrol Sergeant', 'Sergeant', 'brigand', 3, 'summer', 'brigands', null, [['slime', 2], ['bat', 3], ['bat', 2], ['skeleton', 3]],
  L({ size: 1.15, build: 'bulky', outfit: 'coat', hair: 'short', hat: 'cap', weapon: 'sword' }, { cloth: '#5a4a3a', coat: '#4a3a2a', hair: '#3a2a1a', pants: '#2a2a2a' }), V(160, 5, 'square'), { captain: true });
// narrators and the sleeping Keeper (speakers, not soldiers)
G.def('speaker', 'narrator', { name: '', color: '#b8b0c8', voice: null });
G.def('speaker', 'keeper', { name: 'The Keeper', color: '#f0e8d8', voice: V(150, 3, 'triangle', { rate: .7 }), look: L({ size: 1.2, build: 'heroic', outfit: 'robe', hair: 'long', hat: { style: 'crown', color: '#d8c070' }, weapon: null, sleeves: 'long' }, { cloth: '#f0e8d8', hair: '#f0f0f0', pants: '#d8c070', trim: '#d8c070' }) });
G.def('speaker', 'herald', { name: 'Herald', color: '#f0d880', voice: V(200, 5, 'pulse'), look: L({ size: 1.1, build: 'heroic', outfit: 'tunic', hat: 'cap', hair: 'short', weapon: null }, { cloth: '#a08040', pants: '#5a4a3a', hair: '#5a3a2a' }) });
