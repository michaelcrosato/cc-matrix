/**
 * @file The HUD in play: the Balance Disc when an activity uses balance, the line at the top, each activity's own gauge, lane,
 * cards or lures, and the prompts for the device used last. Built from what the sim holds; it never writes the sim.
 */
import type { EvState, Flow, Wobble, Seat } from '../../scenes/types';
import { guideOf } from '../../scenes/wobble';
import { POSES } from '../../scenes/data/poses';
import { EXERCISES } from '../../scenes/events/reps';
import { LINE_LENGTH } from '../../scenes/events/line';
import { TRAYS } from '../../scenes/data/trays';
import { DIVES } from '../../scenes/events/plunge';
import { ACTIVITY_PROMPTS, ACTIVITY_TITLES } from '../titles';
import { prompt, promptBar } from '../glyphs';
import { createDisc, type DiscData } from './disc';
import { drawLure } from './lures';

export interface Hud {
  update(
    flow: Flow,
    seat: { seat: Seat; wobble: Wobble } | null,
    tick: number,
    period: number,
    pose: number,
    ringSize: number,
  ): void;
  root: HTMLElement;
}

const USES_DISC = new Set([
  'check',
  'poseA',
  'poseB',
  'poseC',
  'ring',
  'heron',
  'reps',
  'line',
  'plunge',
  'pond',
  'pondS',
  'paddle',
  'step',
  'stepS',
  'tilt',
]);

