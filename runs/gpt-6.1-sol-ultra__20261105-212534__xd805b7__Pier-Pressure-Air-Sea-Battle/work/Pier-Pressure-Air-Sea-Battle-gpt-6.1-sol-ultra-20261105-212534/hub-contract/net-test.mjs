import assert from 'node:assert/strict';
import { Network } from '../net.js';
let checks = 0;
const verify = (fn) => { fn(); checks++; };
const delay = ms => new Promise(r => setTimeout(r, ms));
let hostInput, guestState;
const host = new Network({ onInput: (v, s) => hostInput = [v, s] });
const guest = new Network({ onState: s => guestState = s });
const room = host.hostLocal('PPTEST');
guest.joinLocal(room);
await delay(80);
verify(() => assert.equal(host.connected && guest.connected, true));
verify(() => assert.equal(guest.localSeat, 1));
verify(() => assert.equal(host.localSeat, 0));
guest.tick(.2, { fire: true, angle: 1.2 });
host.tick(.2, {}, { score: 100, targets: [{ x: 20, y: 10 }] });
await delay(80);
verify(() => assert.equal(hostInput[0].fire, true));
verify(() => assert.equal(hostInput[1], 1));
verify(() => assert.equal(guestState.score, 100));
verify(() => assert.equal(host.stats.sent, 1));
verify(() => assert.equal(guest.stats.received, 1));
host.tick(.2, {}, { blob: 'x'.repeat(17000) });
verify(() => assert.equal(host.stats.rejected, 1));
guest.leave();
await delay(40);
verify(() => assert.equal(host.connected, false));
verify(() => assert.equal(hostInput[0].fire, false));
host.dispose(); guest.dispose();
let handlers = {}, sent = [], result = null;
globalThis.AIHub = {
 active: true, me: 7, host: 7, time: () => 20,
 connect: async () => ({ me:7,host:7,isHost:true,server:true,players:[{id:0,name:'one'},{id:1,name:'two'}] }),
 on: (e,fn) => { handlers[e] = fn; return () => delete handlers[e]; },
 send: (data,options) => { sent.push([data,options]); return true; },
 ready: () => sent.push(['ready']), finish: data => result = data
};
const server = new Network({onInput:(v,s)=>hostInput=[v,s]});
await server.init(); server.ready();
verify(()=>assert.equal(server.server,true));
verify(()=>assert.equal(server.localSeat,-1));
verify(()=>assert.equal(server.running,false));
handlers.start({in:0});
verify(()=>assert.equal(server.running,true));
handlers.message({protocol:'pier-pressure-1',kind:'input',seq:1,input:{angle:1,fire:true}},1);
verify(()=>assert.equal(hostInput[1],1));
server.tick(.2,{}, {score:4});
verify(()=>assert.equal(sent.at(-1)[0].kind,'state'));
handlers.leave({id:0,reason:'left'});
server.lastScore=50; handlers['time-up']({graceMs:1000});
verify(()=>assert.equal(result.scores[1],50));
verify(()=>assert.deepEqual(result.standings,[[1]]));
verify(()=>assert.equal(result.won,false));
handlers.end({reason:'finished'});
const before=sent.length; server.tick(.2,{}, {score:5});
verify(()=>assert.equal(sent.length,before));
verify(()=>assert.equal(server.running,false));
server.dispose();
console.log(`${checks} network checks passed`);
