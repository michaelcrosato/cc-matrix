import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + resolve('../DenshaDeHalo-DenshaDeGo-claude-sonnet-5-5-medium-20261104-050238.html') + '#stage=S0'); await p.waitForTimeout(1500);
await p.keyboard.press('KeyW');
await p.evaluate(() => { const a = window.__dh.game.audio, an = a.ctx.createAnalyser(); an.fftSize = 2048; a.bus('master').connect(an); window.__an = an; window.__dh.DH.drive.auto = true; window.__dh.DH.TUNING.timeScale = 3; });
const rms = async () => p.evaluate(() => { const d = new Float32Array(2048); window.__an.getFloatTimeDomainData(d); return Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length); });
const out = []; for (let i = 0; i < 12; i++) { await p.waitForTimeout(700); out.push(+(await rms()).toFixed(4)); }
console.log('master RMS over time:', out.join(' '), '| max', Math.max(...out), errs.join() || 'no errors'); await b.close();
