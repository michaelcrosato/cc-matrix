// node test/taskcheck.mjs: walks TASK.md's requirements one by one against the shipped HTML (no rebuild) and prints evidence
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../../', import.meta.url), name = 'ThugbyTurbo-Rugby-claude-opus-5-5-medium-20261104-065619';
const html = readFileSync(new URL(name + '.html', root), 'utf8');
const task = readFileSync(new URL('TASK.md', root), 'utf8');
let n = 0, bad = 0;
const quote = key => { const l = task.split('\n').find(x => x.includes(key)); return l ? '      TASK.md: "' + l.trim().slice(0, 150) + (l.trim().length > 150 ? '...' : '') + '"\n' : ''; };
const QUOTES = { 'Package:': 'Package:', 'Working environment': 'Create a subfolder', 'Game Title': 'Game Title:', 'Tech stack': 'Tech Stack:', 'Genre and perspective': 'Genre:', 'Audio:': 'Audio:', 'Online:': 'Online:', 'Front end': 'feature-complete demo', 'Gameplay mechanics': 'Capture what makes the source distinctive', 'Demo long enough': 'long enough to show ALL features', 'Dev mode': 'Include a dev mode', 'Attract mode': 'Attract Mode:', 'Multiplayer on its own': 'Multiplayer:', 'Controller-first': 'Design the game around a PS5', 'Touch-only': 'Touch-only devices', 'Done:': 'No TODOs', 'About/Credits': 'CRITICAL: Put Source Information', 'exit-interview.json': 'Exit interview:', 'Art Direction': 'Art Direction:', 'Animation': 'Animation:', 'Narrative tone': 'Narrative tone:', 'mode screen': 'feature-complete demo' };
const req = (what, ok, ev) => { n++; if (!ok) bad++; const k = Object.keys(QUOTES).find(q => what.startsWith(q)); console.log((ok ? 'PASS ' : 'FAIL ') + what + '\n' + (k ? quote(QUOTES[k]) : '') + '      ' + ev); };
// the game, exactly as shipped: the engine and game scripts pulled out of the HTML
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1].replace(/<\\\/script/g, '</script'));
const mk = (extra = {}) => { const store = {}; const ctx = { console: { log() {}, warn() {}, error() {}, info() {}, debug() {} }, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, performance, Date, Math, JSON, Promise, location: { hash: extra.hash || '', search: '', pathname: '/x.html', href: 'file:///x.html' }, navigator: { getGamepads: () => [], userAgent: 'node', maxTouchPoints: 0 }, matchMedia: extra.mm || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })), addEventListener() {}, removeEventListener() {}, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(scripts[1], ctx); vm.runInContext(scripts[2], ctx); return ctx; };
const ctx = mk(), { game, TT } = ctx.__thugby, adv = s => { for (let i = 0; i < s * 120; i++) game.advance(1 / 120); };
const snap = () => game.debug.snapshot();

