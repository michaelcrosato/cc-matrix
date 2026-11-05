// the bundle: built, opened by file:// at 1920x1080; no console errors, no network requests, the title reached; the
// exit interview parses with every key filled
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url), up = new URL('../../../', import.meta.url);
const NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-xhigh-20261104-035148.html';
export default async function (t) {
  execSync('node build.mjs', { cwd: root, stdio: 'pipe' });
  const html = readFileSync(new URL(NAME, up), 'utf8');
  t('the bundle starts with the session client right after the charset', /^<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<script>\s*\/\*! aihub-session 1\.4\.0/.test(html));
  t('the hub tags are present', ['hub:session', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto'].every(k => html.includes('name="' + k + '"')));
  const ei = JSON.parse(readFileSync(new URL('exit-interview.json', up), 'utf8'));
  const filled = v => typeof v === 'string' ? v.length > 0 : Array.isArray(v) ? v.length > 0 && v.every(filled) : v && typeof v === 'object' ? Object.values(v).every(filled) : false;
  t('exit-interview.json parses with every value filled', filled(ei) && ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [], reqs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) reqs.push(r.url()); });
  await p.goto(new URL(NAME, up).href); await p.waitForTimeout(3500);
  const snap = await p.evaluate(() => OB.game.debug.snapshot());
  t('the title is reached', snap.scene === 'title', JSON.stringify(snap));
  await p.keyboard.press('Enter'); await p.waitForTimeout(900); const s2 = await p.evaluate(() => OB.game.debug.snapshot().scene); t('Enter goes to the menu', s2 === 'menu', s2);
  // sound: start a race, tap into the master bus, and listen for a non-silent signal
  await p.evaluate(() => { OB.startRace({ mode: 'arcade', car: 'orchidea', passenger: 'marisol', noIntro: true, station: 1 }); });
  await p.waitForTimeout(1500); await p.keyboard.down('KeyW'); await p.waitForTimeout(1500);
  const rms = await p.evaluate(async () => { const A = OB.game.audio; if (!A.ctx) return -1; const an = A.ctx.createAnalyser(); an.fftSize = 2048; A._master.connect(an); const buf = new Float32Array(2048); let best = 0; for (let i = 0; i < 20; i++) { await new Promise(r => setTimeout(r, 60)); an.getFloatTimeDomainData(buf); let s = 0; for (const v of buf) s += v * v; best = Math.max(best, Math.sqrt(s / buf.length)); } return best; });
  await p.keyboard.up('KeyW');
  t('the synth makes sound in a race (music, engine)', rms > .005, 'rms ' + rms);
  // the pause menu's Dev Mode item opens the panel over the frozen race
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const paused = await p.evaluate(() => OB.game.paused);
  const clicked = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /dev mode/i.test(x.textContent)); if (b) b.click(); return !!b; });
  await p.waitForTimeout(400); const dev = await p.evaluate(() => ({ open: OB.Dev.isOpen, paused: OB.game.paused, ts: OB.game.timeScale }));
  t('Escape pauses the race and the pause menu offers Dev Mode', paused && clicked, JSON.stringify({ paused, clicked }));
  t('Dev Mode opens over the frozen race', dev.open && !dev.paused && dev.ts === 0, JSON.stringify(dev));
  t('no console errors', errs.length === 0, errs.join(' | '));
  t('no network requests', reqs.length === 0, reqs.join(' '));
  await b.close();
}
