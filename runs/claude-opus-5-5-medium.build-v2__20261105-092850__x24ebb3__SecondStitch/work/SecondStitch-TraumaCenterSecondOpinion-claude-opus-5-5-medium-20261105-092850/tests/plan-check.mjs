// node tests/plan-check.mjs <passed-labels-file>: PLAN.md and TASK.md, requirement by requirement, against the shipped build.
// Evidence is a test that passed on this run (T), a value read from data or the built page (V), or a file on disk (F).
// Writes docs/PLAN-CHECK.md; prints only failures and one count line.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { launch, open, tap, waitFrames } from './browser/lib.mjs';
import { OPS, CAMPAIGN_OPS, CONSULT_OPS, SESSION_LIST } from '../src/content/ops/index.js';
import { SCENES } from '../src/content/scenes/index.js';
import { CAST } from '../src/content/cast.js';
import { SETS } from '../src/content/sets.js';
import { SONGS } from '../src/content/songs.js';
import { SFX_DEFS } from '../src/content/sfx.js';
import { ARENAS } from '../src/content/arenas.js';
import { TOOLS } from '../src/sim/tools.js';
import { KINDS } from '../src/sim/entities.js';
import { STRAINS } from '../src/sim/strains/index.js';
import { defaults, DIFFICULTY, SLIDERS } from '../src/core/config.js';
import { CAMPAIGN } from '../src/sim/campaign.js';
import { DEFAULT_SETTINGS } from '../src/core/save.js';
import { OUTPUT, TITLE } from '../src/core/meta.js';
import { REEL } from '../src/stages/attract.js';

const labels = readFileSync(process.argv[2], 'utf8').split('\n');
const rows = [];
const add = (sec, req, kind, ok, detail = '') => rows.push({ sec, req, kind, ok: !!ok, detail: String(detail) });
const T = (sec, req, ...patterns) => { const hits = patterns.map((p) => labels.filter((l) => p.test(l))); const bad = patterns.filter((_, i) => !hits[i].length); add(sec, req, 'T', !bad.length, bad.length ? `no passed test for ${bad.join(' ')}` : `${hits.flat().length} passed: ${hits.map((h) => h[0].replace(/^[a-z]+: /, '')).slice(0, 2).join('; ')}`); };
const V = (sec, req, ok, detail = '') => add(sec, req, 'V', ok, detail);
const F = (sec, req, path) => add(sec, req, 'F', existsSync(path), path);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const html = readFileSync(`../${OUTPUT}.html`, 'utf8');
const dist = readFileSync('dist/game.html', 'utf8');
const shots = readdirSync('shots');
const exit = JSON.parse(readFileSync('../exit-interview.json', 'utf8'));

