// MAD MENTION: a Madison Avenue pitch game on my-3D2dge. Walk the fortieth floor of Vance Halloran in 1964, gather
// insights from the people and things around you before two o'clock, write the tagline, then pitch it to the client:
// answer each objection with the right appeal, deliver it on the beat of the room, and hold the pause before the line.
// Three accounts, three days, an evening after each. Modes: the campaign, a two-player Pitch-Off (hot seat), the
// attract mode (an AI plays a day), and AI Hub sessions (ghost mode: every player pitches the same Monday, and sees the
// other creatives walking the floor). Content lives in data.js, art and sound in art.js.
(() => {
const E = My3D2dge, { px, clamp, lerp } = E;
const MM = window.MM;
const HUB = !!(window.AIHub && window.AIHub.active);
MM.registerShapes();

// ------------------------------------------------------------------------------------------------ the game and keys
const MENU_KEYS = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'KeyJ', 'KeyZ', 'Pad0'], cancel: ['Escape', 'Backspace', 'KeyX', 'KeyK', 'Pad1'] };
const KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  interact: ['KeyE', 'KeyF', 'Space', 'Pad0'], folio: ['Tab', 'KeyI', 'Pad3'], view: ['KeyV', 'Pad2'], hurry: ['ShiftLeft', 'ShiftRight', 'Pad7'], ...MENU_KEYS
};
const game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'iso', 'topdown'], input: KEYS, id: 'mad-mention',
  menu: { quit: HUB ? false : 'title',
    controls: { interact: 'Talk / use', folio: 'Idea folio', view: 'Change view', hurry: 'Hurry' },
    settings: [
      { key: 'glyphs', group: 'Game', label: 'Controller button symbols', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation'], ['xbox', 'Xbox']], apply: (g, v) => { g.input.glyphs = v; } },
      { key: 'invertX', group: 'Game', label: 'Invert stick left / right', type: 'toggle', value: false },
      { key: 'invertY', group: 'Game', label: 'Invert stick up / down', type: 'toggle', value: false, apply: () => {} },
      { key: 'textSpeed', group: 'Game', label: 'Text speed', type: 'select', value: 'normal', options: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']] }
    ] } });
game.input.touchEnabled = false;
const talk = new E.Dialog(game, { lines: 3 });
talk.voice = null; talk.bg = '#1c1712'; talk.border = '#d8b46a'; talk.nameColor = '#f0c860';
MM.defineSounds(game.audio);
const TOUCH_ONLY = typeof window !== 'undefined' && typeof matchMedia === 'function' && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) && !matchMedia('(any-pointer: fine)').matches;
// a touch-only device is let in once it shows a keyboard, a controller or a mouse
let realInput = false;
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', () => { realInput = true; }, true);
  window.addEventListener('gamepadconnected', () => { realInput = true; });
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') realInput = true; }, true);
}
const touchGate = () => TOUCH_ONLY && !realInput && game.input.lastDevice !== 'gamepad';
const T = (g, s, x, y, c = '#f4ecd8', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: false, shadow: '#0a0806' }, o));
const fam = () => game.settings.glyphs === 'xbox' ? 'xbox' : 'playstation';

// ------------------------------------------------------------------------------------------------ the fortieth floor
const MW = 40, MH = 28;
function buildRows() {
  const g = Array.from({ length: MH }, () => Array(MW).fill('#'));
  const room = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  room(1, 1, 11, 8, 'k'); room(13, 1, 20, 8, 'h'); room(22, 1, 30, 8, 'o'); room(32, 1, 38, 8, 't');
  room(1, 10, 38, 17, 'b'); room(1, 19, 12, 26, 'l'); room(14, 19, 22, 26, 'r'); room(24, 19, 38, 26, 'e');
  for (const [x, y, c] of [[6, 9, 'b'], [7, 9, 'b'], [16, 9, 'b'], [17, 9, 'b'], [26, 9, 'b'], [27, 9, 'b'], [35, 9, 'b'], [6, 18, 'b'], [7, 18, 'b'], [18, 18, 'b'], [27, 18, 'e'], [28, 18, 'e'], [29, 18, 'e'], [30, 18, 'e']]) g[y][x] = c;
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (g[y][x] === '#') g[y][x] = '|';
  return g.map(r => r.join(''));
}
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const FLOORS = {
  k: (x, y) => { const n = hash(x >> 1, y >> 1) * 10; return [34 + n, 74 + n, 80 + n]; },
  h: (x, y) => { const b = (x % 64 < 3 || y % 64 < 3) ? 30 : 0, n = hash(x >> 1, y >> 1) * 10; return [104 + n + b, 36 + n, 34 + n]; },
  o: (x, y) => { const n = hash(x >> 1, y >> 1) * 9, st = ((x + y) >> 3) % 2 ? 6 : 0; return [92 + n + st, 100 + n + st, 70 + n]; },
  t: (x, y) => { const n = hash(x >> 1, y >> 1) * 10; return [40 + n, 54 + n, 92 + n]; },
  b: (x, y) => { const c = ((x >> 3) + (y >> 3)) % 2, n = hash(x, y) * 8; return c ? [212 + n, 204 + n, 184 + n] : [172 + n, 168 + n, 152 + n]; },
  l: (x, y) => { const n = hash(x >> 1, y >> 1) * 18; return [190 + n * .6, 104 + n * .5, 44 + n * .3]; },
  r: (x, y) => { const c = ((x >> 2) + (y >> 2)) % 2; return c ? [232, 228, 214] : [56, 56, 62]; },
  e: (x, y) => { const s = hash(x >> 1, y >> 1), n = s > .97 ? -40 : s > .93 ? -18 : s < .03 ? 16 : 0; return [222 + n, 214 + n, 196 + n * 1.2]; }
};
const map = new E.TileMap({
  rows: buildRows(),
  legend: { '#': 1, '|': 2, k: { tile: 0, floor: 'k' }, h: { tile: 0, floor: 'h' }, o: { tile: 0, floor: 'o' }, t: { tile: 0, floor: 't' },
    b: { tile: 0, floor: 'b' }, l: { tile: 0, floor: 'l' }, r: { tile: 0, floor: 'r' }, e: { tile: 0, floor: 'e' } },
  types: { 1: { h: 44, top: '#2a2420', side: '#d8cfb8', face: 'plaster', roof: 'plain', cut: true }, 2: { h: 40, top: '#3a2a1e', side: '#8a5c36', face: 'plank', roof: 'plain', cut: true } },
  floorTex: (x, y, tag) => (FLOORS[tag] || FLOORS.b)(Math.floor(x), Math.floor(y)), ao: 4, outside: '#14100c'
});
const flow = new E.FlowField(map);

// furniture: [shape, x, y, facing, solid]
const S2 = Math.PI / 2, N2 = -Math.PI / 2;
const FURN = [
  ['mm_conftable', 104, 82, S2, 1], ['mm_chair', 72, 62, S2], ['mm_chair', 104, 62, S2], ['mm_chair', 136, 62, S2], ['mm_chair', 72, 104, N2], ['mm_chair', 136, 104, N2],
  ['mm_plant', 26, 30, S2, 1], ['mm_coatrack', 26, 132, S2, 1], ['mm_credenza', 172, 132, N2, 1],
  ['mm_desk', 272, 52, S2, 1], ['mm_chair', 272, 36, S2], ['mm_barcart', 318, 30, S2, 1], ['mm_sofa', 268, 128, N2, 1], ['mm_plant', 222, 30, S2, 1], ['mm_arclamp', 222, 112, 0, 1],
  ['mm_desk', 424, 52, S2, 1], ['mm_chair', 424, 36, S2], ['mm_barcart', 482, 30, S2, 1], ['mm_sofa', 404, 128, N2, 1], ['mm_coatrack', 364, 28, S2, 1], ['mm_plant', 484, 128, S2, 1], ['mm_credenza', 470, 88, Math.PI, 1],
  ['mm_desk', 568, 52, S2, 1], ['mm_chair', 568, 36, S2], ['mm_cabinet', 524, 28, S2, 1], ['mm_plant', 612, 30, S2, 1],
  ['mm_cabinet', 30, 168, S2, 1], ['mm_cabinet', 42, 168, S2, 1], ['mm_cabinet', 210, 168, S2, 1], ['mm_cabinet', 404, 168, S2, 1], ['mm_cabinet', 416, 168, S2, 1], ['mm_plant', 610, 170, S2, 1],
  ['mm_secdesk', 64, 198, S2, 1], ['mm_secdesk', 120, 198, S2, 1], ['mm_secdesk', 184, 198, S2, 1], ['mm_secdesk', 64, 254, S2, 1], ['mm_secdesk', 120, 254, S2, 1], ['mm_secdesk', 184, 254, S2, 1],
  ['mm_secdesk', 456, 198, S2, 1], ['mm_secdesk', 520, 198, S2, 1], ['mm_secdesk', 584, 198, S2, 1], ['mm_secdesk', 456, 254, S2, 1], ['mm_secdesk', 520, 254, S2, 1], ['mm_secdesk', 584, 254, S2, 1],
  ['mm_chair', 64, 212, N2], ['mm_chair', 120, 212, N2], ['mm_chair', 184, 212, N2], ['mm_chair', 456, 212, N2], ['mm_chair', 520, 212, N2], ['mm_chair', 584, 268, N2],
  ['mm_hifi', 60, 314, S2, 1], ['mm_sofa', 80, 414, N2, 1], ['mm_easel', 150, 326, S2, 1], ['mm_arclamp', 28, 380, 0, 1], ['mm_plant', 196, 316, S2, 1], ['mm_plant', 196, 418, S2, 1],
  ['mm_coffee', 300, 312, S2, 1], ['mm_cooler', 354, 316, S2, 1], ['mm_board', 248, 306, S2], ['mm_table', 290, 380, S2, 1], ['mm_chair', 272, 380, 0], ['mm_chair', 308, 380, Math.PI],
  ['mm_elevator', 560, 306, S2], ['mm_logo', 408, 306, S2], ['mm_desk', 470, 368, S2, 1], ['mm_chair', 470, 352, S2], ['mm_sofa', 560, 420, N2, 1], ['mm_plant', 394, 420, S2, 1], ['mm_plant', 616, 316, S2, 1], ['mm_coatrack', 614, 420, S2, 1], ['mm_arclamp', 396, 330, 0, 1]
];
for (const [id, x, y, f, solid] of FURN) if (solid) map.solid(id, x, y, 0, { facing: f });

// windows, the projector's screen and Hollis's portrait, painted on the north walls' faces
const WINDOWS = [[20, 50], [158, 188], [298, 330], [360, 488], [528, 616]];
const SCREEN = [58, 150, 12, 40];

// ------------------------------------------------------------------------------------------------ people
const RIGS = {};
for (const id in MM.PEOPLE) RIGS[id] = new E.Humanoid(Object.assign({ size: 1.25, weapon: null }, MM.PEOPLE[id].look));
const SPOT = { hollis: [298, 76, 2.6], bunny: [64, 362, -1], murray: [138, 350, -1.8], lorraine: [470, 340, S2], teddy: [568, 78, S2], dot: [120, 226, -S2],
  fran: [336, 352, 2.5], gus: [588, 326, 2.4], jimmy: [330, 234, Math.PI] };
const PATROL = { teddy: [[548, 80], [600, 90]], jimmy: [[300, 230], [372, 236], [340, 180]] };
const NPC_SPK = { hollis: 'hollis', bunny: 'bunny', murray: 'murray', lorraine: 'lorraine', teddy: 'teddy', dot: 'dot', fran: 'fran', gus: 'gus', jimmy: 'jimmy' };

// ------------------------------------------------------------------------------------------------ state
let S = null;
const freshPlayer = (spk, name) => ({ spk, name, deck: [], hand: [], lead: null, tail: null, tagline: '', interest: 25, cards: [] });
const PCOL = ['#ffd36a', '#8ab4f8', '#f28b82', '#7fd8b0'];
// a player's place in the pitch cast: player 1 is cast[0]; the others follow the client, the second and Hollis
const castOf = pi => pi === 0 ? 0 : 3 + pi;
function newGame(mode, nPlayers) {
  S = { mode, day: 0, billings: 0, nerve: 50, bourbon: 0, home: 60, bunny: 0, hollis: 0, cards: [], results: [], clock: 540, evening: [],
    intel: null, teddyIn: false, phone: null, talked: {}, players: [freshPlayer('cal', 'CAL')], hubScore: 0, hubDone: false, demoLoop: (S && S.demoLoop) || 0 };
  if (mode === 'versus') S.players = [['cal', 'PLAYER 1'], ['bunny', 'PLAYER 2'], ['teddy', 'PLAYER 3'], ['murray', 'PLAYER 4']].slice(0, clamp(nPlayers || 2, 2, 4)).map(([a, b]) => freshPlayer(a, b));
}
const day = () => MM.DAYS[S.day];
const card = id => Object.assign({ id }, MM.CARDS[id]);
const has = id => S.cards.some(c => c.id === id);
function startDay(i) {
  S.day = i; S.clock = S.mode === 'hub' ? 660 : 540; S.intel = { obj: [false, false, false], want: false }; S.teddyIn = false;
  S.phone = { state: 'idle', t: 0 }; S.talked = {}; S.players.forEach(p => { p.deck = []; p.hand = []; p.lead = p.tail = null; p.tagline = ''; p.interest = 25; });
  S.toasts = []; S.sampleSeen = false;
}
const PITCH_AT = 840;
const clockRate = () => S.mode === 'hub' ? 2.2 : S.mode === 'demo' ? 4 : 1;
const costK = () => S.mode === 'hub' ? .7 : 1;
function spend(min) { S.clock += min * costK(); }
const clockText = (m = S.clock) => { let h = Math.floor(m / 60), mm = Math.floor(m % 60); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(mm).padStart(2, '0') + ' ' + ap; };
function toast(title, text, color = '#f0c860') { S.toasts.push({ title, text, color, t: 0 }); if (S.toasts.length > 3) S.toasts.shift(); }
function addCard(id, over) {
  if (has(id)) return false;
  const c = Object.assign(card(id), over || {}); S.cards.push(c);
  game.audio.sfx('idea'); toast('NEW IDEA', c.title + '  (' + MM.TAGS[c.tag].label + ')', MM.TAGS[c.tag].color);
  hubProgress();
  return true;
}
function drink() { S.bourbon = Math.min(4, S.bourbon + 1); S.nerve = Math.min(100, S.nerve + 15); game.audio.sfx('pour'); game.after(.4, () => game.audio.sfx('clink')); }
function learn(kind, i) {
  if (kind === 'want') { if (!S.intel.want) { S.intel.want = true; toast('INTEL', 'What the client really wants: ' + MM.TAGS[day().want].label, '#8ad0c8'); } }
  else if (!S.intel.obj[i]) { S.intel.obj[i] = true; toast('INTEL', 'Objection ' + (i + 1) + ' will want ' + MM.TAGS[day().objections[i].tag].label, '#8ad0c8'); }
}

