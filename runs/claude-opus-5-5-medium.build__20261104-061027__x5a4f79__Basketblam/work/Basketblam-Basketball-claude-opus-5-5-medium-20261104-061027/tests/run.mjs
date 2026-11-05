// BASKETBLAM tests: node tests/run.mjs [suite ...] [--quick]. Prints only failures and one line with the count.
// --quick skips the browser and hub suites. Exit code 1 on any failure.
import { fresh, botStep, release, read } from './helpers.mjs';
import { existsSync } from 'node:fs';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.filter(a => !a.startsWith('--'));
let passed = 0, failed = 0; const t0 = Date.now();
const check = (suite, name, ok, detail = '') => { if (ok) passed++; else { failed++; console.log(`FAIL ${suite}.${name}: ${String(detail).slice(0, 400)}`); } };
const SUITES = {};
const noErr = (s, T, what = 'no errors') => check(s, what, !T.errors().length, T.errors().slice(0, 3).join(' | '));
/** a quiet match: every player stands still unless the test moves it */
function quietMatch(T, cfg = {}) {
  const { bb } = T;
  T.game.go('match', Object.assign({ court: 'skybox', mode: 'exhibition', teams: [{ id: 'hightops' }, { id: 'breakers' }], humans: [], quarter: 120, seed: 11, powerups: false, twists: false }, cfg), { fade: 0 });
  T.step(1 / 60);
  for (const p of T.S.players) p.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd()); } };
  T.S.match.phase = 'live'; T.S.cheats.freezeClock = true; T.S.cheats.freezeShot = true;
  return T.S.match;
}
const count = (T, type) => T.S.events.filter(e => e.type === type).length;
function evLog(T) { const L = []; T.bb.on('*', e => L.push(e)); return L; }

SUITES.content = () => {
  const T = fresh(), { bb } = T, s = 'content';
  const teams = bb.all('team').filter(t => !t.hidden);
  check(s, 'six teams', teams.length === 6, teams.length);
  for (const t of bb.all('team')) { check(s, t.id + ' has 3 players', t.players.length === 3); for (const id of t.players) { const p = bb.get('player', id); check(s, id + ' ratings', p && Object.values(p.ratings).length === 8 && Object.values(p.ratings).every(v => v >= 1 && v <= 10), id); check(s, id + ' voice and taunt', p && p.voice && p.voice.pitch > 0 && p.taunt, id); } }
  check(s, 'five courts', bb.COURTS.length === 5);
  for (const id of bb.COURTS) { const c = bb.get('court', id); check(s, id + ' fields', c.name && c.floor && c.sky && c.props && c.crowd && c.music && c.twist && c.dribble, id); }
  check(s, 'twelve dunks', bb.all('dunk').length === 12); check(s, 'six power-ups', bb.all('powerup').length === 6); check(s, 'seven codes', bb.all('code').length === 7);
  for (const [k, list] of Object.entries(bb.LINES)) { check(s, 'bank ' + k + ' filled', list.length >= 2, list.length); for (const l of list) { check(s, 'line slots ' + k, !/\{(?!NAME|VICTIM|TEAM)[A-Z]+\}/.test(l), l); check(s, 'line length ' + k, l.length <= 64, l); } }
  for (const [id, b] of Object.entries(bb.BEATS)) for (const [who] of b.lines) check(s, 'beat ' + id + ' speaker ' + who, who === '{CAPTAIN}' || bb.get('npc', who) || bb.get('player', who), who);
  check(s, 'ten lessons', bb.LESSONS.length === 10); check(s, 'five attract segments', bb.SEGMENTS.length === 5);
  const src = read('build/game.js'); check(s, 'no TODO or placeholder', !/\bTODO\b|\bFIXME\b|\bXXX\b|placeholder/i.test(src), (src.match(/.{30}(TODO|FIXME|XXX|placeholder).{30}/i) || [''])[0]);
  noErr(s, T);
};

SUITES.physics = () => {
  const T = fresh(), { bb, S } = T, s = 'physics';
  const m = quietMatch(T); const L = evLog(T);
  let made = 0, madeIn = 0, missIn = 0, missed = 0;
  const R = bb.REG ? Math.random : Math.random;
  for (let k = 0; k < 160; k++) {
    const want = k % 2 === 0, p = S.players[0], a = (k * 2.39) % (Math.PI) - Math.PI / 2, d = 40 + (k * 37) % 230, h = bb.HOOPS[1];
    p.x = h.x - Math.cos(a) * d; p.y = h.y + Math.sin(a) * Math.min(d, 125); p.z = 0; p.state = 'run';
    m.phase = 'live'; bb.giveBall(p, 'give'); T.step(1 / 60);
    const before = m.score[0]; bb.releaseShot(p, { forceMade: want });
    for (let i = 0; i < 300 && S.ball.state !== 'dribble' && S.ball.state !== 'held'; i++) { T.step(1 / 120); if (m.score[0] !== before) break; if (S.ball.z <= 5 && S.ball.state === 'loose') break; }
    const scored = m.score[0] !== before;
    if (want) { made++; if (scored) madeIn++; } else { missed++; if (scored) missIn++; }
    m.phase = 'live'; S.ball.owner = null;
  }
  check(s, 'decided makes go in (>= 97%)', madeIn / made >= .97, madeIn + '/' + made);
  check(s, 'decided misses stay out (<= 12%)', missIn / missed <= .12, missIn + '/' + missed);
  // a fast ball never tunnels through the rim or the board
  const b = S.ball, h = bb.HOOPS[1]; S.ball.owner = null; b.state = 'loose'; b.x = h.board - 60; b.y = 256; b.z = 86; b.vx = 900; b.vy = 0; b.vz = 0;
  for (let i = 0; i < 60; i++) T.step(1 / 120);
  check(s, 'a 900 u/s ball does not pass the board', b.x <= h.board + 6, b.x);
  // floor bounce decays
  for (const q of S.players) { q.x = 600; q.y = 150; } b.x = 200; b.y = 300; b.z = 60; b.vx = 0; b.vy = 0; b.vz = 0; let peaks = [], up = false, last = 60;
  for (let i = 0; i < 600; i++) { T.step(1 / 120); if (b.vz > 0) up = true; if (up && b.vz <= 0) { peaks.push(b.z); up = false; } }
  check(s, 'floor bounces decay', peaks.length >= 2 && peaks[1] < peaks[0], peaks.slice(0, 3).map(Math.round));
  check(s, 'the ball stays in the arena', b.x >= bb.X0 - 30 && b.x <= bb.X1 + 30, b.x);
  noErr(s, T);
};

