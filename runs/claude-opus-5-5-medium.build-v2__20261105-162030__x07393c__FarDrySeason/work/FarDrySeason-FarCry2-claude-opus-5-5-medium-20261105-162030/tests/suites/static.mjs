// Nothing here runs the game: it reads the source and the content.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { checkModel, parseSong, renderSound, validateClip, validateTexture, HERO_RIG } from '../../pixel-engine.js';
import { CATALOG, grassFlame, WORLD_MODELS } from '../../src/art/models.js';
import { VIEWMODELS, handsMap } from '../../src/art/viewmodels.js';
import { PEOPLE_CLIPS } from '../../src/art/clips.js';
import { SFX_DEFS } from '../../src/audio/sfx.js';
import { SONGS } from '../../src/audio/music.js';
import { speak, VOICES } from '../../src/audio/voice.js';
import { ABOUT } from '../../src/content/about.js';
import { BARKS, ENDINGS, EPIGRAPHS, FEVER_LINES, LINES, NOTES, SPEAKERS } from '../../src/content/dialogue.js';
import { missionById, MISSIONS } from '../../src/content/missions.js';
import { CASES, siteById, SITES, TRIGS } from '../../src/content/sites.js';
import { SLIDERS, TUNING_DEFAULTS } from '../../src/content/tuning-defaults.js';
import { THROWABLES, UPGRADES, WEAPONS } from '../../src/content/weapons.js';
import { SCRIPTS } from '../../src/missions/scripts.js';
const root = resolve(import.meta.dirname, '..', '..'); process.chdir(root);
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log(`FAIL ${n}`); } };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk('src')) {
  const t = readFileSync(f, 'utf8');
  ok(!/Math\.random/.test(t), `${f}: Math.random`);
  ok(!/\b(TODO|FIXME|coming soon)\b/i.test(t), `${f}: TODO text`);
  ok(!/\bplaceholder\b/i.test(t) && !/\bstub\b/i.test(t), `${f}: stub word`);
}
// Font: A-Z 0-9 space . , : ; ! ? ' " - + = / ( ) [ ] { } % _ # & * @ < > | \ ~ ^ $ ` ° · and curly quotes
const FONT = /^[A-Za-z0-9 .,:;!?'"\-+=/()[\]{}%_#&*@<>|\\~^$`°·‘’“”]*$/;
const text = (s, n) => { ok(FONT.test(s), `font: ${n}: ${s}`); };
for (const [id, list] of Object.entries(LINES)) for (const [who, t] of list) { text(t, id); ok(SPEAKERS[who], `speaker ${who} in ${id}`); ok(t.length <= 90, `long line ${id}: ${t}`); }
for (const [f, set] of Object.entries(BARKS)) for (const [k, l] of Object.entries(set)) for (const t of l) text(t, `${f}.${k}`);
for (const t of [...NOTES, ...EPIGRAPHS, ...FEVER_LINES, ...Object.values(ENDINGS)]) text(t, 'notes');
for (const m of MISSIONS) { text(m.title, m.id); for (const s of m.steps) { text(s.text, `${m.id}.step`); if (s.label) text(s.label, m.id); } }
for (const r of [...ABOUT.source, ...ABOUT.testing, ...ABOUT.engine, ...ABOUT.prompt]) { text(r[0], 'about'); text(r[1], `about ${r[0]}`); }
for (const w of Object.values(WEAPONS)) text(w.name, w.id);
ok(BARKS.concord.spotted.length + BARKS.concord.lost.length + BARKS.concord.grenade.length + BARKS.concord.jammed.length + BARKS.concord.fire.length + BARKS.concord.down.length >= 15, '15 barks concord');
ok(BARKS.harvest.spotted.length + BARKS.harvest.lost.length + BARKS.harvest.grenade.length + BARKS.harvest.jammed.length + BARKS.harvest.fire.length + BARKS.harvest.down.length >= 15, '15 barks harvest');
ok(EPIGRAPHS.length === 12, '12 epigraphs'); ok(NOTES.length === 6, '6 notes'); ok(CASES.length === 12, '12 cases'); ok(TRIGS.length === 6, '6 trigs');
// Models, textures, clips.
for (const d of [...WORLD_MODELS, ...VIEWMODELS, handsMap]) { const r = checkModel(d, { catalog: CATALOG }); ok(!r.problems.length, `model ${d.id}: ${r.problems.join('; ').slice(0, 200)}`); }
ok(!validateTexture(grassFlame).problems.length, 'grass-flame');
for (const c of PEOPLE_CLIPS) { const r = validateClip(c, HERO_RIG); const bad = Array.isArray(r) ? r.filter((x) => x.level === 'error' || x.severity === 'error') : []; ok(!bad.length, `clip ${c.name}`); }
// Sound.
for (const [n, d] of Object.entries(SFX_DEFS)) { const s = renderSound(d, 8000); ok(s.some((v) => Math.abs(v) > 0.002), `sound silent: ${n}`); }
const REQUIRED = ['gun-rifle', 'gun-revolver', 'gun-shotgun', 'gun-bolt', 'jam-click', 'slap', 'rack', 'magazine', 'shell', 'cylinder', 'flare-pop', 'flare-hiss', 'flame-roar', 'bottle-smash', 'rocket', 'explosion', 'ricochet', 'bullet-whip', 'hit-flesh', 'hit-metal', 'fall-apart', 'step-dirt', 'step-grass', 'step-road', 'step-wood', 'step-water', 'breath', 'heartbeat', 'syrette', 'pliers', 'knife', 'finger-snap', 'lighter', 'tablet-bottle', 'grunt', 'fire-loop', 'wind-loop', 'insects-loop', 'birds-loop', 'engine', 'gravel', 'brakes', 'door', 'horn', 'starter', 'wrench', 'train-clack', 'train-whistle', 'map-paper', 'tracker-beep', 'radio', 'thunder', 'rain-loop', 'distant-gunfire', 'ui-move', 'ui-confirm', 'ui-back'];
for (const n of REQUIRED) ok(SFX_DEFS[n], `required sound ${n}`);
ok(Object.keys(SONGS).length >= 6, '6 songs');
for (const [n, s] of Object.entries(SONGS)) { try { ok(parseSong(s), `song ${n}`); } catch (e) { ok(false, `song ${n}: ${e}`); } }
for (const id of Object.keys(VOICES)) { const v = speak(id, 'Sixty-one beds, forty blankets?'); ok(v.list.length > 5 && renderSound(v.list[0].def, 8000).some((x) => Math.abs(x) > 0.01), `voice ${id}`); }
const a = speak('odile', 'blankets'), b = speak('odile', 'blankets'); ok(JSON.stringify(a) === JSON.stringify(b), 'a word always sounds the same');
// Missions resolve.
for (const m of MISSIONS) for (const s of [...m.steps, ...(m.alt?.steps ?? [])]) {
  if (s.site) ok(siteById[s.site], `${m.id} site ${s.site}`);
  if (s.script) ok(SCRIPTS[s.script], `${m.id} script ${s.script}`);
  if (s.onDone) ok(SCRIPTS[s.onDone], `${m.id} onDone ${s.onDone}`);
  if (s.lines) ok(LINES[s.lines], `${m.id} lines ${s.lines}`);
  if (s.to) ok(SITES.some((x) => x.npcs?.some((n) => n[0] === s.to)), `${m.id} npc ${s.to}`);
}
for (const m of MISSIONS) { if (m.brief) ok(LINES[m.brief], `${m.id} brief`); if (m.alt?.call) ok(LINES[m.alt.call], `${m.id} alt`); for (const r of m.requires) ok(missionById[r], `${m.id} requires ${r}`); }
for (const id of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'end']) { const n = Object.entries(LINES).filter(([k]) => k.startsWith(`${id}.`)).reduce((c, [, l]) => c + l.length, 0); ok(n >= 8, `${id} has 8 to 15 spoken lines at least 8 (${n})`); }
for (const g of ['gun-rifle', 'gun-revolver', 'gun-shotgun', 'gun-bolt', 'gun-mg']) ok(SFX_DEFS[`${g}-far`], `distant variant of ${g}`);
ok(SITES.some((s) => s.soldiers?.some((r) => r[0] === 'rocket')), 'rocket soldiers exist');
for (const m of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'end']) ok(missionById[m], `mission ${m}`);
for (const k of Object.keys(TUNING_DEFAULTS)) ok(SLIDERS.some((s) => s.key === k), `tuning ${k} has a slider`);
ok(SLIDERS.length === 20, '20 sliders'); ok(UPGRADES.length === 4, '4 upgrades'); ok(THROWABLES.molotov && THROWABLES.charge, 'throwables');
// Every About answer is filled in.
for (const r of [...ABOUT.testing, ...ABOUT.engine, ...ABOUT.prompt]) ok(r[1] && !/^See /.test(r[1]), `about answer: ${r[0]}`);
// The engine is byte-identical to the kit.
const h = (b2) => createHash('sha1').update(b2).digest('hex');
const inZip = execFileSync('unzip', ['-p', 'vendor/pixel-engine.zip', 'pixel-engine/pixel-engine.js'], { maxBuffer: 1 << 28 });
ok(h(inZip) === h(readFileSync('pixel-engine.js')), 'pixel-engine.js byte-identical to the kit');
// No name left undefined by moving code between files, and every file the plan's layout names exists.
{ let out = ''; try { execFileSync('tsc', ['-p', 'tests/tsconfig-undef.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (x) { out = String(x.stdout ?? ''); }
  const bad = out.split('\n').filter((l) => /TS(2304|2305|2307|2552|2614|2300)/.test(l)); ok(bad.length === 0, `undefined names: ${bad.slice(0, 5).join(' | ')}`);
  const tree = { actors: 'player soldier squad buddy civilian fauna rig', combat: 'weapons projectiles damage viewmodel', body: 'health fever surgery', vehicles: 'vehicle driving repair train', missions: 'runner steps scripts ledger', ui: 'hud menu glyphs prompts dialogue pixfont touchgate about', dev: 'devmode sliders overlays', attract: 'director beats', net: 'session hubSession linkSession soloSession round host client card', audio: 'sfx music voice ambience', art: 'models textures viewmodels clips', content: 'title weapons sites roads missions dialogue notes about tuning-defaults', core: 'actions look tuning save rng state events', world: 'terrain roads sites grass sky fire wind map-texture' };
  for (const [d, fs] of Object.entries(tree)) for (const f of fs.split(' ')) ok(existsSync(`src/${d}/${f}.js`), `plan layout: src/${d}/${f}.js`);
  ok(existsSync('index.html') && readdirSync('src/ui/screens').length > 1, 'plan layout: index.html and ui/screens/*'); }
console.log(`${pass} passed, ${fail} failed`);
