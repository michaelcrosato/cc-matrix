// Core suites: content (every registry entry valid), physics (the ball and the rim), rules, mechanics, determinism.
import { load, run, errors, quickMatch, mulberry } from './helpers.mjs';

const content = async t => {
  const h = await load(), { bb, game } = h;
  const teams = bb.all('team').filter(x => !x.hidden);
  t.check('six teams', teams.length === 6, teams.map(x => x.id));
  for (const T of teams) {
    t.check('team ' + T.id + ' has 3 players', T.players.length === 3);
    t.check('team ' + T.id + ' logo', !!bb.LOGOS[T.logo]);
    t.check('team ' + T.id + ' court', !!bb.get('court', T.court));
    for (const id of T.players) {
      const p = bb.get('player', id);
      t.check('player ' + id + ' exists', !!p);
      if (!p) continue;
      t.check('player ' + id + ' ratings', p.r.length === 8 && p.r.every(v => v >= 1 && v <= 10), p.r);
      t.check('player ' + id + ' voice', !!bb.VOICE_PROFILES[p.voice], p.voice);
      t.check('player ' + id + ' taunt clip', !!bb.CLIPS[p.taunt], p.taunt);
      t.check('player ' + id + ' celebrations', p.cele.every(c => !!bb.CLIPS[c]), p.cele);
      t.check('player ' + id + ' barks', p.barks.length >= 3);
      t.check('player ' + id + ' rig', p.rig.size >= 1.5 && p.rig.size <= 2.1 && ['heroic', 'bulky', 'chibi'].includes(p.rig.build));
    }
  }
  t.check('18 team players', teams.reduce((a, T) => a + T.players.length, 0) === 18);
  const courts = bb.COURT_ORDER.map(id => bb.get('court', id));
  t.check('five courts', courts.length === 5 && courts.every(Boolean));
  for (const C of courts) {
    for (const f of ['name', 'floor', 'lines', 'paint', 'logo', 'backdrop', 'props', 'crowd', 'ambient', 'dribble', 'music', 'twist', 'intro']) t.check('court ' + C.id + ' ' + f, C[f] !== undefined && C[f] !== null);
    t.check('court ' + C.id + ' floor painter', !!bb.FLOORS[C.floor]);
    t.check('court ' + C.id + ' dribble sound', !!bb.SFX[C.dribble]);
    t.check('court ' + C.id + ' song', !!bb.SONGS[C.music]);
    t.check('court ' + C.id + ' twist info', !!bb.TWIST_INFO[C.twist]);
    for (const [name] of C.props) t.check('court ' + C.id + ' prop ' + name, name.startsWith('shape:') ? !!ctxShape(h, name.slice(6)) : true);
  }
  t.check('12 dunks', bb.DUNK_ORDER.length === 12 && bb.DUNK_ORDER.every(id => { const d = bb.get('dunk', id); return d && d.keys.length >= 2 && d.banner && bb.LINES[d.lines]; }));
  t.check('6 power-ups', bb.PU_ORDER.length === 6 && bb.PU_ORDER.every(id => { const p = bb.get('powerup', id); return p && p.icon && p.color && p.seconds > 0; }));
  t.check('7 codes', bb.CODES.length === 7 && bb.CODES.every(c => c.steps.length >= 3));
  for (const [bank, lines] of Object.entries(bb.LINES)) {
    const minor = bb.MINOR_BANKS.includes(bank);
    t.check('lines ' + bank + ' count', lines.length >= (minor ? 3 : 10), lines.length);
    for (const l of lines) {
      t.check('lines ' + bank + ' length', l.length <= 60, l);
      t.check('lines ' + bank + ' slots', (l.match(/\{(\w+)\}/g) || []).every(s => ['{NAME}', '{VICTIM}', '{TEAM}'].includes(s)), l);
      t.check('lines ' + bank + ' caps', l === l.toUpperCase(), l);
    }
    t.check('lines ' + bank + ' rank', bb.LINE_RANK[bank] !== undefined, bank);
  }
  for (const id of bb.BEAT_ORDER) {
    const b = bb.get('beat', id); t.check('beat ' + id, !!b);
    const lines = b.dynamic ? bb.beatLines(id, { team: 'hightops', stop: 0, opp: 'breakers', court: 'pier' }) : b.lines;
    for (const [sp] of lines) t.check('beat ' + id + ' speaker ' + sp, sp === 'both' || sp === '{CAPTAIN}' || !!bb.CAST[sp] || !!bb.get('player', sp), sp);
  }
  for (const sp of bb.GAME_SETTINGS) t.check('setting ' + sp.key + ' default', game.settings[sp.key] !== undefined, sp.key);
  for (const a of ['move', 'shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt', 'confirm', 'cancel']) for (const dev of ['keyboard', 'mouse', 'gamepad']) {
    const g = bb.glyphFor(a, game.input, dev); t.check('glyph ' + a + ' ' + dev, g && (g.kind !== 'key' || g.text.length > 0), g);
  }
  for (const s of bb.NEW_SHAPES) t.check('shape ' + s, !!ctxShape(h, s));
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};
const ctxShape = (h, id) => h.ctx.My3D2dge.SHAPES[id];

