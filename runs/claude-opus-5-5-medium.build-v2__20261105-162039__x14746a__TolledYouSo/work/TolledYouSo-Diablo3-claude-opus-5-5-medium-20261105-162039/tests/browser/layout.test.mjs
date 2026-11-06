// Layout: drawn text stays inside the screen at three sizes, with no overlaps on each screen.
import { ok, guarded } from '../lib.mjs';
import { openGame, pressKey, step } from '../../tools/browser.mjs';
await guarded(async () => {
  for (const [W, H] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
    const { browser, page, errors } = await openGame({ width: W, height: H });
    const check = async (name) => {
      const r = await page.evaluate(() => { const tt = G.ui.drawnText.filter((t) => !t.world && t.text.trim()); const out = []; for (const t of tt) if (t.x < 0 || t.y < 0 || t.x + t.w > G.ui.W + 1 || t.y + t.h > G.ui.H + 1) out.push(`off: ${t.text}`); for (let i = 0; i < tt.length; i++) for (let j = i + 1; j < tt.length; j++) { const a = tt[i]; const b = tt[j]; if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) out.push(`overlap: ${a.text} / ${b.text}`); } return { out, size: [G.ui.W, G.ui.H] }; });
      ok(r.out.length === 0, `${W}x${H} [${r.size}] ${name}: ${r.out.slice(0, 3).join('; ').slice(0, 220)}`);
    };
    await step(page, 30); await check('title');
    await pressKey(page, 'Enter'); await step(page, 3); await check('menu');
    await page.evaluate(() => { G.ui.focus = 'm:SETTINGS'; }); await step(page, 2); await pressKey(page, 'Enter'); await step(page, 3); await check('settings'); await pressKey(page, 'Escape'); await step(page, 3);
    await page.evaluate(() => { G.ui.focus = 'm:ABOUT'; }); await step(page, 2); await pressKey(page, 'Enter'); await step(page, 3); await check('about'); await pressKey(page, 'Escape'); await step(page, 3);
    await page.evaluate(() => { G.ui.focus = 'm:NEW HERO'; }); await step(page, 2); await pressKey(page, 'Enter'); await step(page, 3); await check('new hero');
    await pressKey(page, 'Enter'); await step(page, 3); await check('start choice');
    await page.evaluate(() => { G.ui.focus = 'n:last'; }); await step(page, 2); await pressKey(page, 'Enter'); await step(page, 40); await check('hud');
    await page.evaluate(() => { const w = G.play.world; G.play.hud.toasts = []; G.play.hud.banner = null; }); await step(page, 2); await check('hud quiet');
    const screen = async (t, data, name, tabs = 1) => { await page.evaluate(([a, b]) => { G.play.menus.push(a, b); }, [t, data]); await step(page, 3); await check(name ?? t); for (let i = 1; i < tabs; i++) { await pressKey(page, 'KeyE'); await step(page, 3); await check(`${name ?? t} tab ${i + 1}`); } await page.evaluate(() => { G.play.menus.closeAll(); }); await step(page, 3); };
    await screen('pause', {}); await screen('hero', {}, 'hero', 5); await screen('vendor', {}, 'vendor', 3); await screen('brasse', {}, 'brasse', 3); await screen('ogive', {}, 'ogive', 4); await screen('stash', {}, 'stash'); await screen('map', {}, 'map'); await screen('party', {}, 'party'); await screen('howto', {}, 'how to play'); await screen('knell', {}, 'knell', 3); await screen('writs', {}, 'writs'); await screen('dev', {}, 'dev', 8);
    ok(errors.length === 0, `no page errors: ${errors[0]}`); await browser.close();
  }
});
