// App: scene switching, save, settings, tunables, device, sound, session, debug API. Persistent state lives here.
import { Save, newSlot } from './core/save.js';
import { Device, listenAny } from './core/device.js';
import { Clock } from './core/clock.js';
import { T, resetAll, changed, setT } from './core/tunables.js';
import { PAD_MAP } from './core/actions.js';
import { Nav } from './ui/widgets.js';
import { Dialogue } from './ui/dialogue.js';
import { registerSfx } from './audio/sfx.js';
import { syllabify, renderVoice, SPEAKERS } from './audio/voice.js';
import { SONGS } from './audio/songs.js';
import { TITLE } from './data/title.js';
import { MedleyState } from './core/medley.js';
import { Net } from './core/net.js';
import { newSlot as mkSlot } from './core/save.js';
import { AboutScreen } from './ui/screens/about.js';
import { DevScreen } from './ui/screens/dev.js';
import { ACTIVITIES } from './data/activities.js';

export const DEFAULT_SETTINGS = { music: 0.1, sfx: 0.8, voice: 0.8, glyph: 0, gentle: false, mouseRadius: 70, stepOffset: 0, reduceFlashes: false, look: 0, pixelSize: 0, fullscreen: false };
export const LOOKS = ['default', 'storybook', 'arcade', 'handheld'];

