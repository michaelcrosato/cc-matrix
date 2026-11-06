from playwright.sync_api import sync_playwright
import json
from pathlib import Path
p=Path(__file__).parent
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 page.on('pageerror',lambda e:print('PAGEERROR',str(e)))
 page.on('console',lambda m:print('CONSOLE',m.type,m.text) if m.type=='error' else None)
 page.goto('http://127.0.0.1:38191/River-Razzle-River-Raid-gpt-6.1-sol-ultra-20261105-222441.html')
 try:page.wait_for_function('window.__RAZZLE__?.state.ready',timeout=90000)
 except Exception as e:print('WAIT',str(e));print(page.locator('#loadText').inner_text())
 print(json.dumps(page.evaluate('window.__RAZZLE__?.state'),default=str)[:3000])
 page.screenshot(path=str(p/'title-webgl.png'))
 if page.evaluate('!!window.__RAZZLE__'):
  page.get_by_role('button',name='FLY SOLO').click()
  page.wait_for_timeout(1500)
  print('PLAY',page.evaluate('({mode:__RAZZLE__.state.mode,distance:__RAZZLE__.state.distance,entities:__RAZZLE__.state.entities.length})'))
  page.screenshot(path=str(p/'playing-webgl.png'))
 b.close()
