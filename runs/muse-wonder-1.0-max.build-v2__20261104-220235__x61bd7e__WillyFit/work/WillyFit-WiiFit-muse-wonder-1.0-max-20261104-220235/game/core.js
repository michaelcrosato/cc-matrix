// Willy Fit — core: namespace, input map, DEV defaults, state, saves, registry.
window.G = window.G || {};
(function () {
  'use strict';
  const E = window.My3D2dge;
  G.TITLE = 'Willy Fit';
  G.TAGLINE = 'Gently, or not at all.';
  G.E = E;
  // Custom input map MUST keep engine menu actions (a custom map replaces the preset).
  const D = E.Input.DEFAULT;
  G.INPUT = {
    up: D.up, down: D.down, left: D.left, right: D.right, start: D.start, pause: D.pause,
    confirm: D.confirm, cancel: D.cancel,
    breath: ['Space', 'Mouse0', 'Pad6', 'Pad7'], catchL: ['KeyQ', 'Mouse0', 'Pad4'], catchR: ['KeyE', 'Mouse2', 'Pad5'],
    jump: ['Space', 'Pad0'], interact: ['KeyE', 'Enter', 'Pad0'], more: ['Tab', 'KeyM', 'Pad3'], retry: ['KeyR', 'Pad2'],
    paceL: ['KeyJ', 'Mouse0', 'Pad6'], paceR: ['KeyK', 'Mouse2', 'Pad7'],
    stepL: ['KeyA', 'ArrowLeft', 'Mouse0', 'Pad14', 'PadAxisLeft'], stepR: ['KeyD', 'ArrowRight', 'Mouse2', 'Pad15', 'PadAxisRight'],
    stepU: ['KeyW', 'ArrowUp', 'WheelUp', 'Pad12', 'PadAxisUp'], stepD: ['KeyS', 'ArrowDown', 'WheelDown', 'Pad13', 'PadAxisDown']
  };
  G.CLASS_INPUT = {
    up: ['ArrowUp', 'KeyW', 'Pad12'], down: ['ArrowDown', 'KeyS', 'Pad13'], left: ['ArrowLeft', 'KeyA', 'Pad14'], right: ['ArrowRight', 'KeyD', 'Pad15'],
    start: D.start, pause: D.pause, confirm: ['Enter', 'Space', 'Pad0'], cancel: ['Escape', 'Pad1'],
    breath: ['Space', 'Pad6', 'Pad7'], catchL: ['KeyF', 'KeyPeriod', 'Pad4'], catchR: ['KeyH', 'KeySlash', 'Pad5']
  };
  const DEV_DEFAULTS = {
    k: 12, c: 6, s: 8, A: 3, nf: 1.3, ringScale: 1, push: 1, stumbleAt: 1, mouseReach: 0.33, nudgeRate: 2.2,
    star1: 0.35, star2: 0.65, star3: 0.90, repTol: 0.08, rhythmScale: 1, fatigue: 1,
    hoopLo: 7, hoopHi: 11, jogLo: 2.6, jogHi: 3.4, jogSpeed: 1,
    slalomSpeed: 220, slalomTurn: 1, trayG: 420, trayFriction: 0.4, ropeS: 16, gust: 9,
    timeScale: 1, minutesMul: 1, noStumble: false, botSkill: 'off', showTrace: false
  };
  G.DEV_DEFAULTS = DEV_DEFAULTS;
  G.DEV = Object.assign({}, DEV_DEFAULTS);
  G.resetDev = function () { for (const k in DEV_DEFAULTS) G.DEV[k] = DEV_DEFAULTS[k]; if (G.game) G.game.timeScale = G.DEV.timeScale; };
  G.activities = [];
  G.byId = {};
  G.activity = function (def) { G.activities.push(def); G.byId[def.id] = def; return def; };
  G.starsFor = function (pct, th) {
    const t = th || [G.DEV.star1, G.DEV.star2, G.DEV.star3];
    return pct >= t[2] ? 3 : pct >= t[1] ? 2 : pct >= t[0] ? 1 : 0;
  };
  G.newMember = function () {
    return {
      nickname: 'Gentle Doug', hair: 'short', skin: 1, top: 0, bottom: 0, instructor: 'birch',
      day: 1, sessionsToday: 0, minutes: 0, best: {}, spineHistory: [], grandWin: false,
      freePlay: false, sessionsTotal: 0, lastDay: null, created: Date.now()
    };
  };
  G.member = G.newMember();
  G.slot = 0;
  G.spineAge = function (m) {
    m = m || G.member;
    const disc = { Stillness: ['stork', 'sunflow', 'candle'], Strength: ['squat', 'pushup', 'lunge'], Cardio: ['step', 'hoop', 'jog'], Balance: ['slalom', 'tray', 'laundry'] };
    let sum = 0; const petals = {};
    for (const d in disc) {
      let s = 0; for (const id of disc[d]) s += ((m.best[id] && m.best[id].stars) || 0);
      petals[d] = Math.round((s / (disc[d].length * 3)) * 100); sum += petals[d];
    }
    const O = sum / 4;
    let age = Math.min(71, Math.round(78 - 0.58 * O));
    if (m.grandWin) age -= 1;
    return { age: age, O: O, petals: petals };
  };
  G.unlockedActivities = function (m) {
    m = m || G.member; const set = {};
    for (const d of G.DAYS) if (m.day >= d.n || m.freePlay) for (const id of d.unlocks) set[id] = true;
    if (m.freePlay) for (const a of G.activities) set[a.id] = true;
    return set;
  };
  G.tierUnlocked = function (m, id, tier) {
    if (tier <= 1) return true;
    const b = m.best[id];
    return !!((b && b.stars >= 2) || m.day >= 4 || m.freePlay);
  };
  G.suggestionOfDay = function (m) {
    m = m || G.member;
    const ids = G.activities.filter(a => G.unlockedActivities(m)[a.id]).map(a => a.id);
    if (!ids.length) return 'stork';
    let h = 0; const s = m.nickname + ':' + m.day; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return ids[h % ids.length];
  };
  G.recordResult = function (id, tier, pct, stars, minutes) {
    const m = G.member;
    const key = id;
    if (!m.best[key] || stars > m.best[key].stars || (stars === m.best[key].stars && pct > m.best[key].pct)) m.best[key] = { stars: stars, pct: pct, tier: tier };
    m.minutes += minutes; m.sessionsTotal++;
    return minutes;
  };
  G.sessionMinutes = function (id, pct, stars) {
    const base = 2 + pct * 2;
    let v = base * (1 + 0.25 * stars);
    if (G.suggestionOfDay() === id) v *= 1.5;
    return Math.max(1, Math.round(v * G.DEV.minutesMul));
  };
  G.hashState = function () {
    const m = G.member; let h = 2166136261 >>> 0; const s = JSON.stringify(m);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  };
})();