export class App {
  constructor() {
    this.save = new Save();
    this.nav = new Nav();
    this.device = new Device();
    this.clock = new Clock();
    this.dialogue = new Dialogue(this);
    this.T = T;
    this.registry = {};
    this.session = null; // hub info
    this.scene = null; this.ctx = null; this.engine = null;
    this.busy = false; this.attract = null; this.promptLog = null; this.log = [];
    this.touchOnly = false; this.voiceLog = []; this.sfxLog = [];
    this.slotIndex = 0; this.slot = null;
    this.rngs = {};
    this.settings = { ...DEFAULT_SETTINGS, ...this.save.settings };
    this.moodNow = 'neutral';
    this.frame = 0;
    this.MedleyState = MedleyState;
  }
  attach(engine) {
    this.engine = engine; this.ctx = engine.context;
    engine.input.gamepadButtons = { ...PAD_MAP }; engine.input.gamepadDeadzone = 0.12;
    registerSfx(engine.audio);
    this.applySettings(true);
    globalThis.__GAME__ = this;
    this.stopAny = listenAny(() => this.rawInput());
  }
  rawInput() { this.device.idle = 0; if (this.attract && !(this.attract.grace > 0)) this.attract.exit = true; this.touchTapped = true; }
  // ---------- settings ----------
  setSetting(k, v) { this.settings[k] = v; this.save.settings[k] = v; this.save.write(); this.applySettings(); }
  resetSettings() { this.settings = { ...DEFAULT_SETTINGS }; this.save.data.settings = {}; this.save.write(); this.applySettings(); }
  applySettings(boot = false) {
    const s = this.settings, e = this.engine; if (!e) return;
    e.audio.setVolume('music', s.music);
    e.audio.setVolume('sfx', s.sfx);
    this.device.xbox = s.glyph === 1;
    T.mouseLeanRadius = s.mouseRadius; T.stepOffsetMs = s.stepOffset;
    if (this.voiceGain) this.voiceGain.gain.value = s.voice;
    try {
      const look = [undefined, 'storybook', 'arcade', 'handheld'][s.look];
      if (!boot || look) e.settings?.set?.({ look: look ? look : undefined, pixelSize: s.pixelSize || undefined });
    } catch { /* headless */ }
  }
  get gentle() { return !!this.settings.gentle; }
  /** Ring radius in Dot units for an activity ring. */
  ring(r) { return r * T.ringScale * (this.gentle ? 1.25 : 1); }
  noise() { return this.gentle ? 0.8 : 1; }
  // ---------- sound ----------
  sfx(name, o) { try { this.engine?.audio.play(name, o); } catch { /* */ } this.sfxLog.push(name); if (this.sfxLog.length > 40) this.sfxLog.shift(); }
  music(name) { const song = SONGS[name]; if (!song) return; this.engine.audio.playMusic(song, name); this.musicName = name; }
  stopMusic() { this.engine.audio.stopMusic(); this.musicName = ''; }
  speak(who, text, syls = null) {
    syls ??= syllabify(text, who);
    this.voiceLog.push({ who, text: text.slice(0, 40) }); if (this.voiceLog.length > 20) this.voiceLog.shift();
    const ac = this.engine?.audio.context, bus = this.engine?.audio.buses?.sfx;
    if (!ac || !bus || this.settings.voice <= 0 || this.session?.ended) return syls;
    if (!this.voiceGain) { this.voiceGain = ac.createGain(); this.voiceGain.gain.value = this.settings.voice; this.voiceGain.connect(bus); }
    try { renderVoice(ac, this.voiceGain, syls, ac.currentTime + 0.02, who, 0.5); } catch { /* */ }
    return syls;
  }
  // ---------- rng ----------
  rng(label) {
    if (this.session && globalThis.AIHub?.rng) return globalThis.AIHub.rng(label);
    const r = this.ctx?.random?.fork?.('app:' + label);
    return r ? () => r.range(0, 1) : Math.random;
  }
  // ---------- scenes ----------
  register(id, make) { this.registry[id] = make; }
  make(id, args) { const m = this.registry[id]; if (!m) throw new Error('no scene ' + id); return m(this, args ?? {}); }
  async go(id, args = {}, { instant = false } = {}) {
    if (this.busy) return;
    this.busy = true;
    const e = this.engine;
    try {
      this.nextId = id;
      if (!instant && this.scene) await e.screen.cover('iris');
      const sc = this.make(id, args);
      this.dialogue.queue.length = 0; this.dialogue.cur = null; this.dialogue.done = null;
      e.timeScale = 1;
      await e.loadGame(sc, { camera: sc.camera ?? sc.constructor.camera });
      if (!instant) await e.screen.reveal('iris');
    } finally { this.busy = false; }
  }
  // ---------- medley (Family Hour and AI Hub sessions) ----------
  startMedley(specs) {
    const r = this.rng('medley');
    this.medley = new MedleyState(specs, r);
    this.medleyGo(0);
  }
  medleyGo(k) {
    const m = this.medley; m.event = k;
    return this.go('activity', { id: m.picks[k], medley: true, event: k, lanes: m.specs, dropIn: true }, { instant: !!this.session });
  }
  medleyAdvance(k) { if (k < 2) this.medleyGo(k + 1); else this.go('podium', {}); }
  beginSessionMedley() {
    const info = this.session, me = info.me;
    const specs = info.players.slice(0, 4).map((p, i) => ({ kind: p.id === me ? 'local' : 'ghost', pid: p.id, name: p.name, seat: i, look: { ...[{ skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink' }, { skin: 'orange', top: 'lime', bottom: 'navy', shoe: 'white', hair: 'ink', style: 'spike' }, { skin: 'red', top: 'sky', bottom: 'slate', shoe: 'ink', hair: 'plum', style: 'long' }, { skin: 'plum', top: 'orange', bottom: 'white', shoe: 'white', hair: 'ink', style: 'bun' }][i % 4], top: ['red', 'blue', 'green', 'orange'][i % 4] } }));
    const r = this.rng('medley');
    this.medley = new MedleyState(specs, r);
    this.medleyGo(0);
  }
  onHubStart() {}
  onHubEnd() { if (this.session) { this.session.ended = true; try { this.engine.audio.stopMusic(); this.engine.audio.stopLoops(); } catch { /* */ } } }
  onHubTimeUp() {
    const m = this.medley, net = this.net; if (!net || net.resultSent) return;
    const mi = Math.max(0, m ? m.specs.findIndex((s) => s.kind === 'local') : 0), t = m?.totals() ?? [0];
    net.result({ score: t[mi] ?? 0, stats: { Stillness: m?.scores[0][mi] ?? 0, Beat: m?.scores[1][mi] ?? 0, Balance: m?.scores[2][mi] ?? 0 }, awards: [] });
  }
  // ---------- attract mode ----------
  get playlist() { return [{ id: 'hub' }, { id: 'weighin' }, { act: 'tree' }, { act: 'squat' }, { act: 'hoop' }, { act: 'header' }, { act: 'step' }, { act: 'slack' }, { act: 'tray' }, { act: 'pier' }, { act: 'jog' }, { act: 'longstand' }]; }
  startAttract() {
    if (this.attract || this.session || this.busy) return;
    this.attract = { i: -1, grace: 0.6, line: null, exit: false }; this.realSlot = this.slot; this.realSlotIndex = this.slotIndex;
    const s = mkSlot('Recording', 1); s.day = 7; s.intro = true; s.phase = 'free'; s.drips = 90; s.ages = [66, 63, 60, 58, 57, 55]; s.tests = [0.4, 0.5, 0.55, 0.6, 0.62, 0.7]; this.slot = s;
    this.attractNext();
  }
  attractNext() {
    const a = this.attract; if (!a) return;
    a.i = (a.i + 1) % this.playlist.length; const it = this.playlist[a.i];
    const lines = ['This is a recording. The person in it is doing better than you.', 'The recording has never fallen over. It is not a person.', 'This is the Dot. Keep it in the circle. That is the game.', 'Please press any button. The recording is tired.'];
    a.line = lines[a.i % lines.length]; a.t = 0;
    this.go(it.id ?? 'activity', it.act ? { id: it.act, skill: 'expert', skipIntro: true } : { attract: true, skill: 'expert' });
  }
  stopAttract() {
    if (!this.attract) return;
    this.attract = null; this.slot = this.realSlot ?? null; this.slotIndex = this.realSlotIndex ?? 0; this.device.idle = 0;
    this.engine.timeScale = 1; this.stopMusic();
    this.go('title', {});
  }
  // ---------- overlays reachable from the pause menu ----------
  openDev(scene) { if (this.session) return; if (!this.slot) { this.slot = mkSlot('Dev', 0); this.slot.day = 1; this.slot.intro = true; this.slot.phase = 'free'; } scene.pop(); scene.push(new DevScreen(this, scene)); }
  openAbout(scene) { scene.push(new AboutScreen(this)); }
  freshSlot(name = 'Tester', day = 1, avatar = 0) { const s = mkSlot(name, avatar); s.day = day; s.intro = true; s.phase = 'free'; return this.openSlot(0, s); }
  /** Test hook: render a line through the formant voice in an OfflineAudioContext; returns { rms, f0 }. */
  async voiceProbe(speaker, text) {
    const syls = syllabify(text, speaker), dur = Math.min(6, (syls.at(-1)?.t ?? 1) + 0.6);
    const ac = new OfflineAudioContext(1, Math.ceil(44100 * dur), 44100);
    renderVoice(ac, ac.destination, syls, 0.02, speaker, 0.5);
    const buf = await ac.startRendering(), d = buf.getChannelData(0);
    let s2 = 0; for (let i = 0; i < d.length; i++) s2 += d[i] * d[i];
    return { rms: Math.sqrt(s2 / d.length), f0: syls.reduce((a, s) => a + s.f0, 0) / Math.max(1, syls.length), syllables: syls.length };
  }
  // ---------- save helpers ----------
  get S() { return this.slot; }
  openSlot(i, fresh = null) {
    this.slotIndex = i;
    if (fresh) { this.save.setSlot(i, fresh); }
    this.slot = this.save.slot(i);
    return this.slot;
  }
  commit() { if (this.slot && !this.session && !this.attract && this.slot.name !== 'Dev') { this.save.data.slots[this.slotIndex] = this.slot; this.save.write(); } }
  // ---------- debug API ----------
  state() {
    const sc = this.scene, s = this.slot;
    return {
      title: TITLE, scene: sc?.constructor?.id ?? null, status: sc?.status?.(this.ctx) ?? '', phase: sc?.phase ?? null,
      device: this.device.last, glyphSet: this.device.glyphSet, prompts: this.promptLog, padConnected: this.device.padConnected,
      music: this.engine?.audio.volume.music, musicName: this.musicName, sfxVol: this.engine?.audio.volume.sfx,
      session: this.session ? { me: this.session.me, players: this.session.players?.length } : null, aiHub: !!globalThis.AIHub?.active,
      day: s?.day, drips: s?.drips, slot: this.slotIndex, attract: !!this.attract, overlay: sc?.stack?.[sc.stack.length - 1]?.id ?? null,
      touchOnly: this.touchOnly, tunablesChanged: changed(), settings: this.settings, dialogue: this.dialogue.active, busy: this.busy,
      voice: this.voiceLog.slice(-3), layout: sc?.layoutOk?.() ?? null, ...(sc?.extraState?.() ?? {}),
    };
  }
  go2(id, args) { return this.go(id, args); }
}
export const app = new App();
/** Tests: a clean singleton for each boot. */
export function resetApp() { const fresh = new App(); for (const k of Object.keys(app)) delete app[k]; Object.assign(app, fresh); resetAll(); return app; }
export { newSlot };
