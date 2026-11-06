/* Cases, people, and the script. Numbers are Resident defaults. The sim reads this; it does not know the plot. */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});
  const EXPR = ['neutral', 'smile', 'angry', 'sad', 'shock', 'shout', 'tired', 'cry', 'smirk'];

  const CAST = {
    vale: { name: 'Dr. Vale', role: 'Resident', pronouns: 'she', expr: EXPR },
    quill: { name: 'Quill', role: 'Scrub nurse', pronouns: 'he', expr: EXPR },
    oyelaran: { name: 'Dr. Oyelaran', role: 'Chief of Surgery', pronouns: 'she', expr: EXPR },
    sokolova: { name: 'Dr. Sokolova', role: 'Ship surgeon', pronouns: 'she', expr: EXPR },
    percy: { name: 'Dr. Whitlock', role: 'Fellow', pronouns: 'he', expr: EXPR },
    odalys: { name: 'Odalys Ferreira', role: 'Radiology', pronouns: 'she', expr: EXPR },
    hale: { name: 'Dr. Hale', role: 'Anodyne', pronouns: 'he', expr: EXPR },
    clementine: { name: 'Clementine Hale', role: 'Patient zero', pronouns: 'she', expr: EXPR },
  };

  const BARKS = [
    'Pulse forty. I mention it only in passing.',
    'Breathe, Doctor. One of you should.',
    'That was the liver, Doctor. We keep that one.',
    'I have seen worse. He was a plumber.',
    'Forceps.', 'Scalpel.', 'Suture.', 'Salve.', 'Syringe.', 'Cautery.', 'Suction.', 'Sonar.',
    'Hold it there.', 'A little slower.', 'That will do.', 'Again, if you please.',
    'The dish is ready.', 'Needle back.', 'Thread tight.', 'Field is wet.',
    'Suction, when you have a moment.', 'There is singing. I do not care for it.',
    'Vitals falling. You can see that.', 'Clock, Doctor.', 'Steady, when you are ready.',
    'I shall not say the word in the lift.', 'Left hand. No, your other left.',
    'The patient is a person. I checked.', 'Mask up. Both of you.',
    'That stitch was almost proud of itself.', '...Hm.', 'Clear the line.',
    'Do not chase it. Let it come.', 'On the beat, not through it.',
    'I dropped a tray once. We are even.', 'Count with me. One. Still one.',
    'The window is open. Cut.', 'I have the retractor. Pretend I do not.',
    'She can hear the monitor. Speak kindly.', 'No heroics. Heroics stain.',
    'Label that. The grandchildren will ask.', 'Cork. Of course it is a cork.',
    'Rain on the glass. Ignore the rain.', 'Time of death is not a joke I make.',
    'You have done this. Your hands remember.', 'Next case is through that door.',
    'Morale. I am putting it in the notes.', 'They have stopped shaking. No. Good.',
  ];

  function shard(x, y, axis, depth, order) {
    return { type: 'shard', x, y, axis: axis || [1, 0], depth: depth || 16, order: order || 1, drain: 0.1, tag: 'glass' };
  }

  const CASES = {
    c1: {
      id: 'c1', name: 'Glasshouse', patient: 'Agnes Pellow', chapter: 1, doctor: 'vale', site: 'forearm',
      clock: 180, vitals: 80, drain: 0.05, par: 1400, brief: 'Glass in a greenhouse roof. She wants the pieces saved.',
      phases: [
        { name: 'Pull the glass', tutorial: true, objects: [shard(180, 110, [1, 0], 14, 1), shard(210, 124, [0.2, 1], 14, 1), shard(240, 108, [-1, 0.2], 14, 1), shard(200, 140, [0.4, 1], 14, 1)] },
        { name: 'Clean the cuts', objects: [
          { type: 'laceration', x: 180, y: 116, r: 8, order: 1 },
          { type: 'laceration', x: 214, y: 128, r: 8, order: 1 },
          { type: 'laceration', x: 246, y: 112, r: 8, order: 1 },
        ] },
        { name: 'Close', objects: [{ type: 'wound', x: 213, y: 120, stitches: 4, order: 1 }] },
        { name: 'Give her a boost', flags: { needIv: 1, iv: 0 }, at: [{ t: 0.3, do: 'dip' }] },
      ],
    },
    c2: {
      id: 'c2', name: 'Low Brass', patient: 'Desmond Achebe', chapter: 1, doctor: 'vale', site: 'abdomen',
      clock: 240, vitals: 78, drain: 0.06, par: 2200, lightbox: true,
      brief: 'Percy wrote hernia. The film disagrees.',
      phases: [
        { name: 'Open', objects: [{ type: 'cut', x: 213, y: 116, len: 60, order: 1, guide: [[183, 116], [243, 116]] }] },
        { name: 'Clear the field', objects: [
          { type: 'pool', x: 180, y: 120, vol: 30, max: 30, order: 2, tag: 'p1' },
          { type: 'pool', x: 240, y: 130, vol: 24, max: 24, order: 2, tag: 'p2' },
          { type: 'bleeder', x: 210, y: 112, order: 1 },
        ] },
        { name: 'Burn the polyps', objects: [0, 1, 2, 3, 4].map(i => ({ type: 'polyp', x: 170 + i * 18, y: 108 + (i % 2) * 16, order: 1 })) },
        { name: 'Take the mass', objects: [{ type: 'mass', x: 213, y: 118, order: 1, rad: 14 }] },
        { name: 'The cork', objects: [shard(213, 118, [0, -1], 18, 1)] },
        { name: 'Close', objects: [
          { type: 'wound', x: 213, y: 124, stitches: 6, order: 1 },
          { type: 'laceration', x: 190, y: 140, r: 8, order: 2 },
        ] },
      ],
    },
    c3: {
      id: 'c3', name: 'Crane Nine', patient: 'Big Tam Rennie', chapter: 1, doctor: 'vale', site: 'abdomen',
      clock: 220, vitals: 72, drain: 0.08, par: 2600, brief: 'The harbor crane came down. The Chief is away.',
      phases: [
        { name: 'Stop the bleeding', objects: [
          { type: 'arteryTear', x: 170, y: 110, order: 1, stitches: 3 },
          { type: 'arteryTear', x: 210, y: 124, order: 1, stitches: 3 },
          { type: 'arteryTear', x: 250, y: 112, order: 1, stitches: 3 },
          { type: 'bleeder', x: 190, y: 140, order: 2 },
          { type: 'pool', x: 200, y: 150, vol: 20, max: 28, order: 3, tag: 'spill' },
        ] },
        { name: 'Shrapnel', objects: [
          { type: 'pool', x: 168, y: 128, vol: 22, max: 22, order: 1, tag: 'under1' },
          { type: 'pool', x: 250, y: 120, vol: 18, max: 18, order: 1, tag: 'under2' },
          shard(160, 108, [1, 0], 14, 2), shard(190, 116, [0, 1], 14, 2), shard(220, 104, [-1, 0], 14, 2),
          { type: 'fragment', x: 168, y: 128, axis: [1, 0.2], depth: 14, order: 2, underTag: 'under1', tag: 'frag' },
          { type: 'fragment', x: 250, y: 120, axis: [0, -1], depth: 14, order: 2, underTag: 'under2', tag: 'frag' },
        ] },
        { name: 'He is crashing', at: [{ t: 0.6, do: 'code' }, { t: 0.8, do: 'breath' }], objects: [0, 1, 2, 3, 4, 5].map(i => {
          const a = -Math.PI / 2 + i * Math.PI / 3;
          return { type: 'rupture', x: 213 + Math.cos(a) * 36, y: 116 + Math.sin(a) * 24, order: 1, need: 0.35 };
        }) },
        { name: 'Close', objects: [{ type: 'wound', x: 213, y: 120, stitches: 4, order: 1 }] },
      ],
    },
    c4: {
      id: 'c4', name: 'The Whistling Man', patient: 'Ned Harrow', chapter: 2, doctor: 'vale', site: 'flank',
      clock: 230, vitals: 76, drain: 0.07, par: 2400, lightbox: true, brief: 'A gaff in his side, and he is whistling.',
      phases: [
        { name: 'Free the gaff', objects: [
          { type: 'cut', x: 180, y: 120, order: 1, guide: [[168, 112], [192, 128]], tag: 'relief' },
          { type: 'cut', x: 230, y: 112, order: 1, guide: [[218, 104], [244, 120]], tag: 'relief' },
          { type: 'gaff', x: 200, y: 124, axis: [1, 0], depth: 28, order: 2, barbs: false, tension: 100, drain: 0.2 },
        ] },
        { name: 'Staccato', strain: 'staccato', strainOpts: { nests: 2, beads: 4, landIn: 2.2 } },
        { name: 'Repair', objects: [
          { type: 'laceration', x: 170, y: 130, r: 8, order: 1 },
          { type: 'laceration', x: 200, y: 142, r: 8, order: 1 },
          { type: 'wound', x: 220, y: 118, stitches: 4, order: 2 },
        ] },
      ],
    },
    c5: {
      id: 'c5', name: 'Slur', patient: 'Ilse Brandt', chapter: 2, doctor: 'vale', site: 'forearm',
      clock: 260, vitals: 76, drain: 0.06, par: 2800, brief: 'A violinist who cannot feel the string, and likes it.',
      phases: [
        { name: 'Legato', strain: 'legato', strainOpts: { segments: 8, x: 150, y: 120 }, objects: [
          { type: 'nerve', x: 150, y: 150, guide: [[120, 156], [280, 150]], order: 0, drain: 0 },
        ] },
        { name: 'Repair', objects: [
          { type: 'laceration', x: 180, y: 130, r: 8, order: 1 },
          { type: 'wound', x: 210, y: 124, stitches: 5, order: 2 },
        ] },
      ],
    },
    c6: {
      id: 'c6', name: 'Bedside Manner', patient: 'Marguerite Oyelaran', chapter: 2, doctor: 'vale', site: 'heart',
      clock: 280, vitals: 70, drain: 0.07, par: 3000, brief: 'The Chief drops her cane at her own gala.',
      phases: [
        { name: 'Open', objects: [
          { type: 'cut', x: 213, y: 116, order: 1, guide: [[173, 116], [253, 116]] },
          { type: 'pool', x: 213, y: 140, vol: 28, max: 36, order: 2 },
        ] },
        { name: 'Tremolo', strain: 'tremolo' },
        { name: 'Mend', objects: [
          { type: 'wound', x: 213, y: 120, stitches: 4, order: 1 },
          { type: 'patch', x: 190, y: 140, r: 8, order: 2 },
        ] },
      ],
    },
    c7: {
      id: 'c7', name: 'Force Nine', patient: 'Yusuf Demir', chapter: 3, doctor: 'sokolova', site: 'ship',
      clock: 210, vitals: 70, drain: 0.07, par: 2400, brief: 'A winch, a storm, and a second look.',
      phases: [
        { name: 'Winch damage', tilt: 1, at: [{ t: 8, do: 'lurch' }, { t: 8.2, do: 'look' }], objects: [
          shard(160, 110, [1, 0], 14, 1), shard(190, 124, [0, -1], 14, 1), shard(230, 108, [-0.4, 1], 14, 1), shard(250, 130, [1, 0.3], 14, 1),
          { type: 'arteryTear', x: 180, y: 140, stitches: 3, order: 2 },
          { type: 'arteryTear', x: 240, y: 136, stitches: 3, order: 2 },
        ] },
        { name: 'Blackout', dim: 0.85, objects: [
          { type: 'bleeder', x: 170, y: 120, hidden: true, order: 1 },
          { type: 'bleeder', x: 213, y: 108, hidden: true, order: 1 },
          { type: 'bleeder', x: 250, y: 132, hidden: true, order: 1 },
        ] },
        { name: 'Close on the roll', tilt: 1, objects: [{ type: 'wound', x: 213, y: 122, stitches: 6, order: 1 }] },
      ],
    },
    c8: {
      id: 'c8', name: 'From the Top', patient: 'Sister Perpetua', chapter: 3, doctor: 'sokolova', site: 'abdomen',
      clock: 280, vitals: 74, drain: 0.06, par: 3200, brief: 'What you cut grows back, humming.',
      phases: [
        { name: 'Open', objects: [
          { type: 'cut', x: 213, y: 116, order: 1, guide: [[188, 116], [238, 116]] },
          { type: 'pool', x: 200, y: 146, vol: 20, max: 24, order: 2 },
        ] },
        { name: 'Da Capo', strain: 'dacapo' },
        { name: 'Close', objects: [{ type: 'wound', x: 213, y: 124, stitches: 4, order: 1 }] },
      ],
    },
    c9: {
      id: 'c9', name: "Dead Man's Rhythm", patient: 'Hollis Crane', chapter: 3, doctor: 'sokolova', site: 'implant',
      clock: 240, vitals: 74, drain: 0.06, par: 2600, brief: 'A pacemaker that must not be bullied.',
      phases: [
        { name: 'Expose the can', objects: [
          { type: 'cut', x: 213, y: 120, order: 1, guide: [[190, 120], [236, 120]] },
          { type: 'pool', x: 213, y: 142, vol: 18, max: 22, order: 2 },
        ] },
        { name: 'Four screws', objects: [0, 1, 2, 3].map(i => ({ type: 'screw', x: 190 + (i % 2) * 40, y: 104 + Math.floor(i / 2) * 28, order: 1 })) },
        { name: 'The true order', device: { order: ['tri', 'dot', 'sq'], next: 0, x: 213, y: 96, shown: false }, objects: [
          { type: 'wire', x: 180, y: 130, len: 28, order: 2, tag: 'sq', needsBoard: true, hidden: true, guide: [[166, 130], [194, 130]] },
          { type: 'wire', x: 213, y: 142, len: 28, order: 2, tag: 'tri', needsBoard: true, hidden: true, guide: [[199, 142], [227, 142]] },
          { type: 'wire', x: 246, y: 128, len: 28, order: 2, tag: 'dot', needsBoard: true, hidden: true, guide: [[232, 128], [260, 128]] },
        ] },
        { name: 'Bypass', objects: [
          { type: 'polyp', x: 213, y: 116, order: 1, need: 0.45, tag: 'lead' },
        ] },
        { name: 'Lift it', tilt: 0.6, objects: [{ type: 'note', x: 213, y: 120, axis: [0, -1], depth: 22, tension: 50, order: 1, tag: 'can' }] },
        { name: 'Close', objects: [{ type: 'wound', x: 213, y: 128, stitches: 4, order: 1 }] },
      ],
    },
    c10: {
      id: 'c10', name: 'Eloquent Cortex', patient: 'Percival Whitlock', chapter: 4, doctor: 'both', site: 'brain',
      clock: 260, vitals: 70, drain: 0.06, par: 2000, lightbox: true, consult: true,
      brief: 'Percy wrote migraine, in his own hand.',
      phases: [
        { name: 'Open', objects: [
          { type: 'cut', x: 200, y: 110, order: 1, guide: [[170, 100], [200, 116], [230, 104]] },
          { type: 'pool', x: 220, y: 140, vol: 16, max: 20, order: 2 },
        ] },
        { name: 'Fermata', strain: 'fermata', at: [{ t: 1, do: 'breath' }, { t: 6, do: 'look' }] },
        { name: 'Close', objects: [
          { type: 'wound', x: 210, y: 120, stitches: 4, order: 1 },
          { type: 'patch', x: 180, y: 140, r: 8, order: 2 },
        ] },
      ],
    },
    c11: {
      id: 'c11', name: 'Last Note', patient: 'Clementine Hale', chapter: 4, doctor: 'both', site: 'mediastinum',
      clock: 520, vitals: 82, drain: 0.04, par: 4000, consult: true,
      brief: 'Every Anodyne patient fails at once. He carries her in.',
      phases: [
        { name: 'Open', objects: [
          { type: 'cut', x: 213, y: 116, order: 1, guide: [[168, 116], [258, 116]] },
          { type: 'pool', x: 190, y: 146, vol: 20, max: 24, order: 2 },
          { type: 'bleeder', x: 230, y: 100, order: 1 },
          { type: 'bleeder', x: 160, y: 124, order: 1 },
        ] },
        { name: 'Cantor', strain: 'cantor' },
      ],
    },
  };

  function roundsCase(n) {
    n = Math.max(1, Math.min(4, n | 0));
    const triage = [];
    for (let i = 0; i < 3 * n; i++) {
      const x = 150 + (i % 6) * 22, y = 96 + Math.floor(i / 6) * 26;
      if (i % 3 === 0) triage.push({ type: 'arteryTear', x, y, stitches: 3, order: 1, tag: 'tr' + i });
      else triage.push({ type: 'bleeder', x, y, order: 1, tag: 'bl' + i });
    }
    triage.push({ type: 'pool', x: 213, y: 150, vol: 16, max: 24, order: 4, tag: 'floor' });
    const wounds = [];
    for (let i = 0; i < n; i++) wounds.push({ type: 'wound', x: 160 + i * 28, y: 128, stitches: 3, order: 1 });
    return {
      id: 'ferry', name: 'Grand Rounds', patient: 'Ferry ward', chapter: 0, doctor: 'vale', site: 'abdomen',
      clock: 260 + 30 * n, vitals: 84, drain: 0.04, par: 2000 + 400 * n, mode: 'rounds', players: n,
      brief: 'One patient, as many hands as the table holds.',
      phases: [
        { name: 'Triage', objects: triage },
        { name: 'Swarm', strain: 'staccato', strainOpts: { nests: n, beads: Math.min(8, 4 * n), landIn: 6, x: 160, y: 120 } },
        { name: 'One holds, one cuts', objects: [
          { type: 'retractor', x: 120, y: 150, order: 0 },
          { type: 'mass', x: 220, y: 116, order: 1, needsWindow: true, rad: 14 },
        ] },
        { name: 'Choir', strain: 'dacapo' },
        { name: 'Close', objects: wounds },
      ],
    };
  }

  CASES.ferry = roundsCase(1);
  CASES.lab = {
    id: 'lab', name: 'Skills Lab', patient: 'A pig trotter', chapter: 0, doctor: 'vale', site: 'forearm',
    clock: 999, vitals: 90, drain: 0, par: 1, lab: true, brief: 'It has signed the waiver.',
    phases: [{
      name: 'Lab',
      objects: [
        Object.assign(shard(150, 100, [1, 0], 14, 1), { lab: true, tag: 'lab-shard' }),
        { type: 'laceration', x: 190, y: 100, r: 8, order: 1, lab: true },
        { type: 'wound', x: 230, y: 110, stitches: 3, order: 1, lab: true },
        { type: 'polyp', x: 160, y: 140, order: 1, lab: true },
        { type: 'pool', x: 210, y: 146, vol: 20, max: 20, order: 1, lab: true },
        { type: 'bleeder', x: 250, y: 140, order: 1, lab: true },
        { type: 'clot', x: 180, y: 150, order: 1, lab: true },
      ],
    }],
  };

  const LIGHT = {
    c2: { mark: [248, 96], text: 'Percy wrote hernia. The shadow under the rib is not bowel.', right: 'Second opinion confirmed.', wrong: 'That is a bowel loop. Percy smirks somewhere.' },
    c4: { mark: [168, 132], text: 'Superficial, the chart says. The film is moving.', right: 'Second opinion confirmed.', wrong: 'Still. Watch it hop.' },
    c10: { mark: [230, 88], text: 'Migraine, in his own handwriting. The skull film hums.', right: 'Second opinion confirmed.', wrong: 'A migraine does not cast that shadow.' },
  };

  function line(who, say, expr) { return { who, say, expr: expr || 'neutral' }; }

  const NODES = {
    start: [
      line('quill', 'Night shift, Doctor Vale. Theatre three. The east wing is loud. We are not.'),
      line('vale', 'Okay. Okay. First solo. She cannot hear me. Sorry.'),
      line('quill', 'Agnes Pellow, seventy-four. Greenhouse roof. She asked us to keep the glass.'),
      { who: 'quill', say: 'Shall we begin, Doctor?', choices: [
        { text: 'I can do this.', goto: 'c1_in' },
        { text: 'Give me a second.', goto: 'c1_in' },
      ] },
    ],
    c1_in: [
      line('vale', 'Agnes, I am Immy. I will be careful with the pieces.'),
      line('quill', 'Forceps first. Pull along the glint. The dish is to your right.'),
      { event: 'op', caseId: 'c1', wait: true }, { goto: 'c1_out' },
    ],
    c1_out: [
      line('quill', 'Closed. She will wake with all her glass and most of her pride.'),
      line('vale', 'My hands will not stop shaking.'),
      line('quill', 'They stop around year thirty, Doctor. I am told.'),
      { event: 'ward', wait: true }, { goto: 'c2_in' },
    ],
    c2_in: [
      line('percy', 'Hernia. Obviously. I already signed the chart.'),
      line('odalys', 'Okay so do not freak out, but the film is not a hernia.'),
      line('vale', 'Desmond Achebe. He plays low brass at the Harbor Jazz Hall.'),
      line('quill', 'Then we shall not operate on a hernia, Doctor Whitlock.'),
      { event: 'op', caseId: 'c2', wait: true }, { goto: 'c2_out' },
    ],
    c2_out: [
      line('quill', 'A spit-valve cork. Swallowed, he says, in 1987. I will label it.'),
      line('vale', 'He wondered where that went. Chief, you were watching.'),
      line('oyelaran', 'A surgeon who argues with a chart. How tiresome. Do it again tomorrow.'),
      { event: 'ward', wait: true }, { goto: 'c3_in' },
    ],
    c3_in: [
      line('quill', 'Crane Nine is in the harbor and also, regrettably, in Mister Rennie.'),
      line('vale', 'Where is the Chief?'),
      line('quill', 'Away. Which leaves you. Big Tam. Foreman. He has a dog named Permit.'),
      line('vale', 'Okay okay okay. Sorry. He cannot hear me.'),
      { event: 'op', caseId: 'c3', wait: true }, { goto: 'c3_out' },
    ],
    c3_out: [
      line('quill', 'How long did that feel, Doctor?'),
      line('vale', 'A minute?'),
      line('quill', 'Eleven seconds. We do not discuss it in the lift.'),
      line('oyelaran', 'There is an old word in theatre. Later. Not in the corridor.'),
      { event: 'ward', wait: true }, { goto: 'c4_in' },
    ],
    c4_in: [
      line('odalis', 'Wait.'),
      line('odalys', 'Captain Harrow walked in whistling. The chart says superficial. The film moved.'),
      line('vale', 'He wants to get back to sea. He says it does not hurt at all.'),
      line('quill', 'That is not the reassurance he thinks it is.'),
      { event: 'op', caseId: 'c4', wait: true }, { goto: 'c4_out' },
    ],
    c4_out: [
      line('vale', 'I heard it. A little dry ticking, under the suction.'),
      line('quill', 'I did not. Which worries me more than if I had.'),
      line('odalys', 'It is not in any database. I checked twice and then I ate.'),
      line('oyelaran', 'Not a word about this until I have spoken to the Foundation.'),
      { event: 'ward', wait: true }, { goto: 'c5_in' },
    ],
    c5_in: [
      line('vale', 'Ilse Brandt, nineteen. Conservatory. Her left hand is numb and she has never been happier.'),
      line('quill', 'She does not want treatment. We are doing it anyway. That is the argument.'),
      line('vale', 'There is a gold line on the field. Quill, if I touch it?'),
      line('quill', 'You will not. I have faith, which is not my habit.'),
      { event: 'op', caseId: 'c5', wait: true }, { goto: 'c5_out' },
    ],
    c5_out: [
      line('vale', 'She woke up crying. She said thank you. She said it hurts.'),
      line('quill', 'Good. Pain is a letter. She can read again.'),
      line('odalys', 'Every one of these went through an Anodyne clinic. I drew a map. It is ugly.'),
      line('percy', 'You have been up for forty hours. You look like a chart left in the rain.'),
      { event: 'ward', wait: true }, { goto: 'c6_in' },
    ],
    c6_in: [
      line('hale', 'Pain is the last disease, friends. I only ask the city to set it down.'),
      line('quill', 'The Chief is on the floor. Cane still rolling. Gala can wait.'),
      line('vale', 'That is Dr. Oyelaran. That is my Chief. Quill.'),
      line('quill', 'I know who she is, Doctor. Scalpel. Then we talk.'),
      { event: 'op', caseId: 'c6', wait: true }, { goto: 'c6_out' },
    ],
    c6_out: [
      line('oyelaran', 'They sing, Doctor. So we name them like songs. I took their money. I took their pills.'),
      line('oyelaran', 'There is a woman on a hospital ship. Sokolova. She has unfinished business with your nurse.'),
      line('quill', 'I have not dropped a tray in thirty-one years.'),
      line('vale', 'You just did.'),
      line('quill', 'We are going to the harbor.'),
      { event: 'ward', wait: true }, { goto: 'c7_in' },
    ],
    c7_in: [
      line('sokolova', 'You are late, Bartholomew.'),
      line('quill', 'Thirty-one years, Yevgenia.'),
      line('sokolova', 'Yusuf Demir, deckhand. The winch won. Watch, little resident. This one I take back.'),
      line('vale', 'Take back? The clock does not...'),
      line('sokolova', 'No. Again.'),
      { event: 'op', caseId: 'c7', wait: true }, { goto: 'c7_out' },
    ],
    c7_out: [
      line('vale', 'I saw the blood go back into him. I saw the minute unhappen.'),
      line('sokolova', 'In the navy we did this with a spoon. The spoon was worse. Come, both of you.'),
      line('quill', 'The ship rolls. So do we. Next is a nun, which feels correct.'),
      { event: 'ward', wait: true }, { goto: 'c8_in' },
    ],
    c8_in: [
      line('sokolova', 'Sister Perpetua runs the hospice. Her patients have never been happier. I hate it.'),
      line('vale', 'You would give them back their pain?'),
      line('sokolova', 'I would give them back their choice. Hold the sucker. I am old and I am fast.'),
      { event: 'op', caseId: 'c8', wait: true }, { goto: 'c8_out' },
    ],
    c8_out: [
      line('sokolova', 'It grew back. From the top, like a bad chorus. We cut the chorus out.'),
      line('quill', 'She asked me to pray. I counted sponges, which is my prayer.'),
      line('vale', 'There is a researcher on the manifest. Hollis Crane. He says the device in his chest is a threat.'),
      { event: 'ward', wait: true }, { goto: 'c9_in' },
    ],
    c9_in: [
      line('sokolova', 'We are doctors. We do not defuse bombs. Today the bomb is a pacemaker, so we do.'),
      line('quill', 'I will fetch the other forceps.'),
      line('vale', 'If his heart stops, or if we force the can, the ship goes with him.'),
      line('sokolova', 'Then we will be polite to the can. Read the board. Do not trust the colors.'),
      { event: 'op', caseId: 'c9', wait: true }, { goto: 'c9_out' },
    ],
    c9_out: [
      line('quill', 'He is alive, which is more than his employer wanted.'),
      line('vale', 'He said it began with Hale\'s daughter. Everything is singing to her.'),
      line('sokolova', 'Then we sail for Port Anselm. I have a coat somewhere. It will not help.'),
      { event: 'ward', wait: true }, { goto: 'c10_in' },
    ],
    c10_in: [
      line('percy', 'It is finally quiet. Immy. I am sorry. I have been taking it. To keep up with you.'),
      line('vale', 'Stay. Zhenya is here. We are both here. That is the point of a consult.'),
      line('sokolova', 'Eloquent cortex. Gold lines. You breathe, I rewind, nobody makes him a poet by accident.'),
      line('quill', 'Two surgeons, one nurse, one arrogant boy. A full table. I am content.'),
      { event: 'op', caseId: 'c10', wait: true }, { goto: 'c10_out' },
    ],
    c10_out: [
      line('percy', 'Your stitches are crooked.'),
      line('vale', 'I know. I am crying. It is fine. It is the good kind.'),
      line('oyelaran', 'Across the city, child. They are all falling at once. Hale is at our door.'),
      { event: 'ward', wait: true }, { goto: 'c11_in' },
    ],
    c11_in: [
      line('hale', 'I only wanted her not to hurt. I carried her through my own billboard. Please.'),
      line('clementine', 'Hello. I think I am supposed to be afraid. I cannot find it.'),
      line('sokolova', 'You will. That is the work. Immy, with me. Bartholomew, the long suction.'),
      line('oyelaran', 'Gallery is full. I brought the cane and not the pride. Do not rush the last note.'),
      line('quill', 'All of us, then. Don\'t let it go quiet.'),
      { event: 'op', caseId: 'c11', wait: true }, { goto: 'c11_out' },
    ],
    c11_out: [
      line('clementine', 'It hurts. Oh, it hurts. I can feel my hands. They are cold. Thank you.'),
      line('hale', 'I surrender. Gently, if you can manage it. The city will be loud.'),
      line('quill', 'Doctor, I have a headache!'),
      line('vale', 'Wonderful.'),
      line('quill', 'Your hands, Doctor.'),
      line('vale', 'They have stopped shaking.'),
      line('quill', 'No. They have not.'),
      line('vale', 'Good.'),
      { event: 'credits', wait: true }, { goto: 'epilogue' },
    ],
    epilogue: [
      line('quill', 'Next shift starts at seven. Get some sleep, Doctor.'),
      { end: true },
    ],
  };

  /* Fix the one bad who id if I typed odalis. */
  NODES.c4_in[0].who = 'quill';
  NODES.c4_in[0].say = 'Captain Ned Harrow. Gaff in the flank. Whistling the whole corridor down.';

  const WARD = {
    1: ['agnes', 'slide', 'tam'],
    2: ['agnes', 'slide', 'tam', 'ned', 'ilse', 'oyelaran'],
    3: ['yusuf', 'perpetua', 'hollis'],
    4: ['agnes', 'slide', 'percy', 'clementine'],
  };
  const PEOPLE = {
    agnes: { name: 'Agnes Pellow', line: 'The grandchildren took the glass. Begonias on the sill. From them.' },
    slide: { name: 'Slide Achebe', line: 'I am practicing with a mute. The cork is framed. Do not tell Percy.' },
    tam: { name: 'Big Tam', line: 'Permit the dog is in the car. Tell the Chief the crane was not my idea.' },
    ned: { name: 'Ned Harrow', line: 'Hurts when I laugh. I am laughing anyway. Tide turns at four.' },
    ilse: { name: 'Ilse Brandt', line: 'I can feel the E string. It is awful. It is mine.' },
    oyelaran: { name: 'The Chief', line: 'Door is open. I am not dying. Do not hover. Hover a little.' },
    yusuf: { name: 'Yusuf Demir', line: 'The winch and I are no longer speaking. The ship fed me soup.' },
    perpetua: { name: 'Sister Perpetua', line: 'They are angry, which means they are awake. I can live with angry.' },
    hollis: { name: 'Hollis Crane', line: 'The can is in a basin, labeled. I would like to see the harbor sober.' },
    percy: { name: 'Percy', line: 'Your stitches are still crooked. I am keeping them. Go.' },
    clementine: { name: 'Clementine', line: 'The sheet is scratchy. I love it. I love all of it. Go sleep.' },
  };

  GAME.CAST = CAST;
  GAME.BARKS = BARKS;
  GAME.CASES = CASES;
  GAME.ORDER = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11'];
  GAME.LIGHT = LIGHT;
  GAME.NODES = NODES;
  GAME.WARD = WARD;
  GAME.PEOPLE = PEOPLE;
  GAME.EXPR = EXPR;
  GAME.roundsCase = roundsCase;
})();
