from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page(viewport={'width':1920,'height':1080})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda msg:errors.append(msg.text) if msg.type in ['error','warning'] and 'willReadFrequently' not in msg.text else None)
 page.goto((root/'tests/view-smoke.html').as_uri())
 page.wait_for_timeout(1600)
 for scene,room in [('title',None),('room','dungeon2'),('room','crystal2'),('room','inferno2'),('room','shifting2'),('room','final'),('board',None)]:
  page.evaluate('([s,r])=>test.setScene(s,r)',[scene,room])
  page.wait_for_timeout(900)
  page.screenshot(path=str(root/'evidence'/f'view-{room or scene}.png'))
 page.evaluate("test.setScene('room','shifting2');test.w.shift=1;test.w.shiftWarning=true")
 page.wait_for_timeout(200)
 aim_error=page.evaluate('''()=>{const g=test.game,x=177,y=233,q=g.r.w(x,y,0),s=g.screen,b=s.canvas.getBoundingClientRect(),cx=(q[0]*s.S+s.OX-Math.round(s.fx*s.S))/s.dpr+b.left,cy=(q[1]*s.S+s.OY-Math.round(s.fy*s.S))/s.dpr+b.top,p=RingView.screenToWorld(cx,cy);return Math.hypot(p[0]-x,p[1]-y);}''')
 if aim_error>.001:errors.append('Mouse round trip '+str(aim_error))
 errors+=page.evaluate('test.game.errors.map(e=>String(e.error||e.message||e))')
 print(json.dumps({'errors':errors,'engine':page.evaluate('My3D2dge.version'),'shapeCount':page.evaluate('Object.keys(My3D2dge.SHAPES).filter(k=>k.startsWith("q")).length')}))
 browser.close()
