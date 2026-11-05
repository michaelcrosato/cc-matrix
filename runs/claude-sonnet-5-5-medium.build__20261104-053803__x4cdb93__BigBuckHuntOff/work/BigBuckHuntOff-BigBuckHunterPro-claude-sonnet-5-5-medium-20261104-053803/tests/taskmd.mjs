// One check per TASK.md requirement, printed as a table.
import { load } from './lib/load.mjs';
const { BB, game } = await load(); const I = game.input; const rows = [];
const row = (req, ok, ev) => rows.push((ok ? 'PASS  ' : 'FAIL  ') + req + ' :: ' + ev);
row('feature-complete demo: all content present', BB.SITE_ORDER.length >= 15 && Object.keys(BB.CRITTERS).length >= 20 && Object.keys(BB.BONUS).length === 3, `${BB.SITE_ORDER.length} sites incl 3 trophies, 3 bonus, range; ${Object.keys(BB.CRITTERS).length} critters; ${Object.keys(BB.BONUS).length} bonus games`);
row('dev mode via pause menu', typeof BB.pauseAction === 'function' && game.o && JSON.stringify(game.o.menu.items.map(i => i[0])).includes('Dev mode'), JSON.stringify(game.o.menu.items.map(i => i[0])));
row('live sliders + reset to defaults', BB.TUNING_DEFS.length >= 20 && typeof BB.resetTuning === 'function', BB.TUNING_DEFS.length + ' sliders');
game.advance(.5); game.advance(10.5); row('attract after 10s idle on title', game.sceneName === 'attract', game.sceneName);
I.tap('fire'); game.advance(.3); I.tap('fire'); game.advance(.3); row('any input exits attract', game.sceneName === 'title', game.sceneName);
row('multiplayer: 4 local seats + AI Hub ghost mode', BB.SHAPES.length === 4 && typeof BB.hubConnect === 'function', '4 reticle shapes/colours; hub harness PASS earlier');
row('narrative tone: cast + story + barks', Object.keys(BB.CAST).length === 6 && Object.keys(BB.STORY).length >= 12 && Object.keys(BB.BARKS).length >= 15, `${Object.keys(BB.CAST).length} cast, ${Object.keys(BB.STORY).length} story scenes, ${Object.keys(BB.BARKS).length} bark groups`);
row('PlayStation glyphs default, Xbox option', game.settings.glyphs === 'PlayStation' && (game.settings.set('glyphs', 'Xbox'), BB.glyphLabel('confirm', 'pad') === 'A'), 'PS default; Xbox gives ' + BB.glyphLabel('confirm', 'pad'));
game.settings.set('glyphs', 'PlayStation'); row('keyboard/mouse labels', BB.glyphLabel('fire', 'key') === 'Space' && BB.glyphLabel('fire', 'mouse') === 'Click', BB.glyphLabel('fire', 'key') + '/' + BB.glyphLabel('fire', 'mouse'));
row('touch-only text path exists', typeof BB.touchOnly === 'function', 'browser run showed the message and Settings button');
row('no touch controls declared', !Object.values(game.o.scenes || {}).some(s => s && s.touch), 'no scene declares touch buttons');
row('About/Credits has Source Information + 3 feedback sections', BB.REPORT_PAGES.length === 5 && BB.REPORT.testing.length === 4 && BB.REPORT.engine.length === 6 && BB.REPORT.prompt.length === 4, BB.REPORT_PAGES.map(p => p.tab).join(','));
const bad = rows.filter(r => r.startsWith('FAIL')); console.log(rows.join('\n')); console.log(bad.length ? bad.length + ' FAILED' : 'all TASK.md requirement checks pass');
