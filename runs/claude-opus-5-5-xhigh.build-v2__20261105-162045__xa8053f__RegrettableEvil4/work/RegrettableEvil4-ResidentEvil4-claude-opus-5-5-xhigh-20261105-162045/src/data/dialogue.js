// All spoken script. HUD font: no em dashes, no straight double quotes, no accents.
export const S = {
  arrival: [
    ['nils', "This is as far as I go. Tide's wrong. Everything's wrong."],
    ['max', 'Ostrander Mutual thanks you for your cooperation.'],
    ['nils', 'Insurance? You came out here for insurance?'],
    ['max', 'Someone has to read the small print.'],
  ],
  arrivalPym: [
    ['pym', 'Ms. Ransom, Claims Desk. Policy 7741, Dame Ottoline Vane. Kidnap and ransom, premium tier. Nine days, no demand. Locate the insured. Assess. Report.'],
    ['max', 'And if the locals object?'],
    ['pym', 'Form 11-B. Incidental Violence. In triplicate.'],
  ],
  arrivalThole: [
    ['commodore', 'ATTENTION, MOURNE QUAY. THIS IS YOUR COMMODORE. A SMALL WOMAN IN A LARGE COAT HAS COME ASHORE. KINDLY REMOVE HER.'],
    ['max', "Everyone's a critic."],
  ],
  mender: [
    ['max', "Evening. I'm looking for an old woman. Rich. Rude. Answers to Dame."],
    ['mender', "The tide takes what it's owed."],
    ['max', 'Is that a no?'],
  ],
  menderB: [['max', "I'll put you down as a no."]],
  boatBurn: [['max', "That'll be the excess."]],
  fathom: [
    ['fathom', 'Blub! Ahoy! A paying customer! Dry goods, wet goods, goods of no fixed description!'],
    ['max', "You're wearing a diving helmet."],
    ['fathom', "And you're wearing a target, friend. Browse!"],
  ],
  siege: [
    ['commodore', "ALL HANDS TO THE SQUARE. BRING SOMETHING SHARP. BRING A FRIEND. BRING YOUR FRIEND'S SOMETHING SHARP."],
    ['max', 'Noted.'],
  ],
  foghornA: [['commodore', 'AH. THE TIDE WILL HAVE ITS SUPPER FIRST. DO STAY DRY, MISS RANSOM.']],
  foghornB: [
    ['pym', "Ms. Ransom, are we looking at a mass claim? There's a separate form."],
    ['max', 'Fifty claimants, and not one forwarding address.'],
  ],
  coldRoom: [
    ['dame', 'You are nine days late and you are dripping.'],
    ['max', 'Max Ransom. Ostrander Mutual.'],
    ['dame', 'Ransom. Is that a joke?'],
    ['max', "It's a surname. I've heard them all."],
    ['dame', 'I pay your employers eleven thousand a year. I expected a regiment.'],
    ['max', "I'm the regiment. Can you walk?"],
    ['dame', 'I have walked out on better than you, young woman. Lead on. Mind the coat.'],
  ],
  afterBosun: [
    ['dame', 'My great-grandfather signed the first Tithe. Every Vane ship that came home safe, the island kept a crew from it. That is your premium, Miss Ransom. That is what you insure.'],
    ['max', "That would've been useful on the application."],
    ['dame', 'Nobody reads the application.'],
  ],
  causeway: [
    ['commodore', 'TIDE TABLES ARE PRINTED IN THE FOYER, MISS RANSOM. YOU HAVE FOUR MINUTES.'],
    ['max', 'He printed tide tables.'],
    ['dame', 'He prints everything. He is a dreadful little man.'],
  ],
  crypt: [
    ['dame', 'Very well. I shall do it myself. As usual.'],
    ['pym', 'Dame Ottoline, this is the Claims Desk. Please hold.'],
    ['dame', 'I will not.'],
  ],
  finalA: [
    ['commodore', 'BEHOLD! THE BATHYSPHERE OF SAINT ORRIN! FORTY TONS OF DIVINE PLUMBING!'],
    ['max', 'Are you covered for that?'],
  ],
  finalB: [
    ['commodore', 'THIS IS AN OUTRAGE. I AM ON THE AIR.'],
    ['max', 'Not for long.'],
  ],
  finalC: [['max', 'Claim denied.']],
  ending: [
    ['dame', 'Your fee. Less deductions.'],
    ['max', 'This is for three pounds seventy-five.'],
    ['dame', 'You dripped.'],
    ['pym', 'Ms. Ransom, one thing for the file. The island appears in our books. As a client.'],
    ['max', 'Since when?'],
    ['pym', 'Since eighteen forty. Please hold.'],
  ],
};

