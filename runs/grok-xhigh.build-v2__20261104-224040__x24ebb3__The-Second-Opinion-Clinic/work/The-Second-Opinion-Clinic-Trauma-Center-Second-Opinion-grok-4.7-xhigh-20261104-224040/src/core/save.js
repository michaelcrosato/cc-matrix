const KEY = 'soc:save:v1';
const mem = { json: null };

export function emptySave() {
  return {
    version: 1,
    difficulty: 'resident',
    scenes: [],
    ops: {},
    log: false,
    credits: false,
    quiet: false,
  };
}

export function writeSave(save) {
  const json = JSON.stringify(save);
  mem.json = json;
  try {
    globalThis.localStorage?.setItem(KEY, json);
  } catch {
    /* private mode */
  }
  return save;
}

export function readSave() {
  try {
    const s = globalThis.localStorage?.getItem(KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* fall through */
  }
  return mem.json ? JSON.parse(mem.json) : null;
}

export function clearSave() {
  mem.json = null;
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
