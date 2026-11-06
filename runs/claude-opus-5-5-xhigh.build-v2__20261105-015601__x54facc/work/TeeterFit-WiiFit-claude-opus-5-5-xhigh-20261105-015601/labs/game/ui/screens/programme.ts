/**
 * @file Today's Programme: up to four cards with stamps, each with Go; and the Noticeboard: a three by two page of activity
 * cards with best rank, L1 and R1 or Q and E paging. Going fades to the station: a player on a sofa never has to cross the
 * island. Evening and Results live in results.ts.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new ProgrammeScreen(host));
 */
import type { Input } from '../../../../engine';
import { BOARD, dayOf, todaysNext } from '../../scenes/data/days';
import { rankOf } from '../../scenes/scoring';
import { promptHtml } from '../glyphs';
import { getLine } from '../lines/index';
import { CardGrid, layer, type AppHost, type Card, type Screen } from './types';

/** An activity's name on a card. */
export const TITLES: Readonly<Record<string, string>> = {
  morning: 'Morning Check',
  poseA: 'Pose Class A',
  poseB: 'Pose Class B',
  poseC: 'Pose Class C',
  pond: 'Still Pond',
  reps: 'Reps Hall',
  garden: 'Sand Garden',
  paddle: 'Paddle Glide',
  line: 'The Line',
  step: 'Step Class',
  hoop: 'Hoop Patrol',
  plunge: 'Cliff Plunge',
  jog: 'Island Jog',
  group: 'Group Class',
  tilt: 'The Great Tilt',
  noticeboard: 'Find the Noticeboard',
};

/** Cards per page on the Noticeboard. */
const PER_PAGE = 6;

/** Today's Programme. */
export class ProgrammeScreen implements Screen {
  readonly name = 'programme';
  readonly modal = true;
  private el: HTMLElement;
  private grid: CardGrid;
  private foot: HTMLElement;
  private key = '';

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    const panel = document.createElement('div');
    panel.className = 'tf-panel';
    panel.dataset.panel = 'programme';
    const flow = host.flow();
    const day = flow?.day ?? 1;
    const def = dayOf(day);
    const h = document.createElement('div');
    h.className = 'tf-h1';
    h.textContent = day > 5 ? 'After' : `Day ${day}: ${def.title}`;
    panel.append(h);
    this.el.append(panel);
    const done = flow?.done ?? [];
    const next = flow ? todaysNext(flow) : null;
    const cards: Card[] = def.items.map((id) => ({
      id,
      title: TITLES[id] ?? id,
      sub: done.includes(id) ? 'Done' : id === next ? 'Next' : 'Today',
      stamp: done.includes(id) ? ((flow?.pebbles ?? 0) >= 40 ? 'Unsettling' : 'Done') : undefined,
    }));
    if (next === null || day > 5) cards.push({ id: 'sleep', title: 'Sleep', sub: 'Your hut will know' });
    if (day > 5 || (flow?.seen.length ?? 0) > 2)
      cards.push({ id: 'board', title: 'The Noticeboard', sub: 'Everything so far' });
    this.grid = new CardGrid(
      panel,
      cards,
      cards.length > 4 ? 3 : 2,
      (id) => this.pick(id),
      (c) => host.cue(c),
    );
    this.grid.focus(next ?? 'sleep');
    this.foot = document.createElement('div');
    this.foot.className = 'tf-prompts';
    this.foot.style.marginTop = '2vh';
    this.foot.style.justifyContent = 'flex-start';
    panel.append(this.foot);
  }

  private pick(id: string): void {
    const { host } = this;
    host.close(this);
    if (id === 'sleep') host.act('game.sleep');
    else if (id === 'board') host.open(new BoardScreen(host, false));
    else if (id === 'noticeboard') {
      host.act('game.go', { station: 'plaza' });
      host.open(new BoardScreen(host, false));
    } else host.act('game.start', { event: id });
  }

  update(input: Input, dt: number): void {
    this.grid.update(input, dt);
    if (input.pressed('uiCancel') || input.pressed('plan')) this.host.close(this);
    const key = `${this.host.device()}|${this.host.glyphs()}`;
    if (key !== this.key) {
      this.key = key;
      const [d, g] = [this.host.device(), this.host.glyphs()];
      this.foot.innerHTML = `${promptHtml('confirm', 'Go', d, g)}${promptHtml('cancel', 'Back', d, g)}`;
    }
  }

  remove(): void {
    this.el.remove();
  }
}

