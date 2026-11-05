import { load } from './lib.mjs';
const N = +(process.argv[2] || 6), per = +(process.argv[3] || 90);
const tot = { goals: 0, shots: 0, sog: 0, saves: 0, hits: 0, big: 0, fights: 0, kab: 0, pass: 0, glass: 0, ot: 0 };
let errs = 0;
for (let i = 0; i < N; i++) {
  const { game, G } = load(); const { Match, Flow, Bus } = G; game.advance(.1);
  const c = { big: 0, glass: 0, save: 0, fights: 0, kab: 0 }; const off = [Bus.on('big_hit', () => c.big++), Bus.on('glass_shatter', () => c.glass++), Bus.on('save', () => c.save++), Bus.on('fight_start', () => c.fights++), Bus.on('kaboom_start', () => c.kab++)];
  const teams = ['muskrats', 'drillers', 'lumberjacks', 'bruisers', 'marauders']; const m = Match.create({ home: teams[i % 5], away: teams[(i + 2) % 5], arena: ['icebox', 'pond', 'grind', 'mall', 'dome'][i % 5], periods: 3, periodLen: per, diff: 1, shootout: false, ot: false, seed: 100 + i, noReplay: true, cfg: 0 });
  let steps = 0; try { while (steps < 120 * (per * 3 + 80) && !m.over) { Flow.step(m, 1 / 120); steps++; } } catch (e) { console.log('ERR', e.stack.split('\n').slice(0, 4).join('|')); errs++; }
  tot.goals += m.score[0] + m.score[1]; tot.shots += m.stats.shots[0] + m.stats.shots[1]; tot.sog += m.stats.sog[0] + m.stats.sog[1]; tot.saves += c.save; tot.hits += m.stats.hits[0] + m.stats.hits[1]; tot.big += c.big; tot.fights += c.fights; tot.kab += c.kab; tot.pass += m.stats.passes[0] + m.stats.passes[1]; tot.glass += c.glass;
  console.log(`game ${i}: ${m.teams[0].abbr} ${m.score} ${m.teams[1].abbr} shots ${m.stats.shots} sog ${m.stats.sog} saves ${c.save} hits ${m.stats.hits} big ${c.big} glass ${c.glass} fights ${c.fights} kab ${c.kab} pass ${m.stats.passes} over ${m.over}`);
  off.forEach(f => f());
}
const per_ = k => (tot[k] / N).toFixed(1); console.log('AVG/game goals', per_('goals'), 'shots', per_('shots'), 'sog', per_('sog'), 'saves', per_('saves'), 'hits', per_('hits'), 'big', per_('big'), 'glass', per_('glass'), 'fights', per_('fights'), 'kab', per_('kab'), 'pass', per_('pass'), 'save%', (tot.saves / Math.max(1, tot.saves + tot.goals)).toFixed(2));
