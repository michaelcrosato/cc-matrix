/**
 * @file The hub card and the ghost mats. The card is HTML. Ghosts are sim leans.
 * Numbers on the card come from the card event. This file never calls Math.random.
 */
import type { Audio, Engine } from '../../../engine';
import { emptySnap, runningScore, type Snap } from './snap';

/** A hub player, as the welcome message names them. */
export interface HubPlayer {
  id: number;
  name?: string;
  color?: string;
}

/** The session client, only the calls this page makes. */
export interface HubClient {
  active: boolean;
  me: number | null;
  players: HubPlayer[];
  seed: number;
  connect(opts: { mode: string; seats: number[]; card: boolean }): Promise<HubInfo | null>;
  ready(): void;
  fail(message: string): void;
  answer(what: 'ready' | 'more'): void;
  on(type: string, fn: (...args: unknown[]) => void): void;
  time(): number;
  progress(body: { score: number; label: string }): void;
  send(data: unknown, opts?: { reliable: boolean }): void;
  result(body: Record<string, unknown>): void;
  rng(label: string): () => number;
}

/** What connect resolves with, once the welcome has arrived. */
export interface HubInfo {
  seed: number;
  players: HubPlayer[];
}

/** One neighbour's last lean. */
interface GhostLean {
  x: number;
  y: number;
  p: number;
  e: number;
}

/** What the card needs from the page. */
export interface HubEnv {
  audio: Audio;
  client: HubClient;
  run(name: string, args?: Record<string, unknown>): void;
  engine(): Engine | null;
  ended(): boolean;
  markEnded(): void;
}

/** The card and the ghost sender. */
export interface HubView {
  playing: boolean;
  paint(screen: string, snap: Snap): void;
  tick(input: NonNullable<Engine['input']>, snap: Snap): void;
  answer(what: 'ready' | 'more'): void;
}

