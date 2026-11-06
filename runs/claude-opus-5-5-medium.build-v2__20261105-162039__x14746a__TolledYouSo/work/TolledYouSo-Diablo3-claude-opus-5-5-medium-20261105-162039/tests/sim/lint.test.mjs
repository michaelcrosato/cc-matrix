// Lint: strings fit the HUD font, banned names, no TODOs, models, clips, sounds, songs, hashes.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeClip, buildModel, checkModel, compileClips, Engine, HERO_MODEL, HERO_RIG, THREE, MODEL_LIBRARY, parseSong, renderSound, TEXTURE_LIBRARY, validateClip } from '../../pixel-engine.js';
import { ok, eq, guarded } from '../lib.mjs';
import { CLASSES, SKILLS } from '../../src/data/classes.js';
import { BANTER, DIALOG, HOW_TO_PLAY, HERO_NAMES, SYSTEM } from '../../src/data/dialog.js';
import { LEGENDARIES, SETS, PREFIXES, SUFFIXES, COMMON_FLAVOUR, GEMS } from '../../src/data/items.js';
import { LORE } from '../../src/data/lore.js';
import { AFFLICTIONS, MONSTERS } from '../../src/data/monsters.js';
import { ZONES } from '../../src/data/zones.js';
import { SFX } from '../../src/audio/sfxdata.js';
import { SONGS } from '../../src/audio/songs.js';
import { SYLLABLES } from '../../src/audio/voice.js';
import { ALL_OWN, MODELS } from '../../src/view/models/props.js';
import { NEW_CLIPS, ALL_CLIPS } from '../../src/view/clips.js';
import { ICONS } from '../../src/ui/icons.js';
import { LOOKS } from '../../src/view/zonebuild.js';
import { QUESTS } from '../../src/sim/quests.js';
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const FONT = /^[A-Za-z0-9 '"‘’`.,:;\-+=/()\[\]{}%_!?<>#*@°·&|~^$]*$/;
await guarded(async () => {
  const strings = [];
  const add = (where, s) => strings.push([where, s]);
  for (const c of Object.values(CLASSES)) { add('class', c.name); add('class', c.fantasy); for (const v of c.vows) { add('vow', v.name); add('vow', v.desc); } for (const s of c.skills) { add('skill', s.name); add('skill', s.desc); for (const t of Object.values(s.tones)) { add('tone', t.name); add('tone', t.desc); } } }
  for (const list of Object.values(DIALOG)) for (const l of list) { add('dialog', l.text); ok(l.text.length <= 180, `dialog line fits: ${l.text.slice(0, 40)}`); }
  for (const list of Object.values(BANTER)) for (const l of list) add('banter', l);
  for (const p of HOW_TO_PLAY) { add('howto', p.title); for (const l of p.lines) add('howto', l); }
  HERO_NAMES.forEach((n) => add('name', n)); Object.values(SYSTEM).forEach((n) => add('sys', n));
  for (const l of LEGENDARIES) { add('leg', l.name); add('leg', l.power); add('leg', l.flavour); }
  for (const s of Object.values(SETS)) { add('set', s.name); add('set', s.two); add('set', s.four); Object.values(s.pieces).forEach((q) => add('set', q)); }
  [...PREFIXES, ...SUFFIXES, ...COMMON_FLAVOUR].forEach((q) => add('names', q));
  for (const m of Object.values(MONSTERS)) { add('monster', m.name); add('monster', m.lore); }
  for (const a of Object.values(AFFLICTIONS)) add('afl', a.name);
  for (const l of Object.values(LORE)) { add('lore', l.title); l.pages.forEach((q) => add('lore', q)); }
  for (const z of Object.values(ZONES)) add('zone', z.name);
  for (const q of QUESTS) { add('quest', q.name); q.steps.forEach((s) => add('quest', s.text)); }
  for (const [w, s] of strings) ok(FONT.test(s), `${w} string outside the HUD font: ${s.slice(0, 80)}`);
  ok(strings.length > 300, 'lint covered the strings');
  // Source scans.
  const banned = /\b(Sanctuary|Tristram|Caldeum|Westmarch|Horadrim|Nephalem|Deckard|Cain|Leah|Adria|Tyrael|Imperius|Malthael|Azmodan|Belial|Kanai|Paragon|Torment|Barbarian|Crusader|Witch Doctor|Monk|Demon Hunter|Wizard|Necromancer|Hatred|Discipline|Mana|Fury|Diablo)\b/;
  const files = walk('src').filter((f) => f.endsWith('.js') && !f.includes('about.generated'));
  for (const f of files) {
    const t = readFileSync(f, 'utf8');
    ok(!banned.test(t), `banned name in ${f}: ${banned.exec(t)?.[0]}`);
    ok(!/\b(TODO|FIXME|XXX|placeholder|coming soon)\b/i.test(t.replace(/placeholder:/g, '').replace(/o\.placeholder/g, '')), `TODO-like text in ${f}`);
    ok(!/\bstub\b/i.test(t.replace(/stub[A-Z]\w*|'stub'|stubB|stubCap/g, '').replace(/low stub/g, '')), `the word stub in ${f}`);
    if (f.includes('src/sim')) { ok(!/Math\.random|performance\.now/.test(t), `nondeterminism in ${f}`); ok(!/\bTHREE\.|document\.|window\./.test(t), `view leak in ${f}`); }
  }
  // Everything data refers to exists.
  for (const s of Object.values(SKILLS)) { const clips = Array.isArray(s.clip) ? s.clip : [s.clip]; for (const c of clips) ok(ALL_CLIPS.some((q) => q.name === c), `skill ${s.id} clip ${c}`); if (s.sfx) ok(SFX[s.sfx], `skill ${s.id} sfx ${s.sfx}`); ok(ICONS[s.icon] || TEXTURE_LIBRARY.get(s.icon), `skill ${s.id} icon ${s.icon}`); }
  for (const m of Object.values(MONSTERS)) ok(MODELS.get(m.body), `monster ${m.id} body ${m.body}`);
  for (const k of Object.values(LOOKS)) { for (const t of [...k.floor, k.wall]) ok(TEXTURE_LIBRARY.get(t), `texture ${t}`); ok(MODELS.get(k.torch), `torch ${k.torch}`); for (const d of [...k.dress, ...k.wallDress]) ok(MODELS.get(d), `dressing ${d}`); }
  for (const z of Object.values(ZONES)) { ok(SONGS[z.song], `zone ${z.id} song ${z.song}`); ok(LOOKS[z.look], `zone ${z.id} look`); }
  // Sim source mentions of sfx exist.
  const simText = files.filter((f) => /sim|data\/classes/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const m of simText.matchAll(/\bsfx: '([a-z_]+)'/g)) ok(SFX[m[1]], `sfx ${m[1]} exists`);
  for (const m of simText.matchAll(/t: 'sfx', id: '([a-z_]+)'/g)) ok(SFX[m[1]] || m[1] === 'fanfare', `sfx ${m[1]} exists`);
  for (const c of NEW_CLIPS) eq(validateClip(c, HERO_RIG).length, 0, `clip ${c.name} valid ${validateClip(c, HERO_RIG)[0]}`);
  { const b = buildModel('hero_sexton', { catalog: MODELS }); for (const c of compileClips(ALL_CLIPS, HERO_RIG, b.object)) for (const t of c.tracks) { let good = true; for (const v of t.values) if (!Number.isFinite(v)) good = false; if (!good) { ok(false, `clip ${c.name} track ${t.name} has NaN`); break; } } }
  for (const [k, d] of Object.entries(SFX)) { const r = renderSound(d); let p = 0; for (const v of r) p = Math.max(p, Math.abs(v)); ok(p > 0.01 && p <= 1, `sound ${k} peak ${p}`); }
  ok(Object.keys(SFX).length >= 60, '60+ sounds');
  for (const reg of Object.values(SYLLABLES)) for (const d of reg) { const r = renderSound(d); let p = 0; for (const v of r) p = Math.max(p, Math.abs(v)); ok(p > 0.01 && p <= 1.2, `syllable peak ${p}`); }
  for (const [k, d] of Object.entries(SONGS)) { ok(parseSong(d).notes?.length !== 0, `song ${k}`); ok(Object.keys(d.patterns).length >= 3, `song ${k} has 3+ patterns`); }
  ok(Object.keys(SONGS).length >= 10, '10 songs');
  for (const d of ALL_OWN) { const r = checkModel(d, { catalog: MODELS }); eq(r.problems.length, 0, `model ${d.id}: ${r.problems[0]?.message ?? r.problems[0]}`); }
  ok(MODEL_LIBRARY.all().length > 100, 'library present');
  for (const line of readFileSync('tools/hashes.txt', 'utf8').trim().split('\n')) { const [hash, file] = line.split(/\s+/); eq(createHash('sha256').update(readFileSync(file)).digest('hex'), hash, `${file} unchanged`); }
  void buildModel;
  // analyzeClip runs on the engine's own hero, same rig: new gaits must be clean.
  { const game = { name: 'clipcheck', async setup(ctx) { this.hero = await ctx.loadModel(HERO_MODEL); }, cameraTarget() { return new THREE.Vector3(); } }; const e = await Engine.headless(game, {}); const shamble = NEW_CLIPS.find((c) => c.name === 'Shamble'); const clip = compileClips([shamble], HERO_RIG, game.hero.scene)[0]; const rep = analyzeClip(game.hero.scene, HERO_RIG, shamble, clip); eq(rep.problems.length, 0, `Shamble analyzeClip: ${rep.problems[0]}`); e.dispose(); }
});
