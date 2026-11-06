import json
import pathlib
import sys
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
count=0
failures=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  page=browser.new_page(viewport={'width':1920,'height':1080})
  page.goto((root/'build/game.html').as_uri())
  page.get_by_role('button',name='Check in • Solo',exact=True).click()
  page.evaluate('''()=>{const a=TB.app;a.start('coop','shared');a.game.stop();a.game.advance(.1);let r=a.run;r.practice=true;r.startFloor(4);r.phase='playing';r.damageGrace=10;
   const babies=r.rooms.filter(r=>r.kind==='baby');for(let i=0;i<2;i++){r.players[i].m.place(...babies[i].cell);r.reveal(r.players[i]);}
   r.enemies[0].stun=2;r.enemies[0].state='stunned';r.enemies[1].age=45;r.enemies[1].emerge=0;r.enemies[2].age=20;r.enemies[2].emerge=0;r.enemies[3].emerge=0;
   r.plant(r.players[0],{bomb:true,bombSeq:1});a.game.advance(.05,{draw:true});}''')
  page.screenshot(path=str(root/'build/late-tv.png'))
  count+=1
  if not page.evaluate('TB.app.game.errors.length===0&&TB.app.state.floor===4'):failures.append('late-floor native draw errors')
  count+=1
  if not page.evaluate('TB.app.run.players[0].home!==TB.app.run.players[1].home'):failures.append('late-floor home symbols not distinct')
  page.evaluate('TB.app.state={...TB.app.state,phase:"celebration",phaseTime:2};TB.app.game._frame()')
  page.screenshot(path=str(root/'build/ending-tv.png'))
  count+=1
  if not page.evaluate('TB.app.game.errors.length===0'):failures.append('ending native draw errors')
  page.evaluate('TB.app.about()')
  page.get_by_role('button',name='Source information',exact=True).click()
  count+=1
  if page.get_by_role('heading',name='Source information',exact=True).count()!=1:failures.append('source credits page missing')
  # All feedback pages are populated from the exact root interview, then browsed through native buttons.
  for _ in range(4):
   b=page.get_by_role('button',name='Next',exact=True)
   if b.count():b.click()
  count+=1
  if 'added on import' not in page.locator('.esh-sh').inner_text():failures.append('usage field missing in final credits')
  page.close()
  context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True,is_mobile=True,device_scale_factor=1)
  tablet=context.new_page();tablet.goto((root/'build/game.html').as_uri());tablet.get_by_role('button',name='Check in • Solo',exact=True).tap();tablet.wait_for_function('TB.app.run.phase==="playing"');tablet.screenshot(path=str(root/'build/tablet.png'))
  count+=1
  if not tablet.evaluate('TB.app.game.W>=336&&TB.app.game.H>=260&&TB.app.game.errors.length===0'):failures.append('tablet framing/draw')
  context.close();browser.close()
except Exception as e:failures.append(str(e))
print(json.dumps({'count':count,'failures':failures}))
sys.exit(1 if failures else 0)
