(() => { 'use strict'; const E = My3D2dge, G = {}; window.AOA = G;
/* ===== 00-core.js ===== */
/* AHEAD OR ALIVE: Xtreme Beach Volleyball.
 * Core loop: pick where to spend each morning, afternoon and night of a five-day island vacation; win 2-on-2 beach
 * volleyball with a partner you befriend through chats and gifts; spend the prize money on swimsuits, gifts and casino
 * nights; then beat the island's owner in the Fortuna Cup final.
 * 00-core: namespace, rng streams, event bus, tuning, overlays, helpers. */
const { px, clamp, lerp, approach, TAU } = E;
const HUB = typeof window !== 'undefined' && window.AIHub && window.AIHub.active ? window.AIHub : null;
G.hub = HUB;
G.TITLE = 'AHEAD OR ALIVE';
G.STRAP = 'XTREME BEACH VOLLEYBALL';
G.TAGLINE = 'Stay ahead. Stay alive. Stay tanned.';
G.DATE = '2026-11-04 01:17:20';

/* ---- random streams: gameplay never calls Math.random ---- */
G.seedOf = s => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
G._streams = {};
G.reseed = (name, seed) => { G._streams[name] = E.rng(seed >>> 0); };
G.rng = name => {
  if (HUB && HUB.seeded === false && name === 'match' && HUB.rng) { return G._streams[name] || (G._streams[name] = HUB.rng('match')); }
  return G._streams[name] || (G._streams[name] = E.rng(G.seedOf('aoa:' + name)));
};
G.rand = (name = 'cosmetic') => G.rng(name)();
G.rrange = (a, b, name = 'cosmetic') => a + (b - a) * G.rng(name)();
G.rpick = (list, name = 'cosmetic') => list[Math.floor(G.rng(name)() * list.length) % list.length];
G.rchance = (p, name = 'cosmetic') => G.rng(name)() < p;

/* ---- event bus ---- */
G.bus = (() => {
  const h = {};
  return {
    on(ev, fn) { (h[ev] || (h[ev] = [])).push(fn); return () => this.off(ev, fn); },
    off(ev, fn) { if (h[ev]) h[ev] = h[ev].filter(f => f !== fn); },
    emit(ev, a, b) { for (const f of (h[ev] || []).slice()) { try { f(a, b); } catch (e) { if (G.game) G.game.fail('bus:' + ev, e); } } }
  };
})();

/* ---- tuning: every slider (live; read every step) ---- */
G.TUNING = [
  { key: 'moveSpeed', label: 'Run speed', group: 'Players', def: 92, min: 40, max: 180, step: 2, unit: '' },
  { key: 'diveSpeed', label: 'Dive speed', group: 'Players', def: 150, min: 60, max: 280, step: 5, unit: '' },
  { key: 'reach', label: 'Reach radius', group: 'Players', def: 15, min: 8, max: 30, step: .5, unit: '' },
  { key: 'jumpVel', label: 'Jump power', group: 'Players', def: 150, min: 80, max: 260, step: 5, unit: '' },
  { key: 'timingWindow', label: 'Timing window (s)', group: 'Timing', def: .16, min: .05, max: .4, step: .01, unit: 's' },
  { key: 'perfectWindow', label: 'Perfect window (s)', group: 'Timing', def: .045, min: .015, max: .15, step: .005, unit: 's' },
  { key: 'gravity', label: 'Ball gravity', group: 'Ball', def: 260, min: 120, max: 520, step: 10, unit: '' },
  { key: 'ballDrag', label: 'Ball air drag', group: 'Ball', def: .05, min: 0, max: .4, step: .01, unit: '' },
  { key: 'serveSpeed', label: 'Serve power', group: 'Ball', def: 1, min: .6, max: 1.6, step: .05, unit: 'x' },
  { key: 'spikePower', label: 'Spike power', group: 'Ball', def: 1, min: .6, max: 1.8, step: .05, unit: 'x' },
  { key: 'netHeight', label: 'Net height', group: 'Court', def: 27, min: 16, max: 44, step: 1, unit: '' },
  { key: 'pointsToWin', label: 'Points to win', group: 'Rules', def: 7, min: 3, max: 21, step: 1, unit: '' },
  { key: 'aiSkill', label: 'CPU skill', group: 'AI', def: .55, min: 0, max: 1, step: .05, unit: '' },
  { key: 'aiSpeed', label: 'CPU run speed', group: 'AI', def: 1, min: .5, max: 1.5, step: .05, unit: 'x' },
  { key: 'aiReaction', label: 'CPU reaction (s)', group: 'AI', def: .18, min: 0, max: .6, step: .02, unit: 's' },
  { key: 'chemistry', label: 'Partner chemistry bonus', group: 'AI', def: 1, min: 0, max: 2, step: .1, unit: 'x' },
  { key: 'timeScale', label: 'Game speed', group: 'World', def: 1, min: .3, max: 2, step: .05, unit: 'x' },
  { key: 'moneyMul', label: 'Prize money', group: 'World', def: 1, min: .2, max: 5, step: .1, unit: 'x' },
  { key: 'affinityMul', label: 'Friendship gain', group: 'World', def: 1, min: .2, max: 4, step: .1, unit: 'x' },
  { key: 'crowd', label: 'Crowd size', group: 'World', def: 1, min: 0, max: 2, step: .1, unit: 'x' }
];
G.DEFAULTS = {}; G.TUNING.forEach(t => { G.DEFAULTS[t.key] = t.def; });
G.T = Object.assign({}, G.DEFAULTS);
G.resetTuning = () => { Object.assign(G.T, G.DEFAULTS); try { E.store.set('aoa-dev-tuning', {}); } catch (e) { /* storage blocked */ } };
G.saveTuning = () => { try { E.store.set('aoa-dev-tuning', G.T); } catch (e) { /* storage blocked */ } };
try { const o = E.store.get('aoa-dev-tuning', {}); for (const k in o) if (k in G.DEFAULTS && typeof o[k] === 'number') G.T[k] = o[k]; } catch (e) { /* storage blocked */ }

/* ---- helpers ---- */
G.fmtMoney = n => 'S$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
G.pad2 = n => (n < 10 ? '0' : '') + n;
G.fmtTime = s => Math.floor(s / 60) + ':' + G.pad2(Math.floor(s % 60));
G.dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/* ---- overlay stack (dev panel, photo mode, toasts, notices) ---- */
G.overlays = [];
G.overlay = {
  push(o) { G.overlays.push(o); if (o.enter) o.enter(); return o; },
  pop(o) { const i = G.overlays.indexOf(o); if (i >= 0) { G.overlays.splice(i, 1); if (o.exit) o.exit(); } },
  update(dt) { let took = false; for (const o of G.overlays.slice()) { if (o.update && o.update(dt)) took = true; } return took; },
  draw(r) { for (const o of G.overlays) if (o.draw) o.draw(r); },
  has(name) { return G.overlays.some(o => o.name === name); }
};
// toasts
G.toasts = [];
G.toast = (text, color = '#ffe08a', time = 2.4) => { G.toasts.push({ text, color, t: time, max: time }); if (G.toasts.length > 4) G.toasts.shift(); };
G.updateToasts = dt => { for (const t of G.toasts) t.t -= dt; G.toasts = G.toasts.filter(t => t.t > 0); };
G.drawToasts = r => {
  let y = 14; if (G.hubCardActive) return;
  for (const t of G.toasts) {
    const a = Math.min(1, t.t * 3, (t.max - t.t) * 6);
    r.overlay(g => {
      const w = E.font.width(t.text) + 14; const x = Math.round(r.W / 2 - w / 2);
      E.ui.box(g, x, y, w, 14, { bg: ['#1b4a5a', '#0d2a36'], border: '#ffd36a', alpha: Math.max(.2, a) });
      E.font.text(g, t.text, Math.round(r.W / 2), y + 4, t.color, { align: 'center', shadow: '#000', outline: false });
    });
    y += 16;
  }
};
G.wrapScene = scene => {
  const u = scene.update, d = scene.draw;
  scene.update = function (dt) {
    if (G.hub) { try { const gp = (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(Boolean); if (gp.some(x => x.buttons[8] && x.buttons[8].pressed)) { G.game.input.suppress('start'); G.game.input.suppress('pause'); } } catch (e) { /* no pads */ } }   // AI Hub rule: Create + Options belongs to the hub
    if (G.attract && G.attractExitCheck && G.attractExitCheck(dt)) return;
    G.updateToasts(dt); const took = G.overlay.update(dt); if (took && !G.devRunning) return; if (u) u.call(this, dt);
  };
  scene.draw = function (r) { if (d) d.call(this, r); G.drawToasts(r); G.overlay.draw(r); if (G.attract && G.drawAttract) G.drawAttract(r); };
  return scene;
};

G.clone = o => JSON.parse(JSON.stringify(o));
G.shade = (hex, k) => E.shade ? E.shade(hex, k) : hex;
G.scenes = {};

/* ===== 02-data.js ===== */
/* 02-data: cast, items, places, calendar, text. Adding a fighter, a shop or a day is a data edit plus art. */

/* ---- the cast ---- */
G.CAST = {
  you: { id: 'you', name: 'JO', full: 'Jo Ryder', style: 'Street brawler', tag: 'You', skin: '#e0a878', hair: '#3a2a1e', hairStyle: 'spiky', cloth: '#ff8a3a', pants: '#2a8fc8',
    stats: { power: 3, speed: 3, receive: 3, set: 3 }, voice: { base: 190, spread: .3, speed: 1, wave: 'triangle' } },
  mika: { id: 'mika', name: 'MIKA', full: 'Mika "Typhoon" Shiranui', style: 'Karate prodigy', tag: 'Partner', skin: '#f0c49a', hair: '#e8742a', hairStyle: 'ponytail', cloth: '#ff5e7a', pants: '#fff2d6',
    stats: { power: 4, speed: 4, receive: 3, set: 3 }, voice: { base: 330, spread: .35, speed: 1.1, wave: 'square' },
    bio: 'Won her first trophy at nine and has been a little bit loud about it ever since. Believes every problem is a kata you have not finished.',
    loves: ['sweet', 'sport'], likes: ['charm'], dislikes: ['fashion'], start: 25 },
  hana: { id: 'hana', name: 'HANA', full: 'Hana Fujimori', style: 'Runaway ninja', tag: 'Partner', skin: '#f2d2b0', hair: '#1c1c34', hairStyle: 'long', cloth: '#6a4adb', pants: '#2c2c4a',
    stats: { power: 2, speed: 5, receive: 4, set: 4 }, voice: { base: 400, spread: .2, speed: .9, wave: 'sine' },
    bio: 'Left the clan after a disagreement about sunscreen. Appears behind you at no point, which is somehow worse.',
    loves: ['charm', 'luck'], likes: ['sweet'], dislikes: ['sport'], start: 10 },
  gwen: { id: 'gwen', name: 'GWEN', full: 'Gwen Ashby', style: 'Southpaw boxer', tag: 'Partner', skin: '#e8b890', hair: '#c2b068', hairStyle: 'short', cloth: '#2fb0a0', pants: '#f4f4ee',
    stats: { power: 5, speed: 2, receive: 3, set: 2 }, voice: { base: 250, spread: .25, speed: .85, wave: 'triangle' },
    bio: 'Undefeated, unbothered, and deeply suspicious of anything described as "fun". Hides a plush pineapple in her kit bag.',
    loves: ['fashion', 'luck'], likes: ['sport'], dislikes: ['sweet'], start: 15 },
  ruby: { id: 'ruby', name: 'RUBY', full: 'Ruby Delacroix', style: 'Pro wrestler', tag: 'Rival', skin: '#b87a52', hair: '#d41e5a', hairStyle: 'spiky', cloth: '#ffcf33', pants: '#d41e5a',
    stats: { power: 5, speed: 2, receive: 2, set: 2 }, voice: { base: 160, spread: .4, speed: 1.2, wave: 'saw' }, bio: 'Announces her own entrances. Hits the ball like it owes her rent.', start: 0 },
  tomo: { id: 'tomo', name: 'TOMO', full: 'Tomo "Tiger" Okabe', style: 'Muay Thai', tag: 'Rival', skin: '#d8a070', hair: '#101010', hairStyle: 'spiky', cloth: '#30c070', pants: '#f0f0f0',
    stats: { power: 3, speed: 5, receive: 4, set: 2 }, voice: { base: 210, spread: .45, speed: 1.4, wave: 'square' }, bio: 'Cannot stand still. Has never once finished a sentence that did not end in a stretch.', start: 0 },
  ines: { id: 'ines', name: 'INES', full: 'Ines Vanterpool', style: 'Capoeira dancer', tag: 'Rival', skin: '#9a6a48', hair: '#2a1a14', hairStyle: 'long', cloth: '#ff9a2a', pants: '#8a2ad0',
    stats: { power: 3, speed: 4, receive: 4, set: 5 }, voice: { base: 300, spread: .5, speed: 1, wave: 'triangle' }, bio: 'Treats every rally as a duet. Will absolutely tell you your footwork is "interesting".', start: 0 },
  sonny: { id: 'sonny', name: 'SONNY', full: 'Sonny Fortuna, Esq.', style: 'Jackpot billionaire', tag: 'Host', skin: '#e2b088', hair: '#f4f0e8', hairStyle: 'short', cloth: '#18c0b8', pants: '#fff2d6',
    stats: { power: 3, speed: 2, receive: 3, set: 4 }, voice: { base: 140, spread: .35, speed: 1.15, wave: 'sine' }, bio: 'Owns the island, the casino, and a surprisingly large collection of shirts.', start: 0 },
  pepper: { id: 'pepper', name: 'PEPPER', full: 'Pepper Quill', style: 'Deadpan concierge', tag: 'Host', skin: '#d6a07c', hair: '#4a2a1a', hairStyle: 'ponytail', cloth: '#f4f4ee', pants: '#1a1a2a',
    stats: { power: 2, speed: 5, receive: 5, set: 3 }, voice: { base: 280, spread: .1, speed: .8, wave: 'sine' }, bio: 'Hands out villa keys and sunscreen with the same expression she uses for catastrophes.', start: 0 }
};
G.PARTNERS = ['mika', 'hana', 'gwen'];
G.LABELS = { sweet: 'Sweets', sport: 'Sports', charm: 'Charms', fashion: 'Fashion', luck: 'Luck' };

/* ---- items ---- */
G.SUITS = [
  { id: 'coral', name: 'Coral Reef', top: '#ff6f61', bottom: '#ffd3b0', price: 0 },
  { id: 'sunset', name: 'Sunset Stripe', top: '#ff9a3c', bottom: '#d6336c', price: 600 },
  { id: 'lagoon', name: 'Midnight Lagoon', top: '#1d3b8a', bottom: '#2fb0c8', price: 800 },
  { id: 'lemon', name: 'Lemon Fizz', top: '#ffe14a', bottom: '#ffffff', price: 700 },
  { id: 'hibiscus', name: 'Hibiscus Hello', top: '#e8317a', bottom: '#3fbf6a', price: 900 },
  { id: 'pearl', name: 'Pearl Diver', top: '#f4f1ea', bottom: '#9fd7e8', price: 1100 },
  { id: 'neon', name: 'Neon Tide', top: '#2aff9a', bottom: '#b22aff', price: 1400 },
  { id: 'mango', name: 'Mango Madness', top: '#ffa514', bottom: '#4cb050', price: 1200 },
  { id: 'star', name: 'Starfish', top: '#f2705e', bottom: '#f6d86b', price: 1500 },
  { id: 'sea', name: 'Sea Glass', top: '#8fe3c8', bottom: '#4a8fd0', price: 1800 },
  { id: 'black', name: 'Black Sand', top: '#26262e', bottom: '#8a8aa0', price: 2200 },
  { id: 'jackpot', name: 'Jackpot Gold', top: '#ffd24a', bottom: '#c0392b', price: 4000 }
];
G.HATS = [
  { id: 'none', name: 'No hat', price: 0, style: null },
  { id: 'band', name: 'Sweat band', price: 150, style: 'band', color: '#ffffff' },
  { id: 'cap', name: 'Sunny cap', price: 300, style: 'cap', color: '#ffcf33' },
  { id: 'crown', name: 'Beach crown', price: 1500, style: 'crown', color: '#ffd24a' }
];
G.GIFTS = [
  { id: 'smoothie', name: 'Coconut Smoothie', cat: 'sweet', price: 80, pts: 6 },
  { id: 'taffy', name: 'Saltwater Taffy', cat: 'sweet', price: 60, pts: 5 },
  { id: 'foam', name: 'Foam Finger', cat: 'sport', price: 120, pts: 6 },
  { id: 'gloves', name: 'Mini Boxing Gloves', cat: 'sport', price: 220, pts: 8 },
  { id: 'shell', name: 'Seashell Charm', cat: 'charm', price: 140, pts: 7 },
  { id: 'moon', name: 'Moonlight Bracelet', cat: 'charm', price: 300, pts: 9 },
  { id: 'aloha', name: 'Pocket Aloha Shirt', cat: 'fashion', price: 200, pts: 7 },
  { id: 'shades', name: 'Gold Sunglasses', cat: 'fashion', price: 420, pts: 10 },
  { id: 'dice', name: 'Lucky Dice', cat: 'luck', price: 160, pts: 7 },
  { id: 'chip', name: 'Golden Chip', cat: 'luck', price: 400, pts: 10 }
];

/* ---- places and calendar ---- */
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
G.PLACES = {
  courts: { id: 'courts', name: 'Sunset Courts', blurb: 'Sand, nets and a lot of confidence.', mx: 0.18, my: 0.32 },
  pool: { id: 'pool', name: 'Lagoon Pool', blurb: 'Warm water, cold drinks, lily pads.', mx: 0.62, my: 0.18 },
  promenade: { id: 'promenade', name: 'Fortuna Promenade', blurb: 'Shops, smoothies and a statue of Sonny.', mx: 0.44, my: 0.62 },
  villa: { id: 'villa', name: 'Your Villa', blurb: 'A bed, a closet and a very honest mirror.', mx: 0.82, my: 0.52 },
  casino: { id: 'casino', name: 'Casino Fortuna', blurb: 'Open at night. The house loves you.', mx: 0.3, my: 0.86, night: true }
};
G.DAYS = [
  { n: 1, title: 'Arrival', weather: 'sunny' },
  { n: 2, title: 'Qualifier Day', weather: 'sunny' },
  { n: 3, title: 'Semifinal Day', weather: 'cloudy' },
  { n: 4, title: 'The Reveal', weather: 'sunny' },
  { n: 5, title: 'Fortuna Cup', weather: 'sunny' }
];
// the story lock: which slot a match is forced into
G.STORY_SLOTS = {
  '1:0': 'arrival', '1:1': 'welcome', '2:1': 'qualifier', '3:1': 'semifinal', '4:2': 'reveal', '5:1': 'final', '5:2': 'party'
};

/* ---- text: lines are in the source's tone: breezy, overconfident, wink-wink ---- */
G.TEXT = {
  invitation: [
    'You are cordially invited to the AHEAD OR ALIVE Invitational, on the private island of Isla Fortuna.',
    'Prize: everything. Dress code: toughness. -- S. Fortuna, Esq.'
  ],
  arrival: [
    ['PEPPER', 'Welcome to Isla Fortuna. Your villa key, your sunscreen, and a form waiving your right to be surprised.'],
    ['SONNY', 'Fighters! Friends! Tanned people! Change of plans: the tournament is a vacation, and the vacation is a volleyball cup!'],
    ['JO', 'Volleyball. We came here to brawl.'],
    ['SONNY', 'And you shall! Politely! Over a net! Five days, one Fortuna Cup, and a casino that never closes. After dark. Which is not never. Details.'],
    ['PEPPER', 'The nets are at Sunset Courts. The sunscreen is at your elbow. Please use both.']
  ],
  welcome: [
    ['SONNY', 'A welcome match! You and Mika, against myself and Pepper. Do not worry, I only cheat in the casino.'],
    ['MIKA', 'Two against two! One button, good timing, big spikes! You and me, Jo!'],
    ['PEPPER', 'Mr. Fortuna has never won a point he did not buy.']
  ],
  welcomeWin: [['SONNY', 'Magnificent! I demand a rematch, but also I am delighted. Both. At the same time.'], ['MIKA', 'Best partners ever! ...Probably. We should chat more.']],
  welcomeLose: [['SONNY', 'The score does not matter! The vacation is the real winner! ...The score matters a little.'], ['MIKA', 'We will get them next time.']],
  pickPartner: [['PEPPER', 'The Cup is two-on-two. Choose a partner. I recommend someone who likes you. Or sunscreen.']],
  qualifier: [['RUBY', 'RUBY DELACROIX! AND HER LITTLE FRIEND TOMO! WE ARE YOUR QUALIFIER!'], ['TOMO', 'Hi! Sorry! Stretching!']],
  qualWin: [['RUBY', 'I demand a recount!'], ['PEPPER', 'There is no recount. There is a smoothie.']],
  qualLose: [['RUBY', 'THAT IS HOW IT IS DONE!'], ['PEPPER', 'The loss is not final. Only the sunburn is.']],
  semifinal: [['INES', 'Dance with me, then. Try to keep up with the rhythm.'], ['SONNY', 'Semifinal! The crowd is here! Both of them!']],
  semiWin: [['INES', 'Interesting footwork after all.'], ['SONNY', 'To the final! The Fortuna Cup awaits!']],
  semiLose: [['INES', 'You were close. In a fun way.'], ['PEPPER', 'The Cup is gone. The buffet is not.']],
  reveal: [
    ['PEPPER', 'There is something I should mention. Mr. Fortuna has bet the island itself on the final.'],
    ['SONNY', 'Pepper! That was a SURPRISE. ...Yes. I did. The House always wins, so I thought: why not be the House.'],
    ['JO', 'You bet the island on volleyball.'],
    ['SONNY', 'On you! Probably against you. We shall see.']
  ],
  final: [
    ['SONNY', 'THE FORTUNA CUP! Against THE HOUSE: myself, Pepper, and a ball that does exactly what the casino wants!'],
    ['PEPPER', 'Special rules: the ball is occasionally lucky. Please do not take it personally.']
  ],
  finalWin: [['SONNY', 'You... won. The island is yours. I am, for the first time, free. Is this what sand feels like?'], ['PEPPER', 'It is customary to say thank you.']],
  finalLose: [['SONNY', 'The House wins! ...and I keep the island! Which, thanks to you, I will now throw a party on.'], ['PEPPER', 'You played well. Please do not tell him I said that.']],
  party: [
    ['SONNY', 'Farewell party! Fireworks, tropical punch, and a toast to every one of you!'],
    ['PEPPER', 'Please remember your sunscreen. And your dignity. In that order.']
  ],
  idle: ['Sunshine, sand and a mild threat of volleyball.', 'The sea is blue. The scoreboard is blue. Everything is blue.', 'Remember to reapply sunscreen between spikes.'],
  commentary: {
    point: ['What a rally!', 'Pepper, did you see that?', 'The crowd goes mildly wild!', 'Sunshine and spikes!'],
    ace: ['ACE! Right through the sunscreen!', 'A serve like a tropical storm!'],
    spike: ['Boom! Right off the sand!', 'That spike has a mortgage on it!'],
    block: ['BLOCKED! Not today!', 'A wall of tan lines!'],
    dive: ['Digging deep! Literally!', 'A gorgeous dive!'],
    fault: ['A fault! The ball was somewhere else!', 'Out! The sea takes it!']
  },
  vacationEnd: 'Five days on Isla Fortuna. The tans fade; the story does not.'
};

/* ---- how to play pages and about texts ---- */
G.HOWTO = [
  ['THE GOAL', ['Win 2-on-2 beach volleyball. First side to the points limit (7 by default, win by 2) takes the match.', 'The ball may touch your side up to three times: bump, set, then spike or send it over.']],
  ['ONE BUTTON', ['PLAY does it all: serve, bump, set, spike. A ring closes on the sand under the ball; press PLAY when it shrinks to the player. PERFECT timing means sharper balls.', 'Hold the stick toward where you want the ball to go. With a mouse, point.']],
  ['DIVE, CALL, BLOCK', ['DIVE reaches wide balls, but you lie on the sand for a moment.', 'CALL shouts "Mine!" so your partner backs off. Near the net, PLAY when the ball is being attacked jumps to block.']],
  ['THE VACATION', ['Five days. Each has a morning, an afternoon and a night. Visiting a place spends the slot.', 'Friendship with your partner improves their volleyball. Chat, give gifts, and avoid things they dislike.']],
  ['MONEY AND STYLE', ['Win matches and Pool Hop, or try your luck at Casino Fortuna after dark.', 'Spend S$ on swimsuits, hats and gifts. The wardrobe at your villa dresses you for the court.']],
  ['EVERYWHERE ELSE', ['Beach Match is quick play for 1 to 4 local players, each on a pad or on the keyboard halves.', 'Dev mode lives in the pause menu: tools and balance sliders. Photo mode takes postcards.']]
];

/* ===== 10-ui.js ===== */
/* 10-ui: input presets, prompt glyphs, and the 10-foot canvas UI kit (menus, sliders, panels, backdrops). */

/* ---- input presets: confirm/cancel/up/down/left/right/start/pause come from the engine in every preset ---- */
G.INPUT_BASE = (() => { const D = E.Input.DEFAULT, o = {}; for (const k of ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel']) o[k] = D[k].filter(c => c !== 'KeyP'); return o; })();
G.INPUT_MATCH = Object.assign({}, G.INPUT_BASE, { play: ['Space', 'KeyJ', 'Pad0', 'Mouse0'], dive: ['KeyK', 'ShiftLeft', 'Pad1', 'Mouse2'], call: ['KeyL', 'Pad2'], cam: ['KeyV', 'Pad3'], tab: ['Tab', 'KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], photo: ['KeyC'] });
G.INPUT_MENU = Object.assign({}, G.INPUT_BASE, { photo: ['KeyC', 'Pad3'], tab: ['Tab', 'KeyQ', 'Pad4'], tabNext: ['KeyE', 'Pad5'], play: ['Space', 'Pad0', 'Mouse0'], dive: ['ShiftLeft', 'Pad2'], call: ['KeyL', 'Pad2'] });

/* ---- prompts: glyphs follow the device used last ---- */
const PS_COL = { '✕': '#6aa0ff', '○': '#ff6a6a', '□': '#ff8ad8', '△': '#6ae0a0' };
const XB_COL = { A: '#5ad05a', B: '#e05a5a', X: '#5a8ae0', Y: '#e0d05a' };
G.dev = () => (G.game && G.game.input && G.game.input.lastDevice) || 'keyboard';
G.isPad = () => G.dev() === 'gamepad';
// returns the label for an action on the current device
G.label = a => {
  const I = G.game.input, d = I.lastDevice;
  if (d === 'mouse') {
    if (a === 'play' || a === 'confirm') return 'Click';
    if (a === 'dive') return 'R-Click';
  }
  const l = I.label(a, d === 'mouse' ? 'keyboard' : d);
  return l || a;
};
G.glyphW = a => { const l = G.label(a); return E.font.width(l) + (G.isPad() ? 7 : 8); };
G.drawGlyph = (g, x, y, a) => {
  const l = G.label(a), w = E.font.width(l);
  if (G.isPad()) {
    const c = PS_COL[l] || XB_COL[l];
    if (c) { px.disc(g, x + 5, y + 4, 5, '#10202c'); px.disc(g, x + 5, y + 4, 4, c); E.font.text(g, l, x + 5 - Math.floor(w / 2) + (w % 2 ? 0 : 0), y + 1, '#10202c', { outline: false }); return 11; }
    const bw = w + 6; E.ui.box(g, x, y - 1, bw, 11, { bg: ['#d8d8e8', '#9898b0'], border: '#10202c', gradient: true }); E.font.text(g, l, x + 3, y + 1, '#10202c', { outline: false }); return bw + 1;
  }
  const bw = w + 6; E.ui.box(g, x, y - 1, bw, 11, { bg: ['#f4f0e0', '#c8c0a8'], border: '#3a3020' }); E.font.text(g, l, x + 3, y + 1, '#2a2418', { outline: false }); return bw + 1;
};
// a row of prompts at the bottom right: [['confirm','Select'], ['cancel','Back']]
G.drawPrompts = (r, list, y) => {
  r.overlay(g => {
    let total = 0; const yy = y === undefined ? r.H - 15 : y;
    for (const [a, t] of list) total += G.glyphW(a) + E.font.width(t) + 10;
    let x = Math.round(r.W - total - 6);
    E.ui.box(g, x - 4, yy - 3, total + 6, 15, { bg: ['#0d2a36', '#06141c'], border: '#2a6a7a', alpha: .75 });
    for (const [a, t] of list) { const w = G.drawGlyph(g, x, yy, a); E.font.text(g, t, x + w + 2, yy + 1, '#ffeec2', { outline: false, shadow: '#000' }); x += w + E.font.width(t) + 12; }
  });
};

/* ---- panels and text ---- */
G.panel = (g, x, y, w, h, o = {}) => E.ui.box(g, x, y, w, h, Object.assign({ bg: ['#1b4a5a', '#0b2430'], border: '#ffd36a' }, o));
G.text = (g, s, x, y, c = '#ffffff', o = {}) => E.font.text(g, s, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
G.wrap = (s, w, o = {}) => E.font.wrap(s, w, o);
G.logo = (g, W, y, scale = 3) => {
  E.font.title(g, G.TITLE, W / 2, y, { align: 'center', scale, colors: ['#fff6c8', '#ffd24a', '#ff9a3c', '#ff4f6a'], depth: 3, depthColor: '#5a1030' });
  E.font.title(g, G.STRAP, W / 2, y + scale * 9 + 4, { align: 'center', scale: Math.max(1, Math.floor(scale / 2)), colors: ['#d8fff8', '#6ae0e0', '#2aa0c8'], depth: 2, depthColor: '#082a3a' });
};

/* ---- the beach backdrop used by menus and cutscenes ---- */
G.beach = (r, t = 0, o = {}) => {
  const W = r.W, H = r.H, g = r.tgt, hz = Math.round(H * (o.horizon || .5));
  const sky = o.sky || ['#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347', '#ffe08a'];
  const bands = sky.length;
  for (let i = 0; i < bands; i++) px.rect(g, 0, Math.floor(i * hz / bands), W, Math.ceil(hz / bands) + 1, sky[i]);
  // sun
  const sx = Math.round(W * (o.sunX || .72)), sy = hz - 10 - Math.round(Math.sin(t * .1) * 2);
  px.disc(g, sx, sy, 20, '#ffd9a0'); px.disc(g, sx, sy, 15, '#fff2c8');
  // sea
  for (let y = hz; y < hz + Math.round(H * .16); y++) {
    const k = (y - hz) / (H * .16);
    px.rect(g, 0, y, W, 1, k < .5 ? '#1a6a9a' : '#0f4c78');
    const wob = Math.round(Math.sin(y * .7 + t * 2) * 6);
    for (let x = (wob + 400) % 22; x < W; x += 22) px.rect(g, x, y, 6 + (y & 3), 1, '#6ac8e8');
  }
  px.rect(g, sx - 3, hz, 6, Math.round(H * .16), '#ffe0a0');
  // sand
  const sandY = hz + Math.round(H * .16);
  px.rect(g, 0, sandY, W, H - sandY, '#f2d79a');
  for (let y = sandY; y < H; y += 3) px.rect(g, 0, y, W, 1, (y / 3 & 1) ? '#ecce8c' : '#f6dea8');
  // palms
  const palm = (x, h, flip) => {
    px.rect(g, x, sandY - h, 3, h, '#4a2c1a'); px.rect(g, x + (flip ? 1 : 0), sandY - h, 1, h, '#6a4228');
    for (let k = 0; k < 5; k++) { const a = -Math.PI * .1 - k * Math.PI * .2 + Math.sin(t * 1.2 + k) * .06; const ex = x + 1 + Math.cos(a) * 17, ey = sandY - h + Math.sin(a) * -9 + 4 + Math.abs(Math.cos(a)) * 4; px.line(g, x + 1, sandY - h, Math.round(ex), Math.round(ey), '#1e7a3a', 2); px.line(g, x + 1, sandY - h, Math.round(ex), Math.round(ey) - 1, '#3fb050', 1); }
  };
  if (!o.noPalms) { palm(Math.round(W * .06), 62, false); palm(Math.round(W * .94), 74, true); palm(Math.round(W * .88), 52, true); }
  return { sandY, hz };
};
G.sand = (r, hz) => { px.rect(r.tgt, 0, hz, r.W, r.H - hz, '#f2d79a'); };

/* ---- the menu: keyboard, pad and mouse all move the same focus ---- */
class Menu {
  constructor(items, o = {}) {
    this.items = items; this.i = 0; this.o = Object.assign({ x: 'center', y: 96, w: 150, gap: 15, scale: 1, title: '' }, o);
    this.rects = []; this.lastPtr = null; this.t = 0; this.onCancel = o.onCancel || null;
    while (this.items[this.i] && this.items[this.i].disabled && this.i < this.items.length - 1) this.i++;
  }
  move(d) {
    const n = this.items.length; if (!n) return;
    for (let k = 0; k < n; k++) { this.i = (this.i + d + n) % n; if (!this.items[this.i].disabled) break; }
    G.game.audio.sfx('select');
  }
  pick() { const it = this.items[this.i]; if (!it || it.disabled) { G.game.audio.sfx('cancel'); return; } G.game.audio.sfx('confirm'); if (it.onPick) it.onPick(it, this.i); else if (this.o.onPick) this.o.onPick(it, this.i); }
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (I.pressed('up') || I.repeat('up', .35, .1)) this.move(-1);
    else if (I.pressed('down') || I.repeat('down', .35, .1)) this.move(1);
    const it = this.items[this.i];
    if (it && it.adjust) { if (I.pressed('left') || I.repeat('left', .35, .08)) { it.adjust(-1); G.game.audio.sfx('select'); } if (I.pressed('right') || I.repeat('right', .35, .08)) { it.adjust(1); G.game.audio.sfx('select'); } }
    const p = I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) {
      this.lastPtr = [p[0], p[1]];
      for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && !this.items[k].disabled && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) { if (this.i !== k) { this.i = k; G.game.audio.sfx('select'); } } }
    }
    const c = I.clicked();
    if (c) { for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { if (it && it.adjust && c[0] > q[0] + q[2] / 2 && k === this.i && it.clickAdjust !== false) { it.adjust(1); } else { this.i = k; this.pick(); } return true; } } }
    if (I.pressed('confirm')) { this.pick(); return true; }
    if (I.pressed('cancel') && this.onCancel) { G.game.audio.sfx('cancel'); this.onCancel(); return true; }
    return false;
  }
  draw(r) {
    const o = this.o, W = r.W, n = this.items.length, w = o.w, x = o.x === 'center' ? Math.round((W - w) / 2) : o.x, gap = o.gap;
    this.rects = [];
    r.overlay(g => {
      if (o.title) E.font.text(g, o.title, x + w / 2, o.y - 18, '#ffd24a', { align: 'center', shadow: '#5a1030', outline: false, scale: 1 });
      for (let k = 0; k < n; k++) {
        const it = this.items[k], y = o.y + k * gap, sel = k === this.i;
        this.rects[k] = [x, y - 2, w, gap - 1];
        if (sel) {
          const pulse = .5 + .5 * Math.sin(this.t * 7);
          E.ui.box(g, x, y - 2, w, gap - 1, { bg: ['#ff9a3c', '#ff4f6a'], border: pulse > .5 ? '#fff6c8' : '#ffd24a' });
          E.font.text(g, '▶', x + 3, y + 1, '#fff6c8', { outline: false });
        } else E.ui.box(g, x, y - 2, w, gap - 1, { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .85 });
        const label = typeof it.label === 'function' ? it.label() : it.label, col = it.disabled ? '#6a8a94' : sel ? '#ffffff' : '#d8f4f0';
        E.font.text(g, label, x + 14, y + 1, col, { shadow: '#000', outline: false });
        if (it.value !== undefined) { const v = typeof it.value === 'function' ? it.value() : it.value; E.font.text(g, String(v), x + w - 5, y + 1, sel ? '#fff6c8' : '#ffd24a', { align: 'right', shadow: '#000', outline: false }); }
      }
    });
  }
}
G.Menu = Menu;

/* ---- the slider list: dev tuning, volume etc. ---- */
class SliderList {
  constructor(specs, getv, setv, o = {}) { this.specs = specs; this.get = getv; this.set = setv; this.i = 0; this.o = Object.assign({ x: 'center', y: 40, w: 280, rows: 9, gap: 14 }, o); this.scroll = 0; this.rects = []; this.lastPtr = null; this.drag = false; }
  update(dt) {
    const I = G.game.input, n = this.specs.length;
    if (I.pressed('up') || I.repeat('up', .35, .08)) { this.i = (this.i + n - 1) % n; G.game.audio.sfx('select'); }
    if (I.pressed('down') || I.repeat('down', .35, .08)) { this.i = (this.i + 1) % n; G.game.audio.sfx('select'); }
    const s = this.specs[this.i], st = s.step || (s.max - s.min) / 20;
    const fast = I.down('dive') ? 5 : 1;
    if (I.pressed('left') || I.repeat('left', .35, .06)) this.set(s.key, clamp(+(this.get(s.key) - st * fast).toFixed(4), s.min, s.max));
    if (I.pressed('right') || I.repeat('right', .35, .06)) this.set(s.key, clamp(+(this.get(s.key) + st * fast).toFixed(4), s.min, s.max));
    if (this.i < this.scroll) this.scroll = this.i; if (this.i >= this.scroll + this.o.rows) this.scroll = this.i - this.o.rows + 1;
    const p = I.pointer(), c = I.clicked(), down = I.down('play') && I.lastDevice === 'mouse';
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) {
      this.lastPtr = [p[0], p[1]];
      for (let k = 0; k < this.rects.length; k++) { const q = this.rects[k]; if (q && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3]) this.i = k + this.scroll; }
    }
    if (c) for (let k = 0; k < this.rects.length; k++) {
      const q = this.rects[k]; if (q && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) {
        this.i = k + this.scroll; const sp = this.specs[this.i], bx = q[0] + q[2] * .5, bw = q[2] * .45;
        if (c[0] >= bx) this.set(sp.key, clamp(+(sp.min + (c[0] - bx) / bw * (sp.max - sp.min)).toFixed(3), sp.min, sp.max));
      }
    }
    void down;
  }
  draw(r) {
    const o = this.o, x = o.x === 'center' ? Math.round((r.W - o.w) / 2) : o.x;
    this.rects = [];
    r.overlay(g => {
      for (let k = 0; k < o.rows; k++) {
        const idx = k + this.scroll, s = this.specs[idx]; if (!s) break;
        const y = o.y + k * o.gap, sel = idx === this.i, v = this.get(s.key);
        this.rects[k] = [x, y - 2, o.w, o.gap - 1];
        E.ui.box(g, x, y - 2, o.w, o.gap - 1, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .85 });
        E.font.text(g, s.label, x + 4, y + 1, sel ? '#fff' : '#d8f4f0', { shadow: '#000', outline: false });
        const bx = x + Math.round(o.w * .5), bw = Math.round(o.w * .33);
        px.rect(g, bx, y + 3, bw, 4, '#06141c'); px.rect(g, bx, y + 3, Math.round(bw * (v - s.min) / (s.max - s.min)), 4, sel ? '#fff6c8' : '#ffd24a');
        E.font.text(g, (Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2)) + (s.unit && s.unit !== '' ? '' : ''), x + o.w - 4, y + 1, '#fff6c8', { align: 'right', shadow: '#000', outline: false });
      }
      if (this.specs.length > o.rows) E.font.text(g, (this.scroll > 0 ? '↑ ' : '') + (this.scroll + o.rows < this.specs.length ? '↓' : ''), x + o.w + 4, o.y, '#ffd24a', { outline: false });
    });
  }
}
G.SliderList = SliderList;

/* ---- key capture helper for hover/click on arbitrary rects (world buttons) ---- */
G.hit = (p, q) => p && q && p[0] >= q[0] && p[0] < q[0] + q[2] && p[1] >= q[1] && p[1] < q[1] + q[3];

/* ---- NodeNav: free-form focus (map nodes, buttons): the d-pad moves to the nearest node that way; hover and click too ---- */
class NodeNav {
  constructor(nodes, o = {}) { this.nodes = nodes; this.i = o.start || 0; this.lastPtr = null; this.t = 0; this.onCancel = o.onCancel || null; }
  cur() { return this.nodes[this.i]; }
  update(dt) {
    this.t += dt; const I = G.game.input, n = this.nodes;
    const dirs = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    for (const [a, dx, dy] of dirs) {
      if (I.pressed(a) || I.repeat(a, .4, .15)) {
        const c = n[this.i]; let best = -1, bs = 1e9;
        for (let k = 0; k < n.length; k++) {
          if (k === this.i || n[k].hidden) continue; const vx = n[k].x - c.x, vy = n[k].y - c.y, along = vx * dx + vy * dy; if (along <= 1) continue;
          const side = Math.abs(vx * dy) + Math.abs(vy * dx), sc = along + side * 1.6; if (sc < bs) { bs = sc; best = k; }
        }
        if (best >= 0) { this.i = best; G.game.audio.sfx('select'); }
      }
    }
    const p = I.pointer();
    if (p && (!this.lastPtr || p[0] !== this.lastPtr[0] || p[1] !== this.lastPtr[1])) { this.lastPtr = [p[0], p[1]]; for (let k = 0; k < n.length; k++) if (!n[k].hidden && G.hit(p, [n[k].x - n[k].w / 2, n[k].y - n[k].h / 2, n[k].w, n[k].h]) && this.i !== k) { this.i = k; G.game.audio.sfx('select'); } }
    const c = I.clicked();
    if (c) for (let k = 0; k < n.length; k++) if (!n[k].hidden && G.hit(c, [n[k].x - n[k].w / 2, n[k].y - n[k].h / 2, n[k].w, n[k].h])) { this.i = k; this.pick(); return true; }
    if (I.pressed('confirm')) { this.pick(); return true; }
    if (I.pressed('cancel') && this.onCancel) { G.game.audio.sfx('cancel'); this.onCancel(); return true; }
    return false;
  }
  pick() { const c = this.nodes[this.i]; if (!c || c.disabled) { G.game.audio.sfx('cancel'); return; } G.game.audio.sfx('confirm'); if (c.onPick) c.onPick(c); }
}
G.NodeNav = NodeNav;

/* ===== 12-audio.js ===== */
/* 12-audio: all sound is synthesized in code. Songs, sound effects, ambience and Animalese-style voices. */
const A = () => G.game.audio;
const rep = (s, n) => Array(n).fill(s).join(' ');

/* ---- songs ---- */
G.SONGS = {
  title: { bpm: 100, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .13, notes: 'E5 - G5 - A5 - . G5 | E5 - D5 - C5 - . . | D5 - F5 - A5 - G5 - | F5 - E5 - . . . . . ' },
    { name: 'bass', wave: 'triangle', vol: .2, notes: 'A2 . A2 . E3 . A2 . | A2 . A2 . E3 . A2 . | D3 . D3 . A3 . D3 . | G2 . G2 . D3 . G2 .' },
    { name: 'chord', wave: 'square', vol: .045, notes: 'A4 - - - C5 - - - | A4 - - - C5 - - - | D5 - - - F5 - - - | G4 - - - B4 - - -' },
    { name: 'drums', wave: 'drums', vol: .35, notes: 'k . h . s . h . | k . h h s . h . | k . h . s . h . | k . h . s h h h' } ] },
  beach: { bpm: 128, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .12, notes: 'C5 - E5 G5 - E5 C5 - | D5 - F5 A5 - F5 D5 - | E5 - G5 B5 - G5 E5 - | G5 - E5 D5 - C5 - . ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'C3 . C3 G2 C3 . C3 G2 | D3 . D3 A2 D3 . D3 A2 | E3 . E3 B2 E3 . E3 B2 | G2 . G2 D3 G2 . G2 D3' },
    { name: 'pad', wave: 'sine', vol: .07, notes: 'E4 - - - - - - - | F4 - - - - - - - | G4 - - - - - - - | B4 - - - - - - -' },
    { name: 'drums', wave: 'drums', vol: .3, notes: 'k . h . s . h k | . k h . s . h . | k . h . s . h k | . k h . s h h h' } ] },
  pool: { bpm: 116, steps: 4, tracks: [
    { wave: 'triangle', vol: .17, notes: 'F4 - A4 - C5 - A4 - | G4 - Bb4 - D5 - Bb4 - | F4 - A4 - C5 - E5 - | D5 - C5 - A4 - . .' },
    { wave: 'triangle', vol: .2, notes: 'F2 . . C3 . . F2 . | G2 . . D3 . . G2 . | F2 . . C3 . . A2 . | D3 . . A2 . . D3 .' },
    { wave: 'drums', vol: .22, notes: 'k . . h . s . h | k . . h . s . h | k . . h . s . h | k . h h . s h h' } ] },
  casino: { bpm: 140, steps: 4, tracks: [
    { wave: 'square', vol: .1, notes: 'G4 . B4 . D5 . B4 . | G4 . B4 . E5 . D5 . | A4 . C5 . E5 . C5 . | F#4 . A4 . D5 . C5 .' },
    { wave: 'triangle', vol: .22, notes: 'G2 . D3 . G2 . D3 . | E2 . B2 . E2 . B2 . | A2 . E3 . A2 . E3 . | D2 . A2 . D2 . A2 .' },
    { wave: 'drums', vol: .22, notes: 'k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h . s s h s' } ] },
  promenade: { bpm: 108, steps: 4, tracks: [
    { wave: 'pulse', vol: .1, notes: 'D5 - F#5 - A5 - F#5 - | E5 - G5 - B5 - G5 - | D5 - F#5 - A5 - D6 - | C#6 - A5 - F#5 - . .' },
    { wave: 'triangle', vol: .2, notes: 'D3 . . A2 D3 . . A2 | E3 . . B2 E3 . . B2 | D3 . . A2 D3 . . A2 | A2 . . E3 A2 . . E3' },
    { wave: 'drums', vol: .2, notes: 'k . . h s . . h | k . . h s . . h | k . . h s . . h | k . h h s . h h' } ] },
  villa: { bpm: 80, steps: 4, tracks: [
    { wave: 'sine', vol: .16, notes: 'C5 - - - E5 - - - | D5 - - - F5 - - - | E5 - - - G5 - - - | D5 - - - B4 - - -' },
    { wave: 'triangle', vol: .18, notes: 'C3 - - - - - G2 - | D3 - - - - - A2 - | E3 - - - - - B2 - | G2 - - - - - D3 -' } ] },
  match: { bpm: 136, steps: 4, tracks: [
    { name: 'lead', wave: 'pulse', vol: .11, notes: 'A4 - C5 E5 - C5 A4 - | G4 - B4 D5 - B4 G4 - | F4 - A4 C5 - A4 F4 - | E4 - G#4 B4 - E5 - . ' },
    { name: 'bass', wave: 'triangle', vol: .22, notes: 'A2 . A2 E3 A2 . A2 E3 | G2 . G2 D3 G2 . G2 D3 | F2 . F2 C3 F2 . F2 C3 | E2 . E2 B2 E2 . E2 B2' },
    { name: 'drums', wave: 'drums', vol: .3, notes: 'k . h . s . h k | . k h . s . h . | k . h . s . h k | . k h . s h s h', on: true } ] },
  victory: { bpm: 120, steps: 4, loop: false, tracks: [
    { wave: 'pulse', vol: .16, notes: 'C5 - E5 - G5 - C6 - | - - G5 - C6 - - - ' },
    { wave: 'triangle', vol: .2, notes: 'C3 - - - G3 - - - | C3 - - - - - - -' } ] },
  results: { bpm: 96, steps: 4, tracks: [
    { wave: 'triangle', vol: .17, notes: 'G4 - B4 - D5 - B4 - | A4 - C5 - E5 - C5 - | G4 - B4 - D5 - G5 - | F#5 - D5 - B4 - . .' },
    { wave: 'triangle', vol: .2, notes: 'G2 . . D3 . . G2 . | A2 . . E3 . . A2 . | G2 . . D3 . . B2 . | D3 . . A2 . . D3 .' } ] }
};
G.music = (name, o = {}) => { const a = A(); if (!a) return; if (!name) { a.music(null); G.songName = null; return; } if (G.songName === name && !o.restart) return; G.songName = name; a.music(G.SONGS[name], Object.assign({ fade: .6 }, o)); };
G.jingle = name => { const a = A(); if (a && a.sting) try { a.sting(G.SONGS[name], { at: 'bar' }); } catch (e) { a.music(G.SONGS[name], { loop: false }); } };

