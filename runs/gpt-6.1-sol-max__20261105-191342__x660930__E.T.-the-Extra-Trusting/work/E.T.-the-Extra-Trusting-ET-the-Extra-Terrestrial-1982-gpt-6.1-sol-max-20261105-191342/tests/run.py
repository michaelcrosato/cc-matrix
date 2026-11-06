"""Quiet verification. One browser; ephemeral loopback server; no screenshots by default."""
import argparse
import functools
import http.server
import json
import os
from pathlib import Path
import socketserver
import threading
import time
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
os.environ['TMPDIR']='.'
parser=argparse.ArgumentParser()
parser.add_argument('--group',default='all',choices=['all','journey','interface','network','hub'])
parser.add_argument('--visual',action='store_true')
args=parser.parse_args()
results=[]
errors=[]
def check(name,condition,detail=''):
    results.append({'name':name,'pass':bool(condition),'detail':detail})
    (ROOT/'test-progress.json').write_text(json.dumps(results,indent=2))
    if not condition:print('FAIL '+name+(': '+str(detail) if detail else ''),flush=True)
def run_case(name,fn):
    try:fn()
    except Exception as exc:
        detail={'name':name,'error':str(exc)}
        try:detail['page']=page.evaluate('({url:location.href,ui:window.__game?.ui,active:document.activeElement?.outerHTML,panel:document.getElementById("panel")?.getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll("#panel button")].map(e=>({text:e.textContent,box:e.getBoundingClientRect().toJSON(),at:document.elementFromPoint(e.getBoundingClientRect().x+e.getBoundingClientRect().width/2,e.getBoundingClientRect().y+e.getBoundingClientRect().height/2)?.outerHTML.slice(0,250)}))})')
        except Exception:pass
        (ROOT/'failure-debug.json').write_text(json.dumps(detail,indent=2))
        check(name,False,str(exc).splitlines()[0])
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class Server(socketserver.ThreadingMixIn,http.server.HTTPServer):
    daemon_threads=True
