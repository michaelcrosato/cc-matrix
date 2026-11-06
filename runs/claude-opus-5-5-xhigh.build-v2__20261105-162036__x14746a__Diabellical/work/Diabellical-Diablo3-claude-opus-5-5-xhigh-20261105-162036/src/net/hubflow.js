// A session of AI Hub: straight into the round, no title or menus. The host's sim is the only truth.
import { Engine } from '../../pixel-engine.js';
import { TITLE } from '../data/meta.js';
import { GOAL_TEXT } from './card.js';
import { DiabellicalGame, VIGNETTE_LOOK } from '../modes/game.js';
import { botAfter } from '../sim/bot.js';
import { emptyIntent } from '../sim/intents.js';
import { roundResults, setupRound } from '../sim/round.js';
import { createWorld, stepWorld } from '../sim/world.js';
import { CardScreen } from './card.js';
import { NetClient } from './client.js';
import { NetHost } from './host.js';

const hubTransport = {
  send(data, o) {
    try { return AIHub.send(data, o) !== false; } catch { return false; }
  },
};

/** Everything hub-side for one copy: what game.net points at. */
export class HubNet {
  constructor(game, info) {
    this.game = game;
    this.info = info;
    this.seat = info.server ? null : info.me;
    this.isHost = !!info.isHost;
    this.started = false;
    this.ended = false;
    this.finished = false;
    this.card = { left: null, paused: false, starting: false, ready: [], asking: 0, asked: false };
    this.unsub = [];
  }

  setup(ctx) {
    const g = this.game;
    const info = this.info;
    const w = createWorld({ seed: info.seed >>> 0, camp: null, mode: 'session' });
    this.world = w;
    g.world = w;
    setupRound(w, info.players);
    w.events.length = 0;
    if (this.isHost) this.host = new NetHost(hubTransport, w, this.seat);
    else this.client = new NetClient(hubTransport, w, this.seat);
    g.isSession = true;
    g.isClient = !this.isHost;
    g.mode = 'play';
    g.net = this;
    if (!info.server) {
      g.view.setWorld(w);
      g.audioSys.music('vespers');
      g.openScreen(new CardScreen(g, this));
      ctx.engine.setLook(VIGNETTE_LOOK(0.3));
      // Enter must answer the card even if frames are slow: a plain listener, not the frame loop.
      this.onKey = (e) => {
        if (this.started) return;
        if (e.code === 'Enter') AIHub.answer('ready');
        else if (e.code === 'KeyM') AIHub.answer('more');
      };
      window.addEventListener('keydown', this.onKey);
    }
    this.unsub.push(AIHub.on('card', (c) => { this.card = c; }));
    this.unsub.push(AIHub.on('start', () => { this.started = true; }));
    this.unsub.push(AIHub.on('message', (data, from) => {
      if (this.ended) return;
      if (this.host) this.host.onMessage(data, from);
      else this.client?.onMessage(data, from);
    }));
    this.unsub.push(AIHub.on('leave', (e) => this.onLeave(e)));
    this.unsub.push(AIHub.on('time-up', () => this.onTimeUp()));
    this.unsub.push(AIHub.on('end', () => this.onEnd()));
  }

  onLeave({ id }) {
    const w = this.world;
    const h = w.heroes.find((o) => o.seat === id);
    if (!h) return;
    h.gone = true;
    w.heroes.splice(w.heroes.indexOf(h), 1);
    this.game.view?.ev_hero_gone?.({ id: h.id });
    for (const a of w.allies) if (a.owner === h.id) a.life = 0.01;
    if (!this.info.server) this.game.hudSys?.toast(`${h.name} LEFT`, 'mist');
  }

  onTimeUp() { if (this.isHost) this.finish(false); }

  finish(won) {
    if (this.finished) return;
    this.finished = true;
    const r = roundResults(this.world, won);
    try { AIHub.finish(r); } catch { /* the hub may already be gone */ }
  }

  onEnd() {
    this.ended = true;
    const g = this.game;
    g.audioSys?.stopAll();
    g.closeAll?.();
    if (this.onKey) window.removeEventListener('keydown', this.onKey);
    if (this.timer) clearInterval(this.timer);
    g.ctx?.input?.release?.();
  }

  /** Play has begun when the hub's clock passes zero. */
  get playing() { return !this.ended && this.started && AIHub.time() >= 0; }
  timeLeft() {
    if (!this.started) return null;
    return Math.max(0, (this.info.limitMs - AIHub.time()) / 1000);
  }

  localIntent() {
    const g = this.game;
    const h = g.localHero();
    if (!h || this.ended) return emptyIntent();
    if (g.menuBlocks()) return emptyIntent();
    return g.input.intentForHero(h, this.world);
  }

  fixedUpdate(dt) {
    if (!this.playing) return;
    const g = this.game;
    const w = this.world;
    if (this.host) {
      const intents = this.host.intents(this.seat === null ? null : this.localIntent());
      stepWorld(w, intents);
      if (w.events.length) {
        this.host.addEvents(w.events);
        if (!this.info.server) for (const e of w.events) g.pendingEvents.push(e);
        w.events.length = 0;
      }
      this.host.step();
      if (w.round.finished) this.finish(true);
    } else if (this.client) {
      this.client.step(this.localIntent(), dt);
      for (const e of this.client.drain()) g.pendingEvents.push(e);
    }
  }

  update() {
    // Traffic flows even before play begins, so a slow copy still says something.
    if (!this.started && !this.ended) {
      this.idleT = (this.idleT ?? 0) + 1;
    }
  }

  drawOverlay(ui) {
    if (this.ended) return;
    if (this.started && AIHub.time() < 0) {
      const n = Math.ceil(-AIHub.time() / 1000);
      ui.text(ui.w / 2, ui.h / 2 - 30, n, { color: 'white', scale: 4, align: 'center' });
    }
    if (this.game.frame % 1 === 0 && this.started && AIHub.time() >= 0 && AIHub.time() < 2500) ui.text(ui.w / 2, ui.h / 2 - 30, 'FILL THE KNELL', { color: 'sand', scale: 2, align: 'center' });
  }

  sendCommand(c) { this.client?.sendCommand(c); }
}

export async function runHubSession(engineOptions) {
  let info = null;
  try {
    info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
  } catch { info = null; }
  if (!info) {
    await Engine.start(new DiabellicalGame({}), engineOptions(false));
    return;
  }
  const game = new DiabellicalGame({
    hub: info,
    server: !!info.server,
    noAttract: true,
    onSetup: (g, ctx) => {
      const net = new HubNet(g, info);
      net.setup(ctx);
    },
  });
  try {
    if (info.server) {
      const engine = await Engine.headless(game, {});
      if (typeof window !== 'undefined') window.__GAME__ = game;
      let last = performance.now();
      game.net.timer = setInterval(() => {
        const now = performance.now();
        const n = Math.min(30, Math.round((now - last) * 0.06));
        if (n > 0) { last = now; engine.step(n); }
      }, 33);
    } else {
      await Engine.start(game, engineOptions(false));
    }
  } catch (e) {
    AIHub.fail(`${TITLE} needs WebGPU: ${String(e?.message ?? e)}`);
    return;
  }
  AIHub.ready();
}

export { botAfter, GOAL_TEXT };
