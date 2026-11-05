// Real-browser check through the Settings screen itself: Camera -> High changes the match's view; Button symbols ->
// Xbox changes the glyphs (How to Play on a pad shows A B X Y). Screenshots in check-output/verify-*.png.
import { chromium } from 'playwright';
const file = 'file://' + process.argv[2];
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }); const p = await ctx.newPage(); const errs = [];   // (one context: settings persist between its pages)
p.on('pageerror', e => errs.push(e.message));
const rowButton = async label => p.evaluate(l => { const rows = [...document.querySelectorAll('.esh .esh-row')]; const r = rows.find(x => x.textContent.trim().toLowerCase().startsWith(l.toLowerCase()) && !x.querySelector('input') && x.querySelector('button')); if (!r) return null; const btn = r.querySelector('button'); btn.scrollIntoView(); btn.click(); return r.textContent.trim().replace(/\s+/g, ' ').slice(0, 80); }, label);
await p.goto(file + '#exhibition/pier/breakers-crushers'); await p.waitForTimeout(2500);
console.log('view before', await p.evaluate(() => window.__bb.game.view.id));
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
await p.evaluate(() => [...document.querySelectorAll('.esh button')].find(x => x.textContent.trim() === 'Settings').click()); await p.waitForTimeout(500);
console.log('Settings row clicked:', await rowButton('Camera'));
await p.waitForTimeout(300); await p.screenshot({ path: 'check-output/verify-settings-camera.png' });
console.log('Settings row clicked:', await rowButton('Button symbols'));
console.log('settings now', await p.evaluate(() => ({ camera: window.__bb.game.settings.camera, glyphs: window.__bb.game.settings.glyphs })));
await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const s = await p.evaluate(() => ({ scene: window.__bb.game.sceneName, paused: window.__bb.game.paused, shell: window.__bb.game.shell.screen }));
if (s.paused) { await p.evaluate(() => window.__bb.game.resume()); }
await p.waitForTimeout(3000); console.log('view after', await p.evaluate(() => window.__bb.game.view.id), 'zoom', await p.evaluate(() => window.__bb.game.zoom.toFixed(2)));
await p.screenshot({ path: 'check-output/verify-high.png' });
// Xbox glyphs on How to Play with a pad as the last device
const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(e.message));
await p2.goto(file + '#howto'); await p2.waitForTimeout(1500);
const g = await p2.evaluate(() => { const bb = window.__bb; bb.game.input.lastDevice = 'gamepad'; return { scene: bb.game.sceneName, saved: bb.game.settings.glyphs, glyphs: ['shoot', 'pass', 'shove', 'oop', 'turbo'].map(a => { const x = bb.glyphFor(a, bb.game.input); return a + ':' + x.style + ':' + x.n; }).join(' ') }; });
console.log('a fresh page (the setting is saved):', JSON.stringify(g));
await p2.waitForTimeout(400); await p2.screenshot({ path: 'check-output/verify-xbox.png' });
console.log('page errors:', errs.length ? errs : 'none'); await b.close();
