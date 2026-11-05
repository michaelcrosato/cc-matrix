import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const here = new URL('../', import.meta.url);
const ctx = { console: { log() {}, info() {}, warn: console.warn, error: console.error }, addEventListener() {}, location: { hash: '' } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', here), 'utf8'), ctx, { filename: 'engine' });
vm.runInContext(readFileSync(new URL('build/game.js', here), 'utf8'), ctx, { filename: 'game' });
const bb = ctx.__bb;
const { S, newMatch, matchStep, cmdFor } = bb;
newMatch({ teams: [0, 1], court: 'alley', qLen: 30, seed: 5, humans: {}, difficulty: 'Pro' });
const ev = {}; bb.on('basket', e => ev.basket = (ev.basket || 0) + 1);
for (const t of ['dunkStart','shove','steal','block','pass','tipwon','gameEnd','quarterEnd','release','supernovaOn']) bb.on(t, e => ev[t] = (ev[t] || 0) + 1);
let steps = 0;
while (!S.match.over && steps < 120 * 60 * 5) { matchStep(1 / 120, cmdFor); steps++; }
console.log(JSON.stringify({ steps, secs: steps / 120 | 0, phase: S.match.phase, q: S.match.quarter, score: S.match.score, ev }));
console.log('errors', bb.game.errors.map(e => e.message));
