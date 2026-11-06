from playwright.sync_api import sync_playwright
from pathlib import Path
import json,urllib.parse
root=Path(__file__).resolve().parent
info=json.loads((root/'build-info.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-webgpu-adapter=swiftshader','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1600,'height':900})
 page.on('pageerror',lambda e:print('ERROR',str(e)))
 page.on('console',lambda m:print('CONSOLE',m.type,m.text[:400]) if m.type in ['error','warning'] else None)
 page.goto('http://127.0.0.1:40835/'+urllib.parse.quote(info['stem']+'.html'))
 try:page.wait_for_function('window.__game?.getState().ready || window.__bootError',timeout=90000)
 except Exception as e:print(e)
 page.wait_for_timeout(2000)
 print(page.evaluate('window.__bootError || window.__game?.getState()'))
 page.screenshot(path=str(root/'title.png'))
 page.evaluate("window.__game.action('start')")
 page.wait_for_timeout(1000)
 print(page.evaluate('window.__game.getState()'))
 page.screenshot(path=str(root/'playing.png'))
 browser.close()
