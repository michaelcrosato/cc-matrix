// Screenshots for what a script can't check: node tools/shot.mjs <name>=<hash>[;<steps>] ... [--size 1280x720] [--page dist/index.html]
// [--touch] (a phone: touch only, no mouse)
// steps: wait:ms  key:Code  hold:Code:ms  mouse:x,y  click:x,y  tap:x,y (the game's screen pixels, or a JS expression giving [x, y])
//        js:<expr>  check:<expr> (prints its JSON value)  shot:<suffix>
// Writes .tmp/shots/<name>.png and prints page errors (and the game's own) for each.
import { chromium } from '../engine/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const [w, h] = opt('size', '1280x720').split('x').map(Number);
const pagePath = resolve(DEV, opt('page', 'dist/index.html'));
const jobs = args.filter((a, i) => !a.startsWith('--') && !['--size', '--page'].includes(args[i - 1])), touch = args.includes('--touch');
const out = join(DEV, '.tmp/shots'); mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const job of jobs) {
  const eqi = job.indexOf('='), name = job.slice(0, eqi), rest = job.slice(eqi + 1);
  const [hash, ...steps] = (rest || '').split((rest || '').includes(';;') ? ';;' : ';');
  const page = await browser.newPage(Object.assign({ viewport: { width: w, height: h } }, touch ? { hasTouch: true, isMobile: true } : {}));
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await page.goto(pathToFileURL(pagePath).href + (hash ? '#' + hash : ''));
  await page.waitForTimeout(1500);
  let n = 0;
  for (const st of steps.length ? steps : ['wait:1500']) {
    const [k, a, b] = st.split(':');
    if (k === 'wait') await page.waitForTimeout(+a);
    else if (k === 'key') { await page.keyboard.down(a); await page.waitForTimeout(80); await page.keyboard.up(a); await page.waitForTimeout(120); }
    else if (k === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(+b); await page.keyboard.up(a); }
    else if (k === 'js') await page.evaluate(st.slice(3));
    else if (k === 'check') console.log(name + ': check ' + JSON.stringify(await page.evaluate(st.slice(6))));
    else if (k === 'mouse' || k === 'click' || k === 'tap') {   // a real Playwright mouse at a point in the game's screen pixels (the inverse of Input.screenPoint)
      const arg = st.slice(k.length + 1), pt = /^[\d.]+,[\d.]+$/.test(arg) ? arg.split(',').map(Number) : await page.evaluate(arg);
      const css = await page.evaluate(([x, y]) => { const S = My3D2dge.current.screen, rc = S.canvas.getBoundingClientRect(); return [rc.left + (x * S.S + S.OX) / S.dpr, rc.top + (y * S.S + S.OY) / S.dpr]; }, pt);
      if (k === 'tap') { await page.touchscreen.tap(css[0], css[1]); await page.waitForTimeout(200); continue; }
      await page.mouse.move(css[0] - 40, css[1] - 4); await page.waitForTimeout(60); await page.mouse.move(css[0], css[1], { steps: 8 }); await page.waitForTimeout(150);
      if (k === 'click') { await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); await page.waitForTimeout(150); }
    }
    else if (k === 'shot') { await page.screenshot({ path: join(out, name + '-' + a + '.png') }); n++; }
    else if (k === 'zoom') {   // zoom:x,y,w,h — the game's own buffer region, scaled x4
      const [x, y, zw, zh] = a.split(',').map(Number);
      const url = await page.evaluate(([x, y, zw, zh]) => { const src = My3D2dge.current.screen.buf, c = document.createElement('canvas'); c.width = zw * 4; c.height = zh * 4; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, x, y, zw, zh, 0, 0, zw * 4, zh * 4); return c.toDataURL('image/png'); }, [x, y, zw, zh]);
      const { writeFileSync } = await import('node:fs'); writeFileSync(join(out, name + '-zoom.png'), Buffer.from(url.split(',')[1], 'base64'));
    }
  }
  await page.screenshot({ path: join(out, name + '.png') });
  const gameErrs = await page.evaluate(() => (window.My3D2dge && My3D2dge.current ? My3D2dge.current.errors.map(e => (e.message || String(e)) + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')) : ['no game'])).catch(() => ['eval failed']);
  const snap = await page.evaluate(() => { const g = My3D2dge.current; return g && g.debug ? JSON.stringify(g.debug.snapshot()).slice(0, 220) : ''; }).catch(() => '');
  console.log(name + ': ' + (errs.length + gameErrs.length ? 'ERRORS ' + JSON.stringify(errs.concat(gameErrs)).slice(0, 900) : 'ok') + ' | ' + snap);
  await page.close();
}
await browser.close();
