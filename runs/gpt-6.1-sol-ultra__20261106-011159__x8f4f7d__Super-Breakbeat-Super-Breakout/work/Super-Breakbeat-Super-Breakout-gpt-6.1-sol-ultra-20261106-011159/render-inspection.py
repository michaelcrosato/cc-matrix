from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path.cwd().parent
url=(root/'Super-Breakbeat-Super-Breakout-gpt-6.1-sol-ultra-20261106-011159.html').as_uri()+'?renderer=webgl'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m: print('CONSOLE',m.type,m.text[:300]) if m.type=='error' else None)
 page.goto(url)
 try: page.wait_for_function('!!window.__game',timeout=90000)
 except: print(page.locator('#loading').inner_text());raise
 print('DIAGNOSTICS',json.dumps(page.evaluate('window.__game.diagnostics()')))
 page.screenshot(path='title-webgl.png')
 page.click('[data-action=start]')
 page.wait_for_timeout(2000)
 page.keyboard.press('Space')
 page.wait_for_timeout(3000)
 page.screenshot(path='game-webgl.png')
 print('PLAY',json.dumps(page.evaluate('window.__game.diagnostics()')))
 print('ERRORS',errors)
 browser.close()
