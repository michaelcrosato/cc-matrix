from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(Path('index.html').resolve().as_uri(),wait_until='load')
 try:page.wait_for_function('window.__coast?.ready || window.__coastError',timeout=90000)
 except:pass
 page.wait_for_timeout(1000)
 print(json.dumps({'errors':errors,'boot':page.locator('#boot-status').inner_text(),'state':page.evaluate('window.__coast?.rendererInfo()'),'fatal':page.evaluate('window.__coastError||null')}))
 page.screenshot(path='title.png')
 if page.evaluate('!!window.__coast'):
  page.keyboard.press('Enter');page.wait_for_timeout(700);page.screenshot(path='brief.png')
 b.close()
