/* ---- THE BESTIARY (§6.8): 30 species, 3 forms each. Tier 2 = ×1.35 (HP MP ATK DEF INT), AGI +2; tier 3 = ×1.75, AGI +4,
 * MOV +1 for fliers. At level L a stat is round(formBase × (1 + .05 × (L - 1))). Rank = bond cost. rig: how it is drawn. */
const MO = (id, names, elem, size, rank, flags, base, basic, skills, cost, upkeep, rig) => G.def('monster', id, {
  names, elem, sizes: Array.isArray(size) ? size : [size, size, size], rank, flags, base, basic, skills, cost, upkeep, rig });
const B = (name, p, range = [1, 1], o = {}) => Object.assign({ name, p, range }, o);
// rigs: blob (E.Blob + overlay), hum (E.Humanoid), beast (E.Beast)
MO('sproutling', ['Sproutling', 'Bloomkin', 'Mandragora'], 'spring', 'S', 1, '', [38, 12, 12, 9, 12, 13, 4], B('Headbutt', 1), [['pollenpuff'], ['entangle'], ['scream']], 30, 2,
  { kind: 'blob', R: 6, colors: { dk: '#3a7a2a', base: '#6ac04a', lt: '#a8e070', spec: '#e8ffd0', eye: '#1a2a10' }, ears: 'cat', feet: true, over: 'leaf' });
MO('pixie', ['Pixie', 'Sylph', 'Faerie Queen'], 'spring', ['S', 'S', 'M'], 1, 'fl', [30, 24, 8, 6, 16, 20, 6], B('Prick', .7), [['mend'], ['haste'], ['sleepdust']], 45, 3,
  { kind: 'hum', look: { size: .6, build: 'chibi', weapon: null, outfit: 'tunic', hair: 'long', colors: { cloth: '#f0a0d0', hair: '#f8e070', skin: '#ffe0d0', pants: '#c070b0', trim: '#ffffff' } }, wings: 'insect', glow: '#ffb0e8' });
MO('treant', ['Thornback Treant', 'Elder Treant', 'Worldroot'], 'spring', 'L', 4, '', [120, 10, 22, 22, 8, 5, 3], B('Slam', 1.1), [['thorns', 'entangle'], ['renewal'], ['rootsweep']], 120, 8,
  { kind: 'hum', look: { size: 1.55, build: 'bulky', weapon: null, outfit: 'coat', hair: 'spiky', hunch: .3, colors: { skin: '#6a4a2a', cloth: '#5a3a1e', coat: '#4a3018', pants: '#3a2812', hair: '#4aa040', boot: '#3a2812' } } });
MO('unicorn', ['Unicorn', 'Alicorn', 'Dawnhorn'], 'spring', ['M', 'M', 'L'], 3, 't2fl', [80, 20, 19, 14, 14, 16, 6], B('Gore', 1.1), [['charge', 'mend'], ['dive'], ['dawnlight']], 90, 5,
  { kind: 'beast', body: 'quad', preset: 'horse', colors: { body: '#f4f0f8', belly: '#ffffff', dark: '#b8b0d0', accent: '#f8b0d8', eye: '#4060a0', horn: '#ffe080', wing: '#ffffff' }, parts: { horn: true, mane: '#f8b0d8', tail: 'long', wingsFrom: 2, wings: 'feather' } });
MO('rillserpent', ['Rillserpent', 'Floodwyrm', 'Thaw Leviathan'], 'spring', 'L', 4, 'sw', [110, 18, 21, 16, 14, 9, 4], B('Bite', 1), [['torrent', 'coil'], ['bramblestorm'], ['verdanttempest']], 130, 8,
  { kind: 'beast', body: 'serpent', colors: { body: '#3a9a8a', belly: '#c0e8c0', dark: '#1a5a5a', accent: '#70d0e0', eye: '#ffe060' }, parts: { fins: true } });
