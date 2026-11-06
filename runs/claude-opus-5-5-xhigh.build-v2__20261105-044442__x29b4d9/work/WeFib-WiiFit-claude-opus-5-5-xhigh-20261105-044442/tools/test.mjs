// One command: node tools/test.mjs [group ...]. Prints only failures and a one-line count.
import { launch, logicPage, FILE_URL, RENDER, PAD_STUB, OUT, root, dev, waitForRoom, isMemoryCrash, availableGB } from './lib.mjs';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createServer } from 'node:http';
import { chromium, webkit, devices } from 'playwright';

const ALL = ['unit', 'flow', 'events', 'balance', 'plan', 'input', 'audio', 'hub', 'ui'];
let groups = process.argv.slice(2);
if (!groups.length || groups.includes('full')) groups = ALL;
let passed = 0, failed = 0;
const quietInfo = process.env.INFO === '1';
function ok(cond, name, detail = '') {
  if (cond) passed++;
  else { failed++; console.log(`FAIL ${name}${detail ? `: ${detail}` : ''}`); }
  return cond;
}
const info = (...a) => { if (quietInfo) console.log(...a); };
const sources = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? sources(p) : [p]; });

const mods = {};
mods.unit = async () => {
  const { DAYS, wobbleAge, marblesFor, restTilt, TESTS } = await import('../src/data/programme.js');
  ok(wobbleAge(0, 0) === 99 && wobbleAge(1, 0) === 18 && wobbleAge(0.5, 24) >= 18 && wobbleAge(0.5, 24) <= 99, 'wobble age bounds');
  ok(wobbleAge(0.6, 24) > wobbleAge(0.6, 0), 'handicap raises age');
  ok(marblesFor(1, 3, true) === 2 + 3 + 2, 'marble payout');
  ok(marblesFor(0.1, 0, false) === 2, 'marble minimum');
  ok(restTilt(14, 14) === 0 && restTilt(0, 14) === 9, 'rest tilt ends at exactly zero');
  const { EVENTS } = await import('../src/data/events.js');
  const { CHARTS, chartNotes } = await import('../src/data/charts.js');
  for (const d of DAYS) for (const c of d.classes) ok(!!EVENTS[c], `programme class exists: ${c}`);
  for (const d of DAYS) if (Array.isArray(d.tests)) for (const t of d.tests) ok(!!TESTS[t], `test exists: ${t}`);
  for (const k of Object.keys(CHARTS)) { ok(CHARTS[k].every((b) => /^[LRB<>^v.]{8}$/.test(b)), `chart ${k} valid`); ok(CHARTS[k].length > 0, `chart ${k} has bars`); }
  ok(CHARTS.tier1.length === 44 && CHARTS.tier2.length === 44 && CHARTS.tier3.length === 44 && CHARTS.session.length === 24, 'chart lengths');
  ok(Math.abs(chartNotes('session', 116).length - 49.66) < 0.1, 'session chart fits its 50 s slot');
  const { TUNING } = await import('../src/data/tuning.js');
  for (const k of Object.keys(TUNING)) { const t = TUNING[k]; ok(t.default >= t.min && t.default <= t.max, `tuning default in range: ${k}`); }
  // Source greps.
  const all = sources(join(dev, 'src')).filter((f) => /\.(js|css)$/.test(f));
  const read = (f) => readFileSync(f, 'utf8');
  const rel = (f) => relative(dev, f);
  for (const f of all) {
    const s = read(f);
    if (!f.endsWith('core/rng.js')) ok(!/Math\.random/.test(s), `no Math.random: ${rel(f)}`);
    ok(!/\b(TODO|FIXME)\b|placeholder|\bstub\b/i.test(s), `no TODO/placeholder/stub: ${rel(f)}`);
    ok(!/\balert\(|\bconfirm\(|\bprompt\(|window\.open|WebSocket|RTCPeerConnection/.test(s), `no dialogs or sockets: ${rel(f)}`);
    ok(!/\.(mp3|ogg|wav|m4a|flac)\b|decodeAudioData/.test(s), `no audio files: ${rel(f)}`);
    if (!f.endsWith('data/about.js') && !f.endsWith('data/config.js') && !f.endsWith('tools/build.mjs')) ok(!/wii|mii\b|balance board/i.test(s), `no source names: ${rel(f)}`);
    ok(!/\bcompute\(|ComputeNode|\.compute\b/.test(s), `no compute: ${rel(f)}`);
    ok(!/setTimeout/.test(s), `no setTimeout: ${rel(f)}`);
  }
  // Dialogue: every id used in code exists; counts.
  const { LINES, countLines } = await import('../src/data/dialogue.js').catch(() => ({ LINES: null }));
  if (LINES) {
    ok(countLines('trudy') >= 200, 'Trudy has 200 lines', String(countLines('trudy')));
    ok(countLines('stillwater') >= 60, 'Ms. Stillwater has 60 lines');
    ok(countLines('bolster') >= 60, 'Coach Bolster has 60 lines');
    const guests = ['margaret', 'kevin', 'sandras', 'paul', 'gerald'].reduce((a, g) => a + countLines(g), 0);
    ok(guests >= 60, 'guests have 60 lines', String(guests));
    const re = /\b(?:line|bark|say)\(\s*'(trudy|stillwater|bolster)'\s*,\s*'([a-z_0-9]+)'/g;
    for (const f of all) {
      const s = read(f);
      let m;
      while ((m = re.exec(s))) ok(!!LINES[m[1]][m[2]], `dialogue id exists: ${m[1]}.${m[2]} in ${rel(f)}`);
    }
    for (const who of Object.keys(LINES)) for (const sit of Object.keys(LINES[who])) ok(new Set(LINES[who][sit]).size === LINES[who][sit].length, `no repeated lines: ${who}.${sit}`);
  }
  // A wrong name fails silently at run time, so every sound, track, sting and clip the code names must exist.
  const { SFX } = await import('../src/audio/sfx.js');
  const { TRACKS, STINGS } = await import('../src/audio/tracks.js');
  const { MEDALS } = await import('../src/data/config.js');
  const clipsSrc = read(join(dev, 'src/anim/clips.js'));
  const clipNames = new Set([...clipsSrc.matchAll(/\b(?:c|pose|stride|tc|hc|wc|gc|add\(c|add\(pose|add\(stride)\('(\w+)'/g)].map((m) => m[1]));
  const named = (re, table, what) => { for (const f of all) { for (const m of read(f).matchAll(re)) ok(table.has(m[1]), `${what} exists: ${m[1]} in ${rel(f)}`); } };
  named(/\.(?:sfx|playSfx)\('(\w+)'/g, new Set(Object.keys(SFX)), 'sound');
  named(/\.music\('(\w+)'/g, new Set(Object.keys(TRACKS)), 'track');
  named(/\.sting\('(\w+)'/g, new Set(Object.keys(STINGS)), 'sting');
  named(/\.(?:once|loop|scrub)\('(\w+)'/g, clipNames, 'clip');
  for (const id of Object.keys(EVENTS)) ok(!!TRACKS[EVENTS[id].music], `${id} has a real music track`);
  for (const m of MEDALS) ok(!!STINGS[m.id], `medal ${m.id} has a sting`);
  // Save: corrupt and old versions are handled.
  const { Save } = await import('../src/core/save.js');
  const mem = (val) => ({ getItem: () => val, setItem() {} });
  ok(new Save(mem('{not json')).data.version === 1, 'corrupt save falls back');
  ok(new Save(mem(JSON.stringify({ version: 0, profiles: [] }))).data.profiles.length === 4, 'old save falls back');
  ok(new Save({ getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } }).memoryOnly === true, 'unavailable storage falls back to memory');
  // RNG repeatable.
  const { mulberry32 } = await import('../src/core/rng.js');
  const a = mulberry32(5), b = mulberry32(5);
  ok(a() === b() && a() === b(), 'rng repeatable');
  // Built HTML.
  ok(existsSync(OUT), 'built file exists');
  const html = readFileSync(OUT, 'utf8');
  ok(/^<!doctype html><html lang="en"><head><meta charset="utf-8"><script>\/\*! aihub-session /.test(html), 'client directly after meta charset');
  const session = readFileSync(join(dev, 'vendor/session.js'), 'utf8').replace(/\r\n/g, '\n');
  const { createHash } = await import('node:crypto');
  const END = "})(typeof window !== 'undefined' ? window : globalThis);";
  const h1 = createHash('sha256').update(session.slice(session.indexOf('/*! aihub-session '), session.indexOf(END) + END.length)).digest('hex');
  ok(h1 === '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a', 'session client hash');
  for (const n of ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-minutes', 'hub:session-goal', 'hub:session-howto', 'hub:type', 'hub:players', 'hub:source']) ok(new RegExp(`<meta name="${n}" content="`).test(html), `meta ${n} in name, content order`);
  const scripts = html.split('<script>').slice(1).map((s) => s.split('</script>')[0]);
  ok(scripts.length === 2, 'two inline scripts');
  ok(!/<script src|<link /.test(html), 'no external scripts');
  ok(html.split('</script>').length === 3, 'no stray </script');
  // The exit interview, once it exists.
  const iv = join(root, 'exit-interview.json');
  if (existsSync(iv)) {
    let j = null;
    try { j = JSON.parse(readFileSync(iv, 'utf8')); } catch (e) { ok(false, 'exit interview parses', e.message); }
    if (j) {
      const siKeys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
      ok(JSON.stringify(Object.keys(j)) === JSON.stringify(['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub']), 'exit interview top-level keys');
      ok(JSON.stringify(Object.keys(j.sourceInformation)) === JSON.stringify(siKeys), 'exit interview sourceInformation keys');
      for (const k of siKeys) ok(typeof j.sourceInformation[k] === 'string' && j.sourceInformation[k].length > 0, `exit interview ${k} filled`);
      ok(j.sourceInformation.usage === 'added on import', 'usage reads added on import');
      ok(j.testingFeedback.length === 4 && j.engineFeedback.length === 6 && j.promptFeedback.length === 4, 'feedback answer counts');
      for (const a of [...j.testingFeedback, ...j.engineFeedback, ...j.promptFeedback]) ok(typeof a === 'string' && a.length > 0, 'feedback answer filled');
      const ai = j.aiHub;
      ok(JSON.stringify(Object.keys(ai)) === JSON.stringify(['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags']), 'aiHub keys');
      for (const k of Object.keys(ai)) if (k !== 'series' && k !== 'tags') ok(typeof ai[k] === 'string' && ai[k].length > 0, `aiHub ${k} filled`);
      ok(Array.isArray(ai.tags) && ai.tags.length >= 3 && ai.tags.length <= 6 && ai.tags.every((t) => t === t.toLowerCase()), 'aiHub tags');
      ok(['Action', 'Adventure', 'Fighting', 'Flight', 'Horror', 'Kids & Learning', 'Life Sim', 'Platformer', 'Puzzle', 'Racing', 'RPG', 'Shooter', 'Simulation', 'Sports', 'Stealth', 'Strategy'].includes(ai.genre), 'aiHub genre from the list');
      const { TITLE } = await import('../src/data/config.js');
      ok(ai.name === TITLE, 'aiHub name equals title constant');
    }
  }
};

const EVENT_IDS = ['poses', 'cairn', 'stillWater', 'logReps', 'plank', 'tug', 'stepClass', 'plates', 'islandLoop', 'fruitHat', 'roomService', 'springboard', 'raft', 'grandHold'];
const RUN_FOR = { poses: 70, cairn: 62, stillWater: 62, logReps: 80, plank: 62, tug: 150, stepClass: 110, plates: 62, islandLoop: 180, fruitHat: 62, roomService: 75, springboard: 60, raft: 220, grandHold: 110 };

mods.events = async () => {
  const browser = await launch();
  const page = await logicPage(browser);
  for (const id of EVENT_IDS) {
    for (let tier = 0; tier < 3; tier++) {
      const r = await page.evaluate(({ id, tier, cap }) => {
        const T = window.__TEST__;
        T.startEvent(id, tier, {});
        const ev = T.game.currentEvent;
        T.bot('sharp');
        let t = 0;
        while (t < cap && !ev.isDone()) { T.advance(1); t += 1; }
        const done = ev.isDone();
        let nan = false;
        const w = ev.world;
        if (w) w.forEachRigidBody((b) => { const p = b.translation(); if (!Number.isFinite(p.x + p.y + p.z)) nan = true; });
        const lanes = ev.lanes.map((l) => ev.laneResult(l));
        T.bot(null);
        const errs = T.game.errors.slice();
        T.game.errors.length = 0;
        return { done, t, nan, form: lanes[0].form, raw: lanes[0].raw, stats: lanes[0].stats, errs };
      }, { id, tier, cap: tier ? RUN_FOR[id] * 2 : RUN_FOR[id] });
      ok(r.done, `${id} tier ${tier + 1} completes`, `after ${r.t}s form ${r.form}`);
      ok(!r.nan, `${id} tier ${tier + 1} no NaN`);
      ok(Number.isFinite(r.form), `${id} tier ${tier + 1} result valid`, String(r.form));
      ok(r.errs.length === 0, `${id} tier ${tier + 1} no errors`, r.errs.join(' | ').slice(0, 300));
      info(id, tier + 1, `t=${r.t}`, 'form', Math.round(r.form), r.stats);
    }
    // A forced fall ragdolls and recovers, and the world survives moving afterwards.
    if (!['raft', 'islandLoop', 'springboard', 'plank', 'stillWater', 'stepClass', 'plates'].includes(id)) {
      const r = await page.evaluate(({ id }) => {
        const T = window.__TEST__;
        T.startEvent(id, 0, {});
        const ev = T.game.currentEvent;
        T.advance(0.5);
        ev.forceFall(0);
        const f1 = ev.lanes[0].fallen;
        T.advance(1);
        const f2 = ev.lanes[0].fallen;
        T.advance(2.5);
        const f3 = ev.lanes[0].fallen, falls = ev.lanes[0].falls;
        T.advance(1);
        const errs = T.game.errors.slice(); T.game.errors.length = 0;
        return { f1, f2, f3, falls, errs };
      }, { id });
      ok(r.f1 && r.f2 && !r.f3 && r.falls === 1, `${id} forced fall recovers`, JSON.stringify(r));
      ok(r.errs.length === 0, `${id} forced fall no errors`, r.errs.join(' | ').slice(0, 300));
    }
  }
  // The engine's animation system: the mixer's time advances and clips change.
  const clips = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const seen = {};
    for (const id of ['poses', 'logReps', 'roomService', 'springboard']) {
      T.startEvent(id, 0, {});
      const ev = g.currentEvent, rig = ev.lanes[0].doll.rig;
      T.bot('sharp');
      const names = new Set(), t0 = rig.time, scrub = new Set();
      for (let i = 0; i < 40 && !ev.isDone(); i++) { T.advance(0.5); names.add(rig.currentName); const a = rig.action(rig.currentName); if (a) scrub.add(a.time.toFixed(2)); }
      seen[id] = { names: [...names], advanced: rig.time - t0, scrub: scrub.size, scrubbed: id === 'logReps' };
      T.bot(null);
    }
    T.goto('menu');
    return seen;
  });
  for (const id of Object.keys(clips)) {
    ok(clips[id].advanced > 1, `${id}: the mixer's time advances`, String(clips[id].advanced));
    // Log Reps holds one clip on purpose and scrubs it by depth; everything else changes clip.
    if (clips[id].scrubbed) ok(clips[id].scrub >= 5, `${id}: the squat clip scrubs with depth`, String(clips[id].scrub));
    else ok(clips[id].names.length >= 2, `${id}: clips change`, clips[id].names.join(','));
  }
  // Soak the removal paths with the doll swaying: Rapier's panic only shows once something moves.
  const soak = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, out = {};
    const run = (name, id, fn) => {
      try { T.startEvent(id, 0, {}); fn(g.currentEvent, g.currentEvent.lanes[0]); T.advance(1); out[name] = g.errors.slice(0, 2); } catch (e) { out[name] = [String(e.message)]; }
      g.errors.length = 0;
    };
    T.tun.recoverTime = 0.4;
    run('ragdoll spawn and remove, 30 times', 'poses', (ev) => { for (let i = 0; i < 30; i++) { T.advance(0.3); ev.forceFall(0); T.advance(0.6); } });
    T.bot('sharp');
    run('fruit spilled and banked', 'fruitHat', (ev, l) => { l.bankAt = 99; for (let i = 0; i < 8; i++) { T.advance(5); ev.forceFall(0); T.advance(0.8); } });
    run('stones under a falling doll', 'cairn', (ev) => { ev.cfg = { ...ev.cfg, every: 0.6 }; for (let i = 0; i < 6; i++) { T.advance(2.5); ev.forceFall(0); T.advance(0.8); } });
    run('tumblers respawned off the edge', 'roomService', (ev, l) => { for (let i = 0; i < 6; i++) { T.advance(2); ev.offEdge(l); } });
    run('plate shards', 'plates', (ev, l) => { for (let i = 0; i < 12; i++) { l.plates[i % 3].energy = 0.001; T.advance(1); if (l.plates[i % 3].state !== 'on') l.plates[i % 3].back = 0.01; T.advance(0.2); } T.advance(3); });
    run('stones then the plate, on the finale', 'grandHold', (ev) => { for (let i = 0; i < 5; i++) { ev.startStage(1); T.advance(9); ev.clearStones(); ev.startStage(2); T.advance(1); } });
    run('falling with stones on the finale', 'grandHold', (ev) => { for (let i = 0; i < 4; i++) { ev.startStage(1); T.advance(7); ev.forceFall(0); T.advance(1); } });
    T.bot(null);
    T.resetTuning();
    T.goto('menu');
    return out;
  });
  for (const k of Object.keys(soak)) ok(soak[k].length === 0, `soak: ${k}`, soak[k].join(' | ').slice(0, 300));
  // The bedsheet really catches, the wave shows before a swell, and flailing costs something in a quiet class.
  const details = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game, r = {};
    T.startEvent('grandHold', 0, {});
    const ev = g.currentEvent;
    T.advance(1);
    ev.forceFall(0);
    let low = 99;
    for (let i = 0; i < 40; i++) { T.advance(0.05); if (ev.lanes[0].ragdoll) low = Math.min(low, ev.lanes[0].ragdoll.centre().y); }
    r.sheetLow = low; r.restarts = ev.restarts; r.sheetShown = ev.sheet.visible;
    T.advance(1.5);
    r.sheetAfter = ev.sheet.visible; r.up = !ev.lanes[0].fallen; r.stageT = ev.stageT;
    T.startEvent('raft', 0, {});
    const rf = g.currentEvent;
    rf.nextSwell = 0;
    T.advance(0.3);
    r.wave = rf.waveM.visible && rf.warn > 0;
    T.advance(1.2);
    r.waveGone = !rf.waveM.visible;
    T.startEvent('stillWater', 0, {});
    const sw = g.currentEvent;
    sw.calm = 0.5; T.advance(0.1);
    const c0 = sw.calm; T.tap(2); r.calmDrop = c0 - sw.calm;
    T.startEvent('cairn', 0, {});
    const ca = g.currentEvent, cl = ca.lanes[0];
    T.advance(2); const s0 = cl.steady; T.tap(2); r.steadyDrop = s0 - cl.steady;
    T.goto('menu');
    return r;
  });
  ok(details.sheetLow > -8.2 && details.sheetLow < 0, 'the bedsheet catches a falling doll', String(details.sheetLow));
  ok(details.restarts === 1 && details.sheetShown && !details.sheetAfter && details.up && details.stageT < 2, 'the phase restarts after the bedsheet', JSON.stringify(details));
  ok(details.wave && details.waveGone, 'a wave shows before each swell', JSON.stringify(details));
  ok(details.calmDrop > 0.05, 'flailing costs calm in Still Water', String(details.calmDrop));
  ok(details.steadyDrop > 0, 'flailing costs steadiness in The Cairn', String(details.steadyDrop));
  // Bodies return to baseline after dispose.
  const base = await page.evaluate(() => { const T = window.__TEST__; T.goto('title'); T.advance(0.2); return T.state(); });
  ok(base.event === null, 'event disposed on leaving');
  ok(page.errors.length === 0, 'no page errors', page.errors.slice(0, 4).join(' | '));
  await page.context().close();
  await browser.close();
  // One run with real rendering per event: WebGPU, device alive, frames rising, ink on screen.
  const rb = await chromium.launch({ args: ['--no-sandbox', ...RENDER] });
  const rp = await rb.newPage({ viewport: { width: 1280, height: 720 } });
  const rerr = [];
  rp.on('pageerror', (e) => rerr.push(String(e)));
  rp.on('console', (m) => { if (/device lost/i.test(m.text())) rerr.push(m.text()); });
  await rp.addInitScript(PAD_STUB);
  await rp.goto(`${FILE_URL}?test=1&manual=1`);
  await rp.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 180000 });
  for (const id of EVENT_IDS) {
    const s = await rp.evaluate(async (id) => {
      const T = window.__TEST__, g = T.game;
      T.startEvent(id, 0, {});
      T.bot('sharp');
      const f0 = g.frames, m0 = g.currentEvent.lanes[0].doll.rig.time;
      for (let i = 0; i < 3; i++) { T.advance(0.7); await g.render(); }
      const st = T.state();
      return { frames: g.frames - f0, backend: st.render.backend, lost: st.render.lost, errs: st.errors.slice(0, 2), mixer: g.currentEvent.lanes[0].doll.rig.time - m0 };
    }, id);
    ok(s.backend === 'webgpu', `${id} renders on WebGPU`, s.backend);
    ok(s.lost === null, `${id} device alive`, String(s.lost));
    ok(s.frames >= 3, `${id} frames rising`, String(s.frames));
    ok(s.mixer > 0.1, `${id} mixer time advances`, String(s.mixer));
    ok(s.errs.length === 0, `${id} renders clean`, s.errs.join('|').slice(0, 200));
  }
  // Read a real frame back as pixels: it must have ink and a range of colours.
  const png = await rp.screenshot();
  const px = await rp.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let ink = 0; const cols = new Set();
    for (let i = 0; i < d.length; i += 4) { if (d[i] < 60 && d[i + 1] < 55 && d[i + 2] < 70) ink++; cols.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3)); }
    return { inkShare: ink / (d.length / 4), colours: cols.size };
  }, png.toString('base64'));
  ok(px.inkShare > 0.002, 'a rendered frame has ink lines', String(px.inkShare));
  ok(px.colours > 100, 'a rendered frame has a range of colours', String(px.colours));
  // Colours really reach the screen: marbles after the title has drawn them empty, then particles.
  const countPixels = async (test) => {
    const b64 = (await rp.screenshot()).toString('base64');
    return rp.evaluate(async ({ b64, test }) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data, f = new Function('r', 'g', 'b', `return ${test}`);
      let n = 0;
      for (let i = 0; i < d.length; i += 4) if (f(d[i], d[i + 1], d[i + 2])) n++;
      return n;
    }, { b64, test });
  };
  await rp.evaluate(async () => {
    const T = window.__TEST__, g = T.game;
    T.bot(null);
    g.programme.createProfile(0, 'Colour Guest', 'teal');
    const p = g.save.profile;
    p.tutorialDone = true; p.today.checkin = true; p.today.question = true;
    T.goto('title'); T.advance(0.2); await g.render();
    p.marbleLog = Array(120).fill('suspicious'); p.marbles = 120;
    T.goto('jar', { marbles: 1, medal: 'suspicious' }); T.advance(0.3);
    g.speech.clear();
    document.getElementById('ui').style.display = 'none';
    await g.render(); await g.render();
  });
  const rose = await countPixels('r > 150 && r < 225 && g > 40 && g < 110 && b > 70 && b < 140');
  ok(rose > 300, 'marbles show their medal colour after the title has drawn', String(rose));
  await rp.evaluate(async () => {
    const T = window.__TEST__, g = T.game;
    T.goto('menu'); T.advance(0.1);
    const v = g.rig.look;
    for (let i = 0; i < 40; i++) g.fx.spawn(v.x + (i % 8) - 4, v.y + 2 + (i % 5), v.z + 6, 0, 0, 0, 0.7, 0x0000ff, 8, 0);
    T.advance(0.05);
    await g.render(); await g.render();
  });
  const blue = await countPixels('b > 150 && r < 70 && g < 70');
  ok(blue > 300, 'particles show their colour', String(blue));

  // The ink sliders, moved with Dev Mode's own controls and read back from the picture.
  await rp.evaluate(async () => {
    const T = window.__TEST__, g = T.game;
    T.resetTuning(); g.applyInk();
    document.getElementById('ui').style.display = '';
    T.startEvent('poses', 0, {});
    for (let n = 0; g.currentEvent.phase !== 'play' && n < 400; n++) T.advance(0.05);
    T.advance(0.5); g.speech.clear();
    T.tap(9); T.advance(0.02);
    const dev = [...document.querySelectorAll('[data-screen="pause"] .item')].map((e) => e.textContent.trim()).indexOf('Dev Mode');
    for (let i = 0; i < dev; i++) T.tap(13);
    T.tap(0);
    const top = g.ui.top;
    for (let n = 0; n < top.pages && !top.items.some((it) => it.el.textContent.startsWith('Boil')); n++) { top.turn(1); T.advance(0.01); }
    document.getElementById('ui').style.display = 'none';
    await g.render();
  });
  const picture = async () => (await rp.screenshot()).toString('base64');
  const pixelsApart = (a, b) => rp.evaluate(async ({ a, b }) => {
    const read = async (src) => {
      const img = new Image(); img.src = `data:image/png;base64,${src}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      return x.getImageData(0, 0, c.width, c.height).data;
    };
    const p = await read(a), q = await read(b);
    let n = 0;
    for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) + Math.abs(p[i + 1] - q[i + 1]) + Math.abs(p[i + 2] - q[i + 2]) > 24) n++;
    return n;
  }, { a, b });
  for (const [key, label] of [['hull', 'Hull'], ['lineWidth', 'Line width'], ['boil', 'Boil'], ['grain', 'Grain']]) {
    const base = await picture();
    const again = await rp.evaluate(async () => { await window.__TEST__.game.render(); });
    void again;
    const same = await picture();
    const moved = await rp.evaluate(async ({ key, label }) => {
      const T = window.__TEST__, g = T.game;
      const it = g.ui.top.items.find((x) => x.el.textContent.startsWith(label));
      if (!it) return null;
      const before = T.tun[key];
      for (let i = 0; i < 40; i++) it.right();
      await g.render();
      return { before, after: T.tun[key] };
    }, { key, label });
    const changed = await picture();
    const noise = await pixelsApart(base, same), effect = await pixelsApart(base, changed);
    ok(moved && moved.after > moved.before, `slider ${key} moves from Dev Mode`, JSON.stringify(moved));
    ok(effect > noise + 300, `slider ${key} changes the picture`, `${effect} pixels, ${noise} without moving it`);
    await rp.evaluate(async () => { const T = window.__TEST__; T.resetTuning(); T.game.applyInk(); await T.game.render(); });
  }

  // A long pump now goes higher: the top of the dive still has to be in the picture.
  const apex = await rp.evaluate(async () => {
    const T = window.__TEST__, g = T.game, STEP = 1 / 120, out = [];
    const v3 = g.camera.position.clone();
    for (const tier of [0, 2]) {
      T.startEvent('springboard', tier, {});
      const ev = g.currentEvent, l = ev.lanes[0];
      for (let n = 0; ev.phase !== 'play' && n < 400; n++) T.advance(0.05);
      T.advance(1.5);
      l.boardY = 0; l.boardV = 0.4; l.pumpT = 0;
      let top = 0;
      for (let i = 0; i < 15.5 * 120; i++) {
        const go = l.boardV < 0 ? 1 : 0;
        l.input.footL = go; l.input.footR = go; l.input.launch = false;
        ev.pump(l, STEP);
        top = Math.max(top, l.boardV);
      }
      l.boardV = top; ev.launch(l);
      let high = -9, low = 9, wide = 0, topY = 0;
      for (let i = 0; i < 120 && l.phase2 === 'air'; i++) {
        T.advance(0.05);
        if (l.phase2 !== 'air') break;
        g.camera.updateMatrixWorld();
        const p = l.bal.body.translation();
        v3.set(p.x, p.y + 1, p.z).project(g.camera);
        if (v3.y > high) { high = v3.y; topY = p.y; }
        wide = Math.max(wide, Math.abs(v3.x));
        v3.set(p.x, p.y - 1, p.z).project(g.camera);
        low = Math.min(low, v3.y);
      }
      out.push({ tier, speed: top, high, low, wide, topY });
    }
    T.goto('menu');
    return out;
  });
  for (const a of apex) ok(a.high < 1 && a.low > -1 && a.wide < 1, `Springboard tier ${a.tier + 1}: the highest dive stays in frame`, JSON.stringify(a));
  await rp.evaluate(() => { const T = window.__TEST__; document.getElementById('ui').style.display = ''; T.game.save.reset(); T.goto('title'); });
  ok(rerr.length === 0, 'no device lost or page errors while rendering', rerr.slice(0, 3).join('|').slice(0, 300));
  await rb.close();
  // WebKit: the WebGL2 fallback, through a few events.
  const wb = await webkit.launch();
  const wp = await wb.newPage({ viewport: { width: 960, height: 540 } });
  const werr = [];
  wp.on('pageerror', (e) => werr.push(String(e)));
  await wp.addInitScript(PAD_STUB);
  await wp.goto(`${FILE_URL}?test=1&manual=1`);
  await wp.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 180000 });
  for (const id of ['fruitHat', 'poses', 'stillWater']) {
    const s = await wp.evaluate(async (id) => {
      const T = window.__TEST__, g = T.game;
      T.startEvent(id, 0, {});
      T.advance(0.5); await g.render(); T.advance(0.5); await g.render();
      const st = T.state();
      return { backend: st.render.backend, frames: st.render.frames, errs: st.errors.slice(0, 2) };
    }, id);
    ok(s.backend === 'webgl2', `WebKit ${id} falls back to WebGL2`, s.backend);
    ok(s.frames > 0 && s.errs.length === 0, `WebKit ${id} draws clean`, s.errs.join('|').slice(0, 300));
  }
  ok(werr.length === 0, 'WebKit no page errors', werr.slice(0, 2).join('|').slice(0, 300));
  await wb.close();
};

mods.balance = async () => {
  const browser = await launch();
  const page = await logicPage(browser);
  const play = (id, skill, seed, setup, tier = 0, cap = 200) => page.evaluate(({ id, skill, seed, setup, tier, cap }) => {
    const T = window.__TEST__;
    T.game.save.settings.autoBreathe = false;
    const rngMod = window.__TEST__.setSeed;
    if (rngMod) rngMod(seed);
    T.startEvent(id, tier, {});
    const ev = T.game.currentEvent;
    const l = ev.lanes[0];
    if (setup) Object.assign(l, setup);
    const launches = [];
    if (id === 'springboard') { const real = ev.launch.bind(ev); ev.launch = (x) => { real(x); launches.push(x.launchV); }; }
    T.bot(skill);
    let t = 0;
    while (t < cap && !ev.isDone()) { T.advance(1); t++; }
    T.bot(null);
    const r = ev.laneResult(l);
    const out = { form: r.form, raw: r.raw, falls: l.falls, t, stats: r.stats };
    if (id === 'springboard') { out.launches = launches; out.heights = l.dives.map((d) => d.height); }
    if (id === 'plates') out.share = r.raw;
    if (id === 'tug') out.wins = ev.wins;
    if (id === 'cairn') out.stones = l.onSlab;
    if (id === 'roomService') out.glasses = l.tumblers.filter((x) => x.on).length;
    T.goto('menu');
    return out;
  }, { id, skill, seed, setup: setup || null, tier, cap });
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const TIER1 = EVENT_IDS.filter((x) => x !== 'grandHold');
  const results = {};
  for (const id of TIER1) {
    results[id] = {};
    for (const skill of ['sharp', 'average', 'clumsy']) {
      const forms = [], falls = [];
      // Three dives a run swing widely, so Springboard needs more seeds to say anything.
      for (const seed of id === 'springboard' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] : [1, 2, 3]) { const r = await play(id, skill, seed); forms.push(r.form); falls.push(r.falls); }
      results[id][skill] = mean(forms);
      info(id, skill, forms.map((f) => f.toFixed(0)).join(' '), 'mean', mean(forms).toFixed(0), 'falls', falls.join(','));
    }
    if (id !== 'raft' && id !== 'tug') {
      ok(results[id].sharp >= 85, `${id} Tier 1 sharp reaches Exemplary`, results[id].sharp.toFixed(0));
      ok(results[id].average >= 40, `${id} Tier 1 average reaches Adequate`, results[id].average.toFixed(0));
      ok(results[id].clumsy >= 40, `${id} Tier 1 clumsy reaches Adequate`, results[id].clumsy.toFixed(0));
    }
  }
  // Springboard's board against the plan's numbers. Pumping longer has to keep paying.
  const board = await page.evaluate(() => {
    const T = window.__TEST__, STEP = 1 / 120;
    const run = (late) => {
      T.startEvent('springboard', 0, {});
      const ev = T.game.currentEvent, l = ev.lanes[0];
      l.boardY = 0; l.boardV = 0.4; l.pumpT = 0;
      const seen = [], at = {};
      let top = 0;
      for (let i = 1; i <= 7 * 120; i++) {
        seen.push(l.boardV);
        const go = seen[Math.max(0, seen.length - 1 - Math.round(late * 120))] < 0 ? 1 : 0;
        l.input.footL = go; l.input.footR = go; l.input.launch = false;
        ev.pump(l, STEP);
        top = Math.max(top, l.boardV);
        if (i % 120 === 0) at[i / 120] = top;
      }
      T.goto('menu');
      return at;
    };
    return { good: run(0.07), late: run(0.14), quarter: run(0.26) };
  });
  info('board good', board.good[3].toFixed(1), board.good[5].toFixed(1), board.good[7].toFixed(1), 'late', board.late[3].toFixed(1), board.late[5].toFixed(1), board.late[7].toFixed(1), 'quarter', board.quarter[7].toFixed(1));
  [[3, 4.7], [5, 6.5], [7, 7.6]].forEach(([s, want]) => ok(Math.abs(board.good[s] - want) <= 0.3, `Springboard: ${s} s of good pumping gives about ${want} m/s`, board.good[s].toFixed(2)));
  [[3, 3.6], [5, 4.6], [7, 5.2]].forEach(([s, want]) => ok(Math.abs(board.late[s] - want) <= 0.3, `Springboard: ${s} s a little late gives about ${want} m/s`, board.late[s].toFixed(2)));
  ok(board.quarter[7] <= 2.5, 'Springboard: a quarter period late barely moves the board', board.quarter[7].toFixed(2));
  // The whole run: better bots launch faster and go higher.
  const dives = {};
  for (const skill of ['sharp', 'average', 'clumsy']) {
    const rs = [];
    for (const seed of [1, 2, 3]) rs.push(await play('springboard', skill, seed));
    dives[skill] = { launch: mean(rs.flatMap((r) => r.launches)), height: mean(rs.flatMap((r) => r.heights)) };
    info('dives', skill, 'launch', dives[skill].launch.toFixed(1), 'height', dives[skill].height.toFixed(1));
  }
  ok(dives.sharp.launch > dives.average.launch + 0.3 && dives.average.launch > dives.clumsy.launch + 0.3, 'Springboard: better bots launch faster', JSON.stringify(dives));
  ok(dives.sharp.height > dives.average.height && dives.average.height > dives.clumsy.height, 'Springboard: better bots go higher', JSON.stringify(dives));
  [['sharp', 5.4], ['average', 3.8], ['clumsy', 3]].forEach(([k, want]) => ok(Math.abs(dives[k].launch - want) <= 0.8, `Springboard: ${k} launches at about ${want} m/s`, dives[k].launch.toFixed(2)));
  // Guards against the failures the plan hit.
  const park = await play('poses', 'sharp', 1, { parkStick: true, noBreath: true });
  ok(park.form < 85, 'Poses: a parked stick stays below Exemplary', park.form.toFixed(0));
  const fh = await play('fruitHat', 'sharp', 1, { bankAt: 7 });
  ok(fh.falls === 0, 'Fruit Hat Tier 1: sharp banking at 7 has no falls', String(fh.falls));
  const never = await play('fruitHat', 'sharp', 1, { bankAt: 999 });
  ok(never.falls >= 1, 'Fruit Hat Tier 1: never banking falls', String(never.falls));
  const pl = [await play('plates', 'sharp', 1), await play('plates', 'sharp', 2)];
  const ps = [await play('plates', 'clumsy', 1), await play('plates', 'clumsy', 2)];
  ok(mean(pl.map((r) => r.share)) - mean(ps.map((r) => r.share)) >= 0.15, 'Plate Spinners separates the bots', `${mean(pl.map((r) => r.share)).toFixed(2)} vs ${mean(ps.map((r) => r.share)).toFixed(2)}`);
  // Plate Spinners on keys: alternate A and D at the band's tapping speed.
  const keys = (jitter, slips, full, alarm) => page.evaluate(({ jitter, slips, full, alarm }) => {
    const T = window.__TEST__; T.setSeed(4);
    T.startEvent('plates', 0, {});
    const ev = T.game.currentEvent, l = ev.lanes[0];
    const tap = (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: k, key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { code: k, key: k })); };
    const R = { L: 1.35, M: 2.3, S: 3.2 };
    let next = 0.1, side = 'KeyA', t = 0, n = 0, target = null, react = 0;
    let x = 12345;
    const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) & 0x7fffffff; return x / 0x7fffffff; };
    while (!ev.isDone() && t < 70) {
      react -= 1 / 120;
      if (react <= 0) {
        react = 0.5;
        const low = l.plates.filter((p) => p.state === 'on').sort((a, b) => a.energy - b.energy)[0];
        if (!target || target.state !== 'on' || target.energy > full || (low && low.energy < alarm)) target = low;
      }
      next -= 1 / 120;
      if (next <= 0) {
        tap(side); side = side === 'KeyA' ? 'KeyD' : 'KeyA'; n++;
        const rate = R[target ? target.size : 'M'];
        next = (1 / rate) * (1 + (rnd() - 0.5) * jitter) + (rnd() < slips ? 0.5 : 0);
      }
      T.advance(1 / 120); t += 1 / 120;
    }
    const r = ev.laneResult(l);
    T.goto('menu');
    return { share: r.raw, n };
  }, { jitter, slips, full, alarm });
  const ks = await keys(0.06, 0.005, 0.72, 0.42), kc = await keys(0.4, 0.05, 0.95, 0.15);
  ok(ks.share - kc.share >= 0.15, 'Plate Spinners separates on keys too', `${ks.share.toFixed(2)} vs ${kc.share.toFixed(2)}`);
  // Keys and mouse through the real events: the same bots, driving a ring of held keys or a pointer.
  const viaDevice = (device, id, skill, seed, setup, tier = 0) => page.evaluate(({ device, id, skill, seed, setup, tier }) => {
    const T = window.__TEST__, g = T.game;
    T.setSeed(seed);
    T.game.save.settings.autoBreathe = false;
    T.startEvent(id, tier, {});
    const ev = g.currentEvent, l = ev.lanes[0];
    if (setup) Object.assign(l, setup);
    T.bot(skill);
    const down = new Set();
    const key = (code, on) => { if (on === down.has(code)) return; if (on) down.add(code); else down.delete(code); window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code, key: code })); };
    const orig = g.beforePoll;
    let lastButtons = 0;
    g.beforePoll = (dt) => {
      orig(dt);
      const p = window.__pads[0];
      if (!p) return;
      // On keys you watch the ring, not the dot, and correct gently: chasing the dot through a slow ring only rocks you.
      if (device === 'keys' && l.testBot && !l.testBot.onKeys) { l.testBot.onKeys = true; l.testBot.s = { ...l.testBot.s, gain: { sharp: 1, average: l.testBot.s.gainLoad }[l.testBot.skillName] ?? l.testBot.s.gain }; }
      // The pad bot aims past the stick's dead zone. Keys and a pointer have none, so take that back off.
      const m = Math.hypot(p.axes[0], p.axes[1]), k = m > 0.08 ? (m - 0.08) / (0.92 * m) : 0;
      const ax = p.axes[0] * k, az = p.axes[1] * k, v = p.buttons.map((b) => b.value);
      p.axes[0] = 0; p.axes[1] = 0; for (const b of p.buttons) { b.pressed = false; b.value = 0; }
      const i = g.input;
      // Log Reps on keys and mouse: depth ramps while held, so you hold through the whole way down, a moment late.
      if (id === 'logReps' && ev.phase === 'play') {
        const lag = l.testBot ? l.testBot.s.lag : 0.2, k = T.tun.repTempo;
        const hold = ev.repT >= lag && ev.repT < (2 + 0.5) / k + lag;
        v[6] = hold ? 1 : 0; v[7] = hold ? 1 : 0;
      }
      if (device === 'keys') {
        // A person holds a key until the ring is about where they want it.
        const dx = ax - i.ringX, dz = az - i.ringZ, band = 0.05;
        key('KeyD', dx > band); key('KeyA', dx < -band); key('KeyS', dz > band); key('KeyW', dz < -band);
        key('KeyQ', v[6] > 0.5); key('KeyE', v[7] > 0.5); key('KeyF', v[2] > 0.5);
      } else {
        const buttons = (v[6] > 0.5 ? 1 : 0) | (v[7] > 0.5 ? 2 : 0) | (v[2] > 0.5 ? 4 : 0);
        window.dispatchEvent(new PointerEvent('pointermove', { clientX: innerWidth / 2 + ax * 0.33 * innerHeight + (ax === 0 ? 0.01 : 0), clientY: innerHeight / 2 + az * 0.33 * innerHeight, pointerType: 'mouse', buttons }));
        lastButtons = buttons;
      }
      key('Space', v[0] > 0.5); key('ShiftLeft', v[5] > 0.5);
    };
    let t = 0;
    while (t < 200 && !ev.isDone()) { T.advance(1); t++; }
    g.beforePoll = orig;
    for (const c of [...down]) key(c, false);
    void lastButtons;
    T.bot(null);
    const r = ev.laneResult(l);
    const out = { form: r.form, falls: l.falls, device: l.input.device, glasses: id === 'roomService' ? l.tumblers.filter((x) => x.on).length : null, share: id === 'plates' ? r.raw : null, banked: l.banked, zone: id === 'stillWater' ? 100 * ev.inT / Math.max(1, Math.min(ev.t, ev.cfg.time)) : null };
    T.goto('menu');
    return out;
  }, { device, id, skill, seed, setup: setup || null, tier });
  for (const device of ['keys', 'mouse']) {
    for (const id of ['poses', 'stillWater', 'fruitHat', 'logReps', 'roomService', 'cairn']) {
      const row = {};
      for (const skill of ['sharp', 'average', 'clumsy']) {
        const rs = [await viaDevice(device, id, skill, 1), await viaDevice(device, id, skill, 2)];
        row[skill] = mean(rs.map((x) => x.form));
        ok(rs.every((x) => x.device === 'kbm'), `${device} ${id} ${skill} really played on keyboard and mouse`, rs[0].device);
        if (id === 'roomService' && skill === 'sharp') ok(rs.every((x) => x.glasses >= 4), `Room Service on ${device} delivers`, rs.map((x) => x.glasses).join(','));
      }
      info(device, id, Object.entries(row).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(' '), 'stick', ['sharp', 'average', 'clumsy'].map((k) => results[id][k].toFixed(0)).join('/'));
      ok(row.sharp >= 60, `${id} on ${device}: sharp gets a good score`, row.sharp.toFixed(0));
      ok(row.sharp >= results[id].sharp - 30, `${id} on ${device} holds up against the stick`, `${row.sharp.toFixed(0)} vs ${results[id].sharp.toFixed(0)}`);
      // Still Water's small zone makes a delayed bot oscillate. The plan measured its clumsy bot at 24-28% in the zone: keep a floor, not a medal.
      ok(row.clumsy >= (id === 'stillWater' ? 10 : 20), `${id} on ${device}: clumsy still gets somewhere`, row.clumsy.toFixed(0));
    }
    const fall = await viaDevice(device, 'fruitHat', 'sharp', 1, { bankAt: 7 });
    ok(fall.falls === 0, `Fruit Hat on ${device}: sharp banking at 7 has no falls`, String(fall.falls));
  }
  const mp = await viaDevice('mouse', 'plates', 'sharp', 1), mc = await viaDevice('mouse', 'plates', 'clumsy', 1);
  info('mouse plates', mp.share.toFixed(2), mc.share.toFixed(2));
  ok(mp.share - mc.share >= 0.1, 'Plate Spinners separates on the mouse too', `${mp.share.toFixed(2)} vs ${mc.share.toFixed(2)}`);
  // The plan's own figures on keys, from section 3's person-like bot. That bot is not section 6's: on the stick, its clumsy Still Water reads 24, where section 6 reads 80.
  // So its clumsy figures can only be a range here, and its Poses are compared without breath, which is nearest its stick numbers.
  const onKeys = async (id, tier, f, setup) => { const out = []; for (const skill of ['sharp', 'average', 'clumsy']) { const v = []; for (const seed of [1, 2, 3]) v.push(f(await viaDevice('keys', id, skill, seed, setup, tier))); out.push(mean(v)); } return out; };
  const planKeys = (label, got, want, tol) => { info('on keys', label, got.map((v) => v.toFixed(0)).join(' / '), 'plan', want.join(' / ')); got.forEach((v, i) => ok(Math.abs(v - want[i]) <= tol[i], `On keys: ${label} ${['sharp', 'average', 'clumsy'][i]}`, `${v.toFixed(0)}, plan ${want[i]} within ${tol[i]}`)); };
  planKeys('Poses T1', await onKeys('poses', 0, (r) => r.form, { noBreath: true }), [98, 62, 54], [5, 30, 30]);
  planKeys('Poses T2', await onKeys('poses', 1, (r) => r.form, { noBreath: true }), [86, 58, 34], [14, 30, 30]);
  planKeys('Still Water T1 in the zone', await onKeys('stillWater', 0, (r) => r.zone), [100, 85, 28], [2, 15, 55]);
  planKeys('Fruit Hat T1 banked', await onKeys('fruitHat', 0, (r) => r.banked), [21, 22, 20], [8, 8, 8]);
  planKeys('Room Service T1 glasses', await onKeys('roomService', 0, (r) => r.glasses), [5, 5, 5], [0, 0, 0]);
  ok(mean(await onKeys('fruitHat', 0, (r) => r.falls)) <= 0.4, 'On keys: Fruit Hat T1 hardly ever falls');
  // The Check-In: every test gives the sharp bot a fair score. Lean Match was impossible in the plan's first version.
  const checkin = await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    const scores = {};
    g.programme.createProfile(0, 'Test Guest', 'teal');
    const p = g.save.profile;
    p.tutorialDone = true;
    for (const day of [2, 3]) {
      p.today = { day, checkin: false, age: null, done: [], question: true };
      T.goto('checkin');
      const ev = g.mode.ev;
      T.bot('sharp');
      let t = 0;
      while (!ev.allDone && t < 90) { T.advance(0.5); t += 0.5; }
      T.bot(null);
      Object.assign(scores, ev.scores);
      T.goto('menu');
    }
    g.save.reset();
    return scores;
  });
  info('check-in', JSON.stringify(checkin));
  for (const k of ['standStill', 'leanMatch', 'quickLean', 'oneFoot', 'stepTime']) ok((checkin[k] ?? 0) > 0.3, `Check-In ${k} scores above .3 for the sharp bot`, String(checkin[k]));
  const tug = await play('tug', 'sharp', 1);
  ok(tug.wins[0] > tug.wins[1], 'Tug of Peace Tier 1 winnable', JSON.stringify(tug.wins));
  const log = await play('logReps', 'clumsy', 1);
  ok(log.form <= 75, 'Log Reps does not hand the clumsy bot too much', log.form.toFixed(0));
  const rs = await play('roomService', 'sharp', 1);
  ok(rs.glasses === 5, 'Room Service Tier 1 with a brace delivers all five', String(rs.glasses));
  const cs = await play('cairn', 'sharp', 2, { noBreath: false }, 1);
  const cn = await play('cairn', 'sharp', 2, { noBreath: true }, 1);
  ok(cs.stones >= cn.stones, 'Breath helps on The Cairn Tier 2', `${cs.stones} vs ${cn.stones}`);
  await page.context().close();
  await browser.close();
};

for (const g of groups) {
  const kit = { ok, info, launch, logicPage, FILE_URL, RENDER, PAD_STUB, OUT, root, dev, createServer, chromium, webkit, devices, EVENT_IDS };
  const runGroup = async () => {
    if (mods[g]) { await mods[g](); return; }
    const m = await import(`./test-${g}.mjs`);
    await m.default(kit);
  };
  const before = [passed, failed];
  for (let attempt = 1; attempt <= 2; attempt++) {
    await waitForRoom();
    try {
      await runGroup();
      if (process.env.PER_GROUP) console.log(`${g.padEnd(8)} ${passed - before[0]} passed, ${failed - before[1]} failed`);
      break;
    } catch (e) {
      // A browser that ran out of memory says nothing about the game: start the group again from its own count.
      if (isMemoryCrash(e) && attempt === 1) {
        console.log(`NOTE group ${g}: browser ran out of memory (${availableGB().toFixed(1)} GB free), running it again`);
        [passed, failed] = before;
        continue;
      }
      failed++;
      console.log(`FAIL group ${g} crashed: ${String(e.stack || e).slice(0, 500)}`);
      break;
    }
  }
}
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
