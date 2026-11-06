import { Network } from './network.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let count = 0;
const failures = [];
async function check(name, fn) { try { await fn(); count++; } catch (e) { failures.push(`${name}: ${e.message}`); } }

let hubEvents = new Map(), traffic = [], starts = [], clock = -Infinity;
globalThis.AIHub = {
  active: true,
  on(name, fn) { hubEvents.set(name, fn); },
  async connect(options) { assert.deepEqual(options, { mode: 'ghost', seats: [1, 4] }); return { me: 1, isHost: false, seed: 155, players: [{id:0},{id:1}] }; },
  time: () => clock,
  ready: () => traffic.push(['ready']), send: (...args) => traffic.push(['send', ...args]),
  progress: (...args) => traffic.push(['progress', ...args]), result: (...args) => traffic.push(['result', ...args]),
};
let ended = [];
const net = new Network({onStart:(...args)=>starts.push(args),onEnd:(reason)=>ended.push(reason)});
await check('Hub joins and readies once', async()=>{ await net.init(); net.ready(); net.ready(); assert.equal(traffic.length,1); });
await check('Hub waits for shared zero', async()=>{ clock=-40; hubEvents.get('start')(); await wait(25); assert.equal(starts.length,0); clock=0; await wait(25); assert.equal(starts.length,1); assert.equal(starts[0][0],155); });
await check('Ghost and scoreboard rates', async()=>{ for(let i=0;i<120;i++) net.update(1/60,{sector:2,x:1,y:2,z:3},70,'Testing'); assert.ok(traffic.filter(x=>x[0]==='send').length<=21); assert.ok(traffic.filter(x=>x[0]==='progress').length>=2); });
await check('Time up returns one result',async()=>{hubEvents.get('time-up')();net.result(99);assert.equal(traffic.filter(x=>x[0]==='result').length,1);assert.equal(traffic.at(-1)[1].score,70);});
await check('End freezes traffic',async()=>{hubEvents.get('end')({reason:'finished'});const before=traffic.length;net.update(2,{x:5},4);net.result(3);assert.equal(traffic.length,before);assert.deepEqual(ended,['finished']);});
delete globalThis.AIHub;

class Connection extends EventEmitter {
  open=false;
  send(data){ queueMicrotask(()=>this.other.emit('data',structuredClone(data))); }
  close(){ if(!this.open)return;this.open=false;this.other.open=false;this.emit('close');this.other.emit('close'); }
}
class Peer extends EventEmitter {
  static all=new Map();static id=0;
  constructor(id){super();this.id=id||`peer-${Peer.id++}`;Peer.all.set(this.id,this);queueMicrotask(()=>this.emit('open',this.id));}
  connect(id){const a=new Connection(),b=new Connection();a.other=b;b.other=a;const remote=Peer.all.get(id);if(!remote){queueMicrotask(()=>this.emit('error',{type:'peer-unavailable'}));return a;}remote.emit('connection',b);queueMicrotask(()=>{a.open=b.open=true;b.emit('open');a.emit('open');});return a;}
  destroy(){Peer.all.delete(this.id);this.emit('close');}
}
let hostStarts=[],clientStarts=[],hostGhost=[],clientGhost=[];
const host=new Network({peerFactory:Peer,onStart:(seed)=>hostStarts.push(seed),onGhost:(...args)=>hostGhost.push(args)});
const client=new Network({peerFactory:Peer,onStart:(seed)=>clientStarts.push(seed),onGhost:(...args)=>clientGhost.push(args)});
await check('Standalone code room joins',async()=>{const code=await host.createRoom();assert.match(code,/^[A-Z]{6}$/);assert.equal(await client.joinRoom(code),true);await wait(10);assert.equal(host.players.length,2);assert.equal(client.players.length,2);assert.equal(client.me,1);});
await check('Wing starts on same seed',async()=>{assert.equal(host.launchRoom(),true);assert.equal(host.launchRoom(),false);await wait(3100);assert.deepEqual(hostStarts,[host.seed]);assert.deepEqual(clientStarts,[host.seed]);});
await check('Wing ghosts flow both directions',async()=>{host.update(.2,{sector:1,x:3},10);client.update(.2,{sector:1,x:5},20);await wait(10);assert.equal(hostGhost[0][0].x,5);assert.equal(hostGhost[0][1],1);assert.equal(clientGhost[0][0].x,3);assert.equal(clientGhost[0][1],0);});
await check('Wing scores ranked consistently',async()=>{host.result(100,{kills:2});client.result(200,{kills:3});await wait(10);assert.equal(host.results.size,2);assert.equal(client.results.size,2);assert.equal(host.standingsText(),client.standingsText());assert.match(host.standingsText(),/^1\. Rider 2 200/);});
await check('Invalid room rejected without a relay',async()=>{const bad=new Network({peerFactory:Peer});assert.equal(await bad.joinRoom('bad'),false);});
host.leave();client.leave();
for(const f of failures) console.error('FAIL '+f);
console.log(`${count+failures.length} networking checks, ${failures.length} failures`);
if(failures.length)process.exitCode=1;
