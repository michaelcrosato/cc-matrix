from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
ROOT=Path(__file__).resolve().parents[1]
PAGE=ROOT.parent/(ROOT.name+'.html')
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=FLAGS)
 page=browser.new_page(viewport={'width':960,'height':540})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda e: print('console',e.type,e.text) if e.type in ['error','warning'] else None)
 page.goto(PAGE.as_uri()+'?test=1&nodraw=1',wait_until='load')
 try:
  page.wait_for_function('window.__game && JSON.parse(__game.ui).drawn>0',timeout=90000)
  print('READY',page.evaluate('JSON.parse(__game.status)'))
  page.keyboard.press('ArrowDown');page.keyboard.press('Enter')
  page.wait_for_function('JSON.parse(__game.status).screen==="difficulty"',timeout=20000)
  page.keyboard.press('ArrowDown');page.keyboard.press('Enter')
  page.wait_for_function('JSON.parse(__game.status).screen==="dossier"',timeout=20000)
  page.keyboard.press('Enter')
  page.wait_for_function('JSON.parse(__game.status).screen==="playing"',timeout=20000)
  print('PLAYING',page.evaluate('JSON.parse(__game.status).pos'))
  page.keyboard.down('KeyW');page.wait_for_timeout(1000);page.keyboard.up('KeyW')
  print('MOVED',page.evaluate('JSON.parse(__game.status).pos'))
  page.keyboard.press('Escape');page.wait_for_function('JSON.parse(__game.status).screen==="pause"',timeout=20000)
  print('PAUSED')
  page.screenshot(path=str(ROOT/'notes/browser-smoke.png'))
 except Exception as e:
  print('ERROR',e)
  print(page.locator('body').inner_text()[:2000])
  page.screenshot(path=str(ROOT/'notes/browser-error.png'))
 print('PAGE ERRORS',errors)
 browser.close()