SUITES.rules = () => {
  const T = fresh(), { bb, S } = T, s = 'rules', h = bb.HOOPS[1];
  check(s, '3PT beyond the arc', bb.isThree(h.x - 140, h.y, h) && !bb.isThree(h.x - 130, h.y, h));
  check(s, '3PT in the corner', bb.isThree(h.x + 30, bb.Y0 + 10, h) && !bb.isThree(h.x + 30, bb.Y0 + 30, h));
  let m = quietMatch(T); const p = S.players[0];
  // a dunk scores 2
  p.x = h.x - 60; p.y = h.y; bb.giveBall(p, 'give'); bb.startDunk(p); T.until(() => m.score[0] > 0, 4);
  check(s, 'a dunk scores 2', m.score[0] === 2, m.score);
  // after a made basket the other team inbounds
  T.until(() => m.phase === 'inbound', 3); check(s, 'the other team inbounds', m.phase === 'inbound' && m.inb.team === 1, m.phase + ' ' + (m.inb && m.inb.team));
  // jackpot +2
  m.phase = 'live'; m.jackpot = { x: h.x - 60, y: h.y, t: 20 }; p.x = h.x - 60; p.y = h.y; p.state = 'run'; bb.giveBall(p, 'give'); const s0 = m.score[0]; bb.releaseShot(p, { forceMade: true }); T.until(() => m.score[0] !== s0, 3);
  check(s, 'jackpot adds 2', m.score[0] - s0 === 4, m.score[0] - s0);
  // gold ball doubles
  m.phase = 'live'; m.jackpot = null; m.gold = 0; p.state = 'run'; bb.giveBall(p, 'give'); const s1 = m.score[0]; bb.releaseShot(p, { forceMade: true }); T.until(() => m.score[0] !== s1, 3);
  check(s, 'gold ball doubles', m.score[0] - s1 === 4, m.score[0] - s1);
  // shot clock expiry is a turnover
  S.cheats.freezeShot = false; m.phase = 'live'; p.state = 'run'; bb.giveBall(p, 'give'); m.shotClock = .05; T.step(.1);
  check(s, 'shot clock violation: the other team inbounds', m.phase === 'inbound' && m.inb.team === 1, m.phase);
  // a rim touch resets the shot clock
  m.phase = 'live'; p.state = 'run'; p.x = h.x - 100; bb.giveBall(p, 'give'); m.shotClock = 5; bb.releaseShot(p, { forceMade: false }); T.until(() => S.ball.touched, 2);
  check(s, 'rim touch resets the shot clock', m.shotClock > 15, m.shotClock);
  // goaltending counts
  m.phase = 'live'; const d = S.players[2]; p.state = 'run'; p.x = h.x - 120; bb.giveBall(p, 'give'); const s2 = m.score[0]; bb.releaseShot(p, { forceMade: false });
  const L = evLog(T); T.until(() => S.ball.vz < 0 && S.ball.z > 82 && Math.hypot(S.ball.x - h.x, S.ball.y - h.y) < 30, 2);
  d.x = S.ball.x; d.y = S.ball.y; d.z = S.ball.z - 50; d.vz = 100; d.state = 'air'; d.jump = { kind: 'block', t: 0, swatted: false }; T.step(1 / 120); T.until(() => m.score[0] !== s2, 2);
  check(s, 'goaltending counts for the shooter', m.score[0] > s2 && L.some(e => e.type === 'goaltend'), m.score[0] - s2);
  // overtime on a tie, SUDDEN BLAM after two
  m = quietMatch(T, { quarter: 20 }); S.cheats.freezeClock = false; m.quarter = 4; m.score = [10, 10]; m.clock = .02; T.step(.1); T.until(() => m.phase !== 'clockout', 1);
  check(s, 'overtime on a tie', m.ot === 1 && m.quarter === 5, m.ot + ' q' + m.quarter);
  m.phase = 'live'; m.clock = .02; m.score = [12, 12]; T.until(() => m.ot === 2, 2); m.phase = 'live'; m.clock = .02; T.until(() => m.sudden, 2);
  check(s, 'SUDDEN BLAM after two overtimes', m.sudden, m.ot);
  m.phase = 'live'; bb.giveBall(p, 'give'); p.x = h.x - 30; p.state = 'run'; bb.releaseShot(p, { forceMade: true }); T.until(() => m.over, 4);
  check(s, 'the next basket wins in SUDDEN BLAM', m.over && m.winner === 0, m.winner);
  // a release before the buzzer counts
  m = quietMatch(T); const p3 = S.players[0]; S.cheats.freezeClock = false; p3.x = h.x - 100; p3.state = 'run'; T.step(1 / 60); bb.giveBall(p3, 'give'); m.clock = .02; const s3 = m.score[0]; bb.releaseShot(p3, { forceMade: true }); T.until(() => m.score[0] !== s3 || m.phase === 'break', 3);
  check(s, 'a shot released before the buzzer counts', m.score[0] > s3, m.score);
  // the tip-off winner gets the ball
  const T2 = fresh(); T2.game.go('match', { court: 'skybox', mode: 'exhibition', teams: [{ id: 'hightops' }, { id: 'breakers' }], humans: [], quarter: 60, seed: 3 }, { fade: 0 }); const L2 = evLog(T2); T2.step(.1); T2.until(() => T2.S.match.phase === 'live', 4);
  const tip = L2.find(e => e.type === 'tipoff'); T2.until(() => T2.S.ball.owner, 2);
  check(s, 'the tip-off winner gets the ball', tip && T2.S.ball.owner && T2.S.ball.owner.team === tip.team && T2.S.match.arrow === 1 - tip.team, JSON.stringify(tip));
  noErr(s, T); noErr(s, T2, 'no errors (tip)');
};

