import { h } from '../ui/dom.js';
import { medalFor } from '../data/config.js';
import { line } from '../data/dialogue.js';

/** Inked stamp SVG for a medal. */
export function medalSVG(m) {
  return `<svg viewBox="-110 -110 220 220" width="100%" height="100%"><g transform="rotate(-9)"><circle r="96" fill="${m.colour}" stroke="#1A1420" stroke-width="9"/><circle r="78" fill="none" stroke="#1A1420" stroke-width="3" stroke-dasharray="5 7"/>
  <text y="9" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="${m.name.length > 8 ? 30 : 36}" fill="#1A1420">${m.name.toUpperCase()}</text></g></svg>`;
}

export function resultBand(form) {
  if (form >= 97) return 'results_sus';
  if (form >= 65 && form < 85) return 'results_mid';
  if (form >= 85) return 'results_high';
  if (form >= 40) return 'results_mid';
  return 'results_low';
}

/** Results: ink-stamp medal, one big number, one line of stats, a line of dialogue, retry or continue. */
export function showResults(game, { ev, result, title, tierName, onContinue, onRetry, extra = null, speaker }) {
  const form = result.form;
  const m = medalFor(form);
  const who = speaker || ev.data.instructor;
  const say = line(who, resultBand(form));
  game.speech.clear();
  game.audio.sting(m.id);
  game.audio.sfx('stamp');
  const s = game.ui.only({
    name: 'results', className: 'dim',
    prompts: onRetry ? [['use', 'Continue'], ['ask', 'Try again']] : [['use', 'Continue']],
    alt: onRetry ? () => onRetry() : null,
    build(scr) {
      const box = h('div.results',
        h('div.h2', `${title}${tierName ? ` · ${tierName}` : ''}`),
        h('div.row', { style: 'gap:6rem' },
          h('div.medal', { html: medalSVG(m), 'data-medal': m.id, style: 'animation:pop .25s ease-out' }),
          h('div.col', h('div.bignum', String(result.big ?? Math.round(form))), h('div.tag', { style: 'font-size:3.4rem' }, result.stats || ''))),
        h('div.tag', { style: 'font-size:3.8rem;max-width:130rem;text-align:center' }, say),
        extra);
      scr.el.append(box);
      const cont = scr.item(h('div', 'Continue'), { use: onContinue });
      box.append(cont);
      if (onRetry) {
        const again = scr.item(h('div', 'Try again'), { use: onRetry });
        const row = h('div.row', cont, again);
        box.append(row);
      }
    },
  });
  return s;
}
