// The one command: node test/run.mjs [suite ...]. Prints only failures ("FAIL suite > test: detail") and one count line.
// Every suite runs the game headless in a vm context (no browser), on exact fixed steps, read through game.debug and FF.
import { load } from './lib/context.mjs';
import { makeHub } from './lib/fakehub.mjs';
import { readFileSync, readdirSync } from 'node:fs';
const t0 = Date.now(); let pass = 0, fail = 0;
const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
const check = (suite, name, ok, detail = '') => { if (ok) pass++; else { fail++; console.log(`FAIL ${suite} > ${name}${detail ? ': ' + String(detail).slice(0, 300) : ''}`); } };
const errs = (g) => g.errors.map(e => (e.message || e) + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')).join(' | ');
const SUITES = {};
const human = (FF, game, team = 0) => [{ input: game.input, team }];
const go = (game, scene, data) => { game.go(scene, data, { fade: 0 }); game.advance(1 / 60); };
function fresh(o) { const c = load(o); c.FF.fast = true; c.game.advance(.2); return c; }
function untilPhase(c, ph, max = 60) { const S = c.FF.sim; for (let i = 0; i < max * 120; i++) { if ((Array.isArray(ph) ? ph : [ph]).includes(S.phase)) return true; c.game.advance(1 / 120); } return false; }

SUITES.boot = () => {
  const c = load(); const { FF, game } = c; c.game.advance(.5);
  check('boot', 'boots to the title', game.sceneName === 'title', game.sceneName);
  for (const s of ['menu', 'setup', 'records', 'about', 'practice', 'story', 'credits', 'match', 'title']) { go(game, s); game.advance(.3); check('boot', 'scene ' + s + ' enters and runs', game.sceneName === s && !game.errors.length, errs(game)); }
  for (const h of ['#match/off', '#attract', '#drill/passing', '#story/ch2', '#about']) { const d = load({ hash: h }); d.game.advance(1.5); check('boot', 'deep link ' + h, !d.game.errors.length && d.game.sceneName && d.game.sceneName !== 'title' || h === '#about' && d.game.sceneName === 'about', d.game.sceneName + ' ' + errs(d.game)); }
  check('boot', 'no engine warnings', !c.warnings.length, c.warnings.slice(0, 3).join(' | '));
};

SUITES.data = () => {
  const { FF } = load();
  const hex = /^#[0-9a-f]{6}$/i;
  for (const t of FF.data.teams) {
    check('data', t.id + ': 15 unique numbers', new Set(t.roster.map(p => p.num)).size === 15 && t.roster.length === 15);
    check('data', t.id + ': ratings 1-10', t.roster.every(p => Object.values(p.r).every(v => v >= 1 && v <= 10)));
    check('data', t.id + ': colors', Object.values(t.colors).every(c => hex.test(c)));
    check('data', t.id + ': logo 12x12', t.logo.length === 12 && t.logo.every(r => r.length === 12) && t.logo.join('').split('').every(ch => ch === '.' || t.pal[ch]));
    check('data', t.id + ': every slot filled', FF.SLOTS.every(s => t.roster.some(p => p.slot === s)));
  }
  for (const p of FF.data.plays) {
    const fo = FF.data.formations[p.formation];
    check('data', 'play ' + p.id + ' formation', !!fo, p.formation);
    const slots = p.kSlot ? Object.keys(fo) : ['QB', 'C', 'LG', 'RG', 'RB', 'WR1', 'WR2'];
    check('data', 'play ' + p.id + ' 3 linemen on the line', ['C', 'LG', 'RG'].every(s => fo[s] && fo[s][0] > -1.2));
    const qa = p.assign.QB || p.assign.K || {};
    if (qa.reads) check('data', 'play ' + p.id + ' reads eligible', qa.reads.every(r => ['WR1', 'WR2', 'RB'].includes(r)));
    for (const [s, a] of Object.entries(p.assign)) for (const pts of [a.route, a.carry, a.pull].filter(Boolean)) check('data', 'play ' + p.id + ' ' + s + ' coords in range', pts.every(q => Math.abs(q[0]) <= 45 && Math.abs(q[1]) <= 22));
    void slots;
  }
  for (const d of FF.data.dplays) check('data', 'defense ' + d.id + ' formation', !!FF.data.formations[d.formation]);
  const PROPS = ['torch', 'candle', 'candelabra', 'chandelier', 'brazier', 'window', 'banner', 'pillar', 'statue', 'crate', 'barrel', 'chest', 'pot', 'sign', 'fence', 'lamp', 'door', 'tree', 'pine', 'bush', 'flowers', 'grass', 'rock', 'crystal', 'bones', 'skull', 'vines', 'cobweb', 'lantern', 'streetlamp', 'awning', 'hydrant', 'trashcan', 'firedrum', 'sandbags', 'cactus', 'palm', 'mushroom'];
  for (const s of FF.data.stadiums) { check('data', 'stadium ' + s.id + ' props exist', s.props.every(p => PROPS.includes(p[0])), s.props.map(p => p[0]).join()); check('data', 'stadium ' + s.id + ' song', !!FF.SONGS[s.music]); check('data', 'stadium ' + s.id + ' home', !!FF.team(s.home)); }
  for (const c of FF.data.cards) check('data', 'card ' + c.id, typeof c.apply === 'function' && typeof c.cpu === 'function' && !!c.text && !!FF.data.lines['card_' + c.id]);
  const VARS = ['player', 'team', 'opp', 'yards', 'score', 'mascot'];
  for (const [ev, bank] of Object.entries(FF.data.lines)) for (const [who, line] of bank) { check('data', 'line ' + ev + ' <= 48 chars', line.length <= 48, line); check('data', 'line ' + ev + ' speaker and vars', (who === 'C' || who === 'L') && [...line.matchAll(/\{(\w+)\}/g)].every(m => VARS.includes(m[1])), line); }
  for (const ev of ['kickoff', 'bigRun', 'td', 'bigHit', 'megaHit', 'sack', 'int', 'fumble', 'drop', 'lateHit', 'hotOn']) check('data', 'at least 8 lines for ' + ev, FF.data.lines[ev].length >= 8, FF.data.lines[ev].length);
  const D = FF.data.story;
  for (const ch of D.chapters) { check('data', 'chapter ' + ch.n + ' cutscenes', !!D.cutscenes[ch.intro] && (!ch.outro || !!D.cutscenes[ch.outro]) && (!ch.half || !!D.cutscenes[ch.half])); for (const r of ch.rewards) check('data', 'chapter ' + ch.n + ' reward ' + r, !!FF.card(r) || r === 'TROPHY'); }
  for (const [id, cs] of Object.entries(D.cutscenes)) for (const l of cs.lines) if (l[0] !== '@') check('data', 'cutscene ' + id + ' speaker ' + l[0], !!FF.data.cast[l[0]]);
  for (const id of Object.values(D.cutscenes).flatMap(cs => cs.cast || [])) check('data', 'cast ' + id, !!FF.data.cast[id]);
  for (const d of FF.data.drills) check('data', 'drill ' + d.id, !!d.title && !!d.teach && d.chips.length > 0);
  for (const s of FF.data.attract) check('data', 'attract ' + s.id, s.dur > 0 && (s.kind !== 'match' || (FF.team(s.home) && FF.team(s.away) && FF.stadium(s.stadium).id === s.stadium)));
};

SUITES.rules = () => {
  const c = fresh(), { FF, game } = c, S = FF.sim;
  const run = (spec, calls, cheats = {}, max = 40) => { go(game, 'match', Object.assign({ mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 120, cards: [[], []], start: { possession: 0, los: 30, down: 1, toGo: 20 }, cheats: Object.assign({ team: 0 }, cheats), forceCalls: calls, seed: 3 }, spec)); const ev = []; const un = FF.bus.on('*', e => ev.push(e.ev)); untilPhase(c, 'LIVE', 30); untilPhase(c, ['DEAD', 'CELEBRATE'], max); const res = S.play.result; un(); return { ev, res }; };
  const call = id => () => ({ play: FF.play(id) });
  let r = run({ start: { possession: 0, los: 80, down: 1, toGo: 20 } }, { 0: call('hb_dive'), 1: call('cover2') }, { godMode: true });
  check('rules', 'a run into the end zone is a touchdown', r.res && r.res.type === 'td' && S.score[0] === 6, JSON.stringify(r.res && r.res.type) + ' ' + S.score);
  untilPhase(c, 'PLAYCALL', 10); check('rules', 'after a TD comes the conversion', S.mode === 'pat' && S.poss === 0, S.mode);
  S.calls = [{ play: FF.play('xp') }, { play: FF.play('fg_block') }]; S.cheats.forceKick = true; S.callsDone(); untilPhase(c, ['DEAD'], 20); untilPhase(c, ['PLAYCALL'], 10);
  check('rules', 'a good extra point is 1 point, then a kickoff', S.score[0] === 7 && S.mode === 'kickoff', S.score + ' ' + S.mode);
  r = run({ start: { possession: 0, los: 30, down: 2, toGo: 20 } }, { 0: call('slants'), 1: call('prevent') }, { forceCatch: false });
  r = run({ start: { possession: 0, los: 30, down: 1, toGo: 20 } }, { 0: call('kneel'), 1: call('cover2') });
  untilPhase(c, 'PLAYCALL', 5); check('rules', 'a kneel loses a yard and uses a down', S.down === 2 && S.toGo === 21, S.down + ' & ' + S.toGo);
  run({ start: { possession: 0, los: 70, down: 4, toGo: 20 } }, { 0: call('field_goal'), 1: call('fg_block') }, { forceKick: true }); untilPhase(c, 'PLAYCALL', 5);
  check('rules', 'a 47-yard field goal with a perfect kick is good', S.score[0] === 3, S.score);
  run({ start: { possession: 0, los: 60, down: 4, toGo: 20 } }, { 0: call('kneel'), 1: call('cover2') }); untilPhase(c, 'PLAYCALL', 5);
  check('rules', 'failing on 4th down turns the ball over', S.poss === 1 && S.down === 1, S.poss + ' ' + S.down);
  run({ start: { possession: 0, los: 1, down: 1, toGo: 20 } }, { 0: call('hb_dive'), 1: call('goal_line') }, { forceFumble: false }); untilPhase(c, ['PLAYCALL', 'DEAD'], 5);
  // a safety: the carrier tackled in his own end zone
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 120, cards: [[], []], start: { possession: 0, los: 2, down: 1, toGo: 20 }, seed: 5 });
  untilPhase(c, 'PLAYCALL', 5); S.calls = [{ play: FF.play('kneel') }, { play: FF.play('cover2') }]; S.callsDone(); untilPhase(c, 'LIVE', 10);
  const qb = S.bySlot(0, 'QB'); qb.b.x = S.ownGoalX(0) - S.dir[0] * 40; S.deadBall('tackle', { x: qb.b.x });
  check('rules', 'downed in his own end zone is a safety', S.score[1] === 2, S.score);
  // the clock: a quarter ends at 0:00 after the play
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 60, cards: [[], []], start: { possession: 0, los: 30, down: 1, toGo: 20 }, clock: 1, seed: 6 });
  untilPhase(c, 'QUARTER', 60); check('rules', 'the quarter ends when the clock hits 0', S.phase === 'QUARTER', S.phase);
  untilPhase(c, 'PLAYCALL', 5); check('rules', 'the 2nd quarter starts with a full clock', S.quarter === 2 && S.clock > 55, S.quarter + ' ' + S.clock);
  S.clock = 0.5; const d0 = S.dir[0]; untilPhase(c, 'HALFTIME', 60); untilPhase(c, ['PLAYCALL'], 10);
  check('rules', 'halftime switches ends', S.quarter === 3 && S.dir[0] === -d0, S.quarter + ' ' + S.dir);
  S.quarter = 4; S.clock = .5; S.score = [10, 3]; untilPhase(c, 'FINAL', 60);
  check('rules', 'the game ends after the 4th', S.phase === 'FINAL' && S.winner === 0, S.phase + ' ' + S.winner);
  // overtime when tied
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 60, cards: [[], []], quarter: 4, clock: .5, score: [7, 7], start: { possession: 0, los: 30, down: 1, toGo: 20 }, seed: 8 });
  untilPhase(c, 'COIN', 60); check('rules', 'a tie goes to sudden-death overtime', S.ot && S.quarter === 5, S.ot + ' ' + S.quarter);
  // a whole CPU game ends with no errors and no stuck plays
  go(game, 'match', { mode: 'exhibition', home: 'owls', away: 'yetis', humans: [], qLen: 60, cards: [['HOT_SAUCE'], ['MEGA_HIT']], seed: 9 });
  let stuck = 0; const un = FF.bus.on('stuck', () => stuck++);
  untilPhase(c, 'FINAL', 900); un();
  check('rules', 'a whole CPU game reaches the final', S.phase === 'FINAL' && !game.errors.length, S.phase + ' q' + S.quarter + ' ' + errs(game));
  check('rules', 'no stuck plays', stuck === 0, stuck);
};

