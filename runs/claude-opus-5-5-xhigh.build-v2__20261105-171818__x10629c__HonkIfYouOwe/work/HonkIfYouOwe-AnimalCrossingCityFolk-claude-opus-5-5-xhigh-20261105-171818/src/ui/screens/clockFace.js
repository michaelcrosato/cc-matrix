import { formatTime } from '../../core/calendar.js';
export function flavourOfClock(g) {
  const t = formatTime(g.world.clock.minute);
  return `It says ${t}. You've no reason to doubt it. Mrs. Gander had it set.`;
}
