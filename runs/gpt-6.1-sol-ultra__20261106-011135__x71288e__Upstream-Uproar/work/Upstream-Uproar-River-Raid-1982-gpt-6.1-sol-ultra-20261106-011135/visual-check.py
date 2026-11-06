from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.on('pageerror',lambda e: print('PAGEERROR',e))
 page.on('console',lambda m: print('CONSOLE',m.type,m.text[:400]) if m.type in ['error','warning'] else None)
 page.goto('http://127.0.0.1:40643/'+root.name+'.html?test=1&webgl=1',wait_until='networkidle',timeout=60000)
 page.wait_for_function('window.__UPROAR__?.diagnostics.ready || window.__UPROAR__?.diagnostics.errors.length',timeout=60000)
 print(json.dumps(page.evaluate('window.__UPROAR__.diagnostics'),indent=2))
 page.screenshot(path=str(root/'title.png'))
 if page.evaluate('window.__UPROAR__.diagnostics.ready'):
  page.get_by_role('button',name='Fly the river').click()
  page.wait_for_timeout(1500)
  print(json.dumps(page.evaluate('window.__UPROAR__.snapshot()'),indent=2))
  page.screenshot(path=str(root/'flight.png'))
 b.close()
