from playwright.sync_api import sync_playwright
from pathlib import Path
import json
root=Path(__file__).resolve().parent.parent
html=next(root.glob('*.html'))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':900},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
 page.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined})")
 page.goto(html.as_uri())
 try:page.wait_for_function('window.__game?.state().ready',timeout=90000)
 except Exception as e:print(str(e))
 print(json.dumps({'errors':errors,'state':page.evaluate('window.__game?.state()'),'loading':page.locator('#loading').inner_text()}))
 page.screenshot(path=str(Path(__file__).parent/'title.png'))
 if page.evaluate('!!window.__game'):
  page.locator('[data-action=solo]').click()
  page.evaluate('__game.tune({invincible:true,autoplay:true});__game.step(1700)')
  page.wait_for_timeout(1800)
  page.screenshot(path=str(Path(__file__).parent/'gameplay.png'))
 phone=b.new_context(**p.devices['iPhone 13'])
 mobile=phone.new_page()
 mobile.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined})")
 mobile.goto(html.as_uri())
 mobile.wait_for_function('window.__game?.state().ready')
 mobile.screenshot(path=str(Path(__file__).parent/'phone-title.png'))
 phone.close()
 b.close()
