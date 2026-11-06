from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900})
 page.goto('http://127.0.0.1:40643/'+root.name+'.html?test=1',wait_until='domcontentloaded')
 page.wait_for_function('window.__UPROAR__?.diagnostics.ready')
 page.evaluate('window.__UPROAR__.start({})');page.keyboard.press('Escape')
 for name in ['Developer tools','Back','About / credits']:
  page.get_by_role('button',name=name,exact=False).click()
  print(name,page.evaluate('window.__UPROAR__.state'))
 print('TEXT',page.locator('.scroll-body').inner_text()[:3000])
 print('HTML',page.locator('#menu').inner_html()[:1000])
 page.keyboard.press('Escape')
 print('BACK STATE',page.evaluate('window.__UPROAR__.state'))
 print('BUTTONS',page.locator('button').all_text_contents())
 b.close()
