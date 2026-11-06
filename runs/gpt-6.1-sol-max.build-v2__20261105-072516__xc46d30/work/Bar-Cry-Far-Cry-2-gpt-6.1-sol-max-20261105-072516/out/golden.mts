import {writeFileSync} from 'node:fs';
import {createHeadless} from '../engine/index.ts';
import world from '../labs/game/scenes/world.ts';
const e=await createHeadless({scene:world,seed:7,settings:{'game.mode':'contract','game.detail':0.05}});
e.step(120,{move:[0,-0.5],look:[Math.PI,0]});
writeFileSync('labs/game/replays/bot.replay.json',JSON.stringify({format:'my3dge-replay/1',description:'Bar Cry opening: a reproducible 120-step march toward the depot.',engine:'0.0.0',three:'0.182.0',rapier:'simd-compat 0.21.0',hz:60,scene:'game:world',seed:7,settings:{'game.mode':'contract','game.detail':0.05},steps:120,inputs:[[0,{move:[0,-0.5],look:[Math.PI,0]}]],hashes:{'linux-x64':{'120':e.hash()}}},null,2));
console.log(e.hash());