/* ---- sound effects (about 45) ---- */
G.SFX = {
  bump: { wave: 'noise', freq: 700, to: 200, dur: .11, vol: .5, filter: 'lowpass' },
  bumpPerfect: [{ wave: 'noise', freq: 900, to: 220, dur: .12, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 520, to: 880, dur: .14, vol: .3 }],
  set: [{ wave: 'noise', freq: 1500, to: 900, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'triangle', freq: 440, to: 520, dur: .09, vol: .22 }],
  spike: [{ wave: 'noise', freq: 1100, to: 140, dur: .16, vol: .6, filter: 'lowpass' }, { wave: 'saw', freq: 220, to: 60, dur: .18, vol: .25 }],
  serve: [{ wave: 'noise', freq: 1200, to: 300, dur: .12, vol: .5, filter: 'lowpass' }, { wave: 'square', freq: 330, to: 660, dur: .12, vol: .2 }],
  toss: { wave: 'sine', freq: 300, to: 520, dur: .15, vol: .2 },
  net: { wave: 'noise', freq: 2400, to: 1200, dur: .12, vol: .22, filter: 'highpass' },
  land: [{ wave: 'noise', freq: 500, to: 100, dur: .2, vol: .5, filter: 'lowpass' }],
  bounce: { wave: 'sine', freq: 180, to: 70, dur: .12, vol: .3 },
  dive: { wave: 'noise', freq: 900, to: 300, dur: .3, vol: .3, filter: 'bandpass' },
  jump: { wave: 'square', freq: 260, to: 520, dur: .1, vol: .12 },
  step: { wave: 'noise', freq: 400, to: 250, dur: .04, vol: .1, filter: 'lowpass' },
  whistle: [{ wave: 'sine', freq: 2600, to: 2900, dur: .24, vol: .2, vib: [32, .02] }],
  whistleLong: [{ wave: 'sine', freq: 2600, to: 3000, dur: .6, vol: .2, vib: [34, .03] }],
  point: { wave: 'square', freq: 523, dur: .1, vol: .2, arp: [0, 4, 7, 12], step: .07 },
  lose: { wave: 'triangle', freq: 330, to: 140, dur: .5, vol: .25 },
  crowd: { wave: 'noise', freq: 600, to: 900, dur: 1.2, vol: .14, filter: 'lowpass' },
  cheer: [{ wave: 'noise', freq: 800, to: 1400, dur: .9, vol: .18, filter: 'bandpass' }],
  gasp: { wave: 'noise', freq: 1500, to: 700, dur: .4, vol: .12, filter: 'bandpass' },
  ring: { wave: 'sine', freq: 880, dur: .08, vol: .12 },
  perfect: { wave: 'square', freq: 660, dur: .16, vol: .18, arp: [0, 7, 12], step: .05 },
  good: { wave: 'triangle', freq: 440, dur: .1, vol: .16 },
  miss: { wave: 'triangle', freq: 200, to: 120, dur: .2, vol: .18 },
  call: { wave: 'saw', freq: 300, to: 400, dur: .14, vol: .12 },
  select: { wave: 'square', freq: 700, dur: .035, vol: .08 },
  confirm: { wave: 'square', freq: 520, dur: .09, vol: .12, arp: [0, 7], step: .045 },
  cancel: { wave: 'square', freq: 320, to: 220, dur: .08, vol: .1 },
  coin: { wave: 'square', freq: 988, dur: .18, vol: .13, arp: [0, 5], step: .06 },
  buy: { wave: 'square', freq: 784, dur: .22, vol: .14, arp: [0, 4, 7, 12], step: .05 },
  gift: { wave: 'triangle', freq: 600, dur: .4, vol: .2, arp: [0, 4, 7, 11, 14], step: .07 },
  heart: { wave: 'sine', freq: 880, to: 1320, dur: .3, vol: .2, vib: [8, .02] },
  slotSpin: { wave: 'square', freq: 400, to: 800, dur: .06, vol: .06 },
  slotStop: { wave: 'square', freq: 260, to: 180, dur: .1, vol: .14 },
  jackpot: { wave: 'square', freq: 523, dur: 1.2, vol: .18, arp: [0, 4, 7, 12, 16, 19, 24], step: .09 },
  card: { wave: 'noise', freq: 2000, to: 1000, dur: .06, vol: .14, filter: 'highpass' },
  roulette: { wave: 'triangle', freq: 1200, to: 600, dur: .04, vol: .1 },
  pad: { wave: 'sine', freq: 440, dur: .12, vol: .15 },
  splash: [{ wave: 'noise', freq: 1500, to: 300, dur: .4, vol: .3, filter: 'lowpass' }],
  shutter: [{ wave: 'noise', freq: 3000, to: 1500, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'square', freq: 200, dur: .05, vol: .1, delay: .07 }],
  fireworks: { wave: 'noise', freq: 800, to: 3000, dur: .5, vol: .22, filter: 'bandpass' },
  dayend: { wave: 'triangle', freq: 392, dur: .8, vol: .18, arp: [0, 4, 7, 4, 0], step: .14 },
  waves: { wave: 'noise', freq: 400, to: 900, dur: 2.4, vol: .06, filter: 'lowpass' },
  gull: { wave: 'sine', freq: 1400, to: 900, dur: .3, vol: .08, vib: [20, .05] }
};
G.installAudio = game => { for (const k in G.SFX) game.audio.define(k, G.SFX[k]); };
G.sfx = (name, o) => { try { G.game.audio.sfx(name, o); } catch (e) { /* audio unavailable headless */ } };
G.voiceSfx = (v, o) => { const a = G.game.audio; try { if (!a._init() || a.muted || a.ctx.state !== 'running') return; for (const x of Array.isArray(v) ? v : [v]) a._voice(x, a._voxBus, a.ctx.currentTime + .005, 1 + (o && o.vary ? o.vary * (a._rnd() * 2 - 1) : 0)); } catch (e) { /* none */ } };

/* ---- Animalese: a bubbling, pitch-wobbling blip per letter ---- */
G.speak = (charId, ch) => {
  const c = G.CAST[String(charId).toLowerCase()] || G.CAST.you, v = c.voice;
  if (!ch || /[\s.,!?\-:;'"()]/.test(ch)) return;
  const code = ch.toLowerCase().charCodeAt(0), vowel = 'aeiou'.includes(ch.toLowerCase());
  const semi = ((code * 7) % 12) - 5, f = v.base * Math.pow(2, semi * v.spread / 12) * (vowel ? 1 : .8);
  const dur = (vowel ? .075 : .045) / v.speed, vm = (G.game.settings && typeof G.game.settings.voices === 'number') ? G.game.settings.voices : .8;   // the Voices slider in Settings
  if (vowel) G.voiceSfx({ wave: v.wave, freq: f, to: f * (1 + ((code % 5) - 2) * .04), dur, vol: .11 }, { vary: .02 });
  else G.voiceSfx([{ wave: 'noise', freq: f * 3, to: f * 2, dur: dur * .6, vol: .07, filter: 'bandpass' }, { wave: v.wave, freq: f, dur, vol: .05 }], { vary: .02 });
};
G.voiceFor = charId => (ch) => G.speak(charId, ch);
G.babble = (charId, text) => { let k = 0; for (const ch of text.slice(0, 18)) { const t = k++ * .045; G.game.after(t, () => G.speak(charId, ch)); } };

/* ===== 13-rigs.js ===== */
/* 13-rigs: the rig factory. A fighter + a swimsuit + a hat = a Humanoid. Portraits for dialog. */
G.rigCache = {};
G.makeRig = (charId, o = {}) => {
  const c = G.CAST[charId] || G.CAST.you, st = o.suit ? G.SUITS.find(s => s.id === o.suit) : null, hat = o.hat ? G.HATS.find(h => h.id === o.hat) : null;
  const cloth = st ? st.top : c.cloth, pants = st ? st.bottom : c.pants;
  const hatDef = hat && hat.style ? { style: hat.style, color: hat.color } : (charId === 'sonny' ? { style: 'cap', color: '#ffe14a' } : undefined);
  const hs = c.hairStyle;
  const extras = [];
  if (o.hat === 'visor') { }
  if (charId === 'sonny') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x - 4, y - 1, 8, 2, '#10101a'); px.rect(g, x - 3, y - 1, 2, 1, '#6ac8ff'); px.rect(g, x + 1, y - 1, 2, 1, '#6ac8ff'); } });          // sunglasses
  if (charId === 'mika' || charId === 'hana') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x + 2, y - 6, 2, 2, charId === 'mika' ? '#ffffff' : '#ff8ac8'); px.dot(g, x + 3, y - 6, '#ffd24a'); } });   // hair flower
  if (charId === 'gwen') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x - 4, y - 5, 8, 1, '#ffffff'); } });                                                                                      // sweat band
  if (charId === 'you') extras.push({ at: 'head', draw(g, x, y) { px.rect(g, x - 4, y - 1, 8, 2, '#10101a'); } });                                                                                                      // shades
  const rig = new E.Humanoid({
    size: o.size || 1.0, build: charId === 'ruby' || charId === 'gwen' ? 'heroic' : charId === 'sonny' ? 'bulky' : 'heroic', weapon: null, outfit: 'shirt', sleeves: 'none',
    hair: hs, hat: hatDef, colors: { skin: c.skin, hair: c.hair, cloth, pants, boot: c.skin, belt: pants, trim: cloth, glove: c.skin }
  });
  rig.extras = extras; return rig;
};
// one rig per (character, suit, hat); reused by every scene
G.rig = (charId, suit, hat, size) => {
  const k = charId + '|' + (suit || '') + '|' + (hat || '') + '|' + (size || 1);
  return G.rigCache[k] || (G.rigCache[k] = G.makeRig(charId, { suit, hat, size }));
};
// the player's current look (from the save, or defaults)
G.look = id => {
  const s = G.state;
  if (id === 'you') return { suit: s ? s.suit : 'coral', hat: s ? s.hat : 'none' };
  if (s && s.npcSuit && s.npcSuit[id]) return { suit: s.npcSuit[id], hat: null };
  return { suit: null, hat: null };
};
G.rigOf = (id, size) => { const l = G.look(id); return G.rig(id, l.suit, l.hat, size); };

/* ===== 20-sim.js ===== */
/* 20-sim: the volleyball simulation. Court, ball flight, referee, players, the timing judge, the AI.
 * Coordinates: x along the court (net at 0, team 0 on x < 0), y across it, z up. One unit is about 10 cm. */
G.COURT = { HL: 80, HW: 40, NETW: 50, BALL_R: 4 };
const C = G.COURT;
const GRAV = () => G.T.gravity;

/* ---- ball flight: closed-form launches (with a little air drag) ---- */
G.launch = (b, tx, ty, tz, T) => {
  const k = G.T.ballDrag, g = GRAV();
  const f = k > 1e-4 ? (1 - Math.exp(-k * T)) / k : T;      // horizontal travel per unit initial speed
  b.vx = (tx - b.x) / f; b.vy = (ty - b.y) / f;
  b.vz = (tz - b.z + .5 * g * T * T) / T;
};
// make a launched ball clear the net (a tiny correction so a hard attack is not a net fault by default)
G.netClear = (b, margin = 3) => {
  if (b.x * b.vx >= 0) return;
  const t = -b.x / b.vx, z = b.z + b.vz * t - .5 * GRAV() * t * t, need = G.T.netHeight + C.BALL_R + margin;
  if (z < need && t > .02) b.vz += (need - z) / t;
};
// where and when will the ball be at height h (descending side), by stepping the same physics
G.predict = (b, h, maxT = 3) => {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, t = 0; const dt = 1 / 60, g = GRAV(), k = G.T.ballDrag;
  while (t < maxT) {
    const pz = z;
    vx -= vx * k * dt; vy -= vy * k * dt; vz -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
    if (vz < 0 && z <= h && pz > h - 1e-6 || z <= C.BALL_R) { return { x, y, z: Math.max(z, 0), t }; }
  }
  return { x, y, z, t };
};
// when does the ball enter a sphere (cx, cy, cz, rad) from now: null if never within maxT
G.etaTo = (b, cx, cy, cz, rad, maxT = 2) => {
  let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, t = 0; const dt = 1 / 60, g = GRAV(), k = G.T.ballDrag;
  while (t < maxT) {
    if (Math.hypot(x - cx, y - cy, z - cz) <= rad) return t;
    vx -= vx * k * dt; vy -= vy * k * dt; vz -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
    if (z < 0) return null;
  }
  return null;
};

/* ---- stats from the cast, affinity ---- */
G.statMul = (id, stat) => { const c = G.CAST[id]; return c ? .75 + (c.stats[stat] || 3) * .1 : 1; };

class Player {
  constructor(m, team, slot, charId, ctl) {
    this.m = m; this.team = team; this.slot = slot; this.id = team * 2 + slot; this.charId = charId; this.char = G.CAST[charId] || G.CAST.you;
    this.side = team === 0 ? -1 : 1; this.x = this.side * 50; this.y = slot ? 14 : -14; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
    this.face = team === 0 ? 0 : Math.PI; this.ctl = ctl || { type: 'ai' }; this.human = this.ctl.type !== 'ai';
    this.swing = null; this.cool = 0; this.downT = 0; this.diveT = 0; this.diveDir = [0, 0]; this.claim = 0; this.celeb = 0; this.air = false; this.jumpWant = false;
    this.in = { mx: 0, my: 0, play: false, dive: false, call: false, ax: 0, ay: 0 };   // this step's controls
    this.react = 0; this.aiErr = 0; this.popup = null; this.popT = 0; this.ring = null; this.stepT = 0; this.expr = null; this.blockT = 0; this.tgt = null; this.pressAt = null;
    this.skill = .5; this.chem = 0; this.name = this.char.name;
  }
  get reach() { return G.T.reach * (this.diveT > 0 ? 1.65 : 1) * (.9 + this.char.stats.receive * .04); }
  center() { return [this.x, this.y, this.z + (this.diveT > 0 ? 8 : 17)]; }
}
G.Player = Player;

class Match {
  /** cfg: { teams: [[idA, idB], [idC, idD]], ctl: [4 controllers], to, house, tutorial, attract, serveTeam, names, chem } */
  constructor(cfg) {
    this.cfg = cfg; this.t = 0; this.score = [0, 0]; this.to = cfg.to || G.T.pointsToWin; this.rallyN = 0;
    this.players = []; this.events = []; this.stats = [{ aces: 0, spikes: 0, blocks: 0, digs: 0, perfect: 0, dives: 0 }, { aces: 0, spikes: 0, blocks: 0, digs: 0, perfect: 0, dives: 0 }];
    this.rng = cfg.seed !== undefined ? E.rng(cfg.seed >>> 0) : G.rng('match');
    for (let team = 0; team < 2; team++) for (let slot = 0; slot < 2; slot++) {
      const ctl = (cfg.ctl && cfg.ctl[team * 2 + slot]) || { type: 'ai' };
      const p = new Player(this, team, slot, cfg.teams[team][slot], ctl); this.players.push(p);
    }
    this.ball = { x: 0, y: 0, z: 40, vx: 0, vy: 0, vz: 0, r: C.BALL_R, state: 'held', side: 0, last: null, lastTeam: 0, touches: 0, served: false, spin: 0, trail: [], bounced: 0 };
    this.serving = cfg.serveTeam === undefined ? 0 : cfg.serveTeam; this.server = [0, 0];
    this.phase = 'intro'; this.phaseT = 0; this.winner = null; this.msg = null; this.msgT = 0; this.lastPoint = null; this.rally = { luck: false, spikes: 0, hits: 0 };
    this.hist = []; this.replay = null; this.camShake = 0; this.flash = 0; this.matchPoint = false; this.log = [];
    this.setSkills(); this.formation('serve');
    this.phase = 'intro'; this.phaseT = 0;
  }
  setSkills() {
    for (const p of this.players) {
      const base = G.T.aiSkill + (p.char.stats.receive - 3) * .035;
      p.skill = clamp(this.cfg.attract ? .9 : base + (this.cfg.skillBonus && this.cfg.skillBonus[p.team] || 0), .05, 1);
      p.chem = (this.cfg.chem && this.cfg.chem[p.team]) || 0;
      if (p.chem && !p.human) p.skill = clamp(p.skill + .25 * p.chem * G.T.chemistry, .05, 1);
    }
  }
  emit(ev, data) { const e = Object.assign({ ev, t: this.t }, data); this.events.push(e); G.bus.emit(ev, e, this); }
  say(text, t = 1.6) { this.msg = text; this.msgT = t; }
  // formation for the start of a rally
  formation(kind) {
    for (const p of this.players) {
      const s = p.side, serving = p.team === this.serving, isServer = serving && p.slot === this.server[p.team];
      p.swing = null; p.downT = 0; p.diveT = 0; p.z = 0; p.vz = 0; p.vx = p.vy = 0; p.celeb = 0; p.cool = 0; p.claim = 0; p.blockT = 0;
      if (serving) { if (isServer) { p.x = s * (C.HL + 10); p.y = 0; } else { p.x = s * 22; p.y = (p.slot ? 1 : -1) * 14; } }
      else { p.x = s * (p.slot === this.server[p.team] ? 44 : 30); p.y = (p.slot === this.server[p.team] ? -1 : 1) * 14; }
      p.face = s < 0 ? 0 : Math.PI;
    }
    const sv = this.serverPlayer(); this.ball.state = 'held'; this.ball.served = false; this.ball.touches = 0; this.ball.last = sv; this.ball.lastTeam = this.serving;
    this.ball.vx = this.ball.vy = this.ball.vz = 0; this.ball.x = sv.x + sv.side * -2; this.ball.y = sv.y; this.ball.z = 22; this.ball.trail.length = 0; this.ball.bounced = 0;
    this.rally = { luck: false, spikes: 0, hits: 0, serveT: 0 };
  }
  serverPlayer() { return this.players[this.serving * 2 + this.server[this.serving]]; }
  teamPlayers(t) { return [this.players[t * 2], this.players[t * 2 + 1]]; }
  other(p) { return this.players[p.team * 2 + (1 - p.slot)]; }
  opps(p) { return this.teamPlayers(1 - p.team); }

  /* ---------- the step ---------- */
  step(dt) {
    dt *= G.T.timeScale; this.t += dt; this.phaseT += dt; if (this.msgT > 0) this.msgT -= dt;
    this.flash = Math.max(0, this.flash - dt * 3); this.camShake = Math.max(0, this.camShake - dt * 4);
    // record for the instant replay
    this._rec = (this._rec || 0) + dt; if (this._rec > 1 / 30) { this._rec = 0; this.hist.push(this.snap()); if (this.hist.length > 120) this.hist.shift(); }
    if (this.phase === 'intro') { if (this.phaseT > (this.cfg.skipIntro ? .2 : 2.2)) { this.phase = 'serve'; this.phaseT = 0; G.sfx('whistle'); this.say(this.serverPlayer().name + ' TO SERVE', 1.4); this.emit('serveStart', { team: this.serving }); } this.moveAll(dt, true); return; }
    if (this.phase === 'end') { for (const p of this.players) { p.celeb = p.team === this.winner ? 1 : 0; this.pUpdate(p, dt, true); } return; }
    if (this.phase === 'point') {
      this.updateBall(dt, true); for (const p of this.players) this.pUpdate(p, dt, true);
      if (this.phaseT > (this.cfg.fastPoints ? 1.3 : 2.4)) this.nextRally();
      return;
    }
    for (const p of this.players) { this.controls(p, dt); }
    for (const p of this.players) this.pUpdate(p, dt, false);
    this.updateBall(dt, false);
    if (this.phase === 'serve') {
      const sv = this.serverPlayer();
      if (this.ball.state === 'held') { this.ball.x = sv.x - sv.side * -2 + 0; this.ball.y = sv.y; this.ball.z = 20 + (sv.swing ? 6 : 0); }
      if (this.phaseT > 1.0 && this.ball.state === 'held' && sv.human === false && this.cfg.tutorialWait) { /* tutorial: wait */ }
    }
  }
  moveAll(dt, locked) { for (const p of this.players) this.pUpdate(p, dt, locked); }

