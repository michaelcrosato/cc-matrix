# Acceptance checks for unsupported WebGPU browsers and responsive phone/tablet/TV presentation.
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd()
identity=json.loads((root/'identity.json').read_text())
url=(root.parent/(identity['base']+'.html')).as_uri()
out=root/'out'/'viewports';out.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,ok,detail=''):
    item={'name':name,'ok':bool(ok),'detail':str(detail)};checks.append(item);print(json.dumps(item),flush=True)
with sync_playwright() as p:
    for name,engine,device in [('Firefox',p.firefox,None),('WebKit phone',p.webkit,p.devices['iPhone 13']),('WebKit tablet',p.webkit,p.devices['iPad Pro 11'])]:
        browser=None
        try:
            browser=engine.launch(headless=True)
            context=browser.new_context(**(device or {'viewport':{'width':1440,'height':900}}))
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url);page.locator('#compatibility').wait_for(timeout=20000)
            check(name+' WebGPU explanation','needs a browser with WebGPU' in page.locator('#compatibility').inner_text())
            if device:check(name+' hardware requirement','Controller or keyboard required' in page.locator('#compatibility').inner_text())
            page.locator('#compat-settings').click();check(name+' fallback settings',page.locator('#compatibility h1').inner_text()=='Settings')
            check(name+' has no import crash',len(errors)==0,' | '.join(errors))
            page.screenshot(path=str(out/(name.lower().replace(' ','-')+'.png')))
        except Exception as error:check(name+' fallback',False,error)
        finally:
            if browser:browser.close()
    browser=None
    try:
        browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'])
        context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1)
        page=context.new_page();page.goto(url);page.wait_for_function('!!window.__surgery && window.__engine.ready',timeout=90000)
        for name,width,height in [('small-phone',320,568),('phone',390,844),('foldable',673,841),('tablet',768,1024),('tablet-landscape',1024,768),('television',1920,1080),('wide',2560,1080),('ultrawide',3440,1440)]:
            page.set_viewport_size({'width':width,'height':height});page.mouse.move(2,2);page.wait_for_timeout(150)
            if width<700:page.evaluate("window.__surgery.ui.open('settings')")
            else:page.evaluate("window.__surgery.director.go('title','title')")
            page.wait_for_timeout(150)
            overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
            check(name+' horizontal layout',not overflow)
            if name in ['small-phone','tablet','television','ultrawide']:page.screenshot(path=str(out/(name+'.png')),timeout=60000)
        check('packaged module is GPU guarded', 'if(!globalThis.__unsupported)' in (root.parent/(identity['base']+'.html')).read_text())
    except Exception as error:check('viewport presentation',False,error)
    finally:
        if browser:browser.close()
(root/'out'/'viewports'/'results.json').write_text(json.dumps(checks,indent=2)+'\n')
raise SystemExit(1 if any(not c['ok'] for c in checks) else 0)
