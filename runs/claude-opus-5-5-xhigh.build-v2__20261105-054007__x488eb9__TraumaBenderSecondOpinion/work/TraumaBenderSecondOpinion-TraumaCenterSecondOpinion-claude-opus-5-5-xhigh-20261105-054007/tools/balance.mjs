// Bot runs for tuning, not part of the tests. node tools/balance.mjs [caseId] prints one compact line per case, skill and difficulty.
// Also computes par: a perfect bot's score at Resident (node tools/balance.mjs --par).
import { writeFileSync } from 'node:fs';
import { loadSim, runCase } from './simrun.mjs';
const SKILLS = { perfect: {}, human: { speed: 260, react: .25, aim: 3, iv: 35 }, shaky: { speed: 200, react: .45, aim: 5, iv: 40 } };
const ctx = loadSim(); const G = ctx.GAME; const only = process.argv[2];
if (only === '--par') {   // writes src/data/pars.js: par is a perfect bot's score at Resident, less 5% so a person with perfect technique can still see an S
  const out = {}; for (const id of [...G.CASE_ORDER, 'grandrounds']) { if (!G.CASES[id]) continue; G.CASES[id].par = 1e6; const { S } = runCase(ctx, id, { diff: 'resident', seed: 100 }); out[id] = Math.round(S.score * .95 / 10) * 10; console.log(id.padEnd(14), S.status, Math.round(S.score), 'par', out[id], 'clock', S.clock | 0, 'v', S.vitals | 0); }
  writeFileSync(new URL('../src/data/pars.js', import.meta.url), '// Par for each case: a perfect bot\'s score at Resident, less 5%. Written by node tools/balance.mjs --par.\n(() => { const G = (window.GAME ||= {}), P = ' + JSON.stringify(out) + '; for (const k in P) if (G.CASES[k]) G.CASES[k].par = P[k]; })();\n');
  process.exit(0);
}
let total = 0, wins = 0;
for (const id of [...G.CASE_ORDER, 'grandrounds']) { if (!G.CASES[id] || (only && only !== id)) continue;
  for (const [name, sk] of Object.entries(SKILLS)) for (const diff of name === 'perfect' ? ['resident'] : ['intern', 'resident']) {
    let w = 0, line = ''; const N = name === 'perfect' ? 1 : 4;
    for (let k = 0; k < N; k++) { const { S, secs } = runCase(ctx, id, { diff, seed: 100 + k, skill: { ...sk, seed: 7 + k } }); if (S.status === 'closed') w++; line = `${S.status} ph${S.ph} ${secs | 0}s clock ${S.clock | 0}/${S.clockMax | 0} v ${S.vitals | 0} score ${S.score | 0} ${S.rank} slips ${S.stats.slips} tb ${S.stats.tb} cl ${S.stats.cl} sl ${S.stats.sl} codes ${S.stats.codes}${S.lost ? ' lost:' + S.lost : ''}`; }
    console.log(`${id.padEnd(13)} ${name.padEnd(7)} ${diff.padEnd(8)} ${w}/${N} | ${line}`); } }
