import assert from 'node:assert/strict';
import { createNetwork } from './network.js';

let count = 0;
let failures = 0;
async function check(name, run) {
  count++;
  try { await run(); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
const until = async (predicate, timeout = 2200) => {
  const end = performance.now() + timeout;
  while (!predicate() && performance.now() < end) await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(predicate(), 'condition timed out');
};
class FakePeer {
  on() { return this; }
  destroy() {}
}
function browser(hub) {
  globalThis.window = { AIHub: hub, Peer: FakePeer, BroadcastChannel: globalThis.BroadcastChannel, addEventListener() {} };
  globalThis.AIHub = hub;
}
function mockHub(info) {
  const handlers = {};
  const trace = {ready: 0, sent: [], finishes: []};
  const hub = {
    active: true,
    host: info.host ?? 0,
    connect: async options => {trace.options = options; return info;},
    on: (event, callback) => {handlers[event] = callback;},
    ready: () => trace.ready++,
    send: (packet, options) => {trace.sent.push({packet, options}); return true;},
    finish: result => trace.finishes.push(result)
  };
  browser(hub);
  return {hub, handlers, trace};
}

browser({active:false});
const offline = createNetwork();
await check('standalone skips Hub connection', async()=>assert.equal(await offline.connectHub(), null));
await check('malformed room rejected', ()=>assert.equal(offline.join('x'), false));

const hs = {starts: [], inputs: [], statuses: []};
const gs = {starts: [], snapshots: []};
const host = createNetwork({onStart: (config,context)=>hs.starts.push({config,context}),onInput:(input,seat)=>hs.inputs.push({input,seat}),onStatus:text=>hs.statuses.push(text)});
const guest = createNetwork({onStart:(config,context)=>gs.starts.push({config,context}),onSnapshot:snapshot=>gs.snapshots.push(snapshot)});
const code = host.host();
await check('six-character shareable code',()=>assert.match(code,/^[A-Z2-9]{6}$/));
guest.join(code);
await check('real BroadcastChannel room connects', async()=>{await until(()=>host.info.connected && guest.info.connected);assert.equal(host.info.transport,'local');assert.equal(guest.info.localSeat,1);});
await check('host starts both copies', async()=>{assert.equal(host.start({mode:'online',court:2}),true);await until(()=>gs.starts.length===1);assert.equal(hs.starts[0].config.court,2);assert.equal(gs.starts[0].config.court,2);});
await check('guest input reaches host seat one', async()=>{guest.sendInput({axis:-0.7});await until(()=>hs.inputs.length===1);assert.deepEqual(hs.inputs[0],{input:{axis:-0.7},seat:1});});
await check('snapshot reaches guest intact', async()=>{host.sendSnapshot({scores:[3,2],ball:{x:2,y:-1}});await until(()=>gs.snapshots.length===1);assert.deepEqual(gs.snapshots[0].scores,[3,2]);});
await check('guest cannot start match',()=>assert.equal(guest.start({mode:'online'}),false));
await check('disconnect resets room state',()=>{host.disconnect();guest.disconnect();assert.equal(host.info.active,false);assert.equal(guest.info.mode,'offline');});

const players=[{id:0,name:'Coral'},{id:1,name:'Mint'}];
const serverMock=mockHub({me:7,host:7,isHost:true,server:true,players});
let started=null,inputSeat=null,endReason=null;
const server=createNetwork({onStart:(config,context)=>started={config,context},onInput:(input,seat)=>inputSeat=seat,onEnd:reason=>endReason=reason});
await server.connectHub();
await check('Hub requests correct protocol capabilities',()=>assert.deepEqual(serverMock.trace.options,{mode:'shared-world',seats:[2,2]}));
await check('server host has no local player seat',()=>{assert.equal(server.info.localSeat,null);assert.equal(server.info.isHost,true);});
await check('ready needs no player action',()=>{server.ready();assert.equal(serverMock.trace.ready,1);});
await check('Hub start preserves synchronized countdown',()=>{serverMock.handlers.start({in:3000});assert.equal(started.context.countdownMs,3000);assert.equal(started.context.hub,true);});
await check('Hub maps remote input to player seat',()=>{serverMock.handlers.message({kind:'input',data:{axis:1}},1);assert.equal(inputSeat,1);});
await check('Hub ignores input from unseated senders',()=>{inputSeat=null;serverMock.handlers.message({kind:'input',data:{axis:1}},88);assert.equal(inputSeat,null);});
await check('Hub finish sorts scores into standings',()=>{assert.equal(server.finish([2,4]),true);assert.deepEqual(serverMock.trace.finishes[0],{standings:[[1],[0]],scores:{0:2,1:4}});});
await check('Hub result is emitted only once',()=>{assert.equal(server.finish([9,0]),false);assert.equal(serverMock.trace.finishes.length,1);});
await check('Hub round cannot be left through game menu',()=>assert.equal(server.disconnect(),false));
await check('Hub end freezes network traffic',()=>{serverMock.handlers.end({reason:'finished'});assert.equal(endReason,'finished');assert.equal(server.sendSnapshot({scores:[2,4]}),false);});

const guestMock=mockHub({me:1,host:0,isHost:false,server:false,players});
let incoming=null;
const hubGuest=createNetwork({onSnapshot:snapshot=>incoming=snapshot});
await hubGuest.connectHub();
await check('Hub guest seat follows player identity',()=>assert.equal(hubGuest.info.localSeat,1));
await check('Hub guest accepts snapshots only from host',()=>{guestMock.handlers.message({kind:'snapshot',data:{a:1}},9);assert.equal(incoming,null);guestMock.handlers.message({kind:'snapshot',data:{a:2}},0);assert.deepEqual(incoming,{a:2});});
await check('Hub guest never reports shared-world finish',()=>assert.equal(hubGuest.finish([1,0]),false));
await check('Hub guest sends inputs to authoritative host',async()=>{await new Promise(resolve=>setTimeout(resolve,70));hubGuest.sendInput({axis:0.25});assert.equal(guestMock.trace.sent[0].options.to,0);assert.equal(guestMock.trace.sent[0].packet.kind,'input');});

console.log(`${count-failures}/${count} network checks passed`);
process.exitCode = failures ? 1 : 0;
