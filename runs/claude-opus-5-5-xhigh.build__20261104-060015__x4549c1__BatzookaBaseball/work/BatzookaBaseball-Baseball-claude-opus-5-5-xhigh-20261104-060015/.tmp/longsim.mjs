import { chromium } from 'playwright';
import { resolve } from 'node:path';
const park = process.argv[2] || 'kernel', secs = +(process.argv[3] || 300);
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push('PAGE ' + e)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ' ' + m.text()); });
await page.goto('file://' + resolve('../BatzookaBaseball-Baseball-claude-opus-5-5-xhigh-20261104-060015.html') + '#sim/' + park);
await page.waitForTimeout(2500);
const t0 = Date.now();
const res = await page.evaluate(async (secs) => {
  const g = My3D2dge.current; g.stop();
  const ev = {}; BZ.bus.on('*', (d, e) => { ev[e] = (ev[e] || 0) + 1; });
  let shots = 0;
  for (let i = 0; i < secs * 30; i++) { g.advance(1 / 30, { draw: true }); if (g.sceneName !== 'match') break; if (i % 300 === 0) await new Promise(r => setTimeout(r, 0)); }
  const M = BZ.M;
  return { scene: g.sceneName, phase: M && M.phase, inning: M && M.inning, score: M && [M.teams[0].runs, M.teams[1].runs], errors: g.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')).slice(0, 8), ev };
}, secs);
console.log(JSON.stringify({ scene: res.scene, phase: res.phase, inning: res.inning, score: res.score }), 'real s', ((Date.now() - t0) / 1000).toFixed(0));
console.log('events', Object.entries(res.ev).filter(([k]) => /homer|replay|cinematic|rhubarb|halfEnd|suddenBoom|hazard|gameEnd|catch|doublePlay|steal|super|batzooka|walk|hbp|dive|climb/.test(k)).map(([k, v]) => k + ':' + v).join(' '));
console.log('game errors', res.errors.join('\n'));
console.log('console', [...new Set(errors)].slice(0, 10).join('\n'));
await page.screenshot({ path: '.tmp/shots/longsim-' + park + '.png' });
await browser.close();
