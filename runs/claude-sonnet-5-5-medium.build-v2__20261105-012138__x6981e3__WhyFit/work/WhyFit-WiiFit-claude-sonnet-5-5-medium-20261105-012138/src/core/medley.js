// The Medley as pure logic: windows, picks, normalisation, totals, ranking, awards. Shared by Family Hour and AI Hub sessions.
import { EVENTS, EVENT_SECS, GAP_SECS, picks as pickEvents, AWARDS, MEDALS } from '../data/medley.js';
import { ACTIVITIES } from '../data/activities.js';

export const WINDOW = EVENT_SECS + GAP_SECS;
export const windowStart = (k) => k * WINDOW;
export const windowEnd = (k) => k * WINDOW + EVENT_SECS;
export const PLAY_SECS = EVENT_SECS - 3; // 3 s countdown inside each window
/** Event score 0..1000 from an activity score. */
export function norm(actId, score) {
  const A = ACTIVITIES[actId]; const top = (A.stars?.[2] ?? 100) * 1.15;
  return Math.round(Math.max(0, Math.min(1, score / top)) * 1000);
}
export class MedleyState {
  constructor(specs, rand) { this.specs = specs; this.picks = pickEvents(rand); this.scores = EVENTS.map(() => specs.map(() => 0)); this.done = EVENTS.map(() => false); this.event = 0; this.clock = 0; this.outs = specs.map(() => 0); }
  record(k, laneScores) { this.scores[k] = laneScores.map((s) => Math.round(s)); this.done[k] = true; }
  totals() { return this.specs.map((_, i) => this.scores.reduce((a, row) => a + (row[i] ?? 0), 0)); }
  ranking() { const t = this.totals(); return t.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v || a.i - b.i); }
  medalOf(rank) { return MEDALS[Math.min(rank, 3)]; }
  awards() {
    const out = this.specs.map(() => []); const t = this.totals(); if (!t.length) return out;
    const best = (k) => this.scores[k].reduce((bi, v, i, a) => (v > a[bi] ? i : bi), 0);
    const titles = ['Stillest', 'Best Beat', 'Biggest Header'];
    EVENTS.forEach((_, k) => { if (this.done[k]) out[best(k)].push({ title: titles[k], detail: AWARDS[k === 0 ? 0 : k === 1 ? 2 : 3][1] }); });
    const worst = t.reduce((bi, v, i, a) => (v < a[bi] ? i : bi), 0); if (t.length > 1) out[worst].push({ title: 'Most Apologetic', detail: AWARDS[1][1] });
    return out;
  }
}
