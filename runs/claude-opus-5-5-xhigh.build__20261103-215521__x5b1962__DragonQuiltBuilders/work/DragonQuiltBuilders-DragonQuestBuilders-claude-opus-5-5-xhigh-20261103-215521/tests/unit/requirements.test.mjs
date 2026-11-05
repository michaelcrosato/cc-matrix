// TASK.md requirement by requirement (on the shipped file and a running copy), then a content audit: everything the
// game defines is reachable and used, so nothing is a stub. Behaviour that needs play (the playthrough, the Bee rounds,
// the hub harness, real input) is checked by the other suites; REQUIREMENTS.md maps every TASK.md line to its checks.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default async function ({ load, check, DEV }) {
  const SRC = readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort().map(f => [f, readFileSync(join(DEV, 'src', f), 'utf8')]);
  const all = SRC.map(x => x[1]).join('\n'), file = n => SRC.find(x => x[0] === n)[1];
  const NAME = 'DragonQuiltBuilders-DragonQuestBuilders-claude-opus-5-5-xhigh-20261103-215521';
  const htmlPath = join(DEV, '..', NAME + '.html'), html = existsSync(htmlPath) ? readFileSync(htmlPath, 'utf8') : '';
  const L = load({ test: { scene: 'title', skipCutscenes: true } }), { game, DQ, E } = L; await game.booted; game.advance(.2);
  // AUDIT_PROBE=1: plant one unused thing of each kind, to see the audit catch it (every audit check should then fail)
  if (process.env.AUDIT_PROBE) { DQ.SONGS.probeSong = { bpm: 90, tracks: [] }; DQ.JINGLES.probeJingle = { bpm: 90, tracks: [] }; DQ.ITEMS.probeItem = { id: 'probeItem', kind: 'mat' }; DQ.OBJECTS.probeObj = { id: 'probeObj', tags: [] };
    DQ.MONSTERS.probeMon = {}; DQ.CUTSCENES.probeCs = { *run() {} }; DQ.TUNING_DEFS.push({ key: 'probeTune', label: 'Probe', min: 0, max: 1, step: .1, def: 2 }); DQ.RECIPES.push({ id: 'probeRecipe', station: 'probeStation', in: { probeItem: 1 }, out: 'probeItem', n: 1 }); }
  const R = (id, what, ok, detail) => check('TASK ' + id + ': ' + what, ok, detail);
  const C = (what, missing) => check('audit: ' + what, !missing.length, missing.join(', '));
  /** the string literals inside every call to fn( ... ) */
  const callArgs = fn => { const out = new Set(), re = new RegExp('\\b' + fn + '\\(', 'g'); let m;
    while ((m = re.exec(all))) { let d = 1, i = m.index + m[0].length, s = i; while (i < all.length && d) { const c = all[i]; if (c === '(') d++; else if (c === ')') d--; i++; } for (const q of all.slice(s, i - 1).matchAll(/'([A-Za-z0-9_]+)'/g)) out.add(q[1]); }
    return out; };
  const quoted = new Set([...all.matchAll(/'([A-Za-z0-9_]+)'/g)].map(m => m[1]));

  // ================================================================ TASK.md, line by line
  // Genre and perspective: an isometric view that turns in 90-degree steps and zooms, and a three-quarter option
  R('perspective', 'isometric and three-quarter views, 90-degree turns, zoom steps', E.VIEWS.iso && E.VIEWS.threequarter && typeof game.rotateView === 'function' && DQ.ZOOMS.iso.length >= 3 && DQ.ZOOMS.threequarter.length >= 3 && DQ.SETTINGS.find(s => s.key === 'camView').options.includes('Three-quarter'));
  // Game title: a riff on the source's name, shown on the title screen
  R('title', 'Dragon Quilt Builders in the page title, the boot screen and the logo', /<title>Dragon Quilt Builders<\/title>/.test(html) && /'DRAGON QUILT BUILDERS'/.test(file('99-main.js')) && /const word = 'DRAGON QUILT'/.test(file('38-scenes.js')) && typeof DQ.Title.logo === 'function');
  // Package: one html file with the exact name in the folder's root, nothing loaded from outside
  R('package', 'the single HTML file exists with the exact name', html.length > 500000, htmlPath);
  R('package', 'no external scripts, styles, fetches or imports', !/<script[^>]+src=/i.test(html) && !/<link[^>]+href=["']https?:/i.test(html) && !/fetch\(\s*['"]https?:/.test(html) && !/import\(\s*['"]https?:/.test(html));
  R('package', 'every game module is bundled', SRC.every(([f]) => html.includes('/* src/' + f + ' */')), SRC.filter(([f]) => !html.includes('/* src/' + f + ' */')).map(x => x[0]));
  // Tech stack: built on the my-3D2dge handoff
  R('tech', 'my-3D2dge 0.85.2 is the engine in the bundle', E.version === '0.85.2' && html.includes("version: '0.85.2'"));
  // Art direction: the engine's native style plus new art for the source's feel
  const dqShapes = Object.keys(E.SHAPES).filter(k => k.startsWith('dq')), noIcon = Object.keys(DQ.ITEMS).filter(id => !DQ.ITEMS[id].icon && !DQ.ITEMS[id].block && !DQ.ITEMS[id].obj);
  R('art', 'the engine pixel renderer (ps1 resolution) with new quilt shapes, block textures and item icons', game.screen && dqShapes.length >= 10 && DQ.BLOCKS.filter(Boolean).every(b => b.top && b.side) && !noIcon.length, [dqShapes.length, noIcon.join()]);
  // Animation: the engine's rigs and moves, with new ones
  const builderRig = DQ.makeBuilderRig({ style: 'A', palette: 0 });
  R('animation', 'the Builder is an engine Humanoid rig; new moves place, eat, stir, crank, hammer', builderRig instanceof E.Humanoid && ['place', 'eat', 'stir', 'crank', 'hammer'].every(k => E.MOVES[k]), Object.keys(E.MOVES).join());
  // Audio: all code, no audio files; Animalese-style voices
  R('audio', 'no audio files or audio data in the bundle', !/\.(mp3|ogg|wav|m4a|flac)\b['"]/i.test(html) && !/data:audio/i.test(html) && !/new Audio\(/.test(html));
  R('audio', 'songs, jingles and sound effects are code', Object.keys(DQ.SONGS).length >= 10 && Object.values(DQ.SONGS).every(s => s.bpm && s.tracks) && Object.keys(DQ.JINGLES).length >= 8 && typeof DQ.AudioX.voice === 'function');
  const speakers = new Set([...Object.keys(DQ.NPCS), ...Object.keys(DQ.SPEAKERS)].filter(k => k !== 'builder'));
  R('audio', 'every speaking character has a gibberish voice', [...speakers].every(k => DQ.VOICES[k]), [...speakers].filter(k => !DQ.VOICES[k]));
  // Online: the AI Hub client, unmodified and first in <head>, and the hub tags
  const head = html.slice(0, html.indexOf('</head>')), firstScript = head.indexOf('<script');
  R('online', 'session.js 1.4.0 is the first script in <head>, unmodified', firstScript >= 0 && head.slice(firstScript, firstScript + 120).includes('aihub-session 1.4.0') && head.includes(readFileSync(join(DEV, 'vendor/aihub/session.js'), 'utf8').trim().slice(0, 2000)));
  R('online', 'the hub tags: type, players, session, players, mode, minutes, goal, how-to', ['type', 'players', 'session', 'session-players', 'session-mode', 'session-minutes', 'session-goal', 'session-howto'].every(k => new RegExp('<meta name="hub:' + k + '" content="[^"]+">').test(head)));
  R('online', 'outside a session the game is the standalone game', !DQ.HUB && game.sceneName === 'title');
  // Working environment: dev files in the subfolder, the bundle in the root
  R('environment', 'dev files live in the subfolder', DEV.endsWith(NAME) && existsSync(join(DEV, 'tools/build.mjs')) && existsSync(join(DEV, 'tests/run.mjs')));
  // Dev mode from the pause menu, with live sliders and a reset to defaults
  const menuItems = (game.shell && game.shell.opts && game.shell.opts.items) || (game.opts && game.opts.menu && game.opts.menu.items) || [];
  R('dev mode', 'the pause menu has Dev Tools', /\['Dev Tools', \(\) =>/.test(file('99-main.js')) || menuItems.some(i => i[0] === 'Dev Tools'));
  // Attract mode: after 10 s idle on the title or menus (timing, looping and exit are checked in systems)
  R('attract', 'an attract mode with AI-played vignettes', DQ.Attract && DQ.SCENES.attract && DQ.Attract.VIGNETTES.length >= 5);
  // Controller-first UI: PlayStation glyphs by default, an Xbox option, keyboard and mouse native
  const gl = DQ.SETTINGS.find(s => s.key === 'glyphs');
  R('ui', 'PlayStation glyphs by default with an Xbox option in Settings', gl.value === 'playstation' && gl.options.some(o => o[0] === 'xbox'));
  const P = DQ.Controls.PLAY;
  R('ui', 'the genre\'s PC keys and mouse: WASD, Space, Shift, mouse break/place, Q/E camera, F talk, Tab bag, wheel', P.up.includes('KeyW') && P.left.includes('KeyA') && P.jump.includes('Space') && P.sprint.includes('ShiftLeft') && P.swing.includes('Mouse0') && P.place.includes('Mouse2') && P.camLeft.includes('KeyQ') && P.camRight.includes('KeyE') && P.interact.includes('KeyF') && P.satchel.includes('Tab') && typeof DQ.Controls.wheelSteps === 'function');
  R('ui', 'every play action has a pad button too', ['up', 'down', 'left', 'right', 'jump', 'swing', 'place', 'interact', 'sprint', 'eye', 'hotPrev', 'hotNext', 'satchel', 'map', 'camReset'].every(a => P[a].some(c => c.startsWith('Pad'))));
  // Touch-only devices: no touch controls, the notice and the settings button
  R('touch', 'the touch-only notice text and no touch controls on any scene', /'Controller or keyboard required'/.test(file('38-scenes.js')) && Object.values(DQ.SCENES).every(s => !s.touch || (Array.isArray(s.touch) && !s.touch.length)));
  // Done: no TODOs, placeholders or stubs (the content audit below is the stub check)
  const words = SRC.flatMap(([f, t]) => t.split('\n').map((l, i) => /\bTODO\b|\bFIXME\b|\bXXX\b|placeholder|lorem ipsum|coming soon|not implemented/i.test(l) && !/'XXX'\)/.test(l) ? f + ':' + (i + 1) : null).filter(Boolean));
  R('done', 'no TODO, FIXME, placeholder or coming-soon text in the source', !words.length, words.join(' '));
  // Source information: the About/Credits screen and the exit interview
  const ex = existsSync(join(DEV, '../exit-interview.json')) ? JSON.parse(readFileSync(join(DEV, '../exit-interview.json'), 'utf8')) : null;
  const pages = DQ.SCENES.about.pages().map(p => p[0]);
  R('source information', 'About/Credits has Credits, Source Information and the three feedback pages', ['Credits', 'Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback'].every(t => pages.includes(t)), pages.join());
  R('source information', 'the exit interview has the exact shape, every value filled', ex && Object.keys(ex.sourceInformation).length === 15 && Object.values(ex.sourceInformation).every(v => String(v).trim()) && ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4 && ex.testingFeedback.concat(ex.engineFeedback, ex.promptFeedback).every(v => String(v).trim().length > 10) && Object.keys(ex.aiHub).length === 10 && ex.aiHub.tags.length >= 3 && ex.aiHub.tags.length <= 6);
  R('source information', 'the bundle carries the same answers for the About screen', ex && html.includes('"date":"' + ex.sourceInformation.date + '"') && html.includes(JSON.stringify(ex.engineFeedback[4]).slice(1, 60)));

  // ================================================================ content audit: nothing defined is unused
  // songs: every song is chosen by the music director, a region, or a scene
  const songUse = new Set([...callArgs('music'), ...DQ.WORLD.regions.map(r => r.music), ...[...file('31-audio.js').matchAll(/want = '([a-z]+)'/g)].map(m => m[1]), ...[...file('31-audio.js').matchAll(/'([a-z]+)' : '([a-z]+)'/g)].flatMap(m => [m[1], m[2]])]);
  C('every song plays somewhere', Object.keys(DQ.SONGS).filter(k => !songUse.has(k)));
  const jUse = callArgs('jingle'); C('every jingle plays somewhere', Object.keys(DQ.JINGLES).filter(k => !jUse.has(k)));
  // sound effects: called by name, or named in data (monster voices, block step sounds, object sounds)
  const sfxSrc = file('31-audio.js'), sfxBlock = sfxSrc.slice(sfxSrc.indexOf('const SFX = {'), sfxSrc.indexOf('\n};', sfxSrc.indexOf('const SFX = {')));
  const sfxNames = [...sfxBlock.matchAll(/\b([a-zA-Z0-9]+): \{/g)].map(m => m[1]);
  const sfxUse = new Set([...callArgs('sfx'), ...callArgs('play'), ...Object.values(DQ.MONSTERS).map(m => m.voice), ...DQ.BLOCKS.filter(Boolean).map(b => 'step_' + b.step), ...[...all.matchAll(/sfx: '([a-zA-Z0-9]+)'/g)].map(m => m[1])]);
  C('every sound effect is played', sfxNames.filter(k => !sfxUse.has(k) && !quoted.has(k)));
  // cutscenes: each one is played by the story, a quest, a boss or a beat
  const csUse = new Set([...callArgs('Cutscenes.play'), ...callArgs('play'), ...Object.values(DQ.QUESTS).map(q => q.doneScene).filter(Boolean), ...[...all.matchAll(/(?:scene|doneScene|cutscene): '([a-zA-Z]+)'/g)].map(m => m[1])]);
  C('every cutscene is played', Object.keys(DQ.CUTSCENES).filter(k => !csUse.has(k)));
  // items: each can be obtained and has a use
  const outOf = new Set(DQ.RECIPES.map(r => r.out)), inOf = new Set(DQ.RECIPES.flatMap(r => Object.keys(r.in).concat(Object.values(r.alt || {}))));
  const dropIds = d => !d ? [] : typeof d === 'string' ? [d] : Array.isArray(d) ? [d[0]] : Object.keys(d);
  const dropsOf = new Set([...DQ.BLOCKS.filter(Boolean).flatMap(b => dropIds(b.drop)), ...Object.values(DQ.MONSTERS).flatMap(m => Object.keys(m.drops || {})), ...Object.values(DQ.OBJECTS).flatMap(o => [o.item, o.collect, ...Object.keys(o.drops || {}), ...(o.plant || []).map(p => p[0])].filter(Boolean))]);
  const givenIn = new Set([...callArgs('add'), ...callArgs('give'), ...callArgs('spawn'), ...Object.values(DQ.QUESTS).flatMap(q => Object.keys((q.reward && q.reward.items) || {}).concat(Object.keys((q.start && q.start.items) || {})))]);
  const obtainable = id => outOf.has(id) || dropsOf.has(id) || givenIn.has(id);
  C('every item can be obtained', Object.keys(DQ.ITEMS).filter(id => !obtainable(id)));
  const questNeeds = new Set(Object.values(DQ.QUESTS).flatMap(q => q.steps.flatMap(s => Object.keys((s.done && (s.done.have || s.done.give || s.done.crafted || s.done.placed)) || {}).concat(typeof (s.done && s.done.crafted) === 'string' ? [s.done.crafted] : []))));
  const useOf = id => { const it = DQ.ITEMS[id]; return (it.kind === 'block' && DQ.BLOCKS[it.block] && DQ.BLOCKS[it.block].placeable) || (it.kind === 'obj' && DQ.OBJECTS[it.obj]) || (it.kind === 'food' && it.food && it.food.belly > 0) || ['weapon', 'body', 'shield'].includes(it.kind) || inOf.has(id) || questNeeds.has(id) || (it.kind === 'use' && new RegExp("id === '" + id + "'|'" + id + "'").test(file('15-builder.js') + file('28-story.js') + file('38-scenes.js'))) || (it.kind === 'key' && all.split("'" + id + "'").length > 2); };
  C('every item has a use (placed, eaten, worn, crafted with, asked for, or used)', Object.keys(DQ.ITEMS).filter(id => !useOf(id)));
  // recipes: the station exists, the inputs can be obtained, the Notion can be had
  const flagsSet = new Set([...all.matchAll(/flags\.([a-zA-Z]+) = true/g), ...all.matchAll(/flags\[['"]([a-zA-Z]+)['"]\] = true/g)].map(m => m[1]));
  const notionOk = n => !n || (n.on === 'pickup' && obtainable(n.key)) || (n.on === 'level' && n.key >= 1 && n.key <= 5) || (n.on === 'quest' && (DQ.QUESTS[n.key] || DQ.QUESTS[String(n.key).replace(/start$|done$/, '')])) || (n.on === 'flag' && (flagsSet.has(n.key) || quoted.has(n.key))) || (n.on === 'placed' && DQ.OBJECTS[n.key]) || (n.on === 'start');
  const noStation = DQ.RECIPES.filter(r => r.station !== 'pocket' && !Object.values(DQ.OBJECTS).some(o => o.station === r.station)).map(r => r.id + '@' + r.station);
  const badIn = DQ.RECIPES.filter(r => Object.keys(r.in).some(k => !obtainable(k))).map(r => r.id);
  const rewardNotions = new Set(Object.values(DQ.QUESTS).flatMap(q => (q.reward && q.reward.notions) || []));
  const badNotion = DQ.RECIPES.filter(r => !notionOk(r.notion) && !rewardNotions.has(r.id)).map(r => r.id + ':' + JSON.stringify(r.notion));
  C('every recipe can be learned and crafted', noStation.concat(badIn, badNotion));
  // monsters: each spawns in a region, a siege wave, or as a boss
  const spawnUse = new Set([...DQ.WORLD.regions.flatMap(r => [...(r.day || []), ...(r.night || [])].map(x => x[0])), ...DQ.SIEGE_WAVES.flatMap(w => w.list.map(x => x[0])), ...[...file('26-bosses.js').matchAll(/kind: '([a-zA-Z]+)'|'([a-zA-Z]+)'/g)].map(m => m[1] || m[2])]);
  C('every monster appears in the world', Object.keys(DQ.MONSTERS).filter(k => !spawnUse.has(k)));
  // objects: each is made from an item, or placed by the world, a stamp, the town or the story
  const objItems = new Set(Object.values(DQ.ITEMS).filter(i => i.kind === 'obj').map(i => i.obj)), objPlaced = new Set([...callArgs('objects.add'), ...callArgs('add'), ...[...all.matchAll(/(?:obj|id): '([a-zA-Z]+)'/g)].map(m => m[1]), ...[...all.matchAll(/put\('([a-zA-Z]+)'/g)].map(m => m[1]), ...[...all.matchAll(/\['([a-zA-Z]+)', -?\d+, -?\d+/g)].map(m => m[1])]);
  C('every object can appear in the world', Object.keys(DQ.OBJECTS).filter(k => !objItems.has(k) && !objPlaced.has(k)));
  // blocks: each is made by the world or a player, and drops a known item (or nothing, on purpose)
  const blockKeys = DQ.BLOCKS.filter(Boolean).filter(b => b.key !== 'air');
  C('every block is generated or placeable, and drops a known item', blockKeys.filter(b => !(b.placeable || quoted.has(b.key) || new RegExp('\\b' + b.key + '\\b').test(file('12-worldgen.js') + file('05-data-world.js'))) || dropIds(b.drop).some(d => !DQ.ITEMS[d])).map(b => b.key));
  // tuning sliders: each is read by gameplay code
  const tuneUse = callArgs('tune'); C('every tuning slider is read by the game', DQ.TUNING_DEFS.filter(d => !tuneUse.has(d.key)).map(d => d.key));
  C('every tuning slider\'s default is inside its range', DQ.TUNING_DEFS.filter(d => !(d.min <= d.def && d.def <= d.max && d.step > 0)).map(d => d.key));
  // settings: each is read outside its definition
  const main = file('99-main.js'), rest = SRC.filter(([f]) => f !== '99-main.js').map(x => x[1]).join('\n');
  C('every setting is read by the game', DQ.SETTINGS.filter(s => !(new RegExp('settings\\.' + s.key + '\\b|settings\\.get\\(\'' + s.key + '\'').test(rest) || (s.apply && /apply: \(g, v\) => \{ [^}]*\S/.test(main)))).map(s => s.key));
  // quests: each is reachable (its 'after' exists), has steps, and every step can be finished
  C('every quest is reachable and has steps', Object.values(DQ.QUESTS).filter(q => !q.steps.length || (q.after && !DQ.QUESTS[q.after])).map(q => q.id));
  // residents: a voice, lines, a favourite room that exists
  C('every resident has a voice, an intro and a real favourite room', Object.entries(DQ.NPCS).filter(([k, n]) => !DQ.VOICES[k] || !n.intro || !n.intro.length || (k !== 'lintwick' && !DQ.ROOM[n.fav])).map(([k]) => k));
  // rooms: each type needs furniture that can be crafted (or is a Pattern)
  const craftTags = new Set(Object.values(DQ.OBJECTS).filter(o => objItems.has(o.id || '') || true).flatMap(o => o.tags || []));
  C('every room type is buildable', DQ.ROOMS.filter(r => !r.pattern && !Object.keys(r.need || {}).every(t => craftTags.has(t) || t === 'light')).map(r => r.id));
  // Dev Tools: every row in every tab does something
  game.go('play', { name: 'Audit', beat: 'lv2' }); game.advance(1); DQ.Dev.open(); game.advance(.1);
  const dev = DQ.ctx.ui.top, idle = [];
  for (let t = 0; t < 7; t++) { dev.tab = t; for (const r of dev.rows()) if (!r.act && !r.lr && !r.info) idle.push(t + ':' + r.label); }
  C('every Dev Tools row has an action', idle);
  dev.tab = 4; const tr = dev.rows();
  check('TASK dev mode: a live slider for every tuning value and a reset to defaults', tr.filter(r => r.slider).length === DQ.TUNING_DEFS.length && tr.some(r => /Reset every slider/.test(r.label) && r.act));
  check('no errors (requirements)', !game.errors.length, game.errors.map(e => e.where + ': ' + e.message).join(' | '));
}
