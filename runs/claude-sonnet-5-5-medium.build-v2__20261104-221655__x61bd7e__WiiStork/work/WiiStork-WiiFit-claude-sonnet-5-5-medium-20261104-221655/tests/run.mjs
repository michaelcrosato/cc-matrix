// node tests/run.mjs [rules|play|browser|hub|all] : prints only failures and one final line
const group = process.argv[2] || 'rules'; let pass = 0, fail = 0; const out = [];
const T = { ok(c, m) { if (c) pass++; else { fail++; out.push('FAIL ' + m); } } };
const groups = group === 'all' ? ['rules', 'play', 'half', 'browser', 'hub'] : [group];
for (const g of groups) { try { const m = await import(`./${g}.mjs`); await m.run(T); } catch (e) { fail++; out.push('FAIL ' + g + ' threw: ' + (e && e.stack || e).toString().split('\n').slice(0, 3).join(' / ')); } }
console.log(out.join('\n') + (out.length ? '\n' : '') + `${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
