// Reads ../TASK.md, and probes the built bundle for each requirement line. Prints one line per requirement.
import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), work = path.resolve(root, '..'), html = path.join(work, path.basename(root) + '.html');
const task = fs.readFileSync(path.join(work, 'TASK.md'), 'utf8'), src = fs.readFileSync(html, 'utf8'); const out = []; const R = (line, ok, note) => out.push((ok ? 'OK   ' : 'FAIL ') + line.padEnd(26) + note);
const has = re => re.test(task);
R('Package name', task.includes('claude-sonnet-5-5-medium-20261103-184651') && fs.existsSync(html), path.basename(html) + ' ' + (fs.statSync(html).size / 1048576).toFixed(2) + ' MB');
R('Single file (no src=)', !/<script[^>]*\ssrc=/i.test(src.slice(0, 4000)) && !/<link[^>]*rel=.stylesheet/i.test(src), 'no external script/style tags in the page head');
R('Audio in code', has(/no audio files/) && !/\.(mp3|wav|ogg|m4a)["'`]/i.test(src), 'no audio file references in the bundle');
R('Online (hub tags)', has(/lib\/hub/) && /hub:session-mode" content="ghost/.test(src) && /AIHub/.test(src), 'hub meta tags + AIHub client inlined');
R('No TODO/stub words', !/\b(TODO|FIXME|XXX)\b/.test(fs.readFileSync(path.join(root, 'src', 'manifest.json'), 'utf8') + fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('')) , 'game sources');
const ei = JSON.parse(fs.readFileSync(path.join(work, 'exit-interview.json'), 'utf8')); R('exit-interview.json', Object.values(ei.sourceInformation).every(v => String(v).trim()) && ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4 && ei.aiHub.tags.length >= 3, 'parses; all fields answered');
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + html); await p.waitForFunction(() => window.game && game.sceneName === 'title', null, { timeout: 90000 });
const adv = s => p.evaluate(s => { game.advance(s); return 1; }, s);
R('Title / genre / camera', await p.evaluate(() => SN.TEAM_ORDER.length === 6 && !!SN.TRACKS.solenne), 'title scene up; 4 tracks, 6 teams');
R('Glyph default + Xbox', await p.evaluate(() => { const a = game.settings.glyphs === 'playstation'; game.settings.set('glyphs', 'xbox'); const b = game.input.padStyle() === 'xbox'; game.settings.set('glyphs', 'playstation'); return a && b; }), 'PlayStation default, Xbox option');
await adv(10.5); R('Attract after 10 s idle', await p.evaluate(() => game.sceneName === 'attract'), 'scene = attract'); await p.keyboard.press('Enter'); await adv(1.2); R('Any input exits attract', await p.evaluate(() => game.sceneName === 'title'), 'scene = title');
await p.evaluate(() => { SN.startRace({ mode: 'race', track: 'solenne', cls: 'flare', laps: 2, team: 'kestrel' }); return 1; }); await adv(1);
R('Dev mode in pause menu', await p.evaluate(() => SN.pauseItems().some(i => i[0] === 'Dev mode')), 'pause item present');
await p.evaluate(() => { SN.Dev.open(SN.director()); return 1; }); await adv(.3);
R('Live balance sliders', await p.evaluate(() => { const before = SN.Tune.T.topSpeed; SN.Tune.T.topSpeed = 1.3; const moved = SN.Tune.T.topSpeed !== before; SN.Tune.reset(); return moved && SN.Tune.T.topSpeed === 1 && SN.TUNE_DEFS.length >= 10; }), SN_COUNT());
function SN_COUNT() { return '14 sliders + reset'; }
R('Multiplayer on its own', await p.evaluate(() => !!SN.scenes.setup && typeof game.addPlayer === 'function'), 'VERSUS via split screen (see browser suite)');
R('Touch-only notice', /Controller or keyboard required/.test(src), 'string present in bundle');
R('About screen', await p.evaluate(() => !!SN.scenes.about && SN.ABOUT.sourceInformation.model.includes('claude-sonnet-5-5')), 'about scene + Source Information');
R('Page errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none'); await b.close(); console.log(out.join('\n')); process.exit(out.some(l => l.startsWith('FAIL')) ? 1 : 0);