// ------------------------------------------------------------------------------------------------ dialog with a Simlish voice
let speaker = 'cal';
const voice = { page: -1, shown: 0 };
function textSpeed() { return game.settings.textSpeed === 'slow' ? 32 : game.settings.textSpeed === 'fast' ? 90 : 55; }
function openTalk(spk, lines, o = {}) {
  const P = MM.PEOPLE[spk] || MM.PEOPLE.cal; speaker = spk;
  talk.speed = textSpeed(); voice.page = -1; voice.shown = 0;
  const demo = S && S.mode === 'demo';
  talk.say(lines, Object.assign({ name: o.name || P.name, portrait: RIGS[spk], portraitSize: 44, place: o.place || 'bottom' },
    demo ? { auto: .9 } : {}, o.choices && !demo ? { choices: o.choices, onChoice: o.onChoice } : {}, o.onDone ? { onDone: o.onDone } : {}));
}
// generators for scripts: yield* say('hollis', [...]); const c = yield* ask('hollis', [...], ['A', 'B'])
function* say(spk, lines, o) { openTalk(spk, Array.isArray(lines) ? lines : [lines], o); yield; yield E.until(() => !talk.open); }
function* ask(spk, lines, choices, o = {}) {
  let pick = -1;
  openTalk(spk, Array.isArray(lines) ? lines : [lines], Object.assign({}, o, { choices, onChoice: i => { pick = i; } }));
  yield; yield E.until(() => !talk.open);
  if (pick < 0) pick = S && S.mode === 'demo' ? (S.botChoice || 0) : 0;
  return pick;
}
function runVoice() {
  if (!talk.open) return;
  if (talk.i !== voice.page) { voice.page = talk.i; voice.shown = 0; }
  const pg = talk.pages[talk.i], s = Array.isArray(pg) ? pg.join(' ') : String(pg || '');
  const P = MM.PEOPLE[speaker] || MM.PEOPLE.cal;
  while (voice.shown < talk.shown) { if (voice.shown % 2 === 0) MM.babble(game.audio, P.pitch, s[voice.shown] || 'a', voice.shown); voice.shown++; }
}

// ------------------------------------------------------------------------------------------------ input helpers
function codeFor(action) {
  const I = game.input, codes = (I.map && I.map[action]) || [], dev = I.lastDevice;
  if (dev === 'gamepad') return codes.find(c => /^Pad\d+$/.test(c)) || codes[0];
  if (dev === 'mouse' && (action === 'confirm' || action === 'interact')) return 'Mouse0';
  return codes.find(c => !/^Pad|^Act:|^Mouse/.test(c)) || codes[0];
}
// a prompt: the button, then its words; returns the width drawn
function prompt(g, action, words, x, y, color = '#f4ecd8') {
  const w = MM.drawButton(g, codeFor(action), x, y, fam());
  T(g, words, x + w + 2, y + 2, color);
  return w + 4 + E.font.width(words);
}
function promptW(action, words) { return MM.drawButton(null, codeFor(action), 0, 0, fam()) + 4 + E.font.width(words); }
function moveInput() {
  const I = game.input; let [mx, my] = I.move();
  if (I.lastDevice === 'gamepad') { if (game.settings.invertX) mx = -mx; if (game.settings.invertY) my = -my; }
  return [mx, my];
}
// list navigation that respects the invert settings on a pad (cards, grids)
function navDir() {
  const I = game.input, rep = a => I.repeat(a, .35, .09);
  let dx = (rep('right') ? 1 : 0) - (rep('left') ? 1 : 0), dy = (rep('down') ? 1 : 0) - (rep('up') ? 1 : 0);
  if (I.lastDevice === 'gamepad') { if (game.settings.invertX) dx = -dx; if (game.settings.invertY) dy = -dy; }
  return [dx, dy];
}
let lastPointer = null;
function pointerMoved() {
  const p = game.input.pointer(); if (!p) return false;
  const moved = !lastPointer || Math.abs(p[0] - lastPointer[0]) + Math.abs(p[1] - lastPointer[1]) > 2;
  lastPointer = p.slice(); return moved;
}
// any key at all (not only bound ones), a button, a click, a push of the stick or a move of the mouse
let rawKey = false;
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', () => { rawKey = true; }, true);
function anyInput() {
  const I = game.input; const [mx, my] = I.move(), k = rawKey; rawKey = false;
  return k || I.anyPressed() || !!I.clicked() || Math.hypot(mx, my) > .5 || pointerMoved();
}
const inRect = (p, x, y, w, h) => p && p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h;

// ------------------------------------------------------------------------------------------------ AI Hub (ghost mode)
const hub = { info: null, ghosts: new Map(), sendT: 0, progT: 0, ended: false, endReason: '', standings: null, resulted: false };
function hubScore() {
  if (!S) return 0;
  const p = S.players[0];
  if (S.hubResultScore !== undefined) return S.hubResultScore;
  if (S.inPitch) return 200 + Math.round(p.interest * 10);
  return S.cards.reduce((a, c) => a + c.power * 10, 0);
}
function hubLabel() {
  if (!S) return '';
  if (S.hubResultScore !== undefined) return S.hubWon ? 'Won the account' : 'Lost the account';
  if (S.inPitch) return 'Pitching: room at ' + Math.round(S.players[0].interest) + '%';
  return S.cards.length + ' ideas, ' + clockText();
}
function hubProgress() { if (HUB && hub.info && !hub.ended && !hub.resulted) try { AIHub.progress({ score: hubScore(), label: hubLabel() }); } catch (e) { /* the hub may be gone */ } }
function hubResult() {
  if (!HUB || !hub.info || hub.resulted) return;
  hub.resulted = true;
  const p = S.players[0];
  try { AIHub.result({ score: hubScore(), stats: { Ideas: S.cards.length, Room: Math.round(p.interest) + '%' }, awards: S.hubWon ? [{ title: 'Signed', detail: day().account }] : [] }); } catch (e) { /* ignore */ }
}
async function hubConnect() {
  let info = null;
  try { info = await AIHub.connect({ mode: 'ghost', seats: [1, 4] }); } catch (e) { info = null; }
  if (!info) { game.go('title'); return; }
  hub.info = info;
  const seatColor = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
  for (const p of info.players) if (p.id !== info.me) {
    const rig = new E.Humanoid(Object.assign({ size: 1.25, weapon: null }, MM.PEOPLE.cal.look, { colors: Object.assign({}, MM.PEOPLE.cal.look.colors, { coat: p.color || seatColor[p.id % 4], pants: '#2a2a30' }) }));
    hub.ghosts.set(p.id, { id: p.id, name: String(p.name || 'P' + (p.id + 1)), color: p.color || seatColor[p.id % 4], x: 560, y: 330, tx: 560, ty: 330, f: S2, area: 'office', rig, seen: 0 });
  }
  AIHub.on('message', (d, from) => {
    const gh = hub.ghosts.get(from); if (!gh || !d || d.t !== 'g') return;
    gh.tx = +d.x || 0; gh.ty = +d.y || 0; gh.f = +d.f || 0; gh.area = d.a === 'pitch' ? 'pitch' : 'office'; gh.seen = game.real;
  });
  AIHub.on('leave', ({ id }) => hub.ghosts.delete(id));
  AIHub.on('time-up', () => { if (!hub.resulted) hubResult(); });
  AIHub.on('end', ({ reason, standings }) => { hub.ended = true; hub.endReason = reason; hub.standings = standings; talk.close(); game.audio.stopMusic(); game.audio.mute(true); game.input.clear(); });
  newGame('hub'); startDay(0); game.go('office', { fade: 0 });
  try { AIHub.ready(); } catch (e) { game.fail('AIHub.ready', e); }
}
const hubLive = () => !hub.info || (AIHub.time() >= 0 && !hub.ended);
function hubSend(area, x, y, f) {
  if (!HUB || !hub.info || hub.ended) return;
  hub.sendT -= 1 / 120; hub.progT -= 1 / 120;
  if (hub.sendT <= 0) { hub.sendT = .12; try { AIHub.send({ t: 'g', a: area, x: Math.round(x), y: Math.round(y), f: Math.round(f * 100) / 100 }, { reliable: false }); } catch (e) { /* ignore */ } }
  if (hub.progT <= 0) { hub.progT = 1; hubProgress(); }
}
function drawHubOverlay(r) {
  if (!hub.info) return;
  r.overlay(g => {
    const t = AIHub.time();
    if (t < 0 && isFinite(t)) { const n = Math.ceil(-t / 1000); E.ui.box(g, r.W / 2 - 60, r.H / 2 - 24, 120, 48, { bg: ['#2a2018', '#14100c'], border: '#d8b46a' }); E.font.title(g, String(n), r.W / 2, r.H / 2 - 16, { scale: 3, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] }); }
    else if (!isFinite(t)) T(g, 'Waiting for the other creatives...', r.W / 2, r.H / 2, '#f0c860', { align: 'center' });
    if (hub.ended) {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      E.font.title(g, 'ROUND OVER', r.W / 2, r.H / 2 - 30, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
      T(g, hub.endReason === 'finished' ? 'The hub has the results.' : 'This round did not count.', r.W / 2, r.H / 2 + 4, '#f4ecd8', { align: 'center' });
    }
  });
}

// ------------------------------------------------------------------------------------------------ the office: interactables
const OBJ = [
  { id: 'drawer', x: 412, y: 66, z: 8, name: 'Bottom drawer', verb: 'Open' },
  { id: 'window', x: 424, y: 22, z: 20, name: 'The window', verb: 'Look' },
  { id: 'barcart', x: 482, y: 34, z: 14, name: 'Bar cart', verb: 'Pour' },
  { id: 'phone', x: 438, y: 58, z: 14, name: 'Telephone', verb: 'Answer', when: () => S.phone.state === 'ringing' },
  { id: 'hifi', x: 60, y: 322, z: 12, name: 'Hi-fi', verb: 'Play' },
  { id: 'paper', x: 184, y: 206, z: 12, name: 'Newspaper', verb: 'Read' },
  { id: 'board', x: 248, y: 312, z: 18, name: 'Bulletin board', verb: 'Look' },
  { id: 'coffee', x: 292, y: 322, z: 14, name: 'Coffee urn', verb: 'Pour' },
  { id: 'sample', x: 104, y: 96, z: 14, name: 'Conference table', verb: 'Prepare' }
];
let NPCS = [];
function buildNPCs() {
  NPCS = [];
  for (const id in SPOT) {
    if (id === 'jimmy' && S.day === 0) continue;
    const [x, y, f] = SPOT[id];
    NPCS.push({ id, kind: 'npc', x, y, home: [x, y], facing: f, vx: 0, vy: 0, name: MM.PEOPLE[id].name, verb: 'Talk to', pi: 0, wait: 1 + Math.random() * 2, expr: null });
  }
}
let hero = null, heroRig = RIGS.cal, focus = null, walkTo = null, busy = null, folio = null, firstHint = 0;
const things = () => NPCS.concat(OBJ.filter(o => !o.when || o.when()));
// what is under a screen point: a person (the renderer's pick), else an object near where it was drawn last frame
function thingAt(p) {
  const hits = game.r && game.r.pick ? game.r.pick(p[0], p[1]) : [];
  const npc = hits.find(h => h && h.kind === 'npc'); if (npc) return npc;
  let best = null, bd = 14;
  for (const o of OBJ) if (o.sp && (!o.when || o.when())) { const d = Math.hypot(o.sp[0] - p[0], o.sp[1] - p[1]); if (d < bd) { bd = d; best = o; } }
  return best;
}
function nearest(maxD = 24) {
  let best = null, bd = maxD;
  for (const t of things()) { const d = Math.hypot(t.x - hero.x, t.y - hero.y); if (d < bd) { bd = d; best = t; } }
  return best;
}

