import { readFileSync, readdirSync } from 'node:fs';
import { load } from '../lib/load.mjs';
export default async t => {
  const { G, game } = load(); game.advance(.5);
  G.seed('match', 5); const a = [G.rng('match'), G.rng('match')]; G.seed('match', 5); const b = [G.rng('match'), G.rng('match')];
  t('rng streams reproduce', a[0] === b[0] && a[1] === b[1]);
  G.seed('world', 9); G.seed('match', 5); const c = G.rng('match'); G.rng('world'); G.seed('match', 5); t('streams are independent', c === G.rng('match'));
  let got = 0; const off = G.bus.on('x', v => got += v); G.bus.emit('x', 2); off(); G.bus.emit('x', 5); t('event bus on / emit / off', got === 2);
  G.T.ballGravity = 400; G.resetTuning(); t('tuning reset to defaults', G.T.ballGravity === 330);
  const src = readdirSync(new URL('../../src/', import.meta.url)).map(f => readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8')).join('\n');
  t('no Math.random( in src', !/Math\.random\(/.test(src));
  t('no TODO / TBD / placeholder / lorem in src', !/\bTODO\b|\bTBD\b|placeholder|lorem ipsum/i.test(src));
  t('no errors at boot', game.errors.length === 0, game.errors.map(e => e.message).join(';'));
};
