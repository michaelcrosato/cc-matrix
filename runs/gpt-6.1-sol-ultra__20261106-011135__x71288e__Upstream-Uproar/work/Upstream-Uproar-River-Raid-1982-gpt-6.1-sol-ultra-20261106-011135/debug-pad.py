from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1440,'height':900});page.on('pageerror',lambda e:print('ERROR',e));page.on('console',lambda m:print('LOG',m.text[:200]) if m.type=='error' else None)
 page.goto('http://127.0.0.1:40643/'+root.name+'.html?test=1',wait_until='domcontentloaded');page.wait_for_function('window.__UPROAR__?.diagnostics.ready')
 page.evaluate('''window.framesCount=0;const f=()=>{framesCount++;requestAnimationFrame(f)};f();window.testPad={index:2,id:'DualSense',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[null,null,testPad];document.querySelector('[data-action="solo"]').focus();testPad.buttons[0].pressed=true''')
 page.wait_for_timeout(1500)
 print(page.evaluate('({state:__UPROAR__.snapshot(),diagnostics:__UPROAR__.diagnostics,focus:document.activeElement.outerHTML,pads:Array.from(navigator.getGamepads()),framesCount})'))
 b.close()
