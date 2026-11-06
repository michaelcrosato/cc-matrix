import contextlib
import functools
import http.server
import pathlib
import threading
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
failures = []
checks = 0

def check(name, fn):
    global checks
    checks += 1
    try:
        fn()
    except Exception as exc:
        failures.append(name + ': ' + str(exc).splitlines()[0])

def require(value, message):
    if not value:
        raise AssertionError(message)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context()
    pages = [context.new_page(), context.new_page()]
    for page in pages:
        page.goto(f'http://127.0.0.1:{server.server_port}/network-dev/network-test.html')
        page.wait_for_function('window.testReady === true')
    a, b = pages
    def quick_room():
        room = a.evaluate('net.createLocalRoom()')
        b.evaluate('(code)=>net.joinRoom(code)', room)
        for page in pages: page.wait_for_function('net.connected')
        require(a.evaluate('net.role') == 'host', 'host role')
        require(b.evaluate('net.team') == 1, 'guest team')
        a.evaluate('net.startMatch({duration:180})')
        b.wait_for_function('events.some(e=>e[0]==="start")')
    check('quick room handshake and synchronized start', quick_room)
    def quick_traffic():
        b.evaluate('net.sendInput({x:1,shot:true})')
        a.wait_for_function('events.some(e=>e[0]==="input" && e[1].x===1 && e[2]===1)')
        a.evaluate('net.sendSnapshot({scores:[2,1],puck:{x:4,z:2}})')
        b.wait_for_function('events.some(e=>e[0]==="snapshot" && e[1].puck.x===4)')
    check('quick room bidirectional game data', quick_traffic)
    def latched_edges():
        b.evaluate('net.sendInput({x:0,pass:true,check:true,switch:true,shoot:true});net.sendInput({x:0,pass:false,check:false,switch:false,shoot:false})')
        b.wait_for_timeout(75)
        b.evaluate('net.sendInput({x:0,pass:false,check:false,switch:false,shoot:false})')
        a.wait_for_function('events.some(e=>e[0]==="input" && e[1].pass && e[1].check && e[1].switch && e[1].shoot)')
    check('short action taps survive transport throttling', latched_edges)
    def quick_leave():
        b.evaluate('net.leave()')
        require(b.evaluate('net.team===0 && net.role==="none" && !net.server'), 'guest leaves into offline team 0')
        a.wait_for_function('events.some(e=>e[0]==="disconnect")')
        require(not a.evaluate('net.connected'), 'host detected disconnect')
        a.evaluate('net.leave();events.length=0')
        b.evaluate('events.length=0')
    check('quick room clean disconnect', quick_leave)
    def rtc_connection():
        offer = a.evaluate('net.createRoom()')
        require(offer.startswith('HR1.'), 'encoded offer')
        answer = b.evaluate('(offer)=>net.joinRoom(offer)', offer)
        require(answer.startswith('HR1.'), 'encoded answer')
        a.evaluate('(answer)=>net.receiveSignal(answer)', answer)
        for page in pages: page.wait_for_function('net.connected', timeout=20000)
        a.evaluate('net.startMatch({duration:120})')
        b.wait_for_function('events.some(e=>e[0]==="start" && e[1].duration===120)')
    check('real WebRTC manual offer answer connection', rtc_connection)
    def rtc_traffic():
        b.evaluate('net.sendInput({x:-1,pass:true})')
        a.wait_for_function('events.some(e=>e[0]==="input" && e[1].x===-1)')
        a.evaluate('net.sendSnapshot({scores:[4,2],puck:{x:3}})')
        b.wait_for_function('events.some(e=>e[0]==="snapshot" && e[1].scores[0]===4)')
        a.evaluate('net.finish([4,2])')
        require(a.evaluate('net._didFinish'), 'finish exactly once latch')
        for page in pages: page.evaluate('net.leave();events.length=0')
    check('real WebRTC bidirectional game data', rtc_traffic)
    def invalid_signal():
        message = a.evaluate('async()=>{try {await net.joinRoom("wrong invite")}catch(e){return e.message}}')
        require('complete invitation' in message, 'clear invalid signal response')
    check('invalid signaling validation', invalid_signal)
    def hub_server():
        a.evaluate('''async()=>{
          window.hubEvents={};window.hubSent=[];window.hubFinished=null;window.hubReady=0;
          window.AIHub={active:true,connect:async()=>({isHost:true,server:true,me:2,host:2,players:[{id:0,name:'A'},{id:1,name:'B'}]}),on:(event,fn)=>{hubEvents[event]=fn;return ()=>{}},ready:()=>hubReady++,send:(data,opts)=>{hubSent.push([data,opts]);return true},finish:outcome=>hubFinished=outcome};
          window.net=new HockeyNet({onStart:e=>events.push(['start',e]),onRemoteInput:(i,t,id)=>events.push(['input',i,t,id]),onEnd:e=>events.push(['end',e])});
          await net.init();net.ready();hubEvents.start({in:3000});hubEvents.message({hockey:1,type:'input',sequence:1,input:{x:1}},0);net.sendSnapshot({scores:[3,1]});net.finish([3,1]);
        }''')
        require(a.evaluate('net.server && net.team===-1 && net.role==="host"'), 'dedicated server authority')
        require(a.evaluate('hubReady===1'), 'ready without keypress')
        require(a.evaluate('events.some(e=>e[0]==="input" && e[2]===0 && e[3]===0)'), 'server receives team 0 input')
        require(a.evaluate('JSON.stringify(hubFinished.standings)==="[[0],[1]]"'), 'server ranks both players and excludes server')
        a.evaluate('hubEvents.end({reason:"finished"});net.sendSnapshot({scores:[9,9]})')
        require(a.evaluate('hubSent.length===1 && net.ended'), 'no traffic after hub end')
    check('AI Hub dedicated server lifecycle and valid standings', hub_server)
    def hub_timeup():
        a.evaluate('''async()=>{
          window.hubFinished=null;window.AIHub.connect=async()=>({isHost:true,server:false,me:0,host:0,players:[{id:0},{id:1}]});
          window.net=new HockeyNet();await net.init();net.sendSnapshot({scores:[1,2]});hubEvents['time-up']({graceMs:5000});
        }''')
        require(a.evaluate('JSON.stringify(hubFinished.standings)==="[[1],[0]]"'), 'time-up reports current scores')
    check('AI Hub time-up fallback finish', hub_timeup)
    context.close()
    browser.close()
server.shutdown()
server.server_close()
for failure in failures: print('FAIL ' + failure)
print(f'{checks-len(failures)}/{checks} network checks passed')
raise SystemExit(bool(failures))
