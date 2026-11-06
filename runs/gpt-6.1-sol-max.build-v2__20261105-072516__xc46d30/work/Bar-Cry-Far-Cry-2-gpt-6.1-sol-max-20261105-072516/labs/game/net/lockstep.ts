/** @file Host-sequenced lockstep: 15 reliable frames a second, four simulation steps per turn. */
import type { Inspector, Intents } from '../../../engine';
import type { Net, Info } from './session';
import type { Campaign, Person } from '../scenes/state';
export interface Wire {
  m: [number, number];
  l: [number, number];
  a?: [number, number, number];
  b: string[];
}
interface Frame {
  k: 'f';
  s: number;
  n: number;
  i: Record<string, Wire>;
}
export const BUTTONS = new Set([
  'fire',
  'aim',
  'jump',
  'crouch',
  'sprint',
  'interact',
  'reload',
  'weapon1',
  'weapon2',
  'weapon3',
  'swap',
  'previous',
  'holster',
  'melee',
  'throw',
  'frag',
  'heal',
  'pill',
  'map',
  'locator',
  'quickfire',
  'throttle',
  'brake',
  'driveLeft',
  'driveRight',
  'handbrake',
  'seat',
]);
export function clean(raw: unknown): Wire {
  const d = raw as Partial<Wire> | null,
    arr = (v: unknown, n: number) =>
      Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));
  const m = arr(d?.m, 2) ? d!.m! : [0, 0],
    l = arr(d?.l, 2) ? d!.l! : [0, 0];
  return {
    m: [Math.max(-1, Math.min(1, m[0])), Math.max(-1, Math.min(1, m[1]))],
    l: [l[0], Math.max(-1.5, Math.min(1.5, l[1]))],
    ...(arr(d?.a, 3) ? { a: d!.a } : {}),
    b: [...new Set((Array.isArray(d?.b) ? d.b : []).filter((b) => BUTTONS.has(b)))].sort(),
  };
}
export const toIntents = (w: Wire): Intents => ({ move: w.m, look: w.l, ...(w.a ? { aim: w.a } : {}), b: w.b });
export function inspectorDigest(e: Inspector): string {
  const c = (e.get(e.entities('campaign')[0].id)!.campaign as { data: Campaign }).data;
  const actors = e.entities('seat').map((x) => e.get(x.id)) as unknown as Person[];
  const round = (v: number) => Math.round(v * 1000);
  return JSON.stringify({
    t: e.info().tick,
    seats: actors.map((p) => [
      p.seat!.data.n,
      round(p.actor.x),
      round(p.actor.z),
      round(p.health.hp),
      p.weapons.shots,
      p.gunState.data.guns.map((g) => [round(g.condition), g.jam]),
    ]),
    cars: e.entities('ride').map((x) => {
      const v = e.get(x.id)!;
      const p = v.sceneProp as { x: number; z: number };
      return [round(p.x), round(p.z), round((v.ride as { data: { hp: number } }).data.hp)];
    }),
    npcs: e.entities('soldier').map((x) => {
      const p = e.get(x.id) as unknown as Person;
      return [p.id, round(p.actor.x), round(p.actor.z), round(p.health.hp)];
    }),
    story: [c.contract, c.step],
    fire: c.fire.reduce((a, v, i) => ((a[v] = (a[v] ?? 0) + i + 1), a), [] as number[]),
  });
}

