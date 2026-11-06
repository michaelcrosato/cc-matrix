/**
 * @file The hub session's own card (PLAN.md section 9): HTML over whatever is drawn, because the watchdog may call `ready()`
 * while the view is still warming up. The game's title, players in colour with who is ready, how to win, this player's
 * controls, seconds left. Enter or Cross is Ready; Triangle or T is More time; a tap or click works too. No menus or choices.
 *
 * Game code, a page's.
 *
 * @example
 * // const card = new HubCard(root, session);
 */
import type { Session } from '../../hub/session';

/** The card. */
export class HubCard {
  readonly el: HTMLElement;
  private players: HTMLElement;
  private left: HTMLElement;
  private readyBtn: HTMLElement;
  private moreBtn: HTMLElement;
  private padDown = { ready: false, more: false };

  private session: Session;

  constructor(parent: HTMLElement, session: Session) {
    this.session = session;
    const el = document.createElement('div');
    el.className = 'tf-layer';
    el.dataset.ui = 'hubcard';
    el.style.pointerEvents = 'none';
    const panel = document.createElement('div');
    panel.className = 'tf-panel tf-card-hub';
    panel.innerHTML = `<div class="tf-h1">Teeter Fit</div>
      <div class="tf-sub">Stay the steadiest across three classes. Stand on your mat.</div>
      <div class="tf-mats" data-ui="players"></div>
      <div class="tf-sub">Lean: stick or WASD. Feet: L2 R2 or Q E. Breathe: both, or Space.</div>
      <div class="tf-prompts" style="justify-content:flex-start">
        <div class="tf-row" data-card="ready" data-ui="item">Ready <span class="tf-glyph" data-kind="key">Enter</span></div>
        <div class="tf-row" data-card="more" data-ui="item">More time <span class="tf-glyph" data-kind="key">T</span></div>
        <span data-ui="left" style="font-size:var(--t-menu);font-weight:800"></span>
      </div>`;
    el.append(panel);
    parent.append(el);
    this.el = el;
    this.players = panel.querySelector('[data-ui=players]')!;
    this.left = panel.querySelector('[data-ui=left]')!;
    this.readyBtn = panel.querySelector('[data-card=ready]')!;
    this.moreBtn = panel.querySelector('[data-card=more]')!;
    this.readyBtn.addEventListener('click', () => session.answer('ready'));
    this.moreBtn.addEventListener('click', () => session.answer('more'));
    for (const player of session.info.players) {
      const mat = document.createElement('div');
      mat.className = 'tf-mat';
      mat.dataset.on = 'true';
      mat.dataset.player = String(player.id);
      mat.style.background = player.color;
      mat.textContent = player.name; // names come from the hub, and are never HTML
      this.players.append(mat);
    }
  }

  /** One frame: the card's state, and the pad's answers. */
  update(): void {
    const card = this.session.card;
    if (card) {
      for (const mat of this.players.children) {
        const id = Number((mat as HTMLElement).dataset.player);
        (mat as HTMLElement).style.opacity = card.ready.includes(id) ? '1' : '0.65';
        (mat as HTMLElement).style.outline = card.ready.includes(id) ? '0.5vh solid #3a4a55' : 'none';
      }
      this.left.textContent = card.starting
        ? 'Starting'
        : card.paused
          ? 'Waiting'
          : card.left !== null
            ? `${Math.ceil(card.left / 1000)} s`
            : '';
      this.readyBtn.dataset.focus = this.session.answered ? 'true' : 'false';
    }
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad) continue;
      const [ready, more] = [Boolean(pad.buttons[0]?.pressed), Boolean(pad.buttons[3]?.pressed)];
      if (ready && !this.padDown.ready) this.session.answer('ready');
      if (more && !this.padDown.more) this.session.answer('more');
      this.padDown = { ready, more };
    }
  }

  /** Takes it down. */
  remove(): void {
    this.el.remove();
  }
}

/**
 * Shows the card at once, over whatever is drawn or still warming, on a loop of its own: the watchdog may call `ready()`
 * long before the engine draws its first frame. It goes when the round starts.
 */
export function showHubCard(session: Session): void {
  const root = document.createElement('div');
  root.className = 'tf-root';
  root.style.position = 'fixed';
  root.style.zIndex = '5';
  document.body.append(root);
  const card = new HubCard(root, session);
  document.getElementById('msg')?.setAttribute('hidden', '');
  const tick = () => {
    if (session.started) {
      card.remove();
      root.remove();
      return;
    }
    card.update();
    requestAnimationFrame(tick);
  };
  tick();
}
