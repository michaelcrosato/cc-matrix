// Tier 1 lint: strings fit the HUD font, no banned words, no Math.random in sim, assets referenced exist, clips/sounds/songs/models valid.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { validateClip, HERO_RIG, compileClips, buildModel, checkModel, renderSound, parseSong, TEXTURE_LIBRARY, MODEL_LIBRARY, hudSprite, ModelCatalog } from '../../pixel-engine.js';
import { SFX } from '../../src/data/sfx.js';
import { SONGS } from '../../src/data/songs.js';
import { NEW_CLIPS } from '../../src/view/clips.js';
import { ALL_DEFS, CATALOG } from '../../src/view/models/bodies.js';
import * as QUESTS from '../../src/data/quests.js';
import * as CLASSES from '../../src/data/classes.js';
import * as ITEMS from '../../src/data/items.js';
import * as MON from '../../src/data/monsters.js';
import { ZONES } from '../../src/data/zones.js';
import { SKILLS } from '../../src/data/classes.js';
export const name = 'lint';
const ROOT = new URL('../../', import.meta.url).pathname;
const HUDCH = /^[A-Z0-9 '"“”‘’`.,:;\-+=\/()\[\]{}%_!?<>#*@°·&|~^$]*$/;
const BANNED = ['Sanctuary', 'Tristram', 'Caldeum', 'Westmarch', 'Horadrim', 'Nephalem', 'Cain', 'Leah', 'Adria', 'Tyrael', 'Imperius', 'Malthael', 'Azmodan', 'Belial', 'Kanai', 'Paragon', 'Torment', 'Barbarian', 'Wizard', 'Necromancer', 'Crusader', 'Monk', 'Demon Hunter', 'Witch Doctor', 'Fury', 'Arcane Power', 'Spirit'];
function walk(dir, out = []) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; }
function strings(v, out = [], depth = 0) { if (depth > 6) return out; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => strings(x, out, depth + 1)); else if (v && typeof v === 'object') for (const x of Object.values(v)) strings(x, out, depth + 1); return out; }
export async function run(t) {
  // font and length lint on story and data strings
  const groups = { quests: QUESTS.QUESTS, npcs: QUESTS.NPCS, taunts: QUESTS.TAUNTS, lore: QUESTS.LORE_BOOKS, howto: QUESTS.HOWTO, narration: [QUESTS.NARRATION, QUESTS.ENDING], skills: Object.values(SKILLS).map((s) => [s.name, s.desc, Object.values(s.tones).map((x) => [x.name, x.desc])]), classes: Object.values(CLASSES.CLASSES).map((c) => [c.name, c.fantasy, c.resource, c.passive, c.vows]), leg: Object.values(ITEMS.LEGENDARIES).map((l) => [l.name, l.text, l.flavour]), flav: ITEMS.FLAVOUR, mon: Object.values(MON.MONSTERS).map((m) => [m.name, m.lore]), aff: Object.values(MON.AFFLICTIONS), sets: Object.values(ITEMS.SETS), zones: Object.values(ZONES).map((z) => z.name) };
  for (const [g, v] of Object.entries(groups)) for (const s of strings(v)) { if (g === 'sets' || /^[a-z_]+$/.test(s) && s.length < 20 && !/ /.test(s) && g !== 'lore') continue; const u = s.toUpperCase(); if (!HUDCH.test(u)) t.fail(`font: "${s}" has characters the HUD font lacks`); }
  for (const s of strings([QUESTS.NARRATION, QUESTS.NPCS, QUESTS.TAUNTS])) if (s.length > 140) t.fail(`subtitle too long (${s.length}): ${s.slice(0, 40)}`);
  // sources
  const files = walk(join(ROOT, 'src')).concat([join(ROOT, 'game.js')]);
  for (const f of files) {
    const src = readFileSync(f, 'utf8'); const rel = f.replace(ROOT, '');
    if (rel.includes('generated')) continue;
    if (rel.startsWith('src/sim/') && /Math\.random|performance\.now|Date\.now/.test(src)) t.fail(`${rel}: nondeterminism in sim`);
    if (rel.startsWith('src/sim/') && /\b(document|window|navigator)\b/.test(src.replace(/\/\/.*$/gm, ''))) t.fail(`${rel}: sim touches the DOM`);
    if (/\b(TODO|FIXME|XXX|placeholder|stub|coming soon)\b/i.test(src)) t.fail(`${rel}: contains TODO/placeholder/stub wording`);
    for (const b of BANNED) if (new RegExp('\\b' + b + '\\b').test(src.replace(/\/\/.*$/gm, '').replace(/ABOUT_SRC/g, ''))) { if (rel.includes('screens_about')) continue; t.fail(`${rel}: banned name ${b}`); }
    t.ok(true, '');
  }
  // engine and hub client untouched
  const hashes = readFileSync(join(ROOT, 'tools_hashes.txt'), 'utf8').trim().split('\n').map((l) => l.split(/\s+/));
  for (const [h, f] of hashes) { const d = createHash('sha256').update(readFileSync(join(ROOT, f))).digest('hex'); t.ok(d === h, `${f} was edited`); }
  // clips, sounds, songs, models, textures, icons
  for (const c of NEW_CLIPS) { const r = validateClip(c, HERO_RIG); if (r && r.problems && r.problems.length) t.fail(`clip ${c.name}: ${r.problems.join(',')}`); }
  for (const [k, d] of Object.entries(SFX)) { try { const r = renderSound(d); const a = r.samples || r.data || r; let pk = 0; for (const v of a) pk = Math.max(pk, Math.abs(v)); if (pk === 0) t.fail(`sound ${k} is silent`); if (pk > 1.0001) t.fail(`sound ${k} peaks ${pk}`); } catch (e) { t.fail(`sound ${k}: ${e.message}`); } }
  for (const [k, s] of Object.entries(SONGS)) { try { parseSong(s); } catch (e) { t.fail(`song ${k}: ${e.message}`); } t.ok(Object.keys(s.patterns).length >= 3, `song ${k} has fewer than 3 patterns`); }
  t.ok(Object.keys(SFX).length >= 60, 'fewer than 60 sounds');
  for (const d of ALL_DEFS) { const r = checkModel(d, { catalog: CATALOG }); if (r.problems.length) t.fail(`model ${d.id}: ${r.problems.join('; ').slice(0, 160)}`); }
  for (const z of Object.values(ZONES)) { for (const id of [z.tex, z.wall]) if (id) { try { TEXTURE_LIBRARY.get(id); } catch { t.fail(`texture ${id} missing`); } } }
  for (const s of Object.values(SKILLS)) { try { hudSprite(s.icon); } catch { t.fail(`icon ${s.icon} missing`); } }
  for (const id of ['standing-torch', 'column', 'banner', 'wall-torch', 'wall-chains', 'bones', 'skull-pile', 'rubble', 'sarcophagus', 'brazier', 'tombstone', 'dead-tree', 'urn', 'barrel', 'crate', 'cart', 'coffin', 'lamp-post', 'mace', 'warhammer', 'flail', 'staff', 'crossbow', 'wand', 'shovel', 'scythe', 'sceptre', 'kite-shield', 'round-shield', 'rubble']) { try { buildModel(id, { catalog: CATALOG }); } catch (e) { t.fail(`library model ${id}: ${e.message}`); } }
  // data counts
  t.ok(Object.keys(SKILLS).length === 24, 'expected 24 skills');
  for (const s of Object.values(SKILLS)) t.ok(Object.keys(s.tones).length === 3, `skill ${s.name} needs 3 tones`);
  t.ok(Object.keys(ITEMS.LEGENDARIES).length === 18, '18 legendaries');
}
