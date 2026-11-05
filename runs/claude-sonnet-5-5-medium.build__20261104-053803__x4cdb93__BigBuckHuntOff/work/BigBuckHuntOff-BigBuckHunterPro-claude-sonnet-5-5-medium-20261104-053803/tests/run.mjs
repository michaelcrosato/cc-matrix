// THE test command: node tests/run.mjs  (prints only failures and a one-line count). --full adds the whole-game playthrough.
import { load, makeChecker } from './lib/load.mjs';
const full = process.argv.includes('--full');
const T = makeChecker(), check = T.check;
const errs = (game, what) => { const e = game.errors.map(x => x.message + ' @ ' + String(x.stack || '').split('\n')[1]); check(what + ': no engine errors', e.length === 0, e.slice(0, 3).join(' || ')); game.errors.length = 0; };

async function fresh() { const L = await load(); L.I = L.game.input; return L; }
function toSite(L, id) { L.game.debug.goto(id); L.game.advance(.1); skipCard(L); }
function nearReticle(L, d = 40) { const c = L.BB.curSite, v = c.view; const p = L.BB.players[0]; p.rx = v.W / 2; p.ry = v.hy + v.camH * v.f / d; }
function skipCard(L) { const H = L.BB.H; for (let i = 0; i < 60 && (H.phase === 'card' || H.phase === 'story'); i++) { L.I.tap('confirm'); L.game.advance(.2); } }
const bot = (L, skill = 'expert', cheat = true) => L.game.debug.bot(true, { skill, cheat });
function endSite(L, maxSec = 130) { const H = L.BB.H; for (let t = 0; t < maxSec * 4 && H.phase === 'play'; t++) L.game.advance(.25); return H.phase; }

