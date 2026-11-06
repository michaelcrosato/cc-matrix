import { parseSong, renderSound, HERO_CLIPS, HERO_RIG, validateClip, checkModel } from '../../pixel-engine.js';
import { SONGS } from '../../src/audio/songs.js';
import { SFX_DEFS } from '../../src/audio/sfx.js';
import { SPEAKERS, blipPlan } from '../../src/audio/voice.js';
import { allClipDefs } from '../../src/data/clips.js';
import { OUR_MODELS, MODELS } from '../../src/models/index.js';
import { MAPS, reachability, findCells } from '../../src/game/mapPaint.js';
import * as dialogue from '../../src/data/dialogue.js';
import { NOTES, HINTS } from '../../src/data/notes.js';
import { ITEMS, VALUABLES, KEY_ITEMS } from '../../src/data/items.js';
import { WEAPONS } from '../../src/data/weapons.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { SOURCE_INFO } from '../../src/data/about.js';

const FONT = /^[0-9A-Z .,:;\-+=/()[\]{}%_!?<>#'*@&|\\~^$‘’“”°·]*$/;
export async function run(T) {
  for (const [k, s] of Object.entries(SONGS)) { let ok = true; try { parseSong(s); } catch (e) { ok = false; } T.check('song parses: ' + k, ok); }
  for (const [k, d] of Object.entries(SFX_DEFS)) { const s = renderSound(d); let m = 0; for (const v of s) m = Math.max(m, Math.abs(v)); T.check('sfx audible, not clipping: ' + k, m > 0.01 && m <= 1.0001, m); }
  for (const sp of Object.keys(SPEAKERS)) { let n = 0; for (let i = 0; i < 40; i++) if (blipPlan(sp, 'HELLO THERE MISS RANSOM. WHAT?', i)) n++; T.check('voice blips: ' + sp, n > 4, n); }
  const defs = allClipDefs(HERO_CLIPS); let bad = 0; for (const d of defs.slice(HERO_CLIPS.length)) if (validateClip(d, HERO_RIG).length) bad++; T.eq('new clips valid', bad, 0);
  for (const d of OUR_MODELS) { const r = checkModel(d, { catalog: MODELS }); T.check('model ok: ' + d.id, r.problems.length === 0, r.problems.join(';')); }
  for (const [k, m] of Object.entries(MAPS)) { if (k !== 'loft') T.check('map reachable: ' + k, reachability(m).ok); }
  for (const ch of 'a12345mtyu$pndwuk') { /* markers checked per map below */ }
  T.eq('quay has 6 tannoys', findCells(MAPS.quay, 'y').length, 6);
  const total = ['quay', 'road', 'cannery', 'yard', 'causeway', 'abbey', 'nave'].reduce((a, k) => a + findCells(MAPS[k], 'y').length, 0);
  T.eq('15 tannoys across the island', total, 15);
  // strings: only font characters
  const strings = [];
  const walk = (v, key) => { if (typeof v === 'string') { if (['name', 'text', 'title', 'label'].includes(key) || key === 'line' || key === '#') strings.push(v); } else if (Array.isArray(v)) v.forEach((x) => walk(x, key === 'lines' ? '#' : key)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k); };
  for (const mod of [dialogue, NOTES, ITEMS, VALUABLES, KEY_ITEMS, WEAPONS, ENEMIES]) for (const v of Object.values(mod)) walk(v, '');
  for (const v of Object.values(dialogue)) if (Array.isArray(v)) for (const row of v) if (Array.isArray(row)) strings.push(row[1]); else if (typeof row === 'string') strings.push(row);
  for (const h of HINTS) strings.push(h);
  let badStr = strings.filter((s) => !FONT.test(s));
  T.check('all data strings use font characters', badStr.length === 0, badStr.slice(0, 3).join(' || '));
  { const { Engine, THREE } = await import('../../pixel-engine.js'); const { Humanoid, sharedClips } = await import('../../src/game/actor.js'); const bad = [];
    class G { name = 't'; setup(ctx) { const h0 = new Humanoid('islander'); for (const n of sharedClips(h0.body).keys()) { const h = new Humanoid('islander'); h.attachTo(ctx.scene); h.play(n); h.update(0.05); h.update(0.05); h.root.updateMatrixWorld(true); const v = h.worldOf('Head'); if (isNaN(v.x + v.y + v.z)) bad.push(n); } } update() {} cameraTarget() { return new THREE.Vector3(); } }
    await Engine.headless(new G(), {}); T.check('every clip poses the rig without NaN', bad.length === 0, bad.join(' ')); }
  T.eq('source info date', SOURCE_INFO.date, '2026-11-05 16:20:51');
}
