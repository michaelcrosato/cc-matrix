/**
 * @file The Balance Disc, the HUD's heart (PLAN.md section 8): HTML and SVG, 30vh across at the lower centre. A target ring,
 * your dot with a short trail, a guide ring swelling with the breath, a foot pill either side with analog fill. It reads the
 * sim's `wobble` each frame.
 *
 * Game code, a page's.
 *
 * @example
 * // disc.update(wobble, seat, hud);
 */
import type { HudData, Seat, Wobble } from '../../scenes/components';

/** SVG units per unit of the disc. */
const R = 90;

/** The disc. */
export class Disc {
  readonly el: HTMLElement;
  private dot!: SVGCircleElement;
  private ring!: SVGCircleElement;
  private guide!: SVGCircleElement;
  private lungs!: SVGCircleElement;
  private trail: SVGCircleElement[] = [];
  private past: [number, number][] = [];
  private left: HTMLElement;
  private right: HTMLElement;
  private leftFill: HTMLElement;
  private rightFill: HTMLElement;

  constructor(parent: HTMLElement) {
    const el = document.createElement('div');
    el.className = 'tf-disc';
    el.dataset.ui = 'disc';
    el.innerHTML = `<svg viewBox="-100 -100 200 200" aria-hidden="true">
      <circle r="${R}" fill="rgba(255,250,241,.86)" stroke="#3a4a55" stroke-width="3"/>
      <circle class="guide" r="20" fill="none" stroke="#bfead6" stroke-width="9"/>
      <circle class="lungs" r="10" fill="rgba(143,214,184,.45)"/>
      <line x1="-${R}" y1="0" x2="${R}" y2="0" stroke="rgba(58,74,85,.18)" stroke-width="1.5"/>
      <line x1="0" y1="-${R}" x2="0" y2="${R}" stroke="rgba(58,74,85,.18)" stroke-width="1.5"/>
      <circle class="ring" r="20" fill="none" stroke="#ff8a70" stroke-width="4.5"/>
      <g class="trail"></g>
      <circle class="dot" r="7.5" fill="#3a4a55" stroke="#fff" stroke-width="2.2"/>
    </svg>`;
    parent.append(el);
    this.el = el;
    this.dot = el.querySelector('.dot')!;
    this.ring = el.querySelector('.ring')!;
    this.guide = el.querySelector('.guide')!;
    this.lungs = el.querySelector('.lungs')!;
    const trail = el.querySelector('.trail')!;
    for (let i = 0; i < 8; i++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', '4');
      c.setAttribute('fill', '#3a4a55');
      c.setAttribute('opacity', String(0.04 + i * 0.03));
      trail.append(c);
      this.trail.push(c);
    }
    const foot = (side: string, label: string) => {
      const pill = document.createElement('div');
      pill.className = 'tf-foot';
      pill.dataset.foot = side;
      pill.style[side === 'L' ? 'left' : 'right'] = 'calc(50% - 26vh)';
      const fill = document.createElement('i');
      const text = document.createElement('span');
      text.textContent = label;
      pill.append(fill, text);
      parent.append(pill);
      return [pill, fill] as const;
    };
    [this.left, this.leftFill] = foot('L', 'L');
    [this.right, this.rightFill] = foot('R', 'R');
    this.show(false, false);
  }

  /** Shows or hides it. */
  show(disc: boolean, feet: boolean): void {
    this.el.style.display = disc ? '' : 'none';
    this.left.style.display = feet ? '' : 'none';
    this.right.style.display = feet ? '' : 'none';
  }

  /** One frame. */
  update(wob: Wobble | undefined, seat: Seat | undefined, hud: HudData): void {
    this.show(Boolean(hud.disc), Boolean(hud.feet));
    if (seat) {
      this.leftFill.style.height = `${Math.round(Math.min(1, seat.fl) * 100)}%`;
      this.rightFill.style.height = `${Math.round(Math.min(1, seat.fr) * 100)}%`;
    }
    if (!hud.disc || !wob) return;
    const [dx, dy] = [wob.x * R, -wob.y * R];
    this.dot.setAttribute('cx', String(dx));
    this.dot.setAttribute('cy', String(dy));
    this.past.push([dx, dy]);
    if (this.past.length > 24) this.past.shift();
    this.trail.forEach((c, i) => {
      const p = this.past[Math.max(0, this.past.length - 1 - (7 - i) * 3)];
      if (p) {
        c.setAttribute('cx', String(p[0]));
        c.setAttribute('cy', String(p[1]));
      }
    });
    const [rx, ry, rr] = hud.ring ?? [0, 0, 0];
    this.ring.style.display = rr > 0 ? '' : 'none';
    this.ring.setAttribute('cx', String(rx * R));
    this.ring.setAttribute('cy', String(-ry * R));
    this.ring.setAttribute('r', String(rr * R));
    const near = Math.hypot(wob.x - rx, wob.y - ry) <= rr;
    this.ring.setAttribute('stroke', near ? '#8fd6b8' : '#ff8a70');
    const breath = hud.guide !== false && hud.disc;
    this.guide.style.display = breath ? '' : 'none';
    this.lungs.style.display = breath ? '' : 'none';
    this.guide.setAttribute('r', String(16 + wob.guide * 66));
    this.lungs.setAttribute('r', String(8 + wob.lungs * 72));
  }
}
