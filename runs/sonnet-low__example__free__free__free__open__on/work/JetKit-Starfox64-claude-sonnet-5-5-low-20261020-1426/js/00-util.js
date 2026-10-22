'use strict';
// ---------- utilities & settings ----------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rpick = a => a[Math.floor(Math.random() * a.length)];
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const wrapPi = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

const DEFAULTS = { master: 8, music: 6, sfx: 8, invertX: false, invertY: false, invertPitch: false, shake: true, aim: true, dead: 0.15, hints: true, radio: true };
const Settings = Object.assign({}, DEFAULTS);
try { Object.assign(Settings, JSON.parse(localStorage.getItem('jetkit.settings') || '{}')); } catch (e) {}
Settings.save = function () { try { const o = {}; for (const k in DEFAULTS) o[k] = Settings[k]; localStorage.setItem('jetkit.settings', JSON.stringify(o)); } catch (e) {} };
const Save = { unlocked: 1, best: {} };
try { Object.assign(Save, JSON.parse(localStorage.getItem('jetkit.save') || '{}')); } catch (e) {}
Save.save = function () { try { localStorage.setItem('jetkit.save', JSON.stringify({ unlocked: Save.unlocked, best: Save.best })); } catch (e) {} };
