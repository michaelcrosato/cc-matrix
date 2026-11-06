/**
 * @file The hub round once the engine can step. The host decides every tick. Clients play the host's list.
 * A hash that disagrees is recorded for the harness.
 */
import { packHands } from '../op/codec';
import { liveOp } from '../scenes/bridge';
import { drainCount, HostBook, type HubInfo, type IntentMsg } from './hub';

/** The slice of the inspector this round uses. */
export interface Stepper {
  pause(): void;
  step(n?: number, intents?: { 'game:hands': number[] }): number;
  hash(): string;
}

/** The slice of AIHub this round uses. */
export interface HubLink {
  time(): number;
  finish(body: unknown): void;
  send(data: unknown, opts?: { to?: number; reliable?: boolean }): boolean;
  on(event: string, fn: (data: unknown, from?: number) => void): () => void;
}

/** What the page reads while the round is up. */
export interface RoundView {
  ended: boolean;
  mismatches: string[];
  book: HostBook;
  buffer: { hands: number[]; hash: string }[];
}

/** Start the interval. Returns a stop function. */
export function startRound(hub: HubLink, info: HubInfo, engine: Stepper, seats: number): RoundView {
  const view: RoundView = { ended: false, mismatches: [], book: new HostBook(), buffer: [] };
  let sentAt = 0;
  let hashAt = 0;
  let finished = false;
  const local = info.players.some((player) => player.id === info.me) ? info.me : -1;

  const finish = (won: boolean): void => {
    if (finished || !info.isHost) return;
    finished = true;
    const op = liveOp();
    const ids = info.players.map((player) => player.id).filter((id) => !view.book.gone.has(id));
    const score = op?.score ?? 0;
    const scores: Record<string, number> = {};
    const stats: Record<string, { slips: number; chain: number }> = {};
    for (const id of ids) {
      scores[String(id)] = score;
      stats[String(id)] = { slips: op?.slips ?? 0, chain: op?.seats[0]?.bestChain ?? 0 };
    }
    hub.finish({
      standings: [ids],
      scores,
      won,
      stats,
      awards: ids.length ? [{ id: ids[0], title: 'Steadiest hands', detail: 'The line held.' }] : [],
    });
  };

  hub.on('message', (data, from) => {
    if (view.ended || !data || typeof data !== 'object') return;
    const msg = data as { t?: string; ticks?: unknown; hash?: string };
    if (info.isHost && msg.t === 'i' && typeof from === 'number') view.book.hear(from, data as IntentMsg);
    if (!info.isHost && msg.t === 't' && Array.isArray(msg.ticks)) {
      const ticks = msg.ticks;
      ticks.forEach((hands, index) => {
        if (!Array.isArray(hands)) return;
        const last = index === ticks.length - 1;
        view.buffer.push({ hands: hands as number[], hash: last ? (msg.hash ?? '') : '' });
      });
    }
  });
  hub.on('leave', (data) => {
    const id = (data as { id?: number } | null)?.id;
    if (typeof id === 'number') view.book.gone.add(id);
  });
  hub.on('time-up', () => finish(false));
  hub.on('end', () => {
    view.ended = true;
  });

  const timer = setInterval(() => {
    if (view.ended) return;
    const now = hub.time();
    if (info.isHost) {
      if (now < 0) return;
      const due = Math.floor((now * 60) / 1000);
      let guard = 0;
      while (view.book.next < due && guard < 8) {
        const hands = view.book.handsFor(seats);
        if (local >= 0) {
          /* The host's own hand is already in the book when the page calls noteLocal. */
        }
        engine.step(1, { 'game:hands': packHands(hands) });
        const hash = engine.hash();
        view.book.queue.push({ tick: view.book.next, hands: packHands(hands), hash });
        view.book.hash = hash;
        view.book.next += 1;
        guard += 1;
        const op = liveOp();
        if (op && op.status !== 'playing') {
          finish(op.status === 'won');
          break;
        }
      }
      const clock = Date.now();
      if (clock - sentAt > 66 && view.book.queue.length) {
        const batch = view.book.queue.splice(0, 8);
        const last = batch[batch.length - 1];
        hub.send(
          {
            t: 't',
            from: batch[0].tick,
            ticks: batch.map((item) => item.hands),
            hash: clock - hashAt > 1000 ? last.hash : '',
          },
          { reliable: true },
        );
        sentAt = clock;
        if (clock - hashAt > 1000) hashAt = clock;
      }
      return;
    }
    const count = drainCount(view.buffer.length);
    for (let i = 0; i < count && view.buffer.length; i++) {
      const item = view.buffer.shift();
      if (!item) continue;
      engine.step(1, { 'game:hands': item.hands });
      if (!item.hash) continue;
      const mine = engine.hash();
      if (mine && mine !== item.hash) view.mismatches.push(`${mine} ${item.hash}`);
    }
  }, 16);
  void timer;
  return view;
}