/** The Noticeboard. From the title it is Free Play. */
export class BoardScreen implements Screen {
  readonly name = 'board';
  readonly modal = true;
  private el: HTMLElement;
  private grid: CardGrid;
  private page = 0;
  private heading: HTMLElement;
  private foot: HTMLElement;
  private key = '';
  private notice: HTMLElement;
  private pebbles: number;

  private host: AppHost;
  private free: boolean;

  constructor(host: AppHost, free: boolean) {
    this.host = host;
    this.free = free;
    this.el = layer(host.root);
    const panel = document.createElement('div');
    panel.className = 'tf-panel';
    panel.dataset.panel = 'board';
    this.heading = document.createElement('div');
    this.heading.className = 'tf-h1';
    this.notice = document.createElement('div');
    this.notice.className = 'tf-sub';
    panel.append(this.heading, this.notice);
    this.el.append(panel);
    this.pebbles = host.flow()?.pebbles ?? host.save.pebbles;
    this.grid = new CardGrid(
      panel,
      this.cards(),
      3,
      (id) => this.pick(id),
      (c) => host.cue(c),
    );
    this.foot = document.createElement('div');
    this.foot.className = 'tf-prompts';
    this.foot.style.marginTop = '2vh';
    this.foot.style.justifyContent = 'flex-start';
    panel.append(this.foot);
    this.draw();
    const flow = host.flow();
    if (flow && !this.free) {
      if (!flow.done.includes('noticeboard') && dayOf(flow.day).items.includes('noticeboard'))
        host.act('game.markDone', { id: 'noticeboard' });
    }
  }

  private cards(): Card[] {
    const seen = this.host.flow()?.seen ?? this.host.save.seen;
    const bests = this.host.flow()?.bests ?? this.host.save.bests;
    const start = this.page * PER_PAGE;
    return BOARD.slice(start, start + PER_PAGE).map((id) => {
      const met = seen.includes(id) || id === 'morning';
      const best = bests[id];
      return {
        id,
        title: met ? (TITLES[id] ?? id) : 'Not yet',
        sub: best !== undefined ? `${rankOf(best)} ${best}` : met ? 'Not yet scored' : 'Nobody is teaching this yet',
        disabled: !met,
      };
    });
  }

  private draw(): void {
    const pages = Math.ceil(BOARD.length / PER_PAGE);
    const day = this.host.flow()?.day ?? this.host.save.day;
    this.heading.textContent = this.free
      ? `Free Play ${this.page + 1} of ${pages}`
      : `Noticeboard ${this.page + 1} of ${pages}`;
    const unlocks =
      this.pebbles >= 40
        ? 'unlock.stamps'
        : this.pebbles >= 30
          ? 'unlock.headband'
          : this.pebbles >= 20
            ? 'unlock.color'
            : this.pebbles >= 10
              ? 'unlock.expert'
              : '';
    const line = unlocks && this.page === 1 ? getLine(unlocks)?.text : getLine(`notice.${Math.min(6, day)}`)?.text;
    this.notice.textContent = line ?? '';
    this.grid.setCards(this.cards());
  }

  private pick(id: string): void {
    const { host } = this;
    host.close(this);
    if (this.free) {
      host.freePlay = true;
      host.beginPlay();
    }
    host.act('game.start', { event: id });
  }

  update(input: Input, dt: number): void {
    this.grid.update(input, dt);
    const pages = Math.ceil(BOARD.length / PER_PAGE);
    if (input.pressed('pageR')) {
      this.page = (this.page + 1) % pages;
      this.host.cue('move');
      this.draw();
    } else if (input.pressed('pageL')) {
      this.page = (this.page - 1 + pages) % pages;
      this.host.cue('move');
      this.draw();
    } else if (input.pressed('uiCancel')) this.host.close(this);
    const key = `${this.host.device()}|${this.host.glyphs()}`;
    if (key !== this.key) {
      this.key = key;
      const [d, g] = [this.host.device(), this.host.glyphs()];
      this.foot.innerHTML = `${promptHtml('confirm', 'Go', d, g)}${promptHtml('pageL', 'Page', d, g)}${promptHtml('pageR', 'Page', d, g)}${promptHtml('cancel', 'Back', d, g)}`;
    }
  }

  remove(): void {
    this.el.remove();
  }
}
