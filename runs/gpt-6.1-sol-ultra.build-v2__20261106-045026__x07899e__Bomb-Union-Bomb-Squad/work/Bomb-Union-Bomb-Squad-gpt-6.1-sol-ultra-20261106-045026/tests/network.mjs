import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

export async function run() {
  let clock=0;
  const context=vm.createContext({performance:{now:()=>clock*1000},crypto:webcrypto,Uint8Array,TextEncoder,setTimeout,clearTimeout,console});
  for(const name of ['src/sim/content.js','src/sim/model.js','src/net/network.js']) vm.runInContext(readFileSync(new URL('../'+name,import.meta.url),'utf8'),context,{filename:name});
  const {Network,Sim}=context.BU;
  const results=[];
  const test=(name,fn)=>{try{fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,detail:error.stack});}};
  const setup=()=>{
    const net=new Network();Object.assign(net,{mode:'host',online:true,authority:true,seat:0,connected:true,ended:false});
    net.roster=[0,1].map(id=>({id,name:'Dispatcher '+(id+1),connected:true}));
    net._send=()=>true;net.start('waterfront',42);return net;
  };
  test('transport sender prevents seat impersonation',()=>{
    const n=setup();n.command({type:'claim',board:'B1'});
    n._receive({bu:1,content:1,t:'intent',cmd:{type:'cut',board:'B1',component:'C1',terminal:0,seat:0,id:'spoof'}},1);
    assert.equal(n.state.boards[0].components[0].cuts[0],false);
  });
  test('unseated intents and guest developer operations are rejected',()=>{
    const n=setup();
    n._receive({bu:1,content:1,t:'intent',cmd:{type:'claim',board:'B1'}},8);
    assert.equal(n.state.boards[0].claim,null);
    n._receive({bu:1,content:1,t:'intent',cmd:{type:'dev',operation:'solve'}},1);
    assert.equal(n.state.modified,false);assert.equal(n.state.status,'active');
  });
  test('remote duplicate accepted once',()=>{
    const n=setup();Sim.command(n.state,1,{type:'claim',board:'B2'});
    const cmd={type:'cut',board:'B2',component:'C1',terminal:0,id:'same'};
    n._receive({bu:1,content:1,t:'intent',cmd},1);
    const revision=n.state.boards[1].revision;
    n._receive({bu:1,content:1,t:'intent',cmd},1);
    assert.equal(n.state.boards[1].revision,revision);
  });
  test('online authority honors elapsed background time',()=>{
    const n=setup();const before=n.state.remaining;clock+=17.5;n.tick();
    assert.ok(Math.abs(n.state.remaining-(before-17.5))<0.001);
  });
  test('guests never independently advance the bomb',()=>{
    const n=setup();n.authority=false;n.mode='guest';const before=n.state.remaining;clock+=9;n.tick();
    assert.equal(n.state.remaining,before);
  });
  test('published UTF-8 packets meet Hub limit and restore exact truth',()=>{
    const n=setup();n.state=Sim.create('central',999,[0,1,2,3]);n.state.events.push({id:999,type:'test',text:'⛑⚡'.repeat(800)});
    const packets=[];n._send=p=>packets.push({bu:1,content:1,...p});n._publish();
    for(const packet of packets)assert.ok(new TextEncoder().encode(JSON.stringify(packet)).length<=16384);
    const g=new Network();g.online=true;g.mode='guest';
    for(const packet of packets.toReversed())g._receive(packet,0);
    assert.equal(JSON.stringify(g.state),JSON.stringify(n.state));
  });
  test('same-seed network replay starts a new dispatch',()=>{
    const n=setup();const g=new Network();g.mode='guest';g.online=true;let starts=0;g.callbacks.onStart=()=>starts++;
    n._send=p=>g._receive({bu:1,content:1,...p},0);
    n.start('waterfront',42);n.start('waterfront',42);assert.equal(starts,2);
  });
  test('Hub lifecycle stop prohibits outbound traffic and gameplay',()=>{
    const n=setup();n.mode='hub';n.ended=true;let sent=0;n.hub={send:()=>sent++};
    n._send=Network.prototype._send;n.command({type:'claim',board:'B1'});n.tick();n._publish();
    assert.equal(sent,0);assert.equal(n.canPlay,false);
  });
  test('Hub terminal state never starts another bomb before end',()=>{
    clock=0;const n=new Network();Object.assign(n,{mode:'hub',online:true,authority:true,seat:0,connected:true,hubStarted:true});
    n.roster=[0,1].map(id=>({id,name:'Crew '+id,connected:true}));
    n.hub={time:()=>clock*1000,rng:()=>()=>0.25,round:1,limitMs:240000,send:()=>true,finish:()=>{}};
    n.tick();const original=n.state;clock=241;n.tick();assert.equal(n.state.status,'lost');n.tick();assert.equal(n.state,original);assert.equal(n.state.status,'lost');n.dispose();
  });
  test('Hub does not create a standalone peer',()=>{
    context.AIHub={active:true};const n=new Network();
    const promise=n._makePeer();assert.ok(promise && typeof promise.catch==='function');promise.catch(()=>{});
    assert.equal(n.peer,null);context.AIHub=null;
  });
  test('coalesced high-input snapshots stay within outgoing rate',()=>{
    const n=setup();n.state=Sim.create('central',999,[0,1,2,3]);const counts=new Map();
    n._send=()=>{const second=Math.floor(clock);counts.set(second,(counts.get(second)||0)+1);return true;};
    for(let i=0;i<240;i++){clock+=1/120;n._patch('B'+(i%9+1));n.tick();}
    for(const count of counts.values())assert.ok(count<=20,`sent ${count} packets/sec`);
  });
  return results;
}
if(import.meta.url===new URL(process.argv[1],'file://').href){const results=await run();for(const r of results)if(!r.pass)console.log('FAIL',r.name,r.detail);console.log(`Network: ${results.filter(r=>r.pass).length}/${results.length} checks passed`);if(results.some(r=>!r.pass))process.exitCode=1;}
