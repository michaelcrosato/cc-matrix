// touch-only emulation (a phone): the notice is shown, there are no touch buttons, and the attract mode runs
import { chromium, devices } from 'playwright';
const up = new URL('../../../', import.meta.url), NAME = 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-xhigh-20261104-035148.html';
export default async function (t) {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(new URL(NAME, up).href); await p.waitForTimeout(3000);
  t('touch-only: the notice', await p.evaluate(() => OB.Touch.blocked()));
  t('touch-only: no touch buttons', await p.evaluate(() => !document.querySelector('[data-act]') || OB.game.input.touchEnabled === false));
  await p.waitForTimeout(9000); t('touch-only: the attract mode runs', await p.evaluate(() => OB.Attract.on));
  await p.touchscreen.tap(30, 30); await p.waitForTimeout(400); t('touch-only: a tap does not end the attract mode', await p.evaluate(() => OB.Attract.on));
  t('touch-only: no errors', errs.length === 0, errs.join(' | ')); await b.close();
}
