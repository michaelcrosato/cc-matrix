from playwright.sync_api import sync_playwright
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
 page=b.new_page(viewport={'width':1440,'height':900},ignore_https_errors=True)
 page.on('pageerror',lambda e: print('ERROR',str(e)))
 page.on('console',lambda m: print('CONSOLE',m.type,m.text[:600]) if m.type in ['error','warning'] else None)
 page.goto('http://127.0.0.1:38449/game.html')
 print('TITLE',page.title())
 try:page.wait_for_function('window.__stellar || window.__bootError',timeout=90000)
 except Exception as e:print('TIMEOUT',str(e))
 print('STATE',page.evaluate('window.__stellar?.state() || window.__bootError'))
 if page.evaluate('!!window.__stellar'):
  page.click('[data-action=start]');page.wait_for_timeout(3000)
  print('FLIGHT',page.evaluate('window.__stellar.state()'))
  page.screenshot(path='smoke-flight.png')
 b.close()
