// The Better Burrows Bureau: scored on Show Day nights, result by mail.
import { ITEMS } from '../data/items.js';
import { FURNITURE_SETS } from '../data/furniture.js';
import { sendMail } from './mail.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { Stream } from '../core/rng.js';

export const GRADES = [{ g: 'C', min: 0, reward: 'bureauC' }, { g: 'B', min: 40, reward: 'bureauB' }, { g: 'A', min: 90, reward: 'bureauA' }, { g: 'S', min: 150, reward: 'bureauS' }];
export function scoreHome(w) {
  const items = Object.values(w.home.rooms).flatMap((r) => r.items);
  let score = 0;
  const notes = [];
  const sets = {};
  let value = 0;
  for (const i of items) { const it = ITEMS[i.id]; if (!it) continue; value += it.price ?? 0; if (it.set) sets[it.set] = (sets[it.set] ?? 0) + 1; }
  score += Math.min(60, Math.round(value / 800));
  for (const n of Object.values(sets)) if (n >= 4) score += 15 + (n - 4) * 3;
  const pal = new Set(items.map((i) => ITEMS[i.id]?.palette?.wood).filter(Boolean));
  const harmony = items.length >= 3 && pal.size <= 2;
  if (harmony) score += 10;
  // cozy rules
  const near = (a, b, r = 2) => Math.abs(a.x - b.x) <= r && Math.abs(a.z - b.z) <= r;
  for (const room of Object.values(w.home.rooms)) {
    const lamps = room.items.filter((i) => ITEMS[i.id]?.func === 'lamp');
    const seats = room.items.filter((i) => ITEMS[i.id]?.func === 'seat');
    const rugs = room.items.filter((i) => ITEMS[i.id]?.func === 'rug');
    const tables = room.items.filter((i) => ITEMS[i.id]?.tags?.includes('table'));
    const plants = room.items.filter((i) => ITEMS[i.id]?.func === 'plant');
    if (lamps.some((l) => seats.some((s) => near(l, s)))) { score += 8; notes.push('lamp'); }
    if (rugs.some((r) => tables.some((t) => near(r, t, 1)))) { score += 8; notes.push('rug'); }
    if (plants.length) { score += 6; notes.push('plant'); }
    if (seats.length > 4) { score -= 6; notes.push('chairs'); }
    const area = 36;
    if (room.items.length > area / 3) score -= 10;
  }
  if (w.home.stereo) { score += 6; notes.push('music'); }
  return { score: Math.max(0, score), notes, value };
}
export const gradeOf = (score) => { let g = GRADES[0]; for (const x of GRADES) if (score >= x.min) g = x; return g; };
export function rollHomeRating(g) {
  const w = g.world;
  const { score, notes } = scoreHome(w);
  const grade = gradeOf(score);
  const s = new Stream(`${w.seed}:bureau:${w.clock.day}`);
  const crit = notes.includes('chairs') ? 'Too many chairs. Who are you expecting?' : notes.includes('rug') ? "You've got a nice rug. It's the only thing here I'd rescue." : s.pick(HOSTS.brisket.critique);
  const improved = !w.home.bestGrade || GRADES.findIndex((x) => x.g === grade.g) > GRADES.findIndex((x) => x.g === w.home.bestGrade);
  w.home.lastGrade = grade.g;
  w.home.lastScore = score;
  w.home.lastCritique = crit;
  if (improved) w.home.bestGrade = grade.g;
  sendMail(g, { from: 'bureau', body: `BETTER BURROWS BUREAU\nGrade: ${grade.g}. ${score} points.\n${crit}${improved ? ' A new grade. Collect your plaque at the Bureau.' : ''}\nAgent Brisket`, arriveDay: w.clock.day });
  g.events.emit('homeGraded', { grade: grade.g, score });
}
export { FURNITURE_SETS };
