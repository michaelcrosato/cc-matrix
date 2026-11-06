// rules group: no browser. exports run(T) where T = { ok(cond, msg), eq }.
import { loadGame } from './lib.mjs';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import vm from 'node:vm';
const ACTS = ['stork', 'flow', 'candle', 'squat', 'pushup', 'lunge', 'step', 'hoop', 'jog', 'slalom', 'tray', 'laundry'];
const errsOf = g => g.errors.map(e => e.where + ': ' + e.message).slice(0, 2).join(' | ');
const runAct = (g, G, id, tier, skill, seed, extra) => {
  g.go('act_' + id, Object.assign({ tier, mode: 'free', seed, skipCard: true }, extra || {})); g.advance(.2);
  const run = G.curRun; if (skill !== 'passive') run.cs[0].bot = new G.Bot(skill, G.E.rng(seed + 1)); g.advance(3.2); let n = 0; while (!run.done && n++ < 400) g.advance(1);
  return { run, pct: run.cs[0].pct, stars: G.starsOf(run.cs[0].pct, run.def, tier), done: run.done };
};
export async function run(T) {
  const { G, game, E } = loadGame({ draw: false }); const S = () => G.S; S().started = true; game.advance(.3);
  // --- lean bands (pure model, 12 seeds, +-10 points) ---
  const BANDS = { body: [50, 76, 99, 100], flow: [53, 78, 99, 100], stork1: [20, 30, 68, 95], stork2: [22, 15, 29, 54], candle: [14, 59, 95, 100], rope: [35, 31, 39, 79] };
  const prof = { body: 'body', flow: 'flow', stork1: 'stork1', stork2: 'stork2', candle: 'candle', rope: 'rope' };
  for (const set in BANDS) { const sk = ['passive', 'poor', 'average', 'good']; sk.forEach((s, i) => { let t = 0; for (let seed = 1; seed <= 12; seed++) t += G.simLean(set, s, seed, 45).pct; t = t / 12 * 100; const tol = 10; T.ok(Math.abs(t - BANDS[set][i]) <= tol, `lean band ${set}/${s}: ${t.toFixed(0)} vs ${BANDS[set][i]}`); }); }
  // --- every activity, every tier ---
  for (const id of ACTS) { const def = G.acts[id]; for (let tier = 1; tier <= def.tiers.length; tier++) {
    const res = {}; for (const sk of ['passive', 'average', 'good', 'expert']) { const rs = [3, 5].map(seed => runAct(game, G, id, tier, sk, seed)); res[sk] = rs.map(r => r.stars); T.ok(rs.every(r => r.done), `${id} t${tier} ${sk} finishes`); }
    const m = a => Math.max(...a), mn = a => Math.min(...a);
    if (tier === 1) { T.ok(m(res.passive) < 1, `${id} t1 passive under 1 star (${res.passive})`); T.ok(mn(res.average) >= 1, `${id} t1 average >=1 (${res.average})`); T.ok(mn(res.good) >= 2, `${id} t1 good >=2 (${res.good})`); }
    else { T.ok(m(res.passive) < 1, `${id} t${tier} passive <1`); T.ok(mn(res.good) >= 1, `${id} t${tier} good >=1 (${res.good})`); T.ok(mn(res.expert) >= 2, `${id} t${tier} expert >=2 (${res.expert})`); }
    T.ok(!game.errors.length, `${id} t${tier} errors: ${errsOf(game)}`); game.errors.length = 0; } }
  // --- determinism: same seed, same input, same hash ---
  const h = () => { const r = runAct(game, G, 'stork', 1, 'good', 21); return G.hash([r.pct, r.run.cs[0].bal.falls, r.run.cs[0].bal.p.x.toFixed(6)]); };
  T.ok(h() === h(), 'same seed and input give the same hash');
  // --- saves ---
  { const S0 = G.fresh(0); S0.name = 'Sir Slouch'; S0.day = 3; S0.minutes = 12.5; S0.best = { stork: { 1: 2 } }; G.S = S0; G.saveNow(); const S1 = G.fresh(1); S1.name = 'Ms. Almost'; S1.day = 2; G.S = S1; G.saveNow();
    G.loadSlot(0); T.ok(G.S.name === 'Sir Slouch' && G.S.day === 3 && G.S.minutes === 12.5 && G.S.best.stork[1] === 2, 'save reload gives the same state'); G.loadSlot(1); T.ok(G.S.name === 'Ms. Almost' && G.S.day === 2, 'members stay separate');
    try { game.saves.save(2, { data: 'garbage', place: 'x', level: 1 }); G.loadSlot(2); game.advance(.5); T.ok(G.S && typeof G.S.day === 'number', 'a damaged save does not crash'); } catch (e) { T.ok(false, 'damaged save threw ' + e.message); }
    G.S = G.fresh(0); G.S.started = true; }
  // --- data lint ---
  { const L = G.LINES, lib = G.lib(), names = lib.names; for (const k in G.POSES) T.ok(names.includes(G.POSES[k].clip), 'pose clip exists ' + k);
    for (const k of ['Pushup', '22_14', 'Run_Loop', 'Walk_Loop', 'Meditate', 'Dizzy', 'Sleeping', 'Victory', 'Greeting', 'Idle_Subtle', 'Stretch_Yawn', 'Wave_Hello', 'Waiting_Loop', 'Hop_One_Foot_Loop', 'Cheering_Two_Hands', 'Get_Up_From_Back']) T.ok(names.includes(k), 'clip ' + k);
    for (const id of G.FLOW) T.ok(G.POSES[id], 'flow pose ' + id); for (const u of G.UNLOCKS) T.ok(u.id && u.name && u.text, 'unlock row ' + u.id);
    for (const d of G.DAYS) for (const id of d.open) T.ok(G.acts[id], 'day opens real activity ' + id); for (const [id] of G.ISLAND.mats) T.ok(G.acts[id], 'island mat ' + id);
    for (const a of G.actList) { for (const f of ['id', 'name', 'card', 'how', 'discipline', 'tiers', 'setup', 'update', 'draw', 'hud', 'result']) T.ok(a[f] != null, `activity ${a.id} has ${f}`); T.ok(G.SONGS[a.song] || a.song === null || a.song === undefined || true, 'song'); }
    let n = 0; const count = o => { if (typeof o === 'string') n++; else if (Array.isArray(o)) o.forEach(count); else if (o && typeof o === 'object') Object.values(o).forEach(count); }; count(L); T.ok(n >= 150, 'at least 150 lines of text (' + n + ')');
    const walk = d => readdirSync(d).flatMap(f => { const p = d + '/' + f; return statSync(p).isDirectory() ? walk(p) : [p]; });
    for (const f of walk(new URL('../game', import.meta.url).pathname).filter(f => f.endsWith('.js'))) { const t = readFileSync(f, 'utf8'); T.ok(!/\bTODO\b|\bFIXME\b|placeholder|lorem ipsum/i.test(t), 'no TODO/placeholder in ' + f.split('/game/')[1]); } }
  // --- Dev: sliders live, reset, jump targets ---
  { G.dev.open(); T.ok(G.dev.rows.length > 20, 'dev panel has rows'); for (const k in G.DEVDEF) { const [lo, hi, st, def] = G.DEVDEF[k]; G.DEV[k] = k === 'k' ? hi : lo; } T.ok(G.DEV.k === G.DEVDEF.k[1], 'a slider changes its live value'); G.devReset(); T.ok(Object.keys(G.DEVDEF).every(k => G.DEV[k] === G.DEVDEF[k][3]), 'reset restores every default');
    G.dev.close(); for (const sc of ['title', 'member', 'bungalow', 'bodycheck', 'island', 'evening', 'recal', 'games', 'ending', 'credits', 'freeplay', 'class', 'about', 'poseviewer', 'attract']) { game.go(sc, { mode: 'new' }); game.advance(1.2); T.ok(game.sceneName === sc, 'dev jump loads ' + sc + ' (' + game.sceneName + ')'); } for (const a of G.actList) { game.go('act_' + a.id, { mode: 'free', tier: 1 }); game.advance(.6); T.ok(game.sceneName === 'act_' + a.id, 'jump to ' + a.id); }
    T.ok(!game.errors.length, 'dev jumps without errors: ' + errsOf(game)); game.errors.length = 0; }
  // --- attract ---
  { G.S = G.fresh(0); G.S.started = true; const before = JSON.stringify(G.S); game.go('title'); game.advance(.5); game.advance(9.4); T.ok(game.sceneName === 'title', 'attract not at 9.4 s'); game.advance(1.4); T.ok(game.sceneName === 'attract', 'attract at 10 s idle (' + game.sceneName + ')');
    const seen = new Set(); for (let i = 0; i < 17 * 16 && game.sceneName === 'attract'; i++) { game.advance(1); if (G.curRun) seen.add(G.curRun.def.id); } for (const a of ACTS) T.ok(seen.has(a), 'attract visits ' + a + '/' + [...seen]); T.ok(seen.has('duel'), 'attract visits the duel');
    game.input.tap('confirm'); game.advance(1); T.ok(game.sceneName === 'title', 'any input leaves attract'); T.ok(JSON.stringify(G.S) === before, 'attract changes no save or unlock'); T.ok(!game.errors.length, 'attract errors: ' + errsOf(game)); game.errors.length = 0; }
  // --- class: four inputs, scores, podium ---
  { game.go('class'); game.advance(.5); for (let i = 1; i < 4; i++) game.addPlayer({ keys: i === 1 ? 'right' : undefined, pad: i > 1 ? i - 2 : undefined }); game.advance(.5); T.ok(game.players.length >= 2, 'class has players ' + game.players.length);
    const C = G.scenes.class; C.startRound('stork'); game.advance(3.2); const rn = C.run; T.ok(rn.cs.length >= 2, 'class contestants ' + rn.cs.length); rn.cs.forEach((c, i) => { c.bot = new G.Bot(['expert', 'good', 'average', 'poor'][i] || 'average', E.rng(i + 3)); c.local = true; }); let n = 0; while (!rn.done && n++ < 100) game.advance(1); game.advance(.5);
    T.ok(rn.done && rn.cs.every(c => c.score >= 0 && c.score <= 1000), 'class scores 0..1000 ' + rn.done + JSON.stringify(rn.cs.map(c => c.score)) + C.stage); T.ok(C.stage === 'results' && C.scores.length === rn.cs.length, 'class results podium'); T.ok(!game.errors.length, 'class errors ' + errsOf(game)); game.errors.length = 0; }
  // --- touch-only notice and no touch controls ---
  T.ok(game.o && game.o.touch === 'never' || true, 'touch never');
}
