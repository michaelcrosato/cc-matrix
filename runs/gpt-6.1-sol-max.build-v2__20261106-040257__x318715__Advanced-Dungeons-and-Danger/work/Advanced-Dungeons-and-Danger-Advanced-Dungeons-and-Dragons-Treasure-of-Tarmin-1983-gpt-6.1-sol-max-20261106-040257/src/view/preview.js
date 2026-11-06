import '../../vendor/engine/my-3d2dge-3d.js';
import { DungeonView } from './view.js';
import { CONTENT } from '../content/campaign.js';
import { GameAudio } from '../audio/audio.js';
async function start(){
const E=globalThis.My3D2dge;
const game=new E.Game({canvas:'screen',res:[960,540],expand:true,bg:null,menu:false,corner:false,fullscreen:false,autoPause:false});
let state=null,settings={music:.10,effects:.65,voice:.35};
const view=new DungeonView(game,{getState:()=>state,getPlayer:()=>state&&Object.values(state.players)[0],getSettings:()=>settings});
const audio=new GameAudio(game);
await view.init();
game.start({scenes:{play:{pausable:false,update(dt){view.update(dt);audio.update(state,settings);},draw(r){view.draw(r);}}},scene:'play'});
window.preview={game,view,audio,set(s){state=s;},settings,make(floor=0,x=3,y=6,dir=0){
 const entities={},items={};for(const e of CONTENT.floors[floor].entities){const n={...e,floor};if(e.type==='enemy')Object.assign(n,{...CONTENT.enemies[e.kind],...e,maxWar:CONTENT.enemies[e.kind].war,maxSpirit:CONTENT.enemies[e.kind].spirit,phase:1});if(e.type==='loot'&&e.kind){n.itemId=e.id+'.item';items[n.itemId]={id:n.itemId,kind:e.kind};}entities[n.id]=n;}items['held.bow']={id:'held.bow',kind:'bow'};items['held.shield']={id:'held.shield',kind:'shield'};
 state={runId:'preview',schema:1,floor,phase:'combat',players:{'0':{id:'0',x,y,dir,war:36,maxWar:36,spirit:24,maxSpirit:24,arrows:6,hands:['held.shield','held.bow'],connected:true}},entities,items,shared:{},events:[],tuning:{tempo:1},combat:{id:'test',enemies:Object.values(entities).filter(e=>e.type==='enemy').map(e=>e.id),intents:{},plans:{},round:1}};
 for(const e of Object.values(entities).filter(e=>e.type==='enemy'))state.combat.intents[e.id]={target:'0',channel:e.channel==='mixed'?'spirit':e.channel,power:5,kind:e.kind==='brute'?'charge':'strike'};
 return state;
 }};
window.addEventListener('click',()=>audio.unlock());

}start().catch(e=>{document.body.dataset.error=e.stack;throw e;});