// a conversation or examination: a script that holds play while it runs
function use(t) {
  if (busy) return;
  walkTo = null;
  if (t.kind === 'npc') { t.facing = Math.atan2(hero.y - t.y, hero.x - t.x); hero.facing = Math.atan2(t.y - hero.y, t.x - hero.x); }
  busy = game.script(function* () { yield* (t.kind === 'npc' ? talkTo(t) : examine(t)); busy = null; });
}
function* talkTo(n) {
  const d = S.day, id = n.id, TK = MM.TALK[id] && MM.TALK[id][d], again = S.talked[id];
  S.talked[id] = true; n.expr = 'smile';
  if (again && id !== 'bunny') { yield* say(id, [pickLine(id)]); spend(5); n.expr = null; return; }
  if (!TK) { yield* say(id, ['Mr. Whitmore.']); spend(5); n.expr = null; return; }
  if (id === 'hollis') {
    const c = yield* ask(id, TK.lines, TK.choices); yield* say(id, c === 0 ? TK.yes : TK.no);
    if (d === 0) { if (c === 0) { drink(); addCard('warstory'); S.hollis++; } }
    else if (d === 1) { if (c === 0) addCard('oldaccount'); else S.nerve = Math.min(100, S.nerve + 10); }
    else { if (c === 0) { drink(); addCard('portrait'); S.hollis++; } else S.nerve = Math.min(100, S.nerve + 10); }
    spend(25);
  } else if (id === 'bunny') {
    if (again) { yield* say(id, [S.bunny > 0 ? "I'll have more by two, Cal." : "I'm busy, Mr. Whitmore."]); spend(5); n.expr = null; return; }
    if (d < 2) {
      const c = yield* ask(id, TK.lines, TK.choices); yield* say(id, c === 0 ? TK.yes : TK.no);
      if (d === 0) { addCard('notebook'); if (c === 0) S.bunny++; else { S.bunny--; S.nerve = Math.min(100, S.nerve + 5); } }
      else { if (c === 0) { S.bunny++; addCard('firstflight'); } else S.bunny--; }
    } else if (S.bunny >= 1 || S.mode === 'demo') { yield* say(id, TK.lines); addCard('bigidea', { power: S.bunny >= 2 ? 4 : 3 }); }
    else yield* say(id, TK.cold);
    spend(25);
  } else if (id === 'lorraine') {
    const c = yield* ask(id, TK.lines, TK.choices);
    if (c === 0) { yield* say(id, TK.yes); learn('want'); } else { yield* say(id, TK.no); S.nerve = Math.min(100, S.nerve + 15); }
    if (d === 0) { yield* say(id, ["And Cal. Every woman who walks in this office knows exactly what every other woman is wearing.", 'Write that down.']); addCard('rules'); }
    spend(20);
  } else if (id === 'teddy') {
    const c = yield* ask(id, TK.lines, TK.choices); yield* say(id, c === 0 ? TK.yes : TK.no);
    if (c === 0) { S.teddyIn = true; learn('obj', d); toast('TEDDY IS IN', 'Teddy will sit in on the pitch.', '#c8a030'); }
    if (d === 0) addCard('ratings');
    spend(20);
  } else {
    yield* say(id, TK.lines);
    if (id === 'murray') addCard(['sketch', 'blankpage', 'kitchen'][d]);
    if (id === 'dot') learn('obj', [0, 2, 2][d]);
    if (id === 'fran') learn('obj', [1, 0, 1][d]);
    if (id === 'gus') addCard('gus');
    if (id === 'jimmy' && d === 1) addCard('dart');
    spend(id === 'gus' || id === 'jimmy' ? 10 : 20);
  }
  n.expr = null;
}
const AGAIN = { hollis: "Go on, Cal. Some of us have lunch.", lorraine: 'Two o\'clock, Mr. Whitmore.', teddy: 'Buddy. Pal. Busy.', murray: "It's in charcoal, Cal. Charcoal takes time.",
  dot: 'Your messages are on your desk, Mr. Whitmore.', fran: 'I didn\'t say anything. You didn\'t hear it from me.', gus: 'Fortieth floor. Same as always.', jimmy: 'Yes sir, Mr. Whitmore!' };
const pickLine = id => AGAIN[id] || 'Mr. Whitmore.';
function* examine(o) {
  const d = S.day;
  if (o.id === 'drawer') {
    if (!has('photo')) { yield* say('cal', ['(The shoebox. Coney Island, 1938. A boy in a borrowed suit who did not know yet what his name was going to be.)'], { name: 'CAL, THINKING' }); addCard('photo'); spend(15); }
    else { yield* say('cal', ['(You close the drawer. Some things stay in drawers.)'], { name: 'CAL, THINKING' }); spend(3); }
  } else if (o.id === 'window') {
    if (!has('window')) { yield* say('cal', ['(Forty floors down, Madison Avenue is a toy. From up here, nobody can touch you. That is what they pay for.)'], { name: 'CAL, THINKING' }); addCard('window'); spend(15); }
    else { yield* say('cal', ['(A pigeon on the ledge regards you with professional contempt.)'], { name: 'CAL, THINKING' }); spend(3); }
  } else if (o.id === 'barcart') {
    const c = yield* ask('cal', [S.bourbon >= 3 ? "(The decanter is lighter than it was this morning.)" : '(Canadian rye. The good glasses.)'], ['Pour one.', 'Not now.'], { name: 'CAL, THINKING' });
    if (c === 0) { drink(); if (!has('rye')) addCard('rye'); if (S.bourbon >= 3) toast('YOUR HAND IS NOT STEADY', 'The room will feel it in the pitch.', '#e0505e'); spend(10); }
  } else if (o.id === 'phone') {
    S.phone.state = 'answered';
    const TK = MM.TALK.claire[d];
    const c = yield* ask('claire', TK.lines, TK.choices); yield* say('claire', c === 0 ? TK.yes : TK.no);
    S.home = clamp(S.home + (c === 0 ? 12 : -6), 0, 100);
    addCard('claire'); spend(15);
  } else if (o.id === 'hifi') {
    game.audio.sfx({ wave: 'sine', freq: 'C5', arp: [0, 4, 7, 11, 14], step: .12, dur: .7, vol: .16 });
    if (!has('sinatra')) { yield* say('cal', ['(The needle drops. "In the Wee Small Hours." Every man in the creative lounge stops talking at once.)'], { name: 'CAL, THINKING' }); addCard('sinatra'); spend(15); }
    else { yield* say('cal', ['(Side two. Murray hums along, off-key, with total conviction.)'], { name: 'CAL, THINKING' }); spend(5); }
  } else if (o.id === 'paper') {
    if (!has('paper')) { yield* say('cal', ['(The Herald Tribune. Missiles, a strike, a hurricane in the Gulf. On page nine, a girdle ad you wrote in 1959.)'], { name: 'CAL, THINKING' }); addCard('paper'); spend(15); }
    else { yield* say('cal', ['(The crossword is half done, in Dot\'s handwriting, in pen.)'], { name: 'CAL, THINKING' }); spend(3); }
  } else if (o.id === 'board') {
    if (!has('crayon')) { yield* say('cal', ["(A crayon airplane, signed 'FRANS BOY EDDIE AGE 6'. It is flying over a house with a very large sun.)"], { name: 'CAL, THINKING' }); addCard('crayon'); spend(15); }
    else { yield* say('cal', ['(A notice about the Christmas party. It is April.)'], { name: 'CAL, THINKING' }); spend(3); }
  } else if (o.id === 'coffee') {
    yield* say('cal', [S.bourbon > 0 ? '(Burnt, black and hot. The edges of the room come back into focus.)' : '(Burnt, black and hot. Your heart considers its options.)'], { name: 'CAL, THINKING' });
    S.bourbon = Math.max(0, S.bourbon - 1); S.nerve = Math.max(0, S.nerve - 5); spend(10);
  } else if (o.id === 'sample') {
    const sid = day().sample;
    if (!has(sid)) { yield* say('cal', ['(The client sent it up this morning: ' + MM.CARDS[sid].src + ')'], { name: 'CAL, THINKING' }); addCard(sid); spend(10); }
    const c = yield* ask('cal', ['(Everything is set for two o\'clock. You could call them in now and get it over with.)'], ['Not yet.', 'Bring them in early.'], { name: 'CAL, THINKING' });
    if (c === 1) { S.clock = Math.max(S.clock, PITCH_AT - 1); S.early = true; }
  }
}

// ------------------------------------------------------------------------------------------------ the bot (attract mode)
const BOT_PLAN = ['lorraine', 'bunny', 'murray', 'FOLIO', 'drawer', 'barcart', 'hollis', 'VIEW', 'dot', 'sample'];
const bot = { i: 0, wait: 0, t: 0 };
function botThing(id) { return things().find(t => t.id === id); }
function botStep(dt) {
  if (busy || talk.open) return null;
  if (folio) { bot.t += dt; if (bot.t > 1.6) { folio.i = (folio.i + 1) % Math.max(1, S.cards.length); bot.t = 0; if (++bot.folioFlips > 2) folio = null; } return null; }
  if (bot.wait > 0) { bot.wait -= dt; return null; }
  const step = BOT_PLAN[bot.i];
  if (!step) { S.clock = PITCH_AT; return null; }
  if (step === 'FOLIO') { folio = { i: 0 }; bot.t = 0; bot.folioFlips = 0; bot.i++; return null; }
  if (step === 'VIEW') { game.nextView(); game.note('VIEW: ' + game.view.id.toUpperCase(), 1.2); bot.i++; bot.wait = 1.5; return null; }
  const t = botThing(step); if (!t) { bot.i++; return null; }
  const dx = t.x - hero.x, dy = t.y - hero.y, d = Math.hypot(dx, dy);
  if (d < 20) { S.botChoice = step === 'barcart' ? 0 : step === 'sample' ? 1 : 0; use(t); bot.i++; bot.wait = .4; return null; }
  return [dx / d, dy / d];   // the demo walks straight through the walls: it may cheat
}

// ------------------------------------------------------------------------------------------------ the office scene
function placeHero() {
  hero = new E.Body({ x: 560, y: 330, r: 5 }); hero.facing = S2;
}
const office = {
  pausable: !HUB, view: 'threequarter', camera: { zoom: [.75, 2], start: 1.15 },
  enter() {
    buildNPCs(); placeHero(); focus = null; walkTo = null; busy = null; folio = null; bot.i = 0; bot.wait = 1; S.inPitch = false;
    game.follow(hero, { z: 18 }); game.cam.bounds = v => map.bounds(v);
    game.lights.enabled = true; game.lights.ambient = .8;
    if (S.mode === 'demo') game.setView(['threequarter', 'iso', 'topdown'][S.demoLoop % 3]);
    game.audio.music(MM.SONGS.office);
    game.audio.sfx('ding');
    firstHint = S.day === 0 && S.mode === 'story' ? 9 : 0;
    if (S.mode === 'story' && S.day === 0) toast('THE FORTIETH FLOOR', 'Gather ideas before the 2:00 pitch. Talking and looking take time.', '#f0c860');
  },
  exit() { game.lights.enabled = false; },
  update(dt) {
    if (S.mode === 'demo' && anyInput()) { exitDemo(); return; }
    if (talk.update(dt)) { runVoice(); updateActors(dt, 0, 0); return; }
    runVoice();
    if (!hubLive()) { updateActors(dt, 0, 0); return; }
    S.toasts.forEach(t => t.t += dt); S.toasts = S.toasts.filter(t => t.t < 4.5);
    if (firstHint > 0) firstHint -= dt;
    const I = game.input;
    if (folio && S.mode !== 'demo') { updateFolio(); updateActors(dt, 0, 0); return; }
    // the clock, the telephone and two o'clock
    if (!busy) S.clock += dt * clockRate();
    phoneTick(dt);
    if (S.clock >= PITCH_AT && !busy && !talk.open) { goPitch(); return; }
    if (busy) { updateActors(dt, 0, 0); hubSend('office', hero.x, hero.y, hero.facing); return; }
    let mv = [0, 0];
    if (S.mode === 'demo') {
      const d = botStep(dt);
      if (d) { hero.x += d[0] * 120 * dt; hero.y += d[1] * 120 * dt; hero.facing = Math.atan2(d[1], d[0]); hero.vx = d[0] * 120; hero.vy = d[1] * 120; }
      else { hero.vx = hero.vy = 0; }
      updateActors(dt, 0, 0, true); hubSend('office', hero.x, hero.y, hero.facing); return;
    }
    if (I.pressed('view')) { game.nextView(); game.note('VIEW: ' + game.view.id.toUpperCase(), 1); }
    if (I.pressed('folio')) { folio = { i: 0 }; game.audio.sfx('card'); return; }
    // mouse: hover focuses what is under the pointer; a click walks there (and uses it on arrival)
    const p = I.pointer(), clicked = I.clicked();
    let hover = null;
    if (p && (I.lastDevice === 'mouse')) hover = thingAt(p);
    if (clicked) {
      const hit = thingAt(clicked);
      if (hit) walkTo = { x: hit.x, y: hit.y, use: hit };
      else { const gp = game.mouseGround(); if (gp) walkTo = { x: gp[0] !== undefined ? gp[0] : gp.x, y: gp[1] !== undefined ? gp[1] : gp.y }; }
      if (walkTo) { walkTo.t = 0; walkTo.last = Math.hypot(walkTo.x - hero.x, walkTo.y - hero.y); }
    }
    mv = moveInput();
    if (Math.hypot(mv[0], mv[1]) > .15) walkTo = null;
    let dir;
    if (walkTo) {
      const dd = Math.hypot(walkTo.x - hero.x, walkTo.y - hero.y);
      if (walkTo.use && dd < 20) { const u = walkTo.use; walkTo = null; use(u); dir = [0, 0]; }
      else if (dd < 4) { walkTo = null; dir = [0, 0]; }
      else {
        flow.update(walkTo.x, walkTo.y); const fd = flow.dir(hero.x, hero.y, walkTo.x, walkTo.y); dir = [fd[0], fd[1]];
        walkTo.t += dt; if (walkTo.t > 1) { if (walkTo.last - dd < 6) walkTo = null; else { walkTo.t = 0; walkTo.last = dd; } }
      }
    } else dir = game.view.screenDirToGround(mv[0], mv[1]);
    // a drink or three: the floor tilts a little
    if (S.bourbon >= 2 && Math.hypot(dir[0], dir[1]) > .1) { const a = Math.sin(game.time * 1.7) * .22 * (S.bourbon - 1), c = Math.cos(a), s = Math.sin(a); dir = [dir[0] * c - dir[1] * s, dir[0] * s + dir[1] * c]; }
    const sp = I.down('hurry') ? 112 : 78;
    hero.vx = dir[0] * sp; hero.vy = dir[1] * sp; hero.update(dt, map);
    if (Math.hypot(dir[0], dir[1]) > .1) hero.facing = Math.atan2(dir[1], dir[0]);
    focus = hover || nearest();
    if (focus && Math.hypot(focus.x - hero.x, focus.y - hero.y) > 26 && focus !== hover) focus = null;
    if (I.pressed('interact') && focus) {
      if (Math.hypot(focus.x - hero.x, focus.y - hero.y) < 26) use(focus);
      else { walkTo = { x: focus.x, y: focus.y, use: focus, t: 0, last: 999 }; }
    }
    updateActors(dt, hero.vx, hero.vy);
    hubSend('office', hero.x, hero.y, hero.facing);
  },
  draw(r) { drawOffice(r, false); drawOfficeHud(r); drawHubOverlay(r); }
};
function phoneTick(dt) {
  const P = S.phone; if (!P || S.mode === 'hub') return;
  const ringAt = 660 + S.day * 20;
  if (P.state === 'idle' && S.clock >= ringAt) { P.state = 'ringing'; P.t = 0; toast('THE PHONE IS RINGING', 'In your office. It is probably Claire.', '#e0e0e0'); }
  if (P.state === 'ringing') {
    P.t -= dt; if (P.t <= 0) { P.t = 1.4; const d = Math.hypot(hero.x - 438, hero.y - 58); game.audio.sfx('ring', { vol: clamp(1.2 - d / 400, .25, 1) }); }
    if (S.clock >= ringAt + 40) { P.state = 'missed'; S.home = Math.max(0, S.home - 10); toast('MISSED CALL', 'Claire hung up.', '#e0505e'); }
  }
}
function updateActors(dt, hvx, hvy, demo) {
  if (hero) {
    if (demo) heroRig.update(dt, { x: hero.x, y: hero.y, z: 0, vx: hero.vx, vy: hero.vy, facing: hero.facing });
    else heroRig.update(dt, { x: hero.x, y: hero.y, z: hero.z, vx: hvx, vy: hvy, facing: hero.facing, expr: S.bourbon >= 3 ? 'wince' : null });
  }
  for (const n of NPCS) {
    const route = PATROL[n.id];
    let vx = 0, vy = 0;
    const near = hero && Math.hypot(hero.x - n.x, hero.y - n.y) < 40;
    if (route && !near && !(busy || talk.open)) {
      const [tx, ty] = route[n.pi % route.length], dx = tx - n.x, dy = ty - n.y, d = Math.hypot(dx, dy);
      if (d < 3) { n.wait -= dt; if (n.wait <= 0) { n.pi++; n.wait = 1.5 + Math.random() * 2; } }
      else { vx = dx / d * 34; vy = dy / d * 34; n.x += vx * dt; n.y += vy * dt; n.facing = Math.atan2(dy, dx); }
    } else if (near && !(busy || talk.open)) n.facing = E.approachAng ? E.approachAng(n.facing, Math.atan2(hero.y - n.y, hero.x - n.x), dt * 4) : Math.atan2(hero.y - n.y, hero.x - n.x);
    RIGS[n.id].update(dt, { x: n.x, y: n.y, z: 0, vx, vy, facing: n.facing, expr: n.expr, pose: n.id === 'hollis' && !near ? 'hips' : null });
  }
  for (const gh of hub.ghosts.values()) {
    const k = 1 - Math.pow(.004, dt), ox = gh.x, oy = gh.y;
    gh.x += (gh.tx - gh.x) * k; gh.y += (gh.ty - gh.y) * k;
    gh.rig.update(dt, { x: gh.x, y: gh.y, z: 0, vx: (gh.x - ox) / dt, vy: (gh.y - oy) / dt, facing: gh.f });
  }
}

