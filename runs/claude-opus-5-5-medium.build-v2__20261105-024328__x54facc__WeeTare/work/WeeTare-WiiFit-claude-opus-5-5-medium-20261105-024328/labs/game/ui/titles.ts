/**
 * @file The names of things for the screens: activities, cards, and each activity's prompts.
 */
export const TITLE = 'Wee Tare';
export const TAGLINE = 'Stand still. It is harder than it looks.';

export const ACTIVITY_TITLES: Readonly<Record<string, string>> = {
  check: 'Morning Check', poseA: 'Pose Class', poseB: 'Pose Class II', poseC: 'Pose Class III', pond: 'Still Pond', reps: 'Reps Hall', step: 'Step Class',
  line: 'The Line', paddle: 'Paddle Glide', garden: 'Sand Garden', plunge: 'Cliff Plunge', hoop: 'Hoop Patrol', jog: 'Island Jog', group: 'Group Class', tilt: 'The Great Tilt',
  walk: 'Find the Noticeboard', ring: 'The Still Ring', heron: 'The Heron', hoopS: 'Hoop Patrol', stepS: 'Step Class', pondS: 'Still Pond',
}; // prettier-ignore

/** What each activity's prompts are. */
export const ACTIVITY_PROMPTS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  check: [['lean', 'Lean'], ['footL', 'Left foot'], ['footR', 'Right foot']],
  poseA: [['lean', 'Lean'], ['both', 'Breathe']], poseB: [['lean', 'Lean'], ['both', 'Breathe']], poseC: [['lean', 'Lean'], ['both', 'Breathe']],
  heron: [['lean', 'Lean'], ['footL', 'Stand'], ['footR', 'Breathe']], ring: [['lean', 'Lean']],
  pond: [['both', 'Breathe']], pondS: [['both', 'Breathe']],
  reps: [['lean', 'Follow the band'], ['both', 'Palms']],
  step: [['footL', 'Left'], ['footR', 'Right'], ['both', 'Jump']], stepS: [['footL', 'Left'], ['footR', 'Right'], ['both', 'Jump']],
  line: [['footL', 'Step'], ['footR', 'Step'], ['lean', 'Balance']],
  paddle: [['lean', 'Glide and steer'], ['footL', 'Paddle'], ['footR', 'Paddle']],
  garden: [['lean', 'Tilt the tray']],
  plunge: [['both', 'Hold, then let go'], ['lean', 'Spin and twist']],
  hoop: [['lean', 'Circle your thumb'], ['footL', 'or alternate'], ['footR', 'feet']], hoopS: [['lean', 'Circle your thumb'], ['footL', 'or alternate'], ['footR', 'feet']],
  jog: [['lean', 'Steer'], ['footL', 'Stride'], ['footR', 'Stride']],
  tilt: [['lean', 'Lean'], ['both', 'Calm Call'], ['footL', 'Crank'], ['footR', 'Crank']],
}; // prettier-ignore
