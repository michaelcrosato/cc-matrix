import { App, boot, check, go, report, settle, steps, press } from './lib.mjs';
import { ACTIVITIES } from '../../src/data/activities.js';
await boot();
check('title scene', App.scene?.id === 'title', App.scene?.id);
for (const id of ['hub', 'weighin', 'report', 'ferry', 'jar', 'records', 'locker', 'join', 'viewer', 'title']) {
  await go(id, {}); check(`scene ${id}`, App.scene?.id === id, App.scene?.id); await steps(40);
  check(`no errors ${id}`, App.engine.errors.length === 0 && App.loadErrors.length === 0, [...App.engine.errors, ...App.loadErrors].slice(-2).join(' | ').slice(0, 400));
  App.loadErrors.length = 0; App.engine.errors.length = 0;
}
for (const a of ACTIVITIES) {
  await go('activity', { id: a.id, mode: 'dropin' });
  await steps(60);
  check(`activity ${a.id}`, App.engine.errors.length === 0 && App.loadErrors.length === 0, [...App.engine.errors, ...App.loadErrors].slice(-2).join(' | ').slice(0, 500));
  App.loadErrors.length = 0; App.engine.errors.length = 0;
}
const r = report(); console.log(`${r.n - r.fail}/${r.n} passed`); process.exit(r.fail ? 1 : 0);
