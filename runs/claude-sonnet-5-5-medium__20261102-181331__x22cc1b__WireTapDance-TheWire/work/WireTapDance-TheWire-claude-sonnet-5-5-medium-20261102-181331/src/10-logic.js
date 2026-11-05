/* ============================================================================
 * WIRE TAP DANCE  ·  case logic (pure rules: no engine, no drawing; tested on its own)
 * ========================================================================== */
const TITLE = 'WIRE TAP DANCE';
const STAGES = ['brief', 'surveil', 'tip', 'wire', 'listen', 'chase', 'box', 'report', 'done'];
const CREW = { lorne: 'Big Lorne', sweets: 'Sweets', dray: 'Dray' };
const MAX_BURNS = 3;
const START_CASH = 150;
const WIRE_PHRASES = 5;          // key phrases in the recorded calls; any 3 of them make the log worth something
const LISTEN_NEEDED = 3;

/** a fresh case file */
function newCase(opts = {}) {
  return {
    stage: opts.stage || 'brief', approach: null, cash: START_CASH, heat: 0, burns: 0, hour: 15, shutDown: false,
    photos: { lorne: false, sweets: false, dray: false },
    tip: null,                      // null | 'paid' | 'squeezed' | 'skipped'
    tapPlanted: false, tapFumbles: 0, wireLog: 0, listened: false,
    chase: { caught: false, clean: false, cornered: false, time: 0 },
    box: { result: null, resolve: 100, round: 0, trust: 0, hard: 0, used: {}, log: [] },
    brutality: 0, spent: 0, seenCount: 0, vaults: 0, scoreBonus: 0, done: false, ending: null
  };
}

/** every piece of evidence the case holds, with what it is worth to a prosecutor */
function evidenceList(S) {
  const out = [];
  if (S.photos.lorne) out.push({ id: 'photo_lorne', label: 'Photograph: Big Lorne takes the bag', value: 2 });
  if (S.photos.sweets) out.push({ id: 'photo_sweets', label: 'Photograph: Sweets counts the count', value: 1 });
  if (S.photos.dray) out.push({ id: 'photo_dray', label: 'Photograph: Dray runs the pager', value: 1 });
  if (S.tip === 'paid') out.push({ id: 'tip', label: 'Tooley’s tip, paid and signed', value: 1.5 });
  if (S.tip === 'squeezed') out.push({ id: 'tip', label: 'Tooley’s tip, squeezed out of him (a defense lawyer will have fun)', value: .5 });
  if (S.tapPlanted && S.wireLog > 0) out.push({ id: 'wire', label: 'Wire log: ' + S.wireLog + ' of ' + WIRE_PHRASES + ' calls logged', value: S.wireLog * 1.2 });
  if (S.chase.caught) out.push({ id: 'arrest', label: S.chase.clean ? 'Arrest of Dray: clean, with the package' : 'Arrest of Dray, a little scraped', value: S.chase.clean ? 1.5 : 1 });
  if (S.box.result === 'flipped') out.push({ id: 'statement', label: 'Dray’s statement: he names the stash house', value: 4 });
  return out;
}
const evidenceValue = S => evidenceList(S).reduce((a, e) => a + e.value, 0);
const photoCount = S => Object.values(S.photos).filter(Boolean).length;

/** the case score the hub reports and the results screen shows */
function caseScore(S) {
  const ev = evidenceValue(S) * 100;
  const overtime = Math.max(0, S.hour - 23) * 40;
  const s = ev + (S.chase.clean ? 80 : 0) - S.burns * 60 - S.brutality * 120 - overtime + Math.max(0, S.cash) * .5 - Math.round(S.heat) + (S.scoreBonus || 0);
  return Math.max(0, Math.round(s));
}

/** the Lieutenant's verdict on a finished case */
function verdict(S) {
  const flipped = S.box.result === 'flipped', ev = evidenceValue(S);
  if (S.shutDown) return { id: 'shutdown', title: 'Shut down', rank: 'F', text: 'Pruitt closes the detail by Friday. The corner sells through the weekend. Nobody writes it up, because there is nothing to write.' };
  if (flipped && ev >= 11 && S.brutality === 0) return { id: 'case', title: 'A case a prosecutor can carry', rank: 'A', text: 'Lorne’s name is on a charging document, and the paper holds. Pruitt asks what the detail needs. Kowalczyk says “more time,” and for once she writes it down. By spring there will be a new Lorne.' };
  if (flipped && ev >= 7) return { id: 'solid', title: 'Soldiers and a stash house', rank: 'B', text: 'You gave them the stash house and two lieutenants. Lorne is a name on a list for the next detail. It counts as a clearance, which is the only thing the building counts.' };
  if (flipped) return { id: 'thin', title: 'One kid and a statement', rank: 'C', text: 'Dray talked, and the lawyer will say you made him. The statement is real. The case around it is thin as a paper cup.' };
  if (S.chase.caught) return { id: 'bust', title: 'A buy-and-bust', rank: 'C', text: 'Dray lawyers up before the coffee goes cold. A body in the system, a bag on the table, a number for the board. It does not touch the people who send him out there.' };
  return { id: 'nothing', title: 'Overtime and a stat', rank: 'D', text: 'The corner is back to business by sunrise. You have photographs, a wire log nobody will read and a budget line that needs explaining.' };
}

