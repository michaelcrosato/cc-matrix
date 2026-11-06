/**
 * @file Front-end screens as HTML over the canvas, each a panel with a `createMenu` (hover moves focus, click picks, pad and keys
 * drive it): title, programme, noticeboard, results, evening, pause, settings, controls, about, credits, the touch notice
 * and the no-WebGPU page. One idea per screen, at most six rows, text at least 28 px at 1080p. Page-side.
 * @example
 * const s = new Screens(root, input, ctx); s.open('title');
 */
import { createMenu, type Input, type Menu, type MenuItem } from '../../../engine';
import { ABOUT, ENGINE_Q, PROMPT_Q, SOURCE_LABELS, TAGLINE, TESTING_Q, TITLE } from './about-data';
import { glyph, hint, type Device, type GlyphSet } from './glyphs';
import { lineText } from './lines';
import type { Settings } from './store';

export interface Row {
  label: string;
  id: string;
  disabled?: boolean;
}
export interface ScreenCtx {
  settings(): Settings;
  device(): Device;
  set(): GlyphSet;
  pick(screen: string, id: string): void;
  cancel(screen: string): void;
  onMove?(screen: string, id: string): void;
}
export interface ScreenSpec {
  id: string;
  title?: string;
  html?: string;
  rows: Row[];
  place?: 'center' | 'top' | 'bottom';
  wide?: boolean;
  hint?: string;
}
export class Screens {
  private el: HTMLElement | null = null;
  private menu: Menu | null = null;
  current = '';
  private root: HTMLElement;
  private input: Input;
  private ctx: ScreenCtx;
  constructor(root: HTMLElement, input: Input, ctx: ScreenCtx) {
    this.root = root;
    this.input = input;
    this.ctx = ctx;
  }
  get open_(): boolean {
    return this.current !== '';
  }
  /** Shows a screen (replacing any other). */
  open(spec: ScreenSpec): void {
    this.close();
    this.current = spec.id;
    const wrap = document.createElement('div');
    wrap.className = 'panel center';
    wrap.dataset.screen = spec.id;
    wrap.style.minWidth = spec.wide ? '70vw' : '46vw';
    wrap.style.maxWidth = '88vw';
    wrap.style.maxHeight = '90vh';
    wrap.style.overflow = 'hidden';
    if (spec.title) wrap.insertAdjacentHTML('beforeend', `<h2>${spec.title}</h2>`);
    if (spec.html) wrap.insertAdjacentHTML('beforeend', `<div class="body">${spec.html}</div>`);
    const holder = document.createElement('div');
    wrap.appendChild(holder);
    if (spec.hint)
      wrap.insertAdjacentHTML('beforeend', `<div class="small" style="margin-top:1.4vh">${spec.hint}</div>`);
    this.root.appendChild(wrap);
    this.el = wrap;
    const items: MenuItem[] = spec.rows.map((r) => ({ label: r.label, id: r.id, disabled: r.disabled }));
    this.menu = createMenu(holder, items, {
      input: this.input as never,
      id: spec.id,
      place: 'center',
      onPick: (_i, it) => {
        if (typeof it === 'object' && it.id) this.ctx.pick(spec.id, it.id);
      },
      onCancel: () => this.ctx.cancel(spec.id),
      onMove: (_i, it) => {
        if (typeof it === 'object' && it.id) this.ctx.onMove?.(spec.id, it.id);
      },
    });
    (this.menu.el as HTMLElement).style.position = 'static';
    (this.menu.el as HTMLElement).style.transform = 'none';
  }
  setRows(rows: Row[]): void {
    this.menu?.setItems(rows.map((r) => ({ label: r.label, id: r.id, disabled: r.disabled })));
  }
  setHtml(html: string): void {
    const b = this.el?.querySelector('.body');
    if (b) b.innerHTML = html;
  }
  get index(): number {
    return this.menu?.index ?? 0;
  }
  select(i: number): void {
    this.menu?.select(i);
  }
  update(dt: number): void {
    this.menu?.update(dt);
  }
  close(): void {
    this.menu?.remove();
    this.el?.remove();
    this.menu = null;
    this.el = null;
    this.current = '';
  }
}
const g = (a: string, ctx: ScreenCtx, label: string): string => hint(a, label, ctx.device(), ctx.set());
/** Builds each screen's spec from the game's state. */
export const SCREENS = {
  title(ctx: ScreenCtx, started: boolean, free: boolean): ScreenSpec {
    const rows: Row[] = [
      { label: started ? 'Continue' : 'Begin', id: 'begin' },
      { label: 'Free Play', id: 'free', disabled: !free },
      { label: 'Group Class', id: 'group' },
      { label: 'Settings', id: 'settings' },
      { label: 'About / Credits', id: 'about' },
    ];
    return {
      id: 'title',
      html: `<h1>${TITLE}</h1><p>${TAGLINE}</p>`,
      rows,
      hint: g('confirm', ctx, 'Press any button'),
    };
  },
  programme(ctx: ScreenCtx, day: number, title: string, rows: Row[], blurb: string): ScreenSpec {
    return {
      id: 'programme',
      title: `Day ${day}: ${title}`,
      html: `<p class="small" id="blurb">${blurb}</p>`,
      rows,
      wide: true,
      hint: g('back', ctx, 'Close'),
    };
  },
  board(ctx: ScreenCtx, page: number, pages: number, rows: Row[], blurb: string): ScreenSpec {
    return {
      id: 'board',
      title: `Noticeboard (${page + 1}/${pages})`,
      html: `<p class="small">${blurb}</p>`,
      rows,
      wide: true,
      hint: `${g('page', ctx, 'Page')}${g('back', ctx, 'Close')}`,
    };
  },
  results(ctx: ScreenCtx, title: string, rank: string, score: number, pebbles: number, n: number): ScreenSpec {
    const remark = lineText(`result.${rank}`, {}, n);
    return {
      id: 'results',
      title,
      html: `<div class="big">${rank}</div><p>${score} / 1000 · ${'●'.repeat(pebbles)}</p><p class="small">${remark}</p>`,
      rows: [
        { label: 'Carry on', id: 'carry' },
        { label: 'Again', id: 'again' },
      ],
      hint: g('confirm', ctx, 'Choose'),
    };
  },
  evening(ctx: ScreenCtx, day: number, ages: number[], remark: string): ScreenSpec {
    const pts = ages.slice(-7);
    const w = 300,
      h = 90;
    const lo = 18,
      hi = 82;
    const path = pts.map((a, i) => `${(i / Math.max(1, pts.length - 1)) * w},${((a - lo) / (hi - lo)) * h}`).join(' ');
    const graph = `<svg viewBox="-6 -6 ${w + 12} ${h + 12}" style="width:34vw;height:10vh"><polyline points="${path}" fill="none" stroke="#FF8A70" stroke-width="4"/>${pts.map((a, i) => `<circle cx="${(i / Math.max(1, pts.length - 1)) * w}" cy="${((a - lo) / (hi - lo)) * h}" r="5" fill="#3A4A55"/>`).join('')}</svg>`;
    return {
      id: 'evening',
      title: `Evening of Day ${day}`,
      html: `<div class="stamp">Day ${day} ✓</div><p>${graph}</p><p class="small">${remark}</p>`,
      rows: [{ label: 'Sleep', id: 'sleep' }],
      hint: g('confirm', ctx, 'Sleep'),
    };
  },
  pause(ctx: ScreenCtx, inActivity: boolean, session: boolean): ScreenSpec {
    if (session)
      return {
        id: 'pause',
        title: 'Paused',
        rows: [
          { label: 'Resume', id: 'resume' },
          { label: 'Music, effects, voices', id: 'settings' },
          { label: 'Button icons', id: 'icons' },
        ],
      };
    return {
      id: 'pause',
      title: 'Paused',
      rows: [
        { label: 'Resume', id: 'resume' },
        { label: 'Restart Activity', id: 'restart', disabled: !inActivity },
        { label: 'Back to the Island', id: 'island', disabled: !inActivity },
        { label: 'Settings', id: 'settings' },
        { label: 'More', id: 'more' },
        { label: 'Quit to Title', id: 'quit' },
      ],
      hint: g('back', ctx, 'Resume'),
    };
  },
  more(ctx: ScreenCtx, dev: boolean): ScreenSpec {
    return {
      id: 'more',
      title: 'More',
      rows: [
        { label: 'Controls', id: 'controls' },
        { label: 'Dev Mode', id: 'dev', disabled: !dev },
        { label: 'About / Credits', id: 'about' },
        { label: 'Back', id: 'back' },
      ],
      hint: g('back', ctx, 'Back'),
    };
  },
  settings(ctx: ScreenCtx, s: Settings): ScreenSpec {
    return {
      id: 'settings',
      title: 'Settings',
      rows: [
        { label: 'Sound', id: 'sound' },
        { label: 'Play', id: 'play' },
        { label: 'Display', id: 'display' },
        { label: 'Erase Save', id: 'erase' },
        { label: 'Back', id: 'back' },
      ],
      html: `<p class="small">Music ${Math.round(s.music * 100)}% · Effects ${Math.round(s.effects * 100)}% · Voices ${Math.round(s.voices * 100)}%</p>`,
    };
  },
  group(ctx: ScreenCtx, title: string, rows: Row[], html = ''): ScreenSpec {
    return { id: `sub-${title}`, title, rows, html, hint: g('back', ctx, 'Back') };
  },
  confirm(ctx: ScreenCtx, title: string, text: string, yes: string): ScreenSpec {
    return {
      id: 'confirm',
      title,
      html: `<p>${text}</p>`,
      rows: [
        { label: 'Not now', id: 'no' },
        { label: yes, id: 'yes' },
      ],
      hint: g('back', ctx, 'Cancel'),
    };
  },
  touch(): ScreenSpec {
    return {
      id: 'touch',
      html: `<h1>${TITLE}</h1><p>Controller or keyboard required</p>`,
      rows: [{ label: 'Settings', id: 'settings' }],
    };
  },
  about(ctx: ScreenCtx, page: number): ScreenSpec {
    const pages = aboutPages();
    const p = pages[((page % pages.length) + pages.length) % pages.length];
    return {
      id: 'about',
      title: p.title,
      html: p.html,
      rows: [
        { label: 'Next page', id: 'next' },
        { label: 'Back', id: 'back' },
      ],
      wide: true,
      hint: `${g('page', ctx, 'Pages')}${g('back', ctx, 'Back')}`,
    };
  },
  controls(ctx: ScreenCtx, rows: Row[]): ScreenSpec {
    const lines = `<p class="small">Pad: stick leans · L2 / R2 feet · L2 + R2 breathe · Cross use · Options pause</p><p class="small">Keys: WASD leans · Q / E feet · Space breathe · E use · Esc pause</p><p class="small">Mouse: move leans · left / right button feet</p>`;
    return { id: 'controls', title: 'Controls', html: lines, rows, wide: true, hint: g('back', ctx, 'Back') };
  },
  credits(ctx: ScreenCtx): ScreenSpec {
    return {
      id: 'credits',
      html: `<h2>${TITLE}</h2>${ABOUT.credits.map((c) => `<p class="small">${c}</p>`).join('')}<p>Thanks for playing! Press ✕ to continue.</p>`,
      rows: [{ label: 'Continue', id: 'continue' }],
      wide: true,
      hint: g('confirm', ctx, 'Continue'),
    };
  },
  nowebgpu:
    '<div style="font:3.4vh system-ui;padding:12vh 10vw;text-align:center;color:#3A4A55;background:#F7FAFC;height:100vh"><h1>Well Wobbled</h1><p>This game needs a browser with WebGPU, such as current Chrome or Edge.</p></div>',
};
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
/** The About pages, built from the data file: Source Information (2 pages), the three feedback sets, credits. */
export function aboutPages(): { title: string; html: string }[] {
  const src = SOURCE_LABELS.map(([k, label]) => `<p class="small"><b>${label}:</b> ${esc(ABOUT.source[k])}</p>`);
  const qa = (qs: string[], as: string[]) =>
    qs.map((q, i) => `<p class="small"><b>${esc(q)}</b> ${esc(as[i] ?? 'unknown')}</p>`).join('');
  return [
    { title: 'Source Information', html: src.slice(0, 8).join('') },
    { title: 'Source Information', html: src.slice(8).join('') },
    { title: 'Testing Feedback', html: qa(TESTING_Q, ABOUT.testingFeedback) },
    { title: 'Engine Feedback', html: qa(ENGINE_Q, ABOUT.engineFeedback) },
    { title: 'Prompt Feedback', html: qa(PROMPT_Q, ABOUT.promptFeedback) },
    { title: 'Credits', html: ABOUT.credits.map((c) => `<p class="small">${esc(c)}</p>`).join('') },
  ];
}
void glyph;
