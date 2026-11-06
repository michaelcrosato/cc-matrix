from pathlib import Path
from playwright.sync_api import sync_playwright
import json, threading, http.server, functools, traceback, math
R=Path(__file__).resolve().parents[1]; NAME=R.name+'.html'; checks=[]; errors=[]; requests=[]
def check(name,fn):
 try:
  fn();checks.append({'name':name,'pass':True})
 except Exception as e:
  checks.append({'name':name,'pass':False,'error':str(e)});print('FAIL '+name+': '+str(e),flush=True)
def require(ok,message='assertion failed'):
 if not ok:raise AssertionError(message)
def ev(q,js):return q.evaluate(js)
def advance(q,seconds=.05):q.evaluate('(s)=>__game.advance(s,{draw:true})',seconds)
def fresh(q):
 q.goto((R/NAME).as_uri());q.wait_for_function('window.__game && IW.app.ui.screen === "title"');q.evaluate('__game.stop()')
def begin(q,seats='[0]'):
 q.evaluate(f'IW.app.begin("Normal",{seats},"campaign",1972);__game.advance(1/120)')
def pad(q,buttons=None,axes=None,n=0,connected=True):
 q.evaluate('(v)=>{while(__pads.length<=v.n)__pads.push(null);__pads[v.n]={index:v.n,id:"Test DualSense",connected:v.connected,mapping:"standard",axes:v.axes,buttons:Array.from({length:17},(_,i)=>({pressed:v.buttons.includes(i),touched:v.buttons.includes(i),value:v.buttons.includes(i)?1:0}))};}',{'n':n,'buttons':buttons or [],'axes':axes or [0,0,0,0],'connected':connected})
 advance(q)
