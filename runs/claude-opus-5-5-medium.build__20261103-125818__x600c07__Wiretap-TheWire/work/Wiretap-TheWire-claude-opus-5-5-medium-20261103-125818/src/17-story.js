// WIRETAP: the story, "The Case". Five episodes of beats (data), the Director that runs them (autosave at every beat,
// restart, episode select from canonical states), ops choices, car rides, episode cards, and the endings: a montage of
// cards picked by rules over the flags, the credits, and the Shut Down.
const EPIS = [
  null,
  { n: 1, title: 'Eyes On', epi: '"Everybody on that corner is working. Question is, who\'s signing the checks."', by: 'Lou Szabo' },
  { n: 2, title: 'Paper', epi: '"A judge doesn\'t care what you know. He cares what you can write down."', by: 'ASA Corinne Vance' },
  { n: 3, title: 'Up', epi: '"You don\'t listen to a phone. You listen to a man getting comfortable."', by: 'Hal Pettiford' },
  { n: 4, title: 'Dry Cleaning', epi: '"Smart ain\'t never being seen. Smart is being boring when they look."', by: 'Terrence Mabry' },
  { n: 5, title: 'The Count', epi: '"Every week the money gets counted. Every week somebody comes up short."', by: 'Darnell "Easy" Booker' }
];
const st = (label, act, o = {}) => Object.assign({ label, act }, o);
const room = (r, cast, run, o = {}) => Object.assign({ kind: 'room', room: r, cast, run }, o);
const BEATS = [
  { id: 'e1.cold', ep: 1, kind: 'field', m: 'cold', name: 'Cold open' },
  { id: 'e1.card', ep: 1, kind: 'card' },
  { id: 'e1.brief', ep: 1, kind: 'annex', name: 'The detail', car: 'case',
    brief: () => [['navarre', 'The Sun put Mr. Felton on page one. So now the Deputy Commissioner cares. Six weeks. One corner. Arrests.'], ['lou', 'Arrests. Not a case.'], ['navarre', 'He said arrests. I heard case. We\'ll see who\'s right. Detective Szabo, Homicide.'], ['lou', 'Formerly. I said something true at a retirement party.'],
      ['navarre', 'Detective Pettiford, pawn unit.'], ['hal', 'Thirteen years. Nobody complained, because nobody knew I was there.'], ['navarre', 'Officer Ocasio, on loan from Southwest.'], ['ren', "I brought my own camera. The department's has a crack in the lens."],
      ['navarre', 'Detective Whitlock, Western narcotics. She knows Ridley.'], ['dana', 'Ridley knows me. That might be the problem.'], ['navarre', "The Major wants bodies by Friday. I want to know who pays for that corner. We'll try to give him both."]],
    stations: { evidence: st('Take the camera', done => { toast('Camera, 30 shots', 'And $200 in the fund. Sign for it.'); done(); }, { required: true }),
      navarre: st('Ops: what do we ask for?', done => opsChoice(1, done), { required: true }), coffee: st('Coffee with Lou', done => Talk.run([['lou', 'My father used to say a man who counts his money in public wants you to see it. Watch who counts.']], done)) } },
  { id: 'e1.eyes', ep: 1, kind: 'field', m: 'eyes', name: 'Eyes on' },
  { id: 'e1.board', ep: 1, kind: 'annex', name: 'The Board', leave: 'Done for the day',
    brief: () => [['none', '(speakerphone)'], ['pruitt', "I've got a dead taxpayer on page one and a detail with no arrests, Lieutenant."], ['navarre', 'We have faces, Major.'], ['pruitt', 'Faces don\'t go on a stat sheet.']],
    stations: { board: st('The Board', done => Board.open({ done }), { required: true }), desk: st('Your desk', done => { game.saves.show && game.saves.show('save', done); }) } },
  { id: 'e1.i1', ep: 1, kind: 'field', m: 'tee', il: 'i1', name: 'Interlude: Tee', pre: 'tee1' },
  { id: 'e2.card', ep: 2, kind: 'card', start: () => meter('brass', -10 * DIFF().brass, 'Another week, no new stats') },
  { id: 'e2.brief', ep: 2, kind: 'annex', name: 'What a wire needs', car: 'daughter', extra: ['vance'],
    brief: () => [['vance', 'A wire needs three things. Numbers, probable cause on each one, and proof you tried everything else first.'], ['hal', "They don't carry cell phones. Payphones and pagers."], ['vance', "Then get me payphones and pagers. And don't you dare lie to Abner Halloway."]],
    stations: { navarre: st('Ops: the informant', done => opsChoice(2, done), { required: true }) } },
  { id: 'e2.phones', ep: 2, kind: 'field', m: 'phones', name: 'Payphones' },
  { id: 'e2.box', ep: 2, ...room('box', [['corey', 3.5, 1.9, Math.PI / 2, 'sit'], ['lou', 5.2, 3, Math.PI * .8], ['dana', 3.5, 3.4, -Math.PI / 2]], R => Box.open('corey', () => Director.complete())), name: 'The box' },
  { id: 'e2.paper', ep: 2, kind: 'annex', name: 'The paper', extra: ['vance'], leave: 'To the courthouse',
    brief: () => [['hal', "Corey's pager has five pages on it. Bring it to the cage. Somebody wrote those numbers in a code a twelve-year-old could break. Lucky for us, so can I. Mostly."]],
    stations: { evidence: st('Decode the pager', done => Cipher.open(PAGES_COREY, { done }), { required: true, label: 'Evidence cage: the pager', complete: () => STATE.cipher.decoded.length > 0, unfinished: 'Turn the keypad until a page matches a number you know.' }),
      desk: st('Write the affidavit', done => Paper.open((res, nec) => { Director.paperRes = [res, nec]; done(); }), { required: true, need: () => STATE.cipher.decoded.length > 0 }) } },
  { id: 'e2.chambers', ep: 2, ...room('chambers', [['halloway', 4, 1.3, Math.PI / 2], ['vance', 3, 3.2, -Math.PI / 2], ['dana', 5, 3.2, -Math.PI / 2]], R => { const [res, nec] = Director.paperRes || [Paper.lines().map(l => ({ id: l.id, p: 0, ok: false, picks: [] })), {}]; Paper.judge(res, nec, up => Director.complete(up ? 'up' : 'denied')); }), name: 'Chambers',
    next: r => r === 'denied' ? 'e2.more' : 'e2.i2' },
  { id: 'e2.more', ep: 2, kind: 'field', m: 'payact', name: 'One more photo', next: () => 'e2.paper' },
  { id: 'e2.i2', ep: 2, kind: 'field', m: 'tee', il: 'i2', name: 'Interlude: new stash' },
  { id: 'e3.card', ep: 3, kind: 'card', start: () => { if (FL().payphone === 'P3' && !STATE.wire.lines.P3) { meter('brass', -5, 'Hal has to amend for P3'); STATE.wire.lines.P3 = 'up'; } } },
  { id: 'e3.up', ep: 3, kind: 'annex', name: "We're up",
    brief: () => [['hal', "We're up. Rules: you get the first few seconds of every call. If it's a man ordering a pizza, you minimize. You spot-check now and then. If it turns, you stay."], ['hal', 'Key line, you log it while he\'s saying it. Not after you think about it. And you match voices to faces. Faces you heard talk in person.']],
    stations: { wire: st('Wire room: Session 1', done => Director.go({ kind: 'room', room: 'wire', cast: [['hal', 2.6, 2.4, -Math.PI / 2, 'sit'], ['dana', 3.6, 2.6, -Math.PI / 2, 'sit']], run: () => Wire.run('s1', () => Director.complete()) }), { required: true }) } },
  { id: 'e3.van', ep: 3, kind: 'field', m: 'van', name: 'The van' },
  { id: 'e3.major', ep: 3, kind: 'annex', name: 'The Major', extra: ['pruitt'],
    brief: () => [['pruitt', "I read the 24-hour reports, Lieutenant. You had a robbery happen in front of your van and you have nobody in handcuffs."], ['navarre', "We have a supplier, Major. A truck."], ['pruitt', 'I have a budget meeting.']],
    stations: { navarre: st('Ops: the Major wants bodies', done => opsChoice(3, done), { required: true }), board: st('The Board', done => Board.open({ done })) } },
  { id: 'e3.wire2', ep: 3, ...room('wire', [['hal', 2.6, 2.4, -Math.PI / 2, 'sit'], ['dana', 3.6, 2.6, -Math.PI / 2, 'sit']], () => Wire.run('s2', () => Director.complete())), name: 'Session 2' },
  { id: 'e3.rook', ep: 3, if: () => FL().wallOff, ...room('box', [['rook', 3.5, 1.9, Math.PI / 2, 'sit'], ['lou', 5.2, 3, Math.PI * .8], ['dana', 3.5, 3.4, -Math.PI / 2]], () => Box.open('rook', () => Director.complete())), name: 'Rook in the box' },
  { id: 'e3.easy', ep: 3, ...room('mamab', [['easy', 4.4, 2.4, Math.PI, 'sit'], ['lonnie', 5.6, 1.6, Math.PI * .8], ['tee', 2.6, 2.4, 0]], () => Talk.run(EASY_SCENE(), () => Director.complete())), name: "Mama B's" },
  { id: 'e3.i3', ep: 3, kind: 'field', m: 'tee', il: 'i3', name: 'Interlude: making it back' },
  { id: 'e4.card', ep: 4, kind: 'card', start: () => meter('heat', -5, null) },
  { id: 'e4.quiet', ep: 4, kind: 'annex', name: 'Quiet lines', car: 'orioles',
    brief: () => [['hal', 'The payphones went dead. All three. Nobody even picks up to say wrong number.'], ['dana', 'Throwaways.'], ['hal', 'Bought for cash, used a week, thrown in the harbor. But they come in boxes, and boxes have serial numbers, and the phone company sells serial numbers to anyone with a subpoena.'],
      FL().rookAfterSunday ? ['lou', 'Somebody shot up a hearse on Harlow last night. Nobody hit. The church lost a window.'] : null, () => { for (const k of ['P1', 'P2', 'P3']) STATE.numbers[k].dead = true; }].filter(Boolean),
    stations: { navarre: st('Ops: the subpoenas', done => opsChoice(4, done), { required: true }), coffee: st('Phone: your mother', done => Talk.run([['gloria', 'Somebody was asking about you at the market. A young man. Polite.'], ['dana', 'What did you tell him?'], ['gloria', 'That you were a good girl once.']], done, { phone: true })) } },
  { id: 'e4.tail', ep: 4, kind: 'field', m: 'tail', name: 'The tail' },
  { id: 'e4.trash', ep: 4, kind: 'field', m: 'trash', name: 'The trash' },
  { id: 'e4.numbers', ep: 4, kind: 'annex', name: 'Numbers',
    brief: () => [['hal', 'Subpoena came back. Twelve phones, five of them active. Halloway amended by phone.'], ['halloway', '(phone) Same rules, Detective.'], () => { const B = { B1: ['555-0102', 'tee'], B2: ['555-0115', 'lonnie'], B3: ['555-0136', FL().rookFree ? 'rook' : 'tavon'], B4: ['555-0158', 'dale'], B5: ['555-0190', 'pigeon'] }; for (const [k, [n, u]] of Object.entries(B)) STATE.numbers[k] = { n, known: true, user: u, dead: false }; addEvidence({ id: 'subpoena', kind: 'obs', text: 'Carrier records: five burners B1-B5' }); }],
    stations: { wire: st('Wire room: Session 3', done => Director.go({ kind: 'room', room: 'wire', cast: [['hal', 2.6, 2.4, -Math.PI / 2, 'sit'], ['dana', 3.6, 2.6, -Math.PI / 2, 'sit']], run: () => Wire.run('s3', () => Director.complete()) }), { required: true }), board: st('The Board', done => Board.open({ done })) } },
  { id: 'e4.kitchen', ep: 4, ...room('kitchen', [['pigeon', 3, 1.8, Math.PI / 2, 'sit'], ['odessa', 5, 1.9, Math.PI * .7], ['dana', 3, 3.3, -Math.PI / 2, 'sit']], () => Talk.run([['odessa', 'Sit, Dana Lynn. You can talk to him at my table. Not on my stoop.']], () => Box.open('pigeon', () => Director.complete()))), name: "Odessa's kitchen" },
  { id: 'e4.i4', ep: 4, kind: 'field', m: 'tee', il: 'i4', name: 'Interlude: throwaways' },
  { id: 'e5.card', ep: 5, kind: 'card' },
  { id: 'e5.two', ep: 5, kind: 'annex', name: 'Two ways', extra: ['pruitt'],
    brief: () => [['pruitt', "Friday. A table. Dope, guns, cash. The Deputy's bringing Channel 11."], ['navarre', 'Hit the re-up Friday, we get Mabry and a package. Wait for Thursday\'s count, we might get the man who owns the package.'], ['pruitt', '"Might" doesn\'t fit on a stat sheet, Lieutenant.'], ['lou', 'Neither does a soul-food restaurant with a check-cashing license. But it should.']],
    stations: { navarre: st('The call', done => opsChoice(5, done), { required: true }) }, next: () => FL().path === 'B' ? 'e5.count' : 'e5.raid' },
  { id: 'e5.raid', ep: 5, kind: 'field', m: 'raid', name: 'The raid', next: () => 'e5.press' },
  { id: 'e5.press', ep: 5, ...room('press', [['pruitt', 5, 1.6, Math.PI / 2], ['ostrowski' in CAST ? 'ostrowski' : 'navarre', 4, 1.6, Math.PI / 2], ['dana', 2, 3.2, -Math.PI / 2], ['lou', 1.4, 3, -Math.PI / 2]], () => Talk.run([['pruitt', 'Today the men and women of the Western District dealt a major blow to the drug trade in West Baltimore.'], ['lou', '(at the back) Major blow. They\'ll be open by Monday.']], () => Director.complete())), name: 'The podium', next: () => 'e5.i5' },
  { id: 'e5.count', ep: 5, kind: 'field', m: 'count', name: 'The count', next: () => 'e5.after' },
  { id: 'e5.after', ep: 5, ...room('office', [['navarre', 4, 1.3, Math.PI / 2], ['dana', 3, 3, -Math.PI / 2], ['vance', 5, 3, -Math.PI / 2]], () => Talk.run([['navarre', "The detail is disbanded. Anyway. The Deputy wanted a podium, not a case file."], ['vance', 'I\'m taking it to a grand jury. Eighteen months, Detective. If you\'re lucky.']], () => Director.complete())), name: 'The morning after' },
  { id: 'e5.i5', ep: 5, ...room('box', [['tee', 3.5, 1.9, Math.PI / 2, 'sit']], () => I5()), name: 'Interlude: the last choice' },
  { id: 'e5.end', ep: 5, kind: 'montage' }
];
const EASY_SCENE = () => [['easy', 'Sit down, Terrence.'], ['tee', "I'd rather stand."], ['easy', "I didn't ask what you'd rather."], ['easy', 'You lost my package to a man who drives a hearse.'], ['tee', 'Sunday hit the boy right after the drop. Nobody could\'ve—'],
  ['easy', "Somebody knew where the drop was. Somebody always knows. That's the cost of doing business outside."], ['easy', "You know why they call me Easy? Because I never make anything hard that doesn't have to be. Make it back, Terrence. By the count."],
  ['lonnie', 'And the phones.'], ['easy', 'The phones. Lonnie says you like the payphones.'], ['tee', "Payphones don't have names on 'em."], ['easy', 'Everything has a name on it. Stop using them.'], ['easy', '(after Tee leaves) He\'s smart. Smart gets you so far.']];
