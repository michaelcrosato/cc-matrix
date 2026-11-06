"""Native WebGPU state checks, plus WebGL screenshots for headless compositors."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).parent
projected_bounds="""()=>{const points=[[-15.4,-10.9],[-15.4,10.9],[15.4,-10.9],[15.4,10.9]].map(([x,z])=>new test.THREE.Vector3(x,.05,z).project(test.scene.camera));return {left:Math.min(...points.map(p=>(p.x+1)/2)),right:Math.max(...points.map(p=>(p.x+1)/2)),top:Math.min(...points.map(p=>(1-p.y)/2)),bottom:Math.max(...points.map(p=>(1-p.y)/2))};}"""
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
failures=[]
checks=0
def check(condition,message):
    global checks
    checks+=1
    if not condition: failures.append(message)
with sync_playwright() as p:
    for backend in ('webgpu','webgl'):
        args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader']
        if backend=='webgpu': args+=['--use-angle=vulkan','--disable-vulkan-surface']
        browser=p.chromium.launch(headless=True,args=args)
        page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        try:
            suffix='?renderer=webgl' if backend=='webgl' else ''
            page.goto(f'http://127.0.0.1:{server.server_port}/scene-test.html{suffix}')
            page.wait_for_function('window.ready',timeout=90000)
            page.wait_for_timeout(1500)
            expected='WebGPU' if backend=='webgpu' else 'WebGL 2 fallback'
            check(page.evaluate('test.scene.stats().backend')==expected,f'{backend}: native backend mismatch')
            check(page.evaluate('test.scene.stats().cars')==4,f'{backend}: both players and enemies missing')
            check(page.evaluate('test.scene.stats().dots')==80,f'{backend}: flower pickups missing')
            check(page.evaluate('test.scene.stats().nativeAnimations')==5,f'{backend}: native animation mixers missing')
            check(page.evaluate('test.scene.renderer.info.render.drawCalls')>100,f'{backend}: geometry did not render')
            for lane in range(4):
                actual=page.evaluate('''lane=>{const p=test.trackPoint(0,lane);const v=new test.THREE.Vector3(p.x,.15,p.z).project(test.scene.camera);return test.scene.pickLane((v.x+1)*innerWidth/2,(-v.y+1)*innerHeight/2)}''',lane)
                check(actual==lane,f'{backend}: mouse lane picking failed for lane {lane}: {actual}')
            bounds=page.evaluate(projected_bounds)
            check(bounds['top']>.11 and bounds['bottom']<.89,f'{backend}: board overlaps gameplay HUD margins: {bounds}')
            if backend=='webgl':page.screenshot(path=str(root/'scene-gameplay.png'))
            else:(root/'webgpu-diagnostics.json').write_text(json.dumps(page.evaluate('({stats:test.scene.stats(),info:test.scene.renderer.info.render})'),indent=2))
            page.evaluate("test.game.state.mode='title';test.scene.update(test.game.state,.05);test.scene.resize()")
            bounds=page.evaluate(projected_bounds)
            check(bounds['left']>.39 and bounds['right']<.995,f'{backend}: board overlaps title copy: {bounds}')
            if backend=='webgl':
                page.screenshot(path=str(root/'scene-title.png'))
                page.set_viewport_size({'width':390,'height':844})
                page.wait_for_timeout(400)
                bounds=page.evaluate(projected_bounds)
                check(bounds['top']>.065 and bounds['bottom']<.36,f'{backend}: portrait board overlaps title copy: {bounds}')
                page.screenshot(path=str(root/'scene-phone-title.png'))
            check(not errors,f'{backend}: Browser errors: '+' | '.join(errors))
        except Exception as e:
            check(False,f'{backend}: {e}')
        finally:
            browser.close()
server.shutdown()
for f in failures:print('FAIL:',f)
print(f'{checks-len(failures)}/{checks} scene checks passed')
raise SystemExit(bool(failures))
