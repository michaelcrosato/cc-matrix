from playwright.sync_api import sync_playwright
from pathlib import Path
import json
artifact=Path('..')/(Path.cwd().name+'.html')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist'])
 page=b.new_page(viewport={'width':1920,'height':1080});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(artifact.resolve().as_uri()+'?backend=webgl');page.wait_for_function('window.__gameReady',timeout=60000)
 page.evaluate('__app.lastActivity=performance.now()+100000')
 page.wait_for_timeout(1400);page.screenshot(path='evidence/final-title-native.png')
 print('title',json.dumps({'errors':errors,'game':page.evaluate('__DANGER.game.errors'),'view':page.evaluate('__DANGER.view.snapshot()')},default=str),flush=True)
 page.evaluate('__app.newSolo(false)');page.wait_for_timeout(1000);page.screenshot(path='evidence/final-corridor-native.png')
 for name,enemy in [('guard','upper.watchman'),('scorpion','upper.scorpion'),('wraith','spirit.wraith'),('boss','guardian.warden')]:
  page.evaluate('''enemy=>{const a=__app,m=a.net.model;m.state.combat=null;m.state.phase='explore';m.dev({type:'encounter',target:enemy});const e=m.state.entities[enemy],p=m.state.players['0'];const dx=e.x-p.x,dy=e.y-p.y;p.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0;a.onState(m.state);a.ui.hide();a.syncPause();a.view.resetLook();}''',enemy)
  page.wait_for_timeout(1400);page.screenshot(path='evidence/final-'+name+'-native.png')
  print(name,json.dumps({'errors':errors,'game':page.evaluate('__DANGER.game.errors'),'view':page.evaluate('__DANGER.view.snapshot()')},default=str),flush=True)
 print('audio',json.dumps(page.evaluate('__DANGER.audio.offlineProbe()')),flush=True)
 b.close()
