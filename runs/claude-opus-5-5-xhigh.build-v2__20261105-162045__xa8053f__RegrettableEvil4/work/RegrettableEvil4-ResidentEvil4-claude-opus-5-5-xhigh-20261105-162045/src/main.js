// Page entry. In a hub session: straight to the card. Otherwise the title.
import { Engine, PALETTE, withUrlOptions } from '../pixel-engine.js';
import { SLUG } from './config.js';
import { app, goto } from './core/app.js';
import { Device } from './core/device.js';
import { TitleScene, startNewClaim } from './screens/title.js';
import { AttractMode } from './screens/attract.js';
import { Area } from './game/area.js';
import { Run } from './core/run.js';
import { openNightShiftMenu, startSessionRound } from './screens/lobby.js';
import { DEV_TELEPORTS } from './data/levels/teleports.js';
import { devTeleport, makeGameFor } from './game/scenes.js';
import { Bot } from './game/bot.js';
import { TUNING } from './data/tuning.js';
import { openTelegraph } from './screens/telegraph.js';
import { openCredits } from './screens/credits.js';
import { openCase } from './screens/case.js';
import { openShop } from './screens/shop.js';
import { openDev } from './screens/dev.js';
import { openAbout } from './screens/about.js';
import { openSettings } from './screens/settings.js';
import { openPause } from './screens/pause.js';
import { openForm } from './screens/form.js';
import { openDenied } from './screens/denied.js';
import { openHostLobby, openJoinLobby, startSolo } from './screens/lobby.js';

const LOOK = {
  scene: [{ id: 'vignette', params: { intensity: 0.5, softness: 0.55 } }],
  actors: { pixel: { size: 1, outline: 0.65, crease: 0.12 }, filters: [] },
  environment: { pixel: { size: 1, outline: 0.4, crease: 0.08 }, filters: [] },
};

const startOptions = (extra = {}) => withUrlOptions({
  container: document.getElementById('app'),
  camera: { preset: 'third', fov: 55 },
  look: LOOK,
  quality: 'high',
  touch: false,
  settings: { button: false, key: SLUG },
  debugUI: false,
  background: PALETTE.ink,
  ...extra,
});

app.scenes = {
  title: () => goto(new TitleScene()),
  attract: () => goto(new AttractMode()),
  nightShiftMenu: () => openNightShiftMenu(),
};
app.devTeleport = devTeleport;
window.__APP__ = app;
window.__TUNING__ = TUNING;
window.__SCREENS__ = { openCredits, openTelegraph, openCase, openShop, openDev, openAbout, openSettings, openPause, openForm, openDenied, openHostLobby, openJoinLobby, openNightShiftMenu, startSolo };

function firstGame() {
  const params = new URLSearchParams(location.search);
  const areaId = params.get('g_area');
  if (areaId) {
    app.run = new Run();
    const entry = params.get('g_entry');
    if (params.get('g_diff')) app.run.difficulty = params.get('g_diff');
    if (params.get('g_chapter')) app.run.chapter = +params.get('g_chapter');
    if (params.has('g_cheat')) app.dev.god = true;
    const o = { fresh: true, noSave: params.has('g_nosave') };
    if (params.has('g_bot')) o.bot = new Bot({ cheat: params.has('g_cheat'), watchCut: +(params.get('g_watch') ?? 0.2) });
    if (params.get('g_start')) o.start = params.get('g_start').split(',').map(Number);
    for (const b of (params.get('g_skip') ?? '').split(',')) if (b) app.run.areaData(areaId).beats[b] = true;
    for (const f of (params.get('g_flags') ?? '').split(',')) if (f) app.run.setFlag(f);
    if (params.has('g_dame')) app.run.dameWith = true;
    return makeGameFor(areaId, entry, o);
  }
  return new TitleScene({ noAttract: params.has('g_noattract') });
}

async function startStandalone() {
  app.device.touchOnly = Device.detectTouchOnly();
  await Engine.start(firstGame(), startOptions());
}

async function boot() {
  if (window.AIHub?.active) {
    const info = await window.AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (info) { await startSessionRound(info, startOptions); return; }
  }
  await startStandalone();
}

boot().catch((e) => {
  console.error(e);
  if (window.AIHub?.active) window.AIHub.fail(String(e?.message ?? e));
});
export { startNewClaim, Area, DEV_TELEPORTS };