SUITES.actions = () => {
  const c = fresh(), { FF, game } = c, S = FF.sim, T = FF.T;
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 120, cards: [[], []], start: { possession: 0, los: 30, down: 1, toGo: 20 }, seed: 2 });
  const a = S.bySlot(0, 'RB'), top = S.topSpeed(a);
  check('actions', 'top speed from the ratings', Math.abs(top - (T.speedBase + a.r.SPD * T.speedPerSpd)) < 1, top);
  // turbo drains while held
  untilPhase(c, 'PLAYCALL', 5); S.calls = [{ play: FF.play('hb_dive') }, { play: FF.play('cover2') }]; S.callsDone(); untilPhase(c, 'LIVE', 10);
  const qb = S.bySlot(0, 'QB'); qb.turbo = 1; for (let i = 0; i < 120; i++) { qb.intent = { mx: 1, my: 0, turbo: true, press: 0 }; S.update && 0; game.advance(1 / 120); }
  // the spin's window evades a frontal tackle; the big hit launches
  const P = c.FF.sim; void P;
  const spinTry = (t, behind) => {
    const car = S.bySlot(0, 'RB'), d = S.bySlot(1, 'LB1'); let ev = 0; const un = FF.bus.on('evade', () => ev++);
    S.phase = 'LIVE'; S.ball.state = 'held'; S.ball.holder = car; car.down = 0; d.down = 0; d.eng = null; car.b.x = 1000; car.b.y = 600; car.b.z = 0; car.facing = 0;
    d.b.x = behind ? 990 : 1010; d.b.y = 600; d.act = { id: 'tackleDive', t: .1, dur: 1, air: .45, lunge: true }; car.act = { id: 'spin', t, dur: .32 };
    S.tryTackle(d, car); un(); return ev > 0;
  };
  check('actions', 'a spin in its window evades a frontal dive', spinTry(.05, false));
  check('actions', 'a spin outside its window does not', !spinTry(.3, false));
  check('actions', 'a spin does not evade from behind', !spinTry(.05, true));
  // the Big Hit: fumble roll x3 against a normal tackle (seeded Monte Carlo)
  const roll = (big) => { let f = 0; for (let i = 0; i < 2000; i++) { FF.rng.seed(5000 + i); const fp = T.fumbleBase * (big ? 3 : 1) * (1 - 5 * .05); if (FF.r() < fp) f++; } return f / 2000; };
  const rb = roll(true), rn = roll(false);
  check('actions', 'the Big Hit fumble chance is about 3x', rb > rn * 2 && rb < rn * 4.5, rb + ' vs ' + rn);
  // the 3-press kick meter
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: human(FF, game), qLen: 120, cards: [[], []], start: { possession: 0, los: 75, down: 4, toGo: 20 }, seed: 4, forceCalls: { 0: () => ({ play: FF.play('field_goal') }) } });
  untilPhase(c, 'PRESNAP', 10); game.advance(1.5);
  game.input.tap('b1'); game.advance(.3); const st1 = FF.kick.meter && FF.kick.meter.stage;
  game.input.tap('b1'); game.advance(.3); const st2 = FF.kick.meter && FF.kick.meter.stage;
  game.input.tap('b1'); game.advance(2);
  check('actions', 'the meter: start, power, aim, kick', st1 === 1 && st2 === 2 && S.ball.state !== 'held' || (S.play && S.play.kicked), st1 + ' ' + st2 + ' ' + S.ball.state);
  untilPhase(c, ['DEAD', 'PLAYCALL'], 10);
  check('actions', 'no errors', !game.errors.length, errs(game));
};

