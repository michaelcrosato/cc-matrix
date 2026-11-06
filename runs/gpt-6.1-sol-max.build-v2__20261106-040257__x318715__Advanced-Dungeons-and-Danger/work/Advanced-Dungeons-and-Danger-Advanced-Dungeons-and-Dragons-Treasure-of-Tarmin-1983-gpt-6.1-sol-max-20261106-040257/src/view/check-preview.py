from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1600,'height':900})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(Path('src/view/preview.html').resolve().as_uri()+'?backend=webgl')
 try:page.wait_for_function('window.preview?.view?.ready',timeout=30000)
 except Exception as e:print('FAILED boot',str(e))
 page.wait_for_timeout(1600)
 print(json.dumps({'errors':errors,'snapshot':page.evaluate('window.preview?.view.snapshot()'),'gameErrors':page.evaluate('window.preview?.game.errors'),'bodyError':page.locator('body').get_attribute('data-error')},default=str))
 page.screenshot(path='evidence/title-native.png')
 if not errors:
  print(json.dumps(page.evaluate('preview.audio.offlineProbe()')))
 b.close()
