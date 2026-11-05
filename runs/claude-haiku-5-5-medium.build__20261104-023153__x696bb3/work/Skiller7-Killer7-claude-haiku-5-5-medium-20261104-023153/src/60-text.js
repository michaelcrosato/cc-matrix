/* Skiller7: the words. Dialogue, cards and the About & Credits screen. The voice is terse, formal, a little sinister,
 * and very polite about murder: hotel euphemisms, cold weather, and a laughing wind. */
S7.LINES = {
  t00Arrival: [
    'The Grand Hotel Nada, built in 1926. Somebody has been laughing in it ever since.',
    'Your coat is pressed. Your guests have not yet checked out.'
  ],
  t01Arrival: [
    'The village is quiet, too quiet for a place that sells skiing.',
    'Above it the black run goes all the way down to the Powder King, and the Powder King is laughing.'
  ],
  room7Intro: [
    'Welcome to Room 7. The featherbed on the bed is Oma Holle. She is one hundred and four years old and she has been asleep for a hundred years.',
    'Do not lift the featherbed. When she shakes it, the wardrobe opens, and seven coats step out. You are one of the seven.',
    'The Department of Discretion has booked guests for the Grand Hotel Nada. Mister Foehn has been laughing on the lower floors. Each time he laughs, a guest walks out of the room and is not there any more.',
    'Your guests have been checked in. Please check them out.'
  ],
  rosalind: [
    'Sister Rosalind, sir. The clock on the wall is the cuckoo clock. It saves your place, and it is never wrong about the time.',
    'The Wardrobe holds your coats. The Wax Bench will wax your skills, for Rime. Rime is what the crystals in the snow are made of, and it is what the mountain pays us in.',
    'Mind the gap at the lift. Mind the Whiteouts. You will not see them. You will hear them laugh.'
  ],
  after: {
    t00: [
      'The lift has been serviced. The Bellcaptain rang for the last time and will not ring again.',
      'The black run is open, sir, though it is steep. Gratuity is customary at the top.'
    ]
  },
  t00Done: [
    'THE BELLCAPTAIN IS OUT OF SERVICE. Rime is counted and the Wardrobe has two new coats.',
    'Mister Foehn has the laughter of a lift in him. He will not forget the room.'
  ],
  t01Done: [
    'THE POWDER KING MELTS, LAUGHING. The featherbed is quiet for one whole minute.',
    'Somewhere over the mountain, a warm wind laughs once more, very quietly, and goes out.'
  ]
};

/* the About & Credits screen: [kind, text]; kind h = heading, w = wrapped text, s = space */
S7.CREDITS = [
  ['h', 'SKILLER7'],
  ['w', 'Seven killers share one body and one mountain. Ride the rails. Stop. Scan for the laughing Whiteouts. Shoot the warm spot before it laughs.'],
  ['s', 0],
  ['h', 'SOURCE INFORMATION'],
  ['w', 'Source: Killer7 (Grasshopper Manufacture, 2005). This game is original: its name, world, characters, levels and music are its own. It takes the source\'s rail structure, its stop-and-scan first person and its tone.'],
  ['w', 'Title: a playful riff on the source\'s name, drawn by a random number generator from fifty riffs.'],
  ['s', 0],
  ['h', 'ENGINE'],
  ['w', 'my-3D2dge v0.85.2 (2D engine and its 3D module), three.js r182 and Rapier 0.19.3 from a CDN. AI Hub session client 1.4.0.'],
  ['s', 0],
  ['h', 'CONTROLS'],
  ['w', 'Keyboard: W walk, S stop, A or D turn round, hold Shift or right mouse to aim, left mouse fires, Space scans, E ability, Q switches coat, F interacts, R rings time, H heals.'],
  ['w', 'Controller: Cross walks, Circle stops, Square interacts, Triangle switches, R2 fires, L2 aims, L1 scans, R1 ability, L3 rings time, R3 turns round.'],
  ['s', 0],
  ['h', 'PEOPLE'],
  ['w', 'Oma Holle sleeps. Mister Foehn laughs. Sister Rosalind keeps the clock. The Bellcaptain rings. The Powder King melts. Murmel is owed a tip.'],
  ['s', 0],
  ['h', 'MUSIC AND SOUND'],
  ['w', 'Every note and every voice is written in code. Laughter is an arpeggio. Dialogue is Animalese-style gibberish, one blip a letter.'],
  ['s', 0],
  ['h', 'TESTING FEEDBACK'],
  ['w', 'About fifteen issues were caught: a crash on Room 7, a black frame from the Comic cel filter, two Rime gates that could lock a run, a junction that committed by itself, and a camera inside a wall. Five were game-breaking. The most useful test was the Node playthrough of every area; the least useful was frame-by-frame screenshots.'],
  ['s', 0],
  ['h', 'ENGINE FEEDBACK'],
  ['w', 'Liked most: the 3D module\'s fixed cameras and the card-drawn rigs, with the pause menu, settings and saves for free. Guessed wrong: particle argument orders, pen box centres, the cel and pixel filters (black in the software renderer, so left out of Settings), and the menu close. Built myself: the rail walker, the Whiteout AI, the persona abilities, the bot. One engine patch: accessories (goggles, scarves, moustaches, beards) for the card rig, marked S7 PATCH.'],
  ['s', 0],
  ['h', 'PROMPT FEEDBACK'],
  ['w', 'Liked: concrete deliverables, file names and checks, and the one-command test rule. Confusing: the plan is about 2,100 lines and asks for engine patches and seven full personas, so the scope had to be cut to fit. Change: give the plan a must, should and cut list and a size budget.'],
  ['s', 0],
  ['h', 'THANKS'],
  ['w', 'To the players who ride the rails at the speed of the snow.'],
];

