// covers: TASK.md, requirement by requirement (the deliverables, every mode reachable and working, Dev Mode, attract,
// multiplayer, the 10-foot UI and its glyphs, touch-only, audio by code, About pages, the exit interview, no stubs).
// Each check names the TASK.md line it proves; the deeper behaviour of each is in the other suites
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ctx } from '../../src/ctx.js';
import { OUT_NAME } from '../build-name.mjs';
import { ABOUT, INFO } from '../../src/data/about.js';
import { CFG, DEFAULTS, SLIDERS, cfgGet, cfgSet } from '../../src/config.js';
import { TRACKS, PUZZLES } from '../../src/data/tracks.js';
import { VOICES } from '../../src/audio/babble.js';
import { SONGS } from '../../src/audio/music.js';
import { BEATS, CAST } from '../../src/story/story.js';
import { PAGES } from '../../src/scenes/menu.js';
import { labelOf } from '../../src/ui/glyphs.js';
const ROOT = fileURLToPath(new URL('../../', import.meta.url)), OUT = ROOT + '../' + OUT_NAME;
const walk = d => readdirSync(d).flatMap(f => { const p = d + '/' + f; return statSync(p).isDirectory() ? walk(p) : [p]; });
export default async T => {
  const { game, api } = await T.game(), P = ctx.profile; P.reset(); P.mark('welcome');
  // Package: one HTML file with the exact name, in the root; the dev folder beside it
  T.check('Package: the single HTML file exists with its exact name', existsSync(OUT), OUT_NAME);
  const html = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  T.check('Package: it carries the whole game (engine, 3D engine, three.js, Rapier, the game)', html.length > 4e6 && /My3D2dge/.test(html) && /CRACKMANIA/.test(html));
  T.check('Title: CRACKMANIA (a riff on TrackMania picked by RNG in the plan) in <title>', /<title>CRACKMANIA<\/title>/.test(html));
  T.check('Working environment: the dev subfolder named for the run', /Crackmania-TrackMania2003-claude-opus-5-5-xhigh-20261104-050308\/?$/.test(ROOT));
  // Tech stack: built on the engine's handoff (its version), changes recorded
  T.check('Tech stack: built on my-3D2dge (handoff) v0.85.2', ctx.E.version === '0.85.2' || /0\.85\.2/.test(ctx.E.version), ctx.E.version);
  T.check('Tech stack: engine changes are listed', /E1[\s\S]*E9/.test(readFileSync(ROOT + 'engine/CHANGES.md', 'utf8')));
  // Audio: all music, effects and voices in code; no audio files anywhere
  T.check('Audio: no audio files in the bundle', !/data:audio|\.(mp3|wav|ogg|m4a|flac)\b/i.test(html));
  T.check('Audio: no audio files in the source', !walk(ROOT + 'src').some(f => /\.(mp3|wav|ogg|m4a|flac)$/i.test(f)));
  T.eq('Audio: eight songs written in code', Object.keys(SONGS).length, 8);
  T.check('Audio: gibberish voices for every speaking character', Object.values(CAST).every(c => VOICES[c.voice]) && !!VOICES.crowd);
  // Online: AI Hub's tags and its client first in <head>
  for (const [k, v] of [['hub:session', '1'], ['hub:session-players', '1-4'], ['hub:session-mode', 'ghost'], ['hub:session-goal', null], ['hub:session-howto', null]]) T.check('Online: <meta name="' + k + '">', new RegExp('<meta name="' + k + '" content="' + (v || '[^"]+') + '">').test(html));
  T.check('Online: the AI Hub client is the first script in <head>', /<head><meta charset="utf-8">\s*<script>\/\*! aihub-session 1\.4\.0/.test(html));
  // Scope: every mode of the demo can be reached from the menus and has content
  T.eq('Content: 15 race tracks in 3 environments', TRACKS.length, 15); T.eq('Content: 6 puzzles', PUZZLES.length, 6);
  for (const s of ['title', 'menu', 'race', 'results', 'card', 'editor', 'replay', 'garage', 'credits', 'attract', 'online', 'lab']) T.check('Scope: scene ' + s + ' exists', !!game.scenes[s]);
  for (const p of ['main', 'env', 'tracks', 'puzzles', 'survival', 'build', 'newtrack', 'multi', 'online', 'hotseat', 'hsnames', 'hspick', 'split', 'replays', 'about']) T.check('Scope: menu page ' + p, typeof PAGES[p] === 'function');
  game.go('menu', null, { fade: 0 }); game.advance(.2); const main = api.menu.focus.items.map(q => q.id);
  T.eq('Scope: the main menu offers every mode', main, ['RACE', 'PUZZLE', 'SURVIVAL', 'BUILD', 'MULTIPLAYER', 'GARAGE', 'REPLAYS', 'OPTIONS', 'ABOUT']);
  // Narrative: the characters speak in short, dry lines (TrackMania's terse tone)
  const lines = Object.values(BEATS).flat().map(l => l[1]); T.check('Narrative tone: host lines stay short (<= 70 characters)', lines.every(l => l.length <= 70), lines.filter(l => l.length > 70).join(' | '));
  // Dev mode: reachable from the pause menu, standard tools, live sliders with a reset to defaults
  const C = await import('../../src/modes/campaign.js'); C.raceCampaign('D1', { quick: true }); api.until(() => game.sceneName === 'race', 3);
  const items = game.o.menu.items(); T.check('Dev mode: in the pause menu', items.some(([l]) => l === 'Dev Mode'));
  items.find(([l]) => l === 'Dev Mode')[1](); game.advance(1 / 30);
  const tools = ctx.dev.items({ W: 427, H: 240 }).map(q => q.label);
  for (const t of ['Teleport: next checkpoint', 'Finish now', 'Award medal: GOLD', 'Bot drives', 'Time scale', 'Frame step (while paused)', 'Free camera', 'Show probes', 'Show colliders', 'Show route and racing line', 'Unlock everything', '+1000 coppers', 'Reset profile', 'Jump to...']) T.check('Dev mode tool: ' + t, tools.includes(t));
  T.check('Dev mode: 30+ gameplay variables as live sliders', SLIDERS.length >= 30, SLIDERS.length);
  for (const [path] of SLIDERS) { const v = cfgGet(path, 'coyote'); cfgSet(path, 'coyote', v + 1); }
  ctx.dev.tab = 1; game.advance(1 / 30); game.input.press('KeyY'); game.advance(1 / 60); game.input.release('KeyY'); game.advance(1 / 60);
  T.check('Dev mode: reset restores every slider to its default', JSON.stringify(CFG) === JSON.stringify(DEFAULTS));
  api.tap('cancel'); T.check('Dev mode closes', !ctx.dev.open);
  // Attract mode: 10 s idle on the title or a menu page starts a looping demo; any input exits
  game.go('title', null, { fade: 0 }); game.advance(.2); game.input.held.clear(); game.advance(10.3); T.eq('Attract: after 10 s idle on the title', game.sceneName, 'attract');
  const { SEG } = await import('../../src/attract/attract.js'); T.check('Attract: race, build, puzzle, survival, split screen and garage segments', SEG.map(s => s.id).join() === 'race,build,puzzle,survival,split,garage');
  game.advance(SEG.reduce((a, s) => a + s.time, 0) + 2); T.eq('Attract: it loops (still running after a full cycle)', game.sceneName, 'attract'); T.eq('Attract: no errors over a full cycle', game.errors.length, 0);
  api.tap('confirm'); T.check('Attract: any input exits', api.until(() => game.sceneName === 'title', 2));
  // Multiplayer on its own: hot seat and split screen exist (driven in their suites); AI Hub: the online scene
  T.check('Multiplayer: hot seat, split screen and online pages', ['hotseat', 'split', 'online'].every(p => PAGES[p]));
  // UI: PlayStation glyphs for the pad, Xbox as a setting, keys for the keyboard, mouse buttons for the mouse
  const I = game.input; I.lastDevice = 'gamepad'; T.eq('UI: PlayStation glyphs by default', labelOf('confirm'), '✕');
  game.settings.set('glyphs', 'xbox'); T.eq('UI: the Xbox glyph option', labelOf('confirm'), 'A'); game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'keyboard'; T.eq('UI: keyboard keys', labelOf('confirm'), 'Enter');
  I.lastDevice = 'mouse'; T.eq('UI: mouse buttons on menus', labelOf('cancel'), 'Right click'); I.lastDevice = 'keyboard';
  const { RACE_INPUT } = await import('../../src/input.js'); T.check('UI: PC racing keys (arrows/WASD, R restart, Enter/Backspace respawn, C camera)', RACE_INPUT.gas.includes('KeyW') && RACE_INPUT.gas.includes('ArrowUp') && RACE_INPUT.restart.includes('KeyR') && RACE_INPUT.respawn.includes('Enter') && RACE_INPUT.camera.includes('KeyC'));
  T.check('UI: analog triggers on the pad (R2 gas, L2 brake)', RACE_INPUT.gas.includes('Pad7') && RACE_INPUT.brake.includes('Pad6') && typeof I.analog === 'function');
  // Touch-only: no touch controls anywhere
  T.check('Touch-only: no scene declares touch buttons', Object.values(game.scenes).every(s => !s.touch || s.touch.length === 0));
  const title = readFileSync(ROOT + 'src/scenes/title.js', 'utf8'); T.check('Touch-only: "Controller or keyboard required" and SETTINGS', /Controller or keyboard required/.test(title) && /label: 'SETTINGS'/.test(title));
  // Source information and the feedback: in the About pages, every field answered
  const heads = ABOUT.pages.map(p => p[0]); for (const h of ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS']) T.check('About page: ' + h, heads.includes(h));
  for (const [k, v] of Object.entries(INFO.sourceInformation)) T.check('Source information: ' + k + ' answered', typeof v === 'string' && v.length > 3);
  T.check('Feedback answers: 4 testing, 6 engine, 4 prompt, none empty', INFO.testingFeedback.length === 4 && INFO.engineFeedback.length === 6 && INFO.promptFeedback.length === 4 && [...INFO.testingFeedback, ...INFO.engineFeedback, ...INFO.promptFeedback].every(s => s.length > 20 && s !== 'unknown'));
  const ex = ROOT + '../exit-interview.json'; let ej = null; try { ej = JSON.parse(readFileSync(ex, 'utf8')); } catch (e) { /* missing */ }
  T.check('Exit interview: parses as JSON', !!ej); if (ej) T.eq('Exit interview: matches the About pages', ej, JSON.parse(JSON.stringify(INFO)));
  // Done: no TODOs, placeholders or stubs in the game's code
  const src = walk(ROOT + 'src').filter(f => f.endsWith('.js')), bad = src.filter(f => /\b(TODO|FIXME|XXX)\b|not implemented|placeholder\(|stub\(/i.test(readFileSync(f, 'utf8')));
  T.check('Done: no TODO, FIXME, placeholder or stub in the source', !bad.length, bad.join(', '));
  T.check('Done: no "coming soon" or "not available" features in the UI text', !src.some(f => /coming soon|not yet available|under construction/i.test(readFileSync(f, 'utf8'))));
  P.reset();
};
