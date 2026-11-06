/**
 * @file AI Hub Session Protocol v1, mode ghost. Everything the hub touches is here: the session's opening, the game's own card,
 * reporting, ghost messages in and out, time-up and the end. Outside a session none of this runs.
 */
import type { Ctx } from '../ui/ctx';
import { glyphs, prompt } from '../ui/glyphs';
import { TITLE } from '../ui/titles';
import { POSE_WIRE } from '../scenes/round';

export interface HubPlayer {
  id: number;
  name: string;
  color: string;
}
export interface HubInfo {
  me: number;
  players: HubPlayer[];
  seed: number;
  limitMs: number;
}
export interface HubApi {
  active: boolean;
  connect(o: object): Promise<HubInfo | null>;
  ready(): void;
  answer(a: string): void;
  time(): number;
  on(event: string, fn: (...args: never[]) => void): () => void;
  progress(p: object): void;
  result(r: object): void;
  send(data: object, o?: object): boolean;
  fail(message: string): void;
  rng(label: string): () => number;
}

const HUB_GOAL = 'Stay the steadiest across three classes';

/** What the early part hands the running part. */
export interface Opening {
  state: 'card' | 'countdown' | 'play' | 'over' | 'end';
  ctx: Ctx | null;
  report(): void;
}

/**
 * The first half of a session, before the engine exists: the game's own card as plain HTML, Ready and More time, and every
 * hub event. `ready()` is called here: the hub's deadline counts from hello, and on a slow machine the engine's warm-up holds
 * the main thread past it. The round itself only begins once the engine is up, so a slow copy starts its classes late.
 */
export function openSession(root: HTMLElement, hub: HubApi, info: HubInfo): Opening {
  const opening: Opening = { state: 'card', ctx: null, report };
  const left = new Set<number>();
  let reported = false;
  const card = document.createElement('div');
  card.className = 'wt-layer';
  card.dataset.ui = 'card';
  const inner = document.createElement('div');
  inner.className = 'wt-panel wt-card-hub';
  card.append(inner);
  root.append(card);
  const titleEl = document.createElement('div');
  titleEl.className = 'wt-h';
  titleEl.textContent = TITLE;
  const goal = document.createElement('div');
  goal.className = 'wt-body';
  goal.textContent = HUB_GOAL;
  const seats = document.createElement('div');
  seats.className = 'wt-seats';
  const how = document.createElement('div');
  how.className = 'wt-prompts';
  how.innerHTML = [
    prompt('lean', 'Lean'),
    prompt('footL', 'Left'),
    prompt('footR', 'Right'),
    prompt('both', 'Breathe'),
  ].join('');
  const clock = document.createElement('div');
  clock.className = 'wt-body';
  const answers = document.createElement('div');
  answers.className = 'wt-prompts';
  const readyBtn = document.createElement('div');
  readyBtn.className = 'wt-row';
  readyBtn.dataset.focus = '1';
  readyBtn.innerHTML = `${glyphs('ok')}<span>Ready</span>`;
  const moreBtn = document.createElement('div');
  moreBtn.className = 'wt-row';
  moreBtn.innerHTML = `${glyphs('more')}<span>More time</span>`;
  answers.append(readyBtn, moreBtn);
  inner.append(titleEl, goal, seats, how, clock, answers);
  readyBtn.addEventListener('click', () => hub.answer('ready'));
  moreBtn.addEventListener('click', () => hub.answer('more'));
  const drawSeats = (ready: number[]) => {
    seats.textContent = '';
    for (const p of info.players) {
      const seat = document.createElement('div');
      seat.className = 'wt-seat';
      seat.style.background = p.color;
      seat.textContent = p.name;
      const mark = document.createElement('div');
      mark.textContent = ready.includes(p.id) ? 'Ready' : '\u2026';
      seat.append(mark);
      seats.append(seat);
    }
  };
  drawSeats([]);
  hub.on('card', ((c: { left: number | null; paused: boolean; starting: boolean; ready: number[] }) => {
    drawSeats(c.ready ?? []);
    clock.textContent = c.starting
      ? 'Starting'
      : c.paused
        ? 'Waiting'
        : c.left === null
          ? ''
          : `${Math.ceil(c.left / 1000)} s`;
  }) as never);
  const onKey = (event: KeyboardEvent) => {
    if (opening.state !== 'card') return;
    if (event.key === 'Enter' || event.code === 'Enter') hub.answer('ready');
    if (event.code === 'KeyT') hub.answer('more');
  };
  addEventListener('keydown', onKey);
  const padWas = [false, false];
  const poll = setInterval(() => {
    if (opening.state !== 'card') return clearInterval(poll);
    const pad = (navigator.getGamepads?.() ?? []).find((p) => p);
    if (!pad) return;
    const a = pad.buttons[0]?.pressed ?? false;
    const y = pad.buttons[3]?.pressed ?? false;
    if (a && !padWas[0]) hub.answer('ready');
    if (y && !padWas[1]) hub.answer('more');
    padWas[0] = a;
    padWas[1] = y;
  }, 50);
  hub.on('start', (() => {
    opening.state = 'countdown';
    card.remove();
    hub.progress({ score: 0, label: 'Breathing in' });
    hub.send({ t: 'g', e: -1, x: 0, y: 0, p: 0, s: 0 }, { reliable: false });
  }) as never);
  hub.on('message', ((data: { t?: string; e: number; x: number; y: number; p: number; s: number }, from: number) => {
    if (data?.t !== 'g' || left.has(from)) return;
    ghosts.set(from, [from, data.e, data.x, data.y, data.s, data.p]);
  }) as never);
  hub.on('leave', ((l: { id: number }) => {
    left.add(l.id);
    ghosts.delete(l.id);
    opening.ctx?.run('round.leave', { seat: l.id });
  }) as never);
  function report(): void {
    if (reported) return;
    reported = true;
    const { ctx } = opening;
    const flow = ctx?.flow();
    const scores = flow?.group?.scores ?? [0, 0, 0, 0];
    const me = ctx
      ? (ctx.inspector.state('seat').entities as unknown as { seat: { index: number; score: number } }[]).find(
          (e) => e.seat.index === info.me,
        )
      : undefined;
    const running = flow?.mode === 'event' ? (me?.seat.score ?? 0) : 0;
    const score = Math.round((scores[info.me] ?? 0) + running);
    hub.result({
      score,
      stats: { Classes: String(Math.min(3, flow?.group?.at ?? 0)), Score: String(score) },
      awards:
        score > 2400
          ? [{ title: 'Unnervingly Still', detail: 'The mat has asked after you.' }]
          : [{ title: 'Present', detail: 'That has been noted.' }],
    });
  }
  hub.on('time-up', (() => report()) as never);
  hub.on('end', (() => {
    opening.state = 'end';
    removeEventListener('keydown', onKey);
    opening.ctx?.engine.stop();
    opening.ctx?.sound.stop();
  }) as never);
  hub.ready();
  return opening;
}

