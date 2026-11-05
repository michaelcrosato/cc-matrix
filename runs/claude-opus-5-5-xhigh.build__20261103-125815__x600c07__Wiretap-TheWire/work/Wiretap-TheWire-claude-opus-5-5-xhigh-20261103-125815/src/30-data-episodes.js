/* 30-data-episodes: The Case as data. Five episodes of beats (App. J.3: { id, ep, kind, ref, tasks, story, next }),
   the ops choices, the canonical states episode select starts from, and the Annex's scripts. */
const EPISODES = [
  { title: 'Eyes On', epigraph: 'Everybody on that corner is working. Question is, who\'s signing the checks.', by: 'Lou Szabo', blurb: 'A dead bus driver, a corner, a camera.' },
  { title: 'Paper', epigraph: 'A judge doesn\'t care what you know. He cares what you can write down.', by: 'ASA Corinne Vance', blurb: 'Payphones, a chase, the box, a judge.' },
  { title: 'Up', epigraph: 'You don\'t listen to a phone. You listen to a man getting comfortable.', by: 'Hal Pettiford', blurb: 'The wire, the van, a hearse.' },
  { title: 'Dry Cleaning', epigraph: 'Smart ain\'t never being seen. Smart is being boring when they look.', by: 'Terrence Mabry', blurb: 'Throwaway phones, a tail, a kitchen table.' },
  { title: 'The Count', epigraph: 'Every week the money gets counted. Every week somebody comes up short.', by: 'Darnell "Easy" Booker', blurb: 'Dope on the table, or follow the money.' }
];
/* ---- ops choices (one an episode, in Navarre's office) ---- */
const Ops = {
  choose(n, done) {
    const C = OPS[n], cards = C.cards.map(c => ({ id: c.id, label: c.label, sub: c.sub, disabled: c.locked ? !!c.locked() : false, why: c.locked ? c.locked() : '' }));
    UI.choose({ kicker: 'Episode ' + n + ' · Your call', title: C.title, text: C.text, cards, back: false }, id => { const c = C.cards.find(x => x.id === id); try { c.apply(); } catch (e) { game.fail('ops', e); } bus.emit('ops', { n, id }); if (done) done(id); });
  }
};
const OPS = {
  1: { title: 'What the detail asks for', text: 'Navarre can get you one thing out of the Major this week.', cards: [
    { id: 'van', label: 'Ask for the van', sub: 'Ren\'s surveillance van for the stakeout in Episode 3. The crew notices vans at a normal rate.', apply: () => { F().ops1 = 'van'; } },
    { id: 'ot', label: 'Ask for overtime', sub: 'You stake out from your own Chevy (noticed 1.5x faster), but every wire shift in Episode 3 runs an extra hour with one extra pertinent call.', apply: () => { F().ops1 = 'ot'; } }] },
  2: { title: 'Who backs the payphones', text: 'The judge wants somebody who saw them use those phones.', cards: [
    { id: 'pockets', label: 'Use Pockets', sub: 'Free. His statement only counts beside a photo or a page.', apply: () => { F().ops2 = 'pockets'; addEvidence({ id: 'stmt:pockets:phones', kind: 'stmt', ref: 'pockets', line: 'P1', pts: 1, text: 'Pockets: Tee uses the market phone, regular.' }); } },
    { id: 'pat', label: 'Pay Miss Pat (Fund -$100)', sub: 'The Gaither Market cashier. A citizen witness: worth 2 points on the P1 line by herself.', locked: () => STATE.meters.fund < 100 ? 'Not enough in the fund' : '', apply: () => { F().ops2 = 'pat'; Meters.add('fund', -100, 'Paid a witness'); addEvidence({ id: 'stmt:pat:p1', kind: 'stmt', ref: 'pat', line: 'P1', pts: 2, direct: true, text: 'Patricia Moore, cashier: the young man in the black cap uses the market phone every afternoon.' }); } }] },
  3: { title: 'The Major wants bodies', text: 'Pruitt is in the doorway with a stat sheet. Navarre lets you answer.', cards: [
    { id: 'sweep', label: 'Give him bodies (sweep)', sub: 'Brass +25. Heat +20. Six corner boys in cuffs by Friday, and the P1 phone goes dead.', apply: () => { F().sweep = true; Meters.stat('brass', 25, 'The sweep: six arrests on the stat sheet'); Meters.add('heat', 20, 'The corner felt the sweep'); STATE.numbers.P1 && (STATE.numbers.P1.dead = true); } },
    { id: 'hold', label: 'Hold the line', sub: 'Brass -20. The wire keeps every phone it has.', apply: () => { F().sweep = false; Meters.add('brass', -20, 'You told the Major no'); } }] },
  4: { title: 'The burner subpoenas', text: 'The carrier takes ten days by the book. Vance can lean on them.', cards: [
    { id: 'rush', label: 'Rush the subpoenas', sub: 'Legal +10, Brass +5. The Major likes speed.', apply: () => { F().ops4 = 'rush'; Meters.add('legal', 10, 'Corners cut on the subpoenas'); Meters.add('brass', 5, 'Fast is good'); } },
    { id: 'book', label: 'By the book', sub: 'Brass -5. Same calls either way.', apply: () => { F().ops4 = 'book'; Meters.add('brass', -5, 'Ten days the Major will remember'); } }] },
  5: { title: 'Two ways to end it', text: 'Friday\'s re-up at the garage, or Thursday\'s count at Mama B\'s.', cards: [
    { id: 'A', label: 'A. Dope on the table', sub: 'Raid the garage Friday at nine. Tee, a package, a press conference.', apply: () => { F().path = 'A'; } },
    { id: 'B', label: 'B. Follow the money', sub: 'Watch Thursday\'s count from the roof across the alley. Maybe Easy himself.', locked: () => STATE.meters.brass < 30 ? 'The Major won\'t wait: Brass under 30' : !((F().coreyCI && !F().coreyExposed) || F().pigeonTrust >= 70) ? 'Nobody inside tells you when the count moves' : '', apply: () => { F().path = 'B'; } }] }
};

