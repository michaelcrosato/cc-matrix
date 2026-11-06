// The wire: flat integer arrays for the moving things. Positions are times ten.
export const STATE_CODE = { idle: 0, run: 1, cast: 2, dodge: 3, dead: 4, channel: 5, stunned: 6, dash: 7, leap: 8 };
export const CODE_STATE = Object.fromEntries(Object.entries(STATE_CODE).map(([k, v]) => [v, k]));
const r10 = (v) => Math.round(v * 10);

const nearestFirst = (w, list) => {
  const heroes = w.heroes.filter((h) => !h.gone);
  const score = (m) => { let best = Infinity; for (const h of heroes) { const d = (m.x - h.x) ** 2 + (m.z - h.z) ** 2; if (d < best) best = d; } return best; };
  return list.map((m) => [score(m), m]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
};

/** A snapshot under 1,100 bytes: the 24 nearest every time, a rotating slice of the rest. */
export function encodeSnapshot(w, cursor) {
  const h = [];
  for (const o of w.heroes) {
    if (o.gone) continue;
    h.push(o.id, r10(o.x), r10(o.z), r10(o.facing), STATE_CODE[o.state] ?? 0, Math.round(o.hp), Math.round(o.res), (o.dead ? 1 : 0) | (o.moving ? 2 : 0) | (o.channel > 0 ? 4 : 0));
  }
  const live = w.monsters.filter((m) => !m.dead && !m.hidden);
  const ordered = nearestFirst(w, live);
  const near = ordered.slice(0, 24);
  const rest = ordered.slice(24).filter((m) => (m.x - w.heroes[0]?.x) ** 2 + (m.z - w.heroes[0]?.z) ** 2 < 1600);
  const slice = [];
  for (let i = 0; i < Math.min(8, rest.length); i++) slice.push(rest[(cursor.i + i) % rest.length]);
  cursor.i = rest.length ? (cursor.i + 8) % rest.length : 0;
  const m = [];
  for (const o of [...near, ...slice]) m.push(o.id, r10(o.x), r10(o.z), r10(o.facing), Math.round(o.hp));
  const a = [];
  for (const o of w.allies) { if (o.def.static) continue; a.push(o.id, r10(o.x), r10(o.z), r10(o.facing), o.moving ? 1 : 0); }
  const msg = { k: 's', n: w.t, h, m, a };
  // Trim from the far end until it fits one packet.
  let json = JSON.stringify(msg);
  while (json.length > 1090 && msg.m.length) { msg.m.length -= 5; json = JSON.stringify(msg); }
  while (json.length > 1090 && msg.a.length) { msg.a.length -= 5; json = JSON.stringify(msg); }
  return msg;
}

/** Events that are not plain data, or that nobody across the wire needs, stay home. */
const LOCAL_ONLY = new Set(['autosave', 'bestiary', 'hero', 'talk', 'open', 'lore', 'cut', 'zone']);
export function wireEvents(list, maxBytes = 12000) {
  const out = [];
  let size = 12;
  while (list.length) {
    const e = list[0];
    if (LOCAL_ONLY.has(e.t)) { list.shift(); continue; }
    const j = JSON.stringify(e).length + 1;
    if (size + j > maxBytes) break;
    size += j;
    out.push(e);
    list.shift();
  }
  return out;
}
