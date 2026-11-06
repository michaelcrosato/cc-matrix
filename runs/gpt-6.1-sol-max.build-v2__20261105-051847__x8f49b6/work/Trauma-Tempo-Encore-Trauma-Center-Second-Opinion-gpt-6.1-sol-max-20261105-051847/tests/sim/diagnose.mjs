import {Sim} from '../../src/sim/sim.js';
import {initPhysics} from '../../src/sim/physics.js';
import {botInput} from '../../src/sim/bot.js';
import {operations} from '../../src/data/ops/index.js';
await initPhysics();
for(let op=0;op<operations.length;op++){
 const sim=new Sim({op});let previous=-1;
 for(let n=0;n<80000&&sim.state.status==='playing';n++){
  sim.input(0,botInput(sim));sim.step();
  if(sim.state.phase!==previous){previous=sim.state.phase;console.log(op,previous,sim.state.elapsed.toFixed(1),sim.state.vitals.toFixed(1));}
  if(sim.state.phaseTime>130){console.log('STUCK',op,sim.state.phase,JSON.stringify(sim.state.seats[0]),JSON.stringify(sim.state.entities.filter(e=>!e.done).map(e=>({...e,cells:undefined}))));break;}
 }
 console.log('RESULT',op,sim.state.status,sim.state.elapsed.toFixed(1),sim.state.score,sim.state.rank,sim.state.misses,sim.state.minVitals.toFixed(1));sim.free();
}
