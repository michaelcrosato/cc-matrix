"""Product-level authoritative multiplayer input and lifecycle checks."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from playwright.sync_api import sync_playwright

def check_multiplayer():
    dev=Path(__file__).resolve().parent;root=dev.parent
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(root)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    failures=[];count=0
    def check(name,fn):
        nonlocal count
        count+=1
        try:
            if fn() is False:failures.append(name)
        except Exception as error:failures.append(name+': '+str(error).splitlines()[0])
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
            context=browser.new_context(ignore_https_errors=True,viewport={'width':960,'height':540})
            host=context.new_page();guest=context.new_page();errors=[]
            for page in [host,guest]:
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(f'http://127.0.0.1:{server.server_port}/{dev.name}.html')
                page.wait_for_function('window.__gameReady===true',timeout=90000)
                assert page.title()=='Ice Hockey Puck Wild'
            code=host.evaluate('__game.network.hostRoom()');guest.evaluate('code=>__game.network.joinRoom(code)',code)
            for page in [host,guest]:page.wait_for_function('__game.network.connected && __game.game.active',timeout=30000)
            check('actual game joins one authoritative match',lambda:host.evaluate('__game.network.isHost&&__game.game.remote') and guest.evaluate('!__game.network.isHost&&__game.network.localTeam===1'))
            def setup():
                host.evaluate("""()=>{const g=__game.game;g.config.ai=0;g.phase='play';g.time=100;g.control[1]=2;g.heat[1]=0;g.pickupLock=0;for(const p of g.players){const [x,z]=[[-12,8],[-5,8],[8,-7],[15,-7],[-22,0],[22,0]][p.id];p.x=x;p.z=z;p.vx=p.vz=0;p.stun=0;p.aiTimer=100;p.charge=0;p.angle=p.team?Math.PI:0;p.body.setTranslation({x,y:.9,z},true);p.body.setLinvel({x:0,y:0,z:0},true);}g.givePuck(2)}""")
                guest.wait_for_function('__game.game.owner===2&&__game.game.control[1]===2')
            setup()
            before=host.evaluate('__game.game.stats.passes[1]')
            guest.evaluate('__game.network.lastInput=performance.now()+350')
            guest.keyboard.press('e')
            host.wait_for_function('n=>__game.game.stats.passes[1]===n+1',arg=before,timeout=10000)
            check('guest pass survives throttled outgoing frames',lambda:host.evaluate('n=>__game.game.stats.passes[1]===n+1',before))
            setup();before=host.evaluate('__game.game.stats.shots[1]')
            guest.keyboard.down('Space')
            host.wait_for_function('__game.game.players[2].charge>.6',timeout=10000)
            guest.keyboard.up('Space')
            host.wait_for_function('n=>__game.game.stats.shots[1]===n+1',arg=before,timeout=10000)
            check('guest charge and release drives host shot',lambda:host.evaluate('__game.game.shotPower>.6'))
            setup();before=host.evaluate('__game.game.stats.shots[1]')
            guest.evaluate("__game.network.lastInput=-Infinity;__game.network.sendInput({aim:{x:-1,z:0},actions:[{type:'shoot',charge:.6}]})")
            host.wait_for_function('n=>__game.game.stats.shots[1]===n+1',arg=before,timeout=10000)
            check('guest touch shot transmits its charge',lambda:host.evaluate('Math.abs(__game.game.shotPower-.6)<.001'))
            setup();before=host.evaluate('__game.game.stats.checks[1]')
            host.evaluate("()=>{const g=__game.game,p=g.players[0];p.x=10;p.z=-7;p.body.setTranslation({x:10,y:.9,z:-7},true);p.body.setLinvel({x:0,y:0,z:0},true);g.givePuck(0);g.players[2].cd=0}")
            guest.wait_for_function('__game.game.owner===0')
            guest.keyboard.press('f')
            host.wait_for_function('n=>__game.game.stats.checks[1]===n+1',arg=before,timeout=10000)
            check('guest check stuns and dislodges host puck',lambda:host.evaluate('__game.game.owner!==0&&__game.game.stats.checks[1]>0'))
            host.keyboard.press('Escape')
            guest.wait_for_function("document.getElementById('banner').textContent==='HOST TIME OUT'")
            check('guest sees authoritative host pause',lambda:host.evaluate('__game.paused') and guest.locator('#banner').is_visible())
            setup()
            paused_state=host.evaluate("JSON.stringify({stats:__game.game.stats,owner:__game.game.owner,control:__game.game.control,charge:__game.game.players[2].charge})")
            host.evaluate("()=>{const original=__game.network.onEvent;__game.network.onEvent=(type,data)=>{if(type==='input'&&data.input.pauseProbe)window.__pauseProbe=true;original(type,data)}}")
            guest.evaluate("__game.network.lastInput=-Infinity;__game.network.sendInput({pauseProbe:true,x:1,shoot:true,aim:{x:-1,z:0},actions:['pass','check','switch',{type:'shoot',charge:1}]})")
            host.wait_for_function('window.__pauseProbe===true')
            check('guest actions cannot mutate paused host match',lambda:host.evaluate("JSON.stringify({stats:__game.game.stats,owner:__game.game.owner,control:__game.game.control,charge:__game.game.players[2].charge})")==paused_state)
            host.keyboard.press('Escape')
            guest.evaluate("async()=>{await __game.audio.unlock();__game.network.onEvent('end',{reason:'finished'});await __game.action('resume');await __game.action('settings')}")
            check('round end stays paused and fully silent',lambda:guest.evaluate("__game.paused&&__game.panel==='result'&&!__game.audio.enabled&&__game.audio.master.gain.value===0"))
            check('multiplayer produces no runtime errors',lambda:not errors)
            host.evaluate('__game.network.disconnect()');guest.evaluate('__game.network.disconnect()');browser.close()
    except Exception as error:failures.append('multiplayer scenario: '+str(error).splitlines()[0])
    finally:server.shutdown();server.server_close();thread.join(timeout=3)
    return count,failures

if __name__=='__main__':
    count,failures=check_multiplayer()
    for failure in failures:print('FAIL:',failure)
    print(f'{count} multiplayer gameplay checks; {len(failures)} failures')
    raise SystemExit(bool(failures))
