// Why Fit: the shared namespace, the game object, the input map, the live balance values, member state and saves.
const E = My3D2dge, { px, clamp, lerp } = E;
const G = window.G = window.G || {};
G.TITLE = 'WHY FIT';
G.acts = {}; G.actOrder = []; G.scenes = {};
G.inSession = !!(window.AIHub && AIHub.active);

const D = E.Input.DEFAULT;
G.INPUT = {
  up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause,
  confirm: D.confirm, cancel: [...D.cancel, 'Mouse2'],
  breath: ['Space', 'Mouse0', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Mouse0', 'Pad4'], catchR: ['KeyE', 'Mouse2', 'Pad5'],
  jump: ['Space', 'Mouse2', 'Pad0'], interact: ['KeyE', 'Enter', 'Pad0'], more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2'],
  paceL: ['KeyJ', 'Mouse0', 'Pad6'], paceR: ['KeyK', 'Mouse2', 'Pad7'],
  stepL: ['KeyA', 'ArrowLeft', 'Mouse0', 'Pad14', 'PadAxisLeft'], stepR: ['KeyD', 'ArrowRight', 'Mouse2', 'Pad15', 'PadAxisRight'],
  stepU: ['KeyW', 'ArrowUp', 'WheelUp', 'Pad12', 'PadAxisUp'], stepD: ['KeyS', 'ArrowDown', 'WheelDown', 'Pad13', 'PadAxisDown'],
  devU: ['ArrowUp', 'Pad12'], devD: ['ArrowDown', 'Pad13'], devL: ['ArrowLeft', 'Pad14'], devR: ['ArrowRight', 'Pad15'],
  devCL: ['PageDown', 'Pad4'], devCR: ['PageUp', 'Pad5'], devA: ['Enter', 'Pad0'], devB: ['Backspace', 'Pad1']
};
// half a keyboard runs out of keys with the full map, so Class plays with the moves, the menu actions and three buttons
G.CLASS_INPUT = { up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel,
  breath: ['Space', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Pad4'], catchR: ['KeyE', 'Pad5'],
  devU: G.INPUT.devU, devD: G.INPUT.devD, devL: G.INPUT.devL, devR: G.INPUT.devR, devCL: G.INPUT.devCL, devCR: G.INPUT.devCR, devA: G.INPUT.devA, devB: G.INPUT.devB };

// DEV: every live slider. Multipliers are 1 by default so each activity keeps its own numbers in game/data.
G.DEV_DEFAULTS = { k: 1, c: 1, s: 1, A: 1, nf: 1, ring: 1, push: 1, stumble: 1, mouseReach: .33, nudge: 2.2,
  star1: 1, star2: 1, star3: 1, repTol: 1, rhythmWin: 1, fatigue: 1,
  hoopBand: 1, jogBand: 1, jogSpeed: 1,
  slalomSpeed: 1, slalomTurn: 1, trayG: 280, trayFric: .4, ropeS: 1, gust: 1,
  timeScale: 1, minutes: 1 };
G.DEV = Object.assign({}, G.DEV_DEFAULTS);
G.TOOLS = { noStumble: false, bot: null, trace: false, frozen: false, step: 0 };

const SETTINGS = [
  { key: 'music', value: .1 }, { key: 'glyphs', value: 'playstation' },
  { key: 'voice', label: 'Voices', type: 'slider', min: 0, max: 1, step: .05, value: .8, group: 'Sound', apply(g, v) { g.audio.voiceVolume = v; } },
  { key: 'gentle', label: 'Gentle Mode', value: false, help: 'A wider ring and a calmer body. Tare will not tell anyone.', apply(g, v) { if (v && G.started) G.nextChat = G.LINES.gentleOn; } },
  { key: 'breathMode', label: 'Breath', options: ['Hold', 'Toggle'], value: 'Hold', help: 'Hold the button to breathe in, or press it once for each breath.' },
  { key: 'tips', label: "Tare's Tips", value: true, help: 'Tare offers a tip each morning. You may decline. Tare will notice.' }
];
const game = G.game = new E.Game({ canvas: 'screen', id: 'whyfit', res: 'ps1', expand: true, touch: 'never', input: G.INPUT, view: 'brawler',
  autoPause: !G.inSession, live: G.inSession, fullscreen: G.inSession ? false : 'button', camera: { zoom: false },
  menu: { quit: G.inSession ? false : 'title', settings: SETTINGS,
    items: G.inSession ? [] : [['Restart Session', () => G.restartSession()], ['Dev Mode', () => G.Dev.open()]],
    controls: { confirm: 'Confirm', cancel: 'Back', up: 'Lean forward', down: 'Lean back', left: 'Lean left', right: 'Lean right',
      breath: 'Breath and effort', catchL: 'Catch left', catchR: 'Catch right', jump: 'Jump', interact: 'Talk or use', paceL: 'Left step', paceR: 'Right step',
      more: false, retry: false, stepL: false, stepR: false, stepU: false, stepD: false, devU: false, devD: false, devL: false, devR: false, devCL: false, devCR: false, devA: false, devB: false } } });

if (!game.headless) new E.Shell(game, { theme: { ink: '#20404c', paper: '#f7fbfb', accent: '#14a8c8', muted: '#5f7f8a', danger: '#e0553a', line: '#c8dde2', font: 'system-ui, sans-serif', titleFont: 'system-ui, sans-serif' } });
if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('pointerover', e => {
  const b = e.target.closest && e.target.closest('.esh-sh button:not(:disabled), .esh-sh input:not(:disabled)');
  if (b && e.pointerType === 'mouse') b.focus({ preventScroll: true }); });

G.rng = E.rng(20261104);
G.pick = (list, rng = G.rng) => list[Math.floor(rng() * list.length) % list.length];
// a line from a bank that does not repeat until the bank is used up (kept in the member, so a second playthrough still surprises)
G.line = (key, rng = G.rng) => {
  const bank = G.LINES[key]; if (!bank) { game.fail('line', new Error('no line ' + key)); return '...'; }
  if (typeof bank === 'string') return bank;
  const st = G.state || {}; const seen = st.seen = st.seen || {}; const left = bank.map((_, i) => i).filter(i => !(seen[key] || []).includes(i));
  if (!left.length) seen[key] = [];
  const pool = left.length ? left : bank.map((_, i) => i), i = pool[Math.floor(rng() * pool.length) % pool.length];
  (seen[key] = seen[key] || []).push(i); return bank[i];
};

// Member state ---------------------------------------------------------------------------------------------------
G.newMember = (name, look) => ({ name, look, instructor: null, day: 1, session: 0, minutes: 0, best: {}, ages: [], age: 71, heldAge: 71, seen: {}, wear: { top: null, hat: null },
  pauses: 0, lastSeen: Date.now(), flags: {}, suggestion: null, finalAge: null, duelWon: false, finished: false, sessionsDone: 0, played: {} });
G.state = null; G.slot = 0;
G.bestStars = (st, id) => { const b = st.best[id]; if (!b) return 0; return Math.max(...Object.values(b).map(x => x.stars)); };
G.discScore = (st, d) => { const ids = G.actOrder.filter(i => G.acts[i].discipline === d); return ids.reduce((a, i) => a + G.bestStars(st, i) * 33.3, 0) / (ids.length || 1); };
G.DISCIPLINES = ['Stillness', 'Strength', 'Cardio', 'Balance'];
G.computeAge = st => { const O = G.DISCIPLINES.reduce((a, d) => a + G.discScore(st, d), 0) / 4; return Math.min(71, Math.round(78 - .58 * O)) - (st.duelWon ? 1 : 0); };
// on the plateau the number that matters stays where it was; the next morning it catches up all at once
G.morningAge = st => { const real = G.computeAge(st); return st.day === 3 ? (st.ages.length ? st.ages[st.ages.length - 1] : real) : real; };
G.unlockedItems = st => G.UNLOCKS.filter(u => st.minutes >= u.at);
G.dayInfo = st => G.DAYS[Math.min(st.day, G.DAYS.length) - 1];
G.isUnlocked = (st, id) => { if (st.finished || st.day > 5) return true; let ok = false; G.DAYS.forEach((d, i) => { if (i < st.day && d.unlocks.includes(id)) ok = true; }); return ok; };
G.tier2Open = (st, id) => (st.finished || st.day >= 4) && G.bestStars(st, id) >= 2;
G.sessionsLeft = st => Math.max(0, 3 - st.session);

G.saves = game.saves;
game.saves.write = () => ({ data: JSON.parse(JSON.stringify(G.state)), place: 'Day ' + G.state.day, level: G.state.age });
game.saves.read = s => { G.state = s.data; };
G.save = () => { if (G.noSave || !G.state || G.inSession) return; game.saves.save(G.slot); };
G.members = () => { const out = []; for (let i = 0; i < 3; i++) { const s = game.saves.get(i); out.push(s && !s.damaged && !s.newer && s.data && s.data.look ? s : null); } return out; };
G.loadMember = slot => { const s = game.saves.load(slot); if (s) G.slot = slot; return !!s; };

// Which device leans: the pad if it was used last; otherwise the mouse if it moved more recently than a key went down.
G.keyT = -1;
// only the leaning keys keep the keyboard in charge: holding Space to walk while the mouse leans must not take the lean away
const LEAN_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Act:up', 'Act:down', 'Act:left', 'Act:right']);
game.hook('input', () => { const I = game.input; if (I.held && [...I.held].some(c => LEAN_CODES.has(c))) G.keyT = I.clock; });
if (typeof addEventListener === 'function') addEventListener('keydown', e => { if (!e.repeat) G.keyT = game.input.clock; });
G.source = (I = game.input) => { if (I.lastDevice === 'gamepad') return 'pad'; if (I === game.input && I.mouse && I.mouse.active !== false && I.mouse.t > G.keyT && I.pointer && I.pointer()) return 'mouse'; return 'keys'; };

// Scenes: every scene goes through here, so Dev Mode, the idle timer and the demo chip are the same everywhere.
G.scene = (name, def) => {
  const u = def.update || (() => {}), d = def.draw || (() => {});
  def.update = function (dt) { if (G.Dev && G.Dev.blocks()) return; if (G.nextChat && !game.paused && !G.talk.open) { const l = G.nextChat; G.nextChat = null; G.chat('tare', l, 4); } u.call(def, dt); };
  def.draw = function (r) { d.call(def, r); if (G.Attract) G.Attract.draw(r); if (G.Dev) G.Dev.draw(r); };
  G.scenes[name] = def; return def;
};
