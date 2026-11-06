/** @file AI Hub ghost rounds: the game's own ready card, remote mats and one terminal result. */
import type { GameApp } from '../app';
import { safe, glyph } from '../ui/glyphs';
type Player = { id: number; name: string; color: string };
type Info = { me: number; players: Player[]; seed: number; limitMs: number };
type Card = { left: number | null; ready: number[]; paused: boolean; starting: boolean };
type Client = {
  active: boolean;
  connect: (options: { mode: string; seats: number[]; card: boolean }) => Promise<Info | null>;
  ready: () => void;
  answer: (answer: string) => void;
  time: () => number;
  on: (event: string, callback: (...args: unknown[]) => void) => unknown;
  progress: (data: { score: number; label: string }) => void;
  result: (data: { score: number; stats: Record<string, string>; awards: { title: string; detail: string }[] }) => void;
  send: (data: unknown, options?: { reliable: boolean }) => void;
  fail: (message: string) => void;
};
export class HubSession {
  client = (window as unknown as { AIHub?: Client }).AIHub;
  info: Info | null = null;
  ended = false;
  started = false;
  playing = false;
  sentResult = false;
  private lastSend = 0;
  private lastScore = -1;
  private card: Card = { left: null, ready: [], paused: false, starting: false };
  private ghosts = new Map<
    number,
    { seat: number; x: number; y: number; phase: number; active: boolean; score?: number }
  >();
  private app: GameApp;
  constructor(app: GameApp) {
    this.app = app;
  }
  async connect(): Promise<void> {
    if (!this.client?.active) return;
    this.info = await this.client.connect({ mode: 'ghost', seats: [1, 4], card: true });
    if (!this.info) return;
    this.app.hubActive = true;
    this.app.hubNames = [
      this.info.players.find((p) => p.id === this.info!.me)?.name ?? 'You',
      ...this.info.players.filter((p) => p.id !== this.info!.me).map((p) => p.name),
    ];
    const client = this.client;
    client.on('card', (value) => {
      this.card = value as Card;
      this.drawCard();
    });
    client.on('start', () => {
      this.started = true;
      this.app.ui.clear('hub-countdown');
      client.progress({ score: 0, label: 'Breathing in' });
      client.send({ t: 'g', e: 0, x: 0, y: 0, p: 'Stand', s: 0 }, { reliable: false });
    });
    client.on('message', (value, from) => {
      if (this.ended) return;
      const data = value as { t?: string; x?: number; y?: number; e?: number; s?: number };
      if (data.t !== 'g' || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
      const remotes = this.info!.players.filter((p) => p.id !== this.info!.me),
        seat = remotes.findIndex((p) => p.id === from) + 1;
      if (seat < 1) return;
      this.ghosts.set(Number(from), {
        seat,
        x: Math.max(-1, Math.min(1, data.x!)),
        y: Math.max(-1, Math.min(1, data.y!)),
        phase: data.e ?? 0,
        active: true,
        score: data.s ?? 0,
      });
      this.app.run('round.ghosts', [...this.ghosts.values()]);
    });
    client.on('leave', (value) => {
      const { id } = value as { id: number };
      const ghost = this.ghosts.get(id);
      if (ghost) {
        ghost.active = false;
        this.app.run('round.ghosts', [...this.ghosts.values()]);
      }
    });
    client.on('time-up', () => this.result());
    client.on('end', () => {
      this.ended = true;
      this.app.ended = true;
      this.app.engine?.stop();
      this.app.mood?.stop();
      this.app.audio.mute(true);
      this.app.audio.close().catch(() => {});
      this.app.ui.choices = [];
    });
    addEventListener('keydown', (event) => {
      if (this.ended || this.started) return;
      if (event.code === 'Enter' || event.key === 'Enter') client.answer('ready');
      if (event.code === 'KeyT' || event.key === 't') client.answer('more');
    });
    this.drawCard();
  }
  ready(): void {
    if (!this.info || this.ended) return;
    this.app.run('round.decorate');
    const others = this.info.players.filter((p) => p.id !== this.info!.me);
    this.app.run(
      'round.ghosts',
      others.map((_, i) => ({ seat: i + 1, x: 0, y: 0, phase: 0, active: true })),
    );
    this.app.run('round.colours', [this.info.me, ...others.map((p) => p.id)]);
    this.client?.ready();
  }
  frame(): void {
    if (!this.info || !this.client || this.ended) return;
    if (this.started && !this.playing && this.client.time() >= 0 && this.app.engine?.ready) {
      this.playing = true;
      this.app.run('round.go');
      this.app.ui.clear();
      this.app.engine.inspector?.resume();
    }
    if (!this.playing) {
      const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
      if (!this.started && pad?.buttons[0]?.pressed) this.client.answer('ready');
      if (!this.started && pad?.buttons[3]?.pressed) this.client.answer('more');
      return;
    }
    const f = this.app.flow;
    if (!f) return;
    const r = f.event,
      wobble = r.seats[0] ?? f.wobble;
    if (r.score !== this.lastScore) {
      this.lastScore = r.score;
      this.client.progress({ score: Math.round(r.score), label: `Class ${r.phase + 1} · ${Math.round(r.score)}` });
    }
    if (performance.now() - this.lastSend >= 100) {
      this.lastSend = performance.now();
      this.client.send(
        { t: 'g', e: r.phase, x: wobble.x, y: wobble.y, p: r.children[0]?.id ?? 'Stand', s: Math.round(r.score) },
        { reliable: false },
      );
    }
    if (f.mode === 'results') this.result();
  }
  private drawCard(): void {
    if (!this.info || this.started || this.ended) return;
    const players = this.info.players
      .map(
        (p) =>
          `<span class="hub-player"><i style="background:${safe(p.color)}"></i>${safe(p.name)}${this.card.ready.includes(p.id) ? ' ✓' : ''}</span>`,
      )
      .join('');
    this.app.ui.menu(
      'hub',
      'A CLASS, NOT A MATCH',
      'Wobble Fit',
      'Stay the steadiest across three classes. Your balance is your own. The neighbouring mats are company.',
      [],
      {
        hero: true,
        extra: `<div class="hub-players">${players}</div><p class="description">Lean: stick or WASD<br>Feet: L2 / R2 or Q / E<br>Breathe: both or Space</p><p>${this.card.paused ? 'A little more time.' : this.card.left === null ? 'Finding your mats…' : `${Math.ceil(this.card.left / 1000)} seconds to settle in.`}</p><div class="hub-buttons"><button data-hub="ready">${glyph('accept', this.app.ui.device, this.app.options.xbox)} Ready</button><button data-hub="more">△ / T · More time</button></div>`,
      },
    );
    this.app.ui.root.querySelector('[data-hub=ready]')?.addEventListener('click', () => this.client?.answer('ready'));
    this.app.ui.root.querySelector('[data-hub=more]')?.addEventListener('click', () => this.client?.answer('more'));
  }
  private result(): void {
    if (this.sentResult || this.ended || !this.info) return;
    this.sentResult = true;
    const score = Math.round(this.app.flow?.event.score ?? 0);
    this.client?.result({
      score,
      stats: { Composure: String(score), Classes: '3', Retreat: 'Little Fulcrum' },
      awards: [{ title: 'A Pleasant Presence', detail: 'You kept the neighbouring mat company.' }],
    });
  }
}
