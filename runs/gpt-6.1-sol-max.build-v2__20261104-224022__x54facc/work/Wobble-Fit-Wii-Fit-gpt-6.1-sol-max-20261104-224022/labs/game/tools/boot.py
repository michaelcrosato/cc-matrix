# @file Development boot and visual composition probe using the installed browser.
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd().parent
file=root/'Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 page=b.new_page(viewport={'width':1920,'height':1080})
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.goto(file.as_uri(),wait_until='load')
 try:page.wait_for_function("window.__engine?.ready || window.__engine?.errors?.length || document.querySelector('#msg')?.textContent.includes('could not open')",timeout=60000)
 except Exception as e:errors.append(str(e))
 print(json.dumps({'errors':errors,'state':page.evaluate('({game:window.__game,ready:window.__engine?.ready,errors:window.__engine?.errors,msg:document.querySelector("#msg")?.textContent})')},indent=2))
 page.screenshot(path='out/game/title.png')
 b.close()
