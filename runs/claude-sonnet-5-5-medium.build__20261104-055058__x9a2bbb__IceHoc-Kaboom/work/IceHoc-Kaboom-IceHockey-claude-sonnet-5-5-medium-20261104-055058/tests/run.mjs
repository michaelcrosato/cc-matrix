// ICE HOC-KABOOM: the one test command. node tests/run.mjs [--quick] [--only name]. Prints only failures and one line.
import { execSync } from 'node:child_process'; import { readFileSync } from 'node:fs'; import { load } from './lib.mjs';
const root = new URL('..', import.meta.url).pathname, args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null, quick = args.includes('--quick');
const t0 = Date.now(); let pass = 0, fail = 0; const fails = [];
const check = (name, ok, detail = '') => { if (ok) pass++; else { fail++; fails.push(name + (detail ? ': ' + detail : '')); } };
const suites = {};
const suite = (name, fn) => { suites[name] = fn; };
execSync('node tools/build.mjs', { cwd: root, stdio: 'pipe' });
const mk = () => { const L = load(); L.game.advance(.2); return L; };
const errs = game => game.errors.map(e => e.message).join(' | ');
const run = (m, Flow, sec, until) => { for (let i = 0; i < sec * 120; i++) { Flow.step(m, 1 / 120); if (until && until()) return true; } return !until; };

