// the --browser checks: the single HTML from file:// (no errors, the session client first and unmodified, the hub tags,
// boot to the title, attract after 10 s idle, About renders). Run: node tests/browser.mjs (prints failures + a count)
import { createRequire } from 'node:module'; import { readFileSync, readdirSync } from 'node:fs';
const { chromium } = createRequire(new URL('../engine/package.json', import.meta.url))('playwright');
const root = new URL('../../', import.meta.url), name = readdirSync(root).find(f => f.endsWith('.html')), html = readFileSync(new URL(name, root), 'utf8');
let pass = 0, fail = 0; const t = async (n, fn) => { try { await fn(); pass++; } catch (e) { fail++; console.log('browser › ' + n + ': ' + e.message); } };
await t('the session client is the first script, unmodified', () => { const m = html.match(/<meta charset="utf-8">\s*<script>\n([\s\S]*?)\n<\/script>/); if (!m || m[1] !== readFileSync(new URL('../vendor/hub/session.js', import.meta.url), 'utf8')) throw new Error('client'); });
await t('the hub tags are present and nothing loads from outside', () => { for (const k of ['hub:session"', 'hub:session-players', 'hub:session-mode', 'hub:session-goal', 'hub:session-howto']) if (!html.includes(k)) throw new Error(k); if (/<script[^>]+src=|<link[^>]+href=["']https?:/.test(html)) throw new Error('external'); });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto(new URL(name, root).href); await p.waitForTimeout(2500);
const snap = () => p.evaluate(() => window.__game.game.debug.snapshot());
await t('it boots from file:// to the title with no errors', async () => { const s = await snap(); if (s.scene !== 'title' || errs.length || s.errors) throw new Error(s.scene + ' ' + errs[0]); });
await t('the attract mode starts after 10 s idle and a key returns', async () => { await p.waitForTimeout(10500); let s = await snap(); if (s.scene !== 'attract') throw new Error(s.scene); await p.waitForTimeout(3000); await p.keyboard.press('Enter'); await p.waitForTimeout(800); s = await snap(); if (s.scene !== 'title') throw new Error(s.scene); });
await t('About & Credits renders its pages', async () => { await p.evaluate(() => window.__game.game.go('about', { back: 'title' })); await p.waitForTimeout(800); for (let i = 0; i < 6; i++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150); } const s = await snap(); if (s.scene !== 'about' || errs.length) throw new Error(s.scene + ' ' + errs[0]); });
await t('mouse: hover moves the battle cursor, a click on a unit opens its commands', async () => {
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => errs.push(String(e)));
  await p.goto(new URL(name, root).href + '#battle/border_meadow/spring'); await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(300); }
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => { const B = window.__game.G.battle; if (B.mode === 'menu') { B.mode = 'select'; B.menuList = null; } return B.humanTurn() && B.mode === 'select' && !B.view.busy; }); if (ok) break; await p.waitForTimeout(400); }
  const seen = new Set(); for (let x = 200; x < 1100; x += 90) { await p.mouse.move(x, 360); await p.waitForTimeout(80); seen.add(await p.evaluate(() => JSON.stringify(window.__game.G.battle.cursor))); }
  if (seen.size < 4) throw new Error('hover moved the cursor over ' + seen.size + ' hexes');
  const pt = await p.evaluate(() => { const G = window.__game.G, game = window.__game.game, u = G.battle.unitsLeft()[0], [x, y] = G.hexWorld([u.cx, u.cy]), q = game.view.p(x, y, 0), r = document.getElementById('screen').getBoundingClientRect(); return [(q[0] - game.screen.ix) * r.width / game.W + r.left, (q[1] - game.screen.iy) * r.height / game.H + r.top]; });
  await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(100); await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(300);
  const mode = await p.evaluate(() => window.__game.G.battle.mode); await p.close(); if (mode !== 'menu' || errs.length) throw new Error(mode + ' ' + errs[0]);
});
await t('touch-only (a coarse-pointer phone): the notice shows and nothing is a touch control', async () => {
  const ph = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await ph.goto(new URL(name, root).href); await ph.waitForTimeout(2500);
  const s = await ph.evaluate(() => ({ t: window.__game.game.debug.snapshot().touchOnly, te: window.__game.game.input.touchEnabled })); await ph.close(); if (!s.t || s.te) throw new Error(JSON.stringify(s));
});
await b.close(); console.log(`${pass} passed, ${fail} failed (browser)`); process.exit(fail ? 1 : 0);