MO('salamander', ['Salamander', 'Firedrake', 'Magma Drake'], 'summer', ['S', 'M', 'M'], 2, '', [50, 12, 16, 12, 10, 12, 4], B('Bite', 1), [['emberspit'], ['firebreath'], ['cinderstorm']], 45, 3,
  { kind: 'beast', body: 'quad', preset: 'lizard', colors: { body: '#e05a2a', belly: '#f8c060', dark: '#8a2a1a', accent: '#ffd040', eye: '#ffff80', flame: '#ffa020' }, parts: { tail: 'flame' } });
MO('cinderhound', ['Cinderhound', 'Blazehound', 'Twinflame Hound'], 'summer', 'M', 2, '', [70, 10, 20, 12, 8, 14, 5], B('Bite', 1), [['firebreath'], ['howl'], ['pounce']], 70, 4,
  { kind: 'beast', body: 'quad', preset: 'hound', colors: { body: '#3a2a2a', belly: '#6a4a3a', dark: '#1a1010', accent: '#ff6a20', eye: '#ffd040', flame: '#ff8a20' }, parts: { mane: 'flame', tail: 'flame' } });
MO('sunbird', ['Sunbird', 'Phoenix', 'Solar Roc'], 'summer', ['M', 'M', 'L'], 3, 'fl', [60, 18, 17, 10, 14, 18, 6], B('Talon', 1), [['dive'], ['rebirth'], ['solarflare']], 90, 5,
  { kind: 'beast', body: 'avian', colors: { body: '#ff9a20', belly: '#ffe060', dark: '#c04a10', accent: '#ff3a1a', eye: '#2a1a10', wing: '#ffb030', flame: '#ffd040' }, parts: { tail: 'flame', crest: true } });
MO('wyvern', ['Wyvern', 'Sun Dragon', 'Elder Sun Dragon'], 'summer', 'L', 4, 'fl', [120, 16, 25, 18, 12, 10, 5], B('Bite', 1), [['tailsweep', 'firebreath'], ['dive'], ['solarflare']], 160, 10,
  { kind: 'beast', body: 'drake', legs2: true, colors: { body: '#c8702a', belly: '#f0c070', dark: '#6a3a1a', accent: '#ffd040', eye: '#ffff60', wing: '#a04a2a', horn: '#f0e0c0' }, parts: { horn: true, wings: 'bat', tail: 'long', crest: true } });
MO('sunmane', ['Sunmane Lion', 'Solar Chimera', 'Noon Sphinx'], 'summer', ['M', 'L', 'L'], 3, '', [85, 12, 22, 14, 9, 15, 5], B('Claw', 1), [['roar', 'pounce'], ['firebreath'], ['sunriddle']], 100, 6,
  { kind: 'beast', body: 'quad', preset: 'cat', colors: { body: '#e0b050', belly: '#f8e0a0', dark: '#8a6020', accent: '#ff7020', eye: '#40a020', wing: '#f0c060' }, parts: { mane: '#e06a20', tail: 'long', wingsFrom: 2, wings: 'feather' } });
MO('jacklamp', ["Jack-o'-Lamp", 'Lantern Lord', 'Will of the Wisps'], 'autumn', ['S', 'S', 'M'], 1, 'fo', [36, 20, 10, 8, 15, 14, 4], B('Spook', .8), [['wispfire'], ['fear'], ['leafstorm']], 30, 2,
  { kind: 'blob', R: 6, colors: { dk: '#a04a10', base: '#f0801a', lt: '#ffb050', spec: '#fff0c0', eye: '#ffe040' }, over: 'pumpkin', float: true });
MO('scarecrow', ['Scarecrow', 'Harvest Reaper', 'Grim Thresher'], 'autumn', 'M', 2, '', [65, 10, 18, 12, 10, 12, 4], B('Scythe', 1.1), [['fear'], ['reaping'], ['trample']], 60, 4,
  { kind: 'hum', look: { size: 1.1, build: 'heroic', weapon: 'staff', outfit: 'coat', hat: { style: 'pointed', color: '#5a4020' }, hair: 'spiky', colors: { skin: '#e8c870', hair: '#e8d080', cloth: '#7a5a3a', coat: '#6a4a2a', pants: '#5a6a3a', trim: '#c09040', metal: '#c8c8c8' } }, tool: 'scythe' });
