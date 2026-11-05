(() => {
'use strict';
const E = My3D2dge, G = {}; window.AOA = G;

/* ---- 00-core.js ---- */
/* AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL
 * Core loop: pick where to spend each morning, afternoon and night of a five-day island vacation; win 2-on-2 beach
 * volleyball with a partner you befriend through chats and gifts; spend the prize money on swimsuits, gifts and casino
 * nights; then beat the island's owner in the Fortuna Cup final.
 *
 * 00-core: the G namespace, constants, random streams, the event bus, overlays, the scene wrapper and small helpers.
 * Every src file is plain code that adds to G (the build wraps them all in one IIFE with E = My3D2dge). */
const { px, clamp, lerp, approach, TAU } = E;
G.E = E;
G.TITLE = 'Ahead or Alive: Xtreme Beach Volleyball';
G.VERSION = '1.0.0';
G.hub = !!(window.AIHub && window.AIHub.active);
G.scenes = {};   // every scene, registered by its module; 99-main starts them

/* ---- the court, in world units (one tile = 16) ---- */
G.C = {
  TILE: 16, MAP_W: 44, MAP_H: 28,
  X0: 224, X1: 480, NET_X: 352, Y0: 176, Y1: 304, CY: 240,
  NET_H: 44, NET_LO: 28, ANT_H: 62, BALL_R: 3.5
};

/* ---- random streams: gameplay never calls Math.random ----
 * world: schedules, moods, weather, stock (seeded per save); match: AI rolls and net cords (per match); casino;
 * cosmetic: crowd, particles, voices (never changes state) */
G.streams = {};
G.seed = (name, seed) => { G.streams[name] = E.rng((seed >>> 0) || 1); G.streams[name].seed = seed >>> 0; return G.streams[name]; };
G.rng = name => G.streams[name] || G.seed(name, G.hashStr(name));
G.rand = (name, a = 0, b = 1) => a + (b - a) * G.rng(name)();
G.randInt = (name, a, b) => a + Math.floor(G.rng(name)() * (b - a + 1));
G.pick = (name, list) => list[Math.floor(G.rng(name)() * list.length) % list.length];
G.chance = (name, p) => G.rng(name)() < p;
G.shuffle = (name, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(G.rng(name)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
G.hashStr = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G.weighted = (name, entries) => {   // entries: [[value, weight], ...]
  let tot = 0; for (const e of entries) tot += Math.max(0, e[1]);
  if (tot <= 0) return entries[0] && entries[0][0];
  let r = G.rng(name)() * tot;
  for (const e of entries) { r -= Math.max(0, e[1]); if (r < 0) return e[0]; }
  return entries[entries.length - 1][0];
};

/* ---- the event bus: point, touch, fault, matchEnd, gift, affinity, purchase, slotEnd, dayEnd, photo, story ---- */
G.bus = {
  map: {},
  on(ev, fn) { (this.map[ev] || (this.map[ev] = [])).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const l = this.map[ev]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
  emit(ev, data) { const l = this.map[ev]; if (l) for (const fn of l.slice()) { try { fn(data); } catch (e) { G.game && G.game.fail('event ' + ev, e); } } }
};

/* ---- overlays: the dev panel, photo mode, toasts, the touch-only notice and the attract watcher sit over scenes.
 * Each is { id, update(dt) -> true when it took the input, draw(r), modal } ---- */
G.overlay = {
  list: [],
  push(o) { if (!this.list.includes(o)) this.list.push(o); return o; },
  remove(o) { const i = this.list.indexOf(o); if (i >= 0) this.list.splice(i, 1); },
  has(id) { return this.list.some(o => o.id === id); },
  get(id) { return this.list.find(o => o.id === id); },
  update(dt) {
    let took = false;
    for (let i = this.list.length - 1; i >= 0; i--) { const o = this.list[i]; if (o && o.update && o.update(dt, took)) took = true; }
    return took;
  },
  draw(r) { for (const o of this.list.slice()) if (o.draw) o.draw(r); }
};

/** every scene goes through this: overlays first (they may take the input), then the scene; overlays draw last */
G.wrapScene = (name, sc) => {
  const up = sc.update, dr = sc.draw, en = sc.enter;
  sc.name = name;
  sc.enter = function (d) {   // overlays that belong to a scene (photo mode, How to Play over a pause) end with it
    for (const o of G.overlay.list.slice()) if (o.sceneBound) { G.overlay.remove(o); G.game.timeScale = 1; G._inputStack.length = 0; }
    if (en) return en.call(this, d);
  };
  sc.update = function (dt) {
    G.sceneTime = (G.sceneTime || 0) + dt;
    if (G.devPadCheck) G.devPadCheck();
    if (G.overlay.update(G.realDt || dt)) return;
    if (up) up.call(this, dt);
  };
  sc.draw = function (r) {
    G.lastR = r;
    if (dr) dr.call(this, r);
    G.overlay.draw(r);
  };
  return sc;
};

/* ---- helpers ---- */
G.fmtMoney = n => 'S$' + Math.round(n).toLocaleString('en-US');
G.fmtChips = n => Math.round(n).toLocaleString('en-US') + ' chips';
G.clamp = clamp; G.lerp = lerp;
G.dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
G.ease = E.ease;
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
G.upper = s => String(s).toUpperCase();
/** a value that eases toward a target for counting animations */
G.counter = (v = 0) => ({ v, shown: v, step(dt, k = 6) { this.shown = Math.abs(this.v - this.shown) < 1 ? this.v : this.shown + (this.v - this.shown) * Math.min(1, dt * k); return this.shown; } });
/** text that fits a width: shortened with an ellipsis */
G.fit = (s, w, o) => { s = String(s); if (E.font.width(s, o) <= w) return s; while (s.length > 1 && E.font.width(s + '…', o) > w) s = s.slice(0, -1); return s + '…'; };
/** the real seconds since the last step (overlays run on real time while the game is frozen) */
G.realDt = 1 / 120;
G.now = () => (G.game ? G.game.time : 0);
G.log = [];   // short history of notable events, for tests and the dev panel
G.note = (s) => { G.log.push(s); if (G.log.length > 60) G.log.shift(); };


/* ---- 01-tuning.js ---- */
/* 01-tuning: every live slider of the dev panel (default, range, step, group, label, unit). G.T is the live object every
 * system reads each step: the defaults, with the dev panel's overrides kept in E.store('aoa-dev-tuning'). */
G.TUNING = [
  ['ballGravity', 'Ball', 'Ball gravity', 330, 180, 500, 5, ' u/s²'],
  ['ballDrag', 'Ball', 'Air drag', .12, 0, .6, .01, ''],
  ['passT', 'Ball', 'Pass flight time', 1.05, .7, 1.6, .05, ' s'],
  ['setT', 'Ball', 'Set flight time', 1.1, .7, 1.6, .05, ' s'],
  ['serveT', 'Ball', 'Float serve time', 1.3, .9, 1.8, .05, ' s'],
  ['jumpServeT', 'Ball', 'Jump serve time', .85, .6, 1.3, .05, ' s'],
  ['spikeSpeed', 'Ball', 'Spike speed', 330, 220, 480, 5, ' u/s'],
  ['shotT', 'Ball', 'Cut shot time', .95, .6, 1.4, .05, ' s'],
  ['netCordOver', 'Ball', 'Net cord goes over', .45, 0, 1, .05, ''],
  ['perfectWin', 'Timing', 'Perfect window', .05, .02, .12, .005, ' s'],
  ['greatWin', 'Timing', 'Great window', .10, .05, .2, .005, ' s'],
  ['okWin', 'Timing', 'OK window', .16, .08, .3, .01, ' s'],
  ['reach', 'Timing', 'Reach', 14, 8, 24, 1, ' u'],
  ['diveReach', 'Timing', 'Dive reach', 16, 6, 30, 1, ' u'],
  ['blockRise', 'Timing', 'Block rise time', .28, .15, .45, .01, ' s'],
  ['runSpeed', 'Players', 'Run speed', 96, 60, 140, 2, ' u/s'],
  ['autoMove', 'Players', 'Auto-run strength', .85, 0, 1, .05, ''],
  ['aiSkillMul', 'AI', 'AI skill × day base', 1, .3, 1.6, .02, ''],
  ['aiReaction', 'AI', 'AI reaction', .25, 0, .6, .01, ' s'],
  ['aiSpeedMul', 'AI', 'AI speed', 1, .6, 1.4, .02, '×'],
  ['chemistry', 'AI', 'Partner chemistry effect', .3, 0, .6, .02, ''],
  ['pointsToWin', 'Match', 'Points to win (vacation)', 7, 3, 21, 1, ''],
  ['prizeMul', 'Economy', 'Prize money', 1, 0, 3, .05, '×'],
  ['priceMul', 'Economy', 'Shop prices', 1, .25, 3, .05, '×'],
  ['startMoney', 'Economy', 'Starting money', 30000, 0, 200000, 5000, ''],
  ['affinityGainMul', 'Social', 'Affinity gains', 1, 0, 3, .05, '×'],
  ['affinityDecay', 'Social', 'Daily affinity drift', 2, 0, 10, 1, ''],
  ['inviteThreshold', 'Social', 'Team-up threshold', 40, 0, 100, 1, ''],
  ['giftThreshold', 'Social', 'Gift acceptance', 0, -3, 3, 1, ''],
  ['poolBpm', 'Pool Hop', 'Pool Hop tempo', 112, 80, 150, 2, ' bpm'],
  ['poolWindowMul', 'Pool Hop', 'Pool Hop windows', 1, .5, 2, .05, '×'],
  ['poolTime', 'Pool Hop', 'Pool Hop time', 40, 20, 80, 1, ' s'],
  ['slotsPayMul', 'Casino', 'Slot payouts', 1, .5, 1.5, .01, '×'],
  ['dealerHitsSoft17', 'Casino', 'Dealer hits soft 17', false, null, null, null, ''],
  ['rouletteDoubleZero', 'Casino', 'Double-zero wheel', false, null, null, null, ''],
  ['textSpeed', 'Presentation', 'Text speed', 45, 10, 200, 5, ' /s'],
  ['cameraZoomMul', 'Presentation', 'Camera zoom', 1, .7, 1.3, .02, '×']
].map(([key, group, label, value, min, max, step, unit]) => ({ key, group, label, value, min, max, step, unit, toggle: typeof value === 'boolean' }));
G.TUNING_BY = Object.fromEntries(G.TUNING.map(t => [t.key, t]));
G.T = {};
G.tuningDefaults = () => Object.fromEntries(G.TUNING.map(t => [t.key, t.value]));
G.loadTuning = () => {
  Object.assign(G.T, G.tuningDefaults());
  if (G.hub) return;   // a session uses the defaults and stores nothing
  const saved = E.store.get('aoa-dev-tuning', null);
  if (saved && typeof saved === 'object') for (const k in saved) if (G.TUNING_BY[k] && typeof saved[k] === typeof G.T[k]) G.T[k] = saved[k];
};
G.setTuning = (k, v) => {
  const t = G.TUNING_BY[k]; if (!t) return;
  if (!t.toggle) v = clamp(Math.round(v / t.step) * t.step, t.min, t.max), v = +v.toFixed(4);
  G.T[k] = v; if (!G.hub) E.store.set('aoa-dev-tuning', G.tuningChanged());
};
G.resetTuning = (k) => {
  if (k) G.T[k] = G.TUNING_BY[k].value; else Object.assign(G.T, G.tuningDefaults());
  if (!G.hub) E.store.set('aoa-dev-tuning', G.tuningChanged());
};
G.tuningChanged = () => { const d = G.tuningDefaults(), out = {}; for (const k in d) if (G.T[k] !== d[k]) out[k] = G.T[k]; return out; };
G.loadTuning();

/* ---- difficulty and assists (the Settings' Game group) ---- */
G.DIFF = { Easy: -.2, Normal: 0, Hard: .12, Pro: .22 };
G.ASSIST = { Tight: .8, Normal: 1, Generous: 1.6 };
G.TEXT_SPEED = { Slow: .6, Normal: 1, Fast: 1.8, Instant: 40 };
G.setting = (k, fallback) => { const s = G.game && G.game.settings; const v = s ? s[k] : undefined; return v === undefined ? fallback : v; };


/* ---- 02-data-cast.js ---- */
/* 02-data-cast: the six fighters, the hosts and the staff: looks, stats, tastes, voices, schedules and celebrations.
 * Every character is an adult. Stats are 1-10: POW (spikes, serves), TEC (passes, sets, digs), SPD (movement), JMP (blocks,
 * reach). Adding a fighter is a row here, a row in the gift tastes and the affinity table, and her lines in 05. */
G.FIGHTERS = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'];
G.CAST = {
  rin: { name: 'Rin', full: 'Rin Takamine', epithet: 'The Quiet Blade', from: 'Japan', style: 'Kendo and iaido champion', age: 24, size: 1.22,
    hair: 'ponytail', hairColor: '#1d1a24', bangs: .6, skin: '#f1cfb2', eyes: '#4a2c22', iris: '#5a3a2a',
    stats: { POW: 5, TEC: 9, SPD: 7, JMP: 6 }, tastes: ['classic', 'elegant'], suit: 'seigaiha', acc: ['ribbon'], accColor: '#d8303a',
    voice: { base: 330, range: 3, rate: 13, formant: 1.05, wave: 'triangle', breath: .2 }, celebrate: 'Bow', color: '#5a7ad8',
    personality: 'Composed perfectionist with dry one-liners. Secretly adores cute things.', sched: [[4, 2, 3, 1], [4, 3, 2, 1], [3, 7]], weather: {} },
  lola: { name: 'Lola', full: 'Dolores "Lola" Vega', epithet: 'La Tormenta', from: 'Mexico', style: 'Luchadora (pro wrestler)', age: 27, size: 1.3, shoulders: .25,
    hair: 'curly', hairColor: '#3a2218', bangs: .4, band: '#d8302a', skin: '#b9825a', eyes: '#3a2416', iris: '#4a2a18',
    stats: { POW: 9, TEC: 5, SPD: 5, JMP: 8 }, tastes: ['bold', 'sporty'], suit: 'estrella', acc: ['sweatband'], color: '#e83a3a',
    voice: { base: 260, range: 6, rate: 16, formant: .95, wave: 'saw', breath: .3 }, celebrate: 'Victory Fist Pump',
    personality: 'Loud, warm and theatrical. Trash-talks with a grin and lives for a crowd.', sched: [[5, 2, 2, 1], [5, 2, 2, 1], [6, 4]], weather: {} },
  ingrid: { name: 'Ingrid', full: 'Ingrid Halvorsen', epithet: 'The Glacier', from: 'Norway', style: 'Glíma wrestling and kickboxing', age: 26, size: 1.38,
    hair: 'braid', hairColor: '#f2ead2', bangs: .3, skin: '#f7dccb', eyes: '#2a3a58', iris: '#5aa0d8',
    stats: { POW: 7, TEC: 6, SPD: 4, JMP: 9 }, tastes: ['sporty', 'classic'], suit: 'fjord', acc: ['sportshades'], color: '#7ad0f0',
    voice: { base: 210, range: 2, rate: 10, formant: .9, wave: 'triangle', breath: .4 }, celebrate: 'Head Nod',
    personality: 'Stoic and deadpan. Hates the heat and misses snow. Secretly a karaoke fiend.', sched: [[3, 4, 2, 1], [2, 5, 2, 1], [2, 8]], weather: { like: ['cloudy', 'rain'], dislike: [] } },
  amara: { name: 'Amara', full: 'Amara Okafor', epithet: 'Rhythm Queen', from: 'UK / Nigeria', style: 'Capoeira and dance fighting', age: 22, size: 1.26,
    hair: 'puff', hairColor: '#2a1810', bangs: .2, skin: '#7a4a2e', eyes: '#2a1810', iris: '#3a2214',
    stats: { POW: 5, TEC: 6, SPD: 9, JMP: 8 }, tastes: ['bold', 'cute'], suit: 'kentepop', acc: ['hibiscus'], color: '#ff9e3a',
    voice: { base: 340, range: 7, rate: 15, formant: 1.1, wave: 'pulse', breath: .2 }, celebrate: 'Dance Charleston',
    personality: 'Cheerful social butterfly who loves music and fashion. A little dramatic.', sched: [[3, 2, 4, 1], [3, 3, 3, 1], [7, 3]], weather: { like: ['sunny'], dislike: ['rain'] } },
  tess: { name: 'Tess', full: 'Tess Callahan', epithet: 'Riptide', from: 'Australia', style: 'Surfer and MMA brawler', age: 25, size: 1.28,
    hair: 'bob', hairColor: '#f0d890', bangs: .7, skin: '#e2ad84', eyes: '#2a3a30', iris: '#3c7a5a',
    stats: { POW: 7, TEC: 7, SPD: 7, JMP: 6 }, tastes: ['sporty', 'bold'], suit: 'reefbreak', acc: ['wristbands'], color: '#2ec4b0',
    voice: { base: 290, range: 5, rate: 14, formant: 1.0, wave: 'saw', breath: .25 }, celebrate: 'Wave_Hello', goodSport: true,
    personality: 'Laid-back but fiercely competitive. Cheeky and outdoorsy.', sched: [[6, 2, 1, 1], [5, 3, 1, 1], [4, 6]], weather: { like: ['sunny'], dislike: [] } },
  mei: { name: 'Mei', full: 'Mei-Lin Zhou', epithet: 'Little Phoenix', from: 'Hong Kong', style: 'Wushu acrobat and xiangqi prodigy', age: 21, size: 1.16,
    hair: 'twinbuns', hairColor: '#1a1418', bangs: .8, skin: '#f3d2b8', eyes: '#3a2420', iris: '#4a2a22',
    stats: { POW: 4, TEC: 8, SPD: 8, JMP: 6 }, tastes: ['cute', 'elegant'], suit: 'peony', acc: ['ribbon'], accColor: '#ff7ab8', color: '#ff7ab8',
    voice: { base: 400, range: 6, rate: 18, formant: 1.18, wave: 'pulse', breath: .15 }, celebrate: 'Backflip',
    personality: 'Mischievous prankster with a sweet tooth. Hates losing at anything.', sched: [[2, 3, 4, 1], [3, 2, 4, 1], [8, 2]], weather: {} },
  sonny: { name: 'Sonny', full: 'Sonny Fortuna', epithet: 'The Man with the Golden Tan', from: 'Isla Fortuna', style: 'Jackpot billionaire and DJ', age: 52, size: 1.32, build: 'bulky',
    hair: 'spiky', hairColor: '#121014', bangs: .3, skin: '#d9a27a', eyes: '#2a1a10', iris: '#3a2410', host: true,
    stats: { POW: 8, TEC: 5, SPD: 5, JMP: 5 }, color: '#ffd36a', celebrate: 'Cheering_Two_Hands',
    voice: { base: 120, range: 7, rate: 13, formant: .8, wave: 'saw', breath: .3, vib: 6 },
    outfit: { cloth: '#2fb5a0', pattern: '#ffd36a', trim: '#ff5f7a', pants: '#f4f2ea', boot: '#d9a27a', strap: '#8a5a32' }, finalKit: { cut: 'rash', pattern: 'pin', colors: { main: '#16141c', accent: '#16141c', trim: '#ffd36a' } } },
  pepper: { name: 'Pepper', full: 'Pepper Quill', epithet: 'The House Always Wins', from: 'Isla Fortuna', style: 'Concierge, scorekeeper, dealer', age: 34, size: 1.24, build: 'athletic',
    hair: 'bun', hairColor: '#5a2a1e', bangs: .5, skin: '#f0c8a8', eyes: '#2a1a14', iris: '#4a6a3a', host: true,
    stats: { POW: 6, TEC: 10, SPD: 7, JMP: 6 }, color: '#9fd3d6', celebrate: 'Salute',
    voice: { base: 230, range: 1, rate: 17, formant: 1.0, wave: 'triangle', breath: .1 },
    outfit: { cloth: '#1d2433', trim: '#ffd36a', pants: '#1d2433', boot: '#2a2228' }, finalKit: { cut: 'racer', pattern: 'pin', colors: { main: '#121216', accent: '#f4f4f4', trim: '#ffd36a' } } },
  kai: { name: 'Kai', full: 'Kai Makoa', epithet: 'Bartender and croupier', size: 1.25, build: 'heroic', hair: 'short', hairColor: '#141012', skin: '#a8714a', eyes: '#1a1210', iris: '#2a1a10', staff: true,
    voice: { base: 170, range: 4, rate: 12, formant: .85, wave: 'triangle', breath: .3 }, color: '#2fb5a0', outfit: { cloth: '#2fb5a0', pattern: '#ff8aa8', trim: '#ffffff', pants: '#c8b080', boot: '#a8714a', strap: '#5a3a1a' }, pat: 'floral' },
  odette: { name: 'Odette', full: 'Odette Belrose', epithet: 'Couturier', size: 1.2, build: 'athletic', hair: 'long', hairColor: '#c8b8e8', skin: '#f6d6c4', eyes: '#3a2a4a', iris: '#7a5ac8', staff: true,
    voice: { base: 300, range: 5, rate: 12, formant: 1.1, wave: 'pulse', breath: .3 }, color: '#ff8aa8', outfit: { cloth: '#ff8aa8', trim: '#ffffff', pants: '#ff8aa8', boot: '#f6d6c4', strap: '#e8c060' }, robe: true, hat: { style: 'sunhat', color: '#f0d890', band: '#ff5f7a' } },
  bo: { name: 'Coach Bo', full: 'Coach Bo Brannigan', epithet: 'Retired beach pro', size: 1.28, build: 'bulky', hair: 'bald', hairColor: '#8a5a3a', skin: '#e0a880', eyes: '#2a2010', iris: '#3a5a8a', staff: true,
    voice: { base: 150, range: 3, rate: 14, formant: .85, wave: 'square', breath: .2 }, color: '#ffd04a', outfit: { cloth: '#ffd04a', trim: '#3a6ad8', pants: '#3a6ad8', boot: '#e0a880', strap: '#2a2a2a' }, hat: { style: 'visor', color: '#ffffff', brim: '#3a6ad8' } }
};
for (const id in G.CAST) G.CAST[id].id = id;
G.voiceOf = who => (G.CAST[who] && G.CAST[who].voice) || null;
G.castName = id => (G.CAST[id] ? G.CAST[id].name : id);

/* ---- tastes: gifts (L love, + like, . neutral, - dislike) in the order rin lola ingrid amara tess mei ---- */
G.GIFT_TASTE_TABLE = {
  mango_smoothie: '.+.++.', bubble_tea: '.....+', matcha_icecream: '+.+..+', mochi_box: '+....L', bbq_skewers: '.+..L-', hot_sauce: '-L-.+-',
  iced_coffee: '..+...', coconut: '....+.', plush_seal: 'L.+..+', snow_globe: '..L-..', puzzle_cube: '+-...L', portable_speaker: '-+.L+.',
  matcha_kit: 'L-...+', calligraphy_set: '+...-.', knitting_kit: '..L-.-', maracas: '.+.+..', luchador_mask: '.L..+.', beach_paperback: '+-+...',
  fashion_mag: '..-+-+', energy_drink: '-..-+-', surf_wax: '....L.', sunscreen: '..+.+.', foam_finger: '-+..+.', glitter_sandals: '..-+-+', gold_hoops: '.+.L..'
};
G.TASTE_KEY = { L: 'love', '+': 'like', '.': 'neutral', '-': 'dislike' };
G.giftTaste = (who, item) => { const row = G.GIFT_TASTE_TABLE[item], i = G.FIGHTERS.indexOf(who); return row && i >= 0 ? G.TASTE_KEY[row[i]] : 'neutral'; };

/* ---- starting affinity between the fighters (symmetric); also used to pair NPCs into teams ---- */
G.BASE_AFFINITY = {
  rin: { lola: 20, ingrid: 35, amara: 25, tess: 30, mei: 40 }, lola: { ingrid: 25, amara: 40, tess: 45, mei: 20 },
  ingrid: { amara: 20, tess: 35, mei: 25 }, amara: { tess: 30, mei: 40 }, tess: { mei: 25 }
};
G.baseAff = (a, b) => (G.BASE_AFFINITY[a] && G.BASE_AFFINITY[a][b]) || (G.BASE_AFFINITY[b] && G.BASE_AFFINITY[b][a]) || 25;

/* ---- the opponents' skill by match (before stats, difficulty and the AI skill slider) ---- */
G.DAY_SKILL = { tutorial: .3, 1: .4, 2: .5, 3: .58, 4: .66, semi: .74, final: .78, exhibition: .55, hub: .5, attract: 1 };


/* ---- 03-data-items.js ---- */
/* 03-data-items: swimsuits, accessories, gifts and the shops that sell them. Prices are Sonny Dollars (S$); "day" items
 * reach the shop on that day. Swimwear is athletic or fashion-forward. */
G.SUITS = {};
[
  ['seigaiha', 'Seigaiha', 'onepiece', 'waves', '#23306b', '#e8eef8', '#c8303a', 'classic elegant', 'sig', 0],
  ['estrella', 'Estrella', 'sport2', 'stars', '#c8202c', '#ffd04a', '#1a1a1a', 'bold sporty', 'sig', 0],
  ['fjord', 'Fjord', 'rash', 'solid', '#9fd8f0', '#1d3560', '#ffffff', 'sporty classic', 'sig', 0, { sleeves: 'short' }],
  ['kentepop', 'Kente Pop', 'tankini', 'geo', '#ff8a1e', '#2f9e4a', '#ffd36a', 'bold cute', 'sig', 0],
  ['reefbreak', 'Reef Break', 'racer', 'gradient', '#1fb7b0', '#ff7a5e', '#ffffff', 'sporty bold', 'sig', 0],
  ['peony', 'Peony', 'halter', 'floral', '#ffb2a0', '#e85a8a', '#ffffff', 'cute elegant', 'sig', 0],
  ['protour', 'Pro Tour', 'racer', 'pin', '#f4f6fa', '#d8283a', '#1a2a5a', 'sporty', 'riptide', 12000],
  ['sandstorm', 'Sandstorm', 'sport2', 'solid', '#e8c06a', '#1a1a1a', '#ffffff', 'sporty bold', 'riptide', 9000],
  ['lifeguard', 'Lifeguard', 'onepiece', 'solid', '#e0302a', '#ffd04a', '#ffffff', 'sporty classic', 'riptide', 8000],
  ['coralrash', 'Coral Rash', 'rash', 'stripes', '#ff7a5e', '#ffffff', '#2a3a5a', 'sporty', 'riptide', 14000, { sleeves: 'long' }],
  ['neonrush', 'Neon Rush', 'tankini', 'gradient', '#7cff5a', '#ff4fb8', '#1a1a1a', 'bold sporty', 'riptide', 16000, { day: 2 }],
  ['monaco', 'Monaco', 'halter', 'stripes', '#1d2f6a', '#ffffff', '#d8283a', 'classic elegant', 'coral', 22000],
  ['polkapop', 'Polka Pop', 'sport2', 'dots', '#e8283a', '#ffffff', '#ffd04a', 'cute', 'coral', 18000, { brief: true }],
  ['tropicana', 'Tropicana', 'sarong', 'palms', '#2f8f4e', '#ffe0a0', '#ff8a1e', 'elegant', 'coral', 26000],
  ['mermaid', 'Mermaid', 'onepiece', 'scales', '#1fb7b0', '#7a5fd8', '#e8f8ff', 'cute elegant', 'coral', 30000, { day: 3 }],
  ['sunsetblvd', 'Sunset Boulevard', 'tankini', 'gradient', '#ff9e5e', '#7a3fa0', '#ffd36a', 'bold elegant', 'coral', 28000],
  ['midnight', 'Midnight', 'onepiece', 'solid', '#16141c', '#ffd36a', '#ffd36a', 'elegant bold', 'coral', 35000, { day: 4 }],
  ['gingham', 'Gingham Picnic', 'tankini', 'check', '#6aa8e8', '#ffffff', '#e8283a', 'cute classic', 'coral', 15000],
  ['fortunagold', 'Fortuna Gold', 'racer', 'lame', '#ffd36a', '#fff3c0', '#1a1a1a', 'bold', 'final', 0],
  ['jackpot', 'Jackpot', 'sport2', 'sevens', '#1a1a2a', '#ffd36a', '#e8283a', 'bold cute', 'prize', 300],
  ['pinstripe', "Pepper's Pinstripe", 'racer', 'pin', '#121216', '#f4f4f4', '#ffd36a', 'classic elegant', 'pepper', 0]
].forEach(([id, name, cut, pattern, main, accent, trim, tastes, where, price, extra]) => {
  G.SUITS[id] = Object.assign({ id, name, cut, pattern, colors: { main, accent, trim }, tastes: tastes.split(' '), where, price, kind: 'suit' }, extra || {});
});
G.SUIT_IDS = Object.keys(G.SUITS);
G.CUT_NAMES = { onepiece: 'One-piece', racer: 'Racerback', halter: 'Halter', sport2: 'Sport two-piece', tankini: 'Tankini', rash: 'Rash guard', sarong: 'Sarong set' };

G.ACCS = {};
[
  ['ribbon', 'Ribbon', 'hair', 'A bow in your accent color', 'classic cute', 'coral', 2000],
  ['sweatband', 'Sweatband', 'head', 'Terry headband', 'sporty', 'riptide', 3000],
  ['sportshades', 'Sport Shades', 'face', 'Wraparound lenses', 'sporty', 'riptide', 6000, { shades: true }],
  ['heartshades', 'Heart Shades', 'face', 'Two pink hearts', 'cute bold', 'coral', 7500, { shades: true }],
  ['aviators', 'Gold Aviators', 'face', "Just like Sonny's", 'bold', 'coral', 15000, { shades: true, day: 3 }],
  ['visor', 'Sun Visor', 'head', 'White with a colored brim', 'sporty', 'riptide', 4000],
  ['sunhat', 'Straw Sun Hat', 'head', 'Wide straw brim, ribbon band', 'elegant classic', 'coral', 9000],
  ['hibiscus', 'Hibiscus', 'hair', 'A red flower behind the ear', 'cute elegant', 'sundries', 2500],
  ['shellnecklace', 'Shell Necklace', 'neck', 'White shell beads', 'cute classic', 'sundries', 4500],
  ['wristbands', 'Wristbands', 'wrists', 'A pair of terry bands', 'sporty', 'riptide', 3500]
].forEach(([id, name, anchor, about, tastes, where, price, extra]) => {
  G.ACCS[id] = Object.assign({ id, name, anchor, about, tastes: tastes.split(' '), where, price, kind: 'acc' }, extra || {});
});
G.ACC_IDS = Object.keys(G.ACCS);

G.GIFTS = {};
[
  ['food', 'sundries', [['mango_smoothie', 'Mango Smoothie', 800], ['bubble_tea', 'Bubble Tea', 900], ['matcha_icecream', 'Matcha Ice Cream', 700], ['mochi_box', 'Mochi Box', 1500],
    ['bbq_skewers', 'BBQ Skewers', 1200], ['hot_sauce', 'Hot Sauce Sampler', 2000], ['iced_coffee', 'Iced Coffee', 600], ['coconut', 'Fresh Coconut', 400]]],
  ['goods', 'sundries', [['plush_seal', 'Plush Seal', 3000], ['snow_globe', 'Snow Globe', 2500], ['puzzle_cube', 'Puzzle Cube', 2200], ['portable_speaker', 'Portable Speaker', 9000],
    ['matcha_kit', 'Matcha Kit', 4500], ['calligraphy_set', 'Calligraphy Set', 6000], ['knitting_kit', 'Knitting Kit', 2800], ['maracas', 'Maracas', 1400], ['luchador_mask', 'Luchador Mask', 5000, 2]]],
  ['books', 'sundries', [['beach_paperback', 'Beach Paperback', 1200], ['fashion_mag', 'Fashion Magazine', 800]]],
  ['sports', 'riptide', [['energy_drink', 'Energy Drink', 500], ['surf_wax', 'Surf Wax Deluxe', 1600], ['sunscreen', 'Sunscreen SPF 100', 1000], ['foam_finger', 'Foam Finger', 900]]],
  ['fashion', 'coral', [['glitter_sandals', 'Glitter Sandals', 5500], ['gold_hoops', 'Gold Hoop Earrings', 12000]]]
].forEach(([cat, where, list]) => list.forEach(([id, name, price, day]) => { G.GIFTS[id] = { id, name, price, cat, where, kind: 'gift', day: day || 1 }; }));
G.GIFT_IDS = Object.keys(G.GIFTS);
G.GIFT_CATS = ['food', 'goods', 'books', 'sports', 'fashion'];
G.CAT_NAMES = { food: 'Food & Drink', goods: 'Goods', books: 'Books', sports: 'Sports', fashion: 'Fashion' };

/* gift icons, 12x12 pixel art, one per gift */
const GI = (rows, pal) => E.sprite(rows, pal);
G.GIFT_ICONS = {
  mango_smoothie: GI(['.....kk.....', '.....k......', '...wwwwww...', '...woooow...', '...wooOow...', '...woooow...', '....wooo....', '....wooo....', '....wwww....', '.....ww.....', '....wwww....', '............'], { k: '#e8508a', w: '#e8f4f8', o: '#ffb83a', O: '#ffe08a' }),
  bubble_tea: GI(['.....k......', '.....k......', '...wwwwww...', '...wbbbbw...', '...wbbbbw...', '...wbbbbw...', '...wbbbbw...', '...wdbdbw...', '...wbdbdw...', '....wwww....', '............', '............'], { k: '#ff5f7a', w: '#e8f4f8', b: '#d8b088', d: '#3a2418' }),
  matcha_icecream: GI(['....gggg....', '...gGggggg..', '...gggggGg..', '....gggg....', '....yyyy....', '....yYyy....', '.....yy.....', '.....yy.....', '.....y......', '............', '............', '............'], { g: '#8ac85a', G: '#c8f0a0', y: '#e8b060', Y: '#f8d898' }),
  mochi_box: GI(['............', '.bbbbbbbbbb.', '.b.pp.ww.gb.', '.bpPpwWwggb.', '.b.pp.ww.gb.', '.bbbbbbbbbb.', '.BBBBBBBBBB.', '............', '............', '............', '............', '............'], { b: '#c85a3a', B: '#8a3a2a', p: '#ffb2c8', P: '#ffe0e8', w: '#f8f6f0', W: '#ffffff', g: '#a8d880' }),
  bbq_skewers: GI(['...........k', '..........k.', '...rrbbk.k..', '..rRrbbkk...', '...rrbbk....', '.....kk.....', '....k.......', '...k........', '..k.........', '.k..........', '............', '............'], { r: '#c8402a', R: '#ff8a5a', b: '#8a5a2a', k: '#c8a070' }),
  hot_sauce: GI(['.....kk.....', '.....kk.....', '....rrrr....', '....rRrr....', '...rrrrrr...', '...ryyyyr...', '...ryRRyr...', '...ryyyyr...', '...rrrrrr...', '...rrrrrr...', '....rrrr....', '............'], { k: '#2a2a2a', r: '#d8202a', R: '#ff6a5a', y: '#ffd04a' }),
  iced_coffee: GI(['......k.....', '......k.....', '...wwwwww...', '...wcccw....', '...wcwwcw...', '...wcccw....', '...wccccw...', '...wccccw...', '....wwww....', '............', '............', '............'], { k: '#3a3a3a', w: '#d8eef4', c: '#8a5a3a' }),
  coconut: GI(['......k.....', '.....k......', '...bbbbbb...', '..bBbbbbbb..', '..bbbwbbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '....bbbb....', '............', '............', '............'], { k: '#ff5f7a', b: '#6a4428', B: '#9a6a48', w: '#f8f0e0' }),
  plush_seal: GI(['............', '...wwwww....', '..wwwwwww...', '..wkwwkww...', '..wwwpwww...', '.wwwwwwwww..', 'wwwwwwwwwww.', 'wwwwwwwwwwww', '.wwwwwwwww.w', '..ww...ww...', '............', '............'], { w: '#e8eef4', k: '#141018', p: '#ff9aa8' }),
  snow_globe: GI(['....bbbb....', '...bwbbbb...', '..bbbwbwbb..', '..bwbgggbb..', '..bbgggggb..', '..bwbgbbwb..', '...bbbbbb...', '....bbbb....', '...yyyyyy...', '..yYyyyyyy..', '............', '............'], { b: '#9fd8f0', w: '#ffffff', g: '#3a8a4a', y: '#c8902a', Y: '#ffd36a' }),
  puzzle_cube: GI(['............', '..rrryyybbb.', '..rrryyybbb.', '..gggwwwooo.', '..gggwwwooo.', '..bbbrrryyy.', '..bbbrrryyy.', '............', '............', '............', '............', '............'], { r: '#e8283a', y: '#ffd04a', b: '#3a6ad8', g: '#3aa04a', w: '#f4f4f4', o: '#ff8a1e' }),
  portable_speaker: GI(['............', '.kkkkkkkkkk.', '.kggkkkkggk.', '.kgGgkkgGgk.', '.kggkkkkggk.', '.kkkkrrkkkk.', '.kkkkkkkkkk.', '............', '............', '............', '............', '............'], { k: '#2a2434', g: '#5a5678', G: '#9a94b8', r: '#ff5f7a' }),
  matcha_kit: GI(['............', '....gggg....', '...gGGGGg...', '..gggggggg..', '..gwwwwwwg..', '..gwwwwwwg..', '...gwwwwg...', '....gggg....', '...b....b...', '..bbbbbbbb..', '............', '............'], { g: '#3a5a3a', G: '#8ac85a', w: '#e8e0c8', b: '#a87a48' }),
  calligraphy_set: GI(['.........k..', '........kk..', '.......kk...', '......kk....', '.....bb.....', '....bb......', '..rrrrrrrr..', '..rwwwwwwr..', '..rwkwkwwr..', '..rrrrrrrr..', '............', '............'], { k: '#2a1a10', b: '#c8a070', r: '#c8302a', w: '#f8f0e0' }),
  knitting_kit: GI(['..k......k..', '...k....k...', '....k..k....', '...ppppp....', '..pPppppp...', '..pppPppp...', '..ppppppp...', '...ppppp....', '....ppp.....', '............', '............', '............'], { k: '#c8c4d8', p: '#e8508a', P: '#ff9ac8' }),
  maracas: GI(['..oo....yy..', '.oOoo..yYyy.', '.oooo..yyyy.', '..oo....yy..', '...k....k...', '...k....k...', '....k..k....', '....k..k....', '............', '............', '............', '............'], { o: '#ff8a1e', O: '#ffd08a', y: '#ffd04a', Y: '#fff0a0', k: '#8a5a2a' }),
  luchador_mask: GI(['...rrrrrr...', '..rrrrrrrr..', '.rryyrryyrr.', '.rywwyywwyr.', '.rywkyywkyr.', '.rryyrryyrr.', '.rrrryyrrrr.', '..rrrkkrrr..', '...rrrrrr...', '............', '............', '............'], { r: '#d8302a', y: '#ffd04a', w: '#ffffff', k: '#141018' }),
  beach_paperback: GI(['............', '.bbbbbbbb...', '.byyyyyyb...', '.bysssssbw..', '.bysoosbw...', '.byyyyyybw..', '.bkkkkkkbw..', '.bbbbbbbbw..', '..wwwwwwww..', '............', '............', '............'], { b: '#2ec4c9', y: '#ffd36a', s: '#ff9e5e', o: '#ff5f7a', k: '#2a2434', w: '#f8f0e0' }),
  fashion_mag: GI(['............', '.pppppppp...', '.pwwwwwwp...', '.pwkkwwwp...', '.pwkkwwwp...', '.pwwwpppp...', '.pyyyyyyp...', '.pppppppp...', '............', '............', '............', '............'], { p: '#ff5fa2', w: '#f8f0e0', k: '#7a5a48', y: '#ffd36a' }),
  energy_drink: GI(['....kkkk....', '....gggg....', '...gggggg...', '...gyyyyg...', '...gyGGyg...', '...gyyyyg...', '...gggggg...', '...gggggg...', '....kkkk....', '............', '............', '............'], { k: '#c8c4d8', g: '#3aa04a', G: '#9ff3a8', y: '#ffd04a' }),
  surf_wax: GI(['............', '...wwwwww...', '..wbbbbbbw..', '..wbBBBbbw..', '..wbbbbbbw..', '..wwwwwwww..', '...kkkkkk...', '............', '............', '............', '............', '............'], { w: '#f8f0e0', b: '#2ec4c9', B: '#9ff3e8', k: '#8a7a68' }),
  sunscreen: GI(['.....kk.....', '....wwww....', '....wwww....', '...oooooo...', '...owwwwo...', '...owyywo...', '...owyywo...', '...owwwwo...', '...oooooo...', '............', '............', '............'], { k: '#3a3a3a', w: '#f8f8f8', o: '#ff8a1e', y: '#ffd04a' }),
  foam_finger: GI(['.....bb.....', '.....bb.....', '.....bb.....', '...bbbbbb...', '..bbBBBbbb..', '..bbbbbbbb..', '..bbbbbbbb..', '...bbbbbb...', '....bbbb....', '....kkkk....', '............', '............'], { b: '#3a6ad8', B: '#9fc0ff', k: '#ffd04a' }),
  glitter_sandals: GI(['............', '............', '..p.....p...', '.pyp...pyp..', '.wwwww.wwwww', 'wwWwwwwwWwww', '.wwwww.wwwww', '............', '............', '............', '............', '............'], { p: '#ff5fa2', y: '#ffd36a', w: '#f0c8e8', W: '#ffffff' }),
  gold_hoops: GI(['............', '..y......y..', '..y......y..', '.yYy....yYy.', 'y...y..y...y', 'y...y..y...y', 'y...y..y...y', '.yyy....yyy.', '............', '............', '............', '............'], { y: '#e8a020', Y: '#fff6c0' })
};

/* ---- the shops (all on the Fortuna Promenade) ---- */
G.SHOPS = {
  riptide: { id: 'riptide', name: 'Riptide Sports', keeper: 'bo', color: '#3a6ad8', sign: '#ffd04a', tabs: ['Swimsuits', 'Accessories', 'Gifts'] },
  coral: { id: 'coral', name: 'Coral Couture', keeper: 'odette', color: '#ff8aa8', sign: '#ffffff', tabs: ['Swimsuits', 'Accessories', 'Gifts'] },
  sundries: { id: 'sundries', name: 'Sundries & Smiles', keeper: 'kai', color: '#2fb5a0', sign: '#ffd36a', tabs: ['Food & Drink', 'Goods & Books', 'Accessories'] }
};
/** what a shop sells on a day: [{ item, tab }] (the luchador mask and day items arrive on their day) */
G.shopStock = (shop, day) => {
  const out = [];
  const add = (it, tab) => { if ((it.day || 1) <= day) out.push({ item: it, tab }); };
  if (shop === 'sundries') {
    for (const id of G.GIFT_IDS) { const g = G.GIFTS[id]; if (g.where === 'sundries') add(g, g.cat === 'food' ? 0 : 1); }
    for (const id of G.ACC_IDS) if (G.ACCS[id].where === 'sundries') add(G.ACCS[id], 2);
  } else {
    for (const id of G.SUIT_IDS) if (G.SUITS[id].where === shop) add(G.SUITS[id], 0);
    for (const id of G.ACC_IDS) if (G.ACCS[id].where === shop) add(G.ACCS[id], 1);
    for (const id of G.GIFT_IDS) if (G.GIFTS[id].where === shop) add(G.GIFTS[id], 2);
  }
  return out;
};
G.itemById = id => G.SUITS[id] || G.ACCS[id] || G.GIFTS[id] || null;
G.ITEM_COUNTS = () => ({ suits: G.SUIT_IDS.length, accs: G.ACC_IDS.length, gifts: G.GIFT_IDS.length });


/* ---- 04-data-world.js ---- */
/* 04-data-world: the walkable places as data: each a TileMap built from a cell function (floor tags, walls), its floor
 * textures, the shapes and props that dress it (solid ones block walkers), NPC spots, interactables, exits, music and
 * ambience; and the island map's pins. Adding a place is a new entry here. */
const FT = {
  sand: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5, g = 236 + n * 26 + m * 22; return [g, g * .9, g * .68]; },
  sea: (x, y, d) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, k = clamp(d, 0, 1), c = E.hex(E.mix('#0b5a7a', '#2ec4c9', k)); return [c[0] + n * 12, c[1] + n * 12, c[2] + n * 12]; },
  pool: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, w = Math.sin(x * .21 + Math.sin(y * .09) * 2.2) + Math.sin(y * .17 + Math.sin(x * .07) * 2), line = Math.abs(w) < .12; return line ? [168, 240, 244] : [52 + n * 6 + w * 6, 178 + n * 8 + w * 10, 206 + w * 8]; },   // caustic lines on blue
  tile: (x, y) => { const gx = Math.floor(x) % 8, gy = Math.floor(y) % 8, n = E.hash2(Math.floor(x / 8), Math.floor(y / 8)) * 14; return gx === 0 || gy === 0 ? [188, 222, 224] : [226 - n, 244 - n * .5, 240]; },
  grass: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .08, y * .08) * .5; return [70 + n * 24 + m * 20, 160 + n * 30 + m * 26, 80 + n * 20]; },
  boards: (x, y) => { const row = Math.floor(y / 6), off = (row % 3) * 9, seam = Math.floor(y) % 6 === 0 || (Math.floor(x + off) % 28 === 0), n = E.hash2(row, Math.floor((x + off) / 28)) * 18 - 9, g = E.hash2(Math.floor(x), Math.floor(y)) * 10; return seam ? [150, 128, 100] : [214 + n + g, 196 + n + g, 166 + n + g]; },
  planks: (x, y) => { const row = Math.floor(y / 5), off = (row % 4) * 11, seam = Math.floor(y) % 5 === 0 || (Math.floor(x + off) % 32 === 0), n = E.hash2(row, Math.floor((x + off) / 32)) * 16 - 8; return seam ? [120, 76, 48] : [196 + n, 138 + n, 90 + n * .6]; },
  carpet: (x, y) => { const u = ((Math.floor(x) + Math.floor(y)) % 16 + 16) % 16, v = ((Math.floor(x) - Math.floor(y)) % 16 + 16) % 16, d = u === 0 || v === 0, c = (Math.floor((x + y) / 16) + Math.floor((x - y) / 16)) % 2 === 0; return d ? [212, 170, 70] : c ? [112, 26, 66] : [86, 18, 52]; },
  rug: (x, y) => { const k = Math.floor(y / 4) % 3; return k === 0 ? [255, 158, 94] : k === 1 ? [255, 248, 232] : [46, 196, 201]; },
  dock: (x, y) => { const seam = Math.floor(x) % 5 === 0, n = E.hash2(Math.floor(x / 5), 1) * 20 - 10; return seam ? [96, 70, 46] : [168 + n, 130 + n, 92 + n]; }
};
G.FLOOR_TEX = FT;
/** build a location's TileMap from cell(cx, cy) -> a legend char */
const mkMap = (W, H, cell, legend, types, floorTex, outside = false) => {
  const rows = []; for (let cy = 0; cy < H; cy++) { let s = ''; for (let cx = 0; cx < W; cx++) s += cell(cx, cy); rows.push(s); }
  return () => new E.TileMap({ rows, legend, types: types || {}, floorTex, outside, ao: 4 });
};
const SEA_DEPTH = (y, y0, y1) => clamp((y - y0) / (y1 - y0), 0, 1);
G.LOCS = {
  beach: {
    name: 'Sunset Courts', open: [0, 1], music: 'island', amb: 'beach', sky: true, start: [352, 400], exit: { y1: 436 },
    map: () => G.courtMap,
    solids: [['tikibar', 120, 210], ['lifeguard', 600, 170], ['changinghut', 70, 300], ['djbooth', 352, 132], ['bleacher', 256, 148, { params: { len: 52, color: '#2ec4c9' } }], ['bleacher', 448, 148, { params: { len: 52, color: '#ff9e5e' } }]],
    spots: [{ x: 104, y: 234, kind: 'stool' }, { x: 120, y: 234, kind: 'stool' }, { x: 136, y: 234, kind: 'stool' }, { x: 584, y: 252, kind: 'lounger' }, { x: 612, y: 254, kind: 'lounger' }, { x: 300, y: 114, kind: 'shore' }, { x: 420, y: 112, kind: 'shore' }, { x: 300, y: 240, kind: 'practice', pair: 0 }, { x: 404, y: 240, kind: 'practice', pair: 1 }],
    acts: [{ id: 'board', kind: 'board', x: 196, y: 330, label: 'Match Board' }, { id: 'hut', kind: 'wardrobe', x: 70, y: 322, label: 'Changing Hut' }, { id: 'bar', kind: 'bar', x: 120, y: 236, label: 'Tiki Tok Bar', hidden: true }],
    staff: [['kai', 120, 196, Math.PI / 2]], partnerSpot: [210, 340]
  },
  pool: {
    name: 'Lagoon Pool', open: [0, 1], music: 'lagoon', amb: 'pool', sky: false, start: [240, 320], exit: { y1: 346 },
    map: mkMap(30, 22, (cx, cy) => { if (cy < 2) return '#'; const inPool = (cx - 15) * (cx - 15) / 70 + (cy - 10) * (cy - 10) / 22 < 1 || (cx >= 22 && cx <= 27 && cy >= 7 && cy <= 13); if (inPool) return 'w'; if (cx < 2 || cx > 27 || cy > 18) return 'g'; return '.'; },
      { '#': 1, w: { floor: 'pool', block: true }, g: { floor: 'grass' }, '.': { floor: 'tile' } }, { 1: { h: 22, face: 'hedge', roof: 'leaves', top: '#3a8a4a', side: '#2f6a3a' } },
      (x, y, tag) => tag === 'pool' ? FT.pool(x, y) : tag === 'grass' ? FT.grass(x, y) : FT.tile(x, y), '#3a8a4a'),
    solids: [['cabana', 70, 80], ['lounger', 120, 290, { params: { color: '#ffd04a' } }], ['lounger', 150, 292, { params: { color: '#ff5f7a' } }], ['lounger', 330, 296, { params: { color: '#2ec4c9' } }], ['changinghut', 430, 80]],
    deco: [['flamingo', 230, 160, 'float'], ['poolfloat', 290, 190, 'float'], ['deckchair', 380, 300, null, { params: { color: '#ff9e5e' } }]],
    props: [['palm', 30, 60, 1.6], ['palm', 452, 300, 1.7], ['palm', 24, 300, 1.5], ['palm', 460, 120, 1.6], ['torch', 200, 90, 1.3], ['torch', 330, 90, 1.3], ['flowers', 60, 200, 1]],
    spots: [{ x: 210, y: 170, kind: 'swim' }, { x: 270, y: 150, kind: 'swim' }, { x: 120, y: 294, kind: 'lounger' }, { x: 150, y: 296, kind: 'lounger' }, { x: 330, y: 298, kind: 'lounger' }, { x: 160, y: 232, kind: 'edge' }, { x: 300, y: 252, kind: 'edge' }, { x: 60, y: 104, kind: 'stool' }, { x: 84, y: 104, kind: 'stool' }],
    acts: [{ id: 'hop', kind: 'poolhop', x: 400, y: 228, label: 'Pool Hop deck' }, { id: 'hut', kind: 'wardrobe', x: 430, y: 104, label: 'Changing Hut' }],
    staff: [], partnerSpot: [260, 300]
  },
  promenade: {
    name: 'Fortuna Promenade', open: [0, 1], music: 'island', amb: 'promenade', sky: true, start: [288, 200], exit: { x0: 8, x1: 568 },
    map: mkMap(36, 16, (cx, cy) => cy < 3 ? '#' : cy >= 14 ? 'w' : cy === 13 ? 'r' : '.', { '#': 1, w: { floor: 'sea', block: true }, r: 2, '.': { floor: 'boards' } },
      { 1: { h: 40, face: 'plaster', roof: 'tiles', top: '#e85a4a', side: '#f4ecd8' }, 2: { h: 8, face: 'plank', top: '#e8d8b8', side: '#a88a62' } },
      (x, y, tag) => tag === 'sea' ? FT.sea(x, y, SEA_DEPTH(y, 256, 224)) : FT.boards(x, y), '#0b5a7a'),
    shops: [['riptide', 112, 56], ['coral', 288, 56], ['sundries', 464, 56]],
    solids: [['icecreamcart', 380, 150], ['bench', 200, 196], ['bench', 520, 196], ['planter', 40, 70], ['planter', 200, 66], ['planter', 376, 66], ['planter', 536, 70]],
    props: [['streetlamp', 140, 190, 1.4], ['streetlamp', 430, 190, 1.4], ['flowers', 248, 70, 1]],
    spots: [{ x: 200, y: 186, kind: 'bench' }, { x: 520, y: 186, kind: 'bench' }, { x: 112, y: 90, kind: 'window' }, { x: 300, y: 90, kind: 'window' }, { x: 470, y: 90, kind: 'window' }, { x: 356, y: 156, kind: 'cart' }],
    acts: [{ id: 'riptide', kind: 'shop', shop: 'riptide', x: 112, y: 76, label: 'Riptide Sports' }, { id: 'coral', kind: 'shop', shop: 'coral', x: 288, y: 76, label: 'Coral Couture' }, { id: 'sundries', kind: 'shop', shop: 'sundries', x: 464, y: 76, label: 'Sundries & Smiles' }],
    staff: [], partnerSpot: [300, 210]
  },
  villa: {
    name: 'Your Villa', open: [0, 1, 2], music: 'siesta', amb: 'villa', sky: true, start: [112, 150], exit: { y1: 222 }, zoom: 1.4,
    map: mkMap(14, 14, (cx, cy) => cy < 2 ? '#' : (cx === 0 || cx === 13) && cy < 10 ? '#' : cy === 10 && (cx < 5 || cx > 8) ? 'k' : cy >= 12 ? 'w' : cy >= 10 ? 'b' : (cx >= 4 && cx <= 9 && cy >= 5 && cy <= 8) ? 'u' : '.',
      { '#': 1, k: 2, w: { floor: 'sea', block: true }, b: { floor: 'deck' }, u: { floor: 'rug' }, '.': { floor: 'planks' } },
      { 1: { h: 34, face: 'plaster', roof: 'slab', top: '#f4ecd8', side: '#e8dcc0', cut: true, cutH: 6 }, 2: { h: 8, face: 'plank', top: '#e8d8b8', side: '#a88a62' } },
      (x, y, tag) => tag === 'sea' ? FT.sea(x, y, SEA_DEPTH(y, 224, 192)) : tag === 'rug' ? FT.rug(x, y) : tag === 'deck' ? FT.boards(x, y) : FT.planks(x, y), '#0b5a7a'),
    solids: [['bed', 52, 60], ['wardrobe', 190, 44], ['desk', 150, 46]],
    props: [['flowers', 30, 140, .9], ['lamp', 24, 44, 1.1]],
    deco: [['rug', 112, 110, null, { params: { color: '#ff9e5e' } }]],
    spots: [{ x: 160, y: 130, kind: 'stand' }],
    acts: [{ id: 'bed', kind: 'bed', x: 52, y: 84, label: 'Bed' }, { id: 'closet', kind: 'wardrobe', x: 190, y: 64, label: 'Closet' }, { id: 'desk', kind: 'journal', x: 150, y: 66, label: 'Desk' }, { id: 'frame', kind: 'album', x: 96, y: 40, label: 'Album' }, { id: 'mail', kind: 'mail', x: 200, y: 168, label: 'Mailbox' }],
    staff: [], partnerSpot: null
  },
  casino: {
    name: 'Casino Fortuna', open: [2], music: 'neon', amb: 'casino', sky: false, start: [240, 290], exit: { y1: 312 }, night: true, zoom: 1.2,
    map: mkMap(30, 20, (cx, cy) => cy < 2 || cx === 0 || cx === 29 ? '#' : '.', { '#': 1, '.': { floor: 'carpet' } }, { 1: { h: 44, face: 'plaster', roof: 'slab', top: '#3a1030', side: '#5a1a48', cut: true, cutH: 8 } }, (x, y) => FT.carpet(x, y), '#12081e'),
    solids: [['cashier', 100, 42], ['prizecounter', 240, 40], ['bjtable', 150, 180], ['roulettetable', 340, 180], ['velvetrope', 400, 92], ['velvetrope', 440, 92]],
    slots: [[40, 90], [40, 130], [40, 170], [40, 210], [40, 250], [80, 250]],
    props: [['chandelier', 160, 120, 1.4], ['chandelier', 330, 120, 1.4], ['palm', 452, 280, 1.4], ['palm', 24, 290, 1.3]],
    spots: [{ x: 56, y: 100, kind: 'slots' }, { x: 56, y: 180, kind: 'slots' }, { x: 92, y: 236, kind: 'slots' }, { x: 340, y: 210, kind: 'rail' }, { x: 368, y: 208, kind: 'rail' }, { x: 220, y: 270, kind: 'stand' }, { x: 260, y: 270, kind: 'stand' }],
    acts: [{ id: 'cashier', kind: 'cashier', x: 100, y: 66, label: 'Cashier' }, { id: 'slots', kind: 'slots', x: 64, y: 150, label: 'Fortuna Sevens' }, { id: 'bj', kind: 'blackjack', x: 150, y: 210, label: 'Blackjack' }, { id: 'roul', kind: 'roulette', x: 340, y: 216, label: 'Roulette' }, { id: 'prize', kind: 'prize', x: 240, y: 62, label: 'Prize Counter' }, { id: 'vip', kind: 'vip', x: 420, y: 70, label: 'VIP Lounge' }],
    staff: [['pepper', 150, 156, Math.PI / 2], ['kai', 300, 180, 0]], partnerSpot: [260, 290]
  },
  dock: {
    name: 'The Dock', open: [], music: 'island', amb: 'beach', sky: true, start: [192, 150],
    map: mkMap(24, 14, (cx, cy) => (cx >= 8 && cx <= 15 && cy >= 4) || (cy >= 9 && cy <= 12) ? '.' : 'w', { w: { floor: 'sea', block: true }, '.': { floor: 'dock' } }, {}, (x, y, tag) => tag === 'sea' ? FT.sea(x, y, .3 + .5 * Math.sin(x * .01)) : FT.dock(x, y), '#0b5a7a'),
    deco: [['seaplane', 300, 90, null, { facing: Math.PI }], ['crate', 140, 170, null], ['barrel', 160, 180, null]],
    props: [['banner', 132, 70, 1.3], ['banner', 252, 70, 1.3], ['torch', 130, 150, 1.2], ['torch', 254, 150, 1.2]],
    spots: [{ x: 150, y: 190, kind: 'stand' }, { x: 175, y: 196, kind: 'stand' }, { x: 210, y: 196, kind: 'stand' }, { x: 235, y: 190, kind: 'stand' }, { x: 192, y: 176, kind: 'stand' }],
    acts: [], staff: [], partnerSpot: null
  }
};
/* ---- the island map: an iso view of Isla Fortuna and its pins ---- */
G.ISLAND = {
  W: 48, H: 36,
  cell(cx, cy) {
    const dx = (cx - 24) / 21, dy = (cy - 18) / 15, d = Math.sqrt(dx * dx + dy * dy) + Math.sin(cx * .7) * .04 + Math.cos(cy * .9) * .04;
    if (d > 1) return 'w'; if (d > .9) return 's';
    const vx = cx - 30, vy = cy - 11, vd = Math.sqrt(vx * vx + vy * vy);
    if (vd < 2) return 'c'; if (vd < 3.4) return '3'; if (vd < 5) return '2'; if (vd < 6.6) return '1';
    if ((cx - 17) * (cx - 17) + (cy - 22) * (cy - 22) < 7) return 'p';
    return E.hash2(cx, cy) > .82 ? 't' : 'g';
  },
  pins: [
    { id: 'beach', x: 16 * 22, y: 16 * 29, label: 'Sunset Courts' }, { id: 'pool', x: 16 * 17, y: 16 * 22, label: 'Lagoon Pool' },
    { id: 'promenade', x: 16 * 30, y: 16 * 25, label: 'Fortuna Promenade' }, { id: 'villa', x: 16 * 10, y: 16 * 16, label: 'Your Villa' },
    { id: 'casino', x: 16 * 36, y: 16 * 18, label: 'Casino Fortuna' }, { id: 'dock', x: 16 * 40, y: 16 * 28, label: 'The Dock', greyed: 'Departures only' }
  ]
};


/* ---- 05-data-text.js ---- */
/* 05-data-text: every line of the game. Short, upbeat and a little cheesy; Sonny in ALL-CAPS bursts with nicknames and
 * casino metaphors; Pepper dry, exact and never with an exclamation mark. No innuendo: the jokes come from fighting
 * backgrounds and vacation mishaps. G.pickLine(who, key, vars) picks one on the cosmetic stream ({name} etc. filled). */
G.LINES = {
  rin: {
    greet: ['Good morning. The sand is... adequate.', 'Ah. You again. I mean that kindly.', 'There you are. I saved you some shade.'],
    chatLow: ['I practice my swing at dawn. The sea does not judge.', 'Volleyball is just kendo with more sand in your shoes.'],
    chatMid: ['I bought a tiny keychain at the pier. It is a crab. His name is Sir Pinch.', 'You read the ball well. Like a blade before the cut.'],
    chatHigh: ['I told my sensei I was "training." I am eating mochi in a hammock.', 'With you on the court, I almost relax. Almost.'],
    love: ['...It is so round. I will name him Admiral.', 'This is perfect. I will not cry. I am simply... humid.'],
    like: ['How thoughtful. Thank you.', 'A fine choice. I approve.'],
    neutral: ['Thank you. I will find a use for it.'],
    refuse: ['My heart rate is fine as it is. Thank you.', 'I must decline. It does not suit my... discipline.'],
    suitYes: ['A graceful cut. I will wear it with honor.'], suitNo: ['It is lovely. It is simply not me.'],
    inviteYes: ['Very well. Let us be precise together.', 'Partners. I accept. Do not make me regret it.'],
    inviteNo: ['Not yet. Trust takes more than a sunny afternoon.', 'I am not ready to share a court with you.'],
    leaveTeam: ['I am sorry. My path goes with yours now.'],
    taunt: ['Your stance is open. So is your defeat.', 'I have already seen how this ends.'],
    win: ['A clean finish. As expected.', 'Good. We were in harmony.'], lose: ['I will reflect on this. Deeply.', 'The sand was against me. And them.'],
    bark: ['Hai!', 'Clean.'], partnerBark: ['Mine.', 'Leave it to me.'],
    visit: ['I found these mochi at the market. Too many for one.', 'Do you think discipline can be... a vacation?', 'Discipline is rest done properly.', 'Vacations are for losing yourself.'],
    farewellLow: ['Farewell. Mind your footwork.'], farewellHigh: ['I will write to you. Properly. With a brush.'], ending: ['Next summer, I bring my own mochi.']
  },
  lola: {
    greet: ['¡Hola, compañera! Ready to bring the THUNDER?', 'Oye! The champ of the beach walks by!', 'There she is! My favorite tag-team partner!'],
    chatLow: ['In the ring they call me La Tormenta. Here they call me "sunburnt."', 'I did a flying elbow off a lounger. The lifeguard was not impressed.'],
    chatMid: ['My abuela says the crowd is the real opponent. She was a luchadora too!', 'Volleyball is like wrestling. Somebody always hits the sand.'],
    chatHigh: ['You and me? Tag team champions of the WORLD. I can feel it.', 'Promise you will come to one of my matches. Front row. I will wave.'],
    love: ['THIS! This is the fuel of champions!', '¡Qué maravilla! I am going to cry! Wrestlers cry, it is fine!'],
    like: ['Oh, nice! You know me!', 'Ha! Good pick, compañera!'],
    neutral: ['Gracias! I will put it somewhere.'],
    refuse: ['A book? On vacation? Ay, you are funny.', 'No, no, no. That is not my style at all.'],
    suitYes: ['LOOK AT ME! I am a whole highlight reel!'], suitNo: ['Too quiet for La Tormenta, amiga.'],
    inviteYes: ['YES! The tag team is BORN!', '¡Vamos! We are going to be legends!'],
    inviteNo: ['Ha! You need more muscle first. Come back later!', 'Not today, compañera. I am still sizing you up.'],
    leaveTeam: ['Sorry, partner. A better offer came off the top rope.'],
    taunt: ['I am going to body slam that ball into next week!', 'Hope you stretched. This is going to hurt!'],
    win: ['¡VICTORIA! Somebody ring the bell!', 'And the crowd goes WILD! That is me. I am the crowd.'], lose: ['Ay! Rematch! I demand a rematch!', 'The bell rang too early. That is my story.'],
    bark: ['¡VAMOS!', 'BOOM!'], partnerBark: ['MINE! MINE! MINE!', 'Coming through!'],
    visit: ['I brought tacos! The kitchen did not want to give them up.', 'Do you ever get scared of the big crowds?', 'Never! The crowd is family!', 'Sometimes. That is why I yell louder.'],
    farewellLow: ['Adiós! Watch for me on TV!'], farewellHigh: ['You are family now. Familia does not say goodbye!'], ending: ['Next year I bring the whole wrestling federation!']
  },
  ingrid: {
    greet: ['It is thirty-one degrees. I am melting. Hello.', 'Hello. I am standing in the shade on purpose.', 'You. Good. I was hoping it was you.'],
    chatLow: ['In Norway this is called "a fever."', 'I wore three layers of sunscreen. I am a ghost now.'],
    chatMid: ['Glíma is wrestling with belts. Volleyball is wrestling with gravity.', 'I sang at the karaoke bar last night. Do not tell anyone.'],
    chatHigh: ['I am starting to like this island. Do not repeat that.', 'If you ever visit Norway, I will show you real weather.'],
    love: ['Snow. Tiny, perfect snow. I may cry.', 'This... this is very kind. I am not melting. It is my eyes.'],
    like: ['Practical. I like that.', 'Thank you. That is sensible.'],
    neutral: ['Hm. Thank you.'],
    refuse: ['Glitter gets everywhere. Everywhere.', 'No. I have standards and they are cold.'],
    suitYes: ['Sporty and sensible. I will wear it.'], suitNo: ['I would rather wear a parka.'],
    inviteYes: ['Agreed. I will block. You will be glad.', 'Fine. Partners. Keep up.'],
    inviteNo: ['I prefer to know someone before I trust them with my spikes.', 'No. Ask me again when it is cooler.'],
    leaveTeam: ['I am changing teams. It is nothing personal. It is strategic.'],
    taunt: ['I am a glacier. You are a beach towel.', 'Your serve will not melt me.'],
    win: ['Expected.', 'Cold. Clean. Correct.'], lose: ['I blame the heat.', 'Hmph. Again. Tomorrow. When it is cloudy.'],
    bark: ['Blocked.', 'Ha.'], partnerBark: ['Mine.', 'Wall.'],
    visit: ['I brought iced coffee. It is the only cold thing on this island.', 'Do you like the heat?', 'I love it.', 'It is fine in the shade.'],
    farewellLow: ['Goodbye. Wear a hat.'], farewellHigh: ['You are... a good friend. I will sing for you. Not now.'], ending: ['I am going home to stand in the snow.']
  },
  amara: {
    greet: ['Hey hey! You hear that? The ocean has rhythm!', 'Babe! Look at you! Beach glow is REAL!', 'My favorite person just walked in! Hi!'],
    chatLow: ['Capoeira is fighting that thinks it is a dance. Or the other way round!', 'I made a playlist for this island. It is called "Sand in My Soul."'],
    chatMid: ['Every match needs a soundtrack. I hum ours while we play!', 'I tried on eleven swimsuits today. Bought none. I am growing!'],
    chatHigh: ['You are like my favorite song. I could play you on repeat!', 'When we win the Cup, we are doing a dance. I already choreographed it.'],
    love: ['Okay. The party starts NOW.', 'Stop it! STOP IT! I love this so much!'],
    like: ['Ooh, cute! Thank you!', 'You have taste, babe!'],
    neutral: ['Aw, thanks! I will find a spot for it.'],
    refuse: ['Snow? Babe, we are in paradise.', 'Hmm, no. That does not spark joy.'],
    suitYes: ['A LOOK! This is a LOOK!'], suitNo: ['Cute, but it is not singing to me.'],
    inviteYes: ['Partners! Let us make some noise!', 'YES! Dream team! Matching sunglasses!'],
    inviteNo: ['Aww, not yet! Let us vibe a little more first.', 'Maybe later, okay? I have a feeling!'],
    leaveTeam: ['Sorry, sorry! My heart picked a new duet.'],
    taunt: ['Hope you can dance, because I am leading!', 'This beat is too fast for you!'],
    win: ['And that is the drop!', 'Encore! Encore!'], lose: ['Okay, okay. Sad song. But a short one.', 'We will remix that one.'],
    bark: ['Yesss!', 'Woo!'], partnerBark: ['I got it!', 'Mine, babe!'],
    visit: ['I brought my speaker! Tiny dance party?', 'Do you dance?', 'All the time!', 'Only when no one is looking.'],
    farewellLow: ['Byeee! Stay groovy!'], farewellHigh: ['You are my best duet partner. Forever. Call me!'], ending: ['I am writing a song about this island!']
  },
  tess: {
    greet: ["G'day! Waves are pumping, sun's out. Life's good, yeah?", 'Oi! There you are! Fancy a hit?', "Mate! Best part of my day, seeing you."],
    chatLow: ['I surfed at dawn. Got dumped twice. Ten out of ten.', 'In MMA you learn to fall. Same on sand. Just softer.'],
    chatMid: ["Reckon Sonny's got a shark in that pool? Asking for a friend.", "I'll race you to the water. Loser buys coconuts."],
    chatHigh: ["You're good people. Proper good.", "When this is over, come surf with me. I'll teach you."],
    love: ['Ohhh, the good stuff! My board says thanks.', 'You absolute legend!'],
    like: ['Beauty! Cheers!', 'Nice one, mate.'],
    neutral: ["Ta. That'll do."],
    refuse: ['Mate, I can barely write my own name.', "Nah, that's not really me."],
    suitYes: ['Ripper of a suit! Wearing it now!'], suitNo: ["Bit fancy for me, mate."],
    inviteYes: ['Partners? Too right!', "Let's go, mate! Easy as!"],
    inviteNo: ["Nah, not yet. Show me what you've got first.", "Maybe later, yeah? No hard feelings."],
    leaveTeam: ["Sorry, mate. Found a better wave."],
    taunt: ["Hope you're ready to eat sand!", "I've been dumped by bigger waves than you."],
    win: ['Get in! Great game!', 'Good match, yeah? Shake on it.'], lose: ['Fair play. You earned it.', 'Cracker of a game. Next time though.'],
    bark: ['Sweet!', 'Yeew!'], partnerBark: ['Mine, mate!', 'Got it!'],
    visit: ['Brought snags. Barbecue is closed, so I improvised.', 'Ever tried surfing?', 'Loads!', 'Never. Teach me?'],
    farewellLow: ["Hooroo! Catch ya."], farewellHigh: ["You're a legend. Come visit. My couch is yours."], ending: ["I'm going to surf until my arms fall off."]
  },
  mei: {
    greet: ['Hehe. Bet you cannot beat me at anything today.', 'Boo! Did I scare you? I did. Admit it.', 'Yay, you are here! Now the day is fun.'],
    chatLow: ['I beat Sonny at xiangqi in four moves. He paid me in ice cream.', 'I hid a rubber crab in Ingrid’s sandal. Shh.'],
    chatMid: ['Wushu is flying. Volleyball is flying with a ball. Easy!', 'I am the smallest, so they underestimate me. Mistake!'],
    chatHigh: ['You are the only one who laughs at my pranks. Best friend!', 'If you ever lose, I will prank the winner for you.'],
    love: ['Solved it. Twice. Got another?', 'Mochi! You know the way to my heart!'],
    like: ['Hehe, nice!', 'Ooh, I like this!'],
    neutral: ['Thanks! I guess!'],
    refuse: ['I do not eat things on sticks that used to have faces.', 'Ew. No. Pass.'],
    suitYes: ['So cute! I am wearing it right now!'], suitNo: ['Hmm, not cute enough. Sorry!'],
    inviteYes: ['Partners! We will win and then I will gloat!', 'Okay! But I get to do the victory flip!'],
    inviteNo: ['Nope! Win my trust first. Hehe.', 'Not yet. Bring snacks next time.'],
    leaveTeam: ['Bye, old partner! New team, new pranks!'],
    taunt: ['I am small but I am FAST!', 'You will not even see me coming. Hehe!'],
    win: ['Hehe! Told you!', 'Victory flip!'], lose: ['No fair! Rematch! Now!', 'I was letting you win. Obviously.'],
    bark: ['Hehe!', 'Ha!'], partnerBark: ['Mine! Mine!', 'Leave it!'],
    visit: ['I brought mochi! I only ate half of them.', 'Want to hear my best prank?', 'Always!', 'Only if it is not on me.'],
    farewellLow: ['Bye! Do not forget me!'], farewellHigh: ['Best friends forever! That is a binding contract!'], ending: ['Next summer I am pranking Sonny. Big time.']
  },
  sonny: {
    matchIntro: ['LADIES AND GENTLEMEN! {a} AGAINST {b}! Place your bets!', 'IT IS SHOWTIME ON SUNSET COURTS, SUNSHINE!', 'Two teams. One ball. INFINITE TAN.'],
    finalIntro: ['THE FORTUNA CUP FINAL! And yes, I am in it. Of COURSE I am in it.', 'Welcome to THE HOUSE, champs. The house ALWAYS wins.'],
    ace: ['ACE! That serve had TAXES on it!', 'ACE! Nobody touched it! Not even the wind!', 'ACE! Somebody check that ball for jet engines!'],
    kill: ['WHAT A SPIKE! Somebody call a lifeguard!', 'KILL! That ball is filing a complaint!', 'BOOM! {name} with the hammer!', 'POW! Right through the front door!'],
    bigSpike: ['That spike broke the SOUND BARRIER, folks!', 'I felt that one in my WALLET!'],
    block: ['BLOCKED! The wall is CLOSED for business!', 'DENIED! Return to sender!', 'STUFFED! Like a holiday turkey!'],
    out: ['OUT! So close, yet so very sandy.', 'Long! That ball wanted a vacation too.'],
    in: ['IN! The sand says yes!', 'Down it goes! Point!'],
    fault: ['FAULT! The ref has spoken. The ref is me.', 'Oof. Rules are rules, CHAMP.'],
    serveFault: ['Into the net! The net thanks you for your donation.', 'Serve fault! Happens to the best of us. Mostly me.'],
    netCord: ['OFF THE TAPE AND OVER! Lady Luck is on the line!', 'Net cord! I LIVE for this!'],
    longRally: ["Long rally, folks. I'm getting a tan just WATCHING.", 'This rally has been going so long I aged!', 'Back and forth! Like my stock portfolio!'],
    matchPoint: ["MATCH POINT! I can't look! ...I'm looking.", 'MATCH POINT! All in! ALL IN!'],
    matchWin: ['WINNERS! {team} take it! Somebody pour the smoothies!', 'GAME, SET, JACKPOT! {team} WIN!'],
    matchLose: ['Tough break, SUNSHINE! The house has noticed. Try again!', 'Down but not out! Spin again tomorrow!'],
    glare: ['FEEL THE GLARE!', 'GOLDEN GLARE! Shield your eyes, SUNSHINE!'],
    pa: ['ATTENTION ISLA FORTUNA! Smoothies are HALF PRICE for the next five minutes!', 'Reminder: the casino is open. ALWAYS. Even now.', 'Has anyone seen my second pair of golden sunglasses? Asking for me.'],
    rainPA: ['LIQUID SUNSHINE, PEOPLE! The matches go on!'],
    welcome: ['WELCOME, FIGHTERS, TO ISLA FORTUNA! The tournament of the century is... drumroll... BEACH VOLLEYBALL!', "And a VACATION! You're welcome!"],
    tutorialLose: ['I let you win! It was a DEMONSTRATION! Of... generosity!'],
    casinoHello: ['CHAMP! Welcome to CASINO FORTUNA! Twenty chips, on the house!', 'Slots, blackjack, roulette. The house always wins. I am the house!'],
    phone: ['...Yeah, I put the island on the Cup. What could go wrong?'],
    dayStart: ['GOOD MORNING, ISLA FORTUNA! Another day in PARADISE!', 'RISE AND SHINE, CHAMPS! The sun is up and so are the stakes!'],
    party: ['FAREWELL PARTY! Fireworks! Dancing! FREE SMOOTHIES! Okay, cheap smoothies!'],
    endingA: ["I'LL BE BACK... NEXT SUMMER!"], endingB: ['Double or nothing! One spin! For the ISLAND!']
  },
  pepper: {
    arrival: ["Villa keys. Sunscreen is in the minibar. The Cup is in five days. Mr. Fortuna is not taking questions.", "Please don't feed him."],
    rules: ['Each day has a morning, an afternoon and a night. Each visit uses one.', 'Win matches for Sonny Dollars. Spend them as you see fit. Within reason.'],
    quip: ['Statistically, that was unwise.', 'The house has noticed.', 'Noted.', 'That will be in my report.', 'The minibar is not free. Nothing here is free.'],
    houseEdge: ["The line is open. I'll take it.", 'Down the line. As planned.'],
    blackjack: ['Blackjack. Congratulations, I suppose.', 'Twenty-one. The house is mildly impressed.'],
    bust: ['Bust. The house thanks you.', 'Over. As predicted.'],
    dealer: ['Place your bet.', 'Cards are dealt with precision. Unlike your volleyball.'],
    seen: ['You heard that. Of course you did.'],
    kind: ['Thank you. That is... unexpectedly decent of you.'], cheeky: ['Then I will be very busy tomorrow.'],
    endingA: ['Breakfast is at eight. The island is under new management.'], endingB: ['The house always wins. I am the house.'],
    letterWelcome: ['Welcome to Isla Fortuna. Matches pay. Friends help. Gifts help friends. The casino helps no one.'],
    letterWarning: ["The Final is tomorrow. Mr. Fortuna's serve is... dazzling. Eyewear is advised. — P."],
    rumor: ['I hear you missed the casino last night. Pity. Mr. Fortuna said something remarkable. — P.']
  },
  kai: { shop: ['Aloha! Snacks, goods, good vibes.', 'Fresh coconuts. I climbed the tree myself.', 'Need a gift? I know everyone\'s favorite.', 'Mahalo! Come back soon.', 'That one is popular today.', 'Can\'t afford it? The sand is free.', 'Gifts are a good way to make friends here.', 'Roulette later? I spin a mean wheel.'],
    croupier: ['Place your chips. The wheel is waiting.', 'No more bets!', 'The ball has spoken.'] },
  odette: { shop: ['Bienvenue to Coral Couture, darling.', 'Fashion is armor with better colors.', 'That cut will turn heads on the court.', 'Ah, a classic. You have an eye.', 'Merci! Wear it proudly.', 'Non, non, darling. You cannot afford that one yet.', 'Try it on. The mirror never lies.', 'New pieces arrive every day. Keep coming back.'] },
  bo: { shop: ['Riptide Sports! Gear up or get dug up!', 'Hydrate. Stretch. Spike. In that order.', 'That suit will shave a tenth off your approach.', 'Back in my day we played in jean shorts.', 'Good buy, champ! Go get them.', 'Short on Sonny Dollars? Win a match, come back.', 'Sport Shades. Very popular this week. No reason.', 'Never trust a serve you cannot see.'] }
};
G.pickLine = (who, key, vars) => {
  const L = G.LINES[who] && G.LINES[who][key]; if (!L || !L.length) return '';
  let s = L[Math.floor(G.rng('cosmetic')() * L.length) % L.length];
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
};

/* ---- Pepper's tutorial tips: functions of the player's input, so the glyphs are the current device's ---- */
G.TUTORIAL_TIPS = {
  receive: I => 'The ring shows where the ball comes down. Stand in it. Press ' + G.btnName('play', I) + ' as the ball reaches you.',
  set: I => 'Your partner passed it to you. ' + G.btnName('play', I) + ' again as it drops, to set her up.',
  attack: I => "She set you. You'll jump on your own. " + G.btnName('play', I) + ' at the top. Push ' + G.btnName('move', I) + (I.lastDevice === 'mouse' ? ' or point the mouse' : '') + ' to aim.',
  free: I => 'Too low to spike. ' + G.btnName('play', I) + ' sends a free ball over.',
  serve: I => G.btnName('play', I) + ' to toss, ' + G.btnName('play', I) + ' again at the top of the toss. ' + G.btnName('shot', I) + ' tosses for a jump serve.',
  block: I => 'When they spike near the net, ' + G.btnName('shot', I) + ' to block.',
  dive: I => 'Out of reach? ' + G.btnName('dive', I) + ' dives.',
  chem: I => G.btnName('call', I) + ' calls "Mine!" or "Yours!". Your partner listens.',
  chemistry: () => 'The better you two get along, the better she plays. Chat. Bring gifts. Win.'
};
G.TUTORIAL_TIPS.dig = G.TUTORIAL_TIPS.receive;

/* ---- letters in the villa mailbox ---- */
G.LETTERS = {
  welcome: { from: 'pepper', title: 'Welcome', day: 1, slot: 2, text: 'Welcome to Isla Fortuna. Matches pay. Friends help. Gifts help friends. The casino helps no one. Sleep is mandatory. Breakfast is optional. — P. Quill, Concierge' },
  flyer: { from: 'sonny', title: 'FREE CHIPS!', day: 2, slot: 0, text: 'FREE CHIPS FOR CHAMPIONS! Come to CASINO FORTUNA tonight! Slots! Cards! The wheel of DESTINY! Ask for Sonny! (I am always there.) — S. FORTUNA, ESQ.' },
  friend: { from: 'best', title: 'A note from a friend', day: 3, slot: 0, text: '' },
  warning: { from: 'pepper', title: 'Advice', day: 4, slot: 0, text: "The Final is tomorrow. Mr. Fortuna's serve is... dazzling. Eyewear is advised. — P." },
  hype: { from: 'sonny', title: 'FINAL HYPE', day: 5, slot: 0, text: 'TODAY! THE FORTUNA CUP FINAL! You versus THE HOUSE! Me! And Pepper! Bring sunglasses! Bring snacks! Bring your A-GAME! — SONNY' },
  rumor: { from: 'pepper', title: 'A rumor', day: 4, slot: 0, text: 'I hear you missed the casino last night. Pity. Mr. Fortuna said something remarkable on the phone. Something about the island. — P.' }
};
G.FRIEND_NOTES = {
  rin: 'I am writing because it is proper. You are a good partner. That is all. (I drew you a crab.) — Rin',
  lola: '¡Compañera! Just writing to say: you are a CHAMPION. Tag team forever! — Lola, La Tormenta',
  ingrid: 'It is still hot. You are still... tolerable. That is high praise. — Ingrid',
  amara: 'Hiii! I made you a playlist! It is called "Best Partner Ever." It is 4 hours long! — Amara xx',
  tess: "G'day! Waves were huge this morning. Thought of you. Want a lesson later? — Tess",
  mei: 'Check your left sandal. Hehe. Just kidding. Or am I? — Mei'
};

/* ---- the invitation ---- */
G.INVITATION = 'You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna. Prize: everything. — S. Fortuna, Esq.';

/* ---- How to Play: ten pages, one idea each ---- */
G.HOWTO = [
  { title: 'Moving and the ring', text: I => 'Move with ' + G.btnName('move', I) + '. When the ball is yours, a ring on the sand shows where it comes down. It shrinks as the ball falls and turns gold at the perfect moment.' },
  { title: 'Bump, set, spike', text: I => 'One button plays every touch: ' + G.btnName('play', I) + '. The first touch bumps, the second sets, the third spikes. Three touches a side, never twice in a row.' },
  { title: 'Aiming and shots', text: I => 'Hold a direction as you hit to aim: toward the net for short, away for deep, up or down for the lines' + (I.lastDevice === 'mouse' ? ', or point the mouse at their court' : '') + '. ' + G.btnName('shot', I) + ' plays a cut shot over the block.' },
  { title: 'Serving', text: I => G.btnName('play', I) + ' tosses a float serve; ' + G.btnName('play', I) + ' again at the top of the toss hits it. ' + G.btnName('shot', I) + ' tosses a jump serve: faster, harder to aim.' },
  { title: 'Blocking and diving', text: I => 'When they spike near the net, stand close and press ' + G.btnName('shot', I) + ' to block. Too far from the ball? ' + G.btnName('dive', I) + ' throws you at it.' },
  { title: 'Calls and chemistry', text: I => G.btnName('call', I) + ' calls Mine, Yours or Auto. Your partner plays better the better you get along: hearts on the HUD show it.' },
  { title: 'The vacation', text: () => 'Five days, each a Morning, an Afternoon and a Night. Visiting a place uses the slot. Matches pay Sonny Dollars. The Fortuna Cup final is on Day 5.' },
  { title: 'Friends and gifts', text: () => 'Talk to the others every day. Gifts they love win hearts; gifts they hate come back. Friends team up with you, and play better with you.' },
  { title: 'Casino and Pool Hop', text: () => 'At night the casino opens: slots, blackjack and roulette for chips. By day, Pool Hop at the lagoon: hop the pads on the beat, pressing the button each pad shows.' },
  { title: 'Postcards', text: I => 'Pause and pick Take a Postcard (or press ' + G.btnName('snap', I) + ') to pose everyone, frame the shot and keep it in your album. Set one as the title screen.' }
];


/* ---- 06-data-music.js ---- */
/* 06-data-music: the score. Nine original songs and the jingles, written as data for a small song builder: a chord per
 * bar, a lead melody (hand-written hooks, or grown from a rhythm motif over the chords: chord tones on the strong beats,
 * steps between, phrases that end home), arpeggios, chord stabs, a bass line and drum parts in named layers, so drums can
 * come and go (the match song's 'rally' layer). Instruments (engine patch 4): steel, marimba, pluck, bell, organ, pad. */
G.INSTRUMENTS = {
  steel: { partials: [[1, 1], [2, .5], [3, .35], [4, .2]] },
  marimba: { partials: [[1, 1], [4, .3], [10, .05]] },
  bell: { partials: [[1, 1], [3, .45], [5, .25], [9, .12]] },
  organ: { partials: [[1, 1], [2, .55], [3, .4], [4, .3]] }
};
const NOTE_N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ROOTS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const nn = m => NOTE_N[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const chordOf = sym => {
  const m = /^([A-G][#b]?)(m(?!aj))?(maj7|7|sus4|dim|6)?$/.exec(sym); if (!m) return { root: 0, tones: [0, 4, 7] };
  const root = ROOTS[m[1]], minor = !!m[2], ext = m[3];
  const tones = ext === 'sus4' ? [0, 5, 7] : ext === 'dim' ? [0, 3, 6] : [0, minor ? 3 : 4, 7];
  if (ext === '7') tones.push(10); if (ext === 'maj7') tones.push(11); if (ext === '6') tones.push(9);
  return { root, tones };
};
const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
const BASS = { pop: [0, null, 0, 7, 0, null, 7, null], bossa: [0, null, null, 7, null, 0, 7, null], walk: [0, null, 4, null, 7, null, 9, null], drive: [0, 0, 12, 0, 0, 12, 0, 7], slow: [0, null, null, null, 7, null, null, null], pump: [0, null, 12, null, 0, null, 12, null] };
const DRUMS = {
  pop: ['k . s . k k s .', 'h h h h h h h o'], bossa: ['k . . k k . . k', 'h . h h . h h .'], drive: ['k . s k k . s .', 'h h h h h h h h'],
  lounge: ['k . . . s . . k', 'h . h h h . h h'], lullaby: ['. . . . . . . .', 'h . . . h . . .'], march: ['k . s . k s s s', 'h h h h h h h h'], anthem: ['k . s . k k s k', 'h h o h h h o h']
};
const parse = s => s.trim().split(/\s+/).filter(t => t !== '|');
/** grow a melody over the chords: rhythm motifs 'x' (a note), '-' (held), '.' (rest), 8 steps a bar */
function growMelody(chords, o) {
  const r = E.rng(G.hashStr(o.seed || 'm')), scale = (o.minor ? MINOR : MAJOR).map(d => d + o.key), lo = o.lo || 72, hi = o.hi || 88;
  const pool = []; for (let m = lo; m <= hi; m++) if (scale.some(d => ((m - d) % 12 + 12) % 12 === 0)) pool.push(m);
  let cur = Math.floor(pool.length / 2), out = [], motifIv = null;
  chords.forEach((sym, b) => {
    const ch = chordOf(sym), ct = pool.map((m, i) => ch.tones.some(t => ((m - ch.root - t) % 12 + 12) % 12 === 0) ? i : -1).filter(i => i >= 0);
    const phrasePos = b % 4, rhythm = o.rhythm[(phrasePos === 3 ? 2 : phrasePos === 2 ? 1 : 0) % o.rhythm.length] || o.rhythm[0];
    const toks = [], idxs = []; let onset = 0;
    for (let s = 0; s < 8; s++) {
      const c = rhythm[s];
      if (c === '-') { toks.push('-'); continue; } if (c !== 'x') { toks.push('.'); continue; }
      const strong = s === 0 || s === 4, lastOn = phrasePos === 3 && rhythm.slice(s + 1).indexOf('x') < 0;
      if (lastOn) { const home = ct.filter(i => ((pool[i] - ch.root) % 12 + 12) % 12 === 0); cur = home.sort((a, c2) => Math.abs(a - cur) - Math.abs(c2 - cur))[0] ?? cur; }
      else if (phrasePos === 2 && motifIv && motifIv[onset] !== undefined) cur = clamp(cur + motifIv[onset], 0, pool.length - 1);
      else if (strong) { const near = ct.slice().sort((a, c2) => Math.abs(a - cur) - Math.abs(c2 - cur)); cur = near[r() < .7 ? 0 : Math.min(1, near.length - 1)] ?? cur; }
      else { const dir = phrasePos < 2 ? (r() < .65 ? 1 : -1) : (r() < .65 ? -1 : 1); cur = clamp(cur + dir * (r() < .8 ? 1 : 2), 0, pool.length - 1); }
      toks.push(nn(pool[cur])); idxs.push(cur); onset++;
    }
    if (phrasePos === 0) { motifIv = [undefined]; for (let k = 1; k < idxs.length; k++) motifIv[k] = idxs[k] - idxs[k - 1]; }   // bar 3 of a phrase echoes bar 1's shape
    out.push(toks.join(' '));
  });
  return out.join(' | ');
}
/** a song: { bpm, key, minor, chords: 'C G Am F | ...', lead, leadWave, rhythm, bass, drums, arp, stabs, pad, layers, up } */
function song(o) {
  const chords = parse(o.chords), up = o.up || 0, upFrom = o.upFrom === undefined ? chords.length : o.upFrom;
  const tr = (b, m) => m + (b >= upFrom ? up : 0);
  const tracks = [];
  const lead = o.lead ? o.lead : growMelody(chords.map((c, b) => b >= upFrom && up ? transposeSym(c, up) : c), { key: o.key, minor: o.minor, rhythm: o.rhythm, seed: o.id, lo: o.lo, hi: o.hi });
  tracks.push(Object.assign({ name: 'lead', wave: o.leadWave || 'steel', vol: o.leadVol || .13, notes: lead }, o.leadOpts || { decay: .5 }));
  if (o.harmony) tracks.push({ name: 'harmony', wave: 'square', vol: .045, notes: lead, octave: -1, gate: .7 });
  if (o.arp !== false) {
    const pat = o.arpPat || [0, 1, 2, 3, 2, 1, 0, 1];
    tracks.push({ name: 'arp', wave: o.arpWave || 'marimba', vol: o.arpVol || .09, decay: .35, notes: chords.map((c, b) => { const ch = chordOf(c), base = 60 + ch.root; return pat.map(k => k === null ? '.' : nn(tr(b, base + ((ch.tones.concat(ch.tones.map(t => t + 12)))[k] || 0)))).join(' '); }).join(' | ') });
  }
  if (o.stabs !== false) for (let v = 0; v < 3; v++) tracks.push({ name: 'stab' + v, wave: 'saw', filter: 'lowpass', cutoff: 1800, decay: .22, vol: .035, notes: chords.map((c, b) => { const ch = chordOf(c), n = nn(tr(b, 60 + ch.root + ch.tones[v % ch.tones.length])); return (o.stabPat || '. x . x . x . x').split(' ').map(t => t === 'x' ? n : '.').join(' '); }).join(' | ') });
  if (o.pad) for (let v = 0; v < 3; v++) tracks.push({ name: 'pad' + v, wave: 'saw', filter: 'lowpass', cutoff: 1100, detune: 8, vol: .03, notes: chords.map((c, b) => { const ch = chordOf(c); return nn(tr(b, 55 + ch.root + ch.tones[v % ch.tones.length])) + ' - - - - - - -'; }).join(' | ') });
  if (o.organ) tracks.push({ name: 'organ', wave: 'organ', vol: .07, gate: .5, notes: chords.map((c, b) => { const ch = chordOf(c), n = nn(tr(b, 60 + ch.root + ch.tones[1])); return (o.organPat || 'x . . x . . x .').split(' ').map(t => t === 'x' ? n : '.').join(' '); }).join(' | ') });
  const bp = BASS[o.bass || 'pop'];
  tracks.push({ name: 'bass', wave: o.bassWave || 'triangle', vol: o.bassVol || .3, notes: chords.map((c, b) => { const ch = chordOf(c), base = 36 + ch.root; return bp.map(k => k === null ? '.' : nn(tr(b, base + k))).join(' '); }).join(' | ') });
  const dr = DRUMS[o.drums || 'pop'];
  tracks.push({ name: 'drums', wave: 'drums', vol: o.drumVol || .12, notes: dr[0] });
  tracks.push({ name: 'hats', wave: 'drums', vol: (o.drumVol || .12) * .55, notes: dr[1] });
  for (const L of o.layers || []) tracks.push(Object.assign({ wave: 'drums', vol: .12, on: false }, L));
  return { bpm: o.bpm, steps: 2, tracks };
}
const transposeSym = (sym, n) => { const m = /^([A-G][#b]?)(.*)$/.exec(sym); return m ? NOTE_N[(ROOTS[m[1]] + n + 12) % 12] + m[2] : sym; };
const R = (motif, n = 3) => Array.from({ length: n }, (_, i) => motif[i % motif.length]);
// the title's hook, by hand: a bright tropical-pop line over C G Am F
const SUNRISE_LEAD = [
  'E5 - G5 - C6 - B5 A5', 'G5 - - - D5 - G5 -', 'A5 - G5 E5 C5 - E5 -', 'F5 - E5 D5 C5 - - -',
  'E5 - G5 - C6 - D6 C6', 'B5 - G5 - D5 - G5 -', 'A5 - C6 - E6 - D6 C6', 'C6 - - - . . G5 -',
  'F5 - A5 - D6 - C6 A5', 'G5 - - - B5 - D6 -', 'E6 - D6 C6 B5 - A5 -', 'G5 - - - - - G5 A5',
  'F5 - E5 - D5 - C5 D5', 'E5 - G5 - B5 - D6 -', 'C6 - B5 A5 G5 - E5 -', 'C5 - - - . . . .'].join(' | ');
const SPIKE_LEAD = [
  'A5 . A5 C6 . A5 G5 .', 'E5 - - . E5 F5 G5 .', 'C6 . C6 B5 . G5 E5 .', 'G5 - - . G5 A5 B5 .',
  'A5 . A5 C6 . E6 D6 .', 'C6 - A5 . A5 G5 F5 .', 'E5 . G5 . C6 . B5 .', 'A5 - - - . . E5 G5'].join(' | ');
G.SONGS = {
  sunrise: song({ id: 'sunrise', bpm: 116, key: 0, chords: 'C G Am F | C G Am F | C G Am F | C G Am F | Dm G C Am | Dm G C C', lead: SUNRISE_LEAD, leadWave: 'steel', drums: 'pop', bass: 'pop' }),
  island: song({ id: 'island', bpm: 100, key: 5, chords: 'F Bb C F | F Bb C F | Dm Gm C F | Dm Gm C C', rhythm: R(['x - x . x x - .', 'x . x x - . x .', 'x - - . x - - .']), leadWave: 'marimba', leadOpts: { decay: .35 }, arpWave: 'saw', arpVol: .03, drums: 'bossa', bass: 'bossa', lo: 65, hi: 81 }),
  spike: song({ id: 'spike', bpm: 138, key: 9, minor: true, chords: 'Am F C G | Am F C G', lead: SPIKE_LEAD, leadWave: 'square', leadVol: .07, leadOpts: { gate: .8 }, arpWave: 'pulse', arpVol: .04, stabs: false, bass: 'drive', bassWave: 'saw', bassVol: .1, drums: 'drive',
    layers: [{ name: 'rally', notes: 't . t t . t t .', vol: .1 }, { name: 'rally2', notes: 'h h h h h h h h', vol: .06 }] }),
  house: song({ id: 'house', bpm: 150, key: 2, minor: true, chords: 'Dm Bb C A | Dm Bb C A | Dm Bb C A | Dm Bb C A', up: 2, upFrom: 8, rhythm: R(['x . x x . x - .', 'x - - x . x x .', 'x . . x x . x -']), leadWave: 'pulse', leadVol: .08, leadOpts: { gate: .85 }, organ: true, stabs: false, arpVol: .05, bass: 'pump', bassWave: 'saw', bassVol: .1, drums: 'march', lo: 69, hi: 86 }),
  lagoon: song({ id: 'lagoon', bpm: 112, key: 7, chords: 'G Em Am D | G Em Am D | Cmaj7 Bm Am D | G Em Am D', rhythm: R(['x - . x - . x .', '. x - x . x - .', 'x - - - x . x .']), leadWave: 'steel', leadVol: .1, stabPat: 'x . . x . . x .', arp: false, bass: 'bossa', drums: 'bossa', lo: 67, hi: 83,
    layers: [{ name: 'rim', notes: 'h . h . h . h .', vol: .1, on: true }] }),
  boutique: song({ id: 'boutique', bpm: 108, key: 10, chords: 'Bb Gm Eb F | Bb Gm Eb F | Cm F Bb Gm | Eb F Bb Bb', rhythm: R(['x . x . x x - .', '. x . x x - . x', 'x - x . x . . .']), leadWave: 'bell', leadVol: .09, leadOpts: { decay: 1.2 }, arpWave: 'bell', arpVol: .04, bass: 'walk', bassWave: 'saw', bassVol: .1, drums: 'pop', lo: 70, hi: 86 }),
  neon: song({ id: 'neon', bpm: 96, key: 4, minor: true, chords: 'Em A Em A | Em A Em A | C B7 Em Em | C B7 Em A', rhythm: R(['x - . x . x - .', 'x . x - - . x .', '. x - x - . x .']), leadWave: 'organ', leadVol: .07, leadOpts: { gate: .7 }, organ: true, organPat: '. x . . . x . .', stabs: false, arpWave: 'bell', arpVol: .03, bass: 'walk', bassVol: .26, drums: 'lounge', lo: 64, hi: 79 }),
  siesta: song({ id: 'siesta', bpm: 80, key: 2, chords: 'D Bm G A | D Bm G A | G A D Bm | G A D D', rhythm: R(['x - - - x - x -', 'x - x - x - - -', 'x - - - - - . .']), leadWave: 'marimba', leadVol: .1, leadOpts: { decay: .6 }, pad: true, stabs: false, arpWave: 'marimba', arpVol: .05, arpPat: [0, null, 1, null, 2, null, 1, null], bass: 'slow', drums: 'lullaby', lo: 62, hi: 78 }),
  farewell: song({ id: 'farewell', bpm: 124, key: 0, chords: 'C G Am F | C G Am F | Dm G C Am | F G C C | C G Am F | C G Am F | Dm G C Am | F G C C', up: 2, upFrom: 16, rhythm: R(['x - x - x x - .', 'x - - x - x x -', 'x - x x - - x .']), leadWave: 'steel', harmony: true, drums: 'anthem', bass: 'pop', lo: 72, hi: 88,
    layers: [{ name: 'fire', notes: 'c . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .', vol: .1, on: true }] })
};
const jingle = (bpm, lead, bass, o = {}) => ({ bpm, steps: 2, loop: false, tracks: [{ wave: o.wave || 'square', vol: o.vol || .11, notes: lead, gate: .9 }, { wave: 'triangle', vol: .26, notes: bass }].concat(o.drums ? [{ wave: 'drums', vol: .1, notes: o.drums }] : []) });
G.JINGLES = {
  win: jingle(150, 'C5 E5 G5 C6 - G5 C6 - | E6 - D6 - E6 - - - | . . . .', 'C3 . C3 . C3 - G2 - | C3 - G2 - C3 - - - | . . . .', { drums: 'k . s . k . s . | k k s . k . . .' }),
  lose: jingle(100, 'G4 - F4 - E4 - Eb4 - | D4 - - - - - . .', 'C3 - B2 - Bb2 - A2 - | Ab2 - - - - - . .', { wave: 'triangle' }),
  ace: jingle(160, 'G5 C6 E6 G6 - - . .', 'C3 . G3 . C4 - . .'),
  matchpoint: jingle(140, 'A5 . A5 . C6 . E6 - | - - . . . . . .', 'A2 . A2 . A2 . A2 - | - - . . . . . .', { drums: 'k k k k s s s s | c . . . . . . .' }),
  gift_love: jingle(160, 'E6 G6 C7 - - . . .', 'C4 E4 G4 - - . . .', { wave: 'triangle', vol: .12 }),
  gift_refuse: jingle(120, 'E5 - Eb5 - D5 - - .', 'C3 - B2 - Bb2 - - .', { wave: 'triangle' }),
  jackpot: jingle(180, 'C6 E6 G6 C7 G6 C7 E7 - | C7 - - - . . . .', 'C3 C3 G3 C4 G3 C4 C4 - | C3 - - - . . . .', { drums: 'k s k s k s k s | c . . . . . . .' }),
  daystart: jingle(130, 'G5 C6 E6 - - . . .', 'C3 - - - - . . .', { wave: 'triangle', vol: .13 }),
  levelup: jingle(170, 'C6 D6 E6 G6 C7 - . .', 'C3 . E3 . G3 - . .'),
  photo: jingle(170, 'E6 C6 G6 - . . . .', 'C4 . . . . . . .', { wave: 'triangle', vol: .12 })
};


/* ---- 10-input.js ---- */
/* 10-input: the action maps per context, the device and glyph logic, button icons drawn as pixel art, prompts that
 * follow the device used last (per player), the mouse wheel, and the touch-only gate. */
const DIRS = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
const SYS = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'] };
G.PRESETS = {
  // matches: the order play, dive, shot, call gives the split keyboard F G H R and . / , L
  MATCH: { ...DIRS, play: ['Space', 'KeyJ', 'Mouse0', 'Pad0'], dive: ['ShiftLeft', 'KeyL', 'Pad1'], shot: ['KeyE', 'KeyK', 'Mouse2', 'Pad2'], call: ['KeyQ', 'KeyI', 'Mouse1', 'Pad3'], view: ['KeyV', 'Pad11'], ...SYS,
    confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'], snap: ['KeyC', 'Pad8'], skip: ['Space', 'Enter', 'Mouse0', 'Pad0', 'Pad1'] },
  EXPLORE: { ...DIRS, interact: ['KeyE', 'Space', 'Enter', 'Pad0'], run: ['ShiftLeft', 'Pad1', 'Pad7'], bag: ['KeyG', 'Pad2'], leave: ['KeyM', 'Tab', 'Pad3'], snap: ['KeyC', 'Pad8'], ...SYS,
    confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Mouse2', 'Pad1'] },
  MENU: { ...DIRS, confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Mouse2', 'Pad1'], alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'],
    esc: ['Escape'], hide: ['KeyH', 'Pad11'], snap: ['KeyC', 'Pad8'], trigL: ['Pad6'], trigR: ['Pad7'], ...SYS },
  POOLHOP: { ...DIRS, hopA: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], hopB: ['KeyL', 'ShiftLeft', 'Pad1'], hopX: ['KeyK', 'KeyE', 'Mouse2', 'Pad2'], hopY: ['KeyI', 'KeyQ', 'Pad3'], ...SYS,
    confirm: ['Enter', 'NumpadEnter', 'Pad0'], cancel: ['Backspace', 'Pad1'] },
  CASINO: { ...DIRS, confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Backspace', 'Mouse2', 'Pad1'], alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'],
    hit: ['KeyH'], stand: ['KeyS'], double: ['KeyD'], split: ['KeyP'], reel1: ['KeyJ'], reel2: ['KeyK'], reel3: ['KeyL'], esc: ['Escape'], ...SYS, pause: ['Escape', 'Pad9'] }
};
/** a menu over a scene borrows the MENU actions (tabs, option, special) and gives the scene's back on closing */
G._inputStack = [];
G.pushInput = name => { G._inputStack.push(G.inputPreset); G.useInput(name); };
G.popInput = () => { const p = G._inputStack.pop(); if (p) G.useInput(p); };
G.ACTION_NAMES = { play: 'Hit', dive: 'Dive', shot: 'Shot / Block', call: 'Call', view: 'Camera', interact: 'Interact', run: 'Run', bag: 'Gift bag', leave: 'Island map', snap: 'Postcard',
  confirm: 'Confirm', cancel: 'Back', alt: 'Option', extra: 'Special', tabL: 'Tab left', tabR: 'Tab right', hopA: 'Hop ✕', hopB: 'Hop ○', hopX: 'Hop □', hopY: 'Hop △', skip: false, esc: false, hide: false, trigL: false, trigR: false,
  hit: 'Hit (blackjack)', stand: 'Stand', double: 'Double', split: 'Split', reel1: 'Stop reel 1', reel2: 'Stop reel 2', reel3: 'Stop reel 3' };
/** every player's input on one preset (a scene's own input option does player 1; joined players follow here) */
G.useInput = (name) => {
  const P = G.PRESETS[name];
  for (const I of G.game.players) { if (I.half) I.use(E.Input.halfKeys(P, I.half)); else I.use(P); I.glyphs = G.setting('glyphs', 'playstation'); }
  G.inputPreset = name;
};

/* ---- devices and glyphs ---- */
/** 'ps' | 'xbox' | 'kbm' for an input: a pad follows the Button symbols setting */
G.dev = (I = G.game.input) => I.lastDevice === 'gamepad' ? (G.setting('glyphs', 'playstation') === 'xbox' ? 'xbox' : 'ps') : 'kbm';
G.sawKeyOrPad = false;
const PS_COL = { 0: '#8fb8ff', 1: '#ff7a7a', 2: '#f59ad8', 3: '#5fe0b4' }, XB_COL = { 0: '#6ad66a', 1: '#ff5a5a', 2: '#4aa8ff', 3: '#ffd23a' };
const XB_L = ['A', 'B', 'X', 'Y'], PS_SH = ['L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3'], XB_SH = ['LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS'];
const padCodeOf = (I, a) => { const m = I.map[a]; return m && m.find(c => /^Pad\d+$/.test(c)); };
const keyCodeOf = (I, a, mouse) => { const m = I.map[a] || []; return mouse ? m.find(c => c.startsWith('Mouse')) : m.find(c => !c.startsWith('Pad') && !c.startsWith('Act:') && !c.startsWith('Mouse')); };
/** a disc face button */
function faceBtn(g, x, y, i, style) {
  if (style === 'ps') {
    px.disc(g, x + 4, y + 4, 4.6, '#0c0a18'); px.disc(g, x + 4, y + 4, 3.8, '#24203a');
    const c = PS_COL[i];
    if (i === 0) { px.line(g, x + 2, y + 2, x + 6, y + 6, c); px.line(g, x + 6, y + 2, x + 2, y + 6, c); }
    else if (i === 1) { px.disc(g, x + 4, y + 4, 2.6, c); px.disc(g, x + 4, y + 4, 1.5, '#24203a'); }
    else if (i === 2) { px.rect(g, x + 2, y + 2, 5, 1, c); px.rect(g, x + 2, y + 6, 5, 1, c); px.rect(g, x + 2, y + 2, 1, 5, c); px.rect(g, x + 6, y + 2, 1, 5, c); }
    else { px.line(g, x + 4, y + 2, x + 2, y + 6, c); px.line(g, x + 4, y + 2, x + 6, y + 6, c); px.line(g, x + 2, y + 6, x + 6, y + 6, c); }
  } else {
    px.disc(g, x + 4, y + 4, 4.6, '#0c0a18'); px.disc(g, x + 4, y + 4, 3.8, XB_COL[i]);
    E.font.text(g, XB_L[i], x + 2, y + 1, '#141018', { outline: false });
  }
  return 9;
}
function pill(g, x, y, label, col = '#e8e4f0') {
  const w = E.font.width(label) + 5;
  px.rect(g, x + 1, y, w - 2, 9, '#0c0a18'); px.rect(g, x, y + 1, w, 7, '#0c0a18');
  px.rect(g, x + 1, y + 1, w - 2, 7, '#3a3656'); px.rect(g, x + 1, y + 1, w - 2, 1, '#5a5678');
  E.font.text(g, label, x + 3, y + 1, col, { outline: false });
  return w;
}
function keycap(g, x, y, label) {
  const w = Math.max(9, E.font.width(label) + 5);
  px.rect(g, x + 1, y, w - 2, 10, '#141018'); px.rect(g, x, y + 1, w, 8, '#141018');
  px.rect(g, x + 1, y + 1, w - 2, 8, '#9a94a6'); px.rect(g, x + 1, y + 1, w - 2, 6, '#f0ece2');
  E.font.text(g, label, x + Math.round((w - E.font.width(label)) / 2), y + 1, '#2a2434', { outline: false });
  return w;
}
function mouseIcon(g, x, y, btn) {
  px.rect(g, x + 1, y, 5, 10, '#141018'); px.rect(g, x, y + 1, 7, 8, '#141018');
  px.rect(g, x + 1, y + 1, 5, 8, '#e8e4dc'); px.rect(g, x + 3, y + 1, 1, 4, '#8a8478');
  const lit = '#ff9e5e';
  if (btn === 0) px.rect(g, x + 1, y + 1, 2, 4, lit); else if (btn === 2) px.rect(g, x + 4, y + 1, 2, 4, lit); else px.rect(g, x + 3, y + 1, 1, 3, lit);
  return 8;
}
function stickIcon(g, x, y, style) {
  px.disc(g, x + 4, y + 4, 4.6, '#0c0a18'); px.disc(g, x + 4, y + 4, 3.8, '#3a3656'); px.disc(g, x + 4, y + 4, 2.2, style === 'ps' ? '#8fb8ff' : '#c8c4d8'); px.dot(g, x + 3, y + 3, '#ffffff');
  return 9;
}
/** draw the icon for an action on an input's device at (x, y); returns its width. Pseudo-actions: 'move' (stick / WASD),
 *  'aim' (stick / mouse), 'dpad' */
G.glyph = (g, x, y, a, I = G.game.input, o = {}) => {
  x = Math.round(x); y = Math.round(y);
  const style = o.style || G.dev(I);
  if (a === 'move' || a === 'aim') {
    if (style !== 'kbm') return stickIcon(g, x, y, style);
    if (a === 'aim' && I.lastDevice === 'mouse') return mouseIcon(g, x, y, -1);
    return keycap(g, x, y, I.half === 'right' ? '←↑→' : 'WASD');
  }
  if (style !== 'kbm') {
    const c = padCodeOf(I, a); if (!c) return 0;
    const n = +c.slice(3);
    if (n <= 3) return faceBtn(g, x, y, n, style);
    if (n >= 12 && n <= 15) return pill(g, x, y, ['D↑', 'D↓', 'D←', 'D→'][n - 12]);
    return pill(g, x, y, (style === 'ps' ? PS_SH : XB_SH)[n - 4] || c);
  }
  const mc = I.lastDevice === 'mouse' && keyCodeOf(I, a, true);
  if (mc && !o.keysOnly) return mouseIcon(g, x, y, +mc.slice(5));
  const kc = keyCodeOf(I, a); if (!kc) { const m2 = keyCodeOf(I, a, true); return m2 ? mouseIcon(g, x, y, +m2.slice(5)) : 0; }
  return keycap(g, x, y, I.codeLabel(kc));
};
G.glyphW = (a, I = G.game.input, o = {}) => {
  const style = o.style || G.dev(I);
  if (a === 'move' || a === 'aim') return style !== 'kbm' ? 9 : a === 'aim' && I.lastDevice === 'mouse' ? 8 : Math.max(9, E.font.width(I.half === 'right' ? '←↑→' : 'WASD') + 5);
  if (style !== 'kbm') { const c = padCodeOf(I, a); if (!c) return 0; const n = +c.slice(3); return n <= 3 ? 9 : E.font.width(n >= 12 && n <= 15 ? 'D↑' : (style === 'ps' ? PS_SH : XB_SH)[n - 4] || c) + 5; }
  const mc = I.lastDevice === 'mouse' && keyCodeOf(I, a, true); if (mc && !o.keysOnly) return 8;
  const kc = keyCodeOf(I, a); return kc ? Math.max(9, E.font.width(I.codeLabel(kc)) + 5) : 8;
};
/** a text name for an action's button, in the current device's terms (for sentences in tips: "Press ✕ to ...") */
G.btnName = (a, I = G.game.input) => {
  const style = G.dev(I);
  if (a === 'move') return style === 'kbm' ? 'WASD' : 'the stick';
  if (style !== 'kbm') { const c = padCodeOf(I, a); if (!c) return a; const n = +c.slice(3); return n <= 3 ? (style === 'ps' ? ['✕', '○', '□', '△'][n] : XB_L[n]) : (style === 'ps' ? PS_SH : XB_SH)[n - 4] || c; }
  const mc = I.lastDevice === 'mouse' && keyCodeOf(I, a, true); if (mc) return ['Left click', 'Middle click', 'Right click'][+mc.slice(5)];
  const kc = keyCodeOf(I, a); return kc ? I.codeLabel(kc) : a;
};
/** a prompt: the action's icon and a word; returns its width */
G.prompt = (g, x, y, a, text, o = {}) => {
  const I = o.input || G.game.input, w = G.glyph(g, x, y, a, I, o);
  const col = o.color || '#fff8e8';
  if (text) E.font.text(g, text, Math.round(x + w + 3), Math.round(y + 1), col, { shadow: '#0a0814', outline: false });
  return w + (text ? 3 + E.font.width(text) + 8 : 6);
};
G.promptW = (a, text, o = {}) => G.glyphW(a, o.input || G.game.input, o) + (text ? 3 + E.font.width(text) + 8 : 6);
/** the bottom prompt bar: [[action, text], ...] centred at the bottom of the safe area */
G.promptBar = (g, r, items, o = {}) => {
  if (G.attract) return;   // (no one is playing the demo: its only prompt is the attract's own Press)
  items = items.filter(Boolean);
  const W = items.reduce((s, [a, t]) => s + G.promptW(a, t, o), 0), y = o.y !== undefined ? o.y : r.H - Math.round(r.H * .05) - 10;
  let x = Math.round(o.x !== undefined ? o.x : (r.W - W) / 2);
  if (o.bg !== false && items.length) E.ui.box(g, x - 6, y - 3, W + 8, 16, { bg: ['#0f4c5c', '#0a2d3d'], border: '#2a6a7a', alpha: .78 });
  for (const [a, t] of items) x += G.prompt(g, x, y, a, t, o);
};

/* ---- the mouse wheel (the canvas UI pages lists with it) ---- */
G.wheel = 0; G._wheelAcc = 0;
if (typeof window.addEventListener === 'function' && typeof document !== 'undefined') {
  window.addEventListener('wheel', e => { G._wheelAcc += Math.sign(e.deltaY); }, { passive: true });
  window.addEventListener('keydown', () => { G.sawKeyOrPad = true; }, { capture: true });
  window.addEventListener('gamepadconnected', () => { G.sawKeyOrPad = true; });
}
G.tickWheel = () => { G.wheel = G._wheelAcc; G._wheelAcc = 0; };

/* ---- touch-only devices: no touch controls, a notice and the Settings button; the attract mode runs ---- */
G.touchOnly = () => {
  if (G.sawKeyOrPad || G.forceTouchOnly === false) return false;
  if (G.forceTouchOnly) return true;
  try { return !!(window.matchMedia && matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches); } catch (e) { return false; }
};
G.TOUCH_ONLY_AT_BOOT = false;


/* ---- 11-ui.js ---- */
/* 11-ui: the 10-foot canvas UI kit. Readability rules: the smallest text is the 5x7 font at scale 1 with a shadow;
 * headings scale 2; at most 8 focusable items a screen; content inside a 5% safe area; focus is a gold outline with a
 * white inner line, a soft glow and a 1-px lift. Navigation: d-pad, stick, WASD and arrows move focus spatially (with
 * repeat), confirm and back from the MENU actions, tabs on L1/R1 and Q/E and the wheel; hover moves the focus, a click
 * activates, a right click goes back. Screens lay their widgets out from the screen's size in update and draw alike. */
G.THEMES = {
  day: { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', ink: '#fff8e8', muted: '#9fd3d6', accent: '#ff9e5e', dim: '#5a8a92', hl: '#ffd36a' },
  night: { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', ink: '#fff8e8', muted: '#c8b0e0', accent: '#5ff0ff', dim: '#7a5a92', hl: '#ffd36a' }
};
G.theme = () => G.THEMES[G.themeName || 'day'];
G.safe = r => ({ x: Math.round(r.W * .05), y: Math.round(r.H * .05), w: Math.round(r.W * .9), h: Math.round(r.H * .9) });
const T = () => G.theme();
G.ui = {
  panel(g, x, y, w, h, o = {}) {
    const th = o.theme ? G.THEMES[o.theme] : T();
    E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || th.bg, border: o.border || th.border, alpha: o.alpha === undefined ? .94 : o.alpha });
    if (o.title) {
      const tw = E.font.width(o.title, { scale: 1 }) + 12;
      E.ui.box(g, Math.round(x + 8), Math.round(y - 6), tw, 13, { bg: [th.border, G.E.shade(th.border, -.25)], border: '#2a1a10', alpha: 1 });
      E.font.text(g, o.title, Math.round(x + 14), Math.round(y - 3), '#2a1a10', { outline: false });
    }
  },
  focus(g, x, y, w, h, t = G.now()) {
    x = Math.round(x); y = Math.round(y) - 1; w = Math.round(w); h = Math.round(h);
    const pulse = .25 + .2 * Math.sin(t * 5);
    px.blend(g, pulse, 'add', () => { px.rect(g, x - 3, y - 3, w + 6, h + 6, '#ffb84a'); });
    px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y, 2, h, '#ffd36a'); px.rect(g, x + w, y, 2, h, '#ffd36a');
    px.rect(g, x, y, w, 1, '#ffffff'); px.rect(g, x, y + h - 1, w, 1, '#ffffff'); px.rect(g, x, y, 1, h, '#ffffff'); px.rect(g, x + w - 1, y, 1, h, '#ffffff');
  },
  text(g, s, x, y, o = {}) { E.font.text(g, s, Math.round(x), Math.round(y), o.color || T().ink, { scale: o.scale || 1, align: o.align, shadow: o.shadow === undefined ? '#0a0814' : o.shadow, outline: false, wrap: o.wrap, gradient: o.gradient }); },
  title(g, s, x, y, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), { scale: o.scale || 3, align: o.align || 'center', colors: o.colors || ['#fff7d6', '#ffd36a', '#ff9e5e'], depth: o.depth === undefined ? 2 : o.depth }); },
  heading(g, s, x, y, o = {}) { E.font.text(g, s, Math.round(x), Math.round(y), o.color || T().hl, { scale: 2, align: o.align, shadow: '#0a0814', outline: false }); },
  button(g, it, focused) {
    const th = T(), dis = it.disabled;
    E.ui.box(g, Math.round(it.x), Math.round(it.y - (focused ? 1 : 0)), Math.round(it.w), Math.round(it.h), { bg: focused ? ['#1f7a8a', '#0f4c5c'] : it.primary ? ['#2a6a52', '#14402e'] : ['#174a5a', '#0c2e3a'], border: dis ? '#3a5a62' : focused ? '#ffd36a' : th.dim, alpha: .96 });
    const tx = it.icon ? it.x + 16 : it.align === 'left' ? it.x + 8 : it.x + it.w / 2, ty = it.y + Math.round((it.h - 7) / 2) - (focused ? 1 : 0);
    if (it.icon) G.icon(g, it.icon, it.x + 5, ty - 1);
    E.font.text(g, it.label, Math.round(tx), Math.round(ty), dis ? '#5a7a82' : focused ? '#fffbe8' : th.ink, { align: it.icon || it.align === 'left' ? undefined : 'center', shadow: '#0a0814', outline: false, scale: it.scale || 1 });
    if (it.right) E.font.text(g, it.right, Math.round(it.x + it.w - 6), Math.round(ty), dis ? '#5a7a82' : th.hl, { align: 'right', shadow: '#0a0814', outline: false });
    if (focused) G.ui.focus(g, it.x, it.y, it.w, it.h);
  },
  slider(g, it, focused) {
    const th = T(), t = it.spec, v = it.get(), k = t.toggle ? (v ? 1 : 0) : (v - t.min) / (t.max - t.min), dk = t.toggle ? (t.value ? 1 : 0) : (t.value - t.min) / (t.max - t.min);
    E.ui.box(g, it.x, it.y, it.w, it.h, { bg: focused ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: focused ? '#ffd36a' : th.dim, alpha: .96 });
    E.font.text(g, it.label, it.x + 6, it.y + 4, th.ink, { shadow: '#0a0814', outline: false });
    const bx = it.x + Math.round(it.w * .5), bw = Math.round(it.w * .5) - 40, by = it.y + Math.round(it.h / 2) - 1;
    if (t.toggle) E.font.text(g, v ? 'ON' : 'OFF', bx, it.y + 4, v ? '#9ff3a8' : '#ff9a8a', { shadow: '#0a0814', outline: false });
    else {
      px.rect(g, bx, by, bw, 3, '#0a1a20'); px.rect(g, bx, by, Math.round(bw * clamp(k, 0, 1)), 3, focused ? '#ffd36a' : '#9fd3d6');
      px.rect(g, bx + Math.round(bw * clamp(dk, 0, 1)), by - 2, 1, 7, '#ff9e5e');   // the default as a tick
      px.rect(g, bx + Math.round(bw * clamp(k, 0, 1)) - 1, by - 2, 3, 7, '#ffffff');
    }
    const fmt = t.toggle ? '' : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-US') : +v.toFixed(t.step < .01 ? 3 : t.step < 1 ? 2 : 0)) + (t.unit || '');
    if (fmt) E.font.text(g, fmt, it.x + it.w - 5, it.y + 4, v !== t.value ? '#ffd36a' : th.muted, { align: 'right', shadow: '#0a0814', outline: false });
    if (focused) G.ui.focus(g, it.x, it.y, it.w, it.h);
  },
  stepper(g, it, focused) {
    const th = T();
    E.ui.box(g, it.x, it.y - (focused ? 1 : 0), it.w, it.h, { bg: focused ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: focused ? '#ffd36a' : th.dim, alpha: .96 });
    const ty = it.y + Math.round((it.h - 7) / 2) - (focused ? 1 : 0);
    E.font.text(g, it.label, it.x + 6, ty, th.ink, { shadow: '#0a0814', outline: false });
    const val = String(it.value()), vx = it.x + it.w - 8;
    E.font.text(g, '◀ ' + val + ' ▶', vx, ty, focused ? '#ffd36a' : th.muted, { align: 'right', shadow: '#0a0814', outline: false });
    if (focused) G.ui.focus(g, it.x, it.y, it.w, it.h);
  },
  tabs(g, x, y, names, cur, o = {}) {
    let cx = x;
    const I = o.input || G.game.input;
    cx += G.glyph(g, cx, y + 2, 'tabL', I) + 4;
    const rects = [];
    names.forEach((n, i) => {
      const w = E.font.width(n) + 12, on = i === cur;
      E.ui.box(g, cx, y - (on ? 1 : 0), w, 13, { bg: on ? ['#ffd36a', '#e8a840'] : ['#174a5a', '#0c2e3a'], border: on ? '#fff3c0' : T().dim, alpha: .96 });
      E.font.text(g, n, cx + 6, y + 3 - (on ? 1 : 0), on ? '#2a1a10' : T().ink, { outline: false });
      rects.push({ x: cx, y, w, h: 13, i }); cx += w + 3;
    });
    G.glyph(g, cx + 1, y + 2, 'tabR', I);
    return rects;
  },
  bar(g, x, y, w, h, k, col = '#ffd36a') { px.rect(g, x, y, w, h, '#0a1a20'); px.rect(g, x, y, Math.round(w * clamp(k, 0, 1)), h, col); px.rect(g, x, y, Math.round(w * clamp(k, 0, 1)), 1, G.E.shade(col, .3)); },
  /** hearts for an affinity 0..100: 5 hearts in half steps */
  hearts(g, x, y, aff, n = 5) { const h = Math.round(clamp(aff, 0, 100) / 100 * n * 2) / 2; for (let i = 0; i < n; i++) G.icon(g, h >= i + 1 ? 'heart' : h >= i + .5 ? 'heartHalf' : 'heartEmpty', x + i * 9, y); },
  money(g, x, y, amount, o = {}) { G.icon(g, 'coin', x, y); E.font.text(g, G.fmtMoney(amount), x + 11, y + (o.scale === 2 ? -3 : 1), '#ffe08a', { scale: o.scale || 1, shadow: '#0a0814', outline: false }); },
  /** a little speech or label tag over a world point */
  tag(g, s, x, y, col = '#fff8e8', bg = '#0a2d3d') { const w = E.font.width(s) + 6; px.rect(g, Math.round(x - w / 2), Math.round(y - 10), w, 10, bg); px.rect(g, Math.round(x - w / 2), Math.round(y - 10), w, 1, G.E.shade(bg, .3)); E.font.text(g, s, Math.round(x), Math.round(y - 9), col, { align: 'center', outline: false }); }
};

/* ---- icons (E.sprite): hearts, coin, chip, gift, hanger, sunglasses, star, moods, weather, lock, camera, NEW ---- */
const SPR = (rows, pal) => E.sprite(rows, pal);
G.ICONS = {
  heart: SPR(['.rr.rr.', 'rRRrrrr', 'rRrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'], { r: '#ff5f7a', R: '#ffd0d8' }),
  heartHalf: SPR(['.rr.kk.', 'rRRkkkk', 'rRrkkkk', 'rrrkkkk', '.rrkkk.', '..rkk..', '...k...'], { r: '#ff5f7a', R: '#ffd0d8', k: '#3a2a3a' }),
  heartEmpty: SPR(['.kk.kk.', 'kkkkkkk', 'kkkkkkk', 'kkkkkkk', '.kkkkk.', '..kkk..', '...k...'], { k: '#3a2a3a' }),
  coin: SPR(['..yyy..', '.yYYYy.', 'yYyyyYy', 'yYySyYy', 'yYyyyYy', '.yYYYy.', '..yyy..'], { y: '#e8a020', Y: '#ffe08a', S: '#fff6c0' }),
  chip: SPR(['..rrr..', '.rwrwr.', 'rwrrrwr', 'rrrWrrr', 'rwrrrwr', '.rwrwr.', '..rrr..'], { r: '#e83a5a', w: '#ffffff', W: '#ffd36a' }),
  gift: SPR(['..y.y..', '...y...', 'ppppppp', 'pppyppp', 'PPPyPPP', 'PPPyPPP', 'PPPyPPP'], { p: '#ff7ab8', P: '#e8508a', y: '#ffd36a' }),
  hanger: SPR(['...w...', '..w.w..', '....w..', '...w...', '..w.w..', '.w...w.', 'wwwwwww'], { w: '#e8eef8' }),
  shades: SPR(['.......', 'kkk.kkk', 'kbk-kbk', '.k...k.'], { k: '#141018', b: '#5a8ac8', '-': '#141018' }),
  star: SPR(['...y...', '...y...', 'yyyYyyy', '.yYYYy.', '..yyy..', '.yy.yy.', 'y.....y'], { y: '#ffd36a', Y: '#fff6c0' }),
  starEmpty: SPR(['...k...', '...k...', 'kkkkkkk', '.kkkkk.', '..kkk..', '.kk.kk.', 'k.....k'], { k: '#3a4a5a' }),
  happy: SPR(['...y...', '.y.y.y.', '..yyy..', 'yyyYyyy', '..yyy..', '.y.y.y.', '...y...'], { y: '#ffc83a', Y: '#fff2a0' }),
  normal: SPR(['..www..', '.wwwBB.', 'wwwwBBB', 'wwwwBBB', 'wwwwBBB', '.wwwBB.', '..www..'], { w: '#e8e4dc', B: '#5a6a8a' }),
  gloomy: SPR(['.......', '..ggg..', '.ggggg.', 'ggggggg', 'GGGGGGG', '.b.b.b.', 'b.b.b..'], { g: '#9aa4b8', G: '#7a8498', b: '#6aa0e8' }),
  sunny: SPR(['...y...', '.y.y.y.', '..yyy..', 'yyyYyyy', '..yyy..', '.y.y.y.', '...y...'], { y: '#ffb83a', Y: '#fff2a0' }),
  cloudy: SPR(['.......', '..www..', '.wwwww.', 'wwwwwww', 'GGGGGGG', '.......', '.......'], { w: '#f0f0f4', G: '#b0b8c8' }),
  rain: SPR(['..ggg..', '.ggggg.', 'ggggggg', 'GGGGGGG', '.b.b.b.', 'b.b.b..', '.b.b.b.'], { g: '#b0b8c8', G: '#8890a4', b: '#6aa0e8' }),
  moon: SPR(['..yyy..', '.yy....', 'yyy....', 'yyy....', 'yyy....', '.yy....', '..yyy..'], { y: '#fff2a0' }),
  sunset: SPR(['.......', '...o...', '.ooooo.', 'ooOOOoo', 'ppppppp', '.b.b.b.', '.......'], { o: '#ff9e5e', O: '#ffd36a', p: '#ff5f7a', b: '#6a3fa0' }),
  lock: SPR(['..kkk..', '.k...k.', '.k...k.', 'yyyyyyy', 'yyykyyy', 'yyykyyy', 'yyyyyyy'], { k: '#c8c4d8', y: '#e8a020' }),
  camera: SPR(['.kk....', 'kkkkkkk', 'kwwwwwk', 'kwbbbwk', 'kwbBbwk', 'kwwwwwk', 'kkkkkkk'], { k: '#2a2434', w: '#c8c4d8', b: '#3a5a8a', B: '#9fd3ff' }),
  ball: SPR(['..www..', '.wbbyw.', 'wbwwwyw', 'wbwwyyw', 'wwbyyww', '.wwbbw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' }),
  letter: SPR(['wwwwwww', 'ww...ww', 'w.w.w.w', 'w..w..w', 'w.....w', 'wwwwwww'], { w: '#f0e8d0', '.': '#c8b890' }),
  cards: SPR(['wwwww..', 'wr..w..', 'w.r.ww.', 'w..rwrw', 'wwwww.w', '..w...w', '..wwwww'], { w: '#f8f6f0', r: '#e8283a' }),
  map: SPR(['gggbbbb', 'ggybbbb', 'gyyybbb', 'ggyyybb', 'bggyybb', 'bbggybb', 'bbbgggb'], { g: '#5fc35a', y: '#f3d9a4', b: '#2ec4c9' }),
  bag: SPR(['..www..', '.w...w.', 'ppppppp', 'pPPPPPp', 'pPPPPPp', 'pPPPPPp', 'ppppppp'], { w: '#c8b890', p: '#e8508a', P: '#ff7ab8' }),
  check: SPR(['......g', '.....gg', 'g...gg.', 'gg.gg..', '.ggg...', '..g....'], { g: '#5fe07a' }),
  cpu: SPR(['.kkkkk.', 'kccccck', 'kcwcwck', 'kccccck', 'kcwwwck', '.kkkkk.'], { k: '#141018', c: '#8a94b0', w: '#e8eef8' })
};
G.icon = (g, name, x, y) => { const s = G.ICONS[name]; if (s) px.sprite(g, s, Math.round(x), Math.round(y)); };
G.moodIcon = m => ({ happy: 'happy', normal: 'normal', gloomy: 'gloomy' })[m] || 'normal';
G.MOOD_WORD = { happy: 'Happy', normal: 'Normal', gloomy: 'Gloomy' };

/* ---- focus and navigation over a list of laid-out items ---- */
G.Nav = class Nav {
  constructor(o = {}) { this.focus = o.focus || null; this._mp = null; this.mouse = false; this.wrap = o.wrap !== false; }
  /** items: [{ id, x, y, w, h, disabled, onPress, onLeft, onRight, onDrag }]; returns { back, tab, alt, extra, moved } */
  update(items, I = G.game.input, o = {}) {
    const ev = { back: false, tab: 0, alt: false, extra: false, moved: false, pressed: null };
    const live = items.filter(it => !it.skip);
    if (!live.length) { ev.back = I.pressed('cancel') || (o.esc !== false && I.map.esc && I.pressed('esc')); return ev; }
    let cur = live.find(it => it.id === this.focus);
    if (!cur) { cur = live.find(it => !it.disabled) || live[0]; this.focus = cur.id; }
    // the mouse: hover focuses (only when it moved), a click activates, a drag sets a slider
    const p = I.pointer && I.pointer();
    if (p && I.lastDevice === 'mouse' && (!this._mp || p[0] !== this._mp[0] || p[1] !== this._mp[1])) {
      const hit = live.find(it => p[0] >= it.x && p[0] < it.x + it.w && p[1] >= it.y && p[1] < it.y + it.h);
      if (hit && hit.id !== this.focus) { this.focus = hit.id; cur = hit; ev.moved = true; G.sfx('ui_tick'); }
    }
    this._mp = p ? p.slice() : null;
    const c = I.clicked && I.clicked();
    if (c) {
      const hit = live.find(it => c[0] >= it.x && c[0] < it.x + it.w && c[1] >= it.y && c[1] < it.y + it.h);
      if (hit) {
        this.focus = hit.id; cur = hit;
        if (hit.onDrag) hit.onDrag((c[0] - hit.x) / hit.w);
        else if (hit.disabled) G.sfx('ui_error');
        else if (hit.onPress) { G.sfx('ui_select'); ev.pressed = hit.id; hit.onPress(hit); return ev; }
      }
    }
    // directions with repeat; a slider or stepper takes left and right
    const rep = a => I.repeat(a, .35, .09);
    const dirs = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    for (const [a, dx, dy] of dirs) {
      if (!rep(a)) continue;
      if (dx && cur && (dx < 0 ? cur.onLeft : cur.onRight) && !cur.disabled) { (dx < 0 ? cur.onLeft : cur.onRight)(cur); G.sfx('ui_tick'); ev.moved = true; continue; }
      const nx = this._next(live, cur, dx, dy);
      if (nx && nx !== cur) { this.focus = nx.id; cur = nx; ev.moved = true; G.sfx('ui_tick'); }
      else if (o.edge) o.edge(dx, dy);
    }
    if (I.pressed('confirm') && cur) {
      if (cur.disabled) G.sfx('ui_error');
      else if (cur.onPress) { G.sfx('ui_select'); I.consume('confirm'); ev.pressed = cur.id; cur.onPress(cur); return ev; }
    }
    if (I.pressed('cancel') || (o.esc !== false && I.map.esc && I.pressed('esc'))) { ev.back = true; }
    if (I.map.tabL && I.pressed('tabL')) ev.tab = -1;
    if (I.map.tabR && I.pressed('tabR')) ev.tab = 1;
    if (G.wheel && o.wheelTabs) ev.tab = G.wheel > 0 ? 1 : -1;
    if (I.map.alt && I.pressed('alt')) ev.alt = true;
    if (I.map.extra && I.pressed('extra')) ev.extra = true;
    return ev;
  }
  _next(items, cur, dx, dy) {
    if (!cur) return items[0];
    const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
    let best = null, bs = 1e9;
    for (const it of items) {
      if (it === cur) continue;
      const ix = it.x + it.w / 2, iy = it.y + it.h / 2, ddx = ix - cx, ddy = iy - cy, along = ddx * dx + ddy * dy;
      if (along <= 2) continue;
      const across = Math.abs(ddx * dy) + Math.abs(ddy * dx), score = along + across * 2.2;
      if (score < bs) { bs = score; best = it; }
    }
    if (!best && this.wrap && dy) {   // wrap around vertical lists
      const sorted = items.filter(it => Math.abs((it.x + it.w / 2) - cx) < Math.max(cur.w, 30)).sort((a, b) => a.y - b.y);
      if (sorted.length > 1) best = dy > 0 ? sorted[0] : sorted[sorted.length - 1];
    }
    return best;
  }
  draw(g, items, drawItem) { for (const it of items) if (!it.skip) (drawItem || G.ui.button)(g, it, it.id === this.focus); }
};

/* ---- a vertical list of buttons laid out in a column ---- */
G.listLayout = (entries, x, y, w, h = 18, gap = 4) => entries.filter(Boolean).map((e, i) => Object.assign({ x, y: y + i * (h + gap), w, h, kind: 'button' }, e));

/* ---- modal confirm: Yes / No, No first when destructive ---- */
G.confirm = (text, onYes, o = {}) => {
  const ov = {
    id: 'confirm', modal: true, nav: new G.Nav({ focus: o.destructive ? 'no' : 'yes' }), t: 0,
    items() {
      const W = G.game.W, H = G.game.H, w = 230, x = Math.round((W - w) / 2), y = Math.round(H / 2) + 8;
      return [{ id: 'yes', x: x + 16, y, w: 90, h: 18, label: o.yes || 'Yes', onPress: () => { G.overlay.remove(ov); G.game.input.consumeAll(); onYes && onYes(); } },
        { id: 'no', x: x + w - 106, y, w: 90, h: 18, label: o.no || 'No', onPress: () => { G.overlay.remove(ov); G.game.input.consumeAll(); o.onNo && o.onNo(); } }];
    },
    update(dt) { this.t += dt; const ev = this.nav.update(this.items(), G.game.input, { esc: true }); if (ev.back) { G.sfx('ui_back'); G.overlay.remove(ov); G.game.input.consumeAll(); o.onNo && o.onNo(); } return true; },
    draw(r) {
      r.overlay(g => {
        px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#203040'));
        const w = 230, x = Math.round((r.W - w) / 2), lines = E.font.wrap(text, w - 20), h = 44 + lines.length * 9, y = Math.round(r.H / 2) - h + 30;
        G.ui.panel(g, x, y, w, h);
        lines.forEach((l, i) => G.ui.text(g, l, r.W / 2, y + 8 + i * 9, { align: 'center' }));
        this.nav.draw(g, this.items());
      });
    }
  };
  G.overlay.push(ov); G.sfx('ui_tick');
  return ov;
};

/* ---- toasts: slide in at the top for 3 s ---- */
G.toasts = [];
G.toast = (title, text = '', icon = null) => { G.toasts.push({ title, text, icon, t: 0 }); if (G.toasts.length > 3) G.toasts.shift(); };
G.toastOverlay = {
  id: 'toasts',
  update(dt) { for (const t of G.toasts) t.t += G.realDt; G.toasts = G.toasts.filter(t => t.t < 3.2); return false; },
  draw(r) {
    if (!G.toasts.length) return;
    r.overlay(g => G.toasts.forEach((t, i) => {
      const w = Math.max(E.font.width(t.title), E.font.width(t.text)) + (t.icon ? 30 : 20), x = Math.round((r.W - w) / 2), k = t.t < .25 ? t.t / .25 : t.t > 2.9 ? (3.2 - t.t) / .3 : 1;
      const y = Math.round(r.H * .05 + 40 + i * 28 - (1 - E.ease.outCubic(clamp(k, 0, 1))) * 40);   // under the corner badges
      G.ui.panel(g, x, y, w, t.text ? 24 : 15, { alpha: .95 });
      if (t.icon) G.icon(g, t.icon, x + 6, y + 4);
      G.ui.text(g, t.title, x + (t.icon ? 18 : 10), y + 4, { color: '#ffd36a' });
      if (t.text) G.ui.text(g, t.text, x + (t.icon ? 18 : 10), y + 13, { color: '#fff8e8' });
    }));
  }
};
G.overlay.push(G.toastOverlay);

/* ---- the engine's HTML screens (pause, settings, controls, saves) at a size to read from 10 feet ---- */
G.tenFootCSS = () => {
  if (typeof document === 'undefined' || !document.createElement || document.getElementById('aoa-10ft')) return;
  const s = document.createElement('style'); s.id = 'aoa-10ft';
  s.textContent = '.esh{--fs:clamp(16px,2.6vh,30px);font-size:var(--fs)!important}.esh button{font-size:var(--fs)!important;padding:.45em 1em!important;letter-spacing:.03em!important;min-height:2.1em!important}' +
    '.esh h1,.esh h2{font-size:calc(var(--fs)*1.5)!important}.esh-k,.esh-m,.esh-row small,.esh output,.esh-status,.esh-bind small,.esh-bind button,.esh-cnt,.esh-keys{font-size:calc(var(--fs)*.8)!important}' +
    '.esh-row{font-size:var(--fs)!important}.esh-sel{min-width:7em!important}.esh input[type=range]{height:1.6em!important;min-width:9em}';
  document.head.appendChild(s);
};
/* ---- the clock and money badges ---- */
G.clockBadge = (g, x, y, day, slot, weather, o = {}) => {
  const s = 'Day ' + day + ' · ' + G.SLOTS[slot], w = E.font.width(s) + 26;
  E.ui.box(g, Math.round(x - (o.right ? w : 0)), y, w, 15, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 });
  const ix = Math.round(x - (o.right ? w : 0)) + 5;
  G.icon(g, slot === 2 ? 'moon' : weather === 'rain' ? 'rain' : weather === 'cloudy' ? 'cloudy' : weather === 'golden' ? 'sunset' : 'sunny', ix, y + 4);
  E.font.text(g, s, ix + 11, y + 4, '#fff8e8', { shadow: '#0a0814', outline: false });
  return w;
};


/* ---- 12-audio.js ---- */
/* 12-audio: every sound is made in code. Sound effects (audio.define), the music control (songs in 06-data-music.js),
 * ambience loops (waves, wind, crowd, pool, casino, crickets) and the Animalese voices: letter by letter on the voice bus,
 * driven by the dialog's per-letter hook (engine patch 3) or by voice.say() for barks. */
G.SFX = {
  // ball
  bump: [{ wave: 'sine', freq: 160, to: 90, dur: .1, vol: .42 }, { wave: 'noise', freq: 900, to: 300, dur: .05, vol: .16, filter: 'lowpass' }],
  set: [{ wave: 'sine', freq: 400, to: 320, dur: .06, vol: .3 }, { wave: 'noise', freq: 2400, dur: .03, vol: .08 }],
  spike: [{ wave: 'noise', freq: 3200, to: 900, dur: .09, vol: .4, filter: 'bandpass', q: .7 }, { wave: 'sine', freq: 120, to: 40, dur: .16, vol: .48 }],
  block: [{ wave: 'noise', freq: 1600, to: 500, dur: .07, vol: .36 }, { wave: 'noise', freq: 1300, to: 400, dur: .07, vol: .3, delay: .035 }, { wave: 'sine', freq: 180, to: 80, dur: .1, vol: .3 }],
  serveToss: { wave: 'noise', freq: 500, to: 1500, dur: .25, vol: .12, filter: 'bandpass', q: 2 },
  serveHit: [{ wave: 'noise', freq: 2200, to: 700, dur: .08, vol: .34 }, { wave: 'sine', freq: 200, to: 70, dur: .12, vol: .36 }],
  sand: { wave: 'noise', freq: 600, to: 150, dur: .22, vol: .3, filter: 'lowpass' },
  net: [{ wave: 'noise', freq: 2600, dur: .03, vol: .22 }, { wave: 'noise', freq: 2400, dur: .03, vol: .18, delay: .05 }, { wave: 'noise', freq: 2200, dur: .04, vol: .14, delay: .1 }],
  tape: [{ wave: 'triangle', freq: 1300, to: 900, dur: .12, vol: .2, vib: [24, .06] }, { wave: 'noise', freq: 3000, dur: .02, vol: .16 }],
  whistle: { wave: 'square', freq: 2200, dur: .34, vol: .1, vib: [32, .04] },
  // crowd and court
  crowdCheer: [{ wave: 'noise', freq: 700, to: 1400, dur: 1.4, vol: .2, filter: 'bandpass', q: .5, attack: .2 }, { wave: 'noise', freq: 2400, to: 3200, dur: 1.1, vol: .07, attack: .15 }],
  crowdGroan: { wave: 'noise', freq: 900, to: 300, dur: .9, vol: .16, filter: 'bandpass', q: .8, attack: .12 },
  ooh: [{ wave: 'triangle', freq: 330, to: 260, dur: .6, vol: .1, attack: .1 }, { wave: 'noise', freq: 600, to: 400, dur: .6, vol: .1, filter: 'bandpass', attack: .1 }],
  step_sand: { wave: 'noise', freq: 400, to: 200, dur: .05, vol: .05, filter: 'lowpass' },
  dive: [{ wave: 'noise', freq: 800, to: 200, dur: .35, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 50, dur: .15, vol: .3, delay: .1 }],
  high_five: [{ wave: 'noise', freq: 2400, to: 1200, dur: .05, vol: .35 }, { wave: 'sine', freq: 300, to: 200, dur: .05, vol: .2 }],
  glare: [{ wave: 'sine', freq: 1760, dur: .5, vol: .12, arp: [0, 7, 12, 19], step: .06 }, { wave: 'triangle', freq: 2637, dur: .4, vol: .08, delay: .1 }],
  seagull: [{ wave: 'sine', freq: 1800, to: 1300, dur: .18, vol: .05 }, { wave: 'sine', freq: 1900, to: 1200, dur: .22, vol: .05, delay: .22 }],
  // pool
  splash: [{ wave: 'noise', freq: 1800, to: 400, dur: .45, vol: .34, filter: 'bandpass', q: .6 }, { wave: 'sine', freq: 300, to: 90, dur: .2, vol: .2 }],
  hopLand: [{ wave: 'sine', freq: 520, to: 260, dur: .08, vol: .3 }, { wave: 'noise', freq: 1200, to: 500, dur: .06, vol: .12 }],
  // ui
  ui_tick: { wave: 'triangle', freq: 1400, dur: .03, vol: .09 },
  ui_select: [{ wave: 'square', freq: 880, dur: .05, vol: .08 }, { wave: 'square', freq: 1320, dur: .07, vol: .07, delay: .045 }],
  ui_back: { wave: 'triangle', freq: 700, to: 420, dur: .08, vol: .12 },
  ui_error: [{ wave: 'square', freq: 220, dur: .08, vol: .1 }, { wave: 'square', freq: 180, dur: .1, vol: .1, delay: .08 }],
  ui_tab: { wave: 'triangle', freq: 1100, to: 1500, dur: .05, vol: .1 },
  // casino
  cash: { wave: 'square', freq: 1320, dur: .3, vol: .08, arp: [0, 4, 7, 12, 16], step: .05 },
  chip: [{ wave: 'noise', freq: 4000, dur: .02, vol: .2 }, { wave: 'triangle', freq: 2800, dur: .03, vol: .08 }],
  card_deal: { wave: 'noise', freq: 3000, to: 1500, dur: .07, vol: .16, filter: 'highpass' },
  card_flip: [{ wave: 'noise', freq: 2400, dur: .03, vol: .16 }, { wave: 'noise', freq: 1600, dur: .03, vol: .1, delay: .04 }],
  reel_spin: { wave: 'square', freq: 660, dur: .025, vol: .05 },
  reel_stop: [{ wave: 'sine', freq: 140, to: 70, dur: .1, vol: .34 }, { wave: 'noise', freq: 900, dur: .04, vol: .14 }],
  wheel_spin: { wave: 'noise', freq: 1800, dur: .04, vol: .07 },
  ball_rattle: [{ wave: 'triangle', freq: 2600, dur: .02, vol: .1 }, { wave: 'triangle', freq: 2900, dur: .02, vol: .08, delay: .05 }, { wave: 'triangle', freq: 2400, dur: .02, vol: .06, delay: .11 }],
  // story and misc
  gift_unwrap: [{ wave: 'noise', freq: 3000, to: 1200, dur: .3, vol: .16 }, { wave: 'sine', freq: 1568, dur: .3, vol: .1, delay: .25, arp: [0, 4, 7], step: .07 }],
  heart_up: { wave: 'triangle', freq: 880, dur: .3, vol: .12, arp: [0, 4, 7, 12], step: .06 },
  heart_down: { wave: 'triangle', freq: 660, dur: .3, vol: .12, arp: [0, -3, -7], step: .08 },
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .3 }, { wave: 'noise', freq: 2000, dur: .05, vol: .2, delay: .06 }],
  flash: { wave: 'sine', freq: 3000, to: 5000, dur: .15, vol: .05 },
  firework: [{ wave: 'noise', freq: 300, to: 60, dur: .6, vol: .4, filter: 'lowpass' }, { wave: 'noise', freq: 5000, to: 2000, dur: .7, vol: .08, delay: .1 }],
  door: [{ wave: 'noise', freq: 500, to: 300, dur: .2, vol: .14, filter: 'lowpass' }, { wave: 'sine', freq: 180, to: 140, dur: .1, vol: .14, delay: .15 }],
  coin: { wave: 'square', freq: 1760, dur: .12, vol: .07, arp: [0, 7], step: .05 },
  wave: { wave: 'noise', freq: 400, to: 900, dur: 3.2, vol: .07, filter: 'lowpass', q: .5, attack: 1.4 },
  wind: { wave: 'noise', freq: 300, to: 500, dur: 2.5, vol: .03, filter: 'bandpass', q: 1.5, attack: 1 },
  murmur: { wave: 'noise', freq: 500, to: 650, dur: 1.6, vol: .045, filter: 'bandpass', q: .6, attack: .5 },
  lap: { wave: 'noise', freq: 1000, to: 500, dur: .5, vol: .05, filter: 'bandpass', q: 1.2, attack: .1 },
  cricket: [{ wave: 'pulse12', freq: 4200, dur: .03, vol: .025 }, { wave: 'pulse12', freq: 4200, dur: .03, vol: .025, delay: .06 }, { wave: 'pulse12', freq: 4200, dur: .03, vol: .022, delay: .12 }],
  jingle: { wave: 'triangle', freq: 1568, dur: .25, vol: .03, arp: [0, 4, 7, 12], step: .04 },
  count: { wave: 'square', freq: 1046, dur: .03, vol: .05 },
  whoosh: { wave: 'noise', freq: 600, to: 2400, dur: .2, vol: .1, filter: 'bandpass', q: 1.5 },
  pop: { wave: 'sine', freq: 600, to: 1200, dur: .05, vol: .12 }
};
G.defineSounds = () => { const A = G.game.audio; for (const k in G.SFX) A.define(k, G.SFX[k]); };
G.sfx = (name, o) => { if (G.game && G.game.audio && !G.endedQuiet) G.game.audio.sfx(name, o); };

/* ---- music ---- */
G.musicNow = null;
G.music = (id, o = {}) => {
  if (!G.game || G.endedQuiet) return;
  if (id === G.musicNow && !o.restart) return;
  G.musicNow = id;
  const A = G.game.audio;
  if (!id) { A.music(null); return; }
  const song = G.SONGS[id]; if (!song) return;
  A.music(song, Object.assign({ fade: o.fade === undefined ? .6 : o.fade }, o.sync ? { sync: true } : {}));
};
G.sting = id => { if (!G.game || G.endedQuiet) return; const s = G.JINGLES[id]; if (s) G.game.audio.sting(s); };

/* ---- ambience loops: sounds fired on the cosmetic stream while a place is shown ---- */
G.amb = { kind: null, t: {} };
G.ambience = kind => { G.amb.kind = kind; G.amb.t = {}; };
const AMB = {
  beach: [['wave', 5.5, 7], ['wind', 7, 11], ['seagull', 9, 18]],
  court: [['wave', 5.5, 7], ['murmur', 1.3, 1.8], ['seagull', 10, 20]],
  pool: [['lap', 1.4, 2.6], ['wind', 8, 12], ['seagull', 12, 22]],
  promenade: [['wave', 6, 8], ['wind', 8, 12], ['murmur', 2.5, 4]],
  villa: [['wave', 7, 10]],
  night: [['cricket', .5, 1.4], ['wave', 6, 9]],
  casino: [['murmur', 1.2, 1.8], ['jingle', 2.5, 6]],
  map: [['wave', 6, 9], ['wind', 6, 10]]
};
G.tickAmbience = dt => {
  const L = AMB[G.amb.kind]; if (!L || !G.game.audio.ready) return;
  for (const [snd, a, b] of L) {
    const t = G.amb.t; t[snd] = (t[snd] === undefined ? G.rand('cosmetic', 0, a) : t[snd]) - dt;
    if (t[snd] <= 0) { G.sfx(snd, { vary: .12 }); t[snd] = G.rand('cosmetic', a, b); }
  }
};

/* ---- Animalese voices ----
 * profile: { base Hz, range semitones, rate letters/s, formant shift, wave, breath 0..1, vib Hz }
 * vowels a 70 ms voiced tone through two bandpass formants; plosives a noise burst then a schwa; fricatives high-passed
 * noise; nasals and liquids a soft triangle; the pitch walks gently, seeded by the line, so a line always sounds the same */
const FORM = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [500, 900], u: [350, 750], y: [300, 2300], schwa: [500, 1500] };
const PLOS = 'bdgkpt', FRIC = 'fhszcxq', NAS = 'lmnrwjv';
G.voice = {
  _st: null,
  /** the voice of one letter (from the dialog's per-letter hook): ch, its index in the page text, the text */
  letter(who, ch, i, text, mood) {
    const A = G.game.audio, bus = A.bus && A.bus('voice'); if (!bus || !A.ready || A.muted) return;
    const P = G.voiceOf(who); if (!P) return;
    const st = this._st && this._st.text === text && this._st.who === who && i >= this._st.i ? this._st : (this._st = { text, who, i: 0, n: 0, r: E.rng(G.hashStr(text + who)) });
    while (st.i < i) { st.n = clamp(st.n + (st.r() - .5) * .9, -1, 1); st.i++; }
    st.n = clamp(st.n + (st.r() - .5) * .9, -1, 1); st.i = i + 1;
    let semi = P.range * st.n;
    const end = text.slice(i).match(/^[^.!?]*([.!?])/), last4 = end && end[0].length <= 5;
    const m = mood || (/!/.test(text) ? 'excited' : null);
    if (end && end[1] === '?' && last4) semi += 4 - end[0].length;      // questions rise at the end
    if (m === 'excited' || m === 'happy') semi += m === 'happy' ? 2 : 3;
    if (m === 'sad') semi -= 2; if (m === 'angry') semi -= 1;
    this._sound(P, ch.toLowerCase(), P.base * Math.pow(2, semi / 12), A.ctx.currentTime + .005, bus, m);
  },
  _sound(P, c, f, t, bus, mood) {
    const A = G.game.audio, ctx = A.ctx;
    const out = ctx.createGain(); out.connect(bus);
    const wave = mood === 'angry' ? 'pulse' : P.wave;
    const osc = (freq, dur, vol, type) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (type === 'pulse') o.setPeriodicWave(A._pulse(.25)); else o.type = type === 'saw' ? 'sawtooth' : type || 'triangle';
      o.frequency.setValueAtTime(f, t); if (P.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = P.vib; lg.gain.value = f * .03; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + .02); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur);
      o.connect(g); o.start(t); o.stop(t + dur + .02); return g;
    };
    const noise = (dur, vol, type, freq, at = t) => {
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = A._noise; fl.type = type; fl.frequency.value = freq; fl.Q.value = .8;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(vol, at + .004); g.gain.linearRampToValueAtTime(0, at + dur);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(at, G.rand('cosmetic', 0, .5)); s.stop(at + dur + .02);
    };
    const formant = (src, [f1, f2]) => {
      for (const [ff, gain] of [[f1, 1], [f2, .55]]) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff * P.formant; b.Q.value = 6; const g = ctx.createGain(); g.gain.value = gain * 2.6; src.connect(b); b.connect(g); g.connect(out); }
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; const g2 = ctx.createGain(); g2.gain.value = .35; src.connect(lp); lp.connect(g2); g2.connect(out);
    };
    if (FORM[c]) formant(osc(f, .07, .22, wave), FORM[c]);
    else if (PLOS.includes(c)) { noise(.012, .12, 'bandpass', 2500); const s = osc(f, .04, .18, wave); formant(s, FORM.schwa); }
    else if (FRIC.includes(c)) noise(.045, .07, 'highpass', 3500);
    else if (NAS.includes(c)) { const s = osc(f, .05, .16, 'triangle'), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; s.connect(lp); lp.connect(out); }
    if (P.breath && FORM[c]) noise(.05, .025 * P.breath, 'highpass', 5000);
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, 600);
  },
  /** a bark with no box: "MINE!", cheers, laughs, gasps; letters at the speaker's rate */
  say(text, who, mood) {
    const A = G.game.audio, bus = A.bus && A.bus('voice'); if (!bus || !A.ready || A.muted) return;
    const P = G.voiceOf(who); if (!P) return;
    let t = A.ctx.currentTime + .01; const r = E.rng(G.hashStr(text + who)); let n = 0;
    const rate = P.rate * (/!/.test(text) ? 1.15 : 1) * (mood === 'angry' ? 1.2 : mood === 'sad' ? .8 : 1);
    for (let i = 0; i < text.length && i < 40; i++) {
      const c = text[i].toLowerCase();
      if (c === ',') { t += .12; continue; } if (c === '.' || c === '!' || c === '?') { t += .1; continue; } if (!/[a-z]/.test(c)) { t += .03; continue; }
      n = clamp(n + (r() - .5) * .9, -1, 1);
      let semi = P.range * n + (/!/.test(text) ? 3 : 0) + (mood === 'happy' ? 2 : mood === 'sad' ? -2 : 0);
      if (/^ha/i.test(text)) semi += i * .8;   // a laugh rises
      this._sound(P, c, P.base * Math.pow(2, semi / 12), t, bus, mood);
      t += 1 / rate;
    }
  }
};
/** a dialog voice function for a speaker (the engine calls it for every letter typed) */
G.voiceFn = (who, mood) => (ch, i, text) => { if (/[a-z]/i.test(ch)) G.voice.letter(who, ch, i, text, mood); };


/* ---- 13-rigs.js ---- */
/* 13-rigs: the rig factory (a cast member in a swimsuit with accessories), the accessory drawers (the engine's extras
 * hook: sunglasses, ribbons, flowers, necklaces, wristbands, chains, whistles, glasses) and portraits. Each match player,
 * NPC and preview owns its own rig: a rig keeps its animation state. */
const accDraw = {
  shades(g, P, c, kind) {
    if (!c.front) return;
    const { Sp, J, R, u } = c, L = Sp(J.head, R * .95, -R * .38, R * .02), Rr = Sp(J.head, R * .95, R * .38, R * .02);
    if (kind === 'heartshades') {
      for (const e of [L, Rr]) { px.disc(g, e[0], e[1], Math.max(1, u * .9), '#ff5fa2'); px.dot(g, e[0] - .6, e[1] - .6, '#ffd0e8'); }
      px.line(g, L[0], L[1], Rr[0], Rr[1], '#ff5fa2');
    } else if (kind === 'aviators') {
      px.line(g, L[0] - 1, L[1] - 1, Rr[0] + 1, Rr[1] - 1, '#ffd36a');
      for (const e of [L, Rr]) { px.disc(g, e[0], e[1], Math.max(1, u * .85), '#2a1e10'); px.dot(g, e[0] - .5, e[1] - .6, '#ffd36a'); }
    } else if (kind === 'glasses') {
      for (const e of [L, Rr]) { px.rect(g, e[0] - 1, e[1] - 1, 3, 1, '#2a2434'); px.rect(g, e[0] - 1, e[1] + 1, 3, 1, '#2a2434'); }
    } else {   // wraparound sport shades
      px.line(g, L[0] - 1.5, L[1], Rr[0] + 1.5, Rr[1], '#20262e', Math.max(2, Math.round(u * 1.1)));
      px.line(g, L[0] - 1.5, L[1] - 1, Rr[0] + 1.5, Rr[1] - 1, '#e8eef2');
      px.dot(g, L[0], L[1], '#5a8ac8');
    }
  },
  ribbon(g, P, c, col) { const t = E.tones(col); px.poly(g, [[P[0], P[1]], [P[0] - 3, P[1] - 2], [P[0] - 3, P[1] + 2]], t.base); px.poly(g, [[P[0], P[1]], [P[0] + 3, P[1] - 2], [P[0] + 3, P[1] + 2]], t.sh); px.rect(g, P[0] - 1, P[1] - 1, 2, 2, t.lt); },
  hibiscus(g, P) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; px.disc(g, P[0] + Math.cos(a) * 1.8, P[1] + Math.sin(a) * 1.8, 1.3, k % 2 ? '#e8283a' : '#ff5a5a'); } px.dot(g, P[0], P[1], '#ffd04a'); },
  necklace(g, P, c) { if (!c.front) return; for (let k = -2; k <= 2; k++) px.dot(g, P[0] + k * 1.5, P[1] + 1 - Math.abs(k) * .5, k % 2 ? '#f8f4e8' : '#e8d8c0'); },
  chain(g, P, c) { if (!c.front) return; for (let k = -3; k <= 3; k++) px.dot(g, P[0] + k * 1.2, P[1] + 2 - Math.abs(k) * .6, '#ffd36a'); px.rect(g, P[0] - 1, P[1] + 2, 2, 2, '#ffe9a0'); },
  whistle(g, P, c) { if (!c.front) return; px.line(g, P[0] - 2, P[1] - 1, P[0], P[1] + 3, '#e83a3a'); px.rect(g, P[0] - 1, P[1] + 3, 3, 2, '#c8ccd8'); },
  band(g, P, c, col) { px.disc(g, P[0], P[1], Math.max(1.2, c.u * .95), E.tones(col).base); px.dot(g, P[0] - .5, P[1] - .5, E.tones(col).lt); }
};
/** extras for a list of accessory ids (plus a character's own: Sonny's chain, Bo's whistle, Pepper's glasses) */
G.accExtras = (accs, accent, own = []) => {
  const X = [];
  for (const id of accs) {
    if (id === 'sportshades' || id === 'heartshades' || id === 'aviators') X.push({ at: 'face', draw: (g, P, c) => accDraw.shades(g, P, c, id) });
    else if (id === 'ribbon') X.push({ at: 'hair', draw: (g, P, c) => accDraw.ribbon(g, P, c, accent || '#d8303a') });
    else if (id === 'hibiscus') X.push({ at: 'hair', draw: (g, P) => accDraw.hibiscus(g, P) });
    else if (id === 'shellnecklace') X.push({ at: 'neck', draw: (g, P, c) => accDraw.necklace(g, P, c) });
    else if (id === 'wristbands') { X.push({ at: 'wristL', draw: (g, P, c) => accDraw.band(g, P, c, accent || '#ffffff') }); X.push({ at: 'wristR', draw: (g, P, c) => accDraw.band(g, P, c, accent || '#ffffff') }); }
  }
  for (const k of own) X.push(k === 'aviators' ? { at: 'face', draw: (g, P, c) => accDraw.shades(g, P, c, 'aviators') } : k === 'glasses' ? { at: 'face', draw: (g, P, c) => accDraw.shades(g, P, c, 'glasses') } : { at: 'neck', draw: (g, P, c) => accDraw[k](g, P, c) });
  return X;
};
/** the hat an accessory list asks for (sweatband, visor, sun hat), or the character's own */
const accHat = (accs, cast) => {
  if (accs.includes('sunhat')) return { style: 'sunhat', color: '#f0d890', band: '#ff5f7a' };
  if (accs.includes('visor')) return { style: 'visor', color: '#ffffff', brim: cast.color || '#3a6ad8' };
  if (accs.includes('sweatband')) return { style: 'band', color: '#ffffff' };
  if (cast.band) return { style: 'band', color: cast.band };
  return cast.hat || null;
};
/**
 * G.makeRig(id, { suit, acc, kit: 'final' | null, size }) -> an E.Humanoid dressed as that character.
 * Fighters wear a swimsuit (their signature one by default); Sonny wears his loud shirt (or his final kit), Pepper her
 * vest (or the Pinstripe racer), the staff their work clothes.
 */
G.makeRig = (id, o = {}) => {
  const c = G.CAST[id] || G.CAST.rin, accs = (o.acc || c.acc || []).slice();
  const base = { size: (o.size || c.size || 1.25), build: c.build || 'athletic', weapon: null, hair: c.hair || 'short', face: { eyes: 'big', bangs: c.bangs === undefined ? .5 : c.bangs },
    colors: { skin: c.skin, hair: c.hairColor, eye: c.eyes || '#1a1320', iris: c.iris || '#3a4a8a', boot: c.skin, glove: c.skin } };
  if (c.shoulders) base.shoulderHalf = 2.95 + c.shoulders;   // (the athletic build's, broadened)
  let own = [];
  const kit = o.kit === 'final' && c.finalKit ? c.finalKit : null;
  const suitId = o.suit || (c.host || c.staff ? null : c.suit);
  if (kit || suitId) {
    const S = kit ? { cut: kit.cut, pattern: kit.pattern, colors: kit.colors } : G.SUITS[suitId] || G.SUITS[c.suit];
    base.outfit = 'swim'; base.swim = { cut: S.cut, pattern: S.pattern, colors: S.colors, brief: !!S.brief };
    base.sleeves = S.cut === 'rash' ? (S.sleeves || 'short') : 'none';
    base.colors.cloth = S.colors.main; base.colors.trim = S.colors.trim; base.colors.pants = S.colors.main;
    if (S.cut === 'rash' && id === 'sonny') { base.shorts = .5; base.colors.pants = '#16141c'; }
  } else if (c.outfit) {
    const f = c.outfit;
    base.outfit = c.robe ? 'robe' : 'shirt'; base.sleeves = id === 'bo' ? 'none' : 'short';
    if (id === 'sonny' || id === 'kai') { base.pattern = id === 'sonny' ? 'palms' : (c.pat || 'floral'); base.shorts = .55; }
    if (id === 'bo') base.shorts = .5;
    Object.assign(base.colors, { cloth: f.cloth, trim: f.trim, pants: f.pants, boot: f.boot, pattern: f.pattern, belt: f.trim, strap: f.strap });
  }
  if (id === 'sonny') own = ['aviators', 'chain']; else if (id === 'pepper') own = ['glasses']; else if (id === 'bo') own = ['whistle'];
  if (accs.some(a => G.ACCS[a] && G.ACCS[a].shades)) own = own.filter(k => k !== 'aviators' && k !== 'glasses');
  base.hat = accHat(accs, c);
  if (c.staff || c.host) base.colors.strap = base.colors.strap || '#8a5a32'; else base.colors.strap = o.sandals ? '#e8c060' : null;
  const rig = new E.Humanoid(base);
  rig.extras = G.accExtras(accs, c.accColor || (base.swim && base.swim.colors.accent), own);
  rig.castId = id; rig.suitId = suitId; rig.accs = accs; rig.kit = kit ? 'final' : null;
  return rig;
};
/** dress an existing rig again (try-on, a gift accepted): a new rig in the same place, keeping its position */
G.redress = (rig, id, o) => { const n = G.makeRig(id, o); n.x = rig.x; n.y = rig.y; n.z = rig.z; n.facing = rig.facing; return n; };
/** a portrait with a soft background in the character's color */
G.portrait = (g, rig, x, y, size = 40, o = {}) => {
  const c = G.CAST[rig.castId] || {};
  rig.drawPortrait(g, x, y, size, Object.assign({ zoom: size / 13, turn: .45, bg: o.bg || E.shade(c.color || '#2a6a7a', -.45), border: o.border || '#f6d38a' }, o));
};
/** shared portrait rigs for dialogs and menus (one per character, in their current outfit) */
G.portraitRigs = {};
G.portraitRig = (id) => {
  const want = G.wearOf ? G.wearOf(id) : null, key = id + JSON.stringify(want || {});
  let r = G.portraitRigs[id];
  if (!r || r._key !== key) { r = G.portraitRigs[id] = G.makeRig(id, want || {}); r._key = key; r.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 }); }
  return r;
};


/* ---- 14-world-art.js ---- */
/* 14-world-art: the resort's look. Time-of-day presets (sky, sea, light), a sky painter that meets the map's far edge,
 * the court map (sea, wet sand, sand, rope lines), resort shapes (E.SHAPES, per docs/ASSETS.md), the crowd, the court's
 * set dressing and effects helpers (hearts, confetti, fireworks, coin showers, sweat, the glare star). */
G.TOD = {
  morning: { sky: ['#6cb8e8', '#a8dcf0', '#f8e4c8'], sea: ['#1e8aa8', '#2ec4c9', '#9ff3e8'], ambient: .9, dark: [70, 90, 140], sun: { x: .22, y: .2, r: 13, color: '#fff4d0' }, clouds: '#ffffff', isle: '#3a8a8a', sand: 1 },
  afternoon: { sky: ['#2a8ee0', '#78c8f0', '#d0f0f8'], sea: ['#0b5a7a', '#2ec4c9', '#9ff3e8'], ambient: 1, dark: [60, 70, 110], sun: { x: .78, y: .14, r: 12, color: '#ffffe8' }, clouds: '#ffffff', isle: '#2f7a78', sand: 1.03 },
  sunset: { sky: ['#3a2a70', '#c84a7a', '#ff8a5e', '#ffd090'], sea: ['#3a2a60', '#c86a6a', '#ffb880'], ambient: .82, dark: [120, 60, 90], sun: { x: .68, y: .62, r: 18, color: '#ffd86a' }, clouds: '#ffb0a0', isle: '#4a2a5a', sand: .95, warm: true },
  night: { sky: ['#06081c', '#10143a', '#24285a'], sea: ['#060a24', '#0e2040', '#1e3a5a'], ambient: .38, dark: [20, 24, 60], moon: { x: .76, y: .16, r: 9, color: '#f4f0d8' }, clouds: '#3a3a6a', isle: '#0c1028', sand: .55, stars: true },
  rain: { sky: ['#4a5868', '#7a8898', '#a8b4c0'], sea: ['#2a4a5a', '#4a7a88', '#8ab0b8'], ambient: .72, dark: [60, 70, 90], clouds: '#8a96a4', isle: '#3a4a50', sand: .85, overcast: true },
  cloudy: { sky: ['#6a90b0', '#a0c0d4', '#dce8ec'], sea: ['#1e6a88', '#3ab0b8', '#a0e0e0'], ambient: .88, dark: [70, 80, 110], sun: { x: .3, y: .18, r: 10, color: '#f8f8f0' }, clouds: '#f0f4f8', isle: '#3a7a80', sand: .95, overcast: true }
};
/** which look a slot and weather give */
G.todFor = (slot, weather, day) => slot === 2 ? 'night' : weather === 'rain' ? 'rain' : weather === 'golden' && slot === 1 ? 'sunset' : weather === 'cloudy' ? 'cloudy' : slot === 0 ? 'morning' : 'afternoon';
G.applyLight = (tod, o = {}) => {
  const P = G.TOD[tod] || G.TOD.afternoon, L = G.game.lights;
  L.enabled = true; L.ambient = o.ambient !== undefined ? o.ambient : P.ambient; L.dark = P.dark.slice(); L.tint = P.warm ? .45 : .32;
  if (L.refresh) L.refresh();
  G.curTod = tod;
};
/** the sky, sun or moon, clouds, distant islands, the volcano's silhouette and a strip of far sea down to the horizon
 *  (the screen y where the map's far edge is drawn); stars, the moon and a lit yacht at night */
G.drawSky = (r, tod, horizon, o = {}) => {
  if (!r.ctx) return;
  G.paintSky(r.ctx, r.bw || r.W + 2, r.bh || r.H + 2, tod, horizon === undefined ? Math.round(r.H * .45) : horizon, G.now(), o);
};
/* the painter itself, on the buffer's context (buffer pixels; hz: the horizon row) */
G.paintSky = (g, W, H, tod, hz, t, o = {}) => {
  const P = G.TOD[tod] || G.TOD.afternoon;
  // gradient bands
  const cs = P.sky, n = cs.length - 1, top = 0, bot = Math.max(10, hz - 10);
  for (let y = top; y < bot; y += 2) { const k = (y - top) / (bot - top) * n, i = Math.min(n - 1, Math.floor(k)); px.rect(g, 0, y, W, 2, E.mix(cs[i], cs[i + 1], k - i)); }
  if (P.stars) { const rr = E.rng(7); for (let i = 0; i < 90; i++) { const x = Math.floor(rr() * W), y = Math.floor(rr() * (bot - 6)), tw = (Math.sin(t * 2 + i * 1.7) + 1) / 2; px.dot(g, x, y, tw > .6 ? '#ffffff' : '#8a90c8'); } }
  const S = P.sun || P.moon;
  if (S) {
    const sx = Math.round(W * S.x), sy = Math.round(bot * S.y / .7);
    if (P.sun) { px.blend(g, .25, 'add', () => px.disc(g, sx, sy, S.r * 2.2, S.color)); px.blend(g, .35, 'add', () => px.disc(g, sx, sy, S.r * 1.4, S.color)); }
    px.disc(g, sx, sy, S.r, S.color); px.disc(g, sx - 1, sy - 1, S.r - 2, E.shade(S.color, .25));
    if (P.moon) { px.disc(g, sx + 3, sy - 2, S.r - 1, cs[0]); px.blend(g, .2, 'add', () => px.disc(g, sx, sy, S.r * 2, '#a0a8ff')); }
  }
  // clouds drifting
  const cc = P.clouds, rr = E.rng(11), nC = P.overcast ? 9 : 5;
  for (let i = 0; i < nC; i++) {
    const base = rr() * (W + 120), x = ((base + t * (3 + rr() * 4)) % (W + 120)) - 60, y = 8 + rr() * (bot * .45), s = .7 + rr() * .8;
    px.blend(g, P.overcast ? .85 : .7, 'normal', () => { for (const [dx, dy, rad] of [[0, 0, 8], [9, -3, 10], [19, 0, 8], [10, 3, 9]]) px.ell(g, x + dx * s, y + dy * s, rad * s * 1.4, rad * s * .7, cc); });
    px.blend(g, .3, 'normal', () => px.ell(g, x + 10 * s, y + 4 * s, 22 * s, 3 * s, E.shade(cc, -.25)));
  }
  // distant islands and the volcano
  const isle = P.isle, iy = hz - 10;
  px.poly(g, [[W * .05, iy], [W * .1, iy - 7], [W * .16, iy - 9], [W * .22, iy - 4], [W * .26, iy]], isle);
  px.poly(g, [[W * .58, iy], [W * .66, iy - 16], [W * .7, iy - 22], [W * .72, iy - 22], [W * .77, iy - 14], [W * .86, iy]], E.shade(isle, -.12));
  px.poly(g, [[W * .69, iy - 22], [W * .705, iy - 25], [W * .73, iy - 22]], E.shade(isle, -.25));
  if (!P.stars) for (let i = 0; i < 3; i++) { const k = (t * .3 + i * .33) % 1; px.blend(g, .4 * (1 - k), 'normal', () => px.disc(g, W * .71 + k * 6, iy - 26 - k * 14, 2 + k * 3, '#e8e8f0')); }
  px.poly(g, [[W * .88, iy], [W * .92, iy - 5], [W * .97, iy - 3], [W, iy]], isle);
  // the far sea down to the horizon, with glints
  const sc = P.sea;
  for (let y = iy; y < hz + 2; y++) { const k = (y - iy) / Math.max(1, hz - iy); px.rect(g, 0, y, W, 1, E.mix(sc[0], sc[1], k * .6)); }
  const gr = E.rng(23);
  for (let i = 0; i < 24; i++) { const x = (gr() * W + t * 6 * (gr() + .2)) % W, y = iy + 1 + gr() * (hz - iy); if ((Math.sin(t * 3 + i) + 1) / 2 > .5) px.rect(g, x, y, 2 + (i % 3), 1, P.stars ? '#6a80c0' : E.shade(sc[2], .2)); }
  if (P.stars && o.yacht !== false) { const x = W * .3 + Math.sin(t * .05) * 10, y = iy + 2; px.rect(g, x, y, 18, 2, '#1a1a2a'); px.rect(g, x + 4, y - 3, 9, 3, '#2a2a3a'); for (let k = 0; k < 4; k++) px.dot(g, x + 5 + k * 2, y - 2, '#ffe08a'); px.dot(g, x + 9, y - 8, '#ff5fa2'); px.line(g, x + 9, y - 3, x + 9, y - 8, '#3a3a4a'); }
};

/* ---- materials ---- */
const MAT = (name, spec) => { E.MATERIALS[name] = spec; return name; };
G.mat = (hex, pattern = 'none', extra = {}) => { const n = 'aoa' + hex.slice(1) + pattern; if (!E.MATERIALS[n]) MAT(n, Object.assign({ color: hex, pattern }, extra)); return n; };
MAT('aoa_sand', { color: '#e8cc94', pattern: 'speck', amount: .1 });
MAT('aoa_boardwalk', { color: '#d8c8a8', pattern: 'planks', bw: 3, len: 18 });
MAT('aoa_pooltile', { color: '#7ad8e0', pattern: 'tiles', size: 4 });
MAT('aoa_felt', { color: '#1e7a4a', pattern: 'cloth' });
MAT('aoa_carpet', { color: '#5a1a3a', pattern: 'cloth' });
MAT('aoa_gold', { color: '#ffd36a', pattern: 'metal' });
MAT('aoa_thatch', { color: '#c8a050', pattern: 'thatch' });
MAT('aoa_white', { color: '#f0f0ea', pattern: 'none' });
MAT('aoa_chrome', { color: '#c8ccd8', pattern: 'metal' });
MAT('aoa_neon', { color: '#ff5fa2', pattern: 'none', glow: 1 });
MAT('aoa_neonc', { color: '#5ff0ff', pattern: 'none', glow: 1 });
MAT('aoa_glow', { color: '#ffe8a0', pattern: 'none', glow: 1 });
MAT('aoa_dark', { color: '#2a2434', pattern: 'none' });
MAT('aoa_black', { color: '#141018', pattern: 'none' });
MAT('aoa_red', { color: '#d8302a', pattern: 'cloth' });
MAT('aoa_navy', { color: '#1d2433', pattern: 'cloth' });
MAT('aoa_rope', { color: '#c8a070', pattern: 'none' });

/* ---- resort shapes (feet on the point, written facing south) ---- */
const S = E.SHAPES;
S.umbrella = { about: 'beach umbrella, striped canopy', tags: 'beach', params: { color: '#ff5f7a', stripe: '#ffffff' }, make: p => [['cyl', 'aoa_white', [0, 0, 0], .8, 30], ['cyl', G.mat(p.color, 'cloth'), [0, 0, 26], 15, 4, { r2: 2, seg: 8 }], ['cyl', G.mat(p.stripe, 'cloth'), [0, 0, 29], 6, 2, { r2: 1, seg: 8 }], ['ball', 'aoa_white', [0, 0, 31.5], 1.2]] };
S.lounger = { about: 'sun lounger', tags: 'beach', params: { color: '#2ec4c9' }, make: p => [['box', 'aoa_white', [0, 0, 3], [10, 26, 2]], ['mirror', 'xy', ['box', 'aoa_white', [4, 11, 0], [1.5, 1.5, 3]]], ['box', G.mat(p.color, 'cloth'), [0, 2, 5], [9, 20, 1]], ['box', G.mat(p.color, 'cloth'), [0, -11, 5], [9, 6, 8], { rot: [-35, 0, 0] }]] };
S.beachtowel = { about: 'beach towel', tags: 'beach', params: { color: '#ff9e5e', stripe: '#ffffff' }, make: p => [['box', G.mat(p.color, 'cloth'), [0, 0, 0], [12, 24, .6]], ['box', G.mat(p.stripe, 'cloth'), [0, -6, 0], [12, 3, .8]], ['box', G.mat(p.stripe, 'cloth'), [0, 6, 0], [12, 3, .8]]] };
S.cooler = { about: 'cooler box', tags: 'beach', mats: { b: G.mat('#2a8ad8', 'glaze'), l: 'aoa_white' }, parts: [['box', 'b', [0, 0, 0], [10, 7, 7]], ['box', 'l', [0, 0, 7], [10.5, 7.5, 1.5]], ['box', 'aoa_dark', [0, 0, 8.5], [5, 1, 1]]] };
S.sandcastle = { about: 'sandcastle', tags: 'beach', parts: [['box', 'aoa_sand', [0, 0, 0], [12, 12, 4]], ['mirror', 'xy', ['cyl', 'aoa_sand', [4.5, 4.5, 4], 2.2, 5, { seg: 6 }]], ['cyl', 'aoa_sand', [0, 0, 4], 3, 8, { seg: 6 }], ['cyl', 'aoa_red', [0, 0, 12], .3, 4], ['box', 'aoa_red', [1, 0, 14.5], [2, .3, 1.5]]] };
S.surfboard = { about: 'surfboard standing in the sand', tags: 'beach', params: { color: '#ffd04a' }, make: p => [['cyl', G.mat(p.color, 'glaze'), [0, 0, 0], 3, 30, { sq: .3, seg: 10 }], ['box', 'aoa_white', [0, 1, 4], [.6, .5, 24]]] };
S.surfrack = { about: 'surfboard rack', tags: 'beach', parts: [['mirror', 'x', ['box', 'oak', [10, 0, 0], [2, 2, 16]]], ['box', 'oak', [0, 0, 14], [22, 2, 2]], ['box', G.mat('#ff5f7a', 'glaze'), [-6, 2, 0], [5, 1.5, 26]], ['box', G.mat('#2ec4c9', 'glaze'), [0, 2, 0], [5, 1.5, 28]], ['box', G.mat('#ffd04a', 'glaze'), [6, 2, 0], [5, 1.5, 24]]] };
S.lifeguard = { about: 'lifeguard tower', tags: 'beach', mats: { w: 'aoa_white', r: 'aoa_red' }, parts: [['mirror', 'xy', ['box', 'w', [6, 6, 0], [2, 2, 22]]], ['box', 'w', [0, 0, 22], [16, 16, 2]], ['box', 'r', [0, 0, 24], [14, 14, 10]], ['box', 'aoa_dark', [0, 7.2, 27], [8, .5, 5]], ['cyl', 'w', [0, 0, 34], 11, 5, { r2: 1, seg: 4 }], ['wedge', 'w', [0, 12, 0], [6, 8, 22]]] };
S.bleacher = { about: 'three-tier bleachers', tags: 'beach stadium', params: { len: 48, color: '#2ec4c9' }, make: p => [['box', 'aoa_white', [0, 8, 0], [p.len, 8, 6]], ['box', G.mat(p.color, 'planks'), [0, 8, 6], [p.len, 8, 1]], ['box', 'aoa_white', [0, 0, 0], [p.len, 8, 12]], ['box', G.mat(p.color, 'planks'), [0, 0, 12], [p.len, 8, 1]], ['box', 'aoa_white', [0, -8, 0], [p.len, 8, 18]], ['box', G.mat(p.color, 'planks'), [0, -8, 18], [p.len, 8, 1]]] };
S.scoreboard = { about: 'flip scoreboard on a stand', tags: 'beach stadium', parts: [['mirror', 'x', ['box', 'aoa_white', [9, 0, 0], [1.5, 1.5, 14]]], ['box', G.mat('#1a3a5a', 'none'), [0, 0, 14], [24, 2, 14]], ['box', 'aoa_gold', [0, 0, 28], [24, 2.4, 1.5]]] };
S.djbooth = { about: "Sonny's DJ booth: speakers and a gold disc", tags: 'beach party', parts: [['box', G.mat('#16141c', 'none'), [0, 0, 0], [26, 10, 14]], ['box', 'aoa_gold', [0, 5.2, 4], [24, .5, 2]], ['mirror', 'x', ['box', 'aoa_black', [17, 0, 0], [8, 8, 20]]], ['mirror', 'x', ['cyl', 'aoa_chrome', [17, 4.2, 12], 2.6, 1, { seg: 10 }]], ['cyl', 'aoa_gold', [0, 0, 14], 5, 1, { seg: 12 }], ['box', 'aoa_neon', [0, 5.3, 10], [20, .4, 1]]] };
S.netpost = { about: 'volleyball net post with a padded base', tags: 'beach sport', parts: [['cyl', G.mat('#2a6ad8', 'cloth'), [0, 0, 0], 2.6, 10], ['cyl', 'aoa_white', [0, 0, 10], 1.2, 42], ['ball', 'aoa_white', [0, 0, 52], 1.5]] };
S.tikibar = { about: 'tiki bar: a thatch hut with a counter and stools', tags: 'beach bar', parts: [['mirror', 'xy', ['cyl', 'bark', [14, 10, 0], 1.3, 30]], ['cyl', 'aoa_thatch', [0, 0, 28], 26, 12, { r2: 2, seg: 8 }], ['box', 'bark', [0, 10, 0], [30, 5, 13]], ['box', 'oak', [0, 10, 13], [32, 7, 1.5]], ['row', 3, [10, 0, 0], ['cyl', 'oak', [0, 17, 0], 2.5, 9, { seg: 8 }]], ['box', 'aoa_neonc', [0, 12.6, 9], [18, .3, 2]]] };
S.changinghut = { about: 'changing hut with a striped curtain', tags: 'beach', parts: [['box', 'aoa_white', [0, 0, 0], [16, 14, 26]], ['box', G.mat('#ff5f7a', 'cloth'), [0, 7.2, 2], [10, .5, 20]], ['wedge', 'aoa_thatch', [0, 0, 26], [18, 16, 6]], ['box', G.mat('#ffffff', 'cloth'), [-3, 7.4, 2], [2, .5, 20]], ['box', G.mat('#ffffff', 'cloth'), [3, 7.4, 2], [2, .5, 20]]] };
S.cabana = { about: 'pool cabana', tags: 'pool', parts: [['mirror', 'xy', ['box', 'aoa_white', [12, 10, 0], [2, 2, 26]]], ['box', G.mat('#2ec4c9', 'cloth'), [0, 0, 26], [28, 24, 2]], ['wedge', G.mat('#ffffff', 'cloth'), [0, 0, 28], [28, 24, 6]], ['box', 'oak', [0, 6, 0], [22, 6, 12]], ['box', 'aoa_white', [0, 6, 12], [24, 7, 1.5]]] };
S.poolfloat = { about: 'round pool float', tags: 'pool', params: { color: '#ffd04a' }, make: p => [['cyl', G.mat(p.color, 'glaze'), [0, 0, 0], 8, 2.5, { seg: 12 }], ['cyl', G.mat('#3a9ec8', 'none'), [0, 0, .5], 3.5, 2.3, { seg: 10 }]] };
S.flamingo = { about: 'inflatable flamingo', tags: 'pool', mats: { p: G.mat('#ff7ab8', 'glaze') }, parts: [['ball', 'p', [0, 2, 3], 7, { sz: .45 }], ['cyl', 'p', [0, -5, 3], 1.4, 12], ['ball', 'p', [0, -6, 15], 2.4], ['cyl', G.mat('#ffd04a', 'none'), [0, -8.5, 14.5], .8, 1.5, { r2: 0 }]] };
S.pooledge = { about: 'tiled pool coping', tags: 'pool', params: { len: 16 }, make: p => [['box', 'aoa_pooltile', [0, 0, 0], [p.len, 4, 2]]] };
S.deckchair = { about: 'deck chair', tags: 'pool beach', params: { color: '#ff9e5e' }, make: p => [['box', 'oak', [0, 0, 0], [10, 14, 1.5], { rot: [10, 0, 0] }], ['box', G.mat(p.color, 'cloth'), [0, -4, 4], [9, 6, 10], { rot: [-30, 0, 0] }], ['box', G.mat(p.color, 'cloth'), [0, 3, 4], [9, 8, 1]], ['mirror', 'x', ['box', 'oak', [4, 0, 0], [1, 14, 4]]]] };
S.slotmachine = { about: 'slot machine cabinet', tags: 'casino', params: { color: '#e8283a' }, make: p => [['box', G.mat(p.color, 'metal'), [0, 0, 0], [12, 10, 26]], ['box', 'aoa_black', [0, 5.2, 13], [9, .5, 6]], ['box', 'aoa_glow', [0, 5.3, 14], [7, .3, 4]], ['box', 'aoa_gold', [0, 0, 26], [12.5, 10.5, 2]], ['box', 'aoa_neonc', [0, 5.3, 23], [10, .3, 2]], ['cyl', 'aoa_chrome', [7, 0, 16], .6, 8], ['ball', 'aoa_red', [7, 0, 24], 1.4]] };
S.bjtable = { about: 'half-moon blackjack table', tags: 'casino', parts: [['cyl', 'walnut', [0, 0, 0], 4, 12, { seg: 8 }], ['cyl', 'aoa_felt', [0, 0, 12], 22, 2, { seg: 16, sq: .6 }], ['cyl', 'walnut', [0, 0, 11.5], 23, 1, { seg: 16, sq: .62 }]] };
S.roulettetable = { about: 'roulette table with the wheel bowl', tags: 'casino', parts: [['box', 'walnut', [0, 0, 0], [40, 18, 12]], ['box', 'aoa_felt', [0, 0, 12], [38, 16, 1]], ['cyl', 'walnut', [-14, 0, 13], 7, 3, { seg: 16 }], ['cyl', 'aoa_gold', [-14, 0, 14], 4, 2.5, { seg: 12 }]] };
S.cashier = { about: 'cashier cage', tags: 'casino', parts: [['box', 'walnut', [0, 0, 0], [30, 12, 14]], ['box', 'aoa_gold', [0, 0, 14], [30, 12, 1]], ['row', 7, [4.5, 0, 0], ['box', 'aoa_gold', [0, 5, 15], [.6, .6, 16]]], ['box', 'aoa_gold', [0, 5, 31], [30, 1, 1.5]], ['box', 'aoa_neon', [0, 6, 27], [16, .4, 3]]] };
S.neonsign = { about: 'neon sign on a post', tags: 'casino', params: { color: '#ff5fa2' }, make: p => [['cyl', 'aoa_dark', [0, 0, 0], 1, 26], ['box', 'aoa_black', [0, 0, 26], [22, 2, 10]], ['box', p.color === '#5ff0ff' ? 'aoa_neonc' : 'aoa_neon', [0, 1.2, 28], [18, .4, 6]]] };
S.velvetrope = { about: 'velvet rope on brass posts', tags: 'casino', parts: [['mirror', 'x', ['cyl', 'aoa_gold', [10, 0, 0], 1, 14]], ['mirror', 'x', ['ball', 'aoa_gold', [10, 0, 14.5], 1.4]], ['box', G.mat('#a8183a', 'cloth'), [0, 0, 11], [20, 1, 1.4]]] };
S.shopfront = { about: 'shop facade with an awning', tags: 'town shop', params: { color: '#ff8aa8' }, make: p => [['box', 'aoa_white', [0, 0, 0], [52, 10, 40]], ['box', G.mat(p.color, 'cloth'), [0, 9, 26], [54, 10, 2], { rot: [18, 0, 0] }], ['box', G.mat('#9fd8f0', 'glaze'), [-14, 5.2, 6], [16, .5, 16]], ['box', G.mat('#9fd8f0', 'glaze'), [14, 5.2, 6], [16, .5, 16]], ['box', 'walnut', [0, 5.3, 0], [10, .6, 22]], ['box', G.mat(p.color, 'none'), [0, 5.4, 32], [30, .5, 6]]] };
S.icecreamcart = { about: 'ice-cream cart with an umbrella', tags: 'town beach', parts: [['box', G.mat('#ffb2c8', 'glaze'), [0, 0, 4], [20, 10, 10]], ['mirror', 'x', ['cyl', 'aoa_dark', [7, 5.5, 0], 3, 1, { seg: 8 }]], ['cyl', 'aoa_white', [0, 0, 14], .6, 14], ['cyl', G.mat('#9ff3e8', 'cloth'), [0, 0, 26], 12, 3, { r2: 1, seg: 8 }]] };
S.planter = { about: 'stone planter with a flowering shrub', tags: 'town', parts: [['box', 'sandstone', [0, 0, 0], [12, 12, 7]], ['ball', 'shrub', [0, 0, 10], 6], ['ball', G.mat('#ff5f7a', 'none'), [2, 3, 13], 1.5], ['ball', G.mat('#ffd04a', 'none'), [-3, 2, 12], 1.3]] };
S.wardrobe = { about: 'tall wardrobe', tags: 'furniture', parts: [['box', 'birch', [0, 0, 0], [20, 10, 34]], ['box', 'aoa_dark', [0, 5.1, 2], [.5, .3, 30]], ['mirror', 'x', ['box', 'aoa_gold', [2, 5.3, 16], [1, .5, 3]]]] };
S.desk = { about: 'writing desk', tags: 'furniture', parts: [['box', 'birch', [0, 0, 11], [24, 12, 2]], ['mirror', 'xy', ['box', 'birch', [10, 5, 0], [2, 2, 11]]], ['box', G.mat('#f0e8d0', 'none'), [4, 0, 13], [7, 5, .5]], ['cyl', 'aoa_gold', [-7, -2, 13], 1.4, 3]] };
S.mailbox = { about: 'island mailbox on a post', tags: 'town', parts: [['box', 'oak', [0, 0, 0], [2, 2, 16]], ['box', G.mat('#2a6ad8', 'metal'), [0, 0, 16], [6, 10, 6]], ['box', 'aoa_red', [3.2, -3, 19], [.5, 1, 5]]] };
S.rug = { about: 'woven rug', tags: 'furniture', params: { color: '#ff9e5e' }, make: p => [['box', G.mat(p.color, 'cloth'), [0, 0, 0], [40, 26, .4]], ['box', G.mat('#fff8e8', 'cloth'), [0, 0, 0], [30, 16, .6]]] };
S.seaplane = { about: "Sonny's gold seaplane", tags: 'island vehicle', parts: [['mirror', 'y', ['box', 'aoa_white', [0, 9, 0], [30, 4, 4]]], ['mirror', 'y', ['box', 'aoa_chrome', [0, 9, 4], [2, 1, 8]]], ['cyl', 'aoa_gold', [0, 0, 12], 5, 26, { sq: 1 }], ['box', 'aoa_gold', [0, 0, 18], [12, 46, 1.5]], ['box', 'aoa_gold', [-14, 0, 14], [3, 14, 1.2]], ['box', 'aoa_gold', [-14, 0, 14], [3, 1.2, 10]]] };
S.dockplanks = { about: 'dock planks on posts', tags: 'island', params: { len: 48 }, make: p => [['box', 'planks', [0, 0, 2], [p.len, 16, 1.5]], ['mirror', 'xy', ['cyl', 'bark', [p.len / 2 - 2, 7, -4], 1.5, 8]]] };
S.lighthouse = { about: 'striped lighthouse', tags: 'island', parts: [['cyl', 'aoa_white', [0, 0, 0], 8, 16, { r2: 7 }], ['cyl', 'aoa_red', [0, 0, 16], 7, 14, { r2: 6 }], ['cyl', 'aoa_white', [0, 0, 30], 6, 14, { r2: 5 }], ['cyl', 'aoa_glow', [0, 0, 44], 4, 6], ['cyl', 'aoa_red', [0, 0, 50], 5, 4, { r2: 0 }]], lights: [[0, 0, 46, '#fff0a0', 90]] };
S.chairstool = { about: 'bar stool', tags: 'bar', parts: [['cyl', 'aoa_chrome', [0, 0, 0], .8, 9], ['cyl', G.mat('#e8283a', 'cloth'), [0, 0, 9], 3, 1.5, { seg: 10 }]] };
S.prizecounter = { about: 'casino prize counter with a display', tags: 'casino', parts: [['box', 'walnut', [0, 0, 0], [28, 10, 13]], ['box', G.mat('#9fd8f0', 'glaze'), [0, 0, 13], [26, 8, 6]], ['box', 'aoa_gold', [0, 0, 19], [28, 10, 1]], ['box', 'aoa_neonc', [0, 5.2, 9], [20, .4, 2]]] };

/* ---- the court map: sea (rows 0-5, blocked), wet sand (row 6), sand; rope lines; built once ---- */
const CR = G.C;
G.courtFloor = (x, y, tag) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5, m2 = E.noise2(x * .2, y * .2);
  if (tag === 'sea') { const k = clamp(y / 96, 0, 1), c = E.hex(E.mix('#0b5a7a', '#2ec4c9', k)), sp = n * 10 + m2 * 12; return [c[0] + sp, c[1] + sp, c[2] + sp]; }
  if (tag === 'wet') { const k = (y - 96) / 16; return k < .25 ? [220 + n * 20, 236 + n * 10, 230] : [201 + n * 16 + m * 20, 160 + n * 14 + m * 16, 106 + n * 10]; }
  // rope lines: 2 units wide, blue
  const onX = (Math.abs(x - CR.X0) < 1 || Math.abs(x - CR.X1) < 1) && y >= CR.Y0 - 1 && y <= CR.Y1 + 1;
  const onY = (Math.abs(y - CR.Y0) < 1 || Math.abs(y - CR.Y1) < 1) && x >= CR.X0 - 1 && x <= CR.X1 + 1;
  if (tag === 'court' && (onX || onY)) { const w = n * 16; return [42 + w, 106 + w, 216 + w * .5]; }
  const g = 236 + n * 26 + m * 22 + (m2 > .62 ? -14 : 0);
  return [g, g * .9, g * .68];
};
G.makeCourtMap = () => {
  const rows = [];
  for (let r = 0; r < CR.MAP_H; r++) rows.push((r < 6 ? 'w' : r === 6 ? 'e' : 's').repeat(CR.MAP_W));
  const map = new E.TileMap({ rows, legend: { w: { floor: 'sea', block: true }, e: { floor: 'wet' }, s: { floor: 'court' } }, floorTex: G.courtFloor, outside: false, ao: 0, types: {} });
  return map;
};

/* ---- the crowd on the far-side bleachers, and the court's set dressing ---- */
G.makeCrowd = (seed = 3, n = 24) => {
  const r = E.rng(seed), out = [];
  const shirts = ['#ff5f7a', '#ffd04a', '#2ec4c9', '#ffffff', '#ff9e5e', '#7cff5a', '#5a7ad8', '#e85a8a'], skins = ['#f1cfb2', '#b9825a', '#7a4a2e', '#e2ad84', '#f7dccb', '#a8714a'];
  for (let i = 0; i < n; i++) {
    const tier = i % 3, side = i < n / 2 ? 0 : 1, per = Math.ceil(n / 6);
    const bx = side ? 448 : 256, x = bx + (Math.floor(i / 3) % per) * (48 / per) - 20 + r() * 3;
    out.push({ x, y: 157 - tier * 8, z: 7 + tier * 6, shirt: shirts[Math.floor(r() * shirts.length)], skin: skins[Math.floor(r() * skins.length)], hair: ['#1a1418', '#3a2218', '#f0d890', '#5a2a1e'][Math.floor(r() * 4)], ph: r() * 9, side, cheer: 0, hat: r() < .25 });
  }
  return out;
};
G.drawCrowd = (r, crowd, t, mood) => {
  for (const f of crowd) {
    const exc = f.cheer > 0 ? Math.abs(Math.sin(t * 10 + f.ph)) * 4 : 0, sway = Math.sin(t * 1.6 + f.ph) * .6, z = f.z + exc;
    r.queue(f.x, f.y, z, g => {
      const [x, y] = r.w(f.x + sway, f.y, z), X = Math.round(x), Y = Math.round(y);
      px.rect(g, X - 2, Y - 6, 5, 6, f.shirt); px.rect(g, X - 2, Y - 6, 5, 1, E.shade(f.shirt, .25)); px.rect(g, X + 2, Y - 5, 1, 5, E.shade(f.shirt, -.25));
      px.rect(g, X - 1, Y - 10, 3, 4, f.skin); px.rect(g, X - 1, Y - 11, 3, 1, f.hair);
      if (f.hat) px.rect(g, X - 2, Y - 12, 5, 1, '#f0d890');
      if (f.cheer > 0) { px.rect(g, X - 3, Y - 12 - Math.round(exc * .5), 1, 5, f.skin); px.rect(g, X + 3, Y - 12 - Math.round(exc * .5), 1, 5, f.skin); }
      else if (mood === 'groan') px.rect(g, X - 1, Y - 9, 3, 1, E.shade(f.skin, -.3));
    });
  }
};
/** the court's props: the far-side strip (bleachers, umbrellas, DJ booth, scorer table, scoreboard), the sides (tiki bar,
 *  lifeguard tower, loungers, surf rack, changing hut) and low props on the near side; floodlights and torches at night */
G.drawCourtProps = (r, o = {}) => {
  const night = o.tod === 'night', C = G.C;
  r.shape('bleacher', 256, 148, 0, { params: { len: 52, color: '#2ec4c9' } });
  r.shape('bleacher', 448, 148, 0, { params: { len: 52, color: '#ff9e5e' } });
  r.shape('djbooth', 352, 132, 0);
  r.shape('scoreboard', 316, 160, 0);
  r.shape('table', 390, 164, 0, { mats: { t: 'aoa_white', l: 'aoa_white' } });
  r.shape('umbrella', 198, 138, 0, { params: { color: '#ff5f7a' } });
  r.shape('umbrella', 506, 138, 0, { params: { color: '#2ec4c9' } });
  r.shape('tikibar', 120, 210, 0);
  for (const sx of [104, 120, 136]) r.shape('chairstool', sx, 232, 0);
  r.shape('lifeguard', 600, 170, 0);
  r.shape('lounger', 584, 250, 0, { params: { color: '#ffd04a' } }); r.shape('lounger', 612, 252, 0, { params: { color: '#ff5f7a' } });
  r.shape('surfrack', 640, 300, 0, { facing: Math.PI });
  r.shape('changinghut', 70, 300, 0);
  r.shape('umbrella', 600, 228, 0, { params: { color: '#ff9e5e', stripe: '#ffffff' } });
  r.prop('palm', 40, 160, 0, { size: 1.6 }); r.prop('palm', 680, 140, 0, { size: 1.7 }); r.prop('palm', 160, 130, 0, { size: 1.5 }); r.prop('palm', 548, 128, 0, { size: 1.5 });
  r.prop('palm', 30, 380, 0, { size: 1.4 }); r.prop('palm', 690, 390, 0, { size: 1.5 });
  // near side: low props only (tall ones would hide the court in the Broadcast view)
  r.shape('beachtowel', 250, 360, 0, { facing: 0, params: { color: '#ff5fa2' } }); r.shape('beachtowel', 470, 370, 0, { facing: 0, params: { color: '#2ec4c9', stripe: '#ffd04a' } });
  r.shape('sandcastle', 330, 400, 0); r.shape('cooler', 400, 356, 0); r.shape('beachtowel', 560, 340, 0, { params: { color: '#ffd04a' } });
  r.prop('flowers', 180, 400, 0); r.prop('rock', 120, 420, 0); r.prop('rock', 610, 410, 0, { size: .8 });
  // net posts
  r.shape('netpost', C.NET_X, C.Y0 - 10, 0); r.shape('netpost', C.NET_X, C.Y1 + 10, 0);
  if (o.final) { for (const bx of [226, 300, 404, 478]) r.queue(bx, 112, 0, g => { const [x, y] = r.w(bx, 112, 40), X = Math.round(x), Y = Math.round(y); px.rect(g, X, Y, 1, 30, '#c8ccd8'); px.rect(g, X + 1, Y, 18, 12, '#16141c'); px.rect(g, X + 2, Y + 2, 16, 8, '#ffd36a'); E.font.text(g, '$', X + 8, Y + 2, '#16141c', { outline: false }); }); }
  if (night) {
    for (const [x, y] of [[200, 120], [504, 120], [200, 340], [504, 340]]) { r.prop('streetlamp', x, y, 0, { size: 1.8, light: true }); G.game.lights.add(x, y, 40, 200, 1.05, { color: '#fff4d8' }); }
    G.game.lights.add(C.NET_X, C.CY, 60, 170, .9, { color: '#e8f0ff' });   // the floodlights meet over the net
    for (const [x, y] of [[96, 196], [150, 196], [570, 210], [640, 270], [60, 260]]) r.prop('torch', x, y, 0, { size: 1.4, light: true });
  }
};
/** the net: posts, a mesh band from NET_LO to NET_H with a white tape, and antennae at the side lines */
G.drawNet = (r, shake = 0) => {
  const C = G.C, y0 = C.Y0 - 10, y1 = C.Y1 + 10;
  r.queue(C.NET_X, C.CY, C.NET_H * .5, g => {
    const a = r.w(C.NET_X, y0, C.NET_H), b = r.w(C.NET_X, y1, C.NET_H), a2 = r.w(C.NET_X, y0, C.NET_LO), b2 = r.w(C.NET_X, y1, C.NET_LO);
    const sh = shake ? Math.sin(G.now() * 50) * shake : 0;
    px.blend(g, .55, 'normal', () => px.poly(g, [[a[0], a[1] + sh], [b[0], b[1] + sh], [b2[0], b2[1]], [a2[0], a2[1]]], '#1a1a2a'));
    const n = 22;   // mesh lines
    for (let i = 0; i <= n; i++) { const k = i / n, p = [lerp(a[0], b[0], k), lerp(a[1], b[1], k) + sh], q = [lerp(a2[0], b2[0], k), lerp(a2[1], b2[1], k)]; px.line(g, p[0], p[1], q[0], q[1], '#3a3a4a'); }
    for (let j = 1; j < 4; j++) { const k = j / 4; px.line(g, lerp(a[0], a2[0], k), lerp(a[1] + sh, a2[1], k), lerp(b[0], b2[0], k), lerp(b[1] + sh, b2[1], k), '#3a3a4a'); }
    px.line(g, a[0], a[1] + sh, b[0], b[1] + sh, '#ffffff', 2); px.line(g, a2[0], a2[1], b2[0], b2[1], '#e8e8f0');
    for (const yy of [C.Y0, C.Y1]) { const p = r.w(C.NET_X, yy, C.NET_LO), q = r.w(C.NET_X, yy, C.ANT_H); for (let k = 0; k < 6; k++) { const u0 = k / 6, u1 = (k + 1) / 6; px.line(g, lerp(p[0], q[0], u0), lerp(p[1], q[1], u0), lerp(p[0], q[0], u1), lerp(p[1], q[1], u1), k % 2 ? '#ffffff' : '#e8283a'); } }
  }, { bias: 0 });
};
/** the shoreline's foam, moving in and out (drawn on the floor) */
G.drawShore = (r, t, x0 = 0, x1 = G.C.MAP_W * 16, yS = 96) => {
  r.decal(g => {
    for (let x = x0; x < x1; x += 4) {
      const k = Math.sin(t * .6 + x * .02) * 3 + Math.sin(t * 1.3 + x * .07) * 1.2, y = yS - 2 + k;
      const p = r.w(x, y, 0), q = r.w(x + 4, y + Math.sin(t * .6 + (x + 4) * .02) * 0, 0);
      px.line(g, p[0], p[1], q[0], q[1], '#f4fbff'); if ((x / 4) % 3 === 0) px.dot(g, p[0], p[1] + 1, '#c8f0f8');
    }
  });
};

/* ---- effects ---- */
G.fx = {
  hearts(x, y, z, n = 6) { const P = G.game.particles; for (let i = 0; i < n; i++) P.add({ kind: 'text', text: '♥', x: x + G.rand('cosmetic', -6, 6), y, z: z + G.rand('cosmetic', 0, 6), vx: G.rand('cosmetic', -14, 14), vy: 0, vz: G.rand('cosmetic', 20, 40), g: -10, life: 1.2, max: 1.2, color: G.pick('cosmetic', ['#ff5f7a', '#ff9ac8', '#ffd0d8']) }); },
  confetti(x, y, z, n = 40) { G.game.particles.bits(x, y, z, n, ['#ff5f7a', '#ffd36a', '#2ec4c9', '#ffffff', '#7cff5a', '#ff9e5e']); },
  coins(x, y, z, n = 30) { const P = G.game.particles; for (let i = 0; i < n; i++) P.add({ kind: 'bit', x: x + G.rand('cosmetic', -20, 20), y: y + G.rand('cosmetic', -4, 4), z: z + G.rand('cosmetic', 10, 40), vx: G.rand('cosmetic', -30, 30), vy: 0, vz: G.rand('cosmetic', 20, 90), g: 260, bounce: .4, life: 2, max: 2, color: G.pick('cosmetic', ['#ffd36a', '#e8a020', '#fff6c0']), size: 2 }); },
  firework(x, y, z, col) { const P = G.game.particles; for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, s = G.rand('cosmetic', 50, 80); P.add({ kind: 'spark', x, y, z, vx: Math.cos(a) * s, vy: 0, vz: Math.sin(a) * s, g: 40, drag: 1.5, life: 1.3, max: 1.3, color: col || G.pick('cosmetic', ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a']) }); } G.sfx('firework', { vary: .2 }); },
  sweat(x, y, z) { G.game.particles.add({ kind: 'text', text: "'", x: x + 3, y, z, vx: 12, vy: 0, vz: 20, g: 80, life: .6, max: .6, color: '#9fd8f0' }); },
  glare(x, y, z) { G.game.particles.glints(x, y, z, 6, '#fff6c0', 6); G.game.particles.ring(x, y, 2, 16, '#ffd36a', .3, z); },
  splash(x, y, z = 0, n = 14) { const P = G.game.particles; P.bits(x, y, z, n, ['#9ff3e8', '#ffffff', '#2ec4c9']); P.ring(x, y, 2, 14, '#e8f8ff', .4, z); },
  sparkle(x, y, z) { G.game.particles.glints(x, y, z, 7, '#fff6c0', 8); }
};


/* ---- 15-anim.js ---- */
/* 15-anim: animation, in layers: the rig's own walk, run, idle and jump; held poses (engine patch 5: vready, bump, set,
 * blockup, toss, spikearm, highfive, clap, facepalm, peace, lookback, stretch, sit, sunbathe) weighted by each move's
 * timeline (wind 0 to 1, hold, release); an arm-IK overlay (rig.arms) for strikes; body offsets (crouch, lean, air,
 * land, down); motion-capture clips through Mocap.drive (celebrations, idles, dances); faces through expr. Animation is
 * driven from the simulation's plan: a spike's jump starts at t* minus its rise and the hand meets the ball at t*. */
G.Anim = {
  /** a weight over a move: rises over `wind`, holds, falls over `rel` (u: seconds into it) */
  w(u, wind, hold, rel) { if (u < 0) return 0; if (u < wind) return E.ease.outQuad(u / wind); if (u < wind + hold) return 1; if (u < wind + hold + rel) return 1 - E.ease.inOutQuad((u - wind - hold) / rel); return 0; },
  lib: null,
  init() {
    const MC = typeof Mocap !== 'undefined' ? Mocap : null, set = typeof MOCAP !== 'undefined' ? MOCAP.AOA : window.MOCAP && window.MOCAP.AOA;   // (the mocap scripts' top-level names)
    if (G.Anim.lib || !MC || !set) return;
    G.Anim.M = MC; try { G.Anim.lib = MC.load(set); } catch (e) { G.Anim.lib = null; G.game && G.game.fail('mocap', e); }
  },
  has(name) { const L = G.Anim.lib; try { return !!(L && L.clip(name)); } catch (e) { return false; } },
  /** play a clip on a rig (upper body only with mask 'upper'); t: seconds into it; w: its weight */
  clip(rig, name, t, w = 1, mask = null) {
    const L = G.Anim.lib; if (!L) return false;
    let c; try { c = L.clip(name); } catch (e) { c = null; } if (!c) return false;
    if (!rig._mocapOn) { try { G.Anim.M.drive(rig, L); rig._mocapOn = true; } catch (e) { return false; } }
    try { rig.mocap = L.sample(c, t); } catch (e) { return false; }
    rig.mocapW = w; rig.mocapMask = mask;
    return true;
  },
  stop(rig) { if (rig._mocapOn) { rig.mocap = null; rig.mocapW = 0; } },
  /** the rig's state for a volleyball player this step */
  player(M, p, dt) {
    const rig = p.rig, t = M.now, u = t - p.actT0, s = { x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, facing: p.facing, poseW: {}, air: p.z > 2 };
    const PW = s.poseW; rig.arms = null; let clipName = null, clipT = 0, mask = null;
    const ready = (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss') && p.act === 'ready' && Math.hypot(p.vx, p.vy) < 30;
    PW.vready = ready ? .85 : 0;
    switch (p.act) {
      case 'bump': PW.bump = G.Anim.w(u, .12, .1, .3); PW.vready = 0; s.expr = p.q === 'PERFECT' ? 'smile' : null; break;
      case 'dig': PW.bump = G.Anim.w(u, .08, .15, .35); s.land = .4; break;
      case 'set': PW.set = G.Anim.w(u, .1, .08, .25); break;
      case 'spike': case 'shot': case 'serveHit': {
        // the arm cocks back over the rise, then whips over through the contact; the free arm points at the ball
        const tc = p.contactT || t, before = tc - t;
        if (before > 0) PW.spikearm = clamp(1 - (before - .06) / .32, 0, 1);
        else { const k = clamp(-before / (p.act === 'shot' ? .16 : .09), 0, 1), w = 1 - clamp((-before - .2) / .25, 0, 1); PW.spikearm = Math.max(0, 1 - k) * w; rig.arms = { w, R: [3 + 3 * k, 1.2, 25 - 12 * k], wL: .6, L: [5, -1.5, 10] }; }
        s.expr = 'shout'; break;
      }
      case 'block': PW.blockup = p.block ? 1 : G.Anim.w(u, .08, .4, .25); s.expr = 'angry'; break;
      case 'toss': PW.toss = G.Anim.w(u, .1, .5, .2); break;
      case 'dive': { const d = p.dive; if (d) { const du = t - d.t0; s.dash = du < .22; PW.bump = du < .52 ? .9 : 0; s.down = du < .22 ? clamp(du / .22, 0, 1) * .55 : du < .52 ? .55 : clamp(.55 - (du - .52) / .45 * .55, 0, .55); } break; }
      case 'call': PW.highfive = G.Anim.w(u, .08, .25, .2); s.expr = 'shout'; break;
      case 'whiff': s.hurt = u < .25; break;
      case 'highfive': PW.highfive = G.Anim.w(u, .15, .3, .25); s.expr = 'smile'; break;
      case 'celebrate': {
        s.expr = 'smile'; const name = p.celebrate || G.CAST[p.cast].celebrate || 'Victory';
        if (G.Anim.has(name)) { clipName = name; clipT = u; } else s.pose = 'cheer';
        break;
      }
      case 'cheer': s.pose = 'cheer'; s.expr = 'smile'; break;
      case 'fistpump': PW.highfive = .5 + .5 * Math.abs(Math.sin(u * 8)); s.expr = 'shout'; break;
      case 'sad': { const k = p.sadKind || 0; if (k === 0) PW.facepalm = G.Anim.w(u, .2, .6, .3); else if (k === 1 && G.Anim.has('Shrug')) { clipName = 'Shrug'; clipT = u; mask = 'upper'; } else s.pose = 'hips'; s.expr = 'wince'; break; }
      case 'kneel': s.pose = 'kneel'; s.expr = 'wince'; break;
      case 'pose': if (p.posePW) Object.assign(PW, p.posePW); else s.pose = p.pose; s.expr = p.expr; break;
      case 'clip': clipName = p.clip; clipT = u; mask = p.clipMask || null; s.expr = p.expr; break;
    }
    if (p.lean) rig.arms = Object.assign(rig.arms || { w: 1 }, { lean: p.lean });
    if (clipName && G.Anim.clip(rig, clipName, clipT, 1, mask)) { /* a clip plays */ } else G.Anim.stop(rig);
    rig.update(dt, s);
    p.rs = s;
    return s;
  },
  /** an idle or held pose for a character in a place (NPCs, the title lineup, photo poses) */
  idle(rig, dt, st, o = {}) {
    const s = Object.assign({ vx: 0, vy: 0 }, st);
    if (o.clip && G.Anim.clip(rig, o.clip, o.t || 0, o.w === undefined ? 1 : o.w, o.mask || null)) { /* a clip plays */ } else G.Anim.stop(rig);
    rig.update(dt, s);
  }
};


/* ---- 20-ball.js ---- */
/* 20-ball: the ball is not a Body: it is the current launch { t0, p, v, k, g, ay, wob, by, kind }, flown in closed form on
 * the match clock (drag k, gravity g, an optional side wind ay and a float serve's wobble). Every machine agrees on where
 * it is at any time, which the online play relies on. Each launch precomputes its events: when it crosses the net
 * plane, when it lands and where. */
const K_MIN = 1e-4;
G.Ball = {
  make(t0, p, v, o = {}) {
    const L = { t0, p: p.slice(), v: v.slice(), k: Math.max(K_MIN, o.k !== undefined ? o.k : G.T.ballDrag), g: o.g !== undefined ? o.g : G.T.ballGravity, ay: o.ay || 0, wob: o.wob || null, by: o.by === undefined ? null : o.by, kind: o.kind || 'free' };
    G.Ball.events(L);
    return L;
  },
  /** position at match time t */
  at(L, t) {
    const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), q = (1 - e) / k;
    let y = L.p[1] + L.v[1] * q + (L.ay ? L.ay * (tau / k - q / k) : 0);
    if (L.wob) y += L.wob.a * Math.sin(L.wob.w * tau + L.wob.ph) * Math.min(1, tau / .3);
    return [L.p[0] + L.v[0] * q, y, L.p[2] + (L.v[2] + L.g / k) * q - L.g * tau / k];
  },
  vel(L, t) {
    const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau);
    return [L.v[0] * e, L.v[1] * e + (L.ay ? L.ay * (1 - e) / k : 0), (L.v[2] + L.g / k) * e - L.g / k];
  },
  /** the velocity that takes a ball from `from` to `to` in T seconds (wind subtracted) */
  aim(from, to, T, o = {}) {
    const k = Math.max(K_MIN, o.k !== undefined ? o.k : G.T.ballDrag), g = o.g !== undefined ? o.g : G.T.ballGravity, ay = o.ay || 0, d = (1 - Math.exp(-k * T)) / k;
    const vx = (to[0] - from[0]) / d, vy = (to[1] - from[1] - (ay ? ay * (T / k - d / k) : 0)) / d, vz = ((to[2] - from[2]) + g * T / k) / d - g / k;
    return [vx, vy, vz];
  },
  apexT(L) { const k = L.k, a = L.g / k, e = a / (L.v[2] + a); return L.v[2] <= 0 ? L.t0 : L.t0 + (-Math.log(e) / k); },
  /** the time on the way down when the ball is at height h (after `after`), or null */
  timeAtHeight(L, h, after = L.t0) {
    const ta = Math.max(G.Ball.apexT(L), after), za = G.Ball.at(L, ta)[2];
    if (za < h) return null;
    let lo = ta, hi = ta + .05;
    while (G.Ball.at(L, hi)[2] > h) { hi += .05; if (hi - L.t0 > 12) return null; }
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (G.Ball.at(L, m)[2] > h) lo = m; else hi = m; if (hi - lo < 1e-4) break; }
    return (lo + hi) / 2;
  },
  /** the crossing of the net plane and the landing, computed once per launch */
  events(L) {
    const C = G.C, r = C.BALL_R;
    L.tNet = null;
    const vx = L.v[0];
    if (Math.abs(vx) > 1e-6 && (C.NET_X - L.p[0]) / vx > 0) {
      const e = 1 - (C.NET_X - L.p[0]) * L.k / vx;
      if (e > 0) { L.tNet = L.t0 + (-Math.log(e) / L.k); const q = G.Ball.at(L, L.tNet); L.netAt = q; }
    }
    // landing: z = r on the way down
    L.tLand = G.Ball.timeAtHeight(L, r) || L.t0 + 6;
    L.land = G.Ball.at(L, L.tLand);
    L.landIn = L.land[0] >= C.X0 - r && L.land[0] <= C.X1 + r && L.land[1] >= C.Y0 - r && L.land[1] <= C.Y1 + r;
    L.landSide = L.land[0] < C.NET_X ? 0 : 1;
    if (L.tNet !== null && L.tNet > L.tLand) L.tNet = null;   // lands before it reaches the net
    return L;
  },
  /** how the net plane meets this launch: 'clear' | 'tape' | 'net' | 'antenna' (null: it never crosses) */
  netClass(L) {
    if (L.tNet === null) return null;
    const C = G.C, r = C.BALL_R, q = L.netAt;
    if (Math.abs(q[1] - C.CY) > (C.Y1 - C.Y0) / 2 + r) return 'antenna';
    if (q[2] - r > C.NET_H) return 'clear';
    if (q[2] + r >= C.NET_H - 3) return 'tape';
    return 'net';
  },
  sideOf: x => (x < G.C.NET_X ? 0 : 1),
  inCourt(x, y, m = 0) { const C = G.C; return x >= C.X0 + m && x <= C.X1 - m && y >= C.Y0 + m && y <= C.Y1 - m; }
};
/* the ball's sprite: white with blue and yellow panels, turned by its speed */
G.BALL_SPR = [
  E.sprite(['..www..', '.wbbyw.', 'wbwwwyw', 'wbwwyyw', 'wwbyyww', '.wwbbw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' }),
  E.sprite(['..www..', '.wyybw.', 'wywwwbw', 'wyywwbw', 'wwyybww', '.wwyyw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' }),
  E.sprite(['..www..', '.wwbbw.', 'wwbwwyw', 'wbwwwyw', 'wbwwyyw', '.wyyyw.', '..www..'], { w: '#f8f6f0', b: '#3a7ad8', y: '#ffd04a' })
];
G.drawBall = (r, x, y, z, spin = 0, o = {}) => {
  r.shadow(x, y, 4 - Math.min(2, z * .03), .42);
  const fr = G.BALL_SPR[Math.abs(Math.floor(spin)) % 3];
  r.sprite(x, y, z, fr, { anchor: 'center' });
  if (o.trail && o.trail.length > 1) r.queue(x, y, z, g => { px.blend(g, .4, 'add', () => { for (let i = 1; i < o.trail.length; i++) { const a = r.w(...o.trail[i - 1]), b = r.w(...o.trail[i]); px.line(g, a[0], a[1], b[0], b[1], i > o.trail.length - 3 ? '#ffffff' : '#ffd36a', 1); } }); }, { bias: -.5, emissive: true });
};


/* ---- 21-rules.js ---- */
/* 21-rules: the referee. Rally scoring to pointsToWin, win by 2, a hard cap at pointsToWin + 4; best of 1 or 3 sets;
 * at most three touches a side (a block counts, as on the beach), no player twice in a row (except straight after her
 * own block); faults; serve rotation (on a side-out the receiving team serves, with the player who didn't serve last for
 * it); and the stats each player and match keep. */
G.CALLS = {
  in: ['IN!', 'ball'], out: ['OUT!', 'ball'], net: ['NET!', 'ball'], four: ['4 TOUCHES', 'ball'], double: ['DOUBLE TOUCH', 'ball'], antenna: ['ANTENNA', 'ball'],
  ace: ['ACE!', 'star'], kill: ['KILL!', 'star'], block: ['BLOCK!', 'star'], nettouch: ['NET TOUCH', 'ball'], servefault: ['SERVE FAULT', 'ball'], under: ['UNDER THE NET', 'ball']
};
G.Rules = class Rules {
  constructor(o = {}) {
    this.toWin = o.pointsToWin || 7; this.sets = o.sets || 1; this.cap = this.toWin + 4;
    this.score = [0, 0]; this.setsWon = [0, 0]; this.setNo = 1; this.over = false; this.winner = null; this.history = [];
    this.serveSide = o.firstServe === undefined ? 0 : o.firstServe; this.lastServer = [null, null]; this.server = null;
    this.rallies = 0; this.longest = 0;
  }
  /** who serves next on a side: the one who didn't serve last for that side */
  nextServer(side, players) {
    const two = players.filter(p => p.side === side), last = this.lastServer[side];
    const s = !last ? two[0] : two.find(p => p !== last) || two[0];
    this.lastServer[side] = s; this.server = s; return s;
  }
  /** a point to side s: returns { setOver, matchOver, sideOut } */
  point(s, why, rallyTouches) {
    this.score[s]++; this.rallies++; this.longest = Math.max(this.longest, rallyTouches || 0);
    this.history.push({ side: s, why, score: this.score.slice(), set: this.setNo });
    const sideOut = s !== this.serveSide; this.serveSide = s;
    const [a, b] = this.score, lead = Math.abs(a - b), top = Math.max(a, b);
    let setOver = (top >= this.toWin && lead >= 2) || top >= this.cap;
    let matchOver = false;
    if (setOver) {
      this.setsWon[s]++;
      if (this.setsWon[s] > this.sets / 2) { matchOver = true; this.over = true; this.winner = s; }
    }
    return { setOver, matchOver, sideOut };
  }
  nextSet() { this.setNo++; this.score = [0, 0]; this.serveSide = (this.setNo + 1) % 2; }
  /** the side at set point or match point now, or -1 */
  gamePoint() {
    for (const s of [0, 1]) { const me = this.score[s], them = this.score[1 - s]; if ((me + 1 >= this.toWin && me + 1 - them >= 2) || me + 1 >= this.cap) return s; }
    return -1;
  }
  matchPoint() { const s = this.gamePoint(); return s >= 0 && this.setsWon[s] + 1 > this.sets / 2 ? s : -1; }
};
G.newStats = () => ({ serves: 0, aces: 0, serveFaults: 0, digs: 0, perfectPasses: 0, sets: 0, kills: 0, attackErrors: 0, blocks: 0, points: 0, touches: 0, perfects: 0 });


/* ---- 22-players.js ---- */
/* 22-players: the player entity (movement, jumps, dives), the timing judge and the human controller. Players can leave
 * the court lines but never cross the net plane. A press is judged against the planned contact time t*: PERFECT within
 * perfectWin, GREAT within greatWin, OK within okWin (each times the Timing assist), else a whiff. */
G.VB = G.VB || {};
const VB = G.VB;
VB.QUAL = { PERFECT: { rad: 4, spd: 1.12, rank: 3 }, GREAT: { rad: 10, spd: 1, rank: 2 }, OK: { rad: 20, spd: .85, rank: 1 }, STRETCH: { rad: 30, spd: .8, rank: 0 }, MISS: { rad: 60, spd: .6, rank: -1 } };
VB.QCOL = { PERFECT: '#ffd36a', GREAT: '#5ff0ff', OK: '#ffffff', STRETCH: '#c8c4d8', MISS: '#8a8a9a' };
VB.assist = () => G.ASSIST[G.setting('assist', 'Normal')] || 1;
VB.windows = (mul = VB.assist()) => ({ p: G.T.perfectWin * mul, g: G.T.greatWin * mul, o: G.T.okWin * mul });
/** the quality of a press err seconds from t* (inclusive boundaries) */
VB.judge = (err, mul) => { const w = VB.windows(mul), a = Math.abs(err) - 1e-9; return a <= w.p ? 'PERFECT' : a <= w.g ? 'GREAT' : a <= w.o ? 'OK' : 'MISS'; };
VB.lower = q => q === 'PERFECT' ? 'GREAT' : q === 'GREAT' ? 'OK' : q === 'OK' ? 'STRETCH' : 'MISS';
VB.stat = (p, k) => (p.statsBase[k] || 5);
VB.speed = p => G.T.runSpeed * (.86 + .03 * VB.stat(p, 'SPD')) * (p.ctl.kind === 'ai' ? G.T.aiSpeedMul : 1) * (p.speedMul || 1);
VB.reachR = p => G.T.reach + .4 * VB.stat(p, 'TEC');
VB.standReach = p => 44 * p.size / 1.25;
VB.jumpH = p => 10 + 1.0 * VB.stat(p, 'JMP');
VB.attackH = p => VB.standReach(p) + VB.jumpH(p);
VB.blockTopAt = (p, t) => p.block ? VB.standReach(p) + 2 + VB.blockZ(p, t) : VB.standReach(p);
VB.blockZ = (p, t) => {
  const b = p.block; if (!b) return 0; const u = t - b.t0, R = G.T.blockRise, h = VB.jumpH(p) * .85;
  if (u < 0) return 0; if (u < R) return h * E.ease.outQuad(u / R); if (u < R + .18) return h; if (u < R + .48) return h * (1 - E.ease.inQuad((u - R - .18) / .3)); return 0;
};
let PID = 0;
VB.makePlayer = (M, o) => {
  const c = G.CAST[o.cast] || G.CAST.rin;
  const rig = G.makeRig(o.cast, { suit: o.suit, acc: o.acc, kit: o.kit });
  const p = {
    id: o.id !== undefined ? o.id : PID++, side: o.side, slot: o.slot, cast: o.cast, name: o.name || c.name, rig, size: rig.o.size,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: o.side ? Math.PI : 0,
    ctl: o.ctl || { kind: 'ai' }, act: 'ready', actT: 0, call: 'auto', callT: 0, lockT: 0, stats: G.newStats(),
    statsBase: Object.assign({ POW: 5, TEC: 5, SPD: 5, JMP: 5 }, c.stats || {}), skillBase: o.skill === undefined ? .5 : o.skill,
    jump: null, block: null, dive: null, bubble: null, react: 0, target: null, seat: o.seat, color: o.color || null, tag: o.tag || null, shades: (o.acc || []).some(a => G.ACCS[a] && G.ACCS[a].shades),
    pose: null, emote: null, emoteT: 0, mood: 'normal', rs: {}
  };
  return p;
};
/** move toward a world velocity with acceleration; keep to the own side of the net and inside the map */
VB.steer = (p, tvx, tvy, dt, acc = 900) => {
  p.vx = approach(p.vx, tvx, acc * dt); p.vy = approach(p.vy, tvy, acc * dt);
};
VB.integrate = (M, p, dt) => {
  const C = G.C;
  if (p.dive && p.dive.phase !== 'down') { /* the dive drives the body */ }
  p.x += p.vx * dt; p.y += p.vy * dt;
  const lim = C.NET_X + (p.side ? 6 : -6);
  if (p.side === 0 && p.x > lim) { p.x = lim; p.vx = Math.min(0, p.vx); }
  if (p.side === 1 && p.x < lim) { p.x = lim; p.vx = Math.max(0, p.vx); }
  p.x = clamp(p.x, 40, C.MAP_W * 16 - 40); p.y = clamp(p.y, 118, C.MAP_H * 16 - 30);
  // jumps: a spike's arc, a block's rise and hold, a jump serve's
  const t = M.now;
  if (p.jump) { const u = (t - p.jump.t0) / p.jump.dur; if (u >= 1 || u < -1) { if (u >= 1) { p.rig.land(.45); G.sfx('step_sand'); M.dust(p.x, p.y, 3); } p.jump = null; p.z = 0; } else p.z = u < 0 ? 0 : p.jump.h * 4 * u * (1 - u); }
  else if (p.block) { p.z = VB.blockZ(p, t); if (t - p.block.t0 > G.T.blockRise + .48) { p.block = null; p.z = 0; p.rig.land(.4); } }
  else p.z = 0;
};
/** start a jump whose peak lands at time peak (a spike's or a serve's) */
VB.jumpAt = (M, p, peak, rise = .38, h) => { p.jump = { t0: peak - rise, dur: rise * 2, h: h === undefined ? VB.jumpH(p) : h }; };

/* ---- the human controller: the stick (or keys) moves; play, shot, dive and call; the mouse aims ---- */
VB.humanInput = (M, p, dt) => {
  const I = p.ctl.input; if (!I) return { mv: [0, 0], play: false, shot: false, dive: false, call: false, aim: [0, 0] };
  const m = I.move(), d = M.view ? M.view.screenDirToGround(m[0], m[1]) : [m[0], m[1]], L = Math.hypot(d[0], d[1]);
  const out = { mv: L > 1 ? [d[0] / L, d[1] / L] : d, raw: m, play: I.pressed('play'), shot: I.pressed('shot'), dive: I.pressed('dive'), call: I.pressed('call'), view: I.map.view && I.pressed('view'), shotHeld: I.down('shot') };
  // aim: the stick's screen direction picks a zone; with the mouse last, the reticle's ground point
  out.aim = d;
  if (I.lastDevice === 'mouse' && G.game.mouseGround) { const g = G.game.mouseGround(); if (g) out.mouse = [g[0], g[1]]; }
  if (M.perfectPlayer || M.cpuControl) out.bot = true;
  return out;
};
/** the 9 zones of a side's half, from the attacking side's point of view */
VB.zone = (side, depth, lat) => {   // depth: 0 short, 1 mid, 2 deep; lat: -1, 0, 1 (y)
  const C = G.C, dir = side === 0 ? 1 : -1, xs = [C.NET_X + dir * 30, C.NET_X + dir * 72, side === 0 ? C.X1 - 18 : C.X0 + 18];
  return [xs[depth], C.CY + lat * 44];
};
/** the zone a stick direction asks for (dir: the attacking side's), or the mouse's ground point clamped inside */
VB.aimTarget = (side, aim, mouse) => {
  const C = G.C;
  if (mouse) { const own = side === 0 ? mouse[0] > C.NET_X + 8 : mouse[0] < C.NET_X - 8; if (own) return [clamp(mouse[0], C.X0 + 6, C.X1 - 6), clamp(mouse[1], C.Y0 + 6, C.Y1 - 6)]; }
  const fwd = (side === 0 ? 1 : -1) * aim[0], lat = Math.abs(aim[1]) > .35 ? Math.sign(aim[1]) : 0;
  const depth = fwd > .35 ? 0 : fwd < -.35 ? 2 : Math.hypot(aim[0], aim[1]) > .35 ? 1 : 2;
  return VB.zone(side, depth, lat);
};


/* ---- 23-ai.js ---- */
/* 23-ai: the volleyball AI. Skill per touch = (the day's base × aiSkillMul + difficulty) × (0.8 + 0.05 × the touch's
 * stat) × chemistry (the player's partner: her affinity), on the match stream so the same seed plays the same match.
 * Reaction, formation by phase, attack targets that avoid defenders, shot or spike, serves aimed at the seams, blocks.
 * Spectacle mode (the attract) plays perfect rallies of a random length, then a guaranteed kill. */
const AI = G.VB.AI = {
  skill(M, p, stat) {
    if (M.spectacle) return 1;
    const diff = p.side === M.humanSide && M.humanSide !== null ? 0 : (G.DIFF[M.difficulty] || 0);   // difficulty lifts the opponents
    let s = (p.skillBase * G.T.aiSkillMul + diff) * (.8 + .05 * G.VB.stat(p, stat));
    if (p.partnerOfHuman) s *= (1 - G.T.chemistry / 2) + G.T.chemistry * (p.affinity || 50) / 100;
    return clamp(s, 0, 1);
  },
  /** a touch's quality: PERFECT .10 + .45 skill, GREAT .30, MISS max(.02, .16 (1 - skill)), else OK */
  /** incoming: the launch she is playing (a hard spike or jump serve is harder to dig: more misses, no PERFECT) */
  roll(M, p, stat, incoming, slack) {
    if (M.spectacle) return 'PERFECT';
    const s = AI.skill(M, p, stat), r = G.rng('match')(), hard = incoming && (incoming.kind === 'spike' || incoming.kind === 'jumpserve');
    const sp = hard ? Math.hypot(incoming.v[0], incoming.v[1], incoming.v[2]) / 330 : 0;
    let pP = .1 + .45 * s, pG = .3, pM = Math.max(.02, .16 * (1 - s));
    if (hard) { pM += .2 * sp + .22 * (1 - s); pP *= .35; }
    if (slack !== undefined && incoming) { const pr = clamp(1 - slack / .45, 0, 1); pM += .3 * pr; pP *= 1 - .6 * pr; }   // a ball she barely reached goes wrong more often
    return r < pP ? 'PERFECT' : r < pP + pG ? 'GREAT' : r < pP + pG + pM ? 'MISS' : 'OK';
  },
  reaction: (M, p) => M.spectacle ? 0 : G.T.aiReaction * (1.2 - AI.skill(M, p, 'SPD')),
  /** where an AI player stands when she isn't playing the ball */
  spot(M, p) {
    const C = G.C, s = p.side, dir = s === 0 ? -1 : 1, mate = M.players.find(q => q.side === s && q !== p), plan = M.plan;
    const deep = x => C.NET_X + dir * x;
    if (M.phase === 'serveSetup' || M.phase === 'toss' || M.phase === 'intro' || M.phase === 'coin') {
      if (M.server === p) return [p.x, p.y];
      if (M.rules.serveSide === s) return [deep(40), p.slot ? C.CY + 30 : C.CY - 30];   // the server's partner waits near the net
      return [deep(54), p.slot ? C.CY + 32 : C.CY - 32];   // receiving: split the court, 40% deep
    }
    if (plan && plan.side === s) {
      if (plan.kind === 'set' && plan.p !== p) return [deep(46), clamp(plan.P[1] + (p.y < plan.P[1] ? -26 : 26), C.Y0 + 14, C.Y1 - 14)];   // the hitter backs off for her approach
      if (plan.kind === 'attack' && plan.p !== p) return [deep(70), clamp(C.CY - (plan.P[1] - C.CY) * .5, C.Y0 + 20, C.Y1 - 20)];   // cover behind the hitter
      if (plan.kind === 'receive' && plan.p !== p) return [deep(44), clamp(plan.P[1] + (plan.P[1] < C.CY ? 40 : -40), C.Y0 + 14, C.Y1 - 14)];   // ready to set
    }
    // defending: if they attack near the net, one blocks in line with the hitter, the other digs deep cross-court
    if (plan && plan.side === 1 - s && plan.kind === 'attack') {
      const atkY = plan.P[1], near = Math.abs(plan.P[0] - C.NET_X) < 34;
      if (near && M.blockerFor(s) === p) return [C.NET_X + dir * 7, clamp(atkY, C.Y0, C.Y1)];
      return [deep(98), clamp(C.CY + (C.CY - atkY) * .6, C.Y0 + 10, C.Y1 - 10)];
    }
    if (plan && plan.side === 1 - s && (plan.kind === 'set' || plan.kind === 'receive')) return [deep(70), p.slot ? C.CY + 30 : C.CY - 30];
    return [deep(64), p.slot ? C.CY + 34 : C.CY - 34];   // a free ball: both back
  },
  /** who on side s goes up to block (the one nearer the net), or null when no one should */
  blocker(M, s) {
    const two = M.players.filter(q => q.side === s && q.ctl.kind === 'ai' && !(M.plan && M.plan.p === q));
    if (!two.length) return null;
    return two.sort((a, b) => Math.abs(a.x - G.C.NET_X) - Math.abs(b.x - G.C.NET_X))[0];
  },
  /** the attack's target: of the 9 zones, the one farthest from the defenders' spots minus their reach, minus 8 (1 - skill)
   *  for zones near a line; returns [x, y] */
  attackTarget(M, p) {
    const s = p.side, defs = M.players.filter(q => q.side !== s), sk = AI.skill(M, p, 'POW');
    let best = null, bs = -1e9;
    for (let d = 0; d < 3; d++) for (let l = -1; l <= 1; l++) {
      const z = G.VB.zone(s, d, l);
      let near = 1e9; for (const q of defs) { const tx = q.target ? q.target[0] : q.x, ty = q.target ? q.target[1] : q.y; near = Math.min(near, Math.hypot(z[0] - tx, z[1] - ty) - G.VB.reachR(q)); }
      const edge = (d === 2 || l !== 0) ? 8 * (1 - sk) : 0, score = near - edge + G.rand('match', -6, 6);
      if (score > bs) { bs = score; best = z; }
    }
    return best;
  },
  /** a cut shot when a blocker is up and in line, plus 20% for variety */
  wantsShot(M, p) {
    if (M.spectacle) return false;
    const foe = M.players.find(q => q.side !== p.side && (q.block || Math.abs(q.x - G.C.NET_X) < 14) && Math.abs(q.y - p.y) < 16);
    return foe ? G.chance('match', .4) : G.chance('match', .1);
  },
  /** a cut shot goes where the defender who isn't at the net can't get to: short behind the block, or a deep corner */
  shotTarget(M, p) {
    const s = p.side, back = M.players.filter(q => q.side !== s && Math.abs(q.x - G.C.NET_X) > 20), opts = [G.VB.zone(s, 0, -1), G.VB.zone(s, 0, 1), G.VB.zone(s, 2, -1), G.VB.zone(s, 2, 1)];
    let best = opts[0], bs = -1;
    for (const z of opts) { const d = back.length ? Math.min(...back.map(q => Math.hypot(q.x - z[0], q.y - z[1]))) : 50; const sc = d + G.rand('match', -10, 10); if (sc > bs) { bs = sc; best = z; } }
    return best;
  },
  serveKind(M, p) { if (M.spectacle) return G.chance('match', .5) ? 'jump' : 'float'; return G.chance('match', G.VB.stat(p, 'POW') >= 8 ? .5 : .3) ? 'jump' : 'float'; },
  serveTarget(M, p) {
    const C = G.C, s = p.side, rcv = M.players.filter(q => q.side !== s), seamY = rcv.length === 2 ? (rcv[0].y + rcv[1].y) / 2 : C.CY;
    const opts = [G.VB.zone(s, 2, -1), G.VB.zone(s, 2, 1), [G.VB.zone(s, 1, 0)[0], seamY], [G.VB.zone(s, 2, 0)[0], seamY]];
    return G.pick('match', opts);
  }
};


/* ---- 24-match.js ---- */
/* 24-match: one Match class plays every match (vacation, tutorial, semifinal, final, Beach Match, AI Hub, attract).
 * Phases: intro -> coin -> serveSetup -> toss -> rally -> dead -> point -> [replay] -> ... -> end -> results.
 * The ball is a closed-form launch on the match clock; each launch plans the next contact (who plays it, when: t*, where:
 * P*, at what height); AI players execute at t*, humans press Play against t* (the judge), and the net and the sand
 * decide the rest. Everything random comes from the 'match' stream, so a seed and inputs replay exactly. */
const MC = G.C, VBm = G.VB;
E.VIEWS.court = E.VIEWS.court || new E.View('court', 'Broadcast', 12, 30, 1.5, 1);   // a touch of yaw so the net reads as a band
E.VIEWS.servecam = E.VIEWS.servecam || new E.View('servecam', 'Serve Cam', -90, 46, 1.5, 1);
G.Commentary = class Commentary {
  constructor() { this.q = []; this.cur = null; this.on = true; this.who = 'sonny'; }
  say(text, who = 'sonny', prio = 0) { if (!this.on || !text) return; if (this.cur && prio > (this.cur.prio || 0)) this.cur = null; if (this.q.length > 2) this.q.shift(); this.q.push({ text, who, prio, t: 0, shown: 0 }); }
  update(dt) {
    if (!this.cur && this.q.length) this.cur = this.q.shift();
    const c = this.cur; if (!c) return;
    c.t += dt; const prev = Math.floor(c.shown); c.shown = Math.min(c.text.length, c.shown + dt * 40 * (G.TEXT_SPEED[G.setting('textSpeed', 'Normal')] || 1));
    for (let i = prev; i < Math.floor(c.shown); i++) if (/[a-z]/i.test(c.text[i])) G.voice.letter(c.who, c.text[i], i, c.text, 'excited');
    if (c.shown >= c.text.length && c.t > c.text.length / 40 + 2.2) this.cur = null;
  }
  draw(g, r, y0) {
    const c = this.cur; if (!c) return;
    const w = Math.min(200, Math.round(r.W * .46)), lines = E.font.wrap(c.text, w - 40), h = Math.max(30, lines.length * 9 + 14), x = r.W - w - Math.round(r.W * .04), y = y0 !== undefined ? y0 - h : r.H - h - Math.round(r.H * .05) - 18;
    G.ui.panel(g, x, y, w, h, { alpha: .88 });
    G.portrait(g, G.portraitRig(c.who), x + 4, y + 4, 22, { frame: false });
    E.font.text(g, G.CAST[c.who].name.toUpperCase(), x + 30, y + 3, G.CAST[c.who].color || '#ffd36a', { shadow: '#000', outline: false });
    let left = Math.floor(c.shown);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; if (s) E.font.text(g, s, x + 30, y + 12 + i * 9, '#fff8e8', { shadow: '#0a0814', outline: false }); });
  }
};

G.Match = class Match {
  constructor(cfg) {
    this.cfg = cfg; this.mode = cfg.mode || 'exhibition'; this.now = 0; this.phase = 'intro'; this.phaseT = 0;
    this.seed = cfg.seed === undefined ? 1 : cfg.seed; G.seed('match', this.seed);
    this.rules = new G.Rules({ pointsToWin: cfg.pointsToWin || 7, sets: cfg.sets || 1, firstServe: cfg.firstServe === undefined ? 0 : cfg.firstServe });
    this.difficulty = cfg.difficulty || G.setting('difficulty', 'Normal');
    this.spectacle = !!cfg.spectacle; this.tod = cfg.tod || 'afternoon'; this.weather = cfg.weather || 'sunny';
    this.wind = this.weather === 'rain' ? 14 : 0; this.wet = this.weather === 'rain';
    this.players = []; this.humanSide = null;
    cfg.teams.forEach((team, side) => team.forEach((o, slot) => {
      const p = VBm.makePlayer(this, Object.assign({}, o, { side, slot, id: side * 2 + slot }));
      if (o.ctl && o.ctl.kind === 'human') this.humanSide = side;
      p.affinity = o.affinity; p.partnerOfHuman = !!o.partnerOfHuman; p.celebrate = o.celebrate;
      this.players.push(p);
    }));
    this.teamNames = cfg.teamNames || [0, 1].map(s => this.players.filter(p => p.side === s).map(p => p.name).join(' & '));
    this.L = null; this.ball = { x: MC.NET_X, y: MC.CY, z: 0, spin: 0 }; this.held = null; this.trail = [];
    this.side = 0; this.touches = 0; this.lastTouch = null; this.lastWasBlock = false; this.rallyTouches = 0; this.plan = null;
    this.server = null; this.serve = null; this.banner = null; this.popups = []; this.decals = [];
    this.view = E.VIEWS.court; this.camMode = cfg.camera || G.setting('matchCam', 'Broadcast');
    this.talk = new G.Commentary(); this.talk.on = cfg.commentary !== false && G.setting('commentary', true) !== false;
    this.crowd = G.makeCrowd(this.seed + 3, cfg.final ? 30 : 24);
    this.replayOn = cfg.replay !== false && !G.hub; this.buf = []; this.lastReplayPt = -9; this.replay = null;
    this.tips = cfg.tutorial ? new Set() : null; this.tip = null; this.autoReceives = cfg.tutorial ? 2 : 0;
    this.specials = cfg.specials || {}; this.edgeUsed = {}; this.luckyArmed = false; this.luckyDone = false; this.dazzled = null;
    this.result = null; this.resultsUI = null; this.over = false; this.perfectPlayer = false; this.cpuControl = false;
    this.debugOverlay = false; this.slowmo = 1; this.netShake = 0; this.shakeT = 0; this.matchPointShown = false; this.groan = 0;
    this.role = cfg.role || 'local'; this.net = cfg.net || null;
    this.setupIntro();
  }
  /* ---------------- set-up ---------------- */
  setupIntro() {
    this.players.forEach(p => { const dir = p.side ? 1 : -1; p.x = MC.NET_X + dir * 26; p.y = MC.CY + (p.slot ? 26 : -26); p.facing = p.side ? Math.PI : 0; p.act = 'ready'; p.actT0 = 0; });
    this.setPhase('intro');
    const line = this.cfg.introLine || G.pickLine && G.pickLine('sonny', this.mode === 'final' ? 'finalIntro' : 'matchIntro', { a: this.teamNames[0], b: this.teamNames[1] });
    if (line) this.talk.say(line, 'sonny', 1);
  }
  setPhase(ph) { this.phase = ph; this.phaseT = 0; if (this.net && this.role === 'host') this.net.onPhase(this, ph); }
  humans() { return this.players.filter(p => p.ctl.kind === 'human'); }
  mate(p) { return this.players.find(q => q.side === p.side && q !== p); }
  blockerFor(s) { return VBm.AI.blocker(this, s); }
  dust(x, y, n) { G.game.particles.dust(x, y, 1, n, { color: '#f0dca8', speed: 22, size: 1.4 }); }
  act(p, a, extra) { p.act = a; p.actT0 = this.now; if (extra) Object.assign(p, extra); }
  popup(p, text, col) { this.popups.push({ x: p.x, y: p.y, z: 48, text, col: col || '#ffffff', t: 0 }); }
  bannerSay(key, extra) { const c = G.CALLS[key]; this.banner = { text: c ? c[0] : key, icon: c ? c[1] : 'ball', t: 0, sub: extra || '' }; }

  /* ---------------- serving ---------------- */
  placeForServe() {
    const s = this.rules.serveSide, srv = this.rules.nextServer(s, this.players);
    this.server = srv; this.side = s; this.touches = 0; this.lastTouch = null; this.lastWasBlock = false; this.rallyTouches = 0; this.plan = null; this.L = null;
    this.dazzled = null; this.held = srv; this.serve = { kind: null, tossT: null, apexT: null, wait: srv.ctl.kind === 'human' ? 10 : G.rand('match', 1.2, 2.5), done: false, glare: false };
    for (const p of this.players) {
      p.jump = null; p.block = null; p.dive = null; p.z = 0; p.vx = p.vy = 0; p.pending = null; p.lockT = 0; p.call = 'auto';
      if (p === srv) { p.x = p.side ? MC.X1 + 20 : MC.X0 - 20; p.y = MC.CY + (p.slot ? 20 : -20); }
      else { const t = VBm.AI.spot(this, p); p.x = t[0]; p.y = t[1]; }
      p.facing = p.side ? Math.PI : 0; this.act(p, 'ready');
    }
    if (this.specials.glare && srv.cast === 'sonny' && (this.mode === 'attract' || G.chance('match', .5))) this.serve.glare = true;
    if (this.spectacle) this.specLen = G.randInt('match', 3, 9);
    this.setPhase('serveSetup');
    if (this.tips && srv.ctl.kind === 'human') this.showTip('serve');
  }
  toss(kind) {
    const p = this.server, sv = this.serve; if (!p || sv.tossT !== null) return;
    sv.kind = kind; sv.tossT = this.now;
    const up = kind === 'jump' ? .75 : .5, h0 = 30 * p.size / 1.25, apexZ = kind === 'jump' ? VBm.standReach(p) + VBm.jumpH(p) * .9 + 2 : VBm.standReach(p) + 6;
    const dir = p.side ? -1 : 1, hx = p.x + dir * (kind === 'jump' ? 14 : 4);
    // straight up, apex at tossT + up: v0 from the closed form (solve with the drag, close enough with a few iterations)
    let vz = (apexZ - h0) / up + .5 * G.T.ballGravity * up;
    const L = G.Ball.make(this.now, [p.x + dir * 4, p.y + 2, h0], [(hx - p.x - dir * 4) / up / 2, 0, vz], { kind: 'toss', by: p.side });
    sv.apexT = G.Ball.apexT(L); this.L = L; this.held = null; this.setPhase('toss'); this.act(p, 'toss');
    G.sfx('serveToss');
    if (kind === 'jump') { VBm.jumpAt(this, p, sv.apexT, .32); p.approach = { vx: dir * 70, until: sv.apexT - .1 }; }
    if (sv.glare) { this.dazzleTell = this.now; G.sfx('glare'); G.fx.glare(p.x, p.y, 40); this.talk.say(G.pickLine('sonny', 'glare'), 'sonny', 2); }
  }
  serveHit(q) {
    const p = this.server, sv = this.serve; if (sv.done) return; sv.done = true;
    const at = G.Ball.at(this.L, this.now), jump = sv.kind === 'jump', Q = VBm.QUAL[q] || VBm.QUAL.OK;
    let tgt = p.ctl.kind === 'human' && !p.cpuCtl && !this.cpuControl ? VBm.aimTarget(p.side, p.aimNow || [0, 0], p.mouseNow) : VBm.AI.serveTarget(this, p);
    const rad = Q.rad * (jump ? 1.5 : 1) * .6, a = G.rand('match', 0, TAU), rr = G.rand('match', 0, rad);
    tgt = [tgt[0] + Math.cos(a) * rr, tgt[1] + Math.sin(a) * rr];
    const T = (jump ? G.T.jumpServeT : G.T.serveT) / Math.max(.8, Q.spd);
    const v = G.Ball.aim(at, [tgt[0], tgt[1], 0], T, { ay: this.wind });
    const wob = jump ? null : { a: 3 + G.rand('match', 0, 2), w: 8 + G.rand('match', 0, 4), ph: G.rand('match', 0, TAU) };
    this.act(p, 'serveHit', { contactT: this.now });
    if (sv.glare) { const rc = this.humans().find(h => h.side !== p.side); this.dazzled = rc && !rc.shades ? rc : null; }
    p.stats.serves++; this.lastTouch = p; this.touches = 0; this.side = p.side; this.serveT = this.now; this.lastAttack = null;
    G.sfx('serveHit'); if (p.ctl.kind === 'human') p.ctl.input.rumble(.35, .1);
    this.launch(at, v, jump ? 'jumpserve' : 'serve', p.side, { wob, serve: true });
    this.setPhase('rally');
    if (q !== 'OK' && p.ctl.kind === 'human') this.popup(p, q === 'PERFECT' ? 'PERFECT!' : q, VBm.QCOL[q]);
    G.bus.emit('touch', { kind: 'serve', p, q });
  }

  /* ---------------- launches and planning ---------------- */
  launch(at, v, kind, bySide, o = {}) {
    const L = G.Ball.make(this.now, at, v, { kind, by: bySide, ay: this.wind, wob: o.wob });
    L.serve = !!o.serve; L.tapeOver = o.tapeOver;
    this.L = L; this.trail = [];
    if (this.net && this.role === 'host') this.net.onLaunch(this, L);
    this.planNext();
    return L;
  }
  /** which side plays the ball next and which touch it is, then who plays it, when and where */
  planNext() {
    const L = this.L; this.plan = null; if (!L || L.kill) return;
    const cls = G.Ball.netClass(L);
    let side = this.side, touch = this.touches;
    if (cls === 'clear' || (cls === 'tape' && L.tapeOver)) { side = 1 - L.by; touch = 0; }
    else if (cls === 'antenna') return;
    else if (cls === 'net' || cls === 'tape') { side = L.by; touch = this.touches; }
    else if (L.landSide !== this.side && L.tNet === null && L.by !== null) side = L.landSide;
    // a ball that comes down on the other side of the net can't be played by this side
    if (touch >= 3) { this.plan = null; return; }
    this.plan = this.planContacts(side, touch, cls === 'net' || cls === 'tape' ? (L.tNet || L.t0) + .05 : null);
    if (this.plan && this.net && this.role === 'host') this.net.onPlan(this, this.plan);
  }
  planContacts(side, touch, after) {
    const L = this.L, cands = [];
    for (const p of this.players) {
      if (p.side !== side) continue;
      if (p === this.lastTouch && !this.lastWasBlock && touch > 0) continue;   // never twice in a row
      if (L.houseEdge && touch === 0 && p.partnerOfHuman && (p.affinity || 0) < 60) continue;   // the House Edge: only a Good Friend covers the line
      let kind = touch === 0 ? 'receive' : touch === 1 ? 'set' : 'attack', h = kind === 'receive' ? 18 : kind === 'set' ? 40 : VBm.attackH(p);
      let t = G.Ball.timeAtHeight(L, h, Math.max(this.now + .05, after || 0));
      if (t === null && kind === 'attack') { kind = 'free'; h = 34; t = G.Ball.timeAtHeight(L, h, Math.max(this.now + .05, after || 0)); }
      if (t === null && kind === 'set') { h = 20; t = G.Ball.timeAtHeight(L, h, Math.max(this.now + .05, after || 0)); }
      if (t === null) { t = L.tLand - .05; h = Math.max(4, G.Ball.at(L, t)[2]); kind = touch === 0 ? 'dig' : kind; }
      const P = G.Ball.at(L, t);
      if (G.Ball.sideOf(P[0]) !== side) continue;
      if (kind === 'attack' && Math.abs(P[0] - MC.NET_X) > 70) kind = 'free';
      const d = Math.hypot(P[0] - p.x, P[1] - p.y), arrive = this.now + d / VBm.speed(p) + (p.ctl.kind === 'ai' ? VBm.AI.reaction(this, p) : .15);
      cands.push({ p, kind, h, tStar: t, P: [P[0], P[1]], z: P[2], arrive, slack: t - arrive, d });
    }
    if (!cands.length) return null;
    // a human's call wins if she (or the partner she named) can get there; else the faster arrival, ties to whoever didn't touch last
    let pick = null;
    const hum = cands.find(c => c.p.ctl.kind === 'human' && c.p.call !== 'auto');
    if (hum) { const want = hum.p.call === 'mine' ? hum : cands.find(c => c.p !== hum.p); if (want && want.arrive <= want.tStar + .1) pick = want; }
    if (!pick) pick = cands.slice().sort((a, b) => (a.arrive - b.arrive) || (a.p === this.lastTouch ? 1 : -1))[0];
    // the House Edge line shot: the partner covers only at Good Friend or better
    const plan = Object.assign({ side, touch, done: false, missed: false, cover: null, t0: this.now }, pick);
    plan.others = cands.filter(c => c !== pick);
    for (const c of cands) c.p.react = c.p.ctl.kind === 'ai' ? VBm.AI.reaction(this, c.p) : 0;
    if (plan.p.ctl.kind === 'human') { plan.p.judged = null; plan.p.pending = null; if (this.tips) this.showTip(plan.kind === 'receive' || plan.kind === 'dig' ? 'receive' : plan.kind); }
    return plan;
  }

  /* ---------------- a touch ---------------- */
  /** p plays the ball now with quality q. o: { shot, aim, mouse, dive } */
  contact(p, q, o = {}) {
    const plan = this.plan, L = this.L; if (!L) return;
    const at = G.Ball.at(L, this.now), kind = plan && plan.p === p ? plan.kind : (this.touches === 0 ? 'receive' : this.touches === 1 ? 'set' : 'attack');
    // rules: a fourth touch, the same player twice
    if (this.side === p.side && this.touches >= 3) return this.fault(p.side, 'four');
    if (this.lastTouch === p && !this.lastWasBlock && this.side === p.side && this.touches > 0) return this.fault(p.side, 'double');
    if (this.side !== p.side) { this.side = p.side; this.touches = 0; }
    // reach: horizontal distance to the ball now (a dive reaches farther)
    const d = Math.hypot(at[0] - p.x, at[1] - p.y), reach = VBm.reachR(p) + (p.dive && this.now - p.dive.t0 < .52 ? G.T.diveReach : 0);
    if (q !== 'MISS') { if (d > reach + 8) q = 'MISS'; else if (d > reach) q = VBm.lower(q); }
    if (kind === 'attack' && p.z < 4 && !o.free) { q = VBm.lower(q); o.free = true; }   // not in the air: a soft free ball
    if (q === 'MISS') {
      this.act(p, 'whiff'); p.lockT = .45;
      if (p.ctl.kind === 'human') this.popup(p, 'MISS', VBm.QCOL.MISS);
      if (plan) { plan.missed = true; plan.done = true; }
      // a shank: an AI miss may still touch it badly
      if (p.ctl.kind !== 'human' && G.chance('match', .5)) this.shank(p, at);
      else this.coverAfterMiss(p);
      return;
    }
    const Q = VBm.QUAL[q], dir = p.side === 0 ? 1 : -1, mate = this.mate(p);
    this.touches++; this.rallyTouches++; this.lastTouch = p; this.lastWasBlock = false; p.stats.touches++;
    if (q === 'PERFECT') { p.stats.perfects++; G.fx.sparkle(at[0], at[1], at[2]); }
    if (plan) plan.done = true;
    const scatter = (tg, rad) => { const a = G.rand('match', 0, TAU), r = G.rand('match', 0, rad) * (this.wet ? 1.2 : 1); return [tg[0] + Math.cos(a) * r, tg[1] + Math.sin(a) * r]; };
    let v, lk;
    if (kind === 'receive' || kind === 'dig' || (kind === 'set' && o.shot && false)) {
      if (o.shot) {   // a free ball over to the deepest open zone
        const tg = scatter(VBm.AI.attackTarget(this, p), Q.rad); v = G.Ball.aim(at, [tg[0], tg[1], 0], 1.2, { ay: this.wind }); lk = 'free';
      } else {
        const tx = MC.NET_X - dir * 40, ty = clamp(mate ? mate.y : MC.CY, MC.Y0 + 16, MC.Y1 - 16) + (o.aim ? o.aim[1] * 24 : 0);
        const tg = scatter([tx, ty], Q.rad * (o.dive ? 1.6 : 1)), T = G.T.passT * (kind === 'dig' || o.dive ? 1.12 : 1);
        v = G.Ball.aim(at, [tg[0], tg[1], 40], T, { ay: this.wind }); lk = 'pass';
        if (q === 'PERFECT') p.stats.perfectPasses++; p.stats.digs += this.L.kind === 'spike' || kind === 'dig' ? 1 : 0;
      }
      this.act(p, kind === 'dig' || o.dive ? 'dig' : 'bump', { q }); G.sfx('bump');
    } else if (kind === 'set') {
      const hitter = mate;
      if (o.shot) {   // the setter's dump: a tip to the nearest open short zone
        const tg = scatter(VBm.zone(p.side, 0, p.y < MC.CY ? -1 : 1), Q.rad); v = G.Ball.aim(at, [tg[0], tg[1], 0], .6, { ay: this.wind }); lk = 'dump';
        this.act(p, 'set', { q }); G.sfx('set');
      } else {
        const quick = o.aim && o.aim[0] * dir > .4, back = o.aim && o.aim[0] * dir < -.4;
        const hx = MC.NET_X - dir * (back ? 40 : 22), hy = clamp(hitter ? hitter.y : MC.CY, MC.Y0 + 16, MC.Y1 - 16);
        const tg = scatter([hx, hy], Q.rad * .8), H = hitter ? VBm.attackH(hitter) : 60, T = quick ? .75 : G.T.setT * (back ? 1.1 : 1);
        v = G.Ball.aim(at, [tg[0], tg[1], H], T, { ay: this.wind }); lk = 'set'; p.stats.sets++;
        this.act(p, 'set', { q }); G.sfx('set');
      }
    } else {   // attack or free
      const human = p.ctl.kind === 'human' && !this.cpuControl;
      let tg = human && !(this.perfectPlayer && !o.mouse && Math.hypot(...(o.aim || [0, 0])) < .3) ? VBm.aimTarget(p.side, o.aim || [0, 0], o.mouse) : VBm.AI.attackTarget(this, p);   // (the dev Perfect Player aims at open court)
      const edge = this.specials.houseEdge && p.cast === 'pepper' && !this.edgeUsed[this.rules.setNo];
      if (edge) { this.edgeUsed[this.rules.setNo] = true; tg = [p.side ? MC.X0 + 10 : MC.X1 - 10, G.chance('match', .5) ? MC.Y0 + 5 : MC.Y1 - 5]; q = 'PERFECT'; this.talk.say(G.pickLine('pepper', 'houseEdge'), 'pepper', 2); this.houseEdgeOn = true; }
      let shot = o.free ? 'free' : o.shot ? 'shot' : 'spike';
      if (shot === 'spike' && !human && !this.luckyArmed) {   // a CPU doesn't spike into the net: if it can't clear from here, it cuts a shot
        const sp0 = G.T.spikeSpeed * (.85 + .035 * VBm.stat(p, 'POW')) * Q.spd, T0 = Math.hypot(tg[0] - at[0], tg[1] - at[1]) / (sp0 * Math.cos(15 * Math.PI / 180)), L0 = G.Ball.make(this.now, at, G.Ball.aim(at, [tg[0], tg[1], 0], T0 * 1.25), { by: p.side });
        if (L0.tNet !== null && L0.netAt[2] - MC.BALL_R - MC.NET_H < 1) { const deep = VBm.zone(p.side, 2, Math.sign(tg[1] - MC.CY)), L1 = G.Ball.make(this.now, at, G.Ball.aim(at, [deep[0], deep[1], 0], Math.hypot(deep[0] - at[0], deep[1] - at[1]) / (sp0 * .966)), { by: p.side }); if (L1.tNet !== null && L1.netAt[2] - MC.BALL_R - MC.NET_H >= 1) tg = deep; else shot = 'shot'; }
      }
      if (shot === 'spike') {
        tg = edge ? tg : scatter(tg, Q.rad * .7);
        const sp = G.T.spikeSpeed * (.85 + .035 * VBm.stat(p, 'POW')) * Q.spd, hd = Math.hypot(tg[0] - at[0], tg[1] - at[1]);
        let T = hd / (sp * Math.cos(15 * Math.PI / 180));
        v = G.Ball.aim(at, [tg[0], tg[1], 0], T, { ay: this.wind });
        // the spike assist: raise the arc just enough to clear (always on Easy, small misses on Normal)
        const clearOf = vv => { const L2 = G.Ball.make(this.now, at, vv, { by: p.side }); return L2.tNet === null ? 99 : L2.netAt[2] - MC.BALL_R - MC.NET_H; };
        let c = clearOf(v); const assist = human ? (this.difficulty === 'Easy' ? 99 : this.difficulty === 'Normal' ? 4 : 0) : 6;
        if (c < 1 && -c + 1 <= assist) for (let i = 0; i < 30 && c < 1; i++) { T *= 1.04; v = G.Ball.aim(at, [tg[0], tg[1], 0], T, { ay: this.wind }); c = clearOf(v); }
        if (this.specials.luckySeven && this.luckyArmed && p.cast === 'sonny') {   // Lucky Seven: off the tape and over
          this.luckyArmed = false; this.luckyDone = true; this.luckyNow = true;
          v = G.Ball.aim(at, [MC.NET_X + (p.side ? -1 : 1) * 2, at[1], MC.NET_H + 1], .2);
        }
        lk = 'spike'; this.act(p, 'spike', { contactT: this.now }); this.lastAttack = { p, side: p.side, t: this.now }; G.sfx('spike', { vol: clamp(sp / 330, .7, 1.3) });
        if (human) p.ctl.input.rumble(.35, .1);
        if (Math.hypot(v[0], v[1]) > 400) { this.bigSpike = true; this.bigSpikeReplay = true; }
      } else if (shot === 'shot') {
        tg = scatter(o.aim && Math.abs(o.aim[0]) + Math.abs(o.aim[1]) > .3 && human ? tg : VBm.AI.shotTarget(this, p), Q.rad * .8);
        v = G.Ball.aim(at, [tg[0], tg[1], 0], G.T.shotT, { ay: this.wind }); lk = 'shot'; this.lastAttack = { p, side: p.side, t: this.now }; this.act(p, 'shot', { contactT: this.now }); G.sfx('set');
      } else {
        tg = scatter(VBm.zone(p.side, 2, 0), Q.rad); v = G.Ball.aim(at, [tg[0], tg[1], 0], 1.2, { ay: this.wind }); lk = 'free'; this.act(p, 'bump', { q }); G.sfx('bump');
      }
    }
    if (p.ctl.kind === 'human' && q !== 'OK') this.popup(p, q === 'PERFECT' ? 'PERFECT!' : q === 'STRETCH' ? 'STRETCH' : q, VBm.QCOL[q]);
    else if (p.ctl.kind === 'human') this.popup(p, 'OK', VBm.QCOL.OK);
    G.bus.emit('touch', { kind: lk, p, q });
    if (this.spectacle && lk === 'spike' && this.rallyTouches >= this.specLen) {   // spectacle: the kill goes into the biggest gap, unanswered
      const L2 = G.Ball.make(this.now, at, v, { by: p.side }); if (G.Ball.netClass(L2) !== 'clear' || !L2.landIn) { const tg = VBm.AI.attackTarget(this, p); v = G.Ball.aim(at, [tg[0], tg[1], 0], .55); }
      this.launch(at, v, lk, p.side); this.L.kill = true; this.plan = null; return;
    }
    this.launch(at, v, lk, p.side); this.L.q = q;
    if (this.houseEdgeOn && p.cast === 'pepper') { this.L.houseEdge = true; this.houseEdgeOn = false; this.planNext(); const mate = this.plan && this.plan.p; if (mate && mate.partnerOfHuman) { mate.bubble = { text: "I've got line!", t: 0 }; G.voice.say("I've got line!", mate.cast, 'excited'); } }
  }
  /** an AI's bad touch: the ball skews away (it may still be played) */
  shank(p, at) {
    this.touches++; this.rallyTouches++; this.lastTouch = p; this.lastWasBlock = false; if (this.plan) this.plan.done = true;
    const a = G.rand('match', 0, TAU), d = G.rand('match', 30, 90), tx = at[0] + Math.cos(a) * d, ty = at[1] + Math.sin(a) * d;
    this.act(p, 'bump', { q: 'MISS' }); G.sfx('bump', { pitch: .8 }); G.game.particles.dust(at[0], at[1], at[2], 3);
    this.launch(at, G.Ball.aim(at, [tx, ty, 0], .9), 'shank', p.side);
  }
  /** after a human's miss (or no press), the partner may still save it */
  coverAfterMiss(p) {
    const mate = this.mate(p), L = this.L; if (!mate || mate.ctl.kind !== 'ai' || this.touches >= 3 || !L) return;
    const t = G.Ball.timeAtHeight(L, 8, this.now + .05); if (t === null) return;
    const P = G.Ball.at(L, t), need = Math.hypot(P[0] - mate.x, P[1] - mate.y) / VBm.speed(mate);
    if (need < t - this.now + .05 && G.Ball.sideOf(P[0]) === mate.side) this.plan = { side: mate.side, touch: this.touches, kind: 'dig', h: 8, tStar: t, P: [P[0], P[1]], z: P[2], p: mate, done: false, cover: true, others: [] };
  }
  fault(sideAt, why) {
    this.bannerSay(why); G.sfx('whistle');
    const lastSide = this.lastTouch ? this.lastTouch.side : sideAt;
    if (this.lastTouch && (why === 'out' || why === 'net' || why === 'antenna') && this.L && (this.L.kind === 'spike' || this.L.kind === 'shot')) this.lastTouch.stats.attackErrors++;
    this.pointTo(1 - lastSide, why);
  }

  /* ---------------- the step ---------------- */
  update(dt) {
    if (this.role === 'client' && this.clientUpdate) return this.clientUpdate(dt);
    dt *= this.slowmo;
    if (this.replay) return this.updateReplay(dt);
    if (this.hubClock) this.now = this.hubClock(); else this.now += dt;
    this.phaseT += dt;
    this.talk.update(dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 1.6) this.banner = null; }
    for (const pp of this.popups) pp.t += dt; this.popups = this.popups.filter(pp => pp.t < .9);
    if (this.tip) { this.tip.t += dt; if (this.tip.t > 5.5) this.tip = null; }
    for (const f of this.crowd) f.cheer = Math.max(0, f.cheer - dt);
    this.netShake = Math.max(0, this.netShake - dt * 4);
    const ph = this.phase;
    if (ph === 'intro') { if (this.phaseT > (this.cfg.introTime || 3) || this.skipPressed()) { this.setPhase('coin'); this.bannerSay((this.rules.serveSide === this.humanSide ? 'YOUR' : (this.teamNames[this.rules.serveSide] + "'S").toUpperCase()) + ' SERVE'); } }
    else if (ph === 'coin') { if (this.phaseT > 1) this.placeForServe(); }
    else if (ph === 'serveSetup') this.stepServeSetup(dt);
    else if (ph === 'toss') this.stepToss(dt);
    else if (ph === 'rally') this.stepRally(dt);
    else if (ph === 'dead') { if (this.phaseT > 1.0) { this.setPhase('point'); this.celebrate(); } }
    else if (ph === 'point') { if (this.phaseT > 1.6 || (this.phaseT > .6 && this.skipPressed())) this.afterPoint(); }
    else if (ph === 'end') { if (this.phaseT > 2.6 || (this.phaseT > 1 && this.skipPressed())) this.openResults(); }
    else if (ph === 'results') { if (this.resultsUI) this.resultsUI.update(dt); }
    this.stepPlayers(dt);
    this.updateBall();
    this.record();
    if (this.net && this.role === 'host') this.net.hostStep(this, dt);
  }
  skipPressed() { return G.game.players.some(I => (I.map.skip && I.pressed('skip')) || I.pressed('confirm')) || (this.spectacle && false); }
  stepServeSetup(dt) {
    const p = this.server, sv = this.serve;
    if (!p) return;
    if (p.ctl.kind === 'human' && !this.cpuControl) {
      const inp = VBm.humanInput(this, p, dt);
      p.vx = 0; p.vy = approach(p.vy, inp.mv[1] * 60, 600 * dt); p.y = clamp(p.y + p.vy * dt, MC.Y0 + 4, MC.Y1 - 4);
      p.aimNow = inp.aim; p.mouseNow = inp.mouse;
      if (this.phaseT > .4 && (inp.play || inp.bot && this.phaseT > .8)) this.toss('float');
      else if (this.phaseT > .4 && inp.shot) this.toss('jump');
      else if (this.phaseT > sv.wait) this.toss('float');   // an automatic float serve after 10 s
    } else if (p.ctl.kind === 'net') { if (p.netToss) { this.toss(p.netToss); p.netToss = null; } else if (this.phaseT > 12) this.toss('float'); }
    else if (this.phaseT > (p.ctl.kind === 'human' ? Math.min(sv.wait, 1.8) : sv.wait)) this.toss(VBm.AI.serveKind(this, p));   // (a CPU-played human serves at a CPU's pace)
  }
  stepToss(dt) {
    const p = this.server, sv = this.serve, err = this.now - sv.apexT;
    if (p.approach && this.now < p.approach.until) { p.x += p.approach.vx * dt; }
    if (p.ctl.kind === 'human' && !this.cpuControl) {
      const inp = VBm.humanInput(this, p, dt); p.aimNow = inp.aim; p.mouseNow = inp.mouse;
      if (this.perfectPlayer && err >= 0) return this.serveHit('PERFECT');
      if (!sv.judged && (inp.play || inp.shot) && this.now > sv.tossT + .15) { sv.judged = VBm.judge(err); sv.err = err; if (sv.judged === 'MISS') { this.serveFault(); return; } if (err >= 0) return this.serveHit(sv.judged); }
      if (sv.judged && err >= 0) return this.serveHit(sv.judged);
    } else if (p.ctl.kind === 'net') { if (p.netServe && this.now >= p.netServe.at) { const q = p.netServe.q; p.netServe = null; return this.serveHit(q); } }
    else if (err >= (p.serveErr === undefined ? (p.serveErr = (1 - VBm.AI.skill(this, p, 'POW')) * G.rand('match', -.06, .06)) : p.serveErr)) { const q = p.ctl.kind === 'human' && this.perfectPlayer ? 'PERFECT' : VBm.AI.roll(this, p, 'POW'); p.serveErr = undefined; if (q === 'MISS' && G.chance('match', .35)) return this.serveFault(); return this.serveHit(q === 'MISS' ? 'OK' : q); }
    if (this.now - sv.tossT > 1.2) this.serveFault();
  }
  serveFault() {
    const p = this.server; this.serve.done = true; p.stats.serveFaults++;
    this.bannerSay('servefault'); G.sfx('whistle'); this.talk.say(G.pickLine('sonny', 'serveFault'), 'sonny');
    this.lastTouch = p; this.pointTo(1 - p.side, 'servefault');
  }
  stepRally(dt) {
    const L = this.L; if (!L) return;
    // the net plane
    if (L.tNet !== null && !L.netDone && this.now >= L.tNet) { L.netDone = true; if (this.netEvent(L)) return; }
    // contacts: AI players at t*; a human's pending press; humans who let it pass
    const plan = this.plan;
    if (plan && !plan.done) {
      const p = plan.p;
      if (p.ctl.kind === 'ai' || (p.ctl.kind === 'human' && (this.cpuControl || p.cpuCtl))) {
        if (plan.kind === 'attack' && !p.jump && this.now >= plan.tStar - .38 && Math.hypot(plan.P[0] - p.x, plan.P[1] - p.y) < 34) VBm.jumpAt(this, p, plan.tStar, .38);
        if (this.now >= plan.tStar + (plan.aiErr === undefined ? (plan.aiErr = this.spectacle ? 0 : (1 - VBm.AI.skill(this, p, 'TEC')) * G.rand('match', -.03, .05)) : plan.aiErr)) {
          let q = p.ctl.kind === 'human' && this.perfectPlayer ? 'PERFECT' : VBm.AI.roll(this, p, plan.kind === 'attack' ? 'POW' : 'TEC', plan.touch === 0 ? this.L : null, plan.touch === 0 ? plan.tStar - plan.arrive : undefined);
          const o = { shot: plan.kind === 'attack' ? VBm.AI.wantsShot(this, p) : plan.kind === 'set' && G.chance('match', .08) && this.frontEmpty(1 - p.side), free: plan.kind === 'free' };
          if (this.spectacle && plan.kind === 'attack' && this.rallyTouches < this.specLen) o.shot = false;
          if (this.cfg.tutorial && p.cast === 'pepper' && plan.kind === 'attack') o.shot = true;   // Pepper never hits hard in the Welcome Match
          this.contact(p, q, o);
        }
      } else if (p.ctl.kind === 'human') this.humanContact(p, plan, dt);
      else if (p.ctl.kind === 'net' && this.net) this.net.remoteContact(this, p, plan);
    }
    // the human's block and the AI's
    this.stepBlocks();
    // the sand
    const waitNet = this.plan && !this.plan.done && this.plan.p.ctl.kind === 'net' ? .25 : 0;   // the host waits for a late claim
    if (this.L === L && this.now >= L.tLand + waitNet) this.landEvent(L);
  }
  frontEmpty(s) { return this.players.filter(q => q.side === s).every(q => Math.abs(q.x - MC.NET_X) > 50); }
  humanContact(p, plan, dt) {
    const I = p.ctl.input, w = VBm.windows();
    if (this.perfectPlayer) {
      if (plan.kind === 'attack' && !p.jump && this.now >= plan.tStar - .38) VBm.jumpAt(this, p, plan.tStar, .38);
      if (this.now >= plan.tStar) this.contact(p, 'PERFECT', { aim: p.aimNow || [0, 0], shot: false, free: plan.kind === 'free' });
      return;
    }
    if (plan.kind === 'attack' && !p.jump && this.now >= plan.tStar - .38 && this.now < plan.tStar && Math.hypot(plan.P[0] - p.x, plan.P[1] - p.y) < 30) { VBm.jumpAt(this, p, plan.tStar, .38); this.act(p, 'spike', { contactT: plan.tStar }); }
    if (p.pending && this.now >= p.pending.at) { const pd = p.pending; p.pending = null; return this.contact(p, pd.q, pd.o); }
    if (p.lockT > 0) return;
    if (p.judged === null && p.pressNow) {
      const err = this.now - plan.tStar;
      if (err >= -.6) {
        let q = VBm.judge(err); p.judged = q;
        const o = { shot: p.pressNow === 'shot', aim: p.aimNow, mouse: p.mouseNow, dive: !!p.dive, free: plan.kind === 'free' };
        if (q === 'MISS') return this.contact(p, 'MISS', o);
        if (err < 0) p.pending = { q, at: plan.tStar, o }; else return this.contact(p, q, o);
      }
    }
    // no press: the ball goes by (auto-receive plays an OK receive)
    if (!p.pending && this.now > plan.tStar + w.o + .02) {
      if ((plan.kind === 'receive' || plan.kind === 'dig') && (G.setting('autoReceive', false) || this.autoReceives > 0)) { if (this.autoReceives > 0) this.autoReceives--; return this.contact(p, 'OK', { aim: [0, 0] }); }
      plan.done = true; plan.missed = true; this.coverAfterMiss(p);
    }
  }
  stepBlocks() {
    const plan = this.plan; if (!plan || plan.kind !== 'attack' || plan.done) return;
    const defSide = 1 - plan.side, near = Math.abs(plan.P[0] - MC.NET_X) < 34;
    for (const b of this.players) {
      if (b.side !== defSide || b.block || b.jump || b.ctl.kind !== 'ai' || !near) continue;
      if (this.blockerFor(defSide) !== b || Math.abs(b.x - MC.NET_X) > 16) continue;
      if (plan.blockRoll === undefined) plan.blockRoll = this.spectacle ? false : G.rng('match')() < .15 + .35 * VBm.AI.skill(this, b, 'JMP');
      if (!plan.blockRoll) continue;
      const tNet = plan.tStar + Math.abs(plan.P[0] - MC.NET_X) / (G.T.spikeSpeed * .95), err = (1 - VBm.AI.skill(this, b, 'JMP')) * G.rand('match', -.12, .12);
      if (this.now >= tNet - G.T.blockRise + err - .04) this.startBlock(b);
    }
  }
  startBlock(b) { if (b.block || b.jump) return; b.block = { t0: this.now }; this.act(b, 'block'); G.sfx('whoosh'); if (b.ctl.kind === 'human') { b.ctl.input.rumble(.3, .08); if (Math.abs(b.x - MC.NET_X) < 6 && this.plan && this.plan.tStar - this.now > .35 && G.chance('match', .15)) { this.bannerSay('nettouch'); G.sfx('net'); this.netShake = 1; this.pointTo(1 - b.side, 'nettouch'); } } }
  /** the ball meets the net plane: clear (or a block), the tape, the net, outside the antennae */
  netEvent(L) {
    const cls = G.Ball.netClass(L), q = L.netAt;
    if (cls === 'antenna') { this.fault(L.by, 'antenna'); return true; }
    if (cls === 'net') { G.sfx('net'); this.netShake = 1; const v = G.Ball.vel(L, this.now); this.launch(q, [-v[0] * .25, v[1] * .5, Math.abs(v[2]) * .3], 'netball', L.by); this.side = L.by; return true; }
    if (cls === 'tape') {
      G.sfx('tape'); this.netShake = .7; const v = G.Ball.vel(L, this.now);
      const over = this.luckyNow || G.chance('match', G.T.netCordOver); this.luckyNow = false;
      if (over) { const nq = [q[0] + (L.by === 0 ? 3 : -3), q[1], MC.NET_H + MC.BALL_R + 1]; this.launch(nq, [v[0] * .35 || (L.by === 0 ? 20 : -20), v[1] * .4, 60 + G.rand('match', -20, 20)], 'cord', L.by, { tapeOver: true }); this.side = 1 - L.by; this.touches = 0; this.talk.say(G.pickLine('sonny', 'netCord'), 'sonny'); }
      else { this.launch(q, [-v[0] * .3, v[1] * .4, 30], 'cord', L.by); this.side = L.by; }
      return true;
    }
    // clear: a blocker in the air may stop it
    const def = 1 - L.by;
    for (const b of this.players) {
      if (b.side !== def || !b.block) continue;
      const top = VBm.blockTopAt(b, this.now), wide = 9 + .6 * VBm.stat(b, 'JMP');
      if (Math.abs(q[1] - b.y) <= wide && q[2] >= MC.NET_H - 2 && q[2] <= top && Math.abs(b.x - MC.NET_X) < 14) {
        const err = (b.block.t0 + G.T.blockRise) - this.now, jq = b.ctl.kind === 'human' ? VBm.judge(err) : VBm.AI.roll(this, b, 'JMP');
        const cut = L.kind === 'shot' && !(VBm.stat(b, 'JMP') >= 9 && jq === 'PERFECT'), rank = VBm.QUAL[jq].rank, beat = L.q === 'PERFECT' ? rank < 3 : L.q === 'GREAT' ? rank < 2 : false;   // a strong spike powers through a weak block
        if (cut || jq === 'MISS' || beat) continue;
        const v = G.Ball.vel(L, this.now);
        b.stats.touches++; this.lastWasBlock = true; this.lastTouch = b; G.sfx('block'); if (b.ctl.kind === 'human') b.ctl.input.rumble(.5, .12);
        if (jq === 'PERFECT' || jq === 'GREAT') {   // a stuff: back down on the attacker's side
          this.side = L.by; this.touches = 3; this.stuffBy = b;
          this.launch([q[0] + (def === 0 ? -2 : 2), q[1], q[2]], [-.35 * v[0], .3 * v[1] + G.rand('match', -20, 20), -60], 'stuff', def);
          this.popup(b, 'STUFF!', '#ffd36a');
        } else {   // a soft block: up on her own side, as a touch
          this.side = def; this.touches = 1;
          this.launch([q[0] + (def === 0 ? -3 : 3), q[1], q[2]], [(def === 0 ? -1 : 1) * 40, v[1] * .2, 70], 'softblock', def);
          this.popup(b, 'BLOCK', '#5ff0ff');
        }
        return true;
      }
    }
    this.side = def; this.touches = 0;
    return false;
  }
  /** the ball lands: in or out decides it */
  landEvent(L) {
    const land = L.land, side = L.landSide, inn = L.landIn;
    G.sfx('sand'); this.dust(land[0], land[1], 8); this.decals.push({ x: land[0], y: land[1], t: 0 });
    if (L.kind === 'toss') return this.serveFault();
    const last = this.lastTouch;
    let win;
    if (inn) { win = 1 - side; this.bannerSay('in'); }
    else { win = last ? 1 - last.side : 1 - side; this.bannerSay('out'); }
    // name the point: ace, kill, block
    if (inn && last && last.side === win) {
      if (L.serve) { last.stats.aces++; last.stats.points++; this.bannerSay('ace'); this.pointKind = 'ace'; }
      else if (L.kind === 'stuff') { last.stats.blocks++; last.stats.points++; this.bannerSay('block'); this.pointKind = 'block'; }
      else if (L.kind === 'spike' || L.kind === 'shot' || L.kind === 'dump' || L.kind === 'cord') { last.stats.kills++; last.stats.points++; this.bannerSay('kill'); this.pointKind = 'kill'; }
    } else if (inn && last && last.side !== win && this.lastAttack && this.lastAttack.side === win && this.lastAttack.t > this.serveT) { const k = this.lastAttack.p; k.stats.kills++; k.stats.points++; this.bannerSay('kill'); this.pointKind = 'kill'; this.lastTouch = k; }   // a dig that failed: the spike earned it
    else if (!inn && last && (L.kind === 'spike' || L.kind === 'shot')) last.stats.attackErrors++;
    this.L = Object.assign({}, L, { frozen: true }); this.restAt = land;
    this.pointTo(win, inn ? 'in' : 'out');
  }
  pointTo(side, why) {
    if (this.phase === 'dead' || this.phase === 'point' || this.phase === 'end') return;
    const prevGP = this.rules.gamePoint();
    const res = this.rules.point(side, why, this.rallyTouches);
    this.lastPoint = { side, why, kind: this.pointKind || why, scorer: this.lastTouch && this.lastTouch.side === side ? this.lastTouch : null, rally: this.rallyTouches, res };
    this.pointKind = null; this.plan = null; this.held = null;
    if (!this.L || !this.L.frozen) this.restAt = [this.ball.x, this.ball.y, 0];
    if (this.L) this.L.frozen = true;
    G.sfx('whistle');
    for (const f of this.crowd) if (f.side === side || G.chance('cosmetic', .4)) f.cheer = 1.4;
    G.sfx(side === this.humanSide || this.humanSide === null ? 'crowdCheer' : 'crowdGroan');
    if (side !== this.humanSide && this.humanSide !== null) this.groan = 1;
    this.comment(this.lastPoint);
    if (this.net && this.role === 'host') this.net.onPoint(this, this.lastPoint);
    G.bus.emit('point', { match: this, side, why, score: this.rules.score.slice() });
    // the final's Lucky Seven arms the first time The House reaches game point
    if (this.specials.luckySeven && !this.luckyDone && this.rules.gamePoint() === this.houseSide()) this.luckyArmed = true;
    if (res.matchOver) { this.over = true; }
    this.setPhase('dead');
    void prevGP;
  }
  houseSide() { const s = this.players.find(p => p.cast === 'sonny'); return s ? s.side : -1; }
  comment(pt) {
    if (!this.talk.on) return;
    const k = pt.kind === 'ace' ? 'ace' : pt.kind === 'kill' ? (this.bigSpike ? 'bigSpike' : 'kill') : pt.kind === 'block' ? 'block' : pt.why === 'out' ? 'out' : pt.why === 'servefault' ? null : pt.why === 'in' ? 'in' : 'fault';
    this.bigSpike = false;
    if (pt.rally >= 8) this.talk.say(G.pickLine('sonny', 'longRally'), 'sonny');
    else if (k) this.talk.say(G.pickLine('sonny', k, { name: pt.scorer ? pt.scorer.name.toUpperCase() : '' }), 'sonny');
    if (this.houseEdgeOn && this.specials.houseEdge) { this.houseEdgeOn = false; }
  }
  celebrate() {
    const pt = this.lastPoint; if (!pt) return;
    const win = this.players.filter(p => p.side === pt.side), lose = this.players.filter(p => p.side !== pt.side);
    const big = pt.scorer && (pt.kind === 'ace' || pt.kind === 'kill' || pt.kind === 'block');
    win.forEach((p, i) => { if (big && p === pt.scorer) this.act(p, 'celebrate'); else this.act(p, i === 0 ? 'highfive' : 'highfive'); p.cheerT = 1.6; });
    if (win.length === 2 && !big) { G.sfx('high_five'); const [a, b] = win; a.facing = Math.atan2(b.y - a.y, b.x - a.x); b.facing = Math.atan2(a.y - b.y, a.x - b.x); }
    lose.forEach((p, i) => { this.act(p, 'sad', { sadKind: (this.rules.rallies + i) % 3 }); });
    if (big && pt.scorer.ctl.kind === 'ai' && G.chance('cosmetic', .5)) G.voice.say(G.pickLine(pt.scorer.cast, 'bark') || 'Yes!', pt.scorer.cast, 'happy');
    // match point sting and tempo
    const mp = this.rules.matchPoint();
    if (mp >= 0 && !this.over && !this.matchPointShown) { this.matchPointShown = true; G.sting('matchpoint'); this.talk.say(G.pickLine('sonny', 'matchPoint'), 'sonny', 1); if (G.game.audio.tempo && G.SONGS[G.musicNow]) G.game.audio.tempo(G.SONGS[G.musicNow].bpm + 6); }
    if (pt.kind === 'ace') G.sting('ace');
    // a highlight replay: an ace, a stuff, a spike over 400, or a long rally (at most once every 3 points)
    const hl = (pt.kind === 'ace' || pt.kind === 'block' || this.bigSpikeReplay || pt.rally >= 8) && this.replayOn && this.rules.rallies - this.lastReplayPt >= 3 && !this.over;
    this.wantReplay = hl; this.bigSpikeReplay = false;
  }
  afterPoint() {
    if (this.wantReplay && this.buf.length > 60) { this.wantReplay = false; this.lastReplayPt = this.rules.rallies; this.startReplay(); return; }
    if (this.over) return this.endMatch();
    if (this.lastPoint && this.lastPoint.res.setOver) { this.rules.nextSet(); this.bannerSay('SET ' + this.rules.setNo); this.matchPointShown = false; }
    this.placeForServe();
  }
  endMatch() {
    this.setPhase('end');
    const w = this.rules.winner, P = this.players;
    for (const p of P) this.act(p, p.side === w ? 'celebrate' : 'kneel');
    const mvp = P.slice().sort((a, b) => (b.stats.points - a.stats.points) || (b.stats.perfects - a.stats.perfects))[0];
    this.result = { winner: w, score: this.rules.score.slice(), setsWon: this.rules.setsWon.slice(), history: this.rules.history, longest: this.rules.longest, rallies: this.rules.rallies, mvp, players: P.map(p => ({ id: p.id, cast: p.cast, side: p.side, name: p.name, stats: p.stats })), humanWon: this.humanSide !== null ? w === this.humanSide : null };
    G.sting(w === this.humanSide || this.humanSide === null ? 'win' : 'lose');
    this.talk.say(G.pickLine('sonny', w === this.humanSide || this.humanSide === null ? 'matchWin' : 'matchLose', { team: this.teamNames[w].toUpperCase() }), 'sonny', 2);
    G.bus.emit('matchEnd', { match: this, result: this.result });
    if (this.net && this.role === 'host') this.net.onEnd(this, this.result);
  }
  openResults() {
    this.setPhase('results');
    if (this.cfg.onResults) this.resultsUI = this.cfg.onResults(this, this.result);
  }
  showTip(k) {
    if (!this.tips || this.tips.has(k)) return; this.tips.add(k);
    const t = G.TUTORIAL_TIPS && G.TUTORIAL_TIPS[k]; if (!t) return;
    this.tip = { key: k, t: 0, text: t };
    if (k === 'block' || k === 'set') { /* the block tip follows the set tip */ }
  }

  /* ---------------- players ---------------- */
  stepPlayers(dt) {
    const plan = this.plan, live = this.phase === 'rally' || this.phase === 'toss';
    for (const p of this.players) {
      p.lockT = Math.max(0, p.lockT - dt); p.pressNow = null;
      const human = p.ctl.kind === 'human' && !this.cpuControl && !p.cpuCtl;
      if (p.ctl.kind === 'net') { this.netPlayerStep && this.netPlayerStep(p, dt); }
      else if (human) this.stepHuman(p, dt, plan, live);
      else this.stepAI(p, dt, plan, live);
      // a dive's lunge, slide and getting up
      if (p.dive) { const u = this.now - p.dive.t0; if (u < .22) { p.vx = p.dive.vx; p.vy = p.dive.vy; } else if (u < .52) { p.vx *= Math.pow(.02, dt); p.vy *= Math.pow(.02, dt); } else { p.vx = p.vy = 0; } if (u > .97) { p.dive = null; this.act(p, 'ready'); } }
      VBm.integrate(this, p, dt);
      // face the ball while it is live
      if (live && !p.dive) { const ta = Math.atan2(this.ball.y - p.y, this.ball.x - p.x); p.facing = E.approachAng(p.facing, ta, dt * 9); }
      else if (Math.hypot(p.vx, p.vy) > 10 && !p.dive) p.facing = E.approachAng(p.facing, Math.atan2(p.vy, p.vx), dt * 10);
      if (p.act !== 'ready' && p.act !== 'dive' && !p.block && !p.jump && this.now - p.actT0 > (p.act === 'celebrate' || p.act === 'sad' || p.act === 'kneel' || p.act === 'highfive' ? 99 : .6) && (this.phase === 'rally' || this.phase === 'serveSetup')) this.act(p, 'ready');
      if (p.bubble) { p.bubble.t += dt; if (p.bubble.t > 1) p.bubble = null; }
      if (Math.hypot(p.vx, p.vy) > 40 && G.chance('cosmetic', dt * 6)) this.dust(p.x, p.y, 1);
      G.Anim.player(this, p, dt);
    }
  }
  stepHuman(p, dt, plan, live) {
    const inp = VBm.humanInput(this, p, dt), I = p.ctl.input, mine = plan && !plan.done && plan.p === p;
    p.aimNow = inp.aim; p.mouseNow = inp.mouse;
    if (inp.view) this.toggleCam();
    if (this.phase === 'serveSetup' && p === this.server) return;   // stepServeSetup moves her
    if (this.phase === 'toss' && p === this.server) { p.vx = p.vy = 0; return; }
    if (p.dive || p.lockT > 0 && !p.jump) { if (!p.dive) { p.vx *= .8; p.vy *= .8; } }
    else {
      let mv = inp.mv;
      if (Math.hypot(mv[0], mv[1]) < .1 && mine && (G.setting('autoMove', true) !== false || this.cfg.tutorial)) {   // auto-run to the ball
        const dx = plan.P[0] - p.x, dy = plan.P[1] - p.y, d = Math.hypot(dx, dy);
        if (d > 3) mv = [dx / d * G.T.autoMove * Math.min(1, d / 14), dy / d * G.T.autoMove * Math.min(1, d / 14)];
      }
      const sp = VBm.speed(p); VBm.steer(p, mv[0] * sp, mv[1] * sp, dt);
    }
    if (!live) return;
    if (inp.call) { p.call = p.call === 'auto' ? 'mine' : p.call === 'mine' ? 'yours' : 'auto'; p.bubble = { text: p.call === 'mine' ? 'MINE!' : p.call === 'yours' ? 'YOURS!' : 'AUTO', t: 0 }; this.act(p, 'call'); if (p.call !== 'auto') G.voice.say(p.call === 'mine' ? 'Mine!' : 'Yours!', p.cast, 'excited'); if (this.plan && !this.plan.done && this.L) this.planNext(); if (this.tips) this.showTip('chem'); }
    if (inp.dive && !p.dive && !p.jump && !p.block) {
      let d = Math.hypot(inp.mv[0], inp.mv[1]) > .2 ? inp.mv : mine ? [plan.P[0] - p.x, plan.P[1] - p.y] : [p.side ? -1 : 1, 0];
      const l = Math.hypot(d[0], d[1]) || 1; p.dive = { t0: this.now, vx: d[0] / l * 190, vy: d[1] / l * 190 }; this.act(p, 'dive'); G.sfx('dive'); I.rumble(.3, .15);
    }
    if (mine) { if (inp.play) p.pressNow = 'play'; else if (inp.shot) p.pressNow = 'shot'; if (this.tips && plan.kind === 'receive' && Math.hypot(plan.P[0] - p.x, plan.P[1] - p.y) > VBm.reachR(p) + 12 && plan.tStar - this.now < .5) this.showTip('dive'); }
    else if (inp.shot && plan && plan.side !== p.side && Math.abs(p.x - MC.NET_X) < 20) this.startBlock(p);
    if (this.tips && plan && plan.side !== p.side && plan.kind === 'attack' && Math.abs(p.x - MC.NET_X) < 40) this.showTip('block');
  }
  stepAI(p, dt, plan, live) {
    if (this.phase === 'serveSetup' && p === this.server) { p.vx = p.vy = 0; return; }
    if (this.phase === 'toss' && p === this.server) { if (!p.approach || this.now >= p.approach.until) { p.vx = p.vy = 0; } return; }
    if (p.dive || p.lockT > 0) return;
    if (this.phase !== 'rally' && this.phase !== 'serveSetup' && this.phase !== 'toss' && this.phase !== 'intro') { if (this.phase === 'point' || this.phase === 'dead' || this.phase === 'end' || this.phase === 'results') this.stepCelebrationMove(p, dt); else { p.vx *= .8; p.vy *= .8; } return; }
    if (p.react > 0) { p.react -= dt; p.vx *= Math.pow(.05, dt); p.vy *= Math.pow(.05, dt); return; }
    let t;
    if (plan && !plan.done && plan.p === p) t = plan.P; else t = VBm.AI.spot(this, p);
    if (this.phase === 'intro') t = [p.x, p.y];
    p.target = t;
    const dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy), sp = VBm.speed(p) * Math.min(1, d / 12);
    if (d > 1.5) VBm.steer(p, dx / d * sp, dy / d * sp, dt); else VBm.steer(p, 0, 0, dt);
    // an AI that can't reach it in time dives
    if (plan && !plan.done && plan.p === p && !p.dive && !p.jump && plan.kind !== 'attack' && plan.tStar - this.now < .3 && plan.tStar - this.now > .1 && d > VBm.reachR(p) + 2 && d < VBm.reachR(p) + G.T.diveReach + 30) {
      p.dive = { t0: this.now, vx: dx / d * 190, vy: dy / d * 190 }; this.act(p, 'dive'); G.sfx('dive');
    }
  }
  stepCelebrationMove(p, dt) {
    const mate = this.mate(p);
    if (p.act === 'highfive' && mate && mate.act === 'highfive') { const dx = mate.x - p.x, dy = mate.y - p.y, d = Math.hypot(dx, dy); if (d > 10) VBm.steer(p, dx / d * 50, dy / d * 50, dt); else { VBm.steer(p, 0, 0, dt); if (!p.fived && mate.slot > p.slot) { p.fived = true; G.sfx('high_five'); G.fx.sparkle((p.x + mate.x) / 2, (p.y + mate.y) / 2, 30); } } p.facing = Math.atan2(dy, dx); }
    else VBm.steer(p, 0, 0, dt);
    if (this.phase === 'point' && this.phaseT < .05) p.fived = false;
  }
  toggleCam() { this.camMode = this.camMode === 'Broadcast' ? 'Serve Cam' : 'Broadcast'; G.game.note((this.camMode === 'Broadcast' ? 'BROADCAST' : 'SERVE CAM')); }

  /* ---------------- the ball's place now ---------------- */
  updateBall() {
    const b = this.ball;
    if (this.held) { const a = this.held.rig.hand('L'), c = this.held.rig.hand('R'), h = a[1] > c[1] ? a : c; b.x = h[0]; b.y = h[1] + 1; b.z = h[2] + 2; return; }   // the hand nearer the camera, so the ball shows
    if (this.L && !this.L.frozen) { const q = G.Ball.at(this.L, this.now); const sp = Math.hypot(...G.Ball.vel(this.L, this.now)); b.spin += sp * .004; b.x = q[0]; b.y = q[1]; b.z = Math.max(MC.BALL_R, q[2]); this.trail.push([b.x, b.y, b.z]); if (this.trail.length > 6) this.trail.shift(); }
    else if (this.restAt) { const k = Math.min(1, this.phaseT * 2); b.z = MC.BALL_R; b.x = this.restAt[0] + k * 4; b.y = this.restAt[1] + k * 2; b.spin += .02; this.trail.length = 0; }
  }
  /* ---------------- the highlight replay ---------------- */
  record() {
    if (!this.replayOn || this.replay) return;
    if (this.phase !== 'rally' && this.phase !== 'dead' && this.phase !== 'toss') return;
    this.buf.push({ now: this.now, ball: [this.ball.x, this.ball.y, this.ball.z, this.ball.spin], ps: this.players.map(p => [p.x, p.y, p.z, p.facing, Object.assign({}, p.rs, { poseW: Object.assign({}, p.rs.poseW) }), p.rig.arms ? Object.assign({}, p.rig.arms) : null]) });
    while (this.buf.length && this.now - this.buf[0].now > 6) this.buf.shift();
  }
  startReplay() {
    const end = this.buf[this.buf.length - 1].now, from = end - 2.8;
    let i0 = this.buf.findIndex(f => f.now >= from); if (i0 < 0) i0 = 0;
    this.replay = { i: i0, t: this.buf[i0].now, end, cam: this.camMode };
    this.camMode = this.camMode === 'Broadcast' ? 'Serve Cam' : 'Broadcast';
    this.setPhase('replay');
  }
  updateReplay(dt) {
    const R = this.replay; this.phaseT += dt;
    R.t += dt * .42;
    while (R.i < this.buf.length - 1 && this.buf[R.i + 1].now <= R.t) R.i++;
    const f = this.buf[R.i];
    this.ball.x = f.ball[0]; this.ball.y = f.ball[1]; this.ball.z = f.ball[2]; this.ball.spin = f.ball[3];
    this.players.forEach((p, k) => { const s = f.ps[k]; p.x = s[0]; p.y = s[1]; p.z = s[2]; p.facing = s[3]; p.rig.arms = s[5]; p.rig.update(dt * .42, s[4]); });
    if (R.t >= R.end || (this.phaseT > .5 && this.skipPressed())) { this.replay = null; this.camMode = R.cam; this.buf.length = 0; if (this.over) this.endMatch(); else { if (this.lastPoint && this.lastPoint.res.setOver) { this.rules.nextSet(); this.matchPointShown = false; } this.placeForServe(); } }
  }
  /* ---------------- the camera ---------------- */
  camera(game) {
    const b = this.ball, view = this.camMode === 'Serve Cam' ? E.VIEWS.servecam : E.VIEWS.court;
    if (game.view !== view) { game.setView(view); this.view = view; }
    this.view = game.view;
    const cam = game.cam;
    if (this.camMode === 'Serve Cam') {   // behind the left team, framing the ball (a little ahead of it) and all four, so no one at a baseline falls off the screen
      cam.smooth = .25; const lead = this.L && !this.L.frozen ? G.Ball.vel(this.L, this.now)[0] * .15 : 0;
      cam.frame([{ x: clamp(b.x + lead, MC.X0 - 10, MC.X1 + 10), y: b.y, z: b.z }, ...this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 24 })), { x: MC.NET_X, y: MC.CY, z: MC.NET_H }], { margin: 24, zoom: [.66 * G.T.cameraZoomMul, .95 * G.T.cameraZoomMul] });
    }
    else {
      cam.smooth = .22;
      const targets = this.phase === 'serveSetup' || this.phase === 'intro' || this.phase === 'coin' ? this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 20 })) : [{ x: b.x, y: b.y, z: b.z }, ...this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 20 }))];
      targets.push({ x: MC.NET_X, y: MC.CY, z: MC.NET_H });
      cam.frame(targets, { margin: 30, zoom: [.78 * G.T.cameraZoomMul, 1 * G.T.cameraZoomMul] });
    }
  }
  /* ---------------- drawing ---------------- */
  draw(r) {
    const C = MC, t = this.now;
    const horizon = r.w(C.NET_X, 0, 0)[1];
    G.drawSky(r, this.tod, horizon);
    this.mapRef.drawFloor(r);
    G.drawShore(r, G.now());
    // the ball mark, the timing ring, the aim reticle, the debug overlay
    for (const d of this.decals) d.t += 1 / 60;
    this.decals = this.decals.filter(d => d.t < 2.5);
    r.decal(g => { for (const d of this.decals) { const p = r.w(d.x, d.y, 0); px.blend(g, .5 * (1 - d.t / 2.5), 'multiply', () => px.ell(g, p[0], p[1], 3, 1.5, '#a07840')); } });
    this.drawRing(r);
    G.drawCourtProps(r, { tod: this.tod, final: this.cfg.final });
    G.drawCrowd(r, this.crowd, G.now(), this.groan > 0 ? 'groan' : null);
    this.drawSideline(r);
    G.drawNet(r, this.netShake * 2);
    for (const p of this.players) {
      r.shadow(p.x, p.y, 6, .35 - Math.min(.2, p.z * .005));
      r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view));
      if (p.ctl.kind === 'human' || p.tag) this.drawMarker(r, p);
      if (p.bubble) r.queue(p.x, p.y, 56, g => { const q = r.w(p.x, p.y, p.z + 56); G.ui.tag(g, p.bubble.text, q[0], q[1], '#2a1a10', '#fff8e8'); }, { bias: 2 });
    }
    if (this.phase !== 'serveSetup' || !this.held) G.drawBall(r, this.ball.x, this.ball.y, this.ball.z, this.ball.spin, { trail: this.L && (this.L.kind === 'spike' || this.L.kind === 'jumpserve') && !this.L.frozen ? this.trail : null });
    else G.drawBall(r, this.ball.x, this.ball.y, this.ball.z, 0);
    for (const pp of this.popups) r.queue(pp.x, pp.y, pp.z, g => { const q = r.w(pp.x, pp.y, pp.z + pp.t * 14); E.font.text(g, pp.text, Math.round(q[0]), Math.round(q[1]), pp.col, { align: 'center', shadow: '#0a0814', outline: false }); }, { bias: 3 });
    if (this.tod === 'night' || this.tod === 'sunset') { /* floodlights come from the props */ }
    if (this.debugOverlay) this.drawDebug(r);
    r.overlay(g => this.drawHUD(g, r));
  }
  drawSideline(r) {
    // Sonny at his DJ booth, Pepper at the scorer's table (when they're not playing), and the flip scoreboard's cards
    const t = G.now(), host = this.players.some(p => p.cast === 'sonny');
    if (!host) {
      if (!this.sonnyRig) { this.sonnyRig = G.makeRig('sonny'); this.pepperRig = G.makeRig('pepper'); }
      const cheer = this.crowd.some(f => f.cheer > 0);
      G.Anim.idle(this.sonnyRig, 1 / 60, { x: 352, y: 140, z: 0, facing: Math.PI / 2, pose: cheer ? 'cheer' : null, expr: 'smile' }, { clip: !cheer ? 'Dance_Loop' : null, t, mask: 'upper' });
      G.Anim.idle(this.pepperRig, 1 / 60, { x: 392, y: 172, z: 0, facing: Math.PI / 2, poseW: { sit: 1 } });
      r.actor(352, 140, 0, (g, ox, oy) => this.sonnyRig.draw(g, ox, oy, r.view), { every: 2, key: this.sonnyRig });
      r.actor(392, 172, 0, (g, ox, oy) => this.pepperRig.draw(g, ox, oy, r.view), { every: 2, key: this.pepperRig });
    }
    const sc = this.rules.score;
    r.queue(316, 161, 21, g => { const a = r.w(306, 161, 24), b = r.w(326, 161, 24); for (const [q, v] of [[a, sc[0]], [b, sc[1]]]) { px.rect(g, q[0] - 5, q[1] - 6, 10, 10, '#f8f6f0'); px.rect(g, q[0] - 5, q[1] - 1, 10, 1, '#c8c4b8'); E.font.text(g, String(v), Math.round(q[0]), Math.round(q[1] - 5), '#1a2a4a', { align: 'center', outline: false }); } }, { bias: .5 });
  }
  drawMarker(r, p) {
    const col = p.color || (p.ctl.input ? E.PLAYER_COLORS[(p.ctl.input.player || 1) - 1] : '#ffd36a') || '#ffd36a', z = p.z + p.size * 31 + 5;
    r.queue(p.x, p.y, z, g => { const q = r.w(p.x, p.y, z), x = Math.round(q[0]), y = Math.round(q[1]); px.poly(g, [[x - 3, y - 4], [x + 3, y - 4], [x, y]], col); if (p.tag) E.font.text(g, p.tag, x, y - 13, col, { align: 'center', shadow: '#000', outline: false }); }, { emissive: true, bias: 2 });
    r.decal(g => { const q = r.w(p.x, p.y, 0); px.blend(g, .5, 'add', () => px.ell(g, q[0], q[1], 7, 3, col)); });
  }
  drawRing(r) {
    const plan = this.plan; if (!plan || plan.done) return;
    const p = plan.p; if (p.ctl.kind !== 'human' || G.setting('ring', true) === false || this.cpuControl) return;
    if (this.dazzled === p) return;
    const left = plan.tStar - this.now; if (left > 1.6) return;
    const w = VBm.windows(), k = clamp(left / .8, 0, 1), rad = VBm.reachR(p) + (22 - VBm.reachR(p)) * k, perfect = Math.abs(left) <= w.p;
    r.groundRing(plan.P[0], plan.P[1], rad, perfect ? '#ffd36a' : '#ffffff', .9);
    r.groundRing(plan.P[0], plan.P[1], VBm.reachR(p), '#ffd36a', .35);
    if (left < .35 && left > -w.o) r.queue(p.x, p.y, 54, g => { const q = r.w(p.x, p.y, p.z + p.size * 30 + 18); E.font.text(g, '!', Math.round(q[0]), Math.round(q[1]), '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }); }, { emissive: true, bias: 3 });
    // the aim reticle with the mouse
    if (plan.kind === 'attack' && p.mouseNow) r.groundRing(p.mouseNow[0], p.mouseNow[1], 5, '#ff5f7a', .9);
  }
  drawDebug(r) {
    const L = this.L;
    if (L && !L.frozen) r.decal(g => { let prev = null; for (let t = this.now; t < L.tLand; t += .05) { const q = G.Ball.at(L, t), s = r.w(q[0], q[1], q[2]); if (prev) px.line(g, prev[0], prev[1], s[0], s[1], '#ff5fa2'); prev = s; } const l = r.w(L.land[0], L.land[1], 0); px.rect(g, l[0] - 2, l[1] - 2, 4, 4, L.landIn ? '#5fe07a' : '#ff5a5a'); });
    if (this.plan) for (const c of [this.plan, ...(this.plan.others || [])]) r.groundRing(c.P[0], c.P[1], 6, c === this.plan ? '#5ff0ff' : '#5a7a8a', .9);
    r.overlay(g => {
      for (const p of this.players) { const q = r.w(p.x, p.y, p.z + 44); E.font.text(g, p.act + (this.plan && this.plan.p === p ? ' *' + this.plan.kind : ''), Math.round(q[0]), Math.round(q[1]), '#5ff0ff', { align: 'center', font: 'tiny', outline: '#000' }); }
      const w = VBm.windows(), x = Math.round(r.W / 2 - 60), y = Math.round(r.H * .16);
      px.rect(g, x, y, 120, 6, '#202030'); const s = 120 / 1.2; px.rect(g, x + 60 - w.o * s, y, w.o * 2 * s, 6, '#5a5a6a'); px.rect(g, x + 60 - w.g * s, y, w.g * 2 * s, 6, '#5ff0ff'); px.rect(g, x + 60 - w.p * s, y, w.p * 2 * s, 6, '#ffd36a');
      if (this.plan) { const e = clamp(this.now - this.plan.tStar, -.6, .6); px.rect(g, x + 60 + e * s, y - 2, 1, 10, '#ffffff'); }
    });
  }
  drawHUD(g, r) {
    const safe = G.safe(r), x = safe.x, y = safe.y, R = this.rules, srv = R.serveSide;
    // the TV score bug: two rows, portraits, names, score, the serve ball, sets, MATCH POINT
    const bw = 150;
    E.ui.box(g, x, y, bw, 34, { bg: ['#10202e', '#0a1420'], border: '#f6d38a', alpha: .9 });
    [0, 1].forEach(s => {
      const yy = y + 4 + s * 14, two = this.players.filter(p => p.side === s);
      two.forEach((p, i) => G.portrait(g, p.rig, x + 4 + i * 12, yy - 1, 11, { frame: false }));
      E.font.text(g, G.fit(this.teamNames[s].toUpperCase(), 80), x + 30, yy + 2, s === this.humanSide ? '#ffd36a' : '#fff8e8', { outline: false });
      if (srv === s && this.phase !== 'end' && this.phase !== 'results') G.icon(g, 'ball', x + bw - 32, yy + 1);
      if (R.sets > 1) E.font.text(g, String(R.setsWon[s]), x + bw - 40, yy + 2, '#9fd3d6', { outline: false });
      E.font.text(g, String(R.score[s]), x + bw - 12, yy + 1, '#fff8e8', { align: 'center', outline: false, shadow: '#000' });
    });
    const mp = R.matchPoint();
    if (mp >= 0 && !this.over) { E.ui.box(g, x, y + 35, 70, 11, { bg: ['#ff5f7a', '#c8304a'], border: '#ffd0d8', alpha: .95 }); E.font.text(g, 'MATCH POINT', x + 35, y + 37, '#fff8e8', { align: 'center', outline: false, font: 'tiny' }); }
    if (this.cfg.final) E.font.text(g, 'THE FORTUNA CUP FINAL', x, y + (mp >= 0 ? 49 : 38), '#ffd36a', { shadow: '#000', outline: false });
    // top right: the clock badge (vacation) or the hub clock
    if (this.cfg.clock) this.cfg.clock(g, r);
    // bottom left: the partner card
    const hum = this.humans()[0], mate = hum && this.mate(hum);
    if (mate && mate.ctl.kind === 'ai' && mate.affinity !== undefined && this.mode !== 'exhibition') {
      const cy = r.H - safe.y - 28;
      E.ui.box(g, x, cy, 96, 26, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .88 });
      G.portrait(g, mate.rig, x + 3, cy + 3, 20, { frame: false });
      E.font.text(g, mate.name, x + 26, cy + 3, '#fff8e8', { outline: false }); G.ui.hearts(g, x + 26, cy + 14, mate.affinity, 5);
    }
    // the banner
    if (this.banner) {
      const b = this.banner, k = clamp(b.t / .15, 0, 1), sc = b.text.length > 10 ? 2 : 3;
      const yy = Math.round(r.H * .3);
      px.blend(g, .55, 'multiply', () => px.rect(g, 0, yy - 4, r.W, 30, '#203040'));
      G.icon(g, b.icon === 'star' ? 'star' : 'ball', Math.round(r.W / 2 - E.font.width(b.text, { scale: sc }) / 2 - 14), yy + 6);
      E.font.title(g, b.text, Math.round(r.W / 2 + (1 - k) * 40), yy, { scale: sc, align: 'center', colors: ['#ffffff', '#ffd36a', '#ff9e5e'], depth: 2 });
    }
    // phase cards
    if (this.phase === 'intro') { const iy = Math.round(r.H * .3); px.blend(g, .5, 'multiply', () => px.rect(g, 0, iy - 6, r.W, 60, '#102030')); E.font.title(g, this.cfg.title || (this.cfg.final ? 'THE FINAL' : 'BEACH MATCH'), r.W / 2, iy, { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3 }); E.font.text(g, this.teamNames[0] + '  vs  ' + this.teamNames[1], r.W / 2, iy + 30, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, 'First to ' + R.toWin + (R.sets > 1 ? ', best of ' + R.sets + ' sets' : '') + ', win by 2', r.W / 2, iy + 41, '#9fd3d6', { align: 'center', shadow: '#000', outline: false }); }
    if (this.phase === 'replay') { px.rect(g, 0, 0, r.W, 14, '#000000'); px.rect(g, 0, r.H - 14, r.W, 14, '#000000'); E.font.text(g, 'REPLAY', 8, 4, '#ff5f7a', { outline: false }); if (Math.floor(G.now() * 2) % 2) px.disc(g, 48, 7, 2, '#ff2a2a'); E.font.text(g, 'any button skips', r.W - 8, r.H - 11, '#9fd3d6', { align: 'right', outline: false }); }
    if (this.dazzleTell && this.now - this.dazzleTell < 1.6) { const hum2 = this.humans().find(p => p.side !== srv); if (hum2) E.font.title(g, hum2.shades ? 'SHADES ON!' : 'DAZZLED!', r.W / 2, Math.round(r.H * .2), { scale: 2, align: 'center', colors: hum2.shades ? ['#ffffff', '#5ff0ff'] : ['#ffffff', '#ffd36a', '#ff9e5e'] }); }
    // the commentary box and the prompts
    this.talk.draw(g, r);
    if (this.tip) this.drawTip(g, r);
    if (this.phase !== 'results') this.drawPrompts(g, r);
    if (this.phase === 'results' && this.resultsUI) this.resultsUI.draw(g, r);
  }
  drawTip(g, r) {
    const T = this.tip, text = typeof T.text === 'function' ? T.text(this.humans()[0] ? this.humans()[0].ctl.input : G.game.input) : T.text, w = Math.min(250, r.W - 40), lines = E.font.wrap(text, w - 40), h = lines.length * 9 + 16, x = Math.round((r.W - w) / 2), y = Math.round(r.H * .05) + 2;
    const k = clamp(T.t / .2, 0, 1) * clamp((5.5 - T.t) / .3, 0, 1);
    G.ui.panel(g, x, y - (1 - k) * 30, w, h, { title: "PEPPER'S TIP", alpha: .95 });
    G.portrait(g, G.portraitRig('pepper'), x + 5, y + 6 - (1 - k) * 30, 22, { frame: false });
    lines.forEach((l, i) => E.font.text(g, l, x + 32, y + 7 + i * 9 - (1 - k) * 30, '#fff8e8', { shadow: '#0a0814', outline: false }));
  }
  drawPrompts(g, r) {
    const hum = this.humans(); if (!hum.length || this.cpuControl) return;
    if (hum.length > 1) return this.drawMultiPrompts(g, r, hum);
    const p = hum[0], I = p.ctl.input, plan = this.plan, items = [];
    if (this.phase === 'serveSetup' && this.server === p) { items.push(['play', 'Float serve'], ['shot', 'Jump serve'], ['move', 'Walk']); }
    else if (this.phase === 'toss' && this.server === p) items.push(['play', 'Hit at the top']);
    else if (this.phase === 'rally') {
      const mine = plan && !plan.done && plan.p === p;
      if (mine) { const k = plan.kind; items.push(['play', k === 'set' ? 'Set' : k === 'attack' ? 'Spike' : k === 'free' ? 'Free ball' : 'Bump'], ['shot', k === 'attack' ? 'Cut shot' : k === 'set' ? 'Dump' : 'Free ball'], ['dive', 'Dive']); }
      else if (plan && plan.side !== p.side && plan.kind === 'attack') items.push(['shot', 'Block'], ['dive', 'Dive'], ['call', 'Call']);
      else items.push(['call', p.call === 'auto' ? 'Call' : p.call === 'mine' ? 'Mine!' : 'Yours!'], ['dive', 'Dive'], ['view', 'Camera']);
    } else if (this.phase === 'intro' || this.phase === 'point' || this.phase === 'end') items.push(['confirm', 'Skip']);
    else if (this.phase === 'replay') items.push(['confirm', 'Skip replay']);
    if (items.length) G.promptBar(g, r, items.slice(0, 3), { input: I, x: Math.round(r.W * .05) + 104 > r.W / 2 - 80 ? undefined : undefined });
  }
  drawMultiPrompts(g, r, hum) {
    // each player's prompt over her own head, in her own device's glyphs
    for (const p of hum) {
      const I = p.ctl.input, plan = this.plan; let a = null, txt = '';
      if (this.phase === 'serveSetup' && this.server === p) { a = 'play'; txt = 'Serve'; }
      else if (this.phase === 'toss' && this.server === p) { a = 'play'; txt = 'Hit'; }
      else if (plan && !plan.done && plan.p === p && this.phase === 'rally') { a = 'play'; txt = plan.kind === 'set' ? 'Set' : plan.kind === 'attack' ? 'Spike' : 'Bump'; }
      if (!a) continue;
      const q = G.lastR ? G.lastR.w(p.x, p.y, p.z + 62) : [0, 0];
      const w = G.promptW(a, txt, { input: I });
      G.prompt(g, Math.round(q[0] - w / 2), Math.round(q[1] - 6), a, txt, { input: I });
    }
  }
};


/* ---- 25-netplay.js ---- */
/* 25-netplay: AI Hub sessions (shared world). The game opens straight into its own card (the court at sunset, the four
 * fighters lined up, CPUs tagged, everyone's name in her seat color with a READY tick, the countdown), then one match on
 * the hub's clock. The host runs the rules and the AI; every copy flies the ball from the same launches on the shared
 * clock, so each player judges her own touches fairly and sends a claim the host validates. Clients move their own
 * fighter at once and see the others from snapshots 100 ms behind. Only the host calls finish(). Messages are small JSON:
 * m (a client's fighter), c (a touch claim), v (a serve), s (the host's snapshot), b (a launch and the next contact),
 * e (an event: a point, a phase), and the final s with over: 1. */
G.PRESETS.HUB = Object.assign({}, G.PRESETS.MATCH, { ready: ['Enter', 'NumpadEnter', 'Pad0', 'Space'], more: ['KeyT', 'Pad3'] });
const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
G.Net = {
  info: null, card: null, started: false, ended: null, leftIds: new Set(), lastSend: 0, inbox: [], snaps: [], sentAt: [],
  hub() { return window.AIHub; },
  send(d, reliable = true) { if (this.ended) return false; const now = performance.now(); this.sentAt = this.sentAt.filter(t => now - t < 1000); if (this.sentAt.length >= 16) return false; this.sentAt.push(now); try { return this.hub().send(d, { reliable }); } catch (e) { return false; } },
  /** the teams: seat i plays side i % 2, slot floor(i / 2); empty seats are CPUs */
  lineup(info) {
    const H = this.hub(), r1 = H.rng('cast'), cast = G.FIGHTERS.slice();
    for (let i = cast.length - 1; i > 0; i--) { const j = Math.floor(r1() * (i + 1)); [cast[i], cast[j]] = [cast[j], cast[i]]; }
    const r2 = H.rng('court'), tod = ['sunset', 'afternoon', 'night', 'morning'][Math.floor(r2() * 4)];
    const seats = [0, 1, 2, 3].map(i => { const pl = info.players[i]; return { i, side: i % 2, slot: Math.floor(i / 2), cast: cast[i], player: pl || null }; });
    return { seats, tod, seed: Math.floor(H.rng('match')() * 1e9) };
  },
  /** the match config for this copy (host: humans remote; client: only me local) */
  matchCfg(info, L) {
    const me = info.me, teams = [[], []];
    for (const s of L.seats) {
      const pl = s.player, mine = pl && pl.id === me && !info.server;
      teams[s.side][s.slot] = { cast: s.cast, ctl: mine ? { kind: 'human', input: G.game.input } : pl ? { kind: 'net', pid: pl.id } : { kind: 'ai' }, skill: G.DAY_SKILL.hub, color: pl ? (pl.color || SEAT_COLORS[s.i]) : null, tag: pl ? pl.name : 'CPU', name: G.castName(s.cast) };
    }
    return { mode: 'hub', role: info.isHost ? 'host' : 'client', net: this, teams, pointsToWin: 7, tod: L.tod, seed: L.seed, replay: false, commentary: true, introTime: 999, difficulty: 'Normal',
      teamNames: [0, 1].map(side => L.seats.filter(s => s.side === side).map(s => s.player ? s.player.name : 'CPU').join(' & ')), title: 'BEACH MATCH', onResults: () => null,
      clock: (g, r) => { const t = Math.max(0, window.AIHub.time() / 1000), s = Math.floor(t % 60), m = Math.floor(t / 60), sf = G.safe(r), txt = m + ':' + String(s).padStart(2, '0'); E.ui.box(g, r.W - sf.x - 44, sf.y, 44, 15, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .9 }); E.font.text(g, txt, r.W - sf.x - 22, sf.y + 4, '#fff8e8', { align: 'center', outline: false }); } };
  },
  /* ---- host hooks (the Match calls them) ---- */
  onPhase(M, ph) { this.send({ t: 'e', ev: 'ph', ph, sv: M.server ? M.server.id : -1, sc: M.rules.score }); },
  onLaunch(M, L) { this.pendingB = L; },
  onPlan(M, plan) { const L = M.L; this.send({ t: 'b', t0: +L.t0.toFixed(4), p: L.p.map(v => +v.toFixed(2)), v: L.v.map(v => +v.toFixed(2)), k: L.k, g: L.g, ay: L.ay, wob: L.wob, by: L.by, kind: L.kind, sv: L.serve ? 1 : 0, pl: plan ? [plan.p.id, plan.kind, +plan.tStar.toFixed(4), Math.round(plan.P[0]), Math.round(plan.P[1])] : null }); this.pendingB = null; },
  onPoint(M, pt) { this.send({ t: 'e', ev: 'pt', side: pt.side, why: pt.why, kind: pt.kind, sc: M.rules.score, sets: M.rules.setsWon }); },
  onEnd(M, res) { this.snapshot(M, true); this.finish(M); },
  hostStep(M, dt) {
    if (this.pendingB) { const L = M.L; if (L === this.pendingB) this.onPlan(M, M.plan); this.pendingB = null; }
    this.acc = (this.acc || 0) + dt; if (this.acc >= 1 / 12) { this.acc = 0; this.snapshot(M, false); }
    // a client's claims arrive here
    for (const { d, from } of this.inbox.splice(0)) this.hostMsg(M, d, from);
  },
  snapshot(M, over) { const d = { t: 's', at: Math.round(M.now * 1000), p: M.players.map(p => [p.id, Math.round(p.x), Math.round(p.y), +p.facing.toFixed(2), p.act, Math.round(p.z)]), sc: M.rules.score, ph: M.phase, sv: M.server ? M.server.id : -1, tc: M.touches }; if (over) d.over = 1; this.send(d, !!over); },
  hostMsg(M, d, from) {
    const p = M.players.find(q => q.ctl.kind === 'net' && q.ctl.pid === from); if (!p) return;
    if (d.t === 'm') { p.netTarget = [d.x, d.y]; p.netF = d.f; p.netAct = d.a; p.netSeen = M.now; }
    else if (d.t === 'v') { if (d.toss && M.server === p && M.phase === 'serveSetup') p.netToss = d.toss === 'jump' ? 'jump' : 'float'; if (d.q && M.server === p && M.phase === 'toss') p.netServe = { at: d.at / 1000, q: d.q, aim: d.aim }; }
    else if (d.t === 'c') {
      if (d.k === 'block') { if (M.plan && M.plan.side !== p.side && Math.abs(p.x - G.C.NET_X) < 22) M.startBlock(p); return; }
      p.claim = { at: d.at / 1000, q: d.q, aim: d.aim || [0, 0], sh: !!d.sh };
    }
  },
  /** the host plays a remote player's touch from her claim (or lets the ball by when none comes in time) */
  remoteContact(M, p, plan) {
    const w = G.VB.windows(1), c = p.claim;
    if (c) {
      p.claim = null;
      const ok = Math.abs(c.at - plan.tStar) <= w.o + .12, ball = G.Ball.at(M.L, c.at), near = Math.hypot(ball[0] - p.x, ball[1] - p.y) <= G.VB.reachR(p) + 12 + 30;
      if (ok && near && !plan.done) { const keep = M.now; M.now = Math.max(M.L.t0, c.at); if (plan.kind === 'attack' && !p.jump) G.VB.jumpAt(M, p, M.now, .2); M.contact(p, G.VB.QUAL[c.q] ? c.q : 'OK', { shot: c.sh, aim: c.aim }); M.now = keep; return; }
    }
    if (M.now > plan.tStar + w.o + .3) { plan.done = true; plan.missed = true; M.coverAfterMiss(p); }
  },
  finish(M) {
    if (this.finished || !this.hub().isHost) return; this.finished = true;
    const R = M.rules, humans = M.players.filter(p => p.ctl.kind === 'human' || p.ctl.kind === 'net'), pid = p => p.ctl.kind === 'human' ? this.info.me : p.ctl.pid;
    const ids = s => humans.filter(p => p.side === s && !this.leftIds.has(pid(p))).map(pid);
    const lead = R.score[0] === R.score[1] ? -1 : R.score[0] > R.score[1] ? 0 : 1, scores = {}, stats = {};
    for (const p of humans) { scores[pid(p)] = R.score[p.side]; stats[pid(p)] = { Points: p.stats.points, Kills: p.stats.kills }; }
    const mvp = humans.slice().sort((a, b) => b.stats.points - a.stats.points)[0];
    const out = { scores, stats, awards: mvp ? [{ id: pid(mvp), title: 'MVP', detail: mvp.stats.points + ' points' }] : [] };
    const live = humans.filter(p => !this.leftIds.has(pid(p)));
    if (live.length === 1) { out.standings = [[pid(live[0])]]; out.won = lead === live[0].side; }
    else if (lead < 0) out.standings = [live.map(pid)];
    else out.standings = [ids(lead), ids(1 - lead)].filter(a => a.length);
    try { this.hub().finish(out); } catch (e) { G.game.fail('finish', e); }
  },
  /* ---- client side ---- */
  clientUpdate(M, dt) {
    const H = this.hub(); M.now = H.time() / 1000; M.phaseT += dt; M.talk.update(dt);
    for (const pp of M.popups) pp.t += dt; M.popups = M.popups.filter(pp => pp.t < .9); if (M.banner) { M.banner.t += dt; if (M.banner.t > 1.6) M.banner = null; }
    for (const { d } of this.inbox.splice(0)) this.clientMsg(M, d);
    const me = M.players.find(p => p.ctl.kind === 'human');
    // the others from snapshots, 100 ms behind
    const rt = M.now * 1000 - 100, S = this.snaps; let a = null, b = null;
    for (let i = S.length - 1; i >= 0; i--) if (S[i].at <= rt) { a = S[i]; b = S[i + 1] || S[i]; break; }
    if (!a && S.length) a = b = S[0];
    if (a) for (const p of M.players) { if (p === me) continue; const pa = a.p.find(q => q[0] === p.id), pb = (b.p.find(q => q[0] === p.id)) || pa; if (!pa) continue; const k = b.at > a.at ? clamp((rt - a.at) / (b.at - a.at), 0, 1) : 0; p.x = lerp(pa[1], pb[1], k); p.y = lerp(pa[2], pb[2], k); p.facing = pb[3]; p.z = pb[5] || 0; if (p.act !== pb[4]) M.act(p, pb[4]); }
    // my fighter, at once
    if (me && !this.ended) {
      const inp = G.VB.humanInput(M, me, dt), sp = G.VB.speed(me), serving = M.serverId === me.id;
      if (M.phase === 'serveSetup' && serving) { me.vx = 0; me.vy = approach(me.vy, inp.mv[1] * 60, 600 * dt); me.y = clamp(me.y + me.vy * dt, G.C.Y0 + 4, G.C.Y1 - 4); if (M.phaseT > .4 && (inp.play || inp.shot) && !M.tossAsked) { M.tossAsked = true; this.send({ t: 'v', toss: inp.shot ? 'jump' : 'float' }); } }
      else if (M.phase === 'toss' && serving) { if ((inp.play || inp.shot) && !M.serveSent && M.L && M.L.kind === 'toss') { M.serveSent = true; const apex = G.Ball.apexT(M.L), q = G.VB.judge(M.now - apex); this.send({ t: 'v', at: Math.round(M.now * 1000), q: q === 'MISS' ? 'OK' : q, aim: inp.aim.map(v => +v.toFixed(2)) }); M.popup(me, q === 'PERFECT' ? 'PERFECT!' : q, G.VB.QCOL[q]); } }
      else {
        let mv = inp.mv; const plan = M.plan, mine = plan && plan.pid === me.id && !plan.done;
        if (Math.hypot(mv[0], mv[1]) < .1 && mine) { const dx = plan.P[0] - me.x, dy = plan.P[1] - me.y, d = Math.hypot(dx, dy); if (d > 3) mv = [dx / d * .85, dy / d * .85]; }
        G.VB.steer(me, mv[0] * sp, mv[1] * sp, dt); G.VB.integrate(M, me, dt);
        if (mine && (inp.play || inp.shot)) { const err = M.now - plan.tStar, q = err < -.6 ? null : G.VB.judge(err); if (q) { plan.done = true; this.send({ t: 'c', at: Math.round(Math.max(M.now, plan.tStar) * 1000), k: plan.kind, q: q === 'MISS' ? 'MISS' : q, aim: inp.aim.map(v => +v.toFixed(2)), sh: inp.shot ? 1 : 0 }); M.popup(me, q === 'PERFECT' ? 'PERFECT!' : q, G.VB.QCOL[q]); if (plan.kind === 'attack') { G.VB.jumpAt(M, me, M.now, .2); M.act(me, 'spike', { contactT: M.now }); } else M.act(me, plan.kind === 'set' ? 'set' : 'bump'); } }
        if (!mine && inp.shot && plan && plan.side !== me.side && Math.abs(me.x - G.C.NET_X) < 20 && !me.block) { me.block = { t0: M.now }; M.act(me, 'block'); this.send({ t: 'c', at: Math.round(M.now * 1000), k: 'block' }); }
        if (inp.dive && !me.dive) { const l = Math.hypot(inp.mv[0], inp.mv[1]) || 1; me.dive = { t0: M.now, vx: inp.mv[0] / l * 190, vy: inp.mv[1] / l * 190 }; M.act(me, 'dive'); }
        if (me.dive) { const u = M.now - me.dive.t0; if (u < .22) { me.vx = me.dive.vx; me.vy = me.dive.vy; } if (u > .97) { me.dive = null; M.act(me, 'ready'); } }
        if (M.now - me.actT0 > .6 && me.act !== 'ready' && !me.dive && !me.block && !me.jump) M.act(me, 'ready');
      }
      if (M.ball && Math.hypot(me.vx, me.vy) < 10) me.facing = E.approachAng(me.facing, Math.atan2(M.ball.y - me.y, M.ball.x - me.x), dt * 9);
      this.macc = (this.macc || 0) + dt; if (this.macc >= 1 / 12) { this.macc = 0; this.send({ t: 'm', at: Math.round(M.now * 1000), x: Math.round(me.x), y: Math.round(me.y), f: +me.facing.toFixed(2), a: me.act }, false); }
    }
    // the ball, on the shared clock
    if (M.L && !M.L.frozen) { const q = G.Ball.at(M.L, M.now); M.ball.x = q[0]; M.ball.y = q[1]; M.ball.z = Math.max(G.C.BALL_R, q[2]); M.ball.spin += .2; if (M.now > M.L.tLand + .4) M.L.frozen = true; }
    else if (M.serverId >= 0 && M.phase === 'serveSetup') { const sv = M.players.find(p => p.id === M.serverId); if (sv) { const h = sv.rig.hand('L'); M.ball.x = h[0]; M.ball.y = h[1]; M.ball.z = h[2] + 2; } }
    for (const p of M.players) G.Anim.player(M, p, dt);
  },
  clientMsg(M, d) {
    if (d.t === 's') { this.snaps.push(d); if (this.snaps.length > 30) this.snaps.shift(); M.rules.score = d.sc.slice(); if (d.ph && d.ph !== M.phase) { M.phase = d.ph; M.phaseT = 0; if (d.ph === 'serveSetup') { M.tossAsked = false; M.serveSent = false; M.L = null; } } M.serverId = d.sv; M.rules.serveSide = d.sv >= 0 ? (M.players.find(p => p.id === d.sv) || {}).side : M.rules.serveSide; if (d.over) M.over = true; }
    else if (d.t === 'b') { M.L = G.Ball.make(d.t0, d.p, d.v, { k: d.k, g: d.g, ay: d.ay, wob: d.wob, by: d.by, kind: d.kind }); M.L.serve = !!d.sv; M.plan = d.pl ? { pid: d.pl[0], p: M.players.find(p => p.id === d.pl[0]), kind: d.pl[1], tStar: d.pl[2], P: [d.pl[3], d.pl[4]], side: (M.players.find(p => p.id === d.pl[0]) || {}).side, done: false } : null; if (d.kind !== 'toss') G.sfx(d.kind === 'spike' ? 'spike' : d.kind === 'set' ? 'set' : 'bump'); else G.sfx('serveToss'); }
    else if (d.t === 'e') { if (d.ev === 'pt') { M.rules.score = d.sc.slice(); M.bannerSay(d.kind === 'ace' ? 'ace' : d.kind === 'kill' ? 'kill' : d.kind === 'block' ? 'block' : d.why); G.sfx('whistle'); M.plan = null; if (M.L) M.L.frozen = true; M.talk.say(G.pickLine('sonny', d.kind === 'ace' ? 'ace' : d.kind === 'kill' ? 'kill' : d.why === 'out' ? 'out' : 'in', { name: '' }), 'sonny'); } else if (d.ev === 'ph' && d.ph !== M.phase) { M.phase = d.ph; M.phaseT = 0; M.serverId = d.sv; if (d.ph === 'serveSetup') { M.tossAsked = false; M.serveSent = false; M.L = null; M.plan = null; } } }
  }
};
/* the Match's host-side step for a remote player: follow her reports, no faster than she can run, on her side */
G.Match.prototype.netPlayerStep = function (p, dt) {
  const t = p.netTarget; if (!t) return;
  if (this.phase === 'serveSetup' && this.server === p) { p.y = clamp(t[1], G.C.Y0 + 4, G.C.Y1 - 4); return; }
  const dx = t[0] - p.x, dy = t[1] - p.y, d = Math.hypot(dx, dy), max = G.VB.speed(p) * 1.4 * dt;
  if (d > max) { p.x += dx / d * max; p.y += dy / d * max; } else { p.x = t[0]; p.y = t[1]; }
  p.vx = dx / Math.max(dt, 1e-3) * .1; p.vy = dy / Math.max(dt, 1e-3) * .1;
  if (p.netAct === 'dive' && p.act !== 'dive') this.act(p, 'dive');
};
G.Match.prototype.clientUpdate = function (dt) { G.Net.clientUpdate(this, dt); };

/* ---- the hub scene: connect, the card, the match, the end ---- */
G.scenes.hub = {
  view: 'court', input: G.PRESETS.HUB, camera: false,
  enter() {
    const H = window.AIHub, N = G.Net; this.state = 'connecting'; this.t = 0; G.applyLight('sunset'); G.useInput('HUB');
    if (!H || !H.active) { G.game.go('title'); return; }
    H.on('card', c => { N.card = c; });
    H.on('start', () => { N.started = true; this.beginMatch(); });
    H.on('message', (d, from) => { if (d && typeof d === 'object') N.inbox.push({ d, from }); });
    H.on('leave', ({ id }) => { N.leftIds.add(id); if (G.M) for (const p of G.M.players) if (p.ctl.kind === 'net' && p.ctl.pid === id) { p.ctl = { kind: 'ai' }; p.tag = 'CPU'; } });
    H.on('time-up', () => { if (G.M && H.isHost) N.finish(G.M); });
    H.on('end', e => { N.ended = e || { reason: 'finished' }; G.endedQuiet = true; G.game.audio.music(null); G.game.audio.mute(true); this.state = 'end'; });
    H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.hub = false; G.game.go('title'); return; }
      N.info = info; this.lineup = N.lineup(info); this.rigs = this.lineup.seats.map(s => G.makeRig(s.cast));
      this.state = 'card'; G.music('sunrise');
      H.ready();
    });
  },
  beginMatch() {
    if (this.state === 'match' || !G.Net.info) return;
    const cfg = G.Net.matchCfg(G.Net.info, this.lineup);
    const M = G.M = new G.Match(cfg); M.mapRef = G.courtMap; M.hubClock = () => window.AIHub.time() / 1000;
    if (cfg.role === 'client') { M.phase = 'intro'; M.serverId = -1; }
    this.state = 'match'; G.inMatchScene = true; G.useInput('MATCH'); G.applyLight(M.tod); G.music('spike', { restart: true }); G.ambience('court'); G.game.cam.snap = true;
  },
  update(dt) {
    this.t += dt; const I = G.game.input, H = window.AIHub, N = G.Net;
    if (this.state === 'card') {
      for (const r of this.rigs) G.Anim.idle(r, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2, pose: 'hips' });
      const c = I.clicked(), R = this.btn || {};
      const hit = k => c && R[k] && c[0] >= R[k].x && c[0] < R[k].x + R[k].w && c[1] >= R[k].y && c[1] < R[k].y + R[k].h;
      if (!N.info.server && (I.pressed('ready') || hit('ready'))) { H.answer('ready'); G.sfx('ui_select'); }
      if (!N.info.server && (I.pressed('more') || hit('more'))) { H.answer('more'); G.sfx('ui_tick'); }
      return;
    }
    if (this.state === 'match' && G.M) {
      const M = G.M;
      if (M.role === 'host' && M.phase === 'intro' && M.now >= 0) { M.setPhase('coin'); M.bannerSay('SERVE'); }
      if (!N.ended) M.update(dt);
      M.camera(G.game);
      G.tickAmbience(dt);
    }
  },
  draw(r) {
    const N = G.Net;
    if (this.state === 'match' && G.M) {
      if (N.info && N.info.server) { r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#0a2d3d'); E.font.text(g, 'Hosting the match', r.W / 2, r.H / 2 - 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.M.rules.score.join(' - '), r.W / 2, r.H / 2 + 6, '#fff8e8', { align: 'center', scale: 2, outline: false }); }); return; }
      G.M.draw(r);
      r.overlay(g => {
        const tm = window.AIHub.time();
        if (tm < 0 && tm > -4000) E.font.title(g, String(Math.ceil(-tm / 1000)), r.W / 2, Math.round(r.H * .35), { scale: 4, align: 'center' });
        if (this.state === 'end' || N.ended) this.drawEnd(g, r);
      });
      return;
    }
    G.titleWorld.draw(r);
    r.overlay(g => { if (this.state === 'card') this.drawCard(g, r); else if (this.state === 'end') this.drawEnd(g, r); else E.font.text(g, 'Connecting to the AI Hub...', r.W / 2, r.H / 2, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); });
  },
  drawCard(g, r) {
    const N = G.Net, info = N.info, c = N.card || {}, W = r.W, H = r.H;
    px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#203040'));
    G.drawLogo(g, r, Math.round(H * .04), { scale: 3 });
    E.font.text(g, 'Win the beach volleyball match: first to 7, by 2', W / 2, Math.round(H * .27), '#ffd36a', { align: 'center', shadow: '#000', outline: false });
    this.lineup.seats.forEach((s, i) => {
      const x = Math.round(W * (.17 + i * .22)), y = Math.round(H * .6), pl = s.player;
      px.ell(g, x, y + 2, 18, 5, '#0a2d3d'); px.ell(g, x, y, 16, 4, pl ? (pl.color || SEAT_COLORS[i]) : '#5a6a7a');
      this.rigs[i].draw(g, x, y, E.VIEWS.court);
      const name = pl ? pl.name : 'CPU', col = pl ? (pl.color || SEAT_COLORS[i]) : '#9aa4b8', ready = pl && (c.ready || []).includes(pl.id);
      E.font.text(g, G.fit(name, 80), x, y + 8, col, { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, G.castName(s.cast) + (s.side ? ' · RIGHT' : ' · LEFT'), x, y + 18, '#c8d0e8', { align: 'center', outline: false });
      if (ready) G.icon(g, 'check', x - 3, y + 28); else if (!pl) G.icon(g, 'cpu', x - 3, y + 28);
    });
    const I = G.game.input, me = info.server ? null : info.me;
    if (me !== null) {
      let x = Math.round(W * .08); const y = Math.round(H * .82);
      for (const [a, t] of [['move', 'Move'], ['play', 'Hit on time'], ['shot', 'Shot / block'], ['dive', 'Dive'], ['call', 'Call']]) x += G.prompt(g, x, y, a, t, { input: I });
    }
    const left = c.left === null || c.left === undefined ? null : Math.ceil(c.left / 1000);
    E.font.text(g, c.paused ? 'Paused: more time' : c.starting ? 'Starting...' : left !== null ? 'Starts in ' + left + ' s' : '', W / 2, Math.round(H * .32), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    if (me !== null) {
      const bw = 86, y = Math.round(H * .9) - 12; this.btn = { ready: { x: Math.round(W / 2 - bw - 6), y, w: bw, h: 16 }, more: { x: Math.round(W / 2 + 6), y, w: bw, h: 16 } };
      G.ui.button(g, Object.assign({ label: (c.ready || []).includes(me) ? 'READY ✓' : 'READY', primary: true }, this.btn.ready), true);
      G.ui.button(g, Object.assign({ label: c.asked ? 'MORE TIME ✓' : 'MORE TIME' }, this.btn.more), false);
      G.glyph(g, this.btn.ready.x - 12, y + 3, 'ready', I); G.glyph(g, this.btn.more.x + bw + 3, y + 3, 'more', I);
    }
  },
  drawEnd(g, r) {
    const N = G.Net, e = N.ended || {}, W = r.W, H = r.H, info = N.info || { players: [] };
    px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, W, H, '#102030'));
    if (e.reason === 'host-left') { E.font.title(g, 'ROUND CANCELLED', W / 2, Math.round(H * .4), { scale: 2, align: 'center' }); E.font.text(g, 'The host left the round.', W / 2, Math.round(H * .4) + 24, '#fff8e8', { align: 'center', outline: false }); return; }
    E.font.title(g, 'FINAL', W / 2, Math.round(H * .2), { scale: 3, align: 'center' });
    if (G.M) E.font.text(g, G.M.teamNames[0] + '  ' + G.M.rules.score.join(' - ') + '  ' + G.M.teamNames[1], W / 2, Math.round(H * .2) + 30, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    (e.standings || []).forEach((grp, i) => grp.forEach((id, k) => { const pl = info.players.find(p => p.id === id); E.font.text(g, (i + 1) + '. ' + (pl ? pl.name : 'Player ' + id), W / 2, Math.round(H * .42) + i * 14 + k * 10, pl ? pl.color || '#fff8e8' : '#fff8e8', { align: 'center', outline: false }); }));
  }
};


/* ---- 26-matchscene.js ---- */
/* 26-matchscene: the 'match' scene that hosts a G.Match, and the results screen: the winners pose, three big stat cards
 * (points, kills, longest rally), the MVP with a portrait, prize money counting up and the partner's hearts (vacation),
 * then the owner's buttons (Continue; or Rematch / Change setup / Title). */
G.startMatch = (cfg) => { G.game.go('match', { cfg }, { fade: 'swirl', seconds: .35 }); };
G.resultsUI = (M, res, o = {}) => {
  const nav = new G.Nav(), ui = { t: 0, money: G.counter(0), aff: o.affBefore, affTo: o.affAfter };
  if (o.prize) ui.money.v = o.prize;
  ui.items = () => {
    const W = G.game.W, H = G.game.H, n = o.buttons.length, bw = 110, gap = 8, x0 = Math.round((W - (n * bw + (n - 1) * gap)) / 2), y = Math.round(H * .95) - 26;
    return o.buttons.map((b, i) => ({ id: 'b' + i, x: x0 + i * (bw + gap), y, w: bw, h: 18, label: b[0], onPress: b[1], primary: i === 0 }));
  };
  ui.update = dt => { ui.t += dt; ui.money.step(dt, 3); if (ui.t > .8) { if (ui.money.shown < ui.money.v && Math.floor(ui.t * 20) % 2 === 0) G.sfx('count'); nav.update(ui.items(), G.game.input); } };
  ui.draw = (g, r) => {
    const W = r.W, H = r.H, k = clamp(ui.t / .4, 0, 1), won = res.humanWon;
    px.blend(g, .45 * k, 'multiply', () => px.rect(g, 0, 0, W, H, '#102030'));
    const title = won === null ? (M.teamNames[res.winner] + ' win').toUpperCase() : won ? 'VICTORY!' : 'DEFEAT';
    E.font.title(g, title, W / 2, Math.round(H * .08), { scale: 3, align: 'center', colors: won === false ? ['#e8eef8', '#9fb0c8', '#6a7a98'] : ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3 });
    E.font.text(g, M.teamNames[0] + '  ' + res.score[0] + ' - ' + res.score[1] + '  ' + M.teamNames[1] + (M.rules.sets > 1 ? '   (sets ' + res.setsWon.join('-') + ')' : ''), W / 2, Math.round(H * .08) + 28, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    // three stat cards
    const mine = M.humanSide === null ? res.winner : M.humanSide, team = res.players.filter(p => p.side === mine);
    const cards = [['POINTS', team.reduce((s, p) => s + p.stats.points, 0)], ['KILLS', team.reduce((s, p) => s + p.stats.kills, 0)], ['LONGEST RALLY', res.longest + ' touches']];
    const cw = 92, cx0 = Math.round(W / 2 - (cw * 3 + 16) / 2), cy = Math.round(H * .27);
    cards.forEach(([l, v], i) => { const x = cx0 + i * (cw + 8), kk = clamp((ui.t - .2 - i * .12) / .3, 0, 1); G.ui.panel(g, x, cy + (1 - kk) * 20, cw, 38, { alpha: .92 * kk }); E.font.text(g, l, x + cw / 2, cy + 5 + (1 - kk) * 20, '#9fd3d6', { align: 'center', outline: false }); E.font.text(g, String(v), x + cw / 2, cy + 17 + (1 - kk) * 20, '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }); });
    // the MVP
    const mvp = M.players.find(p => p.id === res.mvp.id), my = cy + 46;
    if (mvp) { G.ui.panel(g, Math.round(W / 2 - 90), my, 180, 34); G.portrait(g, mvp.rig, Math.round(W / 2 - 86), my + 3, 28, { frame: false }); E.font.text(g, 'MVP', Math.round(W / 2 - 52), my + 4, '#ffd36a', { outline: false }); E.font.text(g, mvp.name + ' · ' + mvp.stats.points + ' pts · ' + mvp.stats.perfects + ' perfect', Math.round(W / 2 - 52), my + 16, '#fff8e8', { outline: false }); }
    // vacation: prize money and the partner's hearts
    let yy = my + 42;
    if (o.prize !== undefined) { G.ui.panel(g, Math.round(W / 2 - 90), yy, 180, 20); G.ui.money(g, Math.round(W / 2 - 80), yy + 6, ui.money.shown); E.font.text(g, 'prize money', Math.round(W / 2 + 80), yy + 7, '#9fd3d6', { align: 'right', outline: false }); yy += 24; }
    if (o.partner && o.affBefore !== undefined) {
      const a = lerp(o.affBefore, o.affAfter, clamp((ui.t - 1) / .8, 0, 1));
      G.ui.panel(g, Math.round(W / 2 - 90), yy, 180, 24); G.portrait(g, G.portraitRig(o.partner), Math.round(W / 2 - 86), yy + 3, 18, { frame: false });
      G.ui.hearts(g, Math.round(W / 2 - 60), yy + 9, a); const d = o.affAfter - o.affBefore; E.font.text(g, (d >= 0 ? '+' : '') + d, Math.round(W / 2 + 80), yy + 8, d >= 0 ? '#9ff3a8' : '#ff9a8a', { align: 'right', outline: false });
    }
    if (ui.t > .8) nav.draw(g, ui.items());
    G.promptBar(g, r, [['confirm', 'Select'], ['move', 'Choose']], { y: Math.round(H * .95) - 4 + 0, bg: false, x: 8 });
  };
  return ui;
};
G.scenes = G.scenes || {};
G.scenes.match = {
  pausable: true, view: 'court', input: G.PRESETS.MATCH, camera: { zoom: [.85, 1.25] }, res: 'ps1',
  enter(d) {
    const cfg = (d && d.cfg) || G.quickMatchCfg();
    if (cfg.mode === 'attract') G.state = null;   // (an attract match plays on no save)
    G.M = new G.Match(cfg); G.M.mapRef = G.courtMap || (G.courtMap = G.makeCourtMap());
    G.useInput('MATCH'); G.applyLight(G.M.tod); G.game.weather = G.M.weather === 'rain' ? { kind: 'rain', amount: .5, wind: .2 } : null;
    G.music(cfg.music || (cfg.final ? 'house' : 'spike'), { restart: true }); G.ambience('court');
    G.game.cam.bounds = null; G.game.follow(null); G.M.camera(G.game); G.game.cam.snap = true; G.themeName = 'day';
    G.inMatchScene = true;
    if (G.devFlags) { G.M.perfectPlayer = !!G.devFlags.perfect; G.M.cpuControl = !!G.devFlags.cpu; G.M.debugOverlay = !!G.devFlags.overlay; G.M.slowmo = G.devFlags.slow || 1; }
  },
  exit() { G.inMatchScene = false; G.game.cam.frame(null); G.game.setZoom(1); G.game.weather = null; if (G.game.audio.tempo && G.SONGS[G.musicNow]) G.game.audio.tempo(G.SONGS[G.musicNow].bpm); },
  update(dt) {
    const M = G.M; if (!M) return;
    if (M.phase === 'results' && G.inputPreset !== 'MENU') G.useInput('MENU');
    M.update(dt); M.camera(G.game);
    // the rally drum layer comes in on long rallies
    if (G.musicNow === 'spike') G.game.audio.layer && G.game.audio.layer('rally', M.rallyTouches >= 5 && M.phase === 'rally' ? 1 : 0, .6);
    if (M.phase === 'results' && G.game.input.pressed('snap') && !G.hub && !G.attract) G.photo && G.photo.open('match');
    G.tickAmbience(dt);
  },
  draw(r) { if (G.M) G.M.draw(r); }
};
/** a quick exhibition config: one human with a CPU partner against two CPUs */
G.quickMatchCfg = (o = {}) => {
  const pick = o.cast || ['tess', 'lola', 'rin', 'mei'];
  return Object.assign({ mode: 'exhibition', pointsToWin: 7, tod: 'afternoon', seed: o.seed || 7,
    teams: [[{ cast: pick[0], ctl: { kind: 'human', input: G.game.input } }, { cast: pick[1], skill: .55 }], [{ cast: pick[2], skill: .5 }, { cast: pick[3], skill: .5 }]],
    onResults: (M, res) => G.resultsUI(M, res, { buttons: [['Rematch', () => G.startMatch(Object.assign({}, M.cfg, { seed: M.seed + 1 }))], ['Title', () => G.game.go('title')]] }) }, o.cfg || {});
};


/* ---- 30-vacation.js ---- */
/* 30-vacation: the vacation's state and rules. Five days of Morning, Afternoon and Night; weather by day; moods, NPC
 * teams and where everyone is each slot (seeded from the save's 'world' stream); affinity 0-100 with each fighter in
 * five stages; gifts, team-ups and break-ups; Sonny Dollars; the day's end; saves (3 slots and an autosave) and New
 * Vacation+. All of it is data and plain functions, so tests drive it without a screen. */
G.DAYS = 5;
G.STAGES = [['Stranger', 0], ['Acquaintance', 20], ['Friend', 40], ['Good Friend', 60], ['Best Friend', 80]];
G.stage = a => { let s = G.STAGES[0][0]; for (const [n, v] of G.STAGES) if (a >= v) s = n; return s; };
G.stageIndex = a => G.STAGES.filter(([, v]) => a >= v).length - 1;
G.WEATHER_TABLE = d => d === 1 ? 'sunny' : d === 2 ? (G.chance('world', .5) ? 'sunny' : 'cloudy') : d === 3 ? 'rain' : d === 4 ? 'sunny' : 'golden';
G.weatherNow = (st = G.state) => { if (!st) return 'sunny'; const w = st.weather[st.day - 1]; return st.day === 3 ? (st.slot === 0 ? 'cloudy' : st.slot === 1 ? 'rain' : 'clear') : w; };
G.npcs = (st = G.state) => G.FIGHTERS.filter(f => f !== st.me);
G.PLACES = ['beach', 'pool', 'promenade', 'away'];

/* ---- a new vacation ---- */
G.newState = (me, seed = 1, plus = null) => {
  G.seed('world', seed);
  const st = { v: 1, seed, day: 1, slot: 0, weather: [], me, money: G.T.startMoney, chips: 0,
    wardrobe: { suits: [G.CAST[me].suit], acc: G.CAST[me].acc.slice() }, wearing: { suit: G.CAST[me].suit, acc: G.CAST[me].acc.slice() },
    npcWear: {}, npcGot: {}, bag: {}, affinity: {}, mood: {}, known: {}, partner: null, teams: [], solo: null, record: {}, lastPairs: [],
    flags: {}, story: {}, chatted: {}, gifted: {}, album: [], titlePostcard: null, where: {}, deals: {}, mail: [], read: {},
    todayLost: false, todayMatches: 0, beatYesterday: {}, dayLog: { earned: 0, spent: 0, matches: 0, affBefore: {} }, nplus: plus ? plus.n : 0,
    stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0, photos: 0, earned: 0, spent: 0, perfects: 0 } };
  for (let d = 1; d <= G.DAYS; d++) st.weather.push(G.WEATHER_TABLE(d));
  for (const id of G.npcs(st)) { st.affinity[id] = clamp(G.baseAff(me, id) + (plus ? 10 : 0), 0, 100); st.npcWear[id] = { suit: G.CAST[id].suit, acc: G.CAST[id].acc.slice() }; st.known[id] = {}; }
  if (plus) { st.wardrobe = plus.wardrobe; st.album = plus.album || []; st.money = G.T.startMoney + Math.round(plus.money * .1); st.stats = plus.stats; st.flags.plus = true; }
  return st;
};
G.wearOf = id => { const st = G.state; if (!st) return null; if (id === st.me) return { suit: st.wearing.suit, acc: st.wearing.acc }; return st.npcWear[id] || null; };
G.aff = id => (G.state && G.state.affinity[id] !== undefined ? G.state.affinity[id] : 0);
/** change affinity with id (gains times affinityGainMul); returns the change actually made */
G.addAff = (id, d, why) => {
  const st = G.state; if (!st || st.affinity[id] === undefined) return 0;
  const k = d > 0 ? d * G.T.affinityGainMul : d, before = st.affinity[id], after = clamp(Math.round(before + k), 0, 100);
  st.affinity[id] = after;
  if (G.stageIndex(after) > G.stageIndex(before)) { G.sting('levelup'); G.toast(G.CAST[id].name + ': ' + G.stage(after), 'Your friendship grew', 'heart'); }
  G.bus.emit('affinity', { id, before, after, why });
  return after - before;
};
G.earn = (n, why) => { const st = G.state; n = Math.round(n); st.money += n; st.stats.earned += n; st.dayLog.earned += n; G.bus.emit('purchase', { kind: 'earn', n, why }); };
G.spend = n => { const st = G.state; if (st.money < n) return false; st.money -= n; st.stats.spent += n; st.dayLog.spent += n; return true; };

/* ---- the day: moods, teams, deals, weather; then each slot: where everyone is ---- */
G.dayStart = () => {
  const st = G.state; G.seed('world', st.seed * 31 + st.day * 7);
  const w = G.weatherNow(st);
  st.dayLog = { earned: 0, spent: 0, matches: 0, affBefore: Object.assign({}, st.affinity), wins: 0 };
  st.todayLost = false; st.chatted = {}; st.gifted = {};
  for (const id of G.npcs(st)) {
    const r = G.rng('world')(); let m = r < .35 ? 2 : r < .8 ? 1 : 0;   // 2 happy, 1 normal, 0 gloomy
    const wt = G.CAST[id].weather || {}; if (wt.like && wt.like.includes(w)) m++; if ((wt.dislike && wt.dislike.includes(w)) || st.beatYesterday[id]) m--;
    st.mood[id] = ['gloomy', 'normal', 'happy'][clamp(m, 0, 2)];
  }
  st.beatYesterday = {};
  G.formTeams();
  // the shops' two daily deals (25% off)
  st.deals = {}; for (const sh of Object.keys(G.SHOPS)) { const stock = G.shopStock(sh, st.day).filter(e => e.item.price > 0); st.deals[sh] = G.shuffle('world', stock.map(e => e.item.id)).slice(0, 2); }
  // the day's mail
  for (const k in G.LETTERS) { const L = G.LETTERS[k]; if (L.day === st.day && L.slot === 0 && !st.read[k] && !st.mail.includes(k) && G.letterApplies(k)) st.mail.push(k); }
  G.slotStart();
};
G.letterApplies = k => { const st = G.state; if (k === 'rumor') return !st.flags.overheard && st.flags.missedD3Casino; if (k === 'warning') return true; return true; };
G.formTeams = () => {
  const st = G.state, free = G.npcs(st).filter(id => id !== st.partner);
  let best = null, bs = -1e9;
  const pairsOf = list => { if (list.length < 2) return [[]]; const [a, ...rest] = list, out = []; for (let i = 0; i < rest.length; i++) { const b = rest[i], others = rest.filter((_, j) => j !== i); for (const sub of pairsOf(others)) out.push([[a, b], ...sub]); } if (list.length % 2) for (const sub of pairsOf(rest)) out.push(sub); return out; };
  for (const P of pairsOf(free)) {
    const need = Math.floor(free.length / 2); if (P.length !== need) continue;
    let sc = 0; for (const [a, b] of P) { sc += G.baseAff(a, b) + G.rand('world', -10, 10); if (st.lastPairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) sc -= 12; }
    if (sc > bs) { bs = sc; best = P; }
  }
  st.teams = best || []; st.lastPairs = st.teams.slice();
  const used = new Set(st.teams.flat()); st.solo = free.find(id => !used.has(id)) || null;
  for (const [a, b] of st.teams) { const k = G.teamKey(a, b); if (!st.record[k]) st.record[k] = [0, 0]; }
};
G.teamKey = (a, b) => [a, b].sort().join('+');
G.teamOf = id => { const st = G.state; return st.teams.find(t => t.includes(id)) || null; };
G.slotStart = () => {
  const st = G.state, night = st.slot === 2, w = G.weatherNow(st);
  st.where = {};
  const groups = st.teams.map(t => t.slice()).concat(st.solo ? [[st.solo]] : []);
  for (const grp of groups) {
    const W = G.CAST[grp[0]].sched[st.slot];
    let entries = night ? [['casino', W[0]], ['away', W[1]]] : G.PLACES.map((p, i) => [p, W[i] * (w === 'rain' ? [.2, .5, 1.5, 1.5][i] : 1)]);
    const place = G.weighted('world', entries);
    for (const id of grp) st.where[id] = place;
  }
  if (!night && st.teams.length && !st.teams.some(t => st.where[t[0]] === 'beach')) { const t = G.pick('world', st.teams); for (const id of t) st.where[id] = 'beach'; }
  if (st.partner) st.where[st.partner] = 'withyou';
  G.storyOverrides && G.storyOverrides();
  if (!G.hub && G.game && G.game.saves) G.autosave();
};
G.placeName = { beach: 'Sunset Courts', pool: 'Lagoon Pool', promenade: 'Fortuna Promenade', villa: 'Your Villa', casino: 'Casino Fortuna', dock: 'The Dock', away: 'Away', withyou: 'With you' };
G.presentAt = loc => { const st = G.state; return G.npcs(st).filter(id => st.where[id] === loc || (st.where[id] === 'withyou' && loc !== 'villa')); };
G.openAt = (loc, slot = G.state.slot) => loc === 'villa' ? true : loc === 'casino' ? slot === 2 : loc === 'dock' ? false : slot < 2;
/** the slot ends: the next one, or the day's end after the night */
G.endSlot = () => {
  const st = G.state; G.bus.emit('slotEnd', { day: st.day, slot: st.slot });
  if (st.slot < 2) { st.slot++; G.slotStart(); return 'next'; }
  return 'dayEnd';
};
/** the night is over: the summary's numbers, a partner who leaves, drift, the NPC teams' off-screen results */
G.dayEnd = () => {
  const st = G.state, sum = { day: st.day, earned: st.dayLog.earned, spent: st.dayLog.spent, matches: st.dayLog.matches, changes: {}, left: null, results: [], tomorrow: st.weather[st.day] || null };
  if (st.partner && st.todayLost && st.affinity[st.partner] < 35) { sum.left = st.partner; G.addAff(st.partner, -2, 'leave'); st.partner = null; }
  for (const id of G.npcs(st)) if (!st.chatted[id] && !st.gifted[id]) { const base = clamp(G.baseAff(st.me, id), 0, 100), a = st.affinity[id], d = G.T.affinityDecay; if (a > base) st.affinity[id] = Math.max(base, a - d); else if (a < base) st.affinity[id] = Math.min(base, a + d); }
  for (const id of G.npcs(st)) sum.changes[id] = st.affinity[id] - (st.dayLog.affBefore[id] || st.affinity[id]);
  // off-screen: the NPC pairs play each other for the Match Board's records
  if (st.teams.length >= 2) { const [a, b] = st.teams, sk = t => t.reduce((s, id) => s + G.CAST[id].stats.TEC + G.CAST[id].stats.POW, 0), pa = sk(a) / (sk(a) + sk(b)), aw = G.chance('world', pa); const ka = G.teamKey(...a), kb = G.teamKey(...b); st.record[ka] = st.record[ka] || [0, 0]; st.record[kb] = st.record[kb] || [0, 0]; st.record[ka][aw ? 0 : 1]++; st.record[kb][aw ? 1 : 0]++; sum.results.push([a, b, aw]); }
  G.bus.emit('dayEnd', sum);
  st.day++; st.slot = 0;
  return sum;
};

/* ---- talking, gifts, team-ups ---- */
G.chat = id => {
  const st = G.state, first = !st.chatted[id], done = st.chatted[id] === st.slot + 1;
  let d = 0; if (first) d = G.addAff(id, 2, 'chat'); else if (!done) d = G.addAff(id, 1, 'chat');
  st.chatted[id] = st.slot + 1;
  const a = st.affinity[id], key = a >= 80 ? 'chatHigh' : a >= 40 ? 'chatMid' : 'chatLow';
  return { line: G.pickLine(id, key), d };
};
G.greetLine = id => { const a = G.aff(id); return G.LINES[id].greet[a >= 60 ? 2 : a >= 20 ? 1 : 0]; };
/** offer a gift: { taste, accepted, d, line } (a refused gift goes back to the bag) */
G.giveGift = (id, itemId) => {
  const st = G.state, it = G.itemById(itemId); if (!it) return null;
  if (st.gifted[id] === st.slot + 1) return { already: true, line: "You already gave me something. Save it for later!" };
  const suit = it.kind === 'suit', acc = it.kind === 'acc';
  const taste = suit || acc ? (it.tastes.some(t => G.CAST[id].tastes.includes(t)) ? 'like' : 'dislike') : G.giftTaste(id, itemId);
  const tv = { love: 3, like: 2, neutral: 0, dislike: -3 }[taste], a = st.affinity[id], stage = a >= 80 ? 2 : a >= 40 ? 1 : 0, mood = { happy: 1, normal: 0, gloomy: -1 }[st.mood[id] || 'normal'];
  const accepted = suit ? taste === 'like' : tv + stage + mood >= G.T.giftThreshold;
  st.known[id][itemId] = taste;
  // take it out of the bag (or the wardrobe)
  if (suit) { if (accepted) { st.wardrobe.suits = st.wardrobe.suits.filter(s => s !== itemId); if (st.wearing.suit === itemId) st.wearing.suit = G.CAST[st.me].suit; st.npcWear[id].suit = itemId; st.npcGot = st.npcGot || {}; (st.npcGot[id] = st.npcGot[id] || []).push(itemId); if (G.portraitRigs) G.portraitRigs[id] = null; } }
  else if (acc) { if (accepted) { st.wardrobe.acc = st.wardrobe.acc.filter(s => s !== itemId); st.wearing.acc = st.wearing.acc.filter(s => s !== itemId); const anchor = G.ACCS[itemId].anchor; st.npcWear[id].acc = st.npcWear[id].acc.filter(x => G.ACCS[x] && G.ACCS[x].anchor !== anchor).concat(itemId); } }
  else if (accepted) { st.bag[itemId]--; if (st.bag[itemId] <= 0) delete st.bag[itemId]; }
  let d = 0;
  if (accepted) d = G.addAff(id, taste === 'love' ? 12 : taste === 'like' ? 6 : 2, 'gift'); else d = G.addAff(id, taste === 'dislike' ? -6 : -1, 'gift');
  st.gifted[id] = st.slot + 1; if (accepted) st.stats.gifts++;
  const line = suit ? G.pickLine(id, accepted ? 'suitYes' : 'suitNo') : acc ? G.pickLine(id, accepted ? 'like' : 'refuse') : G.pickLine(id, !accepted ? 'refuse' : taste);
  G.bus.emit('gift', { id, itemId, taste, accepted, d });
  return { taste: accepted ? taste : 'refuse', accepted, d, line };
};
/** ask her to team up: { ok, line, from (her old partner) } */
G.invite = id => {
  const st = G.state, mood = st.mood[id] || 'normal', team = G.teamOf(id);
  let need = G.T.inviteThreshold + (mood === 'happy' ? -10 : mood === 'gloomy' ? 10 : 0) + (team ? 20 : 0);
  if (st.affinity[id] < need) return { ok: false, line: G.pickLine(id, 'inviteNo') };
  let from = null;
  if (team) { from = team.find(x => x !== id); st.teams = st.teams.filter(t => t !== team); st.solo = from; G.addAff(from, -4, 'leftTeam'); }
  const old = st.partner; st.partner = id; if (old) { st.where[old] = st.where[id] === 'withyou' ? 'beach' : st.where[id] || 'beach'; if (!st.solo) st.solo = old; else { st.teams.push([st.solo, old]); st.solo = null; } }
  st.where[id] = 'withyou'; st.flags.hadPartner = true;
  return { ok: true, line: G.pickLine(id, team ? 'leaveTeam' : 'inviteYes'), from };
};
/** a partner assigned without asking (Pepper's starter partner): she leaves her NPC team, which goes solo */
G.setPartner = id => {
  const st = G.state, team = G.teamOf(id);
  if (team) { const from = team.find(x => x !== id); st.teams = st.teams.filter(t => t !== team); if (st.solo && st.solo !== id) { st.teams.push([st.solo, from]); st.solo = null; } else st.solo = from; }
  else if (st.solo === id) st.solo = null;
  st.partner = id; st.where[id] = 'withyou'; st.flags.hadPartner = true;
};
/** the result of a vacation match: prize money and affinity */
G.matchPayout = (res, info) => {
  const st = G.state, won = res.humanWon, margin = Math.abs(res.score[0] - res.score[1]);
  let prize = won ? (12000 + 3000 * st.day + 1000 * margin) : 3000;
  if (info.kind === 'tutorial') prize = 10000; if (info.kind === 'semi' && won) prize = 30000; if (info.kind === 'final' && won) prize = 100000;
  prize = Math.round(prize * G.T.prizeMul);
  const p = st.partner, before = p ? st.affinity[p] : 0;
  if (p) G.addAff(p, won ? 6 : (st.mood[p] === 'gloomy' ? -5 : -2), 'match');
  if (won) for (const id of info.opponents || []) { if (st.affinity[id] !== undefined) { G.addAff(id, G.CAST[id].goodSport || id === 'rin' ? 1 : -3, 'beaten'); st.beatYesterday[id] = true; } }
  if (info.kind === 'final' && won && p) G.addAff(p, 10, 'final');
  G.earn(prize, 'match');
  st.stats.matches++; if (won) st.stats.wins++; st.dayLog.matches++; if (won) st.dayLog.wins++; if (!won) st.todayLost = true;
  const me = res.players.find(x => x.side === 0 && x.cast === st.me);
  if (me) { st.stats.points += me.stats.points; st.stats.kills += me.stats.kills; st.stats.aces += me.stats.aces; st.stats.blocks += me.stats.blocks; st.stats.perfects += me.stats.perfects; }
  if (info.pair) { const k = G.teamKey(...info.pair); st.record[k] = st.record[k] || [0, 0]; st.record[k][won ? 1 : 0]++; }
  return { prize, before, after: p ? st.affinity[p] : 0, partner: p };
};

/* ---- saves: 3 slots and an autosave; Continue loads the latest ---- */
G.SAVE_VERSION = 1;
G.migrate = (data, from) => { if (!data.v) data.v = 1; void from; return data; };
G.installSaves = () => {
  const S = G.game.saves; if (!S) return;
  S.version = G.SAVE_VERSION; S.migrate = G.migrate;
  S.write = () => ({ data: JSON.parse(JSON.stringify(G.state)), place: G.placeName[G.curPlace] || 'Isla Fortuna', level: 'Day ' + G.state.day + ' · ' + G.SLOTS[G.state.slot] });
  S.read = save => { G.loadState(save.data); };
};
G.autosave = () => { try { if (G.state && G.game.saves && !G.attract) { G.installSaves(); G.game.saves.autosave(); G.saveUnlocks(); } } catch (e) { G.game.fail('autosave', e); } };
G.saveExists = () => { try { return !G.hub && !!(G.game.saves && G.game.saves.latest()); } catch (e) { return false; } };
G.loadState = data => { G.state = G.migrate(JSON.parse(JSON.stringify(data)), data.v); G.seed('world', G.state.seed * 31 + G.state.day * 7 + G.state.slot); };
/** back into a loaded vacation: the island map at the saved day and slot (saves are made at the start of a slot) */
G.resumeVacation = () => { const st = G.state; if (!st) return; G.seed('world', st.seed * 31 + st.day * 7 + st.slot); G.game.go('map', null, { fade: 'white', seconds: .4 }); };
G.continueGame = () => { G.installSaves(); const s = G.game.saves.latest(); if (!s) return; G.game.saves.load(s.slot); G.resumeVacation(); };
G.loadMenu = () => { G.installSaves(); G.game.saves.show('load', save => { if (save) G.resumeVacation(); }); };
G.saveMenu = done => { G.installSaves(); G.game.saves.show('save', () => { G.saveUnlocks(); done && done(); }); };
/* ---- unlocks for Beach Match (suits ever owned; everything after a finished vacation), the album and the title postcard ---- */
G.unlocks = { suits: [], finished: false, album: [], titlePostcard: null, poolBest: null };
G.loadUnlocks = () => { if (G.hub) return; const u = E.store.get('aoa-unlocks', null); if (u && typeof u === 'object') Object.assign(G.unlocks, u); };
G.saveUnlocks = () => {
  if (G.hub || G.attract) return; const st = G.state;
  if (st) { for (const s of st.wardrobe.suits) if (!G.unlocks.suits.includes(s)) G.unlocks.suits.push(s); G.unlocks.album = st.album.slice(); if (st.titlePostcard) G.unlocks.titlePostcard = st.titlePostcard; if (st.stats.poolBest && (!G.unlocks.poolBest || st.stats.poolBest < G.unlocks.poolBest)) G.unlocks.poolBest = st.stats.poolBest; }
  E.store.set('aoa-unlocks', G.unlocks);
};


/* ---- 31-map.js ---- */
/* 31-map: the island map, an iso view of Isla Fortuna: sea all round, beaches, grass and palms, a dormant volcano with
 * steam, the lagoon, the courts, the Promenade, the villas, the casino (neon at night), the Dock with Sonny's seaplane and
 * a lighthouse. The stick or d-pad jumps between pins, L1/R1 cycle them, the mouse hovers; Cross opens a place's card
 * (who's there, what to do, open or closed) and Cross again travels there. Square: Friends. Triangle: the Journal. */
G.buildIsland = () => {
  const I = G.ISLAND, rows = [];
  for (let cy = 0; cy < I.H; cy++) { let s = ''; for (let cx = 0; cx < I.W; cx++) s += I.cell(cx, cy); rows.push(s); }
  return new E.TileMap({ rows, legend: { w: { floor: 'sea', block: true }, s: { floor: 'sand' }, g: { floor: 'grass' }, t: { floor: 'grass', spawn: 'palm' }, p: { floor: 'lagoon', block: true }, 1: 1, 2: 2, 3: 3, c: 4 },
    types: { 1: { h: 10, face: 'rock', roof: 'grass', top: '#5f9a4a', side: '#6a5a4a' }, 2: { h: 22, face: 'rock', roof: 'grass', top: '#6a8a4a', side: '#5a4a3e' }, 3: { h: 34, face: 'rock', roof: 'plain', top: '#7a6a5a', side: '#4a3e36' }, 4: { h: 30, face: 'rock', roof: 'plain', top: '#2a2224', side: '#4a3e36' } },
    floorTex: (x, y, tag) => tag === 'sea' ? G.FLOOR_TEX.sea(x, y, clamp(1 - Math.hypot((x / 16 - 24) / 24, (y / 16 - 18) / 18) * 1.4 + .4, 0, 1)) : tag === 'lagoon' ? G.FLOOR_TEX.pool(x, y) : tag === 'sand' ? G.FLOOR_TEX.sand(x, y) : G.FLOOR_TEX.grass(x, y), outside: '#0b5a7a', ao: 4 });
};
G.scenes.map = {
  view: 'iso', input: G.PRESETS.MENU, camera: { zoom: [.7, 1.3], start: .9 }, pausable: true,
  enter(d) {
    const st = G.state; G.useInput('MENU'); G.curPlace = 'map';
    this.map = G.islandMap || (G.islandMap = G.buildIsland());
    this.palms = this.palms || this.map.findAll('palm');
    this.tod = G.todFor(st.slot, G.weatherNow(), st.day); G.applyLight(this.tod, { ambient: Math.max(.5, G.TOD[this.tod].ambient) });
    G.game.weather = G.weatherNow() === 'rain' ? { kind: 'rain', amount: .5, wind: .3 } : null;
    G.music(st.slot === 2 ? 'siesta' : 'island'); G.ambience(st.slot === 2 ? 'night' : 'map'); G.themeName = st.slot === 2 ? 'night' : 'day';
    this.pins = G.ISLAND.pins; const cur = this.pins.find(p => p.id === (d && d.at)) || this.pins.find(p => G.openAt(p.id)) || this.pins[0];
    this.sel = cur.id; this.card = null; this.nav = new G.Nav(); this.t = 0; this.hover = null; this.panel = null; this.finalAsked = false;
    G.game.follow(null); G.game.cam.bounds = v => this.map.bounds(v); G.game.focus(cur.x, cur.y, 0); G.game.cam.snap = true; G.game.cam.smooth = .25;
    if (G.storyOnMap) G.storyOnMap(this);
  },
  exit() { G.game.weather = null; },
  pin(id) { return this.pins.find(p => p.id === id); },
  update(dt) {
    this.t += dt; G.tickAmbience(dt);
    const I = G.game.input, st = G.state;
    if (G.talk && G.talk.open) { G.talk.update(dt); if (G.talk.modal) return; }
    if (G.storyBusy && G.storyBusy()) return;
    const p = this.pin(this.sel); G.game.focus(p.x, p.y, 0);
    if (this.panel) return this.updatePanel(dt);
    if (this.card) {
      const ev = this.card.nav.update(this.cardItems(), I);
      if (ev.back) { this.card = null; G.sfx('ui_back'); }
      return;
    }
    // jump between pins: the nearest one in the pushed direction (screen space)
    for (const [a, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) if (I.repeat(a, .35, .14)) this.step(dx, dy);
    if (I.pressed('tabR') || I.pressed('tabL')) { const i = this.pins.findIndex(q => q.id === this.sel), n = this.pins.length; this.sel = this.pins[(i + (I.pressed('tabR') ? 1 : n - 1)) % n].id; G.sfx('ui_tick'); }
    // the mouse: hover and click a pin
    const mp = I.pointer(); if (mp && I.lastDevice === 'mouse' && G.lastR && (!this._mp || mp[0] !== this._mp[0] || mp[1] !== this._mp[1])) { const h = this.pins.find(q => { const s = G.lastR.w(q.x, q.y, 16); return Math.hypot(s[0] - mp[0], s[1] - mp[1]) < 14; }); if (h && h.id !== this.sel) { this.sel = h.id; G.sfx('ui_tick'); } } this._mp = mp ? mp.slice() : null;
    const c = I.clicked(); if (c && G.lastR) { const h = this.pins.find(q => { const s = G.lastR.w(q.x, q.y, 16); return Math.hypot(s[0] - c[0], s[1] - c[1]) < 14; }); if (h) { this.sel = h.id; this.openCard(); return; } }
    if (I.pressed('confirm')) { I.consume('confirm'); this.openCard(); }
    else if (I.pressed('alt')) this.panel = { kind: 'friends', nav: new G.Nav() };
    else if (I.pressed('extra')) G.game.go('journal', { from: 'map' });
  },
  step(dx, dy) {
    const R = G.lastR; if (!R) return; const cur = this.pin(this.sel), a = R.w(cur.x, cur.y, 0);
    let best = null, bs = 1e9;
    for (const q of this.pins) { if (q === cur) continue; const b = R.w(q.x, q.y, 0), vx = b[0] - a[0], vy = b[1] - a[1], along = vx * dx + vy * dy; if (along <= 4) continue; const sc = along + Math.abs(vx * dy + vy * dx) * 2; if (sc < bs) { bs = sc; best = q; } }
    if (best) { this.sel = best.id; G.sfx('ui_tick'); }
  },
  openCard() { this.card = { id: this.sel, nav: new G.Nav({ focus: 'go' }) }; G.sfx('ui_select'); },
  cardItems() {
    const W = G.game.W, H = G.game.H, id = this.card.id, open = G.openAt(id), x = Math.round(W / 2 + 10), y = Math.round(H * .66);
    return [{ id: 'go', x, y, w: 90, h: 18, label: open ? 'Go there' : 'Closed', disabled: !open, onPress: () => this.travel(id) }, { id: 'back', x: x + 96, y, w: 60, h: 18, label: 'Back', onPress: () => { this.card = null; } }];
  },
  travel(id) {
    G.sfx('whoosh'); this.card = null;
    if (G.storyBeforeTravel && G.storyBeforeTravel(id)) return;
    const p = this.pin(id);
    G.game.go(id === 'casino' ? 'location' : 'location', { loc: id }, { fade: 'iris', at: { x: p.x, y: p.y, z: 0 }, seconds: .4 });
  },
  updatePanel(dt) { const I = G.game.input; if (I.pressed('cancel') || I.pressed('alt') || I.pressed('confirm') || I.clicked()) { this.panel = null; G.sfx('ui_back'); } },
  draw(r) {
    const st = G.state, night = st.slot === 2, t = G.now();
    this.map.drawFloor(r); this.map.queueWalls(r);
    for (const pl of this.palms) r.prop('palm', pl.x, pl.y, 0, { size: 1.1 });
    // places
    const P = id => this.pin(id);
    r.shape('netpost', P('beach').x - 10, P('beach').y, 0); r.shape('netpost', P('beach').x + 10, P('beach').y, 0); r.shape('umbrella', P('beach').x + 24, P('beach').y - 10, 0); r.shape('bleacher', P('beach').x, P('beach').y - 22, 0, { params: { len: 30 } });
    r.shape('cabana', P('pool').x + 26, P('pool').y - 6, 0, { scale: .7 }); r.shape('flamingo', P('pool').x - 4, P('pool').y, 1);
    for (const [k, sh] of [[-28, 'riptide'], [0, 'coral'], [28, 'sundries']]) r.shape('shopfront', P('promenade').x + k, P('promenade').y - 10, 0, { scale: .5, params: { color: G.SHOPS[sh].color } });
    for (const k of [-20, 0, 20]) r.shape('changinghut', P('villa').x + k, P('villa').y + Math.abs(k) * .3, 0, { scale: .9 });
    r.shape('cashier', P('casino').x, P('casino').y - 8, 0, { scale: .9 }); r.shape('neonsign', P('casino').x + 16, P('casino').y + 4, 0, { params: { color: night ? '#ff5fa2' : '#5ff0ff' } });
    r.shape('dockplanks', P('dock').x, P('dock').y, 0, { params: { len: 40 } }); r.shape('seaplane', P('dock').x + 30, P('dock').y + 18, 0, { scale: .8 });
    r.shape('lighthouse', 16 * 6, 16 * 26, 0);
    // the volcano's steam
    if (G.chance('cosmetic', 1 / 20)) G.game.particles.smoke(16 * 30, 16 * 11, 34, 1, { size: 1.3, color: '#e8e8f0' });
    if (night) { for (const id of ['casino', 'villa', 'promenade']) G.game.lights.add(P(id).x, P(id).y, 20, 70, 1, { color: id === 'casino' ? '#ff5fa2' : '#ffd8a0' }); G.game.lights.add(16 * 6, 16 * 26, 50, 90, 1, { color: '#fff0a0' }); }
    // pins
    for (const q of this.pins) {
      const open = G.openAt(q.id), sel = q.id === this.sel, here = q.id === 'dock' ? [] : G.presentAt(q.id).filter(id => id !== st.partner);
      r.queue(q.x, q.y, 30, g => {
        const s = r.w(q.x, q.y, 24 + (sel ? Math.sin(t * 5) * 2 : 0)), X = Math.round(s[0]), Y = Math.round(s[1]);
        const col = q.greyed ? '#8a8a9a' : open ? (sel ? '#ffd36a' : '#ff9e5e') : '#6a6a7a';
        px.poly(g, [[X - 5, Y - 10], [X + 5, Y - 10], [X, Y]], '#0a0814'); px.poly(g, [[X - 4, Y - 9], [X + 4, Y - 9], [X, Y - 1]], col); px.disc(g, X, Y - 10, 4, col); px.disc(g, X, Y - 10, 2, '#fff8e8');
        if (sel || q.id === (this.hoverId || '')) G.ui.tag(g, q.label + (open ? '' : q.greyed ? ' · ' + q.greyed : ' · closed'), X, Y - 16, '#2a1a10', sel ? '#ffd36a' : '#fff8e8');
        here.slice(0, 4).forEach((id, i) => { G.portrait(g, G.portraitRig(id), X + 8 + i * 11, Y - 8, 10, { frame: false }); });
      }, { bias: 5, emissive: true });
    }
    r.overlay(g => this.drawHUD(g, r));
    if (G.talk) G.talk.draw(r);
  },
  drawHUD(g, r) {
    const st = G.state, safe = G.safe(r);
    G.clockBadge(g, safe.x, safe.y, st.day, st.slot, G.weatherNow());
    G.ui.panel(g, safe.x, safe.y + 18, 96, 15, { alpha: .9 }); G.ui.money(g, safe.x + 4, safe.y + 22, st.money);
    if (st.partner) { E.ui.box(g, r.W - safe.x - 96, safe.y, 96, 24, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .85 }); G.portrait(g, G.portraitRig(st.partner), r.W - safe.x - 94, safe.y + 2, 20, { frame: false }); E.font.text(g, 'Partner: ' + G.CAST[st.partner].name, r.W - safe.x - 70, safe.y + 3, '#fff8e8', { outline: false }); G.ui.hearts(g, r.W - safe.x - 70, safe.y + 13, G.aff(st.partner)); }
    if (this.card) this.drawCard(g, r);
    else if (this.panel) this.drawFriends(g, r);
    else G.promptBar(g, r, [['move', 'Choose a place'], ['confirm', 'Open'], ['alt', 'Friends'], ['extra', 'Journal']]);
  },
  drawCard(g, r) {
    const id = this.card.id, st = G.state, L = G.LOCS[id], open = G.openAt(id), w = 240, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .24), h = Math.round(r.H * .5);
    G.ui.panel(g, x, y, w, h, { title: G.placeName[id].toUpperCase() });
    const acts = { beach: 'Matches · Match Board · Changing hut · Tiki bar', pool: 'Pool Hop · Changing hut · Lounging', promenade: 'Riptide Sports · Coral Couture · Sundries & Smiles', villa: 'Rest · Sleep · Closet · Journal · Album · Mail', casino: 'Slots · Blackjack · Roulette · Prize counter', dock: 'Departures only' }[id];
    E.font.text(g, acts, x + 10, y + 10, '#9fd3d6', { outline: false, wrap: w - 20 });
    E.font.text(g, open ? 'Open now' : id === 'casino' ? 'Opens at night' : id === 'dock' ? 'Story only' : 'Closed at night', x + 10, y + 32, open ? '#9ff3a8' : '#ff9a8a', { outline: false });
    const here = id === 'dock' ? [] : G.presentAt(id).filter(q => q !== st.partner);
    E.font.text(g, here.length ? "Who's there:" : 'Nobody you know is there.', x + 10, y + 46, '#fff8e8', { outline: false });
    here.forEach((nid, i) => { const xx = x + 10 + (i % 3) * 76, yy = y + 58 + Math.floor(i / 3) * 26; G.portrait(g, G.portraitRig(nid), xx, yy, 20, { frame: false }); E.font.text(g, G.CAST[nid].name, xx + 23, yy + 2, '#fff8e8', { outline: false }); G.icon(g, G.moodIcon(st.mood[nid]), xx + 23, yy + 11); const tm = G.teamOf(nid); if (tm) E.font.text(g, 'pair', xx + 33, yy + 11, '#ffd36a', { outline: false }); });
    this.card.nav.draw(g, this.cardItems());
    G.promptBar(g, r, [['confirm', open ? 'Travel' : 'Closed'], ['cancel', 'Back']]);
  },
  drawFriends(g, r) {
    const st = G.state, w = 280, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .16), h = Math.round(r.H * .7);
    G.ui.panel(g, x, y, w, h, { title: 'FRIENDS' });
    G.npcs(st).forEach((id, i) => {
      const yy = y + 10 + i * 26; G.portrait(g, G.portraitRig(id), x + 8, yy, 22, { frame: false });
      E.font.text(g, G.CAST[id].name + (st.partner === id ? '  (partner)' : ''), x + 36, yy + 1, '#fff8e8', { outline: false });
      E.font.text(g, G.stage(G.aff(id)), x + 36, yy + 11, '#9fd3d6', { outline: false }); G.ui.hearts(g, x + 130, yy + 2, G.aff(id)); G.icon(g, G.moodIcon(st.mood[id]), x + 182, yy + 2);
      const tm = G.teamOf(id); E.font.text(g, tm ? 'with ' + G.castName(tm.find(q => q !== id)) : st.partner === id ? 'your team' : 'solo', x + w - 10, yy + 11, '#ffd36a', { align: 'right', outline: false });
    });
    G.promptBar(g, r, [['cancel', 'Close']]);
  }
};


/* ---- 32-location.js ---- */
/* 32-location: one scene for every walkable place, driven by G.LOCS. You walk (70 u/s, 110 running) with the camera on
 * you; the NPCs the schedule put here sit at their spots doing idles and turn to look at you; interact within 22 units
 * opens the talk panel (Chat, Give a Gift, Team Up / Our next match, Challenge, Bye) or uses a thing (the Match Board,
 * a changing hut, a shop door, the Pool Hop deck, the bed, closet, desk, album and mailbox). Hover highlights people and
 * things; a click walks there and uses them. Leaving ends the slot (it asks first). */
G.say = (who, lines, o = {}) => {
  const D = G.talk || (G.talk = new E.Dialog(G.game, { lines: 2, speed: 45, bg: '#0a2d3d', border: '#f6d38a', nameColor: '#ffd36a' }));
  D.speed = G.T.textSpeed * (G.TEXT_SPEED[G.setting('textSpeed', 'Normal')] || 1);
  const c = G.CAST[who];
  D.say(lines, Object.assign({ name: c ? c.name.toUpperCase() : who, portrait: c ? G.portraitRig(who) : null, portraitSize: 40, portraitOpts: { zoom: 3.2, turn: .4, bg: E.shade(c ? c.color : '#2a6a7a', -.45) }, voice: c ? G.voiceFn(who, o.mood) : null, nameColor: c ? c.color : '#ffd36a' }, o));
  return D;
};
G.talkOpen = () => !!(G.talk && G.talk.open && G.talk.modal);
const SPOT_PREF = { stool: 'sit', bench: 'sit', lounger: 'sunbathe', swim: 'swim', edge: 'sit', practice: 'practice', shore: 'stretch', window: 'lookback', cart: 'stand', slots: 'sit', rail: 'stand', bar: 'sit', stand: 'stand' };
G.locMaps = {};
G.getLocMap = loc => { const L = G.LOCS[loc]; if (!G.locMaps[loc]) { G.locMaps[loc] = L.map(); for (const s of L.solids || []) G.locMaps[loc].solid(s[0], s[1], s[2], 0, s[3] || {}); } return G.locMaps[loc]; };
G.scenes.location = {
  pausable: true, view: 'threequarter', input: G.PRESETS.EXPLORE, camera: { zoom: [.85, 1.4] }, res: 'ps1',
  enter(d) {
    const loc = this.loc = (d && d.loc) || 'beach', L = this.L = G.LOCS[loc], st = G.state;
    G.curPlace = loc; G.useInput('EXPLORE');
    this.map = G.getLocMap(loc);
    const s = d && d.at ? d.at : L.start;
    this.hero = new E.Body({ x: s[0], y: s[1], r: 5 }); this.hero.facing = -Math.PI / 2;
    this.heroRig = G.makeRig(st.me, G.wearOf(st.me));
    G.game.follow(this.hero, { z: 16 }); G.game.cam.bounds = v => this.map.bounds(v); G.game.cam.snap = true; G.game.setZoom(L.zoom || 1.1);
    this.tod = G.todFor(st.slot, G.weatherNow(), st.day); G.applyLight(this.tod);
    if (st.slot === 2 || L.night) { try { this.gpu = G.game.enableGPU({ map: this.map }); } catch (e) { this.gpu = null; } }
    G.game.weather = G.weatherNow() === 'rain' ? { kind: 'rain', amount: .6, wind: .25 } : null;
    G.music(st.slot === 2 && loc === 'villa' ? 'siesta' : L.music); G.ambience(st.slot === 2 && loc !== 'casino' ? 'night' : L.amb); G.themeName = st.slot === 2 || L.night ? 'night' : 'day';
    this.buildNPCs(); this.ui = null; this.nav = new G.Nav(); this.t = 0; this.hover = null; this.walkTo = null; this.emotes = []; this.near = null;
    G.photoAllowed = true;
    if (G.storyOnEnter) G.storyOnEnter(loc, this);
  },
  exit() { G.photoAllowed = false; if (this.gpu) { this.gpu.enabled = false; this.gpu = null; } G.game.weather = null; if (G.talk) G.talk.close(); },
  buildNPCs() {
    const st = G.state, L = this.L, here = G.presentAt(this.loc), spots = (L.spots || []).slice(), used = new Set();
    this.npcs = [];
    const take = pref => { let i = spots.findIndex((s, k) => !used.has(k) && (!pref || s.kind === pref)); if (i < 0) i = spots.findIndex((s, k) => !used.has(k)); if (i < 0) return null; used.add(i); return spots[i]; };
    // a team at the beach practices on the court; the rest take spots
    const practice = this.loc === 'beach' && st.teams.find(t => t.every(id => here.includes(id) && st.where[id] === 'beach'));
    for (const id of here) {
      if (id === st.partner) continue;
      let sp = practice && practice.includes(id) ? take('practice') : take(null);
      if (!sp) continue;
      this.npcs.push(this.mkNpc(id, sp));
    }
    if (st.partner && L.partnerSpot) this.npcs.push(this.mkNpc(st.partner, { x: L.partnerSpot[0], y: L.partnerSpot[1], kind: 'stand' }, true));
    for (const [id, x, y, f] of L.staff || []) this.npcs.push(Object.assign(this.mkNpc(id, { x, y, kind: 'stand' }), { staff: true, facing: f }));
    if (G.storyNPCs) G.storyNPCs(this);
  },
  mkNpc(id, sp, partner) { const r = G.makeRig(id, G.wearOf(id) || {}); return { id, rig: r, x: sp.x, y: sp.y, kind: sp.kind, idle: SPOT_PREF[sp.kind] || 'stand', facing: sp.facing !== undefined ? sp.facing : Math.PI / 2, ph: G.rand('cosmetic', 0, 9), partner: !!partner, react: null, reactT: 0 }; },
  /* ---------------- update ---------------- */
  update(dt) {
    this.t += dt; G.tickAmbience(dt);
    const I = G.game.input, st = G.state;
    for (const e of this.emotes) e.t += dt; this.emotes = this.emotes.filter(e => e.t < 1.4);
    this.animate(dt);
    if (G.talk && G.talk.open) { G.talk.update(dt); if (G.talk.modal) return; }
    if (G.storyBusy && G.storyBusy()) return;
    if (this.ui) { this.updateUI(dt); return; }
    // walking
    const m = I.move(), dvec = G.game.view.screenDirToGround(m[0], m[1]), run = I.down('run'), sp = run ? 110 : 70;
    let vx = dvec[0] * sp, vy = dvec[1] * sp;
    if (this.walkTo && Math.hypot(m[0], m[1]) < .1) { const dx = this.walkTo.x - this.hero.x, dy = this.walkTo.y - this.hero.y, d = Math.hypot(dx, dy); if (d > 14) { vx = dx / d * 90; vy = dy / d * 90; } else { const t = this.walkTo; this.walkTo = null; this.use(t); } }
    else if (Math.hypot(m[0], m[1]) > .1) this.walkTo = null;
    this.hero.vx = vx; this.hero.vy = vy; this.hero.update(dt, this.map);
    if (Math.hypot(vx, vy) > 5) this.hero.facing = Math.atan2(vy, vx);
    if (Math.hypot(vx, vy) > 5 && G.chance('cosmetic', dt * 3)) G.sfx('step_sand', { vol: .5 });
    // what is near: the nearest person or thing within 22
    this.near = this.nearest();
    if (I.pressed('interact') && this.near) { I.consume('interact'); this.use(this.near); return; }
    // the mouse: hover names a person or thing; a click walks there and uses it
    const p = I.pointer(); this.hover = null;
    if (p && I.lastDevice === 'mouse' && G.lastR && G.lastR.pick) { const hits = G.lastR.pick(p[0], p[1]); this.hover = hits.find(h => h && (h.npc || h.act)) || null; }
    const c = I.clicked(); if (c && G.lastR && G.lastR.pick) { const hits = G.lastR.pick(c[0], c[1]), h = hits.find(q => q && (q.npc || q.act)); if (h) this.walkTo = h.npc ? { npc: h.npc, x: h.npc.x, y: h.npc.y } : { act: h.act, x: h.act.x, y: h.act.y }; }
    if (I.pressed('bag')) { this.openBag(null); return; }
    if (I.pressed('snap') && G.photo) { G.photo.open(); return; }
    if (I.pressed('leave') || this.atExit()) { if (this.atExit()) { this.hero.y -= (this.L.exit.y1 && this.hero.y > this.L.exit.y1 ? 8 : 0); this.hero.x = clamp(this.hero.x, (this.L.exit.x0 || 0) + 10, (this.L.exit.x1 || 9999) - 10); } this.askLeave(); }
  },
  atExit() { const X = this.L.exit; if (!X) return false; const h = this.hero; return (X.y1 && h.y > X.y1) || (X.x0 !== undefined && h.x < X.x0) || (X.x1 !== undefined && h.x > X.x1); },
  nearest() {
    let best = null, bd = 22;
    for (const n of this.npcs) { const d = Math.hypot(n.x - this.hero.x, n.y - this.hero.y); if (d < bd + 4) { bd = d; best = { npc: n, x: n.x, y: n.y }; } }
    for (const a of this.L.acts || []) { if (a.hidden) continue; const d = Math.hypot(a.x - this.hero.x, a.y - this.hero.y); if (d < bd) { bd = d; best = { act: a, x: a.x, y: a.y }; } }
    if (this.loc === 'casino') for (const [x, y] of this.L.slots) { const d = Math.hypot(x + 14 - this.hero.x, y - this.hero.y); if (d < bd) { bd = d; best = { act: this.L.acts.find(a => a.kind === 'slots'), x, y }; } }
    return best;
  },
  use(t) {
    if (t.npc) { if (t.npc.staff) return this.staffTalk(t.npc); return this.openTalk(t.npc); }
    const a = t.act, st = G.state; if (!a) return;
    G.sfx('ui_select');
    if (a.kind === 'board') return this.openBoard();
    if (a.kind === 'wardrobe') return G.game.go('wardrobe', { from: this.loc, at: [this.hero.x, this.hero.y] });
    if (a.kind === 'shop') { G.sfx('door'); return G.game.go('shop', { shop: a.shop, from: this.loc, at: [this.hero.x, this.hero.y] }, { fade: 'iris', at: this.hero }); }
    if (a.kind === 'poolhop') return G.confirm('Play Pool Hop? Hop 32 pads on the beat. It ends the ' + G.SLOTS[st.slot] + '.', () => G.game.go('poolhop', { from: 'pool' }));
    if (a.kind === 'bed') return this.openBed();
    if (a.kind === 'journal') return G.game.go('journal', { from: this.loc, at: [this.hero.x, this.hero.y] });
    if (a.kind === 'album') return G.game.go('album', { from: this.loc, at: [this.hero.x, this.hero.y] });
    if (a.kind === 'mail') return this.openMail();
    if (['cashier', 'slots', 'blackjack', 'roulette', 'prize', 'vip'].includes(a.kind)) return G.game.go('casino', { station: a.kind, at: [this.hero.x, this.hero.y] });
  },
  staffTalk(n) { const line = n.id === 'kai' ? G.pickLine('kai', 'shop') : n.id === 'pepper' ? G.pickLine('pepper', 'quip') : G.pickLine(n.id, 'shop'); G.say(n.id, line); },
  askLeave() {
    const st = G.state;
    if (this.loc === 'casino') return G.confirm('Leave the casino? This ends the Night.', () => { G.casinoLeaveNight && G.casinoLeaveNight(); });
    G.confirm('Leave? This ends the ' + G.SLOTS[st.slot] + '.', () => G.leaveLocation());
  },
  /* ---------------- the talk panel ---------------- */
  openTalk(n) {
    const st = G.state; n.facing = Math.atan2(this.hero.y - n.y, this.hero.x - n.x); this.hero.facing = Math.atan2(n.y - this.hero.y, n.x - this.hero.x);
    this.ui = { kind: 'talk', npc: n, nav: new G.Nav({ focus: 'chat' }) };
    G.say(n.id, G.greetLine(n.id), { modal: false, auto: 2.6 });
  },
  talkItems() {
    const n = this.ui.npc, st = G.state, W = G.game.W, H = G.game.H, x = Math.round(W * .06), y = Math.round(H * .12), mine = st.partner === n.id;
    const team = G.teamOf(n.id), beach = this.loc === 'beach';
    return G.listLayout([
      { id: 'chat', label: 'Chat', onPress: () => { const r = G.chat(n.id); G.say(n.id, r.line, { modal: true }); if (r.d > 0) this.emote(n, 'heart'); } },
      { id: 'gift', label: 'Give a Gift', disabled: st.gifted[n.id] === st.slot + 1, onPress: () => this.openBag(n) },
      mine ? { id: 'next', label: 'Our next match?', disabled: !beach || st.slot === 2, onPress: () => this.openBoard() } : { id: 'team', label: 'Team Up', onPress: () => this.tryInvite(n) },
      beach && team && !mine && st.slot < 2 ? { id: 'challenge', label: 'Challenge', onPress: () => this.challenge(team) } : null,
      { id: 'bye', label: 'Bye', onPress: () => { this.ui = null; G.sfx('ui_back'); } }
    ], x, y + 40, 120, 16, 4);
  },
  tryInvite(n) {
    const st = G.state, doIt = () => { const r = G.invite(n.id); G.say(n.id, r.line); if (r.ok) { this.emote(n, 'heart'); G.toast(G.CAST[n.id].name + ' is your partner', 'Partner chemistry follows your friendship', 'heart'); n.partner = true; this.buildNPCs(); this.ui = null; } else this.emote(n, 'dots'); };
    if (st.partner && st.partner !== n.id) return G.confirm(G.CAST[st.partner].name + ' will be disappointed... Team up with ' + G.CAST[n.id].name + ' instead?', doIt, { destructive: true });
    doIt();
  },
  challenge(team) { this.ui = null; G.startVacationMatch({ pair: team }); },
  emote(n, kind) { this.emotes.push({ n, kind, t: 0 }); if (kind === 'heart') G.fx.hearts(n.x, n.y, 40, 4); },
  /* ---------------- the gift bag ---------------- */
  openBag(n) {
    const st = G.state, items = [];
    for (const id of Object.keys(st.bag).sort((a, b) => G.GIFTS[a].cat.localeCompare(G.GIFTS[b].cat))) items.push({ id, n: st.bag[id], kind: 'gift' });
    if (n) { for (const s of st.wardrobe.suits) if (s !== st.wearing.suit && s !== G.CAST[st.me].suit) items.push({ id: s, kind: 'suit' }); for (const a of st.wardrobe.acc) if (!st.wearing.acc.includes(a)) items.push({ id: a, kind: 'acc' }); }
    this.ui = { kind: 'bag', npc: n, items, page: 0, nav: new G.Nav(), prev: this.ui };
  },
  bagItems() {
    const U = this.ui, W = G.game.W, H = G.game.H, cols = 3, rows = 2, per = cols * rows, cw = 70, ch = 46, x0 = Math.round(W / 2 - (cols * cw + (cols - 1) * 6) / 2), y0 = Math.round(H * .26);
    const page = U.items.slice(U.page * per, U.page * per + per);
    return page.map((it, i) => ({ id: it.id, x: x0 + (i % cols) * (cw + 6), y: y0 + Math.floor(i / cols) * (ch + 6), w: cw, h: ch, it, onPress: () => this.giveFromBag(it) }));
  },
  giveFromBag(it) {
    const n = this.ui.npc; if (!n) { G.sfx('ui_tick'); return; }
    const r = G.giveGift(n.id, it.id); this.ui = null;
    if (r.already) { G.say(n.id, r.line); return; }
    G.sfx('gift_unwrap');
    G.say(n.id, r.line, { mood: r.accepted ? 'happy' : 'sad' });
    if (r.taste === 'love') { G.sting('gift_love'); this.emote(n, 'heart'); n.react = 'love'; } else if (r.accepted) { this.emote(n, r.taste === 'like' ? 'note' : 'dots'); n.react = r.taste; } else { G.sting('gift_refuse'); this.emote(n, '!'); n.react = 'refuse'; }
    n.reactT = 0;
    if (r.accepted && (G.SUITS[it.id] || G.ACCS[it.id])) n.rig = G.makeRig(n.id, G.wearOf(n.id));
  },
  /* ---------------- the Match Board ---------------- */
  openBoard() {
    const st = G.state; if (st.slot === 2) return;
    this.ui = { kind: 'board', nav: new G.Nav() };
    G.sfx('ui_select');
    if (st.partner && G.CAST[st.partner]) { const pn = this.npcs.find(q => q.id === st.partner); if (pn) { pn.x = 210; pn.y = 340; } }
  },
  boardEntries() {
    const st = G.state, here = new Set(G.presentAt('beach')), out = [];
    const special = G.specialMatch && G.specialMatch();
    if (special) out.push(special);
    else for (const t of st.teams) if (t.every(id => here.has(id) && st.where[id] === 'beach')) out.push({ pair: t, rec: st.record[G.teamKey(...t)] || [0, 0] });
    return out;
  },
  boardItems() {
    const W = G.game.W, H = G.game.H, E2 = this.boardEntries(), x = Math.round(W / 2 - 130), y = Math.round(H * .3);
    const its = E2.map((e, i) => ({ id: 'm' + i, x, y: y + i * 34, w: 260, h: 30, e, onPress: () => { if (!G.state.partner && !e.noPartner) { G.sfx('ui_error'); G.toast('You need a partner', 'Talk to someone and Team Up first'); return; } this.ui = null; G.startVacationMatch(e); } }));
    its.push({ id: 'close', x: Math.round(W / 2 - 40), y: y + Math.max(1, E2.length) * 34 + 10, w: 80, h: 16, label: 'Close', onPress: () => { this.ui = null; } });
    return its;
  },
  /* ---------------- the villa: bed and mailbox ---------------- */
  openBed() {
    const st = G.state;
    if (st.slot < 2) G.confirm('Rest until the ' + G.SLOTS[st.slot + 1] + '?', () => { G.restSlot(); });
    else G.confirm('Sleep? The day ends.', () => { G.sleep(); });
  },
  openMail() {
    const st = G.state; if (!st.mail.length) { G.say('pepper', 'No mail. The pelicans are on strike.'); return; }
    const k = st.mail.shift(); st.read[k] = true; const L = G.LETTERS[k];
    const from = L.from === 'best' ? G.bestFriend() : L.from, text = L.from === 'best' ? G.FRIEND_NOTES[from] : L.text;
    G.sfx('door'); this.ui = { kind: 'letter', from, title: L.title, text, nav: new G.Nav() };
    if (G.onLetter) G.onLetter(k);
  },
  updateUI(dt) {
    const U = this.ui, I = G.game.input;
    if (U.kind === 'talk') { const ev = U.nav.update(this.talkItems(), I); if (ev.back) { this.ui = null; G.sfx('ui_back'); } return; }
    if (U.kind === 'bag') {
      const per = 6, pages = Math.max(1, Math.ceil(U.items.length / per)), ev = U.nav.update(this.bagItems(), I, { wheelTabs: true });
      if (ev.tab) { U.page = (U.page + ev.tab + pages) % pages; G.sfx('ui_tab'); }
      if (ev.back) { this.ui = U.npc ? Object.assign(U.prev || {}, {}) : null; if (U.prev && U.prev.kind === 'talk') this.ui = U.prev; else this.ui = null; G.sfx('ui_back'); }
      return;
    }
    if (U.kind === 'board') { const ev = U.nav.update(this.boardItems(), I); if (ev.back) { this.ui = null; G.sfx('ui_back'); } return; }
    if (U.kind === 'letter') { if (I.pressed('confirm') || I.pressed('cancel') || I.clicked()) { this.ui = null; G.sfx('ui_back'); } }
  },
  /* ---------------- animation ---------------- */
  animate(dt) {
    const h = this.hero, t = this.t;
    G.Anim.idle(this.heroRig, dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing });
    for (const n of this.npcs) {
      const d = Math.hypot(this.hero.x - n.x, this.hero.y - n.y);
      if (d < 40 && n.idle !== 'swim' && n.idle !== 'sunbathe') n.facing = E.approachAng(n.facing, Math.atan2(this.hero.y - n.y, this.hero.x - n.x), dt * 4);
      const s = { x: n.x, y: n.y, z: 0, facing: n.facing, poseW: {} };
      let clip = null, ct = t + n.ph, mask = null;
      n.reactT += dt; if (n.reactT > 1.4) n.react = null;
      if (n.react === 'love') { s.pose = 'cheer'; s.expr = 'smile'; s.z = Math.abs(Math.sin(n.reactT * 8)) * 4; }
      else if (n.react === 'like') { s.expr = 'smile'; clip = 'Head Nod'; ct = n.reactT; mask = 'upper'; }
      else if (n.react === 'refuse') { clip = 'Idle_FoldArms_Loop'; ct = n.reactT; s.expr = 'angry'; }
      else if (n.idle === 'sit') { s.poseW.sit = 1; if (G.Anim.has('Sitting_Idle_Loop')) { clip = 'Sitting_Idle_Loop'; } }
      else if (n.idle === 'sunbathe') { s.down = 1; s.poseW.sunbathe = 1; }
      else if (n.idle === 'swim') { s.z = -10 + Math.sin(t * 2 + n.ph) * .8; clip = 'Swim_Idle_Loop'; }
      else if (n.idle === 'practice') { s.poseW.bump = .5 + .5 * Math.max(0, Math.sin(t * 3 + n.ph)); n.facing = n.x < 352 ? 0 : Math.PI; }
      else if (n.idle === 'stretch') s.poseW.stretch = 1;
      else if (n.idle === 'lookback') s.poseW.lookback = .6;
      else clip = n.staff ? null : 'Idle_Talking_Loop';
      if (this.ui && this.ui.npc === n) { s.expr = s.expr || 'smile'; n.rig._talk = G.talk && G.talk.open && G.talk.typing; }
      G.Anim.idle(n.rig, dt, s, { clip, t: ct, mask });
    }
  },
  /* ---------------- drawing ---------------- */
  draw(r) {
    const L = this.L, st = G.state;
    if (L.sky) G.drawSky(r, this.tod, r.w(this.hero.x, 0, 0)[1]);
    this.map.drawFloor(r); this.map.queueWalls(r);
    if (this.loc === 'beach' || this.loc === 'promenade' || this.loc === 'villa') G.drawShore(r, G.now(), 0, 800, this.loc === 'beach' ? 96 : this.loc === 'villa' ? 192 : 224);
    this.drawDressing(r);
    // people
    for (const n of this.npcs) {
      const hv = (this.hover && this.hover.npc === n) || (this.near && this.near.npc === n);
      if (n.idle !== 'swim') r.shadow(n.x, n.y, 6, .3);
      r.actor(n.x, n.y, n.idle === 'swim' ? -6 : 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { pick: { npc: n }, outline: hv ? '#ffd36a' : undefined });
      if (n.idle === 'swim') r.queue(n.x, n.y, 0, g => { const q = r.w(n.x, n.y, 0); px.blend(g, .6, 'normal', () => px.ell(g, q[0], q[1] - 1, 8, 3, '#9ff3e8')); }, { bias: .5 });
      if (hv) r.queue(n.x, n.y, 46, g => { const q = r.w(n.x, n.y, 50); G.ui.tag(g, G.CAST[n.id].name + (n.partner ? ' (partner)' : ''), q[0], q[1]); }, { bias: 3 });
    }
    for (const e of this.emotes) r.queue(e.n.x, e.n.y, 50, g => { const q = r.w(e.n.x, e.n.y, 52 + e.t * 8); const s = { heart: '♥', note: '♪', dots: '...', '!': '!', '?': '?' }[e.kind] || '!'; G.ui.tag(g, s, q[0], q[1], e.kind === 'heart' ? '#ff5f7a' : '#2a1a10', '#fff8e8'); }, { bias: 3 });
    const h = this.hero; r.shadow(h.x, h.y, 6, .35);
    r.actor(h.x, h.y, h.z, (g, ox, oy) => this.heroRig.draw(g, ox, oy, r.view));
    // interactables: a sparkle over each, a name when near or hovered
    for (const a of L.acts || []) { if (a.hidden) continue; const hv = (this.hover && this.hover.act === a) || (this.near && this.near.act === a); r.queue(a.x, a.y, 30, g => { const q = r.w(a.x, a.y, 34); if (hv) G.ui.tag(g, a.label, q[0], q[1], '#2a1a10', '#ffd36a'); else if (Math.floor(G.now() * 2 + a.x) % 2) px.dot(g, q[0], q[1], '#fff6c0'); }, { bias: 3, pick: { act: a }, emissive: true }); }
    if (G.storyDraw) G.storyDraw(r, this);
    if (!G.overlay.has('photo')) r.overlay(g => this.drawHUD(g, r));   // (photo mode frames the place, not the HUD)
    if (G.talk) G.talk.draw(r);
  },
  drawDressing(r) {
    const L = this.L, loc = this.loc, night = this.tod === 'night';
    if (loc === 'beach') { G.drawCourtProps(r, { tod: this.tod }); G.drawNet(r); r.shape('sign', 196, 318, 0, { facing: Math.PI / 2 }); r.queue(196, 318, 26, g => { const q = r.w(196, 318, 28); px.rect(g, q[0] - 9, q[1] - 6, 18, 9, '#1a3a5a'); E.font.text(g, 'VS', q[0], q[1] - 5, '#ffd36a', { align: 'center', outline: false, font: 'tiny' }); }); return; }
    for (const s of L.solids || []) r.shape(s[0], s[1], s[2], 0, s[3] || {});
    for (const s of L.deco || []) { const fl = s[3] === 'float', z = fl ? 1 + Math.sin(G.now() * 2 + s[1]) : 0; r.shape(s[0], s[1], s[2], z, Object.assign({ shadow: !fl }, s[4] || {})); }
    for (const p of L.props || []) r.prop(p[0], p[1], p[2], 0, { size: p[3] || 1, light: night || L.night });
    if (L.shops) for (const [id, x, y] of L.shops) { const S = G.SHOPS[id]; r.shape('shopfront', x, y, 0, { params: { color: S.color } }); r.queue(x, y + 6, 40, g => { const q = r.w(x, y + 6, 36); E.font.text(g, S.name, q[0], q[1] - 4, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); }, { bias: 2 }); }
    if (L.slots) for (const [x, y] of L.slots) r.shape('slotmachine', x, y, 0, { facing: 0, params: { color: ['#e8283a', '#ffd36a', '#5ff0ff'][Math.floor(x + y) % 3] } });
    if (loc === 'casino') { r.shape('neonsign', 240, 300, 0, { params: { color: '#ff5fa2' } }); for (const [x, y] of [[160, 120], [330, 120]]) G.game.lights.add(x, y, 40, 130, 1, { color: '#ffe0a0' }); for (const [x, y, c] of [[100, 50, '#5ff0ff'], [240, 48, '#ff5fa2'], [430, 70, '#ffd36a']]) G.game.lights.add(x, y, 20, 90, .8, { color: c }); }
    if (loc === 'villa') { r.queue(96, 33, 22, g => { const q = r.w(96, 33, 24); px.rect(g, q[0] - 8, q[1] - 6, 16, 12, '#c8a050'); px.rect(g, q[0] - 6, q[1] - 4, 12, 8, '#78c8f0'); px.rect(g, q[0] - 6, q[1] + 1, 12, 3, '#f3d9a4'); }); r.shape('mailbox', 200, 182, 0); if (night) G.game.lights.add(24, 44, 26, 120, 1, { color: '#ffd8a0' }); }
    if (loc === 'pool') { for (let i = 0; i < 6; i++) { const x = 360 + i * 16, y = 196 + (i % 2) * 6; r.shape('poolfloat', x, y, 1 + Math.sin(G.now() * 3 + i) * .6, { params: { color: ['#ffd04a', '#ff5f7a', '#2ec4c9'][i % 3] }, shadow: false }); } r.shape('sign', 400, 238, 0); }
  },
  drawHUD(g, r) {
    const st = G.state, safe = G.safe(r);
    G.clockBadge(g, r.W - safe.x, safe.y, st.day, st.slot, G.weatherNow(), { right: true });
    G.ui.panel(g, r.W - safe.x - 92, safe.y + 18, 92, 15, { alpha: .88 }); G.ui.money(g, r.W - safe.x - 88, safe.y + 22, st.money);
    E.font.text(g, this.L.name.toUpperCase(), safe.x, safe.y + 2, '#ffd36a', { scale: 1, shadow: '#000', outline: false });
    if (st.partner) { E.ui.box(g, safe.x, safe.y + 12, 92, 24, { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', alpha: .85 }); G.portrait(g, G.portraitRig(st.partner), safe.x + 2, safe.y + 14, 20, { frame: false }); E.font.text(g, G.CAST[st.partner].name, safe.x + 25, safe.y + 14, '#fff8e8', { outline: false }); G.ui.hearts(g, safe.x + 25, safe.y + 25, G.aff(st.partner)); }
    const U = this.ui;
    if (!U && !(G.talk && G.talk.open && G.talk.modal)) {
      const items = [this.near ? ['interact', this.near.npc ? 'Talk' : (this.near.act ? this.near.act.label : 'Use')] : null, ['run', 'Run'], ['bag', 'Gift bag'], ['leave', 'Island map'], !G.hub && ['snap', 'Postcard']];
      G.promptBar(g, r, items);
    }
    if (U && U.kind === 'talk') {
      const n = U.npc, its = this.talkItems(), x = its[0].x - 8, y = its[0].y - 48;
      G.ui.panel(g, x, y, 136, 48 + its.length * 20 + 6);
      G.portrait(g, n.rig, x + 6, y + 6, 34, { frame: false });
      E.font.text(g, G.CAST[n.id].name, x + 46, y + 6, '#ffd36a', { outline: false });
      E.font.text(g, G.stage(G.aff(n.id)), x + 46, y + 16, '#9fd3d6', { outline: false });
      G.ui.hearts(g, x + 46, y + 27, G.aff(n.id)); G.icon(g, G.moodIcon(st.mood[n.id]), x + 46, y + 37); E.font.text(g, G.MOOD_WORD[st.mood[n.id] || 'normal'], x + 56, y + 37, '#fff8e8', { outline: false });
      U.nav.draw(g, its);
      G.promptBar(g, r, [['confirm', 'Choose'], ['cancel', 'Back']]);
    }
    if (U && U.kind === 'bag') this.drawBag(g, r);
    if (U && U.kind === 'board') this.drawBoard(g, r);
    if (U && U.kind === 'letter') {
      const w = Math.min(260, r.W - 40), lines = E.font.wrap(U.text, w - 24), h = lines.length * 10 + 46, x = Math.round((r.W - w) / 2), y = Math.round((r.H - h) / 2);
      E.ui.box(g, x, y, w, h, { bg: ['#f8f0dc', '#e8d8b8'], border: '#a88a62', alpha: 1 });
      E.font.text(g, U.title, x + 12, y + 8, '#8a3a2a', { outline: false, scale: 1 });
      if (G.CAST[U.from]) G.portrait(g, G.portraitRig(U.from), x + w - 34, y + 6, 24, { frame: false });
      lines.forEach((l, i) => E.font.text(g, l, x + 12, y + 24 + i * 10, '#3a2a1a', { outline: false }));
      G.promptBar(g, r, [['confirm', 'Close']]);
    }
  },
  drawBag(g, r) {
    const U = this.ui, its = this.bagItems(), per = 6, pages = Math.max(1, Math.ceil(U.items.length / per));
    const x = its.length ? its[0].x - 12 : Math.round(r.W / 2 - 120), y = Math.round(r.H * .26) - 30;
    G.ui.panel(g, x, y, 240, 150, { title: U.npc ? 'GIVE A GIFT TO ' + G.CAST[U.npc.id].name.toUpperCase() : 'GIFT BAG' });
    if (!U.items.length) E.font.text(g, 'Your bag is empty. The shops on the Promenade sell gifts.', r.W / 2, y + 60, '#fff8e8', { align: 'center', outline: false, wrap: 200 });
    for (const it of its) {
      const on = U.nav.focus === it.id, I2 = it.it, item = G.itemById(I2.id);
      E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: on ? '#ffd36a' : '#5a8a92', alpha: .96 });
      G.itemIcon(g, I2.id, it.x + it.w / 2 - 6, it.y + 5);
      E.font.text(g, G.fit(item.name, it.w - 6), it.x + it.w / 2, it.y + 22, '#fff8e8', { align: 'center', outline: false });
      if (I2.kind === 'gift') E.font.text(g, '×' + I2.n, it.x + it.w - 4, it.y + 3, '#ffd36a', { align: 'right', outline: false });
      const known = U.npc && G.state.known[U.npc.id][I2.id];
      if (known) E.font.text(g, known === 'love' ? '♥ loves' : known === 'like' ? '+ likes' : known === 'dislike' ? '- dislikes' : 'neutral', it.x + it.w / 2, it.y + 33, known === 'love' ? '#ff9ac8' : known === 'dislike' ? '#ff9a8a' : '#9fd3d6', { align: 'center', outline: false });
      if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
    }
    if (pages > 1) E.font.text(g, 'Page ' + (U.page + 1) + '/' + pages, x + 230, y + 138, '#9fd3d6', { align: 'right', outline: false });
    G.promptBar(g, r, [U.npc && ['confirm', 'Give'], pages > 1 && ['tabL', 'Page'], ['cancel', 'Back']]);
  },
  drawBoard(g, r) {
    const its = this.boardItems(), st = G.state, x = its[0].x - 10, y = its[0].y - 30;
    G.ui.panel(g, x, y, 280, its.length * 34 + 30, { title: 'MATCH BOARD' });
    E.font.text(g, st.partner ? 'You & ' + G.CAST[st.partner].name + ' vs...' : 'You need a partner: Team Up with someone first.', x + 12, y + 10, st.partner ? '#fff8e8' : '#ff9a8a', { outline: false });
    if (its.length === 1) E.font.text(g, 'No pair is free on the courts right now.', x + 12, y + 30, '#9fd3d6', { outline: false });
    for (const it of its) {
      if (!it.e) { G.ui.button(g, it, this.ui.nav.focus === it.id); continue; }
      const on = this.ui.nav.focus === it.id, e = it.e;
      E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#1f7a8a', '#0f4c5c'] : ['#174a5a', '#0c2e3a'], border: on ? '#ffd36a' : '#5a8a92', alpha: .96 });
      e.pair.forEach((id, k) => G.portrait(g, G.portraitRig(id), it.x + 4 + k * 22, it.y + 4, 20, { frame: false }));
      E.font.text(g, e.label || e.pair.map(G.castName).join(' & '), it.x + 52, it.y + 5, e.special ? '#ffd36a' : '#fff8e8', { outline: false });
      const stars = e.stars || Math.round(G.matchSkill(e) * 5 + .3);
      for (let k = 0; k < 5; k++) G.icon(g, k < stars ? 'star' : 'starEmpty', it.x + 52 + k * 9, it.y + 16);
      if (e.rec) E.font.text(g, 'Record ' + e.rec[0] + '-' + e.rec[1], it.x + it.w - 6, it.y + 16, '#9fd3d6', { align: 'right', outline: false });
      if (e.tag) E.font.text(g, e.tag, it.x + it.w - 6, it.y + 5, '#ff9e5e', { align: 'right', outline: false });
      if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
    }
    G.promptBar(g, r, [['confirm', 'Play'], ['cancel', 'Back']]);
  }
};
/** an item's icon: gifts are pixel art; suits a hanger in the suit's colors; accessories their own little sprite */
G.itemIcon = (g, id, x, y) => {
  if (G.GIFT_ICONS[id]) { px.sprite(g, G.GIFT_ICONS[id], Math.round(x), Math.round(y)); return; }
  const s = G.SUITS[id];
  if (s) { const c = s.colors; px.rect(g, x + 5, y, 2, 2, '#c8c4d8'); px.poly(g, [[x + 1, y + 3], [x + 11, y + 3], [x + 9, y + 12], [x + 3, y + 12]], c.main); px.rect(g, x + 3, y + 6, 6, 1, c.accent); px.rect(g, x + 4, y + 9, 4, 1, c.trim); return; }
  const a = G.ACCS[id];
  if (a) { if (a.shades) G.icon(g, 'shades', x + 2, y + 4); else if (a.anchor === 'head') { px.ell(g, x + 6, y + 8, 6, 2, id === 'sunhat' ? '#f0d890' : '#ffffff'); px.disc(g, x + 6, y + 6, 3, id === 'sunhat' ? '#e8c070' : id === 'visor' ? '#3a6ad8' : '#ffffff'); } else if (id === 'hibiscus') { for (let k = 0; k < 5; k++) px.disc(g, x + 6 + Math.cos(k * 1.26) * 3, y + 6 + Math.sin(k * 1.26) * 3, 2, '#e8283a'); px.dot(g, x + 6, y + 6, '#ffd04a'); } else if (id === 'ribbon') { px.poly(g, [[x + 6, y + 6], [x, y + 2], [x, y + 10]], '#d8303a'); px.poly(g, [[x + 6, y + 6], [x + 12, y + 2], [x + 12, y + 10]], '#d8303a'); } else if (id === 'shellnecklace') { for (let k = 0; k < 6; k++) px.dot(g, x + 1 + k * 2, y + 4 + Math.abs(k - 2.5), '#f8f4e8'); } else { px.rect(g, x + 1, y + 4, 4, 4, '#ffffff'); px.rect(g, x + 7, y + 4, 4, 4, '#ffffff'); } }
};
G.bestFriend = () => { const st = G.state; return G.npcs(st).slice().sort((a, b) => st.affinity[b] - st.affinity[a])[0]; };
/** leave a place: the slot ends; the map, or the day's end after the night */
G.leaveLocation = () => { const r = G.endSlot(); if (r === 'dayEnd') G.game.go('dayend'); else G.game.go('map', null, { fade: 'iris' }); };
G.restSlot = () => { G.sfx('ui_select'); const st = G.state; if (G.storyOnRest && G.storyOnRest()) return; G.endSlot(); G.game.go('map', null, { fade: 'dissolve', seconds: .5 }); };
G.sleep = () => { if (G.storyOnSleep && G.storyOnSleep()) return; G.game.go('dayend', null, { fade: 'dissolve', seconds: .6 }); };


/* ---- 33-shop.js ---- */
/* 33-shop: the three shops (category tabs, a 3x2 card grid paged, one detail panel, a live rig of your fighter wearing the
 * focused suit or accessory turning on a pedestal, Try on, buy with a confirm over 30% of your money, OWNED / WEARING /
 * NEW / DEAL badges, the keeper's quip with voice), the wardrobe (yours, then your partner's accepted suits) and the
 * Villa journal (Friends with the likes you've learned, Stats, Save). */
G.priceOf = (it, shop) => { if (!it.price) return 0; const deal = G.state && G.state.deals[shop] && G.state.deals[shop].includes(it.id); return Math.round(it.price * G.T.priceMul * (deal ? .75 : 1) / 100) * 100; };
G.owns = id => { const st = G.state; return st.wardrobe.suits.includes(id) || st.wardrobe.acc.includes(id); };
G.buy = (shop, id) => {
  const st = G.state, it = G.itemById(id), p = G.priceOf(it, shop);
  if (it.kind !== 'gift' && G.owns(id)) return { ok: false, why: 'owned' };
  if (it.kind === 'gift' && (st.bag[id] || 0) >= 9) return { ok: false, why: 'full' };
  if (!G.spend(p)) return { ok: false, why: 'money', short: p - st.money };
  if (it.kind === 'suit') st.wardrobe.suits.push(id); else if (it.kind === 'acc') st.wardrobe.acc.push(id); else st.bag[id] = (st.bag[id] || 0) + 1;
  G.bus.emit('purchase', { kind: 'buy', shop, id, price: p }); G.saveUnlocks();
  return { ok: true, price: p };
};
G.equip = id => { const st = G.state, it = G.itemById(id); if (!it) return; if (it.kind === 'suit') st.wearing.suit = id; else if (it.kind === 'acc') { const an = it.anchor; st.wearing.acc = st.wearing.acc.filter(a => G.ACCS[a].anchor !== an).concat(id); } };
G.unequip = id => { const st = G.state; st.wearing.acc = st.wearing.acc.filter(a => a !== id); };
const shopBg = (g, r, col, wall) => {
  const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix(wall, E.shade(wall, -.35), y / H));
  px.rect(g, 0, Math.round(H * .78), W, H, E.shade(col, -.55)); px.rect(g, 0, Math.round(H * .78), W, 2, E.shade(col, -.2));
  for (let i = 0; i < 6; i++) { const x = Math.round(W * (.08 + i * .17)); px.rect(g, x, Math.round(H * .1), 3, Math.round(H * .66), E.shade(wall, -.2)); }
  for (let y = 0; y < 3; y++) px.rect(g, 0, Math.round(H * (.24 + y * .2)), W, 2, E.shade(col, -.3));
};
G.scenes.shop = {
  view: 'court', input: G.PRESETS.MENU, camera: false, pausable: true,
  enter(d) {
    G.useInput('MENU'); this.shop = d.shop; this.from = d.from || 'promenade'; this.at = d.at; this.S = G.SHOPS[d.shop];
    this.tab = 0; this.page = 0; this.nav = new G.Nav(); this.t = 0; this.turn = 0; this.tryOn = true; this.keeper = G.makeRig(this.S.keeper); this.quip = G.pickLine(this.S.keeper, 'shop'); this.quipT = 0; this.focusId = null;
    this.say(this.quip); G.music('boutique'); G.themeName = 'day'; G.photoAllowed = false;
  },
  say(s) { this.quip = s; this.quipT = 0; this._qs = 0; },
  stock() { const st = G.state; return G.shopStock(this.shop, st.day).filter(e => e.tab === this.tab); },
  items() {
    const W = G.game.W, H = G.game.H, all = this.stock(), per = 6, list = all.slice(this.page * per, this.page * per + per), cw = Math.round(W * .15), ch = 48, x0 = Math.round(W * .06), y0 = Math.round(H * .25);
    return list.map((e, i) => ({ id: e.item.id, x: x0 + (i % 3) * (cw + 6), y: y0 + Math.floor(i / 3) * (ch + 6), w: cw, h: ch, it: e.item, onPress: () => this.tryBuy(e.item) }));
  },
  tryBuy(it) {
    const st = G.state, p = G.priceOf(it, this.shop);
    if (it.kind !== 'gift' && G.owns(it.id)) { if (it.kind === 'suit' || it.kind === 'acc') { G.equip(it.id); G.sfx('ui_select'); this.say('Wearing it. Très chic.'); this.rig = null; } return; }
    if (st.money < p) { G.sfx('ui_error'); this.say(G.LINES[this.S.keeper].shop[5]); return; }
    const go = () => { const r = G.buy(this.shop, it.id); if (r.ok) { G.sfx('cash'); this.say(G.LINES[this.S.keeper].shop[4]); if (it.kind !== 'gift') { G.equip(it.id); this.rig = null; } } else { G.sfx('ui_error'); this.say(r.why === 'full' ? 'Your bag holds nine of those. Nine is plenty.' : 'Hmm. That did not work.'); } };
    if (p > st.money * .3) G.confirm('Buy ' + it.name + ' for ' + G.fmtMoney(p) + '?', go); else go();
  },
  previewRig() {
    const st = G.state, f = this.nav.focus, it = f && G.itemById(f), wear = Object.assign({}, G.wearOf(st.me), { acc: G.wearOf(st.me).acc.slice() });
    if (it && this.tryOn && it.kind === 'suit') wear.suit = it.id;
    if (it && this.tryOn && it.kind === 'acc') wear.acc = wear.acc.filter(a => G.ACCS[a].anchor !== it.anchor).concat(it.id);
    const key = JSON.stringify(wear);
    if (!this.rig || this.rigKey !== key) { this.rig = G.makeRig(st.me, wear); this.rigKey = key; }
    return this.rig;
  },
  update(dt) {
    this.t += dt; this.quipT += dt;
    const I = G.game.input, its = this.items(), ev = this.nav.update(its, I, { wheelTabs: false });
    const n = this.stock().length, pages = Math.max(1, Math.ceil(n / 6));
    if (ev.tab) { this.tab = (this.tab + ev.tab + 3) % 3; this.page = 0; this.nav.focus = null; G.sfx('ui_tab'); }
    if (G.wheel) { this.page = (this.page + (G.wheel > 0 ? 1 : -1) + pages) % pages; G.sfx('ui_tab'); }
    if (ev.alt) { this.tryOn = !this.tryOn; G.sfx('ui_tick'); }
    if (ev.back) { G.sfx('door'); G.game.go('location', { loc: this.from, at: this.at }, { fade: 'iris' }); return; }
    // the edge of the grid pages it
    const aim = I.padAim; if (aim) this.turn += aim[0] * dt * 4; else this.turn += dt * .8;
    const dg = I.pan && I.pan(); if (dg) this.turn += dg[0] * .03;
    if (this.focusId !== this.nav.focus) { this.focusId = this.nav.focus; }
    G.Anim.idle(this.previewRig(), dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + this.turn, pose: 'hips' });
    G.Anim.idle(this.keeper, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 - .3 });
    if (this._qs < this.quip.length) { const prev = Math.floor(this._qs); this._qs += dt * 40; for (let i = prev; i < Math.floor(this._qs); i++) if (/[a-z]/i.test(this.quip[i] || '')) G.voice.letter(this.S.keeper, this.quip[i], i, this.quip); }
    const its2 = this.items(); if (I.repeat('right', .35, .12) && this.nav.focus === (its2[2] || its2[its2.length - 1] || {}).id && pages > 1) { this.page = (this.page + 1) % pages; this.nav.focus = null; }
  },
  draw(r) {
    r.overlay(g => {
      const S = this.S, st = G.state, W = r.W, H = r.H;
      shopBg(g, r, S.color, E.mix(S.color, '#fff8e8', .55));
      G.ui.title(g, S.name.toUpperCase(), W / 2, Math.round(H * .03), { scale: 2, colors: ['#ffffff', S.sign, E.shade(S.color, -.2)] });
      G.ui.tabs(g, Math.round(W * .06), Math.round(H * .15), S.tabs, this.tab);
      // the grid
      const its = this.items();
      for (const it of its) {
        const on = this.nav.focus === it.id, I2 = it.it, p = G.priceOf(I2, this.shop), owned = I2.kind !== 'gift' && G.owns(I2.id), wearing = st.wearing.suit === I2.id || st.wearing.acc.includes(I2.id), can = st.money >= p || owned;
        E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#ffffff', '#f0e8d8'] : ['#f8f0e0', '#e0d4bc'], border: on ? '#ffd36a' : '#a89878', alpha: can ? 1 : .6 });
        G.itemIcon(g, I2.id, it.x + it.w / 2 - 6, it.y + 6);
        E.font.text(g, G.fit(I2.name, it.w - 6), it.x + it.w / 2, it.y + 22, can ? '#2a1a10' : '#8a7a68', { align: 'center', outline: false });
        E.font.text(g, owned ? (wearing ? 'WEARING' : 'OWNED') : G.fmtMoney(p), it.x + it.w / 2, it.y + 33, owned ? '#2a8a4a' : can ? '#8a3a2a' : '#b05a4a', { align: 'center', outline: false });
        if (st.deals[this.shop] && st.deals[this.shop].includes(I2.id) && !owned) { px.rect(g, it.x + it.w - 22, it.y + 1, 21, 8, '#ff5f7a'); E.font.text(g, '-25%', it.x + it.w - 11, it.y + 1, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); }
        if ((I2.day || 1) === st.day && st.day > 1) { px.rect(g, it.x + 1, it.y + 1, 16, 8, '#ffd36a'); E.font.text(g, 'NEW', it.x + 9, it.y + 2, '#2a1a10', { align: 'center', outline: false, font: 'tiny' }); }
        if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
      }
      const n = this.stock().length, pages = Math.max(1, Math.ceil(n / 6));
      if (pages > 1) E.font.text(g, 'Page ' + (this.page + 1) + '/' + pages + ' (wheel)', Math.round(W * .06), Math.round(H * .25) + 108, '#5a4a3a', { outline: false });
      // the detail panel and the pedestal
      const f = this.nav.focus && G.itemById(this.nav.focus), dx = Math.round(W * .58), dw = Math.round(W * .36);
      G.ui.panel(g, dx, Math.round(H * .15), dw, Math.round(H * .62), { alpha: .92 });
      const pxx = dx + Math.round(dw * .3), pyy = Math.round(H * .62);
      px.ell(g, pxx, pyy + 2, 22, 6, '#0a2d3d'); px.ell(g, pxx, pyy, 20, 5, S.color); px.ell(g, pxx, pyy - 1, 16, 3, E.shade(S.color, .3));
      this.previewRig().draw(g, pxx, pyy, E.VIEWS.court);
      if (f) {
        const tx = dx + Math.round(dw * .56), p = G.priceOf(f, this.shop), tw = Math.round(dw * .42); let ty = Math.round(H * .17);
        const line = (s, col) => { for (const l of E.font.wrap(s, tw)) { E.font.text(g, l, tx, ty, col, { outline: false }); ty += 9; } ty += 3; };
        line(f.name, '#ffd36a');
        line(f.kind === 'suit' ? G.CUT_NAMES[f.cut] : f.kind === 'acc' ? f.about : G.CAT_NAMES[f.cat], '#9fd3d6');
        if (f.tastes) line('Style: ' + f.tastes.join(', '), '#fff8e8');
        line(G.fmtMoney(p), st.money >= p ? '#ffe08a' : '#ff9a8a');
        if (st.money < p && !(f.kind !== 'gift' && G.owns(f.id))) line('Short ' + G.fmtMoney(p - st.money), '#ff9a8a');
        if (f.kind === 'gift') line('In bag: ' + (st.bag[f.id] || 0), '#9fd3d6');
      }
      // the keeper's quip
      const kx = Math.round(W * .06), ky = Math.round(H * .66);
      G.ui.panel(g, kx, ky, Math.round(W * .48), 34, { alpha: .92 }); G.portrait(g, this.keeper, kx + 4, ky + 4, 26, { frame: false });
      E.font.text(g, G.CAST[S.keeper].name.toUpperCase(), kx + 34, ky + 4, '#ffd36a', { outline: false });
      E.font.text(g, this.quip.slice(0, Math.floor(this._qs || 0)), kx + 34, ky + 14, '#fff8e8', { outline: false, wrap: Math.round(W * .48) - 40 });
      G.ui.panel(g, W - Math.round(W * .06) - 100, Math.round(H * .03), 100, 15, { alpha: .9 }); G.ui.money(g, W - Math.round(W * .06) - 96, Math.round(H * .03) + 4, st.money);
      G.promptBar(g, r, [['confirm', f && f.kind !== 'gift' && G.owns(f.id) ? 'Wear' : 'Buy'], f && f.kind !== 'gift' && ['alt', this.tryOn ? 'Current outfit' : 'Try on'], ['tabL', 'Category'], ['cancel', 'Leave']]);
    });
  }
};
G.scenes.wardrobe = {
  view: 'court', input: G.PRESETS.MENU, camera: false, pausable: true,
  enter(d) { G.useInput('MENU'); this.from = d.from || 'villa'; this.at = d.at; this.page = 0; this.tab = 0; this.nav = new G.Nav(); this.t = 0; G.music('boutique'); G.photoAllowed = false; },
  owner() { const st = G.state; return this.tab === 0 ? st.me : st.partner; },
  list() {
    const st = G.state;
    if (this.tab === 0) return st.wardrobe.suits.map(id => G.SUITS[id]).concat(st.wardrobe.acc.map(id => G.ACCS[id]));
    if (!st.partner) return [];
    const got = (st.npcGot && st.npcGot[st.partner]) || [];
    return [G.SUITS[G.CAST[st.partner].suit]].concat(got.filter(s => G.SUITS[s] && s !== G.CAST[st.partner].suit).map(s => G.SUITS[s]));
  },
  items() { const W = G.game.W, H = G.game.H, all = this.list(), per = 6, list = all.slice(this.page * per, this.page * per + per), cw = Math.round(W * .15), ch = 44, x0 = Math.round(W * .06), y0 = Math.round(H * .25); return list.map((it, i) => ({ id: it.id, x: x0 + (i % 3) * (cw + 6), y: y0 + Math.floor(i / 3) * (ch + 6), w: cw, h: ch, it, onPress: () => this.wear(it) })); },
  wear(it) {
    const st = G.state;
    if (this.tab === 0) { if (it.kind === 'acc' && st.wearing.acc.includes(it.id)) G.unequip(it.id); else G.equip(it.id); }
    else { st.npcWear[st.partner].suit = it.id; G.portraitRigs[st.partner] = null; }
    G.sfx('ui_select'); this.rig = null;
  },
  update(dt) {
    this.t += dt; const I = G.game.input, ev = this.nav.update(this.items(), I);
    if (ev.tab) { this.tab = this.tab ? 0 : 1; this.page = 0; this.nav.focus = null; G.sfx('ui_tab'); this.rig = null; }
    if (ev.alt) { const f = this.nav.focus; if (f && G.ACCS[f] && this.tab === 0) { G.unequip(f); this.rig = null; G.sfx('ui_tick'); } }
    if (G.wheel) { const pages = Math.max(1, Math.ceil(this.list().length / 6)); this.page = (this.page + 1) % pages; }
    if (ev.back) { G.sfx('ui_back'); G.game.go('location', { loc: this.from, at: this.at }); return; }
    const who = this.owner(); if (who) { const key = who + JSON.stringify(G.wearOf(who)); if (!this.rig || this.rigKey !== key) { this.rig = G.makeRig(who, G.wearOf(who)); this.rigKey = key; } G.Anim.idle(this.rig, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + this.t * .8, pose: 'hips' }); }
  },
  draw(r) {
    r.overlay(g => {
      const st = G.state, W = r.W, H = r.H; shopBg(g, r, '#2ec4c9', '#f4ecd8');
      G.ui.title(g, 'WARDROBE', W / 2, Math.round(H * .03), { scale: 2 });
      G.ui.tabs(g, Math.round(W * .06), Math.round(H * .15), ['Yours', st.partner ? G.CAST[st.partner].name + "'s" : 'Partner'], this.tab);
      const its = this.items();
      if (!its.length) E.font.text(g, this.tab ? 'No partner yet. Team up with someone!' : 'Nothing here yet.', Math.round(W * .06), Math.round(H * .3), '#2a1a10', { outline: false });
      for (const it of its) { const on = this.nav.focus === it.id, wearing = this.tab === 0 ? (st.wearing.suit === it.id || st.wearing.acc.includes(it.id)) : st.partner && st.npcWear[st.partner].suit === it.id; E.ui.box(g, it.x, it.y - (on ? 1 : 0), it.w, it.h, { bg: on ? ['#ffffff', '#f0e8d8'] : ['#f8f0e0', '#e0d4bc'], border: on ? '#ffd36a' : '#a89878', alpha: 1 }); G.itemIcon(g, it.id, it.x + it.w / 2 - 6, it.y + 5); E.font.text(g, G.fit(it.it.name, it.w - 6), it.x + it.w / 2, it.y + 21, '#2a1a10', { align: 'center', outline: false }); if (wearing) E.font.text(g, 'WEARING', it.x + it.w / 2, it.y + 31, '#2a8a4a', { align: 'center', outline: false }); if (on) G.ui.focus(g, it.x, it.y, it.w, it.h); }
      const dx = Math.round(W * .62), pyy = Math.round(H * .64);
      G.ui.panel(g, dx - 10, Math.round(H * .15), Math.round(W * .32), Math.round(H * .62), { alpha: .9 });
      px.ell(g, dx + 50, pyy + 2, 22, 6, '#0a2d3d'); px.ell(g, dx + 50, pyy, 20, 5, '#2ec4c9');
      if (this.rig) this.rig.draw(g, dx + 50, pyy, E.VIEWS.court);
      if (this.tab === 1 && st.partner) E.font.text(g, 'She keeps the suits she accepted. Pick what she wears.', dx, Math.round(H * .18), '#fff8e8', { outline: false, wrap: Math.round(W * .3) - 10 });
      G.promptBar(g, r, [['confirm', this.tab === 0 ? 'Wear' : 'Choose'], this.tab === 0 && ['alt', 'Remove accessory'], ['tabL', 'Yours / partner'], ['cancel', 'Back']]);
    });
  }
};
G.scenes.journal = {
  view: 'court', input: G.PRESETS.MENU, camera: false, pausable: true,
  enter(d) { G.useInput('MENU'); this.from = d.from || 'villa'; this.at = d.at; this.tab = 0; this.nav = new G.Nav(); this.fi = 0; G.photoAllowed = false; },
  items() { const W = G.game.W, H = G.game.H; if (this.tab === 2) return [{ id: 'save', x: Math.round(W / 2 - 60), y: Math.round(H * .45), w: 120, h: 20, label: 'Save the vacation', onPress: () => G.saveMenu() }]; if (this.tab === 0) return G.npcs().map((id, i) => ({ id, x: Math.round(W * .07), y: Math.round(H * .24) + i * 22, w: 110, h: 18, label: G.CAST[id].name, align: 'left', onPress: () => {} })); return []; },
  update(dt) {
    const I = G.game.input, ev = this.nav.update(this.items(), I);
    if (ev.tab) { this.tab = (this.tab + ev.tab + 3) % 3; this.nav.focus = null; G.sfx('ui_tab'); }
    if (ev.back) { G.sfx('ui_back'); if (this.from === 'map') G.game.go('map'); else G.game.go('location', { loc: this.from, at: this.at }); }
  },
  draw(r) {
    r.overlay(g => {
      const st = G.state, W = r.W, H = r.H; shopBg(g, r, '#c8a050', '#f8f0dc');
      G.ui.title(g, 'JOURNAL', W / 2, Math.round(H * .03), { scale: 2, colors: ['#ffffff', '#ffd36a', '#c8a050'] });
      G.ui.tabs(g, Math.round(W * .06), Math.round(H * .14), ['Friends', 'Stats', 'Save'], this.tab);
      if (this.tab === 0) {
        const its = this.items(); this.nav.draw(g, its);
        const id = this.nav.focus || its[0].id, x = Math.round(W * .36), y = Math.round(H * .23), w = Math.round(W * .58);
        G.ui.panel(g, x, y, w, Math.round(H * .6));
        G.portrait(g, G.portraitRig(id), x + 8, y + 8, 40, { frame: false });
        const c = G.CAST[id]; E.font.text(g, c.full, x + 54, y + 8, '#ffd36a', { outline: false }); E.font.text(g, '"' + c.epithet + '" · ' + c.from, x + 54, y + 18, '#9fd3d6', { outline: false });
        E.font.text(g, G.stage(G.aff(id)) + (st.partner === id ? ' · your partner' : ''), x + 54, y + 28, '#fff8e8', { outline: false }); G.ui.hearts(g, x + 54, y + 38, G.aff(id));
        E.font.text(g, c.personality, x + 8, y + 54, '#fff8e8', { outline: false, wrap: w - 16 });
        E.font.text(g, 'What you know she thinks:', x + 8, y + 80, '#9fd3d6', { outline: false });
        const known = Object.entries(st.known[id] || {}); if (!known.length) E.font.text(g, 'Nothing yet. Give her something and see.', x + 8, y + 92, '#c8c4d8', { outline: false });
        known.slice(0, 12).forEach(([it, taste], i) => { const xx = x + 8 + (i % 6) * 26, yy = y + 92 + Math.floor(i / 6) * 24; G.itemIcon(g, it, xx, yy); E.font.text(g, taste === 'love' ? '♥' : taste === 'like' ? '+' : taste === 'dislike' ? '-' : '·', xx + 14, yy + 6, taste === 'love' ? '#ff5f7a' : taste === 'dislike' ? '#ff9a8a' : '#9ff3a8', { outline: false }); });
        E.font.text(g, 'Likes ' + c.tastes.join(' and ') + ' styles', x + 8, y + Math.round(H * .6) - 14, '#ffd36a', { outline: false });
      } else if (this.tab === 1) {
        const S = st.stats, cards = [['Matches', S.wins + ' won of ' + S.matches], ['Points', S.points], ['Kills', S.kills], ['Aces', S.aces], ['Blocks', S.blocks], ['Perfect touches', S.perfects], ['Gifts given', S.gifts], ['Pool Hop best', S.poolBest ? S.poolBest.toFixed(1) + ' s' : '—'], ['Casino', (S.casinoNet >= 0 ? '+' : '') + G.fmtChips(S.casinoNet)], ['Postcards', st.album.length], ['Earned', G.fmtMoney(S.earned)], ['Spent', G.fmtMoney(S.spent)]];
        const cw = Math.round(W * .27), x0 = Math.round(W / 2 - cw * 1.5 - 6);
        cards.forEach(([l, v], i) => { const x = x0 + (i % 3) * (cw + 6), y = Math.round(H * .24) + Math.floor(i / 3) * 30; G.ui.panel(g, x, y, cw, 26, { alpha: .92 }); E.font.text(g, l, x + 6, y + 4, '#9fd3d6', { outline: false }); E.font.text(g, String(v), x + 6, y + 14, '#ffd36a', { outline: false }); });
      } else { this.nav.draw(g, this.items()); E.font.text(g, 'Three slots and an autosave. The game autosaves at the start of every slot.', W / 2, Math.round(H * .36), '#2a1a10', { align: 'center', outline: false, wrap: W * .7 }); }
      G.promptBar(g, r, [['tabL', 'Page'], this.tab === 2 && ['confirm', 'Save'], ['cancel', 'Back']]);
    });
  }
};


/* ---- 34-story.js ---- */
/* 34-story: the story. The Invitation and character select; cutscenes (game.script generators over a place: walk-ons,
 * camera moves, emotes, dialogue with portraits and voices); the Welcome Match with Pepper's coaching; the daily events
 * (the casino's opening, a villa visit, the rain shower, the overheard call, Pepper's letter, the semifinal, the Fortuna
 * Cup final against The House); the farewell party; two endings; then the credits and the vacation's results. */
G.newVacationFlow = () => G.game.go('invitation', null, { fade: 'white', seconds: .4 });
G.storyBusy = () => !!(G.cut && G.cut.busy);
/* ---- the invitation: a parchment letter with Sonny's gold seal ---- */
G.scenes.invitation = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.t = 0; G.music('sunrise'); this.shown = 0; },
  update(dt) {
    this.t += dt; const prev = Math.floor(this.shown); this.shown = Math.min(G.INVITATION.length, this.shown + dt * 38);
    for (let i = prev; i < Math.floor(this.shown); i++) if (/[a-z]/i.test(G.INVITATION[i])) G.voice.letter('sonny', G.INVITATION[i], i, G.INVITATION);
    const I = G.game.input;
    if ((I.pressed('confirm') || I.clicked()) && this.t > .5) { if (this.shown < G.INVITATION.length) this.shown = G.INVITATION.length; else { G.sfx('ui_select'); G.game.go('charselect'); } }
    if (I.pressed('cancel') || I.pressed('esc')) { G.sfx('ui_back'); G.game.go('menu'); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#2a1240', '#ff9e5e', y / H));
      const w = Math.min(300, W - 40), h = Math.round(H * .72), x = Math.round((W - w) / 2), y = Math.round(H * .12) + Math.round((1 - clamp(this.t / .6, 0, 1)) * 40);
      E.ui.box(g, x, y, w, h, { bg: ['#f8ecd0', '#e8d4a8'], border: '#a88a62', alpha: 1 });
      for (let i = 0; i < 12; i++) px.dot(g, x + 6 + (i * 37) % (w - 12), y + 6 + (i * 53) % (h - 12), '#d8c498');
      E.font.title(g, 'AHEAD OR ALIVE', W / 2, y + 12, { scale: 2, align: 'center', colors: ['#c8902a', '#8a5a20'], depth: 1 });
      E.font.text(g, 'INVITATIONAL', W / 2, y + 32, '#8a3a2a', { align: 'center', outline: false });
      const lines = E.font.wrap(G.INVITATION, w - 40); let left = Math.floor(this.shown);
      lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; E.font.text(g, s, x + 20, y + 52 + i * 11, '#3a2a1a', { outline: false }); });
      const sx = x + w - 40, sy = y + h - 40; px.disc(g, sx, sy, 15, '#a87a10'); px.disc(g, sx, sy, 13, '#ffd36a'); px.disc(g, sx - 2, sy - 2, 8, '#ffe9a0'); E.font.text(g, 'S', sx, sy - 4, '#8a5a10', { align: 'center', outline: false, scale: 1 });
      if (this.shown >= G.INVITATION.length) { E.font.text(g, 'Who opened it?', W / 2, y + h - 20, '#8a3a2a', { align: 'center', outline: false }); }
      G.promptBar(g, r, [['confirm', this.shown >= G.INVITATION.length ? 'Choose your fighter' : 'Read'], ['cancel', 'Back']]);
    });
  }
};
/* ---- character select: six cards (portrait, epithet, style, stats as bars, tastes) ---- */
G.scenes.charselect = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.nav = new G.Nav({ focus: 'rin' }); this.rigs = {}; for (const id of G.FIGHTERS) this.rigs[id] = G.makeRig(id); this.t = 0; },
  items() { const W = G.game.W, H = G.game.H, cw = Math.round(W * .135), gap = 5, x0 = Math.round(W / 2 - (cw * 6 + gap * 5) / 2), y = Math.round(H * .17); return G.FIGHTERS.map((id, i) => ({ id, x: x0 + i * (cw + gap), y, w: cw, h: Math.round(H * .4), onPress: () => this.pick(id) })); },
  pick(id) {
    const plus = G.unlocks.plusFrom ? G.unlocks.plusFrom : null;
    G.state = G.newState(id, (G.hashStr(id) ^ Math.floor((G.game.real || 1) * 1000)) >>> 0, plus);
    G.unlocks.plusFrom = null;
    G.voice.say(G.pickLine(id, 'bark') || 'Yes!', id, 'happy');
    G.dayStart();
    G.state.slot = 0;
    G.runCutscene('arrival');
  },
  update(dt) { this.t += dt; const ev = this.nav.update(this.items(), G.game.input); if (ev.back) { G.sfx('ui_back'); G.game.go('menu'); } for (const id of G.FIGHTERS) G.Anim.idle(this.rigs[id], dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + (this.nav.focus === id ? Math.sin(this.t * 1.5) * .6 : 0), pose: this.nav.focus === id ? 'hips' : null, expr: this.nav.focus === id ? 'smile' : null }); },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#0f4c5c', '#2a1240', y / H));
      G.ui.title(g, 'WHO OPENED IT?', W / 2, Math.round(H * .04), { scale: 2 });
      const its = this.items();
      for (const it of its) {
        const c = G.CAST[it.id], on = this.nav.focus === it.id;
        E.ui.box(g, it.x, it.y - (on ? 2 : 0), it.w, it.h, { bg: on ? [E.shade(c.color, -.2), E.shade(c.color, -.55)] : ['#174a5a', '#0c2e3a'], border: on ? '#ffd36a' : '#5a8a92', alpha: .96 });
        const py = it.y + it.h - 12; px.ell(g, it.x + it.w / 2, py + 1, 14, 4, '#0a2d3d');
        this.rigs[it.id].draw(g, it.x + it.w / 2, py, E.VIEWS.court);
        E.font.text(g, c.name, it.x + it.w / 2, it.y + 4, '#fff8e8', { align: 'center', outline: false, shadow: '#000' });
        if (on) G.ui.focus(g, it.x, it.y, it.w, it.h);
      }
      const c = G.CAST[this.nav.focus || 'rin'], y = Math.round(H * .6), x = Math.round(W * .12), w = Math.round(W * .76);
      G.ui.panel(g, x, y, w, Math.round(H * .3));
      E.font.text(g, c.full + ',  "' + c.epithet + '"', x + 10, y + 8, '#ffd36a', { outline: false });
      E.font.text(g, c.from + ' · ' + c.style + ' · ' + c.age, x + 10, y + 19, '#9fd3d6', { outline: false });
      E.font.text(g, c.personality, x + 10, y + 31, '#fff8e8', { outline: false, wrap: w * .55 });
      const bx = x + Math.round(w * .62); ['POW', 'TEC', 'SPD', 'JMP'].forEach((k, i) => { E.font.text(g, k, bx, y + 8 + i * 11, '#fff8e8', { outline: false }); G.ui.bar(g, bx + 26, y + 10 + i * 11, 80, 4, c.stats[k] / 10, ['#ff5f7a', '#5ff0ff', '#ffd36a', '#9ff3a8'][i]); });
      E.font.text(g, 'Loves ' + c.tastes.join(' & ') + ' styles', bx, y + 54, '#ff9ac8', { outline: false });
      G.promptBar(g, r, [['move', 'Choose'], ['confirm', 'This is me'], ['cancel', 'Back']]);
    });
  }
};

/* ---- cutscenes ---- */
G.runCutscene = (id, data) => G.game.go('cutscene', Object.assign({ id }, data || {}), { fade: .4 });
G.scenes.cutscene = {
  view: 'threequarter', input: G.PRESETS.EXPLORE, camera: false,
  enter(d) {
    G.useInput('EXPLORE'); const C = G.CUTSCENES[d.id]; this.d = d; this.C = C; this.loc = C.loc; this.L = G.LOCS[C.loc]; this.map = G.getLocMap(C.loc);
    this.actors = {}; this.t = 0; this.tod = C.tod || (G.state ? G.todFor(G.state.slot, G.weatherNow(), G.state.day) : 'afternoon'); G.applyLight(this.tod);
    G.game.follow(null); G.game.cam.bounds = v => this.map.bounds(v); this.camAt = C.cam ? C.cam.slice() : this.L.start.slice(); G.game.focus(this.camAt[0], this.camAt[1], 10); G.game.cam.snap = true; G.game.cam.smooth = .4;
    G.music(C.music || this.L.music); G.ambience(this.tod === 'night' ? 'night' : this.L.amb);
    G.cut = { busy: true }; this.fx = []; this.choice = -1; this.finished = false; this.skipTutorial = false; this.ff = 0; this.fwT = 0; this.flam = null; this.wheel = null;
    if (C.setup) C.setup(this);
    this.job = G.game.script(C.run.call(this, this));
  },
  exit() { G.cut = null; if (G.talk) G.talk.close(); },
  actor(id, x, y, facing = Math.PI / 2, o = {}) { const a = { id, x, y, z: 0, vx: 0, vy: 0, facing, rig: G.makeRig(id, o.wear || (G.state && G.wearOf(id)) || {}), pose: null, clip: o.clip || null, poseW: null, expr: null, down: 0 }; this.actors[id] = a; return a; },
  walk(id, x, y, speed = 60) { const a = this.actors[id], d = Math.hypot(x - a.x, y - a.y), T = Math.max(.05, d / speed); a.vx = (x - a.x) / T; a.vy = (y - a.y) / T; a.facing = Math.atan2(y - a.y, x - a.x); return G.game.tween(a, { x, y }, T, { ease: 'linear', onDone: () => { a.vx = a.vy = 0; } }); },
  cam(x, y, T = .8) { return G.game.tween(this.camAt, { 0: x, 1: y }, T, { ease: 'inOutSine' }); },
  say(who, lines, o) { G.say(who, lines, o); return E.until(() => !G.talk.open); },
  ask(who, line, choices) { this.choice = -1; G.say(who, line, { choices, onChoice: i => { this.choice = i; } }); return E.until(() => !G.talk.open && this.choice >= 0); },
  emote(id, kind) { const a = this.actors[id]; if (a) this.fx.push({ a, kind, t: 0 }); if (kind === 'heart' && a) G.fx.hearts(a.x, a.y, 40, 4); },
  update(dt) {
    this.t += dt; G.tickAmbience(dt);
    if (G.talk) G.talk.update(dt);
    G.game.focus(this.camAt[0], this.camAt[1], 10);
    for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < 1.5);
    for (const k in this.actors) { const a = this.actors[k]; G.Anim.idle(a.rig, dt, { x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, facing: a.facing, pose: a.pose, poseW: a.poseW || undefined, expr: a.expr, down: a.down }, { clip: a.clip, t: this.t + a.x * .01 }); }
    if (this.C.tick) this.C.tick(this, dt);
    const I = G.game.input;
    if (G.talk && G.talk.open && I.down('cancel')) { this.ff = (this.ff || 0) + dt; if (this.ff > .12) { this.ff = 0; I.tap('confirm'); } }   // hold Back to fast-forward
    if ((I.pressed('pause') || I.pressed('start')) && !G.overlay.has('confirm')) { I.consumeAll(); G.confirm('Skip scene?', () => { if (this.job) this.job.cancel(); if (G.talk) G.talk.close(); this.C.done(this, true); }); }
    if (this.job && this.job.done && !this.finished) { this.finished = true; this.C.done(this, false); }
  },
  draw(r) {
    if (this.L.sky) G.drawSky(r, this.tod, r.w(this.camAt[0], 0, 0)[1]);
    this.map.drawFloor(r); this.map.queueWalls(r);
    if (this.loc === 'beach') { G.drawShore(r, G.now()); G.drawCourtProps(r, { tod: this.tod, final: this.C.final }); G.drawNet(r); }
    else G.scenes.location.drawDressing.call({ L: this.L, loc: this.loc, tod: this.tod }, r);
    if (this.loc === 'dock') G.drawShore(r, G.now(), 0, 400, 60);
    for (const k in this.actors) { const a = this.actors[k]; r.shadow(a.x, a.y, 6, .3); r.actor(a.x, a.y, a.z, (g, ox, oy) => a.rig.draw(g, ox, oy, r.view)); }
    for (const f of this.fx) r.queue(f.a.x, f.a.y, 50, g => { const q = r.w(f.a.x, f.a.y, 50 + f.t * 8); G.ui.tag(g, { heart: '♥', '!': '!', '?': '?', note: '♪', dots: '...' }[f.kind] || '!', q[0], q[1], f.kind === 'heart' ? '#ff5f7a' : '#2a1a10', '#fff8e8'); }, { bias: 3 });
    if (this.C.draw) this.C.draw(this, r);
    r.overlay(g => { px.rect(g, 0, 0, r.W, 10, '#000'); px.rect(g, 0, r.H - 6, r.W, 6, '#000'); if (this.C.caption) E.font.text(g, this.C.caption, Math.round(r.W * .05), 1, '#ffd36a', { outline: false }); });
    if (G.talk) G.talk.draw(r);
  }
};
const FIVE_LINES = { rin: 'Hm. A tournament with umbrellas.', lola: '¡Hola! Who is ready to RUMBLE?', ingrid: 'It is very hot. Nobody said it would be hot.', amara: 'Okay, this island is GORGEOUS.', tess: "G'day! I can smell the surf from here.", mei: 'Hehe. I already found three secret passages.' };
G.CUTSCENES = {
  arrival: {
    loc: 'dock', cam: [192, 150], caption: 'DAY 1 · ISLA FORTUNA', tod: 'morning',
    setup(S) {
      const st = G.state, others = G.npcs(st), spots = [[140, 188], [168, 196], [216, 196], [244, 188], [192, 206]];
      others.forEach((id, i) => S.actor(id, spots[i][0], spots[i][1], -Math.PI / 2));
      S.actor(st.me, 300, 100, Math.PI); S.actor('sonny', 192, 120, Math.PI / 2); S.actor('pepper', 222, 122, Math.PI / 2);
    },
    *run(S) {
      const st = G.state, me = st.me;
      yield .6; yield S.walk(me, 192, 168, 55); S.actors[me].facing = -Math.PI / 2;
      for (const id of G.npcs(st)) { S.actors[id].facing = Math.atan2(168 - S.actors[id].y, 192 - S.actors[id].x); yield S.say(id, FIVE_LINES[id]); }
      S.actors.sonny.pose = 'cheer'; S.actors.sonny.expr = 'shout';
      yield S.say('sonny', G.LINES.sonny.welcome);
      S.actors.sonny.pose = null; for (const id of G.npcs(st)) S.emote(id, '?');
      yield S.say('pepper', G.LINES.pepper.arrival.concat(G.LINES.pepper.rules));
      if (st.flags.plus) { yield S.ask('pepper', 'You have done this before. Skip the Welcome Match?', ['Skip it', 'Play it']); if (S.choice === 0) { S.skipTutorial = true; return; } }
      S.actors.sonny.pose = 'cheer'; yield S.say('sonny', ['Allow me to demonstrate! Pepper and I versus a lucky new team! Five percent effort!']);
      S.actors.sonny.pose = null;
      const pick = G.bestFriend(); yield S.say('pepper', [G.CAST[pick].name + ', you are with ' + G.CAST[me].name + '. Try not to embarrass the resort.']);
    },
    done(S, skipped) {
      const st = G.state, pick = G.bestFriend(); if (!st.partner) G.setPartner(pick);
      if (S.skipTutorial || (skipped && st.flags.plus)) { G.earn(10000, 'tutorial'); st.flags.tutorialDone = true; G.endSlot(); G.game.go('map'); return; }
      G.startVacationMatch({ kind: 'tutorial', pair: ['sonny', 'pepper'] });
    }
  },
  tutorialDone: {
    loc: 'beach', cam: [352, 240], caption: 'THE WELCOME MATCH',
    setup(S) { const st = G.state; S.actor('sonny', 400, 230, Math.PI); S.actor('pepper', 430, 250, Math.PI); S.actor(st.me, 300, 240, 0); if (st.partner) S.actor(st.partner, 300, 260, 0); },
    *run(S) {
      const won = S.d.won;
      if (won) { S.actors.sonny.pose = 'cheer'; yield S.say('sonny', ['A DEMONSTRATION OF... GENEROSITY!']); S.actors.sonny.pose = null; S.actors.sonny.down = 1; G.sfx('dive'); yield .8; yield S.say('pepper', ['He fell on his face. It happens most days.']); }
      else yield S.say('sonny', ['FIVE PERCENT EFFORT, CHAMPS! Imagine TEN!']);
      S.actors.sonny.down = 0;
      yield S.say('pepper', [G.TUTORIAL_TIPS.chemistry(), 'Matches pay. Friends help. The Fortuna Cup final is on Day 5. Do not be late.']);
    },
    done(S) { const st = G.state; st.flags.tutorialDone = true; G.endSlot(); G.game.go('map'); }
  },
  party: {
    loc: 'beach', cam: [352, 220], caption: 'DAY 5 · THE FAREWELL PARTY', tod: 'night', music: 'farewell',
    setup(S) { const st = G.state, all = [st.me].concat(G.npcs(st)); all.forEach((id, i) => { const a = S.actor(id, 290 + (i % 3) * 60, 210 + Math.floor(i / 3) * 40, Math.PI / 2); a.clip = ['Dance_Loop', 'Dance Body Roll', 'Dance Reach Hip', 'Dance Charleston'][i % 4]; }); S.actor('sonny', 352, 150, Math.PI / 2).clip = 'Dance_Loop'; S.actor('pepper', 420, 170, Math.PI / 2); S.fwT = 0; },
    tick(S, dt) { S.fwT -= dt; if (S.fwT <= 0) { S.fwT = G.rand('cosmetic', .5, 1.2); G.fx.firework(G.rand('cosmetic', 220, 480), G.rand('cosmetic', 60, 110), G.rand('cosmetic', 70, 110)); } for (const [x, y] of [[200, 160], [500, 160], [220, 320], [480, 320]]) G.game.lights.add(x, y, 20, 110, 1, { color: '#ffb060' }); },
    draw(S, r) { for (const [x, y] of [[200, 160], [500, 160], [220, 320], [480, 320]]) r.prop('torch', x, y, 0, { size: 1.5, light: true }); },
    *run(S) {
      const st = G.state;
      yield S.say('sonny', G.LINES.sonny.party);
      for (const id of G.npcs(st)) { const a = S.actors[id], hi = G.aff(id) >= 60; a.clip = null; a.facing = Math.atan2(S.actors[st.me].y - a.y, S.actors[st.me].x - a.x); a.expr = 'smile'; yield S.say(id, G.LINES[id][hi ? 'farewellHigh' : 'farewellLow']); if (hi) S.emote(id, 'heart'); a.clip = 'Dance_Loop'; }
      yield S.say('pepper', ['Group photo. Everyone smile. That is not optional.']);
      for (const k in S.actors) { const a = S.actors[k]; a.clip = null; a.pose = 'cheer'; a.facing = Math.PI / 2; a.expr = 'smile'; }
      yield .5; G.sfx('shutter'); G.game.flash('#ffffff', .2); if (G.photo) G.photo.autoGroup(S); yield 1.2;
    },
    done(S) { const st = G.state; G.runCutscene(st.flags.finalWon ? 'endingA' : 'endingB'); }
  },
  endingA: {
    loc: 'beach', cam: [352, 200], caption: 'ENDING · THE HOUSE FOLDS', tod: 'night', music: 'farewell',
    setup(S) { const st = G.state; S.actor('sonny', 352, 180, Math.PI / 2); S.actor('pepper', 392, 190, Math.PI); S.actor(st.me, 330, 230, -Math.PI / 2); if (st.partner) S.actor(st.partner, 370, 236, -Math.PI / 2); S.flam = { x: 352, y: 90 }; },
    draw(S, r) { r.shape('flamingo', S.flam.x, S.flam.y, 1 + Math.sin(G.now() * 2)); },
    *run(S) {
      yield S.say('sonny', ['A DEAL IS A DEAL. The island is... yours. Somehow. Paperwork is HARD.']);
      S.actors.pepper.facing = Math.PI / 2;
      yield S.say('pepper', ['About that. Mr. Fortuna owes me eleven years of wages, four boats and a llama.', 'I own the island. I have owned it since Tuesday.']);
      S.emote('sonny', '!'); S.actors.sonny.expr = 'shout';
      yield S.say('sonny', G.LINES.sonny.endingA);
      yield S.walk('sonny', 352, 100, 70); S.actors.sonny.down = .3; yield G.game.tween(S.flam, { y: -40 }, 2.4); yield G.game.tween(S.actors.sonny, { y: -40 }, .01);
      yield S.say('pepper', G.LINES.pepper.endingA);
      yield S.say(G.state.me, [G.LINES[G.state.me].ending[0]]);
    },
    done() { G.game.go('credits'); }
  },
  endingB: {
    loc: 'beach', cam: [352, 200], caption: 'ENDING · THE HOUSE ALWAYS WINS', tod: 'night', music: 'farewell',
    setup(S) { const st = G.state; S.actor('sonny', 352, 180, Math.PI / 2); S.actor('pepper', 392, 190, Math.PI); S.actor(st.me, 330, 230, -Math.PI / 2); if (st.partner) S.actor(st.partner, 370, 236, -Math.PI / 2); S.wheel = { a: 0, spin: 0 }; S.flam = { x: 352, y: 90 }; },
    tick(S, dt) { S.wheel.a += S.wheel.spin * dt; S.wheel.spin *= Math.pow(.6, dt); },
    draw(S, r) {
      r.shape('flamingo', S.flam.x, S.flam.y, 1 + Math.sin(G.now() * 2));
      r.queue(300, 150, 40, g => { const q = r.w(300, 150, 46), R = 16; for (let i = 0; i < 18; i++) { const a0 = S.wheel.a + i / 18 * TAU, a1 = a0 + TAU / 18; px.poly(g, [[q[0], q[1]], [q[0] + Math.cos(a0) * R, q[1] + Math.sin(a0) * R], [q[0] + Math.cos(a1) * R, q[1] + Math.sin(a1) * R]], i % 2 ? '#e8283a' : '#141018'); } px.disc(g, q[0], q[1], 3, '#ffd36a'); px.poly(g, [[q[0] - 3, q[1] - R - 5], [q[0] + 3, q[1] - R - 5], [q[0], q[1] - R + 1]], '#ffffff'); });
    },
    *run(S) {
      S.actors.sonny.pose = 'cheer'; yield S.say('sonny', ['HA! The House wins! As ALWAYS!', ...G.LINES.sonny.endingB, 'Red or black, Pepper? For the ISLAND!']);
      S.actors.sonny.pose = null; yield S.say('pepper', ['Red.']);
      S.wheel.spin = 14; G.sfx('wheel_spin'); yield 2.4; S.wheel.spin = 0; G.sfx('ball_rattle'); yield .5;
      yield S.say('sonny', ['It is... RED. Of COURSE it is red.']);
      yield S.walk('sonny', 352, 100, 70); S.actors.sonny.down = .3; yield G.game.tween(S.flam, { y: -40 }, 2.4); yield G.game.tween(S.actors.sonny, { y: -40 }, .01);
      yield S.say('sonny', G.LINES.sonny.endingA);
      yield S.say('pepper', G.LINES.pepper.endingB);
      yield S.say(G.state.me, [G.LINES[G.state.me].ending[0]]);
    },
    done() { G.game.go('credits'); }
  }
};

/* ---- vacation matches: the Match Board's, the tutorial, the semifinal and the final ---- */
G.specialMatch = () => {
  const st = G.state; if (!st) return null;
  if (st.day === 4 && st.slot === 1 && !st.flags.semiDone && st.teams.length) {
    const best = st.teams.slice().sort((a, b) => { const ra = st.record[G.teamKey(...a)] || [0, 0], rb = st.record[G.teamKey(...b)] || [0, 0]; return (rb[0] - rb[1]) - (ra[0] - ra[1]); })[0];
    return { kind: 'semi', pair: best, rec: st.record[G.teamKey(...best)], label: 'SEMIFINAL: ' + best.map(G.castName).join(' & '), tag: 'SEMIFINAL', special: true };
  }
  if (st.day === 5 && st.slot === 1 && !st.flags.finalDone) return { kind: 'final', pair: ['sonny', 'pepper'], label: 'THE HOUSE: Sonny & Pepper', tag: 'FINAL', special: true, stars: 5 };
  return null;
};
G.matchSkill = e => { const st = G.state; return e.kind === 'semi' ? G.DAY_SKILL.semi : e.kind === 'final' ? G.DAY_SKILL.final : G.DAY_SKILL[st ? st.day : 1] || .5; };
G.startVacationMatch = (e) => {
  const st = G.state, kind = e.kind || 'normal', partner = st.partner;
  if (!partner) return;
  const base = kind === 'tutorial' ? null : G.matchSkill(e), w = G.weatherNow(), tod = kind === 'final' ? 'sunset' : G.todFor(st.slot, w, st.day);
  const opp = e.pair.map((id, i) => {
    if (kind === 'tutorial') return { cast: id, skill: id === 'sonny' ? .08 : .18 };   // five percent effort
    if (kind === 'final') return { cast: id, kit: 'final', skill: id === 'sonny' ? .7 : .85 };
    const wr = G.wearOf(id) || {}; return { cast: id, suit: wr.suit, acc: wr.acc, skill: base + (i ? .02 : 0) };
  });
  const me = G.wearOf(st.me), pw = G.wearOf(partner);
  const cfg = {
    mode: kind === 'tutorial' ? 'tutorial' : 'vacation', kind, final: kind === 'final', tutorial: kind === 'tutorial',
    pointsToWin: kind === 'tutorial' ? 5 : kind === 'final' ? 11 : G.T.pointsToWin, tod, weather: w === 'rain' ? 'rain' : 'sunny', seed: G.hashStr(st.seed + ':' + st.day + ':' + st.slot + ':' + st.stats.matches),
    firstServe: kind === 'final' ? (st.flags.seeded ? 0 : 1) : 0, music: kind === 'final' ? 'house' : 'spike',
    title: kind === 'tutorial' ? 'WELCOME MATCH' : kind === 'semi' ? 'SEMIFINAL' : kind === 'final' ? 'THE FORTUNA CUP' : 'BEACH MATCH',
    specials: kind === 'final' ? { glare: true, houseEdge: true, luckySeven: true } : {},
    teams: [[{ cast: st.me, suit: me.suit, acc: me.acc, ctl: { kind: 'human', input: G.game.input } }, { cast: partner, suit: pw.suit, acc: pw.acc, skill: (base || .45) + .05, affinity: G.aff(partner), partnerOfHuman: true }], opp],
    teamNames: ['You & ' + G.CAST[partner].name, kind === 'final' ? 'The House' : e.pair.map(G.castName).join(' & ')],
    introLine: kind === 'final' ? G.pickLine('sonny', 'finalIntro') : kind === 'tutorial' ? 'Five percent effort, SUNSHINE! Watch and LEARN!' : null,
    clock: (g, r) => { const sf = G.safe(r); G.clockBadge(g, r.W - sf.x, sf.y, st.day, st.slot, w, { right: true }); },
    onResults: (M, res) => {
      const pay = G.matchPayout(res, { kind, opponents: e.pair.filter(id => G.FIGHTERS.includes(id)), pair: kind === 'normal' ? e.pair : null });
      const rows = [['Continue', () => G.afterVacationMatch(kind, res)]];
      if (!G.hub) rows.push(['Take a Postcard', () => G.photo && G.photo.open('match')]);
      return G.resultsUI(M, res, { prize: pay.prize, partner: pay.partner, affBefore: pay.before, affAfter: pay.after, buttons: rows });
    }
  };
  if (kind === 'semi') st.flags.semiDone = true;
  if (kind === 'final') st.flags.finalDone = true;
  G.startMatch(cfg);
};
G.afterVacationMatch = (kind, res) => {
  const st = G.state, won = !!res.humanWon;
  if (kind === 'tutorial') { G.runCutscene('tutorialDone', { won }); return; }
  if (kind === 'semi') { st.flags.seeded = won; if (won) G.toast('Seeded for the Final', 'You serve first on Day 5', 'star'); }
  if (kind === 'final') { st.flags.finalWon = won; if (won && !st.wardrobe.suits.includes('fortunagold')) { st.wardrobe.suits.push('fortunagold'); G.toast('Fortuna Gold', 'A swimsuit fit for a champion', 'star'); } G.endSlot(); G.runCutscene('party'); return; }
  const r = G.endSlot(); G.game.go(r === 'dayEnd' ? 'dayend' : 'map');
};

/* ---- the daily events ---- */
G.storyOverrides = () => {
  const st = G.state;
  if (st.day === 5 && st.slot === 1) for (const id of G.npcs(st)) if (st.where[id] !== 'withyou') st.where[id] = 'beach';
  if (st.day === 1 && st.slot === 2) { /* the casino opens tonight: the schedule already sends some there */ }
};
G.storyOnMap = (S) => {
  const st = G.state; if (!st) return;
  const key = 'pa' + st.day + st.slot;
  if (!st.flags[key]) {
    st.flags[key] = true;
    if (st.slot === 0) { G.sting('daystart'); G.toast('Day ' + st.day + ' · ' + (st.weather[st.day - 1] === 'golden' ? 'Golden skies' : G.upper(G.weatherNow()).slice(0, 1) + G.weatherNow().slice(1)), G.pickLine('sonny', 'dayStart'), 'sunny'); if (st.mail.length) G.toast('You have mail', 'Check the mailbox at your villa', 'letter'); }
    if (st.day === 3 && st.slot === 1) G.say('sonny', G.LINES.sonny.rainPA, { modal: false, auto: 3 });
    else if (st.slot === 1 && st.day === 4) G.say('pepper', ['The Semifinal is on the Match Board this afternoon. Win it and you serve first in the Final.'], { modal: false, auto: 3.5 });
    else if (st.slot < 2 && G.chance('cosmetic', .4)) G.say('sonny', G.pickLine('sonny', 'pa'), { modal: false, auto: 3 });
  }
  if (st.day === 5 && st.slot === 1 && !st.flags.finalDone && !S.finalAsked) {
    S.finalAsked = true;
    G.say('pepper', ['The Fortuna Cup Final. Sunset Courts. Now.', 'Mr. Fortuna has bet the island on it. No pressure.'], { onDone: () => { if (!st.partner) G.setPartner(G.bestFriend()); G.startVacationMatch(G.specialMatch()); } });
  }
  if (st.day === 5 && st.slot === 2 && !st.flags.partyDone) { st.flags.partyDone = true; G.runCutscene('party'); }
};
G.storyBeforeTravel = id => false;
G.storyOnEnter = (loc, S) => {
  const st = G.state;
  if (loc === 'casino') {
    st.flags.visitedCasino = true;
    if (!st.flags.casinoOpened) { st.flags.casinoOpened = true; st.chips += 20; G.say('sonny', G.LINES.sonny.casinoHello.concat(['Here are twenty FREE chips! Lose them wisely!']), { onDone: () => G.toast('+20 chips', 'A welcome gift from Sonny', 'chip') }); }
    if (st.day === 3 && !st.flags.overheard) {
      st.flags.overheard = true;
      G.say('sonny', G.LINES.sonny.phone, { onDone: () => G.say('pepper', G.LINES.pepper.seen, { onDone: () => G.say('pepper', 'Well? What will you do with that?', { choices: ['"Your secret\'s safe."', '"Everyone\'s going to hear about this."'], onChoice: i => { st.flags.kind = i === 0; G.say('pepper', i === 0 ? G.LINES.pepper.kind : G.LINES.pepper.cheeky); } }) }) });
    }
  }
  if (loc === 'villa' && st.mail.length) G.toast('You have mail', 'The mailbox is by the balcony', 'letter');
};
G.storyNPCs = S => {
  const st = G.state;
  if (S.loc === 'casino' && st.day === 3 && !st.flags.overheardSeen) { st.flags.overheardSeen = true; }
  if (S.loc === 'casino') { S.npcs.push(Object.assign(S.mkNpc('sonny', { x: 420, y: 64, kind: 'stand' }), { staff: true, facing: Math.PI / 2 })); }
};
G.storyOnRest = () => false;
G.storyOnSleep = () => {
  const st = G.state, sc = G.game.scene;
  // Day 2 night: a friend knocks with a snack
  if (st.day === 2 && st.slot === 2 && !st.flags.visit) {
    const who = G.npcs(st).filter(id => st.affinity[id] >= 50).sort((a, b) => st.affinity[b] - st.affinity[a])[0];
    if (who) {
      st.flags.visit = who; const L = G.LINES[who].visit;
      if (sc && sc.npcs) sc.npcs.push(sc.mkNpc(who, { x: 160, y: 130, kind: 'stand' }));
      G.sfx('door');
      G.say(who, [L[0]], { onDone: () => G.say(who, L[1], { choices: [L[2], L[3]], onChoice: i => { const good = who === 'ingrid' ? 1 : 0; G.addAff(who, i === good ? 4 : -4, 'visit'); G.say(who, i === good ? G.pickLine(who, 'chatHigh') : G.pickLine(who, 'chatMid'), { onDone: () => G.game.go('dayend', null, { fade: 'dissolve', seconds: .6 }) }); } }) });
      return true;
    }
  }
  return false;
};
G.onLetter = k => {
  const st = G.state;
  if (k === 'warning' && st.flags.kind && st.flags.visitedCasino && !st.wardrobe.suits.includes('pinstripe')) { st.wardrobe.suits.push('pinstripe'); G.toast("Pepper's Pinstripe", 'Enclosed with the letter: a swimsuit', 'hanger'); }
};
/* the Day 3 night: if you skipped the casino, a rumor arrives on Day 4 */
G.bus.on('dayEnd', s => { const st = G.state; if (st && s.day === 3 && !st.flags.overheard) { st.flags.missedD3Casino = true; } });


/* ---- 40-poolhop.js ---- */
/* 40-poolhop: Pool Hop. Cross the lagoon on 32 floating pads before the time runs out. Each pad shows one of the four
 * face buttons for your device; press it as the hopper lands, on the beat of 'lagoon' (judged on the music clock:
 * PERFECT within 60 ms, GOOD within 130 ms, times the windows slider). A miss, a wrong button or an early press: she
 * slips, splashes, swims back and goes again from the same pad on the next bar. Eight PERFECTs in a row add a second.
 * From pad 12 the pads wobble (the button flips, and settles a beat before you need it); from pad 22, double pads. */
G.POOL = { N: 32, WOBBLE: 12, DOUBLE: 22 };
const HOPS = ['hopA', 'hopB', 'hopX', 'hopY'];
G.makePoolHopCourse = seed => {
  const r = E.rng(seed), pads = [];
  for (let i = 0; i <= G.POOL.N; i++) {
    const x = 80 + i * 30, y = 120 + Math.sin(i * .55) * 34 + (r() - .5) * 10;
    const a = Math.floor(r() * 4); let b = null, alt = null;
    if (i >= G.POOL.DOUBLE && i < G.POOL.N) { b = (a + 1 + Math.floor(r() * 3)) % 4; }
    else if (i >= G.POOL.WOBBLE && i < G.POOL.N) alt = (a + 1 + Math.floor(r() * 3)) % 4;
    pads.push({ x, y, a: i === 0 ? null : a, b: i === 0 ? null : b, alt, col: ['#ffd04a', '#ff5f7a', '#2ec4c9', '#7cff5a'][i % 4] });
  }
  return pads;
};
G.poolMap = () => G._poolMap || (G._poolMap = new E.TileMap({ rows: Array.from({ length: 16 }, (_, cy) => Array.from({ length: 72 }, (_, cx) => cy < 2 || cy > 13 ? 'g' : cx < 4 || cx > 67 ? 'd' : 'w').join('')),
  legend: { w: { floor: 'pool', block: true }, d: { floor: 'tile' }, g: { floor: 'grass' } }, floorTex: (x, y, tag) => tag === 'pool' ? G.FLOOR_TEX.pool(x, y) : tag === 'grass' ? G.FLOOR_TEX.grass(x, y) : G.FLOOR_TEX.tile(x, y), outside: '#3a8a4a', ao: 0 }));
G.scenes.poolhop = {
  pausable: true, view: 'court', input: G.PRESETS.POOLHOP, camera: false,
  enter(d) {
    G.useInput('POOLHOP'); this.from = (d && d.from) || 'pool'; this.bot = !!(d && d.bot) || G.attract; this.map = G.poolMap();
    this.pads = G.makePoolHopCourse((d && d.seed) || 7); this.i = 0; this.left = G.T.poolTime; this.perf = 0; this.good = 0; this.falls = 0; this.chain = 0; this.state = 'count'; this.t = 0; this.fallT = 0; this.resume = null;
    this.rig = G.makeRig(G.state && !this.bot ? G.state.me : 'mei', G.state && !this.bot ? G.wearOf(G.state.me) : {}); this.pos = { x: this.pads[0].x, y: this.pads[0].y, z: 0 };
    this.watchers = (G.state && !this.bot ? G.presentAt('pool') : ['tess', 'amara']).slice(0, 3).map((id, k) => ({ id, rig: G.makeRig(id, (G.state && G.wearOf(id)) || {}), x: 80 + k * 26, y: 236 }));
    this.bpm = G.T.poolBpm; this.spb = 60 / this.bpm; this.clock0 = null; this.pressed = {}; this.judge = null; this.result = null; this.nav = new G.Nav();
    G.music('lagoon', { restart: true, sync: true }); if (G.game.audio.tempo) G.game.audio.tempo(this.bpm);
    G.applyLight(G.state ? G.todFor(G.state.slot, G.weatherNow(), G.state.day) : 'afternoon'); G.ambience('pool'); G.game.setZoom(1.15);
    this.firstBeat = 4;   // the count-in: three beats, then HOP
    this.own = 0; this.b0 = null; this.base = this.firstBeat; this.baseI = 1; this.botDone = false; this.bonus = 0; this.cheerT = 0; this.judge = null;
  },
  exit() { G.game.setZoom(1); if (G.game.audio.tempo && G.SONGS.lagoon) G.game.audio.tempo(G.SONGS.lagoon.bpm); },
  beat() {   // beats since Pool Hop began, on the music clock (the song is restarted on entry; its start is taken as beat 0)
    const P = G.game.audio.pos, raw = P && P.playing && P.t > 0 ? P.t * this.bpm / 60 : null;
    if (raw !== null) { if (this.b0 === null) this.b0 = raw - this.own * this.bpm / 60; return raw - this.b0; }
    return this.own * this.bpm / 60;
  },
  padButtons(i, beatNow) {
    const p = this.pads[i]; if (!p || p.a === null) return [];
    if (p.b !== null) return [p.a, p.b];
    if (p.alt !== null) { const due = this.dueBeat(i), settle = due - 1; if (beatNow < settle) return [Math.floor(beatNow * 2) % 2 ? p.alt : p.a]; }
    return [p.a];
  },
  dueBeat(i) { return this.base + (i - this.baseI); },
  update(dt) {
    this.t += dt; this.own += dt; const I = G.game.input, b = this.beat(), win = { p: .06 * G.T.poolWindowMul, g: .13 * G.T.poolWindowMul };
    for (const w of this.watchers) G.Anim.idle(w.rig, dt, { x: w.x, y: w.y, z: 0, facing: -Math.PI / 2, pose: this.cheerT > 0 ? 'cheer' : null, expr: 'smile' });
    this.cheerT = Math.max(0, (this.cheerT || 0) - dt);
    if (this.state === 'results') { this.nav.update(this.resultItems(), I); G.Anim.idle(this.rig, dt, { x: this.pos.x, y: this.pos.y, z: 0, facing: Math.PI / 2, pose: this.result.cleared ? 'cheer' : 'kneel' }); return; }
    if (this.state === 'count') {
      if (b >= this.firstBeat - .5) { this.state = 'hop'; this.base = this.firstBeat; this.baseI = 1; }
      this.animate(dt, b); return;
    }
    this.left -= dt;
    if (this.state === 'fall') { this.fallT += dt; if (this.fallT > 1.8 && b >= this.resume - .5) { this.state = 'hop'; this.base = this.resume; this.baseI = this.i + 1; } this.animate(dt, b); if (this.left <= 0) this.finish(false); return; }
    // the hop: the next pad's button(s) are due on its beat
    const next = this.i + 1, due = this.dueBeat(next), errB = b - due, err = errB * this.spb, want = this.padButtons(next, due);
    const press = HOPS.findIndex(a => I.pressed(a)), presses = HOPS.map((a, k) => I.pressed(a) ? k : -1).filter(k => k >= 0);
    // the attract's demo bot, or the dev autopilot (whose results count)
    if (this.bot || this.auto || G.devFlags.poolBot) { if (err >= -.004 && !this.botDone) { this.botDone = true; for (const k of want) this.pressed[k] = err; this.judgeHop(next, want, err, win); } }
    else if (presses.length) {
      for (const k of presses) if (!(k in this.pressed)) this.pressed[k] = err;
      const allIn = want.every(k => k in this.pressed), wrong = presses.some(k => !want.includes(k));
      if (wrong || Math.abs(err) > win.g + .02 && err < 0) this.slip(wrong ? 'WRONG' : 'EARLY');
      else if (allIn) this.judgeHop(next, want, Math.max(...want.map(k => Math.abs(this.pressed[k]))), win);
    }
    if (this.state === 'hop' && err > win.g) this.slip('LATE');
    this.animate(dt, b);
    if (this.left <= 0) this.finish(false);
    void press;
  },
  judgeHop(next, want, err, win) {
    const q = Math.abs(err) <= win.p ? 'PERFECT' : 'GOOD';
    this.i = next; this.pressed = {}; this.botDone = false; this.judge = { q, t: 0 };
    if (q === 'PERFECT') { this.perf++; this.chain++; if (this.chain % 8 === 0) { this.left += 1; this.bonus = 1.2; } } else { this.good++; this.chain = 0; }
    G.sfx('hopLand'); G.fx.splash(this.pads[next].x, this.pads[next].y, 0, 4); this.rig.land(.4);
    if (this.i >= G.POOL.N) this.finish(true);
  },
  slip(why) {
    this.state = 'fall'; this.fallT = 0; this.falls++; this.chain = 0; this.pressed = {}; this.judge = { q: why, t: 0 };
    const b = this.beat(); this.resume = Math.ceil((b + 1.8 / this.spb) / 4) * 4;
    G.sfx('splash'); const p = this.pads[this.i + 1] || this.pads[this.i]; G.fx.splash((this.pos.x + p.x) / 2, (this.pos.y + p.y) / 2, 0, 16);
  },
  finish(cleared) {
    if (this.state === 'results') return;
    const timeUsed = G.T.poolTime - Math.max(0, this.left), left = Math.max(0, this.left), prize = cleared ? Math.round((2000 + 400 * this.perf + 150 * left) * G.T.prizeMul) : 0;
    this.state = 'results'; this.result = { cleared, time: timeUsed, perf: this.perf, falls: this.falls, prize, best: false };
    G.music(null); G.sting(cleared ? 'win' : 'lose'); this.cheerT = cleared ? 3 : 0;
    const st = G.state;
    if (st && !this.bot) {
      if (cleared) { G.earn(prize, 'poolhop'); if (!st.stats.poolBest || timeUsed < st.stats.poolBest) { st.stats.poolBest = +timeUsed.toFixed(2); this.result.best = true; } if (st.partner && G.presentAt('pool').includes(st.partner)) G.addAff(st.partner, 2, 'poolhop'); }
    }
    G.bus.emit('poolhop', this.result);
  },
  resultItems() { const W = G.game.W, H = G.game.H; return [{ id: 'ok', x: Math.round(W / 2 - 50), y: Math.round(H * .78), w: 100, h: 18, label: 'Continue', primary: true, onPress: () => this.leave() }]; },
  leave() { if (this.bot || !G.state) { G.game.go('title'); return; } const r = G.endSlot(); G.game.go(r === 'dayEnd' ? 'dayend' : 'map'); },
  animate(dt, b) {
    // between pads the hopper arcs over the half beat before each landing
    const s = this.pos;
    if (this.state === 'fall') { const p = this.pads[this.i], k = clamp((this.fallT - .4) / 1.2, 0, 1); s.z = this.fallT < .4 ? -this.fallT * 30 : -12 + k * 12; s.x = lerp(s.x, p.x, k * .2); s.y = lerp(s.y, p.y, k * .2); G.Anim.idle(this.rig, dt, { x: s.x, y: s.y, z: s.z, facing: 0, hurt: this.fallT < .5, down: this.fallT < .6 ? .7 : 0 }, { clip: this.fallT > .5 && this.fallT < 1.5 ? 'Swim_Fwd_Loop' : null, t: this.fallT }); return; }
    const next = this.i + 1, due = this.state === 'count' ? this.firstBeat : this.dueBeat(next), u = clamp(1 - (due - b) / .5, 0, 1), A = this.pads[this.i], B = this.pads[Math.min(next, this.pads.length - 1)];
    if (u > 0 && this.i < G.POOL.N) { s.x = lerp(A.x, B.x, u); s.y = lerp(A.y, B.y, u); s.z = Math.sin(u * Math.PI) * 16; } else { s.x = A.x; s.y = A.y; s.z = 0; }
    G.Anim.idle(this.rig, dt, { x: s.x, y: s.y, z: s.z, facing: Math.atan2(B.y - A.y, B.x - A.x), air: s.z > 3, poseW: { vready: u > 0 ? 0 : .6 } });
    if (this.judge) this.judge.t += dt; if (this.bonus) this.bonus -= dt;
  },
  draw(r) {
    G.game.focus(this.pos.x + 30, this.pos.y, 10);
    const b = this.beat(), I = G.game.input;
    G.drawSky(r, G.curTod || 'afternoon', r.w(this.pos.x, 0, 0)[1]);
    this.map.drawFloor(r);
    for (let x = 30; x < 72 * 16; x += 70) { r.prop('palm', x, 14, 0, { size: 1.5 }); r.prop('palm', x + 35, 236, 0, { size: 1.4 }); }
    r.shape('cabana', 30, 120, 0, { scale: .8 }); r.shape('flamingo', 600, 196, 1);
    this.pads.forEach((p, i) => {
      if (i < this.i - 2 || i > this.i + 14) return;
      const bob = Math.sin((b + i * .25) * Math.PI) * .8, gone = i <= this.i && i !== this.i;
      r.shape('poolfloat', p.x, p.y, 1 + bob, { params: { color: i === G.POOL.N ? '#ffd36a' : p.col }, shadow: false, alpha: gone ? .5 : 1 });
      const want = this.padButtons(i, b);
      if (want.length && i > this.i) r.queue(p.x, p.y, 8, g => { const q = r.w(p.x, p.y, 10 + bob); let x = Math.round(q[0] - (want.length * 11 - 2) / 2); for (const k of want) { G.glyph(g, x, Math.round(q[1] - 10), HOPS[k], I); x += 11; } }, { bias: 4, emissive: true });
    });
    for (const w of this.watchers) r.actor(w.x, w.y, 0, (g, ox, oy) => w.rig.draw(g, ox, oy, r.view));
    if (this.pos.z > -6) r.shadow(this.pos.x, this.pos.y, 5, .3);
    r.actor(this.pos.x, this.pos.y, this.pos.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view));
    r.overlay(g => {
      const sf = G.safe(r);
      G.ui.panel(g, sf.x, sf.y, 120, 28, { alpha: .9 }); E.font.text(g, 'POOL HOP', sf.x + 6, sf.y + 4, '#ffd36a', { outline: false }); E.font.text(g, 'Pad ' + this.i + '/' + G.POOL.N + '   ' + Math.max(0, this.left).toFixed(1) + ' s', sf.x + 6, sf.y + 15, '#fff8e8', { outline: false });
      E.font.text(g, 'Perfect ' + this.perf + '  Falls ' + this.falls + (this.chain >= 2 ? '  Chain ' + this.chain : ''), sf.x + 128, sf.y + 4, '#9fd3d6', { shadow: '#000', outline: false });
      if (this.bonus > 0) E.font.text(g, '+1 s!', sf.x + 60, sf.y + 30, '#9ff3a8', { scale: 2, shadow: '#000', outline: false });
      // the beat pips
      const ph = b - Math.floor(b); for (let k = 0; k < 4; k++) px.disc(g, Math.round(r.W / 2 - 18 + k * 12), sf.y + 8, Math.floor(b) % 4 === k ? 4 - ph * 2 : 2, Math.floor(b) % 4 === k ? '#ffd36a' : '#5a8a92');
      if (this.state === 'count') { const n = Math.ceil(this.firstBeat - b); E.font.title(g, n > 0 && n <= 3 ? String(n) : 'HOP!', r.W / 2, Math.round(r.H * .3), { scale: 4, align: 'center' }); }
      if (this.judge && this.judge.t < .6) E.font.text(g, this.judge.q, r.W / 2, Math.round(r.H * .22), this.judge.q === 'PERFECT' ? '#ffd36a' : this.judge.q === 'GOOD' ? '#5ff0ff' : '#ff9a8a', { align: 'center', scale: 2, shadow: '#000', outline: false });
      if (this.i >= G.POOL.WOBBLE && this.i < G.POOL.WOBBLE + 2 && this.state === 'hop') E.font.text(g, 'Wobble pads! The button settles a beat before you land.', r.W / 2, Math.round(r.H * .86), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      if (this.i >= G.POOL.DOUBLE && this.i < G.POOL.DOUBLE + 2 && this.state === 'hop') E.font.text(g, 'Double pads! Press both together.', r.W / 2, Math.round(r.H * .86), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      if (this.state === 'results') {
        const R = this.result, w = 220, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H * .25);
        G.ui.panel(g, x, y, w, 110, { title: R.cleared ? 'CLEARED!' : "TIME'S UP" });
        E.font.text(g, 'Time ' + R.time.toFixed(1) + ' s' + (R.best ? '  NEW BEST!' : ''), x + 12, y + 12, '#fff8e8', { outline: false });
        E.font.text(g, 'Perfect hops ' + R.perf + '   Falls ' + R.falls, x + 12, y + 26, '#9fd3d6', { outline: false });
        if (R.cleared) G.ui.money(g, x + 12, y + 42, R.prize);
        this.nav.draw(g, this.resultItems());
      } else G.promptBar(g, r, [['hopA', ''], ['hopB', ''], ['hopX', ''], ['hopY', 'Hop on the beat']]);
      if (this.bot) E.font.text(g, 'DEMO', sf.x, r.H - sf.y - 10, '#ff5f7a', { outline: false });
    });
  }
};


/* ---- 41-casino.js ---- */
/* 41-casino: Casino Fortuna's stations, over the night theme. The cashier (chips at S$100, buy in 10s, 50s or 100s, cash
 * out any time), the prize counter (300 chips for the Jackpot suit), Fortuna Sevens (a 3-reel pachislot, bet 1-3 lines,
 * stop each reel yourself; a stop slips 0-4 symbols), blackjack (6 decks, Pepper deals, S17 or H17, 3:2, double, split
 * once) and single-zero roulette (Kai spins; straight, colors, odd/even, halves, dozens, columns). All on the 'casino'
 * random stream; the dev tools can force results. */
const SYM = ['7', 'BAR', 'S', 'V', 'P', 'C', 'R', 'X'];   // seven, bar, Sonny (wild), volleyball, palm, coconut, cherry, blank
G.Slots = {
  strips: [   // per reel: 7 ×1, BAR ×1, Sonny ×1, ball ×3, palm ×2, coconut ×5, cherry ×2, blank ×6: an RTP of 92.0% a line
    ['C', 'X', 'R', 'V', 'X', 'C', '7', 'P', 'X', 'C', 'V', 'BAR', 'X', 'C', 'S', 'R', 'V', 'X', 'P', 'C', 'X'],
    ['X', 'C', 'V', 'R', 'X', 'P', 'C', 'X', 'BAR', 'V', 'C', 'X', '7', 'R', 'C', 'X', 'S', 'V', 'P', 'C', 'X'],
    ['V', 'X', 'C', 'P', 'X', 'R', 'C', 'S', 'X', 'C', 'V', 'X', 'BAR', 'C', '7', 'X', 'R', 'V', 'C', 'P', 'X']
  ],
  PAY: { '7': 100, BAR: 30, S: 20, V: 12, P: 8, C: 5 },
  LINES: [[1, 1, 1], [0, 0, 0], [2, 2, 2], [0, 1, 2], [2, 1, 0]],   // rows per reel: centre, top, bottom, the diagonals
  rows(stops) { return stops.map((s, k) => { const L = this.strips[k], n = L.length; return [L[(s - 1 + n) % n], L[s], L[(s + 1) % n]]; }); },
  lineWin(syms) {
    const cherries = syms.filter(s => s === 'R').length;
    if (syms.every(s => s === 'S')) return this.PAY.S;
    for (const t of ['7', 'BAR', 'V', 'P', 'C']) if (syms.every(s => s === t || s === 'S')) return this.PAY[t];
    return cherries === 3 ? 10 : cherries === 2 ? 5 : cherries === 1 ? 2 : 0;
  },
  /** wins for stops and a bet (lines 1, 3 or 5 for bets 1, 2, 3): { total, lines: [[i, pay]] } (per chip a line) */
  evaluate(stops, bet) {
    const R = this.rows(stops), n = bet === 1 ? 1 : bet === 2 ? 3 : 5, out = { total: 0, lines: [] };
    for (let i = 0; i < n; i++) { const L = this.LINES[i], s = L.map((row, k) => R[k][row]), w = Math.round(this.lineWin(s) * G.T.slotsPayMul); if (w) { out.total += w; out.lines.push([i, w]); } }
    return out;
  },
  /** the RTP over n seeded spins at a bet (per chip wagered) */
  rtp(n = 200000, bet = 1, seed = 5) { const r = E.rng(seed); let paid = 0; for (let i = 0; i < n; i++) { const st = [0, 1, 2].map(k => Math.floor(r() * 21)); paid += this.evaluate(st, bet).total; } return paid / (n * (bet === 1 ? 1 : bet === 2 ? 3 : 5)); }
};
const SUITS4 = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
G.BJ = {
  shoe: [], used: 0,
  newShoe() { const s = []; for (let d = 0; d < 6; d++) for (const su of SUITS4) for (const r of RANKS) s.push({ r, s: su }); this.shoe = G.shuffle('casino', s); this.used = 0; },
  draw() { if (!this.shoe.length || this.used > this.shoe.length * .75) this.newShoe(); if (G.BJ.forced && G.BJ.forced.length) return G.BJ.forced.shift(); return this.shoe[this.used++]; },
  value(h) { let v = 0, aces = 0; for (const c of h) { if (c.r === 'A') { v += 11; aces++; } else v += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; } while (v > 21 && aces) { v -= 10; aces--; } return { v, soft: aces > 0 }; },
  isBJ(h) { return h.length === 2 && this.value(h).v === 21; },
  dealerPlays(h) { for (;;) { const { v, soft } = this.value(h); if (v < 17 || (v === 17 && soft && G.T.dealerHitsSoft17)) h.push(this.draw()); else return h; } },
  /** settle a hand against the dealer: chips returned (stake included) */
  settle(hand, dealer) { const p = this.value(hand.cards).v, d = this.value(dealer).v; if (p > 21) return 0; if (hand.bj && !this.isBJ(dealer)) return hand.bet * 2.5; if (this.isBJ(dealer) && !hand.bj) return 0; if (d > 21 || p > d) return hand.bet * 2; if (p === d) return hand.bet; return 0; }
};
G.ROULETTE = {
  ORDER: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
  RED: new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]),
  pockets() { return G.T.rouletteDoubleZero ? this.ORDER.concat(['00']) : this.ORDER; },
  spin() { if (G.ROULETTE.forced !== undefined && G.ROULETTE.forced !== null) { const f = G.ROULETTE.forced; G.ROULETTE.forced = null; return f; } return G.pick('casino', this.pockets()); },
  /** pays for a bet { kind, n } on result x: chips returned (stake included), 0 when lost */
  pays(b, x) {
    const num = typeof x === 'number' ? x : -1, z = num <= 0;
    switch (b.kind) {
      case 'num': return b.n === x ? b.chips * 36 : 0;
      case 'red': return !z && this.RED.has(num) ? b.chips * 2 : 0; case 'black': return !z && !this.RED.has(num) ? b.chips * 2 : 0;
      case 'odd': return !z && num % 2 === 1 ? b.chips * 2 : 0; case 'even': return !z && num % 2 === 0 ? b.chips * 2 : 0;
      case 'low': return !z && num <= 18 ? b.chips * 2 : 0; case 'high': return !z && num >= 19 ? b.chips * 2 : 0;
      case 'dozen': return !z && Math.ceil(num / 12) === b.n ? b.chips * 3 : 0;
      case 'col': return !z && ((num - 1) % 3) + 1 === b.n ? b.chips * 3 : 0;
    }
    return 0;
  }
};
const chipDelta = n => { const st = G.state; st.chips += n; st.stats.casinoNet += n; };
G.casinoLeaveNight = () => { const st = G.state; G.game.go('dayend', null, { fade: 'dissolve', seconds: .6 }); void st; };
/* card sprites, drawn with px: a white card with rank and suit, or the back */
G.drawCard = (g, x, y, c, faceUp = true) => {
  x = Math.round(x); y = Math.round(y);
  px.rect(g, x, y, 18, 24, '#141018'); px.rect(g, x + 1, y + 1, 16, 22, faceUp ? '#f8f6f0' : '#c8283a');
  if (!faceUp) { for (let k = 0; k < 5; k++) px.rect(g, x + 3 + k * 3, y + 3, 1, 18, '#ffd36a'); return; }
  const red = c.s === '♥' || c.s === '♦', col = red ? '#d8283a' : '#141018';
  E.font.text(g, c.r, x + 2, y + 2, col, { outline: false }); E.font.text(g, c.s, x + 9, y + 12, col, { outline: false, scale: 1 });
};
G.scenes.casino = {
  pausable: true, view: 'threequarter', input: G.PRESETS.CASINO, camera: false,
  enter(d) {
    G.useInput('CASINO'); this.station = d.station; this.at = d.at; this.t = 0; this.nav = new G.Nav(); this.msg = ''; this.msgT = 0; G.themeName = 'night'; G.music('neon');
    this.bet = 1; this.slot = { stops: [3, 7, 11], spin: [false, false, false], off: [0, 0, 0], phase: 'idle', win: null, bet: 1 };
    this.bj = { phase: 'bet', bet: 5, hands: [], dealer: [], cur: 0, out: null }; this.rl = { bets: [], size: 1, phase: 'bet', result: null, hist: [], ang: 0, ball: 0, spd: 0 };
    if (this.station === 'vip') { G.say('sonny', G.pickLine('sonny', 'casinoHello')); this.station = 'floor'; }
    if (this.station === 'blackjack') this.say('pepper', G.pickLine('pepper', 'dealer'));
    if (this.station === 'roulette') this.say('kai', G.pickLine('kai', 'croupier'));
  },
  say(who, text) { this.msg = text; this.msgWho = who; this.msgT = 0; },
  back() { G.sfx('ui_back'); G.game.go('location', { loc: 'casino', at: this.at }); },
  update(dt) {
    this.t += dt; this.msgT += dt; const I = G.game.input;
    if (G.talk && G.talk.open) { G.talk.update(dt); if (G.talk.modal) return; }
    if (this.station === 'floor') return this.back();
    if (this.station === 'cashier') return this.updCashier(dt, I);
    if (this.station === 'prize') return this.updPrize(dt, I);
    if (this.station === 'slots') return this.updSlots(dt, I);
    if (this.station === 'blackjack') return this.updBJ(dt, I);
    if (this.station === 'roulette') return this.updRoul(dt, I);
  },
  /* ---- the cashier ---- */
  cashItems() { const W = G.game.W, H = G.game.H, x = Math.round(W / 2 - 75), y = Math.round(H * .4), st = G.state; return [[10, 'Buy 10 chips'], [50, 'Buy 50 chips'], [100, 'Buy 100 chips']].map(([n, l], i) => ({ id: 'b' + n, x, y: y + i * 22, w: 150, h: 18, label: l, right: G.fmtMoney(n * 100), disabled: st.money < n * 100, onPress: () => { if (G.spend(n * 100)) { st.chips += n; G.sfx('chip'); this.say('kai', 'Here you go. Good luck tonight.'); } } })).concat([{ id: 'out', x, y: y + 70, w: 150, h: 18, label: 'Cash out all chips', disabled: !st.chips, onPress: () => { const n = st.chips; st.chips = 0; G.earn(n * 100, 'casino'); G.sfx('cash'); this.say('kai', 'Cashed out ' + n + ' chips: ' + G.fmtMoney(n * 100) + '.'); } }, { id: 'back', x, y: y + 96, w: 150, h: 18, label: 'Back to the floor', onPress: () => this.back() }]); },
  updCashier(dt, I) { const ev = this.nav.update(this.cashItems(), I); if (ev.back) this.back(); },
  prizeItems() { const W = G.game.W, H = G.game.H, st = G.state, owned = st.wardrobe.suits.includes('jackpot'); return [{ id: 'suit', x: Math.round(W / 2 - 75), y: Math.round(H * .58), w: 150, h: 18, label: owned ? 'Already yours' : 'Swap 300 chips', disabled: owned || st.chips < 300, onPress: () => { st.chips -= 300; st.wardrobe.suits.push('jackpot'); G.sting('jackpot'); G.toast('Jackpot suit', 'Now in your wardrobe', 'hanger'); } }, { id: 'back', x: Math.round(W / 2 - 75), y: Math.round(H * .58) + 24, w: 150, h: 18, label: 'Back to the floor', onPress: () => this.back() }]; },
  updPrize(dt, I) { const ev = this.nav.update(this.prizeItems(), I); if (ev.back) this.back(); if (!this.prizeRig) this.prizeRig = G.makeRig(G.state.me, { suit: 'jackpot', acc: G.state.wearing.acc }); G.Anim.idle(this.prizeRig, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + this.t, pose: 'hips' }); },
  /* ---- Fortuna Sevens ---- */
  updSlots(dt, I) {
    const S = this.slot, st = G.state;
    for (let k = 0; k < 3; k++) if (S.spin[k]) { S.off[k] += dt * 22; if (G.chance('cosmetic', dt * 12)) G.sfx('reel_spin'); }
    if (S.phase === 'idle' || S.phase === 'done') {
      if (I.pressed('left')) { S.bet = Math.max(1, S.bet - 1); G.sfx('ui_tick'); } if (I.pressed('right')) { S.bet = Math.min(3, S.bet + 1); G.sfx('ui_tick'); }
      if (I.pressed('confirm') || I.clicked()) {
        if (st.chips < S.bet) { G.sfx('ui_error'); this.say('pepper', 'Chips first. The cashier is by the door.'); }
        else { chipDelta(-S.bet); S.phase = 'spin'; S.spin = [true, true, true]; S.win = null; S.t = 0; G.sfx('chip'); }
      }
      if (I.pressed('cancel')) this.back();
      return;
    }
    if (S.phase === 'spin') {
      S.t += dt;
      const stopK = k => { if (!S.spin[k]) return; S.spin[k] = false; let s = (S.stops[k] + Math.floor(S.off[k]) + G.randInt('casino', 0, 4)) % 21; if (G.Slots.forced) s = G.Slots.strips[k].indexOf(G.Slots.forced); S.stops[k] = s; S.off[k] = 0; G.sfx('reel_stop'); };
      const next = S.spin.indexOf(true), pad = I.lastDevice === 'gamepad';
      if (I.pressed('reel1') || (pad && I.pressed('confirm'))) stopK(0);
      if (I.pressed('reel2') || (pad && I.pressed('cancel'))) stopK(1);
      if (I.pressed('reel3') || (pad && I.pressed('alt'))) stopK(2);
      if (!pad && (I.pressed('confirm') || I.clicked()) && next >= 0) stopK(next);
      if (next >= 0 && (S.t > 6 || (G.attract && S.t > .6 + next * .5))) stopK(next);
      if (!S.spin.some(Boolean)) {
        const w = G.Slots.evaluate(S.stops, S.bet); S.win = w; S.phase = 'done'; G.Slots.forced = false;
        if (w.total) { chipDelta(w.total); if (w.total >= 100) { G.sting('jackpot'); G.fx.coins(240, 140, 30, 50); G.game.input.rumble(.6, .5); G.game.flash('#ffd36a', .2, .5); this.say('sonny', 'JACKPOT! The house... is SO happy for you.'); } else { G.sfx('cash'); this.say('pepper', 'A win. Of ' + w.total + ' chips.'); } }
      }
    }
  },
  /* ---- blackjack ---- */
  updBJ(dt, I) {
    const B = this.bj, st = G.state;
    if (B.phase === 'bet') {
      const steps = [1, 5, 10, 25]; if (I.pressed('left')) { B.bet = steps[Math.max(0, steps.indexOf(B.bet) - 1)]; G.sfx('ui_tick'); } if (I.pressed('right')) { B.bet = steps[Math.min(3, steps.indexOf(B.bet) + 1)]; G.sfx('ui_tick'); }
      if (I.pressed('confirm') || I.pressed('hit')) { if (st.chips < B.bet) { G.sfx('ui_error'); this.say('pepper', 'You are short of chips. Statistically, that was unwise.'); return; } chipDelta(-B.bet); B.hands = [{ cards: [G.BJ.draw(), G.BJ.draw()], bet: B.bet, done: false }]; B.dealer = [G.BJ.draw(), G.BJ.draw()]; B.cur = 0; B.phase = 'play'; B.dealT = 0; G.sfx('card_deal'); B.hands[0].bj = G.BJ.isBJ(B.hands[0].cards); if (B.hands[0].bj || G.BJ.isBJ(B.dealer)) this.dealerTurn(); }
      if (I.pressed('cancel')) this.back();
      return;
    }
    if (B.phase === 'play') {
      B.dealT += dt; const h = B.hands[B.cur], v = G.BJ.value(h.cards).v, canSplit = B.hands.length === 1 && h.cards.length === 2 && G.BJ.value([h.cards[0]]).v === G.BJ.value([h.cards[1]]).v && st.chips >= h.bet, canDouble = h.cards.length === 2 && st.chips >= h.bet;
      const c = I.clicked(), hit = this.bjButtons().find(b => c && c[0] >= b.x && c[0] < b.x + b.w && c[1] >= b.y && c[1] < b.y + b.h);
      if (I.pressed('confirm') || I.pressed('hit') || hit && hit.id === 'hit') { h.cards.push(G.BJ.draw()); G.sfx('card_deal'); if (G.BJ.value(h.cards).v >= 21) this.nextHand(); }
      else if (I.pressed('alt') || I.pressed('stand') || hit && hit.id === 'stand') { G.sfx('card_flip'); this.nextHand(); }
      else if ((I.pressed('extra') || I.pressed('double') || hit && hit.id === 'double') && canDouble) { chipDelta(-h.bet); h.bet *= 2; h.cards.push(G.BJ.draw()); G.sfx('chip'); this.nextHand(); }
      else if ((I.pressed('tabR') || I.pressed('split') || hit && hit.id === 'split') && canSplit) { chipDelta(-h.bet); const c2 = h.cards.pop(), ace = h.cards[0].r === 'A'; B.hands.push({ cards: [c2, G.BJ.draw()], bet: h.bet, done: ace }); h.cards.push(G.BJ.draw()); if (ace) { h.done = true; this.dealerTurn(); } G.sfx('card_deal'); }
      void v; return;
    }
    if (B.phase === 'result') { if (I.pressed('confirm') || I.pressed('hit') || I.clicked()) { B.phase = 'bet'; B.out = null; } if (I.pressed('cancel')) this.back(); }
  },
  bjButtons() { const W = G.game.W, H = G.game.H, y = Math.round(H * .82) - 18, x0 = Math.round(W / 2 - 150); return [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']].map(([id, l], i) => ({ id, label: l, x: x0 + i * 76, y, w: 70, h: 16 })); },
  nextHand() { const B = this.bj; B.hands[B.cur].done = true; if (B.cur < B.hands.length - 1 && !B.hands[B.cur + 1].done) B.cur++; else this.dealerTurn(); },
  dealerTurn() {
    const B = this.bj; if (!B.hands.every(h => G.BJ.value(h.cards).v > 21)) G.BJ.dealerPlays(B.dealer);
    let back = 0; for (const h of B.hands) back += G.BJ.settle(h, B.dealer); chipDelta(back);
    const staked = B.hands.reduce((s, h) => s + h.bet, 0); B.out = { back, staked }; B.phase = 'result';
    if (B.hands[0].bj && back > 0) { this.say('pepper', G.pickLine('pepper', 'blackjack')); G.sfx('cash'); }
    else if (B.hands.every(h => G.BJ.value(h.cards).v > 21)) { this.say('pepper', G.pickLine('pepper', 'bust')); G.sfx('ui_error'); }
    else this.say('pepper', back > staked ? 'You win. The house is mildly inconvenienced.' : back === staked ? 'A push. How dull.' : 'The house wins. As is customary.');
  },
  /* ---- roulette ---- */
  rouletteItems() {
    const W = G.game.W, H = G.game.H, cw = 15, ch = 12, x0 = Math.round(W / 2 - 6 * cw - 16), y0 = Math.round(H * .4), R = this.rl, out = [];
    const add = (id, x, y, w, h, label, bet) => out.push({ id, x, y, w, h, label, bet, onPress: () => this.placeChip(bet) });
    add('n0', x0 - cw - 2, y0, cw, ch * 3, '0', { kind: 'num', n: 0 });
    for (let c = 0; c < 12; c++) for (let rr = 0; rr < 3; rr++) { const n = c * 3 + (3 - rr); add('n' + n, x0 + c * cw, y0 + rr * ch, cw - 1, ch - 1, String(n), { kind: 'num', n }); }
    for (let rr = 0; rr < 3; rr++) add('col' + (3 - rr), x0 + 12 * cw + 2, y0 + rr * ch, 22, ch - 1, '2:1', { kind: 'col', n: 3 - rr });
    for (let dz = 1; dz <= 3; dz++) add('dz' + dz, x0 + (dz - 1) * cw * 4, y0 + ch * 3 + 2, cw * 4 - 1, 11, ['1st 12', '2nd 12', '3rd 12'][dz - 1], { kind: 'dozen', n: dz });
    [['low', '1-18'], ['even', 'EVEN'], ['red', 'RED'], ['black', 'BLACK'], ['odd', 'ODD'], ['high', '19-36']].forEach(([k, l], i) => add(k, x0 + i * cw * 2, y0 + ch * 3 + 15, cw * 2 - 1, 11, l, { kind: k }));
    void R; return out;
  },
  placeChip(bet) { const R = this.rl, st = G.state; if (R.phase !== 'bet') return; if (st.chips < R.size) { G.sfx('ui_error'); return; } chipDelta(-R.size); const ex = R.bets.find(b => b.kind === bet.kind && b.n === bet.n); if (ex) ex.chips += R.size; else R.bets.push(Object.assign({ chips: R.size }, bet)); G.sfx('chip'); },
  updRoul(dt, I) {
    const R = this.rl, st = G.state;
    R.ang += R.spd * dt; R.spd *= Math.pow(.55, dt);
    if (R.phase === 'bet') {
      const its = this.rouletteItems(), ev = this.nav.update(its, I);
      if (ev.tab) { const s = [1, 5, 10, 25]; R.size = s[(s.indexOf(R.size) + ev.tab + 4) % 4]; G.sfx('ui_tab'); }
      if (ev.alt) { const f = its.find(i => i.id === this.nav.focus); if (f) { const k = R.bets.findIndex(b => b.kind === f.bet.kind && b.n === f.bet.n); if (k >= 0) { chipDelta(R.bets[k].chips); R.bets.splice(k, 1); G.sfx('ui_back'); } } }
      if (ev.extra && R.bets.length) { R.phase = 'spin'; R.t = 0; R.spd = 9; R.result = G.ROULETTE.spin(); G.sfx('wheel_spin'); this.say('kai', 'No more bets!'); }
      if (ev.back) { for (const b of R.bets) chipDelta(b.chips); R.bets = []; this.back(); }
      return;
    }
    if (R.phase === 'spin') {
      R.t += dt; if (G.chance('cosmetic', dt * 6)) G.sfx('ball_rattle');
      if (R.t > 3.2) {
        R.phase = 'result'; let back = 0; for (const b of R.bets) back += G.ROULETTE.pays(b, R.result); chipDelta(back); R.won = back; R.hist.unshift(R.result); R.hist = R.hist.slice(0, 10);
        this.say('kai', R.result + (R.result === 0 || R.result === '00' ? ' green.' : G.ROULETTE.RED.has(R.result) ? ' red.' : ' black.') + (back ? ' You win ' + back + ' chips!' : ' The ball has spoken.'));
        if (back) G.sfx('cash');
      }
      return;
    }
    if (R.phase === 'result' && (I.pressed('confirm') || I.pressed('extra') || I.clicked())) { R.phase = 'bet'; R.bets = []; }
    if (R.phase === 'result' && I.pressed('cancel')) this.back();
  },
  /* ---- drawing ---- */
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, st = G.state, T2 = G.THEMES.night;
      for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#2a1240', '#0a0614', y / H));
      for (let i = 0; i < 18; i++) { const x = (i * 53) % W, y = (i * 29) % Math.round(H * .3); px.blend(g, .3 + .3 * Math.sin(G.now() * 3 + i), 'add', () => px.disc(g, x, y, 2, i % 2 ? '#ff5fa2' : '#5ff0ff')); }
      const name = { cashier: 'CASHIER', prize: 'PRIZE COUNTER', slots: 'FORTUNA SEVENS', blackjack: 'BLACKJACK', roulette: 'ROULETTE' }[this.station] || 'CASINO FORTUNA';
      E.font.title(g, name, W / 2, Math.round(H * .04), { scale: 2, align: 'center', colors: ['#ffffff', '#ff5fa2', '#7a1a4a'] });
      // the chip count shows on every casino screen
      G.ui.panel(g, Math.round(W * .05), Math.round(H * .04), 92, 15, { theme: 'night' }); G.icon(g, 'chip', Math.round(W * .05) + 4, Math.round(H * .04) + 4); E.font.text(g, G.fmtChips(st.chips), Math.round(W * .05) + 14, Math.round(H * .04) + 4, '#5ff0ff', { outline: false });
      G.ui.panel(g, W - Math.round(W * .05) - 96, Math.round(H * .04), 96, 15, { theme: 'night' }); G.ui.money(g, W - Math.round(W * .05) - 92, Math.round(H * .04) + 4, st.money);
      if (this.station === 'cashier') { this.nav.draw(g, this.cashItems()); E.font.text(g, 'Chips are ' + G.fmtMoney(100) + ' each. Cash out any time.', W / 2, Math.round(H * .3), '#fff8e8', { align: 'center', outline: false }); G.promptBar(g, r, [['confirm', 'Choose'], ['cancel', 'Back']]); }
      if (this.station === 'prize') { E.font.text(g, 'The Jackpot suit: 300 chips', W / 2, Math.round(H * .2), '#ffd36a', { align: 'center', outline: false }); if (this.prizeRig) { px.ell(g, W / 2, Math.round(H * .52) + 2, 22, 6, '#2a1240'); px.ell(g, W / 2, Math.round(H * .52), 20, 5, '#ff5fa2'); this.prizeRig.draw(g, W / 2, Math.round(H * .52), E.VIEWS.court); } this.nav.draw(g, this.prizeItems()); G.promptBar(g, r, [['confirm', 'Choose'], ['cancel', 'Back']]); }
      if (this.station === 'slots') this.drawSlots(g, r);
      if (this.station === 'blackjack') this.drawBJ(g, r);
      if (this.station === 'roulette') this.drawRoul(g, r);
      if (this.msg) { const who = this.msgWho, w = Math.min(280, W - 40), x = Math.round((W - w) / 2), y = Math.round(H * .13), L = E.font.wrap(this.msg, w - 36); let left = Math.floor(this.msgT * 50); G.ui.panel(g, x, y, w, Math.max(24, L.length * 9 + 8), { theme: 'night', alpha: .9 }); if (G.CAST[who]) G.portrait(g, G.portraitRig(who), x + 3, y + 2, 20, { frame: false }); L.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; if (s) E.font.text(g, s, x + 28, y + 4 + i * 9, '#fff8e8', { outline: false }); }); }
    });
    if (G.talk) G.talk.draw(r);
  },
  drawSlots(g, r) {
    const S = this.slot, W = r.W, H = r.H, x0 = Math.round(W / 2 - 60), y0 = Math.round(H * .26), rw = 38, rh = 26;
    E.ui.box(g, x0 - 12, y0 - 12, 3 * rw + 24 + 4, 3 * rh + 24, { bg: ['#e8283a', '#8a1020'], border: '#ffd36a', alpha: 1 });
    for (let k = 0; k < 3; k++) {
      const strip = G.Slots.strips[k], base = S.stops[k] + Math.floor(S.off[k]), fr = S.off[k] % 1;
      px.rect(g, x0 + k * (rw + 2), y0, rw, rh * 3, '#f8f6f0');
      for (let rr = -1; rr <= 3; rr++) {
        const s = strip[((base + rr - 1) % 21 + 21) % 21], y = Math.round(y0 + rr * rh - (S.spin[k] ? fr * rh : 0));
        if (y < y0 - rh + 4 || y > y0 + rh * 3 - 4) continue;
        const cx = x0 + k * (rw + 2) + rw / 2;
        g.save(); g.beginPath(); g.rect(x0 + k * (rw + 2), y0, rw, rh * 3); g.clip();
        if (S.spin[k]) px.blend(g, .7, 'normal', () => this.symbol(g, s, cx, y + rh / 2)); else this.symbol(g, s, cx, y + rh / 2);
        g.restore();
      }
    }
    // the lines played, and the wins lit
    const lines = S.bet === 1 ? 1 : S.bet === 2 ? 3 : 5;
    for (let i = 0; i < lines; i++) { const L = G.Slots.LINES[i], lit = S.win && S.win.lines.some(([j]) => j === i); const p = L.map((row, k) => [x0 + k * (rw + 2) + rw / 2, y0 + row * rh + rh / 2]); for (let k = 0; k < 2; k++) px.line(g, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1], lit ? (Math.floor(G.now() * 6) % 2 ? '#ffd36a' : '#ffffff') : '#ff5fa2'); }
    E.font.text(g, 'Bet ◀ ' + S.bet + ' ▶  (' + lines + ' line' + (lines > 1 ? 's' : '') + ')', W / 2, y0 + rh * 3 + 18, '#fff8e8', { align: 'center', outline: false });
    if (S.win) E.font.text(g, S.win.total ? 'WIN ' + S.win.total + ' CHIPS!' : 'No win', W / 2, y0 + rh * 3 + 30, S.win.total ? '#ffd36a' : '#c8b0e0', { align: 'center', scale: S.win.total ? 2 : 1, shadow: '#000', outline: false });
    const pay = '777 ×100 · BAR ×30 · SONNY ×20 (wild) · BALL ×12 · PALM ×8 · COCONUT ×5 · CHERRIES ×2 ×5 ×10';
    E.font.text(g, pay, W / 2, Math.round(H * .8), '#c8b0e0', { align: 'center', outline: false, wrap: W * .8 });
    G.promptBar(g, r, S.phase === 'spin' ? [['reel1', 'Reel 1'], ['reel2', 'Reel 2'], ['reel3', 'Reel 3']] : [['confirm', 'Spin'], ['move', 'Bet'], ['cancel', 'Back']]);
  },
  symbol(g, s, x, y) {
    x = Math.round(x); y = Math.round(y);
    if (s === '7') E.font.title(g, '7', x, y - 9, { scale: 2, align: 'center', colors: ['#ff5a5a', '#c8102a'], depth: 1 });
    else if (s === 'BAR') { px.rect(g, x - 12, y - 5, 24, 10, '#141018'); E.font.text(g, 'BAR', x, y - 3, '#ffd36a', { align: 'center', outline: false }); }
    else if (s === 'S') { px.disc(g, x, y, 8, '#d9a27a'); px.rect(g, x - 6, y - 3, 12, 3, '#ffd36a'); px.rect(g, x - 7, y - 9, 14, 4, '#121014'); px.rect(g, x - 2, y + 3, 4, 1, '#6a2a1a'); }
    else if (s === 'V') px.sprite(g, G.BALL_SPR[0], x - 3, y - 3, { scale: 2 });
    else if (s === 'P') { px.rect(g, x - 1, y - 2, 2, 10, '#8a5a32'); for (let k = -2; k <= 2; k++) px.line(g, x, y - 3, x + k * 4, y - 6 + Math.abs(k) * 2, '#2f8f4e', 2); }
    else if (s === 'C') { px.disc(g, x, y, 6, '#6a4428'); px.dot(g, x - 2, y - 2, '#9a6a48'); px.dot(g, x + 1, y - 1, '#2a1a10'); }
    else if (s === 'X') { px.blend(g, .5, 'normal', () => { px.line(g, x - 3, y, x + 3, y, '#e8b0c8'); px.line(g, x, y - 3, x, y + 3, '#e8b0c8'); }); }
    else { px.disc(g, x - 3, y + 3, 4, '#e8283a'); px.disc(g, x + 4, y + 2, 4, '#c8102a'); px.line(g, x - 3, y, x + 2, y - 8, '#2f8f4e'); px.line(g, x + 4, y, x + 2, y - 8, '#2f8f4e'); }
  },
  drawBJ(g, r) {
    const B = this.bj, W = r.W, H = r.H;
    px.ell(g, W / 2, Math.round(H * .5), Math.round(W * .38), Math.round(H * .3), '#0e4a2a'); px.ell(g, W / 2, Math.round(H * .5), Math.round(W * .36), Math.round(H * .28), '#1e7a4a');
    E.font.text(g, 'BLACKJACK PAYS 3 TO 2 · DEALER ' + (G.T.dealerHitsSoft17 ? 'HITS' : 'STANDS ON') + ' SOFT 17', W / 2, Math.round(H * .46), '#ffd36a', { align: 'center', outline: false });
    if (!this.pepRig) this.pepRig = G.makeRig('pepper'); G.Anim.idle(this.pepRig, 1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 });
    this.pepRig.draw(g, W / 2, Math.round(H * .3), E.VIEWS.court);
    if (B.phase !== 'bet') {
      const hide = B.phase === 'play';
      B.dealer.forEach((c, i) => G.drawCard(g, W / 2 - B.dealer.length * 11 + i * 22, Math.round(H * .32), c, !(hide && i === 1)));
      if (!hide) E.font.text(g, String(G.BJ.value(B.dealer).v), W / 2 + B.dealer.length * 11 + 6, Math.round(H * .36), '#fff8e8', { outline: false });
      B.hands.forEach((h, hi) => { const cx = W / 2 + (hi - (B.hands.length - 1) / 2) * 110; h.cards.forEach((c, i) => G.drawCard(g, cx - h.cards.length * 10 + i * 20, Math.round(H * .56), c, true)); const v = G.BJ.value(h.cards).v; E.font.text(g, (v > 21 ? 'BUST ' : '') + v + '  · bet ' + h.bet, cx, Math.round(H * .56) + 28, hi === B.cur && B.phase === 'play' ? '#ffd36a' : '#fff8e8', { align: 'center', outline: false }); });
    }
    if (B.phase === 'bet') { E.font.text(g, 'Bet ◀ ' + B.bet + ' chips ▶', W / 2, Math.round(H * .62), '#fff8e8', { align: 'center', scale: 2, shadow: '#000', outline: false }); G.promptBar(g, r, [['confirm', 'Deal'], ['move', 'Bet'], ['cancel', 'Leave']]); }
    else if (B.phase === 'play') { for (const b of this.bjButtons()) G.ui.button(g, b, false); G.promptBar(g, r, [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']]); }
    else { E.font.text(g, B.out.back > B.out.staked ? '+' + (B.out.back - B.out.staked) + ' chips' : B.out.back === B.out.staked ? 'Push' : '-' + (B.out.staked - B.out.back) + ' chips', W / 2, Math.round(H * .76), B.out.back > B.out.staked ? '#9ff3a8' : '#ff9a8a', { align: 'center', scale: 2, shadow: '#000', outline: false }); G.promptBar(g, r, [['confirm', 'Next hand'], ['cancel', 'Leave']]); }
  },
  drawRoul(g, r) {
    const R = this.rl, W = r.W, H = r.H, its = this.rouletteItems();
    // the wheel inset
    const cx = Math.round(W / 2), cy = Math.round(H * .26), rad = 24, P = G.ROULETTE.pockets(), n = P.length;
    px.disc(g, cx, cy, rad + 4, '#5a3a1a'); px.disc(g, cx, cy, rad + 2, '#ffd36a');
    for (let i = 0; i < n; i++) { const a0 = R.ang + i / n * TAU, a1 = a0 + TAU / n, v = P[i]; px.poly(g, [[cx, cy], [cx + Math.cos(a0) * rad, cy + Math.sin(a0) * rad], [cx + Math.cos(a1) * rad, cy + Math.sin(a1) * rad]], v === 0 || v === '00' ? '#1e9a4a' : G.ROULETTE.RED.has(v) ? '#d8283a' : '#141018'); }
    px.disc(g, cx, cy, 8, '#8a5a2a'); px.disc(g, cx, cy, 4, '#ffd36a');
    if (R.phase !== 'bet' && R.result !== null) { const k = P.indexOf(R.result), sp = R.phase === 'spin' ? clamp(1 - R.t / 3.2, 0, 1) : 0, a = R.ang + (k + .5) / n * TAU - sp * 20, rr = rad - 3 + sp * 6; px.disc(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2, '#ffffff'); }
    for (const it of its) {
      const b = it.bet, num = b.kind === 'num' ? b.n : null, bg = num === 0 ? '#1e9a4a' : num ? (G.ROULETTE.RED.has(num) ? '#c8202a' : '#1a1a22') : b.kind === 'red' ? '#c8202a' : b.kind === 'black' ? '#1a1a22' : '#1e6a3a';
      const hot = R.phase === 'result' && G.ROULETTE.pays(Object.assign({ chips: 1 }, b), R.result) > 0;
      px.rect(g, it.x, it.y, it.w, it.h, hot ? '#ffd36a' : bg); px.rect(g, it.x, it.y, it.w, 1, '#3a8a5a');
      E.font.text(g, it.label, it.x + it.w / 2, it.y + Math.round((it.h - 7) / 2), hot ? '#2a1a10' : '#fff8e8', { align: 'center', outline: false, font: it.label.length > 3 ? 'tiny' : undefined });
      const placed = R.bets.find(q => q.kind === b.kind && q.n === b.n); if (placed) { px.disc(g, it.x + it.w - 4, it.y + 4, 3, '#ffd36a'); E.font.text(g, String(placed.chips), it.x + it.w - 4, it.y + 2, '#2a1a10', { align: 'center', outline: false, font: 'tiny' }); }
      if (this.nav.focus === it.id && R.phase === 'bet') G.ui.focus(g, it.x, it.y, it.w, it.h);
    }
    E.font.text(g, 'Chip size ' + R.size + '   On the table ' + R.bets.reduce((s, b) => s + b.chips, 0), W / 2, Math.round(H * .76), '#fff8e8', { align: 'center', outline: false });
    E.font.text(g, 'Last: ' + (R.hist.length ? R.hist.join(' ') : '—'), W / 2, Math.round(H * .8), '#c8b0e0', { align: 'center', outline: false });
    G.promptBar(g, r, R.phase === 'bet' ? [['confirm', 'Chip'], ['alt', 'Remove'], ['extra', 'Spin'], ['tabL', 'Size']] : R.phase === 'result' ? [['confirm', 'New bets'], ['cancel', 'Leave']] : []);
  }
};


/* ---- 42-photo.js ---- */
/* 42-photo: Postcards. Photo mode (from the pause menu, Create / C in places and on match results; never in sessions or
 * the attract) freezes play; the stick pans, the right stick or a right-drag orbits, L2/R2 or the wheel zooms, Cross
 * shoots, Square picks the subject, Triangle opens the panel (pose, expression, filter, frame), R3 / H hides the UI.
 * A photo is kept as a spec, never pixels: the place, time and weather, the camera, and everyone's suit, pose, face and
 * spot. The album re-renders them live (palms still sway); one can be the title's backdrop, or saved as a PNG. */
G.POSES = [['Wave', { pose: 'wave' }], ['Peace', { poseW: { peace: 1 } }], ['Hips', { pose: 'hips' }], ['Cheer', { pose: 'cheer' }], ['Stretch', { poseW: { stretch: 1 } }], ['Look Back', { poseW: { lookback: 1 } }], ['Sit', { poseW: { sit: 1 } }], ['Victory', { clip: 'Victory', pose: 'cheer' }], ['Salute', { clip: 'Salute', pose: 'wave' }], ['Bow', { clip: 'Bow', pose: 'kneel' }]];
G.EXPRS = ['smile', 'shout', 'wince', 'neutral'];
G.FILTERS = ['Clean', 'Sunny', 'Sepia', 'Retro', 'Night Glow'];
G.FRAMES = ['None', 'Postcard'];
G.photoAllowed = false;
const poseState = (P, x, y, facing, t) => { const pz = (G.POSES.find(q => q[0] === P.pose) || G.POSES[0])[1]; const s = { x, y, z: 0, vx: 0, vy: 0, facing, expr: P.expr === 'neutral' ? null : P.expr }; if (pz.pose) s.pose = pz.pose; if (pz.poseW) s.poseW = Object.assign({}, pz.poseW); return { s, clip: pz.clip && G.Anim.has(pz.clip) ? pz.clip : null, t }; };
G.photo = {
  allowed() { return !G.hub && !G.attract && (G.photoAllowed || (G.inMatchScene && G.M && G.M.phase === 'results')); },
  /** gather the people of the scene shown now */
  gather() {
    const sc = G.game.scene, out = [];
    if (G.inMatchScene && G.M) for (const p of G.M.players) out.push({ id: p.cast, rig: p.rig, x: p.x, y: p.y, facing: p.facing, suit: p.rig.suitId, acc: p.rig.accs, kit: p.rig.kit });
    else if (sc && sc.hero) { out.push({ id: G.state.me, rig: sc.heroRig, x: sc.hero.x, y: sc.hero.y, facing: sc.hero.facing }); for (const n of sc.npcs || []) out.push({ id: n.id, rig: n.rig, x: n.x, y: n.y, facing: n.facing }); }
    for (const q of out) { const w = G.wearOf(q.id) || {}; q.suit = q.suit || w.suit; q.acc = q.acc || w.acc || []; q.pose = 'Wave'; q.expr = 'smile'; }
    return out;
  },
  open(kind) {
    if (!this.allowed()) { G.sfx('ui_error'); return; }
    const g = G.game, people = this.gather(); if (!people.length) return;
    const loc = G.inMatchScene ? 'beach' : (g.scene && g.scene.loc) || 'beach';
    const st = G.state, ov = {
      id: 'photo', modal: true, sceneBound: true, people, sub: 0, filter: 0, frame: 1, panel: false, hide: false, t: 0, flash: 0, dev: null,
      loc, ts: g.timeScale, view: g.view, yaw: g.yaw || 0, zoom: g.zoom, fx: people[0].x, fy: people[0].y, fz: 16, nav: new G.Nav(), row: 0,
      update(dt) {
        const I = g.input, rdt = G.realDt; this.t += rdt; this.flash = Math.max(0, this.flash - rdt * 3);
        if (this.dev) { this.dev.t += rdt; if (this.dev.t > 2.2) this.dev = null; }
        // the people hold their poses, still breathing (cosmetic, on real time)
        for (const q of this.people) { const P = poseState(q, q.x, q.y, q.facing, this.t); G.Anim.idle(q.rig, rdt, P.s, { clip: P.clip, t: this.t }); }
        if (this.panel) {
          const rows = ['pose', 'expr', 'filter', 'frame'];
          if (I.repeat('up', .35, .12)) { this.row = (this.row + 3) % 4; G.sfx('ui_tick'); } if (I.repeat('down', .35, .12)) { this.row = (this.row + 1) % 4; G.sfx('ui_tick'); }
          const d = I.repeat('right', .35, .12) ? 1 : I.repeat('left', .35, .12) ? -1 : 0, q = this.people[this.sub];
          if (d) { G.sfx('ui_tick'); const k = rows[this.row]; if (k === 'pose') q.pose = G.POSES[(G.POSES.findIndex(x => x[0] === q.pose) + d + G.POSES.length) % G.POSES.length][0]; else if (k === 'expr') q.expr = G.EXPRS[(G.EXPRS.indexOf(q.expr) + d + 4) % 4]; else if (k === 'filter') this.filter = (this.filter + d + 5) % 5; else this.frame = (this.frame + 1) % 2; }
          if (I.pressed('extra') || I.pressed('cancel')) { this.panel = false; G.sfx('ui_back'); }
          if (I.pressed('confirm')) this.panel = false;
          return true;
        }
        const m = I.move(), dv = g.view.screenDirToGround(m[0], m[1]); this.fx += dv[0] * 120 * rdt; this.fy += dv[1] * 120 * rdt;
        g.follow(null); g.focus(this.fx, this.fy, this.fz); g.cam.smooth = .1;
        const aim = I.padAim, pan = I.pan && I.pan(); if (aim && Math.abs(aim[0]) > .4 && g.rotateView) { this._rot = (this._rot || 0) + aim[0] * rdt * 90; if (Math.abs(this._rot) >= 15) { g.rotateView(Math.sign(this._rot) * 15); this._rot = 0; } }
        if (pan && Math.abs(pan[0]) > 2 && g.rotateView) g.rotateView(pan[0] > 0 ? 5 : -5);
        if (G.wheel) g.setZoom(clamp(g.zoom * (G.wheel > 0 ? .9 : 1.1), .75, 2.5));
        if (I.down('trigL')) g.setZoom(clamp(g.zoom * (1 - rdt), .75, 2.5)); if (I.down('trigR')) g.setZoom(clamp(g.zoom * (1 + rdt), .75, 2.5));
        if (I.pressed('alt')) { this.sub = (this.sub + 1) % this.people.length; G.sfx('ui_tick'); const q = this.people[this.sub]; this.fx = q.x; this.fy = q.y; }
        if (I.pressed('extra')) { this.panel = true; this.row = 0; G.sfx('ui_select'); }
        if (I.pressed('hide')) this.hide = !this.hide;
        if (I.pressed('confirm')) this.shoot();
        if (I.pressed('cancel') || I.pressed('esc')) this.close();
        return true;
      },
      spec() {
        const s = G.state;
        return { loc: this.loc, day: s ? s.day : 1, slot: s ? s.slot : 1, tod: G.curTod || 'afternoon', weather: s ? G.weatherNow() : 'sunny', cam: { x: this.fx, y: this.fy, z: this.fz, yaw: g.yaw || 0, zoom: g.zoom, view: g.view.id },
          people: this.people.map(q => ({ id: q.id, suit: q.suit, acc: q.acc, kit: q.kit, pose: q.pose, expr: q.expr, x: Math.round(q.x), y: Math.round(q.y), facing: +q.facing.toFixed(2) })), filter: G.FILTERS[this.filter], frame: G.FRAMES[this.frame] };
      },
      shoot() {
        G.sfx('shutter'); this.flash = 1; G.sting('photo');
        const sp = this.spec(); G.photo.add(sp); this.dev = { t: 0 };
        G.bus.emit('photo', sp);
      },
      close() { G.overlay.remove(ov); G.popInput(); g.timeScale = this.ts; g.setZoom(this.zoom); if (g.resetCamera) { /* keep the view, undo the turn */ } if (this.yaw !== (g.yaw || 0) && g.rotateView) g.rotateView(this.yaw - (g.yaw || 0)); const sc = g.scene; if (sc && sc.hero) g.follow(sc.hero, { z: 16 }); g.input.consumeAll(); G.sfx('ui_back'); },
      draw(r) {
        G.photo.filterFx(r, G.FILTERS[this.filter]);
        r.overlay(gg => {
          if (this.frame) G.photo.frameFx(gg, r, G.state ? G.state.day : 1);
          if (this.flash > 0) px.blend(gg, this.flash, 'normal', () => px.rect(gg, 0, 0, r.W, r.H, '#ffffff'));
          if (this.dev) { const k = clamp(this.dev.t / .5, 0, 1), w = 64, h = 46, x = Math.round(r.W - w - 12), y = Math.round(r.H - h - 30 + (1 - k) * 60); E.ui.box(gg, x, y, w, h, { bg: ['#f8f6f0', '#e8e4dc'], border: '#a89878', alpha: 1 }); px.rect(gg, x + 4, y + 4, w - 8, h - 16, E.mix('#78c8f0', '#ffd36a', this.dev.t / 2.2)); E.font.text(gg, 'Developing...', x + w / 2, y + h - 11, '#5a4a3a', { align: 'center', outline: false, font: 'tiny' }); }
          if (this.hide) return;
          const q = this.people[this.sub], s = r.w(q.x, q.y, 52); G.ui.tag(gg, '▼ ' + G.castName(q.id), s[0], s[1], '#2a1a10', '#ffd36a');
          E.font.text(gg, 'PHOTO MODE', Math.round(r.W * .05), Math.round(r.H * .05), '#ffd36a', { shadow: '#000', outline: false });
          if (this.panel) {
            const x = Math.round(r.W * .05), y = Math.round(r.H * .2), vals = [q.pose, q.expr, G.FILTERS[this.filter], G.FRAMES[this.frame]];
            G.ui.panel(gg, x, y, 150, 96, { title: 'POSTCARD' });
            ['Pose', 'Expression', 'Filter', 'Frame'].forEach((l, i) => { const it = { x: x + 6, y: y + 10 + i * 20, w: 138, h: 16, label: l, value: () => vals[i] }; G.ui.stepper(gg, it, i === this.row); });
            G.promptBar(gg, r, [['move', 'Change'], ['extra', 'Done']], this.frame ? { y: r.H - 20 - 18 } : {});
          } else G.promptBar(gg, r, [['confirm', 'Take'], ['alt', 'Subject'], ['extra', 'Pose & filter'], ['move', 'Pan'], ['hide', 'Hide UI'], ['cancel', 'Exit']], this.frame ? { y: r.H - 20 - 18 } : {});   // (above a postcard frame's caption)
        });
      }
    };
    g.timeScale = 0; G.overlay.push(ov); G.sfx('ui_select'); G.pushInput('MENU');
    return ov;
  },
  add(spec) {
    const st = G.state; const album = st ? st.album : G.unlocks.album;
    if (album.length >= 24) album.shift();
    album.push(spec); if (st) st.stats.photos++;
    G.saveUnlocks(); G.toast('Postcard saved', album.length + '/24 in your album', 'camera');
  },
  autoGroup(S) {
    const st = G.state; if (!st) return;
    const people = Object.values(S.actors).map(a => ({ id: a.id, suit: (G.wearOf(a.id) || {}).suit, acc: (G.wearOf(a.id) || {}).acc || [], pose: 'Cheer', expr: 'smile', x: Math.round(a.x), y: Math.round(a.y), facing: Math.PI / 2 }));
    const spec = { loc: S.loc, day: st.day, slot: 2, tod: 'night', weather: 'clear', cam: { x: S.camAt[0], y: S.camAt[1], z: 10, yaw: 0, zoom: 1, view: 'threequarter' }, people, filter: 'Night Glow', frame: 'Postcard', party: true };
    st.album.push(spec); if (st.album.length > 24) st.album.shift(); st.partyPhoto = spec; G.saveUnlocks();
  },
  /* ---- re-rendering a spec: prepare() in update sets the camera; renderSpec() in draw draws it ---- */
  rigsFor(spec) {
    if (spec._rigs) return spec._rigs;
    Object.defineProperty(spec, '_rigs', { value: spec.people.map(q => G.makeRig(q.id, { suit: q.suit, acc: q.acc, kit: q.kit })), enumerable: false, configurable: true });
    return spec._rigs;
  },
  prepare(spec) { const g = G.game, v = E.VIEWS[spec.cam.view] || E.VIEWS.threequarter; if (g.view !== v) g.setView(v); g.follow(null); g.cam.bounds = null; g.focus(spec.cam.x, spec.cam.y, spec.cam.z); g.setZoom(spec.cam.zoom || 1); },
  renderSpec(r, spec, o = {}) {
    const L = G.LOCS[spec.loc] || G.LOCS.beach, map = spec.loc === 'beach' ? G.courtMap : G.getLocMap(spec.loc), t = G.now();
    if (L.sky) G.drawSky(r, spec.tod, r.w(spec.cam.x, 0, 0)[1]);
    map.drawFloor(r); map.queueWalls(r);
    if (spec.loc === 'beach') { G.drawShore(r, t); G.drawCourtProps(r, { tod: spec.tod }); G.drawNet(r); }
    else G.scenes.location.drawDressing.call({ L, loc: spec.loc, tod: spec.tod }, r);
    const rigs = this.rigsFor(spec);
    spec.people.forEach((q, i) => { const P = poseState(q, q.x, q.y, q.facing, t); G.Anim.idle(rigs[i], 1 / 60, P.s, { clip: P.clip, t }); r.shadow(q.x, q.y, 6, .3); r.actor(q.x, q.y, 0, (g, ox, oy) => rigs[i].draw(g, ox, oy, r.view)); });
    if (spec.tod === 'night') for (const q of spec.people) G.game.lights.add(q.x, q.y, 30, 80, .6, { color: '#ffd8a0' });
    this.filterFx(r, spec.filter);
    if (spec.frame === 'Postcard' && !o.title) r.overlay(g => this.frameFx(g, r, spec.day));
  },
  filterFx(r, f) {
    if (!f || f === 'Clean') return;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (f === 'Sunny') px.blend(g, .22, 'screen', () => px.rect(g, 0, 0, W, H, '#ffb060'));
      else if (f === 'Sepia') { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, W, H, '#c89860')); px.blend(g, .15, 'screen', () => px.rect(g, 0, 0, W, H, '#704020')); }
      else if (f === 'Retro') { for (let y = 0; y < H; y += 2) px.blend(g, .25, 'multiply', () => px.rect(g, 0, y, W, 1, '#202040')); px.blend(g, .15, 'add', () => px.rect(g, 0, 0, W, H, '#ff5fa2')); }
      else if (f === 'Night Glow') { px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, W, H, '#4050a0')); px.blend(g, .18, 'add', () => px.rect(g, 0, 0, W, H, '#5ff0ff')); }
    });
  },
  frameFx(g, r, day) {
    const W = r.W, H = r.H, b = 8; px.rect(g, 0, 0, W, b, '#f8f4e8'); px.rect(g, 0, H - b - 12, W, b + 12, '#f8f4e8'); px.rect(g, 0, 0, b, H, '#f8f4e8'); px.rect(g, W - b, 0, b, H, '#f8f4e8');
    E.font.text(g, 'Greetings from Isla Fortuna', b + 4, H - b - 9, '#c8302a', { outline: false });
    E.font.text(g, 'Day ' + day + ' of the Invitational', W - b - 4, H - b - 9, '#5a4a3a', { align: 'right', outline: false });
    const sx = W - b - 26, sy = b + 4; px.rect(g, sx, sy, 22, 26, '#ff9e5e'); px.rect(g, sx + 2, sy + 2, 18, 22, '#ffd36a'); px.sprite(g, G.BALL_SPR[0], sx + 8, sy + 9);
  }
};
/* ---- the album: a 4x2 grid of thumbnails, each re-rendered from its spec; open one to see it live ---- */
G.drawThumb = (g, spec, x, y, w, h, on) => {
  const P = G.TOD[spec.tod] || G.TOD.afternoon, fl = spec.loc === 'casino' ? '#5a1a3a' : spec.loc === 'pool' ? '#7ad8e0' : spec.loc === 'promenade' ? '#d8c8a8' : spec.loc === 'villa' ? '#c48a5a' : '#ecd49a';
  for (let yy = 0; yy < h * .45; yy += 2) px.rect(g, x, y + yy, w, 2, E.mix(P.sky[0], P.sky[P.sky.length - 1], yy / (h * .45)));
  px.rect(g, x, y + Math.round(h * .45), w, Math.round(h * .12), P.sea[1]); px.rect(g, x, y + Math.round(h * .57), w, Math.ceil(h * .43), fl);
  const rigs = G.photo.rigsFor(spec), n = spec.people.length;
  spec.people.slice(0, 6).forEach((q, i) => { const r = rigs[i]; const S = poseState(q, 0, 0, Math.PI / 2, G.now()); G.Anim.idle(r, 1 / 60, S.s, { clip: S.clip, t: G.now() }); r.draw(g, Math.round(x + w * (i + 1) / (Math.min(n, 6) + 1)), Math.round(y + h - 4), E.VIEWS.court); });
  E.ui.box(g, x - 2, y - 2, w + 4, h + 4, { bg: 'transparent', border: on ? '#ffd36a' : '#f8f4e8', gradient: false, alpha: 0 });
  px.rect(g, x - 2, y - 2, w + 4, 2, on ? '#ffd36a' : '#f8f4e8'); px.rect(g, x - 2, y + h, w + 4, 2, on ? '#ffd36a' : '#f8f4e8'); px.rect(g, x - 2, y, 2, h, on ? '#ffd36a' : '#f8f4e8'); px.rect(g, x + w, y, 2, h, on ? '#ffd36a' : '#f8f4e8');
};
G.scenes.album = {
  view: 'threequarter', input: G.PRESETS.MENU, camera: false,
  enter(d) { G.useInput('MENU'); this.from = (d && d.from) || 'menu'; this.at = d && d.at; this.page = 0; this.nav = new G.Nav(); this.open = null; G.music('siesta'); },
  album() { return G.state ? G.state.album : G.unlocks.album; },
  items() { const W = G.game.W, H = G.game.H, A = this.album(), cw = Math.round(W * .19), ch = Math.round(cw * .62), x0 = Math.round(W / 2 - (cw * 4 + 18) / 2), y0 = Math.round(H * .2); return A.slice(this.page * 8, this.page * 8 + 8).map((s, i) => ({ id: 'p' + (this.page * 8 + i), k: this.page * 8 + i, x: x0 + (i % 4) * (cw + 6), y: y0 + Math.floor(i / 4) * (ch + 14), w: cw, h: ch, spec: s, onPress: () => { this.open = this.page * 8 + i; } })); },
  leave() { G.sfx('ui_back'); if (this.from === 'menu') G.game.go('menu'); else G.game.go('location', { loc: this.from, at: this.at }); },
  update(dt) {
    const I = G.game.input, A = this.album();
    if (this.open !== null) {
      const s = A[this.open]; if (!s) { this.open = null; return; }
      G.photo.prepare(s);
      if (I.pressed('cancel') || I.pressed('confirm')) { this.open = null; G.game.setView(E.VIEWS.threequarter); G.game.setZoom(1); G.sfx('ui_back'); }
      else if (I.pressed('alt')) G.confirm('Delete this postcard?', () => { A.splice(this.open, 1); this.open = null; G.saveUnlocks(); }, { destructive: true });
      else if (I.pressed('extra')) { G.unlocks.titlePostcard = s; if (G.state) G.state.titlePostcard = s; G.saveUnlocks(); G.toast('Title backdrop set', 'It shows behind the logo', 'camera'); }
      else if (I.pressed('tabR') && !G.hub) this.exportPNG();
      return;
    }
    const ev = this.nav.update(this.items(), I, { wheelTabs: true }), pages = Math.max(1, Math.ceil(A.length / 8));
    if (ev.tab) { this.page = (this.page + ev.tab + pages) % pages; G.sfx('ui_tab'); }
    if (ev.back) this.leave();
  },
  exportPNG() {
    try { const c = G.game.screen.canvas || document.getElementById('screen'), url = c.toDataURL('image/png'), a = document.createElement('a'); a.href = url; a.download = 'isla-fortuna-postcard.png'; document.body.appendChild(a); a.click(); a.remove(); G.toast('Saved as a PNG', 'isla-fortuna-postcard.png', 'camera'); } catch (e) { G.toast('Could not save the PNG', String(e.message || e)); }
  },
  draw(r) {
    const A = this.album();
    if (this.open !== null && A[this.open]) { G.photo.renderSpec(r, A[this.open]); r.overlay(g => G.promptBar(g, r, [['cancel', 'Back'], ['alt', 'Delete'], ['extra', 'Title backdrop'], !G.hub && ['tabR', 'Save PNG']])); return; }
    r.overlay(g => {
      const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#c8a050', '#5a3a1a', y / H));
      G.ui.title(g, 'ALBUM', W / 2, Math.round(H * .04), { scale: 2 });
      const its = this.items();
      if (!its.length) E.font.text(g, 'No postcards yet. Take one from the pause menu, or press ' + G.btnName('snap') + ' in a place.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false, wrap: W * .7 });
      for (const it of its) { G.drawThumb(g, it.spec, it.x, it.y, it.w, it.h, this.nav.focus === it.id); E.font.text(g, G.placeName[it.spec.loc] + ' · Day ' + it.spec.day, it.x + it.w / 2, it.y + it.h + 3, '#fff8e8', { align: 'center', outline: false, font: 'tiny' }); }
      E.font.text(g, A.length + '/24 postcards', W / 2, Math.round(H * .86), '#fff3c0', { align: 'center', shadow: '#000', outline: false });
      G.promptBar(g, r, [['confirm', 'Open'], ['tabL', 'Page'], ['cancel', 'Back']]);
    });
  }
};


/* ---- 50-title.js ---- */
/* 50-title: the title (a sunset beach, the six fighters each with her own idle, Sonny jogging past with a trophy, the
 * logo, PRESS in the current device's glyph), the main menu (a big list, a turning fighter), How to Play (ten pages with a
 * live mini-scene) and About & Credits (Source Information and the three feedback sections). 10 s idle starts the attract. */
const TITLE_CAST = [['rin', 'stretch'], ['lola', 'flex'], ['ingrid', 'fan'], ['amara', 'dance'], ['tess', 'juggle'], ['mei', 'wave']];
G.titleWorld = {
  rigs: null, sonny: null, t: 0,
  init() { if (this.rigs) return; this.rigs = TITLE_CAST.map(([id, idle], i) => ({ id, idle, rig: G.makeRig(id), x: 280 + i * 29, y: 150 + (i % 2) * 8 })); this.sonny = G.makeRig('sonny'); },
  update(dt) {
    this.init(); this.t += dt; const t = this.t;
    for (const f of this.rigs) {
      const s = { x: f.x, y: f.y, z: 0, facing: Math.PI / 2 + Math.sin(t * .4 + f.x) * .25, poseW: {} };
      if (f.idle === 'stretch') s.poseW.stretch = 1; else if (f.idle === 'flex') { s.pose = 'cheer'; s.expr = 'shout'; } else if (f.idle === 'fan') { s.pose = 'wave'; s.expr = 'wince'; if (G.chance('cosmetic', dt * .6)) G.fx.sweat(f.x, f.y, 34); }
      else if (f.idle === 'juggle') { s.poseW.bump = .5 + .5 * Math.max(0, Math.sin(t * 5.4)); } else if (f.idle === 'wave') s.pose = 'wave';
      if (f.idle === 'dance') G.Anim.idle(f.rig, dt, s, { clip: 'Dance_Loop', t }); else G.Anim.idle(f.rig, dt, s);
    }
    const sx = ((t * 40) % 900) - 120;
    G.Anim.idle(this.sonny, dt, { x: sx, y: 118, z: 0, vx: 70, vy: 0, facing: 0, pose: 'cheer', expr: 'smile' });
    this.sonnyX = sx;
  },
  draw(r, o = {}) {
    const g = G.game; g.focus(352, 112, 12);
    const tod = o.tod || 'sunset';
    if (o.postcard && G.photo) { G.photo.renderSpec(r, o.postcard, { title: true }); return; }
    G.drawSky(r, tod, r.w(352, 0, 0)[1]);
    G.courtMap.drawFloor(r); G.drawShore(r, G.now());
    r.prop('palm', 210, 128, 0, { size: 1.8 }); r.prop('palm', 500, 132, 0, { size: 1.9 }); r.prop('palm', 170, 176, 0, { size: 1.6 }); r.prop('palm', 548, 180, 0, { size: 1.7 });
    r.shape('umbrella', 244, 132, 0, { params: { color: '#ff5f7a' } }); r.shape('lounger', 470, 174, 0, { params: { color: '#2ec4c9' } }); r.shape('surfboard', 452, 128, 0, { params: { color: '#ffd04a' } }); r.shape('sandcastle', 352, 188, 0); r.shape('beachtowel', 310, 182, 0, { facing: 0, params: { color: '#ff9e5e' } });
    for (const f of this.rigs || []) { r.shadow(f.x, f.y, 6, .3); r.actor(f.x, f.y, 0, (gg, ox, oy) => f.rig.draw(gg, ox, oy, r.view)); }
    if (this.rigs) { const j = this.rigs[4], k = Math.abs(Math.sin(this.t * 2.7)); G.drawBall(r, j.x + 3, j.y + 2, 18 + k * 26, this.t * 3); }
    if (this.sonny && this.sonnyX > -60 && this.sonnyX < 760) { r.actor(this.sonnyX, 118, 0, (gg, ox, oy) => this.sonny.draw(gg, ox, oy, r.view)); r.queue(this.sonnyX + 6, 118, 40, gg => { const q = r.w(this.sonnyX + 4, 118, 46); px.rect(gg, q[0] - 3, q[1] - 6, 7, 6, '#ffd36a'); px.rect(gg, q[0] - 1, q[1], 3, 4, '#e8a020'); px.rect(gg, q[0] - 3, q[1] + 4, 7, 2, '#8a5a20'); }); }
  }
};
G.drawLogo = (g, r, y, o = {}) => {
  const x = Math.round(r.W / 2), sc = o.scale || (r.W < 360 ? 3 : 4);
  E.font.title(g, 'AHEAD OR ALIVE', x, y, { scale: sc, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3 });
  const w = E.font.width('AHEAD OR ALIVE', { scale: sc }), bx = x + Math.round(w / 2) + 10;
  px.sprite(g, G.BALL_SPR[Math.floor(G.now() * 6) % 3], bx, y + 6);
  E.font.text(g, 'XTREME BEACH VOLLEYBALL', x + 1, y + sc * 8 + 8 + 1, '#0f6a72', { scale: 2, align: 'center', outline: false });
  E.font.text(g, 'XTREME BEACH VOLLEYBALL', x, y + sc * 8 + 8, '#ffffff', { scale: 2, align: 'center', outline: false });
};
/** the touch-only notice: no touch controls; a Settings button */
G.touchGate = {
  rect: null,
  draw(g, r) {
    if (!G.touchOnly()) return;
    const w = 220, h = 70, x = Math.round((r.W - w) / 2), y = Math.round(r.H / 2) - 10;
    G.ui.panel(g, x, y, w, h);
    E.font.text(g, 'Controller or keyboard required', r.W / 2, y + 8, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
    E.font.text(g, 'Connect a controller or keyboard to play.', r.W / 2, y + 20, '#fff8e8', { align: 'center', outline: false });
    E.font.text(g, 'The demo keeps running.', r.W / 2, y + 29, '#9fd3d6', { align: 'center', outline: false });
    this.rect = { x: Math.round(r.W / 2 - 45), y: y + 44, w: 90, h: 18 };
    G.ui.button(g, Object.assign({ label: 'Settings' }, this.rect), true);
  },
  update() {
    if (!G.touchOnly()) return false;
    const c = G.game.input.clicked(), R = this.rect;
    if (c && R && c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h) G.game.menu('settings');
    return true;
  }
};
G.scenes = G.scenes || {};
G.scenes.title = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); G.applyLight('sunset'); G.music('sunrise'); G.ambience('beach'); G.game.setView(E.VIEWS.court); G.game.setZoom(1.15); G.game.cam.frame(null); G.attractReset && G.attractReset(); G.themeName = 'day'; this.t = 0; },
  exit() { G.game.setZoom(1); },
  update(dt) {
    this.t += dt; G.titleWorld.update(dt); G.tickAmbience(dt);
    if (G.unlocks && G.unlocks.titlePostcard) G.photo.prepare(G.unlocks.titlePostcard);
    if (G.attractIdle && G.attractIdle(dt)) return;
    if (G.touchGate.update()) return;
    const I = G.game.input;
    if (this.t > .3 && (I.pressed('confirm') || I.pressed('start') || I.clicked() || G.game.players.some(p => p.pressed('confirm') || p.pressed('start')))) { I.consumeAll(); G.sfx('ui_select'); G.game.go('menu', null, { fade: .2 }); }
  },
  draw(r) {
    G.titleWorld.draw(r, { postcard: G.unlocks && G.unlocks.titlePostcard });
    r.overlay(g => {
      G.drawLogo(g, r, Math.round(r.H * .1));
      if (!G.touchOnly()) { if (Math.floor(G.now() * 1.6) % 2 === 0) { const w = G.promptW('confirm', 'PRESS'); G.glyph(g, r.W / 2 - w / 2 + E.font.width('PRESS') + 6, Math.round(r.H * .84) + 1, 'confirm'); E.font.text(g, 'PRESS', Math.round(r.W / 2 - w / 2), Math.round(r.H * .84) + 2, '#fff8e8', { shadow: '#0a0814', outline: false }); } }
      else G.touchGate.draw(g, r);
      E.font.text(g, 'v' + G.VERSION + ' - engine v' + E.version, Math.round(r.W * .05), r.H - 14, '#c8b0d0', { shadow: '#000', outline: false });
      E.font.text(g, 'An original parody-tribute game', r.W - Math.round(r.W * .05), r.H - 14, '#c8b0d0', { align: 'right', shadow: '#000', outline: false });
    });
  }
};
G.scenes.menu = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); G.applyLight('sunset'); G.music('sunrise'); G.game.setZoom(1.15); this.nav = this.nav || new G.Nav({ focus: 'new' }); this.t = 0; this.preview = this.preview || G.makeRig('tess'); this.pi = 0; G.attractReset && G.attractReset(); },
  exit() { G.game.setZoom(1); },
  entries() {
    const has = G.saveExists && G.saveExists(), album = G.unlocks && G.unlocks.album && G.unlocks.album.length;
    return [
      { id: 'new', label: 'New Vacation', onPress: () => G.newVacationFlow && G.newVacationFlow() },
      has && { id: 'cont', label: 'Continue', onPress: () => G.continueGame() },
      { id: 'load', label: 'Load', disabled: !has, onPress: () => G.loadMenu() },
      { id: 'beach', label: 'Beach Match', onPress: () => G.game.go('exhibition') },
      album && { id: 'album', label: 'Album', onPress: () => G.game.go('album', { from: 'menu' }) },
      { id: 'howto', label: 'How to Play', onPress: () => G.game.go('howto', { from: 'menu' }) },
      { id: 'settings', label: 'Settings', onPress: () => G.game.menu('settings') },
      { id: 'about', label: 'About & Credits', onPress: () => G.game.go('about', { from: 'menu' }) }
    ].filter(Boolean);
  },
  items() { const W = G.game.W, H = G.game.H, x = Math.round(W * .07), y = Math.round(H * .34); return G.listLayout(this.entries(), x, y, 128, 16, 4).map(it => Object.assign(it, { align: 'left' })); },
  update(dt) {
    this.t += dt; G.titleWorld.update(dt); G.tickAmbience(dt);
    if (G.attractIdle && G.attractIdle(dt)) return;
    if (G.touchGate.update()) return;
    const ev = this.nav.update(this.items(), G.game.input);
    if (ev.back) { G.sfx('ui_back'); G.game.go('title', null, { fade: .2 }); }
    // the preview turns, and changes fighter now and then
    if (Math.floor(this.t / 4) !== this.pi) { this.pi = Math.floor(this.t / 4); this.preview = G.makeRig(G.FIGHTERS[this.pi % 6]); }
    G.Anim.idle(this.preview, dt, { x: 0, y: 0, z: 0, facing: this.t * .9, pose: this.pi % 3 === 0 ? 'hips' : null });
  },
  draw(r) {
    G.titleWorld.draw(r);
    r.overlay(g => {
      G.drawLogo(g, r, Math.round(r.H * .06), { scale: 3 });
      if (G.touchOnly()) { G.touchGate.draw(g, r); return; }
      const its = this.items(); G.ui.panel(g, its[0].x - 8, its[0].y - 8, 144, its.length * 20 + 12, { alpha: .82 });
      this.nav.draw(g, its);
      // the turning fighter on a pedestal
      const px0 = Math.round(r.W * .78), py0 = Math.round(r.H * .74), c = G.CAST[this.preview.castId];
      px.ell(g, px0, py0 + 2, 26, 7, '#0a2d3d'); px.ell(g, px0, py0, 24, 6, '#2ec4c9'); px.ell(g, px0, py0 - 1, 20, 4, '#9ff3e8');
      this.preview.draw(g, px0, py0, E.VIEWS.court);
      E.font.text(g, c.full, px0, py0 + 12, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); E.font.text(g, '"' + c.epithet + '"', px0, py0 + 22, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
      G.promptBar(g, r, [['move', 'Choose'], ['confirm', 'Select'], ['cancel', 'Back']]);
    });
  }
};

/* ---- How to Play: ten pages, a live mini-scene in the panel, the current device's glyphs ---- */
G.howtoMini = (g, x, y, w, h, page, t) => {
  // a small court seen side-on: the ring shrinking, the touch chain, a serve, a block, a heart
  px.rect(g, x, y, w, h, '#5ab8d8'); px.rect(g, x, y + h * .55, w, h * .45, '#f3d9a4'); px.rect(g, x, y + h * .5, w, h * .06, '#2ec4c9');
  const nx = x + w / 2; px.rect(g, nx, y + h * .3, 1, h * .25, '#ffffff'); px.rect(g, nx - 1, y + h * .3, 3, 1, '#ffffff');
  const gy = Math.round(y + h * .8), k = (t * .5) % 1;
  const ball = (bx, by) => px.sprite(g, G.BALL_SPR[Math.floor(t * 8) % 3], Math.round(bx - 3), Math.round(by - 3));
  const fig = (fx, col, up) => { px.rect(g, fx - 2, gy - 14, 5, 7, col); px.rect(g, fx - 1, gy - 18, 3, 4, '#f1cfb2'); px.rect(g, fx - 2, gy - 7, 2, 7, '#e2ad84'); px.rect(g, fx + 1, gy - 7, 2, 7, '#e2ad84'); if (up) { px.rect(g, fx - 3, gy - 22, 1, 6, '#f1cfb2'); px.rect(g, fx + 3, gy - 22, 1, 6, '#f1cfb2'); } };
  if (page === 0) { const rr = 14 - 10 * k; px.ell(g, x + w * .3, gy + 2, rr, rr * .35, k > .8 ? '#ffd36a' : '#ffffff'); px.ell(g, x + w * .3, gy + 2, Math.max(1, rr - 1), Math.max(1, rr * .35 - 1), '#f3d9a4'); ball(x + w * .3, y + h * .1 + k * (gy - y - h * .1 - 16)); fig(x + w * .3 + (1 - k) * 20, '#2ec4c9'); }
  else if (page === 1) { const pts = [[w * .15, gy - 14], [w * .38, y + 10 - y], [w * .38, gy - 22], [w * .3, y + 4 - y], [w * .43, gy - 28], [w * .85, gy]]; const seg = Math.floor(k * 5), u = (k * 5) % 1, a = pts[seg], b = pts[seg + 1]; ball(x + lerp(a[0], b[0], u), (seg % 2 ? y : 0) + lerp(a[1] < 0 ? y + 10 : a[1], b[1] < 0 ? y + 10 : b[1], u)); fig(x + w * .15, '#2ec4c9'); fig(x + w * .38, '#ff5f7a', seg === 1); E.font.text(g, ['BUMP', 'SET', 'SPIKE', 'SPIKE', 'KILL!'][seg], x + 6, y + 4, '#2a1a10', { outline: false }); }
  else if (page === 2) { for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) px.rect(g, x + w * .55 + i * 14, gy - 4 + j * 3 - 6, 12, 2, (i === Math.floor(t) % 3 && j === 1) ? '#ff5f7a' : '#e2c088'); ball(x + w * .35 + k * w * .3, y + h * .3 + k * (gy - y - h * .3 - 6)); fig(x + w * .3, '#2ec4c9', true); }
  else if (page === 3) { const up = Math.sin(k * Math.PI); ball(x + w * .15 + (k > .6 ? (k - .6) * w * 1.5 : 0), gy - 20 - up * 24); fig(x + w * .15, '#2ec4c9', k > .5 && k < .7); }
  else if (page === 4) { fig(nx - 6, '#2ec4c9', true); fig(nx + 8, '#ff5f7a', true); ball(nx + 10 - k * 14, y + h * .25 + (k > .5 ? (k - .5) * 30 : 0)); if (k > .5) E.font.text(g, 'BLOCK!', nx - 14, y + 4, '#ff5f7a', { outline: false }); }
  else if (page === 5) { fig(x + w * .3, '#2ec4c9'); fig(x + w * .45, '#ff9e5e'); const b2 = ['MINE!', 'YOURS!'][Math.floor(t) % 2]; E.font.text(g, b2, x + w * .3, gy - 34, '#2a1a10', { align: 'center', outline: false }); for (let i = 0; i < 5; i++) G.icon(g, i < 1 + Math.floor(t) % 5 ? 'heart' : 'heartEmpty', x + w * .55 + i * 9, y + 6); }
  else if (page === 6) { const slots = ['Morning', 'Afternoon', 'Night'], s = Math.floor(t) % 3; px.rect(g, x, y, w, h * .55, ['#a8dcf0', '#78c8f0', '#14163a'][s]); E.font.text(g, 'Day ' + (1 + Math.floor(t / 3) % 5) + ' · ' + slots[s], x + w / 2, y + 6, s === 2 ? '#fff8e8' : '#2a1a10', { align: 'center', outline: false }); G.icon(g, 'coin', x + 8, gy - 6); E.font.text(g, G.fmtMoney(12000 + Math.floor(t) * 3000), x + 18, gy - 6, '#2a1a10', { outline: false }); }
  else if (page === 7) { fig(x + w * .35, '#2ec4c9'); fig(x + w * .6, '#ff5f7a'); px.sprite(g, G.GIFT_ICONS.plush_seal, Math.round(x + w * .45), Math.round(gy - 26 - k * 6)); if (k > .5) for (let i = 0; i < 3; i++) G.icon(g, 'heart', x + w * .6 - 6 + i * 6, gy - 34 - (k - .5) * 20 - i * 2); }
  else if (page === 8) { px.rect(g, x + 6, y + 6, 30, 20, '#e8283a'); for (let i = 0; i < 3; i++) E.font.text(g, String(7), x + 9 + i * 9, y + 11, k > .6 ? '#ffd36a' : '#ffffff', { outline: false }); for (let i = 0; i < 4; i++) { px.ell(g, x + w * .45 + i * 18, gy + 2, 7, 2, '#ffd04a'); } fig(x + w * .45 + Math.floor(k * 4) * 18, '#2ec4c9'); }
  else { px.rect(g, x + w * .25, y + 6, w * .5, h * .6, '#fff8e8'); px.rect(g, x + w * .25 + 3, y + 9, w * .5 - 6, h * .6 - 16, '#78c8f0'); fig(x + w * .5, '#ff5f7a', k > .5); if (k > .9) px.rect(g, x, y, w, h, '#ffffff'); }
};
const pagesScene = (kind) => ({
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter(d) { G.useInput('MENU'); this.from = (d && d.from) || 'menu'; this.page = 0; this.t = 0; this.scroll = 0; this.nav = new G.Nav(); G.applyLight('sunset'); G.game.setZoom(1.15); },
  exit() { G.game.setZoom(1); },
  pages() { return kind === 'howto' ? G.HOWTO.map(p => ({ title: p.title, text: p.text })) : G.aboutPages(); },
  items() {
    const W = G.game.W, H = G.game.H, n = this.pages().length;
    return [{ id: 'prev', x: Math.round(W * .06), y: Math.round(H / 2) - 10, w: 18, h: 20, label: '◀', disabled: this.page === 0, onPress: () => this.turn(-1) },
      { id: 'next', x: Math.round(W * .94) - 18, y: Math.round(H / 2) - 10, w: 18, h: 20, label: '▶', disabled: this.page === n - 1, onPress: () => this.turn(1) },
      { id: 'back', x: Math.round(W / 2) - 40, y: Math.round(H * .95) - 34, w: 80, h: 16, label: 'Back', onPress: () => this.leave() }];
  },
  turn(d) { const n = this.pages().length, p = clamp(this.page + d, 0, n - 1); if (p !== this.page) { this.page = p; this.scroll = 0; this.t = 0; G.sfx('ui_tab'); } },
  leave() { G.sfx('ui_back'); G.game.go(this.from === 'pause' ? 'title' : this.from, null, { fade: .2 }); },
  update(dt) {
    this.t += dt; G.titleWorld.update(dt);
    const I = G.game.input, ev = this.nav.update(this.items(), I, { wheelTabs: false });
    if (ev.back) return this.leave();
    if (ev.tab) this.turn(ev.tab);
    if (G.wheel) this.scroll = clamp(this.scroll + G.wheel * 12, 0, this.maxScroll || 0);
    if (I.down('down') && this.nav.focus === 'back') this.scroll = clamp(this.scroll + dt * 60, 0, this.maxScroll || 0);
    if (I.down('up') && this.nav.focus === 'back') this.scroll = clamp(this.scroll - dt * 60, 0, this.maxScroll || 0);
    const pad = I.padAxes && I.padAxes[3]; if (pad && Math.abs(pad) > .3) this.scroll = clamp(this.scroll + pad * dt * 90, 0, this.maxScroll || 0);
  },
  draw(r) {
    G.titleWorld.draw(r);
    r.overlay(g => {
      px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#203040'));
      const P = this.pages(), pg = P[this.page], W = r.W, H = r.H, x = Math.round(W * .12), w = Math.round(W * .76), y = Math.round(H * .08), h = Math.round(H * .74);
      G.ui.panel(g, x, y, w, h, { title: (kind === 'howto' ? 'HOW TO PLAY' : 'ABOUT & CREDITS') + '  ' + (this.page + 1) + '/' + P.length });
      E.font.text(g, pg.title, W / 2, y + 10, '#ffd36a', { scale: 2, align: 'center', shadow: '#000', outline: false });
      let ty = y + 32;
      if (kind === 'howto') { const mw = Math.min(200, w - 40), mh = 64; G.howtoMini(g, Math.round(W / 2 - mw / 2), ty, mw, mh, this.page, this.t); ty += mh + 8; }
      const text = typeof pg.text === 'function' ? pg.text(G.game.input) : pg.text, lines = [];
      for (const para of String(text).split('\n')) { if (!para.trim()) { lines.push(''); continue; } lines.push(...E.font.wrap(para, w - 28)); }
      const lh = 10, room = y + h - 8 - ty, total = lines.length * lh; this.maxScroll = Math.max(0, total - room);
      g.save(); g.beginPath(); g.rect(x + 4, ty - 1, w - 8, room + 2); g.clip();
      lines.forEach((l, i) => { const yy = ty + i * lh - Math.round(this.scroll); if (yy > ty - lh && yy < ty + room) E.font.text(g, l, x + 14, yy, /^[A-Z][A-Za-z &]+:/.test(l) ? '#9fd3d6' : '#fff8e8', { shadow: '#0a0814', outline: false }); });
      g.restore();
      if (this.maxScroll > 0) { const sh = Math.max(10, room * room / total), sy = ty + (room - sh) * (this.scroll / this.maxScroll); px.rect(g, x + w - 6, ty, 2, room, '#0a1a20'); px.rect(g, x + w - 6, sy, 2, sh, '#ffd36a'); }
      this.nav.draw(g, this.items());
      G.promptBar(g, r, [['tabL', 'Page'], this.maxScroll > 0 && ['move', 'Scroll'], ['cancel', 'Back']]);
    });
  }
});
G.scenes.howto = pagesScene('howto');
G.scenes.about = pagesScene('about');
/** How to Play over a paused game (from the pause menu) */
G.howtoOverlay = () => {
  G.pushInput('MENU'); const sc = pagesScene('howto'); sc.enter({ from: 'overlay' }); sc.leave = () => { G.sfx('ui_back'); G.overlay.remove(ov); G.popInput(); G.game.timeScale = ov.ts; G.game.input.consumeAll(); };
  const ov = { id: 'howto', sceneBound: true, ts: G.game.timeScale, update(dt) { sc.update(dt); return true; }, draw(r) { r.overlay(g => { px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#102030')); }); const tw = G.titleWorld.draw; G.titleWorld.draw = () => {}; sc.draw(r); G.titleWorld.draw = tw; } };
  G.game.timeScale = 0; G.overlay.push(ov);
};


/* ---- 51-attract.js ---- */
/* 51-attract: after 10 s with no input on the title or the menu, an AI-played broadcast loops: a spectacle match on
 * Sunset Courts (the camera cutting between Broadcast and Serve Cam every 2 points), then a montage of the vacation in
 * seven captioned beats, then the title card. It runs on a throwaway demo save and may cheat freely. Any key, button,
 * stick, mouse move, click, wheel or touch returns to the title, with that input consumed. */
G.ATTRACT_IDLE = 10;
G.attract = null;
G.attractT = 0; G._ap = null;
G.attractReset = () => { G.attractT = 0; };
/** was there any input this step? keys, buttons, a stick past its dead zone, the mouse moving 4 px, a click, the wheel, a touch */
G.anyInput = () => {
  for (const I of G.game.players) {
    if (I.anyPressed && I.anyPressed()) return true;
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0) return true;
    if (I.clicked && I.clicked()) return true;
  }
  const I = G.game.input, p = I.pointer && I.pointer();
  if (p) { if (G._ap && Math.hypot(p[0] - G._ap[0], p[1] - G._ap[1]) > 4) { G._ap = p.slice(); return true; } if (!G._ap) G._ap = p.slice(); }
  if (G.wheel) return true;
  return false;
};
/** the title and menu call this each step: true when the attract has just started */
G.attractIdle = dt => {
  if (G.attract) return false;
  if (G.anyInput()) { G.attractT = 0; return false; }
  G.attractT += dt;
  if (G.attractT >= G.ATTRACT_IDLE) { G.startAttract(); return true; }
  return false;
};
const BEATS = [
  { id: 'match', len: 50 }, { id: 'map', len: 7, cap: 'FIVE DAYS IN PARADISE' }, { id: 'friends', len: 7, cap: 'MAKE FRIENDS · GIVE GIFTS' }, { id: 'suits', len: 7, cap: 'COLLECT 21 SWIMSUITS' },
  { id: 'pool', len: 8, cap: 'POOL HOP' }, { id: 'casino', len: 8, cap: 'CASINO NIGHTS' }, { id: 'photo', len: 6, cap: 'SNAP POSTCARDS' }, { id: 'final', len: 8, cap: 'BEAT THE HOUSE' }, { id: 'card', len: 5 }
];
G.ATTRACT_BEATS = BEATS;
G.startAttract = () => {
  const A = G.attract = { i: -1, t: 0, cycle: 0, saved: G.state, log: [] };
  G.overlay.push(G.attractOverlay);
  G.nextBeat();
  return A;
};
G.demoState = () => {
  const seed = 101 + G.attract.cycle * 13, me = G.FIGHTERS[G.attract.cycle % 6];
  const st = G.newState(me, seed); G.state = st; st.flags.tutorialDone = true; st.money = 86000; st.chips = 120;
  const pick = G.npcs(st)[0]; st.affinity[pick] = 60; G.dayStart(); G.setPartner(pick);
  st.bag = { plush_seal: 2, hot_sauce: 1, surf_wax: 1, snow_globe: 1, mochi_box: 1, portable_speaker: 1 };
  return st;
};
G.nextBeat = () => {
  const A = G.attract; A.i = (A.i + 1) % BEATS.length; A.t = 0; if (A.i === 0) A.cycle++;
  const B = BEATS[A.i]; A.beat = B.id; A.log.push(B.id); if (A.log.length > 30) A.log.shift(); A.sub = 0; A.k = 0;
  G.seed('attract', 77 + A.cycle * 5 + A.i);
  const g = G.game;
  if (B.id === 'match' || B.id === 'final') {   // (the demo save is dropped as the match scene enters: the scene shown now draws from it through the fade)
    const L = G.shuffle('attract', G.FIGHTERS), tod = G.pick('attract', ['afternoon', 'sunset', 'night', 'morning']);
    const suit = id => G.pick('attract', [G.CAST[id].suit].concat(G.SUIT_IDS.filter(s => !G.SUITS[s].tastes || G.SUITS[s].tastes.some(t => G.CAST[id].tastes.includes(t))))), mk = id => ({ cast: id, suit: suit(id), skill: 1 });
    const final = B.id === 'final';
    const cfg = { mode: 'attract', spectacle: !final, seed: 900 + A.cycle * 31 + A.i, tod: final ? 'sunset' : tod, pointsToWin: 21, commentary: true, replay: !final, final, introTime: final ? .8 : 2.2,
      teams: final ? [[mk(L[0]), mk(L[1])], [{ cast: 'sonny', kit: 'final', skill: .9 }, { cast: 'pepper', kit: 'final', skill: .95 }]] : [[mk(L[0]), mk(L[1])], [mk(L[2]), mk(L[3])]],
      specials: final ? { glare: true, houseEdge: true } : {}, firstServe: final ? 1 : 0, music: final ? 'house' : 'spike', title: final ? 'THE FORTUNA CUP' : 'BEACH MATCH',
      teamNames: final ? [G.castName(L[0]) + ' & ' + G.castName(L[1]), 'The House'] : null, onResults: () => ({ update() {}, draw() {} }) };
    G.game.go('match', { cfg }, { fade: .3 });
    A.points = 0;
    return;
  }
  G.demoState();
  if (B.id === 'map') { G.state.slot = 0; g.go('map', null, { fade: .3 }); }
  else if (B.id === 'friends') g.go('location', { loc: 'beach', at: [330, 250] }, { fade: .3 });
  else if (B.id === 'suits') g.go('shop', { shop: 'coral', from: 'promenade' }, { fade: .3 });
  else if (B.id === 'pool') g.go('poolhop', { bot: true, seed: 5 + A.cycle }, { fade: .3 });
  else if (B.id === 'casino') { G.state.slot = 2; G.Slots.forced = '7'; g.go('casino', { station: 'slots', at: [80, 150] }, { fade: .3 }); }
  else if (B.id === 'photo') { G.state.slot = 1; g.go('location', { loc: 'pool', at: [220, 250] }, { fade: .3 }); }
  else if (B.id === 'card') { G.state = A.saved; g.go('title', null, { fade: .3 }); }
};
G.stopAttract = () => {
  const A = G.attract; if (!A) return;
  G.attract = null; G.overlay.remove(G.attractOverlay); const ph = G.overlay.get('photo'); if (ph) { G.overlay.remove(ph); G.popInput(); }
  G.state = A.saved; G.Slots.forced = false; G.BJ.forced = null; G.game.timeScale = 1; G.attractT = 0; G._ap = null;
  for (const I of G.game.players) I.consumeAll();
  G.musicNow = null; G.game.go('title', null, { fade: .25 });
};
/* any input ends the attract on the very step it happens, even while a scene fades */
if (E.onStep) E.onStep(() => { if (G.attract && G.anyInput()) G.stopAttract(); });
G.attractOverlay = {
  id: 'attract',
  update(dt, took) {
    const A = G.attract; if (!A) return false;
    if (G.anyInput()) { G.stopAttract(); return true; }
    const rdt = G.realDt, B = BEATS[A.i]; A.t += rdt; A.k += rdt;
    const g = G.game, sc = g.scene;
    if (B.id === 'match' && G.M) {   // the camera cuts between Broadcast and Serve Cam every 2 points
      const pts = G.M.rules.score[0] + G.M.rules.score[1];
      if (pts - A.points >= 2) { A.points = pts; G.M.camMode = G.M.camMode === 'Broadcast' ? 'Serve Cam' : 'Broadcast'; }
      if (G.M.phase === 'results' || G.M.phase === 'end') { if (A.t > 8) G.nextBeat(); return false; }
    }
    if (B.id === 'map' && A.k > 2.2 && G.state) { A.k = 0; G.state.slot = (G.state.slot + 1) % 3; if (G.state.slot === 0) G.state.day = G.state.day % 5 + 1; g.go('map', null, { fade: .2 }); }
    if (B.id === 'friends' && sc && sc.npcs && A.sub === 0 && A.t > 1.5) {
      A.sub = 1; const n = sc.npcs.find(q => !q.staff && !q.partner) || sc.npcs[0];
      if (n) { const loved = Object.keys(G.GIFT_TASTE_TABLE).find(k => G.giftTaste(n.id, k) === 'love') || 'plush_seal'; G.state.bag[loved] = 1; sc.ui = { kind: 'bag', npc: n, items: [{ id: loved, n: 1, kind: 'gift' }], page: 0, nav: new G.Nav() }; }
    }
    if (B.id === 'friends' && sc && sc.ui && sc.ui.kind === 'bag' && A.sub === 1 && A.t > 2.6) { A.sub = 2; sc.giveFromBag(sc.ui.items[0]); }
    if (B.id === 'suits' && sc && sc.nav && A.k > .9) { A.k = 0; const its = sc.items(); if (its.length) { A.sub = (A.sub + 1) % its.length; sc.nav.focus = its[A.sub].id; } }
    if (B.id === 'casino' && sc && sc.slot) {
      if (sc.station === 'slots' && sc.slot.phase === 'idle' && A.t > .8) { G.Slots.forced = '7'; sc.slot.phase = 'spin'; sc.slot.spin = [true, true, true]; sc.slot.t = 0; G.state.chips -= 1; }
      if (sc.station === 'slots' && A.t > 4.2) { sc.station = 'blackjack'; sc.bj.phase = 'bet'; G.BJ.forced = [{ r: 'A', s: '♠' }, { r: 'K', s: '♥' }, { r: '9', s: '♣' }, { r: '7', s: '♦' }]; sc.say('pepper', G.pickLine('pepper', 'dealer')); A.sub = 0; }
      if (sc.station === 'blackjack' && sc.bj.phase === 'bet' && A.t > 4.8 && A.sub === 0) { A.sub = 1; sc.bj.bet = 10; G.state.chips -= 10; sc.bj.hands = [{ cards: [G.BJ.draw(), G.BJ.draw()], bet: 10 }]; sc.bj.dealer = [G.BJ.draw(), G.BJ.draw()]; sc.bj.hands[0].bj = G.BJ.isBJ(sc.bj.hands[0].cards); sc.bj.cur = 0; sc.dealerTurn(); G.sfx('card_deal'); }
    }
    if (B.id === 'photo' && sc && sc.hero && A.sub === 0 && A.t > .8) { A.sub = 1; G.photoAllowed = true; const was = G.attract; G.attract = null; const ov = G.photo.open(); G.attract = was; if (ov) { ov.panel = false; ov.filter = 1; } A.photo = ov; }
    if (B.id === 'photo' && A.photo && A.k > .5) { A.k = 0; if (G.game.rotateView) G.game.rotateView(15); if (A.t > 4 && !A.shot) { A.shot = true; G.sfx('shutter'); A.photo.flash = 1; } }
    if (A.t >= B.len) {
      if (B.id === 'photo' && A.photo) { G.overlay.remove(A.photo); G.popInput(); G.game.timeScale = 1; A.photo = null; A.shot = false; }
      G.nextBeat();
    }
    return false;
  },
  draw(r) {
    const A = G.attract; if (!A) return;
    const B = BEATS[A.i];
    r.overlay(g => {
      const sf = G.safe(r);
      const dy = r.H - sf.y - 14 - (A.photo && A.photo.frame ? 22 : 0);   // (bottom left, above a postcard's frame: every scene keeps its HUD at the top, and its prompt bar is hidden while the demo plays)
      if (B.id !== 'card') { E.ui.box(g, sf.x, dy, 34, 13, { bg: ['#ff5f7a', '#c8304a'], border: '#ffd0d8', alpha: .95 }); E.font.text(g, 'DEMO', sf.x + 17, dy + 3, '#fff8e8', { align: 'center', outline: false }); }
      if (B.cap) { const k = clamp(A.t / .4, 0, 1) * clamp((B.len - A.t) / .4, 0, 1), y = Math.round(r.H * .72); px.blend(g, .6 * k, 'multiply', () => px.rect(g, 0, y - 6, r.W, 34, '#102030')); E.font.title(g, B.cap, Math.round(r.W / 2 + (1 - k) * 60), y, { scale: B.cap.length > 18 ? 2 : 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], depth: 2 }); }
      if (G.touchOnly()) E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H - sf.y - 10, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
      // (blinking; the title card blinks its own)
      else if (B.id !== 'card' && Math.floor(G.now() * 1.5) % 2) { const w = G.promptW('confirm', 'PRESS'); E.font.text(g, 'PRESS', Math.round(r.W / 2 - w / 2), r.H - sf.y - 10, '#fff8e8', { shadow: '#000', outline: false }); G.glyph(g, Math.round(r.W / 2 - w / 2 + E.font.width('PRESS') + 4), r.H - sf.y - 11, 'confirm'); }
    });
  }
};


/* ---- 52-exhibition.js ---- */
/* 52-exhibition: Beach Match. Four columns (Left 1, Left 2, Right 1, Right 2), each a fighter on a pedestal and who
 * plays it: CPU or P1-P4. Players join with Start or Cross on a free pad, or 2 on the keyboard (the split halves). Each
 * player moves her badge between slots (left/right), picks a fighter (up/down), an outfit (Square / F), and readies
 * (Cross / Enter). Player 1 also sets the options (Triangle / R toggles to them). Any mix works: 1P with a CPU partner,
 * co-op, versus, 2v2, three players. */
G.EXH = { opts: { points: 7, sets: 1, diff: 'Normal', time: 'Sunset', cam: 'Broadcast' } };
const EX_POINTS = [7, 11, 15, 21], EX_TIMES = ['Morning', 'Sunset', 'Night'], EX_DIFF = ['Easy', 'Normal', 'Hard', 'Pro'];
G.exFighters = () => G.FIGHTERS.concat(G.unlocks && G.unlocks.finished ? ['sonny', 'pepper'] : []);
G.exSuits = id => {
  const c = G.CAST[id]; if (c.host) return [null];
  const owned = (G.unlocks && G.unlocks.suits) || [], all = G.unlocks && G.unlocks.finished;
  return [c.suit].concat(G.SUIT_IDS.filter(s => s !== c.suit && (all || owned.includes(s))));
};
G.scenes.exhibition = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter(d) {
    G.useInput('MENU'); G.applyLight('afternoon'); G.music('island'); G.game.setZoom(1.1); G.themeName = 'day';
    const prev = this.slots;
    this.slots = prev && d && d.keep ? prev : [0, 1, 2, 3].map(i => ({ cast: G.FIGHTERS[[4, 1, 0, 5][i]], suit: 0, who: null, rig: null }));
    if (!(d && d.keep)) this.slots[0].who = 1;
    this.ready = {}; this.mode = {}; this.optI = 0; this.t = 0; this.joined = new Set([1]);
    for (const s of this.slots) s.rig = G.makeRig(s.cast, { suit: G.exSuits(s.cast)[s.suit] });
    G.game.allowJoin({ max: 4, onJoin: (I, n) => { I.glyphs = G.setting('glyphs', 'playstation'); I.use(I.half ? E.Input.halfKeys(G.PRESETS.MENU, I.half) : G.PRESETS.MENU); const free = this.slots.find(s => !s.who); if (free) free.who = n; this.joined.add(n); G.sfx('ui_select'); } });   // (the engine's own note says who joined; the column's badge and prompts show where and on what)
  },
  exit() { G.game.allowJoin(false); G.game.setZoom(1); },
  inputOf(n) { return G.game.players.find(I => (I.player || 1) === n) || (n === 1 ? G.game.input : null); },
  slotOf(n) { return this.slots.findIndex(s => s.who === n); },
  setFighter(si, dir) { const s = this.slots[si], L = G.exFighters(); s.cast = L[(L.indexOf(s.cast) + dir + L.length) % L.length]; s.suit = 0; s.rig = G.makeRig(s.cast, { suit: G.exSuits(s.cast)[0] }); },
  setSuit(si) { const s = this.slots[si], L = G.exSuits(s.cast); s.suit = (s.suit + 1) % L.length; s.rig = G.makeRig(s.cast, { suit: L[s.suit] }); },
  optItems() {
    const W = G.game.W, H = G.game.H, o = G.EXH.opts, y = Math.round(H * .78), w = 74, x0 = Math.round(W / 2 - (w * 5 + 16) / 2);
    const L = [['Points', o.points, () => { o.points = EX_POINTS[(EX_POINTS.indexOf(o.points) + 1) % 4]; }], ['Sets', o.sets === 1 ? '1 set' : 'Best of 3', () => { o.sets = o.sets === 1 ? 3 : 1; }], ['CPU', o.diff, () => { o.diff = EX_DIFF[(EX_DIFF.indexOf(o.diff) + 1) % 4]; }], ['Court', o.time, () => { o.time = EX_TIMES[(EX_TIMES.indexOf(o.time) + 1) % 3]; }], ['Camera', o.cam === 'Broadcast' ? 'Broadcast' : 'Serve Cam', () => { o.cam = o.cam === 'Broadcast' ? 'Serve Cam' : 'Broadcast'; }]];
    return L.map(([k, v, f], i) => ({ id: 'o' + i, x: x0 + i * (w + 4), y, w, h: 24, label: k, value: String(v), onPress: f }));
  },
  colRect(i) { const W = G.game.W, H = G.game.H, cw = Math.round(W * .2), gap = Math.round(W * .02), x0 = Math.round(W / 2 - (cw * 4 + gap * 3 + 16) / 2) + (i >= 2 ? 16 : 0); return { x: x0 + i * (cw + gap), y: Math.round(H * .18), w: cw, h: Math.round(H * .52) }; },
  update(dt) {
    this.t += dt;
    for (const s of this.slots) G.Anim.idle(s.rig, dt, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + Math.sin(this.t + s.cast.length) * .4, pose: this.ready[s.who] ? 'cheer' : null, expr: this.ready[s.who] ? 'smile' : null });
    const P1 = this.inputOf(1);
    // the mouse: click a column to move P1 there, click an option to change it
    const c = P1 && P1.clicked();
    if (c) {
      for (const it of this.optItems()) if (c[0] >= it.x && c[0] < it.x + it.w && c[1] >= it.y && c[1] < it.y + it.h) { it.onPress(); G.sfx('ui_select'); }
      for (let i = 0; i < 4; i++) { const R = this.colRect(i); if (c[0] >= R.x && c[0] < R.x + R.w && c[1] >= R.y && c[1] < R.y + R.h) { if (this.slots[i].who === 1) { if (c[1] < R.y + R.h * .55) this.setFighter(i, 1); else this.setSuit(i); } else if (!this.slots[i].who) { const cur = this.slotOf(1); if (cur >= 0) this.slots[cur].who = null; this.slots[i].who = 1; } G.sfx('ui_tick'); } }
      const sb = this.startRect; if (sb && c[0] >= sb.x && c[0] < sb.x + sb.w && c[1] >= sb.y && c[1] < sb.y + sb.h) this.ready[1] = true;
    }
    if (P1 && G.wheel && this.slotOf(1) >= 0) this.setFighter(this.slotOf(1), G.wheel > 0 ? 1 : -1);
    for (const n of this.joined) {
      const I = this.inputOf(n); if (!I) continue;
      const si = this.slotOf(n), rep = a => I.repeat(a, .35, .12);
      if (n === 1 && I.pressed('extra')) { this.mode[1] = this.mode[1] === 'opts' ? 'slot' : 'opts'; G.sfx('ui_tab'); continue; }
      if (n === 1 && this.mode[1] === 'opts') {
        if (rep('left')) { this.optI = (this.optI + 4) % 5; G.sfx('ui_tick'); }
        if (rep('right')) { this.optI = (this.optI + 1) % 5; G.sfx('ui_tick'); }
        if (I.pressed('confirm') || rep('up') || rep('down')) { this.optItems()[this.optI].onPress(); G.sfx('ui_select'); }
        if (I.pressed('cancel')) this.mode[1] = 'slot';
        continue;
      }
      if (this.ready[n]) { if (I.pressed('cancel')) { this.ready[n] = false; G.sfx('ui_back'); } continue; }
      const goL = rep('left'), goR = rep('right');
      if (goL || goR) {
        const dir = goL ? -1 : 1; let k = si;
        for (let step = 0; step < 4; step++) { k = (k + dir + 4) % 4; if (!this.slots[k].who) break; }
        if (!this.slots[k].who) { this.slots[si].who = null; this.slots[k].who = n; G.sfx('ui_tick'); }
      }
      if (rep('up')) { this.setFighter(this.slotOf(n), -1); G.sfx('ui_tick'); }
      if (rep('down')) { this.setFighter(this.slotOf(n), 1); G.sfx('ui_tick'); }
      if (I.pressed('alt')) { this.setSuit(this.slotOf(n)); G.sfx('ui_tick'); }
      if (I.pressed('confirm')) { this.ready[n] = true; G.sfx('ui_select'); G.voice.say(G.pickLine(this.slots[this.slotOf(n)].cast, 'bark') || 'Yes!', this.slots[this.slotOf(n)].cast, 'happy'); }
      if (I.pressed('cancel') && n === 1) { G.sfx('ui_back'); G.dropPlayers(); G.game.go('menu'); return; }
      if (I.pressed('cancel') && n > 1) { const p = G.game.players.find(q => q.player === n); this.slots[si].who = null; this.joined.delete(n); if (p) G.game.removePlayer(p); G.sfx('ui_back'); }
    }
    if ([...this.joined].every(n => this.ready[n])) this.start();
  },
  start() {
    const o = G.EXH.opts, teams = [[], []];
    this.slots.forEach((s, i) => {
      const side = i < 2 ? 0 : 1, I = s.who ? this.inputOf(s.who) : null;
      teams[side].push({ cast: s.cast, suit: G.exSuits(s.cast)[s.suit], ctl: I ? { kind: 'human', input: I } : { kind: 'ai' }, skill: G.DAY_SKILL.exhibition, kit: G.CAST[s.cast].host ? 'final' : null });
    });
    const tod = o.time === 'Night' ? 'night' : o.time === 'Morning' ? 'morning' : 'sunset';
    G.game.allowJoin(false);
    G.startMatch({ mode: 'exhibition', teams, pointsToWin: o.points, sets: o.sets, difficulty: o.diff, tod, camera: o.cam, seed: G.hashStr(JSON.stringify(this.slots.map(s => s.cast)) + Date.now() % 100000),
      onResults: (M, res) => G.resultsUI(M, res, { buttons: [['Rematch', () => G.startMatch(Object.assign({}, M.cfg, { seed: M.seed + 1 }))], ['Change setup', () => G.game.go('exhibition', { keep: true })], ['Title', () => { G.dropPlayers(); G.game.go('title'); }]] }) });
  },
  draw(r) {
    G.titleWorld.draw(r, { tod: 'afternoon' });
    r.overlay(g => {
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#183040'));
      G.ui.title(g, 'BEACH MATCH', r.W / 2, Math.round(r.H * .04), { scale: 2 });
      E.font.text(g, 'Join: Start or ' + (G.dev() === 'kbm' ? 'Enter' : G.btnName('confirm')) + ' on a free controller, or 2 on the keyboard', r.W / 2, Math.round(r.H * .04) + 18, '#9fd3d6', { align: 'center', shadow: '#000', outline: false });
      this.slots.forEach((s, i) => {
        const R = this.colRect(i), I = s.who ? this.inputOf(s.who) : null, col = s.who ? E.PLAYER_COLORS[s.who - 1] : '#8a94b0', c = G.CAST[s.cast];
        G.ui.panel(g, R.x, R.y, R.w, R.h, { alpha: .88, border: s.who ? col : '#3a5a62', title: (i < 2 ? 'LEFT ' : 'RIGHT ') + (i % 2 + 1) });
        const cx = R.x + R.w / 2, py = R.y + Math.round(R.h * .68);
        px.ell(g, cx, py + 2, 22, 6, '#0a2d3d'); px.ell(g, cx, py, 20, 5, col); px.ell(g, cx, py - 1, 16, 3, E.shade(col, .3));
        s.rig.draw(g, cx, py, E.VIEWS.court);
        E.font.text(g, c.name, cx, py + 9, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
        const suit = G.exSuits(s.cast)[s.suit]; E.font.text(g, G.fit(suit ? G.SUITS[suit].name : 'Match kit', R.w - 8), cx, py + 18, '#9fd3d6', { align: 'center', outline: false });
        // the controller badge
        const label = s.who ? 'P' + s.who : 'CPU', bw = E.font.width(label) + 12;
        E.ui.box(g, Math.round(cx - bw / 2), R.y + 10, bw, 12, { bg: s.who ? [col, E.shade(col, -.3)] : ['#3a3656', '#24203a'], border: '#fff8e8', alpha: 1 });
        E.font.text(g, label, cx, R.y + 12, '#fff8e8', { align: 'center', outline: false });
        if (s.who && this.ready[s.who]) { G.icon(g, 'check', cx + bw / 2 + 2, R.y + 13); E.font.text(g, 'READY', cx, R.y + 26, '#9ff3a8', { align: 'center', shadow: '#000', outline: false }); }
        else if (s.who && I) { let yy = R.y + 26; for (const [a, t] of [['move', 'Fighter'], ['alt', 'Outfit'], ['confirm', 'Ready']]) { const w = G.promptW(a, t, { input: I }); G.prompt(g, Math.round(cx - w / 2), yy, a, t, { input: I }); yy += 12; } }
        if (s.who && I && I.half) {   // the match's keys on this half, under the column two to a line (read from the match preset as the halves get it)
          const M = E.Input.halfKeys(G.PRESETS.MATCH, I.half), k = a => I.codeLabel((M[a] || []).find(c => !c.startsWith('Pad')) || '');
          [[['play', 'hit'], ['dive', 'dive']], [['shot', 'shot'], ['call', 'call']]].forEach((row, j) => E.font.text(g, row.map(([a, w]) => k(a) + ' ' + w).join(' · '), cx, R.y + R.h + 2 + j * 9, '#ffd36a', { align: 'center', shadow: '#000', outline: false }));
        }
        if (!s.who) { const bob = Math.sin(G.now() * 3) > 0; E.font.text(g, bob ? 'Press Start' : 'to join', cx, R.y + 28, '#8a94b0', { align: 'center', outline: false }); }
      });
      E.font.text(g, 'VS', r.W / 2, this.colRect(1).y + Math.round(this.colRect(1).h * .4), '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false });
      const its = this.optItems(), om = this.mode[1] === 'opts';
      its.forEach((it, i) => { E.ui.box(g, it.x, it.y, it.w, it.h, { bg: ['#174a5a', '#0c2e3a'], border: om && this.optI === i ? '#ffd36a' : '#5a8a92', alpha: .95 }); E.font.text(g, it.label, it.x + it.w / 2, it.y + 3, '#9fd3d6', { align: 'center', outline: false }); E.font.text(g, '◀ ' + it.value + ' ▶', it.x + it.w / 2, it.y + 13, '#fff8e8', { align: 'center', outline: false }); if (om && this.optI === i) G.ui.focus(g, it.x, it.y, it.w, it.h); });
      const I1 = this.inputOf(1);
      this.startRect = { x: Math.round(r.W / 2 - 50), y: Math.round(r.H * .9) - 6, w: 100, h: 14 };
      G.promptBar(g, r, [['extra', om ? 'Back to fighters' : 'Options'], ['confirm', om ? 'Change' : 'Ready'], ['cancel', 'Back']], { input: I1 });
    });
  }
};
/** players 2-4 leave (back to one player) */
G.dropPlayers = () => { const P = G.game.players; while (P.length > 1) G.game.removePlayer(P[P.length - 1]); };


/* ---- 53-dev.js ---- */
/* 53-dev: Dev Mode, from the pause menu (then F1, or L3 + R3, for the rest of the session; never in a session). Time is
 * frozen while it is open. Tabs: Tools · Match · Vacation · Minigames · Presentation · Tuning. Every button calls
 * game.debug.tools, which the tests drive too. The Tuning tab holds the live sliders: every system reads G.T each step;
 * each shows its default as a tick; Triangle / R resets one; Reset all asks first; Copy JSON copies the changes. */
const SCENE_TARGETS = [['title', null], ['menu', null], ['map', null], ['location', { loc: 'beach' }], ['location', { loc: 'pool' }], ['location', { loc: 'promenade' }], ['location', { loc: 'villa' }], ['location', { loc: 'casino' }], ['poolhop', {}], ['casino', { station: 'slots' }], ['casino', { station: 'blackjack' }], ['casino', { station: 'roulette' }], ['shop', { shop: 'coral', from: 'promenade' }], ['exhibition', null], ['album', { from: 'menu' }], ['credits', null], ['vresults', null]];
const tname = t => t[0] + (t[1] && (t[1].loc || t[1].station || t[1].shop) ? ': ' + (t[1].loc || t[1].station || t[1].shop) : '');
G.ensureState = (me = 'tess') => { if (!G.state) { G.state = G.newState(me, 4242); G.state.flags.tutorialDone = true; G.dayStart(); G.setPartner(G.bestFriend()); } return G.state; };
G.debugTools = {
  goto(scene, data) { if (['map', 'location', 'poolhop', 'casino', 'shop', 'journal', 'wardrobe', 'dayend', 'vresults', 'credits'].includes(scene)) G.ensureState(); G.game.go(scene, data || null, { fade: 0 }); },
  newVacation(char = 'tess', seed = 1) { G.state = G.newState(char, seed); G.dayStart(); return G.state; },
  setDay(d, slot = 0) { const st = G.ensureState(); st.day = clamp(d, 1, 5); st.slot = clamp(slot, 0, 2); G.dayStart(); st.slot = clamp(slot, 0, 2); G.slotStart(); },
  give(id, n = 1) { const st = G.ensureState(), it = G.itemById(id); if (!it) return false; if (it.kind === 'gift') st.bag[id] = Math.min(9, (st.bag[id] || 0) + n); else if (it.kind === 'suit') { if (!st.wardrobe.suits.includes(id)) st.wardrobe.suits.push(id); } else if (!st.wardrobe.acc.includes(id)) st.wardrobe.acc.push(id); return true; },
  money(n) { G.ensureState().money = Math.max(0, n); },
  addMoney(n) { const st = G.ensureState(); st.money += n; },
  chips(n) { G.ensureState().chips += n; },
  affinity(id, v) { const st = G.ensureState(); if (st.affinity[id] !== undefined) st.affinity[id] = clamp(Math.round(v), 0, 100); },
  mood(id, m) { const st = G.ensureState(); st.mood[id] = m; },
  partner(id) { const st = G.ensureState(); if (!id) { if (st.partner) st.where[st.partner] = 'beach'; st.partner = null; return; } st.affinity[id] = Math.max(st.affinity[id], 100); G.invite(id); },
  unlockAll() { const st = G.ensureState(); for (const s of G.SUIT_IDS) if (!st.wardrobe.suits.includes(s)) st.wardrobe.suits.push(s); for (const a of G.ACC_IDS) if (!st.wardrobe.acc.includes(a)) st.wardrobe.acc.push(a); },
  fillBag() { const st = G.ensureState(); for (const id of G.GIFT_IDS) st.bag[id] = Math.min(9, (st.bag[id] || 0) + 3); },
  revealLikes() { const st = G.ensureState(); for (const id of G.npcs(st)) for (const it of G.GIFT_IDS) st.known[id][it] = G.giftTaste(id, it); },
  match(o = {}) { const cfg = G.quickMatchCfg(o); if (o.ai) cfg.teams[0][0].ctl = { kind: 'ai' }; G.startMatch(cfg); G.game.advance(1 / 120); return G.M; },
  vacationMatch(kind = 'normal') { const st = G.ensureState(); if (!st.partner) G.setPartner(G.bestFriend()); const e = kind === 'semi' ? (st.day = 4, st.slot = 1, G.specialMatch()) : kind === 'final' ? (st.day = 5, st.slot = 1, G.specialMatch()) : { pair: st.teams[0] || G.npcs(st).filter(x => x !== st.partner).slice(0, 2) }; if (kind === 'tutorial') e.kind = 'tutorial', e.pair = ['sonny', 'pepper']; G.startVacationMatch(e); },
  forcePoint(side) { const M = G.M; if (M && !M.over && (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss')) { M.lastTouch = M.players.find(p => p.side === 1 - side); M.pointTo(side, 'fault'); } },
  setScore(a, b) { const M = G.M; if (M) M.rules.score = [a, b]; },
  endMatch(win) { const M = G.M; if (!M) return; const s = M.humanSide === null ? 0 : win ? M.humanSide : 1 - M.humanSide; M.rules.score[s] = M.rules.toWin - 1; M.rules.score[1 - s] = Math.min(M.rules.score[1 - s], M.rules.toWin - 3); M.rules.setsWon[s] = Math.floor(M.rules.sets / 2); if (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss') { M.lastTouch = M.players.find(p => p.side === 1 - s); M.pointTo(s, 'fault'); } },
  perfectPlayer(on) { if (G.M) G.M.perfectPlayer = !!on; G.devFlags.perfect = !!on; },
  cpuControl(on) { if (G.M) G.M.cpuControl = !!on; G.devFlags.cpu = !!on; },
  debugOverlay(on) { if (G.M) G.M.debugOverlay = !!on; G.devFlags.overlay = !!on; },
  slowmo(k) { G.devFlags.slow = k; if (G.M) G.M.slowmo = k; },
  camera() { if (G.M) G.M.toggleCam(); },
  predict() { const M = G.M; if (!M || !M.plan) return []; return [M.plan, ...(M.plan.others || [])].map(c => ({ id: c.p.id, cast: c.p.cast, kind: c.kind, tStar: +c.tStar.toFixed(3), P: c.P.map(v => Math.round(v)), chosen: c === M.plan })); },
  step(n = 1) { G.devStepN = (G.devStepN || 0) + n; },
  poolBot(on) { G.devFlags.poolBot = !!on; const sc = G.game.scene; if (sc && sc.pads) sc.auto = !!on; },
  slotsForce(sym = '7') { G.Slots.forced = sym; },
  deal(cards) { G.BJ.forced = (cards || [['A', '♠'], ['K', '♥'], ['9', '♣'], ['7', '♦']]).map(([r, s]) => ({ r, s })); },
  rouletteForce(n) { G.ROULETTE.forced = n; },
  resetSave() { try { G.game.saves && G.game.saves.list().forEach(s => G.game.saves.erase(s.slot)); } catch (e) { /* none */ } G.state = null; E.store.set('aoa-unlocks', null); G.unlocks = { suits: [], finished: false, album: [], titlePostcard: null, poolBest: null }; },
  story(id) { G.ensureState(); if (id === 'semi') return this.vacationMatch('semi'); if (id === 'final') return this.vacationMatch('final'); if (id === 'party') { G.state.day = 5; G.state.slot = 2; return G.runCutscene('party'); } if (id === 'endingA' || id === 'endingB') { G.state.flags.finalWon = id === 'endingA'; return G.runCutscene(id); } if (id === 'credits') return G.game.go('credits'); }
};
G.devFlags = {};
G.debugHandle = () => ({
  tools: G.debugTools,
  snapshot() {
    const st = G.state, M = G.inMatchScene ? G.M : null, sc = G.game.scene;
    return { scene: G.game.sceneName, day: st && st.day, slot: st && st.slot, money: st && st.money, chips: st && st.chips, partner: st && st.partner, affinity: st && Object.assign({}, st.affinity), mood: st && Object.assign({}, st.mood), flags: st && Object.assign({}, st.flags),
      match: M && { phase: M.phase, score: M.rules.score.slice(), sets: M.rules.setsWon.slice(), serving: M.rules.serveSide, touches: M.touches, ball: [Math.round(M.ball.x), Math.round(M.ball.y), Math.round(M.ball.z)], players: M.players.map(p => ({ id: p.id, cast: p.cast, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), act: p.act })), over: M.over },
      ui: { screen: G.ui.shell && G.ui.shell.screen, focus: sc && sc.nav ? sc.nav.focus : null, overlays: G.overlay.list.map(o => o.id) }, attract: G.attract ? G.attract.beat : null, dev: !!G.overlay.get('dev') };
  }
});
/* ---- the panel ---- */
G.DEV_TABS = ['Tools', 'Match', 'Vacation', 'Minigames', 'Presentation', 'Tuning'];
G.devPanel = {
  unlocked: false,
  open() {
    if (G.hub || G.overlay.get('dev')) return;
    this.unlocked = true;
    const g = G.game, D = this.ov = { id: 'dev', modal: true, tab: 0, page: 0, nav: new G.Nav(), ts: g.timeScale, sel: { target: 3, day: 1, slot: 0, pair: 0, sl: 0, sr: 0, fighter: 0, mood: 0, roul: 17, tod: 12, weather: 0, voiceWho: 0, voiceLine: 0, song: 0, sfx: 0, rigF: 0, rigS: 0, rigP: 0, rigV: 0 },
      update(dt) { if (G.devStepN > 0) { G.devStepN--; g.timeScale = 1; } else g.timeScale = 0; return G.devPanel.update(this); },
      draw(r) { G.devPanel.draw(this, r); } };
    g.timeScale = 0; G.overlay.push(D); G.sfx('ui_select'); G.pushInput('MENU');
    if (G.M) { G.M.perfectPlayer = !!G.devFlags.perfect; G.M.cpuControl = !!G.devFlags.cpu; G.M.debugOverlay = !!G.devFlags.overlay; }
  },
  close() { const D = this.ov; if (!D) return; G.overlay.remove(D); G.game.timeScale = D.ts || 1; this.ov = null; G.popInput(); G.game.input.consumeAll(); G.sfx('ui_back'); },
  items(D) {
    const W = G.game.W, H = G.game.H, S = D.sel, T = G.debugTools, x = Math.round(W * .08), w = Math.round(W * .84), y0 = Math.round(H * .22), bw = Math.round((w - 6) / 2);
    const st = G.state, cast = G.FIGHTERS, songs = Object.keys(G.SONGS), sfx = Object.keys(G.SFX), voices = Object.keys(G.CAST);
    const step = (key, n) => ({ onLeft: () => { S[key] = (S[key] - 1 + n) % n; }, onRight: () => { S[key] = (S[key] + 1) % n; } });
    const row = (i, col, o) => Object.assign({ id: (o.label || 'r') + i + '_' + col, x: col === 2 ? x : x + col * (bw + 6), y: y0 + i * 20, w: col === 2 ? w : bw, h: 16 }, o);   // col 2: the full width
    const L = [];
    if (D.tab === 0) {
      L.push(row(0, 0, Object.assign({ kind: 'step', label: 'Scene', value: () => tname(SCENE_TARGETS[S.target]) }, step('target', SCENE_TARGETS.length))), row(0, 1, { label: 'Go', onPress: () => { const t = SCENE_TARGETS[S.target]; G.devPanel.close(); T.goto(t[0], t[1]); } }));
      L.push(row(1, 0, Object.assign({ kind: 'step', label: 'Day', value: () => 'Day ' + (S.day + 1) + ' · ' + G.SLOTS[S.slot] }, { onLeft: () => { S.slot--; if (S.slot < 0) { S.slot = 2; S.day = (S.day + 4) % 5; } }, onRight: () => { S.slot++; if (S.slot > 2) { S.slot = 0; S.day = (S.day + 1) % 5; } } })), row(1, 1, { label: 'Set day & slot', onPress: () => { T.setDay(S.day + 1, S.slot); G.toast('Day ' + (S.day + 1) + ' · ' + G.SLOTS[S.slot]); } }));
      L.push(row(2, 0, { label: 'Semifinal', onPress: () => { G.devPanel.close(); T.story('semi'); } }), row(2, 1, { label: 'Final', onPress: () => { G.devPanel.close(); T.story('final'); } }));
      L.push(row(3, 0, { label: 'Party', onPress: () => { G.devPanel.close(); T.story('party'); } }), row(3, 1, { label: 'Ending A / B', onPress: () => { G.devPanel.close(); T.story(G.chance('cosmetic', .5) ? 'endingA' : 'endingB'); } }));
      L.push(row(4, 0, { label: 'Credits', onPress: () => { G.devPanel.close(); T.story('credits'); } }), row(4, 1, { label: 'Restart scene', onPress: () => { const n = G.game.sceneName, d2 = G.game.scene && G.game.scene.loc ? { loc: G.game.scene.loc } : G.M && n === 'match' ? { cfg: G.M.cfg } : null; G.devPanel.close(); G.game.go(n, d2, { fade: 0 }); } }));
      L.push(row(5, 2, { label: 'Reset the save and unlocks', onPress: () => G.confirm('Erase every save and unlock?', () => { T.resetSave(); G.toast('Saves erased'); }, { destructive: true }) }));
    } else if (D.tab === 1) {
      const pairs = [['lola', 'tess'], ['rin', 'mei'], ['ingrid', 'amara'], ['sonny', 'pepper']];
      L.push(row(0, 0, Object.assign({ kind: 'step', label: 'Against', value: () => pairs[S.pair].map(G.castName).join(' & ') }, step('pair', pairs.length))), row(0, 1, { label: 'Start match', onPress: () => { G.devPanel.close(); const p = pairs[S.pair]; T.match({ cast: ['tess', 'amara', p[0], p[1]] }); } }));
      L.push(row(1, 0, { label: 'Point to the left', onPress: () => T.forcePoint(0) }), row(1, 1, { label: 'Point to the right', onPress: () => T.forcePoint(1) }));
      L.push(row(2, 0, Object.assign({ kind: 'step', label: 'Score', value: () => S.sl + ' - ' + S.sr }, { onLeft: () => { S.sl = (S.sl + 1) % 12; }, onRight: () => { S.sr = (S.sr + 1) % 12; } })), row(2, 1, { label: 'Set score', onPress: () => T.setScore(S.sl, S.sr) }));
      L.push(row(3, 0, { label: 'Win the match', onPress: () => { T.endMatch(true); G.devPanel.close(); } }), row(3, 1, { label: 'Lose the match', onPress: () => { T.endMatch(false); G.devPanel.close(); } }));
      L.push(row(4, 0, { kind: 'toggle', label: 'CPU plays you', value: () => G.devFlags.cpu ? 'ON' : 'OFF', onPress: () => T.cpuControl(!G.devFlags.cpu) }), row(4, 1, { kind: 'toggle', label: 'Perfect player', value: () => G.devFlags.perfect ? 'ON' : 'OFF', onPress: () => T.perfectPlayer(!G.devFlags.perfect) }));
      L.push(row(5, 0, { kind: 'toggle', label: 'Debug overlay', value: () => G.devFlags.overlay ? 'ON' : 'OFF', onPress: () => T.debugOverlay(!G.devFlags.overlay) }), row(5, 1, Object.assign({ kind: 'step', label: 'Slow motion', value: () => '×' + (G.devFlags.slow || 1) }, { onLeft: () => T.slowmo([1, .5, .25][([1, .5, .25].indexOf(G.devFlags.slow || 1) + 1) % 3]), onRight: () => T.slowmo([1, .5, .25][([1, .5, .25].indexOf(G.devFlags.slow || 1) + 2) % 3]) })));
      L.push(row(6, 0, { label: 'Frame step', onPress: () => T.step(1) }), row(6, 1, { label: 'Switch camera', onPress: () => T.camera() }));
    } else if (D.tab === 2) {
      const f = cast[S.fighter % cast.length];
      L.push(row(0, 0, { label: 'Money +10k', onPress: () => T.addMoney(10000) }), row(0, 1, { label: 'Money +100k', onPress: () => T.addMoney(100000) }));
      L.push(row(1, 0, { label: 'Money to 0', onPress: () => T.money(0) }), row(1, 1, { label: 'Chips +100', onPress: () => T.chips(100) }));
      L.push(row(2, 0, { label: 'Unlock all items', onPress: () => T.unlockAll() }), row(2, 1, { label: 'Fill gift bag ×3', onPress: () => T.fillBag() }));
      L.push(row(3, 0, Object.assign({ kind: 'step', label: 'Fighter', value: () => G.castName(f) }, step('fighter', cast.length))), row(3, 1, { kind: 'slider', label: 'Affinity', spec: { min: 0, max: 100, step: 5, value: st ? G.baseAff(st.me, f) : 25, unit: '' }, get: () => (st && st.affinity[f]) || 0, onLeft: () => T.affinity(f, G.aff(f) - 5), onRight: () => T.affinity(f, G.aff(f) + 5), onDrag: k => T.affinity(f, k * 100) }));
      L.push(row(4, 0, Object.assign({ kind: 'step', label: 'Mood', value: () => (st && G.MOOD_WORD[st.mood[f]]) || '-' }, { onLeft: () => T.mood(f, ['happy', 'normal', 'gloomy'][(['happy', 'normal', 'gloomy'].indexOf(st && st.mood[f]) + 2) % 3]), onRight: () => T.mood(f, ['happy', 'normal', 'gloomy'][(['happy', 'normal', 'gloomy'].indexOf(st && st.mood[f]) + 1) % 3]) })), row(4, 1, { label: st && st.partner === f ? 'Clear partner' : 'Make partner', onPress: () => T.partner(st && st.partner === f ? null : f) }));
      L.push(row(5, 2, { label: 'Reveal all likes', onPress: () => T.revealLikes() }));
    } else if (D.tab === 3) {
      L.push(row(0, 2, { kind: 'toggle', label: 'Pool Hop autopilot', value: () => G.devFlags.poolBot ? 'ON' : 'OFF', onPress: () => T.poolBot(!G.devFlags.poolBot) }));
      L.push(row(1, 0, { label: 'Slots: 7-7-7 next', onPress: () => { T.slotsForce('7'); G.toast('The next spin hits 7-7-7'); } }), row(1, 1, { label: 'Blackjack: deal one', onPress: () => { T.deal(); G.toast('The next hand is a blackjack'); } }));
      L.push(row(2, 0, Object.assign({ kind: 'step', label: 'Roulette number', value: () => S.roul }, { onLeft: () => { S.roul = (S.roul + 36) % 37; }, onRight: () => { S.roul = (S.roul + 1) % 37; } })), row(2, 1, { label: 'Force it', onPress: () => { T.rouletteForce(S.roul); G.toast('The wheel lands on ' + S.roul); } }));
    } else if (D.tab === 4) {
      L.push(row(0, 0, Object.assign({ kind: 'step', label: 'Time of day', value: () => S.tod + ':00' }, { onLeft: () => { S.tod = (S.tod + 23) % 24; }, onRight: () => { S.tod = (S.tod + 1) % 24; } })), row(0, 1, { label: 'Apply light', onPress: () => G.applyLight(S.tod < 6 || S.tod >= 20 ? 'night' : S.tod < 11 ? 'morning' : S.tod >= 17 ? 'sunset' : 'afternoon') }));
      L.push(row(1, 0, Object.assign({ kind: 'step', label: 'Weather', value: () => ['sunny', 'cloudy', 'rain'][S.weather] }, step('weather', 3))), row(1, 1, { label: 'Apply weather', onPress: () => { const w = ['sunny', 'cloudy', 'rain'][S.weather]; G.game.weather = w === 'rain' ? { kind: 'rain', amount: .6, wind: .25 } : null; if (G.state) G.state.weather[G.state.day - 1] = w; if (G.M) { G.M.wet = w === 'rain'; G.M.wind = w === 'rain' ? 14 : 0; } } }));
      L.push(row(2, 0, { kind: 'toggle', label: 'Show FPS', value: () => G.setting('showFps', false) ? 'ON' : 'OFF', onPress: () => G.game.settings.set('showFps', !G.setting('showFps', false)) }), row(2, 1, Object.assign({ kind: 'step', label: 'Music', value: () => songs[S.song] }, step('song', songs.length))));
      L.push(row(3, 0, Object.assign({ kind: 'step', label: 'Voice Lab', value: () => G.castName(voices[S.voiceWho]) }, step('voiceWho', voices.length))), row(3, 1, { label: 'Say a line', onPress: () => { const who = voices[S.voiceWho], keys = Object.keys(G.LINES[who] || {}), k = keys[S.voiceLine++ % Math.max(1, keys.length)]; const line = G.pickLine(who, k) || 'Hello there!'; G.voice.say(line, who); G.toast(G.castName(who), line); } }));
      L.push(row(4, 0, { label: 'Play the song', onPress: () => G.music(songs[S.song], { restart: true }) }), row(4, 1, Object.assign({ kind: 'step', label: 'SFX', value: () => sfx[S.sfx], onPress: () => G.sfx(sfx[S.sfx]) }, step('sfx', sfx.length))));
      L.push(row(5, 0, Object.assign({ kind: 'step', label: 'Rig sheet', value: () => G.castName(Object.keys(G.CAST)[S.rigF]) + ' · ' + G.SUIT_IDS[S.rigS] }, { onLeft: () => { S.rigF = (S.rigF + 1) % Object.keys(G.CAST).length; G.devPanel._rig = null; }, onRight: () => { S.rigS = (S.rigS + 1) % G.SUIT_IDS.length; G.devPanel._rig = null; } })), row(5, 1, Object.assign({ kind: 'step', label: 'Pose · view', value: () => ['vready', 'bump', 'set', 'blockup', 'spikearm', 'cheer', 'peace', 'sit'][S.rigP] + ' · ' + ['court', 'servecam', 'threequarter', 'iso'][S.rigV] }, { onLeft: () => { S.rigP = (S.rigP + 1) % 8; }, onRight: () => { S.rigV = (S.rigV + 1) % 4; } })));
    } else {
      const per = 6, list = G.TUNING.slice(D.page * per, D.page * per + per), pages = Math.ceil(G.TUNING.length / per);
      list.forEach((t, i) => L.push(row(i, 2, { id: 't_' + t.key, kind: 'slider', label: t.group + ' · ' + t.label, spec: t, get: () => G.T[t.key], onLeft: () => G.setTuning(t.key, t.toggle ? !G.T[t.key] : G.T[t.key] - t.step), onRight: () => G.setTuning(t.key, t.toggle ? !G.T[t.key] : G.T[t.key] + t.step), onDrag: k => G.setTuning(t.key, t.toggle ? !G.T[t.key] : t.min + k * (t.max - t.min)), onPress: t.toggle ? () => G.setTuning(t.key, !G.T[t.key]) : null, tkey: t.key })));
      L.push(row(6, 0, { label: 'Page ' + (D.page + 1) + '/' + pages + ' ▶', onPress: () => { D.page = (D.page + 1) % pages; D.nav.focus = null; } }), row(6, 1, { label: 'Reset all to defaults', onPress: () => G.confirm('Reset every slider to its default?', () => { G.resetTuning(); G.toast('Tuning reset'); }, { destructive: true }) }));
    }
    return L;
  },
  update(D) {
    const I = G.game.input, its = this.items(D), ev = D.nav.update(its, I);
    if (ev.tab) { D.tab = (D.tab + ev.tab + G.DEV_TABS.length) % G.DEV_TABS.length; D.page = 0; D.nav.focus = null; G.sfx('ui_tab'); }
    if (ev.extra) { const f = its.find(i => i.id === D.nav.focus); if (f && f.tkey) { G.resetTuning(f.tkey); G.sfx('ui_back'); } }
    if (ev.alt && D.tab === 5) { const json = JSON.stringify(G.tuningChanged(), null, 1); try { navigator.clipboard.writeText(json); G.toast('Copied the tuning JSON', Object.keys(G.tuningChanged()).length + ' changed'); } catch (e) { G.toast('Tuning JSON', json.slice(0, 40)); } }
    if (ev.back || I.pressed('pause') || I.pressed('esc')) this.close();
    // tabs by mouse
    const c = I.clicked(); if (c && this._tabRects) for (const t of this._tabRects) if (c[0] >= t.x && c[0] < t.x + t.w && c[1] >= t.y && c[1] < t.y + t.h) { D.tab = t.i; D.page = 0; D.nav.focus = null; }
    if (D.tab === 4 && this.ov) { const S = D.sel, ids = Object.keys(G.CAST); if (!this._rig || this._rigK !== S.rigF + ':' + S.rigS) { this._rig = G.makeRig(ids[S.rigF], G.CAST[ids[S.rigF]].host || G.CAST[ids[S.rigF]].staff ? {} : { suit: G.SUIT_IDS[S.rigS] }); this._rigK = S.rigF + ':' + S.rigS; } G.Anim.idle(this._rig, G.realDt, { x: 0, y: 0, z: 0, facing: G.now() + (G.game.real || 0), poseW: { [['vready', 'bump', 'set', 'blockup', 'spikearm', 'cheer', 'peace', 'sit'][S.rigP]]: 1 } }); }
    return true;
  },
  draw(D, r) {
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .6, 'multiply', () => px.rect(g, 0, 0, W, H, '#0a1018'));
      G.ui.panel(g, Math.round(W * .05), Math.round(H * .05), Math.round(W * .9), Math.round(H * .86), { title: 'DEV MODE · time frozen' });
      this._tabRects = G.ui.tabs(g, Math.round(W * .08), Math.round(H * .12), G.DEV_TABS, D.tab);
      for (const it of this.items(D)) {
        const on = D.nav.focus === it.id;
        if (it.kind === 'slider') G.ui.slider(g, it, on);
        else if (it.kind === 'step') G.ui.stepper(g, Object.assign({}, it, { value: it.value }), on);
        else if (it.kind === 'toggle') G.ui.button(g, Object.assign({}, it, { right: it.value() }), on);
        else G.ui.button(g, it, on);
      }
      if (D.tab === 4 && this._rig) { const vv = [E.VIEWS.court, E.VIEWS.servecam, E.VIEWS.threequarter, E.VIEWS.iso][D.sel.rigV]; px.ell(g, Math.round(W * .86), Math.round(H * .8), 18, 5, '#2ec4c9'); this._rig.draw(g, Math.round(W * .86), Math.round(H * .8), vv); }
      if (D.tab === 5) E.font.text(g, 'Every system reads these each step. The orange tick is the default.', Math.round(W * .08), Math.round(H * .82), '#9fd3d6', { outline: false });
      G.promptBar(g, r, D.tab === 5 ? [['move', 'Adjust'], ['extra', 'Reset one'], ['alt', 'Copy JSON'], ['tabL', 'Tab'], ['cancel', 'Back to game']] : [['confirm', 'Use'], ['move', 'Change'], ['tabL', 'Tab'], ['cancel', 'Back to game']]);
    });
  }
};
// F1 (or L3 + R3) reopens the dev panel once it has been opened from the pause menu
if (typeof window.addEventListener === 'function' && typeof document !== 'undefined') window.addEventListener('keydown', e => { if (e.code === 'F1' && G.devPanel.unlocked && !G.hub && !G.overlay.get('dev')) { e.preventDefault(); G.devPanel.open(); } });
G.devPadCheck = () => { const I = G.game.input; if (G.devPanel.unlocked && !G.hub && !G.overlay.get('dev') && I.held && I.held.has('Pad10') && I.held.has('Pad11')) G.devPanel.open(); };


/* ---- 54-results.js ---- */
/* 54-results: the end of a day (a summary card: money earned and spent, matches, affinity changes by each portrait,
 * tomorrow's weather, a partner who left, the other pairs' results), the credits (a slideshow of your postcards and the
 * party photo) and the vacation's results (a report card, a title, unlocks, New Vacation+). */
G.scenes.dayend = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.sum = G.dayEnd(); this.t = 0; this.nav = new G.Nav(); G.music('siesta'); G.themeName = 'night'; G.applyLight('night'); },
  items() { const W = G.game.W, H = G.game.H; return [{ id: 'go', x: Math.round(W / 2 - 50), y: Math.round(H * .9) - 18, w: 100, h: 18, label: 'Next morning', primary: true, onPress: () => { G.dayStart(); G.game.go('map', null, { fade: 'white', seconds: .5 }); } }]; },
  update(dt) { this.t += dt; if (this.t > .6) this.nav.update(this.items(), G.game.input); G.titleWorld.update(dt); },
  draw(r) {
    G.titleWorld.draw(r, { tod: 'night' });
    r.overlay(g => {
      const S = this.sum, W = r.W, H = r.H, st = G.state; px.blend(g, .55, 'multiply', () => px.rect(g, 0, 0, W, H, '#100820'));
      G.ui.title(g, 'DAY ' + S.day + ' IS OVER', W / 2, Math.round(H * .05), { scale: 2, colors: ['#ffffff', '#c8b0e0', '#7a5a92'] });
      const x = Math.round(W * .1), w = Math.round(W * .8), y = Math.round(H * .17);
      G.ui.panel(g, x, y, w, Math.round(H * .66), { theme: 'night' });
      E.font.text(g, 'Earned', x + 12, y + 10, '#9fd3d6', { outline: false }); G.ui.money(g, x + 60, y + 9, S.earned);
      E.font.text(g, 'Spent', x + 12, y + 22, '#9fd3d6', { outline: false }); G.ui.money(g, x + 60, y + 21, S.spent);
      E.font.text(g, 'Matches today: ' + S.matches, x + 12, y + 34, '#fff8e8', { outline: false });
      E.font.text(g, 'Money now', x + w - 110, y + 10, '#9fd3d6', { outline: false }); G.ui.money(g, x + w - 110, y + 21, st.money);
      if (S.tomorrow) { E.font.text(g, 'Tomorrow:', x + w - 110, y + 34, '#9fd3d6', { outline: false }); G.icon(g, S.tomorrow === 'rain' ? 'rain' : S.tomorrow === 'cloudy' ? 'cloudy' : S.tomorrow === 'golden' ? 'sunset' : 'sunny', x + w - 58, y + 34); E.font.text(g, S.tomorrow === 'golden' ? 'golden' : S.tomorrow, x + w - 48, y + 34, '#fff8e8', { outline: false }); }
      G.npcs(st).forEach((id, i) => {
        const xx = x + 12 + (i % 5) * Math.round((w - 24) / 5), yy = y + 52;
        G.portrait(g, G.portraitRig(id), xx, yy, 26, { frame: false }); const d = S.changes[id] || 0;
        E.font.text(g, d > 0 ? '↑ +' + d : d < 0 ? '↓ ' + d : '·', xx + 13, yy + 30, d > 0 ? '#9ff3a8' : d < 0 ? '#ff9a8a' : '#9fd3d6', { align: 'center', outline: false }); G.ui.hearts(g, xx - 10, yy + 41, st.affinity[id]);
      });
      let ly = y + 108;
      if (S.left) { E.font.text(g, G.CAST[S.left].name + ' left your team after today\'s loss. Find a new partner tomorrow.', x + 12, ly, '#ff9a8a', { outline: false, wrap: w - 24 }); ly += 20; }
      for (const [a, b, aw] of S.results) { E.font.text(g, 'Off-court: ' + a.map(G.castName).join(' & ') + (aw ? ' beat ' : ' lost to ') + b.map(G.castName).join(' & '), x + 12, ly, '#c8b0e0', { outline: false }); ly += 11; }
      this.nav.draw(g, this.items());
    });
  }
};
G.scenes.credits = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() { G.useInput('MENU'); this.t = 0; this.i = 0; this.done = false; G.music('farewell'); this.cards = (G.state && G.state.album.length ? G.state.album.slice(-8) : []); this.lines = ['AHEAD OR ALIVE', 'XTREME BEACH VOLLEYBALL', '', 'Design, code, art, music, writing', 'Claude (Anthropic, claude-opus-5-5)', '', 'Engine', 'my-3D2dge v0.85.2', '', 'Motion clips', 'Quaternius · Mesh2Motion · CMU mocap', '', 'Starring', 'Rin · Lola · Ingrid · Amara · Tess · Mei', 'Sonny Fortuna as himself', 'Pepper Quill as the House', 'Kai · Odette · Coach Bo', '', 'An original parody-tribute to', 'Dead or Alive Xtreme Beach Volleyball', '', 'Thanks for visiting Isla Fortuna!']; },
  update(dt) { this.t += dt; const I = G.game.input; if (this.t > 2 && (I.pressed('confirm') || I.pressed('cancel') || I.clicked())) this.finish(); if (this.t > 26) this.finish(); },
  finish() { if (this.done) return; this.done = true; G.game.go(G.state ? 'vresults' : 'title'); },
  draw(r) {
    const n = this.cards.length, k = n ? Math.floor(this.t / 4) % n : 0;
    if (n && G.photo) G.photo.renderSpec(r, this.cards[k], {}); else G.titleWorld.draw(r, { tod: 'sunset' });
    r.overlay(g => {
      px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#102030'));
      const y0 = r.H - this.t * 18;
      this.lines.forEach((l, i) => { const y = y0 + i * 14; if (y > -10 && y < r.H + 10) E.font.text(g, l, r.W / 2, Math.round(y), i < 2 ? '#ffd36a' : /^[A-Z][a-z]/.test(l) && !this.lines[i - 1] ? '#9fd3d6' : '#fff8e8', { align: 'center', scale: i < 2 ? 2 : 1, shadow: '#000', outline: false }); });
      G.promptBar(g, r, [['confirm', 'Skip']]);
    });
  }
};
G.vacationTitle = st => { const bf = G.npcs(st).filter(id => st.affinity[id] >= 80).length, gf = G.npcs(st).filter(id => st.affinity[id] >= 60).length; return st.flags.finalWon && bf >= 3 ? 'Island Icon' : st.flags.finalWon ? 'Fortuna Champion' : gf >= 3 ? 'Social Butterfly' : 'Beach Bum'; };
G.scenes.vresults = {
  view: 'court', input: G.PRESETS.MENU, camera: false,
  enter() {
    G.useInput('MENU'); this.t = 0; this.nav = new G.Nav(); G.music('sunrise');
    const st = G.state; this.title = G.vacationTitle(st);
    G.unlocks.finished = true; for (const s of G.SUIT_IDS) if (!G.unlocks.suits.includes(s)) G.unlocks.suits.push(s); G.saveUnlocks();
  },
  items() { const W = G.game.W, H = G.game.H; return [{ id: 'plus', x: Math.round(W / 2 - 110), y: Math.round(H * .9) - 18, w: 110, h: 18, label: 'New Vacation+', primary: true, onPress: () => this.plus() }, { id: 'title', x: Math.round(W / 2 + 6), y: Math.round(H * .9) - 18, w: 100, h: 18, label: 'Title', onPress: () => { G.state = null; G.game.go('title'); } }]; },
  plus() { const st = G.state; G.unlocks.plusFrom = { wardrobe: st.wardrobe, album: st.album, money: st.money, stats: st.stats, n: (st.nplus || 0) + 1 }; G.state = null; G.game.go('invitation'); },
  update(dt) { this.t += dt; if (this.t > .8) this.nav.update(this.items(), G.game.input); G.titleWorld.update(dt); },
  draw(r) {
    G.titleWorld.draw(r, { tod: 'sunset' });
    r.overlay(g => {
      const st = G.state, W = r.W, H = r.H, S = st.stats; px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, W, H, '#102030'));
      G.ui.title(g, 'VACATION RESULTS', W / 2, Math.round(H * .04), { scale: 2 });
      E.font.title(g, this.title.toUpperCase(), W / 2, Math.round(H * .13), { scale: 2, align: 'center', colors: ['#ffffff', '#ffd36a', '#ff9e5e'] });
      const bf = G.bestFriend(), cards = [['Money earned', G.fmtMoney(S.earned)], ['Matches', S.wins + '-' + (S.matches - S.wins)], ['Final', st.flags.finalWon ? 'Champion!' : 'Runner-up'], ['Suits collected', new Set(st.wardrobe.suits).size + '/' + G.SUIT_IDS.length], ['Gifts given', S.gifts], ['Best Pool Hop', S.poolBest ? S.poolBest.toFixed(1) + ' s' : '—'], ['Casino net', (S.casinoNet >= 0 ? '+' : '') + G.fmtChips(S.casinoNet)], ['Postcards', st.album.length]];
      const cw = Math.round(W * .2), x0 = Math.round(W / 2 - cw * 2 - 9);
      cards.forEach(([l, v], i) => { const x = x0 + (i % 4) * (cw + 6), y = Math.round(H * .27) + Math.floor(i / 4) * 32, kk = clamp((this.t - i * .08) / .3, 0, 1); G.ui.panel(g, x, y + (1 - kk) * 10, cw, 28, { alpha: .92 * kk }); E.font.text(g, l, x + 6, y + 4, '#9fd3d6', { outline: false }); E.font.text(g, String(v), x + 6, y + 15, '#ffd36a', { outline: false }); });
      G.ui.panel(g, Math.round(W / 2 - 90), Math.round(H * .54), 180, 40); G.portrait(g, G.portraitRig(bf), Math.round(W / 2 - 86), Math.round(H * .54) + 4, 32, { frame: false });
      E.font.text(g, 'Best friend', Math.round(W / 2 - 48), Math.round(H * .54) + 6, '#9fd3d6', { outline: false }); E.font.text(g, G.CAST[bf].name + ' · ' + G.stage(st.affinity[bf]), Math.round(W / 2 - 48), Math.round(H * .54) + 18, '#fff8e8', { outline: false }); G.ui.hearts(g, Math.round(W / 2 - 48), Math.round(H * .54) + 28, st.affinity[bf]);
      E.font.text(g, 'Unlocked: every swimsuit in Beach Match, and New Vacation+.', W / 2, Math.round(H * .74), '#9ff3a8', { align: 'center', shadow: '#000', outline: false });
      this.nav.draw(g, this.items());
    });
  }
};


/* ---- 55-about.js ---- */
/* 55-about: the About & Credits pages: Credits, Source Information, and the Testing, Engine and Prompt Feedback (the
 * same text as the build's final report and exit-interview.json, which tools/interview.mjs writes from G.ABOUT). */
G.ABOUT = {
  credits: [
    'Ahead or Alive: Xtreme Beach Volleyball is an original parody-tribute inspired by Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003). No assets from it are used. Every character, line, swimsuit, song and sound here is new.',
    '',
    'Design, code, art, music and writing: Claude (Anthropic, claude-opus-5-5), building from PLAN.md.',
    'Engine: my-3D2dge v0.85.2 (MIT, github.com/michaelcrosato/my-3d2dge), modified (see Engine Feedback).',
    'Motion clips via the engine\'s mocap sets: Quaternius Universal Animation Library (CC0), Mesh2Motion (CC0) and the CMU Graphics Lab Motion Capture Database (free for all uses).',
    'Online: the AI Hub session client 1.4.0 (github.com/michaelcrosato/ai-hub, lib/hub), unmodified.',
    'All music, sound effects and voices are synthesized in code at run time. No audio files.'
  ].join('\n'),
  source: [
    ['Date', '2026-11-03 22:54:53'],
    ['Source', 'Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003)'],
    ['Plan', 'PLAN.md'],
    ['Genre and Perspective', 'Sports: arcade 2-on-2 beach volleyball, with a light life-sim vacation (calendar, friendships, gifts, collecting) and minigames (rhythm Pool Hop, casino). Matches use a side-on TV Broadcast camera (a slight 12-degree yaw, pitch 30) and a behind-the-team Serve Cam; places use a top-down three-quarter view; the island map is isometric; shops and tables are full-screen pixel UI.'],
    ['Tech', 'my-3D2dge v0.85.2 (the handoff package, patched: see Engine Feedback), plain JavaScript in one IIFE, Canvas 2D (WebGPU lighting where the browser has it), the engine\'s Mocap player with a cut set of 31 clips (Quaternius, Mesh2Motion, CMU), the AI Hub session client 1.4.0. Built and tested with Node 24, Playwright 1.63.0 (Chromium) and Python 3\'s http.server for the hub harness. One self-contained HTML file, no network at run time.'],
    ['Art Direction', 'The engine\'s native PS1-era pixel art: HD Humanoid rigs in a new athletic build, dressed in procedurally drawn swimsuits (7 cuts, 14 pixel patterns) and accessories; resort props written as data shapes; time-of-day skies, sea and lighting; a gold-and-teal 10-foot pixel UI with hand-drawn button glyphs.'],
    ['Animation', 'The engine\'s procedural Humanoid rig, extended with 14 held poses and a timed arm and body overlay driven by the volleyball simulation (a spike\'s jump starts at its contact time minus its rise), plus 31 motion-capture clips played through Mocap.drive for celebrations, idles, dances, swimming and reactions.'],
    ['Audio', 'All in code with Web Audio: 9 original songs from a chord-aware song builder (steel, marimba, bell, organ and pluck instruments; a rally drum layer; a tempo lift at match point; key changes), 10 jingles, 50 sound effects, ambience loops (waves, wind, crowd, pool, casino, crickets) and Animalese-style gibberish voices synthesized letter by letter for every speaker.'],
    ['Online', 'AI Hub sessions (shared world, 1-4 players): the game\'s own card, one match on the hub\'s clock, host-authoritative rules and AI, every copy flying the ball from the same launches, client-judged touches the host validates, snapshots for positions, CPUs for empty or left seats, finish() with standings, awards and stats.'],
    ['Testing', 'One command (node test/run.mjs) that prints only failures and a count: 22 suites and 809 checks, all passing on the final run. Headless in Node with game.advance and game.debug: units (ball flight, rules, judge, data), AI-vs-AI match statistics, the vacation, shops, story, minigames, UI, attract, dev mode, saves, revisiting all 27 scene setups after random input, a fake-hub netcode test at 150 ms latency with jitter and 5% loss, and a scripted playthrough of the whole vacation as all six fighters, to both endings. In Chromium via Playwright from file://: a tour, the attract, an emulated touch-only phone, and a four-player Beach Match on two keyboard halves and two emulated controllers (navigator.getGamepads stubbed with standard-mapping pads). That run checks PlayStation and Xbox glyphs, Serve Cam in a live rally, every attract beat and every photo filter. No physical controller was tested. Also the engine\'s tools/check.mjs, the AI Hub harness on 127.0.0.1 (4 scenarios), and screenshots and rig sheets for the art. TESTING-LOG.md lists every issue found.'],
    ['Research', 'No web research. Read the engine handoff (API card, guide, index, asset card), the sports kit, the engine source for the Humanoid, Dialog, audio, input and Shell, the AI Hub protocol README, client and harness checks, and the engine repository\'s motion-capture catalogs. The source game was described from general knowledge, by the plan.'],
    ['Environment', 'Claude Code CLI (headless); Linux; browser unknown'],
    ['Model', 'Anthropic, claude-opus-5-5, reasoning effort xhigh'],
    ['Usage', 'Cost and tokens unknown (no meter was available to the model). By the system clock the build ran from 2026-11-03 22:54:53 (TASK.md\'s start time) to 2026-11-04 01:22:38 when this text was last updated, 2 h 27 min.']
  ],
  testing: [
    ['How many issues did testing catch?', '47 game issues, each listed in TESTING-LOG.md. Scripted tests caught 20, for example: rallies that never ended because the AI dug everything; a perfect player losing because the CPU spiked into the net; a starting partner never assigned; scene state carried from one visit to the next; Continue and Load crashing; Pool Hop\'s beat clock; the attract missing input during fades. Screenshots and rig sheets caught 27, for example: the net seen edge-on; overlapping text and panels; tiny text in the engine\'s HTML menus; two menu actions on one key for keyboard-half players; Serve Cam cutting off a player. Separately, 10 bugs in the tests themselves.'],
    ['How many would be considered critical issues / game breaking?', 'Seven: the Welcome Match never starting for Ingrid (no one liked her enough to partner up); the game freezing after the Welcome Match (a cutscene flag left set from the arrival); Pool Hop unwinnable when entered from the pool; the Final never called on a second vacation; the credits never ending on a second run; the title crashing while drawing its prompt in the browser (a name clash); and Continue and Load crashing (a missing function).'],
    ['What was the most helpful test you ran?', 'The scripted playthrough: six full vacations, one per fighter, from the invitation through every day\'s events, matches, minigames, shopping and gifts to both endings, the credits and the results. It found 5 of the 7 critical bugs, all of them state that only breaks on a later step or a second run. The revisit test (every scene entered twice, with random input in between) found the 7th.'],
    ['What was the least helpful test you ran?', 'The first version of "no match phase stuck over 15 seconds". It flagged long but legal rallies, not stuck states, until I redefined it as 15 seconds with no touch and no phase change.']
  ],
  engine: [
    ['What did you like most about the engine?', 'That the whole game runs headless in exact fixed steps. A full vacation, four networked copies of a match and the attract all run in Node in seconds and replay exactly, and the Humanoid is drawn from math, so new outfits and poses are code, not art files.'],
    ['Did you get stuck or guess wrong?', 'A few times. The Shell theme\'s font is a font family, not a CSS shorthand (the menus came out tiny). Mocap is a top-level const, not window.Mocap. game.go with a fade switches scenes later, so tests must wait. Scene objects are reused on every visit, so flags left in them break the next visit. And at yaw 0 the Broadcast view saw the net edge-on. I also trusted Input.halfKeys with menu presets: it gave two menu actions the same key, and I only noticed in a four-player screenshot.'],
    ['What was the most important thing you had to build yourself?', 'The volleyball simulation: closed-form ball flight with precomputed net and landing events, contact planning (who plays the ball, when, where and at what height), the timing judge, the AI with its error model, and a design where the same launches drive local and online play.'],
    ['What was the hardest part about using the engine?', 'Dressing the Humanoid in swimsuits. Its torso is one polygon in one color, so cuts and patterns needed a per-pixel torso fill inside the engine\'s draw code, kept in step with its depth sorting and shading.'],
    ['What did you change in the engine, and why? (none if nothing)', '(1) PlayStation symbols, arrows, accents and punctuation in the pixel font, for prompts and the writing. (2) Button symbols as a Game setting, PlayStation by default with Xbox as the option. (3) A per-letter dialog voice hook, for the Animalese voices. (4) Audio: a voice bus and Voices volume, audio.bus(), PeriodicWave instruments, and decay, filter and detune for music tracks, for the tropical score. (5) Humanoid: an athletic build, swimsuits (7 cuts, 14 patterns), patterned shirts, shorts, six hair styles, a sun hat and a visor, an accessories hook, sandal straps, 14 held poses and a timed arm and body overlay, for the cast and the volleyball moves. (6) input.reserveCombo, so Create + Options stays the AI Hub\'s. (7) touch: \'never\', for touch-only devices. (8) E.onStep, a hook that runs through fades and pauses, so the attract ends on any input. (9) Input.halfKeys gives each action a button no earlier action holds, so a menu preset\'s alt and extra no longer share keys with confirm and cancel on a keyboard half.'],
    ['If you could change one thing about the engine, what would it be?', 'Make scenes fresh instances on every visit, or say loudly that they persist. Sticky scene state caused more game-breaking bugs than anything else.']
  ],
  prompt: [
    ['What did you like most about this prompt?', 'The definition of done, the testing rules (one command, only failures printed) and the exact exit-interview shape. Together with a detailed plan they left little to guess about what finished means.'],
    ['What was confusing?', 'The plan\'s file names and date came from a different run (claude-opus-5-5-max-20261103-174749) than TASK.md\'s (xhigh-20261103-225453); TASK.md winning settled it. Usage asks for cost and token estimates the model cannot see.'],
    ['What was the hardest thing to do?', 'The breadth with no stubs allowed: a match engine, a five-day vacation sim, three casino games, Pool Hop, postcards, a story with two endings, local and online multiplayer, an attract mode and dev tools, all real and tested. Balancing the volleyball AI so rallies felt right took the most iterations.'],
    ['What would you change in this prompt?', 'Let the plan derive its paths and dates from TASK.md instead of hard-coding them, say how to report Usage when no meter exists, and either give a time budget or allow the core to ship first, with the rest flagged as follow-ups.']
  ]
};
G.aboutPages = () => [
  { title: 'Credits', text: G.ABOUT.credits },
  { title: 'Source Information', text: G.ABOUT.source.map(([k, v]) => k + ': ' + v).join('\n\n') },
  { title: 'Testing Feedback', text: G.ABOUT.testing.map(([q, a]) => q + '\n' + a).join('\n\n') },
  { title: 'Engine Feedback', text: G.ABOUT.engine.map(([q, a]) => q + '\n' + a).join('\n\n') },
  { title: 'Prompt Feedback', text: G.ABOUT.prompt.map(([q, a]) => q + '\n' + a).join('\n\n') }
];


/* ---- 99-main.js ---- */
/* 99-main: build the game (session options in an AI Hub session), the settings, the pause actions, the scenes and the
 * boot, then start. */
if (!window.AOA_NO_BOOT) {
  const hub = G.hub, touchOnly = !hub && G.touchOnly();
  G.TOUCH_ONLY_AT_BOOT = touchOnly;
  const photoOK = () => !hub && !G.attract && G.photo && G.photo.allowed();
  const SETTINGS = [
    { key: 'difficulty', label: 'Difficulty', options: ['Easy', 'Normal', 'Hard', 'Pro'], value: 'Normal', help: 'How well the opponents play' },
    { key: 'assist', label: 'Timing assist', options: ['Tight', 'Normal', 'Generous'], value: 'Normal', help: 'How wide the timing windows are' },
    { key: 'autoMove', label: 'Auto-run to the ball', value: true, help: 'With the stick still, you run to the ball you are playing' },
    { key: 'autoReceive', label: 'Auto-receive', value: false, help: 'A first touch you miss is played OK for you' },
    { key: 'ring', label: 'Timing ring', value: true, help: 'The ring on the sand that shows where and when' },
    { key: 'matchCam', label: 'Match camera', options: ['Broadcast', 'Serve Cam'], value: 'Broadcast' },
    { key: 'textSpeed', label: 'Text speed', options: ['Slow', 'Normal', 'Fast', 'Instant'], value: 'Normal' },
    { key: 'commentary', label: 'Commentary', value: true, help: "Sonny's play-by-play" }
  ];
  const items = () => [
    ['How to Play', () => { G.game.resume(); G.howtoOverlay && G.howtoOverlay(); }],
    photoOK() && ['Take a Postcard', () => { G.game.resume(); G.photo.open(); }],
    !hub && G.devPanel && ['Dev Mode', () => { G.game.resume(); G.devPanel.open(); }]
  ];
  const game = G.game = new E.Game({
    canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
    menu: hub ? false : { items, settings: SETTINGS, controls: G.ACTION_NAMES, quit: 'title', saves: false },
    autoPause: !hub, corner: !hub, fullscreen: hub ? false : true, touch: (touchOnly || hub) ? 'never' : 'auto', backGesture: !hub
  });
  game.input.reserveCombo = [8, 9];   // engine patch 6: Create + Options is the AI Hub's
  game.audio.instruments = G.INSTRUMENTS;
  G.defineSounds();
  if (!hub) G.ui.shell = new E.Shell(game, { theme: { ink: '#fff8e8', paper: '#0a2d3d', accent: '#ffd36a', muted: '#9fd3d6', danger: '#ff5f7a', line: '#f6d38a', font: '"Trebuchet MS", system-ui, sans-serif', titleFont: '"Trebuchet MS", system-ui, sans-serif' } });
  G.tenFootCSS();
  // overlays run on real time while the game is frozen (the dev panel, photo mode)
  let lastReal = 0;
  const scenes = {};
  for (const k in G.scenes) scenes[k] = G.wrapScene(k, G.scenes[k]);
  const realTick = { update() { const n = game.real || 0; G.realDt = clamp(n - lastReal || 1 / 120, 0, .05); lastReal = n; G.tickWheel(); } };
  for (const k in scenes) { const u = scenes[k].update; scenes[k].update = function (dt) { realTick.update(); return u.call(this, dt); }; }
  const boot = { title: 'AHEAD OR ALIVE', version: G.VERSION, messages: ['Raking the sand', 'Inflating volleyballs', 'Chilling the smoothies', "Counting Sonny's chips", 'Polishing the golden sunglasses'], steps: [
    ['Raking the sand', () => { G.courtMap = G.makeCourtMap(); }],
    ['Inflating volleyballs', () => { G.Anim.init(); }],
    ['Chilling the smoothies', () => { G.loadUnlocks && G.loadUnlocks(); G.buildWorld && G.buildWorld(); }],
    ["Counting Sonny's chips", () => { for (const id of Object.keys(G.CAST)) G.portraitRig(id); }],
    ['Polishing the golden sunglasses', () => { G.afterBoot && G.afterBoot(); }]
  ] };
  game.debug = G.debugHandle ? G.debugHandle() : { snapshot: () => ({ scene: game.sceneName }) };
  const start = hub ? 'hub' : (location.hash || '').slice(1) && scenes[(location.hash || '').slice(1)] ? (location.hash || '').slice(1) : 'title';
  game.start({ scenes, scene: start, boot });
}


})();
