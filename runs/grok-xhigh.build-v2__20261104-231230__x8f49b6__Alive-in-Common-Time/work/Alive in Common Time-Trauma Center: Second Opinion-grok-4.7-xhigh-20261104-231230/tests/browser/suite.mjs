import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, webkit, devices } from 'playwright';
import { GAME_TITLE } from '../../src/config/identity.js';
import { TUNING_DEFAULTS } from '../../src/config/tuning.js';
import { DEV_IDS } from '../../src/app/dev.js';
import { TRACK_IDS } from '../../src/audio/music.js';
import { EFFECT_IDS } from '../../src/audio/sfx.js';
import { VOICE_IDS } from '../../src/audio/voice.js';

const devRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workRoot = path.resolve(devRoot, '..');
const HASH = '529eac78c54cfff0e60d375a9c63f66d1a594327ddcc262a2bdf9b1f2fb6582a';
const GPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader'];
const PAD = `(() => {
  const mk = (i) => ({
    id: 'Stub DualSense (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', timestamp: 0,
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })),
    vibrationActuator: null,
  });
  window.__pads = [mk(0), mk(1)];
  navigator.getGamepads = () => [window.__pads[0], window.__pads[1], null, null];
})();`;

function filesUnder(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) filesUnder(p, out);
    else if (/\.(js|json|css|md)$/.test(name)) out.push(p);
  }
  return out;
}

function findHtml() {
  const name = readdirSync(workRoot).find((file) => file.endsWith('-Trauma Center: Second Opinion-grok-4.7-xhigh-20261104-231230.html'));
  if (!name) throw new Error('root html is missing');
  return path.join(workRoot, name);
}

function pageUrl(file, query) {
  const url = pathToFileURL(file);
  url.search = query;
  return url.href;
}

function clientSlice(html) {
  const start = html.indexOf('/*! aihub-session ');
  const endMark = '})(typeof window !== \'undefined\' ? window : globalThis);';
  const end = html.indexOf(endMark);
  if (start < 0 || end < 0) return '';
  return html.slice(start, end + endMark.length).replace(/\r\n/g, '\n');
}

function packaging(check) {
  const htmlPath = findHtml();
  const html = readFileSync(htmlPath, 'utf8');
  const slice = clientSlice(html);
  check('client hash', createHash('sha256').update(slice).digest('hex') === HASH, 'banner slice hash');
  check('banner once', html.split('/*! aihub-session ').length === 2, 'banner count');
  check('no external script', !/<script[^>]+src=/i.test(html), 'script src');
  check('no external font', !/fonts\.googleapis|url\(\s*https?:/i.test(html), 'font url');
  check('hub type', html.includes('<meta name="hub:type" content="Game">'), 'type');
  check('hub players', html.includes('<meta name="hub:players" content="1–4">'), 'players');
  check('hub source', html.includes('<meta name="hub:source" content="Trauma Center: Second Opinion">'), 'source');
  check('session players', html.includes('<meta name="hub:session-players" content="1-4">'), 'session players');
  check('session mode', html.includes('<meta name="hub:session-mode" content="shared-world">'), 'mode');
  check('title in the page', html.includes(GAME_TITLE), 'title missing from the built page');
  const banned = ['TODO', 'FIXME', 'placeholder', 'stub'];
  for (const file of filesUnder(path.join(devRoot, 'src'))) {
    const text = readFileSync(file, 'utf8');
    const rel = path.relative(devRoot, file);
    if (!rel.endsWith('src/config/identity.js') && text.includes(GAME_TITLE)) {
      check('title only in identity', false, rel);
    }
    for (const word of banned) {
      if (text.includes(word)) check('no unfinished marks', false, `${rel} ${word}`);
    }
    if (rel.startsWith('src/sim') && text.includes('Math.random')) check('no Math.random in sim', false, rel);
    if (/\.(mp3|ogg|wav|flac|m4a)\b/.test(text)) check('no audio files', false, rel);
  }
  check('packaging read', true, '');
}

function watch(page, sink) {
  page.on('pageerror', (err) => sink.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') sink.push(msg.text());
  });
}

async function boot(browser, file, query, extra = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...extra });
  await context.addInitScript(PAD);
  const page = await context.newPage();
  const errors = [];
  watch(page, errors);
  await page.goto(pageUrl(file, query), { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game && window.__game.state, null, { timeout: 30000 });
  return { context, page, errors };
}

