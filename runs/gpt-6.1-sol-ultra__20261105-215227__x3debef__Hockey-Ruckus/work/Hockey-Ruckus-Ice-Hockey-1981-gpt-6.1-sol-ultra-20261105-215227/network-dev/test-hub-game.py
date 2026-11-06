"""Final assembled-game networking checks. Prints failures and one count only."""
import functools
import hashlib
import http.server
import json
import pathlib
import threading
import time
from playwright.sync_api import sync_playwright

DEV=pathlib.Path(__file__).resolve().parent.parent
ROOT=DEV.parent
STEM=json.loads((DEV/'title-selection.json').read_text())['stem']
GAME=STEM+'.html'
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
failures=[]
checks=0
results={'buildSha256':hashlib.sha256((ROOT/GAME).read_bytes()).hexdigest(),'scenarios':[], 'pageErrors':[], 'requestFailures':[]}
def save():
    results['failures']=failures
    results['checks']=checks
    (DEV/'network-dev/game-hub-results.json').write_text(json.dumps(results,indent=2)+'\n')
def require(value,message):
    if not value:raise AssertionError(message)
def check(name,fn):
    global checks
    checks+=1
    try:fn()
    except Exception as exc:failures.append(name+': '+str(exc).splitlines()[0])
    save()

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
    context=browser.new_context(viewport={'width':1280,'height':800})
    page=context.new_page()
    context.on('page', lambda gp: gp.on('pageerror', lambda e: results['pageErrors'].append(str(e))))
    page.on('pageerror', lambda e: results['pageErrors'].append(str(e)))
    context.on('requestfailed', lambda req: results['requestFailures'].append({'url':req.url,'error':req.failure}))
    scenarios=[('standard',''),('degraded','&latency=150&jitter=50&loss=5'),('host-leave','&scenario=host-leave'),('server','&scenario=server')]
    for name,extra in scenarios:
        def run_scenario(name=name,extra=extra):
            page.goto(base+STEM+'/network-dev/harness.html?game=../../'+GAME+'&players=2&auto=1&play=2500'+extra,wait_until='domcontentloaded')
            require('AI Hub' in page.title(),'served official Hub harness')
            page.wait_for_function('window.__hubCheck?.done===true',timeout=70000)
            report=page.evaluate('window.__hubCheck')
            game_states=[]
            for frame in page.frames[1:]:
                game_states.append(frame.evaluate('({ready:!!window.__hockey,backend:window.__hockey?.backend,frames:window.__hockey?.frames,phase:window.__hockey?.game.phase,role:window.__hockey?.net.role,server:window.__hockey?.net.server,view:window.__hockey?.view})'))
            results['scenarios'].append({'name':name,'report':report,'gameStates':game_states})
            issues=[c['name']+': '+c.get('detail','') for c in report['checks'] if not c['pass']]
            require(report['pass'],'; '.join(issues))
            require(all(s['ready'] and s['frames']>0 and s['backend']=='WebGPU' for s in game_states),'all copies initialized and rendered WebGPU')
            require(all(s['phase']=='final' for s in game_states),'every remaining world stops at final')
            for frame in page.frames[1:]:
                guard=frame.evaluate("""async()=>{
                  const h=__hockey;const initialView=h.view;await h.act('title');h.input.cb.back();h.input.cb.pause();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));
                  const consumed=h.input.activity('keyboard');return {initialView,view:h.view,playing:h.audio.playing,keys:h.input.keys.size,consumed,ended:h.net.ended};
                }""")
                require(guard['view']==guard['initialView']=='hubEnd' and not guard['playing'] and guard['keys']==0 and guard['consumed'] and guard['ended'],'hub end rejects title/back/pause/input and stops music')

        check('official Hub '+name,run_scenario)
    page.close()
    a=context.new_page();b=context.new_page()
    def standalone_boot():
        for game_page in [a,b]:
            game_page.goto(base+GAME,wait_until='domcontentloaded')
            game_page.wait_for_function('window.__hockey?.frames>5',timeout=30000)
    check('standalone WebGPU boot on two pages', standalone_boot)
    def standalone_start():
        require('Hockey Ruckus' in a.title(),'served Hockey Ruckus')
        for gp in [a,b]:gp.evaluate('__hockey.act("online")')
        room=a.evaluate('__hockey.net.createLocalRoom()')
        b.evaluate('(code)=>__hockey.net.joinRoom(code)',room)
        for gp in [a,b]:gp.wait_for_function('__hockey.net.connected',timeout=10000)
        a.evaluate('__hockey.net.startMatch({mode:"online",time:180,turbo:false,theme:0})')
        for gp in [a,b]:gp.wait_for_function('__hockey.view==="play" && __hockey.game.phase==="play"',timeout=20000)
        require(a.evaluate('__hockey.net.role')=='host','host authority')
        require(b.evaluate('__hockey.net.team')==1,'guest team 1')
        require(a.evaluate('JSON.stringify(__hockey.game.ai)')=='[false,false]','both online teams use human input')
    check('standalone shared match starts on both pages',standalone_start)
    def standalone_input():
        before=a.evaluate('__hockey.game.players.filter(p=>p.team===1).map(p=>({x:p.x,z:p.z}))')
        start=a.evaluate('__hockey.game.elapsed')
        b.evaluate('__hockey.input.keys.add("KeyA")')
        a.wait_for_function('(start)=>__hockey.game.elapsed>start+.5',arg=start,timeout=10000)
        b.evaluate('__hockey.input.keys.delete("KeyA")')
        after=a.evaluate('__hockey.game.players.filter(p=>p.team===1).map(p=>({x:p.x,z:p.z}))')
        require(any(abs(x['x']-y['x'])+abs(x['z']-y['z'])>.2 for x,y in zip(before,after)),'guest keyboard input moves team 1 on authority')
        a.evaluate('__hockey.game.phase="play";__hockey.game.score(0)')
        b.wait_for_function('__hockey.game.scores[0]===1',timeout=10000)
        require(a.evaluate('__hockey.game.scores[0]')==b.evaluate('__hockey.game.scores[0]'),'scores replicate')
        require(abs(a.evaluate('__hockey.game.seconds')-b.evaluate('__hockey.game.seconds'))<1,'clocks replicate')
    check('standalone remote input and authoritative snapshots',standalone_input)
    def standalone_disconnect():
        b.evaluate('__hockey.net.leave()')
        a.wait_for_function('__hockey.view==="disconnect"',timeout=10000)
        a.locator('[data-action="finishAI"]').click()
        a.wait_for_function('__hockey.view==="play" && !__hockey.paused',timeout=10000)
        require(a.evaluate('__hockey.game.ai[1]'),'disconnected opponent replaced by AI')
        results['standalone']={'hostBackend':a.evaluate('__hockey.backend'),'guestBackend':b.evaluate('__hockey.backend'),'inputReplication':True,'scoreReplication':True,'disconnectRecovery':True}
    check('standalone disconnect offers working AI continuation',standalone_disconnect)
    def guest_recovers_authority():
        for gp in [a,b]:gp.evaluate('__hockey.act("online")')
        room=a.evaluate('__hockey.net.createLocalRoom()')
        b.evaluate('(code)=>__hockey.net.joinRoom(code)',room)
        for gp in [a,b]:gp.wait_for_function('__hockey.net.connected',timeout=10000)
        a.evaluate('__hockey.net.startMatch({mode:"online",time:180,turbo:false,theme:0})')
        for gp in [a,b]:gp.wait_for_function('__hockey.view==="play" && __hockey.game.phase==="play"',timeout=20000)
        a.evaluate('__hockey.game.owner=-1;__hockey.game.noPickup=20;__hockey.game.body.setTranslation({x:7,y:.25,z:4},true);__hockey.game.body.setLinvel({x:0,y:0,z:0},true)')
        b.wait_for_function('Math.abs(__hockey.game.puck.x-7)<.1 && Math.abs(__hockey.game.puck.z-4)<.1',timeout=10000)
        b.evaluate('window.recoveryPuck={...__hockey.game.puck}')
        a.evaluate('__hockey.net.leave()')
        b.wait_for_function('__hockey.view==="disconnect"',timeout=10000)
        b.locator('[data-action="finishAI"]').click()
        b.wait_for_function('__hockey.view==="play" && !__hockey.paused',timeout=10000)
        require(b.evaluate('__hockey.net.team===0 && __hockey.net.role==="none"'),'guest becomes offline team 0')
        require(b.evaluate('Math.hypot(__hockey.game.body.translation().x-recoveryPuck.x,__hockey.game.body.translation().z-recoveryPuck.z)<.5'),'guest continuation preserves authoritative puck physics')
        results['standalone']['guestAuthorityRecovery']=True
    check('guest host-loss recovery preserves physics and offline team',guest_recovers_authority)
    context.close();browser.close()
server.shutdown();server.server_close()
results['failures']=failures
results['checks']=checks
results['finalBuildSha256']=hashlib.sha256((ROOT/GAME).read_bytes()).hexdigest()
(DEV/'network-dev/game-hub-results.json').write_text(json.dumps(results,indent=2)+'\n')
for failure in failures:print('FAIL '+failure)
print(f'{checks-len(failures)}/{checks} assembled-game network checks passed')
raise SystemExit(bool(failures))
