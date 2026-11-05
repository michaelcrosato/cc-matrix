// The editor's state: a road as a list of piece ids, its save slots, and what a puzzle allows. Pure logic; game.js draws it.
import { PIECES, programOf, PUZZLES } from './data/editor.js';

export const SLOTS = 3;
const KEY = 'crackmania.roads.v1';

/** a new editor state: empty, or the puzzle's budget */
export function newEditor(puzzle = null) {
  return { ids: [], pick: 0, puzzle, slot: 0, dirty: true };
}
/** the pieces a puzzle allows: at most `max` in all */
export function canAdd(ed) {
  return !ed.puzzle || ed.ids.length < ed.puzzle.max;
}
export function addPiece(ed) {
  if (!canAdd(ed)) return false;
  ed.ids.push(PIECES[ed.pick].id); ed.dirty = true; return true;
}
export function undo(ed) { if (ed.ids.length) { ed.ids.pop(); ed.dirty = true; } }
export function clear(ed) { ed.ids = []; ed.dirty = true; }
export function programFor(ed) { return programOf(ed.ids); }
/** a puzzle is solved when the road finishes and is at least its goal long */
export function solved(puzzle, lengthM, finished) { return !!puzzle && finished && lengthM >= puzzle.goal; }

/** the saved roads: { slots: [ids | null] } in the browser's storage (memory when there is none) */
export function makeRoadStore(memory = {}) {
  const read = () => { try { return Object.assign({ slots: [null, null, null] }, JSON.parse(globalThis.localStorage.getItem(KEY))); } catch (e) { return Object.assign({ slots: [null, null, null] }, memory.r); } };
  const write = v => { memory.r = v; try { globalThis.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* kept for the visit */ } };
  return {
    save(slot, ids) { const v = read(); v.slots[slot] = ids.slice(); write(v); return v; },
    load(slot) { return read().slots[slot]; },
    all() { return read(); },
  };
}
export { PUZZLES, PIECES };
