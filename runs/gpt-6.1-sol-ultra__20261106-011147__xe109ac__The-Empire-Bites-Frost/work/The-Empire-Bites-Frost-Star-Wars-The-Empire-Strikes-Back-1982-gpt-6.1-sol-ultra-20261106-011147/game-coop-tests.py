"""Exercise authoritative gameplay across two copies of the finished HTML."""
import json
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent / (ROOT.name + '.html')
checks = []

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def check(name, fn):
    try:
        fn()
        checks.append({'name': name, 'passed': True, 'detail': ''})
    except Exception as error:
        checks.append({'name': name, 'passed': False, 'detail': str(error)})
        print(f'FAIL {name}: {error}')

server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT.parent)))
thread = threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
        context = browser.new_context(viewport={'width':640,'height':400},ignore_https_errors=True)
        a,b = context.new_page(),context.new_page()
        errors=[]
        for page in [a,b]:
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_address[1]}/{GAME.name}',wait_until='domcontentloaded')
            page.wait_for_function('window.__game?.ready===true',timeout=90000)
            assert 'The Empire Bites Frost' in page.title(), 'loaded another game'
        neutral={'x':0,'y':0,'aimX':1,'aimY':0,'fire':False,'boost':False,'force':False}
        def state(page):
            return page.evaluate('__game.inspect()')
        def controls(page,**changes):
            page.evaluate('(input)=>__game.setInput(input)',{**neutral,**changes})
        def step_pair(seconds=.2):
            b.evaluate('__game.step(1/60)')
            b.wait_for_timeout(85)
            b.evaluate('__game.step(1/60)')
            a.wait_for_timeout(25)
            a.evaluate('(seconds)=>__game.step(seconds)',seconds)
            a.wait_for_timeout(85)
            b.evaluate('__game.step(1/60)')
        def until(fn,seconds=8):
            deadline=time.monotonic()+seconds
            while time.monotonic()<deadline:
                if fn():
                    return
                step_pair(.15)
            assert fn(),'gameplay state did not converge'
        def connect():
            a.evaluate("__game.network.host('GAME-COOP-TEST')")
            b.evaluate("__game.network.join('GAME-COOP-TEST')")
            a.wait_for_function('__game.network.connected',timeout=10000)
            b.wait_for_function('__game.network.connected',timeout=10000)
            a.evaluate('__game.network.start()')
            b.wait_for_function('__game.inspect().mode==="play"',timeout=10000)
            controls(a);controls(b)
            a.evaluate('__game.dev.set("invulnerable",true)')
            assert len(state(a)['players'])==2 and len(state(b)['players'])==2
            assert state(a)['net']['isHost'] and not state(b)['net']['isHost']
        check('actual co-op: host starts two gameplay copies',connect)
        def guest_controls():
            before=state(a)['players']
            controls(b,x=1)
            until(lambda:state(a)['players'][1]['x']>before[1]['x']+8)
            after=state(a)['players']
            assert abs(after[0]['x']-before[0]['x'])<1,'guest controls moved the host craft'
            until(lambda:abs(state(b)['players'][1]['x']-state(a)['players'][1]['x'])<5)
            controls(b)
        check('actual co-op: guest controls move only player two and snapshots follow',guest_controls)
        def world_sync():
            a.evaluate('__game.dev.set("base",77);__game.dev.set("health",42)')
            until(lambda:state(b)['base']==77 and state(b)['players'][0]['health']==42)
            a.evaluate('__game.dev.killAll()')
            step_pair(.1)
            until(lambda:state(b)['score']==state(a)['score'] and state(b)['evacuated']==1)
            assert state(b)['score']>0
        check('actual co-op: generator, shield, score and evacuation snapshots agree',world_sync)
        def guest_pause():
            b.evaluate('__game.pause()')
            controls(b,x=1)
            step_pair(.6)
            start=state(a)
            step_pair(.8)
            end=state(a)
            assert end['elapsed']>start['elapsed']+.7,'guest pause stopped authority'
            assert abs(end['players'][1]['x']-start['players'][1]['x'])<2,'paused guest kept sending movement'
            assert state(b)['mode']=='paused'
            b.evaluate('__game.resume()')
            controls(b)
        check('actual co-op: guest pause sends neutral controls while world continues',guest_pause)
        def host_pause():
            until(lambda:state(a)['stage']=='combat' and state(a)['wave']==2)
            a.evaluate('__game.pause()')
            start=state(a)
            controls(b,x=-1)
            step_pair(.9)
            end=state(a)
            assert end['elapsed']>start['elapsed']+.8,'host pause stopped authority'
            assert end['players'][1]['x']<start['players'][1]['x']-8,f'host pause stopped guest controls: start={json.dumps(start)} end={json.dumps(end)}'
            assert end['mode']=='paused'
            a.evaluate('__game.resume()')
            controls(b)
        check('actual co-op: host pause keeps authoritative simulation and guest input running',host_pause)
        def final_result():
            a.evaluate('__game.dev.spawnWave(3);__game.dev.killAll();__game.step(.1)')
            until(lambda:state(b)['mode']=='result')
            host,guest=state(a),state(b)
            assert host['evacuated']==guest['evacuated']==3,'final evacuation was missing from guest result'
            assert host['score']==guest['score'],'final score was stale on guest'
            assert host['base']==guest['base'],'final generator state disagreed'
            shots=host['stats']['shots']
            controls(a,fire=True);controls(b,fire=True)
            step_pair(.5)
            assert state(a)['stats']['shots']==shots,'shots continued after the round ended'
        check('actual co-op: forced final snapshot carries complete winning state and stops play',final_result)
        def restart():
            a.evaluate('__game.network.restart()')
            until(lambda:state(b)['mode']=='play' and state(b)['score']==0)
            for page in [a,b]:
                s=state(page)
                assert s['wave']==1 and s['evacuated']==0 and s['base']==100 and len(s['players'])==2
                assert not s['net']['ended']
        check('actual co-op: host restart resets both copies after a completed round',restart)
        def clean():
            assert not errors,' / '.join(errors)
            assert not state(a)['errors'] and not state(b)['errors']
        check('actual co-op: no browser or game errors',clean)
        for page in [a,b]:
            page.evaluate('__game.network.close()')
        browser.close()
except Exception as error:
    checks.append({'name':'actual co-op: setup','passed':False,'detail':str(error)})
    print(f'FAIL actual co-op setup: {error}')
finally:
    server.shutdown()
    server.server_close()
passed=sum(c['passed'] for c in checks)
failed=sum(not c['passed'] for c in checks)
(ROOT/'game-coop-test-results.json').write_text(json.dumps({'checks':checks,'passed':passed,'failed':failed},indent=2))
print(f'{passed} gameplay co-op tests passed; {failed} failed')
raise SystemExit(0 if failed==0 else 1)
