/**
 * Drives the shipped game. Prints failures and one "N/N passed" line.
 * From the dev folder: node tools/test.mjs [--fast]
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Engine,
  HERO_RIG,
  analyzeClip,
  checkModel,
  compileClips,
  parseSong,
  validateClip,
  validateTexture,
} from '../pixel-engine.js';
import { App, freshGuest } from '../src/app.js';
import { CAMERA, World } from '../src/scenes/world.js';
import { ACTIVITIES, ACTIVITY_BY_ID } from '../src/data/activities.js';
import { DAYS } from '../src/data/week.js';
import { LINES, SAMPLES, allLineStrings, linesFor } from '../src/data/lines.js';
import { SONGS, songLevel } from '../src/audio/songs.js';
import { syllabify } from '../src/audio/voice.js';
import { Dot, DOT_DEFAULTS } from '../src/core/dot.js';
import { BotDriver, LocalDriver } from '../src/core/drivers.js';
import { createSim } from '../src/core/sims.js';
import { dialLayout } from '../src/app.js';
import { mulberry32 } from '../src/core/rng.js';
import { dripsFor, milestonesReached, starsFor } from '../src/core/score.js';
import { SAVE_KEY, Save } from '../src/core/save.js';
import { DEFAULT_TUNABLES, TUNABLE_TABS, tabKeys } from '../src/core/tunables.js';
import { missingGlyphs, wrapText } from '../src/ui/font.js';
import { MODELS } from '../src/art/models.js';
import { CLIPS } from '../src/art/clips.js';
import { clinicTile } from '../src/art/textures.js';
import { ABOUT_COLS, ABOUT_ROWS, ENGINE_FEEDBACK, KIT_CREDITS, MEDICAL, PROMPT_FEEDBACK, SOURCE_INFORMATION, TESTING_FEEDBACK, aboutPages, exitInterview } from '../src/data/about.js';
import { CREDITS_TEXT } from '../src/data/creditsText.js';
import { TITLE } from '../src/data/title.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(here, '..');
const SCRATCH = '/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-221607__x6981e3/tmp/grok-goal-46b978a86300/implementer';
const fast = process.argv.includes('--fast');
mkdirSync(SCRATCH, { recursive: true });
const BEAT = path.join(SCRATCH, 'beat.log');

const fails = [];
let total = 0;

function beat(msg) {
  try { appendFileSync(BEAT, `${new Date().toISOString()} ${msg}\n`); } catch { /* scratch only */ }
}

