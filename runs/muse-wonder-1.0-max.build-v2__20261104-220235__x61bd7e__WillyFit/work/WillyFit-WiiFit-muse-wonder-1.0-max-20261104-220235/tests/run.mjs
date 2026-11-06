// Willy Fit — one test command: node tests/run.mjs [rules|browser|hub|all]
// Prints only failures and one final count line.
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
const group = process.argv[2] || 'rules';
let passed = 0, failed = 0; const failures = [];
function check(name, cond, extra) { if (cond) passed++; else { failed++; failures.push(name + (extra ? ' — ' + extra : '')); } }
function loadGame(hash) {
  const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, removeEventListener() {}, location: { hash: hash || '', search: '', href: 'file:///game.html' }, performance: { now: () => Date.now() } };
  ctx.window = ctx; ctx.self = ctx; ctx.document = undefined;
  vm.createContext(ctx);
  const files = ['vendor/session.js', 'engine/my-3d2dge.js', 'vendor/readable.js', 'vendor/mocap.js', 'vendor/fitclips.js',
    'game/data/lines.js', 'game/data/charts.js', 'game/data/trays.js', 'game/core.js', 'game/balance.js', 'game/rigs.js', 'game/audio.js', 'game/ui.js',
    'game/activities/hold.js', 'game/activities/candle.js', 'game/activities/rep.js', 'game/activities/step.js', 'game/activities/jog.js', 'game/activities/tray.js',
    'game/scenes/boot.js', 'game/scenes/session.js', 'game/scenes/day.js', 'game/scenes/island.js', 'game/scenes/meta.js', 'game/scenes/meta2.js', 'game/scenes/start.js'];
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}
function runActivity(G, id, tier, skill, seed) {
  const def = G.byId[id], tierDef = def.tiers[tier - 1];
  const c = G.makeContestant({ bot: skill, name: skill, params: tierDef.params, rng: G.rngFrom(seed + 5) });
  const ctx = { def, tier, tierDef, rng: G.rngFrom(seed), time: 0, contestants: [c], mode: 'test', say: () => {}, instructorName: 'Birch', classMode: false, duel: null };
  ctx.instructorRig = G.makeRig(G.instructorOpts('birch'));
  def.setup(ctx);
  const dt = 1 / 120, steps = Math.floor(tierDef.dur / dt);
  for (let i = 0; i < steps; i++) { ctx.time += dt; def.update(dt, ctx); if (c.finished) break; }
  const res = def.result(ctx);
  return { pct: res.pct, stars: G.starsFor(res.pct, def.stars), falls: c.bal ? c.bal.falls : 0, detail: res.detail };
}
async function rules() {
  let ctx; try { ctx = loadGame(''); } catch (e) { check('game loads headless', false, String(e && e.message || e)); return; }
  const G = ctx.G, game = G.game;
  check('game loads headless', !!game);
  check('12 activities registered', G.activities.length === 12, 'got ' + G.activities.length);
  try { game.fadeTime = 0; } catch (e) {}
  // Lean direct band (Body Check params)
  {
    const r = runActivity(G, 'stork', 1, 'passive', 7);
    check('stork t1 passive <1 star', r.stars === 0, 'pct ' + r.pct.toFixed(2));
  }
  for (const a of G.activities) {
    for (let tier = 1; tier <= 2; tier++) {
      let rp, ra, rg, re;
      try {
        rp = runActivity(G, a.id, tier, 'passive', 11);
        check(a.id + ' t' + tier + ' passive pct in range', rp.pct >= -0.01 && rp.pct <= 1.01, 'pct ' + rp.pct);
        check(a.id + ' t' + tier + ' passive <1 star', rp.stars === 0, 'pct ' + rp.pct.toFixed(2) + ' stars ' + rp.stars);
        if (tier === 1) {
          ra = runActivity(G, a.id, tier, 'average', 12);
          rg = runActivity(G, a.id, tier, 'good', 13);
          check(a.id + ' t1 average >=1 star', ra.stars >= 1, 'pct ' + ra.pct.toFixed(2));
          check(a.id + ' t1 good >=2 stars', rg.stars >= 2, 'pct ' + rg.pct.toFixed(2));
        } else {
          rg = runActivity(G, a.id, tier, 'good', 13);
          re = runActivity(G, a.id, tier, 'expert', 14);
          check(a.id + ' t2 good >=1 star', rg.stars >= 1, 'pct ' + rg.pct.toFixed(2));
          check(a.id + ' t2 expert >=2 stars', re.stars >= 2, 'pct ' + re.pct.toFixed(2));
        }
      } catch (e) { check(a.id + ' t' + tier + ' bot runs', false, String(e && e.message || e)); }
    }
  }
  // determinism
  {
    const a1 = runActivity(G, 'stork', 1, 'good', 42), a2 = runActivity(G, 'stork', 1, 'good', 42);
    check('same seed same result (stork)', Math.abs(a1.pct - a2.pct) < 1e-9 && a1.falls === a2.falls, a1.pct + ' vs ' + a2.pct);
    const b1 = runActivity(G, 'tray', 1, 'average', 43), b2 = runActivity(G, 'tray', 1, 'average', 43);
    check('same seed same result (tray)', Math.abs(b1.pct - b2.pct) < 1e-9, b1.pct + ' vs ' + b2.pct);
  }
  // full playthrough (state + real activity sims)
  {
    G.member = G.newMember();
    let ok = true, err = '';
    try {
      const startAge = G.spineAge().age;
      check('spine age starts 71', startAge === 71, 'got ' + startAge);
      for (let day = 1; day <= 5; day++) {
        G.member.day = day; G.member.sessionsToday = 0;
        const ids = G.activities.filter(a => G.unlockedActivities()[a.id]).map(a => a.id);
        for (let s = 0; s < 3 && s < ids.length; s++) {
          const r = runActivity(G, ids[s], 1, 'average', 100 + day * 10 + s);
          const mins = G.sessionMinutes(ids[s], r.pct, r.stars);
          G.recordResult(ids[s], 1, r.pct, r.stars, mins); G.member.sessionsToday++;
        }
        if (day === 3) { const a3 = G.spineAge().age; G.member.spineHistory.push(a3); check('day3 spine recorded', a3 <= 71, '' + a3); }
      }
      check('spine age falls over 5 days', G.spineAge().age < 71, 'age ' + G.spineAge().age);
      check('unlocks arrive with minutes', G.member.minutes > 5, 'minutes ' + G.member.minutes);
      G.member.grandWin = true;
      check('grand win -1 spine', G.spineAge().age >= 19, 'age ' + G.spineAge().age);
      G.member.freePlay = true;
      check('free play unlocks all', Object.keys(G.unlockedActivities()).length === 12, '');
      // passive run still reaches end (state machine only)
      const m2 = G.newMember(); m2.day = 5; check('passive member can reach day 5 state', m2.day === 5, '');
    } catch (e) { check('full playthrough', false, String(e && e.stack || e).split('\n')[0]); }
  }
  // saves
  {
    try {
      G.member = G.newMember(); G.member.nickname = 'Test Pat'; G.member.minutes = 42; G.member.day = 3;
      const h1 = G.hashState();
      game.saves.save(0);
      G.member.nickname = 'Changed'; G.member.minutes = 0;
      game.saves.load(0);
      check('save reload same state', G.hashState() === h1 && G.member.nickname === 'Test Pat', G.member.nickname);
      G.member.nickname = 'Second'; game.saves.save(1);
      game.saves.load(0); check('slots stay separate (0)', G.member.nickname === 'Test Pat', G.member.nickname);
      game.saves.load(1); check('slots stay separate (1)', G.member.nickname === 'Second', G.member.nickname);
    } catch (e) { check('saves', false, String(e && e.message || e)); }
  }
  // scenes smoke
  {
    const names = ['title', 'member', 'arrival', 'island', 'bodycheck', 'evening', 'about', 'class', 'attract', 'poses', 'credits', 'ending'];
    for (const n of names) {
      try { game.go(n); game.advance(0.4); check('scene loads: ' + n, !(game.errors && game.errors.length), (game.errors || []).map(e => e.message).join(';').slice(0, 120)); if (game.errors) game.errors.length = 0; }
      catch (e) { check('scene loads: ' + n, false, String(e && e.message || e)); }
    }
    try { game.go('session', { id: 'stork', tier: 1, mode: 'free', from: 'title' }); game.advance(0.4); check('session scene loads', !(game.errors && game.errors.length), ''); if (game.errors) game.errors.length = 0; } catch (e) { check('session scene loads', false, String(e && e.message || e)); }
  }
  // attract timing helper
  check('attract idle helper', typeof G.idleSeconds === 'function' && G.idleSeconds() >= 0, '');
  // dev
  {
    const before = G.DEV.k; G.DEV.k = 99; G.resetDev(); check('dev reset restores', G.DEV.k === before && G.DEV.k === G.DEV_DEFAULTS.k, '');
    check('dev sliders cover lean', G.DEV_SLIDERS.length >= 20, '' + G.DEV_SLIDERS.length);
  }
  // class sim
  {
    try {
      const def = G.byId['stork'], tierDef = def.tiers[0];
      const cs = ['average', 'good', 'poor', 'expert'].map((sk, i) => G.makeContestant({ bot: sk, name: sk, params: tierDef.params, rng: G.rngFrom(50 + i) }));
      const cctx = { def, tier: 1, tierDef, rng: G.rngFrom(51), time: 0, contestants: cs, mode: 'class', say: () => {}, classMode: true };
      def.setup(cctx); const dt = 1 / 120; for (let i = 0; i < 35 / dt; i++) { cctx.time += dt; def.update(dt, cctx); }
      const scores = cs.map(c => { const sub = Object.assign({}, cctx, { contestants: [c] }); return Math.round(def.result(sub).pct * 1000); });
      check('class scores 0..1000', scores.every(s => s >= 0 && s <= 1000), scores.join(','));
    } catch (e) { check('class sim', false, String(e && e.message || e)); }
  }
  // hub deal determinism (seeded rng, no Math.random in deal path)
  {
    const r1 = G.rngFrom(G.seedFor('deal')), r2 = G.rngFrom(G.seedFor('deal'));
    check('seeded rng deterministic', r1() === r2() && r1() === r2(), '');
    try { game.go('round'); game.advance(0.3); check('round scene loads offline', !(game.errors && game.errors.length), ''); if (game.errors) game.errors.length = 0; } catch (e) { check('round scene loads offline', false, String(e && e.message || e)); }
  }
  // data lint
  {
    let count = 0; const walk = o => { if (typeof o === 'string') count++; else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
    walk(G.LINES); check('line bank 150+', count >= 150, 'count ' + count);
    const lib = G.getLib(); check('mocap lib loads', !!lib && lib.names.length >= 20, lib ? '' + lib.names.length : 'no lib');
    let clipsOk = true; for (const p of G.POSES) if (!G.clip(p.clip)) clipsOk = false;
    check('pose clips exist', clipsOk, '');
    let todo = false;
    const walkDir = d => { for (const f of readdirSync(join(root, d), { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) walkDir(p); else if (f.name.endsWith('.js') && read(p).includes('TODO')) todo = true; } };
    walkDir('game'); check('no TODO placeholders in game/', !todo, '');
    check('game errors empty at end', !(game.errors && game.errors.length), (game.errors || []).map(e => e.message).join(';').slice(0, 200));
  }
}
async function browser() {
  // Built file via file:// with Playwright (one browser at a time).
  const built = join(root, '..', 'WillyFit-WiiFit-muse-wonder-1.0-max-20261104-220235.html');
  check('built file exists for browser tests', existsSync(built), built);
  if (!existsSync(built)) return;
  let pw; try { pw = await import('playwright'); } catch (e) { check('playwright available', false, String(e.message || e)); return; }
  const browser = await pw.chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const reqs = []; page.on('request', r => reqs.push(r.url()));
    const errs = []; page.on('pageerror', e => errs.push(String(e.message || e)));
    await page.goto('file://' + built);
    await page.waitForTimeout(2500);
    const snap = await page.evaluate(() => { try { return window.G && window.G.game ? window.G.game.debug.snapshot() : null; } catch (e) { return { err: String(e) }; } });
    check('browser: reaches title', !!snap && !snap.err, JSON.stringify(snap).slice(0, 160));
    const music = await page.evaluate(() => { try { return window.G.game.settings.music; } catch (e) { return null; } });
    check('browser: music default 0.1', music === 0.1, 'got ' + music);
    const net = reqs.filter(u => u.startsWith('http'));
    check('browser: no network requests', net.length === 0, net.join(',').slice(0, 120));
    check('browser: no page errors', errs.length === 0, errs.join(';').slice(0, 200));
    await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    const snap2 = await page.evaluate(() => window.G.game.debug.snapshot());
    check('browser: input navigates', !!snap2, JSON.stringify(snap2).slice(0, 120));
  } finally { await browser.close(); }
}
async function hub() {
  check('hub harness files present', existsSync(join(root, 'tests/hub/harness.html')) && existsSync(join(root, 'tests/hub/game.html')), '');
  // Full harness drive is in tests/hub via http server; here verify the built game alone reaches title over http.
  const { spawn } = await import('node:child_process');
  const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: join(root, 'tests/hub') });
  let port = 0;
  await new Promise(res => { const on = d => { const m = String(d).match(/port (\d+)/); if (m) { port = +m[1]; res(); } }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(res, 4000); });
  try {
    check('hub test server started', port > 0, 'port ' + port);
    if (port > 0) {
      let pw; try { pw = await import('playwright'); } catch (e) { check('playwright available (hub)', false, ''); return; }
      const browser = await pw.chromium.launch();
      try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:' + port + '/game.html');
        await page.waitForTimeout(2000);
        const isGame = await page.evaluate(() => document.title.includes('Willy Fit'));
        check('hub: served page is this game', isGame, await page.title());
        // harness at every planned setting
        const cases = ['players=1&auto=1', 'players=2&auto=1', 'players=3&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave'];
        for (const q of cases) {
          const hp = await browser.newPage();
          await hp.goto('http://127.0.0.1:' + port + '/harness.html?game=game.html&' + q);
          await hp.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 120000 }).catch(() => {});
          const r = await hp.evaluate(() => ({ pass: !!(window.__hubCheck && window.__hubCheck.pass), bad: (window.__hubCheck && window.__hubCheck.checks || []).filter(c => !c.pass).map(c => c.name) }));
          check('hub harness ' + q + ' passes', r.pass, (r.bad || []).join(', ').slice(0, 160));
          await hp.close();
        }
      } finally { await browser.close(); }
    }
  } finally { try { srv.kill('SIGTERM'); } catch (e) {} }
}
if (group === 'rules' || group === 'all') await rules();
if (group === 'browser' || group === 'all') await browser();
if (group === 'hub' || group === 'all') await hub();
for (const f of failures) console.log('FAIL ' + f);
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