/** pressure on the corner: the lookouts' notice. Returns true the moment the case is burned. */
function addHeat(S, n) {
  const was = S.heat; S.heat = Math.max(0, Math.min(100, S.heat + n));
  return was < 100 && S.heat >= 100;
}
function burn(S) {
  S.burns++; S.heat = 35; S.hour += 5; S.cash -= 20; S.spent += 20;
  if (S.burns >= MAX_BURNS) { S.shutDown = true; S.done = true; S.stage = 'done'; }
  return S.shutDown;
}
function spend(S, n) { if (S.cash < n) return false; S.cash -= n; S.spent += n; return true; }
function advanceStage(S, to) { if (STAGES.indexOf(to) > STAGES.indexOf(S.stage)) S.stage = to; return S.stage; }

/* ---------------------------------------------------------------- the box ---- */
/** Dray's interview. Seven plays, five rounds, a resolve bar from 100 to 0. */
const BOX_ROUNDS = 5;
function boxOptions(S) {
  const B = S.box, o = [];
  const photos = photoCount(S);
  if (photos) o.push({ id: 'photo', label: 'Slide the photographs across (' + photos + ')', hint: 'Evidence. Hits harder the more you have.' });
  if (S.tapPlanted && S.wireLog > 0) o.push({ id: 'wire', label: 'Play him his own phone call (' + S.wireLog + ')', hint: 'Evidence. His voice, his words.' });
  if (S.tip === 'paid') o.push({ id: 'tip', label: 'Mention Tooley saw the handoff', hint: 'Evidence. Clean. A little cruel to Tooley.' });
  if (S.chase.caught) o.push({ id: 'chase', label: 'Remind him of the package he was carrying', hint: 'Evidence. He ran. Running is an answer.' });
  if (!B.used.soft || B.used.soft < 2) o.push({ id: 'soft', label: 'Coffee, a cigarette, talk about his mother', hint: 'Slow. Builds trust. Twice at most.' });
  o.push({ id: 'bluff', label: 'Bluff: “Your partner already talked”', hint: 'A coin flip. A lie that fails costs you.' });
  if (B.round >= 2) o.push({ id: 'deal', label: 'Offer a deal', hint: 'Works once he is already cracking.' });
  o.push({ id: 'hard', label: 'Lean on him', hint: 'Fast. A complaint waiting to happen.' });
  return o;
}
/** play one option; rng() is a 0..1 source. Returns { dmg, tag, line } and updates S.box. */
function boxPlay(S, id, rng) {
  const B = S.box; let dmg = 0, tag = 'ok', line = '';
  if (B.result) return { dmg: 0, tag: 'over', line: '' };
  B.round++;
  B.used[id] = (B.used[id] || 0) + 1;
  const used = B.used[id];
  switch (id) {
    case 'photo': dmg = Math.round((11 + photoCount(S) * 6) / used); tag = 'hit'; line = 'He looks at the pictures a long time and does not say a word. That is a word.'; break;
    case 'wire': dmg = Math.round((13 + S.wireLog * 5) / used); tag = 'hit'; line = 'He knows the voice. He knows the phone. His eyes go to the glass.'; break;
    case 'tip': dmg = Math.round(14 / used); tag = 'hit'; line = '“Tooley? Tooley?” He laughs, and it comes out wrong.'; break;
    case 'chase': dmg = Math.round((S.chase.clean ? 15 : 10) / used); tag = 'hit'; line = '“I ain’t never seen that bag.” Nobody believes it, him least.'; break;
    case 'soft': dmg = 6 + B.trust * 3; B.trust++; tag = 'soft'; line = 'The cigarette helps. He talks about his mother’s kitchen and does not notice he has been talking.'; break;
    case 'bluff': if (rng() < .45 + B.trust * .12) { dmg = 20; tag = 'hit'; line = 'It lands. He blinks twice and the swagger drops a floor.'; } else { dmg = 0; B.resolve = Math.min(100, B.resolve + 8); tag = 'miss'; line = '“That’s funny. He ain’t got a partner.” You just handed him a free one.'; } break;
    case 'deal': if (B.resolve <= 60 || B.trust >= 2) { dmg = 34; tag = 'hit'; line = 'He says the word “immunity” like a man tasting something he can’t afford.'; } else { dmg = 0; tag = 'miss'; line = '“Deal? For what? I ain’t done nothing.” Too early. He smells it on you.'; } break;
    case 'hard': dmg = 24; B.hard++; S.brutality++; tag = 'hard'; line = 'The table moves. He talks faster. The glass is a mirror, and the mirror is listening.'; break;
    default: dmg = 0; tag = 'miss';
  }
  B.resolve = Math.max(0, B.resolve - dmg);
  B.log.push({ id, dmg, tag, resolve: B.resolve });
  if (B.resolve <= 0) { B.result = 'flipped'; B.resolve = 0; }
  else if (B.round >= BOX_ROUNDS) B.result = 'lawyer';
  return { dmg, tag, line };
}

