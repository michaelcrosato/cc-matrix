const pose = (id, name, clip, ring, duration, day, breath, twist) => ({ id, name, clip, ring, duration, day, breath, twist, kind: 'pose', station: 'Pavilion', song: 'still', stars: [45, 70, 90], camera: 'lanes', hard: { ring: ring * .72, noise: 1.25 }, goal: 'Keep your dot inside the ring.', controls: 'Lean gently. Correct before you drift.' });
const rep = (id, name, clip, day, reps, tempo, axis) => ({ id, name, clip, day, reps, tempo, axis, duration: reps * tempo, kind: 'reps', station: 'Rep Shed', song: 'reps', stars: [55, 75, 90], hard: { tempoScale: .8 }, goal: 'Match the moving marker.', controls: 'Lean to lower. Ease back to rise.', camera: 'lanes' });
export const ACTIVITIES = [
  pose('tree', 'Apologetic Tree', 'Tree', .40, 25, 1, 0, ''),
  pose('heron', 'Startled Heron', 'Heron', .36, 25, 1, 0, 'wander'),
  pose('warrior', 'Reluctant Warrior', 'Warrior', .32, 30, 2, 8, 'breath'),
  pose('chair', 'The Chair Nobody Asked For', 'Chair', .30, 30, 3, 8, 'ramp'),
  pose('fold', 'Tax Season', 'Fold', .28, 30, 4, 6, 'wander'),
  pose('plank', 'Plank Negotiation', 'Plank', .24, 35, 5, 6, 'tremor'),
  rep('squat', 'Squats of Regret', 'SquatRep', 1, 10, 3.2, 'y'),
  rep('lunge', 'Apology Lunges', 'LungeRep', 2, 10, 3.2, 'x'),
  rep('press', 'Overhead Mortgage', 'Press', 4, 8, 3.6, 'up'),
  { id: 'hoop', name: 'Hoop Economics', kind: 'hoop', station: 'Beat Beach', song: 'hoop', day: 1, duration: 60, clip: 'Idle', stars: [35, 70, 110], goal: 'Circle to keep the hoops up.', controls: 'Roll W-D-S-A or circle the stick / mouse.', hard: { speed: 1.25 }, camera: 'lanes' },
  { id: 'step', name: 'Step Class', kind: 'step', station: 'Beat Beach', song: 'step', day: 3, duration: 32 * 4 * 60 / 104, clip: 'Idle', stars: [55, 75, 90], bpm: 104, goal: 'Step when the footprints meet the line.', controls: 'F / J, L1 / R1, or left / right click.', hard: { window: .75 }, camera: 'lanes' },
  { id: 'header', name: 'Coconut Header', kind: 'header', station: 'Lagoon', song: 'lagoon', day: 2, duration: 60, clip: 'Idle', stars: [150, 400, 800], goal: 'Head coconuts. Dodge flip-flops.', controls: 'Lean left and right. Gold is good.', hard: { interval: .8 }, camera: 'lanes' },
  { id: 'slack', name: 'Slackline', kind: 'slack', station: 'Lagoon', song: 'lagoon', day: 3, duration: 75, clip: 'Heron', stars: [1, 2, 3], goal: 'Cross the lagoon. Keep your balance.', controls: 'Forward to walk. Stop to steady yourself.', hard: { noise: 1.3 }, camera: 'slack' },
  { id: 'tray', name: 'Vitamin Tray', kind: 'tray', station: 'Lagoon', song: 'lagoon', day: 4, duration: 60, clip: 'Idle', stars: [32, 48, 64], goal: 'Roll each colour into its matching cup.', controls: 'Lean to tilt the tray. Plan your route.', hard: { board: 2 }, camera: 'tray' },
  { id: 'jog', name: 'Island Jog', kind: 'jog', station: 'Jogging Path', song: 'jog', day: 5, duration: 90, clip: 'Jog', stars: [55, 75, 90], goal: 'Alternate your feet. Follow Coach.', controls: 'F / J to jog. Lean to collect water.', hard: { cadence: 1.15 }, camera: 'jog' },
  { id: 'pier', name: 'Pier Jump', kind: 'pier', station: 'Lagoon', song: 'lagoon', day: 5, duration: 30, clip: 'Chair', stars: [18, 28, 38], goal: 'Tuck. Jump at the lip. Cannonball.', controls: 'Lean down. Confirm to jump, then splash.', hard: { window: .75 }, camera: 'pier' },
  { id: 'long', name: 'The Long Stand', kind: 'long', station: 'Plaza', song: 'long', day: 7, duration: 90, ring: .40, clip: 'Idle', stars: [45, 70, 90], goal: 'Stand. The island will have opinions.', controls: 'Keep the dot in the ring. You may blink.', hard: { noise: 1.2 }, camera: 'lanes' }
];
export const BY_ID = Object.fromEntries(ACTIVITIES.map(a => [a.id, a]));
export const STATIONS = [
  { id: 'Pavilion', label: 'Pavilion of Holding Still', x: -11, z: 3, color: 'sky', short: 'Pavilion', number: '01' },
  { id: 'Rep Shed', label: 'The Rep Shed', x: 11, z: 3, color: 'orange', short: 'Rep Shed', number: '02' },
  { id: 'Beat Beach', label: 'Beat Beach', x: 12, z: -10, color: 'plum', short: 'Beat Beach', number: '03' },
  { id: 'Lagoon', label: 'Lagoon Games', x: -12, z: -10, color: 'teal', short: 'Lagoon Games', number: '04' },
  { id: 'Jogging Path', label: 'Jogging Path', x: 0, z: 11, color: 'lime', short: 'Jogging Path', number: '05' },
  { id: 'jar', label: 'Sweat Jar', x: 4, z: -4, color: 'cyan', short: 'Sweat Jar' },
  { id: 'locker', label: 'Locker Room', x: -4, z: -4, color: 'sky', short: 'Locker Room' },
  { id: 'records', label: 'Hall of Numbers', x: 0, z: -8, color: 'white', short: 'Hall of Numbers' },
  { id: 'hammock', label: 'Hammock: end the day', x: 14, z: 10, color: 'sand', short: 'End the day' }
];
export const STEP_CHARTS = ['L...R...', 'L.R.L.R.', 'L.R.LR.R', 'LR..LR..', 'L.R.L.R.'];
export function stepNotes(bpm = 104) {
  const result = [], sections = [4, 8, 8, 4, 8]; let bar = 0;
  sections.forEach((n, i) => { for (let k = 0; k < n; k++, bar++) for (let j = 0; j < 8; j++) { const side = STEP_CHARTS[i][j]; if (side !== '.') result.push({ t: (bar * 4 + j / 2) * 60 / bpm, side, hit: false }); } });
  return result;
}
export const TRAY_BOARDS = [ ['#########','#R.....B#','#..ooo..#','#..ooo..#','#...oo..#','#########'], ['#########','#R..#..B#','#...#...#','#.ooooo.#','#..ooo..#','#########'], ['#########','#R..#..B#','#...Y...#','#.ooooo.#','#..ooo..#','###..####'] ];
