/** @file Large-screen HTML shell with the same focus path for mouse, keys and every standard-mapped pad. */
import { glyph, LEAF, safe, type Device } from './glyphs';
export type Choice = {
  id: string;
  label: string;
  detail?: string;
  value?: string;
  action: () => void;
  adjust?: (direction: number) => void;
  slider?: { min: number; max: number; step: number; value: number; change: (value: number) => void };
};
export class Shell {
  root = document.createElement('div');
  hud = document.createElement('div');
  banner = document.createElement('div');
  screen = 'title';
  capturing = false;
  focus = 0;
  choices: Choice[] = [];
  device: Device = 'keyboard';
  xbox = false;
  back: () => void = () => {};
  onPause: () => void = () => {};
  onPage: (direction: number) => void = () => {};
  interaction: () => boolean | void = () => {};
  lastInput = performance.now();
  padOld: boolean[] = [];
  padRepeat = 0;
  constructor() {
    this.root.id = 'shell';
    this.hud.id = 'game-hud';
    this.banner.id = 'demo-banner';
    document.body.append(this.root, this.hud, this.banner);
    window.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (this.capturing) {
        this.note('keyboard');
        return;
      }
      if (this.note('keyboard')) {
        event.preventDefault();
        return;
      }
      if (!this.choices.length) {
        if (event.code === 'Escape') {
          event.preventDefault();
          this.onPause();
        }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space', 'Escape', 'Tab'].includes(event.code))
        event.preventDefault();
      if (event.repeat && ['Enter', 'Space', 'Escape'].includes(event.code)) return;
      if (event.code === 'ArrowUp') this.move(-1);
      if (event.code === 'ArrowDown' || event.code === 'Tab') this.move(1);
      if (event.code === 'ArrowLeft') this.adjust(-1);
      if (event.code === 'ArrowRight') this.adjust(1);
      if ((event.code === 'Enter' || event.code === 'Space') && !(event.target instanceof HTMLInputElement))
        this.pick();
      if (event.code === 'Escape') this.back();
    });
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'touch' && (event.movementX || event.movementY)) this.note('mouse');
    });
    window.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') this.note('mouse');
      else this.lastInput = performance.now();
    });
  }
  note(device: Device): boolean {
    const changed = this.device !== device;
    this.device = device;
    this.lastInput = performance.now();
    const consumed = this.interaction() === true;
    if (changed)
      for (const parent of [this.root, this.hud, this.banner])
        parent.querySelectorAll<HTMLElement>('[data-glyph]').forEach((node) => {
          node.outerHTML = glyph(node.dataset.glyph ?? 'accept', device, this.xbox);
        });
    return consumed;
  }
  menu(
    screen: string,
    eyebrow: string,
    title: string,
    description: string,
    choices: Choice[],
    options: { extra?: string; footer?: string; hero?: boolean; wide?: boolean } = {},
  ): void {
    const prior = this.screen === screen ? this.focus : 0;
    this.screen = screen;
    this.choices = choices;
    this.focus = 0;
    this.root.className = `screen screen-${screen}${options.hero ? ' hero-screen' : ''}${options.wide ? ' wide-screen' : ''}`;
    this.root.innerHTML = `<div class="paper-wash"></div><div class="masthead"><span class="leaf">${LEAF}</span><span>LITTLE FULCRUM<span class="masthead-small">WELLNESS RETREAT</span></span><span class="edition">EST. APPROXIMATELY LEVEL</span></div><main class="menu-panel"><div class="eyebrow"><span class="tiny-line"></span>${safe(eyebrow)}</div><h1>${title}</h1>${description ? `<p class="description">${safe(description)}</p>` : ''}${options.extra ?? ''}<div class="menu-list" role="menu" aria-label="${safe(screen)}">${choices.map((choice, i) => `<button type="button" data-choice="${i}" data-action="${safe(choice.id)}" role="menuitem" class="menu-choice${i === 0 ? ' focused' : ''}" tabindex="${i === 0 ? '0' : '-1'}"><span class="choice-number">${String(i + 1).padStart(2, '0')}</span><span class="choice-content"><span class="choice-label">${safe(choice.label)}</span>${choice.detail ? `<span class="choice-detail">${safe(choice.detail)}</span>` : ''}</span><span class="choice-value">${safe(choice.value ?? '')}</span><span class="choice-arrow">↗</span></button>${choice.slider ? `<input aria-label="${safe(choice.label)}" data-slider="${i}" type="range" min="${choice.slider.min}" max="${choice.slider.max}" step="${choice.slider.step}" value="${choice.slider.value}">` : ''}`).join('')}</div></main><footer class="screen-footer"><span>${options.footer ?? `${glyph('accept', this.device, this.xbox)} Select <span class="footer-dot">·</span> ${glyph('back', this.device, this.xbox)} Back`}</span><span class="footer-right">A LITTLE PRACTICE. A LITTLE LESS WOBBLE.</span></footer>`;
    this.root.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      const index = Number(button.dataset.choice);
      button.addEventListener('pointerenter', () => this.setFocus(index));
      button.addEventListener('click', () => {
        this.setFocus(index);
        this.pick();
      });
    });
    this.setFocus(prior);
    this.root.querySelectorAll<HTMLInputElement>('[data-slider]').forEach((slider) =>
      slider.addEventListener('input', () => {
        this.setFocus(Number(slider.dataset.slider));
        this.choices[this.focus].slider?.change(Number(slider.value));
        const value = this.root.querySelector(`[data-choice="${this.focus}"] .choice-value`);
        if (value)
          value.textContent = ['music', 'effects', 'voices'].includes(this.choices[this.focus].id)
            ? `${Math.round(Number(slider.value) * 100)}%`
            : slider.value;
      }),
    );
  }
  clear(screen = 'play'): void {
    this.screen = screen;
    this.root.innerHTML = '';
    this.root.className = '';
    this.choices = [];
  }
  setFocus(index: number): void {
    this.focus = Math.max(0, Math.min(this.choices.length - 1, index));
    this.root.querySelectorAll<HTMLElement>('[data-choice]').forEach((element, i) => {
      element.classList.toggle('focused', i === this.focus);
      element.tabIndex = i === this.focus ? 0 : -1;
    });
  }
  move(direction: number): void {
    if (this.choices.length) this.setFocus((this.focus + direction + this.choices.length) % this.choices.length);
  }
  adjust(direction: number): void {
    this.choices[this.focus]?.adjust?.(direction);
  }
  pick(): void {
    this.choices[this.focus]?.action();
  }
  updatePad(dt: number): void {
    const pads = navigator.getGamepads?.() ?? [];
    const pad =
      [...pads].find(
        (p) => p?.connected && (p.buttons.some((b) => b.pressed) || p.axes.some((a) => Math.abs(a) > 0.3)),
      ) ?? [...pads].find((p) => p?.connected);
    if (!pad) return;
    const b = pad.buttons.map((x) => x.pressed),
      active = b.some(Boolean) || pad.axes.some((a) => Math.abs(a) > 0.3);
    if (active && this.note('pad')) {
      this.padOld = b;
      return;
    }
    const press = (n: number) => b[n] && !this.padOld[n];
    this.padRepeat = Math.max(0, this.padRepeat - dt);
    if (this.capturing) {
      if (press(1)) {
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true }));
        document.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape', bubbles: true }));
      }
      this.padOld = b;
      return;
    }
    if (this.choices.length) {
      if ((b[12] || pad.axes[1] < -0.5) && this.padRepeat === 0) {
        this.move(-1);
        this.padRepeat = 0.2;
      }
      if ((b[13] || pad.axes[1] > 0.5) && this.padRepeat === 0) {
        this.move(1);
        this.padRepeat = 0.2;
      }
      if ((b[14] || pad.axes[0] < -0.5) && this.padRepeat === 0) {
        this.adjust(-1);
        this.padRepeat = 0.1;
      }
      if ((b[15] || pad.axes[0] > 0.5) && this.padRepeat === 0) {
        this.adjust(1);
        this.padRepeat = 0.1;
      }
      if (press(4)) this.onPage(-1);
      if (press(5)) this.onPage(1);
      if (press(0)) this.pick();
      if (press(1)) this.back();
    }
    if (press(9) && !b[8]) {
      if (this.choices.length) this.back();
      else this.onPause();
    }
    this.padOld = b;
  }
}
