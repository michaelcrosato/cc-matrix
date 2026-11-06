from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
import json
from playwright.sync_api import sync_playwright

def check_network():
    failures=[]; count=0
    root=Path(__file__).resolve().parent
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=ThreadingHTTPServer(("127.0.0.1",0),partial(QuietHandler,directory=str(root)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            context=browser.new_context()
            first=context.new_page(); second=context.new_page()
            url=f"http://127.0.0.1:{server.server_port}/network-test.html"
            for page in [first,second]:
                page.goto(url);page.wait_for_function("window.ready")
                assert page.title()=="Puck Wild Network Test"
            def check(name, condition):
                nonlocal count
                count+=1
                if not condition: failures.append(name)
            check("default music-independent offline network state",first.evaluate("net.status==='Offline' && net.isHost && !net.connected"))
            code=first.evaluate("net.hostRoom()")
            second.evaluate("code=>net.joinRoom(code)",code)
            first.wait_for_function("net.connected");second.wait_for_function("net.connected")
            check("broadcast connects both peers", first.evaluate("net.connected&&net.isHost&&net.localTeam===0") and second.evaluate("net.connected&&!net.isHost&&net.localTeam===1"))
            first.evaluate("net.sendState({score:[2,1],x:4})")
            second.wait_for_function("events.some(e=>e.type==='state')")
            check("broadcast host state arrives", second.evaluate("events.find(e=>e.type==='state').data.score[0]===2"))
            second.evaluate("net.sendInput({x:1,shot:true})")
            first.wait_for_function("events.some(e=>e.type==='input')")
            check("broadcast guest input arrives", first.evaluate("events.find(e=>e.type==='input').data.input.shot===true"))
            check("snapshot messages rate limited", first.evaluate("net.lastState=-Infinity;net.sendState({x:5});net.sendState({x:6})===false"))
            first.evaluate("net._receive({game:'puck-wild',kind:'input',seq:80,payload:{x:80}});net._receive({game:'puck-wild',kind:'input',seq:79,payload:{x:79}})")
            check("out-of-order packets are discarded",first.evaluate("events.some(e=>e.type==='input'&&e.data.input.x===80)&&!events.some(e=>e.type==='input'&&e.data.input.x===79)"))
            second.evaluate("net.disconnect()")
            first.wait_for_function("!net.connected")
            check("broadcast peer disconnect notification",first.evaluate("events.some(e=>e.type==='peer-left')"))
            for page in [first,second]:page.evaluate("events=[];net.disconnect()")
            offer=first.evaluate("net.createOffer()")
            answer=second.evaluate("code=>net.acceptOffer(code)",offer)
            first.evaluate("code=>net.acceptAnswer(code)",answer)
            first.wait_for_function("net.connected",timeout=20000);second.wait_for_function("net.connected",timeout=20000)
            check("WebRTC manual invite and answer connect", first.evaluate("net.connected") and second.evaluate("net.connected"))
            first.evaluate("net.sendState({score:[3,4]})")
            second.evaluate("net.sendInput({x:-1,boost:true})")
            first.wait_for_function("events.some(e=>e.type==='input')");second.wait_for_function("events.some(e=>e.type==='state')")
            check("WebRTC authoritative traffic in both directions",first.evaluate("events.find(e=>e.type==='input').data.input.boost") and second.evaluate("events.find(e=>e.type==='state').data.score[1]===4"))
            check("invalid manual signal rejected",second.evaluate("async()=>{try{await net.acceptOffer('garbage');return false}catch(e){return /complete/.test(e.message)}}"))
            for page in [first,second]: page.evaluate("net.disconnect()")
            first.add_init_script("""
              const handlers={};
              window.hubCalls=[];
              window.hubHandlers=handlers;
              window.AIHub={active:true,
                on(name,fn){handlers[name]=fn;return ()=>delete handlers[name]},
                async connect(options){hubCalls.push(['connect',options]);return {me:99,host:99,isHost:true,server:true,players:[{id:0,name:'One'},{id:1,name:'Two'}]}},
                ready(){hubCalls.push(['ready'])},
                send(data,options){hubCalls.push(['send',data,options]);return true},
                finish(data){hubCalls.push(['finish',data])}
              };
            """)
            first.reload();first.wait_for_function("window.ready")
            first.evaluate("net.init()")
            check("hub shared-world server host has no player",first.evaluate("net.hubActive&&net.connected&&net.isHost&&net.localTeam===null&&hubCalls[0][1].mode==='shared-world'"))
            first.evaluate("net.ready();net.ready();net.finish([5,2]);net.finish([1,0])")
            check("hub ready and finish are once-only",first.evaluate("hubCalls.filter(c=>c[0]==='ready').length===1&&hubCalls.filter(c=>c[0]==='finish').length===1"))
            check("hub standings include both players",first.evaluate("JSON.stringify(hubCalls.find(c=>c[0]==='finish')[1].standings)==='[[0],[1]]'"))
            first.evaluate("hubHandlers.message({game:'puck-wild',kind:'input',payload:{x:1}},1)")
            check("hub authoritative host receives guest inputs",first.evaluate("events.some(e=>e.type==='input'&&e.data.from===1&&e.data.input.x===1)"))
            first.evaluate("hubHandlers.end({reason:'finished'})")
            check("hub end stops all outgoing traffic",first.evaluate("net.ended&&!net.connected&&!net.sendState({x:2})"))
            browser.close()
    except Exception as error:failures.append(str(error))
    finally:server.shutdown();server.server_close()
    return count, failures

if __name__=='__main__':
    count,failures=check_network()
    for failure in failures:print('FAIL:',failure)
    print(f'{count} network checks; {len(failures)} failures')
    raise SystemExit(bool(failures))
