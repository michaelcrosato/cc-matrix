/** Original chiptune. Same step count on every track of a pattern. */

const lead = { wave: 'triangle', volume: 0.22, attack: 0.01, decay: 0.14 };
const bass = { wave: 'square', duty: 0.125, volume: 0.1, attack: 0.01, decay: 0.1 };
const tick = { wave: 'noise', volume: 0.08, attack: 0.001, decay: 0.04 };

function stepsOf(row) {
  return row.trim().split(/\s+/);
}

function song(bpm, leadRow, bassRow, noiseRow) {
  const rows = { lead: stepsOf(leadRow), bass: stepsOf(bassRow), tick: stepsOf(noiseRow) };
  const n = Math.max(rows.lead.length, rows.bass.length, rows.tick.length);
  const pattern = {};
  for (const [name, steps] of Object.entries(rows)) {
    while (steps.length < n) steps.push('.');
    pattern[name] = steps.join(' ');
  }
  return {
    bpm,
    loop: true,
    tracks: { lead, bass, tick },
    patterns: { a: pattern },
    order: ['a'],
  };
}

const REST = 'C6 . . . . . . . . . . . . . . .';

export const SONGS = {
  title: song(72,
    'A4 . E4 . G4 . A4 . C5 . A4 . G4 . E4',
    'A2 . . . E2 . . . A2 . . . E2 . . .',
    REST),
  ward: song(96,
    'C5 . E5 G5 . E5 . D5 . C5 . B4 . C5 .',
    'C3 . . . G2 . . . A2 . . . G2 . . .',
    REST),
  calm: song(84,
    'D4 F4 . A4 . G4 . F4 E4 . D4 . E4 . D4 .',
    'D2 . . . A2 . . . D2 . . . A2 . . .',
    REST),
  tense: song(120,
    'A4 A4 C5 . A4 E5 . D5 C5 . A4 C5 . E5 .',
    'A2 . A2 . E2 . E2 . A2 . E2 . A2 . .',
    'C6 . . C6 . . C6 . . C6 . . C6 . . .'),
  critical: song(144,
    'E5 E5 G5 E5 B5 . B5 G5 E5 . G5 E5 B5 . E5 .',
    'E2 E2 . E2 B2 . E2 . E2 E2 . E2 B2 . E2 .',
    'C7 . C7 . C6 . C7 . C7 . C7 . C6 . C7 .'),
  boss: song(100,
    'D4 . F4 . A4 . C5 . D5 C5 A4 . F4 . D4',
    'D2 . . . A2 . . . D2 . . . C2 . . .',
    'C6 . . . C6 . . . C5 . . . C6 . . .'),
  sparse: song(64,
    'E4 . . G4 . . A4 . . G4 . . E4 . . .',
    'E2 . . . . . A2 . . . . . E2 . . .',
    REST),
  fanfare: song(132,
    'C5 E5 G5 C6 . G5 E5 C5 G4 C5 E5 G5 C6 . . .',
    'C3 . G2 . C3 . G2 . C3 . G2 . C3 . . .',
    'C6 . . C6 . . C6 . . C6 . . C6 . . .'),
  sad: song(68,
    'A4 . G4 . E4 . D4 . C4 . D4 . E4 .',
    'A2 . . . E2 . . . A2 . . . E2 . . .',
    REST),
};

const BOSSES = new Set(['op5', 'op7', 'op8', 'op9', 'sop5', 'sop7', 'sop8']);

/** Which song fits this screen. Null means silence. */
export function trackFor(mode, sim) {
  if (mode === 'results') {
    const rank = sim?.rank;
    return rank === 'S' || rank === 'A' ? 'fanfare' : 'sad';
  }
  if (mode === 'story' || mode === 'brief' || mode === 'credits') return 'ward';
  if (mode === 'op' || mode === 'pause' || mode === 'dev' || mode === 'attract' || mode === 'session') {
    const id = sim?.id || '';
    if (id === 'op10') return 'sparse';
    if (id === 'op9' || id === 'sop9') return (sim?.stageIndex || 0) >= 2 ? 'boss' : null;
    if (BOSSES.has(id)) return 'boss';
    const v = sim?.tables?.[0]?.vitals ?? 80;
    if (v > 50) return 'calm';
    if (v > 30) return 'tense';
    return 'critical';
  }
  return 'title';
}