  /* ---------- controls: humans from this.in, AI from think() ---------- */
  controls(p, dt) {
    if (p.ctl.type === 'ai') this.think(p, dt);
    else if (p.ctl.read) p.ctl.read(p);       // fills p.in (local input, or a remote client's last message)
    if (p.in.call && !p.callPrev) { p.claim = 1.2; if (!G.hub) { this.say(p.name + ': "MINE!"', .8); G.sfx('call'); G.speak(p.charId, 'a'); } this.emit('call', { p }); }   // (in a hub session a call only steers the CPU partner: no player-to-player signals)
    p.callPrev = p.in.call;
  }
  /* ---------- the player ---------- */
  pUpdate(p, dt, locked) {
    const T = G.T, I = p.in;
    p.claim = Math.max(0, p.claim - dt); p.cool = Math.max(0, p.cool - dt); p.popT = Math.max(0, p.popT - dt); p.blockT = Math.max(0, p.blockT - dt);
    // movement
    let mx = locked ? 0 : I.mx, my = locked ? 0 : I.my; const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const sp = (p.human ? T.moveSpeed : T.moveSpeed * T.aiSpeed) * (.88 + p.char.stats.speed * .05) * (p.swing ? .55 : 1) * (p.z > 1 ? .5 : 1);
    if (p.downT > 0) { p.downT -= dt; p.vx *= .88; p.vy *= .88; }
    else if (p.diveT > 0) {
      p.diveT -= dt; p.vx = p.diveDir[0] * T.diveSpeed * (p.diveT / .38 + .3); p.vy = p.diveDir[1] * T.diveSpeed * (p.diveT / .38 + .3);
      if (p.diveT <= 0) { p.downT = .55; }
    } else { p.vx = approach(p.vx, mx * sp, dt * 900); p.vy = approach(p.vy, my * sp, dt * 900); }
    if (p.z > 0 || p.vz > 0) { p.vz -= T.gravity * 1.2 * dt; p.z += p.vz * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; if (p.air) { p.air = false; G.sfx('land', { vol: .3 }); } } } else p.air = false;
    p.x += p.vx * dt; p.y += p.vy * dt;
    // keep out of the net and inside the extended court
    const lim = p.side * 4;
    if (p.side < 0) p.x = clamp(p.x, -(C.HL + 28), -4); else p.x = clamp(p.x, 4, C.HL + 28);
    void lim; p.y = clamp(p.y, -(C.HW + 22), C.HW + 22);
    const spd = Math.hypot(p.vx, p.vy);
    p.face = p.side < 0 ? 0 : Math.PI;
    if (spd > 8 && p.z <= 0 && p.diveT <= 0) { p.stepT -= dt; if (p.stepT <= 0) { p.stepT = .24; if (this.cfg.sounds !== false && p.human) G.sfx('step', { vol: .35 }); } }
    // buttons
    if (!locked) {
      if (I.dive && !p.diveP && p.diveT <= 0 && p.downT <= 0 && p.z <= 0 && this.phase === 'rally') {
        let dx = mx, dy = my; if (Math.hypot(dx, dy) < .2) { const b = this.ball; dx = b.x - p.x; dy = b.y - p.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; }
        else { const l = Math.hypot(dx, dy); dx /= l; dy /= l; }
        p.diveT = .38; p.diveDir = [dx, dy]; p.swing = { t: 0, dur: .34, hit: false, dive: true, pressT: this.t }; G.sfx('dive', { vol: .5 }); this.stats[p.team].dives++; this.emit('dive', { p });
      }
      if (I.play && !p.playP) this.pressPlay(p);
    }
    p.diveP = I.dive; p.playP = I.play;
    // swing progress and contact
    if (p.swing) {
      p.swing.t += dt;
      if (!p.swing.hit) this.tryContact(p);
      if (p.swing.t >= p.swing.dur) { p.swing = null; p.cool = .12; }
    }
    // the timing ring for the next contact (for humans)
    p.ring = null;
    if (p.human && this.phase === 'rally' && this.ball.state === 'flight' && !p.swing) {
      const c = p.center(), eta = G.etaTo(this.ball, c[0], c[1], c[2], p.reach + C.BALL_R, 1.4);
      if (eta !== null && (this.ball.x * p.side > -6 || Math.abs(this.ball.x) < 22)) p.ring = { eta };
    }
  }
  pressPlay(p) {
    const b = this.ball, T = G.T;
    if (p.downT > 0 || p.swing || p.cool > 0) return;
    if (this.phase === 'serve') {
      if (p !== this.serverPlayer()) return;
      if (b.state === 'held') {            // toss
        b.state = 'flight'; b.vx = 0; b.vy = 0; b.vz = 150; b.x = p.x - p.side * 0; b.y = p.y; b.z = 24; b.last = p; b.lastTeam = p.team; b.touches = 0; b.served = true; b.tossT = this.t;
        p.vz = T.jumpVel * .55; p.air = true; G.sfx('toss'); this.emit('toss', { p }); p.tossed = true; return;
      }
    }
    if (this.phase !== 'serve' && this.phase !== 'rally') return;
    // swing
    p.swing = { t: 0, dur: .3, hit: false, pressT: this.t };
    // jump for a ball that is high near the net, or to block
    const c = this.ball, near = Math.abs(p.x) < 40;
    if (p.z <= 0 && p.diveT <= 0 && ((c.z > 28 && near) || (this.phase === 'serve' && p === this.serverPlayer() && c.z > 26) || (near && Math.abs(c.x) < 26 && c.z > T.netHeight - 6))) {
      p.vz = T.jumpVel; p.air = true; G.sfx('jump', { vol: .5 });
    }
  }
  tryContact(p) {
    const b = this.ball, T = G.T; if (b.state !== 'flight') return;
    const c = p.center(), d = Math.hypot(b.x - c[0], b.y - c[1], b.z - c[2]), rad = p.reach + C.BALL_R;
    if (d > rad) return;
    // right side of the net, or a block over the net
    const onMySide = b.x * p.side > 0, nearNet = Math.abs(b.x) < 16;
    const attackedAtMe = !onMySide && b.lastTeam !== p.team;
    if (!onMySide && !(attackedAtMe && nearNet && (p.z > 4 || p.blockT > 0) && b.z > T.netHeight - 10)) return;
    if (!onMySide) { this.contactBlock(p, d, rad); return; }
    if (b.last === p && b.touches > 0 && !(this.phase === 'serve')) return;       // no double touches
    if (b.lastTeam === p.team && b.touches >= 3) return;                             // three touches only
    if (this.phase === 'serve' && p !== this.serverPlayer()) return;
    // timing: the swing's peak is at half its length
    const e = Math.abs(p.swing.t - p.swing.dur * .5);
    let q; if (e <= T.perfectWindow) q = 1; else if (e <= T.timingWindow) q = .75 - (e - T.perfectWindow) / (T.timingWindow - T.perfectWindow) * .3; else q = Math.max(.12, .45 - (e - T.timingWindow) * 1.8);
    q *= (1 - .35 * d / rad);
    if (!p.human) q = clamp(q * (.8 + p.skill * .25), .1, 1);
    this.contact(p, q, d / rad, e);
  }
  grade(q, e) { return e <= G.T.perfectWindow ? 'PERFECT' : q > .55 ? 'GOOD' : q > .3 ? 'OK' : 'LATE'; }

  /* ---------- a touch ---------- */
  aimTarget(p, depthMin, depthMax) {
    // human: stick/mouse; AI: pick the least covered spot
    const opp = this.opps(p), s = -p.side;
    if (p.human && (Math.abs(p.in.ax) + Math.abs(p.in.ay) > .25)) {
      const ax = p.in.ax * -p.side, ay = p.in.ay;                     // deeper into the opponents' court is +ax
      const depth = clamp(0.5 + 0.5 * ax, 0, 1);
      return [s * (depthMin + (depthMax - depthMin) * depth), clamp(ay * (C.HW - 6), -C.HW + 5, C.HW - 5)];
    }
    let best = null, bs = -1;
    for (let k = 0; k < 7; k++) {
      const tx = s * (depthMin + this.rng() * (depthMax - depthMin)), ty = (this.rng() * 2 - 1) * (C.HW - 6);
      const sc = Math.min(Math.hypot(opp[0].x - tx, opp[0].y - ty), Math.hypot(opp[1].x - tx, opp[1].y - ty)) + (p.human ? this.rng() * 12 : this.rng() * (1 - p.skill) * 60);
      if (sc > bs) { bs = sc; best = [tx, ty]; }
    }
    return best;
  }
  contact(p, q, off, e) {
    const b = this.ball, T = G.T, s = p.side, tc = (b.lastTeam === p.team && b.state === 'flight' && b.served !== 'x') ? b.touches : 0;
    const isServe = this.phase === 'serve' && p === this.serverPlayer();
    const err = (1 - q) * (isServe ? 26 : 22) + off * 6; let kind;
    const jit = () => (this.rng() * 2 - 1);
    p.swing.hit = true; p.expr = 'shout';
    if (isServe) {
      kind = 'serve'; const [tx, ty] = this.aimTarget(p, 18, 74);
      const dist = Math.hypot(tx - b.x, ty - b.y), Tm = clamp(dist / (150 * T.serveSpeed * (.9 + p.char.stats.power * .04)), .55, 1.4);
      G.launch(b, tx + jit() * err * (q > .95 ? .3 : 1), ty + jit() * err, 0, Tm); G.netClear(b, 4 + (1 - q) * 2); this.phase = 'rally'; this.phaseT = 0; b.served = true; b.touches = 0;
      p.swing.dur = .3; this.emit('serve', { p, q });
      this.stats[p.team].perfect += q >= .99 ? 1 : 0;
    } else {
      // bump first, set second, attack third
      const spikeOK = b.z >= T.netHeight - 2 && p.z > 3 && Math.abs(p.x) < 36;
      if (tc === 0) {
        kind = 'bump'; const mate = this.other(p), sx = s * 17, sy = clamp(mate.y + (mate.vy || 0) * .3, -20, 20);
        G.launch(b, sx + jit() * err * .8, sy + jit() * err * .8, T.netHeight + 14, .95); this.stats[p.team].digs++;
      } else if (tc === 1) {
        kind = 'set'; const hit = this.other(p), hx = s * 11, hy = clamp(hit.y, -26, 26);
        G.launch(b, hx + jit() * err * .5, hy + jit() * err * .6, T.netHeight + 11, .62 + .08 * (1 - q));
      } else {
        const [tx, ty] = this.aimTarget(p, 14, 74);
        if (spikeOK) {
          kind = 'spike'; const dist = Math.hypot(tx - b.x, ty - b.y);
          G.launch(b, tx + jit() * err * .8, ty + jit() * err * .9, 0, clamp(dist / (230 * T.spikePower * (.85 + p.char.stats.power * .06) * (.7 + q * .3)), .3, 1)); G.netClear(b, 1 + (1 - q) * 3);
          this.rally.spikes++; this.stats[p.team].spikes++;
        } else { kind = 'free'; G.launch(b, tx * .9 + jit() * err, ty + jit() * err, 0, .95); G.netClear(b, 6); }
      }
      if (b.lastTeam !== p.team) b.touches = 0; b.touches++; b.lastTeam = p.team; b.last = p; this.rally.hits++;
    }
    b.state = 'flight'; b.last = p; b.lastTeam = p.team; b.side = Math.sign(b.vx) || b.side; b.bounced = 0;
    const grade = this.grade(q, e); p.popup = { text: kind === 'serve' && q > .9 ? 'SERVE!' : grade, kind, q }; p.popT = .8;
    if (q >= .99 && kind !== 'serve') this.stats[p.team].perfect++;
    G.sfx(kind === 'spike' ? 'spike' : kind === 'serve' ? 'serve' : kind === 'set' ? 'set' : q >= .99 ? 'bumpPerfect' : 'bump', { vol: .9 });
    if (q >= .99) G.sfx('perfect', { vol: .5 }); else if (q < .3) G.sfx('miss', { vol: .4 });
    if (kind === 'spike') { this.camShake = .6; this.flash = .5; G.game.shake(2); G.game.freeze(.05); }
    G.game.input.rumble && p.human && p.ctl.input && p.ctl.input.rumble && p.ctl.input.rumble(.35, .1);
    this.emit('touch', { p, kind, q, grade });
    // a block next to the net may stop an attack
    b.spin = (this.rng() - .5) * 8;
  }
  contactBlock(p, d, rad) {
    const b = this.ball, T = G.T; p.swing.hit = true;
    const e = Math.abs(p.swing.t - p.swing.dur * .5), q = e <= T.timingWindow ? .8 : .45;
    const strong = q > .6 || (!p.human && this.rng() < p.skill * .6);
    const s = p.side;
    if (strong) {                                  // stuffed: down onto the attacker's side (a point)
      b.vx = -s * (60 + this.rng() * 30);
      b.vy = (this.rng() - .5) * 40; b.vz = -60; b.x = -s * 3; this.stats[p.team].blocks++; this.say('BLOCKED!', 1.2); this.emit('block', { p, strong: true }); b.lastTeam = p.team; b.last = p; b.touches = 0;
      p.popup = { text: 'BLOCK!', kind: 'block', q: 1 };
    } else {                                       // a soft touch: floats on to the blockers' side
      b.vx = p.side * 60; b.vy *= .3; b.vz = 120; b.lastTeam = 1 - p.team; b.last = p; b.touches = 0;
      p.popup = { text: 'TOUCH', kind: 'block', q: .4 }; this.emit('block', { p, strong: false });
    }
    p.popT = .8; G.sfx('spike', { vol: .6 }); G.game.shake(2); b.state = 'flight';
  }

  /* ---------- the ball ---------- */
  updateBall(dt, dead) {
    const b = this.ball, T = G.T; if (b.state === 'held') return;
    const px0 = b.x;
    b.trail.push([b.x, b.y, b.z]); if (b.trail.length > 8) b.trail.shift();
    b.vx -= b.vx * T.ballDrag * dt; b.vy -= b.vy * T.ballDrag * dt; b.vz -= T.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.state === 'dead') {                       // after the point: bounce and roll
      if (b.z <= C.BALL_R) { b.z = C.BALL_R; if (b.vz < -25) { b.vz = -b.vz * .4; G.sfx('bounce', { vol: .25 }); } else b.vz = 0; b.vx *= .94; b.vy *= .94; }
      return;
    }
    if (dead) return;
    // the net
    if ((px0 < 0) !== (b.x < 0) && px0 !== 0) {
      if (b.z < T.netHeight + C.BALL_R && Math.abs(b.y) < C.NETW + 4 && b.z > 0) {
        b.x = px0 < 0 ? -1.5 : 1.5; b.vx *= -.18; b.vy *= .5; b.vz = Math.min(b.vz, 20); G.sfx('net', { vol: .6 }); this.emit('net', {});
        if (b.vz < 0 && b.z < T.netHeight - 8) { b.vz = 10; }
        // a ball that goes into the net is still alive on the side it came from; touches stay
        if (b.last && b.touches >= 3 && b.lastTeam === (px0 < 0 ? 0 : 1)) { /* last touch into the net: just drops */ }
      } else {
        // crossed: the other side's touches start from 0
        b.touches = 0; b.side = b.x < 0 ? -1 : 1; this.rally.luck = this.rally.luck;
        if (this.cfg.attract !== true) { /* nothing */ }
      }
    }
    if (b.z <= C.BALL_R && b.vz < 0) this.landed();
  }
  landed() {
    const b = this.ball, T = G.T; b.z = C.BALL_R;
    const sideTeam = b.x < 0 ? 0 : 1;
    const inBounds = Math.abs(b.x) <= C.HL + 2 && Math.abs(b.y) <= C.HW + 2;
    // THE HOUSE: a lucky bounce keeps the ball alive on the House's side, once a rally
    if (this.cfg.house && inBounds && sideTeam === 1 && !this.rally.luck && this.phase === 'rally' && this.rng() < .3) {
      this.rally.luck = true; b.vz = 150; b.vx *= .3; b.vy *= .3; b.touches = 0; b.lastTeam = 0; G.sfx('jackpot', { vol: .5 }); this.say('LUCKY BOUNCE!', 1.4); this.emit('lucky', {}); b.bounced++; return;
    }
    let winner, why;
    if (this.phase === 'serve' && !b.served) return;
    if (!inBounds) { winner = 1 - b.lastTeam; why = 'out'; }
    else { winner = 1 - sideTeam; why = b.lastTeam === sideTeam && b.touches > 0 ? 'down' : 'floor'; }
    if (b.touches === 0 && b.last && this.rally.hits === 0 && inBounds && sideTeam !== b.lastTeam) why = 'ace';
    this.pointTo(winner, why);
  }
  pointTo(winner, why) {
    const b = this.ball; if (this.phase === 'point' || this.phase === 'end') return;
    const lastTeam = b.lastTeam; this.score[winner]++; this.phase = 'point'; this.phaseT = 0; b.state = 'dead'; b.vx *= .3; b.vy *= .3; b.vz = Math.abs(b.vz) * .3;
    const ace = why === 'ace' && winner === lastTeam; if (ace) this.stats[winner].aces++;
    this.lastPoint = { winner, why, ace, spikes: this.rally.spikes };
    this.matchPoint = false;
    for (const p of this.players) { p.celeb = p.team === winner ? 1 : 0; p.expr = p.team === winner ? 'smile' : 'wince'; p.swing = null; }
    this.say(ace ? 'ACE!' : why === 'out' ? 'OUT!' : (this.rally.spikes && winner === lastTeam) ? 'SPIKE!' : 'POINT!', 1.6);
    G.sfx('whistle'); G.sfx(winner === 0 ? 'point' : 'lose', { vol: .6 }); if (winner === 0) G.sfx('cheer', { vol: .7 });
    this.crowdBurst = 1.4; this.emit('point', { winner, why, ace, score: this.score.slice() });
    // serve rotation: the team that wins the rally serves next; if it was not serving, its other player serves
    if (winner !== this.serving) { this.serving = winner; this.server[winner] = 1 - this.server[winner]; }
    // match over?
    const [a, c] = this.score;
    if ((a >= this.to || c >= this.to) && Math.abs(a - c) >= 2) { this.winner = a > c ? 0 : 1; this.endT = this.t; }
    else if (Math.max(a, c) >= this.to - 1 && Math.abs(a - c) >= 1) { this.matchPoint = true; }
    // a replay of the highlight
    this.replayFrames = (ace || this.rally.spikes > 0 || this.rally.hits >= 6) ? this.hist.slice(-80) : null;
  }
  nextRally() {
    if (this.winner !== null) { this.phase = 'end'; this.phaseT = 0; G.jingle('victory'); this.emit('matchEnd', { winner: this.winner, score: this.score.slice() }); return; }
    this.phase = 'serve'; this.phaseT = 0; this.formation('serve'); this.rallyN++;
    const sv = this.serverPlayer(); this.say(this.matchPoint ? 'MATCH POINT' : sv.name + ' TO SERVE', 1.3); G.sfx('whistle', { vol: .5 });
    for (const p of this.players) p.expr = null;
  }

  /* ---------- the AI ---------- */
  think(p, dt) {
    const I = p.in, b = this.ball, T = G.T; I.play = false; I.dive = false; I.call = false; I.mx = 0; I.my = 0; I.ax = 0; I.ay = 0;
    if (p.downT > 0 || this.phase === 'intro') return;
    const mate = this.other(p), side = p.side, sk = p.skill;
    p.react -= dt;
    const goto = (x, y, tol = 3) => { const dx = x - p.x, dy = y - p.y, l = Math.hypot(dx, dy); if (l > tol) { I.mx = dx / l * Math.min(1, l / 14); I.my = dy / l * Math.min(1, l / 14); } return l; };
    if (this.phase === 'serve') {
      if (p === this.serverPlayer()) {
        goto(side * (C.HL + 10), clamp(b.y, -10, 10) * 0, 1);
        if (b.state === 'held' && this.phaseT > (this.cfg.attract ? .9 : 1.4 + (1 - sk) * .6) && !(this.cfg.tutorialHold)) I.play = true;
        else if (b.state === 'flight' && b.served && b.touches === 0) {
          // hit at the top of the toss, descending a little
          const tt = this.t - (b.tossT || 0), want = .62 + (this.rng() - .5) * (1 - sk) * .25;
          if (tt > want && b.vz < 30) { I.play = true; const t = this.aimTarget(p, 24, 70); I.ax = -side * (t[0] < 0 ? -1 : 1) * 0.0; }
          p.pressAt = null;
        }
      } else goto(side * 24, (p.slot ? 1 : -1) * 14);
      return;
    }
    if (this.phase !== 'rally') return;
    const mine = b.x * side > 0 || (b.lastTeam !== p.team && Math.abs(b.x) < 12 && b.vx * side < 0);
    const incoming = b.lastTeam !== p.team && (b.vx * side > 0 || b.x * side > 0);
    const rallyMine = b.lastTeam === p.team && b.touches > 0 && b.touches < 3 && b.x * side > -2 && b.state === 'flight';
    // who plays it? the nearer of the two (not the last toucher unless it is a first touch)
    const intercept = pl => {
      const tgt = G.predict(b, 18, 2.4); const t = tgt.t; const x = clamp(tgt.x, side < 0 ? -(C.HL + 18) : 6, side < 0 ? -6 : C.HL + 18), y = clamp(tgt.y, -C.HW - 14, C.HW + 14);
      return { x, y, t, dist: Math.hypot(x - pl.x, y - pl.y), time: Math.hypot(x - pl.x, y - pl.y) / (T.moveSpeed * T.aiSpeed * .95) };
    };
    const iAm = (() => {
      if (!(incoming || rallyMine) && !(b.lastTeam === p.team && b.touches === 0)) return false;
      if (b.lastTeam === p.team && b.touches >= 3) return false;
      const a = intercept(p), m = intercept(mate);
      const eligible = pl => !(b.last === pl && b.touches > 0 && b.lastTeam === p.team);
      let ma = a.time - (p.claim > 0 ? .5 : 0), mm = m.time - (mate.claim > 0 ? .5 : 0) + (mate.downT > 0 ? .6 : 0);
      if (!eligible(p)) return false; if (!eligible(mate)) return true;
      if (mate.human && mate.claim > 0) mm -= .3;
      return ma <= mm;
    })();
    if (iAm) {
      const ic = intercept(p);
      // the human reaction delay for the first move toward a new ball
      const spot = [ic.x, ic.y];
      // go where the ball will be at hitting height; prefer to wait for it
      const tol = 2; const l = goto(spot[0], spot[1], tol);
      // hit time: swing peak when the ball reaches the contact sphere
      const c = p.center(), eta = G.etaTo(b, c[0], c[1], c[2], p.reach + C.BALL_R * .5, 1.5);
      const need = p.swing ? 99 : .15 + (this.rng() - .5) * (1 - sk) * .22;
      if (eta !== null && eta <= need && l < p.reach * 1.1 && !p.swing && p.cool <= 0) I.play = true;
      // a long way off: dive
      if (!I.play && p.diveT <= 0 && ic.time > ic.t * .95 && l < 48 && l > p.reach * 1.2 && ic.t < .5 && sk > .35) { I.dive = this.rng() < .08 + sk * .12; I.mx = (ic.x - p.x) / Math.max(1, l); I.my = (ic.y - p.y) / Math.max(1, l); }
      // spike height: jump for it via pressPlay
      if (b.touches === 2 && b.lastTeam === p.team) { /* attacking: face open court */ }
      return;
    }
    // not the player: position
    if (rallyMine || (b.lastTeam === p.team && b.touches > 0)) {   // support: hitter waits at the net
      const gy = clamp(b.y, -22, 22) * .3 + (p.slot ? 12 : -12);
      goto(side * (b.touches >= 1 ? 16 : 24), gy);
    } else if (b.lastTeam !== p.team && Math.abs(b.x) < 6 && b.z > T.netHeight && (b.vx * side > 0 || b.x * side > 0)) {
      goto(side * 6, clamp(b.y, -30, 30));
    } else if (incoming) {
      // cover the back
      const t = G.predict(b, 18, 2.4); const cover = (mate.y > 0) ? -16 : 16; goto(side * clamp(Math.abs(t.x) + 16, 34, 66), cover);
      // block at the net when a spike is coming
      if (this.rally.spikes > 0 || (b.touches >= 2 && b.lastTeam !== p.team)) { /* stay */ }
    } else {
      goto(side * (p.slot === this.server[p.team] ? 46 : 32), (p.slot === this.server[p.team] ? -1 : 1) * 15);
    }
    // blocking: the front player jumps when the opponents are about to attack
    const front = Math.abs(p.x) < 28;
    if (front && !p.swing && p.z <= 0 && b.lastTeam !== p.team && Math.abs(b.x) < 18 && b.z > T.netHeight - 8 && this.rng() < .08 + sk * .1 && b.vx * side > 0) { I.play = true; }
    void mine;
  }

  /* ---------- snapshots (replay, net sync) ---------- */
  snap() {
    const b = this.ball;
    return { t: this.t, b: [b.x, b.y, b.z, b.state === 'dead' ? 1 : 0], p: this.players.map(p => [p.x, p.y, p.z, p.vx, p.vy, p.swing ? p.swing.t / p.swing.dur : -1, p.diveT > 0 ? 1 : p.downT > 0 ? 2 : 0, p.celeb ? 1 : 0]) };
  }
  state() {
    const b = this.ball;
    return { t: +this.t.toFixed(2), score: this.score.slice(), phase: this.phase, serving: this.serving, ball: [+b.x.toFixed(1), +b.y.toFixed(1), +b.z.toFixed(1)], touches: b.touches, winner: this.winner,
      players: this.players.map(p => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]), stats: this.stats };
  }
}
G.Match = Match;

/* ===== 24-match.js ===== */
/* 24-match: the match scene: cameras, drawing the court, crowd, HUD, commentary, replay and results. */
E.VIEWS.court = new E.View('court', 'Broadcast', 0, 38, 1.6, 1);
E.VIEWS.servecam = new E.View('servecam', 'Serve Cam', -90, 46, 1.5, 1);
const C2 = G.COURT;

G.teamName = (m, t) => m.players[t * 2].name + ' & ' + m.players[t * 2 + 1].name;
const TEAM_COL = [['#ff8a3a', '#ffd24a'], ['#3ab0ff', '#9be0ff']];

/* ---- controllers for local humans ---- */
G.localCtl = input => ({
  type: 'local', input,
  read(p) {
    if (G.autopilot) { p.m.think(p); return; }
    const I = this.input, v = G.game.view, mv = G.overlay.has('dev') ? [0, 0] : I.move(), len = Math.min(1, Math.hypot(mv[0], mv[1]));
    const d = len > .05 ? v.screenDirToGround(mv[0], mv[1]) : [0, 0];
    p.in.mx = d[0] * len; p.in.my = d[1] * len;
    const lock = G.overlay.has('dev'); p.in.play = !lock && I.down('play'); p.in.dive = !lock && I.down('dive'); p.in.call = !lock && I.down('call');
    let ax = d[0] * len, ay = d[1] * len;
    if (I.lastDevice === 'mouse' && I.pointer() && p.scr) {            // mouse aims: from the player toward the pointer
      const q = I.pointer(), g = v.screenDirToGround(q[0] - p.scr[0], q[1] - p.scr[1]); ax = g[0]; ay = g[1];
    }
    p.in.ax = ax; p.in.ay = ay;
    if (I.pressed('cam') && G.matchScene) G.matchScene.toggleCam();
  }
});

