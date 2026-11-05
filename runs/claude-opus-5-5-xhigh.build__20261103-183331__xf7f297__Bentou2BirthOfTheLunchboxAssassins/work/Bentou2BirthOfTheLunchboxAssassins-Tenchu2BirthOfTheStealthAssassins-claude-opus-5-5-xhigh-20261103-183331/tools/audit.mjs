// node tools/audit.mjs: TASK.md, item by item, against the last FULL run of node tests/run.mjs (tests/last-run.json).
// Each item quotes TASK.md (checked against the line it names) and names its evidence exactly: recorded checks, each with
// what it shows, and for the items that need an eye (art, tone, density) the screenshots reviewed. An item passes only when
// its quote is on that line, every check it names was recorded in the full run and passed, and every screenshot was taken
// of the current code (newer than every source file, the engine and the build script).
// Prints each item with its evidence and a one-line verdict; writes the same to tests/AUDIT.md.
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { NAME } from './name.mjs';
const DEV = new URL('../', import.meta.url), ROOT = new URL('../../', import.meta.url);
const TASK = readFileSync(new URL('TASK.md', ROOT), 'utf8').split('\n'), RUN = JSON.parse(readFileSync(new URL('tests/last-run.json', DEV), 'utf8'));
const ITEMS = [
  [1, 'SOURCE: Tenchu 2: Birth of the Stealth Assassins', [
    ['task > Package: the name is TASK.md\'s [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331]: GameTitle the title on the title screen, SOURCE TASK.md\'s first line, written whole', 'SOURCE is read from this line'],
    ['about > it answers every Source Information field', 'the source is named in Source Information']]],
  [3, 'Genre: Pick the game genre', [   // stealth-action: light and shadow, sound, takedowns, alarms, swordplay, bosses
    ['stealth > standing in a guard\'s lantern light 50 px ahead: alerted within 3 s', 'in a real level: light gets you caught'],
    ['stealth > crouched in its shadow 80-120 px ahead: never suspicious in 5 s', 'shadow hides you'],
    ['stealth > creeping 30 px behind it: no step noise, it stays calm', 'creeping is silent'],
    ['stealth > running 30 px behind it: its steps are heard', 'running is heard'],
    ['stealth > the floor sets a running step\'s reach: tatami < paving or earth < gravel', 'the floor matters'],
    ['stealth > an alerted samurai rings the alarm bell within 14 s', 'the alarm'],
    ['perception > a lit hero 60 ahead is caught within 2 s', 'stealth: light gets you seen'],
    ['perception > crouched in shadow at 100 stays calm', 'stealth: shadow hides you'],
    ['perception > running at 50 is heard', 'stealth: noise carries'],
    ['silentcut > sojiro: the choreography ends, the guard falls', 'stealth: an unseen kill from behind'],
    ['alarm > an alert samurai runs for the bell', 'stealth: being seen escalates'],
    ['combat > a parry inside the window staggers', 'action: swordplay with timing'],
    ['bosses > kurogane: every move fires and works', 'action: boss duels']]],
  [5, 'Perspective: Pick the camera perspective', [
    ['task > Perspective: isometric (iso view), the camera turns 45 degrees a press each way', 'the iso view'],
    ['task > Perspective: camRight turns +45, camLeft back and on to -45', 'turned by the player in 45-degree steps']]],
  [7, 'pick one with a real random number generator', [
    ['task > Game Title: the plan drew it with a real RNG from 50 (secrets.randbelow) and it is the title shown', 'drawn by secrets.randbelow(50), the title shown'],
    ['browser/screens > About page 1 (About): shown, and every line of it drawn on the canvas', 'the title and its riff on the source, on screen']]],
  [11, 'provide a single html file [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331.html]', [
    ['task > Package: the single file is in the root under that name, and no other game file beside it', 'the file, in the root, under the TASK.md name'],
    ['browser/play > the single file: the page loads nothing but itself', 'it needs no other file'],
    ['browser/bundle > a mission plays from the single file', 'it plays from file://']]],
  [13, 'Build on https://github.com/michaelcrosato/my-3d2dge/tree/main/dist/handoff', [
    ['task > Tech stack: built on the my-3D2dge handoff engine (v0.85.2), changes marked', 'the handoff engine, its 9 changes marked'],
    ['boot > the title after boot', 'the game runs on it']]],
  [15, 'Make new art assets for whatever makes the game feel like the source', [
    ['browser/play > art: the game\'s own Japanese props are drawn in the mission (at least 6 kinds)', 'its own props drawn in a mission'],
    ...['training', 'm1', 'm2', 'm3'].map(id => [`browser/enginecheck > the engine's checker on ${id}: no errors`, 'the engine author\'s tool']),
    ...['training', 'm1', 'm2', 'm3'].map(id => [`browser/enginecheck > the engine's checker on ${id}: no look notes against its PS1-era bar…`, 'its look bar: colours, flat area, contrast']),
    ['task > Art: new art assets (Japanese props, materials, wall painters, icons, kanji)', 'registered with the engine']], ['shots/market.png', 'shots/keep.png', 'shots/hall.png']],
  [17, 'Make new animations for whatever makes the game feel like the source', [
    ['silentcut > sojiro: the cut starts its choreography', 'a paired takedown starts'],
    ['silentcut > kaede: the choreography ends, the guard falls', 'and plays to its end'],
    ['silentcut > undertow (kaede) runs to the end', 'every kind, both characters'],
    ['grapple > a tap pulls the hero onto the roof', 'the grappling hook'],
    ['story > prologue: granny taps', 'cutscene poses'], ['story > m3_fail: takanori toasts', 'cutscene poses']], ['shots/cut.png', 'shots/boss.png']],
  [19, 'All music, sound effects and voices are written in code, with no audio files. Voices are Animalese/Simlish-style gibberish.', [
    ['browser/play > voice: a spoken line is synthesized blips, at least one oscillator a syllable', 'voices: gibberish blips, one or more a syllable'],
    ['browser/play > music: the step sequencer runs the score (the boss song, 140 bpm: about 28 steps in 3 s) and its notes are oscillators', 'music: sequenced in code'],
    ['browser/play > audio: nothing decoded, no media element, no speech synthesis, no fetch', 'no audio file anywhere'],
    ['task > Audio: no audio or image files; music, sound effects and voices are code', 'none in the source either']]],
  [21, 'Online: https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub', [
    ['browser/hub > the hub harness passes: players=2&auto=1', 'the real harness, 2 players'],
    ['browser/hub > the hub harness passes: players=4&latency=150&jitter=50&loss=5&auto=1', '4 players on a bad network'],
    ['browser/hub > the hub harness passes: players=2&scenario=host-leave&auto=1', 'the host leaving'],
    ['task > Multiplayer: the AI Hub tags, the session client first in <head>', 'the client and tags as the hub asks']]],
  [24, 'Create a subfolder called [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331]', [
    ['task > Working environment: the dev subfolder has the same name (this suite runs from it)', 'the dev folder, same name'],
    ['browser/hub > the served page is this game', 'a 127.0.0.1 server on an OS port, the page confirmed as ours']]],
  [28, 'including a scripted playthrough of the whole game', [
    ['playthrough > every story mission is completed in the save', 'all four story missions won by script'],
    ['playthrough > the ending leads to the credits', 'to the end'], ['playthrough > Rice and Ash as Kaede is won', 'the second character'],
    ['playthrough > the Night Delivery is won', 'the hub round'], ['playthrough > the trial shows its board', 'the Shadow Trial']]],
  [38, 'Create a feature-complete demo.', [
    ['playthrough > training: the mission is won', 'training'], ['playthrough > m1: the mission is won', 'Hakuro Temple'], ['playthrough > m2: the mission is won', 'Kiri Lake'], ['playthrough > m3: the mission is won', 'Kokaku'],
    ['bosses > ittetsu: the bot wins within 90 s', 'boss 1'], ['bosses > gonroku: the bot wins within 90 s', 'boss 2'], ['bosses > hotaru: the bot wins within 90 s', 'boss 3'], ['bosses > kurogane: the bot wins within 90 s', 'boss 4'],
    ['tools > Smoke Bomb: the guard inside is blinded and loses the hero', 'tools work'], ['move > the hug slides along the wall, and peeks at its end', 'wall hugging'], ['ki > Ki Focus senses further', 'the Ki sense'],
    ['mission > the moon timer fails the mission', 'failure states'], ['mission > the save round trip', 'saves']]],
  [38, 'all the infrastructure, systems, and polish needed so the remainder of the game could later be built out with normal designer tools', [
    ['workshop > the editor builds a level', 'a level editor'], ['workshop > a full level validates', 'validation'], ['workshop > an unreachable target is caught', 'catches broken levels'],
    ['workshop > export and import round trip', 'levels as data'], ['workshop > a test play is won', 'test play']]],
  [40, 'Include a dev mode, reachable from the pause menu', [
    ['browser/play > Escape pauses: the pause menu', 'the pause menu'], ['browser/play > the pause menu\'s Dev Mode opens the dev screens', 'Dev Mode from it, clicked'],
    ['dev > god mode', 'standard tools'], ['dev > no-clip walks through walls', ''], ['dev > freeze AI', ''], ['dev > every dev page opens', 'every page']], ['shots/pause.png']],
  [40, 'expose the most important gameplay variables as live sliders, with a reset to defaults', [
    ['browser/play > a slider moved with the keys changes the game live (Run speed)', 'a slider, moved by keys, live'],
    ['dev > the hero runs faster at once', 'the game changes at once'], ['browser/play > Reset page restores the default', 'reset, clicked'],
    ['dev > Reset all restores every slider', 'reset all'], ['task > Dev mode: the important gameplay variables are live sliders, with reset to defaults', '30+ sliders']], ['shots/dev-balance.png']],
  [42, 'After 10 seconds without input on the title/menu screen, start a looping AI-played demo', [
    ['boot > no attract before 10 s', 'not before 10 s'], ['boot > attract after 10 s idle', 'at 10 s'], ['browser/bundle > attract mode after 10 s without input', 'in the browser too'],
    ['attract > attract runs three loops', 'it loops'], ['attract > every vignette was visited each loop', 'it shows the demo'], ['task > Attract mode: the autopilot plays with cheats (god mode)', 'the AI cheats']]],
  [42, 'any input exits it', [
    ['boot > a press returns to the title', 'a press'], ['browser/bundle > a mouse move returns to the title', 'a mouse move'], ['task > Attract mode: any input exits it', 'confirm']]],
  [44, 'for multiplayer integration into ai-hub as well as for the game on its own', [
    ['hub > a ghost appears where the other player is', 'in the hub: the others as ghosts'], ['hub > time-up: the result at once', 'results to the hub'],
    ['playthrough > the trial shows its board', 'on its own: the Shadow Trial'], ['task > Multiplayer: the game on its own (the Shadow Trial with your best ghost)', 'against your own ghost']]],
  [46, 'Use a writing style similar to the source', [
    ['story > scene prologue runs to its end when skipped', 'the story scenes play'], ['story > lines of their own for Sojiro and Kaede', 'two voices'],
    ['story > every bark category has lines', 'guards talk'], ['task > Narrative tone: a story in the source\'s register (crawl, briefings, cutscenes, barks)', 'how much of it']], ['shots/prologue.png']],
  [49, 'Design the game around a PS5 DualSense (or any pad the browser reports in its standard mapping)', [
    ['browser/play > pad: cross opens the title menu', 'cross'], ['browser/play > pad: d-pad down moves the menu cursor', 'the d-pad'],
    ['browser/play > pad: cross picks the entry (Missions opens character select)', 'picks'], ['browser/play > pad: circle goes back to the title', 'circle backs out'],
    ['browser/bundle > a controller press switches the prompts to its symbols', 'a DualSense, standard mapping']]],
  [49, 'The keyboard uses the keys PC players expect for the genre', [
    ['input > the keys move the hero', 'WASD moves'], ['input > keys: Space', 'Space jumps'], ['task > UI: the keys PC players expect for the genre', 'Shift, C, F, Esc']]],
  [49, 'The mouse aims, looks, and clicks menu items and things in the world (hover moves the focus)', [
    ['browser/play > mouse: hovering Workshop moves the focus to it', 'hover moves the focus'], ['browser/play > mouse: a click on About opens it', 'clicks menu items'],
    ['browser/play > mouse: hovering a menu button focuses it', 'on the HTML screens too'], ['browser/play > mouse: a click in the world strikes', 'clicks in the world'],
    ['grapple > the mouse picks the anchor under it', 'aims']]],
  [49, 'On-screen prompts follow the input used last', [
    ['browser/bundle > a controller press switches the prompts to its symbols', 'to the pad'], ['browser/bundle > a key press switches them back to keys', 'back to keys'],
    ['input > a mouse prompt: the mouse button', 'mouse buttons']]],
  [49, 'with a Settings option to show Xbox glyphs, A B X Y, instead', [
    ['input > the pad shows PlayStation symbols by default', 'PlayStation by default'],
    ['browser/screens > a tap on SETTINGS opens Settings, with Button symbols on it set to PlayStation', 'the option is on Settings'],
    ['browser/screens > a tap on it switches to Xbox: the setting, and the controller prompts become A B X Y', 'and switches to A B X Y']], ['shots/touch-settings.png']],
  [51, 'Do not use overly dense, web-style data screens.', [
    ['browser/play > a Balance page: live sliders (at most 8)', 'dev pages hold at most 8 rows'],
    ['task > UI: no dense web-style data screens (at most 8 rows a dev page; one decision a screen)', 'every dev page']], ['shots/pause.png', 'shots/dev-balance.png', 'shots/about-2.png']],
  [53, 'Touch-only devices: no touch controls; show "Controller or keyboard required" and the settings button. Let the attract mode run.', [
    ['browser/screens > the phone draws "Controller or keyboard required" and a SETTINGS button', 'the notice and the button, drawn'],
    ['browser/screens > the phone shows no touch controls (no PRESS START, no menu)', 'no touch controls'],
    ['browser/screens > a tap on SETTINGS opens Settings, with Button symbols on it set to PlayStation', 'the button works'],
    ['browser/bundle > attract still runs on a touch-only device', 'attract runs']], ['shots/touch.png']],
  [56, 'No TODOs, placeholders, or stubbed features. The demo is complete.', [
    ['task > Done: no TODO, FIXME, placeholder or stub in the game\'s source', 'none in the source'], ['playthrough > every story mission is completed in the save', 'the whole demo plays through']]],
  [59, 'Put Source Information, Testing Feedback, Engine Feedback and Prompt Feedback in your chat reply and an in-game About/Credits screen', [
    ['browser/screens > Enter on About opens the About / Credits screen', 'reached from the title menu'],
    ['browser/screens > About page 2 (Source Information): shown, and every line of it drawn on the canvas', 'Source Information'],
    ['browser/screens > About page 3 (Testing Feedback): shown, and every line of it drawn on the canvas', 'Testing Feedback'],
    ['browser/screens > About page 4 (Engine Feedback): shown, and every line of it drawn on the canvas', 'Engine Feedback'],
    ['browser/screens > About page 5 (Prompt Feedback): shown, and every line of it drawn on the canvas', 'Prompt Feedback'],
    ['browser/screens > About page 3 (Testing Feedback): scrolled to its end, its last line still shows', 'readable to its end'],
    ['browser/screens > About page 3: the mouse wheel far past the end leaves its last lines on screen', 'by real input too'],
    ['about > the feedback pages answer 4, 6 and 4 questions', 'every question answered']], ['shots/about-3.png', 'shots/about-3-end.png']],
  [75, 'save these answers as exit-interview.json in this folder\'s root', [
    ['about > exit-interview.json parses', 'parses'], ['about > it answers every Source Information field', 'every field'], ['about > its feedback matches the pages', 'the same answers as the screen'],
    ['about > its AI Hub entry is complete', 'the AI Hub entry'], ['task > Exit interview: in the root, in TASK.md\'s shape', 'TASK.md\'s shape']]],
];
// the newest of the game's code (its source, the engine, the build): a screenshot older than this shows other code
const CODE_T = Math.max(...readdirSync(new URL('src/', DEV)).map(f => statSync(new URL('src/' + f, DEV)).mtimeMs), statSync(new URL('engine/my-3d2dge.js', DEV)).mtimeMs, statSync(new URL('tools/build.mjs', DEV)).mtimeMs);
const byId = new Map(RUN.checks.map(c => [c.suite + ' > ' + c.name, c]));
const find = id => byId.get(id) || (id.endsWith('…') ? RUN.checks.find(c => (c.suite + ' > ' + c.name).startsWith(id.slice(0, -1))) : undefined);
const out = [`TASK.md audit: the full run of ${RUN.at}, ${RUN.passed}/${RUN.passed + RUN.failed} checks passed`, ''];
let ok = 0; const bad = [];
if (!RUN.full) bad.push('tests/last-run.json is not a full run');
if (!existsSync(new URL(NAME + '.html', ROOT))) bad.push('the bundle is missing');
for (const [ln, quote, ev, shots = []] of ITEMS) {
  const quoted = (TASK[ln - 1] || '').includes(quote), rows = ev.map(([id, what]) => { const c = find(id); return [c ? (c.pass ? 'pass' : 'FAIL') : 'MISSING', c ? c.suite + ' > ' + c.name : id, what]; });
  const fresh = f => existsSync(new URL(f, DEV)) && statSync(new URL(f, DEV)).mtimeMs >= CODE_T;   // taken of the current code
  const shotRows = shots.map(f => [fresh(f) ? 'seen' : existsSync(new URL(f, DEV)) ? 'OLD' : 'MISSING', f]);
  const pass = quoted && rows.every(r => r[0] === 'pass') && shotRows.every(r => r[0] === 'seen'); if (pass) ok++;
  out.push(`${pass ? 'PASS' : 'FAIL'} L${ln}: "${quote}"${quoted ? '' : ' [the quote is not on that line]'}`);
  for (const [st, id, what] of rows) out.push(`   ${st.padEnd(4)}  ${id}${what ? '  (' + what + ')' : ''}`);
  for (const [st, f] of shotRows) out.push(`   ${st.padEnd(4)}  screenshot ${f}`);
}
out.push('', `${ok}/${ITEMS.length} TASK.md items shown` + (bad.length ? ' — ' + bad.join('; ') : ''));
writeFileSync(new URL('tests/AUDIT.md', DEV), '```\n' + out.join('\n') + '\n```\n');
console.log(out.join('\n'));
process.exit(ok === ITEMS.length && !bad.length ? 0 : 1);
