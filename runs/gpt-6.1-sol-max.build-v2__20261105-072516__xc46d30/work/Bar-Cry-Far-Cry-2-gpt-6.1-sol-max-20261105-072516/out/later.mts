import {createHeadless} from '../engine/index.ts';
import world from '../labs/game/scenes/world.ts';
import {playBot,roundOf,mercOf} from '../labs/game/bot.ts';
const e=await createHeadless({scene:world,seed:1,settings:{'game.mode':'story','game.detail':0.05}});
const original=e.step;let last='',observed=0;
e.step=(n=1,I)=>{const t=original(n,I);observed+=n;if(n<100&&observed%120>n)return t;const c=roundOf(e),p=mercOf(e),key=`${c.contract}:${c.step}`;if(key!==last||n>=1000){console.log(t,key,c.goal,'pos',p.actor.x.toFixed(1),p.actor.z.toFixed(1),'vehicle',p.seat!.data.vehicle);last=key;}return t;};
console.log(playBot(e,'serve',false));
