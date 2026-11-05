// Quick look: open the built file, run a script of steps, screenshot. node tools/shot.mjs <name> "<js to eval>" [waitMs]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const FILE = process.env.FILE || 'file://' + ROOT + '../Crackmania-TrackMania2003-claude-opus-5-5-medium-20261104-050311.html';
const [name = 'shot', js = '', wait = '3000', hash = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await p.goto(FILE + hash);
try { await p.waitForFunction(() => window.__crack && window.__crack.game, null, { timeout: 90000 }); } catch (e) { console.log('BOOT TIMEOUT'); for (const x of errs) console.log(x); console.log(await p.evaluate(() => document.body.innerText.slice(0, 1500))); await b.close(); process.exit(1); }
await p.waitForTimeout(1500);
for (const part of js.split(';;').filter(Boolean)) { if (/^wait:\d+$/.test(part)) { await p.waitForTimeout(+part.slice(5)); continue; } if (/^key:/.test(part)) { await p.keyboard.press(part.slice(4)); continue; } if (/^shot:/.test(part)) { await p.screenshot({ path: ROOT + 'check-output/' + part.slice(5) + '.png' }); continue; } await p.evaluate(part); }
await p.waitForTimeout(+wait);
await p.screenshot({ path: ROOT + 'check-output/' + name + '.png' });
const snap = await p.evaluate(() => JSON.stringify(window.__crack.snapshot()));
console.log(snap); for (const e of errs.slice(0, 10)) console.log(e);
await b.close();
