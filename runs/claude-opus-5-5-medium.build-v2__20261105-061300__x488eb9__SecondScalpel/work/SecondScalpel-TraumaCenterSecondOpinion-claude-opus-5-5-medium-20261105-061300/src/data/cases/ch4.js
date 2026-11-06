// Chapter 4: Coda. Both doctors, and the Cantor.
(() => {
const G = (window.GAME ||= {}), { defCase, defScript, spiralPts } = G;
defScript('fermataEnter', S => { S.steady = Math.max(S.steady, 60); });
defScript('fermata2Step', S => { if (S.flags.fermata_found && !S.objs.some(o => o.type === 'sliver' && !o.dead)) S.ph.d.done = true; });
const NERVES = [{ t: 'nerve', pts: [[86, 74], [130, 96], [180, 70], [226, 88]] }, { t: 'nerve', pts: [[230, 164], [276, 150], [330, 158]] }, { t: 'nerve', pts: [[110, 160], [150, 142], [196, 166]] }];
defCase({ id: 'c10', number: 10, title: 'Eloquent Cortex', chapter: 4, doc: 'both', site: 'brain', seed: 131, clock: 240, vitals: 60, drain: .3,
  patient: 'Dr. Percival Whitlock, 29', complaint: 'Collapsed mid-sentence, smiling. "It\'s finally quiet."', opinion: 'His own handwriting on his own chart: "Migraine."', story: { before: 'c10_before', after: 'c10_after' }, teach: 'Consult: two doctors, two gifts', music: 'boss',
  lightbox: { film: 'skull', at: [176, 104], decoys: [[250, 90], [226, 150]], text: 'Not a migraine. An eye. It is looking back.', markAt: [150, 90] },
  phases: [
    { obj: 'Open the scalp', bark: 'Your hands, Dr. Sokolova. Hers next. Try to share.', spawn: [...NERVES, { t: 'guide', pts: [[120, 54], [170, 40], [230, 38], [290, 52], [320, 76]] }, { t: 'pool', x: 240, y: 112, vol: 90, req: true }, { t: 'bleeder', x: 262, y: 128 }, { t: 'pool', x: 160, y: 124, vol: 80, req: true }, { t: 'bleeder', x: 160, y: 124 }] },
    { obj: 'Burn the eye as it opens', bark: 'Inside a dome, nothing happens. Nothing at all.', when: 'flag:fermata1', enter: 'fermataEnter', spawn: [{ t: 'fermata', x: 150, y: 110 }], tut: { verb: 'consult', text: 'Consult hands over to the other doctor: Vale stretches the moment, Sokolova takes it back.' }, tip: { k: 'consult', text: 'Consult' } },
    { obj: 'Find the eye', bark: 'It moved. Dr. Vale\'s Sonar reaches further.', enter: 'fermataFlee', step: 'fermata2Step', when: 'done' },
    { obj: 'The gentle pull', bark: 'Gently. This is the part of him that does crosswords.', enter: 'fermataPull', when: 'flag:fermata_dead', tip: { k: 'fine', text: 'Steady hand: a very light pull' } },
    { obj: 'Close', bark: 'Fine stitches. He will complain about them. Good.', spawn: [{ t: 'wound', x: 200, y: 118, a: .2, len: 76, n: 6, w: 9, bleeds: false }, { t: 'patch', x: 300, y: 112, r: 13 }, { t: 'patch', x: 124, y: 112, r: 13 }, { t: 'patch', x: 262, y: 148, r: 12 }, { t: 'wound', x: 210, y: 70, a: 0, len: 50, n: 4, w: 9, bleeds: false }] },
  ] });
const mkBody = { t: 'cantorbody', x: 213, y: 104 };
defScript('c11open', S => { S.lacOpt = true; });
defScript('cantor3enter', S => { S.ringOn = true; S.steady = Math.max(S.steady, 50); });
defCase({ id: 'c11', number: 11, title: 'Last Note', chapter: 4, doc: 'both', site: 'mediastinum', seed: 149, clock: 420, vitals: 70, drain: .3,
  patient: 'Clementine Hale, 19', complaint: 'Patient zero. Has felt nothing since she was nine. Everything is singing to her.', opinion: 'Her father carried her in himself.', story: { before: 'c11_before', after: 'c11_after' }, teach: 'All tools, both gifts, everything you know', music: 'final',
  phases: [
    { obj: 'Open the chest', bark: 'Last time, Doctors. The long line.', enter: 'c11open', spawn: [mkBody, { t: 'guide', pts: [[213, 40], [212, 72], [214, 110], [212, 150], [213, 192]] }, { t: 'bleeder', x: 142, y: 138 }, { t: 'bleeder', x: 286, y: 140 }, { t: 'pool', x: 118, y: 104, vol: 90, req: true }] },
    { obj: 'Slash the batons', bark: 'It conducts. Slash the baton when it rests.', clockAdd: 120, step: 'cantor1', when: 'done', spawn: [{ t: 'baton', x: 140, y: 90, ph0: -.4, rad: 44 }, { t: 'baton', x: 213, y: 84, ph0: 1.2, rad: 44 }, { t: 'baton', x: 286, y: 90, ph0: 2.8, rad: 44 }] },
    { obj: 'Sedate the voice', bark: 'Forty, Doctor. I shall read them to you.', clockAdd: 120, enter: 'cantor2enter', leave: 'cantor2leave', step: 'cantor2', when: 'done', spawn: [{ t: 'voicebox', x: 213, y: 110 }] },
    { obj: 'Cut the repeat', bark: 'It is repeating us. Cut it, or answer it.', clockAdd: 120, enter: 'cantor3enter', step: 'cantor3', when: 'done', tip: { k: 'gift', text: 'Slash the sign, or answer with a rewind' } },
    { obj: 'The Last Note', bark: 'Between beats, Doctors. Only between beats.', clockAdd: 120, step: 'cantor4', when: 'flag:note_out', spawn: [{ t: 'guide', pts: spiralPts(213, 112, 8, 44, 1.45), between: true, after: [{ t: 'note', x: 213, y: 112 }] }], tip: { k: 'fine', text: 'Steady hand. Lift between beats' } },
    { obj: 'Close', bark: '...Doctor.', noMusic: true, spawn: [{ t: 'wound', x: 213, y: 116, a: 1.57, len: 92, n: 6, w: 10, bleeds: false }] },
  ] });
G.defObject('cantorbody', { req: false, want: () => null, init(o) { o.ontop = true; } });
// Grand Rounds: a ferry disaster, scaled by the seats.
defScript('grTriage', S => { const N = S.N, pts = [[120, 88], [168, 150], [214, 80], [262, 150], [306, 92], [140, 122], [288, 124], [214, 124], [100, 112], [326, 124], [190, 60], [238, 170]]; for (let i = 0; i < 3 * N; i++) { const [x, y] = pts[i % pts.length]; G.spawn(S, i % 3 === 0 ? { t: 'arteryTear', x, y, a: i } : { t: 'bleeder', x, y, ontop: i % 3 === 1 }); } G.spawn(S, { t: 'pool', x: 140, y: 136, vol: 80 }); G.spawn(S, { t: 'pool', x: 286, y: 100, vol: 80 }); });
defScript('grSwarm', S => { const N = S.N; S.flags.swarm = true; S.lacOpt = true; S.beadCap = 4 * N; const pts = [[120, 100], [306, 130], [180, 150], [250, 76]]; for (let i = 0; i < N; i++) { const n = G.spawn(S, { t: 'nest', x: pts[i][0], y: pts[i][1], hidden: false }); for (let k = 0; k < 4; k++) G.spawn(S, { t: 'bead', x: n.x + k * 3, y: n.y }); } });
defScript('grClose', S => { const N = S.N; S.lacOpt = true; S.objs.forEach(o => { if (o.type === 'laceration') o.req = false; }); for (let i = 0; i < N; i++) G.spawn(S, { t: 'wound', x: 140 + (N > 1 ? i * 146 / (N - 1) : 73), y: 100 + (i % 2) * 40, a: .3 * (i - 1), len: 62, n: 4, w: 11, bleeds: false }); });
defCase({ id: 'grandrounds', title: 'Grand Rounds', chapter: 0, doc: 'vale', site: 'abdomen', seed: 171, clock: 300, vitals: 75, drain: .25, noClockScale: true,
  patient: 'The Ferry Disaster', complaint: 'The Port Anselm ferry went into the breakwater. All hands to one table.', opinion: 'Every surgeon in the building. Mind the elbows.', teach: 'One to four surgeons, one patient',
  phases: [
    { obj: 'Triage!', bark: 'Everyone bleeds at once tonight, Doctors.', enter: 'grTriage' },
    { obj: 'Swarm: burn and slash', bark: 'Beads. Nests. Teamwork is a technique.', enter: 'grSwarm' },
    { obj: 'One holds, one cuts', bark: 'Hold the retractor open. Someone else cuts.', spawn: [{ t: 'retractorHandle', x: 120, y: 118 }, { t: 'windowTarget', x: 268, y: 112 }], leave: 'grLeave3' },
    { obj: 'Choir: kill all three', bark: 'It sings. A burn, B slash and pull, C dose then salve.', when: 'flag:dacapo_r1', spawn: [{ t: 'dacapo', x: 213, y: 112, small: true, window: 14 }] },
    { obj: 'Close, together', bark: 'Close. Everyone. Dressings on my mark.', enter: 'grClose' },
  ] });
defScript('grLeave3', S => { S.windowOpen = true; });
// The Skills Lab: a pig's trotter, a clock that doesn't run, one of everything.
const LAB = [{ t: 'shard', x: 104, y: 100, a: -1.6, depth: 14 }, { t: 'laceration', x: 160, y: 72, r: 11 }, { t: 'wound', x: 226, y: 72, a: 0, len: 50, n: 3, w: 11, bleeds: false }, { t: 'polyp', x: 300, y: 76 }, { t: 'bleeder', x: 330, y: 118, ontop: true }, { t: 'pool', x: 290, y: 150, vol: 70 }, { t: 'guide', pts: [[140, 158], [190, 150], [240, 164]] }, { t: 'clot', x: 110, y: 148 }, { t: 'nest', x: 213, y: 116, hidden: true, stayMarked: true }];
const LAB_AT = [1, 1, 1, 2, 2, 2, 2, 6, 4], labOn = (S, i) => S.level >= LAB_AT[i];
defScript('labEnter', S => { S.lacOpt = true; S.ph.d.timers = {}; LAB.forEach((sp, i) => { if (labOn(S, i)) G.spawn(S, Object.assign({ lab: i }, sp)); }); });
defScript('labStep', (S, ph, w) => { S.v = Math.max(S.v, 60); const d = S.ph.d; LAB.forEach((sp, i) => { if (!labOn(S, i)) return; const alive = S.objs.some(o => !o.dead && o.lab === i); if (alive) { d.timers[i] = 0; return; } d.timers[i] = (d.timers[i] || 0) + w; if (d.timers[i] > 2.5) { d.timers[i] = 0; G.spawn(S, Object.assign({ lab: i }, sp)); } }); });
defCase({ id: 'lab', title: 'Skills Lab', chapter: 0, doc: 'vale', site: 'forearm', seed: 5, clock: 999, vitals: 80, drain: 0, lab: true, noClockScale: true,
  patient: 'A pig\'s trotter', complaint: 'It has signed the waiver.', opinion: 'Practice anything. Nothing here can die twice.', teach: 'A sandbox with locked vitals',
  phases: [{ obj: 'Practice', bark: 'This is a pig\'s trotter. It has signed the waiver.', enter: 'labEnter', step: 'labStep', when: 'never' }] });
})();