/* ---------------------------------------------------------- surveillance ---- */
/** how fast a photograph develops when the lens holds a target in its cone: seconds to fill */
const PHOTO_TIME = { lorne: 1.8, sweets: 1.5, dray: 1.5 };
function photoStep(S, who, dt) {
  if (S.photos[who]) return 1;
  const p = (S._ph || (S._ph = {})); p[who] = Math.min(1, (p[who] || 0) + dt / PHOTO_TIME[who]);
  if (p[who] >= 1) { S.photos[who] = true; return 1; }
  return p[who];
}
function photoDecay(S, who, dt) { const p = S._ph; if (p && p[who] && !S.photos[who]) p[who] = Math.max(0, p[who] - dt * .7); }

/* ----------------------------------------------------------------- the wire ---- */
/** a timing bar: the marker sweeps 0..1 and back; a press inside the window is a clean connection */
function wireMarker(t, speed) { const p = (t * speed) % 2; return p < 1 ? p : 2 - p; }
function wireHit(marker, centre, width) { return Math.abs(marker - centre) <= width / 2; }
const WIRE_STEPS = [
  { label: 'Strip the casing', centre: .5, width: .28, speed: .9 },
  { label: 'Clip on the pair', centre: .32, width: .22, speed: 1.2 },
  { label: 'Seat the tap, close the box', centre: .68, width: .18, speed: 1.5 }
];

/* ------------------------------------------------------------ the listening ---- */
const CALLS = [
  { who: 'Lorne', voice: 'lorne', lines: [
    ['Yeah, I got it.', false], ['{The package comes Thursday}', true], ['Same as before, the Pit, after dark.', false], ['Tell Dray to keep his phone off the {south gate}.', true] ] },
  { who: 'Dray', voice: 'dray', lines: [
    ['Nah. Nah, I ain’t moving nothing till he says.', false], ['{Sweets counts it at the laundromat}', true], ['Then it goes to the {house on Calloway}.', true] ] },
  { who: 'Sweets', voice: 'sweets', lines: [
    ['Man, the kid on the corner keeps looking at that van.', false], ['{Nine o’clock, the bag moves}', true], ['Tell the little ones to {quit whistling}, it draws heat.', false] ] }
];
function callPhraseCount() { let n = 0; for (const c of CALLS) for (const l of c.lines) if (l[1]) n++; return n; }

/* ------------------------------------------------------- results + clock ---- */
function clockLabel(h) {
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60), ap = hh >= 12 ? 'PM' : 'AM', h12 = hh % 12 || 12;
  return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ap;
}
/** light by the hour: bright afternoon to a dark night (0..1 darkness) */
function darkness(h) { return Math.max(0, Math.min(1, (h - 16) / 6)); }

/** the summary tables the results screen and the exit interview share */
function resultStats(S) {
  return [[String(evidenceList(S).length), 'Exhibits'], [String(caseScore(S)), 'Case score'], [String(S.burns), 'Times burned'], ['$' + S.cash, 'Budget left'], [clockLabel(S.hour), 'Clock'], [verdict(S).rank, 'Clearance']];
}
function medals(S) {
  return [['All three photographed', photoCount(S) === 3], ['Paid, not squeezed', S.tip === 'paid'], ['Wire clean', S.tapFumbles === 0 && S.tapPlanted], ['Caught clean', S.chase.clean], ['He talked', S.box.result === 'flipped'], ['Never burned', S.burns === 0], ['No hands laid', S.brutality === 0]];
}
