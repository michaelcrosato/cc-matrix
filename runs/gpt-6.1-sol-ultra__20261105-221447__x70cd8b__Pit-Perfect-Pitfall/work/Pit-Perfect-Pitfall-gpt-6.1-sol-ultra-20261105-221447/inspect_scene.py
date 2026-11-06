from playwright.sync_api import sync_playwright
import json
from pathlib import Path
url='http://127.0.0.1:44619/Pit-Perfect-Pitfall-gpt-6.1-sol-ultra-20261105-221447.html?webgl'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m: print(m.type,m.text[:300]) if m.type=='error' else None)
 page.goto(url,wait_until='domcontentloaded')
 try: page.wait_for_function('window.__game?.ready || window.__gameError',timeout=120000)
 except Exception as e: print('WAIT',str(e)[:200])
 print('TITLE',page.title())
 print('ERRORS',errors)
 print('STATE',page.evaluate('window.__game?.state || window.__gameError || document.getElementById("load-status").innerText'))
 page.wait_for_timeout(2500)
 page.screenshot(path='title.png')
 if page.evaluate('!!window.__game'):
  page.evaluate('window.__game.setManual(true);window.__game.start();window.__game.step(30)')
  page.wait_for_timeout(1000)
  print('START',page.evaluate('window.__game.state'))
  page.screenshot(path='gameplay.png')
 browser.close()
