/* MAD MEN OUT — the office: Bellweather & Crane's eleventh floor as a TileMap, its furniture, its people, the clock.
 * The player walks it (threequarter by default; V or R1 changes to isometric or top-down), talks, looks, drinks, naps,
 * and writes the campaign at the typewriter before the pitch. */

/* ---- THE FLOOR PLAN, built from rooms (cells of 16 units) ---- */
const MW = 44, MH = 28;
const ROOMS = {
  monty: { x0: 1, y0: 1, x1: 10, y1: 8, floor: 'p', name: 'Monty Crane\'s office' },
  conf: { x0: 12, y0: 1, x1: 27, y1: 8, floor: 'c', name: 'The conference room' },
  jack: { x0: 29, y0: 1, x1: 42, y1: 8, floor: 'p', name: 'Your office' },
  lounge: { x0: 1, y0: 10, x1: 10, y1: 18, floor: 'o', name: 'The creative lounge' },
  bullpen: { x0: 12, y0: 10, x1: 31, y1: 18, floor: '.', name: 'The bullpen' },
  founder: { x0: 33, y0: 10, x1: 42, y1: 18, floor: 'p', name: 'Mr. Bellweather\'s office' },
  kitchen: { x0: 1, y0: 20, x1: 10, y1: 26, floor: 'l', name: 'The kitchen' },
  lobby: { x0: 12, y0: 20, x1: 31, y1: 26, floor: 't', name: 'Reception' },
  library: { x0: 33, y0: 20, x1: 42, y1: 26, floor: 'r', name: 'The library' }
};
function buildRows() {
  const G = Array.from({ length: MH }, () => Array(MW).fill('#'));
  const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) G[y][x] = c; };
  for (const k in ROOMS) { const R = ROOMS[k]; fill(R.x0, R.y0, R.x1, R.y1, R.floor); }
  fill(1, 0, 10, 0, 'W'); fill(12, 0, 27, 0, 'W'); fill(29, 0, 42, 0, 'W'); fill(43, 10, 43, 26, 'W');
  fill(11, 1, 11, 8, 'P'); fill(28, 1, 28, 8, 'P');
  fill(1, 9, 11, 9, 'P'); fill(12, 9, 27, 9, 'g'); fill(28, 9, 42, 9, 'P');
  fill(11, 10, 11, 18, '|'); fill(32, 10, 32, 18, '|'); fill(1, 19, 42, 19, '|'); fill(11, 20, 11, 26, '|'); fill(32, 20, 32, 26, '|');
  // doors
  fill(5, 9, 6, 9, 'p'); fill(19, 9, 20, 9, 'c'); fill(35, 9, 36, 9, 'p');
  fill(11, 13, 11, 14, '.'); fill(32, 13, 32, 14, 'p');
  fill(5, 19, 6, 19, 'l'); fill(18, 19, 25, 19, 't'); fill(37, 19, 38, 19, 'r'); fill(11, 23, 11, 24, 't'); fill(32, 23, 32, 24, 't');
  fill(16, 27, 17, 27, 'E'); fill(26, 27, 27, 27, 'E');
  return G.map(r => r.join(''));
}
const FLOORS = { p: 'parq', c: 'conf', o: 'shag', '.': 'carpet', l: 'lino', t: 'terr', r: 'rug' };
const WALLS = {
  1: { h: 40, cut: true, cutH: 6, face: 'plaster', roof: 'plain', top: '#3a3230', side: '#d8ccb4' },          // # outer wall
  2: { h: 40, cut: true, cutH: 6, face: 'mmWindow', roof: 'plain', top: '#3a3230', side: '#86b8d8' },         // W curtain wall of glass
  3: { h: 34, cut: true, cutH: 6, face: 'mmWalnut', roof: 'plain', top: '#4a3020', side: '#6e4528' },         // P walnut paneling
  4: { h: 34, cut: true, cutH: 6, face: 'plaster', roof: 'plain', top: '#4a4038', side: '#e6dac2' },          // | plaster partition
  5: { h: 13, face: 'mmWalnut', roof: 'plain', top: '#a8d0e0', side: '#6e4528' },                             // g glass partition (low wood, glass above)
  6: { h: 40, cut: true, cutH: 6, face: 'mmChrome', roof: 'plain', top: '#3a3230', side: '#a8b0b8' }          // E elevator doors
};
const LEGEND = { '#': 1, W: 2, P: 3, '|': 4, g: 5, E: 6 };
for (const c in FLOORS) LEGEND[c] = { floor: FLOORS[c] };