async function press(page, key) {
  await page.keyboard.press(key);
  await page.evaluate(() => window.__game.test.step(1));
}

async function scripted(file, check) {
  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page, errors } = await boot(browser, file, '?test=1&norender=1');
    page.setDefaultTimeout(120000);
    const visited = new Set();
    const noteReached = async () => {
      const names = await page.evaluate(() => window.__game?.state?.().reached || []);
      for (const name of names) visited.add(name);
    };
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.state?.().screen === 'Title');
    const t0 = Date.now();
    await page.waitForFunction(() => window.__game.state().attract === true, null, { timeout: 13000 });
    const waited = Date.now() - t0;
    check('attract at 10s', waited >= 9000 && waited <= 11000, `${waited}ms`);
    const ops = new Set();
    const until = Date.now() + 8000;
    while (Date.now() < until) {
      const op = await page.evaluate(() => window.__game.state().op);
      if (op) ops.add(op);
      await page.waitForTimeout(400);
    }
    check('attract shows operations', ops.size >= 3, [...ops].join(','));
    const before = await page.evaluate(() => localStorage.getItem('st-alder-chart'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__game.state().attract === false, null, { timeout: 3000 });
    const after = await page.evaluate(() => localStorage.getItem('st-alder-chart'));
    check('attract writes no save', before === after, String(after));
    check('music gain', await page.evaluate(() => Math.abs(window.__game.state().musicGain - 0.1) < 0.002), 'gain');

    await page.evaluate(() => window.__game.test.skipTo('broken-glass'));
    await page.evaluate(() => { window.__game.state().tuning.aimAssist = 0; });
    await page.keyboard.down('KeyD');
    await page.evaluate(() => window.__game.test.step(60));
    await page.keyboard.up('KeyD');
    const keyMove = await page.evaluate(() => {
      const st = window.__game.state();
      return { dx: st.tips[0].x - -1.05, speed: st.tuning.tipSpeed, tool: st.tool };
    });
    check('keyboard aim', Math.abs(keyMove.dx - keyMove.speed) <= keyMove.speed * 0.05, JSON.stringify(keyMove));

    await page.keyboard.down('Digit1');
    await page.evaluate(() => window.__game.test.step(1));
    await page.keyboard.up('Digit1');
    check('key 1 selects scalpel', (await page.evaluate(() => window.__game.state().tool)) === 'scalpel', 'tool');

    await page.evaluate(() => {
      window.__pads[0].axes[0] = 1;
      window.__pads[0].axes[1] = 0;
      window.__game.test.step(1);
      window.__pads[0].axes[0] = 0;
    });
    check('left stick tool', (await page.evaluate(() => window.__game.state().tool)) === 'suction', 'tool');

    await page.evaluate(() => window.__game.test.skipTo('broken-glass'));
    await page.evaluate(() => { window.__game.state().tuning.aimAssist = 0; });
    const padMove = await page.evaluate(() => {
      const x0 = window.__game.state().tips[0].x;
      window.__pads[0].axes[2] = 1;
      window.__pads[0].axes[3] = 0;
      window.__game.test.step(60);
      window.__pads[0].axes[2] = 0;
      const st = window.__game.state();
      return { dx: st.tips[0].x - x0, speed: st.tuning.tipSpeed, set: document.documentElement.dataset.promptSet };
    });
    check('pad aim', Math.abs(padMove.dx - padMove.speed) <= padMove.speed * 0.05, JSON.stringify(padMove));
    check('prompt follows pad', padMove.set === 'playstation', padMove.set);

    const use = await page.evaluate(() => {
      window.__pads[0].buttons[7] = { pressed: true, touched: true, value: 0.62 };
      window.__game.test.step(1);
      const value = window.__game.state().tips[0].use;
      window.__pads[0].buttons[7] = { pressed: false, touched: false, value: 0 };
      window.__game.test.step(1);
      return value;
    });
    check('R2 reaches the sim', Math.abs(use - 0.62) < 0.02, String(use));

    await page.keyboard.press('KeyA');
    await page.evaluate(() => window.__game.test.step(1));
    check('prompt follows keyboard', (await page.evaluate(() => document.documentElement.dataset.promptSet)) === 'keyboard', 'set');

    const box = await page.locator('#view').boundingBox();
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.4);
    await page.evaluate(() => window.__game.test.step(2));
    const mouse = await page.evaluate(() => window.__game.state().tips[0]);
    check('mouse aims', Math.hypot(mouse.x + 1.05, mouse.y - 0.62) > 0.25, JSON.stringify(mouse));

    await press(page, 'Escape');
    check('pause from operation', (await page.evaluate(() => document.body.innerText.includes('Dev Mode'))), 'pause items');
    for (let i = 0; i < 4; i++) await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('dev opens from pause', await page.evaluate(() => window.__game.state().devOpen), 'dev');
    for (let i = 0; i < 24 && !(await page.evaluate(() => document.body.innerText.includes('tipSpeed'))); i++) {
      await press(page, 'KeyE');
    }
    const beforeSpeed = await page.evaluate(() => window.__game.state().tuning.tipSpeed);
    await press(page, 'ArrowRight');
    const afterSpeed = await page.evaluate(() => window.__game.state().tuning.tipSpeed);
    check('slider changes tuning', afterSpeed > beforeSpeed + 0.05, `${beforeSpeed} -> ${afterSpeed}`);
    await press(page, 'Escape');
    await press(page, 'Escape');
    await page.evaluate(() => { window.__game.state().tuning.aimAssist = 0; });
    const sped = await page.evaluate(() => {
      window.__pads[0].axes[2] = -1;
      window.__pads[0].axes[3] = 0;
      window.__game.test.step(90);
      const x0 = window.__game.state().tips[0].x;
      window.__pads[0].axes[2] = 1;
      window.__game.test.step(60);
      window.__pads[0].axes[2] = 0;
      const st = window.__game.state();
      const dx = st.tips[0].x - x0;
      return { dx, speed: st.tuning.tipSpeed, x0, x1: st.tips[0].x };
    });
    check('slider changes the sim', Math.abs(sped.dx - sped.speed) <= Math.abs(sped.speed) * 0.05, JSON.stringify(sped));
    await page.evaluate(() => window.__game.devRun('reset-all'));
    const restored = await page.evaluate((defaults) => {
      const live = window.__game.state().tuning;
      return Object.keys(defaults).every((key) => live[key] === defaults[key]);
    }, TUNING_DEFAULTS);
    check('reset restores defaults', restored, 'tuning');

    const toolErrors = await page.evaluate(async (ids) => {
      const bad = [];
      for (const id of ids) {
        try {
          window.__game.devRun('op:broken-glass');
          window.__game.devRun(id);
        } catch (err) {
          bad.push(`${id}: ${err.message}`);
        }
      }
      return bad;
    }, DEV_IDS);
    check('dev tools run', toolErrors.length === 0, toolErrors.join('; '));

    await press(page, 'Escape');
    for (let i = 0; i < 5; i++) await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('quit reaches menu', (await page.evaluate(() => window.__game.state().screen)) === 'Main Menu', 'screen');

    await page.hover('[data-item="free"]');
    check('hover moves focus', (await page.evaluate(() => window.__game.state().focusId)) === 'free', 'focus');
    await page.click('[data-item="free"]');
    check('click opens free play', (await page.evaluate(() => window.__game.state().screen)) === 'Free Play', 'screen');
    await press(page, 'Escape');

    for (let i = 0; i < 4; i++) await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('about opens', (await page.evaluate(() => window.__game.state().screen)) === 'About', 'screen');
    const aboutText = await page.evaluate(() => document.body.innerText);
    check('about headings', ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Credits'].every((h) => aboutText.includes(h)), 'headings');
    const aboutOk = await page.evaluate(() => {
      const data = JSON.parse(document.getElementById('about-data').textContent);
      return ['sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'credits'].every((k) => k in data);
    });
    check('about-data parses', aboutOk, 'json');
    await press(page, 'Escape');

    for (let i = 0; i < 3; i++) await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('settings opens', (await page.evaluate(() => window.__game.state().screen)) === 'Settings', 'screen');
    await press(page, 'KeyE');
    await press(page, 'Enter');
    check('glyphs switch to xbox', (await page.evaluate(() => window.__game.state().glyphSet)) === 'xbox', 'glyphs');
    await page.evaluate(() => {
      window.__pads[0].buttons[7] = { pressed: true, touched: true, value: 0.4 };
      window.__game.test.step(1);
      window.__pads[0].buttons[7] = { pressed: false, touched: false, value: 0 };
    });
    check('xbox prompt set', (await page.evaluate(() => document.documentElement.dataset.promptSet)) === 'xbox', 'set');
    const saved = await page.evaluate(() => localStorage.getItem('st-alder-chart'));
    await noteReached();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.state?.().screen === 'Title' && window.__game.state().glyphSet === 'xbox');
    check('save survives reload', saved && (await page.evaluate(() => localStorage.getItem('st-alder-chart'))) === saved, 'storage');

    await press(page, 'Enter');
    await press(page, 'ArrowDown');
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    check('lobby opens', (await page.evaluate(() => window.__game.state().screen)) === 'Lobby', 'screen');
    await page.evaluate(() => {
      window.__pads[0].buttons[0] = { pressed: true, touched: true, value: 1 };
      window.__pads[1].buttons[0] = { pressed: true, touched: true, value: 1 };
      window.__game.test.step(1);
      window.__pads[0].buttons[0] = { pressed: false, touched: false, value: 0 };
      window.__pads[1].buttons[0] = { pressed: false, touched: false, value: 0 };
      window.__game.test.step(1);
    });
    await press(page, 'Enter');
    const couch = await page.evaluate(() => {
      window.__game.state().tuning.aimAssist = 0;
      window.__pads[0].axes[2] = 1;
      window.__pads[1].axes[2] = -1;
      window.__game.test.step(40);
      window.__pads[0].axes[2] = 0;
      window.__pads[1].axes[2] = 0;
      const tips = window.__game.state().tips;
      window.__game.test.bot(true);
      window.__game.test.step(2400);
      const later = window.__game.state().tips;
      return {
        screen: window.__game.state().screen,
        dx: tips.map((t) => t.x),
        scores: later.filter((t) => t.id === 0 || t.id === 1).map((t) => t.score),
      };
    });
    check('two tips move', couch.dx[0] > couch.dx[1] + 0.4, JSON.stringify(couch.dx));
    check('both seats score', couch.scores.length === 2 && couch.scores.every((n) => n > 0), JSON.stringify(couch.scores));

    await page.evaluate(() => {
      window.__game.devRun('op:broken-glass');
      window.__game.devRun('fail');
    });
    check('fail screen', (await page.evaluate(() => window.__game.state().screen)) === 'Fail', 'screen');

    const quiet = await page.evaluate(async (lists) => {
      const silent = [];
      for (const id of lists.tracks) {
        const peak = await window.__game.audio.renderOffline('music', id);
        if (!(peak > 0.001)) silent.push(`music ${id}`);
      }
      for (const id of lists.effects) {
        const peak = await window.__game.audio.renderOffline('effect', id);
        if (!(peak > 0.001)) silent.push(`effect ${id}`);
      }
      for (const id of lists.voices) {
        const peak = await window.__game.audio.renderOffline('voice', id, 'Count with me');
        if (!(peak > 0.001)) silent.push(`voice ${id}`);
      }
      return silent;
    }, { tracks: TRACK_IDS, effects: EFFECT_IDS, voices: VOICE_IDS });
    check('audio is not silent', quiet.length === 0, quiet.join(', '));

    await noteReached();
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.state?.().screen === 'Title');
    await press(page, 'Enter');
    await press(page, 'Space');
    await press(page, 'Enter');
    const deadline = Date.now() + 240000;
    let guard = 0;
    while (Date.now() < deadline && guard < 500) {
      guard += 1;
      const screen = await page.evaluate(() => window.__game.state().screen);
      if (screen === 'Credits roll') break;
      if (screen === 'Fail') {
        const info = await page.evaluate(() => window.__game.state());
        check('playthrough stays up', false, `${info.op} ${info.phase} vitals ${info.vitals}`);
        break;
      }
      if (screen === 'Story') await press(page, 'Tab');
      else if (screen === 'Chart' || screen === 'Report') await press(page, 'Enter');
      else if (screen === 'Operation') {
        await page.evaluate(() => {
          window.__game.test.bot(true);
          window.__game.test.step(900);
        });
      } else await page.evaluate(() => window.__game.test.step(1));
    }
    await noteReached();
    const reached = [...visited];
    for (const name of ['Title', 'Main Menu', 'Story', 'Chart', 'Operation', 'Report', 'Credits roll', 'Fail', 'Free Play', 'Lobby', 'Settings', 'About']) {
      check(`reached ${name}`, reached.includes(name), reached.join(','));
    }
    check('page errors', errors.length === 0, errors.slice(0, 4).join(' | '));
    await context.close();
  } finally {
    await browser.close();
  }
}

