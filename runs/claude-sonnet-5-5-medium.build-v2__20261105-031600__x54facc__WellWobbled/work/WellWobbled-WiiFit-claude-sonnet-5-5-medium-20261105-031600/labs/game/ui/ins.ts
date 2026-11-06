/**
 * @file A typed view of the engine's inspector (`window.__engine`), for the members the page uses: actions, set, camera, pause,
 * timeScale, seed, step. Page-side.
 * @example
 * insOf(engine).actions.run('game.leave');
 */
import type { Engine } from '../../../engine';

export interface Ins {
  actions: { run(name: string, args?: object): unknown };
  set(path: string, value: unknown): unknown;
  pause(): void;
  resume(): void;
  step(n?: number): number;
  timeScale(k?: number): number;
  seed(n?: number): number;
  camera: { set(code: string, o?: { blend?: boolean }): unknown };
}
export const insOf = (e: Engine): Ins => e.inspector as unknown as Ins;
