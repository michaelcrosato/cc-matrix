import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('file://' + process.argv[2] + '#soundlab'); await p.waitForTimeout(2500); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(200);
const n = await p.evaluate(() => BB.soundLabScene.list.items.length), rows = [];
for (let i = 0; i < n; i++) {
  await p.evaluate(i => { BB.soundLabScene.list.i = i; }, i); await p.keyboard.press('Enter'); await p.waitForTimeout(40);
  rows.push(await p.evaluate(i => { const A = My3D2dge.current.audio; return BB.soundLabScene.list.items[i].label + (My3D2dge.current.errors.length ? ' ERR' : ' ok'); }, i));
}
console.log(n + ' items, ctx ' + await p.evaluate(() => My3D2dge.current.audio.ctx.state) + ', page errors ' + errs.length + '\n' + rows.join(' | '));
await b.close();
