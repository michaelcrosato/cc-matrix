// static: source hygiene, content validity, art checks, audio renders, engine integrity.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ROOT } from '../lib/boot.mjs';
export const covers = ['src', 'vendor', 'pixel-engine.js'];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const FONT = /^[A-Za-z0-9 .,:;!?'"\-+=\/()\[\]{}%_#&*@<>|\\~^$`°·‘’“”\n]*$/;
export async function run(t) {
  const E = await import(ROOT + '/pixel-engine.js');
  const files = walk(join(ROOT, 'src')).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const s = readFileSync(f, 'utf8'); const rel = f.slice(ROOT.length + 1);
    t.ok(!/Math\.random/.test(s), `${rel}: Math.random`);
    t.ok(!/\b(TODO|FIXME|coming soon)\b/i.test(s) && !/placeholder|\bstub\b/i.test(s.replace(/\/\/.*$/gm, '')), `${rel}: TODO/placeholder/stub`);
  }
  // every string in src/content uses only the HUD font's characters (display text), ids are exempt by shape
  const display = [];
  const walkVal = (v, path) => { if (typeof v === 'string') { if (/\s/.test(v) || /[A-Z]/.test(v)) display.push([path, v]); } else if (Array.isArray(v)) v.forEach((x, i) => walkVal(x, path + '[' + i + ']')); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkVal(x, path + '.' + k); };
  const D = await import(ROOT + '/src/content/dialogue.js'), N = await import(ROOT + '/src/content/notes.js'), A = await import(ROOT + '/src/content/about.js'), M = await import(ROOT + '/src/content/missions.js');
  walkVal(D.SEQ, 'SEQ'); walkVal(D.BARKS, 'BARKS'); walkVal(D.NPCS, 'NPCS'); walkVal(N.HARROW_NOTES, 'NOTES'); walkVal(N.EPIGRAPHS, 'EPI'); walkVal(A.ABOUT_PAGES, 'ABOUT');
  for (const m of Object.values(M.MISSIONS)) { walkVal(m.title, m.id + '.title'); for (const s of m.steps) { walkVal(s.text, m.id + '.step'); walkVal(s.title, m.id + '.stitle'); walkVal(s.options?.map((o) => o.label), m.id + '.opt'); } }
  for (const [p, v] of display) t.ok(FONT.test(v), `font: ${p}: ${JSON.stringify(v).slice(0, 60)}`);
  for (const [k, lines] of Object.entries(D.SEQ)) for (const [who, text] of lines) t.ok(text.length <= 200, `${k}: line too long`);
  // models and textures
  const { GAME_MODELS, CATALOG } = await import(ROOT + '/src/art/catalog.js'); const { TEXTURES } = await import(ROOT + '/src/art/textures.js');
  for (const m of GAME_MODELS) { const r = E.checkModel(m, { catalog: CATALOG }); t.ok(r.problems.length === 0, `model ${m.id}: ${JSON.stringify(r.problems).slice(0, 120)}`); }
  for (const x of TEXTURES) { const r = E.validateTexture(x); t.ok(r.problems.length === 0, `texture ${x.id}`); }
  // music and sound
  const { SONGS } = await import(ROOT + '/src/audio/music.js'); const { SFX, LOOPS } = await import(ROOT + '/src/audio/sfx.js');
  t.ok(Object.keys(SONGS).length >= 6, 'at least six songs');
  for (const [k, s] of Object.entries(SONGS)) { try { E.parseSong(s); t.ok(true, ''); } catch (e) { t.fail(`song ${k}: ${e.message}`); } }
  for (const [k, d] of Object.entries({ ...SFX, ...LOOPS })) { const s = E.renderSound(d); let peak = 0; for (const v of s) peak = Math.max(peak, Math.abs(v)); t.ok(peak > 0.01, `sound ${k} is silent`); }
  const need = ['shot_m38', 'shot_tractor', 'shot_mule', 'shot_empire', 'shot_flare', 'shot_tube', 'jam_click', 'slap', 'rack', 'explosion', 'ricochet', 'whip', 'hit_flesh', 'hit_metal', 'fall_apart', 'step_dirt', 'step_grass', 'step_road', 'step_wood', 'step_water', 'heartbeat', 'syrette', 'pliers', 'knife', 'snap', 'lighter', 'tablet', 'tracker_beep', 'squelch', 'paper', 'thunder', 'ui_move', 'ui_confirm', 'ui_back', 'train_clack', 'train_whistle', 'horn', 'wrench', 'starter', 'door', 'brakes', 'engine_idle', 'gravel', 'breath', 'grunt', 'bottle_smash', 'flare_pop', 'stinger_gunfire'];
  for (const n of need) t.ok(n in SFX, `missing sfx ${n}`);
  for (const n of ['wind', 'fire', 'engine', 'rain', 'flame']) t.ok(n in LOOPS, `missing loop ${n}`);
  // content references resolve
  const { SITES, POSTS } = await import(ROOT + '/src/content/sites.js'); const { INTERACTIONS } = await import(ROOT + '/src/content/interactions.js');
  const ids = new Set([...SITES.map((s) => s.id), ...POSTS.map((p) => p.id)]);
  for (const m of Object.values(M.MISSIONS)) for (const s of m.steps) {
    if (s.site) t.ok(ids.has(s.site), `${m.id}: site ${s.site}`); if (s.seq) t.ok(D.SEQ[s.seq], `${m.id}: seq ${s.seq}`); if (s.to) t.ok(D.NPCS[s.to], `${m.id}: npc ${s.to}`);
    if (s.do === 'use') t.ok(INTERACTIONS[s.kind], `${m.id}: use ${s.kind}`);
  }
  for (const m of Object.values(M.MISSIONS)) { if (m.brief) t.ok(D.SEQ[m.brief], `${m.id}: brief ${m.brief}`); if (m.alt?.call) t.ok(D.SEQ[m.alt.call], `${m.id}: alt call`); }
  const T = await import(ROOT + '/src/content/tuning-defaults.js'); for (const k of Object.keys(T.TUNING_DEFAULTS)) t.ok(T.SLIDERS.some((s) => s[0] === k), `tuning ${k} has no slider`);
  t.ok(D.BARKS.concord.spotted.length >= 3 && Object.keys(D.BARKS.concord).length >= 8, 'barks per faction');
  const nbarks = (f) => Object.values(D.BARKS[f]).flat().length; t.ok(nbarks('concord') >= 15 && nbarks('harvest') >= 15, 'at least 15 barks per faction');
  // the engine ships as the kit's copy
  const zipHash = createHash('sha256').update(execFileSync('unzip', ['-p', join(ROOT, 'vendor/pixel-engine.zip'), 'pixel-engine/pixel-engine.js'], { maxBuffer: 1 << 29 })).digest('hex');
  const here = createHash('sha256').update(readFileSync(join(ROOT, 'pixel-engine.js'))).digest('hex'); t.ok(zipHash === here, 'pixel-engine.js differs from the kit zip');
  t.ok(readFileSync(join(ROOT, 'src/content/title.js'), 'utf8').includes("GAME_TITLE = 'Far Pry 2'"), 'title constant');
}
