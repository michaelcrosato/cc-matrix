// Page entry: session or standalone, Engine.start, first scene.
import { Engine, PALETTE, withUrlOptions } from '../pixel-engine.js';
import { SLUG } from './config.js';
import { app, NATIVE_LOOK } from './core/app.js';
import { Area } from './game/area.js';
import { Launch } from './game/launch.js';
import { TitleScene } from './screens/title.js';
import { PauseMenu } from './screens/pause.js';
import { AttractDirector } from './screens/attract.js';
import { device } from './core/device.js';
import { startSession } from './net/session.js';
app.factories = { area: Area, launch: Launch, title: TitleScene }; app.PauseMenu = PauseMenu;
app.startAttract = (touch) => { if (app.attract) return; const d = new AttractDirector(app, !!touch); d.start(); };
export const startOptions = () => withUrlOptions({ container: document.getElementById('app'), camera: { preset: 'third', fov: 55 }, look: NATIVE_LOOK, quality: 'high', touch: false, settings: { button: false, key: SLUG }, debugUI: false, background: PALETTE.ink });
async function startStandalone() {
  const engine = await Engine.start(new TitleScene(app), startOptions()); app.attach(engine); window.__APP__ = app; const params = new URLSearchParams(location.search);
  if (params.get('g_area')) { app.run = (await import('./core/run.js')).newRun(); await app.goArea(params.get('g_area'), { jump: params.get('g_jump') || undefined, fromSave: true }); }
}
async function boot() {
  if (window.AIHub?.active) { const info = await window.AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); if (info) return startSession(info); }
  return startStandalone();
}
boot().catch((e) => { console.error(e); const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#f4f4f4;background:#1a1c2c;font:20px monospace;padding:40px;text-align:center'; d.textContent = `Failed to start: ${e?.message ?? e}. This game needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox on Windows.`; document.body.append(d); });
