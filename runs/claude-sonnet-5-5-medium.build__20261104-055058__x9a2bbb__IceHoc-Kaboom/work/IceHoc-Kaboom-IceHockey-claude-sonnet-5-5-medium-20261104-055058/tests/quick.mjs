import { load } from './lib.mjs'; import { execSync } from 'node:child_process';
execSync('node tools/build.mjs', { cwd: new URL('..', import.meta.url).pathname, stdio: 'inherit' });
const { game, G } = load(); const { Match, Flow, Bus } = G;
const goals = []; Bus.on('goal', g => goals.push(g)); const evc = {}; Bus.on('*', e => { evc[e.type] = (evc[e.type] || 0) + 1; });
const m = Match.create({ home: 'muskrats', away: 'drillers', arena: 'icebox', periods: 3, periodLen: 90, shootout: true, seed: 5 });
const t0 = Date.now();
let steps = 0; while (steps < 120 * 320 && !m.over) { try { Flow.step(m, 1 / 120); } catch (e) { console.log('ERR', e.stack.split('\n').slice(0, 5).join('\n')); break; } steps++; }
console.log('steps', steps, 'time', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'phase', m.phase, 'period', m.period, 'score', m.score, 'shots', m.stats.shots, 'sog', m.stats.sog, 'hits', m.stats.hits);
console.log(JSON.stringify(evc));
