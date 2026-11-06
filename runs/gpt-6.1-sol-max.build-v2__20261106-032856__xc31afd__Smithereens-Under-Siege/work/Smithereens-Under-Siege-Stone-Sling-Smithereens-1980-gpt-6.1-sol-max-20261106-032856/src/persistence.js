export const SAVE_KEY = 'smithereens-under-siege:tour:v1';
export function loadTour(storage) {
  try {
    const s = JSON.parse(storage.getItem(SAVE_KEY));
    if (
      s?.version !== 1 ||
      !Number.isInteger(s.next) ||
      s.next < 1 ||
      s.next >= 10 ||
      !Number.isInteger(s.seed) ||
      s.seed < 0 ||
      s.seed > 0xffffffff
    )
      return null;
    if (
      !Array.isArray(s.totals) ||
      s.totals.length !== 2 ||
      !s.totals.every((n) => Number.isSafeInteger(n) && n >= 0 && n < 1e7) ||
      !Array.isArray(s.results) ||
      s.results.length !== s.next
    )
      return null;
    const totals = [0, 0];
    for (let i = 0; i < s.results.length; i++) {
      const r = s.results[i];
      if (
        r.bout !== i ||
        ![-1, 0, 1].includes(r.winner) ||
        !Array.isArray(r.direct) ||
        r.direct.length !== 2 ||
        !r.direct.every((n) => Number.isSafeInteger(n) && n >= 0) ||
        !Array.isArray(r.banked) ||
        r.banked.length !== 2
      )
        return null;
      for (let seat = 0; seat < 2; seat++) {
        if (
          r.banked[seat] !== (r.winner === seat ? r.direct[seat] * (i + 1) : 0)
        )
          return null;
        totals[seat] += r.banked[seat];
      }
    }
    if (totals.some((n, i) => n !== s.totals[i])) return null;
    if (s.cheated !== undefined && typeof s.cheated !== 'boolean') return null;
    return s;
  } catch {}
  return null;
}
export function saveTour(storage, s) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, ...s }));
    return true;
  } catch {
    return false;
  }
}
export function eraseTour(storage) {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {}
}
