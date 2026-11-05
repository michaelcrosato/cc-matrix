import { chromium } from 'playwright';
import { resolve } from 'node:path';
process.env.TMPDIR = resolve('.tmp');
const b = await chromium.launch();
const file = 'file://' + resolve('../TideCrisis3-TimeCrisis3-claude-opus-5-5-xhigh-20261103-183153.html');
const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(file); await p.waitForFunction(() => window.TC && TC.game && TC.game.sceneName === 'title', null, { timeout: 30000 });
await p.keyboard.press('Enter'); await p.waitForTimeout(600);
await p.evaluate(() => TC.game.menu('settings')); await p.waitForTimeout(600);
await p.getByRole('button', { name: 'Controls' }).first().click(); await p.waitForTimeout(600);
const row = p.getByText('Button symbols', { exact: true }).first(); await row.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
await p.screenshot({ path: 'shots/review_22_controls_glyphs.png' });
const before = await p.evaluate(() => TC.game.input.glyphs);
const ctl = p.locator('.esh-sh').getByText(/PlayStation|Xbox/).first(); const box = await row.boundingBox();
// the select's arrow buttons sit on the same row: click the right arrow (the last button on that row)
const btns = await p.evaluate(y => [...document.querySelectorAll('.esh-sh button')].filter(b => { const r = b.getBoundingClientRect(); return Math.abs(r.top + r.height / 2 - y) < 30; }).map(b => { const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.textContent.trim()]; }), box.y + box.height / 2);
if (btns.length) { const [x, y] = btns[btns.length - 1]; await p.mouse.click(x, y); await p.waitForTimeout(300); }
const after = await p.evaluate(() => [TC.game.input.glyphs, TC.game.settings.glyphs, TC.game.input.label('cancel', 'gamepad')]);
await p.screenshot({ path: 'shots/review_23_controls_xbox.png' });
console.log('row buttons', JSON.stringify(btns.map(b => b[2])), 'before', before, 'after', after, 'errors', errs);
await b.close();
