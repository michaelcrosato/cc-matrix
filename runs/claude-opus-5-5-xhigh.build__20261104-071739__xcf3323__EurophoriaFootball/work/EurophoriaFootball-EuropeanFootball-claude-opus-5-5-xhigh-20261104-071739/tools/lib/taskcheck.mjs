// TASK.md, line by line, against the running game: every requirement checked on the build, headless, in Chromium (the
// audio suite's page checks) and through the AI Hub's own harness (the hub suite). --report prints every line's result.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
export async function run({ load, check }) {
  const S = 'task', ROOT = new URL('../../../', import.meta.url).pathname, DEV = new URL('../../', import.meta.url).pathname, rows = [];
  const TASK = readFileSync(ROOT + 'TASK.md', 'utf8'), PLAN = readFileSync(ROOT + 'PLAN.md', 'utf8'), STAGE = readFileSync(ROOT + 'STAGE.md', 'utf8');
  const L = re => 'L' + (TASK.split('\n').findIndex(l => re.test(l)) + 1), src = f => readFileSync(DEV + f, 'utf8');
  const req = (line, what, ok, detail = '') => { rows.push([line, what, !!ok, detail]); check(S, line + ' ' + what, !!ok, detail); };
  // ---- the names: TASK.md's own templates, filled in ----
  const pkgT = /single html file \[([^\]]+)\]/.exec(TASK)[1], dirT = /Create a subfolder called \[([^\]]+)\]/.exec(TASK)[1];
  const source = /^SOURCE: ([^(\n]+)/m.exec(TASK)[1].trim(), title = /\*\*([^*]+)\*\* \(Euro \+ euphoria\)/.exec(PLAN)[1];
  const camel = s => s.trim().split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1)).join('');
  const fill = t => t.replace('GameTitle', camel(title)).replace('SOURCE', camel(source));
  const name = fill(pkgT) + (pkgT.endsWith('.html') ? '' : '.html'), folder = fill(dirT);
  const files = readdirSync(ROOT), page = existsSync(ROOT + name) ? readFileSync(ROOT + name, 'utf8') : '';
  req(L(/^SOURCE:/), 'SOURCE is "' + source + '", so SOURCE in the names is ' + camel(source), camel(source) === 'EuropeanFootball');
  req(L(/^Game Title:/), 'the title, a riff on the source picked from 50 by secrets.randbelow (PLAN.md lines 5-6), is "' + title + '" on the page too', /secrets\.randbelow\(50\)/.test(PLAN) && /title/i.test(STAGE) && (/<title>([^<]+)<\/title>/.exec(page) || [])[1] === title);
  req(L(/^Package:/), 'the html is TASK.md\'s [' + pkgT + '] filled in: ' + name, files.includes(name) && files.filter(f => f.endsWith('.html')).length === 1);
  req(L(/^Package:/), 'one self-contained file (' + (page.length / 1e6).toFixed(1) + ' MB): no external scripts, styles, images or audio', page.length > 1e5 && !/<(script|link|img|audio)\b[^>]*\b(src|href)=/i.test(page));
  req(L(/^Create a subfolder called/), 'the dev subfolder is TASK.md\'s [' + dirT + '] filled in: ' + folder, existsSync(ROOT + folder) && statSync(ROOT + folder).isDirectory() && DEV.replace(/\/$/, '').endsWith('/' + folder));
  { const extra = files.filter(f => ![name, folder, 'exit-interview.json', 'TASK.md', 'PLAN.md', 'STAGE.md'].includes(f)); req(L(/^Create a subfolder called/), 'the root holds only the given files, the html and exit-interview.json', !extra.length, extra.join(',')); }
  // ---- the game, headless ----
  const h = load({}), { EF, game, E, I } = h; game.advance(.5);
  req(L(/^Tech Stack:/), 'built on my-3D2dge v' + E.version + ' (the handoff build), its changes marked and documented', E.version === '0.85.2' && /EF:/.test(src('engine/my-3d2dge.js')) && existsSync(DEV + 'engine/CHANGES-ENGINE.md'));
  I.tap('confirm'); game.advance(.3);
  req(L(/^Genre:/), 'arcade sports: Cup Run, Kick-About, Penalties and Training on the main menu', ['cup', 'kickabout', 'penalties', 'training'].every(id => EF.UI.top().widgets.some(w => w.id === id)));
  game.go('match', { opts: Object.assign(EF.defaultMatchOpts(), { humans: [{ input: game.input, side: 0 }], seed: 3 }) }); game.advance(.5);
  req(L(/^Perspective:/), 'the match plays in the broadcast view (side-on, raised ' + game.view.pitchDeg + ' degrees)', game.view.id === 'broadcast' && game.view.pitchDeg === 40, game.view.id);
  { const m = EF.cur.m; EF.parts.super(m); const cap = m.side[0].find(f => f.data.captain); let sup = false; const u = EF.bus.on('superStrike', () => sup = true); m.triggerEuphoria(0, cap); cap.shoot(.95, EF.Intent.make()); game.advance(2); u();
    const m2 = EF.test.startMatch({ seed: 4 }); m2.startVar({ kind: 'penalty', foul: { sev: .6, x: m2.goalX(0), y: EF.P.CY }, side: 0 }); game.advance(.2);
    req(L(/^SOURCE:/), 'over the top: Europhoria unlocks a super strike in play, VAR reviews a penalty; ' + EF.all('super').length + ' supers, ' + EF.all('event').length + ' matchday events', sup && m2.mode === 'var' && EF.all('super').length === 7 && EF.all('event').length >= 6, 'super ' + sup + ' mode ' + m2.mode); }
  { const t = EF.all('team').find(q => q.kits.home.pattern && q.kits.home.pattern !== 'plain'), p = t.players.find(q => q.pos !== 'GK'), rig = EF.Art.rigFor(t, 'home', p);
    req(L(/^Art Direction:/), 'the engine\'s HD Humanoid rigs in new kits (' + t.id + ': ' + rig.o.kit.pattern + ', shirt ' + rig.o.kit.number + ')', rig.o.style === 'hd' && rig.o.kit.pattern === t.kits.home.pattern && rig.o.kit.number === p.num); }
  { const r = new E.Humanoid({ weapon: null }); r.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0, tilt: { axis: 'forward', angle: 1.4, pivot: 'feet' } }); const lib = EF.Anim.load(), nc = lib ? Object.keys(lib.clips).length : 0, used = ['Slide_Loop', 'Backflip', 'Cartwheel', 'OverhandThrow', 'Fall_On_Face', 'Get_Up_From_Side'];
    req(L(/^Animation:/), 'the engine\'s animation plus new moves: the whole-body tilt (dives, headers) and ' + nc + ' mocap clips (slides, celebrations, throws, falls) loaded', !!r.mocapTilt && !!lib && used.every(n => lib.clip(n)), 'tilt ' + !!r.mocapTilt + ' clips ' + nc); }
  req(L(/^Audio:/), 'no audio files; ' + Object.keys(EF.SONGS).length + ' songs, the effects, a crowd engine, ' + EF.all('chant').length + ' chants and babble voices are code', !/data:audio|\.(mp3|ogg|wav|m4a)["']/i.test(page) && Object.keys(EF.SONGS).length >= 15 && EF.all('chant').length >= 6 && typeof EF.babble.voiceFor('barry') === 'function');
  // dev mode: from the pause menu, the sliders, the reset row
  { const hp = load({ hash: '#match' }); hp.game.advance(.5); const item = (hp.game.o.menu.items || []).find(x => x[0] === 'Dev mode'); hp.game.pause(); item && item[1](); hp.game.advance(.1); const open = hp.EF.Dev.isOpen && !hp.game.paused;
    hp.EF.Dev.tab = 0; const R = hp.EF.Dev.rows(), sliders = R.filter(r => r.kind === 'slider').length, reset = R.find(r => /RESET ALL/.test(r.label || '')); hp.EF.tuneSet('runSpeed', 120); const moved = hp.EF.T.runSpeed === 120; reset && reset.run(); hp.game.advance(.1);
    req(L(/^Include a dev mode/), 'Dev mode opens from the pause menu over the running match; ' + sliders + ' live sliders; RESET ALL TO DEFAULTS restores them', open && sliders >= 25 && moved && !!reset && !hp.EF.tuneChanged()); }
  // the attract mode
  { const ha = load({}); ha.game.advance(.3); ha.game.advance(9.6); const a = ha.game.sceneName; ha.game.advance(.5); const b = ha.game.sceneName; ha.game.advance(4); ha.I.tap('confirm'); ha.game.advance(.3);
    req(L(/^Attract Mode:/), 'after 10 s idle on the title the AI plays a demo; any input goes back (' + [a, b, ha.game.sceneName].join(' -> ') + ')', a === 'title' && b === 'attract' && ha.game.sceneName === 'title'); }
  // multiplayer on one machine
  { const hm = load({}); hm.game.advance(.3); hm.game.addPlayer({ keys: 'right' }); const m = hm.EF.test.startMatch({ humans: [{ input: hm.game.input, side: 0 }, { input: hm.game.players[1], side: 1 }] }); hm.game.advance(2);
    req(L(/^Multiplayer:/), 'the game on its own: two local players, one a side (versus; co-op shares a side)', m.humans.length === 2 && m.humans[0].side === 0 && m.humans[1].side === 1 && !hm.game.errors.length); }
  // tone
  { let n = 0; for (const l of EF.all('lines')) n += l.entries.length + l.entries.filter(e => e.reply).length; const goal = EF.get('lines', 'goal').entries.map(e => e.text).join(' ');
    req(L(/^Narrative tone/), 'British commentary and tabloid back pages: ' + n + ' lines, "OH MY COD!" and "FISH OUT OF WATER!"', n >= 300 && /OH MY COD/.test(goal) && /FISH OUT OF WATER!/.test(src('src/52-story.js'))); }
  // the 10-foot UI, keyboard, mouse, glyphs
  { const hu = load({}), { EF: F, game: G, I: J } = hu; G.advance(.5); J.tap('confirm'); G.advance(.3); const top = F.UI.top();
    J.tap('right'); G.advance(.2); const padNav = F.UI.focusId() === 'kickabout';
    req(L(/^Design the game around/), 'controller-first 10-foot menus: ' + top.widgets.length + ' big tiles, a prompt footer, the pad\'s d-pad and confirm drive them', top.widgets.length <= 7 && typeof top.footer === 'function' && padNav);
    const K = F.KEYS; req(L(/^Design the game around/), 'the keys PC players expect: WASD and arrows, J K L I to pass, shoot, lob and through, Shift sprint, Space Europhoria, Esc pause', K.up.includes('KeyW') && K.up.includes('ArrowUp') && K.pass[0] === 'KeyJ' && K.shoot[0] === 'KeyK' && K.lob[0] === 'KeyL' && K.through[0] === 'KeyI' && K.sprint.includes('ShiftLeft') && K.euphoria.includes('Space') && K.pause.includes('Escape'));
    const w = F.UI.top().widgets.find(q => q.id === 'about'); J.feed('move', w.x + w.w / 2, w.y + w.h / 2); G.advance(.1); const hov = F.UI.focusId() === 'about'; J.feed('down', w.x + w.w / 2, w.y + w.h / 2); J.feed('up', w.x + w.w / 2, w.y + w.h / 2); G.advance(.6);
    req(L(/^Design the game around/), 'the mouse in menus: hovering moves the focus, a click picks', hov && G.sceneName === 'about', G.sceneName);
    J.lastDevice = 'keyboard'; const kb = F.promptCode(J, 'pass'); J.lastDevice = 'gamepad'; const pad = F.promptCode(J, 'pass'), ps = F.Glyphs.style(J); G.settings.set('glyphs', 'xbox'); const xb = F.Glyphs.style(J); G.settings.set('glyphs', 'playstation'); J.lastDevice = 'mouse'; const mo = F.promptCode(J, 'pass');
    req(L(/^Design the game around/), 'prompts follow the last input: PlayStation glyphs for a pad by default, Xbox in Settings, keycaps, mouse buttons', kb === 'KeyJ' && pad === 'Pad0' && ps === 'playstation' && xb === 'xbox' && mo === 'Mouse0', [kb, pad, ps, xb, mo].join(' ')); }
  { const pages = EF.aboutPages(); req(L(/^Do not use overly dense/), 'no dense data screens: the longest About page has ' + Math.max(...pages.map(p => p.rows.length)) + ' rows, one block a page', pages.every(p => p.rows.length <= 8)); }
  // touch-only
  { const ht = load({ search: '?touchonly=1' }); ht.game.advance(.5); const notice = ht.EF.touchOnly() && ht.game.sceneName === 'title'; ht.I.tap('confirm'); ht.game.advance(.4); ht.EF.UI.setFocus('cup'); ht.I.tap('confirm'); ht.game.advance(.5); const blocked = ht.game.sceneName === 'title' && ht.EF.UI.focused().disabled;
    ht.EF.UI.setFocus('options'); const settings = !ht.EF.UI.focused().disabled; ht.game.go('title', {}); ht.game.advance(10.5);
    req(L(/^Touch-only devices/), 'touch-only: no touch controls, "CONTROLLER OR KEYBOARD REQUIRED" with Settings reachable, play cannot start, the attract mode runs', notice && blocked && settings && ht.game.input.touchEnabled === false && ht.game.sceneName === 'attract' && /CONTROLLER OR KEYBOARD REQUIRED/.test(src('src/31-front.js')), ht.game.sceneName); }
  // done
  { const bad = readdirSync(DEV + 'src').filter(f => /\bTODO\b|\bFIXME\b|placeholder|\bstub\b|not implemented/i.test(src('src/' + f))); req(L(/^No TODOs/), 'no TODOs, placeholders or stubs in the game', !bad.length && !/\bTODO\b|not implemented/.test(page), bad.join(',')); }
  // About, the exit interview
  { const J2 = JSON.parse(readFileSync(ROOT + 'exit-interview.json', 'utf8')), pages = EF.aboutPages(), body = JSON.stringify(pages);
    req(L(/^CRITICAL: Put Source/), 'an About & Credits screen with Source Information, Testing, Engine and Prompt Feedback from exit-interview.json', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK', 'CREDITS'].every(t => pages.some(p => p.title === t)) && J2.testingFeedback.concat(J2.engineFeedback, J2.promptFeedback, Object.values(J2.sourceInformation)).every(a => body.includes(JSON.stringify(a).slice(1, -1))));
    const A = J2.aiHub; req(L(/^Exit interview/), 'exit-interview.json parses; ' + Object.keys(J2.sourceInformation).length + ' source fields, 4/6/4 answers, ' + Object.keys(A).length + ' aiHub fields, all answered', Object.values(J2.sourceInformation).every(v => typeof v === 'string' && v.trim()) && J2.testingFeedback.length === 4 && J2.engineFeedback.length === 6 && J2.promptFeedback.length === 4 && ['name', 'tagline', 'description', 'type', 'genre', 'source', 'players', 'controls'].every(k => String(A[k] || '').trim()) && typeof A.series === 'string' && A.tags.length >= 3); }
  req(L(/^Testing:/), 'the tests are one command that prints only failures and a one-line count (this suite runs in it)', /Prints only failures/.test(src('tools/test.mjs')) && /passed, \$\{fail\} failed/.test(src('tools/test.mjs')));
  { const ht = src('tools/lib/hubtest.mjs'); req(L(/^Create a subfolder called/), 'the one server binds 127.0.0.1 on a port the OS picks, is checked to be our page, and is stopped by its PID', /'0', '--bind', '127\.0\.0\.1'/.test(ht) && /process\.kill\(srv\.pid\)/.test(ht) && !/pkill|killall|fuser/.test(ht + src('tools/test.mjs'))); }
  req('-', 'the headless runs above raised no errors', !game.errors.length, game.errors.slice(0, 2).map(e => e.message).join(' | '));
  // ---- in Chromium: the delivered page (the audio suite's checks, each mapped to its TASK.md line) ----
  { const got = []; await (await import('./audiocheck.mjs')).run({ check: (s, n, ok, d) => got.push([n, ok, d]) }); const all = re => { const g = got.filter(x => re.test(x[0])); return g.length > 0 && g.every(x => x[1]); };
    req(L(/^Audio:/), 'in the browser every effect, song, crowd sound, chant and voice reaches the output, and the sliders at 0 silence them (' + got.filter(x => /reaches|silent/.test(x[0])).length + ' checks)', all(/reaches the output|is silent/));
    req(L(/^Include a dev mode/), 'in the browser: Escape pauses and the pause menu\'s Dev mode button opens the panel over the running match', all(/Dev mode/));
    req(L(/^Design the game around/), 'in the browser: the mouse aims in play, a left click passes toward the cursor, the right button shoots', all(/mouse aim|left click|right button/));
    req('-', 'the delivered page raised no errors', all(/no page errors/), got.filter(x => !x[1]).map(x => x[0] + ' ' + x[2]).join(' | ')); }
  // ---- online: the AI Hub's own harness ----
  { const got = [], argv = process.argv; process.argv = argv.concat(['--scenario=2 players']); try { await (await import('./hubtest.mjs')).run({ check: (s, n, ok, d) => got.push([n, ok, d]) }); } finally { process.argv = argv; }
    req(L(/^Online:/), 'AI Hub (lib/hub): its own harness passes its automatic check with 2 players on the delivered page (' + got.length + ' checks)', got.length > 0 && got.every(x => x[1]), got.filter(x => !x[1]).map(x => x[0] + ' ' + x[2]).join(' | ')); }
  if (process.argv.includes('--report')) for (const [line, what, ok, d] of rows) console.log((ok ? 'ok   ' : 'FAIL ') + line.padEnd(4) + ' ' + what + (ok || !d ? '' : '  (' + d + ')'));
}
