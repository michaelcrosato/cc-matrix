// The week. A new day is a new row.
export const DAYS = [
  { day: 1, test: 'stillness', goal: { kind: 'poseAndOne', text: 'Holding Still and one other' }, opens: 'Apologetic Tree, Startled Heron, Squats of Regret, Hoop Economics',
    beat: [] },
  { day: 2, test: 'lean', goal: { kind: 'stars', n: 2, text: 'Two stars in anything' }, opens: 'Coconut Header, Apology Lunges, Reluctant Warrior, Locker Room',
    beat: [
      'dennis: So. You are wondering about the deck chair.',
      'ounce: Nobody asked, Dennis.',
      'dennis: It folded. I folded. There was a moment where we were both folding.',
      'dennis: It\'s fine. It\'s just the one leg.',
      { who: 'ounce', text: 'Thank you. I have written that down.', mood: 'smug' },
    ] },
  { day: 3, test: 'chase', goal: { kind: 'newThing', text: 'Something you haven\'t done' }, opens: 'Step Class, Slackline, The Chair Nobody Asked For',
    beat: [
      'marguerite: Good morning, dear. Both hips, new. Knee, new. Opinions, original.',
      'marguerite: Tell me. Has anyone ever checked that scale?',
      { who: 'ounce', text: 'I\'d like to weigh in on that. No.', mood: 'alarm' },
      'marguerite: No. I thought not.',
    ] },
  { day: 4, test: 'stillness', goal: { kind: 'count', n: 3, text: 'Three activities' }, opens: 'Vitamin Tray, Overhead Mortgage, Tax Season',
    beat: [
      { who: 'coach', text: 'Hold still, please.', run: 'plumb' },
      'coach: You are leaning.',
      { who: 'ounce', text: 'The island is leaning.', mood: 'concern' },
      'coach: Mm.',
      { who: 'ounce', text: 'I\'m not angry. Scales don\'t get angry. We get accurate.', mood: 'droop' },
    ] },
  { day: 5, test: 'lean', goal: { kind: 'beatDennis', text: 'Beat Dennis at anything' }, opens: 'Island Jog, Pier Jump, Plank Negotiation',
    beat: [
      { who: 'kevin', text: 'Squawk.', run: 'kevinSits' },
      { who: 'ounce', text: 'Kevin has been with us eleven years. He has never once held a pose.', mood: 'neutral' },
      { who: 'narrator', text: 'Kevin weighs, it is commonly agreed, nothing much. The dial reads 7.', run: 'dialSeven' },
      { who: 'narrator', text: 'Nobody says anything.' },
      { who: 'ounce', text: 'Good morning. Please go about your day.', mood: 'smug', run: 'kevinLeaves' },
    ] },
  { day: 6, test: 'chase', goal: { kind: 'stars', n: 3, text: 'Three stars anywhere' }, opens: 'Hard versions of everything',
    beat: [
      { who: 'narrator', text: 'Ounce is behind the Sweat Jar. Ounce believes this counts as hiding.', run: 'ounceHides' },
      { who: 'ounce', text: 'Everyone. Thank you for coming. I have been... no.', mood: 'concern' },
      { who: 'ounce', text: 'Friends. Clients. Kevin. Over the years, the numbers have... no.', mood: 'droop' },
      { who: 'ounce', text: 'Hello. Good morning. You look rested. I can\'t see. Oh dear.', mood: 'droop', run: 'ounceBack' },
    ] },
  { day: 7, test: 'stillness', goal: { kind: 'stand', text: 'Stand.' }, opens: 'The Long Stand',
    beat: [
      'coach: Today there is one exercise.',
      'coach: Come to the terrace. Bring everyone. They are already there.',
    ] },
];

/** Week 2 and after: the same days in a new rotation, with no story beats. */
export const DAILY_GOALS = [
  { kind: 'stars', n: 2, text: 'Two stars in anything' },
  { kind: 'count', n: 3, text: 'Three activities' },
  { kind: 'beatDennis', text: 'Beat Dennis at anything' },
  { kind: 'stars', n: 3, text: 'Three stars anywhere' },
  { kind: 'newThing', text: 'Something you haven\'t done' },
  { kind: 'beatJune', text: 'Beat June at anything' },
  { kind: 'beatMarguerite', text: 'Beat Marguerite. Good luck.' },
];
export const TESTS = ['stillness', 'lean', 'chase'];
export const AGE_OFFSET = 7; // I have been adding seven. To everyone. For years. It felt motivating.
