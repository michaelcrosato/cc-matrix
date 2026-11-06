// Every activity as a row of data. Stars, unlock days and hard versions live here.
const LANE3 = 'lane3';
export const ACTIVITIES = {
  // Holding Still
  tree: { name: 'Apologetic Tree', station: 'pavilion', scene: 'poses', pose: 'tree', song: 'hold', stars: [45, 70, 90], unit: '%', day: 1, camera: LANE3, hard: { ring: 0.8 }, coach: 'You are a tree. A tree does not check its phone.', goal: 'Keep the dot in the circle.', family: 'pose' },
  heron: { name: 'Startled Heron', station: 'pavilion', scene: 'poses', pose: 'heron', song: 'hold', stars: [45, 70, 90], unit: '%', day: 1, camera: LANE3, hard: { ring: 0.8, wander: 1.3 }, coach: 'Stand on one leg. The other leg knows what it did.', goal: 'Follow the drifting circle.', family: 'pose' },
  warrior: { name: 'Reluctant Warrior', station: 'pavilion', scene: 'poses', pose: 'warrior', song: 'hold', stars: [45, 70, 90], unit: '%', day: 2, camera: LANE3, hard: { ring: 0.8 }, coach: 'Breathe in. Not like that.', goal: 'Hold the circle. Breathe with the bar.', family: 'pose' },
  chair: { name: 'The Chair Nobody Asked For', station: 'pavilion', scene: 'poses', pose: 'chair', song: 'hold', stars: [45, 70, 90], unit: '%', day: 3, camera: LANE3, hard: { ring: 0.8 }, coach: 'Sit. There is no chair. There was never going to be.', goal: 'Hold the circle. It gets worse.', family: 'pose' },
  fold: { name: 'Tax Season', station: 'pavilion', scene: 'poses', pose: 'fold', song: 'hold', stars: [45, 70, 90], unit: '%', day: 4, camera: LANE3, hard: { ring: 0.8, wander: 1.3 }, coach: 'Fold. Everybody folds in the end.', goal: 'Follow the circle. Breathe with the bar.', family: 'pose' },
  plank: { name: 'Plank Negotiation', station: 'pavilion', scene: 'poses', pose: 'plank', song: 'hold', stars: [45, 70, 90], unit: '%', day: 5, camera: LANE3, hard: { ring: 0.8 }, coach: 'The floor is your friend. It has never once let go.', goal: 'The floor is making an offer. Refuse it.', family: 'pose' },
  // The Rep Shed
  squats: { name: 'Squats of Regret', station: 'shed', scene: 'reps', rep: 'squats', song: 'rep', stars: [55, 75, 90], unit: '%', day: 1, camera: LANE3, hard: { tempo: 0.8, fatigue: 1.6 }, coach: 'Down. Think about what you did. Up.', goal: 'Match the marker, all the way down.', family: 'reps' },
  lunges: { name: 'Apology Lunges', station: 'shed', scene: 'reps', rep: 'lunges', song: 'rep', stars: [55, 75, 90], unit: '%', day: 2, camera: LANE3, hard: { tempo: 0.8, fatigue: 1.6 }, coach: 'Left. Right. Say you are sorry to both.', goal: 'Lean to the side it asks for.', family: 'reps' },
  press: { name: 'Overhead Mortgage', station: 'shed', scene: 'reps', rep: 'press', song: 'rep', stars: [55, 75, 90], unit: '%', day: 4, camera: LANE3, hard: { tempo: 0.8, fatigue: 1.6 }, coach: 'Lift it. You signed for it.', goal: 'Press up with the marker. It is heavy.', family: 'reps' },
  // Beat Beach
  hoop: { name: 'Hoop Economics', station: 'beach', scene: 'hoop', song: 'hoop', stars: [35, 70, 110], unit: 'turns', day: 1, camera: LANE3, hard: { band: 0.8, lift: 0.8 }, coach: 'Keep it up. Everyone is watching. No one is impressed.', goal: 'Circle to keep the hoop up. Catch more.', family: 'hoop' },
  step: { name: 'Step Class', station: 'beach', scene: 'step', song: 'step', stars: [55, 75, 90], unit: '%', day: 3, camera: LANE3, hard: { chart: 'hard', window: 0.85 }, coach: 'Left. Right. It is not complicated. It is only hard.', goal: 'Step when the feet reach the line.', family: 'step' },
  // Lagoon Games
  header: { name: 'Coconut Header', station: 'lagoon', scene: 'header', song: 'lagoon', stars: [150, 400, 800], unit: 'pts', day: 2, camera: 'header', hard: { interval: 0.8, flipFlop: 0.35 }, coach: 'Use your head. It is the first time for everything.', goal: 'Lean to head coconuts. Dodge flip-flops.', family: 'header' },
  slackline: { name: 'Slackline', station: 'lagoon', scene: 'slackline', song: 'lagoon', stars: 'custom', unit: 'pts', day: 3, camera: 'slackline', hard: { gust: 1.4 }, coach: 'Walk. Stop when you must. The water is patient.', goal: 'Push up to walk. Lean to stay on.', family: 'solo' },
  tray: { name: 'Vitamin Tray', station: 'lagoon', scene: 'tray', song: 'lagoon', stars: 'percent', starPct: [40, 60, 80], unit: 'pts', day: 4, camera: 'tray', hard: { time: 0.8 }, coach: 'Your vitamins. Into the right cups. All of them, please.', goal: 'Tilt the tray. Match the colours.', family: 'solo' },
  pier: { name: 'Pier Jump', station: 'lagoon', scene: 'pier', song: 'lagoon', stars: [18, 28, 38], unit: 'm', day: 5, camera: 'pier', hard: { ring: 0.8 }, coach: 'Run. Jump. Hold your form. The judges have paddles.', goal: 'Tuck, press at the lip, hold the air.', family: 'solo' },
  // Jogging Path
  jog: { name: 'Island Jog', station: 'gate', scene: 'jog', song: 'jog', stars: [55, 75, 90], unit: '%', day: 5, camera: 'jog', hard: { cadence: 1.15 }, coach: 'Keep up. I am on a scooter.', goal: 'Left, right, left, right. Stay near Coach.', family: 'solo' },
  // The finale
  stand: { name: 'The Long Stand', station: 'terrace', scene: 'longstand', song: 'stand', stars: [45, 70, 90], unit: '%', day: 7, camera: 'stand', hard: {}, coach: 'Stand.', goal: 'Stand still. That is all. That is everything.', family: 'finale', hidden: true },
};
export const ACTIVITY_IDS = Object.keys(ACTIVITIES);
export const PLAYABLE_IDS = ACTIVITY_IDS.filter((id) => !ACTIVITIES[id].hidden);
export const HARD_DAY = 6;

