/** Step charts. A bar is 8 eighth-notes. Cell time is half a beat. */

export const CELL = {
  L: 'L', R: 'R', B: 'B',
  left: '<', right: '>', up: '^', down: 'v', rest: '.',
};

const PATTERNS = {
  walk: 'L...R...',
  jog: 'L.R.L.R.',
  both: 'L.R.B...',
  doubles: 'L.L.R.R.',
  lean: '<...>...',
  leanStep: 'L.R.<...',
  nod: '^...v...',
  busy: 'LRL.RLR.',
  stamp: 'B.B.LRB.',
  flourish: 'L.R.LRLR',
};

function bars(pattern, count) {
  const cell = pattern.padEnd(8, '.').slice(0, 8);
  const out = [];
  for (let i = 0; i < count; i++) out.push(...cell);
  return out;
}

function chart(bpm, parts) {
  const cells = parts.flatMap(([pattern, count]) => bars(pattern, count));
  return { bpm, cells, cellDt: 30 / bpm };
}

export const CHARTS = {
  1: chart(104, [
    ['.', 4],
    [PATTERNS.walk, 8],
    [PATTERNS.jog, 8],
    [PATTERNS.both, 8],
    [PATTERNS.lean, 4],
    [PATTERNS.jog, 8],
    [PATTERNS.walk, 4],
  ]),
  2: chart(116, [
    ['.', 4],
    [PATTERNS.jog, 4],
    [PATTERNS.doubles, 4],
    [PATTERNS.leanStep, 4],
    [PATTERNS.nod, 4],
    [PATTERNS.busy, 4],
    [PATTERNS.jog, 4],
    [PATTERNS.walk, 2],
  ]),
  3: chart(124, [
    ['.', 2],
    [PATTERNS.busy, 4],
    [PATTERNS.stamp, 4],
    [PATTERNS.flourish, 4],
    [PATTERNS.nod, 2],
    [PATTERNS.leanStep, 4],
    [PATTERNS.busy, 4],
    [PATTERNS.stamp, 2],
  ]),
  session: chart(116, [
    [PATTERNS.jog, 8],
    [PATTERNS.lean, 4],
    [PATTERNS.both, 8],
    [PATTERNS.walk, 4],
  ]),
};

export function notesOf(chartDef) {
  const notes = [];
  chartDef.cells.forEach((cell, index) => {
    if (cell === '.' ) return;
    notes.push({ index, cell, time: index * chartDef.cellDt, lean: '< > ^ v'.includes(cell) });
  });
  return notes;
}
