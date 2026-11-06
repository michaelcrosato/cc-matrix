from pathlib import Path
from playwright.sync_api import sync_playwright
base=Path(__file__).resolve().parents[2]
artifact=base.parent/(base.name+'.html')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 errors=[]
 page=browser.new_page(viewport={'width':1920,'height':1080})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(artifact.as_uri());page.wait_for_function('window.__pp?.ready')
 page.screenshot(path=str(base/'evidence/integrated-title.png'))
 page.evaluate('__pp.start({})');page.evaluate('__pp.advance(2)')
 page.screenshot(path=str(base/'evidence/integrated-play.png'))
 page.evaluate('''() => { const s=__pp.sim;s.enter(2);s.transition=0;s.miners[0].hero.x=230;s.miners[0].hero.z=208;for(let i=0;i<11;i++)s.spawnRock({x:70+i*43,z:29+Math.floor(i/3)*64,vx:i%2?58:-58,kind:["normal","bounce","heavy"][i%3]});s.spawnPickup('key',300,265);s.spawnPickup('pick',440,340); }''')
 page.evaluate('__pp.advance(.1)');page.screenshot(path=str(base/'evidence/integrated-motherlode.png'))
 page.evaluate('__pp.sim.miners[0].tool=0');page.evaluate('__pp.advance(.1)');page.screenshot(path=str(base/'evidence/integrated-unarmed.png'))
 for screen in ['pause','developer','about']:
  page.evaluate(f'__pp.show("{screen}")');page.evaluate('__pp.advance(.02)');page.screenshot(path=str(base/f'evidence/integrated-{screen}.png'))
 assert not errors,errors
 assert not page.evaluate('__pp.game.errors'),page.evaluate('__pp.game.errors')
 page.close()
 for name,size in [('portrait',{'width':390,'height':844}),('landscape',{'width':844,'height':390})]:
  page=browser.new_page(viewport=size,has_touch=True,is_mobile=True)
  page.goto(artifact.as_uri());page.wait_for_function('window.__pp?.ready');page.evaluate('__pp.start({})');page.evaluate('__pp.advance(2)')
  page.screenshot(path=str(base/f'evidence/integrated-{name}.png'))
  assert not page.evaluate('__pp.game.errors'),page.evaluate('__pp.game.errors')
  assert abs(page.evaluate('__pp.game.screen.OX'))<=1
  page.close()
 browser.close()
 print("9 integrated visual capture checks passed")