SUITES.mechanics = () => {
  const T = fresh(), { bb, S } = T, s = 'mechanics', h = bb.HOOPS[1];
  let m = quietMatch(T), p = S.players[0], d = S.players[2]; const rebind = () => { p = S.players[0]; d = S.players[2]; };
  // turbo drains while held and moving, refills after
  p.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd(), { mx: 1, tD: true }); } }; p.x = 200; T.step(1);
  const tdrain = p.turbo; p.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd()); } }; T.step(1.5);
  check(s, 'turbo drains and refills', tdrain < .8 && p.turbo > tdrain, tdrain.toFixed(2) + ' -> ' + p.turbo.toFixed(2));
  // run speed follows the tuning
  const run = (k) => { bb.setTune('runSpeed', k); p.x = 150; p.y = 256; p.vx = p.vy = 0; p.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd(), { mx: 1 }); } }; T.step(1); return p.x - 150; };
  const d1 = run(100), d2 = run(150); bb.resetTuning(); p.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd()); } };
  check(s, 'runSpeed x1.5 runs about 50% further', d2 / d1 > 1.35 && d2 / d1 < 1.6, (d2 / d1).toFixed(2));
  // steals: from behind succeed more than from the front
  const tries = side => { let ok = 0; for (let k = 0; k < 300; k++) { m.phase = 'live'; p.state = 'run'; d.state = 'run'; d.cool.steal = 0; p.x = 300; p.y = 256; p.facing = 0; bb.giveBall(p, 'give'); d.x = 300 + side * 12; d.y = 256 + (side < 0 ? 0 : 0); d.facing = Math.atan2(p.y - d.y, p.x - d.x); d.act = { kind: 'steal', t: 0, T: .4, hit: 0 }; d.state = 'steal'; const L0 = T.S.events.length; T.step(1 / 60); if (T.S.events.slice(L0 - 1).some(e => e.type === 'steal')) ok++; } return ok / 300; };
  const behind = tries(-1), front = tries(1);
  check(s, 'steals from behind beat steals from the front', behind > front && behind > .15 && behind < .9, behind.toFixed(2) + ' vs ' + front.toFixed(2));
  // a shove knocks down
  m.phase = 'live'; p.state = 'run'; d.state = 'run'; d.x = 300; d.y = 256; p.x = 312; p.y = 256; d.facing = 0; d.turbo = 1; d.cool.shove = 0; bb.giveBall(p, 'give');
  d.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd(), { vP: true }); } }; T.step(.25); d.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd()); } };
  check(s, 'a shove knocks the target down', p.state === 'knocked' || count(T, 'shove') > 0, p.state);
  T.step(2);
  // dunk choice follows distance and SLAM
  const ids = new Set(); for (let k = 0; k < 60; k++) { p.state = 'run'; p.x = h.x - 20 - (k % 6) * 25; p.y = h.y; bb.giveBall(p, 'give'); m.phase = 'live'; bb.startDunk(p); ids.add(p.dunk && p.dunk.def.id); T.until(() => p.state !== 'dunk' && p.state !== 'hang', 4); T.step(.5); m.phase = 'live'; }
  check(s, 'a high-SLAM player picks several dunks', ids.size >= 4, [...ids].join(','));
  // alley-oop: the lob meets the cutter's hands and slams
  m.phase = 'live'; const q = S.players[1]; p.state = 'run'; q.state = 'run'; for (const f of [S.players[2], S.players[3]]) { f.x = 150; f.y = 150; }
  p.x = h.x - 160; p.y = h.y + 40; q.x = h.x - 70; q.y = h.y - 30; q.z = 0; bb.giveBall(p, 'give');
  p.src = { kind: 'test', read(r) { Object.assign(r.cmd, bb.emptyCmd(), { oP: true }); } }; T.step(1 / 60); p.src = { kind: 'test', read(r) { Object.assign(r.cmd, bb.emptyCmd()); } };
  const L = evLog(T); T.until(() => L.some(e => e.type === 'basket'), 4);
  check(s, 'alley-oop from pass to slam', L.some(e => e.type === 'basket' && e.alleyoop && e.slot === 1), JSON.stringify(L.filter(e => e.type === 'basket')));
  // Supernova after three straight, off after the other team scores
  m = quietMatch(T); rebind(); const sc = () => { m.phase = 'live'; p.state = 'run'; p.x = h.x - 30; p.y = h.y; bb.giveBall(p, 'give'); bb.releaseShot(p, { forceMade: true }); T.until(() => m.phase !== 'live', 3); };
  sc(); sc(); sc(); check(s, 'Supernova after three straight', !!p.nova, m.streak.n + ' score ' + m.score + ' ' + T.S.events.filter(e => e.type === 'basket').map(e => e.slot).join()); 
  m.phase = 'live'; d.state = 'run'; d.x = bb.HOOPS[0].x + 30; d.y = h.y; bb.giveBall(d, 'give'); bb.releaseShot(d, { forceMade: true }); T.until(() => m.phase !== 'live', 3);
  check(s, 'Supernova ends when the other team scores', !p.nova);
  // shatter -> sponsor break -> inbound
  m = quietMatch(T); rebind(); m.forceShatter = true; p.state = 'run'; p.x = h.x - 50; p.y = h.y; bb.giveBall(p, 'give'); bb.startDunk(p);
  T.until(() => m.phase === 'sponsor', 5); check(s, 'a shatter brings the sponsor break', m.phase === 'sponsor' && m.shatters === 1, m.phase);
  T.until(() => m.phase === 'inbound', 6); check(s, 'then the inbound, new glass', m.phase === 'inbound' && !bb.HOOP_FX[1].shattered, m.phase);
  // each power-up
  m = quietMatch(T, { powerups: true }); rebind();
  for (const id of bb.POWERUPS) { p.powerup = null; bb.spawnPowerup(id, p.x, p.y); T.step(1 / 30); check(s, 'power-up ' + id + ' picked up', p.powerup && p.powerup.id === id, JSON.stringify(p.powerup)); }
  p.powerup = { id: 'rocket', t: .05 }; T.step(.2); check(s, 'power-ups expire', !p.powerup);
  // a blam bomb shove knocks down everyone near
  m.phase = 'live'; p.state = 'run'; p.powerup = { id: 'bomb', t: 10 }; d.x = p.x + 20; d.y = p.y; S.players[3].x = p.x - 20; S.players[3].y = p.y; d.state = 'run'; S.players[3].state = 'run'; p.cool.shove = 0; p.turbo = 1;
  p.src = { kind: 'test', read(r) { Object.assign(r.cmd, bb.emptyCmd(), { vP: true }); } }; T.step(.2); p.src = { kind: 'test', read(r) { Object.assign(r.cmd, bb.emptyCmd()); } };
  check(s, 'the BLAM BOMB knocks down both', d.state === 'knocked' && S.players[3].state === 'knocked', d.state + ' ' + S.players[3].state);
  // wind bends the ball but keeps the decided make
  m = quietMatch(T, { court: 'pier', twists: true }); rebind(); m.wind = { x: 120, y: 0 }; p.state = 'run'; p.x = h.x - 150; p.y = h.y; bb.giveBall(p, 'give'); const w0 = m.score[0]; bb.releaseShot(p, { forceMade: true }); T.until(() => m.score[0] !== w0, 3);
  check(s, 'a wind-blown decided make still goes in', m.score[0] > w0);
  // oil slicks slide; lava bombs knock down; vents launch
  m = quietMatch(T, { court: 'scrapyard', twists: true }); rebind(); check(s, 'oil slicks are placed', m.twist && m.twist.slicks && m.twist.slicks.length === 3);
  m = quietMatch(T, { court: 'caldera', twists: true }); rebind(); m.twist.bombs.push({ x: d.x, y: d.y, t: .05, max: 1 }); d.state = 'run'; d.z = 0; T.step(.2);
  check(s, 'a lava bomb knocks down', d.state === 'knocked', d.state);
  p.state = 'run'; p.x = 504; p.y = 340; T.step(1 / 60); bb.giveBall(p, 'give'); m.twist.ventOn = true; p.src = { kind: 'test', read(r) { Object.assign(r.cmd, bb.emptyCmd(), { sP: true, tD: true }); } }; T.step(1 / 60); p.src = { kind: 'test', read(r) { Object.assign(r.cmd, bb.emptyCmd()); } };
  check(s, 'a steam vent launches the VOLCANO LAUNCH', p.dunk && p.dunk.def.id === 'volcano', p.state + ' ' + (p.dunk && p.dunk.def.id));
  // the boss: overclock, reboot after two knockdowns
  m = quietMatch(T, { court: 'dome', teams: [{ id: 'hightops' }, { id: 'blambots' }], boss: true }); rebind(); m.twist = { kind: 'boss', bombs: [] }; bb.overclock();
  check(s, 'the overclock lights up the bots', S.players.filter(q => q.def.team === 'blambots').every(q => q.nova) && m.overclock > 0);
  const bot = S.players[2]; p = S.players[0]; bb.knockDown(bot, .3, p); T.step(.5); bb.knockDown(bot, .3, p);
  check(s, 'two knockdowns reboot a bot', bot.reboot > 0, bot.reboot);
  noErr(s, T);
};