// ---------------------------------------------------------------- drawing the floor
function wallQuad(r, x0, x1, z0, z1, fn, o = {}) {
  r.queue((x0 + x1) / 2, 17.5, 0, g => {
    const a = r.w(x0, 16.2, z1), b = r.w(x1, 16.2, z1), c = r.w(x1, 16.2, z0), d = r.w(x0, 16.2, z0);
    if (Math.abs(a[1] - b[1]) < 1.5 && Math.abs(a[0] - d[0]) < 1.5) fn(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(d[1] - a[1]), true);
    else { px.poly(g, [a, b, c, d], o.flat || '#8ab8e0'); }
  }, { bias: 1, emissive: !!o.emissive });
}
function drawSkyline(g, x, y, w, h, night) {
  px.rect(g, x, y, w, h, night ? '#1a2040' : '#9cc4e4');
  px.rect(g, x, y + Math.round(h * .55), w, Math.ceil(h * .45), night ? '#2a2848' : '#c4dcec');
  for (let i = 0; i < w; i += 7) {
    const bh = Math.round(h * (.25 + hash(i, 7) * .55)), bw = 5 + Math.floor(hash(i, 3) * 4);
    px.rect(g, x + i, y + h - bh, Math.min(bw, w - i), bh, night ? '#12142a' : '#7a8ca0');
    for (let wy = y + h - bh + 2; wy < y + h - 2; wy += 3) for (let wx = x + i + 1; wx < x + i + Math.min(bw, w - i) - 1; wx += 2) if (hash(wx, wy) > (night ? .55 : .8)) px.rect(g, wx, wy, 1, 1, night ? '#f0d890' : '#a8b8c8');
  }
  for (let i = 0; i <= w; i += 12) px.rect(g, x + Math.min(i, w - 1), y, 1, h, '#2a2420');
  px.rect(g, x, y, w, 1, '#2a2420'); px.rect(g, x, y + h - 1, w, 1, '#2a2420'); px.rect(g, x, y + Math.round(h / 2), w, 1, '#3a3430');
}
function drawOffice(r, pitchMode) {
  map.drawFloor(r); map.queueWalls(r);
  const night = pitchMode && PS && PS.lightsDown;
  for (const [x0, x1] of WINDOWS) if (!pitchMode || x1 < 200) wallQuad(r, x0, x1, 12, 38, (g, x, y, w, h) => drawSkyline(g, x, y, w, h, false), { emissive: true });
  // the projector screen
  wallQuad(r, SCREEN[0], SCREEN[1], SCREEN[2], SCREEN[3], (g, x, y, w, h) => {
    px.rect(g, x - 1, y - 2, w + 2, 2, '#3a3a3a'); px.rect(g, x, y, w, h, '#ecebe4');
    if (PS && PS.slide >= 0 && pitchMode) MM.drawSlide(g, day().slides, PS.slide, x + 2, y + 2, w - 4, h - 4);
  }, { emissive: true, flat: '#ecebe4' });
  // Hollis's portrait
  wallQuad(r, 246, 290, 16, 40, (g, x, y, w, h) => {
    px.rect(g, x, y, w, h, '#c8a040'); px.rect(g, x + 2, y + 2, w - 4, h - 4, '#2a2018');
    px.disc(g, x + w / 2, y + h * .38, Math.max(2, h * .16), '#d8b090'); px.rect(g, x + w * .28, y + h * .58, w * .44, h * .36, '#3a3040'); px.rect(g, x + w * .46, y + h * .58, w * .08, h * .2, '#e8e0d0');
  }, { flat: '#c8a040' });
  for (const [id, x, y, f] of FURN) r.shape(id, x, y, 0, { facing: f, light: true });
  r.shape('mm_projector', 104, 86, 14, { facing: N2 });
  // small things on desks: the phone, the paper, the sample
  r.queue(438, 58, 14, g => { const [sx, sy] = r.w(438, 58, 14); const ring = S && S.phone && S.phone.state === 'ringing' && Math.floor(game.time * 8) % 2; px.rect(g, sx - 3 + (ring ? 1 : 0), sy - 3, 7, 3, '#1a1a1a'); px.rect(g, sx - 4, sy - 5, 9, 2, '#2a2a2a'); if (ring) { T(g, '!', sx + 5, sy - 13, '#ffffff'); } });
  r.queue(184, 204, 12, g => { const [sx, sy] = r.w(184, 204, 12); px.rect(g, sx - 4, sy - 3, 8, 5, '#e8e4d8'); px.rect(g, sx - 3, sy - 2, 6, 1, '#5a5a5a'); px.rect(g, sx - 3, sy, 4, 1, '#8a8a8a'); });
  if (!pitchMode && S && !has(day().sample)) r.queue(104, 96, 14, g => { const [sx, sy] = r.w(104, 96, 14); px.rect(g, sx - 3, sy - 4, 6, 5, '#e0505e'); px.rect(g, sx - 3, sy - 4, 6, 1, '#ffd36a'); });
  // light: the windows, the lamps
  for (const [x0, x1] of WINDOWS) if (!night) game.lights.add((x0 + x1) / 2, 34, 30, 80, .35, { color: '#d8ecff' });
  game.lights.add(560, 320, 36, 60, .5, { color: '#ffd890' });
  if (!pitchMode) {
    // people
    const fx = talk.open || busy ? null : focus;
    if (fx) { r.decal(() => r.groundRing(fx.x, fx.y, 10 + Math.sin(game.time * 6), '#ffd36a', .9)); }
    for (const n of NPCS) { r.shadow(n.x, n.y, 7, .4); r.actor(n.x, n.y, 0, (g, ox, oy) => RIGS[n.id].draw(g, ox, oy, r.view), { pick: n, xray: true }); }
    for (const o of OBJ) { const w = r.w(o.x, o.y, o.z); o.sp = w ? screenOf(r, w) : null; }
    for (const gh of hub.ghosts.values()) if (gh.area === 'office') {
      r.shadow(gh.x, gh.y, 7, .3);
      r.actor(gh.x, gh.y, 0, (g, ox, oy) => gh.rig.draw(g, ox, oy, r.view), { alpha: .6 });
      r.textAt(gh.x, gh.y, 52, gh.name.slice(0, 12), gh.color, { align: 'center' });
    }
    r.shadow(hero.x, hero.y, 7, .45);
    r.actor(hero.x, hero.y, hero.z, (g, ox, oy) => heroRig.draw(g, ox, oy, r.view), { xray: true });
    if (fx) r.textAt(fx.x, fx.y, (fx.kind === 'npc' ? 50 : fx.z + 14), fx.name, '#ffe08a', { align: 'center' });
  }
}

