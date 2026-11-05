import { chromium } from 'playwright';
const [,, url, out, wait='1500', w='1280', h='720'] = process.argv;
const b = await chromium.launch({ args: ['--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs=[]; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(url); await p.waitForTimeout(+wait); await p.screenshot({ path: out }); console.log(errs.length ? 'ERRORS: ' + errs.join('\n') : 'ok'); await b.close();
