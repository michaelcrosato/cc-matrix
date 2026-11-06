// One command: node tests/run.mjs [sim|content|browser|hub] ... prints only failures and a one-line count.
const filter = process.argv[2] || 'all';
const fails = []; let count = 0;
export const T = { ok(c, m) { count++; if (!c) fails.push(m); }, eq(a, b, m) { count++; if (JSON.stringify(a) !== JSON.stringify(b)) fails.push(`${m}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); } };
const origLog = console.log; if (process.env.VERBOSE !== '1') console.log = () => {};
const suites = { sim: './sim.test.mjs', content: './content.test.mjs', campaign: './campaign.test.mjs', audio: './audio.test.mjs', net: './net.test.mjs' };
for (const [k, f] of Object.entries(suites)) { if (filter !== 'all' && filter !== k && !(filter === 'sim' && k === 'campaign')) continue; try { const m = await import(f); await m.run(T); } catch (e) { count++; fails.push(`${k} suite crashed: ${e.stack?.split('\n').slice(0, 3).join(' | ')}`); } }
if (filter === 'all' || filter === 'browser') { try { const m = await import('./browser/browser.test.mjs'); await m.run(T); } catch (e) { count++; fails.push('browser suite crashed: ' + (e.message || e)); } }
if (filter === 'all' || filter === 'hub') { try { const m = await import('./browser/hub.test.mjs'); await m.run(T); } catch (e) { count++; fails.push('hub suite crashed: ' + (e.message || e)); } }
console.log = origLog;
for (const f of fails) console.log('FAIL', f);
console.log(`${fails.length ? 'FAILED' : 'ok'}: ${count - fails.length}/${count} checks passed`);
process.exit(fails.length ? 1 : 0);
