/**
 * @file Speech on screen: text stays up with the voice, typing in step with the babble, always readable, one line at a time.
 *
 * Game code, a page's.
 *
 * @example
 * // speech.show('tare', 'Please step on me.', 2.4);
 */

/** Names on screen. */
const NAMES: Readonly<Record<string, string>> = {
  tare: 'Tare',
  plumb: 'Plumb',
  gerald: 'Gerald',
  bex: 'Bex',
  nan: 'Nan',
  pa: 'Tannoy',
};

/** The speech box. */
export class Speech {
  readonly el: HTMLElement;
  private name: HTMLElement;
  private text: HTMLElement;
  private full = '';
  private shown = 0;
  private rate = 30;
  private until = 0;
  private time = 0;
  /** The line on screen, for tests. */
  current = '';

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tf-speech';
    this.el.dataset.ui = 'speech';
    this.name = document.createElement('b');
    this.text = document.createElement('span');
    this.el.append(this.name, this.text);
    this.el.style.display = 'none';
    parent.append(this.el);
  }

  /** Shows a line for at least long enough to read it. */
  show(who: string, text: string, seconds: number): void {
    this.name.textContent = NAMES[who] ?? who;
    this.full = text;
    this.current = text;
    this.shown = 0;
    this.rate = Math.max(20, text.length / Math.max(0.5, seconds));
    this.until = this.time + Math.max(3.4, seconds + 1.8, text.length * 0.055);
    this.text.textContent = '';
    this.el.style.display = '';
  }

  /** One frame. */
  update(dt: number): void {
    this.time += dt;
    if (this.shown < this.full.length) {
      this.shown = Math.min(this.full.length, this.shown + this.rate * dt);
      this.text.textContent = this.full.slice(0, Math.ceil(this.shown));
    }
    if (this.time > this.until && this.el.style.display !== 'none') {
      this.el.style.display = 'none';
      this.current = '';
    }
  }

  /** Takes it down. */
  clear(): void {
    this.until = 0;
    this.el.style.display = 'none';
    this.current = '';
  }
}
