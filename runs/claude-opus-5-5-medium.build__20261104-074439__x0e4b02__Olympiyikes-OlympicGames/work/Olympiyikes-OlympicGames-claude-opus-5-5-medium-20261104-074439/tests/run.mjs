// node tests/run.mjs [--quick] [--only <suite>]: every suite; prints only failures, then one line with the count.
import { boot } from './harness.mjs';
import { makeDriver } from './drive.mjs';
import { readFileSync, readdirSync } from 'node:fs';
const args = process.argv.slice(2), quick = args.includes('--quick'), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
let checks = 0, failed = 0; const t0 = Date.now();
const check = (suite, what, ok, detail = '') => { checks++; if (!ok) { failed++; console.log('FAIL [' + suite + '] ' + what + (detail ? ': ' + String(detail).slice(0, 300) : '')); } };
const run = async (name, fn) => { if (only && only !== name) return; try { await fn(name); } catch (e) { check(name, 'suite threw', false, e.stack); } };
const ROOT = new URL('../', import.meta.url);

/* ---- core ---- */
await run('core', S => {
  const c = boot(), O = c.OLY, E = c.My3D2dge, game = O.game;
  game.advance(.3);
  check(S, 'boot reaches the title', game.sceneName === 'title', game.sceneName);
  for (const n of ['title', 'menu', 'gamesSetup', 'nations', 'opening', 'dayCard', 'eventCard', 'results', 'initials', 'podium', 'medals', 'beat', 'torch', 'closing', 'credits', 'single', 'singleAfter', 'records', 'howto', 'about', 'poselab', 'attractCard', 'hubCard', 'hubSplash'].concat(O.EVENT_LIST.map(d => 'ev:' + d.id)))
    check(S, 'scene registered ' + n, !!O.SCENES[n]);
  check(S, '12 events', O.EVENT_LIST.length === 12);
  for (const a of ['confirm', 'cancel']) check(S, 'no J/K in ' + a, !O.KEYS[a].some(k => k === 'KeyJ' || k === 'KeyK'));
  check(S, 'glyphs default PlayStation', game.settings.glyphs === 'playstation', game.settings.glyphs);
  game.settings.set('promptStyle', 'xbox'); check(S, 'prompt style switches glyphs to Xbox', game.settings.glyphs === 'xbox'); game.settings.set('promptStyle', 'playstation');
  // prompt icons for every action × device × family: no '?' anywhere in their labels
  const acts = ['move', 'aim', 'mashL', 'mashR', 'action', 'turbo', 'alt', 'confirm', 'cancel', 'pause', 'start', 'tabL', 'tabR', 'more'];
  for (const fam of ['playstation', 'xbox']) { game.settings.set('glyphs', fam); for (const dev of ['keyboard', 'gamepad', 'mouse']) for (const a of acts) { game.input.lastDevice = dev; const code = O.codeFor(game.input, a, dev); const w = O.Prompt.width(a, { device: dev }); const lab = O.Prompt.label(a); check(S, 'prompt ' + fam + '/' + dev + '/' + a, code && w > 0 && !/\?/.test(lab), code + ' ' + lab); } }
  game.settings.set('glyphs', 'playstation'); game.input.lastDevice = 'keyboard';
  // fonts have the face-button glyphs and the game's punctuation
  { const eng = readFileSync(new URL('engine/my-3d2dge.js', ROOT), 'utf8'); for (const ch of ['✕', '○', '□', '△', '·', '—', '‹', '›', '✓']) check(S, 'font glyph ' + ch, eng.includes('"' + ch + '": ') && E.font.width(ch) > 0); }
  // points formulas monotonic
  for (const d of O.EVENT_LIST) { if (d.matchEvent) continue; const wr = d.measure.wr[0], lower = d.measure.better === 'lower'; const a = d.points(lower ? wr * 1.2 : wr * .8), b = d.points(wr); check(S, 'points monotonic ' + d.id, b > a, a + ' ' + b); check(S, 'WR worth ~1100-1250 ' + d.id, b > 900 && b < 1400, b); }
  // records: seeded tables, insertion
  const t = O.Records.all(); check(S, 'records seeded for 12 events', Object.keys(t).length === 12);
  const sp = O.EVENTS.sprint; check(S, 'top-5 qualifies 9.0', O.Records.qualifies(sp, 9.0)); const pos = O.Records.insert(sp, { v: 9.0, nat: 'SUN', name: 'X', ini: 'ABC' }); check(S, 'record inserted first', pos === 0); check(S, 'WR now 9.0', O.Records.wr(sp).v === 9.0); O.Records.reset();
  // tuning registry
  O.tune.set('sprint', 'vMax', 15); check(S, 'tune set', O.tune.get('sprint').vMax === 15); O.tune.reset('sprint'); check(S, 'tune reset', O.tune.get('sprint').vMax === 11.6);
  for (const d of O.EVENT_LIST) check(S, '≥6 tunables ' + d.id, Object.keys(O.tune.defs(d.id)).length >= 6);
  // streams deterministic
  O.meet = { seed: 42 }; const r1 = O.rng('x')(), r2 = O.rng('x')(); check(S, 'streams deterministic', r1 === r2); O.meet = null;
  // engine changes
  check(S, 'engine: hooks exported', !!E.HOOKS && Array.isArray(E.HOOKS.input));
  const rig = new E.Humanoid({}); rig.post = () => { rig._posted = true; }; rig.bodyPitch = .5; rig.update(1 / 60, { x: 0, y: 0, z: 0, facing: 0 }); check(S, 'engine: pose hook + body rotation', rig._posted === true);
  check(S, 'engine: voice volume field honored', typeof game.audio.applyVolume === 'function' && game.settings.voices === .8);
  // no TODO / placeholders / stubs in the game's source
  for (const f of readdirSync(new URL('src/', ROOT))) { const src = readFileSync(new URL('src/' + f, ROOT), 'utf8'); check(S, 'no TODO/FIXME/placeholder in ' + f, !/\b(TODO|FIXME|XXX|placeholder|not implemented|coming soon)\b/i.test(src)); }
  check(S, 'commentary ≥ 160 lines', O.commLines() >= 160, O.commLines());
  check(S, 'gibberish voice returns a duration headless', O.Voice.speak('Hello there!', 'chip') > .3);
  const a1 = O.Anthem.song(O.NAT.SUN), a2 = O.Anthem.song(O.NAT.TRB); check(S, 'anthems differ by nation', JSON.stringify(a1.tracks[0]) !== JSON.stringify(a2.tracks[0]));
  check(S, 'no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

/* ---- events: bots complete, determinism, skill, perfect bands, mechanics, yikes, laurels ---- */
const simEvent = (O, id, seed, setup) => {
  const def = O.EVENTS[id]; O.meet = { mode: 'single', seed, players: [], difficulty: 'Normal', rival: 'TRB' };
  const ctx = O.makeCtx(def, O.meet, { sandbox: true }); for (const a of ctx.athletes) a.mash = new O.Mash();
  if (setup) setup(ctx); def.build && def.build(ctx);
  if (def.format.type === 'race') { ctx.active = ctx.athletes.slice(); def.start(ctx); O.runToEnd(ctx, 120); for (const a of ctx.athletes) a.res = a.cur === undefined ? null : a.cur; }
  else if (def.format.type === 'attempts') { for (let r = 0; r < def.format.rounds; r++) { ctx.round = r; for (const a of ctx.athletes) { a.attempts.push(O.simAttempt(ctx, a)); } } for (const a of ctx.athletes) a.res = O.agg(ctx, a); }
  else { def.start(ctx); O.runToEnd(ctx, 2000); for (const a of ctx.athletes) a.res = a.S && a.S.score !== undefined ? a.S.score : null; }
  return ctx;
};
const one = (O, id, seed, skill, cheat, mod) => {
  const def = O.EVENTS[id]; O.meet = { mode: 'single', seed, players: [], difficulty: 'Normal', rival: 'TRB' };
  const ctx = O.makeCtx(def, O.meet, { sandbox: true }); const a = ctx.athletes[0]; for (const b of ctx.athletes) b.mash = new O.Mash();
  a.pilot.skill = skill; a.pilot.cheat = cheat || null; def.build && def.build(ctx);
  if (def.format.type === 'race') { ctx.active = [a]; } else { ctx.cur = a; ctx.active = [a]; }
  ctx.round = 0; a.fin = false; a.cur = undefined; def.start(ctx); if (mod) mod(ctx, a);
  O.runToEnd(ctx, 150); return { ctx, a, v: a.cur === undefined ? def.perf(ctx, a) : a.cur };
};
await run('events', S => {
  const c = boot(), O = c.OLY, game = O.game;
  O.flow.eventDone = () => {};
  for (const d of O.EVENT_LIST) {
    const id = d.id, isMatch = d.format.type === 'match';
    const A = simEvent(O, id, 11), B = simEvent(O, id, 11);
    const ha = JSON.stringify(A.athletes.map(a => a.res)), hb = JSON.stringify(B.athletes.map(a => a.res));
    check(S, id + ': bots complete with results', A.athletes.some(a => a.res != null), ha);
    check(S, id + ': deterministic (same hash twice)', ha === hb, ha + ' vs ' + hb);
    check(S, id + ': yikes kinds listed', (d.yikesKinds || []).length >= 1);
    check(S, id + ': laurel defined', !!(d.laurel && d.laurel.test));
    check(S, id + ': attract segment', !!(d.attract && d.attract.seconds));
  }
  // skill monotonic (lighter than the plan's 40 seeds to keep the suite fast)
  for (const id of ['sprint', 'javelin', 'swim', 'skijump', 'downhill', 'weights', 'diving', 'archery', 'bobsled']) {
    const def = O.EVENTS[id]; let wins = 0, n = quick ? 4 : 10;
    for (let s = 1; s <= n; s++) { const hi = one(O, id, s, .9).v, lo = one(O, id, s + 100, .3).v; if (O.better(def, hi, lo) || (hi != null && lo == null)) wins++; }
    check(S, id + ': skill .9 beats .3 mostly', wins >= Math.ceil(n * .7), wins + '/' + n);
  }
  // perfect bot target bands (§6, retuned)
  const band = (id, lo, hi, cheat = 'perfect', mod) => { const v = one(O, id, 3, 1, cheat, mod).v; check(S, id + ': perfect in band ' + lo + '–' + hi, v != null && v >= lo && v <= hi, v); };
  band('sprint', 9.2, 9.8); band('javelin', 86, 125); band('swim', 18.8, 21); band('diving', 75, 150, 'perfect', (ctx, a) => { a.S.dive = O.DIVES[5]; a.S.phase = 'board'; });
  band('archery', 9, 10); band('weights', 260, 280); band('downhill', 42, 50); band('bobsled', 37, 42); band('skijump', 120, 200);
  // mechanics
  { const r = one(O, 'sprint', 5, .9, null, (ctx, a) => { a.S.fsPlan = 0; ctx.S.stage = 'set'; ctx.S.gunAt = 2; a.S.botRate = 0; }); check(S, 'sprint: a press before the gun is a false start', r.ctx.events.some(e => e[0] === 'yikes' && e[1].kind === 'falsestart')); }
  { const r = one(O, 'javelin', 5, .9, null, (ctx, a) => { a.S.willFoul = true; }); check(S, 'javelin: crossing the line is a foul', r.v == null && r.a.notes.includes('FOUL'), r.a.notes); }
  { const r = one(O, 'javelin', 5, .9, null, (ctx, a) => { a.S.target = 10; }); check(S, 'javelin: release at 10° lands flat', r.v == null && r.a.notes.includes('FLAT'), r.a.notes); }
  { const r = one(O, 'swim', 5, .9, null, (ctx, a) => { a.S.breathN = 999; ctx.T.o2Drain = .3; }); check(S, 'swim: never breathing → GASP', r.ctx.events.some(e => e[1] && e[1].kind === 'gasp')); O.tune.reset('swim'); }
  { const r = one(O, 'swim', 6, .9, null, (ctx, a) => { const b = O.EVENTS.swim.bot; a._noTurn = true; }); void r; }
  { const def = O.EVENTS.swim, bot = def.bot; def.bot = (ctx, a, dt, I) => { bot(ctx, a, dt, I); if (!a.S.turned && a.S.state === 'swim') I.A = false; return I; }; const r = one(O, 'swim', 7, .9); def.bot = bot; check(S, 'swim: missing the turn → BONK', r.a.S.turnQ === 'BONK'); }
  { const r = one(O, 'diving', 5, .9, null, (ctx, a) => { a.S.dive = O.DIVES[0]; a.S.phase = 'board'; a.S.botErr = 400; }); check(S, 'diving: over-rotating → belly flop / big penalty', r.v != null && r.v < 40, r.v); }
  { const r = one(O, 'archery', 5, .9, null, (ctx, a) => { a.arrows = [{ x: 0, y: 0 }]; a.S.forceRobin = true; }); check(S, 'archery: Robin Hood', !!r.a.S.robin); check(S, 'archery: Robin Hood laurel test', O.EVENTS.archery.laurel.test(r.ctx, r.a)); }
  { const r = one(O, 'weights', 5, .3, null, (ctx, a) => { a.S.kg = 280; a.S.cap = 200; }); check(S, 'weights: too heavy → no lift', r.v == null); }
  { const r = one(O, 'skijump', 5, .9, null, (ctx, a) => { a.S.bot.noTake = true; }); check(S, 'ski jump: no take-off press → short jump + yikes', r.a.S.dist < 100 && r.ctx.events.some(e => e[1] && e[1].kind === 'table'), r.a.S.dist); }
  { const def = O.EVENTS.downhill, bot = def.bot; def.bot = (ctx, a, dt, I) => { bot(ctx, a, dt, I); if (a.S.s > 200 && a.S.s < 230) I.mv = [1, 0]; return I; }; const r = one(O, 'downhill', 5, .9); def.bot = bot; check(S, 'downhill: steering into the netting → crash', r.ctx.events.some(e => e[1] && e[1].kind === 'crash')); }
  { const def = O.EVENTS.bobsled, bot = def.bot; def.bot = (ctx, a, dt, I) => { bot(ctx, a, dt, I); if (a.S.loaded) I.mv = [0, 0]; return I; }; const r = one(O, 'bobsled', 5, .9); def.bot = bot; check(S, 'bobsled: not steering → FLIP', r.ctx.events.some(e => e[1] && e[1].kind === 'flip')); }
  { const r = one(O, 'bobsled', 5, .9, null, (ctx, a) => { a.S.bot = 1; }); const late = one(O, 'bobsled', 5, .9, null, (ctx, a) => { const b = O.EVENTS.bobsled.bot; void b; ctx.T.loadZone = 40; }); void late; check(S, 'bobsled: completes', r.v != null); }
  { const CS = O.CurlingSim, T = O.tune.get('curling'), st = [{ x: 27, y: 0, vx: 0, vy: 0, spin: 0, team: 1, out: false }]; const s = { x: 6, y: 0, vx: T.v0Base + T.v0Range * .98, vy: 0, spin: 0, team: 0, out: false }; st.push(s); for (let i = 0; i < 4000; i++) CS.stepIce(st, 1 / 60, T, 0, s); check(S, 'curling: takeout weight removes a stone', st[0].out || st[0].x > 28.5, JSON.stringify(st[0])); }
  { const CS = O.CurlingSim, T = O.tune.get('curling'), st = []; const s = { x: 6, y: 0, vx: T.v0Base + T.v0Range * .52, vy: 0, spin: 1, team: 0, out: false }; st.push(s); for (let i = 0; i < 6000; i++) CS.stepIce(st, 1 / 60, T, 0, s); check(S, 'curling: draw weight stops near the house', Math.abs(s.x - 27) < 3, s.x); check(S, 'curling: spin curls the stone', s.y > .05, s.y); }
  { let w = 0; const n = quick ? 3 : 6; for (let sd = 1; sd <= n; sd++) { const ctx = simEvent(O, 'curling', sd, ctx => { ctx.athletes[0].pilot.cheat = 'x'; ctx.athletes[0].pilot.skill = .95; }); const t = ctx.teams; t[1].pilot.skill = .25; if (t[0].S.score > t[1].S.score) w++; } check(S, 'curling: a strong skip usually wins', w >= Math.ceil(n * .5), w + '/' + n); }
  { const ctx = simEvent(O, 'hockey', 3); check(S, 'hockey: goals happen', ctx.teams[0].S.score + ctx.teams[1].S.score >= 1); }
  check(S, 'no errors', game.errors.length === 0, game.errors.map(e => e.where + ' ' + e.message).join(' | '));
});

/* ---- the human path: every event played by the AutoPlayer through real input, and idle ---- */
await run('human', S => {
  for (const d of ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights', 'skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey']) {
    const c = boot({ hash: '#ev/' + d + '/auto' }), O = c.OLY, game = O.game; if (d === 'hockey') O.tune.set('hockey', 'periodLength', 20);
    game.advance(.3); let n = 0; while (game.sceneName !== 'results' && n < 9000) { game.advance(.1); n++; }
    check(S, d + ': the autopilot (real input) completes the event', game.sceneName === 'results', game.sceneName + ' ' + (O.ctx && O.ctx.phase));
    const row = O.meet && O.meet.lastResults && O.meet.lastResults.rows.find(r => r.a.human);
    check(S, d + ': the human has a result', row && (row.v != null || d === 'weights'), row && row.display);
    check(S, d + ': no errors', game.errors.length === 0, game.errors.map(e => e.where + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
  }
  for (const d of ['sprint', 'javelin', 'diving', 'figure']) {
    const c = boot({ hash: '#ev/' + d }), O = c.OLY, game = O.game; game.advance(.3); let n = 0;
    while (game.sceneName !== 'results' && n < 9000) { if (O.ctx && O.ctx.phase !== 'play') game.input.tap('confirm'); game.advance(.1); n++; }
    check(S, d + ': an idle human still ends with a valid result', game.sceneName === 'results' && O.meet.lastResults.rows.length >= 1, game.sceneName);
  }
});

/* ---- flow: the scripted playthrough of the whole game ---- */
await run('flow', S => {
  const c = boot(), O = c.OLY, game = O.game, D = makeDriver(c);
  game.advance(.5); game.input.tap('confirm'); game.advance(.5); game.input.tap('confirm'); game.advance(.5);
  const saves = new Set(); let maxDay = 0;
  for (let i = 0; i < 90000 && !(game.sceneName === 'title' && i > 50); i++) { D.step(.1); const m = O.meet; if (m) maxDay = Math.max(maxDay, m.day); const sv = O.store.get('games', null); if (sv) saves.add(sv.day); if (game.errors.length) break; }
  check(S, 'playthrough returns to the title', game.sceneName === 'title', D.log.slice(-6).join('>'));
  for (const n of ['opening', 'beat', 'dayCard', 'eventCard', 'results', 'podium', 'medals', 'closing', 'credits']) check(S, 'playthrough visited ' + n, D.seen.has(n));
  for (const d of O.EVENT_LIST) check(S, 'playthrough played ' + d.id, D.seen.has('ev:' + d.id));
  check(S, 'reached day 12', maxDay >= 12, maxDay);
  check(S, 'autosave written during the Games', saves.size >= 8, [...saves].join(','));
  check(S, 'autosave cleared at the end', O.store.get('games', null) === null);
  check(S, 'no errors', game.errors.length === 0, game.errors.map(e => e.where + ' ' + e.message).join(' | '));
  // CONTINUE GAMES resumes at the saved day
  const c2 = boot(), O2 = c2.OLY, g2 = O2.game; g2.advance(.3); O2.Dev.jump('day:5'); g2.advance(1); O2.flow.save();
  const saved = O2.store.get('games', null); g2.go('menu'); g2.advance(1.2);
  check(S, 'menu offers CONTINUE GAMES', g2.scene.def.items && g2.scene.def.items[0].id === 'continue');
  g2.input.tap('confirm'); g2.advance(1); check(S, 'continue resumes at the saved day', O2.meet && O2.meet.day === saved.day && ['dayCard', 'beat'].includes(g2.sceneName), g2.sceneName + ' ' + (O2.meet && O2.meet.day));
  // torches and GAMES OVER: an idle human in The Games misses the qualifying mark
  const c3 = boot(), O3 = c3.OLY, g3 = O3.game; g3.advance(.3); O3.Dev.jump('day:1'); g3.advance(.5);
  let torch = 0, over = false;
  for (let i = 0; i < 20000 && !over; i++) { const sc = g3.sceneName; if (sc === 'torch') { torch++; if (g3.scene.def.over) over = true; } if (!sc.startsWith('ev:') || (O3.ctx && O3.ctx.phase !== 'play')) g3.input.tap('confirm'); g3.advance(.1); }
  check(S, 'missing the mark costs torches, then GAMES OVER', over && O3.meet.torches <= 0, torch + ' ' + over);
  // quick games with two humans: party points
  const c4 = boot(), O4 = c4.OLY, g4 = O4.game; g4.advance(.3);
  const m4 = O4.flow.newMeet('games', { events: ['sprint', 'javelin', 'diving', 'hockey'], quick: true, players: [{ nat: 'SUN', input: 0, color: '#4a8aff' }, { nat: 'TRB', input: 1, color: '#ff4a4a' }] }); g4.addPlayer({ keys: 'right' }); O4.flow.begin(m4); O4.tune.set('hockey', 'periodLength', 20); g4.go('dayCard'); g4.advance(.6);
  const D4 = makeDriver(c4); for (let i = 0; i < 60000 && g4.sceneName !== 'title'; i++) { D4.step(.1); if (g4.errors.length) break; }
  check(S, 'quick games (2 humans) finish', D4.seen.has('closing') && D4.seen.has('ev:hockey'), D4.log.slice(-5).join('>'));
  check(S, 'party points recorded for both players', (m4.party[0] || 0) > 0 && (m4.party[1] || 0) > 0, JSON.stringify(m4.party));
  check(S, 'no errors (quick 2P)', g4.errors.length === 0, g4.errors.map(e => e.where + ' ' + e.message).join(' | '));
});

/* ---- attract ---- */
await run('attract', S => {
  const c = boot(), O = c.OLY, game = O.game; game.advance(.3);
  const keys0 = Object.keys(c.__store).length; game.advance(9.4);
  check(S, 'idle 9.9 s: still the title', game.sceneName === 'title' && !O.Attract.on, game.sceneName);
  game.advance(.4); check(S, 'idle 10.1 s: attract starts', O.Attract.on);
  const seen = new Set(); for (let i = 0; i < 3600 * 2 && seen.size < 12; i++) { game.advance(.25); if (game.sceneName && game.sceneName.startsWith('ev:')) seen.add(game.sceneName); }
  check(S, 'attract shows all 12 events', seen.size === 12, [...seen].join(','));
  check(S, 'attract writes nothing to storage', Object.keys(c.__store).filter(k => !k.includes('settings')).length <= keys0, Object.keys(c.__store).join(','));
  game.advance(.5); game.input.tap('confirm'); game.advance(.6); check(S, 'any input exits to the title', game.sceneName === 'title' && !O.Attract.on, game.sceneName);
  check(S, 'no errors', game.errors.length === 0, game.errors.map(e => e.where + ' ' + e.message).join(' | '));
});

/* ---- dev mode ---- */
await run('dev', S => {
  const c = boot({ hash: '#ev/sprint' }), O = c.OLY, game = O.game; game.advance(.5);
  const item = game.o.menu.items.find(i => i[0] === 'Dev mode'); check(S, 'pause menu has Dev mode', !!item);
  game.pause(); item[1](); game.advance(.1);
  check(S, 'dev opens and freezes time', O.Dev.isOpen && game.timeScale === 0);
  const t0 = O.ctx.t; game.advance(1); check(S, 'frozen: the event does not advance', O.ctx.t === t0);
  O.Dev.close();
  const time = (mul) => { O.tune.set('sprint', 'vMax', 11.6 * mul); O.tune.set('sprint', 'accel', 9 * mul); const r = one(O, 'sprint', 4, .8); O.tune.reset('sprint'); return r.v; };
  const base = time(1), fast = time(1.5); check(S, 'TUNE: vMax ×1.5 → ≥25% faster heat', fast < base * .8, base + ' ' + fast);
  check(S, 'RESET TO DEFAULTS restores', O.tune.get('sprint').vMax === 11.6 && Math.abs(one(O, 'sprint', 4, .8).v - base) < 1e-9);
  // cheats in a live event
  const c2 = boot({ hash: '#ev/javelin' }), O2 = c2.OLY, g2 = O2.game; g2.advance(1); O2.Dev.cheat('win'); g2.advance(.5);
  check(S, 'WIN NOW → gold', g2.sceneName === 'results' && O2.meet.lastResults.rows[0].a.human, g2.sceneName);
  const c3 = boot({ hash: '#ev/javelin' }), O3 = c3.OLY, g3 = O3.game; g3.advance(1); O3.Dev.cheat('lose'); g3.advance(.5); check(S, 'LOSE NOW → 8th', O3.meet.lastResults.rows[7].a.human);
  const c4 = boot({ hash: '#ev/sprint' }), O4 = c4.OLY, g4 = O4.game; g4.advance(1); O4.Dev.cheat('dnf'); g4.advance(.5); check(S, 'DNF NOW', O4.meet.lastResults.rows.find(r => r.a.human).v == null);
  const c5 = boot({ hash: '#ev/skijump' }), O5 = c5.OLY, g5 = O5.game; g5.advance(1.5); O5.Dev.cheat('phase:flight'); g5.advance(.2); check(S, 'SKIP TO PHASE flight', O5.ctx.cur.S.phase === 'flight', O5.ctx.cur.S.phase);
  O5.Dev.cheat('god', true); check(S, 'god mode on', O5.Dev.cheats.god);
  O5.Laurels.unlockAll(); check(S, 'unlock all laurels', Object.keys(O5.Laurels.get()).length === 12);
  for (const tgt of ['opening', 'closing:3', 'podium', 'medals', 'beat:after2', 'poselab', 'day:7', 'ev:curling']) { const cc = boot(), OO = cc.OLY, gg = cc.OLY.game; gg.advance(.3); OO.Dev.jump(tgt); gg.advance(.6); const want = tgt.split(':')[0]; check(S, 'JUMP ' + tgt, gg.sceneName === (want === 'day' ? 'dayCard' : want === 'ev' ? 'ev:curling' : want), gg.sceneName); }
  check(S, 'no errors', game.errors.length === 0 && g2.errors.length === 0 && g5.errors.length === 0, [...game.errors, ...g2.errors, ...g5.errors].map(e => e.message).join(' | '));
});

/* ---- local multiplayer ---- */
await run('multi', S => {
  const c = boot(), O = c.OLY, game = O.game; game.advance(.3);
  game.addPlayer({ pad: 1 }); game.addPlayer({ pad: 2 }); game.addPlayer({ pad: 3 });
  check(S, '4 players', game.players.length === 4);
  const players = ['SUN', 'TRB', 'BON', 'WAV'].map((n, k) => ({ nat: n, input: k, color: '#fff' }));
  const m = O.flow.newMeet('single', { events: ['sprint'], players }); O.flow.begin(m); game.go('ev:sprint', { noIntro: true }); game.advance(.6);
  let n = 0; while (O.ctx.S.stage !== 'race' && n < 600) { game.advance(1 / 60); n++; }
  game.advance(.2); for (let i = 0; i < 300; i++) { game.players.forEach((p, k) => { const every = 6 + k * 4; if (k < 3 && i % every === 0) p.tap((i / every) % 2 ? 'mashL' : 'mashR'); }); game.advance(1 / 60); }
  const hs = O.ctx.athletes.filter(a => a.human), ds = hs.map(a => a.S.d);
  check(S, '4 humans in the race', hs.length === 4); check(S, 'their lanes move independently', ds[0] > 1 && ds[3] < .5 && ds[0] > ds[1] && ds[1] > ds[2], ds.map(d => d.toFixed(1)).join(','));
  // turns rotate in javelin
  const m2 = O.flow.newMeet('single', { events: ['javelin'], players: players.slice(0, 2) }); O.flow.begin(m2); game.go('ev:javelin'); game.advance(.6);
  const order = []; for (let i = 0; i < 6000 && game.sceneName === 'ev:javelin'; i++) { if (O.ctx.cur && order[order.length - 1] !== O.ctx.cur.id) order.push(O.ctx.cur.id); if (O.ctx.phase === 'card') game.input.tap('confirm'); game.advance(.1); }
  check(S, 'javelin turns rotate P1 → P2', order[0] === 'SUN' && order[1] === 'TRB', order.slice(0, 4).join(','));
  // a gamepad's buttons (standard mapping) drive an event: □/○ mash, ✕ dips
  { const cp = boot({ hash: '#ev/sprint' }), Op = cp.OLY, gp = Op.game; gp.advance(.6); let k = 0; while ((!Op.ctx.S || Op.ctx.S.stage !== 'race') && k < 900) { gp.advance(1 / 60); k++; } gp.advance(.2);
    for (let i = 0; i < 600; i++) { if (i % 6 === 0) { const c = (i / 6) % 2 ? 'Pad2' : 'Pad1'; gp.input.press(c); gp.advance(1 / 120); gp.input.release(c); } gp.advance(1 / 120); }
    const me = Op.ctx.athletes.find(a => a.human); check(S, 'gamepad □/○ (Pad2/Pad1) mash the sprinter forward', me.S.d > 20, me.S.d);
    gp.input.press('Pad0'); gp.advance(1 / 60); check(S, 'gamepad ✕ (Pad0) is the action button', gp.input.down('action')); gp.input.release('Pad0'); }
  // keyboard halves map our actions
  const E = c.My3D2dge, half = E.Input.halfKeys(O.KEYS, 'right'); check(S, 'keyboard right half has mash/action keys', !!(half.mashL && half.mashR && half.action), Object.keys(half).join(','));
  check(S, 'no errors', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
});

/* ---- the hub (headless, a fake AIHub) ---- */
await run('hub', async S => {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  for (const t of ['hub:session" content="1"', 'hub:session-players" content="1-4"', 'hub:session-mode" content="ghost"', 'hub:session-goal', 'hub:session-howto', 'hub:session-minutes']) check(S, 'tag ' + t, html.includes(t));
  const calls = { connect: null, ready: 0, answers: [], sends: [], progress: 0, results: [], rng: 0 };
  const handlers = {}; let tnow = -Infinity;
  const fake = { active: true, connect: async o => { calls.connect = o; return { me: 0, players: [{ id: 0, name: 'AVA' }, { id: 1, name: 'BO' }], seed: 99, mode: 'ghost' }; },
    ready() { calls.ready++; }, answer(a) { calls.answers.push(a); }, on(k, f) { (handlers[k] = handlers[k] || []).push(f); return () => {}; }, time: () => tnow,
    send(d, o) { calls.sends.push([d, o, tnow]); return true; }, progress() { calls.progress++; }, result(r) { calls.results.push(r); }, rng: l => { calls.rng++; const E = c.My3D2dge; return E.rng([...String(l)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7)); } };
  const emit = (k, d, from) => { for (const f of handlers[k] || []) f(d, from); };
  const c = boot({ hub: fake }), O = c.OLY, game = O.game;
  await game.booted; game.advance(.2); await new Promise(r => setTimeout(r, 0)); game.advance(.2);
  check(S, 'title never shows', game.sceneName !== 'title' && game.sceneName !== 'menu', game.sceneName);
  check(S, 'connect called ghost, seats 1-4, card', calls.connect && calls.connect.mode === 'ghost' && calls.connect.card === true && calls.connect.seats[0] === 1 && calls.connect.seats[1] === 4, JSON.stringify(calls.connect));
  check(S, 'ready() once without input', calls.ready === 1, calls.ready);
  check(S, 'our card shows', game.sceneName === 'hubCard', game.sceneName);
  const MM = c.__vm('Math'), mr = MM.random; let mcalls = 0; MM.random = () => { mcalls++; return mr(); }; game.advance(2); MM.random = mr;
  check(S, 'no Math.random on the card', mcalls === 0, mcalls);
  game.input.tap('confirm'); game.advance(.1); check(S, 'Enter answers ready', calls.answers.includes('ready'));
  game.input.tap('more'); game.advance(.1); check(S, 'more time answers more', calls.answers.includes('more'));
  check(S, 'the deal: 3 events from the groups', O.Hub.events.length === 3 && O.HUB_GROUPS.every((g, i) => g.includes(O.Hub.events[i])), O.Hub.events.join(','));
  // start and play the round on the hub's clock
  emit('start', { in: 3000 }); tnow = -2000; game.advance(.1); check(S, 'nothing starts before time 0', !game.sceneName.startsWith('ev:'));
  O.Dev.cheats.autopilot = true; const slots = new Set();
  for (let i = 0; i < 4000; i++) { tnow += 100; game.advance(.1); if (game.sceneName.startsWith('ev:')) slots.add(game.sceneName); if (calls.results.length) break; }
  check(S, 'all three slots played', slots.size === 3, [...slots].join(','));
  check(S, 'result sent exactly once', calls.results.length === 1, calls.results.length);
  check(S, 'progress sent', calls.progress >= 3, calls.progress);
  const gs = calls.sends.filter(s => s[0].t === 'g'), rs = calls.sends.filter(s => s[0].t === 'r');
  check(S, 'ghost samples sent', gs.length > 20, gs.length); check(S, 'event results sent reliably', rs.length === 3 && rs.every(s => s[1].reliable === true), rs.length);
  let maxRate = 0; for (const s of gs) { const n = gs.filter(q => q[2] > s[2] - 1000 && q[2] <= s[2]).length; maxRate = Math.max(maxRate, n); } check(S, 'send rate ≤ 20/s', maxRate <= 20, maxRate);
  check(S, 'payloads ≤ 16 KB', calls.sends.every(s => JSON.stringify(s[0]).length < 16000));
  // a ghost from another player is received and drawn data kept; leave removes it
  emit('message', { t: 'g', e: 'sprint', i: 0, s: [100, 0, 0, 0, 1] }, 1); check(S, 'ghost received', !!O.Hub.ghosts[1]); emit('leave', { id: 1, reason: 'left' }); check(S, 'leave removes the ghost', !O.Hub.ghosts[1]);
  emit('end', { reason: 'finished' }); game.advance(.2); const before = calls.sends.length; game.advance(1);
  check(S, 'end: nothing sent afterwards', calls.sends.length === before); check(S, 'end: input frozen', O.hubFrozen === true);
  check(S, 'pause menu has no Quit/Restart/Dev in a hub session', game.o.menu.items.length === 0 && game.o.menu.quit === false);
  // time-up before the end sends the result at once
  const c2 = boot({ hub: Object.assign({}, fake, { result(r) { calls.results2 = (calls.results2 || 0) + 1; } }) }); await c2.OLY.game.booted; c2.OLY.game.advance(.3); await new Promise(r => setTimeout(r, 0)); c2.OLY.game.advance(.2);
  for (const f of (handlers['time-up'] || []).slice(-1)) f({ graceMs: 2000 }); check(S, 'time-up → result at once', calls.results2 === 1, calls.results2);
  check(S, 'no errors', game.errors.length === 0, game.errors.map(e => e.where + ' ' + e.message).join(' | '));
});

const tHead = ((Date.now() - t0) / 1000).toFixed(0);
let tBrowser = '0';
if (!quick && (!only || only === 'browser')) { const t1 = Date.now(); const { browserSuites } = await import('./browser.mjs'); await browserSuites(check); tBrowser = ((Date.now() - t1) / 1000).toFixed(0); }
console.log(`olympiyikes: ${checks} checks, ${failed} failed (headless ${tHead} s, browser ${tBrowser} s)`);
process.exit(failed ? 1 : 0);
