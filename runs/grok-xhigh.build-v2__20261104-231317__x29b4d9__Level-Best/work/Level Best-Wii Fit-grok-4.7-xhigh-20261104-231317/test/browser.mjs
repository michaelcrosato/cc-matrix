import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRACKS, STINGS } from '../src/audio/tracks.js';
import { SFX } from '../src/audio/sfx.js';
import { VOICES } from '../src/audio/voice.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = path.resolve(root, '..');
const htmlName = 'Level Best-Wii Fit-grok-4.7-xhigh-20261104-231317.html';
const htmlPath = path.join(work, htmlName);
const scratch = '/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-231317__x29b4d9/tmp/grok-goal-cfc5772a1498/implementer';
const RENDER = [
  '--enable-unsafe-webgpu',
  '--enable-features=Vulkan',
  '--use-webgpu-adapter=swiftshader',
  '--use-vulkan=swiftshader',
  '--use-angle=swiftshader',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--autoplay-policy=no-user-gesture-required',
];

function assert(cond, message) {
  if (!cond) throw new Error(message || 'assertion failed');
}

function fileUrl(query) {
  return `file://${htmlPath}${query || ''}`;
}

async function openLogic(browser, query, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err.message || err)));
  await page.goto(fileUrl(query));
  await page.waitForFunction(() => window.__TEST__, null, { timeout: 30000 });
  return { context, page, errors };
}

export async function audioTests() {
  const tests = [];
  tests.push(['music bus is 0.10 and offline renders stay finite', async () => {
    assert(existsSync(htmlPath), 'built HTML is missing');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] });
    try {
      const { context, page, errors } = await openLogic(browser, '?test=1&render=0&manual=1');
      const state = await page.evaluate(() => window.__TEST__.state());
      assert(Math.abs(state.audio.music - 0.1) < 0.001, `music ${state.audio.music}`);
      assert(state.detune === 0, `detune ${state.detune}`);
      const jobs = [
        ...Object.keys(TRACKS).map((id) => ['track', id]),
        ...Object.keys(STINGS).map((id) => ['sting', id]),
        ...Object.keys(SFX).map((id) => ['sfx', id]),
        ...Object.keys(VOICES).map((id) => ['voice', id]),
      ];
      const failed = [];
      for (const [kind, id] of jobs) {
        const probe = await page.evaluate(([k, name]) => window.__TEST__.probe(k, name), [kind, id]);
        if (!probe.finite || probe.clipped || !(probe.rms > 0.0008)) failed.push(`${kind}:${id} peak=${probe.peak} rms=${probe.rms}`);
      }
      assert(failed.length === 0, failed.join('; '));
      assert(errors.length === 0, errors.join('; '));
      await context.close();
    } finally {
      await browser.close();
    }
  }]);
  return tests;
}

function serveWork() {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const rel = decodeURIComponent(url.pathname);
    const file = path.resolve(work, `.${rel}`);
    if (!file.startsWith(work)) {
      res.writeHead(403);
      res.end('no');
      return;
    }
    try {
      const data = readFileSync(file);
      const ext = path.extname(file);
      const type = ext === '.html' ? 'text/html; charset=utf-8'
        : ext === '.js' || ext === '.mjs' ? 'text/javascript; charset=utf-8'
          : 'application/octet-stream';
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('missing');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function hubScenario(browser, origin, query) {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const folder = 'Level Best-Wii Fit-grok-4.7-xhigh-20261104-231317';
  const game = `/${htmlName}`;
  const harness = `/${folder}/tools/hub/harness.html?game=${encodeURIComponent(game)}&auto=1&${query}`;
  await page.goto(`${origin}${harness}`);
  await page.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 180000 });
  const report = await page.evaluate(() => window.__hubCheck);
  await context.close();
  return report;
}

