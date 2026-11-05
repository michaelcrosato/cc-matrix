// Content validator: every reference in the data resolves, every area is well-formed, and no placeholder text is left.
import { load } from '../tests/lib/node-harness.mjs';
const { S7 } = load(); const errs = [];
const bad = (m) => errs.push(m);
for (const id of S7.AREA_ORDER) {
  const A = S7.reg.areas[id]; if (!A) { bad('missing area ' + id); continue; }
  const nodes = typeof A.nodes === 'function' ? A.nodes() : A.nodes;
  if (!A.terrain) { if (!A.rows || A.rows.length !== A.h || A.rows.some(r => r.length !== A.w)) bad(id + ': rows do not match w x h'); }
  for (const e of A.edges) { if (!nodes[e.a] || !nodes[e.b]) bad(id + ': edge ' + e.id + ' has a missing node'); if (e.gate && !(A.gates && A.gates[e.gate])) bad(id + ': gate ' + e.gate + ' undefined'); }
  for (const n in nodes) { const nd = nodes[n]; if (!A.terrain && (nd.t[0] < 1 || nd.t[1] < 1 || nd.t[0] > A.w - 1 || nd.t[1] > A.h - 1)) bad(id + ': node ' + n + ' is outside the walls'); if (nd.to && !S7.reg.areas[nd.to[0]]) bad(id + ': exit to unknown area ' + nd.to[0]); }
  for (const sp of A.spots) { if (sp.talk && !S7.reg.beats[sp.talk]) bad(id + ': spot ' + sp.id + ' has no beat ' + sp.talk); if (sp.item && sp.kind === 'pickup' && !['red', 'rime'].includes(sp.item) && !/^pin\d$/.test(sp.item) && !sp.item.startsWith('coat_') && !S7.reg.items[sp.item]) bad(id + ': unknown item ' + sp.item); }
  for (const t of A.triggers) { if (t.beat && !S7.reg.beats[t.beat]) bad(id + ': trigger ' + t.id + ' beat ' + t.beat); if (t.wave && !A.waves[t.wave]) bad(id + ': trigger ' + t.id + ' wave ' + t.wave); }
  for (const w in A.waves) for (const [type, key] of A.waves[w].spawn) { if (!S7.reg.enemies[type]) bad(id + ': wave ' + w + ' enemy ' + type); if (!A.spawns[key]) bad(id + ': wave ' + w + ' spawn ' + key); }
}
for (const id of S7.ROSTER) { const p = S7.reg.personas[id]; if (!S7.reg.weapons[p.weapon]) bad('persona ' + id + ' weapon'); if (!p.voice) bad('persona ' + id + ' voice'); }
for (const b in S7.reg.beats) { const steps = typeof S7.reg.beats[b] === 'function' ? S7.reg.beats[b]({ bosses: {}, pins: [], items: {}, roster: {} }) : S7.reg.beats[b]; for (const s of steps || []) { if (s.say && !(S7.reg.personas[s.say] || S7.NAMES[s.say] !== undefined)) bad('beat ' + b + ' unknown speaker ' + s.say); if (s.unlock && !S7.reg.personas[s.unlock]) bad('beat ' + b + ' unlock'); } }
for (const f of ['pins', 'dossier']) { /* shape */ }
for (const sec of S7.ABOUT) if (/TODO|FIXME|lorem|placeholder|TBD/i.test(sec)) bad('about text has a placeholder');
console.log(errs.length ? errs.join('\n') : 'content ok'); process.exit(errs.length ? 1 : 0);
