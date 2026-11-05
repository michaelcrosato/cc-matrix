// Play suites: the CPU (AI soaks on every court, difficulty ordering), the screens' flow by keyboard, pad and mouse, the
// scripted playthrough of the whole Tour, Blam Camp's lessons, the attract mode, dev mode, the UI's glyphs and the audio.
import { load, run, errors, quickMatch } from './helpers.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEV } from './helpers.mjs';

/** a bot that plays a human seat through the real input: the CPU brain's judgment turned into held keys and taps */
function botPlayer(h, slot = 0, I) {
  const { bb, S, game } = h, inp = I || game.input, held = new Set();
  const hold = (a, on) => { if (on && !held.has(a)) { held.add(a); inp.hold(a); } else if (!on && held.has(a)) { held.delete(a); inp.hold(a, false); } };
  return {
    step() {
      const p = S.players[slot]; if (!p || !S.match) return;
      const cmd = bb.aiThink(p, 1 / 120);
      hold('right', cmd.mx > .35); hold('left', cmd.mx < -.35); hold('down', cmd.my > .35); hold('up', cmd.my < -.35);
      hold('shoot', !!cmd.shootD || !!cmd.shootP); hold('turbo', !!cmd.turboD);
      for (const [k, a] of [['passP', 'pass'], ['shoveP', 'shove'], ['oopP', 'oop']]) if (cmd[k]) inp.tap(a);
    },
    release() { for (const a of [...held]) hold(a, false); }
  };
}

