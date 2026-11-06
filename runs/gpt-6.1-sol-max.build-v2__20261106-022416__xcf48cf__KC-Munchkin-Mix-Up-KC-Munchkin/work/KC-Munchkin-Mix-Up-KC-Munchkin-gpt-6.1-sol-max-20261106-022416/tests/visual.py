import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];P=json.loads((R/'project.json').read_text());URL=(R.parent/(P['base']+'.html')).as_uri()+'?test=1';O=R/'build/screenshots';O.mkdir(parents=True,exist_ok=True);passed=failed=0;failures=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--no-sandbox'])
 try:
  c=b.new_context(viewport={'width':1920,'height':1080});pg=c.new_page();pg.goto(URL);pg.wait_for_function('window.mix');pg.wait_for_timeout(400);pg.screenshot(path=str(O/'final-title-tv.png'));pg.get_by_role('button',name='Play solo',exact=True).click();pg.wait_for_function('mix.screen==="play"');pg.wait_for_timeout(2600)
  pg.evaluate("game.debug.command('bot-play',{seconds:1000})");pg.wait_for_function('mix.ui.screen==="results"');pg.wait_for_timeout(450);pg.screenshot(path=str(O/'victory-settled-tv.png'));passed+=1
  pg.evaluate('mix.startRun({seats:[0,1],devices:"keys"})');pg.wait_for_function('mix.world.players.length===2&&mix.world.phase==="intro"');pg.wait_for_timeout(4100);pg.screenshot(path=str(O/'coop-settled-tv.png'));passed+=1
  pg.evaluate("game.debug.command('stage',{index:3});mix.world.god=true;mix.world.phase='playing';mix.world.reveal=0;game.input.hold('right');game.advance(.5,{draw:true})");pg.screenshot(path=str(O/'vanishing-tv.png'));pg.keyboard.press('Space');pg.wait_for_timeout(100);pg.screenshot(path=str(O/'revealed-tv.png'))
  pg.evaluate("game.input.clear();game.debug.command('stage',{index:2});mix.world.phase='playing';mix.world.gateTime=2.25;mix.world.stageTime=2;game.stop()")
  frames=[]
  for i in range(7):
   pg.evaluate('game.advance(.1,{draw:true})');name=O/f'gate-{i}.png';rect=pg.evaluate('''()=>{const [x,y]=game.r.w(7*16,5*16),[ex,ey]=game.r.w(14*16,12*16),r=game.screen.canvas.getBoundingClientRect();return {x:r.left+x*r.width/game.W,y:r.top+y*r.height/game.H,width:(ex-x)*r.width/game.W,height:(ey-y)*r.height/game.H}}''');pg.screenshot(path=str(name),clip=rect);frames.append(str(name))
  subprocess.run(['magick','montage','-font','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',*frames,'-tile','7x1','-geometry','300x300+4+4',str(O/'gate-motion-strip.png')],check=True,capture_output=True)
  passed+=1;c.close()
  c=b.new_context(**p.devices['iPhone 13']);pg=c.new_page();pg.goto(URL);pg.wait_for_function('window.mix');pg.screenshot(path=str(O/'final-title-phone.png'));pg.get_by_role('button',name='Play solo',exact=True).tap();pg.wait_for_function('mix.screen==="play"');pg.wait_for_timeout(2600);pg.evaluate("game.debug.command('stage',{index:3});mix.world.god=true;mix.world.phase='playing';mix.world.reveal=0;game.input.lastDevice='touch';game.advance(.2,{draw:true})");pg.screenshot(path=str(O/'final-play-phone.png'));passed+=1;c.close()
 except Exception as e:failed+=1;failures.append(str(e))
 finally:b.close()
print(json.dumps({'passed':passed,'failed':failed,'skipped':0,'failures':failures}))
