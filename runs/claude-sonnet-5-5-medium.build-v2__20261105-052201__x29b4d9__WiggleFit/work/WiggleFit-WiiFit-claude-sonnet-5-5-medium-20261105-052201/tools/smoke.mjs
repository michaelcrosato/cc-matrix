import { launch, url } from './lib.mjs';
const b = await launch({});
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const logs = []; p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.type() + ': ' + m.text().slice(0, 300)); }); p.on('pageerror', (e) => logs.push('PAGEERR ' + e.message + (e.stack || '').slice(0, 400)));
await p.goto(url('test=1&render=0&manual=1'));
await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 30000 });
const T = (f, ...a) => p.evaluate(f, ...a);
console.log('boot', await T(() => JSON.stringify({ err: window.__err, s: window.__TEST__ && window.__TEST__.state().screen })));
await T(() => window.__TEST__.advance(2)); console.log('after 2s', await T(() => window.__TEST__.state().screen));
for (const step of ['ok', 'ok']) { await T((a) => window.__TEST__.press(a), step); await T(() => window.__TEST__.advance(0.5)); console.log('press', step, await T(() => window.__TEST__.state().screen)); }
console.log(logs.slice(0, 10).join('\n')); console.log(await T(() => JSON.stringify(window.__TEST__.state().errors)));
await b.close();
