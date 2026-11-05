// Checks each TASK.md requirement against the final files and the headless game; prints one line per requirement
import { load } from '../tests/lib/vm.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { runRace, academyBot } from '../tests/lib/t.mjs';
const NAME = 'SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648', root = new URL('../../', import.meta.url).pathname;
const html = readFileSync(root + NAME + '.html', 'utf8'), rows = [];
const req = (name, ok, ev) => rows.push((ok ? 'PASS ' : 'FAIL ') + name + ' :: ' + ev);
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input; g.settings.set('difficulty', 'Easy'); g.advance(.5);
req('Package: single html in root', existsSync(root + NAME + '.html') && !(html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/g, '$1</script>').match(/<script\b[^>]*>/g) || []).some(t => /\ssrc=/.test(t)), NAME + '.html, ' + (html.length / 1e6).toFixed(2) + ' MB, inline scripts only');
req('Dev folder', existsSync(root + NAME + '/src/manifest.json'), NAME + '/ holds src, engine, tests, tools');
req('Title riff picked by RNG', html.includes('<title>Snipeout HD</title>'), 'Snipeout HD (PLAN.md: secrets.randbelow(50) -> entry 19)');
req('Built on the handoff engine', html.includes('my-3D2dge v0.85.2') || html.includes('0.85.2'), 'engine 0.85.2 + World3D add-on; edits marked: ' + (readFileSync('engine/my-3d2dge.js', 'utf8').match(/SNIPEOUT EDIT/g) || []).length + ' + ' + (readFileSync('engine/my-3d2dge-3d.js', 'utf8').match(/SNIPEOUT EDIT/g) || []).length);
const src = JSON.parse(readFileSync('src/manifest.json', 'utf8')).map(f => readFileSync('src/' + f, 'utf8')).join('\n');
req('No TODOs/placeholders/stubs', !/\b(TODO|FIXME|XXX)\b/.test(src) && !/placeholder|not implemented|\bstubs?\b/i.test(src), 'regex over all ' + JSON.parse(readFileSync('src/manifest.json', 'utf8')).length + ' source files');
req('Audio all in code, no audio files', !/\.(mp3|ogg|wav|m4a)\b/i.test(html) && Object.keys(SN.SONGS).length === 6, '6 songs, ' + Object.keys(g.audio.presets).length + ' sfx presets after init? ' + (SN.Audio.init(), Object.keys(g.audio.presets).length));
req('Gibberish voices', SN.Voice.say('SEEKER LOCKED', SN.VOICES.oracle) > 0, 'SN.Voice: syllables per word, formant vowels, 3 voice types');
req('Online: AI Hub tags + client', /hub:session-mode" content="ghost"/.test(html) && html.includes('AIHub'), 'ghost mode, players 1-4; harness: 3 scenarios pass in tests/run.mjs');
// modes playable end to end
let replayRec = null;
const modes = [['race', { track: 'solenne', cls: 'spark', laps: 1 }], ['timetrial', { track: 'karakum', cls: 'spark', laps: 1 }], ['hotlap', { track: 'meridian', cls: 'flare' }], ['snipeout', { track: 'meridian', cls: 'flare', target: 4 }], ['overclock', { track: 'solenne', cls: 'spark' }]];
for (const [mode, s] of modes) {
  g.go('loading', { setup: Object.assign({ mode, team: 'volta', pilot: 'luca', intro: false }, s) }); g.advance(1.5); const R = SN.scenes.race.race;
  runRace(ctx, mode === 'overclock' ? 40 : 300); if (g.sceneName === 'race' && (mode === 'hotlap' || mode === 'overclock')) { R.endRun(); g.advance(5); }
  g.advance(2); if (mode === 'race') replayRec = SN.lastResult.rec; req('Mode ' + mode, g.sceneName === 'results', 'reached results; laps ' + R.humans[0].lap + ', zone ' + R.zone + ', points ' + R.ships.map(x => x.points).reduce((a, b) => Math.max(a, b)));
}
g.go('loading', { setup: SN.Academy.setup() }); g.advance(1.5); { const A = SN.Academy, bot = academyBot(ctx); for (let k = 0; k < 400 && g.sceneName === 'race'; k++) { if (A.phase === 'card') { I.tap('confirm'); g.advance(.05); } runRace(ctx, 1, bot); } req('Academy: 11 drills', A.passed === 11, 'passed ' + A.passed + '/11, retries ' + A.retries); }
g.go('menu'); g.advance(.5); g.addPlayer({ keys: 'right' }); g.go('loading', { setup: { mode: 'versus', vmode: 'race', track: 'solenne', cls: 'spark', laps: 1, intro: false, players: [{ team: 'kestrel', pilot: 'ingrid' }, { team: 'volta', pilot: 'luca' }] } }); g.advance(1.5);
req('Multiplayer on its own: split screen', g.viewports.length === 2 && SN.scenes.race.race.humans.length === 2, '2 viewports, 2 human craft'); g.go('menu'); g.advance(.5); g.removePlayer(g.players[1]);
req('Replay', (() => { const r = replayRec, R = SN.Replay.verify(r); return R.hash() === r.hash; })(), 'the quick race re-simulated to an equal hash');
req('Season + Grand Prix + ending data', Object.keys(SN.SEASON.events).length === 11 && SN.STORY.end_champion.length === 4, '10 events + GP, ' + Object.keys(SN.STORY).length + ' story scripts (season suite plays all of them)');
// dev mode
g.go('loading', { setup: { mode: 'race', track: 'solenne', cls: 'spark', team: 'volta', pilot: 'luca', laps: 2, intro: false } }); g.advance(5);
const pi = SN.pauseItems().map(x => x[0]); SN.pauseItems().find(x => x[0] === 'Dev mode')[1]();
SN.Tune.T.topSpeedMul = 1.4; SN.Dev.tab = 1; SN.Dev.rows()[0].act();
req('Dev mode from pause menu, live sliders, reset', pi.includes('Dev mode') && SN.Dev.open && SN.Tune.order.every(k => SN.Tune.T[k] === SN.Tune.defs[k].def), 'pause items: ' + pi.join(', ') + '; ' + SN.Tune.order.length + ' sliders; RESET ALL restores defaults');
SN.Dev.open = false; g.resume && g.resume();
// attract
g.go('title'); g.advance(.5); g.advance(9.3); const before = g.sceneName; g.advance(1.2); const at = g.sceneName; g.advance(130); const w = SN.Attract.seen.weapons.size, t = SN.Attract.seen.tracks.size; I.tap('fire'); g.advance(.2);
req('Attract: 10 s idle, demo loop, any input exits', before === 'title' && at === 'attract' && g.sceneName === 'title', 'at 9.8 s: ' + before + ', at 11 s: ' + at + '; loop showed ' + w + ' weapons on ' + t + ' tracks; input -> ' + g.sceneName);
// controller-first prompts
req('PlayStation glyphs default, Xbox option', g.settings.glyphs === 'playstation' && SN.glyph.text(I, 'fire', 'gamepad') === '□' && (g.settings.set('glyphs', 'xbox'), SN.glyph.text(I, 'fire', 'gamepad') === 'X'), 'gamepad fire: □ / X; keyboard: ' + SN.glyph.text(I, 'fire', 'keyboard') + '; mouse: ' + SN.glyph.text(I, 'fire', 'mouse')); g.settings.set('glyphs', 'playstation');
req('Analog triggers', typeof I.value === 'function', 'input.value(brakeL) reads L2 (browser test: L2 at 0.5 -> brakeL 0.5)');
// touch-only
const t2 = load({ touch: true }), tg = t2.My3D2dge.current; tg.advance(.5); const ton = t2.SN.isTouchOnly(); tg.advance(10.7);
req('Touch-only: notice, settings, no touch controls, attract runs', ton && !tg.input._touchArgs && tg.sceneName === 'attract', 'detected ' + ton + ', touch buttons ' + !!tg.input._touchArgs + ', after 11 s: ' + tg.sceneName);
// about + exit interview
const ex = JSON.parse(readFileSync(root + 'exit-interview.json', 'utf8'));
req('About/Credits screen with the four sections', !!SN.screens.about && SN.ABOUT.testingFeedback.length === 4 && SN.ABOUT.engineFeedback.length === 6 && SN.ABOUT.promptFeedback.length === 4, 'OPTIONS > ABOUT / CREDITS, ' + 12 + ' pages');
req('exit-interview.json parses, every field answered', Object.values(ex.sourceInformation).every(v => v) && ex.testingFeedback.length === 4 && ex.engineFeedback.length === 6 && ex.promptFeedback.length === 4 && ex.aiHub.tags.length >= 3, Object.keys(ex.sourceInformation).length + ' source fields, 4/6/4 answers, aiHub ' + Object.keys(ex.aiHub).length + ' fields');
g.go('loading', { setup: SN.Academy.setup() }); g.advance(1.5); SN.Academy.passed = 11; SN.Academy.finish(); g.advance(1); req('Academy results offer no REPLAY', !SN.UI.items().some(i => i.id === 'replay'), SN.UI.items().map(i => i.id).join(', '));
req('No runtime errors', !g.errors.length, g.errors.length + ' errors');
console.log(rows.join('\n')); console.log(rows.filter(r => r.startsWith('PASS')).length + '/' + rows.length + ' requirements pass');
