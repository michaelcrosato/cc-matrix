import {createHeadless} from '../engine/index.ts';
import world from '../labs/game/scenes/world.ts';
import {roundOf,mercOf,inspectorOf,fight,observeBot} from '../labs/game/bot.ts';
const e=await createHeadless({scene:world,seed:1,settings:{'game.mode':'story','game.detail':0.05,'game.god':true}});
const a=inspectorOf(e);e.step(1);a.actions.run('story',{contract:5,step:2});a.actions.run('give',{condition:1,jam:false});a.actions.run('place',{place:'salt'});e.step(120);
observeBot((phase,data)=>{if(phase==='fight')console.log(phase,JSON.stringify(data));});
console.log('fight result',fight(e,'salt',1800));const target=e.entities('soldier').map(x=>e.get(x.id) as any).find(p=>p.health.hp>0&&p.soldier.data.place==='salt');if(target){a.actions.run('ray',{target:target.id});console.log('ray',roundOf(e).journal.at(-1),'player',mercOf(e).actor,'target',target.actor);}
console.log('after',roundOf(e).contract,roundOf(e).step,mercOf(e).weapons);
