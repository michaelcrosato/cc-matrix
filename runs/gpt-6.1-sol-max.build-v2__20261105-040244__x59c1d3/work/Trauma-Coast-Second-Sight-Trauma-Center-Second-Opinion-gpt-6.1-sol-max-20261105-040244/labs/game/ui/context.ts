/** @file Presentation dependencies passed explicitly, keeping screens independent of boot and networking. */
import type { Engine } from '../../../engine';
import type { Director } from '../app/director';
import type { Preferences } from '../app/settings';
import type { Hands } from '../input/hands';
import type { Soundtrack } from '../audio/mix';
import type { Operation } from '../data/types';
export interface UIContext {
  session: boolean;
  d: Director;
  prefs: Preferences;
  hands: Hands;
  sound: Soundtrack;
  engine: () => Engine | null;
  save: () => void;
  state: () => Operation | undefined;
  act: (name: string, args: Record<string, unknown>) => void;
  set: (key: string, value: unknown) => void;
  get: (key: string) => unknown;
  startSession: () => void;
}