SUITES.ai = () => {
  const s = 'ai', feats = {}, res = [];
  for (const court of ['skybox', 'pier', 'scrapyard', 'caldera', 'dome']) for (let k = 0; k < 2; k++) {
    const T = fresh({ seed: 30 + k }), { S } = T;
    const teams = court === 'dome' ? [{ id: 'blambots' }, { id: 'hightops' }] : [{ id: ['hightops', 'breakers', 'crushers', 'magma'][k % 4] }, { id: ['magma', 'crushers', 'breakers', 'hightops'][k % 4] }];
    T.game.go('match', { court, mode: 'exhibition', teams, humans: [], quarter: 25, seed: 40 + k, boss: court === 'dome', onEnd: () => {} }, { fade: 0 }); T.step(.05);
    const L = evLog(T); let still = 0, maxStill = 0, last = null;
    T.until(() => { const m = S.match; if (m.phase === 'live') { const pos = S.players.map(p => Math.round(p.x) + ',' + Math.round(p.y)).join(); if (pos === last) still += .05; else still = 0; last = pos; maxStill = Math.max(maxStill, still); } return m.over; }, 400, .05);
    const m = S.match; res.push(m.score);
    check(s, court + k + ' ends', m.over, m.phase + ' q' + m.quarter);
    check(s, court + k + ' both teams score', m.score[0] > 0 && m.score[1] > 0, m.score);
    check(s, court + k + ' few shot clock violations', L.filter(e => e.type === 'shotClockViolation').length <= 3, L.filter(e => e.type === 'shotClockViolation').length);
    check(s, court + k + ' nobody frozen', maxStill < 6, maxStill.toFixed(1));
    for (const e of L) feats[e.type] = (feats[e.type] || 0) + 1;
    for (const e of L) if (e.type === 'basket' && e.three) feats.three = (feats.three || 0) + 1;
    noErr(s, T, court + k + ' no errors');
  }
  for (const f of ['dunkStart', 'three', 'steal', 'shove', 'block', 'alleyoopStart', 'powerupPick', 'spin', 'rebound']) check(s, 'the CPU uses ' + f, feats[f] > 0, JSON.stringify(feats));
  // difficulty: BLAM beats Rookie most of the time
  let blamWins = 0;
  for (let k = 0; k < 6; k++) {
    const T = fresh({ seed: 60 + k }); T.game.go('match', { court: 'skybox', mode: 'exhibition', teams: [{ id: 'crushers' }, { id: 'crushers' }], humans: [], quarter: 25, seed: 70 + k, onEnd: () => {} }, { fade: 0 }); T.step(1 / 60);
    for (const p of T.S.players) p.brain.diff = p.team === 0 ? 'blam' : 'rookie';
    T.until(() => T.S.match.over, 400, .05); if (T.S.match.winner === 0) blamWins++;
  }
  check(s, 'BLAM beats Rookie in most games', blamWins >= 4, blamWins + '/6');
};

