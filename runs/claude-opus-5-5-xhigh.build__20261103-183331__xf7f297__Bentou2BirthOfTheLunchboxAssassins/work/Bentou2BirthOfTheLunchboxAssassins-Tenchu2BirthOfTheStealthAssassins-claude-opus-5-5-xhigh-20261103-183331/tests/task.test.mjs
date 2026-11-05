// task: TASK.md, item by item. Each requirement of the task gets a concrete check against the built game (the deeper
// behaviour of each is in its own suite: boot, dev, hub, input, playthrough, attract, about, browser/*)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url), dev = new URL('../', import.meta.url);
import { NAME, TITLE, SOURCE, fileSafe } from '../tools/name.mjs';
export default async function (t) {
  const { B, E, check, game } = t; t.step(.3);
  const html = readFileSync(new URL(NAME + '.html', root), 'utf8'), js = readFileSync(new URL('build/game.js', dev), 'utf8'), task = readFileSync(new URL('TASK.md', root), 'utf8');
  // Package and working environment
  check('Package: TASK.md names the file [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331].html', task.includes('[GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331].html'), '');
  const J0 = JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8'));
  check('Package: the name is TASK.md\'s [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331]: GameTitle the title on the title screen, SOURCE TASK.md\'s first line, written whole', task.split('\n')[0] === 'SOURCE: ' + SOURCE && J0.aiHub.name === TITLE && NAME === fileSafe(TITLE) + '-' + fileSafe(SOURCE) + '-claude-opus-5-5-xhigh-20261103-183331' && NAME === 'Bentou2BirthOfTheLunchboxAssassins-Tenchu2BirthOfTheStealthAssassins-claude-opus-5-5-xhigh-20261103-183331', NAME);
  check('Package: the single file is in the root under that name, and no other game file beside it', existsSync(new URL(NAME + '.html', root)) && readdirSync(root).filter(f => f.endsWith('.html')).length === 1, readdirSync(root).filter(f => f.endsWith('.html')).join(','));
  const plan = readFileSync(new URL('PLAN.md', root), 'utf8'), stage = readFileSync(new URL('STAGE.md', root), 'utf8');
  check('Working environment: the dev subfolder has the same name (this suite runs from it)', existsSync(new URL(NAME + '/', root)) && new URL('.', dev).pathname.endsWith('/' + NAME + '/') && existsSync(new URL('src/00-core.js', dev)), new URL('.', dev).pathname);
  check('Package: everything inlined (engine, game, session client), no external scripts or files', !/<script[^>]+src=/.test(html) && !/<link[^>]+href=/.test(html) && html.includes('aihub-session 1.4.0') && html.includes('My3D2dge'), '');
  // Game Title
  check('Game Title: the plan\'s RNG-drawn riff on the source\'s name is on the page and the title screen', /<title>Bentou 2: Birth of the Lunchbox Assassins<\/title>/.test(html) && js.includes("'BENTOU 2'") && js.includes('Birth of the Lunchbox Assassins'), '');
  // Tech stack, art, animation
  check('Tech stack: built on the my-3D2dge handoff engine (v0.85.2), changes marked', E.version === '0.85.2' && (readFileSync(new URL('engine/my-3d2dge.js', dev), 'utf8').match(/BENTOU PATCH/g) || []).length >= 9, E.version);
  check('Art: new art assets (Japanese props, materials, wall painters, icons, kanji)', ['stoneLantern', 'torii', 'yatai', 'hansho', 'bambooCage', 'shachihoko', 'komodaru'].filter(k => E.SHAPES[k]).length >= 6 && Object.keys(B.Art.icon).length >= 10, '');
  check('Animation: new animations on the engine\'s rigs (10 Silent Cut choreographies, the grapple, poses)', ['back', 'side', 'front', 'above', 'undertow'].every(k => E.ACTIONS['cut_' + k + '_sojiro'] && E.ACTIONS['cut_' + k + '_kaede']) && !!E.ACTIONS.grapple && ['ninjaRun', 'wallHug', 'eating', 'sleeping', 'swim', 'bow', 'paddleTap', 'toast'].every(k => typeof B.Rigs[k] === 'function'), '');
  // Audio: all in code
  check('Audio: no audio or image files; music, sound effects and voices are code', !/\.(mp3|ogg|wav|m4a|png|jpe?g|gif|webp)["'?]/i.test(js) && !/data:audio/.test(html) && !/new Audio\(/.test(js) && Object.keys(B.SONGS).length >= 9 && typeof B.Voice.say === 'function', '');
  check('Audio: voices are Animalese-style gibberish from the text', B.Voice.syllables('Rice that is never tested is only seed.').length >= 8 && Object.keys(B.VOICES).length >= 12, '');
  // Scope: a feature-complete demo
  check('Scope: a training mission and three story missions, each with a boss, and the trial round', ['training', 'm1', 'm2', 'm3', 'delivery'].every(id => B.get('mission', id) && B.get('level', id)) && ['ittetsu', 'gonroku', 'hotaru', 'kurogane'].every(id => B.get('boss', id)), '');
  check('Scope: two playable characters, 10 tools, 5 guard types, civilians and disguised enemies', Object.keys(B.CHARS).length === 2 && B.TOOL_ORDER.length === 10 && ['ashigaru', 'samurai', 'archer', 'ninja', 'hound', 'civ'].every(k => B.get('enemy', k)) && B.get('level', 'm3').civilians.some(c => c.disguised), '');
  check('Scope: infrastructure for designer tools (levels as data, a mission editor that edits them)', !!B.Ed && typeof B.Ed.validate === 'function' && !!game.scenes.workshop, '');
  // Genre and perspective: an isometric third person that turns in 45-degree steps (Q / E, the right stick)
  { t.load('m1', { mode: 'story' }); B.Cutscene.clear(); t.step(.5); const y0 = game.yaw || 0; t.tap('camRight'); t.step(.4); const y1 = game.yaw; t.tap('camLeft'); t.step(.4); t.tap('camLeft'); t.step(.4);
    check('Perspective: isometric (iso view), the camera turns 45 degrees a press each way', game.baseView === E.VIEWS.iso, String(game.o.view));
    check('Perspective: camRight turns +45, camLeft back and on to -45', y1 === (y0 + 45) % 360 && game.yaw === (y0 + 315) % 360, [y0, y1, game.yaw].join(' ')); }
  check('Game Title: the plan drew it with a real RNG from 50 (secrets.randbelow) and it is the title shown', /secrets\.randbelow\(50\)/.test(plan) && /won: \*\*"Bentou 2: Birth of the Lunchbox Assassins"\*\*/.test(plan) && B.ABOUT && JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8')).aiHub.name === 'Bentou 2: Birth of the Lunchbox Assassins', '');
  // Dev mode
  t.load('m1', { mode: 'story' }); B.Cutscene.clear();
  check('Dev mode: reachable from the pause menu', B.pauseItems().some(i => i[0] === 'Dev Mode'), B.pauseItems().map(i => i[0]).join(','));
  check('Dev mode: the important gameplay variables are live sliders, with reset to defaults', B.TUNE.length >= 30 && B.TUNE.every(r => game.settings.spec(r[0]) && game.settings.spec(r[0]).type === 'slider' && game.settings.spec(r[0]).group === 'Dev') && typeof game.settings.reset === 'function', '');
  // Attract mode
  game.go('title', {}, { fade: 0 }); t.step(.5); B.noteInput(); t.step(10.6);
  check('Attract mode: after 10 s without input on the title, an AI-played demo', game.sceneName === 'attract', game.sceneName);
  t.step(2); const ap = game.scene === game.scenes.attract && B.M && B.M.cheats.god; check('Attract mode: the autopilot plays with cheats (god mode)', ap, '');
  t.tap('confirm'); t.step(.6); check('Attract mode: any input exits it', game.sceneName === 'title', game.sceneName);
  // Multiplayer
  check('Multiplayer: the AI Hub tags, the session client first in <head>', /<head>\s*<meta charset="utf-8">\s*<script>\/\*! aihub-session/.test(html) && ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="ghost"'].every(s => html.includes(s)), '');
  check('Multiplayer: the game on its own (the Shadow Trial with your best ghost)', !!game.scenes.trialResults && typeof B.Hub.trialStart === 'function' && typeof B.Save.trialAdd === 'function', '');
  // Narrative tone
  check('Narrative tone: a story in the source\'s register (crawl, briefings, cutscenes, barks)', B.Story.crawl.length >= 5 && Object.keys(B.Story.scenes).length >= 12 && Object.keys(B.Story.barks).length >= 14, '');
  // UI and UX: 10-foot, controller first
  const gl = game.settings.spec('glyphs');
  check('UI: PlayStation glyphs by default, a Settings option for Xbox (on the Settings screen: browser/screens taps it)', game.settings.glyphs === 'playstation' && gl.options.some(o => (o[0] || o) === 'xbox') && readFileSync(new URL('engine/my-3d2dge.js', dev), 'utf8').includes("add(this._row('glyphs'))"), JSON.stringify(gl.options));
  const has = (a, c) => (game.input.map[a] || []).includes(c);
  check('UI: the keys PC players expect for the genre', has('up', 'KeyW') && has('jump', 'Space') && has('sprint', 'ShiftLeft') && has('crouch', 'KeyC') && has('interact', 'KeyF') && has('pause', 'Escape') && !Object.values(game.input.map).some(l => l.includes('ControlLeft')), '');
  check('UI: the mouse aims and clicks (strike, block, the hook, the cursor for throws)', has('attack', 'Mouse0') && has('block', 'Mouse2') && has('grapple', 'Mouse1') && typeof B.mouseMode === 'function', '');
  check('UI: a pad in the standard mapping (face buttons, shoulders, triggers, sticks, d-pad, Create, Options)', ['Pad0', 'Pad1', 'Pad2', 'Pad3', 'Pad4', 'Pad5', 'Pad6', 'Pad7', 'Pad8', 'Pad9', 'Pad10', 'Pad11', 'Pad12', 'Pad15'].every(c => Object.values(game.input.map).some(l => l.includes(c))), '');
  game.input.lastDevice = 'gamepad'; const pp = B.Glyph.code('attack'); game.input.lastDevice = 'keyboard'; const pk = B.Glyph.code('attack');
  check('UI: on-screen prompts follow the input used last', pp === 'Pad2' && pk === 'KeyJ', pp + ' ' + pk);
  check('UI: hover moves the focus (menus, the bento, the Workshop, the world)', readFileSync(new URL('engine/my-3d2dge.js', dev), 'utf8').includes('BENTOU PATCH 5') && js.includes('B.mouseMode()'), '');
  check('UI: no dense web-style data screens (at most 8 rows a dev page; one decision a screen)', B.TUNE_PAGES.every(p => B.TUNE.filter(r => r[6] === p).length <= 8), '');
  // Touch-only devices
  check('Touch-only: "Controller or keyboard required" with the Settings button, and attract still runs', js.includes('Controller or keyboard required') && js.includes("game.menu('settings')") && typeof B.touchOnly === 'function', '');
  // Source Information, feedback, exit interview
  const pages = B.About.pages().map(p => p[0]);
  check('Source Information and the feedback on an in-game About / Credits screen (browser/screens reads every line off the canvas)', ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Credits'].every(p => pages.includes(p)) && !!game.scenes.about, pages.join(','));
  const J = JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8'));
  check('Exit interview: in the root, in TASK.md\'s shape', ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'].every(k => J[k]) && J.testingFeedback.length === 4 && J.engineFeedback.length === 6 && J.promptFeedback.length === 4, '');
  // Done: no TODOs, placeholders or stubs
  const src = readdirSync(new URL('src/', dev)).map(f => readFileSync(new URL('src/' + f, dev), 'utf8')).join('\n');
  check('Done: no TODO, FIXME, placeholder or stub in the game\'s source', !/\bTODO\b|\bFIXME\b|placeholder|lorem|not implemented|stub\b/i.test(src), '');
}
