/* 31-data-annex: the detail's office above the impound lot. Station spots (App. B), the scenes that play when you walk
   in (ANNEX_STORY), what a task runs (ANNEX_RUN), and the car rides between places (CAR_TOPICS). */
const ANNEX_SPOTS = { board: [10.5, 1.9], navarre: [18.5, 3.4], wire: [3, 2.6], evidence: [3, 7], coffee: [18.5, 7.3], hal: [13.5, 7.5], ren: [7.5, 7.5], desk: [7.5, 3.7], stairs: [10.5, 8.5] };
const STATION_NAME = { board: 'The Board', navarre: 'Lt. Navarre\'s office', wire: 'The wire room', evidence: 'Evidence cage', coffee: 'Coffee', hal: 'Hal\'s bench', ren: 'Ren\'s desk', desk: 'Your desk', stairs: 'Stairs' };
const ANNEX_STORY = {
  brief1: [['navarre', 'The Sun put Mr. Felton on page one. So now the Deputy Commissioner cares. Six weeks. One corner. Arrests.'], ['lou', 'Arrests. Not a case.'],
    ['navarre', 'He said arrests. I heard case. We\'ll see who\'s right. Detective Szabo, Homicide.'], ['lou', 'Formerly. I said something true at a retirement party.'],
    ['navarre', 'Detective Pettiford, pawn unit.'], ['hal', 'Thirteen years. Nobody complained, because nobody knew I was there.'], ['navarre', 'Officer Ocasio, on loan from Southwest.'],
    ['ren', 'I brought my own camera. The department\'s has a crack in the lens.'], ['navarre', 'Detective Whitlock, Western narcotics. She knows Ridley.'], ['dana', 'Ridley knows me. That might be the problem.'],
    ['navarre', 'The Major wants bodies by Friday. I want to know who pays for that corner. We\'ll try to give him both.'], () => { if (tip('annex')) Tut.say('The Annex', 'Lit stations have something for you. Walk up and press ' + Prompts.label('interact') + ', or click one. Your desk is where you save.'); }],
  board1: [['lou', 'Faces on the Board. Names under the faces. That\'s the whole job, the first month.'], () => { Snd.play('phonering'); }, ['pruitt', 'Lieutenant. I\'ve got a dead taxpayer on page one and a detail with no arrests.'], ['navarre', 'Major, we\'re three days in.'], ['pruitt', 'Then you\'re three days late.'], ['lou', 'He\'s a peach.']],
  brief2: [['hal', 'They don\'t carry cell phones on that corner. Payphones and pagers. Old school.'], ['vance', 'Then that\'s what I need. Numbers, probable cause, and a reason you can\'t just keep watching. In writing.']],
  paper2: [['lou', 'Corey\'s pager has five pages in the memory. Hal\'s been staring at them for an hour.'], ['hal', 'Pager codes on a corner are never hard. They\'re a habit.']],
  paper2b: [['vance', 'One more photo and a cleaner affidavit. He told you what he wants.']],
  up3: [['hal', 'We\'re up. Pull a chair. I\'ll show you how this works, and how it doesn\'t.']],
  major3: [() => { if (F().dilemma === 'go') return [['ren', 'The van\'s burned. Every kid on Ridley has the plate memorized.']]; }, ['navarre', 'He\'s here. In person. Smile.']],
  quiet4: [['hal', 'The payphones went dead. All of them, same night.'], ['lou', 'Throwaways. Bought for cash, used a week, thrown in the harbor.'], ['hal', 'Somebody has to buy them somewhere. Somebody has to hand them out.'],
    () => { if (F().rookFree && !F().wallOff) return [['lou', 'Somebody shot up a hearse on Harlow last night. Nobody hit. The church lost a window.']]; }],
  numbers4: [['ren', 'Subpoena came back on those boxes. Five phones, five numbers.']],
  two5: [['pruitt', 'Friday. A table. Dope, guns, cash. The Deputy\'s bringing Channel 11.'], ['navarre', 'Hit the re-up Friday, we get Mabry and a package. Wait for Thursday\'s count, we might get the man who owns the package.'],
    ['pruitt', '"Might" doesn\'t fit on a stat sheet, Lieutenant.'], ['lou', 'Neither does a soul-food restaurant with a check-cashing license. But it should.']],
  after5: [['navarre', 'The detail is disbanded anyway. The Deputy wanted a podium, not a case file.'], ['vance', 'I\'m taking it to a grand jury. Eighteen months, Detective. If you\'re lucky.'], ['dana', 'I\'ve been lucky before. It felt like this.']]
};
const ANNEX_RUN = {
  camera1: done => Talk.play([['ren', 'One camera, thirty shots, and two hundred dollars in the fund. Sign here, here, and here.'], ['ren', 'Hold it on somebody and they feel it. Don\'t stare at the lookouts.']], () => { STATE.meters.fund = Math.max(STATE.meters.fund, 200); done(); }),
  ops1: done => Talk.play([['navarre', 'I can get you one thing out of the Major. One.']], () => Ops.choose(1, () => done())),
  board: done => Board.open({ onClose: () => done() }),
  vance2: done => Talk.play([['vance', 'A wire needs three things: the numbers, probable cause on each number, and necessity: why ordinary police work won\'t do it.'], ['vance', 'Get me the payphone numbers. Get me somebody on those phones.']], () => Ops.choose(2, () => done())),
  cipher: done => { if (!STATE.numbers.P1) Toast('No numbers', 'Read the payphone numbers first.'); Cipher.open(['m1', 'm2', 'm3', 'm4', 'm5'], { onClose: () => done() }); },
  affidavit: done => Paper.open(() => done()),
  halTut: done => Talk.play([['hal', 'Every call, you get a few seconds to decide if it\'s ours. That\'s the law, not me.'], ['hal', 'Grandmothers, girlfriends, cab companies: minimize. The judge reads the logs.'],
    ['hal', 'Minimized, you can peek every ten seconds for three. Calls turn. People get comfortable.'], ['hal', 'When a man says something that matters, log it while he says it. Not later. Later is a story.'],
    ['hal', 'Voices you met in person, you can match. Pages come in on the clone. And when it\'s quiet, hold the fast button. I\'ll wake you.']], () => done()),
  ops3: done => Talk.play([['pruitt', 'Lieutenant, I don\'t read affidavits. I read the stat sheet. Yours is empty.'], ['pruitt', 'You want to listen to phones? Listen. But give me six bodies by Friday or I give you back to patrol.']], () => Ops.choose(3, () => { addFact('reup:gas', true); done(); })),
  ops4: done => Talk.play([['navarre', 'Throwaways. Vance can subpoena the carrier once you know which phones. The boxes have serial numbers.']], () => Ops.choose(4, () => done())),
  gloria: done => Talk.play([['gloria', 'Dana? Somebody was asking about you at the market. A young man. Polite.'], ['dana', 'What did you tell him?'], ['gloria', 'That my daughter is a schoolteacher in Towson.'], ['dana', 'Good. Keep saying it.']], () => done()),
  burners: done => {
    for (const [k, n, u] of [['B1', '555-0102', 'tee'], ['B2', '555-0115', 'lonnie'], ['B3', '555-0136', F().rookFree ? 'rook' : 'tavon'], ['B4', '555-0158', 'dale'], ['B5', '555-0190', 'pigeon']]) STATE.numbers[k] = { n, known: true, tapped: true, user: u };
    addFact('name:lonnie'); addFact('name:easy'); addFact('num:B1:tee'); F().burners = true; F().amended = true;
    addEvidence({ id: 'serials:burners', kind: 'seizure', ref: 'tee', pts: 1, text: 'Carrier returns on twelve serial numbers: five phones active on Ridley' });
    Talk.play([['ren', 'B2 was bought by a Lonnie Fitch. Lonnie Fitch drives for Darnell Booker. Mama B\'s, the check-cashing place.'], ['lou', 'Easy Booker. I knew his uncle. His uncle was easy too, till he wasn\'t.'], () => { Snd.play('phonering'); }, ['halloway', 'Same rules, Detective. Same judge. Same logs.']], () => done());
  },
  ops5: done => Ops.choose(5, () => done())
};
/* idle talk at each station when no task waits there */
const STATION_IDLE = {
  coffee: () => [['lou', pick(RNG.cos, ['My father used to say, the coffee in a police station is a confession. Everybody gives it up eventually.', 'Orioles traded the only reliever who could throw strikes. That\'s the city in one sentence.', 'You eat? You should eat. Nobody does good police on an empty stomach.'])], ...hintLines()],
  hal: () => [['hal', pick(RNG.cos, ['This Zenith is from 1962. Every tube still good. They don\'t build them like this, Dana.', 'You recognize a voice by the vowels, not the words. Words lie. Vowels don\'t.', 'A wire is a slow thing. You sit, you listen, you wait for a man to forget he\'s on the phone.'])]],
  ren: () => [['ren', pick(RNG.cos, ['Prints of everything you shot are on the corkboard. The blurry ones too. I don\'t judge.', 'If you want the van, ask nicely. It has a heater now. Sometimes.', 'Thirty shots a roll. Spend them on hands, not faces. Faces we can get anywhere.'])]],
  navarre: () => [['navarre', 'The Major\'s patience is ' + (STATE.meters.brass >= 60 ? 'holding.' : STATE.meters.brass >= 30 ? 'thinning.' : 'about gone. Give me something.')]],
  evidence: () => { Evidence.open(); return null; },
  desk: () => { game.saves.canSave = true; game.saves.show('save'); return null; },
  board: () => { Board.open(); return null; },
  wire: () => [['hal', F().wireUp ? 'Line\'s quiet. Come back when there\'s a shift.' : 'No wire yet. Get me a judge.']],
  stairs: () => [['dana', 'Not yet.']]
};
function hintLines() {
  if (!game.settings.hints) return [];
  const b = Director.beat; if (!b || !b.tasks) return [];
  const t = b.tasks.find(x => !Annex.taskDone(x)); return t ? [['lou', 'Next thing: ' + t.label.toLowerCase() + '.']] : [];
}
/* ---- the evidence cage: photos large, items, decoded pages ---- */
const Evidence = {
  open() {
    let pg = 0; const items = () => STATE.evidence.slice().reverse();
    const s = UI.open({ id: 'evidence', html: () => { const it = items(), sl = it.slice(pg * 6, pg * 6 + 6);
      return `<div class="panel file"><div class="kicker">Evidence cage · ${it.length} items</div><h1>Evidence</h1><div class="grid">${sl.map(e => { const ph = e.photo && STATE.photos.find(p => p.id === e.photo); return `<div class="item">${ph ? `<div style="width:8em;margin-bottom:.4em">${polaroidHTML(ph)}</div>` : ''}<b>${esc(e.kind.toUpperCase())}</b><small>${esc(e.text)}</small></div>`; }).join('') || '<p>The cage is empty.</p>'}</div>
      ${it.length > 6 ? `<p class="muted">Page ${pg + 1} / ${Math.ceil(it.length / 6)}</p>` : ''}${STATE.cipher && Object.keys(STATE.cipher.decoded).length ? `<p><b>Pages:</b> ${Object.values(STATE.cipher.decoded).map(esc).join(' · ')}</p>` : ''}</div>`; },
      legend: [['tabPrev', 'Page'], ['tabNext', 'Page'], ['cancel', 'Close']], onTab: d => { pg = clamp(pg + d, 0, Math.max(0, Math.ceil(items().length / 6) - 1)); UI.render(s); }, onSelect: () => {} });
  }
};
/* ---- the car: Dana and Lou in a beige Lumina, a city going by (topics as choices; ○ skips) ---- */
const CAR_TOPICS = {
  car1: [{ label: 'The case', lines: [['dana', 'Felton called that corner in three times. Name and address, every time.'], ['lou', 'And somebody downtown answers the phone and somebody on Ridley hears about it by lunch. That\'s your case. Not the corner. The leak.']] },
    { label: 'Lou\'s daughter', lines: [['dana', 'How\'s your daughter?'], ['lou', 'Pharmacy school. She calls me on Sundays to ask if I\'m eating. I lie.']] },
    { label: 'The Orioles', lines: [['lou', 'You know what\'s worse than losing? Losing slow. Every summer since I was a kid.'], ['dana', 'You still go.'], ['lou', 'Of course I still go.']] }],
  car2: [{ label: 'The judge', lines: [['lou', 'Halloway. He reads every log. Every one. He\'s the only judge in the building who does.'], ['dana', 'Good.'], ['lou', 'Good till it\'s your log.']] },
    { label: 'Felton', lines: [['dana', 'Homicide closed Felton yet?'], ['lou', 'It\'s open. It\'ll stay open. Open is where they put the ones nobody\'s paying to close.']] },
    { label: 'Your mother', lines: [['lou', 'Your mother still on Ridley?'], ['dana', 'Over by the church. Forty years. She won\'t move.'], ['lou', 'Mine wouldn\'t either. That\'s what makes them mothers.']] }],
  car3: [{ label: 'The van', lines: [['lou', 'Vans are funny. Park one on a block two days and every kid knows the plate. Park it three and they name it.']] },
    { label: 'Hal', lines: [['dana', 'Hal was in the pawn unit thirteen years.'], ['lou', 'Thirteen years of reading serial numbers off stolen TVs. Best training in the department for a wire. Nobody knows it but him.']] }],
  car4: [{ label: 'Dry cleaning', lines: [['lou', 'A careful man walks a route to see who walks it with him. Doubles back, stops at windows, looks at reflections.'], ['lou', 'When he stops, you don\'t stop. You keep walking or you find something to lean on. And when he turns, I take him.']] },
    { label: 'Pigeon', lines: [['dana', 'The kid on the roof is fourteen.'], ['lou', 'Fourteen\'s old on that corner. That\'s the problem.']] }]
};