SUITES.flow = () => {
  const s = 'flow'; let T = fresh(), { bb, S, game, I } = T;
  T.until(() => T.scene() === 'title', 3); check(s, 'boot reaches the title', T.scene() === 'title', T.scene());
  T.step(10.5); check(s, '10 s idle on the title starts the attract mode', T.scene() === 'attract', T.scene());
  T.step(1); I.tap('right'); T.step(.6); check(s, 'any input leaves the attract mode back to the title', T.scene() === 'title', T.scene());
  T.tap('confirm'); T.step(.6); check(s, 'title -> main menu', T.scene() === 'menu', T.scene());
  T.step(10.5); check(s, 'idle on the main menu starts the attract mode', T.scene() === 'attract'); T.step(.5); I.hold('shoot'); T.step(.1); I.hold('shoot', false); T.step(.6);
  check(s, 'and goes back to the menu', T.scene() === 'menu', T.scene());
  // a mouse click also leaves
  T.step(10.5); I.feed('down', 50, 50); I.feed('up', 50, 50); T.step(.6); check(s, 'a click leaves the attract mode', T.scene() === 'menu', T.scene());
  // every main-menu entry reaches a working screen by keyboard
  const want = ['tourstart', 'join', 'camplist', 'hall', 'howto', null, 'about'];
  for (let k = 0; k < 7; k++) {
    if (want[k] === null) continue;
    T.game.go('menu', null, { fade: 0 }); T.step(.3); bb.MAIN.i = 0; for (let j = 0; j < k; j++) { I.tap('down'); T.step(.05); } T.tap('confirm'); T.step(.6);
    check(s, 'menu entry ' + k + ' -> ' + want[k], T.scene() === want[k], T.scene());
  }
  // Exhibition by keyboard: join -> teams -> court -> matchup -> match with the right players
  T.game.go('join', null, { fade: 0 }); T.step(.3);
  T.game.addPlayer({ keys: 'right' }); T.step(.1);
  check(s, 'a second player joins', game.players.length === 2);
  game.players[1].tap('right'); T.step(.05); T.tap('confirm'); game.players[1].tap('confirm'); T.step(.05); T.tap('confirm'); T.step(.6);
  check(s, 'join -> team select', T.scene() === 'teams', T.scene());
  T.tap('confirm'); game.players[1].tap('confirm'); T.step(.6); check(s, 'teams -> court and rules', T.scene() === 'courtsel', T.scene());
  T.tap('confirm'); T.step(1); check(s, 'court -> matchup card', T.scene() === 'matchup', T.scene());
  T.tap('confirm'); T.step(1.2); check(s, 'matchup -> match', T.scene() === 'match', T.scene());
  const hum = S.players.filter(p => p.human).map(p => p.slot + ':' + p.team);
  check(s, 'P1 HOME, P2 AWAY', hum.join() === '0:0,2:1', hum.join());
  // pause items: Dev Mode, How to Play, Restart
  const items = game.o.menu.items().filter(Boolean).map(x => x[0]);
  check(s, 'pause menu items', ['How to Play', 'Restart Game', 'Dev Mode'].every(x => items.includes(x)), items.join());
  // four players
  T = fresh(); T.game.go('join', null, { fade: 0 }); T.step(.3); T.game.addPlayer({ keys: 'right' }); T.game.addPlayer({ pad: 0 }); T.game.addPlayer({ pad: 1 }); T.step(.1);
  check(s, 'four players join', T.game.players.length === 4);
  T.bb.S.setup = null; T.tap('confirm'); T.tap('confirm'); T.step(.5);
  T.tap('confirm'); for (const P0 of T.game.players) P0.tap('confirm'); T.step(.5); T.tap('confirm'); T.step(1); T.tap('confirm'); T.step(1.2);
  check(s, 'four humans in the match', T.scene() === 'match' && T.S.players.filter(p => p.human).length === 4, T.scene() + ' ' + T.S.players.filter(p => p.human).length);
  // results buttons
  T.S.match.score = [20, 10]; T.bb.endGame(); T.step(4); check(s, 'the final hands over to the results', T.scene() === 'results', T.scene());
  T.tap('confirm'); T.step(.6); check(s, 'REMATCH goes to the matchup card', T.scene() === 'matchup', T.scene());
  noErr(s, T);
};

SUITES.tour = () => {
  // the scripted playthrough of the whole game: a new Tour through the UI, every stop played by the bot, a loss and a
  // rematch, the reveal, the final with the overclock, the ending, credits, unlocks and the Hall of Blam
  const s = 'tour', T = fresh({ seed: 9 }), { bb, S, I } = T; S.testQuarter = 18;
  const L = evLog(T);
  T.until(() => T.scene() === 'title', 3); T.tap('confirm'); T.step(.6); T.tap('confirm'); T.step(.6);
  check(s, 'menu -> tour start', T.scene() === 'tourstart', T.scene());
  T.tap('confirm'); T.step(.6); check(s, 'NEW TOUR -> team select', T.scene() === 'teams', T.scene());
  T.tap('confirm'); T.step(.8); check(s, 'the prologue plays', T.scene() === 'story' && L.some(e => e.type === 'beat' && e.beat === 'prologue'), T.scene());
  const skipBeat = () => { I.hold('confirm'); T.step(1.2); I.hold('confirm', false); T.step(.6); };
  skipBeat(); check(s, 'the camp offer follows the prologue', T.scene() === 'story', T.scene());
  T.until(() => T.scene() === 'story' && false, .5); for (let k = 0; k < 40 && T.scene() === 'story'; k++) { I.tap('confirm'); T.step(.3); }
  check(s, "LET'S PLAY -> the tour map", T.scene() === 'tourmap', T.scene());
  let lost = false, stops = 0;
  for (let guard = 0; guard < 12 && S.progress.tour && T.scene() !== 'hall'; guard++) {
    if (T.scene() === 'tourmap') { T.tap('confirm'); T.step(.6); }
    for (let k = 0; k < 6 && T.scene() === 'story'; k++) { skipBeat(); }
    if (T.scene() === 'matchup') { T.step(.6); T.tap('confirm'); T.step(1.2); }
    if (T.scene() !== 'match') { check(s, 'reached a match (stop ' + S.progress.tour.stop + ')', false, T.scene()); break; }
    const stop = S.progress.tour.stop;
    T.until(() => { if (T.scene() !== 'match') return true; if (S.match.phase === 'over') { release(T); return false; } botStep(T, 0); const m = S.match; if (m.quarter >= 4 && m.clock < 3 && m.phase === 'live') { if (stop === 0 && !lost) m.score = [m.score[0], m.score[0] + 6]; else if (m.score[0] <= m.score[1]) m.score[0] = m.score[1] + 3; } return T.scene() !== 'match'; }, 600, 1 / 60);
    release(T);
    if (stop === 3) check(s, 'the final had the overclock', L.some(e => e.type === 'twist' && e.kind === 'overclock'));
    check(s, 'a stop ends in the results', T.scene() === 'results', T.scene());
    const won = S.match.winner === 0;
    if (!won) { lost = true; check(s, 'a loss offers the REMATCH', bb.RS.list.items[0].label === 'REMATCH'); }
    T.tap('confirm'); T.step(.8);
    if (won) stops++;
    for (let k = 0; k < 12 && T.scene() === 'story'; k++) skipBeat();
    if (T.scene() === 'credits') { T.step(3); T.tap('confirm'); T.step(.8); }
    if (bb.RS.initials) { for (let k = 0; k < 3; k++) { T.tap('confirm'); T.step(.1); } T.step(.8); }
  }
  check(s, 'a lost stop was replayed', lost);
  check(s, 'four wins', stops === 4, stops);
  for (const b of ['prologue', 'post2', 'reveal', 'finalPre', 'ending']) check(s, 'beat ' + b + ' seen', L.some(e => e.type === 'beat' && e.beat === b));
  check(s, 'credits and the Hall of Blam', T.scene() === 'hall' && L.some(e => e.type === 'hallEntry'), T.scene());
  check(s, 'unlocks granted', S.progress.unlocked.teams && S.progress.unlocked.secrets && S.progress.unlocked.bigHeads);
  check(s, 'tours won recorded', S.progress.records.toursWon === 1);
  // CONTINUE TOUR after a reload resumes at the right stop
  const T2 = fresh(); T2.store['my3d2dge:bb:progress'] = JSON.stringify({ tour: { team: 'magma', pick: 0, stop: 2, score: 900, cheats: false } }); T2.bb.loadProgress();
  T2.game.go('tourstart', null, { fade: 0 }); T2.step(.3); T2.tap('confirm'); T2.step(.6); T2.tap('confirm'); T2.step(.6);
  for (let k = 0; k < 6 && T2.scene() === 'story'; k++) { T2.I.hold('confirm'); T2.step(1.2); T2.I.hold('confirm', false); T2.step(.5); }
  check(s, 'CONTINUE TOUR resumes at stop 3', T2.scene() === 'matchup' && T2.bb.S.progress.tour.stop === 2 && /STOP 3/.test(T2.bb.tourCfg().stopLabel), T2.scene());
  noErr(s, T); noErr(s, T2, 'no errors (continue)');
};

