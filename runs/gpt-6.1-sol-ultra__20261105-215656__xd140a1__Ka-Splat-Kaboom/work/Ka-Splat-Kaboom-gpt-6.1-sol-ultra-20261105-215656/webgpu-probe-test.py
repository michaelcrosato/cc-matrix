from pathlib import Path
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
    for case in ['', '?toon=1', '?noFeatures=1', '?noAA=1','?toon=1&noFeatures=1']:
        page=browser.new_page()
        logs=[]
        page.on('console',lambda m: logs.append(m.type+':'+m.text))
        page.on('pageerror',lambda m:logs.append(str(m)))
        page.goto(Path(__file__).with_name('webgpu-probe.html').resolve().as_uri()+case)
        page.wait_for_timeout(3000)
        print(json.dumps({'case':case,'data':page.evaluate('()=>({frames:__probe.frames,info:__probe.renderer.info,lost:__probe.renderer._isDeviceLost})'),'logs':logs}))
        page.close()
    browser.close()