// a buffer pixel of the world layer -> the HUD's screen pixels (the overlay's space): the renderer knows the camera
function screenOf(r, w) { return r.toScreen ? r.toScreen(w[0], w[1]) : [w[0], w[1]]; }
// ---------------------------------------------------------------- the office HUD
function meter(g, x, y, w, label, v, color) {
  T(g, label, x, y, '#d8ccb0', { font: 'tiny' });
  px.rect(g, x, y + 7, w, 5, '#14100c'); px.rect(g, x + 1, y + 8, Math.round((w - 2) * clamp(v, 0, 1)), 3, color);
}
function drawOfficeHud(r) {
  r.overlay(g => {
    const W = r.W, H = r.H, I = game.input;
    // the clock
    E.ui.box(g, 6, 6, 104, 34, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
    T(g, day().day + '  ' + (S.mode === 'hub' ? 'PITCH SPRINT' : ''), 12, 10, '#f0c860');
    E.font.title(g, clockText(), 12, 21, { scale: 1, colors: ['#fff6d8', '#f0c860'] });
    const left = PITCH_AT - S.clock;
    if (left < 60 && Math.floor(game.real * 2) % 2) T(g, 'PITCH AT 2:00', 60, 23, '#e0505e', { font: 'tiny' });
    // the meters, clear of the corner menu button
    const ca = game.cornerArea && game.cornerArea(), rx = (ca ? Math.min(W, ca.x0 !== undefined ? ca.x0 : W) : W) - 92;
    E.ui.box(g, rx, 6, 86, 46, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
    meter(g, rx + 6, 10, 74, 'NERVE', S.nerve / 100, '#f0c860');
    meter(g, rx + 6, 24, 74, 'HOME', S.home / 100, '#6cbf72');
    T(g, 'RYE', rx + 6, 39, '#d8ccb0', { font: 'tiny' });
    for (let i = 0; i < 4; i++) { const f = i < S.bourbon; px.rect(g, rx + 22 + i * 9, 38, 6, 8, f ? '#c87a28' : '#3a3028'); px.rect(g, rx + 22 + i * 9, 38, 6, 1, '#e8e0d0'); }
    // ideas
    E.ui.box(g, 6, H - 26, 86, 20, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
    T(g, 'IDEAS: ' + S.cards.length, 12, H - 20, '#f4ecd8');
    for (let i = 0; i < Math.min(5, S.cards.length); i++) px.rect(g, 60 + i * 6, H - 21, 4, 9, MM.TAGS[S.cards[S.cards.length - 1 - i].tag].color);
    // context prompt
    if (focus && !talk.open && !busy && !folio) {
      const words = focus.verb + ' ' + (focus.kind === 'npc' ? focus.name.split(' ').map(s => s[0] + s.slice(1).toLowerCase()).join(' ') : focus.name.toLowerCase());
      const w = 20 + E.font.width(words);
      E.ui.box(g, W / 2 - w / 2 - 4, H - 28, w + 8, 20, { bg: ['#2e2418', '#17110c'], border: '#f0c860' });
      prompt(g, 'interact', words, W / 2 - w / 2, H - 23);
    }
    if (!talk.open && !folio && S.mode !== 'demo') {
      let x = W - 8;
      for (const [a, wd] of [['view', 'View'], ['folio', 'Folio']]) { x -= promptW(a, wd) + 8; prompt(g, a, wd, x, H - 20); }
    }
    // toasts
    S.toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 4, (4.5 - t.t) * 2), y = 48 + i * 26 - (1 - Math.min(1, t.t * 4)) * 10, w = Math.max(E.font.width(t.title), E.font.width(t.text)) + 16;
      px.blend(g, .85 * a, 'normal', () => { E.ui.box(g, W / 2 - w / 2, y, w, 23, { bg: ['#2e2418', '#17110c'], border: t.color, gradient: false }); });
      if (a > .3) { T(g, t.title, W / 2, y + 3, t.color, { align: 'center' }); T(g, t.text, W / 2, y + 12, '#f4ecd8', { align: 'center' }); }
    });
    if (firstHint > 0 && !talk.open) {
      const pad = I.lastDevice === 'gamepad', y = H - (pad ? 74 : 86), bh = pad ? 40 : 52;
      E.ui.box(g, W / 2 - 120, y, 240, bh, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
      let x = W / 2 - 112;
      if (pad) { T(g, 'Left stick: walk', x, y + 8, '#f4ecd8'); x += E.font.width('Left stick: walk') + 10; }
      else x += prompt(g, 'up', 'W A S D: walk', x, y + 6) + 8;
      x += prompt(g, 'interact', 'Talk / use', x, y + 6) + 8;
      x = W / 2 - 112; x += prompt(g, 'hurry', 'Hurry', x, y + 22) + 8; x += prompt(g, 'folio', 'Your ideas', x, y + 22) + 8; prompt(g, 'view', 'View', x, y + 22);
      if (!pad) T(g, 'Mouse: point at someone, click to go', W / 2 - 112, y + 39, '#c8bca0');
    }
    if (S.mode === 'demo') drawDemoBanner(g, W, H);
    if (folio) drawFolio(g, W, H);
  });
  talk.draw(r);
}
function drawDemoBanner(g, W, H) {
  if (Math.floor(game.real * 1.5) % 2) { E.ui.box(g, W / 2 - 80, 8, 160, 18, { bg: ['#5a1a1a', '#2a0a0a'], border: '#f0c860' }); T(g, 'DEMO  -  PRESS ANY BUTTON', W / 2, 13, '#ffe8c0', { align: 'center' }); }
}

// ---------------------------------------------------------------- the folio (your ideas, the brief, the intel)
function updateFolio() {
  const I = game.input, [dx] = navDir();
  if (dx && S.cards.length) { folio.i = (folio.i + dx + S.cards.length) % S.cards.length; game.audio.sfx('card'); }
  const c = I.clicked();
  if (c && folio.arrows) { if (inRect(c, ...folio.arrows[0])) folio.i = (folio.i + S.cards.length - 1) % S.cards.length; else if (inRect(c, ...folio.arrows[1])) folio.i = (folio.i + 1) % S.cards.length; }
  if (I.pressed('folio') || I.pressed('cancel')) { folio = null; game.audio.sfx('cancel'); }
}
function drawFolio(g, W, H) {
  px.blend(g, .75, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0806'));
  const D = day();
  E.font.title(g, 'THE FOLIO', W / 2, 10, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
  // the brief
  const bw = Math.min(170, W * .4), bx = 12;
  E.ui.box(g, bx, 36, bw, H - 70, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
  T(g, D.account.toUpperCase(), bx + 6, 42, '#f0c860');
  T(g, '$' + D.billings.toFixed(1) + ' million in billings', bx + 6, 52, '#d8ccb0');
  E.font.wrap(D.brief, bw - 12).slice(0, 6).forEach((l, i) => T(g, l, bx + 6, 64 + i * 9, '#f4ecd8'));
  let y = 122;
  T(g, 'INTEL', bx + 6, y, '#8ad0c8'); y += 10;
  D.objections.forEach((o, i) => { T(g, 'Objection ' + (i + 1) + ': ' + (S.intel.obj[i] ? MM.TAGS[o.tag].label : '?'), bx + 6, y, S.intel.obj[i] ? MM.TAGS[o.tag].color : '#8a7a68'); y += 9; });
  T(g, 'Secret want: ' + (S.intel.want ? MM.TAGS[D.want].label : '?'), bx + 6, y, S.intel.want ? MM.TAGS[D.want].color : '#8a7a68');
  // the card
  const cx = bx + bw + 20, cw = Math.min(180, W - cx - 40), ch = 128;
  if (!S.cards.length) T(g, 'No ideas yet. Talk to people. Look at things.', cx, 80, '#f4ecd8');
  else {
    const c = S.cards[folio.i % S.cards.length];
    MM.drawCard(g, c, cx + 10, 44, cw, ch, { big: true });
    T(g, (folio.i % S.cards.length + 1) + ' / ' + S.cards.length, cx + 10 + cw / 2, 44 + ch + 6, '#d8ccb0', { align: 'center' });
    folio.arrows = [[cx - 8, 90, 14, 30], [cx + cw + 14, 90, 14, 30]];
    T(g, '<', cx - 4, 100, '#f0c860', { scale: 2 }); T(g, '>', cx + cw + 16, 100, '#f0c860', { scale: 2 });
  }
  let x = W / 2 - 80;
  x += prompt(g, 'left', 'Previous', x, H - 22) + 8; x += prompt(g, 'right', 'Next', x, H - 22) + 8; prompt(g, 'folio', 'Close', x, H - 22);
}

// ------------------------------------------------------------------------------------------------ brainstorm: the deck and the tagline
let BS = null;
function goPitch() {
  S.inPitch = false; walkTo = null; folio = null;
  if (S.mode === 'demo') { game.go('brainstorm'); return; }
  busy = game.script(function* () {
    yield* say('lorraine', [S.early ? "I'll bring them up, Mr. Whitmore." : "Mr. Whitmore. They're here. Conference room, five minutes."]);
    busy = null; game.go('brainstorm');
  });
}
function tagScore(lead, tail) {
  const D = day(), objs = D.objections.map(o => o.tag);
  const a = lead.tag === D.want ? 10 : objs.includes(lead.tag) ? 5 : 2, b = tail.tag === D.want ? 12 : objs.includes(tail.tag) ? 5 : 2;
  return a + b + (lead.power >= 3 ? 3 : 0);
}
const taglineOf = (lead, tail) => lead.lead + ' ' + day().tails[tail.tag];
const brainstorm = {
  view: 'threequarter',
  enter() {
    const pi = S.bsPlayer || 0, P = S.players[pi];
    const pool = S.mode === 'versus' ? P.cards : S.cards;
    BS = { pi, step: 'deck', pool: pool.slice(), picked: [], i: 0, lead: null, tail: null, t: 0, botT: 0, rects: [] };
    if (S.mode === 'versus') { BS.picked = pool.map((_, k) => k); BS.step = 'lead'; }
    while (BS.pool.length < 3) { const tg = MM.TAG_KEYS[Math.floor(Math.random() * 6)]; BS.pool.push(Object.assign(card('cuff'), { id: 'cuff' + BS.pool.length, tag: tg })); }
    if (BS.pool.length <= 4 && S.mode !== 'versus') { BS.picked = BS.pool.map((_, k) => k); BS.step = 'lead'; }
    game.audio.music(MM.SONGS.closer);
    game.audio.sfx('carriage');
  },
  update(dt) {
    if (S.mode === 'demo' && anyInput()) { exitDemo(); return; }
    if (hub.ended) return;
    BS.t += dt;
    const I = game.input, n = BS.step === 'deck' ? BS.pool.length + 1 : BS.picked.length;
    if (S.mode === 'demo') { botBrainstorm(dt); return; }
    const [dx, dy] = navDir(), cols = BS.cols || 4;
    if (dx || dy) { BS.i = clamp(BS.i + dx + dy * cols, 0, n - 1); game.audio.sfx('needle'); }
    const p = I.pointer();
    if (p && I.lastDevice === 'mouse' && pointerMoved()) BS.rects.forEach((rc, k) => { if (inRect(p, ...rc)) BS.i = k; });
    const c = I.clicked();
    let act = I.pressed('confirm');
    if (c) { const k = BS.rects.findIndex(rc => inRect(c, ...rc)); if (k >= 0) { BS.i = k; act = true; } }
    if (I.pressed('cancel')) { if (BS.step === 'lead' && S.mode !== 'versus' && BS.pool.length > 4) { BS.step = 'deck'; BS.i = 0; } else if (BS.step === 'tail') { BS.step = 'lead'; BS.i = 0; } game.audio.sfx('cancel'); }
    if ((I.pressed('folio') || (I.pressed('start') && !I.pressed('confirm'))) && BS.step === 'deck' && BS.picked.length) { act = true; BS.i = BS.pool.length; }
    if (act) bsPick();
  },
  draw(r) { drawBrainstorm(r); drawHubOverlay(r); }
};
function bsPick() {
  if (BS.step === 'deck') {
    if (BS.i === BS.pool.length) { if (BS.picked.length) { BS.step = 'lead'; BS.i = 0; game.audio.sfx('carriage'); } else game.audio.sfx('bump'); return; }
    const k = BS.picked.indexOf(BS.i);
    if (k >= 0) { BS.picked.splice(k, 1); game.audio.sfx('cancel'); }
    else if (BS.picked.length < 4) { BS.picked.push(BS.i); game.audio.sfx('typekey'); }
    else game.audio.sfx('bump');
  } else if (BS.step === 'lead') { BS.lead = BS.pool[BS.picked[BS.i]]; BS.step = 'tail'; BS.i = 0; game.audio.sfx('typekey'); }
  else if (BS.step === 'tail') { BS.tail = BS.pool[BS.picked[BS.i]]; game.audio.sfx('carriage'); bsDone(); }
}
function bsDone() {
  const P = S.players[BS.pi];
  P.deck = BS.picked.map(k => BS.pool[k]); P.hand = P.deck.slice(); P.lead = BS.lead; P.tail = BS.tail; P.tagline = taglineOf(BS.lead, BS.tail); P.tagScore = tagScore(BS.lead, BS.tail);
  if (S.mode === 'versus' && BS.pi < S.players.length - 1) { S.bsPlayer = BS.pi + 1; game.go('brainstorm', { fade: 'wipe' }); return; }
  S.bsPlayer = 0; game.go('pitch', { fade: 'iris' });
}
function botBrainstorm(dt) {
  BS.botT += dt; if (BS.botT < .45) return; BS.botT = 0;
  const D = day(), val = c => (D.objections.some(o => o.tag === c.tag) ? c.power * 7 : c.power * 2) + (c.tag === D.want ? 5 : 0);
  if (BS.step === 'deck') {
    if (BS.picked.length < Math.min(4, BS.pool.length)) { const order = BS.pool.map((c, k) => [val(c), k]).sort((a, b) => b[0] - a[0]).map(a => a[1]); const k = order.find(k => !BS.picked.includes(k)); BS.i = k; bsPick(); }
    else { BS.i = BS.pool.length; bsPick(); }
  } else {
    const deck = BS.picked.map(k => BS.pool[k]);
    let best = 0, bl = 0, bt = 0;
    deck.forEach((a, i) => deck.forEach((b, j) => { const s = tagScore(a, b); if (s > best) { best = s; bl = i; bt = j; } }));
    BS.i = BS.step === 'lead' ? bl : bt; bsPick();
  }
}
function drawBrainstorm(r) {
  r.sky(['#2a2018', '#3a2c1e', '#1a140e']);
  r.overlay(g => {
    const W = r.W, H = r.H, D = day(), P = S.players[BS.pi];
    for (let y = 0; y < H; y += 4) px.rect(g, 0, y, W, 1, '#33281c');
    const title = BS.step === 'deck' ? 'THE CREATIVE MEETING' : 'WRITE THE TAGLINE';
    E.font.title(g, title, W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
    const sub = S.mode === 'versus' ? P.name + ', ' : '';
    const help = BS.step === 'deck' ? sub + 'Choose up to 4 ideas to bring into the room (' + BS.picked.length + '/4).' : BS.step === 'lead' ? sub + 'First line: pick the idea that opens the tagline.' : sub + 'Last line: pick the appeal that closes it.';
    T(g, help, W / 2, 30, '#f4ecd8', { align: 'center' });
    T(g, D.account + '  -  ' + (S.intel.want ? 'they secretly want ' + MM.TAGS[D.want].label : 'what they want is a guess'), W / 2, 40, S.intel.want ? MM.TAGS[D.want].color : '#a89878', { align: 'center' });
    BS.rects = [];
    const list = BS.step === 'deck' ? BS.pool : BS.picked.map(k => BS.pool[k]);
    const cw = 76, ch = 50, gap = 6, cols = Math.max(1, Math.min(list.length, Math.floor((W - 20) / (cw + gap)))), rows = Math.ceil(list.length / cols);
    BS.cols = cols;
    const visRows = Math.max(1, Math.floor((H - 130) / (ch + gap)));
    const fr = Math.floor(Math.min(BS.i, list.length - 1) / cols), r0 = clamp(fr - visRows + 1, 0, Math.max(0, rows - visRows));
    const x0 = Math.round(W / 2 - (cols * (cw + gap) - gap) / 2), y0 = 54;
    list.forEach((c, k) => {
      const row = Math.floor(k / cols), col = k % cols;
      if (row < r0 || row >= r0 + visRows) { BS.rects.push([-99, -99, 0, 0]); return; }
      const x = x0 + col * (cw + gap), y = y0 + (row - r0) * (ch + gap);
      BS.rects.push([x, y, cw, ch]);
      MM.drawCard(g, c, x, y, cw, ch, { sel: BS.i === k, picked: BS.step === 'deck' && BS.picked.includes(k), dim: BS.step === 'deck' && BS.picked.length >= 4 && !BS.picked.includes(k) });
    });
    if (rows > visRows) T(g, (r0 > 0 ? '^ ' : '') + 'more' + (r0 + visRows < rows ? ' v' : ''), W / 2, y0 + visRows * (ch + gap) - 2, '#a89878', { align: 'center', font: 'tiny' });
    const by = H - 64;
    if (BS.step === 'deck') {
      const bx = W / 2 - 50, sel = BS.i === BS.pool.length;
      BS.rects.push([bx, by, 100, 18]);
      E.ui.box(g, bx, by, 100, 18, { bg: sel ? ['#6a4a1a', '#3a2a10'] : ['#2e2418', '#17110c'], border: sel ? '#ffd36a' : '#8a7458' });
      T(g, 'TAKE THESE IN', W / 2, by + 5, sel ? '#ffe8a0' : '#d8ccb0', { align: 'center' });
    }
    // the tagline as it is typed
    const lead = BS.step === 'lead' ? list[BS.i] : BS.lead, tail = BS.step === 'tail' ? list[BS.i] : BS.tail;
    if (lead && BS.step !== 'deck') {
      const s = tail ? taglineOf(lead, tail) : lead.lead + ' ...';
      E.ui.box(g, 16, H - 46, W - 32, 26, { bg: ['#f2ead2', '#e0d6b8'], border: '#5a4a32' });
      E.font.wrap('"' + s + '"', W - 48).slice(0, 2).forEach((l, i) => T(g, l, W / 2, H - 42 + i * 10, '#1a1410', { align: 'center', shadow: false }));
    }
    let x = 14;
    x += prompt(g, 'confirm', BS.step === 'deck' ? 'Choose' : 'Use this', x, H - 15) + 10;
    if (BS.step === 'deck') x += prompt(g, 'folio', 'Take them in', x, H - 15) + 10;
    if (BS.step !== 'deck') prompt(g, 'cancel', 'Back', x, H - 15);
    if (S.mode === 'demo') drawDemoBanner(g, W, H);
  });
}

// ------------------------------------------------------------------------------------------------ the pitch
let PS = null;
const REACT = { good: ['Go on.', 'Hm. Now that is interesting.', 'Keep talking.', 'Yes. Yes, I can see that.'], ok: ['Mm-hm.', 'I suppose.', 'Go on.'], bad: ["That isn't what I asked.", 'I don\'t follow.', 'Hm. No.'] };
const pitch = {
  view: 'threequarter', views: ['threequarter'], pausable: !HUB, camera: false,
  enter() {
    const D = day();
    S.inPitch = true;
    PS = { phase: 'intro', pi: 0, ob: -1, sel: 0, pick: -1, card: null, needle: 0, nd: 1, zone: .5, result: null, hold: 0, holding: false, slide: -1, lightsDown: false, shown: [0], gain: null, gainT: 0, verdict: null, rects: [], cTimer: 0, botT: 0, done: false };
    S.players.forEach(p => { p.interest = 20 + (S.mode === 'versus' ? 0 : (S.intel.obj.filter(Boolean).length + (S.intel.want ? 1 : 0)) * 3); p.shown = p.interest; });
    game.focus(104, 62, 26); game.cam.bounds = null; game.setZoom(1.1);
    game.lights.enabled = true; game.lights.ambient = .62;
    game.audio.music(MM.SONGS.pitch);
    PS.cast = [
      { id: S.players[0].spk, x: 40, y: 50, f: .5 },
      { id: D.client, x: 92, y: 116, f: N2 }, { id: D.second, x: 124, y: 118, f: N2 },
      { id: 'hollis', x: 164, y: 74, f: Math.PI, pose: 'hips' }
    ];
    const SEATS = [null, [40, 104, -.4], [150, 128, -2.2], [64, 132, -1]];
    S.players.forEach((p, i) => { if (i) PS.cast.push({ id: p.spk, x: SEATS[i][0], y: SEATS[i][1], f: SEATS[i][2] }); });
    if (S.teddyIn && S.mode !== 'versus') PS.cast.push({ id: 'teddy', x: 162, y: 112, f: -2.4 });
    game.script(pitchScript);
  },
  exit() { game.lights.enabled = false; game.resetCamera(); S.inPitch = false; },
  update(dt) {
    if (S.mode === 'demo' && anyInput()) { exitDemo(); return; }
    if (hub.ended) return;
    game.focus(104, 62, 26);
    const modal = talk.update(dt); runVoice();
    for (const p of S.players) p.shown = lerp(p.shown, p.interest, Math.min(1, dt * 3));
    if (PS.gainT > 0) PS.gainT -= dt;
    for (const c of PS.cast) RIGS[c.id].update(dt, { x: c.x, y: c.y, z: 0, vx: 0, vy: 0, facing: c.f, expr: c.expr || null, pose: c.pose || null });
    hubSend('pitch', 0, 0, 0);
    if (modal) return;
    const I = game.input, P = S.players[PS.pi];
    if (PS.phase === 'choose') {
      if (S.mode === 'demo') { PS.botT += dt; if (PS.botT > 1) { PS.pick = bestCard(P); } return; }
      const [dx] = navDir();
      if (dx) { PS.sel = (PS.sel + dx + P.hand.length) % P.hand.length; game.audio.sfx('needle'); }
      const p = I.pointer(); if (p && I.lastDevice === 'mouse' && pointerMoved()) PS.rects.forEach((rc, k) => { if (inRect(p, ...rc)) PS.sel = k; });
      const c = I.clicked(); let act = I.pressed('confirm');
      if (c) { const k = PS.rects.findIndex(rc => inRect(c, ...rc)); if (k >= 0) { PS.sel = k; act = true; } else act = false; }
      if (act) { PS.pick = PS.sel; game.audio.sfx('card'); }
    } else if (PS.phase === 'deliver') {
      const sp = .95 * (S.bourbon >= 2 && S.mode !== 'versus' ? 1 + Math.sin(game.time * 3) * .35 : 1);
      PS.needle += PS.nd * sp * dt; if (PS.needle > 1) { PS.needle = 2 - PS.needle; PS.nd = -1; } if (PS.needle < 0) { PS.needle = -PS.needle; PS.nd = 1; }
      PS.cTimer += dt;
      const jit = S.bourbon >= 3 && S.mode !== 'versus' ? (Math.sin(game.time * 23) * .035) : 0;
      if (S.mode === 'demo') { if (PS.cTimer > .7 && Math.abs(PS.needle - PS.zone) < PS.pw * .7) grade(PS.needle); return; }
      if (I.pressed('confirm') || I.clicked() || PS.cTimer > 7) grade(PS.cTimer > 7 ? -9 : PS.needle + jit);
    } else if (PS.phase === 'closer') {
      PS.cTimer += dt;
      const held = S.mode === 'demo' ? PS.cTimer > .6 && PS.hold < PS.band[0] + (PS.band[1] - PS.band[0]) * .5 : (I.down('confirm') || I.down('interact') || mouseHeld());
      if (held) { if (!PS.holding) { PS.holding = true; game.audio.sfx('click'); PS.slide = 0; PS.slideT = 0; } PS.hold += dt * .38; PS.slideT += dt; if (PS.slideT > .75) { PS.slideT = 0; PS.slide++; game.audio.sfx('click'); } if (PS.hold >= 1) closeGrade(); }
      else if (PS.holding) closeGrade();
      else if (PS.cTimer > 12) { PS.hold = 0; closeGrade(); }
    } else if (PS.phase === 'verdict') {
      if (S.mode === 'demo') { PS.botT += dt; if (PS.botT > 3) endDemoLoop(); return; }
      if (S.mode === 'hub') return;
      const c = I.clicked();
      if ((I.pressed('confirm') || c) && PS.t2 > .8) afterPitch();
      PS.t2 = (PS.t2 || 0) + dt;
    }
  },
  draw(r) { drawPitch(r); drawHubOverlay(r); }
};
// the mouse's left button held (for the closer): the engine's input reports Mouse0 through the bindings of confirm
let mouseDownNow = false;
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' && e.button === 0) mouseDownNow = true; });
  window.addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouseDownNow = false; });
  window.addEventListener('blur', () => { mouseDownNow = false; });
}
const mouseHeld = () => mouseDownNow;
function bestCard(P) {
  const ob = day().objections[PS.ob]; let best = 0, bv = -1;
  P.hand.forEach((c, k) => { const v = (c.tag === ob.tag ? c.power * 5 : c.power) + (c.tag === day().want ? 2 : 0); if (v > bv) { bv = v; best = k; } });
  return best;
}
function grade(v) {
  const d = Math.abs(v - PS.zone);
  PS.result = d <= PS.pw ? 'perfect' : d <= PS.pw * 2.4 ? 'good' : 'poor';
  game.audio.sfx(PS.result === 'perfect' ? 'coin' : PS.result === 'good' ? 'select' : 'bump');
  if (PS.result === 'perfect') game.flash('#fff0c0', .08, .4);
}
function closeGrade() {
  const h = PS.hold, [a, b] = PS.band;
  PS.result = h < a ? 'early' : h <= b ? 'perfect' : 'late';
  PS.holding = false;
  game.audio.sfx(PS.result === 'perfect' ? 'powerup' : 'bump');
}
function* pitchScript() {
  const D = day(), P = S.players, client = PS.cast[1];
  yield 1;
  yield* say(D.client, D.greet);
  yield* say(P[0].spk, [S.mode === 'versus' ? P.length + ' of us will be presenting today. Think of it as a race.' : 'Thank you for coming up. Let me tell you what I see.']);
  for (let b = 0; b < 3; b++) {
    PS.ob = b; const ob = D.objections[b];
    PS.phase = 'objection'; client.expr = 'angry';
    yield* say(D.client, [ob.line]); client.expr = null;
    for (let pi = 0; pi < P.length; pi++) {
      PS.pi = pi; const pl = P[pi];
      if (!pl.hand.length) pl.hand.push(Object.assign(card('cuff'), { tag: MM.TAG_KEYS[b % 6] }));
      PS.phase = 'choose'; PS.sel = 0; PS.pick = -1; PS.botT = 0;
      yield E.until(() => PS.pick >= 0);
      const c = pl.hand.splice(PS.pick, 1)[0]; PS.card = c;
      // the delivery: the room's rhythm
      const nerve = S.mode === 'versus' ? 50 : S.nerve;
      PS.zone = .25 + Math.random() * .5; PS.pw = .045 + nerve * .0006; PS.needle = 0; PS.nd = 1; PS.result = null; PS.cTimer = 0;
      PS.phase = 'deliver';
      yield E.until(() => PS.result);
      yield .35;
      PS.phase = 'speak';
      PS.cast[castOf(pi)].expr = 'smile';
      yield* say(pl.spk, [c.line]);
      PS.cast[castOf(pi)].expr = null;
      const match = c.tag === ob.tag, mult = { perfect: 1.3, good: 1, poor: .4 }[PS.result];
      const gain = Math.round(((match ? c.power * 5 : c.power) + (c.tag === D.want ? 2 : 0)) * mult);
      pl.interest = clamp(pl.interest + gain, 0, 100); PS.gain = { v: gain, pi, match, res: PS.result }; PS.gainT = 2.2;
      hubProgress();
      client.expr = match ? 'smile' : 'wince'; game.audio.sfx(match ? 'murmur' : 'gasp');
      const pool = match && PS.result !== 'poor' ? REACT.good : match ? REACT.ok : REACT.bad;
      yield* say(D.client, [pool[Math.floor(Math.random() * pool.length)]]);
      client.expr = null;
    }
    if (b === 1 && S.teddyIn && S.mode === 'story') {
      const helps = S.day === 0 || (S.day === 2 && Math.random() < .5);
      const teddy = PS.cast.find(c => c.id === 'teddy'); if (teddy) teddy.expr = 'smile';
      yield* say('teddy', [helps ? (S.day === 0 ? 'If I may. Mrs. Voss, my own mother wears Belle Rouge. Well. She will now.' : 'Picture the rocket, gentlemen. Now picture the rocket at home, with the family. You see?')
        : 'And the wives! We could offer the wives a, uh, discount. On a, a sort of widowhood policy. For peace of mind.']);
      P[0].interest = clamp(P[0].interest + (helps ? 6 : -8), 0, 100); PS.gain = { v: helps ? 6 : -8, pi: 0, match: helps, res: 'teddy' }; PS.gainT = 2.2;
      client.expr = helps ? 'smile' : 'angry'; game.audio.sfx(helps ? 'murmur' : 'gasp');
      yield* say(D.client, [helps ? 'Ha! All right. All right.' : '...']);
      client.expr = null; if (teddy) teddy.expr = null;
    }
  }
  // the closer: the lights go down, the tray turns, and you hold the pause
  game.audio.music(MM.SONGS.closer);
  PS.lightsDown = true; game.lights.ambient = .3; game.audio.sfx('click');
  for (let pi = 0; pi < P.length; pi++) {
    PS.pi = pi; const pl = P[pi];
    yield* say(pl.spk, [pi === 0 && S.mode !== 'versus' ? 'Lorraine, the lights.' : 'If I may. The lights, please.']);
    const nerve = S.mode === 'versus' ? 50 : S.nerve - (S.bourbon >= 3 ? 25 : 0);
    const hw = .05 + clamp(nerve, 0, 100) * .0005;
    PS.band = [.7 - hw, .7 + hw]; PS.hold = 0; PS.holding = false; PS.result = null; PS.cTimer = 0; PS.slide = -1;
    PS.phase = 'closer';
    yield E.until(() => PS.result);
    PS.phase = 'speak';
    const mult = { perfect: 1.3, early: .6, late: .75 }[PS.result];
    yield* say(pl.spk, [PS.result === 'early' ? 'So. Uh. Here it is.' : PS.result === 'late' ? '...' : '(You let the silence sit. Somebody puts down a coffee cup.)', '"' + pl.tagline + '"']);
    const gain = Math.round(pl.tagScore * mult);
    pl.interest = clamp(pl.interest + gain, 0, 100); PS.gain = { v: gain, pi, match: gain > 12, res: PS.result }; PS.gainT = 2.4;
    client.expr = gain > 12 ? 'smile' : null; game.audio.sfx(gain > 18 ? 'applause' : 'murmur');
    hubProgress();
    yield 1;
  }
  PS.lightsDown = false; game.lights.ambient = .62; PS.slide = -1;
  // the verdict
  if (S.mode === 'versus') {
    const best = Math.max(...P.map(p => p.interest)), top = P.map((p, i) => p.interest === best ? i : -1).filter(i => i >= 0), w = top.length > 1 ? -1 : top[0];
    PS.verdict = { won: w >= 0, winner: w };
    const ORD = ['the first one', 'the second one', 'the third one', 'the fourth one'];
    yield* say(D.client, [w < 0 ? 'I honestly cannot choose. We will flip a coin in the elevator.' : 'I want ' + ORD[w] + '. Whoever that was.']);
  } else {
    const won = P[0].interest >= 80;
    PS.verdict = { won, amount: won ? D.billings : 0 };
    client.expr = won ? 'smile' : 'angry';
    yield* say(D.client, won ? D.win : D.lose);
    S.results[S.day] = { won, interest: Math.round(P[0].interest) };
    if (won) S.billings += D.billings;
    S.hollis += won ? 1 : 0;
    if (S.mode === 'hub') { S.hubWon = won; S.hubResultScore = (won ? 2000 : 0) + Math.round(P[0].interest * 10); hubResult(); }
  }
  game.audio.music(PS.verdict.won ? MM.SONGS.win : MM.SONGS.lose);
  PS.phase = 'verdict'; PS.t2 = 0; PS.botT = 0;
}
function afterPitch() {
  if (S.mode === 'versus') { game.go('title', { fade: 'iris' }); return; }
  game.go('evening', { fade: 'dissolve' });
}
function drawPitch(r) {
  drawOffice(r, true);
  for (const c of PS.cast) { r.shadow(c.x, c.y, 7, .4); r.actor(c.x, c.y, 0, (g, ox, oy) => RIGS[c.id].draw(g, ox, oy, r.view)); }
  // the projector's beam
  if (PS.lightsDown) {
    game.lights.add(104, 40, 26, 70, 1, { color: '#fff4d8' });
    r.queue(104, 70, 20, g => {
      const a = r.w(104, 86, 18), b = r.w(SCREEN[0] + 4, 17, SCREEN[3] - 2), c = r.w(SCREEN[1] - 4, 17, SCREEN[3] - 2), d = r.w(SCREEN[1] - 4, 17, SCREEN[2] + 2), e = r.w(SCREEN[0] + 4, 17, SCREEN[2] + 2);
      px.blend(g, .18, 'add', () => { px.poly(g, [a, b, c], '#fff0c8'); px.poly(g, [a, d, e], '#fff0c8'); px.poly(g, [a, b, e], '#fff0c8'); px.poly(g, [a, c, d], '#fff0c8'); });
    }, { emissive: true, bias: 2 });
  }
  r.overlay(g => {
    const W = r.W, H = r.H, D = day(), P = S.players;
    // the room's temperature, one per player
    P.forEach((p, i) => {
      const x = [8, W - 30, 34, W - 56][i], y = 40, h = P.length > 2 ? 96 : 110;
      E.ui.box(g, x, y - 14, 22, h + 30, { bg: ['#2e2418', '#17110c'], border: i === PS.pi && PS.phase !== 'verdict' ? '#ffd36a' : '#8a7458' });
      T(g, P.length > 1 ? 'P' + (i + 1) : 'ROOM', x + 11, y - 10, '#f0c860', { align: 'center', font: 'tiny' });
      px.rect(g, x + 7, y, 8, h, '#14100c');
      const f = clamp(p.shown / 100, 0, 1), col = f >= .8 ? '#e0505e' : f >= .5 ? '#e8a040' : '#5aa8ea';
      px.rect(g, x + 8, y + h - Math.round(h * f), 6, Math.round(h * f), col);
      px.rect(g, x + 4, y + Math.round(h * .2), 14, 1, '#ffd36a');
      px.disc(g, x + 11, y + h + 6, 6, col);
      T(g, String(Math.round(p.shown)), x + 11, y + h + 3, '#ffffff', { align: 'center', font: 'tiny' });
    });
    // what the room wants (intel)
    if (PS.ob >= 0 && (PS.phase === 'choose' || PS.phase === 'deliver')) {
      const ob = D.objections[PS.ob], known = S.mode === 'versus' || S.intel.obj[PS.ob];
      const s = 'OBJECTION ' + (PS.ob + 1) + ' OF 3  -  ' + (known ? 'THE ROOM WANTS ' + MM.TAGS[ob.tag].label.toUpperCase() : 'READ THE ROOM');
      const bw = Math.min(W - 84, 340), lines = E.font.wrap('"' + ob.line + '"', bw - 12).slice(0, 3);
      E.ui.box(g, W / 2 - bw / 2, 4, bw, 16 + lines.length * 9, { bg: ['#2e2418', '#17110c'], border: known ? MM.TAGS[ob.tag].color : '#8a7458' });
      T(g, s, W / 2, 8, known ? MM.TAGS[ob.tag].color : '#d8ccb0', { align: 'center' });
      lines.forEach((l, i) => T(g, l, W / 2, 18 + i * 9, '#f4ecd8', { align: 'center' }));
      if (P.length > 1) T(g, P[PS.pi].name + "'S TURN", W / 2, 22 + lines.length * 9, '#ffd36a', { align: 'center' });
    }
    // the hand
    if (PS.phase === 'choose') {
      const pl = P[PS.pi], cw = Math.min(84, Math.floor((W - 80) / 4) - 8), ch = 54, n = pl.hand.length, x0 = Math.round(W / 2 - (n * (cw + 8) - 8) / 2), y = H - ch - 24;
      PS.rects = [];
      pl.hand.forEach((c, k) => { const x = x0 + k * (cw + 8); PS.rects.push([x, y, cw, ch]); MM.drawCard(g, c, x, y, cw, ch, { sel: k === PS.sel }); });
      const c = pl.hand[PS.sel];
      if (c) T(g, c.src, W / 2, y - 12, '#d8ccb0', { align: 'center' });
      let x = W / 2 - 90; x += prompt(g, 'left', '', x, H - 16); x += prompt(g, 'right', 'Choose', x, H - 16) + 10; prompt(g, 'confirm', 'Play this idea', x, H - 16);
    }
    // the delivery meter
    if (PS.phase === 'deliver') {
      const w = Math.min(240, W - 80), x = Math.round(W / 2 - w / 2), y = H - 60;
      E.ui.box(g, x - 8, y - 18, w + 16, 46, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
      T(g, 'DELIVERY: speak on the beat of the room', W / 2, y - 13, '#f0c860', { align: 'center' });
      px.rect(g, x, y, w, 10, '#3a3028');
      const gz = PS.pw * 2.4;
      px.rect(g, x + Math.round((PS.zone - gz) * w), y, Math.round(gz * 2 * w), 10, '#8a6a2a');
      px.rect(g, x + Math.round((PS.zone - PS.pw) * w), y, Math.round(PS.pw * 2 * w), 10, '#ffd36a');
      const nx = x + Math.round(PS.needle * w); px.rect(g, nx - 1, y - 3, 3, 16, '#ffffff'); px.rect(g, nx, y - 3, 1, 16, '#1a1410');
      prompt(g, 'confirm', 'Now', W / 2 - 20, y + 14);
    }
    // the closer: hold the pause
    if (PS.phase === 'closer') {
      const w = Math.min(240, W - 80), x = Math.round(W / 2 - w / 2), y = H - 60;
      E.ui.box(g, x - 8, y - 18, w + 16, 46, { bg: ['#2e2418', '#17110c'], border: '#ffd36a' });
      T(g, 'THE MENTION: hold the silence, let go on the line', W / 2, y - 13, '#ffd36a', { align: 'center' });
      px.rect(g, x, y, w, 10, '#3a3028');
      px.rect(g, x + Math.round(PS.band[0] * w), y, Math.round((PS.band[1] - PS.band[0]) * w), 10, '#ffd36a');
      px.rect(g, x, y + 2, Math.round(PS.hold * w), 6, '#c8c0e8');
      prompt(g, 'confirm', PS.holding ? 'Let go on the gold' : 'Hold to begin', W / 2 - 50, y + 14);
      E.font.wrap('"' + P[PS.pi].tagline + '"', W - 60).slice(0, 2).forEach((l, i) => T(g, l, W / 2, 46 + i * 10, '#fff6d8', { align: 'center' }));
    }
    // gains float up
    if (PS.gain && PS.gainT > 0) {
      const gx = [40, W - 70, 66, W - 96][PS.gain.pi], gy = 70 - (2.2 - PS.gainT) * 12;
      const lbl = (PS.gain.v >= 0 ? '+' : '') + PS.gain.v + (PS.gain.res === 'perfect' ? '  PERFECT' : PS.gain.res === 'poor' || PS.gain.res === 'early' || PS.gain.res === 'late' ? '  ' + PS.gain.res.toUpperCase() : '');
      T(g, lbl, gx, gy, PS.gain.v >= 15 ? '#ffd36a' : PS.gain.v >= 0 ? '#f4ecd8' : '#e0505e');
    }
    if (PS.phase === 'verdict') {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, H / 2 - 44, W, 88, '#0a0806'));
      const V = PS.verdict;
      const t1 = S.mode === 'versus' ? (V.winner < 0 ? 'A DEAD HEAT' : P[V.winner].name + ' WINS THE ACCOUNT') : V.won ? 'ACCOUNT WON' : 'ACCOUNT LOST';
      E.font.title(g, t1, W / 2, H / 2 - 36, { scale: 2, align: 'center', colors: V.won || S.mode === 'versus' ? ['#fff6d8', '#f0c860', '#c87a28'] : ['#ffd0d0', '#e0505e', '#7a1a1a'] });
      const t2 = S.mode === 'versus' ? P.map((p, i) => 'P' + (i + 1) + ' ' + Math.round(p.interest)).join('  -  ') : V.won ? '$' + D.billings.toFixed(1) + ' MILLION IN BILLINGS' : 'The room cooled at ' + Math.round(P[0].interest) + '. You needed 80.';
      T(g, t2, W / 2, H / 2 - 4, '#f4ecd8', { align: 'center' });
      if (S.mode === 'hub') T(g, 'Waiting for the other creatives...', W / 2, H / 2 + 14, '#a89878', { align: 'center' });
      else if (S.mode !== 'demo' && PS.t2 > .8) prompt(g, 'confirm', 'Continue', W / 2 - 30, H / 2 + 14);
    }
    if (S.mode === 'demo') drawDemoBanner(g, W, H);
  });
  talk.draw(r);
}

// ------------------------------------------------------------------------------------------------ evening, day cards, epilogue
const skyline = new E.Backdrop('city-night');
let EV = null;
const evening = {
  enter() {
    EV = { t: 0, done: false };
    game.audio.music(MM.SONGS.evening);
    game.script(function* () {
      yield 1;
      const c = yield* ask('cal', [MM.EVENING.q], MM.EVENING.choices, { name: 'CAL, THINKING' });
      if (c === 0) { S.home = clamp(S.home + 15, 0, 100); S.bourbon = 0; S.nerve = clamp(S.nerve - 5, 0, 100); S.evening[S.day] = 'home'; yield* say('cal', MM.EVENING.home, { name: 'OSSINING' }); }
      else { S.home = clamp(S.home - 15, 0, 100); S.bourbon = Math.min(4, Math.max(1, S.bourbon)); S.nerve = clamp(S.nerve + 20, 0, 100); S.hollis++; S.evening[S.day] = 'bar'; yield* say('hollis', MM.EVENING.bar, { name: 'THE LANTERN BAR' }); }
      S.nerve = clamp(S.nerve, 20, 100);
      if (S.day < MM.DAYS.length - 1) { startDay(S.day + 1); game.go('dayintro', { fade: 'dissolve' }); }
      else game.go('epilogue', { fade: 'dissolve' });
    });
  },
  update(dt) { EV.t += dt; talk.update(dt); runVoice(); },
  draw(r) {
    skyline.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.font.title(g, 'FIVE-FIFTEEN', W / 2, 20, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
      const R = S.results[S.day];
      T(g, day().account + ': ' + (R && R.won ? 'signed.' : 'gone to another agency.'), W / 2, 44, R && R.won ? '#ffd36a' : '#e0909a', { align: 'center' });
      T(g, 'Total billings this week: $' + S.billings.toFixed(1) + ' million', W / 2, 56, '#f4ecd8', { align: 'center' });
    });
    talk.draw(r);
  }
};
let DI = null;
const dayintro = {
  enter() { DI = { t: 0, n: 0 }; game.audio.music(MM.SONGS.title); },
  update(dt) {
    if (S.mode === 'demo' && anyInput()) { exitDemo(); return; }
    DI.t += dt; const before = DI.n; DI.n = Math.min(999, Math.floor(DI.t * 40));
    if (DI.n > before && DI.n % 2 === 0 && DI.n < introText().length) game.audio.sfx('typekey');
    if (S.mode === 'demo' && DI.t > 3.5) { game.go('office'); return; }
    const I = game.input;
    if (DI.t > .6 && (I.pressed('confirm') || I.pressed('start') || I.clicked())) {
      if (DI.n < introText().length) DI.t = 99; else game.go('office', { fade: 'wipe' });
    }
  },
  draw(r) {
    r.sky(['#14100c', '#1e1812', '#0e0a08']);
    r.overlay(g => {
      const W = r.W, H = r.H, D = day();
      E.font.title(g, D.day, W / 2, 26, { scale: 3, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
      T(g, D.date.toUpperCase(), W / 2, 56, '#d8ccb0', { align: 'center' });
      const s = introText().slice(0, DI.n), w = Math.min(320, W - 40);
      E.ui.box(g, W / 2 - w / 2 - 10, 72, w + 20, 110, { bg: ['#f2ead2', '#e2d8bc'], border: '#5a4a32', gradient: false });
      E.font.wrap(s, w).slice(0, 10).forEach((l, i) => T(g, l, W / 2 - w / 2, 80 + i * 10, '#1a1410', { shadow: false }));
      if (DI.n >= introText().length && S.mode !== 'demo') prompt(g, 'confirm', 'Go to work', W / 2 - 40, H - 30);
      if (S.mode === 'demo') drawDemoBanner(g, W, H);
    });
  }
};
function introText() {
  const D = day();
  return 'ACCOUNT: ' + D.account + '. BILLINGS: $' + D.billings.toFixed(1) + ' MILLION. ' + D.brief + (S.day === 0 && S.mode !== 'versus' ? '   Talk to people, look at things: every conversation costs time, every idea goes in your folio. At two o\'clock you pitch with what you have.' : '');
}
let EP = null;
const epilogue = {
  enter() {
    EP = { t: 0 }; game.audio.music(MM.SONGS.evening);
    const won = S.results.filter(r => r && r.won).length;
    const rank = S.billings >= 8 ? 'PARTNER' : S.billings >= 4 ? 'CREATIVE DIRECTOR, STILL' : S.billings > 0 ? 'ON THIN ICE' : 'CLEANING OUT YOUR DESK';
    EP.lines = [
      'You signed ' + won + ' of 3 accounts: $' + S.billings.toFixed(1) + ' million in billings.',
      S.billings >= 8 ? 'On Monday the sign painter comes. VANCE HALLORAN WHITMORE. Hollis complains about the kerning and buys the first round.'
        : S.billings >= 4 ? 'Hollis shakes your hand at the elevator and calls you "the future." He says it the way men say "the weather."'
        : 'Hollis takes you to lunch at a restaurant you have never heard of, which is how you know.',
      S.home >= 60 ? 'In Ossining, Claire leaves the porch light on. Sally shows you where the new tooth is coming in.' : 'The house in Ossining is dark when the cab pulls up. There is a note on the table. It is polite.',
      S.bunny >= 2 ? 'In 1965 Bunny Kowalski gets an office with a window. Her name is on the door, spelled right.' : S.bunny >= 0 ? 'Bunny Kowalski keeps writing. Somebody will notice. It may not be you.' : 'Bunny Kowalski takes a job at Doyle Dane. You read her work in Life magazine and it is better than yours.'
    ];
    EP.rank = rank;
  },
  update(dt) { EP.t += dt; const I = game.input; if (EP.t > 2 && (I.pressed('confirm') || I.pressed('start') || I.clicked())) { ABOUT.from = 'title'; game.go('about', { fade: 'dissolve' }); } },
  draw(r) {
    skyline.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#0a0806'));
      E.font.title(g, 'FRIDAY NIGHT', W / 2, 14, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
      T(g, EP.rank, W / 2, 38, '#ffd36a', { align: 'center', scale: 1 });
      let y = 56; const w = Math.min(340, W - 30);
      EP.lines.forEach((l, i) => { if (EP.t > .6 + i * .8) E.font.wrap(l, w).forEach(s => { T(g, s, W / 2, y, '#f4ecd8', { align: 'center' }); y += 10; }); y += 6; });
      if (EP.t > 2) prompt(g, 'confirm', 'Credits', W / 2 - 30, H - 20);
    });
  }
};

// ------------------------------------------------------------------------------------------------ title, about, attract
let TT = null;
const title = {
  enter() {
    S && S.mode === 'demo' || (S = null);
    TT = { idle: TT && TT.keepIdle ? TT.keepIdle : 0, t: 0, keepIdle: 0 };
    TT.menu = new E.Menu(game, ['NEW CAMPAIGN', 'PITCH-OFF  (2-4 PLAYERS)', 'SETTINGS', 'ABOUT & CREDITS'], { x: 'center', y: 0, onPick: i => titlePick(i) });
    TT.menu.bg = '#1c1712'; TT.menu.border = '#d8b46a'; TT.menu.color = '#f4ecd8';
    game.audio.music(MM.SONGS.title);
    game.setView('threequarter');
  },
  update(dt) {
    TT.t += dt;
    if (anyInput()) TT.idle = 0; else TT.idle += dt;
    if (TT.idle > 10) { startDemo(); return; }
    heroRig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -.6, pose: 'hips' });
    const gate = touchGate();
    if (gate) { const c = game.input.clicked(); if (c && TT.setRect && inRect(c, ...TT.setRect)) game.menu('settings'); return; }
    if (TT.sub) TT.sub.update(dt); else TT.menu.update(dt);
  },
  draw(r) {
    skyline.draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      // a man at the window
      px.blend(g, .9, 'normal', () => px.rect(g, 0, H - 40, W, 40, '#0e0a08'));
      heroRig.draw(g, Math.round(W * .18), H - 40, game.view);
      E.font.title(g, 'MAD MENTION', W / 2, 24, { scale: 4, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'], outline: '#140c06', depth: 3, depthColor: '#5a2a10' });
      T(g, 'A MADISON AVENUE PITCH GAME  -  NEW YORK, 1964', W / 2, 66, '#d8ccb0', { align: 'center' });
      const gate = touchGate();
      if (gate) {
        const bw = Math.min(240, W - 20), msg = E.font.wrap('Connect a controller or a keyboard to play. Leave it be and the demo plays on its own.', bw - 16);
        E.ui.box(g, W / 2 - bw / 2, 96, bw, 52 + msg.length * 10, { bg: ['#2e2418', '#17110c'], border: '#d8b46a' });
        T(g, 'Controller or keyboard required', W / 2, 106, '#ffd36a', { align: 'center' });
        msg.forEach((l, i) => T(g, l, W / 2, 120 + i * 10, '#d8ccb0', { align: 'center' }));
        const sy = 124 + msg.length * 10;
        TT.setRect = [W / 2 - 40, sy, 80, 20];
        E.ui.box(g, W / 2 - 40, sy, 80, 20, { bg: ['#6a4a1a', '#3a2a10'], border: '#ffd36a' });
        T(g, 'SETTINGS', W / 2, sy + 6, '#ffe8a0', { align: 'center' });
      } else {
        TT.menu.y = Math.round(H / 2 - 4);
        if (TT.sub) { TT.sub.y = Math.round(H / 2 - 10); TT.sub.draw(r); } else TT.menu.draw(r);
        let x = W / 2 - 70; x += prompt(g, 'up', '', x, H - 18); x += prompt(g, 'down', 'Select', x, H - 18) + 10; prompt(g, 'confirm', 'Choose', x, H - 18);
      }
      T(g, 'MY-3D2DGE V' + (E.version || ''), W - 6, H - 10, '#5a4a3a', { align: 'right', font: 'tiny' });
    });
  }
};
function titlePick(i) {
  if (i === 0) { newGame('story'); startDay(0); game.go('dayintro', { fade: 'wipe' }); }
  else if (i === 1) {
    // how many creatives: a small menu over the title (hot seat: pass the controller)
    TT.sub = new E.Menu(game, ['2 PLAYERS', '3 PLAYERS', '4 PLAYERS', 'BACK'], { x: 'center', y: 0, title: 'PITCH-OFF',
      onPick: k => { TT.sub = null; if (k < 3) { newGame('versus', k + 2); S.day = Math.floor(Math.random() * 3); startDay(S.day); game.go('draft', { fade: 'wipe' }); } },
      onCancel: () => { TT.sub = null; } });
    TT.sub.bg = '#1c1712'; TT.sub.border = '#d8b46a'; TT.sub.color = '#f4ecd8';
  }
  else if (i === 2) game.menu('settings');
  else { ABOUT.from = 'title'; game.go('about'); }
}
function startDemo() {
  const loop = S && S.demoLoop || 0;
  newGame('demo'); S.demoLoop = loop; startDay(0); bot.i = 0;
  game.go('dayintro', { fade: 'dissolve' });
}
function endDemoLoop() { const loop = S.demoLoop + 1; S.demoLoop = loop; TT = { keepIdle: 7 }; game.go('title', { fade: 'dissolve' }); }
function exitDemo() { talk.close(); if (S) S.mode = 'ended'; TT = { keepIdle: 0 }; game.input.clear(); game.go('title', { fade: 0 }); }   // the state stays until the title clears it: a running script may still read it this step

