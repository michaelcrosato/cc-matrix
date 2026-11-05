// task: TASK.md itself, read and checked line by line against the build. The file name comes from its bracket pattern,
// the exit interview's shape from its JSON template, the About pages from its Source Information list and its three
// feedback question lists; the rest from its sections (Dev Mode, attract, multiplayer, UI, touch, audio, done).
import { fresh } from '../util.mjs';
import { readFileSync, existsSync } from 'node:fs';
export async function run(t) {
  const ROOT = new URL('../../../', import.meta.url), TASK = readFileSync(new URL('TASK.md', ROOT), 'utf8'), PLAN = readFileSync(new URL('PLAN.md', ROOT), 'utf8');
  // Package and Working Environment: the bracket pattern with the plan's GameTitle and SOURCE forms
  const pat = TASK.match(/\[GameTitle-SOURCE-([^\]]+?)\.html\]/)[1], game = PLAN.match(/GameTitle = `(\w+)`/)[1], src = PLAN.match(/SOURCE = `(\w+)`/)[1];
  const name = `${game}-${src}-${pat}`;
  t.check('TASK Package: the single HTML is in the root under its bracket name', existsSync(new URL(name + '.html', ROOT)), name);
  t.check('TASK Working Environment: the dev folder has the bracket name', existsSync(new URL(name + '/', ROOT)));
  const page = readFileSync(new URL(name + '.html', ROOT), 'utf8');
  t.check('TASK Game Title: the title is the plan\'s RNG pick, a riff on the source', /Eye of the Bolt-Holder/.test(page) && /secrets\.randbelow\(50\)/.test(PLAN) && /Eye of the Bolt-Holder/.test(PLAN));
  t.check('TASK Tech Stack: built on the handoff engine (my-3D2dge v0.85.2) and its 3D engine', page.includes('my-3D2dge v0.85.2') && page.includes('my-3D2dge 3D v0.85.2'));
  t.check('TASK Audio: no audio files in the page', !/data:audio|\.(mp3|ogg|wav|m4a|flac)\b['"]/i.test(page));
  t.check('TASK Online / Multiplayer: the AI Hub client and its session tags', page.includes('aihub-session 1.4.0') && /hub:session" content="1"/.test(page) && /hub:session-mode" content="ghost"/.test(page));
  t.check('TASK Done: no TODO, placeholder or stub in the page', !/\b(TODO|FIXME|placeholders?|stubs?|stubbed|not implemented)\b/i.test(page));
  // Exit interview: exactly the template's shape, every value filled
  const tmplText = TASK.slice(TASK.indexOf('{\n  "sourceInformation"'), TASK.indexOf('\n}\n', TASK.indexOf('"aiHub"')) + 2);
  const tmpl = JSON.parse(tmplText), xi = JSON.parse(readFileSync(new URL('exit-interview.json', ROOT), 'utf8'));
  t.check('TASK Exit interview: the same top-level keys as the template', JSON.stringify(Object.keys(xi)) === JSON.stringify(Object.keys(tmpl)), Object.keys(xi).join(','));
  t.check('TASK Exit interview: the same sourceInformation keys', JSON.stringify(Object.keys(xi.sourceInformation)) === JSON.stringify(Object.keys(tmpl.sourceInformation)));
  t.check('TASK Exit interview: the same aiHub keys', JSON.stringify(Object.keys(xi.aiHub)) === JSON.stringify(Object.keys(tmpl.aiHub)));
  t.check('TASK Exit interview: every sourceInformation value filled', Object.values(xi.sourceInformation).every(v => typeof v === 'string' && v.trim()));
  const qs = k => { const i = TASK.indexOf('\n' + k + ' Feedback'); return TASK.slice(i).split('\n').slice(1).filter(l => /^- /.test(l.trim())).map(l => l.trim().slice(2).replace(/\s*\(none if nothing\)$/, '').trim()).slice(0, k === 'Engine' ? 6 : 4); };
  const QT = qs('Testing'), QE = qs('Engine'), QP = qs('Prompt');
  t.check('TASK Exit interview: one testing answer per question', xi.testingFeedback.length === QT.length && xi.testingFeedback.every(v => v.trim()), QT.length);
  t.check('TASK Exit interview: one engine answer per question', xi.engineFeedback.length === QE.length && xi.engineFeedback.every(v => v.trim()), QE.length);
  t.check('TASK Exit interview: one prompt answer per question', xi.promptFeedback.length === QP.length && xi.promptFeedback.every(v => v.trim()), QP.length);
  const genres = TASK.match(/"genre": "one of ([^"]+)"/)[1].split(', ').map(s => s.trim());
  t.check('TASK Exit interview: aiHub genre from the list', genres.includes(xi.aiHub.genre), xi.aiHub.genre);
  t.check('TASK Exit interview: aiHub type and players from the list', ['Game', 'Tech demo', 'Tool'].includes(xi.aiHub.type) && ['1', '1–2', '1–4'].includes(xi.aiHub.players));
  t.check('TASK Exit interview: 3 to 6 lowercase tags', xi.aiHub.tags.length >= 3 && xi.aiHub.tags.length <= 6 && xi.aiHub.tags.every(s => s === s.toLowerCase()));
  t.check('TASK Exit interview: the name is the title screen\'s', xi.aiHub.name.toUpperCase().replace(/-/g, ' ') === 'EYE OF THE BOLT HOLDER');
  const fields = TASK.slice(TASK.indexOf('## Source Information'), TASK.indexOf('Exit interview:')).split('\n').filter(l => /^- \w/.test(l)).map(l => l.slice(2).split(':')[0].trim());
  t.check('TASK Source Information: Date as given', xi.sourceInformation.date === TASK.match(/- Date: ([^\n]+)/)[1].trim());
  t.check('TASK Source Information: Model as given', xi.sourceInformation.model === TASK.match(/- Model: ([^\n]+)/)[1].trim());
  // the game, run headless
  const { B, game: G } = await fresh(); G.advance(.5);
  const pages = B.aboutPages(), text = pages.map(p => p.title + '\n' + p.rows.map(r => (r[0] || '') + '\n' + r[1]).join('\n')).join('\n');
  t.check('TASK Source Information: the in-game About has a page for each of the four sections', ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback'].every(s => pages.some(p => p.title === s)) && pages.some(p => p.title === 'Credits'));
  for (const f of fields) t.check(`TASK Source Information: About lists "${f}"`, text.includes(f), f);
  for (const q of QT.concat(QE, QP)) t.check(`TASK feedback: About asks "${q.slice(0, 40)}"`, text.includes(q.replace(/\s+$/, '')), q);
  // Dev Mode from the pause menu, live sliders, reset to defaults
  B.newGame({ seed: 1 }); G.go('play', null, { fade: 0 }); G.advance(.3);
  t.check('TASK Dev Mode: reachable from the pause menu', B.pauseItems().some(i => i[0] === 'Dev Mode'));
  B.Dev.tab = 0; const rows = B.Dev.rows(); t.check('TASK Dev Mode: live sliders and a reset to defaults', rows[0].label === 'Reset to defaults' && rows.filter(r => r.slider).length >= 4 && B.TUNE.length >= 20);
  t.check('TASK Dev Mode: standard testing tools (cheats, warp, party, spawn, debug)', ['Cheats', 'Warp', 'Party', 'Spawn', 'Debug'].every(n => B.Dev.tabs.includes(n)));
  // Attract mode after 10 s on the title, AI-played, any input exits (the attract suite checks each part)
  G.go('title', null, { fade: 0 }); G.advance(10.3); t.check('TASK Attract Mode: 10 s without input on the title starts it', G.sceneName === 'attract' && B.Attract.V.length >= 8);
  G.input.press('KeyQ'); G.advance(1 / 60); G.input.release('KeyQ'); G.advance(.4); t.check('TASK Attract Mode: any input exits it', G.sceneName === 'title');
  // UI and UX: PlayStation glyphs by default with an Xbox option; keys and mouse buttons
  const gl = G.settings.spec('glyphs'); t.check('TASK UI: PlayStation glyphs, with a Settings option for Xbox', gl.value === 'playstation' && gl.options.some(o => o[0] === 'xbox'));
  t.check('TASK UI: the keyboard uses WASD, Q E, F, Space, I, C, M', ['fwd:KeyW', 'strafeL:KeyA', 'turnL:KeyQ', 'use:KeyF', 'strike:Space', 'party:KeyI', 'camp:KeyC', 'map:KeyM'].every(s => { const [a, c] = s.split(':'); return B.KEYS[a].includes(c); }));
  t.check('TASK UI: the DualSense standard mapping (✕ use, □ strike, △ party, Options pause)', B.KEYS.use.includes('Pad0') && B.KEYS.strike.includes('Pad2') && B.KEYS.party.includes('Pad3') && B.KEYS.pause.includes('Pad9'));
  t.check('TASK UI: the mouse uses, strikes and examines in the world', B.MOUSE_ACT.use === 'L' && B.MOUSE_ACT.strike === 'R' && B.MOUSE_ACT.examine === 'M');
  // Touch-only devices
  const T = await fresh({ coarse: true }); T.game.advance(.5);
  t.check('TASK Touch-only: no touch controls, the notice text', T.game.input.touchEnabled === false && T.B.touchOnly() && readFileSync(new URL('../../src/68-ui-shell.js', import.meta.url), 'utf8').includes('Controller or keyboard required.'));
  T.game.advance(10.3); t.check('TASK Touch-only: the attract mode runs', T.game.sceneName === 'attract');
  t.check('TASK Narrative tone: terse second-person messages and capital inscriptions', /^You /.test(B.TXT.m_hidden) || B.TXT.m_click.startsWith('You ') && B.TXT.n2 === B.TXT.n2.toUpperCase());
}
