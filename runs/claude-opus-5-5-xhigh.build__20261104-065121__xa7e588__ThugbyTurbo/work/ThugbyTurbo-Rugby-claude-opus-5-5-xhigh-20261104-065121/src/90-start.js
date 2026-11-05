/* ---- START: the game, its settings and pause menu, the boot, deep links, touch-only mode, game.debug ---- */
const AIH = typeof AIHub !== 'undefined' ? AIHub : null;
const SESSION = TT.SESSION = !!(AIH && AIH.active);
const SETTINGS = [
  { key: 'glyphs', group: 'Display', label: 'Controller buttons', type: 'select', value: 'playstation', options: [['playstation', 'PlayStation ✕ ○ □ △'], ['xbox', 'Xbox A B X Y']], help: 'The button symbols in every prompt when you play with a controller', apply: (g, v) => { (g.players || [g.input]).forEach(p => { p.glyphs = v; }); } },
  { key: 'uiScale', group: 'Display', label: 'TV text size', type: 'select', value: 'Large', options: ['Large', 'Normal'], help: 'Large: bigger prompts in play and bigger menu screens, for a TV across the room', apply: (g, v) => { if (typeof document !== 'undefined' && document.body) document.body.classList.toggle('tt-large', v === 'Large'); } },
  { key: 'camera', group: 'Display', label: 'Camera', type: 'select', value: 'Broadcast', options: ['Broadcast', 'High', 'Overhead'], help: 'The match camera (V or R3 cycles it in play)' },
  { key: 'difficulty', group: 'Game', label: 'Difficulty', type: 'select', value: 'Pro', options: ['Pro', 'Rookie', 'Legend'], help: 'How sharp the CPU is. Each cup opponent is shifted one step from its own level' },
  { key: 'halves', group: 'Game', label: 'Half length', type: 'select', value: '2 min', options: ['2 min', '3 min', '4 min', '5 min'], help: 'Minutes of running clock a half (the TV clock shows sevens time)' },
  { key: 'suddenDeath', group: 'Game', label: 'Sudden death in Exhibition', type: 'select', value: 'On', options: ['On', 'Off'], help: 'Level at full time: the next score wins (the cup always plays it)' },
  { key: 'autoSwitch', group: 'Game', label: 'Auto-switch', type: 'select', value: 'Assisted', options: ['Assisted', 'Full', 'Manual'], help: 'Assisted: to the best defender when the ball is passed or kicked. Full: always. Manual: buttons and mouse only' },
  { key: 'passAssist', group: 'Game', label: 'Pass assist', type: 'select', value: 'On', options: ['On', 'Off'], help: 'On: a pass button with nobody on that side throws to the other side. Off: it is a dummy' },
  { key: 'turboMode', group: 'Game', label: 'Turbo', type: 'select', value: 'Hold', options: ['Hold', 'Toggle'] },
  { key: 'commentary', group: 'Game', label: 'Commentary', type: 'select', value: 'On', options: ['On', 'Text only', 'Off'] },
  { key: 'replays', group: 'Game', label: 'Replays', type: 'select', value: 'Big moments', options: ['Big moments', 'All tries', 'Off'] },
  { key: 'refCone', group: 'Game', label: 'Show the ref\'s view', type: 'select', value: 'On', options: ['On', 'Off'], help: 'His sight cone on the grass: foul behind his back at your own risk' },
  { key: 'bigHeads', group: 'Game', label: 'Big heads (win the Mega Cup to unlock)', type: 'select', value: 'Off', options: ['Off', 'On'], apply: (g, v) => { TT.cheats.bigHeads = v === 'On' && TT.unlocked('cup'); if (MS.pres) MS.pres.bigHeads(TT.cheats.bigHeads); } },
  { key: 'crowd', group: 'Sound', label: 'Crowd volume', type: 'slider', value: .8 }
];
const pauseItems = () => {
  const g = TT.game;
  if (SESSION || g.sceneName !== 'match' || !MS.data || MS.data.attract) return [];
  const out = [];
  if (!MS.data.session) out.push(['Restart match', () => { g.resume(); g.go('match', Object.assign({}, MS.data, { seed: TT.newSeed() })); }]);
  out.push(['Dev mode', () => { g.resume(); TT.dev.openPanel(); }]);
  return out;
};
const game = TT.game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'broadcast', id: 'thugby-turbo', input: KEYS, bg: '#05060a',
  autoPause: !SESSION, corner: !SESSION, fullscreen: SESSION ? false : undefined,
  menu: SESSION ? { quit: false, items: [], settings: SETTINGS, controls: TT.ACTION_NAMES } : { items: pauseItems, settings: SETTINGS, controls: TT.ACTION_NAMES, quit: 'title' }
});
TT.unlocked = k => !!(TT.store.get('thugby:unlocks', {}) || {})[k];
TT.unlock = k => { const u = Object.assign({}, TT.store.get('thugby:unlocks', {}) || {}); u[k] = true; if (!TT.noStore) TT.store.set('thugby:unlocks', u); };
game.settings.set && game.settings.glyphs && (game.input.glyphs = game.settings.glyphs);
TUNE.load();
TT.sound.init(game);
TT.arcade = new E.Arcade(game, { id: 'thugby', idle: 10, demo: 600, scores: 8, hud: false, colors: ['#ffe060', '#ffffff', '#ffb347'] });
// the records' tables start with the cast's initials
for (const mode in TT.RECORD_SEED) if (!TT.arcade.table(mode).length && !HEADLESS) E.store.set('arcade:thugby:' + mode, TT.RECORD_SEED[mode].map(([name, score]) => ({ name, score })));
/** joiners get the game's glyphs too */
TT.applyGlyphs = () => { for (const p of game.players) p.glyphs = game.settings.glyphs; };
/* ---- touch-only devices: no touch controls; "Controller or keyboard required" and the Settings button ---- */
TT.touchOnly = false;
if (!HEADLESS && typeof matchMedia === 'function') {
  const coarse = matchMedia('(any-pointer: coarse)').matches, fine = matchMedia('(any-pointer: fine)').matches;
  TT.touchOnly = coarse && !fine && !(navigator.getGamepads && Array.from(navigator.getGamepads() || []).some(Boolean));
  const leave = () => { if (TT.touchOnly) { TT.touchOnly = false; } };
  addEventListener('gamepadconnected', leave); addEventListener('keydown', leave);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') leave(); });
}
// no touch controls anywhere (TASK: a controller or a keyboard is required): the touch stick stays off whatever a scene or
// the engine's touch setting asks (they would turn it back on as each scene sets its, empty, touch buttons)
Object.defineProperty(game.input, 'touchEnabled', { get: () => false, set() {}, configurable: true });
/* ---- the scenes ---- */
const scenes = Object.assign({}, TT.scenes);
/* ---- deep links (#title, #menu, #cup, #training, #training/3, #match, #match/docks, #attract, #records, #about, #credits, #card) ---- */
const [first, part] = (typeof location !== 'undefined' && location.hash || '').slice(1).split('/');
const deep = () => {
  if (first === 'match') return ['match', { home: 'mud', away: part === 'megadome' ? 'meg' : part === 'furnace' ? 'irn' : part === 'docks' ? 'gul' : 'bad', venue: TT.VENUES[part] ? part : 'muddington', exhibition: true }];
  if (first === 'training' && part) return ['match', { home: 'mud', away: 'bad', venue: 'muddington', drill: TT.DRILLS[+part - 1] ? TT.DRILLS[+part - 1].id : 'legs', time: 'day', weather: 'clear' }];
  if (first === 'attract') return ['match', TT.attractData ? TT.attractData(0) : { attract: true }];
  if (first === 'card') return ['card', { demo: true }];
  if (scenes[first]) return [first, {}];
  return ['title', {}];
};
const [startScene, startData] = SESSION ? ['card', { waiting: true }] : deep();
game.start({
  scenes, scene: startScene, data: startData,
  boot: { title: 'THUGBY TURBO', version: '1.0', accent: '#f0c040', messages: ['Inflating the ball', 'Ironing the kits', 'Hiding the chicken', 'Warming the pies'],
    steps: [
      ['Painting the pitch', () => { Stadium.get('muddington', 'mud'); }],
      ['Lacing the boots', () => { for (const id of TT.TEAM_ORDER) TT.makeRig(TT.TEAMS[id].roster[0], TT.TEAMS[id].home); }],
      ['Painting the posts', () => { TT.attractData = TT.attractData || (() => ({ attract: true })); }],
      ['Writing the commentary', () => { void TT.LINES; }]
    ] }
});
if (SESSION && TT.Net) TT.Net.boot();
/* ---- game.debug: the tests' and tools' handle ---- */
game.debug = {
  snapshot() {
    const m = MS.m, s = { scene: game.sceneName, attract: !!(MS.data && MS.data.attract), dev: { open: !!(TT.dev && TT.dev.open) }, touchOnly: TT.touchOnly };
    if (m && game.sceneName === 'match') {
      const b = m.ball;
      Object.assign(s, { phase: m.phase, sub: m.sub, half: m.half, clock: +m.clock.toFixed(2), score: m.score.slice(), hype: m.hype.map(Math.round), possession: m.poss, over: m.over, sudden: m.sudden, hooter: m.hooter,
        ball: { x: Math.round(b.x), y: Math.round(b.y), z: Math.round(b.z), state: b.st, holder: b.holder, kind: b.kind },
        players: m.players.map(p => ({ id: p.id, team: p.team, role: p.role, x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), st: p.st, ctl: p.ctl })),
        ref: { x: Math.round(m.ref.x), y: Math.round(m.ref.y), facing: +m.ref.f.toFixed(2), down: m.ref.down > 0 }, setpiece: m.setp ? { kind: m.setp.kind, sub: m.setp.sub } : null,
        cards: m.players.filter(p => p.st === 'bin' || p.st === 'off').map(p => p.id), powerups: m.powerups.filter(q => !q.taken).map(q => q.kind), hazards: m.hazards.map(h => h.kind),
        watchdog: m.counts.watchdog || 0, replay: !!(MS.rep && MS.rep.play), drill: TT.Drills && TT.Drills.state ? TT.Drills.state() : null, session: TT.Net ? TT.Net.state() : null });
    }
    if (TT.Cup) s.cup = TT.Cup.state();
    return s;
  },
  teleport(id, x, y) { const p = MS.m && MS.m.players[id]; if (p) { p.x = x; p.y = y; p.vx = p.vy = 0; } },
  give(id) { if (MS.m) MS.m.force('give', { id }); },
  force(name, o) { if (MS.m) return MS.m.force(name, o || {}); },
  tune(key, v) { return TUNE.set(key, v); },
  seed(n) { TT.seedNext = n; },
  step(s) { game.advance(s); },
  drill(n) { game.go('match', { home: 'mud', away: 'bad', venue: 'muddington', drill: TT.DRILLS[n] ? TT.DRILLS[n].id : n, time: 'day', weather: 'clear' }, { fade: 0 }); },
  go(scene, data) { game.go(scene, data || {}, { fade: 0 }); }
};
if (typeof window !== 'undefined') window.__thugby = { game, TT };