export function startLockstep(
  net: Net,
  e: Inspector,
  options: { sample: () => Wire; onEnd?: () => void; onMismatch?: () => void; finish?: (won: boolean) => void },
): () => void {
  e.pause();
  let sent = 0,
    stepped = 0,
    lastSent = -9999,
    lastDigest = -1,
    ended = false;
  const latest: Record<string, Wire> = {},
    frames = new Map<number, Frame>(),
    hashes = new Map<number, string>();
  (net as unknown as { digests: Map<number, string> }).digests = hashes;
  for (const p of net.players) latest[p.id] = clean(null);
  const onFrame = (f: Frame) => {
    if (f.s >= stepped && Number.isInteger(f.n) && f.n > 0 && f.n <= 30) frames.set(f.s, f);
  };
  net.on('message', (raw, from) => {
    const data = raw as { k: string; w?: Wire; s?: number; h?: string };
    if (data.k === 'i' && net.isHost && net.players.some((p) => p.id === from)) latest[from!] = clean(data.w);
    if (data.k === 'f' && from === net.host) onFrame(raw as Frame);
    if (data.k === 'd' && net.isHost && hashes.has(data.s!) && hashes.get(data.s!) !== data.h) options.onMismatch?.();
  });
  net.on('end', () => {
    ended = true;
    clearInterval(timer);
    options.onEnd?.();
  });
  net.on('leave', (raw) => {
    if (!net.isHost) return;
    const d = raw as { id: number };
    latest[d.id] = clean(null);
  });
  const tick = () => {
    if (ended || net.time() < 0 || !Number.isFinite(net.time())) return;
    const time = net.time();
    if (time - lastSent >= 66) {
      const wire = clean(options.sample());
      if (net.isHost) {
        latest[net.me] = wire;
        const n = Math.min(30, Math.floor((Math.floor(time * 0.06) - sent) / 4));
        if (n > 0) {
          const f: Frame = { k: 'f', s: sent, n, i: structuredClone(latest) };
          net.send(f, { reliable: true });
          onFrame(f);
          sent += n * 4;
        }
      } else net.send({ k: 'i', w: wire }, { to: net.host, reliable: true });
      lastSent = time;
    }
    let budget = 12;
    while (budget > 0) {
      const f = frames.get(stepped);
      if (!f) break;
      frames.delete(stepped);
      for (let k = 0; k < f.n * 4; k++) {
        const local = toIntents(clean(f.i[net.me])),
          others: Record<string, Intents> = {};
        for (const p of net.players) if (p.id !== net.me) others[p.id] = toIntents(clean(f.i[p.id]));
        e.step(1, { ...local, 'game:seats': others as never });
        stepped++;
        budget--;
        if (stepped % 120 === 0) {
          const h = inspectorDigest(e);
          hashes.set(stepped, h);
          if (hashes.size > 8) hashes.delete(hashes.keys().next().value!);
          if (!net.isHost) net.send({ k: 'd', s: stepped, h }, { to: net.host, reliable: true });
          lastDigest = stepped;
        }
      }
    }
    if (net.isHost && lastDigest >= 0) {
      const c = (e.state('campaign').entities[0]?.campaign as { data: Campaign } | undefined)?.data;
      if (c?.ending) options.finish?.(!!c.flags.runWon);
    }
  };
  const timer = setInterval(tick, 16);
  return () => {
    ended = true;
    clearInterval(timer);
  };
}
export function result(e: Inspector, info: Pick<Info, 'players'>, won: boolean): object {
  const seats = e.state(['actor', 'seat']).entities as unknown as Person[],
    scores: Record<string, number> = {},
    stats: Record<string, object> = {};
  for (const p of info.players) {
    const s = seats.find((x) => x.seat!.data.n === p.id)?.seat?.data;
    scores[p.id] =
      (won ? 500 : 0) + (s?.kills ?? 0) * 50 + (s?.revives ?? 0) * 150 - (s?.downs ?? 0) * 100 + (won ? 200 : 0);
    stats[p.id] = { Kills: s?.kills ?? 0, Rescues: s?.revives ?? 0 };
  }
  return {
    standings: [info.players.map((p) => p.id)],
    scores,
    stats,
    won,
    awards: info.players
      .slice(0, 1)
      .map((p) => ({ id: p.id, title: 'Best employee of the wind', detail: 'The wind keeps no receipts.' })),
  };
}