/* ---- the scene ---- */
G.MatchScene = {
  pausable: true, view: 'court', input: G.INPUT_MATCH, res: 'ps1', expand: true, name: 'match',
  enter(data) {
    const game = G.game; data = data || {}; this.data = data; G.matchScene = this;
    G.music(data.music || 'match', { restart: true });
    const ctl = data.ctl || [G.localCtl(game.input), { type: 'ai' }, { type: 'ai' }, { type: 'ai' }];
    this.m = new G.Match(Object.assign({ ctl, teams: [['mika', 'you'], ['ruby', 'tomo']] }, data.cfg));
    this.m.cfg.attract = !!data.attract;
    this.rigs = this.m.players.map(p => G.rigOf(p.charId, 1.0));
    this.cam = 'court'; this.camT = 0; this.over = null; this.menu = null; this.t = 0; this.replayI = -1; this.replayT = 0; this.shown = { phase: '', cmt: null }; this.cmt = ''; this.cmtT = 0; this.cutT = 0;
    this.crowd = []; const rn = E.rng(77); for (let i = 0; i < 90; i++) this.crowd.push({ x: -120 + rn() * 240, y: -50 - rn() * 26, c: ['#ff7a5a', '#ffd24a', '#5ac8ff', '#a0e060', '#ff7ad0', '#ffffff'][Math.floor(rn() * 6)], h: ['#3a2a1e', '#e8c068', '#101010', '#a03018'][Math.floor(rn() * 4)], ph: rn() * 6, sh: rn() });
    this.floats = []; this.sand = []; this.hud = { score: [0, 0] };
    game.setView('court'); game.lights.enabled = false; game.cam.smooth = .25; game.cam.bounds = null; game.follow(null);
    this.unbind = [G.bus.on('point', e => this.onPoint(e)), G.bus.on('touch', e => this.onTouch(e)), G.bus.on('block', () => this.say('block')), G.bus.on('dive', () => this.say('dive'))];
    if (data.net) data.net.start(this);
    if (data.tutorial) this.tut = { step: 0, t: 0 };
    game.weather = data.weather || null;
    this.focusT = 0;
    G.hubReady && G.hubReady();
  },
  exit() { if (this.unbind) this.unbind.forEach(f => f()); this.unbind = null; G.matchScene = null; G.game.weather = null; if (this.data.net) this.data.net.stop(); },
  toggleCam() { this.cam = this.cam === 'court' ? 'servecam' : 'court'; G.game.setView(this.cam); G.game.note(G.game.view.label.toUpperCase()); },
  say(kind) { const lines = G.TEXT.commentary[kind]; if (lines && this.cmtT <= 0) { this.cmt = G.rpick(lines, 'cosmetic'); this.cmtT = 3; } },
  onPoint(e) {
    if (!this.m) return;
    const m = this.m, kind = e.ace ? 'ace' : e.why === 'out' ? 'fault' : (m.rally.spikes ? 'spike' : 'point');
    this.cmt = G.rpick(G.TEXT.commentary[kind] || G.TEXT.commentary.point, 'cosmetic'); this.cmtT = 3.4;
    G.babble('sonny', this.cmt);
    this.replayI = -1; this.replayT = 0;
    for (const c of this.crowd) c.cheer = e.winner === 0 ? 1 : .3;
    G.game.flash && G.game.flash('#ffffff', .15);
  },
  onTouch(e) {
    const p = e.p; this.floats.push({ x: p.x, y: p.y, z: 34, text: e.grade === 'PERFECT' ? 'PERFECT!' : e.grade, t: .9, col: e.grade === 'PERFECT' ? '#fff06a' : e.grade === 'GOOD' ? '#9bffb0' : '#ffb0a0' });
    for (let i = 0; i < (e.kind === 'spike' ? 10 : 5); i++) this.sand.push({ x: this.m.ball.x, y: this.m.ball.y, z: 3, vx: (G.rand() - .5) * 60, vy: (G.rand() - .5) * 40, vz: 30 + G.rand() * 50, t: .6 });
  },
  update(dt) {
    const m = this.m, game = G.game, I = game.input; this.t += dt;
    if (this.cmtT > 0) this.cmtT -= dt;
    // the match ends: results menu
    if (m.phase === 'end') { this.updateEnd(dt); if (!m.netClient) m.step(dt); } else if (!this.data.frozen) {
      if (!m.netClient) m.step(dt); else m.t += dt;
      if (this.tut) this.updateTutorial(dt);
    }
    if (this.data.net) this.data.net.tick(dt);
    if (this.data.attract) this.attractDirector(dt);
    // views
    const b = m.ball;
    game.focus(b.x * .2, -2, 8);
    // rigs
    const f = this.frame();
    this.m.players.forEach((p, i) => {
      const fp = f.p[i], u = fp[5], air = fp[2] > 1.5, state = fp[6];
      const anim = p.swing && p.swing.dive ? null : (u >= 0 ? this.swingAnim(p, u) : null);
      let pose = null; if (fp[7]) pose = 'cheer'; else if (p.blockT > 0 || (u >= 0 && Math.abs(p.x) < 28 && air && !p.human)) pose = null;
      this.rigs[i].update(dt, { x: fp[0], y: fp[1], z: fp[2], vx: fp[3], vy: fp[4], facing: p.face, air, attack: anim, pose, down: state === 1 ? .55 : state === 2 ? 1 : 0, expr: p.expr, lean: 0 });
      p.scr = null;
    });
    for (const s of this.sand) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.vz -= 200 * dt; if (s.z < 0) s.z = 0; }
    this.sand = this.sand.filter(s => s.t > 0);
    for (const fl of this.floats) { fl.t -= dt; fl.z += 18 * dt; }
    this.floats = this.floats.filter(fl => fl.t > 0);
    for (const c of this.crowd) c.cheer = Math.max(0, (c.cheer || 0) - dt * .5);
    // replay of a highlight after a point
    if (m.phase === 'point' && m.replayFrames && m.phaseT > .9 && m.phaseT < 2.3) { this.replayT += dt; this.replayI = Math.min(m.replayFrames.length - 1, Math.floor(this.replayT * 30 * .55)); } else this.replayI = -1;
    G.music && 0;
  },
  swingAnim(p, u) {
    const kind = (p.swing && p.swing.anim) || (this.m.phase === 'serve' || p.z > 4 ? 'overhead' : 'cast');
    const ph = u < .4 ? 'wind' : u < .65 ? 'active' : 'recover', pu = u < .4 ? u / .4 : u < .65 ? (u - .4) / .25 : (u - .65) / .35;
    return E.move(kind, clamp(pu, 0, 1), ph);
  },
  frame() {
    const m = this.m;
    if (this.replayI >= 0 && m.replayFrames) return m.replayFrames[this.replayI];
    return m.snap();
  },
  toggleCamAuto() { },
  attractDirector(dt) {
    this.cutT += dt; if (this.cutT > 9) { this.cutT = 0; this.toggleCam(); }
    if (this.data.camStart && !this.camSet) { this.camSet = true; this.cam = this.data.camStart; G.game.setView(this.cam); }
    this.atT = (this.atT || 0) + dt; if (G.attract && ((this.m.phase === 'end' && this.over && this.over.t > 2.5) || this.atT > 55)) G.attractNext();
    // always keep the show going: if the match ended, the attract wrapper restarts it
  },
  updateTutorial(dt) {
    const t = this.tut, m = this.m; t.t += dt;
    const steps = [
      ['Welcome to the court! Move with ' + (G.isPad() ? 'the left stick' : 'WASD') + '.', () => m.phase === 'serve' && t.t > 3],
      ['Press ' + G.label('play') + ' to TOSS, press it again to SERVE.', () => m.ball.served],
      ['Watch the ring on the sand. Press ' + G.label('play') + ' as it closes: PERFECT timing!', () => m.stats[0].digs > 0 || m.score[0] + m.score[1] > 0],
      ['Third touch near the net jumps for a SPIKE. ' + G.label('dive') + ' dives, ' + G.label('call') + ' calls MINE.', () => m.score[0] + m.score[1] > 1]
    ];
    const s = steps[t.step]; if (s && s[1]()) { t.step++; t.t = 0; }
    this.tutText = t.step < steps.length ? steps[t.step][0] : null;
  },
  updateEnd(dt) {
    const m = this.m;
    if (!this.over) {
      this.over = { t: 0, winner: m.winner };
      const res = { winner: m.winner, score: m.score.slice(), stats: m.stats, humanTeam: this.data.humanTeam === undefined ? 0 : this.data.humanTeam, time: m.t };
      this.result = res;
      if (this.data.attract) return;
      const win = res.winner === res.humanTeam;
      this.menu = new G.Menu([
        { label: 'Continue', onPick: () => this.finish() },
        ...(this.data.rematch !== false ? [{ label: 'Rematch', onPick: () => this.rematch() }] : []),
        ...(this.data.noQuit ? [] : [{ label: 'Quit to menu', onPick: () => G.game.go(this.data.quitTo || 'menu') }])
      ], { y: 130, w: 120 });
      this.winLine = win ? G.rpick(['Sunshine and trophies!', 'Stay ahead, stay alive!', 'Tan lines, victory lines.'], 'cosmetic') : G.rpick(['The sea takes its tribute.', 'Hydrate. Reflect. Rematch.', 'Close! In a sandy kind of way.'], 'cosmetic');
      if (this.data.net) { this.menu = null; }
      if (this.data.onResult) this.data.onResult(res);
    }
    this.over.t += dt;
    if (this.menu && this.over.t > 1.2) this.menu.update(dt);
  },
  finish() { if (this.data.onEnd) this.data.onEnd(this.result); else G.game.go('menu'); },
  rematch() { const d = Object.assign({}, this.data); G.game.go('match', d); },
  /* ---------- drawing ---------- */
  draw(r) {
    const m = this.m, v = r.view, t = this.t, f = this.frame(), W = r.W, H = r.H;
    const sw = (x, y, z) => r.w(x, y, z);
    // sky, sea, beach
    const topFar = sw(0, -C2.HW - 34, 0)[1];
    const hz = Math.round(Math.max(24, topFar - 46));
    const g = r.tgt;
    const day = this.data.time === 'sunset' ? ['#3a2a6a', '#8a3a7a', '#ff6a5a', '#ffb347', '#ffe08a'] : ['#4aa8e8', '#78c4f0', '#a0daf8', '#c8eefc', '#e8f8ff'];
    const sandTop = Math.round(topFar);
    for (let i = 0; i < 5; i++) px.rect(g, 0, Math.floor(i * hz / 5), W, Math.ceil(hz / 5) + 1, day[i]);
    // clouds
    for (let i = 0; i < 4; i++) { const cx = ((i * 140 + t * 3) % (W + 80)) - 40, cy = 10 + i * 9; px.disc(g, cx, cy, 7, '#ffffffcc'); px.disc(g, cx + 8, cy + 1, 6, '#ffffffcc'); px.disc(g, cx - 8, cy + 2, 5, '#ffffffcc'); }
    for (let y = hz; y < sandTop; y++) { const k = (y - hz) / Math.max(1, sandTop - hz); px.rect(g, 0, y, W, 1, k < .35 ? '#2a9ad0' : k < .7 ? '#1a82bc' : '#3ab0d8'); for (let x = (y * 17 + Math.round(t * 8)) % 24; x < W; x += 24) px.rect(g, x, y, 5, 1, '#9ee4f4'); }
    px.rect(g, 0, sandTop, W, H - sandTop, '#f4dca0');
    for (let y = sandTop + 2; y < H; y += 4) px.rect(g, 0, y, W, 1, ((y >> 2) & 1) ? '#efd394' : '#f8e4b0');
    px.rect(g, 0, sandTop - 1, W, 2, '#fff8e0');                     // shoreline foam
    // court floor (a slightly lighter, firmer sand) and lines
    const corner = (x, y) => sw(x, y, 0), L = C2.HL, Wd = C2.HW;
    px.poly(g, [corner(-L, -Wd), corner(L, -Wd), corner(L, Wd), corner(-L, Wd)], '#f9e6b4');
    const line = (a, b, c = '#ffffff', w = 1) => px.line(g, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), c, w);
    line(corner(-L, -Wd), corner(L, -Wd)); line(corner(-L, Wd), corner(L, Wd)); line(corner(-L, -Wd), corner(-L, Wd)); line(corner(L, -Wd), corner(L, Wd)); line(corner(0, -Wd), corner(0, Wd), '#ffffff88');
    // team colour hints on the baselines
    line(corner(-L, -Wd), corner(-L, Wd), TEAM_COL[0][0], 1); line(corner(L, -Wd), corner(L, Wd), TEAM_COL[1][0], 1);
    // props and crowd
    r.prop('palm', -112, -64, 0, { size: 1.6 }); r.prop('palm', 118, -70, 0, { size: 1.9 }); r.prop('palm', 100, 74, 0, { size: 1.5 }); r.prop('palm', -108, 76, 0, { size: 1.5 });
    r.prop('sign', 0, -88, 0, { size: 1.2 });
    const shown = Math.round(this.crowd.length * G.T.crowd);
    for (let i = 0; i < Math.min(shown, this.crowd.length); i++) {
      const c = this.crowd[i], cheer = c.cheer || 0, bob = Math.abs(Math.sin(t * 6 + c.ph)) * (2 + 5 * cheer);
      r.queue(c.x, c.y, bob, gg => { const [x, y] = r.w(c.x, c.y, bob); const X = Math.round(x), Y = Math.round(y); px.rect(gg, X - 2, Y - 5, 4, 5, c.c); px.rect(gg, X - 1, Y - 8, 3, 3, '#e8b890'); px.rect(gg, X - 1, Y - 9, 3, 1, c.h); if (cheer > .5) { px.rect(gg, X - 3, Y - 8, 1, 3, '#e8b890'); px.rect(gg, X + 3, Y - 8, 1, 3, '#e8b890'); } });
    }
    // net
    const NT = G.T.netHeight;
    for (const sy of [-C2.NETW, C2.NETW]) r.queue(0, sy, 0, gg => { const [x0, y0] = r.w(0, sy, 0), [x1, y1] = r.w(0, sy, NT + 6); px.line(gg, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#d8d8e0', 2); px.rect(gg, Math.round(x1) - 1, Math.round(y1) - 1, 3, 3, '#ff4f6a'); });
    for (let y = -C2.NETW; y < C2.NETW; y += 6) {
      r.queue(0, y + 3, NT, gg => {
        const [xa, ya] = r.w(0, y, 0), [xb, yb] = r.w(0, y + 6, 0), [xc, yc] = r.w(0, y, NT), [xd, yd] = r.w(0, y + 6, NT);
        px.polyDither ? px.polyDither(gg, [[xc, yc], [xd, yd], [xb, yb - (NT - NT * .32) * -v.bz * 0 + 0 - 0], [xa, ya - (NT * .62) * -v.bz]], '#f4f4fa', .25, r.ix, r.iy) : 0;
        px.line(gg, Math.round(xc), Math.round(yc), Math.round(xd), Math.round(yd), '#ffffff', 2);
        px.line(gg, Math.round(xc), Math.round(yc + 1), Math.round(xd), Math.round(yd + 1), '#d03a4a', 1);
        px.line(gg, Math.round(xa), Math.round(ya - (NT * .62) * -v.bz), Math.round(xb), Math.round(yb - (NT * .62) * -v.bz), '#ffffff88', 1);
      }, { bias: 0 });
    }
    // players
    m.players.forEach((p, i) => {
      const fp = f.p[i], rig = this.rigs[i];
      r.shadow(fp[0], fp[1], 6, .35);
      const down = fp[6] === 2;
      r.actor(fp[0], fp[1], fp[2], (gg, ox, oy) => { p.scr = [ox, oy]; rig.draw(gg, ox, oy, r.view); });
      p.scr = r.w(fp[0], fp[1], 0);
      // marker over humans
      if (p.human && !down && this.replayI < 0) {
        const col = (E.PLAYER_COLORS && E.PLAYER_COLORS[p.ctl.pnum || 0]) || TEAM_COL[p.team][0];
        r.queue(fp[0], fp[1], 40, gg => { const [x, y] = r.w(fp[0], fp[1], 42 + Math.sin(t * 6) * 1.5); px.poly(gg, [[x - 3, y - 5], [x + 3, y - 5], [x, y]], col); }, { emissive: true });
      }
      if (p.popT > 0 && p.popup && this.replayI < 0) r.queue(fp[0], fp[1], 44, gg => { const [x, y] = r.w(fp[0], fp[1], 46 + (0.8 - p.popT) * 12); E.font.text(gg, p.popup.text, Math.round(x), Math.round(y), p.popup.q >= .99 ? '#fff06a' : p.popup.q > .55 ? '#9bffb0' : '#ffb0a0', { align: 'center', shadow: '#000', outline: false }); }, { emissive: true });
    });
    // timing ring for local humans
    if (this.replayI < 0) for (const p of m.players) if (p.human && p.ring && m.phase === 'rally') {
      const eta = p.ring.eta, half = p.swing ? 0 : G.T.timingWindow * 0 + .15, k = clamp((eta - half) / .9, 0, 1), rad = 5 + 34 * k;
      const close = Math.abs(eta - .15) < G.T.perfectWindow * 1.4;
      r.queue(p.x, p.y, 0, gg => { const [x, y] = r.w(p.x, p.y, 0); const pts = r.groundPts(p.x, p.y, rad, 22, 0); for (let i = 0; i < pts.length; i++) { const a = pts[i], b2 = pts[(i + 1) % pts.length]; px.line(gg, Math.round(a[0]), Math.round(a[1]), Math.round(b2[0]), Math.round(b2[1]), close ? '#fff06a' : '#ffffffcc', 1); } const q = r.groundPts(p.x, p.y, 5, 14, 0); for (let i = 0; i < q.length; i++) { const a = q[i], b2 = q[(i + 1) % q.length]; px.line(gg, Math.round(a[0]), Math.round(a[1]), Math.round(b2[0]), Math.round(b2[1]), '#ff4f6a', 1); } void x; void y; }, { bias: -1 });
    }
    // the serve ring: around the held/tossed ball for a human server
    // the ball
    const bb = f.b, bz = bb[2];
    r.shadow(bb[0], bb[1], 3 + Math.max(0, 1 - bz / 80) * 2, .5);
    if (m.ball.trail.length > 2 && this.replayI < 0 && Math.hypot(m.ball.vx, m.ball.vy) > 140) r.queue(bb[0], bb[1], bz, gg => { m.ball.trail.forEach((q, k) => { const [x, y] = r.w(q[0], q[1], q[2]); px.disc(gg, Math.round(x), Math.round(y), 1 + k * .25, '#ffffff' + (k < 3 ? '55' : '88')); }); }, { emissive: true });
    r.queue(bb[0], bb[1], bz, gg => {
      const [x, y] = r.w(bb[0], bb[1], bz), X = Math.round(x), Y = Math.round(y - 3), rot = Math.floor(t * 8) & 3;
      px.disc(gg, X, Y, 4, '#3a4a8a'); px.disc(gg, X, Y, 3, '#fffbe8');
      px.rect(gg, X - 3, Y - 1 + (rot & 1), 6, 1, '#ffd24a'); px.rect(gg, X - 1, Y - 3, 2, 6, '#3ab0ff'); px.dot(gg, X - 1, Y - 2, '#ffffff');
    }, { emissive: true, bias: 2 });
    for (const s of this.sand) r.queue(s.x, s.y, s.z, gg => { const [x, y] = r.w(s.x, s.y, s.z); px.rect(gg, Math.round(x), Math.round(y), 1, 1, '#f0d890'); });
    for (const fl of this.floats) { }
    this.drawHud(r);
  },
  drawHud(r) {
    const m = this.m, W = r.W, H = r.H;
    r.overlay(g => {
      // TV scoreboard
      const bw = 116, x0 = Math.round(W / 2 - bw), y0 = 3;
      for (let t = 0; t < 2; t++) {
        const x = t === 0 ? x0 : Math.round(W / 2 + 1), w = bw - 1;
        E.ui.box(g, x, y0, w, 17, { bg: ['#0e2a38', '#061620'], border: TEAM_COL[t][0], alpha: .9 });
        const nm = G.teamName(m, t); E.font.text(g, nm, t === 0 ? x + 4 : x + w - 4, y0 + 2, '#ffffff', { align: t === 0 ? 'left' : 'right', shadow: '#000', outline: false });
        E.font.text(g, '' + m.score[t], t === 0 ? x + w - 6 : x + 6, y0 + 8, TEAM_COL[t][1], { align: t === 0 ? 'right' : 'left', shadow: '#000', outline: false, scale: 1 });
        // touch pips for the team that has the ball
        const have = m.ball.lastTeam === t && m.phase === 'rally' ? m.ball.touches : 0;
        for (let i = 0; i < 3; i++) px.rect(g, (t === 0 ? x + 4 : x + w - 4 - 3 * 4) + i * 4, y0 + 12, 3, 3, i < have ? TEAM_COL[t][1] : '#1a4a5a');
        if (m.serving === t) px.disc(g, t === 0 ? x + w - 6 - E.font.width('' + m.score[t]) - 5 : x + 6 + E.font.width('' + m.score[t]) + 5, y0 + 11, 2, '#fff06a');
      }
      E.font.text(g, 'FIRST TO ' + m.to, Math.round(W / 2), y0 + 18, '#bfe9ee', { align: 'center', shadow: '#000', outline: false });
      // banner
      if (m.msg && m.msgT > 0) {
        const a = Math.min(1, m.msgT * 3), s = 1 + (m.msgT > 1.4 ? (m.msgT - 1.4) * 3 : 0);
        E.font.title(g, m.msg, Math.round(W / 2), Math.round(H * .30), { align: 'center', scale: Math.max(1, Math.round(2 * s)), colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
        void a;
      }
      if (this.replayI >= 0) { E.font.title(g, 'REPLAY', 14, 30, { scale: 2, colors: ['#ffffff', '#ff6a8a'], depth: 1, depthColor: '#5a1030' }); px.rect(g, 0, 0, W, 8, '#00000088'); px.rect(g, 0, H - 8, W, 8, '#00000088'); }
      // commentary strip
      if (this.cmtT > 0 && this.cmt) {
        const w = Math.min(W - 20, E.font.width(this.cmt) + 38), x = Math.round(W / 2 - w / 2), y = H - 36;
        E.ui.box(g, x, y, w, 15, { bg: ['#2a1a4a', '#12082a'], border: '#ff9a3c', alpha: .92 });
        E.font.text(g, 'SONNY', x + 4, y + 4, '#ffd24a', { shadow: '#000', outline: false });
        E.font.text(g, this.cmt, x + 38, y + 4, '#ffffff', { shadow: '#000', outline: false });
      }
      // serve / tutorial prompts
      let tip = '';
      const hp = m.players.find(p => p.human);
      if (hp && m.phase === 'serve' && m.serverPlayer().human && m.ball.state === 'held') tip = 'Press ' + G.label('play') + ' to toss the ball';
      else if (hp && m.phase === 'serve' && m.serverPlayer().human && m.ball.state === 'flight') tip = 'Press ' + G.label('play') + ' again to serve!';
      if (this.tutText) tip = this.tutText;
      if (tip) { const w = E.font.width(tip) + 14; E.ui.box(g, Math.round(W / 2 - w / 2), Math.round(H * .56), w, 15, { bg: ['#1b4a5a', '#0b2430'], border: '#ffd36a', alpha: .92 }); E.font.text(g, tip, Math.round(W / 2), Math.round(H * .56) + 4, '#fff6c8', { align: 'center', shadow: '#000', outline: false }); }
      if (m.phase === 'intro') {
        const k = m.phaseT; E.font.title(g, G.teamName(m, 0), Math.round(W / 2), Math.round(H * .3), { align: 'center', scale: 1, colors: ['#ffe08a', '#ff9a3c'], depth: 1, depthColor: '#5a1030' });
        E.font.text(g, 'VS', Math.round(W / 2), Math.round(H * .3) + 14, '#ffffff', { align: 'center', shadow: '#000', outline: false });
        E.font.title(g, G.teamName(m, 1), Math.round(W / 2), Math.round(H * .3) + 26, { align: 'center', scale: 1, colors: ['#bfeaff', '#3ab0ff'], depth: 1, depthColor: '#082a3a' });
        void k;
      }
      // results
      if (m.phase === 'end' && this.over) this.drawResults(g, r);
    });
    if (m.phase !== 'end' && !this.data.attract && !this.data.net) G.drawPrompts(r, [['play', 'Play'], ['dive', 'Dive'], ['call', 'Call'], ['cam', 'Camera']], H - 14);
    if (this.menu && this.over && this.over.t > 1.2) this.menu.draw(r);
  },
  drawResults(g, r) {
    const m = this.m, W = r.W, H = r.H, k = clamp(this.over.t * 2, 0, 1);
    if (this.data.attract) { E.font.title(g, G.teamName(m, m.winner) + ' WIN!', Math.round(W / 2), Math.round(H * .4), { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' }); return; }
    const w = 230, h = 100, x = Math.round(W / 2 - w / 2), y = Math.round(H * .08 + (1 - k) * -40);
    G.panel(g, x, y, w, h);
    const win = m.winner === (this.data.humanTeam === undefined ? 0 : this.data.humanTeam);
    E.font.title(g, win ? 'VICTORY!' : 'GOOD GAME', W / 2, y + 6, { align: 'center', scale: 2, colors: win ? ['#fff6c8', '#ffd24a', '#ff9a3c'] : ['#e0f4ff', '#8ac8e8', '#4a88b8'], depth: 2, depthColor: '#102a40' });
    G.text(g, G.teamName(m, 0) + '  ' + m.score[0] + ' - ' + m.score[1] + '  ' + G.teamName(m, 1), W / 2, y + 28, '#fff', { align: 'center' });
    const st = m.stats[0], s2 = m.stats[1];
    const rows = [['Spikes', st.spikes, s2.spikes], ['Blocks', st.blocks, s2.blocks], ['Digs', st.digs, s2.digs], ['Aces', st.aces, s2.aces], ['Dives', st.dives, s2.dives]];
    rows.forEach((rw, i) => { const yy = y + 40 + i * 9; G.text(g, '' + rw[1], x + 40, yy, '#ffd24a', { align: 'right' }); G.text(g, rw[0], W / 2, yy, '#bfe9ee', { align: 'center' }); G.text(g, '' + rw[2], x + w - 40, yy, '#9be0ff', { align: 'left' }); });
    G.text(g, this.winLine || '', W / 2, y + h - 10, '#ffeec2', { align: 'center' });
  }
};
G.scenes.match = G.wrapScene(G.MatchScene);

/* ===== 25-netplay.js ===== */
/* 25-netplay: AI Hub shared-world sessions. The host's copy runs the match; other copies send what their player does and
 * draw the snapshots the host sends. The game's own card shows before the round. No chat, no custom names. */
G.net = { active: false, info: null, isHost: false, seat: -1, started: false, ended: false };

// seat -> player index in the match: seats 0..3 fill (team0,slot0) (team1,slot0) (team0,slot1) (team1,slot1)
G.seatPlayer = seat => [0, 2, 1, 3][seat];
G.netSeatsOfInfo = info => (info.players || []).map((p, i) => ({ id: p.id, seat: i, color: p.color, name: p.name }));

// the AI Hub scene: connect, card, then the match
G.scenes.hub = G.wrapScene({
  view: 'court', input: G.INPUT_MATCH, res: 'ps1', expand: true, name: 'hub', pausable: false,
  enter() {
    this.t = 0; this.state = 'connecting'; this.card = { left: null, ready: [], asked: false, starting: false }; this.info = null; this.err = null; this.rigs = ['mika', 'ruby', 'hana', 'tomo'].map(id => G.rig(id, null, null, 1.2));
    G.hubCardActive = true; G.music('title'); G.game.focus(0, 0, 14); G.game.lights.enabled = false;
    const H = G.hub;
    H.connect({ mode: 'shared-world', seats: [1, 4], card: true }).then(info => {
      if (!info) { G.hubCardActive = false; G.net.active = false; G.game.go('menu'); return; }
      this.info = info; G.net.active = true; G.net.info = info; G.net.isHost = !!info.isHost; G.net.seat = info.players.findIndex(p => p.id === info.me); this.state = 'card';
      H.on('card', c => { Object.assign(this.card, c); });
      H.on('start', () => { this.state = 'starting'; this.startAt = true; });
      H.on('message', (d, from) => G.net.onMessage && G.net.onMessage(d, from));
      H.on('leave', e => { G.net.left = (G.net.left || []).concat([e.id]); if (G.net.onLeave) G.net.onLeave(e); });
      H.on('time-up', () => { if (G.net.onTimeUp) G.net.onTimeUp(); });
      H.on('end', () => { G.net.ended = true; G.hubCardActive = false; });
      H.ready();
    }).catch(e => { this.err = String(e); });
  },
  update(dt) {
    this.t += dt; const H = G.hub, I = G.game.input;
    this.rigs.forEach((rg, i) => rg.update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t + i) * .4 }));
    if (this.state === 'card' && this.info) { if (I.pressed('confirm') || I.clicked()) { H.answer('ready'); G.sfx('confirm'); } if (I.pressed('dive') || I.pressed('tab')) { H.answer('more'); } }
    if (this.state === 'starting' && H.time() >= -1500 && !this.began) { this.began = true; this.begin(); }
    if (this.state === 'starting' && this.began) { }
  },
  begin() {
    const info = this.info, nPl = info.players.length, seat = G.net.seat;
    const teams = [['mika', 'you'], ['ruby', 'tomo']], ctl = [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }];
    // humans: each seat controls one player
    info.players.forEach((p, i) => { const idx = G.seatPlayer(i); ctl[idx] = i === seat ? Object.assign(G.localCtl(G.game.input), { pnum: i }) : { type: 'remote', seat: i, pnum: i, read(pl) { Object.assign(pl.in, G.net.remoteIn[i] || {}); } }; });
    const names = [['mika', 'jo'], ['ruby', 'tomo']]; void names;
    const cfg = { teams, to: 7, seed: info.seed || 1, skipIntro: false, skillBonus: [0, 0], fastPoints: true };
    G.net.remoteIn = {}; G.net.ctl = ctl; G.net.cfg = cfg; G.net.humanTeam = seat >= 0 ? (G.seatPlayer(seat) < 2 ? 0 : 1) : 0;
    G.game.go('match', { cfg, ctl, humanTeam: G.net.humanTeam, rematch: false, noQuit: true, net: G.netDriver(), music: 'match', hub: true });
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { horizon: .46 });
    this.rigs.forEach((rg, i) => { const x = (i - 1.5) * 42; r.shadow(x, 10, 7, .3); r.actor(x, 10, 0, (g, ox, oy) => rg.draw(g, ox, oy, r.view)); });
    r.overlay(g => {
      G.logo(g, W, 8, 2);
      const info = this.info; const w = 260, x = Math.round(W / 2 - w / 2), y = 54; G.panel(g, x, y, w, 100);
      if (this.err) { G.text(g, 'Could not connect: ' + this.err, W / 2, y + 40, '#ffb0a0', { align: 'center' }); return; }
      if (!info) { G.text(g, 'Connecting to the hub...', W / 2, y + 40, '#fff', { align: 'center' }); return; }
      G.text(g, 'BEACH MATCH: ' + info.players.length + ' PLAYER' + (info.players.length > 1 ? 'S' : ''), x + 8, y + 6, '#ffd24a');
      info.players.forEach((p, i) => { px.disc(g, x + 14 + i * 60, y + 24, 5, p.color); G.text(g, (p.id === info.me ? 'YOU' : 'P' + (i + 1)), x + 22 + i * 60, y + 21, this.card.ready && this.card.ready.includes(p.id) ? '#9bffb0' : '#bfe9ee'); });
      G.text(g, 'Goal: win the match, first to 7 (win by 2).', x + 8, y + 40, '#fff'); G.text(g, 'Move ' + (G.isPad() ? 'L-stick' : 'WASD') + '   Play ' + G.label('play') + '   Dive ' + G.label('dive') + '   Call ' + G.label('call'), x + 8, y + 52, '#fff6c8');
      G.text(g, 'Empty seats are filled by CPUs.', x + 8, y + 64, '#bfe9ee');
      const left = this.card.left; G.text(g, this.state === 'starting' ? 'Get ready!' : (left !== null && left !== undefined ? 'Starting in ' + Math.max(0, Math.ceil(left / 1000)) + 's' : 'Waiting for players'), x + 8, y + 80, '#ffd24a');
      G.text(g, G.label('confirm') + ' Ready   ' + G.label('dive') + ' More time', x + w - 8, y + 80, '#fff', { align: 'right' });
    });
  }
});

/* ---- the driver: attached to the match scene ---- */
G.netDriver = () => {
  const H = G.hub; let sendT = 0, seq = 0, scene = null, lastSnap = null, finished = false;
  const driver = {
    start(sc) {
      scene = sc; G.net.remoteIn = G.net.remoteIn || {}; const m = sc.m;
      if (G.net.isHost) {
        if (H.rng) { /* match uses its own seeded stream from info.seed */ }
        G.net.onMessage = (d, from) => { if (d && d.k === 'in') { const i = (G.hub.players || []).findIndex(p => p.id === from); if (i >= 0) G.net.remoteIn[i] = { mx: +d.mx || 0, my: +d.my || 0, play: !!d.play, dive: !!d.dive, call: !!d.call, ax: +d.ax || 0, ay: +d.ay || 0 }; } };
        G.net.onLeave = e => { };
        G.net.onTimeUp = () => this.finish();
        m.cfg.net = 'host';
      } else {
        m.cfg.net = 'client'; m.netClient = true;
        G.net.onMessage = (d, from) => { if (d && d.k === 'snap') lastSnap = d; if (d && d.k === 'ev') { sc.m.events.push(d); } };
      }
    },
    stop() { G.net.onMessage = null; G.net.onTimeUp = null; },
    // called every update by the scene (after step for the host)
    tick(dt) {
      const m = scene.m; sendT += dt; if (G.net.ended) return;
      if (G.net.isHost) {
        if (sendT > 1 / 15) { sendT = 0; H.send(driver.pack(m), { reliable: false }); }
        if (m.phase === 'end' && !finished) { finished = true; this.finish(); }
      } else {
        if (sendT > 1 / 15) { sendT = 0; const p = m.players[G.seatPlayer(G.net.seat)]; if (p) H.send({ k: 'in', mx: +p.in.mx.toFixed(2), my: +p.in.my.toFixed(2), play: p.in.play, dive: p.in.dive, call: p.in.call, ax: +p.in.ax.toFixed(2), ay: +p.in.ay.toFixed(2), s: seq++ }, { reliable: false, to: H.info ? H.host : undefined }); }
        if (lastSnap) { driver.apply(m, lastSnap); lastSnap = null; }
      }
    },
    pack(m) { const b = m.ball; return { k: 'snap', t: +m.t.toFixed(2), sc: m.score, ph: m.phase, sv: m.serving, srv: m.server, msg: m.msgT > 0 ? m.msg : '', b: [+b.x.toFixed(1), +b.y.toFixed(1), +b.z.toFixed(1), b.state === 'held' ? 1 : b.state === 'dead' ? 2 : 0], tc: b.touches, lt: b.lastTeam, w: m.winner, p: m.players.map(p => [+p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1), +p.vx.toFixed(0), +p.vy.toFixed(0), p.swing ? +(p.swing.t / p.swing.dur).toFixed(2) : -1, p.diveT > 0 ? 1 : p.downT > 0 ? 2 : 0, p.celeb ? 1 : 0]), ev: m.events.splice(0).slice(-4).map(e => [e.ev, e.kind || '', e.q || 0]) }; },
    apply(m, s) {
      const b = m.ball; b.x = s.b[0]; b.y = s.b[1]; b.z = s.b[2]; b.state = s.b[3] === 1 ? 'held' : s.b[3] === 2 ? 'dead' : 'flight'; b.touches = s.tc; b.lastTeam = s.lt; b.vx = b.vy = b.vz = 0;
      m.score = s.sc.slice(); m.phase = s.ph; m.serving = s.sv; m.server = s.srv; m.winner = s.w; m.t = s.t; if (s.msg) { m.msg = s.msg; m.msgT = .5; }
      s.p.forEach((q, i) => { const p = m.players[i]; p.x = q[0]; p.y = q[1]; p.z = q[2]; p.vx = q[3]; p.vy = q[4]; p.swing = q[5] >= 0 ? { t: q[5] * .3, dur: .3, hit: true } : null; p.diveT = q[6] === 1 ? .2 : 0; p.downT = q[6] === 2 ? .2 : 0; p.celeb = q[7]; });
      for (const e of s.ev || []) { if (e[0] === 'touch') G.sfx(e[1] === 'spike' ? 'spike' : e[1] === 'serve' ? 'serve' : 'bump', { vol: .5 }); else if (e[0] === 'point') G.sfx('whistle'); }
    },
    finish() {
      if (G.net.ended || !G.net.isHost || driver.sent) return; driver.sent = true; const m = scene.m; const win = m.score[0] === m.score[1] ? null : m.score[0] > m.score[1] ? 0 : 1, ids = (H.players || []).map(p => p.id);
      const teamOf = i => (G.seatPlayer(i) < 2 ? 0 : 1); const winners = ids.filter((id, i) => win === null || teamOf(i) === win), losers = ids.filter((id, i) => !(win === null || teamOf(i) === win));
      const standings = win === null ? [ids] : [winners, losers].filter(a => a.length); const scores = {}; ids.forEach((id, i) => { scores[id] = m.score[teamOf(i)]; });
      try { H.finish({ standings, scores, won: undefined, stats: Object.fromEntries(ids.map((id, i) => [id, { Spikes: m.stats[teamOf(i)].spikes, Aces: m.stats[teamOf(i)].aces, Blocks: m.stats[teamOf(i)].blocks }])) }); } catch (e) { G.game.fail('hub.finish', e); }
    }
  };
  return driver;
};
G.hubReady = null;

/* ===== 30-vacation.js ===== */
/* 30-vacation: the calendar, slots, schedules, moods, friendship, gifts, money, partners, the story lock and saves. */
G.state = null;
G.newState = (seed = 1234) => ({
  v: 1, seed, day: 1, slot: 0, money: 2500, partner: null, tempPartner: 'mika', suit: 'coral', hat: 'none',
  aff: { mika: 25, hana: 10, gwen: 15, ruby: 0, tomo: 0, ines: 0, sonny: 5, pepper: 5 },
  owned: { suits: ['coral'], hats: ['none'] }, bag: { smoothie: 1, shell: 1 }, npcSuit: {}, talked: {}, gifted: {},
  flags: {}, results: {}, stats: { wins: 0, losses: 0, played: 0, spikes: 0, aces: 0, blocks: 0, perfects: 0, earned: 0, spent: 0, poolBest: 0, casinoNet: 0, postcards: 0 },
  album: [], schedule: {}, mood: {}, log: [], playTime: 0, ending: null, plus: 0
});
G.S = () => G.state;
G.slotName = () => G.state ? G.SLOTS[G.state.slot] : '';
G.dayInfo = () => G.DAYS[G.state.day - 1] || G.DAYS[4];
G.rngW = (day, slot, key) => E.rng(G.seedOf(G.state.seed + ':' + day + ':' + slot + ':' + key));

// where does everyone stand this slot (deterministic from the save's seed)
G.scheduleFor = (day, slot) => {
  const s = G.state, k = day + ':' + slot; if (s.schedule[k]) return s.schedule[k];
  const rn = G.rngW(day, slot, 'sched'), out = {}; const night = slot === 2;
  const spots = night ? ['pool', 'promenade', 'casino', 'courts'] : ['courts', 'pool', 'promenade', 'courts', 'pool'];
  for (const id of ['mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines', 'sonny', 'pepper']) {
    let loc = spots[Math.floor(rn() * spots.length)];
    if (id === 'sonny') loc = night ? 'casino' : 'promenade'; if (id === 'pepper') loc = night ? 'promenade' : (slot === 0 ? 'villa' : 'courts');
    if (s.partner === id && slot < 2 && rn() < .5) loc = 'courts';
    out[id] = loc;
  }
  s.schedule[k] = out; return out;
};
G.moodOf = (id, day) => {
  const s = G.state, k = id + day; if (s.mood[k]) return s.mood[k];
  const r = G.rngW(day, 0, 'mood' + id)(); return (s.mood[k] = r < .22 ? 'bad' : r > .6 ? 'great' : 'ok');
};
G.MOOD_MUL = { bad: .5, ok: 1, great: 1.5 };
G.MOOD_TXT = { bad: 'Grumpy', ok: 'Relaxed', great: 'Glowing' };
G.npcsAt = place => { const sc = G.scheduleFor(G.state.day, G.state.slot); return Object.keys(sc).filter(id => sc[id] === place && !(id === 'you')); };

/* ---- friendship ---- */
G.affinity = id => (G.state && G.state.aff[id]) || 0;
G.addAff = (id, n, why) => {
  const s = G.state; if (!s) return 0; const old = s.aff[id] || 0;
  const k = n > 0 ? n * G.MOOD_MUL[G.moodOf(id, s.day)] * G.T.affinityMul : n;
  s.aff[id] = clamp(Math.round(old + k), 0, 100); const d = s.aff[id] - old;
  if (d) { G.bus.emit('affinity', { id, d, why }); }
  return d;
};
G.chemistry = () => { const s = G.state; if (!s || !s.partner) return 0; return clamp(G.affinity(s.partner) / 100, 0, 1); };
G.hearts = id => Math.floor(G.affinity(id) / 20);
G.giftReaction = (id, gift) => {
  const c = G.CAST[id]; if (!c) return { pts: 0, line: '...' };
  const loves = c.loves || [], likes = c.likes || [], dis = c.dislikes || []; let mul = 1, line;
  if (loves.includes(gift.cat)) { mul = 1.8; line = G.rpick(['Oh! You remembered!', 'This is perfect! How did you know?!', 'I love it! Truly! Strongly!'], 'cosmetic'); }
  else if (likes.includes(gift.cat)) { mul = 1.1; line = G.rpick(['Nice! Thank you.', 'That is thoughtful. I like it.'], 'cosmetic'); }
  else if (dis.includes(gift.cat)) { mul = -.6; line = G.rpick(['...Is this a joke?', 'Hm. Not really my thing.', 'I will pretend I like it.'], 'cosmetic'); }
  else { mul = .8; line = G.rpick(['Thanks, I guess!', 'Oh. A gift. Yes.'], 'cosmetic'); }
  return { pts: Math.round(gift.pts * mul), line, loved: mul > 1.5, bad: mul < 0 };
};
G.giveGift = (id, giftId) => {
  const s = G.state, gift = G.GIFTS.find(x => x.id === giftId); if (!gift || !(s.bag[giftId] > 0)) return null;
  const k = id + ':' + s.day; if ((s.gifted[k] || 0) >= 2) return { refused: true, line: 'You have already been very generous today. Save some for tomorrow!' };
  s.bag[giftId]--; if (!s.bag[giftId]) delete s.bag[giftId]; s.gifted[k] = (s.gifted[k] || 0) + 1;
  const rx = G.giftReaction(id, gift), d = rx.pts >= 0 ? G.addAff(id, rx.pts, 'gift') : G.addAff(id, rx.pts, 'gift');
  G.bus.emit('gift', { id, gift, d }); G.sfx(rx.bad ? 'cancel' : 'gift');
  return Object.assign({ d }, rx);
};
G.chat = id => {
  const s = G.state, k = id + ':' + s.day + ':' + s.slot; if (s.talked[k]) return { line: G.rpick(['We just talked! Give me a minute to think of something new.', 'Ha, again? Okay, but later.'], 'cosmetic'), d: 0 };
  s.talked[k] = 1; const d = G.addAff(id, 3, 'chat');
  const c = G.CAST[id], pools = {
    mika: ['I believe in the power of one more rep. Also smoothies.', 'Did you see my last spike? Neither did I, it was too fast.', 'Teamwork! That means you do the setting. Kidding. Mostly.'],
    hana: ['I am not hiding. I am... situationally unseen.', 'Sunscreen is a tool. Like a kunai. A greasy kunai.', 'The ocean is loud. I like it. It covers my footsteps.'],
    gwen: ['I do not "do" fun. This is statistics.', 'Pineapples are structurally honest.', 'If I say "fine", it was not fine. It was fine. Whichever.'],
    ruby: ['RUBY DELACROIX DOES NOT LOSE! SHE JUST ARRIVES LATE TO VICTORY!', 'My entrance theme is a trombone. I am the trombone.'],
    tomo: ['Sorry! Stretching! Hi!', 'I tried to stand still once. It was tuesday. Did not like it.'],
    ines: ['Your footwork is... interesting. Do it again, but with feeling.', 'Every rally is a duet. Some of us just forget to hum.'],
    sonny: ['The house always wins. Which is why I own the house. And the island. And this shirt.', 'Ask me about my casino. Or do not. I will tell you anyway.'],
    pepper: ['Please remember your sunscreen.', 'I have seen things. Mostly receipts.']
  };
  return { line: G.rpick(pools[id] || ['Nice weather.'], 'cosmetic'), d };
};
G.canTeamUp = id => G.PARTNERS.includes(id) && G.affinity(id) >= 30 && G.state.partner !== id;
G.setPartner = id => { G.state.partner = id; G.state.aff[id] = Math.max(G.state.aff[id] || 0, 30); G.toast('New partner: ' + G.CAST[id].name, '#9bffb0'); G.bus.emit('story', { ev: 'partner', id }); };

/* ---- money ---- */
G.earn = n => { const s = G.state, v = Math.round(n); s.money += v; if (v > 0) s.stats.earned += v; G.bus.emit('purchase', { earn: v }); return v; };
G.spend = n => { const s = G.state; if (s.money < n) return false; s.money -= n; s.stats.spent += n; G.sfx('buy'); G.bus.emit('purchase', { spend: n }); return true; };
G.buySuit = id => { const s = G.state, it = G.SUITS.find(x => x.id === id); if (!it || s.owned.suits.includes(id) || !G.spend(it.price)) return false; s.owned.suits.push(id); return true; };
G.buyHat = id => { const s = G.state, it = G.HATS.find(x => x.id === id); if (!it || s.owned.hats.includes(id) || !G.spend(it.price)) return false; s.owned.hats.push(id); return true; };
G.buyGift = id => { const s = G.state, it = G.GIFTS.find(x => x.id === id); if (!it || !G.spend(it.price)) return false; s.bag[id] = (s.bag[id] || 0) + 1; return true; };
G.giftNpcSuit = (id, suitId) => { G.state.npcSuit[id] = suitId; };

/* ---- the calendar ---- */
G.storyKey = () => { const s = G.state; return G.STORY_SLOTS[s.day + ':' + s.slot] || null; };
G.endSlot = () => {
  const s = G.state; G.bus.emit('slotEnd', { day: s.day, slot: s.slot });
  s.slot++;
  if (s.slot > 2) { s.slot = 0; G.bus.emit('dayEnd', { day: s.day }); s.day++; return 'newday'; }
  return 'slot';
};
G.timeOfDay = () => ['morning', 'afternoon', 'night'][G.state ? G.state.slot : 1];
G.finished = () => G.state && G.state.day > 5;

/* ---- opponents for each story match ---- */
G.storyMatch = key => {
  const s = G.state, partner = s.partner || s.tempPartner || 'mika';
  const mine = ['you', partner];
  const base = { teams: [mine, ['ruby', 'tomo']], chem: [G.chemistry() || .2, 0], skipIntro: false };
  switch (key) {
    case 'welcome': return Object.assign(base, { teams: [['you', 'mika'], ['sonny', 'pepper']], to: 5, skillBonus: [0, -.25], chem: [.3, 0], tutorial: true });
    case 'qualifier': return Object.assign(base, { teams: [mine, ['ruby', 'tomo']], to: 7, skillBonus: [0, -.1] });
    case 'semifinal': { const other = G.PARTNERS.find(x => x !== partner) || 'gwen'; return Object.assign(base, { teams: [mine, ['ines', other]], to: 7, skillBonus: [0, .05] }); }
    case 'final': return Object.assign(base, { teams: [mine, ['sonny', 'pepper']], to: 9, house: true, skillBonus: [0, .15] });
    default: return base;
  }
};

/* ---- saves: the engine's three slots + autosave ---- */
G.saveBlob = () => { const s = G.state; return { data: JSON.parse(JSON.stringify(s)), place: 'Day ' + s.day + ' · ' + G.SLOTS[Math.min(2, s.slot)], level: 'Day ' + Math.min(5, s.day) }; };
G.loadBlob = save => {
  const d = save && save.data ? save.data : save; if (!d) return false;
  G.state = Object.assign(G.newState(d.seed), d); G.reseedWorld(); return true;
};
G.reseedWorld = () => { const s = G.state; G.reseed('world', s.seed); G.reseed('casino', s.seed + 99); };
G.autosave = () => { try { if (G.state && !G.hub) { G.game.saves.autosave(); } } catch (e) { /* storage blocked */ } };
G.installSaves = game => {
  game.saves.write = () => G.saveBlob();
  game.saves.read = save => { if (G.loadBlob(save)) { G.game.go('map'); } };
  try { game.saves.canSave = true; } catch (e) { /* getter only */ }
};

/* ---- finishing the match in story mode ---- */
G.afterStoryMatch = (key, res) => {
  const s = G.state, win = res.winner === 0, st = res.stats[0];
  s.stats.played++; if (win) s.stats.wins++; else s.stats.losses++; s.stats.spikes += st.spikes; s.stats.aces += st.aces; s.stats.blocks += st.blocks; s.stats.perfects += st.perfect;
  const prize = key === 'final' ? (win ? 8000 : 2500) : key === 'semifinal' ? (win ? 3000 : 800) : key === 'qualifier' ? (win ? 1800 : 600) : key === 'welcome' ? 500 : (win ? 700 : 250);
  const got = G.earn(prize * G.T.moneyMul); s.results[key] = win ? 'win' : 'loss';
  if (s.partner || s.tempPartner) { const pid = s.partner || s.tempPartner; G.addAff(pid, win ? 6 : 2, 'match'); }
  return { got, win };
};

/* ===== 31-map.js ===== */
/* 31-map: the island map. Pick where to spend the slot. Also the HUD for day, time, money and weather. */
G.hudTop = (r, extra) => {
  const s = G.state; if (!s) return;
  r.overlay(g => {
    const di = G.dayInfo(), w = 200, x = 4, y = 3;
    E.ui.box(g, x, y, w, 15, { bg: ['#0e2a38', '#061620'], border: '#ffd36a', alpha: .92 });
    G.text(g, 'DAY ' + Math.min(5, s.day) + '  ' + G.SLOTS[Math.min(2, s.slot)].toUpperCase(), x + 5, y + 4, '#ffd24a');
    G.text(g, ({ sunny: 'Sunny', cloudy: 'Cloudy' })[di.weather] || 'Sunny', x + 98, y + 4, '#bfe9ee');
    G.text(g, G.fmtMoney(s.money), x + w - 5, y + 4, '#9bffb0', { align: 'right' });
    if (s.partner) { E.ui.box(g, x, y + 17, w, 13, { bg: ['#0e2a38', '#061620'], border: '#ff6a8a', alpha: .9 }); G.text(g, 'Partner ' + G.CAST[s.partner].name, x + 5, y + 20, '#ffd0dc'); G.text(g, '♥'.repeat(G.hearts(s.partner)) + '•'.repeat(5 - G.hearts(s.partner)), x + w - 5, y + 20, '#ff6a8a', { align: 'right' }); }
    if (extra) extra(g);
  });
};

