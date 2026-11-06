from pathlib import Path
import json
from playwright.sync_api import sync_playwright

folder=Path(__file__).resolve().parent
html=folder.parent/(folder.name+'.html')
reports=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-swiftshader'])
    for label,width,height,touch in [('tv',1920,1080,False),('phone-portrait',390,844,True),('phone-landscape',844,390,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch,device_scale_factor=1,ignore_https_errors=True)
        context.add_init_script("Object.defineProperty(navigator,'gpu',{get:()=>undefined})")
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(html.as_uri(),wait_until='domcontentloaded')
        page.wait_for_function('window.__PADDLE__?.ready',timeout=90000)
        page.wait_for_timeout(400)
        if touch:
            page.touchscreen.tap(width-8,height-8)
        if label!='phone-landscape':
            page.screenshot(path=str(folder/('final-'+label+'-title.png')))
        # Use the real title button so pointer/touch settings match the device.
        page.get_by_role('button',name='Play the Royale Cup').click() if not touch else page.get_by_role('button',name='Play the Royale Cup').tap()
        page.wait_for_timeout(2200)
        page.screenshot(path=str(folder/('final-'+label+'-play.png')))
        boxes=page.evaluate('''() => ({state:__PADDLE__.getState().phase,backend:__PADDLE__.getState().backend.backend,body:document.body.className,title:document.querySelector('.hud-title')?.getBoundingClientRect().toJSON(),score:document.querySelector('.scorebar')?.getBoundingClientRect().toJSON(),menu:document.querySelector('.menu-btn')?.getBoundingClientRect().toJSON()})''')
        if label=='phone-landscape':
            page.evaluate('__PADDLE__.setBall(0,0,2.6,0)');page.locator('.menu-btn').tap();page.wait_for_function('__PADDLE__.getState().phase==="pause"');page.wait_for_timeout(300);page.screenshot(path=str(folder/('final-'+label+'-pause.png')))
        reports.append({'label':label,'errors':errors,'layout':boxes})
        context.close()
    browser.close()
print(json.dumps(reports,indent=2))
