from pathlib import Path
import json
R=Path(__file__).resolve().parent.parent
URL=(R.parent/(R.name+'.html')).as_uri()
PAD="""(() => { const pad={id:'Stub DualSense (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),vibrationActuator:null};window.__pad=pad;navigator.getGamepads=()=>[pad,null,null,null];})();"""

def run_browser(p, pictures=True):
 out=[];screens=R/'test/screenshots';screens.mkdir(exist_ok=True)
 def add(name,ok,detail=''):out.append({'name':name,'pass':bool(ok),'detail':str(detail)})
 b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-webgl'])
 page=b.new_page(viewport={'width':1920,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(URL+'?backend=webgl');page.wait_for_function("window.__game?.game.sceneName==='title'||window.__game?.game.sceneName==='attract'",timeout=120000);page.wait_for_timeout(1700)
  caught=page.evaluate('__game.game.errors.map(e=>String(e.error||e.message||e))');add('rendered Chromium boot',page.title()=='Dead Sea Sigh' and not errors and not caught,caught or errors)
  if caught:raise RuntimeError('Engine draw error: '+str(caught))
  page.evaluate('__game.game.stop();__game.game.audio.mute(true);__game.game.fadeTime=0')
  def shot(name):
   page.evaluate('__game.game.advance(.02,{draw:true})');page.wait_for_timeout(700)
   if pictures:page.screenshot(path=str(screens/(name+'.png')))
  shot('title')
  page.evaluate("() => {const q=__game;q.game.go('play');q.game.advance(.05);q.S.card=null;q.S.subtitle=null;q.S.tool=null;q.S.bound=false;q.CHEATS.god=true;q.CHEATS.freezeAI=true;q.CHEATS.noFits=true;q.Bot.teleport(710*16,1450*16);q.S.yaw=-.45;q.S.pitch=.02;}")
  for name,hour in [('noon',12),('dusk',18.3),('night',22)]:
   page.evaluate('(h)=>__game.setHour(h)',hour);shot(name)
  page.evaluate("() => {const q=__game;q.setHour(18.7);for(let i=0;i<9;i++)q.Fire.ignite((728+i*4)*16,(1430+i%2*4)*16,6,true);q.spawnEnemy(754*16,1425*16,'front');q.game.advance(.1);}");shot('fire-front')
  page.evaluate("() => {const q=__game;q.S.tool='map';q.S.toolT=1;q.S.card=null;}");shot('held-map')
  add('held map is an in-world mesh',page.evaluate("() => __game.S.tool==='map' && __game.world.overlay.scene.children.some(x=>x.isMesh&&x.visible&&x.geometry?.type==='PlaneGeometry')"))
  page.evaluate("() => {const q=__game;q.S.tool=null;q.Bot.tick(14);q.setHour(12);}");shot('ash')
  page.evaluate("() => {const q=__game;q.Bot.teleport(1035*16,1150*16);q.S.yaw=0;q.S.pitch=-.03;q.spawnEnemy(q.hero.x+2.3*16,q.hero.y,'authority',{yaw:Math.PI});}");shot('soldier-face')
  page.evaluate("() => {const q=__game;q.Bot.teleport(1040*16,1150*16);q.makeVehicle('jeep',q.hero.x+6*16,q.hero.y);q.S.yaw=0;q.S.pitch=-.1;}");shot('jeep')
  page.evaluate("() => {const q=__game;q.Bot.teleport(1134*16,1250*16);q.S.yaw=1.25;q.S.pitch=.08;q.setHour(18);}");shot('hulk')
  page.evaluate("() => {const q=__game;q.Bot.teleport(1060*16,714*16);q.S.yaw=-Math.PI/2;q.S.pitch=.42;q.setHour(22);}");shot('lamp-night')
  page.evaluate('__game.openShop();__game.S.toolT=1');shot('sunday-catalogue')
  page.evaluate('__game.S.tool=null;__game.game.pause();__game.game.advance(.02,{draw:true})');page.wait_for_timeout(400)
  add('pause includes Dev and About',page.get_by_role('button',name='Dev mode',exact=True).count()>0 and page.get_by_role('button',name='About / Credits',exact=True).count()>0)
  if pictures:page.screenshot(path=str(screens/'pause.png'))
  page.get_by_role('button',name='Dev mode',exact=True).click();page.wait_for_timeout(300)
  add('live Dev panel opens from pause',page.locator('#devpanel').is_visible())
  if pictures:page.screenshot(path=str(screens/'dev.png'))
  live=page.evaluate("""() => {const q=__game,old=q.TUNE.fireSpread;const el=document.querySelector('#devpanel input[aria-label="fireSpread"]');el.value=2.5;el.dispatchEvent(new Event('input'));const ok=q.TUNE.fireSpread===2.5;q.Dev.reset();return ok&&q.TUNE.fireSpread===1;}""")
  add('live slider and reset',live)
  page.evaluate("__game.Dev.open=false;document.getElementById('devpanel')?.remove();__game.showAbout()");page.wait_for_timeout(200)
  add('About feedback sections',all(page.get_by_text(x,exact=True).count()>0 for x in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']))
  add('About opens at top',page.evaluate("() => (document.querySelector('.esh-mod')?.scrollTop||0)===0"))
  page.evaluate("() => {__game.game.shell.hide();const q=__game;q.Bot.teleport(q.OP.sill.x,q.OP.sill.y,q.OP.sill.z+46.5*16);q.S.yaw=Math.PI/2;q.S.pitch=-.075;q.setHour(18);q.chooseEnding('arithmetic');q.Bot.tick(88);}");shot('flood')
  page.evaluate('__game.S.endingTime=104;__game.game.advance(.02,{draw:true})');add('ending credits render',page.evaluate('__game.game.errors.length===0'));
  add('flood reaches basin and engine has no errors',page.evaluate("() => __game.S.ending==='arithmetic'&&__game.world.scene.children.some(x=>x.isMesh&&x.geometry?.type==='PlaneGeometry'&&x.position.y>-8)") and not errors and page.evaluate('__game.game.errors.length===0'),errors)
 finally:b.close()
 # Gamepad and real idle attract clock use the fast rig; preserve a clean storage context.
 b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required']);ctx=b.new_context();ctx.add_init_script(PAD);page=ctx.new_page()
 try:
  page.goto(URL+'?norender=1');page.wait_for_function('__game?.ready',timeout=90000);page.evaluate('__game.game.fadeTime=0;__game.game.audio.mute(true)')
  page.evaluate("__pad.buttons[7]={pressed:true,touched:true,value:1};__pad.timestamp++");page.wait_for_function("__game.game.input.lastDevice==='gamepad'",timeout=10000)
  add('DualSense R2 prompt',page.evaluate("__game.game.input.label('fire')==='R2'"))
  page.evaluate("__game.game.settings.set('glyphs','xbox')");add('Xbox RT prompt',page.evaluate("__game.game.input.label('fire')==='RT'"))
  page.evaluate("__pad.buttons[7]={pressed:false,touched:false,value:0};__pad.timestamp++");page.keyboard.press('KeyN');page.wait_for_timeout(150)
  add('keyboard prompt follows input',page.evaluate("__game.game.input.lastDevice==='keyboard' && __game.game.input.label('fire')==='Left click'"))
  page.evaluate("__game.game.settings.set('glyphs','playstation');__game.game.go('title')")
  page.wait_for_function('__game.Attract.active',timeout=18000)
  add('attract starts after real idle',page.evaluate('__game.Attract.active'))
  page.evaluate("() => {for(let i=0;i<8;i++){__game.Attract.next();__game.Attract.update(.01);}}")
  add('eight attract vignettes',page.evaluate('__game.Attract.seen.size===8'))
  page.keyboard.press('KeyX');page.wait_for_function('!__game.Attract.active',timeout=5000);add('key exits attract',True)
  page.evaluate('__game.Attract.start()');page.wait_for_timeout(100);page.mouse.move(50,50);page.wait_for_function('!__game.Attract.active',timeout=5000);add('mouse exits attract',True)
  page.evaluate('__game.Attract.start()');page.wait_for_timeout(100);page.evaluate('__pad.axes[0]=.8;__pad.timestamp++');page.wait_for_function('!__game.Attract.active',timeout=5000);add('stick exits attract',True)
  page.evaluate('__pad.axes[0]=0;__pad.timestamp++;__game.showAbout();__game.game.pause()');page.wait_for_timeout(150)
  page.evaluate('__pad.axes[3]=.9;__pad.timestamp++');page.wait_for_function("(document.querySelector('.esh-mod')?.scrollTop||0)>20",timeout=7000);add('controller scrolls paused About',True)
  page.evaluate('__pad.axes[3]=0;__pad.timestamp++;__game.game.shell.hide();__game.game.resume()')
 finally:b.close()
 # Sequential viewport checks also inspect Safari's engine with the actual renderer.
 viewports=[('small-phone','webkit',{'width':375,'height':667},True),('phone','chromium',{'width':390,'height':844},True),('foldable','chromium',{'width':344,'height':882},True),('tablet','webkit',{'width':1024,'height':768},True),('wide','chromium',{'width':2560,'height':1080},False)]
 for name,engine,size,mobile in viewports:
  browser=getattr(p,engine).launch(headless=True,**({'args':['--use-angle=swiftshader','--enable-webgl']} if engine=='chromium' else {}));ctx=browser.new_context(viewport=size,has_touch=mobile,**({'is_mobile':True} if mobile and engine!='firefox' else {}));page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  try:
   page.goto(URL+'?backend=webgl');page.wait_for_function("window.__game?.game.sceneName==='title'||window.__game?.game.sceneName==='attract'",timeout=120000);page.wait_for_timeout(1500)
   add(name+' '+engine+' rendered viewport',page.title()=='Dead Sea Sigh' and not errors and page.evaluate('__game.game.errors.length===0'),errors)
   add(name+' no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   if mobile:
    notice=page.get_by_text('Controller or keyboard required',exact=False)
    notice.first.wait_for(state='visible',timeout=15000);add(name+' controller-only notice',notice.count()>0 and notice.first.is_visible())
    settings=page.get_by_role('button',name='Settings',exact=True)
    if settings.count():settings.last.click();page.wait_for_timeout(100);add(name+' touch settings usable',page.get_by_text('Sound',exact=True).count()>0 or page.get_by_role('button',name='Sound',exact=True).count()>0)
   if pictures:page.screenshot(path=str(screens/(name+'-'+engine+'.png')))
  except Exception as e:add(name+' '+engine+' viewport',False,str(e)[:500])
  finally:browser.close()
 browser=p.firefox.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':900})
 try:
  page.goto(URL+'?norender=1&backend=webgl');page.wait_for_function('window.__game?.ready',timeout=90000)
  page.evaluate('__game.game.stop();__game.game.audio.mute(true)')
  add('Firefox simulation and replay',page.evaluate('() => __game.run(120)===__game.run(120)&&__game.game.errors.length===0'))
 finally:browser.close()
 (R/'test/browser-report.json').write_text(json.dumps(out,indent=2));return out
