/* SKILLER7 — the content validator (§14.7): runs in the tests and at boot (the quick part). It returns a list of
 * problems: unknown references, spawns and nodes off the floor, edges without length, missing beats and items. */
S7.validate = () => {
  const out = [], bad = (a, m) => out.push(a + ': ' + m);
  for (const id in S7.AREAS) {
    let A; try { A = loadArea(id); } catch (e) { bad(id, e.message); continue; }
    const area = A.area, G2 = A.grid, R2 = A.rails;
    for (const e of R2.edges) { if (!(e.len > 1)) bad(id, 'edge ' + e.id + ' has no length'); if (e.gate && !(area.gates || {})[e.gate]) bad(id, 'edge ' + e.id + ' has an unknown gate ' + e.gate); for (const sh of e.shots) if (sh.s[0] > sh.s[1]) bad(id, 'edge ' + e.id + ' shot range'); const cov = e.shots.reduce((a, s) => a + (s.s[1] - s.s[0]), 0); if (cov < .999) bad(id, 'edge ' + e.id + ' shots cover ' + cov.toFixed(2)); }
    for (const nid in R2.nodes) { const n = R2.nodes[nid]; if (!R2.adj[nid].length) bad(id, 'node ' + nid + ' has no edges'); if (!G2.terrain && !n.fixedZ && !G2.walkable(Math.floor(n.x / M), Math.floor(n.y / M))) bad(id, 'node ' + nid + ' is not on the floor'); if (n.to && !S7.AREAS[n.to[0]]) bad(id, 'exit ' + nid + ' to an unknown area'); else if (n.to && !S7.AREAS[n.to[0]].nodes[n.to[1]]) bad(id, 'exit ' + nid + ' to an unknown node ' + n.to.join(':')); }
    for (const k in area.spawns || {}) { const s = area.spawns[k]; if (!G2.terrain && s[2] === undefined && !G2.walkable(Math.floor(s[0]), Math.floor(s[1]))) bad(id, 'spawn ' + k + ' is not on the floor'); }
    for (const w in area.waves || {}) for (const [type, sp] of area.waves[w].spawn) { if (!S7.ENEMIES[type]) bad(id, 'wave ' + w + ' has an unknown enemy ' + type); if (!(area.spawns || {})[sp]) bad(id, 'wave ' + w + ' has an unknown spawn ' + sp); }
    for (const t of area.triggers || []) { if (t.edge && !R2.byId[t.edge]) bad(id, 'trigger ' + t.id + ' on an unknown edge'); if (t.node && !R2.nodes[t.node]) bad(id, 'trigger ' + t.id + ' on an unknown node'); if (t.beat && !S7.BEATS[t.beat]) bad(id, 'trigger ' + t.id + ' has an unknown beat'); if (t.wave && !(area.waves || {})[t.wave]) bad(id, 'trigger ' + t.id + ' has an unknown wave'); if (t.tip && !S7.TIPDEFS[t.tip]) bad(id, 'trigger ' + t.id + ' has an unknown tip'); }
    for (const s of A.spots) { if (s.item && !S7.ITEMS[s.item]) bad(id, 'spot ' + s.id + ' has an unknown item'); if (s.beat && !S7.BEATS[s.beat]) bad(id, 'spot ' + s.id + ' has an unknown beat'); if (s.lines && typeof s.lines === 'string' && !S7.LINES[s.lines]) bad(id, 'spot ' + s.id + ' has unknown lines'); if (s.gate && !(area.gates || {})[s.gate]) bad(id, 'spot ' + s.id + ' has an unknown gate'); }
    for (const t of A.targets || []) if (t.beat && !S7.BEATS[t.beat]) bad(id, 'target ' + t.id + ' has an unknown beat');
  }
  for (const id in S7.PERSONAS) { const P = S7.PERSONAS[id]; if (!S7.WEAPONS[P.weapon]) bad('persona ' + id, 'unknown weapon'); }
  const strs = JSON.stringify([S7.LINES, S7.AREAS, S7.ITEMS, S7.PERSONAS]);
  const MARK = new RegExp('\\b(' + ['TO' + 'DO', 'T' + 'BD', 'lo' + 'rem', 'place' + 'holder', 'X' + 'XX'].join('|') + ')\\b', 'i');
  if (MARK.test(strs)) bad('content', 'an unfinished marker in the text');
  return out;
};
S7.validateQuick = () => { const v = S7.validate(); if (v.length && S7.game) S7.game.fail('content', new Error(v.slice(0, 5).join('; '))); return v; };