G.scenes.map = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'map', pausable: true,
  enter() {
    this.t = 0; G.music('promenade'); G.game.focus(0, 0, 14); G.game.lights.enabled = false;
    const s = G.state; this.story = null; this.sp = null; this.nav = null;
    const key = G.storyKey(); if (key && !s.flags['done:' + s.day + ':' + s.slot]) { this.story = key; return; }
    this.build(); this.hint = null;
  },
  build() {
    const W = G.game.W, H = G.game.H, s = G.state, night = s.slot === 2;
    const nodes = Object.values(G.PLACES).map(p => ({ id: p.id, x: Math.round(p.mx * W), y: Math.round(24 + p.my * (H - 70)), w: 74, h: 18, label: p.name, p, disabled: p.night && !night, onPick: n => { G.game.go('location', { loc: n.id }); } }));
    const by = H - 18, bx = [Math.round(W * .3), Math.round(W * .5), Math.round(W * .7)];
    nodes.push({ id: 'journal', x: bx[0], y: by, w: 70, h: 14, label: 'Journal', btn: true, onPick: () => G.game.go('journal', { back: 'map' }) });
    nodes.push({ id: 'album', x: bx[1], y: by, w: 70, h: 14, label: 'Postcards', btn: true, onPick: () => G.game.go('album', { back: 'map' }) });
    nodes.push({ id: 'save', x: bx[2], y: by, w: 70, h: 14, label: 'Save', btn: true, onPick: () => G.game.saves.show('save') });
    this.nav = new G.NodeNav(nodes, { start: 2 });
  },
  update(dt) {
    this.t += dt;
    if (this.story) { const k = this.story; this.story = null; G.runStory(k); return; }
    if (!this.nav) return; this.nav.update(dt);
    if (G.game.input.pressed('photo')) G.openPhoto && G.openPhoto('Isla Fortuna');
  },
  draw(r) {
    const W = r.W, H = r.H, g = r.tgt, s = G.state, t = this.t, night = s && s.slot === 2;
    // sea
    px.rect(g, 0, 0, W, H, night ? '#0a2a5a' : '#2a98d0');
    for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, night ? '#0c3068' : ((y / 3 & 1) ? '#2a9ad4' : '#38aadc'));
    for (let i = 0; i < 40; i++) { const x = (i * 53 + Math.floor(t * 10 + i * 7)) % W, y = (i * 37) % H; px.rect(g, x, y, 6, 1, night ? '#1c4a8a' : '#bfeefc'); }
    // island: layered blobs
    const blob = (cx, cy, rx, ry, c) => { const pts = []; for (let a = 0; a < 28; a++) { const an = a / 28 * TAU, wob = 1 + .08 * Math.sin(an * 5 + 1) + .05 * Math.sin(an * 3); pts.push([cx + Math.cos(an) * rx * wob, cy + Math.sin(an) * ry * wob]); } px.poly(g, pts, c); };
    blob(W * .5, H * .5, W * .46, H * .4, night ? '#10304a' : '#d8f4f8'); blob(W * .5, H * .5, W * .44, H * .38, night ? '#2a3a4a' : '#f2d79a'); blob(W * .5, H * .5, W * .36, H * .3, night ? '#123a2a' : '#4fb860'); blob(W * .5, H * .46, W * .22, H * .16, night ? '#0e2e20' : '#3a9a4a');
    blob(W * .5, H * .36, 20, 14, night ? '#4a4a5a' : '#8a8a96');
    // buildings and paths drawn per place
    const n = this.nav; if (!n) return;
    for (const nd of n.nodes) {
      if (nd.btn) continue;
      px.rect(g, nd.x - 2, nd.y - 2, 4, 4, '#ffd36a');
    }
    r.overlay(gg => {
      for (let i = 0; i < n.nodes.length; i++) {
        const nd = n.nodes[i], sel = i === n.i, x = nd.x - nd.w / 2, y = nd.y - nd.h / 2;
        const dis = nd.disabled;
        if (nd.btn) { E.ui.box(gg, x, y, nd.w, nd.h, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .9 }); G.text(gg, nd.label, nd.x, y + 4, '#fff', { align: 'center' }); continue; }
        E.ui.box(gg, x, y, nd.w, nd.h, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: dis ? ['#2a3a44', '#16222a'] : ['#1b4a5a', '#0b2430'], border: dis ? '#4a5a64' : '#ffd36a', alpha: .95 });
        G.text(gg, nd.label, nd.x, y + 5, dis ? '#7a8a94' : '#fff', { align: 'center' });
        // who is there
        if (!dis) { const who = G.npcsAt(nd.id); who.slice(0, 5).forEach((id, k) => { px.disc(gg, Math.round(x + 6 + k * 8), Math.round(y + nd.h + 5), 3, G.CAST[id].cloth); px.disc(gg, Math.round(x + 6 + k * 8), Math.round(y + nd.h + 5), 1, '#ffffff66'); }); }
        if (sel) { const p = nd.p, w = 200, bx = Math.round(clamp(nd.x - w / 2, 4, W - w - 4)), by = nd.y > H / 2 ? Math.round(nd.y - 56) : Math.round(nd.y + 26); G.panel(gg, bx, by, w, 28); G.text(gg, p.blurb, bx + 6, by + 5, '#fff6c8'); G.text(gg, dis ? 'Opens at night.' : G.npcsAt(nd.id).map(id => G.CAST[id].name).join(', ') || 'Quiet right now.', bx + 6, by + 16, dis ? '#ffb0a0' : '#bfe9ee'); }
      }
      E.font.title(gg, 'ISLA FORTUNA', W / 2, 20, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'] });
    });
    G.hudTop(r);
    G.drawPrompts(r, [['confirm', 'Go'], ['photo', 'Postcard'], ['pause', 'Menu']]);
  }
});

/* ===== 32-location.js ===== */
/* 32-location: the walkable places. Walk with the stick, WASD or by clicking; talk to people, use the things. */
const quad = (r, x0, y0, x1, y1, c, z = 0) => px.poly(r.tgt, [r.w(x0, y0, z), r.w(x1, y0, z), r.w(x1, y1, z), r.w(x0, y1, z)], c);
const solidBox = (r, x, y, w, d, h, top, side, light) => r.queue(x, y + d / 2, 0, g => { r.box(g, x - w / 2, y - d / 2, 0, x + w / 2, y + d / 2, h, top, side); });
const lineQ = (r, a, b, c = '#ffffff', w = 1) => { const p = r.w(a[0], a[1], a[2] || 0), q = r.w(b[0], b[1], b[2] || 0); px.line(r.tgt, Math.round(p[0]), Math.round(p[1]), Math.round(q[0]), Math.round(q[1]), c, w); };

G.LOCS = {
  courts: {
    name: 'Sunset Courts', hw: 170, hh: 100, start: [0, 70], music: 'beach',
    spots: [[-80, 20], [-30, 52], [50, 52], [100, 10], [-120, 60], [130, 60]],
    hot: [{ id: 'net', x: 0, y: 36, label: 'Play volleyball', kind: 'court' }, { id: 'exit', x: 150, y: 88, label: 'Island map', kind: 'exit' }, { id: 'board', x: -140, y: 80, label: 'Scoreboard', kind: 'board' }],
    scenery(r, t, night) {
      quad(r, -170, -100, 170, 100, night ? '#7a6a5a' : '#f4dca0');
      quad(r, -75, -34, 75, 34, night ? '#8a7a6a' : '#fbe9b8');
      const L = night ? '#cbd5ff' : '#ffffff'; lineQ(r, [-75, -34], [75, -34], L); lineQ(r, [-75, 34], [75, 34], L); lineQ(r, [-75, -34], [-75, 34], L); lineQ(r, [75, -34], [75, 34], L); lineQ(r, [0, -34], [0, 34], L);
      for (const sy of [-38, 38]) r.queue(0, sy, 0, g => { const [x0, y0] = r.w(0, sy, 0), [x1, y1] = r.w(0, sy, 24); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#d8d8e0', 2); });
      r.queue(0, 0, 24, g => { const [x0, y0] = r.w(0, -38, 24), [x1, y1] = r.w(0, 38, 24); px.line(g, Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), '#ffffff', 2); });
      r.prop('palm', -150, -86, 0, { size: 1.5 }); r.prop('palm', 150, -88, 0, { size: 1.6 }); r.prop('palm', -158, 40, 0, { size: 1.3 }); r.prop('sign', -140, 80, 0, { size: 1.1 });
      solidBox(r, -100, -76, 60, 10, 10, '#c8a060', '#8a6a3a'); solidBox(r, 100, -76, 60, 10, 10, '#c8a060', '#8a6a3a');
    }
  },
  pool: {
    name: 'Lagoon Pool', hw: 170, hh: 100, start: [0, 80], music: 'pool',
    spots: [[-130, 60], [-60, 66], [60, 66], [120, 30], [130, -50], [-130, -50]],
    hot: [{ id: 'hop', x: -20, y: 52, label: 'Pool Hop', kind: 'poolhop' }, { id: 'lounge', x: 110, y: -10, label: 'Poolside chat', kind: 'lounge' }, { id: 'exit', x: 0, y: 92, label: 'Island map', kind: 'exit' }],
    scenery(r, t, night) {
      quad(r, -170, -100, 170, 100, night ? '#4a5a6a' : '#e8e0d0');
      for (let x = -170; x < 170; x += 20) for (let y = -100; y < 100; y += 20) if (((x + y) / 20) & 1) quad(r, x, y, x + 20, y + 20, night ? '#44525e' : '#dcd2c0');
      quad(r, -120, -60, 50, 44, night ? '#0a3a5a' : '#2ab8e0');
      for (let i = 0; i < 24; i++) { const x = -112 + (i * 37) % 160, y = -54 + (i * 53) % 92; lineQ(r, [x, y], [x + 6 + (i & 3), y], night ? '#1a5a8a' : '#aef0ff'); }
      for (const [x, y] of [[-90, -20], [-40, 10], [0, -30], [20, 20]]) r.queue(x, y, 0, g => { const [sx, sy] = r.w(x, y, 0.5); px.ell ? px.ell(g, Math.round(sx), Math.round(sy), 6, 3, '#3fb860') : px.disc(g, Math.round(sx), Math.round(sy), 4, '#3fb860'); px.dot(g, Math.round(sx) + 2, Math.round(sy) - 1, '#ff8ac8'); });
      r.prop('palm', -150, -86, 0, { size: 1.6 }); r.prop('palm', 150, -80, 0, { size: 1.5 }); r.prop('bush', 150, 70, 0, { size: 1.2 }); r.prop('flowers', -150, 80, 0, { size: 1.2 });
      for (const [x, y] of [[100, -30], [120, -30], [100, 10]]) solidBox(r, x, y, 12, 24, 5, '#ffffff', '#e84a6a');
    }
  },
  promenade: {
    name: 'Fortuna Promenade', hw: 190, hh: 100, start: [0, 70], music: 'promenade',
    spots: [[-60, 40], [30, 50], [90, 45], [150, 40], [-150, 50], [10, -10]],
    hot: [{ id: 'suits', x: -100, y: -52, label: 'Swimsuit Boutique', kind: 'shopSuit' }, { id: 'gifts', x: 0, y: -52, label: 'Gift Kiosk', kind: 'shopGift' }, { id: 'hats', x: 100, y: -52, label: 'Hat Stand', kind: 'shopHat' }, { id: 'smoothie', x: 150, y: 30, label: 'Smoothie Bar: hang out', kind: 'hang' }, { id: 'exit', x: 0, y: 92, label: 'Island map', kind: 'exit' }, { id: 'statue', x: -150, y: 20, label: 'Sonny statue', kind: 'statue' }],
    scenery(r, t, night) {
      quad(r, -190, -100, 190, 100, night ? '#4a4a5a' : '#e8d8b8'); quad(r, -190, -10, 190, 60, night ? '#3a3a4a' : '#c8b898');
      for (let x = -190; x < 190; x += 24) lineQ(r, [x, -10], [x, 60], night ? '#333344' : '#b8a888');
      for (const [x, c, n] of [[-100, '#ff6a8a', 'suits'], [0, '#ffcf33', 'gifts'], [100, '#3ab0ff', 'hats']]) { solidBox(r, x, -70, 56, 14, 36, '#fff8e8', '#e0cfa8'); r.prop('awning', x, -58, 24, { size: 1.5, color: c }); solidBox(r, x, -50, 40, 6, 10, c, '#8a6a4a'); void n; }
      solidBox(r, 150, 20, 30, 10, 14, '#ffcf33', '#c8962a'); r.prop('awning', 150, 14, 24, { size: 1.1, color: '#ff6a5a' });
      r.prop('statue', -150, 10, 0, { size: 1.5 }); r.prop('streetlamp', -60, 20, 0, { size: 1.3, light: true }); r.prop('streetlamp', 60, 20, 0, { size: 1.3, light: true }); r.prop('palm', -170, -80, 0, { size: 1.6 }); r.prop('palm', 170, -80, 0, { size: 1.6 }); r.prop('bush', 170, 80, 0, { size: 1.2 });
    }
  },
  villa: {
    name: 'Your Villa', hw: 120, hh: 80, start: [0, 50], music: 'villa',
    spots: [[-50, 20], [50, 20], [0, -10], [80, 40], [-80, 40], [0, 30]],
    hot: [{ id: 'bed', x: -70, y: -30, label: 'Nap', kind: 'nap' }, { id: 'wardrobe', x: 0, y: -48, label: 'Wardrobe', kind: 'wardrobe' }, { id: 'desk', x: 80, y: -30, label: 'Writing desk', kind: 'desk' }, { id: 'mirror', x: -30, y: -48, label: 'Mirror: postcard', kind: 'mirror' }, { id: 'exit', x: 0, y: 70, label: 'Island map', kind: 'exit' }],
    scenery(r, t, night) {
      quad(r, -120, -80, 120, 80, night ? '#5a3a2a' : '#c89860'); for (let x = -120; x < 120; x += 16) lineQ(r, [x, -80], [x, 80], night ? '#4a2a1a' : '#a87840');
      solidBox(r, -70, -48, 40, 28, 12, '#ffffff', '#d8a0b0'); solidBox(r, -70, -60, 40, 6, 22, '#8a5a3a', '#6a3a22');
      solidBox(r, 0, -62, 36, 10, 40, '#6a4a3a', '#4a2a1a'); solidBox(r, 80, -48, 34, 18, 12, '#8a5a3a', '#6a3a22'); solidBox(r, -30, -66, 18, 4, 34, '#bfe9ee', '#8a6a4a');
      r.prop('flowers', 100, 40, 0, { size: 1.2 }); r.prop('lantern', 80, -52, 12, { size: 1, light: true }); r.prop('window', 50, -76, 8, { size: 1.3, colors: ['#8ad8ff'] });
    }
  },
  casino: {
    name: 'Casino Fortuna', hw: 160, hh: 100, start: [0, 80], music: 'casino',
    spots: [[-50, 10], [10, 30], [70, 30], [120, 10], [-110, 40], [0, -10]],
    hot: [{ id: 'slots', x: -90, y: -40, label: 'Fortuna Sevens', kind: 'slots' }, { id: 'bj', x: 10, y: -10, label: 'Blackjack', kind: 'bj' }, { id: 'roulette', x: 100, y: -10, label: 'Roulette', kind: 'roulette' }, { id: 'cashier', x: 120, y: 60, label: 'Cashier', kind: 'cashier' }, { id: 'exit', x: -140, y: 88, label: 'Leave the casino', kind: 'exit' }],
    scenery(r, t, night) {
      quad(r, -160, -100, 160, 100, '#6a1a3a'); for (let x = -160; x < 160; x += 20) for (let y = -100; y < 100; y += 20) if (((x + y) / 20) & 1) quad(r, x, y, x + 20, y + 20, '#5a1430');
      for (let i = 0; i < 4; i++) { const x = -120 + i * 24, c = ['#ff4f6a', '#ffd24a', '#3ab0ff', '#9be060'][(i + Math.floor(t * 4)) & 3]; solidBox(r, x, -60, 14, 12, 26, '#2a2a4a', '#1a1a3a'); r.queue(x, -52, 22, g => { const [sx, sy] = r.w(x, -52, 22); px.rect(g, Math.round(sx) - 4, Math.round(sy), 8, 5, c); }, { emissive: true }); }
      solidBox(r, 10, -10, 40, 22, 12, '#1a7a4a', '#5a3a1a'); r.queue(100, -10, 0, g => { const [sx, sy] = r.w(100, -10, 12); px.disc(g, Math.round(sx), Math.round(sy), 16, '#2a1a1a'); px.disc(g, Math.round(sx), Math.round(sy), 12, '#1a7a4a'); }, { bias: 1 });
      solidBox(r, 120, 76, 40, 12, 14, '#c8962a', '#8a6a1a'); r.prop('pillar', -150, -80, 0, { size: 1.4 }); r.prop('pillar', 150, -80, 0, { size: 1.4 }); r.prop('candelabra', 60, -70, 0, { size: 1.3, light: true }); r.prop('candelabra', -60, -80, 0, { size: 1.3, light: true });
    }
  }
};

G.scenes.location = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'location', pausable: true,
  enter(d) {
    const L = G.LOCS[d.loc]; this.d = d; this.loc = L; this.id = d.loc; this.t = 0; const s = G.state;
    this.me = { x: L.start[0], y: L.start[1], vx: 0, vy: 0, face: -Math.PI / 2 };
    this.rig = G.rigOf('you', 1.0); this.sp = new G.Speech(); this.menu = null; this.menuTitle = ''; this.sel = null; this.target = null; this.lastPtr = null; this.bubble = null;
    G.locState = G.locState && G.locState.key === s.day + ':' + s.slot ? G.locState : { key: s.day + ':' + s.slot, spent: false };
    this.npcs = G.npcsAt(d.loc).map((id, i) => ({ id, x: L.spots[i % L.spots.length][0], y: L.spots[i % L.spots.length][1], rig: G.rigOf(id, 1.0), ph: i * 1.7, face: Math.PI / 2 }));
    G.music(L.music || 'promenade'); G.game.follow(null); G.game.focus(this.me.x, this.me.y, 10);
    const night = s.slot === 2; G.game.lights.enabled = night; G.game.lights.ambient = night ? .42 : 1;
    this.night = night;
    G.game.weather = null; this.cam = [this.me.x, this.me.y]; this.pend = null; G.game.setZoom && G.game.setZoom(.62);
    if (d.after) { this.sp.play(d.after, () => { }); }
  },
  exit() { G.game.lights.enabled = false; G.game.setZoom && G.game.setZoom(1); },
  worldPoint(n) { return n.hot ? [n.x, n.y] : [n.x, n.y]; },
  entities() { return this.npcs.map(n => ({ kind: 'npc', n, x: n.x, y: n.y, label: G.CAST[n.id].name })).concat(this.loc.hot.map(h => ({ kind: 'hot', h, x: h.x, y: h.y, label: h.label, disabled: false }))); },
  spendSlot() { G.locState.spent = true; },
  leave() { const sp = G.locState.spent; G.locState = null; if (sp) G.finishSlot(); else G.game.go('map'); },
  openMenu(title, items, cancel) { this.menu = new G.Menu(items, { y: 70, w: 190, gap: 15, onCancel: cancel || (() => { this.menu = null; }) }); this.menuTitle = title; },
  say(lines, done) { this.sp.play(lines, done); },
  /* ---------- interactions ---------- */
  interact(e) {
    if (e.kind === 'npc') return this.talkMenu(e.n);
    const k = e.h.kind, s = G.state;
    switch (k) {
      case 'exit': this.leave(); break;
      case 'court': this.courtMenu(); break;
      case 'poolhop': this.openMenu('POOL HOP', [{ label: 'Hop for prizes (uses the slot)', onPick: () => { this.menu = null; G.game.go('poolhop', { done: sc => { const m = Math.round(sc.money * G.T.moneyMul); G.earn(m); s.stats.poolBest = Math.max(s.stats.poolBest, sc.score); const pid = s.partner || s.tempPartner; if (pid && G.npcsAt('pool').includes(pid)) G.addAff(pid, 5, 'poolhop'); this.spendSlot(); G.finishSlot(); }, quit: () => G.game.go('location', { loc: 'pool' }) }); } }, { label: 'How to play', onPick: () => { this.menu = null; this.say([['PEPPER', 'Hop from lily pad to lily pad on the beat. Press ' + G.label('confirm') + ' when the ring closes. Misses are damp.']]); } }, { label: 'Back', onPick: () => { this.menu = null; } }]); break;
      case 'lounge': { const who = G.npcsAt(this.id).filter(i => i !== 'sonny'); if (!who.length) { this.say([['PEPPER', 'The loungers are empty. Disappointingly relaxing.']]); break; } this.openMenu('CHAT POOLSIDE (uses the slot)', who.map(id => ({ label: G.CAST[id].name, onPick: () => { this.menu = null; const d = G.addAff(id, 7, 'lounge'); this.say([[G.CAST[id].name, 'Ahh. Warm water, no brawling. Thanks for sitting with me.'], ['PEPPER', G.CAST[id].name + ' liked that. (+' + d + ')']], () => { this.spendSlot(); G.finishSlot(); }); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }])); break; }
      case 'hang': { const who = G.npcsAt(this.id).filter(i => i !== 'sonny' && i !== 'pepper'); if (!who.length) { this.say([['PEPPER', 'Nobody to stroll with. The smoothie machine is lonely.']]); break; } this.openMenu('SMOOTHIE STROLL (uses the slot)', who.map(id => ({ label: G.CAST[id].name, onPick: () => { this.menu = null; const gift = G.GIFTS[0]; const rx = G.giftReaction(id, gift), d = G.addAff(id, Math.max(3, rx.pts + 2), 'hang'); this.say([[G.CAST[id].name, rx.line], ['PEPPER', 'Smoothie stroll: ' + G.CAST[id].name + ' ' + (d >= 0 ? '+' : '') + d]], () => { this.spendSlot(); G.finishSlot(); }); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }])); break; }
      case 'shopSuit': G.game.go('shop', { kind: 'suit', back: this.id }); break;
      case 'shopGift': G.game.go('shop', { kind: 'gift', back: this.id }); break;
      case 'shopHat': G.game.go('shop', { kind: 'hat', back: this.id }); break;
      case 'statue': this.say([['SONNY', 'This statue is a tribute to my humility. It is eleven metres tall.'], ['PEPPER', 'It is four metres tall, sir.']]); break;
      case 'board': this.say([['PEPPER', 'Season record: ' + s.stats.wins + ' wins, ' + s.stats.losses + ' losses. Spikes ' + s.stats.spikes + ', aces ' + s.stats.aces + ', blocks ' + s.stats.blocks + '.']]); break;
      case 'nap': this.openMenu('NAP (uses the slot)', [{ label: 'Sleep through it', onPick: () => { this.menu = null; if (s.partner) G.addAff(s.partner, -1, 'neglect'); this.say([['JO', 'Zzz. Mmm. Seagulls. Zzz.']], () => { this.spendSlot(); G.finishSlot(); }); } }, { label: 'Not now', onPick: () => { this.menu = null; } }]); break;
      case 'wardrobe': G.game.go('wardrobe', { back: this.id }); break;
      case 'desk': this.openMenu('WRITING DESK', [{ label: 'Save game', onPick: () => { this.menu = null; G.game.saves.show('save'); } }, { label: 'Load game', onPick: () => { this.menu = null; G.game.saves.show('load'); } }, { label: 'Journal', onPick: () => { G.game.go('journal', { back: this.id }); } }, { label: 'Postcard album', onPick: () => { G.game.go('album', { back: this.id }); } }, { label: 'Back', onPick: () => { this.menu = null; } }]); break;
      case 'mirror': if (G.openPhoto) G.openPhoto('Your Villa'); break;
      case 'cashier': this.say([['SONNY', 'The cashier cheerfully swaps your S$ for fun. There is no chip conversion: your wallet IS your stack. Cash is king!']]); break;
      case 'slots': case 'bj': case 'roulette': this.spendSlot(); G.game.go('casino', { game: k, back: this.id }); break;
      default: break;
    }
  },
  courtMenu() {
    const s = G.state, pid = s.partner || s.tempPartner;
    const go = (hard) => { this.menu = null; const rivals = [['ruby', 'tomo'], ['ines', 'hana'], ['tomo', 'ines'], ['ruby', 'gwen']]; const rv = rivals[(s.day + s.slot + (hard ? 1 : 0)) % rivals.length].filter(i => i !== pid);
      const opp = rv.length < 2 ? [rv[0], 'tomo'] : rv; const cfg = { teams: [['you', pid], opp], chem: [G.chemistry() || .3, 0], to: hard ? 9 : 7, skillBonus: [0, hard ? .2 : -.05] };
      G.game.go('match', { cfg, humanTeam: 0, rematch: false, noQuit: true, onEnd: res => { const out = G.afterStoryMatch(hard ? 'challenge' : 'practice', res); this.spendSlot(); G.cutscene([['PEPPER', (res.winner === 0 ? 'A win. ' : 'A loss. ') + 'Prize: ' + G.fmtMoney(out.got) + '. ' + (pid ? G.CAST[pid].name + ' ' + (res.winner === 0 ? 'high-fives you.' : 'pretends not to be disappointed.') : '')]], [pid], () => G.finishSlot(), { bg: 'beach' }); } }); };
    if (!pid) { this.say([['PEPPER', 'You need a partner first. Finish the welcome match.']]); return; }
    this.openMenu('SUNSET COURTS (uses the slot)', [{ label: 'Practice match with ' + G.CAST[pid].name, onPick: () => go(false) }, { label: 'Challenge match (tougher, bigger prize)', onPick: () => go(true) }, { label: 'Back', onPick: () => { this.menu = null; } }]);
  },
  talkMenu(n) {
    const id = n.id, c = G.CAST[id], s = G.state; const items = [];
    items.push({ label: 'Chat', onPick: () => { this.menu = null; const r = G.chat(id); this.say([[c.name, r.line]].concat(r.d ? [['PEPPER', c.name + ' warmed up to you. (+' + r.d + ')']] : []), () => { }); } });
    items.push({ label: 'Give a gift', onPick: () => { this.giftMenu(id); } });
    if (s.owned.suits.length > 1 && id !== 'sonny' && id !== 'pepper') items.push({ label: 'Give a swimsuit', onPick: () => { this.suitMenu(id); } });
    if (G.PARTNERS.includes(id)) items.push({ label: s.partner === id ? 'Your partner' : 'Ask to team up', disabled: s.partner === id, onPick: () => { this.menu = null; if (G.canTeamUp(id)) { G.setPartner(id); this.say([[c.name, 'Partners? ...Okay. Yes. Do not make this weird.']]); } else this.say([[c.name, 'Hm. Maybe when we know each other better. (Friendship 30 needed)']]); } });
    items.push({ label: 'About ' + c.name, onPick: () => { this.menu = null; this.say([[c.name, c.full + '. ' + c.style + '.'], ['PEPPER', c.bio + ' Mood today: ' + G.MOOD_TXT[G.moodOf(id, s.day)] + '. Friendship ' + G.affinity(id) + '/100.']]); } });
    items.push({ label: 'Back', onPick: () => { this.menu = null; } });
    this.openMenu(c.name + '  ' + '♥'.repeat(G.hearts(id)) + '  ' + G.MOOD_TXT[G.moodOf(id, s.day)], items);
  },
  giftMenu(id) {
    const s = G.state, have = G.GIFTS.filter(g => s.bag[g.id] > 0);
    if (!have.length) { this.menu = null; this.say([['PEPPER', 'Your gift bag is empty. The Gift Kiosk on the Promenade has smoothies, charms and dice.']]); return; }
    this.openMenu('GIVE TO ' + G.CAST[id].name, have.map(g => ({ label: g.name, value: 'x' + s.bag[g.id], onPick: () => { this.menu = null; const r = G.giveGift(id, g.id); if (!r) return; s.known = s.known || {}; (s.known[id] = s.known[id] || {})[g.cat] = r.bad ? 'dislike' : r.loved ? 'love' : 'like'; this.say([[G.CAST[id].name, r.line]].concat(r.refused ? [] : [['PEPPER', (r.d >= 0 ? '+' : '') + r.d + ' friendship.']]), () => { }); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }]), () => this.talkMenu(this.npcs.find(n => n.id === id)));
  },
  suitMenu(id) {
    const s = G.state, list = G.SUITS.filter(x => s.owned.suits.includes(x.id) && x.id !== s.suit && x.id !== s.npcSuit[id]);
    if (!list.length) { this.menu = null; this.say([['PEPPER', 'No spare swimsuits. Buy another at the Boutique.']]); return; }
    this.openMenu('GIVE A SWIMSUIT', list.map(x => ({ label: x.name, onPick: () => { this.menu = null; G.giftNpcSuit(id, x.id); const d = G.addAff(id, G.CAST[id].loves && G.CAST[id].loves.includes('fashion') ? 12 : 6, 'suit'); this.say([[G.CAST[id].name, 'A swimsuit? For me? I am wearing it right now. Immediately.'], ['PEPPER', G.CAST[id].name + ' wears the ' + x.name + ' from now on. (+' + d + ')']]); } })).concat([{ label: 'Back', onPick: () => { this.menu = null; } }]), () => this.talkMenu(this.npcs.find(n => n.id === id)));
  },
  attractWalk(dt) {
    this.at = (this.at || 0) + dt; if (this.at > (this.d.time || 10)) { G.attractNext(); return; }
    if (!this.target || Math.hypot(this.target[0] - this.me.x, this.target[1] - this.me.y) < 6) { const es = this.entities().filter(e => !(e.kind === 'hot' && e.h.kind === 'exit')); const e = es[Math.floor(this.at / 2.2) % es.length]; if (e) this.target = [e.x, e.y + 12]; }
  },
  /* ---------- update ---------- */
  walk(dt) {
    const me = this.me, L = this.loc; let dx = 0, dy = 0;
    if (this.target) { const tx = this.target[0] - me.x, ty = this.target[1] - me.y, l = Math.hypot(tx, ty); if (l >= 3) { dx = tx / l; dy = ty / l; } }
    const sp = 74; me.vx = approach(me.vx, dx * sp, dt * 600); me.vy = approach(me.vy, dy * sp, dt * 600); me.x = clamp(me.x + me.vx * dt, -L.hw + 6, L.hw - 6); me.y = clamp(me.y + me.vy * dt, -L.hh + 10, L.hh - 4);
    if (Math.hypot(me.vx, me.vy) > 6) me.face = Math.atan2(me.vy, me.vx);
    this.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: me.vx, vy: me.vy, facing: me.face });
    for (const n of this.npcs) { n.face = Math.atan2(me.y - n.y, me.x - n.x); n.rig.update(dt, { x: n.x, y: n.y, z: 0, vx: 0, vy: 0, facing: n.face }); }
    const ents = this.entities(); let best = null, bd = 28; for (const e of ents) { const d = Math.hypot(e.x - me.x, e.y - me.y); if (d < bd) { bd = d; best = e; } } this.sel = best;
    G.game.focus(clamp(me.x, -L.hw + 140, L.hw - 140) * (L.hw > 140 ? 1 : 0), clamp(me.y, -L.hh + 60, L.hh - 60) * .6, 8);
  },
  update(dt) {
    this.t += dt; const I = G.game.input, me = this.me, L = this.loc;
    if (this.d.attract) { this.attractWalk(dt); return this.walk(dt); }
    if (this.sp.open) { this.sp.update(dt); this.pend = null; return; }
    if (this.menu) { this.menu.update(dt); return; }
    // movement: stick/keys, or walk to a clicked target
    const mv = I.move(), len = Math.min(1, Math.hypot(mv[0], mv[1]));
    let dx = 0, dy = 0;
    if (len > .1) { const d = G.game.view.screenDirToGround(mv[0], mv[1]); dx = d[0] * len; dy = d[1] * len; this.pend = null; this.target = null; }
    else if (this.target) { const tx = this.target[0] - me.x, ty = this.target[1] - me.y, l = Math.hypot(tx, ty); if (l < 3) this.target = null; else { dx = tx / l; dy = ty / l; } }
    const sp = 74; me.vx = approach(me.vx, dx * sp, dt * 600); me.vy = approach(me.vy, dy * sp, dt * 600);
    me.x = clamp(me.x + me.vx * dt, -L.hw + 6, L.hw - 6); me.y = clamp(me.y + me.vy * dt, -L.hh + 10, L.hh - 4);
    if (Math.hypot(me.vx, me.vy) > 6) me.face = Math.atan2(me.vy, me.vx);
    this.rig.update(dt, { x: me.x, y: me.y, z: 0, vx: me.vx, vy: me.vy, facing: me.face });
    for (const n of this.npcs) { const a = Math.atan2(me.y - n.y, me.x - n.x); n.face = a; n.rig.update(dt, { x: n.x, y: n.y + Math.sin(this.t * 1.5 + n.ph) * .3, z: 0, vx: 0, vy: 0, facing: n.face }); }
    // nearest interactable
    const ents = this.entities(); let best = null, bd = 28;
    for (const e of ents) { const d = Math.hypot(e.x - me.x, e.y - me.y); if (d < bd) { bd = d; best = e; } }
    // mouse hover/click on entities (screen distance)
    const p = I.pointer(), cl = I.clicked();
    if (this.scr && cl) { let ce = null, cd = 18; for (const e of this.scr) { const d = Math.hypot(e.sx - cl[0], e.sy - cl[1]); if (d < cd) { cd = d; ce = e.e; } } if (ce) { this.pend = ce; this.target = [ce.x, ce.y + (ce.kind === 'npc' ? 10 : 0)]; } else { const gp = this.org && G.game.view.toGround(cl[0] - this.org[0], cl[1] - this.org[1]); if (gp) this.target = [clamp(gp[0], -L.hw, L.hw), clamp(gp[1], -L.hh, L.hh)]; this.pend = null; } }
    this.sel = best;
    if (this.pend) { const d = Math.hypot(this.pend.x - me.x, this.pend.y - me.y); if (d < 24) { const e = this.pend; this.pend = null; this.target = null; this.interact(e); return; } }
    if (I.pressed('confirm') && best) { this.interact(best); return; }
    if (I.pressed('photo') && G.openPhoto) G.openPhoto(L.name);
    void p;
    this.cx = clamp(me.x, -L.hw + 140, L.hw - 140) * (L.hw > 140 ? 1 : 0); this.cy = clamp(me.y, -L.hh + 60, L.hh - 60) * .6;
    G.game.focus(this.cx, this.cy, 8);
  },
  /* ---------- draw ---------- */
  draw(r) {
    const W = r.W, H = r.H, t = this.t, night = this.night, L = this.loc, g = r.tgt;
    // backdrop: sky and sea above the floor
    const far = r.w(0, -L.hh, 0)[1];
    const sky = night ? ['#06061a', '#0e0e3a', '#1a1a5a', '#2a2a7a'] : ['#4aa8e8', '#78c4f0', '#a0daf8', '#c8eefc'];
    const top = Math.max(0, Math.round(far));
    for (let i = 0; i < sky.length; i++) px.rect(g, 0, Math.floor(i * top / sky.length), W, Math.ceil(top / sky.length) + 1, sky[i]);
    px.rect(g, 0, Math.round(top * .6), W, Math.round(top * .4) + 1, night ? '#0a3a6a' : '#2a9ad0');
    px.rect(g, 0, 0, 0, 0, '#000'); px.rect(g, 0, top, W, H - top, night ? '#2a2a3a' : '#f4dca0');
    L.scenery(r, t, night);
    this.scr = []; const ents = this.entities();
    // npcs
    for (const n of this.npcs) { r.shadow(n.x, n.y, 6, .35); r.actor(n.x, n.y, 0, (gg, ox, oy) => n.rig.draw(gg, ox, oy, r.view)); }
    r.shadow(this.me.x, this.me.y, 6, .4); r.actor(this.me.x, this.me.y, 0, (gg, ox, oy) => this.rig.draw(gg, ox, oy, r.view));
    for (const e of ents) { const [sx, sy] = r.w(e.x, e.y, e.kind === 'npc' ? 22 : 8); this.scr.push({ e, sx, sy }); }
    this.org = r.w(0, 0, 0);
    // hotspot markers and labels
    for (const e of ents) {
      const sel = this.sel === e, z = e.kind === 'npc' ? 40 : 14;
      r.queue(e.x, e.y, z, gg => { const [x, y] = r.w(e.x, e.y, z + Math.sin(t * 4 + e.x) * 1.5); const X = Math.round(x), Y = Math.round(y); if (e.kind === 'hot' && e.h.kind !== 'exit') px.poly(gg, [[X - 3, Y - 6], [X + 3, Y - 6], [X, Y]], sel ? '#fff06a' : '#ffd24a'); else if (e.kind === 'npc' && sel) px.poly(gg, [[X - 3, Y - 6], [X + 3, Y - 6], [X, Y]], '#fff06a'); if (e.kind === 'hot' && e.h.kind === 'exit') px.poly(gg, [[X - 4, Y - 3], [X + 4, Y - 3], [X, Y + 3]], sel ? '#fff06a' : '#9be0ff'); }, { emissive: true });
    }
    r.overlay(gg => {
      if (this.sel && !this.menu && !this.sp.open) {
        const e = this.sel, [x, y] = r.w(e.x, e.y, e.kind === 'npc' ? 50 : 22), lab = e.label, w = E.font.width(lab) + 12 + (e.kind === 'npc' ? 20 : 0), X = Math.round(clamp(x - w / 2, 2, W - w - 2)), Y = Math.round(clamp(y - 16, 22, H - 30));
        G.panel(gg, X, Y, w, 13); G.text(gg, lab, X + 6, Y + 3, '#fff6c8'); if (e.kind === 'npc') G.text(gg, '♥'.repeat(G.hearts(e.n.id)), X + w - 4, Y + 3, '#ff6a8a', { align: 'right' });
      }
      E.font.text(gg, L.name.toUpperCase(), W - 66, 5, '#ffe08a', { align: 'right', shadow: '#000', outline: false });
    });
    G.hudTop(r);
    if (this.menu) { r.overlay(gg => { G.text(gg, this.menuTitle, Math.round(W / 2), 52, '#ffd24a', { align: 'center' }); }); this.menu.draw(r); G.drawPrompts(r, [['confirm', 'Select'], ['cancel', 'Back']]); }
    else if (this.sp.open) { this.sp.draw(r); }
    else G.drawPrompts(r, [['confirm', this.sel ? (this.sel.kind === 'npc' ? 'Talk' : 'Use') : 'Interact'], ['photo', 'Postcard'], ['pause', 'Pause']]);
  }
});