export async function hubTests() {
  const tests = [];
  tests.push(['hub harness passes 1, 2, 4 and host-leave, and the page plays alone', async () => {
    assert(existsSync(htmlPath), 'built HTML is missing');
    const server = await serveWork();
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    mkdirSync(scratch, { recursive: true });
    const browser = await chromium.launch({ headless: true, args: RENDER });
    const log = [];
    try {
      const probe = await fetch(`${origin}/${htmlName}`);
      const text = await probe.text();
      assert(text.includes('Level Best'), 'served page is not the game');
      assert(text.includes('hub:session'), 'served page has no hub meta');
      const scenarios = ['players=1', 'players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave'];
      for (const query of scenarios) {
        const report = await hubScenario(browser, origin, query);
        const bad = (report.checks || []).filter((check) => !check.pass);
        log.push(`${query} pass=${report.pass} ${bad.map((check) => `${check.name}: ${check.detail}`).join(' | ')}`);
        assert(report.pass === true, `${query} ${bad.map((check) => check.name + ' ' + check.detail).join('; ')}`);
      }
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (err) => errors.push(String(err.message || err)));
      await page.goto(fileUrl(''));
      await page.waitForFunction(() => window.__RENDER__ && window.__RENDER__.frames > 0 && !window.__RENDER__.lost, null, { timeout: 90000 });
      for (const key of ['Enter', 'Space', 'Enter', 'Space']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(200);
      }
      const drawn = await page.evaluate(() => {
        const render = window.__RENDER__;
        return { screen: document.body.dataset.screen, frames: render.frames, lost: render.lost, active: !!(window.AIHub && window.AIHub.active) };
      });
      assert(drawn.frames > 0 && !drawn.lost, `not drawn ${JSON.stringify(drawn)}`);
      assert(drawn.active === false, 'session active outside the hub');
      assert(errors.length === 0, errors.join('; '));
      log.push(`solo ${JSON.stringify(drawn)} errors=${errors.length}`);
      await context.close();
    } finally {
      writeFileSync(path.join(scratch, 'hub.log'), log.join('\n') + '\n');
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  }]);
  return tests;
}

const SCREENS = ['title', 'who', 'tutorial', 'menu', 'morning', 'question', 'reply', 'age', 'plan', 'intro', 'countdown', 'play', 'results', 'jar', 'bed', 'ending', 'credits', 'pause', 'howto', 'settings', 'about', 'journal', 'free', 'island', 'confirm-reset', 'card', 'waiting'];

async function audit(page) {
  return page.evaluate(async (screens) => {
    const problems = [];
    const marginX = window.innerWidth * 0.05;
    const marginY = window.innerHeight * 0.05;
    const seen = [];
    function look(name) {
      const focusable = [...document.querySelectorAll('#ui button, #ui input, #ui a, #ui [tabindex]')];
      if (focusable.length > 6) problems.push(`${name} has ${focusable.length} choices`);
      const focused = document.querySelector('#ui .is-focus');
      if (focusable.length && focused) {
        const outline = parseFloat(getComputedStyle(focused).outlineWidth);
        if (!(outline >= 3)) problems.push(`${name} focus outline ${outline}`);
      } else if (focusable.length && !focused) problems.push(`${name} has no focus`);
      const nodes = document.querySelectorAll('body *');
      for (const node of nodes) {
        if (node.id === 'view' || node.tagName === 'CANVAS' || node.tagName === 'STYLE') continue;
        const text = node.childNodes && [...node.childNodes].some((child) => child.nodeType === 3 && child.textContent.trim());
        if (text) {
          const size = parseFloat(getComputedStyle(node).fontSize);
          if (size < 30) problems.push(`${name} ${node.tagName} ${size}px "${node.textContent.trim().slice(0, 40)}"`);
        }
        const box = node.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        if (box.left < -1 || box.top < -1 || box.right > window.innerWidth + 1 || box.bottom > window.innerHeight + 1) {
          problems.push(`${name} overflows viewport ${node.tagName}.${node.className}`);
        }
        if (node.closest && node.closest('#ui') && (box.left < marginX - 8 || box.top < marginY - 8 || box.right > window.innerWidth - marginX + 8 || box.bottom > window.innerHeight - marginY + 8)) {
          problems.push(`${name} leaves the margin ${node.tagName}.${node.className}`);
        }
      }
    }
    const test = window.__TEST__;
    test.advance(0);
    for (const screen of screens) {
      const ok = test.goto(screen);
      if (ok === false) {
        problems.push(`${screen} refused`);
        continue;
      }
      test.advance(0);
      look(screen);
      seen.push(screen);
    }
    test.goto('pause');
    test.advance(0);
    test.activate(4);
    test.advance(0);
    look('dev');
    test.goto('menu');
    test.advance(0);
    test.activate(1);
    test.advance(0);
    look('group');
    const about = [];
    test.goto('about');
    const pages = 80;
    for (let i = 0; i < pages; i++) {
      test.advance(0);
      about.push([...document.querySelectorAll('#ui h1, #ui h2, #ui p:not(.pages)')].map((node) => node.textContent).join(' '));
      test.key('ArrowRight', true);
      test.advance(1 / 120);
      test.key('ArrowRight', false);
    }
    return { problems, seen, about: about.join('\n') };
  }, SCREENS);
}

