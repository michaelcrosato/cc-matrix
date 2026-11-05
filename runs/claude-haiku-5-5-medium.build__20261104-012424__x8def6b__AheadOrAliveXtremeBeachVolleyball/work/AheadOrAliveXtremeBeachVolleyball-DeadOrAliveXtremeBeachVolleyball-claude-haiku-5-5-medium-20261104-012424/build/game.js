(() => {
'use strict';
const E = My3D2dge, G = {};
window.AOA = G;
/* ==== 00-core.js ==== */
/* 00-core: the G namespace, constants, seeded random streams, the event bus, money and text helpers.
 * Every src file adds to G (the build wraps them all in one IIFE with const E = My3D2dge). */
G.VERSION = 'v1.0';
G.TITLE = 'Ahead or Alive';
G.STRAP = 'Xtreme Beach Volleyball';
G.TAGLINE = 'Stay ahead. Stay alive. Stay tanned.';
G.DAYS = 5;
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
G.SLOT_HOURS = [[6, 12], [12, 18], [18, 24]];
/* the pixel font draws ASCII, hearts, arrows and bullets: other symbols are mapped to close ones before they are drawn */
G.FONT_SAFE = { '·': '-', '✕': 'X', '○': 'O', '□': '[]', '△': '^', '◂': '<', '…': '...', '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', 'é': 'e', 'è': 'e', 'ê': 'e', 'á': 'a', 'à': 'a', 'â': 'a', 'í': 'i', 'ó': 'o', 'ô': 'o', 'ñ': 'n', 'ú': 'u', 'ü': 'u', 'ç': 'c', '♠': 'S', '♣': 'C', '♦': 'D', '✓': 'v', 'ã': 'a', 'ō': 'o' };
G.fontSafe = function (s) { if (typeof s !== 'string') return s; let out = ''; for (const ch of s) out += G.FONT_SAFE[ch] || ch; return out; };
(function () {
  const f = E.font, wrap = (fn) => function (g, s, ...rest) { return fn.call(this, g, G.fontSafe(s), ...rest); };
  if (f.text && !f._aoa) { f.text = wrap(f.text); f._aoa = true; }
  if (f.title && !f._aoaT) { f.title = wrap(f.title); f._aoaT = true; }
  if (f.width && !f._aoaW) { const w0 = f.width; f.width = function (s, o) { return w0.call(this, G.fontSafe(s), o); }; f._aoaW = true; }
})();

/* A seeded stream per purpose: world (schedules, moods, weather, stock), match (AI rolls, cords), casino, cosmetic
 * (crowd, particles, voices: never changes state). Gameplay never calls Math.random. */
G._streams = {};
G.rng = function (stream) {
  if (!G._streams[stream]) {
    const base = (G.state && G.state.seed) || G.seedBase || 1;
    G._streams[stream] = E.rng(G.hash(stream + ':' + base));
  }
  return G._streams[stream]();
};
G.rngFn = function (stream) { return () => G.rng(stream); };
G.resetStreams = function (seed) {
  G.seedBase = seed >>> 0 || 1; G._streams = {};
};
G.hash = function (str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
G.pickRng = function (stream, list) { return list[Math.floor(G.rng(stream) * list.length) % list.length]; };
G.rand = function (stream, a, b) { return a + (b - a) * G.rng(stream); };
G.chance = function (stream, p) { return G.rng(stream) < p; };

/* Event bus: point, touch, fault, matchEnd, gift, affinity, purchase, slotEnd, dayEnd, photo, story */
G.Bus = class {
  constructor() { this.h = {}; }
  on(name, fn) { (this.h[name] = this.h[name] || []).push(fn); return () => this.off(name, fn); }
  off(name, fn) { const a = this.h[name]; if (a) this.h[name] = a.filter(f => f !== fn); }
  emit(name, data) { const a = this.h[name]; if (a) for (const f of a.slice()) { try { f(data); } catch (e) { if (G.game) G.game.fail('bus ' + name, e); } } }
};
G.bus = new G.Bus();

G.fmtMoney = function (n) { n = Math.round(n || 0); const neg = n < 0; n = Math.abs(n); return (neg ? '-' : '') + 'S$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
G.fmtNum = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
G.lerp = (a, b, t) => a + (b - a) * t;
G.wrapText = function (text, maxW, scale) {
  const s = scale || 1, out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (E.font.width(t, { scale: s }) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
};
G.hitRect = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
G.sameItems = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/* ==== 01-tuning.js ==== */
/* 01-tuning: every balance number as a live slider (G.T). Systems read G.T each step; dev mode edits it; the
 * values persist in E.store('aoa-dev-tuning'); Reset all restores G.TUNING defaults. */
G.TUNING = [
  { key: 'ballGravity', group: 'Ball', label: 'Gravity', def: 330, min: 180, max: 500, step: 5, unit: '' },
  { key: 'ballDrag', group: 'Ball', label: 'Air drag', def: .12, min: 0, max: .6, step: .01, unit: '' },
  { key: 'passT', group: 'Ball', label: 'Pass flight time', def: 1.05, min: .7, max: 1.6, step: .05, unit: 's' },
  { key: 'setT', group: 'Ball', label: 'Set flight time', def: 1.1, min: .7, max: 1.6, step: .05, unit: 's' },
  { key: 'serveT', group: 'Ball', label: 'Float serve time', def: 1.3, min: .9, max: 1.8, step: .05, unit: 's' },
  { key: 'jumpServeT', group: 'Ball', label: 'Jump serve time', def: .85, min: .6, max: 1.3, step: .05, unit: 's' },
  { key: 'spikeSpeed', group: 'Ball', label: 'Spike speed', def: 330, min: 220, max: 480, step: 5, unit: '' },
  { key: 'shotT', group: 'Ball', label: 'Shot flight time', def: .95, min: .6, max: 1.4, step: .05, unit: 's' },
  { key: 'netCordOver', group: 'Ball', label: 'Net cord goes over', def: .45, min: 0, max: 1, step: .05, unit: '' },
  { key: 'perfectWin', group: 'Timing', label: 'Perfect window', def: .05, min: .02, max: .12, step: .005, unit: 's' },
  { key: 'greatWin', group: 'Timing', label: 'Great window', def: .10, min: .05, max: .2, step: .005, unit: 's' },
  { key: 'okWin', group: 'Timing', label: 'OK window', def: .16, min: .08, max: .3, step: .01, unit: 's' },
  { key: 'reach', group: 'Timing', label: 'Reach', def: 14, min: 8, max: 24, step: 1, unit: '' },
  { key: 'diveReach', group: 'Timing', label: 'Dive reach', def: 16, min: 6, max: 30, step: 1, unit: '' },
  { key: 'blockRise', group: 'Timing', label: 'Block rise time', def: .28, min: .15, max: .45, step: .01, unit: 's' },
  { key: 'runSpeed', group: 'Players', label: 'Run speed', def: 96, min: 60, max: 140, step: 2, unit: '' },
  { key: 'autoMove', group: 'Players', label: 'Auto-run strength', def: .85, min: 0, max: 1, step: .05, unit: '' },
  { key: 'aiSkillMul', group: 'AI', label: 'AI skill (x day base)', def: 1, min: .3, max: 1.6, step: .02, unit: 'x' },
  { key: 'aiReaction', group: 'AI', label: 'AI reaction', def: .25, min: 0, max: .6, step: .01, unit: 's' },
  { key: 'aiSpeedMul', group: 'AI', label: 'AI speed', def: 1, min: .6, max: 1.4, step: .02, unit: 'x' },
  { key: 'chemistry', group: 'AI', label: 'Partner chemistry', def: .3, min: 0, max: .6, step: .02, unit: '' },
  { key: 'pointsToWin', group: 'Match', label: 'Points to win (vacation)', def: 7, min: 3, max: 21, step: 1, unit: '' },
  { key: 'prizeMul', group: 'Economy', label: 'Prize money', def: 1, min: 0, max: 3, step: .05, unit: 'x' },
  { key: 'priceMul', group: 'Economy', label: 'Shop prices', def: 1, min: .25, max: 3, step: .05, unit: 'x' },
  { key: 'startMoney', group: 'Economy', label: 'Starting money', def: 30000, min: 0, max: 200000, step: 5000, unit: 'S$' },
  { key: 'affinityGainMul', group: 'Social', label: 'Affinity gain', def: 1, min: 0, max: 3, step: .05, unit: 'x' },
  { key: 'affinityDecay', group: 'Social', label: 'Affinity decay per day', def: 2, min: 0, max: 10, step: 1, unit: '' },
  { key: 'inviteThreshold', group: 'Social', label: 'Team-up threshold', def: 40, min: 0, max: 100, step: 1, unit: '' },
  { key: 'giftThreshold', group: 'Social', label: 'Gift threshold', def: 0, min: -3, max: 3, step: 1, unit: '' },
  { key: 'poolBpm', group: 'Pool Hop', label: 'Pool Hop tempo', def: 112, min: 80, max: 150, step: 2, unit: 'bpm' },
  { key: 'poolWindowMul', group: 'Pool Hop', label: 'Pool Hop window', def: 1, min: .5, max: 2, step: .05, unit: 'x' },
  { key: 'poolTime', group: 'Pool Hop', label: 'Pool Hop time', def: 40, min: 20, max: 80, step: 1, unit: 's' },
  { key: 'slotsPayMul', group: 'Casino', label: 'Slot payouts', def: 1, min: .5, max: 1.5, step: .01, unit: 'x' },
  { key: 'dealerHitsSoft17', group: 'Casino', label: 'Dealer hits soft 17', def: false, toggle: true },
  { key: 'rouletteDoubleZero', group: 'Casino', label: 'Double zero wheel', def: false, toggle: true },
  { key: 'textSpeed', group: 'Presentation', label: 'Text speed (letters/s)', def: 45, min: 10, max: 200, step: 5, unit: '' },
  { key: 'cameraZoomMul', group: 'Presentation', label: 'Camera zoom', def: 1, min: .7, max: 1.3, step: .02, unit: 'x' }
];
G.TUNING_DEFAULTS = {};
for (const t of G.TUNING) G.TUNING_DEFAULTS[t.key] = t.def;
G.T = Object.assign({}, G.TUNING_DEFAULTS);
G.loadTuning = function () {
  const saved = E.store.get('aoa-dev-tuning', null);
  Object.assign(G.T, G.TUNING_DEFAULTS);
  if (saved && typeof saved === 'object') for (const k in saved) if (k in G.TUNING_DEFAULTS) G.T[k] = saved[k];
};
G.saveTuning = function () {
  const diff = {};
  for (const k in G.T) if (G.T[k] !== G.TUNING_DEFAULTS[k]) diff[k] = G.T[k];
  E.store.set('aoa-dev-tuning', diff);
};
G.resetTuning = function () { Object.assign(G.T, G.TUNING_DEFAULTS); G.saveTuning(); };
G.tuneDef = function (key) { return G.TUNING.find(t => t.key === key); };
G.setTune = function (key, v) {
  const d = G.tuneDef(key); if (!d) return;
  if (d.toggle) v = !!v;
  else { v = Math.round(G.clamp(+v, d.min, d.max) / d.step) * d.step; v = +v.toFixed(4); }
  G.T[key] = v; G.saveTuning();
};
/* difficulty presets: an offset to the AI skill and a few windows */
G.DIFFICULTY = { easy: { name: 'Easy', skill: -.2, assist: 1.25, spikeAssist: 'always' }, normal: { name: 'Normal', skill: 0, assist: 1, spikeAssist: 'near' },
  hard: { name: 'Hard', skill: .12, assist: .9, spikeAssist: 'never' }, pro: { name: 'Pro', skill: .22, assist: .8, spikeAssist: 'never' } };

/* ==== 02-data-cast.js ==== */
/* 02-data-cast: the six fighters, the hosts and staff, their looks, play stats, voices, tastes and starting affinity.
 * Every character is an adult (21+); the humour is in Sonny, the rivalries and the vacation mishaps. */
G.FIGHTERS = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'];
G.CAST = {
  rin: { id: 'rin', name: 'Rin Takamine', short: 'RIN', epithet: 'The Quiet Blade', from: 'Japan', style: 'Kendo and iaido champion', age: 24,
    size: 1.22, build: 'heroic', hair: 'ponytail', hairColor: '#1d1a24', skin: '#f1cfb2', eyes: '#4a2c22', cloth: '#23306b', pants: '#e8eef8', trim: '#c8303a', boot: '#f1cfb2',
    tastes: ['classic', 'elegant'], stats: { POW: 5, TEC: 9, SPD: 7, JMP: 6 }, voice: { base: 330, range: 3, rate: 13, formant: 1.05, wave: 'triangle' },
    signature: 'seigaiha', starts: { acc: ['ribbon'] }, celebration: 'Bow', color: '#2fb5a0', mood: 'Calm',
    start: { lines: 'Good morning. The sand is... adequate.' }, portrait: { band: null } },
  lola: { id: 'lola', name: 'Dolores "Lola" Vega', short: 'LOLA', epithet: 'La Tormenta', from: 'Mexico', style: 'Luchadora (pro wrestler)', age: 27,
    size: 1.30, build: 'heroic', hair: 'curly', hairColor: '#3a2218', skin: '#b9825a', eyes: '#3a2416', cloth: '#c8202c', pants: '#ffd04a', trim: '#1a1a1a', boot: '#1a1a1a',
    tastes: ['bold', 'sporty'], stats: { POW: 9, TEC: 5, SPD: 5, JMP: 8 }, voice: { base: 260, range: 6, rate: 16, formant: .95, wave: 'saw' },
    signature: 'estrella', starts: { acc: ['sweatband'] }, celebration: 'Victory Fist Pump', color: '#ff5fa2', mood: 'Loud',
    start: { lines: '¡Hola, compañera! Ready to bring the THUNDER?' } },
  ingrid: { id: 'ingrid', name: 'Ingrid Halvorsen', short: 'INGRID', epithet: 'The Glacier', from: 'Norway', style: 'Glíma wrestler, ex-biathlete', age: 26,
    size: 1.38, build: 'heroic', hair: 'braid', hairColor: '#f2ead2', skin: '#f7dccb', eyes: '#5aa0d8', cloth: '#9fd8f0', pants: '#1d3560', trim: '#ffffff', boot: '#1d3560',
    tastes: ['sporty', 'classic'], stats: { POW: 7, TEC: 6, SPD: 4, JMP: 9 }, voice: { base: 210, range: 2, rate: 10, formant: .9, wave: 'triangle' },
    signature: 'fjord', starts: { acc: ['sportshades'] }, celebration: 'Head Nod', color: '#5aa0d8', mood: 'Deadpan',
    start: { lines: 'It is thirty-one degrees. I am melting. Hello.' } },
  amara: { id: 'amara', name: 'Amara Okafor', short: 'AMARA', epithet: 'Rhythm Queen', from: 'UK / Nigeria', style: 'Capoeira and dance fighting', age: 22,
    size: 1.26, build: 'heroic', hair: 'puff', hairColor: '#2a1810', skin: '#7a4a2e', eyes: '#2a1810', cloth: '#ff8a1e', pants: '#2f9e4a', trim: '#ffd36a', boot: '#7a4a2e',
    tastes: ['bold', 'cute'], stats: { POW: 5, TEC: 6, SPD: 9, JMP: 8 }, voice: { base: 340, range: 7, rate: 15, formant: 1.1, wave: 'pulse' },
    signature: 'kentepop', starts: { acc: ['hibiscus'] }, celebration: 'Dance Charleston', color: '#ffd36a', mood: 'Bubbly',
    start: { lines: 'Hey hey! You hear that? The ocean\'s got rhythm!' } },
  tess: { id: 'tess', name: 'Tess Callahan', short: 'TESS', epithet: 'Riptide', from: 'Australia', style: 'Surfer and MMA brawler', age: 25,
    size: 1.28, build: 'heroic', hair: 'bob', hairColor: '#f0d890', skin: '#e2ad84', eyes: '#3c7a5a', cloth: '#1fb7b0', pants: '#ff7a5e', trim: '#ffffff', boot: '#e2ad84',
    tastes: ['sporty', 'bold'], stats: { POW: 7, TEC: 7, SPD: 7, JMP: 6 }, voice: { base: 290, range: 5, rate: 14, formant: 1.0, wave: 'saw' },
    signature: 'reefbreak', starts: { acc: ['wristbands'] }, celebration: 'Wave_Hello', color: '#3c7a5a', mood: 'Chill',
    start: { lines: 'G\'day! Waves are pumping, sun\'s out. Life\'s good, yeah?' } },
  mei: { id: 'mei', name: 'Mei-Lin Zhou', short: 'MEI', epithet: 'Little Phoenix', from: 'Hong Kong', style: 'Wushu acrobat, xiangqi prodigy', age: 21,
    size: 1.16, build: 'heroic', hair: 'twinbuns', hairColor: '#1a1418', skin: '#f3d2b8', eyes: '#3a2420', cloth: '#ffb2a0', pants: '#e85a8a', trim: '#ffffff', boot: '#f3d2b8',
    tastes: ['cute', 'elegant'], stats: { POW: 4, TEC: 8, SPD: 8, JMP: 6 }, voice: { base: 400, range: 6, rate: 18, formant: 1.18, wave: 'pulse' },
    signature: 'peony', starts: { acc: ['ribbon'] }, celebration: 'Backflip', color: '#e85a8a', mood: 'Mischief',
    start: { lines: 'Hehe. Bet you can\'t beat me at anything today.' } }
};
G.BRIEF = { rin: 'Kendo champion', lola: 'Luchadora', ingrid: 'Glima wrestler', amara: 'Capoeira dancer', tess: 'Surfer and brawler', mei: 'Wushu acrobat' };
G.STAFF = {
  sonny: { id: 'sonny', name: 'Sonny Fortuna', short: 'SONNY', epithet: 'The Man with the Golden Tan', size: 1.32, build: 'bulky', hair: 'spiky', hairColor: '#121014', skin: '#d9a27a',
    voice: { base: 120, range: 7, rate: 13, formant: .8, wave: 'saw', vib: 6 }, stats: { POW: 8, TEC: 5, SPD: 5, JMP: 5 }, color: '#ffd36a', celebration: 'Cheering_Two_Hands' },
  pepper: { id: 'pepper', name: 'Pepper Quill', short: 'PEPPER', epithet: 'Concierge', size: 1.24, build: 'heroic', hair: 'bun', hairColor: '#5a2a1e', skin: '#f0c6a4',
    voice: { base: 230, range: 1, rate: 17, formant: 1.0, wave: 'triangle' }, stats: { POW: 6, TEC: 10, SPD: 7, JMP: 6 }, color: '#1d2433', celebration: 'Salute' },
  kai: { id: 'kai', name: 'Kai Makoa', short: 'KAI', epithet: 'Bartender and croupier', size: 1.25, build: 'heroic', hair: 'short', hairColor: '#1a1410', skin: '#a8714a',
    voice: { base: 170, range: 4, rate: 12, formant: .85, wave: 'triangle' }, color: '#2fb5a0' },
  odette: { id: 'odette', name: 'Odette Belrose', short: 'ODETTE', epithet: 'Couturier', size: 1.2, build: 'heroic', hair: 'long', hairColor: '#c8b8e8', skin: '#f5d9c4',
    voice: { base: 300, range: 5, rate: 12, formant: 1.1, wave: 'pulse' }, color: '#ff8aa8' },
  bo: { id: 'bo', name: 'Coach Bo Brannigan', short: 'BO', epithet: 'Retired beach pro', size: 1.28, build: 'bulky', hair: 'bald', hairColor: '#000000', skin: '#b5795a',
    voice: { base: 150, range: 3, rate: 14, formant: .85, wave: 'square' }, color: '#ffd04a' }
};
/* gift tastes: 3 love, 2 like, 0 neutral, -3 dislike, per fighter */
G.TASTE_VALUE = { L: 3, '+': 2, '.': 0, '-': -3 };
G.GIFT_TASTE = {
  mango_smoothie: { rin: '.', lola: '+', ingrid: '.', amara: '+', tess: '+', mei: '.' },
  bubble_tea: { rin: '.', lola: '.', ingrid: '.', amara: '.', tess: '.', mei: '+' },
  matcha_icecream: { rin: '+', lola: '.', ingrid: '+', amara: '.', tess: '.', mei: '+' },
  mochi_box: { rin: '+', lola: '.', ingrid: '.', amara: '.', tess: '.', mei: 'L' },
  bbq_skewers: { rin: '.', lola: '+', ingrid: '.', amara: '.', tess: 'L', mei: '-' },
  hot_sauce: { rin: '-', lola: 'L', ingrid: '-', amara: '.', tess: '+', mei: '-' },
  iced_coffee: { rin: '.', lola: '.', ingrid: '+', amara: '.', tess: '.', mei: '.' },
  coconut: { rin: '.', lola: '.', ingrid: '.', amara: '.', tess: '+', mei: '.' },
  plush_seal: { rin: 'L', lola: '.', ingrid: '+', amara: '.', tess: '.', mei: '+' },
  snow_globe: { rin: '.', lola: '.', ingrid: 'L', amara: '-', tess: '.', mei: '.' },
  puzzle_cube: { rin: '+', lola: '-', ingrid: '.', amara: '.', tess: '.', mei: 'L' },
  portable_speaker: { rin: '-', lola: '+', ingrid: '.', amara: 'L', tess: '+', mei: '.' },
  matcha_kit: { rin: 'L', lola: '-', ingrid: '.', amara: '.', tess: '.', mei: '+' },
  calligraphy_set: { rin: '+', lola: '.', ingrid: '.', amara: '.', tess: '-', mei: '.' },
  knitting_kit: { rin: '.', lola: '.', ingrid: 'L', amara: '-', tess: '.', mei: '-' },
  maracas: { rin: '.', lola: '+', ingrid: '.', amara: '+', tess: '.', mei: '.' },
  luchador_mask: { rin: '.', lola: 'L', ingrid: '.', amara: '.', tess: '+', mei: '.' },
  beach_paperback: { rin: '+', lola: '-', ingrid: '+', amara: '.', tess: '.', mei: '.' },
  fashion_mag: { rin: '.', lola: '.', ingrid: '-', amara: '+', tess: '-', mei: '+' },
  energy_drink: { rin: '-', lola: '.', ingrid: '.', amara: '-', tess: '+', mei: '-' },
  surf_wax: { rin: '.', lola: '.', ingrid: '.', amara: '.', tess: 'L', mei: '.' },
  sunscreen: { rin: '.', lola: '.', ingrid: '+', amara: '.', tess: '+', mei: '.' },
  foam_finger: { rin: '-', lola: '+', ingrid: '.', amara: '.', tess: '+', mei: '.' },
  glitter_sandals: { rin: '.', lola: '.', ingrid: '-', amara: '+', tess: '-', mei: '+' },
  gold_hoops: { rin: '.', lola: '+', ingrid: '.', amara: 'L', tess: '.', mei: '.' }
};
G.WEATHER_TASTE = { ingrid: { likes: ['cloudy', 'rain'], dislikes: [] }, amara: { likes: ['sunny'], dislikes: ['rain'] }, tess: { likes: ['sunny'], dislikes: [] } };
/* starting affinity, one symmetric value per pair */
G.AFF0 = {
  rin: { lola: 20, ingrid: 35, amara: 25, tess: 30, mei: 40 },
  lola: { ingrid: 25, amara: 40, tess: 45, mei: 20 },
  ingrid: { amara: 20, tess: 35, mei: 25 },
  amara: { tess: 30, mei: 40 },
  tess: { mei: 25 }
};
G.affStart = function (a, b) {
  if (a === b) return 0;
  const k1 = G.AFF0[a] && G.AFF0[a][b], k2 = G.AFF0[b] && G.AFF0[b][a];
  return k1 != null ? k1 : (k2 != null ? k2 : 20);
};
G.STAGE = [
  { min: 80, name: 'Best Friend' }, { min: 60, name: 'Good Friend' }, { min: 40, name: 'Friend' }, { min: 20, name: 'Acquaintance' }, { min: 0, name: 'Stranger' }
];
G.stageOf = function (aff) { return G.STAGE.find(s => aff >= s.min); };
G.stageIndex = function (aff) { const s = G.stageOf(aff); return 4 - G.STAGE.indexOf(s); };   // 0 stranger .. 4 best friend
G.MOOD = { Happy: { icon: 'sun', word: 'Happy', value: 1 }, Normal: { icon: 'half', word: 'Normal', value: 0 }, Gloomy: { icon: 'cloud', word: 'Gloomy', value: -1 } };
G.MOODS = ['Happy', 'Normal', 'Gloomy'];

/* ==== 03-data-items.js ==== */
/* 03-data-items: swimsuits (21), accessories (10), gifts (25), the three shops, and when stock arrives.
 * colors: main, accent, trim. cut and pattern are read by the rig (13-rigs.js). */
G.SUITS = {
  seigaiha: { name: 'Seigaiha', cut: 'onepiece', pattern: 'waves', colors: ['#23306b', '#e8eef8', '#c8303a'], tastes: ['classic', 'elegant'], where: 'Rin\'s signature' },
  estrella: { name: 'Estrella', cut: 'sport2', pattern: 'stars', colors: ['#c8202c', '#ffd04a', '#1a1a1a'], tastes: ['bold', 'sporty'], where: 'Lola\'s signature' },
  fjord: { name: 'Fjord', cut: 'rash', pattern: 'solid', colors: ['#9fd8f0', '#1d3560', '#ffffff'], tastes: ['sporty', 'classic'], where: 'Ingrid\'s signature' },
  kentepop: { name: 'Kente Pop', cut: 'tankini', pattern: 'geo', colors: ['#ff8a1e', '#2f9e4a', '#ffd36a'], tastes: ['bold', 'cute'], where: 'Amara\'s signature' },
  reefbreak: { name: 'Reef Break', cut: 'racer', pattern: 'gradient', colors: ['#1fb7b0', '#ff7a5e', '#ffffff'], tastes: ['sporty', 'bold'], where: 'Tess\'s signature' },
  peony: { name: 'Peony', cut: 'halter', pattern: 'floral', colors: ['#ffb2a0', '#e85a8a', '#ffffff'], tastes: ['cute', 'elegant'], where: 'Mei\'s signature' },
  protour: { name: 'Pro Tour', cut: 'racer', pattern: 'pin', colors: ['#f4f6fa', '#d8283a', '#1a2a5a'], tastes: ['sporty'], where: 'Riptide Sports', price: 12000, shop: 'riptide' },
  sandstorm: { name: 'Sandstorm', cut: 'sport2', pattern: 'solid', colors: ['#e8c06a', '#1a1a1a', '#ffffff'], tastes: ['sporty', 'bold'], where: 'Riptide Sports', price: 9000, shop: 'riptide' },
  lifeguard: { name: 'Lifeguard', cut: 'onepiece', pattern: 'solid', colors: ['#e0302a', '#ffd04a', '#ffffff'], tastes: ['sporty', 'classic'], where: 'Riptide Sports', price: 8000, shop: 'riptide' },
  coralrash: { name: 'Coral Rash', cut: 'rash', pattern: 'stripes', colors: ['#ff7a5e', '#ffffff', '#2a3a5a'], tastes: ['sporty'], where: 'Riptide Sports', price: 14000, shop: 'riptide' },
  neonrush: { name: 'Neon Rush', cut: 'tankini', pattern: 'gradient', colors: ['#7cff5a', '#ff4fb8', '#1a1a1a'], tastes: ['bold', 'sporty'], where: 'Riptide Sports', price: 16000, shop: 'riptide', day: 2 },
  monaco: { name: 'Monaco', cut: 'halter', pattern: 'stripes', colors: ['#1d2f6a', '#ffffff', '#d8283a'], tastes: ['classic', 'elegant'], where: 'Coral Couture', price: 22000, shop: 'coral' },
  polkapop: { name: 'Polka Pop', cut: 'sport2', pattern: 'dots', colors: ['#e8283a', '#ffffff', '#ffd04a'], tastes: ['cute'], where: 'Coral Couture', price: 18000, shop: 'coral' },
  tropicana: { name: 'Tropicana', cut: 'sarong', pattern: 'palms', colors: ['#2f8f4e', '#ffe0a0', '#ff8a1e'], tastes: ['elegant'], where: 'Coral Couture', price: 26000, shop: 'coral' },
  mermaid: { name: 'Mermaid', cut: 'onepiece', pattern: 'scales', colors: ['#1fb7b0', '#7a5fd8', '#e8f8ff'], tastes: ['cute', 'elegant'], where: 'Coral Couture', price: 30000, shop: 'coral', day: 3 },
  sunsetblvd: { name: 'Sunset Boulevard', cut: 'tankini', pattern: 'gradient', colors: ['#ff9e5e', '#7a3fa0', '#ffd36a'], tastes: ['bold', 'elegant'], where: 'Coral Couture', price: 28000, shop: 'coral' },
  midnight: { name: 'Midnight', cut: 'onepiece', pattern: 'solid', colors: ['#16141c', '#ffd36a', '#ffd36a'], tastes: ['elegant', 'bold'], where: 'Coral Couture', price: 35000, shop: 'coral', day: 4 },
  gingham: { name: 'Gingham Picnic', cut: 'tankini', pattern: 'check', colors: ['#6aa8e8', '#ffffff', '#e8283a'], tastes: ['cute', 'classic'], where: 'Coral Couture', price: 15000, shop: 'coral' },
  fortunagold: { name: 'Fortuna Gold', cut: 'racer', pattern: 'lame', colors: ['#ffd36a', '#fff3c0', '#1a1a1a'], tastes: ['bold'], where: 'Win the Final', reward: 'final' },
  jackpot: { name: 'Jackpot', cut: 'sport2', pattern: 'sevens', colors: ['#1a1a2a', '#ffd36a', '#e8283a'], tastes: ['bold', 'cute'], where: 'Casino prize counter', chips: 300 },
  pinstripe: { name: 'Pepper\'s Pinstripe', cut: 'racer', pattern: 'pin', colors: ['#121216', '#f4f4f4', '#ffd36a'], tastes: ['classic', 'elegant'], where: 'Pepper\'s gift (Day 4)', reward: 'pepper' }
};
G.SUIT_ORDER = ['seigaiha', 'estrella', 'fjord', 'kentepop', 'reefbreak', 'peony', 'protour', 'sandstorm', 'lifeguard', 'coralrash', 'neonrush', 'monaco', 'polkapop', 'tropicana', 'mermaid', 'sunsetblvd', 'midnight', 'gingham', 'fortunagold', 'jackpot', 'pinstripe'];
G.ACCESSORIES = {
  ribbon: { name: 'Ribbon', anchor: 'hair', look: 'a bow in the accent color', tastes: ['classic', 'cute'], where: 'Rin and Mei start with it; Coral Couture', price: 2000, shop: 'coral' },
  sweatband: { name: 'Sweatband', anchor: 'head', look: 'terry band', tastes: ['sporty'], where: 'Riptide; Lola starts with it', price: 3000, shop: 'riptide' },
  sportshades: { name: 'Sport Shades', anchor: 'face', look: 'wraparound lenses', tastes: ['sporty'], where: 'Riptide; Ingrid starts with them', price: 6000, shop: 'riptide', shades: true },
  heartshades: { name: 'Heart Shades', anchor: 'face', look: 'two pink hearts', tastes: ['cute', 'bold'], where: 'Coral Couture', price: 7500, shop: 'coral', shades: true },
  aviators: { name: 'Gold Aviators', anchor: 'face', look: 'like Sonny\'s', tastes: ['bold'], where: 'Coral Couture, Day 3+', price: 15000, shop: 'coral', shades: true, day: 3 },
  visor: { name: 'Sun Visor', anchor: 'head', look: 'white with a colored brim', tastes: ['sporty'], where: 'Riptide', price: 4000, shop: 'riptide' },
  sunhat: { name: 'Straw Sun Hat', anchor: 'head', look: 'wide straw brim', tastes: ['elegant', 'classic'], where: 'Coral Couture', price: 9000, shop: 'coral' },
  hibiscus: { name: 'Hibiscus', anchor: 'hair', look: 'a red flower behind the ear', tastes: ['cute', 'elegant'], where: 'Sundries; Amara starts with it', price: 2500, shop: 'sundries' },
  shellnecklace: { name: 'Shell Necklace', anchor: 'neck', look: 'white shell dots', tastes: ['cute', 'classic'], where: 'Sundries', price: 4500, shop: 'sundries' },
  wristbands: { name: 'Wristbands', anchor: 'wrists', look: '2-pixel bands', tastes: ['sporty'], where: 'Riptide; Tess starts with them', price: 3500, shop: 'riptide' }
};
G.ACC_ORDER = ['ribbon', 'sweatband', 'sportshades', 'heartshades', 'aviators', 'visor', 'sunhat', 'hibiscus', 'shellnecklace', 'wristbands'];
G.GIFTS = {
  mango_smoothie: { name: 'Mango Smoothie', price: 800, cat: 'food', shop: 'sundries', icon: 'coconut' },
  bubble_tea: { name: 'Bubble Tea', price: 900, cat: 'food', shop: 'sundries', icon: 'cup' },
  matcha_icecream: { name: 'Matcha Ice Cream', price: 700, cat: 'food', shop: 'sundries', icon: 'cone' },
  mochi_box: { name: 'Mochi Box', price: 1500, cat: 'food', shop: 'sundries', icon: 'box' },
  bbq_skewers: { name: 'BBQ Skewers', price: 1200, cat: 'food', shop: 'sundries', icon: 'stick' },
  hot_sauce: { name: 'Hot Sauce Sampler', price: 2000, cat: 'food', shop: 'sundries', icon: 'bottle' },
  iced_coffee: { name: 'Iced Coffee', price: 600, cat: 'food', shop: 'sundries', icon: 'cup' },
  coconut: { name: 'Fresh Coconut', price: 400, cat: 'food', shop: 'sundries', icon: 'coconut' },
  plush_seal: { name: 'Plush Seal', price: 3000, cat: 'goods', shop: 'sundries', icon: 'plush' },
  snow_globe: { name: 'Snow Globe', price: 2500, cat: 'goods', shop: 'sundries', icon: 'globe' },
  puzzle_cube: { name: 'Puzzle Cube', price: 2200, cat: 'goods', shop: 'sundries', icon: 'cube' },
  portable_speaker: { name: 'Portable Speaker', price: 9000, cat: 'goods', shop: 'sundries', icon: 'speaker' },
  matcha_kit: { name: 'Matcha Kit', price: 4500, cat: 'goods', shop: 'sundries', icon: 'cup' },
  calligraphy_set: { name: 'Calligraphy Set', price: 6000, cat: 'goods', shop: 'sundries', icon: 'brush' },
  knitting_kit: { name: 'Knitting Kit', price: 2800, cat: 'goods', shop: 'sundries', icon: 'ball' },
  maracas: { name: 'Maracas', price: 1400, cat: 'goods', shop: 'sundries', icon: 'maraca' },
  luchador_mask: { name: 'Luchador Mask', price: 5000, cat: 'goods', shop: 'sundries', icon: 'mask', day: 2 },
  beach_paperback: { name: 'Beach Paperback', price: 1200, cat: 'books', shop: 'sundries', icon: 'book' },
  fashion_mag: { name: 'Fashion Magazine', price: 800, cat: 'books', shop: 'sundries', icon: 'book' },
  energy_drink: { name: 'Energy Drink', price: 500, cat: 'sports', shop: 'riptide', icon: 'can' },
  surf_wax: { name: 'Surf Wax Deluxe', price: 1600, cat: 'sports', shop: 'riptide', icon: 'wax' },
  sunscreen: { name: 'Sunscreen SPF 100', price: 1000, cat: 'sports', shop: 'riptide', icon: 'bottle' },
  foam_finger: { name: 'Foam Finger', price: 900, cat: 'sports', shop: 'riptide', icon: 'finger' },
  glitter_sandals: { name: 'Glitter Sandals', price: 5500, cat: 'fashion', shop: 'coral', icon: 'sandal' },
  gold_hoops: { name: 'Gold Hoop Earrings', price: 12000, cat: 'fashion', shop: 'coral', icon: 'hoop' }
};
G.GIFT_ORDER = Object.keys(G.GIFTS);
G.GIFT_CATS = ['food', 'goods', 'books', 'sports', 'fashion'];
G.SHOPS = {
  riptide: { id: 'riptide', name: 'Riptide Sports', keeper: 'bo', cats: ['suits', 'acc', 'gifts'], sells: ['sports'] },
  coral: { id: 'coral', name: 'Coral Couture', keeper: 'odette', cats: ['suits', 'acc', 'gifts'], sells: ['fashion'] },
  sundries: { id: 'sundries', name: 'Sundries & Smiles', keeper: 'kai', cats: ['gifts', 'acc'], sells: ['food'] }
};
G.SHOP_QUIPS = {
  bo: ['Hydrate, champ. Then buy the good stuff.', 'Nothing beats a fresh wax job.', 'The visor says I\'m serious. The grin says I\'m fun.'],
  odette: ['Every stitch here is a promise.', 'Pink is not a color, darling. It is a mood.', 'You look like the sun decided to dress you.'],
  kai: ['Coconut\'s fresh, and so am I.', 'Try the mango. Trust me, the mango is trusting you.', 'Chips? Hot sauce? Listen to the bottle.']
};
/* the stock of each shop, by the day an item appears: every shop also has 2 daily deals at -25% (world rng) */
G.itemPrice = function (id) {
  const s = G.SUITS[id] || G.ACCESSORIES[id] || G.GIFTS[id];
  return s && s.price ? Math.round(s.price * G.T.priceMul) : 0;
};
G.itemName = function (id) { const s = G.SUITS[id] || G.ACCESSORIES[id] || G.GIFTS[id]; return s ? s.name : id; };
G.itemsForShop = function (shop, day) {
  const out = { suits: [], acc: [], gifts: [] };
  for (const id of G.SUIT_ORDER) { const s = G.SUITS[id]; if (s.shop === shop && (s.day || 1) <= day) out.suits.push(id); }
  for (const id of G.ACC_ORDER) { const a = G.ACCESSORIES[id]; if (a.shop === shop && (a.day || 1) <= day) out.acc.push(id); }
  for (const id of G.GIFT_ORDER) { const g = G.GIFTS[id]; if (g.shop === shop && (g.day || 1) <= day) out.gifts.push(id); }
  return out;
};

/* ==== 04-data-world.js ==== */
/* 04-data-world: the island's places (walkable maps, NPC spots, interactables), the map pins, the calendar, weather and
 * the schedule weights. Rows are TileMap rows: '#' a wall, '.' the floor, letters are spawn tags (see legend). */
G.PLACES = {
  beach: { id: 'beach', name: 'Sunset Courts', open: ['morning', 'afternoon'], tod: 'sunset', music: 'island', ambience: 'waves',
    pin: [0.30, 0.50], blurb: 'Two courts, a tiki bar and the Match Board.',
    rows: ['~~~~~~~~~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~~~~~~~~~', ',,,,,,,,,,,,,,,,,,,,,,,,', '................................', '..............b.........a......', '...................ccc..........', '................................', '................................', '..o.................d...........', '................................', '................................', '................................', '..p.......................q.....', '................................', '.............................r...', '................................', '................................', '................................'],
    legend: { '~': { floor: 'sea', block: true }, ',': { floor: 'wet' }, '.': { floor: 'sand' }, a: 'match_board', b: 'hut_beach', c: 'npc_court', d: 'npc_bar', o: 'npc_lounger', p: 'npc_lounger', q: 'npc_shore', r: 'npc_shore', 'x': 'hero' } },
  pool: { id: 'pool', name: 'Lagoon Pool', open: ['morning', 'afternoon'], tod: 'sunset', music: 'lagoon', ambience: 'pool', pin: [0.56, 0.28],
    blurb: 'A free-form pool, the Pool Hop deck, and palms.' },
  promenade: { id: 'promenade', name: 'Fortuna Promenade', open: ['morning', 'afternoon'], tod: 'sunset', music: 'island', ambience: 'crowd', pin: [0.70, 0.62],
    blurb: 'Three shopfronts on the boardwalk.' },
  villa: { id: 'villa', name: 'Your Villa', open: ['morning', 'afternoon', 'night'], tod: 'night', music: 'siesta', ambience: 'crickets', pin: [0.40, 0.22],
    blurb: 'Your room: a bed, a closet, a desk and a balcony.' },
  casino: { id: 'casino', name: 'Casino Fortuna', open: ['night'], tod: 'night', music: 'neon', ambience: 'casino', pin: [0.82, 0.36], blurb: 'Slots, blackjack, roulette and the cashier. Night only.' },
  dock: { id: 'dock', name: 'The Dock', open: [], tod: 'sunset', music: 'island', ambience: 'waves', pin: [0.18, 0.72], blurb: 'Departures only.', storyOnly: true }
};
G.PLACE_ORDER = ['beach', 'pool', 'promenade', 'villa', 'casino', 'dock'];
/* the places' interactables: what happens when the hero walks up to a tag */
G.INTERACT = {
  match_board: { label: 'Match Board', kind: 'board' }, hut_beach: { label: 'Changing hut', kind: 'wardrobe' },
  pool_deck: { label: 'Pool Hop', kind: 'poolhop' }, hut_pool: { label: 'Changing hut', kind: 'wardrobe' },
  shop_riptide: { label: 'Riptide Sports', kind: 'shop', shop: 'riptide' }, shop_coral: { label: 'Coral Couture', kind: 'shop', shop: 'coral' },
  shop_sundries: { label: 'Sundries & Smiles', kind: 'shop', shop: 'sundries' }, bed: { label: 'Bed', kind: 'bed' }, closet: { label: 'Closet', kind: 'wardrobe' },
  desk: { label: 'Desk', kind: 'desk' }, album_frame: { label: 'Album', kind: 'album' }, mailbox: { label: 'Mailbox', kind: 'mail' },
  cashier: { label: 'Cashier', kind: 'cashier' }, slot_1: { label: 'Slots', kind: 'slots' }, slot_2: { label: 'Slots', kind: 'slots' }, slot_3: { label: 'Slots', kind: 'slots' },
  blackjack: { label: 'Blackjack', kind: 'blackjack' }, roulette: { label: 'Roulette', kind: 'roulette' }, prize: { label: 'Prize counter', kind: 'prize' }, vip: { label: 'VIP lounge', kind: 'vip' }
};
/* the calendar and the weather table */
G.WEATHER = { 1: ['sunny'], 2: ['sunny', 'cloudy'], 3: ['cloudy', 'rain', 'clear'], 4: ['sunny'], 5: ['sunny', 'golden'] };
G.WEATHER_LABEL = { sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', clear: 'Clear', golden: 'Golden' };
/* the schedule: per NPC, weights over places in each slot (beach, pool, promenade, away) and night (casino, away) */
G.SCHED = {
  rin: { morning: [4, 2, 3, 1], afternoon: [4, 3, 2, 1], night: [3, 7] },
  lola: { morning: [5, 2, 2, 1], afternoon: [5, 2, 2, 1], night: [6, 4] },
  ingrid: { morning: [3, 4, 2, 1], afternoon: [2, 5, 2, 1], night: [2, 8] },
  amara: { morning: [3, 2, 4, 1], afternoon: [3, 3, 3, 1], night: [7, 3] },
  tess: { morning: [6, 2, 1, 1], afternoon: [5, 3, 1, 1], night: [4, 6] },
  mei: { morning: [2, 3, 4, 1], afternoon: [3, 2, 4, 1], night: [8, 2] }
};
G.SCHED_PLACES = { morning: ['beach', 'pool', 'promenade', 'away'], afternoon: ['beach', 'pool', 'promenade', 'away'], night: ['casino', 'away'] };
G.NPCS = G.FIGHTERS;
/* where each NPC stands in each place: spot tags in the maps (the spawn tags above) */
G.SPOTS = { beach: ['npc_court', 'npc_bar', 'npc_lounger', 'npc_shore'], pool: ['npc_pool', 'npc_lounger', 'npc_edge'], promenade: ['npc_bench', 'npc_window', 'npc_cart'], villa: ['npc_visitor'], casino: ['npc_slots', 'npc_roulette', 'npc_bar'] };
G.MOOD_SHIFT = { rain: -1, cloudy: 0, sunny: 0, clear: 0, golden: 0 };
/* the letters rolled for the day's rain: rain multiplies the beach, the pool and the outside places */
G.rainMul = { beach: .2, pool: .5, promenade: 1.5, away: 1.5 };
/* the day's events: story triggers by day and slot (story data lives in 34-story.js) */
G.DAY_START_WEATHER = function (day, rng) {
  const list = G.WEATHER[day] || ['sunny'];
  return list[Math.floor(rng() * list.length) % list.length];
};
G.slotName = function (i) { return G.SLOTS[i]; };
/* the walkable maps of the other places: '#' walls (type 1), '~' pool water (blocks), ',' deck, '.' floor; letters are
 * spawn tags (interactables and NPC spots) */
G.PLACES.pool.rows = ['########################', '#,,,,,,,,,,,,,,,,,,,,,,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,~~~~~~~~~~~~~~~~~~~~,#', '#,,,,,,,,,,,,,,,,,,,,,,#', '#,,,,,,,,,,,,,,,,,,,,,,#', '#,,,,,,,,,,,,,,,,,,,,,,#', '########################'];
G.PLACES.pool.legend = { '#': 1, '~': { floor: 'pool', block: true }, ',': { floor: 'deck' }, a: 'pool_deck', b: 'hut_pool', c: 'npc_edge', d: 'npc_lounger', e: 'npc_lounger', f: 'npc_pool' };
G.PLACES.pool.rows = G.PLACES.pool.rows.map((s, r) => (r === 1 ? '#,a,,,,,,,,,,,,,,,,,,,,,#' : r === 8 ? '#,,,c,,,,,,,,,,,,,,,,d,,,,#' : r === 9 ? '#,,,,e,,,,,,,,,,,,,,,,f,,#' : s));
G.PLACES.promenade.rows = ['##########################################', '#.....#.....#......#.....#....#....#####', '#.........................................#', '#.........................................#', '#..a.....b.........c............d.........#', '#.........................................#', '#..........e......f.....................g..#', '##########################################'];
G.PLACES.promenade.legend = { '#': 1, '.': { floor: 'boardwalk' }, a: 'shop_riptide', b: 'shop_coral', c: 'shop_sundries', d: 'npc_bench', e: 'npc_window', f: 'npc_window', g: 'npc_cart' };
G.PLACES.villa.rows = ['##############', '#............#', '#..a.........#', '#............#', '#.bcdefg.....#', '#............#', '#............#', '#....h.......#', '#............#', '##############'];
G.PLACES.villa.legend = { '#': 1, '.': { floor: 'tile' }, a: 'closet', b: 'bed', c: 'desk', d: 'album_frame', e: 'mailbox', f: 'npc_visitor', g: 'npc_visitor', h: 'hero_entry' };
G.PLACES.casino.rows = ['##############################', '#............................#', '#.a....b....c.....d.....e...f#', '#............................#', '#..g.g.g.....h....i......j...#', '#............................#', '#...k....l.....m.....n...o...#', '#............................#', '#............................#', '##############################'];
G.PLACES.casino.legend = { '#': 1, '.': { floor: 'carpet' }, a: 'cashier', b: 'slot_1', c: 'slot_2', d: 'slot_3', e: 'blackjack', f: 'roulette', g: 'npc_slots', h: 'npc_bar', i: 'npc_roulette', j: 'prize', k: 'npc_slots', l: 'npc_roulette', m: 'npc_bar', n: 'vip', o: 'npc_slots' };
G.PLACES.beach.entry = [3, 9];
G.PLACES.pool.entry = [2, 10];
G.PLACES.promenade.entry = [8, 6];
G.PLACES.villa.entry = [6, 7];
G.PLACES.casino.entry = [14, 9];

/* ==== 05-data-text.js ==== */
/* 05-data-text: dialogue and commentary. Lines are short (two lines of about 36 characters a page). Sonny speaks in
 * ALL-CAPS bursts; Pepper is dry and never uses an exclamation mark. No innuendo. */
G.LINES = {
  rin: {
    greet: ['Good morning. The sand is... adequate.', 'Hm. You again. Good.', 'Our friendship is a sport I intend to win.'],
    chat0: ['I practice my swing at dawn. The sea doesn\'t judge.', 'Do you know the kata for a sunset? I\'m making one up.'],
    chat1: ['Your serve is improving. Do not let it go to your head.', 'I dislike the heat. I dislike the cold more.'],
    chat2: ['You are the only one who remembers to bring water. Thank you.', 'Let\'s walk the shore tomorrow. Just us.'],
    love: ['...It\'s so round. I will name him Admiral.', 'Oh. Oh, this is perfect. Thank you.'],
    like: ['That is good. I approve.', 'Thoughtful. I will use it wisely.'],
    neutral: ['Thank you. I will remember this.'],
    refuse: ['My heart rate is fine as it is. Thank you.', 'Not for me. But the thought was... adequate.'],
    suitOK: ['A good cut. Clean lines. I like it.'], suitNo: ['Not really my style, I\'m afraid.'],
    inviteOK: ['Partners. Very well. Don\'t be late to practice.'], inviteNo: ['I\'d like to know you better first.'],
    leave: ['I\'ll spare you a loss. Take care.'], taunt: ['Watch the line. I won\'t say it twice.', 'I am not nervous. I am focused.'],
    win: ['Good. Good. Again tomorrow.'], lose: ['I will reflect on this. Deeply.'],
    bark: ['Mine!', 'Yours!', 'Good hit.'], visit: ['Hi. I brought tea. Don\'t say anything about the tea.'],
    farewell: ['You were a good partner. Stay sharp.', 'I\'ll remember the sunsets. I never say that.'],
    end: ['The blade is put away. For now.']
  },
  lola: {
    greet: ['¡Hola, compañera! Ready to bring the THUNDER?', 'Ay, look who it is! The champ!', 'We are going to ROCK this island, sí?'],
    chat0: ['You know what I need? A crowd. And a dance.', 'Trash talk? I have a whole speech. Want to hear it?'],
    chat1: ['My knees ache, but my heart is loud. Ha!', 'Lucha is story. Volleyball is the drama, no?'],
    chat2: ['You and me, we are a tag team, no lie.', 'If you ever need a hype man, I am available.'],
    love: ['THIS! This is the fuel of champions!', '¡Ay, qué rico! You know my heart!'],
    like: ['Oh, that\'s fun! I like this one!', 'Ha! You remembered! Gracias!'],
    neutral: ['Oh. Um, gracias? Good looking out!'],
    refuse: ['A book? On vacation? Ay, you\'re funny.', 'Nah, not my thing, amiga.'],
    suitOK: ['¡Bonita! The crowd will love this!'], suitNo: ['Mm. Not my vibe, sorry, chica.'],
    inviteOK: ['¡Sí! Partners! Let\'s go, let\'s GO!'], inviteNo: ['Not yet, amiga. Prove it first.'],
    leave: ['I need someone with more... ¡fuego! Adiós.'], taunt: ['You\'re going down, papi!', 'Watch me fly!'],
    win: ['¡VICTORIA! Somebody ring the bell!'], lose: ['¡Ay, no! Next time, the thunder comes!'],
    bark: ['MINE!', 'YOURS!', '¡Vamos!'], visit: ['Hey! I brought chips. Have one. Have two.'],
    farewell: ['You\'re the best, you know that? ¡Te quiero!', 'This crowd won\'t forget us.'], end: ['¡Viva la fiesta!']
  },
  ingrid: {
    greet: ['It is thirty-one degrees. I am melting. Hello.', 'Hm. Sun. Good. I suppose.', 'Good afternoon. Please do not hug me. It is too warm.'],
    chat0: ['In Norway it is snowing right now. Probably.', 'I am told this is paradise. I am checking.'],
    chat1: ['I can throw a ball 40 meters. I cannot tolerate sand.', 'Tomorrow I will find a cloud. I will sit under it.'],
    chat2: ['You are less loud than most people. I appreciate that.', 'I may have a karaoke song for you. Do not laugh.'],
    love: ['Snow. Tiny, perfect snow. I may cry.', 'You remembered. I am... moved. Please do not tell anyone.'],
    like: ['That is nice. Thank you. Good.', 'A good choice. I will keep it cool.'],
    neutral: ['Thank you. It is warm, so I will drink it.'],
    refuse: ['Glitter gets everywhere. Everywhere.', 'No. Thank you. No.'],
    suitOK: ['Good. Cool and tight. Yes.'], suitNo: ['No. This will make me sweat to death.'],
    inviteOK: ['I prefer to know someone first. But fine. Partners.', 'Yes. I will trust you with my spikes.'],
    inviteNo: ['I prefer to know someone before I trust them with my spikes.'],
    leave: ['Hm. You are not a good fit for my wall. Goodbye.'], taunt: ['It is cold in my head. Winning is easy.'],
    win: ['Good. Cold. Clean. Good.'], lose: ['Hm. It was warm today. I was distracted.'],
    bark: ['MINE!', 'YOURS!', 'Here.'], visit: ['I brought you a cold drink. Do not argue.'],
    farewell: ['You are not so bad. For a sun person.', 'Goodbye. I will miss the silence with you.'], end: ['I will go and find a glacier.']
  },
  amara: {
    greet: ['Hey hey! You hear that? The ocean\'s got rhythm!', 'Okay, the party starts now! Look who is here!', 'Girl, you are looking CLASSY today.'],
    chat0: ['Let me teach you a step. Don\'t look at your feet!', 'I\'m doing a dance battle with a seagull. He\'s winning.'],
    chat1: ['Music, fashion, sun. My three favorite things.', 'You should try the speaker. I\'ll lend it to you.'],
    chat2: ['You\'re my favorite person on this island. Don\'t tell the others.', 'We should film a dance. For the postcard.'],
    love: ['Okay. The party starts NOW.', 'You get me! Oh, I love you a little!'],
    like: ['Yesss! That\'s so cute!', 'Ooh, I\'m keeping this one.'],
    neutral: ['Thanks, babe! I\'ll find a use for it.'],
    refuse: ['Snow? Babe, we\'re in paradise.', 'Uh... not quite, thanks.'],
    suitOK: ['OH. Look at you! That\'s fire!'], suitNo: ['Love the thought, but I\'d never wear this.'],
    inviteOK: ['Let\'s GO! Partners! I\'ll make you dance between points!'], inviteNo: ['Ooh, not yet. You need more rhythm.'],
    leave: ['No, no. I need a partner who can keep up. Bye!'], taunt: ['Look at my moves, honey!', 'You\'re about to see a show.'],
    win: ['Yes! Dance break!'], lose: ['Okay, rough one. I\'m still dancing, though.'],
    bark: ['MINE!', 'YOURS!', 'Yeah!'], visit: ['Hi! I brought music. Shh, it\'s a surprise.'],
    farewell: ['You\'re the best dancer I know, babe.', 'Keep the rhythm going, okay?'], end: ['Let the music play on!']
  },
  tess: {
    greet: ['G\'day! Waves are pumping, sun\'s out. Life\'s good, yeah?', 'Oi! My favorite new mate!', 'Hey! Ready to get wet?'],
    chat0: ['Morning surf was unreal. Got barrelled twice.', 'I can\'t stop smiling, sorry. It\'s the sun.'],
    chat1: ['Mate, the trick is to not fight the ocean.', 'Ever tried a wave? Want to?'],
    chat2: ['You\'re alright, you know that? Proper mate.', 'Let\'s surf tomorrow. I\'ll teach you to stand up.'],
    love: ['Ohhh, the good stuff! My board says thanks.', 'Yeah, mate! That\'s proper! Shaka!'],
    like: ['Nice one! Cheers, mate!', 'Yeah! That\'s a good one.'],
    neutral: ['Cheers. Good on ya.'],
    refuse: ['Mate, I can barely write my own name.', 'Nah. Not my scene, but cheers for trying.'],
    suitOK: ['Oh yeah, that\'s a proper look!'], suitNo: ['Eh, that\'s not really me, mate.'],
    inviteOK: ['Partners? Too right!', 'Yeah! Let\'s go and smash someone!'], inviteNo: ['Maybe after a few more sessions, mate.'],
    leave: ['Sorry mate, I\'m going solo for a bit.'], taunt: ['Watch the wave, not the ball!', 'Easy as a sunrise.'],
    win: ['Yeah! Shaka, team!'], lose: ['Ah well. Waves come back, yeah?'],
    bark: ['MINE!', 'YOURS!', 'Ta!'], visit: ['Brought some coconut. Fresh from the palm.'],
    farewell: ['You\'re alright, mate. Keep surfing.', 'Catch you on the next swell.'], end: ['Hang loose, mate.']
  },
  mei: {
    greet: ['Hehe. Bet you can\'t beat me at anything today.', 'Oh? Hi! Ready to lose?', 'Hello, friend! Want a sweet?'],
    chat0: ['I did a backflip off the lifeguard tower. Nobody saw. Shh.', 'Xiangqi is more fun than volleyball. Don\'t tell anyone.'],
    chat1: ['Want to see my twin buns do a trick? Watch!', 'My mom says I can\'t be serious. She is right.'],
    chat2: ['You\'re my favorite rival. I\'ll let you win one. Maybe.', 'Let\'s prank Sonny tomorrow!'],
    love: ['Solved it. Twice. Got another?', 'Ooh! Wow! You are my favorite now!'],
    like: ['Hehe, that\'s a good one.', 'Sweet! I like this one a lot.'],
    neutral: ['Thanks! I\'ll think about it.'],
    refuse: ['I don\'t eat things on sticks that used to have faces.', 'Ugh, no. That\'s gross.'],
    suitOK: ['Cute! Matches my buns!'], suitNo: ['Hm. I\'m not a stripes person, sorry.'],
    inviteOK: ['Partners! I\'ll show you my best trick!', 'Okay! Don\'t be slow!'], inviteNo: ['Maybe. Beat me once and we\'ll see.'],
    leave: ['Bye! I\'ll go prank someone else.'], taunt: ['You can\'t beat the Little Phoenix!', 'Ha, you\'re so slow!'],
    win: ['Hehe! Told you!'], lose: ['No fair! Rematch!'],
    bark: ['MINE!', 'YOURS!', 'Hehe!'], visit: ['Brought you a mochi. Don\'t tell anyone.'],
    farewell: ['You\'re the best rival ever!', 'I\'ll miss your slow reactions.'], end: ['Hehe. See you next summer.']
  },
  sonny: {
    arrival: ['WELCOME, FIGHTERS, TO ISLA FORTUNA! The tournament of the century is... drumroll... BEACH VOLLEYBALL!', 'And a VACATION! You\'re welcome!'],
    pepper: ['Villa keys. Sunscreen is in the minibar. The Cup is in five days. Mr. Fortuna is not taking questions.', 'Please don\'t feed him.'],
    commentary: {
      spike: ['WHAT A SPIKE! Somebody call a lifeguard!', 'That one had TAXES on it!', 'Long rally, folks. I\'m getting a tan just WATCHING.'],
      ace: ['ACE! That serve had TAXES on it!', 'NOBODY TOUCHED IT! Not even the sand!'],
      block: ['BLOCKED! The wall is CLOSED for business!', 'STUFFED! That was a DEMOLITION!'],
      matchpoint: ['MATCH POINT! I can\'t look! ...I\'m looking.', 'It\'s all on the line, CHAMP!'],
      net: ['NET! Somebody check that net for loose change!'],
      out: ['OUT! That ball is on a VACATION!'],
      fault: ['FAULT! The ball didn\'t sign the contract!']
    }
  },
  pepper: {
    tips: ['The ring shows where the ball comes down. Stand in it. Press {play} as the ball reaches you.', 'Your partner passed it to you. {play} again as it drops, to set her up.', 'She set you. You\'ll jump on your own. {play} at the top. Push the stick, or point the mouse, to aim.', '{play} to toss, {play} again at the top of the toss. {shot} tosses for a jump serve.', 'When they spike near the net, {shot} to block.', 'Out of reach? {dive} dives.', '{call} calls "Mine!" or "Yours!". Your partner listens.', 'The better you two get along, the better she plays. Chat. Bring gifts. Win.'],
    tutorialWin: ['Statistically, that was unwise.'], chance: ['The house has noticed.'],
    letterWelcome: 'Welcome to Isla Fortuna. The rules are on the back of this card. Please read them twice.',
    letterFinal: 'The Final is tomorrow. Mr. Fortuna\'s serve is... dazzling. Eyewear is advised. — P.',
    letterWarn: 'A reminder: the house always keeps a list. Please keep your sunscreen on. — P.',
    letterFlyer: 'FREE CHIPS FOR CHAMPIONS! Ask at the casino. — S.F.',
    letterPoster: 'FINAL HYPE! The House vs. You! Front row seats are on the sand! — S.F.'
  }
};
/* the line for a fighter's reaction, by stage and kind; falls back to the kind's line */
G.lineFor = function (npc, kind, stage) {
  const L = G.LINES[npc] || {};
  if (kind === 'chat') { const list = L[stage >= 2 ? 'chat2' : stage >= 1 ? 'chat1' : 'chat0'] || L.chat0 || ['...']; return list[Math.floor(G.rng('cosmetic') * list.length)]; }
  const list = L[kind] || ['...'];
  return list[Math.floor(G.rng('cosmetic') * list.length) % list.length];
};
G.callLine = function (key) { const L = G.LINES.sonny.commentary[key] || ['']; return L[Math.floor(G.rng('cosmetic') * L.length) % L.length]; };

/* ==== 06-data-music.js ==== */
/* 06-data-music: the songs, written in the engine's step notation (bpm, steps, tracks of notes, drums k s h o c t).
 * Every song is an object made in code; none is a file. Each loops over its bars. */
G.SONGS = {
  sunrise: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .16, notes: 'C5 - E5 - G5 - E5 - A5 - G5 - E5 - C5 - F5 - A5 - C6 - A5 - G5 - E5 - D5 - C5' },
    { wave: 'square', vol: .06, notes: 'C3 . . . G2 . . . A2 . . . F2 . . . ' },
    { wave: 'drums', vol: .2, notes: 'k . h . s . h . k . h . s . h .' }] },
  island: { bpm: 100, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'F5 . A5 . C6 . A5 . Bb5 . G5 . F5 . D5 .' },
    { wave: 'sine', vol: .12, notes: 'F3 - - - Bb2 - - - C3 - - - F3 - - -' },
    { wave: 'drums', vol: .14, notes: 'k . . h . . s . k . . h . s .' }] },
  spike: { bpm: 138, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'A4 A4 C5 A4 E5 D5 C5 A4 A4 C5 D5 E5 A5 G5 E5 D5' },
    { wave: 'saw', vol: .08, notes: 'A2 A2 A2 A2 F2 F2 F2 F2 C3 C3 C3 C3 G2 G2 G2 G2' },
    { wave: 'drums', vol: .22, notes: 'k . h h s . h h k . h h s h h h' }] },
  house: { bpm: 150, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'D5 . F5 . A5 . G5 . Bb5 . A5 . G5 . F5 .' },
    { wave: 'saw', vol: .07, notes: 'D3 D3 D3 D3 Bb2 Bb2 Bb2 Bb2 C3 C3 C3 C3 A2 A2 A2 A2' },
    { wave: 'drums', vol: .22, notes: 'k k s k k s s s k k s k k s s s' }] },
  lagoon: { bpm: 112, steps: 4, tracks: [
    { wave: 'triangle', vol: .13, notes: 'G4 - B4 - D5 - B4 - E5 - D5 - B4 - G4 -' },
    { wave: 'sine', vol: .1, notes: 'G3 . D3 . Em3 . B2 . A2 . E3 . A2 .' },
    { wave: 'drums', vol: .08, notes: 'c . c . c . c . c . c . c . c .' }] },
  neon: { bpm: 96, steps: 4, tracks: [
    { wave: 'square', vol: .08, notes: 'E4 - G4 B4 - E5 - D5 - B4 G4 -' },
    { wave: 'sine', vol: .1, notes: 'E3 - - - A2 - - - E3 - - - B2 - - -' },
    { wave: 'drums', vol: .14, notes: 'k . h . s . h . k . h . s . h h' }] },
  siesta: { bpm: 80, steps: 4, tracks: [
    { wave: 'sine', vol: .14, notes: 'D4 - F4 - A4 - F4 - B4 - A4 - F4 - D4 -' },
    { wave: 'triangle', vol: .08, notes: 'D3 - - - G2 - - - A2 - - - D3 - - -' }] },
  farewell: { bpm: 124, steps: 4, tracks: [
    { wave: 'square', vol: .09, notes: 'C5 E5 G5 C6 B5 G5 E5 C5 F5 A5 C6 F6 E6 C6 A5 F5' },
    { wave: 'square', vol: .05, notes: 'E4 E4 G4 G4 A4 A4 F4 F4 C4 C4 E4 E4 G4 G4 F4 F4' },
    { wave: 'drums', vol: .24, notes: 'k . h . k . h . s . h . k . s h h' }] },
  boutique: { bpm: 108, steps: 4, tracks: [
    { wave: 'sine', vol: .12, notes: 'Bb4 - D5 - F5 - D5 - C5 - Bb4 - G4 - Bb4 -' },
    { wave: 'saw', vol: .06, notes: 'Bb2 Bb2 Bb2 Bb2 Gm2 Gm2 Gm2 Gm2 Eb2 Eb2 Eb2 Eb2 F2 F2 F2 F2' },
    { wave: 'drums', vol: .12, notes: 'k . h . s . h . k . h . s . h h' }] },
  title: { bpm: 104, steps: 4, tracks: [
    { wave: 'triangle', vol: .14, notes: 'C5 - G5 - E5 - G5 - F5 - A5 - G5 - C6 -' },
    { wave: 'sine', vol: .1, notes: 'C3 - - - G2 - - - A2 - - - F2 - - -' }] }
};
/* the song for each place or mode */
G.songFor = function (key) { return G.SONGS[key] || G.SONGS.sunrise; };

/* ==== 10-input.js ==== */
/* 10-input: action maps per context, device-aware prompts (PlayStation, Xbox, keycaps, mouse), the touch-only gate. */
const E_ = () => E;
G.menuKeys = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'],
  confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0', 'Mouse0'], cancel: ['Backspace', 'Escape', 'Pad1', 'Mouse2'],
  alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5']
};
/* the match layout: the engine's split keyboard gives P1 F G H R and P2 . / , L from this order */
G.matchKeys = Object.assign({}, G.menuKeys, {
  play: ['Space', 'KeyJ', 'Mouse0', 'Pad0'], dive: ['ShiftLeft', 'KeyL', 'Pad1'], shot: ['KeyE', 'KeyK', 'Mouse2', 'Pad2'],
  call: ['KeyQ', 'KeyI', 'Mouse1', 'Pad3'], view: ['KeyV', 'Pad11'], snap: ['KeyC', 'Pad8'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.exploreKeys = Object.assign({}, G.menuKeys, {
  interact: ['KeyE', 'Space', 'Enter', 'Mouse0', 'Pad0'], run: ['ShiftLeft', 'Pad1', 'Pad7'], bag: ['KeyG', 'Pad2'], leave: ['KeyM', 'Tab', 'Pad3'],
  snap: ['KeyC', 'Pad8'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0', 'Mouse0'], cancel: ['Backspace', 'Pad1', 'Mouse2'], start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.poolKeys = Object.assign({}, G.menuKeys, {
  hopA: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], hopB: ['KeyL', 'ShiftLeft', 'Pad1'], hopX: ['KeyK', 'KeyE', 'Mouse2', 'Pad2'], hopY: ['KeyI', 'KeyQ', 'Pad3'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.casinoKeys = Object.assign({}, G.menuKeys, {
  play: ['Space', 'Pad0'], dive: ['Pad1'], shot: ['Pad2'], call: ['Pad3'],
  hit: ['KeyH', 'Pad0'], stand: ['KeyS', 'Pad2'], double: ['KeyD', 'Pad3'], split: ['KeyP', 'Pad5'], bet: ['KeyJ', 'Pad0'], reel1: ['KeyJ'], reel2: ['KeyK'], reel3: ['KeyL'],
  spin: ['Space', 'Pad0'], chipS: ['Pad5'], chipM: ['Pad4'], remove: ['Pad2'], place: ['Mouse0'], leave: ['Pad1', 'Mouse2'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
G.photoKeys = Object.assign({}, G.menuKeys, {
  shoot: ['Pad0', 'Space', 'Enter'], exit: ['Pad1', 'Escape'], subject: ['Pad2', 'KeyF'], panel: ['Pad3', 'KeyR'], hideUi: ['Pad10', 'KeyH'],
  zoomIn: ['Pad7'], zoomOut: ['Pad6'], start: ['Enter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9']
});
/* what a pad's button index is called in each family, and its keyboard names */
G.PAD_SYMBOL = { ps: ['✕', '○', '□', '△'], xbox: ['A', 'B', 'X', 'Y'] };
G.PAD_PILL = { 4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2', 8: 'CREATE', 9: 'OPTIONS', 10: 'L3', 11: 'R3', 12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT' };
G.PAD_PILL_XBOX = { 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'VIEW', 9: 'MENU', 10: 'LS', 11: 'RS' };
G.PAD_COLOR = { ps: ['#8fb8ff', '#ff7a7a', '#f59ad8', '#5fe0b4'], xbox: ['#6ad66a', '#ff5a5a', '#4aa8ff', '#ffd23a'] };
G.KEY_NAME = { Space: 'SPACE', Enter: 'ENTER', ShiftLeft: 'SHIFT', ShiftRight: 'SHIFT', ControlLeft: 'CTRL', Escape: 'ESC', Backspace: 'BKSP', Tab: 'TAB',
  Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Period: '.', Slash: '/', Comma: ',', NumpadEnter: 'ENTER' };
G.keyName = function (code) {
  if (G.KEY_NAME[code]) return G.KEY_NAME[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  return String(code).toUpperCase();
};
/* the device prompts follow: the last one used (per player input). 'ps' | 'xbox' | 'kbm' */
G.padStyle = function () { return G.game.input.glyphs === 'xbox' ? 'xbox' : 'ps'; };
G.devOf = function (input) {
  input = input || G.game.input;
  return input.lastDevice === 'gamepad' ? G.padStyle() : 'kbm';
};
/* the first bound code of an action that matches the kind asked for */
G.boundCode = function (input, action, kind) {
  const codes = (input.map && input.map[action]) || [];
  for (const c of codes) {
    if (c.startsWith('Act:') || c.startsWith('PadAxis')) continue;
    if (kind === 'pad' && c.startsWith('Pad')) return c;
    if (kind === 'kbm' && !c.startsWith('Pad')) return c;
  }
  return null;
};
G.padIndex = function (code) { return +String(code).replace('Pad', ''); };
/* draw one prompt (a glyph and text) inside an overlay; returns its width in screen pixels */
G.prompt = function (r, action, x, y, text, o) {
  o = o || {};
  const input = o.input || G.game.input, dev = o.dev || G.devOf(input), scale = o.scale || 1, color = o.color || '#fff8e8';
  const size = 9 * scale;
  let w = 0, tw = 0;
  const run = (gg) => {
    let code = dev === 'kbm' ? G.boundCode(input, action, 'kbm') : G.boundCode(input, action, 'pad');
    if (!code) code = G.boundCode(input, action, dev === 'kbm' ? 'pad' : 'kbm');
    if (dev === 'kbm') {
      const label = G.keyName(code || '?');
      w = Math.max(size + 2, E.font.width(label, { scale: 1 }) + 6);
      E.px.rect(gg, x, y - 2, w, 10, '#c8c0a8'); E.px.rect(gg, x + 1, y - 1, w - 2, 8, '#2a2a3a');
      E.font.text(gg, label, x + Math.round((w - E.font.width(label, { scale: 1 })) / 2), y - 1, '#fff8e8', { shadow: null });
    } else {
      const k = G.padIndex(code || 'Pad0');
      if (k <= 3) {
        const col = G.PAD_COLOR[dev][k], cy = y + size / 2 - 2;
        E.px.disc(gg, x + size / 2, cy, size / 2, '#1a1a26');
        E.px.disc(gg, x + size / 2, cy, size / 2 - 1, col);
        if (dev === 'xbox') E.font.text(gg, G.PAD_SYMBOL.xbox[k], x + size / 2, cy - 3, '#1a1a26', { align: 'center' });
        else G.drawPsSymbol(gg, k, x + size / 2, cy, scale);
        w = size + 2;
      } else {
        const pill = dev === 'xbox' ? (G.PAD_PILL_XBOX[k] || G.PAD_PILL[k] || 'PAD' + k) : (G.PAD_PILL[k] || 'PAD' + k);
        w = E.font.width(pill, { scale: 1 }) + 6;
        E.px.rect(gg, x, y - 2, w, 10, '#2a2a3a'); E.font.text(gg, pill, x + w / 2, y - 1, '#f4f4f8', { align: 'center' });
      }
    }
    if (text) { tw = E.font.width(text, { scale: 1 }) * (scale > 1 ? 1 : 1); E.font.text(gg, text, x + w + 3 * scale, y - 1, color, { shadow: '#000' }); }
  };
  if (r.overlay) r.overlay(run);
  return w + (text ? 3 * scale + E.font.width(text, { scale: 1 }) : 0);
};
G.drawPsSymbol = function (g, k, cx, cy, scale) {
  const c = '#14141e', s = 3;
  if (k === 0) { E.px.line(g, cx - s, cy - s, cx + s, cy + s, c, 1); E.px.line(g, cx + s, cy - s, cx - s, cy + s, c, 1); }
  else if (k === 1) { E.px.disc(g, cx, cy, s, c); E.px.disc(g, cx, cy, s - 2, G.PAD_COLOR.ps[1]); }
  else if (k === 2) { E.px.rect(g, cx - s, cy - s, 2 * s, 1, c); E.px.rect(g, cx - s, cy + s, 2 * s, 1, c); E.px.rect(g, cx - s, cy - s, 1, 2 * s, c); E.px.rect(g, cx + s, cy - s, 1, 2 * s, c); }
  else { E.px.line(g, cx - s, cy + s - 1, cx, cy - s, c, 1); E.px.line(g, cx, cy - s, cx + s, cy + s - 1, c, 1); E.px.line(g, cx - s, cy + s - 1, cx + s, cy + s - 1, c, 1); }
};
/* the touch-only gate: a tap-only device with no key or pad yet */
G.sawKeyOrPad = false;
G.touchOnly = function () {
  if (G.sawKeyOrPad) return false;
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
};
G.noteDevice = function () {
  const I = G.game && G.game.input;
  if (I && I.lastDevice !== 'touch' && I.lastDevice) G.sawKeyOrPad = G.sawKeyOrPad || I.lastDevice === 'keyboard' || I.lastDevice === 'gamepad' || I.lastDevice === 'mouse';
};
/* a bottom prompt bar: [[action, text], ...] */
G.promptBar = function (r, items, o) {
  o = o || {};
  const y = r.H - 16, scale = 1;
  const parts = items.filter(Boolean).map(([a, t]) => ({ a, t, w: 0 }));
  let total = 0;
  for (const p of parts) { p.w = G.promptWidth(p.a, p.t, o); total += p.w + 14; }
  let x = Math.round(r.W / 2 - total / 2 + 7);
  r.overlay(g => { E.ui.box(g, 0, y - 6, r.W, 18, { bg: ['#0a0a14', '#14142a'], border: null, alpha: .72, gradient: true }); });
  for (const p of parts) { G.prompt(r, p.a, x, y, p.t, o); x += p.w + 14; }
};
G.promptWidth = function (action, text, o) {
  const input = (o && o.input) || G.game.input, dev = (o && o.dev) || G.devOf(input), size = 9;
  let gw;
  if (dev === 'kbm') {
    const code = G.boundCode(input, action, 'kbm') || G.boundCode(input, action, 'pad');
    gw = Math.max(size + 2, E.font.width(G.keyName(code || '?'), { scale: 1 }) + 6);
  } else gw = size + 2;
  if (dev !== 'kbm') { const code = G.boundCode(input, action, 'pad'); const k = code ? G.padIndex(code) : 0; if (k > 3) gw = E.font.width(dev === 'xbox' ? (G.PAD_PILL_XBOX[k] || G.PAD_PILL[k] || 'PAD' + k) : (G.PAD_PILL[k] || 'PAD' + k), { scale: 1 }) + 6; }
  return gw + (text ? 3 + E.font.width(text, { scale: 1 }) : 0);
};
/* the input gather: call once per update, after G.noteDevice */
G.sawAny = function () { return G.game.input.lastDevice !== 'touch'; };

/* ==== 11-ui.js ==== */
/* 11-ui: the 10-foot canvas UI kit. Focus moves by d-pad, stick, keys or hover; confirm activates; cancel goes back.
 * Widgets lay out from r.W and r.H each draw and keep their hit rectangles for the next update. */
G.ui = {
  theme: { bg: ['#0f4c5c', '#0a2d3d'], night: { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', accent: '#5ff0ff' },
    border: '#f6d38a', ink: '#fff8e8', muted: '#9fd3d6', accent: '#ff9e5e', danger: '#ff7a7a' },
  safe(r) { return { x: Math.round(r.W * .05), y: Math.round(r.H * .05), w: Math.round(r.W * .9), h: Math.round(r.H * .9) }; },
  box(g, x, y, w, h, o) { o = o || {}; const T = G.ui.theme; E.ui.box(g, x, y, w, h, { bg: o.bg || T.bg, border: o.border === undefined ? T.border : o.border, gradient: o.gradient !== false, alpha: o.alpha || 1 }); },
  /* the focus frame: 2 px gold, 1 px white inside, with a soft pulse */
  focus(g, x, y, w, h, t) {
    const pulse = .5 + .5 * Math.sin((t || 0) * 6);
    E.px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); E.px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a');
    E.px.rect(g, x - 2, y - 2, 2, h + 4, '#ffd36a'); E.px.rect(g, x + w, y - 2, 2, h + 4, '#ffd36a');
    E.px.rect(g, x, y, w, 1, '#fff8e8'); E.px.rect(g, x, y + h - 1, w, 1, '#fff8e8');
    E.px.rect(g, x, y, 1, h, '#fff8e8'); E.px.rect(g, x + w - 1, y, 1, h, '#fff8e8');
    if (E.px.blend) E.px.blend(g, .25 + .15 * pulse, 'add', () => E.px.rect(g, x - 3, y - 3, w + 6, h + 6, '#ffd36a'));
  },
  hit(rects, I) {
    const p = I.clicked && I.clicked();
    if (!p) return -1;
    for (let i = 0; i < rects.length; i++) { const q = rects[i]; if (q && p[0] >= q.x && p[1] >= q.y && p[0] < q.x + q.w && p[1] < q.y + q.h) return i; }
    return -2;
  }
};
/* a vertical list. items: { label, sub, value, disabled, onPick, icon(g,x,y), color } */
G.List = class {
  constructor(o) { this.items = o.items || []; this.x = o.x; this.y = o.y; this.w = o.w || 200; this.rowH = o.rowH || 26; this.i = o.i || 0; this.max = o.max || 8; this.top = 0; this.align = o.align || 'left'; this.rects = []; this.t = 0; this.wrap = o.wrap !== false; this.onFocus = o.onFocus; this.scale = o.scale || 2; }
  setItems(items) { this.items = items; this.i = Math.min(this.i, Math.max(0, items.length - 1)); }
  update(I, dt) {
    this.t += dt;
    const n = this.items.length;
    if (!n) return null;
    let moved = false;
    if (I.repeat('up', .35, .09)) { this.i = this.wrap ? (this.i - 1 + n) % n : Math.max(0, this.i - 1); moved = true; }
    if (I.repeat('down', .35, .09)) { this.i = this.wrap ? (this.i + 1) % n : Math.min(n - 1, this.i + 1); moved = true; }
    if (I.pressed('confirm') && this.rects[this.i] && !this.items[this.i].disabled) {
      I.consume && I.consume('confirm'); const it = this.items[this.i]; if (it.onPick) it.onPick(it, this.i); return { item: it, i: this.i };
    }
    const hi = G.ui.hit(this.rects, I);
    if (hi >= 0 && !this.items[hi].disabled) { this.i = hi; const it = this.items[hi]; if (it.onPick) it.onPick(it, hi); return { item: it, i: hi }; }
    if (hi === -1 && I.mouse && I.mouse.active && this.rects.length) {
      const p = I.pointer(); for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && p[0] >= q.x && p[1] >= q.y && p[0] < q.x + q.w && p[1] < q.y + q.h && k !== this.i) { this.i = k; moved = true; } }
    }
    if (moved && this.onFocus) this.onFocus(this.items[this.i], this.i);
    this.ensure(); return null;
  }
  ensure() { if (this.i < this.top) this.top = this.i; if (this.i >= this.top + this.max) this.top = this.i - this.max + 1; }
  draw(r, o) {
    o = o || {};
    if (this.fit !== false) this.max = Math.max(3, Math.min(this.maxAll || this.max, Math.floor((r.H - this.y - 30) / this.rowH)));
    if (this.maxAll === undefined) this.maxAll = this.max;
    this.rects = []; this.ensure();
    const vis = Math.min(this.max, this.items.length - this.top);
    r.overlay(g => {
      for (let k = 0; k < vis; k++) {
        const idx = this.top + k, it = this.items[idx], y = this.y + k * this.rowH, x = this.x, w = this.w, h = this.rowH - 4;
        this.rects[idx] = { x, y, w, h: this.rowH - 2 };
        const focused = idx === this.i && !o.noFocus;
        if (focused) { E.ui.box(g, x - 4, y - 3, w + 8, this.rowH - 2, { bg: ['#ffe9a6', '#f0b04a'], border: '#fff8e8', gradient: true, alpha: .9 }); }
        else E.ui.box(g, x - 4, y - 3, w + 8, this.rowH - 2, { bg: ['#0c3a4a', '#082833'], border: null, gradient: true, alpha: .75 });
        const ink = it.disabled ? '#6f8c92' : focused ? '#1a1a24' : (it.color || G.ui.theme.ink);
        if (it.icon) it.icon(g, x + 2, y + 4, focused);
        const lx = x + (it.icon ? 16 : 4);
        E.font.text(g, it.label, lx, y + 3, ink, { scale: this.scale, shadow: focused ? null : '#000' });
        if (it.value !== undefined && it.value !== null) {
          const vs = String(it.value); E.font.text(g, vs, x + w - 4, y + 3, focused ? '#1a1a24' : G.ui.theme.accent, { scale: this.scale, align: 'right', shadow: focused ? null : '#000' });
        }
        if (it.sub && focused && o.subLine) o.subLine(it, y);
      }
      if (this.items.length > this.max) {
        const bh = (this.max * this.rowH) * this.max / this.items.length;
        E.ui.bar(g, this.x + this.w + 8, this.y + (this.top / this.items.length) * this.max * this.rowH, 3, Math.max(8, bh), 1, '#ffd36a');
      }
    });
  }
};
/* a grid of cards, paged: cols x rows. Left and right move in a row; up and down between rows. */
G.Grid = class {
  constructor(o) { this.cols = o.cols || 3; this.rows = o.rows || 2; this.x = o.x; this.y = o.y; this.cw = o.cw || 84; this.ch = o.ch || 56; this.gap = o.gap || 6; this.items = o.items || []; this.i = 0; this.page = 0; this.rects = []; this.t = 0; this.onFocus = o.onFocus; }
  per() { return this.cols * this.rows; }
  pages() { return Math.max(1, Math.ceil(this.items.length / this.per())); }
  update(I, dt) {
    this.t += dt; const n = this.items.length; if (!n) return null;
    if (I.repeat('left', .35, .1)) this.move(-1, 0);
    if (I.repeat('right', .35, .1)) this.move(1, 0);
    if (I.repeat('up', .35, .1)) this.move(0, -1);
    if (I.repeat('down', .35, .1)) this.move(0, 1);
    if (I.pressed('tabL') && this.pages() > 1) { this.page = (this.page + this.pages() - 1) % this.pages(); this.i = this.page * this.per(); }
    if (I.pressed('tabR') && this.pages() > 1) { this.page = (this.page + 1) % this.pages(); this.i = this.page * this.per(); }
    const hi = G.ui.hit(this.rects, I);
    if (hi >= 0) { this.i = hi; return { item: this.items[hi], i: hi, click: true }; }
    if (I.mouse && I.mouse.active && this.rects.length) { const p = I.pointer(); for (const k in this.rects) { const q = this.rects[k]; if (q && p[0] >= q.x && p[1] >= q.y && p[0] < q.x + q.w && p[1] < q.y + q.h && +k !== this.i) { this.i = +k; this.page = Math.floor(this.i / this.per()); } } }
    if (I.pressed('confirm') && this.items[this.i]) return { item: this.items[this.i], i: this.i, confirm: true };
    this.page = Math.floor(this.i / this.per());
    return null;
  }
  move(dx, dy) {
    const n = this.items.length, c = this.i % this.cols, r = Math.floor((this.i % this.per()) / this.cols);
    let nc = c + dx, nr = r + dy;
    if (nc < 0) nc = this.cols - 1; if (nc >= this.cols) nc = 0;
    if (nr < 0 || nr >= this.rows) return;
    let idx = Math.floor(this.i / this.per()) * this.per() + nr * this.cols + nc;
    if (idx >= n) idx = n - 1;
    if (idx !== this.i) { this.i = idx; if (this.onFocus) this.onFocus(this.items[idx], idx); }
  }
  draw(r, cell) {
    this.rects = [];
    const start = this.page * this.per();
    r.overlay(g => {
      for (let k = 0; k < this.per(); k++) {
        const idx = start + k; if (idx >= this.items.length) break;
        const cx = this.x + (k % this.cols) * (this.cw + this.gap), cy = this.y + Math.floor(k / this.cols) * (this.ch + this.gap);
        this.rects[idx] = { x: cx, y: cy, w: this.cw, h: this.ch };
        cell(g, this.items[idx], cx, cy, this.cw, this.ch, idx === this.i, idx);
        if (idx === this.i) G.ui.focus(g, cx, cy, this.cw, this.ch, this.t);
      }
    });
  }
};
/* toasts and notes over the screen */
G.toasts = [];
G.toast = function (text, secs) { G.toasts.push({ text, t: secs || 2.4, max: secs || 2.4 }); if (G.toasts.length > 3) G.toasts.shift(); };
G.drawToasts = function (r, dt) {
  if (!G.toasts.length) return;
  for (const t of G.toasts) t.t -= dt;
  G.toasts = G.toasts.filter(t => t.t > 0);
  r.overlay(g => {
    G.toasts.forEach((t, i) => {
      const w = Math.min(r.W - 40, E.font.width(t.text, { scale: 2 }) + 24), x = Math.round(r.W / 2 - w / 2), y = 20 + i * 24;
      const a = Math.min(1, t.t * 3, (t.max - t.t) * 6);
      E.ui.box(g, x, y, w, 18, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: a });
      E.font.text(g, t.text, x + w / 2, y + 4, '#fff8e8', { scale: 2, align: 'center', shadow: '#000' });
    });
  });
};
/* the standard frame of a screen: a title and its strap */
G.screenTitle = function (r, title, sub) {
  r.overlay(g => {
    E.font.text(g, title, r.W / 2, 14, '#ffd36a', { scale: 2, align: 'center', shadow: '#000' });
    if (sub) E.font.text(g, sub, r.W / 2, 32, '#9fd3d6', { align: 'center', shadow: '#000' });
  });
};
G.drawSmallText = function (r, s, x, y, col, o) { r.overlay(g => E.font.text(g, s, x, y, col || '#fff8e8', Object.assign({ shadow: '#000' }, o || {}))); };

/* ==== 11b-text.js ==== */
/* 11b-text: the text box: typed lines at the bottom of the screen, a name tag, a portrait, a voice for each letter,
 * choices on the last page. Confirm shows the rest of a line, then the next; cancel skips the page to its end. */
G.TextBox = class {
  constructor() { this.open = false; this.lines = []; this.i = 0; this.shown = 0; this.choices = null; this.choice = 0; this.t = 0; this.voice = null; this.last = -1; }
  say(text, o) {
    o = o || {};
    this.lines = Array.isArray(text) ? text : [text];
    this.i = 0; this.shown = 0; this.open = true; this.last = -1;
    this.name = o.name || null; this.color = o.color || '#ffd36a'; this.portrait = o.portrait || null;
    this.prof = o.prof || null; this.voice = o.prof ? G.voiceFor(o.prof) : null;
    this.choices = o.choices || null; this.choice = 0; this.onChoice = o.onChoice || null; this.onDone = o.onDone || null;
    this.speed = o.speed || G.T.textSpeed;
    return this;
  }
  page() { return this.lines[this.i] || ''; }
  typing() { return this.shown < this.page().length; }
  update(I, dt) {
    if (!this.open) return false;
    this.t += dt;
    const pg = this.page();
    if (this.typing()) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(pg.length, this.shown + (this.speed || 45) * dt);
      const after = Math.floor(this.shown);
      if (this.voice) for (let k = before; k < after; k++) this.voice(pg[k], k, [pg], null);
    }
    if (I.pressed('confirm') || I.pressed('cancel') && this.typing()) {
      if (this.typing()) { this.shown = pg.length; if (I.consume) I.consume('confirm'); return true; }
      if (this.choices && this.i >= this.lines.length - 1) {
        const pick = this.choice; this.open = false; if (this.onChoice) this.onChoice(pick); if (this.onDone) this.onDone(); return true;
      }
      this.i++; this.shown = 0;
      if (this.i >= this.lines.length) { this.open = false; if (this.onDone) this.onDone(); }
      return true;
    }
    if (this.choices && this.i >= this.lines.length - 1 && !this.typing()) {
      if (I.repeat('up', .3, .12)) this.choice = (this.choice + this.choices.length - 1) % this.choices.length;
      if (I.repeat('down', .3, .12)) this.choice = (this.choice + 1) % this.choices.length;
    }
    return true;
  }
  draw(r) {
    if (!this.open) return;
    const W = r.W, H = r.H, bw = Math.min(W - 16, 400), bh = 62, x = Math.round(W / 2 - bw / 2), y = H - bh - 22;
    const pg = this.page().slice(0, Math.floor(this.shown));
    const lines = G.wrapText(pg, bw - (this.portrait ? 52 : 14), 1);
    r.overlay(g => {
      E.ui.box(g, x, y, bw, bh, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
      if (this.name) { const nw = E.font.width(this.name, { scale: 1 }) + 10; E.ui.box(g, x + 8, y - 10, nw, 12, { bg: ['#2a1240', '#12081e'], border: this.color, alpha: 1 }); E.font.text(g, this.name, x + 13, y - 8, this.color, { scale: 1 }); }
      let ty = y + 8;
      const tx = x + (this.portrait ? 46 : 10);
      for (const ln of lines.slice(0, 3)) { E.font.text(g, ln, tx, ty, '#fff8e8', { shadow: '#000' }); ty += 11; }
      if (!this.typing() && !(this.choices && this.i >= this.lines.length - 1)) E.font.text(g, '▸', x + bw - 12, y + bh - 12, this.color, { scale: 1 });
      if (this.choices && this.i >= this.lines.length - 1 && !this.typing()) {
        this.choices.forEach((c, k) => { const cy = y - 4 - (this.choices.length - k) * 12; E.font.text(g, (k === this.choice ? '▸ ' : '  ') + c, x + bw - 90, cy, k === this.choice ? '#ffd36a' : '#fff8e8', { shadow: '#000' }); });
      }
    });
    if (this.portrait) r.overlay(g => { E.ui.box(g, x + 6, y + 6, 36, 42, { bg: ['#1a3a4a', '#0a1a24'], border: '#f6d38a', alpha: 1 }); this.portrait(g, x + 9, y + 9, 30); });
    if (this.choices) {}
  }
};
G.box = new G.TextBox();

/* ==== 12-audio.js ==== */
/* 12-audio: the sound effects (chip-synth presets defined in code), the music calls, and the Animalese voice: every new
 * letter of a line is a short tone or noise shaped by its letter class, pitched by the speaker's profile. */
G.SFX = {
  ui_tick: { wave: 'square', freq: 1400, to: 1300, dur: .02, vol: .08 },
  ui_select: { wave: 'square', freq: 660, to: 990, dur: .07, vol: .12, arp: [0, 4, 7] },
  ui_back: { wave: 'square', freq: 520, to: 300, dur: .08, vol: .1 },
  ui_error: { wave: 'square', freq: 180, to: 120, dur: .18, vol: .12 },
  ui_tab: { wave: 'triangle', freq: 880, to: 1100, dur: .04, vol: .1 },
  bump: { wave: 'sine', freq: 160, to: 90, dur: .08, vol: .35 },
  set: { wave: 'triangle', freq: 400, to: 420, dur: .05, vol: .25 },
  spike: { wave: 'noise', freq: 900, to: 300, dur: .09, vol: .5 },
  block: { wave: 'noise', freq: 1200, to: 400, dur: .08, vol: .45 },
  serveToss: { wave: 'noise', freq: 300, to: 900, dur: .14, vol: .14 },
  serveHit: { wave: 'sine', freq: 220, to: 90, dur: .12, vol: .4 },
  sand: { wave: 'noise', freq: 600, to: 150, dur: .14, vol: .12 },
  net: { wave: 'noise', freq: 2000, to: 900, dur: .1, vol: .15 },
  whistle: { wave: 'square', freq: 2200, to: 2100, dur: .4, vol: .2, vib: [18, .04] },
  crowdCheer: { wave: 'noise', freq: 400, to: 1400, dur: 1.2, vol: .18 },
  crowdGroan: { wave: 'noise', freq: 500, to: 180, dur: .9, vol: .16 },
  ooh: { wave: 'sine', freq: 300, to: 500, dur: .35, vol: .14, vib: [6, .03] },
  splash: { wave: 'noise', freq: 1400, to: 300, dur: .35, vol: .3 },
  hopLand: { wave: 'sine', freq: 420, to: 260, dur: .09, vol: .22 },
  high_five: { wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .35 },
  glare: { wave: 'sine', freq: 1600, to: 2400, dur: .3, vol: .12, arp: [0, 7, 12] },
  cash: { wave: 'square', freq: 1000, to: 1500, dur: .16, vol: .14, arp: [0, 4, 7, 12] },
  chip: { wave: 'square', freq: 900, to: 600, dur: .03, vol: .14 },
  card_deal: { wave: 'noise', freq: 2200, to: 1200, dur: .05, vol: .18 },
  card_flip: { wave: 'square', freq: 700, to: 1100, dur: .05, vol: .14 },
  reel_spin: { wave: 'square', freq: 300, to: 340, dur: .03, vol: .07 },
  reel_stop: { wave: 'square', freq: 160, to: 90, dur: .08, vol: .3 },
  wheel_spin: { wave: 'triangle', freq: 300, to: 80, dur: .9, vol: .12 },
  ball_rattle: { wave: 'noise', freq: 1800, to: 900, dur: .35, vol: .14 },
  gift_unwrap: { wave: 'noise', freq: 1000, to: 3000, dur: .25, vol: .18 },
  heart_up: { wave: 'sine', freq: 660, to: 990, dur: .18, vol: .18, arp: [0, 4, 7] },
  heart_down: { wave: 'sine', freq: 440, to: 220, dur: .2, vol: .16 },
  shutter: { wave: 'noise', freq: 2500, to: 900, dur: .06, vol: .35 },
  flash: { wave: 'sine', freq: 2000, to: 800, dur: .12, vol: .3 },
  firework: { wave: 'noise', freq: 300, to: 100, dur: .5, vol: .3 },
  door: { wave: 'square', freq: 200, to: 120, dur: .12, vol: .12 },
  jackpot: { wave: 'square', freq: 523, to: 1046, dur: .6, vol: .2, arp: [0, 4, 7, 12, 16] },
  daystart: { wave: 'triangle', freq: 660, to: 880, dur: .3, vol: .18, arp: [0, 4, 7] },
  levelup: { wave: 'triangle', freq: 523, to: 784, dur: .35, vol: .18, arp: [0, 4, 7, 12] },
  win: { wave: 'square', freq: 523, to: 784, dur: .5, vol: .18, arp: [0, 4, 7, 12, 16] },
  lose: { wave: 'triangle', freq: 330, to: 196, dur: .6, vol: .16 },
  ace: { wave: 'square', freq: 784, to: 1046, dur: .3, vol: .18, arp: [0, 7, 12] },
  matchpoint: { wave: 'square', freq: 440, to: 880, dur: .5, vol: .18, arp: [0, 5, 9] },
  gift_love: { wave: 'triangle', freq: 660, to: 1320, dur: .4, vol: .18, arp: [0, 4, 7, 12] },
  gift_refuse: { wave: 'square', freq: 260, to: 160, dur: .3, vol: .14 },
  photo: { wave: 'noise', freq: 2400, to: 1200, dur: .08, vol: .3 },
  dive: { wave: 'noise', freq: 800, to: 200, dur: .3, vol: .22 },
  step_sand: { wave: 'noise', freq: 500, to: 300, dur: .05, vol: .08 },
  seagull: { wave: 'sine', freq: 1800, to: 2600, dur: .25, vol: .08, vib: [10, .05] },
  cricket: { wave: 'square', freq: 4200, to: 4200, dur: .03, vol: .03 },
  cheer: { wave: 'noise', freq: 900, to: 1600, dur: .6, vol: .14 },
  stuff: { wave: 'noise', freq: 1400, to: 300, dur: .12, vol: .5 }
};
G.defineSfx = function () {
  const A = G.game.audio;
  for (const k in G.SFX) A.define(k, G.SFX[k]);
};
G.sfx = function (name, o) { try { G.game.audio.sfx(name, o || {}); } catch (e) { /* headless: no audio */ } };
/* Animalese: a speaker's profile and the letter classes */
G.VOWELS = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [500, 900], u: [350, 750], y: [400, 1600] };
G.letterSound = function (ch, prof, idx) {
  const c = String(ch || '').toLowerCase();
  if (!/[a-z]/.test(c)) return null;
  const rng = (i) => ((Math.sin(i * 12.9898 + prof.base) * 43758.5453) % 1 + 1) % 1;
  const n = (rng(idx) - .5) * (prof.range || 3);
  const semis = n;
  const f = prof.base * Math.pow(2, semis / 12);
  const wave = prof.wave || 'triangle';
  if (G.VOWELS[c]) return { wave, freq: f, to: f * 1.04, dur: .07, vol: .09 };
  if ('bdgkptc'.includes(c) || c === 'q') return { wave: 'noise', freq: 1200, to: 400, dur: .02, vol: .08 };
  if ('fhsxzv'.includes(c)) return { wave: 'noise', freq: 4000, to: 2500, dur: .045, vol: .05 };
  return { wave: 'triangle', freq: f * .8, to: f * .8, dur: .05, vol: .06 };
};
/* the per-letter voice of a Dialog: called for every newly shown letter (engine patch 3) */
G.voiceFor = function (prof) {
  return function (ch, idx, lines, dlg) {
    if (!ch || !/[a-zA-Z]/.test(ch)) { if (ch === '!' || ch === '?') { /* stress */ } return; }
    const o = G.letterSound(ch, prof, idx);
    if (!o) return;
    const G2 = G;
    if (G2.game && G2.game.audio && G.voiceVolume() > 0) { try { G2.game.audio.sfx(o, { vol: o.vol * G.voiceVolume() }); } catch (e) { /* headless */ } }
  };
};
G.voiceVolume = function () { const v = G.game && G.game.settings ? G.game.settings.voices : undefined; return v === undefined ? .8 : +v; };
/* a bark: a short voiced word with no box, e.g. "MINE!" */
G.bark = function (text, prof) {
  const v = G.voiceFor(prof || { base: 300, range: 3, wave: 'triangle' });
  for (let i = 0; i < text.length && i < 10; i++) v(text[i], i, [text], null);
};
/* the music calls: a song's object, the layer flags, a sting */
/* a bark: what a fighter shouts on a touch */
G.barkWord = function (kind) { return { bump: 'Hup!', dig: 'Mine!', set: 'Yours!', attack: 'Yah!', spike: 'Yah!', serve: 'Hey!', jump: 'Hiya!', block: 'Block!' }[kind] || 'Hey!'; };
G.music = function (key, o) {
  const game = G.game;
  if (!game || !game.audio) return;
  const song = typeof key === 'string' ? (G.SONGS[key] || null) : key;
  try { game.audio.music(song || null, o || {}); } catch (e) { /* headless */ }
};

/* ==== 13-rigs.js ==== */
/* 13-rigs: the rig factory. A fighter is an E.Humanoid built from the cast data, dressed in her suit (main color on the
 * top, accent on the shorts, trim on the lines) with her accessories. Actions map to rig poses and attack moves. */
G.HAIR = { curly: 'spiky', braid: 'long', puff: 'spiky', twinbuns: 'ponytail', bob: 'short', bun: 'ponytail', long: 'long', spiky: 'spiky', short: 'short', bald: 'bald', ponytail: 'ponytail' };
G.rigFor = function (id, o) {
  o = o || {};
  const c = G.CAST[id] || G.STAFF[id];
  const suit = o.suit && G.SUITS[o.suit] ? G.SUITS[o.suit] : null;
  const acc = o.acc || [];
  const colors = { skin: c.skin, hair: c.hairColor, eye: c.eyes || '#2a2020' };
  if (suit) { colors.cloth = suit.colors[0]; colors.pants = suit.colors[1]; colors.trim = suit.colors[2]; }
  else if (c.cloth) { colors.cloth = c.cloth; colors.pants = c.pants; colors.trim = c.trim; }
  colors.boot = c.skin;
  const opts = { size: c.size || 1.25, build: c.build || 'heroic', hair: G.HAIR[c.hair] || 'short', weapon: null, outfit: suit ? 'swim' : 'shirt', sleeves: 'none', swim: suit ? { cut: suit.cut, pattern: suit.pattern, colors: { main: suit.colors[0], accent: suit.colors[1], trim: suit.colors[2] } } : undefined,
    face: { eyes: 'big', bangs: .5 }, colors };
  if (acc.includes('visor')) opts.hat = { style: 'band', color: '#ffffff' };
  if (acc.includes('sweatband')) opts.hat = { style: 'band', color: '#e8c060' };
  if (o.hat) opts.hat = o.hat;
  const rig = G.ikRig(G.mocapRig(new E.Humanoid(opts)));
  rig.gid = id; rig.suitId = o.suit || null; rig.accs = acc.slice();
  rig.hairExtra = ['twinbuns', 'puff', 'bun', 'braid', 'bob', 'curly'].includes(c.hair) ? c.hair : null;
  rig.hatExtra = acc.includes('sunhat') ? 'sunhat' : acc.includes('visor') ? 'visor' : null;
  return rig;
};
/* the accessory overlay drawn over the head after the rig (sunglasses, ribbons, flowers, necklaces, wristbands) */
G.drawAccessories = function (g, rig, ox, oy, scale) {
  const s = (scale || 1) * (rig.lastScale || 1);
  const hx = Math.round(ox), hy = Math.round(oy - 34 * s);
  const acc = rig.accs || [];
  if (acc.includes('sportshades') || acc.includes('heartshades') || acc.includes('aviators')) {
    const col = acc.includes('heartshades') ? '#ff5fa2' : acc.includes('aviators') ? '#ffd36a' : '#20262e';
    E.px.rect(g, hx - 5, hy + 2, 4, 3, col); E.px.rect(g, hx + 1, hy + 2, 4, 3, col); E.px.rect(g, hx - 1, hy + 2, 2, 1, col);
  }
  if (acc.includes('ribbon')) E.px.rect(g, hx + 5, hy - 3, 3, 3, '#e8283a');
  if (acc.includes('hibiscus')) E.px.rect(g, hx - 6, hy - 1, 3, 3, '#ff3b5c');
  if (acc.includes('shellnecklace')) for (let k = 0; k < 3; k++) E.px.rect(g, hx - 3 + k * 3, hy + 9, 2, 2, '#fff8e8');
};
/* a move's attack state, by phase and progress (0..1) */
G.moveState = function (name, u) { try { return E.move(name, G.clamp(u, 0, 1)); } catch (e) { return null; } };
/* the pose and attack for a player's current action */
G.rigStateFor = function (p, extra) {
  const s = { x: p.x, y: p.y, z: p.z + (p.jumpY || 0), vx: p.vx, vy: p.vy, facing: p.facing };
  const a = p.act, t = p.actT || 0;
  if (a === 'spike' && t < .5) s.attack = G.moveState('overhead', t / .5);
  else if (a === 'serve' && t < .45) s.attack = G.moveState('overhead', t / .45);
  else if (a === 'jumpserve' && t < .5) s.attack = G.moveState('overhead', t / .5);
  else if (a === 'bump' && t < .3) s.pose = 'guard';
  else if (a === 'set' && t < .3) s.pose = 'cast';
  else if (a === 'block' && t < .5) s.pose = 'cheer';
  else if (a === 'toss' && t < .5) s.pose = 'cheer';
  else if (a === 'dive') s.down = Math.min(1, Math.max(0, (p.diveT - .22) / .3));
  else if (a === 'celebrate') s.pose = 'cheer';
  else if (a === 'sad') s.pose = 'kneel';
  else if (a === 'ready' && p.pendingNow) s.pose = 'crouch';
  if (p.down && !s.pose) s.pose = 'down';
  if (extra) Object.assign(s, extra);
  return s;
};

/* ==== 14-court.js ==== */
/* 14-court: the beach. One TileMap (44 x 28 cells of 16 units): sea on the top rows, a wet line, then sand. The court's
 * rope lines are painted into the floor. Surroundings are engine props, a backdrop and a few boxes (bleachers, the DJ
 * booth, the scoreboard, the net). */
G.courtRows = function () {
  const rows = [];
  for (let r = 0; r < 28; r++) {
    let s = '';
    for (let c = 0; c < 44; c++) s += r <= 5 ? '~' : r === 6 ? ',' : '.';
    rows.push(s);
  }
  return rows;
};
G.courtLegend = { '~': { floor: 'sea', block: true }, ',': { floor: 'wet' }, '.': { floor: 'sand' } };
G.courtFloorTex = function (x, y, tag) {
  const C = G.C, n = (Math.sin(x * .37) * Math.cos(y * .29) + 1) * 4;
  if (tag === 'sea') {
    const u = G.clamp((y) / 96, 0, 1);
    return [Math.round(11 + 35 * u), Math.round(90 + 60 * u), Math.round(122 + 0.4 * (1 - u) * 50)];
  }
  if (tag === 'wet') return [201 + n, 160 + n, 106 + n];
  // sand, with the rope lines painted over the court
  const onLineX = (Math.abs(x - C.X0) < 2.2 || Math.abs(x - C.X1) < 2.2) && y >= C.Y0 - 2 && y <= C.Y1 + 2;
  const onLineY = (Math.abs(y - C.Y0) < 2.2 || Math.abs(y - C.Y1) < 2.2) && x >= C.X0 - 2 && x <= C.X1 + 2;
  if (onLineX || onLineY) return [42, 111, 208];
  const inCourt = x >= C.X0 && x <= C.X1 && y >= C.Y0 && y <= C.Y1;
  if (inCourt) return [236 + n * .3, 205 + n * .3, 140 + n * .3];
  return [243 + n * .4, 217 + n * .4, 164 + n * .4];
};
G.courtMap = function () {
  if (G._courtMap) return G._courtMap;
  G._courtMap = new E.TileMap({ rows: G.courtRows(), legend: G.courtLegend, types: {}, floorTex: G.courtFloorTex, outside: '#0a2d3d', ao: 0 });
  return G._courtMap;
};
/* the backdrop: the sea, the sun and far islands, by time of day */
G.courtBackdrop = function (tod) {
  if (!G._bg) G._bg = {};
  const k = tod === 'night' ? 'night' : tod === 'sunset' ? 'dusk' : 'day';
  if (!G._bg[k]) G._bg[k] = new E.Backdrop(k);
  return G._bg[k];
};
/* the set dressing on the far strip and the sides: boxes and props, each a queue so it sorts with the players */
G.drawCourtSet = function (r, tod) {
  const C = G.C, night = tod === 'night';
  // bleachers (far strip): three tiers of seats with the crowd in them
  const bx0 = C.X0 - 40, bx1 = C.X1 + 40;
  for (let tier = 0; tier < 3; tier++) {
    const y0 = 118 + tier * 0, z0 = tier * 6, z1 = tier * 6 + 6;
    r.queue(bx0, y0, z0, g => r.box(g, bx0, y0, z0, bx1, y0 + 12, z1, '#cfa77a', '#8a6242'), { bias: 0 });
  }
  // DJ booth (Sonny) and the scoreboard (Pepper)
  r.queue(C.NET_X - 110, 124, 0, g => r.box(g, C.NET_X - 130, 120, 0, C.NET_X - 90, 132, 18, '#2a2a3a', '#14141e'));
  r.queue(C.NET_X + 70, 124, 0, g => r.box(g, C.NET_X + 52, 120, 0, C.NET_X + 88, 128, 22, '#f6f0dc', '#c8b8a0'));
  // umbrellas and loungers on the sand
  const props = [['palm', 28, 150], ['palm', 680, 150], ['palm', 40, 400], ['palm', 668, 404], ['flowers', 60, 350], ['flowers', 640, 350], ['rock', 180, 104], ['rock', 540, 102]];
  for (const [nm, x, y] of props) r.prop(nm, x, y, 0, { size: 1.1 });
  if (night) { r.prop('torch', 230, 120, 0, { light: true, size: 1.2 }); r.prop('torch', 470, 120, 0, { light: true, size: 1.2 }); }
};
G.drawNet = function (r) {
  const C = G.C, y0 = C.Y0 - 10, y1 = C.Y1 + 10;
  r.queue(C.NET_X, C.CY, 0, g => {
    const a = r.w(C.NET_X, y0, 52), b = r.w(C.NET_X, y1, 52), c = r.w(C.NET_X, y0, 0), d = r.w(C.NET_X, y1, 0);
    E.px.line(g, a[0], a[1], c[0], c[1], '#2a2a32', 1); E.px.line(g, b[0], b[1], d[0], d[1], '#2a2a32', 1);
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, yy = y0 + (y1 - y0) * t, p1 = r.w(C.NET_X, yy, C.NET_H), p2 = r.w(C.NET_X, yy, C.NET_H - 16);
      E.px.line(g, p1[0], p1[1], p2[0], p2[1], '#f4f4f8', 1);
    }
    const t1 = r.w(C.NET_X, y0, C.NET_H), t2 = r.w(C.NET_X, y1, C.NET_H);
    E.px.line(g, t1[0], t1[1], t2[0], t2[1], '#fff8e8', 1);
  }, { bias: 2 });
};

/* ==== 15-anim.js ==== */
/* 15-anim: motion capture on the rigs. The game's clip set (vendor/mocap/aoa-clips.js) plays on every fighter through
 * Mocap.drive: a clip replaces the rig's own pose while it plays, and the rig keeps its own build. Clips are chosen by
 * what the player is doing: a point won (the fighter's own celebration), a point lost (a shrug), a dive (a roll), and
 * idles on the title and the menus. */
G.mocapLib = function () {
  if (G._mocap !== undefined) return G._mocap;
  G._mocap = null;
  try { if (typeof Mocap !== 'undefined' && typeof MOCAP !== 'undefined' && MOCAP.AOA) G._mocap = Mocap.load(MOCAP.AOA); } catch (e) { G._mocap = null; }
  return G._mocap;
};
G.CELEB_CLIP = { 'Bow': 'Bow', 'Victory Fist Pump': 'Victory Fist Pump', 'Head Nod': 'Head Nod', 'Dance Charleston': 'Dance Charleston', 'Wave_Hello': 'Wave_Hello', 'Backflip': 'Backflip', 'Cheering_Two_Hands': 'Cheering_Two_Hands', 'Salute': 'Salute' };
/* the clip a fighter plays now, or null for the rig's own pose */
G.mocapClipFor = function (p) {
  if (p.act === 'celebrate') return G.CELEB_CLIP[p.cast.celebration] || 'Victory';
  if (p.act === 'sad') return 'Shrug';
  if (p.act === 'dive' && (p.actT || 0) < .7) return 'Dive_Roll';
  if (p.act === 'block' && (p.actT || 0) < .6) return 'Jumping_Jacks_Loop';
  // the volleyball moves: hand-keyed clips for the bump, the set and the spike
  if (p.act === 'bump' && (p.actT || 0) < .62) return 'Bump';
  if (p.act === 'set' && (p.actT || 0) < .62) return 'Set';
  if (p.act === 'spike' && (p.actT || 0) < 1) return 'Spike';
  if (p.act === 'idle') return p.idleClip || null;
  return null;
};
/* attach the clip driver to a rig once */
G.mocapRig = function (rig) {
  const lib = G.mocapLib();
  if (lib && !rig._mocapOn && typeof Mocap !== 'undefined') { Mocap.drive(rig, lib); rig._mocapOn = true; }
  return rig;
};
/* set a rig's clip for the time t (seconds into the clip); a null clip gives the rig back its own pose */
G.VOLLEY = { Bump: 1, Set: 1, Spike: 1 };
G.mocapLibFor = function (clip) {
  if (!G.VOLLEY[clip]) return G.mocapLib();
  if (G._volley !== undefined) return G._volley;
  G._volley = null;
  try { if (typeof Mocap !== 'undefined' && typeof MOCAP !== 'undefined' && MOCAP.AOAV) G._volley = Mocap.load(MOCAP.AOAV); } catch (e) { G._volley = null; }
  return G._volley;
};
G.mocapSet = function (rig, clip, t) {
  const lib = G.mocapLibFor(clip);
  if (!clip || !lib) { rig.mocap = null; return; }
  const c = lib.clip(clip);
  if (!c) { rig.mocap = null; return; }
  const dur = c.dur || 1;
  rig.mocap = lib.sample(c, c.loop ? t % dur : Math.min(t, dur * .999));
  rig.mocapW = 1;
};
/* arm IK: the hands go to the ball. During a bump, a set, a spike or a serve the rig's arms are solved (two-bone IK, the
 * engine's ik3) to the ball's point in the fighter's frame. The point is worldOffset's inverse: turned back by the facing and
 * scaled back to the rig's own units. */
G.worldToLocal = function (rig, d) {
  const a = rig.facing + rig.spin + (rig._cheat || 0), c = Math.cos(a), s = Math.sin(a), sz = rig.o.size, sq = rig.sq || 0, k = (1 - sq * .4) * sz;
  return [(d[0] * c + d[1] * s) / k, (-d[0] * s + d[1] * c) / k, d[2] / ((1 + sq) * sz)];
};
G.ikRig = function (rig) {
  if (rig._ik) return rig;
  rig._ik = true;
  const base = rig.solvePose;
  rig.solvePose = function () {
    base.call(this);
    const T = this.ikHand, J = this.J;
    if (!T || !J.shR || !J.shL) return;
    const L = G.worldToLocal(this, T), o = this.o;
    for (const s of ['R', 'L']) {
      const [elbow, hand] = E.ik3(J['sh' + s], L, o.armUpper, o.armLower, [-1, s === 'R' ? .7 : -.7, -.2]);
      J['elbow' + s] = elbow; J['hand' + s] = hand;
    }
  };
  return rig;
};
/* the hand target for a player this step, as a world offset from her feet (or null) */
G.ikTargetFor = function (p, L, t) {
  if (!L || !p.rig) return null;
  if (!['bump', 'set', 'spike', 'serve', 'jumpserve'].includes(p.act) || (p.actT || 0) > .35) return null;
  const s = G.flightAt(L, t);
  return [s.x - p.x, s.y - p.y, Math.max(0, s.z) - 0];
};

/* ==== 16-dress.js ==== */
/* 16-dress: the swimsuits, drawn over the rig. The engine dresses the body in plain outfit colours; this paints each suit's
 * cut (one piece, crop top, tankini, rash guard, halter, sarong, racer) and its pattern (stripes, dots, waves, stars,
 * florals, palms, checks, gradients, zigzags, scales, sevens, gold lame) on the torso and the shorts, and adds the buns of
 * the hair styles the engine lacks. The points are the rig's joints, projected with the view. */
G.CUT = {
  onepiece: { top: 1, bottom: 'brief' }, racer: { top: 1, bottom: 'brief' }, halter: { top: 1, bottom: 'brief', strap: true },
  sport2: { top: .55, bottom: .35 }, tankini: { top: .8, bottom: .3 }, rash: { top: 1, bottom: .45 }, sarong: { top: 1, bottom: .3, wrap: true }
};
/* a point in the rig's frame, as a buffer pixel (the view is orthographic, so a offset projects the same from any spot) */
G.bufPoint = function (r, ox, oy, rig, joint) {
  const d = rig.worldOffset(rig.J[joint] || [0, 0, 0]), a = r.w(0, 0, 0), b = r.w(d[0], d[1], d[2]);
  return [ox + b[0] - a[0], oy + b[1] - a[1]];
};
G.lerpPt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/* the pattern colour at a pixel, or null for the main colour */
G.patternAt = function (pat, x, y, c) {
  switch (pat) {
    case 'stripes': return y % 3 === 0 ? c[1] : null;
    case 'pin': return x % 4 === 0 ? c[1] : null;
    case 'dots': return (x % 4 === 1 && y % 4 === 1) ? c[1] : null;
    case 'waves': return ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 0) ? c[1] : null;
    case 'stars': return (x % 5 === 2 && y % 5 === 2) ? c[1] : null;
    case 'floral': return ((x + y) % 6 === 0) ? c[2] : ((x % 6 === 3 && y % 6 === 3) ? c[1] : null);
    case 'palms': return ((x - y) % 5 === 0) ? c[1] : null;
    case 'check': return ((x >> 1) + (y >> 1)) % 2 === 0 ? c[1] : null;
    case 'gradient': return null;
    case 'geo': return ((x + y) % 4 < 2) ? c[1] : null;
    case 'scales': return ((x + (y % 4 < 2 ? 0 : 2)) % 4 === 1 && y % 2 === 0) ? c[1] : null;
    case 'sevens': return ((x * 3 + y) % 7 === 0) ? c[2] : null;
    case 'lame': return ((x * 7 + y * 13) % 11 === 0) ? c[2] : null;
    default: return null;
  }
};
/* fill a convex quad with a colour, and its pattern */
G.fillQuad = function (g, q, main, pat, col) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of q) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const inside = (x, y) => {
    let pos = 0, neg = 0;
    for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], cr = (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]); if (cr > 0) pos++; else if (cr < 0) neg++; }
    return pos === 0 || neg === 0;
  };
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    if (!inside(x + .5, y + .5)) continue;
    let c = main;
    if (pat === 'gradient') { const u = (y - y0) / Math.max(1, y1 - y0); c = u < .33 ? col[0] : u < .66 ? col[1] : col[2]; }
    else { const p = G.patternAt(pat, x, y, col); if (p) c = p; }
    E.px.rect(g, x, y, 1, 1, c);
  }
};
/* the suit and the hair over a rig: called from inside its draw callback */
G.dress = function (g, r, rig, ox, oy) {
  G.drawAccessories(g, rig, ox, oy);
  const suit = rig.suitId && G.SUITS[rig.suitId];   // (the top and brief are the engine's; the sleeves are drawn here)
  const J = rig.J || {};
  // sleeves of a rash guard: the upper arm from the shoulder to the elbow
  if (suit && suit.cut === 'rash' && J.elbowL && J.elbowR) {
    for (const s of ['L', 'R']) { const sh = G.bufPoint(r, ox, oy, rig, 'sh' + s), el = G.bufPoint(r, ox, oy, rig, 'elbow' + s); G.fillQuad(g, [[sh[0] - 1, sh[1]], [sh[0] + 1, sh[1]], [el[0] + 1, el[1]], [el[0] - 1, el[1]]], suit.colors[0], 'none', suit.colors); }
  }
  // hair the engine has no style for: buns, a puff, braids, a bob and curls, as shapes on the head
  const hx = rig.hairExtra, hc = (rig.o && rig.o.colors && rig.o.colors.hair) || '#2a1810';
  if (hx && J.head) {
    const hp = G.bufPoint(r, ox, oy, rig, 'head'), s = (rig.o && rig.o.size) || 1;
    if (hx === 'twinbuns') { E.px.disc(g, hp[0] - 5 * s, hp[1] - 2 * s, 2.6 * s, hc); E.px.disc(g, hp[0] + 5 * s, hp[1] - 2 * s, 2.6 * s, hc); }
    if (hx === 'puff') E.px.disc(g, hp[0], hp[1] - 1 * s, 4.5 * s, hc);
    if (hx === 'bun') E.px.disc(g, hp[0], hp[1] - 4 * s, 2.6 * s, hc);
    if (hx === 'braid') for (let k = 0; k < 5; k++) E.px.disc(g, hp[0] - 2 * s + (k % 2) * s, hp[1] + (3 + k * 2.2) * s, 1.2 * s, hc);
    if (hx === 'bob') { E.px.disc(g, hp[0], hp[1] - 1 * s, 4.2 * s, hc); E.px.rect(g, hp[0] - 4 * s, hp[1], 8 * s, 3 * s, hc); }
    if (hx === 'curly') for (let k = 0; k < 7; k++) { const an = k / 7 * Math.PI * 2; E.px.disc(g, hp[0] + Math.cos(an) * 4 * s, hp[1] - 1 * s + Math.sin(an) * 3 * s, 1.4 * s, hc); }
  }
  // hats: a sun hat's wide brim with its band, a visor's brim alone
  if (rig.hatExtra && J.head) {
    const hp = G.bufPoint(r, ox, oy, rig, 'head'), s = (rig.o && rig.o.size) || 1;
    if (rig.hatExtra === 'sunhat') { E.px.rect(g, hp[0] - 9 * s, hp[1] - 5 * s, 18 * s, 2 * s, '#e8d49a'); E.px.rect(g, hp[0] - 4 * s, hp[1] - 7 * s, 8 * s, 2 * s, '#e8d49a'); E.px.rect(g, hp[0] - 4 * s, hp[1] - 6 * s, 8 * s, 1 * s, '#e8283a'); }
    if (rig.hatExtra === 'visor') E.px.rect(g, hp[0] - 6 * s, hp[1] - 2 * s, 12 * s, 2 * s, '#ffffff');
  }
};

/* ==== 20-ball.js ==== */
/* 20-ball: the ball is a closed-form launch, never an integrated body: every machine computes the same path from
 * the same launch. A launch: { t0, p: [x,y,z], v: [vx,vy,vz], g, k, kind, side } and its events (net, landing).
 *   tau = t - t0; e = exp(-k tau)
 *   x = x0 + vx(1-e)/k;  y = y0 + vy(1-e)/k;  z = z0 + (vz + g/k)(1-e)/k - g tau/k
 *   velocity: (vx e, vy e, (vz + g/k) e - g/k) */
G.C = { X0: 224, X1: 480, Y0: 176, Y1: 304, NET_X: 352, NET_H: 44, CY: 240, RB: 3.5, TILE: 16, ANT: 64 };
G.KMIN = .001;
G.launchMake = function (o) {
  const k = Math.max(G.KMIN, o.k !== undefined ? o.k : G.T.ballDrag), g = o.g !== undefined ? o.g : G.T.ballGravity;
  const L = { t0: o.t0, p: o.p.slice(), v: o.v.slice(), k, g, kind: o.kind || 'pass', side: o.side === undefined ? -1 : o.side, from: o.from, by: o.by || null, id: (G._launchId = (G._launchId || 0) + 1) };
  G.launchEvents(L);
  return L;
};
G.flight = function (L, t, out) {
  const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), ik = 1 / k, gk = L.g * ik, vzk = L.v[2] + gk;
  const o = out || {};
  o.x = L.p[0] + L.v[0] * (1 - e) * ik;
  o.y = L.p[1] + L.v[1] * (1 - e) * ik;
  o.z = L.p[2] + vzk * (1 - e) * ik - gk * tau;
  o.vx = L.v[0] * e; o.vy = L.v[1] * e; o.vz = vzk * e - gk;
  return o;
};
G.flightAt = (L, t) => G.flight(L, t, {});
/* solve a monotone-ish function for its crossing of zero in [lo, hi] by bisection */
G.bisect = function (f, lo, hi, iters) {
  let a = lo, b = hi, fa = f(a);
  for (let i = 0; i < (iters || 40); i++) {
    const m = (a + b) / 2, fm = f(m);
    if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
};
/* the launch's events, computed once: the net crossing and the landing */
G.launchEvents = function (L) {
  const C = G.C, r = C.RB;
  L.tNet = null; L.tLand = null;
  const toNet = L.v[0] !== 0 && Math.sign(C.NET_X - L.p[0]) === Math.sign(L.v[0]);
  if (toNet) {
    const f = t => G.flightAt(L, t).x - C.NET_X;
    const lo = L.t0, hi = L.t0 + 6;
    if (f(lo) * f(hi) <= 0) L.tNet = G.bisect(f, lo, hi, 44);
  }
  // landing: the first time after the apex that z falls through r
  let tPrev = L.t0, step = 1 / 60, t = L.t0, found = null;
  for (let n = 0; n < 60 * 12; n++) {
    t = L.t0 + n * step;
    const s = G.flightAt(L, t);
    if (s.z <= r && (s.vz <= 0 || n > 0)) {
      if (n === 0) { found = L.t0; break; }
      found = G.bisect(tt => G.flightAt(L, tt).z - r, tPrev, t, 40);
      break;
    }
    tPrev = t;
  }
  if (found !== null) { L.tLand = found; const s = G.flightAt(L, found); L.landX = s.x; L.landY = s.y; }
  if (L.tNet !== null) { const s = G.flightAt(L, L.tNet); L.netX = s.x; L.netY = s.y; L.netZ = s.z; }
};
/* the time after the apex that the ball falls through height h, from time `from` on (null if never) */
G.timeAtHeight = function (L, h, from) {
  const end = L.tLand !== null ? L.tLand : L.t0 + 8;
  let t0 = Math.max(from !== undefined ? from : L.t0, L.t0);
  let prev = G.flightAt(L, t0), step = 1 / 60;
  for (let t = t0 + step; t <= end + 1e-6; t += step) {
    const s = G.flightAt(L, t);
    if (prev.z > h && s.z <= h && s.vz <= 0) return G.bisect(tt => G.flightAt(L, tt).z - h, t - step, t, 40);
    prev = s;
  }
  return null;
};
/* launch a ball from p so that it arrives at target (x, y, z) at time T after t0 */
G.aimVel = function (p, target, T, g, k) {
  k = Math.max(G.KMIN, k); const e = Math.exp(-k * T), ik = 1 / k, gk = g * ik, den = (1 - e);
  return [(target[0] - p[0]) * k / den, (target[1] - p[1]) * k / den, ((target[2] - p[2]) + gk * T) * k / den - gk];
};
/* the net outcome of a launch, once it has crossed */
G.netOutcome = function (L) {
  const C = G.C, r = C.RB;
  if (L.tNet === null) return 'none';
  if (Math.abs(L.netY - C.CY) > C.ANT + r) return 'antenna';
  if (L.netZ - r > C.NET_H) return 'clear';
  if (L.netZ + r >= C.NET_H - 3) return 'cord';
  return 'net';
};
/* where a ball lands: which court, and whether it is in */
G.landCourt = function (L) {
  const C = G.C, r = C.RB;
  if (L.tLand === null) return null;
  const inside = L.landX >= C.X0 - r && L.landX <= C.X1 + r && L.landY >= C.Y0 - r && L.landY <= C.Y1 + r;
  return { side: L.landX < C.NET_X ? 0 : 1, inside };
};

/* ==== 21-rules.js ==== */
/* 21-rules: the Match class and its referee. The rally is a chain of launches; each contact is planned on the side the
 * ball is heading to, judged (human press or AI roll), and turns into a new launch. Players, AI and presentation are
 * mixed into G.Match.prototype by 22-players.js, 23-ai.js and 24-match.js. */
G.Match = class {
  constructor(o) {
    const C = G.C;
    this.o = o;
    this.G = G;
    this.t = 0;                         // match clock (seconds), advances with game time
    this.players = [];
    this.score = [0, 0]; this.sets = [0, 0]; this.setNo = 1;
    this.pointsToWin = o.pointsToWin || 7; this.setsToWin = o.setsToWin || 1; this.winBy = 2;
    this.phase = 'intro'; this.phaseT = 0;
    this.L = null;                      // the live launch
    this.touches = [0, 0];              // touches by each side on this crossing
    this.lastTouch = null;              // { side, p, kind, t }
    this.pending = null;                // the planned contact
    this.serveSide = o.serveSide === undefined ? 0 : o.serveSide;
    this.server = null; this.servePos = null; this.serveT = 0; this.tossL = null; this.tossPress = null;
    this.stats = { rallies: 0, longest: 0, rallyLen: 0, points: [0, 0] };
    this.events = [];                   // { t, kind, text } for commentary and replays
    this.rng = G.rngFn('match');
    this.court = o.court || 'sunset';
    this.pointLog = [];
    this.over = false; this.winner = null;
    this.matchPoint = [false, false];
    this.pointMsgT = 0; this.callText = null; this.dead = null;
    this.blockers = {};                 // side -> player with a block press
    this.lastFault = null;
    this.serveCount = 0;
    this.cordT = null;
  }
  /* the side of a ground x: 0 for the left court, 1 for the right */
  sideOf(x) { return x < G.C.NET_X ? 0 : 1; }
  opp(side) { return 1 - side; }
  /* start a launch: the one place a ball gets a new flight */
  launch(o) {
    const L = G.launchMake(o);
    this.L = L;
    this.touchAt = this.t;
    this.events.push({ t: this.t, kind: 'launch', kind2: L.kind });
    if (this.events.length > 40) this.events.shift();
    return L;
  }
  ballPos(t) { return this.L ? G.flightAt(this.L, t === undefined ? this.t : t) : null; }
  /* the contact planner: who will play the ball next, and when, on side D */
  planFor(side) {
    this.pending = null;
    const L = this.L; if (!L) return;
    const C = G.C, r = C.RB;
    const touchNo = this.touches[side];
    if (touchNo >= 3) return;
    const h = touchNo === 0 ? 18 : touchNo === 1 ? 40 : 58;
    const tEnd = L.tLand !== null ? L.tLand : this.t + 8;
    let tStart = this.t;
    if (L.tNet !== null && L.tNet > this.t && this.sideOf(L.p[0]) !== side) tStart = Math.max(tStart, L.tNet);
    if (this.sideOf(L.p[0]) !== side && L.tNet === null) return;
    let best = null;
    for (const p of this.players) {
      if (p.side !== side || p.down || (p.missedId !== undefined && p.missedId === L.id)) continue;
      if (this.lastTouch && this.lastTouch.p === p && this.lastTouch.side === side && !this.lastTouch.blocked) continue;
      let ts = G.timeAtHeight(L, h, tStart);
      let dig = false;
      if (ts === null || ts > tEnd) {
        if (L.tLand !== null && L.tLand > tStart) { ts = Math.max(tStart, L.tLand - .05); dig = true; } else continue;
      }
      if (ts < this.t - .05) ts = this.t + .02;
      const P = G.flightAt(L, ts);
      if (P.z > 70) continue;
      const dist = Math.hypot(P.x - p.x, P.y - p.y);
      const reach = Math.max(0, dist - G.T.reach);
      const arrive = this.t + reach / (G.T.runSpeed * (.86 + .03 * p.stat('SPD')));
      const late = arrive - ts;   // positive when the player cannot get there
      const cand = { p, ts, P: [P.x, P.y, P.z], arrive, late, dig, kind: ['bump', 'set', 'attack'][touchNo] || 'attack', h, side, touchNo };
      const score = late + (p.human && this.callFor(p) === 'yours' ? .4 : 0) + (p.human && this.callFor(p) === 'mine' ? -.3 : 0);
      if (!best || score < best.score) { best = cand; best.score = score; }
    }
    if (!best) return;
    // the partner covers a human's ball when the human cannot get there in time
    const partner = this.players.find(q => q.side === side && q !== best.p && !q.down);
    if (partner && best.p.human && best.late > .05 && partner) { /* the partner goes; handled by the AI's cover logic */ }
    best.pid = best.p.id;
    this.pending = best;
    best.p.planned = best;
  }
  callFor(p) { return p.call || 'auto'; }
  /* the touch resolved: a new launch, from where the ball was */
  touch(p, P, kind, q, aim, o) {
    o = this.specialTouch(p, kind, o || {});
    const side = p.side, C = G.C, sp = G.T.spikeSpeed;
    const qm = G.QUAL[q] || G.QUAL.ok;
    this.touches[side]++;
    this.lastTouch = { side, p, kind, t: this.t, blocked: !!o.blocked };
    this.lastKind = kind;
    this.pending = null;
    p.planned = null; p.lastHit = this.t;
    const from = [P[0], P[1], P[2]];
    let target, T, v;
    const inv = aim || { x: 0, y: 0 };
    const jitter = () => { const rr = qm.r; return [(G.rng('match') * 2 - 1) * rr, (G.rng('match') * 2 - 1) * rr]; };
    const oppSide = this.opp(side);
    const deepX = oppSide === 1 ? C.X1 - 24 : C.X0 + 24;
    const shortX = oppSide === 1 ? C.NET_X + 36 : C.NET_X - 36;
    const midX = oppSide === 1 ? C.NET_X + 80 : C.NET_X - 80;
    const lineY = inv.y < -.4 ? C.Y0 + 14 : inv.y > .4 ? C.Y1 - 14 : C.CY;
    if (kind === 'bump' || kind === 'dig') {
      // the pass goes to the net area on our side: setter's spot
      const tx = side === 0 ? C.NET_X - 40 : C.NET_X + 40;
      target = [tx, C.CY + (inv.y * 22), 40];
      T = G.T.passT;
      if (o.free) { target = [oppSide === 1 ? deepX : deepX, lineY, 10]; T = G.T.shotT + .25; }
    } else if (kind === 'set') {
      const ax = side === 0 ? C.NET_X - 22 : C.NET_X + 22;
      const hitter = this.pickHitter(side, p);
      const ay = hitter ? hitter.y : C.CY;
      target = [ax, ay, 62];
      T = o.quick ? .75 : o.back ? G.T.setT + .1 : G.T.setT;
      if (o.dump) { target = [shortX, lineY, 12]; T = .6; }
    } else if (kind === 'attack' || kind === 'spike') {
      if (o.shot) {
        target = [o.deep ? deepX : shortX, lineY, 6];
        T = G.T.shotT;
      } else {
        const zx = inv.x > .4 ? deepX : inv.x < -.4 ? shortX : midX;
        target = [zx, lineY, 4];
        const dx = Math.abs(target[0] - from[0]);
        T = Math.max(.25, dx / (sp * (.85 + .035 * p.stat('POW')) * qm.s * Math.cos(Math.PI / 12)));
      }
    } else if (kind === 'serve' || kind === 'jump') {
      const jump = kind === 'jump';
      target = [o.tx, o.ty, 4];
      T = jump ? G.T.jumpServeT : G.T.serveT;
    }
    target = [target[0] + jitter()[0] * (o.scatter || 1), target[1] + jitter()[1] * (o.scatter || 1), target[2]];
    if (kind === 'free') { T = 1.2; }
    v = G.aimVel(from, target, T, G.T.ballGravity, G.T.ballDrag);
    // the spike has to clear the net: lower its arc, or on Easy raise it
    let L = G.launchMake({ t0: this.t, p: from, v, kind: kind === 'spike' ? 'spike' : kind, side, by: p });
    if (kind === 'spike' || kind === 'attack') {
      if (L.tNet !== null && G.netOutcome(L) !== 'clear') {
        const assist = G.DIFFICULTY[this.o.difficulty] ? G.DIFFICULTY[this.o.difficulty].spikeAssist : 'near';
        const miss = G.netOutcome(L);
        if (assist === 'always' || (assist === 'near' && L.netZ - G.C.RB < G.C.NET_H + 4 && miss !== 'antenna')) {
          // raise the arc just enough: aim above the net
          for (let tries = 0; tries < 12; tries++) {
            target[2] += 4;
            v = G.aimVel(from, target, T, G.T.ballGravity, G.T.ballDrag);
            L = G.launchMake({ t0: this.t, p: from, v, kind: 'spike', side, by: p });
            if (L.tNet !== null && G.netOutcome(L) === 'clear') break;
          }
        }
      }
    }
    this.L = L;
    this.touchAt = this.t;
    this.stats.rallyLen++;
    if (kind === 'serve' || kind === 'jump') this.serveCount = (this.serveCount || 0) + 1;
    if (this.stats.points[0] + this.stats.points[1] >= 1) this.tipFor('chem');
    p.stats.touches = (p.stats.touches || 0) + 1;
    G.bus.emit('touch', { p, kind, q, side });
    if (q === 'perfect') this.flash = { t: this.t };
    if (kind === 'spike' || kind === 'attack') p.stats.spikes = (p.stats.spikes || 0) + 1;
    // the ball's destination
    if (L.tNet !== null && L.tNet < (L.tLand !== null ? L.tLand : 1e9)) {
      const dest = this.opp(side);
      // a crossing resets the receiving side's touches
      this.touches[dest] = 0;
      this.crossed = { t: L.tNet, to: dest, by: side };
      this.planFor(dest);
      this.lastTouchSideForNet = side;
    } else {
      this.planFor(side);
    }
    return L;
  }
  pickHitter(side, setter) {
    const others = this.players.filter(q => q.side === side && q !== setter && !q.down);
    if (!others.length) return setter;
    return others.reduce((a, b) => (Math.abs(a.y - G.C.CY) > Math.abs(b.y - G.C.CY) ? a : b));
  }
  /* the referee: decides a point and starts the point's phases */
  point(side, why, detail) {
    if (this.phase === 'point' || this.phase === 'over') return;
    const won = side;
    this.score[won]++;
    this.stats.points[won]++;
    if (this.stats.rallyLen > this.stats.longest) this.stats.longest = this.stats.rallyLen;
    this.stats.rallies++;
    const lastP = this.lastTouch && this.lastTouch.p;
    this.pointLog.push({ won, why, detail, lastP: lastP ? lastP.id : null, kind: this.lastTouch ? this.lastTouch.kind : null, rally: this.stats.rallyLen, t: this.t });
    if (lastP && won === lastP.side) { lastP.stats.points = (lastP.stats.points || 0) + 1; }
    if (why === 'ace') { const sp = this.server; if (sp) sp.stats.aces = (sp.stats.aces || 0) + 1; }
    const wp = this.players.find(q => q.side === won && q.ai === false) || this.players.find(q => q.side === won);
    if (wp && wp.cast.voice) G.bark('Yeah!', wp.cast.voice);
    if (why === 'kill' && lastP) lastP.stats.kills = (lastP.stats.kills || 0) + 1;
    if (why === 'block' && this.lastBlocker) this.lastBlocker.stats.blocks = (this.lastBlocker.stats.blocks || 0) + 1;
    if (why === 'serveFault' || why === 'serveNet') { const sp = this.server; if (sp) sp.stats.serveFaults = (sp.stats.serveFaults || 0) + 1; }
    this.stats.rallyLen = 0;
    this.phase = 'point'; this.phaseT = 0;
    this.pendingPoint = { won, why, detail };
    this.L = null; this.pending = null;
    G.bus.emit('point', { won, why, detail, score: this.score.slice() });
    this.onPoint && this.onPoint(won, why, detail);
    this.maybeReplay && this.maybeReplay(why);
    for (const p of this.players) { p.act = p.side === won ? (this.players.filter(q => q.side === won).length === 2 ? 'highfive' : 'celebrate') : 'sad'; p.actT = 0; }
    if (this.players.filter(q => q.side === won).length === 2) G.sfx('high_five');
    this.callOut(why, won, lastP);
    const sets = this.checkSet(won);
    if (sets) this.endSet(won);
  }
  callOut(why, won, lastP) {
    const ck = { ace: 'ace', kill: 'spike', block: 'block', net: 'net', out: 'out', antenna: 'net', serveFault: 'fault', land: 'spike', tape: 'net' }[why];
    if (ck) this.commentate(ck);
    if (this.score[won] >= this.pointsToWin - 1 && this.score[won] > this.score[1 - won]) this.commentate('matchpoint');
    const map = { ace: 'ACE!', kill: 'KILL!', block: 'BLOCK!', out: 'OUT!', net: 'NET!', antenna: 'ANTENNA', fourth: '4 TOUCHES', double: 'DOUBLE TOUCH', netTouch: 'NET TOUCH', serveFault: 'SERVE FAULT', serveNet: 'NET!', land: 'IN!', tape: 'TAPE!', dig: 'DIG!', cord: 'TAPE!', timeout: 'TIME!' };
    this.callText = { text: map[why] || 'POINT', t: 1.6, side: won, why };
  }
  checkSet(won) {
    const need = this.pointsToWin;
    const a = this.score[won], b = this.score[1 - won];
    const lead = a - b;
    if (a >= need && lead >= this.winBy) return true;
    if (a >= need + 4 || (a >= need && a === need + 1 && b === need)) return true;   // hard cap
    if (a >= need && b <= need && a > need && a - b >= 2) return true;
    return false;
  }
  endSet(won) {
    this.sets[won]++;
    this.setWinner = won;
    if (this.sets[won] >= this.setsToWin) { this.over = true; this.winner = won; }
    this.pendingSetEnd = true;
  }
  /* a new serve: the server is the player of the team whose turn it is, rotating */
  pickServer(side) {
    const team = this.players.filter(p => p.side === side);
    const last = this.lastServer && this.lastServer[side];
    let s = team.find(p => p !== last) || team[0];
    if (!this.lastServer) this.lastServer = [null, null];
    this.lastServer[side] = s;
    return s;
  }
};
G.QUAL = { perfect: { s: 1.12, r: 4, name: 'PERFECT' }, great: { s: 1, r: 10, name: 'GREAT' }, ok: { s: .85, r: 20, name: 'OK' }, stretch: { s: .8, r: 30, name: 'STRETCH' }, miss: { s: .6, r: 40, name: 'MISS' } };

/* ==== 22-players.js ==== */
/* 22-players: the player entity, movement, the human's timing judge and the actions a press makes.
 * Every press of 'play' in a contact's window counts once; quality comes from how close it is to the ball's arrival. */
G.makePlayer = function (o) {
  const c = o.cast, stats = c.stats || { POW: 5, TEC: 5, SPD: 5, JMP: 5 };
  return {
    id: o.id, name: c.short || c.name, cast: c, side: o.side, slot: o.slot, team: o.team,
    x: o.x, y: o.y, z: 0, vx: 0, vy: 0, facing: o.side === 0 ? 0 : Math.PI,
    human: o.human || null, ai: !o.human, call: 'auto', lockT: 0, act: 'ready', actT: 0, down: false, dive: null,
    stats: {}, skill: o.skill || .5, base: o.base || .4, chem: o.chem || 1, color: c.color || '#fff',
    stat(k) { return stats[k] || 5; },
    rig: null, pose: null, blockAt: null, planned: null, emote: null, celebT: 0,
    home: [o.x, o.y], jumpT: 0, jumpY: 0, diveT: 0, lastHit: -9
  };
};
/* movement toward a point, speed in units per second */
G.stepToward = function (p, tx, ty, sp, dt) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 0.5) { p.vx = 0; p.vy = 0; return; }
  const s = Math.min(sp, d / Math.max(dt, 1e-4));
  p.vx = dx / d * s; p.vy = dy / d * s;
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (Math.abs(p.facing - Math.atan2(dy, dx)) > 0.01) p.facing = Math.atan2(dy, dx);
};
G.Match.prototype.clampPlayer = function (p) {
  const C = G.C;
  if (p.side === 0) p.x = Math.min(p.x, C.NET_X - 6); else p.x = Math.max(p.x, C.NET_X + 6);
  p.x = G.clamp(p.x, 40, 668);
  p.y = G.clamp(p.y, 112, 432);
};
G.Match.prototype.speedOf = function (p) {
  const base = G.T.runSpeed * (.86 + .03 * p.stat('SPD'));
  return p.ai ? base * G.T.aiSpeedMul : base;
};
/* the human stick in world terms (view-relative) */
G.Match.prototype.humanMove = function (p, dt) {
  const I = p.human; if (!I) return { x: 0, y: 0 };
  const m = I.move(); let mx = m[0], my = m[1];
  if (!mx && !my) return { x: 0, y: 0 };
  const d = G.game.view.screenDirToGround(mx, my);
  return { x: d[0], y: d[1], len: Math.min(1, Math.hypot(mx, my)) };
};
G.Match.prototype.updatePlayer = function (p, dt) {
  const C = G.C;
  p.lockT = Math.max(0, p.lockT - dt);
  p.actT += dt;
  if (p.dive) {
    p.diveT += dt;
    const dv = p.dive;
    if (p.diveT < .22) { p.x += dv.x * 190 * dt; p.y += dv.y * 190 * dt; p.facing = Math.atan2(dv.y, dv.x); }
    if (p.diveT > .22 + .3 + .45) { p.dive = null; p.lockT = .1; p.diveT = 0; p.act = 'ready'; }
    this.clampPlayer(p); return;
  }
  if (p.jumpT > 0) { p.jumpT = Math.max(0, p.jumpT - dt); p.jumpY = Math.sin(Math.PI * (1 - p.jumpT / .6)) * 18 * (p.jumpT > 0 ? 1 : 0); }
  if (p.human && p.human.pos) {
    // a remote player's own copy moves her fighter; the host places it, clamped to the court
    p.x = p.human.pos[0]; p.y = p.human.pos[1];
    const mv = p.human.mv || [0, 0];
    if (mv[0] || mv[1]) p.facing = Math.atan2(mv[1], mv[0]);
    this.clampPlayer(p);
    return;
  }
  if (p.human) {
    const mv = this.humanMove(p, dt);
    const sp = this.speedOf(p);
    const pl = this.pendingFor(p);
    if (mv.len) { p.x += mv.x * sp * mv.len * dt; p.y += mv.y * sp * mv.len * dt; p.facing = Math.atan2(mv.y, mv.x); p.vx = mv.x * sp * mv.len; p.vy = mv.y * sp * mv.len; }
    else if (pl && G.T.autoMove > 0 && !p.lockT) {
      G.stepToward(p, pl.P[0], pl.P[1], sp * G.T.autoMove, dt);
    } else { p.vx = 0; p.vy = 0; }
    this.clampPlayer(p);
    return;
  }
  this.aiMove(p, dt);
  this.clampPlayer(p);
};
G.Match.prototype.pendingFor = function (p) { return this.pending && this.pending.p === p ? this.pending : null; };
/* the human's press: the judge. Returns the quality of the touch or null */
G.Match.prototype.judgePress = function (p, pend) {
  const assist = (G.DIFFICULTY[this.o.difficulty] || { assist: 1 }).assist * (this.o.timingAssist === 'tight' ? .8 : this.o.timingAssist === 'generous' ? 1.6 : 1);
  const err = this.t - pend.ts;
  const ae = Math.abs(err);
  let q = ae <= G.T.perfectWin * assist ? 'perfect' : ae <= G.T.greatWin * assist ? 'great' : ae <= G.T.okWin * assist ? 'ok' : 'miss';
  const d = Math.hypot(pend.P[0] - p.x, pend.P[1] - p.y);
  const reach = G.T.reach + .4 * p.stat('TEC');
  if (q !== 'miss') {
    if (d > reach + 8) q = 'miss';
    else if (d > reach) q = q === 'perfect' ? 'great' : q === 'great' ? 'ok' : 'stretch';
  }
  return q;
};
G.Match.prototype.humanAim = function (p) {
  const I = p.human;
  if (I.lastDevice === 'mouse' && G.game.mouseGround) {
    const g = G.game.mouseGround();
    if (g) return { x: 0, y: 0, mouse: g };
  }
  const m = I.move(); const d = G.game.view.screenDirToGround(m[0], m[1]);
  return { x: m[0] || 0, y: m[1] || 0, mouse: null, wx: d[0], wy: d[1] };
};
/* the aim: stick direction or mouse point on the opponents' half, to a target spot */
G.Match.prototype.aimTarget = function (p, kind) {
  const C = G.C, oppSide = 1 - p.side;
  const a = p.human ? this.humanAim(p) : null;
  if (a && a.mouse) {
    const g = a.mouse;
    const x = G.clamp(g[0], oppSide === 1 ? C.NET_X + 12 : C.X0 + 6, oppSide === 1 ? C.X1 - 6 : C.NET_X - 12);
    const y = G.clamp(g[1], C.Y0 + 6, C.Y1 - 6);
    return { x: (x - C.NET_X) / 64, y: (y - C.CY) / 64, abs: [x, y] };
  }
  return a ? { x: a.x, y: a.y } : { x: 0, y: 0 };
};
/* a press of play, shot, dive or call while a human plays */
G.Match.prototype.humanPress = function (p, action) {
  if (p.down) return;
  if (this.phase === 'serve' && this.server === p && (action === 'play' || action === 'shot')) { this.serveInput(p, action); return; }
  if (action === 'call') { p.call = p.call === 'auto' ? 'mine' : p.call === 'mine' ? 'yours' : 'auto'; this.callFloat(p, p.call === 'auto' ? 'AUTO' : p.call === 'mine' ? 'MINE!' : 'YOURS!'); return; }
  if (action === 'call') this.tipFor('call');
  if (action === 'dive') {
    this.tipFor('dive');
    if (p.lockT > 0 || p.dive) return;
    const pl = this.pendingFor(p);
    let dx = 0, dy = 0;
    const mv = this.humanMove(p, 0);
    if (mv.len) { dx = mv.x; dy = mv.y; }
    else if (pl) { dx = pl.P[0] - p.x; dy = pl.P[1] - p.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; }
    else { dx = p.side === 0 ? 1 : -1; dy = 0; }
    const d = Math.hypot(dx, dy) || 1;
    p.dive = { x: dx / d, y: dy / d }; p.diveT = 0; p.act = 'dive'; p.actT = 0;
    p.lockT = .9;
    this.diveAt = this.t;
    // a dive that lands on the ball is a dig
    if (pl && this.t >= pl.ts - .6) { p.digWindow = { t0: this.t }; }
    return;
  }
  if (action === 'shot' && this.L && !this.pending) {
    // block: near the net, while the other side attacks
    if (Math.abs(p.x - G.C.NET_X) < 24 && this.lastTouch && this.lastTouch.side !== p.side && this.L.tNet !== null) {
      this.tipFor('block'); p.blockAt = this.t; p.act = 'block'; p.actT = 0; p.lockT = .3; return;
    }
  }
  const pend = this.pendingFor(p);
  if (!pend) {
    if (action === 'play' && this.phase === 'serve' && this.server === p) this.serveHit(p, 'play');
    return;
  }
  if (pend.judged) return;
  if (this.t < pend.ts - .6 || this.t > pend.ts + G.T.okWin * 1.2 + .4) return;
  const q = this.judgePress(p, pend);
  pend.judged = true;
  this.resolveTouch(p, pend, q, action);
};
G.Match.prototype.resolveTouch = function (p, pend, q, action) {
  const kind = pend.kind === 'attack' && action === 'shot' ? 'attack' : pend.kind;
  const aim = this.aimTarget(p, kind);
  p.act = kind === 'bump' ? 'bump' : kind === 'set' ? 'set' : 'spike';
  p.actT = 0; p.lockT = .3;
  if (q === 'miss') {
    this.callFloat(p, 'MISS');
    this.whiff(p, kind);
    return;
  }
  this.popJudge(p, q);
  G.bark(G.barkWord(kind), p.cast.voice);
  const P = G.flightAt(this.L, this.t);
  const qn = q === 'stretch' ? 'stretch' : q;
  const opts = { shot: action === 'shot' && (kind === 'attack' || kind === 'spike'), dump: action === 'shot' && kind === 'set', free: action === 'shot' && kind === 'bump', quick: aim.y < -.4 && kind === 'set', back: aim.y > .4 && kind === 'set', deep: aim.x > .4, scatter: 1 };
  if (kind === 'bump' && action === 'shot') opts.free = true;
  if (kind === 'set' && aim.y < -.4) opts.quick = true;
  const P3 = [P.x, P.y, P.z];
  if (kind === 'attack' || kind === 'spike') this.spikeCount = (this.spikeCount || 0) + 1;
  G.bus.emit('judge', { p, q: qn, kind });
  if (kind === 'bump' || kind === 'dig') opts.free = opts.free;
  if (kind === 'set' && p.human && aim.abs) { /* a set aimed by the mouse */ }
  this.touch(p, P3, kind === 'bump' && (pend.dig) ? 'dig' : kind, qn, aim, opts);
  if (pend.dig) { p.stats.digs = (p.stats.digs || 0) + 1; }
  if (qn === 'perfect' && (kind === 'bump')) p.stats.perfects = (p.stats.perfects || 0) + 1;
  if (kind === 'set') p.stats.sets = (p.stats.sets || 0) + 1;
  if (kind === 'bump') p.stats.passes = (p.stats.passes || 0) + 1;
};
G.Match.prototype.whiff = function (p, kind) {
  // no touch: the ball goes on, the planner looks for someone else on the same side
  this.pending = null;
  this.lastFault = { p, t: this.t };
  p.stats.whiffs = (p.stats.whiffs || 0) + 1;
};
G.Match.prototype.popJudge = function (p, q) {
  const names = { perfect: 'PERFECT!', great: 'GREAT', ok: 'OK', stretch: 'STRETCH' };
  this.popups = this.popups || [];
  this.popups.push({ p, text: names[q] || q, col: q === 'perfect' ? '#ffd36a' : q === 'great' ? '#5ff0ff' : q === 'stretch' ? '#ffb27a' : '#fff8e8', t: 0 });
  if (this.popups.length > 4) this.popups.shift();
  G.bus.emit('judgeText', { p, q });
};
G.Match.prototype.callFloat = function (p, text) {
  this.popups = this.popups || [];
  this.popups.push({ p, text, col: '#fff8e8', t: 0, bubble: true });
  if (this.popups.length > 4) this.popups.shift();
};
/* the ball is the server's to toss: a float serve (play) or a jump serve (shot) */
G.Match.prototype.serveHit = function (p, action) {
  if (this.serveState !== 'toss' || this.server !== p) return;
  const jump = action === 'shot';
  const apexT = this.tossL ? this.tossL.apexT : this.t;
  const err = this.t - apexT;
  const q = Math.abs(err) <= G.T.perfectWin ? 'perfect' : Math.abs(err) <= G.T.greatWin ? 'great' : Math.abs(err) <= G.T.okWin ? 'ok' : 'miss';
  if (q === 'miss' && !(this.o.autoServe)) { this.serveMiss = true; return; }
  const aim = this.aimTarget(p, 'serve');
  const opp = 1 - p.side, C = G.C;
  let tx = opp === 1 ? C.NET_X + 80 : C.NET_X - 80, ty = C.CY;
  if (aim.abs) { tx = aim.abs[0]; ty = aim.abs[1]; }
  else { tx = opp === 1 ? (aim.x > .3 ? C.X1 - 20 : aim.x < -.3 ? C.NET_X + 30 : C.NET_X + 90) : (aim.x > .3 ? C.NET_X - 30 : aim.x < -.3 ? C.X0 + 20 : C.NET_X - 90); ty = aim.y < -.3 ? C.Y0 + 14 : aim.y > .3 ? C.Y1 - 14 : C.CY; }
  // the serve leaves from where the ball is at the press
  const P = G.flightAt(this.tossL, this.t);
  this.serveState = 'hit'; this.tossL = null;
  p.act = jump ? 'jumpserve' : 'serve'; p.actT = 0;
  const qn = q === 'miss' ? 'ok' : q;
  const scatter = jump ? 1.5 : 1;
  this.serveQ = qn;
  this.touchSpec = { jump, qn, tx, ty, scatter };
  this.touch(p, [P.x, P.y, P.z], jump ? 'jump' : 'serve', qn, { x: 0, y: 0 }, { tx, ty, scatter });
  this.touches[p.side] = 0; this.touches[opp] = 0;
  this.lastTouch = { side: p.side, p, kind: 'serve', t: this.t };
  this.serveNet = true;
  p.stats.serves = (p.stats.serves || 0) + 1;
  G.bus.emit('serve', { p, q: qn, jump });
  this.playSfx && this.playSfx('serve');
};

/* ==== 23-ai.js ==== */
/* 23-ai: the volleyball AI. Skill per touch from the day's base, difficulty, the stat the touch uses and chemistry; a
 * quality roll per touch on the match stream; formations by phase; attack zones away from defenders. */
G.Match.prototype.aiSkill = function (p, stat) {
  const base = p.base || .4, diff = (G.DIFFICULTY[this.o.difficulty] || { skill: 0 }).skill;
  const st = p.stat(stat || 'TEC');
  let chem = 1;
  if (p.chem !== undefined && p.chem !== 1) chem = p.chem;
  const s = (base * G.T.aiSkillMul + diff) * (.8 + .05 * st) * chem;
  return G.clamp(s, 0, 1);
};
/* a quality roll for an AI touch: PERFECT .10+.45s, GREAT .30, MISS max(.02, .16(1-s)), OK the rest */
G.Match.prototype.aiRoll = function (s) {
  const u = this.rng();
  const pPerfect = .10 + .45 * s, pMiss = Math.max(.02, .16 * (1 - s));
  if (u < pPerfect) return 'perfect';
  if (u < pPerfect + .30) return 'great';
  if (u > 1 - pMiss) return 'miss';
  return 'ok';
};
G.Match.prototype.aiMove = function (p, dt) {
  const pend = this.pendingFor(p);
  const sp = this.speedOf(p);
  if (pend && !p.dive) {
    const reactT = G.T.aiReaction * (1.2 - (p.skill || .5));
    if (this.t - (pend.created || 0) >= reactT) G.stepToward(p, pend.P[0], pend.P[1], sp, dt);
    return;
  }
  const h = this.home(p);
  G.stepToward(p, h[0], h[1], sp * .8, dt);
};
/* home positions: receiving deep, defending near the net, serving at the baseline */
G.Match.prototype.home = function (p) {
  const C = G.C, team = this.players.filter(q => q.side === p.side);
  const i = team.indexOf(p);
  const inCourt = this.lastTouch && this.lastTouch.side !== p.side;   // the ball is on the other side
  const baseX = p.side === 0 ? C.NET_X - 52 : C.NET_X + 52;
  const yy = i === 0 ? C.CY - 34 : C.CY + 34;
  if (this.phase === 'serve' && this.server === p) return [p.side === 0 ? C.X0 - 22 : C.X1 + 22, C.CY];
  if (this.phase === 'serve') return [p.side === 0 ? C.X0 + 36 : C.X1 - 36, yy];
  if (inCourt && this.L && this.L.tNet !== null && this.L.tNet > this.t) return [p.side === 0 ? C.NET_X - 40 : C.NET_X + 40, yy];
  return [baseX, yy];
};
/* the AI serves after a short wait: toss, then a press at a random error around the apex */
G.Match.prototype.aiServeStep = function (dt) {
  const s = this.server;
  if (!s || !s.ai) return;
  if (this.serveState === 'wait') {
    this.serveWait = (this.serveWait || this.rng() * 1.3 + 1.2) - dt;
    if (this.serveWait <= 0) { this.tossServe(s, false); }
  } else if (this.serveState === 'toss' && this.tossL && !this.tossPlan) {
    const sk = this.aiSkill(s, 'POW');
    const err = (this.rng() * 2 - 1) * (.18 * (1.2 - sk));
    this.tossPlan = { at: this.tossL.apexT + err, jump: this.rng() < (s.stat('POW') >= 8 ? .5 : .3) };
  } else if (this.serveState === 'toss' && this.tossPlan && this.t >= this.tossPlan.at) {
    const jump = this.tossPlan.jump; this.tossPlan = null;
    this.serveHit(s, jump ? 'shot' : 'play');
  }
};
G.Match.prototype.tossServe = function (s, jump) {
  const vz = jump ? 190 : 165;
  const L = G.launchMake({ t0: this.t, p: [s.x, s.y, 4], v: [0, 0, vz], kind: 'toss', side: s.side });
  L.apexT = this.t + Math.log(1 + vz * G.T.ballDrag / G.T.ballGravity) / G.T.ballDrag;
  this.tossL = L; this.serveState = 'toss'; this.tossPress = null; this.tossPlan = null; this.serveTossT = this.t;
  this.specialServe(s);
  if (s.human) this.tipFor('serve');
  s.act = 'toss'; s.actT = 0;
};
/* the AI judges a pending touch: a quality roll and the press time */
G.Match.prototype.aiTouchStep = function () {
  const pend = this.pending;
  if (!pend || !pend.p.ai || pend.judged) return;
  if (pend.aiAt === undefined) {
    const p = pend.p, s = this.aiSkill(p, pend.kind === 'bump' ? 'TEC' : pend.kind === 'set' ? 'TEC' : 'POW');
    pend.skill = s;
    pend.aiQ = this.aiRoll(s);
    // the House Edge shot: a partner who is a good friend covers the line
    if (this.houseEdgeLive && p.side === this.houseEdgeLive.side && (p.aff || 0) >= 60 && this.t - this.houseEdgeLive.t < 3) { pend.aiQ = 'perfect'; this.houseEdgeLive = null; this.callFloat(p, "I've got line!"); }
    const spread = { perfect: .02, great: .05, ok: .1, miss: .2 }[pend.aiQ];
    pend.aiAt = pend.ts + (this.rng() * 2 - 1) * spread;
  }
  if (this.t >= pend.aiAt) {
    pend.judged = true;
    const p = pend.p;
    let action = 'play';
    if (pend.kind === 'attack' && this.rng() < .2) action = 'shot';
    if (pend.kind === 'set' && this.rng() < .08) action = 'shot';
    if (pend.kind === 'bump' && this.rng() < .05) action = 'shot';
    const q = pend.aiQ;
    if (q === 'miss') { this.whiff(p, pend.kind); return; }
    this.popJudge(p, q);
    this.resolveTouch(p, pend, q, action);
  }
};
/* AI attack: the zone with most room from the defenders, with some variety */
G.Match.prototype.aiAim = function (p, kind) {
  if (kind === 'set') return { x: this.rng() * .6 - .3, y: this.rng() * .6 - .3 };
  const C = G.C, defs = this.players.filter(q => q.side !== p.side && !q.down);
  let best = null;
  const xs = [-.7, 0, .7], ys = [-.7, 0, .7];
  for (const ax of xs) for (const ay of ys) {
    const tx = (p.side === 0 ? C.NET_X + 60 + (ax + .7) * 60 : C.NET_X - 60 - (ax + .7) * 60) ;
    const ty = C.CY + ay * 50;
    let room = 1e9;
    for (const d of defs) room = Math.min(room, Math.hypot(d.x - tx, d.y - ty));
    room -= 8 * (1 - (p.skill || .5)) * (Math.abs(ty - C.Y0) < 10 || Math.abs(ty - C.Y1) < 10 ? 1 : 0);
    room += this.rng() * 10;
    if (!best || room > best.room) best = { room, x: ax, y: ay };
  }
  return { x: best.x, y: best.y };
};
/* AI blockers: while the other side attacks, a blocker near the net decides to jump */
G.Match.prototype.aiBlockDecide = function (L) {
  if (!L || L.tNet === null || L.blockDecided) return;
  L.blockDecided = true;
  const defSide = 1 - (L.side === undefined ? 0 : L.side);
  if (L.kind !== 'spike' && L.kind !== 'attack' && L.kind !== 'shot') return;
  const near = this.players.filter(q => q.side === defSide && q.ai && !q.down && Math.abs(q.x - G.C.NET_X) < 30);
  if (!near.length) return;
  const b = near[0];
  const sk = this.aiSkill(b, 'JMP');
  if (this.rng() < .3 + .4 * sk) {
    const err = (this.rng() * 2 - 1) * (.14 * (1.1 - sk));
    b.blockAt = L.tNet - G.T.blockRise + err;
    b.blockPlanned = true;
  }
};

/* ==== 24-match.js ==== */
/* 24-match: the match loop (phases, serves, rallies, net and landing events, blocks), the camera, the draw and the HUD.
 * One Match per game; the match scene (matchScene) hosts it and reads the human inputs. */
G.Match.prototype.rng = function () { return G.rng('match'); };
G.Match.prototype.setPhase = function (ph) { this.phase = ph; this.phaseT = 0; };
G.Match.prototype.enterServe = function () {
  this.setPhase('serve');
  this.lastTouch = null; this.L = null; this.pending = null; this.touches = [0, 0];
  this.server = this.pickServer(this.serveSide);
  this.serveState = 'wait'; this.serveWaitHuman = 0; this.tossL = null; this.tossPlan = null; this.serveWait = null;
  this.serveQ = null;
  const sp = this.server;
  for (const p of this.players) { p.act = 'ready'; p.actT = 0; p.dive = null; p.blockAt = null; p.missedId = null; p.jumpY = 0; const h = this.home(p); p.x = h[0]; p.y = h[1]; p.facing = p.side === 0 ? 0 : Math.PI; }
  sp.x = sp.side === 0 ? G.C.X0 - 22 : G.C.X1 + 22; sp.y = G.C.CY;
  sp.facing = sp.side === 0 ? 0 : Math.PI;
  this.servePos = [sp.x, sp.y];
  this.callText = { text: sp.human ? 'YOUR SERVE' : (sp.name + ' SERVES'), t: 1.4, side: sp.side };
  if (sp.human) this.serveAutoT = 10;
};
G.Match.prototype.serveInput = function (p, action) {
  if (this.serveState === 'wait') { this.tossServe(p, action === 'shot'); return; }
  if (this.serveState === 'toss') this.serveHit(p, action);
};
G.Match.prototype.step = function (dt) {
  if (this.phase === 'over') return;
  if (this.replay) { this.stepReplay(dt); return; }
  this.t += dt; this.phaseT += dt;
  for (const p of this.players) if (!p.down) this.updatePlayer(p, dt);
  this.handleInputs();
  switch (this.phase) {
    case 'intro': if (this.phaseT > 1.4) this.enterServe(); break;
    case 'serve': this.serveStep(dt); break;
    case 'rally': this.rallyStep(dt); break;
    case 'point': this.pointStep(dt); break;
  }
  if (this.callText) { this.callText.t -= dt; if (this.callText.t <= 0) this.callText = null; }
  this.tickPresentation(dt);
  for (const f of this.popups || []) f.t += dt;
  this.popups = (this.popups || []).filter(f => f.t < 1.4);
  this.updateRigs(dt);
  this.recordFrame();
  this.stepFx && this.stepFx(dt);
};
G.Match.prototype.handleInputs = function () {
  for (const p of this.players) {
    const I = p.human; if (!I || p.down) continue;
    if (I.pressed('play')) this.humanPress(p, 'play');
    if (I.pressed('shot')) this.humanPress(p, 'shot');
    if (I.pressed('dive')) this.humanPress(p, 'dive');
    if (I.pressed('call')) this.humanPress(p, 'call');
  }
};
G.Match.prototype.serveStep = function (dt) {
  const s = this.server;
  if (this.serveState === 'hit') { this.setPhase('rally'); return; }
  if (!s) return;
  if (s.ai) this.aiServeStep(dt);
  else if (this.serveState === 'wait') {
    this.serveWaitHuman += dt;
    if (this.serveWaitHuman > 10) this.tossServe(s, false), this.autoServeHuman = true;
  } else if (this.serveState === 'toss' && this.autoServeHuman && this.tossL && this.t >= this.tossL.apexT) {
    this.autoServeHuman = false; this.serveHit(s, 'play');
  }
  if (this.serveState === 'toss' && this.serveTossT !== undefined && this.t - this.serveTossT > 2.5) { this.serveFault(s); }
};
G.Match.prototype.serveFault = function (s) {
  this.point(1 - s.side, 'serveFault', 'timed out');
};
G.Match.prototype.rallyStep = function (dt) {
  const L = this.L;
  if (!L) { this.point(1 - (this.lastTouch ? this.lastTouch.side : this.serveSide), 'land', 'no ball'); return; }
  this.aiBlockDecide(L);
  const pend = this.pending;
  if (pend && pend.p.human) this.tipFor(pend.kind === 'bump' ? 'receive' : pend.kind === 'set' ? 'set' : 'spike');
  if (pend && pend.p.ai) this.aiTouchStep();
  else if (pend && !pend.judged && this.t > pend.ts + G.T.okWin * 1.2 + .05) {
    // the human did not press: auto-receive for a pass if on, else the ball goes by
    if (this.o.autoReceive && pend.kind === 'bump' && this.touches[pend.side] === 0) { pend.judged = true; this.resolveTouch(pend.p, pend, 'ok', 'play'); }
    else { pend.p.missedId = L.id; this.whiffPending(pend); }
  }
  if (this.phase !== 'rally') return;
  if (L.tNet !== null && !L.netDone && this.t >= L.tNet) { L.netDone = true; this.handleNet(L); if (this.phase !== 'rally') return; }
  if (this.L === L && L.tLand !== null && !L.landDone && this.t >= L.tLand) { L.landDone = true; this.handleLand(L); }
};
G.Match.prototype.whiffPending = function (pend) {
  const side = pend.side, p = pend.p;
  this.pending = null; p.planned = null;
  p.stats.whiffs = (p.stats.whiffs || 0) + 1;
  this.callFloat(p, p.human ? 'MISS' : '');
  // another player on the side may still get it
  this.planFor(side);
  if (this.pending && this.pending.p === p) this.pending = null;
};
G.Match.prototype.handleLand = function (L) {
  const c = G.landCourt(L);
  if (!c) return;
  const lt = this.lastTouch, kind = lt ? lt.kind : 'serve';
  if (!c.inside) {
    const loser = lt ? lt.side : this.server.side;
    if (kind === 'serve') return this.point(1 - loser, 'serveFault', 'out');
    return this.point(1 - loser, 'out', 'out');
  }
  if (kind === 'serve' && c.side !== this.server.side) return this.point(this.server.side, 'ace', 'ace');
  if (kind === 'block' && c.side === lt.side) return this.point(1 - c.side, 'block', 'stuffed');
  if ((kind === 'spike' || kind === 'attack') && c.side !== lt.side) return this.point(1 - c.side, 'kill', 'kill');
  return this.point(1 - c.side, 'land', 'landed');
};
G.Match.prototype.handleNet = function (L) {
  const C = G.C, att = L.side;
  let out = G.netOutcome(L);
  if (out === 'net' && this.luckyNow) { out = 'cord'; this.luckyNow = false; this.luckyForce = true; }
  const def = att === undefined || att < 0 ? 1 : 1 - att;
  // a block: a defender at the net, timed, with the hands in the ball's height
  if (att >= 0 && (L.kind === 'spike' || L.kind === 'attack' || L.kind === 'shot')) {
    for (const b of this.players) {
      if (b.side !== def || b.blockAt === null || b.down) continue;
      const err = (b.blockAt + G.T.blockRise) - L.tNet;
      const hands = Math.abs(err) <= G.T.okWin * ((G.DIFFICULTY[this.o.difficulty] || { assist: 1 }).assist);
      const near = Math.abs(L.netY - b.y) <= 9 + .6 * b.stat('JMP') + 6;
      const high = L.netZ >= C.NET_H - 4 && L.netZ <= C.NET_H + 26;
      if (hands && near && high) { this.doBlock(b, L, err); return; }
    }
    for (const b of this.players) b.blockAt = null;
  }
  if (out === 'antenna') return this.point(1 - this.lastTouch.side, 'antenna', 'antenna');
  if (out === 'net') return this.point(1 - (this.lastTouch ? this.lastTouch.side : att), 'net', 'net');
  if (out === 'cord') {
    const s = G.flightAt(L, L.tNet), sg = Math.sign(s.vx) || 1;
    const dest = 1 - att;
    if (this.luckyForce || this.rng() < G.T.netCordOver) {
      this.luckyForce = false;
      this.launch({ t0: this.t, p: [C.NET_X + sg * 1.5, L.netY, C.NET_H + 2], v: [s.vx * .35, s.vy * .5, 60 + (this.rng() * 40 - 20)], kind: L.kind, side: att, by: L.by });
      this.L.side = att; this.touches[dest] = 0; this.planFor(dest);
    } else {
      this.launch({ t0: this.t, p: [C.NET_X - sg * 1.5, L.netY, C.NET_H + 1], v: [s.vx * -.3, s.vy * .5, 10], kind: 'cord', side: att, by: L.by });
      this.L.side = att; this.planFor(att);
    }
    this.lastCord = this.t;
    this.callText = { text: 'TAPE!', t: .8, side: att };
  }
};
G.Match.prototype.doBlock = function (b, L, err) {
  const C = G.C, s = G.flightAt(L, L.tNet), att = L.side, def = b.side;
  const stuff = Math.abs(err) <= G.T.greatWin;
  this.lastBlocker = b;
  b.stats.blockTouches = (b.stats.blockTouches || 0) + 1;
  b.act = 'block'; b.actT = 0; b.lockT = .3;
  G.bus.emit('block', { p: b, stuff });
  const x0 = C.NET_X + (def === 1 ? 2 : -2);
  if (stuff) {
    this.launch({ t0: this.t, p: [x0, L.netY, C.NET_H + 6], v: [-.35 * s.vx, .3 * s.vy + (this.rng() * 40 - 20), -60], kind: 'stuff', side: def, by: b });
    this.L.side = def;
    this.touches[def] = 1; this.touches[att] = 0;
    this.lastTouch = { side: def, p: b, kind: 'block', t: this.t, blocked: true };
    this.callText = { text: 'BLOCK!', t: 1.2, side: def };
    this.planFor(att);
  } else {
    this.launch({ t0: this.t, p: [x0, L.netY, C.NET_H + 4], v: [(def === 1 ? 1 : -1) * 30, .2 * s.vy, 70], kind: 'soft', side: def, by: b });
    this.L.side = def;
    this.touches[def] = 1;
    this.lastTouch = { side: def, p: b, kind: 'block', t: this.t, blocked: true };
    this.planFor(def);
  }
  for (const q of this.players) q.blockAt = null;
};
G.Match.prototype.pointStep = function (dt) {
  if (this.phaseT < 2.2) return;
  if (this.over) { this.setPhase('over'); this.finish && this.finish(); return; }
  if (this.pendingSetEnd) { this.pendingSetEnd = false; this.score = [0, 0]; this.setNo++; this.callText = { text: 'SET ' + (this.sets[0] + this.sets[1]) + '', t: 1.2, side: this.setWinner }; }
  this.serveSide = this.pendingPoint ? this.pendingPoint.won : this.serveSide;
  this.enterServe();
};
/* whether a side has changed its serve after a point */
G.Match.prototype.onPoint = function (won, why) { this.serveSide = won; };

/* ==== 25-netplay.js ==== */
/* 25-netplay: the AI Hub session (shared-world). The host's copy runs the match on the hub's clock and sends snapshots
 * (12 a second), each launch and each point; the other copies send their player's presses and movement to the host and
 * draw the host's world. Seats: left = seats 0 and 2, right = seats 1 and 3; empty seats are CPUs.
 * Only the host calls finish(). Outside a session nothing here runs. */
G.inSession = function () { return typeof AIHub !== 'undefined' && !!AIHub.active; };
/* a remote player's input: the presses the host has been sent, and the last move the player sent */
G.RemoteInput = class {
  constructor() { this.pend = new Set(); this.mv = [0, 0]; this.lastDevice = 'keyboard'; this.map = {}; this.held = new Set(); }
  pressed(a) { return this.pend.has(a); }
  down(a) { return false; }
  repeat() { return false; }
  consume(a) { this.pend.delete(a); }
  move() { return this.mv; }
  label() { return ''; }
  clicked() { return null; }
  pointer() { return [0, 0]; }
  anyPressed() { return this.pend.size > 0; }
  clear() { this.pend.clear(); }
};
G.hub = { info: null, role: null, card: null, started: false, M: null, sendT: 0, ended: false, seatOf: {}, remote: {}, lastSnap: 0, mode: 'shared-world' };
G.hubScene = {
  enter() {
    const H = G.hub;
    this.bg = new E.Backdrop('dusk'); this.t = 0; this.card = null; this.box = G.box;
    H.started = false; H.ended = false; H.M = null; H.remote = {};
    G.game.lights.enabled = false;
    AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.game.go('title', {}); return; }
      H.info = info; H.role = info.isHost ? 'host' : 'client';
      AIHub.on('card', c => { this.card = c; });
      AIHub.on('start', () => { H.started = true; this.startAt = AIHub.time(); });
      AIHub.on('message', (d, from) => G.hubMessage(d, from));
      AIHub.on('leave', ev => { G.hubLeave(ev); });
      AIHub.on('time-up', () => { if (G.hub.M && G.hub.role === 'host') G.hubFinish('time-up'); });
      AIHub.on('end', ev => G.hubEnd(ev));
      AIHub.ready();
    });
  },
  update(dt) {
    const H = G.hub, I = G.game.input;
    this.t += dt;
    if (H.ended) return;
    if (!H.started) {
      // the card: Enter or Cross is Ready, Triangle or T asks for more time
      if (I.pressed('confirm')) AIHub.answer('ready');
      if (I.pressed('extra')) AIHub.answer('more');
      return;
    }
    if (!H.M) return G.hubBuildMatch();
    const M = H.M;
    M.t = AIHub.time() / 1000;
    if (H.role === 'host') {
      M.stepHub(dt);
      G.hubBroadcast(dt);
      if (M.over && M.phase === 'over') G.hubFinish('over');
    } else {
      G.hubClientInputs(dt);
      G.hubClientUpdate(dt);
    }
  },
  draw(r) {
    const H = G.hub;
    if (H.M && H.started) { this.drawWorld(r); return; }
    this.bg.draw(r);
    const c = this.card || { left: null, ready: [], paused: false, asking: 0, asked: false, starting: false };
    const info = H.info || { players: [] };
    r.overlay(g => {
      E.font.title(g, 'AHEAD OR ALIVE', r.W / 2, r.H * .12, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'] });
      E.font.text(g, 'Win the beach volleyball match: first to 7, by 2', r.W / 2, r.H * .12 + 34, '#fff8e8', { align: 'center', shadow: '#000' });
      info.players.forEach((p, i) => {
        const ready = (c.ready || []).includes(p.id);
        E.font.text(g, p.name, r.W / 2 - 120 + i * 80, r.H * .5, p.color || '#fff', { align: 'center', shadow: '#000' });
        E.font.text(g, ready ? 'READY' : '...', r.W / 2 - 120 + i * 80, r.H * .5 + 14, ready ? '#7cff9a' : '#9fd3d6', { align: 'center', shadow: '#000' });
      });
      if (c.left !== null && c.left !== undefined) E.font.text(g, 'Starts in ' + Math.ceil(c.left / 1000) + 's' + (c.paused ? ' · paused: more time' : ''), r.W / 2, r.H * .68, '#ffd36a', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Stick or WASD move · Cross or Space hit on time · Circle or Shift dive · Square or E shot', r.W / 2, r.H * .8, '#9fd3d6', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Ready'], ['extra', 'More time']]);
  },
  drawWorld(r) {
    const M = G.hub.M;
    this.bg.draw(r);
    G.courtMap().drawFloor(r); G.drawCourtSet(r, 'sunset'); G.drawNet(r);
    M.drawPlayers(r); M.drawBall(r);
    M.hud(r);
    r.overlay(g => { const info = G.hub.info; E.font.text(g, info.players.map(p => p.name).join(' · '), r.W / 2, r.H - 30, '#9fd3d6', { align: 'center', shadow: '#000' }); });
    if (G.hub.ended) r.overlay(g => { E.ui.box(g, r.W / 2 - 150, r.H / 2 - 40, 300, 80, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 }); E.font.text(g, G.hub.endText || 'Round over', r.W / 2, r.H / 2 - 24, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); });
  }
};
G.hubBuildMatch = function () {
  const H = G.hub, info = H.info, me = info.me;
  const seatIds = info.players.map(p => p.id);
  const teams = [[], []];
  const seatTeam = (i) => (i % 2 === 0 ? 0 : 1);
  // the fighters: shuffled with the hub's cast stream; signature suits everywhere
  const order = G.FIGHTERS.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(AIHub.rng('cast')() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const seatsByTeam = [[0, 2], [1, 3]];
  for (let t = 0; t < 2; t++) for (const seat of seatsByTeam[t]) {
    const human = seatIds.includes(seat);
    const id = order[seat];
    const inp = human ? (seat === me ? G.game.input : (H.remote[seat] = H.remote[seat] || new G.RemoteInput())) : null;
    teams[t].push({ id, human: inp, seat, suit: G.CAST[id].signature, base: .5, skill: .5 });
  }
  const court = info.seed % 2 ? 'sunset' : 'day';
  const o = { teams, pointsToWin: 7, setsToWin: 1, difficulty: 'normal', court, serveSide: 0, hub: true };
  if (H.role === 'host') {
    const M = G.createMatch(o);
    M.seatOf = {};
    M.players.forEach(p => { p.seat = seatOf(p, teams); });
    H.M = M;
    // the host's clock is the hub's: the step adds dt, so start one step earlier
    M.stepHub = function (dt) { this.t = AIHub.time() / 1000 - dt; this.step(dt); for (const k in H.remote) H.remote[k].pend.clear(); };
  } else {
    const M = G.createMatch(o);
    M.players.forEach(p => { p.seat = seatOf(p, teams); });
    M.stepHub = function () {};
    H.M = M;
  }
  G.game.setView(G.courtView());
  G.game.follow(null);
  G.music('spike');
};
function seatOf(p, teams) { for (const t of teams) for (const q of t) if (q.id === p.cast.id) return q.seat; return 0; }
/* the host's remote handler: the presses and moves its clients send, applied before each step */
G.hubMessage = function (d, from) {
  const H = G.hub;
  if (!d || typeof d !== 'object') return;
  if (H.role === 'host') {
    if (d.t === 'c') G.hubClaim(from, d);
    if (d.t === 'i') { const I = H.remote[from]; if (I) { for (const a of d.a || []) if (a === 'dive' || a === 'call') I.pend.add(a); if (d.m) I.mv = d.m; } }
    if (d.t === 'm') { const I = H.remote[from]; if (I) { I.mv = d.m || [0, 0]; if (typeof d.x === 'number' && typeof d.y === 'number' && isFinite(d.x) && isFinite(d.y)) I.pos = [d.x, d.y]; } }
    return;
  }
  // a client: the host's world
  if (d.t === 's') G.hubSnap(d);
  else if (d.t === 'b') G.hubLaunch(d);
  else if (d.t === 'e') G.hubEvent(d);
};
G.hubBroadcast = function (dt) {
  const H = G.hub, M = H.M; if (!M) return;
  H.sendT -= dt; if (H.sendT > 0) return; H.sendT = 1 / 12;
  const pl = M.players.map(p => [p.seat, +p.x.toFixed(1), +p.y.toFixed(1), +(p.facing || 0).toFixed(2), p.act, p.down ? 1 : 0]);
  AIHub.send({ t: 's', at: AIHub.time(), p: pl, sc: M.score.slice(), ph: M.phase, sv: M.server ? M.server.seat : 0, ll: M.L ? M.L.id : 0, tc: M.callText ? M.callText.text : '', pd: M.pending && !M.pending.judged ? { seat: M.pending.p.seat, ts: M.pending.ts, kind: M.pending.kind, P: M.pending.P.slice(0, 2) } : null }, { reliable: false });
  if (M.L && M.L.id !== H.lastLaunchId) { H.lastLaunchId = M.L.id; const L = M.L; AIHub.send({ t: 'b', t0: L.t0, p: L.p, v: L.v, k: L.k, g: L.g, kind: L.kind, id: L.id }); }
};
G.hubLaunch = function (d) {
  const H = G.hub, M = H.M; if (!M) return;
  M.L = G.launchMake({ t0: d.t0, p: d.p, v: d.v, k: d.k, g: d.g, kind: d.kind });
  M.L.id = d.id;
};
G.hubEvent = function (d) { const M = G.hub.M; if (M && d.text) M.callText = { text: d.text, t: 1.2 }; };
G.hubSnap = function (d) {
  const M = G.hub.M; if (!M) return;
  for (const row of d.p) {
    const p = M.players.find(q => q.seat === row[0]); if (!p) continue;
    if (p.seat === G.hub.info.me) continue;      // a client's own fighter is never overwritten
    p.x = row[1]; p.y = row[2]; p.facing = row[3]; p.act = row[4]; p.down = !!row[5];
  }
  M.score = d.sc.slice(); M.phase = d.ph;
  if (d.tc) M.callText = { text: d.tc, t: .8 };
  G.hub.plan = d.pd || null;
  M.server = M.players.find(q => q.seat === d.sv) || M.server;
};
G.hubClientInputs = function (dt) {
  const H = G.hub, I = G.game.input;
  const acts = ['dive', 'call'].filter(a => I.pressed(a));
  if (acts.length) AIHub.send({ t: 'i', a: acts, m: I.move() }, { reliable: true });
  for (const a of ['play', 'shot']) if (I.pressed(a)) G.hubClaimFor(a);
  const M = H.M, me = M && M.players.find(p => p.seat === H.info.me);
  if (me) {
    if (!H.me) H.me = { x: me.x, y: me.y };
    const m = I.move();
    if (m[0] || m[1]) {
      const d = G.game.view.screenDirToGround(m[0], m[1]), len = Math.min(1, Math.hypot(m[0], m[1])), sp = M.speedOf(me) * len;
      H.me.x += d[0] * sp * dt; H.me.y += d[1] * sp * dt; H.facing = Math.atan2(d[1], d[0]);
    }
    H.me.x = G.clamp(H.me.x, me.side === 0 ? 40 : G.C.NET_X + 6, me.side === 0 ? G.C.NET_X - 6 : 668);
    H.me.y = G.clamp(H.me.y, 112, 432);
    me.x = H.me.x; me.y = H.me.y; me.facing = H.facing || me.facing;
  }
  H.moveT = (H.moveT || 0) - dt;
  if (H.moveT <= 0) { H.moveT = 1 / 12; AIHub.send({ t: 'm', m: I.move(), x: H.me ? H.me.x : 0, y: H.me ? H.me.y : 0 }, { reliable: false }); }
};
/* a client's touch claim: judged here on the hub clock against the planned contact the host published */
G.hubClaimFor = function (action) {
  const H = G.hub, pl = H.plan, me = H.info && H.info.me;
  if (!pl || pl.seat !== me) return;
  const at = AIHub.time() / 1000, err = at - pl.ts;
  if (err < -.6 || err > G.T.okWin * 1.2 + .05) return;
  const assist = (G.DIFFICULTY[G.settingsOpts().difficulty] || { assist: 1 }).assist;
  const ae = Math.abs(err), q = ae <= G.T.perfectWin * assist ? 'perfect' : ae <= G.T.greatWin * assist ? 'great' : ae <= G.T.okWin * assist ? 'ok' : 'miss';
  if (q === 'miss') return;
  AIHub.send({ t: 'c', at, k: pl.kind, q, a: action }, { reliable: true });
};
/* the host's validation of a claim: the touch is still open, it is the seat's planned kind, the time is in the window
 * (the planned window with 120 ms for the network), the claimant is in reach of the contact; then the host plays it */
G.hubClaim = function (from, d) {
  const H = G.hub, M = H.M; if (!M || H.role !== 'host') return;
  const pd = M.pending; if (!pd || pd.judged || pd.p.seat !== from || pd.kind !== d.k) return;
  if (Math.abs(d.at - pd.ts) > G.T.okWin * 1.2 + .12 + .05) return;
  const P = pd.P, reach = Math.hypot(P[0] - pd.p.x, P[1] - pd.p.y);
  if (reach > G.T.reach + .4 * pd.p.stat('TEC') + 12) return;
  const q = ['perfect', 'great', 'ok'].includes(d.q) ? d.q : 'ok';
  pd.judged = true;
  M.resolveTouch(pd.p, pd, q, d.a === 'shot' ? 'shot' : 'play');
  H.claims = (H.claims || 0) + 1;
};
G.hubClientUpdate = function (dt) {
  const M = G.hub.M; if (!M) return;
  for (const p of M.players) { if (!p.rig) continue; p.rig.update(dt, G.rigStateFor(p)); }
  M.updateRigs && M.updateRigs(0);
};
G.hubFinish = function (why) {
  const H = G.hub, M = H.M; if (!M || H._finished) return; H._finished = true;
  const winner = M.over ? M.winner : (M.score[0] === M.score[1] ? null : (M.score[0] > M.score[1] ? 0 : 1));
  const humans = H.info.players.map(p => p.id);
  const left = M.players.filter(p => p.side === 0 && humans.includes(p.seat)).map(p => p.seat), right = M.players.filter(p => p.side === 1 && humans.includes(p.seat)).map(p => p.seat);
  const all = left.concat(right);
  const standings = (winner === null ? [all] : winner === 0 ? [left, right] : [right, left]).filter(a => a.length);
  const scores = {}; M.players.forEach(p => { scores[p.seat] = M.score[p.side]; });
  AIHub.finish({ standings, scores, won: winner === 0 ? true : winner === 1 ? false : undefined });
  if (why === 'time-up') H.endText = 'Time is up'; else H.endText = 'Final: ' + M.score.join(' - ');
  H.ended = true;
};
G.hubEnd = function (ev) {
  const H = G.hub; H.ended = true; H.endText = (ev && ev.reason === 'finished') ? 'Final standings shown on the hub' : 'Round over';
  G.music(null); H.M && (H.M.stepHub = function () {});
};
G.hubLeave = function (ev) { const H = G.hub; if (H.remote[ev.id]) { H.remote[ev.id].pend.clear(); } };

/* ==== 26-matchscene.js ==== */
/* 26-matchscene: the match as a game scene: its players and rigs, the world draw, the HUD and the prompts. */
G.Match.prototype.updateRigs = function (dt) {
  for (const p of this.players) {
    if (!p.rig) continue;
    if (p.act === 'highfive' && (p.actT || 0) > 1.4) p.act = 'celebrate';
    G.mocapSet(p.rig, G.mocapClipFor(p), p.actT || 0);
    p.rig.ikHand = this.ikFor(p);
    p.rig.update(dt, G.rigStateFor(p, { pose: p.dive ? null : undefined }));
  }
};
/* the hands' targets: arms up over the net for a block, the two partners' hands meeting for a high five, otherwise the ball */
G.Match.prototype.ikFor = function (p) {
  const C = G.C;
  if (G.VOLLEY[G.mocapClipFor(p)]) return null;   // the clip has the arms
  if (p.act === 'block' && (p.actT || 0) < .6) return [C.NET_X - p.x, 0, C.NET_H + 14];
  if (p.act === 'highfive' && (p.actT || 0) < 1.4) { const m = this.players.find(q => q !== p && q.side === p.side); if (m) return [(m.x - p.x) * .5, (m.y - p.y) * .5, 44]; }
  return G.ikTargetFor(p, this.L || (this.phase === 'serve' ? this.tossL : null), this.t);
};
G.Match.prototype.drawBall = function (r) {
  const L = this.L || (this.phase === 'serve' ? this.tossL : null); if (!L) return;
  const s = G.flightAt(L, this.t), C = G.C;
  const z = Math.max(0, s.z);
  r.shadow(s.x, s.y, 4 - Math.min(2, z * .03), .4);
  r.queue(s.x, s.y, z, g => {
    const q = r.w(s.x, s.y, z), rad = 3;
    E.px.disc(g, q[0], q[1], rad + .5, '#1a3a52');
    E.px.disc(g, q[0], q[1], rad, '#ffffff');
    E.px.disc(g, q[0] - 1, q[1] - 1, 1, '#ffd23a');
    E.px.rect(g, q[0] - 2, q[1], 4, 1, '#2a6fd0');
  }, { emissive: true, bias: 1 });
};
G.Match.prototype.drawPlayers = function (r) {
  for (const p of this.players) {
    if (!p.rig) continue;
    const rig = p.rig;
    r.shadow(p.x, p.y, 5, .35);
    r.actor(p.x, p.y, p.z + (p.jumpY || 0), (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: p });
    if (p.human && this.pendingFor(p)) {
      const pd = this.pendingFor(p);
    }
  }
};
/* the ring under the planned contact: shrinks toward the moment of the touch */
G.Match.prototype.drawTimingRings = function (r) {
  const pd = this.pending; if (!pd || !pd.p.human || pd.judged) return;
  if (this.dazzled(pd.p)) { if (!this.dazzleSaid) { this.dazzleSaid = true; this.callFloat(pd.p, 'DAZZLED!'); } return; }
  const u = G.clamp(1 - (pd.ts - this.t) / .8, 0, 1), rad = 22 - (22 - 10) * u;
  const inWindow = Math.abs(this.t - pd.ts) <= G.T.perfectWin * 1.5;
  r.queue(pd.P[0], pd.P[1], 0.5, g => {
    const q = r.w(pd.P[0], pd.P[1], 0.5);
    const col = inWindow ? '#ffd36a' : '#fff8e8';
    for (let a = 0; a < 24; a++) { const an = a / 24 * Math.PI * 2, x = q[0] + Math.cos(an) * rad * 1.6, y = q[1] + Math.sin(an) * rad * .9; E.px.rect(g, Math.round(x), Math.round(y), 1, 1, col); }
  }, { emissive: true, bias: -1 });
};
G.Match.prototype.hud = function (r) {
  const W = r.W, H = r.H;
  r.overlay(g => {
    // the TV score bug, top left
    const bx = 6, by = 6, bw = 128, bh = 36;
    E.ui.box(g, bx, by, bw, bh, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
    for (let s = 0; s < 2; s++) {
      const y = by + 4 + s * 15;
      const team = this.players.filter(p => p.side === s);
      const names = team.map(p => p.name).join(' / ');
      E.font.text(g, names, bx + 6, y + 2, '#fff8e8', { shadow: '#000' });
      E.font.text(g, String(this.score[s]), bx + bw - 6, y, s === (this.server ? this.server.side : -1) ? '#ffd36a' : '#fff8e8', { scale: 2, align: 'right', shadow: '#000' });
      if (this.server && this.server.side === s && this.phase !== 'point') E.px.disc(g, bx + bw - 26 + 0, y + 6, 2, '#ffd36a');
    }
    E.font.text(g, 'SET ' + (this.setNo || 1), bx + bw - 6, by + bh + 3, '#9fd3d6', { scale: 1, align: 'right', shadow: '#000' });
    // a short rally counter
    if (this.stats.rallyLen > 2) E.font.text(g, 'RALLY ' + this.stats.rallyLen, W - 8, 8, '#9fd3d6', { align: 'right', shadow: '#000' });
    // the big call
    if (this.callText) {
      const ct = this.callText, sz = 3;
      const tw = E.font.width(ct.text, { scale: sz });
      E.font.text(g, ct.text, W / 2 - tw / 2, H * .3, '#ffd36a', { scale: sz, shadow: '#000' });
    }
    // judgement popups above the players
    for (const f of this.popups || []) {
      const q = r.w(f.p.x, f.p.y, (f.p.z || 0) + 36);
      const yy = q[0] !== undefined ? q[1] - f.t * 14 : 0;
      const fx = (q[0] !== undefined ? q[0] : 0);
      E.font.text(g, f.text, fx, yy, f.col, { scale: 1, align: 'center', shadow: '#000' });
    }
  });
};
G.Match.prototype.promptItems = function () {
  const hp = this.players.find(p => p.human && !p.down);
  if (!hp) return [];
  const pd = this.pendingFor(hp);
  if (this.phase === 'serve' && this.server === hp) return this.serveState === 'toss' ? [['play', 'Hit at the top'], ['shot', 'Jump serve']] : [['play', 'Toss'], ['shot', 'Jump serve']];
  if (pd && !pd.judged) return [['play', pd.kind === 'bump' ? 'Bump' : pd.kind === 'set' ? 'Set' : 'Spike'], ['shot', pd.kind === 'attack' ? 'Shot' : 'Block / shot'], ['dive', 'Dive'], ['call', 'Call']];
  return [['dive', 'Dive'], ['call', 'Call']];
};
/* the match scene for the game */
G.matchScene = {
  enter(data) {
    const game = G.game, o = data.opts;
    this.o = o;
    this.M = G.createMatch(o);
    G.curMatch = this.M;
    this.bg = G.courtBackdrop(o.court || 'sunset');
    game.setView(G.courtView());
    game.follow(null); game.cam.bounds = null; game.cam.smooth = .18;
    G.music(o.music || 'spike');
    this.t = 0;
  },
  update(dt) {
    const M = this.M;
    if (!M) return;
    if (M.over && M.phase === 'over') return;
    if (M.players.some(p => p.human && p.human.pressed && p.human.pressed('view'))) { this.serveCam = !this.serveCam; G.game.setView(this.serveCam ? G.serveCamView() : G.courtView()); G.toast(this.serveCam ? 'Serve Cam' : 'Broadcast'); }
    M.step(dt);
    // the camera: the ball and the players, in shot
    const pts = [];
    if (M.L) { const s = G.flightAt(M.L, M.t); pts.push({ x: s.x, y: s.y, z: Math.max(0, s.z) }); }
    for (const p of M.players) pts.push({ x: p.x, y: p.y, z: 0 });
    pts.push({ x: G.C.NET_X, y: G.C.CY, z: G.C.NET_H });
    const C = G.C;
    pts.push({ x: C.X0 - 26, y: C.Y0 - 30, z: 0 }, { x: C.X1 + 26, y: C.Y1 + 30, z: 0 });
    if (pts.length) G.game.cam.frame(pts, { margin: 16, zoom: [.6, 1] });
  },
  draw(r) {
    const M = this.M;
    if (!M) return;
    this.bg.draw(r);
    G.courtMap().drawFloor(r);
    G.drawCourtSet(r, this.o.court || 'sunset');
    G.drawNet(r);
    M.drawTimingRings(r);
    if (M.replay) { this.bg.draw(r); G.courtMap().drawFloor(r); G.drawCourtSet(r, this.o.court || 'sunset'); G.drawNet(r); M.drawReplay(r); return; }
    M.drawPlayers(r);
    M.drawBall(r);
    M.hud(r);
    M.drawCommentary(r);
    const items = M.promptItems();
    if (items.length) G.promptBar(r, items);
  },
  back() { return false; }
};
G.courtView = function () { if (!G._courtView) G._courtView = new E.View('court', 'Broadcast', 0, 32, 1.5, 1); return G._courtView; };
G.serveCamView = function () { if (!G._serveCam) G._serveCam = new E.View('servecam', 'Serve Cam', 90, 46, 1.5, 1); return G._serveCam; };
/* build a Match from the options of a match scene: teams of { id, human, suit, acc, base, skill } */
G.settingsOpts = function () {
  const s = (G.game && G.game.settings) || {};
  const low = v => String(v || '').toLowerCase();
  return { difficulty: low(s.difficulty || 'Normal'), timingAssist: low(s.timingAssist || 'Normal'), autoReceive: !!s.autoReceive, timingRing: s.timingRing !== false };
};
G.createMatch = function (o) {
  o = Object.assign({}, G.settingsOpts(), o);
  const M = new G.Match(o);
  const C = G.C;
  let k = 0;
  o.teams.forEach((team, side) => team.forEach((pd, slot) => {
    const cast = G.CAST[pd.id] || G.STAFF[pd.id];
    const x = side === 0 ? C.X0 + 40 : C.X1 - 40, y = slot === 0 ? C.CY - 34 : C.CY + 34;
    const p = G.makePlayer({ id: 'p' + (k++), cast, side, slot, x, y, human: pd.human || null, skill: pd.skill, base: pd.base || .4, chem: pd.chem || 1 });
    p.suit = pd.suit || cast.signature || null; p.acc = pd.acc || []; p.aff = pd.aff || 0;
    p.rig = G.rigFor(pd.id, { suit: p.suit, acc: p.acc });
    p.human = pd.human || null; p.ai = !pd.human;
    M.players.push(p);
  }));
  M.serveSide = o.serveSide === undefined ? 0 : o.serveSide;
  M.setPhase('intro');
  M.setupDone = true;
  return M;
};

/* ==== 27-presentation.js ==== */
/* 27-presentation: Sonny's commentary on the big moments, Pepper's tutorial tips in the welcome match, and the specials of
 * the final against The House: Golden Glare (Sonny's serves dazzle the receiver, sunglasses are immune), House Edge (one
 * precise line shot per set from Pepper) and Lucky Seven (Sonny's first attack at game point clips the tape and dribbles over). */
G.Match.prototype.commentate = function (key) {
  if (this.o.commentary === false) return;
  const text = G.callLine(key);
  if (!text) return;
  this.commentary = { text, t: 2.6 };
};
G.Match.prototype.tipFor = function (key) {
  if (!this.o.tutorial) return;
  this.tipsSeen = this.tipsSeen || {};
  if (this.tipsSeen[key]) return;
  this.tipsSeen[key] = true;
  const map = { receive: 0, set: 1, spike: 2, serve: 3, block: 4, dive: 5, call: 6, chem: 7 };
  const idx = map[key];
  if (idx === undefined) return;
  const txt = G.LINES.pepper.tips[idx].replace(/\{play\}/g, G.keyLabelFor('play')).replace(/\{shot\}/g, G.keyLabelFor('shot')).replace(/\{dive\}/g, G.keyLabelFor('dive')).replace(/\{call\}/g, G.keyLabelFor('call'));
  this.hint = { text: txt, t: 7 };
};
G.keyLabelFor = function (action) {
  const I = G.game.input, dev = G.devOf(I);
  const code = G.boundCode(I, action, dev === 'kbm' ? 'kbm' : 'pad') || G.boundCode(I, action, 'kbm') || G.boundCode(I, action, 'pad');
  if (!code) return action.toUpperCase();
  if (code.startsWith('Pad')) { const k = G.padIndex(code); return k <= 3 ? G.PAD_SYMBOL[G.padStyle()][k] : (G.PAD_PILL[k] || 'PAD'); }
  return G.keyName(code);
};
G.Match.prototype.hasShades = function (p) { return (p.acc || []).some(a => G.ACCESSORIES[a] && G.ACCESSORIES[a].shades); };
/* specials: called as serves are made and at each touch */
G.Match.prototype.specialServe = function (s) {
  if (this.o.story !== 'final' || s.id !== 'sonny') return;
  this.glare = null;
  if (this.rng() < .5) { this.glare = { t: this.t, server: s }; G.sfx('glare'); this.callFloat(s, 'GLARE!'); }
};
G.Match.prototype.specialTouch = function (p, kind, o) {
  if (this.o.story !== 'final') return o;
  if (p.id === 'pepper' && kind === 'attack' && this.setNo !== undefined) {
    this.houseEdge = this.houseEdge || {};
    if (!this.houseEdge[this.setNo]) { this.houseEdge[this.setNo] = true; o.deep = true; o.shot = false; this.callText = { text: 'HOUSE EDGE!', t: 1.2, side: p.side }; this.houseEdgeLive = { side: 1 - p.side, t: this.t }; }
  }
  if (p.id === 'sonny' && kind === 'attack' && this.score && this.score[p.side] >= this.pointsToWin - 1 && !this.luckyUsed) {
    this.luckyUsed = true; this.luckyNow = true; this.callText = { text: 'LUCKY SEVEN!', t: 1.2, side: p.side };
  }
  return o;
};
/* the timing ring is hidden for a dazzled receiver (not one in sunglasses) */
G.Match.prototype.dazzled = function (p) {
  const g = this.glare; if (!g || !p || !p.human) return false;
  return !this.hasShades(p) && this.pending && this.pending.p === p && this.t < this.pending.ts + .5;
};
/* the commentary and the hint, drawn over the court */
G.Match.prototype.drawCommentary = function (r) {
  const W = r.W, H = r.H;
  if (this.commentary && this.commentary.t > 0) {
    const txt = this.commentary.text;
    r.overlay(g => { const w = Math.min(W - 40, E.font.width(txt, { scale: 1 }) + 14); const x = W - w - 8, y = H - 96; E.ui.box(g, x, y, w, 18, { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', alpha: .92 }); E.font.text(g, txt, x + 7, y + 5, '#fff8e8', { scale: 1, shadow: '#000' }); });
  }
  if (this.hint && this.hint.t > 0) {
    const lines = G.wrapText(this.hint.text, 200, 1);
    r.overlay(g => { E.ui.box(g, 8, H - 120, 214, 12 + lines.length * 10, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 }); lines.forEach((l, i) => E.font.text(g, l, 14, H - 114 + i * 10, '#fff8e8', { scale: 1, shadow: '#000' })); });
  }
};
G.Match.prototype.tickPresentation = function (dt) {
  if (this.commentary) this.commentary.t -= dt;
  if (this.hint) this.hint.t -= dt;
};

/* ==== 28-replay.js ==== */
/* 28-replay: highlight replays. The last six seconds are kept (every frame at 60 Hz). After an ace, a stuffed block or a rally
 * of eight touches or more (at most one every three points, and never in a hub session), the last three seconds replay at
 * 0.4 speed with a letterbox and the serve camera. Any button skips it. The replay plays the recorded states back; nothing
 * in the live match moves while it plays. */
G.Match.prototype.recordFrame = function () {
  if (this.replay || this.o.hub) return;
  this.hist = this.hist || [];
  if (this.hist.length && this.t - this.hist[this.hist.length - 1].t < 1 / 60 - 1e-6) return;
  this.hist.push({ t: this.t, L: this.L, tossL: this.tossL, pl: this.players.map(p => ({ x: p.x, y: p.y, facing: p.facing, vx: p.vx, vy: p.vy, act: p.act, actT: p.actT, down: p.down, jumpY: p.jumpY || 0, dive: p.dive ? 1 : 0, diveT: p.diveT || 0 })) });
  while (this.hist.length && this.t - this.hist[0].t > 6) this.hist.shift();
};
G.Match.prototype.maybeReplay = function (why) {
  if (this.o.hub || this.replay) return;
  const big = why === 'ace' || why === 'block' || why === 'stuffed' || (this.stats.rallyLen >= 8);
  if (!big) return;
  if (this.lastReplayAt !== undefined && this.stats.points[0] + this.stats.points[1] - this.lastReplayAt < 3) return;
  if (!this.hist || this.hist.length < 60) return;
  this.lastReplayAt = this.stats.points[0] + this.stats.points[1];
  this.replayCount = (this.replayCount || 0) + 1;
  const end = this.t, start = Math.max(this.hist[0].t, end - 3);
  this.replay = { from: start, t: start, end, rate: .4, cam: G.serveCamView(), frames: this.hist.filter(f => f.t >= start - 1e-6) };
  this.replayHit = why;
  if (G.game) G.game.setView(this.replay.cam);
  this.commentate && this.commentate('ace');
};
G.Match.prototype.replayFrame = function (t) {
  const fr = this.replay.frames; let lo = 0, hi = fr.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (fr[m].t <= t) lo = m; else hi = m - 1; }
  return fr[lo];
};
G.Match.prototype.stepReplay = function (dt) {
  const R = this.replay, I = this.players.find(p => p.human);
  R.t += dt * R.rate;
  const skip = this.players.some(p => p.human && p.human.anyPressed && p.human.anyPressed());
  if (skip || R.t >= R.end) this.endReplay();
};
G.Match.prototype.endReplay = function () {
  this.replay = null;
  if (G.game) G.game.setView(G.courtView());
};
/* draws the recorded frame at the replay's time: the live positions are saved and put back */
G.Match.prototype.drawReplay = function (r) {
  const R = this.replay, f = this.replayFrame(R.t); if (!f) return;
  const saved = { t: this.t, L: this.L, players: this.players.map(p => [p.x, p.y, p.facing, p.vx, p.vy, p.act, p.actT, p.down, p.jumpY, p.dive, p.diveT]) };
  this.t = R.t; this.L = f.L;
  f.pl.forEach((s, i) => { const p = this.players[i]; Object.assign(p, { x: s.x, y: s.y, facing: s.facing, vx: s.vx, vy: s.vy, act: s.act, actT: s.actT, down: s.down, jumpY: s.jumpY, dive: s.dive ? { x: 0, y: 0 } : null, diveT: s.diveT }); });
  this.updateRigs(0);
  this.drawPlayers(r); this.drawBall(r);
  this.players.forEach((p, i) => { const v = saved.players[i]; Object.assign(p, { x: v[0], y: v[1], facing: v[2], vx: v[3], vy: v[4], act: v[5], actT: v[6], down: v[7], jumpY: v[8], dive: v[9], diveT: v[10] }); });
  this.t = saved.t; this.L = saved.L;
  const W = r.W, H = r.H;
  r.overlay(g => {
    E.px.rect(g, 0, 0, W, 16, '#000'); E.px.rect(g, 0, H - 16, W, 16, '#000');
    E.font.text(g, 'REPLAY', W - 8, 4, '#ff5fa2', { align: 'right', shadow: '#000' });
  });
};

/* ==== 30-vacation.js ==== */
/* 30-vacation: the vacation's state and rules: days and slots, weather, moods, schedules and teams, affinity, gifts,
 * team-ups, money, the day's end, and the saves. All of it is data in G.state (JSON-safe). */
G.newState = function (o) {
  o = o || {};
  const seed = (o.seed || ((Date.now() ^ 0x5bd1e995) >>> 0) || 1) >>> 0;   // (a new vacation's seed: the clock, once)
  const st = {
    v: 1, seed, day: 1, slot: 0, weather: [], me: o.me || 'rin', money: G.T.startMoney, chips: 0,
    wardrobe: { suits: [G.CAST[o.me || 'rin'].signature], acc: G.CAST[o.me || 'rin'].starts.acc.slice() },
    wearing: { suit: G.CAST[o.me || 'rin'].signature, acc: G.CAST[o.me || 'rin'].starts.acc.slice() },
    npcWear: {}, bag: {}, aff: {}, mood: {}, known: {}, partner: null, nAff: {}, record: {},
    flags: {}, chatted: {}, gifted: {}, album: [], titlePostcard: null, sched: {}, teams: [], tutorial: !o.skipTutorial,
    stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0, photos: 0, earned: 0, spent: 0, suitsOwned: 0 },
    day_stats: { earned: 0, spent: 0, matches: 0, wins: 0 }, shopDeals: {}, letters: {}, lost: false, ended: null
  };
  for (const f of G.FIGHTERS) {
    if (f === st.me) continue;
    st.aff[f] = G.affStart(st.me, f);
    st.mood[f] = 'Normal';
    st.npcWear[f] = { suit: G.CAST[f].signature, acc: G.CAST[f].starts.acc.slice() };
  }
  for (const a of G.FIGHTERS) for (const b of G.FIGHTERS) if (a < b) st.nAff[a + '|' + b] = G.affStart(a, b);
  st.weather = [G.DAY_START_WEATHER(1, G.rngFn('world'))];
  G.state = st;
  G.resetStreams(seed);
  G.startDay(st);
  return st;
};
G.nAffKey = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
G.affOf = function (npc) { return G.state.aff[npc] || 0; };
G.stageIdx = function (aff) { return G.stageIndex(aff); };
G.stageName = function (aff) { return G.stageOf(aff).name; };
G.clampAff = (v) => Math.max(0, Math.min(100, Math.round(v)));
G.addAff = function (npc, delta) {
  const st = G.state; const before = st.aff[npc] || 0; const d = delta > 0 ? delta * G.T.affinityGainMul : delta;
  st.aff[npc] = G.clampAff(before + d);
  const bs = G.stageIndex(before), as = G.stageIndex(st.aff[npc]);
  if (as > bs) G.bus.emit('affinity', { npc, up: true, stage: as });
  if (as < bs) G.bus.emit('affinity', { npc, up: false, stage: as });
  return st.aff[npc] - before;
};
G.weatherNow = function () { return G.state.weather[G.state.day - 1] || 'sunny'; };
/* the day's start: weather, moods, schedules, teams, shop deals, letters */
G.startDay = function (st) {
  const rng = G.rngFn('world');
  if (!st.weather[st.day - 1]) st.weather[st.day - 1] = G.DAY_START_WEATHER(st.day, rng);
  const wx = st.weather[st.day - 1];
  // moods: 35/45/20 with the weather in mind
  for (const f of G.NPCS) {
    if (f === st.me) continue;
    const r = rng(); let m = r < .35 ? 'Happy' : r < .8 ? 'Normal' : 'Gloomy';
    const wt = G.WEATHER_TASTE[f];
    const liked = wt && wt.likes.includes(wx === 'golden' ? 'sunny' : wx), disliked = wt && wt.dislikes.includes(wx);
    if (liked && m !== 'Happy') m = m === 'Gloomy' ? 'Normal' : 'Happy';
    if (disliked && m !== 'Gloomy') m = m === 'Happy' ? 'Normal' : 'Gloomy';
    st.mood[f] = m;
  }
  // schedules: each NPC picks a place per slot; NPCs on the beach are paired by the teams
  st.sched = {};
  for (let s = 0; s < 3; s++) {
    st.sched[s] = {};
    const names = s === 2 ? ['casino', 'away'] : ['beach', 'pool', 'promenade', 'away'];
    for (const f of G.NPCS) {
      if (f === st.me) continue;
      const w = G.SCHED[f][G.SLOTS[s].toLowerCase()];
      const mul = names.map((n, i) => (w[i] || 0) * (wx === 'rain' ? (G.rainMul[n] || 1) : 1));
      const tot = mul.reduce((a, b) => a + b, 0) || 1;
      let r = rng() * tot, pick = names[0];
      for (let i = 0; i < names.length; i++) { r -= mul[i]; if (r <= 0) { pick = names[i]; break; } }
      st.sched[s][f] = pick;
    }
    // the partner is not scheduled: she jogs over when you open the Match Board
    if (st.partner) st.sched[s][st.partner] = 'partner';
    // at least one pair at the beach each daytime slot
    if (s < 2 && !Object.values(st.sched[s]).includes('beach')) st.sched[s][G.NPCS.find(f => f !== st.me && f !== st.partner)] = 'beach';
  }
  // teams: pair the NPCs (not the partner) by affinity with noise; prefer not repeating yesterday's pairs
  const free = G.NPCS.filter(f => f !== st.me && f !== st.partner);
  const pairs = [];
  let pool = free.slice();
  while (pool.length >= 2) {
    let best = null;
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i], b = pool[j];
      const sc = (st.nAff[G.nAffKey(a, b)] || 20) + (rng() * 20 - 10) - (st.lastPairs && st.lastPairs.includes(G.nAffKey(a, b)) ? 6 : 0);
      if (!best || sc > best.sc) best = { sc, a, b };
    }
    pairs.push([best.a, best.b]); pool = pool.filter(x => x !== best.a && x !== best.b);
  }
  st.teams = pairs;
  st.lastPairs = pairs.map(p => G.nAffKey(p[0], p[1]));
  // the shops' daily deals: two items at 25% off in each shop
  st.shopDeals = {};
  for (const sh of Object.keys(G.SHOPS)) {
    const list = G.itemsForShop(sh, st.day);
    const all = list.suits.concat(list.acc, list.gifts);
    const deals = [];
    while (deals.length < 2 && all.length) { const i = Math.floor(rng() * all.length); deals.push(all.splice(i, 1)[0]); }
    st.shopDeals[sh] = deals;
  }
  st.slot = 0;
  st.day_stats = { earned: 0, spent: 0, matches: 0, wins: 0, gifts: 0 };
  G.bus.emit('dayStart', { day: st.day });
};
G.slotNPC = function (npc, slot) {
  const st = G.state, p = st.sched[slot] && st.sched[slot][npc];
  return p || 'away';
};
/* the NPCs at a place now */
G.npcsAt = function (place, slot) {
  const st = G.state, out = [];
  for (const f of G.NPCS) {
    if (f === st.me) continue;
    if (f === st.partner && place === 'beach') continue;
    if (G.slotNPC(f, slot) === place) out.push(f);
  }
  return out;
};
/* a chat: +2 the first of the day, +1 after that, once per slot per NPC */
G.chatWith = function (npc) {
  const st = G.state, key = st.day + ':' + G.state.slot + ':' + npc;
  if (st.chatted[key]) return 0;
  st.chatted[key] = true;
  const firstToday = !Object.keys(st.chatted).some(k => k.indexOf(st.day + ':') === 0 && k !== key && k.endsWith(':' + npc));
  return G.addAff(npc, firstToday ? 2 : 1);
};
/* the gift's reaction: taste + stage + mood, against the threshold */
G.giftReaction = function (npc, gift) {
  const st = G.state, taste = G.GIFT_TASTE[gift][npc];
  const tv = G.TASTE_VALUE[taste] || 0;
  const aff = st.aff[npc] || 0, stage = G.stageIndex(aff);
  const stageBonus = stage >= 4 ? 2 : stage >= 2 ? 1 : 0;
  const moodV = (G.MOOD[st.mood[npc]] || { value: 0 }).value;
  const score = tv + stageBonus + moodV;
  const level = taste === 'L' ? 'love' : taste === '+' ? 'like' : taste === '.' ? 'neutral' : 'dislike';
  return { taste, score, accepted: score >= G.T.giftThreshold, level, mood: st.mood[npc] };
};
G.giveGift = function (npc, gift) {
  const st = G.state;
  if (!st.bag[gift]) return null;
  const once = st.day + ':' + st.slot + ':' + npc;
  if (st.gifted[once]) return { already: true };
  st.gifted[once] = true;
  const r = G.giftReaction(npc, gift);
  st.known[npc] = st.known[npc] || {};
  st.known[npc][gift] = r.level;
  st.bag[gift]--; if (st.bag[gift] <= 0) delete st.bag[gift];
  st.stats.gifts++; st.day_stats.gifts = (st.day_stats.gifts || 0) + 1;
  if (r.accepted) {
    G.addAff(npc, { love: 12, like: 6, neutral: 2 }[r.level] || 0);
    if (r.level === 'love' || r.level === 'like') st.stats.hearts = (st.stats.hearts || 0) + 1;
  } else {
    if (r.level === 'dislike') G.addAff(npc, -6);
    st.bag[gift] = (st.bag[gift] || 0) + 1;   // refused: it comes back to the bag
  }
  G.bus.emit('gift', { npc, gift, r });
  return r;
};
/* a team-up: accepted at the invite threshold, which moves with her mood */
G.inviteOK = function (npc) {
  const st = G.state, mood = st.mood[npc];
  let th = G.T.inviteThreshold + (mood === 'Happy' ? -10 : mood === 'Gloomy' ? 10 : 0);
  if (st.partner && st.partner !== npc) th = th;
  return (st.aff[npc] || 0) >= th;
};
G.setPartner = function (npc) {
  const st = G.state;
  const old = st.partner;
  st.partner = npc;
  if (old && old !== npc) G.addAff(old, -4);
  return old;
};
/* the money: earned and spent, counted for the day's summary */
G.earn = function (amount, why) { const st = G.state; const a = Math.round(amount); st.money += a; st.stats.earned += a; st.day_stats.earned += a; if (why) G.bus.emit('purchase', { earned: a, why }); };
G.spend = function (amount) { const st = G.state; const a = Math.round(amount); st.money -= a; st.stats.spent += a; st.day_stats.spent += a; G.bus.emit('purchase', { spent: a }); };
G.canSpend = (a) => G.state.money >= a;
/* a slot ends: the time moves on; at the end of the night, the day ends */
G.advanceSlot = function () {
  const st = G.state;
  G.bus.emit('slotEnd', { slot: st.slot });
  st.slot++;
  if (st.slot > 2) { st.slot = 2; return 'dayEnd'; }
  return 'next';
};
/* sleep: the day's end, the drift of affinity for NPCs you didn't talk to, the pairs' record, a new day */
G.endDay = function () {
  const st = G.state, rng = G.rngFn('world');
  for (const f of G.NPCS) {
    if (f === st.me) continue;
    const talked = Object.keys(st.chatted).some(k => k.indexOf(st.day + ':') === 0 && k.endsWith(':' + f));
    if (!talked) {
      const base = G.affStart(st.me, f);
      const cur = st.aff[f];
      const drift = G.T.affinityDecay * (cur > base ? -1 : 1);
      st.aff[f] = G.clampAff(cur + (Math.abs(cur - base) <= G.T.affinityDecay ? base - cur : drift));
    }
  }
  // the pairs play each other off-screen: one result per pair, from skills
  for (const [a, b] of st.teams) {
    const sa = (G.CAST[a].stats.POW + G.CAST[a].stats.TEC) + rng() * 6, sb = (G.CAST[b].stats.POW + G.CAST[b].stats.TEC) + rng() * 6;
    const key = a + '+' + b; st.record[key] = st.record[key] || [0, 0];
    if (sa >= sb) st.record[key][0]++; else st.record[key][1]++;
  }
  // a partner who lost that day and is not close leaves
  if (st.partner && st.partner !== null) {
    const pa = st.partner;
    if (st.day_stats.lostToday && (st.aff[pa] || 0) < 35) { st.partner = null; G.toast((G.CAST[pa] || {}).short + ' left the team.'); }
  }
  st.day_stats.summary = { earned: st.day_stats.earned, spent: st.day_stats.spent, matches: st.day_stats.matches, wins: st.day_stats.wins };
  st.lastDay = st.day_stats;
  st.day++;
  st.slot = 0;
  if (st.day > G.DAYS) return 'finale';
  st.weather[st.day - 1] = G.DAY_START_WEATHER(st.day, rng);
  G.startDay(st);
  return 'next';
};
/* a finished match's outcome for the vacation: team results, partner and rival affinity, prize */
G.matchResult = function (won, margin, partner, opp) {
  const st = G.state;
  st.stats.matches++; st.day_stats.matches++;
  if (won) { st.stats.wins++; st.day_stats.wins++; }
  else st.day_stats.lostToday = true;
  if (partner && partner !== st.me) G.addAff(partner, won ? 6 : -2);
  for (const o of opp || []) { if (won && o) G.addAff(o, -3); }
  const prize = won ? 12000 + 3000 * st.day + 1000 * margin : 3000;
  G.earn(prize * G.T.prizeMul, 'match');
  return prize;
};
/* saves: the vacation is the save's data */
G.saveVacation = function () { return G.state ? JSON.parse(JSON.stringify(G.state)) : null; };
G.loadVacation = function (data) { G.state = data; G.resetStreams(data.seed); return G.state; };

/* ==== 31-map.js ==== */
/* 31-map: the island map. Pins for the places (closed ones greyed, the Dock for departures only); the stick jumps between
 * pins; confirm opens the location card and travels; the header shows the clock, the money and the day's weather. */
G.mapScene = {
  enter(data) {
    const st = G.state;
    this.afterLocation = !!(data && data.afterLocation);
    if (this.afterLocation) {
      const r = G.advanceSlot();
      if (r === 'dayEnd') return G.game.go('dayend', {});
    }
    G.game.audio.music && G.music('island');
    G.game.setView(E.VIEWS.iso);
    this.bg = new E.Backdrop('day');
    this.items = G.PLACE_ORDER.map(id => ({ id, label: G.PLACES[id].name }));
    this.list = new G.List({ items: this.buildItems(), x: 14, y: 52, w: 150, rowH: 22, max: 6, scale: 1 });
    this.card = null;
    const ev = G.storyDue && G.storyDue('map');
    if (ev) G.game.go('story', { event: ev });
    if (G.state.slot === 0 && !G.state.dayAnnounced) { G.state.dayAnnounced = G.state.day; G.toast('Day ' + G.state.day + ' · ' + G.WEATHER_LABEL[G.weatherNow()]); G.sfx('daystart'); }
  },
  isOpen(id) {
    const P = G.PLACES[id], slot = G.SLOTS[G.state.slot].toLowerCase();
    if (P.storyOnly) return false;
    return P.open.includes(slot);
  },
  buildItems() {
    return G.PLACE_ORDER.map(id => {
      const P = G.PLACES[id], open = this.isOpen(id);
      return { label: P.name, disabled: !open, id, sub: open ? P.blurb : (P.storyOnly ? 'Departures only' : 'Closed right now'), onPick: () => { if (open) G.game.go('location', { place: id }); else G.sfx('ui_error'); } };
    });
  },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('bag') || I.pressed('alt')) { G.game.go('journal', { back: 'map' }); return; }
    if (I.pressed('extra')) { G.game.go('journal', { back: 'map', tab: 'friends' }); return; }
    if (I.pressed('cancel') || I.pressed('pause')) { /* the pause menu handles pause */ }
    this.list.items = this.buildItems();
    const pick = this.list.update(I, dt);
    if (pick && pick.item && pick.item.onPick && !pick.item.disabled) { /* picked */ }
    const it = this.list.items[this.list.i]; this.card = it ? G.PLACES[it.id] : null;
  },
  draw(r) {
    const st = G.state, W = r.W, H = r.H;
    this.bg.draw(r);
    r.overlay(g => {
      // the island: a rough outline with pins on it
      const cx = W * .62, cy = H * .52, rx = W * .34, ry = H * .36;
      const pts = [];
      for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2, wob = 1 + .08 * Math.sin(a * 5) + .05 * Math.cos(a * 3); pts.push([cx + Math.cos(a) * rx * wob, cy + Math.sin(a) * ry * wob]); }
      E.px.poly(g, pts, '#2f8f4e');
      const inner = pts.map(p => [cx + (p[0] - cx) * .92, cy + (p[1] - cy) * .92]);
      E.px.poly(g, inner, G.SHOW_NIGHT ? '#3a6a4a' : '#5fc35a');
      E.px.poly(g, pts.map(p => [cx + (p[0] - cx) * .98, cy + (p[1] - cy) * .98]).slice(0, 0), '#000');
      E.px.disc(g, cx + rx * .45, cy - ry * .55, 7, '#c8502c');
      E.px.disc(g, cx + rx * .45, cy - ry * .55, 3, '#3a2014');
      for (const id of G.PLACE_ORDER) {
        const P = G.PLACES[id], px = W * P.pin[0] * .55 + W * .2, py = H * P.pin[1] * .75 + H * .12;
        const open = this.isOpen(id), focused = this.list.items[this.list.i] && this.list.items[this.list.i].id === id;
        E.px.disc(g, px, py, focused ? 6 : 4, open ? (focused ? '#ffd36a' : '#fff8e8') : '#6a7a7e');
        if (focused) E.px.disc(g, px, py, 2, '#1a1a24');
        E.font.text(g, P.name, px + 7, py - 4, open ? '#fff8e8' : '#8aa0a4', { shadow: '#000', scale: 1 });
      }
    });
    this.list.draw(r);
    r.overlay(g => {
      E.ui.box(g, W - 170, 6, 164, 30, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
      E.font.text(g, G.SLOTS[st.slot] + ' · Day ' + st.day, W - 162, 12, '#fff8e8', { shadow: '#000' });
      E.font.text(g, G.WEATHER_LABEL[G.weatherNow()], W - 162, 23, '#9fd3d6', { shadow: '#000' });
      E.font.text(g, G.fmtMoney(st.money), W - 8, 12, '#ffd36a', { align: 'right', scale: 2, shadow: '#000' });
    });
    const card = this.card;
    if (card) r.overlay(g => {
      E.ui.box(g, 14, H - 62, W - 28, 44, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      E.font.text(g, card.name, 22, H - 56, '#ffd36a', { scale: 2, shadow: '#000' });
      E.font.text(g, card.blurb, 22, H - 36, '#fff8e8', { shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Go'], ['alt', 'Journal'], ['extra', 'Friends']]);
  }
};
G.storyDue = function (where) { return G.storyPending ? G.storyPending(where) : null; };

/* ==== 32-location.js ==== */
/* 32-location: a walkable place (the beach, the pool, the promenade, the villa, the casino floor). The hero is a Body on the
 * place's TileMap; NPCs present stand at their spots; interactables open their screens; talk, gifts, team-ups and the
 * Match Board run from the talk menu. Leaving ends the slot. */
G.placeMap = function (id) {
  G._maps = G._maps || {};
  if (G._maps[id]) return G._maps[id];
  const P = G.PLACES[id];
  const floorTex = (x, y, tag) => {
    const n = (Math.sin(x * .41) * Math.cos(y * .33) + 1) * 3;
    if (tag === 'sea' || tag === 'pool') return [18 + n, 110 + n, 150 + n];
    if (tag === 'wet') return [201 + n, 160 + n, 106 + n];
    if (tag === 'boardwalk') return [196 + n, 150 + n, 104 + n];
    if (tag === 'tile') return [226 + n, 220 + n, 210 + n];
    if (tag === 'carpet') return [120 + n, 28 + n * .5, 60 + n * .5];
    if (tag === 'deck') return [236 + n, 214 + n, 180 + n];
    return [243 + n * .4, 217 + n * .4, 164 + n * .4];
  };
  const types = { 1: { h: 26, top: '#8a6a58', side: '#5a4238', face: 'brick' } };
  const W = Math.max(...P.rows.map(s => s.length)), pad = P.legend['#'] ? '#' : '~', rows = P.rows.map(s => s + pad.repeat(W - s.length));
  const m = new E.TileMap({ rows, legend: P.legend, types, floorTex, outside: id === 'casino' ? '#14050e' : id === 'villa' ? '#2a1a18' : '#0a2d3d', ao: 3 });
  G._maps[id] = m;
  return m;
};
G.entryOf = function (id) {
  const P = G.PLACES[id];
  return P.entry || [3, 3];
};
G.locScene = {
  enter(data) {
    const game = G.game, st = G.state;
    this.place = data.place; this.P = G.PLACES[this.place];
    this.map = G.placeMap(this.place);
    this.slot = st.slot;
    this.tod = this.P.tod;
    this.mode = 'walk'; this.visits = 0; this.menuNPC = null;
    const c = this.map.center(G.entryOf(this.place)[0], G.entryOf(this.place)[1]), sx = c[0], sy = c[1];
    this.hero = new E.Body({ x: sx, y: sy, r: 5 });
    this.heroRig = G.rigFor(st.me, { suit: st.wearing.suit, acc: st.wearing.acc });
    this.npcs = [];
    const here = G.npcsAt(this.place, this.slot);
    const spots = this.map.findAll ? null : null;
    const tags = G.SPOTS[this.place] || [];
    let k = 0;
    const free = [];
    for (const t of tags) for (const pt of this.map.findAll(t)) free.push({ tag: t, x: pt.x, y: pt.y });
    for (const npc of here) {
      const spot = free[k++ % Math.max(1, free.length)];
      const rig = G.rigFor(npc, { suit: st.npcWear[npc].suit, acc: st.npcWear[npc].acc });
      this.npcs.push({ id: npc, rig, x: spot ? spot.x : sx + 20 + 14 * k, y: spot ? spot.y : sy + 10, face: Math.PI / 2 });
    }
    this.inter = [];
    for (const [tag, def] of Object.entries(G.INTERACT)) for (const pt of this.map.findAll(tag)) this.inter.push({ tag, def, x: pt.x, y: pt.y });
    game.follow(this.hero, { z: 16 });
    game.cam.bounds = v => this.map.bounds(v);
    game.setView(E.VIEWS.threequarter);
    game.cam.smooth = .12;
    G.music(this.P.music || 'island');
    this.lights = !!(this.tod === 'night');
    if (this.lights) { game.lights.enabled = true; game.lights.ambient = .55; } else game.lights.enabled = false;
    this.bg = new E.Backdrop(this.tod === 'night' ? 'night' : 'day');
    this.list = null;
    this.box = G.box;
    this.box.open = false;
    G.locVisit(this.place);
  },
  exit() { G.game.lights.enabled = false; },
  nearNPC() { let best = null; for (const n of this.npcs) { const d = Math.hypot(n.x - this.hero.x, n.y - this.hero.y); if (d < 22 && (!best || d < best.d)) best = { n, d }; } return best && best.n; },
  nearInter() { let best = null; for (const it of this.inter) { const d = Math.hypot(it.x - this.hero.x, it.y - this.hero.y); if (d < 20 && (!best || d < best.d)) best = { it, d }; } return best && best.it; },
  update(dt) {
    const I = G.game.input, st = G.state;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (this.mode === 'talk') return this.updateTalk(I, dt);
    if (this.mode === 'gift') return this.updateGift(I, dt);
    if (this.mode === 'leave') return this.updateLeave(I, dt);
    if (this.mode === 'board') return this.updateBoard(I, dt);
    // walking
    const m = I.move(), d = G.game.view.screenDirToGround(m[0], m[1]);
    const sp = (I.down('run') ? 110 : 70);
    this.hero.vx = d[0] * sp * Math.min(1, Math.hypot(m[0], m[1])); this.hero.vy = d[1] * sp * Math.min(1, Math.hypot(m[0], m[1]));
    this.hero.update(dt, this.map);
    if (Math.hypot(d[0], d[1]) > .1) this.heroFace = Math.atan2(d[1], d[0]);
    this.heroRig.update(dt, { x: this.hero.x, y: this.hero.y, z: this.hero.z, vx: this.hero.vx, vy: this.hero.vy, facing: this.heroFace || 0 });
    for (const n of this.npcs) { n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.face, pose: 'hips' }); }
    if (I.pressed('interact')) {
      const n = this.nearNPC(), it = this.nearInter();
      if (n) this.openTalk(n.id);
      else if (it) this.useInter(it);
    }
    if (I.pressed('bag')) this.openGiftBag(null);
    if (I.pressed('leave')) this.askLeave();
    if (I.pressed('snap')) G.game.go('photo', { from: 'location', place: this.place });
    if (I.pressed('start') || I.pressed('pause')) { /* the pause menu is the engine's */ }
  },
  openTalk(npc) {
    this.mode = 'talk'; this.menuNPC = npc;
    const st = G.state, stage = G.stageIndex(st.aff[npc] || 0);
    const opts = [{ label: 'Chat', onPick: () => this.doChat(npc) }, { label: 'Give a gift', onPick: () => this.openGiftBag(npc) }];
    if (st.partner === npc) opts.push({ label: 'Our next match?', onPick: () => this.openBoard() });
    else opts.push({ label: 'Team up', onPick: () => this.doTeam(npc) });
    if (this.place === 'beach') opts.push({ label: 'Challenge', onPick: () => this.doChallenge(npc) });
    opts.push({ label: 'Bye', onPick: () => this.closeTalk() });
    this.list = new G.List({ items: opts, x: G.game.W - 150, y: 40, w: 130, rowH: 22, max: 6, scale: 2 });
    this.greetDone = this.greetDone || {};
    const key = st.day + ':' + npc;
    if (!this.greetDone[key]) { this.greetDone[key] = true; this.box.say(G.lineFor(npc, 'greet', stage), { name: G.CAST[npc].short, color: '#ffd36a', prof: G.CAST[npc].voice || null, prof2: null, onDone: null }); }
  },
  closeTalk() { this.mode = 'walk'; this.list = null; this.menuNPC = null; },
  updateTalk(I, dt) {
    if (I.pressed('cancel')) { this.closeTalk(); return; }
    if (this.list) this.list.update(I, dt);
  },
  doChat(npc) {
    const st = G.state, before = st.aff[npc] || 0;
    const gain = G.chatWith(npc);
    const stage = G.stageIndex(st.aff[npc] || 0);
    const line = gain ? G.lineFor(npc, 'chat', stage) : '…We already talked this slot. Later, okay?';
    this.box.say(line, { name: G.CAST[npc].short, prof: G.CAST[npc].voice, color: '#ffd36a' });
    if (gain) G.toast(G.CAST[npc].short + ' +' + gain + ' ' + (st.aff[npc] >= 80 ? 'best' : 'hearts'));
    if (st.aff[npc] >= 40 && before < 40) G.sfx('levelup');
  },
  doTeam(npc) {
    const st = G.state;
    if (G.inviteOK(npc)) {
      const old = G.setPartner(npc);
      this.box.say(G.lineFor(npc, 'inviteOK', G.stageIndex(st.aff[npc])), { name: G.CAST[npc].short, prof: G.CAST[npc].voice, onDone: () => { if (old) G.toast((G.CAST[old] || {}).short + ' is sour with you.'); } });
      G.sfx('heart_up');
    } else {
      this.box.say(G.lineFor(npc, 'inviteNo', G.stageIndex(st.aff[npc])), { name: G.CAST[npc].short, prof: G.CAST[npc].voice });
      G.sfx('ui_error');
    }
    this.closeTalk();
  },
  doChallenge(npc) {
    // the pair she plays with (or the next NPC by affinity) takes the court
    const st = G.state;
    const team = st.teams.find(t => t.includes(npc));
    const opp = team ? team : [npc, G.NPCS.find(f => f !== st.me && f !== npc && f !== st.partner)];
    this.box.say('Challenge accepted. Court one, ten minutes. Bring your A-game.', { name: G.CAST[npc].short, prof: G.CAST[npc].voice });
    this.closeTalk();
    this.startMatch(opp.filter(Boolean).slice(0, 2));
  },
  openBoard() { this.mode = 'board'; this.boardItems = this.boardList(); this.list = new G.List({ items: this.boardItems, x: 40, y: 58, w: 260, rowH: 22, max: 7, scale: 2 }); },
  boardList() {
    const st = G.state, out = [];
    for (const [a, b] of st.teams) {
      if (!G.npcsAt('beach', st.slot).includes(a)) continue;
      const rec = st.record[a + '+' + b] || [0, 0];
      out.push({ label: G.CAST[a].short + ' & ' + G.CAST[b].short, value: rec[0] + '-' + rec[1], onPick: () => this.startMatch([a, b]) });
    }
    if (st.partner) out.push({ label: 'Play with ' + G.CAST[st.partner].short, onPick: () => this.startMatch(null) });
    if (!out.length) out.push({ label: 'Nobody is free to play', disabled: true });
    out.push({ label: 'Back', onPick: () => { this.mode = 'walk'; this.list = null; } });
    return out;
  },
  updateBoard(I, dt) { if (I.pressed('cancel')) { this.mode = 'walk'; this.list = null; return; } if (this.list) this.list.update(I, dt); },
  startMatch(opp) {
    const st = G.state, me = st.me, partner = st.partner || null;
    let o1, o2;
    if (opp) { o1 = opp[0]; o2 = opp[1]; }
    else { const others = G.NPCS.filter(f => f !== me && f !== partner); o1 = others[0]; o2 = others[1]; }
    const pt = partner || (G.NPCS.filter(f => f !== me && ![o1, o2].includes(f)).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0))[0]);
    const chem = (a) => (1 - G.T.chemistry / 2) + G.T.chemistry * (st.aff[a] || 0) / 100;
    const teams = [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: G.dayBase(), skill: .5 }, { id: pt, suit: st.npcWear[pt].suit, base: G.dayBase(), chem: chem(pt), aff: st.aff[pt] || 0 }],
      [{ id: o1, suit: st.npcWear[o1].suit, base: G.dayBase() }, { id: o2, suit: st.npcWear[o2].suit, base: G.dayBase() }]];
    const opts = { teams, pointsToWin: G.T.pointsToWin, setsToWin: 1, difficulty: 'normal', timingAssist: 'normal', court: this.slot === 1 ? 'sunset' : 'day', serveSide: 0, vacation: { opp: [o1, o2], partner: pt }, onEnd: r => G.vacationMatchEnd(r) };
    G.game.go('match', { opts });
  },
  openGiftBag(npc) {
    this.mode = 'gift'; this.giftFor = npc;
    const st = G.state, gifts = Object.keys(st.bag).filter(g => st.bag[g] > 0);
    if (!gifts.length) { this.box.say('Your gift bag is empty. Visit the shops on the Promenade.', { name: 'BAG' }); this.mode = 'walk'; return; }
    this.gifts = gifts;
    this.grid = new G.Grid({ items: gifts.map(g => ({ id: g })), cols: 3, rows: 2, x: 30, y: 48, cw: 96, ch: 50, gap: 6, onFocus: null });
  },
  updateGift(I, dt) {
    if (I.pressed('cancel')) { this.mode = 'walk'; return; }
    const hit = this.grid.update(I, dt);
    if (hit && (hit.confirm || hit.click)) {
      const id = hit.item.id;
      if (!this.giftFor) { this.mode = 'walk'; this.box.say('Pick someone to give it to. Walk up to them and press interact.', { name: 'BAG' }); return; }
      const r = G.giveGift(this.giftFor, id);
      this.mode = 'walk';
      if (r && r.already) { this.box.say('You already gave her something this slot.', { name: 'BAG' }); return; }
      if (r) {
        const stg = G.stageIndex(G.state.aff[this.giftFor]);
        const kind = r.accepted ? r.level : 'refuse';
        const line = G.lineFor(this.giftFor, kind, stg);
        this.box.say(line, { name: G.CAST[this.giftFor].short, prof: G.CAST[this.giftFor].voice, onDone: null });
        G.sfx(r.accepted ? (r.level === 'love' ? 'gift_love' : 'heart_up') : 'gift_refuse');
        G.toast(r.accepted ? ((r.level === 'love' ? 'Loved it!' : r.level === 'like' ? 'Liked it' : 'It was fine') + '.') : 'Not her thing.');
      }
    }
  },
  useInter(it) {
    const def = it.def, st = G.state;
    if (def.kind === 'shop') return G.game.go('shop', { shop: def.shop, back: 'location', place: this.place });
    if (def.kind === 'wardrobe') return G.game.go('wardrobe', { back: 'location', place: this.place });
    if (def.kind === 'board') return this.openBoard();
    if (def.kind === 'poolhop') return G.game.go('poolhop', { from: 'location' });
    if (def.kind === 'desk') return G.game.go('journal', { back: 'location', place: this.place });
    if (def.kind === 'album') return G.game.go('album', { from: 'location' });
    if (def.kind === 'mail') return G.game.go('mail', { back: 'location', place: this.place });
    if (def.kind === 'bed') return this.sleep();
    if (def.kind === 'slots' || def.kind === 'blackjack' || def.kind === 'roulette' || def.kind === 'cashier' || def.kind === 'prize' || def.kind === 'vip') return G.game.go('casino', { from: 'location', focus: def.kind });
  },
  sleep() {
    this.box.say('Rest for the day? Going to sleep ends the day.', { name: 'BED', choices: ['Sleep', 'Not yet'], onChoice: i => { if (i === 0) G.endDayFromVilla(); } });
  },
  askLeave() {
    this.mode = 'leave';
    this.list = new G.List({ items: [{ label: 'Leave', onPick: () => this.doLeave() }, { label: 'Stay', onPick: () => { this.mode = 'walk'; this.list = null; } }], x: G.game.W / 2 - 60, y: 110, w: 120, rowH: 24, max: 2, scale: 2 });
    this.leaveText = 'Leave? This ends the ' + G.SLOTS[G.state.slot] + '.';
  },
  updateLeave(I, dt) { if (I.pressed('cancel')) { this.mode = 'walk'; this.list = null; return; } if (this.list) this.list.update(I, dt); },
  doLeave() { G.game.go('map', { afterLocation: true }); }
};
G.locVisit = function (place) { const st = G.state; st.visited = st.visited || {}; st.visited[place] = true; };
G.dayBase = function () { const d = G.state ? G.state.day : 1; return [.4, .5, .58, .66, .74][Math.min(4, d - 1)] || .4; };
G.locDraw = function (r) {
  this.bg && this.bg.draw(r);
  this.map.drawFloor(r);
  for (const it of this.inter) { r.shadow(it.x, it.y, 4, .3); }
  r.shadow(this.hero.x, this.hero.y, 5, .4);
  r.actor(this.hero.x, this.hero.y, this.hero.z, (g, ox, oy) => { this.heroRig.draw(g, ox, oy, r.view); G.dress(g, r, this.heroRig, ox, oy); }, { pick: 'hero' });
  for (const n of this.npcs) r.actor(n.x, n.y, 0, (g, ox, oy) => { n.rig.draw(g, ox, oy, r.view); G.dress(g, r, n.rig, ox, oy); }, { pick: n });
  this.map.queueWalls && this.map.queueWalls(r);
};
G.locHud = function (r) {
  const st = G.state, W = r.W, H = r.H;
  r.overlay(g => {
    E.ui.box(g, 6, 6, 170, 26, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
    E.font.text(g, this.P.name, 12, 10, '#fff8e8', { shadow: '#000' });
    E.font.text(g, G.SLOTS[st.slot] + ' · Day ' + st.day, 12, 20, '#9fd3d6', { shadow: '#000' });
    E.font.text(g, G.fmtMoney(st.money), W - 8, 10, '#ffd36a', { align: 'right', scale: 2, shadow: '#000' });
    const near = this.nearNPC(), it = this.nearInter();
    if (this.mode === 'walk' && (near || it)) {
      const label = near ? G.CAST[near.id].short + ' · talk' : it.def.label;
      E.font.text(g, label, W / 2, H - 52, '#fff8e8', { align: 'center', shadow: '#000' });
    }
  });
  if (this.list) this.list.draw(r, {});
  if (this.mode === 'talk' && this.menuNPC) {
    const f = this.menuNPC, aff = G.state.aff[f] || 0;
    r.overlay(g => {
      E.ui.box(g, 10, 36, 110, 40, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      E.font.text(g, G.CAST[f].name.split(' ')[0], 16, 42, '#fff8e8', { shadow: '#000' });
      E.font.text(g, G.stageName(aff), 16, 56, '#9fd3d6', { shadow: '#000' });
      G.drawHearts(g, 16, 66, aff);
    });
  }
  if (this.mode === 'gift' && this.grid) {
    r.overlay(g => { E.ui.box(g, 16, 36, W - 32, H - 72, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 }); E.font.text(g, 'GIFT BAG', W / 2, 42, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); });
    this.grid.draw(r, (g, id, x, y, w, h, focused) => {
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      E.font.text(g, G.GIFTS[id.id].name, x + 4, y + 4, '#fff8e8', { scale: 1, shadow: '#000' });
      E.font.text(g, '× ' + G.state.bag[id.id], x + w - 4, y + h - 12, '#ffd36a', { scale: 1, align: 'right', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Give'], ['cancel', 'Back']]);
  }
  if (this.mode === 'leave') r.overlay(g => E.font.text(g, this.leaveText, W / 2, 96, '#ffd36a', { align: 'center', shadow: '#000' }));
  if (this.mode === 'board') r.overlay(g => { E.font.text(g, 'MATCH BOARD', W / 2, 26, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); });
  if (this.mode === 'walk') G.promptBar(r, [['interact', near2(this) ? 'Talk' : 'Use'], ['bag', 'Gift bag'], ['leave', 'Leave'], ['snap', 'Postcard']]);
  this.box.draw(r);
};
function near2(s) { return s.nearNPC() || s.nearInter(); }
G.drawHearts = function (g, x, y, aff) {
  const h = Math.round(aff / 10) / 2;
  for (let i = 0; i < 5; i++) {
    const v = h - i; const col = v >= 1 ? '#ff5fa2' : v >= .5 ? '#ff9ec8' : '#4a3a4a';
    E.px.rect(g, x + i * 9, y, 6, 5, col); E.px.rect(g, x + i * 9 + 1, y + 5, 4, 1, col);
  }
};
G.locScene.draw = function (r) { G.locDraw.call(this, r); G.locHud.call(this, r); };
G.vacationMatchEnd = function (r) { G.game.go('vacmatch-result', r); };
G.endDayFromVilla = function () { G.game.go('dayend', {}); };

/* ==== 33-shop.js ==== */
/* 33-shop: the shops (Riptide Sports, Coral Couture, Sundries & Smiles), the wardrobe, the journal and the mailbox. */
G.priceFor = function (id, shop) {
  const st = G.state, base = G.itemPrice(id);
  const deal = (st.shopDeals[shop] || []).includes(id);
  return { price: Math.round(deal ? base * .75 : base), deal, base };
};
G.ownsSuit = (id) => G.state.wardrobe.suits.includes(id);
G.ownsAcc = (id) => G.state.wardrobe.acc.includes(id);
G.buyItem = function (id, shop) {
  const st = G.state, pr = G.priceFor(id, shop);
  if (G.SUITS[id]) { if (G.ownsSuit(id)) return 'owned'; }
  if (G.ACCESSORIES[id]) { if (G.ownsAcc(id)) return 'owned'; }
  if (st.money < pr.price) return 'poor';
  G.spend(pr.price);
  if (G.SUITS[id]) st.wardrobe.suits.push(id);
  else if (G.ACCESSORIES[id]) st.wardrobe.acc.push(id);
  else st.bag[id] = (st.bag[id] || 0) + 1;
  st.stats.suitsOwned = st.wardrobe.suits.length;
  G.sfx('cash');
  return 'bought';
};
G.shopScene = {
  enter(data) {
    this.shop = data.shop || 'sundries'; this.back = data.back || 'map'; this.place = data.place;
    this.S = G.SHOPS[this.shop];
    this.tab = 0; this.tabs = this.S.cats;
    this.preview = null; this.confirmFor = null;
    this.box = G.box;
    this.build();
    G.music('boutique');
    this.box.say(G.SHOP_QUIPS[this.S.keeper][0], { name: G.CAST[this.S.keeper] ? G.CAST[this.S.keeper].short : G.STAFF[this.S.keeper].short, prof: (G.CAST[this.S.keeper] || G.STAFF[this.S.keeper]).voice });
    this.bg = new E.Backdrop('day');
  },
  build() {
    const list = G.itemsForShop(this.shop, G.state.day);
    const cat = this.tabs[this.tab];
    const ids = cat === 'suits' ? list.suits : cat === 'acc' ? list.acc : list.gifts;
    this.ids = ids;
    this.grid = new G.Grid({ items: ids.map(id => ({ id, cat })), cols: 3, rows: 2, x: 16, y: 46, cw: 100, ch: 52, gap: 6 });
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (this.confirmFor) return this.updateConfirm(I);
    if (I.pressed('cancel')) return this.leave();
    if (I.pressed('tabR')) { this.tab = (this.tab + 1) % this.tabs.length; this.build(); }
    if (I.pressed('tabL')) { this.tab = (this.tab + this.tabs.length - 1) % this.tabs.length; this.build(); }
    const hit = this.grid.update(I, dt);
    if (this.grid.items.length) {
      const cur = this.grid.items[this.grid.i];
      if (cur && (!this.preview || this.preview.id !== cur.id)) this.setPreview(cur.id);
    }
    if (hit && (hit.confirm || hit.click)) {
      const it = hit.item.id;
      if (this.tabs[this.tab] === 'gifts' || G.GIFTS[it]) { this.askBuy(it); return; }
      this.askBuy(it);
    }
    if (I.pressed('alt') && this.preview) this.previewWorn = !this.previewWorn;
  },
  setPreview(id) {
    this.preview = { id, rig: null };
    const isSuit = !!G.SUITS[id], isAcc = !!G.ACCESSORIES[id];
    const st = G.state;
    const suit = isSuit ? id : st.wearing.suit, acc = isAcc ? (st.wearing.acc.concat([id])) : st.wearing.acc;
    this.preview.rig = G.rigFor(st.me, { suit, acc: [...new Set(acc)] });
    this.previewWorn = false;
  },
  askBuy(id) {
    const st = G.state, pr = G.priceFor(id, this.shop);
    if (G.SUITS[id] && G.ownsSuit(id)) { this.equip(id); return; }
    if (G.ACCESSORIES[id] && G.ownsAcc(id)) { this.equipAcc(id); return; }
    if (st.money < pr.price) { G.sfx('ui_error'); G.toast('Not enough money: ' + G.fmtMoney(pr.price - st.money) + ' short'); return; }
    this.confirmFor = id;
    this.box.say('Buy ' + G.itemName(id) + ' for ' + G.fmtMoney(pr.price) + '?', { name: 'SHOP', choices: ['Buy', 'Not now'], onChoice: i => { if (i === 0) { const r = G.buyItem(id, this.shop); G.toast(r === 'bought' ? 'Bought ' + G.itemName(id) : 'Could not buy'); if (r === 'bought' && G.SUITS[id]) this.equip(id); } this.confirmFor = null; } });
  },
  updateConfirm() { /* the box owns the input while it is open */ },
  equip(id) { const st = G.state; if (G.SUITS[id]) st.wearing.suit = id; G.toast('Wearing ' + G.SUITS[id].name); },
  equipAcc(id) { const st = G.state; const i = st.wearing.acc.indexOf(id); if (i >= 0) st.wearing.acc.splice(i, 1); else st.wearing.acc.push(id); },
  leave() { G.game.go(this.back, { place: this.place }); },
  draw(r) {
    const st = G.state, W = r.W, H = r.H;
    this.bg.draw(r);
    G.screenTitle(r, this.S.name, 'Keeper: ' + (G.CAST[this.S.keeper] || G.STAFF[this.S.keeper]).short.toLowerCase().replace(/^./, c => c.toUpperCase()));
    r.overlay(g => { E.ui.box(g, W - 190, 40, 180, 22, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 }); E.font.text(g, ['SUITS', 'ACCESSORIES', 'GIFTS'][this.tab] || '', W - 182, 46, '#ffd36a', { shadow: '#000' }); E.font.text(g, G.fmtMoney(st.money), W - 14, 46, '#fff8e8', { align: 'right', shadow: '#000' }); });
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      const id = it.id, pr = G.priceFor(id, this.shop);
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      const owned = G.SUITS[id] ? G.ownsSuit(id) : G.ACCESSORIES[id] ? G.ownsAcc(id) : false;
      E.font.text(g, G.itemName(id), x + 4, y + 4, '#fff8e8', { scale: 1, shadow: '#000' });
      E.font.text(g, G.fmtMoney(pr.price), x + 4, y + h - 12, pr.deal ? '#7cff9a' : '#ffd36a', { scale: 1, shadow: '#000' });
      if (owned) E.font.text(g, 'OWNED', x + w - 4, y + 4, '#9fd3d6', { scale: 1, align: 'right', shadow: '#000' });
      if (pr.deal) E.font.text(g, '-25%', x + w - 4, y + h - 12, '#7cff9a', { scale: 1, align: 'right', shadow: '#000' });
    });
    // the live preview: the fighter in the focused item, turning on a pedestal
    const pv = this.preview;
    if (pv && pv.rig) {
      const rig = pv.rig;
      r.actor(60, 0, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: 'preview' });
    }
    G.promptBar(r, [['confirm', 'Buy'], ['tabL', 'Tab'], ['cancel', 'Leave']]);
    this.box.draw(r);
  }
};
/* the wardrobe: the suits and accessories owned; equip one, toggle accessories */
G.wardrobeScene = {
  enter(data) {
    this.back = data.back || 'map'; this.place = data.place; this.tab = 0; this.build();
    this.box = G.box; this.bg = new E.Backdrop('night');
    G.music('boutique');
  },
  build() {
    const st = G.state;
    const ids = this.tab === 0 ? st.wardrobe.suits : st.wardrobe.acc;
    this.grid = new G.Grid({ items: ids.map(id => ({ id })), cols: 3, rows: 2, x: 16, y: 46, cw: 100, ch: 52, gap: 6 });
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (I.pressed('cancel')) return G.game.go(this.back, { place: this.place });
    if (I.pressed('tabR') || I.pressed('tabL')) { this.tab = 1 - this.tab; this.build(); }
    const hit = this.grid.update(I, dt);
    if (this.grid.items.length) { const cur = this.grid.items[this.grid.i]; if (cur && (!this.preview || this.preview.id !== cur.id)) { const st = G.state; const isS = this.tab === 0; this.preview = { id: cur.id, rig: G.rigFor(st.me, { suit: isS ? cur.id : st.wearing.suit, acc: isS ? st.wearing.acc : [...st.wearing.acc, cur.id] }) }; } }
    if (hit && (hit.confirm || hit.click)) {
      const st = G.state, id = hit.item.id;
      if (this.tab === 0) st.wearing.suit = id;
      else { const i = st.wearing.acc.indexOf(id); if (i >= 0) st.wearing.acc.splice(i, 1); else st.wearing.acc.push(id); }
      G.sfx('ui_select');
    }
    if (I.pressed('extra') && this.tab === 1 && this.grid.items.length) { const st = G.state, id = this.grid.items[this.grid.i].id; st.wearing.acc = st.wearing.acc.filter(a => a !== id); }
  },
  draw(r) {
    const st = G.state;
    this.bg.draw(r);
    G.screenTitle(r, 'WARDROBE', this.tab === 0 ? 'Suits you own' : 'Accessories you own');
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      const id = it.id, worn = this.tab === 0 ? st.wearing.suit === id : st.wearing.acc.includes(id);
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      E.font.text(g, G.itemName(id), x + 4, y + 4, '#fff8e8', { scale: 1, shadow: '#000' });
      if (worn) E.font.text(g, 'WEARING', x + w - 4, y + h - 12, '#7cff9a', { scale: 1, align: 'right', shadow: '#000' });
    });
    const pv = this.preview;
    if (pv && pv.rig) r.actor(60, 0, 0, (g, ox, oy) => { pv.rig.draw(g, ox, oy, r.view); G.dress(g, r, pv.rig, ox, oy); }, { pick: 'preview' });
    G.promptBar(r, [['confirm', 'Wear'], ['extra', 'Remove'], ['tabR', 'Tab'], ['cancel', 'Back']]);
    this.box.draw(r);
  }
};
/* the journal: friends (affinity, mood and the likes learned), stats, and a save */
G.journalScene = {
  enter(data) {
    this.back = data.back || 'map'; this.place = data.place; this.tabs = ['friends', 'stats', 'save'];
    this.tab = Math.max(0, this.tabs.indexOf(data.tab || 'friends'));
    this.build();
    this.bg = new E.Backdrop('night');
  },
  build() {
    const st = G.state;
    if (this.tabs[this.tab] === 'friends') this.list = new G.List({ items: G.NPCS.filter(f => f !== st.me).map(f => ({ label: G.CAST[f].short, id: f, value: G.stageName(st.aff[f] || 0) })), x: 26, y: 58, w: 200, rowH: 22, max: 7, scale: 2 });
    else if (this.tabs[this.tab] === 'save') this.list = new G.List({ items: [{ label: 'Save to a slot', onPick: () => G.game.saves && G.game.saves.show('save') }, { label: 'Back', onPick: () => G.game.go(this.back, { place: this.place }) }], x: 26, y: 58, w: 220, rowH: 22, max: 4, scale: 2 });
    else this.list = new G.List({ items: [{ label: 'Back', onPick: () => G.game.go(this.back, { place: this.place }) }], x: 26, y: 58, w: 220, rowH: 22, max: 4, scale: 2 });
  },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel')) return G.game.go(this.back, { place: this.place });
    if (I.pressed('tabR')) { this.tab = (this.tab + 1) % 3; this.build(); }
    if (I.pressed('tabL')) { this.tab = (this.tab + 2) % 3; this.build(); }
    this.list.update(I, dt);
  },
  draw(r) {
    const st = G.state, W = r.W, H = r.H;
    this.bg.draw(r);
    G.screenTitle(r, 'JOURNAL', ['Friends', 'Stats', 'Save'][this.tab]);
    this.list.draw(r);
    r.overlay(g => {
      E.ui.box(g, 240, 46, W - 254, H - 92, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      if (this.tabs[this.tab] === 'friends') {
        const f = this.list.items[this.list.i] && this.list.items[this.list.i].id;
        if (f) {
          E.font.text(g, G.CAST[f].name, 252, 56, '#ffd36a', { scale: 2, shadow: '#000' });
          E.font.text(g, G.CAST[f].epithet + ' · ' + (G.CAST[f].style || ''), 252, 76, '#9fd3d6', { shadow: '#000' });
          G.drawHearts(g, 252, 96, st.aff[f] || 0);
          E.font.text(g, G.stageName(st.aff[f] || 0) + ' · ' + (st.mood[f] || 'Normal'), 252, 108, '#fff8e8', { shadow: '#000' });
          E.font.text(g, 'LIKES', 252, 124, '#ffd36a', { shadow: '#000' });
          let x = 252; const known = st.known[f] || {};
          Object.keys(known).forEach((gift, i) => { const lvl = known[gift]; E.font.text(g, (lvl === 'love' ? '♥ ' : lvl === 'like' ? '+ ' : lvl === 'neutral' ? '· ' : '- ') + G.GIFTS[gift].name, 252, 136 + i * 10, lvl === 'dislike' ? '#ff9a9a' : '#fff8e8', { scale: 1, shadow: '#000' }); });
          if (!Object.keys(known).length) E.font.text(g, 'Give her a gift to learn her tastes.', 252, 136, '#9fd3d6', { scale: 1, shadow: '#000' });
        }
      } else if (this.tabs[this.tab] === 'stats') {
        const s = st.stats, rows = [['Matches won', s.wins + ' / ' + s.matches], ['Points', s.points], ['Gifts given', s.gifts], ['Earned', G.fmtMoney(s.earned)], ['Spent', G.fmtMoney(s.spent)], ['Suits', st.wardrobe.suits.length + ' / 21'], ['Best Pool Hop', s.poolBest !== null ? s.poolBest + 's' : 'none']];
        rows.forEach((rw, i) => { E.font.text(g, rw[0], 252, 56 + i * 16, '#9fd3d6', { shadow: '#000' }); E.font.text(g, String(rw[1]), W - 24, 56 + i * 16, '#fff8e8', { align: 'right', shadow: '#000' }); });
      } else {
        E.font.text(g, 'Save your vacation to one of three slots.', 252, 60, '#fff8e8', { shadow: '#000' });
        E.font.text(g, 'The game also saves itself at each slot.', 252, 74, '#9fd3d6', { shadow: '#000' });
      }
    });
    G.promptBar(r, [['confirm', 'Select'], ['tabR', 'Tab'], ['cancel', 'Back']]);
  }
};
/* the mailbox: letters from the island */
G.mailScene = {
  enter(data) { this.back = data.back || 'map'; this.place = data.place; this.bg = new E.Backdrop('night'); this.letters = G.lettersDue(); this.list = new G.List({ items: this.letters.map(l => ({ label: l.title, onPick: () => this.box.say(l.text, { name: l.from }) })).concat([{ label: 'Back', onPick: () => G.game.go(this.back, { place: this.place }) }]), x: 26, y: 58, w: 260, rowH: 22, max: 6, scale: 2 }); this.box = G.box; },
  update(dt) { const I = G.game.input; if (this.box.open) { this.box.update(I, dt); return; } if (I.pressed('cancel')) return G.game.go(this.back, { place: this.place }); this.list.update(I, dt); },
  draw(r) { this.bg.draw(r); G.screenTitle(r, 'MAILBOX', 'Letters from the island'); this.list.draw(r); this.box.draw(r); G.promptBar(r, [['confirm', 'Read'], ['cancel', 'Back']]); }
};
G.lettersDue = function () {
  const st = G.state, out = [];
  const L = G.LINES.pepper;
  if (st.day >= 1) out.push({ title: 'Welcome card', from: 'PEPPER', text: L.letterWelcome });
  if (st.day >= 2) out.push({ title: 'Sonny\'s flyer', from: 'SONNY', text: L.letterFlyer });
  if (st.day >= 4) out.push({ title: 'Pepper\'s warning', from: 'PEPPER', text: L.letterWarn });
  if (st.day >= 4) out.push({ title: 'Final poster', from: 'SONNY', text: L.letterPoster });
  if (st.day >= 4 && st.flags.final) out.push({ title: 'Final tomorrow', from: 'PEPPER', text: L.letterFinal });
  return out;
};

/* ==== 34-story.js ==== */
/* 34-story: the invitation and character select, and the story events as sequences of steps: lines, choices, flags, and
 * matches. Each event is played by the story scene; a match step returns to the story at the next step. */
G.STORY_ORDER = ['arrival', 'welcome', 'villa', 'rain', 'overheard', 'semi', 'final', 'party'];
G.storyPending = function (where) {
  const st = G.state; if (!st || where !== 'map') return null;
  const f = st.flags;
  if (!f.arrival) return 'arrival';
  if (!f.welcome && st.day === 1 && st.slot === 0) return 'welcome';
  if (st.day === 2 && st.slot === 2 && !f.villa && G.npcsAt('villa', 2).length) return null;
  if (st.day === 3 && st.slot === 1 && !f.rain) return 'rain';
  if (st.day === 4 && st.slot === 1 && !f.semi) return 'semi';
  if (st.day === 5 && st.slot === 1 && !f.final) return 'final';
  if (st.day === 5 && st.slot === 2 && f.final && !f.party) return 'party';
  return null;
};
G.STORY = {
  arrival: [
    { say: ['The seaplane drops onto the water, and six fighters step out onto the planks.'], name: 'ISLA FORTUNA' },
    { say: [G.LINES.sonny.arrival[0], G.LINES.sonny.arrival[1]], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { say: [G.LINES.sonny.pepper[0], G.LINES.sonny.pepper[1]], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { say: ['Villa keys, sunscreen, a schedule. Five days. Three slots each. One Cup.'], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { fx: () => { G.state.flags.arrival = true; G.state.bag = G.state.bag || {}; G.state.bag.mango_smoothie = 1; } },
    { say: ['Your Morning ends when you leave a place. Sleep ends the day.'], name: 'PEPPER', prof: G.STAFF.pepper.voice, then: 'map' }
  ],
  welcome: [
    { say: ['Allow me to demonstrate! Your partner and you against the Fortuna Cup\'s own host.'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { say: [G.LINES.pepper.tips[0]], name: 'PEPPER', prof: G.STAFF.pepper.voice, tip: 0 },
    { match: 'welcome' },
    { fx: () => { G.state.flags.welcome = true; G.earn(10000, 'tutorial'); } },
    { say: ['Five percent effort, champ. And you still lost. Ha!'], name: 'SONNY', prof: G.STAFF.sonny.voice, then: 'map' }
  ],
  rain: [
    { say: ['LIQUID SUNSHINE, PEOPLE! The sky is taking a shower. The courts are wet. The fun is not!'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { fx: () => { G.state.flags.rain = true; } , then: 'map' }
  ],
  overheard: [
    { say: ['...Yeah, I put the island on the Cup. What could go wrong?'], name: 'SONNY (phone)', prof: G.STAFF.sonny.voice },
    { say: ['Pepper sees you hear it. She says nothing, which is worse.'], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { choice: ['Your secret\'s safe.', 'Everyone\'s going to hear about this.'], effects: [() => { G.addAff('pepper', 0); G.state.flags.kind = true; G.toast('Pepper nods, once.'); }, () => { G.state.flags.kind = false; G.toast('Sonny goes pale.'); }] },
    { fx: () => { G.state.flags.overheard = true; } , then: 'map' }
  ],
  semi: [
    { say: ['The semifinal is on. The best record on the island is your challenge. SEMIFINAL, it says on the board.'], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { match: 'semi' },
    { fx: () => { G.state.flags.semi = true; }, then: 'map' }
  ],
  final: [
    { say: ['THE FORTUNA CUP FINAL! The beach in banners! The House has come out to play.'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { say: [G.LINES.pepper.chance[0]], name: 'PEPPER', prof: G.STAFF.pepper.voice },
    { match: 'final' },
    { fx: () => { G.state.flags.final = G.state.flags.finalWon ? 'won' : 'lost'; }, then: 'map' }
  ],
  party: [
    { say: ['THE FAREWELL PARTY! Torches, fireworks, and everyone dancing on the sand!'], name: 'SONNY', prof: G.STAFF.sonny.voice },
    { fx: () => { G.state.flags.party = true; G.groupPhoto(); G.toast('The party photo is in the album.'); }, goto: 'ending' }
  ]
};
/* the story scene: runs the steps of one event; match steps go to the match and come back here */
G.storyScene = {
  enter(data) {
    this.ev = data.event || (G.storyRun && G.storyRun.ev);
    if (!G.storyRun || G.storyRun.ev !== this.ev || data.fresh) G.storyRun = { ev: this.ev, i: 0 };
    this.box = G.box; this.bg = new E.Backdrop('dusk');
    this.steps = G.STORY[this.ev] || [];
    this.pending = true;
    G.music('island');
    this.next();
  },
  next() {
    const run = G.storyRun;
    while (run.i < this.steps.length) {
      const s = this.steps[run.i++];
      if (s.fx) { s.fx(); continue; }
      if (s.choice) {
        this.box.say(['Your reply?'], { choices: s.choice, onChoice: i => { if (s.effects && s.effects[i]) s.effects[i](); this.next(); } });
        return;
      }
      if (s.say) {
        this.box.say(s.say, { name: s.name, prof: s.prof, onDone: () => this.next() });
        return;
      }
      if (s.match) { return this.playMatch(s.match); }
    }
    const last = this.steps[this.steps.length - 1];
    if (last && last.goto === 'ending') return G.game.go('ending', {});
    const then = last && last.then;
    if (then === 'map') return G.game.go('map', {});
    G.game.go('map', {});
  },
  playMatch(kind) {
    const opts = G.storyMatchOpts(kind);
    G.storyMatchPending = kind;
    G.game.go('match', { opts });
  },
  update(dt) { if (this.box.open) this.box.update(G.game.input, dt); },
  draw(r) { this.bg.draw(r); G.screenTitle(r, ''); this.box.draw(r); }
};
/* the matches of the story: the welcome tutorial, the semifinal, the final */
G.storyMatchOpts = function (kind) {
  const st = G.state, me = st.me;
  const chem = (a) => (1 - G.T.chemistry / 2) + G.T.chemistry * (st.aff[a] || 0) / 100;
  if (kind === 'welcome') {
    const pt = G.NPCS.filter(f => f !== me).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0))[0];
    return { teams: [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: .2 }, { id: pt, suit: st.npcWear[pt].suit, base: .4, chem: chem(pt) }],
      [{ id: 'sonny', base: .2 }, { id: 'pepper', base: .35 }]], pointsToWin: 5, setsToWin: 1, difficulty: 'easy', court: 'day', tutorial: true, serveSide: 0, story: kind, autoReceive: true };
  }
  if (kind === 'semi') {
    const best = st.teams.slice().sort((a, b) => ((st.record[b[0] + '+' + b[1]] || [0, 0])[0] - (st.record[b[0] + '+' + b[1]] || [0, 0])[1]) - ((st.record[a[0] + '+' + a[1]] || [0, 0])[0] - (st.record[a[0] + '+' + a[1]] || [0, 0])[1]))[0] || [G.NPCS[1], G.NPCS[2]];
    const pt = st.partner || G.NPCS.find(f => f !== me && !best.includes(f));
    return { teams: [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: G.dayBase() }, { id: pt, suit: st.npcWear[pt].suit, base: G.dayBase(), chem: chem(pt), aff: st.aff[pt] || 0 }],
      [{ id: best[0], base: .74 }, { id: best[1], base: .74 }]], pointsToWin: 7, setsToWin: 1, difficulty: 'normal', court: 'sunset', serveSide: 0, story: kind };
  }
  // the final: first to 11 against Sonny and Pepper, "The House"
  const pt = st.partner || G.NPCS.find(f => f !== me);
  return { teams: [[{ id: me, human: G.game.input, suit: st.wearing.suit, acc: st.wearing.acc, base: .66 }, { id: pt, suit: st.npcWear[pt].suit, base: .66, chem: chem(pt), aff: st.aff[pt] || 0 }],
    [{ id: 'sonny', base: .7 }, { id: 'pepper', base: .85 }]], pointsToWin: 11, setsToWin: 1, difficulty: 'normal', court: 'sunset', serveSide: 0, story: kind };
};
/* the invitation: the letter, then the character select */
G.invitationScene = {
  enter() {
    this.bg = new E.Backdrop('dusk'); this.box = G.box; this.stage = 0;
    this.box.say(['You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna. Prize: everything.'], { name: 'S. FORTUNA, ESQ.', color: '#ffd36a', onDone: () => { this.stage = 1; this.box.say(['Who opened it?'], { name: 'SONNY', prof: G.STAFF.sonny.voice, onDone: () => { G.game.go('charselect', {}); } }); } });
  },
  update(dt) { if (this.box.open) this.box.update(G.game.input, dt); },
  draw(r) { this.bg.draw(r); G.screenTitle(r, 'THE INVITATION', 'A gold-sealed card'); this.box.draw(r); }
};
G.charselectScene = {
  enter() {
    this.bg = new E.Backdrop('dusk');
    this.items = G.FIGHTERS.map(id => ({ id, cast: G.CAST[id] }));
    this.grid = new G.Grid({ items: this.items, cols: 3, rows: 2, x: 20, y: 54, cw: 98, ch: 68, gap: 8 });
    this.box = G.box;
    this.rigs = {};
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (I.pressed('cancel')) return G.game.go('invitation', {});
    const hit = this.grid.update(I, dt);
    if (hit && (hit.confirm || hit.click)) this.pick(hit.item.id);
  },
  pick(id) {
    G.newState({ me: id });
    G.game.go('story', { event: 'arrival', fresh: true });
  },
  draw(r) {
    this.bg.draw(r);
    G.screenTitle(r, 'CHOOSE YOUR FIGHTER', 'Stats are 1 to 10');
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      E.ui.box(g, x, y, w, h, { bg: ['#17495c', '#0c2e3a'], border: null, alpha: .95 });
      E.font.text(g, it.cast.short, x + 4, y + 4, '#ffd36a', { scale: 1, shadow: '#000' });
      E.font.text(g, G.BRIEF[it.id], x + 4, y + 13, '#9fd3d6', { scale: 1, shadow: '#000' });
      const s = it.cast.stats; ['POW', 'TEC', 'SPD', 'JMP'].forEach((k, i) => { E.font.text(g, k, x + 4, y + 25 + i * 9, '#fff8e8', { scale: 1, shadow: '#000' }); E.ui.bar(g, x + 28, y + 27 + i * 9, 64, 4, s[k] / 10, '#ffd36a'); });
    });
    const it = this.grid.items[this.grid.i];
    if (it) r.overlay(g => { E.ui.box(g, 20, 186, 420 - 40 - 10, 40, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 }); E.font.text(g, it.cast.name + ' · ' + it.cast.epithet, 28, 190, '#ffd36a', { shadow: '#000' }); E.font.text(g, 'Likes: ' + it.cast.tastes.join(', '), 28, 204, '#fff8e8', { shadow: '#000' }); });
    G.promptBar(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
    this.box.draw(r);
  }
};

/* ==== 40-poolhop.js ==== */
/* 40-poolhop: Pool Hop. Cross the lagoon on 32 pads in the time allowed. One hop a beat, judged on the beat clock: each
 * pad shows one face button; press it as the hopper lands. Early, late or wrong: a splash, back to the pad, and the run
 * goes on. From pad 12 the glyph wobbles; from pad 22 some pads want two buttons at once. */
G.poolPads = function () {
  const pads = [];
  for (let i = 0; i < 32; i++) {
    const x = 40 + i * 16, y = 150 + Math.sin(i * .7) * 26;
    const btn = ['hopA', 'hopB', 'hopX', 'hopY'][(i * 3 + (i >> 2)) % 4];
    const pad = { i, x, y, btn, wobble: i >= 12 && i % 3 === 0, double: i >= 22 && i % 5 === 0 ? ['hopA', 'hopX'] : null };
    pads.push(pad);
  }
  return pads;
};
G.poolScene = {
  enter(data) {
    G.poolLive = this;
    this.from = data.from || 'map';
    this.pads = G.poolPads();
    this.rig = G.rigFor(G.state.me, { suit: G.state.wearing.suit, acc: G.state.wearing.acc });
    this.bpm = G.T.poolBpm; this.beat = 60 / this.bpm;
    this.perfect = 0; this.good = 0; this.falls = 0; this.run = 0; this.at = 0; this.t = 0; this.timeLeft = G.T.poolTime;
    this.state = 'ready'; this.readyT = 0; this.nextBeat = 0; this.res = null; this.msg = null; this.hop = null;
    this.bg = new E.Backdrop('day');
    G.game.setView(E.VIEWS.threequarter);
    G.game.follow(null); G.game.focus && G.game.focus(300, 180, 0);
    G.music('lagoon');
    this.lastJudge = null;
    this.slipT = 0;
  },
  start() {
    this.state = 'run'; this.t0 = this.t; this.nextBeat = this.beatTime(0);
  },
  beatTime(n) { return (this.t0 || 0) + this.readyBeats() + n * this.beat; },
  readyBeats() { return .6; },
  update(dt) {
    const I = G.game.input;
    this.t += dt;
    if (this.state === 'ready') { this.readyT += dt; if (I.pressed('confirm') || this.readyT > 1.5) this.start(); if (I.pressed('cancel')) return this.leave(); return; }
    if (this.state === 'run') {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) return this.finish(false);
      // the hopper: landing on the beat, the judge on presses
      const pad = this.pads[this.at];
      if (pad && this.t > this.nextBeat + this.beat * .5 && !this.hop) {
        // missed the beat completely: a slip
        this.slip('too slow');
      }
      if (I.pressed('cancel') && !this.hop) return this.leave();
      const presses = ['hopA', 'hopB', 'hopX', 'hopY'].filter(a => I.pressed(a));
      if (presses.length) this.judge(presses);
      if (this.hop) { this.hop.t += dt; if (this.hop.t > .45) { this.hop = null; } }
    }
    if (this.state === 'slip') { this.timeLeft -= dt; this.slipT -= dt; if (this.timeLeft <= 0) return this.finish(false); if (this.slipT <= 0) { this.state = 'run'; this.nextBeat = this.t + this.beat * .5; } }
  },
  judge(presses) {
    const pad = this.pads[this.at];
    if (!pad) return;
    const err = this.t - this.nextBeat;
    const want = pad.double ? pad.double : [pad.btn];
    const pressed = presses.slice().sort().join(), need = want.slice().sort().join();
    const tight = G.T.perfectWin * 1.2 * G.T.poolWindowMul, loose = G.T.greatWin * 1.3 * G.T.poolWindowMul;
    const ae = Math.abs(err);
    if (pressed !== need) return this.slip('wrong button');
    if (ae > loose) return this.slip(err < 0 ? 'early' : 'late');
    const q = ae <= tight ? 'PERFECT' : 'GOOD';
    if (q === 'PERFECT') { this.perfect++; this.run++; if (this.run % 8 === 0) { this.timeLeft += 1; G.toast('+1 second!'); } }
    else { this.good++; this.run = 0; }
    this.lastJudge = { q, t: this.t };
    G.sfx('hopLand');
    this.hop = { t: 0, from: this.at, to: this.at + 1 };
    this.at++;
    this.nextBeat += this.beat;
    if (this.at >= this.pads.length) return this.finish(true);
  },
  slip(why) {
    this.falls++; this.run = 0;
    this.lastJudge = { q: 'SLIP', t: this.t, why };
    G.sfx('splash');
    this.state = 'slip'; this.slipT = 1.8;
    this.hop = null;
  },
  finish(cleared) {
    const st = G.state;
    const time = G.T.poolTime - this.timeLeft;
    this.res = { cleared, time, perfect: this.perfect, falls: this.falls };
    if (cleared) {
      const prize = 2000 + 400 * this.perfect + 150 * Math.max(0, this.timeLeft);
      G.earn(prize * G.T.prizeMul, 'poolhop');
      const best = st.stats.poolBest;
      if (best === null || time < best) st.stats.poolBest = Math.round(time * 10) / 10;
      if (st.partner) G.addAff(st.partner, 2);
    }
    this.state = 'done';
    this.doneT = 0;
  },
  leave() { G.game.go(this.from === 'location' ? 'location' : 'map', { place: 'pool' }); },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    // the pool: a shimmer of water with the pads floating on it
    r.overlay(g => { E.px.rect(g, 0, Math.round(H * .3), W, Math.round(H * .6), '#2ec4c9'); });
    this.pads.forEach((p, i) => {
      const onPad = i === this.at;
      r.queue(p.x, p.y, 0, g => { const q = r.w(p.x, p.y, 0); E.px.disc(g, q[0], q[1], 9, i < this.at ? '#5fe0b4' : onPad ? '#ffd36a' : '#f6efe0'); E.px.disc(g, q[0], q[1], 7, i < this.at ? '#3ab090' : onPad ? '#ffb040' : '#d8cdb8'); }, { bias: -2 });
    });
    const hp = this.pads[Math.min(this.at, this.pads.length - 1)];
    const hx = this.hop ? this.pads[this.hop.from].x + (hp.x - this.pads[this.hop.from].x) * Math.min(1, this.hop.t / .3) : hp.x;
    r.actor(hx, hp.y, this.hop ? Math.sin(Math.min(1, this.hop.t / .4) * Math.PI) * 14 : 0, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); }, { pick: 'hopper' });
    // the glyph on each pad near the hopper
    for (let i = this.at; i < Math.min(this.pads.length, this.at + 4); i++) {
      const p = this.pads[i], q = r.w(p.x, p.y, 12);
      const flip = p.wobble && i === this.at && this.nextBeat - this.t > this.beat && Math.floor(this.t * 6) % 2 === 1;
      const act = p.double ? p.double[0] : flip ? { hopA: 'hopB', hopB: 'hopA', hopX: 'hopY', hopY: 'hopX' }[p.btn] : p.btn;
      if (q && q[0] !== undefined) { G.promptAt(r, act, q[0] - 5, q[1] - 14, { scale: 1 }); if (p.double) G.promptAt(r, p.double[1], q[0] + 6, q[1] - 14, { scale: 1 }); }
    }
    r.overlay(g => {
      E.ui.box(g, 6, 6, 140, 34, { bg: ['#0a2d3d', '#051a26'], border: '#f6d38a', alpha: .9 });
      E.font.text(g, 'POOL HOP', 12, 10, '#ffd36a', { shadow: '#000' });
      E.font.text(g, 'Time ' + Math.max(0, this.timeLeft).toFixed(1) + 's', 12, 22, '#fff8e8', { shadow: '#000' });
      E.font.text(g, 'Pad ' + Math.min(32, this.at) + '/32 · P' + this.perfect, W - 8, 10, '#fff8e8', { align: 'right', shadow: '#000' });
      if (this.lastJudge && this.t - this.lastJudge.t < .7) E.font.text(g, this.lastJudge.q, W / 2, H * .25, this.lastJudge.q === 'PERFECT' ? '#ffd36a' : this.lastJudge.q === 'SLIP' ? '#ff9a9a' : '#fff8e8', { align: 'center', scale: 2, shadow: '#000' });
      if (this.state === 'ready') E.font.text(g, 'Hop on the beat!', W / 2, H * .12, '#fff8e8', { align: 'center', scale: 2, shadow: '#000' });
      if (this.state === 'done') {
        E.ui.box(g, W / 2 - 120, H / 2 - 40, 240, 80, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
        E.font.text(g, this.res.cleared ? 'Cleared in ' + this.res.time.toFixed(1) + 's' : 'Out of time', W / 2, H / 2 - 30, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
        E.font.text(g, 'Perfects ' + this.res.perfect + ' · Falls ' + this.res.falls, W / 2, H / 2 - 4, '#fff8e8', { align: 'center', shadow: '#000' });
      }
    });
    if (this.state === 'done') { this.doneT += 0; G.promptBar(r, [['confirm', 'Continue']]); if (G.game.input.pressed('confirm')) this.leave(); }
    else G.promptBar(r, [['hopA', 'Hop'], ['cancel', 'Leave']]);
  }
};
/* a prompt glyph at a buffer point (drawn on the overlay) */
G.promptAt = function (r, action, x, y, o) { G.prompt(r, action, x, y, '', o || {}); };

/* ==== 41-casino.js ==== */
/* 41-casino: Casino Fortuna, nights only. The cashier (chips at S$100), Fortuna Sevens (a pachislot with stop buttons),
 * blackjack (6 decks, dealer stands on soft 17 unless the toggle says otherwise, 3:2, double, one split), roulette (single
 * zero in the real wheel order). The chip count shows on every screen. */
G.CHIP = 100;
G.REELS = [
  ['7', 'BAR', 'C', 'P', 'V', 'S', 'C', 'P', 'V', 'BAR', 'C', 'S', 'P', 'V', 'C', 'BAR', 'P', 'V', 'C', 'S', 'P'],
  ['C', 'P', 'V', 'S', 'BAR', 'C', 'V', 'P', 'S', 'C', 'BAR', 'V', 'P', 'C', 'S', 'V', 'P', 'C', '7', 'V', 'P'],
  ['P', 'C', 'S', 'V', 'C', 'BAR', 'P', 'V', 'S', 'C', 'P', '7', 'V', 'C', 'P', 'S', 'V', 'C', 'P', 'BAR', 'V']
];
G.SYM = { '7': 'seven', BAR: 'bar', V: 'vb', P: 'palm', C: 'coco', S: 'sonny', CH: 'cherry' };
/* pays per chip bet on a line: a line is a row (the centre line; 2 more with two chips; 3 more with diagonals) */
G.payLine = function (a, b, c) {
  if (a === '7' && b === '7' && c === '7') return 220;
  if (a === 'BAR' && b === 'BAR' && c === 'BAR') return 66;
  if ([a, b, c].every(x => x === 'S' || x === 'SONNY')) return 44;
  if (a === 'V' && b === 'V' && c === 'V') return 26;
  if (a === 'P' && b === 'P' && c === 'P') return 18;
  if (a === 'C' && b === 'C' && c === 'C') return 11;
  const ch = [a, b, c].filter(x => x === 'CH').length; if (ch) return ch === 1 ? 4 : ch === 2 ? 11 : 22;
  return 0;
};
/* a stop for a reel: the symbol at the stop index; the slip moves it 0-4 places down the strip */
G.reelStop = function (reel, i) { return G.REELS[reel][((i % 21) + 21) % 21]; };
G.spinOnce = function (rng) {
  const idx = [0, 1, 2].map(() => Math.floor(rng() * 21));
  return idx;
};
G.slotsPay = function (grid, bet) {
  // grid[row][reel]: rows 0 top, 1 centre, 2 bottom; the lines bet pays on: centre; with 2 top and bottom; 3 diagonals
  const lines = [[grid[1][0], grid[1][1], grid[1][2]]];
  if (bet >= 2) { lines.push([grid[0][0], grid[0][1], grid[0][2]], [grid[2][0], grid[2][1], grid[2][2]]); }
  if (bet >= 3) { lines.push([grid[0][0], grid[1][1], grid[2][2]], [grid[2][0], grid[1][1], grid[0][2]]); }
  // the stake is split evenly over the active lines: the return does not depend on how many lines are bet
  let pay = 0; for (const l of lines) pay += G.payLine(l[0], l[1], l[2]) * (bet / lines.length);
  return pay * G.T.slotsPayMul;
};
/* 6-deck shoe, reshuffled at 75% */
G.makeShoe = function () {
  const suits = ['S', 'H', 'D', 'C'], ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const cards = []; for (let d = 0; d < 6; d++) for (const s of suits) for (const r of ranks) cards.push(r + s);
  return cards;
};
G.cardVal = function (c) { const r = c[0]; if (r === 'A') return 11; if (['T', 'J', 'Q', 'K'].includes(r)) return 10; return +r; };
G.handTotal = function (cards) { let t = 0, a = 0; for (const c of cards) { t += G.cardVal(c); if (c[0] === 'A') a++; } while (t > 21 && a > 0) { t -= 10; a--; } return { t, soft: a > 0 && t <= 21 && cards.some(c => c[0] === 'A') && t - 10 * 0 !== 0 && a > 0 }; };
G.ROULETTE = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
G.RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
G.rouletteWin = function (bet, n) {
  if (bet.type === 'straight') return n === bet.n ? 35 : null;
  if (n === 0) return null;
  if (bet.type === 'red') return G.RED.includes(n) ? 1 : null;
  if (bet.type === 'black') return !G.RED.includes(n) ? 1 : null;
  if (bet.type === 'odd') return n % 2 === 1 ? 1 : null;
  if (bet.type === 'even') return n % 2 === 0 ? 1 : null;
  if (bet.type === 'low') return n <= 18 ? 1 : null;
  if (bet.type === 'high') return n >= 19 ? 1 : null;
  if (bet.type === 'dozen') return Math.ceil(n / 12) === bet.n ? 2 : null;
  if (bet.type === 'column') return n % 3 === ((bet.n) % 3) && n > 0 ? 2 : null;
  return null;
};
G.casinoScene = {
  enter(data) {
    this.focus = data.focus || 'floor'; this.from = data.from || 'map';
    this.mode = this.focus === 'cashier' ? 'cashier' : this.focus === 'blackjack' ? 'bj' : this.focus === 'roulette' ? 'roulette' : this.focus === 'slots' ? 'slots' : 'floor';
    this.chips = G.state.chips; this.bg = new E.Backdrop('night');
    this.box = G.box; G.game.lights.enabled = true; G.game.lights.ambient = .4;
    G.music('neon');
    this.menu = null; this.sub = null;
    this.buildFloor();
    if (G.state.day === 1 && !G.state.flags.casinoOpen) { G.state.flags.casinoOpen = true; G.state.chips += 20; this.box.say(['Free chips for the first night! Twenty chips, on the house. Don\'t spend them all in one spin.'], { name: 'SONNY', prof: G.STAFF.sonny.voice }); }
    this.slots = { bet: 1, reels: [0, 0, 0], spinning: false, stopped: [false, false, false], t: 0, win: 0, last: null };
    this.bj = null; this.rl = { bet: 1, placed: [], spin: null, last: [] };
    this.shoe = G.makeShoe(); this.shoePos = 0;
  },
  chipsSet(n) { G.state.chips = Math.max(0, n); this.chips = G.state.chips; },
  buildFloor() {
    const items = [{ label: 'Cashier', kind: 'cashier' }, { label: 'Fortuna Sevens', kind: 'slots' }, { label: 'Blackjack', kind: 'bj' }, { label: 'Roulette', kind: 'roulette' }, { label: 'Leave the casino', kind: 'leave' }];
    this.menu = new G.List({ items: items.map(it => ({ label: it.label, onPick: () => { this.mode = it.kind === 'leave' ? 'leave' : it.kind; if (it.kind === 'bj') this.newHand(); } })), x: 16, y: 54, w: 180, rowH: 24, max: 6, scale: 2 });
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (this.mode === 'floor') {
      if (I.pressed('cancel')) return this.leaveCasino();
      this.menu.update(I, dt);
      if (this.menu.i >= 0 && this.menu.items[this.menu.i] && this.mode !== 'floor') { /* item picked */ }
      return;
    }
    if (I.pressed('cancel') && this.mode !== 'bj-play') { this.mode = 'floor'; return; }
    if (this.mode === 'cashier') return this.updCashier(I, dt);
    if (this.mode === 'slots') return this.updSlots(I, dt);
    if (this.mode === 'bj') return this.updBJ(I, dt);
    if (this.mode === 'roulette') return this.updRoulette(I, dt);
    if (this.mode === 'leave') return this.leaveCasino();
  },
  leaveCasino() {
    G.state.chips = this.chips;
    G.game.lights.enabled = false;
    if (G.state.chips > 0 && false) { /* the chips stay */ }
    G.game.go('map', { afterLocation: true, after: 'casino' });
  },
  updCashier(I, dt) {
    if (I.pressed('confirm')) { this.buy(10); }
    if (I.pressed('alt')) { this.buy(50); }
    if (I.pressed('extra')) { this.buy(100); }
    if (I.pressed('tabR')) this.cashOut();
  },
  buy(n) { const cost = n * G.CHIP; if (G.state.money < cost) { G.sfx('ui_error'); return G.toast('Not enough money for ' + n + ' chips'); } G.spend(cost); G.state.chips += n; G.sfx('chip'); this.chips = G.state.chips; },
  cashOut() { const n = G.state.chips; if (!n) return; G.earn(n * G.CHIP, 'chips'); G.state.chips = 0; this.chips = 0; G.sfx('cash'); G.toast('Cashed out ' + n + ' chips'); },
  updSlots(I, dt) {
    const s = this.slots;
    if (!s.spinning) {
      if (I.pressed('shot') || I.pressed('dive')) {}
      if (I.pressed('play') || I.pressed('confirm')) {
        if (G.state.chips < s.bet) { G.sfx('ui_error'); return G.toast('Not enough chips'); }
        G.state.chips -= s.bet; this.chips = G.state.chips;
        s.spinning = true; s.stopped = [false, false, false]; s.t = 0; s.rolls = [0, 0, 0];
        s.target = G.spinOnce(G.rngFn('casino'));
        G.sfx('reel_spin');
      }
      if (I.pressed('extra')) { s.bet = s.bet % 3 + 1; }
      return;
    }
    s.t += dt;
    for (let r = 0; r < 3; r++) if (!s.stopped[r]) s.rolls[r] = (s.rolls[r] + dt * 30) % 21;
    const stops = [['reel1', 'J'], ['reel2', 'K'], ['reel3', 'L']];
    [I.pressed('reel1'), I.pressed('reel2'), I.pressed('reel3')].forEach((p, r) => { if (p && !s.stopped[r]) { s.stopped[r] = true; const slip = Math.floor(G.rng('casino') * 5); s.reels[r] = (s.target[r] + slip) % 21; G.sfx('reel_stop'); } });
    if (I.pressed('play') && s.stopped.every(x => x) === false) { /* further presses do nothing */ }
    if (s.stopped.every(x => x)) {
      s.spinning = false;
      const grid = [0, 1, 2].map(row => [0, 1, 2].map(rl => G.reelStop(rl, s.reels[rl] + row - 1)));
      const pay = G.slotsPay(grid, s.bet);
      s.last = grid; s.win = pay;
      if (pay > 0) { G.state.chips += pay; this.chips = G.state.chips; G.sfx(pay >= 100 * s.bet ? 'jackpot' : 'cash'); if (pay >= 100 * s.bet) G.toast('JACKPOT!'); }
      G.state.stats.casinoNet = (G.state.stats.casinoNet || 0) + pay - s.bet;
    }
  },
  newHand() {
    this.bj = { bet: 5, hands: [], dealer: [], phase: 'bet', msg: '' };
    this.dealt = false;
  },
  drawCard(next) { if (this.shoePos >= this.shoe.length * .75) { this.shoe = G.makeShoe(); this.shoePos = 0; } const c = this.shoe[this.shoePos++]; return c; },
  updBJ(I, dt) {
    const b = this.bj; if (!b) return;
    if (b.phase === 'bet') {
      if (I.pressed('left') && b.bet > 1) b.bet = [1, 5, 10, 25].reverse().find(v => v < b.bet) || 1;
      if (I.pressed('right')) b.bet = [1, 5, 10, 25].find(v => v > b.bet) || 25;
      if (I.pressed('confirm')) {
        if (G.state.chips < b.bet) { G.sfx('ui_error'); return G.toast('Not enough chips'); }
        G.state.chips -= b.bet; this.chips = G.state.chips;
        b.hands = [{ cards: [this.drawCard(), this.drawCard()], bet: b.bet, done: false, doubled: false }];
        b.dealer = [this.drawCard(), this.drawCard()];
        b.phase = 'play'; G.sfx('card_deal');
        const pt = G.handTotal(b.hands[0].cards).t, dt2 = G.handTotal(b.dealer).t;
        if (pt === 21 || dt2 === 21) return this.settle();
      }
      return;
    }
    if (b.phase === 'play') {
      const h = b.hands[b.cur || 0];
      if (!h) return this.settle();
      if (I.pressed('hit')) { h.cards.push(this.drawCard()); G.sfx('card_deal'); if (G.handTotal(h.cards).t > 21) { h.done = true; this.advanceHand(); } }
      if (I.pressed('stand')) { h.done = true; this.advanceHand(); }
      if (I.pressed('double') && h.cards.length === 2 && G.state.chips >= h.bet) { G.state.chips -= h.bet; this.chips = G.state.chips; h.bet *= 2; h.doubled = true; h.cards.push(this.drawCard()); h.done = true; G.sfx('chip'); this.advanceHand(); }
      if (I.pressed('split') && h.cards.length === 2 && b.hands.length === 1 && h.cards[0][0] === h.cards[1][0] && G.state.chips >= h.bet) {
        G.state.chips -= h.bet; this.chips = G.state.chips;
        const c2 = h.cards.pop(); b.hands.push({ cards: [c2, this.drawCard()], bet: h.bet, done: false });
        h.cards.push(this.drawCard()); G.sfx('card_flip');
      }
    }
  },
  advanceHand() {
    const b = this.bj; const next = b.hands.findIndex(h => !h.done);
    if (next >= 0) b.cur = next; else this.settle();
  },
  settle() {
    const b = this.bj; if (!b) return;
    // the dealer draws to 17 (stands on soft 17 unless the toggle)
    const anyLive = b.hands.some(h => G.handTotal(h.cards).t <= 21);
    let dt2 = G.handTotal(b.dealer);
    if (anyLive) {
      while (dt2.t < 17 || (dt2.t === 17 && G.T.dealerHitsSoft17 && dt2.soft)) { b.dealer.push(this.drawCard()); dt2 = G.handTotal(b.dealer); }
    }
    let won = 0, lines = [];
    for (const h of b.hands) {
      const pt = G.handTotal(h.cards).t, bjk = h.cards.length === 2 && pt === 21 && b.hands.length === 1;
      let pay = 0;
      if (pt > 21) pay = 0;
      else if (bjk && dt2.t !== 21) pay = h.bet * 2.5;
      else if (dt2.t > 21 || pt > dt2.t) pay = h.bet * 2;
      else if (pt === dt2.t) pay = h.bet;
      won += pay; lines.push(pt > 21 ? 'bust' : pay > h.bet ? 'win' : pay === h.bet ? 'push' : 'lose');
    }
    if (won) { G.state.chips += Math.round(won); this.chips = G.state.chips; G.sfx('cash'); }
    G.state.stats.casinoNet = (G.state.stats.casinoNet || 0) + won - b.hands.reduce((a, h) => a + h.bet, 0);
    b.phase = 'done'; b.msg = lines.join(' · ');
    if (dt2.t > 21) b.msg = 'Dealer busts. ' + b.msg;
    this.box.say(['Pepper: ' + (lines.indexOf('win') >= 0 ? 'Statistically, that was fortunate.' : 'The house always keeps a little.')], { name: 'PEPPER', prof: G.STAFF.pepper.voice });
  },
  updRoulette(I, dt) {
    const R = this.rl;
    if (R.spin) {
      R.spin.t += dt;
      if (R.spin.t > 2.2) { R.last.unshift(R.spin.n); R.last = R.last.slice(0, 10); this.settleRoulette(R.spin.n); R.spin = null; }
      return;
    }
    if (I.pressed('left')) R.cursor = ((R.cursor || 0) + 36 - 1) % 36;
    if (I.pressed('right')) R.cursor = ((R.cursor || 0) + 1) % 36;
    if (I.pressed('confirm')) { const n = (R.cursor || 0) + 1; R.placed.push({ type: 'straight', n, amt: R.bet }); G.sfx('chip'); }
    if (I.pressed('tabR')) { R.bet = [1, 5, 10, 25][([1, 5, 10, 25].indexOf(R.bet) + 1) % 4] || 1; }
    if (I.pressed('play') || I.pressed('dive')) { if (R.placed.length) { const n = Math.floor(G.rng('casino') * (G.T.rouletteDoubleZero ? 38 : 37)); R.spin = { t: 0, n: G.ROULETTE[n % 37] }; G.sfx('wheel_spin'); } }
    if (I.pressed('shot')) { R.placed = []; }
  },
  settleRoulette(n) {
    let pay = 0;
    for (const b of this.rl.placed) { const m = G.rouletteWin(b, n); if (m !== null) pay += b.amt * (m + 1); }
    const staked = this.rl.placed.reduce((a, b) => a + b.amt, 0);
    if (pay) { G.state.chips += pay; this.chips = G.state.chips; G.sfx('jackpot'); }
    G.state.stats.casinoNet = (G.state.stats.casinoNet || 0) + pay - staked;
    this.rl.placed = []; this.rl.result = n;
  },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    G.screenTitle(r, 'CASINO FORTUNA', 'Chips: ' + G.state.chips + ' · ' + G.fmtMoney(G.state.money));
    if (this.mode === 'floor') { r.overlay(g => { E.ui.box(g, 8, 44, 196, 170, { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', alpha: .6 }); }); this.menu.draw(r); }
    if (this.mode === 'cashier') { r.overlay(g => { E.ui.box(g, 30, 60, W - 60, 120, { bg: ['#2a1240', '#12081e'], border: '#ff5fa2' }); E.font.text(g, 'CASHIER', W / 2, 70, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' }); E.font.text(g, 'Chips are S$100 each. You hold ' + G.state.chips + '.', W / 2, 100, '#fff8e8', { align: 'center', shadow: '#000' }); E.font.text(g, '✕ buy 10 · □ buy 50 · △ buy 100 · R1 cash out', W / 2, 130, '#9fd3d6', { align: 'center', shadow: '#000' }); }); G.promptBar(r, [['confirm', 'Buy 10'], ['cancel', 'Leave']]); }
    if (this.mode === 'slots') this.drawSlots(r);
    if (this.mode === 'bj') this.drawBJ(r);
    if (this.mode === 'roulette') this.drawRoulette(r);
    this.box.draw(r);
  },
  drawSlots(r) {
    const s = this.slots, W = r.W, H = r.H;
    r.overlay(g => {
      E.ui.box(g, W / 2 - 110, 50, 220, 130, { bg: ['#2a1240', '#12081e'], border: '#5ff0ff', alpha: .95 });
      for (let rl = 0; rl < 3; rl++) {
        const x = W / 2 - 80 + rl * 70;
        E.ui.box(g, x, 74, 56, 60, { bg: ['#f6efe0', '#d8cdb8'], border: '#5ff0ff', alpha: 1 });
        for (let row = 0; row < 3; row++) {
          const sym = s.spinning && !s.stopped[rl] ? G.REELS[rl][Math.floor(s.rolls ? s.rolls[rl] : 0 + row) % 21] : G.reelStop(rl, s.reels[rl] + row - 1);
          E.font.text(g, sym, x + 28, 80 + row * 18, '#1a1a24', { align: 'center', scale: 2 });
        }
      }
      E.font.text(g, 'BET ' + s.bet + ' · WIN ' + (s.win || 0), W / 2, 150, '#ffd36a', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, s.spinning ? [['reel1', 'Stop 1'], ['reel2', 'Stop 2'], ['reel3', 'Stop 3']] : [['play', 'Spin'], ['extra', 'Bet'], ['cancel', 'Leave']]);
  },
  drawBJ(r) {
    const b = this.bj, W = r.W, H = r.H; if (!b) return;
    r.overlay(g => {
      E.ui.box(g, 20, 52, W - 40, H - 100, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
      E.font.text(g, 'DEALER', W / 2, 60, '#9fd3d6', { align: 'center', shadow: '#000' });
      b.dealer.forEach((c, i) => { const x = W / 2 - 60 + i * 30; E.ui.box(g, x, 72, 24, 34, { bg: ['#fff8e8', '#e8e0cc'], border: '#1a1a24', alpha: 1 }); E.font.text(g, c, x + 3, 80, '#c22', { scale: 1 }); });
      E.font.text(g, 'YOU', W / 2, 120, '#9fd3d6', { align: 'center', shadow: '#000' });
      (b.hands || []).forEach((h, hi) => h.cards.forEach((c, i) => { const x = W / 2 - 60 + i * 30 + hi * 80; E.ui.box(g, x, 132, 24, 34, { bg: ['#fff8e8', '#e8e0cc'], border: '#1a1a24', alpha: 1 }); E.font.text(g, c, x + 3, 140, '#1a1a24', { scale: 1 }); }));
      if (b.phase === 'bet') E.font.text(g, 'BET ' + b.bet + ' · ✕ deal · ◂ ▸ change', W / 2, 180, '#ffd36a', { align: 'center', shadow: '#000' });
      if (b.msg) E.font.text(g, b.msg, W / 2, 180, '#ffd36a', { align: 'center', shadow: '#000' });
    });
    if (b.phase === 'play') G.promptBar(r, [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']]);
    else if (b.phase === 'done') G.promptBar(r, [['bet', 'Next hand']]);
    else G.promptBar(r, [['confirm', 'Deal'], ['cancel', 'Leave']]);
    if (b.phase === 'done' && G.game.input.pressed('bet')) this.newHand();
  },
  drawRoulette(r) {
    const R = this.rl, W = r.W, H = r.H;
    r.overlay(g => {
      E.ui.box(g, 16, 50, W - 32, H - 96, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
      const cur = R.cursor || 0;
      E.font.text(g, 'Straight-up numbers. Cursor: ' + (cur + 1) + ' · Chip ' + R.bet, W / 2, 60, '#ffd36a', { align: 'center', shadow: '#000' });
      for (let n = 1; n <= 36; n++) { const x = 40 + ((n - 1) % 12) * 24, y = 80 + Math.floor((n - 1) / 12) * 26; E.ui.box(g, x, y, 20, 20, { bg: G.RED.includes(n) ? ['#b02a3a', '#6a1620'] : ['#1a1a24', '#0a0a10'], border: n === cur + 1 ? '#ffd36a' : null, alpha: 1 }); E.font.text(g, String(n), x + 10, y + 6, '#fff8e8', { align: 'center', scale: 1 }); }
      E.font.text(g, 'Placed: ' + R.placed.length + ' · Last: ' + R.last.slice(0, 5).join(' '), W / 2, H - 80, '#9fd3d6', { align: 'center', shadow: '#000' });
      if (R.result !== undefined) E.font.text(g, 'Ball on ' + R.result, W / 2, H - 66, '#ffd36a', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Place'], ['play', 'Spin'], ['shot', 'Clear'], ['cancel', 'Leave']]);
  }
};
G.casinoScene.leave = function () { G.game.go('map', {}); };

/* ==== 42-photo.js ==== */
/* 42-photo: postcards (photo mode) and the album. A photo is saved as a spec (where, when, the pose, the filter, the frame),
 * never as pixels. The album shows each postcard as a framed card. */
G.POSES = ['Wave', 'Peace', 'Hips', 'Cheer', 'Stretch', 'Look Back', 'Sit', 'Victory', 'Salute', 'Bow'];
G.POSE_STATE = { Wave: { pose: 'wave' }, Peace: { pose: 'wave' }, Hips: { pose: 'hips' }, Cheer: { pose: 'cheer' }, Stretch: {}, 'Look Back': {}, Sit: { pose: 'kneel' }, Victory: { pose: 'cheer' }, Salute: { pose: 'cheer' }, Bow: { pose: 'kneel' } };
G.FILTERS = ['Clean', 'Sunny', 'Sepia', 'Retro', 'Night Glow'];
G.photoScene = {
  enter(data) {
    this.from = data.from || 'location'; this.place = data.place || 'beach';
    this.pose = 0; this.filter = 0; this.zoom = 1; this.panel = false; this.hideUi = false;
    this.flash = 0; this.last = null; this.bg = new E.Backdrop('dusk');
    this.rig = G.rigFor(G.state.me, { suit: G.state.wearing.suit, acc: G.state.wearing.acc });
    this.freeze = G.attractOn ? null : G.game.after(.5, () => { G.game.timeScale = 0; });
    this.t = 0;
  },
  exit() { if (this.freeze && this.freeze.cancel) this.freeze.cancel(); G.game.timeScale = 1; },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (I.pressed('cancel')) return G.game.go(this.from === 'location' ? 'location' : 'map', { place: this.place });
    if (I.pressed('hideUi')) this.hideUi = !this.hideUi;
    if (I.pressed('subject')) { this.group = !this.group; G.toast(this.group ? 'Group photo' : 'Just you'); }
    if (I.pressed('panel')) this.panel = !this.panel;
    if (this.panel) { if (I.pressed('left')) this.pose = (this.pose + G.POSES.length - 1) % G.POSES.length; if (I.pressed('right')) this.pose = (this.pose + 1) % G.POSES.length; if (I.pressed('confirm')) { this.filter = (this.filter + 1) % G.FILTERS.length; } return; }
    if (I.pressed('shoot')) this.take();
  },
  take() {
    const st = G.state;
    const spec = { place: this.place, day: st.day, slot: st.slot, weather: G.weatherNow(), pose: G.POSES[this.pose], filter: G.FILTERS[this.filter], frame: 'postcard', who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), t: Math.round(this.t) };
    st.album = st.album || [];
    if (st.album.length >= 24) { G.toast('The album is full: 24 postcards'); return; }
    spec.people = [{ who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), x: 0 }].concat(G.npcsAt(this.place, st.slot).slice(0, this.group ? 2 : 0).map(f => ({ who: f, suit: st.npcWear[f].suit, acc: (st.npcWear[f].acc || []).slice(), x: 0 })));
    st.album.push(spec); st.stats.photos = (st.stats.photos || 0) + 1;
    this.flash = .25; G.sfx('shutter');
    this.last = spec; G.toast('Postcard saved');
  },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    const pose = G.POSE_STATE[G.POSES[this.pose]] || {};
    r.actor(0, 0, 0, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); G.dress(g, r, this.rig, ox, oy); }, { pick: 'photo' });
    if (this.flash > 0) r.overlay(g => E.px.rect(g, 0, 0, W, H, '#ffffff'));
    if (!this.hideUi) {
      r.overlay(g => {
        E.font.text(g, 'POSTCARD · ' + G.POSES[this.pose] + ' · ' + G.FILTERS[this.filter], 8, 8, '#fff8e8', { shadow: '#000' });
        E.font.text(g, 'Album ' + ((G.state.album || []).length) + '/24', W - 8, 8, '#9fd3d6', { align: 'right', shadow: '#000' });
      });
      if (this.panel) { r.overlay(g => { E.ui.box(g, W - 130, 30, 124, 70, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 }); E.font.text(g, 'Pose ◂ ▸', W - 122, 36, '#fff8e8', { shadow: '#000' }); E.font.text(g, 'Filter ✕', W - 122, 50, '#fff8e8', { shadow: '#000' }); }); }
      G.promptBar(r, [['shoot', 'Shoot'], ['panel', 'Panel'], ['cancel', 'Exit']]);
    }
    if (this.last && this.t < 3) r.overlay(g => { E.ui.box(g, 10, H - 80, 140, 40, { bg: ['#fff8e8', '#e8e0cc'], border: '#c8502c', alpha: 1 }); E.font.text(g, 'Greetings from', 16, H - 74, '#c8502c', { scale: 1 }); E.font.text(g, 'Isla Fortuna', 16, H - 62, '#1a1a24', { scale: 1 }); E.font.text(g, 'Day ' + this.last.day, 16, H - 52, '#1a1a24', { scale: 1 }); });
  }
};
G.albumScene = {
  enter(data) {
    this.from = data.from || 'menu'; this.bg = new E.Backdrop('dusk');
    const album = (G.state && G.state.album) || E.store.get('aoa-album', []);
    this.items = album.map((sp, i) => ({ id: i, sp }));
    this.grid = new G.Grid({ items: this.items.length ? this.items : [{ id: -1, sp: null }], cols: 4, rows: 2, x: 16, y: 46, cw: 100, ch: 74, gap: 6 });
    this.from = data.from || 'menu';
    this.box = G.box;
  },
  update(dt) {
    const I = G.game.input;
    if (this.box.open) { this.box.update(I, dt); return; }
    if (I.pressed('cancel')) return G.game.go(this.from === 'menu' ? 'menu' : 'map', {});
    const hit = this.grid.update(I, dt);
    if (hit && hit.confirm && hit.item.sp) G.game.go('postcard', { spec: hit.item.sp, back: 'album' });
  },
  draw(r) {
    this.bg.draw(r);
    G.screenTitle(r, 'ALBUM', (this.items.length) + ' postcards');
    this.grid.draw(r, (g, it, x, y, w, h, focused) => {
      if (!it.sp) { E.font.text(g, 'No postcards yet', x + 6, y + 26, '#9fd3d6', { scale: 1, shadow: '#000' }); return; }
      E.ui.box(g, x, y, w, h, { bg: ['#fff8e8', '#e8e0cc'], border: '#c8502c', alpha: 1 });
      E.font.text(g, G.PLACES[it.sp.place].name, x + 5, y + 4, '#1a1a24', { scale: 1 });
      E.font.text(g, 'Day ' + it.sp.day + ' · ' + G.SLOTS[it.sp.slot], x + 5, y + 14, '#1a1a24', { scale: 1 });
      // a live thumbnail: the saved fighter in her suit and pose, drawn into the card
      const people = it.sp.people || [{ who: it.sp.who, suit: it.sp.suit, acc: it.sp.acc }];
      people.slice(0, 3).forEach((pe, i) => { const rig = G.beatRig(pe.who, { suit: pe.suit, acc: pe.acc }); rig.update(.02, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: .4, pose: (G.POSE_STATE[it.sp.pose] || {}).pose || null }); rig.draw(g, x + w / 2 + (i - (Math.min(3, people.length) - 1) / 2) * 18, y + h - 6, r.view); });
    });
    G.promptBar(r, [['confirm', 'View'], ['cancel', 'Back']]);
    this.box.draw(r);
  }
};
/* a saved postcard, re-rendered live: the fighter in the suit and accessories she wore, in the pose and with the filter it was
 * taken with, on a backdrop for the time of day it was taken */
G.FILTER_TINT = { 'Clean': null, 'Sunny': ['#ffb040', .18], 'Sepia': ['#a07040', .35], 'Retro': ['#40a0c0', .22], 'Night Glow': ['#5040a0', .3] };
/* R1: the screen as a PNG, downloaded (in a browser only) */
G.exportPng = function (spec) {
  try {
    const cv = G.game.screen && G.game.screen.canvas;
    if (!cv || typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png'); a.download = 'postcard-' + spec.place + '-day' + spec.day + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    G.toast('Postcard saved as PNG');
  } catch (e) { G.toast('PNG export is not available here'); }
};
/* the party's group photo, taken by the game: everyone who is still on the island and the photographer */
G.groupPhoto = function () {
  const st = G.state, who = G.NPCS.filter(f => f !== st.me).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0)).slice(0, 3);
  const spec = { place: 'beach', day: st.day, slot: 2, weather: G.weatherNow(), pose: 'Cheer', filter: 'Night Glow', who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), frame: 'postcard', t: 0, group: true,
    people: [{ who: st.me, suit: st.wearing.suit, acc: st.wearing.acc.slice(), x: 0 }].concat(who.map(f => ({ who: f, suit: st.npcWear[f].suit, acc: (st.npcWear[f].acc || []).slice(), x: 0 }))) };
  st.album = st.album || [];
  if (st.album.length < 24) st.album.push(spec);
  return spec;
};
G.postcardScene = {
  enter(data) {
    this.spec = data.spec; this.back = data.back || 'album';
    this.rig = G.rigFor(this.spec.who, { suit: this.spec.suit, acc: this.spec.acc });
    this.bg = new E.Backdrop(this.spec.slot === 2 ? 'night' : 'dusk');
    this.t = 0;
    G.music(this.spec.slot === 2 ? 'siesta' : 'island');
  },
  update(dt) {
    const I = G.game.input; this.t += dt;
    if (I.pressed('cancel') || I.pressed('confirm')) return G.game.go(this.back, {});
    if (I.pressed('extra')) G.exportPng(this.spec);
    const st = G.POSE_STATE[this.spec.pose] || {};
    this.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.sin(this.t * .3) * .4, pose: st.pose || null });
  },
  draw(r) {
    const W = r.W, H = r.H, sp = this.spec;
    this.bg.draw(r);
    const people = sp.people || [{ who: sp.who, suit: sp.suit, acc: sp.acc }], n = people.length;
    people.forEach((pe, i) => { const rig = i === 0 ? this.rig : G.beatRig(pe.who, { suit: pe.suit, acc: pe.acc }); if (i > 0) rig.update(.02, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose: 'wave' }); const ox0 = (i - (n - 1) / 2) * 56; r.actor(ox0, 0, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: 'postcard' + i }); });
    const tint = G.FILTER_TINT[sp.filter];
    if (tint) r.overlay(g => E.px.blend(g, tint[1], 'multiply', () => E.px.rect(g, 0, 0, W, H, tint[0])));
    r.overlay(g => {
      E.ui.box(g, 10, 10, W - 20, 26, { bg: ['#fff8e8', '#e8e0cc'], border: '#c8502c', alpha: .95 });
      E.font.text(g, 'Greetings from ' + G.PLACES[sp.place].name, W / 2, 16, '#c8502c', { align: 'center', scale: 2 });
      E.font.text(g, 'Day ' + sp.day + ' · ' + G.SLOTS[sp.slot] + ' · ' + sp.weather + ' · ' + sp.pose + ' · ' + sp.filter, W / 2, H - 36, '#fff8e8', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Back to album'], ['extra', 'Save PNG']]);
  }
};

/* ==== 50-title.js ==== */
/* any input at all: the attract mode counts it as activity */
function acted(I) { return !!(I.anyPressed && I.anyPressed()) || (I.mouse && I.mouse.active && I.mouse.t > I.clock - .2); }
/* 50-title: the title screen (a sunset beach with the six fighters idling on the sand) and the main menu. */
G.titleRigs = null;
/* the title's fighters idle on their own clips, each a little different */
G.TITLE_CLIPS = ['Dance_Loop', 'Idle_Talking_Loop', 'Victory', 'Wave_Hello', 'Head Nod', 'Stretch_Yawn'];
G.titleTick = function (dt) {
  G.titleT = (G.titleT || 0) + dt;
  G.ensureTitleRigs().forEach((f, i) => { G.mocapSet(f.rig, G.TITLE_CLIPS[i % G.TITLE_CLIPS.length], G.titleT + f.phase); f.rig.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); });
};
G.ensureTitleRigs = function () {
  if (G.titleRigs) return G.titleRigs;
  const list = G.FIGHTERS.map((id, i) => ({ id, rig: G.rigFor(id, { suit: G.CAST[id].signature, acc: G.CAST[id].starts.acc }), x: 0, y: 0, phase: i * .9 }));
  G.titleRigs = list;
  return list;
};
G.titleScene = {
  enter() {
    const game = G.game;
    G.ensureTitleRigs();
    this.bg = new E.Backdrop('dusk');
    this.t = 0; this.idle = 0; this.sentAttract = false;
    game.audio.music && game.audio.music('title');
    game.follow(null); game.cam.bounds = null;
    game.setView(E.VIEWS.threequarter);
    game.focus && game.focus(0, 0, 0);
    this.blink = 0;
  },
  update(dt) {
    const I = G.game.input;
    this.t += dt;
    G.titleTick(dt);
    if (acted(I)) this.idle = 0; else this.idle += dt;
    if (I.pressed('confirm') || I.pressed('start')) { G.game.go('menu', {}); }
    if (I.pressed('cancel')) { /* nothing to cancel on the title */ }
    if (this.idle > 10 && !this.sentAttract) { this.sentAttract = true; G.game.go('attract', {}); }
  },
  draw(r) {
    this.bg.draw(r);
    const W = r.W, H = r.H;
    G.noteDevice();
    if (G.touchOnly()) { G.touchGate(r); return; }
    // the logo and the strap, from the top
    r.overlay(g => {
      E.font.title(g, 'AHEAD OR ALIVE', W / 2, H * .10, { scale: 4, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'] });
      E.font.text(g, 'XTREME BEACH VOLLEYBALL', W / 2, H * .10 + 46, '#ffffff', { scale: 2, align: 'center', shadow: '#0a6a7a' });
    });
    // the fighters in a row on the sand
    const list = G.ensureTitleRigs();
    list.forEach((f, i) => {
      const x = (i - 2.5) * 40, y = 46;
      const sx = W / 2 + x * 1.0;
      r.actor(x, y, 0, (g, ox, oy) => { f.rig.draw(g, ox, oy, r.view); G.dress(g, r, f.rig, ox, oy); }, { pick: f });
    });
    if (Math.floor(this.t * 2) % 2 === 0) G.promptBar(r, [['confirm', 'Press to start']]);
    else G.promptBar(r, [['confirm', 'Press to start']]);
    r.overlay(g => E.font.text(g, E.versionLabel ? E.versionLabel() : 'v0.85', W - 6, H - 30, "#9fd3d6", { align: "right", scale: 1, shadow: "#000" }));
  }
};
/* the main menu: a list at the left; the fighter preview at the right */
G.menuScene = {
  enter() {
    const game = G.game;
    game.audio.music && game.audio.music('title');
    const has = !!G.latestSave();
    const items = [
      { label: 'New Vacation', onPick: () => G.game.go('invitation', {}) },
      { label: 'Continue', disabled: !has, onPick: () => G.continueGame() },
      { label: 'Load', disabled: !has, onPick: () => G.game.saves && G.game.saves.show('load') },
      { label: 'Beach Match', onPick: () => G.game.go('exhibition', {}) },
      { label: 'Album', onPick: () => G.game.go('album', { from: 'menu' }) },
      { label: 'How to Play', onPick: () => G.game.go('howto', { page: 0 }) },
      { label: 'Settings', onPick: () => G.game.menu && G.game.menu('settings') },
      { label: 'About & Credits', onPick: () => G.game.go('about', { page: 0 }) }
    ];
    this.list = new G.List({ items, x: 24, y: 56, w: 200, rowH: 22, max: 6, scale: 2 });
    this.idle = 0; this.sentAttract = false;
    this.list.i = 0;
    this.preview = G.ensureTitleRigs();
    this.t = 0;
    game.setView(E.VIEWS.threequarter);
    this.bg = new E.Backdrop('dusk');
  },
  update(dt) {
    const I = G.game.input;
    this.t += dt;
    if (I.pressed('cancel')) { G.game.go('title', {}); return; }
    this.list.update(I, dt);
    this.idle = acted(I) ? 0 : (this.idle || 0) + dt;
    if (this.idle > 10 && !this.sentAttract) { this.sentAttract = true; G.game.go('attract', {}); }
  },
  draw(r) {
    this.bg.draw(r);
    this.list.draw(r);
    const i = this.list.i, f = this.preview[i % this.preview.length];
    r.actor(r.W * .8, r.H * .62, 0, (g, ox, oy) => { f.rig.draw(g, ox, oy, r.view); G.dress(g, r, f.rig, ox, oy); }, { pick: f });
    r.overlay(g => {
      E.font.text(g, 'MAIN MENU', 24, 30, '#ffd36a', { scale: 2, shadow: '#000' });
      const it = this.list.items[this.list.i];
      if (it && it.sub) E.font.text(g, it.sub, 24, r.H - 40, '#9fd3d6', { shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
/* the touch-only gate: a device with a touch screen and no key or pad yet gets this panel instead of touch controls */
G.touchGate = function (r) {
  const W = r.W, H = r.H, I = G.game.input, bw = Math.min(W - 60, 300), x = Math.round(W / 2 - bw / 2), y = Math.round(H / 2 - 50);
  r.overlay(g => {
    E.ui.box(g, x, y, bw, 100, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
    E.font.text(g, 'Controller or keyboard required', W / 2, y + 10, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
    E.font.text(g, 'Connect a controller or keyboard to play. The demo keeps running.', W / 2, y + 40, '#fff8e8', { align: 'center', shadow: '#000' });
    E.ui.box(g, W / 2 - 50, y + 70, 100, 18, { bg: ['#ffe9a6', '#f0b04a'], border: '#fff8e8', alpha: 1 });
    E.font.text(g, 'Settings', W / 2, y + 74, '#1a1a24', { align: 'center', shadow: null });
  });
  const hit = I.clicked && I.clicked();
  if (hit && hit[0] >= W / 2 - 50 && hit[0] <= W / 2 + 50 && hit[1] >= y + 70 && hit[1] <= y + 88) G.game.menu && G.game.menu('settings');
  return true;
};
G.latestSave = function () { return G.game && G.game.saves ? G.game.saves.latest() : null; };
G.continueGame = function () { const s = G.latestSave(); if (s) G.game.saves.load(s.slot); };

/* ==== 50b-pages.js ==== */
/* 50b-pages: How to Play (ten pages, one idea each) and About & Credits (pages turned with the shoulders or the stick). */
G.HOWTO = [
  ['Moving and the ring', ['Move with the stick or WASD.', 'The ring on the sand shows where the ball comes down.', 'Stand in it and press {play} as the ball arrives.']],
  ['The touch chain', ['Bump the ball up. Set it to your partner. Spike it over.', 'Each side has three touches. Your partner cannot touch twice in a row.']],
  ['Aiming and shots', ['Push the stick, or point the mouse, to aim your spike.', '{shot} sends a soft shot over the block.']],
  ['Serving', ['{play} tosses. Press {play} again at the top of the toss.', '{shot} tosses for a jump serve, which is faster and harder to read.']],
  ['Blocking and diving', ['When they spike near the net, press {shot} to block.', 'Out of reach? {dive} dives. A dive can still save the point.']],
  ['Calls and chemistry', ['{call} calls Mine, Yours or Auto. Your partner listens.', 'The better you two get along, the better she plays.']],
  ['The vacation', ['Five days, three slots each: Morning, Afternoon and Night.', 'Walking into a place and leaving it ends a slot. Sleep ends the day.']],
  ['Friends and gifts', ['Talk, chat and give gifts to raise affinity.', 'Each fighter loves some gifts and dislikes others. Find out in the Journal.']],
  ['Casino and Pool Hop', ['Pool Hop: hop on the beat, one button per pad.', 'Casino Fortuna: slots, blackjack and roulette, with chips at S$100 each.']],
  ['Postcards', ['Take a postcard in any place with {snap}, or from the pause menu.', 'The album keeps every postcard.']]
];
G.howtoScene = {
  enter(data) { this.page = data.page || 0; this.bg = new E.Backdrop('dusk'); this.rig = G.rigFor(G.state ? G.state.me : 'rin', { suit: G.state ? G.state.wearing.suit : null }); },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel')) return G.game.go(this.from || 'menu', {});
    if (I.pressed('tabR') || I.pressed('right') || I.pressed('confirm')) this.page = Math.min(G.HOWTO.length - 1, this.page + 1);
    if (I.pressed('tabL') || I.pressed('left')) this.page = Math.max(0, this.page - 1);
  },
  draw(r) {
    const W = r.W, H = r.H, pg = G.HOWTO[this.page];
    this.bg.draw(r);
    G.screenTitle(r, 'HOW TO PLAY', (this.page + 1) + ' / ' + G.HOWTO.length + ' · ' + pg[0]);
    r.overlay(g => {
      E.ui.box(g, 20, 52, W - 40, H - 110, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      pg[1].forEach((ln, i) => {
        const parts = ln.split(/(\{[a-z]+\})/);
        let x = 34; const y = 70 + i * 26;
        for (const p of parts) {
          const m = /^\{([a-z]+)\}$/.exec(p);
          if (m) { const w = G.prompt(r, m[1], x, y, '', { overlay: false }); x += w + 2; }
          else if (p) { E.font.text(g, p, x, y, '#fff8e8', { scale: 1, shadow: '#000' }); x += E.font.width(p, { scale: 1 }); }
        }
      });
    });
    r.actor(W - 80, H * .55, 0, (g, ox, oy) => { this.rig.draw(g, ox, oy, r.view); }, { pick: 'howto' });
    G.promptBar(r, [['tabL', 'Back'], ['tabR', 'Next'], ['cancel', 'Close']]);
  }
};
G.ABOUT = G.ABOUT || { pages: [] };
G.aboutScene = {
  enter(data) { this.page = data.page || 0; this.bg = new E.Backdrop('night'); },
  update(dt) {
    const I = G.game.input, n = G.ABOUT.pages.length;
    if (I.pressed('cancel')) return G.game.go('menu', {});
    if (I.pressed('tabR') || I.pressed('right')) this.page = Math.min(n - 1, this.page + 1);
    if (I.pressed('tabL') || I.pressed('left')) this.page = Math.max(0, this.page - 1);
    this.scroll = Math.max(0, (this.scroll || 0) + (I.repeat('down', .2, .05) ? 1 : 0) - (I.repeat('up', .2, .05) ? 1 : 0));
  },
  draw(r) {
    const W = r.W, H = r.H, pg = G.ABOUT.pages[this.page] || { title: '', lines: [] };
    this.bg.draw(r);
    G.screenTitle(r, 'ABOUT & CREDITS', (this.page + 1) + ' / ' + G.ABOUT.pages.length + ' · ' + pg.title);
    r.overlay(g => {
      E.ui.box(g, 16, 50, W - 32, H - 98, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .92 });
      let y = 60 - (this.scroll || 0) * 8;
      for (const ln of pg.lines) {
        for (const w of G.wrapText(ln, W - 60, 1)) { if (y > 46 && y < H - 60) E.font.text(g, w, 26, y, '#fff8e8', { scale: 1, shadow: '#000' }); y += 10; }
        y += 3;
      }
    });
    G.promptBar(r, [['tabL', 'Back'], ['tabR', 'Next'], ['cancel', 'Close']]);
  }
};

/* ==== 51-attract.js ==== */
/* 51-attract: the arcade demo, on loop. After ten seconds idle on the title or the menu: an AI match, then the vacation montage,
 * then a title card, then a new match. The montage is the game itself: each beat runs a real scene (the island map, a talk on
 * the beach, a shop's try-on, a Pool Hop run, the casino slots, the photo mode, the final against The House), played by a bot
 * that only presses the scene's own buttons. Any press or a gamepad button leaves for the title. The demo runs on a throwaway
 * vacation; the player's own save is put back when it ends. */
G.MONTAGE = [
  { caption: 'FIVE DAYS IN PARADISE', secs: 8, scene: 'map', data: () => ({}),
    drive(bt, sc) { sc.list.i = Math.floor(bt * 1.1) % sc.list.items.length; G.state.slot = Math.min(2, Math.floor(bt / 2.7)); } },
  { caption: 'MAKE FRIENDS · GIVE GIFTS', secs: 8, scene: 'location', data: () => ({ place: 'beach' }),
    setup() { G.state.sched[0].lola = 'beach'; G.state.slot = 0; },
    drive(bt, sc) { if (bt > 1 && sc.mode === 'walk' && !sc._talked) { sc._talked = true; sc.openTalk('lola'); } if (bt > 3.5 && sc.mode === 'talk' && !sc._chat) { sc._chat = true; sc.doChat('lola'); } if (bt > 6 && sc.box && !sc.box.open && sc.mode === 'talk') sc.closeTalk(); } },
  { caption: 'COLLECT 21 SWIMSUITS', secs: 8, scene: 'shop', data: () => ({ shop: 'coral', back: 'map' }),
    drive(bt, sc) { if (!sc.grid || !sc.grid.items.length) return; const want = Math.floor(bt / .8) % sc.grid.items.length; if (sc.grid.i !== want) { sc.grid.i = want; sc.grid.page = Math.floor(want / sc.grid.per()); } } },
  { caption: 'POOL HOP', secs: 9, scene: 'poolhop', data: () => ({ from: 'map' }),
    drive(bt, sc) {
      if (sc.state === 'ready' && bt > .6) sc.start();
      if (sc.state === 'run' && sc.pads[sc.at] && sc._botAt !== sc.at && sc.t >= sc.nextBeat - .03) {
        sc._botAt = sc.at; const pad = sc.pads[sc.at];
        G.game.input.tap(pad.btn); if (pad.double) G.game.input.tap(pad.double[1]);
      }
    } },
  { caption: 'CASINO NIGHTS', secs: 9, scene: 'casino', data: () => ({ focus: 'slots', from: 'map' }),
    setup() { G.state.chips = 40; },
    drive(bt, sc) {
      const s = sc.slots; if (!s || sc.mode !== 'slots') return;
      if (!s.spinning && bt > 1 && (!sc._spinAt || bt - sc._spinAt > 3.2)) { sc._spinAt = bt; sc._stops = [false, false, false]; G.game.input.tap('confirm'); return; }
      if (s.spinning) { const stops = ['reel1', 'reel2', 'reel3'], at = [.9, 1.2, 1.5]; stops.forEach((a, i) => { if (!sc._stops[i] && s.t > at[i]) { sc._stops[i] = true; G.game.input.tap(a); } }); }
    } },
  { caption: 'SNAP POSTCARDS', secs: 7, scene: 'photo', data: () => ({ from: 'location', place: 'beach' }),
    drive(bt, sc) { const k = Math.floor(bt / 1.1); if (sc._k !== k) { sc._k = k; sc.pose = k % G.POSES.length; } if (bt > 5.5 && !sc._shot) { sc._shot = true; sc.take(); } } },
  { caption: 'BEAT THE HOUSE', secs: 16, scene: 'match', data: () => { const o = G.storyMatchOpts('final'); o.teams[0][0].human = null; o.attract = true; return { opts: o }; }, drive() {} }
];
/* the throwaway vacation of the demo, on one clock: the same seed each time it is made */
G.attractDemoState = function () {
  const st = G.newState({ me: 'rin', skipTutorial: true, seed: 4242 });
  st.flags.arrival = true; st.flags.welcome = true; st.chips = 20;
  return st;
};
G.attractOn = false;
G.att = null;
G.attractStep = function (dt) {
  const A = G.att; if (!A || !G.attractOn) return;
  A.t += dt;
  if (G.padPressed && G.padPressed()) return G.attractExit();
  if (A.phase !== 'beats' && G.game.input.anyPressed && G.game.input.anyPressed()) return G.attractExit();
  if (A.phase === 'match') {
    if (A.t > 45 || (A.M && (A.M.over || A.M.phase === 'over'))) { A.phase = 'beats'; A.beat = 0; A.bt = -1; A.saved = G.state; G.state = G.attractDemoState(); }
    return;
  }
  if (A.phase === 'beats') {
    const beat = G.MONTAGE[A.beat];
    if (!beat) { G.state = A.saved || null; A.phase = 'card'; A.t = 0; G.caption = null; return G.game.go('attract', { card: true }); }
    A.bt += dt;
    if (A.bt < 0) return;
    if (!A.started) { A.started = true; A.bt = 0; G.caption = beat.caption; if (beat.setup) beat.setup(); G.game.go(beat.scene, beat.data()); return; }
    if (G.curScene === beat.scene && G.game.scene && A.bt > .6) beat.drive(A.bt - .6, G.game.scene);
    if (A.bt > beat.secs) { A.beat++; A.started = false; A.bt = -1; }
    return;
  }
  if (A.phase === 'card') { if (A.t > 5) { G.caption = null; A.phase = 'match'; A.t = 0; G.game.go('attract', {}); } }
};
G.attractStart = function () { G.attractOn = true; G.att = { phase: 'match', t: 0 }; };
G.attractExit = function () {
  if (!G.attractOn) return;
  G.attractOn = false; G.caption = null;
  if (G.att && G.att.phase === 'beats' && G.att.saved !== undefined) G.state = G.att.saved;
  G.att = null;
  G.game.go('title', {});
};
G.padPressed = function () {
  try { const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []; for (const p of pads) if (p && p.buttons && p.buttons.some(b => b.pressed)) return true; } catch (e) { /* no gamepad API */ }
  return false;
};
G.drawCaption = function (r) {
  const W = r.W;
  r.overlay(g => { E.ui.box(g, 0, 14, W, 22, { bg: ['#0a0a14', '#14142a'], border: null, alpha: .75, gradient: true }); E.font.text(g, G.caption, W / 2, 20, '#ffd36a', { scale: 2, align: 'center', shadow: '#000' }); });
};
G.attractScene = {
  enter(data) {
    G.attractStart();
    if (data && data.card) { G.att.phase = 'card'; this.card = true; } else { this.card = false; this.startMatch(); }
    this.bg = new E.Backdrop('dusk');
    G.music(this.card ? 'title' : 'spike');
  },
  startMatch() {
    const ids = G.FIGHTERS.slice();
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(G.rng('cosmetic') * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const suits = G.SUIT_ORDER.slice(0, 6);
    const teams = [[{ id: ids[0], suit: suits[0], base: .66 }, { id: ids[1], suit: suits[1], base: .66 }], [{ id: ids[2], suit: suits[2], base: .66 }, { id: ids[3], suit: suits[3], base: .66 }]];
    this.M = G.createMatch({ teams, pointsToWin: 7, setsToWin: 1, difficulty: 'easy', court: ['day', 'sunset', 'night'][Math.floor(G.rng('cosmetic') * 3)], serveSide: 0, spectacle: true, attract: true, commentary: true });
    G.att.M = this.M;
    G.game.setView(G.courtView());
    G.game.follow(null);
  },
  update(dt) {
    if (this.card || !this.M || !G.att || G.att.phase !== 'match') return;
    const M = this.M;
    for (const p of M.players) p.skill = .95;
    M.step(dt);
    this.frame(M);
  },
  frame(M) {
    const pts = [];
    if (M.L) { const s = G.flightAt(M.L, M.t); pts.push({ x: s.x, y: s.y, z: Math.max(0, s.z) }); }
    for (const p of M.players) pts.push({ x: p.x, y: p.y, z: 0 });
    const C = G.C;
    pts.push({ x: C.X0 - 26, y: C.Y0 - 30, z: 0 }, { x: C.X1 + 26, y: C.Y1 + 30, z: 0 });
    G.game.cam.frame(pts, { margin: 16, zoom: [.6, 1] });
  },
  draw(r) {
    const W = r.W, H = r.H;
    if (this.card || !G.att || G.att.phase === 'card') {
      this.bg.draw(r);
      r.overlay(g => { E.font.title(g, 'AHEAD OR ALIVE', W / 2, H * .3, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a'] }); E.font.text(g, 'XTREME BEACH VOLLEYBALL', W / 2, H * .5, '#fff8e8', { align: 'center', shadow: '#000' }); E.font.text(g, 'PRESS ANY BUTTON', W / 2, H * .66, '#9fd3d6', { align: 'center', shadow: '#000' }); });
    } else if (this.M) {
      this.bg.draw(r);
      G.courtMap().drawFloor(r); G.drawCourtSet(r, 'sunset'); G.drawNet(r);
      if (this.M.replay) this.M.drawReplay(r); else { this.M.drawPlayers(r); this.M.drawBall(r); this.M.hud(r); }
      r.overlay(g => E.font.text(g, 'DEMO', 6, H - 26, '#ffd36a', { shadow: '#000' }));
      if (G.touchOnly()) r.overlay(g => E.font.text(g, 'Controller or keyboard required', W / 2, 6, '#ffd36a', { align: 'center', shadow: '#000' }));
    }
    G.promptBar(r, [['confirm', 'Press any button']]);
  }
};
/* the attract mode's rigs for the card, built once per suit */
G.beatRig = function (id, opts) {
  G._beatRigs = G._beatRigs || {};
  const key = id + '|' + (opts && opts.suit || '') + '|' + (opts && (opts.acc || []).join(','));
  if (!G._beatRigs[key]) G._beatRigs[key] = G.rigFor(id, opts);
  return G._beatRigs[key];
};

/* ==== 52-exhibition.js ==== */
/* 52-exhibition: Beach Match setup (one to four local players, CPUs fill the rest), then the match, then the results. */
G.exhibitionSetup = { fighters: ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'], pts: [7, 11, 15, 21], pi: 0, diffs: ['easy', 'normal', 'hard', 'pro'], di: 1, courts: ['morning', 'sunset', 'night'], ci: 1, sets: [1, 3], si: 0 };
G.exhibitionScene = {
  enter() {
    const game = G.game;
    this.S = G.exhibitionSetup;
    this.items = this.buildItems();
    this.list = new G.List({ items: this.items, x: 24, y: 56, w: 230, rowH: 24, max: 6, scale: 2 });
    this.bg = new E.Backdrop('dusk');
    this.human = game.input;
    this.ready = false;
    game.allowJoin && game.allowJoin({ max: 4, onJoin: () => { this.joinedT = 0; G.toast('Player ' + game.players.length + ' joined'); } });
    game.audio.music && game.audio.music('title');
  },
  buildItems() {
    const S = this.S, fa = G.CAST[S.fighters[this.fi || 0]];
    const ofs = this.fi || 0;
    return [
      { label: 'Your fighter', value: G.CAST[S.fighters[ofs]].short.toLowerCase().replace(/^./, c => c.toUpperCase()), onPick: it => this.cycleFighter(1) },
      { label: 'Suit', value: G.SUITS[G.CAST[S.fighters[ofs]].signature].name, },
      { label: 'Points to win', value: G.exhibitionSetup.pts[S.pi], onPick: () => { S.pi = (S.pi + 1) % S.pts.length; this.rebuild(); } },
      { label: 'Sets', value: S.sets[S.si] === 1 ? 'Best of 1' : 'Best of 3', onPick: () => { S.si = (S.si + 1) % 2; this.rebuild(); } },
      { label: 'Difficulty', value: G.DIFFICULTY[S.diffs[S.di]].name, onPick: () => { S.di = (S.di + 1) % 4; this.rebuild(); } },
      { label: 'Court time', value: ['Morning', 'Sunset', 'Night'][S.ci], onPick: () => { S.ci = (S.ci + 1) % 3; this.rebuild(); } },
      { label: 'Start match', onPick: () => this.start() },
      { label: 'Title', onPick: () => G.game.go('title', {}) }
    ];
  },
  rebuild() { this.items = this.buildItems(); this.list.setItems(this.items); },
  cycleFighter(d) {
    const S = this.S; this.fi = ((this.fi || 0) + d + S.fighters.length) % S.fighters.length; this.rebuild();
  },
  start() {
    const S = this.S, fi = this.fi || 0;
    const me = S.fighters[fi];
    const others = S.fighters.filter(f => f !== me);
    const partner = others[0], o1 = others[1], o2 = others[2];
    const P = G.game.players || [this.human];
    const seat = (i) => P[i] || null;
    const teams = [[{ id: me, human: this.human, suit: G.CAST[me].signature, acc: G.CAST[me].starts.acc, base: .4 }, { id: partner, human: seat(1), suit: G.CAST[partner].signature, base: .4 }],
      [{ id: o1, human: seat(2), suit: G.CAST[o1].signature, base: .4 }, { id: o2, human: seat(3), suit: G.CAST[o2].signature, base: .4 }]];
    G.game.allowJoin && G.game.allowJoin(false);
    const opts = { teams, pointsToWin: S.pts[S.pi], setsToWin: S.sets[S.si] === 1 ? 1 : 2, difficulty: S.diffs[S.di], autoReceive: false, timingAssist: 'normal', court: ['day', 'sunset', 'night'][S.ci], serveSide: 0,
      onEnd: r => G.game.go('results', r) };
    G.game.go('match', { opts });
  },
  update(dt) {
    const I = G.game.input;
    if (I.pressed('cancel')) { G.game.go('menu', {}); return; }
    const pick = this.list.update(I, dt);
    if (pick && pick.item && pick.item.label === 'Your fighter') this.cycleFighter(1);
  },
  draw(r) {
    this.bg.draw(r);
    this.list.draw(r);
    const n = (G.game.players || []).length;
    G.screenTitle(r, 'BEACH MATCH', n > 1 ? n + ' players: P2 takes the partner seat, P3 and P4 the other side' : 'Pick your fighter, the rules and the court · press Start to join');
    const fi = this.fi || 0, f = G.ensureTitleRigs()[fi % 6];
    r.actor(r.W * .8, r.H * .62, 0, (g, ox, oy) => { f.rig.draw(g, ox, oy, r.view); G.dress(g, r, f.rig, ox, oy); }, { pick: f });
    G.promptBar(r, [['confirm', 'Select'], ['cancel', 'Back']]);
  }
};

/* ==== 53-dev.js ==== */
/* 53-dev: the dev panel, from the pause menu. Tabs (L1/R1 or Q/E): Tools, Vacation, Presentation, Tuning. Opening it freezes game
 * time. Every tool calls the same functions the game uses; the sliders write G.T, which every system reads each step.
 * Presentation holds the Voice Lab (every speaker and a line, spoken), the music jukebox, the sound board and the rig viewer. */
G.devTabs = ['Tools', 'Vacation', 'Presentation', 'Tuning'];
G.devTools = [
  { label: 'Go to the title', fn: () => G.game.go('title', {}) },
  { label: 'Go to the map', fn: () => G.game.go('map', {}) },
  { label: 'Beach Match (quick)', fn: () => G.game.go('exhibition', {}) },
  { label: 'Casino floor', fn: () => G.game.go('casino', { from: 'map', focus: 'floor' }) },
  { label: 'Pool Hop', fn: () => G.game.go('poolhop', { from: 'map' }) },
  { label: 'Album', fn: () => G.game.go('album', { from: 'menu' }) },
  { label: 'Credits', fn: () => G.game.go('credits', {}) },
  { label: 'Attract demo', fn: () => G.game.go('attract', {}) },
  { label: 'Results (sample)', fn: () => G.game.go('results', { won: true, score: [7, 3], teamNames: ['RIN', 'LOLA'], stats: { points: 7, kills: 3, longest: 9 }, opts: null }) }
];
G.devVac = [
  { label: 'Money +10,000', fn: () => G.earn(10000, 'dev') },
  { label: 'Money +100,000', fn: () => G.earn(100000, 'dev') },
  { label: 'Money to zero', fn: () => { G.state.money = 0; } },
  { label: 'Chips +100', fn: () => { G.state.chips += 100; } },
  { label: 'Fill the gift bag x3', fn: () => { for (const g of G.GIFT_ORDER) G.state.bag[g] = (G.state.bag[g] || 0) + 3; } },
  { label: 'Unlock every suit', fn: () => { G.state.wardrobe.suits = G.SUIT_ORDER.slice(); } },
  { label: 'Next day', fn: () => { G.endDay(); } },
  { label: 'Set partner: Tess', fn: () => { G.setPartner('tess'); } },
  { label: 'Clear partner', fn: () => { G.state.partner = null; } },
  { label: 'Affinity: all 90', fn: () => { for (const f of G.NPCS) if (f !== G.state.me) G.state.aff[f] = 90; } }
];
G.voiceLines = function (s) {
  const out = [], L = G.LINES[s] || {};
  const add = (cat, t) => out.push({ label: (cat + ': ' + t).slice(0, 34), text: t });
  for (const k of Object.keys(L)) {
    const v = L[k];
    if (Array.isArray(v)) v.forEach(t => add(k, t));
    else if (v && typeof v === 'object') for (const k2 of Object.keys(v)) (v[k2] || []).forEach(t => add(k + '.' + k2, t));
  }
  return out;
};
G.devSpeakers = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei', 'sonny', 'pepper'];
G.devPresent = ['Voice Lab', 'Music jukebox', 'Sound board', 'Rig viewer'];
G.devScene = {
  enter(data) {
    this.from = data.from || 'title'; this.tab = data.tab || 0; this.sub = null;
    this.bg = new E.Backdrop('night'); this.box = G.box; this.rigI = 0; this.suitI = 0;
    // the freeze waits for the fade in (the fade runs on game time), then the game stands still
    this.freeze = G.game.after(.5, () => { G.game.timeScale = 0; });
    this.build();
  },
  exit() { if (this.freeze && this.freeze.cancel) this.freeze.cancel(); G.game.timeScale = 1; if (G.music) G.music(null); },
  build() {
    if (this.sub === 'voice') this.list = new G.List({ items: G.devSpeakers.map(s => ({ label: (G.CAST[s] || G.STAFF[s]).short, onPick: () => { this.speaker = s; this.sub = 'voice2'; this.build(); } })).concat([{ label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 22, max: 7, scale: 2 });
    else if (this.sub === 'voice2') this.list = new G.List({ items: G.voiceLines(this.speaker).map(l => ({ label: l.label, onPick: () => this.speakLine(l.text, this.speaker) })).concat([{ label: 'Back', onPick: () => { this.sub = 'voice'; this.build(); } }]), x: 24, y: 54, w: 260, rowH: 20, max: 8, scale: 1 });
    else if (this.sub === 'music') this.list = new G.List({ items: Object.keys(G.SONGS).map(k => ({ label: k, onPick: () => G.music(k) })).concat([{ label: 'Stop', onPick: () => G.music(null) }, { label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 22, max: 7, scale: 2 });
    else if (this.sub === 'sound') this.list = new G.List({ items: Object.keys(G.SFX).map(k => ({ label: k, onPick: () => G.sfx(k) })).concat([{ label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 20, max: 8, scale: 1 });
    else if (this.sub === 'rig') this.list = new G.List({ items: G.FIGHTERS.concat(['sonny', 'pepper']).map((id, i) => ({ label: (G.CAST[id] || G.STAFF[id]).short, onPick: () => { this.rigI = i; this.suitI = 0; } })).concat([{ label: 'Back', onPick: () => { this.sub = null; this.build(); } }]), x: 24, y: 54, w: 180, rowH: 22, max: 7, scale: 2 });
    else if (this.tab === 0) this.list = new G.List({ items: G.devTools.map(t => ({ label: t.label, onPick: t.fn })), x: 24, y: 54, w: 260, rowH: 20, max: 7, scale: 2 });
    else if (this.tab === 1) this.list = new G.List({ items: G.devVac.map(t => ({ label: t.label, onPick: () => { if (!G.state) G.newState({ me: 'rin' }); t.fn(); G.toast('Done: ' + t.label); } })), x: 24, y: 54, w: 260, rowH: 20, max: 7, scale: 2 });
    else if (this.tab === 2) this.list = new G.List({ items: G.devPresent.map((t, i) => ({ label: t, onPick: () => { this.sub = ['voice', 'music', 'sound', 'rig'][i]; this.build(); } })), x: 24, y: 54, w: 260, rowH: 22, max: 6, scale: 2 });
    else this.list = new G.List({ items: this.tuneItems(), x: 24, y: 54, w: 300, rowH: 20, max: 8, scale: 1 });
  },
  speakLine(text, s) { const who = G.CAST[s] || G.STAFF[s]; this.box.say(text.replace(/\{[a-z]+\}/g, 'X'), { name: who.short, prof: who.voice, color: '#ffd36a' }); },
  speak(s) {
    const who = G.CAST[s] || G.STAFF[s];
    const line = s === 'sonny' ? G.LINES.sonny.commentary.spike[0] : s === 'pepper' ? G.LINES.pepper.tips[0].replace(/\{[a-z]+\}/g, 'X') : G.lineFor(s, 'greet', 1);
    this.box.say(line, { name: who.short, prof: who.voice, color: '#ffd36a' });
  },
  tuneItems() {
    const items = G.TUNING.map(t => ({ label: t.label, value: this.valueText(t), tune: t, onPick: () => this.bump(t, 1) }));
    items.push({ label: 'Reset all to defaults', onPick: () => { G.resetTuning(); G.toast('Defaults restored'); this.build(); } });
    items.push({ label: 'Copy JSON', onPick: () => { try { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(G.T)); } catch (e) { /* no clipboard */ } G.toast('Copied'); } });
    return items;
  },
  valueText(t) { const v = G.T[t.key]; return t.toggle ? (v ? 'On' : 'Off') : (typeof v === 'number' ? (Math.round(v * 1000) / 1000) + (t.unit ? ' ' + t.unit : '') : String(v)); },
  bump(t, d) { if (t.toggle) G.setTune(t.key, !G.T[t.key]); else G.setTune(t.key, G.T[t.key] + d * t.step); this.build(); },
  update(dt) {
    const I = G.game.input;
    this.box.update(I, dt);
    if (this.box.open) return;
    if (I.pressed('cancel') || I.pressed('pause')) { if (this.sub) { this.sub = null; this.build(); return; } G.game.go(this.from, {}); return; }
    if (I.pressed('tabR')) { this.tab = (this.tab + 1) % 4; this.sub = null; this.build(); return; }
    if (I.pressed('tabL')) { this.tab = (this.tab + 3) % 4; this.sub = null; this.build(); return; }
    if (this.sub === 'rig') {
      const ids = G.FIGHTERS.concat(['sonny', 'pepper']), id = ids[this.rigI], suits = G.SUIT_ORDER;
      if (I.repeat('right', .3, .2)) { this.suitI = (this.suitI + 1) % suits.length; }
      if (I.repeat('left', .3, .2)) { this.suitI = (this.suitI + suits.length - 1) % suits.length; }
      if (!this.rigObj || this.rigKey !== id + this.suitI) { this.rigKey = id + this.suitI; this.rigObj = G.rigFor(id, { suit: suits[this.suitI] }); }
      this.rigObj.update(.02, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: this.t || 0 });
    }
    if (this.tab === 3 && !this.sub) {
      const it = this.list.items[this.list.i];
      if (it && it.tune) {
        if (I.repeat('left', .3, .08)) this.bump(it.tune, -1);
        if (I.repeat('right', .3, .08)) this.bump(it.tune, 1);
        if (I.pressed('extra')) { G.setTune(it.tune.key, it.tune.def); this.build(); }
      }
    }
    this.list.update(I, dt);
  },
  draw(r) {
    const W = r.W, H = r.H;
    this.bg.draw(r);
    const title = this.sub ? (this.sub === 'voice2' ? 'Voice Lab' : G.devPresent[['voice', 'music', 'sound', 'rig'].indexOf(this.sub)]) : G.devTabs[this.tab];
    G.screenTitle(r, 'DEV MODE', title + ' · time frozen');
    this.list.draw(r);
    r.overlay(g => E.ui.box(g, 300, 50, W - 316, H - 98, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 }));
    if (this.sub === 'rig' && this.rigObj) {
      const suit = G.SUIT_ORDER[this.suitI], rig = this.rigObj;
      r.actor(W * .62, H * .58, 0, (g, ox, oy) => { rig.draw(g, ox, oy, r.view); G.dress(g, r, rig, ox, oy); }, { pick: 'dev' });
      r.overlay(g => E.font.text(g, G.SUITS[suit].name + ' · ◂ ▸ suits', 310, 60, '#ffd36a', { shadow: '#000' }));
    } else if (this.sub === 'music') r.overlay(g => E.font.text(g, 'Pick a song to hear it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.sub === 'sound') r.overlay(g => E.font.text(g, 'Pick a sound to play it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.sub === 'voice') r.overlay(g => E.font.text(g, 'Pick a speaker, then a line to hear it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.sub === 'voice2') r.overlay(g => E.font.text(g, 'Every line of ' + (G.CAST[this.speaker] || G.STAFF[this.speaker]).short + '. ✕ speaks it.', 310, 60, '#fff8e8', { shadow: '#000' }));
    else if (this.tab === 3) {
      const it = this.list.items[this.list.i];
      r.overlay(g => E.font.text(g, it && it.tune ? (it.tune.group + ' · default ' + G.TUNING_DEFAULTS[it.tune.key]) : 'Pick a slider. ◂ ▸ change it, △ resets it.', 310, 60, '#ffd36a', { shadow: '#000' }));
    } else r.overlay(g => E.font.text(g, 'State: ' + (G.state ? 'Day ' + G.state.day + ' · ' + G.SLOTS[G.state.slot] + ' · ' + G.fmtMoney(G.state.money) : 'no vacation yet'), 310, 60, '#fff8e8', { shadow: '#000' }));
    G.promptBar(r, [['tabL', 'Tab'], ['confirm', 'Use'], ['cancel', this.sub ? 'Back' : 'Back to game']]);
    this.box.draw(r);
  }
};

/* ==== 54-results.js ==== */
/* 54-results: the match results: the score, the stat cards, the MVP, then the choice to go again. */
G.resultsScene = {
  enter(data) {
    this.data = data || {};
    this.items = [{ label: 'Rematch', onPick: () => G.game.go('match', { opts: this.data.opts }) }, { label: 'Change setup', onPick: () => G.game.go('exhibition', {}) }, { label: 'Title', onPick: () => G.game.go('title', {}) }];
    this.list = new G.List({ items: this.items, x: r0x(), y: 150, w: 200, rowH: 24, max: 4, scale: 2 });
    this.bg = new E.Backdrop('dusk');
    G.game.audio.music && G.game.audio.music('title');
  },
  update(dt) { const I = G.game.input; this.list.update(I, dt); },
  draw(r) {
    this.bg.draw(r);
    this.list.x = Math.round(r.W / 2 - 100);
    const d = this.data;
    r.overlay(g => {
      E.font.title(g, d.won ? 'YOU WIN!' : 'MATCH OVER', r.W / 2, 22, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] });
      E.font.text(g, (d.teamNames || ['', '']).join('   vs   '), r.W / 2, 60, '#9fd3d6', { align: 'center', scale: 2, shadow: '#000' });
      E.font.text(g, (d.score || [0, 0]).join('  -  '), r.W / 2, 84, '#fff8e8', { align: 'center', scale: 3, shadow: '#000' });
      const s = d.stats || {};
      const cards = [['POINTS', s.points || 0], ['KILLS', s.kills || 0], ['LONGEST RALLY', s.longest || 0]];
      cards.forEach((c, i) => {
        const x = r.W / 2 - 150 + i * 110;
        E.ui.box(g, x, 110, 100, 26, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
        E.font.text(g, c[0], x + 50, 114, '#9fd3d6', { align: 'center', scale: 1 });
        E.font.text(g, String(c[1]), x + 50, 124, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
      });
    });
    this.list.draw(r);
    G.promptBar(r, [['confirm', 'Select']]);
  }
};
function r0x() { return 0; }
/* the day's end: the summary card, the sleep, then the next day (or the finale) */
G.daySceneOK = true;
G.daySummary = function () {
  const st = G.state, d = st.day_stats || {};
  return { earned: d.earned || 0, spent: d.spent || 0, matches: d.matches || 0, wins: d.wins || 0, weather: G.weatherNow() };
};
G.daySceneDef = {
  enter() {
    this.bg = new E.Backdrop('night'); this.sum = G.daySummary(); this.box = G.box;
    G.music('siesta');
    this.list = new G.List({ items: [{ label: 'Sleep', onPick: () => this.sleep() }], x: G.game.W / 2 - 60, y: 170, w: 120, rowH: 24, max: 2, scale: 2 });
  },
  sleep() {
    const next = G.endDay();
    if (next === 'finale') return G.game.go('finale', {});
    G.game.go('map', {});
  },
  update(dt) { const I = G.game.input; if (I.pressed('confirm')) { this.sleep(); } },
  draw(r) {
    const s = this.sum, W = r.W, H = r.H;
    this.bg.draw(r);
    r.overlay(g => {
      E.ui.box(g, W / 2 - 150, 30, 300, 150, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
      E.font.title(g, 'DAY ' + G.state.day + ' ENDS', W / 2, 40, { scale: 2, align: 'center', colors: ['#fff7d6', '#ffd36a'] });
      E.font.text(g, 'Earned ' + G.fmtMoney(s.earned) + ' · Spent ' + G.fmtMoney(s.spent), W / 2, 74, '#fff8e8', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Matches ' + s.matches + ' · Won ' + s.wins, W / 2, 90, '#fff8e8', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Tomorrow: ' + G.WEATHER_LABEL[G.state.weather[G.state.day] || 'sunny'], W / 2, 108, '#9fd3d6', { align: 'center', shadow: '#000' });
      const movers = G.FIGHTERS.filter(f => f !== G.state.me).slice(0, 6).map(f => G.CAST[f].short + ' ' + (G.state.aff[f] || 0));
      E.font.text(g, movers.slice(0, 3).join('   '), W / 2, 124, '#9fd3d6', { align: 'center', shadow: '#000' });
      E.font.text(g, movers.slice(3).join('   '), W / 2, 138, '#9fd3d6', { align: 'center', shadow: '#000' });
    });
    G.promptBar(r, [['confirm', 'Sleep']]);
    this.box.draw(r);
  }
};
G.dayendScene = G.daySceneDef;
/* the finale and the endings: the party, then ending A (won) or B (lost), then the credits and the vacation results */
G.endingScene = {
  enter() {
    const won = G.state.flags.final === 'won';
    this.lines = won ? [['The House Folds.', null], ['Sonny must hand over the island. Pepper produces his IOUs: she owns it now.', 'PEPPER'], ['Sonny paddles off on the flamingo float: I\'LL BE BACK... NEXT SUMMER!', 'SONNY'], ['Breakfast is at eight. The island is under new management.', 'PEPPER']]
      : [['The House Always Wins.', null], ['Sonny bets the island on one spin of a giant roulette wheel. Pepper calls red. It lands red.', null], ['Sonny paddles off on the flamingo float: I\'LL BE BACK... NEXT SUMMER!', 'SONNY'], ['The house always wins. I am the house.', 'PEPPER']];
    this.i = 0; this.box = G.box; this.bg = new E.Backdrop('night');
    this.box.say(this.lines[0][0], { name: this.lines[0][1] || 'THE END', onDone: () => this.step() });
    G.music('farewell');
  },
  step() { this.i++; if (this.i >= this.lines.length) return G.game.go('credits', {}); this.box.say(this.lines[this.i][0], { name: this.lines[this.i][1] || 'THE END', onDone: () => this.step() }); },
  update(dt) { if (this.box.open) this.box.update(G.game.input, dt); },
  draw(r) { this.bg.draw(r); this.box.draw(r); G.promptBar(r, [['confirm', 'Next']]); }
};
G.CREDITS = [
  'AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL', 'An original parody-tribute game, inspired by Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, 2003).',
  'No assets from that game are used.', 'Design, code, art, music and writing: the builder (claude-haiku-5-5).', 'Engine: my-3D2dge v0.85.2 (MIT), modified.',
  'AI Hub session client: lib/hub (ai-hub), unmodified.', 'Thanks for playing.'
];
G.creditsScene = {
  enter() { this.t = 0; this.bg = new E.Backdrop('night'); this.page = 0; G.music('farewell'); },
  update(dt) { const I = G.game.input; this.t += dt; if (I.pressed('confirm') || this.t > 14 * G.CREDITS.length / 2) { G.game.go('vacresult', {}); } },
  draw(r) { this.bg.draw(r); const i = Math.floor(this.t / 3.5) % G.CREDITS.length; r.overlay(g => { E.font.text(g, G.CREDITS[i], r.W / 2, r.H / 2 - 8, '#fff8e8', { align: 'center', shadow: '#000' }); }); G.promptBar(r, [['confirm', 'Skip']]); }
};
/* the vacation's results: a report card, a title, and the unlocks */
G.vacresultScene = {
  enter() {
    const st = G.state, s = st.stats;
    const bests = G.FIGHTERS.filter(f => f !== st.me).sort((a, b) => (st.aff[b] || 0) - (st.aff[a] || 0));
    const bf = st.aff[bests[0]] || 0;
    const best3 = bests.filter(f => (st.aff[f] || 0) >= 80).length, good3 = bests.filter(f => (st.aff[f] || 0) >= 60).length;
    let title = 'Beach Bum';
    if (st.flags.final === 'won' && best3 >= 3) title = 'Island Icon'; else if (st.flags.final === 'won') title = 'Fortuna Champion'; else if (good3 >= 3) title = 'Social Butterfly';
    this.title = title; this.best = bests[0];
    G.unlock = G.unlock || {};
    const unlocked = E.store.get('aoa-unlocks', { suits: [] });
    unlocked.suits = Array.from(new Set(unlocked.suits.concat(st.wardrobe.suits)));
    unlocked.endings = (unlocked.endings || 0) + 1;
    E.store.set('aoa-unlocks', unlocked);
    this.rows = [['Money earned', G.fmtMoney(s.earned)], ['Matches won', s.wins + ' / ' + s.matches], ['Best friend', G.CAST[bests[0]] ? G.CAST[bests[0]].short + ' ' + (bf) : '-'], ['Suits', st.wardrobe.suits.length + ' / 21'], ['Gifts given', s.gifts], ['Best Pool Hop', s.poolBest !== null ? s.poolBest + 's' : '-'], ['Casino net', G.fmtMoney(s.casinoNet || 0)]];
    this.items = [{ label: 'New Vacation+', onPick: () => { G.newPlusState(); G.game.go('map', {}); } }, { label: 'Title', onPick: () => G.game.go('title', {}) }];
    this.list = new G.List({ items: this.items, x: G.game.W / 2 - 60, y: 190, w: 140, rowH: 24, max: 2, scale: 2 });
    this.bg = new E.Backdrop('dusk');
  },
  update(dt) { this.list.update(G.game.input, dt); },
  draw(r) {
    this.bg.draw(r);
    r.overlay(g => {
      E.ui.box(g, r.W / 2 - 150, 16, 300, 170, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .95 });
      E.font.title(g, 'VACATION RESULTS', r.W / 2, 22, { scale: 2, align: 'center', colors: ['#fff7d6', '#ffd36a'] });
      E.font.text(g, this.title, r.W / 2, 50, '#ffd36a', { align: 'center', scale: 2, shadow: '#000' });
      this.rows.forEach((rw, i) => { E.font.text(g, rw[0], r.W / 2 - 130, 74 + i * 14, '#9fd3d6', { shadow: '#000' }); E.font.text(g, String(rw[1]), r.W / 2 + 130, 74 + i * 14, '#fff8e8', { align: 'right', shadow: '#000' }); });
    });
    this.list.x = Math.round(r.W / 2 - 70);
    this.list.draw(r);
    G.promptBar(r, [['confirm', 'Select']]);
  }
};
G.newPlusState = function () {
  const old = G.state, keep = { wardrobe: old.wardrobe, album: old.album, stats: old.stats, wearing: old.wearing, npcWear: old.npcWear };
  const money = Math.round(G.T.startMoney + .1 * old.money);
  const st = G.newState({ me: old.me, skipTutorial: true });
  Object.assign(st, keep, { money, flags: { arrival: true, welcome: true, plus: true } });
  G.state = st; G.resetStreams(st.seed);
  G.startDay(st);
};

/* ==== 55-about.js ==== */
/* 55-about: the About & Credits pages and the exit interview. One object (G.EXIT) feeds both the screen and
 * exit-interview.json (tools/exit.mjs writes it), so the two cannot disagree. */
G.EXIT = {
  sourceInformation: {
    date: '2026-11-04 01:24:24',
    source: 'Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003)',
    plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
    genre: 'Sports (arcade two-on-two beach volleyball), with a light life sim (the vacation calendar, friendship, collecting) and minigames (Pool Hop rhythm, casino)',
    perspective: 'Matches: a side-on broadcast view of the court, with a Serve Cam toggle. Walkable places: three-quarter ground view. Island map: isometric view.',
    tech: 'my-3D2dge engine v0.85.2 (handoff package, modified by two patches), plain JavaScript in one HTML file, Playwright 1.63.0 for browser checks, Node 24',
    artDirection: 'PS1-era pixel art from the engine\'s HD humanoid rigs, with a swimsuit outfit added to the engine (cut, pattern and colours per suit), a sunset resort palette, drawn props and a backdrop per time of day',
    animation: 'The engine\'s procedural rig poses and attack moves, plus 20 motion-capture clips cut from the engine\'s three libraries (CC0 and CMU) for celebrations, dives, idles and the title, and three hand-keyed clips (a bump, a set and a spike) in the same readable format; two-bone arm IK puts the hands on the ball for serves.',
    audio: 'All music, sound effects and voices are synthesized in code: nine step-sequenced songs, about 60 chip-synth effects, and letter-by-letter Animalese voices for every speaker',
    online: 'AI Hub shared-world session: four seats, the host runs the match on the hub clock and sends snapshots, clients send presses and draw the host\'s world',
    testing: 'One command (node test/run.mjs): headless suites for data, ball physics, match simulations over 12 seeds, vacation rules, casino return and uniformity, story triggers, UI, the attract montage running its real scenes in order, the new features, a scripted game run and Pool Hop; a browser check of the file; and the AI Hub harness in four scenarios (4 players under latency, 2 with a server copy, 2 with the host leaving, 1 player)',
    research: 'Read the engine\'s API card, guide and examples, the AI Hub protocol and client, and the ai-hub harness notes. The source game was described from general knowledge; no web research was done.',
    environment: 'Claude Code CLI (headless); Linux (WSL2); headless Chromium via Playwright for browser checks',
    model: 'Anthropic, claude-haiku-5-5, reasoning effort medium',
    usage: 'unknown'
  },
  testingFeedback: [
    'About 16 game issues: the slot return was 41% (fixed to about 91%); a Pool Hop slip never recovered; leaving the dev panel or photo mode left game time frozen; the new-vacation seed used Math.random; the broadcast camera did not frame the whole court; the prompt bar overlapped its text; the serve toss ball was not drawn; the attract mode never started; title and attract transitions repeated; the pixel font drew unsupported symbols as question marks; keycap labels were unreadable; character cards overflowed; the location maps had uneven rows; a song name was unknown to the engine; the dev panel and photo mode froze the screen black (the freeze ran during the fade-in, which a screenshot showed); the AI Hub copy referenced an undefined variable (the harness caught it).',
    'Two were game-breaking: the Pool Hop slip (the run could not continue) and frozen time after the dev panel or photo mode (the game stopped). Both are fixed and covered by the game suite.',
    'The most helpful test was the headless match run: it played whole matches to the end, which exposed the serve and planner faults and gave the point and touch counts. The scene walk that visits every screen was a close second: it found the scene-level errors quickly.',
    'The least helpful were the screenshot checks for small details (glyph shapes, keycap contrast): they were slow to read and could not check timing. Browser key scripts with fixed waits could not hit the timing windows, so timing is tested in Node, not in the browser.'
  ],
  engineFeedback: [
    'The fixed-step clock and game.debug/headless mode made the simulation testable: whole matches run in Node, and the same inputs give the same result. The input presets and the menu, pause and settings screens came for free.',
    'Yes. Scene changes run through a fade, so a scene is entered a fraction of a second after game.go, and the fade runs on game time (so a freeze set at entry stalls it). The pixel font lacks many symbols (middle dot, the controller symbols, accented letters), so the game maps them before drawing. The swimsuit cuts and patterns are drawn over the rig, because the Humanoid has no swimsuit outfit; the rig\'s arms take an IK target through solvePose, which worked without an engine change.',
    'The closed-form ball and its aim solver, the referee and planner, the human timing judge and the AI (all game code), the match scene and HUD, the text box with the per-letter voice, the vacation rules and saves, and the test harness.',
    'Getting a ground-view match to read as a side-on broadcast: the camera framing, the zoom limits and the depth order of the net and the bleachers. Also the screen-pixel prompts, which need the device\'s glyph and the keyboard key drawn together.',
    'Two patches to the engine (marked AOA in engine/my-3d2dge.js): the button-symbol default is PlayStation, and the dialog calls a function voice for every letter. Touch controls are off in the game code, not in the engine. The game\'s own text box does the voices, so the dialog patch is present but not used. The motion-capture runtime (readable.js, mocap.js) and the clip set are separate files, loaded before the game.',
    'A documented way to make a scene switch instant in headless tests, and a view option for an alternative camera (the Serve Cam) that keeps the same framing rules.'
  ],
  promptFeedback: [
    'The level of detail: exact numbers for each system, the feature checklist, and the test list made it possible to check what was built. The file names and the rule that TASK.md wins were clear.',
    'The plan and TASK disagreed on the folder name, the date, the model and the scale; TASK was followed. The plan\'s scope (about 2,200 lines of design) is far larger than one medium-effort session, and the shorthand (DEV, GAME.html) took a moment to map to real paths.',
    'Keeping every item of the plan and the TASK checklist true at once: each system depends on several others, and the sizes of the content (21 suits, 25 gifts, the story counts) made the data work large. The swimsuit and hair engine patches and motion capture were the hardest to justify in the time.',
    'Ask for a priority order and a smaller first milestone, for example a playable match and one day of vacation, with the rest listed as later work. State which parts may be simplified (for example, swimsuit art as colours) so the trade-off is agreed up front.'
  ],
  aiHub: {
    name: 'Ahead or Alive: Xtreme Beach Volleyball',
    tagline: 'Stay ahead. Stay alive. Stay tanned.',
    description: 'A five-day island vacation of two-on-two beach volleyball, friendships, swimsuit shopping, pool hopping and casino nights, ending with a match for the island against its owner.',
    type: 'Game',
    genre: 'Sports',
    source: 'Dead or Alive Xtreme Beach Volleyball',
    series: 'Dead or Alive',
    players: '1–4',
    controls: 'Stick or WASD move · Cross or Space hit on time · Circle or Shift dive · Square or E shot and block · Triangle or Q call',
    tags: ['sports', 'versus', 'co-op', 'pixel art', 'comedy', 'arcade']
  }
};
G.CREDITS_PAGE = [
  'AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL', 'An original parody-tribute game, inspired by Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, 2003). No assets from that game are used.',
  'Design, code, art, music and writing: the builder (claude-haiku-5-5).', 'Engine: my-3D2dge v0.85.2 (MIT, github.com/michaelcrosato/my-3d2dge), modified.',
  'AI Hub session client: lib/hub (ai-hub), unmodified. Thanks for playing.'
];
const S = G.EXIT.sourceInformation;
G.ABOUT = { pages: [
  { title: 'Credits', lines: G.CREDITS_PAGE },
  { title: 'Source Information', lines: [
    'Date: ' + S.date, 'Source: ' + S.source, 'Plan: ' + S.plan, 'Genre: ' + S.genre, 'Perspective: ' + S.perspective, 'Tech: ' + S.tech,
    'Art direction: ' + S.artDirection, 'Animation: ' + S.animation, 'Audio: ' + S.audio, 'Online: ' + S.online, 'Testing: ' + S.testing,
    'Research: ' + S.research, 'Environment: ' + S.environment, 'Model: ' + S.model, 'Usage: ' + S.usage] },
  { title: 'Testing Feedback', lines: G.EXIT.testingFeedback },
  { title: 'Engine Feedback', lines: G.EXIT.engineFeedback },
  { title: 'Prompt Feedback', lines: G.EXIT.promptFeedback }
] };

/* ==== 99-main.js ==== */
/* 99-main: builds the game, registers the scenes, the pause menu, the saves and the match results; starts the title. */
G.boot = function () {
  G.loadTuning();
  const session = G.inSession();
  const settings = [
    { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard', 'Pro'], value: 'Normal' },
    { key: 'timingAssist', label: 'Timing assist', options: ['Tight', 'Normal', 'Generous'], value: 'Normal' },
    { key: 'autoMove', label: 'Auto-run to the ball', value: true },
    { key: 'autoReceive', label: 'Auto-receive', value: false },
    { key: 'timingRing', label: 'Timing ring', value: true },
    { key: 'matchCam', label: 'Match camera', options: ['Broadcast', 'Serve Cam'], value: 'Broadcast' },
    { key: 'textSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast', 'Instant'], value: 'Normal' },
    { key: 'commentary', label: 'Commentary', value: true },
    { key: 'voices', label: 'Voices volume', value: .8 }
  ];
  const items = [
    ['How to Play', () => G.goto('howto', { page: 0, from: G.curScene })],
    ['Take a Postcard', () => G.goto('photo', { from: 'pause', place: G.state && G.curScene === 'location' ? G.locScene.place : 'beach' })],
    ['Dev Mode', () => { G.devUnlocked = true; G.goto('dev', { from: G.curScene }); }]
  ];
  G.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', bg: '#0a2d3d', id: 'ahead-or-alive', autoPause: !session, corner: !session,
    fullscreen: !session, minW: 300, minH: 190,
    menu: session ? false : { items, settings, quit: 'title', saves: true } });
  G.game.input.touchEnabled = false;             // no touch controls, ever: a touch-only device gets the gate
  G.game.input.glyphs = 'playstation';
  G.game.saves.write = () => ({ data: G.saveVacation(), place: G.state ? (G.curScene || 'map') : 'title', level: G.state ? 'Day ' + G.state.day : '' });
  G.game.saves.read = (save) => { G.loadVacation(save.data); return true; };
  const go = G.game.go.bind(G.game);
  // leaving a screen that froze the game (the dev panel, photo mode) lets time run again
  const VACATION_SCENES = ['map', 'location', 'shop', 'wardrobe', 'journal', 'mail', 'poolhop', 'casino', 'photo', 'album', 'dayend', 'vacresult', 'ending', 'story'];
  G.game.go = (name, data) => {
    G.prevScene = G.curScene;
    if (G.curScene === 'dev' || G.curScene === 'photo') G.game.timeScale = 1;
    // a screen of the vacation opened without one (the dev panel, a test) starts a vacation for it
    if (!G.state && VACATION_SCENES.includes(name)) { G.newState({ me: 'rin', skipTutorial: true }); G.state.flags.arrival = true; G.state.flags.welcome = true; }
    G.curScene = name; return go(name, data);
  };
  G.defineSfx();
  // F1 reopens the dev panel once it has been opened in this session (never in a hub session)
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', e => { if (e.code === 'F1' && G.devUnlocked && !session && G.curScene !== 'dev') { e.preventDefault(); G.goto('dev', { from: G.curScene }); } });
  // every scene: the dev combo, the attract director (which drives the montage's real scenes), and the montage's caption
  const scenesAll = G.scenes();
  for (const k of Object.keys(scenesAll)) {
    const sc = scenesAll[k], u = sc.update, d = sc.draw;
    sc.update = function (dt) { if (G.devCombo()) return; if (G.attractOn) G.attractStep(dt); if (u) return u.call(this, dt); };
    sc.draw = function (r) { const out = d ? d.call(this, r) : undefined; if (G.attractOn && G.caption) G.drawCaption(r); return out; };
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    const leave = () => { if (G.attractOn) G.attractExit(); };
    window.addEventListener('keydown', leave); window.addEventListener('pointerdown', leave);
  }
  G.game.start({ scenes: scenesAll, scene: session ? 'hub' : 'title', boot: { title: 'AHEAD OR ALIVE', steps: [['Raking the sand', () => G.buildAssets()], ['Inflating volleyballs', () => G.buildAssets()], ['Chilling the smoothies', () => G.buildAssets()], ['Counting Sonny\'s chips', () => G.buildAssets()], ['Polishing the golden sunglasses', () => G.buildAssets()]] } });
  G.curScene = session ? 'hub' : 'title';
  return G.game;
};
G.goto = function (name, data) { return G.game.go(name, data); };
/* L3 and R3 together (pad buttons 10 and 11) reopen the dev panel once it has been opened; true when it took the step */
G.devCombo = function () {
  const I = G.game && G.game.input; if (!I || G.inSession() || !G.devUnlocked || G.curScene === 'dev') return false;
  const both = I.held && I.held.has('Pad10') && I.held.has('Pad11');
  const edge = both && !G._combo; G._combo = both;
  if (edge) { G.goto('dev', { from: G.curScene }); return true; }
  return false;
};
G.buildAssets = function () { G.assets = G.assets || {}; };
G.scenes = function () {
  const pausable = { pausable: true, input: G.matchKeys };
  const menuMap = G.menuKeys;   // (every menu screen shares the same keys)
  return {
    title: Object.assign({}, G.titleScene, { input: menuMap, idleAttract: true }),
    menu: Object.assign({}, G.menuScene, { input: menuMap }),
    exhibition: Object.assign({}, G.exhibitionScene, { input: menuMap }),
    results: Object.assign({}, G.resultsScene, { input: menuMap }),
    match: Object.assign({}, G.matchScene, pausable, { camera: { zoom: [.85, 1.25] }, enter(data) { G.matchScene.enter.call(this, data); this.M.finish = () => G.matchFinish(this.M, this.o); } }),
    invitation: Object.assign({}, G.invitationScene, { input: menuMap }),
    charselect: Object.assign({}, G.charselectScene, { input: menuMap }),
    story: Object.assign({}, G.storyScene, { input: menuMap }),
    map: Object.assign({}, G.mapScene, { pausable: true, input: G.exploreKeys }),
    location: Object.assign({}, G.locScene, { pausable: true, input: G.exploreKeys }),
    shop: Object.assign({}, G.shopScene, { input: G.exploreKeys }),
    wardrobe: Object.assign({}, G.wardrobeScene, { input: G.exploreKeys }),
    journal: Object.assign({}, G.journalScene, { input: G.exploreKeys }),
    mail: Object.assign({}, G.mailScene, { input: G.exploreKeys }),
    poolhop: Object.assign({}, G.poolScene, { pausable: true, input: G.poolKeys }),
    casino: Object.assign({}, G.casinoScene, { pausable: true, input: G.casinoKeys }),
    photo: Object.assign({}, G.photoScene, { input: G.photoKeys }),
    album: Object.assign({}, G.albumScene, { input: menuMap }),
    postcard: Object.assign({}, G.postcardScene, { input: menuMap }),
    howto: Object.assign({}, G.howtoScene, { input: menuMap }),
    about: Object.assign({}, G.aboutScene, { input: menuMap }),
    attract: Object.assign({}, G.attractScene, { input: G.matchKeys }),
    dev: Object.assign({}, G.devScene, { input: menuMap }),
    dayend: Object.assign({}, G.dayendScene, { input: menuMap }),
    finale: { enter() { G.game.go('story', { event: 'party', fresh: true }); } },
    ending: Object.assign({}, G.endingScene, { input: menuMap }),
    credits: Object.assign({}, G.creditsScene, { input: menuMap }),
    vacresult: Object.assign({}, G.vacresultScene, { input: menuMap }),
    hub: Object.assign({}, G.hubScene, { input: G.matchKeys })
  };
};
/* a finished match: a vacation match pays and moves the slot on; a story match resumes its story; an exhibition shows results */
G.matchFinish = function (M, o) {
  if (o.attract) return;     // the attract demo's own matches end inside the montage
  if (M._done) return; M._done = true;
  const won = M.winner === 0, margin = Math.abs(M.score[0] - M.score[1]);
  const result = { won, score: M.score.slice(), teamNames: [M.players[0].name + ' / ' + M.players[1].name, M.players[2].name + ' / ' + M.players[3].name],
    stats: { points: M.stats.points[0], kills: M.players.filter(p => p.side === 0).reduce((a, p) => a + (p.stats.kills || 0), 0), longest: M.stats.longest }, opts: o };
  if (o.story) {
    if (o.story === 'final') { G.state.flags.finalWon = won; G.state.flags.final = won ? 'won' : 'lost'; }
    if (o.story === 'semi' && won) G.state.flags.semiWon = true;
    return G.game.go('story', { event: G.storyRunEv(), fresh: false });
  }
  if (o.vacation) {
    const partner = o.vacation.partner;
    G.matchResult(won, margin, partner, o.vacation.opp);
    G.state.stats.points += result.stats.points;
    if (won) G.state.day_stats.wins = G.state.day_stats.wins;
    G.state.lastMatch = { won, score: M.score.slice() };
    if (G.advanceSlot() === 'dayEnd') return G.game.go('dayend', {});
    return G.game.go('map', {});
  }
  return G.game.go('results', result);
};
G.storyRunEv = function () { return G.storyRun ? G.storyRun.ev : 'welcome'; };
if (typeof window !== 'undefined' && !window.AOA_NO_BOOT) { window.addEventListener('load', () => G.boot()); }

})();