/* ---- FLOORS painted per pixel: carpet with a diamond, herringbone parquet, orange shag, terrazzo, checker lino ---- */
const RGB = h => E.hex(h);
const FL = {
  carpet: [RGB('#3e6a6e'), RGB('#46767a'), RGB('#365e62'), RGB('#5a8a8a')],
  conf: [RGB('#283a5a'), RGB('#30446a'), RGB('#22324e'), RGB('#c8a860')],
  shag: [RGB('#b85a24'), RGB('#c8682a'), RGB('#a04e20'), RGB('#e08a40')],
  parq: [RGB('#7a4a28'), RGB('#8a5630'), RGB('#6a3e22'), RGB('#9a6638')],
  terr: [RGB('#d8d0c0'), RGB('#e4dccc'), RGB('#b8ae9c'), RGB('#8a8070')],
  lino: [RGB('#e8e2d4'), RGB('#3a3a40'), RGB('#d0c8b8'), RGB('#2a2a30')],
  rug: [RGB('#6a2228'), RGB('#7a2a30'), RGB('#5a1c22'), RGB('#c8a050')]
};
function floorTex(x, y, tag) {
  const C = FL[tag] || FL.carpet, h = E.hash2(Math.floor(x), Math.floor(y)), lx = ((x % T) + T) % T, ly = ((y % T) + T) % T;
  let c;
  if (tag === 'parq') {   // herringbone: boards 8 x 2 that alternate direction every cell
    const cx = Math.floor(x / 8), cy = Math.floor(y / 8), alt = (cx + cy) & 1, u = alt ? x % 8 : y % 8, v = alt ? y : x;
    c = (u < .9) ? C[2] : (Math.floor(v / 2) & 1) ? C[1] : C[0];
    if (h < .06) c = C[3];
  } else if (tag === 'carpet' || tag === 'conf' || tag === 'rug') {   // a low pile with a repeating diamond
    const m = Math.abs(((x % 24) + 24) % 24 - 12) + Math.abs(((y % 24) + 24) % 24 - 12);
    c = m > 10.5 && m < 12 ? C[3] : (h < .3 ? C[2] : h > .8 ? C[1] : C[0]);
    if (tag === 'rug' && (lx < 1 || ly < 1)) c = C[2];
  } else if (tag === 'shag') { c = h < .35 ? C[2] : h > .75 ? C[3] : C[(Math.floor(x / 2) + Math.floor(y / 3)) & 1]; }
  else if (tag === 'terr') { c = h < .05 ? C[3] : h < .14 ? C[2] : (lx < .6 || ly < .6) ? C[2] : C[h > .6 ? 1 : 0]; }
  else if (tag === 'lino') { const ch = (Math.floor(x / 8) + Math.floor(y / 8)) & 1; c = ch ? C[1] : C[0]; if (h < .08) c = ch ? C[3] : C[2]; }
  else c = C[0];
  // daylight from the north windows: a warm band near the glass, the far rooms a touch cooler
  const k = y < 9 * T ? 1 + Math.max(0, (60 - y) / 400) : 1;
  return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k * .99)];
}

/* ---- FURNITURE: [shape, cx, cy, facing, z, solid] in cells (centers at +.5 are added by the caller's numbers) ---- */
const S_ = Math.PI / 2, N_ = -Math.PI / 2, E_ = 0, W_ = Math.PI;
const FURNITURE = [
  // Monty
  ['mmDesk', 5.5, 2.4, S_], ['mmChair', 5.5, 1.5, S_], ['mmBarCart', 8.8, 2.2, S_], ['mmSofa', 1.9, 5.5, E_], ['mmBookcase', 2.6, .9, S_], ['mmPlant', 9.8, 7.6, S_], ['mmHatStand', 9.6, 1.4, S_],
  // conference
  ['mmConfTable', 19.5, 4.6, S_], ['mmCredenza', 15, .95, S_], ['mmCredenza', 24, .95, S_], ['mmPlant', 12.8, 1.4, S_], ['mmPlant', 26.6, 8.3, S_], ['mmEasel', 26.4, 3.2, W_, 0, false],
  ['mmChair', 14.6, 3.1, S_, 0, false], ['mmChair', 24.4, 3.1, S_, 0, false], ...[16, 19, 22].map(x => ['mmChair', x + 1, 6.3, N_, 0, false]),
  // Jack
  ['mmDesk', 36, 2.5, S_], ['mmChair', 36, 1.5, S_], ['mmCredenza', 32.5, .95, S_], ['mmSofa', 29.9, 6, E_], ['mmBarCart', 41.6, 6.2, W_], ['mmPlant', 41.8, 1.4, S_], ['mmHatStand', 29.7, 1.3, S_],
  ['mmArmchair', 34.6, 4.8, N_], ['mmArmchair', 37.6, 4.8, N_],
  // creative lounge
  ['mmSofa', 3.6, 10.9, S_], ['mmCoffeeTable', 5.6, 16.6, S_], ['mmArmchair', 2.4, 16.8, E_], ['mmArmchair', 9, 17.6, W_], ['mmDrafting', 8.2, 14.9, S_], ['mmPlant', 1.5, 13.2, S_], ['mmFiling', 10.2, 10.8, S_],
  // bullpen
  ...[[15, 12], [18, 12], [24, 12], [15, 16.4], [18.5, 16.4], [22, 16.4]].map(([x, y]) => ['mmTypist', x + .5, y, S_]),
  ['mmDesk', 28.6, 15, W_], ['mmFiling', 31.2, 10.8, S_], ['mmFiling', 30.4, 10.8, S_], ['mmCooler', 12.7, 17.6, S_], ['mmPlant', 12.8, 10.6, S_], ['mmPlant', 31, 18, S_],
  // founder
  ['mmDesk', 38.5, 11, S_], ['mmChair', 38.5, 10.3, S_], ['mmBonsai', 36, 12.2, S_], ['mmClock', 42.2, 11.2, W_], ['mmBookcase', 34.4, 10.6, S_], ['mmArmchair', 35.4, 16.8, N_], ['mmArmchair', 41, 16.8, N_],
  // kitchen
  ['mmCounter', 5, 20.8, S_], ['mmCooler', 9.6, 21, S_], ['table', 5, 24.2, S_], ['chair', 3.6, 24.2, E_, 0, false], ['chair', 6.4, 24.2, W_, 0, false], ['mmPlant', 1.6, 26, S_],
  // lobby
  ['mmReception', 16.5, 22.6, S_], ['mmSofa', 27.2, 20.9, S_], ['mmArmchair', 30.3, 22.8, W_], ['mmCoffeeTable', 27.2, 23, S_], ['mmPlant', 12.8, 20.7, S_], ['mmPlant', 23.8, 26.2, S_], ['mmPlant', 19.8, 26.2, S_],
  // library
  ['mmBookcase', 35.5, 20.6, S_], ['mmBookcase', 39.5, 20.6, S_], ['mmArmchair', 35, 24, E_], ['mmArmchair', 40.2, 24.4, W_], ['mmPlant', 33.6, 26.2, S_]
];
const at = (cx, cy) => ({ x: (cx + .5) * T, y: (cy + .5) * T });