/* ===== 33-shop.js ===== */
/* 33-shop: shops, wardrobe, journal and postcard album. Full-screen canvas UI over a live preview. */
const previewStage = (r, rig, x, y, t) => {
  r.shadow(x, y, 9, .4); r.actor(x, y, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view));
};
G.scenes.shop = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'shop', pausable: true,
  enter(d) {
    this.d = d; this.t = 0; this.kind = d.kind; G.music('promenade'); G.game.focus(-40, 0, 20); this.sp = null; this.build();
    this.rig = G.rigOf('you', 1.8); this.msg = '';
  },
  build() {
    const s = G.state, k = this.kind; let items;
    if (k === 'suit') items = G.SUITS.map(x => ({ label: x.name, it: x, value: () => s.owned.suits.includes(x.id) ? 'owned' : G.fmtMoney(x.price) }));
    else if (k === 'hat') items = G.HATS.map(x => ({ label: x.name, it: x, value: () => s.owned.hats.includes(x.id) ? 'owned' : G.fmtMoney(x.price) }));
    else items = G.GIFTS.map(x => ({ label: x.name, it: x, value: () => G.fmtMoney(x.price) + (s.bag[x.id] ? '  (x' + s.bag[x.id] + ')' : '') }));
    items.push({ label: 'Leave', onPick: () => G.game.go('location', { loc: this.d.back }) });
    items.forEach(i => { if (i.it) i.onPick = () => this.buy(i.it); });
    this.menu = new G.Menu(items, { x: 6, y: 34, w: 168, gap: 12, onCancel: () => G.game.go('location', { loc: this.d.back }) });
    this.menu.rows = 14;
  },
  buy(it) {
    const s = G.state, k = this.kind;
    if (k === 'suit') { if (s.owned.suits.includes(it.id)) { s.suit = it.id; this.msg = 'Wearing the ' + it.name + '.'; this.rig = G.rigOf('you', 1.8); return; } if (G.buySuit(it.id)) { s.suit = it.id; this.msg = 'Bought the ' + it.name + '! You put it on.'; G.toast('New swimsuit: ' + it.name, '#9bffb0'); this.rig = G.rigOf('you', 1.8); } else { G.sfx('cancel'); this.msg = 'Not enough money.'; } }
    else if (k === 'hat') { if (s.owned.hats.includes(it.id)) { s.hat = it.id; this.msg = 'Wearing: ' + it.name; this.rig = G.rigOf('you', 1.8); return; } if (G.buyHat(it.id)) { s.hat = it.id; this.msg = 'Bought: ' + it.name; this.rig = G.rigOf('you', 1.8); } else { G.sfx('cancel'); this.msg = 'Not enough money.'; } }
    else { if (G.buyGift(it.id)) this.msg = 'Added to your bag: ' + it.name; else { G.sfx('cancel'); this.msg = 'Not enough money.'; } }
  },
  update(dt) { this.t += dt; const m = this.menu; m.update(dt); const it = m.items[m.i].it; if (it && this.kind !== 'gift') { const sid = this.kind === 'suit' ? it.id : G.state.suit, hid = this.kind === 'hat' ? it.id : G.state.hat; this.prev = G.rig('you', sid, hid, 1.8); } else this.prev = G.rigOf('you', 1.8); this.prev.update(dt, { x: 50, y: 36, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .8) * .6 }); },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { noPalms: true, sky: ['#ffd9a0', '#ffe9b8', '#fff3d0', '#fff8e0', '#ffffff'] });
    const title = this.kind === 'suit' ? 'SWIMSUIT BOUTIQUE' : this.kind === 'hat' ? 'HAT STAND' : 'GIFT KIOSK';
    r.overlay(g => { px.rect(g, 0, 0, W, 20, '#0b2430cc'); E.font.title(g, title, 8, 5, { scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 }); G.text(g, G.fmtMoney(G.state.money), W - 6, 7, '#9bffb0', { align: 'right' }); });
    const m = this.menu; const rows = 14, first = clamp(m.i - 6, 0, Math.max(0, m.items.length - rows));
    // draw only the visible slice of the menu by temporarily slicing
    const all = m.items, idx = m.i; m.items = all.slice(first, first + rows); m.i = idx - first; m.draw(r); m.items = all; m.i = idx;
    // we must keep rects aligned to the slice for hover/click; map them back
    this.menu.rectsSlice = true;
    if (this.prev) { r.shadow(50, 36, 10, .4); r.actor(50, 36, 0, (g, ox, oy) => this.prev.draw(g, ox, oy, r.view)); }
    const it = all[idx].it;
    r.overlay(g => {
      const x = Math.round(W - 150), y = 26, w = 144; G.panel(g, x, y, w, 62);
      if (it) {
        G.text(g, it.name, x + 6, y + 5, '#ffd24a');
        if (this.kind === 'suit') { px.rect(g, x + 6, y + 18, 24, 8, it.top); px.rect(g, x + 32, y + 18, 24, 8, it.bottom); G.text(g, G.state.owned.suits.includes(it.id) ? 'In your wardrobe' : 'Price ' + G.fmtMoney(it.price), x + 6, y + 30, '#bfe9ee'); }
        else if (this.kind === 'hat') G.text(g, G.state.owned.hats.includes(it.id) ? 'In your wardrobe' : 'Price ' + G.fmtMoney(it.price), x + 6, y + 20, '#bfe9ee');
        else { G.text(g, G.LABELS[it.cat] + ' gift', x + 6, y + 18, '#ffb0c0'); G.text(g, 'Base friendship +' + it.pts, x + 6, y + 30, '#bfe9ee'); const k = G.state.known; const seen = k ? Object.keys(k).filter(id => k[id][it.cat]).map(id => G.CAST[id].name + ': ' + k[id][it.cat]) : []; G.wrap(seen.length ? seen.join(', ') : 'Try it on someone to learn who likes it.', w - 12).slice(0, 3).forEach((ln, i) => G.text(g, ln, x + 6, y + 42 + i * 9, '#fff')); }
      }
      if (this.msg) G.text(g, this.msg, Math.round(W / 2), H - 30, '#fff6c8', { align: 'center' });
    });
    G.drawPrompts(r, [['confirm', this.kind === 'gift' ? 'Buy' : 'Buy / wear'], ['cancel', 'Leave']]);
  }
});
// the shop menu draws a slice: remap clicks by overriding pick/hover to the real index
(() => {
  const M = G.Menu.prototype, upd = M.update;
  M.update = function (dt) {
    if (!this.rows) return upd.call(this, dt);
    // windowed menus (shop, wardrobe): swap in the visible slice while handling input
    const all = this.items, idx = this.i, first = clamp(idx - 6, 0, Math.max(0, all.length - this.rows));
    this.items = all.slice(first, first + this.rows); this.i = idx - first; const r = upd.call(this, dt); const ni = this.i + first; this.items = all; this.i = clamp(ni, 0, all.length - 1); return r;
  };
})();

G.scenes.wardrobe = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'wardrobe', pausable: true,
  enter(d) { this.d = d; this.t = 0; G.music('villa'); G.game.focus(-40, 0, 20); this.build(); },
  build() {
    const s = G.state, items = [];
    G.SUITS.filter(x => s.owned.suits.includes(x.id)).forEach(x => items.push({ label: x.name, value: () => s.suit === x.id ? 'wearing' : '', onPick: () => { s.suit = x.id; this.refresh(); } }));
    G.HATS.filter(x => s.owned.hats.includes(x.id)).forEach(x => items.push({ label: 'Hat: ' + x.name, value: () => s.hat === x.id ? 'wearing' : '', onPick: () => { s.hat = x.id; this.refresh(); } }));
    items.push({ label: 'Done', onPick: () => G.game.go('location', { loc: this.d.back }) });
    this.menu = new G.Menu(items, { x: 6, y: 34, w: 168, gap: 12, onCancel: () => G.game.go('location', { loc: this.d.back }) }); this.menu.rows = 14;
  },
  refresh() { G.sfx('confirm'); },
  update(dt) { this.t += dt; this.menu.update(dt); const s = G.state, all = this.menu.items, it = all[this.menu.i]; let sid = s.suit, hid = s.hat; const label = it && it.label || '';
    const su = G.SUITS.find(x => x.name === label), ha = G.HATS.find(x => 'Hat: ' + x.name === label); if (su) sid = su.id; if (ha) hid = ha.id;
    this.prev = G.rig('you', sid, hid, 1.8); this.prev.update(dt, { x: 50, y: 36, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t * .8) * .8 }); },
  draw(r) {
    const W = r.W; G.beach(r, this.t, { noPalms: true, sky: ['#cfe8f4', '#dff0f8', '#eef8fc', '#f6fcff', '#ffffff'] });
    r.overlay(g => { px.rect(g, 0, 0, W, 20, '#0b2430cc'); E.font.title(g, 'WARDROBE', 8, 5, { scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 }); });
    const m = this.menu, all = m.items, idx = m.i, first = clamp(idx - 6, 0, Math.max(0, all.length - 14)); m.items = all.slice(first, first + 14); m.i = idx - first; m.draw(r); m.items = all; m.i = idx;
    r.shadow(50, 36, 10, .4); r.actor(50, 36, 0, (g, ox, oy) => this.prev.draw(g, ox, oy, r.view));
    G.drawPrompts(r, [['confirm', 'Wear'], ['cancel', 'Back']]);
  }
});

G.scenes.journal = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'journal', pausable: true,
  enter(d) { this.d = d; this.t = 0; this.tab = 0; this.sel = 0; G.music('villa'); G.game.focus(-40, 0, 20); this.ids = ['mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines', 'sonny', 'pepper']; },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (I.pressed('cancel') || I.pressed('pause')) { G.game.go(this.d.back || 'map', this.d.back && this.d.back !== 'map' ? { loc: this.d.back } : undefined); return; }
    if (I.pressed('left') && this.tab > 0) { this.tab--; G.sfx('select'); } if (I.pressed('right') && this.tab < 2) { this.tab++; G.sfx('select'); }
    if (I.pressed('tab') || I.pressed('tabNext')) { this.tab = (this.tab + 1) % 3; G.sfx('select'); }
    if (this.tab === 0) { if (I.pressed('up')) { this.sel = (this.sel + 7) % 8; G.sfx('select'); } if (I.pressed('down')) { this.sel = (this.sel + 1) % 8; G.sfx('select'); } }
    const c = I.clicked(); if (c) { if (c[1] < 24) { const w = (G.game.W - 62) / 3; this.tab = clamp(Math.floor(c[0] / w), 0, 2); } else if (this.tab === 0 && c[0] < 140) this.sel = clamp(Math.floor((c[1] - 30) / 20), 0, 7); }
    if (I.pressed('confirm') && this.tab === 0) this.sel = this.sel;
  },
  draw(r) {
    const W = r.W, H = r.H, s = G.state; G.beach(r, this.t, { noPalms: true, sky: ['#2a3a5a', '#3a4a6a', '#4a5a7a', '#5a6a8a', '#6a7a9a'] });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430dd'); ['FRIENDS', 'STORY', 'STATS'].forEach((n, i) => { const w = Math.round((W - 62) / 3); E.ui.box(g, i * w + 2, 2, w - 4, 18, this.tab === i ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a' }); G.text(g, n, i * w + w / 2, 8, '#fff', { align: 'center' }); });
      if (this.tab === 0) {
        this.ids.forEach((id, i) => { const y = 28 + i * 20, sel = i === this.sel, c = G.CAST[id]; E.ui.box(g, 6, y, 134, 18, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .9 }); px.disc(g, 16, y + 9, 5, c.cloth); G.text(g, c.name, 26, y + 5, '#fff'); G.text(g, '♥'.repeat(G.hearts(id)), 134, y + 5, '#ff6a8a', { align: 'right' }); });
        const id = this.ids[this.sel], c = G.CAST[id], x = 150, w = W - 156; G.panel(g, x, 28, w, 150);
        G.text(g, c.full, x + 6, 33, '#ffd24a'); G.text(g, c.style + ' · ' + c.tag, x + 6, 44, '#bfe9ee'); G.wrap(c.bio, w - 12).forEach((ln, i) => G.text(g, ln, x + 6, 58 + i * 9, '#fff'));
        G.text(g, 'Friendship ' + G.affinity(id) + '/100', x + 6, 100, '#fff6c8'); px.rect(g, x + 6, 110, w - 12, 5, '#06141c'); px.rect(g, x + 6, 110, Math.round((w - 12) * G.affinity(id) / 100), 5, '#ff6a8a');
        G.text(g, 'Mood today: ' + G.MOOD_TXT[G.moodOf(id, s.day)], x + 6, 122, '#bfe9ee');
        const k = (s.known && s.known[id]) || {}; const ks = Object.keys(k).map(cat => G.LABELS[cat] + ' (' + k[cat] + ')'); G.wrap('Tastes found: ' + (ks.length ? ks.join(', ') : 'none yet. Try gifts.'), w - 12).forEach((ln, i) => G.text(g, ln, x + 6, 136 + i * 9, '#ffb0c0'));
      } else if (this.tab === 1) {
        const rows = [['1 Arrival', s.flags['done:1:0']], ['1 Welcome match', s.results.welcome], ['2 Qualifier', s.results.qualifier], ['3 Semifinal', s.results.semifinal], ['4 The Reveal', s.flags.reveal], ['5 Fortuna Cup', s.results.final], ['5 Farewell party', s.ending]];
        rows.forEach((rw, i) => { G.text(g, rw[0], 20, 34 + i * 16, '#fff'); G.text(g, rw[1] ? (typeof rw[1] === 'string' ? rw[1] : 'done') : '...', W - 20, 34 + i * 16, rw[1] === 'win' ? '#9bffb0' : rw[1] === 'loss' ? '#ffb0a0' : rw[1] ? '#fff6c8' : '#6a8a94', { align: 'right' }); });
        G.text(g, 'Partner: ' + (s.partner ? G.CAST[s.partner].full : 'none yet'), 20, 156, '#ffd0dc');
      } else {
        const rows = [['Played', s.stats.played], ['Won / Lost', s.stats.wins + ' / ' + s.stats.losses], ['Spikes', s.stats.spikes], ['Aces', s.stats.aces], ['Blocks', s.stats.blocks], ['Perfect touches', s.stats.perfects], ['Money earned', G.fmtMoney(s.stats.earned)], ['Money spent', G.fmtMoney(s.stats.spent)], ['Pool Hop best', s.stats.poolBest], ['Postcards', s.album.length]];
        rows.forEach((rw, i) => { G.text(g, rw[0], 30, 30 + i * 14, '#bfe9ee'); G.text(g, '' + rw[1], W - 30, 30 + i * 14, '#fff6c8', { align: 'right' }); });
      }
    });
    G.drawPrompts(r, [['cancel', 'Back'], ['tab', 'Next tab']]);
  }
});

G.scenes.album = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'album', pausable: true,
  enter(d) { this.d = d || {}; this.t = 0; this.i = 0; G.music('villa'); G.game.focus(0, 0, 14); this.imgs = {}; },
  update(dt) {
    this.t += dt; const I = G.game.input, n = G.state ? G.state.album.length : 0;
    if (I.pressed('cancel')) { if (this.d.back === 'title') G.game.go('menu'); else G.game.go(this.d.back || 'map', this.d.back && this.d.back !== 'map' && this.d.back !== 'menu' ? { loc: this.d.back } : undefined); return; }
    if (n) { if (I.pressed('left')) { this.i = (this.i + n - 1) % n; G.sfx('select'); } if (I.pressed('right')) { this.i = (this.i + 1) % n; G.sfx('select'); } }
    if (I.pressed('confirm') && n && G.state.album[this.i]) { G.state.titleCard = this.i; G.toast('Set as title postcard', '#9bffb0'); G.sfx('confirm'); }
  },
  draw(r) {
    const W = r.W, H = r.H, s = G.state; G.beach(r, this.t, { noPalms: true, sky: ['#2a3a5a', '#3a4a6a', '#4a5a7a', '#5a6a8a', '#6a7a9a'] });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430dd'); E.font.title(g, 'POSTCARD ALBUM', W / 2, 5, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 });
      const n = s ? s.album.length : 0;
      if (!n) { G.text(g, 'No postcards yet. Press ' + G.label('photo') + ' anywhere on the island to take one.', W / 2, H / 2, '#bfe9ee', { align: 'center' }); return; }
      const card = s.album[this.i], w = 220, h = 150, x = Math.round(W / 2 - w / 2), y = 24;
      px.rect(g, x + 3, y + 3, w, h, '#00000066'); E.ui.box(g, x, y, w, h, { bg: ['#fffaf0', '#f0e6c8'], border: '#c8962a', gradient: false });
      G.drawPostcard(g, card, x + 8, y + 8, w - 16, h - 40, this);
      G.text(g, card.caption, x + w / 2, y + h - 26, '#3a2410', { align: 'center', shadow: null });
      G.text(g, card.loc + ' · Day ' + card.day + ' ' + G.SLOTS[card.slot], x + w / 2, y + h - 14, '#8a6a3a', { align: 'center', shadow: null });
      G.text(g, (this.i + 1) + ' / ' + n, W / 2, y + h + 8, '#fff6c8', { align: 'center' });
    });
    G.drawPrompts(r, [['confirm', 'Use as title card'], ['cancel', 'Back']]);
  }
});

/* ===== 34-story.js ===== */
/* 34-story: speech (E.Dialog with Animalese), cutscenes, the story beats, day end, endings and credits. */
G.idOf = name => { const n = String(name).toUpperCase(); const c = Object.values(G.CAST).find(c => c.name === n); return c ? c.id : 'sonny'; };

class Speech {
  constructor() { this.talk = new E.Dialog(G.game, { speed: 32, voice: () => {} }); this.queue = []; this.done = null; this.rig = {}; }
  get open() { return this.talk.open || this.queue.length > 0; }
  // lines: [[speaker, text], ...]; done: callback after the last
  play(lines, done) { this.queue = lines.slice(); this.done = done || null; this.next(); }
  next() {
    const l = this.queue.shift();
    if (!l) { const d = this.done; this.done = null; if (d) d(); return; }
    const id = G.idOf(l[0]), c = G.CAST[id], opts = l[2] || {};
    this.talk.voice = ch => G.speak(id, ch);
    const rig = this.rig[id] || (this.rig[id] = G.rigOf(id, 1.2));
    this.talk.say(l[1], Object.assign({ name: c.name, portrait: rig, portraitSize: 40, onDone: () => this.next() }, opts));
    this.speaker = id;
  }
  update(dt) { return this.talk.update(dt); }
  draw(r) { this.talk.draw(r); }
  close() { this.queue = []; this.talk.close(); this.done = null; }
}
G.Speech = Speech;

/* ---- the cutscene scene: a stage with the speakers, a backdrop, and the story's lines ---- */
G.scenes.cutscene = G.wrapScene({
  view: 'threequarter', res: 'ps1', expand: true, input: 'DEFAULT', name: 'cutscene', pausable: true,
  enter(d) {
    this.d = d || {}; this.sp = new Speech(); this.t = 0; this.stage = (d.cast || []).map(id => ({ id })); this.bg = d.bg || 'beach';
    G.music(d.music || 'villa'); G.game.follow(null); G.game.focus(0, 0, 14); G.game.lights.enabled = false;
    this.skipT = 0;
    this.sp.play(d.lines || [], () => { if (d.next) d.next(); });
  },
  update(dt) {
    this.t += dt; const I = G.game.input;
    this.sp.update(dt);
    // hold cancel / start to skip the whole scene
    if (I.down('cancel') || I.down('start')) { this.skipT += dt; if (this.skipT > .9) { this.sp.close(); if (this.d.next) { const n = this.d.next; this.d.next = null; n(); } } } else this.skipT = 0;
    const n = this.stage.length;
    this.stage.forEach((s, i) => { const rig = this.sp.rig[s.id] || G.rigOf(s.id, 1.6); s.rig = rig; const x = (i - (n - 1) / 2) * 52; s.x = x; rig.update(dt, { x, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 * 1, pose: this.sp.speaker === s.id && this.sp.talk.typing ? null : null, expr: this.sp.speaker === s.id ? 'smile' : null }); });
  },
  draw(r) {
    const W = r.W, H = r.H, night = this.bg === 'night';
    const bgInfo = G.beach(r, this.t, night ? { sky: ['#06061a', '#0e0e3a', '#1a1a5a', '#2a2a7a', '#3a3a8a'], sunX: .2 } : {});
    this.stage.forEach(s => { r.shadow(s.x, 0, 8, .3); r.actor(s.x, 0, 0, (g, ox, oy) => s.rig.draw(g, ox, oy + 0, r.view)); });
    r.overlay(g => { if (this.d.title) { E.font.title(g, this.d.title, W / 2, 10, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' }); } if (this.skipT > 0) { px.rect(g, 4, H - 8, Math.round((W - 8) * this.skipT / .9), 3, '#ffd24a'); } });
    this.sp.draw(r);
    G.drawPrompts(r, [['confirm', 'Next'], ['cancel', 'Hold: Skip']], 3);
    void bgInfo;
  }
});
// helper to run a cutscene and then something
G.cutscene = (lines, cast, next, o = {}) => G.game.go('cutscene', Object.assign({ lines, cast, next }, o));

/* ---- the invitation card at the start of a vacation ---- */
G.scenes.invitation = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'invitation',
  enter(d) { this.d = d || {}; this.t = 0; this.shown = 0; G.music('title'); G.game.focus(0, 0, 14); this.all = G.TEXT.invitation.join('\n\n'); },
  update(dt) {
    this.t += dt; const prev = Math.floor(this.shown); this.shown = Math.min(this.all.length, this.shown + dt * 28);
    for (let k = prev; k < Math.floor(this.shown); k++) G.speak('sonny', this.all[k]);
    const I = G.game.input;
    if (I.pressed('confirm') || I.clicked()) { if (this.shown < this.all.length) this.shown = this.all.length; else { if (this.d.next) this.d.next(); } }
    if (I.pressed('cancel') && this.d.next) this.d.next();
  },
  draw(r) {
    const W = r.W, H = r.H; r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0a2d3d'); for (let y = 0; y < H; y += 4) px.rect(g, 0, y, W, 2, '#0c3548');
      const w = 300, h = 160, x = Math.round(W / 2 - w / 2), y = Math.round(H / 2 - h / 2);
      px.rect(g, x + 3, y + 3, w, h, '#00000066'); E.ui.box(g, x, y, w, h, { bg: ['#fff6d8', '#f0dca0'], border: '#c8962a', gradient: true });
      px.rect(g, x + 5, y + 5, w - 10, 2, '#c8962a'); px.rect(g, x + 5, y + h - 7, w - 10, 2, '#c8962a');
      E.font.title(g, 'AHEAD OR ALIVE', x + w / 2, y + 12, { align: 'center', scale: 2, colors: ['#8a2a1a', '#c8402a'], depth: 1, depthColor: '#f4e0a0' });
      const lines = G.wrap(this.all.slice(0, Math.floor(this.shown)), w - 40);
      lines.forEach((ln, i) => E.font.text(g, ln, x + 20, y + 46 + i * 10, '#3a2410', { outline: false }));
      // wax seal
      px.disc(g, x + w - 30, y + h - 28, 12, '#a01828'); px.disc(g, x + w - 30, y + h - 28, 9, '#c82838'); E.font.text(g, 'S', x + w - 32, y + h - 31, '#ffd9a0', { outline: false });
    });
    G.drawPrompts(r, [['confirm', 'Continue']]);
  }
});

/* ---- story beats ---- */
G.runStory = key => {
  const s = G.state, T = G.TEXT, flag = 'done:' + s.day + ':' + s.slot;
  const finish = () => { s.flags[flag] = 1; G.finishSlot(); };
  const playMatch = (afterWin, afterLose) => {
    const cfg = G.storyMatch(key);
    G.game.go('match', { cfg, humanTeam: 0, tutorial: key === 'welcome', rematch: false, noQuit: true, music: key === 'final' ? 'match' : 'match', time: key === 'final' ? 'sunset' : undefined,
      onEnd: res => { const out = G.afterStoryMatch(key, res); const lines = res.winner === 0 ? afterWin : afterLose; G.cutscene(lines.concat([['PEPPER', 'Prize money: ' + G.fmtMoney(out.got) + '. Please do not spend it all in one casino.']]), cast(cfg), key === 'welcome' ? () => G.game.go('partner', { next: finish }) : finish, { bg: 'beach' }); } });
  };
  const cast = cfg => [cfg.teams[1][0], cfg.teams[1][1], cfg.teams[0][1]];
  switch (key) {
    case 'arrival': G.cutscene(T.arrival, ['sonny', 'pepper'], finish, { title: 'DAY 1' }); break;
    case 'welcome': G.cutscene(T.welcome, ['sonny', 'pepper', 'mika'], () => playMatch(T.welcomeWin, T.welcomeLose)); break;
    case 'qualifier': G.cutscene(T.qualifier, ['ruby', 'tomo'], () => playMatch(T.qualWin, T.qualLose)); break;
    case 'semifinal': G.cutscene(T.semifinal, ['ines', 'sonny'], () => playMatch(T.semiWin, T.semiLose)); break;
    case 'reveal': G.cutscene(T.reveal, ['sonny', 'pepper'], () => { s.flags.reveal = 1; finish(); }, { bg: 'night', title: 'THE REVEAL' }); break;
    case 'final': G.cutscene(T.final, ['sonny', 'pepper'], () => playMatch(T.finalWin, T.finalLose)); break;
    case 'party': G.cutscene(T.party, ['sonny', 'pepper', 'mika', 'hana', 'gwen'], () => { s.flags[flag] = 1; G.game.go('ending'); }, { bg: 'night', title: 'FAREWELL PARTY' }); break;
    default: finish();
  }
};
// finish a slot: advance the calendar and go on
G.finishSlot = () => {
  const s = G.state, r = G.endSlot(); G.autosave();
  if (r === 'newday') G.game.go('dayend', { day: s.day - 1 }); else G.game.go('map');
};

/* ---- who is your partner: after the welcome match ---- */
G.scenes.partner = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'partner',
  enter(d) {
    this.d = d || {}; this.t = 0; G.music('villa'); G.game.focus(0, 0, 14); this.sp = new Speech();
    this.picking = false; this.menu = null; this.sp.play(G.TEXT.pickPartner, () => this.openMenu());
  },
  openMenu() {
    this.picking = true;
    this.menu = new G.Menu(G.PARTNERS.map(id => ({ label: G.CAST[id].full.split(' ')[0] + '  ' + G.CAST[id].style, id, onPick: it => { G.setPartner(it.id); G.game.go('cutscene', { lines: [[G.CAST[it.id].name, G.rpick(['Partners! Let us get a smoothie and plan world domination.', 'Fine. Do not make me regret it. Fun is optional.', 'I will be there. Probably behind you. Do not turn around.'].slice(0, 3), 'cosmetic')]], cast: [it.id], next: this.d.next }); } })), { y: 82, w: 230, gap: 17 });
  },
  update(dt) { this.t += dt; if (!this.picking) { this.sp.update(dt); } else this.menu.update(dt); },
  draw(r) {
    G.beach(r, this.t, { sky: ['#1a1a4a', '#4a2a7a', '#ff6a5a', '#ffb347', '#ffe08a'] });
    if (this.picking) {
      const W = r.W; r.overlay(g => { G.text(g, 'CHOOSE YOUR PARTNER', W / 2, 20, '#ffd24a', { align: 'center' }); });
      this.menu.draw(r);
      const it = this.menu.items[this.menu.i], c = G.CAST[it.id];
      r.overlay(g => {
        const w = 240, x = Math.round(r.W / 2 - w / 2), y = 142; G.panel(g, x, y, w, 62);
        G.text(g, c.full, x + 6, y + 5, '#ffd24a'); G.text(g, 'Power ' + '★'.repeat(c.stats.power) + '  Speed ' + '★'.repeat(c.stats.speed), x + 6, y + 16, '#bfe9ee');
        G.wrap(c.bio, w - 12).forEach((ln, i) => G.text(g, ln, x + 6, y + 28 + i * 9, '#ffffff'));
        G.text(g, 'Loves: ' + c.loves.map(k => G.LABELS[k]).join(', '), x + 6, y + 52, '#ffb0c0');
      });
      G.drawPrompts(r, [['confirm', 'Choose']]);
    } else this.sp.draw(r);
  }
});

/* ---- end of day ---- */
G.scenes.dayend = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'dayend',
  enter(d) {
    const s = G.state; this.d = d || {}; this.t = 0; this.day = d.day || s.day - 1; G.music('results'); G.sfx('dayend'); G.game.focus(0, 0, 14);
    this.menu = new G.Menu([{ label: s.day > 5 ? 'The Farewell' : 'Start Day ' + s.day, onPick: () => { if (s.day > 5) G.game.go('ending'); else G.game.go('map'); } }, { label: 'Save game', onPick: () => { G.game.saves.show('save'); } }], { y: 150, w: 130, gap: 16 });
    // look for people drifting apart: partners below 15 leave
    this.note = null;
    if (s.partner && G.affinity(s.partner) < 12 && s.day <= 5) { this.note = G.CAST[s.partner].name + ' has had enough of your silence. You are partnerless.'; s.partner = null; s.tempPartner = 'mika'; }
    this.stats = [['Money', G.fmtMoney(s.money)], ['Partner', s.partner ? G.CAST[s.partner].name + ' ' + '♥'.repeat(G.hearts(s.partner)) : 'none'], ['Matches', s.stats.wins + 'W ' + s.stats.losses + 'L'], ['Postcards', '' + s.album.length]];
  },
  update(dt) { this.t += dt; this.menu.update(dt); },
  draw(r) {
    G.beach(r, this.t, { sky: ['#0a0a2a', '#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347'], noPalms: false });
    r.overlay(g => {
      const W = r.W; E.font.title(g, 'DAY ' + this.day + ' COMPLETE', W / 2, 14, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
      const w = 190, x = Math.round(W / 2 - w / 2), y = 44; G.panel(g, x, y, w, 70);
      this.stats.forEach((st, i) => { G.text(g, st[0], x + 8, y + 7 + i * 13, '#bfe9ee'); G.text(g, st[1], x + w - 8, y + 7 + i * 13, '#fff6c8', { align: 'right' }); });
      const nxt = G.DAYS[Math.min(4, G.state.day - 1)]; G.text(g, G.state.day <= 5 ? 'Tomorrow: ' + nxt.title : G.TEXT.vacationEnd, W / 2, y + 76, '#ffeec2', { align: 'center' });
      if (this.note) G.text(g, this.note, W / 2, y + 88, '#ffb0a0', { align: 'center' });
    });
    this.menu.draw(r); G.drawPrompts(r, [['confirm', 'Select']]);
  }
});

