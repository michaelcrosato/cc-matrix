import { chromium } from 'playwright';
const [url, out, wait='4000'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
p.on('console', m => console.log('[c]', m.text().slice(0,300))); p.on('pageerror', e => console.log('[err]', e.message.slice(0,500)));
await p.goto(url); await p.waitForTimeout(+wait); await p.screenshot({ path: out }); await b.close();