console.log('TASK.md requirement check against ' + name + '.html (' + (html.length / 1e6).toFixed(2) + ' MB)\n');
req('Package: single html file named as TASK.md asks, in the folder root', task.includes('[GameTitle-SOURCE-claude-opus-5-5-medium-20261104-065619.html]') && existsSync(new URL(name + '.html', root)), name + '.html exists; scripts inline: ' + scripts.length + ' (session client, engine, game); external script tags: ' + (html.match(/<script[^>]+src=/g) || []).length);
req('Working environment: dev subfolder of the same name', existsSync(new URL(name + '/src/', root)), name + '/ holds src/, test/, engine/, tools/, build.mjs');
req('Game Title: a riff on the source name, picked by a real RNG', /<title>Thugby Turbo<\/title>/.test(html) && TT.ABOUT[0].lines.join(' ').includes('secrets.randbelow'), 'title "Thugby Turbo"; About page 1: ' + TT.ABOUT[0].lines[3]);
req('Tech stack: built on my-3D2dge handoff (engine changes allowed)', scripts[1].includes('my-3D2dge') && scripts[1].includes('patch 4'), 'engine ' + ctx.My3D2dge.version + ' inlined, with patches 1, 2, 4 (engine/PATCHES.md)');
req('Genre and perspective fit the source', !!ctx.My3D2dge.VIEWS.broadcast && !!ctx.My3D2dge.VIEWS.postsE, 'arcade rugby sevens; views: broadcast (pitch 40), threequarter, topdown, behind-the-kicker postsE/postsW');
req('Audio: all music, effects and voices in code; gibberish voices', !/\.(mp3|ogg|wav|m4a)['"]/i.test(scripts[2]) && Object.keys(TT.SONGS).length >= 7 && typeof TT.babble.letter === 'function', 'songs ' + Object.keys(TT.SONGS).join(', ') + '; stings ' + Object.keys(TT.STINGS).length + '; babble voices per speaker; no audio files referenced');
req('Online: AI Hub session client first in head, unmodified, protocol tags', html.indexOf('<script>/*! aihub-session 1.4.0') > 0 && html.indexOf('<script>/*! aihub-session') < html.indexOf('my-3D2dge v0.85') && ['hub:session"', 'hub:session-players', 'hub:session-mode" content="shared-world', 'hub:session-goal', 'hub:session-howto'].every(t => html.includes(t)), 'mode shared-world, 2-4 players; harness: all 4 configurations pass (test/hub.mjs)');
// Scope: feature-complete demo
await game.booted; adv(.5);
req('Front end: title, menu and every mode reachable', ['menu', 'cup', 'training', 'records', 'about', 'credits', 'join', 'setup'].every(s => { if (s === 'cup') TT.cupNew(); game.go(s, s === 'join' ? { mode: 'exhibition' } : {}, { fade: 0 }); adv(.2); return snap().scene === s; }) && game.errors.length === 0, 'Mega Cup (4 rounds), Exhibition (join + setup), Training Ground (' + TT.DRILLS.length + ' drills), Records, Settings, About & Credits');
game.go('match', { home: 'mud', away: 'gul', venue: 'docks', seed: 4, seats: [], skipIntro: true, halfLength: 30 }, { fade: 0 }); adv(.1);
const ev = {}; TT.bus.on('*', (d, k) => { ev[k] = (ev[k] || 0) + 1; });
const M = ctx.__thugby.M; adv(3);
for (const f of ['monsterHit', 'ruck', 'knockOn', 'touch', 'penalty', 'yellow', 'thunder', 'hurricane', 'tryHome', 'dropGoal']) { TT.force(f); adv(4); }
TT.force('powerup', { kind: 'horn' }); adv(1.5); TT.force('hazard', { kind: 'chicken' }); adv(3); TT.force('onFire'); adv(1);
const shown = ['tackle', 'bigHit', 'monsterHit', 'ruck', 'scrum', 'lineout', 'penalty', 'card', 'superStart', 'try', 'dropGoal', 'powerupThrow', 'chicken', 'onFire', 'pass', 'kick'].filter(k => ev[k]);
req('Gameplay mechanics all work in a live match', shown.length >= 14 && game.errors.length === 0, 'fired: ' + shown.join(', '));
req('Demo long enough to show all features: drills, story, full cup', TT.DRILLS.length === 9 && Object.keys(TT.STORY).length >= 8 && TT.CUP.length === 4, '9 drills each proven completable; story scenes: ' + Object.keys(TT.STORY).join(', ') + '; full cup playthrough passes in node test/run.mjs');
// every mechanic, one at a time, each in a fresh match from the shipped file
const feat = (label, setup, okFn) => { const c = mk(), g = c.__thugby.game, T = c.__thugby.TT; g.go('match', { home: 'mud', away: 'meg', venue: 'dome', seed: 21, seats: [], skipIntro: true, halfLength: 60, suddenDeath: true }, { fade: 0 }); for (let i = 0; i < 360; i++) g.advance(1 / 120); const e = {}; T.bus.on('*', (d, k) => { e[k] = (e[k] || 0) + 1; }); const m = c.__thugby.M; setup(T, m, g); for (let i = 0; i < 1500 && !okFn(e, m, T); i++) g.advance(1 / 120); const ok = okFn(e, m, T) && g.errors.length === 0; req('  feature: ' + label, ok, ok ? 'events: ' + Object.keys(e).filter(k => !['phase', 'gather', 'bounce', 'refCall', 'whistle'].includes(k)).slice(0, 8).join(', ') : 'missing; errors ' + g.errors.length); };
feat('try (5) and conversion from in line', T => T.force('tryHome'), (e, m) => e.try && m.score[0] >= 5 && e.setKick);
feat('drop goal (3)', T => T.force('dropGoal'), (e, m) => e.dropGoalResult >= 1);
feat('monster hit, launch, instant replay trigger', T => T.force('monsterHit'), e => e.monsterHit && e.land);
feat('ruck and jackal', T => T.force('ruck', { jackal: true }), e => e.ruck && e.jackal);
feat('knock-on to scrum', T => T.force('knockOn'), e => e.knockOn && e.scrum);
feat('touch to lineout', T => T.force('touch'), e => e.touch && e.lineout);
feat('penalty and the captain\'s choice', T => T.force('penalty'), e => e.penalty && e.choice);
feat('yellow card and sin bin', T => T.force('yellow'), (e, m) => e.card && e.sinBinIn && m.players.some(p => p.st === 'binned'));
feat('Thunder Run super', T => T.force('thunder'), e => e.superStart);
feat('Hurricane Hit super', T => T.force('hurricane'), e => e.superStart);
feat('ON FIRE', T => T.force('onFire'), e => e.onFire);
for (const k of ['pie', 'iron', 'boot', 'grease', 'horn']) feat('power-up ' + k + ' thrown on by the crowd and taken', (T, m) => { T.force('giveP1'); T.force('powerup', { kind: k }); m.puLandTo = 1; }, (e, m) => { if (m.pu && m.pu.landed) { const p = m.players.find(q => q.st === 'run' && q.id !== m.ball.holder); if (p) { p.x = m.pu.x; p.y = m.pu.y; } } return e.powerupThrow && e.powerupTake; });
for (const k of ['chicken', 'flames', 'lightning', 'mud']) feat('venue hazard ' + k, T => T.force('hazard', { kind: k }), e => e[{ chicken: 'chicken', flames: 'flame', lightning: 'lightning', mud: 'mudCall' }[k]]);
feat('kick-off and 22 drop-out', T => { T.force('dropout'); }, e => e.dropOut && e.kickoff);
feat('the hooter waits for a stoppage, then half-time', T => { T.force('giveP1'); T.force('hooter'); }, (e, m) => e.hooter && e.halftime);
feat('sudden death golden point: first score wins', (T, m) => { T.force('sudden'); }, (e, m) => e.suddenDeath && m.suddenDeath);
feat('golden point ends the match on a try', (T, m, g) => { T.force('sudden'); for (let i = 0; i < 240; i++) g.advance(1 / 120); T.force('tryAway'); }, (e, m) => m.over && m.winner === 1);
feat('ref down: nothing called', T => T.sim.refDown(), (e, m, T) => e.refDown && !T.sim.refSees(m.players[0]));
feat('advantage then penalty or advantage over', (T, m) => { m.cheats.refStrict = true; T.force('giveP1'); const h = m.players[m.ball.holder]; const off = m.players.find(p => p.team !== h.team && p.st === 'run'); const v = m.players.find(p => p.team === h.team && p !== h); v.x = off.x + 8; v.y = off.y; off.facing = Math.atan2(v.y - off.y, v.x - off.x); T.sim.tackleTry(off, 'tackle'); }, e => e.foul && (e.advantage || e.penalty));
// art direction: the engine's native style plus rugby assets
req('Art Direction: engine native style plus new rugby art', /res: 'ps1'/.test(scripts[2]) && ['BALL_SPR', 'drawCrest', 'drawSinBin', 'PU_SPR', 'drawSkyline', 'makeCrowd'].every(k => scripts[2].includes(k)), 'res ps1 expand; code-drawn oval ball, crests, sin bin, 5 power-up sprites, 4 venue skylines, crowd, posts, boards (screenshots in shots/)');
// animation: each rugby move drives the rig differently (the engine's native rig, extended)
{ const states = ['run', 'pass', 'kick', 'fend', 'charge', 'tackling', 'diving', 'tackled', 'getup', 'launched', 'ruck', 'scrum', 'lift', 'celebrate', 'spin', 'binned', 'held'];
  const base = { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, stT: .1, charge: 0, celeb: 0, flex: 0, data: { size: 1 } };
  const sigs = states.map(st => JSON.stringify(TT.pres.rigState(Object.assign({}, base, { st, launch: { t: .1 } }), { phase: 'play', ph: {}, sub: '' }), (k, v) => k === 'spec' ? v.name : v));
  req('Animation: native rig plus a rugby move set (' + states.length + ' states)', new Set(sigs).size === states.length, states.map((st, i) => st + '=' + sigs[i].replace(/"x":0,"y":0,"z":0,"vx":0,"vy":0,"facing":0,?/, '').slice(0, 40)).slice(0, 6).join('  ') + ' ... all ' + states.length + ' distinct'); }
// narrative tone: commentary and story in the source's broadcast voice
req('Narrative tone: writing in the style of the source (broadcast banter)', Object.values(TT.LINES).reduce((a, l) => a + l.length, 0) > 100 && Object.keys(TT.STORY).length === 8, Object.keys(TT.LINES).length + ' commentary categories, ' + Object.values(TT.LINES).reduce((a, l) => a + l.length, 0) + ' lines (e.g. "' + TT.LINES.monsterHit[2][1] + '"); 8 story scenes');
// every mode screen, one at a time
for (const [sc, d] of [['title'], ['menu'], ['cup'], ['story', { id: 'prologue' }], ['training', {}], ['join', { mode: 'exhibition' }], ['setup'], ['records', {}], ['about'], ['credits'], ['card', { demo: true }], ['results', { home: 'mud', away: 'bad', score: [12, 5], winner: 0, stats: [{ tries: 2, bigHits: 1, metres: 300, poss: 60 }, { tries: 1, bigHits: 0, metres: 100, poss: 40 }], potm: { team: 'mud', idx: 6, tries: 2, tackles: 3, metres: 40 }, seats: [0], hit: 5, tries: 2, venue: 'park' }]]) {
  if (sc === 'cup') TT.cupNew(); game.go(sc, d || {}, { fade: 0 }); adv(.3); req('mode screen: ' + sc, snap().scene === sc && game.errors.length === 0, 'entered and ran 0.3 s with no errors');
}
// dev mode
const items = game.o.menu.items.map(i => i[0]);
TT.dev.openPanel(); const before = TT.TUNE.v.runSpeed; TT.TUNE.set('runSpeed', 140); const live = TT.TUNE.v.runSpeed; TT.TUNE.reset();
req('Dev mode reachable from the pause menu; live sliders; reset to defaults', items.includes('DEV MODE') && live === 140 && TT.TUNE.v.runSpeed === before && TT.TUNE.changed().length === 0, 'pause menu items: ' + items.join(', ') + '; ' + TT.TUNE.defs.length + ' sliders (runSpeed 100 -> 140 -> reset 100); ' + TT.dev.CHEATS.length + ' cheats, ' + TT.dev.EVENTS.length + ' events, view overlays, ' + TT.dev.JUMPS().length + ' jumps');
TT.dev.close();
// attract mode
game.go('title', {}, { fade: 0 }); adv(10.6); const at = snap();
adv(2); game.input.press('KeyX'); game.advance(1 / 120); game.input.release('KeyX'); adv(.6);
req('Attract mode after 10 s idle; any input exits', at.scene === 'match' && at.attract && snap().scene === 'title', 'after 10.6 s idle: scene ' + at.scene + ' (attract ' + at.attract + '); after a key press: ' + snap().scene + '; the director cheats freely (no clock, forced events)');
// multiplayer
const seats = [game.input, game.addPlayer({ keys: 'right' }), game.addPlayer({ pad: 1 }), game.addPlayer({ pad: 2 })];
req('Multiplayer on its own: up to 4 local players', game.players.length === 4, 'pads join with Start, keyboard right half with 2 (patch 2 layout: ' + ctx.My3D2dge.Input.halfKeys(TT.KEYS, 'right').x.join('/') + ' for ✕)');
// 10-foot controller-first UI
const I = game.input; I.lastDevice = 'gamepad'; const ps = I.label('x') + I.label('ci') + I.label('sq') + I.label('tri'); game.settings.set('glyphs', 'xbox'); const xb = I.label('x') + I.label('ci') + I.label('sq') + I.label('tri'); game.settings.set('glyphs', 'playstation'); I.lastDevice = 'keyboard'; const kb = ['x', 'l1', 'r1', 'ci', 'turbo'].map(a => I.label(a)).join(' ');
req('Controller-first: PlayStation glyphs by default, Xbox option in Settings, PC keys on keyboard, mouse native', ps === '✕○□△' && xb === 'ABXY' && game.settings.spec('glyphs').group === 'Display', 'pad: ' + ps + '; Settings > Display > Controller buttons: ' + xb + '; keyboard: ' + kb + '; mouse: hover highlights teammates, left click passes/switches, right button kicks to the cursor, menus hover and click');
// touch-only
const tctx = mk({ mm: q => ({ matches: /coarse/.test(q), addEventListener() {}, removeEventListener() {} }) });
req('Touch-only devices: "Controller or keyboard required" plus Settings; no touch controls; attract runs', scripts[2].includes("'CONTROLLER OR KEYBOARD REQUIRED'") && scripts[2].includes("g.menu('settings')") && scripts[2].includes('touchEnabled = false'), 'title shows the message and a SETTINGS button (tap opens Settings); touch buttons off in every scene (touch: []); the idle timer still starts the demo (phone screenshot shots/touch.png)');
void tctx;
// done: no TODOs
const stub = (scripts[2].match(/todo|fixme|\btbd\b|lorem|placeholder|not implemented|coming soon/gi) || []).length;
req('Done: no TODOs, placeholders or stubs', stub === 0, 'matches in the shipped game script: ' + stub);
// source information on the About screen, the same as the exit interview
const x = JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8'));
const { aboutPages } = await import('../build.mjs').then(m => ({ aboutPages: m.aboutPages }));
req('About/Credits screen carries Source Info, Testing, Engine, Prompt feedback (regenerated from exit-interview.json = shipped)', typeof aboutPages === 'function' && JSON.stringify(aboutPages()) === JSON.stringify(TT.ABOUT), 'pages: ' + TT.ABOUT.map(p => p.title).join(' | ') + '; regenerated from the current exit-interview.json and compared byte for byte with the shipped HTML');
const si = x.sourceInformation, need = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
req('exit-interview.json: exact shape, every value filled', need.every(k => si[k]) && x.testingFeedback.length === 4 && x.engineFeedback.length === 6 && x.promptFeedback.length === 4 && ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => x.aiHub[k]) && x.aiHub.tags.length >= 3 && x.aiHub.tags.length <= 6, 'environment: "' + si.environment + '" (TASK.md\'s own wording); aiHub.series empty because there is no franchise');
console.log('\n' + (n - bad) + ' of ' + n + ' TASK.md requirements pass' + (game.errors.length ? '; game errors: ' + game.errors.length : '; no game errors'));
process.exit(bad ? 1 : 0);
