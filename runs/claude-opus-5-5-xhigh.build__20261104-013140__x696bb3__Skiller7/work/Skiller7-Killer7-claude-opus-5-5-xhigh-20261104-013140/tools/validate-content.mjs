// The content validator (§14.7): loads the engine and out/bundle.js in a vm and checks every area, its rails, cameras,
// spawns, waves, triggers, gates, talks, beats and speakers, and that the golden path can be finished. Prints only
// problems; exit code 1 on any. Run by the build and by the test runner (suite "content").
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout, clearTimeout };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine/my-3d2dge.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'out/bundle.js'), 'utf8'), ctx);
const S7 = ctx.S7, M = 16, errs = [];
const err = (m) => errs.push(m);
const BAD = /\b(TODO|TBD|lorem|placeholder|XXX)\b/i;
for (const id in S7.AREAS) {
  const A = S7.AREAS[id];
  let grid, rails;
  try { grid = new S7.LevelGrid(A); rails = new S7.RailGraph(A, grid); } catch (e) { err(`${id}: rails: ${e.message}`); continue; }
  for (const nid in rails.nodes) {
    const n = rails.nodes[nid];
    if (!rails.adj[nid].length) err(`${id}: node ${nid} has no edges`);
    if (grid.kind === 'level' && !grid.walkable(Math.floor(n.x / M), Math.floor(n.y / M)) && !n.air) err(`${id}: node ${nid} is not on walkable floor (${n.x / M}, ${n.y / M})`);
    if (n.to && !(S7.AREAS[n.to[0]] && S7.AREAS[n.to[0]].nodes[n.to[1]])) err(`${id}: exit ${nid} leads to unknown ${n.to.join(':')}`);
  }
  for (const eid in rails.edges) {
    const e = rails.edges[eid];
    if (!(e.length > 0)) err(`${id}: edge ${eid} has no length`);
    if (e.gate && !(A.gates && A.gates[e.gate])) err(`${id}: edge ${eid} names unknown gate ${e.gate}`);
    // walk edges stay on walkable floor (a level's)
    if (grid.kind === 'level' && (e.kind === 'walk' || e.kind === 'stairs')) for (let s = 0; s <= e.length; s += 8) { const p = e.path.at(s); if (!grid.walkable(Math.floor(p.x / M), Math.floor(p.y / M))) { err(`${id}: edge ${eid} crosses a wall at (${(p.x / M).toFixed(1)}, ${(p.y / M).toFixed(1)})`); break; } }
  }
  // camera shots cover [0, 1] on every edge, both ways
  const sim = { grid, rails, areaDef: A };
  const cam = new S7.CameraDirector(sim);
  for (const eid in rails.edges) for (const dir of [1, -1]) {
    const e = rails.edges[eid]; if (dir < 0 && e.oneWay) continue;
    const shots = cam.shots(e, dir); let u = 0;
    for (const s of shots) { if (Math.abs(s.s[0] - u) > 1e-6) err(`${id}: edge ${eid}/${dir}: shots leave a gap at ${u}`); u = s.s[1]; }
    if (Math.abs(u - 1) > 1e-6) err(`${id}: edge ${eid}/${dir}: shots end at ${u}`);
  }
  for (const s of A.spots || []) {
    if (s.node && !rails.nodes[s.node]) err(`${id}: spot ${s.id} on unknown node ${s.node}`);
    if (s.edge && !rails.edges[s.edge]) err(`${id}: spot ${s.id} on unknown edge ${s.edge}`);
    if (s.talk && typeof s.talk === 'string' && !S7.TALKS[s.talk]) err(`${id}: spot ${s.id} names unknown talk ${s.talk}`);
    if (s.beat && !S7.BEATS[s.beat]) err(`${id}: spot ${s.id} names unknown beat ${s.beat}`);
    if (s.opens) for (const g of [].concat(s.opens)) if (!(A.gates && A.gates[g])) err(`${id}: spot ${s.id} opens unknown gate ${g}`);
    if (s.dossier && !S7.DOSSIER[s.dossier]) err(`${id}: spot ${s.id} names unknown dossier ${s.dossier}`);
    if (s.item && !S7.ITEMS[s.item]) err(`${id}: spot ${s.id} names unknown item ${s.item}`);
    if (s.line && BAD.test(s.line)) err(`${id}: spot ${s.id}: placeholder text`);
  }
  for (const wid in A.waves || {}) for (const sp of A.waves[wid].spawn) { if (!S7.ENEMIES[sp[0]]) err(`${id}: wave ${wid}: unknown enemy ${sp[0]}`); if (!A.spawns[sp[1]]) err(`${id}: wave ${wid}: unknown spawn ${sp[1]}`); }
  for (const tr of A.triggers || []) {
    if (tr.edge && !rails.edges[tr.edge]) err(`${id}: trigger ${tr.id}: unknown edge ${tr.edge}`);
    if (tr.node && !rails.nodes[tr.node]) err(`${id}: trigger ${tr.id}: unknown node ${tr.node}`);
    if (tr.wave && !(A.waves && A.waves[tr.wave])) err(`${id}: trigger ${tr.id}: unknown wave ${tr.wave}`);
    if (tr.beat && !S7.BEATS[tr.beat]) err(`${id}: trigger ${tr.id}: unknown beat ${tr.beat}`);
  }
  for (const gid in A.gates || {}) { const g = A.gates[gid]; if (g.hides) for (const h of [].concat(g.hides)) if (!rails.edges[h]) err(`${id}: gate ${gid} hides unknown edge ${h}`); }
}
// talks: every speaker has a name and a voice; no placeholder text
for (const id in S7.TALKS) for (const l of S7.TALKS[id]) {
  const who = Array.isArray(l) ? l[0] : l.who, text = Array.isArray(l) ? l[1] : l.text || (l.card && l.card.join(' '));
  if (who && !(S7.PEOPLE[who] || S7.PERSONAS[who])) err(`talk ${id}: unknown speaker ${who}`);
  if (typeof text === 'string' && BAD.test(text)) err(`talk ${id}: placeholder text`);
}
for (const id in S7.PEOPLE) { const P = S7.PEOPLE[id]; if (P && P.voice && !S7.VOICES[P.voice]) err(`person ${id}: unknown voice ${P.voice}`); }
for (const id in S7.PERSONAS) { const P = S7.PERSONAS[id]; if (!S7.VOICES[P.voice]) err(`persona ${id}: unknown voice`); if (!S7.WEAPONS[P.weapon]) err(`persona ${id}: unknown weapon`); }
if (S7.goldenPath) { const r = S7.goldenPath(); if (r !== true) err('golden path: ' + r); }
if (errs.length) { for (const e of errs) console.error('FAIL content › ' + e); process.exit(1); }