export async function uiTests() {
  const tests = [];
  tests.push(['1080p screens keep large type, six choices and a visible focus', async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const { context, page, errors } = await openLogic(browser, '?test=1&render=0&manual=1');
      const result = await audit(page);
      const interview = JSON.parse(readFileSync(path.join(work, 'exit-interview.json'), 'utf8'));
      const blob = result.about.replace(/\s+/g, ' ');
      for (const value of Object.values(interview.sourceInformation)) assert(blob.includes(value), `about missing ${value}`);
      for (const line of [...interview.testingFeedback, ...interview.engineFeedback, ...interview.promptFeedback]) {
        assert(blob.includes(line), `about missing feedback ${line.slice(0, 48)}`);
      }
      assert(result.problems.length === 0, result.problems.slice(0, 12).join(' | '));
      assert(errors.length === 0, errors.join('; '));
      await context.close();
    } finally {
      await browser.close();
    }
  }]);

  tests.push(['touch profiles ask for a controller and still open settings', async () => {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      for (const name of ['Pixel 7', 'iPhone 13', 'iPad (gen 7)']) {
        const context = await browser.newContext({ ...devices[name] });
        const page = await context.newPage();
        await page.goto(fileUrl('?test=1&render=0&manual=1'));
        await page.waitForFunction(() => window.__TEST__, null, { timeout: 30000 });
        const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches);
        assert(coarse, `${name} is not touch-only`);
        const text = await page.locator('body').innerText();
        assert(text.includes('Controller or keyboard required'), `${name} missing the message`);
        assert(text.includes('Settings'), `${name} missing Settings`);
        const before = await page.evaluate(() => document.body.dataset.screen);
        assert(before === 'touch', `${name} screen ${before}`);
        const count = await page.locator('#ui button, #ui input').count();
        assert(count === 1, `${name} has ${count} controls`);
        await page.locator('button', { hasText: 'Settings' }).tap();
        await page.waitForFunction(() => document.body.dataset.screen === 'settings', null, { timeout: 3000 });
        await page.evaluate(() => window.__TEST__.setCoarse(true));
        await page.evaluate(() => window.__TEST__.goto('touch'));
        await page.evaluate(() => window.__TEST__.advance(11));
        const attracted = await page.evaluate(() => window.__TEST__.state().screen);
        assert(attracted === 'attract', `${name} attract ${attracted}`);
        await page.evaluate(() => window.__TEST__.key('Enter', true));
        await page.evaluate(() => window.__TEST__.advance(1 / 120));
        const woke = await page.evaluate(() => window.__TEST__.state().screen);
        assert(woke === 'touch', `${name} woke onto ${woke}`);
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }]);
  return tests;
}