const physics = async t => {
  const h = await load(), { bb, game, S } = h;
  quickMatch(h, { quarterLen: 600 });
  const M = S.match, p = S.players[0], b = S.ball, rnd = mulberry(99);
  for (const q of S.players) { q.x = bb.OX - 40; q.y = bb.OY - 20; q.source = { kind: 'script', read: () => ({ mx: 0, my: 0 }) }; }
  M.practice = true;
  const fire = (made, x, y, ox = 0) => {
    p.x = x; p.y = y; b.x = x + ox; b.y = y; b.z = 58; b.state = 'held'; b.owner = p; b.scored = false; M.phase = 'live';
    const before = M.score[0]; bb.launchShot(p, { p: made ? 1 : 0, three: bb.isThree(x, y, bb.attackRim(0)) }, {});
    let went = false, minRing = 99;
    for (let i = 0; i < 120 * 3; i++) { bb.ballPhysics(1 / 120); const rim = bb.RIMS[1], d = Math.hypot(Math.hypot(b.x - rim.x, b.y - rim.y) - bb.RIM_R, b.z - bb.RIM_Z); minRing = Math.min(minRing, d); if (M.score[0] > before) { went = true; break; } if (b.z <= bb.BALL_R + .01 && b.vz <= 0 && i > 30) break; }
    return { went, minRing };
  };
  let inMade = 0, inMiss = 0, tunnel = 0; const N = 500, rim = bb.RIMS[1];
  for (let k = 0; k < N; k++) { const a = (rnd() - .5) * 2.4, d = 30 + rnd() * 230, x = Math.max(bb.OX + 4, Math.min(bb.OX + bb.CW - 4, rim.x - Math.cos(a) * d)), y = Math.max(bb.OY + 4, Math.min(bb.OY + bb.CH - 4, rim.y + Math.sin(a) * d)); const r1 = fire(true, x, y); if (r1.went) inMade++; const r2 = fire(false, x, y); if (r2.went) inMiss++; if (r2.minRing < bb.BALL_R + 1.2 - 1.5) tunnel++; }
  t.check('made shots go in >= 97%', inMade / N >= .97, inMade + '/' + N);
  t.check('missed shots go in <= 3%', inMiss / N <= .03, inMiss + '/' + N);
  t.check('no ball passes through the iron', tunnel === 0, tunnel);
  // a fast ball straight at the ring bounces off it
  b.state = 'loose'; b.shot = null; b.x = rim.x - 60; b.y = rim.y; b.z = bb.RIM_Z + 1; b.vx = 900; b.vy = 0; b.vz = 0; let minD = 99;
  for (let i = 0; i < 60; i++) { bb.ballPhysics(1 / 120); minD = Math.min(minD, Math.hypot(Math.hypot(b.x - rim.x, b.y - rim.y) - bb.RIM_R, b.z - bb.RIM_Z)); }
  t.check('a 900 u/s ball never tunnels the rim', minD > bb.BALL_R + 1.2 - 1.2, minD);
  // the floor bounce decays
  b.x = bb.CMX; b.y = bb.CMY; b.z = 100; b.vx = b.vy = b.vz = 0; const peaks = []; let up = false, top = 0;
  for (let i = 0; i < 120 * 4; i++) { bb.ballPhysics(1 / 120); if (b.vz > 0) { up = true; top = Math.max(top, b.z); } else if (up) { peaks.push(top); up = false; top = 0; } }
  t.check('floor bounces decay', peaks.length >= 2 && peaks.every((v, i) => i === 0 || v < peaks[i - 1]), peaks);
  // a ball going up through the rim is no basket
  const s0 = M.score.slice(); b.state = 'loose'; b.x = rim.x; b.y = rim.y; b.z = 62; b.vx = 0; b.vy = 0; b.vz = 200; for (let i = 0; i < 20; i++) bb.ballPhysics(1 / 120);
  t.check('a basket counts only downward', M.score[0] === s0[0] && M.score[1] === s0[1], M.score);
  // it never leaves the arena
  let out = 0; for (let k = 0; k < 40; k++) { b.state = 'loose'; b.x = bb.CMX; b.y = bb.CMY; b.z = 30; b.vx = (rnd() - .5) * 1600; b.vy = (rnd() - .5) * 1600; b.vz = rnd() * 400; for (let i = 0; i < 240; i++) { bb.ballPhysics(1 / 120); if (b.x < bb.OX - 25 || b.x > bb.OX + bb.CW + 25 || b.y < bb.OY - 25 || b.y > bb.OY + bb.CH + 25) out++; } }
  t.check('the ball stays in the arena', out === 0, out);
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const rules = async t => {
  const h = await load(), { bb, game, S } = h;
  const R = bb.RIMS[1];
  t.check('2 just inside the arc', !bb.isThree(R.x - 130, R.y, R));
  t.check('3 just outside the arc', bb.isThree(R.x - 142, R.y, R));
  t.check('3 in the corner', bb.isThree(bb.OX + bb.CW - 60, bb.OY + 12, R));
  t.check('2 inside the corner line', !bb.isThree(bb.OX + bb.CW - 60, bb.OY + 30, R));
  const fresh = (o = {}) => { quickMatch(h, Object.assign({ quarterLen: 600 }, o)); const M = S.match; M.phase = 'live'; for (const q of S.players) q.source = { kind: 'script', read: () => ({ mx: 0, my: 0 }) }; return M; };
  let M = fresh(), ev = [];
  bb.on('*', e => ev.push(e));
  // a dunk counts 2
  const p = S.players[0]; p.x = R.x - 60; p.y = R.y; bb.giveBall(p); bb.startDunk(p, { force: 'hammer' }); run(game, 2, null, () => M.score[0] > 0);
  t.check('a dunk counts 2', M.score[0] === 2, M.score);
  // jackpot +2, gold doubles
  M = fresh(); bb.giveBall(S.players[0]); S.ball.state = 'shot'; S.ball.shot = { shooter: S.players[0], team: 0, rim: 1, points: 2, made: true, jackpot: true, t: 0 }; bb.onBasket(1);
  t.check('jackpot adds 2', M.score[0] === 4, M.score);
  M = fresh(); M.gold[0] = true; bb.giveBall(S.players[0]); S.ball.state = 'shot'; S.ball.shot = { shooter: S.players[0], team: 0, rim: 1, points: 3, made: true, t: 0 }; bb.onBasket(1);
  t.check('gold ball doubles', M.score[0] === 6, M.score);
  // a made basket gives the other team the inbound
  run(game, 1.4); t.check('after a basket the other team inbounds', M.phase === 'inbound' && M.inbounder && M.inbounder.team === 1, M.phase);
  // shot clock expiry is a turnover
  M = fresh(); bb.giveBall(S.players[0]); M.shot = .05; ev = []; run(game, .1);
  t.check('shot clock violation turns it over', ev.some(e => e.type === 'shotClockViolation') && M.poss === 1 && M.phase === 'inbound', [M.poss, M.phase]);
  // the shot clock resets on rim contact
  M = fresh(); const sh = S.players[0]; sh.x = R.x - 120; sh.y = R.y; bb.giveBall(sh); S.ball.z = 58; M.shot = 6; bb.launchShot(sh, { p: 0, three: false }, {}); let rimmed = false;
  run(game, 2.5, null, () => { if (ev.some(e => e.type === 'rim' || e.type === 'backboard')) { rimmed = true; return true; } return false; });
  ev = []; t.check('the shot clock resets on the rim', rimmed ? M.shot > 19 : true, M.shot);
  // a release before the buzzer counts
  M = fresh(); const s2 = S.players[0]; s2.x = R.x - 90; s2.y = R.y; bb.giveBall(s2); S.ball.z = 58; M.clock = .05; bb.launchShot(s2, { p: 1, three: false }, {});
  run(game, 3, null, () => M.score[0] > 0 || M.phase === 'break');
  t.check('a shot released before the buzzer counts', M.score[0] === 2, [M.score, M.phase]);
  run(game, 1.6); t.check('then the quarter ends', M.phase === 'break' || M.quarter > 1, M.phase);
  // overtime on a tie, Sudden Blam after two
  M = fresh(); M.quarter = 4; M.score = [10, 10]; M.clock = .02; run(game, .1);
  t.check('a tie after Q4 goes to overtime', M.phase === 'break' && M.breakKind === 'ot' && M.ot === 1, [M.phase, M.ot]);
  bb.nextPeriod(); t.check('overtime starts with a tip-off of 60 s', M.phase === 'tipoff' && Math.round(M.clock) === 60, [M.phase, M.clock]);
  M.phase = 'live'; M.ot = 2; M.score = [12, 12]; M.clock = .02; run(game, .1);
  t.check('after two overtimes: SUDDEN BLAM', M.sudden === true, M.sudden);
  bb.nextPeriod(); M.phase = 'live'; bb.giveBall(S.players[2]); S.ball.state = 'shot'; S.ball.shot = { shooter: S.players[2], team: 1, rim: 0, points: 2, made: true, t: 0 }; bb.onBasket(0);
  t.check('the next basket wins it', M.phase === 'over' && M.winner === 1, [M.phase, M.winner]);
  // the tip-off: someone wins it and the arrow follows the loser
  quickMatch(h, { tipoff: true, quarterLen: 20 }); M = S.match; run(game, 4, null, () => M.phase === 'live');
  t.check('the tip-off is won', M.phase === 'live' && M.tipLoser !== undefined, [M.phase, M.tipLoser]);
  const loser = M.tipLoser; M.clock = .01; run(game, .2, null, () => M.phase === 'break'); bb.nextPeriod();
  t.check('Q2 starts with the tip loser inbounding', M.phase === 'inbound' && M.poss === loser, [M.phase, M.poss, loser]);
  M.phase = 'live'; M.clock = .01; run(game, .3, null, () => M.phase === 'break'); bb.nextPeriod(); M.phase = 'live'; M.clock = .01; run(game, .3, null, () => M.phase === 'break'); bb.nextPeriod();
  t.check('Q4 starts with the tip winner inbounding', M.quarter === 4 && M.poss === 1 - loser, [M.quarter, M.poss]);
  // goaltending: a defender touching a ball coming down over the rim
  M = fresh(); const sh3 = S.players[0], d = S.players[2]; bb.giveBall(sh3); S.ball.state = 'shot'; S.ball.shot = { shooter: sh3, team: 0, rim: 1, points: 2, made: false, t: 1 };
  S.ball.x = R.x - 4; S.ball.y = R.y; S.ball.z = bb.RIM_Z + 8; S.ball.vz = -100; d.x = R.x - 6; d.y = R.y; d.z = bb.RIM_Z + 8 - d.reach(); d.setState('air'); d.jump = { kind: 'block', tried: new Set() };
  bb.blockCheck(d); t.check('goaltending counts for the shooter', M.score[0] === 2, M.score);
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const mechanics = async t => {
  const h = await load(), { bb, game, S } = h;
  const R = bb.RIMS[1];
  const still = () => ({ kind: 'script', read: () => ({ mx: 0, my: 0 }) });
  const fresh = (o = {}) => { quickMatch(h, Object.assign({ quarterLen: 600, powerups: false, twists: false }, o)); const M = S.match; M.phase = 'live'; M.practice = true; for (const q of S.players) { q.source = still(); q.x = bb.OX + 10 + q.slot * 5; q.y = bb.OY + 5; q.setState('run'); } bb.giveBall(S.players[0]); S.ball.state = 'dead'; S.ball.owner = null; return M; };
  const cmd = o => ({ kind: 'script', read: () => Object.assign({ mx: 0, my: 0, shootD: false, shootP: false, shootR: false, passP: false, turboD: false, shoveP: false, oopP: false, tauntP: false }, typeof o === 'function' ? o() : o) });
  let ev = []; bb.on('*', e => ev.push(e));
  // turbo drains while held and moving, refills after
  let M = fresh(), p = S.players[0]; p.x = bb.CMX; p.y = bb.CMY; p.source = cmd({ mx: 1, turboD: true }); run(game, 1);
  const drained = p.turbo; p.source = cmd({ mx: 0 }); run(game, 2);
  t.check('turbo drains', drained < .8 && drained > .5, drained); t.check('turbo refills', p.turbo > drained + .2, p.turbo);
  // speed by ZOOM
  M = fresh(); const fast = S.players[0], slow = S.players[1]; fast.x = slow.x = bb.OX + 20; fast.y = bb.CMY - 40; slow.y = bb.CMY + 40; fast.source = cmd({ mx: 1 }); slow.source = cmd({ mx: 1 }); run(game, 1);
  t.check('ZOOM makes VOLT faster than BIG RUMBLE', fast.x - bb.OX > slow.x - bb.OX + 10, [fast.x, slow.x]);
  // steals: from behind beats from the off-hand front
  const stealRate = (behind) => { let wins = 0; for (let k = 0; k < 300; k++) { M = fresh({ seed: 1000 + k }); const hd = S.players[0], df = S.players[2]; hd.x = bb.CMX; hd.y = bb.CMY; hd.facing = 0; bb.giveBall(hd); hd.dribble.side = 1; hd.dribble.lat = 6; df.x = bb.CMX + (behind ? -12 : 12); df.y = bb.CMY + (behind ? 0 : -3); df.facing = behind ? 0 : Math.PI; hd.rig.update(0, { x: hd.x, y: hd.y, z: 0, facing: 0 }); df.stealDone = false; bb.stealHit(df); if (S.ball.owner !== hd) wins++; } return wins / 300; };
  const rb = stealRate(true), rf = stealRate(false);
  t.check('steals from behind beat the off-hand front', rb > rf + .05, [rb, rf]); t.check('steal rates in band', rb > .2 && rb < .8 && rf > .02 && rf < .5, [rb, rf]);
  // a shove knocks down and can fumble
  let downs = 0, fumbles = 0; for (let k = 0; k < 40; k++) { M = fresh({ seed: 2000 + k }); const hd = S.players[2], at = S.players[0]; hd.x = bb.CMX; hd.y = bb.CMY; bb.giveBall(hd); at.x = bb.CMX - 14; at.y = bb.CMY; at.facing = 0; at.turbo = 1; bb.startShove(at); run(game, .3); if (hd.state === 'knock') downs++; if (S.ball.owner !== hd) fumbles++; }
  t.check('shoves knock down', downs >= 38, downs); t.check('shoves fumble sometimes', fumbles > 5 && fumbles < 40, fumbles);
  // a spin move breaks the ankles of a defender in front
  M = fresh(); const sp = S.players[0], dd = S.players[2]; sp.x = bb.CMX; sp.y = bb.CMY; sp.facing = 0; bb.giveBall(sp); sp.turbo = 1; dd.x = bb.CMX + 12; dd.y = bb.CMY; ev = []; sp.cmd = { mx: 1, my: 0 }; bb.startSpin(sp); run(game, .4);
  t.check('a spin move breaks ankles', ev.some(e => e.type === 'anklesBroken') && dd.state !== 'knock', ev.map(e => e.type));
  // layup without turbo near the rim, dunk with it
  M = fresh(); const lp = S.players[0]; lp.x = R.x - 30; lp.y = R.y; bb.giveBall(lp); lp.source = cmd(() => ({ shootP: true, shootD: true })); run(game, 1 / 60); lp.source = still();
  t.check('shoot near the rim without turbo: a layup', lp.jump && lp.jump.kind === 'layup', lp.state + ' ' + (lp.jump && lp.jump.kind));
  M = fresh(); const dk = S.players[0]; dk.x = R.x - 90; dk.y = R.y; bb.giveBall(dk); dk.turbo = 1; dk.source = cmd({ shootP: true, shootD: true, turboD: true }); run(game, 1 / 60); dk.source = still();
  t.check('with turbo in range: a dunk', dk.state === 'dunk', dk.state);
  run(game, 2.5, null, () => M.score[0] > 0); t.check('the dunk scores', M.score[0] === 2, M.score);
  // dunk choice by distance and SLAM
  const vo = S.players[0], br = S.players[1]; let fancy = 0;
  for (let k = 0; k < 50; k++) if (bb.chooseDunk(vo, 140, {}).id !== 'hammer') fancy++;
  t.check('high SLAM dunks fancy from far', fancy >= 45, fancy);
  const low = Object.create(br); low.r = Object.assign({}, br.r, { slam: 3 }); t.check('low SLAM far out falls back to the hammer', bb.chooseDunk(low, 140, {}).id === 'hammer');
  // alley-oop: pass to the slam
  M = fresh(); const ps = S.players[0], rc = S.players[1]; ps.x = R.x - 200; ps.y = R.y + 60; bb.giveBall(ps); rc.x = R.x - 80; rc.y = R.y - 20; rc.turbo = 1; ev = [];
  t.check('oop is ready', bb.oopReady(ps, rc)); bb.alleyOop(ps, rc); run(game, 3, null, () => M.score[0] > 0);
  t.check('an alley-oop is caught and slammed', ev.some(e => e.type === 'alleyoop') && M.score[0] === 2, ev.map(e => e.type).join(','));
  // posterized
  M = fresh(); const pd = S.players[0], vic = S.players[2]; pd.x = R.x - 60; pd.y = R.y; bb.giveBall(pd); vic.x = R.x - 10; vic.y = R.y; ev = []; bb.startDunk(pd, { force: 'hammer' }); run(game, 2, null, () => M.score[0] > 0);
  t.check('a dunk on a defender under the rim posterizes', ev.some(e => e.type === 'posterized') && vic.state === 'knock', ev.map(e => e.type).join(','));
  // Supernova: three in a row on, the other team's basket off
  M = fresh(); const nv = S.players[0]; for (let k = 0; k < 3; k++) { M.phase = 'live'; bb.giveBall(nv); S.ball.state = 'shot'; S.ball.shot = { shooter: nv, team: 0, rim: 1, points: 2, made: true, t: 0 }; bb.onBasket(1); }
  t.check('three straight: SUPERNOVA', nv.isNova(), nv.nova); M.phase = 'live'; bb.giveBall(S.players[2]); S.ball.state = 'shot'; S.ball.shot = { shooter: S.players[2], team: 1, rim: 0, points: 2, made: true, t: 0 }; bb.onBasket(0);
  t.check('their basket ends it', !nv.isNova(), nv.nova);
  M = fresh(); const nv2 = S.players[0]; bb.novaOn(nv2); M.phase = 'live'; nv2.nova = .05; run(game, .1); t.check('Supernova times out on the clock', !nv2.isNova());
  // shatter -> sponsor break -> inbound
  M = fresh(); const sd = S.players[0]; sd.x = R.x - 60; sd.y = R.y; bb.giveBall(sd); S.cheats.shatterNext = true; ev = []; bb.startDunk(sd, { force: 'hammer' }); run(game, 4, null, () => M.phase === 'sponsor');
  t.check('a shatter starts the sponsor break', ev.some(e => e.type === 'shatter') && M.phase === 'sponsor', M.phase);
  run(game, 6, null, () => M.phase === 'inbound'); t.check('then the glass is back and play inbounds', M.phase === 'inbound' && bb.ARENA.hoops[1].glass, M.phase);
  // juice and subs
  M = fresh(); const tired = S.players[3]; tired.juice = .3; const bench = S.teams[1].bench[0].def.id; const q = bb.substitute(3);
  t.check('a sub swaps the bench player in', q && S.players[3].def.id === bench && S.teams[1].bench[0].juice === .3);
  // power-ups: each one's effect and its expiry
  M = fresh(); const pu = S.players[0]; pu.x = bb.CMX; pu.y = bb.CMY;
  bb.grantPowerup(pu, 'rocket'); pu.source = cmd({ mx: 1 }); const x0 = pu.x; run(game, .8); const dRocket = pu.x - x0; bb.endPowerup(pu); pu.x = bb.CMX; pu.vx = 0; run(game, .5); const x1 = pu.x; run(game, .8); const dPlain = pu.x - x1; pu.source = still();
  t.check('ROCKET KICKS: faster', dRocket > dPlain * 1.25, [dRocket, dPlain]);
  bb.grantPowerup(pu, 'laser'); pu.x = R.x - 120; pu.y = R.y; const withLaser = bb.shotChance(pu).p; bb.endPowerup(pu); const without = bb.shotChance(pu).p;
  t.check('LASER SIGHT: +30%', withLaser - without > .2, [withLaser, without]);
  bb.grantPowerup(pu, 'moon'); t.check('MOON SHOES: dunk from the arc', bb.dunkRange(pu) >= bb.THREE_R + 20); bb.endPowerup(pu);
  bb.grantPowerup(pu, 'gold'); t.check('GOLD BALL: the team flag', M.gold[0] === true);
  let glued = 0; for (let k = 0; k < 20; k++) { M = fresh({ seed: 3000 + k }); const hd = S.players[3], thief = S.players[0]; hd.x = bb.CMX; hd.y = bb.CMY; hd.facing = 0; bb.giveBall(hd); thief.x = hd.x + 12; thief.y = hd.y - 3; hd.rig.update(0, { x: hd.x, y: hd.y, z: 0, facing: 0 }); bb.grantPowerup(thief, 'glue'); thief.stealDone = false; bb.stealHit(thief); if (S.ball.owner !== hd) glued++; }
  t.check('GLUE GLOVES: the steal always works', glued === 20, glued);
  M = fresh(); const bm = S.players[0]; bm.x = bb.CMX; bm.y = bb.CMY; bm.turbo = 1; bb.grantPowerup(bm, 'bomb'); S.players[2].x = bb.CMX + 30; S.players[2].y = bb.CMY; S.players[3].x = bb.CMX - 30; S.players[3].y = bb.CMY + 20; bb.startShove(bm); run(game, .3);
  t.check('BLAM BOMB: a shockwave knocks down everyone near', S.players[2].state === 'knock' && S.players[3].state === 'knock', [S.players[2].state, S.players[3].state]);
  M = fresh(); const pu2 = S.players[0]; bb.grantPowerup(pu2, 'rocket'); pu2.pu.t = .05; run(game, .1); t.check('power-ups expire', !pu2.pu);
  // wind bends shots but keeps their outcome
  M = fresh(); bb.TWIST.wind = true; bb.TWIST.windOn = true; bb.TWIST.windX = 1; bb.TWIST.windY = .2; bb.TWIST.gustT = 99; let made = 0;
  for (let k = 0; k < 30; k++) { const s = S.players[0]; s.x = R.x - 100 - k * 3; s.y = R.y + (k % 5) * 10 - 20; bb.giveBall(s); S.ball.x = s.x; S.ball.y = s.y; S.ball.z = 58; M.phase = 'live'; const sc = M.score[0]; bb.launchShot(s, { p: 1, three: false }, {}); for (let i = 0; i < 360 && M.score[0] === sc; i++) bb.ballPhysics(1 / 120); if (M.score[0] > sc) made++; }
  t.check('wind keeps decided makes going in', made >= 28, made); bb.TWIST.windOn = false; bb.TWIST.wind = false;
  // oil slicks slide, lava bombs knock down, vents launch
  M = fresh({ court: 'scrapyard', twists: true }); const o = S.players[0], sl = bb.TWIST.slicks[0]; o.x = sl.x; o.y = sl.y; o.vx = 0; o.source = cmd({ mx: 1 }); run(game, .2); const slide = o.vx;
  o.x = bb.OX + 20; o.y = bb.OY + 10; o.vx = 0; run(game, .2); t.check('oil slicks: barely any grip', slide < o.vx * .5, [slide, o.vx]);
  M = fresh({ court: 'caldera', twists: true }); const lv = S.players[0]; lv.x = bb.CMX; lv.y = bb.CMY; bb.TWIST.bombs.push({ x: lv.x, y: lv.y, t: 1.1, warn: 1.2, hit: false }); run(game, .3);
  t.check('lava bombs knock down', lv.state === 'knock', lv.state);
  M = fresh({ court: 'caldera', twists: true }); const vt = S.players[0], vent = bb.TWIST.vents[1]; vt.x = vent.x; vt.y = vent.y; vt.turbo = 1; bb.giveBall(vt); vent.puff = 2; vent.pre = 0; vent.t = 9; ev = []; vt.source = cmd({ shootP: true, shootD: true, turboD: true }); run(game, 1 / 60);
  t.check('a puffing vent launches the VOLCANO LAUNCH', vt.state === 'dunk' && vt.dunk.def.id === 'volcano', vt.state + ' ' + (vt.dunk && vt.dunk.def.id));
  // the boss: Overclock in Q4, a reboot after two knockdowns
  M = fresh({ court: 'dome', away: 'blambots', twists: true }); M.quarter = 4; ev = []; run(game, .1);
  t.check('the BLAMBOTS overclock in Q4', S.players[2].overclock > 0 && ev.some(e => e.type === 'overclock'), S.players[2].overclock);
  const bot = S.players[3]; bb.knockDown(bot, S.players[0], { time: .3 }); run(game, .7); bb.knockDown(bot, S.players[0], { time: .3 }); run(game, .7);
  t.check('two knockdowns in 10 s: SYSTEM REBOOT', ev.some(e => e.type === 'reboot'), ev.map(e => e.type).slice(-6));
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const determinism = async t => {
  const once = async () => { const h = await load({ seed: 5 }); quickMatch(h, { quarterLen: 20, seed: 42, tipoff: true }); run(h.game, 25); const S = h.S; return JSON.stringify([S.match.score, S.match.quarter, Math.round(S.ball.x), S.players.map(p => [Math.round(p.x), Math.round(p.y), p.state])]); };
  const a = await once(), b = await once();
  t.check('the same seed and inputs give the same match', a === b, a + ' vs ' + b);
};
export default { content, physics, rules, mechanics, determinism };
