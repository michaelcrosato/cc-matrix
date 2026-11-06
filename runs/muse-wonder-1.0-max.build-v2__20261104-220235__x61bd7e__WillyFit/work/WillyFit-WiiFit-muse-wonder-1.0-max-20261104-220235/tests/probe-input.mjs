import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, '..', 'WillyFit-WiiFit-muse-wonder-1.0-max-20261104-220235.html');
const pw = await import('playwright');
const browser = await pw.chromium.launch();
// controller stand-in
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    const buttons = Array.from({length: 17}, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', axes: [0.5, 0, 0, 0], buttons, timestamp: 0 };
    buttons[7].value = 0.7; buttons[7].pressed = true;
    navigator.getGamepads = () => [pad, null, null, null];
    window.__pad = pad;
  });
  await page.goto('file://' + built + '#act/sunflow/1');
  await page.waitForTimeout(3500);
  const info = await page.evaluate(() => {
    const inp = window.G.game.input;
    let val = null, lab = null, labKb = null;
    try { val = inp.value('breath'); } catch(e) { val = 'err:'+e.message; }
    try { lab = inp.label('confirm'); } catch(e) {}
    return { val, lab, last: inp.lastDevice, snap: window.G.game.debug.snapshot() };
  });
  console.log('controller:', JSON.stringify(info));
  await page.close();
}
// touch-only phone profile
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' });
  const page = await ctx.newPage();
  await page.goto('file://' + built);
  await page.waitForTimeout(2500);
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('touch body text has notice:', txt.includes('Controller or keyboard required'), JSON.stringify(txt.slice(0,120)));
  await page.waitForTimeout(9000);
  const snap = await page.evaluate(() => { try { return window.G.game.debug.snapshot(); } catch(e) { return {err: String(e)}; } });
  console.log('touch after idle snap:', JSON.stringify(snap).slice(0,160));
  await ctx.close();
}
// audio: music volume + analyser non-silent after gesture
{
  const page = await browser.newPage();
  await page.goto('file://' + built);
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const audio = await page.evaluate(() => {
    const g = window.G.game;
    return { music: g.settings.music, ctxState: g.audio && g.audio.ctx ? g.audio.ctx.state : 'none', hasBus: !!(g.audio && g.audio.bus) };
  });
  console.log('audio:', JSON.stringify(audio));
  await page.close();
}
await browser.close();