export const ALL_TANNOY_LINES = [
  'A REMINDER: THE FISH MARKET IS CLOSED. THE FISH HAVE WON.',
  'MISS RANSOM, I HAVE READ YOUR POLICY. I FIND IT RESTRICTIVE.',
  'WHO IS SHOOTING MY LOUDSPEAKERS? THOSE ARE IMPORTED.',
  'I AM TOLD YOU WEAR SUNGLASSES AT NIGHT. HOW BRAVE. HOW STUPID.',
  'OUR HYMN TODAY IS NUMBER NINE. OUR SURVIVORS TODAY ARE NUMBER NONE.',
  'THE BOSUN WOULD LIKE A WORD. HE ONLY HAS THE ONE.',
  'DAME OTTOLINE, YOUR GREAT-GRANDFATHER SIGNED IN BLOOD. I HAVE BROUGHT A PEN. IT IS ALSO BLOOD.',
  'DO STAY DRY, MISS RANSOM. THE WET ONES GET SO ATTACHED.',
  'THIS ISLAND HAS STOOD FOR A THOUSAND YEARS. YOUR COAT WILL NOT.',
  'LOST PROPERTY MAY BE COLLECTED FROM THE SEA.',
  'THE ABBEY GIFT SHOP IS NOW OPEN. THE ABBEY GIFT IS DEATH.',
  'MISS RANSOM, WHAT IS YOUR DEDUCTIBLE? I SHOULD LIKE TO EXCEED IT.',
  'A MESSAGE FROM THE CANNERY: WE ARE HIRING. WE ARE ALSO FIRING. MOSTLY FIRING.',
  'IF YOU CAN HEAR THIS, YOU ARE TOO CLOSE TO MY VOICE.',
  'THAT WAS THE LAST ONE. I HOPE YOU ARE HAPPY.',
];

export const DAME_BARKS = {
  follow: ['LEAD ON.'], wait: ['I SHALL WAIT. I CHARGE FOR IT.'], hide: ['IN A BARREL. AT MY AGE.'],
  hurt: ['I FELT THAT IN MY PORTFOLIO.', 'DEDUCTED.'], grabbed: ['UNHAND ME, YOU SARDINE!'], nearShot: ['MIND THE COAT.'],
  kick: ['VULGAR. DO IT AGAIN.'], idle: ['I HAVE SACKED MEN FOR LESS.', 'DO YOU ALWAYS LURK?'],
};

export const PYM_HINTS = {
  quay: 'MS. RANSOM. IF YOU ARE SURROUNDED, THAT IS A SECTION 4 EVENT. KICK SOMETHING.',
  quayTannoy: 'OUR RECORDS SHOW LOUDSPEAKERS ARE NOT LOAD-BEARING. SHOOT THEM.',
  road: 'THE BRIDGE IS NARROW. A NARROW BRIDGE IS A LIABILITY, FOR WHOEVER IS ON IT. KICK THEM OFF.',
  cannery: 'THE INSURED IS A PROTECTED ASSET. PLEASE STOP LEAVING HER IN BARRELS.',
  yard: 'THE CRANE IS NOT YOURS, MS. RANSOM. HOWEVER, THE INSURED APPEARS TO HAVE STARTED IT. COMMAND HER WHEN THE TARGET IS UNDER THE LOAD.',
  causeway: 'TIDE IS NOT AN ACT OF GOD IF IT WAS PRINTED IN ADVANCE.',
  abbey: 'THE MOSAIC IS A SCHEDULE OF COVERAGE, MS. RANSOM. EVERY LAMP HAS A STATED DIRECTION.',
  nave: 'SHOOT THE VALVES. PLUMBING IS EXCLUDED UNDER SECTION 9.',
  launch: 'THE ISLAND IS NOW A TOTAL LOSS. WE ARE DELIGHTED FOR YOU.',
};

export const CHAPTER_CARDS = {
  1: 'CLAIM 1: ACT OF GOD',
  2: 'CLAIM 2: WEAR AND TEAR',
  3: 'CLAIM 3: ACT OF COMMODORE',
  4: 'FINAL SETTLEMENT',
};