server=Server(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage']

def loaded(page,url=None,pause=False):
    page.goto(url or base+'/game.html?test=1',wait_until='load')
    page.wait_for_function('window.__game?.ready || !document.querySelector("#fatal")?.classList.contains("hidden")',timeout=90000)
    if not page.evaluate('!!window.__game?.ready'):raise RuntimeError(page.locator('#fatal-detail').inner_text())
    page.evaluate('window.__game.route("return-title")')
    if pause:page.evaluate('__game.test.pauseDrawing()')

def state(page):return page.evaluate('__game.state')
def begin(page):page.evaluate('__game.test.begin()')
def go(page,target,**opts):return page.evaluate('([target,opts])=>__game.test.driveTo(target,opts)',[target,opts])
def press(page,key):return page.evaluate('(key)=>__game.test.press(key)',key)
def advance(page,seconds,input=None):return page.evaluate('([t,i])=>__game.test.advance(t,i)',[seconds,input or {}])

def journey(page):
    begin(page)
    c=page.evaluate('__game.test.constants')
    check('WebGPU backend selected',page.evaluate('__game.renderer')=='WebGPU',page.evaluate('__game.renderer'))
    page.wait_for_function('__game.world.renderer.info.render.drawCalls > 0',timeout=60000)
    page.evaluate('__game.test.pauseDrawing()')
    check('GPU draws the world',page.evaluate('__game.world.renderer.info.render.triangles')>1000)
    for index in [0,2]:
        r=go(page,c['PARTS'][index]);check('Ride to '+c['PARTS'][index]['name'],r['distance']<3.6,r)
        s=press(page,'action');check('Borrow '+c['PARTS'][index]['name'],s['parts'][index],s['parts'])
    s=press(page,'candy');check('Candy creates a Rapier body',len(s['candies'])==1 and s['players'][0]['candy']==2,s['candies'])
    initial=s['candies'][0]
    s=advance(page,.65);check('Thrown candy follows physics',len(s['candies'])>0 and abs(s['candies'][0]['x']-initial['x'])+abs(s['candies'][0]['z']-initial['z'])>1)
    r=go(page,{'x':-18,'z':-6});check('Ride to sleeping roots',r['distance']<3,r)
    s=press(page,'glow');check('Glow grows the creek bridge',s['bridge'] and s['stats']['glows']>0,s)
    r=go(page,c['PARTS'][1]);check('Cross the grown bridge with collision',r['distance']<3.6 and r['position']['z']<-17,r)
    s=press(page,'action');check('All three transmitter parts collected',all(s['parts']),s['parts'])
    check('Adventure events retain increasing sequence IDs',all(s['events'][i]['id']<s['events'][i+1]['id'] for i in range(len(s['events'])-1)))
    for i,f in enumerate(c['FLOWERS']):
        r=go(page,f);check('Ride to flower '+str(i+1),r['distance']<4,r)
        advance(page,2.3)
        s=press(page,'glow');check('Restore flower '+str(i+1),s['flowers'][i],s['flowers'])
    r=go(page,{'x':1,'z':-42});check('Ride to the clearing',r['distance']<3,r)
    s=press(page,'action');check('Transmitter opens tuning puzzle',s['phase']=='tune',s['phase'])
    page.evaluate('__game.core.tuneClock=0')
    s=press(page,'action');check('A mistimed note is recoverable',s['tuneMisses']>=1 and s['phase']=='tune' and s['tune']==0)
    s=page.evaluate('__game.test.tunePerfect()');check('Three notes launch the bicycles',s['phase']=='flight' and s['tune']==3,s['phase'])
    for i,ring in enumerate(c['RINGS']):
        r=go(page,ring,boost=True);s=state(page)
        check('Fly through starlight ring '+str(i+1),s['ring']>=i+1,{'ride':r,'ring':s['ring']})
    r=go(page,c['SHIP']);s=press(page,'action');check('Landing starts the farewell',s['phase']=='farewell',{'ride':r,'phase':s['phase']})
    s=advance(page,10.5);check('Complete adventure reaches its ending',s['finished'] and s['phase']=='won',s['phase'])
    page.evaluate('__game.test.flush()')
    page.wait_for_function('__game.ui==="ending"',timeout=15000)
    check('Ending shows journey statistics',page.locator('#ending-stats').inner_text().find('FLOWERS REMEMBERED')>=0)
    page.evaluate('__game.route("freeride")');check('Ending offers a working free ride',page.evaluate('__game.state.phase')=='freeride')
    page.evaluate('__game.route("return-title")');saved=page.evaluate('__game.save()');check('Checkpoint saved all borrowed parts',saved and all(saved['parts']),saved)
    page.evaluate('__game.route("continue")');check('Continue restores the journey',all(state(page)['parts']))
    begin(page)
    # Freeze searchers in an unobstructed patch of road.
    page.evaluate('''()=>{__game.core.cheat=false;__game.core.settings.agentSpeed=0;for(const a of __game.core.agents){a.x=45;a.z=-100;}const a=__game.core.agents[0];a.x=0;a.z=23;a.yaw=0;a.points=[{x:0,z:23}];a.way=0;__game.test.teleport(0,29);__game.core.players.get(0).alert=0;}''')
    s=advance(page,1);normal=s['players'][0]['alert'];check('Searchlight builds suspicion',normal>15,normal)
    page.evaluate('__game.core.players.get(0).alert=0')
    s=advance(page,1,{'hush':True});quiet=s['players'][0]['alert'];check('Hush riding reduces detection',0<quiet<normal*.5,{'normal':normal,'quiet':quiet})
    page.evaluate('__game.test.teleport(4.2,28);__game.core.players.get(0).alert=0')
    s=advance(page,.5);check('Outside the visible flashlight cone stays hidden',s['players'][0]['alert']==0,s['players'][0]['alert'])
    page.evaluate('__game.test.teleport(0,29);__game.core.players.get(0).alert=0;__game.core.bond=100')
    s=press(page,'glow');check('Glow dazzles nearby searchers',s['agents'][0]['distract']>0,s['agents'][0])
    advance(page,5.2);page.evaluate('__game.core.players.get(0).alert=99')
    s=advance(page,.25);check('Being caught rescues the rider',s['rescues']>0 and s['players'][0]['alert']==0,s['rescues'])
    before=s['rescues'];page.evaluate('__game.test.teleport(0,-13)');s=advance(page,1.5)
    check('Deep creek has a safe rescue',s['rescues']>before and s['players'][0]['y']>-1,s['players'][0])
    page.evaluate('__game.route("return-title");__game.test.expireIdle()')
    page.wait_for_function('__game.attract',timeout=10000)
    tour=page.evaluate('__game.test.tour(240)');check('Attract AI demonstrates the entire adventure',tour['won'] and tour['parts']==3 and tour['rings']==6 and tour['bridge'],tour)
    page.keyboard.press('ArrowDown');page.wait_for_function('!__game.attract',timeout=5000)
    check('Any input leaves attract mode at the title',page.evaluate('__game.ui')=='title')

def interface(page,browser):
    page.evaluate('__game.test.pauseDrawing()')
    page.evaluate('__game.route("return-title");__game.route("reset-settings")')
    check('Music starts at ten percent',page.evaluate('__game.settings.music')==.1)
    page.evaluate('__game.route("back");__game.route("new")')
    before=state(page)['players'][0]
    page.keyboard.down('KeyW');page.wait_for_function('Math.hypot(__game.state.players[0].x-('+str(before['x'])+'),__game.state.players[0].z-('+str(before['z'])+'))>.25',timeout=15000);page.keyboard.up('KeyW')
    check('Keyboard rides in the camera direction',True)
    page.evaluate('__game.test.teleport(17,32)');page.keyboard.press('KeyE')
    page.wait_for_function('__game.state.parts[0]',timeout=10000)
    check('A short keyboard tap still interacts',True)
    page.keyboard.press('Escape');page.wait_for_function('__game.ui==="pause"')
    check('Escape opens pause',page.locator('[data-action="dev"]').is_visible())
    page.locator('[data-action="dev"]').click();check('Developer workbench is reachable',page.evaluate('__game.ui')=='dev')
    page.locator('[data-dev="speed"]').fill('13');check('Live balance slider updates physics speed',page.evaluate('__game.core.settings.speed')==13)
    page.locator('[data-action="dev-reset"]').click();check('Reset restores default balance',page.evaluate('__game.core.settings.speed')==7.8)
    page.locator('[data-action="dev-invincible"]').click();check('Developer invincibility toggles',page.evaluate('__game.core.cheat'))
    page.locator('[data-action="dev-colliders"]').click();check('Collision visualization exists',page.evaluate('!!__game.world.debug'))
    page.locator('[data-action="dev-colliders"]').click();page.evaluate('__game.route("back");__game.route("settings")')
    page.locator('[data-setting="music"]').fill('0.25');check('Music setting updates immediately',page.evaluate('__game.settings.music')==.25)
    page.locator('[data-action="glyphs"]').click();check('Xbox glyph option works',page.evaluate('__game.settings.glyphs')=='xbox')
    page.evaluate('__game.route("largeText");__game.route("reduced")');check('Accessibility settings apply',page.locator('body').evaluate('(e)=>e.classList.contains("large-text")&&e.classList.contains("reduced-motion")'))
    audio=page.evaluate('__game.audio.offlineCheck()');check('Code audio produces a valid waveform',audio['rms']>.002 and .005<audio['peak']<1,audio)
    page.evaluate('__game.route("reset-settings");__game.route("back");__game.route("about")')
    check('About contains all required source information',page.locator('.credits-list').inner_text().find('added on import')>=0 and page.locator('.credits-list').inner_text().find('0.19.3')>=0)
    for tab in ['testing','engine','prompt']:
        page.locator('[data-action="tab-'+tab+'"]').click();check(tab.capitalize()+' feedback tab works',page.locator('.feedback-list').is_visible())
    page.evaluate('__game.route("back");__game.route("resume")')
    page.evaluate('''()=>{window.__pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});__pad.axes[0]=.8;}''')
    before=state(page)['players'][0]
    page.wait_for_function('document.body.dataset.input==="pad"',timeout=10000)
    page.wait_for_function('Math.abs(__game.state.players[0].x-('+str(before['x'])+'))>.2',timeout=15000)
    page.evaluate('__pad.axes[0]=0;__pad.buttons[9]={pressed:true,value:1}')
    page.wait_for_function('__game.ui==="pause"',timeout=15000);page.evaluate('__pad.buttons[9]={pressed:false,value:0}')
    check('Standard gamepad rides and opens pause',True)
    page.evaluate('__pad.buttons[0]={pressed:true,value:1}')
    page.wait_for_function('__game.ui==="play"',timeout=15000);page.evaluate('__pad.buttons[0]={pressed:false,value:0}')
    check('Gamepad Cross activates focused menus',True)
    page.wait_for_function('document.querySelector("#controls-bar").innerHTML.includes("R2")',timeout=15000)
    check('Last input shows PlayStation glyphs',page.locator('#controls-bar').inner_text().find('R2')>=0)
    page.evaluate('__pad.connected=false')
    page.keyboard.press('Tab');page.wait_for_function('__game.ui==="map"')
    check('Map shows parts, creek, clearing and players',page.locator('.map-wrap svg').is_visible() and 'Willow creek' in page.locator('.map-wrap').inner_text())
    page.keyboard.press('Escape')
    # Touch test: one additional page, with actual touch capability and a multitouch-style pointer.
    ctx=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
    phone=ctx.new_page();loaded(phone,pause=True);phone.evaluate('__game.route("new")')
    before=state(phone)['players'][0]
    phone.evaluate('''()=>{document.querySelector('#world').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:41,clientX:100,clientY:290}));window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'touch',pointerId:41,clientX:160,clientY:250}));}''')
    phone.wait_for_function('Math.hypot(__game.state.players[0].x-('+str(before['x'])+'),__game.state.players[0].z-('+str(before['z'])+'))>.2',timeout=15000)
    check('Invisible touch stick moves the bicycle',phone.evaluate('document.body.dataset.input')=='touch')
    phone.evaluate("window.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:41}))")
    phone.touchscreen.tap(807,34);phone.wait_for_function('__game.ui==="pause"',timeout=10000)
    check('Touch menu button opens pause',True)
    ctx.close()

def network(browser):
    ctx=browser.new_context(viewport={'width':800,'height':500})
    host=ctx.new_page();guest=ctx.new_page();loaded(host,pause=True);loaded(guest,pause=True)
    host.evaluate('__game.test.networkHost("MOONAB")');guest.evaluate('__game.test.networkJoin("MOONAB")')
    guest.wait_for_function('__game.network.me===1',timeout=15000)
    check('Standalone room assigns a guest seat',len(guest.evaluate('__game.network.players'))==2)
    host.evaluate('__game.test.networkBegin()')
    guest.wait_for_function('__game.network.started && __game.state.players.length===2',timeout=15000)
    check('Standalone host shares one authoritative world',guest.evaluate('__game.state.phase')=='gather')
    guest.evaluate('__game.route("resume")')
    before=guest.evaluate('__game.state.players.find(p=>p.id===1)')
    guest.keyboard.down('KeyW')
    guest.wait_for_function('Math.hypot(__game.state.players.find(p=>p.id===1).x-('+str(before['x'])+'),__game.state.players.find(p=>p.id===1).z-('+str(before['z'])+'))>.4',timeout=20000)
    guest.keyboard.up('KeyW')
    check('Guest input moves its authoritative rider',True)
    host.evaluate('__game.test.teleportSeat(1,17,32)')
    guest.wait_for_function('Math.hypot(__game.state.players.find(p=>p.id===1).x-17,__game.state.players.find(p=>p.id===1).z-32)<1',timeout=15000)
    guest.evaluate('__game.route("interact")')
    host.wait_for_function('__game.state.parts[0]',timeout=15000)
    check('Guest one-tap interaction reaches the host',True)
    guest.wait_for_function('__game.state.parts[0]===true',timeout=15000)
    check('Shared objectives synchronize to guests',guest.evaluate('__game.core.parts[0]'))
    host.evaluate('__game.test.teleportSeat(1,-18,-6)')
    guest.wait_for_function('Math.abs(__game.state.players.find(p=>p.id===1).z+6)<1',timeout=15000)
    guest.evaluate('__game.route("glow")')
    host.wait_for_function('__game.state.bridge',timeout=15000)
    check('Guest glow changes the shared world',True)
    guest.evaluate('__game.route("leave-room")')
    host.wait_for_function('__game.state.players.length===1',timeout=15000)
    check('Guest leaving removes its world character',True)
    guest.evaluate('__game.test.networkJoin("MOONAB")')
    guest.wait_for_function('__game.network.me===1 && __game.state.parts[0]',timeout=15000)
    host.evaluate('__game.route("leave-room")')
    guest.wait_for_function('__game.network.mode==="solo"',timeout=15000)
    check('Host leaving preserves the guest checkpoint',guest.evaluate('__game.state.parts[0] && __game.state.bridge'))
    ctx.close()

def harness(browser,players,scenario='standard',bad_net=False):
    page=browser.new_page(viewport={'width':1100,'height':760})
    query=f'?game=../game.html&players={players}&auto=1&play=3500&scenario={scenario}'
    if bad_net:query+='&latency=150&jitter=50&loss=5'
    page.goto(base+'/vendor/harness.html'+query,wait_until='load')
    page.wait_for_function('window.__hubCheck?.done',timeout=160000)
    report=page.evaluate('__hubCheck')
    if not report['pass']:
        report['frames']=[f.evaluate('({url:location.href,ready:document.readyState,hub:window.AIHub?.active,connected:window.AIHub?.me,game:!!window.__game,fatal:document.getElementById("fatal-detail")?.textContent,note:document.getElementById("loading-note")?.textContent})') for f in page.frames[1:]]
    for result in report['checks']:check(f'Hub {players}p {scenario}: '+result['name'],result['pass'],result.get('detail',''))
    (ROOT/f'hub-{players}-{scenario}.json').write_text(json.dumps(report,indent=2))
    page.close()

def visual_review(browser):
    ctx=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1)
    review=ctx.new_page();loaded(review,base+'/game.html?test=1&visual=1')
    review.evaluate("setInterval(()=>window.dispatchEvent(new PointerEvent('pointermove',{clientX:1800+Math.random()*80,clientY:1040})),500)")
    def capture(name,title=False):
        review.evaluate('(title)=>{__game.world.snap=true;__game.world.update(__game.state,1,{title,me:0});__game.world.render();}',title)
        review.screenshot(path=str(ROOT/('review-'+name+'.png')),timeout=90000)
        check('Visual capture '+name,True)
    capture('title',True)
    review.evaluate('__game.test.begin()');capture('neighborhood')
    review.evaluate('__game.test.teleport(-18,-6);__game.test.press("glow")');capture('bridge')
    review.evaluate('__game.route("dev-flight");__game.test.driveTo(__game.test.constants.RINGS[2]);__game.test.flush()');capture('flight')
    review.evaluate('__game.route("pause");__game.route("settings")');capture('settings')
    review.evaluate('__game.route("back");__game.route("resume");__game.test.driveTo(__game.test.constants.SHIP);__game.core.ring=6;__game.test.press("action");__game.test.advance(11);__game.test.flush()');capture('ending')
    ctx.close()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=FLAGS)
    context=browser.new_context(viewport={'width':1440,'height':900})
    page=context.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'ERR_' not in m.text else None)
    run_case('Page starts',lambda:loaded(page))
    check('Correct game served on the ephemeral port',page.title()=='E.T. the Extra-Trusting',page.title())
    if args.group in ['all','journey']:run_case('Journey script completed',lambda:journey(page))
    if args.group in ['all','interface']:run_case('Interface script completed',lambda:interface(page,browser))
    check('No game JavaScript or GPU errors',not errors,errors[:6])
    context.close()
    if args.group in ['all','network']:run_case('Standalone co-op script completed',lambda:network(browser))
    if args.group in ['all','hub']:
        for players,scenario,bad_net in [(2,'standard',False),(4,'standard',True),(4,'host-leave',True),(2,'server',False)]:
            run_case(f'Hub {players}p {scenario} completed',lambda n=players,s=scenario,b=bad_net:harness(browser,n,s,b))
    if args.visual:run_case('Visual review captures completed',lambda:visual_review(browser))
    browser.close()
server.shutdown();server.server_close()
failed=sum(not r['pass'] for r in results)
(ROOT/'test-results.json').write_text(json.dumps({'passed':len(results)-failed,'failed':failed,'checks':results},indent=2))
print(f'{len(results)} checks · {failed} failures',flush=True)
raise SystemExit(1 if failed else 0)
