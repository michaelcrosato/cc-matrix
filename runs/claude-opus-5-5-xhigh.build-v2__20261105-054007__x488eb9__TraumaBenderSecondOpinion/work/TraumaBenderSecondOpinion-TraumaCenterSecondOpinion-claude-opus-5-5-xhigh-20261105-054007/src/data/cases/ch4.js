// Chapter 4, Cases 10 and 11: both doctors, the brain, the finale. And Grand Rounds and the Skills Lab, which sit outside the story.
(() => {
const G = (window.GAME ||= {}), U = G.U, Op = () => G.Op;
const ELOQUENT = [U.curve([[70, 96], [130, 80], [190, 96], [240, 76], [320, 86], [368, 110]], 6), U.curve([[86, 150], [150, 132], [210, 150], [280, 136], [352, 146]], 6)];
const SLIVER = pts => ({ type: 'legato', route: U.curve(pts, 6), segs: 4, speed: 44, limit: 70, hidden: false, noBarb: true, cycle: 22, surfaceT: 5 });
G.defCase({ id: 'eloquent', n: 10, chapter: 4, title: 'Eloquent Cortex', doctor: 'sokolova', duo: true, site: 'brain', clock: 240, vitals: 60, drain: .3, seed: 103, boss: true, teaches: 'Consult: both doctors, one patient', chartStage: 'radiology',
  patient: { name: 'Dr. Percival Whitlock', age: 29, face: 'percy', where: 'Left temporal lobe', complaint: 'Collapsed in your arms, smiling. The first thing he has said all year that you believed: "It\'s finally quiet."', human: 'His own chart, in his own hand, says migraine.' },
  lightbox: { film: 'skull', opinion: 'Migraine. Rest. Do not fuss.', by: 'Dr. Whitlock, of himself', mark: [.58, .44], fieldAt: [218, 118], lines: ['He wrote his own chart, Doctor. Of course he did. Now look at this film and tell me where it is.'], right: 'There. Oh, Percy, you enormous idiot.', wrong: ['A migraine. As I said. I am always right. Ask anyone.', 'It is nothing. Do not fuss. It is so nice and quiet.'], reveal: 'There. Right on the part of him that talks. Of course it is.', anomaly: '#5ff0e0' },
  closeAt: [213, 112],
  phases: [
    { id: 'open', carry: true, obj: 'Open along the curve', enter: [['spawn', { type: 'nerve', pts: ELOQUENT[0], w: 2 }], ['spawn', { type: 'nerve', pts: ELOQUENT[1], w: 2 }]], spawn: [{ type: 'guide', pts: U.curve([[150, 54], [190, 44], [240, 46], [282, 58]]) }, { type: 'pool', x: 150, y: 114, vol: 60 }] },
    { id: 'fermata1', obj: 'When the dome falls, burn', music: 'boss', enter: [['steady', 60]], spawn: [{ type: 'eye', x: 218, y: 118, need: 3 }] },
    { id: 'fermata2', obj: 'It fled. Sweep, then burn', enter: [['steady', 50]], spawn: [{ type: 'eye', x: 118, y: 118, hidden: true, stage2: true, need: 1 }, SLIVER([[80, 60], [150, 70], [240, 56], [340, 76], [350, 110], [260, 102], [160, 112], [84, 92], [80, 60]]), SLIVER([[100, 170], [180, 160], [270, 172], [340, 150], [300, 130], [200, 142], [110, 142], [100, 170]])] },
    { id: 'fermata3', obj: 'The gentlest pull of your life', spawn: [{ type: 'eyeRoot', x: 118, y: 118, ang: -.9, depth: 30, max: 28, par: 2.6 }] },
    { id: 'close', obj: 'Close, with fine stitches', spawn: [{ type: 'wound', x: 214, y: 60, ang: 0, n: 6, len: 62, gap: 6 }, { type: 'patch', x: 112, y: 118, r: 14 }] },
  ],
  barks: {
    enter: [['sokolova', 'Your stitches or mine, dear? Mine. Open.'], ['vale', 'That\'s it, that\'s a Fermata. It\'s waiting.'], ['sokolova', 'Gone to ground. You hear it? You, then.'], ['vale', 'Softly. Softly softly softly.'], ['quill', 'Fine stitches, Doctors. He will complain.']],
    done: [['vale', 'I\'m here, Percy. Be quiet. You are quiet.'], ['sokolova', 'It runs. Good. Things that run die tired.'], ['vale', 'Got it. Oh, I hate this. I got it.'], ['quill', 'That is all of it. He may keep the rest.'], ['quill', 'Dressing, Doctors.']],
    hint: [['quill', 'Scalpel. Mind the gold.'], ['quill', 'Near the eye, cautery, as the dome falls.'], ['quill', 'Sonar for the eye. The ridges will surface.'], ['quill', 'Forceps. Do not breathe on it.'], ['quill', 'Needle, then salve.']],
    extra: { consultHint: [['sokolova', 'Your turn, dear. Stretch that moment.']] },
  },
});
G.defAction('hushOn', S => { S.silent = 1; }); G.defAction('hushOff', S => { S.silent = 0; });
G.defAction('oneBeep', S => { S.silent = 0; S.ev.push(['oneBeep']); S.ev.push(['sayp', 'doctor']); });
G.defCase({ id: 'lastnote', n: 11, chapter: 4, title: 'Last Note', doctor: 'vale', duo: true, site: 'mediastinum', clock: 420, vitals: 70, drain: .3, seed: 113, beat: .9, boss: true, music: 'final', teaches: 'All of it', chartStage: 'corridor',
  patient: { name: 'Clementine Hale', age: 19, face: 'clementine', where: 'Mediastinum', complaint: 'Patient zero. Has felt nothing since she was nine. Everything in the city that sings is singing to her.', human: 'Her father carried her in himself. She smiled at everyone on the way.' },
  closeAt: [213, 120],
  phases: [
    { id: 'open', obj: 'Open her chest', spawn: [{ type: 'guide', pts: U.curve([[213, 34], [216, 70], [212, 110], [216, 150], [213, 190]]) }, { type: 'bleeder', x: 150, y: 142, pdx: 14, pdy: 10 }, { type: 'bleeder', x: 282, y: 150, pdx: -14, pdy: 8 }, { type: 'pool', x: 276, y: 96, vol: 70 }] },
    { id: 'exposition', obj: 'Slash the baton on its pause', title: 'I. EXPOSITION', enter: [['clockAdd', 120], ['music', 'final']], spawn: [{ type: 'cantorEx', x: 213, y: 90 }] },
    { id: 'development', obj: 'Find the voice. Sedate on the beat', title: 'II. DEVELOPMENT', enter: [['clockAdd', 120], ['music', 'silence']], spawn: [{ type: 'cantorDev' }, { type: 'voicebox', x: 288, y: 132, need: 3 }] },
    { id: 'recap', obj: 'Slash the sign, or take it back', title: 'III. RECAPITULATION', enter: [['clockAdd', 120], ['music', 'boss'], ['steady', 70]], spawn: [{ type: 'cantorRecap', every: 14, need: 6 }] },
    { id: 'coda1', obj: 'Between the beats', title: 'IV. CODA', enter: [['clockAdd', 120], ['music', 'silence']], spawn: [{ type: 'guide', beatLock: true, beatSlip: 2, pts: U.spiral(213, 116, 36, 6, 1.5, 70) }] },
    { id: 'coda2', obj: 'Draw out the Last Note', spawn: [{ type: 'lastNote', x: 213, y: 118 }] },
    { id: 'coda3', obj: '', enter: [['hushOn'], ['crashStop']], clear: { t: 3.4, only: true }, script: [{ t: 3, do: [['oneBeep']] }] },
    { id: 'coda4', obj: 'Six final stitches', enter: [['music', 'piano'], ['hushOff']], spawn: [{ type: 'wound', x: 213, y: 116, ang: 1.5, n: 6, len: 60, gap: 8 }] },
  ],
  barks: {
    enter: [['vale', 'Okay. Okay okay. Last one. Let\'s go.'], ['sokolova', 'Listen to it conduct. Vanity. Cut its hand.'], [], ['sokolova', 'It thinks it can take things back. Ha!'], ['vale', 'Between the beats. I know. I know.'], ['vale', 'Come on. Come out. It\'s over.'], [], ['quill', '...Doctor.']],
    done: [['quill', 'There she is. And there it is.'], ['vale', 'The mouths are shut. It\'s stopped singing.'], ['quill', 'I can hear you again, Doctor. Pity.'], ['sokolova', 'I\'ve seen this one. It ends here.'], ['vale', 'Stay. Stay. There.'], [], [], ['quill', 'Dressing, Doctor. No hurry now.']],
    hint: [['quill', 'The long line. Then the bleeders.'], ['quill', 'When the arc pauses, Doctor. Slash.'], ['quill', 'Sonar. Sedate on the beat. Three times.'], ['quill', 'Slash the sign. Or she takes it back.'], ['quill', 'Move between beats. Only between.'], ['quill', 'Forceps. Slowly. To the end.'], [], ['quill', 'Needle, Doctor.']],
    extra: { mouths: [['sokolova', 'Now the mouths. Burn out their tongues.']], recap: [['quill', 'It is going to play that again.']], seenthis: [['sokolova', 'I have seen this one.']], doctor: [['quill', '...Doctor.']] },
  },
});

// ------------------------------------------------------------------ Grand Rounds: a ferry disaster, for 1 to 4 surgeons
const nPlayers = S => Math.max(1, S.hands.filter(h => !h.gone).length);
const SPOT = (S, m = 26) => { for (let k = 0; k < 12; k++) { const x = U.range(S, 60, 366), y = U.range(S, 48, 186); if (U.inCavity(x, y, m)) return [x, y]; } return [213, 116]; };
G.defAction('grTriage', S => { const n = nPlayers(S); for (let i = 0; i < 3 * n; i++) { const [x, y] = SPOT(S); if (i % 3 === 2) Op().spawn(S, { type: 'arteryTear', x, y, ang: U.range(S, -1, 1), n: 3, len: 18, pdx: 12, pdy: 12 }); else Op().spawn(S, { type: 'bleeder', x, y, feed: 5, pdx: 10, pdy: 9 }); } for (let i = 0; i < 3 + n; i++) { const [x, y] = SPOT(S); Op().spawn(S, { type: 'pool', x, y, vol: U.range(S, 40, 90), req: false }); } });
G.defAction('grSwarm', S => { const n = nPlayers(S); for (let i = 0; i < n; i++) { const [x, y] = SPOT(S, 30); Op().spawn(S, { type: 'nest', x, y, hidden: true, ang: U.range(S, -3, 3), depth: 10 }); } Op().spawn(S, { type: 'staccato', x: 213, y: 116, beads: 4 * n, maxBeads: 4 * n + 2, every: 3.5 }); });
G.defAction('grRetract', S => { Op().spawn(S, { type: 'retractorHandle', x: 96, y: 96, tx: 170, ty: 110, req: false }); Op().spawn(S, { type: 'windowed', x: 244, y: 116, hp: nPlayers(S) > 1 ? 2 : 1 }); S.flags.retractorPrompt = true; });
G.defAction('grRetractEnd', S => { for (const q of S.objs) if (q.type === 'retractorHandle') q.done = true; S.flags.windowOpen = false; S.flags.retractorPrompt = false; S.flags.quillHolds = false; });
G.defAction('grChoir', S => { Op().spawn(S, { type: 'dacapo', x: 213, y: 108, speed: 1, limit: 12, spread: 84 }); });
G.defAction('grClose', S => { const n = nPlayers(S); for (let i = 0; i < n; i++) Op().spawn(S, { type: 'wound', x: 120 + i * (186 / Math.max(1, n - 1 || 1)), y: 116 + (i % 2 ? 22 : -18), ang: .1 * i, n: 4, len: 34, gap: 8 }); });
G.defCase({ id: 'grandrounds', hidden: true, n: 0, title: 'Grand Rounds', mode: 'rounds', doctor: 'vale', noLookEver: true, site: 'abdomen', clock: 280, vitals: 75, drain: .25, seed: 7, music: 'emergency', look: false,
  patient: { name: 'The Harbor Ferry', where: 'Everyone, at once', complaint: 'A ferry has gone down off Pier Four. Every surgeon in the building, one patient at a time. This one is ours.', human: 'Bring your own hands.' },
  closeAt: [213, 116],
  phases: [
    { id: 'triage', obj: 'Triage: stop the bleeding', enter: [['grTriage']] },
    { id: 'swarm', obj: 'Swarm: sweep, slash, pull', music: 'boss', enter: [['grSwarm']] },
    { id: 'hold', obj: 'One holds, one cuts', enter: [['grRetract']], clear: {} },
    { id: 'choir', obj: 'Choir: all three in time', enter: [['grRetractEnd'], ['grChoir']] },
    { id: 'close', obj: 'Close: everybody sews', enter: [['grClose']] },
  ],
  barks: {
    enter: [['quill', 'Pick a bleeder, Doctors. Any bleeder.'], ['vale', 'Something is singing down there!'], ['quill', 'One of you holds. One of you cuts.'], ['sokolova', 'All three in time, children.'], ['quill', 'Everybody sews. Mind each other\'s elbows.']],
    done: [['quill', 'That is the worst of it.'], ['vale', 'Got them! All of them! I think!'], ['quill', 'I shall let go of this now.'], ['sokolova', 'Ha!'], ['quill', 'Dressing, Doctors. Together.']],
    hint: [['quill', 'Cautery and needle.'], ['quill', 'Sonar first. Then the blade.'], ['quill', 'Forceps on the steel. Blade on the rest.'], ['quill', 'Watch the armor.'], ['quill', 'Needle.']],
    extra: {},
  },
});

// ------------------------------------------------------------------ Skills Lab: no clock, vitals locked, one of everything unlocked so far
G.defObject('labSpawner', { optional: true, accept: () => null, init(o) { o.t = 0; o.req = false; o.specs = [
  { tag: 'l1', type: 'shard', variant: 'glass', x: 110, y: 92, ang: -2, depth: 16 }, { tag: 'l2', type: 'laceration', x: 160, y: 72, r: 10, dry: true, ang: .4 }, { tag: 'l3', type: 'wound', x: 214, y: 76, ang: 0, n: 3, len: 30 }, { tag: 'l4', type: 'guide', pts: [[290, 66], [322, 76], [336, 96]] },
  { tag: 'l5', type: 'bleeder', x: 104, y: 136, feed: 2, pdx: 12, pdy: 8 }, { tag: 'l6', type: 'polyp', x: 164, y: 118 }, { tag: 'l7', type: 'pool', x: 150, y: 170, vol: 60 }, { tag: 'l8', type: 'clot', x: 214, y: 116, ang: -1 }, { tag: 'l9', type: 'patch', x: 266, y: 124, r: 14 }, { tag: 'l10', type: 'bleeder', hidden: true, x: 326, y: 130, feed: 2, pdx: -10, pdy: 8 }, { tag: 'l11', type: 'bead', x: 240, y: 170 } ].filter(Boolean); },
  step(o, S, w, dt) { o.t -= dt; if (o.t > 0) return; o.t = 1.4; const only = S.flags.labOnly; for (const q of o.specs) if ((!only || only.includes(q.tag)) && !Op().byTag(S, q.tag)) Op().spawn(S, Object.assign({ req: false }, q)); } });
G.defCase({ id: 'lab', hidden: true, n: 0, title: 'Skills Lab', mode: 'lab', doctor: 'vale', site: 'abdomen', clock: 99999, vitals: 99, drain: 0, seed: 3, music: 'ward', look: false,
  patient: { name: 'A pig\'s trotter', where: 'The lab', complaint: 'It has signed the waiver.', human: 'It holds no grudges.' }, closeAt: [213, 116],
  phases: [{ id: 'lab', obj: 'Skills Lab', clear: { flag: 'never', only: true }, spawn: [{ type: 'labSpawner' }] }],
  barks: { enter: [['quill', 'This is a pig\'s trotter. It has signed.']], done: [[]], hint: [['quill', 'Try the wheel, Doctor.']], extra: {} },
});
})();