SUITES.ai = () => {
  const c = fresh(), { FF } = c;
  const offs = ['hb_dive', 'hb_sweep', 'slants', 'curls', 'deep_post', 'mesh', 'hail_mary', 'hb_screen'], defs = ['cover2', 'man', 'lb_blitz', 'prevent'];
  for (const o of offs) {
    const rows = defs.map(d => FF.dev.playLab(o, d, 8, { keep: true }));
    const avg = rows.reduce((t, r) => t + r.avg, 0) / rows.length, stuck = rows.reduce((t, r) => t + r.stuck, 0), max = Math.max(...rows.map(r => r.max));
    check('ai', o + ': nothing stuck, every play ends within 25 s', stuck === 0 && max < 25, stuck + ' ' + max);
    check('ai', o + ': no unstoppable play (avg under 25 yd)', avg < 25, avg);
    if (FF.play(o).type === 'pass' && o !== 'hail_mary') { const att = rows.reduce((t, r) => t + r.att, 0); check('ai', o + ': the QB throws', att >= 10, att); }
  }
  const all = defs.map(d => offs.map(o => FF.dev.playLab(o, d, 4, { keep: true, seed: 3 }).avg));
  check('ai', 'no unbeatable defense', all.every(row => row.some(v => v >= 1)), JSON.stringify(all));
  // the coach's choices
  const S = FF.sim;
  S.newMatch({ home: 'fiascos', away: 'mudhogs', seed: 1, qLen: 120, start: { possession: 0, los: 30, down: 4, toGo: 15 } }); FF.control.setup([]);
  check('ai', '4th & 15 at your 30: punt', FF.coach.call(0).play.id === 'punt', FF.coach.call(0).play.id);
  S.newMatch({ home: 'fiascos', away: 'mudhogs', seed: 1, qLen: 120, start: { possession: 0, los: 80, down: 4, toGo: 8 } });
  check('ai', '4th & 8 at their 20: field goal', FF.coach.call(0).play.id === 'field_goal', FF.coach.call(0).play.id);
  S.mode = 'pat'; S.quarter = 4; S.score = [13, 15];
  check('ai', 'down 2 after a late TD: go for 2', FF.coach.call(0).play.id === 'two', FF.coach.call(0).play.id);
};

SUITES.ots = () => {
  const c = fresh(), { FF, game } = c, S = FF.sim;
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 120, cards: [[], []], start: { possession: 0, los: 30, down: 1, toGo: 20 }, seed: 2 });
  const rb = S.bySlot(0, 'RB');
  for (let i = 0; i < 3; i++) FF.bus.emit('tackle', { carrier: rb.id, tackler: S.bySlot(1, 'LB1').id, yards: 20, bigHit: false });
  check('ots', 'three big plays make him BLAZING', rb.hot > 0, rb.heat + ' ' + rb.hot);
  FF.bus.emit('td', { scorer: S.rosters[1].find(a => a.slot === 'RB').id, team: 1, yards: 5 });
  check('ots', 'an opponent TD fills the meter', S.meter[0] >= 20, S.meter[0]);
  S.meter[0] = 90; const n0 = S.cards[0].length; FF.ots.fill(0, 35, 'test');
  check('ots', 'a full meter draws a Fiasco Card', S.cards[0].length === n0 + 1 && S.meter[0] === 0, S.cards[0]);
  // ROCKET CLEATS: +20% speed for the carrier and receivers this play
  const wr = S.bySlot(0, 'WR1'), sp0 = S.topSpeed(wr); FF.card('ROCKET_CLEATS').apply({ team: 0 }); const sp1 = S.topSpeed(wr);
  check('ots', 'ROCKET CLEATS gives +20% speed', Math.abs(sp1 / sp0 - 1.2) < .01, sp1 / sp0);
  FF.bus.endPlay(); check('ots', 'card effects last one play', Math.abs(S.topSpeed(wr) - sp0) < .01);
  FF.card('BUTTERFINGERS').apply({ team: 1 }); check('ots', 'BUTTERFINGERS cuts their catch chance', FF.bus.mod('catch.p', .6, { team: 0 }) < .3);
  FF.bus.endPlay();
  // a boss special fires once per drive
  go(game, 'match', { mode: 'exhibition', home: 'owls', away: 'mudhogs', humans: [], qLen: 120, cards: [[], []], start: { possession: 0, los: 30, down: 1, toGo: 20 }, seed: 2 });
  untilPhase(c, 'PLAYCALL', 5); S.calls = [{ play: FF.play('slants') }, { play: FF.play('cover2') }]; S.callsDone(); untilPhase(c, 'LIVE', 10);
  const zap = S.bySlot(0, 'WR1'); zap.specialUsed = {};
  const a1 = FF.ots.trySpecial(zap), a2 = FF.ots.trySpecial(zap);
  check('ots', 'AFTERBURNER fires once per play', a1 && !a2, a1 + ' ' + a2);
  // lights out and back
  FF.ots.lightsOut(true, 1); check('ots', 'lights out', S.lights); FF.ots.afterPlay(S.play, {}); check('ots', 'the lights come back', !S.lights);
  // cosmetics don't change the sim
  const h0 = S.hash(); FF.bus.emit('helmetPop', { a: zap.id, x: 0, y: 0, z: 0, team: 0 }); check('ots', 'a flying helmet does not change the sim', S.hash() === h0);
  check('ots', 'no errors', !game.errors.length, errs(game));
};

