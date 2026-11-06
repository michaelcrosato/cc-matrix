"""Run with /home/micha/.local/share/pipx/venvs/playwright/bin/python test-game.py.
A single sequential Chromium verifies the built single-file game. Output is failures + count.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
checks = 0
failures = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def test(name, callback):
    global checks
    checks += 1
    try:
        result = callback()
        if result is False:
            raise AssertionError("returned false")
    except Exception as exc:
        failures.append(name)
        print(f"FAIL {name}: {str(exc).splitlines()[0]}")


def ensure(condition, message="condition failed"):
    if not condition:
        raise AssertionError(message)


def js_test(page, name, script):
    test(name, lambda: ensure(page.evaluate(script)))


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/index.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu", "--use-angle=swiftshader", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--no-sandbox"])
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.add_init_script("""window.__PAD=null;Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__PAD]});""")
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(url, wait_until="domcontentloaded")
            test("single-file boot", lambda: page.wait_for_function("window.__URN && document.title.toLowerCase().includes('urn')", timeout=120000))
            if not page.evaluate("!!window.__URN"):
                raise RuntimeError("game failed to initialize")
            js_test(page, "WebGPU backend", "__URN.backend==='WebGPU'")
            test("WebGPU draws and remains healthy",lambda:(page.wait_for_timeout(2000),ensure(page.evaluate("!__URN.renderer._isDeviceLost&&__URN.renderer.info.render.drawCalls>0"))))
            js_test(page, "music defaults to ten percent", "__URN.settings.music===.1 && __URN.audio.musicVolume===.1")
            test("keyboard title starts game", lambda: (page.keyboard.press("Enter"), page.wait_for_function("__URN.mode==='play'", timeout=5000)))
            js_test(page, "campaign key pickup", """()=>{const g=__URN;g.state.enemies=[];g.teleport(-8,4);g.interact();return g.state.players[0].tool==='key';}""")
            js_test(page, "ground locked door unlock", """()=>{const g=__URN;g.teleport(-8,1.2);g.interact();return !g.state.doors.find(d=>d.x===-8&&d.axis==='z').locked;}""")
            js_test(page, "ground urn fragment", """()=>{const g=__URN;g.teleport(-8,-4);g.interact();return g.state.fragments===1;}""")
            js_test(page, "first-floor stairs", """()=>{const g=__URN;g.teleport(9,5);g.interact();g.state.enemies=[];return g.state.floor===1&&g.state.players[0].tool==='key';}""")
            js_test(page, "first-floor lock and fragment", """()=>{const g=__URN;g.teleport(8,1.2);g.interact();g.teleport(8,-4);g.interact();return g.state.fragments===2&&!g.state.doors.find(d=>d.x===8&&d.axis==='z').locked;}""")
            js_test(page, "attic stairs lock and fragment", """()=>{const g=__URN;g.teleport(-9,5);g.interact();g.state.enemies=[];g.teleport(-8,1.2);g.interact();g.teleport(-8,-4);g.interact();return g.state.floor===2&&g.state.fragments===3&&!g.state.doors.find(d=>d.x===-8&&d.axis==='z').locked;}""")
            js_test(page, "floor persistence and return stairs", """()=>{const g=__URN;g.teleport(-9,5);g.interact();g.state.enemies=[];if(g.state.floor!==1||!g.state.items.find(i=>i.type==='shard').taken)return false;g.teleport(9,5);g.interact();g.state.enemies=[];return g.state.floor===0&&g.state.items.find(i=>i.type==='shard').taken&&!g.state.doors.find(d=>d.x===-8&&d.axis==='z').locked;}""")
            js_test(page, "full campaign escape victory", """()=>{const g=__URN;g.teleport(0,7);g.interact();return g.mode==='win'&&g.state.result==='win'&&g.ui.screen==='win';}""")
            js_test(page, "restart resets campaign", """()=>{const g=__URN;g.start();g.state.enemies=[];return g.mode==='play'&&g.state.fragments===0&&g.state.lives===3&&g.state.floor===0&&g.state.players[0].tool===null;}""")
            js_test(page, "locked doorway blocks Rapier movement", """()=>{const g=__URN;g.state.enemies=[];g.teleport(-8,1.2);g.physics.step();let p=g.state.players[0];for(let i=0;i<90;i++){g.move(p,0,-1,1/60);g.physics.step();}return p.z>.43&&p.z<.7&&g.state.doors.some(d=>d.locked);}""")
            js_test(page, "unlocked doorway allows Rapier movement", """()=>{const g=__URN;g.teleport(-8,4);g.interact();g.teleport(-8,1.2);g.interact();g.physics.step();let p=g.state.players[0];for(let i=0;i<90;i++){g.move(p,0,-1,1/60);g.physics.step();}return p.z<-1&&!g.state.doors.some(d=>d.locked);}""")
            page.evaluate("__URN.start();__URN.state.enemies=[]")
            js_test(page, "exit refuses incomplete urn", """()=>{const g=__URN;g.teleport(0,7);g.interact();return g.mode==='play'&&g.state.result===null;}""")
            js_test(page, "one carried tool drops previous tool", """()=>{const g=__URN;g.teleport(-8,4);g.interact();g.teleport(0,-4);g.interact();return g.state.players[0].tool==='ward'&&g.state.items.some(i=>i.type==='key'&&!i.taken&&i.x===0&&i.z===-4);}""")
            js_test(page, "ward flash stuns at extended range", """()=>{const g=__URN,p=g.state.players[0];p.cooldown=0;p.light=35;g.state.enemies=[{type:'ghost',x:4,z:-4,stun:0,angle:0,phase:0}];g.pulse();return g.state.enemies[0].stun===5&&p.cooldown===3&&p.light===32;}""")
            js_test(page, "flash cooldown prevents repeat use", """()=>{const g=__URN,p=g.state.players[0],v=p.light;g.pulse();return p.light===v;}""")
            js_test(page, "wind extinguishes unprotected light", """()=>{const g=__URN;g.state.enemies=[];g.teleport(0,1);g.state.windIn=0;g.advance(.01);return g.state.players[0].light===0;}""")
            js_test(page, "match relights extinguished lantern", """()=>{const g=__URN,m=g.state.matches;g.pulse();return g.state.players[0].light===g.tuning.lantern&&g.state.matches===m+1;}""")
            js_test(page, "unlit sanctuary heals courage", """()=>{const g=__URN;g.state.lives=2;g.teleport(-1,-4);g.interact();return g.state.candles.find(c=>c.x===-1).lit&&g.state.lives===3&&g.state.players[0].light===g.tuning.lantern;}""")
            js_test(page, "sanctuary replenishes light", """()=>{const g=__URN;g.teleport(-1,-4);g.state.players[0].light=2;g.advance(.5);return g.state.players[0].light>2;}""")
            js_test(page, "three hits trigger defeat", """()=>{const g=__URN;g.start();g.teleport(0,1);g.state.enemies=[{type:'ghost',x:0,z:1,stun:0,angle:0,phase:0}];for(let i=0;i<3;i++){const p=g.state.players[0];p.invincible=0;g.state.enemies[0].x=p.x;g.state.enemies[0].z=p.z;g.advance(.01);}return g.state.lives===0&&g.state.hits===3&&g.mode==='lose'&&g.ui.screen==='lose';}""")
            js_test(page, "bat steals carried tool without life loss", """()=>{const g=__URN;g.start();g.state.enemies=[];g.teleport(-8,4);g.interact();g.teleport(0,1);g.state.enemies=[{type:'bat',x:0,z:1,stun:0,angle:0,phase:0}];g.advance(.01);return g.state.players[0].tool===null&&g.state.lives===3&&g.state.items.some(i=>i.type==='key'&&!i.taken)&&g.state.enemies[0].stun>0;}""")
            js_test(page, "spider collision slows and damages", """()=>{const g=__URN;g.start();g.teleport(0,1);g.state.enemies=[{type:'spider',x:0,z:1,stun:0,angle:0,phase:0}];g.advance(.01);return g.state.players[0].slow>2&&g.state.lives===2;}""")
            page.evaluate("__URN.start();__URN.state.enemies=[];__URN.teleport(11,5)")
            def wall_check():
                page.keyboard.down("KeyD");page.keyboard.down("KeyS")
                try:
                    page.wait_for_function("__URN.state.players[0].x>11.15", timeout=10000)
                    page.wait_for_timeout(1200)
                finally:
                    page.keyboard.up("KeyD");page.keyboard.up("KeyS")
                ensure(page.evaluate("__URN.state.players[0].x>11.15&&__URN.state.players[0].x<11.56"), "held movement crossed the exterior Rapier wall: "+str(page.evaluate("({...__URN.state.players[0],mode:__URN.mode})")))
            test("held keyboard movement collides with exterior wall", wall_check)
            test("keyboard map opens", lambda: (page.keyboard.press("KeyM"), page.wait_for_selector("#map", state="visible")))
            test("keyboard map closes", lambda: (page.keyboard.press("KeyM"), ensure(page.locator("#map").count()==0)))
            test("pause exposes developer tools", lambda: (page.keyboard.press("Escape"), page.locator('[data-action="dev"]').click(), page.wait_for_selector('[data-tune="speed"]')))
            def tune_check():
                page.locator('[data-tune="speed"]').evaluate("e=>{e.value='7';e.dispatchEvent(new Event('input',{bubbles:true}))}")
                ensure(page.evaluate("__URN.tuning.speed===7"))
                page.locator('[data-action="reset-defaults"]').click()
                ensure(page.evaluate("__URN.tuning.speed===4&&__URN.tuning.enemy===1&&__URN.tuning.lantern===35&&__URN.tuning.lives===3"))
            test("live balancing sliders and reset", tune_check)
            js_test(page, "settings update audio", """()=>{const g=__URN;g.action('setting',{key:'music',value:.22});const ok=g.audio.musicVolume===.22;g.action('setting',{key:'music',value:.1});return ok;}""")
            page.mouse.move(5,5)
            page.wait_for_timeout(100)
            page.evaluate("__URN.action('title');__URN.ui.setFocus(0);window.__PAD={id:'Test standard pad',mapping:'standard',connected:true,index:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))}")
            def pad_start():
                page.evaluate("__PAD.buttons[0]={pressed:true,touched:true,value:1}")
                try: page.wait_for_function("__URN.mode==='play'&&__URN.ui.device==='gamepad'",timeout=10000)
                finally: page.evaluate("__PAD.buttons[0]={pressed:false,touched:false,value:0}")
            test("standard gamepad title confirmation",pad_start)
            page.evaluate("__URN.state.enemies=[];__URN.teleport(0,4);__PAD.axes[0]=.9")
            test("gamepad analog walking", lambda: page.wait_for_function("__URN.state.players[0].x>.1",timeout=10000))
            page.evaluate("__PAD.axes[0]=0;__PAD.buttons[9]={pressed:true,touched:true,value:1}")
            test("gamepad options pauses",lambda:page.wait_for_function("__URN.mode==='pause'",timeout=10000))
            test("pause back returns to gameplay",lambda:(page.evaluate("__PAD=null"),page.keyboard.press("Escape"),page.wait_for_function("__URN.mode==='play'")))
            page.evaluate("__PAD=null;__URN.action('title')")
            test("idle title enters attract mode",lambda:page.wait_for_function("__URN.attract===true",timeout=22000))
            def pad_exits_attract():
                page.evaluate("__URN.ui.setFocus(0);window.__PAD={id:'Test pad',mapping:'standard',connected:true,index:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};__PAD.buttons[0]={pressed:true,touched:true,value:1}")
                try:
                    page.wait_for_function("!__URN.attract",timeout=5000)
                    page.wait_for_timeout(250)
                    ensure(page.evaluate("__URN.mode==='title'"),"attract exit button also started a game")
                finally:page.evaluate("__PAD=null")
            test("gamepad Cross exits attract without confirming menu",pad_exits_attract)
            page.evaluate("__URN.action('title')")
            test("attract replay loops from title",lambda:page.wait_for_function("__URN.attract===true",timeout=22000))
            test("input exits attract mode",lambda:(page.keyboard.press("Space"),page.wait_for_function("!__URN.attract&&__URN.mode==='title'",timeout=5000)))
            def rendered_audio():
                report=page.evaluate("""async()=>{const out=[];for(const name of ['step','pickup','match','extinguish','ghost','hurt','door','stairs','win','lose','menu','pulse','voice','music']){const c=new OfflineAudioContext(1,88200,44100),a=new __URN.audio.constructor({context:c});await a.init();if(name==='voice')a.gibberish();else if(name==='music')a.update(.016,{playing:true,danger:.5});else a.play(name);const d=(await c.startRendering()).getChannelData(0);let sum=0,peak=0;for(const n of d){sum+=n*n;peak=Math.max(peak,Math.abs(n));}out.push({name,rms:Math.sqrt(sum/d.length),peak,finite:d.every(Number.isFinite)});}return out;}""")
                bad=[r for r in report if not r['finite'] or r['rms']<.00001 or r['peak']>1]
                ensure(not bad,str(bad))
            test("all 14 synthesized sounds render audibly without clipping",rendered_audio)
            test("no uncaught browser errors",lambda:ensure(not errors," | ".join(errors)))
            context.close()
            touch_context=browser.new_context(viewport={"width":844,"height":390},is_mobile=True,has_touch=True,device_scale_factor=1)
            touch_page=touch_context.new_page()
            touch_page.goto(url,wait_until="domcontentloaded")
            test("touch viewport boot",lambda:touch_page.wait_for_function("window.__URN",timeout=120000))
            if touch_page.evaluate("!!window.__URN"):
                touch_page.locator('[data-action="start"]').tap()
                touch_page.evaluate("__URN.state.enemies=[];__URN.teleport(0,4)")
                def touch_move():
                    touch_page.evaluate("""()=>{const target=document.querySelector('canvas');window.__T=(x,y)=>new Touch({identifier:1,target,clientX:x,clientY:y});target.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[__T(170,260)],changedTouches:[__T(170,260)]}));target.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[__T(235,260)],changedTouches:[__T(235,260)]}));}""")
                    try:touch_page.wait_for_function("__URN.state.players[0].x>.1&&__URN.ui.device==='touch'",timeout=10000)
                    finally:touch_page.evaluate("document.querySelector('canvas').dispatchEvent(new TouchEvent('touchend',{bubbles:true,changedTouches:[__T(235,260)]}))")
                test("touch invisible stick moves player",touch_move)
                js_test(touch_page,"touch assists automatic relighting","""()=>{const g=__URN;g.teleport(0,1);g.state.players[0].light=0;g.advance(.016);return g.state.players[0].light>0;}""")
                js_test(touch_page,"touch assists nearby item pickup","""()=>{const g=__URN;g.teleport(-8,4);g.advance(.016);return g.state.players[0].tool==='key';}""")
                test("touch menu remains visible",lambda:ensure(touch_page.locator('#pause-touch').is_visible()))
                touch_page.set_viewport_size({"width":390,"height":844})
                touch_page.evaluate("__URN.teleport(-8,4)")
                test("portrait camera follows outer parlor",lambda:touch_page.wait_for_function("Math.abs(__URN.camera.position.x-15)<.1&&Math.abs(__URN.camera.position.z-34)<.1"))
                touch_page.evaluate("__URN.state.playerCount=2;__URN.state.players[1].x=8;__URN.state.players[1].z=-4;__URN.network.role='guest';__URN.network.localIndex=1")
                test("portrait guest follows their own explorer",lambda:touch_page.wait_for_function("Math.abs(__URN.camera.position.x-31)<.1&&Math.abs(__URN.camera.position.z-26)<.1"))
                touch_page.evaluate("__URN.network.role='solo';__URN.network.localIndex=0;__URN.state.playerCount=1")
                test("touch courage clears menu button",lambda:ensure(touch_page.evaluate("document.querySelector('.courage').getBoundingClientRect().right+8<=document.querySelector('#pause-touch').getBoundingClientRect().left")))
                touch_page.set_viewport_size({"width":844,"height":390})
                test("landscape rotation restores full house framing",lambda:touch_page.wait_for_function("Math.abs(__URN.camera.position.x-23)<.1&&Math.abs(__URN.camera.position.z-30)<.1"))
            touch_context.close()
            browser.close()
    except Exception as exc:
        test("suite completion",lambda:ensure(False,str(exc)))
    finally:
        server.shutdown();server.server_close()
    print(f"{checks-len(failures)}/{checks} checks passed; {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
