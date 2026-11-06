// TRAUMA CANTINA: a surgical drama in pixel art, built on the Riftlight pixel engine.
// Controls: pad (DualSense): left stick moves the tip, R2 uses, right stick flicks to pick a tool, L2 gift, L1 steady, Options pauses.
//           keyboard + mouse: mouse (or WASD) moves, left click uses, 1-8 tools, Space gift, Shift steady, Esc pauses.
import { Engine, withUrlOptions, THREE, PALETTE } from './pixel-engine.js';
import { app } from './src/app.js';
import { go, swap } from './src/core/nav.js';
import { registerSfx } from './src/content/sfx.js';
import { loadVoices } from './src/audio/voice.js';
import { LOOK } from './src/core/look.js';
import { MenuStage } from './src/stages/menu.js';
import { StoryStage } from './src/stages/story.js';
import { BriefingStage } from './src/stages/briefing.js';
import { OperationStage } from './src/stages/operation.js';
import { ResultsStage } from './src/stages/results.js';
import { ConsultStage } from './src/stages/consult.js';
import { CreditsStage } from './src/stages/credits.js';
import { CardStage } from './src/stages/card.js';
import { attractStart, attractNext } from './src/stages/attract.js';
import { connectSession, makeNet } from './src/net/session.js';
import { BY_ID } from './src/content/ops/index.js';
import { cfg } from './src/core/config.js';
import { SESSION_ROUNDS } from './src/content/ops/index.js';

const hasDoc = typeof document !== 'undefined';
const Q = hasDoc ? new URLSearchParams(location.search) : new URLSearchParams();
const SESSION = hasDoc && !!window.AIHub?.active;

go.title = (ctx, a) => swap(ctx, new MenuStage({ screen: 'title', ...a }));
go.menu = (ctx, a) => swap(ctx, new MenuStage({ screen: 'main', ...a }));
go.story = (ctx, sceneId, o = {}) => swap(ctx, new StoryStage({ sceneId, ...o }));
go.briefing = (ctx, opId, o = {}) => swap(ctx, new BriefingStage({ opId, ...o }));
go.operation = (ctx, a) => swap(ctx, new OperationStage(a));
go.results = (ctx, a) => swap(ctx, new ResultsStage(a));
go.credits = (ctx) => swap(ctx, new CreditsStage());
go.consult = (ctx) => swap(ctx, new ConsultStage());
go.attractStart = attractStart; go.attractNext = attractNext;

class BootStage {
  name = 'Trauma Cantina';
  async setup(ctx) {
    app.ready = false; ctx.input.preventKeys.add('Tab'); ctx.input.preventKeys.add('Space');
    ctx.engine.input.gamepadButtons = {}; // pad buttons press no keyboard codes; we read pads ourselves
    if (hasDoc) { ctx.engine.container?.addEventListener('contextmenu', (e) => e.preventDefault()); window.addEventListener('contextmenu', (e) => e.preventDefault()); }
    ctx.engine.setLook(LOOK(1, 0.3, 0));
    registerSfx(ctx.audio); await loadVoices(ctx.audio);
    let fresh = true; try { fresh = !localStorage.getItem('pixel-engine:audio'); } catch {}
    if (fresh) ctx.audio.setVolume('music', 0.1);
    app.applySettings(ctx); app.ready = true; this.t = 0; this.ctx = ctx;
    if (typeof window !== 'undefined') window.__GAME__ = { app, goto: (k, ...a) => go[k](ctx, ...a), config: cfg, ctx, go, op: null, BY_ID };
  }
  cameraTarget() { return new THREE.Vector3(0, 0, 0); }
  status() { return `boot ready=${app.ready}`; }
  update(ctx, dt) {
    this.t += dt; if (!app.ready || this.leaving || !hasDoc) return; this.leaving = true;
    const op = Q.get('op'), scene = Q.get('scene'), mode = Q.get('attract');
    if (SESSION && this.session) return;
    if (op && BY_ID[op]) return void go.operation(ctx, { opId: op, startStage: +(Q.get('stage') || 0), difficulty: Q.get('diff') || 'resident', seed: +(Q.get('seed') || 1), botAll: Q.get('bot') === '1', skill: Q.get('bot') ? +(Q.get('skill') || 1) : undefined, cheats: Q.get('god') === '1' ? { god: true } : null, noDive: true, noSave: true });
    if (scene) return void go.story(ctx, scene, { back: 'menu' });
    if (mode === '1') return void attractStart(ctx);
    go.title(ctx, {});
  }
}
export const createGame = () => new BootStage();