/** Builds the card and listens for the round. Call this before the engine is ready. */
export function createHub(env: HubEnv, root: HTMLElement): HubView {
  const { client } = env;
  const card = document.createElement('div');
  card.dataset.ui = 'card';
  card.hidden = true;
  const title = el('p');
  title.textContent = 'Thumb Yoga';
  const goal = el('p');
  goal.textContent = 'Stay the steadiest across three classes.';
  const players = el('div');
  const left = el('p');
  const how = el('p');
  how.textContent = 'Lean with the stick or WASD. L2 and R2, or Q and E, are the feet. Both or Space breathe.';
  const readyBtn = button('Ready', 'card-ready');
  const moreBtn = button('More time', 'card-more');
  card.append(title, goal, players, left, how, readyBtn, moreBtn);
  root.append(card);

  const ghosts = new Map<number, GhostLean>();
  let cardLeft: number | null = null;
  let cardReady: number[] = [];
  let asked = false;
  let going = false;
  let playing = false;
  let reported = false;
  let began = false;
  let lastSend = 0;
  let lastScore = -1;
  let pump = 0;
  let lastLabel = '';
  let latest: Snap = emptySnap();

  readyBtn.addEventListener('click', () => client.answer('ready'));
  moreBtn.addEventListener('click', () => client.answer('more'));

  client.on('card', (detail) => {
    const row =
      detail && typeof detail === 'object'
        ? (detail as { left?: number | null; ready?: unknown; asked?: boolean })
        : {};
    cardLeft = typeof row.left === 'number' ? row.left : null;
    cardReady = Array.isArray(row.ready) ? row.ready.filter((id): id is number => typeof id === 'number') : [];
    asked = row.asked === true;
  });
  client.on('start', () => {
    going = true;
    playing = true;
    if (pump) return;
    // The card can open the round while this copy is still compiling. Drawn frames are not
    // running yet, and the harness still counts a lean and a score from every copy that stays.
    const beat = () => {
      if (reported || env.ended()) {
        stopPump();
        return;
      }
      maybeGo(latest);
    };
    beat();
    pump = window.setInterval(beat, 120);
  });
  client.on('message', (data, from) => {
    if (!data || typeof data !== 'object' || typeof from !== 'number') return;
    const row = data as { t?: string; x?: number; y?: number; p?: number; e?: number };
    if (row.t !== 'g') return;
    ghosts.set(from, { x: row.x ?? 0, y: row.y ?? 0, p: row.p ?? 0, e: row.e ?? 0 });
  });
  client.on('leave', (detail) => {
    const id = detail && typeof detail === 'object' ? (detail as { id?: number }).id : undefined;
    if (typeof id === 'number') ghosts.delete(id);
  });
  client.on('time-up', () => finish(true));
  client.on('end', () => {
    stopPump();
    env.markEnded();
    reported = true;
    env.audio.mute(true);
    env.engine()?.stop();
  });

  const answer = (what: 'ready' | 'more') => client.answer(what);

  function finish(force: boolean): void {
    if (reported || env.ended()) return;
    if (!force && !playing) return;
    stopPump();
    reported = true;
    const snap = latest;
    const score = runningScore(snap);
    client.result({
      score,
      stats: [
        { name: 'Rank', value: snap.rank || 'Present' },
        { name: 'Wobble Age', value: String(Math.round(snap.age)) },
        { name: 'Breath', value: String(Math.round(snap.calm)) },
        { name: 'Pebbles', value: String(Math.round(snap.pebbles)) },
      ],
      awards: score >= 900 ? [{ title: 'Unnervingly still', detail: 'The dot barely left the middle.' }] : [],
    });
  }

  function report(score: number, label: string): void {
    if (reported || env.ended()) return;
    if (score === lastScore && label === lastLabel) return;
    lastScore = score;
    lastLabel = label;
    client.progress({ score, label: label.slice(0, 24) });
  }

  function sendLean(snap: Snap): void {
    if (reported || env.ended()) return;
    const now = performance.now();
    if (now - lastSend < 100) return;
    lastSend = now;
    const score = runningScore(snap);
    client.send({ t: 'g', e: snap.phase, x: snap.ax, y: snap.ay, p: snap.phase, s: score }, { reliable: false });
  }

  function others(): HubPlayer[] {
    return client.players.filter((player) => player.id !== client.me).slice(0, 3);
  }

  function lay(input: NonNullable<Engine['input']>, snap: Snap): void {
    const packed: number[] = [];
    const names = ['', '', '', ''];
    others().forEach((player, index) => {
      const seat = index + 1;
      const ghost = ghosts.get(player.id);
      const show = ghost && ghost.e === snap.phase ? 1 : 0;
      packed.push(seat, show, ghost?.x ?? 0, ghost?.y ?? 0, ghost?.p ?? 0);
      names[seat] = show ? (player.name ?? 'Guest') : '';
      const hud = show ? `${player.name ?? 'Guest'}` : null;
      env.engine()?.ui?.hud(`ghost-${seat}`, hud, { at: 'top-left', color: player.color ?? '#3A4A55' });
    });
    for (let seat = others().length + 1; seat <= 3; seat += 1) env.engine()?.ui?.hud(`ghost-${seat}`, null);
    input.virtual.axis('game:ghosts', packed.length > 0 ? packed : null);
    input.virtual.axis('game:names', names);
  }

  function stopPump(): void {
    if (pump === 0) return;
    window.clearInterval(pump);
    pump = 0;
  }

  function maybeGo(snap: Snap): void {
    if (!going || reported || env.ended()) return;
    if (client.time() < 0) return;
    if (!playing) playing = true;
    // run() does nothing until the inspector exists, so keep trying until the engine is bound.
    if (!began && env.engine()) {
      env.run('round.go');
      began = true;
    }
    if (lastScore < 0) report(0, 'Breathing in');
    sendLean(snap);
    const score = runningScore(snap);
    const label = snap.mode === 'results' ? 'Class done' : `Class ${snap.phase + 1} · ${score}`;
    report(score, label);
  }

  return {
    get playing() {
      return playing;
    },
    answer,
    paint(screen, snap) {
      latest = snap;
      card.hidden = screen !== 'card';
      if (card.hidden) return;
      players.replaceChildren();
      const ready = new Set(cardReady);
      for (const player of client.players) {
        const row = el('p');
        row.style.color = player.color ?? '#3A4A55';
        const mine = player.id === client.me ? ' (you)' : '';
        const mark = ready.has(player.id) ? 'Ready' : 'Waiting';
        row.textContent = `${player.name ?? 'Guest'}${mine}. ${mark}.`;
        players.append(row);
      }
      if (asked) left.textContent = 'Asking for a little longer.';
      else if (cardLeft === null) left.textContent = 'Starting.';
      else left.textContent = `${Math.ceil(cardLeft / 1000)} s.`;
    },
    tick(input, snap) {
      latest = snap;
      if (env.ended()) return;
      lay(input, snap);
      maybeGo(snap);
      if (playing && snap.mode === 'results') finish(false);
    },
  };
}

/** A paragraph in the card. */
function el(tag: string): HTMLElement {
  const node = document.createElement(tag);
  node.dataset.ui = tag === 'p' ? 'card-line' : 'card-block';
  return node;
}

/** A card button. It is not a menu row. */
function button(text: string, id: string): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.dataset.ui = id;
  node.textContent = text;
  return node;
}
