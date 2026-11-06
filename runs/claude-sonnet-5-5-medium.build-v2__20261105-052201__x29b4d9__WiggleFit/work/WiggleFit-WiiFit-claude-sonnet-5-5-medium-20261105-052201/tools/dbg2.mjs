import { launch, url } from './lib.mjs';
import { S, adv, press, newGame } from './drive.mjs';
const b = await launch({}); const p = await newGame(b); await adv(p, 2); await press(p, 'ok'); await adv(p, 0.3);
console.log((await S(p)).screen, await p.evaluate(() => document.getElementById('prompts').innerHTML.slice(0, 200)));
await p.keyboard.press('ArrowDown'); await adv(p, 0.1); console.log((await S(p)).screen, (await S(p)).input.lastDevice, await p.evaluate(() => document.getElementById('prompts').innerHTML.slice(0, 120)));
await b.close();
