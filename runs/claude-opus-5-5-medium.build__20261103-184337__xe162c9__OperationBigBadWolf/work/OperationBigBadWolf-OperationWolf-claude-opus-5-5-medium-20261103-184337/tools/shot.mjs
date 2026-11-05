import { chromium } from 'playwright';
const [url, out, waitMs, ...steps] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
await p.goto(url); await p.waitForTimeout(+waitMs || 2000);
for (const s of steps) { const [k, v] = s.split(':'); if (k === 'press') await p.keyboard.press(v); else if (k === 'wait') await p.waitForTimeout(+v); else if (k === 'shot') await p.screenshot({ path: v }); else if (k === 'move') { const [x, y] = v.split(','); await p.mouse.move(+x, +y); } else if (k === 'down') await p.mouse.down(); else if (k === 'up') await p.mouse.up(); }
await p.screenshot({ path: out });
const snap = await p.evaluate(() => { try { return JSON.stringify(My3D2dge.current.debug.snapshot()).slice(0, 600) + ' ERR:' + My3D2dge.current.errors.map(e => e.message || e).join(' | '); } catch (e) { return 'no snapshot ' + e.message; } });
console.log(snap); console.log(errs.slice(0, 12).join('\n'));
await b.close();