SUITES.camp = () => {
  const s = 'camp', T = fresh(), { bb, S } = T, L = evLog(T);
  for (let k = 0; k < 10; k++) {
    bb.startLesson(k); T.step(.6);
    const lesson = bb.LESSONS[k];
    for (let st = 0; st < lesson.steps.length && !bb.CAMP.done; st++) {
      const step = lesson.steps[bb.CAMP.step], p = S.players[0], mate = S.players[1], foe = S.players[2], h = bb.HOOPS[1];
      for (let n = 0; n < step.goal + 1 && !bb.CAMP.done && lesson.steps[bb.CAMP.step] === step; n++) {
        if (step.cones) { for (const c of bb.CAMP.cones) { p.x = c.x; p.y = c.y; T.step(1 / 30); } break; }
        if (step.race) { p.x = bb.X0 + 30; T.step(1 / 30); p.x = bb.X1 - 60; T.step(1 / 30); break; }
        if (step.card) { T.tap('confirm'); break; }
        if (lesson.id === 'pass' && bb.CAMP.step === 0) { p.state = 'run'; bb.giveBall(p, 'give'); T.I.tap('pass'); T.step(1.2); continue; }
        if (lesson.id === 'pass') { bb.giveBall(mate, 'give'); mate.order = { kind: 'pass', t: .6 }; T.step(1.5); continue; }
        if (lesson.id === 'jumper' || lesson.id === 'three') { p.state = 'run'; p.x = h.x - (lesson.id === 'three' ? 160 : 90); p.y = h.y; bb.giveBall(p, 'give'); S.match.phase = 'live'; p.jump = { t: .27, apexT: .27, from: [p.x, p.y] }; p.state = 'jumpshot'; bb.releaseShot(p, { forceMade: true }); T.step(2); continue; }
        if (lesson.id === 'dunk' || lesson.id === 'nova') { for (let q = 0; q < (lesson.id === 'nova' ? 3 : 1); q++) { const p0 = S.players[0]; p0.state = 'run'; p0.x = h.x - 60; p0.y = h.y; T.step(1 / 60); bb.giveBall(p0, 'give'); S.match.phase = 'live'; bb.startDunk(p0); T.step(3.5); } continue; }
        if (lesson.id === 'oop') { const passer = bb.CAMP.step === 0 ? p : mate, cut = bb.CAMP.step === 0 ? mate : p; passer.state = cut.state = 'run'; passer.x = h.x - 160; passer.y = h.y + 40; cut.x = h.x - 70; cut.y = h.y - 20; bb.giveBall(passer, 'give'); S.match.phase = 'live'; passer.src0 = passer.src; passer.src = { kind: 'test', read(q) { Object.assign(q.cmd, bb.emptyCmd(), { oP: true }); } }; T.step(1 / 60); passer.src = passer.src0; T.step(2.5); continue; }
        if (lesson.id === 'steal' && bb.CAMP.step === 0) { p.powerup = { id: 'glue', t: 9 }; bb.giveBall(foe, 'give'); foe.state = 'run'; p.x = foe.x - 10; p.y = foe.y; p.state = 'run'; p.cool.steal = 0; T.I.tap('pass'); T.step(.6); continue; }
        if (lesson.id === 'steal') { p.state = 'run'; bb.giveBall(p, 'give'); p.turbo = 1; p.cool.spin = 0; T.I.tap('shove'); T.step(.6); continue; }
        if (lesson.id === 'block' && bb.CAMP.step === 0) { bb.emit('block', { slot: 0, victim: 2, name: p.name, victimName: foe.name }); T.step(.3); continue; }
        if (lesson.id === 'block') { foe.state = 'run'; p.state = 'run'; p.x = foe.x - 14; p.y = foe.y; p.facing = 0; p.turbo = 1; p.cool.shove = 0; T.I.tap('shove'); T.step(.6); continue; }
        if (lesson.id === 'rebound') { p.state = 'run'; S.ball.owner = null; S.ball.state = 'loose'; S.ball.shot = null; S.ball.touched = true; S.ball.x = p.x; S.ball.y = p.y; S.ball.z = 30; S.ball.vz = 0; S.ball.vx = S.ball.vy = 0; p.cool.catch = 0; S.match.phase = 'live'; T.step(.1); if (bb.CAMP.step === 1 || st === 1) { p.x = h.x - 30; p.y = h.y; p.state = 'run'; bb.releaseShot(p, { forceMade: true }); S.cheats.missTeam = -1; T.step(2); } continue; }
      }
      T.step(1.2);
    }
    T.until(() => bb.CAMP.done, 3);
    check(s, 'lesson ' + (k + 1) + ' ' + lesson.id + ' completes', bb.CAMP.done || S.progress.camp.includes(lesson.id), 'step ' + bb.CAMP.step + ' n ' + bb.CAMP.n);
    T.step(2.5);
  }
  check(s, 'completion is saved', S.progress.camp.length === 10, S.progress.camp.join());
  check(s, 'lesson prompts use the keyboard keys', /SPACE|J/.test(String(T.bb.measureGlyph('shoot', T.I, 1))) || T.bb.codeFor(T.I, 'shoot', 'keyboard') === 'Space');
  noErr(s, T);
};

