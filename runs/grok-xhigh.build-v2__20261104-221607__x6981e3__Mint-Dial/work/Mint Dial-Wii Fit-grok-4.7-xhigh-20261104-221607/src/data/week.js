/** One small day at a time. Week 2 has no new script. */
export const DAYS = [
  {
    day: 1,
    test: 'still',
    goal: { kind: 'pair', id: 'tree' },
    opens: ['tree', 'heron', 'squat', 'hoop'],
    concern: 'your ankles',
    beat: 'Please step on me. This dot is you. Keep it in the circle. That is the game.',
  },
  {
    day: 2,
    test: 'lean',
    goal: { kind: 'stars', n: 2 },
    opens: ['header', 'lunge', 'warrior'],
    locker: true,
    concern: 'the deck chair',
    beat: 'Dennis explains the deck chair. Nobody asked.',
  },
  {
    day: 3,
    test: 'chase',
    goal: { kind: 'fresh' },
    opens: ['step', 'slack', 'chair'],
    concern: 'the scale',
    beat: 'Has anyone ever checked that scale? Ounce would like to weigh in. No.',
  },
  {
    day: 4,
    test: 'still',
    goal: { kind: 'count', n: 3 },
    opens: ['tray', 'press', 'fold'],
    concern: 'the plumb line',
    beat: 'Coach hangs her line beside the scale. You are leaning. The island is leaning.',
  },
  {
    day: 5,
    test: 'lean',
    goal: { kind: 'beat', who: 'dennis' },
    opens: ['jog', 'pier', 'plank'],
    concern: 'the number 7',
    beat: 'Kevin sits on the scale. The dial reads 7. Nobody says anything.',
  },
  {
    day: 6,
    test: 'chase',
    goal: { kind: 'stars', n: 3 },
    opens: ['hard'],
    concern: 'a speech',
    beat: 'Ounce rehearses behind the jar. The speech is not ready. Neither is the jar.',
  },
  {
    day: 7,
    test: 'still',
    goal: { kind: 'id', id: 'longstand' },
    opens: ['longstand'],
    concern: 'standing',
    beat: 'Stand.',
  },
];

export function dayInfo(day) {
  if (day >= 1 && day <= 7) return DAYS[day - 1];
  return {
    day,
    test: ['still', 'lean', 'chase'][(day - 1) % 3],
    goal: { kind: 'stars', n: 1 },
    opens: [],
    concern: 'tomorrow',
    beat: 'See you tomorrow. Bring your knees.',
    week2: true,
  };
}

export function isUnlocked(def, day, hard) {
  if (!def) return false;
  if (hard && day < 6) return false;
  if (def.id === 'longstand') return day >= 7;
  return day >= def.unlock;
}
