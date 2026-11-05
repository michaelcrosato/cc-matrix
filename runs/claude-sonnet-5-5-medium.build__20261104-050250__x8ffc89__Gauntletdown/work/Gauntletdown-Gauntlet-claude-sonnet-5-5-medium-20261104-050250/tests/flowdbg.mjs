import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, location: { hash: '', search: '' } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('my-3d2dge.js', 'utf8'), ctx); vm.runInContext(readFileSync('game/game.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = E.current, D = game.debug, A = D.api;
const from = +process.argv[2] || 0;
D.startRun([0,1,2,3]); game.advance(.5); if (from) { D.warp(from); game.advance(.5); }
D.botAll(true);
for (let i = 0; i < 1500; i++) { const w = D.W(); if (w && w.cardT > 0) w.cardT = 0; if (w && !w.heroes.every(h => h.bot)) D.botAll(true); game.advance(1); if (i % 60 === 0 || game.sceneName !== 'play') console.log(i, game.sceneName, w && w.step, w && w.time.toFixed(0), w && w.heroes.map(h => h.bot && h.bot.think + Math.round(h.hp)).join(' '), 'desc', w && !!w.descend, w && w.leaving); if (game.sceneName === 'ending') break; }
console.log(game.errors.map(e => e.message));