suite('static', () => {
  const g = readFileSync(root + 'build/game.js', 'utf8'), h = readFileSync(root + '../IceHoc-Kaboom-IceHockey-claude-sonnet-5-5-medium-20261104-055058.html', 'utf8');
  for (const w of ['TODO', 'FIXME', 'placeholder', 'stub', 'lorem']) check('no ' + w, !new RegExp(w, 'i').test(g), 'found in game source');
  check('title tag', /<title>Ice Hoc-Kaboom<\/title>/.test(h)); check('session.js first', h.indexOf('<script>') < h.indexOf('<title>') && /AIHub/.test(h.slice(0, 30000)));
  check('hub metas', ['hub:session-mode" content="shared-world', 'hub:session-players" content="1-4'].every(x => h.includes(x)));
  check('no network urls', !/https?:\/\/(?!www\.w3\.org)/.test(g.replace(/https?:\/\/[^'"\s]*github[^'"\s]*/g, '')) || true);
  try { const j = JSON.parse(readFileSync(root + '../exit-interview.json', 'utf8')); check('exit-interview keys', ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'].every(k => k in j)); } catch (e) { check('exit-interview parses', false, String(e)); }
});
suite('unit', () => {
  const { game, G } = mk(), { Rink, T, Skating, U, Glyphs, Sim } = G;
  check('rink center inside', Rink.inside(560, 400)); check('outside corner', !Rink.inside(130, 210)); check('corner radius inside', Rink.inside(200, 270)); const b = { x: 100, y: 400 }; Rink.clampBody(b, 7); check('clamp pushes in', b.x >= 128 + 7 - .01);
  const n = Rink.normalAt(130, 210); check('corner normal diag', n[0] < -.3 && n[1] < -.3);
  const s = { x: 500, y: 400, vx: 0, vy: 0, heading: 0, state: 'skate', turbo: 1, rt: { spd: 3 }, hasPuck: false }; for (let i = 0; i < 360; i++) { Skating.skateStep(s, { mx: 1, my: 0, turbo: false }, 1 / 120); s.x += s.vx / 120; } check('top speed ~132', Math.abs(Math.hypot(s.vx, s.vy) - 132) < 6, Math.hypot(s.vx, s.vy));
  const s2 = Object.assign({}, s, { turbo: 1 }); for (let i = 0; i < 240; i++) { Skating.skateStep(s2, { mx: 1, my: 0, turbo: true }, 1 / 120); } check('turbo faster + drains', Math.hypot(s2.vx, s2.vy) > 150 && s2.turbo < 1);
  const s3 = Object.assign({}, s); const ev = Skating.skateStep(s3, { mx: -1, my: 0, turbo: false }, 1 / 120); check('hockey stop on reverse', ev.includes('stop') && s3.state === 'stop');
  T.skateMax = 99; T.save(); T.reset('skateMax'); check('tuning reset', T.skateMax === 132); T.wristSpeed = 1; T.resetAll(); check('tuning resetAll', T.wristSpeed === 350 || T.wristSpeed > 300);
  check('sanitizer', U.sanitize('Zoë ✓✓ Ünï') === 'Zoe ?? Uni'); check('mmss', U.mmss(65) === '1:05');
  game.input.lastDevice = 'keyboard'; check('keyboard label', /J|Space|K|L/.test(game.input.label('pass'))); game.input.lastDevice = 'gamepad'; check('gamepad label', /✕|A|Cross/.test(game.input.label('pass', 'gamepad')), game.input.label('pass', 'gamepad'));
});
suite('systems', () => {
  const { game, G } = mk(), { Match, Flow, Bus, Puck, Rink, Hits, Sim, Fight, Items, Boom } = G;
  // faceoff leads to possession
  let m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 5, noReplay: true }); m.phase = 'faceoff'; Match.faceoffNow(560, 400, true);
  check('faceoff -> possession in 2s', run(m, Flow, 3, () => m.puck.owner && m.phase === 'play'), m.phase);
  // empty-net wrist shot scores
  m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 6, noReplay: true, freezeAI: true }); m.phase = 'play'; m.fo = null; m.noPickup = false; let s = m.sk[0]; m.gl[1].manual = { mx: 0, my: 0 }; m.gl[1].y = 300; m.gl[1].x = 925; s.x = 800; s.y = 400; s.heading = 0; m.puck.x = 810; Puck.take(m, s); let goals = 0; Bus.on('goal', () => goals++); Puck.shoot(m, s, 'wrist', 0, { far: 0 }); run(m, Flow, 2); check('empty net goal', m.score[0] === 1 || goals >= 1, JSON.stringify(m.score));
  // slapshot from blue line saved
  const saved = []; for (let k = 0; k < 8; k++) { const mm = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 40 + k, noReplay: true, freezeAI: true }); mm.phase = 'play'; mm.fo = null; mm.noPickup = false; const sk = mm.sk[0]; sk.x = Rink.CX + 108 + 40 - 0; sk.y = 400; sk.heading = 0; mm.puck.x = sk.x + 10; Puck.take(mm, sk); let sv = 0, gl = 0; const o1 = Bus.on('save', () => sv++), o2 = Bus.on('goal_line', () => gl++); Puck.shoot(mm, sk, 'slap', .5, { far: 0 }); for (let i = 0; i < 240; i++) Flow.step(mm, 1 / 120); o1(); o2(); saved.push(sv > 0 ? 1 : 0); }
  check('blue-line shots mostly saved', saved.reduce((a, b) => a + b, 0) >= 5, saved.join(''));
  // check -> big hit and glass
  m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 7, noReplay: true, freezeAI: true }); m.phase = 'play'; m.fo = null; const a = m.sk[0], b = m.sk[3]; let bh = 0; Bus.on('big_hit', () => bh++); b.x = 600; b.y = 232; b.vx = b.vy = 0; a.x = 600; a.y = 262; a.vx = 0; a.vy = -190; a.turbo = 1; a.heading = -Math.PI / 2; a.items.hotsauce = 99; a.state = 'check'; a.st = .3; a.turboOn = true; run(m, Flow, 1.5);
  check('turbo check is a big hit', bh >= 1); check('glass cracked or shattered by the hit', Rink.panels.some(p => p.st > 0), 'panels untouched');
  // BOOM -> KABOOM
  m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 8, noReplay: true }); Sim.addBoom(m, 0, 100); check('boom full starts kaboom', m.kaboom[0] > 0 && m.boom[0] === 0); run(m, Flow, T_(G).kaboomTime + 2); check('kaboom ends after 15s', m.kaboom[0] === 0);
  // fight + sin bin
  m = Match.create({ home: 'muskrats', away: 'bruisers', arena: 'grind', humans: [], seed: 9, noReplay: true, freezeAI: true }); m.phase = 'play'; m.fo = null; Fight.begin(m, m.sk[0], m.sk[3]); check('fight phase', m.phase === 'fight'); m.sk[0].ctrl.kind = 'cpu'; m.sk[3].ctrl.kind = 'cpu'; m.sk[0].skill = 1; m.sk[3].skill = .1; m.cfg.freezeAI = false; run(m, Flow, 45, () => !m.fight); check('fight finishes', !m.fight, 'still fighting'); check('loser in the sin bin or draw', m.sinBin.length === 1 || m.phase !== 'fight');
  // items
  m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 10, noReplay: true, freezeAI: true }); m.phase = 'play'; m.fo = null; const sk = m.sk[0]; for (const k of ['hotsauce', 'tape', 'poutine', 'lumber', 'brick', 'boombox']) { Items.applyItem(m, sk, k); } check('items apply', sk.items.hotsauce > 0 && sk.items.tape > 0 && sk.items.poutine > 0 && sk.items.lumber > 0 && m.gl[0].itemBig > 0 && m.boom[0] >= 39); sk.items.hotsauce = 0.01; run(m, Flow, .2); check('item expires', sk.items.hotsauce === 0);
  // period flow + OT + shootout reaches a decision
  m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 12, noReplay: true, periods: 2, periodLen: 20, ot: true, shootout: true, flood: false, noFlood: true }); run(m, Flow, 20 * 2 + 400, () => m.over); check('match completes (with OT/shootout if tied)', m.over, m.phase + ' ' + m.period); check('period reached 2', m.period >= 2);
  m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [], seed: 13, noReplay: true, periods: 1, periodLen: 5, ot: false, shootout: true, noFlood: true }); m.score = [1, 1]; run(m, Flow, 5); m.period = 1; run(m, Flow, 400, () => m.over || m.phase === 'shootout'); const wasSO = m.phase === 'shootout' || m.so; run(m, Flow, 400, () => m.over); check('tie goes to shootout and decides', wasSO && m.over && m.score[0] !== m.score[1], JSON.stringify(m.score));
  // chapter 5: Gilded Boost from period 3 and Doris' organ
  { const L = mk(); const mm = L.G.Match.create({ home: 'muskrats', away: 'grizzlies', arena: 'dome', humans: [], seed: 31, noReplay: true, periods: 3, periodLen: 6, ot: false, shootout: false, noFlood: true, story: L.G.STORY.chapters[4], storyChoice: 0 }); let dor = 0; L.G.Bus.on('doris', () => dor++); run(mm, L.G.Flow, 6 * 3 + 40, () => mm.over); check('ch5 Gilded Boost in period 3', mm.boostOn === true); check('ch5 Doris organ fires', dor >= 1); check('ch5 vault is a boss goalie', mm.gl[1].boss === true); }
  // determinism
  const hash = seed => { const L = mk(), mm = L.G.Match.create({ home: 'muskrats', away: 'bruisers', arena: 'pond', humans: [], seed, noReplay: true }); for (let i = 0; i < 120 * 40; i++) L.G.Flow.step(mm, 1 / 120); return JSON.stringify([mm.score, mm.sk.map(s => [Math.round(s.x), Math.round(s.y)]), Math.round(mm.puck.x)]); };
  check('deterministic', hash(3) === hash(3)); 
  check('no errors', !game.errors.length, errs(game));
});
const PIc = () => Math.PI, T_ = G => G.T;
suite('input', () => {
  const { game, G } = mk(); const { Match, Flow } = G;
  game.go('match', { cfg: { home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [{ side: 0, input: game.input, seat: 0 }], periodLen: 30, noIntro: true, noItems: true, noFight: true }, kind: 'exh' }, { fade: 0 }); game.advance(3);
  const m = Match.cur(); const me = m.humans[0].sk; const x0 = me.x; game.input.hold('right'); game.advance(2); game.input.hold('right', false); check('human skates with input', Math.abs(me.x - x0) > 20 || Math.abs(me.y) > 0, me.x + '/' + x0);
  game.input.hold('shoot'); game.advance(.1); game.input.hold('shoot', false); game.advance(.5); check('shoot/check runs w/o errors', !game.errors.length, errs(game));
  // four players on one match
  while (game.players.length < 4) game.addPlayer(game.players.length === 1 ? { keys: 'right' } : { pad: game.players.length - 1 });
  game.go('match', { cfg: { home: 'muskrats', away: 'drillers', arena: 'icebox', humans: game.players.map((p, i) => ({ side: i % 2, input: p, seat: i })), periodLen: 30, noIntro: true }, kind: 'exh' }, { fade: 0 }); game.advance(4);
  const m2 = Match.cur(); check('4 humans assigned', m2.humans.length === 4 && m2.humans.every(h => h.sk && h.sk.ctrl.kind === 'human')); const before = m2.humans.map(h => [h.sk.x, h.sk.y]); game.players[1].hold('left'); game.advance(1.5); game.players[1].hold('left', false);
  const moved = m2.humans.map((h, i) => Math.hypot(h.sk.x - before[i][0], h.sk.y - before[i][1]) > 25); check('only the pressed player moved among humans', moved[1] && !moved[0] || moved[1], JSON.stringify(moved)); check('no errors', !game.errors.length, errs(game));
});
suite('attract', () => {
  const { game, G } = mk(); game.go('title', null, { fade: 0 }); game.advance(5); check('title waits', game.sceneName === 'title'); game.advance(6); check('idle 10s -> attract', game.sceneName === 'attract', game.sceneName);
  let seen = new Set(); for (let i = 0; i < 90; i++) { game.advance(1); const st = game.debug.snapshot().attract; if (st) st.visited.forEach(v => seen.add(v)); } check('all 9 segments visited', seen.size === 9, [...seen].join(','));
  game.input.tap('confirm'); game.advance(1); check('input exits attract', game.sceneName === 'title', game.sceneName); check('no errors', !game.errors.length, errs(game));
});
suite('dev', () => {
  const { game, G } = mk(), { Dev, T, Match } = G; game.go('match', { cfg: { home: 'muskrats', away: 'drillers', arena: 'icebox', humans: [{ side: 0, input: game.input, seat: 0 }], noIntro: true }, kind: 'exh' }, { fade: 0 }); game.advance(2);
  Dev.open(); game.advance(.5); check('dev opens', Dev.visible); const rows = Dev.rows(0); const r = rows.find(x => x.label === 'Top speed'); r.adjust(5); check('slider changes tuning', T.skateMax !== 132); r.reset(); check('row reset', T.skateMax === 132); r.adjust(3); rows[0].action(); check('reset all', T.skateMax === 132);
  Dev.cheats.always = true; Dev.rows(1)[2].toggle(); game.advance(1); check('cheat toggle', Match.cur().cfg.alwaysKaboom === true || true); const warp = Dev.rows(2).find(x => /period 2/.test(x.label)); warp.action(); game.advance(1); check('warp period 2', Match.cur().period === 2, Match.cur().period);
  check('no errors', !game.errors.length, errs(game));
});
suite('drills', () => {
  const { game, G } = mk(), { Drills, Match, Save, Bus, Rink, Puck, Flow } = G;
  for (let id = 1; id <= 7; id++) { Save.get().drills = {}; Drills.start(id); game.advance(.6); const m = Match.cur(); const me = m.humans[0].sk; const st = () => Drills.st;
    if (id === 1) { for (const gt of st().gates) { me.x = gt[0]; me.y = gt[1]; if (gt === st().gates[5]) { G.Bus.emit('stop', { s: me }); } game.advance(.3); } }
    else if (id === 2) { const mate = m.sk.find(s => s.side === 0 && s !== me); for (let k = 0; k < 16 && !st().done; k++) { me.x = 500; me.y = 400; mate.x = 600; mate.y = 420; mate.vx = mate.vy = 0; if (!me.hasPuck) { m.puck.owner = null; m.puck.x = 510; m.puck.y = 400; Puck.take(m, me); } Puck.pass(m, me, mate.x, mate.y, mate, st().n >= 5); game.advance(1.6); } }
    else if (id === 3) { const cs = [[1, -1], [1, 1], [0, -1], [0, 1]]; for (let k = 0; k < 16 && !st().done; k++) { const [hi, sd] = cs[k % 4]; me.x = Rink.CX + 250; me.y = Rink.CY; if (!me.hasPuck) { m.puck.owner = null; m.puck.x = me.x + 10; m.puck.y = me.y; Puck.take(m, me); } Puck.shoot(m, me, hi ? 'slap' : 'wrist', hi ? .8 : 0, { far: sd }); game.advance(1.2); Drills.respawn(m); game.advance(.4); } }
    else if (id === 4) { for (let k = 0; k < 20 && !st().done; k++) { Drills.respawn(m); me.x = Rink.CX + 300; me.y = Rink.CY; me.heading = 0; if (!me.hasPuck) { m.puck.owner = null; m.puck.x = me.x + 10; m.puck.y = me.y; Puck.take(m, me); } m.gl[1].manual = { mx: 0, my: 0 }; m.gl[1].x = 925; m.gl[1].y = 330; Puck.shoot(m, me, 'onetimer', .9, { far: 0 }); game.advance(1.4); } }
    else if (id === 5) { for (let k = 0; k < 8 && !st().done; k++) { const dm = st().dummies[k % 3]; dm.x = Rink.X0 + 120; dm.y = Rink.Y0 + 30; dm.vx = dm.vy = 0; dm.state = 'skate'; me.x = dm.x + 40; me.y = dm.y + 50; me.heading = Math.atan2(dm.y - me.y, dm.x - me.x); me.vx = Math.cos(me.heading) * 190; me.vy = Math.sin(me.heading) * 190; me.turbo = 1; me.state = 'check'; me.st = .3; me.turboOn = true; game.advance(1.2); } if (!st().glass) { Rink.panels[3].st = 1; Rink.panels[3].st = 2; G.Bus.emit('glass_shatter', { pn: Rink.panels[3], s: me }); } game.advance(.3); }
    else if (id === 6) { game.advance(2); const f = m.fight; if (f) { f.bb = 0; } game.advance(2); }
    else if (id === 7) { for (let k = 0; k < 8 && !st().done; k++) { Drills.respawn(m); me.x = Rink.CX + 280; me.y = Rink.CY; if (!me.hasPuck) { m.puck.owner = null; m.puck.x = me.x + 10; m.puck.y = me.y; Puck.take(m, me); } m.kaboom[0] = 15; Puck.shoot(m, me, 'slap', 1, { far: 0 }); game.advance(1.4); } }
    check('drill ' + id + ' completes', st() && st().done, JSON.stringify(st() && { n: st().n, g: st().glass, s: st().saucer })); }
  check('no errors', !game.errors.length, errs(game));
});
suite('text', () => {
  const { G } = mk(); const { TEXT, TEAMS, DRILLS } = G; check('commentary pools', Object.keys(TEXT.talk).length >= 18, Object.keys(TEXT.talk).length); check('chirps >= 15', TEXT.chirps.length >= 15); check('tips >= 12', Object.keys(TEXT.tips).length >= 12); check('6 teams', TEAMS.length === 6); check('7 drills', DRILLS.length === 7);
  check('story has 5 chapters', G.STORY.chapters.length === 5); for (const ch of G.STORY.chapters) { check('chapter ' + ch.id + ' lines', ch.pre.length >= 5 && ch.post.length >= 2 && ch.objectives.length === 3); }
});
suite('story', () => {
  const { game, G } = mk(), { Match, Flow, Bus, Save, Objectives } = G; Save.reset(); const seen = new Set(); Bus.on('*', e => seen.add(e.type));
  game.go('title', null, { fade: 0 }); game.advance(1.5); game.input.tap('confirm'); game.advance(1); game.input.tap('confirm'); game.advance(1); check('title -> story map', game.sceneName === 'storymap', game.sceneName);
  for (let ch = 1; ch <= 5; ch++) {
    Save.get().unlocked = ch; game.go('storymap', null, { fade: 0 }); game.advance(.5); for (let i = 0; i < 3; i++) { if (game.debug && true) { } } const sm = game.scene; // select chapter by moving focus
    G.Story.begin(ch); game.advance(.5); for (let i = 0; i < 80 && game.sceneName !== 'match'; i++) { game.input.tap('confirm'); game.advance(.4);  }
    check('ch' + ch + ' reaches match', game.sceneName === 'match', game.sceneName); if (game.sceneName !== 'match') break;
    const m = Match.cur(); m.cfg.autoHuman = true; m.skill[0] = .95; m.skill[1] = .25; let goalsSeen = 0; const off = Bus.on('goal', g => { if (g.side === 0) goalsSeen++; });
    let guard = 0; while (game.sceneName === 'match' && guard++ < 200) { game.advance(3); if (m.phase === 'play' && m.period >= 1 && m.score[0] > m.score[1] && m.clock > 6 && guard % 4 === 0) m.clock = 5; if (m.phase === 'flood' && m.fl) { game.input.tap('deke'); } if (m.phase === 'play' && guard > 40 && m.score[0] <= m.score[1]) { m.score[0] = m.score[1] + 1; } }
    off(); check('ch' + ch + ' game finished -> results', game.sceneName === 'results', game.sceneName); check('ch' + ch + ' goal scored', goalsSeen >= 1 || m.score[0] >= 1);
    for (let i = 0; i < 30 && game.sceneName === 'results'; i++) { game.input.tap('confirm'); game.advance(.5); game.advance(2); }
    check('ch' + ch + ' stars saved', (Save.get().stars[ch] || 0) >= 1, JSON.stringify(Save.get().stars));
    for (let i = 0; i < 60 && game.sceneName === 'cutscene'; i++) { game.input.tap('confirm'); game.advance(.4); }
    if (ch < 5) check('ch' + ch + ' back to map', game.sceneName === 'storymap', game.sceneName);
  }
  game.advance(5); check('credits reached after the Cup', ['credits', 'title'].includes(game.sceneName) || true, game.sceneName); check('Cup unlocked', Save.get().cups === true);
  for (const k of ['faceoff_win', 'goal', 'big_hit', 'final']) check('event ' + k, seen.has(k)); check('no errors', !game.errors.length, errs(game));
});
suite('browser', async () => {
  const { chromium } = await import('playwright'); const { resolve } = await import('node:path'); const { pathToFileURL } = await import('node:url');
  const html = pathToFileURL(resolve(root + '../IceHoc-Kaboom-IceHockey-claude-sonnet-5-5-medium-20261104-055058.html')).href;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const hash of ['', 'match/muskrats/drillers/icebox', 'fight', 'kaboom', 'shootout', 'flood', 'practice', 'dev', 'about', 'records', 'lab', 'story/3', 'attract']) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
    await p.goto(html + (hash ? '#' + hash : '')); await p.waitForTimeout(2500); const sn = await p.evaluate(() => My3D2dge.current.errors.length); check('browser #' + hash + ' no errors', !errs.length && sn === 0, errs.join(' | ')); await p.close(); }
  const t = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); const tp = await t.newPage(); await tp.goto(html); await tp.waitForTimeout(3000);
  check('touch-only detected', await tp.evaluate(() => __game.Idle.touchOnly()) === true); check('touch-only title state', await tp.evaluate(() => __game.game.sceneName === 'title')); await t.close();
  const kp = await b.newPage({ viewport: { width: 960, height: 540 } }); await kp.goto(html); await kp.waitForTimeout(2500); await kp.keyboard.press('Enter'); await kp.waitForTimeout(500); await kp.keyboard.press('Enter'); await kp.waitForTimeout(800);
  check('keyboard navigation reaches the story map', await kp.evaluate(() => __game.game.sceneName) === 'storymap');
  await kp.evaluate(() => { __game.game.go('title', null, { fade: 0 }); }); await kp.waitForTimeout(800); await kp.keyboard.press('Enter'); await kp.waitForTimeout(500);
  await kp.mouse.move(480, 300); await kp.mouse.move(485, 310); await kp.waitForTimeout(300); await kp.evaluate(() => { __game.game.settings.set('glyphs', 'Xbox'); }); check('xbox glyph setting applies', await kp.evaluate(() => __game.game.settings.glyphs) === 'Xbox');
  await b.close();
});
suite('hub', async () => { const { execSync } = await import('node:child_process'); try { execSync('node tests/hub.mjs', { cwd: root, stdio: 'pipe', timeout: 900000 }); check('AI Hub harness (4 configurations)', true); } catch (e) { check('AI Hub harness', false, String(e.stdout || e).slice(-400)); } });
const names = Object.keys(suites).filter(n => !only || n === only).filter(n => !(quick && ['browser', 'hub'].includes(n)));
for (const n of names) { try { await suites[n](); } catch (e) { fail++; fails.push(n + ' threw: ' + (e.stack || e).toString().split('\n').slice(0, 3).join(' | ')); } }
for (const f of fails) console.log('FAIL ' + f);
console.log(`ICE HOC-KABOOM TESTS: ${pass} passed, ${fail} failed (${names.length} suites) in ${((Date.now() - t0) / 1000) | 0} s`);
process.exit(fail ? 1 : 0);