function I5() {
  if (FL().path === 'B') Talk.run([['tee', '(dawn. The corner. Nobody on it yet.)'], { who: 'tee', choices: ['Run', 'Stay'], pick: i => { FL().i5 = i ? 'stay' : 'run'; return []; } }], () => Director.complete());
  else Talk.run([['tee', '(Central Booking. A lawyer in a good suit.)'], ['man', 'Easy says your mother\'s rent is paid through spring.'], { who: 'tee', choices: ['Take the weight', 'Talk'], pick: i => { FL().i5 = i ? 'talk' : 'weight'; return []; } }], () => Director.complete());
}
/** the ops choices (Navarre's office), consequences spelled out */
function opsChoice(n, done) {
  const C2 = {
    1: { title: 'What do we ask the Major for?', cards: [{ title: 'Ask for the van', body: 'Ren drives a county van for the stakeout.', cost: 'Normal van heat' }, { title: 'Ask for overtime', body: 'An extra hour on every wire shift, one extra call each.', cost: 'The stakeout uses your Chevy: heat ×1.5' }], pick: i => { FL().ops1 = i ? 'ot' : 'van'; } },
    2: { title: 'Who backs up the payphones?', cards: [{ title: 'Use Pockets', body: 'Free. A drug addict\'s word counts only beside something direct.' }, { title: 'Pay Miss Pat at the market', body: 'A citizen witness: worth 2 points on P1 by herself.', cost: 'Fund −$100', locked: STATE.meters.fund < 100 ? 'Not enough in the fund' : null }], pick: i => { FL().ops2 = i ? 'pat' : 'pockets'; if (i) { meter('fund', -100, null); addEvidence({ id: 'stmt:pat', kind: 'stmt', text: 'Miss Pat: Tee uses the market payphone every afternoon' }); addFact('stmt:pat:tee', 2, true); } } },
    3: { title: 'The Major wants bodies', cards: [{ title: 'Give him bodies', body: 'A sweep of the corner. Twenty arrests by morning.', cost: 'Brass +25 · Heat +20 · the P1 line goes dead' }, { title: 'Hold the line', body: 'Tell him no.', cost: 'Brass −20' }], pick: i => { FL().sweep = !i; if (!i) { meter('brass', 25, 'Twenty bodies'); meter('heat', 20, 'The sweep'); STATE.numbers.P1.dead = true; } else meter('brass', -20 * DIFF().brass, 'You told the Major no'); } },
    4: { title: 'The burner subpoenas', cards: [{ title: 'Rush them', body: 'The Major likes speed.', cost: 'Legal +10 · Brass +5' }, { title: 'By the book', body: 'It takes as long as it takes.', cost: 'Brass −5' }], pick: i => { FL().ops4 = i ? 'book' : 'rush'; if (!i) { meter('legal', 10, 'Rushed paper'); meter('brass', 5, 'Fast work'); } else meter('brass', -5, 'Slow work'); } },
    5: { title: 'Friday or Thursday?', cards: [{ title: 'A · Dope on the table', body: 'Raid the garage Friday at nine. Mabry and a package.', cost: 'Brass +40 if it works' },
      { title: 'B · Follow the money', body: 'Thursday\'s count at Mama B\'s. The man who owns the package.', locked: STATE.meters.brass < 30 ? 'The Major\'s patience is too low (Brass < 30)' : !((FL().coreyCI && !FL().coreyExposed) || FL().pigeonTrust >= 70) ? 'You need someone inside: a CI, or Pigeon\'s trust' : null }], pick: i => { FL().path = i ? 'B' : 'A'; } }
  }[n];
  UI.cards({ kicker: "NAVARRE'S OFFICE · OPS CHOICE", title: C2.title, cards: C2.cards, pick: i => { C2.pick(i); done(); } });
}
const CAR = {
  case: [['lou', 'You think the old man knew what he was doing? Calling it in three times?'], ['dana', 'He knew. He drove that street for thirty years. He thought somebody would listen.'], ['lou', 'Somebody did.']],
  daughter: [['dana', 'How\'s your daughter?'], ['lou', 'Sends me pictures of the baby. I send her pictures of the Orioles losing. It\'s a relationship.']],
  orioles: [['lou', 'You know what\'s wrong with the Orioles?'], ['dana', 'The bullpen.'], ['lou', 'The bullpen is tired. Everybody says no bullpen. They got a bullpen. It\'s tired.']]
};
const Director = {
  i: 0, beats: BEATS,
  beat() { return BEATS[this.i] || BEATS[0]; },
  find(id) { return BEATS.findIndex(b => b.id === id); },
  /** begin a beat: autosave, the ep number, then its scene */
  start(id, o = {}) {
    let i = typeof id === 'number' ? id : this.find(id); if (i < 0) i = 0;
    while (BEATS[i] && BEATS[i].if && !BEATS[i].if()) i++;
    this.i = i; const b = BEATS[i]; STATE.beat = b.id; STATE.ep = b.ep;
    if (b.start && !o.restart) b.start();
    if (!o.noSave && !Attract.on && b.kind !== 'card' && b.kind !== 'montage') { this.snapshot = JSON.stringify(STATE); try { game.saves.autosave(); } catch (e) {} }
    this.go(b);
  },
  go(b) {
    if (b.kind === 'field') game.go('field', { m: b.m, il: b.il, seed: 11 + b.ep });
    else if (b.kind === 'card') game.go('card', { ep: b.ep });
    else if (b.kind === 'annex') game.go('annex', {});
    else if (b.kind === 'room') game.go('room', { room: b.room, cast: b.cast, run: b.run, title: b.name });
    else if (b.kind === 'montage') game.go('montage', {});
  },
  complete(res) {
    if (Attract.on) return;
    const b = this.beat(); STATE.done[b.id] = true; Music.sting('beatDone');
    if (STATE.meters.brass <= 0) return this.shutdown();
    const nx = b.next ? b.next(res) : null;
    if (nx) return this.start(nx);
    if (this.i + 1 < BEATS.length) this.start(this.i + 1);
  },
  restartBeat() { if (this.snapshot) STATE = JSON.parse(this.snapshot); UI.closeAll(); Talk.skip(); this.start(this.i, { restart: true, noSave: true }); },
  toEpisodes() { UI.closeAll(); Talk.skip(); game.go('title', { episodes: true }); },
  newGame() { STATE = freshState(); for (const k in PHOTO_IMG) delete PHOTO_IMG[k]; this.start(0); },
  car(topic, done) { game.go('room', { room: 'car', title: 'The Chevy', run: () => { const t = [['lou', 'Talk or drive?'], { who: 'dana', choices: ['Talk', 'Just drive'], pick: i => i ? [] : (CAR[topic] || CAR.case) }]; Talk.run(t, done); } }); },
  shutdown() { if (this.shut) return; this.shut = true; game.go('shutdown', {}); },
  objectiveText() {
    const b = this.beat(), f = FD.m && game.sceneName === 'field' && FD.m.objective ? FD.m.objective(FD) : null;
    return { title: f ? f.title : b.name || ('Episode ' + b.ep), text: f ? f.text || '' : 'Episode ' + b.ep + ': ' + EPIS[b.ep].title, list: [
      'Case strength ' + STATE.meters.case + ' · Major\'s patience ' + STATE.meters.brass, FL().wireUp ? 'The wire is up on ' + Object.keys(STATE.wire.lines).join(', ') : 'No wire yet', FL().pocketsMet ? 'Pockets: Dre broke his ankle at the old Arundel station fence.' : null].filter(Boolean) };
  },
  /** episode select: canonical states */
  preset(ep) {
    STATE = freshState(); const f = STATE.flags, m = STATE.meters;
    const faces = () => { for (const id of CREW4) { addFact('face:' + id, 0, true); addFact('name:' + id, 0, true); } addFact('obs:tee:lieutenant', 0, true); addFact('obs:pigeon:lookout', 0, true); f.pocketsMet = true; f.dreLine = true; STATE.stats.photos = 8; addEvidence({ id: 'stmt:pockets', kind: 'stmt', text: 'Pockets: names to the shoes (4/4)' }); addFact('stmt:pockets:crew', 0, true); };
    if (ep >= 2) { faces(); m.heat = 20; m.brass = 50; }
    if (ep >= 3) { for (const k of ['P1', 'P2', 'P3', 'PG']) STATE.numbers[k].known = true; STATE.wire.lines = { P1: 'up', P2: 'up', PG: 'up' }; f.wireUp = true; addEvidence({ id: 'pager', kind: 'seizure', text: "Corey's pager, label 555-0110", direct: true }); addFact('stmt:corey:code', 0, true); addFact('seized:pager', 0, true); m.heat = 25; m.brass = 60; m.case = 40; }
    if (ep >= 4) { f.dilemma = 'stay'; f.sweep = false; f.wallOff = true; f.rookFree = false; addFact('plate:harstad', 0, true); addFact('int:mamab', 0, true); addFact('int:boss', 0, true); STATE.cipher.dir = 'ccw'; m.heat = 45; m.brass = 55; m.case = 70; }
    if (ep >= 5) { for (const k of ['P1', 'P2', 'P3']) STATE.numbers[k].dead = true; f.pigeonTrust = 75; addFact('int:garage', 0, true); addFact('int:count', 0, true); f.serials = true; m.heat = 40; m.brass = 45; m.case = 95; }
    STATE.ep = ep; this.start(BEATS.findIndex(b => b.ep === ep));
  }
};

