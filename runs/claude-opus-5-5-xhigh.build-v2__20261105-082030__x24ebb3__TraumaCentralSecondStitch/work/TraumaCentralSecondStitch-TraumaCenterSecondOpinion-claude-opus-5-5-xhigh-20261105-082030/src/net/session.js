// An AI Hub session: no title, menus, pause, saves, attract or dev mode. Rounds are the hub's.
import { App } from '../app.js';
import { CardStage } from '../stages/card.js';
import { OperationStage, OP_CAMERA } from '../stages/operation.js';
import { HostLoop } from './host.js';
import { ClientSource, HostSource } from './client.js';

export function runSession(info, { Engine, BASE_OPTIONS }) {
  const hub = window.AIHub;
  App.inSession = true;
  const S = { info, host: null, source: null, stage: null, engine: null, started: false, ended: false };
  if (hub.isHost) {
    S.host = new HostLoop(info);
    S.host.start();
  }
  hub.on('card', (c) => { if (S.card) S.card.card = c; S.lastCard = c; });
  hub.on('start', () => beginCountdown(S));
  hub.on('message', (data, from) => {
    if (S.host) S.host.onInput(data, from);
    else if (S.source) S.source.onMessage?.(data);
    else (S.pending = S.pending ?? []).push(data);
  });
  hub.on('leave', ({ id }) => { if (S.host) S.host.retire(id); });
  hub.on('time-up', () => { if (hub.isHost && S.host) S.host.finish(false); });
  hub.on('end', () => stopEverything(S));

  // A server copy never starts the engine.
  if (info.server) { hub.ready(); return; }
  if (!navigator.gpu) { hub.fail('WebGPU unavailable'); return; }
  startEngine(S, Engine, BASE_OPTIONS);
}

async function startEngine(S, Engine, BASE_OPTIONS) {
  const hub = window.AIHub;
  const card = new CardStage(S.info, { engineReady() { if (!S.readySent) { S.readySent = true; hub.ready(); } } });
  S.card = card;
  if (S.lastCard) card.card = S.lastCard;
  S.source = S.host ? new HostSource(S.host, S.info) : new ClientSource(S.info);
  if (S.pending) { for (const d of S.pending) S.source.onMessage?.(d); S.pending = null; }
  try {
    S.engine = await Engine.start(card, { ...BASE_OPTIONS, container: document.getElementById('app'), settings: { button: false, key: false }, camera: card.cameraConfig });
  } catch (err) {
    hub.fail(String(err?.message ?? err));
    return;
  }
  if (S.startPending) beginCountdown(S);
}

function beginCountdown(S) {
  if (S.started || S.info.server) return;
  if (!S.engine) { S.startPending = true; return; }
  S.started = true;
  S.card = null;
  S.source.silentMusic = false;
  const stage = new OperationStage({
    opId: S.host ? S.host.def.id : S.source.def.id,
    mode: 'net',
    source: S.source,
    seats: [{ binding: 'all' }],
    viewSeat: Math.max(0, S.source.seatIndex ?? 0),
    drawExtra: (st, ctx, ui) => drawCountdown(ui),
  });
  S.stage = stage;
  // The local tip's controller lives on the source, and the stage's table follows it.
  stage.controls = [];
  App.goto(stage, { kind: 'iris', duration: 0.2, camera: OP_CAMERA });
}

function drawCountdown(ui) {
  const t = window.AIHub.time();
  if (t === -Infinity || t >= 0) { if (t >= 0 && t < 900) ui.center(ui.h * 0.32, 'SCRUB IN!', { color: 'lime', scale: 3 }); return; }
  ui.center(ui.h * 0.32, String(Math.ceil(-t / 1000)), { color: 'white', scale: 5 });
}

function stopEverything(S) {
  if (S.ended) return;
  S.ended = true;
  S.host?.stop();
  S.source?.stop?.();
  if (S.source) S.source.ended = true;
  try {
    App.ctx?.audio.playMusic(null);
    App.ctx?.audio.stopLoops();
    App.director.stop();
  } catch { /* the page is going away */ }
}