/* ---- 1, 2: game, world, cast ---- */
V('1', 'Title picked by the brief; nothing in the story depends on it', TITLE === 'SECOND STITCH' && !JSON.stringify(SCENES).toUpperCase().includes(TITLE), TITLE);
T('1', 'No forbidden source names', /no forbidden source names/);
V('2', 'Six main cast with a voice each', ['ilya', 'reyes', 'sabine', 'bram', 'pem', 'hesper'].every((k) => CAST[k]?.voice), Object.keys(CAST).join());
V('2', 'Eleven scenes in the plan order, then credits', eq(CAMPAIGN.filter((e) => e.scene).map((e) => e.scene), ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8', 'ep9', 'ep10', 'end']) && !!CAMPAIGN.at(-1).credits);
V('2', 'Scene sets as the plan lists them', eq(['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7', 'ep8', 'ep9', 'ep10'].map((k) => SCENES[k].set), ['or7', 'ward', 'corridor', 'office', 'ward', 'scrub', 'atrium', 'office', 'roof', 'or7']));
T('2', 'Each scene is 8 to 16 beats, text fits and uses the font', /ep1: 8 to 16 beats/, /end: 8 to 16 beats/, /text: speakers, characters, fit and tokens/);
V('2', 'Every patient has a chart and a follow-up line per rank', Object.values(OPS).every((d) => d.patient?.hook && ['S', 'A', 'B', 'C'].every((r) => d.patient.followUp[r])));

/* ---- 3: operating ---- */
V('3', 'Eight tools in wheel order', eq(TOOLS, ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner']));
V('3', 'Starting numbers from the plan', defaults.cursorSpeed === 10 && defaults.steadyFactor === 0.4 && defaults.drainRate === 1.4 && defaults.laserTime === 0.7 && defaults.syringeDose === 18 && defaults.mistakePenalty === 6 && defaults.bleedDrain === 0.35 && defaults.maxMistakes === 5 && defaults.composureGain === 7 && defaults.quietSlow === 0.25 && defaults.quietDrain === 18 && defaults.lookCost === 60 && defaults.lookSeconds === 4 && defaults.irae === 72 && defaults.codeBlueZone === 0.2);
T('3', 'Drain: clears, rated, bruises on dry tissue', /drain: clears a pool/, /drain: rated CLEAN/, /drain: dry tissue/);
T('3', 'Forceps: path, tear, dish, magnet speed limit, tether', /forceps: pulled free/, /forceps: flicks/, /forceps: off path tears/, /magnet: too fast/, /tether: letting go/);
T('3', 'Scalpel: CLEAN, healthy tissue, resume', /scalpel: clean trace/, /scalpel: cutting healthy/, /scalpel: letting go resumes/);
T('3', 'Suture: slots, rhythm, sloppy crossing', /suture: zigzag/, /suture: rhythm/, /suture: crossing far/);
T('3', 'Laser, Scanner, Gel, Syringe', /laser: burns/, /laser: healthy/, /scanner: reveals/, /gel: paints/, /gel: heals/, /syringe: dose/, /syringe: outside/);
T('3', 'Bone Mend: turn and seat', /bone mend: wrong angle/, /bone mend: turned/, /op 4, real input: all six/);
T('3', 'Clock, five mistakes', /clock: reaching 0/, /mistakes: five/);
V('3', 'Difficulties', DIFFICULTY.intern.time === 1.4 && DIFFICULTY.intern.drain === 0.6 && DIFFICULTY.intern.saves === 2 && DIFFICULTY.resident.time === 1 && DIFFICULTY.attending.time === 0.8 && DIFFICULTY.attending.drain === 1.3 && DIFFICULTY.attending.hint === false);
T('3', 'Ranks, caps, retry', /rank: bounds/, /rank: caps/, /rank: unscripted/, /retry: checkpoint/, /fail: retry resumes/);
T('3', 'The Quiet: time scale, vitals, drain, threshold', /quiet: the world/, /quiet: vitals/, /quiet: drains/, /quiet: needs 20/);
T('3', 'The Second Look: exact restore, cost, ghost, 5%', /second look: entities/, /second look: costs/, /second look: 5%/);
T('3', 'Code Blue: start, bad shock, two good, one save, timeout', /code blue: starts/, /code blue: a bad/, /code blue: two good/, /code blue: Resident/, /code blue: running out/);

/* ---- 4: controls ---- */
T('4', 'Mouse, stick, triggers, flick; surface aim', /mouse: the tip lands/, /mouse: drain/, /pad: left stick/, /pad: right stick/, /pad: R2/);
T('4', 'Keys play an op', /op in Node: keys moved/);
T('4', 'One press, one action at any frame rate', /one Tab at 15/, /one Tab at 240/, /pad at 15 and 240 fps: D-pad/, /pad at 15 and 240 fps: a flick/);
T('4', 'Prompts follow the last device; Xbox option', /prompts: follow/, /prompts: the Xbox/, /prompts: keyboard/);
T('4', 'Rumble call path', /rumble: the call path/);

/* ---- 5: the ops, the plan's table ---- */
const TABLE = { op1: ['ELEVEN HOOKS', 'ilya', 'forearm', 240, 85, 0.1, 3], op2: ['THE VANISHING ACT', 'ilya', 'stomach', 300, 80, 0.15, 3], op3: ['NIGHT FERRY', 'ilya', 'tables', 360, 70, 0.25, 5], op4: ['STICKS AND STONES', 'ilya', 'bone', 330, 75, 0.2, 3], op5: ['INTROIT', 'ilya', 'liver', 360, 80, 0.3, 4], op6: ['COLD HANDS', 'sabine', 'kidney', 360, 80, 0.2, 3], op7: ['LACRIMOSA', 'ilya', 'lung', 390, 80, 0.3, 4], op8: ['DIES IRAE', 'ilya', 'heart', 420, 75, 0.35, 5], op9: ['LIBERA ME', 'ilya', 'chest', 540, 70, 0.35, 6], op10: ['DO NO HARM', 'ilya', 'spine', 240, 60, 0.05, 2] };
for (const [id, want] of Object.entries(TABLE)) {
  const d = OPS[id], got = [d.title, d.surgeon, d.arena, d.time, d.vitals.start, d.vitals.drain, d.doses];
  V('5', `${id}: title, surgeon, arena, time, vitals, drain, doses`, eq(got, want), got.join(' / '));
  T('5', `${id}: idle fails, bot clears at 0.7 and 1.0, deterministic, checkpoint`, new RegExp(`${id}: idle fails`), new RegExp(`${id}: bot 0.7`), new RegExp(`${id}: bot 1.0`), new RegExp(`${id}: determinism`), new RegExp(`${id}: a stage checkpoint`));
}
V('5', 'Op 3 tables start at 70/60/55', eq(OPS.op3.tables.map((t) => t.vitals), [70, 60, 55]));
const stageIds = (id) => OPS[id].stages.map((s) => s.id);
V('5', 'Op 1 ends on the twelfth hook', stageIds('op1').at(-1) === 'twelve');
V('5', 'Op 3: the Quiet awakens on the crash', OPS.op3.stages.find((s) => s.id === 'crash').begin.some((c) => c.unlock === 'gift'));
V('5', 'Op 4: scripted Code Blue', OPS.op4.stages.some((s) => s.begin?.some((c) => c.codeBlue)));
V('5', 'Op 6: Second Look prompt, cold time, pink-up', stageIds('op6').includes('burst') && stageIds('op6').includes('pink') && OPS.op6.stages.some((s) => s.begin?.some((c) => c.cold === 120)));
V('5', 'Op 9: no voice, no hint marker, partner bot', OPS.op9.noVoice && OPS.op9.noHint && OPS.op9.partnerBot);
V('5', 'Op 10: pain rises with each removal', OPS.op10.stages.find((s) => s.id === 'tendrils').spawn.every((e) => e.then.some((c) => c.pain != null)));

/* ---- 6: strains ---- */
V('6', 'Five strain behaviours', ['introit', 'lacrimosa', 'irae', 'miserere', 'pileup'].every((k) => STRAINS[k]?.step));
T('6', 'Introit, Lacrimosa, Dies Irae, Libera Me clear with the bot', /op5: bot 1.0/, /op7: bot 1.0/, /op8: bot 1.0/, /op9: bot 1.0/);
T('6', 'The crown draws seven plates', /dies irae: the crown/);
V('6', 'Libera Me: false monitor, reprise of three strains, Miserere, forced Code Blue, the line', OPS.op9.stages[0].begin.some((c) => c.fake === 99) && OPS.op9.stages[1].spawn.length === 3 && stageIds('op9').includes('miserere') && stageIds('op9').includes('blue') && OPS.op9.stages.find((s) => s.id === 'line').say[1].includes('crooked'));

/* ---- 7: Consult ---- */
T('7', 'Couch: pads scrub in, independent tips, wheels, gloves, icons', /couch: two pads/, /couch: two independent/, /couch: the second seat/, /couch: gloves/, /couch: a tool icon/);
V('7', 'Consult picks: Pile-Up or cleared ops, never Op 3 or 9', CONSULT_OPS.includes('pileup') && !CONSULT_OPS.includes('op3') && !CONSULT_OPS.includes('op9'));
V('7', 'Session round list', eq(SESSION_LIST, ['pileup', 'c-introit', 'c-lacrimosa', 'c-irae']));
V('7', 'Session rounds at most 4 minutes', SESSION_LIST.every((id) => OPS[id].time <= 240), SESSION_LIST.map((id) => OPS[id].time).join());
T('7', 'Network sizes at each peak', /op9: snapshot under/, /op9: keyframe under/, /pileup: snapshot under/, /pileup: keyframe under/);
T('7', 'Awards inside the limits; drift correction; co-op scale', /awards: at most 3/, /awards: titles/, /drift: over a unit/, /slider coop scale: more seats/);
for (const sc of ['players=2', 'players=3', 'players=4&latency=150&jitter=50&loss=5$', 'scenario=host-leave', 'scenario=server']) T('7', `Hub harness: ${sc.replace('$', '')}`, new RegExp(`hub .*${sc}`));

/* ---- 9: art, 10: audio ---- */
V('9', 'All ten arenas exist', ['forearm', 'stomach', 'tables', 'bone', 'liver', 'kidney', 'lung', 'heart', 'chest', 'spine'].every((k) => ARENAS[k]));
V('9', 'All sets exist', ['or7', 'scrub', 'office', 'ward', 'corridor', 'atrium', 'roof', 'morning'].every((k) => SETS[k]));
T('9', 'Models pass the kit sheet check', /check.mjs --sheets/);
T('9', 'The hand holds the tool', /hand: the palm/);
const need = ['a1', 'a2', 'a3', 'a3b', 'a3c', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'patient-tomasz', 'patient-zamboni', 'patient-ollie', 'patient-ottilie', 'title', 'menu', 'results', 'fail', 'pause', 'dev', 'settings', 'codeblue', 'massage', 'about', 'couch'];
const missing = need.filter((n) => !shots.includes(`${n}.png`));
V('13', 'Screenshots at 1080p: each arena, set, bust, title, results, HUD', !missing.length, missing.join() || `${need.length} files`);
V('10', 'Music: every track the plan lists', ['title', 'ward', 'or-calm', 'or-tense', 'or-critical', 'boss-introit', 'boss-lacrimosa', 'boss-irae', 'boss-libera', 'boss-miserere', 'op10', 'results', 'sad', 'credits'].every((k) => SONGS[k]));
V('10', 'Sound effects: every family the plan lists', ['drainLoop', 'forceps', 'hookPop', 'tink', 'slice', 'stitch', 'knot', 'laserLoop', 'sizzle', 'ping', 'gelLoop', 'syringeDraw', 'inject', 'beep', 'alarm', 'flatline', 'charge', 'clear', 'uiMove', 'uiConfirm', 'uiBack', 'stamp', 'rateClean', 'heartbeat', 'inhale', 'rewind', 'knock', 'rain', 'horn', 'bell'].every((k) => SFX_DEFS[k]));
T('10', 'Sound renders; music 10%; voices play; analyser level', /sfx drainLoop/, /voice timbre 0/, /song title parses/, /music: 10%/, /voices: syllables/, /voice: an AnalyserNode/);
V('10', 'No audio files in the build', !/data:audio\/(mp3|ogg|mpeg)|\.mp3|\.ogg['"]/.test(readFileSync('game.js', 'utf8')) && !readdirSync('.').some((f) => /\.(mp3|ogg|wav)$/.test(f)));

/* ---- 11, 12: architecture, balance ---- */
const simFiles = readdirSync('src/sim').filter((f) => f.endsWith('.js')).map((f) => `src/sim/${f}`).concat(['src/sim/strains/index.js']);
const impure = simFiles.filter((f) => /pixel-engine|document\.|window\.|performance\.now|Math\.random|Date\.now/.test(readFileSync(f, 'utf8')));
V('11', 'src/sim imports nothing from the engine, the DOM or the clock', !impure.length, impure.join());
F('11', 'docs/AUTHORING.md', 'docs/AUTHORING.md');
V('11', 'Kinds the plan lists are registered', ['pool', 'hook', 'nick', 'laceration', 'incision', 'tumor', 'polyp', 'prop', 'magnet', 'bleeder', 'clamp', 'fragment', 'organ', 'mask', 'strain'].every((k) => KINDS[k]));
const wantSliders = ['vitalsDrain', 'bleedDrain', 'mistakePenalty', 'maxMistakes', 'timeLimit', 'cursorSpeed', 'steadyFactor', 'aimAssist', 'toolTolerance', 'drainRate', 'laserTime', 'syringeDose', 'composureGain', 'quietSlow', 'quietDrain', 'lookCost', 'lookSeconds', 'strainSpeed', 'strainHp', 'irae', 'codeBlueZone', 'coopScale'];
V('12', 'Dev Mode has every slider the plan lists', wantSliders.every((k) => SLIDERS.some((s) => s[0] === k)), `${SLIDERS.length} sliders`);
T('12', 'Every slider has a behaviour test; reset restores', /slider coop/, /slider time limit/, /slider strain HP: a running/, /slider base BPM/, /slider aim assist: 60/, /slider drain rate/, /slider mistake cost/, /slider max mistakes/, /slider vitals drain/, /slider bleed drain/, /slider composure/, /slider quiet slow/, /slider quiet drain/, /slider syringe/, /slider laser/, /slider tool tolerance/, /slider look cost/, /slider strain speed/, /slider code blue/, /slider cursor speed/, /sliders: reset/);

/* ---- 13: testing ---- */
T('13', 'Whole game: Node walk, and the real page with the bot', /playthrough: every scene/, /playthrough in the page: reaches/, /playthrough in the page: ten ops/);
T('13', 'file:// boot; not in a session; still draws on its own', /boot: title from file/, /session: AIHub inactive/, /session: Math.random/, /on its own/);
T('13', 'Menus by pad, keys and hover', /menu: keys/, /menu: hover/, /menu: pad/);
T('13', 'Attract: starts, key and pad exit, save untouched', /attract: starts/, /attract: a key/, /attract: a pad/, /attract: save/);
T('13', 'Touch-only: exact text, gear, no joystick, attract', /touch-only: the exact/, /touch-only: the settings/, /touch-only: no joystick/, /touch-only: attract/);
T('13', 'Pause, Dev Mode, slider, reset, ?dev= flag', /pause: opens/, /dev mode: reachable/, /dev mode: a slider/, /dev mode: reset/, /dev flag/);
T('13', 'Replays: real stages, kit --headless with keys', /replay: an operation/, /check.mjs --headless --keys/);
T('13', 'No TODOs; About has every field', /no TODOs/, /about: every field/, /about: feedback/);

/* ---- 14, 16: packaging ---- */
V('14', 'Deliverable is the tested build', html === dist);
const session = readFileSync('vendor/session.js', 'utf8');
V('14', 'Session client verbatim, first script after charset', html.includes(session) && html.indexOf('<script>') < html.indexOf('<meta name="viewport"') && html.indexOf('charset') < html.indexOf('<script>'));
let liveClient = '';
try { liveClient = execFileSync('curl', ['-sfL', 'https://raw.githubusercontent.com/michaelcrosato/ai-hub/main/lib/hub/session.js'], { encoding: 'utf8', timeout: 30000 }); } catch { liveClient = ''; }
V('14', 'Session client matches the hub today', liveClient && liveClient === session, liveClient ? '' : 'could not fetch');
for (const [k, v] of [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'shared-world'], ['hub:session-minutes', '4'], ['hub:webgpu', 'required'], ['hub:session-goal', 'Keep the patient alive and top the team score'], ['hub:session-howto', 'Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.'], ['hub:type', 'Game'], ['hub:source', 'Trauma Center: Second Opinion']]) V('14', `Tag ${k}`, html.includes(`<meta name="${k}" content="${v}">`));
V('14', 'Goal and how-to within the limits', 'Keep the patient alive and top the team score'.length <= 60 && 'Stick/mouse: move tool. R2/click: use. Right stick/1-8: pick tool.'.length <= 80);
V('14', 'Icon as a data URL; furniture pack inside', html.includes('rel="icon" href="data:') && html.includes('packs/kenney-furniture.json'));
// The engine as it ships.
const tmp = mkdtempSync('tests/.kit-');
let engineSame = null;
try {
  execFileSync('curl', ['-sfL', '-o', `${tmp}/k.zip`, 'https://github.com/michaelcrosato/riftlight/releases/latest/download/pixel-engine.zip'], { timeout: 120000 });
  execFileSync('unzip', ['-q', '-o', `${tmp}/k.zip`, 'pixel-engine/pixel-engine.js', '-d', tmp]);
  const h = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  engineSame = h(`${tmp}/pixel-engine/pixel-engine.js`) === h('pixel-engine.js');
} catch (e) { engineSame = null; }
rmSync(tmp, { recursive: true, force: true });
V('16', 'pixel-engine.js is byte-identical to the released kit', engineSame === true, String(engineSame));

/* ---- the brief ---- */
V('TASK', 'File and folder names', existsSync(`../${OUTPUT}.html`) && existsSync(`../${OUTPUT}`) && OUTPUT === 'SecondStitch-TraumaCenterSecondOpinion-claude-opus-5-5-medium-20261105-092850');
const si = exit.sourceInformation, wantSi = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
V('TASK', 'Exit interview: every field filled, in order, usage as asked', eq(Object.keys(si), wantSi) && wantSi.every((k) => si[k]) && si.usage === 'added on import' && si.date === '2026-11-05 09:28:50');
V('TASK', 'Exit interview: 4, 6 and 4 answers', exit.testingFeedback.length === 4 && exit.engineFeedback.length === 6 && exit.promptFeedback.length === 4);
const hub = exit.aiHub;
V('TASK', 'Exit interview: catalogue fields', eq(Object.keys(hub), ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags']) && hub.genre === 'Simulation' && hub.players === '1–4' && hub.series === 'Trauma Center' && hub.type === 'Game' && hub.tags.length >= 3 && hub.tags.length <= 6 && hub.tags.every((t) => t === t.toLowerCase()));
V('TASK', 'Catalogue name is the title on the title screen', hub.name.toUpperCase() === TITLE);
V('TASK', 'Music 10% by default in the settings', DEFAULT_SETTINGS().music === 0.1);
V('TASK', 'Attract reel covers the plan list', ['op1', 'op2', 'op3', 'op4', 'op5', 'op6', 'op7', 'op8', 'pileup'].every((o) => REEL.some((r) => r.op === o)) && REEL.some((r) => r.scene));
V('TASK', 'Campaign order', eq(CAMPAIGN.filter((e) => e.op).map((e) => e.op), CAMPAIGN_OPS));

/* ---- screens, read from the running shipped page ---- */
const b = await launch();
try {
  const { page, ctx } = await open(b, '?menu=1');
  await page.waitForFunction(() => window.__GAME__?.stage?.name === 'main');
  const main = await page.evaluate(() => window.__GAME__.stage.menu.items.map((i) => i.label));
  V('8', 'Main menu: On Call, Log, Consult, Settings, About', ['ON CALL', 'OPERATING LOG', 'CONSULT', 'SETTINGS', 'ABOUT'].every((w) => main.some((l) => l.includes(w))), main.join(' | '));
  const about = await page.evaluate(async () => { const st = window.__GAME__.stage; st.menu.focus = st.menu.items.findIndex((x) => x.id === 'settings'); return true; });
  await tap(page, 'Enter'); await waitFrames(page, 3);
  const set = await page.evaluate(() => window.__GAME__.stage.sub.menu.items.map((i) => i.label));
  V('8', 'Settings: every option the plan lists', ['MUSIC', 'SOUND', 'VOICES', 'BUTTON GLYPHS', 'AIM ASSIST', 'CURSOR SPEED', 'RUMBLE', 'GIFT', 'LOOK', 'PIXEL SIZE', 'SCREEN SHAKE', 'REDUCE FLASHES', 'TEXT SPEED', 'DIFFICULTY', 'FULLSCREEN', 'RESET TO DEFAULTS'].every((w) => set.includes(w)), set.join(' | '));
  V('8', 'Settings: at most about 8 rows at once', await page.evaluate(() => window.__GAME__.stage.sub.menu.maxRows <= 8));
  await tap(page, 'Escape'); await waitFrames(page, 2);
  await page.evaluate(() => { const st = window.__GAME__.stage; st.menu.focus = st.menu.items.findIndex((x) => x.id === 'about'); });
  await tap(page, 'Enter');
  await page.waitForFunction(() => window.__GAME__?.stage?.name === 'about');
  const pages = await page.evaluate(() => window.__GAME__.stage.pages.map((p) => ({ title: p.title, rows: p.rows.map((r) => r[0]) })));
  const titles = [...new Set(pages.map((p) => p.title))], fieldsSeen = pages.flatMap((p) => p.rows);
  V('8', 'About pages: the plan\'s five', eq(titles, ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS']), titles.join(' | '));
  V('8', 'About: every source field on screen', ['DATE', 'SOURCE', 'PLAN', 'GENRE AND PERSPECTIVE', 'TECH', 'ART DIRECTION', 'ANIMATION', 'AUDIO', 'ONLINE', 'TESTING', 'RESEARCH', 'ENVIRONMENT', 'MODEL', 'USAGE'].every((f) => fieldsSeen.includes(f)));
  const aboutText = await page.evaluate(() => JSON.stringify(window.__GAME__.stage.pages));
  for (const a of [...exit.testingFeedback, ...exit.engineFeedback, ...exit.promptFeedback]) if (!aboutText.includes(a)) V('TASK', 'About and the exit interview give the same answer', false, a.slice(0, 60));
  V('TASK', 'About and the exit interview agree on all 14 answers', [...exit.testingFeedback, ...exit.engineFeedback, ...exit.promptFeedback].every((a) => aboutText.includes(a)));
  void about;
  await ctx.close();
  const op = await open(b, '?op=op1');
  await op.page.waitForFunction(() => window.__GAME__?.stage?.intro <= 0);
  await tap(op.page, 'Escape');
  const pause = await op.page.evaluate(() => window.__GAME__.stage.pause.menu.items.map((i) => i.label));
  V('8', 'Pause: Resume, Retry Stage, Restart, Settings, Dev Mode, Quit', ['RESUME', 'RETRY STAGE', 'RESTART', 'SETTINGS', 'DEV MODE', 'QUIT TO MENU'].every((w) => pause.includes(w)), pause.join(' | '));
  await op.page.evaluate(() => { const m = window.__GAME__.stage.pause.menu; m.focus = m.items.findIndex((i) => i.id === 'dev'); });
  await tap(op.page, 'Enter'); await waitFrames(op.page, 2);
  const devTabs = await op.page.evaluate(() => { const d = window.__GAME__.stage.pause.sub, out = {}; for (let i = 0; i < 5; i++) { d.tab = i; d.rebuild(); out[i] = d.menu.items.map((x) => x.label); } return out; });
  V('8', 'Dev Mode: Cheats', ['GOD VITALS', 'INFINITE COMPOSURE', 'FREEZE CLOCK', 'UNLIMITED MISTAKES', 'UNLOCK ALL'].every((w) => devTabs[1].includes(w)), devTabs[1].join(' | '));
  V('8', 'Dev Mode: Jump to any op, stage, scene', ['OP', 'STAGE', 'GO TO OP', 'SCENE', 'GO TO SCENE'].every((w) => devTabs[2].includes(w)));
  V('8', 'Dev Mode: Actions', ['COMPLETE STAGE', 'WIN OP', 'FAIL OP', 'TRIGGER CODE BLUE', 'SPAWN', 'COPY OP JSON TO CONSOLE'].every((w) => devTabs[3].includes(w)));
  V('8', 'Dev Mode: View', ['HITBOX OVERLAY', 'BOT PLAYS', 'BOT SKILL', 'SIM SPEED', 'STEP ONE FRAME', 'FPS', 'SIM ENTITIES'].every((w) => devTabs[4].includes(w)));
  await op.ctx.close();
} finally { await b.close(); }

/* ---- the plan's own lists, read from PLAN.md itself: an item with no evidence fails ---- */
const plan = readFileSync('../PLAN.md', 'utf8');
const section = (a, b) => plan.slice(plan.indexOf(a), b ? plan.indexOf(b) : undefined);
const clean = (l) => l.replace(/^- /, '').replace(/\*\*/g, '');
const covers = (sec, item, list, keys) => {
  const hit = list.find(([prefix]) => item.startsWith(prefix));
  if (!hit) { add(sec, item, 'P', false, 'no evidence mapped for this plan item'); return; }
  const miss = [];
  for (const k of hit[1]) {
    if (k instanceof RegExp) { if (!labels.some((l) => k.test(l))) miss.push(String(k)); } else if (!rows.some((r) => r.req.includes(k) && r.ok)) miss.push(k);
  }
  add(sec, item, 'P', !miss.length, miss.length ? `missing: ${miss.join(', ')}` : `${hit[1].length} pieces of evidence`);
  void keys;
};
const MAP13 = [
  ["Each tool's rules", [/drain: clears/, /drain: dry/, /forceps: pulled/, /forceps: off path/, /scalpel: clean/, /scalpel: cutting/, /suture: zigzag/, /suture: crossing/, /laser: burns/, /laser: healthy/, /scanner: reveals/, /gel: paints/, /syringe: dose/, /syringe: outside/]],
  ['Every op:', [/op1: idle/, /op10: idle/, /op1: bot 0.7/, /op10: bot 0.7/, /op1: determinism/, /op10: determinism/, /fail: retry resumes/, /retry: checkpoint/]],
  ['Code Blue paths', [/code blue: starts/, /code blue: two good/, /quiet: the world/, /second look: entities/]],
  ['Scoring and rank', [/rank: bounds/, /rank: caps/]],
  ['Slider apply', [/sliders: live/, /sliders: reset/, /dev mode: a slider/, /dev mode: reset/]],
  ['Codec round trip', [/codec: keyframe/, /codec: a snapshot/, /op1: snapshot under/, /op10: keyframe under/]],
  ['Whole-game scripted', [/playthrough: every scene/, /playthrough: every op recorded/, /playthrough: the Log and Consult/, /playthrough in the page: reaches/]],
  ['Cast and sets', [/ep1: set exists/, /ep1: cast/, /every instrument/, /text: speakers/]],
  ['No `TODO`', [/no TODOs/, /about: every field/]],
  ['No forbidden', [/no forbidden/]],
  ['`check.mjs --sheets`', [/check.mjs --sheets/]],
  ['The built page', [/boot: title/, /session: AIHub inactive/, /session: Math.random/, /on its own/, /no errors: title/]],
  ['Fresh profile', [/music: 10%/]],
  ['Menu navigation', [/menu: pad/, /menu: keys/, /menu: hover/]],
  ['Prompts switch', [/prompts: follow/, /prompts: the Xbox/]],
  ['A real drain', [/mouse: the tip lands/, /mouse: drain/, /pad: stick and R2 drain/, /pad: R2 grabs/, /op 4, real input: all six/]],
  ['Attract:', [/attract: starts/, /attract: a key/, /attract: a pad/, /attract: save/]],
  ['Touch-only', [/touch-only: the exact/, /touch-only: the settings/, /touch-only: no joystick/, /touch-only: attract/]],
  ['Pause, then Dev Mode', [/pause: opens/, /dev mode: reachable/, /dev mode: a slider/, /dev mode: reset/]],
  ['Couch co-op', [/couch: two pads/, /couch: two independent/]],
  ['`engine.errors`', [/no errors: title/, /no errors: menus/, /no errors: action/, /no errors: pause/, /no errors: attract/, /no errors: couch/, /no errors: playthrough/]],
];
const items13 = section('## 13. Testing', '## 14.').split('\n').filter((l) => l.startsWith('- ')).map(clean);
for (const it of items13) covers('13 list', it, MAP13);
// The prose paragraphs of section 13: sound, hub and kit.
add('13 list', 'Sound: render syllables and SoundDefs; audio.counts rise; an AnalyserNode level check on one voice line', 'P', [/sfx drainLoop/, /voice timbre/, /sound: counts rise/, /voice: an AnalyserNode/].every((k) => labels.some((l) => k.test(l))));
add('13 list', 'Hub: all five harness runs give pass === true', 'P', ['players=2', 'players=3', 'players=4&latency=150&jitter=50&loss=5', 'scenario=host-leave', 'scenario=server'].every((k) => labels.some((l) => l.startsWith('hub: hub') && l.includes(k))));
add('13 list', 'Kit tools: check.mjs --headless with keys', 'P', labels.some((l) => /check.mjs --headless --keys/.test(l)));
const MAP12 = [['0 (idle', [/op1: idle/, /op10: idle/]], ['0.4', [/balance 0.4/]], ['0.7', [/balance 0.7: clears/, /balance 0.7: mostly/, /balance 0.7: at least 20/]], ['1.0', [/balance 1.0/]]];
for (const l of section('## 12. Balance', '## 13.').split('\n').filter((x) => /^\| (0|1\.0)/.test(x))) covers('12 targets', l.replace(/^\| /, '').replace(/ \|.*?\| .*$/, ''), MAP12);
const MAP16 = [
  ['Genre and perspective', ['Exit interview: every field']],
  ['Title by', ['Title picked']],
  ['One HTML', ['Deliverable is the tested build', 'byte-identical to the released kit', 'Session client verbatim']],
  ['Native art', ['All ten arenas', 'All sets exist', 'Models pass', 'Screenshots at 1080p']],
  ['Native animation', [/hand: the palm/, /dies irae: the crown/, 'Models pass']],
  ['All audio in code', ['No audio files', 'Sound renders', 'Music: every track', 'Sound effects: every family']],
  ['AI Hub integration', ['Hub harness: players=2', 'Hub harness: scenario=server', 'file:// boot']],
  ['Feature-complete demo', ['op1: title', 'op10: title', 'Whole game', 'Five strain behaviours', 'Eight tools']],
  ['World, characters', ['Six main cast', 'Eleven scenes', 'Each scene is 8', 'Every patient has']],
  ['Infrastructure for more', ['docs/AUTHORING.md', 'Dev Mode: Actions', 'src/sim imports nothing']],
  ['Dev mode from pause', ['Pause: Resume', 'Every slider has', 'Pause, Dev Mode']],
  ['Attract after 10', ['Attract: starts', 'Attract reel']],
  ['Controller-first', ['Mouse, stick, triggers', 'Keys play an op', 'Prompts follow', 'Menus by pad']],
  ['No dense data', ['Settings: at most about 8 rows']],
  ['Touch-only gate', ['Touch-only: exact text']],
  ['Tests behind one', ['Whole game: Node walk']],
  ['No TODOs', ['No TODOs']],
  ['Source Information', ['About: every source field', 'About and the exit interview agree', 'Exit interview: 4, 6 and 4']],
];
const items16 = section('## 16.').split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| The brief')).map((l) => l.slice(2).split(' | ')[0]);
for (const it of items16) covers('16 table', it, MAP16);

const bad = rows.filter((r) => !r.ok);
for (const r of bad) console.log(`FAIL §${r.sec} ${r.req}: ${r.detail}`);
const esc = (s) => s.replace(/\|/g, '/').replace(/\n/g, ' ');
writeFileSync('docs/PLAN-CHECK.md', `# PLAN.md and TASK.md, requirement by requirement\n\nGenerated by \`node tests/plan-check.mjs\` against the shipped build, sha256 ${createHash('sha256').update(html).digest('hex').slice(0, 16)}. T: a test that passed on this run. V: a value read from data or from the running page. F: a file on disk. P: an item read from PLAN.md itself (the section 13 list, section 12 targets, section 16 table), which fails if nothing covers it.\n\n${rows.length - bad.length} of ${rows.length} hold.\n\n| Section | Requirement | Evidence | Holds | Detail |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.sec} | ${esc(r.req)} | ${r.kind} | ${r.ok ? 'yes' : 'NO'} | ${esc(r.detail).slice(0, 110)} |`).join('\n')}\n\nThis checks what a script can read. Whether it feels right is a judgement, and no person has played the game.\n`);
console.log(`${rows.length - bad.length} hold, ${bad.length} do not`);
process.exit(bad.length ? 1 : 0);
