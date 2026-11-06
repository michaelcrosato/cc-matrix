// Saves and settings: guarded localStorage under a versioned key. In a hub session the client hands
// the page an empty store; a replay or a test can swap the store.
const KEY = 'trauma-central-second-stitch:v1';

export const DEFAULT_SETTINGS = Object.freeze({
  sound: 0.8, voices: 0.8, glyphs: 'playstation', aimAssist: 'low', cursorSpeed: 1, rumble: true, giftMode: 'hold', look: 'surgical', pixelSize: 1, shake: 1, reduceFlashes: false, textSpeed: 1, difficulty: 'resident',
});
export const newProgress = () => ({ episode: 0, stage: 'scene', difficulty: 'resident', cleared: {}, finished: false, retries: {} });

const store = () => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };

export function loadSave() {
  const s = store();
  let data = null;
  if (s) { try { data = JSON.parse(s.getItem(KEY) ?? 'null'); } catch { data = null; } }
  return {
    settings: { ...DEFAULT_SETTINGS, ...(data?.settings ?? {}) },
    progress: data?.progress ? { ...newProgress(), ...data.progress } : null,
    log: data?.log ?? {},
    hasSave: !!data?.progress,
  };
}
export function writeSave(save) {
  const s = store();
  if (!s) return false;
  try { s.setItem(KEY, JSON.stringify({ settings: save.settings, progress: save.progress, log: save.log })); return true; } catch { return false; }
}
export const SAVE_KEY = KEY;
