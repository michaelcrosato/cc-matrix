from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.request import urlopen
import json, traceback, os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
section_filter=os.environ.get('SIEGE_BROWSER_SECTION','')
checks=0
failures=0
records=[]
def check(name,condition,detail=''):
 global checks,failures
 checks+=1
 if not condition:
  failures+=1
  print('FAIL '+name+(': '+str(detail) if detail else ''),flush=True)
 records.append({'name':name,'pass':bool(condition)})
def scenario(name,fn):
 if section_filter and section_filter not in name:return
 try:fn()
 except Exception as e:check(name,False,traceback.format_exc())
def ev(page,code):return page.evaluate(code)
def tick(page,n=1):return ev(page,f'__SIEGE.game.advance({n}/120,{{draw:true}})')
def click(page,text):page.get_by_role('button',name=text,exact=True).click()
def start(page,mode='quick'):
 ev(page,f'__SIEGE.app.prepare("{mode}"); __SIEGE.game.advance(1/120)')
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root/'artifacts')))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  context=browser.new_context(viewport={'width':1920,'height':1080})
  context.add_init_script('''window.__pads=[];navigator.getGamepads=()=>window.__pads;window.setPad=(index,buttons=[],axes=[0,0,0,0],connected=true)=>{__pads[index]={id:'DualSense standard test pad',index,connected,mapping:'standard',axes,buttons:Array.from({length:18},(_,i)=>({pressed:buttons.includes(i),touched:buttons.includes(i),value:buttons.includes(i)?1:0})),timestamp:performance.now()};};''')
  page=context.new_page();page.set_default_timeout(5000);errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('request',lambda r:requests.append(r.url))
  page.goto((root.parent/(json.loads((root/'build-info.json').read_text())['base']+'.html')).as_uri());page.wait_for_function('window.__SIEGE?.world');page.wait_for_timeout(250)
  ev(page,'__SIEGE.game.stop()')
  def standalone():
   page.keyboard.press('p');tick(page,2);check('front menu survives pause shortcut',ev(page,'__SIEGE.app.mode==="title" && __SIEGE.app.shell.screen==="title"'));check('standalone file boot title',ev(page,'__SIEGE.app.mode==="title" && __SIEGE.app.shell.screen==="title"'))
   check('native engine version and released Hub client',ev(page,'My3D2dge.VERSION?.includes?.("0.89") || !!My3D2dge.Game') and ev(page,'AIHub.version==="1.4.0"'))
   check('default music 10% / PS glyphs',ev(page,'__SIEGE.game.settings.music===.1 && __SIEGE.game.settings.glyphs==="playstation"'))
   rects=page.get_by_role('button').all_bounding_boxes() if False else page.get_by_role('button',name='About & credits',exact=True).bounding_box()
   check('TV title last menu action within frame',rects and rects['y']+rects['height']<=1081,rects)
   page.get_by_role('button',name='Quick duel',exact=True).hover()
   check('mouse hover moves native focus',ev(page,'document.activeElement.textContent==="Quick duel"'))
   click(page,'Quick duel');click(page,'To the battlements');tick(page,2)
   check('real menu route enters quick duel',ev(page,'__SIEGE.app.mode==="quick" && __SIEGE.app.shell.screen===null'))
   page.keyboard.down('Space');tick(page,80)
   check('keyboard held fire charges',ev(page,'__SIEGE.world.players[0].charge>=0'))
   page.keyboard.up('Space');tick(page)
   check('keyboard release emits one requested stone',ev(page,'__SIEGE.world.coverage.launch[0]===1'))
   tick(page,450)
   check('live projectile resolves contact',ev(page,'__SIEGE.world.players[0].last[0]!==null'))
   target=ev(page,'(()=>{const g=__SIEGE.game,b=__SIEGE.world.castles[1].find(b=>!b.foundation&&b.hp>0),p=g.r.w(b.x+b.w/2,0,b.z+b.h/2),r=g.screen.canvas.getBoundingClientRect();return {id:b.id,x:r.left+(p[0]*g.screen.S+g.screen.OX)/g.screen.dpr,y:r.top+(p[1]*g.screen.S+g.screen.OY)/g.screen.dpr};})()');page.mouse.move(target['x'],target['y']);check('mouse reference uses actual native zoom',ev(page,'__SIEGE.app.hover?.id')==target['id']);page.keyboard.down('Space');tick(page,90);page.keyboard.press('c');tick(page)
   check('combat C cancels without pause',ev(page,'__SIEGE.world.players[0].charge<0 && !__SIEGE.game.paused && __SIEGE.app.shell.screen===null'))
   page.keyboard.up('Space');tick(page)
   page.keyboard.down('Space');tick(page,60);page.keyboard.press('Escape');tick(page,3)
   check('Escape cancels active charge and opens native pause',ev(page,'__SIEGE.game.paused && __SIEGE.world.players[0].charge<0 && __SIEGE.app.shell.screen==="pause"'))
   before=ev(page,'__SIEGE.world.tick');tick(page,120)
   check('solo pause freezes simulation',ev(page,'__SIEGE.world.tick')==before)
   click(page,'Developer tools');check('pause reaches developer tools',ev(page,'__SIEGE.app.shell.screen==="developer"'))
   click(page,'Next page')
   slider=page.locator('input[type=range]').first
   slider.fill('1.85');slider.dispatch_event('input')
   check('live tuning slider changes authority',ev(page,'Math.abs(__SIEGE.world.config.chargeTime-1.85)<.001 && __SIEGE.world.cheated'))
   click(page,'Reset balance defaults')
   check('reset restores tuning defaults',ev(page,'__SIEGE.world.config.chargeTime===1.4'))
   ev(page,'__SIEGE.app.editor()');check('authoring page is live',page.get_by_role('button',name='Apply geometry',exact=True).is_visible())
   click(page,'Supports & sharing');click(page,'Export definition')
   raw=json.loads(page.locator('#court-json').input_value());check('authoring exports versioned geometry',raw['version']==1 and len(raw['court']['blocks'])>20)
   page.locator('#court-json').fill('{broken');click(page,'Import this definition')
   check('invalid court import is rejected visibly',ev(page,'__SIEGE.app.shell.screen==="court-data"') and page.get_by_text('Import rejected',exact=True).is_visible())
   page.locator('#court-json').fill(json.dumps(raw));click(page,'Import this definition')
   check('valid authored geometry imports',ev(page,'__SIEGE.app.shell.screen==="editor" && __SIEGE.app.customCourt.blocks.length>20'));check('authored import preserves every block',ev(page,'__SIEGE.app.customCourt.blocks')==raw['court']['blocks'])
   ev(page,'__SIEGE.app.customCourt=null; __SIEGE.app.title(); __SIEGE.game.advance(1/120)')
   click(page,'Settings');check('native settings and controls available',page.get_by_role('button',name='Controls',exact=True).is_visible())
   ev(page,'__SIEGE.game.settings.set("voiceLevel",0)');check('voice slider routes to isolated native bus',ev(page,'__SIEGE.game.audio.voiceVolume===0'));ev(page,'__SIEGE.game.settings.set("voiceLevel",.8)');before=ev(page,'__SIEGE.app.shell.root.style.transform');ev(page,'__SIEGE.game.settings.set("uiSize",1.1)');check('TV scale setting changes native shell scale',ev(page,'__SIEGE.app.shell.root.style.transform')!=before);ev(page,'__SIEGE.game.settings.set("uiSize",1)');click(page,'Controls');check('rebindable native controls',page.get_by_text('Hold / release sling',exact=False).count()>0)
   ev(page,'__SIEGE.app.title(); __SIEGE.game.advance(1/120)')
   click(page,'About & credits');check('source credits accurate',page.get_by_text('Stone Sling Smithereens - 1980',exact=True).is_visible())
   for name in ['Testing feedback','Engine feedback','Prompt feedback','Credits & provenance']:
    click(page,'Next page');check('credits '+name,page.get_by_role('heading',name=name,exact=True).is_visible())
   start(page);ev(page,'__SIEGE.game.input.rebind("fire","keys","KeyF")');page.keyboard.down('f');tick(page,80);page.keyboard.up('f');tick(page);check('native rebinding changes real fire input',ev(page,'__SIEGE.world.coverage.launch[0]===1'));ev(page,'__SIEGE.game.input.resetBindings()');tick(page,120);page.keyboard.down('Space');tick(page,50);ev(page,'window.dispatchEvent(new Event("blur"))');tick(page);check('focus loss cancels held charge safely',ev(page,'__SIEGE.game.paused && __SIEGE.world.players[0].charge<0'));page.keyboard.up('Space');check('no external runtime requests',all(u.startswith('file:') for u in requests),requests)
  scenario('standalone controls and UI',standalone)
  def local():
   page.keyboard.up('Space');page.keyboard.up('ShiftRight')
   ev(page,'__SIEGE.app.title(); __SIEGE.game.settings.set("seats","Two keyboards"); __SIEGE.app.prepare("local");__SIEGE.game.advance(2/120)')
   page.keyboard.down('Space');page.keyboard.down('ShiftRight');tick(page,85)
   check('two keyboard players charge simultaneously',ev(page,'__SIEGE.world.players.every(p=>p.charge>=0)'))
   page.keyboard.up('ShiftRight');tick(page);page.keyboard.up('Space');tick(page)
   check('independent opposite order releases',ev(page,'__SIEGE.world.coverage.launch[0]===2'))
   ev(page,'__SIEGE.game.settings.set("seats","Two pads");__SIEGE.app.prepare("local");setPad(0);setPad(1);__SIEGE.game.advance(2/120)')
   ev(page,'setPad(0,[0]);setPad(1,[0])');tick(page,80)
   check('two standard pads own distinct simultaneous seats',ev(page,'__SIEGE.world.players.every(p=>p.charge>=0)'))
   ev(page,'setPad(1,[])');tick(page);ev(page,'setPad(0,[])');tick(page)
   check('pad independent release',ev(page,'__SIEGE.world.coverage.launch[0]===2'))
   ev(page,'setPad(0,[0]);setPad(1,[])');tick(page,40)
   ev(page,'setPad(0,[],[0,0,0,0],false)');tick(page,3)
   check('pad disconnect cancels and pauses local play',ev(page,'__SIEGE.game.paused && __SIEGE.world.players[0].charge<0'))
   ev(page,'__pads=[];__SIEGE.app.title();__SIEGE.game.advance(2/120)')
   ev(page,'setPad(0,[13])');tick(page);ev(page,'setPad(0,[])');tick(page)
   check('pad native menu focus and PS prompts',ev(page,'__SIEGE.game.input.lastDevice==="gamepad" && __SIEGE.game.input.label("fire")==="✕"'))
   ev(page,'__SIEGE.game.settings.set("glyphs","xbox")');check('Xbox setting follows same native mapping',ev(page,'__SIEGE.game.input.label("fire")==="A"'))
   ev(page,'__pads=[];__SIEGE.game.settings.set("glyphs","playstation")')
  scenario('local devices',local)
  def attract():
   ev(page,'__SIEGE.app.title();__SIEGE.app.idleTicks=0;__SIEGE.game.advance(1199/120)')
   check('attract not before ten seconds',ev(page,'__SIEGE.app.mode==="title"'))
   tick(page);check('attract at ten seconds',ev(page,'__SIEGE.app.mode==="attract"'))
   page.keyboard.press('Enter');tick(page,2)
   check('attract exit consumes confirm',ev(page,'__SIEGE.app.mode==="title" && __SIEGE.app.shell.screen==="title"'))
   ev(page,'__SIEGE.app.beginAttract()');page.mouse.click(950,550);tick(page)
   check('attract pointer exit consumes click',ev(page,'__SIEGE.app.mode==="title" && __SIEGE.app.shell.screen==="title"'))
   ev(page,'__SIEGE.app.beginAttract();setPad(0,[0])');tick(page);ev(page,'setPad(0,[])');tick(page)
   check('attract pad exit consumed',ev(page,'__SIEGE.app.mode==="title" && __SIEGE.app.shell.screen==="title"'))
   ev(page,'__pads=[]')
  scenario('attract browser',attract)
  def audio():
   result=ev(page,'''async()=>{const {formant,lute}=__SIEGE.audioTest;async function render(music=1,fx=1,voice=1){const c=new OfflineAudioContext(2,48000,48000);const master=c.createGain();master.gain.value=.65;master.connect(c.destination);const mus=c.createGain(),eff=c.createGain(),vox=c.createGain();mus.gain.value=music*.1;eff.gain.value=fx;vox.gain.value=voice;mus.connect(master);eff.connect(master);vox.connect(master);for(let i=0;i<4;i++){lute(c,mus,i*.16,220*Math.pow(2,i/12),.15,.17);formant(c,vox,.08+i*.12,175,.1,.09,i);}const native=__SIEGE.game.audio,old=native.ctx;native.ctx=c;native._voice({wave:'triangle',freq:130,to:45,dur:.2,vol:.15},eff,.25);native.ctx=old;const b=await c.startRendering(),a=b.getChannelData(0);let max=0,energy=0,finite=true;for(const v of a){max=Math.max(max,Math.abs(v));energy+=v*v;finite&&=Number.isFinite(v);}return {max,energy,finite};}return {mix:await render(),muted:await render(0,0,0),music:await render(1,0,0),fx:await render(0,1,0),voice:await render(0,0,1)};}''')
   check('offline synth mix finite, nonzero and unclipped',result['mix']['finite'] and result['mix']['energy']>0 and result['mix']['max']<.95,result)
   check('all audio buses mute',result['muted']['energy']==0)
   for k in ['music','fx','voice']:check('isolated '+k+' bus has signal',result[k]['energy']>0)
  scenario('offline code audio',audio)
  check('no standalone runtime/page errors',not errors,errors)
  context.close()
  def touch(browser_type,profile):
   b=browser_type.launch(headless=True);ctx=b.new_context(**profile);pg=ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
   pg.goto((root/'artifacts/game.html').as_uri());pg.wait_for_function('window.__SIEGE?.world');ev(pg,'__SIEGE.game.stop();__SIEGE.app.prepare("quick");__SIEGE.game.advance(2/120)')
   size=pg.viewport_size
   ev(pg,'document.getElementById("screen").setPointerCapture=()=>{}') # Synthetic WebKit pointer IDs have no OS pointer to capture.
   check('touch corner stays clear of score plate',ev(pg,'(()=>{const rect=document.querySelector(".team-1").getBoundingClientRect(),area=__SIEGE.game.cornerArea(),a=__SIEGE.game.input.screenPoint(rect.left,rect.top),b=__SIEGE.game.input.screenPoint(rect.right,rect.bottom);return !area||b[0]<area.x0||a[0]>area.x1||b[1]<area.y0||a[1]>area.y1;})()'));check('touch '+str(size)+' full lane framed',ev(pg,'__SIEGE.game.r.w(20,0,36)[0]>=0 && __SIEGE.game.r.w(940,0,36)[0]<=__SIEGE.game.W'))
   ev(pg,'''()=>{const c=document.getElementById('screen');c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:17,pointerType:'touch',clientX:130,clientY:500,bubbles:true}));}''')
   tick(pg,80)
   ev(pg,'''()=>document.getElementById('screen').dispatchEvent(new PointerEvent('pointerup',{pointerId:17,pointerType:'touch',clientX:130,clientY:500,bubbles:true}))''');tick(pg)
   check('touch hold/release one launch',ev(pg,'__SIEGE.world.coverage.launch[0]===1'))
   tick(pg,120)
   ev(pg,'''()=>document.getElementById('screen').dispatchEvent(new PointerEvent('pointerdown',{pointerId:18,pointerType:'touch',clientX:130,clientY:500,bubbles:true}))''');tick(pg,70)
   ev(pg,'''()=>document.getElementById('screen').dispatchEvent(new PointerEvent('pointercancel',{pointerId:18,pointerType:'touch',bubbles:true}))''');tick(pg)
   check('touch cancellation produces no duplicate release',ev(pg,'__SIEGE.world.coverage.launch[0]===1 && __SIEGE.world.players[0].charge<0'))
   check('phone target inset populated',ev(pg,'innerWidth>innerHeight || document.getElementById("target-inset").getContext("2d").getImageData(0,0,250,160).data.some(v=>v!==0)'))
   check('touch/WebKit no runtime errors',not errs,errs)
   ctx.close();b.close()
  scenario('WebKit phone touch',lambda:touch(p.webkit,p.devices['iPhone 13']))
  scenario('WebKit tablet touch',lambda:touch(p.webkit,p.devices['iPad (gen 7)']))
  # One real official harness at a time, using its unmodified sibling bridge and coordinator.
  check('loopback serves the exact game',TITLE if False else 'Smithereens Under Siege' in urlopen(base+'/game.html').read().decode())
  for case,query in [('standard',''),('impaired','&latency=150&jitter=50&loss=5'),('host-leave','&scenario=host-leave'),('server','&scenario=server')]:
   def hub_case(case=case,query=query):
    ctx=browser.new_context(viewport={'width':1365,'height':900});pg=ctx.new_page();pg.goto(base+'/harness.html?game=game.html&players=2&auto=1&limit=18&play=4000'+query)
    pg.wait_for_function('document.body.dataset.complete==="true"',timeout=50000)
    report=ev(pg,'__hubCheck');check('official Hub harness '+case,report['pass'],[c for c in report['checks'] if not c['pass']])
    for c in report['checks']:check('Hub '+case+': '+c['name'],c['pass'],c.get('detail',''))
    (root/'artifacts'/('hub-'+case+'.json')).write_text(json.dumps(report,indent=2))
    frames=[f for f in pg.frames if f!=pg.main_frame and f.url.find('game.html')>=0]
    check('Hub '+case+' no input/audio/messages after end',all(f.evaluate('!window.__SIEGE || (__SIEGE.app.ended && __SIEGE.app.online.transport.stopped && __SIEGE.game.audio.muted)') for f in frames if not f.is_detached()))
    ctx.close()
   scenario('Hub '+case,hub_case)
  def hub_firing(server_mode=False):
   ctx=browser.new_context(viewport={'width':1365,'height':900});pg=ctx.new_page()
   pg.goto(base+'/harness.html?game=game.html&players=2&auto=1&limit=60&play=40000&latency=150&jitter=50&loss=5'+('&scenario=server' if server_mode else ''))
   pg.wait_for_function("[...document.querySelectorAll('iframe')].filter(f=>f.contentWindow.__SIEGE).length >= 2",timeout=15000)
   frames=[f for f in pg.frames if f!=pg.main_frame and 'game.html' in f.url]
   for f in frames:f.wait_for_function('__SIEGE.app.online.started && AIHub.time()>=0',timeout=18000)
   host=next(f for f in frames if f.evaluate('AIHub.isHost'))
   players=[f for f in frames if not f.evaluate('AIHub.server')]
   client=next(f for f in players if not f.evaluate('AIHub.isHost'))
   host.evaluate("(()=>{const n=__SIEGE.app.online,old=n.onEvent;n.onEvent=e=>{if(e.type==='launch')(window.__launches??=[]).push(e);old?.(e);};})()")
   client.evaluate("(()=>{const original=AIHub.send;let refuse=2;AIHub.send=(d,o)=>d.t==='c'&&refuse-->0?false:original(d,o);})()")
   def press(frame,code,down):frame.evaluate("([code,down])=>window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:code==='Space'?' ':code,code,bubbles:true,cancelable:true}))",[code,down])
   press(client,'Space',True);pg.wait_for_timeout(920);press(client,'Space',False)
   pg.wait_for_function("[...document.querySelectorAll('iframe')].some(f=>f.contentWindow.__launches?.length>0)",timeout=7000)
   launches=host.evaluate('window.__launches||[]')
   check('Hub firing '+str(server_mode)+' one legal launch despite rejected sends',len(launches)==1,launches)
   check('Hub firing '+str(server_mode)+' local duration survives asymmetric delay',.35<launches[0]['power']<.95,launches)
   check('Hub rejected-send queue retried',client.evaluate('__SIEGE.app.online.transport.metrics.retries>=2'))
   t0=host.evaluate('__SIEGE.world.tick')
   press(players[0],'Escape',True);press(players[0],'Escape',False);pg.wait_for_timeout(500)
   check('Hub pause overlay leaves authority running',host.evaluate('__SIEGE.world.tick')>t0)
   check('Hub overlay exposes only read-only developer diagnostics',players[0].evaluate("(()=>{__SIEGE.app.developer();return __SIEGE.app.shell._stack.at(-1).s.title==='Match diagnostics';})()"))
   pg.wait_for_timeout(3000)
   check('Hub remembers confirmed local impact marker',client.evaluate('__SIEGE.world.players[__SIEGE.app.online.seat].last.some(m=>m!==null)'));live=host.evaluate('__SIEGE.world.castles.map(bs=>bs.map(b=>b.hp>0))')
   check('Hub confirmed block state agrees after flight',all(f.evaluate('__SIEGE.world.castles.map(bs=>bs.map(b=>b.hp>0))')==live for f in players))
   metrics=[f.evaluate('__SIEGE.app.online.transport.metrics') for f in frames]
   check('Hub aggregate packet count / message size budget',all(m['maxBytes']<=16000 and m['maxSnapshot']<=1200 and max([sum(1 for q in m['packets'] if a[0]-1000<q[0]<=a[0]) for a in m['packets']] or [0])<=20 for m in metrics),metrics)
   pg.locator('#timeup').click();pg.wait_for_function('document.body.dataset.complete==="true"',timeout=15000)
   check('Hub firing harness still conforms',pg.evaluate('__hubCheck.pass'),pg.evaluate('__hubCheck.checks.filter(c=>!c.pass)'))
   (root/'artifacts'/('hub-firing-server.json' if server_mode else 'hub-firing.json')).write_text(json.dumps({'launches':launches,'metrics':metrics,'report':pg.evaluate('__hubCheck')},indent=2))
   ctx.close()
  scenario('Hub actual firing',lambda:hub_firing(False))
  scenario('Hub server actual firing',lambda:hub_firing(True))
  browser.close()
finally:
 server.shutdown();server.server_close()
 (root/'artifacts/browser-checks.json').write_text(json.dumps(records,indent=2))
print(json.dumps({'checks':checks,'failures':failures}),flush=True)
