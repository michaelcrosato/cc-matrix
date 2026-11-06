import { ACTIVITIES } from './activities.js';

/** Samples from the plan. The bank below is extra. */
export const SAMPLES = [
  "Hello! I'm Ounce. Please step on me.",
  'Ow.',
  "That was a joke. I can't feel pain. I can only keep records.",
  'How old do you feel? This is not binding.',
  'Your Wobble Age is 68. Is that close? No? I am so sorry.',
  'Thank you. I have written that down.',
  'You wobbled 14 times. I only counted the ones you noticed.',
  'Your left side is doing very well. I will let your right side know.',
  'No change since yesterday. Which is, in a way, consistent.',
  'Excellent. Compared to Dennis.',
  "I'm not angry. Scales don't get angry. We get accurate.",
  'Have you been stretching? Please do not lie. I am very sensitive.',
  "Today's concern: your ankles. I have been concerned all night.",
  "Good morning. You look rested. I can't see. But you felt rested.",
  'Kevin has been with us eleven years. He has never once held a pose.',
  'This is a recording. The person in it is doing better than you.',
  'I have been adding seven. To everyone. For years. It felt motivating.',
  'See you tomorrow. Bring your knees.',
  'You are a tree. A tree does not check its phone.',
  'Your left knee has wandered off. Please collect it.',
  'Breathe in. Not like that.',
  'Good. Again. That was also good. Again.',
  'Hold. You may blink on Thursday.',
  'I am eighty-one. I say this so that you feel something.',
  'Stillness is a muscle. So is regret. We train both here.',
  'The floor is your friend. It has never once let go.',
  'Both hips, new. Knee, new. Opinions, original.',
  'I used to do this professionally. Not this. Something near it.',
  "It's fine. It's just the one leg.",
  "I'm pacing myself.",
  'My gran says you are doing your best. She said it very slowly.',
];

const FIRST = {
  0: 'The circle was elsewhere. I wrote that down.',
  1: 'One star. A start. The file is not offended.',
  2: 'Two stars. I allowed a small nod.',
  3: 'Three stars. I will not make a fuss.',
};
const AGAIN = {
  0: 'Again the circle declined. Consistent, at least.',
  1: 'Again, one star. We are building a habit.',
  2: 'Again, two stars. The file agrees with itself.',
  3: 'Again, three stars. Please sit before you float.',
};

function pack(def) {
  const name = def.name;
  const lines = [];
  for (const stars of [0, 1, 2, 3]) {
    lines.push({ id: `${def.id}-first-${stars}`, activity: def.id, stars, repeat: false, speaker: 'ounce', text: FIRST[stars] });
    lines.push({ id: `${def.id}-again-${stars}`, activity: def.id, stars, repeat: true, speaker: 'ounce', text: AGAIN[stars] });
  }
  lines.push({ id: `${def.id}-enter`, activity: def.id, speaker: 'coach', text: 'Begin when the circle looks friendly.' });
  lines.push({ id: `${def.id}-in`, activity: def.id, speaker: 'ounce', text: 'You are in the circle. Stay, if it is convenient.' });
  lines.push({ id: `${def.id}-out`, activity: def.id, speaker: 'ounce', text: 'You have left the circle. It noticed. I noticed.' });
  lines.push({ id: `${def.id}-fall`, activity: def.id, speaker: 'coach', text: 'Down is a direction. We will count it once.' });
  lines.push({ id: `${def.id}-streak`, activity: def.id, speaker: 'ounce', text: 'Several in a row. I counted all of them.' });
  return lines;
}

export const LINES = ACTIVITIES.flatMap(pack);

const MORE = [
  ['ounce', 'The ferry is on time. Your knees are a separate matter.'],
  ['ounce', 'Please step on me. I have cleared my morning.'],
  ['coach', 'The island leans a little. So do you. We can work with that.'],
  ['dennis', 'The deck chair has a philosophy. I am still learning it.'],
  ['marguerite', 'Has anyone checked the scale? I ask as a courtesy.'],
  ['ounce', 'I would like to weigh in on that. No.'],
  ['june', 'I brought a smaller worry today. It still counts.'],
  ['coach', 'Hard mode is the same pose, with less forgiveness.'],
  ['ounce', 'The jar is filling. Sweat, in a manner of speaking.'],
  ['kevin', ''],
  ['ounce', 'Kevin sat on me. The dial read 7. We left it there.'],
  ['coach', 'Stand. The rest of the week can wait its turn.'],
  ['ounce', 'I have been adding seven. It felt like kindness. It was not.'],
  ['marguerite', 'Three stars and still no speech. Typical of a good day.'],
  ['dennis', 'I beat the number I feared. The number did not clap.'],
  ['june', 'I will take the hammock. The hammock has agreed.'],
  ['coach', 'Breathe out. The circle prefers you slightly smaller.'],
  ['ounce', 'Your chart moved. I moved it. I am sorry, and also finished.'],
  ['ounce', 'Week two. Same circle. Fewer surprises from me.'],
  ['coach', 'The plumb line is straight. The island is not. Choose.'],
  ['ounce', 'Drips are not a fluid. They are a compliment I can store.'],
  ['dennis', 'Last one, he said. Then he said it again. I stayed.'],
  ['marguerite', 'I do not chase dots. The dot, today, chased me.'],
  ['june', 'The vitamin knew its cup. I was only the tilt.'],
  ['coach', 'A coconut is not a comment. Dodge it anyway.'],
  ['ounce', 'The pier is a suggestion. The water is a fact.'],
  ['coach', 'Cadence, not hurry. The path is the same length either way.'],
  ['ounce', 'I kept the recording. The recording is kinder than live.'],
  ['coach', 'Blink if you must. The heron will pretend not to see.'],
  ['ounce', 'Guest three is a person. I will learn the name and then forget the panic.'],
];

for (const [speaker, text] of MORE) {
  if (!text) continue;
  LINES.push({ id: `more-${LINES.length}`, speaker, text, activity: null, stars: null, repeat: false });
}

export function linesFor(activity, stars, repeat) {
  return LINES.filter((l) => l.activity === activity && l.stars === stars && l.repeat === !!repeat);
}

export function lineText(activity, stars, repeat) {
  const found = linesFor(activity, stars, repeat)[0];
  return found ? found.text : 'Noted.';
}

export function allLineStrings() {
  return [...SAMPLES, ...LINES.map((l) => l.text).filter(Boolean)];
}
