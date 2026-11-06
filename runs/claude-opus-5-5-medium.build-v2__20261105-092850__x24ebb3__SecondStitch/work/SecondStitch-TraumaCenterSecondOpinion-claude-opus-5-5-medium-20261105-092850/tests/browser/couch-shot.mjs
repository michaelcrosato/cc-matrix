// A look at couch co-op, through the real Consult flow: keyboard and mouse plus two pads.
import { launch, open, tap, waitFrames, PAD_STUB } from './lib.mjs';
const b = await launch();
const { page, ctx } = await open(b, '?menu=1', { viewport: { width: 1920, height: 1080 }, init: `${PAD_STUB}; window.__padsOn = 2;` });
await page.waitForFunction(() => window.__GAME__?.stage?.name === 'main');
await page.evaluate(() => { const st = window.__GAME__.stage; st.menu.focus = st.menu.items.findIndex((x) => x.id === 'consult'); });
await tap(page, 'Enter');
await page.waitForFunction(() => window.__GAME__?.stage?.name === 'consult');
await waitFrames(page, 3);
await tap(page, 'Enter');
for (const p of [0, 1]) { await page.evaluate((i) => window.__press(i, 0, 1), p); await waitFrames(page, 2); await page.evaluate((i) => window.__press(i, 0, 0), p); await waitFrames(page, 2); }
console.log('seats', await page.evaluate(() => window.__GAME__.stage.seats.length));
await tap(page, 'Enter');
await page.waitForFunction(() => window.__GAME__?.stage?.name === 'operation' && window.__GAME__.stage.intro <= 0, null, { timeout: 30000 });
await page.evaluate(() => { const st = window.__GAME__.stage; [[-3, 1], [2.5, -1.5], [-1, -2.4]].forEach(([x, z], i) => { st.tips[i].x = x; st.tips[i].z = z; }); st.mouseOn = false; window.__pads[0].axes[0] = 0.01; });
await page.waitForTimeout(6000);
await page.screenshot({ path: 'shots/couch.png' });
console.log(await page.evaluate(() => ({ wheels: window.__GAME__.stage.hud.seatWheels, seats: window.__GAME__.sim.seats.length })));
await ctx.close(); await b.close();
