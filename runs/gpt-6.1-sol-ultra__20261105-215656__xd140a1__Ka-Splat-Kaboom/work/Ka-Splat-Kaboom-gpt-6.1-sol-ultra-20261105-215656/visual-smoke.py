from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=swiftshader','--disable-vulkan-surface','--no-sandbox'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.goto((root.parent/(root.name+'.html')).as_uri()+'?renderer=webgl')
 page.wait_for_function('!!window.__game',timeout=60000)
 page.wait_for_timeout(1500)
 print(page.evaluate('({state:__game.state,renderer:__game.scene.renderer.info})'))
 print('ERRORS',errors)
 page.screenshot(path=str(root/'title.png'))
 page.get_by_role('button',name='Let’s make a splash').click()
 page.wait_for_timeout(6000)
 page.screenshot(path=str(root/'playing.png'))
 print('PLAY',page.evaluate('__game.state'),errors)
 b.close()
