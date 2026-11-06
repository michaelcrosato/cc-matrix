import * as THREE from 'three/webgpu';
import { Input } from '../input/input.js';
import { AudioEngine } from '../audio/engine.js';
import { UI, el, esc } from '../ui/dom.js';
import { loadSave, writeSave, defaultSettings, blankProfile } from '../core/save.js';
import { tuning, resetTuning, TUNING_DEFS } from '../data/tuning.js';
import { rng, cosmetic, setSeed, seedFromClock, osRandom } from '../core/rng.js';
import { pickLine } from '../data/dialogue.js';
import { plan as voicePlan } from '../audio/voice.js';
import { toon } from '../render/renderer.js';
import { medalOf } from '../events/base.js';

export class Game {
  constructor({ gfx, test = false, manual = false }) {
    this.gfx = gfx; this.test = test; this.manual = manual; this.sim = 0; this.timers = []; this.scripts = []; this.errors = [];
    this.saveData = loadSave(); this.settings = this.saveData.settings; this.profile = null; this.profIdx = -1;
    this.input = new Input(); this.audio = new AudioEngine(this.settings); this.input.audioWake = () => this.audio.wake();
    this.ui = new UI(this); this.screens = {}; this.scr = null; this.screenName = 'boot'; this.ev = null; this.island = null; this.god = false; this.timeScale = 1;
    this.idle = 0; this.attract = null; this.session = null; this.touchOnly = false; this.speech = null; this.comics = []; this.mats = {}; this.paused = false; this.stepOnce = false; this.frozen = false;
    this.lastQuip = -99; this.padWarn = false; this.fpsStat = { fps: 0 }; this.hudOn = false; this.discs = []; this.freeCam = false; this.debugLines = null; this.wipeV = 0;
    this.input.onDevice = () => { this.ui.renderPrompts(); this.scr && this.scr.refresh && this.scr.refresh(); };
    window.addEventListener('error', (e) => this.errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => this.errors.push(String(e.reason)));
    this.applySettings();
  }
  mat(c) { return this.mats[c] || (this.mats[c] = toon(c)); }
  tuningMedalScale() { return tuning.medalScale; }
  applySettings() {
    const s = this.settings; document.documentElement.style.setProperty('--s', (s.uiScale || 100) / 100); this.audio.applyVolumes();
    if (this.gfx.u) this.gfx.u.inkOn.value = (s.ink ?? 100) / 100;
  }
  persist() { if (this.session) return; if (this.profile && this.profIdx >= 0) this.saveData.profiles[this.profIdx] = this.profile; this.saveData.settings = this.settings; writeSave(this.saveData); }
  // ---- time
  after(sec, fn) { this.timers.push({ t: this.sim + sec, fn }); }
  run(gen) { const g = gen(); const s = { g, wait: 0, until: null, dead: false }; this.scripts.push(s); this.stepScript(s); return s; }
  stepScript(s) { let r; try { r = s.g.next(); } catch (e) { this.errors.push('script: ' + e.message); s.dead = true; return; } if (r.done) { s.dead = true; return; } const v = r.value; if (typeof v === 'number') s.wait = v; else if (typeof v === 'function') s.until = v; }
  killScripts() { for (const s of this.scripts) s.dead = true; this.scripts = []; }
  // ---- core loop pieces
  fixed(dt) {
    if (this.frozen && !this.stepOnce) return; this.stepOnce = false;
    this.sim += dt;
    this.input.poll(dt);
    this.handleNav();
    for (let i = this.timers.length - 1; i >= 0; i--) if (this.timers[i].t <= this.sim) { const f = this.timers[i].fn; this.timers.splice(i, 1); try { f(); } catch (e) { this.errors.push('timer: ' + e.message); } }
    for (const s of this.scripts) { if (s.dead) continue; if (s.until) { if (s.until()) { s.until = null; this.stepScript(s); } } else if (s.wait > 0) { s.wait -= dt; if (s.wait <= 0) this.stepScript(s); } else this.stepScript(s); }
    this.scripts = this.scripts.filter((s) => !s.dead);
    this.updateSpeech(dt);
    if (this.scr && this.scr.fixed) this.scr.fixed(dt);
    if (this.ev && !this.paused) { try { this.ev.fixed(dt); } catch (e) { this.errors.push('event: ' + (e && e.stack || e)); if (this.session && window.AIHub) window.AIHub.fail(String(e.message)); } }
    this.updateIdle(dt);
    this.input.endTick();
    this.audio.setTilt(this.island ? this.island.rest * (this.island.restTarget ?? 0) / (this.island.rest || 1) : 0);
  }
  frame(dt) {
    if (this.island && this.island.group.visible) this.island.frame(dt);
    if (this.ev && !this.paused) this.ev.frame(dt);
    if (this.scr && this.scr.frame) this.scr.frame(dt);
    this.updateComics(dt); this.updateHud(dt);
    this.gfx.update(dt); this.gfx.syncInk();
    if (this.wipeTarget !== undefined) { this.wipeV += (this.wipeTarget - this.wipeV) * Math.min(1, dt * 7); if (Math.abs(this.wipeTarget - this.wipeV) < 0.01) this.wipeV = this.wipeTarget; if (this.gfx.u) this.gfx.u.wipe.value = this.wipeV; }
    this.fpsStat.fps = this.fpsStat.fps * 0.95 + (1 / Math.max(dt, 1e-3)) * 0.05;
  }
  // ---- input -> screens
  handleNav() {
    const navs = this.input.drainNav();
    if (this.input.padLost && this.ev && !this.paused && !this.session) { this.openPause('Controller disconnected'); }
    for (const n of navs) {
      if (n.a === 'pause' && n.dev === 'pad' && this.input.createHeld) continue;
      if (this.attract) { this.exitAttract(); continue; }
      if (this.speechBlock && this.speech && !this.speech.done) { if (n.a === 'ok') this.skipSpeech(); continue; }
      if (n.a === 'pause') { if (this.screenName === 'play' || this.screenName === 'island') this.openPause(); else if (this.scr && this.scr.nav) this.scr.nav('back', n); continue; }
      if (this.ui.menu && this.ui.menu.nav(n.a)) continue;
      if (this.scr && this.scr.nav) this.scr.nav(n.a, n);
    }
  }
  updateIdle(dt) {
    if (this.touchOnly && (this.input.pressedEdge.size > 0 || this.input.padCount > 0)) { this.touchOnly = false; const b = document.getElementById('touchSettings'); if (b) b.remove(); if (this.scr && this.scr.refresh) this.scr.refresh(); }
    const any = this.input.anyInput > 0 || this.input.pointerMoveAcc > 8;
    if (any && !this.attract) { this.idle = 0; this.input.resetAccum(); } else if (any) { this.input.resetAccum(); }
    if (!this.attract && (this.screenName === 'title' || this.screenName === 'menu') && !this.session) { this.idle += dt; if (this.idle >= 10) this.startAttract && this.startAttract(); } else if (!this.attract) this.idle = 0;
    if (this.attract) { const big = this.input.anyInput > 0 || this.input.pointerMoveAcc > 8; if (big) { this.exitAttract(); this.input.resetAccum(); } }
  }
  // ---- screens
  go(name, args) {
    if (this.speech && !this.speechBlock) this.endSpeech();
    if (this.scr && this.scr.exit) this.scr.exit(); this.ui.clear(); this.ui.setPrompts(null); this.ui.root.dataset.screen = name;
    this.screenName = name; this.scr = this.screens[name]; this.screenArgs = args;
    if (!this.scr) { this.errors.push('no screen ' + name); return; }
    this.scr.enter && this.scr.enter(args);
  }
  wipe(fn, hold = 0.25) { this.wipeTarget = 1; this.after(0.35, () => { fn(); this.after(hold, () => { this.wipeTarget = 0; }); }); }
  // ---- speech
  say(who, text, { auto = true, block = true, voice = null, name = null } = {}) {
    const v = voice || (who === 'trudy' ? 'trudy' : who === 'stillwater' ? 'stillwater' : who === 'bolster' ? 'bolster' : who === 'gary' ? 'gary' : 'guest' + (1 + (text.length % 3)));
    const dur = this.audio.speak(text, v); const nm = name || { trudy: 'Trudy', stillwater: 'Ms. Stillwater', bolster: 'Coach Bolster', gary: 'Gary' }[who] || who;
    const box = this.ui.speech; box.innerHTML = `<div class="tagline"><div class="who">${esc(nm)}</div><div class="txt mid"></div></div>`; this.speechTxt = box.querySelector('.txt');
    const st = { text, dur: Math.max(0.6, dur), t: 0, done: false, auto, block, hold: 0 }; this.speech = st; this.speechBlock = block; this.speechTxt.textContent = '';
    if (block) this.ui.setPrompts([['ok', 'Next']]);
    return () => st.done;
  }
  updateSpeech(dt) {
    const s = this.speech; if (!s) return; s.t += dt; const n = Math.min(s.text.length, Math.floor(s.t / s.dur * s.text.length * 1.1) + 1); if (this.speechTxt) this.speechTxt.textContent = s.text.slice(0, n);
    if (n >= s.text.length) { s.hold += dt; if (s.auto && s.hold > (s.block ? 1.9 : 2.2)) this.endSpeech(); }
  }
  skipSpeech() { const s = this.speech; if (!s) return; if (s.t / s.dur * 1.1 < 1) { s.t = s.dur; if (this.speechTxt) this.speechTxt.textContent = s.text; s.hold = 0; } else this.endSpeech(); }
  endSpeech() { const s = this.speech; if (!s) return; s.done = true; this.speech = null; this.speechBlock = false; this.ui.speech.innerHTML = ''; if (this.screenName !== 'play' && this.screenName !== 'island') this.ui.setPrompts(this.scr && this.scr.prompts ? this.scr.prompts() : null); else this.ui.setPrompts(this.scr && this.scr.prompts ? this.scr.prompts() : null); }
  line(who, key, vars = {}) { return pickLine(who, key, rng('dlg'), Object.assign({ name: this.profile ? this.profile.name : 'friend', n: this.profile ? this.profile.day : 1 }, vars)); }
  bark(who, key, vars) { if (this.speech && this.speechBlock) return; const t = this.line(who, key, vars); if (t) this.say(who, t, { block: false }); }
  quip(kind) {
    if (this.sim - this.lastQuip < 7 || this.speechBlock) return; this.lastQuip = this.sim; const ev = this.ev; const who = ev && ev.cls.instructor || 'trudy';
    const key = kind === 'fall' ? 'fall' : 'good'; const w = ev && ['stillwater', 'bolster'].includes(who) ? who : 'trudy';
    this.bark(w, key);
  }
  noteFall() { if (this.profile && !this.session) this.profile.floor = (this.profile.floor || 0) + 1; }
  // ---- feedback
  rumble(lane, mag = 0.5, ms = 150) {
    if (!this.settings.rumble || !lane || lane.kind !== 'local' || !String(lane.dev).startsWith('pad')) return;
    try { const idx = Number(lane.dev.slice(3)); const p = (navigator.getGamepads() || []).find((q) => q && q.index === idx); const a = p && p.vibrationActuator; if (a && a.playEffect) a.playEffect('dual-rumble', { duration: ms, strongMagnitude: mag, weakMagnitude: mag * 0.7 }); } catch (e) { /* ignore */ }
  }
  comic(ev, text, x, y, z = 0.5) {
    const c = document.createElement('canvas'); c.width = 384; c.height = 128; const g = c.getContext('2d'); g.font = '700 74px Fredoka, sans-serif'; g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#1A1420'; g.strokeText(text, 192, 90); g.fillStyle = '#FFD23F'; g.fillText(text, 192, 90);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(2.4, 0.8, 1); s.position.set(x, y, z); s.renderOrder = 20; (ev ? ev.group : this.gfx.stage).add(s); this.comics.push({ s, t: 0, y });
  }
  updateComics(dt) { for (let i = this.comics.length - 1; i >= 0; i--) { const c = this.comics[i]; c.t += dt; c.s.position.y = c.y + c.t * 0.8; const k = c.t < 0.15 ? c.t / 0.15 : 1; c.s.scale.set(2.4 * (0.6 + 0.4 * k), 0.8 * (0.6 + 0.4 * k), 1); c.s.material.opacity = Math.max(0, 1 - Math.max(0, c.t - 0.9) / 0.5); if (c.t > 1.5) { c.s.removeFromParent(); c.s.material.map.dispose(); this.comics.splice(i, 1); } } }
  // ---- HUD
  showHud(on) { this.hudOn = on; this.ui.hud.classList.toggle('on', on); if (!on) { this.ui.hud.innerHTML = ''; this.discs = []; } }
  buildHud() {
    const ev = this.ev, h = this.ui.hud; h.innerHTML = ''; this.discs = [];
    const local = ev.lanes.filter((l) => l.kind === 'local' || (ev.lanes.length === 1 && l.kind === 'bot'));
    h.innerHTML = '<div class="widgets"></div><div class="hudscore hudtag"></div><div class="hudtime hudtag"></div><div class="hudsub bigmsg centerline" style="top:22vh"></div>';
    const n = ev.lanes.length;
    for (const lane of ev.lanes) { if (lane.kind === 'ghost' || (this.attract && lane.id > 0 && false)) continue; if (n === 1 || lane.kind === 'local' || this.attract) { const d = new DiscView(h, lane, n > 1 ? lane.id : -1, n); this.discs.push(d); } }
    this.hudScores = h.querySelector('.hudscore'); this.hudTime = h.querySelector('.hudtime'); this.hudW = h.querySelector('.widgets'); this.hudMsg = h.querySelector('.bigmsg');
    this.ui.setPrompts(ev.prompts ? ev.prompts() : null);
  }
  updateHud(dt) {
    if (!this.hudOn || !this.ev || this.ev.disposed) return; const ev = this.ev; const l0 = ev.lanes.find((l) => l.kind !== 'ghost') || ev.lanes[0]; if (!l0) return;
    const info = ev.hudInfo ? ev.hudInfo(l0) : { score: l0.score, left: Math.max(0, ev.duration - ev.t), widgets: [] };
    const multi = ev.lanes.length > 1; this.hudScores.innerHTML = multi ? ev.lanes.map((l) => `<span style="color:${l.color}">${esc(l.name.split(' ')[0])}</span> ${Math.round(ev.hudInfo ? ev.hudInfo(l).score : l.score)}`).join('<br>') : String(Math.round(info.score));
    if (this.hudScores.style.fontSize !== (multi ? '0.55em' : '')) this.hudScores.style.fontSize = multi ? '0.55em' : '';
    this.hudTime.textContent = ev.phase === 'countdown' ? Math.ceil(ev.cdT) : info.left === null ? '' : Math.ceil(info.left);
    const wh = (info.widgets || []).map((w) => `<span class="w hudsub" data-w="${w.id}">${w.html}</span>`).join(''); if (this._wh !== wh) { this.hudW.innerHTML = wh; this._wh = wh; }
    if (this.hudMsg) this.hudMsg.textContent = ev.phase === 'countdown' ? '' : (ev.banner ? ev.banner() : '');
    for (const d of this.discs) d.update(ev, dt);
    if (ev.phase === 'play' && this.ui.promptItems !== (ev.prompts && ev.prompts())) { const p = ev.prompts && ev.prompts(); if (p && p !== this.ui.promptItems) this.ui.setPrompts(p); }
  }
  // ---- state for tests
  state() {
    const ev = this.ev; const prof = this.profile;
    return { screen: this.screenName, attract: !!this.attract, day: prof ? prof.day : 0, step: prof ? prof.step : 0, profile: prof ? prof.name : null, marbles: prof ? prof.marbles : 0, tilt: this.island ? +(this.island.restTarget ?? 0).toFixed(3) : 0, wobbleAge: prof && prof.ages.length ? prof.ages[prof.ages.length - 1] : null, ages: prof ? prof.ages.slice() : [], levelled: prof ? prof.levelled : false,
      event: ev ? ev.snapshot() : null, input: { lastDevice: this.input.lastDevice, glyphSet: this.settings.glyphs }, audio: { state: this.audio.state, music: this.settings.music, sfx: this.settings.sound, voice: this.settings.voice, musicGain: this.audio.g ? this.audio.g.music.gain.value : this.settings.music / 100, events: this.audio.events, track: this.audio.track }, render: { backend: this.gfx.backend, frames: this.gfx.frames, lost: this.gfx.lost }, errors: this.errors.slice(0, 5).map((e) => String(e).slice(0, 160)), session: !!this.session, touchOnly: this.touchOnly, god: this.god, paused: this.paused, speech: this.speech ? this.speech.text : null, detune: this.audio.detune(1) };
  }
}
export class DiscView {
  constructor(h, lane, idx, n) {
    this.lane = lane; this.d = el('div', 'disc'); const sz = n > 1 ? 0.62 : 1; this.d.style.width = this.d.style.height = `calc(var(--u)*${238 * sz})`; this.d.style.left = n > 1 ? `calc(${(idx + 0.5) / n * 90 + 5}vw - var(--u)*${119 * sz})` : '5vw'; if (n > 1) this.d.style.bottom = `calc(var(--u)*${118})`;
    this.d.innerHTML = `<svg viewBox="-120 -120 240 240"><circle r="112" fill="#FFF4DCCC" stroke="#1A1420" stroke-width="6"/><circle r="75" fill="none" stroke="#1A142055" stroke-width="3"/><circle r="38" fill="none" stroke="#1A142055" stroke-width="3"/><path d="M-112 0H112M0-112V112" stroke="#1A142033" stroke-width="2"/><g class="zones"></g><g class="marks"></g><polyline class="trail" fill="none" stroke="#1A1420" stroke-width="4" stroke-linecap="round" opacity=".6"/><circle class="ask" r="12" fill="none" stroke="#3B82F6" stroke-width="5" stroke-dasharray="6 5"/><circle class="dot" r="12" fill="${lane.color}" stroke="#1A1420" stroke-width="5"/></svg>`;
    h.appendChild(this.d); this.dot = this.d.querySelector('.dot'); this.ask = this.d.querySelector('.ask'); this.zones = this.d.querySelector('.zones'); this.marks = this.d.querySelector('.marks'); this.trail = this.d.querySelector('.trail'); this.hist = []; this.cur = null; this.cx = 0; this.cz = 0;
  }
  update(ev, dt) {
    const lane = this.lane, b = lane.bal; if (!b) return; const R = 106;
    const x = Math.max(-1.1, Math.min(1.1, b.cobX)), z = Math.max(-1.1, Math.min(1.1, b.cobZ)); this.dot.setAttribute('cx', x * R); this.dot.setAttribute('cy', z * R); this.dot.setAttribute('opacity', b.fallen ? 0.3 : 1);
    this.hist.push([x * R, z * R]); if (this.hist.length > 20) this.hist.shift(); this.trail.setAttribute('points', this.hist.map((p) => p.join(',')).join(' '));
    const info = ev.discInfo ? ev.discInfo(lane) : {}; const w = lane.intent; const ax = Math.max(-1, Math.min(1, w.ax ?? 0)), az = Math.max(-1, Math.min(1, w.az ?? 0)); this.ask.setAttribute('cx', ax * R); this.ask.setAttribute('cy', az * R); this.ask.setAttribute('opacity', lane.kind === 'local' && ev.phase !== 'done' ? 0.9 : 0);
    const sig = JSON.stringify([info.zone, info.zones]); if (sig !== this.zsig) { this.zsig = sig; const zs = info.zones || (info.zone ? [info.zone] : []); this.zones.innerHTML = zs.map((z0) => `<circle cx="${z0.x * R}" cy="${z0.z * R}" r="${z0.r * R}" fill="${z0.good ? '#22C55E66' : '#F5B70055'}" stroke="#1A1420" stroke-width="3" stroke-dasharray="${z0.dash ? '6 5' : '0'}"/>`).join(''); }
    if (info.zone) { const c = this.zones.firstChild; if (c) { const inz = Math.hypot(x - info.zone.x, z - info.zone.z) < info.zone.r; c.setAttribute('fill', inz ? '#22C55EAA' : '#F5B70055'); } }
    const ms = (info.marks || []).map((m) => `<circle cx="${m.x * R}" cy="${m.z * R}" r="${m.r * R}" fill="none" stroke="#E8443A" stroke-width="5"/>`).join(''); if (ms !== this.msig) { this.msig = ms; this.marks.innerHTML = ms; }
  }
}
