/**
 * @file Results: one word, one number, one sentence, one small graph; pebbles falling onto a little cairn. The Morning Check
 * gets a big dial that spins past 100, "recalibrating", overshoots and settles. Evening: a calendar stamp, the age graph, a
 * closing remark, Sleep. Credits: every guest holding a pose as the camera drifts past.
 *
 * Game code, a page's.
 *
 * @example
 * // host.open(new ResultsScreen(host));
 */
import type { Input } from '../../../../engine';
import { getLine } from '../lines/index';
import { CREDITS } from '../about-data';
import { Panel, type Row } from '../panel';
import { layer, type AppHost, type Screen } from './types';
import { BoardScreen, TITLES } from './programme';

/** A small line graph of ages, as SVG. Oldest first; lower is better. */
function ageGraph(ages: readonly number[]): string {
  const list = ages.slice(-7);
  if (list.length === 0) return '';
  const [w, h] = [320, 100];
  const x = (i: number) => (list.length === 1 ? w / 2 : 18 + (i * (w - 36)) / (list.length - 1));
  const y = (age: number) => 12 + ((age - 18) / 64) * (h - 24);
  const line = list.map((age, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(age).toFixed(1)}`).join(' ');
  const dots = list
    .map((age, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(age).toFixed(1)}" r="6" fill="#ff8a70"/>`)
    .join('');
  return `<svg class="tf-graph" data-ui="graph" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" rx="18" fill="#f6efe0"/><path d="${line}" stroke="#3a4a55" stroke-width="3.5" fill="none"/>${dots}</svg>`;
}

/** The age remark. */
export function ageRemark(age: number, before: number | undefined): string {
  if (before === undefined) return (getLine('age.first', age)?.text ?? '').replaceAll('{age}', String(age));
  const diff = Math.abs(before - age);
  const id = age < before ? 'age.younger' : age > before ? 'age.older' : 'age.same';
  return (getLine(id, age)?.text ?? '')
    .replaceAll('{age}', String(age))
    .replaceAll('{before}', String(before))
    .replaceAll('{diff}', String(diff));
}

/** Results. */
export class ResultsScreen implements Screen {
  readonly name = 'results';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;
  private t = 0;
  private needle: HTMLElement | null = null;
  private dialValue: HTMLElement | null = null;
  private note: HTMLElement | null = null;
  private age: number | undefined;

  private host: AppHost;

  constructor(host: AppHost) {
    this.host = host;
    this.el = layer(host.root);
    const last = host.flow()?.last ?? {};
    const box = document.createElement('div');
    box.className = 'tf-panel';
    box.dataset.panel = 'results';
    box.style.cssText = 'display:flex;gap:5vh;align-items:center';
    const left = document.createElement('div');
    left.style.cssText = 'text-align:center;display:flex;flex-direction:column;gap:1.4vh;align-items:center';
    const title = document.createElement('div');
    title.className = 'tf-sub';
    title.textContent = TITLES[last.event ?? ''] ?? last.event ?? '';
    left.append(title);
    this.age = last.age;
    if (last.age !== undefined) {
      const dial = document.createElement('div');
      dial.className = 'tf-dial';
      dial.innerHTML =
        '<div class="note">Recalibrating</div><div class="needle"></div><div class="value" data-ui="age">--</div>';
      left.append(dial);
      this.needle = dial.querySelector('.needle');
      this.dialValue = dial.querySelector('.value');
      this.note = dial.querySelector('.note');
      host.sound.play('sfx:dialSpin');
    } else {
      const rank = document.createElement('div');
      rank.className = 'tf-rank';
      rank.dataset.ui = 'rank';
      rank.textContent = last.rank ?? '';
      const score = document.createElement('div');
      score.className = 'tf-score';
      score.dataset.ui = 'score';
      score.textContent = String(last.score ?? 0);
      left.append(rank, score);
    }
    const right = document.createElement('div');
    right.style.cssText = 'display:flex;flex-direction:column;gap:2vh;align-items:center';
    if (last.age !== undefined) {
      const remark = document.createElement('div');
      remark.style.cssText = 'max-width:66vh;font-size:3vh;font-weight:600';
      remark.dataset.ui = 'remark';
      remark.textContent = ageRemark(last.age, last.ageBefore);
      right.append(remark);
      const ages = host.flow()?.ages ?? [];
      const g = document.createElement('div');
      g.innerHTML = ageGraph(ages);
      right.append(g);
    }
    const cairn = document.createElement('div');
    cairn.className = 'tf-pebbles';
    cairn.dataset.ui = 'pebbles';
    const count = last.pebbles ?? 0;
    for (let i = 0; i < count; i++) {
      const stone = document.createElement('div');
      stone.className = 'tf-pebble';
      stone.style.left = `${6 + (i % 3) * 7}vh`;
      stone.style.bottom = `${Math.floor(i / 3) * 2.6}vh`;
      stone.style.animationDelay = `${0.4 + i * 0.28}s`;
      cairn.append(stone);
      setTimeout(() => host.sound.play('sfx:clack'), 800 + i * 280);
    }
    right.append(cairn);
    const rows: Row[] = [
      { id: 'carry', label: 'Carry on' },
      { id: 'again', label: 'Again', disabled: last.event === 'tilt' || last.event === 'morning' },
    ];
    this.panel = new Panel(right, {
      id: 'results-menu',
      rows,
      sound: (cue) => host.cue(cue),
      onPick: (id) => this.pick(id),
    });
    this.panel.el.style.boxShadow = 'none';
    this.panel.el.style.background = 'transparent';
    this.panel.el.style.padding = '0';
    box.append(left, right);
    this.el.append(box);
    host.sound.play('sfx:stamp');
    host.sound.audio.stinger('song:stamp');
  }

