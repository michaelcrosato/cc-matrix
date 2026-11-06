// The line bank. Voice: polite, clinical, caring, faintly wounding. At most 3 lines of 52 characters each.
export const RESULT_FIRST = {
  still: [
    'You moved. I recorded it. We can discuss it later.',
    'A beginning. Beginnings are traditionally wobbly.',
    'Good. Your Dot stayed home most of the time.',
    'The circle is very proud of you. It said so, quietly.',
  ],
  reps: [
    'Your knees filed a complaint. I have forwarded it.',
    'Reps were counted. Dignity was not.',
    'Your form was good. For a first attempt at form.',
    'Perfect. Coach has stopped looking at her watch.',
  ],
  hoop: [
    'The hoop is on the floor. This is where hoops live.',
    'Some rotations occurred. I will say some.',
    'Your hips have a rhythm. It is a private one.',
    'The hoop never fell. The hoop is amazed.',
  ],
  step: [
    'Your feet were present for the music. Mostly.',
    'You stepped. The beat stepped. Rarely together.',
    'Very nearly on time. Time has been told.',
    'Perfect timing. I checked it twice. I was rude about it.',
  ],
  header: [
    'You were hit by several coconuts. They were not sorry.',
    'Some coconuts were headed. Others headed you.',
    'A confident performance. Dennis is rattled.',
    'Golden. Dennis has asked for a moment.',
  ],
  slack: [
    'You fell in. The lagoon accepts all comers.',
    'You crossed. The line sagged. So did your confidence.',
    'Across, with only a little splashing. Lovely.',
    'Flawless. I have never seen a person so unbothered.',
  ],
  tray: [
    'Some vitamins went where vitamins go. Most did not.',
    'The red ones are happier. The rest are in therapy.',
    'Nearly all sorted. The tray feels useful.',
    'Every vitamin home. Tidy. A little frightening.',
  ],
  jog: [
    'You were passed by a scooter. It was an 81-year-old.',
    'You jogged. Cups were spilled. Coach waited, unimpressed.',
    'A steady pace. Coach nodded. Coach never nods.',
    'Perfect cadence. The island hummed along.',
  ],
  pier: [
    'The judges held up paddles. No numbers. Just paddles.',
    'You jumped. You landed. Both are traditionally good.',
    'A fine distance. One judge said "hm" very kindly.',
    'A record-shaped splash. Ripples are still arriving.',
  ],
  longstand: [
    'You stood. Sort of.',
    'You stood, and the island noticed.',
    'You stood well. Kevin is still thinking about it.',
    'You stood. Nothing moved you. Not even Kevin.',
  ],
};
export const RESULT_REPEAT = [
  ['Again, with the same knees. Brave.', 'A repeat. Consistency is a kind of progress.', 'Same result. I admire your commitment to it.'],
  ['A little better. I measured it with a very small ruler.', 'Slightly improved. Slightly is a word I enjoy.', 'Up one star-ish. Gently up.'],
  ['Two stars. Almost. Almost is a respectable place to live.', 'Very good. Please do not tell Dennis.', 'Lovely work. One more and I will faint politely.'],
  ['Three stars again. Show-off is not in my vocabulary. Yet.', 'Excellent. Compared to most people.', 'Flawless, again. I am running out of adjectives.'],
];
export const COACH_INTRO = {
  tree: 'You are a tree. A tree does not check its phone.',
  heron: 'The heron stands on one leg. It has never explained why.',
  warrior: 'Breathe in. Not like that. Like you mean it.',
  chair: 'There is no chair. Sit anyway. Believe in it.',
  fold: 'Fold. The floor is your friend. It has never let go.',
  plank: 'Plank. A flat line, but with feelings.',
  squat: 'Down is a direction. Go there, then come back.',
  lunge: 'Step out. Apologise to the floor. Return.',
  press: 'Lift the thing. Put it above the other thing.',
  hoop: 'Round and round. Do not stop. Do not think.',
  step: 'Feet. Left, right. The music will do the rest.',
  header: 'Use the head. It has been idle for years.',
  slack: 'Walk the line. If the line moves, agree with it.',
  tray: 'The tray tilts. The vitamins roll. Be the tray.',
  jog: 'Follow the scooter. The scooter knows the way.',
  pier: 'Run. Leap. Be judged. This is the island way.',
  longstand: 'Stand.',
};
export const BARKS = {
  ringIn: ['Good. Stay there.', 'The circle welcomes you.', 'Centred. Briefly.', 'Yes. That.'],
  ringOut: ['You have left the circle.', 'The circle is behind you.', 'I only counted the ones you noticed.', 'Wobble recorded.'],
  fall: ['Splash. I have filed it.', 'Water. It was always there.', 'That is why we practise.'],
  streak: ['Consistency. Disturbing.', 'You are doing it on purpose.', 'A streak. Do not look down.'],
  breathIn: ['In...', 'Breathe in. Not like that.'], breathOut: ['Out...', 'And out. Gently.'],
  rep: ['Last one.', 'Last one.', 'I lied. This is the last one.'],
  daze: ['Stars. Pretty ones.', 'The flip-flop wins.'],
  golden: ['A golden pineapple. Naturally.', 'Thirty points. Dennis is pale.'],
  late: ['Late, but loved.', 'A little rushed.'],
  hoopDrop: ['The hoop has chosen the floor.', 'Pick it up. It will forgive you.'],
  throw: ['Incoming. June is bored.', 'Catch it. Please.'],
  stitch: ['A stitch. It is only a stitch.', 'Slow down. The island is not going anywhere.'],
};
export const MORNING_REMARKS = [
  'Good morning. You look rested. I can\'t see. But you felt rested.',
  'Good morning. I have been standing here all night. I recommend it.',
  'Please step on me. I promise to be gentle. With the numbers.',
  'Another day. They keep arriving.',
  'You came back. I had a bet with Kevin. I won.',
];
export const WEIGH_REMARKS = {
  better: ['Lower than yesterday. I will pretend I am not impressed.', 'A better Wobble Age. Your ankles have been told.', 'Down a little. I see you, quietly.'],
  worse: ['Slightly older today. That happens. It happens to everyone.', 'Up a little. Perhaps the floor moved.', 'A touch higher. I blame nothing in particular.'],
  same: ['No change since yesterday. Which is, in a way, consistent.', 'The same number. A bold choice.'],
  first: ['Your Wobble Age is {n}. Is that close? No? I\'m so sorry.', 'Your Wobble Age is {n}. I did not make the rules. I did make the number.'],
};
export const WOBBLE_OPEN = ['Please step on me.', 'Hello! I\'m Ounce. Please step on me.'];
export const FEELING = [
  'You said {n}. I have written that down. In pen.',
  'You feel {n}. Noted. Gently ignored.',
  '{n}. Thank you. I will compare it with the facts.',
];
export const FILE_REMARKS = ['Thank you. I have written that down.', 'Noted. Filed. Mildly worried.', 'Understood. I will tell no one. Except the Jar.'];
export const ANSWER_REMARKS = [
  ['A sound like that has a future.', 'Hnng. Yes. We all contain one.', 'You have become the sound. I respect that.'],
  ['Chairs are sensitive. It will recover.', 'Not yet. It is only a matter of time.', 'It started it. Chairs often do.'],
  ['One is a perfectly good number.', 'All of them. That is an answer.', 'Depends who is watching. Everyone is watching.'],
  ['Fine. Fine is a very long word.', 'You do not speak. I understand. Mine do not either.', 'Which ones. We will begin with that.'],
  ['Distant. A healthy gap.', 'Improving. It has noticed.', 'It is complicated. The floor says the same.'],
  ['Please. A simple, polite knee.', 'Why. A philosophical knee.', 'Nothing. They have given up. I understand.'],
  ['Yes. How nice for you. Noted.', 'No. I am sorry. That is on the record now.', 'It\'s all graded.'],
];
export const ONE_LINERS = {
  jarDrip: ['Drip. That is a minute of you.', 'Another drip. The Jar is pleased. It is glass; it does not show it.'],
  goalDone: ['Coach\'s prescription: done. She will not say so.', 'Prescription complete. Coach has written "adequate".'],
  hammockEarly: ['Already? The day is mostly still here.', 'Resting early. The ankles will think they won.'],
  hammockOk: ['Sleep well. I will count the ceiling.', 'Goodnight. I will stand here and be accurate.'],
  dennisBeat: ['You beat Dennis. He is fine. He is looking at a wall.'],
  marguerite: ['Marguerite scored higher. She sends her love, and a very slow wave.'],
};
export const CLASSMATE = {
  marguerite: ['Both hips, new. Knee, new. Opinions, original.', 'I was good at this before you were born. Twice.', 'Lovely form, dear. Keep going. I will wait.'],
  dennis: ['I used to do this professionally. Not this. Something near it.', 'It\'s fine. It\'s just the one leg.', 'The deck chair started it. I want that known.'],
  june: ['I\'m pacing myself.', 'My gran says you\'re doing your best. She said it very slowly.', 'Are you nearly done?'],
  coach: ['I am eighty-one. I say this so that you feel something.', 'Stillness is a muscle. So is regret. We train both here.', 'Good. Again. That was also good. Again.', 'Hold. You may blink on Thursday.', 'Your left knee has wandered off. Please collect it.', 'The floor is your friend. It has never once let go.'],
};
export const SAMPLES = [
  'Hello! I\'m Ounce. Please step on me.', 'Ow.', 'That was a joke. I can\'t feel pain. I can only keep records.', 'How old do you feel? This is not binding.',
  'Your Wobble Age is 68. Is that close? No? I\'m so sorry.', 'Thank you. I have written that down.', 'You wobbled 14 times. I only counted the ones you noticed.',
  'Your left side is doing very well. I\'ll let your right side know.', 'No change since yesterday. Which is, in a way, consistent.', 'Excellent! ...Compared to Dennis.',
  'I\'m not angry. Scales don\'t get angry. We get accurate.', 'Have you been stretching? Please don\'t lie. I\'m very sensitive.', 'Today\'s concern: your ankles. I\'ve been concerned all night.',
  'Good morning. You look rested. I can\'t see. But you felt rested.', 'Kevin has been with us eleven years. He has never once held a pose.',
  'This is a recording. The person in it is doing better than you.', 'I have been adding seven. To everyone. For years. It felt motivating.', 'See you tomorrow. Bring your knees.',
];
export const CONCERNS = ['your ankles', 'your left knee', 'your posture, which is a rumour', 'your shoulders, which are doing their best', 'the way you stand up', 'your balance, whatever that is', 'your relationship with stairs'];
export const MISC = {
  titleHint: 'Press any button. Gently.', touchMsg: 'Controller or keyboard required', notMedical: 'This is not medical advice. Ounce is a scale.',
  attractLines: ['This is a recording. The person in it is doing better than you.', 'The recording has never fallen over. It is not a person.', 'Please press any button. The recording is tired.', 'This is the Dot. Keep it in the circle. That is the game.'],
};
export function allLines() {
  const out = [];
  const walk = (v) => { if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
  walk([RESULT_FIRST, RESULT_REPEAT, COACH_INTRO, BARKS, MORNING_REMARKS, WEIGH_REMARKS, WOBBLE_OPEN, FEELING, FILE_REMARKS, ANSWER_REMARKS, ONE_LINERS, CLASSMATE, SAMPLES, CONCERNS]);
  return out;
}
export const pick = (arr, r) => arr[Math.floor(r() * arr.length) % arr.length];
