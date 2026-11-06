import { chromium, devices } from 'playwright';
import { readFileSync } from 'node:fs';
import { url } from '../tools/lib.mjs';
import { S, adv, press, newGame } from '../tools/drive.mjs';
const AUDIT = () => {
  const out = []; const W = innerWidth, H = innerHeight; const mx = W * 0.05 - 2, my = H * 0.05 - 2;
  const root = document.getElementById('ui'); const els = root.querySelectorAll('*');
  for (const e of els) {
    const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) continue;
    const fs = parseFloat(cs.fontSize); const r = e.getBoundingClientRect(); const txt = e.textContent.trim().slice(0, 24);
    if (fs < 29.5) out.push(`small text ${fs.toFixed(0)}px: ${txt}`);
    if (r.width > 0 && (r.left < mx || r.right > W - mx || r.top < my || r.bottom > H - my)) out.push(`outside safe area: ${txt} [${r.left | 0},${r.top | 0},${r.right | 0},${r.bottom | 0}]`);
  }
  const focusables = document.querySelectorAll('#screen .tag:not(.pager)').length; if (focusables > 6) out.push('more than six focusable items: ' + focusables);
  if (document.querySelector('#screen .tag') && !document.querySelector('#screen .tag.focus')) out.push('no visible focus');
  return out;
};
export default async function (t) {
  const b = await chromium.launch({ args: ['--disable-gpu'] });
  try {
    const p = await newGame(b); const { adv: A } = await import('../tools/drive.mjs');
    await p.evaluate(() => { const g = window.__TEST__.game; g.saveData.profiles[0] = { name: 'Gentle Margaret', paint: 0, hat: 0, day: 3, step: 4, doneToday: ['roomService'], ages: [70, 55, 41], medals: { poses: 2, fruitHat: 3 }, bestTier: {}, met: ['poses', 'fruitHat'], marbles: 20, floor: 5, minutes: 12, levelled: false, calendar: [1, 2], asked: [], checkedIn: true }; g.selectProfile(0); });
    const visit = async (name, fn, arg) => { await p.evaluate(fn, arg); await adv(p, 0.6); const v = await p.evaluate(AUDIT); const uniq = [...new Set(v)].slice(0, 4); t.ok(uniq.length === 0, `ui ${name}: ${uniq.join(' | ')}`); };
    await visit('title', () => window.__TEST__.game.go('title'));
    await visit('menu', () => window.__TEST__.game.go('menu'));
    await visit('profiles', () => window.__TEST__.game.go('profiles', {}));
    for (let pg = 0; pg < 4; pg++) await visit('settings page ' + pg, (x) => { const g = window.__TEST__.game; g.go('settings', { from: 'menu' }); g.screens.settings.page = x; g.screens.settings.draw(0); }, pg);
    for (let pg = 0; pg < 8; pg++) await visit('about page ' + pg, (x) => { const g = window.__TEST__.game; g.go('about'); g.screens.about.p = x; g.screens.about.sub = 0; g.screens.about.draw(); }, pg);
    for (let pg = 0; pg < 4; pg++) await visit('journal page ' + pg, (x) => { const g = window.__TEST__.game; g.go('journal'); g.screens.journal.p = x; g.screens.journal.draw(); }, pg);
    await visit('mirror', () => window.__TEST__.game.go('mirror')); await visit('plan', () => window.__TEST__.game.go('plan')); await visit('freeplay', () => window.__TEST__.game.go('freeplay')); await visit('group', () => window.__TEST__.game.go('group'));
    await visit('island', () => { const g = window.__TEST__.game; g.go('island', { fresh: true }); g.killScripts(); g.endSpeech(); g.busy = false; });
    await visit('intro', () => { const g = window.__TEST__.game; g.killScripts(); g.endSpeech(); g.startEvent('poses', { programme: true, tier: 0 }); }); await adv(p, 1);
    await p.evaluate(() => { window.__TEST__.game.disposeEvent(); window.__TEST__.game.go('pause'); }); await adv(p, 0.5); let v = await p.evaluate(AUDIT); t.ok(v.length === 0, 'ui pause: ' + v.slice(0, 3).join(' | '));
    for (let pg = 0; pg < 12; pg++) await visit('dev page ' + pg, (x) => { window.__TEST__.game.go('dev', { page: x }); }, pg);
    // play HUD
    await p.evaluate(() => { const g = window.__TEST__.game; g.paused = false; g.startEvent('fruitHat', { programme: true, tier: 0 }); }); await adv(p, 1.5); await press(p, 'ok'); await adv(p, 5); v = await p.evaluate(AUDIT); t.ok(v.length === 0, 'ui play HUD: ' + [...new Set(v)].slice(0, 3).join(' | '));
    await p.evaluate(() => { const g = window.__TEST__.game; g.ev.lanes[0].form = 70; g.ev.finish(); }); await adv(p, 3); await adv(p, 0.5); s0 = await S(p); v = await p.evaluate(AUDIT); t.ok(v.length === 0, 'ui results: ' + [...new Set(v)].slice(0, 3).join(' | ')); var s0;
    // About shows every Source Information field and the answers, matching the exit-interview file
    const ei = JSON.parse(readFileSync('../exit-interview.json', 'utf8')); const txt = []; for (let pg = 0; pg < 8; pg++) for (let sub = 0; sub < 3; sub++) txt.push(await p.evaluate(([x, y]) => { const g = window.__TEST__.game; g.go('about'); g.screens.about.p = x; g.screens.about.sub = y; g.screens.about.draw(); return document.getElementById('ab') ? document.getElementById('ab').innerText : ''; }, [pg, sub])); const all = txt.join('\n').replace(/\s+/g, ' ');
    for (const k of Object.keys(ei.sourceInformation)) t.ok(all.includes(String(ei.sourceInformation[k]).replace(/\s+/g, ' ')), 'About shows source field ' + k);
    for (const k of ['testingFeedback', 'engineFeedback', 'promptFeedback']) ei[k].forEach((a, i) => t.ok(all.includes(a.replace(/\s+/g, ' ')), `About shows ${k}[${i}]`));
    t.ok(p.errs.length === 0, 'no page errors in ui group: ' + p.errs.slice(0, 2).join(' | '));
    // touch-only devices
    for (const name of ['Pixel 7', 'iPhone 14', 'iPad (gen 7)']) { const dev = devices[name]; if (!dev) { t.ok(false, 'no device profile ' + name); continue; } const ctx = await b.newContext({ ...dev }); const q = await ctx.newPage(); await q.goto(url('test=1&render=0&manual=1&audio=0')); await q.waitForFunction(() => window.__done); await q.evaluate(() => window.__TEST__.advance(2));
      const txt2 = await q.evaluate(() => document.body.innerText); t.ok(/Controller or keyboard required/.test(txt2), name + ' shows Controller or keyboard required'); t.ok(await q.evaluate(() => !!document.getElementById('touchSettings')), name + ' shows a Settings button');
      await q.tap('#touchSettings'); await q.evaluate(() => window.__TEST__.advance(0.5)); t.eq((await S(q)).screen, 'settings', name + ' tap opens Settings'); await q.evaluate(() => window.__TEST__.goto('title')); await q.evaluate(() => window.__TEST__.advance(0.5));
      await q.evaluate(() => { const g = window.__TEST__.game; g.idle = 0; }); await q.evaluate(() => window.__TEST__.advance(10.6)); t.ok((await S(q)).attract, name + ' attract runs'); await q.keyboard.press('Enter'); await q.evaluate(() => window.__TEST__.advance(0.5)); const st = await S(q); t.ok(!st.touchOnly, name + ' a key clears the touch-only state'); await ctx.close(); }
    // a wall-clock attract run: 10 real seconds
    const pr = await newGame(b, { qs: 'test=1&render=0&audio=0' }); const t0 = Date.now(); let started = null; for (let i = 0; i < 40 && started === null; i++) { await pr.waitForTimeout(500); const sa = await S(pr); if (sa.attract) started = (Date.now() - t0) / 1000; } t.ok(started !== null && started >= 9 && started <= 16.5, 'attract starts about 10 wall-clock seconds after boot (' + started + ' s)'); await pr.close();
  } finally { await b.close(); }
}
