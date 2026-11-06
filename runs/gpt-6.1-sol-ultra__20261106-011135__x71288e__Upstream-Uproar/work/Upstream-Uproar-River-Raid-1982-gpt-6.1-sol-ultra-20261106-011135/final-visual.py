from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parent
url='http://127.0.0.1:40643/'+root.name+'.html?test=1&webgl=1'
errors=[]
shots=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
    context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1)
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='networkidle',timeout=60000)
    page.wait_for_function('window.__UPROAR__?.diagnostics.ready || window.__UPROAR__?.diagnostics.errors.length',timeout=60000)
    if page.title()!='Upstream Uproar — Low flight. High mischief.':raise RuntimeError('Unexpected page at server URL')
    if not page.evaluate('window.__UPROAR__.diagnostics.ready'):raise RuntimeError(page.evaluate('window.__UPROAR__.diagnostics.errors'))
    page.screenshot(path=str(root/'final-title.png'));shots.append('final-title.png')
    page.evaluate('window.__UPROAR__.warp(1100);window.__UPROAR__.god(true);window.__UPROAR__.autopilot(true);window.__UPROAR__.step(.5)')
    page.wait_for_timeout(400)
    page.screenshot(path=str(root/'final-canyon.png'));shots.append('final-canyon.png')
    page.evaluate('window.__UPROAR__.warp(2388);window.__UPROAR__.god(true);window.__UPROAR__.autopilot(true);window.__UPROAR__.step(.3)')
    page.wait_for_timeout(400)
    page.screenshot(path=str(root/'final-boss.png'));shots.append('final-boss.png')
    errors.extend(page.evaluate('window.__UPROAR__.diagnostics.errors'))
    context.close()
    mobile=browser.new_context(**p.devices['Pixel 7'])
    page=mobile.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='networkidle',timeout=60000)
    page.wait_for_function('window.__UPROAR__?.diagnostics.ready',timeout=60000)
    page.screenshot(path=str(root/'final-mobile-title.png'));shots.append('final-mobile-title.png')
    page.evaluate('window.__UPROAR__.warp(1100);window.__UPROAR__.god(true);window.__UPROAR__.autopilot(true);window.__UPROAR__.step(.5)')
    page.wait_for_timeout(400)
    page.screenshot(path=str(root/'final-mobile.png'));shots.append('final-mobile.png')
    errors.extend(page.evaluate('window.__UPROAR__.diagnostics.errors'))
    mobile.close();browser.close()
for e in sorted(set(errors)):print('FAIL',e)
(root/'final-visual-results.json').write_text(json.dumps({'screenshots':shots,'errors':errors},indent=2))
print(str(len(shots))+' visual captures; '+str(len(errors))+' uncaught errors.')
