/* =====================================================================================
 * 01-util: stat modifiers, direction maths, text helpers
 * ===================================================================================== */
/** an ability score's modifier: 3-5 -2, 6-8 -1, 9-12 0, 13-15 +1, 16-17 +2, 18 +3 */
const statMod = v => v <= 5 ? -2 : v <= 8 ? -1 : v <= 12 ? 0 : v <= 15 ? 1 : v <= 17 ? 2 : 3;
B.statMod = statMod;
/** the way from (ax, ay) to (bx, by) as a direction 0-3 (they must share a row or a column), or -1 */
const dirTo = (ax, ay, bx, by) => ax === bx ? (by < ay ? 0 : by > ay ? 2 : -1) : ay === by ? (bx > ax ? 1 : 3) : -1;
/** where a point lies relative to a facing: 0 front, 1 right, 2 back, 3 left (by the larger axis) */
const relSide = (dir, fx, fy, tx, ty) => {
  const dx = tx - fx, dy = ty - fy; let d;
  if (Math.abs(dx) >= Math.abs(dy)) d = dx > 0 ? 1 : 3; else d = dy > 0 ? 2 : 0;
  return ((d - dir) % 4 + 4) % 4;
};
const manhattan = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
B.dirTo = dirTo; B.relSide = relSide;
/** fill a text's {name} slots from vars */
const fill = (s, v) => v ? String(s).replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : m) : String(s);
B.fill = fill;
/** "a Rock", "an Iron Key", "2 Rations" */
const art = name => /^[AEIOU]/i.test(name) ? 'an ' + name : 'a ' + name;
B.art = art;
/** list words: "a, b and c" */
const andList = a => a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
B.andList = andList;
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
B.cap = cap;
/** a stable JSON (sorted keys) for the hash */
const stable = v => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v);
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
};
B.stable = stable;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };
B.fnv = fnv;
const clone = o => JSON.parse(JSON.stringify(o));
B.clone = clone;
/** seconds as 01:42.3 */
B.clock = (s, tenths = true) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return String(m).padStart(2, '0') + ':' + (tenths ? r.toFixed(1).padStart(4, '0') : String(Math.floor(r)).padStart(2, '0')); };