const OFF = { map: null, flow: null, built: false };
function buildOffice() {
  if (OFF.built) return OFF;
  OFF.map = new E.TileMap({ rows: buildRows(), legend: LEGEND, types: WALLS, floorTex, ao: 6, outside: '#1a1614' });
  for (const [id, cx, cy, f, z, solid] of FURNITURE) if (solid !== false) OFF.map.solid(id, cx * T, cy * T, z || 0, { facing: f });
  OFF.flow = new E.FlowField(OFF.map);
  OFF.built = true;
  return OFF;
}
function drawFurniture(r) {
  for (const [id, cx, cy, f, z] of FURNITURE) r.shape(id, cx * T, cy * T, z || 0, { facing: f });
  // desk-top things
  r.shape('mmTypewriter', 34.4 * T, 2.7 * T, 13, { facing: S_ }); r.shape('mmPhone', 38.2 * T, 2.4 * T, 13, { facing: S_ }); r.shape('mmDeskLamp', 37.2 * T, 2.1 * T, 13, { facing: S_ });
  r.shape('mmPhone', 6.8 * T, 2.4 * T, 13, { facing: S_ }); r.shape('mmDeskLamp', 4 * T, 2.1 * T, 13, { facing: S_ });
  r.shape('mmTypewriter', 15.5 * T, 12.1 * T, 12.5, { facing: S_ }); r.shape('mmTypewriter', 18.5 * T, 12.1 * T, 12.5, { facing: S_ }); r.shape('mmTypewriter', 24.5 * T, 12.1 * T, 12.5, { facing: S_ });
  r.shape('mmTypewriter', 19 * T, 16.5 * T, 12.5, { facing: S_ }); r.shape('mmPhone', 17 * T, 22.4 * T, 14.5, { facing: S_ }); r.shape('mmDeskLamp', 39.5 * T, 10.8 * T, 13, { facing: S_ });
}
function officeLights() {
  // window light along the north glass, desk lamps, the lobby's ceiling lights
  for (let x = 2; x < 43; x += 5) L.add(x * T, 1.2 * T, 24, 70, .32, { color: '#d8e8ff' });
  for (const [x, y] of [[37.2, 2.6], [4, 2.6], [39.5, 11.2]]) L.add(x * T, y * T, 18, 46, .5, { color: '#ffd890' });
  for (const [x, y] of [[16, 23], [22, 23], [28, 23], [16, 14], [22, 14], [28, 14], [5, 14], [5, 23], [38, 23], [38, 15], [20, 5], [34, 5], [5, 5]]) L.add(x * T, y * T, 40, 90, .38, { color: '#fff2d8' });
}
const roomAt = (x, y) => { const cx = Math.floor(x / T), cy = Math.floor(y / T); for (const k in ROOMS) { const R = ROOMS[k]; if (cx >= R.x0 && cx <= R.x1 && cy >= R.y0 && cy <= R.y1) return k; } return null; };

/* ---- THE DIALOG SEQUENCER: lines as [speaker, text] played one box at a time, with portraits and gibberish ---- */
const talk = new E.Dialog(game, { voice: null, bg: ['#2a2018', '#120c08'], border: '#c8a868', nameColor: '#e8c36a', lines: 3 });
const speakerOf = id => {
  if (id === 'narrator') return { name: '', portrait: null, voice: null };
  if (id === 'clientF') return { name: 'ON THE TELEPHONE', portrait: null, voice: 'clientF' };
  const c = CAST[id]; return c ? { name: c.name, portrait: rigOf(id), voice: c.voice } : { name: id.toUpperCase(), portrait: null, voice: 'client' };
};
function say(lines, done, choices, onChoice) {
  lines = lines.slice();
  const step = () => {
    if (!lines.length) { voiceOn = null; if (done) done(); return; }
    const [who, text] = lines.shift(), sp = speakerOf(who), last = !lines.length && choices;
    voiceOn = sp.voice;
    talk.speed = textSpeed();
    talk.say(who === 'narrator' ? '{c=#b8ab94}' + text + '{/c}' : text, { name: sp.name, portrait: sp.portrait, portraitSize: 46, portraitOpts: { zoom: 2.4, turn: -.3, bg: ['#5a4a3a', '#1a120c'] },
      choices: last ? choices.map(c => c.label) : undefined, onChoice: last ? (i => { voiceOn = null; onChoice(i); }) : undefined, onDone: last ? undefined : step });
  };
  step();
}

/* ---- the office scene's state ---- */
const OF = { hero: null, rig: null, npcs: [], spots: [], hover: null, goal: null, prompt: null, note: null, journal: false, ring: null, overT: 0, fired: {}, toasts: [], room: null, dayCard: 0, auto: null, busy: false, lastClick: null };
const dayData = () => DAYS[S.day];
const clientData = () => CLIENTS[dayData().client];

