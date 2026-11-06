def ui_test(page):
 page.evaluate('__test.freeze();__test.start();')
 page.keyboard.press('Escape');page.locator('[data-action=dev]').click()
 page.locator('#balance-speed').evaluate("e=>{e.value='10';e.dispatchEvent(new Event('input',{bubbles:true}));}")
 assert page.evaluate('__test.balance.speed')==10
 page.locator('[data-action=defaults]').click();assert page.evaluate('__test.balance.speed')==7.6
 page.locator('[data-action=back-dev]').click();page.locator('[data-action=settings]').click()
 assert page.locator('#prefs-music').input_value()=='0.1'
 page.locator('[data-action=back-settings]').click();page.locator('[data-action=resume]').click()
 assert page.evaluate('__test.ui().screenMode')=='playing'
 return True

def audio_test(page):
 result=page.evaluate("""async()=>{const ctx=new OfflineAudioContext(2,96000,48000),a=new __test.AudioEngine(ctx);for(const s of ['jump','bump','flip','kick','coin','hurt','dash','bell','clear','lose','menu'])a.sfx(s);a.voice('win');a.tick(true,1);const buffer=await ctx.startRendering();const d=buffer.getChannelData(0);let sum=0,peak=0,finite=true;for(let i=0;i<d.length;i++){sum+=d[i]*d[i];peak=Math.max(peak,Math.abs(d[i]));finite=finite&&Number.isFinite(d[i]);}return {ok:finite&&Math.sqrt(sum/d.length)>.005&&peak<=1,peak,rms:Math.sqrt(sum/d.length),events:a.events,music:a.musicVolume};}""")
 notes['audio']=result;return result

def about_test(page):
 page.evaluate('__test.showTitle()');page.locator('[data-action=about]').click()
 for action,title in [('source-info','SOURCE INFORMATION'),('testing-info','TESTING FEEDBACK'),('engine-info','ENGINE FEEDBACK'),('prompt-info','PROMPT FEEDBACK')]:
  page.locator('[data-action='+action+']').click();assert title in page.locator('#screen').inner_text()
  assert 'added on import' in page.locator('#screen').inner_text() if action=='source-info' else page.locator('.credits li').count()>0
  page.locator('[data-action=about]').click()
 page.locator('[data-action=title]').click();return True

def attract_test(page):
 page.evaluate('__test.freeze(false);__test.showTitle();__test.attract();')
 page.wait_for_function('__test.game.attract&&__test.game.time>0',timeout=15000)
 page.keyboard.press('r');page.wait_for_function("__test.ui().screenMode==='title'&&!__test.game.attract")
 page.evaluate('__test.freeze()');return True

def controller_test(page):
 page.evaluate("""()=>{window.testPad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[testPad];__test.showTitle();__test.freeze(false);}""")
 page.evaluate('testPad.buttons[0]={pressed:true,value:1}');page.wait_for_function("__test.ui().screenMode==='playing'")
 page.evaluate('testPad.buttons[0]={pressed:false,value:0};testPad.axes[0]=1')
 page.wait_for_function('__test.game.players[0].body.linvel().x>2')
 assert page.evaluate('__test.ui().lastInput')=='gamepad'
 assert '×' in page.locator('#controls').inner_text()
 page.evaluate('testPad.axes[0]=0;testPad.buttons[9]={pressed:true,value:1}')
 page.wait_for_function("__test.ui().screenMode==='pause'")
 page.evaluate('testPad.buttons[9]={pressed:false,value:0}')
 page.locator('[data-action=settings]').click();page.locator('[data-action=glyphs]').click();assert page.locator('[data-action=glyphs]').inner_text()=='Xbox'
 page.locator('[data-action=back-settings]').click();page.locator('[data-action=resume]').click()
 page.evaluate('testPad.axes[0]=.5');page.wait_for_function("__test.ui().lastInput==='gamepad'")
 assert 'A' in page.locator('#controls').inner_text()
 page.evaluate('testPad.axes[0]=0;__test.preferences.glyphs="ps";__test.freeze();__test.showTitle();navigator.getGamepads=()=>[]')
 return True

