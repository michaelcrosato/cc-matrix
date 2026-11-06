export const EVENT_SECONDS = 55;
export const BREAK_SECONDS = 10;
export const MEDLEY_SECONDS = EVENT_SECONDS * 3 + BREAK_SECONDS * 2;

export function pickMedley(random) {
  const choose = choices => choices[Math.floor(random() * choices.length)];
  return [choose(['tree', 'heron', 'warrior']), choose(['squats', 'hoop', 'step']), 'header'];
}

export function medleyWindow(milliseconds) {
  const seconds = milliseconds / 1000;
  if (seconds < 0) return { phase: 'countdown', index: 0, remaining: -seconds };
  if (seconds >= MEDLEY_SECONDS) return { phase: 'finished', index: 2, remaining: 0 };
  const span = EVENT_SECONDS + BREAK_SECONDS;
  const index = Math.min(2, Math.floor(seconds / span));
  const elapsed = seconds - index * span;
  if (elapsed >= EVENT_SECONDS) return { phase: 'break', index, remaining: span - elapsed };
  return { phase: 'event', index, remaining: EVENT_SECONDS - elapsed };
}
