// Every line in one list, for the dialogue tester and the glyph and fit tests.
import { AGE_LINES, ATTRACT_LINES, BARKS, CLASSMATE_BARKS, CONCERNS, CONFESSION, CONFESSION_AFTER, CREDITS_SIGNOFF, FERRY_LINES, HAMMOCK_LINES, INTRO_LINES, IDLE_BARKS, ISLAND_BARKS, MORNINGS, OW_JOKE, OW_LINES, REPORT_LINES, RESULT_LINES, STATION_REMARKS, WEEK2_LINES, WOBBLE_LINE } from './lines.js';
import { STAND_TIMELINE } from './longstand.js';
import { DAYS } from './week.js';
import { QUESTIONS, AGE_QUESTION } from './questions.js';
import { MILESTONES } from './unlocks.js';
import { ACTIVITIES } from './activities.js';
import { HOLD_LINES } from './poses.js';
import { MEDLEY } from './medley.js';

const strip = (s) => (typeof s === 'string' ? s.replace(/^[a-z]+:\s/, '') : s.text);
const whoOf = (s, fallback = 'ounce') => {
  if (typeof s !== 'string') return s.who ?? fallback;
  const m = /^([a-z]+):\s/.exec(s);
  return m ? m[1] : fallback;
};

export function allLines() {
  const out = [];
  const push = (who, s) => out.push({ who: whoOf(s, who), text: strip(s) });
  for (const set of Object.values(RESULT_LINES)) for (const list of Object.values(set)) for (const s of list) push('ounce', s);
  for (const list of Object.values(BARKS)) for (const s of list) push('ounce', s);
  for (const s of ISLAND_BARKS) push('ounce', s);
  for (const list of Object.values(IDLE_BARKS)) for (const s of list) push('ounce', s);
  for (const list of Object.values(AGE_LINES)) for (const s of list) push('ounce', s.replace('%A', '68').replace('%F', '30'));
  for (const s of MORNINGS) push('ounce', s);
  for (const s of OW_LINES) push('ounce', s);
  push('ounce', OW_JOKE);
  for (const s of INTRO_LINES) push('ounce', s);
  for (const s of FERRY_LINES) push('narrator', s);
  for (const s of CONCERNS) push('ounce', s);
  for (const s of Object.values(REPORT_LINES)) push('ounce', s);
  for (const s of Object.values(HAMMOCK_LINES)) push('ounce', s);
  for (const s of Object.values(STATION_REMARKS)) push('ounce', s);
  for (const e of STAND_TIMELINE) if (e.say) out.push({ who: e.say[0], text: e.say[1] });
  for (const [who, list] of Object.entries(CLASSMATE_BARKS)) for (const s of list) out.push({ who, text: s });
  push('ounce', WOBBLE_LINE.replace('%W', '14'));
  for (const s of CONFESSION) push('ounce', s);
  for (const s of CONFESSION_AFTER) push('ounce', s);
  push('ounce', CREDITS_SIGNOFF);
  for (const s of WEEK2_LINES) push('ounce', s);
  for (const s of ATTRACT_LINES) push('ounce', s);
  for (const d of DAYS) for (const s of d.beat) push('ounce', s);
  for (const q of QUESTIONS) { push('ounce', q.q); for (const a of q.a) push('narrator', a); for (const r of q.r) push('ounce', r); }
  push('ounce', AGE_QUESTION);
  for (const m of MILESTONES) push('ounce', m.remark);
  for (const a of Object.values(ACTIVITIES)) { push('coach', a.coach); push('narrator', a.goal); }
  for (const s of HOLD_LINES) push('coach', s);
  for (const list of Object.values(MEDLEY.remarks)) for (const s of list) push('ounce', s);
  return out;
}
