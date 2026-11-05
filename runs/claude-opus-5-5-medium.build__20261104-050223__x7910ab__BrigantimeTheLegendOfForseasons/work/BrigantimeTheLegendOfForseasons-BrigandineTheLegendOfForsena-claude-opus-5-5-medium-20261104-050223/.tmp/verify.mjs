import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console: { log() {}, info() {}, warn() {}, error() {} }, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['engine/my-3d2dge.js', 'engine-ext/beasts.js', 'dist/game.js']) vm.runInContext(readFileSync(f, 'utf8'), ctx);
const G = ctx.__G, n = k => G.all(k).length;
console.log({ events: n('event'), knights: n('knight'), monsters: n('monster'), forms: n('monster') * 3, skills: n('skill'), items: n('item'), maps: n('map'), castles: n('castle'), roads: G.ROADS.length, tunables: G.TUNE_SPEC.length, settings: G.GAME_SETTINGS.length, scenes: Object.keys(G.scenes) });
