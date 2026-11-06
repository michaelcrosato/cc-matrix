// The week as data. A new day needs no code.
export const WEEK = [
  { day: 1, test: 'stillness', goal: { kind: 'poseAndOther' }, goalText: 'Holding Still and one other', opens: ['tree', 'heron', 'squats', 'hoop'] },
  { day: 2, test: 'lean', goal: { kind: 'stars', n: 2 }, goalText: '2 stars in anything', opens: ['header', 'lunges', 'warrior', 'locker'] },
  { day: 3, test: 'chase', goal: { kind: 'first' }, goalText: 'Something you haven\'t done', opens: ['step', 'slackline', 'chair'] },
  { day: 4, test: 'stillness', goal: { kind: 'count', n: 3 }, goalText: '3 activities', opens: ['tray', 'press', 'fold'] },
  { day: 5, test: 'lean', goal: { kind: 'beat', who: 'dennis' }, goalText: 'Beat Dennis at anything', opens: ['jog', 'pier', 'plank'] },
  { day: 6, test: 'chase', goal: { kind: 'stars', n: 3 }, goalText: '3 stars anywhere', opens: [], hard: true },
  { day: 7, test: 'stillness', goal: { kind: 'did', id: 'longstand' }, goalText: 'Stand.', opens: ['longstand'] },
];
export const weekDay = (d) => WEEK[Math.min(WEEK.length, Math.max(1, d)) - 1];