MO('ghoul', ['Barrow Ghoul', 'Wight', 'Barrow King'], 'autumn', 'M', 2, '', [70, 12, 19, 13, 9, 10, 4], B('Claw', 1, [1, 1], { status: ['poison', 25] }), [['drain'], ['gravechill'], ['rot']], 55, 3,
  { kind: 'hum', look: { size: 1.05, build: 'heroic', weapon: null, outfit: 'tunic', hair: 'long', hunch: .6, eyeGlow: '#a0ff80', colors: { skin: '#7a9a7a', hair: '#3a4a3a', cloth: '#4a4a3a', pants: '#3a3a2a', boot: '#2a2a20' } } });
MO('griffin', ['Griffin', 'Gilded Griffin', 'Storm Griffin'], 'autumn', 'L', 4, 'fl', [105, 14, 23, 15, 12, 15, 6], B('Talon', 1), [['dive', 'gale'], ['leafstorm'], ['harvestmoon']], 140, 9,
  { kind: 'beast', body: 'quad', preset: 'griffin', colors: { body: '#c89a50', belly: '#f0e0b0', dark: '#7a5a2a', accent: '#f0f0f0', eye: '#ffc020', wing: '#a07a40', horn: '#f0c040' }, parts: { wings: 'feather', tail: 'long', beak: true } });
MO('tusker', ['Great Tusker', 'Ironhide Boar', 'Boar King'], 'autumn', ['M', 'M', 'L'], 3, '', [85, 6, 21, 16, 4, 10, 5], B('Gore', 1.1), [['trample'], ['thickhide'], ['roar']], 70, 4,
  { kind: 'beast', body: 'quad', preset: 'boar', colors: { body: '#6a4a3a', belly: '#8a6a5a', dark: '#3a2a20', accent: '#f0e8d0', eye: '#ff4020', horn: '#f0e8d0' }, parts: { tusks: true, mane: '#3a2a20', tail: 'short' } });
MO('snowkit', ['Snowkit', 'Rime Sprite', 'Aurora Wisp'], 'winter', 'S', 1, 't3fo', [36, 18, 11, 9, 14, 15, 4], B('Snowball', .8, [1, 2]), [['frostbite'], ['frostarmor'], ['froststorm']], 30, 2,
  { kind: 'blob', R: 6, colors: { dk: '#8aa8c8', base: '#e8f0f8', lt: '#ffffff', spec: '#ffffff', eye: '#2a4a8a' }, ears: 'cat', tail: true, over: 'frost' });
MO('frostwolf', ['Frostwolf', 'Dire Frostwolf', 'Long-Night Wolf'], 'winter', ['M', 'M', 'L'], 2, '', [68, 8, 20, 11, 7, 16, 6], B('Bite', 1), [['howl', 'frostfang'], ['pounce'], ['frostbreath']], 65, 4,
  { kind: 'beast', body: 'quad', preset: 'wolf', colors: { body: '#d8e8f8', belly: '#ffffff', dark: '#7a98b8', accent: '#80d0ff', eye: '#60c0ff' }, parts: { mane: '#b0c8e0', tail: 'long' } });
MO('icegolem', ['Ice Golem', 'Glacier Colossus', 'Hoarfrost Titan'], 'winter', 'L', 4, '', [130, 8, 24, 26, 6, 4, 3], B('Slam', 1.1), [['frostarmor'], ['avalanche'], ['thorns']], 130, 8,
  { kind: 'hum', look: { size: 1.5, build: 'bulky', weapon: null, armor: true, hair: 'bald', eyeGlow: '#60f0ff', colors: { skin: '#a8d8f0', cloth: '#80c0e8', pants: '#6aa8d8', plate: '#c8f0ff', metal: '#e0f8ff', boot: '#5a90c0' } } });
