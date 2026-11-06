// Boot: engine, App, scenes, audio mix, hub. `createGame()` is what check.mjs --headless and the tests call.
import { Engine, withUrlOptions } from './pixel-engine.js';
import { App, loadProfile, applySettings, initVolumes } from './game/app.js';
import { RaceScene } from './game/scenes/race.js';
import { MenuScene } from './game/scenes/menu.js';
import { ReplayScene } from './game/scenes/replay.js';
import './game/scenes/flow.js';
import './game/api.js';
import { urlGame } from './game/boot.js';
import { Mix } from './game/audio/mix.js';
import { TITLE } from './game/data/meta.js';
import { EngineSynth } from './game/audio/enginesynth.js';
import { say as sayVoice } from './game/audio/voice.js';
import { startHub } from './game/net/hub.js';
import './game/attract/director.js';
import './game/net/couch.js';
import './game/render/pitcrew.js';
App.scenes.menu = MenuScene; App.scenes.race = RaceScene; App.scenes.replay = ReplayScene;
export function createGame() { loadProfile(); return urlGame(App) ?? new MenuScene({ screen: 'title' }); }
export async function boot() {
  const hub = typeof window !== 'undefined' ? window.AIHub : null; App.hubActive = !!hub?.active; loadProfile();
  const opts = (container, extra = {}) => withUrlOptions({ container, camera: { preset: 'fixed', position: [0, 5, -10], target: [0, 1, 0], fov: 58, minZoom: 1, maxZoom: 1 }, settings: { button: false }, touch: false, background: 0x0b0c1a, ...extra });
  const container = document.getElementById('p1');
  App.touchOnly = typeof matchMedia !== 'undefined' && !matchMedia('(any-pointer: fine)').matches && matchMedia('(pointer: coarse)').matches;
  try {
    let game, engine;
    if (App.hubActive) { const r = await startHub(hub, container, opts, afterStart); if (r) return r; }
    game = createGame(); engine = await Engine.start(game, opts(container));
    afterStart(engine); return engine;
  } catch (e) { const msg = 'This game needs WebGPU (a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows). ' + (e?.message ?? e); container.innerHTML = '<div style="color:#fff;font:16px monospace;padding:40px;max-width:640px">' + TITLE + '<br><br>' + msg.replace(/</g, '&lt;') + '</div>'; try { window.AIHub?.fail?.(msg); } catch {} console.error(e); }
}
export function afterStart(engine) {
  App.engine = engine; window.__ENGINE__ = engine; window.__SYNTH__ = EngineSynth; window.__SAY__ = sayVoice; window.__SAY_COUNT__ = (s, sp) => { const c = new OfflineAudioContext(1, 4000, 8000); return sayVoice(c, c.destination, s, sp).syllables; }; App.mix = new Mix(engine); App.ui.sounds = App.mix; initVolumes(engine.audio); applySettings(); if (App.hubActive) window.__HUBMUSIC__ = engine.audio.volume.music;
  App.music = { play(n) { const g = engine.game; if (g?.name === 'race' && App.profile.settings.musicOn === false) return; App.mix.music(n); } };
  if (typeof window !== 'undefined') window.addEventListener('keydown', () => { if (!App.touchOnly) return; App.touchOnly = false; }, { once: true });
}
if (typeof document !== 'undefined' && !globalThis.__NO_BOOT__) await boot();