const ABOUT = { from: 'title', y: 0 };
const ABOUT_TEXT = () => MM.ABOUT || [];
const about = {
  enter() { ABOUT.y = 0; },
  update(dt) {
    const I = game.input;
    if (I.down('down')) ABOUT.y += 90 * dt; if (I.down('up')) ABOUT.y -= 90 * dt;
    ABOUT.y = clamp(ABOUT.y, 0, Math.max(0, ABOUT.h - 140));
    if (I.pressed('cancel') || I.pressed('confirm') || I.pressed('start') || I.clicked()) game.go('title');
  },
  draw(r) {
    r.sky(['#14100c', '#1e1812', '#0e0a08']);
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(380, W - 30);
      E.font.title(g, 'ABOUT & CREDITS', W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
      let y = 34 - ABOUT.y;
      for (const [head, body] of ABOUT_TEXT()) {
        if (y > 26 && y < H - 30) T(g, head, W / 2 - w / 2, y, '#f0c860');
        y += 11;
        for (const line of [].concat(body)) for (const s of E.font.wrap(line, w)) { if (y > 26 && y < H - 30) T(g, s, W / 2 - w / 2, y, '#f4ecd8'); y += 9; }
        y += 6;
      }
      ABOUT.h = y + ABOUT.y - 34;
      px.rect(g, 0, H - 28, W, 28, '#0e0a08');
      let x = W / 2 - 80; x += prompt(g, 'up', '', x, H - 18); x += prompt(g, 'down', 'Scroll', x, H - 18) + 10; prompt(g, 'cancel', 'Back', x, H - 18);
    });
  }
};

