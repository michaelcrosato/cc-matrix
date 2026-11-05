// THE test command: node test/run.mjs   (prints only failures and a one-line count)
import { results } from './lib.mjs';
const suites = process.argv.slice(2).length ? process.argv.slice(2) : ['suite-sim', 'suite-game', 'suite-bundle'];
for (const s of suites) { try { await import(`./${s}.mjs`); } catch (e) { results.n++; results.fails.push(`${s} crashed: ${e && e.stack || e}`); } }
for (const f of results.fails) console.log('FAIL ' + f);
console.log(`${results.n - results.fails.length}/${results.n} checks passed`);
process.exit(results.fails.length ? 1 : 0);
