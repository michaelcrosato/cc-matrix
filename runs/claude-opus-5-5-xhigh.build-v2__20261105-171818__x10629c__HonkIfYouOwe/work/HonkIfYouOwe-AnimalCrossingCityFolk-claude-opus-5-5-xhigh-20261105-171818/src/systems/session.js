// Saves and clean exits. Autosave means nothing is ever lost; Inspector Pimm is only comedy.
import { saveWorld, SESSION_KEY } from '../core/save.js';
import { store } from '../core/storage.js';

export function saveNow(g) {
  if (g.demo || !g.world || g.world.story.stage === 'new') return;
  g.world.meta.lastSeenMs = g.realNow ?? g.world.meta.lastSeenMs;
  saveWorld(g.world);
}
export function markSessionOpen(g) { if (!g.demo) store.set(SESSION_KEY, { open: true }); }
export function markSessionClean(g) { if (!g.demo) store.set(SESSION_KEY, { open: false }); }
export function lastSessionUnclean() { return store.get(SESSION_KEY)?.open === true; }
