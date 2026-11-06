/**
 * @file The Programme as data: five days, each a Morning Check plus its activities, the day's beat and notice, and the order
 * the finale follows. Add a row to add a day. `ACTIVITY_INFO` names each activity for cards and the Noticeboard.
 * @example
 * DAYS[0].acts[0]; // 'morning'
 */
export interface Day {
  n: number;
  title: string;
  acts: string[];
  notice: string;
  beat: string;
}
export const DAYS: readonly Day[] = [
  {
    n: 1,
    title: 'Arrival',
    acts: ['morning', 'poseA', 'pond', 'board'],
    notice: 'notice.1',
    beat: 'The ferry leaves. Tare greets you.',
  },
  {
    n: 2,
    title: 'The Mat',
    acts: ['morning', 'reps', 'garden', 'poseB'],
    notice: 'notice.2',
    beat: 'The plaques have moved.',
  },
  {
    n: 3,
    title: 'The Water',
    acts: ['morning', 'paddle', 'line', 'step'],
    notice: 'notice.3',
    beat: 'Drinks slide along tables.',
  },
  {
    n: 4,
    title: 'The Sand',
    acts: ['morning', 'hoop', 'cliff', 'jog'],
    notice: 'notice.5',
    beat: 'Marbles roll with nobody there.',
  },
  {
    n: 5,
    title: 'The Tilt',
    acts: ['morning', 'group', 'poseC', 'tilt'],
    notice: 'notice.6',
    beat: 'The storm comes.',
  },
];
export const ACTIVITY_INFO: Record<string, { title: string; blurb: string; where: string }> = {
  morning: { title: 'Morning Check', blurb: 'Three small tests and a number.', where: 'plaza' },
  poseA: { title: 'Pose Class A', blurb: 'Seated Nothing, Patient Chair, Heron.', where: 'pavilion' },
  poseB: { title: 'Pose Class B', blurb: 'Archer, Comma, Napkin.', where: 'pavilion' },
  poseC: { title: 'Pose Class C', blurb: 'Bridge, Lighthouse, Heron.', where: 'pavilion' },
  pond: { title: 'Still Pond', blurb: 'Breathe. Nothing else.', where: 'pond' },
  reps: { title: 'Reps Hall', blurb: 'Follow the band. Gerald does two.', where: 'annex' },
  step: { title: 'Step Class', blurb: 'Feet, on the beat.', where: 'annex' },
  line: { title: 'The Line', blurb: 'Forty metres of rope.', where: 'lagoon' },
  paddle: { title: 'Paddle Glide', blurb: 'Twelve buoys, one lagoon.', where: 'lagoon' },
  garden: { title: 'Sand Garden', blurb: 'Tilt the tray. Sink the marbles.', where: 'terrace' },
  cliff: { title: 'Cliff Plunge', blurb: 'Three dives, three Gulls.', where: 'cliff' },
  hoop: { title: 'Hoop Patrol', blurb: 'Spin. Do not stop.', where: 'hoop' },
  jog: { title: 'Island Jog', blurb: 'Stay near Gerald.', where: 'plaza' },
  group: { title: 'Group Class', blurb: 'Three classes, on the mats, together.', where: 'pavilion' },
  tilt: { title: 'The Great Tilt', blurb: 'The whole island, on your thumb.', where: 'plaza' },
};
/** Activities that need a pad's cross-station walk are all reachable by "Go". */
export const ALL_ACTIVITIES = Object.keys(ACTIVITY_INFO);
