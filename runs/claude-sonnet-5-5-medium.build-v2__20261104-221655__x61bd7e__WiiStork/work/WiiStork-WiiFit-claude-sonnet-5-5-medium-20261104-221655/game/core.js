// core: namespace, input map, dev defaults, state, saves, activity registry
(() => {
const E = My3D2dge, G = window.G = window.G || {};
G.E = E; G.TITLE = 'Wii Stork'; G.ID = 'wiistork';
G.inSession = !!(window.AIHub && AIHub.active);
const D = E.Input.DEFAULT;
G.INPUT = { up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause, confirm: D.confirm, cancel: D.cancel,
  breath: ['Space', 'Mouse0', 'Pad6', 'Pad7', 'KeyF', 'Period'], catchL: ['KeyQ', 'Mouse0', 'Pad4', 'KeyG', 'Slash'], catchR: ['KeyE', 'Mouse2', 'Pad5', 'KeyH', 'Comma'],
  jump: ['Space', 'Pad0'], interact: ['KeyE', 'Enter', 'Pad0'], more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2'],
  paceL: ['KeyJ', 'Mouse0', 'Pad6'], paceR: ['KeyK', 'Mouse2', 'Pad7'],
  stepL: ['KeyA', 'ArrowLeft', 'Mouse0', 'Pad14', 'PadAxisLeft'], stepR: ['KeyD', 'ArrowRight', 'Mouse2', 'Pad15', 'PadAxisRight'],
  stepU: ['KeyW', 'ArrowUp', 'WheelUp', 'Pad12', 'PadAxisUp'], stepD: ['KeyS', 'ArrowDown', 'WheelDown', 'Pad13', 'PadAxisDown'],
  // raw analog stick and keyboard nudge keys (the lean reads these, never a device)
  axL: ['PadAxisLeft'], axR: ['PadAxisRight'], axU: ['PadAxisUp'], axD: ['PadAxisDown'],
  nL: ['KeyA', 'ArrowLeft'], nR: ['KeyD', 'ArrowRight'], nU: ['KeyW', 'ArrowUp'], nD: ['KeyS', 'ArrowDown'], breathK: ['Space', 'KeyF', 'Period'], breathP: ['Pad6', 'Pad7'],
  wL: ['KeyA'], wR: ['KeyD'], wU: ['KeyW'], wD: ['KeyS'],
  dvU: ['ArrowUp', 'Pad12'], dvD: ['ArrowDown', 'Pad13'], dvL: ['ArrowLeft', 'Pad14'], dvR: ['ArrowRight', 'Pad15'], dvCL: ['Pad4'], dvCR: ['Pad5'] };

// ---- DEV: live balance variables --------------------------------------------------------------
G.DEVDEF = {
  k: [1, 30, 1, 1, 'Lean: responsiveness x'], c: [0.2, 3, .05, 1, 'Lean: damping x'], s: [0, 3, .05, 1, 'Lean: instability x'], A: [0, 3, .05, 1, 'Lean: tremble x'], nf: [.3, 3, .05, 1, 'Lean: tremble speed x'],
  ring: [.5, 2, .05, 1, 'Ring size x'], push: [0, 3, .05, 1, 'Push strength x'], stumble: [.7, 1.5, .01, 1, 'Stumble threshold'], mouseReach: [.15, .8, .01, .33, 'Mouse reach (of height)'], nudge: [.8, 4, .1, 2.2, 'Key nudge rate'],
  star1: [.1, .6, .01, 1, 'Star 1 scale'], star3: [.5, 1.5, .01, 1, 'Star scale x'], repTol: [.03, .2, .005, .08, 'Rep tolerance'], rhythmWin: [.5, 3, .05, 1, 'Rhythm window x'], fatigue: [0, 3, .1, 1, 'Fatigue x'],
  hoopLo: [3, 10, .1, 7, 'Hoop band low'], hoopHi: [8, 16, .1, 11, 'Hoop band high'], jogLo: [1.5, 3.4, .05, 2.6, 'Jog cadence low'], jogHi: [3, 5, .05, 3.4, 'Jog cadence high'], jogSpeed: [.5, 2, .05, 1, 'Jog speed x'],
  slalomSpeed: [100, 450, 5, 220, 'Slalom speed'], slalomTurn: [.5, 2.5, .05, 1, 'Slalom turn x'], trayG: [100, 900, 10, 420, 'Tray gravity'], trayFric: [0, 1, .02, .3, 'Tray friction'], ropeS: [.2, 2.5, .05, 1, 'Rope instability x'], gust: [0, 3, .1, 1, 'Gust strength x'],
  timeScale: [0, 2, .25, 1, 'Time scale'], minutes: [.5, 5, .5, 1, 'Minutes x'] };
G.DEVGROUPS = [['Lean', ['k', 'c', 's', 'A', 'nf', 'ring', 'push', 'stumble', 'mouseReach', 'nudge']], ['Scoring', ['star1', 'star3', 'repTol', 'rhythmWin', 'fatigue']], ['Cardio', ['hoopLo', 'hoopHi', 'jogLo', 'jogHi', 'jogSpeed']], ['Games', ['slalomSpeed', 'slalomTurn', 'trayG', 'trayFric', 'ropeS', 'gust']], ['World', ['timeScale', 'minutes']]];
G.DEV = {}; G.devReset = () => { for (const k in G.DEVDEF) G.DEV[k] = G.DEVDEF[k][3]; G.devFlags.noStumble = false; G.devFlags.bot = null; G.devFlags.trace = false; };
G.devFlags = { noStumble: false, bot: null, trace: false, open: false };
G.devReset();

// ---- helpers -------------------------------------------------------------------------------------
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
G.lerp = (a, b, t) => a + (b - a) * t;
G.pick = (arr, rng) => arr[Math.floor((rng || Math.random)() * arr.length) % arr.length];
G.fmtTime = s => { s = Math.max(0, s); return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
G.hash = o => { const s = JSON.stringify(o); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---- activity registry ----------------------------------------------------------------------------
G.acts = {}; G.actList = [];
G.activity = def => { G.acts[def.id] = def; G.actList.push(def); return def; };

// ---- state -------------------------------------------------------------------------------------
G.LOOKS = { hair: ['short', 'spiky', 'long', 'ponytail', 'bald'], skin: ['#f6d2b0', '#e8b890', '#c98f64', '#a06a44', '#7a4a2c', '#f2c9a8'], top: ['#ff7a59', '#2cc6e6', '#8fd36a', '#f5b700', '#c68cf0', '#f58cb4', '#ffffff', '#4a6ea8'], bottom: ['#20404c', '#4a6ea8', '#8a8f98', '#a56a4a'] };
G.NAMES = ['Gentle Doug', 'Sir Slouch', 'Ms. Almost', 'The Other Pat', 'Brisk Janet', 'Mr. Maybe', 'Tuesday Ron', 'Captain Hamstring', 'Little Lorraine', 'Soft Gary', 'Madame Posture', 'Kind Of Keith'];
G.fresh = (slot) => ({ v: 1, slot: slot == null ? 0 : slot, name: 'Gentle Doug', look: { hair: 0, skin: 0, top: 0, bottom: 0 }, inst: 'birch', day: 1, done: 0, minutes: 0, best: {}, spine: [], suggestion: 'stork', duel: null, ending: false, free: false, started: false, arrived: false, checked: false, pauses: 0, last: 0, wear: { towel: false, headband: false, sunhat: false }, sessLog: [], plays: 0, gamesDone: false, tareDay: false, finalAge: 71, hidden: {} });
G.S = G.fresh();
G.DISCIPLINES = ['Stillness', 'Strength', 'Cardio', 'Balance'];
G.stars = (id, tier) => (G.S.best[id] && G.S.best[id][tier]) || 0;
G.bestStars = id => Math.max(G.stars(id, 1), G.stars(id, 2));
G.discScore = d => { const as = G.actList.filter(a => a.discipline === d); return as.length ? as.reduce((s, a) => s + G.bestStars(a.id) * 33.3, 0) / as.length : 0; };
G.spineAge = () => { const O = G.DISCIPLINES.reduce((s, d) => s + G.discScore(d), 0) / 4; return Math.min(71, Math.round(78 - .58 * O)) - (G.S.duel === 'won' ? 1 : 0); };
G.setBest = (id, tier, stars) => { const b = G.S.best[id] = G.S.best[id] || {}; if (stars > (b[tier] || 0)) b[tier] = stars; };
G.dayName = d => ['Orientation', 'Improvement', 'The Plateau', "Tare's Day", 'The Gentle Games'][d - 1] || 'Open Day';
G.time = () => G.S.done === 0 ? 'morning' : G.S.done === 1 ? 'noon' : 'dusk';

// saves: Member slots 0..2
G.attach = game => {
  G.game = game;
  game.saves.write = () => ({ data: JSON.parse(JSON.stringify(G.S)), place: 'Lumbar Island', level: 'Day ' + Math.min(G.S.day, 5) });
  game.saves.read = save => { const d = save && save.data; G.S = Object.assign(G.fresh(), d && typeof d === 'object' ? d : {}); G.sanitize(); };
};
G.sanitize = () => { const S = G.S; if (!S.look || typeof S.look !== 'object') S.look = { hair: 0, skin: 0, top: 0, bottom: 0 }; for (const k of ['hair', 'skin', 'top', 'bottom']) S.look[k] = G.clamp(Math.floor(+S.look[k]) || 0, 0, G.LOOKS[k].length - 1); if (typeof S.best !== 'object' || !S.best) S.best = {}; if (!Array.isArray(S.spine)) S.spine = []; S.day = G.clamp(Math.floor(+S.day) || 1, 1, 99); S.done = G.clamp(Math.floor(+S.done) || 0, 0, 3); S.minutes = Math.max(0, +S.minutes || 0); if (!S.wear || typeof S.wear !== 'object') S.wear = {}; if (typeof S.name !== 'string') S.name = 'Gentle Doug'; if (S.inst !== 'alder') S.inst = 'birch'; };
G.saveNow = () => { if (G.inSession || G.noSave) return; G.S.last = Date.now(); try { G.game.saves.save(G.S.slot); G.game.saves.save('auto'); E.store.set('ws:slot' + G.S.slot, { name: G.S.name, look: G.S.look, day: G.S.day, age: G.S.shownAge || G.spineAge(), free: !!G.S.free }); } catch (e) {} };
G.hasSave = slot => { try { const l = G.game.saves.list(); const s = l && l.find ? l.find(x => x && x.slot === slot) : l[slot]; return !!(s && (s.empty === false || s.data || s.time || s.place)); } catch (e) { return false; } };
})();
