import { createRequire } from 'node:module'; import { readdirSync } from 'node:fs';
const { chromium } = createRequire(new URL('../engine/package.json', import.meta.url))('playwright');
const file = new URL('../../' + readdirSync(new URL('../../', import.meta.url)).find(f => f.endsWith('.html')), import.meta.url).href;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(file + '#battle/border_meadow/spring'); await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
await p.waitForTimeout(3000);
for (const x of [300, 640, 900]) { await p.mouse.move(x, 360); await p.waitForTimeout(150); console.log(x, await p.evaluate(() => { const g = window.__game.game, G = window.__game.G; const m = g.mouseGround(); return JSON.stringify({ mg: m && m.map(v => Math.round(v)), ptr: g.input.pointer(), ms: g.input.mouseScreen && g.input.mouseScreen(), hex: m && G.worldHex(m[0], m[1]), mode: G.battle.mode, human: G.battle.humanTurn(), cur: G.battle.cursor }); })); }
await b.close();