async function main() {
  if (SESSION) {
    const AIHub = window.AIHub; let info = null;
    try { info = await connectSession(AIHub); } catch (e) { info = null; }
    if (info) return runSession(AIHub, info);
  }
  runStandalone();
}
function engineOptions(extra = {}) {
  return withUrlOptions({ container: document.getElementById('app'), aspect: 'fill', touch: false, background: PALETTE.ink, camera: { preset: 'fixed', position: [0, 9.6, 3.1], target: [0, 0, 0.1], fov: 44, minZoom: 1, maxZoom: 1 }, look: LOOK(1, 0.3, 0), settings: { button: false, key: false }, ...extra });
}
function touchOnly() { try { const fine = matchMedia('(any-pointer: fine)').matches; const pads = (navigator.getGamepads?.() || []).some(Boolean); return !fine && navigator.maxTouchPoints > 0 && !pads; } catch { return false; } }
function showMsg(text) { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font:bold 22px monospace;background:#0d0b14;text-align:center;padding:20px;z-index:9'; d.textContent = text; document.body.appendChild(d); return d; }
async function runStandalone() {
  if (!navigator.gpu) { showMsg('TRAUMA CANTINA NEEDS WEBGPU. TRY A RECENT CHROME, EDGE OR SAFARI 26.'); return; }
  const gate = touchOnly(); let gateEl = null;
  if (gate) { app.devices.touchOnly = true; gateEl = document.createElement('div'); gateEl.id = 'gate'; gateEl.textContent = 'Controller or keyboard required'; gateEl.style.cssText = 'position:fixed;left:0;right:0;bottom:12%;text-align:center;color:#fff;font:bold 6vmin monospace;background:rgba(13,11,20,.8);padding:2vmin;z-index:8;pointer-events:none'; document.body.appendChild(gateEl); const drop = () => { gateEl?.remove(); gateEl = null; app.devices.touchOnly = false; }; window.addEventListener('keydown', drop, { once: true }); window.addEventListener('gamepadconnected', drop, { once: true }); }
  const eng = await Engine.start(createGame(), engineOptions(gate ? { settings: { button: 'top-right', key: false } } : {}));
  if (gate) { window.__GATE__ = true; }
  window.__ENGINE__ = eng; app.engine = eng;
}
async function runSession(AIHub, info) {
  app.session = info; document.body.dataset.session = '1';
  if (!navigator.gpu && !info.server) { AIHub.fail('WebGPU unavailable'); return; }
  const net = makeNet(AIHub, info); app.net = net;
  AIHub.on('end', () => { try { app.engine?.audio?.playMusic(null); app.engine?.audio?.stopLoops(); } catch {} net.host?.stop(); });
  if (info.server) { AIHub.ready(); return; }
  let card = null, started = false;
  class SessionBoot extends BootStage {
    async setup(ctx) { await super.setup(ctx); this.session = true; this.ctx2 = ctx; }
    update(ctx, dt) {
      if (!app.ready || this.leaving) return; this.leaving = true;
      card = new CardStage({ info }); ctx.engine.loadGame(card).then(() => { AIHub.ready(); });
    }
  }
  AIHub.on('card', (c) => card?.setCard(c));
  AIHub.on('start', () => { const ctx = app.engine?.ctx || window.__GAME__?.ctx; if (!ctx || started) return; started = true; swap(ctx, new OperationStage({ opId: net.def.id, session: true, net, noDive: true, noSave: true, difficulty: 'resident' })); });
  const eng = await Engine.start(new SessionBoot(), engineOptions());
  app.engine = eng;
}
if (hasDoc) await main();
