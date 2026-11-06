// Entry: exports createGame() for headless play; starts the engine only where there is a document.
// Controls: pad (left stick move, Cross/Square/Triangle/Circle/R1/R2 skills, L2 dodge, L1 potion), keyboard and mouse (WASD, click, 1-4, Space, Q, E).
import { Engine, withUrlOptions } from './pixel-engine.js';
import { TollGame } from './src/modes/game.js';
import { TITLE } from './src/data/meta.js';

export const createGame = (opts = {}) => new TollGame(opts);

function failPage(msg) {
  if (typeof document === 'undefined') return;
  const app = document.getElementById('app'); if (!app) return;
  app.innerHTML = '';
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0d0b14;color:#ffcd75;font-family:monospace;text-align:center;padding:24px';
  const h = document.createElement('h1'); h.textContent = TITLE; const p = document.createElement('p'); p.textContent = 'This game needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox on Windows.'; const q = document.createElement('p'); q.style.color = '#94b0c2'; q.textContent = msg || '';
  d.append(h, p, q); app.append(d);
}

if (typeof document !== 'undefined') {
  const params = new URLSearchParams(location.search);
  const touchOnly = !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0;
  const opts = { fast: params.has('fast') };
  if (params.has('quick')) opts.quick = { cls: params.get('cls') || 'bellwarden', zone: params.get('zone') || 'ossuary1', level: +(params.get('level') || 5), lastBell: params.has('lastbell'), seed: +(params.get('seed') || 7), diff: params.get('diff') || 'pilgrim' };
  if (params.has('nosave')) opts.noSave = true;
  const window_ = window;
  let session = null;
  try { const { sessionBoot } = await import('./src/net/hubflow.js'); session = await sessionBoot(opts); } catch (e) { console.warn('hub flow', e && e.message); }
  const settingsBtn = touchOnly ? 'top-right' : false;
  try {
    if (session && session.server) {
      const game = createGame({ ...opts, session });
      const engine = await Engine.headless(game, {});
      await session.afterStart(game, engine);
    } else {
      const game = createGame({ ...opts, session: session && session.active ? session : null, noSave: opts.noSave || !!session });
      const engine = await Engine.start(game, withUrlOptions({
        container: document.getElementById('app'), camera: { preset: 'iso', viewHeight: 11.5, pitch: 42, yaw: 45, minZoom: 0.6, maxZoom: 1.5 },
        aspect: 'fill', quality: 'high', touch: false, settings: { button: settingsBtn }, look: undefined,
        background: 0x0d0b14,
      }));
      if (session) await session.afterStart(game, engine);
    }
  } catch (e) {
    console.error(e);
    if (typeof AIHub !== 'undefined' && AIHub.active) { try { AIHub.fail(String(e && e.message || e)); } catch {} }
    failPage(String(e && e.message || e));
  }
}
