import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const errs = []; const ctx = { console: { log() {}, info() {}, warn() {}, error: (...a) => errs.push(a.join(' ')) }, addEventListener() {}, location: { hash: '', search: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, G = ctx.__G, I = game.input;
const snap = () => game.debug.snapshot(); const err = () => game.errors.map(e => e.message + ' @ ' + (e.stack || '').split('\n').slice(1, 3).join(' ')).slice(0, 4);
const tap = (a, s = .15) => { I.tap(a); game.advance(s); };
game.advance(.5);

console.log('title focus ok', snap().scene);
tap('confirm', .3); console.log('after confirm', snap().scene);
tap('confirm', .3); tap('confirm', .3); tap('confirm', .3); tap('confirm', .8);
console.log('->', snap().scene, snap().flow, err());
for (let i = 0; i < 40 && snap().scene === 'event'; i++) tap('confirm', .4);
console.log('after prologue', snap().scene, snap().flow, err());
const trail = []; for (let i = 0; i < 60; i++) { const s = snap(); if (trail[trail.length-1] !== s.scene + ':' + s.flow + ':' + (G.eventScene && G.eventScene.id)) trail.push(s.scene + ':' + s.flow + ':' + (G.eventScene && G.eventScene.id)); if (s.scene === 'campaign' && s.flow === 'muster') break; if (s.scene === 'event' && G.eventScene && G.eventScene.id === 'tutorial') { tap('confirm', .5); } tap('confirm', .3); }
console.log(trail.join(' > ')); console.log('state', snap().scene, snap().flow, snap().phase, err(), errs.slice(0, 3));
console.log('seen', JSON.stringify(G.run.sim.state.seen), 'flags', JSON.stringify(G.run.sim.state.flags));
