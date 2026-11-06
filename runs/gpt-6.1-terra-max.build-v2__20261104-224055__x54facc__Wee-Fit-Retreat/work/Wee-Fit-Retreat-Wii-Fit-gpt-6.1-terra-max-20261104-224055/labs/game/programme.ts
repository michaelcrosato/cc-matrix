/** @file The retreat's daily programme and character dialogue. */

export type ActivityKind = 'check' | 'pose' | 'reps' | 'step' | 'pond' | 'line' | 'paddle' | 'sand' | 'cliff' | 'hoop' | 'jog' | 'group' | 'finale';
export type Activity = { id: string; title: string; kind: ActivityKind; location: string; duration: number; description: string; instruction: string; host: string; quote: string };
export type Day = { title: string; subtitle: string; story: string; activities: Activity[] };

const activity = (id: string, title: string, kind: ActivityKind, location: string, duration: number, description: string, instruction: string, host: string, quote: string): Activity => ({ id, title, kind, location, duration, description, instruction, host, quote });

export const DAYS: Day[] = [
  { title: 'A softer landing', subtitle: 'DAY 01 · ARRIVAL', story: 'The ferry has left, the slippers fit, and the island seems perfectly ordinary. Probably.', activities: [
    activity('d1-check', 'Morning Check', 'check', 'THE SCALE HOUSE', 36, 'Meet Tare and find your centre.', 'Follow the mint target with your balance disc. Try a gentle lean.', 'TARE', 'Please step onto the mat. I promise to be only moderately judgmental.'),
    activity('d1-pose', 'Pose Class', 'pose', 'THE PAVILION', 45, 'Three poses, no particular rush.', 'Follow the pose target. Switch feet when the instructor asks.', 'PLUMB', 'A pose is just a wobble that has made a commitment.'),
    activity('d1-pond', 'Still Pond', 'pond', 'THE QUIET SHORE', 60, 'Be very still. The pond is watching.', 'Keep your balance centred and breathe. You do not have to obey every prompt.', 'NAN', 'The water reflects everything. Even your enthusiasm.'),
  ] },
  { title: 'Finding your feet', subtitle: 'DAY 02 · PRACTICE', story: 'A small tremor interrupts breakfast. Everyone politely agrees not to mention it.', activities: [
    activity('d2-check', 'Morning Check', 'check', 'THE SCALE HOUSE', 30, 'A little check-in with Tare.', 'Follow the target and keep your movement smooth.', 'TARE', 'Welcome back. Your balance has arrived before your confidence.'),
    activity('d2-reps', 'Reps Hall', 'reps', 'THE PAVILION', 45, 'Move with the count, not ahead of it.', 'Press both feet on the beat and keep your centre steady.', 'BEX', 'Excellent! We have a whole room for doing the same thing again.'),
    activity('d2-sand', 'Sand Garden', 'sand', 'THE SAND GARDEN', 60, 'Guide a little stone through the garden.', 'Lean toward each target to roll the stone into place.', 'NAN', 'The sand has no deadlines. The stone, regrettably, does.'),
    activity('d2-pose', 'Pose Class II', 'pose', 'THE PAVILION', 45, 'Archer, Comma, and the enigmatic Napkin.', 'Match each changing pose and switch feet when asked.', 'PLUMB', 'Today we become punctuation. Please avoid becoming an exclamation mark.'),
  ] },
  { title: 'A little momentum', subtitle: 'DAY 03 · DISCOVERY', story: 'The horizon tilts, just for a moment. Gerald says it has always done that.', activities: [
    activity('d3-check', 'Morning Check', 'check', 'THE SCALE HOUSE', 30, 'Find your balance before venturing out.', 'Follow the mint target without rushing.', 'TARE', 'A good morning begins with a controlled amount of uncertainty.'),
    activity('d3-paddle', 'Paddle Glide', 'paddle', 'THE LAGOON', 60, 'A gentle course through the blue.', 'Lean left and right through the buoys. Alternate feet to paddle.', 'BEX', 'The buoys are suggestions with very strong opinions.'),
    activity('d3-line', 'The Line', 'line', 'THE RIDGE', 60, 'One careful step after another.', 'Alternate left and right feet while keeping the balance disc centred.', 'GERALD', 'It is a line. Walk along it.'),
    activity('d3-step', 'Step Class', 'step', 'THE PAVILION', 45, 'A little rhythm for the rest of us.', 'Press the indicated foot as the beat reaches the centre.', 'BEX', 'If you lose the beat, it will come around again. They do that.'),
  ] },
  { title: 'The view from here', subtitle: 'DAY 04 · PERSPECTIVE', story: 'A crack runs through the path. Beneath the island is something round and very, very large.', activities: [
    activity('d4-check', 'Morning Check', 'check', 'THE SCALE HOUSE', 30, 'Take a breath and check in.', 'Stay with the moving target. Gentle movements help.', 'TARE', 'I have checked the island. The island has declined to comment.'),
    activity('d4-hoop', 'Hoop Patrol', 'hoop', 'THE MEADOW', 45, 'Keep a hoop going, then catch it.', 'Circle your lean around the disc. Return to centre to catch.', 'BEX', 'Round and round! Unlike the island, which is only mostly round.'),
    activity('d4-cliff', 'Cliff Plunge', 'cliff', 'THE CLIFF', 45, 'Three graceful plunges into the lagoon.', 'Lean into the target and press both feet to launch.', 'PLUMB', 'The important part of a dive is deciding to leave.'),
    activity('d4-jog', 'Island Jog', 'jog', 'THE COAST PATH', 60, 'Keep Gerald company on the coast path.', 'Alternate feet to jog and lean gently through the bends.', 'GERALD', 'I am going for a walk. You may also go for a walk.'),
  ] },
  { title: 'The great tilt', subtitle: 'DAY 05 · TOGETHER', story: 'The secret is out: Little Fulcrum balances on a rock. A storm is coming, and the whole island will need a hand.', activities: [
    activity('d5-check', 'Morning Check', 'check', 'THE SCALE HOUSE', 30, 'A last check before the weather arrives.', 'Follow the target and settle into a comfortable rhythm.', 'TARE', 'No pressure. Except the atmospheric kind, which is considerable.'),
    activity('d5-group', 'Group Class', 'group', 'THE PAVILION', 60, 'A class for everyone, even Gerald.', 'Follow the targets and match the foot prompts. Everybody finishes together.', 'PLUMB', 'Balance is easier when someone is wobbling beside you.'),
    activity('d5-pose', 'Pose Class III', 'pose', 'THE PAVILION', 45, 'Bridge and Lighthouse, for the road ahead.', 'Hold each pose by following the target. Change feet when prompted.', 'PLUMB', 'A lighthouse does not stop the sea. It simply stands there rather well.'),
    activity('d5-finale', 'The Great Tilt', 'finale', 'THE WHOLE ISLAND', 90, 'Steady Little Fulcrum through the storm.', 'Lean toward the target to steady the island. Keep going together.', 'TARE', 'The island is wobbling. So are we. That is not the same as falling.'),
  ] },
];

export function rankFor(score: number): { name: string; pebbles: number } {
  if (score >= 900) return { name: 'Unsettling', pebbles: 5 };
  if (score >= 750) return { name: 'Serene', pebbles: 4 };
  if (score >= 550) return { name: 'Composed', pebbles: 3 };
  if (score >= 300) return { name: 'Adequate', pebbles: 2 };
  return { name: 'Present', pebbles: 1 };
}

export const POSES = ['Seated Nothing', 'Patient Chair', 'Heron', 'Archer', 'Comma', 'Napkin', 'Bridge', 'Lighthouse'];
