import json
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];P=json.loads((R/'project.json').read_text());file=R.parent/(P['base']+'.html');passed=failed=0;failures=[];details=[]
def check(name,ok,detail=''):
 global passed,failed
 if ok:passed+=1
 else:failed+=1;failures.append(name+': '+str(detail))
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 try:
  for name,device in [('phone',p.devices['iPhone 13']),('tablet',p.devices['iPad (gen 7)'])]:
   c=b.new_context(**device);pg=c.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.goto(file.as_uri()+'?test=1');pg.wait_for_function('window.mix');pg.get_by_role('button',name='Play solo',exact=True).tap();pg.wait_for_function('mix.screen==="play"');pg.wait_for_timeout(2600)
   cd=c.new_cdp_session(pg);pt=pg.evaluate('({x:innerWidth*.25,y:innerHeight*.65})');held={'x':pt['x']+60,'y':pt['y'],'id':91};cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[dict(pt,id=91)]});cd.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[held]});pg.wait_for_timeout(250);tid=pg.evaluate('mix.touch?.id')
   check(name+' drag steers',pg.evaluate('mix.world.players[0].m.x>1.5'))
   pg.evaluate("game.debug.command('stage',{index:3});mix.world.phase='playing';game.settings.set('autoChirp',false);mix.world.players[0].chirp=0;mix.world.reveal=0;mix.intentCache[0].a=false;mix.lastHUD='';mix.hud()")
   box=pg.locator('.mix-chirp').bounding_box();pt2={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':92};cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[held,pt2]});cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[pt2]});pg.wait_for_timeout(120);s=pg.evaluate('({touch:mix.touch?.id,reveal:mix.world.reveal,chirp:mix.world.players[0].chirp,phase:mix.world.phase})');check(name+' second finger chirps and keeps first contact',s['touch']==tid and s['reveal']>0,s)
   box=pg.locator('.mix-menu').bounding_box();pt2={'x':box['x']+box['width']/2,'y':box['y']+box['height']/2,'id':93};cd.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[held,pt2]});cd.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[pt2]});pg.wait_for_timeout(150);check(name+' second finger opens menu without losing steering contact',pg.evaluate('game.paused&&mix.touch?.id')==tid)
   cd.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});pg.wait_for_timeout(100);check(name+' cancel releases movement contact',pg.evaluate('mix.touch===null'))
   pg.evaluate('mix.ui.hide();game.resume();mix.showTitle()');pg.wait_for_function('mix.screen==="title"');pg.get_by_role('button',name='Maze workshop',exact=True).tap();pg.wait_for_function('mix.screen==="editor"');pg.get_by_role('button',name='Next workshop tool',exact=True).tap();pg.wait_for_timeout(120);check(name+' touch palette advances one tool',pg.evaluate('mix.editor.tool===1'))
   pg.get_by_role('button',name='Choose workshop tool',exact=True).tap();pg.wait_for_function('mix.ui.screen==="tool-palette"',timeout=1500);check(name+' tool palette opens without click-through',True)
   pg.get_by_role('button',name='Hero 2 start',exact=True).tap();pg.wait_for_timeout(100);check(name+' touch selects tool and resumes editing',pg.evaluate('mix.editor.tool===3&&mix.ui.screen===null&&!game.paused'))
   pg.screenshot(path=str(R/'build/screenshots'/('palette-'+name+'.png')));check(name+' pointer actions raise no errors',not errs,errs);details.append(s);c.close()
 except Exception as e:check('touch suite completed',False,str(e))
 finally:b.close()
report={'passed':passed,'failed':failed,'skipped':0,'failures':failures,'details':details};(R/'build/reports/touch.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
