// node tests/shot.mjs "<hash>" out.png [waitMs] [--keys "wait:500 press:Enter ..."] [--size 1280x720]
import { chromium } from 'playwright'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url'; import { mkdirSync } from 'node:fs';
const a = process.argv.slice(2), hash = a[0] || '', out = a[1] || 'shots/x.png', wait = +(a[2] || 3000);
const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : null; }; const [w, h] = (opt('size') || '1280x720').split('x').map(Number);
mkdirSync('shots', { recursive: true });
const html = resolve(new URL('../../IceHoc-Kaboom-IceHockey-claude-sonnet-5-5-medium-20261104-055058.html', import.meta.url).pathname);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }); const p = await b.newPage({ viewport: { width: w, height: h } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).split('\n').slice(0, 4).join(' | '))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(html).href + (hash ? '#' + hash : '')); await p.waitForTimeout(wait);
const steps = (opt('keys') || '').split(/\s+/).filter(Boolean); let n = 0;
for (const s of steps) { if (s.startsWith('eval:')) { await p.evaluate(decodeURIComponent(s.slice(5))); continue; } const [k, v, v2] = s.split(':'); if (k === 'wait') await p.waitForTimeout(+v); else if (k === 'press') await p.keyboard.press(v); else if (k === 'down') await p.keyboard.down(v); else if (k === 'up') await p.keyboard.up(v); else if (k === 'shot') await p.screenshot({ path: out.replace('.png', '_' + (v || n++) + '.png') }); else if (k === 'eval') await p.evaluate(decodeURIComponent(v)); else if (k === 'click') await p.mouse.click(+v, +v2); else if (k === 'move') await p.mouse.move(+v, +v2); }
await p.screenshot({ path: out });
const snap = await p.evaluate(() => { try { return JSON.stringify(My3D2dge.current.debug.snapshot()).slice(0, 400); } catch (e) { return 'nosnap ' + e; } });
console.log('snap', snap); console.log('errors', errs.length); errs.slice(0, 6).forEach(e => console.log('  ', e)); await b.close();
