import json
from pathlib import Path
from playwright.sync_api import sync_playwright
port=json.loads(Path('server.json').read_text())['port']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox','--disable-gpu-watchdog'])
 page=browser.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
 response=page.goto(f'http://127.0.0.1:{port}/index.html?test=1&renderer=webgl',wait_until='domcontentloaded')
 try:page.wait_for_selector('body[data-ready=true]',timeout=90000)
 except Exception as e:errors.append(str(e));print(page.locator('#load-msg').inner_text())
 print(json.dumps({'title':page.title(),'status':response.status,'errors':errors,'state':page.evaluate('window.FlipBros?{backend:FlipBros.backend,ui:__test.ui(),state:FlipBros.state()}:null')},ensure_ascii=False)[:6500])
 page.screenshot(path='title-webgl.png')
 if page.evaluate('!!window.__test'):
  page.evaluate('__test.freeze();__test.start();__test.advance(120);')
  page.screenshot(path='game-webgl.png')
  print(json.dumps(page.evaluate('FlipBros.state()'))[:2000])
 browser.close()