const ghosts = new Map<number, number[]>();

/** The second half, once the engine has started: seats, the round's clock, ghosts in and out, reporting. */
export function runSession(ctx: Ctx, hub: HubApi, info: HubInfo, opening: Opening): { frame(): void } {
  opening.ctx = ctx;
  ctx.run('round.seat', { me: info.me, players: info.players.map((p) => p.id) });
  let lastSend = 0;
  let lastProgress = 0;
  let lastLabel = '';
  // the other players' names over their mats, as text; a name never reaches the page as HTML
  const labels = info.players
    .filter((p) => p.id !== info.me)
    .map((p) => {
      const seat = () =>
        (
          ctx.inspector.state('seat').entities as unknown as { seat: { index: number; actor: number; kind: string } }[]
        ).find((e) => e.seat.index === p.id)?.seat;
      const at = () => {
        const s = seat();
        const body = s
          ? (ctx.inspector.get(s.actor) as unknown as { actor?: { x: number; y: number; z: number } } | null)?.actor
          : null;
        return body && s?.kind === 'ghost' ? { x: body.x, y: body.y + 2.1, z: body.z } : { x: 0, y: -50, z: 0 };
      };
      return ctx.engine.ui?.label(p.name, { at } as never);
    });
  void labels;
  return {
    frame() {
      if (opening.state === 'end' || opening.state === 'card') return;
      if (opening.state === 'countdown' && hub.time() >= 0) {
        opening.state = 'play';
        ctx.run('round.go');
      }
      if (opening.state !== 'play') return;
      const flow = ctx.flow();
      const now = performance.now();
      const me = (
        ctx.inspector.state('seat').entities as unknown as {
          seat: { index: number; score: number };
          wobble: { x: number; y: number };
        }[]
      ).find((e) => e.seat.index === info.me);
      const at = flow.group?.at ?? 0;
      const score = Math.round(
        (flow.group?.scores[info.me] ?? 0) + (flow.mode === 'event' ? (me?.seat.score ?? 0) : 0),
      );
      if (now - lastSend >= 100) {
        lastSend = now;
        const pose = POSE_WIRE.indexOf((flow.ev?.id ?? '') as never);
        hub.send(
          {
            t: 'g',
            e: at,
            x: Math.round((me?.wobble.x ?? 0) * 100) / 100,
            y: Math.round((me?.wobble.y ?? 0) * 100) / 100,
            p: Math.max(0, pose),
            s: score,
          },
          { reliable: false },
        );
      }
      const label = `Class ${Math.min(3, at + 1)} \u00b7 ${score}`.slice(0, 24);
      if (now - lastProgress >= 500 && label !== lastLabel) {
        lastProgress = now;
        lastLabel = label;
        hub.progress({ score, label });
      }
      if (ghosts.size) ctx.engine.input?.virtual.axis('game:ghosts', [...ghosts.values()].flat());
      if (flow.mode === 'results') {
        opening.state = 'over';
        opening.report();
      }
    },
  };
}
