/**
 * @file Page entry. The hub connects while the engine loads. This file does not import the engine, so a browser
 * without WebGPU can show its message before that graph runs.
 */
/// <reference types="vite/client" />

/** The pasted hub client, as the page calls it. */
interface HubClient {
  active: boolean;
  connect(opts: { mode: string; seats: [number, number]; card?: boolean }): Promise<{
    me: number;
    players: { id: number; name: string; color: string }[];
    isHost: boolean;
    server: boolean;
    seed: number;
  } | null>;
  ready(): void;
  answer(which: 'ready' | 'more'): void;
  time(): number;
  finish(body: unknown): void;
  send(data: unknown, opts?: { to?: number; reliable?: boolean }): boolean;
  on(event: string, fn: (data: unknown, from?: number) => void): () => void;
  fail(message: string): void;
}

export {};

const hub = (window as unknown as { AIHub?: HubClient }).AIHub ?? null;

if (navigator.gpu) {
  const infoPromise = hub?.active
    ? hub.connect({ mode: 'shared-world', seats: [1, 4], card: true })
    : Promise.resolve(null);
  const bootP = import('./app/boot');
  const info = await infoPromise;
  const game = await bootP;
  await game.start(info, hub);
}
