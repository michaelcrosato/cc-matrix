// a debugging aid: the bot's run on one seed, the last lines of its log and the game's (node tests/trace.mjs seed [lines])
import { kit } from './suites/simkit.mjs';
const { B } = await kit(); const seed = +process.argv[2], n = +(process.argv[3] || 40), out = [];
B.newState(seed); B.drain(); B.Bot.start({}); let t = 0, lastI = -1, lastF = '';
while (B.Bot.active && t < 3600 && !B.S.over) { const c = B.Bot.step(1 / 120); B.update(1 / 120, c); for (const e of B.drain()) if (e.t === 'msg' && !/lies here|You take|eats/.test(e.text)) out.push(t.toFixed(1) + ' ' + B.S.floor + ' ' + e.text + ' | hp ' + B.S.party.members.map(m => m.hp).join(',')); if (B.Bot.i !== lastI || B.S.floor !== lastF) { lastI = B.Bot.i; lastF = B.S.floor; out.push(t.toFixed(1) + ' STEP ' + JSON.stringify(B.Bot.plan[B.Bot.i]) + ' @' + B.S.party.cx + ',' + B.S.party.cy); } t += 1 / 120; }
console.log(out.slice(-n).join('\n'));
