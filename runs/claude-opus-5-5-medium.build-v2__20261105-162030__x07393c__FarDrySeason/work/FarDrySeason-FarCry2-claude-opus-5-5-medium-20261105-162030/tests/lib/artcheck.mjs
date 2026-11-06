import { buildModel, compileClips, checkModel, HERO_RIG, THREE, validateClip } from '../../pixel-engine.js';
import { CATALOG, soldierBeret } from '../../src/art/models.js';
import { VIEWMODELS, GUN_VIEWMODELS, GUN_RIG, TOOL_RIG, vmTools, handsMap } from '../../src/art/viewmodels.js';
import { GUN_CLIPS, TOOL_CLIPS, PEOPLE_CLIPS } from '../../src/art/clips.js';
let bad = 0;
for (const d of [...VIEWMODELS, handsMap]) { const r = checkModel(d, { catalog: CATALOG }); if (r.problems.length) { bad++; console.log(d.id, r.problems.map(String).join(' | ').slice(0, 300)); } }
const warn = console.warn; let warned = new Set(); console.warn = (...a) => warned.add(String(a[0]).slice(0, 120));
for (const [id, def] of Object.entries(GUN_VIEWMODELS)) { const b = buildModel(def, { catalog: CATALOG }); const clips = compileClips(GUN_CLIPS[id], GUN_RIG, b.object); if (!clips.length) console.log('noclip', id); }
const t = buildModel(vmTools, { catalog: CATALOG }); console.log('tool clips', compileClips(TOOL_CLIPS, TOOL_RIG, t.object).length);
const s = buildModel(soldierBeret, { catalog: CATALOG }); console.log('people clips', compileClips(PEOPLE_CLIPS, { ...HERO_RIG, spine: undefined }, s.object).map((c) => c.name).length);
for (const c of PEOPLE_CLIPS) { try { const r = validateClip(c, HERO_RIG); const e = r.filter?.((x) => x.level === 'error') ?? []; if (e.length) console.log(c.name, JSON.stringify(e).slice(0, 200)); } catch (e) { console.log(c.name, String(e).slice(0, 200)); } }
console.log('warned', [...warned].slice(0, 8)); console.log('bad', bad);