/** What the classmates scored. Dennis low, June mid-high, Marguerite high. */
export const CLASSMATE_SCORES = {
  tree: { dennis: 22, june: 74, marguerite: 96 }, heron: { dennis: 18, june: 71, marguerite: 94 },
  warrior: { dennis: 26, june: 72, marguerite: 92 }, chair: { dennis: 12, june: 70, marguerite: 93 },
  fold: { dennis: 8, june: 68, marguerite: 91 }, plank: { dennis: 5, june: 65, marguerite: 90 },
  squats: { dennis: 41, june: 78, marguerite: 93 }, lunges: { dennis: 38, june: 76, marguerite: 92 }, press: { dennis: 30, june: 72, marguerite: 91 },
  hoop: { dennis: 28, june: 88, marguerite: 124 }, step: { dennis: 44, june: 81, marguerite: 94 },
  header: { dennis: 110, june: 520, marguerite: 980 }, slackline: { dennis: 260, june: 880, marguerite: 1000 },
  tray: { dennis: 20, june: 52, marguerite: 70 }, pier: { dennis: 14, june: 27, marguerite: 41 },
  jog: { dennis: 40, june: 78, marguerite: 94 }, stand: { dennis: 12, june: 70, marguerite: 95 },
};

export const DRIP_BONUS = 5;
