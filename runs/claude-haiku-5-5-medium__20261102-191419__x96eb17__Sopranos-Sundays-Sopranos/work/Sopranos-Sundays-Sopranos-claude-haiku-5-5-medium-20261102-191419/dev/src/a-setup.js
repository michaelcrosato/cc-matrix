/* ============================================================================
 * SOPRANOS SUNDAYS  (src/a-setup.js)  the engine alias, the settings, the controls,
 * the music and sound, the people and the talk. Concatenated after the engine and
 * the AI Hub client into one page, so every file shares this one E.
 * ========================================================================== */
const E = My3D2dge;
const SS = {
  id: 'sopranos-sundays',
  title: 'SOPRANOS SUNDAYS',
  tagline: 'a Sunday in North Jersey, for the family',
  roundMinutes: 3,
  maxHp: 6,
  heroSpeed: 78,
  sprintSpeed: 118,
  idleToAttract: 10,
  // what counts toward the AI Hub round score
  score: st => Math.round(st.cash + st.respect * 25 + st.kills * 15 + st.calm * 5)
};

// ---- controls: the third-person preset, with a pistol on G (or the mouse's right button and LT)
const SS_INPUT = Object.assign({}, E.Input.THIRDPERSON, {
  gun: ['KeyG', 'Mouse2', 'Pad6'],
  use: ['KeyQ'],
  crouch: ['KeyC', 'ControlLeft', 'Pad1'],
  camera: ['KeyV', 'Pad11']
});

// ---- the settings this game adds to the standard ones (its own keys: the engine's invertY is the aim's)
const SS_SETTINGS = [
  { key: 'stickInvertX', label: 'Invert stick left and right', value: false, help: 'Fixes a pad whose left-right input comes in backwards' },
  { key: 'stickInvertY', label: 'Invert stick up and down', value: false, help: 'Fixes a pad whose up-down input comes in backwards' }
];

// ---- music: tracks of notes, one token a step ('-' holds, '.' rests, 'k s h' drums)
const SS_SONGS = {
  title: { bpm: 84, steps: 16, tracks: [
    { wave: 'triangle', vol: .22, notes: 'A2 - - - E2 - - - F2 - - - E2 - - -' },
    { wave: 'square', vol: .06, notes: 'A4 . C5 . E5 . C5 . G4 . B4 . D5 . B4 .' },
    { wave: 'drums', vol: .18, notes: 'k . . . s . . . k . . . s . h .' }
  ] },
  street: { bpm: 104, steps: 16, tracks: [
    { wave: 'saw', vol: .09, notes: 'D2 . D2 . F2 . D2 . C2 . C2 . G2 . C2 .' },
    { wave: 'pulse', vol: .05, notes: 'D4 F4 A4 . C5 . A4 F4 . G4 B4 D5 . B4 G4 .' },
    { wave: 'drums', vol: .16, notes: 'k h s h k h s h k h s h k h s h' }
  ] },
  fight: { bpm: 132, steps: 16, tracks: [
    { wave: 'saw', vol: .1, notes: 'E2 E2 E2 . E2 E2 G2 . A2 A2 A2 . C3 . B2 .' },
    { wave: 'square', vol: .05, notes: 'E4 . G4 . B4 . E5 . D5 . B4 . G4 .' },
    { wave: 'drums', vol: .2, notes: 'k s k s k k s s k s k s k s s s' }
  ] },
  dinner: { bpm: 76, steps: 16, tracks: [
    { wave: 'triangle', vol: .2, notes: 'C3 - G2 - A2 - F2 - C3 - G2 - F2 - G2 -' },
    { wave: 'pulse', vol: .05, notes: 'E4 . . G4 . . C5 . . . A4 . . G4 .' }
  ] }
};

// ---- audio: the Animalese (each letter's blip at its own pitch) and the stings
function ssDefineSounds(game) {
  Object.assign(E.songs, SS_SONGS);
  game.audio.define('gibber', { wave: 'pulse', freq: 300, to: 180, dur: .045, vol: .10 });
  game.audio.define('cashin', { wave: 'square', freq: 880, arp: [0, 7, 12], step: .05, dur: .14, vol: .14 });
  game.audio.define('whack', { wave: 'noise', dur: .07, vol: .3 });
  game.audio.define('gunshot', { wave: 'noise', dur: .09, vol: .26 });
}

