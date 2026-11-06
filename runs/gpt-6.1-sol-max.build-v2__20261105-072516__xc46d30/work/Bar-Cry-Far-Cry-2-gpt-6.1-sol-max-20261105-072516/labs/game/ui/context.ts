/** @file The front end's small shared interface. UI reads simulation data and sends recorded commands. */
import type { Engine, EngineFrame, Inspector, Store } from '../../../engine';
import type { Campaign, Person } from '../scenes/state';
import type { TabsNet } from '../net/tabs';
import type { RtcNet } from '../net/rtc';
export interface About {
  sourceInformation: Record<string, string>;
  testingFeedback: string[];
  engineFeedback: string[];
  promptFeedback: string[];
  aiHub: { name: string; [key: string]: unknown };
}
export interface GameInspector extends Inspector {
  actions: { run(name: string, args: unknown): void };
  camera: { set(code: string, options?: { blend?: boolean }): void; get(): unknown };
}
export interface Context {
  engine: Engine | null;
  frame: EngineFrame | null;
  c: Campaign | null;
  p: Person | undefined;
  screen: string;
  parent: string;
  inHub: boolean;
  hubSession: boolean;
  device: string;
  glyphs: string;
  store: Store;
  root: HTMLElement;
  me: number;
  seed: number;
  inspector(): GameInspector | null;
  open(name: string): void;
  back(): void;
  start(mode: string, merc?: number, load?: boolean): void;
  quit(): void;
  send(command: object): void;
  net: TabsNet | RtcNet | null;
  startNet(): void;
}
export const escape = (s: unknown): string =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function button(root: HTMLElement, label: string, fn: () => void, id?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  if (id) b.dataset.action = id;
  b.onclick = () => {
    fn();
  };
  b.onpointerenter = () => b.focus({ preventScroll: true });
  root.append(b);
  return b;
}
export const content = (ctx: Context): HTMLElement => ctx.root.querySelector('.content')!;
export function shell(ctx: Context, title: string, kicker = 'FIELD OFFICE', note = ''): HTMLElement {
  ctx.root.innerHTML = `<div class="screen-shell"><div class="panel-head"><span class="eyebrow">${escape(kicker)}</span><span class="page-id">B/C &nbsp; — &nbsp; DRY SEASON</span></div><h1>${escape(title)}</h1>${note ? `<p class="panel-note">${escape(note)}</p>` : ''}<div class="content"></div><div class="panel-footer"><span data-glyph="back">Esc · Back</span><span>Nothing here stays new.</span></div></div>`;
  return content(ctx);
}
export function inspector(ctx: Context): GameInspector | null {
  const e = ctx.engine?.inspector ?? (window as unknown as { __engine?: Inspector }).__engine;
  return typeof e?.step === 'function' ? (e as GameInspector) : null;
}