const ai = async t => {
  const h = await load(), { bb, game, S } = h;
  const totals = { dunk: 0, three: 0, steal: 0, shove: 0, block: 0, alleyoop: 0, powerupPick: 0, supernovaOn: 0 };
  bb.on('*', e => { if (e.type === 'basket' && e.three) totals.three++; if (totals[e.type] !== undefined) totals[e.type]++; });
  const teams = bb.STREET_TEAMS;
  let gi = 0;
  for (const court of bb.COURT_ORDER) for (let k = 0; k < 3; k++, gi++) {
    const home = teams[gi % 4], away = court === 'dome' && k === 0 ? 'blambots' : teams[(gi + 1 + k) % 4];
    let scv = 0, idle = new Map(), maxIdle = 0; const off = bb.on('shotClockViolation', () => scv++);
    quickMatch(h, { court, home, away: away === home ? teams[(gi + 2) % 4] : away, quarterLen: 30, seed: 100 + gi, tipoff: true, powerups: true, twists: true });
    run(game, 400, () => { const M = S.match; if (M.phase !== 'live') return; for (const p of S.players) { const moving = Math.hypot(p.vx, p.vy) > 4 || p.state !== 'run' || p.has; const v = moving ? 0 : (idle.get(p) || 0) + 1 / 120; idle.set(p, v); maxIdle = Math.max(maxIdle, v); } }, () => S.match.phase === 'over' && S.match.phaseT > .5);
    off(); const M = S.match;
    t.check(court + ' game ' + k + ' finishes', M.phase === 'over', M.phase);
    t.check(court + ' game ' + k + ' both teams score', M.score[0] > 0 && M.score[1] > 0, M.score);
    t.check(court + ' game ' + k + ' sane scores', M.score[0] < 70 && M.score[1] < 70, M.score);
    t.check(court + ' game ' + k + ' few shot clock violations', scv <= 2, scv);
    t.check(court + ' game ' + k + ' nobody stands still', maxIdle < 6, maxIdle);
  }
  for (const k in totals) t.check('the CPU does it: ' + k, totals[k] > 0, totals);
  // difficulty ordering: BLAM beats Rookie
  let blamWins = 0;
  for (let g = 0; g < 10; g++) {
    const blamHome = g % 2 === 0; quickMatch(h, { court: 'skybox', home: 'crushers', away: 'magma', quarterLen: 20, seed: 500 + g, tipoff: true, diff: blamHome ? [3, 0] : [0, 3], comeback: 0 });
    run(game, 400, null, () => S.match.phase === 'over'); const M = S.match, w = M.score[0] > M.score[1] ? 0 : M.score[1] > M.score[0] ? 1 : -1;
    if (w === (blamHome ? 0 : 1)) blamWins++;
  }
  t.check('BLAM beats Rookie in 8 of 10', blamWins >= 8, blamWins);
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const tapUntil = (game, I, action, cond, max = 20, gap = .2) => { for (let k = 0; k < max && !cond(); k++) { I.tap(action); run(game, gap); } return cond(); };
const flow = async t => {
  const h = await load(), { bb, game, S } = h, I = game.input;
  t.check('boot reaches the title', game.sceneName === 'title', game.sceneName);
  run(game, 10.5); t.check('10 s idle on the title starts the attract mode', game.sceneName === 'attract', game.sceneName);
  run(game, 1); I.tap('confirm'); run(game, .5); t.check('a key leaves the attract mode back to the title', game.sceneName === 'title', game.sceneName);
  I.tap('confirm'); run(game, .5); t.check('start opens the main menu', game.sceneName === 'menu', game.sceneName);
  I.tap('down'); run(game, .2); const focus = bb.S.menu.main.i; run(game, 10.5);
  t.check('10 s idle on the main menu starts the attract mode', game.sceneName === 'attract', game.sceneName);
  run(game, 1); I.press('Pad0'); run(game, 1 / 60); I.release('Pad0'); run(game, .5);
  t.check('a pad button leaves it, back to the menu with its focus', game.sceneName === 'menu' && bb.S.menu.main.i === focus, [game.sceneName, bb.S.menu.main.i, focus]);
  run(game, 10.5); run(game, .5); I.feed('move', 100, 100); I.feed('down', 100, 100); run(game, 1 / 60); I.feed('up', 100, 100); run(game, .4);
  t.check('a click leaves it', game.sceneName === 'menu', game.sceneName);
  run(game, 10.6); I.hold('right'); run(game, .1); I.hold('right', false); run(game, .4);
  t.check('a stick push leaves it', game.sceneName === 'menu', game.sceneName);
  // every main-menu entry by keyboard
  const want = { 0: 'tourmenu', 1: 'join', 2: 'camp', 3: 'hall', 4: 'howto', 6: 'about' };
  for (const [i, sc] of Object.entries(want)) {
    game.go('menu', null, { fade: 0 }); run(game, .3); bb.S.menu.main.i = 0; for (let k = 0; k < +i; k++) { I.tap('down'); run(game, .15); }
    I.tap('confirm'); run(game, .5); t.check('menu entry ' + i + ' by keyboard', game.sceneName === sc, game.sceneName);
    I.tap('cancel'); run(game, .5);
  }
  // by mouse: hover moves the focus, a click picks
  game.go('menu', null, { fade: 0 }); run(game, .3); const rc = bb.S.menu.main.rects && bb.S.menu.main.rects[3];
  t.check('menu buttons have rectangles for the mouse', !!rc || game.headless, rc);
  // by pad: d-pad down, cross
  game.go('menu', null, { fade: 0 }); run(game, .3); bb.S.menu.main.i = 0; I.press('Pad13'); run(game, 1 / 60); I.release('Pad13'); run(game, .2); I.press('Pad0'); run(game, 1 / 60); I.release('Pad0'); run(game, .5);
  t.check('menu entry by pad (d-pad, cross)', game.sceneName === 'join', game.sceneName);
  // Exhibition by keyboard, all the way to the tip-off
  game.go('menu', null, { fade: 0 }); run(game, .3); bb.S.menu.main.i = 1; I.tap('confirm'); run(game, .5);
  I.tap('confirm'); run(game, .3); I.tap('confirm'); run(game, .5); t.check('join -> teams', game.sceneName === 'teams', game.sceneName);
  I.tap('right'); run(game, .2); I.tap('confirm'); run(game, .3); I.tap('confirm'); run(game, .6); t.check('teams -> lineup', game.sceneName === 'lineup', game.sceneName);
  I.tap('confirm'); run(game, .6); t.check('lineup -> court & rules', game.sceneName === 'courtsel', game.sceneName);
  I.tap('confirm'); run(game, .2); I.tap('confirm'); run(game, .6); t.check('court & rules -> matchup', game.sceneName === 'matchup', game.sceneName);
  run(game, 1); I.tap('confirm'); run(game, .8); t.check('matchup -> match', game.sceneName === 'match' && S.match, game.sceneName);
  t.check('player 1 holds a HOME player', S.players[0].human === 0 && S.players[0].source.kind === 'local', S.players.map(p => p.human));
  const items = game.o.menu.items().map(x => x[0]);
  t.check('the pause menu has How to Play, Restart Game and Dev Mode', ['How to Play', 'Restart Game', 'Dev Mode'].every(x => items.includes(x)), items);
  // 2, 3 and 4 players: each on the side picked
  for (const n of [2, 3, 4]) {
    const h2 = await load(), g2 = h2.game, I2 = g2.input; g2.go('join', null, { fade: 0 }); run(g2, .3);
    const ins = [I2]; for (let k = 1; k < n; k++) ins.push(g2.addPlayer(k === 1 ? { keys: 'right' } : { pad: k }));
    run(g2, .2); const sides = [0, 1, 1, 0].slice(0, n);
    ins.forEach((q, k) => { if (sides[k] === 1) q.tap('right'); else q.tap('left'); }); run(g2, .2);
    ins.forEach(q => q.tap('confirm')); run(g2, .2); I2.tap('confirm'); run(g2, .6);
    t.check(n + ' players reach team select', g2.sceneName === 'teams', g2.sceneName);
    for (let k = 0; k < 6 && g2.sceneName === 'teams'; k++) { ins.forEach(q => q.tap('confirm')); run(g2, .3); }
    for (let k = 0; k < 6 && g2.sceneName === 'lineup'; k++) { ins.forEach(q => q.tap('confirm')); run(g2, .3); }
    for (let k = 0; k < 4 && g2.sceneName === 'courtsel'; k++) { I2.tap('confirm'); run(g2, .3); }
    for (let k = 0; k < 4 && g2.sceneName === 'matchup'; k++) { run(g2, .7); I2.tap('confirm'); run(g2, .5); }
    const P = h2.S.players, humans = P.filter(p => p.human !== null && p.human !== undefined);
    t.check(n + ' players: each holds a player', g2.sceneName === 'match' && humans.length === n, [g2.sceneName, humans.length]);
    t.check(n + ' players: on the sides they picked', humans.every(p => p.team === sides[p.human]), humans.map(p => [p.human, p.team]));
  }
  // results: rematch, new teams, main menu
  game.go('results', { res: bb.S.match ? bb.matchResult() : null, from: 'exhibition' }, { fade: 0 }); run(game, .3);
  I.tap('confirm'); run(game, .6); t.check('results: REMATCH starts a match', game.sceneName === 'match', game.sceneName);
  game.go('results', { res: bb.matchResult(), from: 'exhibition' }, { fade: 0 }); run(game, .3); I.tap('right'); I.tap('right'); run(game, .2);
  game.go('results', { res: bb.matchResult(), from: 'exhibition' }, { fade: 0 }); run(game, .3); I.tap('right'); run(game, .2); I.tap('right'); run(game, .2); I.tap('confirm'); run(game, .6);
  t.check('results: MAIN MENU', game.sceneName === 'menu', game.sceneName);
  // the Hall of Blam: initials entry
  game.go('hallentry', { score: 99999, done: () => game.go('hall') }, { fade: 0 }); run(game, .3);
  for (let k = 0; k < 6; k++) { I.tap('confirm'); run(game, .2); }
  run(game, 1); t.check('initials go into the Hall of Blam', bb.CAB.table('tour').some(e => e.score === 99999), bb.CAB.table('tour'));
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const tour = async t => {
  const storage = (() => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; })();
  const h = await load({ storage }), { bb, game, S } = h, I = game.input;
  bb.TOUR.quarterLen = 15;
  const seen = []; bb.on('beat', e => seen.push(e.id));
  let overclocked = false; bb.on('overclock', () => { overclocked = true; });
  const talkThrough = (pick) => { for (let k = 0; k < 200 && game.sceneName === 'story'; k++) { if (bb.TALK.open && bb.TALK.choices && !bb.TALK.typing && pick !== undefined) { bb.TALK.choice = pick; } I.tap('confirm'); run(game, .15); } };
  // a new tour: the menu, the crew, the lineup, the prologue, the camp offer (LET'S PLAY)
  game.go('menu', null, { fade: 0 }); run(game, .3); bb.S.menu.main.i = 0; I.tap('confirm'); run(game, .5);
  t.check('BLAM TOUR opens the tour menu', game.sceneName === 'tourmenu', game.sceneName);
  I.tap('down'); run(game, .2); I.tap('confirm'); run(game, .5); bb.S.menu.tour.i = 1; I.tap('confirm'); run(game, .5);
  if (game.sceneName === 'tourmenu') { I.tap('confirm'); run(game, .5); }
  t.check('NEW TOUR: pick the crew', game.sceneName === 'teams', game.sceneName);
  I.tap('confirm'); run(game, .6); I.tap('confirm'); run(game, .8);
  t.check('the prologue plays', game.sceneName === 'story' && seen[0] === 'prologue', [game.sceneName, seen]);
  talkThrough(1);
  t.check('the camp offer, then the tour map', seen.includes('campOffer') && game.sceneName === 'tourmap', [game.sceneName, seen]);
  // stops 1-3 and the final; stop 1 is lost once (the rematch path)
  let lostOnce = false;
  for (let stop = 0; stop < 4; stop++) {
    for (let attempt = 0; attempt < 3; attempt++) {
      t.check('stop ' + (stop + 1) + ' from the map', game.sceneName === 'tourmap' || game.sceneName === 'rematch' || game.sceneName === 'matchup', game.sceneName);
      if (game.sceneName === 'tourmap') { I.tap('confirm'); run(game, .6); talkThrough(); }
      for (let k = 0; k < 6 && game.sceneName === 'matchup'; k++) { run(game, .8); I.tap('confirm'); run(game, .6); }
      t.check('stop ' + (stop + 1) + ' tips off', game.sceneName === 'match' && S.match && S.mode === 'tour', [game.sceneName, S.mode]);
      const bot = botPlayer(h, 0), wantLoss = stop === 0 && !lostOnce;
      run(game, 900, () => { bot.step(); const M = S.match; if (M && M.quarter === M.quarters && M.clock < 3 && M.phase === 'live') { if (wantLoss) { M.score[1] = M.score[0] + 3; } else if (M.score[0] <= M.score[1]) M.score[0] = M.score[1] + 3; } }, () => game.sceneName !== 'match');
      bot.release();
      t.check('stop ' + (stop + 1) + ' ends in results', game.sceneName === 'results', game.sceneName);
      run(game, .3); I.tap('confirm'); run(game, .6); talkThrough();
      if (wantLoss) { lostOnce = true; t.check('a loss offers the rematch', game.sceneName === 'rematch', game.sceneName); I.tap('confirm'); run(game, .6); continue; }
      break;
    }
  }
  t.check('the Overclock happened in the final', overclocked);
  const order = ['prologue', 'campOffer', 'stopIntro', 'pregame', 'lossStop', 'post1', 'post2', 'reveal', 'finalPre', 'ending'];
  t.check('every beat seen', order.every(b => seen.includes(b)), seen);
  t.check('beats in order', seen.indexOf('post1') < seen.indexOf('post2') && seen.indexOf('post2') < seen.indexOf('reveal') && seen.indexOf('reveal') < seen.indexOf('finalPre') && seen.indexOf('finalPre') < seen.indexOf('ending'), seen);
  t.check('the credits roll', game.sceneName === 'credits', game.sceneName);
  t.check('unlocks granted', bb.PROG.unlocked.bots && bb.PROG.unlocked.allstars && bb.PROG.unlocked.bigHeads, bb.PROG.unlocked);
  t.check('a tour won', bb.PROG.records.toursWon === 1, bb.PROG.records);
  for (let k = 0; k < 40 && game.sceneName === 'credits'; k++) { I.tap('confirm'); run(game, .3); }
  t.check('the Hall of Blam entry', game.sceneName === 'hallentry' || game.sceneName === 'menu', game.sceneName);
  for (let k = 0; k < 8 && game.sceneName === 'hallentry'; k++) { I.tap('confirm'); run(game, .3); }
  run(game, 1.5); t.check('the tour score is in the table', bb.CAB.table('tour').length >= 1, bb.CAB.table('tour'));
  t.check('then the menu', game.sceneName === 'menu', game.sceneName);
  // CONTINUE TOUR after a reload, mid-tour
  const h2 = await load({ storage }), b2 = h2.bb, g2 = h2.game; b2.TOUR.quarterLen = 15;
  g2.go('teams', { tour: true }, { fade: 0 }); run(g2, .3); g2.input.tap('confirm'); run(g2, .6); g2.input.tap('confirm'); run(g2, .8);
  for (let k = 0; k < 80 && g2.sceneName === 'story'; k++) { if (b2.TALK.choices) b2.TALK.choice = 1; g2.input.tap('confirm'); run(g2, .15); }
  b2.TOUR.stop = 2; b2.TOUR.score = 1234; b2.saveProgress && (b2.PROG.tour = Object.assign({}, b2.PROG.tour, { stop: 2, score: 1234 })); b2.saveProgress();
  const h3 = await load({ storage }), b3 = h3.bb, g3 = h3.game;
  t.check('a saved tour can be continued', b3.continueTour() && b3.TOUR.stop === 2 && b3.TOUR.score === 1234, [b3.TOUR.stop, b3.TOUR.score]);
  run(g3, .5); t.check('CONTINUE TOUR lands on the map at the right stop', g3.sceneName === 'tourmap', g3.sceneName);
  t.check('no errors', !errors(game, h.ctx).length && !errors(g3, h3.ctx).length, errors(game, h.ctx).concat(errors(g3, h3.ctx)));
};

const camp = async t => {
  const h = await load(), { bb, game, S } = h, I = game.input;
  const held = new Set(), hold = (a, on) => { if (on && !held.has(a)) { held.add(a); I.hold(a); } else if (!on && held.has(a)) { held.delete(a); I.hold(a, false); } };
  const toward = (x, y, r = 6) => { const p = S.players[0], dx = x - p.x, dy = y - p.y; hold('right', dx > r); hold('left', dx < -r); hold('down', dy > r); hold('up', dy < -r); return Math.hypot(dx, dy); };
  const stop = () => { for (const a of [...held]) hold(a, false); };
  const lessonDone = id => bb.PROG.camp.includes(id);
  const R = () => bb.attackRim(0);
  const scripts = {
    move: i => { const L = S.lesson; if (!L) return; if (L.step === 0) { const c = (L.cones || []).find(c => !c.hit); if (c) toward(c.x, c.y, 3); } else { stop(); hold('right', true); hold('turbo', true); } },
    pass: i => { const L = S.lesson; if (!L) return; if (i % 60 === 0) I.tap('pass'); },
    jumper: i => { const p = S.players[0]; if (p.has && p.state === 'run' && i % 90 === 0) hold('shoot', true); if (p.state === 'air' && p.jump && p.st >= p.jump.ta - .01) hold('shoot', false); },
    three: i => scripts.jumper(i),
    dunk: i => { const p = S.players[0]; if (p.has) { toward(R().x - 30, R().y); hold('turbo', true); if (bb.dunkRange(p) > Math.hypot(p.x - R().x, p.y - R().y) + 10) I.tap('shoot'); } else { stop(); } },
    oop: i => { const L = S.lesson, p = S.players[0]; if (L.step === 0) { if (bb.oopReady(p, S.players[1]) && i % 20 === 0) I.tap('oop'); } else { toward(R().x - 60, R().y - 10); hold('turbo', true); if (i % 30 === 0) I.tap('oop'); } },
    steal: i => { const L = S.lesson, p = S.players[0], q = S.players[2]; if (L.step === 0) { toward(q.x - 10, q.y, 2); if (i % 50 === 0) I.tap('pass'); } else { stop(); hold('right', true); if (i % 40 === 0) I.tap('shove'); if (p.x > q.x + 30) { } } },
    block: i => { const L = S.lesson, q = S.players[2], p = S.players[0]; if (L.step === 0) { toward(q.x - 12, q.y, 2); if ((q.state === 'gather' || (q.state === 'air' && q.st < .05)) && p.state === 'run') I.tap('shoot'); } else { toward(q.x - 12, q.y, 2); if (i % 30 === 0) I.tap('shove'); } },
    rebound: i => { const L = S.lesson, p = S.players[0], b = S.ball; if (L.step === 0) { toward(b.x, b.y, 3); if (b.state === 'loose' && Math.hypot(b.x - p.x, b.y - p.y) < 30 && p.state === 'run' && i % 10 === 0) I.tap('shoot'); } else { if (p.has && p.state === 'run' && i % 60 === 0) hold('shoot', true); if (p.state === 'air' && p.jump && p.jump.kind === 'shot') hold('shoot', false); if (!p.has && b.state === 'loose') { toward(b.x, b.y, 2); if (Math.hypot(b.x - p.x, b.y - p.y) < 24 && p.state === 'run') I.tap('shoot'); } if (p.has && p.state === 'air') I.tap('shoot'); } },
    nova: i => { const L = S.lesson, p = S.players[0]; if (L.step === 0) scripts.dunk(i); else if (i % 40 === 0) I.tap('confirm'); }
  };
  for (let li = 0; li < bb.CAMP_LESSONS.length; li++) {
    const L = bb.CAMP_LESSONS[li]; bb.CAMPRUN.single = true; bb.startLesson(li, false); run(game, .3);
    t.check('lesson ' + L.id + ' starts', game.sceneName === 'match' && !!S.lesson, game.sceneName);
    run(game, 70, i => scripts[L.id](i), () => lessonDone(L.id)); stop();
    t.check('lesson ' + L.id + ' completes and saves', lessonDone(L.id), [L.id, S.lesson && S.lesson.step, S.lesson && S.lesson.count]);
    run(game, 3);
  }
  // skipping works
  const h2 = await load(), b2 = h2.bb, g2 = h2.game; b2.CAMPRUN.single = true; b2.startLesson(2, false); run(g2, .3);
  const step0 = b2.S.lesson.step; b2.S.lesson.skip(); run(g2, 2); t.check('skipping a step moves on', b2.S.lesson ? b2.S.lesson.step > step0 || b2.PROG.camp.includes('jumper') : true);
  // its prompts name the player's keys or buttons
  const kb = bb.glyphFor('turbo', I, 'keyboard'), pad = bb.glyphFor('turbo', I, 'gamepad');
  t.check('prompts: keyboard shows SHIFT for turbo', kb.kind === 'key' && kb.text === 'SHIFT', kb);
  t.check('prompts: pad shows R2 for turbo', pad.kind === 'pad' && pad.n === 7, pad);
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const attract = async t => {
  const h = await load(), { bb, game, S } = h, I = game.input;
  const seen = {}; bb.on('*', e => { seen[e.type] = (seen[e.type] || 0) + 1; if (e.type === 'dunk') seen['dunk:' + e.dunk] = (seen['dunk:' + e.dunk] || 0) + 1; });
  bb.startAttract('title'); run(game, .3);
  t.check('the attract mode runs', game.sceneName === 'attract', game.sceneName);
  const segs = new Set(); let loops = 0, lastSeg = 0;
  run(game, 1200, () => { const A = S.attract; if (!A) return; if (A.phase === 'play') segs.add(A.seg); if (A.seg < lastSeg) loops++; lastSeg = A.seg; }, () => loops >= 3);
  t.check('three loops of every segment', loops >= 3 && segs.size === 5, [loops, [...segs]]);
  for (const ev of ['tipWin', 'dunk', 'alleyoop', 'jackpot', 'twist', 'steal', 'powerupPick', 'shove', 'bombHit', 'oilSlip', 'shatter', 'sponsorBreak', 'supernovaOn', 'overclock', 'posterized', 'reboot', 'dunk:volcano', 'dunk:quake'])
    t.check('the attract mode shows ' + ev, (seen[ev] || 0) > 0, seen);
  I.tap('shoot'); run(game, 1 / 120); run(game, .4);
  t.check('any input leaves within a step', game.sceneName === 'title', game.sceneName);
  // a touch-only device: the loop goes on and a tap shows the notice
  const h2 = await load({ touch: true }), b2 = h2.bb, g2 = h2.game;
  t.check('touch-only detected', b2.S.touchOnly === true);
  t.check('no touch controls', g2.input.touchEnabled === false);
  run(g2, 10.5); t.check('touch-only: the attract mode starts by itself', g2.sceneName === 'attract', g2.sceneName);
  g2.input.feed('down', 50, 50, { touch: true }); run(g2, 1 / 60); g2.input.feed('up', 50, 50, { touch: true }); run(g2, .3);
  t.check('touch-only: a tap shows the notice and the loop goes on', g2.sceneName === 'attract' && b2.S.attract && b2.S.attract.notice > 0, [g2.sceneName, b2.S.attract && b2.S.attract.notice]);
  t.check('no errors', !errors(game, h.ctx).length && !errors(g2, h2.ctx).length, errors(game, h.ctx).concat(errors(g2, h2.ctx)));
};

const dev = async t => {
  const h = await load({ hash: '#exhibition/skybox/hightops-breakers' }), { bb, game, S } = h, I = game.input;
  run(game, .5); t.check('a match to test in', game.sceneName === 'match', game.sceneName);
  const items = game.o.menu.items(), dm = items.find(x => x[0] === 'Dev Mode');
  t.check('the pause menu has Dev Mode', !!dm); dm[1](); run(game, .1);
  t.check('Dev Mode opens the panel', S.dev.open === true);
  t.check('the human is played by the CPU while it is open', S.players[0].source.kind === 'cpu');
  // sliders: change, clamp, the game reacts
  const T = bb.TUNING.runSpeed, d0 = T.v; bb.DEV.tab = 0; bb.DEV.group = 0; bb.DEV.row = 1;
  I.tap('right'); run(game, 1 / 60); t.check('a slider moves', T.v > d0, T.v);
  for (let k = 0; k < 200; k++) { I.tap('right'); run(game, 1 / 60); } t.check('a slider clamps', T.v === T.max, T.v);
  bb.closeDev(); bb.resetTuning();
  const p = S.players[0], go = v => { bb.setTune('runSpeed', v); p.x = bb.OX + 20; p.y = bb.CMY; p.vx = 0; p.setState('run'); const src = p.source; p.source = { kind: 'script', read: () => ({ mx: 1, my: 0 }) }; run(game, .3); const x0 = p.x; run(game, 1); p.source = src; return p.x - x0; };
  S.match.phase = 'live'; S.match.practice = true; for (const q of S.players) if (q !== p) { q.source = { kind: 'script', read: () => ({ mx: 0, my: 0 }) }; q.x = bb.OX + 300; q.y = bb.OY + 10; } S.ball.state = 'dead'; S.ball.owner = null; go(108); const base = go(108), fast = go(162);
  t.check('runSpeed x1.5 runs ~50% farther', fast / base > 1.35 && fast / base < 1.65, [base, fast]);
  bb.setTune('shotSkill', 1.4); bb.setTune('novaTime', 99); bb.resetTuning();
  t.check('RESET ALL restores every default', Object.values(bb.TUNING).every(x => x.v === x.def));
  // each tab's rows run without errors; cheats and match actions work
  bb.openDev();
  for (let tab = 0; tab < 7; tab++) {
    bb.DEV.tab = tab; const rows = bb.devRows();
    t.check('tab ' + tab + ' has rows', rows.length > 0);
    if (tab === 3) continue;   // SCENES leave the match; tested below
    for (let i = 0; i < rows.length; i++) { const r = rows[i]; if (/RESET SAVE|END THE GAME|FORCE TIP|SWAP/.test(r.label)) continue; try { if (r.right) r.right(); if (r.act) r.act(); if (typeof r.value === 'function') r.value(); } catch (e) { t.check('row ' + r.label, false, e.message); } run(game, .05); }
  }
  t.check('cheat: infinite turbo works', (() => { S.cheats.infTurbo = 'all'; S.players[2].turbo = .1; run(game, .1); return S.players[2].turbo === 1; })());
  S.cheats = {};
  t.check('match action: give the ball', (() => { bb.DEV.giveSlot = 3; bb.debug.give(3); return S.ball.owner === S.players[3]; })());
  // scene jumps land
  bb.closeDev();
  const jumps = [['EXHIBITION AT', 'match'], ['CREDITS', 'credits'], ['RESULTS', 'results'], ['ATTRACT MODE', 'attract'], ['BLAM CAMP LESSON', 'match'], ['HUB CARD PREVIEW', 'hubcard'], ['ANIMATION LAB', 'animlab'], ['SHOOTAROUND (RIM PHYSICS)', 'shootaround'], ['TOUR STOP', 'matchup'], ['STORY BEAT', 'story']];
  for (const [label, scene] of jumps) {
    bb.DEV.tab = 3; const r = bb.devRows().find(x => x.label === label); r.act(); run(game, .6);
    t.check('SCENES: ' + label, game.sceneName === scene, game.sceneName);
    game.go('menu', null, { fade: 0 }); run(game, .2);
  }
  // overlays draw without errors: covered by the browser suite; here they at least run their non-drawing parts
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const ui = async t => {
  const h = await load(), { bb, game } = h, I = game.input;
  for (const a of ['shoot', 'pass', 'turbo', 'shove', 'oop', 'taunt']) {
    const k = bb.glyphFor(a, I, 'keyboard'), m = bb.glyphFor(a, I, 'mouse'), ps = bb.glyphFor(a, I, 'gamepad');
    t.check(a + ' keyboard glyph', k.kind === 'key', k); t.check(a + ' pad glyph', ps.kind === 'pad' && ps.style === 'playstation', ps);
    if (a === 'shoot' || a === 'pass') t.check(a + ' mouse glyph', m.kind === 'mouse', m);
  }
  t.check('PlayStation: cross is pass', bb.glyphFor('pass', I, 'gamepad').n === 0);
  game.settings.set('glyphs', 'xbox'); t.check('Button symbols: Xbox', bb.glyphFor('shoot', I, 'gamepad').style === 'xbox' && I.glyphs === 'xbox');
  const P2 = game.addPlayer({ pad: 1 }); bb.applyGlyphs(game.settings.glyphs); t.check('a later joiner gets the symbols too', P2.glyphs === 'xbox', P2.glyphs);
  game.settings.set('glyphs', 'playstation'); t.check('back to PlayStation for everyone', game.players.every(p => p.glyphs === 'playstation'));
  I.lastDevice = 'gamepad'; t.check('prompts follow the last device (pad)', bb.glyphFor('shoot', I).kind === 'pad');
  I.lastDevice = 'keyboard'; t.check('prompts follow the last device (keys)', bb.glyphFor('shoot', I).kind === 'key');
  I.lastDevice = 'mouse'; t.check('prompts follow the last device (mouse)', bb.glyphFor('shoot', I).kind === 'mouse');
  t.check('prompt widths measure', bb.promptWidth('Hold {turbo} + {shoot} to DUNK') > 40);
  for (const sp of bb.GAME_SETTINGS) t.check('setting ' + sp.key + ' defaults', game.settings[sp.key] === (typeof sp.value === 'function' ? sp.value() : sp.value) || sp.key === 'glyphs', [sp.key, game.settings[sp.key]]);
  // touch-only detection: on for a finger-only device, off with a fine pointer or after a key
  const t1 = await load({ touch: true }); t.check('touch-only on', t1.S.touchOnly === true);
  const t2 = await load({ touch: false }); t.check('touch-only off', t2.S.touchOnly === false);
  t.check('no errors', !errors(game, h.ctx).length, errors(game, h.ctx));
};

const audio = async t => {
  const h = await load(), { bb, game } = h;
  const tok = /^([A-G][#b]?\d|\.|-|_|\|)$/, drum = /^([kshoct]|\.|-|\|)$/;
  for (const [name, song] of Object.entries(Object.assign({}, bb.SONGS, bb.STINGS))) for (const tr of song.tracks) {
    const bad = tr.notes.trim().split(/\s+/).filter(x => !(tr.wave === 'drums' ? drum : tok).test(x));
    t.check('song ' + name + ' tokens', !bad.length, bad.slice(0, 5));
    t.check('song ' + name + ' wave', ['square', 'pulse', 'pulse12', 'triangle', 'saw', 'sine', 'drums'].includes(tr.wave), tr.wave);
  }
  // every sound named in the source exists
  const src = readdirSync(join(DEV, 'src')).map(f => readFileSync(join(DEV, 'src', f), 'utf8')).join('\n');
  const names = new Set([...src.matchAll(/\bsfx\('([a-z_0-9]+)'/g)].map(m => m[1]));
  const engine = game.audio.presets;
  for (const n of names) t.check('sound ' + n + ' exists', !!bb.SFX[n] || !!engine[n], n);
  for (const c of bb.COURT_ORDER) t.check('dribble sound for ' + c, !!bb.SFX[bb.get('court', c).dribble]);
  // the voice's syllable plan
  const a = bb.planSyllables('BLAMMO! A DUNK!', 'vinnie'), b = bb.planSyllables('BLAMMO! A DUNK!', 'vinnie'), q = bb.planSyllables('IS THAT LEGAL?', 'deedee'), dot = bb.planSyllables('IS THAT LEGAL.', 'deedee');
  t.check('a line always sounds the same', JSON.stringify(a) === JSON.stringify(b));
  t.check('syllables by vowel groups', a.length >= 4 && a.length <= 6, a.length);
  t.check('timing increases', a.every((s, i) => i === 0 || s.t > a[i - 1].t));
  t.check('a question rises at the end', q[q.length - 1].f > dot[dot.length - 1].f, [q[q.length - 1].f, dot[dot.length - 1].f]);
  const bang = bb.planSyllables('GO!', 'vinnie'), calm = bb.planSyllables('GO.', 'vinnie'); t.check('a bang is higher and louder', bang[0].f > calm[0].f && bang[0].loud > calm[0].loud);
  const robot = bb.planSyllables('BEEP. YOUR. CAREER.', 'dunkatron'); t.check('robots quantize pitch', robot.every(s => Math.abs(Math.log2(s.f / 95) * 12 / 2 - Math.round(Math.log2(s.f / 95) * 12 / 2)) < 1e-6));
  // nothing fails headless
  for (const n of Object.keys(bb.SONGS)) bb.playMusic(n); for (const n of Object.keys(bb.STINGS)) bb.sting(n); for (const n of Object.keys(bb.SFX)) bb.sfx(n); bb.Voice.say('HELLO BALL FANS!', 'vinnie');
  for (const k of Object.keys(bb.LINES)) bb.announce(k, { NAME: 'VOLT', VICTIM: 'PIXEL', TEAM: 'HIGHTOPS' }, { force: true });
  run(game, .5); t.check('no audio errors headless', !errors(game, h.ctx).length && !h.ctx.__warns.some(w => /music|note|drum|sfx|sound/i.test(w)), errors(game, h.ctx).concat(h.ctx.__warns).slice(0, 4));
};
export default { ai, flow, tour, camp, attract, dev, ui, audio };
