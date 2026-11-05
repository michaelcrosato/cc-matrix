import { createRequire } from 'node:module'; import { readdirSync } from 'node:fs';
const { chromium } = createRequire(new URL('../engine/package.json', import.meta.url))('playwright');
const file = new URL('../../' + readdirSync(new URL('../../', import.meta.url)).find(f => f.endsWith('.html')), import.meta.url).href;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(file + '#battle/border_meadow/spring'); await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
await p.waitForTimeout(2000); await p.evaluate(() => { const B = window.__game.G.battle; if (B.mode === 'menu') { B.mode = 'select'; B.menuList = null; } });
for (let i = 0; i < 60; i++) { const ok = await p.evaluate(() => { const B = window.__game.G.battle; return B && B.humanTurn() && B.mode === 'select'; }); if (ok) break; await p.waitForTimeout(500); }
const before = await p.evaluate(() => JSON.stringify(window.__game.G.battle.cursor));
const seen = new Set(); for (let x = 200; x < 1100; x += 90) { await p.mouse.move(x, 360); await p.waitForTimeout(80); seen.add(await p.evaluate(() => JSON.stringify(window.__game.G.battle.cursor))); }
// click the screen point of an own unit that has not acted
const pt = await p.evaluate(() => { const G = window.__game.G, game = window.__game.game, B = G.battle, u = B.unitsLeft()[0], [x, y] = G.hexWorld([u.cx, u.cy]), q = game.view.p(x, y, 0), c = document.getElementById('screen'), r = c.getBoundingClientRect(); return [ (q[0] - game.screen.ix) * r.width / game.W + r.left, (q[1] - game.screen.iy) * r.height / game.H + r.top, u.cx, u.cy ]; });
await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(100); await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(300);
const after = await p.evaluate(() => ({ mode: window.__game.G.battle.mode, cursor: window.__game.G.battle.cursor }));
console.log('hover cursors seen', seen.size, 'before', before, 'click on', pt.slice(2), '->', JSON.stringify(after), errs.slice(0, 2));
await b.close();