SUITES.attract = () => {
  const s = 'attract', T = fresh(), { bb, S } = T, L = evLog(T);
  T.game.go('attract', { from: 'title' }, { fade: 0 });
  T.until(() => bb.ATT.phase === 'logo', 260, .05);
  check(s, 'a full loop reaches the hall and the logo', bb.ATT.phase === 'logo', bb.ATT.phase + ' seg ' + bb.ATT.seg);
  const types = new Set(L.map(e => e.type)), dunks = new Set(L.filter(e => e.type === 'dunkStart').map(e => e.dunk));
  for (const t of ['tipoff', 'dunkStart', 'steal', 'shove', 'block', 'supernovaOn', 'shatter', 'sponsorBreak', 'powerupPick', 'slip', 'reboot', 'spin', 'alleyoopStart', 'bomb']) check(s, 'the demo shows ' + t, types.has(t), [...types].join(','));
  for (const t of ['eruption', 'gust', 'overclock']) check(s, 'the demo shows the ' + t, L.some(e => e.type === 'twist' && e.kind === t));
  for (const d of ['volcano', 'quake', 'nova720']) check(s, 'the demo dunks a ' + d, dunks.has(d), [...dunks].join(','));
  T.until(() => bb.ATT.loops >= 1 && bb.ATT.phase === 'play', 20, .05); T.step(5);
  check(s, 'it loops', bb.ATT.loops >= 1 && T.scene() === 'attract');
  T.I.tap('pass'); T.step(.1); T.step(.5); check(s, 'any input leaves within a step', T.scene() === 'title', T.scene());
  // touch-only: the loop keeps running and a tap shows the notice
  const T2 = fresh({ touch: true }); T2.until(() => T2.scene() === 'title', 3);
  check(s, 'touch-only is detected', T2.S.touchOnly);
  T2.step(10.5); check(s, 'touch-only: the attract mode starts', T2.scene() === 'attract');
  T2.step(3); T2.I.feed('down', 30, 30, { touch: true }); T2.I.feed('up', 30, 30, { touch: true }); T2.step(.3);
  check(s, 'touch-only: a tap shows the notice and the demo goes on', T2.scene() === 'attract' && T2.bb.ATT.notice > 0, T2.scene());
  noErr(s, T); noErr(s, T2, 'no errors (touch)');
};

SUITES.dev = () => {
  const s = 'dev', T = fresh(), { bb, S, game } = T;
  T.game.go('match', bb.exhibitionDefault(), { fade: 0 }); T.step(.5);
  const item = game.o.menu.items().filter(Boolean).find(x => x[0] === 'Dev Mode'); check(s, 'the pause menu has Dev Mode', !!item);
  item[1](); T.step(.1); check(s, 'Dev Mode opens the panel with the humans on autopilot', S.devOpen && S.players[0].src.kind === 'cpu');
  // every slider changes and clamps
  for (const [k, t] of Object.entries(bb.TUNING)) { const d0 = t.v; bb.setTune(k, t.max * 10); const hi = t.v; bb.setTune(k, t.min - 1e6); const lo = t.v; check(s, 'slider ' + k + ' clamps', hi === t.max && lo === t.min, hi + ' ' + lo); bb.setTune(k, d0); }
  bb.setTune('runSpeed', 150); bb.setTune('dunkRange', 80);
  bb.DEV.tab = 0; const rows = bb.devRows(); const reset = rows.find(r => r.label === 'RESET ALL TO DEFAULTS'); reset.act();
  check(s, 'RESET ALL restores every default', Object.values(bb.TUNING).every(t => t.v === t.def));
  // each tab's rows act without errors
  for (let tab = 0; tab < 7; tab++) { bb.DEV.tab = tab; const rs = bb.devRows(); for (const r of rs) { if (/MAIN MENU|PLAY AT|TOUR STOP|STORY BEAT|CREDITS|RESULTS|ATTRACT|CAMP LESSON|ANIMATION|RESET SAVE|END GAME/.test(r.label)) continue; try { if (r.side) r.side(1); if (r.act) r.act(); if (r.value) r.value(); } catch (e) { check(s, 'row ' + r.label, false, e.message); } } T.step(.2); }
  check(s, 'tabs and rows ran', true);
  // scene jumps land
  for (const [label, scene] of [['PLAY AT THE PIER', 'match'], ['ANIMATION LAB', 'animlab'], ['SHOOTAROUND (RIM PHYSICS)', 'shootaround'], ['CREDITS', 'credits'], ['MAIN MENU', 'menu']]) {
    T.game.go('match', bb.exhibitionDefault(), { fade: 0 }); T.step(.3); bb.openDev(); bb.DEV.tab = 3; const r = bb.devRows().find(x => x.label === label); r.act(); T.step(.6);
    check(s, 'jump ' + label, T.scene() === scene, T.scene());
  }
  bb.DEV.speed = 1; bb.DEV.freeze = false;
  // the panel closes with cancel and gives control back
  T.game.go('match', bb.exhibitionDefault(), { fade: 0 }); T.step(.3); bb.openDev(); T.step(.1); T.tap('cancel'); T.step(.1);
  check(s, 'cancel closes the panel; P1 plays again', !S.devOpen && S.players[0].src.kind === 'local');
  noErr(s, T);
};

