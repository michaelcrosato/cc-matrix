/** @file AI Hub shared-world card, host-sequenced simulation and standings; the hub owns every network action. */
import type { Inspector } from '../../../engine';
import type { Hand, Operation } from '../data/types';
import { Sequencer, type TickPacket } from './sequencer';
import { interview } from '../data/about';
import { esc, lighthouse } from '../ui/icons';
export interface Player {
  id: number;
  name: string;
  color: string;
}
export interface HubInfo {
  me: number;
  players: Player[];
  host: number;
  isHost: boolean;
  server: boolean;
  seed: number;
  limitMs: number;
}
export interface Hub {
  active: boolean;
  server: boolean;
  connect: (o: object) => Promise<HubInfo | null>;
  ready: () => void;
  fail: (message: string) => void;
  answer: (a: string) => void;
  time: () => number;
  on: (event: string, fn: (data: never, from?: number) => void) => () => void;
  send: (data: unknown, opts?: object) => boolean;
  finish: (data: unknown) => void;
}
export const readOperation = (e: Inspector): Operation | undefined =>
  (e.state('operation').entities[0] as unknown as { operation?: { data: Operation } } | undefined)?.operation?.data;
export class Session {
  info: HubInfo;
  hub: Hub;
  e: Inspector | null = null;
  seq: Sequencer;
  timer: ReturnType<typeof setInterval> | null = null;
  ended = false;
  onEnd: () => void = () => {};
  started = false;
  finished = false;
  lastSend = 0;
  lastInput = 0;
  lastCounters = '';
  inputTick = 0;
  buffer: Hand[][] = [];
  from = 0;
  local: Hand = [0, 0, 3, 0, 0, 0, 0, 0, 0];
  players: Player[];
  card: HTMLElement;
  constructor(hub: Hub, info: HubInfo) {
    this.hub = hub;
    this.info = info;
    this.players = [...info.players];
    this.seq = new Sequencer(info.players.length);
    this.card = document.getElementById('panels')!;
    if (!info.server) {
      this.card.innerHTML = `<section class="page"><header class="page-head"><div><div class="eyebrow">AI HUB / PRE-OP BRIEFING</div><h2>${esc(interview.aiHub.name)}</h2></div><div class="brandmark">${lighthouse}</div></header><div class="page-body"><div class="briefing-content"><h3>The Gala Shift</h3><p>Keep both patients alive. Clear the grafts and close every wound together.</p><div class="rule"></div><div data-game="team"></div><p class="small">Stick or mouse aims · R2 or click operates · right stick or 1–8 picks a tool · Q / E switches tables.</p></div></div><footer class="page-footer"><span data-game="card-clock">Waiting for the team…</span><button data-focus data-hub="more">△ / T · More time</button><button data-focus data-hub="ready" class="primary">✕ / Enter · Ready</button></footer></section>`;
      const team = this.card.querySelector('[data-game="team"]')!;
      for (const p of info.players) {
        const line = document.createElement('p');
        line.dataset.player = String(p.id);
        line.style.color = p.color;
        line.textContent = p.name;
        team.append(line);
      }
    }
    hub.on('card', (data: { left: number | null; ready: number[]; paused: boolean }) => {
      const timer = this.card.querySelector('[data-game="card-clock"]');
      if (timer)
        timer.textContent = data.paused
          ? 'The team asked for more time.'
          : data.left === null
            ? 'Preparing…'
            : `${Math.ceil(data.left / 1000)}s to scrub in`;
      for (const p of this.players) {
        const el = this.card.querySelector(`[data-player="${p.id}"]`);
        if (el) el.textContent = p.name + (data.ready.includes(p.id) ? ' · READY' : ' · preparing');
      }
    });
    hub.on('start', () => {
      this.started = true;
      this.card.innerHTML = '';
    });
    hub.on('message', (data: TickPacket | { t: 'input'; hand: Hand }, from?: number) => {
      if (this.ended) return;
      if (data.t === 'input' && info.isHost && from !== undefined) this.seq.input(from, data.hand);
      else if (data.t === 'ticks' && !info.isHost) this.seq.receive(data);
    });
    hub.on('leave', (data: { id: number }) => {
      this.players = this.players.filter((p) => p.id !== data.id);
      this.seq.leave(data.id);
    });
    hub.on('time-up', () => {
      if (info.isHost) this.finish(false);
    });
    hub.on('end', () => {
      this.ended = true;
      this.onEnd();
      if (this.timer) clearInterval(this.timer);
    });
    this.card.addEventListener('click', (event) => {
      const el = (event.target as Element).closest<HTMLElement>('[data-hub]');
      if (el) hub.answer(el.dataset.hub!);
    });
  }
  attach(e: Inspector): void {
    if (this.e) return;
    this.e = e;
    e.pause();
    this.hub.ready();
    this.timer = setInterval(() => this.tick(), 16);
  }
  tick(): void {
    const e = this.e;
    if (!e || this.ended || !this.started || this.hub.time() < 0) return;
    const now = this.hub.time();
    if (!this.info.server && now - this.lastInput >= 70) {
      this.lastInput = now;
      if (this.info.isHost) this.seq.input(this.info.me, this.local);
      else this.hub.send({ t: 'input', hand: this.local }, { to: this.info.host, reliable: false });
    }
    if (this.info.isHost) {
      const due = Math.floor((now * 60) / 1000);
      let count = 0;
      while (this.seq.next < due && count++ < 120) {
        const hands = this.seq.hands.map((h) => [...h] as Hand);
        if (!this.buffer.length) this.from = this.seq.next;
        e.step(1, { 'game:hands': hands });
        this.seq.next++;
        this.buffer.push(hands);
        if (this.buffer.length >= 5) this.flush();
      }
      if (now - this.lastSend >= 70) this.flush();
      const s = readOperation(e);
      if (s && s.status !== 'playing') this.finish(s.status === 'won');
    } else
      this.seq.drain(
        (h) => e.step(1, { 'game:hands': h }),
        () => e.hash(),
        this.seq.queue.size > 30 ? 8 : this.seq.queue.size > 6 ? 2 : 1,
      );
  }
  flush(): void {
    if (!this.e || !this.buffer.length) return;
    const packet: TickPacket = {
      t: 'ticks',
      from: this.from,
      hands: this.buffer,
      check: this.seq.next % 60 < 5 ? [this.seq.next, this.e.hash()] : undefined,
    };
    this.hub.send(packet, { reliable: true });
    this.buffer = [];
    this.lastSend = this.hub.time();
  }
  finish(won: boolean): void {
    if (this.finished || this.ended || !this.info.isHost) return;
    this.finished = true;
    const s = this.e ? readOperation(this.e) : undefined,
      players = [...this.players].sort((a, b) => (s?.seats[b.id]?.score ?? 0) - (s?.seats[a.id]?.score ?? 0));
    const standings: number[][] = [];
    for (const p of players) {
      const value = s?.seats[p.id]?.score ?? 0,
        last = standings.at(-1);
      if (last && (s?.seats[last[0]]?.score ?? 0) === value) last.push(p.id);
      else standings.push([p.id]);
    }
    this.hub.finish({
      standings,
      scores: Object.fromEntries(players.map((p) => [p.id, s?.seats[p.id]?.score ?? 0])),
      won,
      stats: Object.fromEntries(
        players.map((p) => [p.id, { Slips: s?.seats[p.id]?.slips ?? 0, 'Best chain': s?.seats[p.id]?.best ?? 1 }]),
      ),
      awards: players.map((p) => ({
        id: p.id,
        title: 'Steadiest hands',
        detail: `${s?.seats[p.id]?.slips ?? 0} slips`,
      })),
    });
  }
  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
