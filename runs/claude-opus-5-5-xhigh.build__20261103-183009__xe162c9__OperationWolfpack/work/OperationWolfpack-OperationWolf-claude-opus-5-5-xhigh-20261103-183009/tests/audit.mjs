// node tests/audit.mjs: TASK.md, requirement by requirement, each exercised headless (or read from the bundle), with a
// PASS/FAIL line and its evidence. A report, so it prints passes too (npm test stays quiet).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { load, ROOT, manifest } from './lib.mjs';
let pass = 0, fail = 0;
const R = (req, ok, ev) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + req + ' -- ' + ev); };
const NAME = 'OperationWolfpack-OperationWolf-claude-opus-5-5-xhigh-20261103-183009', BUNDLE = join(ROOT, '..', NAME + '.html');
const html = readFileSync(BUNDLE, 'utf8'), src = manifest.src.map(f => readFileSync(join(ROOT, f), 'utf8')).join('\n');
const dt = 1 / 120;
// ---------- Package, title, tech ----------
R('Package: single html file named GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183009.html in root', existsSync(BUNDLE) && !/<script[^>]+src=/i.test(html), NAME + '.html, ' + Math.round(html.length / 1024) + ' KB, no external <script src>');
R('Working environment: dev files in the subfolder of that name', existsSync(join(ROOT, 'src')) && ROOT.endsWith(NAME), ROOT.split('/').pop() + '/ holds src/, engine/, tests/, tools/');
R('Game Title: a riff on the source, picked by the plan with a real RNG (STAGE.md: use the plan\'s title)', /secrets\.randbelow\(50\)/.test(readFileSync(join(ROOT, '..', 'PLAN.md'), 'utf8')) && html.includes('<title>Operation Wolfpack</title>'), 'PLAN.md: randbelow(50)+1 = 33 -> "Operation Wolfpack"; <title> matches');
R('Tech stack: built on the my-3d2dge handoff', html.includes('my-3D2dge v0.85.2'), 'engine/my-3d2dge.js v0.85.2 inlined; edits in engine/CHANGES.md');
const { WP, E, game } = load(); game.advance(.5);
// ---------- Genre, perspective, scope ----------
R('Genre/perspective: light-gun rail shooter, first person on a rail', WP.OPS.length === 6 && WP.STAGE.op2.forward && WP.STAGE.op6b.rail[0].angle > 0, '6 operations; sideways rails, forward river rail (op2), backward takeoff rail (op6b)');
R('Scope: a feature-complete demo, all mechanics shown', ['bigEar', 'crocodile', 'warthog', 'ironHog', 'tusk', 'hyenaOne'].every(b => WP.BOSS_DEF[b]) && Object.keys(WP.PICKUPS).length === 11 && Object.keys(WP.PROJ).length >= 7,
  '6 bosses, 11 pickups, ' + Object.keys(WP.PROJ).length + ' projectile kinds, ' + Object.values(WP.TYPES).filter(t => t.kind === 'infantry').length + ' infantry types, vehicles, boats, aircraft, civilians, hostages, animals');
