from pathlib import Path
from playwright.sync_api import sync_playwright
import os
root=Path(__file__).resolve().parent
os.environ['TMPDIR']=str(root/'.browser-tmp')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1600,'height':900})
 page.goto((root.parent/(root.name+'.html')).as_uri()+'?webgl=1')
 page.wait_for_function('window.__solar?.ready',timeout=60000)
 page.wait_for_function('solarApp.scene.t>.2')
 page.screenshot(path=str(root/'title.png'))
 page.evaluate("()=>{solarApp.start();solarApp.sim.dev.warp('echo');for(let i=0;i<130;i++)solarApp.sim.update(.05,{fire:true});solarApp.page='flight';solarApp.paused=true;solarApp.show('flight');}")
 page.wait_for_timeout(300)
 page.screenshot(path=str(root/'flight.png'))
 page.evaluate("()=>{solarApp.sim.start();solarApp.sim.dev.warp('solaris');for(let i=0;i<100;i++)solarApp.sim.update(.05,{});solarApp.paused=true;solarApp.show('flight')}")
 page.wait_for_timeout(300)
 page.screenshot(path=str(root/'carrier.png'))
 page.set_viewport_size({'width':844,'height':390})
 page.evaluate("solarApp.start()")
 page.wait_for_timeout(200)
 page.screenshot(path=str(root/'touch-chart.png'))
 page.set_viewport_size({'width':390,'height':844})
 page.evaluate("solarApp.start()")
 page.wait_for_timeout(200)
 page.screenshot(path=str(root/'phone-chart.png'))
 b.close()
print('5 visual captures; 0 failures')