MO('yeti', ['Yeti', 'Great Yeti', 'Yeti Matriarch'], 'winter', 'L', 4, '', [115, 8, 25, 17, 6, 8, 4], B('Maul', 1.15), [['hurlice'], ['roar'], ['avalanche']], 110, 7,
  { kind: 'hum', look: { size: 1.5, build: 'bulky', weapon: null, outfit: 'coat', hair: 'spiky', hunch: .3, colors: { skin: '#c8d0e0', hair: '#f0f4f8', cloth: '#e8eef4', coat: '#dce4ee', pants: '#c8d4e0', boot: '#8a9ab0' } } });
MO('frostwyrm', ['Frost Wyrm', 'Rime Dragon', "Winter's Heart"], 'winter', 'L', 5, 'fl', [125, 18, 24, 19, 14, 9, 5], B('Bite', 1), [['frostbreath', 'tailsweep'], ['dive'], ['blizzard']], 170, 11,
  { kind: 'beast', body: 'drake', colors: { body: '#a8d0f0', belly: '#e8f8ff', dark: '#4a7aa8', accent: '#ffffff', eye: '#40e0ff', wing: '#7ab0e0', horn: '#e0f8ff' }, parts: { horn: true, wings: 'bat', tail: 'long', crest: true } });
MO('minute', ['Minute', 'Hour-Wisp', 'Second Hand'], 'hour', 'S', 1, 'fo', [34, 16, 11, 10, 13, 17, 5], B('Tick', .8), [['stophex'], ['haste'], ['timeshear']], 40, 2,
  { kind: 'blob', R: 6, colors: { dk: '#8a6a20', base: '#d8b050', lt: '#f8e090', spec: '#ffffff', eye: '#2a2010' }, over: 'clock', float: true });
MO('clockwork', ['Clockwork Sentinel', 'Tick Knight', 'Pendulum Paladin'], 'hour', 'M', 3, '', [80, 8, 21, 20, 8, 9, 4], B('Slash', 1), [['windup'], ['shieldwall'], ['pendulum']], 80, 5,
  { kind: 'hum', look: { size: 1.2, build: 'heroic', weapon: 'sword', armor: true, hat: 'helmet', colors: { cloth: '#6a5a3a', pants: '#5a4a2a', plate: '#d8b050', metal: '#e8d8a0', skin: '#3a3020', boot: '#4a3a20', trim: '#f0d880' } }, halo: 'gear' });
MO('gearhound', ['Gearhound', 'Clockwork Hound', 'Chronohound'], 'hour', 'M', 2, '', [65, 6, 19, 15, 6, 15, 6], B('Bite', 1), [['pounce'], ['howl'], ['stopbite']], 60, 4,
  { kind: 'beast', body: 'quad', preset: 'hound', colors: { body: '#8a8a90', belly: '#b0b0b8', dark: '#4a4a50', accent: '#d8b050', eye: '#ff4020' }, parts: { gears: true, tail: 'short' } });
MO('stillwraith', ['Stillwraith', 'Hollow Hour', 'Unhour'], 'hour', 'M', 3, 'fo', [60, 30, 10, 10, 20, 13, 5], B('Spook', .8), [['timeshear', 'stophex'], ['drain'], ['hourstorm']], 85, 5,
  { kind: 'hum', look: { size: 1.1, build: 'heroic', weapon: null, outfit: 'robe', hood: true, sleeves: 'long', colors: { cloth: '#3a3a50', hair: '#2a2a3a', pants: '#2a2a3a', skin: '#e8e0c8', trim: '#d8c070' } }, alpha: .78, clockFace: true, float: 6 });
MO('pendulumwyrm', ['Pendulum Wyrm', 'Great Pendulum', 'The Long Hand'], 'hour', 'L', 5, 'boss', [150, 20, 26, 22, 18, 8, 4], B('Bite', 1), [['pendulum', 'timeshear'], ['coil'], ['hourstorm']], 200, 12,
  { kind: 'beast', body: 'serpent', colors: { body: '#a08a50', belly: '#d8c890', dark: '#5a4a2a', accent: '#d8c070', eye: '#ff3020' }, parts: { pendulum: true, gears: true } });