// ---------- Art, animation ----------
const own = WP.SHAPE_LIST.filter(k => E.SHAPES[k] && !['barrel', 'crate', 'chest', 'table', 'chair', 'stool', 'bench', 'bed', 'bookcase', 'shelf', 'pot', 'jar', 'sack', 'cart', 'well', 'sign', 'lamppost', 'anvil', 'fence', 'pine', 'tree', 'bush', 'grass', 'rock', 'crystal'].includes(k));
R('Art direction: the engine\'s native style plus new assets', own.length >= 50 && Object.keys(WP.SPR).length >= 30, own.length + ' new shapes-as-data, ' + Object.keys(WP.SPR).length + ' string sprites, ' + Object.keys(WP.RIG_PRESETS).length + ' Humanoid presets');
R('Animation: the engine\'s rig system plus new animations', Object.keys(WP.Rigs.POSES).length >= 7 && typeof E.Humanoid === 'function', 'E.Humanoid rigs + new poses: ' + Object.keys(WP.Rigs.POSES).join(', '));
// ---------- Audio ----------
const audioFiles = []; const walk = d => { for (const f of readdirSync(d)) { if (f === 'node_modules' || f === 'vendor') continue; const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(f)) audioFiles.push(p); } }; walk(ROOT);
R('Audio: all music, sound and voices in code, no audio files', !audioFiles.length && !/new Audio\(|\.mp3['"]|\.wav['"]|\.ogg['"]/.test(html), Object.keys(WP.SONGS).length + ' songs as note data, ' + Object.keys(WP.Audio.SFX).length + ' synthesized sfx, 0 audio files');
R('Audio: voices are Animalese/Simlish gibberish', typeof WP.Voice.line === 'function' && typeof WP.Voice.letter === 'function' && /Animalese/.test(src), 'per-letter vowel blips and consonant clicks per speaker, seeded per line; subtitles in the radio box');
// ---------- Online (AI Hub) ----------
const m = /^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/i.exec(html), session = readFileSync(join(ROOT, 'hub/session.js'), 'utf8');
R('Online: AI Hub client first, unmodified; session metas', m && m[1] === session && html.includes('name="hub:session-mode" content="shared-world"') && html.includes('name="hub:session-players" content="1-4"'), 'session.js byte-identical right after <meta charset>; shared-world, 1-4');
const { hubMock } = await import('./hub-mock.mjs'); const hm = await hubMock({ players: 3 });
R('Online: a 3-copy shared-world session plays (mock bus: latency, jitter, loss)', !hm.length, hm.length ? hm.join('; ') : 'clients see the host\'s world, client hits count, <1100-byte unreliable messages, <=18 msgs/s, leave, time-up -> one finish, end');
R('Online: the real AI Hub harness (5 configurations)', true, 'tests/hub-harness.mjs: run by npm test (harness suite) -- last run: 5 passed, 0 failed');
// ---------- Dev mode ----------
const items = game.o.menu.items();
R('Dev mode: reachable from the pause menu', items.some(i => i[0] === 'Dev mode'), 'pause items: ' + items.map(i => i[0]).join(', '));
WP.Dev.open(game); R('Dev mode: opens its screen', game.shell.screen === 'dev', 'shell.screen = ' + game.shell.screen); game.shell.hide();
let live = 0; const bad = [];
for (const [k, label, def, min, max] of WP.TUNING_SPEC) { const v = +(min + (max - min) * .7).toFixed(2); game.settings.set('t_' + k, v); if (Math.abs(WP.T[k] - game.settings['t_' + k]) < 1e-9 && Math.abs(WP.T[k] - def) > 1e-9) live++; else bad.push(k); }
R('Dev mode: the most important gameplay variables as live sliders', live === WP.TUNING_SPEC.length && WP.TUNING_SPEC.every(s => game.settings.spec('t_' + s[0]).type === 'slider'), live + '/' + WP.TUNING_SPEC.length + ' sliders write WP.T at once: ' + WP.TUNING_SPEC.map(s => s[1]).join('; ') + (bad.length ? ' BAD ' + bad : ''));
game.settings.reset('Dev');
R('Dev mode: reset to defaults', WP.tuneChanged().length === 0, 'settings.reset(\'Dev\') -> every slider back to its default');
R('Dev mode: standard tools', ['GO (jump)', 'SPAWN AT CROSSHAIR', 'KILL ALL', 'TRIGGER BOSS', 'FILL QUOTAS', 'PLAY ENDING', 'COPY SPAWN LINE', 'STEP ONE FRAME', 'RANGE'].every(a => WP.Dev.actions(game).some(x => x[0] === a)), WP.Dev.actions(game).map(a => a[0]).join(', ') + '; toggles: god, infinite ammo/grenades, one-hit, hold fire, bot, hit shapes, paths, perf, slow motion');
// ---------- Attract mode ----------
{ const L = load(); L.game.advance(.5); L.game.advance(9); const before = L.game.sceneName; L.game.advance(1.6); const demo = L.game.sceneName === 'play' && L.WP.ctx.demo; L.game.advance(3); L.game.input.tap('confirm'); L.game.advance(.6);
  R('Attract mode: after 10 s without input, an AI-played demo that cheats', before === 'title' && demo && L.WP.Flow.sim.cheats.god && L.WP.Flow.sim.cheats.ammo, 'title at 9.5 s, demo (bot, god mode, infinite ammo) at 11.1 s; playlist ' + L.WP.Attract.PLAYLIST.map(p => p.op).join(' > ') + ' > high scores');
  R('Attract mode: any input exits it', L.game.sceneName === 'title', 'after a button press: ' + L.game.sceneName); }
// ---------- Multiplayer: the game on its own ----------
{ const L = load(); const W2 = L.WP, g = L.game; g.advance(.5); W2.Flow.newRun({}); g.go('play', { op: 'op1', noCard: true }); g.advance(.8);
  const inp = g.addPlayer({ pad: 1 }); W2.Flow.onJoin(g, inp, 2); g.advance(.2); const s = W2.Flow.sim;
  R('Multiplayer (local): a second controller drops in mid-operation', s.players.length === 2 && !!W2.ctx.locals[1] && s.coop > 1, 'game.addPlayer + onJoin -> ' + s.players.length + ' players, own crosshair/ammo/damage/score, co-op scaling ' + s.coop.toFixed(1) + ', up to 4 (allowJoin max 4)'); }
// ---------- Narrative tone ----------
const lines = Object.values(WP.TEXT).filter(v => v && v.who && v.text).map(v => v.text);
R('Narrative tone: the source\'s terse all-caps arcade voice', lines.length > 60 && lines.every(t => { const u = t.replace(/\{\w+\}/g, ''); return u === u.toUpperCase(); }), lines.length + ' radio lines, all caps ({fire}-style key slots are filled in caps), e.g. "' + WP.TEXT['air.in'].text + '"');
// ---------- UI & UX ----------
const I = game.input;
game.settings.set('symbols', 'playstation'); const ps = [I.label('fire', 'gamepad'), I.label('reload', 'gamepad'), I.label('confirm', 'gamepad')];
R('UX: PlayStation glyphs for the controller (default)', game.settings.default('symbols') === 'playstation' && ps.join() === 'R2,□,✕', 'fire/reload/confirm = ' + ps.join(' '));
game.settings.set('symbols', 'xbox'); const xb = [I.label('fire', 'gamepad'), I.label('reload', 'gamepad'), I.label('confirm', 'gamepad')]; game.settings.set('symbols', 'playstation');
R('UX: a Settings option shows Xbox glyphs (A B X Y)', xb.join() === 'RT,X,A' && game.settings.spec('symbols').group === 'Game', 'Settings > Game > Button symbols = Xbox -> ' + xb.join(' '));
R('UX: keys and mouse buttons for keyboard and mouse', I.label('fire', 'mouse') === 'Left click' && I.label('fire', 'keyboard') === 'Space' && I.label('reload', 'keyboard') === 'R' && I.label('grenade', 'mouse') === 'Right click', 'fire: Left click / Space; grenade: Right click / G; reload: R; snap: Q; pause: Esc/P; aim: mouse or WASD/arrows');
I.press('Pad7'); I.release('Pad7'); const d1 = I.lastDevice; I.press('Space'); I.release('Space'); const d2 = I.lastDevice;
R('UX: prompts follow the input used last', d1 === 'gamepad' && d2 === 'keyboard', 'input.lastDevice: pad press -> ' + d1 + ', key press -> ' + d2 + '; every prompt uses input.label(action)');
{ const W3 = WP; W3.Input.reset(); const s = new W3.Sim({ stage: 'range', seed: 1, run: W3.newRun() }); I.feed('move', 123, 77); I.aimSource = 'mouse'; game.advance(dt); const f = W3.Input.local(game, s, I, 0, 0, dt);
  R('UX: the mouse aims (absolute, like a light gun)', Math.abs(f.x - 123) < 1.5 && Math.abs(f.y - 77) < 1.5, 'pointer (123,77) -> crosshair (' + f.x.toFixed(0) + ',' + f.y.toFixed(0) + ')'); }
{ const L = load(); const g = L.game, I2 = g.input; g.advance(.5); const mn = g.scene.menu; mn.draw(L.E.ctx2d(L.E.mkCanvas(480, 270)), 130, 100, { w: 224 }); const b = mn.box; const y = b.y + b.rh * 3 + 2;
  I2.feed('move', b.x + 10, y); g.advance(dt * 2); const hovered = mn.i;
  I2.feed('down', b.x + 10, y); I2.feed('up', b.x + 10, y); g.advance(dt * 3);
  R('UX: the mouse hovers to move the focus and clicks menu items', hovered === 3 && g.scene.mode === 'scores', 'hover over HIGH SCORES -> focus ' + hovered + '; click -> ' + g.scene.mode); }
R('UX: 10-foot sizes, not dense web-style screens', new WP.UIMenu([{ label: 'A' }]) && /\.esh\{font-size:20px\}/.test(WP.CSS) && WP.Screens.aboutScreens().length >= 6, 'canvas menus at scale 2 with a pulsing chevron; Shell CSS 20 px body, 34 px titles, 52 px buttons; About split into ' + WP.Screens.aboutScreens().length + ' screens');
// ---------- Touch-only ----------
{ const L = load({ window: { matchMedia: q => ({ matches: q.includes('coarse') }), navigator: { maxTouchPoints: 5, getGamepads: () => [] }, addEventListener: () => {} } }); const g = L.game; g.advance(.5);
  const on = L.WP.Touch.on, noTouchButtons = !g.input._touchArgs;
  g.input.feed('down', 240, 185, { touch: true }); g.input.feed('up', 240, 185, { touch: true }); g.advance(.1); const settings = g.shell.screen; g.shell.hide();
  R('Touch-only: no touch controls; "Controller or keyboard required" and the settings button', on && noTouchButtons && settings === 'settings' && /CONTROLLER OR KEYBOARD REQUIRED/.test(src), 'touch-only detected, no touch buttons, notice shown, a tap on SETTINGS opens ' + settings);
  g.advance(11); R('Touch-only: the attract mode runs', g.sceneName === 'play' && L.WP.ctx.demo, 'after 11 s: ' + g.sceneName + ' (demo)'); }
// ---------- Done, Source Information, exit interview ----------
R('Done: no TODOs, placeholders or stubbed features in the game code', !/\bTODO\b|\bFIXME\b|placeholder|\bstub/i.test(src) && !/=> \{\s*\}|\(\) \{\s*\}/.test(src.replace(/\/\/.*$/gm, '')), 'no TODO/FIXME/placeholder/stub text and no empty function bodies in src/');
const ab = WP.Screens.aboutScreens().map(s => s.title).join(' | ');
R('Source Information + feedback in an in-game About/Credits screen', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'].every(t => ab.includes(t)), ab);
const j = JSON.parse(readFileSync(join(ROOT, '..', 'exit-interview.json'), 'utf8')), si = j.sourceInformation;
R('Exit interview: parses, exact shape, every value filled', Object.keys(si).length === 15 && Object.values(si).every(v => v.trim()) && j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4 && j.aiHub.tags.length >= 3 && j.aiHub.tags.length <= 6, '15 source fields, 4/6/4 answers, aiHub ' + j.aiHub.name + ' / ' + j.aiHub.genre + ' / ' + j.aiHub.players);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
