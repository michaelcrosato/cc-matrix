// Hover with the real mouse: moving over a title row focuses it; moving over a junction arrow selects that branch.
import { open, waitStarted } from '../lib/browser.mjs';
const { browser, page, errors } = await open('', { w: 960, h: 540 }); const ev = (f, a) => page.evaluate(f, a); let n = 0, bad = 0; const c = (w, ok, d = '') => { n++; if (!ok) { bad++; console.log('FAIL ' + w + ' ' + d); } };
await waitStarted(page); await page.waitForTimeout(800);
const row = await ev(() => S7.scenes.title.list.rect(3));
await page.mouse.move(5, 5); await page.waitForTimeout(150); await page.mouse.move((row[0] + 20) * 2, (row[1] + 6) * 2, { steps: 4 }); await page.waitForTimeout(400);
c('hovering a title row focuses it', (await ev(() => S7.scenes.title.list.i)) === 3, 'focus ' + await ev(() => S7.scenes.title.list.i));
await ev(() => S7.newGame()); await page.waitForTimeout(800);
await ev(() => { S7.game.debug.skipCutscene(); S7.game.debug.teleport('00A', 'j2'); S7.st.done['00A:tw1'] = true; S7.game.debug.skipCutscene(); S7.st.mode = 'junction'; S7.sim.setupJunction(S7.graph().nodes.j2, null); S7.st.jLock = false; }); await page.waitForTimeout(600);
const z = await ev(() => S7.ui.zones.filter(z => z.kind === 'branch').map(z => ({ r: z.r, i: z.i }))); const t = z.find(q => q.i === 2) || z[0];
await page.mouse.move(10, 10); await page.waitForTimeout(150); await page.mouse.move((t.r[0] + 12) * 2, (t.r[1] + 12) * 2, { steps: 4 }); await page.waitForTimeout(400);
c('hovering a junction arrow selects that branch', (await ev(() => S7.st.sel)) === t.i, 'sel ' + await ev(() => S7.st.sel) + ' want ' + t.i);
c('no page errors', !errors.length, errors.join('|')); console.log(bad ? `${bad} of ${n} checks failed` : `all ${n} checks passed`); await browser.close();
