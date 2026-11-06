// Boot: session or standalone, engine start, title. The engine is never edited; our systems sit on top.
import { THREE } from '../../pixel-engine.js';
import { app } from './app.js';
import { Run } from './run.js';
import { TitleScene } from '../screens/title.js';
import { Area } from '../game/area.js';
import { makeGame } from '../game/flow.js';
import { byId, LEVELS } from '../data/levels/index.js';
import { SLUG } from '../config.js';
import { PAD_CODES, installDeviceTracking, device } from './device.js';
import { applySettings } from './settings.js';
import { loadGame as loadSave } from './save.js';
import { AboutScreen } from '../screens/about.js';
import { loadKey } from './store.js';
import { ShiftArea } from '../game/shift.js';
import { LobbyScreen, HubCard, ResultsScreen, BoardScreen, SettingsOverlay } from '../screens/lobby.js';
import { startAttract } from '../screens/attract.js';
import { TUNING } from '../data/tuning.js';

export const LOOK = { scene: [{ id: 'vignette', params: { intensity: 0.5, softness: 0.55 } }], actors: { pixel: { size: 1, outline: 0.65, crease: 0.12 }, filters: [] }, environment: { pixel: { size: 1, outline: 0.4, crease: 0.08 }, filters: [] } };

export function isTouchOnly() {
  try { const n = navigator; return n.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches && !(n.getGamepads && [...n.getGamepads()].some(Boolean)); } catch { return false; }
}
export const START_OPTS = (PALETTE, container) => ({ container, camera: { preset: 'third', fov: 55 }, quality: 'high', touch: false, settings: { button: false, key: SLUG }, debugUI: false, background: PALETTE.ink, look: LOOK });
export async function boot(Engine, withUrlOptions, PALETTE) {
  app.AboutScreen = AboutScreen; app.TitleClass = TitleScene; app.ResultsScreen = ResultsScreen; app.BoardScreen = BoardScreen; app.SettingsOverlay = SettingsOverlay;
  if (typeof window !== 'undefined' && window.AIHub?.active) {
    let info = null;
    try { info = await window.AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true }); } catch { info = null; }
    if (info) return startSession(Engine, withUrlOptions, PALETTE, info);
  }
  return startStandalone(Engine, withUrlOptions, PALETTE);
}
async function startSession(Engine, withUrlOptions, PALETTE, info) {
  const AIHub = window.AIHub;
  app.hub = true;
  if (!navigator.gpu) { AIHub.fail('WebGPU unavailable'); return; }
  const players = info.players.map((p) => ({ ...p, name: p.name || ('PLAYER ' + (p.id + 1)) }));
  const sess = Object.create(AIHub); // our session object is AIHub itself; players come from info
  const area = new ShiftArea({ session: AIHub });
  let engine;
  try { engine = await Engine.start(area, withUrlOptions({ ...START_OPTS(PALETTE, document.getElementById('app')), seed: info.seed })); } catch (e) { AIHub.fail('WebGPU unavailable'); return; }
  app.engine = engine; engine.input.gamepadButtons = PAD_CODES; engine.audio.persist = false; installDeviceTracking(); applySettings(engine); window.__APP__ = app;
  AIHub.on('end', () => { try { engine.audio.stopMusic(); engine.audio.stopLoops(); } catch { /* */ } area.shiftOver = true; area.ended = true; engine.input.release?.(); engine.timeScale = 0; });
  AIHub.on('time-up', () => { if (AIHub.isHost) area.endShift(false); });
  app.push(new HubCard(AIHub)); AIHub.ready();
}
async function startStandalone(Engine, withUrlOptions, PALETTE) {
  const q = new URLSearchParams(location.search);
  app.touchOnly = isTouchOnly();
  if (loadKey('dev')) Object.assign(TUNING, loadKey('dev'));
  let first;
  const direct = q.get('g_area');
  if (direct === 'shift') first = new ShiftArea({});
  else if (direct && byId(direct)) { app.run = new Run(q.get('g_diff') || 'standard'); first = makeGame(byId(direct), { run: app.run }); }
  else first = new TitleScene();
  const engine = await Engine.start(first, withUrlOptions(START_OPTS(PALETTE, document.getElementById('app'))));
  app.engine = engine; engine.input.gamepadButtons = PAD_CODES; engine.audio.persist = false; installDeviceTracking(); applySettings(engine);
  app.startNew = async (diff) => { app.run = new Run(diff); app.checkpoint = null; await app.go(makeGame(LEVELS[0], { run: app.run })); };
  app.continueGame = async () => { const s = loadSave(); if (!s) return; app.run = Run.from(s.run); app.run.areaFlags = { ...(app.run.areaFlags || {}), [s.areaId]: s.flags }; app.checkpoint = { ...s }; await app.go(makeGame(byId(s.areaId) || LEVELS[0], { run: app.run, entry: s.entry })); };
  app.devGo = async (level, beat) => { if (!app.run) app.run = new Run('standard'); await app.go(makeGame(level, { run: app.run, entry: beat?.entry, flags: beat?.flags })); };
  app.startShift = async (o) => { await app.go(new ShiftArea({ session: o.session || null })); };
  app.openLobby = (kind) => app.push(new LobbyScreen(kind));
  app.startAttract = () => startAttract();
  window.__APP__ = app; window.__DEVICE__ = device; window.__TUNING__ = TUNING;
}
