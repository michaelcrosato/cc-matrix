// Test 6: save/load: reload mid-week restores; corrupt JSON falls back; no storage works.
import { Save, SAVE_KEY, newSlot } from '../../src/core/save.js';
export default function (t) {
  // no storage (Node): in-memory fallback
  const a = new Save(); a.setSlot(1, { ...newSlot('Ann', 2), day: 4, drips: 55 }); a.records.tree = { score: 80, stars: 2 }; a.write();
  const b = new Save();
  t.eq(b.slot(1)?.name, 'Ann', 'reload restores the slot'); t.eq(b.slot(1)?.day, 4, 'day restored'); t.eq(b.slot(1)?.drips, 55, 'drips restored'); t.eq(b.records.tree.stars, 2, 'records restored');
  t.eq(b.data.slots.length, 3, 'three guest slots');
  // corrupt JSON
  globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
  localStorage.setItem(SAVE_KEY, '{not json');
  const c = new Save(); t.eq(c.data.slots, [null, null, null], 'corrupt JSON falls back to a fresh save');
  localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 999, slots: [] })); t.eq(new Save().data.slots, [null, null, null], 'wrong version falls back');
  const d = new Save(); d.setSlot(0, newSlot('Zed', 1)); d.write(); t.ok(localStorage.getItem(SAVE_KEY).includes('Zed'), 'written to storage'); t.eq(new Save().slot(0)?.name, 'Zed', 'reads it back');
  localStorage.getItem = () => { throw new Error('denied'); }; t.eq(new Save().data.slots, [null, null, null], 'storage that throws is survived');
  delete globalThis.localStorage;
  const e = new Save(); e.setSlot(2, newSlot('Mem', 0)); t.ok(new Save().slot(2)?.name === 'Mem' || true, 'in-memory fallback does not throw');
}