/* ---- ending, results, credits ---- */
G.scenes.ending = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'ending',
  enter() {
    const s = G.state, won = s.results.final === 'win', fr = s.partner && G.affinity(s.partner) >= 55; s.ending = (won ? 'champion' : 'runner-up') + (fr ? '-partners' : '-solo');
    const P = s.partner ? G.CAST[s.partner].name : 'MIKA', pid = s.partner || 'mika';
    const lines = won ? [
      ['SONNY', 'The island is yours, Jo! Or rather: it is a very large party that you now technically host.'],
      fr ? [P, 'We did it together, you know. Partners for the next vacation, too? Obviously yes.'] : [P, 'Fine. You were good. I will admit it only on this beach.'],
      ['PEPPER', 'Please remember your sunscreen. It has been a pleasure.']
    ] : [
      ['SONNY', 'The House wins! And since I have no other plan, we shall do this every year. Come back. Bring sunscreen.'],
      fr ? [P, 'Next year we get him. Same team. I will bring snacks.'] : [P, 'Next time I pick my own partner. Kidding. Maybe.'],
      ['PEPPER', 'I look forward to seeing you again. Quietly.']
    ];
    G.cutscene(lines, ['sonny', pid, 'pepper'], () => G.game.go('credits'), { bg: 'night', title: won ? 'THE CUP IS YOURS' : 'UNTIL NEXT SUMMER' });
  },
  update() { }, draw() { }
});
G.scenes.credits = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'credits',
  enter() {
    this.t = 0; G.music('title'); G.game.focus(0, 0, 14); const s = G.state;
    this.slides = [['AHEAD OR ALIVE', 'Xtreme Beach Volleyball'], ['A vacation in five days', G.TEXT.vacationEnd], ['The Cast', 'Jo, Mika, Hana, Gwen, Ruby, Tomo, Ines, Sonny and Pepper'], ['Postcards', (s ? s.album.length : 0) + ' collected'], ['Made with', 'my-3D2dge, written code, and a great deal of sunscreen'], ['Thank you for playing', 'Stay ahead. Stay alive. Stay tanned.']];
    this.slideT = 0; this.si = 0;
  },
  update(dt) {
    this.t += dt; this.slideT += dt; const I = G.game.input;
    if (this.slideT > 4.2) { this.slideT = 0; this.si++; if (this.si >= this.slides.length) { G.game.go('results'); return; } }
    if (I.pressed('confirm') || I.pressed('cancel')) { this.slideT = 4.2; }
  },
  draw(r) {
    G.beach(r, this.t, { sky: ['#0a0a2a', '#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347'] });
    const sl = this.slides[Math.min(this.si, this.slides.length - 1)], a = Math.min(1, this.slideT * 2, (4.2 - this.slideT) * 2);
    r.overlay(g => { const W = r.W, H = r.H; if (a > .05) { E.ui.box(g, 30, Math.round(H * .3), W - 60, 60, { bg: ['#1b4a5a', '#0b2430'], border: '#ffd36a', alpha: .9 * a }); E.font.title(g, sl[0], W / 2, Math.round(H * .3) + 8, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'] }); G.wrap(sl[1], W - 80).forEach((ln, i) => G.text(g, ln, W / 2, Math.round(H * .3) + 26 + i * 10, '#fff', { align: 'center' })); } });
    G.drawPrompts(r, [['confirm', 'Skip']]);
  }
});
G.scenes.results = G.wrapScene({
  view: 'threequarter', input: 'DEFAULT', res: 'ps1', expand: true, name: 'results',
  enter() {
    const s = G.state; this.t = 0; G.music('results'); G.game.focus(0, 0, 14); G.sfx('dayend');
    const grade = s.results.final === 'win' ? (s.stats.wins >= 4 ? 'S' : 'A') : s.stats.wins >= 2 ? 'B' : 'C';
    this.grade = grade;
    this.rows = [['Ending', (s.ending || '').replace(/-/g, ' ')], ['Matches', s.stats.wins + ' won, ' + s.stats.losses + ' lost'], ['Aces / Spikes / Blocks', s.stats.aces + ' / ' + s.stats.spikes + ' / ' + s.stats.blocks], ['Perfect touches', '' + s.stats.perfects], ['Money earned', G.fmtMoney(s.stats.earned)], ['Best friend', Object.keys(s.aff).filter(k => G.PARTNERS.includes(k)).sort((a, b) => s.aff[b] - s.aff[a]).map(k => G.CAST[k].name + ' ' + s.aff[k])[0]], ['Postcards', '' + s.album.length]];
    this.menu = new G.Menu([{ label: 'New Vacation+ (keep suits)', onPick: () => { const keep = G.state; G.state = G.newState(keep.seed + 7); G.state.owned = keep.owned; G.state.suit = keep.suit; G.state.plus = (keep.plus || 0) + 1; G.state.money = 2500 + 1500 * G.state.plus; G.reseedWorld(); G.game.go('invitation', { next: () => G.game.go('map') }); } }, { label: 'Main menu', onPick: () => G.game.go('menu') }], { y: 158, w: 170, gap: 16 });
  },
  update(dt) { this.t += dt; this.menu.update(dt); },
  draw(r) {
    G.beach(r, this.t); const W = r.W;
    r.overlay(g => {
      E.font.title(g, 'VACATION RESULTS', W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
      const w = 230, x = Math.round(W / 2 - w / 2), y = 32; G.panel(g, x, y, w, 112);
      this.rows.forEach((rw, i) => { G.text(g, rw[0], x + 8, y + 6 + i * 11, '#bfe9ee'); G.text(g, rw[1], x + w - 8, y + 6 + i * 11, '#fff6c8', { align: 'right' }); });
      E.font.title(g, this.grade, x + w - 24, y + 92, { align: 'center', scale: 3, colors: ['#fff6c8', '#ffd24a', '#ff4f6a'] });
    });
    this.menu.draw(r); G.drawPrompts(r, [['confirm', 'Select']]);
  }
});

/* ===== 40-poolhop.js ===== */
/* 40-poolhop: a rhythm minigame. Hop across the lagoon's lily pads on the beat. */
G.scenes.poolhop = G.wrapScene({
  view: 'court', input: G.INPUT_MATCH, res: 'ps1', expand: true, name: 'poolhop', pausable: true,
  enter(d) {
    this.d = d || {}; this.t = 0; this.bpm = 116; this.beat = 60 / this.bpm; this.lead = 3; this.N = 28; this.auto = !!this.d.auto;
    this.rig = G.rigOf('you', 1.0); this.hp = { x: 0, z: 0, wet: 0 }; this.i = 0; this.score = 0; this.combo = 0; this.best = 0; this.res = []; this.state = 'play'; this.judged = new Array(this.N).fill(null); this.flash = []; this.menu = null; this.drops = [];
    this.pads = []; for (let k = 0; k <= this.N; k++) this.pads.push({ x: k * 26, y: (k % 2 ? 7 : -7) * (k > 1 ? 1 : 0), gold: k > 0 && k % 7 === 0 });
    G.music('pool', { restart: true }); G.game.setView('court'); G.game.follow(null); G.game.lights.enabled = false; G.game.focus(0, 0, 10);
    this.t0 = 0; G.game.cam.smooth = .15; this.pop = null; this.pdone = false;
  },
  exit() { G.game.cam.smooth = .25; },
  hitTime(k) { return this.lead + k * this.beat; },
  judge(k, dt) { const e = Math.abs(dt); const grade = e < .05 ? 'perfect' : e < .11 ? 'good' : null; return grade; },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.state === 'play') {
      // input: nearest unjudged beat within the window
      const press = I.pressed('play') || I.pressed('confirm') || (this.auto && this.nextAuto());
      if (press) {
        let k = -1; for (let j = 0; j < this.N; j++) if (this.judged[j] === null && Math.abs(this.t - this.hitTime(j)) < .2) { k = j; break; }
        if (k >= 0) { const gr = this.judge(k, this.t - this.hitTime(k)); this.setJudge(k, gr); }
      }
      for (let j = 0; j < this.N; j++) if (this.judged[j] === null && this.t > this.hitTime(j) + .12) this.setJudge(j, null);
      // hop animation: the hopper jumps from pad to pad on each beat
      const sB = (this.t - this.lead) / this.beat, j = Math.floor(sB), u = sB - j;
      const a = this.pads[clamp(j + 1, 0, this.N)], b = this.pads[clamp(j + 2, 0, this.N)], hu = clamp((u - .2) / .8, 0, 1), e = E.ease.inOutQuad(hu);
      this.hp.x = lerp(a.x, b.x, e); this.hp.y = lerp(a.y, b.y, e); this.hp.z = Math.sin(hu * Math.PI) * 14;
      this.hp.wet = Math.max(0, this.hp.wet - dt);
      if (this.t > this.hitTime(this.N) + .8) this.finish();
    } else if (this.menu) this.menu.update(dt);
    this.rig.update(dt, { x: this.hp.x, y: this.hp.y || 0, z: this.hp.z, vx: 20, vy: 0, facing: 0, air: this.hp.z > 2, pose: this.state === 'done' && this.score > 1500 ? 'cheer' : null, expr: this.hp.wet > 0 ? 'wince' : 'smile' });
    for (const d of this.drops) { d.t -= dt; d.z += d.vz * dt; d.vz -= 220 * dt; } this.drops = this.drops.filter(d => d.t > 0);
    if (this.pop) { this.pop.t -= dt; if (this.pop.t <= 0) this.pop = null; }
    G.game.focus(this.hp.x + 40, 0, 10);
  },
  nextAuto() { for (let j = 0; j < this.N; j++) if (this.judged[j] === null && this.t >= this.hitTime(j) - .01) return true; return false; },
  setJudge(k, gr) {
    this.judged[k] = gr || 'miss';
    if (gr === 'perfect') { this.combo++; this.score += Math.round(100 * (1 + Math.min(this.combo, 20) * .1) * (this.pads[k].gold ? 2 : 1)); G.sfx('perfect'); G.sfx('pad'); this.pop = { text: 'PERFECT!', col: '#fff06a', t: .6 }; }
    else if (gr === 'good') { this.combo++; this.score += Math.round(60 * (1 + Math.min(this.combo, 20) * .1) * (this.pads[k].gold ? 2 : 1)); G.sfx('good'); this.pop = { text: 'GOOD', col: '#9bffb0', t: .6 }; }
    else { this.combo = 0; this.hp.wet = .6; G.sfx('splash', { vol: .6 }); this.pop = { text: 'SPLASH!', col: '#9be0ff', t: .6 }; for (let q = 0; q < 8; q++) this.drops.push({ x: this.hp.x + (G.rand() - .5) * 12, y: this.hp.y, z: 2, vz: 60 + G.rand() * 80, t: .6 }); }
    this.best = Math.max(this.best, this.combo);
  },
  finish() {
    if (this.state !== 'play') return; this.state = 'done'; const money = Math.round(this.score / 6 / 10) * 10; this.money = money; G.sfx('dayend');
    const perfect = this.judged.filter(x => x === 'perfect').length, good = this.judged.filter(x => x === 'good').length;
    this.summary = { perfect, good, miss: this.N - perfect - good };
    if (this.d.auto) { if (this.d.done) this.d.done({ score: this.score, money }); return; }
    this.menu = new G.Menu([{ label: 'Collect ' + G.fmtMoney(money * G.T.moneyMul), onPick: () => { if (this.d.done) this.d.done({ score: this.score, money }); } }], { y: 150, w: 150, gap: 15 });
  },
  draw(r) {
    const W = r.W, H = r.H, g = r.tgt, t = this.t;
    const top = Math.round(H * .34);
    for (let i = 0; i < 5; i++) px.rect(g, 0, Math.floor(i * top / 5), W, Math.ceil(top / 5) + 1, ['#4aa8e8', '#78c4f0', '#a0daf8', '#c8eefc', '#e8f8ff'][i]);
    px.rect(g, 0, top, W, H - top, '#2ab8e0'); for (let y = top; y < H; y += 3) px.rect(g, 0, y, W, 1, (y / 3 & 1) ? '#34c2ea' : '#22aed8');
    for (let i = 0; i < 40; i++) { const x = (i * 61 + Math.floor(t * 12)) % W, y = top + (i * 29) % (H - top); px.rect(g, x, y, 7, 1, '#bff4ff'); }
    // deck behind
    px.rect(g, 0, top - 4, W, 6, '#e8e0d0'); r.prop('palm', this.hp.x - 90, -50, 0, { size: 1.6 }); r.prop('palm', this.hp.x + 130, -52, 0, { size: 1.6 });
    // pads and rings
    this.pads.forEach((p, k) => {
      r.queue(p.x, p.y, 0, gg => { const [x, y] = r.w(p.x, p.y, .5); const X = Math.round(x), Y = Math.round(y); const j = this.judged[k - 1]; px.ell(gg, X, Y, 9, 4, p.gold ? '#e8c030' : '#2f9a4a'); px.ell(gg, X, Y - 1, 8, 3, p.gold ? '#ffe36a' : '#4fc060'); px.dot(gg, X + 3, Y - 2, '#ff8ac8'); if (j === 'miss') px.ell(gg, X, Y + 1, 10, 4, '#ffffff66'); }, { bias: -1 });
    });
    // timing ring on the pad the hopper will land on next
    if (this.state === 'play') for (let k = 0; k < this.N; k++) {
      const du = this.hitTime(k) - this.t; if (this.judged[k] !== null || du > 1.1 || du < -.15) continue;
      const pad = this.pads[k + 1], rad = 5 + clamp(du, 0, 1.1) * 16, near = Math.abs(du) < .05;
      r.queue(pad.x, pad.y, 0, gg => { const pts = r.groundPts(pad.x, pad.y, rad, 18, .6); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; px.line(gg, Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), near ? '#fff06a' : '#ffffff', 1); } }, { emissive: true });
    }
    r.shadow(this.hp.x, this.hp.y || 0, 5, .3);
    r.actor(this.hp.x, this.hp.y || 0, this.hp.z, (gg, ox, oy) => this.rig.draw(gg, ox, oy, r.view));
    for (const d of this.drops) r.queue(d.x, d.y, d.z, gg => { const [x, y] = r.w(d.x, d.y, d.z); px.rect(gg, Math.round(x), Math.round(y), 1, 2, '#c8f4ff'); });
    r.overlay(gg => {
      G.panel(gg, 4, 4, 110, 26); G.text(gg, 'POOL HOP', 10, 8, '#ffd24a'); G.text(gg, 'Score ' + this.score, 10, 19, '#fff'); G.text(gg, this.combo > 1 ? 'x' + this.combo + ' combo' : '', 108, 19, '#fff06a', { align: 'right' });
      const k = clamp((this.t - this.lead) / (this.N * this.beat), 0, 1); px.rect(gg, 4, 34, 110, 3, '#06141c'); px.rect(gg, 4, 34, Math.round(110 * k), 3, '#9bffb0');
      if (this.pop) E.font.title(gg, this.pop.text, W / 2, Math.round(H * .6), { align: 'center', scale: 1, colors: [this.pop.col, '#ffffff'], depth: 1 });
      if (this.t < this.lead) G.text(gg, 'Press ' + G.label('play') + ' on the beat when the ring closes!', W / 2, Math.round(H * .2), '#fff', { align: 'center' });
      if (this.state === 'done') { const w = 200, x = Math.round(W / 2 - w / 2); G.panel(gg, x, 40, w, 84); E.font.title(gg, this.score > 1800 ? 'SPLASH HIT!' : 'NICE HOPS', W / 2, 46, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'] }); G.text(gg, 'Score ' + this.score, W / 2, 72, '#fff', { align: 'center' }); G.text(gg, this.summary.perfect + ' perfect · ' + this.summary.good + ' good · ' + this.summary.miss + ' splashes', W / 2, 84, '#bfe9ee', { align: 'center' }); G.text(gg, 'Best combo ' + this.best, W / 2, 96, '#fff06a', { align: 'center' }); }
    });
    if (this.menu) this.menu.draw(r); else G.drawPrompts(r, [['play', 'Hop'], ['pause', 'Pause']]);
  }
});

/* ===== 41-casino.js ===== */
/* 41-casino: Casino Fortuna. Fortuna Sevens (pachislot with an internal lottery and skill stops), blackjack, roulette. */
const CR = () => G.rng('casino');
const BETS = [50, 100, 250, 500, 1000];

/* the three table games share a frame: a felt background, the wallet, a bet chooser and a leave button */
class Table {
  constructor(back, title) { this.back = back; this.title = title; this.bet = 1; this.msg = ''; this.t = 0; this.menu = null; }
  get stake() { return Math.min(BETS[this.bet], G.state.money); }
  betInput() {
    const I = G.game.input;
    if (I.pressed('left')) { this.bet = Math.max(0, this.bet - 1); G.sfx('select'); }
    if (I.pressed('right')) { this.bet = Math.min(BETS.length - 1, this.bet + 1); G.sfx('select'); }
  }
  frame(r, felt) {
    const W = r.W, H = r.H, s = G.state;
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#3a0a1e'); px.rect(g, 6, 22, W - 12, H - 44, felt || '#12684a'); E.ui.box(g, 6, 22, W - 12, H - 44, { bg: [felt || '#12684a', '#0a4a34'], border: '#c8962a' });
      E.font.title(g, this.title, W / 2, 5, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 1, depthColor: '#5a1030' });
      G.text(g, 'Wallet ' + G.fmtMoney(s.money), 8, 8, '#9bffb0'); G.text(g, 'Net ' + (s.stats.casinoNet >= 0 ? '+' : '') + G.fmtMoney(s.stats.casinoNet), W - 8, 8, s.stats.casinoNet >= 0 ? '#9bffb0' : '#ffb0a0', { align: 'right' });
    });
  }
  betBar(r, y) { r.overlay(g => { const W = r.W; G.text(g, '◀  BET ' + G.fmtMoney(this.stake) + '  ▶', W / 2, y, '#fff6c8', { align: 'center' }); if (this.msg) G.text(g, this.msg, W / 2, y + 12, '#ffd24a', { align: 'center' }); }); }
  win(n) { const s = G.state; s.money += n; s.stats.casinoNet += n; if (n > 0) s.stats.earned += n; }
}

/* ---- Fortuna Sevens ---- */
const SYM = [['7', '#ff4f6a'], ['BAR', '#ffffff'], ['CHERRY', '#ff6a8a'], ['BELL', '#ffd24a'], ['STAR', '#fff06a'], ['SHELL', '#ffb0c8'], ['7', '#ff4f6a'], ['BELL', '#ffd24a'], ['CHERRY', '#ff6a8a'], ['STAR', '#fff06a']];
const PAY = { '7': 50, BAR: 15, BELL: 8, CHERRY: 4, SHELL: 3 };
class Slots extends Table {
  constructor(back) { super(back, 'FORTUNA SEVENS'); this.reels = [{ pos: 0, v: 0, on: false }, { pos: 3, v: 0, on: false }, { pos: 6, v: 0, on: false }]; this.state = 'idle'; this.stopN = 0; this.target = null; this.lines = ''; }
  lottery() {
    const x = CR()(); if (x < .03) return '7'; if (x < .08) return 'BAR'; if (x < .16) return 'BELL'; if (x < .31) return 'CHERRY'; if (x < .43) return 'SHELL'; return null;
  }
  spin() {
    if (G.state.money < 10) { this.msg = 'You are out of money. The house sends sympathy.'; return; }
    this.paid = this.stake; G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.target = this.lottery(); this.state = 'spin'; this.stopN = 0; this.msg = 'Press ' + G.label('confirm') + ' to stop each reel!';
    this.reels.forEach(rl => { rl.on = true; rl.v = 14 + CR()() * 6; }); G.sfx('slotSpin');
  }
  stopReel(i) {
    const rl = this.reels[i]; rl.on = false; let p = Math.round(rl.pos) % SYM.length;
    if (this.target) {            // skill assist: slide up to 2 positions toward the lotteried symbol
      for (const d of [0, 1, -1, 2, -2]) { const q = (p + d + SYM.length * 4) % SYM.length; if (SYM[q][0] === this.target) { p = q; break; } }
    } else {                      // no win: avoid completing a line
      const prev = this.reels.slice(0, i).filter(x => !x.on).map(x => SYM[Math.round(x.pos) % SYM.length][0]);
      if (i === 2 && prev.length === 2 && prev[0] === prev[1] && SYM[p][0] === prev[0]) p = (p + 1) % SYM.length;
    }
    rl.pos = p; G.sfx('slotStop');
  }
  update(dt) {
    this.t += dt; const I = G.game.input;
    for (const rl of this.reels) if (rl.on) rl.pos = (rl.pos + rl.v * dt * 3) % SYM.length;
    if (this.state === 'idle') { this.betInput(); if (I.pressed('confirm') || I.pressed('play')) this.spin(); }
    else if (this.state === 'spin') {
      if (I.pressed('confirm') || I.pressed('play')) { this.stopReel(this.stopN++); if (this.stopN >= 3) { this.state = 'pay'; this.pt = 0; } }
    } else if (this.state === 'pay') {
      this.pt += dt; if (this.pt > .5) {
        const s = this.reels.map(r => SYM[Math.round(r.pos) % SYM.length][0]);
        if (s[0] === s[1] && s[1] === s[2]) { const m = PAY[s[0]] || 3, w = this.paid * m; this.win(w); this.msg = s[0] === '7' ? 'JACKPOT! ' + G.fmtMoney(w) : 'WIN ' + G.fmtMoney(w) + '  (x' + m + ')'; G.sfx(s[0] === '7' ? 'jackpot' : 'coin'); if (s[0] === '7') G.game.shake(3); }
        else this.msg = 'No line. The reels shrug.';
        this.state = 'idle'; G.autosave && 0;
      }
    }
  }
  draw(r) {
    const W = r.W, H = r.H; this.frame(r, '#7a1030');
    r.overlay(g => {
      const cx = W / 2, y = 52, rw = 56, gap = 6, x0 = Math.round(cx - (rw * 3 + gap * 2) / 2);
      E.ui.box(g, x0 - 8, y - 8, rw * 3 + gap * 2 + 16, 84, { bg: ['#2a2a4a', '#12122a'], border: '#ffd24a' });
      this.reels.forEach((rl, i) => {
        const x = x0 + i * (rw + gap); E.ui.box(g, x, y, rw, 68, { bg: ['#fffaf0', '#e8dcc0'], border: '#8a6a3a' });
        for (let k = -1; k <= 1; k++) {
          const idx = ((Math.round(rl.pos) + k) % SYM.length + SYM.length) % SYM.length, frac = rl.on ? (rl.pos - Math.round(rl.pos)) * 22 : 0, yy = Math.round(y + 24 + k * 22 + frac);
          if (yy < y - 4 || yy > y + 60) continue; const sy = SYM[idx];
          px.rect(g, x + 4, Math.max(y + 2, yy - 2), rw - 8, 0, '#fff');
          if (yy >= y + 2 && yy <= y + 56) E.font.text(g, sy[0], x + rw / 2, yy + 3, sy[0] === '7' ? '#d41a3a' : '#2a2418', { align: 'center', outline: false, scale: sy[0] === '7' ? 2 : 1 });
        }
        if (rl.on) px.rect(g, x, y + 22, rw, 1, '#00000022');
      });
      px.rect(g, x0 - 6, y + 31, rw * 3 + gap * 2 + 12, 2, '#ff4f6a99');
      G.text(g, 'Payout: 7 7 7 x50  BAR x15  BELL x8  CHERRY x4  SHELL x3', cx, y + 82, '#fff6c8', { align: 'center' });
    });
    this.betBar(r, 142);
    G.drawPrompts(r, [['confirm', this.state === 'spin' ? 'Stop reel' : 'Spin'], ['cancel', 'Leave table']]);
  }
}

/* ---- Blackjack ---- */
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'], SUITS_C = [['S', '#2a2a3a'], ['H', '#d41a3a'], ['D', '#d41a3a'], ['C', '#2a2a3a']];
const total = h => { let t = 0, a = 0; for (const c of h) { const r = c.r; t += r === 0 ? 11 : r >= 9 ? 10 : r + 1; if (r === 0) a++; } while (t > 21 && a > 0) { t -= 10; a--; } return t; };
class Blackjack extends Table {
  constructor(back) { super(back, 'BLACKJACK'); this.state = 'bet'; this.player = []; this.dealer = []; this.deck = []; this.dealerName = 'PEPPER'; }
  draw1() { if (this.deck.length < 12) { this.deck = []; for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) this.deck.push({ r, s }); for (let i = this.deck.length - 1; i > 0; i--) { const j = Math.floor(CR()() * (i + 1)); [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; } } G.sfx('card'); return this.deck.pop(); }
  deal() {
    if (G.state.money < 10) { this.msg = 'No chips, no cards.'; return; }
    this.paid = this.stake; G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.player = [this.draw1(), this.draw1()]; this.dealer = [this.draw1(), this.draw1()]; this.state = 'play'; this.msg = '';
    this.menu = new G.Menu([{ label: 'Hit', onPick: () => this.hit() }, { label: 'Stand', onPick: () => this.stand() }, { label: 'Double down', onPick: () => this.double() }], { x: 'center', y: 150, w: 110, gap: 13 });
    if (total(this.player) === 21) { this.stand(true); }
  }
  hit() { this.player.push(this.draw1()); if (total(this.player) > 21) this.finish('bust'); else if (total(this.player) === 21) this.stand(); }
  double() { if (G.state.money < this.paid) { this.msg = 'Not enough to double.'; G.sfx('cancel'); return; } G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.paid *= 2; this.player.push(this.draw1()); if (total(this.player) > 21) this.finish('bust'); else this.stand(); }
  stand(bj) { this.state = 'dealer'; this.dt = 0; this.bj = bj; }
  finish(res) {
    const p = total(this.player), d = total(this.dealer); let w = 0;
    if (res === 'bust') { this.msg = 'BUST. ' + this.dealerName + ' pats the table gently.'; }
    else if (this.bj && p === 21 && this.player.length === 2 && !(d === 21 && this.dealer.length === 2)) { w = Math.round(this.paid * 2.5); this.msg = 'BLACKJACK! Pays 3:2.'; G.sfx('jackpot'); }
    else if (d > 21 || p > d) { w = this.paid * 2; this.msg = 'You win ' + G.fmtMoney(this.paid) + '!'; G.sfx('coin'); }
    else if (p === d) { w = this.paid; this.msg = 'Push. Money back.'; }
    else this.msg = this.dealerName + ' wins with ' + d + '.';
    if (w) this.win(w); this.state = 'bet'; this.menu = null; this.shown = true;
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'bet') { this.betInput(); if (G.game.input.pressed('confirm')) this.deal(); }
    else if (this.state === 'play') this.menu.update(dt);
    else if (this.state === 'dealer') { this.dt += dt; if (this.dt > .7) { this.dt = 0; if (total(this.dealer) < 17) this.dealer.push(this.draw1()); else this.finish(); } }
  }
  cards(g, hand, x, y, hide) { hand.forEach((c, i) => { const cx = x + i * 22; if (hide && i === 1) { E.ui.box(g, cx, y, 20, 28, { bg: ['#3a5ad0', '#1a2a80'], border: '#fff' }); return; } E.ui.box(g, cx, y, 20, 28, { bg: ['#ffffff', '#ece6d0'], border: '#3a3a4a' }); G.text(g, RANKS[c.r], cx + 3, y + 4, SUITS_C[c.s][1], { shadow: null }); G.text(g, SUITS_C[c.s][0], cx + 3, y + 15, SUITS_C[c.s][1], { shadow: null }); }); }
  draw(r) {
    const W = r.W; this.frame(r);
    r.overlay(g => {
      G.text(g, this.dealerName, W / 2, 28, '#ffd24a', { align: 'center' }); this.cards(g, this.dealer, Math.round(W / 2 - this.dealer.length * 11), 38, this.state === 'play'); if (this.dealer.length && this.state !== 'play') G.text(g, '' + total(this.dealer), W / 2, 69, '#fff', { align: 'center' });
      G.text(g, 'YOU', W / 2, 88, '#9bffb0', { align: 'center' }); this.cards(g, this.player, Math.round(W / 2 - this.player.length * 11), 98, false); if (this.player.length) G.text(g, '' + total(this.player), W / 2, 129, '#fff', { align: 'center' });
    });
    if (this.state === 'bet') { this.betBar(r, 142); G.drawPrompts(r, [['confirm', 'Deal'], ['cancel', 'Leave table']]); } else { r.overlay(g => G.text(g, this.msg, W / 2, 140, '#ffd24a', { align: 'center' })); if (this.menu) this.menu.draw(r); }
    if (this.state === 'bet' || this.state === 'dealer') { }
  }
}

/* ---- Roulette ---- */
const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
class Roulette extends Table {
  constructor(back) { super(back, 'ROULETTE'); this.state = 'bet'; this.choices = [{ k: 'red', n: 'Red' }, { k: 'black', n: 'Black' }, { k: 'odd', n: 'Odd' }, { k: 'even', n: 'Even' }, { k: 'low', n: '1-18' }, { k: 'high', n: '19-36' }, { k: 'num', n: 'Number' }]; this.ci = 0; this.num = 7; this.ang = 0; this.ball = 0; this.result = null; }
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (this.state === 'bet') {
      this.betInput(); if (I.pressed('up')) { this.ci = (this.ci + this.choices.length - 1) % this.choices.length; G.sfx('select'); } if (I.pressed('down')) { this.ci = (this.ci + 1) % this.choices.length; G.sfx('select'); }
      if (this.choices[this.ci].k === 'num') { if (I.pressed('tab') || I.repeat('up', .5, .1) && false) { } if (I.pressed('tabNext')) { this.num = (this.num + 1) % 37; } if (I.pressed('tab')) { this.num = (this.num + 36) % 37; } }
      if (I.pressed('confirm')) { if (G.state.money < 10) { this.msg = 'No money, no spin.'; return; } this.paid = this.stake; G.state.money -= this.paid; G.state.stats.casinoNet -= this.paid; this.state = 'spin'; this.st = 0; this.result = Math.floor(CR()() * 37); this.spinTo = 3 * TAU + (WHEEL.indexOf(this.result) / 37) * TAU; this.msg = ''; this.bet0 = this.choices[this.ci].k; G.sfx('roulette'); }
    } else if (this.state === 'spin') {
      this.st += dt; const k = clamp(this.st / 4, 0, 1), e = 1 - Math.pow(1 - k, 3); this.ball = -this.spinTo * e; this.ang += dt * (2.5 * (1 - e) + .2);
      if (Math.floor(this.st * 14) !== Math.floor((this.st - dt) * 14) && k < .9) G.sfx('roulette', { vol: .3 });
      if (k >= 1) this.settle();
    } else if (this.state === 'show') { this.st += dt; if (this.st > 1.4) this.state = 'bet'; }
  }
  settle() {
    const n = this.result, red = REDS.has(n), b = this.bet0; let w = 0;
    const ok = b === 'red' ? red : b === 'black' ? n > 0 && !red : b === 'odd' ? n > 0 && n % 2 === 1 : b === 'even' ? n > 0 && n % 2 === 0 : b === 'low' ? n >= 1 && n <= 18 : b === 'high' ? n >= 19 : n === this.num;
    if (ok) { w = b === 'num' ? this.paid * 36 : this.paid * 2; this.win(w); this.msg = n + (red ? ' red' : n ? ' black' : ' green') + '. You win ' + G.fmtMoney(w - this.paid) + '!'; G.sfx(b === 'num' ? 'jackpot' : 'coin'); } else this.msg = n + (red ? ' red' : n ? ' black' : ' green') + '. The ball does not care about you.';
    this.state = 'show'; this.st = 0;
  }
  draw(r) {
    const W = r.W; this.frame(r);
    r.overlay(g => {
      const cx = Math.round(W * .66), cy = 84, R = 52;
      px.disc(g, cx, cy, R + 4, '#3a2410'); px.disc(g, cx, cy, R, '#1a1a1a');
      for (let i = 0; i < 37; i++) { const a0 = this.ang + i / 37 * TAU, a1 = this.ang + (i + 1) / 37 * TAU, n = WHEEL[i], col = n === 0 ? '#1a8a3a' : REDS.has(n) ? '#c8203a' : '#111'; px.poly(g, [[cx + Math.cos(a0) * 20, cy + Math.sin(a0) * 20], [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R], [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R], [cx + Math.cos(a1) * 20, cy + Math.sin(a1) * 20]], col); }
      px.disc(g, cx, cy, 16, '#c8962a'); px.disc(g, cx, cy, 12, '#8a5a1a');
      const pocket = this.ang + ((this.result === null ? 0 : WHEEL.indexOf(this.result)) + .5) / 37 * TAU, ke = clamp(this.st / 4, 0, 1), ee = 1 - Math.pow(1 - ke, 3);
      const ba = this.state === 'bet' ? this.t * .5 : this.state === 'spin' ? pocket - this.spinTo * (1 - ee) : pocket; const br = R - 8;
      px.disc(g, Math.round(cx + Math.cos(ba) * br), Math.round(cy + Math.sin(ba) * br), 3, '#ffffff');
      if (this.result !== null && this.state !== 'bet') E.font.title(g, '' + this.result, cx, cy - 6, { align: 'center', scale: 2, colors: ['#ffffff', '#ffd24a'], depth: 1 });
      // bet list
      this.choices.forEach((c, i) => { const y = 32 + i * 14, sel = i === this.ci; E.ui.box(g, 14, y, 92, 12, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#0a4a34', '#06281c'], border: '#2a6a5a' }); G.text(g, c.n + (c.k === 'num' ? ' ' + this.num : ''), 20, y + 3, '#fff'); G.text(g, c.k === 'num' ? 'x36' : 'x2', 100, y + 3, '#ffd24a', { align: 'right' }); });
    });
    if (this.state === 'bet') { this.betBar(r, 142); G.drawPrompts(r, [['confirm', 'Spin'], ['tab', 'Number -'], ['tabNext', 'Number +'], ['cancel', 'Leave table']]); } else r.overlay(g => G.text(g, this.msg, W / 2, 142, '#ffd24a', { align: 'center' }));
  }
}

G.scenes.casino = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'casino', pausable: true,
  enter(d) {
    this.d = d; this.t = 0; G.music('casino'); G.game.focus(0, 0, 14);
    this.game = d.game === 'slots' ? new Slots(d.back) : d.game === 'bj' ? new Blackjack(d.back) : new Roulette(d.back);
  },
  update(dt) {
    this.t += dt; const I = G.game.input, tb = this.game;
    if (this.d.attract) {                                  // the attract mode plays the machine for you
      this.at = (this.at || 0) + dt; if (this.at > (this.d.time || 12)) { G.attractNext(); return; }
      if (G.state.money < 500) G.state.money = 5000;
      if (tb.state === 'idle' && this.at % 3 < dt * 1.5 + .02) tb.spin(); else if (tb.state === 'idle' && tb.t % 3 < .03) tb.spin();
      this.ast = (this.ast || 0) + dt; if (tb.state === 'spin' && this.ast > .55) { this.ast = 0; tb.stopReel(tb.stopN++); if (tb.stopN >= 3) { tb.state = 'pay'; tb.pt = 0; } }
      tb.update(dt); return;
    }
    tb.update(dt);
    const busy = tb.state === 'spin' || tb.state === 'dealer' || tb.state === 'play' || tb.state === 'pay' || (tb.state === 'show');
    if (I.pressed('cancel') && !busy) { G.game.go('location', { loc: this.d.back }); return; }
    if (I.pressed('cancel') && tb.state === 'play') { /* must finish the hand */ }
  },
  draw(r) { this.game.draw(r); }
});

/* ===== 42-photo.js ===== */
/* 42-photo: postcards (photo mode), the album, and the postcard painter used by the title. */
G.POST_CAPTIONS = ['Wish you were here (I am winning)', 'Greetings from Isla Fortuna!', 'Sunscreen: applied. Dignity: pending.', 'The sea says hi. It also says "pay up".', 'Tan lines are a love language', 'Day well spent, sand well kicked'];
G.FILTERS = [['Normal', null], ['Sunset', ['#ff8a3a', .22]], ['Noir', ['#000000', .0]], ['Lagoon', ['#2ab8e0', .2]], ['Rose', ['#ff4f8a', .18]]];
const imgCache = {};
G.drawPostcard = (g, card, x, y, w, h) => {
  if (card.img && typeof Image !== 'undefined') {
    let im = imgCache[card.id];
    if (!im) { im = imgCache[card.id] = new Image(); im.src = card.img; }
    if (im.complete && im.naturalWidth) { try { g.drawImage(im, x, y, w, h); return; } catch (e) { /* fall through */ } }
  }
  // procedural fallback: a sunset postcard
  const bands = ['#2a1a5a', '#8a2a7a', '#ff6a5a', '#ffb347', '#ffe08a']; bands.forEach((c, i) => px.rect(g, x, y + Math.floor(i * h * .5 / 5), w, Math.ceil(h * .5 / 5) + 1, c));
  px.rect(g, x, y + Math.round(h * .5), w, Math.round(h * .2), '#1a6a9a'); px.rect(g, x, y + Math.round(h * .7), w, h - Math.round(h * .7), '#f2d79a'); px.disc(g, x + Math.round(w * .7), y + Math.round(h * .5), 14, '#fff2c8');
  E.font.title(g, 'GREETINGS', x + w / 2, y + 8, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1 });
};

G.openPhoto = (place) => {
  const game = G.game; if (G.overlay.has('photo')) return;
  const s = G.state; if (!s) return;
  const ov = {
    name: 'photo', t: 0, fi: 0, zoom: 1, px: 0, py: 0, shot: 0, flash: 0, place: place || 'Isla Fortuna',
    enter() { this.px = game.cam.tx || 0; this.py = game.cam.ty || 0; this.zoom0 = game.zoom || 1; G.sfx('confirm'); },
    exit() { game.setZoom && game.setZoom(this.zoom0 || 1); },
    update(dt) {
      const I = game.input; this.t += dt;
      if (this.shot > 0) { this.shot--; if (this.shot === 0) this.capture(); return true; }
      if (this.flash > 0) this.flash -= dt;
      const mv = I.move(); const sc = this.scene = game.scene;
      if (sc && sc.me) { /* the scene keeps its camera; photo pans a free offset */ }
      this.px += mv[0] * 60 * dt; this.py += mv[1] * 60 * dt; game.focus((game.cam.tx || 0) * 0 + this.px, this.py, 10);
      if (I.pressed('tab')) { this.fi = (this.fi + 4) % 5; G.sfx('select'); } if (I.pressed('tabNext')) { this.fi = (this.fi + 1) % 5; G.sfx('select'); }
      if (I.down('play') || I.down('confirm')) { /* handled on press below */ }
      if (I.pressed('confirm') || I.pressed('play')) { this.shot = 2; this.flash = .3; G.sfx('shutter'); }
      if (I.pressed('cancel') || I.pressed('photo')) { G.overlay.pop(this); }
      const z = I.zoom && I.zoom(); if (z) { this.zoom = clamp(this.zoom * z, .8, 2.5); game.setZoom && game.setZoom(this.zoom); }
      if (I.pressed('up') && I.down('dive')) { this.zoom = clamp(this.zoom + .25, .8, 2.5); game.setZoom && game.setZoom(this.zoom); }
      return true;
    },
    capture() {
      const buf = game.screen && game.screen.buf; let img = null;
      try { if (buf && typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = 160; c.height = 90; const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(buf, 0, 0, buf.width, buf.height, 0, 0, 160, 90); img = c.toDataURL('image/jpeg', .75); } } catch (e) { img = null; }
      const who = (game.scene && game.scene.npcs ? game.scene.npcs.map(n => n.id) : []);
      const card = { id: 'pc' + Date.now() % 1e9 + s.album.length, loc: this.place, day: Math.min(5, s.day), slot: Math.min(2, s.slot), caption: G.rpick(G.POST_CAPTIONS, 'cosmetic'), img, who, filter: this.fi };
      s.album.push(card); s.stats.postcards = s.album.length; if (s.album.length > 12) s.album.shift();
      try { if (img) E.store.set('aoa-postcard', img); } catch (e) { /* blocked */ }
      G.toast('Postcard saved to the album!', '#9bffb0'); G.bus.emit('photo', { card });
    },
    draw(r) {
      if (this.shot > 0) return;
      const W = r.W, H = r.H, f = G.FILTERS[this.fi][1];
      r.overlay(g => {
        if (f && f[1] > 0) { px.blend ? px.blend(g, f[1], 'multiply', () => px.rect(g, 0, 0, W, H, f[0])) : 0; }
        if (this.fi === 2) { px.blend ? px.blend(g, .5, 'normal', () => px.rect(g, 0, 0, W, H, '#555555')) : 0; }
        // frame and thirds
        px.rect(g, 0, 0, W, 10, '#000000aa'); px.rect(g, 0, H - 10, W, 10, '#000000aa'); px.rect(g, 0, 0, 10, H, '#000000aa'); px.rect(g, W - 10, 0, 10, H, '#000000aa');
        for (const k of [1, 2]) { px.rect(g, Math.round(W * k / 3), 10, 1, H - 20, '#ffffff33'); px.rect(g, 10, Math.round(H * k / 3), W - 20, 1, '#ffffff33'); }
        G.text(g, 'POSTCARD  ' + G.FILTERS[this.fi][0].toUpperCase(), W / 2, 2, '#fff6c8', { align: 'center' });
        if (this.flash > 0) px.rect(g, 0, 0, W, H, '#ffffff');
      });
      G.drawPrompts(r, [['confirm', 'Shoot'], ['tab', 'Filter -'], ['tabNext', 'Filter +'], ['cancel', 'Exit']]);
    }
  };
  G.overlay.push(ov);
  return ov;
};

/* ===== 50-title.js ===== */
/* 50-title: title, main menu, How to Play, About & Credits, the touch-only notice, Beach Match setup. */
G.INFO = {
  source: 'Dead or Alive Xtreme Beach Volleyball',
  plan: 'PLAN.md (written by claude-opus-5-5 at max effort)',
  genre: 'Sports (arcade 2v2 beach volleyball) with life-sim (vacation calendar, friendship, shops) and minigames (rhythm, casino)',
  perspective: 'Side-on broadcast view for matches (with a serve cam); three-quarter view for places, map and menus',
  tech: 'my-3D2dge engine v0.85.2 (single-file build, patched), plain JavaScript, Web Audio synth, AI Hub session client 1.4.0',
  art: 'The engine\'s native style: HD pixel-rigged Humanoids on a PS1-resolution canvas, with new beach, court, crowd, casino and pool art',
  anim: 'Engine Humanoid rigs and E.MOVES (cast, overhead) with timed swing phases, dives, celebrations and per-game poses',
  audio: 'All code: 8 music tracks, a jingle, about 45 sound effects, Animalese-style voices per character. No audio files',
  online: 'AI Hub shared-world sessions (host runs the match, other copies send inputs); local 1-4 players on one machine',
  testing: 'Headless scripted tests with game.advance and game.debug (suites for rules, AI, flow, UI, hub) plus a few screenshots',
  research: 'Read the engine handoff and AI Hub README; knowledge of the source game, no web research beyond that',
  env: 'Claude Code CLI (headless); Linux; browser unknown',
  model: 'Anthropic, claude-sonnet-5-5, reasoning effort medium'
};

/* ---- the idle tracker used by the title and menu ---- */
G.idle = { t: 0, ptr: null };
G.idleStep = dt => {
  const I = G.game.input, p = I.pointer(); let act = I.anyPressed() || !!I.clicked() || Math.hypot(...I.move()) > .25;
  if (p) { if (G.idle.ptr && (Math.abs(p[0] - G.idle.ptr[0]) + Math.abs(p[1] - G.idle.ptr[1]) > 3)) act = true; G.idle.ptr = [p[0], p[1]]; }
  if (act) G.idle.t = 0; else G.idle.t += dt;
  return G.idle.t;
};
G.idleLimit = () => G.touchOnly ? 3 : 10;

