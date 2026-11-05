// the real AI Hub harness: node tests/lib/hubharness.mjs <port> <query>
import { chromium } from 'playwright';
const [, , port, q] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto(`http://127.0.0.1:${port}/harness.html?game=game.html&${q}`);
await p.waitForFunction(() => document.body.dataset.complete === 'true', null, { timeout: 420000 }).catch(() => {});
const r = await p.evaluate(() => ({ complete: document.body.dataset.complete, check: window.__hubCheck, titles: [...document.querySelectorAll('iframe')].map(f => { try { return f.contentDocument.title; } catch (e) { return '?'; } }) }));
const fails = r.check && r.check.checks ? r.check.checks.filter(c => !c.pass && !c.ok) : [];
console.log(q, 'complete', r.complete, 'pass', r.check && r.check.pass, 'titles', [...new Set(r.titles)].join(','), fails.length ? JSON.stringify(fails).slice(0, 1500) : '');
if (!r.check || !r.check.pass) console.log(JSON.stringify(r.check).slice(0, 3000));
await b.close();
