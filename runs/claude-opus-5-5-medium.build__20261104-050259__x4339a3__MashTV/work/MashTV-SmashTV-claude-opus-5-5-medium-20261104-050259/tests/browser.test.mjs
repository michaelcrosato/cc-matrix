// Playwright on the deliverable over file://: errors, external requests, real frames on every deep link, touch, keyboard, mouse
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite } from './lib.mjs';
const DEV = join(dirname(fileURLToPath(import.meta.url)), '..'), FILE = 'file://' + join(DEV, '..', 'MashTV-SmashTV-claude-opus-5-5-medium-20261104-050259.html');
const LINKS = ['title', 'lobby', 'room=1-1', 'room=2-2', 'room=3-2', 'boss=1', 'boss=2', 'boss=3', 'greenroom', 'recap=1', 'ending=b', 'about', 'dev', 'card', 'attract'];
export default async () => {
  const S = suite('browser'), b = await chromium.launch();
  const watch = (p, bad) => { p.on('pageerror', e => bad.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') bad.push(m.text().slice(0, 160)); }); p.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) bad.push('external ' + u); }); };
  const variance = p => p.evaluate(() => { const c = document.getElementById('screen'), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; const seen = new Set(); let sum = 0, sq = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 17) { const v = d[i] + d[i + 1] + d[i + 2]; sum += v; sq += v * v; n++; seen.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4); } const m = sum / n; return { sd: Math.sqrt(sq / n - m * m), colors: seen.size }; });
  try {
    for (const [w, h] of [[1280, 720], [1920, 1080]]) {
      const p = await b.newPage({ viewport: { width: w, height: h } }), bad = []; watch(p, bad);
      for (const l of LINKS) {
        await p.goto('about:blank'); await p.goto(FILE + '#' + l); await p.waitForTimeout(l === 'title' ? 1800 : 2600);
        const v = await variance(p), s = await p.evaluate(() => My3D2dge.current.debug.snapshot());
        S.check(`${w}x${h} #${l} draws a real frame`, v.sd > 12 && v.colors > 12, JSON.stringify(v));
        S.check(`${w}x${h} #${l} reaches its scene`, s.scene !== 'boot' && s.errors === 0, s.scene + ' errors ' + s.errors);
        if (w === 1280) await p.screenshot({ path: join(DEV, 'shots', l.replace(/[^a-z0-9-]/gi, '_') + '.png') });
      }
      S.check(`${w}x${h} no console errors or external requests`, bad.length === 0, bad.slice(0, 4).join(' | '));
      await p.close();
    }
    // keyboard: title -> difficulty -> lobby with Enter; mouse hover moves the focus and a click activates
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }), bad = []; watch(p, bad);
    await p.goto(FILE); await p.waitForTimeout(1800);
    await p.keyboard.press('Enter'); await p.waitForTimeout(700); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    S.check('keyboard: Enter, Enter -> the lobby', await p.evaluate(() => My3D2dge.current.sceneName) === 'lobby');
    await p.goto('about:blank'); await p.goto(FILE); await p.waitForTimeout(1800);
    const rect = await p.evaluate(() => { const g = My3D2dge.current, sc = g.scene, r = sc.menu.rects[3], cv = document.getElementById('screen'), k = cv.getBoundingClientRect().width / g.r.W; return [(r[0] + r[2] / 2) * k, (r[1] + r[3] / 2) * k]; });
    await p.mouse.move(rect[0] - 40, rect[1] - 30); await p.mouse.move(rect[0], rect[1], { steps: 4 }); await p.waitForTimeout(200);
    S.check('mouse hover moves the focus', await p.evaluate(() => My3D2dge.current.scene.menu.i) === 3);
    await p.mouse.click(rect[0], rect[1]); await p.waitForTimeout(700);
    S.check('a click activates the item', await p.evaluate(() => My3D2dge.current.sceneName) === 'scores');
    S.check('no errors in the input checks', bad.length === 0, bad.join(' | '));
    await p.close();
    // a touch-only phone: the notice and the settings button
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const t = await ctx.newPage(); await t.goto(FILE); await t.waitForTimeout(2000);
    S.check('touch-only: the notice shows', await t.evaluate(() => MT.touch.only && My3D2dge.current.sceneName === 'title'));
    await t.screenshot({ path: join(DEV, 'shots', 'touch.png') });
    S.check('touch-only: no touch buttons', await t.evaluate(() => !document.querySelector('[data-act]') && My3D2dge.current.input.touchEnabled === false));
    await ctx.close();
  } finally { await b.close(); }
  return S;
};
