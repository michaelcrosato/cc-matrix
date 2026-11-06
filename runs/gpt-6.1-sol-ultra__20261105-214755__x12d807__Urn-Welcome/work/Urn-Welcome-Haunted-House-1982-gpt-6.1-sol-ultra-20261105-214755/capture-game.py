from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.on('pageerror',lambda e: print('PAGE ERROR',e.stack))
 page.on('console',lambda m: print(m.type,m.text[:500]) if m.type in ['error','warning'] else None)
 if "--webgl" in sys.argv:page.add_init_script("Object.defineProperty(navigator,'gpu',{get:()=>undefined})")
 page.goto(Path('index.html').resolve().as_uri())
 try:page.wait_for_function('window.__URN',timeout=120000)
 except Exception as e:print(e)
 print(page.evaluate('({ready:!!window.__URN,backend:window.__URN?.backend,loading:document.querySelector("#loading")?.innerText})'))
 page.wait_for_timeout(2500)
 page.screenshot(path='title.png')
 if page.evaluate('!!window.__URN'):
  page.evaluate('__URN.start()')
  page.wait_for_timeout(2500)
  page.screenshot(path='play.png')
  print(page.evaluate('({mode:__URN.mode,fragments:__URN.state.fragments,pos:__URN.state.players[0]})'))
 b.close()
