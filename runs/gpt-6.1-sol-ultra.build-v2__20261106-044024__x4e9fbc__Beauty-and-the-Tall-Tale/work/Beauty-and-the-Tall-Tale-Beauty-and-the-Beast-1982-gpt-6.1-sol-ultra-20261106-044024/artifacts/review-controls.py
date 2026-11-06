from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path.cwd();I=json.loads((R/'build-identity.json').read_text());U=(R.parent/(I['basename']+'.html')).as_uri()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);c=b.new_context(**p.devices['iPhone 13']);q=c.new_page();e=[];q.on('pageerror',lambda x:e.append(str(x)));q.goto(U);q.wait_for_function('window.TallTaleApp?.state.ready');q.evaluate('TallTaleApp.game.stop()');q.get_by_role('button',name='Climb solo',exact=False).tap();q.get_by_role('button',name='Let’s climb',exact=False).tap();q.evaluate('TallTaleApp.game.advance(.6,{draw:true})');d=c.new_cdp_session(q)
 def touch(t,pts):d.send('Input.dispatchTouchEvent',{'type':t,'touchPoints':[dict(x=x,y=y,id=i,radiusX=6,radiusY=6,force=1) for i,x,y in pts]})
 def step(n=.1):q.evaluate('(s)=>TallTaleApp.game.advance(s,{draw:true})',n)
 touch('touchStart',[(0,70,560)]);touch('touchMove',[(0,110,560)]);step(.48);touch('touchEnd',[]);step(.06)
 print(json.dumps({'afterLeftStick':q.evaluate('({actor:TallTaleApp.state.sim.actors[0].body,buttonHidden:document.getElementById("touch-climb").hidden,device:TallTaleApp.game.input.lastDevice})')}))
 if q.locator('#touch-climb').is_visible():
  bb=q.locator('#touch-climb').bounding_box();x=bb['x']+bb['width']/2;y=bb['y']+bb['height']/2;touch('touchStart',[(2,x,y)]);step(.3)
  print(json.dumps({'midTouchClimb':q.evaluate('({tr:TallTaleApp.state.sim.actors[0].traversal,held:TallTaleApp.state.climbHeld,hidden:document.getElementById("touch-climb").hidden})')}));step(.5);touch('touchEnd',[]);step(.02)
  print(json.dumps({'afterTouchClimb':q.evaluate('({z:TallTaleApp.state.sim.actors[0].body.z,coverage:TallTaleApp.state.sim.coverage.windows})')}))
 q.screenshot(path=str(R/'artifacts/review-touch-climb.png'))
 q.evaluate('TallTaleApp.startRun(1);TallTaleApp.game.advance(.4,{draw:true})');touch('touchStart',[(0,70,560)]);touch('touchMove',[(0,110,560)]);step(.15);before=q.evaluate('({x:TallTaleApp.state.sim.actors[0].body.x,j:TallTaleApp.state.sim.coverage.jumps})');touch('touchStart',[(0,110,560),(1,330,550)]);step(.12);after=q.evaluate('({x:TallTaleApp.state.sim.actors[0].body.x,z:TallTaleApp.state.sim.actors[0].body.z,j:TallTaleApp.state.sim.coverage.jumps,device:TallTaleApp.game.input.lastDevice,stickOn:TallTaleApp.game.input.stickOn})');touch('touchEnd',[]);step(.1);print(json.dumps({'actualMultiContact':{'before':before,'after':after},'errors':e}))
 # Inspect balance UI's agreement with actual new-run configuration.
 q.evaluate('TallTaleApp.game.settings.set("dev_run",130);TallTaleApp.startRun(1);TallTaleApp.game.advance(.2,{draw:false})');print(json.dumps({'restartBalance':q.evaluate('({actual:TallTaleApp.state.sim.config.run,slider:TallTaleApp.game.settings.dev_run})')}))
 c.close()
 # Mouse window context action after approaching with real keyboard movement.
 c=b.new_context(viewport={'width':1280,'height':720});q=c.new_page();q.goto(U);q.wait_for_function('window.TallTaleApp?.state.ready');q.evaluate('TallTaleApp.game.stop()');q.get_by_role('button',name='Climb solo',exact=False).click();q.get_by_role('button',name='Let’s climb',exact=False).click();step(.6);q.keyboard.down('KeyD');step(.25);q.keyboard.up('KeyD');step(.08)
 pt=q.evaluate('(()=>{const g=TallTaleApp.game,s=g.screen,w=TallTaleApp.state.sim.windows[0],p=g.r.w(w.x,0,w.z+22),r=s.canvas.getBoundingClientRect();return{x:r.left+(p[0]*s.S+s.OX)/s.dpr,y:r.top+(p[1]*s.S+s.OY)/s.dpr};})()');q.mouse.click(pt['x'],pt['y']);step(1.3);print(json.dumps({'mouseClimb':q.evaluate('({x:TallTaleApp.state.sim.actors[0].body.x,z:TallTaleApp.state.sim.actors[0].body.z,coverage:TallTaleApp.state.sim.coverage.windows,inputTarget:TallTaleApp.state.inputTarget})')}));c.close();b.close()