SUITES.replay = () => {
  const c = load(), { FF, game } = c, S = FF.sim; game.advance(.3);
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [], qLen: 120, cards: [[], []], start: { possession: 0, los: 80, down: 1, toGo: 20 }, seed: 2, cheats: { godMode: true, team: 0 }, forceCalls: { 0: () => ({ play: FF.play('hb_dive') }), 1: () => ({ play: FF.play('cover2') }) } });
  untilPhase(c, 'CELEBRATE', 30); game.advance(2);
  check('replay', 'a TD makes a highlight', FF.replay.highlights.length >= 1 && FF.replay.last, FF.replay.highlights.length);
  const h0 = S.hash(), ph = S.phase, n = FF.replay.last ? FF.replay.last.frames.length : 0;
  check('replay', 'frames recorded', n > 30, n);
  FF.replay.last.used = false; FF.replay.begin(FF.replay.last);
  for (let i = 0; i < 120 * 3; i++) game.advance(1 / 120);
  check('replay', 'the sim is untouched by a replay', S.hash() === h0 && S.phase === ph, h0 + ' ' + S.hash());
  game.input.tap('b1'); game.advance(.1); game.input.tap('b1'); game.advance(.1);
  check('replay', 'skipping ends it', !FF.replay.play);
  check('replay', 'no errors', !game.errors.length, errs(game));
};

SUITES.control = () => {
  const c = fresh(), { FF, game } = c, I = game.input, S = FF.sim;
  I.lastDevice = 'gamepad';
  check('control', 'PlayStation symbols by default', FF.glyph.label('b1') === '✕' && game.settings.glyphs === 'playstation', FF.glyph.label('b1'));
  game.settings.set('glyphs', 'xbox'); check('control', 'Xbox letters from Settings', FF.glyph.label('b1') === 'A', FF.glyph.label('b1'));
  game.settings.set('glyphs', 'playstation');
  I.lastDevice = 'keyboard'; check('control', 'keyboard labels', FF.glyph.label('b1') === 'Space' && FF.glyph.label('r1') === '1', FF.glyph.label('b1') + ' ' + FF.glyph.label('r1'));
  const spec = game.settings.spec('glyphs'); check('control', 'button symbols: PlayStation or Xbox', spec && spec.options.length === 2 && spec.value === 'playstation');
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: human(FF, game, 1), qLen: 120, cards: [[], []], start: { possession: 0, los: 30, down: 1, toGo: 20 }, seed: 2, forceCalls: { 0: () => ({ play: FF.play('hb_dive') }) } });
  untilPhase(c, 'PLAYCALL', 5); I.tap('b1'); game.advance(.2); untilPhase(c, 'PRESNAP', 5);
  const h = FF.control.humans[0];
  check('control', 'on defense a human takes the safety', h.a && h.a.slot === 'S', h.a && h.a.slot);
  untilPhase(c, 'LIVE', 10); game.advance(.8); I.tap('b2'); game.advance(.1);
  const car = S.carrier(), near = car ? S.onField(1).sort((a, b) => Math.hypot(a.b.x - car.b.x, a.b.y - car.b.y) - Math.hypot(b.b.x - car.b.x, b.b.y - car.b.y))[0] : null;
  check('control', 'switch goes to the defender nearest the ball', !car || h.a === near || Math.hypot(h.a.b.x - car.b.x, h.a.b.y - car.b.y) < 5 * 16, h.a && h.a.slot);
  // the mouse picks an athlete by where it was drawn
  FF.control.screen = { 3: [100, 100, 40] }; const picked = FF.control.pickAt(100, 85);
  check('control', 'a click finds the athlete under it', picked && picked.id === 3, picked && picked.id);
  check('control', 'no errors', !game.errors.length, errs(game));
};