// ------------------------------------------------------------------------------------------------ Pitch-Off: the draft
let DR = null;
const draft = {
  enter() {
    const ids = Object.keys(MM.CARDS).filter(k => k !== 'cuff');
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    // a fair table: at least two cards for each objection's appeal
    const D = day(), need = D.objections.map(o => o.tag), pick = [];
    for (const t of need) for (const id of ids) if (MM.CARDS[id].tag === t && !pick.includes(id) && pick.filter(p => MM.CARDS[p].tag === t).length < 2) pick.push(id);
    for (const id of ids) if (pick.length < S.players.length * 4 + 2 && !pick.includes(id)) pick.push(id);
    const n = S.players.length, order = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k < n; k++) order.push(r % 2 ? n - 1 - k : k);   // a snake draft: four ideas each
    DR = { table: pick.slice(0, n * 4 + 2).map(card), taken: [], turn: 0, order, i: 0, rects: [] };
    S.intel = { obj: [true, true, true], want: true };
    game.audio.music(MM.SONGS.office);
  },
  update(dt) {
    const I = game.input, n = DR.table.length, [dx, dy] = navDir(), cols = DR.cols || 5;
    if (dx || dy) { DR.i = clamp(DR.i + dx + dy * cols, 0, n - 1); game.audio.sfx('needle'); }
    const p = I.pointer(); if (p && I.lastDevice === 'mouse' && pointerMoved()) DR.rects.forEach((rc, k) => { if (inRect(p, ...rc)) DR.i = k; });
    const c = I.clicked(); let act = I.pressed('confirm');
    if (c) { const k = DR.rects.findIndex(rc => inRect(c, ...rc)); if (k >= 0) { DR.i = k; act = true; } }
    if (I.pressed('cancel')) { game.go('title'); return; }
    if (act && !DR.taken.includes(DR.i)) {
      const who = DR.order[DR.turn]; S.players[who].cards.push(DR.table[DR.i]); DR.taken.push(DR.i); DR.turn++; game.audio.sfx('card');
      if (DR.turn >= DR.order.length) { S.bsPlayer = 0; game.go('brainstorm', { fade: 'wipe' }); }
    } else if (act) game.audio.sfx('bump');
  },
  draw(r) {
    r.sky(['#2a2018', '#3a2c1e', '#1a140e']);
    r.overlay(g => {
      const W = r.W, H = r.H, D = day(), who = DR.order[Math.min(DR.turn, DR.order.length - 1)];
      E.font.title(g, 'PITCH-OFF', W / 2, 8, { scale: 2, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] });
      T(g, D.account + ' is listening. Objections: ' + D.objections.map(o => MM.TAGS[o.tag].label).join(', ') + '.', W / 2, 30, '#d8ccb0', { align: 'center' });
      T(g, S.players[who].name + ': take an idea  (pass the controller)', W / 2, 41, PCOL[who], { align: 'center' });
      const big = DR.table.length > 10, cw = 76, ch = big ? 36 : 50, gap = big ? 4 : 6, cols = Math.max(1, Math.min(big ? Math.max(5, Math.ceil(DR.table.length / 4)) : 5, Math.floor((W - 20) / (cw + gap))));
      DR.cols = cols; DR.rects = [];
      const x0 = Math.round(W / 2 - (cols * (cw + gap) - gap) / 2);
      DR.table.forEach((c, k) => { const x = x0 + (k % cols) * (cw + gap), y = 54 + Math.floor(k / cols) * (ch + gap); DR.rects.push([x, y, cw, ch]); MM.drawCard(g, c, x, y, cw, ch, { sel: DR.i === k, dim: DR.taken.includes(k) }); if (DR.taken.includes(k)) { const o = DR.order[DR.taken.indexOf(k)]; T(g, 'P' + (o + 1), x + cw - 14, y + ch - 12, PCOL[o]); } });
      S.players.forEach((p, i) => T(g, 'P' + (i + 1) + ': ' + p.cards.map(c => MM.TAGS[c.tag].label[0]).join(' '), W * (i + .5) / S.players.length, H - 32, PCOL[i], { align: 'center' }));
      let x = 14; x += prompt(g, 'confirm', 'Take', x, H - 16) + 10; prompt(g, 'cancel', 'Quit', x, H - 16);
    });
  }
};