function toast(title, text, color = COL.gold) { OF.toasts.push({ title, text, color, t: 0 }); }
function gainCard(id) {
  if (!id || S.insights.includes(id)) return;
  S.insights.push(id); const c = CARDS[id];
  toast('NEW INSIGHT: ' + c.title.toUpperCase(), ANGLES[c.angle].icon + ' ' + c.angle + ' · power ' + c.power, ANGLES[c.angle].color);
  A.sfx('card'); A.sfx('pickup', { vol: .5 });
  if (!S.demo && game.input.rumble) game.input.rumble(.3, .12);
}
function gainIntel(id) {
  if (!id || S.intel.includes(id)) return;
  S.intel.push(id); toast('CLIENT INTEL: ' + INTEL[id].title.toUpperCase(), 'The client\'s true wants, in the deck (' + key('journal') + ')', '#9ad0ff'); A.sfx('secret');
}
function spend(min) {
  if (!min) return;
  const before = S.minute; S.minute = Math.min(S.pitchAt, S.minute + min);
  // a ringing phone left unanswered past this action is missed
  if (OF.ring && S.minute > OF.ring.at + 1) { const ev = OF.ring; OF.ring = null; if (ev.missed && ev.missed.length) OF.queue.push(() => say(ev.missed, next)); if (ev.fx && ev.fx.pitchAt) S.pitchAt = ev.fx.pitchAt; }
  if (Math.floor(before / 60) !== Math.floor(S.minute / 60)) A.sfx('blip', { vol: .4 });
}
function applyFx(fx, who) {
  if (!fx) return;
  if (fx.rapport && who && S.rapport[who] !== undefined) { S.rapport[who] = clamp(S.rapport[who] + fx.rapport, -3, 3); if (fx.rapport > 0) toast(SHORT[who].toUpperCase() + ' LIKES THAT', '♥ rapport ' + S.rapport[who], '#e89aa0'); else toast(SHORT[who].toUpperCase() + ' WON\'T FORGET THAT', 'rapport ' + S.rapport[who], '#a09890'); }
  if (fx.composure) { S.composure = clamp(S.composure + fx.composure, 0, 100); if (fx.composure < 0) game.shake(1.5); }
  if (fx.haze) S.haze = clamp(S.haze + fx.haze, 0, 3);
  if (fx.card) gainCard(fx.card);
  if (fx.intel) gainIntel(fx.intel);
  if (fx.flag) S.flags[fx.flag] = true;
  if (fx.pitchAt) S.pitchAt = Math.min(S.pitchAt, fx.pitchAt);
  if (fx.minutes) spend(fx.minutes);
}
// a queue of things that wait for the dialog to close (missed calls, events)
OF.queue = [];
const next = () => {};

/* ---- PEOPLE: each a Body-free standing figure with a rig that turns to the hero and gestures while talking ---- */
const EXTRAS = [   // typists and a mail boy, for life
  { id: 'x1', look: { ...DRESS('#8a6aa8', '#2a1a12', { hair: 'ponytail' }) }, at: [24.5, 11.2, 1.57], line: 'Mr. Barrow wants it in triplicate. Again.' },
  { id: 'x2', look: { ...DRESS('#c8a070', '#e8d090', { hair: 'short' }) }, at: [22.5, 15.6, -1.57], line: 'If I type one more "Dear Sir" I\'ll scream.' },
  { id: 'x3', look: { ...SUIT('#6a6a5a', '#5a5a4a', '#f0ece0', '#3a3a2a', { hair: 'short', size: 1.18, colors: { hair: '#c8803a' } }) }, path: [[13.5, 14.5], [30.5, 14.5], [30.5, 19.5], [21.5, 19.5], [13.5, 14.5]], line: 'Mail! Mail for the eleventh floor!' }
];
function spawnPeople() {
  const D = dayData(); OF.npcs = [];
  for (const id in D.people) {
    const p = D.people[id], pos = at(p.at[0], p.at[1]);
    OF.npcs.push({ id, kind: 'npc', x: pos.x, y: pos.y, z: 0, face: p.at[2], look: p.at[2], rig: rigOf(id), data: p, idle: 0, pose: null, poseT: 2 + Math.random() * 3, gest: 0 });
  }
  for (const x of EXTRAS) {
    const rig = rigs[x.id] || (rigs[x.id] = new E.Humanoid(x.look));
    const p0 = x.path ? x.path[0] : x.at, pos = at(p0[0], p0[1]);
    OF.npcs.push({ id: x.id, kind: 'extra', x: pos.x, y: pos.y, z: 0, face: x.at ? x.at[2] : 0, look: x.at ? x.at[2] : 0, rig, data: { idle: [x.line] }, path: x.path, seg: 0, vx: 0, vy: 0, pose: null, poseT: 3, gest: 0 });
  }
  // the hotspots: the room's furniture you can use, the day's things to look at, the people
  const H = [
    { id: 'typewriter', x: 34.4 * T, y: 3.3 * T, label: () => S.deck.length ? 'Rewrite the campaign' : 'Write the campaign', use: () => openBrainstorm(false) },
    { id: 'barcart', x: 41 * T, y: 6.2 * T, label: () => S.haze >= 3 ? 'You\'ve had enough' : 'Pour a drink (15 min)', use: drink },
    { id: 'sofa', x: 30.9 * T, y: 6 * T, label: () => 'Lie down (1 hr)', use: nap },
    { id: 'coffee', x: 4.5 * T, y: 21.8 * T, label: () => 'Pour a coffee (15 min)', use: coffee },
    { id: 'smoke', x: 41.6 * T, y: 23 * T, label: () => 'Smoke by the window (15 min)', use: smoke },
    { id: 'conf', x: 19.5 * T, y: 9.6 * T, label: () => S.deck.length ? 'Begin the pitch' : 'The conference room (write the campaign first)', use: () => { if (S.deck.length) beginPitch(); else say([['narrator', 'The conference room is set for ' + clockStr(S.pitchAt) + '. You have nothing to show them yet. The typewriter is in your office.']]); } },
    { id: 'phone', x: 38.2 * T, y: 3.4 * T, label: () => OF.ring ? 'Answer the telephone' : 'The telephone', use: phone }
  ];
  for (const l of D.looks) if (!l.cond || l.cond(S)) H.push({ id: 'look:' + l.id, x: (l.at[0] + .5) * T, y: (l.at[1] + .5) * T, label: () => S.used[l.id] ? 'Look again' : l.label + ' (' + l.minutes + ' min)', use: () => look(l) });
  OF.spots = H;
}
function look(l) {
  const first = !S.used[l.id]; S.used[l.id] = true;
  say([['narrator', l.text]], () => { if (first) { spend(l.minutes); if (l.card) gainCard(l.card); } });
}
function drink() {
  if (S.haze >= 3) { say([['narrator', 'Your hand reaches for the decanter. You stop it. Even you have limits, and this is one.']]); return; }
  A.sfx('pour'); game.after(.4, () => A.sfx('ice'));
  S.haze++; S.composure = clamp(S.composure + 20, 0, 100); spend(15);
  say([['narrator', ['Rye, two fingers. The morning gets softer around the edges.', 'Another. The room is warm and you are very good at your job.', 'The third goes down like a promise you won\'t keep.'][S.haze - 1]]]);
  toast('COMPOSURE +20', 'HAZE ' + '•'.repeat(S.haze) + ' (the delivery meter will swing faster)', '#e8a060');
}
function nap() {
  spend(60); S.composure = clamp(S.composure + 40, 0, 100); S.haze = Math.max(0, S.haze - 1);
  game.flash('#000000', .5, 1); say([['narrator', 'You lie down on the sofa, tie loosened, and look at the ceiling until the ceiling looks back. An hour goes by.']]);
  toast('COMPOSURE +40', 'An hour gone. ' + (S.haze ? 'HAZE ' + '•'.repeat(S.haze) : 'Your head is clear.'), '#9ad0ff');
}
function coffee() { spend(15); S.composure = clamp(S.composure + 10, 0, 100); S.haze = Math.max(0, S.haze - 1); A.sfx('pour'); say([['narrator', 'Office coffee: hot, black, and a little like an apology. Your head clears.']]); }
function smoke() { spend(15); S.composure = clamp(S.composure + 15, 0, 100); A.sfx('lighter'); say([['narrator', 'You light a Lucky Strike by the window and watch the smoke climb toward the ceiling, the way all good ideas do.']]); }
function phone() {
  if (!OF.ring) { say([['narrator', 'The telephone is quiet. It always is when you want it to ring.']]); return; }
  const ev = OF.ring; OF.ring = null;
  say(ev.lines, () => applyFx(ev.fx));
}
function talkTo(n) {
  if (n.kind === 'extra') { say([['narrator', '"' + n.data.idle[0] + '"']]); return; }
  const d = n.data, tk = d.talk, done = S.talked[n.id];
  n.gest = 2.5;
  if (!tk || done) { const lines = d.idle || ['...']; const t = lines[(S.minute + n.id.length) % lines.length]; say([[n.id, t]]); return; }
  const choices = tk.choices.filter(c => !c.cond || c.cond(S));
  say(tk.lines.map(t => [n.id, t]), null, choices, i => {
    const c = choices[i]; S.talked[n.id] = true;
    game.after(.05, () => say(c.lines.map(l => Array.isArray(l) ? l : [n.id, l]), () => applyFx(c.fx, n.id)));
  });
}

