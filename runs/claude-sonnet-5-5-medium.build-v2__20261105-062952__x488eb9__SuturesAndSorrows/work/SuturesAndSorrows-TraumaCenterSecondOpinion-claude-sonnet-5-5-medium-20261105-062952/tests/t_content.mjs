import { readFileSync, readdirSync, statSync } from 'node:fs'; import path from 'node:path';
export default async function ({ check, load, root }) {
  const ctx = load(); const G = ctx.GAME;
  // every id resolves
  for (const id of G.CASE_ORDER) { const d = G.CASES[id]; for (const ph of d.phases) for (const sp of ph.spawn || []) check(`case ${id}: object type ${sp.t} exists`, !!G.OBJ[sp.t], sp.t); check(`case ${id} has chart, story and site`, !!G.CHART[id] && !!G.CASE_STORY[id] && G.SITE_NAMES.includes(d.site), id); }
  const reach = new Set(['intro', 'ending']); for (const id in G.CASE_STORY) for (const s of G.CASE_STORY[id]) reach.add(s);
  for (const id in G.STORY) { check('story node reachable: ' + id, reach.has(id)); check('stage exists for ' + id, G.STAGE_IDS.includes(G.STORY[id].bg), G.STORY[id].bg); for (const [who, expr, text] of G.STORY[id].lines) { check(`line cast ok (${id}: ${who})`, !who || G.hasCast(who), who); check('expression exists ' + expr, !expr || G.EXPRS.includes(expr), expr); check('line length <= 110', text.length <= 110, text.length + ' ' + text); } }
  for (const k in G.WARD_TALK) for (const [who, expr] of G.WARD_TALK[k]) check('ward talk cast ' + who, G.hasCast(who));
  check('at least 40 Quill barks', Object.values(G.BARKS).filter(Array.isArray).flat().length >= 40, Object.values(G.BARKS).filter(Array.isArray).flat().length);
  // no TODO/stub text in sources
  const bad = []; const walk = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) { if (f !== 'engine') walk(p); } else if (/\.js$/.test(f)) { const t = readFileSync(p, 'utf8'); if (/TODO|FIXME|placeholder|\bstub\b/i.test(t)) bad.push(f); } } }; walk(path.join(root, 'src'));
  check('no TODO/FIXME/placeholder/stub in src', bad.length === 0, bad.join(','));
  // about data and exit interview
  const about = JSON.parse(readFileSync(path.join(root, 'src/about-data.json'), 'utf8')), ex = JSON.parse(readFileSync(path.join(root, '../exit-interview.json'), 'utf8'));
  const filled = o => Object.values(o).every(v => Array.isArray(v) ? v.length && v.every(x => String(x).trim()) : typeof v === 'object' ? filled(v) : String(v).trim().length > 0);
  check('about data filled', filled(about) && about.testingFeedback.length === 4 && about.engineFeedback.length === 6 && about.promptFeedback.length === 4);
  check('exit interview filled and shaped', filled(ex) && ex.sourceInformation.usage === 'added on import' && ex.aiHub.tags.length >= 3 && ex.aiHub.tags.length <= 6 && ['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(ex.aiHub.genre));
  // originality: none of the source's names appear
  const banned = /Derek Stiles|Angie Thompson|Naomi Kimishima|Nozomi Weaver|Robert Hoffman|Kenneth Blackwell|Hope Hospital|Angeles Bay|Caduceus|Delphi|GUILT|Healing Touch/i; let hit = null; const walk2 = d => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (statSync(p).isDirectory()) { if (f !== 'engine') walk2(p); } else if (/\.(js|json)$/.test(f) && banned.test(readFileSync(p, 'utf8'))) hit = f; } }; walk2(path.join(root, 'src')); check('no names from the source', !hit, hit);
}
