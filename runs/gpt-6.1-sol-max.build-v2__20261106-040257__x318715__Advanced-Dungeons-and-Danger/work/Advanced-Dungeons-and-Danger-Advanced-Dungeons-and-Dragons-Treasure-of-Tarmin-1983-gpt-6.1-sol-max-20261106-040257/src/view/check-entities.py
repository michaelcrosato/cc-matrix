from playwright.sync_api import sync_playwright
from pathlib import Path
import json
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1600,'height':900});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(Path('src/view/preview.html').resolve().as_uri()+'?backend=webgl');page.wait_for_function('window.preview?.view?.ready',timeout=30000)
 for name,args in [('guard',[0,3,6,0]),('scorpion',[0,5,2,2]),('spirit',[1,7,1,3]),('boss',[2,5,5,0])]:
  page.evaluate('(args)=>preview.make(...args)',args);page.wait_for_timeout(1600);page.screenshot(path='evidence/'+name+'-native.png');print(name,json.dumps({'errors':errors,'gameErrors':page.evaluate('preview.game.errors'),'snapshot':page.evaluate('preview.view.snapshot()')},default=str))
 b.close()
