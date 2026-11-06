// The 10-foot audit at 1920×1080, touch-only profiles, and the About screen against the exit interview.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
export default async function ({ ok, launch, logicPage, FILE_URL, root, devices, chromium, webkit, PAD_STUB, EVENT_IDS }) {
  const browser = await launch();
  const page = await logicPage(browser);
  await page.evaluate(() => {
    window.__audit = function audit(name, { allowOut = false } = {}) {
      const vw = innerWidth, vh = innerHeight, mx = vw * 0.05 - 3, my = vh * 0.05 - 3;
      const out = [];
      const ui = document.getElementById('ui');
      const walker = document.createTreeWalker(ui, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (el.closest('svg')) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const r = document.createRange(); r.selectNodeContents(n);
        const b = r.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        let hidden = false;
        for (let p = el; p && p !== document.body; p = p.parentElement) if (getComputedStyle(p).display === 'none') hidden = true;
        if (hidden) continue;
        if (parseFloat(cs.fontSize) < 29.5) out.push(`${name}: small text ${cs.fontSize} "${n.textContent.trim().slice(0, 24)}"`);
        if (!allowOut && (b.left < mx || b.right > vw - mx || b.top < my || b.bottom > vh - my)) out.push(`${name}: outside safe area "${n.textContent.trim().slice(0, 24)}" ${[b.left, b.top, b.right, b.bottom].map(Math.round)}`);
      }
      const T = window.__TEST__, top = T.game.ui.top;
      if (top && !top.passive) {
        if (top.items.length > 6) out.push(`${name}: ${top.items.length} choices`);
        if (top.items.length && !top.el.querySelector('.item.focus')) out.push(`${name}: no visible focus`);
        for (const it of top.items) { const b = it.el.getBoundingClientRect(); if (b.left < 0 || b.right > vw || b.top < 0 || b.bottom > vh) out.push(`${name}: item outside viewport`); }
      }
      return out;
    };
  });
  const problems = [];
  const audit = async (name, opts) => { const p = await page.evaluate(({ name, opts }) => window.__audit(name, opts || {}), { name, opts }); problems.push(...p); return p; };
  const go = (screen, args) => page.evaluate(({ screen, args }) => { const T = window.__TEST__; T.goto(screen, args); T.advance(0.2); }, { screen, args });
  const turnAll = async (name) => {
    const pages = await page.evaluate(() => window.__TEST__.game.ui.top.pages || 1);
    for (let i = 0; i < pages; i++) {
      await audit(`${name} page ${i + 1}`);
      await page.evaluate(() => { const T = window.__TEST__; T.game.ui.top.turn(1); T.advance(0.02); });
    }
    return pages;
  };
  // Seed a profile well along so screens have content.
  await page.evaluate(() => {
    const T = window.__TEST__, g = T.game;
    g.save.reset();
    g.programme.createProfile(0, 'Approximate Winifred', 'teal');
    const p = g.save.profile;
    p.tutorialDone = true; p.today = { day: 3, checkin: true, age: 55, done: ['roomService'], question: true }; p.day = 3; p.marbles = 40; p.marbleLog = Array(40).fill('pleasant'); p.stepsDone = 6;
    p.ages = [{ day: 1, age: 74 }, { day: 2, age: 60 }, { day: 3, age: 55 }]; p.stamps = [{ day: 1 }, { day: 2 }];
    for (const id of T.EVENTS ? Object.keys(T.EVENTS) : []) { p.seen[id] = true; p.tiers[id] = 2; p.medals[`${id}:0`] = { form: 90, medal: 'exemplary' }; }
    g.save.write();
  });
  await go('title'); await audit('title', { allowOut: false });
  await go('menu'); await audit('menu');
  await go('who'); await audit('who');
  await page.evaluate(() => { const T = window.__TEST__; T.game.save.data.profiles[1] = null; T.tap(15); T.tap(0); T.advance(0.1); });
  await audit('newProfile');
  await go('freeplay');
  await turnAll('freeplay');
  await page.evaluate(() => { const T = window.__TEST__; T.tap(0); T.advance(0.1); });
  await audit('tier');
  await go('journal'); ok((await turnAll('journal')) >= 4, 'Journal has at least four pages');
  await go('settings'); ok((await turnAll('settings')) === 4, 'Settings has four pages');
  await go('about'); const aboutPages = await turnAll('about');
  ok(aboutPages >= 8, 'About has at least eight pages', String(aboutPages));
  // Island and its overlays.
  await go('island', {});
  await page.evaluate(() => { const T = window.__TEST__; T.advance(1); });
  await audit('island');
  await page.evaluate(() => { const T = window.__TEST__; T.tap(3); T.advance(0.1); });
  await audit('plan');
  const stamp = await page.evaluate(() => !!document.querySelector('[data-stamp]'));
  ok(stamp, 'done classes are stamped on the plan');
  await page.evaluate(() => { const T = window.__TEST__; T.tap(1); T.game.speech.clear(); T.advance(0.1); });
  // Pause, How to Play, Dev Mode pages.
  await page.evaluate(() => { const T = window.__TEST__; T.goto('pause'); T.advance(0.05); });
  await audit('pause');
  await page.evaluate(() => { const T = window.__TEST__; T.tap(13); T.tap(13); T.tap(0); T.advance(0.05); });
  await audit('howto');
  await page.evaluate(() => { const T = window.__TEST__; T.tap(1); T.advance(0.05); });
  await page.evaluate(() => { const T = window.__TEST__; T.goto('dev'); T.advance(0.05); });
  const devPages = await turnAll('dev');
  ok(devPages >= 8, 'Dev Mode has its pages', String(devPages));
  // Every event: Intro Card, then the HUD mid-play.
  for (const id of EVENT_IDS) {
    await page.evaluate((id) => { const T = window.__TEST__; T.goto('menu'); T.goto('event', { id, tier: 0, skipIntro: false, skipCountdown: true }); T.advance(0.05); }, id);
    await audit(`intro ${id}`);
    await page.evaluate(() => { const T = window.__TEST__; T.tap(0); T.advance(0.5); T.game.speech.clear(); T.advance(0.05); });
    await audit(`hud ${id}`);
    const pr = await page.evaluate(() => [...document.querySelectorAll('.hud-prompts .prompt')].length);
    ok(pr >= 1, `${id} HUD shows this event's verbs`);
  }
  // Results.
  await page.evaluate(() => { const T = window.__TEST__; T.goto('menu'); T.game.flow.runClass('poses', 0, { programme: false }); T.advance(0.1); T.tap(0); T.advance(0.2); T.game.mode.skip(); T.advance(3.2); });
  await audit('results');
  ok(await page.evaluate(() => !!document.querySelector('[data-medal]')), 'Results show a stamped medal');
  // Check-In screens and the reveal.
  await go('checkin');
  await page.evaluate(() => { const T = window.__TEST__; T.advance(0.8); });
  await audit('checkin');
  await page.evaluate(() => { const T = window.__TEST__, g = T.game; g.mode.ev.allDone = true; g.mode.ev.scores = { standStill: 0.6 }; T.advance(1.2); T.advance(0.2); });
  await audit('reveal');
  await page.evaluate(() => { const T = window.__TEST__; T.advance(2.5); });
  await audit('reveal2');
  await go('jar'); await audit('jar');
  // Group Class screens.
  await go('group'); await page.evaluate(() => window.__TEST__.game.speech.clear());
  await audit('lobby');
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__TEST__.advance(0.1));
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__TEST__.advance(0.1));
  await audit('playlist');
  await page.evaluate(() => { const T = window.__TEST__; T.tap(13); T.tap(0); T.advance(0.1); });
  await turnAll('pick');
  await page.evaluate(() => { const T = window.__TEST__; T.goto('group'); T.game.mode.seats[0] = { source: 'kbm', name: 'Mat One', pad: -1 }; T.game.mode.points = [7, 0, 0, 0]; T.game.mode.podium(); T.advance(0.2); T.game.speech.clear(); });
  await audit('podium');
  await go('ending');
  await page.evaluate(() => { const T = window.__TEST__; const g = T.game; for (let i = 0; i < 80; i++) { if (g.speech.line && !g.speech.line.auto) T.tap(0); T.advance(0.2); if (T.state().screen === 'credits') break; } });
  await audit('credits');
  ok(problems.length === 0, '10-foot audit', problems.slice(0, 40).join('\n   '));
  ok(page.errors.length === 0, 'ui walk has no page errors', page.errors.slice(0, 3).join(' | ').slice(0, 400));
  // About shows every value from the exit interview, word for word.
  const iv = join(root, 'exit-interview.json');
  if (existsSync(iv)) {
    const j = JSON.parse(readFileSync(iv, 'utf8'));
    const seen = await page.evaluate(() => {
      const T = window.__TEST__;
      T.goto('about'); T.advance(0.1);
      const top = T.game.ui.top; let s = '';
      for (let i = 0; i < top.pages; i++) { s += ` ${document.querySelector('.about').textContent}`; top.turn(1); T.advance(0.01); }
      return s.replace(/\s+/g, ' ');
    });
    const norm = (x) => String(x).replace(/\s+/g, ' ').trim();
    for (const k of Object.keys(j.sourceInformation)) ok(seen.includes(norm(j.sourceInformation[k]).slice(0, 60)), `About shows ${k}`);
    for (const a of [...j.testingFeedback, ...j.engineFeedback, ...j.promptFeedback]) ok(seen.includes(norm(a).slice(0, 60)), 'About shows an answer', norm(a).slice(0, 40));
    ok(seen.includes('added on import'), 'About reads added on import');
  }
  await page.context().close();
  await browser.close();
  // No renderer at all: a plain message, not a blank page.
  const bb = await chromium.launch({ args: ['--no-sandbox'] });
  const bp = await bb.newPage({ viewport: { width: 1280, height: 720 } });
  await bp.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: undefined });
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function g(t, ...a) { return /webgl|webgpu/i.test(t) ? null : o.call(this, t, ...a); };
  });
  await bp.goto(FILE_URL);
  const bootText = await bp.waitForFunction(() => { const b = document.getElementById('boot'); return b && /needs WebGPU or WebGL2/.test(b.textContent) ? b.textContent : null; }, null, { timeout: 60000 }).then((h) => h.jsonValue()).catch(() => '');
  ok(/needs WebGPU or WebGL2/.test(bootText), 'with no renderer the page says what it needs', bootText.slice(0, 120) || 'no message');
  await bb.close();
  // Touch-only devices.
  const profiles = [['Pixel 7', chromium], ['iPhone 13', webkit], ['iPad (gen 7)', webkit]];
  for (const [dev, kind] of profiles) {
    const b = await (kind === webkit ? webkit.launch() : chromium.launch({ args: ['--no-sandbox'] }));
    const ctx = await b.newContext({ ...devices[dev] });
    const p = await ctx.newPage();
    await p.addInitScript(PAD_STUB);
    await p.goto(`${FILE_URL}?test=1&render=0&manual=1`);
    await p.waitForFunction(() => window.__TEST__ && !document.getElementById('boot'), null, { timeout: 90000 });
    const s = await p.evaluate(() => {
      const T = window.__TEST__; T.advance(0.2);
      const text = document.getElementById('ui').textContent;
      return { note: text.includes('Controller or keyboard required'), settings: [...document.querySelectorAll('.item')].some((e) => e.textContent.includes('Settings')), screen: T.state().screen, items: T.game.ui.top ? T.game.ui.top.items.length : 0, touch: T.game.touchOnly };
    });
    ok(s.touch && s.note && s.settings && s.items === 1, `${dev}: Controller or keyboard required, and Settings`, JSON.stringify(s));
    const box = await p.evaluate(() => { const e = [...document.querySelectorAll('.item')].find((x) => x.textContent.includes('Settings')).getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 }; });
    await p.touchscreen.tap(box.x, box.y);
    const s2 = await p.evaluate(() => { const T = window.__TEST__; T.advance(0.1); return T.state().screen; });
    ok(s2 === 'settings', `${dev}: tap opens Settings`, s2);
    // Attract runs after 10 s; a tap returns to this screen.
    await p.evaluate(() => { const T = window.__TEST__; T.game.ui.close(T.game.ui.top); T.advance(10.5); });
    const s3 = await p.evaluate(() => window.__TEST__.state().attract);
    ok(s3, `${dev}: attract runs`);
    await p.touchscreen.tap(100, 100);
    const s4 = await p.evaluate(() => { const T = window.__TEST__; T.advance(0.2); return { a: T.state().attract, n: document.getElementById('ui').textContent.includes('Controller or keyboard required') }; });
    ok(!s4.a && s4.n, `${dev}: a tap returns to this screen`, JSON.stringify(s4));
    // A pad clears the state.
    const s5 = await p.evaluate(() => { const T = window.__TEST__; T.tap(0); T.advance(0.2); return { touch: T.game.touchOnly, note: document.getElementById('ui').textContent.includes('Controller or keyboard required') }; });
    ok(!s5.touch && !s5.note, `${dev}: a pad clears the state`, JSON.stringify(s5));
    await b.close();
  }
}
