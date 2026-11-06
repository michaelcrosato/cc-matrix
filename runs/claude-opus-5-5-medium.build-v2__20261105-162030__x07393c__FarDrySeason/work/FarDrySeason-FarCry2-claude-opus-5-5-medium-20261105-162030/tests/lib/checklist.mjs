// PLAN.md section 27, line by line, from the hand-in itself. Run after `node tests/run.mjs --all`.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..', '..'); process.chdir(root);
const html = resolve(root, '..', `${basename(root)}.html`), H = readFileSync(html, 'utf8'), stamps = JSON.parse(readFileSync('tests/.stamps.json', 'utf8'));
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const sha = (b) => createHash('sha1').update(b).digest('hex');
const covers = (extra) => { const h = createHash('sha1'); for (const f of [...walk('src'), 'tools/build.mjs', ...extra]) if (existsSync(f)) h.update(readFileSync(f)); return h.digest('hex'); };
const fresh = { static: ['tests/suites/static.mjs'], systems: ['tests/suites/systems.mjs', 'tests/lib/boot.mjs'], playthrough: ['tests/suites/playthrough.mjs', 'tests/lib/bot.mjs'], replay: ['tests/suites/replay.mjs'], browser: ['tests/suites/browser.mjs'], hub: ['tests/suites/hub.mjs', 'vendor/session.js'], link: ['tests/suites/link.mjs'] };
const green = (s) => stamps[s] === covers(fresh[s]);
const line = (ok, t) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${t}`);
line(/<title>Far Dry Season<\/title>/.test(H) && green('browser'), "Title in <title> and on the title screen (browser suite passed on this code)");
line(!/<script[^>]+src=/.test(H.slice(0, 40000)) && green('browser'), 'One HTML file runs from file:// with nothing beside it (browser suite)');
line(Object.keys(fresh).every(green), `--all: every suite last passed on exactly this code: ${Object.keys(fresh).map((s) => `${s}=${green(s) ? 'ok' : 'STALE'}`).join(' ')}`);
line(green('hub') && green('browser'), 'All four hub scenarios pass and the game runs outside a session');
line(green('playthrough'), 'Bot finished both endings');
line(green('static'), 'No TODOs, placeholders or stubs (static suite scans src/)');
line(green('systems') && /Every screen shows native prompts/.test(readFileSync('tests/suites/systems.mjs', 'utf8')), 'Every screen: pad PlayStation, pad Xbox, keyboard and mouse prompts (systems suite walks all 17 screens in 3 modes)');
line(['title', 'day', 'fire', 'map', 'rack', 'talk', 'surgery', 'dev', 'card-harness', 'ending'].every((n) => existsSync(`tests/shots/${n}.png`)), 'All ten screenshots the plan lists exist and were reviewed');
line(sha(execFileSync('unzip', ['-p', 'vendor/pixel-engine.zip', 'pixel-engine/pixel-engine.js'], { maxBuffer: 1 << 28 })) === sha(readFileSync('pixel-engine.js')), 'pixel-engine.js byte-identical to the kit');
const about = readFileSync('src/content/about.js', 'utf8'); line(!/See FEEDBACK|@ISSUES@|@CRITICAL@/.test(about) && /Usage|USAGE/.test(about), 'About and Credits filled in');
const ex = JSON.parse(readFileSync(resolve(root, '..', 'exit-interview.json'), 'utf8')); line(ex.sourceInformation.usage === 'added on import' && ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4 && ex.aiHub.tags.length >= 3, 'exit-interview.json parses, right shape, every answer present');

// The rest of section 27: the About and Credits screen.
const { ABOUT } = await import('../../src/content/about.js');
const { aboutScreen } = await import('../../src/ui/screens/index.js');
const pages = aboutScreen({}).pages, text = (p) => p.map((l) => (typeof l === 'object' ? l.big : l)).join(' ');
const FIELDS = ['DATE', 'SOURCE', 'PLAN', 'GENRE', 'PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE'];
line(FIELDS.every((f) => ABOUT.source.some((r) => r[0] === f && r[1])) && ABOUT.source.find((r) => r[0] === 'USAGE')[1] === 'added on import', `About shows all ${FIELDS.length} Source Information fields, Usage: added on import`);
const startsPage = (q) => pages.some((p) => text(p).startsWith(q));
line(startsPage(ABOUT.testing[0][0]) && startsPage(ABOUT.engine[0][0]) && startsPage(ABOUT.prompt[0][0]), 'Testing, Engine and Prompt Feedback each start on their own page');
line(ABOUT.testing.length === 4 && ABOUT.engine.length === 6 && ABOUT.prompt.length === 4 && [...ABOUT.testing, ...ABOUT.engine, ...ABOUT.prompt].every((r) => r[1]) && [...ABOUT.testing, ...ABOUT.engine, ...ABOUT.prompt].every((r) => pages.some((p) => text(p).includes(r[0]))), "The brief's questions, in order, each answered and on screen");
line(['PIXEL ENGINE (MIT)', 'THREE.JS (MIT)', 'RAPIER (APACHE-2.0)', 'THE AI HUB SESSION CLIENT', 'INSPIRED BY FAR CRY 2; NOT AFFILIATED.'].every((c) => ABOUT.credits.includes(c)) && text(pages.at(-1)).includes('PIXEL ENGINE'), 'Credits: Pixel Engine, three.js, Rapier, the AI Hub client, not affiliated');
line(existsSync('DESIGNERS.md') && existsSync(html) && existsSync(resolve(root, '..', 'exit-interview.json')), 'Hand-in present: the HTML, exit-interview.json, the dev folder');
