from playwright.sync_api import sync_playwright
from pathlib import Path
import json
folder=Path(__file__).resolve().parent
html=next(folder.parent.glob('Demon-Pecking-Order*.html'))
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(html.as_uri()+'?renderer=webgl')
 page.wait_for_function('window.gameTest?.ready || window.gameBootError',timeout=60000)
 page.wait_for_timeout(1500)
 print(json.dumps({'boot':page.evaluate('window.gameBootError || null'),'state':page.evaluate('window.gameTest?.state'),'errors':errors}))
 page.screenshot(path=str(folder/'title.png'))
 if page.evaluate('!!window.gameTest'):
  page.locator('[data-action=start]').click()
  page.wait_for_timeout(4000)
  page.screenshot(path=str(folder/'game.png'))
  print(json.dumps({'play':page.evaluate('window.gameTest.state'),'errors':errors}))
 browser.close()