/* ---- events on the clock (a telephone, a visitor) and the pitch at its hour ---- */
function checkEvents() {
  const D = dayData();
  for (let i = 0; i < D.events.length; i++) {
    const ev = D.events[i], k = D.id + ':' + i;
    if (OF.fired[k] || S.minute < ev.at || (ev.cond && !ev.cond(S))) continue;
    OF.fired[k] = true;
    if (ev.kind === 'phone') { OF.ring = Object.assign({}, ev, { at: S.minute }); toast('THE TELEPHONE IS RINGING', 'In your office', '#e8c36a'); }
    else say(ev.lines, () => applyFx(ev.fx));
    return true;
  }
  return false;
}

/* ---- HERO movement: the stick (screen directions through the view) or a click's walk around the furniture ---- */
function heroMove(dt) {
  const I = game.input, h = OF.hero;
  let m = I.move(), d = game.view.screenDirToGround(m[0], m[1]);
  if (OF.auto) { const a = OF.auto(dt); if (a) d = a; }
  const pushing = Math.hypot(d[0], d[1]) > .1;
  if (pushing && !OF.auto) OF.goal = null;
  if (!pushing && OF.goal) {
    const g = OF.goal; OF.flow.update(g.x, g.y);
    const dist = Math.hypot(g.x - h.x, g.y - h.y);
    if (dist < (g.spot ? 22 : 6)) { const s = g.spot; OF.goal = null; if (s) useSpot(s); }
    else {
      const w = OF.flow.dir(h.x, h.y, g.x, g.y); d = [w[0], w[1]];
      // furniture in the way: slide along it (a quarter turn, the side nearer the goal), then give up after a while
      h.stuck = Math.hypot(h.vx, h.vy) < 20 && (h.stuckT || 0) > .1 ? (h.stuck || 0) + dt : Math.max(0, (h.stuck || 0) - dt * .5);
      h.stuckT = (h.stuckT || 0) + dt;
      if (h.stuck > .25) { const side = Math.sin(game.time * .7) > 0 ? 1 : -1; d = [-w[1] * side * .9 + w[0] * .3, w[0] * side * .9 + w[1] * .3]; }
      if (h.stuck > 3) { OF.goal = null; h.stuck = 0; }
    }
  } else { h.stuck = 0; h.stuckT = 0; }
  const sp = (I.down('run') || (OF.goal && OF.goal.far)) ? 112 : 72, l = Math.hypot(d[0], d[1]);
  h.vx = l > .05 ? d[0] / Math.max(1, l) * sp : 0; h.vy = l > .05 ? d[1] / Math.max(1, l) * sp : 0;
  if (l < .05 && Math.abs(m[0]) + Math.abs(m[1]) > 0) { h.vx = d[0] * sp; h.vy = d[1] * sp; }
  if (OF.noclip) { h.x += h.vx * dt; h.y += h.vy * dt; } else h.update(dt, OF.map);   // (the attract mode cheats: no clip)
  if (Math.hypot(h.vx, h.vy) > 5) h.facing = Math.atan2(h.vy, h.vx);
  OF.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, expr: S.composure < 25 ? 'wince' : null });
}
function useSpot(s) { if (s.kind === 'npc' || s.kind === 'extra') talkTo(s); else s.use(); }
// what's in reach: the nearest person or hotspot in front of the hero
function nearest() {
  const h = OF.hero; let best = null, bd = 30;
  for (const s of [...OF.npcs, ...OF.spots]) {
    const d = Math.hypot(s.x - h.x, s.y - h.y);
    const ahead = Math.cos(Math.atan2(s.y - h.y, s.x - h.x) - h.facing) > -.2;
    if (d < bd && (ahead || d < 16)) { bd = d; best = s; }
  }
  return best;
}
const SHORT = { jack: 'Jack', monty: 'Monty', ruth: 'Ruth', dolores: 'Dolores', theo: 'Theo', eddie: 'Eddie', bell: 'Mr. Bellweather', joyce: 'Joyce', marcy: 'Marcy', peg: 'Peg', lenny: 'Lenny' };
const spotLabel = s => s.kind === 'npc' ? (S.talked[s.id] || !s.data.talk ? 'Chat with ' : 'Talk to ') + (SHORT[s.id] || s.id) + (s.data.talk && !S.talked[s.id] ? ' (takes time)' : '')
  : s.kind === 'extra' ? 'Chat' : s.label();

