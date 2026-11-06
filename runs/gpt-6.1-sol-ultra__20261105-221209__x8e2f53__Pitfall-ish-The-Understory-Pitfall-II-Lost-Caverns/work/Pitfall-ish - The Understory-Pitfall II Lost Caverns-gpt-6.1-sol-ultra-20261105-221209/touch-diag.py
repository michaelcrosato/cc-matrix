from pathlib import Path
from playwright.sync_api import sync_playwright
from urllib.parse import quote
import json,base64
folder=Path(__file__).resolve().parent
info=json.loads((folder/'build-info.json').read_text())
url='http://127.0.0.1:40835/'+quote(info['stem']+'.html')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-webgpu-adapter=swiftshader'])
 context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
 page=context.new_page()
 page.add_init_script('''window.__touchLog=[];for(const type of ['pointerdown','pointermove','pointerup','click','touchstart','touchend'])addEventListener(type,e=>{window.__touchLog.push({type,pointerType:e.pointerType||'',input:document.querySelector('#game-ui')?.dataset.input,at:performance.now()});});''')
 page.goto(url,wait_until='domcontentloaded')
 assert page.title()==info['title']
 page.wait_for_function('window.__game?.getState().ready||window.__bootError',timeout=60000)
 def diag():
  return page.evaluate('''()=>({lastInput:window.__game.getState().lastInput,mode:window.__game.getState().mode,dataset:document.querySelector('#game-ui').dataset.input,display:getComputedStyle(document.querySelector('.hud-top')||document.body).display,width:innerWidth,screen:document.querySelector('#game-ui').dataset.screen,rules:[...document.styleSheets[0].cssRules].filter(r=>r.selectorText?.includes('data-input=touch')).map(r=>r.cssText),log:window.__touchLog.slice(-10)})''')
 result={'before':diag()}
 b=page.locator('[data-action=start]').bounding_box()
 page.touchscreen.tap(b['x']+b['width']/2,b['y']+b['height']/2)
 page.wait_for_timeout(800)
 result['afterStart']=diag()
 cdp=context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':310,'id':1}]})
 page.wait_for_timeout(100)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':250,'y':310,'id':1}]})
 page.wait_for_timeout(300)
 result['duringMove']=diag()
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 page.wait_for_timeout(200)
 result['afterMove']=diag()
 # A real touch while loading can get ahead of init's forced keyboard prompt.
 page.goto(url,wait_until='domcontentloaded')
 page.wait_for_function('window.__game',timeout=60000)
 result['earlyTouchBefore']=diag()
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':310,'id':2}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 page.wait_for_function('window.__game?.getState().ready||window.__bootError',timeout=60000)
 page.wait_for_timeout(300)
 result['earlyTouchReady']=diag()
 page.evaluate('window.__game.action("start")')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':190,'y':310,'id':2}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':250,'y':310,'id':2}]})
 page.wait_for_timeout(300)
 result['earlyTouchMove']=diag()
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 # Exercise the edited UI directly without rebuilding parent bundle.
 page.goto('about:blank')
 code='data:text/javascript;base64,'+base64.b64encode((folder/'ui.js').read_bytes()).decode()
 page.evaluate('''async ({code,css})=>{document.head.innerHTML='<meta name="viewport" content="width=device-width,initial-scale=1">';const s=document.createElement('style');s.textContent=css;document.head.append(s);const {GameUI}=await import(code);window.__actions=[];window.__ui=new GameUI({onAction:a=>window.__actions.push(a)});window.__ui.show('playing');window.__ui.setInput('touch');window.__ui.updateHUD({area:'TEST',touchAction:'Catch balloon'});}''',{'code':code,'css':(folder/'style.css').read_text()})
 b=page.locator('[data-touch-action]').bounding_box();x=b['x']+b['width']/2;y=b['y']+b['height']/2
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
 page.evaluate("window.__ui.updateHUD({area:'TEST',touchAction:'Catch balloon'})")
 page.wait_for_timeout(100)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 page.wait_for_timeout(50)
 result['touchContextActions']=page.evaluate('window.__actions')
 page.evaluate("document.querySelector('[data-touch-action]').click()")
 result['afterKeyboardClick']=page.evaluate('window.__actions')
 # Physical mouse click should also retain exactly one action.
 page.mouse.click(x,y)
 result['afterMouseClick']=page.evaluate('window.__actions')
 browser.close()
 print(json.dumps(result))
