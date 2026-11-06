"""AI Hub conformance + two-page browser room tests. Prints failures and one count.
Run with installed Playwright Python; optional base URL argv1, default existing root server.
"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1].rstrip('/') if len(sys.argv)>1 else 'http://127.0.0.1:38191'
NAME = 'River-Razzle-River-Raid-gpt-6.1-sol-ultra-20261105-222441'
GAME = NAME + '.html'
count = failures = 0

def check(name, value, detail=''):
    global count,failures
    count += 1
    if not value:
        failures += 1
        print('FAIL '+name+(': '+detail if detail else ''))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
    try:
        page=browser.new_page(viewport={'width':1280,'height':800})
        page.goto(BASE+'/'+GAME)
        check('server serves River Razzle',page.title().startswith('River Razzle'),page.title())
        page.wait_for_function('window.__RAZZLE__?.state.ready',timeout=120000)
        check('standalone ready',page.evaluate('window.__RAZZLE__.state.ready'))
        page.close()
        for scenario in ['normal','server','host-leave']:
            page=browser.new_page(viewport={'width':1280,'height':800})
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            url=BASE+'/'+NAME+'/harness.html?game=../'+GAME+'&players=2&auto=1&limit=18'
            if scenario!='normal': url+='&scenario='+scenario
            page.goto(url)
            try:
                page.wait_for_function('document.body.dataset.complete === "true"',timeout=150000)
                report=page.evaluate('window.__hubCheck')
                for item in report.get('checks',[]):
                    check('hub '+scenario+': '+item['name'],item['pass'],item.get('detail',''))
                check('hub '+scenario+' overall',report.get('pass'),json.dumps(report.get('log',[]))[-1500:])
            except Exception as e:
                check('hub '+scenario+' completes',False,str(e)+' '+page.locator('body').inner_text()[-2000:])
            check('hub '+scenario+' parent errors',not errors,'; '.join(errors))
            page.close()
        context=browser.new_context(viewport={'width':1280,'height':800})
        host=context.new_page();guest=context.new_page()
        errors=[]
        for page in [host,guest]:
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(BASE+'/'+GAME)
            page.wait_for_function('window.__RAZZLE__?.state.ready',timeout=120000)
        host.locator('[data-action=coop]').click()
        host.locator('[data-action=create]').click()
        code=host.locator('#roomCode').inner_text().strip()
        guest.locator('[data-action=coop]').click()
        guest.locator('#joinCode').fill(code)
        guest.locator('[data-action=join]').click()
        guest.wait_for_function('window.__RAZZLE__.net.players.length===2',timeout=10000)
        check('browser tab room joins',guest.evaluate('window.__RAZZLE__.net.players.length===2'))
        check('browser host sees two pilots',host.evaluate('window.__RAZZLE__.net.players.length===2'))
        check('browser launch button visible',host.locator('[data-action=roomstart]').is_visible())
        host.locator('[data-action=roomstart]').click()
        host.wait_for_function('window.__RAZZLE__.state.net.sent>2',timeout=20000)
        guest.wait_for_function('window.__RAZZLE__.state.net.received>2',timeout=20000)
        check('browser host simulation advances',host.evaluate('window.__RAZZLE__.state.distance>0'))
        check('browser guest state advances',guest.evaluate('window.__RAZZLE__.state.distance>0'))
        check('browser guest sends input',guest.evaluate('window.__RAZZLE__.state.net.sent>0'))
        check('browser host receives input',host.evaluate('window.__RAZZLE__.state.net.received>0'))
        guest.evaluate('window.__RAZZLE__.net.leaveRoom()')
        host.wait_for_function('window.__RAZZLE__.net.players.length===1',timeout=10000)
        check('browser guest departure detected',host.evaluate('window.__RAZZLE__.net.players.length===1'))
        check('browser host removes departed plane',host.evaluate('window.__RAZZLE__.state.players.length===1'))
        check('browser tab page errors',not errors,'; '.join(errors))
        context.close()
    except Exception as e:
        check('network browser test completed',False,str(e))
    finally:
        browser.close()
print(f'{count} browser network checks, {failures} failures')
sys.exit(1 if failures else 0)
