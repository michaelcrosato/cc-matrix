import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(pathToFileURL(resolve('../CricketKerfuffle-Cricket-claude-sonnet-5-5-medium-20261104-062918.html')).href); await p.waitForTimeout(1500);
await p.keyboard.press('Enter'); await p.waitForTimeout(500);
console.log(await p.evaluate(async () => {
  const G = My3D2dge.current, a = G.audio; a._init(); await a.ctx.resume();
  // tap the voice bus with an analyser and speak
  const an = a.ctx.createAnalyser(); a.bus('voice').connect(an); an.fftSize = 512;
  G.debug.say('six', 5, true); const buf = new Uint8Array(an.fftSize); let peak = 0;
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 40)); an.getByteTimeDomainData(buf); for (const v of buf) peak = Math.max(peak, Math.abs(v - 128)); }
  return JSON.stringify({ state: a.ctx.state, voicePeak: peak, line: G.debug.COMM.line && G.debug.COMM.line.text });
}));
console.log(errs.join('|') || 'no errors'); await b.close();
