(() => {
'use strict';
const E = My3D2dge, G = {}; window.AOA = G;
// ==== 00-core.js ====
/* AHEAD OR ALIVE: XTREME BEACH VOLLEYBALL
 * Core loop: pick where to spend each morning, afternoon and night of a five-day island vacation; win 2-on-2 beach
 * volleyball with a partner you befriend through chats and gifts; spend the prize money on swimsuits, gifts and casino
 * nights; then beat the island's owner in the Fortuna Cup final.
 * 00-core: the G namespace, random streams, the event bus, the overlay stack, the scene wrapper, small helpers. */
const { px, clamp, lerp } = E;
G.VERSION = '1.0.0';
G.SCENES = {};
G.TITLE = 'Ahead or Alive: Xtreme Beach Volleyball';

/* ---- random streams: gameplay never calls Math.random. world (schedules, moods, weather, stock), match (AI rolls,
 * net cords), casino, cosmetic (crowd, particles, voices: never affects state) ---- */
G._streams = {};
G.seed = (name, seed) => { G._streams[name] = E.rng((seed >>> 0) || 1); };
G.rng = name => { if (!G._streams[name]) G.seed(name, G.hash(name) ^ 0x9e3779b9); return G._streams[name](); };
G.rint = (name, a, b) => a + Math.floor(G.rng(name) * (b - a + 1));
G.rpick = (name, list) => list[Math.floor(G.rng(name) * list.length)];
G.rshuffle = (name, list) => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(G.rng(name) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
G.hash = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/* ---- event bus ---- */
G.bus = { h: {}, on(ev, fn) { (this.h[ev] = this.h[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { this.h[ev] = (this.h[ev] || []).filter(f => f !== fn); },
  emit(ev, data) { for (const f of (this.h[ev] || []).slice()) { try { f(data); } catch (e) { G.game && G.game.fail('bus ' + ev, e); } } } };

/* ---- overlays: a stack over every scene (dev panel, photo mode, notices). The top one that wants input takes it ---- */
G.overlay = {
  list: [],
  push(o) { this.list.push(o); if (o.open) o.open(); return o; },
  remove(o) { const i = this.list.indexOf(o); if (i >= 0) { this.list.splice(i, 1); if (o.close) o.close(); } },
  top() { return this.list[this.list.length - 1]; },
  has(kind) { return this.list.some(o => o.kind === kind); },
  update(dt) { let took = false; for (let i = this.list.length - 1; i >= 0; i--) { const o = this.list[i]; if (o.update && o.update(dt, !took) && o.modal !== false) took = true; } return took; },
  draw(r) { for (const o of this.list) if (o.draw) o.draw(r); }
};
/** every scene runs through this: overlays first (they can take the input), then the scene; overlays drawn on top */
G.wrapScene = (name, s) => {
  const u = s.update, d = s.draw;
  s.update = function (dt) {
    G.realDt = dt; for (const n of G.notices) n.t += 1 / 120;
    if (G.attract && G.attract.watch) G.attract.watch(G.unscaledDt || dt);
    if (G.overlay.update(G.unscaledDt || dt)) { if (G.stepOnce > 0 && u) { G.stepOnce--; u.call(this, 1 / 120); } return; }
    if (u) u.call(this, dt);
  };
  s.draw = function (r) { if (d) d.call(this, r); G.overlay.draw(r); if (G.drawNotices) G.drawNotices(r); };
  s.name = name;
  return s;
};

/* ---- helpers ---- */
G.fmtMoney = n => 'S$' + Math.round(n).toLocaleString('en-US');
G.fmt = n => Math.round(n).toLocaleString('en-US');
G.ease = E.ease;
G.approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
G.dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
G.wrapText = (s, w) => E.font.wrap(s, w);
G.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
G.store = { get: (k, d) => E.store.get(k, d), set: (k, v) => { try { E.store.set(k, v); } catch (e) { /* storage blocked */ } } };
G.inHub = () => !!(window.AIHub && window.AIHub.active);
/** notices: short lines at the top of the screen (the game's toasts, drawn on the canvas) */
G.notices = [];
G.toast = (title, text = '', sec = 3) => { G.notices.push({ title, text, t: 0, sec }); if (G.notices.length > 3) G.notices.shift(); };

// ==== 01-tuning.js ====
/* 01-tuning: every live slider the dev panel shows. G.T is read by every system every step. */
G.TUNING = [
  // group, key, default, min, max, step, label
  ['Ball', 'ballGravity', 330, 180, 500, 5, 'Gravity'],
  ['Ball', 'ballDrag', .12, 0, .6, .01, 'Air drag'],
  ['Ball', 'passT', 1.05, .7, 1.6, .05, 'Pass flight (s)'],
  ['Ball', 'setT', 1.1, .7, 1.6, .05, 'Set flight (s)'],
  ['Ball', 'serveT', 1.3, .9, 1.8, .05, 'Float serve flight (s)'],
  ['Ball', 'jumpServeT', .85, .6, 1.3, .05, 'Jump serve flight (s)'],
  ['Ball', 'spikeSpeed', 330, 220, 480, 5, 'Spike speed'],
  ['Ball', 'shotT', .95, .6, 1.4, .05, 'Shot flight (s)'],
  ['Ball', 'netCordOver', .45, 0, 1, .05, 'Net cord rolls over'],
  ['Timing', 'perfectWin', .05, .02, .12, .005, 'PERFECT window (s)'],
  ['Timing', 'greatWin', .10, .05, .2, .005, 'GREAT window (s)'],
  ['Timing', 'okWin', .16, .08, .3, .01, 'OK window (s)'],
  ['Timing', 'reach', 14, 8, 24, 1, 'Reach'],
  ['Timing', 'diveReach', 16, 6, 30, 1, 'Dive reach'],
  ['Timing', 'blockRise', .28, .15, .45, .01, 'Block rise (s)'],
  ['Players', 'runSpeed', 96, 60, 140, 2, 'Run speed'],
  ['Players', 'autoMove', .85, 0, 1, .05, 'Auto-run strength'],
  ['AI', 'aiSkillMul', 1, .3, 1.6, .02, 'AI skill ×'],
  ['AI', 'aiReaction', .25, 0, .6, .01, 'AI reaction (s)'],
  ['AI', 'aiSpeedMul', 1, .6, 1.4, .02, 'AI speed ×'],
  ['AI', 'chemistry', .3, 0, .6, .02, 'Partner chemistry weight'],
  ['Match', 'pointsToWin', 7, 3, 21, 1, 'Points to win (vacation)'],
  ['Economy', 'prizeMul', 1, 0, 3, .05, 'Prize money ×'],
  ['Economy', 'priceMul', 1, .25, 3, .05, 'Shop prices ×'],
  ['Economy', 'startMoney', 30000, 0, 200000, 5000, 'Starting money'],
  ['Social', 'affinityGainMul', 1, 0, 3, .05, 'Affinity gains ×'],
  ['Social', 'affinityDecay', 2, 0, 10, 1, 'Daily affinity drift'],
  ['Social', 'inviteThreshold', 40, 0, 100, 1, 'Team-up threshold'],
  ['Social', 'giftThreshold', 0, -3, 3, 1, 'Gift acceptance threshold'],
  ['Pool Hop', 'poolBpm', 112, 80, 150, 2, 'Tempo (bpm)'],
  ['Pool Hop', 'poolWindowMul', 1, .5, 2, .05, 'Timing windows ×'],
  ['Pool Hop', 'poolTime', 40, 20, 80, 1, 'Time limit (s)'],
  ['Casino', 'slotsPayMul', 1, .5, 1.5, .01, 'Slot payouts ×'],
  ['Casino', 'dealerHitsSoft17', 0, 0, 1, 1, 'Dealer hits soft 17'],
  ['Casino', 'rouletteDoubleZero', 0, 0, 1, 1, 'Double-zero wheel'],
  ['Presentation', 'textSpeed', 45, 10, 200, 5, 'Text speed (letters/s)'],
  ['Presentation', 'cameraZoomMul', 1, .7, 1.3, .02, 'Match camera zoom ×']
].map(([group, key, def, min, max, step, label]) => ({ group, key, def, min, max, step, label }));
G.TUNE = {}; for (const t of G.TUNING) G.TUNE[t.key] = t;
G.T = {};
G.resetTuning = (key) => {
  for (const t of G.TUNING) if (!key || key === t.key) G.T[t.key] = t.def;
  G.saveTuning();
};
G.saveTuning = () => { const o = {}; for (const t of G.TUNING) if (G.T[t.key] !== t.def) o[t.key] = G.T[t.key]; if (!G.inHub()) G.store.set('aoa-dev-tuning', o); };
G.loadTuning = () => {
  for (const t of G.TUNING) G.T[t.key] = t.def;
  const o = G.inHub() ? {} : G.store.get('aoa-dev-tuning', {}) || {};
  for (const k in o) if (G.TUNE[k] && typeof o[k] === 'number') G.T[k] = clamp(o[k], G.TUNE[k].min, G.TUNE[k].max);
};
G.loadTuning();
/** difficulty offsets for the AI's skill (§4.7) and spike assist */
G.DIFF = { Easy: { ai: -.2, assist: 99 }, Normal: { ai: 0, assist: 4 }, Hard: { ai: .12, assist: 0 }, Pro: { ai: .22, assist: 0 } };
G.ASSIST = { Tight: .8, Normal: 1, Generous: 1.6 };

// ==== 02-data-cast.js ====
/* 02-data-cast: the six fighters, the hosts and the staff: looks, stats, tastes, voices, schedules and lines. */
G.FIGHTERS = ['rin', 'lola', 'ingrid', 'amara', 'tess', 'mei'];
G.CAST = {
  rin: { name: 'Rin Takamine', short: 'Rin', epithet: 'The Quiet Blade', from: 'Japan', style: 'Kendo & iaido champion', age: 24,
    size: 1.22, hair: { style: 'ponytail', color: '#1d1a24' }, bangs: .6, skin: '#f1cfb2', eye: '#4a2c22',
    personality: 'Composed perfectionist. Dry one-liners. Secretly adores cute things.',
    tastes: ['classic', 'elegant'], stats: { POW: 5, TEC: 9, SPD: 7, JMP: 6 },
    voice: { base: 330, range: 3, rate: 13, formant: 1.05, wave: 'triangle' }, suit: 'seigaiha', acc: ['ribbon'], ribbon: '#d8303a',
    celebrate: 'bow', color: '#4a6ad8' },
  lola: { name: 'Dolores "Lola" Vega', short: 'Lola', epithet: 'La Tormenta', from: 'Mexico', style: 'Luchadora (pro wrestler)', age: 27,
    size: 1.30, shoulder: .25, hair: { style: 'curly', color: '#3a2218' }, bangs: .4, skin: '#b9825a', eye: '#3a2416', band: '#d8302a',
    personality: 'Loud, warm, theatrical. Trash-talks with a grin. Lives for a crowd.',
    tastes: ['bold', 'sporty'], stats: { POW: 9, TEC: 5, SPD: 5, JMP: 8 },
    voice: { base: 260, range: 6, rate: 16, formant: .95, wave: 'saw' }, suit: 'estrella', acc: ['sweatband'],
    celebrate: 'fistpump', color: '#d8302a' },
  ingrid: { name: 'Ingrid Halvorsen', short: 'Ingrid', epithet: 'The Glacier', from: 'Norway', style: 'Glima wrestling & kickboxing', age: 26,
    size: 1.38, hair: { style: 'braid', color: '#f2ead2' }, bangs: .5, skin: '#f7dccb', eye: '#5aa0d8',
    personality: 'Stoic and deadpan. Hates the heat, misses snow. Secretly a karaoke fiend.',
    tastes: ['sporty', 'classic'], stats: { POW: 7, TEC: 6, SPD: 4, JMP: 9 },
    voice: { base: 210, range: 2, rate: 10, formant: .9, wave: 'triangle' }, suit: 'fjord', acc: ['sportshades'],
    celebrate: 'nod', color: '#5aa0d8' },
  amara: { name: 'Amara Okafor', short: 'Amara', epithet: 'Rhythm Queen', from: 'UK / Nigeria', style: 'Capoeira & dance fighting', age: 22,
    size: 1.26, hair: { style: 'puff', color: '#2a1810' }, bangs: .2, skin: '#7a4a2e', eye: '#2a1810', cuffs: '#ffd36a',
    personality: 'Cheerful social butterfly. Loves music and fashion. Dramatic.',
    tastes: ['bold', 'cute'], stats: { POW: 5, TEC: 6, SPD: 9, JMP: 8 },
    voice: { base: 340, range: 7, rate: 15, formant: 1.1, wave: 'pulse', sing: true }, suit: 'kentepop', acc: ['hibiscus'],
    celebrate: 'dance', color: '#ff8a1e' },
  tess: { name: 'Tess Callahan', short: 'Tess', epithet: 'Riptide', from: 'Australia', style: 'Surfer & MMA brawler', age: 25,
    size: 1.28, hair: { style: 'bob', color: '#f0d890' }, bangs: .7, skin: '#e2ad84', eye: '#3c7a5a',
    personality: 'Laid-back but fiercely competitive. Cheeky and outdoorsy.',
    tastes: ['sporty', 'bold'], stats: { POW: 7, TEC: 7, SPD: 7, JMP: 6 },
    voice: { base: 290, range: 5, rate: 14, formant: 1.0, wave: 'saw', rise: true }, suit: 'reefbreak', acc: ['wristbands'],
    celebrate: 'shaka', color: '#1fb7b0' },
  mei: { name: 'Mei-Lin Zhou', short: 'Mei', epithet: 'Little Phoenix', from: 'Hong Kong', style: 'Wushu acrobat & xiangqi prodigy', age: 21,
    size: 1.16, hair: { style: 'twinbuns', color: '#1a1418' }, bangs: .8, skin: '#f3d2b8', eye: '#3a2420', ribbon: '#ff6aa8',
    personality: 'Mischievous prankster with a sweet tooth. Hates losing at anything.',
    tastes: ['cute', 'elegant'], stats: { POW: 4, TEC: 8, SPD: 8, JMP: 6 },
    voice: { base: 400, range: 6, rate: 18, formant: 1.18, wave: 'pulse' }, suit: 'peony', acc: ['ribbon'],
    celebrate: 'backflip', color: '#ff6aa8' },
  sonny: { name: 'Sonny Fortuna', short: 'Sonny', epithet: 'The Man with the Golden Tan', host: true, build: 'bulky', size: 1.32,
    hair: { style: 'spiky', color: '#121014' }, skin: '#d9a27a', eye: '#2a1a10', shirt: { cloth: '#2fb5a0', pants: '#f4f4f0', trim: '#ffd36a' },
    stats: { POW: 8, TEC: 5, SPD: 5, JMP: 5 }, voice: { base: 120, range: 7, rate: 13, formant: .8, wave: 'saw', vib: 6 },
    suit: 'house_sonny', acc: ['aviators'], celebrate: 'cheer2', color: '#ffd36a' },
  pepper: { name: 'Pepper Quill', short: 'Pepper', epithet: 'Concierge', host: true, size: 1.24, hair: { style: 'bun', color: '#5a2a1e' }, bangs: .5,
    skin: '#f0c8a8', eye: '#3a2a20', shirt: { cloth: '#1d2433', pants: '#1d2433', trim: '#ffd36a' }, glasses: true,
    stats: { POW: 6, TEC: 10, SPD: 7, JMP: 6 }, voice: { base: 230, range: 1, rate: 17, formant: 1.0, wave: 'triangle' },
    suit: 'pinstripe', acc: [], celebrate: 'salute', color: '#c86a4a' },
  kai: { name: 'Kai Makoa', short: 'Kai', staff: true, build: 'heroic', size: 1.25, hair: { style: 'short', color: '#141010' }, skin: '#a8714a', eye: '#2a1a10',
    shirt: { cloth: '#2fb5a0', pants: '#c8b080', trim: '#ffe0a0' }, voice: { base: 170, range: 4, rate: 12, formant: .85, wave: 'triangle' }, color: '#2fb5a0' },
  odette: { name: 'Odette Belrose', short: 'Odette', staff: true, size: 1.2, hair: { style: 'long', color: '#c8b8e8' }, skin: '#f4d8c8', eye: '#4a3a6a',
    robe: '#ff8aa8', hat: 'sunhat', voice: { base: 300, range: 5, rate: 12, formant: 1.1, wave: 'pulse' }, color: '#ff8aa8' },
  bo: { name: 'Coach Bo Brannigan', short: 'Bo', staff: true, build: 'bulky', size: 1.28, hair: { style: 'bald', color: '#5a3a2a' }, skin: '#e0a880', eye: '#2a1a10',
    shirt: { cloth: '#ffd04a', pants: '#2a5ab8', trim: '#ffffff' }, hat: 'visor', voice: { base: 150, range: 3, rate: 14, formant: .85, wave: 'square' }, color: '#ffd04a' }
};
G.STATS_ORDER = ['POW', 'TEC', 'SPD', 'JMP'];
G.STAT_NAMES = { POW: 'Power', TEC: 'Technique', SPD: 'Speed', JMP: 'Jump' };
G.WEATHER_TASTE = { ingrid: { like: ['cloudy', 'rain'], dislike: [] }, amara: { like: ['sunny'], dislike: ['rain'] }, tess: { like: ['sunny'], dislike: [] } };
/** one symmetric starting affinity per pair */
G.BASE_AFF = {
  'rin-lola': 20, 'rin-ingrid': 35, 'rin-amara': 25, 'rin-tess': 30, 'rin-mei': 40,
  'lola-ingrid': 25, 'lola-amara': 40, 'lola-tess': 45, 'lola-mei': 20,
  'ingrid-amara': 20, 'ingrid-tess': 35, 'ingrid-mei': 25,
  'amara-tess': 30, 'amara-mei': 40, 'tess-mei': 25
};
G.baseAff = (a, b) => G.BASE_AFF[a + '-' + b] || G.BASE_AFF[b + '-' + a] || 25;
/** schedule weights: daytime Beach / Pool / Promenade / away; night Casino / away */
G.SCHEDULE = {
  rin: [[4, 2, 3, 1], [4, 3, 2, 1], [3, 7]], lola: [[5, 2, 2, 1], [5, 2, 2, 1], [6, 4]], ingrid: [[3, 4, 2, 1], [2, 5, 2, 1], [2, 8]],
  amara: [[3, 2, 4, 1], [3, 3, 3, 1], [7, 3]], tess: [[6, 2, 1, 1], [5, 3, 1, 1], [4, 6]], mei: [[2, 3, 4, 1], [3, 2, 4, 1], [8, 2]]
};
G.GOOD_SPORTS = ['tess', 'rin'];

/* ---- lines (short: two lines of about 36 letters a page). Sonny speaks in ALL-CAPS bursts; Pepper never exclaims ---- */
G.LINES = {
  rin: {
    greet: ['Good morning. The sand is... adequate.', 'You again. Good. I wanted a sparring partner.', 'Ah. My favorite person on this island.'],
    chat: ['I practice my swing at dawn. The sea does not judge.', 'Volleyball is just kendo with a softer sword.',
      'My sister sends me photos of cats. I pretend not to care.', 'Footwork is everything. In sand, doubly so.',
      'I bought a tiny seal keychain. Tell no one.', 'With you on the court, I can stop overthinking.'],
    love: ['...It is so round. I will name him Admiral.', 'This is perfect. You pay attention. I like that.'],
    like: ['A thoughtful choice. Thank you.', 'I will use this. Often.'],
    neutral: ['Oh. Thank you. I suppose.'],
    refuse: ['My heart rate is fine as it is. Thank you.', 'I must decline. Respectfully. Firmly.'],
    suitYes: 'Simple lines. Clean colors. Yes.', suitNo: 'Not really my style. Too loud.',
    inviteYes: ['A partnership. Acceptable. Let us win.', 'I accept. Do not make me regret it.'],
    inviteNo: ['I do not know your rhythm yet.', 'Not today. Show me more first.'],
    leaveTeam: 'My partner will be... displeased. So be it.',
    taunt: ['Your stance is sloppy. I noticed.', 'One cut. One point. Watch.'],
    win: ['A clean victory. As planned.', 'Precision wins. Again.'], loss: ['I will reflect on this. Deeply.', 'Unacceptable. Rematch.'],
    bark: ['Mine.', 'Yours. Go.'],
    visit: { lines: ['I brought matcha. It is late.', 'Do you ever feel the island is too loud?'], choices: ['It is. Stay a while.', 'I like loud.'], good: 0 },
    farewell: ['Goodbye. It was... fine.', 'I will miss this. I will miss you. There, I said it.'],
    ending: 'Same time next year. I will be sharper.'
  },
  lola: {
    greet: ['¡Hola, compañera! Ready to bring the THUNDER?', 'There she is! The crowd loves you, you know.', '¡Mi hermana! Today we make history!'],
    chat: ['In the ring I fly off the top rope. Here? The sand!', 'I eat hot sauce for breakfast. Every day. ¡Fuerza!',
      'My abuela taught me to spike. With a tortilla.', 'A luchadora never shows fear. Except of crabs.',
      'You and me, we are a TAG TEAM now. Yes?', 'When I win, I win for everyone. Even you, when you lose!'],
    love: ['THIS! This is the fuel of champions!', '¡AY! You know me too well, hermana!'],
    like: ['Oh, nice! Muy bien!', 'For me? You are sweet!'],
    neutral: ['Huh. Okay! Thanks!'],
    refuse: ['A book? On vacation? Ay, you are funny.', 'No, no, no. Not for La Tormenta.'],
    suitYes: '¡Sí! Bold! Loud! Like me!', suitNo: 'Not really my style. Too quiet!',
    inviteYes: ['¡VAMOS! Together we are unstoppable!', 'A tag team! Finally! Let us GO!'],
    inviteNo: ['Hmm. Show me your fire first.', 'Not yet, amiga. Not yet.'],
    leaveTeam: 'My old partner will cry. Then she will get over it!',
    taunt: ['I hope you brought a helmet!', 'The storm is coming, chicas!'],
    win: ['¡VICTORIA! Somebody ring the bell!', 'Thank you, thank you! Hold the applause! No, keep it!'], loss: ['Bah! The sand was slippery!', 'Rematch. Steel cage. Tomorrow.'],
    bark: ['¡MÍA!', '¡Tuya, tuya!'],
    visit: { lines: ['¡Sorpresa! I brought tacos!', 'Do you think I am too loud?'], choices: ['Never. Be loud.', 'A little, yes.'], good: 0 },
    farewell: ['Adiós! Do not forget me!', 'Hermana... I will miss you so much! Group hug!'],
    ending: 'Next year, we wrestle. On the beach. I am calling it.'
  },
  ingrid: {
    greet: ['It is thirty-one degrees. I am melting. Hello.', 'Ah. You. I am still melting.', 'Hello, friend. The heat is easier with you here.'],
    chat: ['In Norway it is snowing. I checked. Twice.', 'I wrestled a bear once. Small bear. Still counts.',
      'Sunscreen factor one hundred. Applied hourly.', 'Do not tell anyone, but I sing in the shower.',
      'You are... not bad company. For a warm-blooded person.', 'Karaoke at the casino. Thursday. You did not hear this.'],
    love: ['Snow. Tiny, perfect snow. I may cry.', 'Wool. In this heat. Genius. Thank you.'],
    like: ['Practical. I approve.', 'Good. This is useful.'],
    neutral: ['Thank you. I will find a place for it.'],
    refuse: ['Glitter gets everywhere. Everywhere.', 'No. But I appreciate the thought. Barely.'],
    suitYes: 'Functional. Covered. I like it.', suitNo: 'Not really my style. Too much sun on me.',
    inviteYes: ['Very well. I will block. You will do the rest.', 'Partners. I will try to smile.'],
    inviteNo: ['I prefer to know someone before I trust them with my spikes.', 'No. Not yet. Earn it.'],
    leaveTeam: 'My partner will understand. Probably.',
    taunt: ['The Glacier does not move. You do.', 'I block. You weep. Simple.'],
    win: ['Victory. Now I need shade.', 'As expected. Where is the ice?'], loss: ['I lost to the heat. Not to you.', 'Next time, I bring a fan.'],
    bark: ['Mine.', 'Yours.'],
    visit: { lines: ['I brought iced coffee. Very iced.', 'Do you also miss the cold?'], choices: ['I could use a breeze.', 'I love the heat!'], good: 0 },
    farewell: ['Goodbye. Stay cool. Literally.', 'You made the heat bearable. Thank you. Truly.'],
    ending: 'Come to Norway. I will show you real weather.'
  },
  amara: {
    greet: ['Hey hey! You hear that? The ocean has rhythm!', 'Babe! Love the energy today!', 'My bestie! Okay, spin for me. Gorgeous!'],
    chat: ['Capoeira is dance with consequences, babe.', 'I have three playlists for this island. Minimum.',
      'Fashion is armor. Cute armor.', 'Did you see that sunset? I almost cried. I did cry.',
      'Everyone here is so intense. Except you. Love that.', 'You and me? Main character energy. Both of us.'],
    love: ['Okay. The party starts NOW.', 'Stop it. STOP IT. I love it!'],
    like: ['Cute! So cute!', 'Ooh, I see you, taste-maker!'],
    neutral: ['Aw, thanks babe.'],
    refuse: ['Snow? Babe, we are in paradise.', 'Hmm. No. Love you though!'],
    suitYes: 'Yes! Colour! Drama! Perfect!', suitNo: 'Not really my style, babe. Too plain.',
    inviteYes: ['Duo goals! Let us serve looks AND aces!', 'Yes yes YES! Partners!'],
    inviteNo: ['Babe, we need more vibes first.', 'Not yet! Let us hang out more!'],
    leaveTeam: 'My partner will survive. I will send her a playlist.',
    taunt: ['Hope you can dance, because you will be chasing!', 'Feel the rhythm? That is you losing!'],
    win: ['We ate. We left no crumbs.', 'And the crowd goes WILD!'], loss: ['Okay. Okay. I am fine. I am not fine.', 'The vibes were off. Rematch!'],
    bark: ['Mine, babe!', 'Yours! Go go!'],
    visit: { lines: ['Surprise! Late-night smoothies!', 'Am I too much sometimes?'], choices: ['You are exactly enough.', 'Maybe a little.'], good: 0 },
    farewell: ['Bye babe! Text me!', 'You are family now. Officially. No take-backs.'],
    ending: 'Same island, same crew, next summer. Promise me.'
  },
  tess: {
    greet: ['G\'day! Waves are pumping, sun\'s out. Life\'s good, yeah?', 'Oi! Ready for a hit?', 'There\'s my favourite! Let\'s go smash some balls!'],
    chat: ['Caught a barrel this morning. Pure bliss, mate.', 'MMA taught me one thing: never stop moving.',
      'Fancy a surf later? I\'ll teach you, no worries.', 'I\'ve got sand in places sand shouldn\'t be.',
      'Reckon we\'d make a solid team, yeah?', 'Best mate on the island. That\'s you.'],
    love: ['Ohhh, the good stuff! My board says thanks.', 'Legend! Absolute legend!'],
    like: ['Ripper, cheers!', 'Ah, that\'s sweet as!'],
    neutral: ['Cheers, mate.'],
    refuse: ['Mate, I can barely write my own name.', 'Nah, not really my thing, yeah?'],
    suitYes: 'Sporty! Sorted! Love it!', suitNo: 'Not really my style, mate.',
    inviteYes: ['Partners? Too right!', 'Let\'s have a crack! Partners!'],
    inviteNo: ['Nah, not yet, mate. Hang out first.', 'Maybe later, yeah?'],
    leaveTeam: 'My old partner will be filthy. She\'ll get over it.',
    taunt: ['Hope you\'ve got your sea legs!', 'This\'ll be over quick, yeah?'],
    win: ['Get in! Too easy!', 'That\'s how we do it down under!'], loss: ['Fair play. Good game, yeah?', 'Ah, wiped out. Next one!'],
    bark: ['Mine, mine!', 'Yours, mate!'],
    visit: { lines: ['Brought snags. Fancy a feed?', 'You reckon I take things too easy?'], choices: ['That is your charm.', 'Sometimes, yeah.'], good: 0 },
    farewell: ['See ya, mate! Keep it real!', 'Best holiday ever, cos of you. Seriously.'],
    ending: 'Next year we\'re hitting the waves first. Deal?'
  },
  mei: {
    greet: ['Hehe. Bet you can\'t beat me at anything today.', 'Oh, it\'s you! Want to lose at cards?', 'My favourite rival! And friend. Mostly rival.'],
    chat: ['I flipped over a lifeguard tower. On purpose.', 'Xiangqi is chess but better. Fight me.',
      'I hid Sonny\'s sunglasses. Do not tell him.', 'Sweet things make me faster. Science.',
      'You\'re fun. You almost beat me once.', 'Okay, you are my best friend. Do NOT tell anyone.'],
    love: ['Solved it. Twice. Got another?', 'MOCHI! You are my hero forever!'],
    like: ['Ooh, nice! I approve!', 'Hehe, cute!'],
    neutral: ['Hmm. Thanks, I guess.'],
    refuse: ['I don\'t eat things on sticks that used to have faces.', 'Ew, no. Try again!'],
    suitYes: 'So cute! Twirl-worthy!', suitNo: 'Not really my style. Boring!',
    inviteYes: ['Partners? Fine. But I get the spikes.', 'Okay! We\'ll crush everyone!'],
    inviteNo: ['Beat me at something first. Hehe.', 'Nope! Not yet!'],
    leaveTeam: 'My old partner will sulk. I\'ll buy her bubble tea.',
    taunt: ['I\'ve already won. You just don\'t know it.', 'Prepare to be out-flipped!'],
    win: ['Hehe! Told you!', 'Undefeated! As always!'], loss: ['That didn\'t count. I wasn\'t trying.', 'Rematch. Now. RIGHT now.'],
    bark: ['Mine! Mine!', 'Yours! Hehe!'],
    visit: { lines: ['I brought mochi! And cards!', 'Do you think I play too many pranks?'], choices: ['Never stop.', 'Maybe ease up on Sonny.'], good: 0 },
    farewell: ['Bye! I\'ll beat you next year!', 'I\'m not crying. YOU\'RE crying. Okay, I\'m crying.'],
    ending: 'Next summer: rematch. And bring snacks.'
  }
};
G.SONNY = {
  commentary: {
    spike: ['WHAT A SPIKE! Somebody call a lifeguard!', 'BOOM! That ball needs a vacation!', 'KILL SHOT! Somebody check the sand for a crater!'],
    ace: ['ACE! That serve had TAXES on it!', 'ACE! Nobody touched it! NOBODY!', 'Straight to the sand! JACKPOT SERVE!'],
    block: ['BLOCKED! The wall is CLOSED for business!', 'DENIED! Return to sender!', 'STUFFED! Like a turkey, baby!'],
    rally: ['Long rally, folks. I\'m getting a tan just WATCHING.', 'Back and forth! It\'s like my STOCK PORTFOLIO!'],
    matchpoint: ['MATCH POINT! I can\'t look! ...I\'m looking.', 'MATCH POINT! Somebody hold my sunglasses!'],
    fault: ['Ooh! The HOUSE thanks you for that one!', 'A gift! A GIFT! I love gifts!', 'OUT! Out like my last three marriages!'],
    dig: ['WHAT A DIG! She dove like it was free money!', 'SAVED IT! Diving for dollars!'],
    serveFault: ['SERVE FAULT! The net says hello!', 'Into the NET! Ouch, champ!'],
    start: ['LADIES AND... LADIES! LET\'S PLAY SOME BALL!', 'IT\'S GO TIME, SUNSHINES! SERVE IT UP!'],
    win: ['AND THAT\'S THE MATCH! WHAT A SHOW!', 'GAME OVER, CHAMPS! THE HOUSE APPLAUDS!'],
    replay: ['LET\'S SEE THAT AGAIN! IN SLOW-MO!', 'REPLAY! Because I said so!'],
    netcord: ['Off the TAPE! Lady Luck is ON this island!']
  },
  pa: ['GOOD MORNING, ISLA FORTUNA! THE BUFFET IS OPEN!', 'THE SUN IS SHINING AND THE CHIPS ARE FALLING!',
    'REMINDER: SUNSCREEN IS FREE. THE CASINO IS NOT!', 'WHO\'S READY TO PLAY SOME BALL?'],
  shop: ['Buy something shiny, champ!']
};
G.STAFF_LINES = {
  kai: ['Aloha. Something to snack on?', 'Fresh coconuts. Picked them myself.', 'The mochi is new. Mei bought six.', 'Gifts make friends. Sonny taught me that. Badly.',
    'Hot sauce is for Lola. Mostly.', 'Need a gift? I know everyone\'s tastes.', 'Wrap it nice. That\'s half the gift.', 'Come back tomorrow. New stock.'],
  odette: ['Darling! Let us find you something fabulous.', 'Couture is a feeling, not a price.', 'That colour on you? Magnifique.', 'Try it on. Twirl. Then decide.',
    'Elegance never goes out of season.', 'The Midnight suit. Only for the brave.', 'New pieces arrive daily, chérie.', 'I dressed a duchess once. You look better.'],
  bo: ['Back in my day we played in jeans!', 'Hydrate or die-drate, kid!', 'Wristbands. Trust me.', 'Footwork! Footwork! Footwork!',
    'This gear is pro-tour approved. By me.', 'Shades on when the sun\'s low!', 'You serve like my grandma. That\'s a compliment.', 'Go get \'em, champ!']
};
G.PEPPER = {
  tips: {
    receive: 'The ring shows where the ball comes down. Stand in it. Press {play} as it reaches you.',
    set: 'Your partner passed it to you. {play} again as it drops, to set her up.',
    spike: 'She set you. You jump on your own. {play} at the top. Aim with the stick or the mouse.',
    serve: '{play} tosses. {play} again at the top of the toss. {shot} tosses a jump serve.',
    block: 'When they attack near the net, {shot} jumps to block.',
    dive: 'Out of reach? {dive} dives.',
    call: '{call} calls Mine or Yours. Your partner listens.',
    chem: 'The better you get along, the better she plays. Chat. Bring gifts. Win.'
  },
  quips: ['Statistically, that was unwise.', 'The house has noticed.', 'Noted.', 'Mr. Fortuna will be insufferable now.', 'Breakfast is at eight.']
};

// ==== 03-data-items.js ====
/* 03-data-items: 21 swimsuits, 10 accessories, 25 gifts, the three shops, gift tastes. */
// cut: onepiece racer halter sport2 tankini rash sarong • pattern: solid stripes pin dots waves stars floral palms check gradient geo scales sevens lame
G.SUITS = [
  ['seigaiha', 'Seigaiha', 'onepiece', 'waves', ['#23306b', '#e8eef8', '#c8303a'], ['classic', 'elegant'], 'sig', 0],
  ['estrella', 'Estrella', 'sport2', 'stars', ['#c8202c', '#ffd04a', '#1a1a1a'], ['bold', 'sporty'], 'sig', 0, { shorts: .35 }],
  ['fjord', 'Fjord', 'rash', 'solid', ['#9fd8f0', '#1d3560', '#ffffff'], ['sporty', 'classic'], 'sig', 0, { sleeves: 'short' }],
  ['kentepop', 'Kente Pop', 'tankini', 'geo', ['#ff8a1e', '#2f9e4a', '#ffd36a'], ['bold', 'cute'], 'sig', 0],
  ['reefbreak', 'Reef Break', 'racer', 'gradient', ['#1fb7b0', '#ff7a5e', '#ffffff'], ['sporty', 'bold'], 'sig', 0],
  ['peony', 'Peony', 'halter', 'floral', ['#ffb2a0', '#e85a8a', '#ffffff'], ['cute', 'elegant'], 'sig', 0],
  ['protour', 'Pro Tour', 'racer', 'pin', ['#f4f6fa', '#d8283a', '#1a2a5a'], ['sporty'], 'riptide', 12000],
  ['sandstorm', 'Sandstorm', 'sport2', 'solid', ['#e8c06a', '#1a1a1a', '#ffffff'], ['sporty', 'bold'], 'riptide', 9000, { shorts: .35 }],
  ['lifeguard', 'Lifeguard', 'onepiece', 'solid', ['#e0302a', '#ffd04a', '#ffffff'], ['sporty', 'classic'], 'riptide', 8000],
  ['coralrash', 'Coral Rash', 'rash', 'stripes', ['#ff7a5e', '#ffffff', '#2a3a5a'], ['sporty'], 'riptide', 14000, { sleeves: 'long' }],
  ['neonrush', 'Neon Rush', 'tankini', 'gradient', ['#7cff5a', '#ff4fb8', '#1a1a1a'], ['bold', 'sporty'], 'riptide', 16000, { day: 2 }],
  ['monaco', 'Monaco', 'halter', 'stripes', ['#1d2f6a', '#ffffff', '#d8283a'], ['classic', 'elegant'], 'coral', 22000],
  ['polkapop', 'Polka Pop', 'sport2', 'dots', ['#e8283a', '#ffffff', '#ffd04a'], ['cute'], 'coral', 18000],
  ['tropicana', 'Tropicana', 'sarong', 'palms', ['#2f8f4e', '#ffe0a0', '#ff8a1e'], ['elegant'], 'coral', 26000],
  ['mermaid', 'Mermaid', 'onepiece', 'scales', ['#1fb7b0', '#7a5fd8', '#e8f8ff'], ['cute', 'elegant'], 'coral', 30000, { day: 3 }],
  ['sunsetblvd', 'Sunset Boulevard', 'tankini', 'gradient', ['#ff9e5e', '#7a3fa0', '#ffd36a'], ['bold', 'elegant'], 'coral', 28000],
  ['midnight', 'Midnight', 'onepiece', 'solid', ['#16141c', '#ffd36a', '#ffd36a'], ['elegant', 'bold'], 'coral', 35000, { day: 4 }],
  ['gingham', 'Gingham Picnic', 'tankini', 'check', ['#6aa8e8', '#ffffff', '#e8283a'], ['cute', 'classic'], 'coral', 15000],
  ['fortunagold', 'Fortuna Gold', 'racer', 'lame', ['#ffd36a', '#fff3c0', '#1a1a1a'], ['bold'], 'final', 0],
  ['jackpot', 'Jackpot', 'sport2', 'sevens', ['#1a1a2a', '#ffd36a', '#e8283a'], ['bold', 'cute'], 'prize', 300, { shorts: .35 }],
  ['pinstripe', 'Pepper\'s Pinstripe', 'racer', 'pin', ['#121216', '#f4f4f4', '#ffd36a'], ['classic', 'elegant'], 'pepper', 0]
].map(([id, name, cut, pattern, colors, tastes, where, price, x]) => Object.assign({ id, name, cut, pattern, colors, tastes, where, price, kind: 'suit' }, x || {}));
// the hosts' match kits (not collectible)
G.HOUSE_KITS = { house_sonny: { id: 'house_sonny', name: 'House Kit', cut: 'rash', pattern: 'sevens', colors: ['#141418', '#ffd36a', '#ffd36a'], sleeves: 'none', tastes: [], kind: 'suit' } };
G.ACCS = [
  ['ribbon', 'Ribbon', 'hair', ['classic', 'cute'], 'coral', 2000],
  ['sweatband', 'Sweatband', 'head', ['sporty'], 'riptide', 3000],
  ['sportshades', 'Sport Shades', 'face', ['sporty'], 'riptide', 6000, true],
  ['heartshades', 'Heart Shades', 'face', ['cute', 'bold'], 'coral', 7500, true],
  ['aviators', 'Gold Aviators', 'face', ['bold'], 'coral', 15000, true, 3],
  ['visor', 'Sun Visor', 'head', ['sporty'], 'riptide', 4000],
  ['sunhat', 'Straw Sun Hat', 'head', ['elegant', 'classic'], 'coral', 9000],
  ['hibiscus', 'Hibiscus', 'hair', ['cute', 'elegant'], 'sundries', 2500],
  ['shellnecklace', 'Shell Necklace', 'neck', ['cute', 'classic'], 'sundries', 4500],
  ['wristbands', 'Wristbands', 'wrists', ['sporty'], 'riptide', 3500]
].map(([id, name, anchor, tastes, where, price, shades, day]) => ({ id, name, anchor, tastes, where, price, shades: !!shades, day: day || 1, kind: 'acc' }));
G.GIFTS = [
  ['mango_smoothie', 'Mango Smoothie', 'food', 800], ['bubble_tea', 'Bubble Tea', 'food', 900], ['matcha_icecream', 'Matcha Ice Cream', 'food', 700],
  ['mochi_box', 'Mochi Box', 'food', 1500], ['bbq_skewers', 'BBQ Skewers', 'food', 1200], ['hot_sauce', 'Hot Sauce Sampler', 'food', 2000],
  ['iced_coffee', 'Iced Coffee', 'food', 600], ['coconut', 'Fresh Coconut', 'food', 400],
  ['plush_seal', 'Plush Seal', 'goods', 3000], ['snow_globe', 'Snow Globe', 'goods', 2500], ['puzzle_cube', 'Puzzle Cube', 'goods', 2200],
  ['portable_speaker', 'Portable Speaker', 'goods', 9000], ['matcha_kit', 'Matcha Kit', 'goods', 4500], ['calligraphy_set', 'Calligraphy Set', 'goods', 6000],
  ['knitting_kit', 'Knitting Kit', 'goods', 2800], ['maracas', 'Maracas', 'goods', 1400], ['luchador_mask', 'Luchador Mask', 'goods', 5000, 2],
  ['beach_paperback', 'Beach Paperback', 'books', 1200], ['fashion_mag', 'Fashion Magazine', 'books', 800],
  ['energy_drink', 'Energy Drink', 'sports', 500], ['surf_wax', 'Surf Wax Deluxe', 'sports', 1600], ['sunscreen', 'Sunscreen SPF 100', 'sports', 1000], ['foam_finger', 'Foam Finger', 'sports', 900],
  ['glitter_sandals', 'Glitter Sandals', 'fashion', 5500], ['gold_hoops', 'Gold Hoop Earrings', 'fashion', 12000]
].map(([id, name, cat, price, day]) => ({ id, name, cat, price, day: day || 1, kind: 'gift', where: cat === 'sports' ? 'riptide' : cat === 'fashion' ? 'coral' : 'sundries' }));
// L love, + like, . neutral, - dislike; columns rin lola ingrid amara tess mei
G.TASTE_TABLE = {
  mango_smoothie: '.+.++.', bubble_tea: '.....+', matcha_icecream: '+.+..+', mochi_box: '+....L', bbq_skewers: '.+..L-', hot_sauce: '-L-.+-',
  iced_coffee: '..+...', coconut: '....+.', plush_seal: 'L.+..+', snow_globe: '..L-..', puzzle_cube: '+-...L', portable_speaker: '-+.L+.',
  matcha_kit: 'L-...+', calligraphy_set: '+...-.', knitting_kit: '..L-.-', maracas: '.+.+..', luchador_mask: '.L..+.', beach_paperback: '+-+...',
  fashion_mag: '..-+-+', energy_drink: '-..-+-', surf_wax: '....L.', sunscreen: '..+.+.', foam_finger: '-+..+.', glitter_sandals: '..-+-+', gold_hoops: '.+.L..'
};
G.taste = (npc, gift) => { const row = G.TASTE_TABLE[gift]; if (!row) return 'neutral'; const c = row[G.FIGHTERS.indexOf(npc)]; return c === 'L' ? 'love' : c === '+' ? 'like' : c === '-' ? 'dislike' : 'neutral'; };
G.ITEMS = {}; for (const it of [...G.SUITS, ...G.ACCS, ...G.GIFTS, ...Object.values(G.HOUSE_KITS)]) G.ITEMS[it.id] = it;
G.SHOPS = {
  riptide: { name: 'Riptide Sports', keeper: 'bo', color: '#2a7ad8', tabs: [['Swimsuits', 'suit'], ['Accessories', 'acc'], ['Gifts', 'gift']] },
  coral: { name: 'Coral Couture', keeper: 'odette', color: '#ff7aa8', tabs: [['Swimsuits', 'suit'], ['Accessories', 'acc'], ['Gifts', 'gift']] },
  sundries: { name: 'Sundries & Smiles', keeper: 'kai', color: '#ffb02a', tabs: [['Food', 'food'], ['Goods', 'goods'], ['Books & more', 'other']] }
};
G.shopStock = (shop, day) => {
  const all = [...G.SUITS, ...G.ACCS, ...G.GIFTS].filter(i => i.where === shop && (i.day || 1) <= Math.max(day, 1));
  return all;
};
G.GIFT_ICON_COLORS = { food: ['#ffb02a', '#ff6a3a'], goods: ['#7ad0ff', '#3a6ad8'], books: ['#e8e0c8', '#a85a3a'], sports: ['#7cff5a', '#2a8a3a'], fashion: ['#ff8ad8', '#c83a9a'] };

// ==== 04-data-world.js ====
/* 04-data-world: the walkable places as data: their maps (rows built by small functions), props, NPC spots, interactables
 * and exits; and the island map's pins. */
const rowsOf = (w, h, f) => { const rows = []; for (let y = 0; y < h; y++) { let s = ''; for (let x = 0; x < w; x++) s += f(x, y); rows.push(s); } return rows; };
G.tex = {
  deck: (x, y) => { const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, g = (x % 16) < 1 || (y % 16) < 1, t = E.hash2(Math.floor(x / 16), Math.floor(y / 16)) * 18; return g ? [176, 150, 120] : [232 + t + n * 10, 206 + t * .8 + n * 10, 168 + t * .5 + n * 8]; },
  water: (x, y) => { const w = E.noise2(x * .06, y * .06), n = E.hash2(Math.floor(x), Math.floor(y)) - .5, c = (Math.sin(x * .3 + y * .2) > .9) ? 40 : 0; return [40 + w * 20 + n * 6 + c, 190 + w * 24 + n * 8 + c, 210 + w * 14 + n * 6 + c]; },
  planks: (x, y) => { const pl = Math.floor(y / 6), seam = (y % 6) < 1 || ((x + pl * 13) % 28) < 1, n = E.hash2(Math.floor(x / 2), pl) - .5; return seam ? [120, 86, 56] : [190 + n * 26, 146 + n * 20, 100 + n * 14]; },
  carpet: (x, y) => { const d = (Math.abs((x % 16) - 8) + Math.abs((y % 16) - 8)) < 2, n = E.hash2(Math.floor(x), Math.floor(y)) - .5; return d ? [210, 160, 60] : [120 + n * 10, 24 + n * 8, 50 + n * 8]; },
  tilesWarm: (x, y) => { const g = (x % 12) < 1 || (y % 12) < 1, n = E.hash2(Math.floor(x / 12), Math.floor(y / 12)) - .5; return g ? [160, 130, 110] : [232 + n * 16, 208 + n * 14, 180 + n * 12]; }
};
const floorFn = (x, y, tag) => tag === 'water' ? G.tex.water(x, y) : tag === 'deck' ? G.tex.deck(x, y) : tag === 'planks' ? G.tex.planks(x, y) : tag === 'carpet' ? G.tex.carpet(x, y) : tag === 'tiles' ? G.tex.tilesWarm(x, y) : tag === 'sea' ? G.sandTex(x, y, 'sea') : G.sandTex(x, y, 'sand');
G.LOCS = {
  beach: { name: 'Sunset Courts', short: 'Courts', open: [0, 1], music: 'island', amb: 'beach', spawn: [352, 296], pin: [16, 22],
    about: 'Court A, the bleachers, the Tiki Tok Bar and the Match Board.', acts: ['Matches', 'Chat', 'Wardrobe'],
    spots: [[120, 196, 'stool'], [134, 196, 'stool'], [92, 200, 'stool'], [190, 128, 'lounge'], [548, 124, 'lounge'], [600, 200, 'stand'], [300, 70, 'shore'], [420, 70, 'shore'], [260, 220, 'practice'], [300, 224, 'practice']],
    inter: [['board', 'Match Board', 300, 290], ['hut', 'Changing Hut', 108, 268]] },
  pool: { name: 'Lagoon Pool', short: 'Pool', open: [0, 1], music: 'lagoon', amb: 'pool', spawn: [240, 300], pin: [30, 14],
    about: 'A free-form lagoon pool, the Pool Hop deck and the cabana bar.', acts: ['Pool Hop', 'Chat', 'Wardrobe'],
    spots: [[150, 130, 'swim'], [300, 150, 'swim'], [80, 250, 'lounge'], [110, 250, 'lounge'], [140, 250, 'lounge'], [200, 205, 'edge'], [330, 205, 'edge'], [400, 90, 'stool'], [416, 90, 'stool']],
    inter: [['hopdeck', 'Pool Hop', 52, 160], ['hut', 'Changing Hut', 440, 250]] },
  promenade: { name: 'Fortuna Promenade', short: 'Promenade', open: [0, 1], music: 'island', amb: 'beach', spawn: [288, 200], pin: [24, 10],
    about: 'Three shops on the boardwalk: Riptide Sports, Coral Couture, Sundries & Smiles.', acts: ['Shopping', 'Chat'],
    spots: [[150, 150, 'bench'], [430, 150, 'bench'], [110, 105, 'shop'], [290, 105, 'shop'], [470, 105, 'shop'], [380, 190, 'stand']],
    inter: [['riptide', 'Riptide Sports', 110, 86], ['coral', 'Coral Couture', 288, 86], ['sundries', 'Sundries & Smiles', 466, 86]] },
  villa: { name: 'Your Villa', short: 'Villa', open: [0, 1, 2], music: 'siesta', amb: 'night', spawn: [112, 128], pin: [36, 24],
    about: 'Your room: the bed, the closet, the desk, the album and the mailbox.', acts: ['Rest', 'Wardrobe', 'Journal', 'Album', 'Letters'],
    spots: [[150, 120, 'stand']], inter: [['bed', 'Bed', 48, 64], ['closet', 'Closet', 112, 40], ['desk', 'Desk', 176, 56], ['frame', 'Album', 196, 100], ['mailbox', 'Mailbox', 64, 140]] },
  casino: { name: 'Casino Fortuna', short: 'Casino', open: [2], music: 'neon', amb: 'casino', spawn: [240, 280], pin: [20, 28],
    about: 'Night only: slots, blackjack, roulette, the cashier and the VIP lounge.', acts: ['Slots', 'Blackjack', 'Roulette'],
    spots: [[90, 120, 'slot'], [120, 120, 'slot'], [150, 120, 'slot'], [330, 200, 'stand'], [360, 210, 'stand'], [420, 120, 'stand'], [436, 120, 'stand']],
    inter: [['cashier', 'Cashier', 240, 70], ['slots', 'Fortuna Sevens', 120, 104], ['blackjack', 'Blackjack', 240, 170], ['roulette', 'Roulette', 380, 170], ['prize', 'Prize Counter', 420, 70], ['vip', 'VIP Lounge', 60, 220]] },
  dock: { name: 'The Dock', short: 'Dock', open: [], music: 'island', amb: 'beach', spawn: [190, 180], pin: [8, 30], about: 'Departures only.', acts: [], spots: [], inter: [] }
};
G.locMaps = () => {
  if (G._locMaps) return G._locMaps; const M = G._locMaps = {};
  M.beach = G.courtMap();
  // the pool: a deck of tiles round a free-form pool (water blocks walkers)
  M.pool = new E.TileMap({ rows: rowsOf(30, 22, (x, y) => { const dx = (x - 13) / 10, dy = (y - 9) / 5.5, w = Math.hypot(dx, dy) < 1 && !(x > 18 && y < 5); return y < 1 || x < 1 || x > 28 ? '#' : w ? '~' : 'd'; }),
    legend: { '#': 1, '~': { floor: 'water', block: true }, d: { floor: 'deck' } }, types: { 1: { h: 18, top: '#5fc35a', side: '#2f8f4e', face: 'hedge', roof: 'leaves' } }, floorTex: floorFn, outside: '#2f8f4e', ao: 4 });
  // the promenade: a boardwalk with the sea behind a railing and the shopfronts
  M.promenade = new E.TileMap({ rows: rowsOf(36, 16, (x, y) => y < 2 ? '~' : y === 2 ? 'r' : 'p'), legend: { '~': { floor: 'sea', block: true }, r: 2, p: { floor: 'planks' } },
    types: { 2: { h: 8, top: '#f4f4f0', side: '#c8c8c0', face: 'plank' } }, floorTex: floorFn, outside: '#1fb0c8', ao: 3 });
  // the villa: a room with plaster walls
  M.villa = new E.TileMap({ rows: rowsOf(15, 11, (x, y) => (y === 0 || x === 0 || x === 14 || y === 10) ? (y === 10 && x > 5 && x < 9 ? 'w' : '#') : 't'), legend: { '#': 1, w: 3, t: { floor: 'tiles' } },
    types: { 1: { h: 40, top: '#f4e8c8', side: '#e8d8b0', face: 'plaster', cut: true, cutH: 6 }, 3: { h: 14, top: '#f4e8c8', side: '#e8d8b0', face: 'plaster', cut: true, cutH: 6 } }, floorTex: floorFn, outside: '#0a1420', ao: 5 });
  // the casino floor
  M.casino = new E.TileMap({ rows: rowsOf(30, 20, (x, y) => (y === 0 || x === 0 || x === 29 || y === 19) ? '#' : 'c'), legend: { '#': 1, c: { floor: 'carpet' } },
    types: { 1: { h: 48, top: '#2a1240', side: '#4a1a5a', face: 'plaster', cut: true, cutH: 8 } }, floorTex: floorFn, outside: '#0a0410', ao: 5 });
  // the dock: planks out into the sea
  M.dock = new E.TileMap({ rows: rowsOf(24, 14, (x, y) => (x > 4 && x < 19 && y > 4 && y < 12) || (x > 9 && x < 14) ? 'p' : '~'), legend: { '~': { floor: 'sea', block: true }, p: { floor: 'planks' } }, floorTex: floorFn, outside: '#1fb0c8', ao: 2 });
  // solid props
  const S = (m, id, x, y, f) => { try { m.solid(id, x, y, 0, { facing: f || 0 }); } catch (e) { /* shape missing */ } };
  S(M.pool, 'cabana', 410, 60, Math.PI / 2); S(M.promenade, 'icecreamcart', 380, 150, Math.PI / 2);
  for (const x of [110, 288, 466]) S(M.promenade, 'shopfront', x, 52, Math.PI / 2);
  S(M.villa, 'bed', 48, 56, Math.PI / 2); S(M.villa, 'wardrobe', 112, 26, Math.PI / 2); S(M.villa, 'desk', 176, 44, Math.PI / 2);
  S(M.casino, 'cashier', 240, 48, Math.PI / 2); S(M.casino, 'bjtable', 240, 150, Math.PI / 2); S(M.casino, 'roulettetable', 380, 150, Math.PI / 2);
  for (const x of [90, 120, 150]) S(M.casino, 'slotmachine', x, 96, Math.PI / 2);
  S(M.dock, 'seaplane', 190, 60, 0);
  return M;
};
/** each place's props, drawn every frame (palms sway, torches light at night) */
G.drawLocProps = (r, id, night) => {
  const shape = (s, x, y, f, o = {}) => r.shape(s, x, y, 0, Object.assign({ facing: f === undefined ? Math.PI / 2 : f }, o)), prop = (p, x, y, o = {}) => r.prop(p, x, y, 0, Object.assign({ size: 1.5 }, o));
  if (id === 'beach') { G.drawCourtSet(r, null, night); shape('mailbox', 300, 290, Math.PI / 2, { mats: { b: 'aoa_canvasY' } }); }
  else if (id === 'pool') {
    shape('cabana', 410, 60); for (const x of [80, 110, 140]) shape('lounger', x, 250); shape('flamingo', 240, 120); shape('poolfloat', 130, 160, 0, { mats: { a: 'aoa_canvasP' } });
    for (let k = 0; k < 6; k++) shape('poolfloat', 76 + k * 30, 150 + Math.sin(k) * 10, 0, { mats: { a: k % 2 ? 'aoa_canvasY' : 'aoa_canvasT' } });
    shape('deckchair', 300, 250); shape('deckchair', 330, 250); shape('changinghut', 440, 232, Math.PI); shape('barstool', 400, 92, 0); shape('barstool', 416, 92, 0);
    prop('palm', 30, 40); prop('palm', 450, 30); prop('palm', 24, 320); prop('palm', 460, 320); prop('flowers', 200, 320); prop('flowers', 260, 330);
    if (night) for (const [x, y] of [[40, 110], [440, 110], [200, 300], [300, 300]]) shape('torchpost', x, y, 0, { light: true });
    shape('mailbox', 52, 160, Math.PI / 2, { mats: { b: 'aoa_canvasT' } });
  } else if (id === 'promenade') {
    const mats = [{ a: 'aoa_canvasB', w: 'aoa_seafoam' }, { a: 'aoa_canvasP', w: 'aoa_lilac' }, { a: 'aoa_canvasY', w: 'aoa_coral' }];
    [110, 288, 466].forEach((x, k) => shape('shopfront', x, 52, Math.PI / 2, { mats: mats[k] }));
    shape('icecreamcart', 380, 150); shape('bench', 150, 160); shape('bench', 430, 160); for (const x of [40, 200, 376, 540]) shape('planter', x, 190);
    for (const x of [60, 240, 330, 520]) r.prop('streetlamp', x, 120, 0, { size: 1.4, light: night });
    prop('palm', 20, 230); prop('palm', 560, 230);
  } else if (id === 'villa') {
    shape('bed', 48, 56); shape('wardrobe', 112, 26); shape('desk', 176, 44); shape('rug', 120, 100, 0); shape('mailbox', 64, 150, Math.PI / 2);
    r.prop('window', 196, 8, 24, { size: 1.2 }); r.prop('lamp', 200, 40, 0, { size: 1.2, light: night }); prop('flowers', 30, 150, { size: 1.2 });
  } else if (id === 'casino') {
    for (let k = 0; k < 6; k++) shape('slotmachine', 70 + (k % 3) * 30, 96 + Math.floor(k / 3) * 0, Math.PI / 2, { mats: { b: k % 2 ? 'aoa_red' : 'aoa_black' } });
    shape('cashier', 240, 48); shape('bjtable', 240, 150); shape('roulettetable', 380, 150); shape('neonsign', 240, 20); shape('neonsign', 420, 20, Math.PI / 2, { mats: { n: 'aoa_neonC', c: 'aoa_neonP' } });
    shape('velvetrope', 60, 200, 0); shape('lounger', 60, 240, Math.PI / 2, { mats: { c: 'aoa_red' } }); shape('chandelier2', 160, 160, 0, { light: true }); shape('chandelier2', 330, 100, 0, { light: true }); shape('desk', 420, 56, Math.PI / 2, { mats: { w: 'aoa_gold' } });
  } else if (id === 'dock') { shape('seaplane', 190, 60, 0); shape('crate', 120, 130); shape('crate', 132, 140); shape('barrel', 260, 140); r.prop('banner', 100, 90, 0, { size: 1.3, color: '#ffd36a' }); r.prop('banner', 280, 90, 0, { size: 1.3, color: '#ff5f7a' }); }
};

// ==== 05-data-text.js ====
/* 05-data-text: letters, and the About & Credits pages (the Source Information and the three feedback sections, the
 * same text as the build's final report and exit-interview.json). */
G.LETTERS = {
  pepper_welcome: { from: 'pepper', text: ['Welcome. The rules again, since nobody listens:', 'Morning, afternoon, night. Each visit uses one. Matches pay. The casino does not, usually.', 'The Fortuna Cup is on Day 5. — P.'] },
  sonny_flyer: { from: 'sonny', text: ['FREE CHIPS FOR CHAMPIONS!', 'Casino Fortuna, every NIGHT! Bring friends! Bring MONEY! — Your pal, Sonny'] },
  friend_note: { from: 'auto', text: [] },
  pepper_warning: { from: 'pepper', text: ['The Final is tomorrow. Mr. Fortuna\'s serve is... dazzling. Eyewear is advised.', 'His partner will be me. I do not miss lines. — P.'], after: () => { const S = G.state; if (S.flags.pinstripe && !S.flags.pinstripeSeen) { S.flags.pinstripeSeen = true; G.toast('Pepper\'s Pinstripe', 'A swimsuit came with the letter: it is in your wardrobe.'); } } },
  sonny_hype: { from: 'sonny', text: ['FINAL HYPE!!! THE FORTUNA CUP!!!', 'THIS AFTERNOON! THE HOUSE VERSUS YOU! Bring sunglasses, I\'m TOO BRIGHT!'] },
  rumor: { from: 'pepper', text: ['A rumor is going around that Mr. Fortuna bet something large on the Cup.', 'I could not possibly comment. — P.'] }
};
// the friend's note is written by whoever likes you most
Object.defineProperty(G.LETTERS.friend_note, 'from', { get() { const S = G.state; return S ? G.npcs().sort((a, b) => G.aff(b) - G.aff(a))[0] : 'rin'; } });
Object.defineProperty(G.LETTERS.friend_note, 'text', { get() { const id = this.from; return [G.LINES[id] ? G.LINES[id].chat[3] : 'See you on the sand.', 'See you on the sand. — ' + (G.CAST[id] ? G.CAST[id].short : '')]; } });
G.ABOUT_INFO = {
  date: '2026-11-03 23:11:45',
  source: 'Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003)',
  plan: 'PLAN.md',
  genre: 'Sports (arcade 2-on-2 beach volleyball) with a light life-sim vacation (calendar, friendships, gifts, swimsuit collecting) and minigames (rhythm Pool Hop; casino slots, blackjack, roulette)',
  perspective: 'Matches: a side-on TV Broadcast camera (yaw 8, pitch 32) with an alternate Serve Cam behind your team; walkable places: three-quarter; island map: isometric; shops, casino tables and menus: full-screen canvas UI over the world',
  tech: 'my-3D2dge v0.85.2 (the full engine, my-3d2dge.js, patched: see Engine Feedback), plain JavaScript in one IIFE, AI Hub session client 1.4.0 (unmodified); tests on Node 24 and Playwright 1.63.0 with Chromium; one self-contained HTML file, no runtime libraries or network',
  art: 'The engine\'s native PS1-era pixel art (res ps1, expand): HD Humanoid rigs on a custom athletic build with code-drawn swimsuit cuts and 14 patterns, extra hair styles and accessories; resort objects written as E.SHAPES data; custom backdrops by time of day; a tropical palette',
  animation: 'The engine\'s native rig animation as the base (procedural walk, run, idle, jump and held poses), an arm-IK layer (E.ik3) around solvePose for every volleyball move and photo pose, timed from the match\'s contact plan, and 20 motion-capture clips played through the engine\'s Mocap.drive (cut with tools/anim-set.mjs from its Quaternius, Mesh2Motion and CMU sets) for celebrations, gestures, gift reactions, party dances, idles and Sonny\'s pratfall',
  audio: 'All synthesized in code: 9 songs in the engine\'s step sequencer with added instruments (steel drum, marimba, pluck, bell, organ, pad), 10 jingles, about 50 sound effects, noise ambience loops, and Animalese-style letter-by-letter voices with a profile per character',
  online: 'AI Hub Session Protocol v1 in shared-world mode: 1-4 players, the game\'s own card, host-authoritative match with deterministic ball launches on the hub clock, client-judged touches the host validates, CPUs in empty seats, finish() standings with stats and an MVP award',
  testing: '19 suites behind one command (node test/run.mjs prints only failures and a count; 355 checks): headless game.advance / game.debug suites for core, data, ball, rules, match, vacation, casino, Pool Hop, UI, attract, dev mode, postcards, motion clips, a clause-by-clause TASK.md audit, real-browser checks with real key and touch events (two players on one keyboard, a touch-only phone), a by-hand review\'s checks of the remaining paths (New Vacation+, letters, the save screen, the title postcard, the hub\'s time-up), and a scripted whole-vacation playthrough to both endings; a Playwright browser tour with a touch-only device; the AI Hub harness in four scenarios; screenshots and the engine checker for looks; no subagents',
  research: 'Read the engine handoff (API card, index, guide sections, asset card, the sports kit, the Humanoid, Dialog and audio source) and the AI Hub protocol README and harness. The source game was described from general knowledge; no web research.',
  environment: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-opus-5-5, reasoning effort medium',
  usage: 'unknown'
};
G.FEEDBACK = {
  testing: [
    'About 31 game issues: a line opened inside a dialog\'s callback firing its own ending at once (it could skip story lines and a time slot), New Vacation+ missing its Skip the Welcome Match option, a leftover empty loop in the casino props, Sonny lines missing his ALL-CAPS bursts, saves that were never wired into the game (only the tests set them up), the clip player replacing the rigs\' own move code, crashes from a name clash and a scoping slip, scenes drawn before they were entered, a sound table the browser rejected, an attract mode you could not leave during its photo beat, 50-touch rallies, AI skill that barely mattered, a slot machine paying 132%, a split-keyboard key clash on the join screen, missing font glyphs, and framing and overlap problems on several screens.',
    'About 9: dialog follow-ups skipping story lines and a time slot, saving, autosave and Continue doing nothing in the real game, rigs losing every volleyball move after their first motion clip, the title crash (two systems both named G.dev), a crash on every attack, the scene registry missing at load, the menu crashing when drawn before entry, the music instrument error, and the attract mode trapping the player.',
    'The scripted whole-vacation playthrough (both endings, every story event, the casino, Pool Hop and saves) together with the AI-vs-AI match statistics (rallies average 6.2 touches, inside the 3-8 target), and the clause-by-clause TASK.md audit; and, for online play, the AI Hub harness run in four scenarios.',
    'The single-frame title screenshots and the engine checker\'s view cycling: useful once each, but they could not show timing or motion, which only the scripted runs caught.'
  ],
  engine: [
    'The Humanoid rig: one constructor gives a shaded, dressed, animated character that also draws its own portrait, and its pose can be post-processed, so swimsuits, new hair and every volleyball move were additions, not rewrites. The fixed-step clock made every test deterministic.',
    'A little: I passed 0 as the alpha of groundRing, used a material pattern name that does not exist (plaster), and had to read the source to learn that joined players take the scene\'s keys through halfKeys. The index answered most other questions.',
    'The volleyball itself: a closed-form ball, contact planning, the timing judge, blocks, faults, the AI and its error model; and the swimsuit cuts and patterns drawn inside the torso.',
    'Hooking into the Humanoid\'s draw, which is one large function: swimsuits needed an engine patch for a callback.',
    'Six patches, each marked AOA: in the source: PlayStation symbols and arrows in the 5x7 font; the Button symbols setting (PlayStation by default, Xbox option, in the Game group); a per-letter function voice in Dialog; a voice bus and bus() accessor; named instrument waves, pluck decay, lowpass and detune for music; swim shorts and a swimDraw hook in the Humanoid; reserveCombo so Options is ignored while Create is held (an AI Hub rule).',
    'A documented per-part draw hook for outfits, so new clothing needs no engine edit.'
  ],
  prompt: [
    'It is concrete about the player\'s experience (a 10-foot controller-first UI, glyph rules, the touch-only gate, the attract mode, dev sliders) and about the deliverables, so done is clear.',
    'The plan asks for far more content than one medium-effort session can build in full; how to trade breadth for depth was left to judgement.',
    'Fitting a five-day vacation sim, three minigames and online play around a timing-based sports core, with every screen controller-first.',
    'Say which parts of a plan are musts and which are stretches, so the builder can scope deliberately.'
  ]
};
G.ABOUT = [
  ['Credits', [
    ['', 'Ahead or Alive: Xtreme Beach Volleyball is an original parody-tribute inspired by Dead or Alive Xtreme Beach Volleyball (Team Ninja / Tecmo, Xbox, 2003). No assets from it are used; every character, line, song and picture here is new.'],
    ['Design, code, art, music and writing', 'Claude (claude-opus-5-5, Anthropic), built from PLAN.md'],
    ['Engine', 'my-3D2dge v0.85.2 (MIT, github.com/michaelcrosato/my-3d2dge), modified: see Engine Feedback'],
    ['Online', 'AI Hub session client 1.4.0 (github.com/michaelcrosato/ai-hub), unmodified'],
    ['Motion clips', 'Via the engine\'s mocap sets: the Quaternius Universal Animation Library (CC0), Mesh2Motion (CC0) and the CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu, free for all uses)'],
    ['Thanks', 'To everyone who ever spent a whole vacation buying swimsuits instead of practicing their serve.']]],
  ['Source Information', () => [['Date', G.ABOUT_INFO.date], ['Source', G.ABOUT_INFO.source], ['Plan', G.ABOUT_INFO.plan], ['Genre and Perspective', G.ABOUT_INFO.genre + '. ' + G.ABOUT_INFO.perspective], ['Tech', G.ABOUT_INFO.tech], ['Art Direction', G.ABOUT_INFO.art], ['Animation', G.ABOUT_INFO.animation], ['Audio', G.ABOUT_INFO.audio], ['Online', G.ABOUT_INFO.online], ['Testing', G.ABOUT_INFO.testing], ['Research', G.ABOUT_INFO.research], ['Environment', G.ABOUT_INFO.environment], ['Model', G.ABOUT_INFO.model], ['Usage', G.ABOUT_INFO.usage]]],
  ['Testing Feedback', () => ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'].map((q, k) => [q, G.FEEDBACK.testing[k]])],
  ['Engine Feedback', () => ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'If you could change one thing about the engine, what would it be?'].map((q, k) => [q, G.FEEDBACK.engine[k]])],
  ['Prompt Feedback', () => ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'].map((q, k) => [q, G.FEEDBACK.prompt[k]])]
].map(([t, rows]) => [t, rows]);
// pages whose rows are built when shown
G.ABOUT = G.ABOUT.map(([t, rows]) => [t, typeof rows === 'function' ? rows : () => rows]);

// ==== 06-data-music.js ====
/* 06-data-music: nine original songs and the jingles, in the engine's step notation, built from chord plans with a few
 * helpers (bass, arpeggio and comping lines from the chords; melodies written out). Instruments are named periodic waves
 * (engine patch 4): steel, marimba, pluck, bell, organ, pad. */
G.INSTRUMENTS = {
  steel: { real: [0, 0, 0, 0, 0, 0], imag: [0, 1, .5, .35, .2, .05] },
  marimba: { real: [0, 0, 0, 0, 0], imag: [0, 1, 0, 0, .3, 0] },
  pluck: { real: [0, 0, 0, 0, 0, 0, 0, 0], imag: [0, 1, .5, .33, .25, .2, .16, .12] },
  bell: { real: [0, 0, 0, 0, 0, 0, 0, 0, 0], imag: [0, 1, .3, .5, 0, .25, 0, 0, .15] },
  organ: { real: [0, 0, 0, 0, 0], imag: [0, 1, .7, .5, .35] },
  pad: { real: [0, 0, 0, 0, 0, 0], imag: [0, 1, .45, .25, .12, .06] }
};
const NOTE_I = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NOTE_N = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const nn = (i) => NOTE_N[((i % 12) + 12) % 12] + Math.floor(i / 12);
/** a chord's tones as note names from a root octave: 'Am' -> ['A3', 'C4', 'E4'] */
G.chordTones = (name, oct = 3) => {
  const m = /^([A-G][b#]?)(m7|maj7|m|7|sus4)?$/.exec(name), root = NOTE_I[m[1]] + 12 * oct, q = m[2] || '';
  const iv = q === 'm' ? [0, 3, 7] : q === '7' ? [0, 4, 7, 10] : q === 'm7' ? [0, 3, 7, 10] : q === 'maj7' ? [0, 4, 7, 11] : q === 'sus4' ? [0, 5, 7] : [0, 4, 7];
  return iv.map(i => nn(root + i));
};
const SEQ = {
  /** bass: per chord, a pattern of r (root), f (fifth), o (octave), . rest, - hold */
  bass(chords, per, pat, oct = 2) { let s = ''; for (const c of chords) { const t = G.chordTones(c, oct), r = t[0], f = t[2], o = nn(NOTE_I[r.replace(/\d/, '')] + 12 * (oct + 1)); for (let k = 0; k < per; k++) { const p = pat[k % pat.length]; s += (p === 'r' ? r : p === 'f' ? f : p === 'o' ? o : p) + ' '; } s += '| '; } return s; },
  /** an arpeggio through the chord tones in the order given (indices; . rests) */
  arp(chords, per, order, oct = 4) { let s = ''; for (const c of chords) { const t = G.chordTones(c, oct); for (let k = 0; k < per; k++) { const o = order[k % order.length]; s += (o === '.' ? '.' : o === '-' ? '-' : t[o % t.length]) + ' '; } s += '| '; } return s; },
  /** comping: one chord tone (i) on the given steps */
  comp(chords, per, steps, i, oct = 4) { let s = ''; for (const c of chords) { const t = G.chordTones(c, oct); for (let k = 0; k < per; k++) s += (steps.includes(k) ? t[i % t.length] : '.') + ' '; s += '| '; } return s; },
  rep: (s, n) => Array(n).fill(s).join(' | ')
};
G.SEQ = SEQ;
const prog = (...c) => c;
G.SONGS = {};
(() => {
  // SUNRISE (title, menu): bright tropical pop, 116, C. C G Am F, bridge Dm G
  const ch = prog('C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'G', 'Em', 'Am', 'Dm', 'F', 'G', 'G');
  G.SONGS.sunrise = { bpm: 116, steps: 4, tracks: [
    { name: 'lead', wave: 'steel', vol: .12, decay: .5, notes:
      'E5 . G5 . A5 - G5 . | D5 . G5 . B5 - A5 G5 | C6 . B5 . A5 . E5 . | F5 - E5 . D5 . C5 . | E5 . G5 . A5 - G5 . | D5 . G5 . B5 . D6 . | C6 - B5 A5 B5 . C6 . | A5 - - - . . G5 . | ' +
      'F5 . A5 . D6 . C6 . | B5 . A5 . G5 . D5 . | E5 . G5 . B5 . A5 G5 | A5 - - - E5 . . . | F5 . A5 . C6 . A5 . | C6 . D6 . C6 . A5 . | G5 - - - A5 . B5 . | D6 - - - . . . . ' },
    { name: 'marimba', wave: 'marimba', vol: .1, decay: .35, notes: SEQ.arp(ch, 8, [0, 2, 1, 2, 0, 2, 1, 2], 4) },
    { name: 'pluck', wave: 'pluck', vol: .07, decay: .25, cutoff: 1800, notes: SEQ.comp(ch, 8, [2, 6], 1, 4) },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(ch, 8, ['r', '.', '.', 'r', '.', 'f', 'o', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .09, notes: 'k . h . s . h k | . k h . s . h h | k . h . s . h k | . k h . s h s s' }] };
  // ISLAND (map, Promenade): breezy ukulele, 100, F
  const ci = prog('F', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C', 'C');
  G.SONGS.island = { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'marimba', vol: .13, decay: .4, notes: 'A5 . C6 . A5 . F5 . | D6 . C6 . Bb5 . A5 . | G5 . A5 . Bb5 . G5 . | A5 - - - . . C5 . | D5 . F5 . A5 . D6 . | Bb5 . A5 . G5 . F5 . | E5 . G5 . C6 . Bb5 . | A5 . G5 . E5 . . . ' },
    { name: 'uke', wave: 'pluck', vol: .08, decay: .3, cutoff: 2200, notes: SEQ.arp(ci, 8, [0, 1, 2, 1, 2, 0, 1, 2], 4) },
    { name: 'bass', wave: 'triangle', vol: .28, notes: SEQ.bass(ci, 8, ['r', '.', '.', 'f', 'r', '.', 'o', '.'], 2) },
    { name: 'shaker', wave: 'drums', vol: .06, notes: 'k . h h . h h . | . . h h k h h . ' }] };
  // SPIKE (matches): driving synth-pop, 138, Am; drum layer 'rally' comes in on long rallies
  const cs = prog('Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G');
  G.SONGS.spike = { bpm: 138, steps: 4, tracks: [
    { name: 'lead', wave: 'square', vol: .06, notes: 'A4 . C5 . E5 . A5 . | G5 - F5 . E5 . C5 . | E5 . G5 . C6 . B5 . | G5 - - - D5 . E5 . | A5 . G5 . E5 . C5 . | F5 . E5 . C5 . A4 . | C5 . E5 . G5 . E5 . | D5 - - - B4 . D5 . ' },
    { name: 'arp', wave: 'pulse', vol: .05, notes: SEQ.arp(cs, 8, [0, 1, 2, 1, 0, 1, 2, 1], 4) },
    { name: 'bass', wave: 'saw', vol: .1, cutoff: 900, notes: SEQ.bass(cs, 8, ['r', 'r', 'o', 'r', 'r', 'r', 'o', 'f'], 2) },
    { name: 'beat', wave: 'drums', vol: .1, notes: 'k . h . s . h . | k . h k s . h . ' },
    { name: 'rally', wave: 'drums', vol: .1, on: false, notes: 'k h k h s h k h | k h k k s h s s ' }] };
  // HOUSE (the final): campy-dramatic, 150, Dm, key change up a step in the last 8 bars
  const ch1 = prog('Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A'), ch2 = prog('Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B');
  G.SONGS.house = { bpm: 150, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .07, notes:
      'D5 - - . F5 . A5 . | Bb5 - A5 . G5 . F5 . | E5 - G5 . C6 . Bb5 . | A5 - - - C#5 . E5 . | D5 . F5 . A5 . D6 . | D6 . C6 . Bb5 . G5 . | C6 . Bb5 . A5 . G5 . | A5 - - - - - . . | ' +
      'E5 - - . G5 . B5 . | C6 - B5 . A5 . G5 . | F#5 - A5 . D6 . C6 . | B5 - - - D#5 . F#5 . | E5 . G5 . B5 . E6 . | E6 . D6 . C6 . A5 . | D6 . C6 . B5 . A5 . | B5 - - - - - . . ' },
    { name: 'organ', wave: 'organ', vol: .05, notes: SEQ.comp(ch1, 8, [0, 3, 6], 0, 4) + SEQ.comp(ch2, 8, [0, 3, 6], 0, 4) },
    { name: 'bass', wave: 'saw', vol: .1, cutoff: 800, notes: SEQ.bass(ch1, 8, ['r', '.', 'r', 'o', 'r', '.', 'f', 'o'], 2) + SEQ.bass(ch2, 8, ['r', '.', 'r', 'o', 'r', '.', 'f', 'o'], 2) },
    { name: 'drums', wave: 'drums', vol: .11, notes: 'k . h k s . h . | k k h . s . t t ' }] };
  // LAGOON (pool, Pool Hop): bossa-nova, 112, G; rim clicks on the quarter notes (the hop beat)
  const cl = prog('G', 'Em', 'Am', 'D', 'G', 'Em', 'Am', 'D');
  G.SONGS.lagoon = { bpm: 112, steps: 4, tracks: [
    { name: 'lead', wave: 'steel', vol: .1, decay: .45, notes: 'B5 . . D6 . . B5 . | G5 . . B5 . . A5 . | C6 . . A5 . . E5 . | F#5 - - - . . A5 . | B5 . D6 . G6 . D6 . | B5 . G5 . E5 . G5 . | A5 . C6 . E6 . C6 . | D6 - - - . . . . ' },
    { name: 'comp', wave: 'pluck', vol: .07, decay: .22, cutoff: 1600, notes: SEQ.comp(cl, 8, [0, 3, 5], 1, 4) },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(cl, 8, ['r', '.', '.', 'f', 'o', '.', '.', 'f'], 2) },
    { name: 'rim', wave: 'drums', vol: .07, notes: 'c . h . c . h . | c . h . c . h c ' }] };
  // BOUTIQUE (shops, wardrobe): cute shopping funk, 108, Bb
  const cb = prog('Bb', 'Gm', 'Eb', 'F', 'Bb', 'Gm', 'Eb', 'F');
  G.SONGS.boutique = { bpm: 108, steps: 4, tracks: [
    { name: 'bells', wave: 'bell', vol: .08, decay: .6, notes: SEQ.arp(cb, 8, [0, 1, 2, 0, '.', 2, 1, '.'], 5) },
    { name: 'lead', wave: 'square', vol: .045, notes: 'D5 . F5 . . F5 G5 . | Bb5 . G5 . F5 . D5 . | Eb5 . G5 . Bb5 . G5 . | A5 - - . F5 . . . | D5 . F5 . Bb5 . D6 . | C6 . Bb5 . G5 . F5 . | G5 . F5 . Eb5 . C5 . | C5 - - - . . . . ' },
    { name: 'bass', wave: 'square', vol: .1, cutoff: 700, notes: SEQ.bass(cb, 8, ['r', '.', 'o', 'r', '.', 'r', 'o', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h k s . h . | k h . k s . h h ' }] };
  // NEON (casino): lounge funk, 96, Em vamp with a C B7 turnaround
  const cn = prog('Em7', 'A', 'Em7', 'A', 'Em7', 'A', 'C', 'B7');
  G.SONGS.neon = { bpm: 96, steps: 4, tracks: [
    { name: 'organ', wave: 'organ', vol: .05, notes: SEQ.comp(cn, 8, [2, 5], 1, 4) },
    { name: 'lead', wave: 'pulse', vol: .05, notes: 'B4 . D5 . E5 . . G5 | F#5 . E5 . C#5 . . . | B4 . D5 . E5 . G5 . | A5 - - - . . . . | B5 . A5 . G5 . E5 . | C#5 . E5 . A5 . . . | G5 . E5 . C5 . E5 . | D#5 - - - F#5 . . . ' },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(cn, 8, ['r', '.', '.', 'r', 'o', '.', 'f', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .08, notes: 'k . h . s . h h | k . h k s . h . ' },
    { name: 'sparkle', wave: 'bell', vol: .05, decay: .8, on: false, notes: 'E6 . B5 . G6 . E6 . | ' }] };
  // SIESTA (villa, night map): a gentle lullaby, 80, D
  const cd = prog('D', 'Bm', 'G', 'A', 'D', 'Bm', 'G', 'A');
  G.SONGS.siesta = { bpm: 80, steps: 4, tracks: [
    { name: 'pad', wave: 'pad', vol: .05, detune: 8, cutoff: 1200, notes: SEQ.comp(cd, 8, [0], 1, 4).replace(/ \. \. \. \. \. \. \. /g, ' - - - - - - - ') },
    { name: 'marimba', wave: 'marimba', vol: .11, decay: .5, notes: 'F#5 . A5 . D6 . A5 . | F#5 . D5 . B4 . D5 . | G5 . B5 . D6 . B5 . | A5 - - - E5 . . . | F#5 . A5 . D6 . F#6 . | D6 . B5 . F#5 . D5 . | B5 . G5 . D5 . G5 . | A5 - - - - - . . ' },
    { name: 'bass', wave: 'triangle', vol: .24, notes: SEQ.bass(cd, 8, ['r', '.', '.', '.', 'f', '.', '.', '.'], 2) }] };
  // FAREWELL (party, endings, credits): anthemic, 124, C then up to D
  const fa = prog('C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'), fb = prog('D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A');
  G.SONGS.farewell = { bpm: 124, steps: 4, tracks: [
    { name: 'lead', wave: 'steel', vol: .11, decay: .55, notes:
      'G5 . E5 . G5 . C6 . | B5 - A5 . G5 . D5 . | E5 . A5 . C6 . B5 . | A5 - - - F5 . A5 . | G5 . C6 . E6 . D6 . | D6 . B5 . G5 . B5 . | C6 . A5 . F5 . A5 . | G5 - - - . . . . | ' +
      'A5 . F#5 . A5 . D6 . | C#6 - B5 . A5 . E5 . | F#5 . B5 . D6 . C#6 . | B5 - - - G5 . B5 . | A5 . D6 . F#6 . E6 . | E6 . C#6 . A5 . C#6 . | D6 . B5 . G5 . B5 . | A5 - - - - - . . ' },
    { name: 'harm', wave: 'square', vol: .04, notes: SEQ.arp(fa, 8, [2, '-', 1, '-', 2, '-', 1, '-'], 4) + SEQ.arp(fb, 8, [2, '-', 1, '-', 2, '-', 1, '-'], 4) },
    { name: 'bass', wave: 'triangle', vol: .3, notes: SEQ.bass(fa, 8, ['r', '.', 'r', '.', 'o', '.', 'f', '.'], 2) + SEQ.bass(fb, 8, ['r', '.', 'r', '.', 'o', '.', 'f', '.'], 2) },
    { name: 'drums', wave: 'drums', vol: .1, notes: 'k . h . s . h k | k . h . s h s . ' }] };
  // jingles (stings)
  const J = (bpm, tracks) => ({ bpm, steps: 4, tracks });
  G.JINGLES = {
    win: J(140, [{ wave: 'steel', vol: .14, decay: .6, notes: 'C5 E5 G5 C6 - - E6 - G6 - - - - - - - ' }, { wave: 'triangle', vol: .3, notes: 'C3 . . . G3 . . . C4 - - - - - - - ' }, { wave: 'drums', vol: .1, notes: 'k . s . k . s s k . . . . . . . ' }]),
    lose: J(100, [{ wave: 'pulse', vol: .07, notes: 'G4 - F#4 - F4 - E4 - - - - - ' }, { wave: 'triangle', vol: .25, notes: 'C3 - - - B2 - - - Bb2 - - - ' }]),
    ace: J(160, [{ wave: 'bell', vol: .1, decay: .5, notes: 'G5 C6 E6 G6 - - ' }]),
    matchpoint: J(150, [{ wave: 'square', vol: .06, notes: 'A5 . A5 . E6 - - - ' }, { wave: 'drums', vol: .1, notes: 't t t t s . . . ' }]),
    gift_love: J(150, [{ wave: 'bell', vol: .1, decay: .5, notes: 'C6 E6 G6 C7 - - - - ' }]),
    gift_refuse: J(110, [{ wave: 'square', vol: .05, notes: 'E4 - Eb4 - D4 - - - ' }]),
    jackpot: J(170, [{ wave: 'steel', vol: .13, decay: .4, notes: 'C6 G5 C6 E6 G6 E6 G6 C7 - - - - C7 - - - ' }, { wave: 'drums', vol: .1, notes: 'k s k s k s k s k . k . k . . . ' }]),
    daystart: J(130, [{ wave: 'bell', vol: .1, decay: .7, notes: 'C6 G5 E6 - C7 - - - ' }]),
    levelup: J(150, [{ wave: 'marimba', vol: .12, decay: .3, notes: 'C5 E5 G5 C6 E6 G6 - - ' }]),
    photo: J(150, [{ wave: 'bell', vol: .08, decay: .4, notes: 'E6 C6 - - ' }])
  };
})();

// ==== 10-input.js ====
/* 10-input: action maps per context, the device and glyph logic, glyph icons drawn as pixel art, prompts, the mouse
 * wheel, and the touch-only gate. */
const MENUK = { start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Backspace', 'Pad1'] };
const MOVES = { up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'] };
G.INPUT = {
  // play, dive, shot, call in this order so the split keyboard's halves come out F/. play, G// dive, H/, shot, R/L call
  MATCH: Object.assign({}, MOVES, { play: ['Space', 'KeyJ', 'Mouse0', 'Pad0'], dive: ['ShiftLeft', 'KeyL', 'Pad1'], shot: ['KeyE', 'KeyK', 'Mouse2', 'Pad2'], call: ['KeyQ', 'KeyI', 'Mouse1', 'Pad3'], view: ['KeyV', 'Pad11'] }, MENUK),
  EXPLORE: Object.assign({}, MOVES, { interact: ['KeyE', 'Space', 'Enter', 'Pad0'], run: ['ShiftLeft', 'Pad1', 'Pad7'], bag: ['KeyG', 'Pad2'], leave: ['KeyM', 'Tab', 'Pad3'], snap: ['KeyC', 'Pad8'] }, MENUK),
  MENU: Object.assign({}, MOVES, { alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], hide: ['KeyH', 'Pad11'], zoomIn: ['Equal', 'Pad7'], zoomOut: ['Minus', 'Pad6'] }, MENUK),
  POOLHOP: Object.assign({}, MOVES, { hopA: ['KeyJ', 'Space', 'Mouse0', 'Pad0'], hopB: ['KeyL', 'ShiftLeft', 'Pad1'], hopX: ['KeyK', 'KeyE', 'Mouse2', 'Pad2'], hopY: ['KeyI', 'KeyQ', 'Pad3'] }, MENUK),
  CASINO: Object.assign({}, MOVES, { alt: ['KeyF', 'Pad2'], extra: ['KeyR', 'Pad3'], tabL: ['KeyQ', 'Pad4'], tabR: ['KeyE', 'Pad5'], hit: ['KeyH', 'Pad0'], stand: ['KeyS', 'Pad2'], double: ['KeyD', 'Pad3'], split: ['KeyP', 'Pad5'],
    reel1: ['KeyJ', 'Pad0'], reel2: ['KeyK', 'Pad1'], reel3: ['KeyL', 'Pad2'] }, MENUK)
};
// the casino's blackjack keys H S D P sit on letters WASD also uses: the casino reads them only in their own phase
G.INPUT.CASINO.down = ['ArrowDown', 'Pad13']; G.INPUT.CASINO.right = ['ArrowRight', 'Pad15'];
G.INPUT.CASINO.cancel = ['Backspace', 'Pad1'];
G.INPUT.CASINO.confirm = ['Enter', 'Space', 'Pad0'];
// a mouse wheel: menus page with it, photo mode zooms with it
G.wheel = 0;
if (typeof addEventListener === 'function') addEventListener('wheel', e => { G.wheel += Math.sign(e.deltaY); G.lastInputT = G.game ? G.game.real : 0; G.anyInput = true; }, { passive: true });
G.takeWheel = () => { const w = G.wheel; G.wheel = 0; return w; };

/* ---- devices: 'ps' | 'xbox' | 'kbm' ---- */
G.device = (I = G.game.input) => I.lastDevice === 'gamepad' ? (I.padStyle() === 'xbox' ? 'xbox' : 'ps') : I.lastDevice === 'mouse' ? 'mouse' : 'kbm';
/** the code to show for an action on the input's last device: a pad button, a key or a mouse button */
G.codeFor = (action, I = G.game.input, dev = G.device(I)) => {
  const codes = (I.map && I.map[action]) || [];
  if (dev === 'ps' || dev === 'xbox') return codes.find(c => /^Pad\d+$/.test(c)) || codes[0];
  if (dev === 'mouse') return codes.find(c => /^Mouse/.test(c)) || codes.find(c => /^(Key|Space|Shift|Enter|Arrow|Tab|Backspace|Escape|Digit|Period|Slash|Comma|Equal|Minus)/.test(c)) || codes[0];
  return codes.find(c => /^(Key|Space|Shift|Enter|Arrow|Tab|Backspace|Escape|Digit|Period|Slash|Comma|Equal|Minus|Numpad)/.test(c)) || codes[0];
};
G.PS_COL = ['#8fb8ff', '#ff7a7a', '#f59ad8', '#5fe0b4'];
G.XB_COL = ['#6ad66a', '#ff5a5a', '#4aa8ff', '#ffd23a'];
/** draw the glyph icon for a code at (x, y) (top-left, 9 px tall); returns its width */
G.drawGlyph = (g, x, y, code, I = G.game.input) => {
  x = Math.round(x); y = Math.round(y);
  const pad = /^Pad(\d+)$/.exec(code || ''), style = I.padStyle ? I.padStyle() : 'playstation';
  if (pad) {
    const n = +pad[1];
    if (n <= 3) {
      if (style === 'xbox') { px.disc(g, x + 4.5, y + 4.5, 4.5, G.XB_COL[n]); E.font.text(g, 'ABXY'[n], x + 3, y + 1, '#101418', { outline: false }); }
      else {
        px.disc(g, x + 4.5, y + 4.5, 4.5, '#1a1d28'); px.disc(g, x + 4.5, y + 4.5, 3.5, '#262a38'); const c = G.PS_COL[n];
        if (n === 0) { px.line(g, x + 2, y + 2, x + 6, y + 6, c); px.line(g, x + 6, y + 2, x + 2, y + 6, c); }
        else if (n === 1) { px.disc(g, x + 4.5, y + 4.5, 2.6, c); px.disc(g, x + 4.5, y + 4.5, 1.4, '#262a38'); }
        else if (n === 2) { px.rect(g, x + 2, y + 2, 5, 5, c); px.rect(g, x + 3, y + 3, 3, 3, '#262a38'); }
        else { px.line(g, x + 4, y + 2, x + 2, y + 6, c); px.line(g, x + 4, y + 2, x + 6, y + 6, c); px.line(g, x + 2, y + 6, x + 6, y + 6, c); }
      }
      return 9;
    }
    const names = style === 'xbox' ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] : ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3'];
    if (n >= 12 && n <= 15) {   // the d-pad: a cross with the pressed arm lit
      px.rect(g, x + 3, y, 3, 9, '#3a3e4c'); px.rect(g, x, y + 3, 9, 3, '#3a3e4c');
      const arm = [[3, 0, 3, 3], [3, 6, 3, 3], [0, 3, 3, 3], [6, 3, 3, 3]][n - 12]; px.rect(g, x + arm[0], y + arm[1], arm[2], arm[3], '#ffffff'); return 9;
    }
    const t = names[n] || ('B' + n), w = E.font.width(t) + 6;
    E.ui.box(g, x, y, w, 9, { bg: '#2a2e3c', border: '#8a90a8', gradient: false }); E.font.text(g, t, x + 3, y + 1, '#ffffff', { outline: false });
    return w;
  }
  if (/^Mouse(\d)$/.test(code || '')) {   // a mouse with the bound button lit
    const b = +code[5];
    px.rect(g, x + 1, y, 7, 9, '#d8dce8'); px.rect(g, x, y + 1, 9, 7, '#d8dce8'); px.rect(g, x + 4, y, 1, 4, '#5a6070');
    if (b === 0) px.rect(g, x + 1, y + 1, 3, 3, '#ff9e5e'); else if (b === 2) px.rect(g, x + 5, y + 1, 3, 3, '#ff9e5e'); else px.rect(g, x + 4, y + 1, 1, 3, '#ff9e5e');
    return 9;
  }
  // a keycap
  const t = (I.codeLabel ? I.codeLabel(code) : code || '?').replace('Left click', 'LMB'), w = Math.max(9, E.font.width(t) + 6);
  px.rect(g, x, y, w, 9, '#9aa0b4'); px.rect(g, x, y, w, 8, '#f0f2f8'); px.rect(g, x + 1, y + 1, w - 2, 6, '#ffffff');
  E.font.text(g, t, x + 3, y + 1, '#2a2e3c', { outline: false });
  return w;
};
G.glyphW = (code, I = G.game.input) => { const pad = /^Pad(\d+)$/.exec(code || ''); if (pad) { const n = +pad[1]; if (n <= 3 || (n >= 12 && n <= 15)) return 9; const st = I.padStyle(); const names = st === 'xbox' ? ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'VIEW', 'MENU', 'LS', 'RS'] : ['', '', '', '', 'L1', 'R1', 'L2', 'R2', 'CREATE', 'OPTIONS', 'L3', 'R3']; return E.font.width(names[n] || 'B' + n) + 6; }
  if (/^Mouse/.test(code || '')) return 9; return Math.max(9, E.font.width((I.codeLabel ? I.codeLabel(code) : code || '?').replace('Left click', 'LMB')) + 6); };
/** a prompt: glyph + text; returns its width */
G.prompt = (g, x, y, action, text, I = G.game.input, color = '#fff8e8') => {
  const code = G.codeFor(action, I), w = G.drawGlyph(g, x, y, code, I);
  E.font.text(g, text, x + w + 3, y + 1, color, { shadow: '#000', outline: false });
  return w + 3 + E.font.width(text) + 8;
};
G.promptW = (action, text, I = G.game.input) => G.glyphW(G.codeFor(action, I), I) + 3 + E.font.width(text) + 8;
/** the word for a button in running text ("Press ✕"), from the action map and the device */
G.btn = (action, I = G.game.input) => { const c = G.codeFor(action, I); if (/^Pad(\d+)$/.test(c)) { const n = +c.slice(3); const st = I.padStyle(); if (n <= 3) return st === 'xbox' ? 'ABXY'[n] : '✕○□△'[n]; } return I.codeLabel ? I.codeLabel(c) : c; };
G.fillTips = (s, I) => s.replace(/\{(\w+)\}/g, (m, a) => G.btn(a, I));
/** the prompt bar at the bottom centre: [[action, text], ...] */
G.promptBar = (r, list, I = G.game.input, y = null) => {
  const ta = I.touchArea && I.touchArea(); let total = 0; for (const [a, t] of list) total += G.promptW(a, t, I);
  const yy = y === null ? r.H - 16 - (ta && ta.y0 < r.H - 16 ? r.H - ta.y0 : 0) : y;
  r.overlay(g => {
    px.blend(g, .55, 'normal', () => px.rect(g, Math.round(r.W / 2 - total / 2 - 6), yy - 3, Math.round(total + 8), 15, '#081820'));
    let x = Math.round(r.W / 2 - total / 2); for (const [a, t] of list) x += G.prompt(g, x, yy, a, t, I);
  });
};

/* ---- the touch-only gate: a coarse pointer only, and no key or pad seen yet ---- */
G.sawKeyOrPad = false;
G.touchOnly = () => {
  if (G.sawKeyOrPad || typeof matchMedia !== 'function') return false;
  try { return matchMedia('(any-pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; }
};
if (typeof addEventListener === 'function') {
  const seen = () => { G.anyInput = true; if (G.game) G.lastInputT = G.game.real; };
  addEventListener('keydown', () => { G.sawKeyOrPad = true; seen(); }, true);
  addEventListener('pointerdown', seen, true);
  addEventListener('pointermove', e => { if (G._pm) { if (Math.hypot(e.clientX - G._pm[0], e.clientY - G._pm[1]) > 4) seen(); } G._pm = [e.clientX, e.clientY]; }, true);
  addEventListener('touchstart', seen, true);
}
/** gamepads count as "a key or pad": any button seen down */
G.pollPads = () => {
  try { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps || []) if (p && p.buttons.some(b => b.pressed)) { G.sawKeyOrPad = true; G.anyInput = true; G.lastInputT = G.game.real; } } catch (e) { /* blocked */ }
};

// ==== 11-ui.js ====
/* 11-ui: the 10-foot canvas UI kit. Screens lay out their widgets from r.W / r.H (the same layout in update and draw, so
 * headless tests can drive them), at most 8 focusables a screen, spatial focus by stick / d-pad / WASD / arrows, hover
 * moves the focus, a click activates, a right click goes back, the wheel pages. */
G.INPUT.MENU.cancel = ['Backspace', 'Pad1', 'Mouse2'];
G.THEMES = {
  day: { bg: ['#0f4c5c', '#0a2d3d'], border: '#f6d38a', ink: '#fff8e8', muted: '#9fd3d6', accent: '#ff9e5e', gold: '#ffd36a' },
  night: { bg: ['#2a1240', '#12081e'], border: '#ff5fa2', ink: '#fff8e8', muted: '#c8a8e0', accent: '#5ff0ff', gold: '#ffd36a' }
};
G.UI = {
  theme: 'day',
  get T() { return G.THEMES[this.theme] || G.THEMES.day; },
  panel(g, x, y, w, h, o = {}) { const T = this.T; E.ui.box(g, Math.round(x), Math.round(y), Math.round(w), Math.round(h), { bg: o.bg || T.bg, border: o.border || T.border, alpha: o.alpha }); },
  /** the focus: a 2-px gold outline, a 1-px white inner line, a soft pulsing glow and a 1-px lift */
  focus(g, x, y, w, h) {
    x = Math.round(x); y = Math.round(y) - 1; w = Math.round(w); h = Math.round(h);
    const p = .25 + .2 * Math.sin(G.game.real * 5);
    px.blend(g, p, 'add', () => px.rect(g, x - 3, y - 3, w + 6, h + 6, '#ffd36a'));
    px.rect(g, x - 2, y - 2, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y + h, w + 4, 2, '#ffd36a'); px.rect(g, x - 2, y, 2, h, '#ffd36a'); px.rect(g, x + w, y, 2, h, '#ffd36a');
    px.rect(g, x, y, w, 1, '#ffffff'); px.rect(g, x, y + h - 1, w, 1, '#ffffff'); px.rect(g, x, y, 1, h, '#ffffff'); px.rect(g, x + w - 1, y, 1, h, '#ffffff');
  },
  text(g, s, x, y, c = this.T.ink, o = {}) { return E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ shadow: '#00000099', outline: false }, o)); },
  heading(g, s, x, y, o = {}) { return E.font.text(g, s, Math.round(x), Math.round(y), o.color || this.T.gold, Object.assign({ scale: 2, shadow: '#000', outline: false }, o)); },
  title(g, s, x, y, o = {}) { E.font.title(g, s, Math.round(x), Math.round(y), Object.assign({ scale: 3, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], depth: 2, align: 'center' }, o)); },
  button(g, it, focused) {
    const T = this.T, dis = it.disabled;
    E.ui.box(g, Math.round(it.x), Math.round(it.y) - (focused ? 1 : 0), Math.round(it.w), Math.round(it.h), { bg: focused ? ['#1f7a8c', '#12475a'] : T.bg, border: dis ? '#5a6a70' : focused ? '#ffd36a' : T.border });
    if (focused) this.focus(g, it.x, it.y, it.w, it.h);
    const sc = it.scale || 1, tw = E.font.width(it.label, { scale: sc }), cx = it.align === 'left' ? it.x + 8 : it.x + it.w / 2 - tw / 2;
    E.font.text(g, it.label, Math.round(cx), Math.round(it.y + it.h / 2 - 3.5 * sc) - (focused ? 1 : 0), dis ? '#7a8a90' : focused ? '#ffffff' : T.ink, { scale: sc, shadow: '#000', outline: false });
    if (it.right) E.font.text(g, it.right, Math.round(it.x + it.w - 8 - E.font.width(it.right)), Math.round(it.y + it.h / 2 - 3.5) - (focused ? 1 : 0), dis ? '#7a8a90' : T.gold, { shadow: '#000', outline: false });
  },
  slider(g, it, focused) {
    const T = this.T, t = it.tune, v = it.get(), u = (v - t.min) / (t.max - t.min || 1), d = (t.def - t.min) / (t.max - t.min || 1);
    E.ui.box(g, it.x, it.y - (focused ? 1 : 0), it.w, it.h, { bg: focused ? ['#1f7a8c', '#12475a'] : T.bg, border: focused ? '#ffd36a' : T.border });
    if (focused) this.focus(g, it.x, it.y, it.w, it.h);
    E.font.text(g, t.label, it.x + 6, it.y + 3, '#fff8e8', { shadow: '#000', outline: false });
    const val = t.step >= 1 ? G.fmt(v) : (+v).toFixed(t.step < .01 ? 3 : 2);
    E.font.text(g, (v !== t.def ? '* ' : '') + val, it.x + it.w - 6 - E.font.width((v !== t.def ? '* ' : '') + val), it.y + 3, v !== t.def ? '#ffd36a' : '#9fd3d6', { shadow: '#000', outline: false });
    const bx = it.x + 6, bw = it.w - 12, by = it.y + it.h - 6;
    px.rect(g, bx, by, bw, 3, '#0a1a22'); px.rect(g, bx, by, Math.round(bw * u), 3, '#ff9e5e');
    px.rect(g, Math.round(bx + bw * d), by - 2, 1, 7, '#ffffff');   // the default as a tick
    px.rect(g, Math.round(bx + bw * u) - 1, by - 1, 3, 5, '#ffd36a');
  },
  hearts(g, x, y, aff) { E.ui.hearts(g, Math.round(x), Math.round(y), Math.round(aff / 10) / 2, 5); },
  stage(aff) { return aff >= 80 ? 'Best Friend' : aff >= 60 ? 'Good Friend' : aff >= 40 ? 'Friend' : aff >= 20 ? 'Acquaintance' : 'Stranger'; },
  money(g, x, y, n, align = 'left') {
    const s = G.fmtMoney(n), w = E.font.width(s, { scale: 2 }) + 14, X = align === 'right' ? x - w : x;
    px.disc(g, X + 5, y + 7, 5, '#c89020'); px.disc(g, X + 5, y + 7, 4, '#ffd36a'); E.font.text(g, '$', X + 3, y + 4, '#8a5a10', { outline: false });
    E.font.text(g, s, X + 13, y + 1, '#fff3c0', { scale: 2, shadow: '#000', outline: false });
    return w;
  },
  /** "Day 2 • Afternoon" with sun or moon and weather */
  clock(g, x, y, day, slot, weather, align = 'left') {
    const s = 'Day ' + day + ' • ' + G.SLOTS[slot], w = E.font.width(s) + 30, X = align === 'right' ? x - w : x;
    E.ui.box(g, X, y, w, 15, { bg: this.T.bg, border: this.T.border, alpha: .9 });
    if (slot === 2) { px.disc(g, X + 8, y + 7, 4, '#f0f0d0'); px.disc(g, X + 10, y + 6, 3, '#1a2a4a'); }
    else { px.disc(g, X + 8, y + 7, 4, '#ffd36a'); px.disc(g, X + 8, y + 7, 2, '#fff3c0'); }
    G.UI.weatherIcon(g, X + 16, y + 3, weather);
    E.font.text(g, s, X + 26, y + 4, '#fff8e8', { shadow: '#000', outline: false });
    return w;
  },
  weatherIcon(g, x, y, w) {
    if (w === 'rain') { px.disc(g, x + 3, y + 3, 3, '#c8d0e0'); px.disc(g, x + 6, y + 3, 2, '#c8d0e0'); for (let i = 0; i < 3; i++) px.rect(g, x + 1 + i * 3, y + 6, 1, 2, '#6ab0ff'); }
    else if (w === 'cloudy') { px.disc(g, x + 3, y + 4, 3, '#e8ecf4'); px.disc(g, x + 6, y + 4, 2, '#e8ecf4'); }
    else { px.disc(g, x + 4, y + 4, 2, '#ffd36a'); for (const [dx, dy] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) px.dot(g, x + 4 + dx, y + 4 + dy, '#ffd36a'); }
  },
  mood(g, x, y, m) {
    if (m === 'happy') { px.disc(g, x + 3, y + 3, 3, '#ffd36a'); px.dot(g, x + 2, y + 2, '#5a3a10'); px.dot(g, x + 4, y + 2, '#5a3a10'); px.rect(g, x + 2, y + 4, 3, 1, '#5a3a10'); }
    else if (m === 'gloomy') { px.disc(g, x + 3, y + 3, 3, '#8a9ab0'); px.dot(g, x + 2, y + 2, '#2a3040'); px.dot(g, x + 4, y + 2, '#2a3040'); px.rect(g, x + 2, y + 5, 3, 1, '#2a3040'); }
    else { px.disc(g, x + 3, y + 3, 3, '#c8e0e8'); px.dot(g, x + 2, y + 2, '#2a3040'); px.dot(g, x + 4, y + 2, '#2a3040'); px.rect(g, x + 2, y + 4, 3, 1, '#2a3040'); }
  },
  coin(g, x, y) { px.disc(g, x + 4, y + 4, 4, '#c89020'); px.disc(g, x + 4, y + 4, 3, '#ffd36a'); px.dot(g, x + 3, y + 3, '#fff3c0'); },
  chip(g, x, y, c = '#e8283a') { px.disc(g, x + 4, y + 4, 4, '#ffffff'); px.disc(g, x + 4, y + 4, 3, c); px.disc(g, x + 4, y + 4, 1.5, '#ffffff'); },
  /** an item's icon: suits as a little swimsuit, accessories by anchor, gifts as a wrapped box in their category's colours */
  itemIcon(g, x, y, it, s = 1) {
    x = Math.round(x); y = Math.round(y);
    if (it.kind === 'suit') {
      const [m, a, t] = it.colors;
      px.rect(g, x + 4 * s, y + 1 * s, 2 * s, 3 * s, t); px.rect(g, x + 10 * s, y + 1 * s, 2 * s, 3 * s, t);
      px.rect(g, x + 3 * s, y + 4 * s, 10 * s, 5 * s, m); px.rect(g, x + 4 * s, y + 9 * s, 8 * s, 3 * s, m); px.rect(g, x + 5 * s, y + 12 * s, 6 * s, 2 * s, m);
      px.rect(g, x + 3 * s, y + 6 * s, 10 * s, 1 * s, a); if (it.cut === 'sport2' || it.cut === 'tankini') px.rect(g, x + 3 * s, y + 9 * s, 10 * s, 1 * s, '#f1cfb2');
    } else if (it.kind === 'acc') {
      const c = it.shades ? '#20262e' : '#ffd36a';
      if (it.anchor === 'face') { px.rect(g, x + 2 * s, y + 6 * s, 5 * s, 3 * s, it.id === 'heartshades' ? '#ff5fa2' : it.id === 'aviators' ? '#c89020' : c); px.rect(g, x + 9 * s, y + 6 * s, 5 * s, 3 * s, it.id === 'heartshades' ? '#ff5fa2' : it.id === 'aviators' ? '#c89020' : c); px.rect(g, x + 7 * s, y + 6 * s, 2 * s, 1 * s, '#e8eef2'); }
      else if (it.anchor === 'head') { px.rect(g, x + 2 * s, y + 7 * s, 12 * s, 3 * s, it.id === 'sunhat' ? '#e8c880' : it.id === 'visor' ? '#ffffff' : '#ff6a5a'); if (it.id === 'sunhat') px.rect(g, x + 5 * s, y + 4 * s, 6 * s, 3 * s, '#d8b870'); }
      else if (it.anchor === 'neck') for (let i = 0; i < 5; i++) px.disc(g, x + (3 + i * 2.5) * s, y + (6 + Math.abs(i - 2)) * s, 1.2 * s, '#ffffff');
      else if (it.anchor === 'wrists') { px.rect(g, x + 3 * s, y + 6 * s, 4 * s, 4 * s, '#ff5a5a'); px.rect(g, x + 9 * s, y + 6 * s, 4 * s, 4 * s, '#ff5a5a'); }
      else { px.disc(g, x + 8 * s, y + 8 * s, 4 * s, it.id === 'hibiscus' ? '#e8283a' : '#ff6aa8'); px.disc(g, x + 8 * s, y + 8 * s, 1.5 * s, '#ffd36a'); }
    } else {
      const [c1, c2] = G.GIFT_ICON_COLORS[it.cat] || ['#ffd36a', '#c89020'];
      px.rect(g, x + 2 * s, y + 5 * s, 12 * s, 9 * s, c2); px.rect(g, x + 3 * s, y + 6 * s, 10 * s, 7 * s, c1);
      px.rect(g, x + 7 * s, y + 5 * s, 2 * s, 9 * s, '#ffffff'); px.rect(g, x + 2 * s, y + 8 * s, 12 * s, 2 * s, '#ffffff');
      px.disc(g, x + 6 * s, y + 4 * s, 2 * s, '#ffffff'); px.disc(g, x + 10 * s, y + 4 * s, 2 * s, '#ffffff');
    }
  }
};

/** a focus over a list of widgets ({ x, y, w, h, id, disabled, kind }); one per screen. update() returns what happened */
G.Focus = class {
  constructor() { this.i = 0; this.items = []; this._p = null; }
  set(items) { this.items = items; if (this.i >= items.length) this.i = Math.max(0, items.length - 1); return this; }
  get cur() { return this.items[this.i]; }
  focusId(id) { const k = this.items.findIndex(it => it.id === id); if (k >= 0) this.i = k; }
  _hit(p) { if (!p) return -1; return this.items.findIndex(it => p[0] >= it.x && p[0] < it.x + it.w && p[1] >= it.y && p[1] < it.y + it.h); }
  update(I = G.game.input) {
    const res = { pick: null, back: false, alt: false, extra: false, tabL: false, tabR: false, lr: 0 };
    const A = this.items; if (!A.length) { res.back = I.pressed('cancel'); return res; }
    const p = I.pointer && I.pointer();
    if (p && (!this._p || p[0] !== this._p[0] || p[1] !== this._p[1])) { const k = this._hit(p); if (k >= 0 && k !== this.i) { this.i = k; G.sfx('ui_tick'); } }
    this._p = p ? [p[0], p[1]] : null;
    const cur = A[this.i];
    // sliders take left / right and a mouse drag
    if (cur && cur.kind === 'slider') {
      const l = I.repeat('left', .3, .05), r = I.repeat('right', .3, .05);
      if (l || r) res.lr = r ? 1 : -1;
      if (p && I.down && I.held && I.held.has && I.held.has('Mouse0') && this._hit(p) === this.i) res.drag = clamp((p[0] - cur.x - 6) / (cur.w - 12), 0, 1);
    }
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
    for (const [a, dx, dy] of dirs) {
      if (cur && cur.kind === 'slider' && dx) continue;
      if (cur && cur.kind === 'stepper' && dx) { if (I.repeat(a, .35, .09)) res.lr = dx; continue; }
      if (!I.repeat(a, .35, .09)) continue;
      const n = this._nav(dx, dy); if (n >= 0 && n !== this.i) { this.i = n; G.sfx('ui_tick'); }
    }
    const c = I.clicked && I.clicked();
    if (c) { const k = this._hit(c); if (k >= 0) { this.i = k; const it = A[k]; if (it.kind === 'stepper') res.lr = c[0] > it.x + it.w / 2 ? 1 : -1; else if (it.kind !== 'slider') { if (it.disabled) G.sfx('ui_error'); else res.pick = it; } } }
    if (I.pressed('confirm') && cur) { if (cur.disabled) G.sfx('ui_error'); else if (cur.kind === 'stepper') res.lr = 1; else res.pick = cur; }
    if (res.pick) G.sfx('ui_select');
    if (I.pressed('cancel')) { res.back = true; G.sfx('ui_back'); }
    if (I.map.alt && I.pressed('alt')) res.alt = true;
    if (I.map.extra && I.pressed('extra')) res.extra = true;
    if (I.map.tabL && I.pressed('tabL')) res.tabL = true;
    if (I.map.tabR && I.pressed('tabR')) res.tabR = true;
    const w = G.takeWheel(); if (w < 0) res.tabL = true; else if (w > 0) res.tabR = true;
    if (res.tabL || res.tabR) G.sfx('ui_tab');
    return res;
  }
  /** the nearest widget in a direction (spatial focus) */
  _nav(dx, dy) {
    const c = this.items[this.i]; if (!c) return 0;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2; let best = -1, bd = 1e9;
    this.items.forEach((it, k) => {
      if (k === this.i) return;
      const x = it.x + it.w / 2, y = it.y + it.h / 2, vx = x - cx, vy = y - cy, along = vx * dx + vy * dy;
      if (along <= 2) return;
      const across = Math.abs(vx * dy - vy * dx), d = along + across * 2.2;
      if (d < bd) { bd = d; best = k; }
    });
    if (best < 0 && dy) { const k = this.i + dy; if (k >= 0 && k < this.items.length) return k; }
    return best;
  }
};
/** a vertical list of buttons centred at x: returns widgets */
G.UI.column = (labels, x, y, w, h = 18, gap = 4, o = {}) => labels.map((l, k) => Object.assign({ x: Math.round(x - w / 2), y: Math.round(y + k * (h + gap)), w, h, id: typeof l === 'string' ? l : l.id, label: typeof l === 'string' ? l : l.label }, typeof l === 'string' ? {} : l, o));
/** draw notices (toasts) */
G.drawNotices = r => {
  G.notices = G.notices.filter(n => n.t < n.sec);
  if (!G.notices.length) return;
  r.overlay(g => G.notices.forEach((n, k) => {
    const w = Math.max(E.font.width(n.title), E.font.width(n.text)) + 16, x = Math.round(r.W / 2 - w / 2), slide = Math.min(1, n.t * 6, (n.sec - n.t) * 6), y = Math.round(-30 + slide * (38 + k * 30));
    G.UI.panel(g, x, y, w, n.text ? 26 : 15); E.font.text(g, n.title, x + 8, y + 4, '#ffd36a', { shadow: '#000', outline: false });
    if (n.text) E.font.text(g, n.text, x + 8, y + 14, '#fff8e8', { shadow: '#000', outline: false });
  }));
};

// ==== 12-audio.js ====
/* 12-audio: sound effects, music control, ambience and the Animalese voice synth. Everything is made in code. */
G.SFX = {
  // ball
  bump: [{ wave: 'sine', freq: 160, to: 90, dur: .09, vol: .35 }, { wave: 'noise', freq: 700, to: 300, dur: .05, vol: .12, filter: 'lowpass' }],
  set: [{ wave: 'sine', freq: 400, to: 300, dur: .05, vol: .25 }, { wave: 'noise', freq: 2000, dur: .03, vol: .06 }],
  spike: [{ wave: 'noise', freq: 2400, to: 500, dur: .12, vol: .32 }, { wave: 'sine', freq: 120, to: 40, dur: .16, vol: .4 }],
  block: [{ wave: 'noise', freq: 1600, to: 600, dur: .08, vol: .3 }, { wave: 'noise', freq: 1200, to: 500, dur: .08, vol: .25, delay: .04 }, { wave: 'sine', freq: 140, to: 60, dur: .1, vol: .3 }],
  serveToss: { wave: 'noise', freq: 600, to: 1800, dur: .25, vol: .1 },
  serveHit: [{ wave: 'noise', freq: 1800, to: 400, dur: .09, vol: .28 }, { wave: 'sine', freq: 150, to: 60, dur: .12, vol: .35 }],
  sand: { wave: 'noise', freq: 600, to: 150, dur: .22, vol: .3, filter: 'lowpass' },
  net: [{ wave: 'noise', freq: 3000, dur: .03, vol: .15 }, { wave: 'noise', freq: 2600, dur: .03, vol: .12, delay: .05 }, { wave: 'noise', freq: 2200, dur: .04, vol: .1, delay: .1 }],
  tape: [{ wave: 'triangle', freq: 900, to: 700, dur: .08, vol: .2 }, { wave: 'triangle', freq: 700, to: 760, dur: .15, vol: .1, vib: [20, .05], delay: .05 }],
  whistle: { wave: 'square', freq: 2200, vib: [30, .05], dur: .35, vol: .12 },
  // crowd and court
  crowdCheer: { wave: 'noise', freq: 700, to: 1100, dur: 1.4, vol: .2, filter: 'lowpass' },
  crowdGroan: { wave: 'noise', freq: 900, to: 300, dur: .9, vol: .14, filter: 'lowpass' },
  ooh: { wave: 'noise', freq: 500, to: 800, dur: .6, vol: .1, filter: 'bandpass', q: 3 },
  step_sand: { wave: 'noise', freq: 400, to: 200, dur: .05, vol: .05, filter: 'lowpass' },
  dive: { wave: 'noise', freq: 500, to: 150, dur: .35, vol: .22, filter: 'lowpass' },
  high_five: [{ wave: 'noise', freq: 2600, to: 1400, dur: .06, vol: .3 }, { wave: 'sine', freq: 300, to: 200, dur: .05, vol: .15 }],
  glare: [{ wave: 'bell', freq: 'E7', dur: .5, vol: .1, decay: .4 }, { wave: 'bell', freq: 'B7', dur: .5, vol: .08, decay: .4, delay: .08 }],
  seagull: [{ wave: 'sine', freq: 1500, to: 2200, dur: .15, vol: .05 }, { wave: 'sine', freq: 2100, to: 1300, dur: .2, vol: .05, delay: .16 }],
  wave_swell: { wave: 'noise', freq: 300, to: 900, dur: 2.6, vol: .08, filter: 'lowpass', attack: 1.2, hold: true },
  cricket: [{ wave: 'pulse', freq: 4200, dur: .03, vol: .02 }, { wave: 'pulse', freq: 4200, dur: .03, vol: .02, delay: .06 }, { wave: 'pulse', freq: 4200, dur: .03, vol: .02, delay: .12 }],
  murmur: { wave: 'noise', freq: 500, to: 650, dur: 2.5, vol: .05, filter: 'bandpass', q: 1.5, attack: 1, hold: true },
  // pool
  splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .3 }, { wave: 'sine', freq: 300, to: 80, dur: .2, vol: .2 }],
  hopLand: { wave: 'sine', freq: 300, to: 140, dur: .08, vol: .3 },
  // ui
  ui_tick: { wave: 'triangle', freq: 1200, dur: .03, vol: .1 },
  ui_select: [{ wave: 'triangle', freq: 880, dur: .05, vol: .14 }, { wave: 'triangle', freq: 1320, dur: .07, vol: .12, delay: .05 }],
  ui_back: { wave: 'triangle', freq: 660, to: 440, dur: .08, vol: .12 },
  ui_error: { wave: 'square', freq: 180, dur: .12, vol: .1 },
  ui_tab: { wave: 'triangle', freq: 990, dur: .04, vol: .1 },
  // casino
  cash: { wave: 'square', freq: 'C6', arp: [0, 4, 7, 12], step: .05, dur: .25, vol: .08 },
  chip: { wave: 'noise', freq: 4000, dur: .03, vol: .15 },
  card_deal: { wave: 'noise', freq: 3000, to: 1500, dur: .07, vol: .12 },
  card_flip: { wave: 'noise', freq: 2000, to: 3500, dur: .05, vol: .12 },
  reel_spin: { wave: 'pulse', freq: 600, dur: .02, vol: .05 },
  reel_stop: [{ wave: 'sine', freq: 200, to: 90, dur: .08, vol: .3 }, { wave: 'noise', freq: 1500, dur: .03, vol: .1 }],
  wheel_spin: { wave: 'noise', freq: 900, dur: .05, vol: .06 },
  ball_rattle: { wave: 'triangle', freq: 2400, to: 1800, dur: .03, vol: .1 },
  // story and misc
  gift_unwrap: [{ wave: 'noise', freq: 3000, to: 1200, dur: .25, vol: .15 }, { wave: 'bell', freq: 'G6', dur: .4, vol: .08, decay: .35, delay: .2 }],
  heart_up: { wave: 'triangle', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .12 },
  heart_down: { wave: 'triangle', freq: 'C5', arp: [7, 3, 0, -5], step: .07, dur: .3, vol: .1 },
  shutter: [{ wave: 'noise', freq: 4000, dur: .03, vol: .2 }, { wave: 'noise', freq: 3000, dur: .04, vol: .15, delay: .06 }],
  flash: { wave: 'sine', freq: 3000, to: 5000, dur: .15, vol: .05 },
  firework: [{ wave: 'noise', freq: 300, to: 60, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'noise', freq: 5000, dur: .4, vol: .08, delay: .15 }],
  door: [{ wave: 'noise', freq: 400, to: 200, dur: .15, vol: .15 }, { wave: 'sine', freq: 120, dur: .08, vol: .15, delay: .12 }],
  coin: { wave: 'square', freq: 'B5', arp: [0, 5], step: .07, dur: .15, vol: .08 },
  slip: [{ wave: 'sine', freq: 600, to: 200, dur: .25, vol: .2 }],
  swim: { wave: 'noise', freq: 800, to: 500, dur: .3, vol: .08 }
};
G.initAudio = game => {
  const A = game.audio;
  for (const k in G.INSTRUMENTS) { const ins = G.INSTRUMENTS[k]; ins.real = ins.imag.map(() => 0); }
  A.instruments = G.INSTRUMENTS;
  for (const k in G.SFX) A.define(k, G.SFX[k]);
};
G.sfx = (name, o) => { const g = G.game; if (g && !G.muteAll) g.audio.sfx(name, o); };
G.music = (name, o = {}) => {
  const g = G.game; if (!g || G.muteAll) return;
  const A = g.audio, song = name ? G.SONGS[name] : null;
  if (G.curSong === name && A.song) return;
  G.curSong = name;
  if (!song) { A.music(null); return; }
  A.music(song, Object.assign({ fade: .6 }, o));
};
G.sting = name => { const g = G.game; if (g && !G.muteAll && G.JINGLES[name]) g.audio.sting(G.JINGLES[name], { duck: .4 }); };

/* ---- ambience: loops of shaped noise per place, retriggered as they end ---- */
G.ambience = { kind: null, t: 0, next: 0,
  set(kind) { this.kind = kind; this.next = 0; },
  update(dt) {
    if (!this.kind || G.muteAll) return; this.t += dt; if (this.t < this.next) return;
    const k = this.kind, rnd = () => G.rng('cosmetic');
    if (k === 'beach') { G.sfx('wave_swell', { vol: .9 }); if (rnd() < .3) G.game.after(.8, () => G.sfx('seagull')); this.next = this.t + 5 + rnd() * 2; }
    else if (k === 'pool') { G.sfx('wave_swell', { vol: .5, pitch: 1.6 }); this.next = this.t + 3 + rnd() * 2; }
    else if (k === 'casino') { G.sfx('murmur'); if (rnd() < .4) G.sfx('coin', { vol: .4 }); this.next = this.t + 2.2; }
    else if (k === 'night') { G.sfx('cricket'); if (rnd() < .4) G.sfx('wave_swell', { vol: .4 }); this.next = this.t + 1.2 + rnd() * 1.5; }
    else if (k === 'crowd') { G.sfx('murmur', { vol: 1.4 }); G.sfx('wave_swell', { vol: .5 }); this.next = this.t + 2.3; }
  } };

/* ---- Animalese voices: each letter a short voiced or noisy blip on the voice bus, pitched by a gentle random walk
 * seeded by the line, so a line always sounds the same. Profile: { base Hz, range semitones, rate, formant, wave } ---- */
const FORMANTS = { a: [800, 1200], e: [450, 1900], i: [300, 2300], o: [500, 900], u: [350, 750], y: [300, 2300] };
G.voice = {
  _ctx() { const A = G.game && G.game.audio; if (!A || G.muteAll || A.muted || !A.ctx || A.ctx.state !== 'running') return null; return A; },
  /** one letter at time t (audio clock): returns its length in seconds */
  letter(A, ch, prof, n, t, mood) {
    const c = A.ctx, bus = A.bus('voice'); if (!bus) return 0;
    const l = ch.toLowerCase(), f = prof.formant || 1;
    if (l === ',') return .12; if (l === '.' || l === '!' || l === '?') return .2; if (!/[a-z]/.test(l)) return .03;
    const shift = (mood === 'happy' ? 2 : mood === 'sad' ? -2 : mood === 'angry' ? -1 : 0) + (prof.sing ? Math.sin(n * .7) * 2 : 0);
    const p = prof.base * Math.pow(2, (prof.range * n + shift) / 12);
    const out = c.createGain(); out.connect(bus);
    const env = (dur, vol) => { out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + .008); out.gain.exponentialRampToValueAtTime(.001, t + dur); };
    const osc = (freq, type, dur) => { const o = c.createOscillator(); o.type = type === 'saw' ? 'sawtooth' : type === 'pulse' ? 'square' : type; o.frequency.setValueAtTime(freq, t); o.frequency.linearRampToValueAtTime(freq * (mood === 'sad' ? .94 : 1.03), t + dur); if (prof.vib) { const lf = c.createOscillator(), lg = c.createGain(); lf.frequency.value = prof.vib; lg.gain.value = freq * .03; lf.connect(lg); lg.connect(o.frequency); lf.start(t); lf.stop(t + dur + .02); } o.start(t); o.stop(t + dur + .02); return o; };
    const noise = (dur) => { const s = c.createBufferSource(); s.buffer = A._noise; s.start(t, (n * .137) % .5); s.stop(t + dur + .02); return s; };
    const band = (src, fr) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = fr * f; b.Q.value = 6; src.connect(b); b.connect(out); };
    if ('aeiouy'.includes(l)) { const o = osc(p, prof.wave, .07); const [f1, f2] = FORMANTS[l]; band(o, f1); band(o, f2); const dry = c.createGain(); dry.gain.value = .25; o.connect(dry); dry.connect(out); env(.08, .5); return .075 / ((prof.rate || 14) / 14); }
    if ('bdgkpt'.includes(l)) { const s = noise(.012); const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 1500; s.connect(h); h.connect(out); const o = osc(p, prof.wave, .045); band(o, 500); band(o, 1500); env(.055, .35); return .055 / ((prof.rate || 14) / 14); }
    if ('fhszcxq'.includes(l)) { const s = noise(.045); const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 3500; s.connect(h); h.connect(out); env(.05, .12); return .045 / ((prof.rate || 14) / 14); }
    { const o = osc(p, 'triangle', .05); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; o.connect(lp); lp.connect(out); env(.055, .35); return .05 / ((prof.rate || 14) / 14); }
  },
  /** the pitch walk for a line */
  walk(text, prof) { const r = E.rng(G.hash(text)); const out = []; let n = 0; for (let i = 0; i < text.length; i++) { n = clamp(n + (r() - .5) * .5, -1, 1); out.push(n); } const q = text.trim().endsWith('?'), ex = text.trim().endsWith('!'); if (q || prof.rise) for (let i = Math.max(0, out.length - 4); i < out.length; i++) out[i] += (i - out.length + 5) * .35; if (ex) for (let i = 0; i < out.length; i++) out[i] += .3; return out; },
  /** the dialog's per-letter hook (engine patch 3): a voice function for a speaker */
  hook(who, mood) {
    const prof = (G.CAST[who] && G.CAST[who].voice) || { base: 260, range: 4, rate: 14, formant: 1, wave: 'triangle' };
    let line = null, walk = null;
    return (ch, i, text) => {
      const A = this._ctx(); if (!A) return;
      if (line !== text) { line = text; walk = this.walk(text, prof); }
      if (i % 2) return;   // every other letter keeps it from turning into a buzz at typing speed
      try { this.letter(A, ch, prof, walk[i] || 0, A.ctx.currentTime + .005, mood); } catch (e) { /* audio closed */ }
    };
  },
  /** a bark without a box: calls, cheers, laughs */
  say(text, who, mood) {
    const A = this._ctx(); if (!A) return;
    const prof = (G.CAST[who] && G.CAST[who].voice) || { base: 260, range: 4, rate: 14, wave: 'triangle' }, w = this.walk(text, prof);
    let t = A.ctx.currentTime + .01;
    try { for (let i = 0; i < text.length; i += 1) t += this.letter(A, text[i], prof, w[i] || 0, t, mood || (text.endsWith('!') ? 'happy' : null)) * 1.1; } catch (e) { /* audio closed */ }
  }
};

// ==== 13-rigs.js ====
/* 13-rigs: the rig factory. Every fighter is an HD Humanoid on the athletic build in a swimsuit: the engine draws the body
 * (patch 5 gives bare legs, shorts and a swimDraw hook in the torso); this file draws each cut and pattern, the hair
 * styles the engine lacks (twin buns, bun, puff, bob, curls, braid ties) and the accessories, depth-sorted around the
 * head. Portraits go through the same draw, so they wear everything too. */
G.ATHLETIC = { legUpper: 7.1, legLower: 7.2, hipZ: 13.9, torso: 8.9, shoulderHalf: 2.95, headR: 3.0, neck: 1.4, armUpper: 5.1, armLower: 4.9, hipHalf: 2.05, limbW: 1.75, torsoW: 2.7, stride: 7.4, speedRef: 80 };
const HAIR_BASE = { twinbuns: 'short', bun: 'short', puff: 'short', bob: 'short', curly: 'short', braid: 'ponytail' };
const tonesOf = c => E.tones(c);
/** a rig for a cast member wearing a suit and accessories */
G.makeRig = (id, o = {}) => {
  const c = G.CAST[id] || G.CAST.rin, size = (o.size || c.size || 1.25) * (o.scale || 1);
  const hairStyle = c.hair.style, base = HAIR_BASE[hairStyle] || hairStyle;
  const opts = Object.assign({}, c.build ? {} : G.ATHLETIC, {
    size, build: c.build || undefined, weapon: null, outfit: c.robe ? 'robe' : 'shirt', hair: base, sleeves: 'none',
    face: { eyes: 'big', bangs: c.bangs === undefined ? .5 : c.bangs },
    colors: { skin: c.skin, hair: c.hair.color, eye: '#1a1320', iris: c.eye, cloth: '#ffffff', pants: c.skin, boot: c.skin, belt: c.skin }
  });
  if (c.shoulder) opts.shoulderHalf = G.ATHLETIC.shoulderHalf + c.shoulder;
  const rig = new E.Humanoid(opts);
  rig.castId = id; rig.extraHair = hairStyle;
  if (c.robe) { rig.C.cloth = c.robe; rig.C.pants = c.skin; rig.C.boot = '#e8c8a0'; rig.C.belt = shade(c.robe, -.2); rig.o.sleeves = 'none'; }
  else if (c.shirt && !o.suit) { Object.assign(rig.C, c.shirt); rig.C.boot = '#8a5a3a'; rig.C.belt = c.shirt.trim; rig.o.sleeves = 'short'; if (id === 'sonny') rig.o.swim = { cut: 'shirt', pattern: 'palms', colors: [c.shirt.cloth, '#ffd36a', '#ff8a5a'] }; }
  rig.baseHat = c.hat || null;
  G.dress(rig, o.suit !== undefined ? o.suit : (c.shirt || c.robe ? null : c.suit), o.acc !== undefined ? o.acc : (c.acc || []));
  const drawBase = rig.draw;
  rig.draw = function (g, ox, oy, view) { G.drawExtras(this, g, ox, oy, view, -1); drawBase.call(this, g, ox, oy, view); G.drawExtras(this, g, ox, oy, view, 1); };
  return rig;
};
const shade = (c, k) => E.shade(c, k);
/** put a suit (an id, or null for the cast member's clothes) and accessories on a rig */
G.dress = (rig, suitId, accs) => {
  const c = G.CAST[rig.castId], s = suitId && G.ITEMS[suitId];
  if (s) {
    const [m, a, t] = s.colors;
    rig.C.cloth = m; rig.C.trim = t; rig.C.belt = s.cut === 'rash' ? a : m; rig.C.swimB = a; rig.C.pants = c.skin; rig.C.boot = c.skin;
    rig.o.sleeves = s.cut === 'rash' ? (s.sleeves || 'short') : 'none';
    rig.o.swim = { cut: s.cut, pattern: s.pattern, colors: s.colors, shorts: s.cut === 'rash' ? .45 : s.cut === 'sarong' ? .55 : s.shorts || 0 };
    rig.suit = s.id;
  } else if (rig.castId === 'sonny' || rig.castId === 'pepper' || G.CAST[rig.castId].staff) { rig.suit = null; }
  rig.acc = (accs || []).slice();
  const band = rig.acc.includes('sweatband') ? { style: 'band', color: '#ff6a5a' } : c.band ? { style: 'band', color: c.band } : null;
  rig.o.hat = band;
  rig.swimDraw = G.swimDraw;
  return rig;
};
/* ---- swimsuit cuts and patterns, drawn inside the torso plate the engine just filled with the main colour ---- */
G.swimDraw = function (g, P) {
  const sw = this.o.swim, [m, a, t] = sw.colors, C = this.C, st = tonesOf(C.skin), mt = tonesOf(m), at = tonesOf(a), tt = tonesOf(t);
  const { shL, shR, hL, hR, lq, facingCam } = P;
  const B = (u, v) => { const top = lq(shL, shR, u), bot = lq(hL, hR, u); return lq(top, bot, v); };
  const quad = (u0, v0, u1, v1, col) => px.poly(g, [B(u0, v0), B(u1, v0), B(u1, v1), B(u0, v1)], col);
  const H = Math.abs(lq(hL, hR, .5)[1] - lq(shL, shR, .5)[1]), Wd = Math.abs(shR[0] - shL[0]) + 2;
  const cut = sw.cut;
  // pattern region (v from, v to), skipping bare skin
  let skin = null;
  if (cut === 'sport2') skin = [.55, .86]; else if (cut === 'tankini') skin = [.8, .9];
  const inSkin = v => skin && v > skin[0] && v < skin[1];
  const vTop = cut === 'rash' || cut === 'shirt' ? 0 : .12;
  // pattern
  const pat = sw.pattern, rows = Math.max(3, Math.round(H / 2)), cols = Math.max(2, Math.round(Wd / 2.2)), T = this.t || 0;
  const dot = (u, v, col) => { if (inSkin(v)) return; const q = B(u, v); px.dot(g, q[0], q[1], col); };
  if (pat === 'gradient') { quad(0, .45, 1, .75, mt.sh); quad(0, .65, 1, 1, at.base); }
  else if (pat === 'stripes') for (let k = 1; k < rows; k += 2) { const v = vTop + (1 - vTop) * k / rows; if (!inSkin(v)) { const q0 = B(0, v), q1 = B(1, v); px.line(g, q0[0], q0[1], q1[0], q1[1], at.base); } }
  else if (pat === 'pin') for (let k = 1; k < cols; k++) { const u = k / cols, q0 = B(u, vTop), q1 = B(u, skin ? skin[0] : 1); px.line(g, q0[0], q0[1], q1[0], q1[1], at.base); if (skin) { const r0 = B(u, skin[1]), r1 = B(u, 1); px.line(g, r0[0], r0[1], r1[0], r1[1], at.base); } }
  else if (pat === 'dots' || pat === 'check' || pat === 'stars' || pat === 'floral' || pat === 'sevens' || pat === 'lame' || pat === 'scales' || pat === 'waves' || pat === 'geo' || pat === 'palms')
    for (let j = 0; j < rows; j++) for (let k = 0; k < cols; k++) {
      const u = (k + .5 + (j % 2) * .5) / (cols + .5), v = vTop + (1 - vTop) * (j + .5) / rows; if (inSkin(v)) continue;
      const q = B(u, v), x = Math.round(q[0]), y = Math.round(q[1]);
      if (pat === 'dots') { if ((j + k) % 2 === 0) px.dot(g, x, y, at.hi); }
      else if (pat === 'check') { if ((j + k) % 2 === 0) px.rect(g, x, y, 1, 1, at.base); else px.dot(g, x, y, mt.lt); }
      else if (pat === 'stars') { if ((j * 3 + k) % 3 === 0) { px.dot(g, x, y, at.hi); px.dot(g, x - 1, y, at.base); px.dot(g, x + 1, y, at.base); } }
      else if (pat === 'floral') { if ((j + k * 2) % 3 === 0) { px.dot(g, x, y, tt.base); px.dot(g, x - 1, y, at.base); px.dot(g, x + 1, y, at.base); px.dot(g, x, y - 1, at.base); } }
      else if (pat === 'sevens') { if ((j + k) % 2 === 0) { px.dot(g, x, y, at.hi); px.dot(g, x + 1, y, at.hi); px.dot(g, x + 1, y + 1, at.base); } }
      else if (pat === 'lame') { if (((j * 7 + k * 3 + Math.floor(T * 6)) % 5) === 0) px.dot(g, x, y, '#ffffff'); else if ((j + k) % 2) px.dot(g, x, y, at.base); }
      else if (pat === 'scales') { if (j % 2 === 0) { px.dot(g, x, y, at.base); px.dot(g, x + 1, y + 1, at.sh); } }
      else if (pat === 'waves') { if (j % 2 === 0) { px.dot(g, x, y, at.base); px.dot(g, x + 1, y - 1, at.base); } }
      else if (pat === 'geo') { if (j % 2 === 0) { px.dot(g, x, y + ((k % 2) ? 1 : 0), at.base); px.dot(g, x + 1, y + ((k % 2) ? 0 : 1), tt.base); } }
      else if (pat === 'palms') { if ((j + k) % 3 === 0) { px.dot(g, x, y, at.base); px.dot(g, x + 1, y + 1, at.sh); px.dot(g, x - 1, y + 1, at.sh); } }
    }
  // cut: bare skin where the suit leaves it, straps and panels
  if (skin) { quad(0, skin[0], 1, skin[1], st.base); const q0 = B(0, skin[1]), q1 = B(1, skin[1]); px.line(g, q0[0], q0[1], q1[0], q1[1], at.base); }
  if (cut !== 'rash' && cut !== 'shirt') {
    // shoulders bare, with straps (halter: up to the neck)
    px.poly(g, [shL, B(.32, 0), B(.08, .14)], st.base); px.poly(g, [shR, B(.68, 0), B(.92, .14)], st.base);
    if (cut === 'halter') { const n = B(.5, -.05), l = B(.3, .12), r = B(.7, .12); px.line(g, l[0], l[1], n[0], n[1], tt.base); px.line(g, r[0], r[1], n[0], n[1], tt.base); }
    else { const l0 = B(.3, 0), l1 = B(.3, .14), r0 = B(.7, 0), r1 = B(.7, .14); px.line(g, l0[0], l0[1], l1[0], l1[1], tt.base); px.line(g, r0[0], r0[1], r1[0], r1[1], tt.base); }
    if (facingCam) px.poly(g, [B(.36, 0), B(.64, 0), B(.5, cut === 'sport2' ? .16 : .24)], st.base);   // neckline
    if (cut === 'racer') { quad(0, .2, .14, .95, at.base); quad(.86, .2, 1, .95, at.base); }
    // the bottom's waistband
    const w0 = B(0, .92), w1 = B(1, .92); px.line(g, w0[0], w0[1], w1[0], w1[1], cut === 'tankini' || cut === 'sport2' ? tt.base : mt.sh);
  } else if (cut === 'rash') { const z0 = B(.5, 0), z1 = B(.5, .95); px.line(g, z0[0], z0[1], z1[0], z1[1], tt.base); const c0 = B(.25, .02), c1 = B(.75, .02); px.line(g, c0[0], c0[1], c1[0], c1[1], tt.base); }
  else if (cut === 'shirt') { const c0 = B(.3, 0), c1 = B(.5, .25), c2 = B(.7, 0); px.line(g, c0[0], c0[1], c1[0], c1[1], tt.base); px.line(g, c1[0], c1[1], c2[0], c2[1], tt.base); }
};
/* ---- hair the engine lacks and accessories: each a point on the head (or a hand) in the rig's own frame, drawn behind
 * or in front of the body by its depth ---- */
G.drawExtras = (rig, g, ox, oy, view, side) => {
  const R = rig.o.headR, J = rig.J; if (!J || !J.head) return;
  const o0 = view.p(0, 0, 0);
  const P = (f, r, z, at = J.head) => { const w = rig._w([at[0] + f, at[1] + r, at[2] + z]); const q = view.p(w[0], w[1], w[2]); return [ox + q[0] - o0[0], oy + q[1] - o0[1], view.depth(w[0], w[1], w[2])]; };
  const H = P(0, 0, 0), u = view.scale * rig.o.size, rr = R * u * .93, hc = tonesOf(rig.C.hair), c = G.CAST[rig.castId];
  const want = (q) => side < 0 ? q[2] < H[2] : q[2] >= H[2];
  const ball = (q, rad, t) => { if (!want(q)) return; px.disc(g, q[0], q[1], rad, t.sh); px.disc(g, q[0] - .5, q[1] - .5, Math.max(.5, rad - .9), t.base); if (rad > 2) px.dot(g, q[0] - rad * .4, q[1] - rad * .4, t.hi); };
  const hs = rig.extraHair;
  if (hs === 'twinbuns') for (const s of [-1, 1]) { const q = P(-R * .15, s * R * .78, R * .8); ball(q, rr * .55, hc); if (rig.acc.includes('ribbon') && want(q)) { const b = P(-R * .15, s * R * .55, R * .45); px.rect(g, b[0] - 1, b[1] - 1, 3, 2, c.ribbon || rig.C.swimB || '#ff6aa8'); } }
  else if (hs === 'bun') ball(P(-R * .75, 0, R * .55), rr * .5, hc);
  else if (hs === 'puff') { const q = P(-R * .55, 0, R * .85); ball(q, rr * 1.05, hc); if (want(q)) { const b0 = P(R * .1, -R * .8, R * .55), b1 = P(R * .1, R * .8, R * .55); px.line(g, b0[0], b0[1], b1[0], b1[1], c.cuffs || '#ffd36a'); } }
  else if (hs === 'bob') for (const s of [-1, 1]) ball(P(-R * .1, s * R * .82, -R * .3), rr * .5, hc);
  else if (hs === 'curly') for (const [f, r, z] of [[-.7, -.6, .3], [-.7, .6, .3], [-.9, 0, .1], [-.3, -.85, -.2], [-.3, .85, -.2], [-.5, 0, .8]]) ball(P(f * R, r * R, z * R), rr * .42, hc);
  else if (hs === 'braid') ball(P(-R * 1.05, 0, -R * .15), rr * .3, tonesOf(c.ribbon || '#3a5ab0'));
  for (const id of rig.acc || []) {
    if (id === 'ribbon' && hs !== 'twinbuns') { const q = P(-R * .55, R * .55, R * .75); if (want(q)) { px.rect(g, q[0] - 2, q[1] - 1, 2, 2, c.ribbon || '#d8303a'); px.rect(g, q[0] + 1, q[1] - 1, 2, 2, c.ribbon || '#d8303a'); px.dot(g, q[0], q[1], '#ffffff'); } }
    else if (id === 'hibiscus') { const q = P(0, R * .95, R * .3); if (want(q)) { px.disc(g, q[0], q[1], Math.max(1.5, rr * .32), '#e8283a'); px.dot(g, q[0], q[1], '#ffd36a'); } }
    else if (id === 'shellnecklace') for (let k = -2; k <= 2; k++) { const q = P(R * .55, k * R * .28, -R * 1.25 - Math.abs(k) * -.15); if (want(q)) px.dot(g, q[0], q[1], '#ffffff'); }
    else if (id === 'wristbands') for (const hd of [J.handL, J.handR]) { const q = P(0, 0, .6, hd); if (want(q)) px.rect(g, q[0] - 1, q[1] - 1, 2, 2, '#ff5a5a'); }
    else if (id === 'visor' && side > 0) { const b0 = P(R * .9, -R * .7, R * .45), b1 = P(R * 1.6, 0, R * .3), b2 = P(R * .9, R * .7, R * .45); px.poly(g, [b0, b1, b2], '#f4f4f0'); px.line(g, b0[0], b0[1], b2[0], b2[1], '#2a7ad8'); const k0 = P(-R * .5, -R * .9, R * .5), k1 = P(-R * .5, R * .9, R * .5); px.line(g, k0[0], k0[1], b0[0], b0[1], '#f4f4f0'); px.line(g, k1[0], k1[1], b2[0], b2[1], '#f4f4f0'); }
    else if (id === 'sunhat' && side > 0) { const q = P(0, 0, R * .55), rx = rr * 2.1, ry = Math.max(1.5, rr * .7 * Math.abs(view.dz || .5)); px.ell(g, q[0], q[1], rx, ry, '#c8a050'); px.ell(g, q[0], q[1] - .5, rx - 1, Math.max(1, ry - 1), '#e8c880'); const cr = P(-R * .1, 0, R * 1.05); px.disc(g, cr[0], cr[1], rr * .75, '#d8b870'); px.rect(g, cr[0] - rr * .75, cr[1] + rr * .3, rr * 1.5, 1, '#e8283a'); }
  }
  // eyewear on the face, only while it faces the camera
  const shades = (rig.acc || []).find(a => G.ITEMS[a] && G.ITEMS[a].shades), glasses = c.glasses;
  if ((shades || glasses) && side > 0) {
    const fwd = P(R * .95, 0, 0); if (fwd[2] > H[2]) {
      const col = shades === 'heartshades' ? '#ff5fa2' : shades === 'aviators' ? '#c89020' : shades ? '#20262e' : null, lens = shades === 'aviators' ? '#3a2a10' : col;
      for (const s of [-1, 1]) { const q = P(R * .92, s * R * .36, 0); if (q[2] <= H[2]) continue; if (col) { px.rect(g, q[0] - 1, q[1] - 1, 3, 2, lens); px.dot(g, q[0] - 1, q[1] - 1, shades === 'aviators' ? '#ffd36a' : '#8a9ab0'); } else { px.dot(g, q[0] - 1, q[1] - 1, '#c8a060'); px.dot(g, q[0] + 1, q[1] - 1, '#c8a060'); } }
      const a0 = P(R * .92, -R * .36, 0), a1 = P(R * .92, R * .36, 0); px.line(g, a0[0], a0[1] - 1, a1[0], a1[1] - 1, col || '#c8a060');
    }
  }
};
/** the rigs every scene shares, by cast id (dressed as the vacation says, or in their signature suits) */
G.rigs = {};
G.rigFor = (id, suit, acc) => {
  const key = id; let rig = G.rigs[key];
  if (!rig) rig = G.rigs[key] = G.makeRig(id);
  if (suit !== undefined && (rig.suit !== suit || JSON.stringify(rig.acc) !== JSON.stringify(acc || rig.acc))) G.dress(rig, suit, acc || rig.acc);
  return rig;
};
/** what someone wears now: the vacation's wardrobe, or the signature suit */
G.wearOf = id => {
  const S = G.state, c = G.CAST[id];
  if (S && S.me === id) return S.wearing;
  if (S && S.npcWear && S.npcWear[id]) return S.npcWear[id];
  return { suit: c.suit, acc: c.acc || [] };
};
G.portrait = (g, id, x, y, size = 32, o = {}) => {
  const w = G.wearOf(id), rig = G.rigFor(id, G.CAST[id].shirt || G.CAST[id].robe ? undefined : w.suit, w.acc);
  if (!rig.J || !rig.J.head) rig.update(0, { x: 0, y: 0, z: 0, facing: 0 });
  rig.drawPortrait(g, x, y, size, Object.assign({ zoom: size / 13, turn: .5, bg: o.bg || '#12475a', border: o.border || '#f6d38a' }, o));
};

// ==== 14-world-art.js ====
/* 14-world-art: the resort's objects as E.SHAPES data, its materials, the backdrops by time of day, the court geometry and
 * its sand, and effect helpers. Shapes are sized for fighters about 38 units tall. */
Object.assign(E.MATERIALS, {
  aoa_canvasR: '#e8403a cloth', aoa_canvasW: '#f4f0e8 cloth', aoa_canvasB: '#2a8ad8 cloth', aoa_canvasY: '#ffd04a cloth', aoa_canvasT: '#1fb7b0 cloth', aoa_canvasP: '#ff7aa8 cloth',
  aoa_white: '#f4f4f0 glaze', aoa_bleach: '#d8c8a8 planks', aoa_teak: '#a86a3a planks', aoa_thatch: '#c8a060 thatch', aoa_bamboo: '#c8b070 bark',
  aoa_chrome: '#c8d0dc metal', aoa_gold: '#ffd36a metal', aoa_black: '#1a1a22 glaze', aoa_felt: '#1f7a4a cloth', aoa_red: '#c8202c glaze', aoa_neonP: { color: '#ff5fa2', glow: 1 },
  aoa_neonC: { color: '#5ff0ff', glow: 1 }, aoa_glass: '#9fe8f0 glaze', aoa_pool: '#3ac8d8 glaze', aoa_pink: '#ff8ac8 glaze', aoa_sandc: '#e8c890 noise', aoa_cooler: '#2a8ad8 glaze',
  aoa_lamp: { color: '#ffd070', glow: 1 }, aoa_navy: '#1d2433 cloth', aoa_cream: '#f4e8c8 noise', aoa_coral: '#ff8a6a noise', aoa_seafoam: '#8ae8c8 noise', aoa_lilac: '#c8a8f0 plaster'
});
Object.assign(E.SHAPES, {
  umbrella: { about: 'beach umbrella, striped canopy', tags: 'beach', mats: { p: 'aoa_white', a: 'aoa_canvasR', b: 'aoa_canvasW' },
    parts: [['cyl', 'p', [0, 0, 0], .9, 34], ['cyl', 'a', [0, 0, 30], 19, 6, { r2: 0, seg: 8 }], ['cyl', 'b', [0, 0, 29.5], 19.5, 1.2, { seg: 8 }], ['ball', 'p', [0, 0, 36.5], 1.2]] },
  lounger: { about: 'sun lounger', tags: 'beach', mats: { f: 'aoa_white', c: 'aoa_canvasT' },
    parts: [['box', 'f', [0, 0, 3], [10, 26, 1.5]], ['box', 'c', [0, 2, 4.5], [9, 20, 1]], ['box', 'c', [0, -10, 4.5], [9, 7, 8], { rot: [24, 0, 0] }], ['mirror', 'xy', ['box', 'f', [4, 11, 0], [1.2, 1.2, 3]]]] },
  beachtowel: { about: 'towel on the sand', tags: 'beach', mats: { t: 'aoa_canvasP' }, parts: [['box', 't', [0, 0, 0], [12, 22, .5]]] },
  cooler: { about: 'cooler box', tags: 'beach', mats: { c: 'aoa_cooler', l: 'aoa_white' }, parts: [['box', 'c', [0, 0, 0], [12, 8, 8]], ['box', 'l', [0, 0, 8], [12.5, 8.5, 2]]] },
  sandcastle: { about: 'sandcastle', tags: 'beach', mats: { s: 'aoa_sandc' }, parts: [['box', 's', [0, 0, 0], [16, 14, 5]], ['mirror', 'xy', ['cyl', 's', [6, 5, 0], 2.5, 9, { seg: 6 }]], ['cyl', 's', [0, 0, 5], 3.5, 8, { seg: 6 }], ['cyl', 's', [0, 0, 13], 3.5, 3, { r2: 0, seg: 6 }]] },
  surfboard: { about: 'surfboard standing in the sand', tags: 'beach', mats: { b: 'aoa_canvasY', s: 'aoa_canvasR' }, parts: [['cyl', 'b', [0, 0, 0], 4, 32, { sq: .25, r2: 2 }], ['box', 's', [0, 0, 2], [1, 1.5, 28]]] },
  surfrack: { about: 'rack of surfboards', tags: 'beach', mats: { w: 'aoa_teak', a: 'aoa_canvasY', b: 'aoa_canvasT', c: 'aoa_canvasR' },
    parts: [['mirror', 'x', ['box', 'w', [12, 0, 0], [2, 6, 18]]], ['box', 'w', [0, 0, 16], [26, 6, 2]], ['cyl', 'a', [-7, 0, 0], 3.5, 28, { sq: .3, r2: 2 }], ['cyl', 'b', [0, 0, 0], 3.5, 30, { sq: .3, r2: 2 }], ['cyl', 'c', [7, 0, 0], 3.5, 27, { sq: .3, r2: 2 }]] },
  lifeguard: { about: 'lifeguard tower', tags: 'beach', mats: { w: 'aoa_white', r: 'aoa_red', c: 'aoa_canvasR' },
    parts: [['mirror', 'xy', ['box', 'w', [8, 6, 0], [2, 2, 30], { rot: [0, 0, 0] }]], ['box', 'w', [0, 0, 28], [20, 16, 2]], ['box', 'r', [0, 0, 30], [18, 14, 12]], ['prism', 'c', [0, 0, 42], [[-11, 0], [11, 0], [0, 6]], 18, { axis: 'y' }], ['box', 'w', [0, 10, 0], [6, 2, 28], { rot: [-25, 0, 0] }]] },
  bleacher: { about: 'three tiers of bleachers', tags: 'beach stadium', mats: { w: 'aoa_bleach', f: 'aoa_chrome' },
    parts: [['box', 'w', [0, 6, 0], [60, 8, 6]], ['box', 'w', [0, 0, 6], [60, 8, 6]], ['box', 'w', [0, -6, 12], [60, 8, 6]], ['mirror', 'x', ['box', 'f', [29, 0, 0], [1.5, 20, 20]]]] },
  djbooth: { about: 'DJ booth with speakers and a gold disc', tags: 'beach', mats: { b: 'aoa_black', g: 'aoa_gold', n: 'aoa_neonP' },
    parts: [['box', 'b', [0, 0, 0], [26, 12, 14]], ['box', 'n', [0, 6.2, 4], [24, .5, 2]], ['mirror', 'x', ['box', 'b', [17, 0, 0], [8, 9, 24]]], ['mirror', 'x', ['cyl', 'g', [17, 4.6, 16], 3, .6, { rot: [90, 0, 0] }]], ['cyl', 'g', [0, 0, 14], 6, 1]] },
  netpost: { about: 'volleyball net post', tags: 'beach', mats: { p: 'aoa_chrome', b: 'aoa_canvasB' }, parts: [['cyl', 'p', [0, 0, 0], 1.3, 52], ['ball', 'p', [0, 0, 52], 1.6], ['cyl', 'b', [0, 0, 0], 2.2, 8]] },
  tikibar: { about: 'tiki bar: thatch roof, counter, stools', tags: 'beach bar', mats: { t: 'aoa_thatch', w: 'aoa_bamboo', c: 'aoa_teak', s: 'aoa_canvasR' },
    parts: [['mirror', 'xy', ['cyl', 'w', [20, 12, 0], 1.6, 34]], ['prism', 't', [0, 0, 32], [[-28, 0], [28, 0], [0, 14]], 34, { axis: 'y' }], ['box', 'c', [0, 6, 0], [36, 6, 16]], ['box', 'w', [0, 6, 16], [38, 8, 2]],
      ['row', 3, [12, 0, 0], ['group', [0, 16, 0], 0, [['cyl', 'w', [0, 0, 0], .8, 10], ['cyl', 's', [0, 0, 10], 3, 1.5]]]]] },
  changinghut: { about: 'changing hut', tags: 'beach', mats: { w: 'aoa_coral', r: 'aoa_white', d: 'aoa_canvasT' },
    parts: [['box', 'w', [0, 0, 0], [20, 18, 32]], ['prism', 'r', [0, 0, 32], [[-12, 0], [12, 0], [0, 8]], 20, { axis: 'y' }], ['box', 'd', [0, 9.1, 0], [10, .5, 26]]] },
  scoreboard: { about: 'flip scoreboard', tags: 'beach', mats: { f: 'aoa_navy', c: 'aoa_white', l: 'aoa_chrome' },
    parts: [['mirror', 'x', ['box', 'l', [10, 0, 0], [1.5, 1.5, 22]]], ['box', 'f', [0, 0, 20], [26, 3, 16]], ['mirror', 'x', ['box', 'c', [6, 1.6, 23], [9, .5, 10]]]] },
  cabana: { about: 'pool cabana', tags: 'pool', mats: { w: 'aoa_white', c: 'aoa_canvasW', s: 'aoa_canvasT' },
    parts: [['mirror', 'xy', ['box', 'w', [14, 14, 0], [2, 2, 30]]], ['prism', 'c', [0, 0, 30], [[-17, 0], [17, 0], [0, 10]], 32, { axis: 'y' }], ['box', 's', [0, 0, 4], [24, 20, 4]]] },
  poolfloat: { about: 'round float pad', tags: 'pool', mats: { a: 'aoa_canvasY', b: 'aoa_white' }, parts: [['cyl', 'a', [0, 0, 0], 9, 2.5, { seg: 12 }], ['cyl', 'b', [0, 0, 2.5], 7, .5, { seg: 12 }]] },
  flamingo: { about: 'inflatable flamingo', tags: 'pool', mats: { p: 'aoa_pink', b: 'aoa_black' },
    parts: [['cyl', 'p', [0, 0, 0], 9, 5, { seg: 12 }], ['cyl', 'p', [0, -6, 5], 2, 16], ['ball', 'p', [0, -4, 22], 3.2], ['cyl', 'b', [0, -1, 21], 1, 3, { r2: 0, rot: [90, 0, 0] }]] },
  deckchair: { about: 'striped deck chair', tags: 'pool', mats: { f: 'aoa_teak', c: 'aoa_canvasB' }, parts: [['box', 'f', [0, 0, 0], [10, 14, 6]], ['box', 'c', [0, -4, 6], [9, 3, 12], { rot: [20, 0, 0] }]] },
  slotmachine: { about: 'slot machine', tags: 'casino', mats: { b: 'aoa_red', g: 'aoa_gold', s: 'aoa_glass', n: 'aoa_neonC' },
    parts: [['box', 'b', [0, 0, 0], [14, 12, 28]], ['box', 's', [0, 6.1, 14], [10, .5, 8]], ['box', 'n', [0, 6.1, 24], [12, .5, 3]], ['box', 'g', [0, 0, 28], [15, 13, 3]], ['cyl', 'g', [8, 0, 16], .8, 8]] },
  bjtable: { about: 'blackjack table, half-moon felt', tags: 'casino', mats: { f: 'aoa_felt', w: 'aoa_teak', g: 'aoa_gold' },
    parts: [['cyl', 'w', [0, 0, 0], 5, 12], ['cyl', 'f', [0, 0, 12], 22, 2, { sq: .6, seg: 16 }], ['cyl', 'g', [0, 0, 11.5], 23, .8, { sq: .62, seg: 16 }]] },
  roulettetable: { about: 'roulette table with its wheel', tags: 'casino', mats: { f: 'aoa_felt', w: 'aoa_teak', g: 'aoa_gold', k: 'aoa_black' },
    parts: [['box', 'w', [0, 0, 0], [44, 20, 12]], ['box', 'f', [0, 0, 12], [44, 20, 1]], ['cyl', 'w', [-14, 0, 13], 8, 3, { seg: 16 }], ['cyl', 'k', [-14, 0, 15], 6, 1, { seg: 16 }], ['cyl', 'g', [-14, 0, 16], 1, 3]] },
  cashier: { about: 'cashier cage', tags: 'casino', mats: { w: 'aoa_teak', g: 'aoa_gold', s: 'aoa_glass' },
    parts: [['box', 'w', [0, 0, 0], [30, 10, 16]], ['box', 's', [0, 0, 16], [30, 1, 14]], ['box', 'g', [0, 0, 30], [32, 12, 3]]] },
  neonsign: { about: 'neon sign', tags: 'casino', mats: { b: 'aoa_black', n: 'aoa_neonP', c: 'aoa_neonC' }, parts: [['box', 'b', [0, 0, 0], [30, 2, 12]], ['box', 'n', [0, 1.1, 6], [26, .5, 2]], ['box', 'c', [0, 1.1, 2.5], [20, .5, 1.5]]] },
  velvetrope: { about: 'velvet rope on brass posts', tags: 'casino', mats: { g: 'aoa_gold', r: 'aoa_red' }, parts: [['mirror', 'x', ['cyl', 'g', [10, 0, 0], 1, 10]], ['box', 'r', [0, 0, 8], [20, 1, 1.2]]] },
  shopfront: { about: 'shop facade with an awning', tags: 'town', mats: { w: 'aoa_cream', a: 'aoa_canvasR', g: 'aoa_glass', d: 'aoa_teak' }, params: {},
    parts: [['box', 'w', [0, 0, 0], [60, 10, 44]], ['box', 'g', [-16, 5.1, 6], [18, .5, 22]], ['box', 'g', [16, 5.1, 6], [18, .5, 22]], ['box', 'd', [0, 5.1, 0], [12, .5, 30]], ['box', 'a', [0, 9, 34], [62, 10, 2], { rot: [-18, 0, 0] }]] },
  icecreamcart: { about: 'ice cream cart with umbrella', tags: 'town', mats: { c: 'aoa_white', s: 'aoa_canvasP', p: 'aoa_chrome' },
    parts: [['box', 'c', [0, 0, 4], [20, 10, 12]], ['mirror', 'x', ['cyl', 'p', [8, 5, 0], 3, 1, { rot: [0, 90, 0] }]], ['cyl', 'p', [0, 0, 16], .7, 20], ['cyl', 's', [0, 0, 32], 12, 4, { r2: 0, seg: 8 }]] },
  planter: { about: 'planter box with flowers', tags: 'town', mats: { b: 'aoa_teak', f: 'leaves' }, parts: [['box', 'b', [0, 0, 0], [16, 8, 7]], ['ball', 'f', [0, 0, 9], 6, { sz: .6 }]] },
  wardrobe: { about: 'white wardrobe', tags: 'villa', mats: { w: 'aoa_white', g: 'aoa_gold' }, parts: [['box', 'w', [0, 0, 0], [24, 10, 36]], ['box', 'g', [-1.5, 5.1, 18], [1, .5, 4]], ['box', 'g', [1.5, 5.1, 18], [1, .5, 4]]] },
  desk: { about: 'writing desk', tags: 'villa', mats: { w: 'aoa_teak' }, parts: [['box', 'w', [0, 0, 12], [24, 12, 2]], ['mirror', 'xy', ['box', 'w', [10, 4.5, 0], [2, 2, 12]]], ['box', 'w', [6, 0, 6], [10, 11, 6]]] },
  mailbox: { about: 'mailbox on a post', tags: 'villa', mats: { p: 'aoa_teak', b: 'aoa_canvasB', f: 'aoa_red' }, parts: [['box', 'p', [0, 0, 0], [2, 2, 16]], ['box', 'b', [0, 0, 16], [6, 10, 6]], ['box', 'f', [3.5, -2, 20], [1, 1, 6]]] },
  rug: { about: 'round rug', tags: 'villa', mats: { r: 'aoa_canvasT' }, parts: [['cyl', 'r', [0, 0, 0], 22, .4, { sq: .7, seg: 16 }]] },
  seaplane: { about: 'seaplane on floats', tags: 'dock', mats: { b: 'aoa_white', s: 'aoa_gold', f: 'aoa_canvasR' },
    parts: [['cyl', 'b', [0, 0, 12], 6, 44, { rot: [90, 0, 90] }], ['box', 's', [0, 0, 18], [70, 12, 1.5]], ['mirror', 'x', ['box', 'f', [12, 0, 0], [4, 40, 4]]], ['mirror', 'x', ['box', 'b', [12, 0, 4], [1, 2, 8]]], ['box', 'f', [0, -22, 14], [2, 6, 12]]] },
  lighthouse: { about: 'striped lighthouse', tags: 'island', mats: { w: 'aoa_white', r: 'aoa_red', l: 'aoa_lamp' },
    parts: [['cyl', 'w', [0, 0, 0], 9, 20, { r2: 8 }], ['cyl', 'r', [0, 0, 20], 8, 20, { r2: 7 }], ['cyl', 'w', [0, 0, 40], 7, 18, { r2: 6 }], ['cyl', 'l', [0, 0, 58], 5, 7], ['cyl', 'r', [0, 0, 65], 6, 5, { r2: 0 }]] },
  bed: E.SHAPES.bed,
  barstool: { about: 'bar stool', tags: 'bar', mats: { s: 'aoa_canvasR', p: 'aoa_chrome' }, parts: [['cyl', 'p', [0, 0, 0], .8, 12], ['cyl', 's', [0, 0, 12], 3.2, 1.6]] },
  chandelier2: { about: 'casino chandelier (hangs high)', tags: 'casino', mats: { g: 'aoa_gold', l: 'aoa_lamp' }, lights: [[0, 0, 60, '#ffd890', 90]], parts: [['cyl', 'g', [0, 0, 64], 10, 2, { seg: 10 }], ['ring', 6, 9, ['ball', 'l', [0, 0, 62], 1.6]], ['cyl', 'g', [0, 0, 66], .5, 20]] },
  torchpost: { about: 'tiki torch', tags: 'beach', mats: { w: 'aoa_bamboo', b: 'aoa_thatch' }, flames: [[0, 0, 30, 4, 8]], lights: [[0, 0, 32, '#ffa050', 70]], parts: [['cyl', 'w', [0, 0, 0], 1, 26], ['cyl', 'b', [0, 0, 26], 2.2, 4, { r2: 2.8 }]] },
  floodlight: { about: 'floodlight mast', tags: 'beach', mats: { p: 'aoa_chrome', l: 'aoa_lamp' }, lights: [[0, 0, 70, '#fff4d8', 160]], parts: [['cyl', 'p', [0, 0, 0], 1.5, 66], ['box', 'p', [0, 0, 66], [16, 4, 8]], ['row', 3, [5, 0, 0], ['box', 'l', [0, 2.1, 68], [4, .5, 4]]]] },
  banner: { about: 'Fortuna Cup banner on poles', tags: 'beach', mats: { p: 'aoa_chrome', c: 'aoa_canvasY', r: 'aoa_canvasR' }, parts: [['mirror', 'x', ['cyl', 'p', [20, 0, 0], 1, 40]], ['box', 'c', [0, 0, 28], [40, .6, 12]], ['box', 'r', [0, .4, 32], [36, .4, 4]]] }
});
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
/* ---- time of day: backdrop, ambient light and tint. tod: 'morning' | 'afternoon' | 'sunset' | 'night' ---- */
G.TOD = {
  morning: { sky: ['#7ec8f0', '#bfe6f4', '#ffe8c8'], sun: { x: .2, y: .22, r: 12, color: '#fff3c0' }, sea: '#2ec4c9', deep: '#1a8aa8', isl: '#3a9a8a', ambient: .95, tint: null },
  afternoon: { sky: ['#3a9ae0', '#7ccaf0', '#c8eef8'], sun: { x: .75, y: .12, r: 11, color: '#fffbe0' }, sea: '#1fb0c8', deep: '#0b6a8a', isl: '#2f8f6e', ambient: 1, tint: null },
  sunset: { sky: ['#4a2a7a', '#ff5f7a', '#ffb06a'], sun: { x: .5, y: .48, r: 16, color: '#ffd36a' }, sea: '#c86a6a', deep: '#5a3a7a', isl: '#4a2a5a', ambient: .8, tint: '#ff9e5e' },
  night: { sky: ['#0a0c24', '#14163a', '#2a2a5a'], moon: { x: .78, y: .16, r: 8, color: '#f0f0d8' }, stars: 70, sea: '#14304a', deep: '#0a1a30', isl: '#101a2a', ambient: .38, tint: null }
};
G.backdrops = {};
G.backdrop = (tod, weather) => {
  const key = tod + ':' + (weather || 'sunny'); if (G.backdrops[key]) return G.backdrops[key];
  const T = G.TOD[tod] || G.TOD.afternoon, rain = weather === 'rain', cloudy = weather === 'cloudy' || rain;
  const sky = rain ? ['#5a6a80', '#8a9ab0', '#b8c4d0'] : cloudy && tod !== 'night' ? T.sky.map(c => E.mix ? E.mix(c, '#c8d0dc', .35) : c) : T.sky;
  const o = { sky, stars: T.stars, starsY: .5, layers: [
    { kind: 'clouds', color: rain ? '#7a8aa0' : tod === 'sunset' ? '#ff9ea8' : tod === 'night' ? '#2a2e50' : '#ffffff', y: .2, height: cloudy ? .2 : .1, parallax: .05, drift: 3 },
    { kind: 'mountains', color: T.isl, y: .56, height: .1, parallax: .08, seed: 7 },
    { kind: 'hills', color: E.shade(T.isl, -.15), y: .6, height: .05, parallax: .12, seed: 3 },
    { kind: 'sea', color: T.sea, y: .6, height: .4, parallax: .2 }] };
  if (!rain && T.sun) o.sun = T.sun; if (T.moon) o.moon = T.moon;
  return (G.backdrops[key] = new E.Backdrop(o));
};
G.todOf = (slot, day, weather) => slot === 2 ? 'night' : slot === 0 ? 'morning' : (day === 5 || weather === 'golden') ? 'sunset' : 'afternoon';
/** apply a time of day's light to the game */
G.applyLight = (tod, weather, force) => {
  const L = G.game.lights, T = G.TOD[tod] || G.TOD.afternoon;
  L.enabled = tod === 'night' || tod === 'sunset' || weather === 'rain' || !!force;
  L.ambient = weather === 'rain' && tod !== 'night' ? .72 : T.ambient;
  if (tod === 'sunset') L.ambient = .9;
};
/* ---- the court: one TileMap for the beach and the match. 44 x 24 tiles; rows 0-2 sea, 3 wet sand, the rest sand ---- */
G.COURT = { X0: 224, X1: 480, NET_X: 352, NET_H: 44, Y0: 128, Y1: 256, CY: 192, W: 704, H: 384 };
const C_ = G.COURT;
G.sandTex = (x, y, tag) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5, m = E.noise2(x * .05, y * .05) * .5 + E.noise2(x * .2, y * .2) * .2;
  if (tag === 'sea') { const w = E.noise2(x * .03, y * .1); const k = (y / 48); return [20 + w * 10 + n * 6, 150 + k * 40 + w * 20 + n * 8, 180 + k * 20 + w * 14 + n * 8]; }
  if (tag === 'wet') { const foam = (Math.sin(x * .09 + y * .3) > .8 && (y % 16) < 4) ? 40 : 0; return [196 + n * 14 + foam, 158 + n * 12 + foam, 108 + n * 10 + foam]; }
  if (tag === 'board') { const pl = Math.floor(x / 6) % 2; return [200 + pl * 12 + n * 10, 176 + pl * 10 + n * 10, 140 + n * 8]; }
  if (tag === 'court') {
    const ex = Math.min(Math.abs(x - C_.X0), Math.abs(x - C_.X1)), ey = Math.min(Math.abs(y - C_.Y0), Math.abs(y - C_.Y1));
    const inX = x >= C_.X0 - 1 && x <= C_.X1 + 1, inY = y >= C_.Y0 - 1 && y <= C_.Y1 + 1;
    if ((ex < 1.2 && inY) || (ey < 1.2 && inX)) return [40 + n * 10, 110 + n * 10, 220 + n * 10];
  }
  const ripple = Math.sin(x * .25 + E.noise2(x * .02, y * .02) * 6) * 6;
  return [243 + n * 18 + m * 16 + ripple, 217 + n * 16 + m * 14 + ripple, 164 + n * 14 + m * 10 + ripple * .6];
};
G.courtMap = () => {
  if (G._courtMap) return G._courtMap;
  const rows = []; for (let r = 0; r < 24; r++) rows.push((r < 3 ? '~' : r === 3 ? 'w' : 'c').repeat(44));
  G._courtMap = new E.TileMap({ rows, legend: { '~': { floor: 'sea', block: true }, w: { floor: 'wet' }, c: { floor: 'court' } }, floorTex: G.sandTex, outside: false, ao: 3 });
  return G._courtMap;
};
/* ---- effects ---- */
G.fx = {
  hearts(x, y, z, n = 6) { const P = G.game.particles; for (let i = 0; i < n; i++) P.text(x + (G.rng('cosmetic') - .5) * 16, y, z + G.rng('cosmetic') * 8, '♥', ['#ff5f7a', '#ff8ac8', '#ffd36a'][i % 3], { bounce: false }); },
  confetti(x, y, z, n = 40) { G.game.particles.bits(x, y, z, n, ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a', '#ffffff']); },
  sparkle(x, y, z, n = 8) { G.game.particles.glints(x, y, z, n, '#fff3c0'); },
  splash(x, y, z = 0) { const P = G.game.particles; P.bits(x, y, z + 2, 16, ['#9ff3e8', '#ffffff', '#2ec4c9']); P.ring(x, y, 3, 18, '#e8ffff', .45); },
  sand(x, y, n = 8) { G.game.particles.dust(x, y, 0, n); },
  firework(x, y, z) { const P = G.game.particles, c = ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a'][Math.floor(G.rng('cosmetic') * 4)]; P.sparks(x, y, z, 26, null, { color: c }); P.glints(x, y, z, 12, c); G.sfx('firework'); },
  coins(x, y, z, n = 30) { G.game.particles.bits(x, y, z, n, ['#ffd36a', '#fff3c0', '#c89020']); }
};

// ==== 15-anim.js ====
/* 15-anim: volleyball moves, celebrations, emotes and photo poses on the rigs. The rig's own walk, run, idle and jump
 * stay underneath; on top, rig.solvePose is wrapped so a timed move re-solves the arms with E.ik3 toward targets in the
 * rig's own frame ([forward, right, up] at size 1), blended by a weight curve (wind in, hold, release), and can bend the
 * upper body (a bow, a lean). Moves are driven from the simulation's plan: a spike's jump starts at t* minus its rise
 * time and the hitting hand reaches for the ball at t*. rig.vb = { kind, u, w, aim } is set each step by its owner. */
const V = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const bendUpper = (J, ang, keys) => {   // lean the body above the hips forward by ang radians
  const c = Math.cos(ang), s = Math.sin(ang), h = J.hipC;
  for (const k of keys) { const p = J[k]; if (!p) continue; const f = p[0] - h[0], z = p[2] - h[2]; J[k] = [h[0] + f * c + z * s, p[1], h[2] - f * s + z * c]; }
};
const UPPER = ['shC', 'shL', 'shR', 'head', 'elbowL', 'elbowR', 'handL', 'handR'];
/** hand targets per move: [left, right] as [f, r, z] (z above the feet, at size 1), or null to keep the rig's own */
G.MOVES = {
  ready: u => [[4.5, -1.6, 12.5], [4.5, 1.6, 12.5]],
  bump: u => { const sw = Math.min(1, u * 1.6); return [[5.5, -.4, 10.5 + sw * 4], [5.5, .4, 10.5 + sw * 4]]; },
  dig: u => [[6.5, -.4, 7], [6.5, .4, 7]],
  set: u => { const p = u < .4 ? u / .4 : 1; return [[1.6 + p * .8, -1.3, 26 + p * 3.5], [1.6 + p * .8, 1.3, 26 + p * 3.5]]; },
  spike: u => u < .55 ? [[4, -1.6, 28 + u * 4], [-2.5, 2, 26 + u * 8]] : [[3, -1.8, 20], [6 - (u - .55) * 4, 1.2, 31 - (u - .55) * 24]],
  shot: u => u < .55 ? [[4, -1.6, 28], [0, 2, 30]] : [[3, -1.8, 22], [5, 1, 31 - (u - .55) * 10]],
  block: u => [[1.8, -1.9, 33], [1.8, 1.9, 33]],
  toss: u => [[4 - u, -1.2, 16 + u * 14], [-1, 2.4, 20 + u * 8]],
  serve: u => u < .5 ? [[3, -1.6, 24], [-2, 2.2, 30]] : [[2, -1.8, 18], [6, 1, 30 - (u - .5) * 20]],
  dive: u => [[8, -2, 8], [8, 2, 8]],
  call: u => [[1, -2.2, 31], null],
  whiff: u => [[5, -.6, 9 + u * 6], [5, .6, 9 + u * 6]],
  highfive: u => [null, [4.2, 2.2, 26]],
  clap: u => { const o = Math.abs(Math.sin(u * 18)) * 1.6; return [[4.5, -o - .2, 18], [4.5, o + .2, 18]]; },
  fistpump: u => [null, [1.5, 2.3, 22 + Math.abs(Math.sin(u * 14)) * 8]],
  salute: u => [null, [3.2, 1.3, 26.5]],
  peace: u => [null, [3.6, 1.9, 25.5]],
  facepalm: u => [null, [3.2, .6, 25]],
  shaka: u => [null, [3, 3 + Math.sin(u * 20) * .6, 24]],
  stretch: u => [[-.5, -1.4, 33], [-.5, 1.4, 33]],
  give: u => [[6, -1, 16], [6, 1, 16]],
  hips: null, wave: null, cheer: null, sit: null, victory: null, sunbathe: null, shrug: u => [[2, -3.2, 18], [2, 3.2, 18]],
  // moves a motion clip plays (the arms are left to it)
  bow: () => [null, null], nod: () => [null, null], dance: () => [null, null], backflip: () => [null, null], lookback: () => [null, null], hop: () => [null, null], reject: () => [null, null],
  fall: () => [null, null], foldarms: () => [null, null], cheer2: () => [null, null], confused: () => [null, null], angry: () => [null, null], cartwheel: () => [null, null], partydance: () => [null, null]
};
/* ---- motion-capture clips (vendor/mocap/aoa-clips.js, cut from the engine's Quaternius, Mesh2Motion and CMU sets with
 * tools/anim-set.mjs): a move with a clip plays it on the rig at its own build, faded by the move's weight; upper body
 * only while the rig is moving ---- */
G.CLIP_OF = { bow: 'Bow', fistpump: 'Victory Fist Pump', nod: 'Head Nod', clap: 'Dance Charleston', dance: 'Dance Charleston', partydance: 'Dance Body Roll', shaka: 'Wave_Hello', wave: 'Wave_Hello',
  salute: 'Salute', backflip: 'Backflip', shrug: 'Shrug', reject: 'Reject', hop: 'Cheer_One_arm', cheer2: 'Cheering_Two_Hands', fall: 'Fall_On_Face', stretch: 'Stretch_Yawn',
  foldarms: 'Idle_FoldArms_Loop', confused: 'Confused', angry: 'Angry', cartwheel: 'Cartwheel', groove: 'Dance_Loop' };
G.Mocap = () => (typeof Mocap !== 'undefined' ? Mocap : null);   // (mocap.js declares it at the top level: shared by name, not on window)
G.clipLib = () => { if (G._clips !== undefined) return G._clips; try { G._clips = G.Mocap() && window.MOCAP && window.MOCAP.AOA ? G.Mocap().load(window.MOCAP.AOA) : null; } catch (e) { G._clips = null; G.game && G.game.fail('mocap', e); } return G._clips; };
G.clipPlaying = rig => !!(rig._mocapOn && rig.mocapW > 0 && rig._clipName);
const MOVE_POSE = { cheer: 'cheer', wave: 'wave', hips: 'hips', victory: 'cheer', sit: 'kneel', sunbathe: 'down', dance: 'cheer', kneel: 'kneel' };
G.anim = {
  /** wrap a rig's solvePose once */
  rig(rig) {
    if (rig._vbWrapped) return rig; rig._vbWrapped = true;
    // the clip player first (Mocap.drive installs its own update and solvePose from the prototype), then ours on top
    const lib0 = G.clipLib(); if (lib0) { G.Mocap().drive(rig, lib0); rig._mocapOn = true; rig.mocap = null; }
    const baseUpdate = rig.update;
    rig.update = function (dt, st) {
      const vb = this.vb, lib = G.clipLib(), name = vb && vb.kind && G.CLIP_OF[vb.kind], clip = name && lib && lib.clip(name);
      if (clip) {
        const u = clamp(vb.u || 0, 0, 1), tt = clip.loop ? (this.t || 0) : u * clip.dur;
        this.mocap = lib.sample(clip, tt); this.mocapW = clamp(vb.w === undefined ? 1 : vb.w, 0, 1); this._clipName = name;
        this.mocapMask = st && Math.hypot(st.vx || 0, st.vy || 0) > 5 ? 'upper' : null;
      } else if (this._mocapOn) { this.mocapW = 0; this.mocap = null; this._clipName = null; }
      return baseUpdate.call(this, dt, st);
    };
    const base = rig.solvePose;
    rig.solvePose = function () {
      base.call(this);
      const vb = this.vb; if (!vb || !vb.kind || !(vb.w > 0)) return;
      const J = this.J, o = this.o, w = clamp(vb.w, 0, 1), kind = vb.kind;
      if (kind === 'bow') bendUpper(J, .75 * w, UPPER);
      else if (kind === 'nod') { const h = J.head; J.head = [h[0] + Math.sin(vb.u * 18) * .7 * w, h[1], h[2] - Math.abs(Math.sin(vb.u * 18)) * .4 * w]; }
      else if (kind === 'dig' || kind === 'bump') bendUpper(J, (kind === 'dig' ? .45 : .22) * w, UPPER);
      else if (kind === 'dive') bendUpper(J, 1.1 * w, UPPER);
      else if (kind === 'lookback') { for (const k of UPPER) { const p = J[k]; J[k] = [p[0] * (1 - .4 * w), p[1] + (k === 'head' ? .8 : .3) * w, p[2]]; } }
      else if (kind === 'facepalm') bendUpper(J, .25 * w, UPPER);
      const f = G.MOVES[kind]; if (!f) return;
      const tg = f(vb.u || 0, vb), sides = [['shL', 'elbowL', 'handL', -1], ['shR', 'elbowR', 'handR', 1]];
      sides.forEach(([sh, el, hd, s], i) => {
        let t = tg[i]; if (!t) return;
        if (vb.aim && i === 1 && (kind === 'spike' || kind === 'set' || kind === 'bump' || kind === 'serve')) t = V(t, vb.aim, .5 * Math.min(1, vb.u * 2));
        const S = J[sh], [e2, h2] = E.ik3(S, t, o.armUpper, o.armLower, [-.4, s * 1, -.7]);
        J[el] = V(J[el], e2, w); J[hd] = V(J[hd], h2, w);
      });
    };
    return rig;
  },
  /** the pose and body state for a move (fed to rig.update) */
  pose(kind) { return MOVE_POSE[kind] || null; },
  /** a weight curve: in over `win` of the move, hold, out over `wout` */
  weight(u, win = .15, wout = .2) { return u < win ? E.ease.outQuad(u / win) : u > 1 - wout ? E.ease.inQuad((1 - u) / wout) : 1; }
};
/** each fighter's signature celebration (1.2 s) */
G.CELEB = {
  bow: { move: 'bow', dur: 1.4 }, fistpump: { move: 'fistpump', dur: 1.2, hop: 4 }, nod: { move: 'nod', dur: 1.2, pose: 'hips' }, dance: { move: 'dance', dur: 1.6 },
  shaka: { move: 'shaka', dur: 1.2 }, backflip: { move: 'backflip', dur: 1.4 }, cheer2: { move: 'cheer2', dur: 1.6 }, salute: { move: 'salute', dur: 1.2 }
};
/** a small speech bubble over someone's head ("MINE!") */
G.bubble = (r, x, y, z, text, col = '#ffffff') => {
  r.queue(x, y, z, g => {
    const [sx, sy] = r.w(x, y, z), w = E.font.width(text) + 6, X = Math.round(sx - w / 2), Y = Math.round(sy - 12);
    px.rect(g, X, Y, w, 10, '#101820'); px.rect(g, X + 1, Y + 1, w - 2, 8, col); px.rect(g, Math.round(sx) - 1, Y + 10, 3, 2, '#101820');
    E.font.text(g, text, X + 3, Y + 2, '#101820', { outline: false });
  }, { bias: 50 });
};

// ==== 20-ball.js ====
/* 20-ball: the ball is not a Body. It is the current launch { t0, p, v, k, g, ay, wob, by, kind }, flown in closed form
 * (drag k, gravity g) so every copy of the game agrees on where it is at any time, with no integration drift. Each new
 * launch precomputes when it crosses the net plane and where it lands. */
G.Ball = {
  R: 3.5,
  make(t0, p, v, o = {}) {
    const L = { t0, p: p.slice(), v: v.slice(), k: Math.max(1e-4, o.k === undefined ? G.T.ballDrag : o.k), g: o.g === undefined ? G.T.ballGravity : o.g, ay: o.ay || 0, wob: o.wob || null, by: o.by === undefined ? -1 : o.by, kind: o.kind || 'pass', side: o.side === undefined ? -1 : o.side, spd: 0 };
    L.spd = Math.hypot(v[0], v[1], v[2]);
    G.Ball.prep(L); return L;
  },
  at(L, t) {
    const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), g = L.g, [x0, y0, z0] = L.p, [vx, vy, vz] = L.v;
    let y = y0 + vy * (1 - e) / k + L.ay * (tau / k - (1 - e) / (k * k));
    if (L.wob) y += L.wob.a * Math.sin(L.wob.w * tau + L.wob.ph) * Math.min(1, tau / .3);
    return [x0 + vx * (1 - e) / k, y, z0 + (vz + g / k) * (1 - e) / k - g * tau / k];
  },
  vel(L, t) { const tau = Math.max(0, t - L.t0), k = L.k, e = Math.exp(-k * tau), g = L.g; return [L.v[0] * e, L.v[1] * e + L.ay * (1 - e) / k, (L.v[2] + g / k) * e - g / k]; },
  /** seconds after t0 at the top of the flight (0 if it starts falling) */
  apexTau(L) { const k = L.k, g = L.g, vz = L.v[2]; if (vz <= 0) return 0; const e = (g / k) / (vz + g / k); return -Math.log(e) / k; },
  /** the time on the descending branch at height h (or null if it never gets that high) */
  timeAtHeight(L, h) {
    const ta = this.apexTau(L), za = this.at(L, L.t0 + ta)[2]; if (za < h) return null;
    let a = ta, b = ta + 0.05; while (this.at(L, L.t0 + b)[2] > h && b < 12) b = b * 1.6 + .05;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (this.at(L, L.t0 + m)[2] > h) a = m; else b = m; }
    return L.t0 + (a + b) / 2;
  },
  /** the time it rises through height h (or null) */
  timeRising(L, h) {
    const ta = this.apexTau(L), z0 = L.p[2]; if (z0 >= h || this.at(L, L.t0 + ta)[2] < h) return null;
    let a = 0, b = ta; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (this.at(L, L.t0 + m)[2] < h) a = m; else b = m; }
    return L.t0 + (a + b) / 2;
  },
  /** solve a launch from `from` to reach `to` ([x, y, z]) after T seconds */
  aim(from, to, T, k = G.T.ballDrag, g = G.T.ballGravity) {
    k = Math.max(1e-4, k); const q = (1 - Math.exp(-k * T)) / k;
    return [(to[0] - from[0]) / q, (to[1] - from[1]) / q, ((to[2] - from[2]) + g * T / k) / q - g / k];
  },
  prep(L) {
    const NX = G.COURT.NET_X, R = this.R, [x0] = L.p, vx = L.v[0], k = L.k;
    // when x crosses the net plane (x is monotonic)
    L.tNet = null;
    if (Math.abs(vx) > 1e-6 && (NX - x0) * vx > 0) { const e = 1 - (NX - x0) * k / vx; if (e > 0 && e < 1) L.tNet = L.t0 - Math.log(e) / k; }
    L.tLand = this.timeAtHeight(L, R) || (L.t0 + 3);
    if (L.tNet !== null && L.tNet > L.tLand) L.tNet = null;
    L.land = this.at(L, L.tLand);
    L.netDone = false;
  },
  /** what happens at the net plane: 'clear' | 'tape' | 'net' | 'outside' */
  netCheck(L) {
    if (L.tNet === null) return null;
    const q = this.at(L, L.tNet), R = this.R, C = G.COURT;
    if (Math.abs(q[1] - C.CY) > 64 + R) return { kind: 'outside', q };
    if (q[2] - R > C.NET_H) return { kind: 'clear', q };
    if (q[2] + R >= C.NET_H - 3) return { kind: 'tape', q };
    return { kind: 'net', q };
  },
  inCourt(p) { const C = G.COURT, R = this.R; return p[0] >= C.X0 - R && p[0] <= C.X1 + R && p[1] >= C.Y0 - R && p[1] <= C.Y1 + R; },
  sideOf(x) { return x < G.COURT.NET_X ? 0 : 1; }
};
/* the ball's look: a white ball with blue and yellow panels, turning with its speed */
G.BALL_SPR = [
  E.sprite(['..wwww..', '.wwbbww.', 'wwbbbyyw', 'wbbwwyyw', 'wwwwyyww', 'wyywwwbw', '.wyyybb.', '..wwww..'], { w: '#f8f8f4', b: '#2a6ad8', y: '#ffd23a' }),
  E.sprite(['..wwww..', '.wyywbw.', 'wwyywbbw', 'wwwwwbbw', 'wbbwwwww', 'wbbbyyww', '.wwbyyw.', '..wwww..'], { w: '#f8f8f4', b: '#2a6ad8', y: '#ffd23a' }),
  E.sprite(['..wwww..', '.wbbwww.', 'wbbbwyyw', 'wwbwwyyw', 'wwwwwyww', 'wyywbbbw', '.wyywbb.', '..wwww..'], { w: '#f8f8f4', b: '#2a6ad8', y: '#ffd23a' })
];

// ==== 21-rules.js ====
/* 21-rules: the referee. Rally scoring to pointsToWin, win by 2, a hard cap at pointsToWin + 4; at most three touches a
 * side (a block counts as one), no one touches twice in a row (except straight after her own block); every fault scores
 * for the other side; the serve passes to the team that wins a rally, alternating its servers. */
G.Rules = {
  /** has a side won the set? */
  setWon(score, to) { const [a, b] = score, cap = to + 4; if ((a >= to || b >= to) && Math.abs(a - b) >= 2) return a > b ? 0 : 1; if (a >= cap) return 0; if (b >= cap) return 1; return -1; },
  /** is side s one point from the set? */
  setPoint(score, to, s) { const t = score.slice(); t[s]++; return this.setWon(t, to) === s; },
  /** the server for side s after it wins the serve back: the one who didn't serve last time */
  nextServer(lastServer, s) { return lastServer[s] === 0 ? 1 : 0; },
  CALLS: { in: 'IN!', out: 'OUT!', net: 'NET!', four: '4 TOUCHES', double: 'DOUBLE TOUCH', antenna: 'ANTENNA', ace: 'ACE!', kill: 'KILL!', block: 'BLOCK!', netTouch: 'NET TOUCH', serveFault: 'SERVE FAULT', serveNet: 'SERVE IN THE NET', serveOut: 'SERVE OUT', noServe: 'TOO LATE TO SERVE', under: 'UNDER THE NET' },
  newStats() { return { serves: 0, aces: 0, serveFaults: 0, digs: 0, perfectPasses: 0, sets: 0, kills: 0, attackErrors: 0, blocks: 0, points: 0, touches: 0 }; }
};
/** the judge's windows, scaled by Settings (timing assist) */
G.windows = () => { const a = G.ASSIST[G.setting('assist')] || 1; return { perfect: G.T.perfectWin * a, great: G.T.greatWin * a, ok: G.T.okWin * a }; };
G.judge = (err, w = G.windows()) => { const e = Math.abs(err); return e <= w.perfect ? 'PERFECT' : e <= w.great ? 'GREAT' : e <= w.ok ? 'OK' : 'MISS'; };
G.QUAL = { PERFECT: { r: 4, sp: 1.12, n: 3 }, GREAT: { r: 10, sp: 1, n: 2 }, OK: { r: 20, sp: .85, n: 1 }, STRETCH: { r: 30, sp: .8, n: 0 }, MISS: { r: 60, sp: .6, n: -1 } };
G.lower = q => q === 'PERFECT' ? 'GREAT' : q === 'GREAT' ? 'OK' : 'STRETCH';
G.setting = k => { const s = G.game && G.game.settings; return s ? s[k] : undefined; };

// ==== 22-players.js ====
/* 22-players: a volleyball player: movement (no crossing the net), actions with rig states, the jump for attacks and
 * blocks, the dive, calls; a human's controller (the stick, the timing judge, aiming by stick or mouse); the plan
 * (where and when her next contact is) is set by the match. */
G.Player = class {
  constructor(M, idx, side, slot, spec) {
    this.M = M; this.idx = idx; this.side = side; this.slot = slot; this.id = spec.id; this.spec = spec;
    const c = G.CAST[spec.id]; this.cast = c; this.stats0 = c.stats || { POW: 5, TEC: 5, SPD: 5, JMP: 5 };
    this.rig = G.anim.rig(G.makeRig(spec.id, { suit: spec.suit, acc: spec.acc }));
    this.input = spec.input || null; this.human = !!spec.input || !!spec.human; this.seat = spec.seat; this.color = spec.color; this.name = spec.name || c.short;
    this.x = side ? G.COURT.X1 - 60 : G.COURT.X0 + 60; this.y = G.COURT.CY + (slot ? 30 : -30); this.z = 0; this.vx = 0; this.vy = 0; this.facing = side ? Math.PI : 0;
    this.act = null; this.lock = 0; this.call = 'auto'; this.callT = 0; this.callText = ''; this.plan = null; this.pressed = false; this.judge = null; this.popT = 0;
    this.jump = null; this.dive = null; this.stats = G.Rules.newStats(); this.aiT = 0; this.cpuControl = false; this.base = spec.base === undefined ? .5 : spec.base; this.chem = spec.chem || 1;
  }
  get dir() { return this.side ? -1 : 1; }
  get speed() { return G.T.runSpeed * (.86 + .03 * this.stats0.SPD) * (this.human && !this.cpuControl ? 1 : G.T.aiSpeedMul); }
  get reach() { return G.T.reach + .4 * this.stats0.TEC; }
  get attackH() { return 50 * this.rig.o.size / 1.25 + 12 + 1.2 * this.stats0.JMP - 8; }
  get standReach() { return 46 * this.rig.o.size / 1.25; }
  get jumpMax() { return 12 + 1.2 * this.stats0.JMP; }
  get isHuman() { return this.human && !this.cpuControl && !this.M.cpuAll && (!!this.input || this.remote || this.viewOnly); }
  /** how long from leaving the ground to the top of the jump */
  get rise() { return .38; }
  setAct(kind, dur, o = {}) { this.act = Object.assign({ kind, t0: this.M.clock, dur }, o); }
  /** hand height of a block at time t (0 when not blocking) */
  handTop(t) { const j = this.jump; if (!j || j.kind !== 'block') return 0; return this.standReach + this.jumpZ(t); }
  jumpZ(t) {
    const j = this.jump; if (!j) return 0; const u = t - j.t0, rise = j.rise, hold = j.hold, fall = j.fall, H = j.h;
    if (u < 0) return 0; if (u < rise) return H * E.ease.outQuad(u / rise); if (u < rise + hold) return H; if (u < rise + hold + fall) return H * (1 - E.ease.inQuad((u - rise - hold) / fall)); return 0;
  }
  startJump(t0, kind, rise = .38, hold = .12, fall = .3) { this.jump = { t0, kind, rise, hold, fall, h: this.jumpMax * (kind === 'block' ? .85 : 1) }; }
  /** a step: movement toward a target (the AI's or auto-run) or from the stick */
  update(dt) {
    const M = this.M, t = M.clock, C = G.COURT;
    this.lock = Math.max(0, this.lock - dt); this.callT = Math.max(0, this.callT - dt); this.popT = Math.max(0, this.popT - dt);
    if (this.remote || this.viewOnly) { this.z = Math.max(this.jumpZ(t), this.netZ || 0); if (this.jump && t - this.jump.t0 > this.jump.rise + this.jump.hold + this.jump.fall) this.jump = null; this.animate(dt); return; }
    let mx = 0, my = 0, sp = this.speed;
    const busy = M.phase === 'coin';
    if (this.dive && t - this.dive.t0 < .22) { mx = this.dive.dx; my = this.dive.dy; sp = 190; }
    else if (this.dive && t - this.dive.t0 < .52) { const k = 1 - (t - this.dive.t0 - .22) / .3; mx = this.dive.dx * k; my = this.dive.dy * k; sp = 120; }
    else if (this.dive && t - this.dive.t0 < .97) { mx = my = 0; }
    else {
      if (this.dive) this.dive = null;
      const tgt = this.moveTarget, I = this.isHuman ? this.input : null;
      let stick = [0, 0];
      if (I && this.lock <= 0 && !M.replaying) { const m = I.move(); if (Math.hypot(m[0], m[1]) > .15) stick = G.game.view.screenDirToGround(m[0], m[1]).slice(0, 2).map(v => v * Math.min(1, Math.hypot(m[0], m[1]))); }
      if (stick[0] || stick[1]) { mx = stick[0]; my = stick[1]; }
      else if (tgt && (!I || (G.setting('autoRun') !== false && this.plan) || M.phase === 'intro' || M.phase === 'point')) {
        const dx = tgt[0] - this.x, dy = tgt[1] - this.y, d = Math.hypot(dx, dy), k = I ? G.T.autoMove : 1;
        if (d > 1.5) { const f = Math.min(1, d / 10); mx = dx / d * f * k; my = dy / d * f * k; }
      }
      if (this.jump && this.jumpZ(t) > 0) { mx *= .3; my *= .3; }
      if (this.lock > 0) { mx *= .2; my *= .2; }
    }
    if (busy) { mx = my = 0; }
    this.vx = G.approach(this.vx, mx * sp, 900 * dt); this.vy = G.approach(this.vy, my * sp, 900 * dt);
    this.x += this.vx * dt; this.y += this.vy * dt;
    // never past the net plane; inside the beach
    const lim = C.NET_X - this.dir * 6;
    if (this.side === 0) this.x = Math.min(this.x, lim); else this.x = Math.max(this.x, lim);
    this.x = clamp(this.x, 40, C.W - 40); this.y = clamp(this.y, 70, C.H - 30);
    this.z = this.jumpZ(t); if (this.jump && t - this.jump.t0 > this.jump.rise + this.jump.hold + this.jump.fall) { this.jump = null; this.rig.land(.4); }
    // face the ball while it is live, else where she runs
    const b = M.ballPos, sp2 = Math.hypot(this.vx, this.vy);
    let face = this.facing;
    if (M.phase === 'rally' || M.phase === 'toss') { if (b) face = Math.atan2(b[1] - this.y, b[0] - this.x); }
    else if (sp2 > 10) face = Math.atan2(this.vy, this.vx);
    else if (M.phase === 'serveSetup') face = this.side ? Math.PI : 0;
    if (this.faceTo !== undefined && this.faceTo !== null) face = this.faceTo;
    this.facing = E.approachAng(this.facing, face, dt * 10);
    this.animate(dt);
  }
  animate(dt) {
    const M = this.M, t = M.aclock, a = this.act, rig = this.rig;
    let vb = null, pose = null, expr = null, flip = 0, down = 0, crouch = false, hop = 0;
    if (a) {
      const u = (t - a.t0) / a.dur;
      if (u >= 1) this.act = null;
      else {
        vb = { kind: a.kind, u: clamp(u, 0, 1), w: G.anim.weight(clamp(u, 0, 1), a.win || .15, a.wout || .2), aim: a.aim };
        pose = a.pose || G.anim.pose(a.kind); expr = a.expr || null;
        if (a.kind === 'dive') { down = clamp(u < .3 ? u / .3 : u > .8 ? (1 - u) / .2 : 1, 0, 1) * .85; }
        if (a.flip) flip = clamp(u, 0, 1);
        if (a.hop) hop = Math.abs(Math.sin(u * Math.PI * 3)) * a.hop;
        if (a.kind === 'dig' || a.kind === 'bump') crouch = true;
      }
    }
    if (!vb && (M.phase === 'rally' || M.phase === 'serveSetup' || M.phase === 'toss') && !(M.server === this && M.phase !== 'rally')) { vb = { kind: 'ready', u: 0, w: .8 }; crouch = M.phase === 'rally'; }
    rig.vb = vb;
    rig.update(dt, { x: this.x, y: this.y, z: this.z + hop, vx: this.vx, vy: this.vy, facing: this.facing, air: this.z > 2 || flip > 0, pose, expr, flip, down, crouch });
  }
  get moveTarget() { return this.plan ? this.plan.P : this.home; }
  /** a dive toward the stick, or toward the plan's point */
  startDive() {
    if (this.dive || (this.jump && this.z > 1)) return false;
    const I = this.isHuman ? this.input : null; let d = [Math.cos(this.facing), Math.sin(this.facing)];
    if (I) { const m = I.move(); if (Math.hypot(m[0], m[1]) > .2) d = G.game.view.screenDirToGround(m[0], m[1]); else if (this.plan) { const dx = this.plan.P[0] - this.x, dy = this.plan.P[1] - this.y, l = Math.hypot(dx, dy) || 1; d = [dx / l, dy / l]; } }
    else if (this.plan) { const dx = this.plan.P[0] - this.x, dy = this.plan.P[1] - this.y, l = Math.hypot(dx, dy) || 1; d = [dx / l, dy / l]; }
    const l = Math.hypot(d[0], d[1]) || 1; this.dive = { t0: this.M.clock, dx: d[0] / l, dy: d[1] / l };
    this.facing = Math.atan2(d[1], d[0]); this.setAct('dive', .97, { win: .1, wout: .25 });
    G.sfx('dive'); G.fx.sand(this.x, this.y, 10); if (this.isHuman && this.input) this.input.rumble(.3, .15);
    return true;
  }
  /** dive reach bonus while lunging */
  get diveBonus() { return this.dive && this.M.clock - this.dive.t0 < .5 ? G.T.diveReach : 0; }
  cycleCall() {
    this.call = this.call === 'auto' ? 'mine' : this.call === 'mine' ? 'yours' : 'auto';
    this.callText = this.call === 'mine' ? 'MINE!' : this.call === 'yours' ? 'YOURS!' : 'AUTO'; this.callT = 1;
    if (this.call !== 'auto') { G.voice.say(this.call === 'mine' ? 'Mine!' : 'Yours!', this.id); this.setAct('call', .5); }
  }
  shout(text) { this.callText = text; this.callT = .9; G.voice.say(text.charAt(0) + text.slice(1).toLowerCase(), this.id); }
  /** the aim point on the other side from the stick or the mouse; zones: depth short / mid / deep, lateral line / centre / cross */
  aimPoint(kind) {
    const C = G.COURT, s = this.side, I = this.isHuman ? this.input : null, d = this.dir;
    let depth = 2, lat = 0;
    if (I) {
      if ((I.lastDevice === 'mouse' || I.lastDevice === 'keyboard') && G.mouseAim && this.idx === this.M.mouseOwner) {
        const mg = G.game.mouseGround && G.game.mouseGround();
        if (mg && (s === 0 ? mg[0] > C.NET_X : mg[0] < C.NET_X)) return [clamp(mg[0], C.X0 + 6, C.X1 - 6), clamp(mg[1], C.Y0 + 6, C.Y1 - 6)];
      }
      const m = I.move();
      if (Math.hypot(m[0], m[1]) > .3) { const g = G.game.view.screenDirToGround(m[0], m[1]), along = g[0] * d; depth = along > .45 ? 0 : along < -.45 ? 2 : 1; lat = Math.abs(g[1]) > .4 ? Math.sign(g[1]) : 0; if (Math.abs(along) <= .45 && !lat) depth = 1; }
    }
    return G.zonePoint(s, depth, lat);
  }
};
/** a point in one of the nine zones of the other side's court: depth 0 short, 1 mid, 2 deep; lat -1, 0, 1 (y) */
G.zonePoint = (s, depth, lat) => { const C = G.COURT, d = s ? -1 : 1; return [C.NET_X + d * [28, 70, 108][depth], C.CY + lat * 44]; };

// ==== 23-ai.js ====
/* 23-ai: the volleyball AI. Skill per touch = (the day's base × aiSkillMul + difficulty) × (0.8 + 0.05 × the stat it
 * uses) × chemistry (the player's partner: by affinity), clamped 0..1. Each touch rolls PERFECT / GREAT / MISS / OK on the
 * match stream. Formation by phase; attack zones chosen far from the defenders; serves at deep corners or the seam;
 * blocks when the set is near the net and a skill roll passes. Spectacle mode (the attract) plays perfect rallies of a
 * random 3-9 touches and then kills it into the biggest gap. */
G.AI = {
  skill(p, stat) {
    const M = p.M, d = (G.DIFF[M.difficulty] || G.DIFF.Normal).ai;
    if (M.spectacle) return 1;
    const base = p.base * G.T.aiSkillMul + (p.side === M.humanSide || M.versus ? 0 : d);
    let chem = 1; if (p.side === M.humanSide && M.partnerAff !== null) chem = (1 - G.T.chemistry / 2) + G.T.chemistry * M.partnerAff / 100;
    return clamp(base * (.8 + .05 * p.stats0[stat]) * chem, 0, 1);
  },
  /** the quality of an AI touch */
  roll(p, stat) {
    const s = this.skill(p, stat), r = G.rng('match');
    if (p.M.spectacle) return 'PERFECT';
    const pP = .1 + .45 * s, pG = .3, pM = Math.max(.02, .32 * (1 - s) * (1 - s));
    return r < pP ? 'PERFECT' : r < pP + pG ? 'GREAT' : r < pP + pG + pM ? 'MISS' : 'OK';
  },
  /** where each player stands when she isn't going for the ball */
  formation(M) {
    const C = G.COURT, ph = M.phase, L = M.L;
    for (const p of M.players) {
      const d = p.dir, mate = M.players.find(q => q.side === p.side && q !== p), left = p.slot === 0 ? -1 : 1;
      let hx, hy;
      const ownHalfX = f => C.NET_X - d * f;
      if (ph === 'serveSetup' || ph === 'toss' || ph === 'intro' || ph === 'coin') {
        if (M.server === p) { hx = p.side ? C.X1 + 20 : C.X0 - 20; hy = p.serveY === undefined ? C.CY + left * 20 : p.serveY; }
        else if (M.serveSide === p.side) { hx = ownHalfX(40); hy = C.CY - left * 30; }
        else { hx = ownHalfX(128 * .62); hy = C.CY + left * 32; }
      } else {
        const ballSide = L ? G.Ball.sideOf(L.land[0]) : p.side, ours = ballSide === p.side, touches = M.touches[p.side];
        if (ours && L && L.side === p.side && touches === 1 && mate && mate.plan) { hx = ownHalfX(48); hy = clamp(mate.plan.P[1] + left * 30, C.Y0 + 10, C.Y1 - 10); }   // the hitter backs off for her approach
        else if (!ours && M.attackPlan && M.attackPlan.side !== p.side && p.blockFor) { const h = M.attackPlan.p; hx = ownHalfX(8); hy = clamp(h.y, C.Y0 + 6, C.Y1 - 6); }
        else if (!ours) { const ap = M.attackPlan, hy0 = ap ? ap.p.y : C.CY; hx = ownHalfX(128 * .6); hy = clamp(C.CY + (C.CY - hy0) * .4 + left * 36, C.Y0 + 8, C.Y1 - 8); }
        else { hx = ownHalfX(128 * .55); hy = C.CY + left * 32; }
      }
      p.home = [hx, hy];
    }
  },
  /** where an attacker aims: the zone farthest from the defenders (their predicted spots), minus a little near the lines */
  attackTarget(p, kind) {
    const M = p.M, foes = M.players.filter(q => q.side !== p.side), s = this.skill(p, 'POW'); let best = null, bv = -1e9;
    for (let dep = 0; dep < 3; dep++) for (let lat = -1; lat <= 1; lat++) {
      if (kind === 'spike' && dep === 0) continue;
      const z = G.zonePoint(p.side, dep, lat); let near = 1e9;
      for (const f of foes) { const fx = f.home ? (f.x + f.home[0]) / 2 : f.x, fy = f.home ? (f.y + f.home[1]) / 2 : f.y; near = Math.min(near, Math.hypot(z[0] - fx, z[1] - fy) - f.reach); }
      const v = near - (lat ? 8 * (1 - s) : 0) - (dep === 2 ? 4 * (1 - s) : 0) + G.rng('match') * 6;
      if (v > bv) { bv = v; best = z; }
    }
    return best;
  },
  serveTarget(p) {
    const r = G.rng('match'), M = p.M;
    if (r < .4) return G.zonePoint(p.side, 2, -1); if (r < .8) return G.zonePoint(p.side, 2, 1);
    const recv = M.players.filter(q => q.side !== p.side); const y = recv.length === 2 ? (recv[0].y + recv[1].y) / 2 : G.COURT.CY;
    return [G.zonePoint(p.side, 1, 0)[0], y];
  },
  serveKind(p) { const j = p.stats0.POW >= 8 ? .5 : .3; return G.rng('match') < j ? 'jump' : 'float'; },
  /** should the AI choose a cut shot instead of a spike? (a blocker up and in line, or 20% for variety) */
  wantsShot(p) { const M = p.M, b = M.players.find(q => q.side !== p.side && q.blockFor); return (b && Math.abs(b.y - p.y) < 16) || G.rng('match') < .2; },
  /** pick one defender to block when the set lands near the net */
  pickBlocker(M, attacker) {
    for (const q of M.players) q.blockFor = false;
    const def = M.players.filter(q => q.side !== attacker.side && !q.isHuman);
    if (!def.length) return null;
    const near = def.sort((a, b) => Math.abs(a.x - G.COURT.NET_X) - Math.abs(b.x - G.COURT.NET_X))[0];
    const s = this.skill(near, 'JMP');
    if (M.spectacle || G.rng('match') < .35 + .45 * s) { near.blockFor = true; return near; }
    return null;
  }
};

// ==== 24-match.js ====
/* 24-match: one Match class for every mode (vacation, tutorial, semifinal, final, Beach Match, AI Hub, attract).
 * Phases: intro -> coin -> serveSetup -> toss -> rally -> dead -> point -> [replay] -> ... -> end. The match keeps its own
 * clock (game time locally, the hub's clock online); contacts are planned from the launch (who takes it, where, when),
 * humans are judged on their presses against that plan, the AI rolls its touches on the match stream. */
G.VIEW_COURT = new E.View('court', 'Broadcast', 8, 32, 1.5, 1);
G.VIEW_SERVE = [new E.View('servecamL', 'Serve Cam', -90, 46, 1.5, 1), new E.View('servecamR', 'Serve Cam', 90, 46, 1.5, 1)];
const Bl = G.Ball;
G.Match = class {
  constructor(cfg) {
    this.cfg = cfg; this.mode = cfg.mode || 'exhibition'; this.clock = 0; this.aclock = 0; this.phase = 'intro'; this.phT = 0;
    this.score = [0, 0]; this.sets = [0, 0]; this.to = cfg.pointsToWin || 7; this.setsToWin = cfg.setsToWin || 1;
    this.difficulty = cfg.difficulty || G.setting('difficulty') || 'Normal';
    this.tod = cfg.tod || 'afternoon'; this.weather = cfg.weather || 'sunny';
    this.spectacle = !!cfg.spectacle; this.cpuAll = !!cfg.cpuAll; this.partnerAff = cfg.partnerAff === undefined ? null : cfg.partnerAff;
    this.players = [];
    cfg.teams.forEach((team, s) => team.forEach((spec, k) => this.players.push(new G.Player(this, this.players.length, s, k, spec))));
    this.humanSide = this.players.some(p => p.side === 0 && p.human) ? 0 : this.players.some(p => p.side === 1 && p.human) ? 1 : -1;
    this.versus = this.players.some(p => p.side === 0 && p.human) && this.players.some(p => p.side === 1 && p.human);
    this.mouseOwner = (this.players.find(p => p.input === G.game.input) || {}).idx;
    this.lastServer = [1, 1]; this.serveSide = cfg.serveFirst === undefined ? 0 : cfg.serveFirst; this.server = null;
    this.touches = [0, 0]; this.lastTouch = null; this.lastWasBlock = false; this.L = null; this.rallyTouches = 0; this.rallies = 0; this.longest = 0;
    this.specials = cfg.specials || {}; this.glare = null; this.houseEdgeUsed = {}; this.luckyUsed = false;
    this.camMode = cfg.cam || (G.setting('matchCam') === 'servecam' ? 'servecam' : 'court');
    this.replayBuf = []; this.replay = null; this.ptsSinceReplay = 9; this.replays = cfg.replays !== false && !G.inHub();
    this.banner = null; this.popups = []; this.over = false; this.result = null; this.matchPoint = false;
    this.tutorial = cfg.tutorial ? { autoLeft: 2, shown: {} } : null;
    this.comment = new G.Commentary(cfg.commentary !== false && G.setting('commentary') !== false);
    this.crowd = []; for (let i = 0; i < 36; i++) { const h = E.hash2(i * 7, 3), tier = i % 3, col = Math.floor(i / 3), bx = col < 6 ? 278 + col * 9 : 382 + (col - 6) * 9; this.crowd.push({ x: bx + (h - .5) * 3, y: [102, 96, 90][tier], z: [6, 12, 18][tier], shirt: ['#ff5f7a', '#ffd36a', '#5ff0ff', '#7cff5a', '#ffffff', '#ff9e5e', '#a87aff'][Math.floor(h * 7)], skin: ['#f1cfb2', '#b9825a', '#7a4a2e', '#e2ad84'][Math.floor(h * 31) % 4], ph: h * 9, side: i % 2 }); }
    this.cheer = 0; this.groan = 0; this.attackPlan = null; this.events = [];
    this.introT = cfg.skipIntro ? 0 : 3;
    this.net = null;   // the AI Hub layer (25-netplay) when online
    for (const p of this.players) p.home = [p.x, p.y];
    // walk-on: everyone starts at the sides
    for (const p of this.players) { p.x = p.side ? G.COURT.X1 + 50 : G.COURT.X0 - 50; p.y = G.COURT.Y1 + 30 + p.slot * 14; }
    G.AI.formation(this);
    G.bus.emit('matchStart', this);
  }
  get ballPos() { if (this.replay) return this.replay.ball; if (this.L) return Bl.at(this.L, this.clock); const s = this.server; if (s) { const h = s.rig.hand ? s.rig.hand('L') : null; return h ? [h[0], h[1], h[2]] : [s.x, s.y, 22]; } return null; }
  now() { return this.clock; }
  /* ------------------------------------------------ the step ------------------------------------------------ */
  update(dt) {
    if (this.net && this.net.clock) this.clock = this.net.clock(); else this.clock += dt;
    this.aclock = this.clock; this.phT += dt;
    if (this.replay) return this.replayStep(dt);
    if (this.net && this.net.client) { this.net.clientStep(dt); this.common(dt); return; }
    this.phaseStep(dt);
    this.common(dt);
    this.record();
  }
  common(dt) {
    G.AI.formation(this);
    for (const p of this.players) {
      if (this.phase === 'serveSetup' && p === this.server) { p.x = p.side ? G.COURT.X1 + 20 : G.COURT.X0 - 20; }
      p.update(dt);
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    this.popups = this.popups.filter(q => (q.t += dt) < 1);
    this.cheer = Math.max(0, this.cheer - dt); this.groan = Math.max(0, this.groan - dt);
    this.comment.update(dt);
    // the view: V / R3 toggles the camera
    for (const p of this.players) if (p.isHuman && p.input && p.input.pressed('view')) { this.camMode = this.camMode === 'court' ? 'servecam' : 'court'; G.game.note(this.camMode === 'court' ? 'BROADCAST' : 'SERVE CAM'); }
    this.camera();
  }
  phaseStep(dt) {
    const t = this.clock;
    switch (this.phase) {
      case 'intro':
        if (this.net) break;
        if (this.phT > this.introT || this.players.some(p => p.isHuman && p.input && (p.input.pressed('play') || p.input.pressed('confirm')))) { this.phase = 'coin'; this.phT = 0; this.say('start'); G.sfx('whistle'); this.setBanner((this.serveSide ? 'RIGHT' : 'LEFT') + ' SIDE SERVES', 1); }
        break;
      case 'coin': if (this.phT > 1) this.startServe(); break;
      case 'serveSetup': this.serveSetupStep(dt); break;
      case 'toss': this.tossStep(dt); break;
      case 'rally': this.rallyStep(dt); break;
      case 'dead': if (this.phT > 1) { this.phase = 'point'; this.phT = 0; this.celebrate(); } break;
      case 'point':
        if (this.phT > 1.6) {
          if (this.over) { this.phase = 'end'; this.phT = 0; this.finish(); }
          else if (this.wantReplay) { this.wantReplay = false; this.startReplay(); }
          else this.startServe();
        }
        break;
    }
    if (this.tutorial) this.tutorialStep();
  }
  /* ------------------------------------------------ serving ------------------------------------------------ */
  startServe() {
    const s = this.serveSide, slot = G.Rules.nextServer(this.lastServer, s);
    this.server = this.players.find(p => p.side === s && p.slot === slot) || this.players.find(p => p.side === s);
    this.lastServer[s] = this.server.slot;
    this.phase = 'serveSetup'; this.phT = 0; this.L = null; this.touches = [0, 0]; this.lastTouch = null; this.attackPlan = null; this.rallyTouches = 0; this.glare = null;
    for (const p of this.players) { p.plan = null; p.pressed = false; p.blockFor = false; p.faceTo = null; p.act = null; p.jump = null; p.dive = null; }
    this.server.serveY = G.COURT.CY + (this.server.slot ? 22 : -22);
    this.server.x = this.server.side ? G.COURT.X1 + 20 : G.COURT.X0 - 20; this.server.y = this.server.serveY;
    this.aiServeAt = 1.2 + G.rng('match') * 1.3;
    if (this.specials.glare && this.server.id === 'sonny' && G.rng('match') < .5) this.glare = { t: -1 };
    if (this.net && this.net.host) this.net.event({ ev: 'serve', server: this.server.idx });
  }
  serveSetupStep(dt) {
    const p = this.server;
    if (p.isHuman && !this.netRemote(p)) {
      const I = p.input, m = I.move(); if (Math.abs(m[1]) > .2 || Math.abs(m[0]) > .2) { const g = G.game.view.screenDirToGround(m[0], m[1]); p.serveY = clamp(p.serveY + g[1] * 70 * dt, G.COURT.Y0 + 4, G.COURT.Y1 - 4); }
      if (I.pressed('play')) this.toss('float'); else if (I.pressed('shot')) this.toss('jump');
      else if (this.phT > 10) { this.toss('float'); this.autoServe = true; }
    } else if (!this.netRemote(p) && this.phT > this.aiServeAt) this.toss(G.AI.serveKind(p));
    if (this.netRemote(p) && this.phT > 12) { this.toss('float'); this.autoServe = true; }
  }
  netRemote(p) { return this.net && this.net.host && p.remote; }
  toss(kind) {
    const p = this.server, d = p.dir, apex = kind === 'jump' ? 66 : 56, z0 = 30, g = G.T.ballGravity, vz = Math.sqrt(2 * g * (apex - z0)) * 1.04;
    this.L = Bl.make(this.clock, [p.x + d * 4, p.y + 2, z0], [d * (kind === 'jump' ? 12 : 3), 0, vz], { kind: 'toss', side: p.side, by: p.idx, k: .0001 });
    this.tossKind = kind; this.tossApex = this.clock + Bl.apexTau(this.L); this.phase = 'toss'; this.phT = 0; this.tossHit = false;
    p.setAct('toss', .55); G.sfx('serveToss');
    if (kind === 'jump') { p.startJump(this.tossApex - .38, 'spike'); }
    if (this.glare) this.glare.t = this.clock;
    if (this.net && this.net.host) this.net.launch(this.L);
  }
  tossStep(dt) {
    const p = this.server, t = this.clock;
    if (this.tossKind === 'jump' && t > this.tossApex - .5) { p.x += p.dir * 40 * dt; }
    if (p.isHuman && !this.netRemote(p) && !this.autoServe) {
      const I = p.input;
      if (I.pressed('play') || I.pressed('shot')) { const err = t - this.tossApex, q = G.devPerfect ? 'PERFECT' : G.judge(err); this.popup(p, q); return this.serveHit(q === 'MISS' ? 'STRETCH' : q, null, true); }
    } else if (this.autoServe && t >= this.tossApex) { this.autoServe = false; return this.serveHit('OK'); }
    else if (!this.netRemote(p) && !p.isHuman && t >= this.tossApex + (G.rng('match') - .5) * .04) return this.serveHit(G.AI.roll(p, 'POW'));
    if (t > this.L.t0 + 1.2 + (this.tossKind === 'jump' ? .3 : 0) || this.L && t >= this.L.tLand) this.fault(p.side, 'noServe');
  }
  /** the serve: from the ball at the top of the toss to the aim, scattered by quality */
  serveHit(q, aim, judged) {
    const p = this.server, from = Bl.at(this.L, this.clock), jump = this.tossKind === 'jump';
    if (q === 'MISS') q = 'STRETCH';
    let tgt = aim || (p.isHuman ? p.aimPoint('serve') : G.AI.serveTarget(p));
    const rad = G.QUAL[q].r * (jump ? 1.5 : 1), a = G.rng('match') * Math.PI * 2, rr = Math.sqrt(G.rng('match')) * rad;
    if (this.spectacle) tgt = G.zonePoint(p.side, 2, G.rng('match') < .5 ? -1 : 1);
    const T = (jump ? G.T.jumpServeT : G.T.serveT) / G.QUAL[q].sp * (q === 'STRETCH' ? 1 : 1);
    const to = [tgt[0] + Math.cos(a) * rr, tgt[1] + Math.sin(a) * rr, Bl.R];
    const v = Bl.aim(from, to, T);
    const wob = jump ? null : { a: 3 + G.rng('match') * 4, w: 9 + G.rng('match') * 4, ph: G.rng('match') * 6 };
    this.L = Bl.make(this.clock, from, v, { kind: 'serve', side: p.side, by: p.idx, wob });
    this.phase = 'rally'; this.phT = 0; this.touches = [0, 0]; this.lastTouch = p; this.lastWasBlock = false; this.rallyTouches = 0; this.killAt = 3 + Math.floor(G.rng('match') * 7);
    p.stats.serves++; p.setAct('serve', .45, { win: .05 }); G.sfx('serveHit'); if (p.isHuman) p.input.rumble(.35, .1);
    this.plan();
    if (this.net && this.net.host) this.net.launch(this.L);
    G.bus.emit('touch', { kind: 'serve', p, q });
  }
  /* ------------------------------------------------ the rally ------------------------------------------------ */
  rallyStep(dt) {
    const t = this.clock;
    let L = this.L;
    if (L.tNet !== null && !L.netDone && t >= L.tNet) { L.netDone = true; this.netEvent(L); if (this.phase !== 'rally') return; L = this.L; }
    for (const p of this.players) {
      if (this.netRemote(p)) { this.remoteStep(p); continue; }
      if (p.isHuman && p.input) this.humanStep(p); else if (!p.isHuman) this.aiStep(p);
      if (this.L !== L || this.phase !== 'rally') return;
    }
    if (t >= L.tLand) this.landed(L);
  }
  /** a human's buttons during a rally */
  humanStep(p) {
    const I = p.input, t = this.clock, pl = p.plan;
    if (I.pressed('call')) { p.cycleCall(); this.plan(true); }
    if (I.pressed('dive')) p.startDive();
    const sh = I.pressed('shot'), pl2 = I.pressed('play');
    if (sh && this.attackPlan && this.attackPlan.side !== p.side && Math.abs(p.x - G.COURT.NET_X) < 22 && !p.jump) { p.startJump(t, 'block', G.T.blockRise, .18, .3); p.blockPress = t; p.setAct('block', G.T.blockRise + .48, { win: .1 }); G.sfx('ui_tick'); return; }
    if (pl && (sh || pl2) && !p.pressed) {
      const err = t - pl.t;
      if (err >= -.6) {
        const w = G.windows();
        if (err > w.ok) { /* too late: the ball has passed */ }
        else {
          let q = G.devPerfect ? 'PERFECT' : G.judge(err, w);
          p.pressed = true;
          if (q === 'MISS') { this.whiff(p); return; }
          const b = Bl.at(this.L, t), d = Math.hypot(b[0] - p.x, b[1] - p.y), reach = p.reach + p.diveBonus;
          if (d > reach + 8 && !G.devPerfect) { this.whiff(p); return; }
          if (d > reach && !G.devPerfect) q = G.lower(q);
          return this.contact(p, q, { shot: sh });
        }
      }
    }
    if (pl && !p.pressed && t >= pl.t) {
      const auto = pl.kind === 0 && (G.setting('autoReceive') || (this.tutorial && this.tutorial.autoLeft > 0));
      if (auto) { const b = Bl.at(this.L, t), d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d <= p.reach + 8 + p.diveBonus) { if (this.tutorial) this.tutorial.autoLeft--; p.pressed = true; return this.contact(p, 'OK', {}); } }
    }
    if (pl && t > pl.t + G.windows().ok + .02) { p.plan = null; }
    // the partner covers a ball the human can't get to
    if (pl && !p.pressed && t >= pl.t - .4 && t < pl.t - .38 + 1 / 120) {
      const mate = this.players.find(q => q.side === p.side && q !== p);
      if (mate && !mate.isHuman && Math.hypot(pl.P[0] - p.x, pl.P[1] - p.y) > 40 && Math.hypot(pl.P[0] - mate.x, pl.P[1] - mate.y) < 40 && !(this.lastTouch === mate && this.L.side === p.side)) { mate.plan = pl; p.plan = null; mate.shout('Mine!'); }
    }
  }
  whiff(p) { p.setAct('whiff', .45); p.lock = .45; this.popup(p, 'MISS'); G.sfx('ui_back'); }
  aiStep(p) {
    const t = this.clock, pl = p.plan;
    if (p.blockAt && t >= p.blockAt) { p.blockAt = null; p.startJump(t, 'block', G.T.blockRise, .18, .3); p.blockPress = t; p.setAct('block', G.T.blockRise + .48, { win: .1 }); }
    if (!pl) return;
    const P = Bl.at(this.L, pl.t), sk = G.AI.skill(p, 'TEC'), hard = this.L.kind === 'spike' ? (1 - sk) * 9 : this.L.kind === 'shot' ? (1 - sk) * 5 : 0, d = Math.hypot(P[0] - p.x, P[1] - p.y) + hard;
    if (!p.dive && t >= pl.t - .32 && d > p.reach + 4 && d < p.reach + G.T.diveReach + 18) p.startDive();
    if (t >= pl.t) {
      p.plan = null;
      if (d > p.reach + 8 + p.diveBonus) { if (G.rng('match') < .5) p.shout('Ah!'); return; }
      let q = G.AI.roll(p, pl.kind === 2 ? 'POW' : 'TEC');
      if (d > p.reach + p.diveBonus) q = G.lower(q);
      // digging a hard attack is a skill roll of its own
      if (!this.spectacle && (this.L.kind === 'spike' || this.L.kind === 'shot') && G.rng('match') > (this.L.kind === 'spike' ? .3 + .5 * sk : .45 + .4 * sk) * (this.L.spd > 360 ? .85 : 1)) { if (G.rng('match') < .6) { this.whiff(p); return; } q = 'SHANK'; }
      if (q === 'MISS') { if (G.rng('match') < .5) { this.whiff(p); return; } q = 'SHANK'; }
      this.contact(p, q, { shot: pl.kind === 2 ? G.AI.wantsShot(p) : pl.kind === 1 ? G.rng('match') < .08 && !this.players.some(o => o.side !== p.side && Math.abs(o.x - G.COURT.NET_X) < 40) : false, ai: true });
    }
  }
  /** a remote human's fighter on the host: it acts on the claims its player sends */
  remoteStep(p) {
    const t = this.clock, pl = p.plan;
    const c = p.claim; if (c) { p.claim = null; if (pl && Math.abs(c.at - pl.t) <= G.windows().ok + .12) { const b = Bl.at(this.L, c.at), d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d <= p.reach + 12 + G.T.diveReach) { this.clock = Math.max(this.clock, c.at); return this.contact(p, c.q, { shot: !!c.sh, aim: c.aim, at: c.at }); } } }
    if (c && c.block) { p.startJump(t, 'block', G.T.blockRise, .18, .3); p.blockPress = t; p.setAct('block', G.T.blockRise + .48); }
    if (pl && t > pl.t + G.windows().ok + .25) {   // waited long enough for a late claim
      if (pl.kind === 0 && G.setting('autoReceive')) { const b = Bl.at(this.L, pl.t), d = Math.hypot(b[0] - p.x, b[1] - p.y); if (d <= p.reach + 8) return this.contact(p, 'OK', {}); }
      p.plan = null;
    }
  }
  /** a touch: the new launch by kind (receive, set, attack) and quality */
  contact(p, q, o = {}) {
    const t = o.at === undefined ? this.clock : o.at, L = this.L, s = p.side, d = p.dir, C = G.COURT, mate = this.players.find(m => m.side === s && m !== p);
    const from = Bl.at(L, t); if (from[2] < Bl.R) from[2] = Bl.R + .5;
    const cameFromOther = L.side !== s || L.kind === 'serve';
    if (cameFromOther && !(this.lastWasBlock && this.lastTouch && this.lastTouch.side === s)) this.touches[s] = 0;
    if (this.lastTouch === p && !this.lastWasBlock && this.touches[s] > 0) return this.fault(s, 'double', p);
    this.touches[s]++;
    if (this.touches[s] > 3) return this.fault(s, 'four', p);
    const touchN = this.touches[s] - 1, kind = p.planKind !== undefined ? p.planKind : touchN;
    p.planKind = undefined;
    const Q = G.QUAL[q] || G.QUAL.OK, dig = !!p.dive || q === 'SHANK', rain = this.weather === 'rain' ? 1.2 : 1, rng = () => G.rng('match');
    const scatter = (pt, rad) => { const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rad; return [pt[0] + Math.cos(a) * r, pt[1] + Math.sin(a) * r]; };
    let v, kindName, T, he = false;
    if (q === 'SHANK') {   // a shank: anywhere
      const tgt = [from[0] - d * (20 + rng() * 60), from[1] + (rng() - .5) * 160]; v = Bl.aim(from, [tgt[0], tgt[1], Bl.R], .9 + rng() * .4); kindName = 'pass';
    } else if (touchN === 0 || kind === 0) {
      if (o.shot) {   // a free ball over
        const tgt = scatter(G.AI.attackTarget(p, 'free'), Q.r); v = Bl.aim(from, [tgt[0], tgt[1], Bl.R], 1.2); kindName = 'free';
      } else {
        let ty = mate ? mate.y : C.CY;
        if (p.isHuman && p.input) { const m = p.input.move(); if (Math.abs(m[1]) > .3 || Math.abs(m[0]) > .3) { const g = G.game.view.screenDirToGround(m[0], m[1]); ty += g[1] * 24; } }
        const tgt = scatter([C.NET_X - d * 40, clamp(ty, C.Y0 + 14, C.Y1 - 14)], Q.r * (dig ? 1.6 : 1) * rain);
        tgt[0] = s ? Math.max(tgt[0], C.NET_X + 10) : Math.min(tgt[0], C.NET_X - 10);
        T = G.T.passT * (dig ? 1.12 : 1) / Math.max(.8, Q.sp);
        v = Bl.aim(from, [tgt[0], tgt[1], 40], T); kindName = 'pass';
        if (L.kind === 'spike' || L.kind === 'shot') p.stats.digs++;
        if (q === 'PERFECT') p.stats.perfectPasses++;
      }
      p.setAct(dig ? 'dig' : 'bump', .5, { win: .08 }); G.sfx('bump');
    } else if (touchN === 1) {
      const hitter = mate || p;
      if (o.shot) { const tgt = scatter(G.zonePoint(s, 0, rng() < .5 ? -1 : 1), Q.r * .6); v = Bl.aim(from, [tgt[0], tgt[1], Bl.R], .6); kindName = 'dump'; }
      else {
        let quick = false, hy = hitter.y;
        if (p.isHuman && p.input) { const m = p.input.move(); if (Math.hypot(m[0], m[1]) > .3) { const g = G.game.view.screenDirToGround(m[0], m[1]); if (g[0] * d > .5) quick = true; } }
        const tgt = scatter([C.NET_X - d * 22, clamp(hy, C.Y0 + 14, C.Y1 - 14)], Q.r * .8 * rain);
        tgt[0] = s ? Math.max(tgt[0], C.NET_X + 8) : Math.min(tgt[0], C.NET_X - 8);
        T = (quick ? .75 : G.T.setT) / Math.max(.85, Q.sp);
        v = Bl.aim(from, [tgt[0], tgt[1], hitter.attackH], T); kindName = 'set'; p.stats.sets++;
      }
      p.setAct('set', .42, { win: .08 }); G.sfx('set');
    } else {
      const highEnough = from[2] > C.NET_H + 4;
      let tgt = o.aim || (p.isHuman ? p.aimPoint(o.shot ? 'shot' : 'spike') : G.AI.attackTarget(p, o.shot ? 'shot' : 'spike'));
      if (this.spectacle) tgt = G.AI.attackTarget(p, 'spike');
      if (this.specials.houseEdge && p.id === 'pepper' && !this.houseEdgeUsed[this.sets[0] + this.sets[1]] && !o.shot) { this.houseEdgeUsed[this.sets[0] + this.sets[1]] = true; tgt = G.zonePoint(s, 2, (this.players.find(x => x.side !== s && x.isHuman) || {}).y > C.CY ? -1 : 1); tgt[1] = tgt[1] > C.CY ? C.Y1 - 3 : C.Y0 + 3; q = 'PERFECT'; he = true; this.say(null, 'Line shot. Calculated.', 'pepper'); }
      if (!highEnough) {   // too low to attack: a soft free ball
        const ft = scatter(tgt, 20); v = Bl.aim(from, [ft[0], ft[1], Bl.R], 1.15); kindName = 'free';
        p.setAct('bump', .5);
      } else if (o.shot) {
        const ft = scatter(tgt, (G.QUAL[q] || Q).r * .8); v = Bl.aim(from, [ft[0], ft[1], Bl.R], G.T.shotT); kindName = 'shot'; p.setAct('shot', .5, { win: .05, aim: [6, 1, 28] }); G.sfx('set');
      } else {
        const ft = he ? tgt : scatter(tgt, (G.QUAL[q] || Q).r);
        const spd = G.T.spikeSpeed * (.85 + .035 * p.stats0.POW) * (G.QUAL[q] || Q).sp, dist = Math.hypot(ft[0] - from[0], ft[1] - from[1]);
        T = Math.max(.22, dist / (spd * Math.cos(15 * Math.PI / 180)));
        v = Bl.aim(from, [ft[0], ft[1], Bl.R], T);
        // spike assist: lift the arc just enough to clear the net
        const test = Bl.make(t, from, v, {}), nc = Bl.netCheck(test);
        if (nc && (nc.kind === 'net' || nc.kind === 'tape')) {
          const deficit = C.NET_H + Bl.R + 2 - nc.q[2], allow = p.isHuman ? (G.DIFF[this.difficulty] || G.DIFF.Normal).assist : 99;
          if (deficit < allow || this.spectacle) { for (let k = 0; k < 14; k++) { T *= 1.07; v = Bl.aim(from, [ft[0], ft[1], Bl.R], T); const n2 = Bl.netCheck(Bl.make(t, from, v, {})); if (!n2 || n2.kind === 'clear') break; } }
        }
        kindName = 'spike'; p.setAct('spike', .5, { win: .05, aim: [7, 1.2, 30] }); G.sfx('spike', { vol: Math.min(1.2, spd / 330) }); if (p.isHuman) p.input.rumble(.35, .1);
        G.game.shake(1.5);
      }
      this.attackPlan = null; for (const x of this.players) x.blockFor = false;
    }
    if (q === 'PERFECT') G.fx.sparkle(from[0], from[1], from[2], 8);
    this.L = Bl.make(t, from, v, { kind: kindName, side: s, by: p.idx });
    if (this.luckyArmed && p.id === 'sonny' && kindName === 'spike') { this.L.forceTape = true; this.luckyArmed = false; }
    if (this.L.kind === 'spike' && he) this.L.houseEdge = true;
    this.lastTouch = p; this.lastWasBlock = false; this.rallyTouches++; p.stats.touches++;
    if (p.isHuman || this.spectacle === false && p.side === this.humanSide) this.popup(p, q === 'SHANK' ? 'MISS' : q);
    if (this.rallyTouches === 8) { this.say('rally'); G.game.audio.layer('rally', 1, .5); }
    this.plan();
    if (this.net && this.net.host) this.net.launch(this.L);
    G.bus.emit('touch', { kind: kindName, p, q });
  }
  /** who takes the next touch, where and when */
  plan(keepCalls) {
    const L = this.L, t = this.clock, C = G.COURT;
    for (const p of this.players) { if (!keepCalls || p.plan) { p.plan = null; p.pressed = false; } p.planKind = undefined; }
    if (!L) return;
    const s = Bl.sideOf(L.land[0]), cross = L.tNet !== null && !L.netDone;
    const fromOther = L.side !== s || L.kind === 'serve' || L.kind === 'toss';
    const touchN = fromOther && !(this.lastWasBlock && this.lastTouch && this.lastTouch.side === s) ? 0 : this.touches[s];
    if (touchN >= 3) return;
    if (Math.abs(L.land[0] - C.NET_X) > 220 || Math.abs(L.land[1] - C.CY) > 150) return;   // far out: nobody chases it
    if (this.spectacle && (L.kind === 'spike' || L.kind === 'shot') && this.rallyTouches >= this.killAt && fromOther) return;   // the attract's kill
    let cands = this.players.filter(p => p.side === s && !(p === this.lastTouch && !this.lastWasBlock && !fromOther));
    if (!cands.length) return;
    const opts = cands.map(p => {
      let h = touchN === 2 ? p.attackH : touchN === 1 ? 40 : 18, ts = Bl.timeAtHeight(L, h);
      if (ts === null || ts < t + .12 || (cross && ts < L.tNet + .04)) { h = 18; ts = Bl.timeAtHeight(L, h); }
      if (ts === null || ts < t + .08 || (cross && ts < L.tNet + .04)) { ts = L.tLand - .04; h = Bl.at(L, ts)[2]; }
      if (ts < t + .05) return null;
      const P = Bl.at(L, ts), dist = Math.hypot(P[0] - p.x, P[1] - p.y), react = p.isHuman ? 0 : G.T.aiReaction * (1.2 - G.AI.skill(p, 'SPD'));
      const arrive = t + react + dist / p.speed;
      return { p, h, t: ts, P, arrive, dist };
    }).filter(Boolean);
    if (!opts.length) return;
    // a human's call wins if that player can get there
    let pick = null;
    for (const o of opts) if (o.p.isHuman && o.p.call === 'mine' && o.arrive <= o.t + .1 + .6) pick = o;
    for (const o of opts) if (o.p.isHuman && o.p.call === 'yours') { const other = opts.find(x => x !== o); if (other) pick = other; }
    if (!pick) { opts.sort((a, b) => (a.arrive - a.t) - (b.arrive - b.t) || (a.p === this.lastTouch ? 1 : -1)); pick = opts[0]; }
    if (opts.length > 1 && !pick.p.isHuman) { const o2 = opts.find(o => o !== pick); if (o2 && Math.abs((o2.arrive - o2.t) - (pick.arrive - pick.t)) < .05 && pick.p === this.lastTouch) pick = o2; }
    const p = pick.p; p.plan = { t: pick.t, P: [pick.P[0], pick.P[1]], h: pick.h, kind: touchN, z: pick.P[2] }; p.pressed = false; p.planKind = touchN;
    if (!p.isHuman && G.rng('match') < .25) p.shout(G.LINES[p.id] ? G.LINES[p.id].bark[0] : 'Mine!');
    if (touchN === 2) {
      this.attackPlan = { side: s, p, t: pick.t };
      if (pick.P[2] > C.NET_H + 4) p.startJump(pick.t - p.rise, 'spike');
      const b = G.AI.pickBlocker(this, p);
      if (b) { const err = (1 - G.AI.skill(b, 'JMP')) * (G.rng('match') - .5) * .2; b.blockAt = pick.t + .05 - G.T.blockRise + err; }
    }
    G.bus.emit('plan', p.plan);
  }
  /** the ball reaches the net plane: a block, a clear crossing, the tape, the net or outside the antennae */
  netEvent(L) {
    const C = G.COURT, q = Bl.at(L, L.tNet), t = L.tNet, att = L.side;
    if (L.kind !== 'toss') for (const b of this.players) {
      if (b.side === att || !b.jump || b.jump.kind !== 'block') continue;
      const top = b.handTop(t), reachY = 9 + .6 * b.stats0.JMP;
      if (Math.abs(q[1] - b.y) > reachY || Math.abs(b.x - C.NET_X) > 14 || q[2] < C.NET_H - 2 || q[2] > top + 2) continue;
      if (L.kind === 'shot' && !(b.stats0.JMP >= 9)) continue;
      const err = (b.blockPress + G.T.blockRise) - t;
      let bq = b.isHuman ? G.judge(err * .8) : G.AI.roll(b, 'JMP');
      if (G.devPerfect && b.isHuman) bq = 'PERFECT';
      if (err < -.28 && Math.abs(b.x - C.NET_X) < 9 && G.rng('match') < .5) return this.fault(b.side, 'netTouch', b);
      if (bq === 'MISS') continue;
      const v = Bl.vel(L, t);
      this.touches[b.side] = 0; this.lastTouch = b; this.rallyTouches++;
      if (bq === 'PERFECT' || bq === 'GREAT') {
        this.L = Bl.make(t, [C.NET_X - b.dir * 3, q[1], q[2]], [-.35 * v[0], .3 * v[1] + (G.rng('match') - .5) * 40, -60], { kind: 'stuff', side: b.side, by: b.idx });
        b.stats.blocks++; this.touches[b.side] = 1; this.lastWasBlock = true; G.sfx('block'); G.game.shake(2.5); G.fx.sparkle(q[0], q[1], q[2], 10); this.popup(b, 'BLOCK!'); if (b.isHuman) b.input.rumble(.5, .12);
      } else {
        this.L = Bl.make(t, [C.NET_X + b.dir * -1 * -3, q[1], q[2]], [b.dir * -1 * -40, v[1] * .2, 120], { kind: 'pass', side: b.side, by: b.idx });
        this.touches[b.side] = 1; this.lastWasBlock = true; G.sfx('block', { vol: .6 }); this.popup(b, 'TOUCH');
      }
      this.plan(); if (this.net && this.net.host) this.net.launch(this.L);
      return;
    }
    const nc = Bl.netCheck(L); if (!nc) return;
    const v = Bl.vel(L, t);
    if (L.forceTape || nc.kind === 'tape') {
      G.sfx('tape'); const over = L.forceTape || G.rng('match') < G.T.netCordOver;
      const nv = over ? [v[0] * .35, v[1] * .35, 60 + (G.rng('match') - .5) * 40] : [v[0] * -.3, v[1] * .3, 25];
      this.L = Bl.make(t, [C.NET_X + Math.sign(v[0]) * (over ? 2 : -2), nc.q[1], C.NET_H + Bl.R], nv, { kind: L.kind === 'serve' ? 'serve' : 'pass', side: L.side, by: L.by });
      this.L.netDone = true; this.L.tNet = null;
      if (over) { this.say('netcord'); this.setBanner('NET CORD!', .8); }
      this.plan(); if (this.net && this.net.host) this.net.launch(this.L);
    } else if (nc.kind === 'net') {
      G.sfx('net');
      if (L.kind === 'serve') return this.fault(L.side, 'serveNet');
      this.L = Bl.make(t, [C.NET_X - Math.sign(v[0]) * 3, nc.q[1], nc.q[2]], [v[0] * -.25, v[1] * .5, Math.max(10, v[2] * .3)], { kind: 'pass', side: L.side, by: L.by });
      this.L.tNet = null; this.L.netDone = true;
      this.plan(); if (this.net && this.net.host) this.net.launch(this.L);
    } else if (nc.kind === 'outside') return this.fault(L.side, L.kind === 'serve' ? 'serveOut' : 'antenna');
  }
  landed(L) {
    const p = L.land, s = Bl.sideOf(p[0]), inside = Bl.inCourt(p), by = this.players[L.by];
    G.sfx('sand'); G.fx.sand(p[0], p[1], 12);
    this.mark = { x: p[0], y: p[1], t: 2.5 };
    if (inside) {
      if (s === L.side) return this.pointTo(1 - s, L.kind === 'stuff' ? 'block' : 'in', by);
      const why = L.kind === 'serve' ? 'ace' : L.kind === 'spike' || L.kind === 'shot' || L.kind === 'dump' ? 'kill' : L.kind === 'stuff' ? 'block' : 'in';
      if (by && (why === 'ace')) by.stats.aces++; if (by && why === 'kill') by.stats.kills++;
      return this.pointTo(1 - s, why, by);
    }
    if (L.kind === 'serve') { if (by) by.stats.serveFaults++; return this.pointTo(1 - L.side, 'serveOut', null); }
    if (L.kind === 'spike' || L.kind === 'shot') { if (by) by.stats.attackErrors++; }
    if (L.kind === 'stuff') return this.pointTo(L.side, 'block', by);
    return this.pointTo(1 - L.side, 'out', null);
  }
  fault(side, why, p) {
    if (why === 'noServe' || why === 'serveNet' || why === 'serveOut') { if (this.server) this.server.stats.serveFaults++; this.say('serveFault'); }
    this.pointTo(1 - side, why, null);
  }
  pointTo(w, why, by) {
    if (this.phase !== 'rally' && this.phase !== 'toss') return;
    this.score[w]++; this.phase = 'dead'; this.phT = 0; this.lastWhy = why; this.lastWinner = w; this.lastBy = by;
    this.rallies++; this.longest = Math.max(this.longest, this.rallyTouches);
    if (by && (why === 'ace' || why === 'kill' || why === 'block') && by.side === w) by.stats.points++;
    for (const p of this.players) { p.plan = null; p.blockAt = null; }
    this.attackPlan = null;
    this.setBanner(G.Rules.CALLS[why] || 'POINT', 1.6, why);
    G.sfx('whistle');
    const homeWin = this.humanSide < 0 || w === this.humanSide; this.cheer = homeWin ? 1.4 : .6; if (!homeWin) this.groan = 1;
    G.sfx(homeWin ? 'crowdCheer' : 'crowdGroan');
    if (why === 'ace') { this.say('ace'); G.sting('ace'); } else if (why === 'kill' && this.L && this.L.spd > 360) this.say('spike'); else if (why === 'block') this.say('block');
    else if (why === 'out' || why === 'antenna' || why === 'netTouch' || why === 'double' || why === 'four') this.say('fault');
    if (w !== this.serveSide) this.serveSide = w;
    // set and match
    const won = G.Rules.setWon(this.score, this.to);
    if (won >= 0) {
      this.sets[won]++;
      if (this.sets[won] >= this.setsToWin) { this.over = true; this.winner = won; }
      else { this.setBanner('SET ' + (this.sets[0] + this.sets[1]) + ' TO ' + (won ? 'RIGHT' : 'LEFT'), 1.6); this.score = [0, 0]; }
    }
    const mp = !this.over && [0, 1].some(s => G.Rules.setPoint(this.score, this.to, s) && this.sets[s] + 1 >= this.setsToWin);
    if (mp && !this.matchPoint) { this.matchPoint = true; this.say('matchpoint'); G.sting('matchpoint'); const pos = G.game.audio.pos; if (pos && pos.bpm) G.game.audio.tempo(pos.bpm + 6); }
    if (!mp) this.matchPoint = false;
    // Lucky Seven: the first time the House reaches game point, Sonny's next attack dribbles over the tape
    if (this.specials.luckySeven && !this.luckyUsed) { const hs = this.players.find(p => p.id === 'sonny'); if (hs && G.Rules.setPoint(this.score, this.to, hs.side)) { this.luckyUsed = true; this.luckyArmed = true; } }
    G.game.audio.layer('rally', 0, 1);
    const big = why === 'ace' || why === 'block' || (this.L && this.L.spd > 400) || this.rallyTouches >= 8;
    this.ptsSinceReplay++;
    if (this.replays && big && this.ptsSinceReplay >= 3 && !this.over) { this.wantReplay = true; this.ptsSinceReplay = 0; }
    if (this.net && this.net.host) this.net.event({ ev: 'point', side: w, why, sc: this.score.slice(), sets: this.sets.slice() });
    G.bus.emit('point', { side: w, why, by, score: this.score.slice() });
  }
  celebrate() {
    const w = this.lastWinner, why = this.lastWhy, by = this.lastBy;
    for (const p of this.players) {
      const mate = this.players.find(q => q.side === p.side && q !== p);
      if (p.side === w) {
        if (by === p && (why === 'ace' || why === 'kill' || why === 'block') || (this.over && p === this.mvp())) { const c = G.CELEB[p.cast.celebrate] || G.CELEB.fistpump; p.setAct(c.move || 'cheer', c.dur, { pose: c.pose, hop: c.hop, flip: c.flip, expr: 'smile' }); }
        else if (mate) { p.home = [(p.x + mate.x) / 2 + (p.slot ? 4 : -4), (p.y + mate.y) / 2]; p.faceTo = Math.atan2(mate.y - p.y, mate.x - p.x); p.setAct('highfive', .8, { expr: 'smile' }); if (p.slot === 0) G.game.after(.45, () => { G.sfx('high_five'); G.fx.sparkle((p.x + mate.x) / 2, (p.y + mate.y) / 2, 30, 6); }); }
      } else {
        const k = G.rng('cosmetic'); p.setAct(k < .4 ? 'shrug' : k < .7 ? 'facepalm' : 'confused', 1.3, { expr: 'wince' });
      }
    }
    if (this.over) { for (const p of this.players) { if (p.side === w) p.setAct(p === this.mvp() ? ((G.CELEB[p.cast.celebrate] || {}).move || 'cheer') : 'cheer', 2.5, { pose: 'cheer', expr: 'smile', hop: 3, flip: p === this.mvp() && p.cast.celebrate === 'backflip' }); else p.setAct('sit', 2.5, { pose: 'kneel', expr: 'wince' }); } G.sting(this.humanSide < 0 || this.winner === this.humanSide ? 'win' : 'lose'); this.say('win'); }
  }
  mvp() { return this.players.slice().sort((a, b) => (b.stats.points * 3 + b.stats.kills * 2 + b.stats.aces * 2 + b.stats.blocks * 2 + b.stats.digs) - (a.stats.points * 3 + a.stats.kills * 2 + a.stats.aces * 2 + a.stats.blocks * 2 + a.stats.digs) || (b.side === this.winner) - (a.side === this.winner))[0]; }
  finish() {
    const mvp = this.mvp();
    this.result = { winner: this.winner, score: this.score.slice(), sets: this.sets.slice(), finalScore: this.lastSetScore || this.score.slice(), mvp: mvp.idx, longest: this.longest, rallies: this.rallies,
      players: this.players.map(p => ({ id: p.id, side: p.side, human: p.human, seat: p.seat, stats: Object.assign({}, p.stats) })), mode: this.mode };
    G.bus.emit('matchEnd', this.result);
    if (this.cfg.onEnd) this.cfg.onEnd(this.result, this);
  }
  /* ------------------------------------------------ the replay ------------------------------------------------ */
  record() {
    if (this.phase !== 'rally' && this.phase !== 'toss' && this.phase !== 'dead') { if (this.phase === 'serveSetup') this.replayBuf.length = 0; return; }
    this._rec = !this._rec; if (this._rec) return;   // 60 Hz
    this.replayBuf.push({ c: this.clock, b: this.ballPos, pl: this.players.map(p => ({ x: p.x, y: p.y, z: p.z, vx: p.vx, vy: p.vy, f: p.facing, act: p.act, dive: p.dive })) });
    if (this.replayBuf.length > 360) this.replayBuf.shift();
  }
  startReplay() {
    const buf = this.replayBuf; if (buf.length < 30) return this.startServe();
    const end = buf[buf.length - 1].c, start = end - 3.2, frames = buf.filter(f => f.c >= start);
    this.replay = { frames, i: 0, t: frames[0].c, end, ball: frames[0].b, cam: this.camMode === 'court' ? 'servecam' : 'court' };
    this.phase = 'replay'; this.phT = 0; this.say('replay');
  }
  replayStep(dt) {
    const R = this.replay; R.t += dt * .4;
    while (R.i < R.frames.length - 1 && R.frames[R.i + 1].c <= R.t) R.i++;
    const f = R.frames[R.i]; R.ball = f.b; this.aclock = f.c;
    this.players.forEach((p, k) => { const s = f.pl[k]; p.x = s.x; p.y = s.y; p.z = s.z; p.vx = s.vx; p.vy = s.vy; p.facing = s.f; p.act = s.act; p.animate(dt * .4); });
    this.comment.update(dt);
    const skip = this.players.some(p => p.isHuman && p.input && (p.input.pressed('play') || p.input.pressed('confirm')));
    if (R.t >= R.end || skip) { this.replay = null; this.startServe(); }
    this.camera();
  }
  /* ------------------------------------------------ presentation ------------------------------------------------ */
  setBanner(text, dur = 1.4, why) { this.banner = { text, dur, t: 0, why }; }
  popup(p, q) { this.popups.push({ p, q, t: 0 }); }
  say(kind, text, who = 'sonny') {
    if (this.spectacle && G.attract && G.attract.quiet) return;
    const L = text || (kind && G.SONNY.commentary[kind] ? G.rpick('cosmetic', G.SONNY.commentary[kind]) : null); if (!L) return;
    this.comment.say(L, who);
  }
  camera() {
    const g = G.game, C = G.COURT, mode = this.replay ? this.replay.cam : this.camMode;
    const humans = this.players.filter(p => p.human); const sideCam = humans.length && humans.every(p => p.side === humans[0].side) ? humans[0].side : 0;
    const view = mode === 'court' ? G.VIEW_COURT : G.VIEW_SERVE[sideCam];
    if (g.view.id !== view.id) g.setView(view);
    const b = this.ballPos || [C.NET_X, C.CY, 20];
    if (mode === 'court') {
      const pts = this.players.map(p => ({ x: p.x, y: p.y, z: p.z + 30 })).concat([{ x: b[0], y: b[1], z: b[2] }, { x: C.NET_X, y: C.Y0 - 30, z: 60 }, { x: C.X0 + 4, y: C.Y1 + 4, z: 0 }, { x: C.X1 - 4, y: C.Y1 + 4, z: 0 }]);
      g.cam.smooth = .22; g.cam.frame(pts, { margin: 10, zoom: [.74 * G.T.cameraZoomMul, .98 * G.T.cameraZoomMul] });
    } else { g.cam.frame(null); g.cam.smooth = .25; g.setZoom(.66 * G.T.cameraZoomMul); g.focus(lerp(C.NET_X, b[0], .25) + (sideCam ? 24 : -24), C.CY, 18); }
  }
  /** Pepper's tips in the welcome match */
  tutorialStep() {
    const T = this.tutorial, me = this.players.find(p => p.isHuman && p.input); if (!me) return;
    const tip = k => { if (T.shown[k]) return; T.shown[k] = true; G.tipCard(G.fillTips(G.PEPPER.tips[k], me.input), 6); };
    if (this.phase === 'rally' && me.plan) tip(me.plan.kind === 0 ? 'receive' : me.plan.kind === 1 ? 'set' : 'spike');
    if (this.phase === 'serveSetup' && this.server === me) tip('serve');
    if (this.phase === 'rally' && this.attackPlan && this.attackPlan.side !== me.side) tip(Math.abs(me.x - G.COURT.NET_X) < 50 ? 'block' : 'dive');
    if (this.score[0] + this.score[1] >= 3) tip('call'); if (this.score[0] + this.score[1] >= 5) tip('chem');
  }
  /* ------------------------------------------------ drawing ------------------------------------------------ */
  draw(r) {
    const C = G.COURT, map = G.courtMap(), night = this.tod === 'night';
    G.backdrop(this.tod, this.weather).draw(r);
    map.drawFloor(r);
    G.drawCourtSet(r, this, night);
    // the ball mark
    if (this.mark && (this.phase === 'dead' || this.phase === 'point')) r.shadow(this.mark.x, this.mark.y, 4, .3, '#8a6a3a');
    // timing rings and the mouse reticle
    const t = this.clock;
    for (const p of this.players) {
      const pl = p.plan; if (!pl || !p.isHuman || p.pressed || G.setting('ring') === false) continue;
      if (this.glare && this.glare.t >= 0 && !(p.rig.acc || []).some(a => G.ITEMS[a] && G.ITEMS[a].shades) && this.L && this.L.kind === 'serve') continue;
      const left = pl.t - t, w = G.windows(); if (left > .8 || left < -w.ok) continue;
      const rad = p.reach * .6 + Math.max(0, left / .8) * 16, gold = Math.abs(left) <= w.perfect * 1.5;
      r.groundRing(pl.P[0], pl.P[1], rad, gold ? '#ffd36a' : '#ffffff');
      r.groundRing(pl.P[0], pl.P[1], Math.max(2, rad - 2), p.color || (gold ? '#ff9e5e' : '#9fd3d6'));
      if (left < .35 && left > -.05) r.queue(p.x, p.y, p.z + 46 * p.rig.o.size / 1.25, g => { const [sx, sy] = r.w(p.x, p.y, p.z + 46 * p.rig.o.size / 1.25); px.rect(g, Math.round(sx) - 1, Math.round(sy) - 8, 3, 6, '#ffd36a'); px.rect(g, Math.round(sx) - 1, Math.round(sy), 3, 2, '#ffd36a'); }, { bias: 40 });
    }
    const mp = this.players.find(p => p.idx === this.mouseOwner);
    if (mp && mp.isHuman && G.mouseAim && G.game.input.mouse && G.game.input.clock - (G.game.input.mouse.t || -99) < 4 && (this.phase === 'rally' || this.phase === 'toss' || this.phase === 'serveSetup')) {
      const mg = G.game.mouseGround && G.game.mouseGround();
      if (mg && (mp.side === 0 ? mg[0] > C.NET_X : mg[0] < C.NET_X)) { r.groundRing(mg[0], mg[1], 6, '#ff5f7a'); r.groundRing(mg[0], mg[1], 2, '#ff5f7a'); }
    }
    if (this.phase === 'toss' || this.phase === 'serveSetup') { const sv = this.server; if (sv && sv.isHuman && this.phase === 'toss') { const a = sv.aimPoint('serve'); r.groundRing(a[0], a[1], 5, '#ffd36a'); } }
    // players
    for (const p of this.players) {
      r.shadow(p.x, p.y, 7 - Math.min(3, p.z * .1), .35);
      r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, r.view), { key: p });
      if (p.human && p.color && (this.players.filter(q => q.human).length > 1 || G.inHub())) { r.groundRing(p.x, p.y, 8, p.color); r.textAt(p.x, p.y, p.z + 56 * p.rig.o.size / 1.25, p.name, p.color); }
      if (p.callT > 0 && p.callText) G.bubble(r, p.x, p.y, p.z + 50 * p.rig.o.size / 1.25, p.callText, p.call === 'yours' ? '#9fd3d6' : '#ffd36a');
    }
    // the ball and its shadow
    const b = this.ballPos;
    if (b) {
      r.shadow(b[0], b[1], 4 - Math.min(2, b[2] * .03), .45);
      const spin = Math.floor((this.aclock * (this.L ? 14 : 2))) % 3;
      r.sprite(b[0], b[1], b[2] - 4, G.BALL_SPR[spin], { anchor: 'center' });
      if (this.glare && this.glare.t >= 0 && this.clock - this.glare.t < .7) { const sv = this.server; r.queue(sv.x, sv.y, sv.z + 40, g => { const [sx, sy] = r.w(sv.x, sv.y, sv.z + 42 * sv.rig.o.size / 1.25); px.blend(g, .8, 'add', () => { px.rect(g, Math.round(sx) - 6, Math.round(sy), 13, 1, '#fff3c0'); px.rect(g, Math.round(sx), Math.round(sy) - 6, 1, 13, '#fff3c0'); px.disc(g, sx, sy, 2, '#ffffff'); }); }, { bias: 60, emissive: true }); }
    }
    // judgement popups
    for (const q of this.popups) { const p = q.p, col = q.q === 'PERFECT' ? '#ffd36a' : q.q === 'GREAT' ? '#5ff0ff' : q.q === 'MISS' ? '#a0a0a8' : q.q === 'BLOCK!' ? '#ff5f7a' : '#ffffff'; r.textAt(p.x, p.y, p.z + 58 * p.rig.o.size / 1.25 + q.t * 14, q.q + (q.q === 'PERFECT' ? '!' : ''), col); }
    if (night) for (const [x, y] of [[180, 120], [524, 120], [180, 280], [524, 280]]) G.game.lights.add(x, y, 70, 200, .9, { color: '#fff4d8' });
    this.drawHud(r);
  }
  drawHud(r) {
    const C = G.COURT, me = this.players.find(p => p.isHuman && p.input), I = me ? me.input : G.game.input;
    r.overlay(g => {
      // the TV score bug
      const x0 = Math.round(r.W * .04), y0 = Math.round(r.H * .04);
      E.ui.box(g, x0, y0, 150, 38, { bg: ['#0a2d3d', '#061a24'], border: '#f6d38a', alpha: .92 });
      for (let s = 0; s < 2; s++) {
        const yy = y0 + 4 + s * 17, ps = this.players.filter(p => p.side === s);
        ps.forEach((p, k) => G.portrait(g, p.id, x0 + 4 + k * 15, yy, 14, { frame: false }));
        E.font.text(g, ps.map(p => p.name).join(' & ').slice(0, 18), x0 + 36, yy + 3, s === this.serveSide ? '#fff8e8' : '#9fd3d6', { shadow: '#000', outline: false });
        E.font.text(g, String(this.score[s]), x0 + 132, yy + 1, '#ffd36a', { scale: 2, shadow: '#000', outline: false, align: 'right' });
        if (s === this.serveSide) { px.disc(g, x0 + 140, yy + 7, 3, '#f8f8f4'); px.dot(g, x0 + 139, yy + 6, '#2a6ad8'); }
        if (this.setsToWin > 1) for (let k = 0; k < this.sets[s]; k++) px.rect(g, x0 + 30, yy + 2 + k * 4, 3, 3, '#ff9e5e');
      }
      if (this.matchPoint) { E.ui.box(g, x0, y0 + 40, 70, 12, { bg: '#c8202c', border: '#ffd36a' }); E.font.text(g, 'MATCH POINT', x0 + 5, y0 + 42, '#ffffff', { outline: false }); }
      // top right: the clock (vacation) or the hub's
      const cx = Math.round(r.W * .96) - (G.game.cornerArea() ? 40 : 0);
      if (G.state && this.mode !== 'exhibition' && this.mode !== 'attract') G.UI.clock(g, cx, y0, G.state.day, G.state.slot, G.state.weather[G.state.day - 1], 'right');
      else if (this.net && this.net.timeLeft) { const s = this.net.timeLeft(); if (s !== null) { const tx = Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); E.ui.box(g, cx - 44, y0, 44, 15, { bg: G.THEMES.day.bg, border: '#f6d38a' }); E.font.text(g, tx, cx - 22, y0 + 4, '#fff8e8', { align: 'center', outline: false }); } }
      // bottom left: the partner card
      if (this.partnerAff !== null && me) {
        const mate = this.players.find(p => p.side === me.side && p !== me);
        if (mate) { const by = Math.round(r.H * .96) - 30; E.ui.box(g, x0, by, 96, 30, { bg: G.THEMES.day.bg, border: '#f6d38a', alpha: .9 }); G.portrait(g, mate.id, x0 + 3, by + 3, 24, { frame: false }); E.font.text(g, mate.name, x0 + 31, by + 4, '#fff8e8', { shadow: '#000', outline: false }); G.UI.hearts(g, x0 + 31, by + 15, this.partnerAff); }
      }
      // the call banner
      if (this.banner) { const B = this.banner, k = Math.min(1, B.t * 6), w = E.font.width(B.text, { scale: 3 }) + 20, y = Math.round(r.H * .3);
        px.blend(g, .75 * k, 'normal', () => px.rect(g, 0, y - 6, r.W, 34, '#081820'));
        E.font.title(g, B.text, r.W / 2, y, { scale: 3, colors: B.why === 'ace' || B.why === 'kill' || B.why === 'block' ? ['#fff7d6', '#ffd36a', '#ff9e5e'] : ['#ffffff', '#c8e8f0', '#7ab0c8'], align: 'center', depth: 2 }); }
      if (this.phase === 'intro') { E.font.title(g, this.cfg.title || 'BEACH MATCH', r.W / 2, Math.round(r.H * .22), { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 }); if (this.cfg.subtitle) E.font.text(g, this.cfg.subtitle, r.W / 2, Math.round(r.H * .22) + 22, '#fff8e8', { align: 'center', shadow: '#000', outline: false }); }
      if (this.replay) { px.rect(g, 0, 0, r.W, 18, '#000000'); px.rect(g, 0, r.H - 18, r.W, 18, '#000000'); E.font.text(g, 'REPLAY', 10, 5, '#ff5f7a', { scale: 1, outline: false }); px.disc(g, 50, 9, 3, Math.floor(G.game.real * 2) % 2 ? '#ff2a2a' : '#5a0a0a'); }
    });
    this.comment.draw(r);
    // context prompts (at most three)
    if (me && !this.replay && this.phase !== 'end') {
      let list = [];
      if (this.phase === 'serveSetup' && this.server === me) list = [['play', 'Float serve'], ['shot', 'Jump serve']];
      else if (this.phase === 'toss' && this.server === me) list = [['play', 'Hit at the top!']];
      else if (this.phase === 'rally') {
        const pl = me.plan;
        if (pl) list = [['play', ['Bump', 'Set', 'Spike'][pl.kind]], ['shot', ['Free ball', 'Dump', 'Shot'][pl.kind]], ['dive', 'Dive']];
        else if (this.attackPlan && this.attackPlan.side !== me.side) list = [['shot', 'Block'], ['dive', 'Dive'], ['call', 'Call']];
        else list = [['call', me.call === 'auto' ? 'Call' : me.call === 'mine' ? 'Mine' : 'Yours'], ['dive', 'Dive']];
      } else if (this.phase === 'intro') list = [['play', 'Skip']];
      if (list.length) G.promptBar(r, list, I);
    }
  }
};
/** the court's set dressing: bleachers with a crowd, the DJ booth, the scorer's table and flip scoreboard, umbrellas, the
 *  tiki bar, the lifeguard tower; at night torches and floodlights; the net */
G.drawCourtSet = (r, M, night) => {
  const C = G.COURT, t = G.game.real;
  r.shape('bleacher', 300, 96, 0, { facing: Math.PI / 2 }); r.shape('bleacher', 404, 96, 0, { facing: Math.PI / 2 });
  r.shape('djbooth', 470, 104, 0, { facing: Math.PI / 2 }); r.shape('scoreboard', 352, 108, 0, { facing: Math.PI / 2 });
  r.shape('umbrella', 196, 104, 0, { mats: { a: 'aoa_canvasT' } }); r.shape('lounger', 186, 120, 0, { facing: Math.PI / 2 });
  r.shape('umbrella', 532, 100, 0, { mats: { a: 'aoa_canvasY' } }); r.shape('lounger', 544, 116, 0, { facing: Math.PI / 2 });
  r.shape('tikibar', 104, 168, 0, { facing: 0 }); r.shape('lifeguard', 610, 170, 0, { facing: Math.PI });
  r.shape('surfrack', 640, 230, 0, { facing: Math.PI }); r.shape('changinghut', 90, 250, 0, { facing: 0 });
  r.shape('beachtowel', 300, 300, 0); r.shape('cooler', 324, 298, 0); r.shape('sandcastle', 420, 306, 0); r.shape('beachtowel', 458, 300, 0, { mats: { t: 'aoa_canvasB' } });
  r.prop('palm', 40, 110, 0, { size: 1.6 }); r.prop('palm', 664, 100, 0, { size: 1.7 }); r.prop('palm', 30, 330, 0, { size: 1.5 }); r.prop('palm', 676, 330, 0, { size: 1.6 });
  if (M && M.cfg && M.cfg.final) { r.shape('banner', 250, 116, 0, { facing: Math.PI / 2 }); r.shape('banner', 454, 116, 0, { facing: Math.PI / 2 }); }
  if (night) { for (const [x, y] of [[190, 140], [514, 140], [190, 270], [514, 270]]) r.shape('torchpost', x, y, 0, { light: true }); r.shape('floodlight', 160, 112, 0, { light: true }); r.shape('floodlight', 548, 112, 0, { light: true }); }
  // the crowd on the bleachers: they sway, jump on points and slump on errors
  if (M) for (const f of M.crowd) {
    const up = M.cheer > 0 ? Math.abs(Math.sin(t * 10 + f.ph)) * 5 * Math.min(1, M.cheer) : M.groan > 0 ? -1 : Math.sin(t * 2 + f.ph) * .6;
    r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 6, 5, 6, f.shirt); px.rect(g, X - 1, Y - 9, 3, 3, f.skin); if (M.cheer > .3) { px.rect(g, X - 3, Y - 11, 1, 3, f.skin); px.rect(g, X + 3, Y - 11, 1, 3, f.skin); } });
  }
  // Sonny at his booth, Pepper at the scorer's table (when they aren't playing)
  if (M && !M.players.some(p => p.id === 'sonny')) { const sr = G.hostRig('sonny'); sr.update(1 / 60, { x: 470, y: 112, z: 0, facing: Math.PI / 2, pose: M.cheer > .5 ? 'cheer' : null, expr: M.cheer > .5 ? 'shout' : 'smile' }); r.actor(470, 112, 0, (g, ox, oy) => sr.draw(g, ox, oy, r.view), { every: 2, key: sr }); }
  if (M && !M.players.some(p => p.id === 'pepper')) { const pr = G.hostRig('pepper'); pr.update(1 / 60, { x: 384, y: 114, z: 0, facing: Math.PI / 2 }); r.actor(384, 114, 0, (g, ox, oy) => pr.draw(g, ox, oy, r.view), { every: 2, key: pr }); }
  G.drawNet(r);
};
G.hostRigs = {};
G.hostRig = id => G.hostRigs[id] || (G.hostRigs[id] = G.anim.rig(G.makeRig(id)));
G.drawNet = r => {
  const C = G.COURT, y0 = C.Y0 - 10, y1 = C.Y1 + 10, segs = 8;
  r.shape('netpost', C.NET_X, y0, 0); r.shape('netpost', C.NET_X, y1, 0);
  for (let k = 0; k < segs; k++) {
    const ya = C.Y0 - 10 + (y1 - y0) * k / segs, yb = C.Y0 - 10 + (y1 - y0) * (k + 1) / segs, ym = (ya + yb) / 2;
    r.queue(C.NET_X, ym, 0, g => {
      const a0 = r.w(C.NET_X, ya, 28), a1 = r.w(C.NET_X, yb, 28), b0 = r.w(C.NET_X, ya, C.NET_H), b1 = r.w(C.NET_X, yb, C.NET_H);
      px.blend(g, .45, 'normal', () => px.poly(g, [a0, a1, b1, b0], '#1a2030'));
      for (let m = 0; m <= 4; m++) { const u = m / 4, p0 = [lerp(a0[0], a1[0], u), lerp(a0[1], a1[1], u)], p1 = [lerp(b0[0], b1[0], u), lerp(b0[1], b1[1], u)]; px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a3040'); }
      for (let m = 0; m <= 3; m++) { const u = m / 3, p0 = [lerp(a0[0], b0[0], u), lerp(a0[1], b0[1], u)], p1 = [lerp(a1[0], b1[0], u), lerp(a1[1], b1[1], u)]; px.line(g, p0[0], p0[1], p1[0], p1[1], '#2a3040'); }
      px.line(g, b0[0], b0[1], b1[0], b1[1], '#f4f4f0', 2); px.line(g, a0[0], a0[1], a1[0], a1[1], '#f4f4f0', 1);
      if (k === 1 || k === segs - 2) { const yA = k === 1 ? C.Y0 : C.Y1, q0 = r.w(C.NET_X, yA, C.NET_H), q1 = r.w(C.NET_X, yA, 62); px.line(g, q0[0], q0[1], q1[0], q1[1], '#ff3a3a', 1); px.dot(g, q1[0], q1[1] + 2, '#ffffff'); }
    }, { solid: true });
  }
};
/** Sonny's commentary: a small box bottom right with his portrait, typed with his voice, gone after a few seconds */
G.Commentary = class {
  constructor(on) { this.on = on; this.cur = null; this.q = []; }
  say(text, who = 'sonny') { if (!this.on) return; if (this.cur && this.cur.text === text) return; this.q.push({ text, who }); if (this.q.length > 2) this.q.shift(); }
  update(dt) {
    if (!this.cur && this.q.length) { this.cur = Object.assign(this.q.shift(), { t: 0, shown: 0, hook: null }); this.cur.hook = G.voice.hook(this.cur.who); }
    const c = this.cur; if (!c) return;
    const prev = Math.floor(c.shown); c.shown = Math.min(c.text.length, c.shown + dt * G.T.textSpeed * 1.3); c.t += dt;
    for (let n = prev; n < Math.floor(c.shown); n++) c.hook(c.text[n], n, c.text);
    if (c.shown >= c.text.length && c.t > c.text.length / (G.T.textSpeed * 1.3) + 2.2) this.cur = null;
  }
  draw(r) {
    const c = this.cur; if (!c) return;
    r.overlay(g => {
      const w = Math.min(200, Math.round(r.W * .46)), lines = E.font.wrap(c.text.slice(0, Math.floor(c.shown)), w - 40), h = 34, x = Math.round(r.W * .96) - w, y = Math.round(r.H * .96) - h - 18;
      E.ui.box(g, x, y, w, h, { bg: ['#2a1240', '#12081e'], border: '#ffd36a', alpha: .92 });
      G.portrait(g, c.who, x + 4, y + 4, 26, { frame: false });
      E.font.text(g, G.CAST[c.who].short.toUpperCase(), x + 34, y + 3, G.CAST[c.who].color || '#ffd36a', { outline: false });
      lines.slice(0, 2).forEach((l, k) => E.font.text(g, l, x + 34, y + 12 + k * 9, '#fff8e8', { outline: false, shadow: '#000' }));
    });
  }
};
/** Pepper's tutorial cards: a non-modal panel at the left */
G.tips = [];
G.tipCard = (text, sec = 6) => { G.tips = [{ text, t: 0, sec }]; };
G.drawTips = r => {
  const tp = G.tips[0]; if (!tp) return; tp.t += 1 / 60; if (tp.t > tp.sec) { G.tips.shift(); return; }
  r.overlay(g => {
    const w = Math.min(190, Math.round(r.W * .45)), lines = E.font.wrap(tp.text, w - 36), h = 16 + lines.length * 9, x = Math.round(r.W * .04), y = Math.round(r.H * .2);
    E.ui.box(g, x, y, w, h, { bg: G.THEMES.day.bg, border: '#ff9e5e', alpha: .94 });
    G.portrait(g, 'pepper', x + 4, y + 4, 24, { frame: false });
    E.font.text(g, 'PEPPER\'S TIP', x + 32, y + 3, '#ff9e5e', { outline: false });
    lines.forEach((l, k) => E.font.text(g, l, x + 32, y + 12 + k * 9, '#fff8e8', { outline: false, shadow: '#000' }));
  });
};

// ==== 25-netplay.js ====
/* 25-netplay: AI Hub sessions (Protocol v1, shared world). The page opens straight into the hub scene: connect, draw the
 * game's own card (the court at sunset, the fighters lined up, the goal, this player's controls in her glyphs, every
 * player in her colour with a READY tick, the countdown), call ready() at once, and on start play one match to 7.
 * The host runs the rules and the AI; every copy flies the ball from the same launches on the hub clock; each client
 * moves its own fighter and judges its own touches, which the host validates (time within the window, the fighter in
 * reach, the touch still open) before it broadcasts the new launch. Empty seats and leavers are CPUs. Only the host
 * finishes. Messages: m (client fighter, 12/s), c (a touch or block claim), vt / v (a serve's toss and hit), s (the host's
 * snapshot, 12/s), b (a launch), e (events). */
G.SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
G.Net = class {
  constructor(info) {
    const H = window.AIHub; this.H = H; this.info = info; this.me = info.me; this.host = !!info.isHost; this.server = !!info.server; this.client = !this.host;
    this.players = info.players || []; this.sendT = 0; this.snapT = 0; this.over = false; this.ended = false; this.reason = null; this.msgs = 0; this.limit = info.limitMs || 0;
    this.peers = {}; this.left = new Set();
  }
  clock() { const t = this.H.time(); return isFinite(t) ? t / 1000 : -10; }
  timeLeft() { if (!this.limit) return null; const t = this.H.time(); return isFinite(t) ? Math.max(0, (this.limit - t) / 1000) : null; }
  send(d, o) { if (this.ended) return; try { this.H.send(d, o); } catch (e) { /* closed */ } }
  /* ---- the host ---- */
  launch(L) { if (!this.host) return; const M = this.M, pl = M.players.find(p => p.plan); this.send({ t: 'b', t0: +L.t0.toFixed(4), p: L.p.map(v => +v.toFixed(2)), v: L.v.map(v => +v.toFixed(2)), k: L.k, g: L.g, ay: L.ay, wob: L.wob, by: L.by, kind: L.kind, side: L.side, nd: L.netDone ? 1 : 0,
    pi: pl ? pl.idx : -1, pt: pl ? +pl.plan.t.toFixed(4) : 0, pk: pl ? pl.plan.kind : 0, px: pl ? pl.plan.P.map(v => Math.round(v)) : null, ap: M.attackPlan ? M.attackPlan.side : -1 }, { reliable: true }); }
  event(e) { if (this.host) this.send(Object.assign({ t: 'e' }, e), { reliable: true }); }
  hostStep(dt) {
    const M = this.M; this.snapT += dt;
    if (this.snapT >= 1 / 12) { this.snapT = 0; this.send({ t: 's', at: Math.round(M.clock * 1000), p: M.players.map(p => [p.idx, Math.round(p.x), Math.round(p.y), +p.facing.toFixed(2), p.act ? p.act.kind : 0, p.act ? +((M.clock - p.act.t0) / p.act.dur).toFixed(2) : 0, Math.round(p.z)]), sc: M.score, st: M.sets, ph: M.phase, sv: M.serveSide, srv: M.server ? M.server.idx : -1 }, { reliable: false }); }
  }
  /* ---- a client ---- */
  clientStep(dt) {
    const M = this.M, t = M.clock, me = M.players.find(p => p.seat === this.me);
    this.sendT += dt;
    if (me && this.sendT >= 1 / 12) { this.sendT = 0; this.send({ t: 'm', at: Math.round(t * 1000), x: Math.round(me.x), y: Math.round(me.y), f: +me.facing.toFixed(2), a: me.act ? me.act.kind : 0 }, { reliable: false }); }
    if (!me || this.ended) return;
    const I = me.input;
    if (M.phase === 'serveSetup' && M.server === me && !this.tossSent) { if (I.pressed('play')) { this.send({ t: 'vt', jump: 0 }); this.tossSent = true; } else if (I.pressed('shot')) { this.send({ t: 'vt', jump: 1 }); this.tossSent = true; } }
    if (M.phase === 'toss' && M.server === me && M.L && !this.hitSent && (I.pressed('play') || I.pressed('shot'))) { const apex = M.L.t0 + G.Ball.apexTau(M.L), q = G.judge(t - apex); this.hitSent = true; M.popup(me, q); this.send({ t: 'v', at: +t.toFixed(4), q: q === 'MISS' ? 'STRETCH' : q, aim: me.aimPoint('serve').map(Math.round) }); }
    if (M.phase === 'rally') {
      if (I.pressed('call')) me.cycleCall();
      if (I.pressed('dive')) me.startDive();
      const sh = I.pressed('shot'), pl2 = I.pressed('play'), pl = me.plan;
      if (sh && M.attackPlan && M.attackPlan.side !== me.side && Math.abs(me.x - G.COURT.NET_X) < 22 && !me.jump) { me.startJump(t, 'block', G.T.blockRise, .18, .3); me.setAct('block', .7); this.send({ t: 'c', block: 1, at: +t.toFixed(4) }); }
      else if (pl && (sh || pl2) && !me.pressed && t - pl.t >= -.6) {
        const w = G.windows(), err = t - pl.t; me.pressed = true;
        if (err <= w.ok) { let q = G.judge(err, w); if (q === 'MISS') M.whiff(me); else { const b = G.Ball.at(M.L, t), d = Math.hypot(b[0] - me.x, b[1] - me.y); if (d > me.reach + 8) M.whiff(me); else { if (d > me.reach) q = G.lower(q); M.popup(me, q); me.setAct(['bump', 'set', 'spike'][pl.kind] || 'bump', .5); this.send({ t: 'c', at: +t.toFixed(4), k: pl.kind, q, aim: me.aimPoint('spike').map(Math.round), sh: sh ? 1 : 0 }, { reliable: true }); } } }
      }
      if (pl && t > pl.t + .5) me.plan = null;
    }
  }
  onMessage(d, from) {
    const M = this.M; if (!M || this.ended) return;
    if (this.host) {
      const p = M.players.find(q => q.seat === from); if (!p || !p.remote) return;
      if (d.t === 'm') { const sp = p.speed * 1.4, dt = Math.max(.05, (d.at / 1000) - (p.lastAt || d.at / 1000 - .1)); const dx = d.x - p.x, dy = d.y - p.y, l = Math.hypot(dx, dy), k = l > sp * dt * 3 ? sp * dt * 3 / l : 1; p.netX = clamp(p.x + dx * k, 40, G.COURT.W - 40); p.netY = clamp(p.y + dy * k, 70, G.COURT.H - 30); p.netF = d.f; p.lastAt = d.at / 1000; }
      else if (d.t === 'c') p.claim = d;
      else if (d.t === 'vt' && M.phase === 'serveSetup' && M.server === p) M.toss(d.jump ? 'jump' : 'float');
      else if (d.t === 'v' && M.phase === 'toss' && M.server === p && !M.tossHit) { M.tossHit = true; M.serveHit(d.q || 'OK', d.aim); }
      return;
    }
    if (from !== this.info.host) return;
    if (d.t === 'b') {
      const L = G.Ball.make(d.t0, d.p, d.v, { k: d.k, g: d.g, ay: d.ay, wob: d.wob, by: d.by, kind: d.kind, side: d.side }); if (d.nd) { L.netDone = true; L.tNet = null; }
      M.L = L; for (const p of M.players) { if (p.seat !== this.me) p.plan = null; }
      const me = M.players.find(p => p.seat === this.me); if (me) { me.plan = null; me.pressed = false; }
      if (d.pi >= 0) { const p = M.players[d.pi]; if (p && p.seat === this.me) { p.plan = { t: d.pt, P: d.px || [L.land[0], L.land[1]], kind: d.pk, h: 18 }; p.pressed = false; if (d.pk === 2) p.startJump(d.pt - p.rise, 'spike'); } }
      M.attackPlan = d.ap >= 0 ? { side: d.ap, p: M.players[d.pi] || M.players[0], t: d.pt } : null;
      if (d.kind === 'toss') { M.phase = 'toss'; this.hitSent = false; } else if (M.phase === 'toss' || M.phase === 'serveSetup') M.phase = 'rally';
      if (d.kind === 'spike') G.sfx('spike'); else if (d.kind === 'set') G.sfx('set'); else if (d.kind === 'pass' || d.kind === 'free') G.sfx('bump'); else if (d.kind === 'serve') G.sfx('serveHit');
    } else if (d.t === 's') {
      for (const [i, x, y, f, a, u, z] of d.p) { const p = M.players[i]; if (!p || p.seat === this.me) continue; p.netX = x; p.netY = y; p.netF = f; p.netZ = z; if (a && (!p.act || p.act.kind !== a)) p.act = { kind: a, t0: M.clock - u * .5, dur: .5 }; }
      M.score = d.sc; M.sets = d.st || M.sets; if (d.ph && d.ph !== 'toss' && d.ph !== 'rally') M.phase = d.ph; M.serveSide = d.sv; if (d.srv >= 0) M.server = M.players[d.srv];
    } else if (d.t === 'e') {
      if (d.ev === 'serve') { M.phase = 'serveSetup'; M.L = null; M.server = M.players[d.server]; this.tossSent = false; this.hitSent = false; for (const p of M.players) p.plan = null; }
      else if (d.ev === 'point') { M.score = d.sc; M.sets = d.sets || M.sets; M.phase = 'dead'; M.phT = 0; M.setBanner(G.Rules.CALLS[d.why] || 'POINT', 1.6, d.why); G.sfx('whistle'); G.sfx('crowdCheer'); M.lastWinner = d.side; M.cheer = 1.2; M.L = null; }
      else if (d.ev === 'over') { M.over = true; M.winner = d.side; M.phase = 'end'; }
    }
  }
  /** host: the round is over (the match ended, or time-up): standings by team, CPUs left out */
  finish(why) {
    if (!this.host || this.over) return; this.over = true;
    const M = this.M, ids = s => M.players.filter(p => p.side === s && p.seatHuman && !this.left.has(p.seat)).map(p => p.seat);
    let w = M.winner; if (w === undefined || w === null || !M.over) w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    const humans = M.players.filter(p => p.seatHuman && !this.left.has(p.seat));
    const scores = {}, stats = {}; for (const p of humans) { scores[p.seat] = M.score[p.side] + M.sets[p.side] * 100; stats[p.seat] = { Points: p.stats.points, Kills: p.stats.kills, Aces: p.stats.aces }; }
    const mvp = humans.slice().sort((a, b) => (b.stats.points * 2 + b.stats.kills) - (a.stats.points * 2 + a.stats.kills))[0];
    const res = { scores, stats, awards: mvp ? [{ id: mvp.seat, title: 'MVP', detail: mvp.stats.points + ' points, ' + mvp.stats.kills + ' kills' }] : [] };
    if (humans.length === 1) { res.standings = [[humans[0].seat]]; res.won = w === humans[0].side; }
    else if (w < 0) res.standings = [humans.map(p => p.seat)];
    else res.standings = [ids(w), ids(1 - w)].filter(a => a.length);
    this.event({ ev: 'over', side: w });
    try { this.H.finish(res); } catch (e) { G.game.fail('hub finish', e); }
  }
};
/* ---- the hub scene: connect, the card, the match, the end ---- */
G.SCENES.hub = {
  view: 'court', input: G.INPUT.MATCH,
  enter() {
    this.state = 'connecting'; this.t = 0; this.card = null; this.cast = null; G.muteAll = false; G.UI.theme = 'day';
    const H = window.AIHub; if (!H) { G.go('title'); return; }
    H.on('card', c => { this.card = c; });
    H.on('start', () => { this.startMatch(); });
    H.on('message', (d, from) => { if (this.net) this.net.onMessage(d, from); });
    H.on('leave', ({ id }) => { if (!this.net) return; this.net.left.add(id); const M = this.net.M; if (M) for (const p of M.players) if (p.seat === id) { p.remote = false; p.human = false; p.viewOnly = false; p.seatHuman = false; } });
    H.on('time-up', () => { if (this.net) { if (this.net.host) this.net.finish('time-up'); } });
    H.on('end', e => { this.endInfo = e; if (this.net) this.net.ended = true; this.state = 'ended'; G.music(null); G.game.audio.stopMusic(); G.muteAll = true; try { const A = G.game.audio; if (A.ctx) A.mute(true); } catch (er) { /* none */ } });
    H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.go('title'); return; }
      this.info = info; this.net = new G.Net(info); this.build(); this.state = 'card'; H.ready();
    }).catch(e => { G.game.fail('hub connect', e); G.go('title'); });
  },
  build() {
    const H = window.AIHub, info = this.info, n = (info.players || []).length, rc = H.rng('cast'), rt = H.rng('court');
    const cast = G.FIGHTERS.slice(); for (let i = cast.length - 1; i > 0; i--) { const j = Math.floor(rc() * (i + 1)); [cast[i], cast[j]] = [cast[j], cast[i]]; }
    this.tod = ['afternoon', 'sunset', 'morning'][Math.floor(rt() * 3)];
    // left = seats 0 and 2, right = 1 and 3
    const seatOf = [[0, 2], [1, 3]], teams = [[], []];
    for (let s = 0; s < 2; s++) for (let k = 0; k < 2; k++) {
      const seat = seatOf[s][k], pl = (info.players || []).find(p => p.id === seat), id = cast[seat], local = pl && seat === info.me && !info.server;
      teams[s].push({ id, suit: G.CAST[id].suit, acc: G.CAST[id].acc, input: local ? G.game.input : null, human: !!pl, base: .5, seat: pl ? seat : null, color: pl ? G.SEAT_COLORS[seat] : null, name: pl ? String(pl.name).slice(0, 12) : G.CAST[id].short + ' (CPU)' });
    }
    this.cfg = { mode: 'hub', teams, pointsToWin: 7, tod: this.tod, weather: 'sunny', difficulty: 'Normal', replays: false, title: 'AHEAD OR ALIVE', subtitle: 'First to 7, win by 2', skipIntro: true, after: () => { if (this.net.host) this.net.finish('over'); } };
    this.lineup = teams.flat().map((t, k) => ({ id: t.id, x: 300 + k * 34, y: 300, rig: G.anim.rig(G.makeRig(t.id)), t }));
  },
  startMatch() {
    if (!this.cfg || this.M) return;
    this.state = 'play'; const net = this.net, M = this.M = G.M = new G.Match(this.cfg); net.M = M; M.net = net;
    for (const p of M.players) { p.seatHuman = p.seat !== null && p.seat !== undefined && p.human; p.remote = net.host && p.seatHuman && (p.seat !== this.info.me || this.info.server); p.viewOnly = net.client && p.seat !== this.info.me; if (p.remote || p.viewOnly) { p.human = p.seatHuman; p.input = null; } }
    M.introT = 0; M.phase = 'intro'; G.music('spike'); G.applyLight(this.tod);
  },
  update(dt) {
    this.t += dt; const H = window.AIHub, I = G.game.input;
    if (this.state === 'card') {
      for (const c of this.lineup || []) { c.rig.vb = { kind: 'ready', u: 0, w: .8 }; c.rig.update(dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 }); }
      G.game.focus(352, 290, 30); G.game.setZoom(1.2);
      if (!this.info.server) {
        const c = I.clicked(), W = G.game.W, Hh = G.game.H, by = Math.round(Hh * .82);
        const onReady = c && c[1] > by && c[1] < by + 20 && c[0] < W / 2, onMore = c && c[1] > by && c[1] < by + 20 && c[0] >= W / 2;
        if (I.pressed('confirm') || I.pressed('start') || I.pressed('play') && false || onReady) H.answer('ready');
        if (I.pressed('call') || onMore || this.keyT) { this.keyT = false; H.answer('more'); }
      }
      return;
    }
    if (this.state === 'play' && this.M) {
      const M = this.M; G.game.setZoom(1);
      if (M.phase === 'intro' && this.net.clock() >= 0 && this.net.host) { M.phase = 'coin'; M.phT = 0; M.setBanner('PLAY!', 1); G.sfx('whistle'); }
      for (const p of M.players) if (p.remote || p.viewOnly) { if (p.netX !== undefined) { p.x += (p.netX - p.x) * Math.min(1, dt * 10); p.y += (p.netY - p.y) * Math.min(1, dt * 10); p.facing = p.netF; } }
      if (!this.net.ended) M.update(dt);
      if (this.net.host) this.net.hostStep(dt);
      if (M.phase === 'end' && !M.left && M.phT > 2.5) { M.left = true; if (M.cfg.after) M.cfg.after(M.result, M); }
    }
  },
  draw(r) {
    const W = r.W, H = r.H, I = G.game.input;
    if (this.state === 'connecting') { G.backdrop('sunset').draw(r); r.overlay(g => { G.drawLogo(g, W, Math.round(H * .2)); E.font.text(g, 'Connecting to the AI Hub...', W / 2, Math.round(H * .6), '#fff8e8', { align: 'center', outline: false }); }); return; }
    if (this.state === 'card') {
      G.backdrop(this.tod || 'sunset').draw(r); G.courtMap().drawFloor(r); G.drawCourtSet(r, null, false);
      for (const c of this.lineup) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); r.textAt(c.x, c.y, 50, c.t.human ? c.t.name : 'CPU', c.t.color || '#9fd3d6'); }
      r.overlay(g => {
        G.drawLogo(g, W, Math.round(H * .04), true);
        E.font.text(g, 'Win the beach volleyball match: first to 7, by 2', W / 2, Math.round(H * .26), '#ffd36a', { align: 'center', shadow: '#000', outline: false });
        if (this.info.server) { E.font.text(g, 'Hosting', W / 2, Math.round(H * .5), '#fff8e8', { align: 'center', scale: 2, outline: false }); return; }
        const list = [['play', 'Hit on time'], ['shot', 'Shot / block'], ['dive', 'Dive'], ['call', 'Call']]; let tw = 0; for (const [a, t] of list) tw += G.promptW(a, t, I); let x = Math.round(W / 2 - tw / 2); const y = Math.round(H * .32);
        px.blend(g, .6, 'normal', () => px.rect(g, x - 6, y - 3, tw + 8, 15, '#061a24')); for (const [a, t] of list) x += G.prompt(g, x, y, a, t, I);
        const pls = this.info.players || [], ready = (this.card && this.card.ready) || [];
        pls.forEach((p, k) => { const yy = Math.round(H * .42) + k * 12; px.rect(g, Math.round(W / 2) - 70, yy, 8, 8, G.SEAT_COLORS[p.id] || '#ffffff'); E.font.text(g, String(p.name).slice(0, 16), Math.round(W / 2) - 58, yy, G.SEAT_COLORS[p.id] || '#ffffff', { outline: false, shadow: '#000' }); if (ready.includes(p.id)) E.font.text(g, '✓ READY', Math.round(W / 2) + 40, yy, '#7cff5a', { outline: false }); });
        const c = this.card, left = c && c.left !== null && c.left !== undefined ? Math.ceil(c.left / 1000) : null;
        E.font.text(g, c && c.paused ? 'Paused: more time' : c && c.starting ? 'Starting...' : left !== null ? 'Starts in ' + left + ' s' : '', W / 2, Math.round(H * .74), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
        const by = Math.round(H * .82); G.UI.button(g, { x: Math.round(W / 2) - 110, y: by, w: 100, h: 18, label: 'READY' }, true); G.UI.button(g, { x: Math.round(W / 2) + 10, y: by, w: 100, h: 18, label: c && c.asked ? 'MORE TIME ✓' : 'MORE TIME' }, false);
        G.drawGlyph(g, Math.round(W / 2) - 106, by + 4, G.codeFor('confirm', I), I); G.drawGlyph(g, Math.round(W / 2) + 14, by + 4, G.codeFor('call', I), I);
      });
      return;
    }
    if (this.M) {
      if (this.info && this.info.server) { G.backdrop('sunset').draw(r); r.overlay(g => { E.font.text(g, 'Hosting • ' + this.M.score.join(' - '), W / 2, H / 2, '#fff8e8', { align: 'center', scale: 2, outline: false }); }); }
      else this.M.draw(r);
      const tm = this.net.clock(); if (tm < 0 && tm > -4) r.overlay(g => E.font.title(g, String(Math.ceil(-tm)), W / 2, Math.round(H * .35), { scale: 4, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] }));
    }
    if (this.state === 'ended') {
      const e = this.endInfo || {}, M = this.M;
      r.overlay(g => { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#061a24')); E.font.title(g, e.reason === 'host-left' ? 'ROUND CANCELLED' : 'FULL TIME', W / 2, Math.round(H * .25), { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] });
        if (M) E.font.text(g, 'LEFT ' + M.score[0] + ' - ' + M.score[1] + ' RIGHT', W / 2, Math.round(H * .4), '#fff8e8', { align: 'center', scale: 2, outline: false });
        const st = e.standings || []; st.forEach((grp, k) => E.font.text(g, (k + 1) + '. ' + grp.map(id => { const p = (this.info.players || []).find(q => q.id === id); return p ? String(p.name).slice(0, 12) : '?'; }).join(', '), W / 2, Math.round(H * .52) + k * 12, '#ffd36a', { align: 'center', outline: false })); });
    }
  }
};

// ==== 30-vacation.js ====
/* 30-vacation: the vacation's state and its rules: the calendar (5 days x Morning, Afternoon, Night), weather, moods,
 * NPC teams and schedules, affinity, gifts, team-ups and break-ups, money, prizes, story triggers, saves. */
G.DAYS = 5;
G.WEATHER_TABLE = [null, ['sunny', 'sunny', 'clear'], ['sunny', 'cloudy', 'clear'], ['cloudy', 'rain', 'clear'], ['sunny', 'sunny', 'clear'], ['sunny', 'golden', 'clear']];
G.DAY_BASE = [0, .40, .50, .58, .66, .70];
G.newState = (me, seed = 1) => {
  const S = { v: 1, seed, day: 1, slot: 0, weather: [], me, money: G.T.startMoney, chips: 0,
    wardrobe: { suits: [G.CAST[me].suit], acc: (G.CAST[me].acc || []).slice() }, wearing: { suit: G.CAST[me].suit, acc: (G.CAST[me].acc || []).slice() },
    npcWear: {}, bag: {}, affinity: {}, mood: {}, known: {}, partner: null, teams: [], solo: null, record: {}, where: {}, flags: {}, chatted: {}, gifted: {}, chatSlot: {},
    album: [], titlePostcard: null, letters: [], read: {}, deals: {}, events: {}, lostToday: false, earnedToday: 0, spentToday: 0, affStart: {}, playedToday: [], beatYesterday: {},
    stats: { matches: 0, wins: 0, points: 0, kills: 0, aces: 0, blocks: 0, poolBest: null, casinoNet: 0, gifts: 0, photos: 0, earned: 0, spent: 0, suitsOwned: 1 }, ngPlus: 0 };
  for (const id of G.FIGHTERS) if (id !== me) { S.affinity[id] = G.baseAff(me, id); S.npcWear[id] = { suit: G.CAST[id].suit, acc: (G.CAST[id].acc || []).slice() }; S.known[id] = {}; }
  for (let d = 1; d <= G.DAYS; d++) S.weather[d - 1] = G.WEATHER_TABLE[d][0];
  return S;
};
G.npcs = () => G.FIGHTERS.filter(id => id !== G.state.me);
G.weatherNow = (S = G.state) => { const w = (G.WEATHER_TABLE[S.day] || G.WEATHER_TABLE[1])[S.slot]; if (S.day === 2 && S.slot === 1) return S.d2cloud ? 'cloudy' : 'sunny'; return w === 'clear' ? 'sunny' : w; };
G.weatherMatch = () => { const w = G.weatherNow(); return w === 'golden' ? 'sunny' : w; };
G.todNow = (S = G.state) => S.slot === 2 ? 'night' : S.slot === 0 ? 'morning' : (G.weatherNow(S) === 'golden' ? 'sunset' : 'afternoon');
/* ---- the start of a day: moods, teams, places, deals, letters, autosave ---- */
G.dayStart = () => {
  const S = G.state; G.seed('world', S.seed * 31 + S.day * 977);
  if (S.day === 2) S.d2cloud = G.rng('world') < .4;
  for (const id of G.npcs()) {
    const r = G.rng('world'); let m = r < .35 ? 2 : r < .8 ? 1 : 0;
    const wt = G.WEATHER_TASTE[id], w = (G.WEATHER_TABLE[S.day] || [])[0];
    if (wt && wt.like.includes(w)) m++; if (wt && wt.dislike.includes(w)) m--; if (S.beatYesterday[id]) m--;
    S.mood[id] = ['gloomy', 'normal', 'happy'][clamp(m, 0, 2)];
  }
  S.beatYesterday = {}; S.chatted = {}; S.lostToday = false; S.earnedToday = 0; S.spentToday = 0; S.playedToday = []; S.affStart = Object.assign({}, S.affinity);
  G.formTeams();
  // deals: two items a shop at -25%
  S.deals = {}; for (const sh of Object.keys(G.SHOPS)) { const st = G.shopStock(sh, S.day).filter(i => i.price > 0); S.deals[sh] = G.rshuffle('world', st).slice(0, 2).map(i => i.id); }
  // letters
  const L = ({ 1: ['pepper_welcome'], 2: ['sonny_flyer'], 3: ['friend_note'], 4: ['pepper_warning'], 5: ['sonny_hype'] }[S.day] || []).slice();
  if (S.day === 4 && !S.flags.callSeen) L.push('rumor');
  for (const l of L) if (!S.letters.includes(l)) S.letters.push(l);
  if (S.day === 4 && S.flags.kind && S.flags.casinoVisited && !S.wardrobe.suits.includes('pinstripe')) { S.wardrobe.suits.push('pinstripe'); S.flags.pinstripe = true; }
  G.scheduleSlot();
  G.bus.emit('dayStart', S.day);
  G.autosave();
};
/** NPC pairs for the day: the pairing with the most affinity between partners (plus noise), avoiding yesterday's pairs */
G.formTeams = () => {
  const S = G.state, free = G.npcs().filter(id => id !== S.partner), aff = (a, b) => G.baseAff(a, b);
  const prev = new Set((S.teams || []).map(t => t.slice().sort().join('+')));
  let best = null, bv = -1e9;
  const pairs = (list) => { if (list.length < 2) return [[]]; const [a, ...rest] = list, out = []; for (let i = 0; i < rest.length; i++) { const b = rest[i], others = rest.filter((_, k) => k !== i); for (const p of pairs(others)) out.push([[a, b], ...p]); } if (list.length % 2) for (const p of pairs(rest)) out.push(p); return out; };
  for (const P of pairs(free)) { if (P.length < Math.floor(free.length / 2)) continue; let v = 0; for (const [a, b] of P) v += aff(a, b) + (G.rng('world') - .5) * 20 - (prev.has([a, b].sort().join('+')) ? 15 : 0); if (v > bv) { bv = v; best = P; } }
  S.teams = best || []; const inTeam = new Set(S.teams.flat()); S.solo = free.find(id => !inTeam.has(id)) || null;
  for (const t of S.teams) { const k = t.slice().sort().join('+'); S.record[k] = S.record[k] || [0, 0]; }
};
G.teamOf = id => (G.state.teams || []).find(t => t.includes(id)) || null;
G.LOCS_DAY = ['beach', 'pool', 'promenade', 'away'];
/** who is where this slot (story events override; a pair is always at the beach by day) */
G.scheduleSlot = () => {
  const S = G.state; S.where = {}; G.seed('world', S.seed * 131 + S.day * 17 + S.slot * 7);
  const rain = G.weatherNow() === 'rain';
  const place = id => {
    const w = G.SCHEDULE[id][S.slot].slice();
    if (S.slot === 2) return G.rng('world') * (w[0] + w[1]) < w[0] ? 'casino' : 'away';
    if (rain) { w[0] *= .2; w[1] *= .5; w[2] *= 1.5; w[3] *= 1.5; }
    const tot = w.reduce((a, b) => a + b, 0); let r = G.rng('world') * tot; for (let k = 0; k < 4; k++) { if ((r -= w[k]) < 0) return G.LOCS_DAY[k]; } return 'away';
  };
  for (const t of S.teams) { const p = place(t[0]); S.where[t[0]] = p; S.where[t[1]] = p; }
  for (const id of G.npcs()) if (!S.where[id]) S.where[id] = place(id);
  if (S.slot < 2 && S.teams.length && !S.teams.some(t => S.where[t[0]] === 'beach')) { const t = S.teams[Math.floor(G.rng('world') * S.teams.length)]; S.where[t[0]] = S.where[t[1]] = 'beach'; }
  if (S.partner) S.where[S.partner] = S.slot === 2 ? (S.where[S.partner] === 'casino' ? 'casino' : 'away') : S.where[S.partner];
};
G.present = loc => G.npcs().filter(id => G.state.where[id] === loc);
/* ---- affinity ---- */
G.aff = id => G.state.affinity[id] || 0;
G.addAff = (id, d, why) => {
  const S = G.state; if (!(id in S.affinity)) return 0;
  if (d > 0) d *= G.T.affinityGainMul;
  const before = S.affinity[id], st0 = G.UI.stage(before);
  S.affinity[id] = clamp(Math.round(before + d), 0, 100);
  const st1 = G.UI.stage(S.affinity[id]);
  if (st1 !== st0 && S.affinity[id] > before) { G.sting('levelup'); G.toast(G.CAST[id].short + ': ' + st1 + '!', why || ''); }
  G.bus.emit('affinity', { id, d: S.affinity[id] - before });
  return S.affinity[id] - before;
};
G.stageBonus = a => a >= 80 ? 2 : a >= 40 ? 1 : 0;
G.moodBonus = m => m === 'happy' ? 1 : m === 'gloomy' ? -1 : 0;
/** chat: +2 the first time a day, +1 later, once a slot */
G.chat = id => {
  const S = G.state, key = id + ':' + S.day + ':' + S.slot;
  const a = G.aff(id), band = a >= 80 ? 2 : a >= 40 ? 1 : 0, lines = G.LINES[id].chat, line = lines[band * 2 + (S.day + S.slot) % 2];
  let d = 0; if (!S.chatSlot[key]) { d = S.chatted[id] ? 1 : 2; S.chatted[id] = true; S.chatSlot[key] = true; G.addAff(id, d); }
  return { line, d };
};
/** a gift: score = taste + stage bonus + mood; accepted at or above giftThreshold; one a slot per NPC */
G.giftKey = id => id + ':' + G.state.day + ':' + G.state.slot;
G.canGift = id => !G.state.gifted[G.giftKey(id)];
G.giveGift = (id, itemId) => {
  const S = G.state, it = G.ITEMS[itemId]; if (!it || !G.canGift(id)) return null;
  let taste, score;
  if (it.kind === 'suit' || it.kind === 'acc') { const c = G.CAST[id], match = it.tastes.some(t => c.tastes.includes(t)); taste = match ? 'like' : 'dislike'; }
  else taste = G.taste(id, itemId);
  score = { love: 3, like: 2, neutral: 0, dislike: -3 }[taste] + G.stageBonus(G.aff(id)) + G.moodBonus(S.mood[id]);
  const accepted = it.kind === 'suit' ? taste === 'like' : score >= G.T.giftThreshold;
  S.gifted[G.giftKey(id)] = true; S.known[id] = S.known[id] || {}; S.known[id][itemId] = taste;
  // the item leaves the bag (or the wardrobe); a refused gift comes back
  if (it.kind === 'gift') { S.bag[itemId] = (S.bag[itemId] || 0) - 1; if (S.bag[itemId] <= 0) delete S.bag[itemId]; }
  let d = 0, line;
  const L = G.LINES[id];
  if (!accepted) { d = G.addAff(id, -6); if (it.kind === 'gift') S.bag[itemId] = (S.bag[itemId] || 0) + 1; line = it.kind === 'suit' ? L.suitNo : G.rpick('cosmetic', L.refuse); }
  else {
    d = G.addAff(id, { love: 12, like: 6, neutral: 2 }[taste] || 2); S.stats.gifts++;
    if (it.kind === 'suit') { S.npcWear[id] = { suit: itemId, acc: (S.npcWear[id] || {}).acc || [] }; S.wardrobe.suits = S.wardrobe.suits.filter(s => s !== itemId || S.wearing.suit === s); line = L.suitYes; }
    else if (it.kind === 'acc') { const w = S.npcWear[id] || { acc: [] }; const keep = (w.acc || []).filter(a => G.ITEMS[a].anchor !== it.anchor); w.acc = keep.concat(itemId); S.npcWear[id] = w; S.wardrobe.acc = S.wardrobe.acc.filter(a => a !== itemId || S.wearing.acc.includes(a)); line = L.suitYes; }
    else line = taste === 'love' ? G.rpick('cosmetic', L.love) : taste === 'like' ? G.rpick('cosmetic', L.like) : L.neutral[0];
  }
  G.bus.emit('gift', { id, itemId, taste, accepted, d });
  return { accepted, taste: accepted ? taste : 'refuse', d, line };
};
/** a team-up: affinity at the threshold (−10 happy, +10 gloomy, +20 if she has a team) */
G.inviteNeed = id => { const S = G.state; let need = G.T.inviteThreshold + (S.mood[id] === 'happy' ? -10 : S.mood[id] === 'gloomy' ? 10 : 0); if (G.teamOf(id)) need += 20; return need; };
G.invite = id => {
  const S = G.state, L = G.LINES[id];
  if (G.aff(id) < G.inviteNeed(id)) return { ok: false, line: G.rpick('cosmetic', L.inviteNo) };
  const t = G.teamOf(id); let extra = null;
  if (t) { const mate = t.find(x => x !== id); S.teams = S.teams.filter(x => x !== t); S.solo = mate; G.addAff(mate, -4); extra = L.leaveTeam; }
  if (S.partner && S.partner !== id) { const old = S.partner; G.addAff(old, -3); S.solo = S.solo || old; }
  S.partner = id; G.bus.emit('partner', id);
  return { ok: true, line: G.rpick('cosmetic', L.inviteYes), extra };
};
/* ---- money ---- */
G.earn = (n, why) => { const S = G.state; n = Math.round(n * G.T.prizeMul); S.money += n; S.earnedToday += n; S.stats.earned += n; G.bus.emit('money', { d: n, why }); return n; };
G.spend = n => { const S = G.state; if (S.money < n) return false; S.money -= n; S.spentToday += n; S.stats.spent += n; G.bus.emit('purchase', n); return true; };
G.priceOf = (it, shop) => { const S = G.state, deal = S && shop && (S.deals[shop] || []).includes(it.id); return Math.round(it.price * G.T.priceMul * (deal ? .75 : 1) / 100) * 100; };
/* ---- slots and days ---- */
G.endSlot = (why) => {
  const S = G.state; if (!S) return;
  G.bus.emit('slotEnd', { day: S.day, slot: S.slot, why });
  if (S.slot >= 2) { G.go('dayend', null, { fade: .4 }); return; }
  S.slot++; G.scheduleSlot(); G.autosave();
  G.afterSlot();
};
/** where the game goes as a slot starts: a story event, or the island map */
G.afterSlot = () => { const ev = G.slotEvent(); if (ev) return ev(); G.go('map', null, { fade: .4 }); };
G.nextDay = () => {
  const S = G.state;
  // the partner walks if she lost a match today and likes you less than 35; drift toward base for anyone you didn't talk to
  if (S.partner && S.lostToday && G.aff(S.partner) < 35) { S.flags.brokeUp = S.partner; G.toast(G.CAST[S.partner].short + ' left your team', 'Win her back with chats and gifts.'); S.partner = null; }
  for (const id of G.npcs()) if (!S.chatted[id]) { const base = G.baseAff(S.me, id), a = S.affinity[id]; S.affinity[id] = a > base ? Math.max(base, a - G.T.affinityDecay) : Math.min(base, a + G.T.affinityDecay); }
  // the NPC pairs play each other off-screen
  for (let i = 0; i < S.teams.length; i++) for (let j = i + 1; j < S.teams.length; j++) {
    const A = S.teams[i], B = S.teams[j], sk = t => t.reduce((a, id) => a + G.CAST[id].stats.POW + G.CAST[id].stats.TEC, 0), pa = sk(A) / (sk(A) + sk(B));
    const aw = G.rng('world') < pa, ka = A.slice().sort().join('+'), kb = B.slice().sort().join('+');
    S.record[ka] = S.record[ka] || [0, 0]; S.record[kb] = S.record[kb] || [0, 0]; S.record[ka][aw ? 0 : 1]++; S.record[kb][aw ? 1 : 0]++;
  }
  S.day++; S.slot = 0;
  if (S.day > G.DAYS) { S.day = G.DAYS; return; }
  G.dayStart(); G.sting('daystart');
};
/* ---- matches from the Match Board: base skill by day, the partner's chemistry, prizes, affinity ---- */
G.vacationMatchCfg = (opp, o = {}) => {
  const S = G.state, me = S.me, partner = o.partner || S.partner, day = S.day, base = o.base || [G.DAY_BASE[day], G.DAY_BASE[day]];
  const wear = id => G.wearOf(id);
  const cfg = {
    mode: o.mode || 'vacation', pointsToWin: o.points || G.T.pointsToWin, tod: G.todNow(), weather: G.weatherMatch(), title: o.title || 'BEACH MATCH', subtitle: G.CAST[me].short + ' & ' + G.CAST[partner].short + '  vs  ' + G.CAST[opp[0]].short + ' & ' + G.CAST[opp[1]].short,
    partnerAff: G.aff(partner), final: !!o.final, specials: o.specials, tutorial: !!o.tutorial, serveFirst: o.serveFirst === undefined ? 0 : o.serveFirst,
    teams: [[{ id: me, suit: wear(me).suit, acc: wear(me).acc, input: G.game.input, name: G.CAST[me].short }, { id: partner, suit: wear(partner).suit, acc: wear(partner).acc, base: G.DAY_BASE[day] + .05 }],
      opp.map((id, k) => ({ id, suit: o.kits ? o.kits[k] : wear(id).suit, acc: o.accs ? o.accs[k] : wear(id).acc, base: base[k] }))],
    after: (res, M) => G.vacationAfter(res, M, opp, partner, o)
  };
  return cfg;
};
G.vacationAfter = (res, M, opp, partner, o) => {
  const S = G.state, won = res.winner === 0, margin = Math.abs(res.finalScore[0] - res.finalScore[1]);
  S.stats.matches++; if (won) S.stats.wins++; else S.lostToday = true;
  const mine = res.players.filter(p => p.side === 0); for (const p of mine) { S.stats.points += p.stats.points; S.stats.kills += p.stats.kills; S.stats.aces += p.stats.aces; S.stats.blocks += p.stats.blocks; }
  let prize = o.prize !== undefined ? (won ? o.prize : o.losePrize || 3000) : won ? 12000 + 3000 * S.day + 1000 * margin : 3000;
  prize = G.earn(prize, 'match');
  const before = G.aff(partner);
  G.addAff(partner, won ? (o.final ? 10 : 6) : S.mood[partner] === 'gloomy' ? -5 : -2);
  for (const id of opp) if (G.FIGHTERS.includes(id) && id !== S.me) { if (won) { G.addAff(id, G.GOOD_SPORTS.includes(id) ? 1 : -3); S.beatYesterday[id] = true; } }
  const k = opp.slice().sort().join('+'); if (S.record[k]) S.record[k][won ? 1 : 0]++;
  S.playedToday.push(k);
  const aff = { id: partner, to: G.aff(partner), d: G.aff(partner) - before };
  if (o.onResult) o.onResult(won, res);
  G.go('results', { M, prize, aff, buttons: [['Continue', () => { if (o.next) o.next(won); else G.endSlot('match'); }]] });
};
/* ---- saves ---- */
G.setupSaves = () => {
  const sv = G.game.saves;
  sv.version = 1; sv.migrate = (data, from) => data;
  sv.write = () => ({ data: JSON.parse(JSON.stringify(G.state)), place: G.state ? G.CAST[G.state.me].short + ' • ' + G.SLOTS[G.state.slot] : '', level: G.state ? 'Day ' + G.state.day : '' });
  sv.read = save => { G.loadState(save.data); };
  sv.canSave = false;
};
G.loadState = data => { G.state = Object.assign(G.newState(data.me || 'rin', data.seed || 1), data); G.rigs = {}; };
G.autosave = () => { if (G.hub || !G.state || G.state.demo) return; try { G.game.saves.autosave(); } catch (e) { G.game.fail('autosave', e); } };
G.resumeVacation = () => { G.rigs = {}; G.scheduleSlot(); G.go('map', null, { fade: .4 }); };
G.unlocks = () => G.store.get('aoa-unlocks', { suits: [], done: false });
G.unlock = (suits, done) => { if (G.hub) return; const u = G.unlocks(); for (const s of suits || []) if (!u.suits.includes(s)) u.suits.push(s); if (done) u.done = true; G.store.set('aoa-unlocks', u); };

// ==== 31-map.js ====
/* 31-map: the island map, an iso view of Isla Fortuna: sea all round, beaches, palm groves, a dormant volcano in three
 * steps with steam, the lagoon, the courts, the Promenade, the villas, the casino (neon at night), the Dock with Sonny's
 * seaplane and a lighthouse. The cursor jumps between pins; a location card says who is there; travel ends at the place. */
G.islandMap = () => {
  if (G._island) return G._island;
  const W = 48, H = 36, rows = [];
  for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) {
    const dx = (x - 24) / 20, dy = (y - 18) / 14, d = Math.hypot(dx, dy) + E.noise2(x * .2, y * .2) * .18;
    const vd = Math.hypot((x - 30) / 6, (y - 12) / 5);
    let c = d > 1.02 ? '~' : d > .88 ? 's' : 'g';
    if (c === 'g' && vd < 1) c = vd < .35 ? '3' : vd < .7 ? '2' : '1';
    if (x >= 28 && x <= 33 && y >= 13 && y <= 16 && c === 'g') c = 'l';   // the lagoon pool
    if (x >= 12 && x <= 19 && y >= 19 && y <= 24) c = 'c';               // the courts
    if (x >= 20 && x <= 28 && y >= 8 && y <= 10 && c !== '~') c = 'p';   // the promenade
    if (x >= 7 && x <= 10 && y >= 27 && y <= 33) c = 'p';                // the dock
    if (x >= 34 && x <= 39 && y >= 23 && y <= 25 && c !== '~') c = 'v';   // villas
    if (x >= 18 && x <= 22 && y >= 27 && y <= 29 && c !== '~') c = 'k';   // the casino
    s += c; } rows.push(s); }
  const tex = (x, y, tag) => {
    const n = E.hash2(Math.floor(x / 2), Math.floor(y / 2)) - .5, m = E.noise2(x * .02, y * .02);
    if (tag === 'sea') { const k = E.noise2(x * .01 + G.game.real * 0, y * .01); return [20 + k * 20, 120 + k * 50 + n * 8, 170 + k * 30 + n * 8]; }
    if (tag === 'sand') return [236 + n * 14, 212 + n * 12, 160 + n * 10];
    if (tag === 'lagoon') return [70 + n * 10, 210 + n * 10, 220 + n * 10];
    if (tag === 'court') { const line = (Math.floor(x) % 32 < 1) || (Math.floor(y) % 24 < 1); return line ? [60, 120, 220] : [240 + n * 10, 214 + n * 10, 160]; }
    if (tag === 'planks') return G.tex.planks(x, y);
    return [60 + m * 30 + n * 16, 150 + m * 40 + n * 20, 70 + m * 20 + n * 10];
  };
  G._island = new E.TileMap({ rows, legend: { '~': { floor: 'sea', block: true }, s: { floor: 'sand' }, g: { floor: 'grass' }, l: { floor: 'lagoon' }, c: { floor: 'court' }, p: { floor: 'planks' },
    1: 1, 2: 2, 3: 3, v: 4, k: 5 },
    types: { 1: { h: 14, top: '#6a5a4a', side: '#4a3a30', face: 'rock', roof: 'grass' }, 2: { h: 30, top: '#5a4a3a', side: '#3a2a22', face: 'rock', roof: 'plain' }, 3: { h: 48, top: '#3a2a22', side: '#2a1a14', face: 'rock', roof: 'plain' },
      4: { h: 18, top: '#ff8a6a', side: '#f4e8c8', face: 'plaster', roof: 'tiles' }, 5: { h: 26, top: '#2a1240', side: '#4a1a5a', face: 'plaster', roof: 'slab' } }, floorTex: tex, outside: '#1a78a0', ao: 4 });
  return G._island;
};
G.PINS = ['beach', 'pool', 'promenade', 'villa', 'casino', 'dock'];
G.pinPos = id => { const p = G.LOCS[id].pin; return [p[0] * 16 + 8, p[1] * 16 + 8]; };
G.isOpen = (id, S = G.state) => { const L = G.LOCS[id]; if (!S) return true; if (id === 'casino') return S.slot === 2; return L.open.includes(S.slot); };
G.SCENES.map = {
  pausable: true, view: 'iso', input: G.INPUT.MENU, camera: { zoom: [.55, 1.4], start: .7 },
  enter(d) {
    this.demo = d && d.demo; this.t = 0; const S = G.state; this.map = G.islandMap(); this.cur = this.cur && G.PINS.includes(this.cur) ? this.cur : 'beach'; this.card = false;
    if (S && !G.isOpen(this.cur)) this.cur = S.slot === 2 ? 'casino' : 'beach';
    this.tod = S ? G.todNow(S) : 'afternoon'; G.UI.theme = this.tod === 'night' ? 'night' : 'day';
    G.applyLight(this.tod, S ? G.weatherNow(S) : 'sunny', this.tod === 'night'); G.game.weather = S && G.weatherNow(S) === 'rain' ? { kind: 'rain', amount: .5 } : null;
    G.music(this.tod === 'night' ? 'siesta' : 'island'); G.ambience.set(this.tod === 'night' ? 'night' : 'beach');
    this.focus = new G.Focus(); G.game.cam.bounds = null; this.camX = G.pinPos(this.cur)[0]; this.camY = G.pinPos(this.cur)[1];
    if (S) S.atMap = true;
  },
  exit() { G.game.weather = null; },
  update(dt) {
    this.t += dt; const I = G.game.input, S = G.state; G.ambience.update(dt);
    const [tx, ty] = G.pinPos(this.cur); this.camX += (tx - this.camX) * Math.min(1, dt * 4); this.camY += (ty - this.camY) * Math.min(1, dt * 4); G.game.focus(this.camX, this.camY, 0);
    if (this.demo) { const k = Math.floor(this.t / 1.1) % G.PINS.length; this.cur = G.PINS[k]; this.card = (this.t % 1.1) > .5; this.tod = ['morning', 'afternoon', 'sunset', 'night'][Math.floor(this.t / 1.8) % 4]; G.applyLight(this.tod, 'sunny', this.tod === 'night'); return; }
    if (G.talkBox().update(dt)) return;
    if (this.card) {
      const f = this.focus.set(this.cardItems()).update();
      if (f.back) { this.card = false; return; }
      if (f.pick) { if (f.pick.id === 'go') this.travel(); else this.card = false; }
      return;
    }
    // the stick or d-pad jumps to the nearest pin that way; L1 / R1 cycle; the mouse hovers
    const dirs = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]], v = G.game.view;
    for (const [a, dx, dy] of dirs) if (I.repeat(a, .35, .15)) { const p0 = v.p(...G.pinPos(this.cur), 0); let best = null, bd = 1e9; for (const id of G.PINS) { if (id === this.cur) continue; const p = v.p(...G.pinPos(id), 0), vx = p[0] - p0[0], vy = p[1] - p0[1], al = vx * dx + vy * dy; if (al <= 0) continue; const dd = al + Math.abs(vx * dy - vy * dx) * 2; if (dd < bd) { bd = dd; best = id; } } if (best) { this.cur = best; G.sfx('ui_tick'); } }
    const w = G.takeWheel(); if (I.pressed('tabR') || w > 0) { this.cur = G.PINS[(G.PINS.indexOf(this.cur) + 1) % G.PINS.length]; G.sfx('ui_tick'); } if (I.pressed('tabL') || w < 0) { this.cur = G.PINS[(G.PINS.indexOf(this.cur) + G.PINS.length - 1) % G.PINS.length]; G.sfx('ui_tick'); }
    const mg = I.lastDevice === 'mouse' && G.game.mouseGround ? G.game.mouseGround() : null;
    if (mg) for (const id of G.PINS) { const p = G.pinPos(id); if (Math.hypot(p[0] - mg[0], p[1] - mg[1]) < 28 && this.cur !== id) { this.cur = id; G.sfx('ui_tick'); } }
    if (I.pressed('confirm') || (I.clicked() && mg)) { G.sfx('ui_select'); this.card = true; this.focus.i = 0; }
    if (I.pressed('alt')) G.go('journal', { page: 1, back: 'map' });
    if (I.pressed('extra')) G.go('journal', { page: 0, back: 'map' });
  },
  cardItems() { const W = G.game.W, H = G.game.H, open = G.isOpen(this.cur) && this.cur !== 'dock', y = Math.round(H * .62) + 34; return [{ id: 'go', label: open ? 'Go there' : 'Closed', disabled: !open, x: Math.round(W / 2) - 100, y, w: 96, h: 18 }, { id: 'back', label: 'Back', x: Math.round(W / 2) + 4, y, w: 96, h: 18 }]; },
  travel() { const id = this.cur; if (id === 'casino') G.go('location', { loc: 'casino' }, { fade: 'iris', seconds: .5 }); else G.go('location', { loc: id }, { fade: 'iris', seconds: .5 }); },
  draw(r) {
    const S = G.state, night = this.tod === 'night', t = G.game.real;
    G.backdrop(this.tod, S ? G.weatherNow(S) : 'sunny').draw(r);
    this.map.drawFloor(r); this.map.queueWalls(r);
    // landmarks
    for (const [x, y] of [[160, 120], [190, 160], [600, 360], [640, 420], [300, 460], [560, 190], [130, 330], [700, 300], [420, 520], [250, 220]]) r.prop('palm', x, y, 0, { size: 1.1 });
    r.shape('lighthouse', 690, 120, 0, { light: night }); r.shape('seaplane', 140, 540, 0, { facing: Math.PI / 2, scale: .8 });
    r.shape('umbrella', 230, 330, 0, { scale: .8 }); r.shape('tikibar', 180, 300, 0, { scale: .6 }); r.shape('cabana', 520, 200, 0, { scale: .7 });
    for (const x of [340, 390, 440]) r.shape('shopfront', x, 140, 0, { facing: Math.PI / 2, scale: .5 });
    // steam from the volcano
    if (Math.floor(t * 3) % 2 === 0 && G.rng('cosmetic') < .5) G.game.particles.smoke(480 + (G.rng('cosmetic') - .5) * 10, 192, 52, 1, { size: 1, color: '#e8ecf0' });
    if (night) { G.game.lights.add(330, 450, 30, 80, .9, { color: '#ff5fa2' }); G.game.lights.add(590, 390, 24, 70, .7, { color: '#ffd890' }); G.game.lights.add(690, 120, 70, 120, .8, { color: '#fff0c0' }); }
    // pins
    for (const id of G.PINS) {
      const [x, y] = G.pinPos(id), on = this.cur === id, open = G.isOpen(id) && id !== 'dock', bob = on ? Math.abs(Math.sin(t * 4)) * 4 : 0;
      r.queue(x, y, 30 + bob, g => {
        const [sx, sy] = r.w(x, y, 30 + bob), X = Math.round(sx), Y = Math.round(sy), c = open ? (on ? '#ffd36a' : '#ff9e5e') : '#7a8a90';
        px.disc(g, X, Y, on ? 6 : 5, '#1a1020'); px.disc(g, X, Y, on ? 5 : 4, c); px.poly(g, [[X - 3, Y + 3], [X + 3, Y + 3], [X, Y + 9]], c); px.disc(g, X, Y, 2, '#ffffff');
        const label = G.LOCS[id].short, w = E.font.width(label) + 6; px.rect(g, X - w / 2, Y - 17, w, 10, '#101820'); E.font.text(g, label, X, Y - 16, open ? '#ffffff' : '#9aa0a8', { align: 'center', outline: false });
      }, { bias: 100 });
    }
    r.overlay(g => {
      const W = r.W, H = r.H, x0 = Math.round(W * .04), y0 = Math.round(H * .04);
      if (S) { G.UI.clock(g, Math.round(W * .96) - (G.game.cornerArea() ? 46 : 0), y0, S.day, S.slot, G.weatherNow(S), 'right'); G.UI.money(g, x0, y0, S.money); if (S.partner) { G.portrait(g, S.partner, x0, y0 + 20, 22); E.font.text(g, 'Partner: ' + G.CAST[S.partner].short, x0 + 26, y0 + 22, '#fff8e8', { shadow: '#000', outline: false }); G.UI.hearts(g, x0 + 26, y0 + 32, G.aff(S.partner)); } }
      G.UI.title(g, 'ISLA FORTUNA', W / 2, y0, { scale: 2 });
      if (this.card) {
        const id = this.cur, L = G.LOCS[id], w = Math.min(300, W - 30), x = Math.round(W / 2 - w / 2), y = Math.round(H * .3), h = Math.round(H * .32) + 30, open = G.isOpen(id) && id !== 'dock';
        G.UI.panel(g, x, y, w, h + 26);
        G.UI.heading(g, L.name, x + 10, y + 8);
        E.font.text(g, open ? 'Open now' : id === 'dock' ? 'Departures only' : id === 'casino' ? 'Opens at night' : 'Closed at night', x + 10, y + 26, open ? '#7cff5a' : '#ff9e5e', { outline: false });
        E.font.text(g, L.about, x + 10, y + 38, '#fff8e8', { outline: false, wrap: w - 20 });
        const here = S ? G.present(id) : []; E.font.text(g, here.length ? 'Here now:' : 'Nobody you know is here.', x + 10, y + 62, '#9fd3d6', { outline: false });
        here.slice(0, 5).forEach((nid, k) => { const px0 = x + 10 + k * 54; G.portrait(g, nid, px0, y + 72, 22); G.UI.mood(g, px0 + 26, y + 74, S.mood[nid]); const t2 = G.teamOf(nid); if (t2) E.font.text(g, '+' + G.CAST[t2.find(q => q !== nid)].short.slice(0, 3), px0 + 24, y + 84, '#ffd36a', { outline: false }); });
        this.cardItems().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      }
    });
    if (!this.demo) G.promptBar(r, this.card ? [['confirm', 'Go'], ['cancel', 'Back']] : [['confirm', 'Choose'], ['alt', 'Friends'], ['extra', 'Journal'], ['pause', 'Options']]);
  }
};

// ==== 32-location.js ====
/* 32-location: every walkable place is one scene driven by data (04-data-world): you walk (hold run), the people the
 * schedule put here sit at their spots doing idle things and turn to look at you, you talk to them (chat, gifts, team-ups,
 * challenges), use the place's things (Match Board, changing hut, shops, bed, desk, album, mailbox, Pool Hop, the casino's
 * tables) and leave for the island map, which ends the slot. The mouse hovers and clicks people and things. */
G.talkBox = () => G._talk || (G._talk = new E.Dialog(G.game, { lines: 2, place: 'bottom', border: '#f6d38a', bg: '#0f4c5c' }));
/** a line (or lines) spoken by someone, with their portrait and voice; then onDone */
G.say = (who, lines, o = {}) => {
  // a line opened from inside a dialog's own callback (a choice, or a page closing) waits a step: the box finishes closing
  // first, so it doesn't fire the new line's onDone at once
  if (G._inDialogCb) { G._sayQueue = [who, lines, o]; return; }
  const wrap = f => f && function (...a) { G._inDialogCb = true; try { return f.apply(this, a); } finally { G._inDialogCb = false; const q = G._sayQueue; if (q) { G._sayQueue = null; G.game.after(0, () => G.say(...q)); } } };
  o = Object.assign({}, o, { onDone: wrap(o.onDone), onChoice: wrap(o.onChoice) });
  const T = G.talkBox(), c = G.CAST[who] || { short: who };
  T.speed = G.T.textSpeed; T.voice = G.voice.hook(who, o.mood);
  const port = G.CAST[who] ? (g, x, y, size) => G.portrait(g, who, x, y, size, { frame: false }) : null;
  T.say(Array.isArray(lines) ? lines : [lines], Object.assign({ name: (c.short || who).toUpperCase(), portrait: port, portraitSize: 36, nameColor: c.color || '#ffd36a' }, o));
};
G.SCENES.location = {
  pausable: true, view: 'threequarter', input: G.INPUT.EXPLORE, camera: { zoom: [.7, 1.6], start: .8 },
  enter(d) {
    d = d || {}; const S = G.state, id = d.loc || 'beach'; this.loc = id; this.L = G.LOCS[id]; G.LOC = { id }; this.demo = d.demo || null; this.t = 0;
    this.map = G.locMaps()[id]; this.night = S ? S.slot === 2 : false; this.tod = S ? G.todNow(S) : 'afternoon'; G.curTod = this.tod;
    const sp = d.at || this.L.spawn; this.hero = new E.Body({ x: sp[0], y: sp[1], r: 5 }); this.hero.facing = -Math.PI / 2;
    const me = S ? S.me : 'amara', w = G.wearOf(me); this.rig = G.anim.rig(G.rigFor(me, w.suit, w.acc));
    G.game.follow(this.hero, { z: 18 }); G.game.cam.bounds = v => this.map.bounds(v); G.game.cam.smooth = .15;
    G.UI.theme = this.night || id === 'casino' ? 'night' : 'day';
    G.applyLight(this.tod, S ? G.weatherNow(S) : 'sunny', this.night || id === 'casino' || id === 'villa');
    if (id === 'casino') G.game.lights.ambient = .55; if (id === 'villa' && !this.night) G.game.lights.ambient = .9;
    G.game.weather = S && G.weatherNow(S) === 'rain' && id !== 'villa' && id !== 'casino' ? { kind: 'rain', amount: .6, wind: .2 } : null;
    G.music(this.L.music); G.ambience.set(this.night && id !== 'casino' ? 'night' : this.L.amb);
    // the people here, at their spots
    this.npcs = [];
    const here = S ? G.present(id) : [], spots = this.L.spots.slice();
    here.forEach((nid, k) => { const sp2 = spots[k % spots.length]; const ww = G.wearOf(nid); this.npcs.push({ id: nid, x: sp2[0], y: sp2[1], kind: sp2[2], rig: G.anim.rig(G.rigFor(nid, ww.suit, ww.acc)), facing: Math.PI / 2, react: null }); });
    if (S && S.partner && id === 'beach' && !here.includes(S.partner) && S.slot < 2) this.partnerJog = true;
    this.panel = null; this.focus = new G.Focus(); this.hover = null; this.walkTo = null; this.prompt = null;
    G.photoSubjects = () => [{ id: me, rig: this.rig }].concat(this.npcs.map(n => ({ id: n.id, rig: n.rig })));
    G.talkBox().close();
    if (S && !this.demo) G.locEvents(id, this);
    if (this.demo === 'photo') G.game.after(1.2, () => { G.photo.demo = true; G.photo.open(); G.photo.demo = false; });
  },
  exit() { G.game.follow(null); G.game.cam.bounds = null; G.game.weather = null; G.photoSubjects = null; },
  back() { if (this.panel) { this.panel = null; return true; } return false; },
  /** what is near: the nearest person or thing within reach */
  near() {
    const h = this.hero; let best = null, bd = 24;
    for (const n of this.npcs) { const d = Math.hypot(n.x - h.x, n.y - h.y); if (d < bd) { bd = d; best = { kind: 'npc', n, label: G.CAST[n.id].short }; } }
    for (const [iid, label, x, y] of this.L.inter) { const d = Math.hypot(x - h.x, y - h.y); if (d < bd) { bd = d; best = { kind: 'inter', id: iid, label, x, y }; } }
    return best;
  },
  update(dt) {
    this.t += dt; const I = G.game.input, S = G.state;
    G.ambience.update(dt);
    for (const n of this.npcs) this.npcStep(n, dt);
    this.rig.update(dt, { x: this.hero.x, y: this.hero.y, z: this.hero.z, vx: this.hero.vx, vy: this.hero.vy, facing: this.hero.facing, sprint: I.down('run') && !this.panel });
    if (this.demo) return this.demoStep(dt);
    if (G.talkBox().update(dt)) return;
    if (this.panel) { this.panelStep(dt); this.hero.vx = this.hero.vy = 0; this.hero.update(dt, this.map); return; }
    // movement
    const m = I.move(); let mx = m[0], my = m[1];
    const run = I.down('run'), sp = run ? 110 : 70;
    let dir = Math.hypot(mx, my) > .15 ? G.game.view.screenDirToGround(mx, my) : null;
    if (dir) this.walkTo = null;
    if (!dir && this.walkTo) { const dx = this.walkTo.x - this.hero.x, dy = this.walkTo.y - this.hero.y, d = Math.hypot(dx, dy); if (d < 16) { const w = this.walkTo; this.walkTo = null; this.use(w.target); } else dir = [dx / d, dy / d]; }
    this.hero.vx = dir ? dir[0] * sp : 0; this.hero.vy = dir ? dir[1] * sp : 0;
    if (dir) this.hero.facing = Math.atan2(dir[1], dir[0]);
    this.hero.update(dt, this.map);
    if (dir && Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) G.sfx('step_sand', { vol: .5 });
    // the mouse: hover names a person or thing, a click walks there and uses it
    const mg = I.lastDevice === 'mouse' && G.game.mouseGround ? G.game.mouseGround() : null; this.hover = null;
    if (mg) { for (const n of this.npcs) if (Math.hypot(n.x - mg[0], n.y - mg[1]) < 12) this.hover = { kind: 'npc', n, label: G.CAST[n.id].short, x: n.x, y: n.y }; for (const [iid, label, x, y] of this.L.inter) if (Math.hypot(x - mg[0], y - mg[1]) < 14) this.hover = { kind: 'inter', id: iid, label, x, y }; }
    const c = I.clicked(); if (c && this.hover) { const h = this.hover; this.walkTo = { x: h.kind === 'npc' ? h.n.x : h.x, y: h.kind === 'npc' ? h.n.y : h.y, target: h }; }
    this.prompt = this.near();
    if (I.pressed('interact') && this.prompt) this.use(this.prompt);
    if (I.pressed('bag') && S) this.openBag(null);
    if (I.pressed('snap') && G.canPhoto()) G.photo.open();
    if (I.pressed('leave')) this.askLeave();
    if (this.partnerJog && S && S.partner && Math.hypot(this.hero.x - 300, this.hero.y - 290) < 40) { this.partnerJog = false; const ww = G.wearOf(S.partner); this.npcs.push({ id: S.partner, x: 330, y: 300, kind: 'stand', rig: G.anim.rig(G.rigFor(S.partner, ww.suit, ww.acc)), facing: Math.PI, react: { kind: 'wave', t: 0, dur: 1.2 } }); }
  },
  npcStep(n, dt) {
    const h = this.hero, near = Math.hypot(h.x - n.x, h.y - n.y) < 40, k = n.kind;
    let face = near ? Math.atan2(h.y - n.y, h.x - n.x) : Math.PI / 2 + Math.sin(this.t * .3 + n.x) * .4;
    n.facing = E.approachAng(n.facing, face, dt * 4);
    let vb = null, pose = null, z = 0, down = 0, expr = null;
    const r = n.react; if (r) { r.t += dt; if (r.t > r.dur) n.react = null; else { vb = G.MOVES[r.kind] ? { kind: r.kind, u: r.t / r.dur, w: G.anim.weight(r.t / r.dur) } : null; pose = G.anim.pose(r.kind) || (r.kind === 'hop' ? 'cheer' : null); expr = r.expr || 'smile'; z = r.kind === 'hop' ? Math.abs(Math.sin(r.t * 10)) * 5 : 0; } }
    if (!r) {
      if (k === 'stool' || k === 'bench' || k === 'slot' || k === 'edge') { pose = 'kneel'; }
      else if (k === 'stand' && Math.sin(this.t * .4 + n.x) > .3) vb = { kind: 'foldarms', u: 0, w: .9 };
      else if (k === 'lounge') { down = .85; }
      else if (k === 'swim') { z = -14; pose = 'cheer'; }
      else if (k === 'practice') { vb = { kind: 'bump', u: (this.t * 1.2 + n.x) % 1, w: .9 }; }
      else if (k === 'shop' || k === 'shore') vb = { kind: 'lookback', u: 0, w: .6 };
      else if (Math.sin(this.t * .7 + n.y) > .6) pose = 'hips';
    }
    n.z = z; n.rig.vb = vb;
    n.rig.update(dt, { x: n.x, y: n.y, z, facing: n.facing, pose, down, expr: expr || (near ? 'smile' : null) });
  },
  /** use a person (the talk panel) or a thing */
  use(t) {
    const S = G.state; if (!t) return;
    if (t.kind === 'npc') { this.openTalk(t.n); return; }
    const id = t.id;
    if (id === 'board') this.openBoard();
    else if (id === 'hut' || id === 'closet') G.go('wardrobe', { back: { loc: this.loc, at: [this.hero.x, this.hero.y] } });
    else if (id === 'riptide' || id === 'coral' || id === 'sundries') { G.sfx('door'); G.go('shop', { shop: id, back: { loc: 'promenade', at: [this.hero.x, this.hero.y + 20] } }); }
    else if (id === 'bed') this.openBed();
    else if (id === 'desk') G.go('journal', { back: { loc: 'villa', at: [this.hero.x, this.hero.y] } });
    else if (id === 'frame') G.go('album', { from: 'location', back: { loc: 'villa', at: [this.hero.x, this.hero.y] } });
    else if (id === 'mailbox') G.openLetters();
    else if (id === 'hopdeck') G.go('poolhop', { back: { loc: 'pool' } });
    else if (['cashier', 'slots', 'blackjack', 'roulette', 'prize'].includes(id)) G.go('casino', { game: id, back: { loc: 'casino', at: [this.hero.x, this.hero.y] } });
    else if (id === 'vip') G.vipLounge(this);
  },
  askLeave() {
    const S = G.state; if (!S) { G.go('title'); return; }
    const slot = G.SLOTS[S.slot];
    this.panel = { kind: 'confirm', text: 'Leave? This ends the ' + slot + '.', yes: () => { this.panel = null; G.endSlot('leave'); }, no: () => { this.panel = null; } };
  },
  openTalk(n) {
    const S = G.state, id = n.id, isP = S.partner === id, team = G.teamOf(id), L = G.LINES[id], a = G.aff(id);
    G.say(id, L.greet[a >= 80 ? 2 : a >= 40 ? 1 : 0]);
    const items = [{ id: 'chat', label: 'Chat' }, { id: 'gift', label: 'Give a Gift', disabled: !G.canGift(id) }, isP ? { id: 'next', label: 'Our next match?' } : { id: 'team', label: 'Team Up' }];
    if (this.loc === 'beach' && team && !isP && S.slot < 2) items.push({ id: 'challenge', label: 'Challenge her team' });
    items.push({ id: 'bye', label: 'Bye' });
    this.panel = { kind: 'talk', n, items }; this.focus.i = 0;
  },
  openBag(n) { const S = G.state; this.panel = { kind: 'bag', n, tab: 0, page: 0, prev: this.panel }; this.focus.i = 0; },
  openBoard() {
    const S = G.state;
    const pairs = S.teams.filter(t => t.every(id => S.where[id] === 'beach') || S.slot < 2).map(t => t);
    this.panel = { kind: 'board', pairs, items: pairs.map((t, k) => ({ id: k, label: t.map(x => G.CAST[x].short).join(' & ') })).concat([{ id: 'close', label: 'Close' }]) }; this.focus.i = 0;
  },
  openBed() {
    const S = G.state, night = S.slot === 2;
    this.panel = { kind: 'confirm', text: night ? 'Sleep until morning?' : 'Rest until ' + G.SLOTS[S.slot + 1] + '?', yes: () => { this.panel = null; G.restInVilla(); }, no: () => { this.panel = null; } };
  },
  layoutPanel() {
    const P = this.panel, W = G.game.W, H = G.game.H; if (!P) return [];
    if (P.kind === 'talk') return G.UI.column(P.items, Math.round(W * .78), Math.round(H * .2) + 40, 120, 17, 3);
    if (P.kind === 'board') return G.UI.column(P.items, Math.round(W / 2), Math.round(H * .26), 220, 22, 4);
    if (P.kind === 'confirm') return [{ id: 'yes', label: 'Yes', x: Math.round(W / 2) - 70, y: Math.round(H * .48), w: 60, h: 18 }, { id: 'no', label: 'No', x: Math.round(W / 2) + 10, y: Math.round(H * .48), w: 60, h: 18 }];
    if (P.kind === 'bag') { const list = this.bagList(), cw = 84, ch = 48, x0 = Math.round(W / 2 - (cw * 3 + 12) / 2), y0 = Math.round(H * .26); return list.slice(P.page * 6, P.page * 6 + 6).map((it, k) => ({ id: it.id, it, x: x0 + (k % 3) * (cw + 6), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); }
    return [];
  },
  bagList() {
    const S = G.state, P = this.panel, tab = ['gift', 'suit', 'acc'][P.tab];
    if (tab === 'gift') return Object.keys(S.bag).filter(k => S.bag[k] > 0).map(k => G.ITEMS[k]).sort((a, b) => a.cat.localeCompare(b.cat));
    if (tab === 'suit') return S.wardrobe.suits.filter(s => s !== S.wearing.suit && G.ITEMS[s].price !== undefined && !['fortunagold', 'pinstripe'].includes(s) || false).map(k => G.ITEMS[k]);
    return S.wardrobe.acc.filter(a => !S.wearing.acc.includes(a)).map(k => G.ITEMS[k]);
  },
  panelStep(dt) {
    const P = this.panel, I = G.game.input, S = G.state, L = this.layoutPanel(), f = this.focus.set(L).update();
    if (P.kind === 'confirm') { if (f.pick) (f.pick.id === 'yes' ? P.yes : P.no)(); else if (f.back) P.no(); return; }
    if (P.kind === 'talk') {
      if (f.back) { this.panel = null; return; }
      if (!f.pick) return; const id = P.n.id, k = f.pick.id;
      if (k === 'chat') { const r = G.chat(id); G.say(id, r.line); if (r.d > 0) G.fx.hearts(P.n.x, P.n.y, 40, 3); P.n.react = { kind: 'nod', t: 0, dur: 1 }; }
      else if (k === 'gift') this.openBag(P.n);
      else if (k === 'team') { const r = G.invite(id); if (r.ok) { G.sting('gift_love'); G.fx.hearts(P.n.x, P.n.y, 40, 6); P.n.react = { kind: 'hop', t: 0, dur: 1 }; } else P.n.react = { kind: 'shrug', t: 0, dur: 1 }; G.say(id, r.extra ? [r.line, r.extra] : r.line); this.openTalk(P.n); this.panel = null; }
      else if (k === 'next') this.openBoard();
      else if (k === 'challenge') { const t = G.teamOf(id); this.panel = null; this.challenge(t); }
      else { this.panel = null; G.talkBox().close(); }
      return;
    }
    if (P.kind === 'board') {
      if (f.back || (f.pick && f.pick.id === 'close')) { this.panel = null; return; }
      if (f.pick) { const t = P.pairs[f.pick.id]; this.panel = null; this.challenge(t); }
      return;
    }
    if (P.kind === 'bag') {
      if (f.back) { this.panel = P.n ? null : null; if (P.n) this.openTalk(P.n); else this.panel = null; return; }
      if (f.tabL || f.tabR) { P.tab = (P.tab + (f.tabR ? 1 : 2)) % 3; P.page = 0; this.focus.i = 0; }
      if (I.pressed('alt')) { const n = this.bagList().length; P.page = (P.page + 1) % Math.max(1, Math.ceil(n / 6)); }
      if (f.pick && P.n) { const it = f.pick.it, n = P.n, res = G.giveGift(n.id, it.id); this.panel = null; if (!res) return;
        G.sfx('gift_unwrap');
        if (res.taste === 'love') { n.react = { kind: 'hop', t: 0, dur: 1.2 }; G.fx.hearts(n.x, n.y, 40, 10); G.sting('gift_love'); }
        else if (res.taste === 'like' || res.taste === 'neutral') { n.react = { kind: 'nod', t: 0, dur: 1 }; G.fx.hearts(n.x, n.y, 40, res.taste === 'like' ? 4 : 1); }
        else { n.react = { kind: 'reject', t: 0, dur: 1.6, expr: 'angry' }; G.sting('gift_refuse'); }
        this.rig.vb = { kind: 'give', u: .5, w: 1 };
        if (it.kind === 'suit' && res.accepted) { const ww = G.wearOf(n.id); G.dress(n.rig, ww.suit, ww.acc); }
        G.say(n.id, res.line, { mood: res.taste === 'refuse' ? 'sad' : 'happy' }); }
    }
  },
  /** a challenge: you and your partner against a pair */
  challenge(t) {
    const S = G.state;
    if (!S.partner) { G.say('pepper', 'You need a partner first. Team up with someone you get along with.'); return; }
    if (t.includes(S.partner)) { G.say(S.partner, 'Play against my own team? Nice try.'); return; }
    G.say(t[0], G.rpick('cosmetic', G.LINES[t[0]].taunt), { onDone: () => G.startMatch(G.vacationMatchCfg(t, { title: 'BEACH MATCH' })) });
  },
  draw(r) {
    const night = this.night, id = this.loc;
    if (id === 'beach' || id === 'pool' || id === 'promenade' || id === 'dock') G.backdrop(this.tod, G.state ? G.weatherNow() : 'sunny').draw(r);
    this.map.drawFloor(r); this.map.queueWalls(r);
    G.drawLocProps(r, id, night);
    for (const n of this.npcs) {
      if (n.kind !== 'swim') r.shadow(n.x, n.y, 6, .3);
      r.actor(n.x, n.y, n.z || 0, (g, ox, oy) => n.rig.draw(g, ox, oy, r.view), { key: n.rig, outline: (this.hover && this.hover.n === n) || (this.prompt && this.prompt.n === n) ? '#ffd36a' : undefined });
      if (n.kind === 'swim') r.queue(n.x, n.y + 1, 0, g => { const [sx, sy] = r.w(n.x, n.y, 0); px.blend(g, .7, 'normal', () => px.ell(g, sx, sy - 2, 9, 4, '#2ec4c9')); px.ell(g, sx, sy - 2, 9, 4, '#9ff3e8'); px.blend(g, .6, 'normal', () => px.ell(g, sx, sy - 2, 8, 3, '#2ec4c9')); }, { bias: 3 });
      if (G.state && G.state.partner === n.id) r.textAt(n.x, n.y, 52, '♥', '#ff5f7a');
    }
    r.shadow(this.hero.x, this.hero.y, 6, .35);
    r.actor(this.hero.x, this.hero.y, this.hero.z, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this.rig, xray: true });
    for (const [iid, label, x, y] of this.L.inter) { const on = (this.prompt && this.prompt.id === iid) || (this.hover && this.hover.id === iid); r.groundRing(x, y, on ? 9 : 6, on ? '#ffd36a' : '#ffffff', on ? 1 : .5); if (on) r.textAt(x, y, 28, label, '#ffd36a'); }
    if (this.hover && this.hover.kind === 'npc') r.textAt(this.hover.n.x, this.hover.n.y, 50, this.hover.label, '#ffd36a');
    if (night) G.game.lights.add(this.hero.x, this.hero.y, 30, 70, .5, { color: '#ffe0b0' });
    this.drawHud(r);
  },
  drawHud(r) {
    const S = G.state, I = G.game.input, P = this.panel;
    r.overlay(g => {
      const W = r.W, H = r.H, x0 = Math.round(W * .04), y0 = Math.round(H * .04);
      E.ui.box(g, x0, y0, E.font.width(this.L.name, { scale: 1 }) + 16, 15, { bg: G.UI.T.bg, border: G.UI.T.border, alpha: .9 }); E.font.text(g, this.L.name, x0 + 8, y0 + 4, '#ffd36a', { outline: false, shadow: '#000' });
      if (S) { G.UI.clock(g, Math.round(W * .96) - (G.game.cornerArea() ? 46 : 0), y0, S.day, S.slot, G.weatherNow(), 'right'); G.UI.money(g, x0, y0 + 18, S.money); if (S.partner) { G.portrait(g, S.partner, x0, y0 + 38, 20); G.UI.hearts(g, x0 + 24, y0 + 44, G.aff(S.partner)); } }
      if (P && P.kind === 'talk') {
        const n = P.n, id = n.id, a = G.aff(id), px0 = Math.round(W * .78) - 64, py0 = Math.round(H * .2) - 4;
        G.UI.panel(g, px0, py0, 128, 44 + P.items.length * 20);
        G.portrait(g, id, px0 + 4, py0 + 4, 30); E.font.text(g, G.CAST[id].short, px0 + 38, py0 + 5, '#ffd36a', { outline: false }); G.UI.mood(g, px0 + 38, py0 + 16, S.mood[id]); E.font.text(g, G.cap(S.mood[id] || 'normal'), px0 + 48, py0 + 16, '#9fd3d6', { outline: false });
        G.UI.hearts(g, px0 + 38, py0 + 26, a); E.font.text(g, G.UI.stage(a), px0 + 38, py0 + 36 - 1, '#fff8e8', { outline: false });
        this.layoutPanel().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      } else if (P && P.kind === 'board') {
        const L = this.layoutPanel(); G.UI.panel(g, Math.round(W / 2) - 124, Math.round(H * .12), 248, Math.round(H * .74));
        G.UI.heading(g, 'MATCH BOARD', Math.round(W / 2) - 112, Math.round(H * .14));
        E.font.text(g, S.partner ? 'Your partner: ' + G.CAST[S.partner].short : 'No partner yet', Math.round(W / 2) - 112, Math.round(H * .14) + 18, '#9fd3d6', { outline: false });
        L.forEach((it, k) => { G.UI.button(g, Object.assign({}, it, { align: 'left' }), k === this.focus.i); const t = P.pairs[it.id]; if (t) { const rec = S.record[t.slice().sort().join('+')] || [0, 0], sk = Math.round((G.DAY_BASE[S.day] + t.reduce((a, x) => a + G.CAST[x].stats.POW + G.CAST[x].stats.TEC, 0) / 60) * 3); E.font.text(g, '★'.repeat(clamp(sk, 1, 5)) + '  ' + rec[0] + '-' + rec[1], it.x + it.w - 8, it.y + 7, '#ffd36a', { align: 'right', outline: false }); } });
        if (!P.pairs.length) E.font.text(g, 'No teams on the courts right now.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false });
      } else if (P && P.kind === 'confirm') {
        G.UI.panel(g, Math.round(W / 2) - 110, Math.round(H * .38), 220, 52); E.font.text(g, P.text, W / 2, Math.round(H * .38) + 10, '#fff8e8', { align: 'center', outline: false });
        this.layoutPanel().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      } else if (P && P.kind === 'bag') {
        const tabs = ['Gifts', 'Swimsuits', 'Accessories'], L = this.layoutPanel(); G.UI.panel(g, Math.round(W / 2) - 140, Math.round(H * .1), 280, Math.round(H * .74));
        G.UI.heading(g, P.n ? 'GIVE ' + G.CAST[P.n.id].short.toUpperCase() + ' A GIFT' : 'GIFT BAG', Math.round(W / 2) - 128, Math.round(H * .12));
        tabs.forEach((t, k) => { const x = Math.round(W / 2) - 128 + k * 86; E.ui.box(g, x, Math.round(H * .12) + 18, 82, 12, { bg: k === P.tab ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 41, Math.round(H * .12) + 21, '#fff', { align: 'center', outline: false }); });
        L.forEach((it, k) => { const foc = k === this.focus.i, im = it.it; E.ui.box(g, it.x, it.y, it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : G.UI.T.border }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h); G.UI.itemIcon(g, it.x + 4, it.y + 6, im, 2); E.font.text(g, im.name, it.x + 40, it.y + 6, '#fff8e8', { outline: false, wrap: it.w - 42 });
          if (im.kind === 'gift') E.font.text(g, '×' + S.bag[im.id], it.x + it.w - 6, it.y + it.h - 11, '#ffd36a', { align: 'right', outline: false });
          const known = P.n && S.known[P.n.id] && S.known[P.n.id][im.id]; if (known) E.font.text(g, { love: '♥♥', like: '♥', neutral: '•', dislike: '×' }[known] || '', it.x + 40, it.y + it.h - 11, known === 'dislike' ? '#ff7a7a' : '#ff8ac8', { outline: false }); });
        if (!L.length) E.font.text(g, 'Nothing here. Shops on the Promenade sell gifts.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false });
      }
      if (this.demo) return;
    });
    G.talkBox().draw(r);
    if (G.talkBox().open) return;
    if (P) G.promptBar(r, P.kind === 'bag' ? [['confirm', P.n ? 'Give' : 'Look'], ['tabL', 'Tab'], ['tabR', 'Tab'], ['cancel', 'Back']] : [['confirm', 'Select'], ['cancel', 'Back']]);
    else { const list = []; if (this.prompt) list.push(['interact', this.prompt.kind === 'npc' ? 'Talk to ' + this.prompt.label : this.prompt.label]); list.push(['run', 'Run'], ['bag', 'Gift bag'], ['leave', 'Island map']); G.promptBar(r, list, I); }
  },
  /** the attract's scripted visits */
  demoStep(dt) {
    const n = this.npcs[0];
    if (this.demo === 'gift' && n) {
      const dx = n.x - this.hero.x, dy = n.y + 14 - this.hero.y, d = Math.hypot(dx, dy);
      if (d > 4 && !this.gave) { this.hero.vx = dx / d * 70; this.hero.vy = dy / d * 70; this.hero.facing = Math.atan2(dy, dx); }
      else { this.hero.vx = this.hero.vy = 0; this.hero.facing = -Math.PI / 2; if (!this.gave) { this.gave = true; this.rig.vb = { kind: 'give', u: .5, w: 1 }; G.sfx('gift_unwrap'); G.game.after(.6, () => { n.react = { kind: 'hop', t: 0, dur: 1.4 }; G.fx.hearts(n.x, n.y, 40, 12); G.sting('gift_love'); G.say(n.id, G.LINES[n.id].love[0], { auto: 3, modal: false }); }); } }
      this.hero.update(dt, this.map); G.talkBox().update(dt);
    } else if (this.demo === 'photo') { if (G.photo.st) { G.photo.st.yaw += dt * 30; G.photo.st.zoom = 1.3 + Math.sin(this.t) * .2; G.photo.st.pose = 2 + Math.floor(this.t) % 6; } }
  }
};
/** the place's own events as you arrive (casino opening, the overheard call, rain PA, …) */
G.locEvents = (id, sc) => { if (G.storyArrive) G.storyArrive(id, sc); };
G.restInVilla = () => {
  const S = G.state;
  if (S.slot === 2 || S.slot === 1) { const visit = G.villaVisit && G.villaVisit(); if (visit) return; }
  G.endSlot('rest');
};

// ==== 33-shop.js ====
/* 33-shop: the three shops (tabs, a 3 x 2 card grid, a detail panel, a live rig of you wearing the focused item on a
 * turning pedestal, try-on, daily deals, NEW / OWNED / WEARING badges), the wardrobe (yours, and a page for your
 * partner's accepted suits), the journal (Save, Friends with the likes you've learned, Stats) and the letters. */
G.ShopUI = class {
  constructor(shop, o = {}) { this.shop = shop; this.tab = 0; this.page = 0; this.focus = new G.Focus(); this.turn = 0; this.tryOn = true; this.o = o; this.quip = null; this.confirm = null; this.t = 0; }
  list() {
    const S = G.state, sh = G.SHOPS[this.shop], kind = sh.tabs[this.tab][1], day = S ? S.day : 5;
    return G.shopStock(this.shop, day).filter(it => kind === 'food' || kind === 'goods' ? it.cat === kind : kind === 'other' ? it.kind === 'gift' && !['food', 'goods'].includes(it.cat) || (it.kind === 'acc' && it.where === 'sundries') : it.kind === kind);
  }
  layout() { const W = G.game.W, H = G.game.H, L = this.list(), cw = Math.round(W * .17), ch = 40, x0 = Math.round(W * .05), y0 = Math.round(H * .26); return L.slice(this.page * 6, this.page * 6 + 6).map((it, k) => ({ id: it.id, it, x: x0 + (k % 3) * (cw + 5), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); }
  owned(it) { const S = G.state; if (!S) return false; return it.kind === 'suit' ? S.wardrobe.suits.includes(it.id) : it.kind === 'acc' ? S.wardrobe.acc.includes(it.id) : false; }
  update(dt, I = G.game.input) {
    this.t += dt; const S = G.state;
    if (this.confirm) { if (I.pressed('confirm')) { const c = this.confirm; this.confirm = null; this.buy(c, true); } else if (I.pressed('cancel')) this.confirm = null; return null; }
    const f = this.focus.set(this.layout()).update(I), n = this.list().length;
    if (f.back) return 'back';
    if (f.tabL || f.tabR) { this.tab = (this.tab + (f.tabR ? 1 : 2)) % 3; this.page = 0; this.focus.i = 0; }
    if (I.pressed('extra') && n > 6) { this.page = (this.page + 1) % Math.ceil(n / 6); this.focus.i = 0; }
    if (I.pressed('alt')) this.tryOn = !this.tryOn;
    const aim = I.padAim, pan = I.pan && I.pan(); this.turn += dt * .6 + (aim ? aim[0] * dt * 3 : 0) + (pan ? pan[0] * .03 : 0);
    if (f.pick) this.buy(f.pick.it);
    return null;
  }
  buy(it, ok) {
    const S = G.state; if (!S) return;
    const price = G.priceOf(it, this.shop);
    if (this.owned(it)) { G.sfx('ui_error'); this.quip = 'You already own that.'; return; }
    if (S.money < price) { G.sfx('ui_error'); this.quip = 'Short by ' + G.fmtMoney(price - S.money) + '.'; return; }
    if (!ok && price > S.money * .3) { this.confirm = it; return; }
    G.spend(price); G.sfx('cash');
    if (it.kind === 'suit') { S.wardrobe.suits.push(it.id); S.stats.suitsOwned = S.wardrobe.suits.length; G.unlock([it.id]); }
    else if (it.kind === 'acc') S.wardrobe.acc.push(it.id);
    else S.bag[it.id] = Math.min(9, (S.bag[it.id] || 0) + 1);
    this.quip = G.rpick('cosmetic', G.STAFF_LINES[G.SHOPS[this.shop].keeper]); this.quipT = 0; G.voice.say(this.quip, G.SHOPS[this.shop].keeper);
  }
  draw(r, I = G.game.input) {
    const S = G.state, sh = G.SHOPS[this.shop], cur = (this.focus.cur || {}).it;
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, H, '#061a24'));
      G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86));
      G.UI.heading(g, sh.name.toUpperCase(), Math.round(W * .05), Math.round(H * .06), { color: sh.color });
      if (S) G.UI.money(g, Math.round(W * .95), Math.round(H * .06), S.money, 'right');
      sh.tabs.forEach(([t], k) => { const x = Math.round(W * .05) + k * 78; E.ui.box(g, x, Math.round(H * .16), 74, 13, { bg: k === this.tab ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 37, Math.round(H * .16) + 3, '#fff', { align: 'center', outline: false }); });
      const L = this.layout(), deals = S ? S.deals[this.shop] || [] : [];
      L.forEach((it, k) => {
        const foc = k === this.focus.i, im = it.it, price = G.priceOf(im, this.shop), own = this.owned(im), poor = S && S.money < price && !own, wear = S && (S.wearing.suit === im.id || S.wearing.acc.includes(im.id));
        E.ui.box(g, it.x, it.y - (foc ? 1 : 0), it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : G.UI.T.border }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h);
        G.UI.itemIcon(g, it.x + 3, it.y + 4, im, 2);
        E.font.text(g, im.name, it.x + 38, it.y + 4, poor ? '#8a9aa0' : '#fff8e8', { outline: false, wrap: it.w - 40 });
        E.font.text(g, own ? 'OWNED' : G.fmtMoney(price), it.x + it.w - 5, it.y + it.h - 11, own ? '#7cff5a' : deals.includes(im.id) ? '#ff5f7a' : '#ffd36a', { align: 'right', outline: false });
        if (wear) E.font.text(g, 'WEARING', it.x + 38, it.y + it.h - 11, '#5ff0ff', { outline: false });
        if (S && (im.day || 1) === S.day && S.day > 1) { E.ui.box(g, it.x - 3, it.y - 4, 26, 10, { bg: '#ff5f7a', border: '#ffffff', gradient: false }); E.font.text(g, 'NEW', it.x + 1, it.y - 3, '#ffffff', { outline: false }); }
        if (deals.includes(im.id) && !own) { E.ui.box(g, it.x + it.w - 30, it.y - 4, 30, 10, { bg: '#ffd36a', border: '#ffffff', gradient: false }); E.font.text(g, '-25%', it.x + it.w - 27, it.y - 3, '#8a2a10', { outline: false }); }
      });
      const n = this.list().length; if (n > 6) E.font.text(g, 'Page ' + (this.page + 1) + ' / ' + Math.ceil(n / 6), Math.round(W * .05), Math.round(H * .26) + 94, '#9fd3d6', { outline: false });
      // the detail panel with the live rig
      const px0 = Math.round(W * .62), py0 = Math.round(H * .16), pw = Math.round(W * .33), ph = Math.round(H * .66);
      E.ui.box(g, px0, py0, pw, ph, { bg: ['#12475a', '#0a2d3d'], border: G.UI.T.border });
      if (cur) {
        E.font.text(g, cur.name, px0 + 6, py0 + 5, '#ffd36a', { outline: false });
        if (cur.tastes) E.font.text(g, 'Style: ' + cur.tastes.join(', '), px0 + 6, py0 + 15, '#9fd3d6', { outline: false });
        if (cur.kind === 'gift') E.font.text(g, G.cap(cur.cat) + ' gift', px0 + 6, py0 + 15, '#9fd3d6', { outline: false });
        if ((cur.kind === 'suit' || cur.kind === 'acc') && S) {
          const me = S.me, key = me + '|' + (this.tryOn ? cur.id : 'cur'); if (!this._rig || this._rig.key !== key) { const w = S.wearing; this._rig = G.anim.rig(G.makeRig(me, { suit: this.tryOn && cur.kind === 'suit' ? cur.id : w.suit, acc: this.tryOn && cur.kind === 'acc' ? w.acc.filter(a => G.ITEMS[a].anchor !== cur.anchor).concat(cur.id) : w.acc, size: 2.3 })); this._rig.key = key; }
          this._rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: this.turn, pose: Math.sin(this.t * .7) > .7 ? 'hips' : null, expr: 'smile' });
          px.ell(g, px0 + pw / 2, py0 + ph - 18, 26, 6, '#0a2d3d'); this._rig.draw(g, px0 + pw / 2, py0 + ph - 18, G.VIEW_COURT);
          E.font.text(g, this.tryOn ? 'TRY-ON' : 'YOUR OUTFIT', px0 + pw - 6, py0 + 5, '#5ff0ff', { align: 'right', outline: false });
        } else if (cur) { G.UI.itemIcon(g, px0 + pw / 2 - 24, py0 + ph / 2 - 30, cur, 3); const kn = S ? G.npcs().filter(id => S.known[id] && S.known[id][cur.id]).map(id => G.CAST[id].short + ': ' + S.known[id][cur.id]) : []; kn.slice(0, 4).forEach((l, k) => E.font.text(g, l, px0 + 6, py0 + ph - 46 + k * 9, '#ff8ac8', { outline: false })); }
      }
      // the keeper's quip
      const kp = sh.keeper; G.portrait(g, kp, Math.round(W * .05), Math.round(H * .74), 26);
      E.font.text(g, (this.quip || G.STAFF_LINES[kp][0]), Math.round(W * .05) + 32, Math.round(H * .74) + 8, '#fff8e8', { outline: false, wrap: Math.round(W * .5) });
      if (this.confirm) { G.UI.panel(g, W / 2 - 110, H * .42, 220, 40); E.font.text(g, 'Buy ' + this.confirm.name + ' for ' + G.fmtMoney(G.priceOf(this.confirm, this.shop)) + '?', W / 2, H * .42 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm', I) + ' Yes   ' + G.btn('cancel', I) + ' No', W / 2, H * .42 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    G.promptBar(r, [['confirm', 'Buy'], ['alt', 'Try on'], ['tabL', 'Tab'], ['tabR', 'Tab'], ['extra', 'Page'], ['cancel', 'Leave']], I);
  }
};
G.SCENES.shop = {
  pausable: true, input: G.INPUT.MENU, view: 'threequarter',
  enter(d) { this.d = d || {}; this.ui = new G.ShopUI(this.d.shop || 'coral'); G.music('boutique'); G.UI.theme = 'day'; this.t = 0; this.loc = G.locMaps().promenade; G.game.focus(288, 100, 0); },
  update(dt) {
    this.t += dt;
    if (this.d.demo) { this.ui.tab = 0; this.ui.focus.i = Math.floor(this.t / .9) % Math.max(1, this.ui.layout().length); this.ui.focus.set(this.ui.layout()); this.ui.turn += dt; this.ui.t += dt; return; }
    const res = this.ui.update(dt); if (res === 'back') G.go('location', this.d.back || { loc: 'promenade' }, { fade: .2 });
  },
  draw(r) { this.loc.drawFloor(r); G.drawLocProps(r, 'promenade', false); this.ui.draw(r); }
};
/* ---- the wardrobe: your suits and accessories (equip with confirm, remove an accessory with Option), and your partner's ---- */
G.SCENES.wardrobe = {
  pausable: true, input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.page = 0; this.tab = 0; this.focus = new G.Focus(); this.turn = 0; G.music('boutique'); },
  list() { const S = G.state; if (this.tab === 2) return (S.partner ? [S.npcWear[S.partner].suit] : []).concat(S.wardrobe.suits.filter(() => false)).map(id => G.ITEMS[id]); return this.tab === 0 ? S.wardrobe.suits.map(id => G.ITEMS[id]) : S.wardrobe.acc.map(id => G.ITEMS[id]); },
  layout() { const W = G.game.W, H = G.game.H, L = this.list(), cw = Math.round(W * .17), ch = 40, x0 = Math.round(W * .05), y0 = Math.round(H * .26); return L.slice(this.page * 6, this.page * 6 + 6).map((it, k) => ({ id: it.id, it, x: x0 + (k % 3) * (cw + 5), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); },
  update(dt) {
    const S = G.state, I = G.game.input, f = this.focus.set(this.layout()).update(); this.turn += dt * .7 + (I.padAim ? I.padAim[0] * dt * 3 : 0);
    if (f.back) { G.go('location', this.d.back || { loc: 'villa' }, { fade: .2 }); return; }
    if (f.tabL || f.tabR) { this.tab = (this.tab + (f.tabR ? 1 : 2)) % 3; this.page = 0; this.focus.i = 0; }
    if (I.pressed('extra')) { const n = this.list().length; this.page = (this.page + 1) % Math.max(1, Math.ceil(n / 6)); }
    const cur = this.focus.cur && this.focus.cur.it;
    if (f.pick && cur && this.tab < 2) { if (cur.kind === 'suit') S.wearing.suit = cur.id; else { S.wearing.acc = S.wearing.acc.filter(a => G.ITEMS[a].anchor !== cur.anchor).concat(cur.id); } G.sfx('ui_select'); G.rigs[S.me] = null; }
    if (I.pressed('alt') && cur && cur.kind === 'acc') { S.wearing.acc = S.wearing.acc.filter(a => a !== cur.id); G.rigs[S.me] = null; G.sfx('ui_back'); }
  },
  draw(r) {
    const S = G.state, me = S.me, who = this.tab === 2 && S.partner ? S.partner : me, w = G.wearOf(who);
    G.backdrop('afternoon').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86));
      G.UI.heading(g, 'WARDROBE', Math.round(W * .05), Math.round(H * .06));
      ['Swimsuits', 'Accessories', S.partner ? G.CAST[S.partner].short + '\'s' : 'Partner'].forEach((t, k) => { const x = Math.round(W * .05) + k * 78; E.ui.box(g, x, Math.round(H * .16), 74, 13, { bg: k === this.tab ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 37, Math.round(H * .16) + 3, '#fff', { align: 'center', outline: false }); });
      this.layout().forEach((it, k) => { const foc = k === this.focus.i, im = it.it, wear = w.suit === im.id || (w.acc || []).includes(im.id); E.ui.box(g, it.x, it.y, it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : G.UI.T.border }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h); G.UI.itemIcon(g, it.x + 3, it.y + 4, im, 2); E.font.text(g, im.name, it.x + 38, it.y + 4, '#fff8e8', { outline: false, wrap: it.w - 40 }); if (wear) E.font.text(g, 'WEARING', it.x + 38, it.y + it.h - 11, '#5ff0ff', { outline: false }); });
      if (this.tab === 2 && !S.partner) E.font.text(g, 'Team up with someone to see her wardrobe.', W * .3, H * .4, '#fff8e8', { align: 'center', outline: false });
      const px0 = Math.round(W * .62), py0 = Math.round(H * .16), pw = Math.round(W * .33), ph = Math.round(H * .66);
      E.ui.box(g, px0, py0, pw, ph, { bg: ['#12475a', '#0a2d3d'], border: G.UI.T.border });
      const cur = this.focus.cur && this.focus.cur.it, key = who + (this.tab < 2 && cur ? cur.id : '') + (w.suit) + (w.acc || []).join();
      if (!this._rig || this._rig.key !== key) { this._rig = G.anim.rig(G.makeRig(who, { suit: this.tab === 0 && cur ? cur.id : w.suit, acc: this.tab === 1 && cur ? (w.acc || []).filter(a => G.ITEMS[a].anchor !== cur.anchor).concat(cur.id) : w.acc, size: 2.3 })); this._rig.key = key; }
      this._rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: this.turn, expr: 'smile' }); px.ell(g, px0 + pw / 2, py0 + ph - 18, 26, 6, '#0a2d3d'); this._rig.draw(g, px0 + pw / 2, py0 + ph - 18, G.VIEW_COURT);
      E.font.text(g, G.CAST[who].short, px0 + 6, py0 + 5, '#ffd36a', { outline: false });
    });
    G.promptBar(r, [['confirm', 'Wear'], ['alt', 'Remove accessory'], ['tabL', 'Tab'], ['tabR', 'Tab'], ['cancel', 'Back']]);
  }
};
/* ---- the journal: Save, Friends (hearts, moods and the likes you've learned), Stats ---- */
G.SCENES.journal = {
  pausable: true, input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.page = this.d.page || 0; this.focus = new G.Focus(); this.sel = 0; G.music('siesta'); },
  items() { const W = G.game.W, H = G.game.H; if (this.page === 0) return [{ id: 'save', label: 'Save the vacation', x: Math.round(W / 2) - 80, y: Math.round(H * .32), w: 160, h: 20 }, { id: 'load', label: 'Load a save', x: Math.round(W / 2) - 80, y: Math.round(H * .32) + 26, w: 160, h: 20 }]; if (this.page === 1) return G.npcs().map((id, k) => ({ id, label: G.CAST[id].short, x: Math.round(W * .06), y: Math.round(H * .2) + k * 22, w: 110, h: 20 })); return []; },
  update(dt) {
    const I = G.game.input, f = this.focus.set(this.items()).update();
    if (f.back) { if (this.d.back === 'map') G.go('map'); else G.go('location', this.d.back || { loc: 'villa' }, { fade: .2 }); return; }
    if (f.tabL || f.tabR) { this.page = (this.page + (f.tabR ? 1 : 2)) % 3; this.focus.i = 0; }
    if (f.pick && f.pick.id === 'save') { G.game.saves.canSave = true; G.game.saves.show('save', () => G.toast('Saved', 'Day ' + G.state.day)); }
    if (f.pick && f.pick.id === 'load') G.game.saves.show('load', s => { if (s) G.resumeVacation(); });
  },
  draw(r) {
    const S = G.state; G.backdrop('night').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86));
      ['Save', 'Friends', 'Stats'].forEach((t, k) => { const x = Math.round(W * .05) + k * 78; E.ui.box(g, x, Math.round(H * .07), 74, 13, { bg: k === this.page ? ['#ff9e5e', '#c86a3a'] : G.UI.T.bg, border: G.UI.T.border, gradient: false }); E.font.text(g, t, x + 37, Math.round(H * .07) + 3, '#fff', { align: 'center', outline: false }); });
      const L = this.items(); L.forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      if (this.page === 0) { G.UI.heading(g, 'JOURNAL', W / 2, Math.round(H * .17), { align: 'center' }); E.font.text(g, G.CAST[S.me].name + ' • Day ' + S.day + ' • ' + G.SLOTS[S.slot], W / 2, Math.round(H * .25), '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'The game also saves by itself at the start of every slot.', W / 2, Math.round(H * .55), '#9fd3d6', { align: 'center', outline: false }); }
      if (this.page === 1) { const cur = this.focus.cur; L.forEach(it => { const id = it.id; G.UI.hearts(g, it.x + 120, it.y + 5, G.aff(id)); G.UI.mood(g, it.x + 172, it.y + 6, S.mood[id]); }); if (cur) { const id = cur.id, x = Math.round(W * .54), y = Math.round(H * .2); G.portrait(g, id, x, y, 40); E.font.text(g, G.CAST[id].name, x + 46, y, '#ffd36a', { outline: false }); E.font.text(g, '"' + G.CAST[id].epithet + '"  ' + G.UI.stage(G.aff(id)), x + 46, y + 10, '#fff8e8', { outline: false }); E.font.text(g, G.CAST[id].personality, x + 46, y + 20, '#9fd3d6', { outline: false, wrap: Math.round(W * .36) - 46 });
          E.font.text(g, 'Likes you\'ve learned:', x, y + 50, '#ffd36a', { outline: false }); const kn = Object.entries(S.known[id] || {}); if (!kn.length) E.font.text(g, 'Nothing yet. Try a gift.', x, y + 60, '#9fd3d6', { outline: false });
          kn.slice(0, 8).forEach(([it, t], k) => { G.UI.itemIcon(g, x + (k % 4) * 44, y + 60 + Math.floor(k / 4) * 26, G.ITEMS[it], 1); E.font.text(g, { love: '♥♥', like: '♥', neutral: '•', dislike: '×' }[t] || t, x + (k % 4) * 44 + 18, y + 64 + Math.floor(k / 4) * 26, t === 'dislike' ? '#ff7a7a' : '#ff8ac8', { outline: false }); }); } }
      if (this.page === 2) { const st = S.stats, rows = [['Matches', st.matches + ' (' + st.wins + ' won)'], ['Points', st.points], ['Kills • Aces • Blocks', st.kills + ' • ' + st.aces + ' • ' + st.blocks], ['Money earned', G.fmtMoney(st.earned)], ['Money spent', G.fmtMoney(st.spent)], ['Swimsuits', S.wardrobe.suits.length + ' / 21'], ['Gifts given', st.gifts], ['Best Pool Hop', st.poolBest ? st.poolBest.toFixed(1) + ' s' : '-'], ['Casino', (st.casinoNet >= 0 ? '+' : '') + st.casinoNet + ' chips'], ['Postcards', S.album.length]];
        rows.forEach(([k, v], i) => { const x = Math.round(W * .1) + (i % 2) * Math.round(W * .42), y = Math.round(H * .22) + Math.floor(i / 2) * 26; E.font.text(g, k, x, y, '#9fd3d6', { outline: false }); E.font.text(g, String(v), x, y + 10, '#fff8e8', { scale: 1, outline: false }); }); }
    });
    G.promptBar(r, [['tabL', 'Page'], ['tabR', 'Page'], ['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
/* ---- letters: the mailbox at the villa ---- */
G.openLetters = () => {
  const S = G.state, unread = S.letters.filter(l => !S.read[l]), list = unread.length ? unread : S.letters.slice(-1);
  if (!list.length) { G.say('pepper', 'No mail. Mr. Fortuna is presumably busy.'); return; }
  const go = k => { if (k >= list.length) return; const L = G.LETTERS[list[k]]; S.read[list[k]] = true; G.say(L.from, L.text, { onDone: () => { if (L.after) L.after(); go(k + 1); } }); };
  G.sfx('door'); go(0);
};

// ==== 34-story.js ====
/* 34-story: the story. A cutscene is a list of steps run on a staged place (its map, props and cast): say, walk, face,
 * act (a move), emote balloons, waits, camera moves, choices, effects. Options asks "Skip scene?". The events: the
 * invitation and character select, the arrival, the welcome match, the casino opening, the villa visit, the rain, the
 * overheard call, Pepper's letter, the semifinal, the Fortuna Cup final, the farewell party, two endings, credits. */
G.SCENES.cutscene = {
  pausable: false, view: 'threequarter', input: G.INPUT.MENU, camera: { zoom: [.9, 1.6], start: 1.25 },
  enter(d) {
    this.d = d; this.i = -1; this.wait = 0; this.t = 0; this.emotes = []; this.skipAsk = false; this.busy = null;
    this.loc = d.loc || 'beach'; this.map = G.locMaps()[this.loc]; this.tod = d.tod || (G.state ? G.todNow() : 'afternoon'); G.curTod = this.tod;
    this.cast = (d.cast || []).map(c => { const w = c.suit ? { suit: c.suit, acc: c.acc || [] } : G.wearOf(c.id); const rig = G.anim.rig(G.makeRig(c.id, (G.CAST[c.id].shirt || G.CAST[c.id].robe) && !c.suit ? {} : { suit: w.suit, acc: w.acc })); return Object.assign({ rig, f: Math.PI / 2, z: 0, act: null }, c); });
    G.applyLight(this.tod, 'sunny', this.tod === 'night'); G.UI.theme = this.tod === 'night' ? 'night' : 'day';
    G.music(d.music || 'island'); G.ambience.set(this.tod === 'night' ? 'night' : 'beach');
    this.cam = d.cam ? d.cam.slice() : [352, 260]; this.zoom = d.zoom || 1.2; G.game.setZoom(this.zoom); G.game.cam.bounds = null; G.game.cam.smooth = .3;
    G.talkBox().close(); this.next();
    G.photoSubjects = () => this.cast.map(c => ({ id: c.id, rig: c.rig }));
  },
  exit() { G.game.setZoom(1); G.photoSubjects = null; },
  who(id) { return this.cast.find(c => c.id === id); },
  next() {
    this.i++; const st = this.d.steps[this.i];
    if (!st) { const then = this.d.then; this.d.then = null; if (then) then(); return; }
    const [op, a, b, c, e] = st;
    if (op === 'say') { this.busy = 'say'; G.say(a, b, Object.assign({}, c || {}, { onDone: () => { this.busy = null; this.next(); } })); }
    else if (op === 'choice') { this.busy = 'say'; G.say(a, b, { choices: c, onChoice: k => { this.busy = null; if (e) e(k); this.next(); } }); }
    else if (op === 'walk') { const w = this.who(a); if (w) { this.tw = { w, x0: w.x, y0: w.y, x1: b, y1: c, t: 0, dur: e || 1 }; w.f = Math.atan2(c - w.y, b - w.x); } this.wait = e || 1; }
    else if (op === 'face') { const w = this.who(a); if (w) w.f = b; this.next(); }
    else if (op === 'act') { const w = this.who(a); if (w) w.act = { kind: b, t: 0, dur: c || 1, o: e || {} }; this.next(); }
    else if (op === 'emote') { const w = this.who(a); if (w) this.emotes.push({ w, kind: b, t: 0 }); G.sfx(b === 'heart' ? 'heart_up' : 'ui_tick'); this.next(); }
    else if (op === 'wait') this.wait = a;
    else if (op === 'cam') { this.camTo = { x0: this.cam[0], y0: this.cam[1], x1: a, y1: b, z0: this.zoom, z1: c || this.zoom, t: 0, dur: e || 1 }; this.wait = e || 1; }
    else if (op === 'fx') { if (a) a(this); this.next(); }
    else if (op === 'fade') { G.game.flash(a || '#000000', .4); this.next(); }
    else this.next();
  },
  skip() { G.talkBox().close(); this.busy = null; const then = this.d.then; this.d.then = null; this.d.steps = []; if (this.d.onSkip) this.d.onSkip(); if (then) then(); },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.skipAsk) { if (I.pressed('confirm')) { this.skipAsk = false; this.skip(); } else if (I.pressed('cancel') || I.pressed('pause')) this.skipAsk = false; return; }
    if (I.pressed('pause') || I.pressed('start') && !G.talkBox().open) { this.skipAsk = true; return; }
    if (this.tw) { const T = this.tw; T.t += dt; const u = Math.min(1, T.t / T.dur); T.w.x = lerp(T.x0, T.x1, u); T.w.y = lerp(T.y0, T.y1, u); T.w.moving = u < 1; if (u >= 1) this.tw = null; }
    if (this.camTo) { const C = this.camTo; C.t += dt; const u = E.ease.inOutSine(Math.min(1, C.t / C.dur)); this.cam = [lerp(C.x0, C.x1, u), lerp(C.y0, C.y1, u)]; this.zoom = lerp(C.z0, C.z1, u); G.game.setZoom(this.zoom); if (u >= 1) this.camTo = null; }
    G.game.focus(this.cam[0], this.cam[1], 10);
    for (const c of this.cast) {
      let vb = null, pose = c.pose || null, z = c.z || 0, flip = 0, down = c.down || 0;
      if (c.act) { c.act.t += dt; const u = c.act.t / c.act.dur; if (u >= 1) c.act = null; else { const k = c.act.kind; vb = G.MOVES[k] ? { kind: k, u, w: G.anim.weight(u) } : null; pose = G.anim.pose(k) || c.act.o.pose || pose; if (c.act.o.hop) z += Math.abs(Math.sin(u * Math.PI * 3)) * c.act.o.hop; if (c.act.o.flip) flip = u; if (c.act.o.fall) down = Math.min(1, u * 2); } }
      c.rig.vb = vb; const sp = c.moving ? 60 : 0;
      c.rig.update(dt, { x: c.x, y: c.y, z, vx: Math.cos(c.f) * sp, vy: Math.sin(c.f) * sp, facing: c.f, pose, flip, down, air: flip > 0, expr: c.expr || (G.talkBox().open && G.talkBox().name === G.CAST[c.id].short.toUpperCase() ? 'smile' : null) });
      c.moving = false;
    }
    this.emotes = this.emotes.filter(e => (e.t += dt) < 1.4);
    if (this.d.tick) this.d.tick(this, dt);
    if (this.busy === 'say') { G.talkBox().update(dt); return; }
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) this.next(); }
    if (G.talkBox().open) G.talkBox().update(dt);
  },
  draw(r) {
    const night = this.tod === 'night';
    if (this.loc !== 'villa' && this.loc !== 'casino') G.backdrop(this.tod).draw(r);
    this.map.drawFloor(r); this.map.queueWalls(r); G.drawLocProps(r, this.loc, night);
    if (this.d.drawExtra) this.d.drawExtra(r, this);
    for (const c of this.cast) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z || 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); }
    for (const e of this.emotes) { const w = e.w, z = 52 + e.t * 6; r.queue(w.x, w.y, z, g => { const [sx, sy] = r.w(w.x, w.y, z), X = Math.round(sx), Y = Math.round(sy); px.disc(g, X, Y, 6, '#ffffff'); px.disc(g, X, Y, 5, '#fff8e8'); const ic = { heart: '♥', '!': '!', '?': '?', note: '♪', dots: '...' }[e.kind] || '!'; E.font.text(g, ic, X, Y - 3, e.kind === 'heart' ? '#ff5f7a' : '#2a2e3c', { align: 'center', outline: false }); }, { bias: 80 }); }
    if (night) G.game.lights.add(this.cam[0], this.cam[1], 30, 140, .6, { color: '#ffd8a0' });
    G.talkBox().draw(r);
    r.overlay(g => {
      if (this.d.caption && this.t < 6) { E.font.title(g, this.d.caption, r.W / 2, Math.round(r.H * .12), { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 }); }
      if (this.skipAsk) { G.UI.panel(g, r.W / 2 - 90, r.H * .4, 180, 40); E.font.text(g, 'Skip scene?', r.W / 2, r.H * .4 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes   ' + G.btn('cancel') + ' No', r.W / 2, r.H * .4 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    if (!this.skipAsk) G.promptBar(r, [['confirm', 'Next'], ['pause', 'Skip']], G.game.input, 6);
  }
};
G.cutscene = (d, o) => G.go('cutscene', d, o || { fade: .5 });
/* ---- the invitation, on parchment with Sonny's gold seal ---- */
G.SCENES.invitation = {
  input: G.INPUT.MENU,
  exit() { G.game.setZoom(1); },
  enter(d) { this.d = d || {}; this.t = 0; G.applyLight('sunset'); this.text = 'You are cordially invited to the AHEAD OR ALIVE Invitational on the private island of Isla Fortuna.\n\nPrize: everything.\n\n— S. Fortuna, Esq.'; this.hook = G.voice.hook('sonny'); this.shown = 0; G.music('sunrise'); },
  update(dt) {
    this.t += dt; const I = G.game.input, prev = Math.floor(this.shown); this.shown = Math.min(this.text.length, this.shown + dt * 40); for (let n = prev; n < Math.floor(this.shown); n++) this.hook(this.text[n], n, this.text);
    if (I.pressed('cancel')) { G.go('menu'); return; }
    if (I.pressed('confirm') || I.clicked()) { if (this.shown < this.text.length) this.shown = this.text.length; else G.go('charselect', this.d); }
  },
  draw(r) {
    if (!this.cast) this.cast = G.titleCast(); G.updateCast(this.cast, 1 / 60, this.t || 0); G.game.focus(352, 96, 30); G.game.setZoom(1.3);
    G.drawBeachStage(r, this.cast, 'sunset');
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(300, W - 40), h = Math.round(H * .72), x = Math.round(W / 2 - w / 2), y = Math.round(H * .1);
      px.blend(g, .45, 'multiply', () => px.rect(g, 0, 0, W, H, '#5a3a6a'));
      E.ui.box(g, x + 4, y + 4, w, h, { bg: '#2a1020', border: '#2a1020', gradient: false, alpha: .5 });
      E.ui.box(g, x, y, w, h, { bg: ['#fbf2dc', '#e0c890'], border: '#c89020' });
      for (let k = 0; k < 40; k++) { const sx = x + 6 + (E.hash2(k, 3) * (w - 12)) | 0, sy = y + 6 + (E.hash2(k, 7) * (h - 12)) | 0; px.dot(g, sx, sy, k % 2 ? '#e8d4a8' : '#f0dcb0'); }
      for (const [cx, cy] of [[x + 8, y + 8], [x + w - 9, y + 8], [x + 8, y + h - 9], [x + w - 9, y + h - 9]]) { px.disc(g, cx, cy, 3, '#ffd36a'); px.dot(g, cx - 1, cy - 1, '#fff3c0'); }
      for (let k = 0; k < 6; k++) px.dot(g, x + 6 + k * 40, y + h - 5, '#c8a870');
      E.font.title(g, 'AN INVITATION', W / 2, y + 10, { scale: 2, colors: ['#c89020', '#8a5a10'], align: 'center', depth: 1, depthColor: '#5a3a10' });
      E.font.text(g, this.text.slice(0, Math.floor(this.shown)), x + 16, y + 40, '#3a2410', { outline: false, wrap: w - 32, lineGap: 2 });
      px.disc(g, x + w - 32, y + h - 30, 14, '#c89020'); px.disc(g, x + w - 32, y + h - 30, 11, '#ffd36a'); E.font.text(g, 'SF', x + w - 32, y + h - 34, '#8a5a10', { align: 'center', outline: false });
      if (this.shown >= this.text.length) E.font.text(g, 'Who opened it?', W / 2, y + h + 8, '#fff8e8', { align: 'center', shadow: '#000', outline: false, scale: 1 });
    });
    G.promptBar(r, [['confirm', 'Continue'], ['cancel', 'Back']]);
  }
};
/* ---- character select: six cards with portraits, epithets, styles, stats as bars and tastes ---- */
G.SCENES.charselect = {
  input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.focus = new G.Focus(); this.t = 0; this.rigs = {}; },
  layout() { const W = G.game.W, H = G.game.H, cw = Math.round(W * .14), ch = Math.round(H * .3), x0 = Math.round(W / 2 - (cw * 3 + 12) / 2), y0 = Math.round(H * .14); return G.FIGHTERS.map((id, k) => ({ id, x: x0 + (k % 3) * (cw + 6), y: y0 + Math.floor(k / 3) * (ch + 6), w: cw, h: ch })); },
  update(dt) {
    this.t += dt; const f = this.focus.set(this.layout()).update();
    if (f.back) { G.go('invitation', this.d); return; }
    if (f.pick) G.beginVacation(f.pick.id, this.d.ngPlus);
  },
  draw(r) {
    G.backdrop('afternoon').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, L = this.layout(); G.UI.title(g, 'WHO OPENED IT?', W / 2, Math.round(H * .03), { scale: 2 });
      L.forEach((it, k) => { const c = G.CAST[it.id], foc = k === this.focus.i; E.ui.box(g, it.x, it.y - (foc ? 1 : 0), it.w, it.h, { bg: foc ? ['#1f7a8c', '#12475a'] : G.UI.T.bg, border: foc ? '#ffd36a' : c.color }); if (foc) G.UI.focus(g, it.x, it.y, it.w, it.h);
        G.portrait(g, it.id, it.x + it.w / 2 - 16, it.y + 4, 32); E.font.text(g, c.short, it.x + it.w / 2, it.y + 40, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, c.epithet, it.x + it.w / 2, it.y + 50, '#fff8e8', { align: 'center', outline: false, wrap: it.w - 4 }); });
      const cur = G.CAST[this.focus.cur.id], x = Math.round(W * .06), y = Math.round(H * .78);
      G.UI.panel(g, x - 4, y - 4, Math.round(W * .88), Math.round(H * .18));
      E.font.text(g, cur.name + ' • ' + cur.from + ' • ' + cur.style + ' • ' + cur.age, x + 2, y, '#ffd36a', { outline: false });
      E.font.text(g, cur.personality, x + 2, y + 10, '#fff8e8', { outline: false, wrap: Math.round(W * .5) });
      G.STATS_ORDER.forEach((s, k) => { const bx = Math.round(W * .6) + (k % 2) * Math.round(W * .17), by = y + Math.floor(k / 2) * 14; E.font.text(g, G.STAT_NAMES[s], bx, by, '#9fd3d6', { outline: false }); E.ui.bar(g, bx + 46, by + 1, 40, 5, cur.stats[s] / 10, '#ff9e5e'); });
      E.font.text(g, 'Likes: ' + cur.tastes.join(', ') + ' styles', x + 2, y + 30, '#ff8ac8', { outline: false });
    });
    G.promptBar(r, [['confirm', 'Choose'], ['cancel', 'Back']]);
  }
};
G.newVacationFlow = (ngPlus) => G.go('invitation', { ngPlus });
G.beginVacation = (me, ngPlus) => {
  const old = G.state, seed = (G.hash(me + ':' + Date.now()) % 100000) + 1;
  G.state = G.newState(me, seed); const S = G.state;
  if (ngPlus && old) { S.ngPlus = (old.ngPlus || 0) + 1; S.wardrobe.suits = Array.from(new Set(old.wardrobe.suits.concat(S.wardrobe.suits))); S.wardrobe.acc = Array.from(new Set(old.wardrobe.acc.concat(S.wardrobe.acc))); S.album = old.album.slice(); S.stats = Object.assign({}, old.stats); S.money = G.T.startMoney + Math.round(old.money * .1); for (const id of G.npcs()) S.affinity[id] = clamp(G.baseAff(me, id) + 10, 0, 100); }
  G.rigs = {}; G.dayStart(); G.unlock(S.wardrobe.suits);
  G.storyArrival();
};
/* ---- D1 morning: the arrival at the dock, then the welcome match ---- */
G.storyArrival = () => {
  const S = G.state, me = S.me, others = G.npcs(), line = id => ({ rin: 'Hm. No ring. No referee. Suspicious.', lola: '¡Hola, island! La Tormenta has ARRIVED!', ingrid: 'It is hot. Why is it so hot.', amara: 'Okay, this place is GORGEOUS.', tess: 'Waves look sick. Where\'s the fight, though?', mei: 'I already found three hiding spots. Hehe.' }[id]);
  const cast = [{ id: me, x: 120, y: 150, f: 0 }].concat(others.map((id, k) => ({ id, x: [116, 148, 232, 264, 290][k], y: [168, 176, 176, 168, 156][k], f: Math.PI / 2 }))).concat([{ id: 'sonny', x: 176, y: 120, f: Math.PI / 2 }, { id: 'pepper', x: 210, y: 116, f: Math.PI / 2 }]);
  const steps = [['wait', .6], ['walk', me, 190, 150, 1.4], ['face', me, Math.PI / 2], ['say', 'pepper', 'Welcome to Isla Fortuna. Please keep your hands and fists inside the island at all times.']];
  for (const id of others) steps.push(['act', id, 'wave', 1], ['say', id, line(id)]);
  steps.push(['act', 'sonny', 'cheer', 1.4, { hop: 4 }], ['say', 'sonny', ['WELCOME, FIGHTERS, TO ISLA FORTUNA!', 'The tournament of the century is... drumroll... BEACH VOLLEYBALL!']], ['emote', me, '?'], ['emote', others[0], '!'],
    ['say', 'sonny', 'And a VACATION! You\'re welcome!'], ['say', 'pepper', ['Villa keys. Sunscreen is in the minibar. The Cup is in five days.', 'Every activity takes a morning, an afternoon or a night. Mr. Fortuna is not taking questions.']],
    ['say', 'pepper', 'Please don\'t feed him.'], ['say', 'sonny', 'Allow me to DEMONSTRATE! A friendly match, CHAMP!']);
  G.cutscene({ loc: 'dock', tod: 'morning', cast, cam: [190, 136], zoom: 1.4, music: 'island', caption: 'DAY 1 • ARRIVAL', steps, then: () => S.ngPlus ? G.say('pepper', 'You have done this before. Skip the Welcome Match?', { choices: ['Play it again', 'Skip it'], onChoice: k => k ? G.skipWelcome() : G.storyWelcome() }) : G.storyWelcome() });
};
/** New Vacation+: the starter partner and the prize, without the match */
G.skipWelcome = () => {
  const S = G.state, partner = G.npcs().slice().sort((a, b) => G.aff(b) - G.aff(a))[0];
  S.partner = partner; S.flags.tutorial = true; G.earn(10000, 'tutorial');
  G.say('pepper', 'Very well. ' + G.CAST[partner].short + ' is your partner. The prize money is in your account.', { onDone: () => G.endSlot('match') });
};
G.storyWelcome = () => {
  const S = G.state, partner = G.npcs().slice().sort((a, b) => G.aff(b) - G.aff(a))[0]; S.partner = partner;
  G.say('pepper', 'I have paired you with ' + G.CAST[partner].short + '. You get along best. Statistically.');
  const cfg = G.vacationMatchCfg(['sonny', 'pepper'], { partner, points: 5, title: 'THE WELCOME MATCH', base: [.2, .35], kits: ['house_sonny', 'pinstripe'], accs: [['aviators'], []], tutorial: true, prize: 10000, losePrize: 10000,
    next: () => { S.flags.tutorial = true; G.cutscene({ loc: 'beach', tod: 'morning', cam: [352, 250], cast: [{ id: 'sonny', x: 360, y: 240, f: Math.PI }, { id: 'pepper', x: 390, y: 236, f: Math.PI }, { id: S.me, x: 320, y: 240, f: 0 }, { id: partner, x: 300, y: 250, f: 0 }],
      steps: [['act', 'sonny', 'cheer', .8], ['say', 'sonny', 'FIVE PERCENT EFFORT! I was giving you FIVE PERCENT!'], ['act', 'sonny', 'fall', 2.2], ['wait', .5], ['say', 'pepper', 'He tripped on the sand. Again. Your prize money is in your account.'], ['say', partner, G.LINES[partner].win[0]]],
      then: () => G.endSlot('match') }); } });
  G.startMatch(cfg);
};
/* ---- the events that start a slot ---- */
G.slotEvent = () => {
  const S = G.state;
  if (S.day === 4 && S.slot === 1 && !S.flags.semiDone) return () => G.storySemifinal();
  if (S.day === 5 && S.slot === 1 && !S.flags.finalDone) return () => G.storyFinal();
  if (S.day === 5 && S.slot === 2 && !S.flags.partyDone) return () => G.storyParty();
  if (S.day === 3 && S.slot === 1 && !S.flags.rainPA) return () => { S.flags.rainPA = true; G.go('map'); G.game.after(.8, () => G.say('sonny', ['LIQUID SUNSHINE, PEOPLE!', 'The courts are OPEN! Wet balls are a FEATURE!'])); };
  return null;
};
/** the partner for a big match: yours, or Pepper assigns the free fighter */
G.ensurePartner = () => { const S = G.state; if (S.partner) return S.partner; const p = S.solo || G.npcs().sort((a, b) => G.aff(b) - G.aff(a))[0]; S.partner = p; S.teams = S.teams.filter(t => !t.includes(p)); return p; };
G.storySemifinal = () => {
  const S = G.state, partner = G.ensurePartner();
  const teams = S.teams.filter(t => !t.includes(partner)), best = teams.slice().sort((a, b) => { const ra = S.record[a.slice().sort().join('+')] || [0, 0], rb = S.record[b.slice().sort().join('+')] || [0, 0]; return (rb[0] - rb[1]) - (ra[0] - ra[1]); })[0] || G.npcs().filter(x => x !== partner).slice(0, 2);
  G.cutscene({ loc: 'beach', tod: 'afternoon', cam: [352, 240], caption: 'DAY 4 • THE SEMIFINAL', cast: [{ id: S.me, x: 320, y: 250, f: 0 }, { id: partner, x: 300, y: 262, f: 0 }, { id: best[0], x: 390, y: 244, f: Math.PI }, { id: best[1], x: 410, y: 258, f: Math.PI }, { id: 'sonny', x: 352, y: 200, f: Math.PI / 2 }],
    steps: [['say', 'sonny', 'SEMIFINAL TIME! The best record on the island wants a piece of YOU!'], ['say', best[0], G.LINES[best[0]].taunt[0]], ['say', best[1], G.LINES[best[1]].taunt[1]], ['say', partner, 'Let\'s show them.']],
    then: () => G.startMatch(G.vacationMatchCfg(best, { partner, title: 'SEMIFINAL', base: [.74, .74], prize: 30000, losePrize: 5000, onResult: won => { S.flags.semiDone = true; S.flags.seeded = won; }, next: () => G.endSlot('match') })) });
};
G.storyFinal = () => {
  const S = G.state, partner = G.ensurePartner();
  G.cutscene({ loc: 'beach', tod: 'sunset', cam: [352, 240], caption: 'THE FORTUNA CUP FINAL', music: 'house', cast: [{ id: S.me, x: 320, y: 250, f: 0 }, { id: partner, x: 300, y: 262, f: 0 }, { id: 'sonny', x: 392, y: 244, f: Math.PI, suit: 'house_sonny', acc: ['aviators'] }, { id: 'pepper', x: 412, y: 258, f: Math.PI, suit: 'pinstripe' }],
    drawExtra: r => { r.shape('banner', 250, 116, 0, { facing: Math.PI / 2 }); r.shape('banner', 454, 116, 0, { facing: Math.PI / 2 }); },
    steps: [['act', 'sonny', 'cheer', 1.2, { hop: 3 }], ['say', 'sonny', ['LADIES AND... LADIES!', 'Presenting the undefeated, the unstoppable... THE HOUSE!']], ['say', 'pepper', 'I bet the island on this. On him. On us. Mostly on me.'],
      ['say', 'sonny', 'Pepper! That was SUPPOSED to be a secret!'], ['say', partner, 'The island? Okay. No pressure.'], ['say', 'pepper', 'First to eleven. The house has... specials. You were warned.']],
    then: () => G.startMatch(G.vacationMatchCfg(['sonny', 'pepper'], { partner, title: 'THE FORTUNA CUP FINAL', subtitle: 'versus THE HOUSE', final: true, points: 11, base: [.7, .85], kits: ['house_sonny', 'pinstripe'], accs: [['aviators'], []], specials: { glare: true, houseEdge: true, luckySeven: true }, serveFirst: S.flags.seeded ? 0 : 1, prize: 100000, losePrize: 10000,
      onResult: won => { S.flags.finalDone = true; S.flags.wonFinal = won; if (won) { if (!S.wardrobe.suits.includes('fortunagold')) S.wardrobe.suits.push('fortunagold'); G.unlock(['fortunagold']); } }, next: () => G.endSlot('match') })) });
};
G.storyParty = () => {
  const S = G.state, others = G.npcs(), cast = [{ id: S.me, x: 352, y: 250, f: Math.PI / 2 }].concat(others.map((id, k) => ({ id, x: 290 + k * 30, y: 220 + (k % 2) * 16, f: Math.PI / 2 }))).concat([{ id: 'sonny', x: 420, y: 270, f: Math.PI }, { id: 'pepper', x: 280, y: 270, f: 0 }]);
  const steps = [['say', 'sonny', 'FAREWELL PARTY! Fireworks! Dancing! A BUFFET!']];
  for (const id of others) steps.push(['act', id, G.rpick('cosmetic', ['partydance', 'dance', 'groove', 'cheer2']), 2.4], ['say', id, G.LINES[id].farewell[G.aff(id) >= 60 ? 1 : 0]]);
  steps.push(['fx', sc => { for (const c of sc.cast) c.act = { kind: G.rpick('cosmetic', ['partydance', 'groove', 'dance']), t: 0, dur: 3, o: {} }; }], ['say', 'pepper', 'Everyone, squeeze in. Group postcard.'], ['fx', () => { G.sfx('shutter'); G.game.flash('#ffffff', .2); S.album.push({ loc: 'beach', day: 5, slot: 2, tod: 'night', people: cast.map(c => ({ id: c.id, pose: 'cheer' })), filter: 'Night Glow', frame: 'Postcard', img: G.photo.capture ? (G.photo.st = { filter: 4, frame: 1 }, G.photo.capture()) : null, at: Date.now(), party: true }); }], ['wait', 1.5]);
  G.cutscene({ loc: 'beach', tod: 'night', music: 'farewell', cam: [352, 240], zoom: 1.1, caption: 'FAREWELL PARTY', cast, steps,
    tick: (sc, dt) => { if (G.rng('cosmetic') < dt * 1.5) G.fx.firework(300 + G.rng('cosmetic') * 120, 110, 80 + G.rng('cosmetic') * 40); },
    then: () => { S.flags.partyDone = true; S.flags.wonFinal ? G.storyEndingA() : G.storyEndingB(); } });
};
G.storyEndingA = () => {
  const S = G.state;
  G.cutscene({ loc: 'dock', tod: 'morning', music: 'farewell', cam: [190, 160], zoom: 1.4, caption: 'THE HOUSE FOLDS', cast: [{ id: 'sonny', x: 190, y: 150, f: Math.PI / 2 }, { id: 'pepper', x: 230, y: 160, f: Math.PI }, { id: S.me, x: 160, y: 180, f: -Math.PI / 4 }],
    steps: [['say', 'sonny', 'A deal is a deal. The island is... yours. All of it. My beautiful island.'], ['say', 'pepper', ['Actually.', 'I hold Mr. Fortuna\'s IOUs. All of them. The island is mine.']], ['emote', 'sonny', '!'], ['act', 'sonny', 'confused', 2], ['say', 'sonny', 'PEPPER?!'],
      ['walk', 'sonny', 190, 260, 2], ['say', 'sonny', 'I\'LL BE BACK... NEXT SUMMER!'], ['say', 'pepper', 'Breakfast is at eight. The island is under new management.'], ['say', S.me, G.LINES[S.me].ending]],
    then: () => { S.flags.ending = 'A'; G.go('credits'); } });
};
G.storyEndingB = () => {
  const S = G.state;
  G.cutscene({ loc: 'beach', tod: 'night', music: 'house', cam: [352, 220], zoom: 1.3, caption: 'THE HOUSE ALWAYS WINS', cast: [{ id: 'sonny', x: 360, y: 220, f: Math.PI / 2 }, { id: 'pepper', x: 400, y: 226, f: Math.PI }, { id: S.me, x: 320, y: 240, f: 0 }],
    steps: [['act', 'sonny', 'cheer', 1.2, { hop: 3 }], ['say', 'sonny', 'THE HOUSE WINS! As is TRADITION!'], ['say', 'sonny', 'But to make it INTERESTING... the island on ONE spin of the giant wheel!'], ['say', 'pepper', 'Red.'], ['wait', 1], ['fx', () => G.sfx('ball_rattle')], ['wait', .6], ['act', 'sonny', 'angry', 2], ['say', 'sonny', '...It\'s red. Why is it always red.'],
      ['walk', 'sonny', 360, 340, 2], ['say', 'sonny', 'I\'LL BE BACK... NEXT SUMMER!'], ['say', 'pepper', 'The house always wins. I am the house.'], ['say', S.me, G.LINES[S.me].ending]],
    drawExtra: r => r.shape('roulettetable', 400, 180, 0, { scale: 1.6 }),
    then: () => { S.flags.ending = 'B'; G.go('credits'); } });
};
/* ---- events on arrival at a place ---- */
G.storyArrive = (id, sc) => {
  const S = G.state;
  if (id === 'casino' && !S.flags.casinoOpened) { S.flags.casinoOpened = true; S.flags.casinoVisited = true; S.chips += 20; G.say('sonny', ['WELCOME TO CASINO FORTUNA, CHAMP!', 'Twenty free chips! Slots, blackjack, roulette! The house LOVES you!'], { onDone: () => G.toast('+20 chips', 'Cash out at the cashier for S$100 each.') }); return; }
  if (id === 'casino') S.flags.casinoVisited = true;
  if (id === 'casino' && S.day === 3 && !S.flags.callSeen) G.game.after(.8, () => G.say('pepper', 'Mr. Fortuna is in the VIP lounge. On the phone. Loudly.'));
};
G.vipLounge = sc => {
  const S = G.state;
  if (S.day === 3 && !S.flags.callSeen) {
    S.flags.callSeen = true;
    G.say('sonny', ['...Yeah. Yeah, I put the island on the Cup.', 'What could go wrong? I\'m SONNY FORTUNA!'], { onDone: () => G.say('pepper', 'You heard that. Of course you did.', { choices: ['Your secret\'s safe.', 'Everyone\'s going to hear this.'], onChoice: k => { S.flags.kind = k === 0; G.say('pepper', k === 0 ? 'Thank you. I will remember it.' : 'Noted. So will I.'); } }) });
    return;
  }
  G.say('sonny', G.rpick('cosmetic', ['THE VIP LOUNGE! Velvet ropes! Free peanuts!', 'Shh! I\'m on the phone with my yacht.', 'Bet BIG, champ! The house is generous! Sometimes!']));
};
G.villaVisit = () => {
  const S = G.state; if (S.flags.visitDone || S.day < 2 || S.slot !== 2) return false;
  const who = G.npcs().filter(id => G.aff(id) >= 50).sort((a, b) => G.aff(b) - G.aff(a))[0]; if (!who) return false;
  S.flags.visitDone = true; const V = G.LINES[who].visit;
  G.cutscene({ loc: 'villa', tod: 'night', music: 'siesta', cam: [112, 100], zoom: 1.6, cast: [{ id: S.me, x: 112, y: 100, f: Math.PI / 2 }, { id: who, x: 112, y: 150, f: -Math.PI / 2 }],
    steps: [['emote', who, 'note'], ['say', who, V.lines[0]], ['choice', who, V.lines[1], V.choices, k => { const d = k === V.good ? 4 : -4; G.addAff(who, d); }], ['emote', who, 'heart'], ['wait', .8]],
    then: () => G.endSlot('rest') });
  return true;
};
/** dev jumps */
G.storyJump = id => {
  const S = G.state; if (!S.partner) S.partner = G.npcs()[0];
  if (id === 'semifinal') { S.day = 4; S.slot = 1; S.flags.semiDone = false; G.dayStart(); S.slot = 1; G.scheduleSlot(); G.storySemifinal(); }
  else if (id === 'final') { S.day = 5; S.slot = 1; S.flags.finalDone = false; G.dayStart(); S.slot = 1; G.scheduleSlot(); G.storyFinal(); }
  else if (id === 'party') { S.day = 5; S.slot = 2; S.flags.finalDone = true; G.storyParty(); }
  else if (id === 'endingA') { S.flags.wonFinal = true; G.storyEndingA(); }
  else if (id === 'endingB') { S.flags.wonFinal = false; G.storyEndingB(); }
};

// ==== 40-poolhop.js ====
/* 40-poolhop: Pool Hop. Cross the lagoon on 32 floating pads before the clock runs out. Each pad shows one of the four
 * face buttons (in the current device's glyphs); press it as you land, on the beat of the song (judged on the music
 * clock). From pad 12 the glyph wobbles between two buttons and settles a beat before; from pad 22 pads need two buttons
 * at once. A wrong, early or late press: a slip, a splash, a swim back, and on from the same pad at the next bar. */
G.HOPS = ['hopA', 'hopB', 'hopX', 'hopY'];
G.SCENES.poolhop = {
  pausable: true, view: 'court', input: G.INPUT.POOLHOP,
  enter(d) {
    this.d = d || {}; this.demo = !!this.d.demo; this.N = 32; G.seed('cosmetic', 99);
    const r = E.rng(((G.state && G.state.seed) || 5) * 7 + 3);
    this.pads = []; for (let k = 0; k < this.N; k++) { const a = Math.floor(r() * 4), b = (a + 1 + Math.floor(r() * 3)) % 4; this.pads.push({ x: 100 + (k + 1) * 26, y: 192 + Math.sin(k * .7) * 18, need: k >= 21 ? [a, b] : [a], alt: b, wobble: k >= 11 && k < 21, color: ['#ffd04a', '#ff7aa8', '#5ff0ff', '#7cff5a'][k % 4] }); }
    this.k = 0; this.state = 'count'; this.t = 0; this.timeLeft = G.T.poolTime; this.perfects = 0; this.goods = 0; this.falls = 0; this.streak = 0; this.bonus = 0; this.pending = null; this.judge = null; this.swimT = 0; this.done = false;
    this.rig = G.anim.rig(G.makeRig(G.state ? G.state.me : 'amara', G.state ? G.wearOf(G.state.me) : {}));
    const song = Object.assign({}, G.SONGS.lagoon, { bpm: G.T.poolBpm }); G.curSong = 'poolhop'; G.game.audio.music(song, { sync: true, restart: true }); this.bpm = G.T.poolBpm;
    this.spb = 60 / this.bpm; this.startBeat = 4; this.nextBeat = this.startBeat + 1;
    this.map = this.map || new E.TileMap({ rows: Array.from({ length: 24 }, (_, y) => Array.from({ length: 64 }, (_, x) => x < 5 || x > 58 ? 'd' : '~').join('')), legend: { '~': { floor: 'water', block: true }, d: { floor: 'deck' } }, floorTex: (x, y, t) => t === 'water' ? G.tex.water(x, y) : G.tex.deck(x, y), outside: '#2ec4c9' });
    G.applyLight('afternoon'); G.UI.theme = 'day'; G.game.setZoom(1.15); G.game.cam.bounds = null; this.hx = 100; this.hy = 192;
    G.ambience.set('pool');
  },
  exit() { G.game.setZoom(1); G.curSong = null; },
  get clock() { const p = G.game.audio.pos; return p && p.playing !== false ? p.t : this.t; },
  windows() { const m = G.T.poolWindowMul; return { perfect: .06 * m, good: .13 * m }; },
  padNeed(k) { return this.pads[k] ? this.pads[k].need : [0]; },
  /** the glyph a pad shows now (a wobble pad flips until a beat before it is needed) */
  shown(k, beatNow) { const p = this.pads[k]; if (!p) return []; if (!p.wobble) return p.need; const due = this.startBeat + k + 1 + this.offset; return beatNow < due - 1 ? (Math.floor(beatNow * 2) % 2 ? [p.alt] : p.need) : p.need; },
  get offset() { return this._off || 0; },
  update(dt) {
    this.t += dt; const I = G.game.input, c = this.clock, beat = c / this.spb, W = this.windows();
    G.ambience.update(dt);
    if (this.state === 'count') { if (beat >= this.startBeat) { this.state = 'play'; this._off = 0; } }
    else if (this.state === 'play' && !this.done) {
      this.timeLeft -= dt; if (this.timeLeft <= 0) { this.timeLeft = 0; return this.finish(false); }
      const due = (this.startBeat + this.k + 1 + this._off) * this.spb, need = this.padNeed(this.k);
      // presses
      const auto = this.demo || G.poolBot;
      const presses = []; for (let i = 0; i < 4; i++) if (I.pressed(G.HOPS[i])) presses.push(i);
      if (auto && !this.pending && Math.abs(c - due) < dt * 1.01) for (const n of need) presses.push(n);
      for (const b of presses) {
        const err = c - due;
        if (err < -this.spb * .5) continue;   // too early to count for this pad
        if (Math.abs(err) > W.good || !need.includes(b)) { this.slip(); return; }
        this.pending = this.pending || { got: new Set(), err };
        this.pending.got.add(b); this.pending.err = Math.max(Math.abs(this.pending.err), Math.abs(err));
        if (need.every(n => this.pending.got.has(n))) { const q = this.pending.err <= W.perfect || auto ? 'PERFECT' : 'GOOD'; this.land(q); return; }
      }
      if (c > due + W.good) { this.slip(); return; }
    } else if (this.state === 'swim') {
      this.swimT -= dt; if (this.swimT <= 0) { this.state = 'wait'; }
    } else if (this.state === 'wait') {
      // on again from the same pad at the next bar
      const nb = Math.ceil(beat / 4) * 4; if (!this.resumeBeat) this.resumeBeat = nb; if (beat >= this.resumeBeat - 1) { this._off = this.resumeBeat - this.startBeat - this.k - 1 + 1; this.state = 'play'; this.resumeBeat = null; }
    } else if (this.state === 'end') { if (this.t - this.endT > 1.5 && (I.pressed('hopA') || I.pressed('confirm') || I.clicked() || this.demo)) this.leave(); }
    // the hopper: an arc from pad to pad over the beat before landing
    const from = this.k === 0 ? [100, 192] : [this.pads[this.k - 1].x, this.pads[this.k - 1].y], to = this.pads[this.k] ? [this.pads[this.k].x, this.pads[this.k].y] : from;
    let x = from[0], y = from[1], z = 0, air = false;
    if (this.state === 'swim') { const u = 1 - this.swimT / 1.8; x = lerp(this.slipAt[0], from[0], u); y = lerp(this.slipAt[1], from[1], u) + 4; z = -12; }
    else if (this.landT && this.t - this.landT < this.spb * .9) { const u = (this.t - this.landT) / (this.spb * .9); x = lerp(this.landFrom[0], from[0], u); y = lerp(this.landFrom[1], from[1], u); z = Math.sin(u * Math.PI) * 14; air = true; }
    this.hx = x; this.hy = y; this.hz = z;
    const bob = Math.sin(beat * Math.PI * 2) * 1;
    this.rig.vb = this.state === 'swim' ? { kind: 'dive', u: .5, w: 1 } : null;
    this.rig.update(dt, { x, y, z: z + (air ? 0 : 2 + bob * .3), facing: 0, air, crouch: !air && this.state === 'play' && (beat % 1) > .7, pose: this.state === 'end' && this.won ? 'cheer' : null, expr: this.state === 'swim' ? 'wince' : 'smile' });
    G.game.focus(x + 30, y, 10);
  },
  land(q) {
    this.landFrom = this.k === 0 ? [100, 192] : [this.pads[this.k - 1].x, this.pads[this.k - 1].y]; this.landT = this.t;
    this.k++; this.pending = null; this.judge = { q, t: 0 }; G.sfx('hopLand');
    if (q === 'PERFECT') { this.perfects++; this.streak++; if (this.streak % 8 === 0) { this.timeLeft += 1; this.bonus++; G.toast('+1 second', '8 PERFECT in a row'); } } else { this.goods++; this.streak = 0; }
    if (this.k >= this.N) this.finish(true);
  },
  slip() {
    const p = this.pads[this.k]; this.slipAt = p ? [lerp(this.k ? this.pads[this.k - 1].x : 100, p.x, .5), p.y + 6] : [this.hx, this.hy];
    this.state = 'swim'; this.swimT = 1.8; this.falls++; this.streak = 0; this.pending = null; this.judge = { q: 'SPLASH!', t: 0 };
    G.sfx('splash'); G.fx.splash(this.slipAt[0], this.slipAt[1]); if (G.game.input.lastDevice === 'gamepad') G.game.input.rumble(.3, .2);
  },
  finish(won) {
    this.done = true; this.won = won; this.state = 'end'; this.endT = this.t; const S = G.state;
    const used = G.T.poolTime + this.bonus - this.timeLeft;
    this.prize = won ? Math.round((2000 + 400 * this.perfects + 150 * this.timeLeft) / 100) * 100 : 1000;
    if (S && !S.demo) { this.prize = G.earn(this.prize, 'poolhop'); if (won && (!S.stats.poolBest || used < S.stats.poolBest)) S.stats.poolBest = used; if (won && S.partner && S.where[S.partner] === 'pool') G.addAff(S.partner, 2); }
    G.sting(won ? 'win' : 'lose'); if (won) G.fx.confetti(this.hx, this.hy, 30);
  },
  leave() { if (this.demo) return; const S = G.state; if (S) G.endSlot('poolhop'); else G.go('title'); },
  draw(r) {
    const c = this.clock, beat = c / this.spb, I = G.game.input;
    G.backdrop('afternoon').draw(r); this.map.drawFloor(r);
    for (let k = 0; k < 3; k++) r.prop('palm', 60 + k * 30, 120 + k * 20, 0, { size: 1.5 }); r.shape('cabana', 980, 150, 0); r.shape('flamingo', 600, 110, 0); r.shape('lounger', 40, 260, 0);
    this.pads.forEach((p, k) => {
      const b = Math.sin(beat * Math.PI * 2 + k) * .8, done = k < this.k;
      r.shape('poolfloat', p.x, p.y, b, { mats: { a: done ? 'aoa_white' : ['aoa_canvasY', 'aoa_canvasP', 'aoa_canvasT', 'aoa_canvasB'][k % 4] } });
      if (k >= this.k && k < this.k + 6) { const show = this.shown(k, beat); r.queue(p.x, p.y, 12, g => { const [sx, sy] = r.w(p.x, p.y, 12); let x = Math.round(sx - (show.length * 11 - 2) / 2); for (const n of show) { x += G.drawGlyph(g, x, Math.round(sy) - 10, G.codeFor(G.HOPS[n], I), I) + 2; } if (this.pads[k].wobble && show[0] !== this.pads[k].need[0]) px.dot(g, Math.round(sx), Math.round(sy) - 13, '#ffffff'); }, { bias: 30 }); }
    });
    r.shadow(this.hx, this.hy, 5, .3);
    r.actor(this.hx, this.hy, this.hz || 0, (g, ox, oy) => this.rig.draw(g, ox, oy, r.view), { key: this.rig });
    r.overlay(g => {
      const W = r.W, H = r.H;
      E.ui.box(g, Math.round(W * .04), Math.round(H * .04), 120, 30, { bg: G.UI.T.bg, border: G.UI.T.border });
      E.font.text(g, 'POOL HOP', Math.round(W * .04) + 6, Math.round(H * .04) + 4, '#ffd36a', { outline: false }); E.font.text(g, 'Pad ' + this.k + ' / ' + this.N + '   Falls ' + this.falls, Math.round(W * .04) + 6, Math.round(H * .04) + 16, '#fff8e8', { outline: false });
      E.font.text(g, this.timeLeft.toFixed(1), Math.round(W * .96), Math.round(H * .04), this.timeLeft < 10 ? '#ff7a7a' : '#ffffff', { scale: 3, align: 'right', shadow: '#000', outline: false });
      // the beat light
      const ph = beat % 1; px.disc(g, Math.round(W / 2), Math.round(H * .08), ph < .15 ? 6 : 4, ph < .15 ? '#ffd36a' : '#3a5a6a');
      if (this.state === 'count') { const n = Math.max(1, Math.ceil(this.startBeat - beat)); E.font.title(g, n > 3 ? 'READY' : String(n), W / 2, Math.round(H * .3), { scale: 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] }); }
      if (this.judge) { this.judge.t += 1 / 60; if (this.judge.t < .6) E.font.text(g, this.judge.q, W / 2, Math.round(H * .22), this.judge.q === 'PERFECT' ? '#ffd36a' : this.judge.q === 'GOOD' ? '#5ff0ff' : '#9ff3e8', { scale: 2, align: 'center', shadow: '#000', outline: false }); }
      if (this.streak >= 2) E.font.text(g, this.streak + ' in a row', W / 2, Math.round(H * .14), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      if (this.state === 'end') { G.UI.panel(g, W / 2 - 110, H * .32, 220, 76); E.font.title(g, this.won ? 'CLEARED!' : 'TIME UP', W / 2, H * .32 + 8, { scale: 2, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'] }); E.font.text(g, this.perfects + ' PERFECT • ' + this.goods + ' GOOD • ' + this.falls + ' falls', W / 2, H * .32 + 32, '#fff8e8', { align: 'center', outline: false }); if (G.state) G.UI.money(g, W / 2 - 40, H * .32 + 46, this.prize); }
    });
    if (this.state !== 'end') G.promptBar(r, this.state === 'swim' || this.state === 'wait' ? [['hopA', 'Swim back...']] : this.padNeed(this.k).map(n => [G.HOPS[n], this.padNeed(this.k).length > 1 ? 'Together!' : 'On the beat']));
    else G.promptBar(r, [['hopA', 'Continue']]);
  }
};

// ==== 41-casino.js ====
/* 41-casino: Casino Fortuna's games, full screen over the casino floor: the cashier (chips at S$100), Fortuna Sevens
 * (a three-reel pachislot with stop buttons), blackjack (six decks, Pepper deals), roulette (a single-zero wheel, Kai
 * spins) and the prize counter. All randomness is the casino stream; dev tools can force a result. */
G.SLOT_SYMS = ['7', 'BAR', 'SONNY', 'BALL', 'PALM', 'COCO', 'CHERRY', 'SHELL'];
// 21 stops a reel; tuned so the centre line returns about 92% (the casino suite checks it)
G.SLOT_STRIPS = [
  ['COCO', 'PALM', 'SHELL', 'BALL', 'COCO', '7', 'PALM', 'COCO', 'BAR', 'CHERRY', 'PALM', 'COCO', 'BALL', 'PALM', 'SONNY', 'COCO', 'SHELL', 'BAR', 'COCO', 'BALL', 'PALM'],
  ['PALM', 'COCO', 'BALL', 'SHELL', 'COCO', 'PALM', '7', 'COCO', 'BALL', 'PALM', 'BAR', 'COCO', 'PALM', 'CHERRY', 'BALL', 'COCO', 'SONNY', 'PALM', 'COCO', 'BAR', 'SHELL'],
  ['SHELL', 'COCO', 'BAR', 'BALL', 'PALM', 'COCO', 'CHERRY', 'PALM', 'COCO', '7', 'BALL', 'PALM', 'COCO', 'SONNY', 'PALM', 'BAR', 'COCO', 'BALL', 'PALM', 'COCO', 'SHELL']
];
G.SLOT_COST = [0, 1, 3, 5];   // a bet of 1, 2 or 3 plays 1, 3 or 5 lines, one chip a line
G.SLOT_PAY = { '7': 100, BAR: 30, SONNY: 20, BALL: 12, PALM: 8, COCO: 5 };
/** what a line of three pays per chip (Sonny is wild) */
G.slotLine = (a, b, c) => {
  const s = [a, b, c], ch = s.filter(x => x === 'CHERRY').length;
  for (const sym of ['7', 'BAR', 'BALL', 'PALM', 'COCO']) if (s.every(x => x === sym || x === 'SONNY') && s.some(x => x === sym)) return G.SLOT_PAY[sym];
  if (s.every(x => x === 'SONNY')) return G.SLOT_PAY.SONNY;
  return ch === 3 ? 10 : ch === 2 ? 5 : ch === 1 ? 2 : 0;
};
G.SLOT_LINES = [[[1, 1, 1]], [[0, 0, 0], [2, 2, 2]], [[0, 1, 2], [2, 1, 0]]];
G.slotWin = (stops, bet) => { let win = 0; const lines = []; for (let b = 0; b < bet; b++) for (const L of G.SLOT_LINES[b]) { const sy = L.map((row, k) => G.SLOT_STRIPS[k][(stops[k] + row - 1 + 21) % 21]); const p = G.slotLine(...sy); if (p) { win += p; lines.push(L); } } return { win: Math.round(win * G.T.slotsPayMul), lines }; };
/* ---- blackjack ---- */
G.BJ = {
  shoe: null,
  newShoe() { const s = []; for (let d = 0; d < 6; d++) for (const suit of '♠♥♦♣') for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) s.push({ r, s: suit }); this.shoe = G.rshuffle('casino', s); this.dealt = 0; },
  draw() { if (!this.shoe || this.dealt > this.shoe.length * .75) this.newShoe(); if (G.bjForce && G.bjForce.length) { const r = G.bjForce.shift(); if (!G.bjForce.length) G.bjForce = null; return { r, s: '♠' }; } this.dealt++; return this.shoe[this.dealt - 1]; },
  value(h) { let v = 0, a = 0; for (const c of h) { v += c.r === 'A' ? 11 : ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; if (c.r === 'A') a++; } while (v > 21 && a) { v -= 10; a--; } return { v, soft: a > 0 }; },
  bj(h) { return h.length === 2 && this.value(h).v === 21; }
};
G.WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
G.REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
/** what a roulette bet pays on number n (stake returned plus winnings), or 0 */
G.roulettePay = (bet, n) => {
  const k = bet.kind, v = bet.v; if (n === 0 || n === 37) return k === 'num' && v === n ? 36 : 0;
  if (k === 'num') return v === n ? 36 : 0;
  if (k === 'red') return G.REDS.has(n) ? 2 : 0; if (k === 'black') return !G.REDS.has(n) ? 2 : 0;
  if (k === 'odd') return n % 2 ? 2 : 0; if (k === 'even') return n % 2 ? 0 : 2;
  if (k === 'low') return n <= 18 ? 2 : 0; if (k === 'high') return n >= 19 ? 2 : 0;
  if (k === 'dozen') return Math.ceil(n / 12) === v ? 3 : 0; if (k === 'col') return ((n - 1) % 3) + 1 === v ? 3 : 0;
  return 0;
};
G.SCENES.casino = {
  pausable: true, input: G.INPUT.CASINO, view: 'threequarter',
  enter(d) {
    this.d = d || {}; this.mode = this.d.game || (this.d.demo ? 'slots' : 'cashier'); this.t = 0; this.focus = new G.Focus(); this.msg = ''; this.map = G.locMaps().casino; G.UI.theme = 'night';
    G.music('neon'); G.ambience.set('casino'); G.applyLight('night', 'sunny', true); G.game.lights.ambient = .55; G.game.focus(240, 140, 0);
    this.slots = { stops: [3, 8, 12], spin: [false, false, false], pos: [3, 8, 12], bet: 1, win: null, stopT: 0 };
    this.bj = { phase: 'bet', bet: 5, hands: [], dealer: [], cur: 0, msg: '' };
    this.rl = { bets: [], cx: 0, cy: 0, size: 1, phase: 'bet', ang: 0, ball: 0, result: null, last: [], t: 0 };
    if (this.d.demo) { G.slotsForce = ['7', '7', '7']; this.demoT = 0; }
  },
  get S() { return G.state; },
  chips() { return G.state ? G.state.chips : 0; },
  addChips(n) { const S = G.state; if (!S) return; S.chips += n; S.stats.casinoNet += n; },
  update(dt) {
    this.t += dt; const I = G.game.input; G.ambience.update(dt);
    if (G.talkBox().update(dt)) return;
    if (this.d.demo) return this.demoStep(dt);
    if (this.mode === 'cashier' || this.mode === 'prize') return this.cashierStep(I);
    if (this.mode === 'slots') return this.slotsStep(dt, I);
    if (this.mode === 'blackjack') return this.bjStep(dt, I);
    if (this.mode === 'roulette') return this.rlStep(dt, I);
  },
  leave() { G.go('location', this.d.back || { loc: 'casino' }, { fade: .2 }); },
  /* ---- the cashier and the prize counter ---- */
  cashierItems() { const W = G.game.W, H = G.game.H, S = G.state; if (this.mode === 'prize') return G.UI.column([{ id: 'jackpot', label: 'Jackpot swimsuit • 300 chips', disabled: !S || S.wardrobe.suits.includes('jackpot') || S.chips < 300 }, { id: 'back', label: 'Back' }], W / 2, Math.round(H * .4), 200, 20, 6);
    return G.UI.column([{ id: 10, label: 'Buy 10 chips • S$1,000' }, { id: 50, label: 'Buy 50 chips • S$5,000' }, { id: 100, label: 'Buy 100 chips • S$10,000' }, { id: 'out', label: 'Cash out every chip' }, { id: 'back', label: 'Back' }], W / 2, Math.round(H * .32), 200, 20, 5); },
  cashierStep(I) {
    const S = G.state, f = this.focus.set(this.cashierItems()).update(I);
    if (f.back || (f.pick && f.pick.id === 'back')) return this.leave();
    if (!f.pick || !S) return;
    const id = f.pick.id;
    if (typeof id === 'number') { if (G.spend(id * 100)) { S.chips += id; G.sfx('chip'); this.msg = 'Here you go. Good luck.'; } else { G.sfx('ui_error'); this.msg = 'Not enough Sonny Dollars.'; } }
    else if (id === 'out') { if (S.chips > 0) { G.earn(S.chips * 100 / G.T.prizeMul, 'casino'); this.msg = 'Cashed out ' + S.chips + ' chips.'; S.chips = 0; G.sfx('cash'); } }
    else if (id === 'jackpot') { S.chips -= 300; S.wardrobe.suits.push('jackpot'); G.unlock(['jackpot']); G.sting('jackpot'); this.msg = 'The Jackpot suit is yours.'; }
  },
  /* ---- Fortuna Sevens ---- */
  slotsStep(dt, I) {
    const Sl = this.slots, spinning = Sl.spin.some(Boolean);
    if (!spinning) {
      if (I.pressed('cancel')) return this.leave();
      if (I.repeat('left', .3, .15)) Sl.bet = Math.max(1, Sl.bet - 1); if (I.repeat('right', .3, .15)) Sl.bet = Math.min(3, Sl.bet + 1);
      if (I.pressed('confirm') || I.pressed('reel1') && false) { if (this.chips() < G.SLOT_COST[Sl.bet]) { G.sfx('ui_error'); this.msg = 'Not enough chips. The cashier is open.'; return; } this.addChips(-G.SLOT_COST[Sl.bet]); Sl.spin = [true, true, true]; Sl.win = null; Sl.stopT = 0; Sl.forced = G.slotsForce || null; G.slotsForce = null; G.sfx('reel_spin'); }
      return;
    }
    Sl.stopT += dt;
    for (let k = 0; k < 3; k++) if (Sl.spin[k]) { Sl.pos[k] = (Sl.pos[k] + dt * 18) % 21; if (Math.floor(Sl.pos[k]) !== Math.floor(Sl.pos[k] - dt * 18)) G.sfx('reel_spin', { vol: .4 }); }
    const press = [I.pressed('reel1'), I.pressed('reel2'), I.pressed('reel3')], first = Sl.spin.indexOf(true);
    if (I.clicked()) press[first] = true;
    for (let k = 0; k < 3; k++) if (Sl.spin[k] && (press[k] || Sl.stopT > 2.5 + k * .8)) {
      let stop = Math.floor(Sl.pos[k] + 1 + G.rng('casino') * 5) % 21;   // a stop slips 0-4 symbols
      if (Sl.forced) { const want = Sl.forced[k]; const idx = G.SLOT_STRIPS[k].indexOf(want); if (idx >= 0) stop = idx; }
      Sl.stops[k] = stop; Sl.pos[k] = stop; Sl.spin[k] = false; G.sfx('reel_stop');
      if (!Sl.spin.some(Boolean)) { const w = G.slotWin(Sl.stops, Sl.bet); Sl.win = w; if (w.win) { this.addChips(w.win); G.sfx('cash'); if (w.win >= 100) { G.sting('jackpot'); G.fx.coins(240, 120, 40, 50); G.game.flash('#ffd36a', .3, .5); if (I.lastDevice === 'gamepad') I.rumble(.6, .5); this.msg = 'JACKPOT! ' + w.win + ' chips!'; G.game.audio.layer('sparkle', 1, .2); } else this.msg = 'Winner! ' + w.win + ' chips.'; } else this.msg = 'So close.'; }
    }
  },
  /* ---- blackjack ---- */
  bjStep(dt, I) {
    const B = this.bj, BJ = G.BJ, S = G.state;
    if (B.phase === 'bet') {
      if (I.pressed('cancel')) return this.leave();
      const steps = [1, 5, 10, 25], k = steps.indexOf(B.bet);
      if (I.repeat('left', .3, .15)) B.bet = steps[Math.max(0, k - 1)]; if (I.repeat('right', .3, .15)) B.bet = steps[Math.min(3, k + 1)];
      if (I.pressed('confirm') || I.clicked()) { if (this.chips() < B.bet) { G.sfx('ui_error'); B.msg = 'Not enough chips.'; return; } this.addChips(-B.bet); B.hands = [{ cards: [BJ.draw(), BJ.draw()], bet: B.bet, done: false }]; B.dealer = [BJ.draw(), BJ.draw()]; B.cur = 0; B.phase = 'play'; B.split = false; G.sfx('card_deal'); B.msg = '';
        if (BJ.bj(B.hands[0].cards) || BJ.bj(B.dealer)) this.bjSettle(); }
      return;
    }
    if (B.phase === 'play') {
      const h = B.hands[B.cur], v = BJ.value(h.cards).v, two = h.cards.length === 2;
      const canSplit = two && !B.split && BJ.value([h.cards[0]]).v === BJ.value([h.cards[1]]).v && this.chips() >= h.bet, canDouble = two && this.chips() >= h.bet;
      const c = I.clicked(); let act = I.pressed('hit') ? 'hit' : I.pressed('stand') ? 'stand' : I.pressed('double') ? 'double' : I.pressed('split') ? 'split' : null;
      if (c) { const W = G.game.W, H = G.game.H, bx = Math.round(W / 2) - 120, by = Math.round(H * .8); const k = Math.floor((c[0] - bx) / 60); if (c[1] > by && c[1] < by + 18 && k >= 0 && k < 4) act = ['hit', 'stand', 'double', 'split'][k]; }
      if (act === 'hit') { h.cards.push(BJ.draw()); G.sfx('card_deal'); if (BJ.value(h.cards).v >= 21) this.bjNext(); }
      else if (act === 'stand') this.bjNext();
      else if (act === 'double' && canDouble) { this.addChips(-h.bet); h.bet *= 2; h.cards.push(BJ.draw()); G.sfx('card_deal'); this.bjNext(); }
      else if (act === 'split' && canSplit) { this.addChips(-h.bet); B.split = true; const a = h.cards[0], b = h.cards[1]; B.hands = [{ cards: [a, BJ.draw()], bet: h.bet, aces: a.r === 'A' }, { cards: [b, BJ.draw()], bet: h.bet, aces: a.r === 'A' }]; B.cur = 0; G.sfx('card_deal'); if (a.r === 'A') { B.cur = 1; this.bjNext(); } }
      return;
    }
    if (B.phase === 'dealer') { B.dt = (B.dt || 0) + dt; if (B.dt > .55) { B.dt = 0; const dv = BJ.value(B.dealer); if (dv.v < 17 || (dv.v === 17 && dv.soft && G.T.dealerHitsSoft17)) { B.dealer.push(BJ.draw()); G.sfx('card_flip'); } else this.bjSettle(); } return; }
    if (B.phase === 'done') { if (I.pressed('confirm') || I.clicked()) { B.phase = 'bet'; B.msg = ''; } else if (I.pressed('cancel')) this.leave(); }
  },
  bjNext() { const B = this.bj; if (B.cur < B.hands.length - 1) { B.cur++; return; } B.phase = B.hands.every(h => G.BJ.value(h.cards).v > 21) ? 'settle' : 'dealer'; B.dt = 0; if (B.phase === 'settle') this.bjSettle(); },
  bjSettle() {
    const B = this.bj, BJ = G.BJ, dv = BJ.value(B.dealer).v, dbj = BJ.bj(B.dealer); let net = 0, msgs = [];
    for (const h of B.hands) { const v = BJ.value(h.cards).v, pbj = BJ.bj(h.cards) && !B.split;
      let pay = 0; if (v > 21) msgs.push('Bust'); else if (pbj && !dbj) { pay = h.bet + Math.floor(h.bet * 1.5); msgs.push('Blackjack!'); } else if (dbj && !pbj) msgs.push('Dealer blackjack'); else if (dv > 21 || v > dv) { pay = h.bet * 2; msgs.push('Win'); } else if (v === dv) { pay = h.bet; msgs.push('Push'); } else msgs.push('Lose');
      this.addChips(pay); net += pay - h.bet; }
    B.phase = 'done'; B.msg = msgs.join(' • ') + (net > 0 ? '  +' + net : net < 0 ? '  ' + net : '');
    if (net > 0) G.sfx('cash'); G.say('pepper', msgs.includes('Blackjack!') ? 'Blackjack. Congratulations, I suppose.' : msgs[0] === 'Bust' ? 'Statistically, that was unwise.' : net > 0 ? 'The house has noticed.' : 'Better luck next hand.', { auto: 2, modal: false });
  },
  /* ---- roulette: a 12 x 3 number grid, zero, and the outside bets ---- */
  rlCells() {
    const W = G.game.W, H = G.game.H, x0 = Math.round(W * .2), y0 = Math.round(H * .48), cw = Math.round(W * .055), ch = 14, out = [];
    out.push({ kind: 'num', v: 0, x: x0 - cw, y: y0, w: cw, h: ch * 3, label: '0' });
    for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) { const n = c * 3 + (3 - r); out.push({ kind: 'num', v: n, x: x0 + c * cw, y: y0 + r * ch, w: cw, h: ch, label: String(n) }); }
    const oy = y0 + ch * 3 + 2, ow = cw * 2;
    [['low', 0, '1-18'], ['even', 0, 'EVEN'], ['red', 0, 'RED'], ['black', 0, 'BLACK'], ['odd', 0, 'ODD'], ['high', 0, '19-36']].forEach(([k, v, l], i) => out.push({ kind: k, v, x: x0 + i * ow, y: oy, w: ow, h: ch, label: l }));
    [1, 2, 3].forEach((d, i) => out.push({ kind: 'dozen', v: d, x: x0 + i * cw * 4, y: oy + ch + 2, w: cw * 4, h: ch, label: (d * 12 - 11) + '-' + d * 12 }));
    [3, 2, 1].forEach((c, i) => out.push({ kind: 'col', v: c, x: x0 + 12 * cw + 2, y: y0 + i * ch, w: cw, h: ch, label: '2:1' }));
    return out;
  },
  rlStep(dt, I) {
    const R = this.rl, cells = this.rlCells();
    if (R.phase === 'spin') {
      R.t += dt; const dur = 4.2, u = Math.min(1, R.t / dur); R.ang += dt * (8 * (1 - u) + .3); R.ball = R.ballEnd * E.ease.outCubic(u);
      if (Math.floor(R.t * 10 * (1 - u)) !== Math.floor((R.t - dt) * 10 * (1 - u))) G.sfx('ball_rattle', { vol: .5 });
      if (u >= 1) { R.phase = 'bet'; const n = R.result; let win = 0; for (const b of R.bets) win += G.roulettePay(b, n) * b.chips; this.addChips(win); R.last.unshift(n); R.last = R.last.slice(0, 10); this.msg = n + (n === 0 || n === 37 ? ' GREEN' : G.REDS.has(n) ? ' RED' : ' BLACK') + (win ? '  • you win ' + win + ' chips' : ''); if (win) G.sfx('cash'); R.bets = []; G.say('kai', win ? 'Nice one. The wheel likes you.' : 'Wheel giveth, wheel taketh.', { auto: 2, modal: false }); }
      return;
    }
    if (I.pressed('cancel')) { if (R.bets.length) { for (const b of R.bets) this.addChips(b.chips); R.bets = []; } return this.leave(); }
    // the cursor: stick / WASD / arrows over the layout, or the mouse
    let cur = cells[R.ci || 1];
    const mv = (dx, dy) => { const cx = cur.x + cur.w / 2 + dx * 12, cy = cur.y + cur.h / 2 + dy * 12; let best = R.ci, bd = 1e9; cells.forEach((c, k) => { const vx = c.x + c.w / 2 - (cur.x + cur.w / 2), vy = c.y + c.h / 2 - (cur.y + cur.h / 2), al = vx * dx + vy * dy; if (al <= 2) return; const d = al + Math.abs(vx * dy - vy * dx) * 2; if (d < bd) { bd = d; best = k; } }); R.ci = best; G.sfx('ui_tick'); };
    if (I.repeat('left', .3, .1)) mv(-1, 0); if (I.repeat('right', .3, .1)) mv(1, 0); if (I.repeat('up', .3, .1)) mv(0, -1); if (I.repeat('down', .3, .1)) mv(0, 1);
    const p = I.pointer && I.pointer(); if (p && I.lastDevice === 'mouse') cells.forEach((c, k) => { if (p[0] >= c.x && p[0] < c.x + c.w && p[1] >= c.y && p[1] < c.y + c.h) R.ci = k; });
    cur = cells[R.ci === undefined ? 1 : R.ci]; R.ci = R.ci === undefined ? 1 : R.ci;
    const sizes = [1, 5, 10, 25]; if (I.pressed('tabR')) R.size = sizes[Math.min(3, sizes.indexOf(R.size) + 1)]; if (I.pressed('tabL')) R.size = sizes[Math.max(0, sizes.indexOf(R.size) - 1)];
    if (I.pressed('confirm') || I.clicked()) { if (this.chips() >= R.size) { this.addChips(-R.size); const ex = R.bets.find(b => b.kind === cur.kind && b.v === cur.v); if (ex) ex.chips += R.size; else R.bets.push({ kind: cur.kind, v: cur.v, chips: R.size }); G.sfx('chip'); } else G.sfx('ui_error'); }
    if (I.pressed('alt')) { const ex = R.bets.find(b => b.kind === cur.kind && b.v === cur.v); if (ex) { this.addChips(ex.chips); R.bets = R.bets.filter(b => b !== ex); G.sfx('ui_back'); } }
    if (I.pressed('extra') && R.bets.length) { const wheel = G.T.rouletteDoubleZero ? G.WHEEL.concat([37]) : G.WHEEL; let n = wheel[Math.floor(G.rng('casino') * wheel.length)]; if (G.rouletteForce !== undefined && G.rouletteForce !== null) { n = G.rouletteForce; G.rouletteForce = null; } R.result = n; R.t = 0; R.phase = 'spin'; R.ballEnd = Math.PI * 6 + wheel.indexOf(n) / wheel.length * Math.PI * 2; G.sfx('wheel_spin'); }
  },
  demoStep(dt) {
    this.demoT += dt; const Sl = this.slots;
    if (this.mode === 'slots') {
      if (this.demoT > .6 && !Sl.spin.some(Boolean) && !Sl.win) { Sl.spin = [true, true, true]; Sl.stopT = 0; Sl.forced = ['7', '7', '7']; }
      if (Sl.spin.some(Boolean)) { Sl.stopT += dt; for (let k = 0; k < 3; k++) if (Sl.spin[k]) { Sl.pos[k] = (Sl.pos[k] + dt * 18) % 21; if (Sl.stopT > 1 + k * .6) { Sl.stops[k] = G.SLOT_STRIPS[k].indexOf('7'); Sl.pos[k] = Sl.stops[k]; Sl.spin[k] = false; G.sfx('reel_stop'); if (k === 2) { Sl.win = G.slotWin(Sl.stops, 1); this.msg = 'JACKPOT! ' + Sl.win.win + ' chips!'; G.fx.coins(240, 120, 40, 50); G.sting('jackpot'); } } } }
      if (this.demoT > 4.5) { this.mode = 'blackjack'; G.bjForce = ['A', '9', 'K', '7']; const B = this.bj; B.hands = [{ cards: [G.BJ.draw(), G.BJ.draw()], bet: 10 }]; B.dealer = [G.BJ.draw(), G.BJ.draw()]; B.phase = 'done'; B.msg = 'Blackjack!'; G.sfx('card_deal'); }
    }
  },
  /* ---- drawing ---- */
  card(g, x, y, c, down) {
    E.ui.box(g, x, y, 22, 30, { bg: down ? ['#c8202c', '#8a1018'] : ['#ffffff', '#e8e8e0'], border: '#1a1a22', gradient: !down });
    if (down) { for (let k = 0; k < 4; k++) px.rect(g, x + 4, y + 5 + k * 6, 14, 2, '#ffd36a'); return; }
    const red = c.s === '♥' || c.s === '♦', col = red ? '#c8202c' : '#1a1a22';
    E.font.text(g, c.r, x + 3, y + 3, col, { outline: false }); G.suitIcon(g, x + 8, y + 15, c.s, col);
  },
  draw(r) {
    this.map.drawFloor(r); this.map.queueWalls(r); G.drawLocProps(r, 'casino', true);
    const S = G.state, I = G.game.input;
    r.overlay(g => {
      const W = r.W, H = r.H; px.blend(g, .72, 'normal', () => px.rect(g, 0, 0, W, H, '#12081e'));
      G.UI.panel(g, Math.round(W * .03), Math.round(H * .04), Math.round(W * .94), Math.round(H * .86), { bg: ['#2a1240', '#12081e'], border: '#ff5fa2' });
      const title = { cashier: 'CASHIER', prize: 'PRIZE COUNTER', slots: 'FORTUNA SEVENS', blackjack: 'BLACKJACK', roulette: 'ROULETTE' }[this.mode];
      G.UI.heading(g, title, Math.round(W * .06), Math.round(H * .06), { color: '#5ff0ff' });
      G.UI.chip(g, Math.round(W * .8), Math.round(H * .07)); E.font.text(g, G.fmt(this.chips()) + ' chips', Math.round(W * .8) + 12, Math.round(H * .07), '#fff3c0', { scale: 1, shadow: '#000', outline: false });
      if (S) E.font.text(g, G.fmtMoney(S.money), Math.round(W * .8) + 12, Math.round(H * .07) + 10, '#9fd3d6', { outline: false });
      if (this.mode === 'cashier' || this.mode === 'prize') { this.cashierItems().forEach((it, k) => G.UI.button(g, it, k === this.focus.i)); if (this.mode === 'prize') { const it = G.ITEMS.jackpot; G.UI.itemIcon(g, W / 2 - 24, Math.round(H * .2), it, 3); } }
      if (this.mode === 'slots') this.drawSlots(g, W, H);
      if (this.mode === 'blackjack') this.drawBJ(g, W, H);
      if (this.mode === 'roulette') this.drawRL(g, W, H);
      if (this.msg) E.font.text(g, this.msg, W / 2, Math.round(H * .74), '#ffd36a', { align: 'center', shadow: '#000', outline: false, scale: this.msg.startsWith('JACKPOT') ? 2 : 1 });
    });
    G.talkBox().draw(r);
    if (this.d.demo) return;
    const bar = this.mode === 'slots' ? (this.slots.spin.some(Boolean) ? [['reel1', 'Stop 1'], ['reel2', 'Stop 2'], ['reel3', 'Stop 3']] : [['confirm', 'Spin'], ['left', 'Bet'], ['cancel', 'Leave']])
      : this.mode === 'blackjack' ? (this.bj.phase === 'play' ? [['hit', 'Hit'], ['stand', 'Stand'], ['double', 'Double'], ['split', 'Split']] : this.bj.phase === 'bet' ? [['confirm', 'Deal'], ['left', 'Bet'], ['cancel', 'Leave']] : [['confirm', 'Next hand'], ['cancel', 'Leave']])
      : this.mode === 'roulette' ? [['confirm', 'Chip'], ['alt', 'Remove'], ['extra', 'Spin'], ['tabR', 'Chip size'], ['cancel', 'Leave']] : [['confirm', 'Select'], ['cancel', 'Back']];
    G.promptBar(r, bar, I, Math.round(r.H * .92) - 6);
  },
  drawSlots(g, W, H) {
    const Sl = this.slots, x0 = Math.round(W / 2 - 84), y0 = Math.round(H * .2), cw = 52, rh = 26;
    E.ui.box(g, x0 - 10, y0 - 10, 3 * (cw + 6) + 16, 3 * rh + 20, { bg: ['#c8202c', '#6a0a14'], border: '#ffd36a' });
    for (let k = 0; k < 3; k++) { const x = x0 + k * (cw + 6); px.rect(g, x, y0, cw, rh * 3, '#fff8e8');
      for (let row = 0; row < 3; row++) { const f = Sl.pos[k], idx = Math.floor(f) + row - 1, frac = Sl.spin[k] ? f % 1 : 0, sym = G.SLOT_STRIPS[k][(idx + 21) % 21], y = y0 + row * rh - frac * rh; if (y < y0 - 4 || y > y0 + rh * 2 + 4) continue; G.slotIcon(g, x + cw / 2, y + rh / 2, sym, Sl.spin[k]); }
      if (Sl.spin[k]) px.blend(g, .3, 'normal', () => { for (let yy = 0; yy < rh * 3; yy += 3) px.rect(g, x, y0 + yy, cw, 1, '#a0a0b0'); }); }
    for (let b = 0; b < 3; b++) for (const L of G.SLOT_LINES[b]) { const on = b < Sl.bet, won = Sl.win && Sl.win.lines.includes(L), y = (row) => y0 + row * rh + rh / 2; if (!on) continue; px.line(g, x0 - 6, y(L[0]), x0 + 3 * (cw + 6) + 2, y(L[2]), won ? '#ffd36a' : '#ff5fa255', won ? 2 : 1); }
    E.font.text(g, 'Bet ' + G.SLOT_COST[Sl.bet] + (Sl.bet === 1 ? ' chip • centre line' : Sl.bet === 2 ? ' chips • three lines' : ' chips • five lines'), W / 2, y0 + 3 * rh + 16, '#fff8e8', { align: 'center', outline: false });
    E.font.text(g, '7-7-7 ×100 • BAR ×30 • SONNY ×20 (wild) • BALL ×12', W / 2, y0 + 3 * rh + 28, '#c8a8e0', { align: 'center', outline: false });
    E.font.text(g, 'PALM ×8 • COCO ×5 • one, two, three cherries ×2, ×5, ×10', W / 2, y0 + 3 * rh + 38, '#c8a8e0', { align: 'center', outline: false });
  },
  drawBJ(g, W, H) {
    const B = this.bj, BJ = G.BJ, x0 = Math.round(W / 2), y0 = Math.round(H * .18);
    G.portrait(g, 'pepper', Math.round(W * .06), y0, 30); E.font.text(g, 'Dealer: Pepper', Math.round(W * .06) + 34, y0 + 4, '#ffd36a', { outline: false });
    px.ell(g, x0, y0 + 80, 150, 60, '#1f7a4a'); px.ell(g, x0, y0 + 80, 146, 56, '#2a8a5a');
    const hide = B.phase === 'play'; B.dealer.forEach((c, k) => this.card(g, x0 - 30 + k * 24, y0 + 10, c, hide && k === 1));
    if (B.dealer.length) E.font.text(g, hide ? '?' : String(BJ.value(B.dealer).v), x0 + 60, y0 + 20, '#ffffff', { outline: false });
    B.hands.forEach((h, hi) => { const hx = x0 - 30 + (hi - (B.hands.length - 1) / 2) * 110; h.cards.forEach((c, k) => this.card(g, hx + k * 16, y0 + 64 + k * 2, c, false)); E.font.text(g, String(BJ.value(h.cards).v) + ' • bet ' + h.bet, hx, y0 + 100, hi === B.cur && B.phase === 'play' ? '#ffd36a' : '#fff8e8', { outline: false }); });
    if (B.phase === 'bet') { E.font.text(g, '◀  Bet ' + B.bet + ' chips  ▶', x0, y0 + 80, '#ffd36a', { align: 'center', scale: 2, shadow: '#000', outline: false }); E.font.text(g, 'Blackjack pays 3:2 • dealer ' + (G.T.dealerHitsSoft17 ? 'hits' : 'stands on') + ' soft 17', x0, y0 + 102, '#fff8e8', { align: 'center', outline: false }); }
    if (B.msg) E.font.text(g, B.msg, x0, y0 + 120, '#ffffff', { align: 'center', shadow: '#000', outline: false });
    if (B.phase === 'play') { const bx = Math.round(W / 2) - 120, by = Math.round(H * .8); ['Hit', 'Stand', 'Double', 'Split'].forEach((l, k) => G.UI.button(g, { x: bx + k * 60, y: by, w: 56, h: 16, label: l }, false)); }
  },
  drawRL(g, W, H) {
    const R = this.rl, cells = this.rlCells(), wheel = G.T.rouletteDoubleZero ? G.WHEEL.concat([37]) : G.WHEEL, cx = Math.round(W * .2), cy = Math.round(H * .28), rad = 30;
    G.portrait(g, 'kai', Math.round(W * .06), Math.round(H * .14), 26); E.font.text(g, 'Croupier: Kai', Math.round(W * .06) + 30, Math.round(H * .14) + 4, '#ffd36a', { outline: false });
    // the inset wheel: the pockets turn, the ball spirals in and settles
    px.disc(g, cx + 60, cy, rad + 4, '#5a3a1a'); px.disc(g, cx + 60, cy, rad, '#2a1a10');
    wheel.forEach((n, k) => { const a = R.ang + k / wheel.length * Math.PI * 2, x = cx + 60 + Math.cos(a) * (rad - 5), y = cy + Math.sin(a) * (rad - 5); px.disc(g, x, y, 2.2, n === 0 || n === 37 ? '#2a9a4a' : G.REDS.has(n) ? '#c8202c' : '#1a1a22'); });
    px.disc(g, cx + 60, cy, 8, '#ffd36a');
    const br = R.phase === 'spin' ? rad - 2 - Math.min(1, R.t / 4.2) * 3 : rad - 5, ba = (R.phase === 'spin' ? -R.ball : -(R.ballEnd || 0)) + R.ang; px.disc(g, cx + 60 + Math.cos(ba) * br, cy + Math.sin(ba) * br, 1.6, '#ffffff');
    cells.forEach((c, k) => { const n = c.v, bg = c.kind === 'num' ? (n === 0 ? '#2a9a4a' : G.REDS.has(n) ? '#c8202c' : '#1a1a22') : c.kind === 'red' ? '#c8202c' : c.kind === 'black' ? '#1a1a22' : '#1f7a4a';
      px.rect(g, c.x, c.y, c.w - 1, c.h - 1, bg); E.font.text(g, c.label, c.x + c.w / 2, c.y + c.h / 2 - 3, '#ffffff', { align: 'center', outline: false });
      const b = R.bets.find(x => x.kind === c.kind && x.v === c.v); if (b) { G.UI.chip(g, c.x + c.w / 2 - 4, c.y + c.h / 2 - 4, '#ffd36a'); E.font.text(g, String(b.chips), c.x + c.w - 2, c.y + 1, '#ffd36a', { align: 'right', outline: false }); }
      if (k === R.ci) G.UI.focus(g, c.x, c.y, c.w - 1, c.h - 1); });
    E.font.text(g, 'Chip size: ' + R.size + '   Bets: ' + R.bets.reduce((a, b) => a + b.chips, 0), Math.round(W * .5), Math.round(H * .24), '#fff8e8', { outline: false });
    E.font.text(g, 'Last:', Math.round(W * .5), Math.round(H * .32), '#9fd3d6', { outline: false }); R.last.forEach((n, k) => { const x = Math.round(W * .5) + 26 + k * 16; px.rect(g, x, Math.round(H * .32) - 1, 14, 10, n === 0 || n === 37 ? '#2a9a4a' : G.REDS.has(n) ? '#c8202c' : '#1a1a22'); E.font.text(g, n === 37 ? '00' : String(n), x + 7, Math.round(H * .32), '#ffffff', { align: 'center', outline: false }); });
    E.font.text(g, 'Straight 35:1 • red/black, odd/even, 1-18/19-36 1:1 • dozens and columns 2:1', W / 2, Math.round(H * .24) + 22, '#c8a8e0', { align: 'center', outline: false });
  }
};
G.suitIcon = (g, x, y, s, c) => {
  if (s === '♥') { px.disc(g, x - 2, y - 1, 2, c); px.disc(g, x + 2, y - 1, 2, c); px.poly(g, [[x - 4, y], [x + 4, y], [x, y + 5]], c); }
  else if (s === '♦') px.poly(g, [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], c);
  else if (s === '♣') { px.disc(g, x, y - 2, 2, c); px.disc(g, x - 2, y + 1, 2, c); px.disc(g, x + 2, y + 1, 2, c); px.rect(g, x, y + 1, 1, 4, c); }
  else { px.poly(g, [[x, y - 4], [x + 4, y + 1], [x - 4, y + 1]], c); px.disc(g, x - 2, y + 1, 2, c); px.disc(g, x + 2, y + 1, 2, c); px.rect(g, x, y + 2, 1, 3, c); }
};
G.slotIcon = (g, x, y, sym, blur) => {
  x = Math.round(x); y = Math.round(y);
  if (sym === '7') E.font.title(g, '7', x, y - 9, { scale: 2, colors: ['#ff5f7a', '#c8202c'], align: 'center', depth: 1 });
  else if (sym === 'BAR') { E.ui.box(g, x - 14, y - 6, 28, 12, { bg: '#1a1a22', border: '#ffd36a', gradient: false }); E.font.text(g, 'BAR', x, y - 3, '#ffd36a', { align: 'center', outline: false }); }
  else if (sym === 'SONNY') { px.disc(g, x, y, 8, '#d9a27a'); px.rect(g, x - 6, y - 3, 12, 3, '#c89020'); px.rect(g, x - 7, y - 9, 14, 4, '#121014'); px.rect(g, x - 3, y + 3, 6, 1, '#5a2a1a'); }
  else if (sym === 'BALL') { px.sprite(g, G.BALL_SPR[0], x - 8, y - 8, { scale: 2 }); }
  else if (sym === 'PALM') { px.rect(g, x - 1, y - 2, 2, 10, '#8a5a2a'); for (const a of [-2.4, -1.6, -.8, -.2]) px.line(g, x, y - 3, x + Math.cos(a) * 8, y - 3 + Math.sin(a) * 6, '#2f8f4e', 2); }
  else if (sym === 'COCO') { px.disc(g, x, y, 6, '#6a4a2a'); px.disc(g, x - 1, y - 1, 4, '#8a6a3a'); px.dot(g, x - 2, y - 2, '#3a2a1a'); px.dot(g, x + 1, y - 2, '#3a2a1a'); }
  else if (sym === 'SHELL') { px.poly(g, [[x - 7, y + 5], [x + 7, y + 5], [x, y - 6]], '#f4c8b0'); for (let k = -2; k <= 2; k++) px.line(g, x, y - 5, x + k * 3, y + 5, '#c88a70'); px.rect(g, x - 2, y + 5, 5, 2, '#c88a70'); }
  else { px.disc(g, x - 3, y + 2, 4, '#e8283a'); px.disc(g, x + 4, y + 3, 4, '#c8202c'); px.line(g, x - 3, y - 1, x + 1, y - 7, '#2f8f4e'); px.line(g, x + 4, y, x + 1, y - 7, '#2f8f4e'); }
};

// ==== 42-photo.js ====
/* 42-photo: Postcards (photo mode) and the album. Photo mode freezes play; the stick pans, the right stick or a right-drag
 * orbits, L2/R2 or the wheel zoom; the subject (you or anyone present) takes a pose and an expression; a filter and a
 * postcard frame; the shutter keeps a small picture and its spec in the album (24 at most). The album shows them 4 x 2,
 * opens one large, deletes, sets one as the title's backdrop, and exports a PNG (not in hub sessions). */
G.PHOTO_POSES = ['none', 'wave', 'peace', 'hips', 'cheer', 'stretch', 'lookback', 'sit', 'victory', 'salute', 'bow'];
G.PHOTO_EXPR = ['smile', 'shout', 'wince', 'neutral'];
G.PHOTO_FILTERS = ['Clean', 'Sunny', 'Sepia', 'Retro', 'Night Glow'];
G.PHOTO_FRAMES = ['None', 'Postcard'];
G.albumAll = () => { const S = G.state; if (S && S.album && S.album.length) return S.album; return G.store.get('aoa-album', []) || []; };
G.titlePostcard = () => {
  if (G.hub || typeof Image === 'undefined') return null; const src = G.store.get('aoa-title-postcard', null); if (!src) return null;
  if (G._tpc && G._tpc.src === src) return G._tpc; const im = new Image(); im.src = src; G._tpc = im; return im;
};
/** where the camera looks now: the people in the shot, on average */
G.photoFocus = () => { const subs = (G.photoSubjects && G.photoSubjects()) || []; if (!subs.length) return null; let x = 0, y = 0; for (const p of subs) { x += p.rig.x; y += p.rig.y; } return [Math.round(x / subs.length), Math.round(y / subs.length)]; };
/** a postcard drawn again, live, from its spec: the place's floor and props at its time of day, everyone in their
 *  outfits, positions and poses (their idles still breathe), the camera's turn and zoom, the filter and the frame */
G.specScene = {
  rigs: new Map(),
  rigsFor(spec) {
    let list = this.rigs.get(spec); if (list) return list;
    list = (spec.people || []).filter(p => G.CAST[p.id]).map((p, k) => ({ p, rig: G.anim.rig(G.makeRig(p.id, G.CAST[p.id].shirt || G.CAST[p.id].robe ? {} : { suit: p.suit || G.CAST[p.id].suit, acc: p.acc || G.CAST[p.id].acc })),
      x: p.x !== undefined ? p.x : 300 + k * 30, y: p.y !== undefined ? p.y : 250, z: p.z || 0, f: p.facing !== undefined ? p.facing : Math.PI / 2 }));
    this.rigs.set(spec, list); return list;
  },
  POSE: { wave: 'wave', hips: 'hips', cheer: 'cheer', sit: 'kneel', victory: 'cheer' },
  MOVE: { peace: 'peace', stretch: 'stretch', lookback: 'lookback', victory: 'fistpump', salute: 'salute', bow: 'bow' },
  /** set up the camera for a spec (in update): returns the map to draw */
  prepare(spec, dt) {
    const loc = G.LOCS[spec.loc] ? spec.loc : 'beach', map = G.locMaps()[loc], list = this.rigsFor(spec), g = G.game;
    const viewId = spec.cam && spec.cam.view && E.VIEWS[spec.cam.view] ? spec.cam.view : 'threequarter';
    if (!g.view || g.view.id !== viewId) g.setView(viewId);
    const at = (spec.cam && spec.cam.at) || (list.length ? [list.reduce((a, c) => a + c.x, 0) / list.length, list.reduce((a, c) => a + c.y, 0) / list.length] : G.LOCS[loc].spawn);
    g.cam.bounds = null; g.follow(null); g.focus(at[0], at[1], 16); g.setZoom((spec.cam && spec.cam.zoom) || 1);
    const yaw = Math.round(((spec.cam && spec.cam.yaw) || 0) / 15) * 15; if (Math.round(g.yaw || 0) !== yaw && !g.view.isSide) g.rotateView(yaw - (g.yaw || 0));
    for (const c of list) { const pose = c.p.pose || 'none', mv = this.MOVE[pose]; c.rig.vb = mv ? { kind: mv, u: .5, w: 1 } : null;
      c.rig.update(dt, { x: c.x, y: c.y, z: c.z, facing: c.f, pose: this.POSE[pose] || null, expr: c.p.expr && c.p.expr !== 'neutral' ? c.p.expr : null }); }
    return { loc, map, list };
  },
  draw(r, spec) {
    const loc = G.LOCS[spec.loc] ? spec.loc : 'beach', map = G.locMaps()[loc], tod = spec.tod || 'afternoon', night = tod === 'night';
    G.applyLight(tod, 'sunny', night || loc === 'casino' || loc === 'villa');
    if (loc !== 'villa' && loc !== 'casino') G.backdrop(tod).draw(r);
    map.drawFloor(r); if (map.queueWalls) map.queueWalls(r); G.drawLocProps(r, loc, night);
    for (const c of this.rigsFor(spec)) { r.shadow(c.x, c.y, 6, .3); r.actor(c.x, c.y, c.z, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); }
    if (night) G.game.lights.add((spec.cam && spec.cam.at || [352, 240])[0], (spec.cam && spec.cam.at || [352, 240])[1], 30, 160, .7, { color: '#ffd8a0' });
    r.overlay(g => {
      const W = r.W, H = r.H, f = spec.filter;
      if (f === 'Sunny') px.blend(g, .15, 'screen', () => px.rect(g, 0, 0, W, H, '#ffb060')); else if (f === 'Sepia') px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#c8a070'));
      else if (f === 'Night Glow') px.blend(g, .3, 'multiply', () => px.rect(g, 0, 0, W, H, '#6a80ff')); else if (f === 'Retro') px.blend(g, .15, 'normal', () => { for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 1, '#000000'); });
      if (spec.frame === 'Postcard') { px.rect(g, 0, 0, W, 6, '#fff8e8'); px.rect(g, 0, H - 18, W, 18, '#fff8e8'); px.rect(g, 0, 0, 6, H, '#fff8e8'); px.rect(g, W - 6, 0, 6, H, '#fff8e8'); E.font.text(g, 'Greetings from Isla Fortuna', 10, H - 14, '#c8502a', { outline: false }); E.font.text(g, 'Day ' + (spec.day || 1), W - 10, H - 14, '#2a6ad8', { align: 'right', outline: false }); }
    });
  }
};
G.photo = {
  open() {
    if (G.hub || G.attract.active && !this.demo || G.overlay.has('photo')) return;
    const subs = (G.photoSubjects && G.photoSubjects()) || []; const self = this; const prev = G.game.input.preset;
    this.st = { subs, sub: 0, pose: 0, expr: 0, filter: 0, frame: 1, panel: false, row: 0, hide: false, yaw: 0, zoom: G.game.zoom || 1, flash: 0, saved: 0, pan: [0, 0], ask: false };
    this.cam0 = { yaw: G.game.yaw || 0, zoom: G.game.zoom || 1 };
    G.overlay.push({ kind: 'photo', modal: true,
      open() { this.ts = G.game.timeScale; G.game.timeScale = 0; G.game.input.use(Object.assign({}, prev || {}, G.INPUT.MENU)); G.sfx('ui_select'); },
      close() { G.game.timeScale = 1; G.game.resetCamera(); if (prev) G.game.input.use(prev); for (const s of self.st.subs) if (s.rig) s.rig.vb = null; G.photoPan = null; },
      update() { return self.update(); }, draw(r) { self.draw(r); } });
  },
  close() { const o = G.overlay.list.find(o => o.kind === 'photo'); if (o) G.overlay.remove(o); },
  update() {
    const I = G.game.input, S = this.st, g = G.game;
    if (S.flash > 0) S.flash -= 1 / 60;
    if (S.ask) { if (I.pressed('confirm')) { S.ask = false; this.take(true); } else if (I.pressed('cancel')) S.ask = false; return true; }
    if (I.pressed('cancel') && !S.panel) { this.close(); G.sfx('ui_back'); return true; }
    if (I.pressed('hide')) S.hide = !S.hide;
    if (I.pressed('extra')) { S.panel = !S.panel; G.sfx('ui_tick'); }
    if (S.panel) {
      if (I.pressed('cancel')) S.panel = false;
      if (I.repeat('down', .3, .1)) S.row = (S.row + 1) % 4; if (I.repeat('up', .3, .1)) S.row = (S.row + 3) % 4;
      const d = I.repeat('right', .3, .1) ? 1 : I.repeat('left', .3, .1) ? -1 : 0;
      if (d) { const k = ['pose', 'expr', 'filter', 'frame'][S.row], n = [G.PHOTO_POSES, G.PHOTO_EXPR, G.PHOTO_FILTERS, G.PHOTO_FRAMES][S.row].length; S[k] = (S[k] + d + n) % n; G.sfx('ui_tick'); }
      const c = I.clicked(); if (c) { const W = g.W, H = g.H, x0 = Math.round(W * .62), y0 = Math.round(H * .2); for (let k = 0; k < 4; k++) if (c[1] >= y0 + 16 + k * 22 && c[1] < y0 + 34 + k * 22 && c[0] > x0) { S.row = k; const key = ['pose', 'expr', 'filter', 'frame'][k], n = [G.PHOTO_POSES, G.PHOTO_EXPR, G.PHOTO_FILTERS, G.PHOTO_FRAMES][k].length; S[key] = (S[key] + (c[0] > x0 + 70 ? 1 : -1) + n) % n; } }
    } else {
      const m = I.move(); S.pan[0] += m[0] * 1.2; S.pan[1] += m[1] * 1.2; G.photoPan = S.pan;
      const aim = I.padAim, pan = I.pan && I.pan(); if (aim) S.yaw += aim[0] * 2; if (pan) S.yaw += pan[0] * .6;
      if (g.view && !g.view.isSide) { const want = Math.round(S.yaw / 15) * 15; if (want !== Math.round((g.yaw || 0))) g.rotateView(want - (g.yaw || 0)); }
      const w = G.takeWheel(); if (w) S.zoom = clamp(S.zoom * (w < 0 ? 1.1 : .9), .75, 2.5);
      if (I.down('zoomIn')) S.zoom = Math.min(2.5, S.zoom * 1.01); if (I.down('zoomOut')) S.zoom = Math.max(.75, S.zoom / 1.01);
      g.setZoom(S.zoom);
      if (I.pressed('alt') && S.subs.length) { S.sub = (S.sub + 1) % S.subs.length; G.sfx('ui_tick'); }
      if (I.pressed('confirm') || (I.clicked() && !S.hide)) this.take();
    }
    // pose the subject
    const sub = S.subs[S.sub];
    if (sub && sub.rig) { const pose = G.PHOTO_POSES[S.pose], mv = { wave: null, peace: 'peace', hips: null, cheer: null, stretch: 'stretch', lookback: 'lookback', sit: null, victory: 'fistpump', salute: 'salute', bow: 'bow' }[pose];
      sub.rig.vb = mv ? { kind: mv, u: .5, w: 1 } : null; const ex = G.PHOTO_EXPR[S.expr];
      sub.rig.update(1 / 120, { x: sub.rig.x, y: sub.rig.y, z: sub.rig.z, facing: sub.rig.facing, pose: { wave: 'wave', hips: 'hips', cheer: 'cheer', sit: 'kneel', victory: 'cheer' }[pose] || null, expr: ex === 'neutral' ? null : ex }); }
    return true;
  },
  /** the shutter: a white flash, a small picture of the buffer with the filter and frame, saved with its spec */
  take(replace) {
    const S = this.st, St = G.state, album = St ? St.album : (G.store.get('aoa-album', []) || []);
    if (album.length >= 24 && !replace) { S.ask = true; return; }
    if (album.length >= 24) album.shift();
    G.sfx('shutter'); G.sting('photo'); S.flash = .25; G.game.flash('#ffffff', .15);
    const spec = { loc: G.game.sceneName === 'location' ? (G.LOC && G.LOC.id) : G.game.sceneName, day: St ? St.day : 0, slot: St ? St.slot : 0, tod: G.curTod || 'afternoon',
      cam: { yaw: G.game.yaw || 0, zoom: S.zoom, view: G.game.baseView ? G.game.baseView.id : (G.game.view && G.game.view.id), at: G.photoFocus() },
      people: S.subs.map((p, k) => ({ id: p.id, x: Math.round(p.rig.x), y: Math.round(p.rig.y), z: Math.round(p.rig.z || 0), facing: +(p.rig.facing || 0).toFixed(2), suit: p.rig.suit || null, acc: (p.rig.acc || []).slice(), pose: k === S.sub ? G.PHOTO_POSES[S.pose] : 'none', expr: k === S.sub ? G.PHOTO_EXPR[S.expr] : 'smile' })),
      filter: G.PHOTO_FILTERS[S.filter], frame: G.PHOTO_FRAMES[S.frame], img: this.capture(), at: Date.now() };
    album.push(spec); if (St) { St.stats.photos++; } G.store.set('aoa-album', (G.store.get('aoa-album', []) || []).concat([spec]).slice(-24));
    S.saved = 1.5; G.bus.emit('photo', spec);
  },
  capture() {
    const buf = G.game.screen && G.game.screen.buf; if (!buf || typeof document === 'undefined') return null;
    const w = 192, h = Math.round(192 * G.game.H / G.game.W), c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.drawImage(buf, 1, 1, G.game.W, G.game.H, 0, 0, w, h);
    const S = this.st, f = G.PHOTO_FILTERS[S.filter];
    if (f !== 'Clean') { const d = g.getImageData(0, 0, w, h), a = d.data; for (let i = 0; i < a.length; i += 4) { let r = a[i], gg = a[i + 1], b = a[i + 2];
      if (f === 'Sunny') { r = r * 1.1 + 12; gg = gg * 1.04 + 6; b = b * .9; }
      else if (f === 'Sepia') { const y = r * .3 + gg * .59 + b * .11; r = y * 1.1 + 20; gg = y * .95 + 8; b = y * .75; }
      else if (f === 'Retro') { r = Math.round(r / 64) * 64; gg = Math.round(gg / 64) * 64; b = Math.round(b / 64) * 64; }
      else if (f === 'Night Glow') { r = r * .7 + 10; gg = gg * .8 + 20; b = b * 1.1 + 40; }
      a[i] = clamp(r, 0, 255); a[i + 1] = clamp(gg, 0, 255); a[i + 2] = clamp(b, 0, 255); } g.putImageData(d, 0, 0); }
    if (G.PHOTO_FRAMES[S.frame] === 'Postcard') {
      g.fillStyle = '#fff8e8'; g.fillRect(0, 0, w, 5); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h);
      E.font.text(g, 'Greetings from Isla Fortuna', 7, h - 11, '#c8502a', { outline: false });
      const St = G.state; E.font.text(g, 'Day ' + (St ? St.day : 1), w - 8, h - 11, '#2a6ad8', { align: 'right', outline: false });
      g.fillStyle = '#ff5f7a'; g.fillRect(w - 22, 8, 14, 16); g.fillStyle = '#fff3c0'; g.fillRect(w - 20, 10, 10, 12);
    }
    try { return c.toDataURL('image/jpeg', .82); } catch (e) { return null; }
  },
  draw(r) {
    const S = this.st, W = r.W, H = r.H;
    r.overlay(g => {
      const f = G.PHOTO_FILTERS[S.filter];
      if (f === 'Sunny') px.blend(g, .15, 'screen', () => px.rect(g, 0, 0, W, H, '#ffb060')); else if (f === 'Sepia') px.blend(g, .35, 'multiply', () => px.rect(g, 0, 0, W, H, '#c8a070'));
      else if (f === 'Night Glow') px.blend(g, .3, 'multiply', () => px.rect(g, 0, 0, W, H, '#6a80ff')); else if (f === 'Retro') px.blend(g, .15, 'normal', () => { for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 1, '#000000'); });
      if (G.PHOTO_FRAMES[S.frame] === 'Postcard') { px.rect(g, 0, 0, W, 6, '#fff8e8'); px.rect(g, 0, H - 18, W, 18, '#fff8e8'); px.rect(g, 0, 0, 6, H, '#fff8e8'); px.rect(g, W - 6, 0, 6, H, '#fff8e8'); E.font.text(g, 'Greetings from Isla Fortuna', 10, H - 14, '#c8502a', { scale: 1, outline: false }); }
      if (S.flash > 0) px.blend(g, Math.min(1, S.flash * 4), 'normal', () => px.rect(g, 0, 0, W, H, '#ffffff'));
      if (S.saved > 0) { S.saved -= 1 / 60; const k = Math.min(1, S.saved); E.ui.box(g, W - 90, Math.round(H * .1) + Math.round((1 - k) * 20), 80, 54, { bg: '#fff8e8', border: '#c8502a' }); E.font.text(g, 'Developing...', W - 50, Math.round(H * .1) + 22, '#c8502a', { align: 'center', outline: false }); }
      if (S.hide) return;
      E.ui.box(g, 8, 8, 120, 14, { bg: G.THEMES.day.bg, border: '#f6d38a' }); E.font.text(g, 'POSTCARD MODE', 14, 11, '#ffd36a', { outline: false });
      const sub = S.subs[S.sub]; if (sub) E.font.text(g, 'Subject: ' + G.CAST[sub.id].short, 14, 26, '#fff8e8', { shadow: '#000', outline: false });
      if (S.panel) {
        const x0 = Math.round(W * .62), y0 = Math.round(H * .2); G.UI.panel(g, x0 - 6, y0 - 4, Math.round(W * .34), 110);
        E.font.text(g, 'POSE & LOOK', x0, y0 + 2, '#9fd3d6', { outline: false });
        [['Pose', G.PHOTO_POSES[S.pose]], ['Expression', G.PHOTO_EXPR[S.expr]], ['Filter', G.PHOTO_FILTERS[S.filter]], ['Frame', G.PHOTO_FRAMES[S.frame]]].forEach(([k, v], i) => {
          const it = { x: x0, y: y0 + 16 + i * 22, w: Math.round(W * .3), h: 18, label: k, align: 'left', right: '◀ ' + G.cap(v) + ' ▶' }; G.UI.button(g, it, i === S.row); });
      }
      if (S.ask) { G.UI.panel(g, W / 2 - 110, H * .42, 220, 40); E.font.text(g, 'Album full: replace the oldest?', W / 2, H * .42 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes   ' + G.btn('cancel') + ' No', W / 2, H * .42 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    if (!S.hide) G.promptBar(r, S.panel ? [['up', 'Choose'], ['left', 'Change'], ['cancel', 'Close panel']] : [['confirm', 'Snap'], ['alt', 'Subject'], ['extra', 'Pose & look'], ['hide', 'Hide UI'], ['cancel', 'Exit']]);
  }
};
/* ---- the album: 4 x 2 thumbnails a page ---- */
G.SCENES.album = {
  input: G.INPUT.MENU,
  enter(d) { this.d = d || {}; this.page = 0; this.open = -1; this.focus = new G.Focus(); this.ask = false; this.imgs = new Map(); G.music('siesta'); },
  list() { return G.albumAll(); },
  img(spec) { if (!spec.img || typeof Image === 'undefined') return null; let im = this.imgs.get(spec); if (!im) { im = new Image(); im.src = spec.img; this.imgs.set(spec, im); } return im; },
  layout() {
    const W = G.game.W, H = G.game.H, L = this.list(), per = 8, cw = Math.round(W * .2), ch = Math.round(cw * .62), x0 = Math.round(W / 2 - (cw * 4 + 18) / 2), y0 = Math.round(H * .18);
    const out = []; for (let k = 0; k < per; k++) { const i = this.page * per + k; if (i >= L.length) break; out.push({ id: i, x: x0 + (k % 4) * (cw + 6), y: y0 + Math.floor(k / 4) * (ch + 22), w: cw, h: ch }); } return out;
  },
  update() {
    const I = G.game.input, L = this.list();
    if (this.ask) { if (I.pressed('confirm')) { L.splice(this.open, 1); if (!G.state) G.store.set('aoa-album', L); this.open = -1; this.ask = false; G.sfx('ui_back'); } else if (I.pressed('cancel')) this.ask = false; return; }
    if (this.open >= 0) {
      if (L[this.open]) G.specScene.prepare(L[this.open], 1 / 120);
      if (I.pressed('cancel') || I.pressed('confirm') || I.clicked()) { this.open = -1; G.game.resetCamera(); return; }
      if (I.pressed('alt')) this.ask = true;
      if (I.pressed('extra')) { const s = L[this.open]; if (s && s.img) { G.store.set('aoa-title-postcard', s.img); G.toast('Title backdrop set', 'It shows behind the logo now.'); } }
      if (I.pressed('tabR') && !G.hub && typeof document !== 'undefined') { const s = L[this.open]; if (s && s.img) { const a = document.createElement('a'); a.href = s.img; a.download = 'isla-fortuna-postcard-' + (this.open + 1) + '.jpg'; a.click(); } }
      if (I.repeat('right', .35, .15)) this.open = Math.min(L.length - 1, this.open + 1); if (I.repeat('left', .35, .15)) this.open = Math.max(0, this.open - 1);
      return;
    }
    const f = this.focus.set(this.layout()).update();
    if (f.back || I.pressed('pause')) { G.go(this.d.from || (this.d.all ? 'menu' : 'location'), this.d.back || { loc: 'villa' }, { fade: .2 }); return; }
    if (f.tabR && (this.page + 1) * 8 < L.length) this.page++; if (f.tabL && this.page > 0) this.page--;
    if (f.pick) this.open = f.pick.id;
  },
  draw(r) {
    const L = this.list();
    if (this.open >= 0 && L[this.open] && !this.ask) { G.specScene.draw(r, L[this.open]); G.promptBar(r, [['alt', 'Delete'], ['extra', 'Title backdrop'], ['tabR', 'Export PNG'], ['cancel', 'Close']], G.game.input, r.H - 38); return; }
    G.backdrop('night').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.title(g, 'ALBUM', W / 2, Math.round(H * .04), { scale: 2 });
      E.font.text(g, L.length + ' / 24 postcards • page ' + (this.page + 1), W / 2, Math.round(H * .04) + 20, '#9fd3d6', { align: 'center', outline: false });
      if (!L.length) E.font.text(g, 'No postcards yet. Pause anywhere on the island and choose Take a Postcard.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false });
      this.layout().forEach((it, k) => { const s = L[it.id], im = this.img(s); E.ui.box(g, it.x - 2, it.y - 2, it.w + 4, it.h + 4, { bg: '#fff8e8', border: '#c8502a' }); if (im && im.complete && im.width) g.drawImage(im, it.x, it.y, it.w, it.h); else G.drawPostcardArt(g, it.x, it.y, it.w, it.h, s); if (k === this.focus.i) G.UI.focus(g, it.x - 2, it.y - 2, it.w + 4, it.h + 4); E.font.text(g, 'Day ' + s.day + ' • ' + (G.LOCS[s.loc] ? G.LOCS[s.loc].name : G.cap(String(s.loc || ''))), it.x, it.y + it.h + 4, '#fff8e8', { outline: false }); });
      if (this.open >= 0 && L[this.open]) { const s = L[this.open], im = this.img(s), w = Math.round(W * .8), h = Math.round(w * H / W); px.blend(g, .85, 'normal', () => px.rect(g, 0, 0, W, H, '#000000')); const x = Math.round(W / 2 - w / 2), y = Math.round(H * .08); if (im && im.complete && im.width) g.drawImage(im, x, y, w, h); else G.drawPostcardArt(g, x, y, w, h, s); }
      if (this.ask) { G.UI.panel(g, W / 2 - 100, H * .42, 200, 40); E.font.text(g, 'Delete this postcard?', W / 2, H * .42 + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes   ' + G.btn('cancel') + ' No', W / 2, H * .42 + 24, '#fff8e8', { align: 'center', outline: false }); }
    });
    G.promptBar(r, this.open >= 0 ? [['alt', 'Delete'], ['extra', 'Title backdrop'], ['tabR', 'Export PNG'], ['cancel', 'Close']] : [['confirm', 'Open'], ['tabL', 'Page'], ['tabR', 'Page'], ['cancel', 'Back']]);
  }
};
/** a painted card for a postcard with no picture (headless, or blocked canvas): its place's colours and who was in it */
G.drawPostcardArt = (g, x, y, w, h, s) => {
  const T = G.TOD[s.tod] || G.TOD.afternoon; px.rect(g, x, y, w, Math.round(h * .5), T.sky[1]); px.rect(g, x, y + Math.round(h * .5), w, Math.round(h * .2), T.sea); px.rect(g, x, y + Math.round(h * .7), w, h - Math.round(h * .7), '#f3d9a4');
  (s.people || []).slice(0, 4).forEach((p, k) => { const c = G.CAST[p.id]; if (!c) return; const cx = x + 10 + k * (w - 20) / 4; px.rect(g, cx, y + h * .52, 6, 10, c.color || '#ffffff'); px.disc(g, cx + 3, y + h * .48, 3, c.skin); });
};

// ==== 50-title.js ====
/* 50-title: the title (a sunset beach, the six fighters idling on the sand, the logo), the main menu, How to Play and
 * About & Credits. The touch-only gate shows on the title and menu. */
G.INPUT.MENU.snap = ['KeyC', 'Pad8'];
G.TITLE_IDLE = { rin: 'stretch', lola: 'fistpump', ingrid: 'foldarms', amara: 'dance', tess: 'shaka', mei: 'backflip' };
G.titleCast = () => G.FIGHTERS.map((id, k) => ({ id, x: 268 + k * 34, y: 84 + (k % 2) * 8, rig: G.anim.rig(G.makeRig(id)), ph: k * .7 }));
G.drawBeachStage = (r, cast, tod = 'sunset', focusY = 300) => {
  G.backdrop(tod).draw(r); G.courtMap().drawFloor(r);
  r.prop('palm', 170, 70, 0, { size: 1.8 }); r.prop('palm', 540, 64, 0, { size: 1.9 }); r.prop('palm', 590, 110, 0, { size: 1.5 });
  r.shape('umbrella', 210, 96, 0, { mats: { a: 'aoa_canvasP' } }); r.shape('lounger', 196, 110, 0, { facing: Math.PI / 2 }); r.shape('surfrack', 500, 100, 0, { facing: Math.PI / 2 });
  r.shape('beachtowel', 300, 118, 0); r.shape('beachtowel', 420, 120, 0, { mats: { t: 'aoa_canvasB' } }); r.shape('sandcastle', 460, 126, 0); r.shape('cooler', 330, 124, 0);
  if (tod === 'night') for (const x of [230, 480]) r.shape('torchpost', x, 90, 0, { light: true });
  for (const c of cast) { r.shadow(c.x, c.y, 7, .35); r.actor(c.x, c.y, 0, (g, ox, oy) => c.rig.draw(g, ox, oy, r.view), { key: c.rig }); }
};
G.updateCast = (cast, dt, t) => {
  for (const c of cast) {
    const mv = G.TITLE_IDLE[c.id] || 'wave', u = ((t * .5 + c.ph) % 3) / 3, act = u < .55;
    c.rig.vb = act && G.MOVES[mv] ? { kind: mv, u: u / .55, w: G.anim.weight(u / .55) } : null;
    c.rig.update(dt, { x: c.x, y: c.y, z: 0, facing: Math.PI / 2 + Math.sin(t * .3 + c.ph) * .25, pose: act && !G.MOVES[mv] ? mv : null, expr: act ? 'smile' : null });
  }
};
G.drawLogo = (g, W, y, small) => {
  const sc = small ? 3 : 4;
  E.font.title(g, 'AHEAD OR ALIVE', W / 2, y, { scale: sc, colors: ['#fff7d6', '#ffd36a', '#ff9e5e', '#ff5f7a'], depth: 3, align: 'center', depthColor: '#5a1a3a' });
  const lw = E.font.width('AHEAD OR ALIVE', { scale: sc }), bx = Math.round(W / 2 + lw / 2 + 10), by = y + 10, rot = Math.floor(G.game.real * 8) % 3;
  px.sprite(g, G.BALL_SPR[rot], bx, by - 4);
  E.font.text(g, 'XTREME BEACH VOLLEYBALL', W / 2, y + sc * 7 + 8, '#ffffff', { scale: 2, align: 'center', shadow: '#1f7a8c', outline: false });
};
/** the touch-only gate's panel: returns the Settings button's rect */
G.drawTouchGate = (g, W, H) => {
  const w = Math.min(280, W - 30), h = 74, x = Math.round(W / 2 - w / 2), y = Math.round(H * .58);
  G.UI.panel(g, x, y, w, h);
  E.font.text(g, 'Controller or keyboard required', W / 2, y + 8, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
  E.font.text(g, 'Connect a controller or keyboard to play.', W / 2, y + 22, '#fff8e8', { align: 'center', outline: false });
  E.font.text(g, 'The demo keeps running.', W / 2, y + 32, '#9fd3d6', { align: 'center', outline: false });
  const b = { x: Math.round(W / 2 - 50), y: y + 46, w: 100, h: 20, label: 'SETTINGS', scale: 1 }; G.UI.button(g, b, true); return b;
};
G.gateTap = () => { const c = G.game.input.clicked(); if (!c) return; const W = G.game.W, H = G.game.H, y = Math.round(H * .58) + 46; if (c[0] > W / 2 - 50 && c[0] < W / 2 + 50 && c[1] > y && c[1] < y + 20) G.game.menu('settings'); };
G.SCENES.title = {
  view: 'court', input: G.INPUT.MENU,
  enter() {
    this.cast = this.cast || G.titleCast(); this.t = 0; G.UI.theme = 'day'; G.applyLight('sunset'); G.music('sunrise'); G.ambience.set('beach');
    G.game.cam.frame(null); G.game.setZoom(1.3); this.sonnyX = -999; this.sonnyRig = this.sonnyRig || G.anim.rig(G.makeRig('sonny')); G.attract.reset();
    this.backdrop = G.titlePostcard();
  },
  exit() { G.game.setZoom(1); },
  update(dt) {
    this.t += dt; G.updateCast(this.cast, dt, this.t); G.ambience.update(dt);
    // now and then Sonny jogs across the back with a giant trophy
    if (this.sonnyX < -900 && this.t % 14 < dt) this.sonnyX = 120;
    if (this.sonnyX > -900) { this.sonnyX += 70 * dt; this.sonnyRig.vb = { kind: 'stretch', u: 0, w: .8 }; this.sonnyRig.update(dt, { x: this.sonnyX, y: 56, z: 0, vx: 70, vy: 0, facing: 0, expr: 'shout' }); if (this.sonnyX > 640) this.sonnyX = -999; }
    G.game.focus(352, 96, 30);
    if (G.touchOnly()) { G.gateTap(); return; }
    const I = G.game.input;
    if (I.pressed('confirm') || I.pressed('start') || I.clicked()) { G.sfx('ui_select'); G.go('menu', null, { fade: .2 }); }
  },
  draw(r) {
    if (!this.cast) this.cast = G.titleCast();
    if (this.backdrop && this.backdrop.complete && this.backdrop.width) r.overlay(g => g.drawImage(this.backdrop, 0, 0, r.W, r.H));
    else {
      G.drawBeachStage(r, this.cast, 'sunset');
      if (this.sonnyX > -900) { const sr = this.sonnyRig, x = this.sonnyX; r.actor(x, 56, 0, (g, ox, oy) => sr.draw(g, ox, oy, r.view)); r.queue(x + 6, 56, 34, g => { const [sx, sy] = r.w(x + 6, 58, 30); px.rect(g, Math.round(sx) - 3, Math.round(sy) - 10, 7, 8, '#ffd36a'); px.rect(g, Math.round(sx) - 1, Math.round(sy) - 2, 3, 4, '#c89020'); px.rect(g, Math.round(sx) - 3, Math.round(sy) + 2, 7, 2, '#8a5a10'); px.dot(g, Math.round(sx) - 1, Math.round(sy) - 8, '#fff3c0'); }, { bias: 5 }); }
    }
    r.overlay(g => {
      const W = r.W, H = r.H;
      G.drawLogo(g, W, Math.round(H * .1));
      if (G.touchOnly()) G.drawTouchGate(g, W, H);
      else if (Math.floor(G.game.real * 2) % 2 === 0) { const I = G.game.input, txt = 'PRESS', code = G.codeFor('confirm', I), w = E.font.width(txt, { scale: 2 }) + 6 + G.glyphW(code, I); const x = Math.round(W / 2 - w / 2), y = Math.round(H * .62); E.font.text(g, txt, x, y, '#fff8e8', { scale: 2, shadow: '#000', outline: false }); G.drawGlyph(g, x + w - G.glyphW(code, I), y + 3, code, I); }
      E.font.text(g, (E.versionLabel ? E.versionLabel() : 'v' + E.version).replace(/·/g, '•'), 6, H - 10, '#c8b8e0', { outline: false, shadow: '#000' });
      E.font.text(g, 'An original parody-tribute game • Game v' + G.VERSION, W - 6, H - 10, '#c8b8e0', { align: 'right', outline: false, shadow: '#000' });
    });
  }
};
/** the main menu: a big list at the left, a turning fighter at the right */
G.SCENES.menu = {
  view: 'court', input: G.INPUT.MENU,
  enter() {
    this.focus = this.focus || new G.Focus(); this.t = 0; this.cast = G.SCENES.title.cast || G.titleCast(); this.prev = this.prev || 0;
    G.applyLight('sunset'); G.music('sunrise'); G.game.setZoom(1.3); G.attract.reset();
    this.preview = this.preview || G.anim.rig(G.makeRig('rin', { size: 2.2 }));
  },
  exit() { G.game.setZoom(1); },
  items() {
    const saves = G.game.saves, any = !G.hub && saves.latest && saves.latest();
    const album = G.albumAll().length > 0;
    return [
      { id: 'new', label: 'New Vacation' }, any ? { id: 'continue', label: 'Continue' } : null, { id: 'load', label: 'Load', disabled: !any },
      { id: 'beach', label: 'Beach Match' }, album ? { id: 'album', label: 'Album' } : null,
      { id: 'howto', label: 'How to Play' }, { id: 'settings', label: 'Settings' }, { id: 'about', label: 'About & Credits' }
    ].filter(Boolean);
  },
  layout() { const H = G.game.H, W = G.game.W, list = this.items(), h = 18, gap = 4, y0 = Math.round(H * .26); return G.UI.column(list, Math.round(W * .05) + 70, y0, 140, h, gap, { align: 'left' }); },
  update(dt) {
    this.t += dt; G.updateCast(this.cast, dt, this.t); G.game.focus(352, 96, 30);
    if (G.touchOnly()) { G.gateTap(); return; }
    const f = this.focus.set(this.layout()).update();
    const fighter = G.FIGHTERS[Math.floor(this.t / 4) % 6];
    if (this.preview.castId !== fighter) { this.preview = G.anim.rig(G.makeRig(fighter, { size: 2.2 })); }
    this.preview.update(dt, { x: 0, y: 0, z: 0, facing: this.t * .9, pose: null });
    if (f.back || G.game.input.pressed('pause')) { G.go('title', null, { fade: .2 }); return; }
    if (!f.pick) return;
    const id = f.pick.id;
    if (id === 'new') G.newVacationFlow();
    else if (id === 'continue') { const s = G.game.saves.latest(); if (s && G.game.saves.load(s.slot)) G.resumeVacation(); }
    else if (id === 'load') G.game.saves.show('load', save => { if (save) G.resumeVacation(); });
    else if (id === 'beach') G.go('exhibition');
    else if (id === 'album') G.go('album', { all: true });
    else if (id === 'howto') G.go('howto', { from: 'menu' });
    else if (id === 'settings') G.game.menu('settings');
    else if (id === 'about') G.go('about');
  },
  draw(r) {
    if (!this.cast) this.cast = G.SCENES.title.cast || G.titleCast();
    G.drawBeachStage(r, this.cast, 'sunset');
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, Math.round(W * .05) + 150, H, '#061a24'));
      E.font.title(g, 'AHEAD OR ALIVE', Math.round(W * .05) + 70, Math.round(H * .08), { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 });
      E.font.text(g, 'XTREME BEACH VOLLEYBALL', Math.round(W * .05) + 70, Math.round(H * .08) + 18, '#ffffff', { align: 'center', shadow: '#1f7a8c', outline: false });
      if (G.touchOnly()) { G.drawTouchGate(g, W, H); return; }
      const L = this.layout(); L.forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
      // the turning fighter
      const pv = this.preview; if (!pv) return; const c = G.CAST[pv.castId], px0 = Math.round(W * .72), py0 = Math.round(H * .72);
      G.UI.panel(g, px0 - 70, Math.round(H * .18), 140, Math.round(H * .66), { alpha: .7 });
      pv.draw(g, px0, py0, G.VIEW_COURT);
      E.font.text(g, c.name, px0, Math.round(H * .18) + 6, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
      E.font.text(g, '"' + c.epithet + '"', px0, Math.round(H * .18) + 16, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
      const tip = { new: 'Five days on Isla Fortuna. Friends, swimsuits, the Cup.', continue: 'Back to your latest save.', load: 'Pick a save slot.', beach: 'Any fighters, 1-4 players on this machine.', album: 'Your postcards from the island.', howto: 'Ten short pages: the controls and the island.', settings: 'Difficulty, timing, camera, sound, button symbols.', about: 'Credits, source information and feedback.' }[(this.focus.cur || {}).id] || '';
      E.font.text(g, tip, W / 2, Math.round(H * .88), '#fff8e8', { align: 'center', shadow: '#000', outline: false });
    });
    G.promptBar(r, [['confirm', 'Select'], ['cancel', 'Back']]);
  }
};
/* ---- How to Play: ten pages, one idea each, with a live mini scene ---- */
G.HOWTO = [
  ['Moving and the ring', 'Move with the stick, the d-pad or WASD. A ring on the sand shows where the ball comes down: run into it. It shrinks as the ball falls and turns gold in the PERFECT window.', 'ring'],
  ['Bump, set, spike', 'One button does it all. Press {play} as the ball reaches you: the first touch bumps, the second sets, the third spikes. You jump on your own for the spike: press at the top.', 'chain'],
  ['Aiming and shots', 'Hold the stick as you hit to aim: toward the net for short, away for deep, up or down for the lines. With a mouse, point at their court. {shot} plays a soft cut shot that floats over the block.', 'aim'],
  ['Serving', 'Walk along the baseline. {play} tosses a float serve, {shot} a jump serve. Press again at the top of the toss. Late, early or slow serves go wide or into the net.', 'serve'],
  ['Blocking and diving', 'When they attack near the net, press {shot} to jump and block. Time it with their hit. Out of reach? {dive} lunges for a dig.', 'block'],
  ['Calls and chemistry', '{call} calls Mine, Yours or Auto, and your partner listens. The better you get along, the better your partner passes, sets and covers.', 'call'],
  ['The vacation', 'Five days, each a Morning, an Afternoon and a Night. Visiting a place or playing a match uses the slot. Matches pay Sonny Dollars; nights are for the casino or the villa.', 'map'],
  ['Friends and gifts', 'Talk to the fighters, learn what they like and bring gifts. Hearts show your friendship. Friends team up with you; strangers decline. Lose too often and partners walk.', 'gift'],
  ['Casino and Pool Hop', 'Pool Hop: press the button shown on each pad as you land, on the beat. Casino Fortuna at night: Fortuna Sevens slots, blackjack and roulette. Chips cash out at S$100.', 'pool'],
  ['Postcards', 'Pause and choose Take a Postcard (or {snap}) to freeze the moment. Orbit, zoom, pose everyone, add a filter and a frame. Your album keeps up to 24.', 'photo']
];
G.HowTo = class {
  constructor(back) { this.page = 0; this.back = back; this.t = 0; this.focus = new G.Focus(); this.rig = G.anim.rig(G.makeRig('tess', { size: 1.6 })); }
  update(dt, I = G.game.input) {
    this.t += dt; const f = this.focus.set(this.items()).update(I);
    if (f.back || I.pressed('pause')) { this.back(); return true; }
    if (f.tabR || I.repeat('right', .35, .2) || (f.pick && f.pick.id === 'next')) { this.page = (this.page + 1) % G.HOWTO.length; this.t = 0; G.sfx('ui_tab'); }
    if (f.tabL || I.repeat('left', .35, .2) || (f.pick && f.pick.id === 'prev')) { this.page = (this.page + G.HOWTO.length - 1) % G.HOWTO.length; this.t = 0; G.sfx('ui_tab'); }
    if (f.pick && f.pick.id === 'done') this.back();
    const demo = G.HOWTO[this.page][2], u = (this.t % 2) / 2;
    const move = { ring: 'ready', chain: ['bump', 'set', 'spike'][Math.floor(this.t / 1.2) % 3], aim: 'spike', serve: u < .5 ? 'toss' : 'serve', block: 'block', call: 'call', map: 'wave', gift: 'give', pool: null, photo: 'peace' }[demo];
    this.rig.vb = move ? { kind: move, u: (this.t % 1.2) / 1.2, w: 1 } : null;
    this.rig.update(dt, { x: 0, y: 0, z: demo === 'block' || (demo === 'chain' && move === 'spike') ? Math.abs(Math.sin(this.t * 2.6)) * 8 : 0, facing: .3, pose: demo === 'pool' ? 'cheer' : null, expr: 'smile' });
    return true;
  }
  items() { const W = G.game.W, H = G.game.H, y = Math.round(H * .84) - 6; return [{ id: 'prev', label: '◀ Prev', x: Math.round(W / 2) - 150, y, w: 80, h: 18 }, { id: 'done', label: 'Done', x: Math.round(W / 2) - 40, y, w: 80, h: 18 }, { id: 'next', label: 'Next ▶', x: Math.round(W / 2) + 70, y, w: 80, h: 18 }]; }
  draw(r, I = G.game.input) {
    r.overlay(g => {
      const W = r.W, H = r.H, [title, text, demo] = G.HOWTO[this.page];
      px.blend(g, .8, 'normal', () => px.rect(g, 0, 0, W, H, '#061a24'));
      G.UI.panel(g, Math.round(W * .05), Math.round(H * .06), Math.round(W * .9), Math.round(H * .76));
      E.font.text(g, 'HOW TO PLAY  ' + (this.page + 1) + ' / ' + G.HOWTO.length, Math.round(W * .05) + 10, Math.round(H * .06) + 8, '#9fd3d6', { outline: false });
      G.UI.heading(g, title, Math.round(W * .05) + 10, Math.round(H * .06) + 20);
      const tw = Math.round(W * .5), lines = E.font.wrap(G.fillTips(text, I), tw);
      lines.forEach((l, k) => E.font.text(g, l, Math.round(W * .05) + 10, Math.round(H * .06) + 44 + k * 11, '#fff8e8', { shadow: '#000', outline: false }));
      // the live mini scene
      const bx = Math.round(W * .62), by = Math.round(H * .16), bw = Math.round(W * .3), bh = Math.round(H * .58);
      E.ui.box(g, bx, by, bw, bh, { bg: ['#7ccaf0', '#f3d9a4'], border: '#f6d38a' });
      px.rect(g, bx + 2, by + Math.round(bh * .55), bw - 4, Math.round(bh * .45) - 2, '#f3d9a4');
      this.rig.draw(g, bx + bw / 2, by + Math.round(bh * .85), G.VIEW_COURT);
      if (demo === 'ring' || demo === 'chain') { const rr = 4 + (1 - (this.t % 1)) * 14; px.ell(g, bx + bw / 2 + 12, by + Math.round(bh * .85), rr, rr * .5, (this.t % 1) > .85 ? '#ffd36a' : '#ffffff'); px.ell(g, bx + bw / 2 + 12, by + Math.round(bh * .85), Math.max(1, rr - 1), Math.max(1, rr * .5 - 1), '#f3d9a4'); }
      if (demo === 'pool') { for (let k = 0; k < 4; k++) { const x = bx + 12 + k * (bw - 24) / 3; px.ell(g, x, by + bh * .75, 9, 4, '#ffd04a'); G.drawGlyph(g, x - 4, by + bh * .75 - 14, G.codeFor(['hopA', 'hopB', 'hopX', 'hopY'][k], I) || 'Pad' + k, I); } }
      if (demo === 'gift') { px.rect(g, bx + bw / 2 + 8, by + bh * .6, 8, 7, '#ff6a3a'); px.rect(g, bx + bw / 2 + 11, by + bh * .6, 2, 7, '#ffffff'); }
      if (demo === 'photo') { px.rect(g, bx + 4, by + 4, bw - 8, 2, '#ffffff'); px.rect(g, bx + 4, by + bh - 6, bw - 8, 2, '#ffffff'); }
      this.items().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
    G.promptBar(r, [['tabL', 'Prev'], ['tabR', 'Next'], ['cancel', 'Back']], I);
  }
};
G.SCENES.howto = {
  input: G.INPUT.MENU,
  enter(d) { this.from = (d && d.from) || 'menu'; this.h = new G.HowTo(() => G.go(this.from, null, { fade: .2 })); G.music('sunrise'); },
  update(dt) { G.howtoPoolBinds(); this.h.update(dt); },
  draw(r) { G.backdrop('afternoon').draw(r); this.h.draw(r); }
};
G.howtoPoolBinds = () => { const I = G.game.input; for (const a of ['hopA', 'hopB', 'hopX', 'hopY']) if (!I.map[a]) I.map[a] = G.INPUT.POOLHOP[a]; };
G.howtoOverlay = () => {
  const prev = G.game.input.preset;
  G.game.input.use(Object.assign({}, prev || G.INPUT.MENU, G.INPUT.MENU));
  const o = { kind: 'howto', modal: true, h: null,
    open() { this.ts = G.game.timeScale; G.game.timeScale = 0; this.h = new G.HowTo(() => { G.overlay.remove(this); }); },
    close() { G.game.timeScale = this.ts || 1; if (prev) G.game.input.use(prev); },
    update(dt) { return this.h.update(1 / 120); }, draw(r) { this.h.draw(r); } };
  return o;
};
/* ---- About & Credits: pages turned with L1/R1, left/right or the arrows; the stick scrolls ---- */
G.SCENES.about = {
  input: G.INPUT.MENU,
  enter() { this.page = 0; this.scroll = 0; this.focus = new G.Focus(); G.music('farewell'); },
  items() { const W = G.game.W, H = G.game.H, y = Math.round(H * .9); return [{ id: 'prev', label: '◀', x: Math.round(W * .05), y, w: 30, h: 16 }, { id: 'back', label: 'Back', x: Math.round(W / 2) - 35, y, w: 70, h: 16 }, { id: 'next', label: '▶', x: Math.round(W * .95) - 30, y, w: 30, h: 16 }]; },
  update(dt) {
    const I = G.game.input, f = this.focus.set(this.items()).update(), n = G.ABOUT.length;
    if (f.back || I.pressed('pause') || (f.pick && f.pick.id === 'back')) { G.go('menu', null, { fade: .2 }); return; }
    if (f.tabR || I.repeat('right', .35, .2) || (f.pick && f.pick.id === 'next')) { this.page = (this.page + 1) % n; this.scroll = 0; }
    if (f.tabL || I.repeat('left', .35, .2) || (f.pick && f.pick.id === 'prev')) { this.page = (this.page + n - 1) % n; this.scroll = 0; }
    const m = I.move(); this.scroll = clamp(this.scroll + m[1] * 120 * dt, 0, this.maxScroll || 0);
  },
  draw(r) {
    G.backdrop('night').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, [title, rowsF] = G.ABOUT[this.page], rows = rowsF(), x = Math.round(W * .06), w = Math.round(W * .88), top = Math.round(H * .06) + 30, bottom = Math.round(H * .86);
      G.UI.panel(g, Math.round(W * .04), Math.round(H * .04), Math.round(W * .92), Math.round(H * .84), { bg: ['#2a1240', '#12081e'], border: '#ff5fa2' });
      E.font.text(g, 'ABOUT & CREDITS  ' + (this.page + 1) + ' / ' + G.ABOUT.length, x, Math.round(H * .06), '#c8a8e0', { outline: false });
      G.UI.heading(g, title, x, Math.round(H * .06) + 10);
      let y = top - this.scroll;
      for (const [k, v] of rows) {
        const lines = E.font.wrap(v, w - (k ? 4 : 0));
        if (k) { if (y > top - 10 && y < bottom) E.font.text(g, k, x, y, '#ffd36a', { outline: false, shadow: '#000' }); y += 10; }
        for (const l of lines) { if (y > top - 10 && y < bottom) E.font.text(g, l, x + (k ? 4 : 0), y, '#fff8e8', { outline: false, shadow: '#000' }); y += 9; }
        y += 4;
      }
      this.maxScroll = Math.max(0, y + this.scroll - bottom);
      if (this.maxScroll > 0) { const sh = bottom - top, k = this.scroll / this.maxScroll; px.rect(g, Math.round(W * .94), top, 2, sh, '#4a2a5a'); px.rect(g, Math.round(W * .94), top + Math.round(k * (sh - 10)), 2, 10, '#ff5fa2'); }
      this.items().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
    G.promptBar(r, [['tabL', 'Page'], ['tabR', 'Page'], ['down', 'Scroll'], ['cancel', 'Back']], G.game.input, Math.round(r.H * .9) - 14);
  }
};

// ==== 51-attract.js ====
/* 51-attract: after 10 s with no input on the title or the menu, an AI-played broadcast: a spectacle match, then a
 * montage of the vacation (each beat the real scene, driven by a demo script), then a title card; then again. Any input
 * returns to the title with the input consumed. A DEMO tag shows top left. The demos run on a throwaway state. */
G.attract = {
  active: false, idle: 0, beat: -1, t: 0, cycle: 0, quiet: false,
  BEATS: [
    { id: 'match', dur: 50, caption: null },
    { id: 'map', dur: 7, caption: 'FIVE DAYS IN PARADISE' },
    { id: 'gift', dur: 7, caption: 'MAKE FRIENDS • GIVE GIFTS' },
    { id: 'shop', dur: 7, caption: 'COLLECT 21 SWIMSUITS' },
    { id: 'poolhop', dur: 8, caption: 'POOL HOP' },
    { id: 'casino', dur: 8, caption: 'CASINO NIGHTS' },
    { id: 'photo', dur: 6, caption: 'SNAP POSTCARDS' },
    { id: 'final', dur: 8, caption: 'BEAT THE HOUSE' },
    { id: 'card', dur: 5, caption: null }
  ],
  reset() { this.idle = 0; G.anyInput = false; },
  /** called every step by every scene: counts idle time on the title and menu, and runs the director */
  watch(dt) {
    const g = G.game, I = g.input, name = g.sceneName;
    const touched = G.anyInput || I.anyPressed() || Math.hypot(...I.move()) > .2 || (I.clicked && I.clicked()); G.anyInput = false;
    if (this.active) {
      if (touched && this.t > .3) { this.stop(); return; }
      this.t += dt; const B = this.BEATS[this.beat];
      if (B && this.t >= B.dur) this.next();
      return;
    }
    if (name !== 'title' && name !== 'menu') { this.idle = 0; return; }
    if (touched || g.paused || G.overlay.list.length) { this.idle = 0; return; }
    this.idle += dt;
    if (this.idle >= 10) this.start();
  },
  start() {
    this.active = true; this.beat = -1; this.cycle++; this.saved = G.state; G.seed('cosmetic', 1000 + this.cycle); G.seed('match', 77 + this.cycle * 13);
    this.next();
  },
  next() {
    for (const o of G.overlay.list.slice()) if (o.kind === 'photo') G.overlay.remove(o);
    G.game.timeScale = 1; G.talkBox().close();
    this.beat = (this.beat + 1) % this.BEATS.length; this.t = 0;
    if (this.beat === 0) { G.seed('match', 77 + this.cycle * 13); this.cycle++; }
    const B = this.BEATS[this.beat]; G.state = G.demoState();
    const pick = G.rshuffle('cosmetic', G.FIGHTERS);
    if (B.id === 'match') {
      const tods = ['afternoon', 'sunset', 'night', 'morning'], tod = tods[this.cycle % 4];
      G.startMatch({ mode: 'attract', spectacle: true, cpuAll: true, pointsToWin: 21, tod, weather: 'sunny', title: 'EXHIBITION', subtitle: 'Isla Fortuna Invitational', skipIntro: false,
        teams: [[{ id: pick[0], suit: G.CAST[pick[0]].suit, acc: G.CAST[pick[0]].acc }, { id: pick[1], suit: G.CAST[pick[1]].suit, acc: G.CAST[pick[1]].acc }], [{ id: pick[2], suit: G.CAST[pick[2]].suit, acc: G.CAST[pick[2]].acc }, { id: pick[3], suit: G.CAST[pick[3]].suit, acc: G.CAST[pick[3]].acc }]],
        after: () => this.next() }, { fade: .3 });
    } else if (B.id === 'final') {
      G.startMatch({ mode: 'attract', spectacle: true, cpuAll: true, pointsToWin: 21, tod: 'sunset', final: true, specials: { glare: true }, title: 'THE FORTUNA CUP FINAL', subtitle: 'versus THE HOUSE', skipIntro: true,
        teams: [[{ id: pick[0], suit: G.CAST[pick[0]].suit, acc: G.CAST[pick[0]].acc }, { id: pick[1], suit: G.CAST[pick[1]].suit, acc: G.CAST[pick[1]].acc }], [{ id: 'sonny', suit: 'house_sonny', acc: ['aviators'] }, { id: 'pepper', suit: 'pinstripe', acc: [] }]], after: () => this.next() }, { fade: .3 });
    } else if (B.id === 'map') G.go('map', { demo: true }, { fade: .3 });
    else if (B.id === 'gift') G.go('location', { loc: 'beach', demo: 'gift' }, { fade: .3 });
    else if (B.id === 'shop') G.go('shop', { shop: 'coral', demo: true }, { fade: .3 });
    else if (B.id === 'poolhop') G.go('poolhop', { demo: true }, { fade: .3 });
    else if (B.id === 'casino') G.go('casino', { demo: true }, { fade: .3 });
    else if (B.id === 'photo') G.go('location', { loc: 'pool', demo: 'photo' }, { fade: .3 });
    else if (B.id === 'card') G.go('title', { card: true }, { fade: .3 });
  },
  stop() {
    this.active = false; this.idle = 0; G.state = this.saved || null; for (const o of G.overlay.list.slice()) if (o.kind === 'photo') G.overlay.remove(o); G.game.timeScale = 1; G.talkBox().close();
    G.game.input.consumeAll(); G.curSong = null; G.go('title', null, { fade: .2 });
  },
  draw(r) {
    if (!this.active) return;
    const B = this.BEATS[this.beat];
    r.overlay(g => {
      const blink = Math.floor(G.game.real * 2) % 2;
      E.ui.box(g, 6, 6, 38, 13, { bg: '#c8202c', border: '#ffd36a' }); E.font.text(g, 'DEMO', 13, 9, blink ? '#ffffff' : '#ffd36a', { outline: false });
      if (B && B.caption) { const y = Math.round(r.H * .14), k = Math.min(1, this.t * 3); px.blend(g, .7 * k, 'normal', () => px.rect(g, 0, y - 6, r.W, 30, '#061a24')); E.font.title(g, B.caption, r.W / 2, y, { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 }); }
      const msg = G.touchOnly() ? 'Controller or keyboard required' : 'PRESS ANY BUTTON';
      if (blink || G.touchOnly()) E.font.text(g, msg, r.W / 2, r.H - 34, '#fff8e8', { align: 'center', shadow: '#000', outline: false, scale: G.touchOnly() ? 1 : 1 });
    });
  }
};
const _dn = G.drawNotices; G.drawNotices = r => { _dn(r); G.attract.draw(r); };
/** a throwaway vacation for the demos */
G.demoState = () => { const S = G.newState('amara', 4242); S.day = 2; S.slot = 1; S.partner = 'lola'; S.money = 88000; S.chips = 120; S.bag = { portable_speaker: 1, mochi_box: 2 }; S.demo = true; return S; };

// ==== 52-exhibition.js ====
/* 52-exhibition: Beach Match. First the options (points, sets, difficulty, court time, camera), then the join screen:
 * four slots (Left 1, Left 2, Right 1, Right 2), each a fighter on a pedestal and who holds it (CPU or P1-P4). Players join
 * with Start on a free pad or 2 on the keyboard (the halves); each moves her badge with left / right, picks a fighter
 * with up / down, an outfit with Option, and readies with Confirm. Any mix of 1-4 players and CPUs. */
G.EXH = { points: 1, sets: 0, diff: 1, tod: 1, cam: 0 };
G.EXH_OPTS = { points: [7, 11, 15, 21], sets: [1, 3], diff: ['Easy', 'Normal', 'Hard', 'Pro'], tod: ['Morning', 'Sunset', 'Night'], cam: ['Broadcast', 'Serve Cam'] };
// the join screen's keys: two unused actions first so a keyboard half's Option lands on H (or ,), clear of its Ready key
G.INPUT.JOIN = Object.assign({ up: G.INPUT.MENU.up, down: G.INPUT.MENU.down, left: G.INPUT.MENU.left, right: G.INPUT.MENU.right, _f: [], _g: [], alt: ['KeyF', 'Pad2'] }, { start: G.INPUT.MENU.start, pause: G.INPUT.MENU.pause, confirm: G.INPUT.MENU.confirm, cancel: G.INPUT.MENU.cancel });
G.SCENES.exhibition = {
  input: G.INPUT.JOIN,
  enter(d) {
    for (const q of G.game.players.slice(1)) G.game.removePlayer(q);
    this.phase = 'opts'; this.focus = new G.Focus(); this.t = 0; G.music('sunrise'); G.UI.theme = 'day';
    this.slots = [{ who: null, f: 0, o: 0 }, { who: null, f: 1, o: 0 }, { who: null, f: 4, o: 0 }, { who: null, f: 5, o: 0 }];
    this.pl = [];   // { input, slot, ready }
    this.rigs = {};
  },
  exit() { G.game.allowJoin(false); },
  optItems() { const W = G.game.W, H = G.game.H, x = Math.round(W / 2), y = Math.round(H * .24), E2 = G.EXH, O = G.EXH_OPTS;
    return G.UI.column([{ id: 'points', label: 'Points to win', right: '◀ ' + O.points[E2.points] + ' ▶', kind: 'stepper' }, { id: 'sets', label: 'Sets', right: '◀ ' + (O.sets[E2.sets] === 1 ? 'One set' : 'Best of 3') + ' ▶', kind: 'stepper' },
      { id: 'diff', label: 'CPU difficulty', right: '◀ ' + O.diff[E2.diff] + ' ▶', kind: 'stepper' }, { id: 'tod', label: 'Court time', right: '◀ ' + O.tod[E2.tod] + ' ▶', kind: 'stepper' }, { id: 'cam', label: 'Camera', right: '◀ ' + O.cam[E2.cam] + ' ▶', kind: 'stepper' },
      { id: 'next', label: 'Choose fighters ▶' }], x, y, 220, 20, 5, { align: 'left' }); },
  suitsFor(id) { const u = G.unlocks(), all = u.done ? G.SUITS.map(s => s.id) : [G.CAST[id].suit].concat(u.suits.filter(s => s !== G.CAST[id].suit)); return all; },
  join(input) {
    if (this.pl.some(p => p.input === input)) return;
    const free = [0, 2, 1, 3].find(k => !this.slots[k].who); if (free === undefined) return;
    this.slots[free].who = input; this.pl.push({ input, slot: free, ready: false }); G.sfx('ui_select');
  },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.phase === 'opts') {
      const f = this.focus.set(this.optItems()).update();
      if (f.back) { G.go('menu'); return; }
      if (f.lr && this.focus.cur.kind === 'stepper') { const k = this.focus.cur.id, n = G.EXH_OPTS[k].length; G.EXH[k] = (G.EXH[k] + f.lr + n) % n; G.sfx('ui_tick'); }
      if (f.pick && f.pick.id === 'next') { this.phase = 'join'; this.join(I); G.game.allowJoin({ max: 4, onJoin: q => this.join(q) }); }
      return;
    }
    // the join screen: each player's own controls
    for (const p of this.pl.slice()) {
      const q = p.input, s = this.slots[p.slot];
      if (!p.ready) {
        for (const [a, d] of [['left', -1], ['right', 1]]) if (q.repeat(a, .35, .2)) { let k = p.slot; for (let n = 0; n < 4; n++) { k = (k + d + 4) % 4; if (!this.slots[k].who) break; } if (!this.slots[k].who) { this.slots[k].who = q; this.slots[k].f = s.f; s.who = null; p.slot = k; G.sfx('ui_tick'); } }
        if (q.repeat('up', .35, .15)) { s.f = (s.f + 5) % 6; s.o = 0; G.sfx('ui_tick'); } if (q.repeat('down', .35, .15)) { s.f = (s.f + 1) % 6; s.o = 0; G.sfx('ui_tick'); }
        if (q.map.alt && q.pressed('alt')) { s.o = (s.o + 1) % this.suitsFor(G.FIGHTERS[s.f]).length; G.sfx('ui_tick'); }
        if (q.pressed('confirm')) { p.ready = true; G.sfx('ui_select'); G.voice.say(G.LINES[G.FIGHTERS[s.f]].bark[0], G.FIGHTERS[s.f]); }
        if (q.pressed('cancel')) { if (q === I) { this.phase = 'opts'; G.game.allowJoin(false); this.pl = this.pl.filter(x => x.input === I); for (const sl of this.slots) if (sl.who !== I) sl.who = null; } else { s.who = null; this.pl = this.pl.filter(x => x !== p); G.game.removePlayer(q); } G.sfx('ui_back'); }
      } else if (q.pressed('cancel')) { p.ready = false; G.sfx('ui_back'); }
    }
    const c = I.clicked(); if (c) { const L = this.slotRects(); L.forEach((r, k) => { if (c[0] >= r.x && c[0] < r.x + r.w && c[1] >= r.y && c[1] < r.y + r.h) { const me = this.pl.find(p => p.input === I); if (me && !me.ready) { const s = this.slots[me.slot]; if (k === me.slot) { me.ready = true; G.sfx('ui_select'); } else if (!this.slots[k].who) { this.slots[k].who = I; this.slots[k].f = s.f; s.who = null; me.slot = k; } } } }); }
    if (this.pl.length && this.pl.every(p => p.ready)) this.start();
  },
  start() {
    const used = new Set(this.slots.filter(s => s.who).map(s => s.f)), teams = [[], []], cpuPick = G.rshuffle('cosmetic', [0, 1, 2, 3, 4, 5].filter(f => !used.has(f)));
    this.slots.forEach((s, k) => {
      let f = s.f; if (!s.who) { f = cpuPick.length ? cpuPick.shift() : f; }
      const id = G.FIGHTERS[f], suits = this.suitsFor(id), suit = s.who ? suits[s.o % suits.length] : G.CAST[id].suit, p = s.who ? this.pl.find(x => x.input === s.who) : null;
      teams[k < 2 ? 0 : 1].push({ id, suit, acc: G.CAST[id].acc, input: s.who || null, base: .55, color: s.who ? s.who.color : null, name: s.who ? (s.who.name || 'P1') + ' ' + G.CAST[id].short : G.CAST[id].short, seat: p ? this.pl.indexOf(p) : null });
    });
    const tod = ['morning', 'sunset', 'night'][G.EXH.tod];
    const cfg = { mode: 'exhibition', teams, pointsToWin: G.EXH_OPTS.points[G.EXH.points], setsToWin: G.EXH_OPTS.sets[G.EXH.sets] === 3 ? 2 : 1, difficulty: G.EXH_OPTS.diff[G.EXH.diff], tod, weather: 'sunny', cam: G.EXH.cam ? 'servecam' : 'court', title: 'BEACH MATCH', subtitle: teams[0].map(p => G.CAST[p.id].short).join(' & ') + '  vs  ' + teams[1].map(p => G.CAST[p.id].short).join(' & ') };
    G.game.allowJoin(false);
    G.startMatch(cfg);
  },
  slotRects() { const W = G.game.W, H = G.game.H, cw = Math.round(W * .2), x0 = Math.round(W / 2 - (cw * 4 + 18) / 2), y = Math.round(H * .16), h = Math.round(H * .62); return [0, 1, 2, 3].map(k => ({ x: x0 + k * (cw + 6), y, w: cw, h })); },
  draw(r) {
    G.backdrop(['morning', 'sunset', 'night'][G.EXH.tod]).draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H; G.UI.title(g, 'BEACH MATCH', W / 2, Math.round(H * .03), { scale: 2 });
      if (this.phase === 'opts') { G.UI.panel(g, Math.round(W / 2) - 124, Math.round(H * .2), 248, Math.round(H * .6)); this.optItems().forEach((it, k) => G.UI.button(g, it, k === this.focus.i)); return; }
      const R = this.slotRects();
      R.forEach((rc, k) => {
        const s = this.slots[k], id = G.FIGHTERS[s.f], p = s.who ? this.pl.find(x => x.input === s.who) : null, side = k < 2 ? 'LEFT' : 'RIGHT';
        E.ui.box(g, rc.x, rc.y, rc.w, rc.h, { bg: k < 2 ? ['#1f5a8c', '#0a2d4d'] : ['#8c3a1f', '#4d1a0a'], border: s.who ? s.who.color || '#ffd36a' : '#5a6a70' });
        E.font.text(g, side + ' ' + (k % 2 + 1), rc.x + rc.w / 2, rc.y + 4, '#fff8e8', { align: 'center', outline: false });
        if (s.who) {
          const key = id + ':' + s.o; if (!this.rigs[k] || this.rigs[k].key !== key) { const suits = this.suitsFor(id); this.rigs[k] = G.anim.rig(G.makeRig(id, { suit: suits[s.o % suits.length], size: 1.9 })); this.rigs[k].key = key; }
          const rig = this.rigs[k]; rig.vb = p && p.ready ? { kind: 'fistpump', u: (this.t % 1.2) / 1.2, w: 1 } : null; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: Math.PI / 2 + Math.sin(this.t + k) * .4, expr: p && p.ready ? 'smile' : null });
          px.ell(g, rc.x + rc.w / 2, rc.y + rc.h - 44, 22, 5, '#0a1a22'); rig.draw(g, rc.x + rc.w / 2, rc.y + rc.h - 44, G.VIEW_COURT);
          E.font.text(g, G.CAST[id].short, rc.x + rc.w / 2, rc.y + rc.h - 36, '#ffd36a', { align: 'center', outline: false });
          const suits = this.suitsFor(id); E.font.text(g, G.ITEMS[suits[s.o % suits.length]].name, rc.x + rc.w / 2, rc.y + rc.h - 26, '#fff8e8', { align: 'center', outline: false });
          E.ui.box(g, rc.x + rc.w / 2 - 20, rc.y + 16, 40, 12, { bg: s.who.color || '#4a8aff', border: '#ffffff', gradient: false }); E.font.text(g, s.who.name || 'P1', rc.x + rc.w / 2, rc.y + 18, '#ffffff', { align: 'center', outline: false });
          E.font.text(g, p && p.ready ? 'READY!' : '↑↓ fighter  ◀▶ slot', rc.x + rc.w / 2, rc.y + rc.h - 14, p && p.ready ? '#7cff5a' : '#9fd3d6', { align: 'center', outline: false });
          if (p && !p.ready) { G.drawGlyph(g, rc.x + 4, rc.y + rc.h - 54, G.codeFor('alt', s.who), s.who); E.font.text(g, 'outfit', rc.x + 16, rc.y + rc.h - 53, '#fff8e8', { outline: false }); }
        } else { E.font.text(g, 'CPU', rc.x + rc.w / 2, rc.y + rc.h / 2 - 10, '#9fd3d6', { align: 'center', scale: 2, outline: false }); E.font.text(g, 'To join: Start', rc.x + rc.w / 2, rc.y + rc.h / 2 + 10, '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'on a pad, or 2', rc.x + rc.w / 2, rc.y + rc.h / 2 + 20, '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'on the keyboard', rc.x + rc.w / 2, rc.y + rc.h / 2 + 30, '#fff8e8', { align: 'center', outline: false }); }
      });
      // the split keyboard, as keycaps
      if (this.pl.some(p => p.input.half)) { const y = Math.round(H * .8); E.font.text(g, 'Keyboard P1: WASD move • F hit • G dive • H shot • R call', W / 2, y, '#fff8e8', { align: 'center', outline: false }); E.font.text(g, 'Keyboard P2: arrows move • . hit • / dive • , shot • L call', W / 2, y + 10, '#fff8e8', { align: 'center', outline: false }); }
    });
    if (this.phase === 'opts') G.promptBar(r, [['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
    else G.promptBar(r, [['confirm', 'Ready'], ['alt', 'Outfit'], ['cancel', 'Back']]);
  }
};

// ==== 53-dev.js ====
/* 53-dev: Dev Mode, from the pause menu (then F1 or L3+R3 for the session; never in hub sessions). Time freezes while
 * it is open. Tabs: Tools, Match, Vacation, Minigames, Presentation, Tuning (every G.TUNING slider, live, with its default
 * as a tick, a reset per slider and Reset all). Every button calls game.debug.tools, which tests use too. */
G.unscaledDt = 1 / 120;
G.devFlags = { overlay: false, slow: 1 };
G.dev = {
  unlocked: false, tab: 0, focus: new G.Focus(), scroll: 0, confirm: null, sel: { pair: 0, npc: 0, day: 1, slot: 0, song: 0, sfx: 0, voice: 0, rigF: 0, rigS: 0, rigP: 0, num: 7, weather: 0, mood: 0, tod: 12 },
  TABS: ['Tools', 'Match', 'Vacation', 'Minigames', 'Presentation', 'Tuning'],
  open() {
    if (G.hub || G.overlay.has('dev')) return; this.unlocked = true; this.focus.i = 0; this.scroll = 0;
    const prev = G.game.input.preset, self = this;
    G.overlay.push({ kind: 'dev', modal: true,
      open() { this.ts = G.game.timeScale; G.game.timeScale = 0; G.game.input.use(Object.assign({}, prev || {}, G.INPUT.MENU)); },
      close() { G.game.timeScale = G.devFlags.slow || 1; if (prev) G.game.input.use(prev); },
      update(dt) { return self.update(); }, draw(r) { self.draw(r); } });
  },
  close() { const o = G.overlay.list.find(o => o.kind === 'dev'); if (o) G.overlay.remove(o); G.sfx('ui_back'); },
  get T() { return G.game.debug.tools; },
  pairs() { const all = []; const F = G.FIGHTERS; for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) all.push([F[i], F[j]]); all.push(['sonny', 'pepper']); return all; },
  /** the rows of the current tab: { label, act } buttons, { label, get, set, opts } steppers, { tune } sliders */
  rows() {
    const T = this.T, s = this.sel, tab = this.TABS[this.tab], S = G.state, npcs = G.FIGHTERS;
    const step = (label, key, n, show, wrap = true) => ({ label, kind: 'stepper', get: () => show(s[key]), lr: d => { s[key] = wrap ? (s[key] + d + n) % n : clamp(s[key] + d, 0, n - 1); } });
    if (tab === 'Tools') return [
      { label: 'Title screen', act: () => T.goto('title') }, { label: 'Island map', act: () => T.goto('map') },
      step('Place', 'num', 6, v => ['Sunset Courts', 'Lagoon Pool', 'Promenade', 'Your Villa', 'Casino Fortuna', 'The Dock'][v % 6]), { label: 'Go to that place', act: () => T.goto(['location', 'location', 'location', 'location', 'casino', 'location'][s.num % 6], { loc: ['beach', 'pool', 'promenade', 'villa', 'casino', 'dock'][s.num % 6] }) },
      { label: 'Pool Hop', act: () => T.goto('poolhop') },
      step('Day', 'day', 5, v => 'Day ' + (v + 1)), step('Slot', 'slot', 3, v => G.SLOTS[v]), { label: 'Set day and slot', act: () => T.setDay(s.day + 1, s.slot) },
      { label: 'Jump to the Semifinal', act: () => T.story('semifinal') }, { label: 'Jump to the Final', act: () => T.story('final') },
      { label: 'Farewell party', act: () => T.story('party') }, { label: 'Ending A (won)', act: () => T.story('endingA') }, { label: 'Ending B (lost)', act: () => T.story('endingB') },
      { label: 'Credits', act: () => T.goto('credits') }, { label: 'Restart this scene', act: () => T.goto(G.game.sceneName, G.lastSceneData) },
      { label: 'Reset the save (asks first)', act: () => { this.confirm = { text: 'Erase every save slot?', yes: () => T.resetSave() }; } }];
    if (tab === 'Match') {
      const P = this.pairs(), M = G.M && G.game.sceneName === 'match' ? G.M : null;
      return [
        step('Opponents', 'pair', P.length, v => P[v].map(id => G.CAST[id].short).join(' & ')), { label: 'Start a match against them', act: () => T.match({ opp: P[s.pair] }) },
        { label: 'Force a point: left', act: () => T.forcePoint(0), disabled: !M }, { label: 'Force a point: right', act: () => T.forcePoint(1), disabled: !M },
        { label: 'Set score: match point left', act: () => M && (M.score = [G.M.to - 1, Math.max(0, G.M.to - 3)]), disabled: !M },
        { label: 'End match: win', act: () => T.endMatch(true), disabled: !M }, { label: 'End match: lose', act: () => T.endMatch(false), disabled: !M },
        { label: 'CPU plays my fighter: ' + (G.devCpu ? 'ON' : 'OFF'), act: () => T.cpuControl(!G.devCpu) }, { label: 'Perfect Player: ' + (G.devPerfect ? 'ON' : 'OFF'), act: () => T.perfectPlayer(!G.devPerfect) },
        { label: 'Debug overlay: ' + (G.devFlags.overlay ? 'ON' : 'OFF'), act: () => { G.devFlags.overlay = !G.devFlags.overlay; } },
        step('Slow motion', 'slowI', 3, v => ['×1', '×.5', '×.25'][v || 0]), { label: 'Apply speed', act: () => { G.devFlags.slow = [1, .5, .25][s.slowI || 0]; } },
        { label: 'Frame step (one step)', act: () => T.step(1) }, { label: 'Switch camera', act: () => { if (M) M.camMode = M.camMode === 'court' ? 'servecam' : 'court'; }, disabled: !M }];
    }
    if (tab === 'Vacation') {
      const id = npcs[s.npc % 6];
      return [
        { label: 'Money +10,000', act: () => T.money(10000), disabled: !S }, { label: 'Money +100,000', act: () => T.money(100000), disabled: !S }, { label: 'Money to 0', act: () => S && (S.money = 0), disabled: !S },
        { label: 'Chips +100', act: () => S && (S.chips += 100), disabled: !S }, { label: 'Unlock every item', act: () => T.unlockAll(), disabled: !S }, { label: 'Fill the gift bag (×3 each)', act: () => T.fillBag(), disabled: !S },
        step('Fighter', 'npc', 6, v => G.CAST[npcs[v % 6]].short),
        { label: 'Affinity', kind: 'slider', tune: { min: 0, max: 100, step: 1, def: S ? G.baseAff(S.me, id) : 25, label: 'Affinity: ' + G.CAST[id].short }, get: () => S && S.affinity[id] !== undefined ? S.affinity[id] : 0, set: v => T.affinity(id, v), disabled: !S || S.me === id },
        step('Mood', 'mood', 3, v => ['happy', 'normal', 'gloomy'][v]), { label: 'Set her mood', act: () => S && (S.mood[id] = ['happy', 'normal', 'gloomy'][s.mood]), disabled: !S },
        { label: 'Make her my partner', act: () => T.partner(id), disabled: !S || S.me === id }, { label: 'Clear my partner', act: () => T.partner(null), disabled: !S },
        { label: 'Reveal every like', act: () => T.revealLikes(), disabled: !S }];
    }
    if (tab === 'Minigames') return [
      { label: 'Pool Hop autopilot: ' + (G.poolBot ? 'ON' : 'OFF'), act: () => T.poolBot(!G.poolBot) },
      { label: 'Slots: force 7-7-7 next spin', act: () => T.slotsForce(['7', '7', '7']) }, { label: 'Blackjack: deal a blackjack next', act: () => T.deal(['A', 'K']) },
      step('Roulette number', 'num', 37, v => String(v % 37)), { label: 'Roulette: force that number next', act: () => T.rouletteForce(s.num % 37) }];
    if (tab === 'Presentation') {
      const songs = Object.keys(G.SONGS), sfx = Object.keys(G.SFX), speakers = Object.keys(G.CAST), suits = G.SUITS, poses = ['ready', 'bump', 'set', 'spike', 'block', 'dive', 'highfive', 'peace', 'stretch', 'bow'];
      return [
        { label: 'Time of day', kind: 'slider', tune: { min: 0, max: 24, step: 1, def: 12, label: 'Time of day (h): ' + (G.todOverride === null || G.todOverride === undefined ? 'auto' : G.todOverride) }, get: () => s.tod, set: v => { s.tod = v; G.todOverride = v; } },
        { label: 'Time of day: automatic', act: () => { G.todOverride = null; } },
        step('Weather', 'weather', 3, v => ['sunny', 'cloudy', 'rain'][v]), { label: 'Set the weather', act: () => { G.weatherOverride = ['sunny', 'cloudy', 'rain'][s.weather]; G.game.weather = s.weather === 2 ? { kind: 'rain', amount: .7 } : null; } },
        { label: 'Show FPS: ' + (G.showFps ? 'ON' : 'OFF'), act: () => { G.showFps = !G.showFps; } },
        step('Voice Lab speaker', 'voice', speakers.length, v => G.CAST[speakers[v]].short), { label: 'Play a phrase', act: () => { const id = speakers[s.voice]; const L = G.LINES[id]; G.voice.say(L ? L.greet[0] : G.SONNY.pa[0], id); } },
        step('Jukebox', 'song', songs.length, v => songs[v]), { label: 'Play that song', act: () => { G.curSong = null; G.music(songs[s.song]); } },
        step('SFX board', 'sfx', sfx.length, v => sfx[v]), { label: 'Play that sound', act: () => G.sfx(sfx[s.sfx]) },
        step('Rig sheet: fighter', 'rigF', 6, v => G.CAST[npcs[v]].short), step('Rig sheet: suit', 'rigS', suits.length, v => suits[v].name), step('Rig sheet: pose', 'rigP', poses.length, v => poses[v])];
    }
    const out = [{ label: 'Reset all to defaults (asks first)', act: () => { this.confirm = { text: 'Reset every slider to its default?', yes: () => G.resetTuning() }; } }, { label: 'Copy the values as JSON', act: () => { const j = JSON.stringify(G.T); try { navigator.clipboard.writeText(j); G.toast('Copied', 'Tuning JSON on the clipboard'); } catch (e) { G.toast('Copy failed', 'Clipboard blocked'); } } }];
    for (const t of G.TUNING) out.push({ kind: 'slider', tune: Object.assign({}, t, { label: t.group + ': ' + t.label }), get: () => G.T[t.key], set: v => { G.T[t.key] = v; G.saveTuning(); }, key: t.key });
    return out;
  },
  layout() {
    const W = G.game.W, H = G.game.H, rows = this.rows(), x = Math.round(W * .06), w = Math.round(W * .52), y0 = Math.round(H * .2), rh = 18, per = Math.max(4, Math.floor((H * .66) / (rh + 3)));
    const i = this.focus.i; if (i < this.scroll) this.scroll = i; if (i >= this.scroll + per) this.scroll = i - per + 1; this.scroll = clamp(this.scroll, 0, Math.max(0, rows.length - per));
    return rows.map((r, k) => Object.assign({}, r, { id: k, x, y: y0 + (k - this.scroll) * (rh + 3), w, h: rh, hidden: k < this.scroll || k >= this.scroll + per }));
  },
  update() {
    const I = G.game.input;
    if (this.confirm) { if (I.pressed('confirm')) { this.confirm.yes(); this.confirm = null; G.sfx('ui_select'); } else if (I.pressed('cancel') || I.pressed('pause')) { this.confirm = null; G.sfx('ui_back'); } return true; }
    const L = this.layout(), f = this.focus.set(L).update();
    // hover on hidden rows does nothing: keep focus inside the window
    if (f.tabL || f.tabR) { this.tab = (this.tab + (f.tabR ? 1 : -1) + this.TABS.length) % this.TABS.length; this.focus.i = 0; this.scroll = 0; return true; }
    const c = I.clicked(); if (c) { const W = G.game.W, H = G.game.H, tw = Math.round(W * .88 / this.TABS.length); if (c[1] > H * .1 && c[1] < H * .1 + 14) { const k = Math.floor((c[0] - W * .06) / tw); if (k >= 0 && k < this.TABS.length) { this.tab = k; this.focus.i = 0; this.scroll = 0; G.sfx('ui_tab'); } } }
    if (f.back || I.pressed('pause')) { this.close(); return true; }
    const cur = this.focus.cur;
    if (cur && cur.kind === 'slider' && !cur.disabled) {
      const t = cur.tune, v = cur.get();
      if (f.lr) cur.set(clamp(Math.round((v + f.lr * t.step) / t.step) * t.step, t.min, t.max));
      if (f.drag !== undefined) cur.set(clamp(Math.round((t.min + f.drag * (t.max - t.min)) / t.step) * t.step, t.min, t.max));
      if (f.extra && cur.key) G.resetTuning(cur.key);
    }
    if (cur && cur.kind === 'stepper' && f.lr) { cur.lr(f.lr); G.sfx('ui_tick'); }
    if (f.pick && f.pick.act && !f.pick.disabled) f.pick.act();
    return true;
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H;
      px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W, H, '#060a14'));
      G.UI.panel(g, Math.round(W * .03), Math.round(H * .03), Math.round(W * .94), Math.round(H * .9));
      E.font.text(g, 'DEV MODE', Math.round(W * .06), Math.round(H * .05), '#ff9e5e', { scale: 2, shadow: '#000', outline: false });
      E.font.text(g, 'Time is frozen • scene: ' + G.game.sceneName, Math.round(W * .94), Math.round(H * .05) + 4, '#9fd3d6', { outline: false, align: 'right' });
      const tw = Math.round(W * .88 / this.TABS.length);
      this.TABS.forEach((t, k) => { const x = Math.round(W * .06) + k * tw, y = Math.round(H * .1); E.ui.box(g, x, y, tw - 3, 14, { bg: k === this.tab ? ['#ff9e5e', '#c86a3a'] : ['#0f4c5c', '#0a2d3d'], border: k === this.tab ? '#ffd36a' : '#5a8a90', gradient: false }); E.font.text(g, t, x + (tw - 3) / 2, y + 3, '#ffffff', { align: 'center', outline: false }); });
      const L = this.layout();
      L.forEach((it, k) => {
        if (it.hidden) return; const foc = k === this.focus.i;
        if (it.kind === 'slider') { if (it.disabled) { G.UI.button(g, Object.assign({}, it, { label: it.tune.label, disabled: true }), false); return; } G.UI.slider(g, it, foc); }
        else if (it.kind === 'stepper') G.UI.button(g, Object.assign({}, it, { align: 'left', right: '◀ ' + it.get() + ' ▶' }), foc);
        else G.UI.button(g, Object.assign({}, it, { align: 'left' }), foc);
      });
      // the side panel: live numbers, or the rig sheet
      const sx = Math.round(W * .61), sy = Math.round(H * .2), sw = Math.round(W * .33), sh = Math.round(H * .64);
      E.ui.box(g, sx, sy, sw, sh, { bg: ['#0a1a24', '#061018'], border: '#5a8a90' });
      if (this.TABS[this.tab] === 'Presentation') {
        const s = this.sel, rig = this._rig = (this._rig && this._rig.key === s.rigF + ':' + s.rigS) ? this._rig : Object.assign(G.anim.rig(G.makeRig(G.FIGHTERS[s.rigF], { suit: G.SUITS[s.rigS].id, size: 2 })), { key: s.rigF + ':' + s.rigS });
        const poses = ['ready', 'bump', 'set', 'spike', 'block', 'dive', 'highfive', 'peace', 'stretch', 'bow'];
        rig.vb = { kind: poses[s.rigP], u: (G.game.real % 1), w: 1 }; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: G.game.real * .8 });
        rig.draw(g, sx + sw / 2, sy + sh - 16, G.VIEW_COURT);
        E.font.text(g, 'RIG SHEET', sx + 6, sy + 4, '#9fd3d6', { outline: false });
      } else {
        const snap = G.game.debug.snapshot(), lines = ['scene: ' + snap.scene, 'day ' + snap.day + ' • ' + (snap.slot !== null && snap.slot !== undefined ? G.SLOTS[snap.slot] : '-'), 'money: ' + (snap.money !== null ? G.fmtMoney(snap.money) : '-'), 'partner: ' + (snap.partner || '-')];
        if (snap.match) lines.push('phase: ' + snap.match.phase, 'score: ' + snap.match.score.join('-'), 'touches: ' + snap.match.touches.join('/'), 'rally: ' + (G.M ? G.M.rallyTouches : 0));
        lines.push('fps: ' + Math.round(G.game.fps)); lines.forEach((l, k) => E.font.text(g, l, sx + 6, sy + 6 + k * 10, '#fff8e8', { outline: false }));
      }
      if (this.confirm) { const w = 220; G.UI.panel(g, Math.round(W / 2 - w / 2), Math.round(H * .42), w, 44); E.font.text(g, this.confirm.text, W / 2, Math.round(H * .42) + 8, '#ffd36a', { align: 'center', outline: false }); E.font.text(g, G.btn('confirm') + ' Yes    ' + G.btn('cancel') + ' No', W / 2, Math.round(H * .42) + 26, '#fff8e8', { align: 'center', outline: false }); }
    });
    G.promptBar(r, [['tabL', 'Tab'], ['tabR', 'Tab'], ['confirm', 'Use'], ['extra', 'Reset slider'], ['cancel', 'Back to game']], G.game.input, Math.round(r.H * .94) - 4);
  }
};
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (e.code === 'F1' && G.dev.unlocked && !G.hub) { e.preventDefault(); G.overlay.has('dev') ? G.dev.close() : G.dev.open(); } });
G.pollDevCombo = () => { try { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps || []) if (p && p.buttons[10] && p.buttons[11] && p.buttons[10].pressed && p.buttons[11].pressed) { if (!G._l3r3 && G.dev.unlocked && !G.hub && !G.overlay.has('dev')) G.dev.open(); G._l3r3 = true; return; } G._l3r3 = false; } catch (e) { /* blocked */ } };
/* ---- the debug handle: snapshot() for tools and tests, tools for the dev panel and tests ---- */
G.debugHandle = () => ({
  snapshot() {
    const S = G.state, M = G.game.sceneName === 'match' || G.game.sceneName === 'results' ? G.M : null;
    return { scene: G.game.sceneName, day: S ? S.day : null, slot: S ? S.slot : null, money: S ? S.money : null, chips: S ? S.chips : null, partner: S ? S.partner : null,
      affinity: S ? Object.assign({}, S.affinity) : null, mood: S ? Object.assign({}, S.mood) : null, flags: S ? Object.assign({}, S.flags) : null, me: S ? S.me : null,
      match: M ? { phase: M.phase, score: M.score.slice(), sets: M.sets.slice(), serving: M.serveSide, touches: M.touches.slice(), ball: M.ballPos, over: M.over, winner: M.winner, rallies: M.rallies, longest: M.longest,
        players: M.players.map(p => ({ id: p.id, side: p.side, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), act: p.act && p.act.kind, plan: p.plan ? { t: p.plan.t, kind: p.plan.kind } : null, human: p.isHuman })) } : null,
      ui: { overlays: G.overlay.list.map(o => o.kind) }, attract: G.attract.active ? G.attract.BEATS[G.attract.beat].id : null, dev: G.overlay.has('dev'), errors: G.game.errors.length };
  },
  tools: {
    goto(scene, data) { G.lastSceneData = data; G.go(scene, data, { fade: 0 }); },
    newVacation(me = 'rin', seed = 1) { G.state = G.newState(me, seed); G.dayStart(); return G.state; },
    setDay(d, slot = 0) { const S = G.state || this.newVacation(); S.day = clamp(d, 1, 5); S.slot = clamp(slot, 0, 2); G.dayStart(); G.go('map', null, { fade: 0 }); },
    give(id, n = 1) { const S = G.state, it = G.ITEMS[id]; if (!S || !it) return; if (it.kind === 'gift') S.bag[id] = Math.min(9, (S.bag[id] || 0) + n); else if (it.kind === 'suit') { if (!S.wardrobe.suits.includes(id)) S.wardrobe.suits.push(id); } else if (!S.wardrobe.acc.includes(id)) S.wardrobe.acc.push(id); },
    money(n) { if (G.state) G.state.money += n; }, affinity(id, v) { if (G.state && id in G.state.affinity) G.state.affinity[id] = clamp(Math.round(v), 0, 100); },
    partner(id) { if (G.state) G.state.partner = id; },
    unlockAll() { for (const it of [...G.SUITS, ...G.ACCS]) this.give(it.id); }, fillBag() { for (const it of G.GIFTS) this.give(it.id, 3); },
    revealLikes() { const S = G.state; if (!S) return; for (const id of G.npcs()) for (const it of G.GIFTS) S.known[id][it.id] = G.taste(id, it.id); },
    match(o = {}) { const S = G.state || this.newVacation(); if (!S.partner) S.partner = G.npcs()[0]; const opp = o.opp || G.npcs().filter(x => x !== S.partner).slice(0, 2); G.startMatch(G.vacationMatchCfg(opp, o), { fade: 0 }); },
    forcePoint(side) { const M = G.M; if (!M) return; if (M.phase !== 'rally' && M.phase !== 'toss') { M.phase = 'rally'; if (!M.L) M.L = G.Ball.make(M.clock, [G.COURT.NET_X, G.COURT.CY, 30], [0, 0, 10]); } M.pointTo(side, 'in', null); },
    endMatch(win) { const M = G.M; if (!M) return; const s = win ? (M.humanSide < 0 ? 0 : M.humanSide) : (M.humanSide < 0 ? 1 : 1 - M.humanSide); M.score[s] = Math.max(M.to - 1, M.score[1 - s] + 1); M.sets[s] = M.setsToWin - 1; this.forcePoint(s); },
    perfectPlayer(on) { G.devPerfect = !!on; }, cpuControl(on) { G.devCpu = !!on; if (G.M) for (const p of G.M.players) if (p.human) p.cpuControl = G.devCpu; },
    predict() { return G.M ? G.M.players.map(p => p.plan && { id: p.id, t: p.plan.t, P: p.plan.P, kind: p.plan.kind }) : null; },
    step(n = 1) { G.stepOnce = (G.stepOnce || 0) + n; },
    poolBot(on) { G.poolBot = !!on; }, slotsForce(sym) { G.slotsForce = sym; }, deal(cards) { G.bjForce = cards; }, rouletteForce(n) { G.rouletteForce = n; },
    story(id) { if (!G.state) this.newVacation(); G.storyJump(id); },
    resetSave() { const sv = G.game.saves; for (const s of [0, 1, 2, 'auto']) try { sv.erase(s); } catch (e) { /* none */ } G.state = null; G.go('title', null, { fade: 0 }); }
  }
});

// ==== 54-results.js ====
/* 54-results: the match scene, match results, the day-end card, the vacation results and the credits roll. */
G.SCENES = G.SCENES || {};
/** start a match: cfg as G.Match takes it, plus after(result) for where to go next */
G.startMatch = (cfg, o = {}) => { G.matchCfg = cfg; G.go('match', { cfg }, o.fade === undefined ? { fade: 'iris', seconds: .5 } : o); };
G.SCENES.match = {
  pausable: true, view: 'court', input: G.INPUT.MATCH, camera: { zoom: [.85, 1.25] },
  enter(d) {
    const cfg = d.cfg;
    G.M = new G.Match(cfg); G.UI.theme = cfg.tod === 'night' ? 'night' : 'day';
    G.applyLight(cfg.tod, cfg.weather); G.game.weather = cfg.weather === 'rain' ? { kind: 'rain', amount: .7, wind: .2 } : null;
    G.music(cfg.final ? 'house' : 'spike', { restart: true }); G.ambience.set('crowd');
    G.game.cam.bounds = null; G.tips = [];
  },
  exit() { G.game.cam.frame(null); G.game.setZoom(1); G.game.audio.layer('rally', 0, .2); G.game.weather = null; },
  update(dt) {
    const M = G.M; if (!M) return;
    M.update(dt); G.ambience.update(dt);
    if (M.phase === 'end' && M.phT > (M.spectacle ? 1.5 : 2.8) && !M.left) { M.left = true; if (M.cfg.after) M.cfg.after(M.result, M); else G.go('results', { M }); }
  },
  draw(r) { if (G.M) { G.M.draw(r); G.drawTips(r); } }
};
/* ---- match results: the winners pose, three big stat cards, the MVP; vacation money and hearts; what next ---- */
G.SCENES.results = {
  view: 'court', input: G.INPUT.MENU,
  enter(d) {
    this.d = d; this.M = d.M; this.t = 0; this.focus = new G.Focus(); this.count = 0;
    this.buttons = d.buttons || [['Rematch', () => G.startMatch(this.M.cfg)], ['Change setup', () => G.go('exhibition')], ['Title', () => G.go('title')]];
    G.music(null); if (this.M) G.sting(this.M.humanSide < 0 || this.M.winner === this.M.humanSide ? 'win' : 'lose');
  },
  layout() {
    const W = G.game.W, H = G.game.H, n = this.buttons.length, bw = 92, gap = 8, x0 = Math.round(W / 2 - (n * bw + (n - 1) * gap) / 2);
    return this.buttons.map((b, k) => ({ x: x0 + k * (bw + gap), y: Math.round(H * .86), w: bw, h: 18, id: k, label: b[0] }));
  },
  update(dt) {
    this.t += dt; const M = this.M; if (M) { M.clock += dt; M.aclock = M.clock; for (const p of M.players) p.update(dt); M.camera(); }
    if (this.d.prize) this.count = Math.min(this.d.prize, this.count + this.d.prize * dt * .8);
    if (G.game.input.pressed('snap') && G.canPhoto()) G.photo.open();
    const f = this.focus.set(this.layout()).update();
    if (this.t < .6) return;
    if (f.pick) this.buttons[f.pick.id][1]();
  },
  draw(r) {
    const M = this.M; if (M) { M.phase = 'end'; M.draw(r); }
    r.overlay(g => {
      const W = r.W, H = r.H, win = M && (M.humanSide < 0 ? M.winner : M.winner === M.humanSide);
      const title = M ? (M.humanSide < 0 ? (M.winner ? 'RIGHT SIDE WINS' : 'LEFT SIDE WINS') : win ? 'VICTORY!' : 'DEFEAT') : 'RESULTS';
      px.blend(g, .55, 'normal', () => px.rect(g, 0, Math.round(H * .3) - 8, W, Math.round(H * .52), '#061a24'));
      E.font.title(g, title, W / 2, Math.round(H * .3) - 4, { scale: 3, colors: win ? ['#fff7d6', '#ffd36a', '#ff9e5e'] : ['#ffffff', '#b8c8d8', '#7a8aa0'], align: 'center', depth: 2 });
      if (M) {
        const fs = M.result ? M.result.finalScore : M.score;
        E.font.text(g, (M.setsToWin > 1 ? 'Sets ' + M.sets[0] + '–' + M.sets[1] + '   ' : '') + 'Final ' + fs[0] + ' – ' + fs[1], W / 2, Math.round(H * .3) + 22, '#fff8e8', { align: 'center', shadow: '#000', outline: false });
        const side = M.humanSide < 0 ? M.winner : M.humanSide, mine = M.players.filter(p => p.side === side);
        const cards = [['POINTS', mine.reduce((a, p) => a + p.stats.points, 0)], ['KILLS', mine.reduce((a, p) => a + p.stats.kills, 0)], ['LONGEST RALLY', M.longest + ' touches']];
        const cw = 84, x0 = Math.round(W / 2 - (cards.length * cw + 16) / 2);
        cards.forEach(([l, v], k) => { const x = x0 + k * (cw + 8), y = Math.round(H * .3) + 36; G.UI.panel(g, x, y, cw, 34); E.font.text(g, String(v), x + cw / 2, y + 5, '#ffd36a', { scale: 2, align: 'center', shadow: '#000', outline: false }); E.font.text(g, l, x + cw / 2, y + 23, '#9fd3d6', { align: 'center', outline: false }); });
        const mvp = M.players[M.result ? M.result.mvp : 0], my = Math.round(H * .3) + 76;
        G.portrait(g, mvp.id, Math.round(W / 2) - 70, my, 26); E.font.text(g, 'MVP  ' + mvp.name.toUpperCase(), Math.round(W / 2) - 38, my + 3, '#ffd36a', { shadow: '#000', outline: false });
        E.font.text(g, mvp.stats.points + ' pts • ' + mvp.stats.kills + ' kills • ' + mvp.stats.aces + ' aces • ' + mvp.stats.blocks + ' blocks • ' + mvp.stats.digs + ' digs', Math.round(W / 2) - 38, my + 14, '#fff8e8', { shadow: '#000', outline: false });
      }
      if (this.d.prize !== undefined) { const y = Math.round(H * .3) + 108; G.UI.money(g, Math.round(W / 2) - 60, y, this.count); }
      if (this.d.aff) { const a = this.d.aff, y = Math.round(H * .3) + 108; G.portrait(g, a.id, Math.round(W / 2) + 30, y - 2, 18, { frame: false }); G.UI.hearts(g, Math.round(W / 2) + 52, y + 4, a.to); E.font.text(g, (a.d >= 0 ? '+' : '') + a.d, Math.round(W / 2) + 112, y + 4, a.d >= 0 ? '#7cff5a' : '#ff7a7a', { shadow: '#000', outline: false }); }
      const L = this.layout(); L.forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
    const bar = [['confirm', 'Select']]; if (G.canPhoto()) bar.push(['snap', 'Postcard']);
    G.promptBar(r, bar, G.game.input, Math.round(r.H * .86) + 24);
  }
};
/* ---- the day-end card: money earned and spent, matches, affinity changes, tomorrow's weather; then sleep ---- */
G.SCENES.dayend = {
  input: G.INPUT.MENU,
  enter() { const S = G.state; this.t = 0; this.snap = { earned: S.earnedToday, spent: S.spentToday, played: S.playedToday.length, aff: G.npcs().map(id => [id, S.affinity[id] - (S.affStart[id] === undefined ? S.affinity[id] : S.affStart[id])]), day: S.day }; G.music('siesta'); G.UI.theme = 'night'; },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.t > .8 && (I.pressed('confirm') || I.clicked())) {
      const S = G.state; if (S.day >= G.DAYS) { G.go('credits'); return; }
      G.nextDay(); G.go('map', null, { fade: .6 });
    }
  },
  draw(r) {
    G.backdrop('night').draw(r); const S = G.state, s = this.snap;
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(320, W - 30), x = Math.round(W / 2 - w / 2), y = Math.round(H * .1);
      G.UI.panel(g, x, y, w, Math.round(H * .76));
      G.UI.title(g, 'DAY ' + s.day + ' IS OVER', W / 2, y + 8, { scale: 2 });
      E.font.text(g, 'Earned  ' + G.fmtMoney(s.earned), x + 14, y + 34, '#7cff5a', { outline: false }); E.font.text(g, 'Spent  ' + G.fmtMoney(s.spent), x + w / 2, y + 34, '#ff9e5e', { outline: false });
      E.font.text(g, 'Matches played: ' + s.played + '   Money now: ' + G.fmtMoney(S.money), x + 14, y + 46, '#fff8e8', { outline: false });
      s.aff.forEach(([id, d], k) => { const xx = x + 14 + (k % 3) * Math.round((w - 20) / 3), yy = y + 62 + Math.floor(k / 3) * 30; G.portrait(g, id, xx, yy, 22); E.font.text(g, (d > 0 ? '↑ +' : d < 0 ? '↓ ' : '• ') + d, xx + 26, yy + 2, d > 0 ? '#7cff5a' : d < 0 ? '#ff7a7a' : '#9fd3d6', { outline: false }); G.UI.hearts(g, xx + 26, yy + 12, S.affinity[id]); });
      if (s.day < G.DAYS) { const w2 = G.WEATHER_TABLE[s.day + 1][0]; E.font.text(g, 'Tomorrow:', x + 14, y + 130, '#9fd3d6', { outline: false }); G.UI.weatherIcon(g, x + 64, y + 128, w2); E.font.text(g, G.cap(w2) + (s.day + 1 === 5 ? ' • the Fortuna Cup!' : s.day + 1 === 4 ? ' • the Semifinal' : ''), x + 76, y + 130, '#fff8e8', { outline: false }); }
      if (S.partner && S.lostToday && G.aff(S.partner) < 35) E.font.text(g, G.CAST[S.partner].short + ' is thinking about leaving your team...', W / 2, y + 146, '#ff7a7a', { align: 'center', outline: false });
    });
    G.promptBar(r, [['confirm', 'Sleep']]);
  }
};
/* ---- the credits: the postcard slideshow and the party photo, with the credits ---- */
G.CREDITS = ['AHEAD OR ALIVE', 'XTREME BEACH VOLLEYBALL', '', 'An original parody-tribute to', 'Dead or Alive Xtreme Beach Volleyball', '', 'Design, code, art, music and writing', 'Claude (claude-opus-5-5)', '', 'Engine', 'my-3D2dge v0.85.2', '', 'Starring', 'Rin Takamine • Lola Vega • Ingrid Halvorsen', 'Amara Okafor • Tess Callahan • Mei-Lin Zhou', '', 'and', 'Sonny Fortuna as himself', 'Pepper Quill as the house', '', 'Kai • Odette • Coach Bo', '', 'Thank you for vacationing', 'on Isla Fortuna'];
G.SCENES.credits = {
  input: G.INPUT.MENU,
  enter() { this.t = 0; this.album = G.albumAll(); this.imgs = []; G.music('farewell'); for (const s of this.album) if (s.img && typeof Image !== 'undefined') { const im = new Image(); im.src = s.img; this.imgs.push([im, s]); } else this.imgs.push([null, s]); },
  update(dt) { this.t += dt; const I = G.game.input; if (this.t > 26 || (this.t > 1 && (I.pressed('confirm') || I.pressed('cancel') || I.clicked()))) G.go(G.state ? 'vresults' : 'title'); },
  draw(r) {
    G.backdrop('sunset').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (this.imgs.length) { const k = Math.floor(this.t / 3) % this.imgs.length, [im, s] = this.imgs[k], w = Math.round(W * .46), h = Math.round(w * H / W), x = Math.round(W * .06), y = Math.round(H / 2 - h / 2); E.ui.box(g, x - 3, y - 3, w + 6, h + 6, { bg: '#fff8e8', border: '#c8502a' }); if (im && im.complete && im.width) g.drawImage(im, x, y, w, h); else G.drawPostcardArt(g, x, y, w, h, s); }
      const y0 = Math.round(H - this.t * 16);
      G.CREDITS.forEach((l, k) => { const y = y0 + k * 14; if (y > -10 && y < H) E.font.text(g, l, Math.round(W * .76), y, k < 2 ? '#ffd36a' : '#fff8e8', { align: 'center', shadow: '#000', outline: false }); });
    });
  }
};
/* ---- the vacation results: a report card and a title, then New Vacation+ ---- */
G.SCENES.vresults = {
  input: G.INPUT.MENU,
  enter() {
    const S = G.state; this.t = 0; this.focus = new G.Focus(); G.music('sunrise');
    const best = G.npcs().sort((a, b) => G.aff(b) - G.aff(a))[0], bests = G.npcs().filter(id => G.aff(id) >= 80).length, goods = G.npcs().filter(id => G.aff(id) >= 60).length;
    this.title = S.flags.wonFinal && bests >= 3 ? 'Island Icon' : S.flags.wonFinal ? 'Fortuna Champion' : goods >= 3 ? 'Social Butterfly' : 'Beach Bum'; this.best = best;
    G.unlock(S.wardrobe.suits, true);
  },
  items() { const W = G.game.W, H = G.game.H, y = Math.round(H * .86); return [{ id: 'ng', label: 'New Vacation+', x: Math.round(W / 2) - 110, y, w: 104, h: 18 }, { id: 'title', label: 'Title', x: Math.round(W / 2) + 6, y, w: 104, h: 18 }]; },
  update(dt) { this.t += dt; const f = this.focus.set(this.items()).update(); if (!f.pick || this.t < .6) return; if (f.pick.id === 'ng') G.newVacationFlow(true); else { G.go('title'); } },
  draw(r) {
    const S = G.state, st = S.stats; G.backdrop('morning').draw(r);
    r.overlay(g => {
      const W = r.W, H = r.H, w = Math.min(340, W - 20), x = Math.round(W / 2 - w / 2), y = Math.round(H * .05);
      G.UI.panel(g, x, y, w, Math.round(H * .78)); G.UI.title(g, 'VACATION RESULTS', W / 2, y + 6, { scale: 2 });
      E.font.title(g, this.title.toUpperCase(), W / 2, y + 26, { scale: 2, colors: ['#ffffff', '#5ff0ff', '#2a8ad8'], align: 'center', depth: 1 });
      const rows = [['Money earned', G.fmtMoney(st.earned)], ['Matches', st.wins + ' W • ' + (st.matches - st.wins) + ' L'], ['Swimsuits', S.wardrobe.suits.length + ' / 21'], ['Gifts given', st.gifts], ['Best Pool Hop', st.poolBest ? st.poolBest.toFixed(1) + ' s' : '-'], ['Casino', (st.casinoNet >= 0 ? '+' : '') + st.casinoNet + ' chips'], ['Postcards', S.album.length], ['The Fortuna Cup', S.flags.wonFinal ? 'WON' : 'lost']];
      rows.forEach(([k, v], i) => { const xx = x + 14 + (i % 2) * Math.round(w / 2), yy = y + 52 + Math.floor(i / 2) * 22; E.font.text(g, k, xx, yy, '#9fd3d6', { outline: false }); E.font.text(g, String(v), xx, yy + 10, '#fff8e8', { outline: false }); });
      G.portrait(g, this.best, x + 14, y + 142, 30); E.font.text(g, 'Best friend: ' + G.CAST[this.best].name, x + 50, y + 146, '#ffd36a', { outline: false }); G.UI.hearts(g, x + 50, y + 158, G.aff(this.best));
      E.font.text(g, 'Every swimsuit is unlocked for Beach Match.', W / 2, y + 180, '#7cff5a', { align: 'center', outline: false });
      this.items().forEach((it, k) => G.UI.button(g, it, k === this.focus.i));
    });
  }
};

// ==== 99-main.js ====
/* 99-main: building the game, the settings, the pause actions, the scene registry, hub detection, the boot. */
E.VIEWS.court = G.VIEW_COURT; E.VIEWS.servecamL = G.VIEW_SERVE[0]; E.VIEWS.servecamR = G.VIEW_SERVE[1];
G.hub = G.inHub();
G.SETTINGS = [
  { key: 'difficulty', label: 'Difficulty', type: 'select', group: 'Game', value: 'Normal', options: ['Easy', 'Normal', 'Hard', 'Pro'] },
  { key: 'assist', label: 'Timing assist', type: 'select', group: 'Game', value: 'Normal', options: ['Tight', 'Normal', 'Generous'], help: 'How wide the timing windows are' },
  { key: 'autoRun', label: 'Auto-run to the ball', type: 'toggle', group: 'Game', value: true },
  { key: 'autoReceive', label: 'Auto-receive', type: 'toggle', group: 'Game', value: false, help: 'Serves you do not press for are bumped for you' },
  { key: 'ring', label: 'Timing ring', type: 'toggle', group: 'Game', value: true },
  { key: 'matchCam', label: 'Match camera', type: 'select', group: 'Game', value: 'court', options: [['court', 'Broadcast'], ['servecam', 'Serve Cam']] },
  { key: 'textSpeed', label: 'Text speed', type: 'select', group: 'Game', value: 'Normal', options: ['Slow', 'Normal', 'Fast', 'Instant'], apply: (g, v) => { G.T.textSpeed = { Slow: 25, Normal: 45, Fast: 90, Instant: 200 }[v] || 45; } },
  { key: 'commentary', label: 'Commentary', type: 'toggle', group: 'Game', value: true },
  { key: 'voices', label: 'Voices', type: 'slider', group: 'Sound', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; g.audio.applyVolume(); } }
];
G.pauseItems = () => [
  ['How to Play', () => { G.game.resume(); G.overlay.push(G.howtoOverlay()); }],
  G.canPhoto() ? ['Take a Postcard', () => { G.game.resume(); G.photo.open(); }] : null,
  ['Dev Mode', () => { G.game.resume(); G.dev.open(); }]
];
const game = G.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
  menu: G.hub ? false : { items: G.pauseItems, settings: G.SETTINGS, quit: 'title', controls: { view: 'Camera', play: 'Hit (timed)', shot: 'Shot / Block', dive: 'Dive', call: 'Call' } },
  autoPause: !G.hub, corner: !G.hub, fullscreen: G.hub ? false : 'button', backGesture: !G.hub
});
G.initAudio(game);
if (!G.hub) G.setupSaves();
game.audio.voiceVolume = game.settings.voices === undefined ? .8 : game.settings.voices;
game.input.reserveCombo = [8, 9];
for (const k of ['glyphs']) if (game.settings[k] !== undefined) game.input.glyphs = game.settings[k];
if (game.settings.glyphs === undefined || game.settings.glyphs === 'auto') game.input.glyphs = 'playstation';
G.T.textSpeed = { Slow: 25, Normal: 45, Fast: 90, Instant: 200 }[game.settings.textSpeed] || G.T.textSpeed;
game.input.touchEnabled = !G.touchOnly();
G.mouseAim = true;
// the scene registry: each module adds its scenes to G.SCENES; every scene goes through G.wrapScene
G.SCENES = G.SCENES || {};
G.go = (name, data, o) => game.go(name, data, o);
G.canPhoto = () => !G.hub && (game.sceneName === 'location' || game.sceneName === 'results' || game.sceneName === 'casino');
G.startGame = () => {
  const scenes = {}; for (const k in G.SCENES) scenes[k] = G.wrapScene(k, G.SCENES[k]);
  game.start({ scenes, scene: G.hub ? 'hub' : 'title', boot: { title: 'AHEAD OR ALIVE', steps: [
    ['Raking the sand', () => G.courtMap()],
    ['Inflating volleyballs', () => { for (const id of G.FIGHTERS) G.rigFor(id); }],
    ['Chilling the smoothies', () => { G.backdrop('afternoon'); G.backdrop('sunset'); G.backdrop('night'); }],
    ['Counting Sonny\'s chips', () => { G.hostRig('sonny'); G.hostRig('pepper'); }],
    ['Polishing the golden sunglasses', () => { if (G.locMaps) G.locMaps(); }]
  ] } });
  game.debug = G.debugHandle();
  if (typeof setInterval === 'function' && typeof document !== 'undefined') setInterval(() => { G.pollPads(); G.pollDevCombo(); }, 250);
};
G.startGame();

})();
