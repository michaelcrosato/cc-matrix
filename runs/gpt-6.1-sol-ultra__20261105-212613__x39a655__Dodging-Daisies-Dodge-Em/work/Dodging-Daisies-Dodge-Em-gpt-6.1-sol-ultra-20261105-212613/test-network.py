"""Run with the workstation Playwright Python; prints failures plus a count."""
import functools
import http.server
import pathlib
import threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_address[1]}'
passed = 0
failed = []

def check(name, fn):
    global passed
    try:
        fn()
        passed += 1
    except Exception as error:
        failed.append(name)
        print(f'FAIL {name}: {error}')

def eq(value, expected):
    assert value == expected, f'{value!r} != {expected!r}'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    a, b = context.new_page(), context.new_page()
    for page in (a, b):
        page.goto(origin + '/net-test.html')
        page.evaluate('''async () => {
          const {createNetwork}=await import('./net.js');
          window.events={starts:[],states:[],inputs:[],leaves:[],status:[]};
          window.net=createNetwork({onStart:e=>events.starts.push(e),onState:e=>events.states.push(e),onInput:(x,id)=>events.inputs.push({x,id}),onLeave:e=>events.leaves.push(e),onStatus:e=>events.status.push(e)});
          await net.init();
        }''')
    check('standalone starts offline', lambda: eq(a.evaluate('net.debug.kind'), 'none'))
    a.evaluate("net.connectLocal('test-network',true)")
    b.evaluate("net.connectLocal('test-network',false)")
    a.wait_for_function('net.connected')
    b.wait_for_function('net.connected')
    check('same-device link starts two drivers', lambda: eq([a.evaluate('events.starts.length'),b.evaluate('events.starts.length')], [1,1]))
    a.evaluate('net.sendState({mode:"playing",score:80,players:[{id:0},{id:1}]})')
    b.wait_for_function('events.states.length===1')
    check('host state reaches guest', lambda: eq(b.evaluate('events.states[0].score'), 80))
    b.evaluate('net.sendInput({steer:1,boost:true})')
    a.wait_for_function('events.inputs.length===1')
    check('guest input identifies correct driver', lambda: eq(a.evaluate('events.inputs[0]'), {'x': {'steer':1,'boost':True},'id':1}))
    a.evaluate('net.leave()')
    b.wait_for_function('events.leaves.length===1')
    check('disconnect reports remote leave', lambda: eq(b.evaluate('net.connected'), False))
    b.evaluate('net.leave()')
    offer = a.evaluate('net.host()')
    answer = b.evaluate('(offer)=>net.acceptOffer(offer)', offer)
    a.evaluate('(answer)=>net.acceptAnswer(answer)', answer)
    a.wait_for_function('net.connected', timeout=15000)
    b.wait_for_function('net.connected', timeout=15000)
    check('WebRTC invitation and reply connect', lambda: eq([a.evaluate('net.kind'),b.evaluate('net.kind')], ['webrtc','webrtc']))
    a.evaluate('net.sendState({mode:"playing",score:123})')
    b.wait_for_function('events.states.length===2')
    check('WebRTC carries state', lambda: eq(b.evaluate('events.states[1].score'), 123))
    b.evaluate('net.sendInput({steer:-1})')
    a.wait_for_function('events.inputs.length===2')
    check('WebRTC carries input', lambda: eq(a.evaluate('events.inputs[1].x.steer'), -1))
    for page in (a,b): page.evaluate('net.leave()')
    context.close()
    context = browser.new_context()
    context.add_init_script('''window.handlers={};window.sent=[];window.finishCalls=[];window.readyCalls=0;
      window.AIHub={active:true,host:7,me:7,isHost:true,players:[{id:0,name:'A',color:'#fff'},{id:1,name:'B',color:'#000'}],time:()=>0,
       on:(e,f)=>{handlers[e]=f;return()=>delete handlers[e]},connect:async()=>({isHost:true,me:7,players:AIHub.players,server:true}),
       ready:()=>readyCalls++,send:(d,o)=>{sent.push([d,o]);return true},finish:o=>finishCalls.push(o)};''')
    page = context.new_page()
    page.goto(origin + '/net-test.html')
    page.evaluate('''async()=>{const{createNetwork}=await import('./net.js');window.ends=[];window.net=createNetwork({onEnd:e=>ends.push(e)});net.ready();await net.init()}''')
    check('early ready waits for connection and sends once', lambda: eq(page.evaluate('readyCalls'), 1))
    check('dedicated hub host has no local driver', lambda: eq(page.evaluate('[net.server,net.playerIndex]'), [True,7]))
    page.evaluate('handlers.start({in:0});net.sendState({score:44});net.finish({score:44,won:true});net.finish({score:77})')
    check('hub result is once and lists every player', lambda: eq(page.evaluate('finishCalls'), [{'standings':[[0,1]],'scores':{'0':44,'1':44},'won':True,'stats':{'0':{},'1':{}}}]))
    page.evaluate('handlers.end({reason:"finished"});net.sendState({score:88});net.sendInput({boost:true})')
    check('hub end stops all game traffic', lambda: eq(page.evaluate('[net.ended,sent.length,ends.length]'), [True,1,1]))
    context.close()
    browser.close()
server.shutdown()
print(f'{passed} passed, {len(failed)} failed')
raise SystemExit(bool(failed))
