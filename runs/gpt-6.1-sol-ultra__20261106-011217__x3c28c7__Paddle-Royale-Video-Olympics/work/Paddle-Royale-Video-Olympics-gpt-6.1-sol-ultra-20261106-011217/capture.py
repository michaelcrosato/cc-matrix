from pathlib import Path
from playwright.sync_api import sync_playwright
folder=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800},ignore_https_errors=True)
    context.add_init_script("Object.defineProperty(navigator,'gpu',{get:()=>undefined})")
    page=context.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((folder.parent/(folder.name+'.html')).as_uri())
    page.wait_for_function('window.__PADDLE__?.ready',timeout=90000)
    page.wait_for_timeout(1000)
    page.screenshot(path=str(folder/'title.png'))
    print(page.evaluate('__PADDLE__.getState()'))
    page.get_by_role('button',name='Play the Royale Cup').click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(folder/'play.png'))
    page.keyboard.press('Escape')
    page.screenshot(path=str(folder/'pause.png'))
    print('Errors:',errors)
    browser.close()