/* ---- the beats ---- */
const BEAT_LIST = [
  { id: 'e1.cold', ep: 1, kind: 'field', ref: 'cold' },
  { id: 'e1.card', ep: 1, kind: 'card' },
  { id: 'e1.brief', ep: 1, kind: 'annex', time: 'day', story: 'brief1', tasks: [
    { at: 'evidence', label: 'Sign out a camera at the evidence cage', verb: 'Sign out the camera', run: 'camera1' },
    { at: 'navarre', label: 'See Navarre about what the detail needs', verb: 'Talk to Navarre', run: 'ops1' },
    { at: 'stairs', label: 'Head out to Ridley', verb: 'Head out', final: true }] },
  { id: 'e1.car', ep: 1, kind: 'car', topics: 'car1' },
  { id: 'e1.photos', ep: 1, kind: 'field', ref: 'photos1' },
  { id: 'e1.board', ep: 1, kind: 'annex', time: 'dusk', story: 'board1', tasks: [
    { at: 'board', label: 'Put faces and roles on the Board', verb: 'Work the Board', run: 'board', done: () => Board.pinned() >= Math.min(4, Board.eligible()) },
    { at: 'stairs', label: 'Go home. Get some sleep.', verb: 'Call it a night', final: true }] },
  { id: 'e1.i1', ep: 1, kind: 'field', ref: 'i1' },
  { id: 'e2.card', ep: 2, kind: 'card' },
  { id: 'e2.brief', ep: 2, kind: 'annex', time: 'day', story: 'brief2', tasks: [
    { at: 'navarre', label: 'Vance is in Navarre\'s office', verb: 'Talk to Vance', run: 'vance2' },
    { at: 'stairs', label: 'Get the payphone numbers', verb: 'Head out', final: true }] },
  { id: 'e2.car', ep: 2, kind: 'car', topics: 'car2' },
  { id: 'e2.payphones', ep: 2, kind: 'field', ref: 'payphones' },
  { id: 'e2.chase', ep: 2, kind: 'field', ref: 'chase' },
  { id: 'e2.box', ep: 2, kind: 'stage', room: 'box', system: 'box', ref: 'corey' },
  { id: 'e2.paper', ep: 2, kind: 'annex', time: 'night', story: 'paper2', tasks: [
    { at: 'evidence', label: 'Decode Corey\'s pager at the evidence cage', verb: 'Work the pager', run: 'cipher', done: () => Cipher.solvedCount('mem') >= 4 },
    { at: 'desk', label: 'Write the affidavit at your desk', verb: 'Write the affidavit', run: 'affidavit', done: () => !!STATE.affidavit && STATE.affidavit.submitted },
    { at: 'stairs', label: 'Judge Halloway\'s chambers', verb: 'To the courthouse', final: true }] },
  { id: 'e2.chambers', ep: 2, kind: 'stage', room: 'chambers', system: 'chambers', next: r => r && r.signed ? 'e2.i2' : 'e2.redo' },
  { id: 'e2.redo', ep: 2, kind: 'field', ref: 'fallback', next: 'e2.paper2' },
  { id: 'e2.paper2', ep: 2, kind: 'annex', time: 'night', story: 'paper2b', tasks: [
    { at: 'desk', label: 'Fix the affidavit', verb: 'Rewrite the affidavit', run: 'affidavit', done: () => !!STATE.affidavit && STATE.affidavit.submitted },
    { at: 'stairs', label: 'Back to chambers', verb: 'To the courthouse', final: true }], next: 'e2.chambers' },
  { id: 'e2.i2', ep: 2, kind: 'field', ref: 'i2' },
  { id: 'e3.card', ep: 3, kind: 'card' },
  { id: 'e3.up', ep: 3, kind: 'annex', time: 'day', story: 'up3', tasks: [
    { at: 'hal', label: 'Hal wants you in the wire room', verb: 'Talk to Hal', run: 'halTut' },
    { at: 'wire', label: 'Sit down at the wire', verb: 'Sit down', final: true }] },
  { id: 'e3.wire1', ep: 3, kind: 'stage', room: 'wire', system: 'wire', ref: 's1' },
  { id: 'e3.car', ep: 3, kind: 'car', topics: 'car3' },
  { id: 'e3.van', ep: 3, kind: 'field', ref: 'van' },
  { id: 'e3.major', ep: 3, kind: 'annex', time: 'dusk', story: 'major3', tasks: [
    { at: 'navarre', label: 'The Major is waiting in Navarre\'s office', verb: 'Face the Major', run: 'ops3' },
    { at: 'board', label: 'Put the package on the Board', verb: 'Work the Board', run: 'board', done: () => true },
    { at: 'wire', label: 'Back on the wire tonight', verb: 'Sit down', final: true }] },
  { id: 'e3.wire2', ep: 3, kind: 'stage', room: 'wire', system: 'wire', ref: 's2', next: () => F().wallOff ? 'e3.rook' : 'e3.easy' },
  { id: 'e3.rook', ep: 3, kind: 'stage', room: 'box', system: 'rookbox', ref: 'rook' },
  { id: 'e3.easy', ep: 3, kind: 'stage', room: 'backroom', system: 'scene', ref: 'easy' },
  { id: 'e3.i3', ep: 3, kind: 'field', ref: 'i3' },
  { id: 'e4.card', ep: 4, kind: 'card' },
  { id: 'e4.quiet', ep: 4, kind: 'annex', time: 'day', story: 'quiet4', tasks: [
    { at: 'navarre', label: 'The lines went quiet. See Navarre.', verb: 'Talk to Navarre', run: 'ops4' },
    { at: 'desk', label: 'Your phone is ringing', verb: 'Answer it', run: 'gloria' },
    { at: 'stairs', label: 'Tail Tee to the handout', verb: 'Head out', final: true }] },
  { id: 'e4.car', ep: 4, kind: 'car', topics: 'car4' },
  { id: 'e4.tail', ep: 4, kind: 'field', ref: 'tail' },
  { id: 'e4.trash', ep: 4, kind: 'field', ref: 'trash' },
  { id: 'e4.numbers', ep: 4, kind: 'annex', time: 'night', story: 'numbers4', tasks: [
    { at: 'ren', label: 'The subpoena came back. Ren has it.', verb: 'Read the returns', run: 'burners' },
    { at: 'board', label: 'Pin the burners to the people', verb: 'Work the Board', run: 'board', done: () => true },
    { at: 'wire', label: 'Up on the burners', verb: 'Sit down', final: true }] },
  { id: 'e4.wire3', ep: 4, kind: 'stage', room: 'wire', system: 'wire', ref: 's3' },
  { id: 'e4.kitchen', ep: 4, kind: 'stage', room: 'kitchen', system: 'kitchen', ref: 'pigeon' },
  { id: 'e4.i4', ep: 4, kind: 'field', ref: 'i4' },
  { id: 'e5.card', ep: 5, kind: 'card' },
  { id: 'e5.two', ep: 5, kind: 'annex', time: 'day', story: 'two5', tasks: [
    { at: 'navarre', label: 'Pruitt and the Deputy, on speaker', verb: 'Go in', run: 'ops5' },
    { at: 'stairs', label: 'It ends this week', verb: 'Head out', final: true }],
    next: () => F().coreyExposed ? 'e5.rescue' : F().path === 'B' ? 'e5.count' : 'e5.raid' },
  { id: 'e5.rescue', ep: 5, kind: 'field', ref: 'rescue', next: () => F().path === 'B' ? 'e5.count' : 'e5.raid' },
  { id: 'e5.raid', ep: 5, kind: 'field', ref: 'raid' },
  { id: 'e5.press', ep: 5, kind: 'field', ref: 'press', next: 'e5.i5' },
  { id: 'e5.count', ep: 5, kind: 'field', ref: 'count' },
  { id: 'e5.after', ep: 5, kind: 'annex', time: 'day', story: 'after5', tasks: [{ at: 'stairs', label: 'One last look at Ridley', verb: 'Leave', final: true }] },
  { id: 'e5.i5', ep: 5, kind: 'stage', room: 'booking', system: 'scene', ref: 'i5' },
  { id: 'e5.dawn', ep: 5, kind: 'field', ref: 'dawn', next: 'e5.montage' },
  { id: 'e5.montage', ep: 5, kind: 'montage' },
  { id: 'e5.credits', ep: 5, kind: 'credits' }
];
const BEATS = {}; BEAT_LIST.forEach(b => { BEATS[b.id] = b; });
const ORDER = BEAT_LIST.map(b => b.id);
// raid → press conference; count → the morning after → I5 (dawn) ; I5 → montage
BEATS['e5.raid'].next = 'e5.press'; BEATS['e5.count'].next = 'e5.after'; BEATS['e5.after'].next = 'e5.dawn'; BEATS['e5.i5'].next = 'e5.montage';
const EP_FIRST = { 1: 'e1.cold', 2: 'e2.card', 3: 'e3.card', 4: 'e4.card', 5: 'e5.card' };
/* ---- canonical states for episode select (§8.9) ---- */
function faces(st, ids) { for (const id of ids) { st.facts.push('face:' + id, 'name:' + id); st.evidence.push({ id: 'face:' + id, kind: 'photo', ref: id, pts: 1, text: 'Face photo of ' + nameOf(id), ep: 1 }); } }
const EP_PRESETS = {
  1: () => newState(),
  2: () => { const s = newState(); s.ep = 2; s.meters = { brass: 50, heat: 20, legal: 0, case: 24, fund: 180 }; faces(s, ['tee', 'rook', 'corey', 'pigeon']); s.facts.push('obs:pigeon:lookout', 'obs:tee:lieutenant', 'pocket:dre'); s.flags.pocketsMet = true; s.flags.ops1 = 'van'; s.board.pins = { lieutenant: 'tee', muscle: 'rook', stash: 'corey', lookout1: 'pigeon' }; return s; },
  3: () => { const s = EP_PRESETS[2](); s.ep = 3; s.meters = { brass: 60, heat: 25, legal: 0, case: 52, fund: 160 }; s.flags.wireUp = true; s.flags.coreyCI = false; s.flags.coreyPackage = true;
    for (const [k, n] of [['P1', '555-0187'], ['P2', '555-0143'], ['P3', '555-0129']]) s.numbers[k] = { n, known: true, tapped: true, user: k === 'P1' ? 'tee' : null };
    s.numbers.PG = { n: '555-0110', known: true, tapped: true, user: 'corey' }; s.facts.push('stmt:corey:code', 'stmt:corey:tee-lieutenant', 'stmt:corey:stash', 'num:P1:tee'); s.cipher.solved.cw = true; s.wire.voiceprints = ['tee', 'rook', 'corey', 'pigeon', 'odessa', 'tavon', 'dink']; return s; },
  4: () => { const s = EP_PRESETS[3](); s.ep = 4; s.meters = { brass: 55, heat: 45, legal: 10, case: 88, fund: 140 }; Object.assign(s.flags, { dilemma: 'stay', sweep: false, wallOff: true, rookFree: false, lossOn: 'tee', reupSpot: 'gas' });
    s.facts.push('plate:harstad', 'name:dale', 'name:sunday', 'num:P5:harstad', 'boss:?', 'place:mamab', 'face:dale'); s.cipher.solved.ccw = true; return s; },
  5: () => { const s = EP_PRESETS[4](); s.ep = 5; s.meters = { brass: 45, heat: 40, legal: 10, case: 112, fund: 120 }; Object.assign(s.flags, { burners: true, serials: true, pigeonTrust: 75, pigeonRunner: true, canary: false, momSafe: true });
    for (const [k, n, u] of [['B1', '555-0102', 'tee'], ['B2', '555-0115', 'lonnie'], ['B3', '555-0136', 'tavon'], ['B4', '555-0158', 'dale'], ['B5', '555-0190', 'pigeon']]) s.numbers[k] = { n, known: true, tapped: true, user: u };
    s.facts.push('count:thursday', 'garage:friday'); return s; }
};
