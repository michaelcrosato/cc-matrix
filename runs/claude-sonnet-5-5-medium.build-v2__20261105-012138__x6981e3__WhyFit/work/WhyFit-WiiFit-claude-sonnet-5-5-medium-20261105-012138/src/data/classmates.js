// Classmates and their records: Dennis (low), June (mid-high), Marguerite (high), from each activity's thresholds.
import { ACTIVITIES } from './activities.js';
export const CLASSMATES = [
  { id: 'dennis', name: 'Dennis', mul: 0.55, skill: 'sloppy', look: 'dennis' },
  { id: 'june', name: 'June', mul: 1.0, skill: 'good', look: 'june' },
  { id: 'marguerite', name: 'Marguerite', mul: 1.18, skill: 'expert', look: 'marguerite' },
];
export function classmateScore(cm, actId) {
  const a = ACTIVITIES[actId]; if (!a) return 0;
  if (a.special) return { dennis: 640, june: 820, marguerite: 930 }[cm.id];
  const top = a.stars[2];
  return Math.round({ dennis: top * 0.42, june: a.stars[1] * 1.08, marguerite: top * 1.12 }[cm.id]);
}
export const recordsFor = (actId) => CLASSMATES.map((c) => ({ id: c.id, name: c.name, score: classmateScore(c, actId) }));
