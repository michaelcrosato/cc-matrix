/* The cast (§8.3, §11.3), tutorials, objectives, Murmel's hints and Oma Holle's lines (§11.9). */
S7.person('holle', { name: 'Oma Holle', short: 'HOLLE', voice: 'holle',
  rig: { build: 'chibi', size: 1.0, outfit: 'robe', hair: 'long', weapon: null, sleeves: 'long', colors: { skin: '#e8d8c8', hair: '#f4f4f4', cloth: '#e8e4f0', pants: '#e8e4f0', boot: '#d8d4e0' } } });
S7.person('rosalind', { name: 'Sister Rosalind', short: 'ROSALIND', voice: 'rosalind',
  rig: { build: 'heroic', size: 1.25, outfit: 'robe', hair: 'short', hood: true, weapon: null, sleeves: 'long', acc: ['shades'], colors: { skin: '#ead8c8', hair: '#f4f4f4', cloth: '#18181c', pants: '#18181c', boot: '#101012', trim: '#f4f4f4', shades: '#2a2a3a' } } });
S7.person('concierge', { name: 'The Concierge', short: 'CONCIERGE', voice: 'concierge', icon: 'phone',
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', weapon: null, sleeves: 'long', acc: ['badge'], colors: { skin: '#d8ccc4', hair: '#c0c0c8', cloth: '#101014', coat: '#101014', pants: '#101014', boot: '#0a0a0c', trim: '#2a2a30', eye: '#d0d0d8' } } });
S7.person('fohn', { name: 'Mister Föhn', short: 'FÖHN', voice: 'fohn',
  rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', weapon: null, sleeves: 'long', acc: ['shades'], colors: { skin: '#b8805a', hair: '#141414', cloth: '#f4efe4', coat: '#f4efe4', pants: '#f4efe4', boot: '#d8c8a8', trim: '#e0d8c4' } } });
S7.person('pim', { name: 'Pim the Lift Boy', short: 'PIM', voice: 'pim', fade: .6,
  rig: { build: 'chibi', size: 1.0, outfit: 'shirt', hair: 'short', hat: { style: 'cap', color: '#2e5a3a' }, weapon: null, colors: { skin: '#dce8ec', hair: '#6a5a4a', cloth: '#2e5a3a', pants: '#2e4a3a', boot: '#2a2a2a' } } });
S7.person('murmel', { name: 'Murmel', short: 'MURMEL', voice: 'murmel', icon: 'murmel', blob: true });
S7.person('grau', { name: 'Augustin Grau', short: 'GRAU', voice: 'grau',
  rig: { build: 'heroic', size: 1.4, outfit: 'coat', hair: 'bald', hat: { style: 'pillbox', color: '#a01818', band: '#e0b040' }, weapon: null, sleeves: 'long', face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#a8a8a8', cloth: '#a01818', coat: '#a01818', pants: '#801010', boot: '#1a1a1a', trim: '#e0b040', glove: '#f4f4f4' } } });
S7.person('hansi', { name: 'Hansi Pulver', short: 'HANSI', voice: 'hansi',
  rig: { build: 'heroic', size: 1.4, outfit: 'shirt', hair: 'spiky', hat: { style: 'racehelmet', color: '#e0b040', visor: '#a0c0d0' }, weapon: 'poles', sleeves: 'long', skis: { color: '#e0b040' }, colors: { skin: '#c89060', hair: '#f0d860', cloth: '#e0b040', pants: '#e0b040', boot: '#1a1a1a', glove: '#1a1a1a', metal: '#f0d870', trim: '#ffffff' } } });
S7.person('hansiBare', { name: 'Hansi Pulver', short: 'HANSI', voice: 'hansi',
  rig: { build: 'heroic', size: 1.4, outfit: 'shirt', hair: 'spiky', weapon: null, sleeves: 'long', colors: { skin: '#c89060', hair: '#f0d860', cloth: '#e0b040', pants: '#e0b040', boot: '#1a1a1a', glove: '#1a1a1a', trim: '#ffffff' } } });
S7.person('tuba', { name: 'The Tuba', short: 'TUBA', voice: 'band', rig: { build: 'bulky', size: 1.35, outfit: 'shirt', hair: 'bald', hat: { style: 'felt', color: '#2e4a2a', feather: '#ffffff' }, weapon: null, face: { eyes: 'slit' }, acc: ['grin', 'braces'], colors: { skin: '#f6f6f4', cloth: '#f4f4f0', pants: '#5a3a1e', boot: '#3a2a1a', trim: '#2e5a2e' } } });
S7.person('accordion', { name: 'The Accordion', short: 'ACCORDION', voice: 'band', rig: { build: 'heroic', size: 1.3, outfit: 'robe', hair: 'ponytail', weapon: null, face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#f6f6f4', hair: '#f0f0f0', cloth: '#c81e2a', pants: '#c81e2a', boot: '#3a2a1a', trim: '#ffffff' } } });
S7.person('trumpet', { name: 'The Trumpet', short: 'TRUMPET', voice: 'band', rig: { build: 'heroic', size: 1.3, outfit: 'shirt', hair: 'bald', hat: { style: 'felt', color: '#4a4a4a', feather: '#e0e0e0' }, weapon: null, face: { eyes: 'slit' }, acc: ['grin', 'braces'], colors: { skin: '#f6f6f4', cloth: '#f4f4f0', pants: '#4a3a2a', boot: '#2a1a12', trim: '#3a5a8a' } } });
S7.person('snare', { name: 'The Snare', short: 'SNARE', voice: 'band', rig: { build: 'heroic', size: 1.3, outfit: 'robe', hair: 'long', weapon: null, face: { eyes: 'slit' }, acc: ['grin'], colors: { skin: '#f6f6f4', hair: '#f4f4f4', cloth: '#2a5ac8', pants: '#2a5ac8', boot: '#2a1a12', trim: '#ffffff' } } });
S7.person('villager', { name: 'A villager', short: 'VILLAGER', voice: 'whiteout', rig: { build: 'heroic', size: 1.25, outfit: 'coat', hair: 'short', hat: { style: 'beanie', color: '#5a3a6a', pom: '#f0f0f0' }, weapon: null, colors: { skin: '#e8f4ff', hair: '#c8d8e8', cloth: '#6a8ab0', coat: '#6a8ab0', pants: '#3a4a5a' } } });
S7.person('delegate', { name: 'A delegate', short: 'DELEGATE', voice: 'whiteout', rig: { build: 'heroic', size: 1.3, outfit: 'coat', hair: 'short', weapon: null, acc: ['badge'], colors: { skin: '#e0eef8', hair: '#a0b0c0', cloth: '#2a3448', coat: '#2a3448', pants: '#1a2030' } } });
S7.person('tableau', { name: 'Frozen', short: 'FROZEN', voice: 'whiteout' });
S7.person('sign', { name: 'A sign', short: '', voice: null, icon: 'sign' });
S7.person('exposure', { name: 'Exposure', short: 'EXPOSURE', voice: null, icon: 'paper' });
S7.person('intercom', { name: 'Intercom', short: 'INTERCOM', voice: 'rosalind', icon: 'phone' });
for (const id of ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid']) S7.PEOPLE[id] = S7.PEOPLE[id] || null;

/* ---- tutorials: one-shot tips, big glyphs, cleared by doing the thing ---- */
S7.TUTORIALS = {
  walk: { parts: [['move', 'HOLD TO WALK']], text: 'Let go and you stand still. Standing is honest.' },
  junction: { parts: [['left', 'PICK A WAY'], ['move', 'GO']] },
  quickturn: { parts: [['turn', 'QUICK TURN']] },
  aim: { parts: [['aim', 'HOLD TO AIM']], text: 'You stop. You look. You listen.' },
  scan: { parts: [['scan', 'SCAN']], text: 'Laughter you can\'t see. Scan to show it.' },
  fire: { parts: [['fire', 'SHOOT THE WARM SPOT']], text: 'The orange glow. One shot thaws them.' },
  heal: { parts: [['heal', 'HOLD TO DRINK RED']], text: 'Red heals. Red also pays.' },
  ring: { parts: [['ring', 'HOLD: THE FEATHERBED']], text: 'Seven coats. Pick one. Let go.' },
  skill: { parts: [['skill', 'SKILL']], text: 'Each of the Seven has one. Most cost Red.' },
  longlook: { parts: [['aim', 'AIM'], ['skill', 'LONG LOOK']], text: 'Ignaz\'s scope reaches what nobody else can.' },
  jump: { parts: [['skill', 'TUCK'], ['move', 'GO']], text: 'Only Dagny jumps. Tucked, or fast.' },
  rescue: { parts: [['interact', 'HOLD AT THE STATUE']], text: 'The Sweep chips the frozen free.' },
  wax: { parts: [['interact', 'THE WAX BENCH']], text: 'Rime buys skill. Wax them well.' },
  ski: { parts: [['move', 'TUCK'], ['turn', 'HOCKEY STOP']], text: 'Stopped on the slope, you can aim.' },
  lift: { parts: [['aim', 'AIM FROM THE LIFT']], text: 'The lift keeps moving. So do they.' }
};

/* ---- objectives: the first that matches is the current one (the map, Rosalind, Murmel's hints) ---- */
S7.OBJECTIVES = [
  { key: 'end', when: s => s.st.flags.t01Done, text: 'Sleep. The snow will continue.', rosalind: 'Sleep. I\'ll keep shaking.' },
  { key: 'hansi', when: s => s.st.target >= 1 && s.st.flags.archiveDone, text: 'The summit. Hansi Pulver skis at midnight.', rosalind: 'Up the freight elevator. He is waiting with his medals.' },
  { key: 'crystals', when: s => s.st.target >= 1 && s.st.flags.gondolaDone && !s.st.flags.crystalsDone, text: 'The Glacier Archive. The ice hums in the corridor.', rosalind: 'The vault. Read nothing. Read everything.' },
  { key: 'archive', when: s => s.st.target >= 1 && s.st.flags.gondolaDone, text: 'The Glacier Archive. Read the ledger. Reach the freight elevator.', rosalind: 'The vault. Read nothing. Read everything.' },
  { key: 'gate', when: s => s.st.target >= 1 && (s.st.items.edelweiss || 0) >= 3, text: 'Take three Edelweiss to the Delegate Gate. Ride the Himmelsbahn.', rosalind: 'Three flowers. The gondola is for delegates. Be one.' },
  { key: 'cornice', when: s => s.st.target >= 1 && s.st.flags.ropeCrossed && !s.st.flags.corniceDown, text: 'The ridge wears a snow hat. Knock it off.', rosalind: 'Brigid knows what to do with a ridge.' },
  { key: 'patrol', when: s => s.st.target >= 1 && s.st.area === '01C' && !s.st.flags.shelterDone, text: 'The avalanche shelter, past the patrol rope.', rosalind: 'The Sweep crosses ropes. Wake him.' },
  { key: 'mirrors', when: s => s.st.target >= 1 && s.st.area === '01B' && !s.st.flags.mirrorsOpen, text: 'The Palais. The Hall of Mirrors hides a passage.', rosalind: 'Mirrors lie. Sing to them.' },
  { key: 'press', when: s => s.st.target >= 1 && s.st.area === '01B' && !s.st.flags.exposure1, text: 'The Palais. A dark press room. A safe that wants a date.', rosalind: 'Somebody with a flash could develop a secret.' },
  { key: 'bell01A', when: s => s.st.target >= 1 && !s.st.flags.churchBell, text: 'Three Edelweiss for the gondola. The T-bar is buried; ring the church bell.', rosalind: 'Three flowers for a gondola. Go and pick them.' },
  { key: 'flowers', when: s => s.st.target >= 1, text: 'Three Edelweiss: the Palais, the band, the mountain.', rosalind: 'Three flowers for a gondola. Go and pick them.' },
  { key: 'grau', when: s => s.st.flags.bellRung, text: 'The service shaft. Augustin Grau.', rosalind: 'The Bellcaptain is in the shaft. Ring for service. You did.' },
  { key: 'gap', when: s => s.st.area === '00B' && !s.st.flags.jumped, text: 'The third floor. The floor ahead has fallen in.', rosalind: 'A hole is a ski jump for someone in a hurry.' },
  { key: 'bell', when: s => s.st.area === '00B' || s.st.flags.jumped, text: 'Ring for service at the end of the hall. The shaft doors open for the bell.', rosalind: 'The Bellcaptain\'s luggage is heavy. Ring for service.' },
  { key: 'key', when: s => s.st.flags.ropePaid && !s.st.items.servicekey, text: 'Find the Service Key behind the bar.', rosalind: 'The staff keep their keys where the drinks are.' },
  { key: 'rope', when: s => s.st.flags.firstClear, text: 'The stairwell is locked. Get behind the bar.', rosalind: 'The bar is for members. Rurik is a member of everything.' },
  { key: 'start', when: () => true, text: 'Third floor and below. Bellcaptain Grau.', rosalind: 'Third floor and below. Don\'t keep him waiting.' }
];
S7.HINTS = {
  start: 'Hold the button... and you walk... Let go... and you are only standing... Standing is honest...',
  rope: 'The bar... is for members... Membership is a matter of means... Who in the family has means...?',
  key: 'Behind the bar... where the bottles sleep... a key on a red tassel...',
  gap: 'A hole in the floor... is a ski jump... for someone in a hurry...',
  bell: 'Ring for service... at the end of the hall... Only an old man\'s eyes... reach that far...',
  grau: 'The Bellcaptain... tips his hat... to everyone... Look under it...',
  bell01A: 'The church bell... shakes the snow off the lift station... Someone with a long gun... and long patience...',
  flowers: 'The gondola is for delegates... Three Edelweiss... One in the Palais... one in a tuba... one on the mountain...',
  gate: 'The gondola is for delegates... Three Edelweiss... You have them... Go...',
  mirrors: 'Mirrors lie... Echoes don\'t... Sing to the wall...',
  press: 'The press room is dark... Someone with a flash... could develop a secret...',
  patrol: 'The ridge is closed... Patrol only... The Sweep lives in Room 7... Wake him...',
  cornice: 'The ridge wears a snow hat... Knock it off... and you have a bridge... Brigid knows how...',
  crystals: 'Ice hums... when it wants a note... Ice weeps... when it meets an ember...',
  archive: 'Ice hums... when it wants a note... Ice weeps... when it meets an ember...',
  hansi: 'He is fast... He is gold... Gold melts... like everything...',
  end: 'Gratuity... was customary... Sleep...',
  fallback: 'Have you tried... being somebody else...?'
};
S7.HOLLE_LINES = [
  [0, 'Shake the bed...'], [0, 'Is it spring yet? Don\'t tell me.'], [0, 'The wind is warm today. Close the window.'], [0, 'Seven coats. Seven hooks. One girl.'],
  [1, 'Eight on the lift... no, seven... no...'], [2, 'Hansi always fell to the left.'], [2, 'I taught Hansi to fall. Not to land.']
];
