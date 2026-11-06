/**
 * @file About / Credits (PLAN.md section 8), paged, from one data file: Source Information, Testing Feedback, Engine Feedback,
 * Prompt Feedback, credits. Every field is on screen, a few to a page, at sofa size.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new AboutScreen(host));
 */
import type { Input } from '../../../../engine';
import { CREDITS, ENGINE_FEEDBACK, PROMPT_FEEDBACK, SOURCE_INFO, SOURCE_LABELS, TESTING_FEEDBACK } from '../about-data';
import { promptHtml } from '../glyphs';
import { layer, type AppHost, type Screen } from './types';

/** How many characters fit a line, and how many lines a page, at this size. */
const LINE_CHARS = 56;
const PAGE_LINES = 16;

/** The lines an entry takes on screen, with the blank line after it. */
function linesOf(entry: string): number {
  const parts = entry.replace(/<[^>]+>/g, '').split('\n');
  return parts.reduce((lines, part) => lines + Math.ceil(part.length / LINE_CHARS), 1);
}

/** Splits entries into pages by length. */
function paginate(title: string, entries: readonly string[]): { title: string; body: string }[] {
  const pages: { title: string; body: string }[] = [];
  let body = '';
  let lines = 0;
  for (const entry of entries) {
    const more = linesOf(entry);
    if (body && lines + more > PAGE_LINES) {
      pages.push({ title, body });
      body = '';
      lines = 0;
    }
    body += `${entry}\n\n`;
    lines += more;
  }
  if (body) pages.push({ title, body });
  return pages;
}

/** Every page, in order. */
export function aboutPages(): { title: string; body: string }[] {
  const qa = (list: readonly (readonly [string, string])[]) => list.map(([q, a]) => `<b>${q}</b>\n${a}`);
  return [
    ...paginate(
      'Source Information',
      SOURCE_LABELS.map(([key, label]) => `<b>${label}:</b> ${SOURCE_INFO[key]}`),
    ),
    ...paginate('Testing Feedback', qa(TESTING_FEEDBACK)),
    ...paginate('Engine Feedback', qa(ENGINE_FEEDBACK)),
    ...paginate('Prompt Feedback', qa(PROMPT_FEEDBACK)),
    ...paginate('Credits', CREDITS),
  ];
}

/** About. */
export class AboutScreen implements Screen {
  readonly name = 'about';
  readonly modal = true;
  private el: HTMLElement;
  private pages = aboutPages();
  private page = 0;
  private body: HTMLElement;
  private title: HTMLElement;
  private foot: HTMLElement;
  private key = '';

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    const panel = document.createElement('div');
    panel.className = 'tf-panel';
    panel.dataset.panel = 'about';
    this.title = document.createElement('div');
    this.title.className = 'tf-h1';
    this.body = document.createElement('div');
    this.body.className = 'tf-about';
    this.body.dataset.ui = 'about';
    this.foot = document.createElement('div');
    this.foot.className = 'tf-prompts';
    this.foot.style.justifyContent = 'flex-start';
    panel.append(this.title, this.body, this.foot);
    panel.addEventListener('click', () => this.flip(1));
    this.el.append(panel);
    this.draw();
  }

  private flip(dir: number): void {
    const n = this.pages.length;
    this.page = (this.page + dir + n) % n;
    this.host.cue('move');
    this.draw();
  }

  private draw(): void {
    const { title, body } = this.pages[this.page];
    this.title.textContent = title;
    this.body.innerHTML = body.trim();
    this.key = '';
  }

  update(input: Input): void {
    if (input.pressed('uiRight') || input.pressed('uiDown') || input.pressed('uiAccept')) this.flip(1);
    else if (input.pressed('uiLeft') || input.pressed('uiUp')) this.flip(-1);
    else if (input.pressed('uiCancel')) this.host.close(this);
    const key = `${this.host.device()}|${this.host.glyphs()}|${this.page}`;
    if (key !== this.key) {
      this.key = key;
      const d = this.host.device();
      const g = this.host.glyphs();
      this.foot.innerHTML = `<span>Page ${this.page + 1} of ${this.pages.length}</span>${promptHtml('confirm', 'Next', d, g)}${promptHtml('cancel', 'Back', d, g)}`;
    }
  }

  remove(): void {
    this.el.remove();
  }
}
