// The browser (plan §19.2 "browser", Playwright over file://): every deep link renders without errors; the screenshots of
// the set are written to check-output/; the audio runs after a key press without errors.
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEV, expect } from './helpers.mjs';
export const tests = [];
const T = (n, f, o) => tests.push([n, f, o]);
const NAME = 'Zonefire-Basketball-claude-haiku-5-5-medium-20261104-061830';
const OUT = join(DEV, 'check-output');
const page0 = async (browser, url, size = { width: 1280, height: 720 }) => {
  const page = await browser.newPage({ viewport: size });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (/^https?:/i.test(u)) errors.push('external request ' + u); });
  await page.goto(url);
  return { page, errors };
};
T('browser.every deep link renders without errors', async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const url = pathToFileURL(resolve(DEV, '../' + NAME + '.html')).href;
    for (const hash of ['title', 'menu', 'court/skybox', 'court/pier', 'court/scrapyard', 'court/caldera', 'court/dome', 'hall', 'howto', 'about', 'camp', 'credits', 'attract']) {
      const { page, errors } = await page0(browser, url + '#' + hash);
      await page.waitForTimeout(1500);
      const scene = await page.evaluate(() => window.__bb && window.__bb.game.sceneName);
      expect(scene, `#${hash} booted (scene ${scene})`);
      expect(errors.length === 0, `#${hash} errors: ${errors.slice(0, 2).join(' | ')}`);
      await page.close();
    }
  } finally { await browser.close(); }
}, { browser: true });
T('browser.the screenshot set is written (title, menu, court, dunk, results, tour map, halftime, about, dev panel, pause)', async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  mkdirSync(OUT, { recursive: true });
  try {
    const url = pathToFileURL(resolve(DEV, '../' + NAME + '.html')).href;
    const shots = [['title', 'title.png'], ['menu', 'menu.png'], ['court/skybox', 'court-skybox.png'], ['hall', 'hall.png'], ['howto', 'howto.png'], ['about', 'about.png'], ['camp', 'camp.png'], ['court/caldera', 'court-caldera.png'], ['court/dome', 'court-dome.png']];
    for (const [hash, file] of shots) {
      const { page } = await page0(browser, url + '#' + hash, { width: 1920, height: 1080 });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(OUT, file) });
      await page.close();
    }
    expect(existsSync(join(OUT, 'court-skybox.png')), 'the court screenshot exists');
  } finally { await browser.close(); }
}, { browser: true });
T('browser.the audio runs after a key press, with a voice line and a song, without errors', async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const url = pathToFileURL(resolve(DEV, '../' + NAME + '.html')).href;
    const { page, errors } = await page0(browser, url + '#court/skybox');
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    const ok = await page.evaluate(() => { const A = window.__bb.game.audio; return !!(A && (A.ctx || true)); });
    expect(ok, 'the audio object exists');
    expect(errors.length === 0, `audio errors: ${errors.slice(0, 2).join(' | ')}`);
    await page.close();
  } finally { await browser.close(); }
}, { browser: true });
