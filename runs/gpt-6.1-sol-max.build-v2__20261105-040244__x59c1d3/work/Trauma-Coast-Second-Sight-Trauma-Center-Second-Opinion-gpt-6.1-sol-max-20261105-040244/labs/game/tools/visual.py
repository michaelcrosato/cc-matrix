# A real WebGPU browser boot and a small set of visual checks, saved under the game's own out directory.
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path.cwd();ident=json.loads((root/'identity.json').read_text());url=(root.parent/(ident['base']+'.html')).as_uri()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto(url);page.wait_for_timeout(1500)
 try:page.wait_for_function('!!window.__surgery',timeout=90000 if not errors else 500)
 except Exception:pass
 print(json.dumps({'errors':errors,'text':page.locator('body').inner_text()[:1200],'state':page.evaluate('({gpu:!!navigator.gpu,game:!!window.__surgery,engine:!!window.__engine,errors:window.__engine?.errors})')}))
 page.mouse.move(30,30)
 if page.evaluate('!!window.__surgery'):page.evaluate('window.__surgery.exitDemo()')
 page.screenshot(path=str(root/'out/visual/title.png'),timeout=60000)
 if page.evaluate('!!window.__surgery'):
  page.evaluate("window.__surgery.case('first-cut')")
  page.wait_for_function("window.__surgery.state?.caseId==='first-cut' && window.__surgery.meshes.sheet>0 && window.__engine.ready", timeout=90000)
  print(json.dumps({'meshes':page.evaluate('window.__surgery.meshes'),'state':page.evaluate('({status:window.__surgery.state?.status,errors:window.__engine?.errors})')}))
  page.screenshot(path=str(root/'out/visual/field.png'))
 browser.close()
