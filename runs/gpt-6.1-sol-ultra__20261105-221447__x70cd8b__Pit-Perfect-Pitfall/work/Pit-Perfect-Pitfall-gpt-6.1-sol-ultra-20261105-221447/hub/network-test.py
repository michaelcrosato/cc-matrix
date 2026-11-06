from pathlib import Path
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parent.parent
code=(root/'network.js').read_text().replace('export class Network', 'window.Network = class Network', 1)
failures=[]
checks=0

def check(name, actual):
    global checks
    checks+=1
    if not actual:
        failures.append(name)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context()
    a=context.new_page(); b=context.new_page()
    for page in [a,b]:
        page.goto((root/'hub/README.md').as_uri())
        page.add_script_tag(content=code)
        page.evaluate('window.events=[]; window.net=new Network(e=>events.push(e)); net.init()')
    a.evaluate('net.host("TESTROOM")')
    b.evaluate('net.join("TESTROOM")')
    a.wait_for_function('net.state.connected')
    b.wait_for_function('net.state.connected')
    check('BroadcastChannel handshake', a.evaluate('net.state.connected') and b.evaluate('net.state.connected'))
    a.evaluate('net.update({x:12,y:1,facing:1,pose:"run",score:500,treasures:2,time:63})')
    b.wait_for_function('events.some(e=>e.type==="peer" && e.snapshot.x===12)')
    check('BroadcastChannel state transfer', b.evaluate('events.findLast(e=>e.type==="peer").snapshot.score===500'))
    a.evaluate('net.leave()')
    b.wait_for_function('events.some(e=>e.type==="leave")')
    check('BroadcastChannel clean leave', b.evaluate('net.state.connected===false'))
    offer=a.evaluate('net.createOffer()')
    answer=b.evaluate('(offer)=>net.acceptOffer(offer)', offer)
    a.evaluate('(answer)=>net.acceptAnswer(answer)', answer)
    a.wait_for_function('net.dataChannel?.readyState==="open"', timeout=20000)
    b.wait_for_function('net.dataChannel?.readyState==="open"', timeout=20000)
    check('WebRTC manual signal handshake', a.evaluate('net.state.connected') and b.evaluate('net.state.connected'))
    a.evaluate('net.update({x:34,y:4,score:1200,treasures:4})')
    b.wait_for_function('events.some(e=>e.type==="peer" && e.snapshot.x===34)')
    check('WebRTC state transfer', b.evaluate('events.findLast(e=>e.type==="peer").snapshot.treasures===4'))
    a.evaluate('net.dispose()');b.evaluate('net.dispose()')
    c=context.new_page();c.goto((root/'hub/README.md').as_uri());c.add_script_tag(content=code)
    c.evaluate('''window.handlers={}; window.hubClock=-Infinity; window.calls=[];
      window.AIHub={active:true,time:()=>hubClock,on:(k,fn)=>(handlers[k]=fn,()=>{}),
      connect:async()=>({me:0,players:[{id:0,name:"One"},{id:1,name:"Two"}],isHost:true}),
      ready:()=>calls.push("ready"),send:(...a)=>calls.push(["send",...a]),progress:p=>calls.push(["progress",p]),result:r=>calls.push(["result",r])};
      window.events=[]; window.net=new Network(e=>events.push(e));''')
    c.evaluate('net.init()')
    c.evaluate('net.ready();net.ready(); net.update({score:100})')
    check('AI Hub ready only once and no premature traffic', c.evaluate('calls.length===1 && calls[0]==="ready" && !net.canPlay'))
    c.evaluate('handlers.start({in:3000});hubClock=-100;net.update({score:100})')
    check('AI Hub countdown gates play', c.evaluate('!net.canPlay && calls.length===1'))
    c.evaluate('hubClock=0;net.update({x:3,score:100,treasures:1})')
    check('AI Hub progress and ghost traffic', c.evaluate('net.canPlay && calls.some(c=>c[0]==="send") && calls.some(c=>c[0]==="progress")'))
    c.evaluate('handlers.message({game:"pit-perfect",kind:"snapshot",snapshot:{x:20,score:300}},1)')
    check('AI Hub peer receive', c.evaluate('events.some(e=>e.type==="peer"&&e.id===1&&e.snapshot.x===20)'))
    c.evaluate('handlers["time-up"]({graceMs:1000});net.finish(999)')
    check('AI Hub one result at time-up', c.evaluate('calls.filter(c=>c[0]==="result").length===1 && calls.find(c=>c[0]==="result")[1].score===100'))
    c.evaluate('handlers.end({reason:"finished"});window.ncalls=calls.length;net.update({score:200})')
    check('AI Hub end blocks sending', c.evaluate('net.ended && !net.canPlay && calls.length===ncalls'))
    browser.close()
for failure in failures:
    print('FAIL: '+failure)
print(f'{checks-len(failures)}/{checks} networking checks passed')
raise SystemExit(bool(failures))
