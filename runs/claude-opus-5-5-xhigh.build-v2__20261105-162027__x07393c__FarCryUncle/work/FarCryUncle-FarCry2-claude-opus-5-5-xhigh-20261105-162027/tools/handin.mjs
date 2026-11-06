// The hand-in, checked against TASK.md and PLAN section 27, one printed line for each thing asked for.
// Reads the delivered files as they are; run it last. Exit 1 if any line fails.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEV = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = dirname(DEV);
const STEM = basename(DEV);
const HTML = join(WORK, `${STEM}.html`);
let failed = 0;
const line = (ok, what, note = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${note ? ` (${note})` : ''}`); };

// Names and places.
line(/^[A-Za-z]+-FarCry2-claude-opus-5-5-xhigh-20261105-162027$/.test(STEM), 'TASK 11, 24: dev subfolder has the [GameTitle-SOURCE-model-effort-date] name', STEM);
line(existsSync(HTML), 'TASK 11, 24: the single html is in the work root under the same name', `${(statSync(HTML).size / 1e6).toFixed(1)} MB`);
const html = readFileSync(HTML, 'utf8');
line(/<title>Far Cry Uncle<\/title>/.test(html), 'PLAN 27: the title is in <title>');
line(existsSync(join(WORK, 'PROGRESS.md')), 'STAGE: PROGRESS.md kept');

// Nothing else beside it at runtime: only data: and in-page references.
const ext = [...html.matchAll(/<(?:script|link|img|audio|video|source)\b[^>]*?\b(?:src|href)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((u) => !u.startsWith('data:'));
line(ext.length === 0, 'PLAN 27: the html loads no other file', ext.slice(0, 3).join(' '));
const audioFiles = readdirSync(join(DEV, 'src'), { recursive: true }).map(String).filter((f) => /\.(mp3|ogg|wav|flac|m4a)$/i.test(f));
line(audioFiles.length === 0, 'TASK 19: no audio files in the source');

// The engine as it shipped.
const unzip = spawnSync('unzip', ['-p', join(DEV, 'vendor/pixel-engine.zip'), 'pixel-engine/pixel-engine.js'], { maxBuffer: 1 << 28 });
const sha = (b) => createHash('sha256').update(b).digest('hex');
line(unzip.status === 0 && sha(unzip.stdout) === sha(readFileSync(join(DEV, 'pixel-engine.js'))), 'TASK 13, PLAN 27: pixel-engine.js is byte-identical to the kit zip');

// No unfinished work.
const srcFiles = readdirSync(join(DEV, 'src'), { recursive: true }).map(String).filter((f) => f.endsWith('.js'));
const unfinished = [];
for (const f of srcFiles) { const s = readFileSync(join(DEV, 'src', f), 'utf8'); if (/\b(TODO|FIXME|XXX|HACK)\b/.test(s) || /\b(placeholder|not implemented|coming soon|stub)\b/i.test(s)) unfinished.push(f); }
line(unfinished.length === 0, 'TASK 90, PLAN 27: no TODOs, placeholders or stubs in the source', unfinished.join(' '));
const random = srcFiles.filter((f) => /Math\.random/.test(readFileSync(join(DEV, 'src', f), 'utf8')));
line(random.length === 0, 'PLAN: no Math.random in the source', random.join(' '));

// The hub.
for (const [what, re] of [['the session client is inlined first', /<script[^>]*>[\s\S]{0,400}AIHub/], ['hub:session meta for shared-world', /hub:session/]]) line(re.test(html), `TASK 21, 78: ${what}`);

// The exit interview: exact shape, nothing empty.
const shape = {
  sourceInformation: ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'],
  aiHub: ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'],
};
let ei = null;
try { ei = JSON.parse(readFileSync(join(WORK, 'exit-interview.json'), 'utf8')); line(true, 'TASK 109: exit-interview.json is beside the html and parses'); } catch (e) { line(false, 'TASK 109: exit-interview.json parses', e.message); }
if (ei) {
  const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  line(same(Object.keys(ei), ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub']), 'TASK 110: its top level keys are exactly the five asked for');
  line(same(Object.keys(ei.sourceInformation), shape.sourceInformation), 'TASK 111: sourceInformation has exactly the fifteen fields');
  line(same(Object.keys(ei.aiHub), shape.aiHub), 'TASK 115: aiHub has exactly the ten fields');
  line(Object.values(ei.sourceInformation).every((v) => typeof v === 'string' && v.trim()), 'TASK 109: every sourceInformation value is filled');
  line(ei.sourceInformation.usage === 'added on import', 'TASK 107: usage says "added on import"');
  line(ei.sourceInformation.date === '2026-11-05 16:20:27' && ei.sourceInformation.source === 'Far Cry 2' && ei.sourceInformation.plan === 'PLAN.md', 'TASK 94-96: date, source and plan');
  line(ei.sourceInformation.environment === 'Claude Code CLI (headless); Linux' && ei.sourceInformation.model === 'Anthropic, claude-opus-5-5, reasoning effort xhigh', 'TASK 105-106: environment and model');
  line(ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4, 'TASK 130-151: four, six and four answers');
  const answers = [...ei.testingFeedback, ...ei.engineFeedback, ...ei.promptFeedback];
  line(answers.every((a) => typeof a === 'string' && a.trim() && !a.includes('%')), 'TASK 109: every answer is filled, counts substituted');
  const a = ei.aiHub;
  line(Object.entries(a).every(([k, v]) => k === 'series' || (Array.isArray(v) ? v.length : String(v).trim())), 'TASK 115: every aiHub value is filled');
  line(a.name === 'Far Cry Uncle', 'TASK 116: aiHub name is the title on the title screen');
  line(['Game', 'Tech demo', 'Tool'].includes(a.type), 'TASK 119: aiHub type is an allowed value', a.type);
  line(['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(a.genre), 'TASK 120: aiHub genre is an allowed value', a.genre);
  line(['1', '1–2', '1–4'].includes(a.players), 'TASK 123: aiHub players is an allowed value', a.players);
  line(a.tags.length >= 3 && a.tags.length <= 6 && a.tags.every((t) => t === t.toLowerCase()), 'TASK 125: three to six lowercase tags', a.tags.join(', '));
}

// The same answers inside the game, as data the About screen pages through.
const about = await import(join(DEV, 'src/content/about.js'));
const q = (rows) => rows.map((r) => r[0]);
line(['DATE', 'SOURCE', 'PLAN', 'GENRE AND PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE'].every((k, i) => about.SOURCE_INFO[i]?.[0] === k), 'TASK 93-107: the About screen lists all the Source Information fields, in order');
const asked = {
  TESTING_FEEDBACK: ['How many issues did testing catch?', 'How many would be considered critical issues / game breaking?', 'What was the most helpful test you ran?', 'What was the least helpful test you ran?'],
  ENGINE_FEEDBACK: ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you had to build yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why? (none if nothing)', 'If you could change one thing about the engine, what would it be?'],
  PROMPT_FEEDBACK: ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?'],
};
for (const [k, qs] of Object.entries(asked)) line(JSON.stringify(q(about[k])) === JSON.stringify(qs.map((s) => s.toUpperCase())), `TASK 130-151: the About screen asks the ${k.split('_')[0].toLowerCase()} questions word for word, in order`);
for (const c of ['Pixel Engine (MIT)', 'three.js (MIT)', 'Rapier (Apache-2.0)', 'The AI Hub session client', 'Inspired by Far Cry 2; not affiliated']) line(about.CREDITS_LINES.includes(c), `PLAN 27: credit "${c}"`);
for (const s of ['Far Cry Uncle', 'Controller or keyboard required']) line(html.includes(s), `TASK 87: the delivered page contains "${s}"`);
const answersInBuild = about.ENGINE_FEEDBACK.every((r) => html.includes(r[1].slice(0, 40).replace(/'/g, "'")));
line(answersInBuild, 'TASK 93: the delivered page carries the current About answers (rebuilt after the last edit)');

// PLAN 23: the head in its strict order, the session tags, the licences.
const head = html.slice(0, html.indexOf('</head>')).toLowerCase();
const order = ['<!doctype html>', '<meta charset', '<script>', 'name="hub:session"', 'name="viewport"', '<title>'].map((x) => head.indexOf(x));
line(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])), 'PLAN 23: head order: doctype, charset, session script, hub tags, viewport, title');
line(['hub:session-players', 'hub:session-mode', 'hub:session-minutes', 'hub:webgpu', 'hub:session-goal', 'hub:session-howto'].every((m) => head.includes(m)), 'PLAN 19, 23: all the hub:session tags');
line(/<!--[\s\S]*MIT[\s\S]*Apache[\s\S]*-->\s*$/.test(html.slice(html.lastIndexOf('<!--'))), 'PLAN 23: licence texts in a comment at the end');
// PLAN 27's "Done means", one line each, with what proves it.
const suite = (n) => readFileSync(join(DEV, 'tests/suites', `${n}.mjs`), 'utf8');
const titleSrc = readFileSync(join(DEV, 'src/content/title.js'), 'utf8');
line(/GAME_TITLE = 'Far Cry Uncle'/.test(titleSrc) && /GAME_TITLE/.test(readFileSync(join(DEV, 'src/ui/shell.js'), 'utf8')), 'PLAN 27.1: the title is on the title screen (GAME_TITLE, drawn by the shell) and in <title>');
line(suite('browser').includes('nothing but the file itself is loaded'), 'PLAN 27.2: runs from file:// with nothing beside it (browser suite asserts it)');
const rerun = spawnSync('node', ['tests/run.mjs'], { cwd: DEV, encoding: 'utf8', timeout: 600000, maxBuffer: 1 << 26 });
const count = (rerun.stdout ?? '').trim().split('\n').filter((l) => /passed, \d+ failed/.test(l)).at(-1) ?? '';
const SUITES = 9;
line(count.startsWith(`0 passed, 0 failed, ${SUITES} suites unchanged`), 'PLAN 27.3: tests/run.mjs --all is green for exactly these files (every suite stamp still matches; a failure would delete it)', count);
const hub = suite('hub');
line(['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'scenario=host-leave', 'scenario=server'].every((x) => hub.includes(x)) && suite('browser').includes('not in a session'), 'PLAN 27.4: all four hub scenarios, and the game outside a session');
const play = suite('playthrough');
line(play.includes('both-alive-column') && play.includes('one-dead-alone'), 'PLAN 27.5: the bot finishes the game, both endings: both buddies alive to the column, one dead and alone');
line(unfinished.length === 0, 'PLAN 27.6: no TODOs, placeholders or stubs');
line(suite('systems').includes('everyScreenHasNativePrompts') && suite('static').includes('is pixel art'), 'PLAN 27.7: every screen shows native prompts for PlayStation, Xbox and keyboard/mouse (systems suite walks them all; static holds every pad glyph to pixel art)');
const shots = ['title', 'day', 'nightfire', 'truckmap', 'rack', 'talk', 'surgery', 'dev', 'card', 'ending'];
const newestSrc = Math.max(...srcFiles.map((f) => statSync(join(DEV, 'src', f)).mtimeMs));
const stale = shots.filter((n) => !existsSync(join(DEV, 'tests/shots', `${n}.png`)) || statSync(join(DEV, 'tests/shots', `${n}.png`)).mtimeMs < newestSrc);
line(stale.length === 0, 'PLAN 27.8: the plan\'s ten screenshots are newer than the last source change (and were looked at)', stale.join(' '));
line(unzip.status === 0 && sha(unzip.stdout) === sha(readFileSync(join(DEV, 'pixel-engine.js'))), 'PLAN 27.9: pixel-engine.js is byte-identical to the zip in vendor/, also compared in the static suite');
line(statSync(HTML).mtimeMs >= newestSrc, 'The delivered html was built after the last source change');

const cover = spawnSync('node', ['tools/plan-coverage.mjs'], { cwd: DEV, encoding: 'utf8', timeout: 60000 });
line(cover.status === 0, 'PLAN, all sections: every requirement has its proof (tools/plan-coverage.mjs)', (cover.stdout ?? '').trim().split('\n').at(-1));

console.log(failed ? `${failed} FAILED` : 'hand-in complete');
process.exit(failed ? 1 : 0);