// ---- the people: a Humanoid each (for the portrait and the world), and their names
const SS_PEOPLE = {
  nunzio: { name: 'NUNZIO DELUCA', colors: { skin: '#e0b48c', hair: '#1c1816', cloth: '#1d1f2a', coat: '#1d1f2a', pants: '#14141c', boot: '#0c0a08', trim: '#caa64a' }, outfit: 'coat', hair: 'short' },
  lenny: { name: 'LENNY PASTORE', colors: { skin: '#e8b890', hair: '#8a8078', cloth: '#f2efe8', pants: '#3a3430', boot: '#2a1c12', trim: '#c4502f' }, outfit: 'shirt', hair: 'bald', hat: null, build: 'bulky' },
  gino: { name: 'GINO VALLE', colors: { skin: '#d8a880', hair: '#2a2420', cloth: '#7a2a2a', pants: '#2a2630', boot: '#1a140e', trim: '#e8c060' }, outfit: 'shirt', hair: 'short' },
  pinky: { name: 'PINKY LUCCA', colors: { skin: '#f0c8a0', hair: '#c8b088', cloth: '#2e6a5a', pants: '#24283a', boot: '#1a1410', trim: '#f0e0a0' }, outfit: 'shirt', hair: 'short' },
  doc: { name: 'DR. GILDA MARCHETTI', colors: { skin: '#f0cdb0', hair: '#5a3a2a', cloth: '#3a4a6a', pants: '#2a2f40', boot: '#2a2420', trim: '#c8c8d8' }, outfit: 'coat', hair: 'long' },
  ricca: { name: 'MAMA RICCA', colors: { skin: '#e8b890', hair: '#6a6a72', cloth: '#7a2a40', pants: '#3a2a30', boot: '#1a1410', trim: '#e0c070' }, outfit: 'robe', hair: 'long' },
  frankie: { name: 'FRANKIE BONACCI', colors: { skin: '#d8a070', hair: '#101010', cloth: '#f2f0e8', coat: '#f2f0e8', pants: '#2a2a32', boot: '#0c0a08', trim: '#e04040' }, outfit: 'coat', hair: 'short', build: 'bulky' },
  crew: { name: 'BOBBY TWO-CARS', colors: { skin: '#c89070', hair: '#201a18', cloth: '#303036', coat: '#2a2a32', pants: '#1a1a22', boot: '#100c0a', trim: '#8a8a94' }, outfit: 'coat', hair: 'short', build: 'bulky' },
  thug: { name: 'STREET CREW', colors: { skin: '#d0a078', hair: '#3a2a20', cloth: '#5a4a3a', coat: '#4a3e30', pants: '#2e2820', boot: '#100c0a', trim: '#b0a080' }, outfit: 'coat', hair: 'short' }
};