/* ---- people's update: the mail boy walks, everyone turns to the hero, gestures while talking, shifts weight ---- */
function updatePeople(dt) {
  const h = OF.hero;
  for (const n of OF.npcs) {
    if (n.path) {
      const tgt = at(...n.path[(n.seg + 1) % n.path.length]), dx = tgt.x - n.x, dy = tgt.y - n.y, d = Math.hypot(dx, dy);
      const near = Math.hypot(h.x - n.x, h.y - n.y) < 20 || talk.open;
      if (d < 2) n.seg = (n.seg + 1) % (n.path.length - 1);
      const sp = near ? 0 : 34; n.vx = dx / (d || 1) * sp; n.vy = dy / (d || 1) * sp; n.x += n.vx * dt; n.y += n.vy * dt;
      if (sp) n.face = Math.atan2(dy, dx);
    }
    const dh = Math.hypot(h.x - n.x, h.y - n.y);
    const want = dh < 44 ? Math.atan2(h.y - n.y, h.x - n.x) : n.face;
    n.look = E.approachAng(n.look, want, dt * 5);
    n.poseT -= dt; n.gest = Math.max(0, n.gest - dt);
    if (n.poseT < 0) { n.pose = E.chance(.4) ? E.pick(['hips', null, null]) : null; n.poseT = 3 + Math.random() * 4; }
    const talking = talk.open && voiceOn === (CAST[n.id] && CAST[n.id].voice) && speakerOf(n.id).portrait === talk.portrait;
    const pose = talking && talk.typing ? (Math.sin(game.time * 3 + n.x) > .3 ? 'wave' : 'hips') : n.pose;
    n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: n.vx || 0, vy: n.vy || 0, facing: n.look, pose, expr: talking ? 'smile' : null });
  }
}