def capture(q,name):q.evaluate('__game.advance(0,{draw:true})');q.screenshot(path=str(R/'evidence'/name),animations='disabled')
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
handler=functools.partial(Quiet,directory=str(R));server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler);threading.Thread(target=server.serve_forever,daemon=True).start();BASE=f'http://127.0.0.1:{server.server_port}'
PAD_SCRIPT='window.__pads=[];Object.defineProperty(navigator,"getGamepads",{value:()=>window.__pads});'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 context=b.new_context(viewport={'width':1920,'height':1080});context.add_init_script(PAD_SCRIPT)
 q=context.new_page();q.on('pageerror',lambda e:errors.append(str(e)));q.on('request',lambda r:requests.append(r.url));fresh(q)
 check('file package boots original title and native engine',lambda:require(ev(q,'document.title===IW.TITLE && My3D2dge.version==="0.89.1" && AIHub.version==="1.4.0"')))
 def title_fit():
  boxes=q.locator('.esh-ttl .esh-btns button').first.bounding_box();require(q.get_by_role('button',name='About / Credits',exact=True).bounding_box()['y']<1000);require(q.get_by_role('button',name='Play',exact=True).is_visible())
 check('all title actions fit the 1080p frame',title_fit);capture(q,'title.png')
 check('fresh music profile is ten percent',lambda:require(ev(q,'__game.settings.music === .1 && __game.audio.musicVolume === .1')))
 def keyboard_menus():
  q.keyboard.press('Enter');advance(q);require(ev(q,'IW.app.ui.screen==="setup"'))
  q.keyboard.press('ArrowDown');advance(q);q.keyboard.press('Enter');advance(q);require(ev(q,'IW.app.world.config.difficulty==="Normal" && __game.sceneName==="play"'))
 check('keyboard-only title to Normal play',keyboard_menus)
 def aim_standing():
  begin(q);q.keyboard.down('ArrowRight');advance(q,.1);q.keyboard.up('ArrowRight');advance(q,.01);require(ev(q,'IW.app.world.players[0].m.x===1 && IW.app.world.players[0].m.y===11 && IW.app.world.players[0].aim===0'),'arrow aiming moved player')
 check('keyboard arrows aim without movement',aim_standing)
 def keyboard_move():
  q.keyboard.down('KeyD');advance(q,.3);q.keyboard.up('KeyD');advance(q,.3);require(ev(q,'IW.app.world.players[0].m.x>1 && !IW.app.world.players[0].m.moving'))
 check('WASD motion and release settle on grid',keyboard_move)
 def mouse():
  begin(q);loc=ev(q,'(()=>{const s=__game.screen,c=s.canvas.getBoundingClientRect(),a=__game.r.w(IW.world(8),IW.world(11),0);return [c.left+(a[0]*s.S+s.OX)/s.dpr,c.top+(a[1]*s.S+s.OY)/s.dpr]})()');q.mouse.move(*loc);q.mouse.down();advance(q,.04);q.mouse.up();advance(q,.01);require(ev(q,'IW.app.world.players[0].aim===0 && IW.app.world.players[0].shots===1'))
 check('mouse selects visible cardinal lane and fires',mouse)
 def pause():
  q.keyboard.press('Escape');advance(q);require(ev(q,'__game.paused && IW.app.ui.screen==="pause"'));t=ev(q,'IW.app.world.tick');advance(q,1);require(ev(q,'IW.app.world.tick')==t);q.keyboard.press('Escape');advance(q);require(ev(q,'!__game.paused && !IW.app.ui.screen'))
 check('native pause freezes, navigates back and resumes',pause)
 def developer():
  ev(q,'__game.pause();__game.advance(.02);__game.debug.dev()');slider=q.get_by_role('slider',name='player Speed',exact=True);slider.evaluate('(el)=>{el.value=5.5;el.dispatchEvent(new Event("input",{bubbles:true}))}');require(ev(q,'IW.app.world.tuning.playerSpeed===5.5 && IW.app.world.practice'))
  q.get_by_role('button',name='Next tuning page',exact=True).click();require(q.get_by_role('slider',name='hopper Speed',exact=True).is_visible())
  # Every tuning page is native keyboard/controller-addressable.
  for _ in range(4):q.get_by_role('button',name='Next tuning page',exact=True).click()
  q.get_by_role('button',name='Reset to defaults',exact=True).click();require(ev(q,'IW.app.world.tuning.playerSpeed===4 && __game.timeScale===1 && !IW.app.world.invulnerable'))
  ev(q,'IW.app.debugGrid=true');capture(q,'developer.png');q.get_by_role('button',name='Resume',exact=True).click();advance(q)
 check('native developer live tuning, paging, Practice and reset',developer)
 def rebinding():
  begin(q);ev(q,'__game.menu("controls");__game.advance(.02)');require(q.get_by_role('dialog').is_visible());r=ev(q,'__game.input.rebind("fire","keys","KeyF")');require(not r,'native rebind rejected '+str(r));ev(q,'IW.app.ui.hide();__game.resume();IW.app.controls.clear()');q.keyboard.down('KeyF');advance(q,.04);q.keyboard.up('KeyF');advance(q,.02);require(ev(q,'IW.app.world.players[0].shots===1'));ev(q,'__game.input.resetBindings()')
 check('native Controls and real rebound fire action',rebinding)
 def pad_path():
  ev(q,'IW.app.title();__game.advance(.01)');pad(q,[0]);pad(q,[]);require(ev(q,'IW.app.ui.screen==="setup"'));pad(q,[13]);pad(q,[]);pad(q,[0]);pad(q,[]);require(ev(q,'__game.sceneName==="play" && IW.app.world.config.difficulty==="Normal"'))
  pad(q,[7],[.8,0,0,-.8]);advance(q,.3);pad(q,[]);require(ev(q,'IW.app.world.players[0].travel>0 && IW.app.world.players[0].shots>0 && __game.input.lastDevice==="gamepad"'))
  require(ev(q,'__game.input.label("confirm")==="✕"'));ev(q,'__game.settings.set("glyphs","xbox")');require(ev(q,'__game.input.label("confirm")==="A"'))
  pad(q,[8,9]);require(ev(q,'!__game.paused'),'reserved chord paused');pad(q,[]);pad(q,[9]);pad(q,[]);require(ev(q,'__game.paused'));ev(q,'IW.app.ui.hide();__game.resume()');pad(q,[],[.8,0,0,0]);pad(q,[],connected=False);require(ev(q,'__game.paused && __game.pauseReason==="controller"'))
 check('standard pad boot/play/glyphs/chord/disconnection',pad_path)
 def couch():
  ev(q,'IW.app.coopMode="keyboard-pad"');begin(q,'[0,1]');pad(q,[],[-.8,0,0,0]);advance(q,.3);pad(q,[]);require(ev(q,'IW.app.world.players[0].travel===0 && IW.app.world.players[1].travel>0'),'pad leaked to both seats')
  q.keyboard.down('KeyW');advance(q,.3);q.keyboard.up('KeyW');advance(q,.3);require(ev(q,'IW.app.world.players[0].travel>0'))
  ev(q,'IW.app.coopMode="pads"');pad(q,[],n=1);begin(q,'[0,1]');pad(q,[],[.8,0,0,0],n=0);pad(q,[],[-.8,0,0,0],n=1);advance(q,.4);pad(q,[],n=0);pad(q,[],n=1);require(ev(q,'IW.app.world.players.every(p=>p.travel>0)'))
 check('simultaneous keyboard+pad and two-pad seat ownership',couch)
 def attract():
  ev(q,'window.__pads=[];IW.app.title();__game.advance(.01);IW.app.idle=0');before=ev(q,'JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))');advance(q,9.9);require(ev(q,'!IW.app.demo'));advance(q,.12);require(ev(q,'IW.app.demo && IW.app.world.config.context==="attract"'));advance(q,110);require(ev(q,'IW.app.demo && IW.app.world.players.length===2'));require(ev(q,'JSON.stringify(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))')==before,'attract wrote save')
  q.keyboard.down('Enter');advance(q,.03);q.keyboard.up('Enter');advance(q,.03);require(ev(q,'!IW.app.demo && IW.app.ui.screen==="title"'),'wake leaked to Play')
 check('ten-second attract timing, showcase loop, private storage and wake consumption',attract)
 def credits():
  ev(q,'__game.debug.credits(0)');require(q.get_by_role('heading',name='Source Information',exact=True).is_visible());ev(q,'__game.debug.credits(3)');require(q.get_by_role('heading',name='Testing Feedback',exact=True).is_visible());capture(q,'credits.png');ev(q,'IW.app.ui.hide();IW.app.title();__game.advance(.01)')
 check('source information and ordered feedback credits reachable',credits)
 def more_wakes():
  ev(q,'__game.debug.attract();__game.advance(.02)');pad(q,[0]);pad(q,[]);require(ev(q,'!IW.app.demo && IW.app.ui.screen==="title"'),'pad wake leaked');ev(q,'__game.debug.attract();__game.advance(.02)');q.mouse.down();advance(q,.02);q.mouse.up();advance(q,.02);require(ev(q,'!IW.app.demo && IW.app.ui.screen==="title"'),'mouse wake leaked')
 check('pad and mouse wake attract without activating title actions',more_wakes)

 def comfort_audio():
  begin(q);ev(q,'__game.settings.set("music",.23);__game.settings.set("motion",true);__game.settings.set("voices",.3)');require(ev(q,'__game.reduceMotion && __game.audio.voiceVolume===.3'));q.keyboard.press('Space');advance(q,.05);require(ev(q,'!!__game.audio.ctx && __game.audio.musicVolume===.23'));levels=ev(q,'(()=>{const a=__game.audio;return {music:a.bus("music").gain.value,voice:a.bus("voice").gain.value}})()');require(abs(levels['music']-.23)<.001 and abs(levels['voice']-.3)<.001,str(levels))
 check('actual unlocked music and separate voice buses respect saved comfort settings',comfort_audio)
 # Render a representative synthesized effect and gibberish envelope to finite PCM.
 def offline_audio():
  data=q.evaluate('''async()=>{const c=new OfflineAudioContext(1,48000*20,48000),bus=c.createGain();bus.gain.value=.7;bus.connect(c.destination);const a=Object.create(Object.getPrototypeOf(__game.audio));a.ctx=c;a._waves={};a._rnd=()=>.3;a._noise=c.createBuffer(1,48000,48000);const noise=a._noise.getChannelData(0);for(let i=0;i<noise.length;i++)noise[i]=Math.sin(i*328.73)*.5;let t=0;for(const fx of Object.values(IW.FX)){a._voice(fx,bus,t);t+=(fx.dur||.15)+.1;}const b=await c.startRendering(),v=b.getChannelData(0);let peak=0,energy=0,bad=0,tail=0;for(let i=0;i<v.length;i++){if(!Number.isFinite(v[i]))bad++;peak=Math.max(peak,Math.abs(v[i]));energy+=v[i]*v[i];if(i>48000*18)tail=Math.max(tail,Math.abs(v[i]));}return{peak,energy,bad,tail,effects:Object.keys(IW.FX).length,duration:t}}''');require(data['bad']==0 and 0<data['peak']<1 and data['energy']>0 and data['tail']<.0001,str(data));(R/'evidence/audio.json').write_text(json.dumps(data))
 check('offline PCM is finite nonzero nonclipping and releases to silence',offline_audio)
 def persistence():
  fresh(q);require(ev(q,'__game.settings.music===.23 && __game.settings.voices===.3 && __game.reduceMotion'),'settings round-trip failed');begin(q);q.evaluate('IW.app.world.players[0].protect=0;IW.app.world.players[0].lives=1;IW.app.world.damage(IW.app.world.players[0]);__game.advance(.02)');require(ev(q,'IW.app.ui.screen==="results"'));q.get_by_role('button',name='Retry chamber · Practice',exact=True).click();advance(q,.02);require(ev(q,'IW.app.world.practice && IW.app.world.players[0].lives===3 && IW.app.world.phase==="Entry"'))
 check('versioned settings reload and defeat/retry UI restore a playable checkpoint',persistence)

 def visuals():
  begin(q,'[0,1]');ev(q,'__game.debug.setup(w=>{w.loadRoom(2);w.phase="Hunt";w.queue.forEach(s=>s.done=true);w.players[0].m.place(8,3);w.players[1].m.place(18,8);w.spawn("stalker",[9,3]).warning=0;w.spawn("skitter",[15,7]).warning=0;w.spawn("hopper",[3,7]).warning=0;w.bell(w.posts[0]);});__game.advance(.02)');capture(q,'bell-choir.png');ev(q,'__game.debug.setup(w=>{w.loadRoom(5);w.enemies=[];w.queue.forEach(s=>s.done=true);w.phase="Intrusion";w.nextWizard(.01);});__game.advance(1.3)');capture(q,'finale.png')
 check('native art crowded bell scene and Wizard render without errors',visuals)
 check('no runtime errors and no audio or external asset requests',lambda:require(not errors and not ev(q,'__game.errors.length') and all(u.startswith('file:') for u in requests),str(errors)))
 context.close();b.close()
 # Touch approximation through WebKit, with two independent pointer contacts and cancellation.
 b=p.webkit.launch(headless=True);ctx=b.new_context(**p.devices['iPhone 13']);touch=ctx.new_page();touch.on('pageerror',lambda e:errors.append(str(e)));fresh(touch)
 def touch_test():
  touch.get_by_role('button',name='Play',exact=True).tap();touch.get_by_role('button',name='Gentle — 5 lives, longer warnings',exact=True).tap();advance(touch,.1)
  touch.dispatch_event('#screen','pointerdown',{'pointerId':51,'pointerType':'touch','clientX':65,'clientY':640,'buttons':1});touch.dispatch_event('#screen','pointermove',{'pointerId':51,'pointerType':'touch','clientX':110,'clientY':640,'buttons':1});touch.dispatch_event('#screen','pointerdown',{'pointerId':52,'pointerType':'touch','clientX':310,'clientY':640,'buttons':1});touch.dispatch_event('#screen','pointermove',{'pointerId':52,'pointerType':'touch','clientX':310,'clientY':590,'buttons':1});advance(touch,.4);require(ev(touch,'IW.app.world.players[0].travel>0 && IW.app.world.players[0].shots>0 && IW.app.controls.contacts.size===2'));touch.dispatch_event('#screen','pointercancel',{'pointerId':51,'pointerType':'touch'});touch.dispatch_event('#screen','pointercancel',{'pointerId':52,'pointerType':'touch'});advance(touch,.3);require(ev(touch,'IW.app.controls.contacts.size===0 && IW.app.controls.touchMove.every(x=>x===0) && IW.app.controls.touchAim.every(x=>x===0)'));capture(touch,'touch-portrait.png')
 check('WebKit phone multi-contact invisible sticks, fire and cancellation',touch_test)
 def framing():
  require(ev(touch,'(()=>{const a=__game.r.w(0,0,0),b=__game.r.w(336,208,0);return a[0]>=0 && b[0]<=__game.W && a[1]>30 && b[1]<__game.H-60})()'))
  touch.set_viewport_size({'width':844,'height':390});touch.wait_for_function('__game.screen.portrait === false');advance(touch,.05);capture(touch,'touch-landscape.png');require(ev(touch,'(()=>{const a=__game.r.w(0,0,0),b=__game.r.w(336,208,0);return a[0]>=0 && b[0]<=__game.W && a[1]>30 && b[1]<__game.H-40})()'))
 check('touch full-arena framing both orientations',framing)
 def touch_context():
  touch.evaluate('IW.app.begin("Normal");__game.advance(.02);IW.app.world.players[0].m.place(2,4);__game.advance(.02,{draw:true})')
  point=touch.evaluate('(()=>{const s=__game.screen,c=s.canvas.getBoundingClientRect(),a=__game.r.w(IW.world(2),IW.world(2),0);return [c.left+(a[0]*s.S+s.OX)/s.dpr,c.top+(a[1]*s.S+s.OY)/s.dpr]})()');touch.touchscreen.tap(*point);advance(touch,.35);require(ev(touch,'IW.app.world.bells===1'),'aligned bell tap did not ring');touch.evaluate('__game.debug.attract();__game.advance(.02)');touch.touchscreen.tap(150,150);advance(touch,.03);require(ev(touch,'!IW.app.demo && IW.app.ui.screen==="title"'),'touch wake leaked')
 check('context-sensitive aligned bell tap and touch attract wake',touch_context)

 ctx.close();b.close()
 # Firefox uses this engine's Canvas 2D renderer; it needs no WebGL.
 b=p.firefox.launch(headless=True);fq=b.new_page();fq.on('pageerror',lambda e:errors.append(str(e)));fresh(fq);begin(fq);advance(fq,3)
 check('Firefox Canvas renderer playable without WebGL',lambda:require(ev(fq,'IW.app.world.phase==="Hunt" && __game.errors.length===0')));b.close()
 # Harness owns simulated peers; use only the server started above on an OS-selected port.
 b=p.chromium.launch(headless=True);hq=b.new_page(viewport={'width':1400,'height':900})
 harness=[]
 for scenario in ['standard','host-leave','server']:
  def run_harness(scenario=scenario):
   hq.goto(BASE+'/harness.html?game='+NAME+'&players=2&latency=150&jitter=50&loss=5&limit=12&auto=1&scenario='+scenario);hq.wait_for_function('document.body.dataset.complete === "true"',timeout=90000);data=ev(hq,'window.__hubCheck');harness.append(data);require(data['pass'],json.dumps(data));frames=[f for f in hq.frames[1:] if NAME in f.url];require(len(frames)>=(1 if scenario=='host-leave' else 2),'wrong harness page');
   for f in frames:require(f.evaluate('document.title')=='The Incurable Wizard','wrong peer game')
  check('Hub adverse-network lifecycle '+scenario,run_harness)
 (R/'evidence/hub-harness.json').write_text(json.dumps(harness,indent=2))
 def shared_combat():
  hq.goto(BASE+'/harness.html?game='+NAME+'&players=2&latency=150&jitter=50&loss=5&limit=120')
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).length===2 && Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.IW?.app.network.info)')
  hq.locator('#release').click()
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.IW?.app.network.started && f.contentWindow.AIHub.time()>=0)')
  peers=[f for f in hq.frames[1:] if NAME in f.url];host=next(f for f in peers if f.evaluate('AIHub.isHost'));client=next(f for f in peers if not f.evaluate('AIHub.isHost'))
  host.evaluate('''(()=>{const w=IW.app.world;w.phase="Hunt";w.phaseTime=0;w.queue.forEach(s=>s.done=true);w.enemies=[];w.players[0].m.place(1,11);w.players[1].m.place(19,11);w.spawn("hopper",[4,11]).warning=0;__game.input.hold("aimRight");__game.input.hold("fire");})()''')
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.IW.app.world.totalKills===1)')
  host.evaluate('__game.input.clear()');scores=[f.evaluate('IW.app.world.score') for f in peers];require(scores==[150,150],str(scores))
  host.evaluate('(()=>{const w=IW.app.world;w.familiar=null;w.phase="Hunt";w.spawn("hopper",[16,11]).warning=0;})()');client.evaluate('__game.input.hold("aimLeft");__game.input.hold("fire")')
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.IW.app.world.totalKills===2)');client.evaluate('__game.input.clear()');require(all(f.evaluate('IW.app.world.players.every(p=>p.kills===1)') for f in peers),'both seats did not contribute')
  # Union visibility is authored on the host, then rendered from identical snapshots.
  host.evaluate('(()=>{const w=IW.app.world;w.phase="Entry";w.phaseDelay=999;w.familiar=null;w.enemies=[];w.players[0].m.place(1,3);w.players[1].m.place(19,11);w.spawn("stalker",[5,3]).warning=0;})()')
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>{const w=f.contentWindow.IW.app.world;return w.enemies.length===1 && w.enemies[0].kind==="stalker" && !w.visible(w.enemies[0])})')
  host.evaluate('IW.app.world.players[1].m.place(5,5)');hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>{const w=f.contentWindow.IW.app.world;return w.visible(w.enemies[0])})')
  tick=host.evaluate('IW.app.world.tick');client.evaluate('__game.pause("menu")');hq.wait_for_function('(t)=>document.querySelector("iframe").contentWindow.IW.app.world.tick>t+20',arg=tick);require(not host.evaluate('__game.paused'),'client menu paused host');client.evaluate('IW.app.ui.hide();__game.resume()')
  host.evaluate('(()=>{const w=IW.app.world;w.loadRoom(5);w.queue.forEach(s=>s.done=true);w.enemies=[];w.beginFamiliar();w.familiar.m.place(4,11);__game.input.hold("aimRight");__game.input.hold("fire");})()')
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.IW.app.world.earnedNextMultiplier===2)');host.evaluate('__game.input.clear()')
  for f in peers:f.evaluate('''window.__campaignPilot=setInterval(()=>{const n=IW.app.network;if(n.ended){clearInterval(window.__campaignPilot);return;}const w=IW.app.world,p=w.players.find(p=>p.seat===AIHub.me),c=IW.bot(w,p),dirs=["Right","Down","Left","Up"];for(let i=0;i<4;i++){__game.input.hold("move"+dirs[i],c.move===i);__game.input.hold("aim"+dirs[i],c.aim===i);}__game.input.hold("fire",c.fire);},60)''')
  hq.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.IW.app.network.ended)',timeout=60000)
  states=[f.evaluate('({score:IW.app.world.score,status:IW.app.world.status,wizard:IW.app.world.wizardHits,network:__game.debug.snapshot().network,audio:IW.app.audio.stopped})') for f in peers];require(all(s['status']=='victory' and s['wizard']==3 and s['audio'] for s in states),str(states));require(states[0]['score']==states[1]['score'],'terminal snapshots disagree')
  sent=[s['network']['sent'] for s in states];hq.evaluate('()=>new Promise(resolve=>setTimeout(resolve,400))');require(sent==[f.evaluate('IW.app.network.sent') for f in peers],'traffic after end');(R/'evidence/shared-combat.json').write_text(json.dumps(states,indent=2))
 check('two peers share kills, cloak, local menus, familiar, all finale hits and terminal state',shared_combat)
 b.close()
server.shutdown();server.server_close()
result={'count':len(checks),'failed':sum(not c['pass'] for c in checks),'checks':checks,'runtimeErrors':errors}
(R/'evidence/browser-results.json').write_text(json.dumps(result,indent=2))
