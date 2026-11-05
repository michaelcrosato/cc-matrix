import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage(); const reqs = []; p.on('request', r => reqs.push(r.url()));
await p.goto('file://' + resolve('../DenshaDeHalo-DenshaDeGo-claude-sonnet-5-5-medium-20261104-050238.html')); await p.waitForTimeout(1500); await p.keyboard.press('KeyW');
const r = await p.evaluate(async () => {
  const D = window.__dh.DH, a = window.__dh.game.audio, an = a.ctx.createAnalyser(); an.fftSize = 2048; a.bus('sfx').connect(an);
  const res = {};
  for (const who of ['hoshino', 'mimi', 'control', 'kid']) {
    const dur = D.babble('Good morning driver. Stop on the mark, please.', who), env = [], freqs = [];
    const t0 = performance.now(); while (performance.now() - t0 < dur * 1000) { const d = new Float32Array(2048); an.getFloatTimeDomainData(d); env.push(Math.sqrt(d.reduce((s, v) => s + v * v, 0) / 2048)); const f = new Uint8Array(1024); an.getByteFrequencyData(f); let m = 0, mi = 0; f.forEach((v, i) => { if (v > m) { m = v; mi = i; } }); freqs.push(mi * a.ctx.sampleRate / 2048); await new Promise(r => setTimeout(r, 25)); }
    let pulses = 0; for (let i = 1; i < env.length; i++) if (env[i] > .004 && env[i - 1] <= .004) pulses++;
    freqs.sort((x, y) => x - y); res[who] = { seconds: +dur.toFixed(2), peakRMS: +Math.max(...env).toFixed(3), syllablePulses: pulses, medianPeakHz: Math.round(freqs[freqs.length >> 1]) };
  }
  return res;
});
console.log(JSON.stringify(r)); console.log('network requests other than the page:', reqs.filter(u => !u.startsWith('file://') || /\.(mp3|wav|ogg)/.test(u)).length); await b.close();