/* ---- THE OFFICE SCENE ---- */
const officeScene = {
  pausable: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: KEYS, res: 'ps1', touch: [],
  camera: { zoom: [.75, 2], start: 1 },
  enter(data) {
    buildOffice(); OF.map = OFF.map; OF.flow = OFF.flow;
    const fresh = !data || !data.resume;
    if (fresh) {
      const D = dayData();
      Object.assign(S, { minute: D.start, pitchAt: D.pitchAt, insights: [], intel: [], deck: [], talked: {}, used: {} });
      OF.fired = {}; OF.ring = null; OF.toasts = []; OF.queue = [];
      if (!S.demo && !HUB) game.saves.save('auto');
    }
    spawnPeople();
    const st = data && data.at || at(21.5, 25.6);
    OF.hero = OF.hero || new E.Body({ x: st.x, y: st.y, r: 5 });
    Object.assign(OF.hero, { x: st.x, y: st.y, vx: 0, vy: 0, facing: -Math.PI / 2 });
    OF.rig = rigOf('jack'); OF.goal = null; OF.journal = false; OF.overT = 0; OF.busy = false;
    game.follow(OF.hero, { z: 14 }); game.cam.bounds = v => OF.map.bounds(v);
    L.enabled = true; L.ambient = .72;
    E.style.propSize = 1.3;
    music('lounge');
    if (fresh) {
      A.sfx('elevator');
      game.after(.6, () => say(dayData().morning, () => { if (S.day === 0 && !S.flags.tutorial) { S.flags.tutorial = true; tutorial(); } }));
    }
  },
  exit() { talk.close(); OF.auto = null; },
  update(dt) {
    const I = game.input;
    OF.toasts.forEach(t => t.t += dt); OF.toasts = OF.toasts.filter(t => t.t < 3.6);
    if (I.pressed('view') && !talk.open) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    if (OF.journal) { if (I.pressed('journal') || I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { OF.journal = false; I.consumeAll(); A.sfx('cancel'); } updatePeople(dt); return; }
    const open = talk.update(dt); speak(talk);
    if (open) { updatePeople(dt); OF.rig.update(dt, { x: OF.hero.x, y: OF.hero.y, z: 0, vx: 0, vy: 0, facing: OF.hero.facing, pose: talk.name === CAST.jack.name ? 'hips' : null }); return; }
    if (OF.queue.length) { OF.queue.shift()(); return; }
    // the hour of the pitch: they're here, ready or not
    if (S.minute >= S.pitchAt) { say([['dolores', clientData().company + ' is here, Mr. Calloway. In the conference room.']], () => S.deck.length ? beginPitch() : openBrainstorm(true)); return; }
    if (checkEvents()) return;
    if (S.composure <= 0) { S.composure = 35; spend(60); game.flash('#000', .6, 1); say([['narrator', 'The room tilts. You close your office door, lie on the floor and breathe until it stops. An hour is gone.']]); return; }
    if (I.pressed('journal')) { OF.journal = true; A.sfx('pause'); return; }
    heroMove(dt); updatePeople(dt);
    OF.room = roomAt(OF.hero.x, OF.hero.y);
    // overheard talk: stand near the pair for a moment
    const oh = dayData().overhear;
    if (oh && !S.used.overhear) {
      const a = OF.npcs.find(n => n.id === oh.a), b = OF.npcs.find(n => n.id === oh.b);
      const mid = a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null;
      if (mid && Math.hypot(OF.hero.x - mid.x, OF.hero.y - mid.y) < 40 && Math.hypot(OF.hero.vx, OF.hero.vy) < 20) { OF.overT += dt; if (OF.overT > 2) { S.used.overhear = true; OF.overT = 0; say(oh.lines.map(t => ['narrator', t]), () => { if (oh.card) gainCard(oh.card); if (oh.flag) S.flags[oh.flag] = true; }); } }
      else OF.overT = Math.max(0, OF.overT - dt * 2);
    }
    // the mouse: hover moves the focus to a person or a thing; a click walks there and uses it, or walks to the floor
    const p = I.pointer();
    OF.hover = null;
    if (p && dev() === 'mouse') { let bd = 18; for (const s of [...OF.npcs, ...OF.spots]) { const q = s.sp; if (!q) continue; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; OF.hover = s; } } }
    const c = I.clicked();
    if (c && !OF.auto) {
      if (OF.hover) OF.goal = { x: OF.hover.x, y: OF.hover.y, spot: OF.hover, far: true };
      else { const g = game.mouseGround(); if (g && OF.map.walkable(Math.floor(g[0] !== undefined ? g[0] / T : g.x / T), Math.floor(g[1] !== undefined ? g[1] / T : g.y / T))) OF.goal = { x: g[0] !== undefined ? g[0] : g.x, y: g[1] !== undefined ? g[1] : g.y, far: true }; }
      if (OF.goal) A.sfx('select', { vol: .4 });
    }
    const n = OF.hover && dev() === 'mouse' ? OF.hover : nearest();
    OF.prompt = n ? { s: n, label: spotLabel(n) } : null;
    if (I.pressed('interact') && n && Math.hypot(n.x - OF.hero.x, n.y - OF.hero.y) < 34) { I.consumeAll(); useSpot(n); }
  },
  draw(r) {
    OF.map.drawFloor(r); OF.map.queueWalls(r);
    drawFurniture(r); officeLights();
    // the ringing phone and the hover ring
    if (OF.ring) { const k = Math.sin(game.time * 20) > 0; r.textAt(38.2 * T, 2.4 * T, 30, k ? '♪ RING ♪' : '♪ ring ♪', '#ffe08a'); if (Math.floor(game.time * 1.2) !== OF._rng) { OF._rng = Math.floor(game.time * 1.2); A.sfx('ring', { vol: .6 }); } }
    const tgt = OF.prompt && OF.prompt.s;
    if (tgt) r.decal(() => r.groundRing(tgt.x, tgt.y, 9 + Math.sin(game.time * 4), '#e8c36a', .7));
    if (OF.goal && !OF.goal.spot) r.decal(() => r.groundRing(OF.goal.x, OF.goal.y, 5, '#ffffff', .5));
    // the overheard pair: a soft ring while listening
    if (OF.overT > 0) { const oh = dayData().overhear, a = OF.npcs.find(n => n.id === oh.a); if (a) r.textAt(a.x, a.y, 52, 'listening' + '.'.repeat(1 + Math.floor(OF.overT * 2) % 3), '#c8e0ff'); }
    for (const n of OF.npcs) {
      r.shadow(n.x, n.y, 6, .3, '#1a1020');
      r.actor(n.x, n.y, 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { xray: false, every: n.kind === 'extra' ? 2 : 1, key: n });
      n.sp = r.w(n.x, n.y, 18);
      if (n.kind === 'npc' && n.data.talk && !S.talked[n.id]) r.textAt(n.x, n.y, 50 + Math.sin(game.time * 3) * 1.5, '!', '#ffd36a');
    }
    for (const s of OF.spots) s.sp = r.w(s.x, s.y, 12);
    const h = OF.hero; r.shadow(h.x, h.y, 6, .35, '#1a1020');
    r.actor(h.x, h.y, h.z, (g, ox, oy) => OF.rig.draw(g, ox, oy, r.view), { xray: { color: '#e8c36a' } });
    r.overlay(g => drawOfficeHud(g, r));
    talk.draw(r);
    if (OF.journal) r.overlay(g => drawJournal(g, r));
  }
};

