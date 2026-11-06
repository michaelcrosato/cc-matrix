// The app: one engine, persistent state outside the levels, scene switching.
import { LOOK_PRESETS } from '../../pixel-engine.js';
import { SLUG } from '../config.js';
import { AREAS, CHAPTER_OF } from '../data/levels/areas.js';
import { resetTuning, TUNING, TUNING_DEFAULT } from '../data/tuning.js';
import { newRun } from './run.js';
import { loadSettings, save, storeSettings } from './save.js';
import { UI } from './ui.js';
import { PAD_BUTTONS } from './intent.js';
import { attachDevice, device } from './device.js';
import { codeFor, glyphLabel } from './ui.js';
import { Mix } from '../audio/mix.js';
import { DevTools } from '../game/devtools.js';
export const NATIVE_LOOK = { scene: [{ id: 'vignette', params: { intensity: 0.5, softness: 0.55 } }], actors: { pixel: { size: 1, outline: 0.65, crease: 0.12 }, filters: [] }, environment: { pixel: { size: 1, outline: 0.4, crease: 0.08 }, filters: [] } };
export class App {
  constructor() { this.settings = loadSettings(); this.ui = new UI(this); this.run = null; this.area = null; this.dev = new DevTools(this); this.session = null; this.wantLock = false; this.loading = false; this.pending = null; this.factories = {}; this.test = { TUNING, TUNING_DEFAULT, device, codeFor, glyphLabel: (c) => glyphLabel(c, this.settings.glyphs === 'xbox') }; }
  attach(engine) {
    if (this.engine === engine) return; this.engine = engine; this.mix = new Mix(this); engine.input.gamepadButtons = { ...PAD_BUTTONS }; engine.input.preventKeys.add('Tab'); engine.audio.persist = false; attachDevice(); this.applySettings(true);
    if (typeof document !== 'undefined' && engine.gpu) {
      const el = engine.gpu.renderer.domElement; el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && this.wantLock && !document.pointerLockElement) this.lockPointer(el); });
      document.addEventListener('pointerlockchange', () => { const A = this.area; if (!document.pointerLockElement && A?.player && !A.menu && !this.releasing && !A.attract && !A.cutscene && !A.o.noPause && this.lockedOnce) { A.openMenu?.(new this.PauseMenu(A)); } if (document.pointerLockElement) { this.lockedOnce = true; if (A) A.needClick = false; } this.releasing = false; });
    }
  }
  lockPointer(el) { const p = el.requestPointerLock?.(); p?.catch?.(() => { if (this.area) this.area.needClick = true; }); }
  wantPointerLock(on) { this.wantLock = on; if (typeof document === 'undefined') return; if (!on && document.pointerLockElement) { this.releasing = true; document.exitPointerLock(); } else if (on && this.engine?.gpu && device.last !== 'pad') { if (this.area) this.area.needClick = !document.pointerLockElement; } }
  applySettings(first) {
    const a = this.engine.audio, S = this.settings; a.setVolume('master', S.master); a.setVolume('sfx', S.sfx); a.setVolume('music', S.music * (this.mix?.scale ?? 1)); this.engine.shake.strength = S.shake;
    if (!this.engine.gpu) return;
    const set = this.engine.settings; const look = S.look === 'native' ? undefined : S.look; if (S.look === 'native') { this.engine.setLook(NATIVE_LOOK); } else if (LOOK_PRESETS[S.look]) this.engine.setLook(LOOK_PRESETS[S.look]);
    if (!first || S.pixelSize !== 'fine' || S.quality !== 'high' || S.fps !== 60) set.set({ pixelSize: S.pixelSize, quality: S.quality, fps: S.fps });
  }
  toggleFullscreen() { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.()?.catch?.(() => {}); }
  tick(ctx, dt) { this.dtReal = dt; }
  async load(game) {
    if (this.loading) return this.pending; this.loading = true; const e = this.engine;
    this.pending = (async () => { const covered = !!e.gpu && !e.manual; try { if (covered) { await e.screen.cover('iris'); } e.hud.clear(); e.timeScale = 1; await e.loadGame(game); if (covered) e.screen.reveal('iris'); } finally { this.loading = false; } })();
    return this.pending;
  }
  makeArea(id, o) { const C = AREAS[id].custom ? this.factories.launch : this.factories.area; return new C(this, id, o); }
  goArea(id, o = {}) { const ch = CHAPTER_OF[id]; if (ch && this.run) this.run.chapter = Math.max(this.run.chapter, Math.min(3, ch)); return this.load(this.makeArea(id, o)); }
  goTitle() { this.mix.stop(); this.wantPointerLock(false); return this.load(new this.factories.title(this)); }
  newGame(difficulty) { this.run = newRun(difficulty); resetTuning(); return this.goArea('quay'); }
  nextChapter(id, n) { this.run.chapter = Math.max(this.run.chapter, n); return this.goArea(id); }
  makeCheckpoint(A) { this.checkpointData = JSON.stringify(this.run); this.saveGame(); }
  saveGame() { if (this.session?.hub || !this.checkpointData) return; save.set('save', { run: JSON.parse(this.checkpointData), when: 1 }); }
  hasSave() { return !!save.get('save'); }
  continueGame() { const s = save.get('save'); if (!s) return; this.run = s.run; this.checkpointData = JSON.stringify(s.run); return this.resume(); }
  resume() { const r = this.run, e = r.entry; return this.goArea(r.area, { fromSave: true, resumed: true, ...(e ? { at: e.at, yaw: e.yaw, floor: e.floor } : {}) }); }
  restartCheckpoint() { this.run = JSON.parse(this.checkpointData); return this.resume(); }
  teleport(t) { this.run ??= newRun(); return this.goArea(t.area, { jump: t.jump, fromSave: true, noMusic: false }); }
}
export const app = new App();
