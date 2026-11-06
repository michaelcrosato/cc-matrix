// The week: tests, prescriptions, unlocks and story beats. Plain data; a new day needs no code.
export const WEEK = [
  { day: 1, test: 'still', goal: { kind: 'poseAndOther', text: 'Holding Still and one other' }, opens: ['tree', 'heron', 'squat', 'hoop'],
    beat: [{ who: 'ounce', text: 'Hello! I\'m Ounce. Please step on me.' }, { who: 'ounce', text: 'Ow.', mood: 'whip' }, { who: 'ounce', text: 'That was a joke. I can\'t feel pain. I can only keep records.' }] },
  { day: 2, test: 'lean', goal: { kind: 'stars', n: 2, text: '2 stars in anything' }, opens: ['header', 'lunge', 'warrior', 'locker'],
    beat: [{ who: 'dennis', text: 'It\'s fine. It\'s just the one leg. The deck chair started it.' }, { who: 'dennis', text: 'Let me tell you about the deck chair.' }, { who: 'june', text: 'Nobody asked.' }] },
  { day: 3, test: 'chase', goal: { kind: 'new', text: 'Something you haven\'t done' }, opens: ['step', 'slack', 'chair'],
    beat: [{ who: 'marguerite', text: 'Has anyone ever checked that scale?' }, { who: 'ounce', text: 'I\'d like to weigh in on that.', mood: 'smug' }, { who: 'ounce', text: 'No.', mood: 'whip' }] },
  { day: 4, test: 'still', goal: { kind: 'count', n: 3, text: '3 activities' }, opens: ['tray', 'press', 'fold'],
    beat: [{ who: 'coach', text: 'You are leaning.' }, { who: 'ounce', text: 'The island is leaning.', mood: 'worried' }, { who: 'coach', text: 'The plumb line does not lean.' }] },
  { day: 5, test: 'lean', goal: { kind: 'dennis', text: 'Beat Dennis at anything' }, opens: ['jog', 'pier', 'plank'],
    beat: [{ who: 'kevin', text: 'Squawk.' }, { who: 'ounce', text: 'Kevin has sat on me. The dial reads seven.', mood: 'worried' }, { who: 'ounce', text: 'Nobody say anything.', mood: 'droop' }] },
  { day: 6, test: 'chase', goal: { kind: 'stars', n: 3, text: '3 stars anywhere' }, opens: ['hard'],
    beat: [{ who: 'ounce', text: 'I am rehearsing a speech. Please do not listen.', mood: 'worried' }, { who: 'ounce', text: 'Dear everyone. I have been... measuring... with enthusiasm.', mood: 'droop' }] },
  { day: 7, test: 'still', goal: { kind: 'longstand', text: 'Stand.' }, opens: ['longstand'],
    beat: [{ who: 'coach', text: 'Today you stand.' }, { who: 'ounce', text: 'Are you happy? Wait. Do not answer that.', mood: 'worried' }] },
];
export const dayOf = (n) => WEEK[Math.min(WEEK.length, Math.max(1, n)) - 1];
export function goalDone(day, S, ACT) {
  const g = dayOf(day).goal, today = S.doneToday ?? [];
  switch (g.kind) {
    case 'poseAndOther': return today.some((e) => ACT[e.id]?.kind === 'still') && today.some((e) => e.id && ACT[e.id]?.kind !== 'still' || today.filter((x) => ACT[x.id]?.kind === 'still').length >= 2);
    case 'stars': return today.some((e) => e.stars >= g.n);
    case 'new': return today.some((e) => e.first);
    case 'count': return new Set(today.map((e) => e.id)).size >= g.n;
    case 'dennis': return !!S.beatDennisToday;
    case 'longstand': return !!S.ended || today.some((e) => e.id === 'longstand');
    default: return false;
  }
}
