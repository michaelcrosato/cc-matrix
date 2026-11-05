// node test/browser.mjs [shots...]: opens the built page in Chromium, drives it, saves screenshots, prints errors only
import { chromium } from '../tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
const file = fileURLToPath(new URL('../../ThugbyTurbo-Rugby-claude-opus-5-5-medium-20261104-065619.html', import.meta.url));
const out = fileURLToPath(new URL('../shots/', import.meta.url)); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const want = process.argv.slice(2);
const plans = {
  title: { hash: '', steps: [['wait', 2500], ['shot']] },
  menu: { hash: '#menu', steps: [['wait', 2500], ['shot']] },
  match: { hash: '#match/furnace', steps: [['wait', 2000], ['key', 'Space'], ['wait', 5000], ['shot'], ['hold', 'KeyD', 1500], ['shot', 'match2']] },
  scrum: { hash: '#match/park', steps: [['wait', 2500], ['eval', "__thugby.TT.force('scrum')"], ['wait', 2600], ['shot'], ['wait', 1300], ['shot', 'scrum2']] },
  lineout: { hash: '#match/docks', steps: [['wait', 2500], ['eval', "__thugby.TT.force('lineout')"], ['wait', 1700], ['shot']] },
  penalty: { hash: '#match/dome', steps: [['wait', 2500], ['eval', "__thugby.TT.force('penalty')"], ['wait', 2000], ['shot']] },
  kick: { hash: '#match/park', steps: [['wait', 2500], ['eval', "__thugby.TT.force('tryHome')"], ['wait', 3500], ['shot'], ['eval', "__thugby.TT.force('tryAway')"], ['wait', 3500], ['shot', 'kickW'], ['key', 'Space'], ['key', 'Space'], ['wait', 400], ['hold', 'KeyC', 800], ['wait', 1500], ['shot', 'kick2']] },
  monster: { hash: '#match/furnace', steps: [['wait', 4000], ['eval', "__thugby.TT.force('monsterHit')"], ['wait', 200], ['shot'], ['wait', 1600], ['shot', 'replay']] },
  dev: { hash: '#match/park', steps: [['wait', 3000], ['eval', "__thugby.TT.dev.openPanel()"], ['wait', 400], ['shot']] },
  story: { hash: '#cup', steps: [['wait', 1500], ['shot', 'cuphub'], ['key', 'Enter'], ['wait', 1500], ['shot']] },
  card: { hash: '#card', steps: [['wait', 2500], ['shot']] },
  drill: { hash: '#training/3', steps: [['wait', 2500], ['shot']] },
  training: { hash: '#training', steps: [['wait', 1500], ['shot']] },
  attract: { hash: '#attract', steps: [['wait', 6000], ['shot']] },
  about: { hash: '#about', steps: [['wait', 1500], ['shot'], ['key', 'KeyE'], ['wait', 300], ['shot', 'about2'], ['key', 'KeyE'], ['key', 'KeyE'], ['wait', 300], ['shot', 'about4']] },
  pad: { hash: '#match/park', steps: [['wait', 2500], ['eval', "__thugby.game.input.lastDevice='gamepad'"], ['wait', 3000], ['shot']] },
  touch: { hash: '', touch: true, steps: [['wait', 2500], ['shot']] }
};
for (const [name, p] of Object.entries(plans)) {
  if (want.length && !want.includes(name)) continue;
  const ctx = await browser.newContext(p.touch ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + file + p.hash);
  for (const [k, a, b] of p.steps) {
    if (k === 'wait') await page.waitForTimeout(a);
    else if (k === 'key') await page.keyboard.press(a);
    else if (k === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(b); await page.keyboard.up(a); }
    else if (k === 'eval') await page.evaluate(a);
    else if (k === 'shot') await page.screenshot({ path: out + (a || name) + '.png' });
  }
  const gameErrs = await page.evaluate(() => (window.__thugby && __thugby.game.errors.map(e => String(e.stack || e.message || e).slice(0, 200))) || []);
  for (const e of errs.concat(gameErrs)) console.log('FAIL browser › ' + name + ': ' + e);
  await ctx.close();
}
await browser.close();
console.log('browser done');