/* ---- HUD: big, sparse, readable from the sofa ---- */
function drawOfficeHud(g, r) {
  const D = dayData(), C = clientData();
  panel(g, 6, 6, 128, 44, { alpha: .85 });
  txt(g, D.title + '  ' + clockStr(S.minute), 12, 11, COL.ink);
  txt(g, 'Pitch at ' + clockStr(S.pitchAt), 12, 21, S.pitchAt - S.minute <= 60 ? '#ff9a7a' : COL.dim);
  txt(g, 'COMPOSURE', 12, 32, COL.dim, { font: 'tiny' });
  E.ui.bar(g, 52, 32, 76, 5, S.composure / 100, S.composure < 30 ? '#d8483a' : '#5ab0a8');
  txt(g, 'HAZE ' + (S.haze ? '•'.repeat(S.haze) : '-'), 12, 40, S.haze ? '#e8a060' : COL.dim, { font: 'tiny' });
  txt(g, 'INSIGHTS ' + S.insights.length + (S.intel.length ? '  INTEL ' + S.intel.length : ''), 60, 40, COL.gold, { font: 'tiny' });
  // the objective, top centre (clear of the corner's buttons)
  const obj = S.deck.length ? 'The campaign is written. Go to the conference room.' : S.insights.length >= 3 ? 'Write the campaign at your typewriter, or keep digging.' : 'Gather insights for ' + C.company + '.';
  txt(g, obj, Math.round(r.W / 2) + 30, 9, '#f4ead8', { align: 'center' });
  if (OF.room) txt(g, ROOMS[OF.room].name, Math.round(r.W / 2) + 30, 19, COL.dim, { align: 'center', font: 'tiny' });
  // the prompt, bottom centre
  if (OF.prompt && !talk.open) {
    const s = key('interact') + '  ' + OF.prompt.label, w = E.font.width(s) + 16, x = Math.round((r.W - w) / 2), y = r.H - 24;
    panel(g, x, y, w, 16, { alpha: .9 }); txt(g, s, x + 8, y + 5, COL.ink);
  } else if (!talk.open) {
    const s = (dev() === 'gamepad' ? 'L stick' : dev() === 'mouse' ? 'Click to walk' : 'WASD') + ' move   ' + key('run') + ' hurry   ' + key('journal') + ' the deck   ' + key('view') + ' view';
    txt(g, s, Math.round(r.W / 2), r.H - 12, '#c8bca8', { align: 'center' });
  }
  // toasts (insights, rapport)
  OF.toasts.slice(-3).forEach((t, i) => {
    const a = Math.min(1, t.t * 4, (3.6 - t.t) * 2), w = 190, x = Math.round(r.W - w - 8 + (1 - a) * 40), y = 66 + i * 30;
    panel(g, x, y, w, 26, { alpha: .9, border: t.color }); txt(g, t.title, x + 6, y + 4, t.color); txt(g, t.text, x + 6, y + 15, COL.ink, { font: 'tiny' });
  });
}
function drawCard(g, x, y, id, o = {}) {   // compact: angle, power, title; full: and the line it adds to the tagline
  const c = CARDS[id], A_ = ANGLES[c.angle], w = o.w || 98, h = o.h || (o.full ? 76 : 42);
  panel(g, x, y, w, h, { bg: o.sel ? ['#fff8e0', '#e8d8a8'] : ['#efe6cc', '#cfc0a0'], border: o.focus ? '#ffffff' : A_.color, gradient: true });
  px.rect(g, x + 2, y + 2, w - 4, 11, A_.dark);
  E.font.text(g, A_.icon + ' ' + A_.name, x + 5, y + 4, A_.color, { outline: false });
  E.font.text(g, '★'.repeat(c.power), x + w - 5, y + 4, '#f4e0a0', { outline: false, align: 'right' });
  E.font.text(g, c.title, x + 5, y + 16, COL.paperInk, { outline: false, wrap: w - 10 });
  if (o.full) E.font.text(g, '"' + c.line + '"', x + 5, y + 38, '#6a4a2a', { outline: false, wrap: w - 10 });
  if (o.sel) { px.rect(g, x + w - 13, y + h - 13, 10, 10, '#2a7a3a'); E.font.text(g, '✓', x + w - 11, y + h - 12, '#ffffff', { outline: false }); }
}
function knownWants() {
  const C = clientData(), k = {};
  for (const id of S.intel) Object.assign(k, INTEL[id].reveals);
  return k;
}
function drawJournal(g, r) {
  const C = clientData(), D = dayData(), W = Math.min(r.W - 20, 420), x0 = Math.round((r.W - W) / 2), y0 = 14;
  px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#201810'));
  panel(g, x0, y0, W, r.H - 28);
  txt(g, 'THE DECK  -  ' + D.date, x0 + 10, y0 + 8, COL.gold);
  txt(g, C.company + ': ' + C.product, x0 + 10, y0 + 20, COL.ink);
  txt(g, C.brief || '', x0 + 10, y0 + 30, COL.dim, { wrap: W - 20 });
  const kw = knownWants(), ks = Object.keys(kw);
  txt(g, ks.length ? 'What they really want: ' + ks.map(a => (kw[a] > 0 ? '+' : '-') + ' ' + ANGLES[a].icon + ' ' + a).join('   ') : 'What they really want: unknown. Ask around.', x0 + 10, y0 + 50, ks.length ? '#9ad0ff' : COL.dim, { wrap: W - 20 });
  const cols = Math.max(1, Math.floor((W - 20) / 102));
  S.insights.forEach((id, i) => drawCard(g, x0 + 10 + (i % cols) * 102, y0 + 66 + Math.floor(i / cols) * 48, id, { w: 98 }));
  if (!S.insights.length) txt(g, 'No insights yet. Talk to people. Look at things. Listen.', x0 + 10, y0 + 76, COL.dim);
  const rp = Object.keys(S.rapport).map(k => SHORT[k].replace('Mr. ', '').toUpperCase() + ' ' + (S.rapport[k] >= 0 ? '♥'.repeat(S.rapport[k]) || '-' : '×'.repeat(-S.rapport[k]))).join('   ');
  txt(g, rp, x0 + 10, r.H - 40, COL.dim, { font: 'tiny', wrap: W - 20 });
  txt(g, key('journal') + ' close', x0 + W - 10, r.H - 26, COL.ink, { align: 'right' });
}

function tutorial() {
  say([['narrator', 'Walk with ' + (dev() === 'gamepad' ? 'the left stick' : 'WASD or the arrows') + ', or click the floor. ' + key('interact') + ' talks to people and uses things. A gold ! means someone has something for you.'],
    ['narrator', 'Conversations and looking around cost time. The pitch is at ' + clockStr(S.pitchAt) + '. Collect INSIGHTS, then write the campaign at the typewriter in your office (top right).'],
    ['narrator', 'Drinks steady your COMPOSURE but add HAZE, which makes the pitch harder to deliver. Coffee and a nap clear it. ' + key('journal') + ' opens your deck.']]);
}
