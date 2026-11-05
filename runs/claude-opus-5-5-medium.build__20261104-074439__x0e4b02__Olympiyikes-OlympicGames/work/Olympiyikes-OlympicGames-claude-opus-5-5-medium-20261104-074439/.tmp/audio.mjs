import { createRequire } from 'node:module';
const require = createRequire(new URL('../vendor/my-3d2dge/dist/handoff/package.json', import.meta.url)); const { chromium } = require('playwright');
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage();
await p.addInitScript(() => { window.__osc = 0; window.__src = 0; const AC = window.AudioContext; const o = AC.prototype.createOscillator, s = AC.prototype.createBufferSource; AC.prototype.createOscillator = function () { window.__osc++; return o.call(this); }; AC.prototype.createBufferSource = function () { window.__src++; return s.call(this); }; });
await p.goto(new URL('../../Olympiyikes-OlympicGames-claude-opus-5-5-medium-20261104-074439.html#ev/sprint', import.meta.url).href); await p.waitForTimeout(800); await p.keyboard.press('KeyJ'); await p.waitForTimeout(9000);
console.log(JSON.stringify(await p.evaluate(() => { const a = window.__oly.game.audio; return { ready: a.ready, state: a.ctx && a.ctx.state, song: !!a.song, oscillators: window.__osc, noiseSources: window.__src, voiceBus: !!a._voiceBus, voiceGain: a._voiceBus && a._voiceBus.gain.value }; })));
await b.close();