  private pick(id: string): void {
    const { host } = this;
    host.close(this);
    if (id === 'again') host.act('game.again');
    else {
      host.act('game.leave');
      if (host.freePlay && host.flow()?.mode === 'roam') host.open(new BoardScreen(host, false));
    }
  }

  update(input: Input, dt: number): void {
    this.t += dt;
    // A press meant for the activity should not skip the results.
    if (this.t > 0.7) this.panel.update(input, dt);
    if (this.needle && this.age !== undefined) {
      const settle = 2.6;
      const u = Math.min(1, this.t / settle);
      // It spins past 100, overshoots and settles.
      const shown = u < 1 ? this.age + (1 - u) * (130 - this.age) * Math.cos(u * 11) * (1 - u) : this.age;
      this.needle.style.transform = `rotate(${(-140 + ((shown - 18) / 64) * 280).toFixed(1)}deg)`;
      if (this.dialValue)
        this.dialValue.textContent = u < 1 ? String(Math.round(Math.max(0, shown))) : String(this.age);
      if (this.note) this.note.textContent = u < 1 ? 'Recalibrating' : 'Wobble Age';
    }
  }

  remove(): void {
    this.el.remove();
  }
}

/** Evening. */
export class EveningScreen implements Screen {
  readonly name = 'evening';
  readonly modal = true;
  private el: HTMLElement;
  private panel: Panel;

  private host: AppHost;

  constructor(host: AppHost, finished: number, onDone: () => void) {
    this.host = host;
    this.el = layer(host.root);
    const flow = host.flow();
    const remark = getLine(`evening.${Math.min(6, finished)}`, finished)?.text ?? '';
    this.panel = new Panel(this.el, {
      id: 'evening',
      title: finished > 5 ? 'Another evening' : `Day ${finished} is stamped`,
      sub: remark,
      rows: [{ id: 'sleep', label: 'Sleep' }],
      sound: (cue) => host.cue(cue),
      onPick: () => {
        host.close(this);
        onDone();
      },
    });
    const graph = document.createElement('div');
    graph.innerHTML = ageGraph(flow?.ages ?? []);
    graph.style.margin = '2vh 0';
    const stamp = document.createElement('div');
    stamp.className = 'tf-stamp';
    stamp.dataset.ui = 'stamp';
    stamp.textContent = (flow?.pebbles ?? 0) >= 40 ? 'Unsettling' : `Day ${finished}`;
    this.panel.el.style.position = 'relative';
    this.panel.el.append(stamp);
    this.panel.el.insertBefore(graph, this.panel.el.querySelector('.tf-rows'));
    host.sound.play('sfx:stamp');
  }

  update(input: Input, dt: number): void {
    this.panel.update(input, dt);
  }

  remove(): void {
    this.el.remove();
  }
}

/** The credits: the camera drifts past the guests; you may stay as long as you like. */
export class CreditsScreen implements Screen {
  readonly name = 'credits';
  readonly modal = true;
  private el: HTMLElement;
  private t = 0;
  private body: HTMLElement;
  private i = 0;
  private list: string[];

  private host: AppHost;
  private onDone: () => void;

  constructor(host: AppHost, onDone: () => void) {
    this.host = host;
    this.onDone = onDone;
    this.el = document.createElement('div');
    this.el.className = 'tf-layer';
    this.el.dataset.ui = 'credits';
    this.el.style.alignItems = 'flex-end';
    host.root.append(this.el);
    const box = document.createElement('div');
    box.className = 'tf-panel';
    this.body = document.createElement('div');
    this.body.style.cssText = 'font-size:3.2vh;font-weight:650;max-width:120vh;text-align:center';
    box.append(this.body);
    this.el.append(box);
    this.list = ['Thank you for standing.', ...CREDITS, 'You may stay as long as you like. The ferry does not return.'];
    this.body.textContent = this.list[0];
  }

  update(input: Input, dt: number): void {
    this.t += dt;
    const each = 4;
    const at = Math.floor(this.t / each);
    if (at !== this.i && at < this.list.length) {
      this.i = at;
      this.body.textContent = this.list[at];
    }
    if (at >= this.list.length || input.pressed('uiAccept') || input.pressed('uiCancel')) {
      this.host.close(this);
      this.onDone();
    }
  }

  remove(): void {
    this.el.remove();
  }
}
