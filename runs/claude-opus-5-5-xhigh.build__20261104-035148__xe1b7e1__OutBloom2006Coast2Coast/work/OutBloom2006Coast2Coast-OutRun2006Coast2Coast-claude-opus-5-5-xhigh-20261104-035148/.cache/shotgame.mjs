import { chromium } from 'playwright';
const [url, out, w = 1280, h = 720, wait = 3000, keys = ''] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
await p.goto(url); await p.waitForTimeout(+wait);
for (const step of keys.split(' ').filter(Boolean)) { const [k, ms] = step.split(':'); if (k === 'wait') await p.waitForTimeout(+ms); else if (k.startsWith('hold=')) { await p.keyboard.down(k.slice(5)); } else if (k.startsWith('up=')) await p.keyboard.up(k.slice(3)); else { await p.keyboard.press(k); } }
await p.screenshot({ path: out });
const snap = await p.evaluate(() => { try { return JSON.stringify(OB.game.debug.snapshot()); } catch (e) { return 'snap err ' + e.message; } });
console.log(snap.slice(0, 400));
if (errs.length) console.log(errs.slice(0, 8).join('\n')); await b.close();