export function createHud(parent: HTMLElement): Hud {
  const root = document.createElement('div');
  root.dataset.ui = 'hud-root';
  parent.append(root);
  const disc = createDisc(root);
  const top = document.createElement('div');
  top.className = 'wt-top';
  top.dataset.ui = 'hud-top';
  const bar = document.createElement('div');
  const gauge = document.createElement('div');
  gauge.className = 'wt-gauge';
  gauge.innerHTML = '<div class="band"></div><div class="mark"></div>';
  const lane = document.createElement('div');
  lane.className = 'wt-lane';
  lane.innerHTML = '<div class="line"></div>';
  const cards = document.createElement('div');
  cards.className = 'wt-cards';
  const lure = document.createElement('div');
  lure.className = 'wt-lure';
  root.append(top, bar, gauge, lane, cards, lure);
  let promptsFor = '';
  const noteNodes: HTMLElement[] = [];

  /** The rings the disc shows and the line at the top. */
  function rings(ev: EvState, data: DiscData, ringSize: number, seatIndex: number): string {
    const d = ev.d as Record<string, unknown>;
    const title = ACTIVITY_TITLES[ev.id] ?? ev.id;
    switch (ev.id) {
      case 'check': {
        const target = (d.targets as number[][])[d.at as number];
        if (ev.phase === 'ask') return 'Left foot: yes · Right foot: no';
        if (ev.phase === 'reach' && target) data.rings = [{ x: target[0], y: target[1], r: 0.16, color: '#ff8a70' }];
        else if (ev.phase === 'foot') data.rings = [{ x: 0, y: 0, r: 0.3 }];
        else data.rings = [{ x: 0, y: 0, r: ev.t > 480 ? 0.16 : 0.22 }];
        if (ev.phase === 'foot') return (d.foot as string) === 'l' ? 'Hold your left foot' : 'Hold your right foot';
        return ev.phase === 'reach' ? `Reach ${d.at as number} of 6` : 'Stay in the ring';
      }
      case 'poseA':
      case 'poseB':
      case 'poseC':
      case 'heron': {
        const list = d.list as string[];
        const pose = POSES[list[d.at as number]];
        if (!pose) return title;
        const seat = pose.seats[Math.min(d.seatAt as number, pose.seats.length - 1)];
        data.rings = [{ x: seat[0], y: seat[1], r: ringSize * pose.ring }];
        data.breath = pose.breath > 0;
        if (ev.phase === 'enter') {
          const k = ev.s[seatIndex]?.prog ?? 0;
          data.rings.push({ x: seat[0] * k, y: seat[1] * k, r: 0.18, color: '#ff8a70' });
          return `${pose.title}: follow the dot`;
        }
        return pose.hold === 'both'
          ? `${pose.title}: hold both feet`
          : pose.hold === 'l'
            ? `${pose.title}: hold your left foot`
            : pose.title;
      }
      case 'ring':
        data.rings = [{ x: 0, y: 0, r: (d.ring as number) ?? 0.22 }];
        return ev.phase === 'lead' ? 'Get ready' : title;
      case 'pond':
      case 'pondS':
        data.breath = true;
        return `Composure ${Math.round(ev.s[seatIndex]?.composure ?? 1000)}`;
      case 'reps': {
        const ex = EXERCISES[d.ex as number];
        if (!ex) return title;
        const shown = (d.fake as number)
          ? `${(d.rep as number) + 1} of ${ex.count + 1}`
          : `${d.rep as number} of ${ex.count}`;
        return `Rep ${shown}`;
      }
      case 'line':
        return `${Math.round(d.at as number)} of ${LINE_LENGTH} m · Falls ${d.falls as number}${(d.gustIn as number) > 0 && (d.gustIn as number) <= 90 ? ' · Gust coming' : ''}`;
      case 'paddle':
        return `Gate ${d.at as number} of 12`;
      case 'garden':
        return `Tray ${Math.min((d.tray as number) + 1, TRAYS.length)} of ${TRAYS.length}`;
      case 'plunge': {
        data.rings = [{ x: 0, y: 0, r: 0.3 }];
        data.breath = ev.phase === 'compose';
        const dive = `Dive ${(d.dive as number) + 1} of ${DIVES}`;
        return ev.phase === 'go' ? `${dive}: let go at the top` : `${dive}`;
      }
      case 'hoop':
      case 'hoopS': {
        const s = ev.s[seatIndex];
        const warn =
          s?.warn > 0
            ? s.side > 0
              ? ' · Hoop from the right'
              : ' · Hoop from the left'
            : s?.window > 0
              ? ' · Lean!'
              : '';
        return `Hoops ${s?.hoops ?? 0}${warn}`;
      }
      case 'jog':
        return (d.dist as number) <= 8 ? 'In the Pace Ribbon' : `Gerald is ${Math.round(d.dist as number)} m ahead`;
      case 'step':
      case 'stepS':
        return `Combo ${ev.s[seatIndex]?.combo ?? 0}`;
      case 'tilt':
        if (ev.phase === 'east') {
          data.breath = false;
          return `On the terrace: ${d.delivered as number}. Everyone east.`;
        }
        if (ev.phase === 'carts') {
          data.rings = [{ x: 0.3, y: 0, r: 0.45 }];
          return `Crank the carts: ${Math.round((d.cart as number) * 100)}%`;
        }
        if (ev.phase === 'stone') {
          data.rings = [{ x: 0, y: 0, r: d.ring as number }];
          data.breath = true;
          return 'You are the island';
        }
        return title;
      default:
        return title;
    }
  }

  return {
    root,
    update(flow, seat, tick, period, _pose, ringSize) {
      const ev = flow.ev;
      const on = !!(ev && flow.mode === 'event' && seat);
      root.style.display = on ? '' : 'none';
      if (!on || !ev || !seat) return;
      const data: DiscData = {
        x: seat.wobble.x,
        y: seat.wobble.y,
        lungs: seat.wobble.lungs,
        guide: guideOf(tick, period),
        calm: seat.wobble.calm,
        l: seat.seat.input.l,
        r: seat.seat.input.r,
        rings: [],
        breath: false,
      };
      top.textContent = rings(ev, data, ringSize, seat.seat.index);
      const useDisc =
        USES_DISC.has(ev.id) &&
        !(ev.id === 'tilt' && (ev.phase === 'east' || ev.phase === 'storm' || ev.phase === 'dawn'));
      disc.el.style.display =
        useDisc && !(ev.id === 'plunge' && ev.phase === 'air') && !ev.id.startsWith('step') ? '' : 'none';
      if (useDisc) disc.draw(data);
      const key = ev.id;
      if (promptsFor !== key) {
        promptsFor = key;
        bar.innerHTML = '';
        const items = ACTIVITY_PROMPTS[ev.id] ?? [];
        if (!USES_DISC.has(ev.id)) bar.innerHTML = promptBar(items);
        else {
          const div = document.createElement('div');
          div.className = 'wt-prompts';
          div.style.cssText =
            'position:absolute;left:50%;top:13vh;transform:translateX(-50%);background:rgb(251 248 241 / 92%);border-radius:3vh;padding:.7vh 2.4vh;flex-wrap:nowrap';
          div.innerHTML = items.map(([v, l]) => prompt(v, l)).join('');
          bar.append(div);
        }
      }
      // reps' gauge
      gauge.style.display = ev.id === 'reps' && ev.phase === 'rep' ? '' : 'none';
      if (ev.id === 'reps') {
        const d = ev.d as unknown as { band: number; marker: number };
        (gauge.firstChild as HTMLElement).style.bottom = `${Math.round(d.band * 76)}%`;
        (gauge.lastChild as HTMLElement).style.bottom = `${Math.round(Math.min(1, d.marker) * 88 + 6)}%`;
      }
      // step's lane
      lane.style.display = ev.id === 'step' || ev.id === 'stepS' ? '' : 'none';
      if (ev.id === 'step' || ev.id === 'stepS') {
        const d = ev.d as unknown as { notes: { t: number; k: string }[] };
        const s = ev.s[seat.seat.index];
        const shown = d.notes.slice(s?.at ?? 0, (s?.at ?? 0) + 8);
        while (noteNodes.length < shown.length) {
          const n = document.createElement('div');
          n.className = 'wt-note';
          lane.append(n);
          noteNodes.push(n);
        }
        noteNodes.forEach((n, i) => {
          const note = shown[i];
          n.style.display = note ? '' : 'none';
          if (!note) return;
          n.textContent = note.k === 'a' ? '←L' : note.k === 'd' ? 'R→' : note.k === 'B' ? 'B' : note.k;
          n.dataset.k = note.k === 'a' ? 'L' : note.k === 'd' ? 'R' : note.k;
          n.style.left = `${14 + ((note.t - (ev.phase === 'lead' ? -360 + ev.t : ev.t)) / 240) * 86}%`;
          n.style.top = note.k === 'R' || note.k === 'd' ? '70%' : note.k === 'B' ? '50%' : '30%';
        });
      }
      // plunge's gauge and cards
      const dive = ev.id === 'plunge' ? (ev.d as unknown as { cards: number[]; gauge: number }) : null;
      const showCards = dive && ev.phase === 'cards' && dive.cards.length;
      cards.style.display = showCards ? '' : 'none';
      if (showCards && cards.dataset.of !== dive.cards.join()) {
        cards.dataset.of = dive.cards.join();
        cards.innerHTML = dive.cards.map((c) => `<div>${c}</div>`).join('');
      }
      if (dive && ev.phase === 'go') {
        gauge.style.display = '';
        (gauge.firstChild as HTMLElement).style.bottom = '76%';
        (gauge.lastChild as HTMLElement).style.bottom = `${Math.round(dive.gauge * 94)}%`;
      }
      drawLure(lure, ev);
    },
  };
}
