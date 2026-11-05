import { loadGame } from './lib.mjs';
const { game, I, D } = loadGame(); const adv = s => game.advance(s);
adv(.5);
D.startMatch({ mode:'story', ch:0, opp:'witt', ground:'green', overs:1, wickets:2, diff:0, chaos:'none', seed:3 }); adv(4);
for (let i = 0; i < 400 && D.match().ph !== 'setup'; i++) adv(.1);
D.devOpen(); for (let k = 0; k < 80 && D.DEV.rows[D.DEV.i].label !== 'WIN THE MATCH'; k++) { I.tap('down'); adv(.05); } I.tap('confirm'); adv(.1); D.DEV.open = false; adv(5);
console.log(game.sceneName);
I.tap('confirm'); for (let i = 0; i < 14; i++) { adv(.5); console.log(i, game.sceneName); if (i%2) I.tap('confirm'); }
