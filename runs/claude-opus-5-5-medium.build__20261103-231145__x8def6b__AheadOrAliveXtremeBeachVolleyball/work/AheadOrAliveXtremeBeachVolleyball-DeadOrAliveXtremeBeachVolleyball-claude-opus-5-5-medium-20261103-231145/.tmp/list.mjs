for (const f of ['17-task', '18-real', '19-review']) {
  const m = await import('../test/suites/' + f + '.test.mjs');
  await m.default((name, ok, d) => console.log((ok ? 'PASS ' : 'FAIL ') + f.slice(3) + ' › ' + name + (ok ? '' : ': ' + d)));
}
