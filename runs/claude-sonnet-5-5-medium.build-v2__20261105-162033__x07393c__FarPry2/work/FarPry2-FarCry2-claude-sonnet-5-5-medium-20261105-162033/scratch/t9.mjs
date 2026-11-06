import { buildModel } from '../pixel-engine.js';
import { CATALOG } from '../src/art/catalog.js';
import { LAYOUTS, POST_LAYOUT } from '../src/content/layouts.js';
const ids = new Set([...Object.values(LAYOUTS).flat(), ...POST_LAYOUT].map(r => r.m + '|' + JSON.stringify(r.params || null)));
for (const k of [...ids, 'bush|null','reeds|null','rock|null','dead-tree|null','scorched-tree|null','bridge|null','termite-mound|null','boulders|null']) { const [m, p] = k.split('|'); try { buildModel(m, { catalog: CATALOG, params: JSON.parse(p) || undefined }); } catch (e) { console.log('FAIL', m, p, String(e.message).slice(0, 120)); } }
console.log('checked', ids.size);
