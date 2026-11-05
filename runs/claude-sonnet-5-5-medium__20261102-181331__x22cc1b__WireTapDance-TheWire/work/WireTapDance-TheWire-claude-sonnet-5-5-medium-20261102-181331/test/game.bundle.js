(() => {
/* ---- 10-logic.js ---- */
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

/* ---- 20-world.js ---- */
/* ============================================================================
 * the district: a 56 x 40 block of east-side Baltimore-flavoured rowhouses, one low-rise courtyard, one detail office
 * ========================================================================== */
const MW = 56, MH = 40;
function buildRows() {
  const g = []; for (let y = 0; y < MH; y++) g.push(new Array(MW).fill('#'));
  const fill = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  const put = (x, y, ch) => { g[y][x] = ch; };
  // streets: the avenue (4 lanes), its sidewalks, the cross street, the south service road
  fill(1, 11, 54, 11, ','); fill(1, 12, 54, 15, 'a'); fill(1, 16, 54, 16, ',');
  fill(26, 17, 26, 35, ','); fill(27, 17, 29, 35, 'a'); fill(30, 17, 30, 35, ',');
  fill(1, 35, 54, 35, ','); fill(1, 36, 54, 38, 'a');
  // the detail office (an old courthouse annex basement) and the box beside it
  fill(2, 2, 15, 9, 'i'); fill(7, 10, 8, 10, 'i');
  fill(16, 5, 17, 5, 'i'); fill(18, 2, 23, 9, 't');
  // the rowhouse block: a laundromat, Ruthie's bar, the alley behind them
  fill(4, 18, 11, 23, 't'); fill(7, 17, 8, 17, 't');
  fill(14, 18, 21, 23, 'i'); fill(17, 17, 18, 17, 'i');
  fill(2, 25, 25, 26, 'a');
  // the low-rises: a ring of tall brick around the Pit, with three ways in
  fill(31, 17, 53, 34, 'R'); fill(35, 21, 49, 31, 'p');
  fill(41, 17, 43, 20, 'p'); fill(31, 25, 34, 27, 'p'); fill(41, 32, 43, 34, 'p');
  // cover and clutter: dumpsters stand chest high, fences are low enough to vault
  for (const [x, y] of [[38, 23], [39, 23], [46, 22], [47, 22], [37, 29], [37, 30], [46, 30], [45, 30], [41, 24], [44, 28]]) put(x, y, 'c');
  for (const [x, y] of [[40, 32], [44, 32], [13, 25]]) put(x, y, 'f');
  fill(7, 25, 7, 25, 'c'); fill(19, 25, 19, 25, 'c'); fill(5, 26, 5, 26, 'c');
  fill(23, 15, 25, 15, 'v'); fill(36, 14, 38, 14, 'v'); fill(3, 14, 5, 14, 'v');
  fill(2, 26, 2, 26, 'f'); fill(2, 25, 2, 25, 'f');
  // the people
  const S = (x, y, ch) => put(x, y, ch);
  S(8, 8, '@'); S(4, 4, 'K'); S(13, 8, 'U'); S(12, 3, 'b'); S(19, 5, 'X'); S(22, 5, 'Z');
  S(13, 16, 'P'); S(21, 16, 'T'); S(24, 16, 'V'); S(20, 26, 'n');
  S(42, 27, 'L'); S(38, 25, 'S'); S(46, 26, 'D');
  for (const [x, y] of [[36, 22], [49, 22], [36, 30], [49, 30], [42, 19]]) S(x, y, 'h');
  S(15, 11, 'q'); S(42, 33, 'G'); S(3, 25, 'M');
  S(10, 16, 'n'); S(34, 16, 'n'); S(28, 28, 'n'); S(46, 35, 'n'); S(22, 11, 'n'); S(6, 11, 'n');
  return g.map(r => r.join(''));
}
const FLOORS = ',a'.split('');
const LEGEND = {
  '#': 1, R: 2, c: 3, f: 4, v: 5,
  ',': { floor: 'walk' }, a: { floor: 'road' }, i: { floor: 'wood' }, t: { floor: 'tile' }, p: { floor: 'pit' },
  '@': { floor: 'wood', spawn: 'hero' }, K: { floor: 'wood', spawn: 'kowalczyk' }, U: { floor: 'wood', spawn: 'pruitt' }, b: { floor: 'wood', spawn: 'board' },
  X: { floor: 'tile', spawn: 'boxhero' }, Z: { floor: 'tile', spawn: 'boxsuspect' },
  P: { floor: 'walk', spawn: 'payphone' }, T: { floor: 'walk', spawn: 'tooley' }, V: { floor: 'walk', spawn: 'van' }, n: { floor: 'walk', spawn: 'walker' },
  L: { floor: 'pit', spawn: 'lorne' }, S: { floor: 'pit', spawn: 'sweets' }, D: { floor: 'pit', spawn: 'dray' }, h: { floor: 'pit', spawn: 'hopper' },
  q: { floor: 'walk', spawn: 'hopper2' }, G: { floor: 'pit', spawn: 'gate' }, M: { floor: 'road', spawn: 'deadend' }
};
const WALL_TYPES = {
  1: { h: 50, top: '#3d3433', side: '#7b4b3b', face: 'brick', roof: 'tiles', windows: { w: 6, h: 9, every: 16, from: 12, step: 18, glass: '#2a2a30', lit: .3 }, door: { w: 7, h: 13, color: '#4a2f22', chance: .15 }, cut: true },
  2: { h: 84, top: '#4a4540', side: '#8a5a44', face: 'brick', roof: 'slab', windows: { w: 6, h: 9, every: 16, from: 10, step: 20, glass: '#26262e', lit: .22 }, cut: true },
  3: { h: 24, top: '#2f4a38', side: '#35523f', face: 'plank', roof: 'plain' },
  4: { h: 12, top: '#7c8084', side: '#5c6064', face: 'none', roof: 'plain' },
  5: { h: 22, top: '#3b4a5c', side: '#2c3846', face: 'none', roof: 'plain' }
};
function rng2(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
/** the ground: asphalt with cracks and lane paint, sidewalk slabs, worn boards, institutional tile, concrete court */
function floorTex(x, y, tag) {
  const n = rng2(Math.floor(x), Math.floor(y)), n2 = rng2(Math.floor(x / 3), Math.floor(y / 3), 7), cx = Math.floor(x / 16), cy = Math.floor(y / 16);
  switch (tag) {
    case 'road': {
      let v = 52 + n * 9 + n2 * 5, r = v, gc = v + 1, b = v + 4;
      if (cx >= 1 && cx <= 54 && cy >= 12 && cy <= 15 && (cy === 13 || cy === 14) && Math.abs((y % 32) - 16) < 1.2 && (x % 32) < 18 && cy === 13) { r = 170; gc = 150; b = 70; }
      if (n > .985) { r -= 14; gc -= 14; b -= 12; }
      return [r, gc, b];
    }
    case 'walk': { const jx = (x % 16 < 1 || y % 16 < 1) ? -22 : 0, v = 118 + n * 12 + n2 * 8 + jx; return [v, v - 2, v - 8]; }
    case 'wood': { const row = Math.floor(y / 4), v = 92 + rng2(row, Math.floor(x / 22)) * 20 + (y % 4 < 1 ? -20 : 0); return [v + 16, v - 6, v - 36]; }
    case 'tile': { const chk = ((Math.floor(x / 8) + Math.floor(y / 8)) & 1) ? 0 : 1, v = 138 + chk * 28 + n * 8; return [v - 14, v - 6, v - 22]; }
    case 'pit': { const v = 96 + n * 10 + n2 * 10 + (((x % 24) < 1 || (y % 24) < 1) ? -18 : 0); return [v, v - 4, v - 10]; }
    default: return [70, 66, 70];
  }
}
function makeMap() {
  return new E.TileMap({ rows: buildRows(), legend: LEGEND, types: WALL_TYPES, floorTex, ao: 5, outside: '#14121a' });
}
/** set dressing that lives in the world, not the map: [prop name or shape id, x, y, options] in cells */
function dressing() {
  const P = [];
  const lamp = (cx, cy) => P.push({ k: 'prop', n: 'streetlamp', x: cx, y: cy, light: true });
  for (const cx of [4, 12, 20, 34, 46, 52]) lamp(cx, 11.2);
  for (const cy of [20, 30]) lamp(30.4, cy);
  for (const [cx, cy] of [[6, 35.4], [26, 35.4], [44, 35.4]]) lamp(cx, cy);
  lamp(42.5, 20.6); lamp(37, 26); lamp(47, 26); lamp(42.5, 31.5);
  for (const [cx, cy] of [[9.5, 16.2], [24.5, 11.4], [32, 16.3], [47, 16.3]]) P.push({ k: 'prop', n: 'hydrant', x: cx, y: cy });
  for (const [cx, cy] of [[11, 16.3], [3, 11.5], [39, 11.4], [26.5, 24.5], [36.5, 20.5], [48.5, 31.2]]) P.push({ k: 'prop', n: 'trashcan', x: cx, y: cy });
  P.push({ k: 'prop', n: 'firedrum', x: 40.5, y: 28.2, light: true }, { k: 'prop', n: 'firedrum', x: 14.5, y: 24.4, light: true });
  P.push({ k: 'prop', n: 'sign', x: 7.5, y: 16.3, text: 'WASH' }, { k: 'prop', n: 'sign', x: 17.5, y: 16.3, text: 'RUTHIE’S' });
  P.push({ k: 'prop', n: 'awning', x: 7.5, y: 17.1 }, { k: 'prop', n: 'awning', x: 17.5, y: 17.1 });
  for (const [cx, cy, f] of [[43.2, 27.8, 1.57], [38, 28.5, 0], [48, 25, 3.1]]) P.push({ k: 'shape', n: 'bench', x: cx, y: cy, facing: f });
  for (const [cx, cy] of [[34.6, 33.6], [49.4, 33.6], [32.8, 21.5]]) P.push({ k: 'prop', n: 'trashcan', x: cx, y: cy });
  // detail office
  for (const [cx, cy, f] of [[5, 6, 0], [9, 5.5, 0], [4, 9, 1.57]]) P.push({ k: 'shape', n: 'table', x: cx, y: cy, facing: f });
  for (const [cx, cy, f] of [[5.2, 7.4, 3.1], [9.3, 6.9, 3.1], [6.2, 5, 1.2]]) P.push({ k: 'shape', n: 'chair', x: cx, y: cy, facing: f });
  P.push({ k: 'shape', n: 'bookcase', x: 2.6, y: 3, facing: 1.57 }, { k: 'shape', n: 'shelf', x: 15, y: 4, facing: 3.1 });
  P.push({ k: 'prop', n: 'lamp', x: 9, y: 5, light: true }, { k: 'prop', n: 'lamp', x: 5, y: 5, light: true }, { k: 'prop', n: 'lamp', x: 20.5, y: 4, light: true });
  P.push({ k: 'shape', n: 'table', x: 20.5, y: 5.5, facing: 1.57 }, { k: 'shape', n: 'chair', x: 19.4, y: 5.5, facing: 0 }, { k: 'shape', n: 'chair', x: 22.2, y: 5.5, facing: 3.14 });
  // laundromat and Ruthie's
  for (const [cx, cy] of [[5, 19], [6.5, 19], [8, 19], [9.5, 19]]) P.push({ k: 'shape', n: 'barrel', x: cx, y: cy });
  for (const [cx, cy, f] of [[15.5, 19.5, 0], [19.5, 19.5, 0], [15.5, 22, 0], [19.5, 22, 0]]) P.push({ k: 'shape', n: 'table', x: cx, y: cy, facing: f });
  P.push({ k: 'prop', n: 'lamp', x: 8, y: 21, light: true }, { k: 'prop', n: 'lamp', x: 17.5, y: 21, light: true });
  P.push({ k: 'prop', n: 'crate', x: 5, y: 22 }, { k: 'prop', n: 'crate', x: 10.4, y: 22.2 });
  return P;
}
/** the chase: where Dray runs, in cells, ending at the dead-end fence of the alley */
const CHASE_ROUTE = [[42, 35.5], [31, 35.5], [28.5, 33], [28.5, 27.5], [24, 25.5], [14, 25.5], [4, 25.5]];
/** hopper posts: base facing (radians, 0 = east, +y south) and how far each sweeps */
const HOPPER_POSTS = [
  { name: 'Pooch', cx: 36, cy: 22, face: .8, sweep: 1.0, speed: .6 },
  { name: 'Man-Man', cx: 49, cy: 22, face: 2.3, sweep: .9, speed: .5 },
  { name: 'Tay', cx: 36, cy: 30, face: -.7, sweep: .9, speed: .55 },
  { name: 'Roach', cx: 49, cy: 30, face: -2.3, sweep: .8, speed: .65 },
  { name: 'Lil Moe', cx: 42, cy: 19, face: 1.57, sweep: 1.0, speed: .7 },
  { name: 'Dink', cx: 15, cy: 11, face: 1.35, sweep: .75, speed: .5, avenue: true }
];

/* ---- 30-setup.js ---- */
/* ============================================================================
 * the game object, settings, controls, sound
 * ========================================================================== */
const E = My3D2dge;
const HUB = typeof AIHub !== 'undefined' ? AIHub : null;
const IN_SESSION = !!(HUB && HUB.active);
const ENGINE_NOTE = 'my-3D2dge ' + (E.version || 'v0.85.1');

/* controls: a pad-first map. Cross = interact, Circle = crouch, Square = tackle, Triangle = case file, L2 = camera,
   R2 = sprint, R3 = change the view. The keyboard takes the keys detectives' hands know: WASD, Shift, C, E, Q, J, Tab, V. */
const MENU_ACTIONS = {};
for (const k of ['start', 'pause', 'confirm', 'cancel']) MENU_ACTIONS[k] = E.Input.THIRDPERSON[k].filter(c => c !== 'KeyJ' && c !== 'KeyK');   // J is the tackle
const CONTROLS = Object.assign({
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  sprint: ['ShiftLeft', 'ShiftRight', 'Pad7', 'Pad10'], crouch: ['KeyC', 'ControlLeft', 'Pad1'], interact: ['KeyE', 'KeyF', 'Space', 'Pad0'],
  camera: ['KeyQ', 'Mouse2', 'Pad6'], tackle: ['KeyJ', 'Pad2'], board: ['Tab', 'KeyB', 'Pad3'], view: ['KeyV', 'Pad11']
}, MENU_ACTIONS);

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: CONTROLS, id: 'wire-tap-dance',
  menu: {
    items: [['Case file', () => openBoard()]], saves: true, quit: IN_SESSION ? false : 'title',
    controls: { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', sprint: 'Sprint', crouch: 'Crouch and sneak', interact: 'Interact and talk', camera: 'Raise the camera', tackle: 'Tackle', board: 'Case file', view: 'Change the camera view' },
    settings: [
      { key: 'invertH', group: 'Controller', label: 'Invert stick left and right', type: 'toggle', value: false, help: 'For a controller whose horizontal axis reads backwards', apply: (g, v) => { g.input.invertH = !!v; } },
      { key: 'invertV', group: 'Controller', label: 'Invert stick up and down', type: 'toggle', value: false, help: 'For a controller whose vertical axis reads backwards', apply: (g, v) => { g.input.invertV = !!v; } },
      { key: 'cones', group: 'Game', label: 'Show lookouts’ sight cones', type: 'toggle', value: true, help: 'The lit wedge in front of each lookout. Off is harder and more honest' },
      { key: 'hints', group: 'Game', label: 'Hints', type: 'toggle', value: true, help: 'Short tips as new things come up' }
    ]
  }
});
/* the controller shows PlayStation symbols unless the player picks Xbox: the standard "Button symbols" setting, narrowed to the two */
(() => {
  const S = game.settings, sp = S.spec('glyphs');
  if (sp) { sp.options = [['playstation', 'PlayStation (✕ ○ □ △)'], ['xbox', 'Xbox (A B X Y)']]; sp.value = 'playstation'; sp.help = 'Which button symbols the prompts show for a controller'; sp.label = 'Controller symbols'; }
  if (S._raw.glyphs !== 'xbox' && S._raw.glyphs !== 'playstation') { S.glyphs = 'playstation'; S._apply('glyphs'); }
})();
const ui = new E.Shell(game, { theme: { accent: '#e0b06a', ink: '#f0e8da', paper: 'rgba(12,14,18,.9)', danger: '#e07a5a', titleFont: 'Georgia, "Times New Roman", serif' }, meters: .125 });
const talk = new E.Dialog(game, { speed: 42, lines: 3, bg: '#12161c', border: '#d8b070', nameColor: '#f0c070', voice: 'vx_det' });
const I = game.input;

/* ---------- sound: sfx, voices (Animalese-style gibberish by speaker) and music, all synthesized ---------- */
const A = game.audio;
const VOICES = {
  det: { wave: 'triangle', freq: 330, to: 360 }, sgt: { wave: 'saw', freq: 140, to: 120 }, lt: { wave: 'triangle', freq: 260, to: 240 },
  tooley: { wave: 'pulse12', freq: 200, to: 170 }, lorne: { wave: 'saw', freq: 110, to: 100 }, sweets: { wave: 'square', freq: 250, to: 290 },
  dray: { wave: 'pulse', freq: 190, to: 230 }, kid: { wave: 'square', freq: 520, to: 600 }, narr: { wave: 'sine', freq: 220, to: 220 }
};
for (const k in VOICES) A.define('vx_' + k, Object.assign({ dur: .055, vol: .1 }, VOICES[k]));
A.define('wire_ok', { wave: 'square', freq: 'C5', to: 'G5', dur: .12, vol: .18 });
A.define('wire_bad', { wave: 'saw', freq: 180, to: 60, dur: .25, vol: .2 });
A.define('shutter', [{ wave: 'noise', dur: .04, vol: .3 }, { wave: 'square', freq: 1400, to: 400, dur: .06, vol: .12 }]);
A.define('whistle', [{ wave: 'sine', freq: 1900, to: 2300, dur: .22, vol: .2, vib: [30, .04] }]);
A.define('radio', [{ wave: 'noise', dur: .08, vol: .12 }, { wave: 'square', freq: 900, to: 700, dur: .05, vol: .06 }]);
A.define('phone', { wave: 'square', freq: 'A5', dur: .09, vol: .12, arp: [0, 5], step: .04 });
A.define('footfall', { wave: 'noise', dur: .03, vol: .06 });
A.define('tick', { wave: 'square', freq: 1800, dur: .02, vol: .08 });
(() => {   // voices vary in pitch per blip: gibberish that still sounds like somebody
  const base = A.sfx.bind(A);
  A.sfx = function (n, o) { if (typeof n === 'string' && n.indexOf('vx_') === 0) { const r = Math.random(); return base(n, Object.assign({}, o, { pitch: .8 + r * .55 })); } return base(n, o); };
})();

const SONGS = {
  title: { bpm: 74, steps: 4, tracks: [
    { wave: 'triangle', vol: .2, notes: 'A2 - - - - - A2 - E3 - - - D3 - C3 - A2 - - - - - A2 - E3 - - - G3 - E3 - F2 - - - - - F2 - C3 - - - D3 - E3 - E2 - - - - - E2 - B2 - - - G#2 - B2 -' },
    { wave: 'pulse12', vol: .09, notes: '. . . . E4 - - - G4 - A4 - - - - - . . . . E4 - - - D4 - C4 - - - - - . . . . F4 - - - A4 - C5 - - - - - . . . . B4 - - - G#4 - E4 - - - - -' },
    { wave: 'drums', vol: .12, notes: 'k . . . . . h . s . . . . . h . k . . . . . h . s . . h . . h .' }
  ] },
  stealth: { bpm: 68, steps: 4, tracks: [
    { wave: 'saw', vol: .09, notes: 'D2 - - - - - - - - - - - - - - - D2 - - - - - - - - - - - F2 - - - Bb1 - - - - - - - - - - - - - - - A1 - - - - - - - - - - - C2 - - -' },
    { wave: 'sine', vol: .08, notes: '. . . . . . . . A5 - - - . . . . . . . . . . . . . . . . E5 - - - . . . . . . . . . . . . . . . . . . . . D5 - - - . . . . . . . . . . . .' },
    { wave: 'drums', vol: .08, notes: '. . h . . . h . . . h . . . h h . . h . . . h . . . h . . . h .' }
  ] },
  chase: { bpm: 148, steps: 4, tracks: [
    { wave: 'saw', vol: .13, notes: 'E2 . E2 . E2 . G2 . E2 . E2 . A2 . G2 . E2 . E2 . E2 . G2 . B2 . A2 . G2 . E2 .' },
    { wave: 'square', vol: .06, notes: 'B4 - - B4 - - E5 - B4 - - G4 - - A4 - B4 - - B4 - - E5 - D5 - - B4 - - G4 - -' },
    { wave: 'drums', vol: .15, notes: 'k . h h s . h k k . h h s . h h k . h h s . h k k h h h s . s s' }
  ] },
  box: { bpm: 60, steps: 4, tracks: [
    { wave: 'triangle', vol: .12, notes: 'C2 - - - - - - - - - - - - - - - C2 - - - - - - - - - - - G1 - - - Ab1 - - - - - - - - - - - - - - - G1 - - - - - - - - - - - - - - -' },
    { wave: 'square', vol: .04, notes: '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .' },
    { wave: 'drums', vol: .07, notes: 'h . . . . . . . h . . . . . . . h . . . . . . . h . . . . . . h' }
  ] },
  report: { bpm: 66, steps: 4, tracks: [
    { wave: 'triangle', vol: .17, notes: 'D3 - - - A2 - - - Bb2 - - - F2 - - - G2 - - - D3 - - - A2 - - - E2 - - -' },
    { wave: 'sine', vol: .1, notes: 'A4 - - - - - F4 - - - E4 - D4 - - - - - - - - - - - . . . . . . . . . . . .' }
  ] }
};
const music = (name, o) => { try { A.music(name ? SONGS[name] : null, o); } catch (e) { game.fail('music', e); } };

/* ---------- raw "somebody touched something" tracking, for the attract mode (the pilot's own taps never count) ---------- */
let lastUserInput = (typeof performance !== 'undefined' ? performance.now() : 0), userPoked = false;
const poke = () => { lastUserInput = performance.now(); userPoked = true; };
if (typeof window !== 'undefined' && !game.headless) {
  for (const t of ['keydown', 'pointerdown', 'wheel', 'touchstart']) window.addEventListener(t, poke, { passive: true });
  let mx = -1, my = -1;
  window.addEventListener('mousemove', e => { if (mx >= 0 && Math.hypot(e.clientX - mx, e.clientY - my) > 6) poke(); mx = e.clientX; my = e.clientY; }, { passive: true });
  window.addEventListener('gamepadconnected', poke);
}
function pollPadPoke() {
  let pads = []; try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { /* blocked */ }
  for (const p of Array.from(pads || [])) if (p && (p.buttons.some(b => b.pressed) || p.axes.some(a => Math.abs(a) > .55))) poke();
}
/** a device with a screen and no keyboard or pad: touch only (the game asks for a controller or a keyboard) */
function touchOnly() {
  if (typeof navigator === 'undefined' || game.headless) return false;
  let pad = false; try { pad = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).some(p => p && p.connected); } catch (e) { /* none */ }
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  return !pad && coarse && navigator.maxTouchPoints > 0 && !userUsedKeys;
}
let userUsedKeys = false;
if (typeof window !== 'undefined' && !game.headless) window.addEventListener('keydown', () => { userUsedKeys = true; }, { passive: true });

/* 10-foot UI: the HTML layer scales with the screen so a TV across the room reads */
function scaleUI() {
  if (game.headless || typeof innerWidth === 'undefined' || !ui.root) return;
  const z = Math.max(1, Math.min(1.9, innerWidth / 1000)); ui.root.style.zoom = String(z);
}
if (typeof window !== 'undefined' && !game.headless) { addEventListener('resize', scaleUI); setTimeout(scaleUI, 0); }

/* ---- 40-entities.js ---- */
/* ============================================================================
 * people: the detective, the unit, the crew, the lookouts, the street
 * ========================================================================== */
const T16 = 16;
const cellXY = (cx, cy) => [(cx + .5) * T16, (cy + .5) * T16];
const rigOf = o => new E.Humanoid(o);
const RIGS = {
  hero: () => rigOf({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'ponytail', sleeves: 'long', colors: { skin: '#a8714f', hair: '#1e1612', coat: '#3c4658', cloth: '#556070', pants: '#2a2c34', boot: '#1a1614', belt: '#caa24a', trim: '#caa24a' } }),
  kowalczyk: () => rigOf({ size: 1.25, build: 'bulky', weapon: null, outfit: 'shirt', hair: 'bald', sleeves: 'long', colors: { skin: '#d9a98a', cloth: '#b8b2a0', pants: '#3a3a42', boot: '#222', belt: '#4a3a2a', trim: '#7a2a2a' } }),
  pruitt: () => rigOf({ size: 1.2, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', sleeves: 'long', colors: { skin: '#8a5a40', hair: '#2a1a14', coat: '#22304a', cloth: '#d8d4cc', pants: '#1c2434', boot: '#14141a', trim: '#c8b070' } }),
  tooley: () => rigOf({ size: 1.15, build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', hat: 'cap', sleeves: 'long', hunch: .5, colors: { skin: '#7a4f38', hair: '#2a2420', coat: '#6a5a3a', cloth: '#80806a', pants: '#3a3a30', boot: '#2a2420' } }),
  lorne: () => rigOf({ size: 1.3, build: 'bulky', weapon: null, outfit: 'coat', hair: 'bald', sleeves: 'long', colors: { skin: '#5a3a2a', coat: '#1c1c20', cloth: '#6a1c1c', pants: '#22262e', boot: '#111', trim: '#d8b030' } }),
  sweets: () => rigOf({ size: 1.1, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: 'cap', sleeves: 'short', colors: { skin: '#8a5a40', hair: '#1a1410', cloth: '#d8c040', pants: '#2a3a5a', boot: '#e8e8e8' } }),
  dray: () => rigOf({ size: 1.2, build: 'heroic', weapon: null, outfit: 'shirt', hair: 'spiky', hat: 'band', sleeves: 'long', colors: { skin: '#6a4430', hair: '#14100c', cloth: '#3a6a5a', pants: '#2a2a32', boot: '#e0e0e0', trim: '#e8e8e8' } }),
  hopper: i => rigOf({ size: .95, build: 'chibi', weapon: null, outfit: 'shirt', hair: 'short', hat: i % 2 ? 'cap' : undefined, sleeves: 'short', colors: { skin: ['#7a4f38', '#a8714f', '#5a3a2a', '#c89a78'][i % 4], cloth: ['#c04a3a', '#3a6ac0', '#c0a03a', '#6a3ac0', '#3ac07a', '#c03a8a'][i % 6], pants: '#2a2c38', boot: '#e8e8e8' } }),
  walker: i => rigOf({ size: 1.1 + (i % 3) * .04, build: i % 2 ? 'chibi' : 'heroic', weapon: null, outfit: ['coat', 'shirt', 'robe'][i % 3], hair: ['short', 'long', 'ponytail', 'bald', 'spiky'][i % 5], hat: i % 4 === 0 ? 'cap' : undefined, sleeves: 'long', colors: { skin: ['#d9a98a', '#a8714f', '#6a4430', '#e4bda0'][i % 4], cloth: ['#7a6a5a', '#4a5a6a', '#6a4a4a', '#5a6a4a', '#8a8070'][i % 5], coat: ['#3a3a48', '#5a4a3a', '#2a3a3a'][i % 3], pants: '#30303a', boot: '#222' } })
};

class Person {
  constructor(tag, x, y, rig, o = {}) {
    this.tag = tag; this.name = o.name || tag; this.voice = o.voice || 'narr'; this.rig = rig;
    this.body = o.mover ? new E.Mover({ x, y, r: 5, run: o.run || 90, walk: o.walk || 40, sprintSpeed: o.sprint || 108 }) : new E.Body({ x, y, r: 5 });
    this.home = { x, y }; this.facing = o.facing === undefined ? 1.57 : o.facing; this.body.facing = this.facing;
    this.pose = o.pose || null; this.expr = null; this.aim = null; this.hidden = false; this.wary = 0; this.mode = 'idle';
    this.t = Math.random() * 10; this.lane = o.lane || null; this.dir = 1; this.speed = o.speed || 28;
  }
  get x() { return this.body.x; } get y() { return this.body.y; } get z() { return this.body.z || 0; }
  set x(v) { this.body.x = v; } set y(v) { this.body.y = v; }
  face(tx, ty) { this.facing = Math.atan2(ty - this.y, tx - this.x); this.body.facing = this.facing; }
  update(dt, map, hero) {
    const b = this.body; this.t += dt;
    if (this.mode === 'walk' && this.lane) {   // a pedestrian: back and forth along the pavement
      const L = this.lane, tx = L.a + (L.b - L.a) * (this.dir > 0 ? 1 : 0);
      if (L.axis === 'x') { b.vx = this.dir * this.speed; b.vy = 0; if ((this.dir > 0 && this.x >= L.b) || (this.dir < 0 && this.x <= L.a)) this.dir *= -1; this.facing = this.dir > 0 ? 0 : Math.PI; }
      else { b.vy = this.dir * this.speed; b.vx = 0; if ((this.dir > 0 && this.y >= L.b) || (this.dir < 0 && this.y <= L.a)) this.dir *= -1; this.facing = this.dir > 0 ? 1.57 : -1.57; }
      b.facing = this.facing; void tx;
    } else if (this.mode === 'idle' && !(b instanceof E.Mover)) { b.vx = b.vy = 0; }
    if (!(b instanceof E.Mover && this.mode === 'run')) b.update(dt, map);
    const moving = Math.hypot(b.vx || 0, b.vy || 0) > 4;
    this.rig.update(dt, { x: b.x, y: b.y, z: b.z || 0, vx: b.vx || 0, vy: b.vy || 0, facing: this.facing, pose: this.pose || undefined, expr: this.expr || undefined, point: false, stance: undefined, sprint: this.mode === 'run' ? 1 : 0, run: moving && this.mode === 'run' ? 1 : undefined });
  }
}

/** a lookout: a kid on a post whose gaze sweeps. alert rises in the cone; at 1 he whistles. */
class Lookout {
  constructor(post, i) {
    const [x, y] = cellXY(post.cx, post.cy);
    this.post = post; this.name = post.name; this.x = x; this.y = y; this.z = 0; this.base = post.face; this.facing = post.face; this.alert = 0; this.cool = 0; this.t = i * 2.3;
    this.rig = RIGS.hopper(i); this.range = post.avenue ? 130 : 116; this.fov = 1.5; this.seen = false; this.body = new E.Body({ x, y, r: 4 }); this.whistled = 0;
  }
  update(dt) {
    this.t += dt; this.cool = Math.max(0, this.cool - dt); this.whistled = Math.max(0, this.whistled - dt);
    this.facing = this.base + Math.sin(this.t * this.post.speed) * this.post.sweep;
    this.rig.update(dt, { x: this.x, y: this.y, z: 0, vx: 0, vy: 0, facing: this.facing, pose: this.whistled > 0 ? 'cheer' : undefined, expr: this.alert > .5 ? 'shout' : undefined });
  }
}

/* ---------- perception: can a lookout see the detective? ---------- */
function lookoutSees(lk, hero, map, state) {
  const crouch = !!hero.crouch;
  const tgt = { x: hero.x, y: hero.y, z: hero.z || 0, exposure: crouch ? 1 : 1, crouch };
  const r = E.sees({ x: lk.x, y: lk.y, z: 0 }, tgt, { range: lk.range * (state.sprinting ? 1.15 : 1) * (crouch ? .8 : 1) * (state.camera ? 1.1 : 1), fov: lk.fov, facing: lk.facing, map });
  return r;
}

/* ---- 50-play.js ---- */
/* ============================================================================
 * the case: world state, interactions, conversations, mini-games, chase, the box
 * ========================================================================== */
let S = newCase(), map = null, hero = null, heroRig = null, flow = null, P = {}, lookouts = [], walkers = [], DRESS = [];
let demo = false, overlay = null, W = null, L = null, chase = null, boxScreen = false, scriptTask = null, resultsShown = false;
let hover = null, autoWalk = null, camRaised = false, aimAng = 0, photoWho = null, hudHint = '', hintShown = {}, lastToast = '', stageClock = 0;
let tackleT = 0, sprintingNow = false, sessionStarted = false, sessionEnded = false, pilotCtl = null;
const REACH = 24;

/* ---------- world ---------- */
function spawnXY(tag, i = 0) { const sp = map.findAll(tag)[i]; return sp ? [sp.x, sp.y] : [100, 100]; }
function buildWorld() {
  map = makeMap(); flow = new E.FlowField(map);
  DRESS = dressing();
  for (const d of DRESS) if (d.k === 'shape' && E.SHAPES && E.SHAPES[d.n] && ['table', 'bench', 'barrel', 'bookcase', 'shelf'].includes(d.n)) { try { map.solid(d.n, d.x * T16, d.y * T16, 0, { facing: d.facing || 0 }); } catch (e) { /* decorative only */ } }
  const [hx, hy] = spawnXY('hero');
  hero = new E.Mover({ x: hx, y: hy, r: 5, walk: 46, run: 78, sprintSpeed: 118, sneak: 30, vault: 14, climb: false, staminaMax: 100, staminaRegen: 28 }); hero.facing = 1.57;
  heroRig = RIGS.hero();
  const mk = (tag, rigKey, name, voice, o = {}) => { const [x, y] = spawnXY(tag); return new Person(tag, x, y, RIGS[rigKey](), Object.assign({ name, voice }, o)); };
  P = {
    kowalczyk: mk('kowalczyk', 'kowalczyk', 'SGT. KOWALCZYK', 'sgt', { facing: 0 }),
    pruitt: mk('pruitt', 'pruitt', 'LT. PRUITT', 'lt', { facing: 3.14 }),
    tooley: mk('tooley', 'tooley', 'TOOLEY', 'tooley', { facing: 2.4, pose: 'kneel' }),
    lorne: mk('lorne', 'lorne', 'BIG LORNE', 'lorne', { facing: 3.14, pose: 'hips' }),
    sweets: mk('sweets', 'sweets', 'SWEETS', 'sweets', { facing: 0.4 }),
    dray: mk('dray', 'dray', 'DRAY', 'dray', { mover: true, facing: 2.2, run: 98, sprint: 112 })
  };
  P.lorne.face(P.sweets.x, P.sweets.y); P.sweets.face(P.lorne.x, P.lorne.y); P.dray.face(P.lorne.x, P.lorne.y);
  lookouts = HOPPER_POSTS.map((p, i) => new Lookout(p, i));
  walkers = map.findAll('walker').map((sp, i) => {
    const horiz = sp.cy === 16 || sp.cy === 11 || sp.cy === 35, w = new Person('walker', sp.x, sp.y, RIGS.walker(i), { name: 'Pedestrian', voice: 'narr', speed: 20 + (i % 3) * 7 });
    w.mode = 'walk'; w.lane = horiz ? { axis: 'x', a: sp.x - 90, b: sp.x + 90 } : { axis: 'y', a: sp.y - 80, b: sp.y + 80 };
    if (horiz) { w.lane.a = Math.max(24, w.lane.a); w.lane.b = Math.min(MW * 16 - 24, w.lane.b); }
    w.dir = i % 2 ? 1 : -1; return w;
  });
  chase = null; overlay = null; W = null; L = null; hover = null; autoWalk = null; photoWho = null; boxScreen = false;
  talk.close && talk.close();
}
const heroPos = () => ({ x: hero.x, y: hero.y, z: hero.z || 0 });
function placeHero(tag, i = 0) { const [x, y] = spawnXY(tag, i); Object.assign(hero, { x, y, vx: 0, vy: 0 }); }
const crewList = () => [['lorne', P.lorne], ['sweets', P.sweets], ['dray', P.dray]];

/* ---------- objectives and the day's clock ---------- */
const OBJ = {
  brief: () => ({ title: 'Report to Sgt. Kowalczyk', text: 'Briefing in the detail office.', at: P.kowalczyk }),
  surveil: () => {
    const w = crewList().find(([k]) => !S.photos[k]);
    return { title: 'Photograph the crew (' + photoCount(S) + ' of 3)', text: w ? 'Hold ' + I.label('camera') + ' on ' + CREW[w[0]] + ' and keep the lens steady. Watch the lookouts.' : '', at: w ? w[1] : null };
  },
  tip: () => ({ title: 'Meet Tooley outside Ruthie’s', text: 'He knows the calendar. He will want something.', at: P.tooley }),
  wire: () => ({ title: 'Tap the laundromat payphone', text: 'Crouch. Make three clean connections. Mind the kid on the avenue.', at: { x: spawnXY('payphone')[0], y: spawnXY('payphone')[1], z: 0 } }),
  listen: () => ({ title: 'Listen in the van', text: 'Log what matters. Three or more.', at: { x: spawnXY('van')[0], y: spawnXY('van')[1], z: 0 } }),
  chase: () => ({ title: chase && chase.running ? 'Run him down' : 'Be at the south gate', text: chase && chase.running ? 'Sprint, vault, and tackle with ' + I.label('tackle') + '.' : 'Nine o’clock. Dray moves the bag.', at: chase && chase.running ? P.dray : { x: spawnXY('gate')[0], y: spawnXY('gate')[1], z: 0 } }),
  box: () => ({ title: 'Interview Dray', text: 'Interview Room 2. Take your time. Not too much.', at: { x: spawnXY('boxsuspect')[0], y: spawnXY('boxsuspect')[1], z: 0 } }),
  report: () => ({ title: 'Brief Lt. Pruitt', text: 'Upstairs, in the office. Bring the numbers.', at: P.pruitt }),
  done: () => ({ title: 'Case closed', text: '', at: null })
};
function toStage(st, quiet) {
  advanceStage(S, st); stageClock = 0;
  if (!quiet) { try { game.saves.autosave(); } catch (e) { /* storage may be blocked */ } }
  const song = { chase: 'chase', box: 'box', report: 'report' }[st] || (['surveil', 'tip', 'wire', 'listen'].includes(st) ? 'stealth' : 'title');
  music(song, { fade: 1 });
}
function notify(title, text, secs) { lastToast = title; ui.toast(title, text, secs || 4); }
function hint(key, title, text) { if (!game.settings.hints || hintShown[key] || demo) return; hintShown[key] = true; ui.tutorial(title, text, 12); }

/* ---------- conversation helpers (Dialog is modal; a script waits for it) ---------- */
function* say(who, lines, choices) {
  let pick = -1; const opt = { name: who.name, portrait: who.rig, onChoice: i => { pick = i; } };
  if (choices) opt.choices = choices;
  talk.voice = 'vx_' + (who.voice || 'narr'); talk.say(lines, opt);
  yield E.until(() => !talk.open); return pick;
}
function radio(who, text, secs) { talk.voice = 'vx_' + (who.voice || 'narr'); A.sfx('radio'); talk.say(text, { name: who.name + ' (radio)', portrait: who.rig, auto: secs || 3.2, modal: false }); }
const KOW = () => P.kowalczyk, PRU = () => P.pruitt, TOO = () => P.tooley, DRA = () => P.dray;
function runScript(gen, force) { if (scriptTask && !scriptTask.done) { if (!force) return; scriptTask.cancel(); talk.close && talk.close(); } scriptTask = game.script(gen); }
const busy = () => !!(talk.open && !talk.modalOff) || (scriptTask && !scriptTask.done) || !!overlay || boxScreen || (ui.screen);

function* convBrief() {
  const k = KOW();
  yield* say(k, ['Brannock. Sit. No, don’t sit, we haven’t got the time.', 'The Calloway crew moves product off the Pit, the courtyard of the low-rises, and has since before you made detective. Big Lorne runs it. Sweets counts it. Dray moves it.']);
  yield* say(k, ['Everybody downtown wants Lorne. Nobody downtown wants to pay for Lorne. Eight weeks, a van that smells like a stranger’s lunch, and a wire order that took two judges and one favor.', 'So. Pictures of all three. Then a man called Tooley, who knows the calendar and charges by the fact. Then the payphone at the laundromat. We listen, we wait for the bag to move, and we take whoever runs.']);
  const c = yield* say(k, ['How do you want to work it?'], ['By the book. Every step on paper.', 'Fast and loose. We are out of time.']);
  if (c === 1) { S.approach = 'corners'; S.cash += 60; yield* say(k, ['Don’t tell me. If I hear it, it happened.', 'Sixty from the discretionary. It doesn’t exist, and neither does this conversation.']); }
  else { S.approach = 'book'; yield* say(k, ['Paper. Good. A prosecutor can hold paper.', 'Paper is also slow, and slow is how they get you. Go.']); }
  yield* say(k, ['Camera’s on you. The little ones on the corners will whistle if they see a stranger looking. You’re not police out there. You’re a woman who took a wrong turn and doesn’t know it yet.']);
  toStage('surveil'); music('stealth', { fade: 1 });
  hint('camera', 'Photographing the crew', 'Hold ' + I.label('camera') + ' and keep the lens on them. Crouch with ' + I.label('crouch') + ' to stay low. Lookouts whistle if they see you.');
}
function* convKowIdle() {
  const k = KOW();
  const lines = { surveil: 'Pictures, Brannock. Lorne, Sweets, Dray. And don’t stand where the kids can see you.', tip: 'Tooley sits outside Ruthie’s. Bring cash. He prefers it to conversation.', wire: 'The laundromat phone. The kid on the avenue watches that corner. Be boring.', listen: 'Get in the van. Listen to the calls. Log what matters.', chase: 'South gate, nine o’clock. Go.', box: 'The room’s ready. So is he.', report: 'Pruitt’s waiting. Upstairs. Try not to explain too much.', done: 'Go home.' };
  yield* say(k, lines[S.stage] || 'Go on.');
}
function* convTooley() {
  const t = TOO();
  if (S.stage !== 'tip') {
    yield* say(t, S.stage === 'brief' || S.stage === 'surveil' ? ['Not yet, Detective. Come back when you got something to show me.'] : ['We already did our business. I’m a man of my word. Mostly.']);
    return;
  }
  yield* say(t, ['Detective. Detective. You look like a woman with a question, and I look like a man who could use a sandwich.', 'Folks on the Pit use the laundromat phone. The cell ones, they say, the cell ones listen. Sweets calls Lorne from that box. Thursday the bag moves. I seen it. I know the house on Calloway too.']);
  const opts = [];
  const labels = ['Hand him twenty.  ($20)', 'Fifty and a sandwich.  ($50)', 'Lean on him.', 'Walk away.'];
  const c = yield* say(t, ['So. What’s my information worth to you?'], labels);
  if (c === 0 && spend(S, 20)) { S.tip = 'paid'; yield* say(t, ['Twenty. Bless you. Laundromat phone, Sweets does the talking, south gate for the handoff. You didn’t get it from me.']); }
  else if (c === 1 && spend(S, 50)) { S.tip = 'paid'; S.heat = 0; S.scoreBonus += 60; yield* say(t, ['Fifty and a sandwich! You’re a good woman. I’ll go and talk loud on the corner about nothing at all, give the little ones something to look at.', 'The phone. The south gate. Thursday. Go on, go.']); notify('Tooley’s going to be loud', 'The lookouts are distracted. Heat cleared.'); }
  else if (c === 2) { S.tip = 'squeezed'; addHeat(S, 15); yield* say(t, ['Okay, okay. Laundromat, south gate, Thursday. Don’t. Don’t.', 'You know I’m gonna have to say something to somebody, now. For my safety.']); notify('Squeezed', 'A lawyer will make a meal of this. The corner heard him yell.'); }
  else { S.tip = 'skipped'; yield* say(t, ['Suit yourself, Detective. The information won’t get any cheaper.']); }
  void opts;
  toStage('wire');
  hint('wire', 'Tapping a phone', 'Crouch at the payphone and hit ' + I.label('interact') + ' as the marker crosses the bright bar. Three connections.');
}
function* convPruitt() {
  const p = PRU();
  if (S.stage !== 'report') { yield* say(p, S.stage === 'brief' ? ['The detail’s Sergeant is waiting for you. Don’t keep him waiting.'] : ['I read the numbers when there are numbers. Bring me numbers.']); return; }
  const v = verdict(S);
  yield* say(p, ['Detective. Sergeant tells me you pulled a case out of the Calloway Homes.', 'I have a meeting upstairs where a man will ask me the clearance rate. Tell me what you have, in numbers, because they don’t read.']);
  yield* say(p, ['Exhibits: ' + evidenceList(S).length + '. Score on the case: ' + caseScore(S) + '. Times burned: ' + S.burns + '. Overtime booked: ' + Math.max(0, Math.round(S.hour - 22)) + ' hours.']);
  yield* say(p, [v.text]);
  S.done = true; S.ending = v; toStage('done', true);
  endCase();
}

/* ---------- the board (the case file) ---------- */
function openBoard() {
  const ev = evidenceList(S), o = (OBJ[S.stage] || OBJ.done)();
  ui.show('board', { kicker: 'Detail office · ' + clockLabel(S.hour), title: 'Case file: the Pit', text: 'Calloway Homes, the Pit. Crew: Big Lorne (runs it), Sweets (counts it), Dray (moves it).',
    sections: [['Where you stand', o.title + (o.text ? '. ' + o.text : '')], ['Exhibits (' + ev.length + ')', ev.length ? ev.map(e => '• ' + e.label).join('\n') : 'Nothing yet. Nobody was ever convicted by a feeling.'], ['Budget', '$' + S.cash + ' left, $' + S.spent + ' spent. Burned ' + S.burns + ' of ' + MAX_BURNS + '.']],
    actions: [{ label: 'Close the file', primary: true, fn: () => ui.hide() }, ['Save the case', () => { game.saves.save(0); notify('Saved', 'Slot 1'); ui.hide(); }]] });
}

/* ---------- the wire minigame ---------- */
function startWire() {
  W = { step: 0, t: 0, done: false, msg: '', fumbles: 0, flash: 0, cd: 0 }; overlay = 'wire'; hero.crouch = true;
  A.sfx('select');
}
function updateWire(dt, ctl) {
  W.t += dt; W.flash = Math.max(0, W.flash - dt); W.cd = Math.max(0, W.cd - dt);
  if (ctl.cancel) { overlay = null; return; }
  const st = WIRE_STEPS[W.step], m = wireMarker(W.t, st.speed);
  if (ctl.press && W.cd <= 0) {
    if (wireHit(m, st.centre, st.width)) {
      A.sfx('wire_ok'); W.flash = .3; W.step++; W.msg = ''; W.t = 0;
      if (W.step >= WIRE_STEPS.length) { overlay = null; S.tapPlanted = true; S.hour += 1; notify('The tap is live', 'Clean work. The box on the pole is just a box.'); toStage('listen'); hint('listen', 'The van', 'Get in the van. When a line matters, hit ' + I.label('interact') + '.'); }
    } else { A.sfx('wire_bad'); W.fumbles++; S.tapFumbles++; W.msg = 'Fumbled. Slow down.'; W.cd = .5; addHeat(S, 12); game.shake && game.shake(1.5); }
  }
}
function drawWire(r) {
  r.overlay(g => {
    const w = Math.min(r.W - 20, 250), h = 60, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .62);
    E.ui.box(g, x, y, w, h, { bg: ['#10151b', '#0b0e12'], border: '#d8b070' });
    const st = WIRE_STEPS[Math.min(W.step, WIRE_STEPS.length - 1)];
    E.font.text(g, 'PAYPHONE TAP ' + (W.step + 1) + '/3: ' + st.label.toUpperCase(), x + w / 2, y + 7, '#e0b06a', { align: 'center' });
    const bx = x + 10, bw = w - 20, by = y + 28;
    E.px.rect(g, bx, by, bw, 10, '#222a33'); E.px.rect(g, bx + Math.round((st.centre - st.width / 2) * bw), by, Math.round(st.width * bw), 10, W.flash > 0 ? '#ffffff' : '#c08a3a');
    const m = wireMarker(W.t, st.speed); E.px.rect(g, bx + Math.round(m * bw) - 1, by - 3, 3, 16, '#f0f0f0');
    E.font.text(g, W.msg || (I.label('interact') + ' on the bright bar.  ' + I.label('cancel') + ' steps away.'), x + w / 2, y + 47, W.msg ? '#e07a5a' : '#a8a090', { align: 'center' });
  });
}

/* ---------- the listening post ---------- */
function startListen() {
  L = { call: 0, line: 0, t: 0, logged: 0, hit: false, phase: 'line', blip: 0, done: false, flashLine: 0, gap: 0, results: [] };
  overlay = 'listen'; hero.crouch = true; A.sfx('phone'); music('box', { fade: .6 }); A.duck && A.duck(false);
}
const curLine = () => CALLS[L.call].lines[L.line];
function updateListen(dt, ctl) {
  if (L.done) { if (ctl.press || ctl.cancel) finishListen(); return; }
  L.t += dt; L.blip -= dt;
  const ln = curLine(), dur = 2.3;
  if (L.phase === 'gap') { if (L.t > L.gap) { L.phase = 'line'; L.t = 0; } return; }
  if (L.blip <= 0 && L.t < dur - .4) { L.blip = .085; A.sfx('vx_' + CALLS[L.call].voice, { vol: .6 }); }
  if (ctl.press && !L.hit) {
    if (ln[1]) { L.hit = true; L.logged++; A.sfx('wire_ok'); L.flashLine = .5; } else { A.sfx('tick'); }
  }
  L.flashLine = Math.max(0, L.flashLine - dt);
  if (L.t >= dur) {
    L.results.push({ call: L.call, line: L.line, key: !!ln[1], hit: L.hit }); L.hit = false; L.t = 0; L.line++;
    if (L.line >= CALLS[L.call].lines.length) { L.call++; L.line = 0; L.phase = 'gap'; L.gap = 1.1; A.sfx('phone'); if (L.call >= CALLS.length) { L.done = true; A.sfx('powerup'); } }
  }
}
function finishListen() {
  overlay = null; S.wireLog = Math.max(S.wireLog, L.logged); S.listened = true; S.hour = Math.max(S.hour, 19) + 1.5; A.duck && A.duck(false);
  if (L.logged >= LISTEN_NEEDED) {
    toStage('chase'); startChaseStage();
    notify('Nine o’clock, the south gate', 'You have what you need: ' + L.logged + ' of ' + callPhraseCount() + ' phrases logged.');
    radio(KOW(), 'Brannock, Kowalczyk. You got it? Good. Dray moves the bag at nine, south gate of the Pit. Go be tall.', 4);
  } else {
    S.hour += 1; notify('Not enough', 'You logged ' + L.logged + '. The log needs ' + LISTEN_NEEDED + '. Listen again. Overtime keeps adding up.');
  }
}
function drawListen(r) {
  r.overlay(g => {
    const w = Math.min(r.W - 24, 300), h = 96, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
    E.ui.box(g, x, y, w, h, { bg: ['#0e1216', '#080a0d'], border: '#d8b070' });
    E.font.text(g, 'LISTENING POST - WIRE ROOM', x + 8, y + 6, '#e0b06a');
    // waveform
    const wy = y + 28; for (let i = 0; i < w - 16; i += 2) { const a = L.done || L.phase === 'gap' ? 1 : 3 + Math.abs(Math.sin(i * .21 + game.time * 18)) * 8 * (.4 + .6 * Math.abs(Math.sin(i * .05 + game.time * 3))); E.px.rect(g, x + 8 + i, wy - Math.round(a / 2), 1, Math.max(1, Math.round(a)), L.phase === 'line' && !L.done ? '#5ad08a' : '#2a5a3a'); }
    if (L.done) {
      E.font.text(g, 'LOG CLOSED: ' + L.logged + ' OF ' + callPhraseCount() + ' PHRASES', x + w / 2, y + 48, L.logged >= LISTEN_NEEDED ? '#8adf8a' : '#e07a5a', { align: 'center' });
      E.font.text(g, 'Press ' + I.label('interact') + ' to continue', x + w / 2, y + 72, '#a8a090', { align: 'center' });
    } else if (L.phase === 'gap') {
      E.font.text(g, 'CONNECTING …', x + w / 2, y + 52, '#a8a090', { align: 'center' });
    } else {
      const ln = curLine(), txt = ln[0].replace(/[{}]/g, ''), shown = Math.min(txt.length, Math.floor(L.t * 34));
      E.font.text(g, CALLS[L.call].who.toUpperCase() + ':', x + 8, y + 44, '#e0b06a');
      E.font.text(g, txt.slice(0, shown), x + 8, y + 56, ln[1] ? (L.hit ? '#8adf8a' : '#ffd36a') : '#c8c0b0', { wrap: w - 16 });
      E.font.text(g, 'Press ' + I.label('interact') + ' when a line matters   (' + L.logged + ' logged)', x + w / 2, y + h - 12, '#8a8478', { align: 'center' });
    }
  });
}

/* ---------- the chase ---------- */
function startChaseStage() {
  // Dray waits at the south gate with the bag; hero walks up; he bolts when he sees her
  const [gx, gy] = spawnXY('gate'); Object.assign(P.dray.body, { x: gx, y: gy, vx: 0, vy: 0 }); P.dray.mode = 'idle'; P.dray.pose = null; P.dray.face(gx, gy + 40);
  S.hour = Math.max(S.hour, 20.7); chase = { running: false, t: 0, wp: 0, done: false, cornered: false, trigger: 0, tackled: false };
}
function triggerChase() {
  if (!chase || chase.running) return; chase.running = true; chase.t = 0; chase.wp = 0; P.dray.mode = 'run'; music('chase', { fade: .4 });
  A.sfx('whistle'); radio(DRA(), 'Five-oh! Five-oh!', 2.2); hint('chase', 'Foot chase', 'Hold ' + I.label('sprint') + ' to sprint and go over low fences. Tackle with ' + I.label('tackle') + ' when you are close.');
}
function updateChase(dt) {
  if (!chase || chase.done) return;
  const d = P.dray, b = d.body;
  if (!chase.running) {
    const dist = Math.hypot(hero.x - d.x, hero.y - d.y); d.face(hero.x, hero.y);
    chase.trigger += dt; if (dist < 125 || chase.trigger > 60) triggerChase();
    return;
  }
  chase.t += dt;
  const wp = CHASE_ROUTE[Math.min(chase.wp, CHASE_ROUTE.length - 1)], [tx, ty] = cellXY(wp[0] - .5, wp[1] - .5);
  if (!chase.cornered) {
    if (Math.hypot(tx - d.x, ty - d.y) < 14) { chase.wp++; if (chase.wp >= CHASE_ROUTE.length) { chase.cornered = true; d.mode = 'idle'; d.pose = 'guard'; b.vx = b.vy = 0; notify('Cornered', 'He’s run out of alley.'); } }
    else {
      flow.update(tx, ty); const dir = flow.dir(d.x, d.y, tx, ty) || [0, 0], len = Math.hypot(dir[0], dir[1]) || 1;
      const tired = chase.t > 18 ? .8 : 1, sp = { move: [dir[0] / len * tired, dir[1] / len * tired], sprint: true, jumpPressed: !!b.hitWall && b.onGround };
      b.update(dt, map, sp); d.facing = b.facing;
      if (b.hitWall && b.onGround && (chase.vt = (chase.vt || 0) + dt) > .05) { chase.vt = 0; }
    }
  } else { d.face(hero.x, hero.y); b.update(dt, map, { move: [0, 0] }); }
  d.rig.update(dt, Object.assign({ x: b.x, y: b.y, z: b.z || 0, vx: b.vx, vy: b.vy, facing: d.facing, expr: 'shout' }, b.rigState ? b.rigState() : {}, d.pose ? { pose: d.pose } : {}));
  if (chase.t > 120) { chase.cornered = true; d.mode = 'idle'; }
}
function tackleAttempt() {
  if (!chase || !chase.running || chase.done) return false;
  const d = P.dray, dist = Math.hypot(hero.x - d.x, hero.y - d.y);
  if (dist <= 24) { tackleT = .35; arrest(true); return true; }
  tackleT = .35; A.sfx('swing'); return false;
}
function arrest(byTackle) {
  chase.done = true; S.chase.caught = true; S.chase.clean = byTackle && chase.t < 30 && !chase.cornered; S.chase.cornered = chase.cornered;
  P.dray.mode = 'idle'; P.dray.pose = 'down'; P.dray.body.vx = P.dray.body.vy = 0;
  game.hitFx && game.hitFx(P.dray.x, P.dray.y, 14, { power: 1.4, damage: 0, angle: hero.facing }); A.sfx('punch'); game.flash && game.flash('#ffffff', .12, .5);
  notify(S.chase.clean ? 'Clean arrest' : 'Arrested', S.chase.clean ? 'Down in the alley. Bag intact. Nobody hurt.' : 'It took longer than it should have.');
  runScript(function* () {
    yield 1.2;
    yield* say(DRA(), ['Aw, c’mon! C’mon! I ain’t got nothing!', 'It’s not even mine. I’m holding it for a friend.']);
    yield* say(hero_person(), ['Sure you are. Hands.']);
    toBox();
  }, true);
}
const hero_person = () => ({ name: 'DET. BRANNOCK', voice: 'det', rig: heroRig });
function toBox() {
  chase = null; overlay = null; W = null; L = null; autoWalk = null; toStage('box', true);
  A.sfx('door'); game.flash && game.flash('#000000', .4, 1);
  const [bx, by] = spawnXY('boxhero'), [sx, sy] = spawnXY('boxsuspect');
  Object.assign(hero, { x: bx, y: by, vx: 0, vy: 0 }); hero.crouch = false;
  Object.assign(P.dray.body, { x: sx, y: sy, vx: 0, vy: 0 }); P.dray.mode = 'idle'; P.dray.pose = 'kneel'; P.dray.face(bx, by); P.dray.expr = 'angry';
  try { game.saves.autosave(); } catch (e) { /* storage */ }
  music('box', { fade: .8 });
}

/* ---------- the box: Dray's interview, a Shell screen of choices ---------- */
let boxLine = '';
function startBox() {
  boxScreen = true; boxLine = 'He sits with his arms folded. The room smells like floor cleaner and old coffee. Five rounds, Detective. Pick them with care.';
  showBox();
}
function showBox() {
  const B = S.box;
  if (B.result) return endBox();
  const bar = n => '■'.repeat(Math.round(n / 10)) + '□'.repeat(10 - Math.round(n / 10));
  ui.show('box', {
    kicker: 'Interview Room 2 · Round ' + Math.min(B.round + 1, BOX_ROUNDS) + ' of ' + BOX_ROUNDS, title: 'Dray',
    text: () => 'Resolve  ' + bar(B.resolve) + '   ' + B.resolve + '\n\n' + boxLine,
    actions: () => boxOptions(S).map((o, i) => ({ label: o.label, primary: i === 0, fn: () => pickBox(o.id) }))
  });
}
function pickBox(id) {
  const res = boxPlay(S, id, gameRng);
  boxLine = res.line + (res.dmg ? '  (−' + res.dmg + ')' : '');
  A.sfx(res.tag === 'hit' ? 'hit' : res.tag === 'hard' ? 'punch' : res.tag === 'miss' ? 'cancel' : 'select');
  if (S.box.result) { endBox(); return; }
  ui.show('box', { focus: 0 }); showBox();
}
function endBox() {
  const B = S.box, flipped = B.result === 'flipped';
  ui.show('box', {
    kicker: 'Interview Room 2', title: flipped ? 'He talks' : 'He wants his lawyer',
    text: flipped ? '“Calloway. Seventeen-twelve. The back door’s got a key under the third brick. I ain’t never said that.”\n\nThe pen moves. The recorder runs. It is the quietest minute of the case.' : '“I want my lawyer.”\n\nHe says it like a prayer he learned in school. The tape stops. So does the case, a little.',
    actions: [{ label: 'Leave the room', primary: true, fn: () => leaveBox() }]
  });
}
function leaveBox() { const flipped = S.box.result === 'flipped'; ui.hide(); boxScreen = false; P.dray.expr = null; toStage('report'); notify(flipped ? 'A statement' : 'No statement', 'Brief Lt. Pruitt upstairs.'); }
const gameRng = () => Math.random();

/* ---------- interactions: what the detective can walk up to ---------- */
function interactables() {
  const out = []; const add = (id, who, label, run, o = {}) => out.push(Object.assign({ id, x: who.x, y: who.y, label, run }, o));
  add('kowalczyk', P.kowalczyk, S.stage === 'brief' ? 'Talk to Sgt. Kowalczyk' : 'Talk to Kowalczyk', () => runScript(S.stage === 'brief' ? convBrief() : convKowIdle()));
  const bd = { x: spawnXY('board')[0], y: spawnXY('board')[1] }; add('board', bd, 'Check the case file', () => { try { game.saves.autosave(); } catch (e) { /* storage */ } openBoard(); });
  add('tooley', P.tooley, 'Talk to Tooley', () => runScript(convTooley()));
  add('pruitt', P.pruitt, S.stage === 'report' ? 'Brief Lt. Pruitt' : 'Talk to Lt. Pruitt', () => runScript(convPruitt()));
  const ph = { x: spawnXY('payphone')[0], y: spawnXY('payphone')[1] };
  add('payphone', ph, S.stage === 'wire' ? 'Tap the payphone' : 'Payphone', () => { if (S.stage === 'wire') startWire(); else notify(S.tapPlanted ? 'The tap is live' : 'Just a payphone', S.tapPlanted ? 'It rings, somebody talks, you listen.' : 'Not yet.'); });
  const vn = { x: spawnXY('van')[0], y: spawnXY('van')[1] };
  add('van', vn, S.tapPlanted ? 'Get in the van and listen' : 'The surveillance van', () => { if (S.tapPlanted && S.stage === 'listen') startListen(); else notify('The van', S.tapPlanted ? 'You already have what you need from it.' : 'No wire, no calls.'); });
  if (S.stage === 'box') add('dray', P.dray, 'Interview Dray', () => startBox());
  if (chase && chase.cornered && !chase.done) add('cuff', P.dray, 'Cuff him', () => arrest(false));
  return out;
}
function pickInteract() {
  const list = interactables(); let best = null, bd = 1e9;
  for (const o of list) { const d = Math.hypot(o.x - hero.x, o.y - hero.y); if (d < REACH + (o.id === 'board' ? 8 : 0) && d < bd) { best = o; bd = d; } }
  return { best, list };
}

/* ---------- control reading: the human (stick, keys, mouse) or the attract pilot ---------- */
function readControls() {
  if (pilotCtl) return pilotCtl;
  const m = I.move(), g = game.view.screenDirToGround(m[0], m[1]);
  const ctl = { move: [g[0], g[1]], sprint: I.down('sprint'), crouchPress: I.pressed('crouch'), camera: I.down('camera'), interact: I.pressed('interact'), tackle: I.pressed('tackle'), board: I.pressed('board'), view: I.pressed('view'), cancel: I.pressed('cancel'), manual: Math.hypot(m[0], m[1]) > .1, aim: null };
  // the lens points at the mouse, the right stick, or where the detective faces
  if (I.lastDevice === 'mouse') { const mg = game.mouseGround(); if (mg) ctl.aim = Math.atan2(mg[1] - hero.y, mg[0] - hero.x); }
  else if (I.padAim && I.lastDevice === 'gamepad') { const a = game.view.screenDirToGround(I.padAim[0], I.padAim[1]); ctl.aim = Math.atan2(a[1], a[0]); }
  return ctl;
}

/* ---------- the frame ---------- */
function lookoutsActive() { return !demo ? ['surveil', 'tip', 'wire'].includes(S.stage) : ['surveil', 'tip', 'wire'].includes(S.stage); }
function stepWorld(dt, ctl) {
  sprintingNow = !!ctl.sprint && ctl.manual !== false;
  // time
  if (!overlay && !boxScreen && S.stage !== 'done') S.hour += dt / 45;
  // the detective
  if (ctl.crouchPress && !overlay) hero.crouch = !hero.crouch;
  const cam = !!ctl.camera && S.stage !== 'brief' && !overlay && !chase && !boxScreen; camRaised = cam;
  if (cam) aimAng = ctl.aim !== null && ctl.aim !== undefined ? ctl.aim : hero.facing;
  let move = ctl.move;
  if (overlay || boxScreen) move = [0, 0];
  else if (autoWalk) {
    if (ctl.manual) autoWalk = null;
    else { const d = Math.hypot(autoWalk.x - hero.x, autoWalk.y - hero.y); if (d < REACH - 6) { const a = autoWalk; autoWalk = null; a.run && a.run(); } else { flow.update(autoWalk.x, autoWalk.y); const dir = flow.dir(hero.x, hero.y, autoWalk.x, autoWalk.y) || [0, 0], l = Math.hypot(dir[0], dir[1]) || 1; move = [dir[0] / l, dir[1] / l]; } }
  }
  const spr = ctl.sprint && !cam && !overlay;
  if (hero.crouch && spr) hero.crouch = false;
  const intent = { move: cam ? [move[0] * .5, move[1] * .5] : move, sprint: spr, crouch: hero.crouch, jumpPressed: !!(spr && hero.hitWall && hero.onGround) };
  if (intent.jumpPressed) S.vaults++;
  hero.update(dt, map, intent);
  if (cam) hero.facing = aimAng;
  tackleT = Math.max(0, tackleT - dt);
  heroRig.update(dt, Object.assign(hero.rigState(), cam ? { pose: 'guard', stance: 'guard' } : {}, tackleT > 0 ? { attack: E.move('bash', 1 - tackleT / .35) } : {}));
  // people
  for (const [, p] of crewList()) if (p !== P.dray || !chase || !chase.running) p.update(dt, map, hero);
  for (const k of ['kowalczyk', 'pruitt', 'tooley']) { P[k].update(dt, map, hero); if (Math.hypot(P[k].x - hero.x, P[k].y - hero.y) < 70) P[k].face(hero.x, hero.y); }
  for (const w of walkers) w.update(dt, map, hero);
  for (const [, p] of crewList()) { if (p.wary > 0) { p.wary -= dt; p.pose = p === P.dray && chase ? p.pose : 'guard'; p.expr = 'angry'; if (p.wary <= 0) { p.pose = p === P.lorne ? 'hips' : null; p.expr = null; } } }
  // lookouts and heat
  let anySeen = false;
  const act = lookoutsActive() && !demo;
  for (const lk of lookouts) {
    lk.update(dt); lk.seen = false;
    if (!act) { lk.alert = Math.max(0, lk.alert - dt); continue; }
    const r = lookoutSees(lk, hero, map, { sprinting: hero.sprinting, camera: cam });
    if (r.seen && r.exposure > .05 && lk.cool <= 0) {
      lk.seen = true; anySeen = true;
      const d = r.d || 60, rate = (.55 + r.exposure * .8) * (1.4 - Math.min(1, d / lk.range) * .8) * (hero.crouch ? .55 : 1) * (hero.sprinting ? 1.5 : 1) * (cam ? 1.35 : 1) * (overlay === 'wire' ? .8 : 1);
      lk.alert += dt * rate * .6;
      if (lk.alert >= 1) whistle(lk);
    } else lk.alert = Math.max(0, lk.alert - dt * .5);
  }
  if (!anySeen && !demo) S.heat = Math.max(0, S.heat - dt * (S.approach === 'book' ? 1.9 : 1.2));
  if (demo) S.heat = 0;
  // photographs
  photoWho = null;
  if (cam && S.stage === 'surveil') {
    for (const [k, p] of crewList()) {
      if (S.photos[k]) continue;
      const dist = Math.hypot(p.x - hero.x, p.y - hero.y);
      const inCone = dist < 150 && Math.abs(E.angDiff ? E.angDiff(aimAng, Math.atan2(p.y - hero.y, p.x - hero.x)) : 0) < .2 && map.sight({ x: hero.x, y: hero.y, z: hero.z || 0, eye: hero.crouch ? 14 : 30 }, { x: p.x, y: p.y, z: p.z || 0 });
      if (inCone && p.wary <= 0) { photoWho = k; const pr = photoStep(S, k, dt * (S.approach === 'corners' ? 1.15 : 1)); if (pr >= 1 && S.photos[k]) photoTaken(k); break; }
    }
  }
  for (const [k] of crewList()) if (k !== photoWho) photoDecay(S, k, dt);
  // the chase
  updateChase(dt);
  if (chase && chase.running && !chase.done && ctl.tackle) tackleAttempt();
  // heat burns the case
  if (S.heat >= 100 && !S.done && !overlay) doBurn();
  // proximity to the south gate starts the chase stage's trigger; hub progress
  if (S.stage === 'brief' && demo) { /* the pilot walks it */ }
}
function whistle(lk) {
  lk.alert = .35; lk.cool = 5; lk.whistled = 1.4; A.sfx('whistle'); game.shake && game.shake(1.2);
  for (const [, p] of crewList()) p.wary = 9;
  const burned = addHeat(S, 38); S.seenCount++;
  notify('Five-oh!', lk.name + ' whistled. The corner went quiet.'); if (burned) doBurn();
}
function photoTaken(k) {
  A.sfx('shutter'); game.flash && game.flash('#ffffff', .1, .7); notify('Photograph: ' + CREW[k], photoCount(S) + ' of 3', 2.6);
  game.particles && game.particles.glints && game.particles.glints(P[k].x, P[k].y, 24, 6, '#ffffff');
  if (photoCount(S) === 3) { toStage('tip'); notify('The crew is on film', 'Now find Tooley, outside Ruthie’s.'); }
}
function doBurn() {
  if (overlay) overlay = null;
  const shut = burn(S);
  A.sfx('wire_bad'); game.flash && game.flash('#000000', .5, 1);
  placeHero('hero'); hero.crouch = false;
  for (const lk of lookouts) { lk.alert = 0; lk.cool = 6; }
  if (shut) { endCase(); return; }
  radio(KOW(), 'Brannock. They went inside and pulled the shades. You’re burned for the evening. Burn ' + S.burns + ' of ' + MAX_BURNS + '. Come back, have a coffee, think about your life.', 5);
  notify('Burned', 'The corner knows your face. Five hours and twenty dollars gone.');
}

/* ---------- ending ---------- */
function endCase() {
  if (resultsShown) return; resultsShown = true;
  const v = S.ending || verdict(S);
  if (S.shutDown) S.ending = v;
  music('report', { fade: 1 }); A.sfx('oneup');
  if (HUB && HUB.active && !sessionEnded) { sessionEnded = true; try { HUB.result({ score: caseScore(S), stats: { exhibits: evidenceList(S).length, burns: S.burns, rank: v.rank }, awards: S.box.result === 'flipped' ? [{ title: 'He talked', detail: 'Dray named the stash house' }] : [] }); } catch (e) { /* hub gone */ } }
  game.after(.6, () => showResults(v));
}
function showResults(v) {
  ui.show('results', { kicker: demo ? 'The detail · demonstration' : 'Closing report', title: v.title, text: v.text, stats: resultStats(S), medals: medals(S),
    actions: demo ? [] : IN_SESSION ? [{ label: 'The hub takes it from here', primary: true, fn: () => {} }] : [{ label: 'Work another case', primary: true, fn: () => { ui.hide(); startCase(); } }, ['Back to the title', () => { ui.hide(); game.go('title'); }]] });
}

/* ---- 60-scenes.js ---- */
/* ============================================================================
 * scenes: title, play (and the attract mode, which is play with a pilot), about, and the AI Hub round
 * ========================================================================== */
const PLACE = 'Calloway Homes · East Side';
const STAGE_NAME = { brief: 'Briefing', surveil: 'Surveillance', tip: 'The informant', wire: 'The wire', listen: 'The van', chase: 'The run', box: 'The box', report: 'The report', done: 'Closed' };
let saveBlob = null, talkCool = 0;

function startCase(opts = {}) {
  S = newCase(opts.stage ? { stage: opts.stage } : {}); resultsShown = false; hintShown = {}; demo = false; pilotCtl = null; sessionEnded = false; lastToast = '';
  game.go('play', Object.assign({ fresh: true }, opts));
}
function startAttract() { S = newCase(); resultsShown = false; hintShown = {}; demo = true; userPoked = false; pilotInit(); game.go('play', { demo: true, fresh: true }); }

game.saves.write = () => ({ data: { S: JSON.parse(JSON.stringify(S, (k, v) => k === '_ph' ? undefined : v)), hero: { x: hero ? hero.x : 0, y: hero ? hero.y : 0 }, ph: S._ph || {} }, place: PLACE, level: STAGE_NAME[S.stage] });
game.saves.read = save => { saveBlob = save.data; demo = false; pilotCtl = null; resultsShown = false; hintShown = {}; S = Object.assign(newCase(), saveBlob.S); S._ph = saveBlob.ph || {}; game.go('play', { load: true }); };
game.saves.canSave = true;

/* ---------- title ---------- */
let titleMenu = null, titleT = 0, titleIdle = 0, titleMode = 'menu';
const SKY = []; for (let i = 0; i < 46; i++) SKY.push({ x: (i * 37) % 340, w: 18 + (i * 13) % 26, h: 40 + (i * 29) % 70, lit: (i * 7) % 5 });
function makeTitleMenu() {
  const saved = game.saves.latest();
  const items = [{ label: 'Start the case' }, { label: 'Continue', disabled: !saved }, { label: 'Settings' }, { label: 'About and credits' }];
  titleMenu = new E.Menu(game, items, { x: 'center', y: 128, box: true, bg: '#10141a', border: '#d8b070', color: '#d8d0c0', pick: '#ffd36a', dim: '#5a5a64',
    onPick: i => {
      if (touchOnly() && i < 2) return;
      if (i === 0) startCase(); else if (i === 1) { const s = game.saves.latest(); if (s) game.saves.load(s.slot); }
      else if (i === 2) game.menu('settings'); else showAbout();
    } });
}
const title = {
  enter() { makeTitleMenu(); titleT = 0; lastUserInput = performance.now(); userPoked = false; demo = false; pilotCtl = null; music('title', { fade: 1 }); ui.hud({}); scaleUI(); },
  update(dt) {
    titleT += dt; pollPadPoke();
    if (ui.screen) { lastUserInput = performance.now(); return; }
    if (titleMenu) titleMenu.update(dt);
    if (performance.now() - lastUserInput > 10000) { startAttract(); }
  },
  draw(r) {
    r.sky(['#06080d', '#141a26', '#2a2430']);
    const W = r.W, H = r.H, cy = Math.round(H * .62);
    r.overlay(g => {
      // skyline of rowhouses, lit windows, a cold street lamp, rain
      for (let pass = 0; pass < 2; pass++) for (const b of SKY) {
        const bx = Math.round((b.x * (pass ? 1.3 : 1) + pass * 11) % (W + 40)) - 20, bh = b.h + pass * 18, bw = b.w + pass * 5, top = cy - bh;
        E.px.rect(g, bx, top, bw, bh + 80, pass ? '#0b0d12' : '#161a22');
        E.px.rect(g, bx, top, bw, 2, pass ? '#1a1e28' : '#2a303c');
        for (let wy = top + 8; wy < cy - 6; wy += 11) for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) { const on = ((wx * 7 + wy * 13 + b.lit) % 9) < 2; if (on) E.px.rect(g, wx, wy, 3, 5, pass ? '#6a5a30' : '#c89a48'); }
      }
      E.px.rect(g, 0, cy, W, H - cy, '#0a0b10');
      E.px.rect(g, 0, cy, W, 2, '#2a2e38');
      const lx = Math.round(W * .82); E.px.rect(g, lx, cy - 74, 2, 74, '#2a2e38'); E.px.rect(g, lx - 8, cy - 76, 12, 3, '#2a2e38');
      px_glow(g, lx - 3, cy - 72, 40, '#ffd890');
      for (let i = 0; i < 70; i++) { const rx = Math.round(((i * 53 + titleT * 40) % (W + 20)) - 10), ry = Math.round(((i * 97 + titleT * 260) % (H + 20)) - 10); E.px.line(g, rx, ry, rx - 2, ry + 6, 'rgba(140,160,190,.35)'); }
      E.font.title(g, 'WIRE TAP DANCE', Math.round(W / 2), Math.round(H * .13), { scale: 3, align: 'center', colors: ['#f4e2b8', '#d8a850', '#8a5a28'], depth: 2, depthColor: '#2a1a0a' });
      E.font.text(g, 'A spiritual successor to the street-level detective drama', Math.round(W / 2), Math.round(H * .13) + 36, '#b8a888', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Nobody gets convicted by a feeling.', Math.round(W / 2), Math.round(H * .13) + 48, '#8a8478', { align: 'center', shadow: '#000' });
    });
    if (titleMenu) { titleMenu.y = Math.round(H * .44); titleMenu.draw(r); }
    r.text(('Move: ' + (I.lastDevice === 'gamepad' ? 'D-pad or left stick' : 'W S, arrows or mouse') + '    Pick: ' + I.label('confirm')).toUpperCase(), r.W / 2, r.H - 26, '#a8a090', { align: 'center', shadow: '#000' });
    if (touchOnly()) {
      r.overlay(g => { const w = Math.min(W - 20, 260); E.ui.box(g, Math.round(W / 2 - w / 2), Math.round(H * .32), w, 34, { bg: ['#2a1410', '#1a0c08'], border: '#e07a5a' }); E.font.text(g, 'CONTROLLER OR KEYBOARD REQUIRED', Math.round(W / 2), Math.round(H * .32) + 6, '#ffb09a', { align: 'center' }); E.font.text(g, 'This game has no touch controls. Settings are open to you.', Math.round(W / 2), Math.round(H * .32) + 18, '#c8a898', { align: 'center' }); });
    }
    r.text(('v' + (E.version || '') + ' - ' + (10 - Math.min(10, Math.floor((performance.now() - lastUserInput) / 1000))) + 's to the demonstration').toUpperCase(), 6, r.H - 12, '#4a4a54');
  }
};
function px_glow(g, x, y, rad, col) { E.px.blend(g, .22, 'add', () => { for (let k = 4; k > 0; k--) E.px.disc(g, x, y, Math.round(rad * k / 4), col); }); }

/* ---------- about and credits: the source information, shown in the game as it is in the report ---------- */
function showAbout() {
  ui.show('about', { kicker: 'Credits', title: TITLE, text: 'An original spiritual successor to The Wire (2002–2008).', sections: ABOUT_SECTIONS,
    actions: [{ label: 'Back', primary: true, fn: () => ui.hide() }] });
}

/* ---------- play ---------- */
const play = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], camera: { zoom: [.6, 2.2], start: .75 },
  enter(data) {
    data = data || {};
    if (data.demo) demo = true; else if (data.fresh) demo = false;
    const loading = !!data.load;
    try { ui.hide(); } catch (e) { /* no screen open */ }
    talkCool = 0; buildWorld();
    if (loading && saveBlob) { Object.assign(hero, { x: saveBlob.hero.x, y: saveBlob.hero.y }); fixupAfterLoad(); }
    if ((data.fresh || IN_SESSION) && IN_SESSION && !data.load) { S.approach = 'book'; S.stage = 'surveil'; Object.assign(hero, { x: 10.5 * T16, y: 11.5 * T16 }); }
    if (data.fresh && data.stage && STAGE_START[data.stage]) STAGE_START[data.stage]();
    game.follow(hero, { z: 16 }); game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .8;
    game.weather = { kind: 'rain', amount: .28, wind: .15, lightning: 0 };
    music(({ chase: 'chase', box: 'box', report: 'report' })[S.stage] || (S.stage === 'brief' ? 'title' : 'stealth'), { fade: 1 });
    A.sfx('door'); resultsShown = !!S.done && resultsShown;
    if (!demo) { if (S.stage === 'brief') hint('start', 'The detail office', 'Walk to Sgt. Kowalczyk and press ' + I.label('interact') + '. ' + I.label('board') + ' opens the case file. ' + I.label('view') + ' changes the camera view.'); }
    scaleUI();
  },
  exit() { game.lights.enabled = false; game.weather = null; ui.hud({}); ui.tutorial && ui.tutorial(null); music(null); },
  update(dt) {
    pollPadPoke();
    if (demo && userPoked) { userPoked = false; ui.hide && ui.hide(); demo = false; pilotCtl = null; game.go('title'); return; }
    // the AI Hub holds a round until its clock says go
    if (IN_SESSION && HUB.time() < 0) { hudTick(); return; }
    if (IN_SESSION) hubTick(dt);
    if (demo) pilotThink(dt);
    if (ui.screen) { talkCool = .3; hudTick(); return; }
    if (talk.update(dt)) { talkCool = .3; tickRigs(dt); hudTick(); return; }
    talkCool = Math.max(0, talkCool - dt);
    const ctl = readControls(), now = !!(overlay || boxScreen);
    if (talkCool > 0 && !pilotCtl) { ctl.interact = false; ctl.board = false; }
    if (!now && !demo && ctl.board) { openBoard(); hudTick(); return; }
    if (ctl.view) { game.nextView(); game.note && game.note('VIEW: ' + game.view.label); }
    if (overlay === 'wire') updateWire(dt, { press: ctl.interact, cancel: ctl.cancel });
    else if (overlay === 'listen') updateListen(dt, { press: ctl.interact, cancel: ctl.cancel });
    // mouse: hover moves the focus; a click walks up to a thing and does it
    hover = null;
    const pick = pickInteract();
    if (!overlay && !boxScreen && I.lastDevice === 'mouse' && !demo) {
      const mg = game.mouseGround();
      if (mg) { let bd = 18; for (const o of pick.list) { const d = Math.hypot(o.x - mg[0], o.y - mg[1]); if (d < bd) { bd = d; hover = o; } } }
      const c = I.clicked();
      if (c && !ctl.camera) { const g = game.view.toGround(c[0], c[1]); if (g) { let h = null, bd2 = 18; for (const o of pick.list) { const d = Math.hypot(o.x - g[0], o.y - g[1]); if (d < bd2) { bd2 = d; h = o; } } if (h) { if (Math.hypot(h.x - hero.x, h.y - hero.y) < REACH) h.run(); else autoWalk = h; } else autoWalk = { x: g[0], y: g[1], run: null }; } }
    }
    if (!now && !overlay && !boxScreen && ctl.interact && pick.best && !busyScript()) pick.best.run();
    stepWorld(dt, ctl);
    if (S.stage === 'wire' && S.heat < 100 && false) return;
    hudTick(pick.best);
  },
  draw(r) { drawWorld(r); }
};
const busyScript = () => !!(scriptTask && !scriptTask.done);
function tickRigs(dt) { heroRig.update(dt, hero.rigState()); for (const lk of lookouts) lk.update(dt); for (const w of walkers) w.update(dt, map, hero); }

function hudTick(best) {
  if (!ui.root) return;
  const o = (OBJ[S.stage] || OBJ.done)(), ev = evidenceList(S).length;
  const keys = I.lastDevice === 'gamepad'
    ? [['L Stick', 'Move'], [I.label('sprint'), 'Sprint'], [I.label('crouch'), 'Crouch'], [I.label('camera'), 'Camera'], [I.label('interact'), 'Interact'], [I.label('board'), 'Case file']]
    : [['WASD', 'Move'], [I.label('sprint'), 'Sprint'], [I.label('crouch'), 'Crouch'], [I.label('camera'), 'Camera'], [I.label('interact'), 'Interact'], [I.label('board'), 'Case file'], [I.label('view'), 'View']];
  const bars = []; if (lookoutsActive() && !demo) bars.push({ label: 'Heat', value: S.heat, max: 100, color: S.heat > 66 ? '#e0583a' : '#e0b06a' });
  if (hero && hero.stamina < hero.staminaMax - 1) bars.push({ label: 'Wind', value: hero.stamina, max: hero.staminaMax, color: hero.exhausted ? '#e0583a' : '#7ac08a' });
  const photoP = photoWho && S._ph ? S._ph[photoWho] : 0;
  const prompt = overlay || boxScreen || (S.done && !demo) ? null : photoWho ? { label: 'Photographing ' + CREW[photoWho], progress: photoP, hint: 'Hold steady' } : best ? { act: 'interact', label: best.label, hint: hover === best ? 'Click or ' + I.label('interact') : 'Interact' } : null;
  const mk = []; if (o.at) mk.push({ x: o.at.x, y: o.at.y, kind: 'diamond', color: '#ffd36a' });
  for (const [k, p] of crewList()) if (S.photos[k]) mk.push({ x: p.x, y: p.y, kind: 'dot', color: '#e07a5a' });
  try {
    ui.hud({ objective: S.done ? null : { step: String(Math.max(1, STAGES.indexOf(S.stage) + 1)).padStart(2, '0') + ' / 08', title: o.title, text: o.text, at: o.at ? { x: o.at.x, y: o.at.y, z: 0 } : undefined, from: o.at ? hero : undefined },
      status: { text: clockLabel(S.hour) + ' · ' + STAGE_NAME[S.stage].toUpperCase(), color: S.heat > 66 ? '#e0583a' : '#e0b06a' }, place: PLACE, bars, counts: [['Budget', '$' + S.cash], ['Exhibits', String(ev)]],
      prompt, keys: demo ? null : keys, minimap: demo || overlay ? null : { map, at: { x: hero.x, y: hero.y, facing: hero.facing }, markers: mk, camera: true } });
  } catch (e) { game.fail('hud', e); }
}

function drawWorld(r) {
  const dark = darkness(S.hour); game.lights.ambient = .86 - .56 * dark; game.lights.enabled = true;
  { const tag = map.floorAt(hero.x, hero.y), indoors = tag === 'wood' || tag === 'tile'; game.weather = indoors ? null : { kind: 'rain', amount: .2 + dark * .25, wind: .15, lightning: 0 }; }
  map.drawFloor(r);
  // decals: lookouts' cones, the lens, the objective ring
  const o = (OBJ[S.stage] || OBJ.done)();
  if (game.settings.cones && lookoutsActive() && !demo) for (const lk of lookouts) r.decal(() => r.groundArc(lk.x, lk.y, 4, lk.range, lk.facing - lk.fov / 2, lk.facing + lk.fov / 2, lk.alert > .01 ? '#ff5a3a' : '#ffe08a', lk.alert > .01 ? .22 + lk.alert * .3 : .12));
  if (camRaised) r.decal(() => r.groundArc(hero.x, hero.y, 4, 150, aimAng - .2, aimAng + .2, photoWho ? '#9affc0' : '#ffffff', photoWho ? .35 : .2));
  if (o.at && !S.done) r.decal(() => r.groundArc(o.at.x, o.at.y, 6 + Math.sin(game.time * 4) * 1.5, 11, 0, Math.PI * 2, '#ffd36a', .45));
  if (hover) r.decal(() => r.groundArc(hover.x, hover.y, 8, 12, 0, Math.PI * 2, '#ffffff', .55));
  // set dressing
  for (const d of DRESS) { try { if (d.k === 'prop') r.prop(d.n, d.x * T16, d.y * T16, 0, { light: !!d.light }); else if (E.SHAPES && E.SHAPES[d.n]) r.shape(d.n, d.x * T16, d.y * T16, 0, { facing: d.facing || 0 }); } catch (e) { /* skip a prop that will not draw */ } }
  map.queueWalls(r);
  const actors = [[hero, heroRig, hero], ...Object.values(P).map(p => [p, p.rig, p.body]), ...walkers.map(p => [p, p.rig, p.body]), ...lookouts.map(l => [l, l.rig, l])];
  for (const [who, rig, b] of actors) {
    r.shadow(who.x, who.y, 6.5, .35, undefined, b.groundZ || 0);
    r.actor(who.x, who.y, who.z || 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: who === hero ? { color: '#8ad0ff' } : undefined });
  }
  game.lights.add(hero.x, hero.y, 24, 54, .35, { color: '#ffe8c0' });
  // billboards: photographs in progress, names, alerts
  r.overlay(g => {
    if (camRaised) for (const [k, p] of crewList()) { if (S.photos[k]) continue; const s = r.w(p.x, p.y, 46); E.font.text(g, CREW[k].toUpperCase(), s[0], s[1] - 8, photoWho === k ? '#9affc0' : '#e8e0d0', { align: 'center', shadow: '#000' }); if (photoWho === k && S._ph) E.ui.bar(g, s[0] - 14, s[1] + 2, 28, 4, S._ph[k] || 0, '#9affc0'); }
    for (const lk of lookouts) if (lk.alert > .02) { const s = r.w(lk.x, lk.y, 44); E.font.text(g, '!', s[0], s[1] - 10, lk.alert > .7 ? '#ff5a3a' : '#ffd36a', { align: 'center', shadow: '#000', scale: 2 }); E.ui.bar(g, s[0] - 10, s[1] + 4, 20, 3, Math.min(1, lk.alert), '#ff5a3a'); }
    if (autoWalk && autoWalk.x) { const s = r.w(autoWalk.x, autoWalk.y, 0); E.px.rect(g, Math.round(s[0]) - 1, Math.round(s[1]) - 1, 3, 3, '#ffd36a'); }
  });
  if (overlay === 'wire' && W) drawWire(r);
  if (overlay === 'listen' && L) drawListen(r);
  if (demo) r.text(('DEMONSTRATION - PRESS ANY BUTTON').toUpperCase(), r.W / 2, r.H - 18, Math.floor(game.time * 2) % 2 ? '#ffffff' : '#b8a888', { align: 'center', shadow: '#000' });
  talk.draw(r);
}
function fixupAfterLoad() {
  // put the people where the saved stage expects them
  if (S.stage === 'chase') startChaseStage();
  if (S.stage === 'box') toBox();
  if (S.stage === 'report' || S.stage === 'done') { P.dray.pose = 'kneel'; const [sx, sy] = spawnXY('boxsuspect'); Object.assign(P.dray.body, { x: sx, y: sy }); }
}
const STAGE_START = {   // for tests: begin a fresh case at a later stage
  surveil() { S.approach = 'book'; },
  tip() { S.approach = 'book'; S.photos = { lorne: true, sweets: true, dray: true }; },
  wire() { STAGE_START.tip(); S.tip = 'paid'; },
  listen() { STAGE_START.wire(); S.tapPlanted = true; },
  chase() { STAGE_START.listen(); S.wireLog = 4; startChaseStage(); },
  box() { STAGE_START.chase(); S.chase.caught = true; S.chase.clean = true; toBox(); },
  report() { STAGE_START.box(); S.box.result = 'flipped'; }
};

/* ---------- the pilot: the attract mode plays the case with cheats (no heat, a quick sprint, a free tap) ---------- */
let pilot = null;
function pilotInit() { pilot = { i: 0, t: 0, nav: 0, wait: 0, did: false, stuck: 0, last: null, confirmT: 0, boxT: 0 }; }
function pilotWalk(x, y, within, ctl) {
  const d = Math.hypot(x - hero.x, y - hero.y);
  if (d <= within) return true;
  flow.update(x, y); const dir = flow.dir(hero.x, hero.y, x, y) || [0, 0], l = Math.hypot(dir[0], dir[1]) || 1;
  ctl.move = [dir[0] / l, dir[1] / l]; ctl.sprint = true; ctl.manual = false;
  const p = pilot; if (p.last && Math.hypot(hero.x - p.last[0], hero.y - p.last[1]) < .3) p.stuck += 1 / 60; else p.stuck = 0; p.last = [hero.x, hero.y];
  if (p.stuck > 1.6) { Object.assign(hero, { x: hero.x + ctl.move[0] * 20, y: hero.y + ctl.move[1] * 20, vx: 0, vy: 0 }); p.stuck = 0; }
  return false;
}
function pilotThink(dt) {
  const p = pilot || (pilotInit(), pilot), ctl = { move: [0, 0], sprint: false, camera: false, interact: false, tackle: false, board: false, view: false, cancel: false, manual: false, aim: null };
  hero.sprintSpeed = 150; hero.stamina = hero.staminaMax; S.heat = 0;
  for (const lk of lookouts) lk.alert = 0;
  p.t += dt; pilotCtl = ctl;
  // dialogue, the box and results run themselves
  if (talk.open) { p.confirmT += dt; if (p.confirmT > .9) { p.confirmT = 0; I.tap('confirm'); } return; }
  if (ui.screen || boxScreen) {
    if (boxScreen) { p.boxT += dt; if (p.boxT > 1.6) { p.boxT = 0; if (S.box.result) { leaveBox(); } else { const opts = boxOptions(S), order = ['wire', 'photo', 'tip', 'chase', 'soft', 'deal', 'bluff']; const id = (order.map(k => opts.find(o => o.id === k)).find(Boolean) || opts[0]).id; pickBox(id); } } return; }
    if (resultsShown) { p.wait += dt; if (p.wait > 9) { ui.hide(); p.wait = 0; resultsShown = false; startAttract(); } return; }
    return;
  }
  if (busyScript()) return;
  if (overlay === 'wire') { const st = WIRE_STEPS[Math.min(W.step, 2)], m = wireMarker(W.t, st.speed); if (Math.abs(m - st.centre) < .035) ctl.interact = true; return; }
  if (overlay === 'listen') { if (L.done) { p.wait += dt; if (p.wait > 1.4) { ctl.interact = true; p.wait = 0; } } else if (L.phase === 'line' && curLine()[1] && !L.hit && L.t > .5) ctl.interact = true; return; }
  const near = (tag, within = 18, i = 0) => { const [x, y] = spawnXY(tag, i); return pilotWalk(x, y, within, ctl); };
  const go = (id) => { const o = interactables().find(q => q.id === id); if (o) o.run(); };
  const stg = S.stage;
  if (S.done) return;
  if (stg === 'brief') { if (p.t < 1.2) return; if (near('kowalczyk', 18)) go('kowalczyk'); }
  else if (stg === 'surveil') {
    const k = crewList().find(([n]) => !S.photos[n]); if (!k) return;
    const [n, c] = k, spots = { lorne: [34.5, 26.5], sweets: [34.5, 25.5], dray: [38.5, 27.5] }, [sx, sy] = cellXY(...spots[n]);
    if (pilotWalk(sx, sy, 10, ctl)) { ctl.camera = true; ctl.aim = Math.atan2(c.y - hero.y, c.x - hero.x); c.wary = 0; ctl.sprint = false; }
  }
  else if (stg === 'tip') { if (near('tooley', 18)) go('tooley'); }
  else if (stg === 'wire') { if (near('payphone', 14)) go('payphone'); }
  else if (stg === 'listen') { if (near('van', 14)) go('van'); }
  else if (stg === 'chase') {
    if (!chase) return; if (!chase.running) { near('gate', 60); return; }
    P.dray.body.sprintSpeed = 96; if (pilotWalk(P.dray.x, P.dray.y, 18, ctl)) ctl.tackle = true; if (chase.cornered && !chase.done) { if (Math.hypot(P.dray.x - hero.x, P.dray.y - hero.y) < 22) go('cuff'); }
  }
  else if (stg === 'box') { if (near('boxhero', 14)) { if (Math.hypot(P.dray.x - hero.x, P.dray.y - hero.y) < 60) go('dray'); } }
  else if (stg === 'report') { if (near('pruitt', 20)) go('pruitt'); }
}

/* ---------- the AI Hub round ---------- */
let hubT = 0;
function hubTick(dt) {
  hubT += dt; if (hubT < 1) return; hubT = 0;
  try { HUB.progress({ score: caseScore(S), label: STAGE_NAME[S.stage] + ' · ' + evidenceList(S).length + ' exhibits' }); } catch (e) { /* ignore */ }
}
function hubSetup() {
  HUB.connect({ mode: 'parallel', seats: [1, 4] }).then(info => {
    if (!info) return;   // no hub after all: the game runs as it does on its own (the title)
    HUB.on('time-up', () => { if (!sessionEnded) { sessionEnded = true; try { HUB.result({ score: caseScore(S), stats: { exhibits: evidenceList(S).length, burns: S.burns } }); } catch (e) { /* ignore */ } } });
    HUB.on('end', () => { sessionEnded = true; music(null); try { A.mute(true); } catch (e) { /* ignore */ } });
    HUB.ready();
  });
}

/* ---------- the handle tests and tools use ---------- */
game.debug = {
  snapshot: () => ({ scene: game.sceneName, stage: S && S.stage, hero: hero ? [Math.round(hero.x), Math.round(hero.y)] : null, heat: Math.round(S.heat), cash: S.cash, photos: Object.assign({}, S.photos), tip: S.tip, tap: S.tapPlanted, wireLog: S.wireLog, chase: chase ? { running: chase.running, done: chase.done, cornered: chase.cornered, t: Math.round(chase.t) } : null, caught: S.chase.caught, box: S.box.result, hour: Math.round(S.hour * 10) / 10, burns: S.burns, done: S.done, overlay, boxScreen, demo, talking: !!talk.open, evidence: evidenceList(S).length, score: caseScore(S), errors: game.errors.length }),
  state: () => S, setState(patch) { Object.assign(S, patch); }, hero: () => hero, people: () => P, lookouts: () => lookouts, map: () => map, walkers: () => walkers, chase: () => chase,
  teleport(x, y) { Object.assign(hero, { x, y, vx: 0, vy: 0 }); }, tele: (tag, i) => placeHero(tag, i), spawn: spawnXY, interact: id => { const o = interactables().find(q => q.id === id); if (o) o.run(); return !!o; },
  startCase, startAttract, pick: pickBox, startBox, showAbout, endCase, whistle, openBoard, overlay: () => overlay, wire: () => W, listen: () => L, boxScreen: () => boxScreen, pilot: () => pilot, photo: photoTaken,
  tackle: tackleAttempt, leaveBox, hoverId: () => hover && hover.id, autoWalk: () => autoWalk, scriptBusy: busyScript, toStage, doBurn, triggerChase, verdict: () => verdict(S), toBox, STAGE_START
};

/* ---------- boot ---------- */
if (HUB && HUB.active) hubSetup();
if (IN_SESSION) { demo = false; S = newCase({ stage: 'surveil' }); S.approach = 'book'; }
game.start({ scene: IN_SESSION ? 'play' : 'title', scenes: { title, play } });
/* a deep link for tools and checks: #play, #attract or #<stage> (surveil, tip, wire, listen, chase, box, report) */
{ const h = typeof location !== 'undefined' ? location.hash.slice(1) : ''; if (!IN_SESSION && h) { if (h === 'play') startCase(); else if (h === 'attract') startAttract(); else if (STAGE_START[h]) startCase({ stage: h }); } }

/* ---- 70-about.js ---- */
const ABOUT_SECTIONS = [["Source Information","Date: 2026-11-02 18:13\nSource: The Wire (2002-2008), kept gritty and real: an original spiritual successor, original characters and a fictional East Side district\nGenre: Investigative stealth-adventure with mini-games (surveillance, informant, wiretap, foot chase, interrogation)\nPerspective: Three-quarter top-down (engine native), switchable to isometric and top-down with V / R3\nTech: my-3D2dge v0.85.1 handoff engine (one file, no dependencies, patched only to add stick-axis inversion), plain JavaScript, AI Hub session client 1.3.0 (parallel mode); bundled to a single html file\nArt Direction: Engine-native HD puppet characters in pixel-art 3/4 view, procedural brick rowhouses and low-rises, rain, night lighting and lamp pools, HTML HUD in a muted gold-on-charcoal theme\nAnimation: Engine-native procedural Humanoid rigs (IK gait, poses, expressions, E.MOVES tackle) and tweened HUD; no sprite sheets or imported clips\nAudio: All synthesized in code: five chip-synth songs (title, stealth, chase, box, report), sound effects, and Animalese-style gibberish voices with a different pitch and wave per speaker; no files\nOnline: AI Hub Session Protocol v1, parallel mode, 1-4 players, each plays their own copy and reports a case score; passes the hub harness. Outside a hub it is single player\nTesting: Headless engine tests (63 system checks plus a 23-check full playthrough) run with exact fixed steps; Playwright browser runs for visuals, mouse, attract mode and a real-time demo; AI Hub harness; WebKit viewport matrix. No real gamepad or real iOS Safari was available: controllers were mocked\nResearch: Read the engine API card and AI Hub protocol only. The show is known from knowledge; no web research\nEnvironment: Claude Code CLI (headless); Linux; browser unknown (Chromium and WebKit via Playwright used for testing)\nModel: Anthropic, claude-sonnet-5-5, reasoning effort medium\nUsage: unknown (cost and token counts are not exposed to the session); session time about 30 minutes"],["Testing Feedback","Issues caught\nAbout 12 real issues: dropped arrest script, key sharing between confirm and interact/tackle, same-frame interact retrigger, overlay left open, attract pilot stalling behind a screen, blocked alley, stale screen on restart, invalid color, missing glyph, overflowing panel, photo line-of-sight ignoring crouch, unreachable photo range.\n\nGame breaking\nFour were game breaking: the dropped arrest script (case stuck mid-chase), the attract pilot stalling at the interview, the van restarting forever, and the fully blocked chase alley.\n\nMost helpful test\nThe headless full playthrough with real input actions: it found most logic bugs in seconds, and doubled as the proof that every stage connects.\n\nLeast helpful test\nThe mobile viewport matrix: the game is controller/keyboard only, so phone layouts say little beyond the layout being sane."],["Engine Feedback","Liked most\nCharacters that animate and look finished from rigs alone, and the Shell HUD/menus/settings/rebinding that come free.\n\nStuck or guessed wrong\nSlightly: assumed Dialog and key-bound actions were independent (confirm and interact share Space), and that a TileMap legend accepts every character.\n\nHad to build myself\nStick-axis inversion in settings (patched into the input poll), the attract-mode pilot, and the interview/wire/listening mini-games.\n\nHardest part\nKnowing what is exposed on game.input and Settings (undocumented fields like padMove, _specs) without reading source.\n\nOverhaul\nThe standard menu being fixed: I wanted my own settings group names and glyph options and had to edit spec objects.\n\nChange one thing\nMake custom settings first-class with apply hooks that cover gamepad axes, so inversion needs no patch."],["Prompt Feedback","Liked most\nClear, structured requirements: a checklist that is directly testable (attract mode, glyphs, inversion, touch message, hub).\n\nConfusing\nThe Source Information block and exit-interview schema are asked for twice in different forms, and Testing/Engine/Prompt questions sit separately from the final reply rules.\n\nHardest\nMaking one coherent, fun game of a TV drama in a single sitting, with 10-foot UI, hub rules and polish all at once.\n\nOne test I would run\nA real gamepad run, with a DualSense, to confirm the stick-inversion issue and PlayStation glyphs on hardware."]];

})();
