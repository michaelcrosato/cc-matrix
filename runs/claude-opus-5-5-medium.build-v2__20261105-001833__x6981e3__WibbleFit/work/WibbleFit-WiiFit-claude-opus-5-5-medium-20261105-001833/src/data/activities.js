// One entry per activity: everything a designer changes. Scene code reads it.
const rivals = ([a, b, c]) => ({ dennis: Math.round(a * 1.05), june: Math.round((b + c) / 2), marguerite: Math.round(c * 1.04) });
const POSE_STARS = [45, 70, 90], REP_STARS = [55, 75, 90];
const act = (id, name, station, scene, song, day, stars, extra = {}) => ({ id, name, station, scene, song, day, stars, rivals: extra.rivalScores ?? rivals(stars), lane: false, hard: {}, ...extra });
export const ACTIVITIES = [
  act('tree', 'Apologetic Tree', 'pavilion', 'poses', 'still', 1, POSE_STARS, { lane: true, hard: { ring: 0.3 } }),
  act('heron', 'Startled Heron', 'pavilion', 'poses', 'still', 1, POSE_STARS, { lane: true, hard: { ring: 0.27 } }),
  act('warrior', 'Reluctant Warrior', 'pavilion', 'poses', 'still', 2, POSE_STARS, { lane: true, hard: { ring: 0.24 } }),
  act('chair', 'The Chair Nobody Asked For', 'pavilion', 'poses', 'still', 3, POSE_STARS, { lane: true, hard: { ring: 0.23 } }),
  act('fold', 'Tax Season', 'pavilion', 'poses', 'still', 4, POSE_STARS, { lane: true, hard: { ring: 0.22 } }),
  act('plank', 'Plank Negotiation', 'pavilion', 'poses', 'still', 5, POSE_STARS, { lane: true, hard: { ring: 0.2 } }),
  act('squats', 'Squats of Regret', 'shed', 'reps', 'shed', 1, REP_STARS, { lane: true, hard: { tempo: 2.6 } }),
  act('lunges', 'Apology Lunges', 'shed', 'reps', 'shed', 2, REP_STARS, { lane: true, hard: { tempo: 2.6 } }),
  act('press', 'Overhead Mortgage', 'shed', 'reps', 'shed', 4, REP_STARS, { lane: true, hard: { tempo: 3 } }),
  act('hoop', 'Hoop Economics', 'beach', 'hoop', 'hoop', 1, [35, 70, 110], { lane: true, hard: { low: 1.3, high: 2.2 } }),
  act('step', 'Step Class', 'beach', 'step', 'step', 3, [55, 75, 90], { lane: true, hard: { fill: true, window: 0.8 } }),
  act('header', 'Coconut Header', 'lagoon', 'header', 'lagoon', 2, [150, 400, 800], { lane: true, hard: { interval: 0.75 } }),
  act('slackline', 'Slackline', 'lagoon', 'slackline', 'lagoon', 3, [1, 2, 3], { starsFromSim: true, rivalScores: { dennis: 620, june: 830, marguerite: 930 }, hard: { walkInst: 1.2 } }),
  act('tray', 'Vitamin Tray', 'lagoon', 'tray', 'lagoon', 4, [40, 60, 80], { percentStars: true, hard: { seconds: 45 } }),
  act('jog', 'Island Jog', 'gate', 'jog', 'jog', 5, [55, 75, 90], { hard: { speed: 1.2 } }),
  act('pier', 'Pier Jump', 'lagoon', 'pier', 'lagoon', 5, [18, 28, 38], { hard: { window: 0.7 } }),
  act('longstand', 'The Long Stand', 'stand', 'longstand', 'stand', 7, POSE_STARS, { rivalScores: { dennis: 41, june: 80, marguerite: 96 } }),
];
export const ACT = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));
export const STATION_ACTS = (s) => ACTIVITIES.filter((a) => a.station === s);
export const COACH_LINES = {
  poses: ['You are a tree. A tree does not check its phone.', 'Stillness is a muscle. So is regret. We train both here.', 'Hold. You may blink on Thursday.'],
  reps: ['Good. Again. That was also good. Again.', 'I am eighty-one. I say this so that you feel something.'],
  hoop: ['Your hips know what to do. Tell them I said so.'],
  step: ['Left. Right. They are both yours. I checked.'],
  header: ['Dennis has a catapult. I have stopped asking.'],
  slackline: ['The line is not your enemy. The wind is. And you.'],
  tray: ['Slowly. They are small, and they can sense fear.'],
  jog: ['I shall be on the scooter. Try to keep up.'],
  pier: ['Jump in the water. Do it correctly.'],
  longstand: ['Stand.'],
};
