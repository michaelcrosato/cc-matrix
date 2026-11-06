import {createHeadless} from '../engine/index.ts';
import world from '../labs/game/scenes/world.ts';
import {roundOf,mercOf,walkTo} from '../labs/game/bot.ts';
const e=await createHeadless({scene:world,seed:1,settings:{'game.mode':'story','game.detail':0.05}});
function log(tag){const c=roundOf(e),p=mercOf(e);console.log(tag,JSON.stringify({step:c.step,contract:c.contract,hp:p.health.hp,pos:[p.actor.x,p.actor.z],syr:p.seat.data.syr,down:p.seat.data.down,rescue:p.seat.data.rescue,action:p.seat.data.action,gun:p.gunState.data.guns[1],message:c.message,coverage:c.coverage}));}
log('start');console.log('walk',walkTo(e,[330,858],15,5000));log('ashore');e.step(240,{b:['reload']});log('clear');e.step(1,{p:['heal']});e.step(70);log('heal');
for(let n=0;n<2400;n+=300){e.step(300);log('wait '+n);}
