from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--game')
args = parser.parse_args()
root = Path(__file__).resolve().parent
served = root.parent if args.game else root
(root / '.browser-tmp').mkdir(exist_ok=True)
os.environ['TMPDIR'] = str(root / '.browser-tmp')
class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(served), **kwargs)
    def log_message(self, *args): pass

failures = []
checks = 0
def check(condition, message):
    global checks
    checks += 1
    if not condition: failures.append(message)

server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_address[1]}/' + (args.game.lstrip('/') if args.game else 'network-test.html')
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader'] if args.game else [])
        a = browser.new_page()
        b = browser.new_page()
        for page in [a, b]:
            page.goto(url)
            if args.game:
                page.wait_for_function('window.__solar?.ready || window.__solarError', timeout=60000)
                if page.evaluate('!!window.__solarError'): raise RuntimeError(page.evaluate('window.__solarError'))
                page.evaluate('''()=>{window.events={starts:0,states:[],inputs:[],finishes:[],peers:[]};window.net=__solar.network;const hooks={onStart:()=>events.starts++,onState:s=>events.states.push(s),onInput:i=>events.inputs.push(i),onFinish:(w,s)=>events.finishes.push({won:w,score:s}),onPeer:c=>events.peers.push(c)};for(const[name,hook]of Object.entries(hooks)){const old=net.cb[name];net.cb[name]=(...args)=>{hook(...args);return old?.(...args);};}solarApp.show('coop');}''')
            else:
                page.evaluate('''() => {window.events={starts:0,states:[],inputs:[],finishes:[],peers:[]};window.net=new SolarNetwork({onStart:()=>events.starts++,onState:s=>events.states.push(s),onInput:i=>events.inputs.push(i),onFinish:(w,s)=>events.finishes.push({won:w,score:s}),onPeer:c=>events.peers.push(c)});window.timer=setInterval(()=>net.update(.09,{score:99,scene:'frontier'},{x:1,y:-.5,fire:true,pulse:false,boost:false}),90);}''')
        check(a.evaluate('net.inspect().role') == 'solo', 'Network should begin as solo.')
        check(a.evaluate('net.sanitizeInput({x:8,y:-8,fire:1}).x===1 && net.sanitizeInput({x:8,y:-8}).y===-1'), 'Input must clamp remote axes.')
        bad=b.evaluate('''async()=>{try{await net.join('bad');return false;}catch(e){return /complete Solar Flair offer/.test(e.message);}}''')
        check(bad, 'Malformed invitation must return a useful error.')
        check(a.evaluate('net.sanitizeInput({aimX:48,aimY:-22}).aimX===48 && net.sanitizeInput({aimX:48,aimY:-22}).aimY===-22'), 'World-space aim must preserve its full range.')
        check(a.evaluate('net.sanitizeInput({aimX:500,aimY:-500}).aimX===55 && net.sanitizeInput({aimX:500,aimY:-500}).aimY===-35'), 'World-space aim must clamp to flight bounds.')
        packed=a.evaluate('''()=>{const original={score:25,entities:Array.from({length:20},(_,id)=>({id,type:'enemy',kind:'fighter',x:1.23456789,y:-.998877,z:-66.998878,hp:22,maxHp:40,age:12.445567,phase:0,scale:1})),bullets:Array.from({length:100},(_,id)=>({id,owner:'enemy',x:1.1244467,y:-.2457766,z:-78.337299,vx:1.772923,vy:-4.568922,vz:50.9838263}))};const encoded=net.packState(original);const size=JSON.stringify({solarFlair:1,kind:'state',seq:1,packed:1,state:encoded}).length;const decoded=net.unpackState(encoded);return {size,originalSize:JSON.stringify(original).length,entities:decoded.entities.length,bullets:decoded.bullets.length,first:decoded.entities[0]};}''')
        check(packed['size']<16000 and packed['size']<packed['originalSize']*.6, 'Dense snapshots must fit Hub packet cap after packing.')
        check(packed['entities']==20 and packed['bullets']==100 and abs(packed['first']['x']-1.23456789)<.001, 'Packed snapshots must restore complete entity tables and positions.')
        offer = a.evaluate('net.host()')
        answer = b.evaluate('(offer)=>net.join(offer)', offer)
        a.evaluate('(answer)=>net.accept(answer)', answer)
        a.wait_for_function('net.inspect().connected && events.starts===1', timeout=15000)
        b.wait_for_function('net.inspect().connected && events.starts===1 && events.states.length>0', timeout=15000)
        a.wait_for_function('events.inputs.length>0', timeout=15000)
        check(a.evaluate('net.inspect().role') == 'host', 'Invite creator must be host.')
        check(b.evaluate('net.inspect().role') == 'guest', 'Invite joiner must be guest.')
        if args.game:
            check(b.evaluate('!!solarApp.remote && Array.isArray(solarApp.remote.entities)'), 'Authoritative game state must reach the guest renderer.')
            a.evaluate("solarApp.sim.dev.warp('echo')")
            b.wait_for_function("solarApp.remote?.sector==='echo' && solarApp.remote?.state==='flight'", timeout=60000)
            check(b.evaluate("solarApp.page==='flight' && solarApp.remote.sector==='echo'"), 'Host warp must change guest gameplay and camera state.')
            b.keyboard.down('d')
            b.keyboard.down('Space')
            a.wait_for_function('events.inputs.some(i=>i.fire && i.x===1)', timeout=15000)
            check(a.evaluate('events.inputs.some(i=>i.fire && i.x===1)'), 'Real guest keyboard flight input must reach lead simulation.')
            a.wait_for_function("[...solarApp.sim.bullets.values()].some(b=>b.owner==='wing')", timeout=15000)
            check(a.evaluate("[...solarApp.sim.bullets.values()].some(b=>b.owner==='wing')"), 'Guest trigger must spawn authoritative wingmate projectiles.')
            b.keyboard.up('d')
            b.keyboard.up('Space')
        else:
            check(b.evaluate("events.states.at(-1).scene==='frontier'"), 'Authoritative state must reach guest.')
            check(a.evaluate('events.inputs.at(-1).fire && events.inputs.at(-1).x===1'), 'Guest input must reach flight lead.')
        a.evaluate('net.finish(true,1200)')
        b.wait_for_function('events.finishes.length===1')
        check(b.evaluate('events.finishes[0].won && events.finishes[0].score===1200'), 'Mission outcome must reach guest.')
        b.evaluate('net.leave()')
        a.wait_for_function('!net.inspect().connected')
        check(b.evaluate("net.inspect().role==='solo' && net.inspect().transport==='none'"), 'Leaving must restore solo mode.')
        check(a.evaluate('events.peers.at(-1)===false'), 'Disconnect must notify host.')
        for page in [a,b]: page.evaluate('if(window.timer)clearInterval(timer);net.leave()')
        browser.close()
except Exception as exc:
    failures.append(str(exc))
finally:
    server.shutdown()
for failure in failures: print('FAIL:', failure)
print(f'{checks} network checks; {len(failures)} failures')
raise SystemExit(bool(failures))