async function touchFlow(kind, file, check) {
  const browser = kind === 'webkit'
    ? await webkit.launch({ headless: true })
    : await chromium.launch({ headless: true });
  try {
    const profile = devices[kind === 'webkit' ? 'iPhone 15' : 'Pixel 7'];
    const { context, page, errors } = await boot(browser, file, '?test=1&norender=1', profile);
    await page.waitForFunction(() => window.__game.state().screen === 'Touch notice' || window.__game.state().screen === 'Title', null, { timeout: 15000 });
    const screen = await page.evaluate(() => window.__game.state().screen);
    const text = await page.evaluate(() => document.body.innerText);
    check(`${kind} touch notice`, screen === 'Touch notice' && text.includes('Controller or keyboard required'), `${screen} ${text.slice(0, 80)}`);
    await page.locator('[data-item="settings"]').tap();
    check(`${kind} settings tap`, (await page.evaluate(() => window.__game.state().screen)) === 'Settings', 'screen');
    await press(page, 'Escape');
    const t0 = Date.now();
    await page.waitForFunction(() => window.__game.state().attract === true, null, { timeout: 13000 });
    check(`${kind} attract`, Date.now() - t0 >= 9000 && Date.now() - t0 <= 11000, 'timing');
    check(`${kind} attract keeps the notice`, (await page.evaluate(() => document.body.innerText.includes('Controller or keyboard required'))), 'copy');
    await page.evaluate(() => {
      window.__pads[0].buttons[0] = { pressed: true, touched: true, value: 1 };
    });
    await page.waitForFunction(() => window.__game.state().attract === false, null, { timeout: 3000 });
    await page.evaluate(() => {
      window.__pads[0].buttons[0] = { pressed: false, touched: false, value: 0 };
      window.__game.test.step(1);
      window.__pads[0].buttons[0] = { pressed: true, touched: true, value: 1 };
      window.__game.test.step(1);
    });
    check(`${kind} pad leaves notice`, (await page.evaluate(() => window.__game.state().screen)) === 'Title', 'screen');
    check(`${kind} page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await context.close();
  } finally {
    await browser.close();
  }
}

async function backendBoot(file, check, { name, engine, args, query, want }) {
  const browser = engine === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ headless: true, args });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const errors = [];
    watch(page, errors);
    await page.goto(pageUrl(file, query), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game && window.__game.state && window.__game.state().screen !== 'Boot', null, { timeout: 60000 });
    const shot = await page.screenshot();
    const state = await page.evaluate(() => window.__game.state());
    check(`${name} boots`, state.screen === 'Title' || documentTitle(state), state.screen);
    if (want) check(`${name} backend`, state.renderBackend === want, state.renderBackend);
    check(`${name} shot`, shot.length > 12000, `${shot.length} bytes`);
    check(`${name} errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    await context.close();
  } finally {
    await browser.close();
  }
}

function documentTitle(state) {
  return state.screen === 'Title' || state.screen === 'Touch notice';
}

export async function browserTests() {
  const fails = [];
  let passed = 0;
  const check = (name, ok, detail) => {
    if (ok) passed += 1;
    else fails.push(`${name}: ${detail || 'failed'}`);
  };
  const file = findHtml();
  try { packaging(check); } catch (err) { fails.push(`packaging: ${err.stack || err.message}`); }
  try { await scripted(file, check); } catch (err) { fails.push(`scripted: ${err.stack || err.message}`); }
  try { await touchFlow('chromium', file, check); } catch (err) { fails.push(`pixel: ${err.stack || err.message}`); }
  try { await touchFlow('webkit', file, check); } catch (err) { fails.push(`iphone: ${err.stack || err.message}`); }
  try { await backendBoot(file, check, { name: 'webgpu', engine: 'chromium', args: GPU, query: '', want: 'webgpu' }); }
  catch (err) { fails.push(`webgpu: ${err.stack || err.message}`); }
  try { await backendBoot(file, check, { name: 'webgl', engine: 'chromium', args: [], query: '?webgl=1', want: 'webgl2' }); }
  catch (err) { fails.push(`webgl: ${err.stack || err.message}`); }
  try { await backendBoot(file, check, { name: 'webkit', engine: 'webkit', args: [], query: '', want: null }); }
  catch (err) { fails.push(`webkit: ${err.stack || err.message}`); }
  return { fails, passed };
}
