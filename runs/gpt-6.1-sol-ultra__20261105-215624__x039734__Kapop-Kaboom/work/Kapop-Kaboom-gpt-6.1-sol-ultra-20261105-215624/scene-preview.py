from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).parent
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--allow-file-access-from-files'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto((p/'scene-preview.html').resolve().as_uri()+'?webgl')
 page.wait_for_timeout(10000)
 print(errors)
 print(page.evaluate('window.preview?.inspect()'))
 page.screenshot(path=str(p/'scene-preview.png'))
 b.close()
