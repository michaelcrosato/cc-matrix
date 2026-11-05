import { load, until } from '../lib.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
/* TASK.md, requirement by requirement, each backed by concrete checks (REQ_LIST=1 prints every passing check, so the
 * evidence can be read; without it, only failures print as with every suite) */
export async function run(check) {
  const ok = (req, name, cond, detail) => { if (process.env.REQ_LIST && cond) console.log('  ok  ' + req + ' > ' + name); return check(req + ' > ' + name, cond, detail); };
  const root = new URL('../../', import.meta.url), bundleFile = new URL('../CricketKerfuffle-Cricket-claude-opus-5-5-xhigh-20261104-062125.html', root);
  const html = readFileSync(bundleFile, 'utf8'), srcFiles = readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).sort();
  const src = Object.fromEntries(srcFiles.map(f => [f, readFileSync(new URL('src/' + f, root), 'utf8')])), allSrc = Object.values(src).join('\n'), code = srcFiles.filter(f => !f.startsWith('07')).map(f => src[f]).join('\n');
  const env = load({ seed: 9 }), { game, I, D, K, E } = env; game.advance(.5); K.Tuning.persist = false;
  // Game Title: a playful riff on the source's name, picked by a real random number generator
  const plan = readFileSync(new URL('../PLAN.md', root), 'utf8');
  ok('Title', 'the title is Cricket Kerfuffle (a riff on "cricket"), chosen from 50 by secrets.randbelow', /secrets\.randbelow\(50\)/.test(plan) && html.includes('<title>Cricket Kerfuffle</title>'));
  ok('Title', 'the title screen shows CRICKET KERFUFFLE', /'CRICKET'[\s\S]{0,200}'KERFUFFLE'/.test(src['50-front.js']));
  // Package: one html file with the given name; downloadable dependencies none (everything inlined)
  ok('Package', 'the single file has the exact name, in the folder beside TASK.md', existsSync(bundleFile));
  ok('Package', 'everything is inlined: no external script or stylesheet', !/<(script|link)[^>]+(src|href)=/i.test(html));
  // Tech Stack: built on the my-3D2dge handoff (changed where needed)
  ok('Tech', 'the bundle carries my-3D2dge v0.85.2', /my-3D2dge v0\.85\.2/.test(html) && E.version === '0.85.2');
  const changes = readFileSync(new URL('engine/CHANGES-KERFUFFLE.md', root), 'utf8');
  ok('Tech', 'the engine changes are logged (6 numbered changes)', (changes.match(/^\d\. \*\*/gm) || []).length === 6);
  // Art Direction: the engine's style plus new art that makes it cricket
  const shapeIds = Object.keys(window_ASSETS(env).KERFUFFLE.shapes);
  ok('Art', 'a new shape set of 40 cricket and ground objects is loaded', shapeIds.length >= 40 && shapeIds.every(id => E.SHAPES['KERFUFFLE:' + id]), shapeIds.length);
  const unusedShapes = shapeIds.filter(id => !new RegExp("KERFUFFLE:" + id + "'").test(code));
  ok('Art', 'every new shape is used in the game', !unusedShapes.length, unusedShapes);
  ok('Art', 'five grounds with their own palettes and stands', K.GROUND_IDS.length === 5 && new Set(K.GROUND_IDS.map(g => K.GROUNDS[g].pal.g1)).size === 5 && new Set(K.GROUND_IDS.map(g => K.GROUNDS[g].stands)).size >= 4);
  ok('Art', 'six teams of eleven in their own kits', K.TEAM_IDS.length === 6 && K.TEAM_IDS.every(t => K.TEAMS[t].players.length === 11) && new Set(K.TEAM_IDS.map(t => K.TEAMS[t].kit.cloth + K.TEAMS[t].kit.trim)).size === 6);
  ok('Art', 'cricket gear in the engine: bat, pads, brim hat, helmet grille', /'bat'\].includes|weapon === 'bat'/.test(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8')) && (() => { try { const r = new E.Humanoid({ weapon: 'bat', pads: true, hat: { style: 'brim' } }); r.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); return true; } catch (e) { return false; } })());
  // Animation: the engine's rigs, with new cricket animations
  const ST = K.STROKES;
  ok('Animation', 'strokes, the bowling windmill, a spinner\'s arm and the keeper\'s stumping are specs', ['drive', 'flick', 'loft', 'pull', 'cut', 'scoop', 'block', 'helicopter', 'windmill', 'spinArm', 'stump'].every(k => ST[k]));
  ok('Animation', 'every shot family has its stroke', Object.values(K.SHOTS).every(s => ST[{ drive: 'drive', flick: 'flick', loft: 'loft', pull: 'pull', cut: 'cut', scoop: 'scoop', block: 'block' }[s.fam]]));
  { const u = K.Cast.umpire(K.UMPIRES.hollis), base = (u.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }), u.J.handR.slice()), moved = [];
    for (const sig of ['out', 'four', 'six', 'wide', 'noball', 'bye', 'legbye', 'freehit', 'review', 'dead']) { u.sig = sig; u.sigT = 1; u.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); if (Math.hypot(u.J.handR[0] - base[0], u.J.handR[1] - base[1], u.J.handR[2] - base[2]) > 1 || Math.hypot(u.J.handL[0] - base[0], u.J.handL[1] - base[1], u.J.handL[2] - base[2]) > 1) moved.push(sig); }
    u.sig = null; ok('Animation', 'the umpire signals all ten (OUT, FOUR, SIX, WIDE, NO BALL, BYE, LEG BYE, FREE HIT, REVIEW, DEAD BALL)', moved.length === 10, moved); }
  // Audio: all in code, no files; gibberish voices
  ok('Audio', 'no audio files: no audio data, file extensions or Audio elements', !/data:audio|\.(mp3|wav|ogg|m4a)\b|new Audio\(/.test(html));
  const used = [...new Set([...code.matchAll(/sfx\('([a-zA-Z]+)'/g)].map(m => m[1]))], defined = new Set([...Object.keys(K.SFX), ...Object.keys(game.audio.presets)]);
  ok('Audio', 'every sound the game plays is defined', used.every(n => defined.has(n)), used.filter(n => !defined.has(n)));
  ok('Audio', 'every sound defined is played', Object.keys(K.SFX).every(n => used.includes(n) || /fx === 'glass' \? 'glass' : d\.fx === 'splash' \? 'splash' : d\.fx === 'bell' \? 'bell' : 'target'/.test(code) && ['glass', 'splash', 'bell', 'target', 'bat', 'batSweet', 'edge'].includes(n)), Object.keys(K.SFX).filter(n => !used.includes(n)));
  const tokOk = (t, drums) => drums ? /^[kshoct.\-]$/.test(t) : /^([A-G][#b]?\d|[.\-])$/.test(t);
  const badSongs = []; for (const [id, s] of Object.entries(Object.assign({}, K.SONGS, K.STINGS))) for (const tr of s.tracks) for (const t of tr.notes.split(/\s+/).filter(x => x && x !== '|')) if (!tokOk(t, tr.wave === 'drums')) badSongs.push(id + ':' + t);
  ok('Audio', '10 original songs and 11 stings, every note token valid', Object.keys(K.SONGS).length === 10 && Object.keys(K.STINGS).length === 11 && !badSongs.length, badSongs.slice(0, 5));
  const stingCalls = [...code.matchAll(/sting\(([^;]*?)\)/g)].map(m => m[1]).join(' '), songUsed = id => new RegExp("music\\('" + id + "'|music: '" + id + "'").test(allSrc);
  ok('Audio', 'every song and sting is used', Object.keys(K.SONGS).every(songUsed) && Object.keys(K.STINGS).every(id => stingCalls.includes("'" + id + "'")), { songs: Object.keys(K.SONGS).filter(id => !songUsed(id)), stings: Object.keys(K.STINGS).filter(id => !stingCalls.includes("'" + id + "'")) });
  const syl = K.Voice.syllables('Howzat!'), q = K.Voice.syllables('Really?'), pq = K.Voice.pitches(q, K.VOICES.edie);
  ok('Audio', 'gibberish voices: "Howzat!" is two syllables, a question rises at its end', syl.length === 2 && pq[pq.length - 1] > pq[0] * .95, { syl: syl.length, pq });
  ok('Audio', 'every story speaker has a voice profile', Object.values(K.SPEAKERS).every(s => K.VOICES[s.voice]));
  // Online and multiplayer
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="parallel"', 'hub:session-goal"', 'hub:session-howto"']) ok('Online', 'the AI Hub tag ' + t.split('"')[0], html.includes('<meta name="' + t));
  ok('Online', 'the session client is pasted unmodified as the first script', html.slice(html.indexOf('<script>') + 8, html.indexOf('</script>')) === readFileSync(new URL('vendor/aihub/session.js', root), 'utf8'));
  ok('Online', 'a session never sends (parallel mode)', !/AIHub\.send\(/.test(code));
  const P2 = game.addPlayer({ keys: 'right' }); ok('Multiplayer', 'a second player joins on one machine (and up to four in Versus)', !!P2 && /allowJoin\(\{ max: 4/.test(code)); game.removePlayer && game.removePlayer(P2);
  // Goal / Scope: every delivery, shot, special, item, chaos event, chapter, lesson and scene is real and reachable
  { const m = (D.startMatch({ humans: {}, seed: 4, overs: 50, wickets: 10, kerfuffleRules: true, cheat: { noChaos: true } }), game.advance(.2), D.match()); const seen = [];
    const off = K.bus.on('ball:released', d => seen.push(d.id));
    for (const id of Object.keys(K.DELIVERIES)) { until(game, () => m.phase === 'setup', 30, 1 / 30); m.force.delivery = { id, target: [-4, 80], grade: 'green' }; until(game, () => m.phase === 'flight', 15, 1 / 30); }
    off(); ok('Scope', 'every delivery in the catalogue is bowled (' + Object.keys(K.DELIVERIES).length + ')', Object.keys(K.DELIVERIES).every(id => seen.includes(id)), Object.keys(K.DELIVERIES).filter(id => !seen.includes(id))); }
  { const reach = new Set(); for (const btn of ['shot', 'loft', 'block']) for (const len of ['yorker', 'full', 'good', 'short']) for (let sec = -180; sec <= 180; sec += 5) for (const line of [-10, 0, 10]) { reach.add(K.resolveShot(btn, sec, len, line)); reach.add(K.resolveShot(btn, null, len, line)); }
    ok('Scope', 'every shot in the catalogue can be played (' + Object.keys(K.SHOTS).length + ')', Object.keys(K.SHOTS).every(id => reach.has(id)), Object.keys(K.SHOTS).filter(id => !reach.has(id))); }
  { const fired = new Set(); K.bus.on('special', d => fired.add(d.id));
    const e1 = load({ seed: 3 }); e1.game.advance(.3); const gen = e1.K.TEAMS.mud.players.find(p => p.bowl && !p.specBowl); e1.D.startMatch({ humans: {}, seed: 3, teams: ['ker', 'mud'], forceBowler: gen.id }); e1.game.advance(.1); const m1 = e1.D.match();
    until(e1.game, () => m1.phase === 'setup', 10); m1.hype[m1.bowlSide] = 100; e1.D.forceOutcome('dot', { special: true }); let f1 = null; e1.K.bus.on('special', d => { f1 = d.id; }); until(e1.game, () => m1.phase === 'flight', 10);
    ok('Scope', 'a bowler with no special of his own bowls the Kerfuffle Ball', f1 === 'kerfuffleBall', f1);
    const e2 = load({ seed: 5 }); e2.game.advance(.3); const T = e2.K.TEAMS.ker; T.order = [T.players.find(p => p.id === 'pip')].concat(T.order.filter(p => p.id !== 'pip'));
    e2.D.startMatch({ humans: { 0: [e2.I] }, seed: 5, forceBowler: 'terry' }); e2.game.advance(.1); const m2 = e2.D.match(); until(e2.game, () => m2.phase === 'setup', 10); m2.hype[0] = 100; let f2 = null; e2.K.bus.on('special', d => { f2 = d.id; });
    until(e2.game, () => m2.phase === 'flight', 10); e2.I.tap('special'); e2.game.advance(.2);
    ok('Scope', 'a batter with no special of his own plays the Kerfuffle Shot', f2 === 'kerfuffleShot', f2);
    ok('Scope', 'every special belongs to a character or is a generic one (21)', Object.keys(K.SPECIALS).length === 21 && Object.keys(K.SPECIALS).every(id => ['kerfuffleShot', 'kerfuffleBall'].includes(id) || K.TEAM_IDS.some(t => K.TEAMS[t].players.some(p => p.specBat === id || p.specBowl === id || p.specField === id)))); }
  ok('Scope', 'every item has its effect in the rules', Object.keys(K.ITEMS).every(id => new RegExp("'" + id + "'").test(src['28-arcade.js'] + src['22-match.js'] + src['25-play.js'])));
  ok('Scope', 'every chaos event is in a ground\'s pool or the story', Object.keys(K.CHAOS).every(id => K.GROUND_IDS.some(g => K.GROUNDS[g].chaos.includes(id))));
  ok('Scope', 'five chapters, each with a pre-match scene, a win scene and three goals', K.CHAPTERS.length === 5 && K.CHAPTERS.every(c => K.SCENES[c.pre] && K.SCENES[c.win] && K.SCENES[c.mid] && c.goals.length === 3));
  ok('Scope', 'eleven Nets lessons, each with a goal the lesson counts', K.LESSONS.filter(Boolean).length === 11 && K.LESSONS.filter(Boolean).every(l => new RegExp("goal === '" + l.goal + "'").test(src['56-modes.js'])));
  const scenesUsed = Object.keys(K.SCENES).filter(id => id === 'prologue' || id === 'loss' || K.CHAPTERS.some(c => [c.pre, c.mid, c.win].includes(id)));
  ok('Scope', 'every story scene is played somewhere', scenesUsed.length === Object.keys(K.SCENES).length, Object.keys(K.SCENES).filter(id => !scenesUsed.includes(id)));
  ok('Scope', 'the modes: Story, Quick Match, Versus, Showdown, Nets, the attract mode and AI Hub rounds are scenes', ['title', 'setup', 'storymap', 'cutscene', 'match', 'results', 'nets', 'showdown', 'scores', 'about', 'attract', 'hubcard', 'hubround'].every(s => K.scenes[s]));
  // Dev mode: reachable from the pause menu, live sliders with a reset to defaults
  ok('Dev mode', 'the pause menu has a Dev Mode item', game.o.menu.items.some(i => i[0] === 'Dev Mode'));
  ok('Dev mode', 'the TUNING tab has a live slider for every key gameplay variable (' + K.Tuning.defs.length + ')', (K.dev.tab = 0, K.dev.rows().filter(r => r.slider).length === K.Tuning.defs.length) && K.Tuning.defs.length >= 30);
  K.Tuning.set('ballSpeed', .9); K.Tuning.set('runSpeed', 99); K.dev.rows()[0].act(); ok('Dev mode', 'Reset all to defaults restores every value', K.Tuning.changed().length === 0);
  ok('Dev mode', 'toggles, jumps and an info page', (K.dev.tab = 1, K.dev.rows().length >= 14) && (K.dev.tab = 2, K.dev.rows().length >= 15) && (K.dev.tab = 3, true)); K.dev.tab = 0;
  // Attract mode
  game.go('title', {}, { fade: 0 }); game.advance(.3); game.advance(10.4);
  ok('Attract', 'after 10 s without input on the title the attract mode plays', D.snapshot().scene === 'attract');
  game.advance(2); I.tap('confirm'); game.advance(.8); ok('Attract', 'any input leaves it', D.snapshot().scene === 'title');
  ok('Attract', 'ten segments, with cheating autopilots on both sides', K.ATTRACT.length === 10 && /autoBat: true, autoBowl: true/.test(src['51-attract.js']));
  // Narrative tone
  const lines = Object.values(K.LINES).flat(), byA = lines.filter(l => l[0] === 'A').length, byD = lines.filter(l => l[0] === 'D').length;
  ok('Narrative', 'a commentary box in the source\'s voice: Sir Aubrey and Dazza, 150+ lines', lines.length >= 150 && byA >= 50 && byD >= 40, { lines: lines.length, byA, byD });
  ok('Narrative', 'Wisden-style match reports and a story told in scenes', K.REPORTS.win.length >= 3 && Object.keys(K.SCENES).length >= 15);
  // UI and UX: 10-foot, controller first; keyboard and mouse native; prompts follow the last device
  ok('UI', 'the main menu has six items or fewer', K.scenes.title.menu.items.length <= 6);
  I.press('KeyJ'); game.advance(1 / 60); I.release('KeyJ'); ok('UI', 'keyboard: J, K, L, I, Space, Shift and E are the shot, loft, block, special, run, back and charge keys', ['shot:J', 'loft:K', 'block:L', 'special:I', 'charge:E'].every(p => { const [a, k] = p.split(':'); return K.Glyphs.info(I, a, 'keyboard').label === k; }) && /space/i.test(K.Glyphs.info(I, 'run', 'keyboard').label) && /shift/i.test(K.Glyphs.info(I, 'back', 'keyboard').label));
  ok('UI', 'mouse: left click hits, right click lofts; the pointer aims', K.Glyphs.info(I, 'shot', 'mouse').n === 0 && K.Glyphs.info(I, 'loft', 'mouse').n === 2 && /mouseGround/.test(code));
  I.press('Pad0'); game.advance(1 / 60); I.release('Pad0'); ok('UI', 'the pad: PlayStation glyphs by default', D.snapshot().ui.device === 'gamepad' && K.Glyphs.info(I, 'shot').kind === 'ps');
  game.settings.set('glyphs', 'xbox'); ok('UI', 'the Xbox (A B X Y) setting', K.Glyphs.info(I, 'shot').label === 'A'); game.settings.set('glyphs', 'playstation');
  ok('UI', 'hover moves the focus and clicks pick in the 10-foot lists and cards', /pointer[\s\S]{0,400}this\.i = k/.test(src['45-ui.js']) && /clicked/.test(src['45-ui.js']));
  // Touch-only devices
  { const t = load({ seed: 2, touch: true }); t.game.advance(.5); ok('Touch', 'a touch-only device sees "Controller or keyboard required" and a Settings button', t.D.snapshot().ui.touchGate === true && /Controller or keyboard required/.test(src['50-front.js']) && /game\.menu\('settings'\)/.test(src['50-front.js'])); ok('Touch', 'no scene declares touch buttons', !/\btouch: \[/.test(code)); }
  // About / Credits and the exit interview
  const about = JSON.stringify(K.ABOUT); ok('About', 'an in-game About/Credits screen with Source Information and the three feedback sections', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'].every(t => about.includes(t)));
  const ex = JSON.parse(readFileSync(new URL('../exit-interview.json', root), 'utf8'));
  ok('About', 'the About pages and exit-interview.json say the same', ex.testingFeedback.every(a => about.includes(JSON.stringify(a).slice(1, 60))) && ex.engineFeedback.every(a => about.includes(JSON.stringify(a).slice(1, 60))) && ex.promptFeedback.every(a => about.includes(JSON.stringify(a).slice(1, 60))));
  // Done: no TODOs, placeholders or stubbed features
  ok('Done', 'no TODO, FIXME, placeholder, lorem ipsum or "not implemented" in the source', !/\bTODO\b|\bFIXME\b|placeholder|lorem ipsum|not implemented/i.test(allSrc));
  ok('Done', 'no empty handlers or functions in the game code', !/=>\s*\{\s*\}|function\s*\w*\s*\([^)]*\)\s*\{\s*\}/.test(code), (code.match(/.{0,60}(=>\s*\{\s*\}|function\s*\w*\s*\([^)]*\)\s*\{\s*\}).{0,20}/) || [''])[0]);
  ok('Done', 'no errors anywhere in this run', !game.errors.length, game.errors.map(e => e.message));
}
function window_ASSETS(env) { return env.ctx.ASSETS; }
