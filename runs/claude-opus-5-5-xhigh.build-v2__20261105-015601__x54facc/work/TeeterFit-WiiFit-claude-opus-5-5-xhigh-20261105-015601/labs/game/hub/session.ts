/**
 * @file AI Hub Session Protocol v1, ghost mode (PLAN.md section 9): the page's half of a hub round. It answers the card,
 * starts the round on the hub's clock, sends this player's lean and score, feeds the other copies to the sim as ghosts,
 * and reports the result. It owns nothing in the sim but the scene actions and `game:ghosts`.
 *
 * Game code, a page's.
 *
 * @example
 * // const hub = await startSession(); // null outside a session
 */
import type { Engine } from '../../../engine';

/** A player, as the hub says. */
export interface HubPlayer {
  id: number;
  name: string;
  color: string;
}

/** What `connect` gives. */
export interface HubInfo {
  me: number;
  players: HubPlayer[];
  seed: number;
  mode: string;
  limitMs: number;
  isHost: boolean;
}

/** The hub's client, as much of it as the game uses. */
export interface HubClient {
  active: boolean;
  connect(options: { mode: string; seats: [number, number]; card?: boolean }): Promise<HubInfo | null>;
  ready(): void;
  answer(what: 'ready' | 'more'): void;
  time(): number;
  on(event: string, fn: (...args: never[]) => void): () => void;
  progress(data: { score: number; label: string }): void;
  result(data: {
    score: number;
    stats?: Record<string, string | number>;
    awards?: { title: string; detail: string }[];
  }): void;
  send(data: unknown, options?: { reliable?: boolean; to?: number }): boolean;
  fail(message: string): void;
  rng(label: string): () => number;
}

/** The hub's client, when the page has one. */
export const hubClient = (): HubClient | null => (window as unknown as { AIHub?: HubClient }).AIHub ?? null;

/** What a ghost message carries. */
interface GhostMsg {
  t: 'g';
  e: number;
  x: number;
  y: number;
  p: string;
  s: number;
}

/** A running session's page state. */
export class Session {
  readonly hub: HubClient;
  readonly info: HubInfo;
  /** Who else is here: their latest message. */
  readonly others = new Map<number, GhostMsg & { id: number; gone?: boolean }>();
  /** The card's latest state. */
  card: {
    left: number | null;
    paused?: boolean;
    starting?: boolean;
    ready: number[];
    asking: number;
    asked?: boolean;
  } | null = null;
  started = false;
  playing = false;
  ended = false;
  reported = false;
  answered = false;
  private lastSend = 0;
  private lastScore = -1;
  private lastLabel = '';
  private dirty = false;
  private started0 = false;
  onEnd: () => void = () => {};
  onStart: () => void = () => {};

  constructor(hub: HubClient, info: HubInfo) {
    this.hub = hub;
    this.info = info;
    // The card's keys work from the first moment: the harness sends a synthetic Enter, as soon as it sees ready.
    addEventListener('keydown', (event) => {
      if (this.started) return;
      if (event.code === 'Enter' || event.code === 'NumpadEnter') this.answer('ready');
      if (event.code === 'KeyT') this.answer('more');
    });
    hub.on('card', ((card: Session['card']) => {
      this.card = card;
    }) as never);
    hub.on('start', (() => {
      this.started = true;
      this.hub.progress({ score: 0, label: 'Breathing in' });
      this.hub.send({ t: 'g', e: 0, x: 0, y: 0, p: '', s: 0 } satisfies GhostMsg, { reliable: false });
      this.onStart();
    }) as never);
    hub.on('message', ((data: GhostMsg, from: number) => {
      if (data?.t === 'g') {
        this.others.set(from, { ...data, id: from });
        this.dirty = true;
      }
    }) as never);
    hub.on('leave', ((event: { id: number }) => {
      const other = this.others.get(event.id) ?? { t: 'g' as const, e: 0, x: 0, y: 0, p: '', s: 0, id: event.id };
      this.others.set(event.id, { ...other, gone: true });
      const actions = this.engine?.inspector?.actions as { run(n: string, a: unknown): void } | undefined;
      actions?.run('round.leave', { id: event.id });
    }) as never);
    hub.on('time-up', (() => this.report()) as never);
    hub.on('end', (() => {
      this.ended = true;
      this.report();
      this.onEnd();
    }) as never);
  }

  engine: Engine | null = null;

  /** Answers the card. */
  answer(what: 'ready' | 'more'): void {
    if (this.started) return;
    if (what === 'ready') this.answered = true;
    this.hub.answer(what);
  }

  /** The current numbers, set by the page each frame. */
  now = {
    classIndex: 0,
    x: 0,
    y: 0,
    pose: '',
    total: 0,
    label: 'Breathing in',
    done: false,
    stats: {} as Record<string, string | number>,
    awards: [] as { title: string; detail: string }[],
  };

  /** Reports the score, once. */
  report(): void {
    if (this.reported) return;
    this.reported = true;
    this.hub.result({ score: Math.round(this.now.total), stats: this.now.stats, awards: this.now.awards });
  }

  /** One frame: start at time 0, send ghosts every 100 ms, progress when it changes. */
  frame(): void {
    if (this.ended) return;
    const inspector = this.engine?.inspector;
    const actions = inspector?.actions as { run(n: string, a?: unknown): void } | undefined;
    if (this.started && !this.playing && this.hub.time() >= 0) {
      this.playing = true;
      if (!this.started0) {
        this.started0 = true;
        actions?.run('round.go', { me: this.info.me });
      }
    }
    if (this.dirty) {
      this.dirty = false;
      this.engine?.input?.virtual.axis(
        'game:ghosts',
        [...this.others.values()].map(({ id, e, x, y, p, s, gone }) => ({ id, e, x, y, p, s, gone: gone ?? false })),
      );
    }
    if (!this.playing) return;
    const time = performance.now();
    if (time - this.lastSend >= 100) {
      this.lastSend = time;
      const { classIndex, x, y, pose, total } = this.now;
      this.hub.send({ t: 'g', e: classIndex, x, y, p: pose, s: total } satisfies GhostMsg, { reliable: false });
    }
    if (this.now.total !== this.lastScore || this.now.label !== this.lastLabel) {
      this.lastScore = this.now.total;
      this.lastLabel = this.now.label;
      this.hub.progress({ score: Math.round(this.now.total), label: this.now.label.slice(0, 24) });
    }
    if (this.now.done) this.report();
  }
}