// ------------------------------------------------------------------------------------------------ the hub's waiting room
const hubwait = {
  enter() { hubConnect(); },
  update() {},
  draw(r) { skyline.draw(r); r.overlay(g => { E.font.title(g, 'MAD MENTION', r.W / 2, 40, { scale: 3, align: 'center', colors: ['#fff6d8', '#f0c860', '#c87a28'] }); T(g, 'Connecting to the hub...', r.W / 2, 90, '#d8ccb0', { align: 'center' }); }); }
};

// ------------------------------------------------------------------------------------------------ handle for tests and tools
game.debug = {
  snapshot: () => ({ scene: game.sceneName, mode: S && S.mode, day: S && S.day, clock: S && Math.round(S.clock), cards: S ? S.cards.map(c => c.id) : [], hero: hero ? [Math.round(hero.x), Math.round(hero.y)] : null,
    nerve: S && S.nerve, bourbon: S && S.bourbon, home: S && S.home, billings: S && S.billings, pitch: PS && { phase: PS.phase, ob: PS.ob, interest: S && S.players.map(p => Math.round(p.interest)) }, talk: talk.open, cursor: BS ? BS.i : null }),
  teleport(x, y) { if (hero) { hero.x = x; hero.y = y; } },
  state: () => S, use: id => { const t = things().find(t => t.id === id); if (t) use(t); }, go: (s, d) => game.go(s, d),
  newGame: m => { newGame(m); startDay(0); }
};
game.start({ scenes: { title, about, office, brainstorm, pitch, evening, dayintro, epilogue, draft, hubwait }, scene: HUB ? 'hubwait' : 'title' });
})();