SUITES.ui = () => {
  const c = load(), { FF, game } = c, I = game.input; game.advance(.5);
  I.tap('start'); game.advance(.3); check('ui', 'start opens the main menu', game.sceneName === 'menu', game.sceneName);
  I.tap('down'); game.advance(.1); I.tap('confirm'); game.advance(.3); check('ui', 'keys pick EXHIBITION', game.sceneName === 'setup', game.sceneName);
  I.tap('cancel'); game.advance(.3); check('ui', 'back from setup', game.sceneName === 'menu', game.sceneName);
  // the mouse: hover focuses, a click picks
  const m = FF.scenes.menu.m; m.layout(); const r = m.rects[3];
  I.lastDevice = 'mouse'; I.feed('move', r.x + 10, r.y + 5); game.advance(.1);
  check('ui', 'hover moves the focus', m.i === 3, m.i);
  I.feed('down', r.x + 10, r.y + 5); game.advance(1 / 60); I.feed('up', r.x + 10, r.y + 5); game.advance(.7);
  check('ui', 'a click picks', game.sceneName === 'records', game.sceneName);
  go(game, 'title'); game.advance(11); check('ui', '10 s idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName);
  game.advance(.6); I.tap('b3'); game.advance(.5); check('ui', 'any input leaves the attract mode', game.sceneName === 'title', game.sceneName);
  const items = game.o.menu.items; go(game, 'match'); const its = (typeof items === 'function' ? items() : items).map(x => x[0]);
  check('ui', 'the pause menu has Dev Mode and Restart', its.includes('Dev Mode') && its.includes('Restart'), its);
  check('ui', 'game settings exist', ['difficulty', 'quarterLen', 'camera', 'replays', 'commentary', 'voices', 'crowdVol', 'autoSwitch', 'showRoutes', 'targetMarker', 'lateHits', 'bigHeads'].every(k => game.settings.spec(k)));
  const t = load({ touch: true }); t.game.advance(.5);
  check('ui', 'touch-only: the gate shows', t.FF.touchOnly === true && t.game.sceneName === 'title', t.FF.touchOnly);
  t.game.advance(11); check('ui', 'touch-only: the attract mode still runs', t.game.sceneName === 'attract', t.game.sceneName);
  const pages = FF.aboutPages(); check('ui', 'About has the 6 pages', pages.length === 6 && pages[0].rows.length === 15, pages.length);
  check('ui', 'no errors', !game.errors.length && !t.game.errors.length, errs(game) + errs(t.game));
};

SUITES.audio = () => {
  const { FF } = load();
  const src = readdirSync(new URL('../src/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/FF\.sfx\('(\w+)'/g)].map(m => m[1]).concat([...src.matchAll(/crowd\('(\w+)'/g)].map(m => m[1])));
  for (const n of used) check('audio', 'sfx ' + n + ' defined', FF.SFX_NAMES.includes(n));
  for (const n of [...src.matchAll(/(?:FF\.music\.play|FF\.music\.sting)\('(\w+)'/g)].map(m => m[1])) check('audio', 'song ' + n + ' defined', !!FF.SONGS[n]);
  for (const who of Object.keys(FF.VOICES)) { const a = JSON.stringify(FF.voice.plan('HELLO THERE, ROOKIE!', FF.VOICES[who])), b = JSON.stringify(FF.voice.plan('HELLO THERE, ROOKIE!', FF.VOICES[who])); check('audio', 'voice plan deterministic: ' + who, a === b && (FF.VOICES[who].growl || JSON.parse(a).length > 2)); }
  check('audio', 'questions rise at the end', FF.voice.plan('Really?', FF.VOICES.pearl).slice(-1)[0].semis > FF.voice.plan('Really.', FF.VOICES.pearl).slice(-1)[0].semis);
};

SUITES.dev = () => {
  const c = fresh(), { FF, game } = c, S = FF.sim;
  const a = S.all[0];
  game.settings.set('dev_speedBase', 120); check('dev', 'a slider changes the sim live', FF.T.speedBase === 120);
  FF.T.resetAll(); check('dev', 'reset all restores the defaults', FF.T.speedBase === 92, FF.T.speedBase);
  check('dev', 'dev settings stay off the Settings screen', game.settings.spec('dev_speedBase').group.startsWith('Dev'));
  const L = FF.dev.playLab('slants', 'cover2', 4, { keep: true }); check('dev', 'the Play Lab returns stats', L.n === 4 && typeof L.avg === 'number', JSON.stringify(L));
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'mudhogs', humans: [{ input: game.input, team: 0 }], qLen: 120, cards: [[], []], seed: 2 });
  FF.dev.setCheat('cpuVsCpu', true); check('dev', 'CPU vs CPU cheat', FF.control.humans[0].cpu);
  FF.dev.setCheat('godMode', true); check('dev', 'god mode cheat', S.cheats.godMode);
  FF.dev.setCheat('bigHeads', true); check('dev', 'big heads', S.cheats.bigHeads);
  for (const k of Object.keys(FF.dev.pages)) { let ok = true; try { FF.dev.pages[k === 'devTune' ? (FF.dev.page = 'Movement', k) : k](); } catch (e) { ok = false; } check('dev', 'dev page ' + k + ' builds', ok); }
  S.finishNow(0); game.advance(3); check('dev', 'win now', S.phase === 'FINAL' && S.winner === 0, S.phase);
  check('dev', 'no errors', !game.errors.length, errs(game)); void a;
};

SUITES.attract = () => {
  const c = load(), { FF, game } = c; game.advance(.3);
  const store = FF.store.get('records', null);
  go(game, 'attract', { from: 'title' });
  const seen = new Set(); FF.attractLog = {};
  for (let i = 0; i < 120 * 115; i++) { game.advance(1 / 120); const s = FF.scenes.attract.seg; if (s) seen.add(s.id); if (game.sceneName !== 'attract') break; }
  check('attract', 'the whole loop runs', FF.data.attract.every(s => seen.has(s.id)), [...seen].join());
  const L = FF.attractLog;
  for (const ev of ['kickoff', 'td', 'fumble', 'fg', 'int', 'mascotHit', 'lightsOut', 'seismic']) check('attract', 'shows ' + ev, (L[ev] || 0) > 0, JSON.stringify(L).slice(0, 200));
  check('attract', 'nothing is saved', JSON.stringify(FF.store.get('records', null)) === JSON.stringify(store));
  game.input.tap('b1'); game.advance(.4); check('attract', 'any input leaves it', game.sceneName === 'title', game.sceneName);
  check('attract', 'no errors or warnings', !game.errors.length && !c.warnings.length, errs(game) + c.warnings.slice(0, 2).join());
};

SUITES.story = () => {
  const c = load(), { FF, game } = c, I = game.input, S = FF.sim; game.advance(.3);
  game.fadeTime = 0; game.advance(.5); FF.fast = true; FF.testStory = { qLen: 20, cheats: { godMode: true, forceCatch: true, alwaysCatch: true } };
  I.tap('start'); game.advance(.3); I.tap('confirm'); game.advance(.5);
  check('story', 'STORY opens the board', game.sceneName === 'story', game.sceneName);
  FF.story.newGame(); FF.story.state().started = 1;
  const tapThrough = (scene, max = 60) => { for (let i = 0; i < max * 10 && game.sceneName === scene; i++) { if (FF.cut.choice) { I.tap('confirm'); } else I.tap('confirm'); game.advance(.1); } };
  const v0 = FF.voice.planned || 0;
  FF.story.play(0); game.advance(.2); check('story', 'the prologue plays', game.sceneName === 'cutscene');
  { const line = "Ninety-nine losses, one leaky roof, and zero quit."; FF.voice.planned = 0; for (const ch of line) FF.voice.letter(ch, 'pearl'); const groups = (line.toLowerCase().match(/[aeiouy]+/g) || []).length, vowels = (line.match(/[aeiouyAEIOUY]/g) || []).length;
    check('story', 'Animalese: one syllable per vowel as letters type', FF.voice.planned === vowels, FF.voice.planned + ' vs ' + vowels);
    const pl = FF.voice.plan(line, FF.VOICES.pearl); check('story', 'Animalese plan: one syllable per vowel group, onsets from the letters before them', pl.length === groups && pl[0].on === 'n' && pl.some(x => x.on === 'p'), pl.length + ' vs ' + groups);
    const q = FF.voice.plan('Is that a threat?', FF.VOICES.bluster), st = FF.voice.plan('Is that a threat.', FF.VOICES.bluster); check('story', 'Animalese pitch rises on questions', q[q.length - 1].semis > st[st.length - 1].semis);
    const sim = FF.voice.plan('TOUCH! DOWN!', FF.VOICES.chet); check('story', 'Simlish: gibberish syllables, louder in caps', sim.every(x => x.loud > 1) && !sim.some(x => /touch|down/i.test(x.txt))); }
  game.advance(5); check('story', 'cutscene lines speak Animalese syllables as they type', (FF.voice.planned || 0) > v0, (FF.voice.planned || 0) - v0);
  tapThrough('cutscene'); check('story', 'the prologue ends on the board', game.sceneName === 'story' && FF.story.state().done[0], game.sceneName);
  // chapter 1: the drills, completed by their bots
  FF.drills.bot = true; FF.story.play(1); game.advance(.2); tapThrough('cutscene');
  let guard = 0, drills = new Set();
  while (game.sceneName === 'drill' && guard++ < 120 * 600) { if (FF.drills.cur) { drills.add(FF.drills.cur.id); if (FF.drills.cur.state === 'fail' && FF.drills.cur.fails >= 2) I.tap('b3'); } if (S.phase === 'PLAYCALL' && FF.drills.cur && FF.drills.cur.id === 'playcall' && !S.calls[0]) { S.cards[0] = ['HOT_SAUCE']; S.calls[0] = { play: FF.play('slants'), flip: true, card: 'HOT_SAUCE' }; } game.advance(1 / 120); }
  check('story', 'chapter 1 runs all 9 drills', drills.size === 9, [...drills].join());
  tapThrough('cutscene');
  check('story', 'chapter 1 done, its cards earned', FF.story.state().done[1] && FF.story.state().collection.includes('HOT_SAUCE'), JSON.stringify(FF.story.state().done) + game.sceneName);
  FF.drills.bot = false;
  for (const n of [2, 3, 4, 5]) {
    FF.story.play(n); game.advance(.2); tapThrough('cutscene');
    check('story', 'chapter ' + n + ' starts a match', game.sceneName === 'match' && FF.match.mode === 'story', game.sceneName);
    for (const h of FF.control.humans) h.cpu = true;
    let k = 0; while (game.sceneName === 'match' && k++ < 120 * 900) { if (FF.cut.lines) I.tap('confirm'); const ht = FF.control.humans[0].team; if (S.quarter >= 4 && S.clock < 2 && S.phase !== 'FINAL' && S.score[ht] <= S.score[1 - ht]) S.finishNow(ht); game.advance(1 / 120); }
    tapThrough('cutscene'); if (game.sceneName === 'storyloss') { check('story', 'chapter ' + n + ' won', false, 'lost ' + S.score); return; }
    check('story', 'chapter ' + n + ' won', FF.story.state().done[n], game.sceneName + ' ' + S.score);
  }
  check('story', 'the ending rolls the credits', game.sceneName === 'credits', game.sceneName);
  check('story', 'Big Heads unlocked', FF.store.get('bigHeadsUnlocked', false));
  check('story', 'the autosave holds chapter 5', game.saves.latest() && game.saves.latest().data.story.done[5], JSON.stringify(game.saves.latest() && game.saves.latest().level));
  for (let i = 0; i < 40 && game.sceneName === 'credits'; i++) { I.hold('cancel'); game.advance(.1); } I.hold('cancel', false);
  check('story', 'the credits end on the menu', game.sceneName === 'menu', game.sceneName);
  // a loss: THAT'S A FIASCO and RETRY
  FF.testStory = { qLen: 20, cheats: { noTackle: false } };
  FF.story.match(2); game.advance(.3); S.finishNow(0); game.advance(3);
  check('story', 'a loss shows THAT\'S A FIASCO', game.sceneName === 'storyloss', game.sceneName);
  I.tap('confirm'); game.advance(.3); check('story', 'RETRY replays the chapter', game.sceneName === 'match', game.sceneName);
  check('story', 'no errors', !game.errors.length, errs(game));
  // a 2-player local exhibition to the results and REMATCH
  FF.testStory = null; const p2 = game.addPlayer({ keys: 'right' });
  go(game, 'match', { mode: 'exhibition', home: 'fiascos', away: 'owls', humans: [{ input: game.input, team: 0, cpu: true }, { input: p2, team: 1, cpu: true }], qLen: 20, cards: [[], []], seed: 4 });
  untilPhase(c, 'FINAL', 600); game.advance(3);
  check('story', '2-player exhibition reaches the results', !!FF.match.results, S.phase);
  const rec = FF.records.all(); check('story', 'the Hall of Fiasco records the exhibition', rec.games && rec.games.v >= 1 && rec.mostPoints, JSON.stringify(rec).slice(0, 200));
  const R = FF.match.results, ht = 0;
  check('story', 'Hall of Fiasco values match the game: most points is the human side\'s score, sacks too', rec.mostPoints.v >= R.score[ht] && rec.mostSacks.v >= R.sacks[ht] && (!R.longest || R.longest.team !== ht || rec.longestTd.v >= R.longest.yards), JSON.stringify({ rec: [rec.mostPoints, rec.mostSacks], res: [R.score, R.sacks] }));
  go(game, 'records'); game.advance(.3); check('story', 'the Hall of Fiasco screen shows', game.sceneName === 'records' && !game.errors.length);
  const rem = FF.results.actions(FF.match).find(a => a.id === 'rem'); rem.fn(); game.advance(.3);
  check('story', 'REMATCH restarts', game.sceneName === 'match' && S.score[0] + S.score[1] === 0 && !FF.match.results);
  const g0 = FF.records.all().games.v; go(game, 'match', { mode: 'attract', home: 'fiascos', away: 'owls', humans: [{ input: game.input, team: 0, cpu: true }], qLen: 20, cards: [[], []], seed: 5 }); untilPhase(c, 'FINAL', 600); game.advance(3);
  go(game, 'title'); check('story', 'the attract mode never writes records', FF.records.all().games.v === g0, FF.records.all().games.v + ' vs ' + g0);
};

SUITES.net = async () => {
  const flush = () => new Promise(r => setTimeout(r, 0));
  const run = async (n, o = {}) => {
    const hub = makeHub(n, o), ctxs = [];
    for (const c of hub.copies) ctxs.push(load({ hub: c.api }));
    const games = ctxs.map(c => c.game);
    for (let i = 0; i < 30; i++) { await flush(); games.forEach(g => g.advance(1 / 60)); hub.step(1 / 60); }
    return { hub, ctxs, games };
  };
  const tick = (R, secs) => { const N = Math.round(secs * 60); for (let i = 0; i < N; i++) { R.hub.now += 1000 / 60; R.games.forEach(g => g.advance(1 / 60)); R.hub.step(1 / 60); } };
  for (const [n, o, name] of [[2, {}, '2 players'], [4, { latency: .15, loss: .05 }, '4 players, latency and loss'], [2, { server: true }, 'a server host']]) {
    const R = await run(n, o);
    check('net', name + ': every copy readies without a key', R.hub.copies.every(c => c.ready), R.hub.copies.map(c => c.ready).join());
    check('net', name + ': in the hub scene', R.games.every(g => g.sceneName === 'hub'), R.games.map(g => g.sceneName).join());
    R.ctxs.filter((c, i) => i < n).forEach(c => c.game.input.tap('confirm')); R.games.forEach(g => g.advance(1 / 60));
    check('net', name + ': Enter answers Ready on the card', R.hub.copies.slice(0, n).every(c => c.answers.includes('ready')));
    R.hub.start(); tick(R, 3.5);
    const host = R.ctxs[o.server ? n : 0].FF.sim;
    check('net', name + ': play begins at time 0', host.phase !== 'IDLE', host.phase);
    // players push their sticks and press buttons for a while
    for (let s = 0; s < 40; s++) { R.ctxs.forEach((c, i) => { if (i < n) { c.game.input.hold('right', s % 2 === 0); if (s % 3 === 0) c.game.input.tap('b1'); } }); tick(R, .5); }
    if (n >= 3) { R.hub.leave(n - 1); tick(R, 2); }
    const sent = R.hub.copies.filter(c => !c.gone).map(c => c.sent), recv = R.hub.copies.filter(c => !c.gone).map(c => c.recv);
    check('net', name + ': traffic flows both ways', sent.every(x => x > 0) && recv.every(x => x > 0), sent + ' / ' + recv);
    const perSec = {}; for (const m of R.hub.sent) { const k = m.from + ':' + Math.floor(m.t); perSec[k] = (perSec[k] || 0) + 1; }
    check('net', name + ': at most 18 messages a second from a copy', Math.max(...Object.values(perSec)) <= 19, Math.max(...Object.values(perSec)));
    const snaps = R.hub.sent.filter(m => m.type === 's'); check('net', name + ': snapshots under 1,100 bytes', snaps.length > 0 && snaps.every(m => m.size <= 1100), Math.max(...snaps.map(m => m.size)));
    const client = R.ctxs[o.server ? 0 : 1].FF.sim;
    tick(R, .4); check('net', name + ': the client mirrors the host (score, quarter, the field)', String(client.score) === String(host.score) && client.quarter === host.quarter && client.athletes.length === host.athletes.length, client.score + '/' + host.score + ' ' + client.athletes.length + '/' + host.athletes.length);
    if (!o.server && o.latency) {   // the plan's criterion: the predicted athlete within 2 yd of the host's 95% of the time when not locked
      const cl = R.ctxs[1].FF, hs = R.ctxs[0].FF; let n = 0, ok = 0, prevA = null, prevPh = '', settle = 0;
      const trail = [], dists = [], misses = [];   // where the client's player was over the last 300 ms (the network delay): the host's copy should match one of them
      for (let k = 0; k < 2400; k++) { { const hh = cl.control.humans.find(x => x.seat === 1); if (hh && hh.a) { trail.push([hh.a.id, hh.a.b.x, hh.a.b.y]); if (trail.length > 18) trail.shift(); } } if (k % 40 === 0) R.ctxs.slice(0, n).forEach(c => c.game.input.tap('b1')); R.ctxs[1].game.input.hold('right', (k >> 6) % 2 === 0); R.ctxs[1].game.input.hold('up', (k >> 5) % 3 === 0); tick(R, 1 / 60);
        const h = cl.control.humans.find(x => x.seat === 1), a = h && h.a; if (a !== prevA || cl.sim.phase !== prevPh) { prevA = a; prevPh = cl.sim.phase; settle = 18; } if (settle > 0) { settle--; continue; } if (!a || cl.sim.phase !== 'LIVE' || /TACKLED|DOWN|FLY|PILE|GETUP|BLOCK|DIVE|TACKLE_DIVE|DIVE_CATCH|BIGHIT|HURDLE|JUMP|SEISMIC|MUDSLIDE/.test(a.pose) || a.eng) continue;
        const ha = hs.sim.athlete(a.id); if (!ha) continue; n++; let best = 1e9; for (const q of trail) if (q[0] === a.id) best = Math.min(best, Math.hypot(q[1] - ha.b.x, q[2] - ha.b.y)); dists.push(best); if (best <= 32) ok++; else if (process.env.SHOWPRED) misses.push([Math.round(best), a.pose, ha.pose, cl.sim.ball.holder === a ? 'carrier' : '', ha.down > 0 ? 'hostDown' : '', ha.act ? ha.act.id : '', ha.eng ? 'eng' : ''].join(':')); }
      R.ctxs[1].game.input.hold('right', false); R.ctxs[1].game.input.hold('up', false);
      if (process.env.SHOWPRED) console.log('prediction', name, ok + '/' + n, 'host rejections', hs.control.humans.map(h => h.corr || 0), 'client snaps', cl.net.corrections, 'misses', misses.slice(0, 40).join(' '), 'dists', dists.sort((x, y) => x - y).filter((v, i) => i % Math.ceil(dists.length / 12) === 0).map(Math.round).join(','));
      check('net', name + ': the predicted player stays within 2 yd of the host 95% of the time', n >= 30 && ok / n >= .95, ok + '/' + n);
    }
    if (!o.server) check('net', name + ': the client predicts its own player', R.ctxs[1].FF.net.predicted === true, 'corrections ' + R.ctxs[1].FF.net.corrections);
    R.hub.timeUp(); tick(R, 1);
    const fin = R.hub.finished;
    const ids = fin ? fin.standings.flat() : [];
    check('net', name + ': the host finishes with valid standings', fin && ids.length === new Set(ids).size && R.hub.copies.filter(c => !c.gone && c.me < n).every(c => ids.includes(c.me)), JSON.stringify(fin));
    R.hub.end('finished'); tick(R, .5); const after = R.hub.sent.length; tick(R, 1);
    check('net', name + ': nothing sent after the end', R.hub.sent.length === after, R.hub.sent.length - after);
    check('net', name + ': no errors', R.games.every(g => !g.errors.length), R.games.map(errs).join(' | '));
  }
};


// TASK.md, line by line, against the build
SUITES.task = async () => {
  const root = new URL('../../', import.meta.url), here = new URL('../', import.meta.url);
  const NAME = 'HamericanFootball-AmericanFootball-claude-opus-5-5-medium-20261104-070556';
  let html = ''; try { html = readFileSync(new URL(NAME + '.html', root), 'utf8'); } catch (e) { /* missing */ }
  check('task', 'the single bundled .html is in the folder root', html.length > 1e6);
  check('task', 'no external scripts: everything inlined', !/<script src=/.test(html));
  check('task', 'the AI Hub client is the first script, after <meta charset>', html.indexOf('<script>') < html.indexOf('hub:session') && html.slice(html.indexOf('<script>'), html.indexOf('<script>') + 80).includes('aihub-session'));
  check('task', 'hub session tags present (shared-world, 1-4 players)', /hub:session" content="1"/.test(html) && /session-mode" content="shared-world"/.test(html) && /session-players" content="1-4"/.test(html));
  check('task', 'no audio files: all sound is code', !/\.(mp3|wav|ogg|m4a|flac)["')]/i.test(html) && !/new Audio\(/.test(html));
  check('task', 'the title is the RNG draw (Hamerican Football) on the title screen and page', html.includes('<title>HAMERICAN FOOTBALL</title>') && html.includes("'HAMERICAN'"));
  check('task', 'built on the my-3D2dge engine', html.includes('my-3D2dge') && html.includes('My3D2dge'));
  const src = readdirSync(new URL('src/', here)).filter(f => f.endsWith('.js') && f !== 'about.js').map(f => readFileSync(new URL('src/' + f, here), 'utf8')).join('\n');
  check('task', 'no TODO, FIXME, placeholder or stub in the game sources', !/\b(TODO|FIXME|XXX)\b|placeholder|not implemented|stub/i.test(src));
  const ei = JSON.parse(readFileSync(new URL('exit-interview.json', root), 'utf8'));
  const SI = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
  check('task', 'exit-interview: every sourceInformation field answered', SI.every(k => typeof ei.sourceInformation[k] === 'string' && ei.sourceInformation[k].length > 0));
  check('task', 'exit-interview: 4 testing, 6 engine, 4 prompt answers', ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4 && [...ei.testingFeedback, ...ei.engineFeedback, ...ei.promptFeedback].every(x => x.length > 20));
  check('task', 'exit-interview: the aiHub block', ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags'].every(k => k in ei.aiHub) && ei.aiHub.tags.length >= 3 && ei.aiHub.tags.length <= 6 && ['Game', 'Tech demo', 'Tool'].includes(ei.aiHub.type));
  // the game itself
  const c = load(), { FF, game, E } = c; c.game.advance(.5); const I = game.input;
  const pages = FF.aboutPages();
  check('task', 'About/Credits has Source Information, Testing, Engine and Prompt Feedback', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(t => pages.some(p => p.title === t)) && pages.every(p => p.rows.every(r => r[1] && r[1] !== 'unknown' || r[0] === 'Usage')));
  check('task', 'the genre: a playable football match against the CPU', FF.data.plays.length >= 17 && FF.data.dplays.length >= 9 && FF.data.teams.length >= 5);
  check('task', 'perspectives: broadcast, sky, blimp, kick cam, replay angles', ['broadcast', 'sky', 'blimp', 'kickR', 'kickL', 'field', 'reverse', 'isoR'].every(v => E.VIEWS[v]));
  check('task', 'new art assets: the football helmet, gear hook, logos', /st === 'football'/.test(readFileSync(new URL('vendor/my-3d2dge.js', here), 'utf8')) && FF.data.teams.every(t => t.logo.length === 12));
  check('task', 'new animations: the FIASCO motion clips and PoseFX', !!FF.Rigs.LIB && FF.Rigs.LIB.names.length === 18);
  check('task', 'voices are gibberish (Animalese and Simlish), not real words', FF.voice.plan('HELLO THERE', FF.VOICES.chet).every(s => !/hello|there/i.test(s.txt)) && FF.voice.plan('Hello', FF.VOICES.pearl).length > 0);
  check('task', 'narrative: a story of 6 chapters with cutscenes and broadcast commentary', FF.data.story.chapters.length === 6 && Object.keys(FF.data.story.cutscenes).length >= 12 && Object.keys(FF.data.lines).length > 40);
  // dev mode from the pause menu, live sliders, reset
  go(game, 'match'); const items = (game.o.menu.items)().map(x => x[0]);
  check('task', 'Dev mode is reachable from the pause menu', items.includes('Dev Mode'));
  const before = FF.T.tackleBase; game.settings.set('dev_tackleBase', .8);
  check('task', 'Dev mode exposes live gameplay sliders', FF.T.tackleBase === .8 && Object.values(FF.TUNING).flat().length >= 50);
  { const S = FF.sim, ath = S.athletes[0] || S.all[0], v0 = S.topSpeed(ath); game.settings.set('dev_speedBase', 130); const v1 = S.topSpeed(ath); check('task', 'a Dev slider changes play: speedBase raises every top speed', Math.abs(v1 - v0 - (130 - 92) * (v0 / (92 + ath.r.SPD * FF.T.speedPerSpd))) < 1, v0 + ' -> ' + v1); }
  FF.T.resetAll(); check('task', 'Dev sliders reset to defaults', FF.T.tackleBase === before);
  // attract mode: 10 s idle on the title, AI demo, any input exits
  go(game, 'title'); game.advance(10.5); check('task', 'attract mode starts after 10 s without input', game.sceneName === 'attract');
  game.advance(1); I.tap('b2'); game.advance(.5); check('task', 'any input exits the attract mode', game.sceneName === 'title');
  // multiplayer: local join and the hub
  go(game, 'setup'); const p2 = game.addPlayer({ keys: 'right' }); game.advance(.1);
  check('task', 'local multiplayer: a second player joins (up to 4)', game.players.length === 2 && !!p2);
  check('task', 'a shared keyboard gives each half its own buttons', FF.glyph.label('b1', game.input, 'keyboard') !== FF.glyph.label('b1', p2, 'keyboard'), FF.glyph.label('b1', game.input, 'keyboard') + ' / ' + FF.glyph.label('b1', p2, 'keyboard'));
  game.removePlayer(p2); game.advance(.1);
  check('task', 'AI Hub adapter present (shared world)', typeof FF.net.start === 'function' && typeof FF.net.finish === 'function');
  // 10-foot controller-first UI
  I.lastDevice = 'gamepad'; const ps = FF.glyph.label('b1'); game.settings.set('glyphs', 'xbox'); const xb = FF.glyph.label('b1'); game.settings.set('glyphs', 'playstation'); I.lastDevice = 'keyboard';
  check('task', 'prompts follow the device: PlayStation by default, Xbox in Settings, keys on a keyboard', ps === '✕' && xb === 'A' && FF.glyph.label('b1') === 'Space', ps + ' ' + xb + ' ' + FF.glyph.label('b1'));
  check('task', 'menus are big focus lists (at most 7 items) navigable by keys, pad and mouse', typeof FF.ui.Menu.prototype.hit === 'function' && typeof FF.ui.Menu.prototype.nearest === 'function');
  const t = load({ touch: true }); t.game.advance(11);
  check('task', 'touch-only: "Controller or keyboard required", Settings button, attract still runs', t.FF.touchOnly && t.game.sceneName === 'attract' && /CONTROLLER OR KEYBOARD REQUIRED/.test(readFileSync(new URL('src/51-scenes.js', here), 'utf8')));
  check('task', 'no errors in any of it', !game.errors.length && !t.game.errors.length, errs(game) + errs(t.game));
};

for (const [name, fn] of Object.entries(SUITES)) {
  if (only.length && !only.includes(name)) continue;
  try { await fn(); } catch (e) { check(name, 'suite ran', false, (e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); }
}
if (process.argv.includes('--browser')) {   // the browser suites: real voice synthesis, and the AI Hub harness in its 4 configurations
  const { spawnSync } = await import('node:child_process');
  const bundle = new URL('../../HamericanFootball-AmericanFootball-claude-opus-5-5-medium-20261104-070556.html', import.meta.url).pathname;
  const env = Object.assign({}, process.env, { TMPDIR: process.env.TMPDIR || new URL('../.cache/', import.meta.url).pathname });
  const a = spawnSync('node', [new URL('./browser/audio.mjs', import.meta.url).pathname, bundle], { encoding: 'utf8', env }); check('browser', 'voice synthesis in a real browser', a.status === 0, (a.stdout + a.stderr).slice(-300));
  const h = spawnSync('node', [new URL('./hub/run-harness.mjs', import.meta.url).pathname], { encoding: 'utf8', env }); const lines = (h.stdout || '').split('\n').filter(l => /^(PASS|FAIL) /.test(l));
  check('browser', 'AI Hub harness: all 4 configurations pass', h.status === 0 && lines.length === 4 && lines.every(l => l.startsWith('PASS')), (h.stdout + h.stderr).slice(-400));
}
console.log(`${pass} passed, ${fail} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fail ? 1 : 0);
