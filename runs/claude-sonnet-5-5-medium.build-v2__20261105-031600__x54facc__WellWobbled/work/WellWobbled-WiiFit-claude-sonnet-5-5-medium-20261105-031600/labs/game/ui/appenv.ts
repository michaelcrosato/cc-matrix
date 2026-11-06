/**
 * @file The page app's shared shapes: `St` (the few mutable values the app and its parts share), `Env` (what the parts of the app may
 * call: the screens, sounds, speech, the save and the flow steps) and `sim`, which reads the guest's components from a
 * frame. Splitting the app this way keeps every file small. Page-side.
 * @example
 * const { flow, guest } = sim(frame); flow.mode; // 'roam'
 */
import type { Audio, Engine, EngineFrame } from '../../../engine';
import type { Hud } from './hud';
import type { Device, GlyphSet } from './glyphs';
import type { Ins } from './ins';
import type { Screens, ScreenCtx } from './screens';
import type { Save, Settings } from './store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Rec = Record<string, any>;
export interface St {
  current: string;
  said: number;
  world: object | null;
  lastSeq: number;
  pebbleMsg: number;
  freePlay: boolean;
  idle: number;
  bannerEl: HTMLElement | null;
  attract: boolean;
  scr: string;
  paused: boolean;
  seenUse: number;
  page: number;
}
export interface Env {
  st: St;
  ctx: ScreenCtx;
  settings(): Settings;
  hud(): Hud | null;
  save(): Save;
  audio(): Audio | null;
  screens(): Screens | null;
  root(): HTMLElement | null;
  eng(): Engine | null;
  device(): Device;
  glyphs(): GlyphSet;
  sfx(id: string, vol?: number): void;
  speak(who: string, id: string, vars?: Record<string, string | number>): void;
  act(name: string, args?: object): void;
  persist(): void;
  open(spec: unknown): void;
  startActivity(id: string, round?: boolean): void;
  openBoard(): void;
  evening(): void;
  dayDone(): boolean;
  titleScreen(): void;
  setMap(id: string): void;
  onResult(r: { id: string; score: number; rank: string; pebbles: number }): void;
  insNow(): Ins | null;
  setCamera(code: string): void;
  closeScreen(): void;
}
/** The guest's components and the flow, read from a frame's world. */
export function sim(frame: EngineFrame): { flow: Rec; guest: Rec | null; run: Rec | null; seat: Rec | null } {
  const w = frame.world;
  const flow = (w.query('flow')[0] as Rec | undefined)?.flow ?? {};
  const g = (w.query('cast', 'wobble', 'act', 'seat') as Rec[]).find((e) => e.cast.who === 'guest') ?? null;
  return { flow, guest: g, run: g?.act ?? null, seat: g?.seat ?? null };
}
