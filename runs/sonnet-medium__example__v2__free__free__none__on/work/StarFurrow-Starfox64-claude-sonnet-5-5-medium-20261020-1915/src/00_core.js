// ===== 00_core: constants, math helpers, settings, save data =====
const GAME_TITLE = 'Star Furrow';
const BUILD_STAMP = '2026-10-20 19:15';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const rr = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rr(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const sign0 = (v) => (v < 0 ? -1 : 1);
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

const SETTING_DEFAULTS = {
  invertH: false,        // gamepad horizontal axis inversion (quick fix for intermittent inverted input)
  invertV: false,        // gamepad vertical axis inversion
  flightInvert: false,   // classic flight-stick pitch (pull back = climb)
  deadzone: 0.15,
  sensitivity: 1.0,
  rumble: true,
  masterVol: 0.8,
  musicVol: 0.6,
  sfxVol: 0.9,
  voiceVol: 0.8,
  shadows: true,
  bloom: true,
  outlines: true,
  shake: 1.0,
  hudScale: 1.0,
  difficulty: 1,         // 0 easy, 1 normal, 2 hard
  aimAssist: 0.6,
  tutorial: true,
  subtitles: true,
  reduceFlash: false,
};

const Settings = {
  data: { ...SETTING_DEFAULTS },
  listeners: [],
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem('starfurrow.settings') || '{}')); } catch (e) { /* ignore */ }
  },
  save() { try { localStorage.setItem('starfurrow.settings', JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  set(k, v) { this.data[k] = v; this.save(); this.listeners.forEach((f) => f(k, v)); },
  reset() { this.data = { ...SETTING_DEFAULTS }; this.save(); this.listeners.forEach((f) => f('*', null)); },
};
const S = () => Settings.data;

const SaveData = {
  data: { scores: {}, medals: {}, unlocked: 2, plays: 0 },
  load() { try { Object.assign(this.data, JSON.parse(localStorage.getItem('starfurrow.save') || '{}')); } catch (e) { /* ignore */ } },
  save() { try { localStorage.setItem('starfurrow.save', JSON.stringify(this.data)); } catch (e) { /* ignore */ } },
  record(stage, score, medal) {
    const o = this.data;
    if (!o.scores[stage] || score > o.scores[stage]) o.scores[stage] = score;
    const order = ['-', 'C', 'B', 'A', 'S'];
    if (!o.medals[stage] || order.indexOf(medal) > order.indexOf(o.medals[stage])) o.medals[stage] = medal;
    this.save();
  },
};

// Collision categories used by Rapier interaction groups and queries.
const CAT = { PLAYER: 1, ENEMY: 2, OBST: 4, PICKUP: 8, ALLY: 16, GROUND: 256, DEBRIS: 512 };
