// Step Class charts: one string a bar, eight eighth notes. L and R are feet, '.' is a rest.
const intro = ['........', '........', 'L...R...', 'L...R...'];
const verse = ['L...R...', 'L...R...', 'L.R.L...', 'R.L.R...', 'L...R...', 'L.R.L.R.', 'L...R...', 'L.R.L...'];
const chorus = ['L.R.L.R.', 'L.R.L.R.', 'LR..LR..', 'L.R.L.R.', 'R.L.R.L.', 'LR..LR..', 'L.R.LRL.', 'R.L.R...'];
const breakdown = ['L.......', 'R.......', 'L...R...', 'L.R.L.R.'];
const final = ['L.R.L.R.', 'LR.LR.L.', 'R.L.R.L.', 'LR.LR.R.', 'L.R.L.R.', 'LRLR....', 'L.R.LRL.', 'R.L.R...'];

export const STEP_CHART = [...intro, ...verse, ...chorus, ...breakdown, ...final];
/** Hard: the same song, busier feet. */
export const STEP_CHART_HARD = STEP_CHART.map((b, i) => (i < 4 ? b : b.replace(/\.(?=[LR])/g, (m, at) => (at % 4 === 1 ? (b[at + 1] === 'L' ? 'R' : 'L') : m))));
/** The Medley's shorter version: 24 bars, about 55 s. */
export const STEP_CHART_MEDLEY = [...intro, ...verse, ...chorus, ...final.slice(0, 4)];
export const WINDOWS = { perfect: 0.055, good: 0.1, ok: 0.14 };
export const WEIGHTS = { perfect: 1, good: 0.7, ok: 0.4 };
