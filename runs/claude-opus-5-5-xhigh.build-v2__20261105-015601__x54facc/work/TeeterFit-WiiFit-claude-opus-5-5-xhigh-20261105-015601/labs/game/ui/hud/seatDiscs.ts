/**
 * @file Group Class's small Balance Discs (PLAN.md section 8): one per seat in its seat colour, so every player on the same
 * screen can see their own weight. They stand in a row, in the order their mats stand across the screen, and take the place
 * of the big disc, which can only belong to one seat.
 *
 * Game code, a page's.
 *
 * @example
 * // seatDiscs.update([{ seat, wobble, across: -2 }], hud);
 */
import type { HudData, Seat, Wobble } from '../../scenes/components';

/** The hub's fixed seat colours. */
export const SEAT_COLORS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'] as const;

/** SVG units per unit of the disc. */
const R = 90;
/** How tall a foot's bar is, in SVG units. */
const BAR = 120;

/** One seat, and how far across the screen its mat stands. */
export interface SeatView {
  seat: Seat;
  wobble: Wobble;
  across: number;
}

/** One small disc's moving parts. */
interface SmallDisc {
  root: HTMLElement;
  dot: SVGCircleElement;
  ring: SVGCircleElement;
  guide: SVGCircleElement;
  lungs: SVGCircleElement;
  left: SVGRectElement;
  right: SVGRectElement;
}

/** Fills a foot's bar from the bottom. */
function fillBar(bar: SVGRectElement, amount: number): void {
  const height = Math.min(1, amount) * BAR;
  bar.setAttribute('y', String(BAR / 2 - height));
  bar.setAttribute('height', String(height));
}

/** The row of small discs. */
export class SeatDiscs {
  readonly el: HTMLElement;
  private discs: SmallDisc[];

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'tf-seatdiscs';
    this.discs = SEAT_COLORS.map((color, index) => this.make(color, index));
    parent.append(this.el);
    this.el.style.display = 'none';
  }

  private make(color: string, index: number): SmallDisc {
    const root = document.createElement('div');
    root.className = 'tf-seatdisc';
    root.dataset.ui = 'seatdisc';
    root.dataset.seat = String(index);
    const bar = (x: number, name: string) =>
      `<rect x="${x}" y="${-BAR / 2}" width="12" height="${BAR}" rx="6" fill="rgba(255,250,241,.8)"/><rect class="${name}" x="${x}" width="12" fill="${color}"/>`;
    root.innerHTML = `<svg viewBox="-100 -100 200 200" aria-hidden="true">
      <circle r="${R}" fill="rgba(255,250,241,.9)" stroke="${color}" stroke-width="8"/>
      <circle class="guide" r="20" fill="none" stroke="#bfead6" stroke-width="10"/>
      <circle class="lungs" r="10" fill="rgba(143,214,184,.45)"/>
      <circle class="ring" r="20" fill="none" stroke="#ff8a70" stroke-width="6"/>
      <circle class="dot" r="13" fill="${color}" stroke="#fff" stroke-width="3"/>
      ${bar(-116, 'left')}${bar(104, 'right')}
    </svg>`;
    this.el.append(root);
    return {
      root,
      dot: root.querySelector('.dot')!,
      ring: root.querySelector('.ring')!,
      guide: root.querySelector('.guide')!,
      lungs: root.querySelector('.lungs')!,
      left: root.querySelector('.left')!,
      right: root.querySelector('.right')!,
    };
  }

  /** One frame; no seats, or a class with no disc, hides the row. */
  update(seats: readonly SeatView[], hud: HudData): void {
    const on = Boolean(hud.disc) && seats.length > 0;
    this.el.style.display = on ? '' : 'none';
    if (!on) return;
    const order = [...seats].sort((a, b) => a.across - b.across);
    const [rx, ry, rr] = hud.ring ?? [0, 0, 0];
    const breath = hud.guide !== false;
    this.discs.forEach((disc, index) => {
      const view = seats.find((v) => v.seat.index === index);
      disc.root.style.display = view ? '' : 'none';
      if (!view) return;
      const { wobble, seat } = view;
      disc.root.style.order = String(order.indexOf(view));
      disc.dot.setAttribute('cx', String(wobble.x * R));
      disc.dot.setAttribute('cy', String(-wobble.y * R));
      disc.ring.style.display = rr > 0 ? '' : 'none';
      disc.ring.setAttribute('cx', String(rx * R));
      disc.ring.setAttribute('cy', String(-ry * R));
      disc.ring.setAttribute('r', String(rr * R));
      disc.ring.setAttribute('stroke', Math.hypot(wobble.x - rx, wobble.y - ry) <= rr ? '#8fd6b8' : '#ff8a70');
      disc.guide.style.display = breath ? '' : 'none';
      disc.lungs.style.display = breath ? '' : 'none';
      disc.guide.setAttribute('r', String(16 + wobble.guide * 66));
      disc.lungs.setAttribute('r', String(8 + wobble.lungs * 72));
      fillBar(disc.left, hud.feet ? seat.fl : 0);
      fillBar(disc.right, hud.feet ? seat.fr : 0);
    });
  }
}