/* ---- the episode card ---- */
const Card = {
  enter(d) { this.ep = EPIS[d.ep]; this.t = 0; Music.play(null); try { game.audio.sting(SONGS.theme, {}); } catch (e) {} game.lights.enabled = false; game.weather = null; if (ui) ui.hud({}); Amb.set([]); },
  update(dt) { if (Globals.tick(dt)) return; this.t += dt; if ((this.t > 2 && game.input.pressed('confirm')) || this.t > 7.5) Director.complete(); },
  draw(r) {
    r.sky(['#000000', '#000000', '#060606']); const e = this.ep, a = clamp(this.t / 1.2, 0, 1), y = Math.round(r.H / 2) - 40;
    r.overlay(g => {
      if (this.t < 1.6) E.font.title(g, 'WIRETAP', r.W / 2, y - 10, { scale: 3, align: 'center', colors: ['#fff6dc', '#ffcf7a', '#e08a2a'], depth: 2, depthColor: '#3a1a0a' });
      else { E.font.text(g, 'EPISODE ' + e.n, r.W / 2, y, '#9a9080', { align: 'center', outline: false }); E.font.text(g, e.title.toUpperCase(), r.W / 2, y + 14, '#f2ead8', { align: 'center', scale: 2, outline: false });
        E.font.wrap(e.epi, Math.min(r.W - 40, 280)).forEach((l, i) => E.font.text(g, l, r.W / 2, y + 46 + i * 10, '#e9dcb5', { align: 'center', outline: false })); E.font.text(g, '— ' + e.by, r.W / 2, y + 52 + E.font.wrap(e.epi, Math.min(r.W - 40, 280)).length * 10, '#9a9080', { align: 'center', outline: false }); }
    });
  }
};

