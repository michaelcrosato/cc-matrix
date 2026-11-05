/* TEXT: every line the player reads, in the source's voice (terse, second person; inscriptions in capitals; formal
 * NPCs). Stories are dialogue as data: lines of [speaker, text], then choices whose actions the sim runs. */
B.NOTES = {
  tornPage: { title: 'A Torn Page', text: '...they take the bolts, all the iron, every nail and hinge, down the right channel to HIM. Snick says HE pays in shiny. Snick says HE sees everything...' },
  guildLedger: { title: 'The Guild Ledger', text: 'Tumbler Lock, cell 4: the creed governs it. Undergate wards: copper to the Drainwarden, brass to the Vault, iron to the Lidless, who swore to keep it. Watcher: bolts tested, seven of seven. God help us if it learns to like it.' },
  seersPsalm: { title: "The Seer's Psalm", text: 'One for the Lid, in the north-west. Two for the Lash, in the south-west. Three for the Iris, north and centre. Four for the Pupil, south and centre. Five for the Lens, in the north-east. Six for the Light, in the south-east.' }
};
B.SPEAKERS = {
  narrator: { name: '', voice: 'narrator' },
  strake: { name: 'Keywarden Strake', voice: 'strake', rig: { size: 1.3, build: 'heroic', hair: 'ponytail', hat: { style: 'crown', color: '#c8c8d8' }, outfit: 'coat', weapon: null, colors: { cloth: '#2a3a6a', coat: '#1e2a4e', trim: '#c8c8d8', hair: '#3a2a22', skin: '#d8a888', pants: '#1a1a2a' } } },
  lintel: { name: 'Magister Lintel', voice: 'lintel', rig: { size: 1.25, build: 'heroic', hair: 'long', hat: 'pointed', outfit: 'robe', weapon: 'staff', colors: { cloth: '#5a2a6a', hat: '#5a2a6a', hair: '#e8e8f0', skin: '#e0c0a8', trim: '#c8a050' } } },
  ysolde: { name: 'Ysolde Vane', voice: 'ysolde', rig: { size: 1.25, build: 'heroic', hair: 'long', outfit: 'robe', weapon: null, colors: { cloth: '#8ab8e8', hair: '#c8e0ff', skin: '#c8e0f0', trim: '#e8f0ff' } }, ghost: true },
  tamsin: { name: 'Tamsin Pell', voice: 'tamsin', rig: { size: .9, hair: 'ponytail', hood: true, outfit: 'tunic', weapon: null, colors: { cloth: '#3a6a3a', hair: '#3a6a3a', skin: '#e8b898', pants: '#4a3a2a' } } },
  durgan: { name: 'Durgan Copperhand', voice: 'durgan', rig: { size: 1.1, build: 'bulky', hair: 'short', beard: 'braided', hat: { style: 'helmet', color: '#8a8a90' }, outfit: 'tunic', armor: true, weapon: null, colors: { cloth: '#8a4a2a', hair: '#c86a2a', skin: '#e0a888', plate: '#c87a4a' } } },
  veil: { name: 'Sister Veil', voice: 'veil', rig: { size: 1.2, build: 'heroic', hair: 'long', hood: true, outfit: 'robe', weapon: 'staff', colors: { cloth: '#d8d0e8', hair: '#2a2a3a', skin: '#e0d0d8', trim: '#6a4a9a' } }, shut: true },
  snick: { name: 'Snick', voice: 'snick' },
  eye: { name: 'The Bolt-Holder', voice: 'eye' }
};
B.STORIES = {
  tamsin: { lines: [['tamsin', 'Took you long enough! Three days in a birdcage, and the little latch-thieves poking me with forks.'],
    ['tamsin', 'Tamsin Pell, journeywoman of the Lockwrights. Or I was, before the locks went mad.'],
    ['tamsin', "You're going down, aren't you? Toward the thing that's doing this. Take me along. I open what your keys can't."]],
  choices: [{ label: 'Join us', reply: [['tamsin', "Then let's go and annoy something big."]], do: [['join', 'tamsin'], ['quest', 'tamsin', 'Tamsin Pell walks with you.']] },
    { label: 'Go home, Tamsin', reply: [['tamsin', "Suit yourself. Take these. You'll need them more than me."], ['tamsin', "Mind the right channel. That's where they nest."]], do: [['give', 'lockpicks'], ['flag', 'tamsinGone', 1], ['quest', 'tamsin', 'Tamsin Pell went home.']] }] },
  durgan1: { lines: [['durgan', "Don't stand there gawping. Those levers on the wall behind you are the Tumbler Lock. My own design, and I'm locked on the wrong side of it."],
    ['durgan', "The creed is carved in the workshop. First falls, second rises, third falls. Can't reach the blasted things from in here."]], do: [['quest', 'durgan', 'Free the dwarf from the Tumbler Lock.']] },
  durgan2: { lines: [['durgan', "Ha! Durgan Copperhand thanks you. The guild's dead and gone, but its halls aren't done with me yet."],
    ['durgan', "Whatever's below took my brothers' work and twisted it. I'd like a word with it. A hammer-shaped word."],
    ['durgan', 'And take this gear. Found it in my cell. Looks like it belongs to the big clock.']],
  choices: [{ label: 'Come with us', reply: [], do: [['join', 'durgan'], ['give', 'tumblerGear'], ['quest', 'durgan', 'Durgan Copperhand walks with you.']] },
    { label: 'Find your own way out', reply: [['durgan', 'Hmph. Then luck to you.']], do: [['give', 'tumblerGear'], ['flag', 'durganGone', 1], ['quest', 'durgan', 'Durgan went his own way.']] }] },
  ysolde1: { lines: [['ysolde', 'Living feet, in the Tumbler Halls. It has been a long time.'],
    ['ysolde', 'I was Guildmistress Ysolde Vane. We forged the Watcher for the Undergate: an eye that would never close, for a lock that must never open.'],
    ['ysolde', 'We gave it seven Great Bolts to hold. And it learned to love holding. Now it holds the whole city, one lock at a time.'],
    ['ysolde', 'Three Wards open the Undergate: copper, brass and iron. Ours, the brass, sleeps in the Guild Vault. What is sealed by art, art unseals.'],
    ['ysolde', 'And if you would do an old woman a kindness, the Great Clock has lost its four gears. Let it tell the hour once more.']], do: [['quest', 'wards', 'Gather the Three Wards: copper, brass and iron.'], ['quest', 'clock', 'Return the four gears to the Great Clock.']] },
  ysoldeHint: { lines: [['ysolde', 'The guild hid its catches in plain sight. Look to the walls.']] },
  ysolde2: { lines: [['ysolde', 'Close its eye, little keys. Close it for all of us.']] },
  veil: { lines: [['veil', 'Do not look at me so. Your eyes are loud, surface-folk.'],
    ['veil', 'I am Veil, once a Seer of the Lidless. I shut my eyes to the Watcher\'s voice, and for that they chained me here to be... corrected.'],
    ['veil', 'You seek the Iron Ward. The Wardens keep it in the Reliquary, past their barracks. There is another way. I know the stones that move.'],
    ['veil', 'Take me from this place and I will show you. Leave me, and pray the Wardens are asleep.']],
  choices: [{ label: 'We will help you', reply: [['veil', 'Push where the moss does not grow.']], do: [['veilHelp'], ['flag', 'veilHelped', 1], ['quest', 'veil', 'You freed Sister Veil.']] },
    { label: 'Stay here, seer', reply: [['veil', 'Then go with your eyes open. It will find you.']], do: [['flag', 'veilRefused', 1], ['quest', 'veil', 'You left Sister Veil in her cell.']] }] },
  snick1: { bark: true, lines: [['snick', 'MINE! All the shiny bolts are MINE!']] },
  snick2: { bark: true, lines: [['snick', 'Latchkins! To your king!']] },
  snick3: { bark: true, lines: [['snick', '...not... fair...']] },
  eye1: { lines: [['eye', 'Little keys. You have come so far, only to be turned.'], ['eye', 'Every lock is a promise. I KEEP THEM ALL.']] },
  eye3: { bark: true, lines: [['eye', 'You... unbolt... ME?']] },
  eye4: { bark: true, lines: [['eye', 'Then be locked in the dark FOREVER!']] },
  eye5: { bark: true, lines: [['eye', 'Who... will keep... the promises...?']] },
  eyeRelock: { bark: true, lines: [['eye', 'MINE. The bolt is MINE.']] },
  undergate: { lines: [['narrator', 'The third Ward turns. One by one, seven bolts as thick as a man draw back into the stone.'], ['narrator', 'The Undergate opens on a stair that hums like a struck bell.']] }
};
B.FLOOR_CARDS = {
  f1: ['THE HASP DRAINS', 'Cold water talks to itself in the channels. The walls sweat.'],
  f2: ['THE TUMBLER HALLS', 'The air smells of oil and old smoke. Somewhere, gears are turning.'],
  f3: ['THE GLOAM DEEPS', 'The stone here is black and warm, and it watches you.'],
  f4: ["THE EYE'S VAULT", 'The air hums like a struck bell.'],
  race: ['THE RAT RUN', 'Fastest party out wins. Mind the rats.']
};
B.OVER_LINES = { f1: 'The Drains keep what they take.', f2: 'The gears turn on without you.', f3: 'The Lidless close their eyes, and you with them.', f4: 'Every lock is a promise. It keeps this one.', race: 'The rats keep the run.' };
B.INTRO = [
  ['A', 'narrator', 'Hasp. The city of a thousand locks.'],
  ['A', 'narrator', 'For three hundred years its Tumblerwrights forged the finest locks in the world, and its people slept soundly behind them.'],
  ['A', 'narrator', 'Then the locks began to turn by themselves.'],
  ['A', 'strake', 'Doors bolt themselves in empty houses. Wells cap shut. Last night the east granary locked forty men inside and would not open for axes.'],
  ['A', 'lintel', 'It comes from below. Past the Drains, past the old guild halls... from the Undergate itself.'],
  ['A', 'strake', 'You were recommended to me as people who open things. Go down. Find what holds our bolts, and break its grip.'],
  ['B', 'narrator', 'The Drain-gate groans open. You step down into the dark.'],
  ['B', 'narrator', 'Behind you, the grate crashes shut. A great bolt slides home with a sound like a closing tomb.', 'slam'],
  ['X', 'narrator', 'Somewhere far below, something blinks.', 'blink']
];
B.ENDING = [
  ['C', 'narrator', 'The Eye cracks from lid to lid, and its light goes out.'],
  ['C', 'narrator', 'One by one, the seven Great Bolts fall silent.'],
  ['D', 'narrator', 'Above, in the city of a thousand locks, every door swings open at once.'],
  ['D', 'strake', "Hasp is in your debt. The guild's last forge will cast your names into the Undergate itself."],
  ['D', 'lintel', 'Yet the Undergate was built to keep something in. With its Watcher gone...'],
  ['D', 'narrator', 'Far beneath the city, in a darkness older than locks, something tries the door.']
];
/** hints: shown once each when Hints is on; {use} {strike} etc. become the player's own glyphs */
B.HINTS = {
  move: 'Step with {fwd}{back}{strafeL}{strafeR}; turn with {turnL}{turnR}.',
  strike: 'Rats! Press {strike} to strike with everyone who is ready.',
  hand: 'Each hand acts on its own: {handMain} and {handOff} use the selected member\'s hands.',
  camp: 'Press {camp} to make camp: rest, memorize spells and eat.',
  party: 'Press {party} to open the Party screen and equip what you find.',
  hold: 'With something in your hand, hold {use} to put it down, or {throw} to throw it.',
  plate: 'Something heavy might hold it down.',
  buttons: 'Two buttons, one gate. Perhaps they must be pressed together.',
  map: 'Press {map} for the map.',
  examine: 'Press {examine} to look closely at what is in front of you.',
  cast: "A spellbook or holy symbol in hand opens the spells: press that hand's button.",
  teleport: 'The corridor seems longer than it should.'
};