MO('skeleton', ['Skeleton', 'Skeleton Knight', 'Bone Lord'], 'autumn', 'M', 2, '', [60, 6, 18, 12, 5, 11, 4], B('Slash', 1), [[], ['shieldwall'], ['charge']], 50, 3,
  { kind: 'hum', look: { size: 1.05, build: 'skeleton', weapon: 'sword', colors: { bone: '#e8e0c8', metal: '#a08060' } } });
MO('bat', ['Giant Bat', 'Vampire Bat', 'Night Bat'], 'winter', ['S', 'S', 'M'], 1, 'fl', [32, 8, 12, 7, 8, 19, 6], B('Bite', .9, [1, 1], { drain: .25 }), [['dive'], ['drain'], ['fear']], 30, 2,
  { kind: 'blob', R: 5, colors: { dk: '#2a1a3a', base: '#4a3a5a', lt: '#7a6a8a', spec: '#c0a0e0', eye: '#ff3040' }, wings: true, mouth: 'fangs', ears: 'cat', fly: true });
MO('slime', ['Slime', 'Royal Slime', 'Slime Sovereign'], 'spring', 'S', 1, '', [44, 10, 11, 12, 9, 9, 3], B('Headbutt', .9), [['engulf'], ['regenerate'], ['bramblestorm']], 25, 2,
  { kind: 'blob', R: 7, colors: { dk: '#1a7a7a', base: '#3ac0b0', lt: '#80f0e0', spec: '#ffffff', eye: '#103030' }, over: 'slime' });
MO('ogre', ['Ogre', 'Ogre Chieftain', 'Ogre Warlord'], 'summer', 'L', 4, '', [125, 6, 27, 16, 4, 7, 4], B('Maul', 1.15), [['roar'], ['charge'], ['groundpound']], 110, 7,
  { kind: 'hum', look: { size: 1.5, build: 'bulky', weapon: 'staff', outfit: 'tunic', hair: 'bald', colors: { skin: '#7a9a6a', cloth: '#6a4a2a', pants: '#4a3a2a', boot: '#3a2a1a', metal: '#6a4a2a' } }, tool: 'club' });
MO('harpy', ['Harpy', 'Harpy Matron', 'Storm Harpy'], 'spring', 'M', 2, 'fl', [55, 14, 17, 10, 12, 17, 6], B('Talon', 1), [['dive'], ['gale'], ['screech']], 55, 3,
  { kind: 'hum', look: { size: 1, build: 'heroic', weapon: null, outfit: 'tunic', hair: 'long', sleeves: 'none', colors: { skin: '#e8c8a8', hair: '#6a4a8a', cloth: '#8a6aa8', pants: '#6a4a8a', boot: '#d8b040' } }, wings: 'feather', wingColor: '#9a7ab8' });
// a monster form's stats at a level (×aiPlayerBoost applied in the battle for the player's side)
G.TIER_MUL = [1, 1.35, 1.75];
G.monsterStats = (sp, tier, lvl) => {
  const m = G.get('monster', sp), b = m.base, k = G.TIER_MUL[tier - 1], f = 1 + .05 * (lvl - 1);
  const st = { hp: b[0] * k, mp: b[1] * k, atk: b[2] * k, def: b[3] * k, int: b[4] * k, agi: b[5] + (tier - 1) * 2 };
  for (const s of G.STATS) st[s] = Math.round(st[s] * f);
  st.mov = b[6] + (tier === 3 && m.flags.includes('fl') ? 1 : 0);
  return st;
};
G.monsterSkills = (sp, tier) => { const m = G.get('monster', sp), out = []; for (let t = 0; t < tier; t++) for (const s of m.skills[t]) if (!out.includes(s)) out.push(s); return out; };
G.monsterFlags = (sp, tier) => { const f = G.get('monster', sp).flags; return { fl: f.includes('fl') && !f.includes('t2fl') || (f.includes('t2fl') && tier >= 2), sw: f.includes('sw'), fo: f.includes('fo') && !f.includes('t3fo') || (f.includes('t3fo') && tier >= 3), boss: f.includes('boss') }; };
G.upkeepOf = (sp, tier) => G.get('monster', sp).upkeep * [1, 1.5, 2][tier - 1];
