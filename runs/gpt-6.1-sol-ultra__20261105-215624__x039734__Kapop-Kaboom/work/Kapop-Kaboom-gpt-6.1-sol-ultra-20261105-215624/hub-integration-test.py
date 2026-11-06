"""Run AI Hub's exact browser harness scenarios against the packaged Kapop HTML.
Print failures and a single count. Own server binds an OS-assigned loopback port.
"""
import functools
import http.server
import json
from pathlib import Path
import sys
import threading
import traceback
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

folder=Path(__file__).resolve().parent
slug=folder.name
root=folder.parent
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
failures=[]
count=0
records=[]
scenarios=[('standard-2',{'players':2}),('stress-4',{'players':4,'latency':150,'jitter':50,'loss':5}),('host-leave-4',{'players':4,'latency':150,'jitter':50,'loss':5,'scenario':'host-leave'}),('server-2',{'players':2,'scenario':'server'})]
if '--standalone-only' in sys.argv:
    scenarios=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
        # Exercise the actual packaged UI and simulation through a real two-page room.
        context=browser.new_context(viewport={'width':1440,'height':900})
        host=context.new_page()
        guest=context.new_page()
        errors=[]
        for page in (host,guest):
            page.on('pageerror',lambda error:errors.append(str(error)))
        try:
            game_url=f'http://127.0.0.1:{server.server_port}/{slug}.html'
            for page in (host,guest):
                page.goto(game_url)
                page.wait_for_function('window.__kapop?.ready===true',timeout=60000)
                assert page.title()=='Kapop — Bucket Brigade'
            host.locator('[data-action="together"]').click()
            host.locator('[data-action="host"]').click()
            host.wait_for_function('window.__kapop.network.roomCode.length===6',timeout=30000)
            code=host.evaluate('__kapop.network.roomCode')
            guest.locator('[data-action="together"]').click()
            guest.locator('[data-action="joinform"]').click()
            guest.locator('#roomCode').fill(code)
            guest.locator('[data-action="join"]').click()
            for page in (host,guest):
                page.wait_for_function('__kapop.network.connected && __kapop.network.players.length===2',timeout=30000)
            count+=1
            host.locator('[data-action="netstart"]').click()
            for page in (host,guest):
                page.wait_for_function('__kapop.network.started && __kapop.sim.players.length===2')
                assert page.evaluate('__kapop.sim.players.map(p=>p.id)')==[0,1]
                page.wait_for_function('__kapop.network.canPlay',timeout=7000)
            count+=1
            host_target=host.evaluate('__kapop.sim.players[0].target')
            guest.keyboard.down('ArrowRight')
            host.wait_for_function('__kapop.sim.players[1].target>3',timeout=8000)
            guest.keyboard.up('ArrowRight')
            assert abs(host.evaluate('__kapop.sim.players[0].target')-host_target)<0.001, 'Guest moved host bucket target'
            count+=1
            guest.evaluate('__kapop.input(5,1)')
            host.wait_for_function('Math.abs(__kapop.sim.players[1].target-5)<.001',timeout=8000)
            guest.wait_for_function('Math.abs(__kapop.snapshot().players[1].x-5)<.15',timeout=8000)
            count+=1
            before=host.evaluate('__kapop.sim.stats.caught')
            host.evaluate("""()=>{const s=__kapop.sim;s.intro=0;s.spawnTimer=999;s.clearBombs();s.spawn('normal',5,s.catchY()+.65);}""")
            host.wait_for_function('(before)=>__kapop.sim.stats.caught>before',arg=before,timeout=8000)
            guest.wait_for_function('(before)=>__kapop.snapshot().stats.caught>before',arg=before,timeout=8000)
            count+=1
            before=host.evaluate('__kapop.sim.stats.pops')
            host.evaluate("""()=>{const s=__kapop.sim;s.charge=1;s.intro=0;s.spawn('normal',5,4.8);}""")
            guest.keyboard.press('Space')
            host.wait_for_function('(before)=>__kapop.sim.stats.pops>before',arg=before,timeout=8000)
            guest.wait_for_function('(before)=>__kapop.snapshot().stats.pops>before',arg=before,timeout=8000)
            count+=1
            host.evaluate('for(let i=0;i<5;i++)__kapop.sim.skip()')
            expected=host.evaluate('__kapop.snapshot()')
            guest.wait_for_function('__kapop.network.ended && __kapop.snapshot().phase==="victory"',timeout=8000)
            actual=guest.evaluate('__kapop.snapshot()')
            assert actual['score']==expected['score'],(actual['score'],expected['score'])
            assert actual['stats']==expected['stats'],(actual['stats'],expected['stats'])
            count+=1
            host.wait_for_function('__kapop.screen==="result"',timeout=5000)
            host.locator('[data-action="retry"]').click()
            for page in (host,guest):
                page.wait_for_function('__kapop.network.started && !__kapop.network.ended && __kapop.snapshot().wave===1 && __kapop.snapshot().score===0',timeout=8000)
                assert page.evaluate('__kapop.screen') is None
            count+=1
            guest.evaluate('__kapop.network.disconnect()')
            host.wait_for_function('!__kapop.network.connected',timeout=8000)
            assert not errors,errors
            count+=1
            records.append({'name':'packaged-standalone','passed':True,'checks':9})
        except Exception as error:
            detail=traceback.format_exc()
            failures.append('packaged-standalone: '+(str(error) or type(error).__name__))
            states=[]
            for page in (host,guest):
                try: states.append(page.evaluate('({state:__kapop.snapshot(),network:__kapop.network.inspect(),screen:__kapop.screen})'))
                except Exception: states.append(None)
            records.append({'name':'packaged-standalone','error':detail,'errors':errors,'states':states})
        finally:
            context.close()
        for name,settings in scenarios:
            context=browser.new_context(viewport={'width':1600,'height':1000})
            page=context.new_page()
            params={'game':'../../'+slug+'.html','auto':1,**settings}
            url=f'http://127.0.0.1:{server.server_port}/{slug}/hub/harness.html?'+urlencode(params)
            try:
                page.goto(url)
                assert page.title()=='AI Hub Session Harness'
                page.wait_for_function("document.body.dataset.complete==='true'",timeout=180000)
                report=page.evaluate('window.__hubCheck')
                records.append({'name':name,'report':report})
                for check in report.get('checks',[]):
                    if check.get('pass'): count+=1
                    else: failures.append(name+': '+check.get('name','check')+' '+str(check.get('detail','')))
                if not report.get('pass') and not any(not c.get('pass') for c in report.get('checks',[])):
                    failures.append(name+': harness did not pass')
            except Exception as error:
                failures.append(name+': '+str(error))
                records.append({'name':name,'error':str(error),'log':page.locator('#log').text_content()})
            context.close()
        browser.close()
except Exception as error:
    failures.append(str(error))
finally:
    server.shutdown()
    server.server_close()
(folder/('standalone-game-results.json' if '--standalone-only' in sys.argv else 'hub-test-results.json')).write_text(json.dumps({'passed':count,'failures':failures,'scenarios':records},indent=2))
for failure in failures: print('FAIL AI Hub '+failure)
print(f'{count} multiplayer integration checks passed; {len(failures)} failed')
sys.exit(1 if failures else 0)
