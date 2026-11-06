/**
 * @file Each activity's small widget: the reps gauge, Step Class's lanes, the spin bar, the Composure number, a dive's score
 * cards and so on. One small idea each, all read from the `show` an activity writes. Still Pond's lures live here too:
 * a fake interface in the real one's clothes.
 *
 * Game code, a page's.
 *
 * @example
 * // renderWidgets(hud, 'step', view);
 */
import type { Verb } from '../glyphs';
import type { HudView } from './hud';

/** What widgets need of the HUD. */
export interface WidgetHost {
  readonly widgets: HTMLElement;
  glyph(verb: Verb): string;
}

/** Keeps a keyed block of HTML up to date without touching it each frame. */
function setHtml(el: HTMLElement, html: string): void {
  if (el.dataset.html !== html) {
    el.dataset.html = html;
    el.innerHTML = html;
  }
}

/** The widget each frame: the HTML it wants, as a string, kept stable when nothing changes. */
export function renderWidgets(host: WidgetHost, id: string, view: HudView): void {
  const show = (view.hud?.show ?? {}) as Record<string, unknown>;
  const html = widgetHtml(host, id, show, view);
  setHtml(host.widgets, html);
}

/** A chip at a corner. */
const chip = (where: string, html: string): string => `<div class="tf-chip" style="${where}">${html}</div>`;

/** The lures, by id (PLAN.md section 6). */
function lureHtml(host: WidgetHost, id: string): string {
  const press = (verb: Verb, word: string) => `<span>${word}</span>${host.glyph(verb)}`;
  switch (id) {
    case 'press':
      return `<div class="tf-lure" data-lure="press">PRESS NOW ${host.glyph('confirm')}</div>`;
    case 'psst':
      return `<div class="tf-lure" data-lure="psst">${press('confirm', 'Psst. Is this on? Press for yes:')}</div>`;
    case 'stone':
      return `<div class="tf-lure" data-lure="stone">Bzzt. Bzzt. Bex's stone is buzzing.</div>`;
    case 'pause':
      return `<div class="tf-lure" data-lure="pause" style="flex-direction:column"><b>Paused</b><div class="tf-row" data-focus="true" style="min-width:36vh;justify-content:center">Resume ${host.glyph('confirm')}</div></div>`;
    case 'disconnected':
      return `<div class="tf-lure" data-lure="disconnected">Your controller appears to be disconnected. Press any button.</div>`;
    case 'wrong':
      return `<div class="tf-lure" data-lure="wrong" style="font-size:3vh;font-weight:500">You are doing it wrong.</div>`;
    case 'credits':
      return `<div class="tf-lure" data-lure="credits" style="flex-direction:column"><b>Thanks for playing!</b><span>${press('confirm', 'Press to continue')}</span></div>`;
    default:
      return '';
  }
}