// the stories: people talk through Story; a line's choices set flags, add values, or go to another node
function ssShopNode(id, amount) {
  return [
    { who: id, say: id === 'lenny' ? ['Nunz. Didn\'t expect the boss himself on a Tuesday.', 'The envelope\'s light. Business is pork chops and sadness.'] : ['Nunz! Sit, sit. You want an espresso or you want to talk business?'] },
    { who: id, say: 'So what are we doing here?', choices: [
      { text: 'Pay the envelope. Two hundred.', goto: id + '_paid' },
      { text: 'Tell him the envelope doubles when the sausage does.', goto: id + '_talk' },
      { text: 'Break a chair over his head.', goto: id + '_shake' }
    ] }
  ];
}
const SS_NODES = {
  lenny: ssShopNode('lenny', 200),
  lenny_paid: [{ who: 'lenny', say: 'Grazie, Nunz. Tell Mama the chops are on the house Sunday.' }, { event: 'collected', who: 'lenny', amount: 200, flag: 'lenny' }],
  lenny_talk: [{ who: 'lenny', say: 'Ah, the sausage... fine. Two hundred, and you eat lunch here.' }, { event: 'collected', who: 'lenny', amount: 200, flag: 'lenny' }],
  lenny_shake: [{ who: 'lenny', say: 'Okay! Okay! The money\'s in the drawer!' }, { event: 'shakedown', who: 'lenny', amount: 260, flag: 'lenny' }],
  gino: ssShopNode('gino', 180),
  gino_paid: [{ who: 'gino', say: 'Ah, a man of his word. The espresso is on me.' }, { event: 'collected', who: 'gino', amount: 180, flag: 'gino' }],
  gino_talk: [{ who: 'gino', say: 'You got a mouth on you, Nunz. Okay, one-eighty.' }, { event: 'collected', who: 'gino', amount: 180, flag: 'gino' }],
  gino_shake: [{ who: 'gino', say: 'Please! My cousin\'s at the register!' }, { event: 'shakedown', who: 'gino', amount: 230, flag: 'gino' }],
  pinky: ssShopNode('pinky', 150),
  pinky_paid: [{ who: 'pinky', say: 'Strike three, Nunz. Next Sunday, bowling on me.' }, { event: 'collected', who: 'pinky', amount: 150, flag: 'pinky' }],
  pinky_talk: [{ who: 'pinky', say: 'You\'re a poet. Fine, one-fifty, and you bowl a frame with me.' }, { event: 'collected', who: 'pinky', amount: 150, flag: 'pinky' }],
  pinky_shake: [{ who: 'pinky', say: 'The pins! Don\'t touch the pins!' }, { event: 'shakedown', who: 'pinky', amount: 190, flag: 'pinky' }],

  doc: [
    { who: 'doc', say: ['Four Sundays you haven\'t been in that chair, and now you come in with a bruise.'] },
    { who: 'doc', say: 'What do you want to talk about, Nunzio?', choices: [
      { text: 'My mother. Is that a trick question?', set: 'talkedMother', add: { calm: 1 }, goto: 'doc_mother' },
      { text: 'The ducks. I keep thinking about the ducks.', add: { calm: 1 }, goto: 'doc_ducks' },
      { text: 'Nothing. I came for the chair.', add: { calm: -1 }, goto: 'doc_bye' }
    ] }
  ],
  doc_mother: [{ who: 'doc', say: 'Good. Now tell me what she said the last time you were in this room.' }, { who: 'doc', say: 'Hm. Next week, breathe before you hit anybody.' }, { event: 'session', who: 'doc' }],
  doc_ducks: [{ who: 'doc', say: 'Ducks are a metaphor, Nunzio. Everything is a metaphor, until somebody gets shot.' }, { event: 'session', who: 'doc' }],
  doc_bye: [{ who: 'doc', say: 'You can leave. The chair will still be here, and so will the bill.' }, { event: 'session', who: 'doc' }],

  ricca: [
    { who: 'ricca', say: 'Nunzio, sit. The gravy has been going since nine in the morning.' },
    { who: 'ricca', say: 'So tell me what you did this week that I should be ashamed of.', choices: [
      { text: 'The truth. Lenny paid. The garage is quiet.', add: { respect: 2, calm: 1 }, goto: 'ricca_truth' },
      { text: 'Nothing, Ma. Eat your meatball.', add: { calm: -1 }, goto: 'ricca_lie' }
    ] }
  ],
  ricca_truth: [{ who: 'ricca', say: 'Good. Then eat, and tomorrow you call your sister.' }, { event: 'dinner', who: 'ricca' }],
  ricca_lie: [{ who: 'ricca', say: 'I know you\'re lying, but the meatballs are good, so I forgive you.' }, { event: 'dinner', who: 'ricca' }],

  frankie: [
    { who: 'frankie', say: 'Nunzio! Come to my pool? Bring a towel, I\'m too old for the hose.' },
    { who: 'frankie', say: 'I hear you been collecting on my side of the street. My side.', choices: [
      { text: 'Then come out of the pool and take it back.', goto: 'frankie_fight' },
      { text: 'Sunday is for family, Frankie. Walk away.', goto: 'frankie_fight' }
    ] }
  ],
  frankie_fight: [{ who: 'frankie', say: 'Wrong answer. Everybody says that and they all end up in the pool.' }, { event: 'bossfight', who: 'frankie' }]
};

// the quests shown in the journal, in the order the chapters give them
const SS_QUESTS = [
  { id: 'shops', title: 'Sunday collections', text: 'Collect the envelopes from Lenny, Gino and Pinky.' },
  { id: 'garage', title: 'Frankie\'s crew', text: 'Clear the crew at the garage on Vine Street.' },
  { id: 'doc', title: 'Session', text: 'Go see Dr. Marchetti. Breathe.' },
  { id: 'dinner', title: 'Sunday dinner', text: 'Go home. Mama Ricca has made the gravy.' },
  { id: 'pool', title: 'The pool', text: 'Settle with Frankie Bonacci at the house with the pool.' }
];
