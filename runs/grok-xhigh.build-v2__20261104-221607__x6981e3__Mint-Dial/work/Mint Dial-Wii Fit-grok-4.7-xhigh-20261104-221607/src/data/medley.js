/** Three timed events. The picks come from a seeded stream. */
export const MEDLEY_SPAN = 185;

export function medleyPicks(rand) {
  const poses = ['tree', 'heron', 'warrior'];
  const beats = ['hoop', 'step', 'squat'];
  return {
    still: poses[Math.floor(rand() * poses.length)],
    beat: beats[Math.floor(rand() * beats.length)],
    lean: 'header',
  };
}

/** Windows on the shared clock, in seconds. */
export function medleyWindow(t) {
  if (t < 55) return { index: 0, phase: 'play', local: t };
  if (t < 65) return { index: 0, phase: 'gap', local: t - 55 };
  if (t < 120) return { index: 1, phase: 'play', local: t - 65 };
  if (t < 130) return { index: 1, phase: 'gap', local: t - 120 };
  if (t < 185) return { index: 2, phase: 'play', local: t - 130 };
  return { index: 2, phase: 'done', local: t - 185 };
}

export const EVENT_NAMES = ['Stillness', 'Beat', 'Balance'];

export function normalise(raw, max) {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(1000, Math.round((raw / max) * 1000)));
}