/* the dossier: notes found on the rails (each one is a pickup; the dossier lists those you have read) */
S7.NOTES = {
  'note-powder': { title: 'SLOPE CLOSURE', text: 'The black run is closed to the public after the third bell. The Powder King is not a hazard. He is a snowman, and he would like you to stop shooting his nose.' },
  'note-lift': { title: 'LIFT SCHEDULE', text: 'The lift is serviced on the hour. Please do not stand under the bell. The service door behind the stairs is for staff, and the staff are not here.' },
  'note-ballroom': { title: 'BALLROOM, EVENING', text: 'Members may enter. Non-members may enter, but will be remembered. Mister Foehn asks that the waltz be played a little faster than the laughter.' }
};

/* the people you can talk to. lines by area; any: the lines for every other place */
S7.NPCS = {
  hansi: { name: 'HANSI MOOSER', voice: 'oma', kind: 'human', colors: { cloth: '#2f7a3a', coat: '#2f7a3a', pants: '#5a3a20', boot: '#2a1a10', trim: '#e0c060', skin: '#f5cfa8', hair: '#8a6a3a' }, hat: 'pointed', lines: {
    t01: ['Hoo-hoo! I am a yodeler. I yodel for money, and the Whiteouts do not pay, so I yodel for free and they laugh at me.',
          'The rope across the lane is for members. Mister Gerhardt is the member. The rope is his idea, and his rope has a sense of humour.'] } },
  murmel: { name: 'MURMEL', voice: 'murmel', kind: 'blob', lines: {
    t00: ['Murmel. Resort marmot. I am bungeed to this ski rack, which is my job, and I am very good at it.',
          'Gratuity is customary. Customary is the word we use when nobody can remember who started it.',
          'The Whiteouts laugh before they arrive. Listen for the laughing, scan, then shoot the warm spot. Do not shoot the air.'],
    t01: ['Gratuity is still customary, and the slope is steeper than the bill.',
          'Mister Gerhardt owes me a sled. He says it is in the Powder King\'s hands. I say the Powder King has no hands.'] } },
  pim: { name: 'PIM', voice: 'pim', kind: 'ghost', colors: { cloth: '#1a2a4a', coat: '#1a2a4a', pants: '#10182a', boot: '#0a0a10', trim: '#d8b040', skin: '#e8e8f0', hair: '#c8c8d8' }, hat: 'cap', lines: {
    t00: ['Hello. I am the lift boy. I have been on this chairlift seat since 1926, and I am still on duty.',
          'The service door behind the stairs has a code. Nineteen twenty-six, the year they stopped the lift. Please do not tell the Bellcaptain. He is very particular.'] } }
};
