import {Engine} from '../../pixel-engine.js';
import {createGame} from '../../src/game.js';
export const covers=['src/game.js','src/core/look.js','src/actors/actors.js','src/world/terrain.js','src/world/fire.js'];
const tap=(e,k,n=1)=>{e.input.setKey(k,true);e.step(n);e.input.setKey(k,false);e.step(2);};
export async function run(check){const e=await Engine.headless(createGame(),{camera:{preset:'first'},seed:7341,viewport:{width:1280,height:720,dpr:1},settings:{button:false,key:false}});try{tap(e,'Enter');tap(e,'Enter');tap(e,'KeyM');tap(e,'Enter');e.step(6);tap(e,'KeyH');e.step(75);const rec=e.recording(),fp=e.fingerprint(),gameFp=e.game.fingerprint();check(!!rec&&rec.frames.length>80,'mission segment recording exists');await e.replay(rec,()=>e.loadGame(createGame()));check(e.game.fingerprint()===gameFp,'mission simulation replays deterministically');check(e.fingerprint()===fp,'engine and physics fingerprint replay exactly');}finally{e.dispose();}}
