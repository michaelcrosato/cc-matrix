// PLAN.md's measured figures, played on this build. Skill results read sharp / average / clumsy.
// Tight where the game decides the number. Wider, with a note, where the plan left the bot's details open.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import rules from './test-rules.mjs';
import fitted from './test-fits.mjs';

const SK = ['sharp', 'average', 'clumsy'], SEEDS = [1, 2, 3];
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export default async function ({ ok, info, launch, logicPage, root, dev }) {
  const browser = await launch();
  let page = await logicPage(browser);
  const fresh = async () => { await page.context().close(); page = await logicPage(browser); };
  const near = (label, got, want, tol) => ok(Math.abs(got - want) <= tol, label, `${got.toFixed(2)}, plan ${want} within ${tol}`);
  const near3 = (label, got, want, tol) => SK.forEach((s, i) => near(`${label} ${s}`, got[i], want[i], Array.isArray(tol) ? tol[i] : tol));

  const run = (o) => page.evaluate((o) => {
    const T = window.__TEST__, g = T.game;
    g.save.settings.autoBreathe = false;
    T.setSeed(o.seed);
    T.startEvent(o.id, o.tier, {});
    const ev = g.currentEvent, l = ev.lanes[0];
    if (o.setup) Object.assign(l, o.setup);
    if (o.cfg) ev.cfg = { ...ev.cfg, ...o.cfg };
    const launches = [], rounds = [];
    let off = 0, prevStage = ev.stage;
    if (o.id === 'springboard') { const real = ev.launch.bind(ev); ev.launch = (x) => { real(x); launches.push(x.launchV); }; }
    T.bot(o.skill);
    let t = 0;
    while (t < 400 && !ev.isDone()) {
      T.advance(0.25); t += 0.25;
      if (o.id === 'islandLoop') { const p = g.phys.pos; off = Math.max(off, Math.abs(Math.hypot(p.x, p.z) - 19)); }
      if (o.id === 'raft') { if (prevStage === 'play' && ev.stage === 'between') rounds.push(ev.roundT); prevStage = ev.stage; }
    }
    T.bot(null);
    const r = ev.laneResult(l);
    const x = { form: r.form, raw: r.raw, falls: l.falls || 0, t: ev.t, done: ev.isDone() };
    if (o.id === 'cairn') x.stones = l.onSlab;
    if (o.id === 'stillWater') { x.share = 100 * ev.inT / Math.max(1, Math.min(ev.t, ev.cfg.time)); x.calm = ev.peak; }
    if (o.id === 'plank') { x.share = 100 * ev.inT / ev.cfg.time; x.flops = ev.flops; }
    if (o.id === 'tug') x.won = ev.wins[l.team] >= 2 ? 100 : 0;
    if (o.id === 'stepClass') { x.notes = ev.notes.length; x.len = ev.length; x.foot = ev.notes.filter((n) => !n.lean).length; x.lean = ev.notes.filter((n) => n.lean).length; }
    if (o.id === 'plates') { x.share = 100 * r.raw; x.crashes = l.crashes / (ev.t / 60); }
    if (o.id === 'islandLoop') { x.share = 100 * ev.inBand / Math.max(1, ev.time); x.off = off; x.time = ev.time; }
    if (o.id === 'fruitHat') x.banked = l.banked;
    if (o.id === 'roomService') { x.glasses = l.tumblers.filter((t) => t.on).length; x.doneT = l.doneT; }
    if (o.id === 'springboard') { x.launches = launches; x.dives = l.dives.map((d) => ({ k: d.kind, h: d.height })); }
    if (o.id === 'raft') { x.rounds = rounds; x.winsBy = ev.lanes.map((n) => ({ skill: n.kind === 'local' ? o.skill : n.skill, w: ev.wins[n.id] || 0 })); }
    if (o.id === 'grandHold') { x.restarts = ev.restarts; x.last = 100 * ev.lastIn / Math.max(1, ev.lastT); }
    T.goto('menu');
    return x;
  }, o);
  // One figure for each skill, over seeds.
  const skills = async (id, tier, field, setup = null, seeds = SEEDS, cfg = null) => {
    const out = { values: [], rows: [] };
    for (const skill of SK) {
      const rs = [];
      for (const seed of seeds) rs.push(await run({ id, tier, skill, seed, setup, cfg }));
      out.values.push(mean(rs.map((r) => (typeof field === 'function' ? field(r) : r[field]))));
      out.rows.push(rs);
    }
    info(id, `T${tier + 1}`, JSON.stringify(setup || {}), out.values.map((v) => v.toFixed(v < 3 ? 2 : 0)).join(' / '), 'form', out.rows.map((rs) => mean(rs.map((r) => r.form)).toFixed(0)).join(' / '));
    return out;
  };
  const stat = (o, f) => o.rows.map((rs) => mean(rs.map(f)));
  const sharpForm = (o) => stat(o, (r) => r.form)[0];
  const landsWell = (label, form) => ok(form >= 88 && form <= 95, `${label}: par puts the sharp bot at 88 to 95`, form.toFixed(1));

  // Section 4: the balance core at its defaults, on a bare doll.
  const core = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, STEP = 1 / 120, o = {};
    const into = () => {
      T.resetTuning(); T.tun.swayScale = 0; T.tun.tremorScale = 0; T.bot(null); T.stick(0, 0);
      T.startEvent('poses', 0, {});
      const ev = g.currentEvent;
      for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
      ev.lanes[0].bal.params.maxLean = 18; T.advance(1.5); g.speech.clear();
      return { l: ev.lanes[0], b: ev.lanes[0].bal };
    };
    let s = into(), t90 = null, peak = 0;
    T.stick(1, 0);
    for (let t = 0; t < 4; t += STEP) { T.advance(STEP); const d = s.b.lean * 57.3; peak = Math.max(peak, d); if (t90 === null && d >= 16.2) t90 = t; }
    o.step = { t90, peak, settle: s.b.lean * 57.3 };
    s = into(); T.stick(-1, 0); T.advance(3); T.stick(1, 0);
    let slam = 0, slamFell = false;
    for (let t = 0; t < 3; t += STEP) { T.advance(STEP); if (s.l.fallen) slamFell = true; else slam = Math.max(slam, Math.abs(s.b.leanX)); }
    o.slam = { peak: slam * 57.3, fell: slamFell };
    T.stick(0, 0);
    const slamAt = (ankle) => {
      s = into(); T.tun.ankleMax = ankle; T.stick(-1, 0); T.advance(3); T.stick(1, 0);
      let pk = 0, fell = false;
      for (let t = 0; t < 3; t += STEP) { T.advance(STEP); if (s.l.fallen) fell = true; else pk = Math.max(pk, Math.abs(s.b.leanX)); }
      T.stick(0, 0);
      return { peak: pk * 57.3, fell };
    };
    o.slam42 = slamAt(4.2); o.slam38 = slamAt(3.8);
    const gust = (n, mode) => {
      s = into(); const b = s.b;
      if (mode === 'brace') { T.stick(-(0.08 + 0.6 * 0.92), 0); T.advance(0.5); }
      let top = 0, fell = false, left = 0.5, flailed = false;
      for (let t = 0; t < 3.5; t += STEP) {
        if (left > 0) { b.extX += n; left -= STEP; }
        T.advance(STEP);
        if (s.l.fallen) fell = true; else top = Math.max(top, b.lean);
        if (mode === 'flail' && !flailed && b.lean * 57.3 >= (n >= 3.5 ? 32 : 30)) { b.flail(); flailed = true; }
      }
      T.stick(0, 0);
      return { peak: top * 57.3, fell };
    };
    o.gust = {};
    for (const n of [2, 2.5, 3, 3.5, 4]) o.gust[n] = { none: gust(n, 'none'), flail: gust(n, 'flail'), brace: gust(n, 'brace') };
    T.resetTuning(); T.goto('menu');
    return o;
  });
  near('full stick reaches 90%, in seconds', core.step.t90, 1, 0.15);
  near('full stick overshoots to', core.step.peak, 23, 1.5);
  near('full stick settles at', core.step.settle, 18, 1);
  ok(!core.slam.fell, 'slamming the stick end to end survives at the defaults');
  near('slamming end to end peaks at', core.slam.peak, 28, 3);
  ok(!core.slam42.fell, 'slamming survives at ankle strength 4.2'); near('at 4.2 it peaks at', core.slam42.peak, 28, 3);
  ok(core.slam38.fell, 'slamming falls at ankle strength 3.8');
  ok(!core.gust[2].none.fell, 'a 2 N·m gust is safe'); near('a 2 N·m gust peaks at', core.gust[2].none.peak, 22, 2);
  ok(!core.gust[2.5].none.fell, 'a 2.5 N·m gust is safe'); near('a 2.5 N·m gust peaks at', core.gust[2.5].none.peak, 31, 2);
  ok(core.gust[3].none.fell, 'a 3 N·m gust falls if you do nothing');
  ok(!core.gust[3].flail.fell, 'a 3 N·m gust is saved by a flail at 30'); near('that flail peaks at', core.gust[3].flail.peak, 38, 2);
  ok(!core.gust[3].brace.fell, 'a 3 N·m gust is safe when braced'); near('braced at 3 N·m peaks at', core.gust[3].brace.peak, 19, 4);
  ok(core.gust[3.5].none.fell, 'a 3.5 N·m gust falls if you do nothing');
  ok(!core.gust[3.5].brace.fell, 'a 3.5 N·m gust is safe when braced'); near('braced at 3.5 N·m peaks at', core.gust[3.5].brace.peak, 29, 7);
  ok(!core.gust[3.5].flail.fell, 'a 3.5 N·m gust is saved by a flail near 32'); near('that flail peaks at', core.gust[3.5].flail.peak, 43, 3);
  ok(core.gust[4].none.fell && core.gust[4].flail.fell && core.gust[4].brace.fell, 'a 4 N·m gust falls whatever you do');

  // Island physics: a real walker on a tilted disc.
  const island = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, o = {};
    g.save.reset(); g.programme.createProfile(0, 'Guest', 'teal'); g.save.profile.tutorialDone = true;
    T.goto('island', {}); T.advance(0.5); g.speech.clear();
    const ph = g.phys;
    ph.setPosition(0, 15); T.advance(1); o.y = ph.pos.y;
    T.stick(0, 1);
    let far = 0;
    for (let i = 0; i < 16; i++) { T.advance(0.5); far = Math.max(far, Math.hypot(ph.pos.x, ph.pos.z)); }
    T.stick(0, 0); o.far = far;
    const orange = ph.props.find((x) => x.kind === 'orange');
    const at = orange.body.translation(), was = { x: at.x, z: at.z };
    ph.setPosition(at.x + 2, at.z); T.stick(-1, 0); T.advance(0.9); T.stick(0, 0);
    const now = orange.body.translation(); o.pushed = Math.hypot(now.x - was.x, now.z - was.z);
    ph.rest = 11; ph.snapTilt(); ph.setPosition(0, 5); T.advance(1);
    let lo = 99, hi = -99, a = 0;
    for (let t = 0; t < 8; t += 1 / 30) { a += 0.05; T.stick(Math.cos(a), Math.sin(a)); T.advance(1 / 30); lo = Math.min(lo, ph.pos.y); hi = Math.max(hi, ph.pos.y); }
    T.stick(0, 0); o.range = hi - lo; o.tilt = ph.tiltDeg; g.programme.syncIsland();
    o.lost = ph.props.filter((x) => { const q = x.body.translation(); return q.y < -1 || Math.hypot(q.x, q.z) > 23; }).length;
    T.goto('menu');
    return o;
  });
  near('the island walker stands on the disc at', island.y, 0.8, 0.02);
  ok(island.far < 22, 'the fence keeps the walker on the island', island.far.toFixed(1));
  ok(island.pushed > 0.1, 'the walker pushes props about', island.pushed.toFixed(2));
  ok(island.range < 0.004 && island.tilt >= 11, 'the walker stays level on a tilt past 11 degrees', `${island.range.toFixed(5)} at ${island.tilt.toFixed(1)}`);
  ok(island.lost === 0, 'no prop leaves the island', String(island.lost));

  // Section 5: marbles over the programme, and the Check-In.
  const marbles = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, pr = g.programme, by = [];
    g.save.reset(); pr.createProfile(0, 'Guest', 'teal');
    const p = g.save.profile; p.tutorialDone = true;
    for (let d = 1; d <= 5; d++) {
      p.today = { day: d, checkin: true, age: 50, done: [], question: false }; p.day = d;
      pr.addMarbles(1, 'attended');
      for (const id of pr.classesToday()) pr.record(id, 0, 70, 90, true);
      by.push(p.marbles);
    }
    g.save.reset();
    return by;
  });
  ok(marbles.join() === '15,37,59,81,103', 'a full programme pays 15, 37, 59, 81, 103 marbles', marbles.join());
  const checkin = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, o = {};
    for (const skill of ['sharp', 'average', 'clumsy']) {
      g.save.reset(); g.programme.createProfile(0, 'Guest', 'teal');
      const p = g.save.profile; p.tutorialDone = true;
      const sums = {}, counts = {};
      for (const seed of [1, 2, 3, 4]) for (const day of [2, 3]) {
        T.setSeed(seed);
        p.today = { day, checkin: false, age: null, done: [], question: true };
        T.goto('checkin');
        const ev = g.mode.ev; T.bot(skill);
        let t = 0;
        while (!ev.allDone && t < 90) { T.advance(0.5); t += 0.5; }
        T.bot(null);
        for (const k of Object.keys(ev.scores)) { sums[k] = (sums[k] || 0) + ev.scores[k]; counts[k] = (counts[k] || 0) + 1; }
        T.goto('menu');
      }
      const scores = {};
      for (const k of Object.keys(sums)) scores[k] = sums[k] / counts[k];
      const v = Object.values(scores), m = v.reduce((a, b) => a + b, 0) / v.length;
      o[skill] = { scores, age1: g.programme.ageFor(m, 1), age5: g.programme.ageFor(m, 5) };
    }
    g.save.reset();
    return o;
  });
  const TESTS = { standStill: [0.82, 0.74, 0.49], leanMatch: [0.58, 0.45, 0.27], stepTime: [0.81, 0.63, 0.37], quickLean: [0.87, 0.69, 0.44], oneFoot: [0.55, 0.48, 0.4] };
  for (const k of Object.keys(TESTS)) {
    info(k, SK.map((s) => checkin[s].scores[k].toFixed(2)).join(' / '));
    near3(`Check-In ${k}`, SK.map((s) => checkin[s].scores[k]), TESTS[k], 0.15);
  }
  [[56, 32], [66, 42], [86, 62]].forEach(([a, b], i) => {
    near(`Wobble Age day 1 ${SK[i]}`, checkin[SK[i]].age1, a, 8);
    near(`Wobble Age day 5 ${SK[i]}`, checkin[SK[i]].age5, b, 8);
  });
  await fresh();

  // Poses. Sharp and Tiers 2 and 3 follow the plan closely. Tier 1 reads high for clumsy, and in sync for both.
  const POSES = [[95, 66, 54], [74, 58, 46], [55, 41, 33]], SYNC = [[100, 91, 78], [100, 85, 71], [96, 62, 57]];
  const posesBare = [];
  for (const t of [0, 1, 2]) {
    const nb = await skills('poses', t, 'form', { noBreath: true });
    const sy = await skills('poses', t, 'form', { breathAuto: true });
    posesBare.push(nb.values);
    near3(`Poses T${t + 1} without breath`, nb.values, POSES[t], [8, 25, 25]);
    near3(`Poses T${t + 1} in sync`, sy.values, SYNC[t], [8, 25, 25]);
    ok(nb.values[0] >= nb.values[2], `Poses T${t + 1} separates sharp from clumsy`, nb.values.map((v) => v.toFixed(0)).join('/'));
    SK.forEach((k, i) => ok(sy.values[i] >= nb.values[i], `Poses T${t + 1}: breath helps ${k}`, `${sy.values[i].toFixed(0)} vs ${nb.values[i].toFixed(0)}`));
  }
  SK.forEach((k, i) => ok(posesBare[0][i] >= posesBare[1][i] && posesBare[1][i] >= posesBare[2][i], `Poses gets harder by tier for ${k}`, posesBare.map((v) => v[i].toFixed(0)).join('/')));
  const park = await run({ id: 'poses', tier: 0, skill: 'sharp', seed: 1, setup: { parkStick: true, noBreath: true } });
  near('Poses T1 parked stick', park.form, 78, 5);
  await fresh();

  // The Cairn: stones still standing. The clumsy bot on Tier 2 either keeps every stone or loses nearly all, so it needs more seeds.
  const EIGHT = [1, 2, 3, 4, 5, 6, 7, 8];
  let c = await skills('cairn', 0, 'stones', { noBreath: true });
  near3('Cairn T1 without breath', c.values, [6, 6, 6], 0);
  c = await skills('cairn', 0, 'stones', { breathAuto: true }); near3('Cairn T1 in sync', c.values, [6, 6, 6], 0);
  const cairn1 = c;
  c = await skills('cairn', 1, 'stones', { noBreath: true }, EIGHT); // The average bot goes early here, whichever of the plan's gains and delays it uses: swept, and left.
  near3('Cairn T2 without breath', c.values, [5.3, 4.8, 2], [1.5, 3.8, 1.5]);
  const cn = c;
  c = await skills('cairn', 1, 'stones', { breathAuto: true }, EIGHT); near3('Cairn T2 in sync', c.values, [8, 8, 6.3], [0.5, 1, 3]);
  const cairn2 = c;
  SK.forEach((k, i) => ok(cn.values[i] < c.values[i], `Cairn T2: breath saves stones for ${k}`, `${cn.values[i].toFixed(1)} vs ${c.values[i].toFixed(1)}`));
  c = await skills('cairn', 2, 'stones', { breathAuto: true }, EIGHT); near3('Cairn T3 in sync', c.values, [10, 5.8, 1.5], [1, 3.5, 1.5]);
  const cairn3 = c;
  c = await skills('cairn', 2, 'stones', { noBreath: true }, EIGHT); near3('Cairn T3 without breath', c.values, [1.3, 1, 2], 1.5);
  landsWell('Cairn T1', sharpForm(cairn1)); landsWell('Cairn T2', sharpForm(cairn2)); landsWell('Cairn T3', sharpForm(cairn3));
  await fresh();

  // Still Water. Average and clumsy follow the plan. The sharp bot holds on longer than it did on the higher tiers.
  const sw = [];
  for (const t of [0, 1, 2]) sw.push(await skills('stillWater', t, 'share'));
  near3('Still Water T1 time in the zone', sw[0].values, [100, 95, 80], [1, 8, 10]);
  near3('Still Water T2 time in the zone', sw[1].values, [86, 71, 48], [14, 10, 10]);
  near3('Still Water T3 time in the zone', sw[2].values, [62, 49, 31], [18, 12, 12]);
  near3('Still Water T1 peak calm', stat(sw[0], (r) => r.calm), [1, 1, 0.67], [0.05, 0.05, 0.4]);
  near3('Still Water T1 form', stat(sw[0], (r) => r.form), [100, 89, 48], [1, 12, 12]);
  SK.forEach((s, i) => ok(sw[0].values[i] >= sw[1].values[i] && sw[1].values[i] >= sw[2].values[i], `Still Water gets harder by tier for ${s}`, sw.map((x) => x.values[i].toFixed(0)).join('/')));
  await fresh();

  // Log Reps: tighter bands by tier, as the plan decided after measuring.
  const lr = [];
  for (const t of [0, 1, 2]) lr.push(await skills('logReps', t, 'form'));
  near3('Log Reps T1 form', lr[0].values, [97, 77, 50], 10);
  SK.forEach((s, i) => ok(lr[0].values[i] >= lr[1].values[i] && lr[1].values[i] >= lr[2].values[i], `Log Reps' tighter bands bite for ${s}`, lr.map((x) => x.values[i].toFixed(0)).join('/')));
  await fresh();

  // The log is a rule, not a contact: past 6 degrees it creeps, and at .5 m it goes.
  const log = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, STEP = 1 / 120;
    T.startEvent('logReps', 0, {});
    const ev = g.currentEvent, l = ev.lanes[0];
    for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
    T.advance(0.5);
    const was = l.offset;
    T.stick(0.2, 0); T.advance(1);
    const small = Math.abs(l.offset - was);
    T.stick(1, 0);
    let t = 0;
    while (t < 6 && !l.logLost) { T.advance(STEP); t += STEP; }
    T.stick(0, 0);
    const o = { small, t, lost: l.logLost };
    T.goto('menu');
    return o;
  });
  ok(log.small < 0.1, 'Log Reps: a small lean hardly moves the log', log.small.toFixed(3));
  ok(log.lost && log.t < 3, 'Log Reps: a big lean drops the log', log.t.toFixed(2));
  // Keys in balance events move the asking ring, at 1.6 units a second, and it stays where you leave it.
  const ring = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    T.startEvent('poses', 0, {});
    const ev = g.currentEvent;
    for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
    const key = (code, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code }));
    key('KeyC', true); T.advance(0.02); key('KeyC', false); T.advance(0.02);
    const from = g.input.ringX;
    key('KeyD', true); T.advance(0.25); key('KeyD', false); T.advance(0.02);
    const moved = g.input.ringX - from;
    T.advance(1);
    const kept = g.input.ringX - from;
    key('KeyC', true); T.advance(0.02); key('KeyC', false); T.advance(0.02);
    const back = g.input.ringX;
    T.goto('menu');
    return { moved, kept, back };
  });
  near('holding a key moves the ring, in .25 s', ring.moved, 0.4, 0.04);
  ok(Math.abs(ring.kept - ring.moved) < 0.001, 'the ring stays where you leave it', ring.kept.toFixed(3));
  ok(ring.back === 0, 'C recentres the ring', String(ring.back));
  await fresh();

  // Plank & Perch: these bots still hold the zone a little better than the plan's.
  const pk = [];
  for (const t of [0, 1, 2]) pk.push(await skills('plank', t, 'share'));
  near3('Plank T1 time in the zone', pk[0].values, [80, 62, 53], 12);
  near3('Plank T2 time in the zone', pk[1].values, [62, 51, 53], 20);
  near3('Plank T3 time in the zone', pk[2].values, [54, 48, 50], 16);
  ok(pk.every((x) => x.values[0] > x.values[2]), 'Plank separates sharp from clumsy on every tier', pk.map((x) => `${x.values[0].toFixed(0)}/${x.values[2].toFixed(0)}`).join(' '));
  pk.forEach((x, t) => { landsWell(`Plank T${t + 1}`, sharpForm(x)); ok(Math.max(...x.rows.flat().map((r) => r.flops)) <= 3, `Plank T${t + 1}: a few falls at most`, String(Math.max(...x.rows.flat().map((r) => r.flops)))); });
  await fresh();

  // Tug of Peace: how far you lean is the game.
  const TS = [1, 2, 3, 4, 5, 6];
  const won = (r) => r.won;
  let tg = await skills('tug', 0, won, { tugStick: 0.9 }, TS);
  near3('Tug T1 at .9: everyone wins', tg.values, [100, 100, 100], 0);
  ok(stat(tg, (r) => r.t).every((t) => t >= 22 && t <= 50), 'Tug T1 takes 25 to 48 s', stat(tg, (r) => r.t).map((t) => t.toFixed(0)).join('/'));
  await fresh();
  tg = await skills('tug', 1, won, { tugStick: 0.85 }, TS);
  near3('Tug T2 at .85 wins', tg.values, [100, 88, 0], [0, 15, 0]);
  ok(Math.max(...stat(tg, (r) => r.falls)) <= 1, 'Tug T2 at .85 is safe', stat(tg, (r) => r.falls).map((f) => f.toFixed(1)).join('/'));
  tg = await skills('tug', 1, won, { tugStick: 1 }, TS);
  ok(tg.values[0] === 100, 'Tug T2: full stick also wins for the sharp bot', tg.values[0].toFixed(0));
  near('Tug T2: full stick falls, sharp', stat(tg, (r) => r.falls)[0], 3.5, 2);
  await fresh();
  tg = await skills('tug', 2, won, { tugStick: 0.85 }, TS);
  near3('Tug T3 at .85: only the sharp bot wins', tg.values, [100, 0, 0], 0);
  tg = await skills('tug', 2, won, { tugStick: 0.95 }, TS);
  near3('Tug T3 at .95 wins', tg.values, [100, 88, 0], [0, 15, 0]);
  await fresh();
  tg = await skills('tug', 2, won, { tugStick: 1 }, TS);
  ok(tg.values[0] === 100 && tg.values[1] <= 40 && tg.values[2] === 0, 'Tug T3: at full stick it is the sharp bot that still wins', tg.values.map((v) => v.toFixed(0)).join('/'));
  near('Tug T3: full stick falls, sharp', stat(tg, (r) => r.falls)[0], 6.5, 3);
  await fresh();

  // Step Class.
  const STEPS = [[97, 84, 62, 106, 101.5], [97, 85, 64, 108, 91], [97, 84, 63, 126, 85.2]];
  for (const t of [0, 1, 2]) {
    const s = await skills('stepClass', t, 'form');
    near3(`Step Class T${t + 1} form`, s.values, STEPS[t].slice(0, 3), 5);
    const r = s.rows[0][0];
    ok(r.notes === STEPS[t][3], `Step Class T${t + 1} has ${STEPS[t][3]} notes`, String(r.notes));
    near(`Step Class T${t + 1} length`, r.len, STEPS[t][4], 1);
    ok(s.rows.flat().every((x) => x.falls === 0), `Step Class T${t + 1}: no falls`);
  }
  const { chartNotes } = await import('../src/data/charts.js');
  const session = chartNotes('session', 116);
  ok(session.notes.filter((n) => !n.lean).length === 54 && session.notes.filter((n) => n.lean).length === 10, 'Step Class session: 54 foot and 10 lean notes', `${session.notes.filter((n) => !n.lean).length}, ${session.notes.filter((n) => n.lean).length}`);
  near('Step Class session length', session.length, 49.7, 0.5);
  const inSession = (skill, seed) => page.evaluate(({ skill, seed }) => {
    const T = window.__TEST__;
    T.setSeed(seed); T.startEvent('stepClass', 0, { config: T.EVENTS.stepClass.sessionConfig });
    const ev = T.game.currentEvent, l = ev.lanes[0];
    T.bot(skill);
    let t = 0;
    while (t < 70 && !ev.isDone()) { T.advance(0.5); t += 0.5; }
    T.bot(null);
    const o = { form: ev.laneResult(l).form, t: ev.t };
    T.goto('menu');
    return o;
  }, { skill, seed });
  const sess = [];
  for (const skill of SK) { const v = []; for (const seed of SEEDS) v.push(await inSession(skill, seed)); sess.push(v); }
  near3('Step Class session form', sess.map((v) => mean(v.map((x) => x.form))), [98, 88, 69], 6);
  ok(sess.flat().every((x) => x.t <= 50.5), 'Step Class session fits its 50 s slot', Math.max(...sess.flat().map((x) => x.t)).toFixed(1));
  await fresh();

  // Plate Spinners.
  const PL = [[100, 89, 82], [89, 86, 74], [79, 76, 66]];
  for (const t of [0, 1, 2]) {
    const s = await skills('plates', t, 'share');
    near3(`Plates T${t + 1} share alive`, s.values, PL[t], t === 2 ? 10 : 5);
    if (t === 0) {
      near3('Plates T1 crashes a minute', stat(s, (r) => r.crashes), [0, 3.5, 6], 1.5);
      near3('Plates T1 form', stat(s, (r) => r.form), [100, 78, 64], 5);
    }
  }
  const keyed = (tier, jitter, slips, full, alarm, react, seed) => page.evaluate(({ tier, jitter, slips, full, alarm, react, seed }) => {
    const T = window.__TEST__;
    T.setSeed(seed); T.startEvent('plates', tier, {});
    const ev = T.game.currentEvent, l = ev.lanes[0];
    const tap = (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k })); };
    const R = { L: 1.35, M: 2.3, S: 3.2 };
    let next = 0.1, side = 'KeyA', t = 0, target = null, wait = 0, x = 12345 + seed * 77;
    const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; return x / 0x7fffffff; };
    while (!ev.isDone() && t < 70) {
      wait -= 1 / 120;
      if (wait <= 0) {
        wait = react;
        const low = l.plates.filter((p) => p.state === 'on').sort((a, b) => a.energy - b.energy)[0];
        const was = target;
        if (!target || target.state !== 'on' || target.energy > full || (low && low.energy < alarm)) target = low;
        // A new plate changes your rhythm at once: nobody finishes the old beat first.
        if (target && target !== was) next = Math.min(next, 1 / R[target.size]);
      }
      next -= 1 / 120;
      if (next <= 0) { tap(side); side = side === 'KeyA' ? 'KeyD' : 'KeyA'; next = (1 / R[target ? target.size : 'M']) * (1 + (rnd() - 0.5) * jitter) + (rnd() < slips ? 0.5 : 0); }
      T.advance(1 / 120); t += 1 / 120;
    }
    const share = 100 * ev.laneResult(l).raw;
    T.goto('menu');
    return share;
  }, { tier, jitter, slips, full, alarm, react, seed });
  const KEYS = [[97, 84, 76], [91, 79, 74], [79, 66, 60]];
  // The plan's three tapping speeds hit its three bands.
  for (const [tap, lo, hi] of [[1.35, 3.5, 5], [2.3, 6.5, 8], [3.2, 9.5, 11]]) {
    const w = await page.evaluate((rate) => {
      const T = window.__TEST__;
      T.startEvent('plates', 0, {});
      const ev = T.game.currentEvent, l = ev.lanes[0];
      for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
      const press = (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k })); };
      let next = 0, side = 'KeyA', a = 99, b = 0;
      for (let t = 0; t < 8; t += 1 / 120) {
        next -= 1 / 120;
        if (next <= 0) { press(side); side = side === 'KeyA' ? 'KeyD' : 'KeyA'; next = 1 / rate; }
        T.advance(1 / 120);
        if (t > 4) { a = Math.min(a, l.hoop); b = Math.max(b, l.hoop); }
      }
      T.goto('menu');
      return { a, b };
    }, tap);
    ok(w.a >= lo && w.b <= hi, `Plates: tapping ${tap} a second holds the ${lo} to ${hi} band`, `${w.a.toFixed(2)} to ${w.b.toFixed(2)}`);
  }
  // Tapping alone, the sharp hand stays under the plan's on the first two tiers and by about 14 on the third.
  const HANDS = [[0.06, 0.005, 0.6, 0.3, 0.25], [0.2, 0.02, 0.85, 0.3, 0.53], [0.4, 0.05, 0.95, 0.15, 0.75]];
  for (const t of [0, 1, 2]) {
    const row = [];
    for (const h of HANDS) { const v = []; for (const seed of SEEDS) v.push(await keyed(t, ...h, seed)); row.push(mean(v)); }
    info('plates keys', `T${t + 1}`, row.map((v) => v.toFixed(0)).join(' / '));
    near3(`Plates T${t + 1} on keys`, row, KEYS[t], 13);
  }
  await fresh();

  // Island Loop, on a walker that really stands on the road now.
  const loop = [];
  for (const t of [0, 1, 2]) loop.push(await skills('islandLoop', t, 'share'));
  near3('Island Loop T1 time in the band', loop[0].values, [99, 97, 57], 6);
  ok(stat(loop[0], (r) => r.time).every((x) => x >= 67 && x <= 76), 'Island Loop T1 takes 69 to 74 s', stat(loop[0], (r) => r.time).map((x) => x.toFixed(0)).join('/'));
  ok(Math.max(...loop[0].rows.flat().map((r) => r.off)) <= 0.4, 'Island Loop stays within .4 m of the road', Math.max(...loop[0].rows.flat().map((r) => r.off)).toFixed(2));
  loop.forEach((x, t) => landsWell(`Island Loop T${t + 1}`, sharpForm(x)));
  await fresh();

  // Fruit Hat.
  const hat = async (skill, bankAt) => { const rs = []; for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) rs.push(await run({ id: 'fruitHat', tier: 0, skill, seed, setup: { bankAt } })); return { banked: mean(rs.map((r) => r.banked)), raw: mean(rs.map((r) => r.raw)), falls: mean(rs.map((r) => r.falls)) }; };
  const h7 = await hat('sharp', 7), hn = await hat('sharp', 999), h5 = await hat('clumsy', 5);
  info('fruit', JSON.stringify({ h7, hn, h5 }));
  near('Fruit Hat: sharp banking at 7, fruit banked', h7.banked, 28, 5); near('Fruit Hat: sharp banking at 7, raw', h7.raw, 47.8, 8);
  // The plan measured no falls here, on fruit alone. With boots and pineapples in the mix this bot falls about once in eight runs.
  ok(h7.falls <= 0.2, 'Fruit Hat: sharp banking at 7 hardly ever falls', h7.falls.toFixed(2));
  near('Fruit Hat: sharp never banking, falls a minute', hn.falls, 2, 0.6);
  near('Fruit Hat: clumsy banking at 5, fruit banked', h5.banked, 27.5, 5); near('Fruit Hat: clumsy banking at 5, raw', h5.raw, 43.5, 8);
  ok(h5.falls <= 0.2, 'Fruit Hat: clumsy banking at 5 hardly ever falls', h5.falls.toFixed(2));
  for (const t of [0, 1, 2]) { const s = await skills('fruitHat', t, 'form'); landsWell(`Fruit Hat T${t + 1}`, s.values[0]); }
  await fresh();

  // Room Service. The plan's glass counts: Gary aside, braced on the telegraph. Then the pars, as the game really plays.
  const RB = [[5, 5, 5], [3.8, 4, 4.5], [2, 4, 3.5]], RN = [[3.5, 2.5, 4], [0, 0, 0], [0, 0, 0]], TIME = [24, 35, 47], FOUR = [1, 2, 3, 4];
  for (const t of [0, 1, 2]) {
    const b = await skills('roomService', t, 'glasses', { braceK: 0.2, braceEarly: true }, FOUR, { gary: false });
    near3(`Room Service T${t + 1} with a brace, glasses`, b.values, RB[t], t === 0 ? 0 : t === 1 ? 1.5 : 2);
    const n = await skills('roomService', t, 'glasses', { braceK: 0 }, FOUR, { gary: false });
    near3(`Room Service T${t + 1} without a brace, glasses`, n.values, RN[t], t === 0 ? 1.5 : 1);
    const g = await skills('roomService', t, 'glasses', { braceK: 0.2 });
    SK.forEach((k, i) => near(`Room Service T${t + 1} takes, ${k}`, stat(g, (r) => r.doneT)[i], TIME[t], 2));
    ok([...b.rows, ...g.rows].flat().every((x) => x.falls === 0), `Room Service T${t + 1}: nobody falls at these gusts`);
    landsWell(`Room Service T${t + 1}`, sharpForm(g));
  }
  await fresh();

  // Springboard: launch, air, spin, then the rates. The board's own figures are in the balance group.
  const air = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, STEP = 1 / 120, o = {};
    const go = (tier, v) => {
      T.bot(null); T.stick(0, 0);
      T.startEvent('springboard', tier, {});
      const ev = g.currentEvent, l = ev.lanes[0];
      for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
      T.advance(1); l.boardV = v; ev.launch(l);
      return l;
    };
    for (const [k, tier, v] of [['a', 0, 4], ['b', 0, 7], ['c', 2, 7]]) { const l = go(tier, v); let t = 0; while (l.phase2 === 'air' && t < 5) { T.advance(STEP); t += STEP; } o[k] = t; }
    const l = go(2, 7);
    T.stick(1, 0); T.advance(1 / 9); o.rise = Math.abs(l.spin) / 3.4; T.advance(0.8); o.spin = Math.abs(l.spin);
    T.press(0); T.advance(0.6); o.tuck = Math.abs(l.spin); T.press(0, false); T.advance(0.3);
    const a = l.angle; T.stick(0, 0); T.advance(0.6); o.coast = Math.abs(l.angle - a) * 57.3;
    T.goto('menu');
    return o;
  });
  near('Springboard air time, 5 m at 4 m/s', air.a, 1.5, 0.1); near('Springboard air time, 5 m at 7 m/s', air.b, 2, 0.1); near('Springboard air time, 9 m at 7 m/s', air.c, 2.3, 0.1);
  near('Springboard spin at full stick', air.spin, 3.4, 0.05); near('Springboard spin reached at 9 /s', air.rise, 0.63, 0.05);
  near('Springboard tuck spin', air.tuck, 6.12, 0.1); near('Springboard coast after letting go', air.coast, 22, 3);
  const KS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const rate = (o, k) => o.rows.map((rs) => 100 * mean(rs.flatMap((r) => r.dives).map((d) => (d.k === k ? 1 : 0))));
  const sb = await skills('springboard', 0, 'form', null, KS);
  near3('Springboard launch speed', sb.rows.map((rs) => mean(rs.flatMap((r) => r.launches))), [5.4, 3.8, 3], 0.4);
  near3('Springboard height from 5 m', sb.rows.map((rs) => mean(rs.flatMap((r) => r.dives).map((d) => d.h))), [6.5, 5.7, 5.5], 0.3);
  landsWell('Springboard T1', sb.values[0]);
  for (const t of [1, 2]) { const s = await skills('springboard', t, 'form'); landsWell(`Springboard T${t + 1}`, s.values[0]); }
  // The plan's stop errors give these bots somewhat better hit rates than it measured. The checks hold what the event teaches.
  const half = await skills('springboard', 0, 'form', { spinAt: 0.5, tryDive: false }, KS), full = await skills('springboard', 0, 'form', { spinAt: 1, tryDive: false }, KS);
  const hr = rate(half, 'Splash'), fr = rate(full, 'Splash');
  info('flops', 'half', hr.map((x) => x.toFixed(0)).join('/'), 'full', fr.map((x) => x.toFixed(0)).join('/'));
  SK.forEach((s, i) => ok(hr[i] > fr[i], `Springboard: slow spins are safer for ${s}`, `${hr[i].toFixed(0)} vs ${fr[i].toFixed(0)}`));
  ok(hr[0] > hr[1] && hr[1] > hr[2], 'Springboard: flop hit rate separates the bots', hr.map((x) => x.toFixed(0)).join('/'));
  // The plan's whole-run rates. Clumsy reads high at both speeds: a wider stop error drops its form below the Adequate the plan also asks of it.
  near3('Springboard half stick flop hit rate', hr, [85, 68, 45], [10, 10, 25]);
  near3('Springboard full stick flop hit rate', fr, [43, 35, 13], [14, 10, 22]);
  const low = await skills('springboard', 0, 'form', { spinAt: 0.5, tryDive: true });
  const lr5 = rate(low, 'Grace');
  ok(lr5[1] === 0 && lr5[2] === 0 && lr5[0] <= 35, 'Springboard: half stick is too slow for head first from 5 m', lr5.map((x) => x.toFixed(0)).join('/'));
  const tall = await skills('springboard', 2, 'form', { spinAt: 0.5, tryDive: true }, KS);
  const tr = rate(tall, 'Grace');
  ok(tr[0] > tr[1] && tr[1] >= tr[2] && tr[0] > 20, 'Springboard: from 9 m half stick does get head first, for the sharp bot', tr.map((x) => x.toFixed(0)).join('/'));
  await fresh();

  // Tippy Raft: one sharp, two average, one clumsy.
  const rounds = [], wins = { sharp: 0, average: 0, clumsy: 0 };
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const r = await run({ id: 'raft', tier: 0, skill: 'average', seed });
    rounds.push(...r.rounds);
    for (const w of r.winsBy) wins[w.skill] += w.w;
  }
  const total = wins.sharp + wins.average + wins.clumsy, per16 = (x) => (16 * x) / Math.max(1, total);
  info('raft', rounds.length, Math.min(...rounds).toFixed(0), Math.max(...rounds).toFixed(0), mean(rounds).toFixed(0), JSON.stringify(wins));
  near('Tippy Raft mean round, in seconds', mean(rounds), 29, 8);
  ok(Math.min(...rounds) >= 5 && Math.max(...rounds) <= 70, 'Tippy Raft rounds last 10 to about 55 s', `${Math.min(...rounds).toFixed(0)} to ${Math.max(...rounds).toFixed(0)}`);
  near('Tippy Raft wins per 16, sharp', per16(wins.sharp), 6, 3); near('Tippy Raft wins per 16, the two average', per16(wins.average), 8, 3); near('Tippy Raft wins per 16, clumsy', per16(wins.clumsy), 2, 2.5);
  await fresh();

  // Two dolls standing on the same spot still shove each other, and the round still ends.
  const stalemate = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    T.setSeed(1); T.startEvent('raft', 0, {});
    const ev = g.currentEvent;
    for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
    const [a, b] = ev.lanes;
    ev.lanes.slice(2).forEach((l) => { l.out = true; });
    a.px = 0; a.pz = 0; b.px = 0; b.pz = 0; a.vx = 0; a.vz = 0; b.vx = 0; b.vz = 0; a.cool = 0;
    a.input.flail = true; ev.stepLane(a, 1 / 120); a.input.flail = false;
    const pushed = Math.hypot(b.vx, b.vz);
    const round = ev.round;
    ev.roundT = 89.9; T.advance(0.3);
    const o = { pushed, ended: ev.round !== round || ev.stage !== 'play' };
    T.goto('menu');
    return o;
  });
  near('Tippy Raft: a point blank shove', stalemate.pushed, 6, 0.1);
  ok(stalemate.ended, 'Tippy Raft: a round left standing ends at 90 s');
  await fresh();

  // The Grand Hold.
  const gh = await skills('grandHold', 0, 'last');
  ok(gh.rows.flat().every((r) => r.restarts === 0), 'The Grand Hold: no bot needs a restart');
  SK.forEach((s, i) => near(`The Grand Hold takes, ${s}`, stat(gh, (r) => r.t)[i], 95, 1));
  // The clumsy bot holds the last ring better than the plan's at every gain tried.
  near3('The Grand Hold: time in the last ring', gh.values, [99, 70, 37], [4, 27, 45]);
  await fresh();

  // Section 9, the art bible's measured recipes. The palette table is read straight out of PLAN.md.
  const plan = readFileSync(join(root, 'PLAN.md'), 'utf8');
  const src = (f) => readFileSync(join(dev, 'src', f), 'utf8');
  const { PALETTES } = await import('../src/data/palettes.js');
  const hex = (n) => n.toString(16).toUpperCase().padStart(6, '0');
  let rows = 0;
  for (const m of plan.matchAll(/^\| (dawn|noon|golden|dusk) ✔ \| (\w+) \| (\w+) \| (\w+) \| (\w+) \| (\w+) \| (\w+), ([\d.]+) \| (\w+), (\w+), ([\d.]+) \|$/gm)) {
    rows++;
    const p = PALETTES[m[1]];
    const got = [hex(p.skyTop), hex(p.skyMid), hex(p.skyLow), hex(p.sea), hex(p.seaHi), hex(p.sun), String(p.sunPower), hex(p.hemiSky), hex(p.hemiGround), String(p.hemiPower)];
    const want = [m[2], m[3], m[4], m[5], m[6], m[7], String(+m[8]), m[9], m[10], String(+m[11])];
    ok(got.join() === want.join(), `palette ${m[1]} is the plan's`, `${got.join()} vs ${want.join()}`);
  }
  ok(rows === 4, 'all four palette rows were read from the plan', String(rows));
  const has = (f, re, label) => ok(re.test(src(f)), label, f);
  has('art/materials.js', /new Uint8Array\(\[96, 178, 255\]\)/, 'the toon ramp is 96, 178, 255');
  has('art/materials.js', /minFilter = THREE\.NearestFilter/, 'the toon ramp is not filtered');
  has('art/materials.js', /colorSpace = THREE\.NoColorSpace/, 'the toon ramp has no colour space');
  has('game/director.js', /toneMapping = THREE\.NoToneMapping/, 'no tone mapping');
  has('game/director.js', /shadowMap\.type = THREE\.PCFShadowMap/, 'PCF shadows');
  has('game/director.js', /mapSize\.set\(2048, 2048\)/, 'a 2048 shadow map');
  has('game/director.js', /shadow\.bias = -0\.0006; this\.sun\.shadow\.normalBias = 0\.035/, 'the shadow bias values');
  has('render/ink.js', /hull: uniform\(0\.0028\), width: uniform\(1\.4\), boil: uniform\(0\.5\), fadeNear: uniform\(30\), fadeFar: uniform\(90\)/, 'the ink defaults');
  has('render/ink.js', /grain: uniform\(0\.02\)/, 'the ink grain');
  has('render/sea.js', /step\(0\.86, wave\)/, 'the sea bands');
  has('render/sea.js', /smoothstep\(60, 260, camD\)/, 'the sea fades to the sky from 60 to 260');
  has('render/sky.js', /smoothstep\(0, 0\.14, dir\.y\)/, 'the sky low band');
  has('render/sky.js', /smoothstep\(0\.1, 0\.5, dir\.y\)/, 'the sky high band');
  has('render/sky.js', /SphereGeometry\(600,/, 'the sky is radius 600');
  has('art/props.js', /\[\[0\.01, 0\], \[1, 0\.02\], \[1\.08, 0\.12\], \[1\.08, 1\.9\], \[0\.86, 2\.2\], \[0\.86, 2\.45\], \[0\.95, 2\.5\]\]/, 'the jar profile');
  has('core/loop.js', /Math\.min\(real, 0\.25\)/, 'the loop caps a frame at .25 s');
  has('core/loop.js', /n < 30/, 'the loop runs up to 30 steps a frame');

  // Section 10: a ragdoll has ten bodies of the plan's sizes.
  const rag = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    T.startEvent('poses', 0, {});
    const ev = g.currentEvent, l = ev.lanes[0];
    for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
    ev.forceFall(0);
    const r = l.ragdoll || l.doll.ragdoll;
    const out = r ? Object.keys(r.bodies).map((k) => { const b = r.bodies[k], c = b.collider(0); return { k, hh: c.halfHeight(), r: c.radius(), m: c.mass(), ld: b.linearDamping(), ad: b.angularDamping(), f: c.friction(), e: c.restitution() }; }) : null;
    T.goto('menu');
    return out;
  });
  ok(rag && rag.length === 10, 'a fall makes a ragdoll of ten bodies', String(rag && rag.length));
  if (rag) {
    const SIZES = { hips: [0.2, 0.22, 0.45], head: [0.02, 0.2, 0.15], shoulderL: [0.1, 0.07, 0.05], elbowL: [0.1, 0.07, 0.04], hipL: [0.13, 0.09, 0.08], kneeL: [0.13, 0.08, 0.06] };
    for (const [k, [hh, r, m]] of Object.entries(SIZES)) {
      const b = rag.find((x) => x.k === k);
      ok(b && Math.abs(b.hh - hh) < 1e-3 && Math.abs(b.r - r) < 1e-3 && Math.abs(b.m - m) < 1e-3, `ragdoll ${k} has the plan's size`, JSON.stringify(b));
    }
    ok(rag.every((b) => Math.abs(b.ld - 0.05) < 1e-3 && Math.abs(b.ad - 0.6) < 1e-3 && Math.abs(b.f - 0.7) < 1e-3 && Math.abs(b.e - 0.15) < 1e-3), 'ragdoll damping, friction and bounce are the plan\'s');
  }
  await fresh();

  // Section 11: the title motif as written, every note at its pitch, the level, and the click over the music.
  const { TRACKS } = await import('../src/audio/tracks.js');
  const written = [...plan.slice(plan.indexOf('**Title theme motif**'), plan.indexOf('**Out-of-tune island.**')).matchAll(/^Bar \d .*$/gm)].map((m) => [...m[0].matchAll(/\[(\d+),(\d+),(\d+)\]/g)].map((n) => [+n[1], +n[2], +n[3]]));
  ok(written.length === 4 && written.flat().length === 21, 'the plan\'s motif was read: 4 bars, 21 notes', String(written.flat().length));
  const part = Object.values(TRACKS).flatMap((t) => t.parts).filter((p) => p.melody).find((p) => JSON.stringify(p.melody.slice(0, 4)) === JSON.stringify(written));
  ok(!!part, 'the title motif is in the score exactly as written');
  const pitches = await page.evaluate(async (notes) => {
    const T = window.__TEST__, out = [];
    for (const midi of notes) {
      const r = await T.renderProbe('note', ['epiano', midi], 0.6);
      const d = r.samples, from = Math.round(0.08 * r.rate), n = 3000;
      let best = 0, lag = 0;
      for (let k = 18; k < 400; k++) { let c = 0; for (let i = 0; i < n; i++) c += d[from + i] * d[from + i + k]; if (c > best * 1.02) { best = c; lag = k; } }
      out.push(69 + 12 * Math.log2((r.rate / lag) / 440));
    }
    return out;
  }, written.flat().map((n) => n[1]));
  const notes = written.flat().map((n) => n[1]);
  const offKey = pitches.filter((p, i) => { const d = Math.abs(((p - notes[i]) % 12 + 18) % 12 - 6); return d > 0.5; }).length;
  info('motif', pitches.map((p) => p.toFixed(1)).join(' '));
  ok(offKey === 0, 'all 21 motif notes come out at the written pitch class', `${offKey} off`);
  const level = await page.evaluate(async () => {
    const T = window.__TEST__;
    const full = await T.renderProbe('track', 'levelBest', 8, [100, 100, 100]);
    const low = await T.renderProbe('track', 'cardio', 6, [10, 80, 80]);
    const click = await T.renderProbe('sfx', 'foot', 1, [10, 80, 80]);
    return { full: full.peak, low: low.peak, lowRms: low.rms, click: click.peak };
  });
  const dB = (x) => 20 * Math.log10(x);
  info('levels', 'peak', dB(level.full).toFixed(1), 'click over peak', dB(level.click / level.low).toFixed(1), 'click over rms', dB(level.click / level.lowRms).toFixed(1));
  near('with the backing, the peak in dB', dB(level.full), -2.1, 5);
  ok(level.full <= 1, 'nothing clips', level.full.toFixed(3));
  ok(dB(level.click / level.low) >= 7, 'a foot click stands at least 7 dB over the music\'s peak', dB(level.click / level.low).toFixed(1));
  near('a foot click over the music, in dB', dB(level.click / level.lowRms), 17.6, 8);
  await page.context().close();
  await rules({ ok, logicPage, browser });
  await fitted({ ok, info, browser });
  await browser.close();
}
