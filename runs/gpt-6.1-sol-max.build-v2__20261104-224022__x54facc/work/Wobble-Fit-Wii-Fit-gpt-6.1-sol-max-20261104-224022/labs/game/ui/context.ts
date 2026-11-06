/** @file The presentation's dependency contract, keeping screens independent of startup. */
import type { Engine, Audio, Store } from '../../../engine';
import type { Flow, Progress } from '../scenes/state';
import type { Options } from './options';
import type { Shell } from './shell';
export type GameInspector = NonNullable<Engine['inspector']> & {
  actions: { run: (action: string, args?: unknown) => unknown };
  camera: { set: (code: string, options?: { blend?: boolean }) => void };
  ready: boolean;
};
export type GameEngine = Omit<Engine, 'inspector'> & { readonly inspector: GameInspector | null };
export type ScreenApp = {
  ui: Shell;
  engine: GameEngine | null;
  audio: Audio;
  store: Store;
  options: Options;
  save: Progress;
  flow: Flow | null;
  devScore: number;
  freeCamera: boolean;
  touchOnly: boolean;
  hubActive: boolean;
  attract: boolean;
  sandbox: boolean;
  overlay: boolean;
  show: (screen: string, page?: number) => void;
  run: (action: string, args?: unknown) => void;
  resume: () => void;
  applyOptions: () => void;
  begin: () => void;
  start: (id: string) => void;
  setting: (path: string) => unknown;
  syncBindings: () => void;
};
