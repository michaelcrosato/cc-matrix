/**
 * @file AI Hub Session Protocol v1, mode ghost. In a session the page opens straight into the game's own card (four mats, Plumb,
 * the players in their colours, how to win, this player's controls, the countdown), then plays a seeded Round on its own
 * copy; the other players appear as ghosts on the neighbouring mats, wobbling in their seat colour. Progress goes out
 * as `Class n · score` (24 chars at most), ghost state every 100 ms (never above 20 a second), the result once. The hub
 * query keys are stripped before the engine sees them (they would be `CORE_BAD_SETTING`). Page-side.
 * @example
 * const info = await connectHub(search); // null outside a session
 */
import type { Engine } from '../../../engine';
import { insOf } from '../ui/ins';

interface HubInfo {
  limitMs?: number;
  me: number;
  players: { id: number; name: string; color: string }[];
  seed: number;
  isHost: boolean;
}
interface HubApi {
  active: boolean;
  connect(o: object): Promise<HubInfo | null>;
  ready(): void;
  answer(a: string): void;
  time(): number;
  on(e: string, f: (...a: any[]) => void): () => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  progress(p: object): void;
  result(r: object): void;
  send(d: object, o?: object): boolean;
  rng(l: string): () => number;
  fail(m: string): void;
}
export const hubApi = (): HubApi | undefined => (window as unknown as { AIHub?: HubApi }).AIHub;
export const inSession = (): boolean => !!hubApi()?.active;
/** Strips the hub's own query keys, which the engine would reject; returns the cleaned search. */
export function cleanSearch(search: URLSearchParams): URLSearchParams {
  for (const k of [...search.keys()]) if (k.startsWith('aihub')) search.delete(k);
  search.set('touch', 'off');
  return search;
}
export async function connectHub(): Promise<HubInfo | null> {
  const h = hubApi();
  if (!h?.active) return null;
  return h.connect({ mode: 'ghost', seats: [1, 4], card: true });
}
/** The session's state: built right after `connect`, before the engine exists, so the card answers keys and the start, progress and ghost messages never wait for the view. */
export interface Session {
  attach(engine: Engine): void;
  frame(f: { world: { query(...n: string[]): unknown[] } }): void;
}
export function startSession(info: HubInfo, bodyRoot: HTMLElement): Session {
  const h = hubApi()!;
  let engine: Engine | null = null;
  const card = document.createElement('div');
  card.className = 'panel center';
  card.style.cssText += ';min-width:60vw;pointer-events:auto;z-index:5';
  bodyRoot.appendChild(card);
  let left: number | null = null;
  let readySet: number[] = [];
  let started = false;
  let over = false;
  let resultSent = false;
  let lastSend = 0;
  let lastProg = 0;
  let go = false;
  let lastScore = 0;
  const mats: Record<number, { x: number; y: number; cls: number; score: number; alive: number }> = {};
  const drawCard = () => {
    const rows = info.players
      .map((p) => {
        const t = document.createElement('span');
        t.textContent = `${p.name}${readySet.includes(p.id) ? ' ✓' : ''}`;
        return `<span style="color:${p.color}">●</span> ${t.innerHTML}`;
      })
      .join(' &nbsp; ');
    card.innerHTML = `<h1>Well Wobbled</h1><p>${rows}</p><p>Stay the steadiest across three classes.</p><p class="small">Lean: stick, WASD or mouse · Feet: L2 R2, Q E · Breathe: both feet</p><p class="small">${left === null ? 'Waiting…' : Math.ceil(left / 1000) + ' s'} · Enter or Cross: Ready · Triangle or T: More time</p>`;
  };
  card.onclick = () => h.answer('ready');
  addEventListener('keydown', (e) => {
    if (started) return;
    if (e.key === 'Enter') h.answer('ready');
    else if (e.key === 't' || e.key === 'T') h.answer('more');
  });
  let padWas = false;
  setInterval(() => {
    const p = (navigator.getGamepads?.() ?? []).find((x) => x);
    const now = !!p?.buttons[0]?.pressed;
    if (now && !padWas && !started) h.answer('ready');
    if (p?.buttons[3]?.pressed && !started) h.answer('more');
    padWas = now;
  }, 100);
  const report = (): void => {
    if (resultSent) return;
    resultSent = true;
    h.result({
      score: lastScore,
      stats: {
        'Wobble Age': String(Math.round(18 + 64 * Math.pow(1 - Math.min(1, lastScore / 3000), 1.3))),
        Classes: '3',
      },
      awards: lastScore > 2000 ? [{ title: 'Unnervingly Still', detail: 'Least Wobbly' }] : [],
    });
  };
  const send = (cls: number, x: number, y: number): void => {
    h.send({ t: 'g', e: cls, x, y, p: '', s: lastScore }, { reliable: false });
  };
  h.on('card', (c: { left: number | null; ready: number[] }) => {
    left = c.left;
    readySet = c.ready;
    drawCard();
  });
  drawCard();
  h.on('start', () => {
    started = true;
    h.progress({ score: 0, label: 'Breathing in' });
    send(0, 0, 0);
  });
  h.on('message', (d: { t: string; e: number; x: number; y: number; s: number }, from: number) => {
    if (d?.t === 'g') mats[from] = { x: d.x, y: d.y, cls: d.e, score: d.s, alive: 1 };
  });
  h.on('leave', (l: { id: number }) => {
    if (mats[l.id]) mats[l.id].alive = 0;
  });
  h.on('time-up', () => report());
  // a slow frame can hold the page past the hub's grace, so report a few seconds before the hub's own limit as well
  setInterval(() => {
    if (started && info.limitMs && h.time() >= info.limitMs - 4000) report();
  }, 250);
  h.on('end', () => {
    over = true;
    engine?.stop?.();
    card.style.display = 'none';
  });
  return {
    attach(e) {
      engine = e;
    },
    frame(f) {
      if (over || !engine) return;
      const ins = insOf(engine);
      const flow = (f.world.query('flow')[0] as { flow: { mode: string } } | undefined)?.flow;
      const round = (f.world.query('round')[0] as { round: { on: number; cls: number; total: number[] } } | undefined)
        ?.round;
      const guest = (
        f.world.query('cast', 'wobble') as { cast: { who: string }; wobble: { x: number; y: number } }[]
      ).find((e) => e.cast.who === 'guest');
      if (started && !go && h.time() >= 0) {
        go = true;
        card.style.display = 'none';
        ins.actions.run('round.go');
      }
      if (!go || !round || !guest) return;
      lastScore = round.total[0];
      const now = performance.now();
      if (now - lastProg > 1000) {
        lastProg = now;
        h.progress({
          score: lastScore,
          label: `Class ${Math.min(3, round.cls + 1)} · ${Math.round(lastScore)}`.slice(0, 24),
        });
      }
      if (now - lastSend >= 100) {
        lastSend = now;
        send(round.cls, guest.wobble.x, guest.wobble.y);
      }
      const flat: number[] = [];
      for (const [id, m] of Object.entries(mats)) {
        const slot = info.players.findIndex((p) => p.id === Number(id));
        if (slot >= 0) flat.push(slot, m.x, m.y, m.cls, m.alive);
      }
      engine.input?.virtual.axis('game:ghosts', flat as never);
      if (flow?.mode === 'results' && !resultSent) report();
    },
  };
}