def touch_test(browser,pw):
 context=browser.new_context(**pw.devices['Pixel 7']);page,context=page_for(browser,context=context)
 page.locator('[data-action=solo]').tap();page.wait_for_timeout(400)
 before=page.evaluate('FlipBros.state().players[0]');size=page.evaluate('({w:innerWidth,h:innerHeight})');w,h=size['w'],size['h']
 cdp=context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':0,'x':65,'y':h*.73},{'id':1,'x':w*.67,'y':h*.64}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':0,'x':115,'y':h*.73},{'id':1,'x':w*.67,'y':h*.64}]})
 page.wait_for_timeout(330);after=page.evaluate('FlipBros.state().players[0]')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert after['x']>before['x']+.5 and after['y']>before['y']+.5,{'before':before,'after':after}
 page.locator('#pause-btn').tap();assert page.evaluate('__test.ui().screenMode')=='pause'
 page.locator('[data-action=settings]').tap();assert page.locator('.panel').bounding_box()['width']<=w
 page.screenshot(path=str(ROOT/'verified-phone.png'));context.close();return True

def room_test(browser):
 page,context=page_for(browser);page.locator('[data-action=online]').click();page.locator('[data-action=host]').click()
 page.wait_for_selector('.roomcode');code=page.locator('.roomcode').inner_text()
 guest,_=page_for(browser,context=context);guest.locator('[data-action=online]').click();guest.locator('#room-code').fill(code);guest.locator('[data-action=join]').click()
 guest.wait_for_selector('.roomcode',timeout=15000);assert guest.locator('.roomcode').inner_text()==code
 page.wait_for_function('__test.net.members.length===2');page.locator('[data-action=room-start]').click()
 guest.wait_for_function('__test.net.started&&__test.game.players.length===2')
 guest.keyboard.down('d');guest.wait_for_function('__test.game.players.find(p=>p.id===__test.net.me).body.linvel().x>2');guest.keyboard.up('d')
 page.wait_for_function('__test.game.players.find(p=>p.id===1).body.translation().x>-2')
 assert abs(page.evaluate('__test.game.time')-guest.evaluate('__test.game.time'))<1
 page.evaluate('__test.game.finish(true)');guest.wait_for_function("__test.ui().screenMode==='result'")
 page.locator('[data-action=room-restart]').click();guest.wait_for_function("__test.game.status==='playing'&&__test.ui().screenMode==='playing'")
 guest.keyboard.press('Escape');guest.locator('[data-action=quit]').click();page.wait_for_function('__test.net.members.length===1')
 page.close();guest.close();context.close();return True

def hub_test(browser,n,scenario,impaired):
 context=browser.new_context(viewport={'width':1600,'height':900});context.route('https://cdn.jsdelivr.net/npm/**',route_deps);page=context.new_page()
 url=BASE+'/harness.html?game='+quote('index.html?renderer=webgl',safe='')+f'&players={n}&scenario={scenario}&auto=1&play=3000'
 if impaired:url+='&latency=150&jitter=50&loss=5'
 page.goto(url);page.wait_for_function('window.__hubCheck?.done===true',timeout=150000)
 report=page.evaluate('__hubCheck');notes['hub-'+str(n)+'-'+scenario]=report
 context.close();return {'ok':report['pass'],'failed':[c for c in report['checks'] if not c['pass']]}

def gpu_test(browser):
 page,context=page_for(browser,query='')
 page.wait_for_timeout(1500)
 r=page.evaluate("""()=>({ok:__test.renderer.info.render.drawCalls>100,initial:FlipBros.initialBackend,backend:FlipBros.backend,draws:__test.renderer.info.render.drawCalls})""")
 notes['graphics']=r;page.screenshot(path=str(ROOT/'verified-default.png'));context.close();return r
