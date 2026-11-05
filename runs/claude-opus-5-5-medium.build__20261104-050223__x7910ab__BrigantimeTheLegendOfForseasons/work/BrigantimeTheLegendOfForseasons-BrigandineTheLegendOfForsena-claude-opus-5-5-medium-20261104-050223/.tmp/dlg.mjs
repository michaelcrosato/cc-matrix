import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const ctx = { console, addEventListener() {}, location: { hash: '' } }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx);
const E = ctx.My3D2dge, game = new E.Game({ headless: true }); game.start({ update() {}, draw() {} });
for (const txt of ['Then we march before the petals fall. {shake}Sound the horn!{/shake}', 'Plain line.']) {
const talk = new E.Dialog(game, { voice: ch => {} }); let done = false; talk.say([txt], { name: 'X', onDone: () => done = true });
for (let i = 0; i < 20 && !done; i++) { game.input.tap('confirm'); talk.update(1/60); game.advance(.2); talk.update(.2); }
console.log(JSON.stringify(txt.slice(0,20)), 'done', done, 'open', talk.open, 'shown', talk.shown, 'len', talk.pageLen, 'i', talk.i, 'pages', talk.pages.length);
}
