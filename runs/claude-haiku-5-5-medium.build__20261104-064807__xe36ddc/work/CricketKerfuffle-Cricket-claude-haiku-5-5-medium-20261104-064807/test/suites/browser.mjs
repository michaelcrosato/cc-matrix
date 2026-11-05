// browser-smoke and browser-hub: the single file in Chromium from file:// (no errors, no outside requests), and the AI Hub
// harness for one, two and four players (four on a slow, lossy network). The harness's own check decides a pass.
// Set HUB_PLAYERS=1,2,4 to choose the counts (default all three). Servers are stopped by PID; never by port.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const NAME = 'CricketKerfuffle-Cricket-claude-haiku-5-5-medium-20261104-064807';
const bundle = path.join(path.resolve(root, '..'), NAME + '.html');
const require = createRequire(path.join(root, 'engine', 'package.json'));

export async function run({ check }) {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch (e) { check('playwright is installed in engine/node_modules', false, 'run npm install in engine/'); return; }
  const browser = await chromium.launch();
  try {
    // browser-smoke: the single file from file://
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
    await page.goto(pathToFileURL(bundle).href);
    await page.waitForTimeout(2500);
    const scene = await page.evaluate(() => My3D2dge.current.sceneName);
    check('the single file opens at the title from file://', scene === 'title', scene);
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(200);
    await page.keyboard.press('KeyJ'); await page.waitForTimeout(800);
    const setup = await page.evaluate(() => My3D2dge.current.sceneName);
    check('the menu opens Quick Match in the browser', setup === 'setup', setup);
    // the mouse in a real match: a pointer on the pitch sets the batter's aim, and moving it to the other side changes it
    await page.evaluate(() => My3D2dge.current.debug.startMatch({ teams: [0, 1], ground: 'green', overs: 2, wickets: 5, kerf: false, batFirst: 0, seed: 7, humanSides: [0] }, {}));
    await page.waitForTimeout(800);
    const box = await page.locator('canvas').first().boundingBox();
    const aimAt = async fx => { await page.mouse.move(box.x + box.width * fx, box.y + box.height * 0.6); await page.waitForTimeout(300); return page.evaluate(() => My3D2dge.current.debug.aim()); };
    const aL = await aimAt(0.2), aR = await aimAt(0.8);
    check('the mouse aims the batter in a browser match', aL !== null && aR !== null && aL !== aR, 'left ' + aL + ', right ' + aR);
    check('the page makes no outside requests', external.length === 0, external.slice(0, 2).join(' '));
    check('the page reports no errors in the browser (the audio notice aside)', errors.filter(e => !/AudioContext/.test(e)).length === 0, errors.slice(0, 3).join(' | '));
    await page.close();

    // browser-hub: the harness for each player count
    const hubDir = path.join(root, 'test', 'hub');
    mkdirSync(hubDir, { recursive: true });
    for (const f of ['harness.html', 'bridge.js', 'round.js']) copyFileSync(path.join(root, 'vendor', 'aihub', f), path.join(hubDir, f));
    copyFileSync(bundle, path.join(hubDir, 'game.html'));
    const srv = spawn('python3', ['-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], { cwd: hubDir, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      const port = await new Promise((resolve, reject) => {
        const to = setTimeout(() => reject(new Error('no port')), 10000);
        srv.stdout.on('data', d => { const m = String(d).match(/port (\d+)/); if (m) { clearTimeout(to); resolve(m[1]); } });
        srv.on('error', reject);
      });
      const want = (process.env.HUB_PLAYERS || '1,2,4').split(',').map(Number);
      for (const n of want) {
        const q = new URLSearchParams({ game: 'game.html', players: String(n), auto: '1' });
        if (n === 4) { q.set('latency', '150'); q.set('jitter', '50'); q.set('loss', '5'); }
        const hp = await browser.newPage({ viewport: { width: 1400, height: 900 } });
        await hp.goto(`http://127.0.0.1:${port}/harness.html?${q}`);
        const done = await hp.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 170000 }).then(() => true).catch(() => false);
        const r = done ? await hp.evaluate(() => window.__hubCheck || null) : null;
        const failing = r && r.checks ? r.checks.filter(c => !c.pass).map(c => c.name + (c.detail ? ' (' + c.detail + ')' : '')).slice(0, 4) : [];
        check(`the AI Hub harness passes with ${n} player${n > 1 ? 's' : ''}${n === 4 ? ' on a slow, lossy network' : ''}`, !!(r && r.pass === true), done ? (failing.join('; ') || 'no pass') : 'timed out');
        await hp.close();
      }
    } finally {
      try { process.kill(srv.pid); } catch (e) { /* already stopped */ }
    }
  } finally {
    await browser.close();
  }
}
