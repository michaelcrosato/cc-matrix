'use strict';
/* ===== Settings + save data (localStorage, failure tolerant) ===== */
const DEFAULT_SETTINGS = {
  invertX: false, invertY: false, deadzone: 0.15, sens: 1, music: 0.6, sfx: 0.8,
  shake: 1, rumble: 1, difficulty: 1, hudScale: 1, voice: true, flash: true,
};
const Store = {
  get(k, d) { try { const v = localStorage.getItem('lylatlark.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('lylatlark.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};
const Settings = Object.assign({}, DEFAULT_SETTINGS, Store.get('settings', {}));
Settings.save = function () { const o = {}; for (const k in DEFAULT_SETTINGS) o[k] = this[k]; Store.set('settings', o); };
Settings.reset = function () { Object.assign(this, DEFAULT_SETTINGS); this.save(); };
const Save = Object.assign({ unlocked: 1, best: {}, medals: {} }, Store.get('save', {}));
Save.commit = function () { Store.set('save', { unlocked: this.unlocked, best: this.best, medals: this.medals }); };