/* ---- the endings: 14 cards by rules (App. G), each a vignette at a place ---- */
function montageCards() {
  const f = FL(), path = Director.shutFlag ? 'S' : f.path || 'A', band = STATE.meters.case >= 120 ? 'high' : STATE.meters.case >= 60 ? 'mid' : 'low', i5 = f.i5;
  const pick = rows => (rows.find(r => r[0]()) || [null, ''])[1];
  return [
    ['corner', [30, 32], 'The corner at Gaither & Ridley: open for business by Monday.'],
    ['tee', [30, 31], pick([[() => path === 'A' && i5 === 'weight' && f.teeShort, 'Terrence Mabry: pleaded to twelve years. Easy stopped paying his mother\'s rent in March.'], [() => path === 'A' && i5 === 'weight' && band === 'high', 'Terrence Mabry: pleaded to twelve years. Never said Easy\'s name.'], [() => path === 'A' && i5 !== 'talk', 'Terrence Mabry: pleaded to six years. Out in four. Never said Easy\'s name.'], [() => path === 'A', 'Terrence Mabry: agreed to testify. Moved to a prison in Pennsylvania under another name.'], [() => path === 'B' && i5 === 'stay' && f.teeShort, 'Terrence Mabry: cut loose by Easy, then indicted. Testified against him.'], [() => path === 'B' && i5 === 'stay', 'Terrence Mabry: indicted with Darnell Booker eighteen months later.'], [() => path === 'B', 'Terrence Mabry: last seen boarding a Greyhound to Charlotte.'], [() => true, 'Terrence Mabry: runs three corners now.']])],
    ['easy', [46, 26], pick([[() => path === 'B' && band === 'high', 'Darnell Booker: arrested at Mama B\'s on a Thursday. The count was light.'], [() => path === 'B', 'Darnell Booker: indicted. The case is still in discovery.'], [() => path === 'A', 'Darnell Booker: opened a second check-cashing store on Cathedral Row.'], [() => true, 'Darnell Booker: sponsored the church\'s back-to-school drive.']])],
    ['pigeon', [35.5, 36.5], pick([[() => f.lossOn === 'pigeon' && f.rookFree && path === 'A', 'Nobody has seen Junior Hollis since October. His grandmother still feeds the birds.'], [() => f.lossOn === 'pigeon', 'Junior Hollis: back on the roof. The birds are gone.'], [() => f.pigeonTrust >= 70 || path === 'B', 'Junior Hollis: started ninth grade at a school in the county. Still keeps one bird.'], [() => true, 'Junior Hollis: running for Tavon now. Fourteen.']])],
    ['corey', [28, 36], pick([[() => f.coreyCI && !f.coreyExposed, 'Corey Lyle: moved to an aunt\'s in Richmond. Calls Detective Whitlock on her birthday.'], [() => f.coreyCI && f.coreyExposed && f.coreyRescued, 'Corey Lyle: relocated by the State\'s Attorney. Testified for two days.'], [() => f.coreyCI && f.coreyExposed, 'Corey Lyle: found in a vacant on Harlow Street. No witnesses.'], [() => true, 'Corey Lyle: serving five years for possession with intent.']])],
    ['rook', [31, 33], f.wallOff ? 'Ricky Batts: eight years on a gun charge from a taillight stop.' : 'Ricky Batts: shot in December over a parking space. His son got the shoes.'],
    ['sunday', [62, 48], { stay: 'Royal Odom: still drives the hearse. Still doesn\'t work Sundays.', call: 'Royal Odom: robbed a Hurricane stash in November. Nobody called it in.', go: 'Royal Odom: sent Detective Whitlock a card at Christmas. No return address.' }[f.dilemma || 'stay']],
    ['pruitt', [10.5, 2], 'Maj. Leland Pruitt: promoted to Colonel, Administrative Bureau.'],
    ['dana', [22.5, 29], { A: 'Dana Whitlock: back in Western narcotics. Drives past the corner every day.', B: "Dana Whitlock: assigned to the State's Attorney's money task force.", S: 'Dana Whitlock: back in uniform on the midnight shift.' }[path] + (f.momSafe ? ' Her mother moved to the county in November.' : '')],
    ['lou', [30, 39], path === 'S' ? 'Lou Szabo: retired. Took up fishing. Hates fishing.' : 'Lou Szabo: back in Homicide. Fourteen open cases on the board.'],
    ['ren', [58, 45], 'Renata Ocasio: transferred to the Tactical Section. Kept the camera.'],
    ['navarre', [64, 26], path === 'A' ? 'Gil Navarre: promoted to captain.' : 'Gil Navarre: passed over for captain.'],
    ['hal', [3, 2], 'Hal Pettiford: kept the wire room. Nobody told him to leave.'],
    ['harstad', [64, 52], "Glenn Harstad: guest of honor at State Senator Marian Ocheltree's harbor fundraiser."]
  ];
}
const Montage = {
  pausable: false, view: 'iso', views: ['iso'],
  enter() { this.cards = montageCards(); this.i = 0; this.t = 0; Music.play('montage'); World.setMood('dusk'); Amb.set(['street']); if (ui) ui.hud({}); this.who = null; this.pose(); },
  pose() { const c = this.cards[this.i]; if (!c) return; const p = C(c[1][0], c[1][1]); this.at = p; this.who = CAST[c[0]] ? new Agent({ id: 'm' + this.i, person: c[0], x: p.x + 10, y: p.y + 10 }) : null; if (this.who) this.who.facing = Math.PI / 2; },
  update(dt) {
    if (Globals.tick(dt)) return; this.t += dt; if (this.who) this.who.update(dt);
    if (this.t > 6 || (this.t > 1 && game.input.pressed('confirm'))) { this.i++; this.t = 0; if (this.i >= this.cards.length) { STATE.finished = true; E.store.set('wiretap:finished', 1); game.go('credits', {}); return; } this.pose(); }
    if (this.at) game.focus(this.at.x + Math.sin(this.t * .2) * 8, this.at.y, 20);
  },
  draw(r) {
    if (this.at && this.cards[this.i][0] !== 'pruitt' && this.cards[this.i][0] !== 'hal') { World.draw(r); if (this.who) this.who.draw(r); }
    else r.sky(['#0a0a0c', '#141418', '#1a1a1e']);
    const c = this.cards[this.i]; if (!c) return; const a = this.t;
    r.overlay(g => { const bh = Math.round(r.H * .14); px.rect(g, 0, 0, r.W, bh, '#000'); px.rect(g, 0, r.H - bh, r.W, bh, '#000');
      if (!this.who || !this.at || c[0] === 'pruitt' || c[0] === 'hal') { const pid = CAST[c[0]] ? c[0] : c[0] === 'harstad' ? 'dale' : null; if (pid) rigOf(pid).drawPortrait(g, Math.round(r.W / 2) - 32, Math.round(r.H / 2) - 40, 64, { zoom: 1, bg: '#141418' }); }
      const lines = E.font.wrap(c[2], Math.min(r.W - 30, 300)); lines.forEach((l, j) => E.font.text(g, l, r.W / 2, r.H - bh + 4 + j * 10, '#f2ead8', { align: 'center', outline: false }));
      if (this.i === this.cards.length - 1 && a > 3) E.font.text(g, 'TO BE CONTINUED', r.W / 2, bh + 6, '#ffb347', { align: 'center', scale: 2, outline: false }); });
  }
};
const Credits = {
  enter() { this.t = 0; Music.play('theme'); if (ui) ui.hud({}); game.lights.enabled = false; game.weather = null; },
  update(dt) { if (Globals.tick(dt)) return; this.t += dt; if (this.t > 34 || (this.t > 2 && game.input.pressed('confirm'))) game.go('title', {}); },
  draw(r) { r.sky(['#000', '#050505', '#0a0a0a']); const L = CREDITS.roll || []; r.overlay(g => { L.forEach((l, i) => { const y = Math.round(r.H + i * 14 - this.t * 22); if (y > -10 && y < r.H + 10) E.font.text(g, l, r.W / 2, y, i % 4 === 0 ? '#ffb347' : '#e8e4dc', { align: 'center', outline: false }); }); }); }
};
const Shutdown = {
  enter() { Music.play('montage'); this.t = 0; if (ui) ui.hud({}); game.lights.enabled = false; Director.shutFlag = true;
    Talk.run([['navarre', 'Detail 9 is disbanded, effective Monday.'], ['navarre', 'Pack your desk, Dana. The Major got his number. It just wasn\'t ours.']], () => UI.cards({ kicker: 'SHUT DOWN', title: 'The detail is done.', cards: [{ title: 'Retry from the last autosave', body: 'Back to the start of the last part.' }, { title: 'See how it ends', body: 'The Shut Down montage.' }],
      pick: i => { Director.shut = false; if (i === 0) { Director.shutFlag = false; Director.restartBeat(); } else game.go('montage', {}); } })); },
  update(dt) { if (Globals.tick(dt)) return; if (Talk.open) { Talk.update(dt); return; } if (UI.update(dt)) return; Talk.update(dt); },
  draw(r) { r.sky(['#0a0806', '#141010', '#1a1614']); r.overlay(g => { px.rect(g, Math.round(r.W / 2) - 40, Math.round(r.H / 2) - 10, 30, 20, '#8a6a4a'); px.rect(g, Math.round(r.W / 2) + 5, Math.round(r.H / 2) - 4, 30, 14, '#7a5a3a'); rigOf('navarre').drawPortrait(g, Math.round(r.W / 2) - 16, Math.round(r.H / 2) - 60, 40, {}); }); Talk.draw(r); }
};

/* ---- a short extra field beat when the judge says no: one more act at a payphone ---- */
MISSIONS.payact = {
  place: 'Ridley Avenue', mood: 'day', clock: ['14:00', '16:00'], clockRate: .4, start: [24, 30.4], civilians: 12, corner: { rate: .12 },
  setup(F) { coverInteracts(F); F.corner.crew.lieutenant.phoneT = 8; },
  intro: () => [['vance', 'One photograph. Him, on that phone, in the act. Then we go back to Halloway.']],
  onPhoto(F, ph, t) { if (ph.tags.includes('act:payphone')) Talk.run([['dana', "That's him on the phone. Clear as day."]], () => finish()); },
  objective: F => ({ step: 'EP2 · MORE PAPER', title: 'Photograph Tee using the payphone', text: 'Caught in the act: three stars', at: C(...POI.P1) })
};