/** The HTML for a widget. */
function widgetHtml(host: WidgetHost, id: string, show: Record<string, unknown>, view: HudView): string {
  const n = (key: string) => Number(show[key] ?? 0);
  switch (id) {
    case 'morning':
      if (show.question)
        return `<div class="tf-chip" style="left:50%;bottom:40vh;transform:translateX(-50%);display:flex;gap:3vh"><span>${host.glyph('footL')} Yes</span><span>${host.glyph('footR')} No</span></div>`;
      if (show.foot)
        return `<div class="tf-chip" style="left:50%;bottom:39vh;transform:translateX(-50%)">Hold ${host.glyph(show.foot === 'L' ? 'footL' : 'footR')} ${show.foot === 'L' ? 'left' : 'right'}</div>`;
      return '';
    case 'pond':
      return (
        chip(
          'right:var(--safe);bottom:var(--safe)',
          `<small>Composure</small><span data-ui="composure" style="font-size:7vh">${Math.round(n('composure'))}</span>`,
        ) + lureHtml(host, String(show.lure ?? ''))
      );
    case 'reps': {
      const band = n('band');
      const marker = n('marker');
      const label = `${n('rep')} of ${n('of')}`;
      return (
        `<div class="tf-gauge" data-ui="repgauge"><div class="band" style="bottom:${Math.round((band * 0.8 - 0.02) * 100)}%"></div><div class="mark" style="bottom:${Math.round(marker * 88)}%"></div></div>` +
        chip('right:var(--safe);top:18vh', `<small>Reps</small><span data-ui="repcount">${label}</span>`) +
        (show.feet
          ? chip('left:50%;top:18vh;transform:translateX(-50%)', `Hold ${host.glyph('both')} palms on the floor`)
          : '')
      );
    }
    case 'step': {
      const notes = (show.notes ?? []) as [number, string, number][];
      const notesHtml = notes
        .map(([d, kind, hit]) => {
          const x = kind === 'L' || kind === '<' ? 30 : kind === 'R' || kind === '>' ? 70 : 50;
          const y = 5.2 + d * 0.24;
          const label = kind === '<' ? '←L' : kind === '>' ? 'R→' : kind === 'B' ? 'BOTH' : kind;
          return `<div class="tf-note" data-kind="${kind}" data-hit="${hit}" style="left:${x}%;bottom:${y}vh">${label}</div>`;
        })
        .join('');
      const grade = String(show.grade ?? '');
      const combo = n('combo');
      return (
        `<div class="tf-lane" data-ui="lane"><div class="line"></div>${notesHtml}</div>` +
        chip('left:var(--safe);top:20vh', `<small>Combo</small>${combo}`) +
        (grade
          ? `<div class="tf-big" style="top:18%;font-size:8vh">${grade === 'perfect' ? 'Perfect' : 'Good'}</div>`
          : '') +
        chip('right:var(--safe);top:18vh', `<small>Class in time</small>${n('followers')} of 3`)
      );
    }
    case 'line': {
      const gust = n('gust');
      return (
        (gust
          ? chip(
              'left:50%;top:22vh;transform:translateX(-50%)',
              `Gust ${gust > 0 ? '→' : '←'} lean ${gust > 0 ? 'left' : 'right'}`,
            )
          : '') +
        (show.gull
          ? chip('left:50%;top:32vh;transform:translateX(-50%)', 'A gull. Flick the stick to tell it no.')
          : '') +
        chip('right:var(--safe);top:18vh', `<small>Falls</small>${n('falls')}`)
      );
    }
    case 'paddle': {
      const err = n('err');
      const turn = Math.round((err * 180) / Math.PI);
      return (
        `<div class="tf-chip" style="left:50%;top:18vh;transform:translateX(-50%);font-size:6vh;line-height:1"><span style="display:inline-block;transform:rotate(${-turn}deg)">▲</span></div>` +
        chip('right:var(--safe);top:18vh', `<small>Left</small>${n('seconds')} s`)
      );
    }
    case 'garden':
      return (
        chip('right:var(--safe);top:18vh', `<small>In their holes</small>${n('sunk')} of ${n('total')}`) +
        chip('right:var(--safe);top:32vh', `<small>Left</small>${n('seconds')} s`)
      );
    case 'plunge':
      if (show.cards) {
        const cards = show.cards as number[];
        return `<div class="tf-chip" data-ui="cards" style="left:50%;top:30%;transform:translate(-50%,-50%);display:flex;gap:4vh;font-size:11vh;font-weight:900">${cards.map((c) => `<span>${c}</span>`).join('')}</div>`;
      }
      if (show.gauge !== undefined)
        return `<div class="tf-gauge"><div class="band" style="bottom:76%"></div><div class="mark" style="bottom:${Math.round(n('gauge') * 88)}%"></div></div>`;
      if (show.air)
        return chip(
          'left:50%;top:24vh;transform:translateX(-50%)',
          `${host.glyph('lean')} up and down spins, sideways twists. Enter head first.`,
        );
      return '';
    case 'hoop': {
      const lo = n('lo');
      const hi = n('hi');
      const spin = Math.min(14, n('spin'));
      const side = n('side');
      const phase = String(show.phase ?? '');
      const warn =
        phase === 'warn' || phase === 'catch'
          ? `<div class="tf-big" style="left:${side > 0 ? 80 : 20}%;font-size:12vh">${side > 0 ? '→' : '←'}</div>`
          : '';
      return (
        `<div class="tf-spin" data-ui="spin"><div class="band" style="left:${(lo / 14) * 100}%;width:${((hi - lo) / 14) * 100}%"></div><div class="mark" style="left:${(spin / 14) * 100}%"></div></div>` +
        chip('right:var(--safe);top:18vh', `<small>Hoops up</small>${n('hoops')}`) +
        warn
      );
    }
    case 'podium': {
      const totals = (show.totals ?? []) as number[];
      const win = n('win');
      const names = (show.names ?? []) as string[];
      return `<div class="tf-panel" data-ui="podium" style="position:absolute;left:50%;top:22%;transform:translateX(-50%);text-align:center"><div class="tf-h1">Least Wobbly</div><div class="tf-rank" style="font-size:7vh">${names[win] ?? ''}</div><div class="tf-sub">${totals
        .map((v, i) => (names[i] ? `${names[i]}: ${v}` : ''))
        .filter(Boolean)
        .join(' · ')}</div></div>`;
    }
    case 'jog':
      return (
        chip(
          'left:50%;bottom:var(--safe);transform:translateX(-50%)',
          `${show.inRibbon ? 'In the Pace Ribbon' : 'Catch Gerald'}: ${Math.round(n('gap'))} m`,
        ) + chip('right:var(--safe);top:18vh', `<small>Flags</small>${n('flags')} of ${n('of')}`)
      );
    case 'tilt':
      if (view.phase === 'east')
        return (
          chip('left:var(--safe);top:22vh', `<small>Guests east</small>${n('delivered')} of 12`) +
          chip('right:var(--safe);top:18vh', `<small>Out of true</small>${n('tiltDeg').toFixed(1)}°`) +
          chip(
            'left:50%;bottom:calc(var(--safe) + 13vh);transform:translateX(-50%)',
            `<small>Calm Call</small><div class="tf-meter"><i style="width:${Math.round(n('charge') * 100)}%"></i></div>`,
          )
        );
      if (view.phase === 'weights')
        return (
          chip('right:var(--safe);top:18vh', `<small>Out of true</small>${n('tiltDeg').toFixed(1)}°`) +
          chip('left:var(--safe);top:22vh', `<small>Crank</small>${host.glyph('footL')} ${host.glyph('footR')}`)
        );
      if (view.phase === 'stone')
        return chip('right:var(--safe);top:18vh', `<small>Out of true</small>${n('tiltDeg').toFixed(1)}°`);
      return '';
    default:
      return '';
  }
}
