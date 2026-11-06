"""Focused online checks. No broker or physical controller is required."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import functools

ROOT = Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

failures = []
count = 0
def check(label, test):
    global count
    count += 1
    try: test()
    except Exception as error: failures.append(f"FAIL {label}: {error}")

def truth(value, detail='assertion failed'):
    assert value, detail

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        context.route('**/peerjs@*/**', lambda route: route.fulfill(content_type='application/javascript', body='window.Peer=class{on(){return this}destroy(){}};'))
        a, b = context.new_page(), context.new_page()
        for page in (a, b):
            page.goto(f'http://127.0.0.1:{server.server_port}/hub-reference/network-test.html')
            truth(page.title() == 'Chopper Palooza network checks')
            page.evaluate("""async () => {
                const {createOnline} = await import('/online.js'); window.makeNet=createOnline;
                window.events={starts:0,inputs:[],states:[],status:[]};
                window.net=createOnline({onStart:()=>events.starts++,onState:s=>events.states.push(s),onInput:(v,i)=>events.inputs.push([v,i]),onStatus:s=>events.status.push(s)});
            }""")
        code = a.evaluate('net.host()')
        check('six-character host room', lambda: truth(len(code) == 6))
        check('invalid join code rejected', lambda: truth(b.evaluate("net.join('BAD')") is False))
        b.evaluate('(code)=>net.join(code)', code)
        check('two-page room connection', lambda: b.wait_for_function('net.connected'))
        check('single start each peer', lambda: truth(a.evaluate('events.starts') == b.evaluate('events.starts') == 1))
        a.evaluate("net.tick(.11,{score:1234,players:[{x:10,y:5}],enemies:[]})")
        check('host snapshot reaches guest', lambda: b.wait_for_function('events.states.at(-1)?.score===1234'))
        b.evaluate('net.sendInput({x:2,y:-2,fire:true,boost:true});net.tick(.1)')
        check('guest input reaches host and clamps', lambda: a.wait_for_function('events.inputs.at(-1)?.[0].x===1 && events.inputs.at(-1)?.[0].y===-1 && events.inputs.at(-1)?.[0].boost && events.inputs.at(-1)?.[1]===1'))
        b.evaluate('net.sendInput({flare:true,rescue:true});net.sendInput({flare:false,rescue:false});net.tick(.1)')
        check('short ability taps survive network cadence', lambda: a.wait_for_function('events.inputs.at(-1)?.[0].flare && events.inputs.at(-1)?.[0].rescue'))
        b.evaluate('net.leave()')
        check('clean departure', lambda: a.wait_for_function('!net.connected'))
        a.evaluate('net.leave()')
        a.evaluate("""async () => {
          const handlers={};window.hubEvents=handlers;window.hubCalls={ready:0,sent:[],finishes:[]};
          window.hubClock=-Infinity;
          window.AIHub={active:true,connect:async()=>({isHost:true,host:9,me:9,server:true,round:1,players:[{id:0},{id:1}]}),ready:()=>hubCalls.ready++,on:(name,fn)=>handlers[name]=fn,time:()=>hubClock,send:(...v)=>hubCalls.sent.push(v),finish:r=>hubCalls.finishes.push(r)};
          window.hn=makeNet({});await hn.initHub();
        }""")
        check('hub ready without input', lambda: truth(a.evaluate('hubCalls.ready===1 && hn.hub && hn.server && hn.seat===-1 && !hn.canPlay')))
        a.evaluate('hubClock=-1000;hubEvents.start({in:1000})')
        check('hub countdown gated', lambda: truth(a.evaluate('!hn.canPlay')))
        a.evaluate('hubClock=0;hn.tick(.11,{score:4500})')
        check('hub server sends authoritative world', lambda: truth(a.evaluate('hn.canPlay && hubCalls.sent.length===1 && hubCalls.sent[0][0].state.score===4500')))
        a.evaluate('hubEvents["time-up"]({graceMs:1000});hn.finish(1,true)')
        check('time-up reports valid result once', lambda: truth(a.evaluate('hubCalls.finishes.length===1 && hubCalls.finishes[0].scores[0]===4500 && hubCalls.finishes[0].standings[0].join() === "0,1"')))
        a.evaluate('hubEvents.end({reason:"finished"});hn.tick(.11,{score:9999})')
        check('hub end stops all traffic', lambda: truth(a.evaluate('hn.ended && !hn.canPlay && hubCalls.sent.length===1')))
        browser.close()
finally:
    server.shutdown()
    server.server_close()
for failure in failures: print(failure)
print(f'{count - len(failures)}/{count} online checks passed')
raise SystemExit(bool(failures))
