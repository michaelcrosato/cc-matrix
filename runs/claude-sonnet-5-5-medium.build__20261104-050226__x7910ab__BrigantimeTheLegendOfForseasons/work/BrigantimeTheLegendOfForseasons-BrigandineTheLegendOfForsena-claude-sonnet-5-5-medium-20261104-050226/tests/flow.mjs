import { boot } from './harness.mjs';
const { game, G } = boot(); const I = game.input, snap = () => game.debug.snapshot();
const tap = (a, s = .1) => { I.tap(a); game.advance(s); };
game.advance(.5); console.log(snap().scene);
tap('confirm', .3); console.log('after new campaign:', snap().scene);
tap('confirm', .3); console.log('after setup start:', snap().scene);
for (let i = 0; i < 40 && snap().scene === 'event'; i++) { tap('confirm', .5); tap('confirm', .5); }
console.log('after prologue:', snap().scene, snap().phase);
for (let i = 0; i < 10 && snap().phase === 'tidings'; i++) { tap('confirm', .5); }
console.log('muster?', snap().phase, snap().panel, 'errors', game.errors.map(e => (e.message || e)));
tap('confirm', .3); console.log('castle menu panels', snap().panel);
tap('confirm', .3); console.log('summon panel', snap().panel);
tap('confirm', .3); tap('cancel', .3); tap('cancel', .3); tap('cancel', .3); console.log('panels', snap().panel);
tap('alt', .3); console.log('commands', snap().panel);
console.log('errors', game.errors.map(e => (e.message || e) + (e.stack || '')));
console.log('pending', JSON.stringify(G.run.S.pending), 'done', Object.keys(G.run.S.eventsDone), game.scene.d && game.scene.d.id, G.run.stage);