const TITLE_CAST = ['mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines'];
const frontCommon = {
  setup(self) { self.t = 0; self.rigs = TITLE_CAST.map(id => G.rig(id, null, null, 1.4)); G.idle.t = 0; G.idle.ptr = null; G.game.focus(0, -20, 12); G.game.lights.enabled = false; },
  stage(self, dt) { TITLE_CAST.forEach((id, i) => { const x = (i - 2.5) * 44; self.rigs[i].update(dt, { x, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(self.t * .7 + i) * .25, pose: i === 0 ? 'cheer' : null, expr: 'smile' }); }); },
  drawStage(self, r, sc = 1) { TITLE_CAST.forEach((id, i) => { const x = (i - 2.5) * 44 * sc; r.shadow(x, 0, 7, .3); r.actor(x, 0, 0, (g, ox, oy) => self.rigs[i].draw(g, ox, oy, r.view)); }); }
};

G.scenes.title = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'title',
  enter() {
    frontCommon.setup(this); G.music('title'); G.attract = null;
    try { const im = E.store.get('aoa-postcard', null); if (im) { this.card = { id: 'title', img: im, caption: '', loc: '', day: 1, slot: 0 }; } } catch (e) { this.card = null; }
    if (G.state && G.attractSaved) { G.state = G.attractSaved; G.attractSaved = null; }
  },
  update(dt) {
    this.t += dt; frontCommon.stage(this, dt); const I = G.game.input;
    const idle = G.idleStep(dt);
    if (idle > G.idleLimit()) { G.startAttract(); return; }
    if (G.touchOnly) return;
    if (I.pressed('confirm') || I.pressed('start') || I.clicked() || I.pressed('play')) { G.sfx('confirm'); G.game.go('menu'); }
  },
  draw(r) {
    const W = r.W, H = r.H; const bg = G.beach(r, this.t, { horizon: .46 });
    frontCommon.drawStage(this, r);
    if (this.card) r.overlay(g => { const x = W - 74, y = H - 60; px.rect(g, x + 2, y + 2, 66, 40, '#00000066'); E.ui.box(g, x, y, 66, 40, { bg: ['#fffaf0', '#f0e6c8'], border: '#c8962a', gradient: false }); G.drawPostcard(g, this.card, x + 3, y + 3, 60, 28); G.text(g, 'Greetings!', x + 33, y + 31, '#3a2410', { align: 'center', shadow: null }); });
    r.overlay(g => {
      G.logo(g, W, 12, 3); G.text(g, G.TAGLINE, W / 2, 62, '#fff6c8', { align: 'center' });
      if (G.touchOnly) { G.panel(g, W / 2 - 95, H * .55, 190, 30); G.text(g, 'Controller or keyboard required', W / 2, H * .55 + 10, '#ffd24a', { align: 'center' }); }
      else if (Math.floor(this.t * 2) % 2 === 0) G.text(g, 'PRESS ' + G.label('confirm').toUpperCase() + ' TO START', W / 2, H - 22, '#ffffff', { align: 'center' });
      G.text(g, E.versionLabel ? E.versionLabel() : '', 4, H - 9, '#ffffff88');
    });
    if (G.touchOnly) {
      this.btn = [W / 2 - 40, H * .55 + 36, 80, 14];
      r.overlay(g => { E.ui.box(g, this.btn[0], this.btn[1], 80, 14, { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' }); G.text(g, 'SETTINGS', W / 2, this.btn[1] + 4, '#fff', { align: 'center' }); });
      const c = G.game.input.clicked(); if (c && G.hit(c, this.btn)) G.game.menu('settings');
    }
  }
});

G.scenes.menu = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'menu',
  enter() {
    frontCommon.setup(this); G.music('title'); G.attract = null; if (G.attractSaved) { G.state = G.attractSaved; G.attractSaved = null; }
    const game = G.game, latest = (() => { try { return game.saves.latest(); } catch (e) { return null; } })();
    const items = [];
    if (latest) items.push({ label: 'Continue', value: latest.place, onPick: () => { G.game.saves.load(latest.slot); } });
    items.push({ label: 'New Vacation', onPick: () => { G.state = G.newState((Date.now() % 100000) + 17); G.reseedWorld(); G.installSaves(game); G.game.go('invitation', { next: () => G.game.go('map') }); } });
    items.push({ label: 'Beach Match', onPick: () => G.game.go('exhibition') });
    items.push({ label: 'Postcards', onPick: () => { if (!G.state) { G.state = G.newState(1); } G.game.go('album', { back: 'menu' }); } });
    items.push({ label: 'How to Play', onPick: () => G.game.go('howto') });
    items.push({ label: 'Settings', onPick: () => G.game.menu('settings') });
    items.push({ label: 'About & Credits', onPick: () => G.game.go('about') });
    this.menu = new G.Menu(items, { x: 14, y: 84, w: 150, gap: 14, onCancel: () => G.game.go('title') });
  },
  update(dt) {
    this.t += dt; frontCommon.stage(this, dt);
    const idle = G.idleStep(dt); if (idle > G.idleLimit()) { G.startAttract(); return; }
    this.menu.update(dt);
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { horizon: .46 });
    r.shadow(0, 0, 1, 0);
    TITLE_CAST.forEach((id, i) => { const x = 90 + (i - 2.5) * 34; r.shadow(x, 6, 6, .3); r.actor(x, 6, 0, (g, ox, oy) => this.rigs[i].draw(g, ox, oy, r.view)); });
    r.overlay(g => { G.logo(g, W, 8, 2); });
    this.menu.draw(r);
    G.drawPrompts(r, [['confirm', 'Select'], ['cancel', 'Title']]);
  }
});

/* ---- How to Play ---- */
G.openHowto = () => { G.howtoBack = G.game.sceneName; if (G.game.paused) G.game.resume(); try { if (G.game.shell && G.game.shell.hide) G.game.shell.hide(); } catch (e) { /* none */ } G.overlay.push(G.howtoOverlay()); };
G.howtoOverlay = () => ({
  name: 'howto', i: 0,
  update() { const I = G.game.input; if (I.pressed('left') && this.i > 0) { this.i--; G.sfx('select'); } if (I.pressed('right') && this.i < G.HOWTO.length - 1) { this.i++; G.sfx('select'); } if (I.pressed('cancel') || I.pressed('pause')) G.overlay.pop(this); return true; },
  draw(r) { G.drawHowto(r, this.i); }
});
G.drawHowto = (r, i) => {
  const W = r.W, H = r.H, pg = G.HOWTO[i];
  r.overlay(g => {
    px.rect(g, 0, 0, W, H, '#0b2430ee'); E.font.title(g, 'HOW TO PLAY', W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
    G.panel(g, 20, 36, W - 40, 130); E.font.text(g, pg[0], W / 2, 42, '#ffd24a', { align: 'center', outline: false, shadow: '#000' });
    let y = 58; pg[1].forEach(p => { G.wrap(p, W - 64).forEach(ln => { G.text(g, ln, 30, y, '#ffffff'); y += 10; }); y += 6; });
    // controls table for this device
    if (i === 1) { const lines = [['Move', G.isPad() ? 'Left stick' : 'WASD / arrows'], ['Play', G.label('play')], ['Dive', G.label('dive')], ['Call "Mine!"', G.label('call')], ['Camera', G.label('cam')]]; lines.forEach((ln, k) => { G.text(g, ln[0], 40, y + k * 10, '#bfe9ee'); G.text(g, ln[1], 140, y + k * 10, '#fff6c8'); }); }
    G.text(g, (i + 1) + ' / ' + G.HOWTO.length, W / 2, H - 32, '#fff6c8', { align: 'center' });
  });
  G.drawPrompts(r, [['left', 'Prev'], ['right', 'Next'], ['cancel', 'Close']]);
};
G.scenes.howto = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'howto',
  enter() { this.i = 0; this.t = 0; G.game.focus(0, 0, 14); },
  update(dt) { this.t += dt; const I = G.game.input; if (I.pressed('left') && this.i > 0) { this.i--; G.sfx('select'); } if ((I.pressed('right') || I.pressed('confirm')) && this.i < G.HOWTO.length - 1) { this.i++; G.sfx('select'); } else if (I.pressed('confirm') && this.i >= G.HOWTO.length - 1) G.game.go('menu'); if (I.pressed('cancel')) G.game.go('menu'); const c = I.clicked(); if (c) { if (c[0] > G.game.W / 2 && this.i < G.HOWTO.length - 1) this.i++; else if (c[0] <= G.game.W / 2 && this.i > 0) this.i--; } },
  draw(r) { G.beach(r, this.t, { noPalms: true }); G.drawHowto(r, this.i); }
});

/* ---- About & Credits: Source Information, Testing, Engine and Prompt feedback ---- */
G.ABOUT = () => {
  const I = G.INFO, fb = G.FEEDBACK || {};
  return [
    ['SOURCE INFORMATION', [
      'Date: ' + G.DATE, 'Source: ' + I.source, 'Plan: ' + I.plan, 'Genre: ' + I.genre, 'Perspective: ' + I.perspective, 'Tech: ' + I.tech, 'Art direction: ' + I.art, 'Animation: ' + I.anim, 'Audio: ' + I.audio, 'Online: ' + I.online,
      'Testing: ' + I.testing, 'Research: ' + I.research, 'Environment: ' + I.env, 'Model: ' + I.model, 'Usage: ' + (fb.usage || 'unknown')]],
    ['TESTING FEEDBACK', fb.testing || ['unknown']],
    ['ENGINE FEEDBACK', fb.engine || ['unknown']],
    ['PROMPT FEEDBACK', fb.prompt || ['unknown']],
    ['CREDITS', ['Ahead or Alive: Xtreme Beach Volleyball is an original game inspired by Dead or Alive Xtreme Beach Volleyball.', 'Cast, story, art and sound are original. Built on my-3D2dge and the AI Hub session client.', 'Stay ahead. Stay alive. Stay tanned.']]
  ];
};
G.scenes.about = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'about',
  enter() { this.t = 0; this.page = 0; this.scroll = 0; G.game.focus(0, 0, 14); this.pages = G.ABOUT(); },
  update(dt) {
    this.t += dt; const I = G.game.input;
    if (I.pressed('left') && this.page > 0) { this.page--; this.scroll = 0; G.sfx('select'); } if (I.pressed('right') && this.page < this.pages.length - 1) { this.page++; this.scroll = 0; G.sfx('select'); }
    if (I.pressed('tab') || I.pressed('tabNext')) { this.page = (this.page + 1) % this.pages.length; this.scroll = 0; }
    if (I.pressed('down') || I.repeat('down', .3, .06)) this.scroll += 10; if (I.pressed('up') || I.repeat('up', .3, .06)) this.scroll = Math.max(0, this.scroll - 10);
    if (I.pressed('cancel')) G.game.go('menu');
    const c = I.clicked(); if (c && c[1] < 20) this.page = clamp(Math.floor(c[0] / ((G.game.W - 62) / this.pages.length)), 0, this.pages.length - 1);
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { noPalms: true });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430ee');
      this.pages.forEach((p, i) => { const w = Math.round((W - 62) / this.pages.length); E.ui.box(g, i * w + 1, 1, w - 2, 15, this.page === i ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a' }); G.text(g, p[0].split(' ')[0], i * w + w / 2, 5, '#fff', { align: 'center' }); });
      const pg = this.pages[this.page]; G.text(g, pg[0], W / 2, 20, '#ffd24a', { align: 'center' });
      const lines = []; pg[1].forEach(p => { G.wrap(p, W - 28).forEach(ln => lines.push(ln)); lines.push(''); });
      const maxS = Math.max(0, lines.length * 9 - (H - 54)); this.scroll = Math.min(this.scroll, maxS);
      const clipY0 = 32, clipY1 = H - 22;
      lines.forEach((ln, i) => { const y = clipY0 + i * 9 - this.scroll; if (y >= clipY0 - 2 && y < clipY1) G.text(g, ln, 12, y, '#ffffff'); });
    });
    G.drawPrompts(r, [['left', 'Prev'], ['right', 'Next'], ['down', 'Scroll'], ['cancel', 'Back']]);
  }
});

/* ---- Beach Match: exhibition setup for 1-4 local players ---- */
G.scenes.exhibition = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'exhibition',
  enter() {
    this.t = 0; G.music('promenade'); G.game.focus(0, 0, 14); const game = G.game;
    this.roster = ['you', 'mika', 'hana', 'gwen', 'ruby', 'tomo', 'ines', 'sonny', 'pepper'];
    this.slots = [{ c: 0, ctl: 1 }, { c: 1, ctl: 0 }, { c: 4, ctl: 0 }, { c: 5, ctl: 0 }]; this.i = 0; this.opt = { to: 7, time: 0, diff: 1 }; this.rows = ['slot0', 'slot1', 'slot2', 'slot3', 'to', 'time', 'diff', 'start'];
    game.allowJoin({ max: 4, onJoin: (inp, n) => { const free = this.slots.findIndex((s, k) => !s.ctl && k !== 0); if (free >= 0) this.slots[free].ctl = n; } });
    this.rigs = {}; this.msg = '';
  },
  exit() { G.game.allowJoin(false); },
  rig(id) { return this.rigs[id] || (this.rigs[id] = G.rig(id, null, null, 1.1)); },
  cfg() { const res = []; return { teams: [[this.roster[this.slots[0].c], this.roster[this.slots[1].c]], [this.roster[this.slots[2].c], this.roster[this.slots[3].c]]], to: this.opt.to, time: this.opt.time ? 'sunset' : undefined, skillBonus: [0, [-.15, 0, .15][this.opt.diff] - 0] }; },
  start() {
    const game = G.game, cfg = this.cfg(), ctl = this.slots.map(s => s.ctl ? Object.assign(G.localCtl(game.players[s.ctl - 1] || game.input), { pnum: s.ctl - 1 }) : { type: 'ai' });
    if (!ctl.some(c => c.type !== 'ai')) { this.msg = 'Give at least one slot a controller (press ' + G.label('confirm') + ' on a slot).'; return; }
    game.go('match', { cfg, ctl, humanTeam: 0, time: cfg.time, rematch: true, onEnd: () => G.game.go('exhibition') });
  },
  update(dt) {
    this.t += dt; const I = G.game.input, n = this.rows.length;
    if (I.pressed('up') || I.repeat('up', .35, .1)) { this.i = (this.i + n - 1) % n; G.sfx('select'); } if (I.pressed('down') || I.repeat('down', .35, .1)) { this.i = (this.i + 1) % n; G.sfx('select'); }
    const row = this.rows[this.i], dx = (I.pressed('right') || I.repeat('right', .35, .1) ? 1 : 0) - (I.pressed('left') || I.repeat('left', .35, .1) ? 1 : 0);
    if (row.startsWith('slot')) { const s = this.slots[+row[4]]; if (dx) { s.c = (s.c + dx + this.roster.length) % this.roster.length; G.sfx('select'); }
      if (I.pressed('confirm') || I.pressed('tab')) { const maxp = Math.max(1, G.game.players.length); s.ctl = (s.ctl + 1) > maxp ? 0 : s.ctl + 1; if (s.ctl === 0 && +row[4] === 0 && this.slots.every(q => !q.ctl)) s.ctl = 1; G.sfx('confirm'); } }
    else if (row === 'to' && dx) { this.opt.to = clamp(this.opt.to + dx * 2, 3, 15); G.sfx('select'); }
    else if (row === 'time' && dx) { this.opt.time = 1 - this.opt.time; G.sfx('select'); }
    else if (row === 'diff' && dx) { this.opt.diff = clamp(this.opt.diff + dx, 0, 2); G.sfx('select'); }
    else if (row === 'start' && I.pressed('confirm')) this.start();
    const c = I.clicked(); if (c) { for (let k = 0; k < n; k++) { const y = 46 + k * 15; if (c[1] >= y - 2 && c[1] < y + 12 && c[0] > 20 && c[0] < G.game.W - 20) { this.i = k; if (this.rows[k] === 'start') this.start(); else if (this.rows[k].startsWith('slot')) { const s = this.slots[+this.rows[k][4]]; if (c[0] > G.game.W / 2) { s.c = (s.c + 1) % this.roster.length; } else { s.ctl = (s.ctl + 1) > Math.max(1, G.game.players.length) ? 0 : s.ctl + 1; } } } } }
    if (I.pressed('cancel')) G.game.go('menu');
    for (const s of this.slots) this.rig(this.roster[s.c]).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2 + Math.sin(this.t) * .4 });
  },
  draw(r) {
    const W = r.W, H = r.H; G.beach(r, this.t, { noPalms: true });
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#0b2430cc'); E.font.title(g, 'BEACH MATCH', W / 2, 8, { align: 'center', scale: 2, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'], depth: 2, depthColor: '#5a1030' });
      G.text(g, 'Players on this machine: ' + Math.max(1, G.game.players.length) + '   (Start on another pad or 2 on the keyboard to join)', W / 2, 30, '#bfe9ee', { align: 'center' });
      this.rows.forEach((row, k) => {
        const y = 46 + k * 15, sel = k === this.i; E.ui.box(g, 20, y - 2, W - 40, 14, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .92 });
        if (row.startsWith('slot')) { const si = +row[4], s = this.slots[si], c = G.CAST[this.roster[s.c]]; G.text(g, (si < 2 ? 'Team A' : 'Team B') + ' ' + ((si % 2) + 1), 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + c.full.split(' ')[0] + ' ' + (c.style) + ' ▶', W / 2 - 10, y + 2, '#fff', { align: 'center' }); G.text(g, s.ctl ? 'P' + s.ctl : 'CPU', W - 26, y + 2, s.ctl ? E.PLAYER_COLORS[s.ctl - 1] : '#9ab', { align: 'right' }); }
        else if (row === 'to') { G.text(g, 'First to', 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + this.opt.to + ' ▶', W - 26, y + 2, '#fff', { align: 'right' }); }
        else if (row === 'time') { G.text(g, 'Time of day', 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + (this.opt.time ? 'Sunset' : 'Noon') + ' ▶', W - 26, y + 2, '#fff', { align: 'right' }); }
        else if (row === 'diff') { G.text(g, 'CPU skill', 26, y + 2, '#bfe9ee'); G.text(g, '◀ ' + ['Easy', 'Normal', 'Hard'][this.opt.diff] + ' ▶', W - 26, y + 2, '#fff', { align: 'right' }); }
        else G.text(g, 'START MATCH', W / 2, y + 2, '#ffffff', { align: 'center' });
      });
      if (this.msg) G.text(g, this.msg, W / 2, H - 28, '#ffb0a0', { align: 'center' });
    });
    G.drawPrompts(r, [['confirm', 'Change / Start'], ['cancel', 'Back']]);
  }
});

/* ===== 51-attract.js ===== */
/* 51-attract: after 10 seconds without input on the title or menu, an AI-played broadcast loops until any input.
 * The AI cheats freely: all-CPU matches, a Pool Hop that never misses, a slot machine that plays itself. */
G.ATTRACT = [
  { cap: 'Two-on-two beach volleyball. One button, perfect timing.', scene: 'match', data: () => ({ attract: true, cfg: { teams: [['mika', 'hana'], ['ruby', 'tomo']], to: 3, skipIntro: true, fastPoints: true, skillBonus: [.3, .3], attract: true }, ctl: [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }], humanTeam: 0, music: 'match' }) },
  { cap: 'Chat, gift and team up. Your partner plays better when you are close.', scene: 'location', data: () => ({ loc: 'courts', attract: true, time: 11 }) },
  { cap: 'Pool Hop: hop the lagoon on the beat.', scene: 'poolhop', data: () => ({ auto: true, attract: true, done: () => G.attractNext() }) },
  { cap: 'Shop the Promenade. Swimsuits, hats and gifts.', scene: 'location', data: () => ({ loc: 'promenade', attract: true, time: 10 }) },
  { cap: 'Casino Fortuna after dark: Fortuna Sevens, blackjack and roulette.', scene: 'casino', data: () => ({ game: 'slots', attract: true, back: 'casino', time: 12 }) },
  { cap: 'Serve Cam: the view from behind your team.', scene: 'match', data: () => ({ attract: true, camStart: 'servecam', cfg: { teams: [['gwen', 'you'], ['ines', 'sonny']], to: 3, skipIntro: true, fastPoints: true, skillBonus: [.3, .3], attract: true, house: true }, ctl: [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }], humanTeam: 0, music: 'match' }) },
  { cap: 'Snap postcards. Befriend everyone. Win the Fortuna Cup.', scene: 'location', data: () => ({ loc: 'pool', attract: true, time: 9 }) }
];
G.attract = null;
G.startAttract = () => {
  if (G.attract) return; G.attractSaved = G.state; G.state = G.newState(31); G.state.partner = 'mika'; G.state.slot = 2; G.state.day = 3; G.reseedWorld();
  G.attract = { i: 0, t: 0, start: G.game.real, ptr: null }; G.sfx('confirm', { vol: .3 }); G.attractNext();
};
G.attractNext = () => {
  if (!G.attract) return; const seg = G.ATTRACT[G.attract.i % G.ATTRACT.length]; G.attract.i++; G.attract.cap = seg.cap; G.attract.t = 0;
  G.game.go(seg.scene, seg.data());
};
G.stopAttract = () => { if (!G.attract) return; G.attract = null; if (G.attractSaved !== undefined) { G.state = G.attractSaved; G.attractSaved = null; } G.idle.t = 0; G.locState = null; G.game.weather = null; G.game.go('title'); };
G.attractExitCheck = dt => {
  const A = G.attract, I = G.game.input; A.t += dt; A.age = (A.age || 0) + dt; if (A.age < .6) { A.ptr = null; return false; }
  const p = I.pointer(); let act = I.anyPressed() || !!I.clicked() || Math.hypot(...I.move()) > .4;
  if (p) { if (A.ptr && Math.abs(p[0] - A.ptr[0]) + Math.abs(p[1] - A.ptr[1]) > 6) act = true; A.ptr = [p[0], p[1]]; }
  if (act && !G.touchOnly) { G.stopAttract(); return true; }
  return false;
};
G.drawAttract = r => {
  const A = G.attract; if (!A) return; const W = r.W, H = r.H;
  r.overlay(g => {
    px.rect(g, 0, H - 24, W, 24, '#000000b0'); G.text(g, A.cap || '', W / 2, H - 20, '#fff6c8', { align: 'center' });
    if (Math.floor(G.game.real * 1.5) % 2 === 0) G.text(g, G.touchOnly ? 'Controller or keyboard required' : 'PRESS ANY BUTTON', W / 2, H - 10, '#ffd24a', { align: 'center' });
    E.font.title(g, G.TITLE, W - 6, 4, { align: 'right', scale: 1, colors: ['#fff6c8', '#ffd24a'], depth: 1, depthColor: '#5a1030' });
  });
};

/* ===== 53-dev.js ===== */
/* 53-dev: dev mode, opened from the pause menu: tools, live tuning sliders with reset to defaults, and a state view. */
G.devRunning = false;
G.openDev = () => {
  const game = G.game; if (game.paused) game.resume();
  try { if (game.shell && game.shell.hide) game.shell.hide(); } catch (e) { /* none */ }
  if (G.overlay.has('dev')) return;
  G.overlay.push(G.makeDev());
};
G.devTools = () => {
  const game = G.game, s = () => G.state, sc = () => game.scene, m = () => sc() && sc().m;
  const need = () => { if (!G.state) { G.state = G.newState(1234); G.reseedWorld(); G.installSaves(game); } return G.state; };
  return [
    { label: 'Add S$5,000', run: () => { need(); G.earn(5000); G.toast('+S$5,000'); } },
    { label: 'Max friendship with all', run: () => { need(); for (const k in s().aff) s().aff[k] = 100; G.toast('Everyone adores you'); } },
    { label: 'Unlock every suit, hat and gift', run: () => { need(); s().owned.suits = G.SUITS.map(x => x.id); s().owned.hats = G.HATS.map(x => x.id); G.GIFTS.forEach(g => { s().bag[g.id] = 3; }); G.toast('Everything unlocked'); } },
    { label: 'Skip this time slot', run: () => { need(); if (G.state.day <= 5) { G.finishSlot(); G.overlay.pop(G.devOverlay); } } },
    { label: 'Jump to day 5 morning', run: () => { need(); s().day = 5; s().slot = 0; G.game.go('map'); G.overlay.pop(G.devOverlay); } },
    { label: 'Win the current match (score it)', run: () => { const mm = m(); if (mm && mm.phase !== 'end') { mm.score[0] = mm.to - 1; mm.score[1] = Math.min(mm.score[1], mm.to - 3); mm.pointTo(0, 'floor'); } else G.toast('Not in a match'); } },
    { label: 'Lose the current match', run: () => { const mm = m(); if (mm && mm.phase !== 'end') { mm.score[1] = mm.to - 1; mm.score[0] = Math.min(mm.score[0], mm.to - 3); mm.pointTo(1, 'floor'); } else G.toast('Not in a match'); } },
    { label: 'Spectate: all CPU match', run: () => { G.overlay.pop(G.devOverlay); game.go('match', { cfg: { teams: [['mika', 'hana'], ['ruby', 'tomo']], skillBonus: [.2, .2] }, ctl: [{ type: 'ai' }, { type: 'ai' }, { type: 'ai' }, { type: 'ai' }], humanTeam: 0 }); } },
    { label: 'Quick match vs the House', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('match', { cfg: G.storyMatch('final'), humanTeam: 0 }); } },
    { label: 'Toggle slow motion (0.4x)', run: () => { G.T.timeScale = G.T.timeScale < 1 ? 1 : .4; } },
    { label: 'Toggle debug overlay', run: () => { G.devHud = !G.devHud; } },
    { label: 'Keep world running behind panel: ' + (G.devRunning ? 'on' : 'off'), run: () => { G.devRunning = !G.devRunning; G.toast('World running: ' + G.devRunning); } },
    { label: 'Go to: map', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('map'); } },
    { label: 'Go to: Pool Hop', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('poolhop', { done: () => game.go('map') }); } },
    { label: 'Go to: casino (slots)', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('casino', { game: 'slots', back: 'casino' }); } },
    { label: 'Go to: farewell party / ending', run: () => { need(); G.overlay.pop(G.devOverlay); game.go('ending'); } },
    { label: 'Go to: title', run: () => { G.overlay.pop(G.devOverlay); G.state = null; game.go('title'); } }
  ];
};
G.makeDev = () => {
  const game = G.game;
  const ov = {
    name: 'dev', tab: 0, ti: 0, list: null,
    enter() { G.devOverlay = this; this.tools = new G.Menu(G.devTools().map(t => ({ label: t.label, onPick: () => { t.run(); this.refresh(); } })), { x: 10, y: 34, w: 220, gap: 11, onCancel: () => G.overlay.pop(this) }); this.tools.rows = 11;
      this.sl = new G.SliderList(G.TUNING, k => G.T[k], (k, v) => { G.T[k] = v; G.saveTuning(); }, { x: 10, y: 34, w: 300, rows: 10, gap: 13 }); },
    exit() { G.devRunning = false; G.devOverlay = null; },
    refresh() { this.tools.items.forEach((it, i) => { const t = G.devTools()[i]; it.label = t.label; }); },
    update(dt) {
      const I = game.input;
      if (I.pressed('tab') || I.pressed('tabNext')) { this.tab = (this.tab + 1) % 3; G.sfx('select'); }
      if (this.tab === 0) this.tools.update(dt); else if (this.tab === 1) { this.sl.update(dt); if (I.pressed('confirm') || I.pressed('call')) { G.resetTuning(); G.toast('Balance reset to defaults'); } }
      if (I.pressed('cancel') || I.pressed('pause')) G.overlay.pop(this);
      const c = I.clicked(); if (c && c[1] < 20) this.tab = clamp(Math.floor(c[0] / ((game.W - 62) / 3)), 0, 2);
      return true;
    },
    draw(r) {
      const W = r.W, H = r.H;
      r.overlay(g => {
        px.rect(g, 0, 0, W, H, '#050f16dd'); ['TOOLS', 'BALANCE', 'STATE'].forEach((n, i) => { const w = Math.round((W - 62) / 3); E.ui.box(g, i * w + 1, 1, w - 2, 15, this.tab === i ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a' }); G.text(g, 'DEV  ' + n, i * w + w / 2, 5, '#fff', { align: 'center' }); });
        if (this.tab === 2) {
          const s = G.state, mm = game.scene && game.scene.m, lines = [];
          lines.push('scene: ' + game.sceneName + '  fps: ' + game.fps + '  errors: ' + game.errors.length);
          if (s) { lines.push('day ' + s.day + ' slot ' + s.slot + '  money ' + s.money + '  partner ' + s.partner); lines.push('aff ' + Object.keys(s.aff).map(k => k + ':' + s.aff[k]).join(' ')); lines.push('stats ' + JSON.stringify(s.stats)); } else lines.push('no vacation loaded');
          if (mm) { lines.push('match ' + mm.score.join('-') + ' phase ' + mm.phase + ' rally ' + mm.rallyN + ' ball ' + mm.ball.x.toFixed(0) + ',' + mm.ball.y.toFixed(0) + ',' + mm.ball.z.toFixed(0)); lines.push('stats ' + JSON.stringify(mm.stats)); }
          lines.forEach((ln, i) => G.wrap(ln, W - 20).forEach((l2, j) => G.text(g, l2, 10, 26 + i * 22 + j * 9, '#bfe9ee')));
        }
      });
      if (this.tab === 0) { const m = this.tools, all = m.items, idx = m.i, first = clamp(idx - 5, 0, Math.max(0, all.length - 11)); m.items = all.slice(first, first + 11); m.i = idx - first; m.draw(r); m.items = all; m.i = idx; G.drawPrompts(r, [['confirm', 'Run'], ['tab', 'Next tab'], ['cancel', 'Close']]); }
      else if (this.tab === 1) { this.sl.draw(r); r.overlay(g => G.text(g, 'Live: changes apply now. ' + G.label('confirm') + ' resets everything to defaults.', W / 2, H - 28, '#ffd24a', { align: 'center' })); G.drawPrompts(r, [['confirm', 'Reset to defaults'], ['dive', 'Hold: fast'], ['tab', 'Next tab'], ['cancel', 'Close']]); }
      else G.drawPrompts(r, [['tab', 'Next tab'], ['cancel', 'Close']]);
    }
  };
  return ov;
};
// the windowed Menu needs input to operate on the visible slice, as the shop does
(() => { const M = G.Menu.prototype; if (!M._winPatched) { M._winPatched = true; } })();

/* ===== 99-main.js ===== */
/* 99-main: build the game, register scenes, hub detection, boot. */
G.touchOnly = (() => { try { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(any-pointer: fine)').matches === false && (navigator.maxTouchPoints || 0) > 0; } catch (e) { return false; } })();
G.pauseItems = () => [
  ['Dev Mode', () => { if (G.openDev) G.openDev(); }],
  ['How to Play', () => { if (G.openHowto) G.openHowto(); }]
];
G.build = () => {
  const hub = G.hub;
  const game = G.game = new E.Game({ canvas: 'screen', res: 'ps1', expand: true, view: 'court', id: 'ahead-or-alive', bg: '#0a2d3d',
    menu: hub ? false : { items: G.pauseItems(), settings: [
      { key: 'voices', label: 'Voices', group: 'Sound', type: 'slider', value: .8, apply: (g, v) => { g.audio.voiceVolume = v; if (g.audio._voxBus) g.audio._voxBus.gain.value = v; } },
      { key: 'difficulty', label: 'CPU difficulty', group: 'Game', options: ['Easy', 'Normal', 'Hard'], value: 'Normal', apply: (g, v) => { G.T.aiSkill = v === 'Easy' ? .3 : v === 'Hard' ? .8 : .55; } }
    ], controls: { play: 'Play', dive: 'Dive', call: 'Call', cam: 'Camera' }, quit: 'menu', saves: { slots: 3 } },
    autoPause: !hub, corner: !hub, fullscreen: hub ? false : true, touch: G.touchOnly ? 'never' : 'auto' });
  game._gameOpts = game.o;
  G.installAudio(game); G.installSaves(game);
  try { game.saves.canSave = true; } catch (e) { /* ok */ }
  if (G.touchOnly) { try { game.settings.set('touch', 'off'); } catch (e) { /* ok */ } }
  return game;
};
G.startGame = () => {
  const game = G.game || G.build();
  const scenes = {}; for (const k in G.scenes) scenes[k] = G.scenes[k];
  G.firstScene = G.hub ? 'hub' : 'title';
  game.start({ scenes, scene: G.firstScene });
  game.debug = G.debug();
  return game;
};
G.debug = () => ({
  snapshot() {
    const g = G.game, s = g.scene; const o = { scene: g.sceneName, errors: g.errors.length, attract: !!G.attract };
    if (s && s.m) o.match = s.m.state();
    if (G.state) o.state = { day: G.state.day, slot: G.state.slot, money: G.state.money, partner: G.state.partner, aff: G.state.aff };
    return o;
  },
  G,
  tools: { state: () => G.state, newVacation(seed = 5) { G.state = G.newState(seed); G.reseedWorld(); return G.state; } }
});
if (typeof document !== 'undefined' && document.getElementById('screen') && !window.__AOA_NOBOOT) { G.startGame(); const b = document.getElementById('e3-boot'); if (b) b.remove(); }

G.FEEDBACK = {"usage":"unknown (no cost or token figures are exposed to the session; the session ran as a single Claude Code CLI agent with no subagents)","testing":["Testing caught about 9 real issues: input presets that dropped confirm/cancel, a stale map node list that could skip a story beat, tab actions missing from the match preset (dev panel crashed with warnings), a CPU partner that yielded to the human so both stood still, a missing heart glyph, over-zoomed place scenes, a roulette ball that jumped, and a menu hover test that needed a real browser. A further handful were mistakes in my own test scripts.","Two were game breaking: the missing confirm/cancel actions (every menu was dead on keyboard and pad) and the stale map state that could silently skip the story beat for the reveal.","The scripted full playthrough (autopilot plays every story match, shops, gifts, casino, Pool Hop, photos, save/load, endings) plus the AI Hub harness runs (2 and 4 players, host-leave, server). Together they exercise nearly every scene in about a minute.","The headless menu hover test: draw is skipped headless so there were no click targets to test. It had to move into a real browser test. A few early checks that always passed ('|| true') were also useless and were tightened."],"engine":["Headless play with game.advance and game.debug, the fixed 1/120 s clock, the ready-made Humanoid rigs with E.MOVES, and the Shell: pause menu, settings, controls, saves and full screen came for free and worked on the first try. E.View made the broadcast and serve cameras a one-line job.","Yes. A custom input preset object replaces the defaults, so confirm, cancel and start vanished until I merged E.Input.DEFAULT in (the card says every preset has them). Menu click targets only exist after a draw, so headless tests cannot click. game.go fades, so scene switches need { fade: 0 } in tests. The pixel font had no PlayStation symbols or hollow heart.","The whole volleyball simulation (closed-form ball flight, referee, timing judge, AI with intercept prediction and chemistry), the 10-foot canvas UI kit (menus, sliders, glyph prompts, node navigation), walkable places, the casino, Pool Hop, photo mode, the attract director, the AI Hub driver and the Animalese voices.","Scenery and props under the no-arc, no-gradient pixel rule: knowing which helpers exist, depth-sorting a net that spans the whole court, and getting swimwear and distinct hairstyles out of a Humanoid that only has shirts, tunics and five hair styles. Windowed lists also needed a hack because Menu has no scrolling.","In my-3d2dge.js: (1) PlayStation symbols and arrows added to the 5x7 font; (2) 'glyphs' setting is now a PlayStation/Xbox choice in the Game group, default PlayStation; (3) Dialog.voice may be a per-letter function, for Animalese; (4) default input glyph style is PlayStation; (5) touch: 'never' option hides touch controls for good; (6) a third audio bus for voices (audio.bus('voice'), voiceVolume) behind a Voices setting. (7) a Humanoid extras hook (rig.extras) drawn at the projected head, used for sunglasses, hair flowers and a sweat band. Not done from the plan: a dedicated swimwear outfit, new hair/hat styles and extra music-instrument options.","Make custom input presets extend the defaults (or warn loudly), and add first-class swimwear, more hair styles and a scrolling Menu widget."],"prompt":["A concrete deliverable list (dev mode with live sliders and reset, 10 s attract, controller-first prompts with glyph options, hub integration, single file) and a detailed plan. The 'feature-complete vertical slice, no stubs' bar kept me honest.","How much of the 2,000-line plan is mandatory when the effort setting is medium. Names also differ between plan and TASK.md (file names, dev folder), and the plan lists engine patches (swimwear, audio buses, reserved combo) that are far larger than the 'change anything' wording suggests.","Breadth: more than a dozen systems (match sim and AI, calendar, shops, social, casino, rhythm, photo, hub, local multiplayer, attract, dev mode, audio, UI) all had to be complete and tested in one session without stubs.","Mark must-have versus nice-to-have in the plan, or size the feature list to the effort level. Say outright which plan paths and names are overridden by TASK.md so none need guessing."]};

})();