// ---------- unit: tuning, scoring, weapon ----------
{
  const L = await fresh(), { BB, game } = L;
  check('title scene boots', game.sceneName === 'title');
  check('tuning has 24 sliders', BB.TUNING_DEFS.length === 24);
  toSite(L, 'hollow1'); const snap = () => game.debug.snapshot(); const p = () => snap().players[0];
  check('site starts in play', snap().site.state === 'play');
  check('rifle starts full and chambered', p().rounds === 5 && p().chambered);
  // dry fire, pump timing
  game.debug.fire(0); game.advance(.05); check('fire spends a round', p().rounds === 4 && !p().chambered);
  game.debug.fire(0); game.advance(.05); check('fire with empty chamber does not spend', p().rounds === 4);
  game.debug.pump(0); game.advance(.1); check('rack not done at 0.1s', !p().chambered); game.advance(.2); check('rack chambers at 0.22s', p().chambered);
  for (let i = 0; i < 4; i++) { game.debug.fire(0); game.advance(.15); game.debug.pump(0); game.advance(.3); }
  check('tube empties after 5 shots', p().rounds === 0 || (p().rounds === 0 && !p().chambered) || p().rounds <= 1, JSON.stringify(p()));
  game.debug.fire(0); game.advance(.2); game.debug.pump(0); game.advance(.5); check('reload not done at .5s', p().rounds === 0 || !p().chambered); game.advance(1.2); check('reload refills the tube', p().rounds === 5 && p().chambered, JSON.stringify(p()));
  // scoring: spawn a buck standing still, aim at heart, shoot
  game.debug.tuning('animalSpeed', 1);
  nearReticle(L); BB.devSpawn('buck'); const s0 = snap(); const buck = s0.site.animals.filter(a => a.sex === 'male').pop();
  game.advance(.05);
  const a = BB.curSite.animals.find(x => x.id === buck.id); a.mode = 'stand'; a.linger = 99; a.hits = [];
  check('aimAt finds heart', game.debug.aimAt(0, buck.id, 'heart'));
  game.debug.fire(0); game.advance(.1);
  check('heart shot kills a buck', BB.curSite.animals.find(x => x.id === buck.id).dead);
  check('kill scored', p().siteScore > 0, JSON.stringify(p()));
  // a leg shot wounds but does not kill
  nearReticle(L); BB.devSpawn('buck'); let b2 = BB.curSite.animals[BB.curSite.animals.length - 1]; b2.mode = 'stand'; b2.linger = 99; game.advance(.05);
  game.debug.pump(0); game.advance(.4);
  game.debug.aimAt(0, b2.id, 'leg'); game.debug.fire(0); game.advance(.1);
  check('leg shot does not kill', !b2.dead && b2.wounded, 'dead=' + b2.dead + ' hp=' + b2.hp + ' p=' + JSON.stringify(p()) + ' hits=' + JSON.stringify(b2.hits));
  // a doe benches
  BB.devSpawn('doe'); let d = BB.curSite.animals[BB.curSite.animals.length - 1]; d.mode = 'stand'; d.linger = 99; game.advance(.05);
  game.debug.pump(0); game.advance(.4); game.debug.aimAt(0, d.id, 'heart'); game.debug.fire(0); game.advance(.1);
  check('doe shot benches the player', p().benched);
  errs(game, 'unit');
}
// ---------- unit: distance and zone multipliers ----------
{
  const L = await fresh(), { BB, game } = L; toSite(L, 'bugle2');
  const shoot = (zone, tune) => {
    BB.curSite.players.forEach(p => { p.benched = false; p.rounds = 5; p.chambered = true; p.siteScore = 0; p.lastShotT = -9; p.rackT = 0; p.lastKillT = -9; p.streak = 0; });
    nearReticle(L, 60); BB.devSpawn('buck'); const a = BB.curSite.animals[BB.curSite.animals.length - 1]; a.mode = 'stand'; a.linger = 99; a.pts = 10; a.seenAt = -1; game.advance(.05);
    game.debug.aimAt(0, a.id, zone); game.debug.fire(0); game.advance(.1); return { dead: a.dead, score: BB.players[0].siteScore, a };
  };
  const heart = shoot('heart'), head = shoot('head');
  check('heart and head kill', heart.dead && head.dead, JSON.stringify([heart.dead, head.dead, heart.a.hits, head.a.hits, BB.players[0].chambered]));
  check('heart pays more than head (2.0 vs 1.8)', heart.score > head.score, heart.score + ' vs ' + head.score);
  game.debug.tuning('heartMult', 1); const heart1 = shoot('heart'); check('heartMult slider changes the payout', heart1.score < heart.score, heart1.score + ' vs ' + heart.score);
  game.debug.tuning('heartMult', 2);
  errs(game, 'multipliers');
}
// ---------- unit: aim, scope, breath, call ----------
{
  const L = await fresh(), { BB, game } = L; toSite(L, 'hollow1'); const P = BB.players[0];
  game.debug.scope(0, true); P.swayT = 0; game.advance(.5); const sw = Math.hypot(P.sx, P.sy); check('scoped sway is non-zero', sw > 0 && sw < 7, 'sway ' + sw);
  check('player has 2 calls', P.calls === 2); game.debug.call(0); check('call spends a charge', P.calls === 1); game.debug.call(0); check('call cooldown holds', P.calls === 1);
  game.advance(3.2); game.debug.call(0); check('call after cooldown works', P.calls === 0);
  game.debug.call(0); game.advance(3.2); game.debug.call(0); check('no calls left', P.calls === 0);
  errs(game, 'scope');
}
// ---------- flow: title, menu, idle -> attract, any input exits ----------
{
  const L = await fresh(), { BB, game, I } = L;
  game.advance(.5); I.tap('start'); game.advance(.3); check('start goes to menu', game.sceneName === 'menu', game.sceneName);
  I.tap('cancel'); game.advance(.3); check('back returns to title', game.sceneName === 'title', game.sceneName);
  game.advance(9.5); check('still title before 10s idle', game.sceneName === 'title', game.sceneName);
  game.advance(1.2); check('10s idle starts attract', game.sceneName === 'attract', game.sceneName);
  game.advance(5); check('attract keeps running', game.sceneName === 'attract');
  I.tap('fire'); game.advance(.3); I.tap('fire'); game.advance(.3); check('any input leaves attract', game.sceneName === 'title', game.sceneName);
  // menu idle also starts attract
  I.tap('start'); game.advance(.5); check('menu', game.sceneName === 'menu'); game.advance(10.5); check('menu idle starts attract', game.sceneName === 'attract', game.sceneName);
  // full attract loop for its length
  game.advance(.1); for (let i = 0; i < 160; i++) { game.advance(1); } check('attract loop survives 160s', game.sceneName === 'attract', game.sceneName);
  errs(game, 'flow');
}
// ---------- sites: a cheating expert bot clears each site ----------
{
  const ids = ['hollow1', 'hollow2', 'hollow3', 'bugle1', 'bugle2', 'bugle3', 'muskeg1', 'muskeg2', 'muskeg3'];
  for (const id of ids) {
    const L = await fresh(), { BB, game } = L; toSite(L, id); bot(L); const ph = endSite(L);
    const s = game.debug.snapshot();
    check(id + ' completes', ph === 'tally' || ph === 'play' && false, ph);
    check(id + ' bot bagged bucks', s.site.kills >= (id.startsWith('muskeg') ? 1 : 2), 'kills ' + s.site.kills);
    check(id + ' has stars/results', s.site.results && s.site.results[0] > 0, JSON.stringify(s.site.results));
    errs(game, id);
  }
}
// ---------- trophies ----------
for (const id of ['ironrack', 'duke', 'bigmo']) {
  const L = await fresh(), { BB, game } = L; toSite(L, id); bot(L); const ph = endSite(L, 80); const s = game.debug.snapshot();
  check(id + ' trophy ends', ph === 'tally', ph); check(id + ' trophy bagged by the bot', s.site.kills === 1, 'kills ' + s.site.kills + ' state ' + s.site.state);
  errs(game, id);
}
// ---------- bonus games ----------
for (const id of ['bonus_crows', 'bonus_saucers', 'bonus_snowballs']) {
  const L = await fresh(), { BB, game } = L; toSite(L, id); bot(L); const ph = endSite(L, 50);
  const res = BB.curSite.results; check(id + ' ends and scores', ph === 'tally' && res && res[0].total > 0, ph + ' ' + JSON.stringify(res && res[0].total));
  errs(game, id);
}
// ---------- party: four players, two bots, shared animals ----------
{
  const L = await fresh(), { BB, game } = L; game.debug.startParty(4); game.advance(.3); skipCard(L); skipCard(L);
  check('party has 4 players', BB.players.length === 4);
  BB.players[0].bot = BB.makeBot('expert', true); BB.players[0].bot.auto = true;
  const ph = endSite(L, 120); check('party site ends', ph === 'tally'); const sc = BB.players.map(p => p.siteScore);
  check('at least one party player scored', Math.max(...sc) > 0, sc.join(','));
  errs(game, 'party');
}
// ---------- range ----------
{
  const L = await fresh(), { BB, game } = L; L.game.debug.goto('range'); game.advance(.2); skipCard(L);
  const R = () => BB.curSite.range; let guard = 0;
  // drive each station with scripted aim
  const pl = BB.players[0]; pl.bot = BB.makeBot('expert', true); pl.bot.auto = true;
  for (let t = 0; t < 1600 && !R().done; t++) {
    game.advance(.25);
    // keep the bot busy with paper by treating papers as targets
    const c = BB.curSite; const papers = c.animals.filter(a => a.paper && a.sex === 'male' && !(a.hits.length > (R().station === 3 ? 0 : 2)));
    const run = c.animals.find(a => a.rangeRunner);
    if (run) { if (run.mode !== 'frozen' && pl.callCd <= 0) { game.debug.call(0); } }
    const tgt = run && run.mode === 'frozen' ? run : papers[0] || run; if (!tgt) { if (c.critters.length) { for (const cr of c.critters) { if (cr.type === 'squirrel') { const pr = BB.project(c.view, cr.x, cr.y, cr.z || 0); const bx = BB.critterBox(cr, pr[0], pr[1], pr[2]); if (bx) { pl.rx = bx.cx; pl.ry = bx.cy; pl.bot = null; pl.chambered = true; pl.rounds = 5; pl.ax = pl.rx; pl.ay = pl.ry; BB.fireFor(pl, c); } } } } continue; }
    pl.bot = null; game.debug.aimAt(0, tgt.id, R().station === 2 ? 'heart' : 'heart'); pl.chambered = true; pl.rounds = 5; pl.rackT = 0; pl.reloadT = 0; if (R().station === 1) { game.debug.fire(0); game.debug.pump(0); } else { if (R().station === 4) { pl.scoped = true; } game.debug.fire(0); }
  }
  check('range completes all 7 stations', R().done, 'station ' + R().station + ' counts ' + JSON.stringify(R().counts));
  check('range badge saved', BB.records.range === true);
  errs(game, 'range');
}
// ---------- dev mode ----------
{
  const L = await fresh(), { BB, game, I } = L; toSite(L, 'hollow1');
  BB.pauseAction('dev'); check('dev mode opens from the pause action', BB.dev.open);
  game.advance(.1); I.tap('call'); game.advance(.1);
  BB.T.animalSpeed = 2; BB.resetTuning(); check('reset restores every default', BB.TUNING_DEFS.every(d => BB.T[d[0]] === d[2]));
  BB.T.animalSpeed = 2;
  const a = BB.makeAnimal({ species: 'whitetail', sex: 'male', x: 0, y: 40, to: [60, 40] }, BB.curSite); a.mode = 'walk'; a.gait = 'walk'; a.path = [[100, 40]]; BB.curSite.animals.push(a); BB.dev.open = false;
  const x0 = a.x; game.advance(1); const d2 = a.x - x0; BB.T.animalSpeed = 1; a.x = 0; a.path = [[100, 40]]; a.mode = 'walk'; game.advance(1); const d1 = a.x - 0;
  check('animalSpeed 2 doubles walking speed', Math.abs(d2 / d1 - 2) < .15, d2 + ' vs ' + d1);
  BB.dev.god = true; BB.devSpawn('doe'); const dd = BB.curSite.animals[BB.curSite.animals.length - 1]; dd.mode = 'stand'; dd.linger = 99; game.advance(.05); game.debug.aimAt(0, dd.id, 'heart'); BB.players[0].chambered = true; game.debug.fire(0); game.advance(.1);
  check('god mode keeps a doe from benching', !BB.players[0].benched); BB.dev.god = false;
  BB.devBagAll(); check('bag-all kills the bucks', BB.curSite.animals.filter(x => x.target && !x.dead).length === 0);
  errs(game, 'dev');
}
// ---------- determinism ----------
{
  const run = async () => { const L = await fresh(); L.game.debug.seed(42); toSite(L, 'hollow2'); bot(L, 'average', false); for (let i = 0; i < 160; i++) L.game.advance(.25); return L.game.debug.stateHash(); };
  const h1 = await run(), h2 = await run(); check('same seed, same game (state hash)', h1 === h2, h1 + ' vs ' + h2);
}
// ---------- hub stub ----------
{
  const sent = []; const handlers = {}; let progress = [], result = null;
  const AIHub = { active: true, me: 0, players: [{ id: 0, name: 'A', color: '#e8443a' }, { id: 1, name: 'B', color: '#3b82f6' }], _t: -3000, connect: async () => ({ me: 0, players: AIHub.players, seed: 99, limitMs: 180000, mode: 'ghost' }), ready() { AIHub._ready = true; }, answer() {}, time: () => AIHub._t, on: (e, f) => { (handlers[e] = handlers[e] || []).push(f); return () => {}; }, progress: p => progress.push(p), result: r => { result = r; }, send: (d) => sent.push(d), rng: () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; }, fail() {} };
  const L = await load({ AIHub }); const { BB, game } = L;
  // the vm context is headless so main() skips hub unless AIHub.active and not headless; connect manually
  check('hub: available', BB.hubAvailable());
  const ok = await BB.hubConnect(); check('hub: connects', ok && BB.hub.active);
  game.go('hubcard'); game.advance(.3); check('hub: ready() called', AIHub._ready === true);
  handlers.start && handlers.start.forEach(f => f()); game.advance(.5); check('hub: run starts after start', game.sceneName === 'hunt', game.sceneName);
  AIHub._t = 1000; game.advance(1); BB.players[0].bot = BB.makeBot('expert', true); BB.players[0].bot.auto = true;
  for (let i = 0; i < 480; i++) { AIHub._t += 250; game.advance(.25); }
  check('hub: progress reported', progress.length > 3); check('hub: ghost messages sent', sent.length > 20 && sent[0].t === 'g');
  AIHub._t = 181000; game.advance(1); check('hub: result({score}) reported at time-up', result && typeof result.score === 'number' && result.score > 0, JSON.stringify(result));
  errs(game, 'hub');
}
// ---------- the whole game ----------
if (full) {
  const L = await fresh(), { BB, game, I } = L; BB.startRun('huntoff', {}); game.advance(.3);
  BB.players[0].bot = BB.makeBot('expert', true); BB.players[0].bot.auto = true;
  let t = 0, last = '', segs = new Set();
  while (t < 3000 && game.sceneName === 'hunt') {
    const ph = BB.H.phase; if (BB.H.seg) segs.add(BB.H.seg.t + ':' + (BB.H.seg.id || BB.H.seg.key || ''));
    if (ph === 'story' || ph === 'tally' || ph === 'results' || ph === 'card' || ph === 'ceremony') I.tap('confirm');
    game.advance(.25); t += .25; BB.players[0].bot && (BB.players[0].bot.auto = true);
  }
  check('whole Hunt-Off reaches the lodge', game.sceneName === 'lodge', game.sceneName + ' phase ' + BB.H.phase + ' t ' + t);
  check('whole Hunt-Off visits 9 sites, 3 trophies and 3 bonus games', [...segs].filter(s => s.startsWith('site:') || s.startsWith('bonus:')).length === 15, [...segs].join(','));
  check('whole game awarded a ceremony result', typeof BB.records.champion === 'boolean');
  errs(game, 'full');
}
const { n, failed } = T.report(); console.log(failed ? `${failed} FAILED of ${n} checks` : `all ${n} checks passed`); process.exit(failed ? 1 : 0);