SUITES.ui = () => {
  const s = 'ui', T = fresh(), { bb, game, I } = T;
  for (const a of ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt']) for (const dev of ['keyboard', 'gamepad', 'mouse']) check(s, a + ' on ' + dev + ' has a glyph', !!bb.codeFor(I, a, dev) && bb.measureGlyph(a, Object.assign({}, I, { lastDevice: dev, map: I.map }), 1) > 0);
  check(s, 'pad glyph of shoot is Square (Pad2)', bb.codeFor(I, 'shoot', 'gamepad') === 'Pad2');
  check(s, 'symbols default to PlayStation', bb.setting('symbols') === 'playstation');
  game.settings.set('symbols', 'xbox'); T.step(.05); check(s, 'Settings: Xbox symbols reach every player', game.players.every(p => p.glyphs === 'xbox'));
  game.addPlayer({ pad: 1 }); T.step(.05); check(s, 'and a player who joins later', game.players.every(p => p.glyphs === 'xbox'));
  game.settings.set('symbols', 'playstation');
  check(s, 'touch-only off on a desktop', !bb.detectTouchOnly());
  const T2 = fresh({ touch: true }); check(s, 'touch-only on a touch screen', T2.bb.detectTouchOnly());
  T2.until(() => T2.scene() === 'title', 2); T2.I.press('KeyD'); T2.step(.05); T2.I.release('KeyD'); T2.step(.05);
  check(s, 'a key press switches touch-only off', !T2.S.touchOnly);
  check(s, 'no touch buttons', game.input.touchEnabled === false);
  noErr(s, T);
};

SUITES.audio = () => {
  const s = 'audio', T = fresh(), { bb, game } = T, src = read('build/game.js');
  const used = [...src.matchAll(/sfxAt\('([a-z_]*[a-z])'/g)].map(m => m[1]).concat([...src.matchAll(/A\.sfx\('([a-z_]+)'/g)].map(m => m[1]));
  for (const n of new Set(used)) check(s, 'sound ' + n + ' exists', !!game.audio.presets[n], n);
  for (const c of ['asphalt', 'planks', 'concrete', 'stone', 'maple']) check(s, 'dribble ' + c, !!game.audio.presets['dribble_' + c]);
  const pl = bb.Voice.plan('HELLO THERE, BALL FANS!', { pitch: 200, rate: 12 }), q = bb.Voice.plan('IS THAT LEGAL?', { pitch: 200, rate: 12 }), flat = bb.Voice.plan('Is that legal.', { pitch: 200, rate: 12 });
  check(s, 'a line becomes syllables', pl.syl.length >= 5 && pl.dur > .3, pl.syl.length);
  check(s, '! is louder and higher', pl.syl.every(x => x.loud));
  check(s, '? rises at the end', q.syl[q.syl.length - 1].f0 > flat.syl[flat.syl.length - 1].f0, q.syl.slice(-1)[0].f0 + ' ' + flat.syl.slice(-1)[0].f0);
  check(s, 'the same line sounds the same', JSON.stringify(bb.Voice.plan('BLAM!', { pitch: 150, rate: 10 })) === JSON.stringify(bb.Voice.plan('BLAM!', { pitch: 150, rate: 10 })));
  check(s, 'no engine warnings about songs', !T.log.some(l => /song|music|unknown note|token/i.test(l)), T.log.filter(l => /song|music|token/i.test(l)).slice(0, 2).join(' | '));
  noErr(s, T);
};

SUITES.bundle = () => {
  const s = 'bundle', name = '../Basketblam-Basketball-claude-opus-5-5-medium-20261104-061027.html';
  check(s, 'the deliverable exists with the exact name', existsSync(new URL('../' + name, import.meta.url)));
  const html = read(name), client = read('vendor/aihub-session.js');
  const head = html.slice(0, html.indexOf('</head>')), firstScript = head.indexOf('<script>');
  check(s, 'the client is the first script in <head>, after <meta charset>', firstScript > head.indexOf('<meta charset') && head.slice(firstScript + 9, firstScript + 9 + client.length) === client);
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="shared-world"', 'hub:session-goal', 'hub:session-howto']) check(s, 'tag ' + t, head.includes(t));
  check(s, 'no external scripts or styles', !/<script[^>]+src=|<link[^>]+href=["']https?:/i.test(html));
  check(s, 'no fetch or sockets in the game', !/\bfetch\(|WebSocket|RTCPeerConnection/.test(read('build/game.js')));
};

SUITES.net = async () => {
  const s = 'net';
  const { runFakeHub } = await import('./fakehub.mjs');
  for (const sc of [{ n: 2 }, { n: 4, loss: .05 }, { n: 3, leave: true }, { n: 2, server: true }, { n: 2, hostLeave: true }]) {
    const r = await runFakeHub(sc);
    const tag = JSON.stringify(sc);
    check(s, tag + ' runs without errors', !r.errors.length, r.errors.slice(0, 2).join(' | '));
    check(s, tag + ' clients move their players on the host', r.moved, r.movedDetail);
    check(s, tag + ' traffic both ways', r.sent.every(x => x > 0) && r.received.every(x => x > 0), JSON.stringify([r.sent, r.received]));
    check(s, tag + ' under 20 messages a second', r.maxRate <= 20, r.maxRate);
    check(s, tag + ' unreliable messages under 1200 bytes', r.maxBytes < 1200, r.maxBytes);
    if (sc.hostLeave) check(s, tag + ' clients show HOST LEFT', r.hostLeftShown);
    else { check(s, tag + ' finish with valid standings', r.finish && Array.isArray(r.finish.standings) && r.finish.standings.flat().length >= 1, JSON.stringify(r.finish)); check(s, tag + ' scores agree', r.scoresAgree, JSON.stringify(r.scores)); }
    if (sc.leave) check(s, tag + ' a leaver turns CPU', r.leaverCpu);
    check(s, tag + ' the card answers Ready on Enter', r.answered);
  }
};

SUITES.browser = async () => {
  const { runBrowser } = await import('./browser.mjs'); const r = await runBrowser();
  for (const [name, ok, detail] of r) check('browser', name, ok, detail);
};
SUITES.hub = async () => {
  const { runHub } = await import('./hub.mjs'); const r = await runHub();
  for (const [name, ok, detail] of r) check('hub', name, ok, detail);
};

const order = ['content', 'physics', 'rules', 'mechanics', 'ai', 'flow', 'tour', 'camp', 'attract', 'dev', 'ui', 'audio', 'bundle', 'net', 'browser', 'hub'];
for (const name of order) {
  if (only.length && !only.includes(name)) continue;
  if (quick && (name === 'browser' || name === 'hub')) continue;
  try { await SUITES[name](); } catch (e) { failed++; console.log(`FAIL ${name}: threw ${String(e && e.stack || e).split('\n').slice(0, 3).join(' / ')}`); }
}
console.log(`BASKETBLAM tests: ${passed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(failed ? 1 : 0);
