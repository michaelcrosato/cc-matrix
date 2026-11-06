import assert from 'node:assert/strict';
import {createOnline} from './online.js';
const pause = n => new Promise(resolve => setTimeout(resolve,n));
const checks = []; let failed = 0;
function check(name, fn) { checks.push([name,fn]); }
class SilentPeer { on(){} destroy(){} }
check('standalone two-page room exchanges authoritative state and input', async () => {
  globalThis.window = {AIHub:{active:false},Peer:SilentPeer};
  let hostStart=0, guestStart=0, state, input, left;
  const host = createOnline({onStart(){hostStart++;},onInput(v,from){input={v,from};},onLeave(id){left=id;}});
  const guest = createOnline({onStart(){guestStart++;},onState(v,from){state={v,from};}});
  try {
    const code = await host.createRoom(); assert.match(code,/^[A-Z2-9]{6}$/);
    assert.equal(await guest.joinRoom(code),true); await pause(60);
    assert.equal(host.connected,true); assert.equal(guest.connected,true);
    assert.equal(hostStart,1); assert.equal(guestStart,1); assert.equal(guest.me,1);
    host.sendState({stage:2,players:[{x:3,z:8}],score:42}); guest.sendInput({x:1,z:-1,attack:true}); await pause(40);
    assert.equal(state.v.score,42); assert.equal(state.from,0); assert.equal(input.from,1); assert.equal(input.v.attack,true);
    // Terminal snapshots must bypass the publishing throttle: simulation stops immediately after winning.
    host.sendState({state:{won:true},score:99}); await pause(20); assert.equal(state.v.state.won,true);
    guest.leave(); await pause(20); assert.equal(left,1); assert.equal(host.connected,false);
  } finally {host.destroy();guest.destroy();}
});
check('hub server host readies, accepts both players, reports team result and stops at end', async () => {
  const handlers = {}, sent = [], finishes = []; let ready=0, started=0, ended=0, accepted=[];
  const hub = {active:true,host:2,time:()=>0,on(type,fn){handlers[type]=fn;return()=>{};},connect:async()=>({isHost:true,me:2,host:2,server:true,players:[{id:0},{id:1}]}),ready(){ready++;},send(d,o){sent.push({d,o});return true;},finish(o){finishes.push(o);}};
  globalThis.window = {AIHub:hub};
  const online = createOnline({onStart(){started++;},onEnd(){ended++;},onInput(v,id){accepted.push(id);},getResult:()=>({won:true,score:90,stats:{Relics:1}})});
  try {
    online.ready(); await online.init(); assert.equal(ready,1); assert.equal(online.server,true);
    handlers.start({in:0}); assert.equal(started,1); assert.equal(online.canPlay,true);
    handlers.message({protocol:'lost-fortune-1',type:'input',value:{x:1}},0);
    handlers.message({protocol:'lost-fortune-1',type:'input',value:{x:1}},1);
    handlers.message({protocol:'lost-fortune-1',type:'input',value:{x:1}},9);
    assert.deepEqual(accepted,[0,1]); online.sendState({stage:1}); assert.equal(sent.length,1);
    handlers['time-up'](); assert.equal(finishes.length,1); assert.deepEqual(finishes[0].standings,[[0,1]]); assert.equal(finishes[0].won,true); assert.equal(finishes[0].scores[1],90);
    handlers.end({reason:'finished'}); assert.equal(ended,1); assert.equal(online.canPlay,false);
    await pause(85); online.sendState({stage:2}); assert.equal(sent.length,1);
  } finally {online.destroy();}
});
check('hub guest accepts only host snapshots and targets input to host', async () => {
  const handlers={},sent=[];let states=[];
  const hub={active:true,host:0,time:()=>0,on(t,f){handlers[t]=f;return()=>{};},connect:async()=>({isHost:false,me:1,host:0,players:[{id:0},{id:1}]}),ready(){},send(d,o){sent.push({d,o});return true;},finish(){throw Error('guest finish');}};
  globalThis.window={AIHub:hub};const guest=createOnline({onState:s=>states.push(s)});
  try {
    await guest.init();guest.ready();handlers.start({in:0});
    handlers.message({protocol:'lost-fortune-1',type:'state',seq:2,value:{x:3}},0);
    handlers.message({protocol:'lost-fortune-1',type:'state',seq:1,value:{x:4}},0);
    handlers.message({protocol:'lost-fortune-1',type:'state',seq:3,value:{x:5}},1);
    assert.deepEqual(states,[{x:3}]);guest.sendInput({x:1});assert.equal(sent[0].o.to,0);
    guest.finish({won:true}); assert.equal(guest.leave(),false);
  } finally {guest.destroy();}
});
for (const [name, fn] of checks) {try {await fn();} catch(error) {failed++;process.stderr.write('FAIL '+name+': '+error.message+'\n');}}
process.stdout.write(`${checks.length-failed}/${checks.length} online checks passed\n`);
process.exitCode=failed?1:0;
