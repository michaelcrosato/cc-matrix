/** @file Compose power, release timing and the three gull judges in one readable instrument. */
import type { ActivityRun } from '../scenes/events/types';
export function diveMeter(r: ActivityRun): string {
  const local = r.tick % 1080,
    swing = 0.5 + 0.5 * Math.sin(local / 25);
  const value =
    r.phase === 0
      ? r.hold
      : r.phase === 1
        ? swing
        : 1 - Math.min(1, Math.abs(Math.sin(r.angle)) + Math.abs(Math.sin(r.velocity)));
  const last = r.scores.at(-1),
    card = last === undefined ? 0 : Math.round(Math.max(0, Math.min(10, ((last * 24) / 1000 - 4) / 2)));
  const label = r.phase === 0 ? 'COMPOSE' : r.phase === 1 ? 'RELEASE AT THE TOP' : 'ENTER STRAIGHT';
  const cards =
    last === undefined
      ? ''
      : '<div class="gull-cards">' +
        [card, card, 4]
          .map(
            (score) =>
              '<span><svg viewBox="0 0 64 38" aria-hidden="true"><path d="M4 23Q17 8 30 21Q46 8 60 23M27 23q5-7 10 0l-5 8Z"/></svg><strong>' +
              score +
              '</strong></span>',
          )
          .join('') +
        '</div><p>The third gull has considered a four.</p>';
  return (
    '<div class="dive-meter"><b>' +
    label +
    '</b><div class="dive-track"><div class="dive-band"></div><div class="dive-fill" style="height:' +
    value * 100 +
    '%"></div><div class="dive-needle" style="bottom:' +
    value * 94 +
    '%"></div></div>' +
    cards +
    '</div>'
  );
}
