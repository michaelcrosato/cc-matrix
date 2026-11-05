/* Every player-facing line: inscriptions, notes, story, NPC scripts. Terse, second person, a little formal. */
B.TITLE = 'EYE OF THE BOLT-HOLDER'; B.TAGLINE = 'A thousand locks. One eye.';
B.NOTES = {
  n1: ['HASP DRAIN GATE', 'By order of the Council of Keys: what is locked shall stay locked. The grate above is bolted fast. There is no way back.'],
  n2: ['SCRATCHED INTO STONE', 'Snick keeps the Drain Door\'s key on his belt. Snick is not generous.'],
  n3: ['THE LAW OF WEIGHTS', 'A plate cannot tell a hero from a stone. Where you cannot stand, set something down. Where you cannot throw, set something down anyway.'],
  n4: ['THE TUMBLERWRIGHTS\' GUILD', 'Time is a lock. We are its key. Four gears wake the great clock; one is always in the last place you look.'],
  n5: ['A GUILDSMAN\'S WARNING', 'Walk far enough and the hall walks with you. A loose stone in the south wall will call it off.'],
  n6: ['WEIGHT HALL', 'Down, to the eyes. Take only what you can carry back.'],
  n7: ['THE CHAPEL OF THE LIDS', 'Light the flames in the order the eye opens: small, then middle, then great.'],
  n8: ['THE GLOAM DEEPS', 'Do not look back at what looks at you. Three wards open the Undergate: iron, brass, bone.'],
  note1: ['TORN NOTE', 'Snick took the key and the cellar below. The plate-gate holds only while something heavy sits on it. Put a rock there, and mind the dart trap in the channel. T.P.']
};
B.MSG = {
  wall: 'You can\'t go that way.', gate: 'The gate will not budge.', mon: 'Something blocks the way!', locked: 'It is locked.',
  unlock: 'The key turns. The door opens.', noKey: 'It wants a key you do not have.', illusion: 'The wall is an illusion!', darts: 'Darts fly from the walls!',
  twist: 'You feel a twisting underfoot.', pit: 'The floor gives way! You fall.', seal: 'The seal flares, then dims. It wants a spell.', rest0: 'You may not rest with enemies near.',
  wake: 'You are awakened by something moving!', hungry: ' is hungry.', starving: ' is starving!', miss: 'swings at the air.', tele: 'The air folds. You are elsewhere.'
};
B.INTRO = [
  ['Hasp, the City of a Thousand Locks, has always been proud of its bolts.'],
  ['Tonight, they have begun to slide home on their own. Doors seal. Wells cap shut. The granary will not open for axes.'],
  ['The Council of Keys has named a cause: something beneath the Drains is holding every lock in the city. High Keywarden Imelda Strake wants it let go.'],
  ['You are four. You are all they could spare. The grate closes behind you with a sound like a very good lock.']
];
B.ENDING = [
  ['The Eye cracks. Seven bolts fly from it and ring on the stone like a church tuned wrong.'],
  ['Above, in Hasp, a thousand locks sigh at once. Doors open. Wells breathe. A granary lets out a smell of wheat.'],
  ['Imelda Strake will say the Council sent a force. She will say it with a straight face. You will let her.'],
  ['Somewhere below, a clock strikes an hour it forgot. The guild is, at last, on time.']
];
B.NPCS = {
  tamsin: { name: 'Tamsin Pell', race: 'human', cls: 'ranger', lvl: 2, look: { hair: 'ponytail', hat: 'hood', cloth: '#3a6a3e', skin: '#d8a888', hairc: '#6a3a1e' }, voice: 'tamsin', gear: ['shortsword', 'shortsword', 'leather', 'shortbow', 'arrows'],
    talk: [['Tamsin Pell', 'You are the Council\'s four? Good. I am Tamsin Pell, a ranger of the Drains, and I have been very quiet for three days.'], ['Tamsin Pell', 'Snick\'s Latchkins have the key to the Drain Door. I can find the way down, if you will have a ranger who is sometimes rude.']],
    ask: 'Will you take Tamsin Pell?', yes: 'I walk where you walk. I will not walk in front.', no: 'Then I wait. The rats are poor company, but they do not interrupt.', join: 'Tamsin Pell joins the party!' },
  durgan: { name: 'Durgan Copperhand', race: 'dwarf', cls: 'fighter', lvl: 3, look: { hair: 'bald', hat: 'helmet', cloth: '#5a4a3a', skin: '#c89070', hairc: '#a05a2a', beard: 'braided' }, voice: 'durgan', gear: ['warhammer', 'ironshield', 'chainshirt', 'helm'],
    talk: [['Durgan Copperhand', 'A guildsman. Sixth generation. They sealed us in for our own good, and I have outlasted my own good.'], ['Durgan Copperhand', 'The Sentinel holds the brass key. The pit beyond the long hall wants a feather. Take me with you; I know the clock.']],
    ask: 'Will you take Durgan Copperhand?', yes: 'Aye. We shall tell it the time together.', no: 'Another day, then. The anvil and I have things to discuss.', join: 'Durgan Copperhand joins the party!' },
  veil: { name: 'Sister Veil', race: 'human', cls: 'cleric', lvl: 4, look: { hair: 'long', hat: 'hood', cloth: '#d8d0e8', skin: '#c8c0d8', hairc: '#3a2a4a' }, voice: 'veil', gear: ['mace', 'symbol', 'chainshirt'],
    talk: [['Sister Veil', 'I keep my eyes shut. The Deeps are kinder that way. I was the cult\'s seer, and I have stopped seeing for them.'], ['Sister Veil', 'Take me down. I know where the wards are kept, and I will not look at you while I say so.']],
    ask: 'Will you take Sister Veil?', yes: 'Then I walk by your voices. Lead on.', no: 'I will wait. I am practised at it.', join: 'Sister Veil joins the party!' },
  ysolde: { name: 'Ysolde Vane', race: 'human', cls: 'mage', lvl: 1, look: { hair: 'long', hat: null, cloth: '#7aaadf', skin: '#c0d8f0', hairc: '#c0d0ff' }, voice: 'ysolde',
    talk: [['Ysolde Vane', 'Guildmistress Vane. Dead, I am told, though the clock disagrees.'], ['Ysolde Vane', 'Whole again. It strikes. Thank you, travellers. Take the shrine\'s ward: it was always meant for someone who finished things.']] }
};
B.QUESTS = [
  ['main', 'Under the Drains', 'Find the way down through Hasp\'s Drains.', f => f.f1done],
  ['tumbler', 'The Tumbler Halls', 'Mend the great clock. Find a way past the Sentinel.', f => f.f2done],
  ['gloam', 'The Gloam Deeps', 'Gather three wards to open the Undergate.', f => f.f3done],
  ['eye', 'The Bolt-Holder', 'Turn the three Great Locks, break the cage, and let Hasp go.', f => f.boss]
];
B.BARKS = { hurt: ['Oof!', 'Ugh!', 'Ow!', 'Hrk!'], effort: ['Hah!', 'Hyah!', 'Ha!'], level: ['Yes!', 'Hooray!'], cast: ['Hm-hm!', 'Ex-ah!'] };
B.PREMADE = [
  { name: 'Brannoc', race: 'human', cls: 'fighter', sex: 'm', stats: { str: 16, dex: 12, con: 14, int: 9, wis: 10 }, look: 0 },
  { name: 'Ketil', race: 'dwarf', cls: 'cleric', sex: 'm', stats: { str: 12, dex: 9, con: 15, int: 10, wis: 16 }, look: 1 },
  { name: 'Elowen', race: 'elf', cls: 'mage', sex: 'f', stats: { str: 8, dex: 15, con: 10, int: 17, wis: 11 }, look: 2 },
  { name: 'Wick', race: 'halfling', cls: 'thief', sex: 'm', stats: { str: 9, dex: 17, con: 12, int: 12, wis: 10 }, look: 3 }
];
B.NAMES = { human: ['Brannoc', 'Maud', 'Corvin', 'Isolde', 'Halvard', 'Perrin', 'Sabine', 'Tobias', 'Rowan', 'Lysa', 'Edric', 'Marta'], dwarf: ['Ketil', 'Brunna', 'Thorik', 'Hilda', 'Dagnar', 'Orla', 'Bofri', 'Grima', 'Dolgan', 'Sigrun', 'Ulf', 'Yrsa'], elf: ['Elowen', 'Faelar', 'Sylra', 'Aerin', 'Lethil', 'Naia', 'Caelum', 'Ilyra', 'Thalion', 'Vael', 'Orin', 'Mirel'], halfling: ['Wick', 'Pippa', 'Tobin', 'Nell', 'Fenwick', 'Rosie', 'Alder', 'Bram', 'Posy', 'Hob', 'Marigold', 'Tam'] };
B.LOOKS = {
  human: [{ skin: '#d8a888', hair: '#4a2e1e', cloth: '#7a3a2e' }, { skin: '#e8c0a0', hair: '#c8a050', cloth: '#d8d0b8' }, { skin: '#c89070', hair: '#2a2a30', cloth: '#3a5a3e' }, { skin: '#a8704a', hair: '#1a1a22', cloth: '#5a3a7a' }, { skin: '#e8c8b0', hair: '#8a3a1e', cloth: '#2a4a7a' }, { skin: '#d0a080', hair: '#d0d0d8', cloth: '#6a5a4a' }],
  dwarf: [{ skin: '#c89070', hair: '#a05a2a', cloth: '#5a4a3a' }, { skin: '#d8a888', hair: '#3a2a1e', cloth: '#6a4a2a' }, { skin: '#b88060', hair: '#d0d0d8', cloth: '#4a5a6a' }, { skin: '#c89878', hair: '#7a2a1e', cloth: '#7a3a2e' }, { skin: '#d0a080', hair: '#2a2a30', cloth: '#4a3a5a' }, { skin: '#c08a68', hair: '#c8a050', cloth: '#3a5a3e' }],
  elf: [{ skin: '#e8d0c0', hair: '#e0e0e8', cloth: '#3a3a7a' }, { skin: '#e0c8b0', hair: '#4a3a5a', cloth: '#3a6a5a' }, { skin: '#d8c0a8', hair: '#c8a050', cloth: '#7a4a7a' }, { skin: '#c8b098', hair: '#1a1a22', cloth: '#2a4a6a' }, { skin: '#e8d8c8', hair: '#a02a3a', cloth: '#5a3a2a' }, { skin: '#d0b8a0', hair: '#7a8a5a', cloth: '#3a5a3e' }],
  halfling: [{ skin: '#e8c0a0', hair: '#6a3a1e', cloth: '#5a7a3a' }, { skin: '#d8a888', hair: '#c8a050', cloth: '#7a5a2a' }, { skin: '#e0b898', hair: '#2a2a30', cloth: '#3a4a7a' }, { skin: '#c89070', hair: '#8a3a1e', cloth: '#7a3a3a' }, { skin: '#e8d0b8', hair: '#a8a8b0', cloth: '#4a4a4a' }, { skin: '#d8b090', hair: '#4a2e1e', cloth: '#6a3a6a' }]
};
B.HOWTO = 'Step, turn and sidestep one cell at a time. Every hand is its own attack with its own cooldown. Monsters wind up before they strike: a step to the side makes them miss.';
