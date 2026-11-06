import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import vm from 'node:vm';
const directory = new URL('.', import.meta.url);
const source = await readFile(new URL('hub.js', directory), 'utf8');
const protocol = 'keystone-bumbling-beat/1';

export async function runHubTests({ browser = true } = {}) {
  let passed = 0;
  const failures = [];
  const check = async (name, fn) => {
    try { await fn(); passed++; }
    catch (error) { failures.push(`${name}: ${error.message}`); }
  };
  const assert = (ok, message = 'assertion failed') => { if (!ok) throw new Error(message); };
  function setup(info = {}) {
    const listeners = new Map();
    const sent = [];
    const finishes = [];
    let time = -Infinity;
    let now = 0;
    let readied = 0;
    const hub = { active: true, connect: async opts => { hub.options = opts; return { me: 0, host: 0, isHost: true, server: false, players: [{id:0},{id:1}], ...info }; },
      ready: () => readied++, time: () => time, on: (name, fn) => { listeners.set(name,fn); return () => listeners.delete(name); },
      send: (d,o) => { sent.push({d,o}); return true; }, finish: o => finishes.push(o), fail: m => { hub.failure=m; } };
    const context = vm.createContext({ AIHub: hub, performance: {now:()=>now}, setInterval, clearInterval, setTimeout, clearTimeout, Map, TextEncoder, TextDecoder });
    vm.runInContext(source.replace('export class HubBridge', 'globalThis.HubBridge = class HubBridge'),context);
    const events = {start:[],input:[],state:[],end:[],leave:[],timeup:[]};
    const bridge = new context.HubBridge({onStart:e=>events.start.push(e),onInput:(v,id)=>events.input.push({v,id}),onState:s=>events.state.push(s),onEnd:e=>events.end.push(e),onLeave:e=>events.leave.push(e),onTimeUp:e=>events.timeup.push(e)});
    return {bridge,hub,sent,finishes,events,fire:(name,...args)=>listeners.get(name)?.(...args),setNow:n=>{now=n},setTime:t=>{time=t},readyCount:()=>readied};
  }
  await check('hub connect and automatic-ready hook',async()=>{
    const t=setup(); await t.bridge.connect(); t.bridge.ready();
    assert(t.hub.options.mode==='shared-world'&&t.hub.options.seats[1]===2&&t.readyCount()===1);
  });
  await check('start waits for synchronized play time',async()=>{
    const t=setup();await t.bridge.connect();assert(!t.bridge.canPlay());t.fire('start',{in:3000});t.setTime(-1);assert(!t.bridge.canPlay());t.setTime(0);assert(t.bridge.canPlay()&&t.events.start.length===1);
  });
  await check('host authenticates sender and rejects replay',async()=>{
    const t=setup();await t.bridge.connect();const packet={p:protocol,k:'input',n:1,input:{move:5,jump:true}};
    t.fire('message',packet,9);t.fire('message',packet,1);t.fire('message',packet,1);
    assert(t.events.input.length===1&&t.events.input[0].v.move===1&&t.events.input[0].id===1);
  });
  await check('dedicated host accepts independent guest sequences',async()=>{
    const t=setup({me:2,host:2,server:true});await t.bridge.connect();
    for(const from of [0,1])t.fire('message',{p:protocol,k:'input',n:1,input:{move:from===0?1:-1}},from);
    assert(t.bridge.server&&t.events.input.length===2&&t.events.input[0].id===0&&t.events.input[1].id===1);
  });
  await check('snapshot rate remains 10 Hz',async()=>{
    const t=setup();await t.bridge.connect();for(let i=0;i<60;i++){t.setNow(i*1000/60);t.bridge.sendState({score:i});}
    assert(t.sent.length>=9&&t.sent.length<=10&&t.sent.every(p=>p.d.k==='state'));
  });
  await check('guest input latches actions between network frames',async()=>{
    const t=setup({me:1,isHost:false});await t.bridge.connect();t.bridge.sendInput({move:0});t.setNow(20);t.bridge.sendInput({move:1,jump:true});t.setNow(50);t.bridge.sendInput({move:1});t.setNow(100);t.bridge.sendInput({move:1});
    assert(t.sent.length===2&&t.sent[1].d.input.jump&&t.sent[1].o.to===0);
  });
  await check('remote down-use survives transport as a held state',async()=>{
    const guest=setup({me:1,isHost:false}),host=setup();await guest.bridge.connect();await host.bridge.connect();
    guest.bridge.sendInput({interact:true,downUse:true});host.fire('message',guest.sent[0].d,1);
    assert(host.events.input[0].v.interact&&host.events.input[0].v.downUse);
    guest.setNow(100);guest.bridge.sendInput({downUse:false});host.fire('message',guest.sent[1].d,1);
    assert(host.events.input.length===2&&!host.events.input[1].v.downUse);
  });
  await check('guest trusts only host snapshots and increasing sequence',async()=>{
    const t=setup({me:1,isHost:false});await t.bridge.connect();const p={p:protocol,k:'state',n:1,state:{score:23}};t.fire('message',p,1);t.fire('message',p,0);t.fire('message',p,0);
    assert(t.events.state.length===1&&t.events.state[0].score===23);
  });
  await check('leave removes seats before team standings',async()=>{
    const t=setup();await t.bridge.connect();t.fire('leave',{id:1,reason:'left'});t.bridge.finish({score:250,won:true,stats:{Catches:3}});t.bridge.finish({score:1});
    assert(t.finishes.length===1&&t.finishes[0].standings.length===1&&t.finishes[0].standings[0].length===1&&t.finishes[0].won&&t.finishes[0].scores[0]===250);
  });
  await check('time-up always supplies host result',async()=>{
    const t=setup();await t.bridge.connect();t.fire('time-up',{graceMs:1000});assert(t.finishes.length===1&&!t.finishes[0].won&&t.events.timeup.length===1);
  });
  await check('end stops all traffic and play',async()=>{
    const t=setup();await t.bridge.connect();t.setTime(0);t.fire('start',{in:0});t.fire('end',{reason:'finished'});t.bridge.sendState({score:10},true);t.fire('message',{p:protocol,k:'input',n:1,input:{}},1);
    assert(!t.bridge.canPlay()&&t.sent.length===0&&t.events.input.length===0&&t.events.end.length===1);
  });
  await check('guest cannot finish host round',async()=>{
    const t=setup({me:1,isHost:false});await t.bridge.connect();t.bridge.finish({won:true});assert(t.finishes.length===0);
  });
  await check('session forbids standalone transports and disconnect',async()=>{
    const t=setup();await t.bridge.connect();let rejected=0;try{t.bridge.openLocalRoom()}catch{rejected++}try{t.bridge.createPeer(true)}catch{rejected++}assert(rejected===2&&t.bridge.disconnect()===false);
  });
  await check('standalone new round resets previous finish',async()=>{
    const t=setup();t.hub.active=false;t.bridge.active=false;t.bridge.finished=true;t.bridge.ended=true;t.bridge.begin();assert(t.bridge.started&&!t.bridge.finished&&!t.bridge.ended&&t.bridge.canPlay());
  });
  await check('standalone leave prunes seat and notifies once',async()=>{
    const t=setup();await t.bridge.connect();t.bridge.active=false;t.bridge.inputSeq.set(1,50);
    t.bridge.markPeerLeft('channel-closed',1);t.bridge.markPeerLeft('closed',1);
    assert(!t.bridge.connected&&t.bridge.players.length===1&&!t.bridge.inputSeq.has(1)&&t.events.leave.length===1);
  });
  if(browser) {
    const server=createServer((req,res)=>{
      if(req.url==='/hub.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(source);}
      else {res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Keystone Bumbling Beat network test</title>');}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const address=`http://127.0.0.1:${server.address().port}`;
    const python=`
from playwright.sync_api import sync_playwright
import sys
base=sys.argv[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 ctx=b.new_context()
 pages=[ctx.new_page(),ctx.new_page()]
 for page in pages:
  page.goto(base)
  assert page.title()=='Keystone Bumbling Beat network test'
  page.evaluate("""async url=>{ const {HubBridge}=await import(url+'/hub.js');window.logs={inputs:[],states:[],joins:[],finished:[],leaves:[]};window.bridge=new HubBridge({onInput:(v,id)=>logs.inputs.push({v,id}),onState:s=>logs.states.push(s),onJoin:i=>logs.joins.push(i),onFinished:o=>logs.finished.push(o),onLeave:e=>logs.leaves.push(e)}); }""",base)
 pages[0].evaluate("bridge.openLocalRoom('QATEST',true)")
 pages[1].evaluate("bridge.openLocalRoom('QATEST',false)")
 for page in pages:page.wait_for_function('bridge.connected')
 pages[1].evaluate("bridge.sendInput({move:1,jump:true},true)")
 pages[0].wait_for_function('logs.inputs.length===1')
 assert pages[0].evaluate('logs.inputs[0].id===1 && logs.inputs[0].v.move===1 && logs.inputs[0].v.jump')
 pages[0].evaluate("bridge.sendState({score:321,cops:[1,2]},true)")
 pages[1].wait_for_function('logs.states.length===1')
 assert pages[1].evaluate('logs.states[0].score===321')
 pages[1].evaluate("bridge.bc.postMessage({p:'keystone-bumbling-beat/1',k:'join',from:1})")
 pages[0].wait_for_timeout(100)
 assert pages[0].evaluate('logs.joins.length===1')
 pages[1].evaluate('bridge.disconnect()')
 pages[0].wait_for_function('!bridge.connected && logs.leaves.length===1')
 assert pages[0].evaluate('bridge.players.length===1 && bridge.players[0].id===0')
 pages[1].evaluate("bridge.openLocalRoom('QATEST',false);bridge.seq=0")
 for page in pages:page.wait_for_function('bridge.connected')
 pages[1].evaluate("bridge.sendInput({move:.5},true)")
 pages[0].wait_for_function('logs.inputs.length===2')
 assert pages[0].evaluate('logs.inputs[1].v.move===.5 && logs.joins.length===2')
 pages[0].evaluate('bridge.disconnect()');pages[1].evaluate('bridge.disconnect()')
 offer=pages[0].evaluate('bridge.createOffer()')
 reply=pages[1].evaluate('code=>bridge.acceptOffer(code)',offer)
 pages[0].evaluate('code=>bridge.acceptAnswer(code)',reply)
 for page in pages:page.wait_for_function('bridge.connected',timeout=15000)
 pages[1].evaluate("bridge.sendInput({move:-1,duck:true,downUse:true},true)")
 pages[0].wait_for_function('logs.inputs.length===3')
 assert pages[0].evaluate('logs.inputs[2].v.move===-1 && logs.inputs[2].v.duck && logs.inputs[2].v.downUse')
 pages[0].evaluate("bridge.sendState({score:987},true)")
 pages[1].wait_for_function('logs.states.length===2')
 pages[0].evaluate("bridge.finish({score:987,won:true})")
 pages[1].wait_for_function('logs.finished.length===1')
 assert pages[1].evaluate('logs.finished[0].won && logs.finished[0].scores[1]===987')
 pages[1].evaluate('bridge.disconnect()')
 pages[0].wait_for_function('!bridge.connected && logs.leaves.length===2')
 assert pages[0].evaluate('bridge.players.length===1')
 for page in pages:page.evaluate('bridge.destroy()')
 b.close()
`;
    await check('two-browser BroadcastChannel and direct WebRTC play',()=>new Promise((resolve,reject)=>{
      const child=spawn('/home/micha/.local/share/pipx/venvs/playwright/bin/python',['-c',python,address],{stdio:['ignore','pipe','pipe']});
      let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('error',reject);child.on('close',code=>code===0?resolve():reject(new Error(output.trim()||`browser exit ${code}`)));
    }));
    await new Promise(resolve=>server.close(resolve));
  }
  return {passed,failed:failures.length,failures};
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const result=await runHubTests({browser:!process.argv.includes('--unit-only')});
 for(const failure of result.failures)console.error(`FAIL ${failure}`);
 console.log(`${result.passed} network checks passed; ${result.failed} failed`);
 process.exitCode=result.failed?1:0;
}
