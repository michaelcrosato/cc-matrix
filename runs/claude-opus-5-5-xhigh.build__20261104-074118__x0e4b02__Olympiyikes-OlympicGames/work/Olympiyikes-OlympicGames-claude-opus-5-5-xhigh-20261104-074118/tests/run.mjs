// The one command: node tests/run.mjs [--quick] [--only <suite>]. Headless suites first (the game in a vm, driven by
// game.advance and input taps), then the browser suites (Playwright, against the bundled HTML). Prints only failures,
// then one line with the count. Exit code 1 on any failure.
import { boot, DEV } from './harness.mjs';
import { readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
let checks = 0, failed = 0; const t0 = Date.now(); let tHead = 0;
const check = (suite, what, ok, detail = '') => { checks++; if (!ok) { failed++; console.log(`FAIL [${suite}] ${what}${detail ? ': ' + String(detail).slice(0, 300) : ''}`); } return ok; };
const run = async (name, fn) => { if (only && only !== name) return; try { await fn(); } catch (e) { check(name, 'suite ran', false, (e && e.stack || e).toString().split('\n').slice(0, 4).join(' / ')); } };
const quickMeet = (O, id, o = {}) => O.flow.newMeet(Object.assign({ mode: 'single', events: [id], players: [], seed: 4242 }, o));
const EVENTS = ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights', 'skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey'];

/** a CPU-only run of an event in a sandbox; returns the athletes with their attempts */
function simEvent(h, id, seed, setup, post) {
  const { O } = h, def = O.EVENTS[id];
  O.meet = quickMeet(O, id, { seed }); const ath = O.makeAthletes(def, O.meet); if (setup) setup(ath);
  const ctx = O.makeCtx(def, O.meet, ath); if (def.build) def.build(ctx); if (post) post(ctx);
  if (def.format.type === 'race' || def.format.type === 'match') { O.sandbox = true; def.start(ctx); for (let i = 0; i < 60 * 1500 && !def.done(ctx); i++) { for (const a of ath) O.pilot(ctx, a, 1 / 60); def.step(ctx, 1 / 60); ctx.t += 1 / 60; } O.sandbox = false; for (const a of ath) a.attempts[0] = { perf: def.perf(ctx, a), done: true }; if (def.placings) def.placings(ctx); }
  else for (let r = 0; r < def.format.attempts; r++) { ctx.round = r; for (const a of ath) a.attempts[r] = O.simAttempt(ctx, a); }
  return { ctx, ath, def };
}
const hashOf = res => JSON.stringify(res.ath.map(a => [a.nation, a.attempts.map(x => x && x.perf), a.matchRank]));
/** an event played live through the runner and the human's real input (autopilot) */
function liveEvent(h, id, o = {}) {
  const { O, game } = h;
  O.meet = quickMeet(O, id, { players: [{ nation: o.nation || 'SUN', input: game.input }].concat(o.more || []), seed: o.seed || 99 });
  let res = null; const orig = O.flow.eventDone; O.flow.eventDone = r => { res = r; };
  game.go('ev:' + id, {}, { fade: 0 }); game.advance(.05);
  O.autoAll = !o.idle; if (o.perfect) { O.Dev.perfect = true; }
  h.until(() => res, o.max || 600, .1);
  O.autoAll = false; O.Dev.perfect = false; O.flow.eventDone = orig;
  return res;
}

// ---------------------------------------------------------------------------------------------------------------
await run('core', async () => {
  const S = 'core', h = boot(), { O, E, game } = h;
  game.advance(1);
  check(S, 'boot reaches the title', game.sceneName === 'title', game.sceneName);
  for (const n of ['title', 'menu', 'attract', 'gamesSetup', 'nations', 'opening', 'dayCard', 'beat', 'eventCard', 'results', 'initials', 'podium', 'medals', 'torch', 'closing', 'credits', 'single', 'singleMenu', 'records', 'howto', 'about', 'poselab', 'hubCard', 'hubSplash'].concat(EVENTS.map(e => 'ev:' + e))) check(S, 'scene registered: ' + n, !!O.scenes[n]);
  check(S, 'confirm and cancel never on J or K', !O.KEYS.confirm.concat(O.KEYS.cancel).some(c => c === 'KeyJ' || c === 'KeyK'));
  check(S, 'PlayStation symbols by default', game.input.padStyle() === 'playstation' && O.Prompt.family(game.input) === 'playstation');
  game.settings.set('promptStyle', 'xbox'); check(S, 'the setting switches the prompts to Xbox', O.Prompt.family(game.input) === 'xbox'); game.settings.set('promptStyle', 'playstation');
  let bad = [];
  for (const dev of ['keyboard', 'mouse', 'gamepad']) for (const a of ['mashL', 'mashR', 'action', 'turbo', 'alt', 'confirm', 'cancel', 'pause', 'tabL', 'tabR', 'up', 'down', 'left', 'right']) { const c = O.Prompt.codeFor(game.input, a, dev); if (!c) { bad.push(a + '@' + dev); continue; } const l = /^Pad\d+$/.test(c) ? 'pad' : O.Prompt.keyLabel(game.input, c); if (!l || l.includes('?')) bad.push(a + '@' + dev + '=' + l); }
  check(S, 'every action has an icon on every device', !bad.length, bad.join(' '));
  for (const id of EVENTS) { const ev = O.EVENTS[id]; if (ev.format.type === 'match') continue; const wr = ev.measure.wr[0], k = ev.measure.better === 'lower' ? 1 : -1, p1 = O.points(id, wr * (1 + .05 * k)), p0 = O.points(id, wr); check(S, 'points rise with the performance: ' + id, p0 > p1 && p0 > 500 && p0 < 1500, p0 + ' vs ' + p1); }
  O.Records.reset(); const t = O.Records.table('sprint'); check(S, 'a record table is seeded with the WR holder', t.length === 5 && t[0].perf === 9.48 && t[0].nat === 'TRB');
  check(S, 'a mark that beats the 5th qualifies', O.Records.qualifies('sprint', t[4].perf - .01) && !O.Records.qualifies('sprint', 99));
  O.Records.insert('sprint', { name: 'X', init: 'ABC', nat: 'SUN', perf: 9.3 }); check(S, 'inserting a new record puts it first', O.Records.table('sprint')[0].init === 'ABC'); O.Records.reset();
  O.tune.set('sprint', 'vMax', 15); check(S, 'a tunable changes', O.tune.get('sprint').vMax === 15); O.tune.reset('sprint'); check(S, 'reset restores the default', O.tune.get('sprint').vMax === O.tune.specs('sprint').vMax.def && !Object.keys(O.tune.changed('sprint')).length);
  O.meet = quickMeet(O, 'sprint'); const a1 = O.rng('x')(), a2 = O.rng('x')(), b1 = O.rng('y')(); check(S, 'random streams are deterministic per label', a1 === a2 && a1 !== b1);
  check(S, 'engine change 1: hooks exported', !!E.HOOKS && Array.isArray(E.HOOKS.input));
  const rig = new E.Humanoid({}); rig.post = (r, J) => { J.head = [9, 9, 9]; }; rig.update(1 / 60, { x: 0, y: 0, z: 0 }); check(S, 'engine change 5: the pose hook edits joints', rig.J.head[0] === 9);
  rig.post = null; rig.bodyPitch = Math.PI; rig.update(1 / 60, { x: 0, y: 0, z: 0 }); check(S, 'engine change 5: whole-body pitch', rig.J.head[2] < rig.J.footL[2]);
  const eng = readFileSync(path.join(DEV, 'engine/my-3d2dge.js'), 'utf8');
  check(S, 'engine change 2/3/4/6 present', eng.includes('const cosmetic = rng(0xC05E7)') && eng.includes('"✕":') && eng.includes("value: 'playstation' /* OLY") && eng.includes('_voiceBus'));
  check(S, 'the voices volume setting exists', game.settings.spec('voices') && game.settings.voices === .8);
  const src = readdirSync(path.join(DEV, 'src')).filter(f => f.endsWith('.js')).map(f => readFileSync(path.join(DEV, 'src', f), 'utf8')).join('\n');
  check(S, 'no TODO, FIXME or placeholder in the game', !/\bTODO\b|\bFIXME\b|placeholder|lorem ipsum|coming soon/i.test(src), (src.match(/.{30}(TODO|FIXME|placeholder|coming soon).{30}/i) || [''])[0]);
  check(S, 'at least 160 commentary lines', Object.values(O.COMMS_BANK).reduce((m, b) => m + Object.values(b).reduce((n, l) => n + l.length, 0), 0) >= 160);
  const anth = O.NATION_IDS.map(n => O.Anthem.song(n).melody); check(S, 'no two nations share an anthem', new Set(anth).size === 8);
  check(S, 'every event has 6+ tunables, a laurel, yikes kinds and a how-to card', EVENTS.every(id => { const e = O.EVENTS[id]; return Object.keys(O.tune.specs(id)).length >= 6 && e.laurel && e.yikesKinds && e.yikesKinds.length && e.howto.rows.length; }));
  check(S, 'no errors', !h.errors().length, h.errors().join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
const TARGET = { // the perfect bot's band (turbo used), per attempt or race
  sprint: [9.2, 9.7], javelin: [100, 125], swim: [19.4, 19.95], diving: [95, 145], archery: [30, 30], weights: [240, 285], skijump: [150, 200], downhill: [45.5, 48.5], bobsled: [36, 41], figure: [100, 300]
};
await run('events', async () => {
  const S = 'events', h = boot(), { O } = h;
  for (const id of EVENTS) {
    const def = O.EVENTS[id];
    // determinism: the same seed twice gives the same results
    const r1 = simEvent(h, id, 11), r2 = simEvent(h, id, 11);
    check(S, id + ': a CPU field completes with results', r1.ath.some(a => O.aggregate(def, a) != null || a.matchRank), id);
    check(S, id + ': the same seed gives the same results', hashOf(r1) === hashOf(r2));
    // skill: .9 beats .3
    const n = quick ? 6 : def.format.type === 'match' ? 8 : 12; let wins = 0;
    for (let k = 0; k < n; k++) {
      const r = simEvent(h, id, 100 + k * 17, ath => { ath.forEach((a, i) => a.skill = i % 2 ? .3 : .9); }, ctx => { if (ctx.teams) { ctx.teams[k % 2].skill = .9; ctx.teams[1 - k % 2].skill = .3; } });
      if (def.format.type === 'match') { const [A, B] = r.ctx.teams; const hi = A.skill > B.skill ? A : B; if (hi.matchRank === 1) wins++; }
      else { const hiBest = r.ath.filter(a => a.skill === .9).map(a => O.aggregate(def, a)), loBest = r.ath.filter(a => a.skill === .3).map(a => O.aggregate(def, a)), b = v => v == null ? (def.measure.better === 'lower' ? 1e9 : -1e9) : v; const hm = hiBest.reduce((m, v) => m + b(v), 0) / hiBest.length, lm = loBest.reduce((m, v) => m + b(v), 0) / loBest.length; if (def.measure.better === 'lower' ? hm < lm : hm > lm) wins++; }
    }
    check(S, id + ': skill .9 beats skill .3 (' + wins + '/' + n + ')', wins / n >= (def.format.type === 'match' ? .75 : .9));
    // the perfect bot's band
    if (TARGET[id] && id !== 'figure') { const r = simEvent(h, id, 5, ath => ath.forEach(a => a.cheat = 'perfect')); const v = r.ath[0].attempts.filter(x => x && x.perf != null).map(x => x.perf); const best = def.measure.better === 'lower' ? Math.min(...v) : Math.max(...v); check(S, id + ': the perfect bot lands in its band ' + TARGET[id].join('–'), best >= TARGET[id][0] && best <= TARGET[id][1], best); }
  }
  check(S, 'no errors', !h.errors().length, h.errors().slice(0, 3).join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
await run('mechanics', async () => {
  const S = 'mechanics', h = boot(), { O, game } = h;
  const yk = new Set(); O.bus.on('yikes', e => yk.add(e.kind));
  const one = (id, cfg, until) => { const def = O.EVENTS[id]; O.meet = quickMeet(O, id, { seed: 7 }); const ath = O.makeAthletes(def, O.meet); const a = ath[0]; const ctx = O.makeCtx(def, O.meet, ath); def.build && def.build(ctx); ctx.cur = a; O.sandbox = true; def.start(ctx, a); if (cfg.init) cfg.init(ctx, a); for (let i = 0; i < 60 * 120 && !def.done(ctx) && !(until && until(ctx)); i++) { a.I = cfg.intent ? cfg.intent(ctx, a, i) : (def.bot(ctx, a, 1 / 60) || O.blankIntent()); a.mash.update(1 / 60, a.I.L, a.I.R); def.step(ctx, 1 / 60); ctx.t += 1 / 60; } O.sandbox = false; return { ctx, a, perf: def.perf(ctx, a) }; };
  const B = () => O.blankIntent();
  // sprint: a press before the gun is a false start; an idle runner does not finish
  { const def = O.EVENTS.sprint; O.meet = quickMeet(O, 'sprint'); const ath = O.makeAthletes(def, O.meet); ath[0].human = true; const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); O.sandbox = true; def.start(ctx); for (let i = 0; i < 300; i++) { for (const a of ath) { O.pilot(ctx, a, 1 / 60); } if (ctx.s.phase === 'set') ath[0].I.A = true; def.step(ctx, 1 / 60); } O.sandbox = false; check(S, 'sprint: a press before the gun is a false start', yk.has('falsestart')); }
  { const r = one('swim', { intent: () => B() }, ctx => ctx.s.t > 40); check(S, 'swim: no strokes, no finish', r.perf == null); }
  // javelin: crossing the line is a foul; releasing at 10° is flat
  { const r = one('javelin', { intent: (ctx, a) => { const I = B(); const m = O.botMash(a.bs, 11, 1 / 60); I.L = m.L; I.R = m.R; return I; } }); check(S, 'javelin: crossing the line is a foul', r.perf == null && r.a.notes.includes('FOUL')); }
  { const r = one('javelin', { intent: (ctx, a) => { const I = B(); const m = O.botMash(a.bs, 11, 1 / 60); I.L = m.L; I.R = m.R; I.Ad = ctx.s.x > 150 && !(ctx.s.ang >= 10); return I; } }); check(S, 'javelin: a release at 10° lands flat', r.perf == null && yk.has('flat')); }
  // swim: never breathing gasps; missing the turn bonks
  { const r = one('swim', { intent: (ctx, a) => { const I = O.EVENTS.swim.bot(ctx, a, 1 / 60); I.X = false; if (ctx.s.lanes[0].d < 25) I.A = ctx.s.lanes[0].state === 'block' || ctx.s.lanes[0].state === 'windup' ? I.A : false; return I; } }, ctx => ctx.s.t > 50); check(S, 'swim: never breathing makes a gasp', yk.has('gasp')); check(S, 'swim: missing the turn is a bonk', yk.has('bonk')); }
  // diving: a rip vs a belly flop
  { const r = one('diving', {}); check(S, 'diving: the bot completes a scored dive', r.perf > 0); }
  { const r = one('diving', { intent: (ctx, a) => { const I = B(), s = ctx.s; if (s.phase === 'pick') I.A = s.pt > .3; if (s.phase === 'stance') I.A = s.pt > .5; if (s.phase === 'air') I.Lh = s.th < Math.PI * 1.5; return I; }, init: () => O.tune.set('diving', 'openSpin', 0) }); O.tune.reset('diving'); check(S, 'diving: entering flat is a belly flop', yk.has('bellyflop') || yk.has('wrongway'), JSON.stringify(r.ctx.s.e)); }
  { const r = one('diving', { intent: (ctx, a) => { const I = B(), s = ctx.s; if (s.phase === 'pick') I.A = s.pt > .3; if (s.phase === 'stance') I.A = s.pt > .5; if (s.phase === 'air') I.Lh = true; return I; } }); check(S, 'diving: holding the tuck to the water over-rotates and scores low', r.perf != null && r.perf < 45, r.perf); }
  // archery: a perfect bot scores 30 an end; robin hood laurel fires on a split arrow
  { const def = O.EVENTS.archery; O.meet = quickMeet(O, 'archery'); const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); ath[0].cheat = 'perfect'; const r = O.simAttempt(ctx, ath[0]); check(S, 'archery: the perfect bot scores 30 an end', r.perf === 30, r.perf); }
  { const def = O.EVENTS.archery; O.meet = quickMeet(O, 'archery'); const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); ctx.w.windOverride = 4; let tot = 0, n = 0; for (let k = 0; k < 4; k++) { ctx.round = k % 2; const a = ath[k]; a.skill = .99; const orig = def.bot; const res = (() => { const save = def.bot; def.bot = (c, b, dt) => { const I = save(c, b, dt); if (b.bs) { b.bs.comp = 0; } I.Xd = false; return I; }; try { return O.simAttempt(ctx, a); } finally { def.bot = save; } })(); void orig; tot += res.perf; n += 3; } O.tune.reset('archery'); check(S, 'archery: no breath and no wind allowance in 4 m/s wind averages under 8 an arrow', tot / n < 8, (tot / n).toFixed(1)); }
  { const def = O.EVENTS.archery; O.meet = quickMeet(O, 'archery'); const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); ctx.w.attractRobin = true; ath[0].cheat = 'perfect'; const r = O.simAttempt(ctx, ath[0], { keepState: true }); check(S, 'archery: a split arrow is a Robin Hood', r.s.robin === true); }
  // weights: an idle lifter makes no lift; balance out of range drops
  { const r = one('weights', { intent: (ctx, a) => { const I = B(); if (ctx.s.phase === 'pick') I.A = ctx.s.pt > .3; return I; } }); check(S, 'weights: an idle lifter makes no lift', r.perf == null); }
  { const r = one('weights', { intent: (ctx, a) => { const I = O.EVENTS.weights.bot(ctx, a, 1 / 60); if (ctx.s.phase === 'rack') I.mv = [ctx.s.bal.b > 0 ? -1 : 1, 0]; return I; } }); check(S, 'weights: the bar out of balance drops', yk.has('drop')); }
  // ski jump: no take-off press falls off the table and lands short
  { const r = one('skijump', { intent: (ctx, a) => { const I = O.EVENTS.skijump.bot(ctx, a, 1 / 60); if (ctx.s.phase === 'inrun') I.A = false; return I; } }); check(S, 'ski jump: no take-off press falls off the table', yk.has('table') && r.ctx.s.d < 110, r.ctx.s.d); }
  { const r = one('skijump', { intent: (ctx, a) => { const I = O.EVENTS.skijump.bot(ctx, a, 1 / 60); if (ctx.s.phase === 'air') I.mv = [0, -1]; return I; } }); check(S, 'ski jump: leaning far back crashes', yk.has('crash')); }
  // downhill: hard into the netting crashes; gates count
  { const r = one('downhill', { intent: (ctx, a) => { const I = B(); I.mv = [1, 0]; return I; } }, ctx => ctx.s.t > 12); check(S, 'downhill: steering into the netting crashes', yk.has('netting')); }
  { const r = one('downhill', {}); check(S, 'downhill: the bot passes all 24 gates', r.ctx.s.gatesOk === 24, r.ctx.s.gatesOk); }
  // bobsled: no load press is a late load; no steering in the curves flips
  { const r = one('bobsled', { intent: (ctx, a) => { const I = B(); const m = O.botMash(a.bs, 11, 1 / 60); I.L = m.L; I.R = m.R; if (ctx.s.loaded) I.mv = [-1, 0]; return I; } }, ctx => ctx.s.t > 40); check(S, 'bobsled: missing the load zone is a late load', yk.has('lateload')); check(S, 'bobsled: no steering up the wall flips', yk.has('flip')); }
  // curling: a draw stops in the house; a takeout removes a stone; curl direction
  { const C = O.CURL, T = O.tune.get('curling'), throwSt = (w, others, spin = 0) => { const v0 = T.v0Base + T.v0Range * w, st = others.map(o => Object.assign({ vx: 0, vy: 0, v: 0, team: 1, out: false }, o)); st.push({ x: 0, y: 2, vx: 0, vy: v0, v: 1, spin, team: 0, out: false }); for (let i = 0; i < 3600 && st.some(s => s.v); i++) C.physStep(st, 1 / 60, T); return st; };
    const d = throwSt(.59, [])[0]; check(S, 'curling: a draw weight stops in the house', Math.hypot(d.x, d.y - C.TEE) < 1.5, d.y);
    const tk = throwSt(.9, [{ x: 0, y: C.TEE }]); check(S, 'curling: takeout weight removes the stone', tk[0].out);
    const cp = throwSt(.59, [], 1)[0], cm = throwSt(.59, [], -1)[0]; check(S, 'curling: the turn sets the curl direction', cp.x > .3 && cm.x < -.3);
    const hog = throwSt(.3, [])[0]; const st = [hog]; hog.touched = false; O.CURL.shot(st); check(S, 'curling: a stone short of the far hog line stops before it', hog.y < C.HOG);
  }
  // hockey: a shot at an empty net scores; a check knocks down
  { const def = O.EVENTS.hockey; O.meet = quickMeet(O, 'hockey'); const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); O.sandbox = true; def.start(ctx); const s = ctx.s; s.phase = 'play'; const g = s.sk.find(k => k.team === 1 && k.goalie); g.x = 170; g.y = 60; g.down = 9; const k = s.sk.find(q => q.team === 0 && q.i === 0); k.x = 120; k.y = 0; Object.assign(s.puck, { x: 140, y: 0, vx: 400, vy: 0, owner: null, cd: 1, last: k, lastTeam: 0, shot: true }); for (let i = 0; i < 60; i++) def.step(ctx, 1 / 60); O.sandbox = false; check(S, 'hockey: a shot at an empty net scores', s.score[0] === 1, s.score.join('-')); }
  { const def = O.EVENTS.hockey; O.meet = quickMeet(O, 'hockey'); const ath = O.makeAthletes(def, O.meet); const ctx = O.makeCtx(def, O.meet, ath); def.build(ctx); O.sandbox = true; def.start(ctx); const s = ctx.s; s.phase = 'play'; s.pt = 2;
    const a = s.sk.find(q => q.team === 0 && q.i === 0), b = s.sk.find(q => q.team === 1 && q.i === 0), cap = ctx.teams[0]; ctx.w.ctrl.set(cap, { team: 0, idx: 0 }); cap.human = true;
    a.x = 0; a.y = 0; b.x = 15; b.y = 0; b.face = 0; s.puck.owner = b; a.checkCD = 0; cap.I = Object.assign(O.blankIntent(), { R: true, mv: [1, 0] });
    def.step(ctx, 1 / 60); O.sandbox = false; check(S, 'hockey: a check knocks the carrier down and frees the puck', b.down > 0 && s.puck.owner !== b, 'down ' + b.down); }
  // figure: the perfect autopilot is a full combo near 230; idle fails the program but still scores
  const hf = boot(); hf.game.start({ scenes: hf.O.scenes, scene: 'title' }); hf.game.advance(.5);
  const fr = liveEvent(hf, 'figure', { perfect: true }); const fh = fr && fr.rows.find(r => r.human); check(S, 'figure: the perfect autopilot skates a full combo ~230', fh && fh.perf >= 220, fh && fh.perf);
  const fi = liveEvent(hf, 'figure', { idle: true }); const fih = fi && fi.rows.find(r => r.human); check(S, 'figure: an idle skater still gets a (low) result', fih && fih.perf != null && fih.perf < 120, fih && fih.perf);
  check(S, 'no errors', !h.errors().length && !hf.errors().length, h.errors().concat(hf.errors()).slice(0, 3).join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
await run('live', async () => {
  // every event through the runner with the human on the real input path (the autopilot), and idle humans
  const S = 'live', h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
  for (const id of EVENTS) {
    const res = liveEvent(h, id); const hr = res && res.rows.find(r => r.human);
    check(S, id + ': a human on the autopilot completes it', !!res && !!hr && res.rows.length >= 2, res ? JSON.stringify(hr) : 'no result');
    if (!quick && ['sprint', 'javelin', 'weights', 'downhill', 'archery'].includes(id)) { const ri = liveEvent(h, id, { idle: true, max: 400 }); check(S, id + ': an idle human still gets a valid result', !!ri && ri.rows.length >= 2); }
  }
  check(S, 'no errors', !h.errors().length, h.errors().slice(0, 3).join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
/** drive the menus by taps, autopilot the events: the whole Games */
function playGames(h, o = {}) {
  const { O, game } = h, seen = [], days = new Set(), saves = [];
  let last = null, tc = 0, guard = 0;
  O.autoAll = true; O.humanSkill = o.skill || null; O.autoContinue = o.cont;
  const orig = O.flow.autosave; O.flow.autosave = () => { orig(); saves.push(O.meet.day); };
  while (guard++ < 200000) {
    const sc = game.sceneName; if (sc !== last) { seen.push(sc); last = sc; tc = 0; if (sc === 'dayCard' && O.meet) days.add(O.meet.day); }
    if (o.stop && o.stop(sc)) break;
    tc += .05;
    if (sc === 'title' && seen.length > 3) break;
    if (sc === 'menu' && tc > .5) { if (o.quickGames && !h._q) { h._q = 1; } h.tap('confirm'); tc = 0; }
    else if (sc === 'gamesSetup' && tc > .4) {
      const L = O.scenes.gamesSetup.list, it = L.items, step = a => { h.tap(a); game.advance(.06); game.advance(.06); };
      if (o.quickGames && it[0].value === 0) step('right');
      else if (o.quickGames && it[1].value !== 2) { while (L.item.label !== 'PLAYLIST') step('down'); step('right'); }
      else { let n = 0; while (L.item.label !== 'START' && n++ < 10) step('down'); h.tap('confirm'); }
      tc = 0;
    }
    else if (sc === 'nations' && tc > .5) { for (const p of game.players) p.tap('confirm'); tc = 0; }
    else if (!sc.startsWith('ev:') && sc !== 'closing' && tc > (sc === 'podium' ? 2.3 : sc === 'opening' ? .9 : .8)) { h.tap('confirm'); tc = 0; }
    else if (sc === 'closing' && tc > 1.2) { h.tap('confirm'); tc = 0; }
    game.advance(.05);
  }
  O.autoAll = false; O.humanSkill = null; O.autoContinue = undefined; O.flow.autosave = orig;
  return { seen, days, saves };
}
await run('playthrough', async () => {
  const S = 'playthrough', h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
  O.store.del('games'); h.tap('confirm'); game.advance(.5);
  const run1 = playGames(h, { stop: sc => sc === 'credits' });
  const m = O.meet;
  check(S, 'the Games reach the closing ceremony and credits', run1.seen.includes('closing') && run1.seen.includes('credits'), run1.seen.slice(-8).join('>'));
  check(S, 'all 12 events produced results', m && Object.keys(m.results).length === 12, m && Object.keys(m.results).join(','));
  const tot = m ? O.medalTable(m.medals).reduce((a, r) => [a[0] + r.g, a[1] + r.s, a[2] + r.b], [0, 0, 0]) : [];
  check(S, '12 golds, 12 silvers and 12 bronzes awarded', tot.join() === '12,12,12', tot.join());
  check(S, 'the opening ceremony, every day card and story beats played', run1.seen.includes('opening') && run1.days.size === 12 && run1.seen.filter(s => s === 'beat').length >= 7, run1.days.size + ' days, ' + run1.seen.filter(s => s === 'beat').length + ' beats');
  check(S, 'an autosave after each day', run1.saves.length === 12, run1.saves.join(','));
  check(S, 'the save is cleared at the end', !O.store.get('games', null));
  check(S, 'the cabinet records the human\'s medals', Object.keys(O.Records.cabinet()).length > 0);
  for (let i = 0; i < 60 && game.sceneName !== 'title'; i++) { h.tap('confirm'); game.advance(.4); }
  check(S, 'the credits return to the title', game.sceneName === 'title', game.sceneName);
  check(S, 'no errors in the full Games', !h.errors().length, h.errors().slice(0, 3).join(' | '));
  // a weak autopilot: torches, GAMES OVER and CONTINUE
  if (!quick) {
    const h2 = boot(), O2 = h2.O, g2 = h2.game; g2.start({ scenes: O2.scenes, scene: 'title' }); g2.advance(.5); O2.store.del('games'); h2.tap('confirm'); g2.advance(.5);
    const r2 = playGames(h2, { skill: .05, cont: true, stop: sc => O2.meet && O2.meet.continues >= 1 && sc.startsWith('ev:') });
    check(S, 'failing a qualifying mark costs a torch', r2.seen.includes('torch'), r2.seen.slice(0, 30).join('>'));
    check(S, 'GAMES OVER offers CONTINUE, which restores the torches', O2.meet && O2.meet.continues >= 1 && O2.meet.torches === 3, O2.meet && O2.meet.torches);
    check(S, 'no errors with torches and continues', !h2.errors().length, h2.errors().slice(0, 3).join(' | '));
    // CONTINUE GAMES resumes at the next day after a reload of the store
    const h3 = boot(), O3 = h3.O, g3 = h3.game; g3.start({ scenes: O3.scenes, scene: 'title' }); g3.advance(.5); O3.store.del('games'); h3.tap('confirm'); g3.advance(.5);
    playGames(h3, { stop: sc => O3.meet && O3.meet.day >= 2 && sc === 'dayCard' });
    const saved = O3.store.get('games', null);
    const h4 = boot({ before: ctx => { ctx.localStorage = undefined; } }), O4 = h4.O, g4 = h4.game; void O4;
    // the vm's E.store keeps the visit's data only: carry the save across by hand, as the browser's storage would
    O4.store.set('games', JSON.parse(JSON.stringify(saved))); g4.start({ scenes: O4.scenes, scene: 'title' }); g4.advance(.5); h4.tap('confirm'); g4.advance(.8);
    check(S, 'the menu offers CONTINUE GAMES', O4.scenes.menu && O4.store.get('games', null) && g4.sceneName === 'menu');
    h4.tap('confirm'); g4.advance(1.2);
    check(S, 'CONTINUE GAMES resumes at the saved day', O4.meet && O4.meet.day === saved.day && (g4.sceneName === 'dayCard' || g4.sceneName === 'beat'), g4.sceneName + ' day ' + (O4.meet && O4.meet.day) + ' saved ' + saved.day);
    // Quick Games with two players (both autopiloted): party points, a versus hockey final
    const h5 = boot(), O5 = h5.O, g5 = h5.game; g5.start({ scenes: O5.scenes, scene: 'title' }); g5.advance(.5); O5.store.del('games');
    g5.addPlayer({ pad: 1 }); h5.tap('confirm'); g5.advance(.5);
    const r5 = playGames(h5, { quickGames: true, stop: sc => sc === 'credits' });
    check(S, 'Quick Games with two players run to the end', r5.seen.includes('closing'), r5.seen.slice(-6).join('>'));
    check(S, 'Quick Games are four events', O5.meet && O5.meet.events.length === 4 && Object.keys(O5.meet.results).length === 4, O5.meet && O5.meet.events.join(','));
    check(S, 'both players earn party points', O5.meet && O5.meet.party.P1 > 0 && O5.meet.party.P2 > 0, JSON.stringify(O5.meet && O5.meet.party));
    check(S, 'no errors in Quick Games', !h5.errors().length, h5.errors().slice(0, 3).join(' | '));
  }
});

// ---------------------------------------------------------------------------------------------------------------
await run('attract', async () => {
  const S = 'attract', h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
  const w0 = O.store.writes;
  game.advance(9.3); check(S, 'idle 9.9 s: still the title', game.sceneName === 'title' && !O.Attract.on);
  game.advance(.4); game.advance(.4); check(S, 'idle past 10 s: the attract mode', O.Attract.on, game.sceneName);
  for (let i = 0; i < 2400 && Object.keys(O.Attract.seen).filter(k => O.EVENTS[k]).length < 12; i++) game.advance(.25);
  const evs = Object.keys(O.Attract.seen).filter(k => O.EVENTS[k]);
  check(S, 'the attract loops show all 12 events', evs.length === 12, evs.join(','));
  check(S, 'the attract shows the records and the medal table', O.Attract.seen.records && O.Attract.seen.medals && O.Attract.seen.logo);
  check(S, 'the attract writes no saves', O.store.writes === w0, O.store.writes - w0);
  h.tap('confirm'); game.advance(.8); check(S, 'one press returns to the title', game.sceneName === 'title' && !O.Attract.on, game.sceneName);
  check(S, 'no errors', !h.errors().length, h.errors().slice(0, 3).join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
await run('dev', async () => {
  const S = 'dev', h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
  O.meet = quickMeet(O, 'sprint', { players: [{ nation: 'SUN', input: game.input }] }); game.go('ev:sprint', {}, { fade: 0 }); game.advance(.5); h.until(() => O.Run.ctx && O.Run.ctx.phase === 'play' && O.Run.ctx.s, 20, .1) || (h.tap('confirm'), h.until(() => O.Run.ctx.phase === 'play', 10, .1)); game.advance(.5);
  game.pause('player'); check(S, 'the pause menu has a Dev mode item', JSON.stringify(game.o.menu.items).includes('Dev mode') || game.o.menu.items.some(i => i[0] === 'Dev mode'));
  O.openDev(); const t1 = O.Run.ctx.s.t; game.advance(1);
  check(S, 'opening the panel freezes time', O.Dev.isOpen && game.timeScale === 0 && O.Run.ctx.s.t === t1);
  const base = simEvent(h, 'sprint', 21, ath => ath.forEach(a => a.skill = .8)); const tb = base.ath.reduce((m, a) => m + O.aggregate(base.def, a), 0);
  O.Dev.set('sprint', 'vMax', O.tune.specs('sprint').vMax.def * 1.5);
  const fast = simEvent(h, 'sprint', 21, ath => ath.forEach(a => a.skill = .8)); const tf = fast.ath.reduce((m, a) => m + O.aggregate(fast.def, a), 0);
  check(S, 'a TUNE slider changes the next heat (vMax ×1.5 ≥ 25% faster)', tf < tb * .8, tb.toFixed(1) + ' → ' + tf.toFixed(1));
  O.tune.reset('sprint'); const back = simEvent(h, 'sprint', 21, ath => ath.forEach(a => a.skill = .8)); check(S, 'RESET TO DEFAULTS restores the timing', Math.abs(back.ath.reduce((m, a) => m + O.aggregate(back.def, a), 0) - tb) < 1e-6);
  // the panel's own input: tabs and rows
  h.tap('tabR'); game.advance(.1); check(S, 'tabs switch with L1/R1', O.Dev.tab === 1);
  h.tap('cancel'); game.advance(.2); check(S, 'cancel closes the panel and time runs again', !O.Dev.isOpen && game.timeScale > 0);
  h.tap('dev'); game.advance(.1); check(S, 'the ` key opens the panel', O.Dev.isOpen); h.tap('dev'); game.advance(.1); check(S, 'the ` key closes it again', !O.Dev.isOpen);
  // cheats
  O.openDev(); O.Dev.cheat('win'); game.advance(1); check(S, 'WIN NOW gives the human gold', O.meet.results.sprint && O.meet.results.sprint.rows[0].human, game.sceneName);
  O.Dev.cheat('laurels'); check(S, 'UNLOCK ALL LAURELS', Object.keys(O.Records.laurels()).length === 12);
  O.Records.resetLaurels();
  for (const [t, sc] of [['opening', 'opening'], ['day', 'dayCard'], ['closing', 'closing'], ['podium', 'podium'], ['medals', 'medals'], ['beat', 'beat'], ['poselab', 'poselab'], ['event', 'ev:sprint'], ['hub', 'hubCard']]) { O.Dev.jump(t); game.advance(.6); check(S, 'JUMP reaches ' + sc, game.sceneName === sc, game.sceneName); }
  check(S, 'no errors', !h.errors().length, h.errors().slice(0, 3).join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
await run('multiplayer', async () => {
  const S = 'multiplayer', h = boot(), { O, game } = h; game.start({ scenes: O.scenes, scene: 'title' }); game.advance(.5);
  for (let p = 1; p <= 3; p++) game.addPlayer({ pad: p });
  check(S, 'four players join', game.players.length === 4);
  const nats = ['SUN', 'FRM', 'TRB', 'BON'];
  O.meet = quickMeet(O, 'sprint', { players: game.players.map((inp, i) => ({ input: inp, nation: nats[i] })) }); game.go('ev:sprint', {}, { fade: 0 }); game.advance(.2);
  const ctx = O.Run.ctx; check(S, 'the sprint puts four humans in four lanes', ctx.humans.length === 4 && new Set(ctx.humans.map(a => a.lane)).size === 4);
  h.until(() => ctx.phase === 'play' && ctx.s, 20, .1); for (let i = 0; i < 700 && ctx.s.phase !== 'race'; i++) game.advance(1 / 60); game.advance(.2);
  for (let i = 0; i < 240; i++) { game.players[0].tap(i % 2 ? 'mashL' : 'mashR'); if (i % 3 === 0) game.players[2].tap(i % 6 ? 'mashL' : 'mashR'); game.advance(1 / 60); }
  const d = ctx.humans.map(a => ctx.s.lanes.find(l => l.a === a).d);
  check(S, 'each player moves only their own runner', d[0] > d[2] && d[2] > 0 && d[1] === 0 && d[3] === 0, d.map(v => v.toFixed(1)).join(','));
  // turns in the javelin: P1 → P2 → P3 → P4
  O.meet = quickMeet(O, 'javelin', { players: game.players.map((inp, i) => ({ input: inp, nation: nats[i] })) }); game.go('ev:javelin', {}, { fade: 0 }); game.advance(.2);
  const order = O.Run.queue.filter(q => q.kind === 'turn' && q.round === 0 && q.a.human).map(q => q.a.player);
  check(S, 'javelin turns go P1, P2, P3, P4', order.join() === '0,1,2,3', order.join());
  // hockey 2v2: each human controls a skater of their own
  O.meet = quickMeet(O, 'hockey', { players: game.players.map((inp, i) => ({ input: inp, nation: nats[i] })) }); game.go('ev:hockey', {}, { fade: 0 }); game.advance(.2);
  const c = O.Run.ctx; check(S, 'hockey: four humans, each with a skater', c.w.ctrl.size === 4 && new Set([...c.w.ctrl.values()].map(v => v.team + ':' + v.idx)).size === 4);
  // the keyboard halves
  const h2 = boot(); h2.game.start({ scenes: h2.O.scenes, scene: 'title' }); h2.game.advance(.3); const q = h2.game.addPlayer({ keys: 'right' });
  check(S, 'two on one keyboard: each half has the game\'s actions', q.map.mashL.includes('Period') && h2.game.input.map.mashL.includes('KeyF'));
  check(S, 'no errors', !h.errors().length && !h2.errors().length, h.errors().concat(h2.errors()).slice(0, 3).join(' | '));
});

// ---------------------------------------------------------------------------------------------------------------
function fakeHub(opts = {}) {
  const H = { calls: { connect: [], ready: 0, answers: [], progress: [], result: [], send: [] }, handlers: {}, t: -Infinity, active: true, seeded: true, version: '1.4.0' };
  const info = { me: 0, players: [{ id: 0, name: 'Ada', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], host: 0, isHost: true, mode: 'ghost', round: 1, limitMs: 240000, seed: opts.seed || 1234 };
  Object.assign(H, {
    connect(o) { H.calls.connect.push(o); return Promise.resolve(info); }, ready() { H.calls.ready++; }, answer(w) { H.calls.answers.push(w); },
    time() { return H.t; }, on(ev, fn) { (H.handlers[ev] || (H.handlers[ev] = [])).push(fn); return () => {}; },
    progress(p) { H.calls.progress.push(p); }, result(r) { H.calls.result.push(r); }, send(d, o) { H.calls.send.push({ d, o, at: H.now || 0 }); return true; },
    rng(label) { let s = 0; const str = info.seed + '|' + label; for (let i = 0; i < str.length; i++) s = (s * 31 + str.charCodeAt(i)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; },
    emit(ev, ...a) { for (const f of H.handlers[ev] || []) f(...a); }, info
  });
  return H;
}
await run('hub', async () => {
  const S = 'hub', idx = readFileSync(path.join(DEV, 'index.html'), 'utf8');
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="ghost"', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']) check(S, 'tag present: ' + t, idx.includes(t));
  const A = fakeHub(), h = boot({ hub: A, mathCount: true }), { O, game, ctx } = h;
  await game.booted; game.advance(.2);
  check(S, 'connect is called with ghost, seats 1-4 and our own card', A.calls.connect.length === 1 && JSON.stringify(A.calls.connect[0]) === JSON.stringify({ mode: 'ghost', seats: [1, 4], card: true }), JSON.stringify(A.calls.connect));
  for (let i = 0; i < 10; i++) game.advance(.1);
  check(S, 'the title never appears; our card shows', game.sceneName === 'hubCard', game.sceneName);
  check(S, 'ready() once, with no key press', A.calls.ready === 1, A.calls.ready);
  const m0 = ctx.__mathCalls || 0; A.emit('card', { left: 12000, paused: false, starting: false, ready: [], asking: 0, asked: false }); for (let i = 0; i < 60; i++) game.advance(1 / 30);
  check(S, 'the card draws no Math.random numbers', (ctx.__mathCalls || 0) === m0, (ctx.__mathCalls || 0) - m0);
  h.tap('confirm'); game.advance(.1); check(S, 'Enter on the card answers ready', A.calls.answers.includes('ready'));
  h.tap('turbo'); game.advance(.1); check(S, '△ on the card asks for more time', A.calls.answers.includes('more'));
  check(S, 'the pause menu has no Quit, Restart or Dev mode', game.o.menu.quit === false && game.o.menu.items.length === 0);
  const deal1 = O.Hub.deal.join(); const B = fakeHub(), h2 = boot({ hub: B }); await h2.game.booted; check(S, 'the same seed deals the same three events', h2.O.Hub.deal.join() === deal1 && deal1.split(',').length === 3, deal1);
  // start, the slots on the hub clock
  A.emit('start', { in: 3000 }); A.t = -2000; game.advance(.5); check(S, 'nothing starts before time 0', O.Hub.slot === -1);
  let tm = 0; const adv = s => { for (let k = 0; k < s * 20; k++) { tm += .05; A.t = tm * 1000; A.now = tm; game.advance(.05); } };
  O.autoAll = true; adv(1);
  check(S, 'play begins at time 0 with the first event', O.Hub.slot === 0 && game.sceneName === 'ev:' + O.Hub.deal[0], game.sceneName);
  A.emit('message', { t: 'g', e: O.Hub.deal[0], i: 0, a: 0, ts: 1, s: [10, 0] }, 1); adv(8);
  check(S, 'a ghost arrives and is kept', !!O.Hub.ghosts[1]);
  A.emit('leave', { id: 1, reason: 'left' }); check(S, 'leave removes that ghost', !O.Hub.ghosts[1]);
  const slots = O.Hub.slots(); adv(slots[0].to - tm + .5);
  check(S, 'the slots advance on the hub clock', O.Hub.slot === 1, O.Hub.slot);
  const sends = A.calls.send, gs = sends.filter(s => s.d.t === 'g');
  check(S, 'ghost samples are sent, unreliable', gs.length > 10 && gs.every(s => s.o && s.o.reliable === false), gs.length);
  let maxRate = 0; for (const s of gs) { const n = gs.filter(q => q.at > s.at - 1 && q.at <= s.at).length; maxRate = Math.max(maxRate, n); } check(S, 'at most 20 messages a second', maxRate <= 20, maxRate);
  check(S, 'every payload is under 16 KB', sends.every(s => JSON.stringify(s.d).length < 16384));
  check(S, 'progress is reported', A.calls.progress.length > 3 && A.calls.progress.every(p => typeof p.score === 'number' && typeof p.label === 'string'));
  check(S, 'the event result is sent reliably', sends.some(s => s.d.t === 'r' && s.o.reliable === true));
  A.emit('time-up', { graceMs: 5000 }); game.advance(.1);
  check(S, 'time-up sends the result at once', A.calls.result.length === 1 && typeof A.calls.result[0].score === 'number', JSON.stringify(A.calls.result));
  adv(slots[2].to - tm + 1);
  check(S, 'the result is sent exactly once', A.calls.result.length === 1, A.calls.result.length);
  const nSend = sends.length; A.emit('end', { reason: 'finished', standings: [[0]] }); game.advance(.5); h.tap('action'); adv(2);
  check(S, 'after end nothing more is sent and the music stops', sends.length === nSend && !game.audio.song, sends.length - nSend);
  O.autoAll = false;
  check(S, 'no errors', !h.errors().length, h.errors().slice(0, 3).join(' | '));
});
tHead = (Date.now() - t0) / 1000;

// ---------------------------------------------------------------------------------------------------------------
const NAME = 'Olympiyikes-OlympicGames-claude-opus-5-5-xhigh-20261104-074118', BUNDLE = path.resolve(DEV, '..', NAME + '.html');
if (!quick) await run('browser', async () => {
  const S = 'browser';
  check(S, 'the bundle exists with the TASK.md name', existsSync(BUNDLE)); if (!existsSync(BUNDLE)) return;
  const html = readFileSync(BUNDLE, 'utf8'), session = readFileSync(path.join(DEV, 'vendor/hub/session.js'), 'utf8');
  const first = /<meta charset="utf-8">\s*<script>([\s\S]*?)<\/script>/.exec(html);
  check(S, 'the first script after <meta charset> is session.js, byte for byte', first && first[1] === session);
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="ghost"']) check(S, 'bundle tag: ' + t, html.includes(t));
  const ex = path.resolve(DEV, '..', 'exit-interview.json'); let ok = false; try { const j = JSON.parse(readFileSync(ex, 'utf8')); ok = !!(j.sourceInformation && j.testingFeedback && j.engineFeedback && j.promptFeedback && j.aiHub) && Object.values(j.sourceInformation).every(v => typeof v === 'string' && v.length) && j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4; } catch (e) { ok = false; }
  check(S, 'exit-interview.json parses and answers every field', ok);
  const require = createRequire(path.join(DEV, 'vendor/my-3d2dge/dist/handoff/package.json')); const { chromium, devices } = require('playwright');
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    // from file://: no errors, the title, a deep link that plays
    { const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' || /my-3D2dge:/.test(m.text())) errs.push(m.text().slice(0, 160)); });
      await page.goto('file://' + BUNDLE); await page.waitForFunction(() => window.__oly && window.__oly.game.sceneName === 'title', null, { timeout: 10000 }).catch(() => {});
      check(S, 'the title shows within 10 s from file://', await page.evaluate(() => window.__oly && window.__oly.game.sceneName) === 'title');
      await page.waitForTimeout(700); await page.keyboard.press('Enter'); await page.waitForTimeout(800); check(S, 'Enter goes to the menu', await page.evaluate(() => window.__oly.game.sceneName) === 'menu');
      await page.goto('file://' + BUNDLE + '?r=1#ev/sprint'); await page.waitForTimeout(4000); const st = await page.evaluate(() => window.__oly.game.debug.snapshot()); check(S, '#ev/sprint plays', st.scene === 'ev:sprint' && (st.phase === 'play' || st.phase === 'intro'), JSON.stringify(st).slice(0, 120));
      for (const id of EVENTS) { await page.goto('file://' + BUNDLE + '?e=' + id + '#ev/' + id + '/attract'); await page.waitForTimeout(2500); }
      check(S, 'no console errors in the title, menu and all twelve events', !errs.length, errs.slice(0, 4).join(' | ')); await page.close(); }
    // touch-only: the notice, the settings button, the attract mode, a key unlocks
    { const ctx = await browser.newContext(Object.assign({}, devices['Pixel 7'])), page = await ctx.newPage(); await page.goto('file://' + BUNDLE); await page.waitForTimeout(2000);
      check(S, 'touch-only: the notice shows', await page.evaluate(() => window.__oly.touchOnly === true && window.__oly.game.sceneName === 'title'));
      const r = await page.evaluate(() => { const s = window.__oly.scenes.title; return s && null; }); void r;
      const rect = await page.evaluate(() => { const O = window.__oly, W = O.game.r.W, H = O.game.r.H; const c = document.getElementById('screen').getBoundingClientRect(); const bw = 120, bx = W / 2 - bw / 2, by = H * .56 + 38; return { x: c.left + (bx + bw / 2) / W * c.width, y: c.top + (by + 12) / H * c.height }; });
      await page.mouse.click(rect.x, rect.y); await page.waitForTimeout(600); check(S, 'touch-only: the SETTINGS button opens the settings', await page.evaluate(() => !!(window.__oly.game.shell && window.__oly.game.shell.screen)));
      await page.evaluate(() => { const g = window.__oly.game; if (g.shell && g.shell.hide) g.shell.hide(); g.resume(); }); await page.waitForTimeout(11500); check(S, 'touch-only: the attract mode runs after 10 s', await page.evaluate(() => window.__oly.Attract.on));
      await page.keyboard.press('KeyA'); await page.waitForTimeout(900); check(S, 'touch-only: a key press unlocks and returns to the title', await page.evaluate(() => window.__oly.touchOnly === false && window.__oly.game.sceneName === 'title'));
      await ctx.close(); }
    // the AI Hub harness, served from the same origin
    const dir = path.join(DEV, '.hubtest'); mkdirSync(dir, { recursive: true }); copyFileSync(BUNDLE, path.join(dir, 'game.html')); for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(path.join(DEV, 'vendor/hub', f), path.join(dir, f));
    const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise(res => { const on = b => { const m = /port (\d+)/.exec(String(b)); if (m) res(+m[1]); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(() => res(null), 8000); });
    try {
      if (!check(S, 'a local server for the hub harness', !!port)) return;
      const base = `http://127.0.0.1:${port}/`, probe = await browser.newPage(); await probe.goto(base + 'game.html'); check(S, 'the served page is our game', /Olympiyikes/.test(await probe.title())); await probe.close();
      for (const q of (process.env.HUBQ ? [process.env.HUBQ] : ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=2&scenario=host-leave&auto=1', 'players=1&auto=1'])) {
        const page = await browser.newPage({ viewport: { width: 1400, height: 900 } }); await page.goto(base + 'harness.html?game=game.html&' + q);
        await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 150000 }).catch(() => {});
        const res = await page.evaluate(() => ({ pass: window.__hubCheck && window.__hubCheck.pass, fails: window.__hubCheck && (window.__hubCheck.checks || []).filter(c => !c.pass).map(c => c.name + ': ' + c.detail), log: window.__hubCheck && (window.__hubCheck.log || []).slice(-6) }));
        check(S, 'hub harness passes: ' + q, res.pass === true, JSON.stringify(res.fails || res).slice(0, 400)); await page.close();
      }
    } finally { srv.kill(); }
  } finally { await browser.close(); }
});

console.log(`olympiyikes: ${checks} checks, ${failed} failed (headless ${tHead.toFixed(0)} s${quick ? '' : ', browser ' + ((Date.now() - t0) / 1000 - tHead).toFixed(0) + ' s'})`);
process.exit(failed ? 1 : 0);