async function test(name, fn) {
  total += 1;
  beat(`start ${name}`);
  try {
    await fn();
    beat(`ok ${name}`);
  } catch (err) {
    fails.push(`${name}: ${err?.stack || err?.message || err}`);
    beat(`FAIL ${name}: ${err?.message || err}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function tap(engine, code) {
  engine.input.setKey(code, true);
  engine.step(1);
  engine.input.setKey(code, false);
  engine.step(1);
}

function choose(engine, app, id) {
  let guard = 0;
  while (app.state().row !== id) {
    if (guard++ > 12) throw new Error(`no row ${id} in ${app.mode}: ${app.state().rows.join(',')}`);
    tap(engine, 'ArrowDown');
  }
  tap(engine, 'Enter');
}

function untilMode(engine, app, mode, cap, label) {
  let n = 0;
  while (app.mode !== mode) {
    if (n >= cap) throw new Error(`${label || mode}: stuck in ${app.status()} after ${n} frames`);
    const chunk = Math.min(180, cap - n);
    engine.step(chunk);
    n += chunk;
    if (n % 1080 === 0) beat(`${label || mode} ${app.status()}`);
  }
}

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function releasePads() {
  let pads = [];
  try { pads = globalThis.navigator?.getGamepads?.() || []; } catch { pads = []; }
  for (const pad of pads) {
    if (!pad) continue;
    if (pad.axes) for (let i = 0; i < pad.axes.length; i++) pad.axes[i] = 0;
    if (pad.buttons) for (const button of pad.buttons) {
      button.pressed = false;
      button.value = 0;
    }
  }
}

async function boot(engine, opts = {}) {
  releasePads();
  const app = new App({ storage: opts.storage === undefined ? null : opts.storage, noHero: true, session: opts.session || null, touchOnly: !!opts.touchOnly });
  await engine.loadGame(new World(app));
  engine.step(2);
  return app;
}

function band(skill, seed) {
  const dot = new Dot(mulberry32(seed));
  const bot = new BotDriver(skill, mulberry32(seed + 99));
  const dt = 1 / 60;
  let inside = 0;
  let n = 0;
  for (let i = 0; i < 37 * 60; i++) {
    const u = skill === 'idle' ? { x: 0, y: 0 } : bot.read(dot, dt);
    dot.step(dt, u.x || 0, u.y || 0, DOT_DEFAULTS, {});
    if (i >= 120) {
      n += 1;
      if (Math.hypot(dot.x, dot.y) < 0.3) inside += 1;
    }
  }
  return inside / n;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.build') continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

async function main() {
  console.info = () => {};
  await test('rep axes follow the stick and the key rate', async () => {
    const dial = dialLayout(480, 270);
    assert(dial.x === 240 && dial.y === 56 && dial.radius === 44, `dial ${dial.x},${dial.y},${dial.radius}`);
    const read = (device, partial) => {
      const down = new Set(partial.down || []);
      const driver = new LocalDriver();
      return driver.readFrom({
        input: {
          moveAxis: () => ({ x: partial.x || 0, y: partial.y || 0 }),
          padAxis: { x: partial.x || 0, y: partial.y || 0 },
          pointer: { x: 0, y: 0 },
          isDown: (code) => down.has(code),
          wasPressed: () => false,
          mouseButtons: 0,
        },
        hud: { width: 480, height: 270 },
      }, device, dial, 70, 1 / 60);
    };
    const hold = (id, u, seconds) => {
      const sim = createSim(id, { tunables: { ...DEFAULT_TUNABLES }, rand: () => 0.5, skill: 'idle', skipIntro: true });
      const dt = 1 / 60;
      for (let i = 0; i < Math.round(seconds * 60); i++) sim.step(dt, u);
      return sim.r;
    };
    const right = read('pad', { x: 1, y: 0 });
    assert(right.depth === 0 && right.x === 1 && !right.useRate, `right shape ${JSON.stringify(right)}`);
    const up = read('pad', { x: 0, y: 1 });
    assert(up.depth === 0 && up.y === 1, `up shape ${JSON.stringify(up)}`);
    const down = read('pad', { x: 0, y: -1 });
    assert(down.depth === 1, `down depth ${down.depth}`);
    const keys = read('keyboard', { down: ['KeyS'] });
    assert(keys.useRate === true && keys.rate === 1, `key rate ${JSON.stringify(keys)}`);
    const lunge = hold('lunge', right, 0.5);
    const press = hold('press', up, 0.5);
    const squat = hold('squat', down, 0.5);
    const keyed = hold('squat', keys, 0.5);
    const idle = hold('lunge', read('pad', { x: 0, y: 0 }), 0.5);
    const pressRight = hold('press', right, 0.5);
    assert(lunge > 0.5, `lunge r ${lunge}`);
    assert(press > 0.5, `press r ${press}`);
    assert(squat > 0.5, `squat r ${squat}`);
    assert(keyed > 0.25 && keyed < 0.7, `key r ${keyed}`);
    assert(idle < 0.08, `idle r ${idle}`);
    assert(pressRight < 0.08, `press ignored right ${pressRight}`);
  });

  await test('dot bands and star thresholds', async () => {
    const idle = band('idle', 1);
    const average = band('average', 1);
    const good = band('good', 1);
    const expert = band('expert', 1);
    assert(idle < 0.2, `idle ${idle}`);
    assert(average > 0.35 && average < 0.65, `average ${average}`);
    assert(good > 0.8, `good ${good}`);
    assert(expert > 0.95, `expert ${expert}`);
    assert(starsFor(idle * 100, [45, 70, 90]) === 0, 'idle stars');
    assert(starsFor(good * 100, [45, 70, 90]) === 3, 'good stars');
    assert(starsFor(44, [45, 70, 90]) === 0, 'below one');
    assert(starsFor(45, [45, 70, 90]) === 1, 'one');
    assert(starsFor(70, [45, 70, 90]) === 2, 'two');
    assert(starsFor(90, [45, 70, 90]) === 3, 'three');
    assert(DOT_DEFAULTS.dotInstability === 0.6 && DOT_DEFAULTS.dotLag === 0.08, 'defaults');
  });

  await test('songs, lines, models, hash, about', async () => {
    for (const [name, song] of Object.entries(SONGS)) {
      parseSong(song);
      const level = songLevel(song);
      assert(level >= 0.03, `${name} level ${level}`);
    }
    assert(SONGS.step.bpm === 104, 'step bpm');
    const hash = createHash('sha256').update(readFileSync(path.join(devRoot, 'pixel-engine.js'))).digest('hex');
    const expected = readFileSync(path.join(devRoot, 'vendor/pixel-engine.sha256'), 'utf8').trim().split(/\s+/)[0];
    assert(hash === expected, `hash ${hash}`);
    for (const model of MODELS) {
      const report = checkModel(model);
      assert(report.problems.length === 0, `${model.id || model.name} ${report.problems.join(';')}`);
    }
    const tex = validateTexture(clinicTile);
    assert(tex.problems.length === 0, `texture ${tex.problems.join(';')}`);
    assert(LINES.length >= 120, `lines ${LINES.length}`);
    const banned = /\b(Wii|Mii|Wuhu)\b|Balance Board|Wii Fit Trainer|Fit Age/;
    for (const text of allLineStrings()) {
      const bad = missingGlyphs(text);
      assert(bad.length === 0, `glyph ${bad.join('')} in ${text}`);
      for (const piece of wrapText(text, 52)) assert(piece.length <= 52, `wrap width ${piece}`);
      assert(wrapText(text, 52).length <= 3, `wrap lines ${text}`);
      assert(!banned.test(text), `banned ${text}`);
    }
    for (const def of ACTIVITIES) {
      for (const stars of [0, 1, 2, 3]) {
        for (const repeat of [false, true]) {
          const found = linesFor(def.id, stars, repeat);
          assert(found.length >= 1, `missing ${def.id} ${stars} ${repeat}`);
        }
      }
      assert(!banned.test(def.name), def.name);
    }
    for (const day of DAYS) assert(!banned.test(`${day.beat} ${day.concern}`), `day ${day.day}`);
    const pages = aboutPages(CREDITS_TEXT);
    const flat = pages.flatMap((p) => p.lines).join('').replace(/\s+/g, '');
    const compact = (s) => String(s).replace(/\s+/g, '');
    for (const page of pages) {
      assert(page.lines.length <= ABOUT_ROWS, `${page.title} lines ${page.lines.length}`);
      for (const text of page.lines) {
        assert(text.length <= ABOUT_COLS, `about width ${text.length}: ${text}`);
        assert(wrapText(text, 26).length === 1 && wrapText(text, 40).length === 1, `about rewrap ${text}`);
      }
    }
    assert(flat.includes(compact(MEDICAL)), 'medical');
    for (const key of Object.keys(SOURCE_INFORMATION)) assert(flat.includes(compact(SOURCE_INFORMATION[key])), `about ${key}`);
    for (const text of [...TESTING_FEEDBACK, ...ENGINE_FEEDBACK, ...PROMPT_FEEDBACK]) assert(flat.includes(compact(text)), `feedback ${text.slice(0, 24)}`);
    assert(flat.includes(compact(KIT_CREDITS)) && flat.includes('Kenney') && flat.includes('three.js') && flat.includes('Rapier'), 'kit');
    assert(flat.includes(compact(CREDITS_TEXT)), 'full credits');
    const aboutEngine = await Engine.headless(new World(new App({ storage: null, noHero: true })), { camera: CAMERA });
    try {
      const app = await boot(aboutEngine);
      choose(aboutEngine, app, 'start');
      choose(aboutEngine, app, 'about');
      assert(app.mode === 'about', app.mode);
      assert(app.state().rows[0] === 'next' && app.state().rows.includes('back'), app.state().rows.join(','));
      tap(aboutEngine, 'Enter');
      assert(app.aboutPage === 1, `next ${app.aboutPage}`);
      tap(aboutEngine, 'ArrowLeft');
      assert(app.aboutPage === 0, `left ${app.aboutPage}`);
      tap(aboutEngine, 'ArrowRight');
      assert(app.aboutPage === 1, `right ${app.aboutPage}`);
      const fullest = pages.reduce((best, page, i) => (page.lines.length > pages[best].lines.length ? i : best), 0);
      const drawPage = (index, width, height) => {
        aboutEngine.hud.sync({ width, height }, { cssWidth: width, cssHeight: height, offsetX: 0, offsetY: 0 });
        app.aboutPage = index;
        app.idle = 0;
        app.refresh(true);
        aboutEngine.step(1);
        const drawn = app.widgets.filter((w) => /^about-\d/.test(w.id));
        assert(drawn.length === pages[index].lines.length, `page ${index} drew ${drawn.length}/${pages[index].lines.length} at ${width}x${height}`);
        for (const w of app.widgets) {
          assert(w.x >= -0.5 && w.y >= -0.5 && w.x + w.w <= width + 0.5 && w.y + w.h <= height + 0.5, `${w.id} outside ${width}x${height}: ${w.x},${w.y} ${w.w}x${w.h}`);
        }
        const head = app.widgets.find((w) => w.id === 'head');
        const headW = 'About'.length * 6 * (width < 220 ? 1 : 2);
        const expectedX = Math.max(width < 200 ? 4 : 12, Math.floor((width - headW) / 2));
        assert(head && head.x === expectedX, `head x ${head?.x} wanted ${expectedX} at ${width}`);
      };
      drawPage(0, 480, 270);
      drawPage(fullest, 427, 240);
      drawPage(pages.length - 1, 427, 240);
      const usagePage = pages.findIndex((p) => p.lines.some((line) => line.includes('added on import')));
      assert(usagePage > 0, 'usage page');
      drawPage(usagePage, 427, 240);
    } finally {
      aboutEngine.dispose();
    }
    const interview = exitInterview();
    assert(interview.sourceInformation.usage === 'added on import', 'usage');
    assert(interview.testingFeedback.length === 4, 'testing feedback');
    assert(interview.engineFeedback.length === 6, 'engine feedback');
    assert(interview.promptFeedback.length === 4, 'prompt feedback');
    for (const key of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls', 'tags']) {
      assert(interview.aiHub[key], `aiHub ${key}`);
    }
    assert(interview.aiHub.name === TITLE, 'aiHub name');
    JSON.parse(JSON.stringify(interview));
    const hello = syllabify('hello', 'ounce');
    const hello2 = syllabify('hello', 'ounce');
    assert(JSON.stringify(hello.map((s) => s.vowel + s.cons)) === JSON.stringify(hello2.map((s) => s.vowel + s.cons)), 'stable word');
    const q = syllabify('Are you happy?', 'coach');
    const s = syllabify('Are you happy.', 'coach');
    assert(q[q.length - 1].f0 > s[s.length - 1].f0, 'question rises');
    const o = syllabify('Are you happy.', 'ounce');
    const c = syllabify('Are you happy.', 'coach');
    const mean = (list) => list.reduce((a, b) => a + b.f0, 0) / list.length;
    assert(mean(o) > mean(c), 'ounce higher');
    assert(syllabify('Kevin sat on me.', 'kevin').length === 0, 'kevin silent');
    for (const file of walk(path.join(devRoot, 'src'))) {
      const text = readFileSync(file, 'utf8');
      if (!text.includes('Math.random')) continue;
      assert(file.endsWith('drivers.js'), `Math.random in ${file}`);
      assert(text.includes('rand || Math.random'), 'drivers fallback only');
    }
  });

  await test('clips on the hero', async () => {
    const app = new App({ storage: null, noHero: false });
    const world = new World(app);
    const engine = await Engine.headless(world, { camera: CAMERA });
    try {
      engine.step(1);
      const model = world.heroModel;
      assert(model, 'hero model');
      for (const def of CLIPS) {
        const problems = validateClip(def, HERO_RIG);
        assert(problems.length === 0, `${def.name} validate ${problems.join(';')}`);
        const clip = compileClips([def], HERO_RIG, model)[0];
        const report = analyzeClip(model, HERO_RIG, def, clip);
        assert(report.problems.length === 0, `${def.name} analyze ${report.problems.join(';')}`);
      }
      const pelvis = model.getObjectByName('Pelvis');
      assert(pelvis, 'pelvis');
      const stood = pelvis.position.y;
      app.setDriver('expert');
      app.go('activity', 'squat');
      engine.step(40);
      assert(world.poseName === 'SquatRep', `pose ${world.poseName}`);
      assert(world.poseTime > 0.05, `pose time ${world.poseTime}`);
      assert(Math.abs(world.poseTime - app.sim.r * (world.poseAction.getClip().duration || 1)) < 0.02, `scrub ${world.poseTime} r ${app.sim.r}`);
      assert(world.shot === 'play', `shot ${world.shot}`);
      assert(Math.abs(pelvis.position.y - stood) > 0.04, `squat pelvis ${stood} -> ${pelvis.position.y}`);
      const shown = app.state();
      assert(shown.activityName === 'Squats of Regret', shown.activityName);
      assert(shown.widgets.some((w) => w.id === 'dial'), 'dial widget');
      assert(shown.widgets.some((w) => w.id === 'head'), 'name widget');
      const dial = shown.widgets.find((w) => w.id === 'dial');
      const hudW = engine.game?.ctx?.hud?.width || app.ctx?.hud?.width || 480;
      const hudH = engine.game?.ctx?.hud?.height || app.ctx?.hud?.height || 270;
      assert(dial.x >= -1 && dial.y >= -1 && dial.x + dial.w <= hudW + 1 && dial.y + dial.h <= hudH + 1, `dial box ${dial.x},${dial.y} ${dial.w}x${dial.h} hud ${hudW}x${hudH}`);
    } finally {
      engine.dispose();
    }
  });

  const host = await Engine.headless(new World(new App({ storage: null, noHero: true })), { camera: CAMERA });
  try {
    await test('boot title and music', async () => {
      const app = host.game ? host.game.app : null;
      const live = app && app.mode === 'title' ? app : await boot(host);
      host.step(2);
      const state = live.state();
      assert(state.title === TITLE, state.title);
      assert(state.mode === 'title', state.mode);
      assert(state.music === 0.1, `music ${state.music}`);
      assert(host.audio.volume.music === 0.1, `bus ${host.audio.volume.music}`);
      assert(state.rows.includes('start'), 'start row');
    });

    await test('every activity idle, sloppy, expert, drips, hard', async () => {
      const storage = memoryStorage();
      const app = await boot(host, { storage });
      app.guest = freshGuest('Sweep');
      const expertScore = {};
      for (const skill of ['idle', 'expert', 'sloppy']) {
        for (const def of ACTIVITIES) {
          app.guest.hard = false;
          app.setDriver(skill);
          app.go('activity', def.id);
          untilMode(host, app, 'results', 110 * 60, `${skill} ${def.id}`);
          const state = app.state();
          if (skill === 'idle') assert(state.stars === 0, `${def.id} idle ${state.stars}`);
          if (skill === 'expert') {
            assert(state.stars >= 2, `${def.id} expert ${state.stars} score ${state.score}`);
            if (def.easy) assert(state.stars === 3, `${def.id} easy ${state.stars}`);
            expertScore[def.id] = state.score;
          }
          if (skill === 'sloppy' && state.score > expertScore[def.id]) {
            assert(false, `${def.id} sloppy ${state.score} above expert ${expertScore[def.id]}`);
          }
          assert(state.lastDrips === dripsFor(state.stars, state.seconds, state.lastPrescription, app.tunables.dripRate), `${def.id} drips`);
          choose(host, app, 'back');
        }
      }
      app.guest.hard = true;
      app.setDriver('expert');
      for (const id of ['plank', 'tree', 'pier']) {
        app.go('activity', id);
        untilMode(host, app, 'results', 110 * 60, `hard ${id}`);
        assert(app.state().stars >= 2, `hard ${id} ${app.state().stars}`);
        choose(host, app, 'back');
      }
    });

    await test('pause, dev sliders, dev tools', async () => {
      const app = await boot(host);
      app.guest = freshGuest('Dev');
      app.setDriver('expert');
      app.go('activity', 'tree');
      host.step(30);
      const t0 = app.state().playT;
      const x0 = app.sim.dot.x;
      tap(host, 'KeyP');
      assert(app.mode === 'pause', app.mode);
      assert(host.timeScale === 0, 'paused scale');
      host.step(30);
      assert(app.sim.playT === t0, 'playT frozen');
      assert(app.sim.dot.x === x0, 'dot frozen');
      tap(host, 'ArrowDown');
      assert(app.state().row === 'restart', app.state().row);
      choose(host, app, 'resume');
      assert(host.timeScale === 1, 'resumed');
      host.step(20);
      assert(app.sim.playT > t0, 'playT moved');
      tap(host, 'KeyP');
      choose(host, app, 'dev');
      assert(app.mode === 'dev' && host.timeScale === 0, 'dev frozen');
      assert(app.sim.T === app.tunables, 'shared tunables');
      const dirty = {};
      for (const tab of Object.keys(TUNABLE_TABS)) {
        while (app.state().devTab !== tab) tap(host, 'KeyE');
        let guard = 0;
        const want = new Set(tabKeys(tab));
        while (want.size && guard++ < 6) {
          for (const id of app.state().rows) {
            if (!want.has(id)) continue;
            while (app.state().row !== id) tap(host, 'ArrowDown');
            const before = app.tunables[id];
            tap(host, 'ArrowRight');
            assert(app.tunables[id] !== before, `${id} did not move`);
            assert(app.sim.T[id] === app.tunables[id], `${id} not shared`);
            dirty[id] = app.tunables[id];
            want.delete(id);
          }
          if (want.size) choose(host, app, 'more');
        }
        assert(want.size === 0, `missed ${[...want].join(',')}`);
      }
      while (app.state().devTab !== 'Balance') tap(host, 'KeyQ');
      choose(host, app, 'reset-tab');
      for (const key of tabKeys('Balance')) assert(app.tunables[key] === DEFAULT_TUNABLES[key], `reset-tab ${key}`);
      assert(app.tunables.dripRate === dirty.dripRate, 'other tab kept');
      choose(host, app, 'reset-all');
      for (const key of Object.keys(DEFAULT_TUNABLES)) assert(app.tunables[key] === DEFAULT_TUNABLES[key], `reset-all ${key}`);
      while (app.state().devTab !== 'Tools') tap(host, 'KeyE');
      const dayBefore = app.guest.day;
      choose(host, app, 'day');
      assert(app.guest.day !== dayBefore, 'day tool');
      const dripsBefore = app.guest.drips;
      choose(host, app, 'drips');
      assert(app.guest.drips === dripsBefore + 50, 'drips tool');
      choose(host, app, 'unlock');
      assert(app.guest.unlockAll === true, 'unlock');
      choose(host, app, 'more');
      const driverBefore = app.driver;
      choose(host, app, 'auto');
      assert(app.driver !== driverBefore, 'auto');
      choose(host, app, 'god');
      assert(app.god === true && app.sim.god === true, 'god');
      choose(host, app, 'overlay');
      assert(app.overlay === true, 'overlay');
      choose(host, app, 'hud');
      assert(app.hideHud === true, 'hud');
      choose(host, app, 'hud');
      choose(host, app, 'more');
      choose(host, app, 'camera');
      assert(app.freeCam === true, 'camera');
      host.setCamera({ ...CAMERA }, { syncUrl: false });
      const lineBefore = app.dialogue;
      choose(host, app, 'line');
      assert(app.dialogue && app.dialogue !== lineBefore, 'line');
      choose(host, app, 'sound');
      assert(app.songPlaying || host.audio.counts, 'sound');
      choose(host, app, 'anim');
      assert(app.viewerClip, 'anim');
      choose(host, app, 'wipe');
      assert(app.guest === null, 'wipe');
      choose(host, app, 'more');
      choose(host, app, 'export');
      assert(typeof app.exported === 'string', 'export');
      while (!app.state().rows.includes('time')) choose(host, app, 'prev');
      choose(host, app, 'time');
      assert([0.25, 0.5, 1, 2, 3].includes(host.timeScale), `time ${host.timeScale}`);
      while (!app.state().rows.includes('jump')) choose(host, app, 'prev');
      choose(host, app, 'jump');
      assert(app.mode === 'activity', `jump ${app.mode}`);
      assert(app.activityId === ACTIVITIES[1].id, app.activityId);
      tap(host, 'KeyP');
      choose(host, app, 'dev');
      while (app.state().devTab !== 'Tools') tap(host, 'KeyE');
      choose(host, app, 'finish');
      assert(app.mode === 'results', app.mode);
      assert(app.state().stars === 1, `finish stars ${app.state().stars}`);
    });

    await test('attract, touch gate, session card', async () => {
      const app = await boot(host);
      assert(app.mode === 'title', app.mode);
      host.step(700);
      assert(app.mode === 'attract', `title attract ${app.mode}`);
      const seen = new Set();
      let guard = 0;
      while (seen.size < 10 && guard < 12000) {
        seen.add(app.activityId);
        host.step(120);
        guard += 120;
      }
      for (const id of ['tree', 'hoop', 'header', 'step', 'slack', 'tray', 'pier', 'jog', 'squat', 'longstand']) {
        assert(seen.has(id), `attract missed ${id}`);
      }
      tap(host, 'Enter');
      assert(app.mode === 'title', `attract exit ${app.mode}`);
      choose(host, app, 'start');
      choose(host, app, 'settings');
      host.step(700);
      assert(app.mode === 'attract', `settings attract ${app.mode}`);
      tap(host, 'Enter');
      app.setDriver('expert');
      app.guest = freshGuest('Play');
      app.go('activity', 'tree');
      host.step(800);
      assert(app.mode === 'activity', `play attract ${app.mode}`);
      tap(host, 'KeyP');
      choose(host, app, 'settings');
      assert(app.frozen === true, 'settings from pause stays frozen');
      host.step(700);
      assert(app.mode === 'settings', `pause settings attracted ${app.mode}`);

      const touch = await boot(host, { touchOnly: true });
      assert(touch.state().touchMessage === 'Controller or keyboard required', touch.state().touchMessage);
      tap(host, 'MouseLeft');
      assert(touch.mode === 'title', `touch confirm ${touch.mode}`);
      tap(host, 'Enter');
      assert(touch.touchOnly === false, 'key clears the gate');

      const card = await boot(host, { session: { players: [{ name: 'Ada' }] } });
      assert(card.mode === 'card', card.mode);
      host.step(700);
      assert(card.mode === 'card', `session attract ${card.mode}`);
    });

    await test('family hour and medley ghost', async () => {
      const pads = [null, null, null, null];
      Object.defineProperty(globalThis.navigator, 'getGamepads', { configurable: true, writable: true, value: () => pads });
      const app = await boot(host);
      choose(host, app, 'start');
      choose(host, app, 'family');
      assert(app.mode === 'join', app.mode);
      const claim = (index, axis) => {
        pads[index] = {
          connected: true,
          axes: [axis, 0, 0, 0],
          buttons: [{ pressed: true, value: 1 }, ...Array.from({ length: 15 }, () => ({ pressed: false, value: 0 }))],
        };
        host.step(1);
      };
      claim(0, 0.9);
      claim(1, -0.9);
      tap(host, 'Enter');
      assert(app.mode === 'join', `join ate the claim ${app.mode} ${app.state().row}`);
      const kinds = app.seats.map((s) => s && s.kind);
      assert(kinds[0] === 'pad' && kinds[1] === 'pad' && kinds[2] === 'key', kinds.join(','));
      choose(host, app, 'start');
      assert(app.mode === 'medley', app.mode);
      assert(app.lanes.length === 3, `lanes ${app.lanes.length}`);
      host.input.setKey('ArrowRight', true);
      host.step(120);
      host.input.setKey('ArrowRight', false);
      host.step(1);
      const pos = app.lanes.map((lane) => lane.pos);
      assert(new Set(pos.map((n) => n.toFixed(3))).size === 3, `lanes alike ${pos.join(',')}`);

      app.go('medley', { bots: true, ghost: true, skills: ['expert', 'good', 'average', 'sloppy'] });
      const ghost = app.lanes.find((lane) => lane.kind === 'ghost');
      assert(ghost && ghost.simulated === false, 'ghost simulated');
      ghost.ghost.push({ a: 1, x: 0.4, y: -0.2, c: 0, t: 1, s: 0 });
      host.step(5);
      assert(ghost.dot.t === 0, `ghost dot stepped ${ghost.dot.t}`);
      assert(ghost.steps === 0, 'ghost steps');
      assert(ghost.hidden === true, 'ghost hidden on other event');
      let guard = 0;
      while (app.mode === 'medley' && guard < 13000) {
        host.step(180);
        guard += 180;
        if (guard % 1080 === 0) beat(`medley ${app.medleyT.toFixed(1)}`);
      }
      assert(app.mode === 'podium', app.mode);
      for (const lane of app.lanes) {
        if (lane.kind === 'ghost') {
          assert(lane.dot.t === 0, 'ghost dot after medley');
          continue;
        }
        for (const score of lane.scores) assert(score >= 0 && score <= 1000, `score ${score}`);
      }
    });

    await test('hub clock progress and result', async () => {
      const handlers = {};
      const calls = [];
      const hub = {
        on(ev, fn) { (handlers[ev] ||= []).push(fn); },
        emit(ev, arg) { (handlers[ev] || []).forEach((fn) => fn(arg)); },
        send(data) { calls.push(['send', data]); },
        progress(data) { calls.push(['progress', data]); },
        result(data) { calls.push(['result', data]); },
        time() { return this.t; },
        t: -4000,
      };
      const app = await boot(host);
      try {
        app.bindHub(hub);
        hub.emit('start');
        assert(app.mode === 'medley', app.mode);
        assert(calls.some((c) => c[0] === 'progress' && c[1].score === 0), 'progress at 0');
        assert(calls.some((c) => c[0] === 'send'), 'send at start');
        host.step(10);
        assert(app.medleyT === 0, `countdown moved ${app.medleyT}`);
        hub.t = 2000;
        host.step(5);
        assert(Math.abs(app.medleyT - 2) < 0.05, `hub clock ${app.medleyT}`);
        app.ghostMessage({ a: 0, x: 0.8, y: 0.1, c: 0, t: 0, s: 0 }, 3);
        host.step(8);
        const shown = app.lanes.find((lane) => lane.kind === 'ghost');
        assert(shown && shown.dot.t === 0, 'message ghost not simulated');
        assert(shown.ghost.shown.x > 0, 'ghost lerped');
        hub.emit('time-up');
        hub.emit('time-up');
        assert(calls.filter((c) => c[0] === 'result').length === 1, 'one result');
        hub.emit('end');
        assert(app.hubEnded === true, 'ended');
      } finally {
        hub.emit('end');
        if (app._hubTimer) clearInterval(app._hubTimer);
      }
    });

    await test('saves, corrupt storage, scripted week', async () => {
      const storage = memoryStorage();
      let app = await boot(host, { storage });
      app.setDriver('expert');
      choose(host, app, 'start');
      choose(host, app, 'week');
      choose(host, app, 'slot0');
      assert(app.mode === 'name', app.mode);
      tap(host, 'Backspace');
      tap(host, 'Backspace');
      for (const ch of 'ada') tap(host, `Key${ch.toUpperCase()}`);
      choose(host, app, 'done');
      assert(app.mode === 'ferry', app.mode);
      assert(app.guest.name === 'Guestada' || app.guest.name.length <= 8, app.guest.name);
      choose(host, app, 'board');
      untilMode(host, app, 'question', 1200, 'weigh1');
      const savedName = app.guest.name;
      const reloaded = new App({ storage, noHero: true });
      await host.loadGame(new World(reloaded));
      host.step(2);
      choose(host, reloaded, 'start');
      choose(host, reloaded, 'week');
      choose(host, reloaded, 'slot0');
      assert(reloaded.guest && reloaded.guest.name === savedName, 'reload name');
      assert(reloaded.mode === 'weigh', `reload mode ${reloaded.mode}`);
      untilMode(host, reloaded, 'question', 1200, 'reweigh');
      choose(host, reloaded, 'a0');
      choose(host, reloaded, 'onward');
      app = reloaded;
      app.setDriver('expert');

      const play = async (station, id) => {
        if (app.islandPage !== 0) choose(host, app, 'back');
        choose(host, app, `st-${station}`);
        choose(host, app, `act-${id}`);
        untilMode(host, app, 'results', 110 * 60, id);
        const state = app.state();
        choose(host, app, 'back');
        return state;
      };
      const visit = (station) => {
        if (app.islandPage !== 0) choose(host, app, 'back');
        choose(host, app, `st-${station}`);
        assert(app.mode === 'station', station);
        choose(host, app, 'back');
      };
      const sleep = () => {
        if (app.islandPage === 0) choose(host, app, 'more');
        choose(host, app, 'hammock');
        choose(host, app, 'rest');
        choose(host, app, 'sleep');
      };
      const morning = () => {
        untilMode(host, app, 'question', 1200, `morning ${app.guest.day}`);
        choose(host, app, 'a0');
        assert(app.mode === 'reveal', app.mode);
        const last = app.guest.chart[app.guest.chart.length - 1];
        assert(last.shown === last.trueAge + 7, `shown ${last.shown} true ${last.trueAge}`);
        choose(host, app, 'onward');
        assert(app.mode === 'island', app.mode);
      };

      let tree = await play('pavilion', 'tree');
      assert(tree.lastDrips === dripsFor(tree.stars, tree.seconds, tree.lastPrescription, app.tunables.dripRate), 'tree drips');
      assert(tree.lastPrescription === false, 'pair not done yet');
      const squat = await play('shed', 'squat');
      assert(squat.lastPrescription === true, 'day 1 pair');
      sleep();
      morning();

      const warrior = await play('pavilion', 'warrior');
      assert(warrior.stars >= 2, `day 2 stars ${warrior.stars}`);
      assert(warrior.lastPrescription === true, 'day 2 goal');
      if (app.islandPage === 0) choose(host, app, 'more');
      choose(host, app, 'jar');
      choose(host, app, 'back');
      choose(host, app, 'locker');
      choose(host, app, 'back');
      choose(host, app, 'hall');
      choose(host, app, 'back');
      sleep();
      morning();

      const heron = await play('pavilion', 'heron');
      assert(heron.lastPrescription === true, 'day 3 fresh');
      sleep();
      morning();

      visit('plaza');
      visit('jog');
      await play('pavilion', 'tree');
      await play('shed', 'squat');
      const hoop = await play('beach', 'hoop');
      assert(hoop.lastPrescription === true, 'day 4 count');
      sleep();
      morning();

      const tray = await play('lagoon', 'tray');
      assert(tray.lastPrescription === true, `day 5 beat score ${tray.score}`);
      sleep();
      morning();

      const third = await play('pavilion', 'tree');
      assert(third.stars === 3, `day 6 stars ${third.stars}`);
      assert(third.lastPrescription === true, 'day 6 goal');
      sleep();
      morning();

      if (app.islandPage === 0) choose(host, app, 'more');
      choose(host, app, 'longstand');
      untilMode(host, app, 'results', 110 * 60, 'longstand');
      const long = app.state();
      assert(long.lastPrescription === true, 'day 7 long stand');
      choose(host, app, 'back');
      const before = app.guest.chart.map((p) => ({ ...p }));
      assert(before.length >= 7, `chart ${before.length}`);
      sleep();
      assert(app.mode === 'confession', app.mode);
      choose(host, app, 'onward');
      assert(app.guest.confessed === true, 'confessed');
      assert(app.mode === 'credits', app.mode);
      app.guest.chart.forEach((point, i) => {
        assert(point.trueAge === before[i].trueAge, 'true age changed');
        assert(point.shown === before[i].shown - 7, `shown delta ${point.shown}`);
        assert(point.shown === point.trueAge, 'shown is true after');
      });
      const items = milestonesReached(app.guest.drips).map((item) => item.id);
      assert(JSON.stringify(app.guest.items) === JSON.stringify(items), 'jar items');
      choose(host, app, 'onward');
      assert(app.guest.day === 8 && app.guest.week === 2, `week 2 ${app.guest.day}/${app.guest.week}`);
      assert(app.mode === 'weigh', `week 2 mode ${app.mode}`);

      storage.setItem(SAVE_KEY, '{');
      const corrupt = new Save(storage);
      assert(corrupt.read().slots.every((slot) => slot == null), 'corrupt json');
      storage.setItem(SAVE_KEY, JSON.stringify({ v: 99, slots: [{ name: 'nope' }] }));
      assert(new Save(storage).read().slots[0] == null, 'bad version');
      const throwing = {
        getItem() { throw new Error('closed'); },
        setItem() { throw new Error('closed'); },
        removeItem() { throw new Error('closed'); },
      };
      const fallen = new Save(throwing);
      assert(fallen.memory === true, 'memory fallback');
      assert(fallen.write({ v: 1, slots: [null, null, null], settings: null }) === true, 'memory write');
      const empty = new Save(null);
      empty.write({ v: 1, slots: [freshGuest('Mem'), null, null], settings: null });
      assert(empty.read().slots[0].name === 'Mem', 'null storage');
    });

    await test('replay fingerprint', async () => {
      const app = await boot(host);
      host.step(20);
      tap(host, 'Enter');
      host.step(15);
      const fp = host.fingerprint();
      const rec = host.recording();
      assert(rec && rec.frames.length > 10, 'recording');
      await host.replay(rec, () => host.loadGame(new World(new App({ storage: null, noHero: true }))));
      assert(host.fingerprint() === fp, `replay ${host.fingerprint()} vs ${fp}`);
    });
  } finally {
    host.dispose();
  }

  if (!fast) {
    await test('browser, shots, and hub', async () => {
      execFileSync(process.execPath, ['tools/build.mjs'], { cwd: devRoot, stdio: ['ignore', 'pipe', 'pipe'] });
      const { runBrowser } = await import('./browser.mjs');
      const problems = await runBrowser({ devRoot, scratch: SCRATCH });
      if (problems.length) throw new Error(problems.join('\n'));
    });
  }

  if (fails.length) {
    for (const fail of fails) console.log(`FAIL ${fail}`);
    console.log(`${total - fails.length}/${total} passed`);
    process.exitCode = 1;
    return;
  }
  console.log(`${total}/${total} passed`);
}

main().catch((err) => {
  console.log(`FAIL runner: ${err?.stack || err}`);
  console.log(`0/${total} passed`);
  process.exitCode = 1;
});
