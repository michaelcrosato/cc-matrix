from pathlib import Path
from playwright.sync_api import sync_playwright
import json
cases=[
 ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 ['--enable-unsafe-webgpu','--use-angle=swiftshader'],
 ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=swiftshader','--disable-vulkan-surface'],
 ['--enable-unsafe-webgpu','--use-webgpu-adapter=swiftshader'],
]
with sync_playwright() as p:
 for args in cases:
    browser=p.chromium.launch(headless=True,args=args)
    page=browser.new_page()
    logs=[]
    page.on('console',lambda m: logs.append(m.type+':'+m.text))
    page.on('pageerror',lambda m:logs.append(str(m)))
    page.goto(Path(__file__).with_name('webgpu-probe.html').resolve().as_uri())
    page.wait_for_timeout(2200)
    data=page.evaluate('''async()=>({probe:window.__probe?{frames:__probe.frames,info:__probe.renderer.info,lost:__probe.renderer._isDeviceLost}:null,adapter:await navigator.gpu.requestAdapter().then(a=>a?({vendor:a.info.vendor,architecture:a.info.architecture,description:a.info.description,isFallback:a.info.isFallbackAdapter}):null)})''')
    print(json.dumps({'flags':args,'data':data,'logs':logs}),flush=True)
    browser.close()
