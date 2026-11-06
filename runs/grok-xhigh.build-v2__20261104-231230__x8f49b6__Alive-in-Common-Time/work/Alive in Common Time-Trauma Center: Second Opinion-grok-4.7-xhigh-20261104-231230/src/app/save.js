/** Progress and settings. Never called during a session or an attract demo. */

const KEY = 'st-alder-chart';

export function emptySave() {
  return {
    v: 1,
    difficulty: 'resident',
    storyPos: 0,
    intro: false,
    cleared: [],
    ranks: {},
    unlocked: false,
    settings: null,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return emptySave();
    return { ...emptySave(), ...data, cleared: data.cleared || [], ranks: data.ranks || {} };
  } catch {
    return emptySave();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
