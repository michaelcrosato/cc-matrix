from pathlib import Path
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading
import json
import subprocess
import sys
import traceback
import os

ROOT = Path(__file__).resolve().parent
(ROOT / "browser-cache").mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(ROOT / "browser-cache")
GAME = "Pit-Run-Pitfall-gpt-6.1-sol-max-20261105-200931.html"
FAILURES = []
CHECKS = 0
DETAILS = {}
VISUAL = "--visual" in sys.argv


def check(name, fn):
    global CHECKS
    CHECKS += 1
    try:
        result = fn()
        if result is False:
            raise AssertionError("condition was false")
    except Exception as error:
        FAILURES.append(name + ": " + str(error).strip()[:1800])
    (ROOT / "qa-progress.json").write_text(json.dumps({"checks": CHECKS, "last": name, "failures": FAILURES, "details": DETAILS}, indent=2))


def require(value, message):
    if not value:
        raise AssertionError(message)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def dependencies(route):
    name = route.request.url.split("/")[-1].split("?")[0]
    if name in ["three.webgpu.js", "three.core.js", "three.tsl.js", "rapier.mjs"]:
        route.fulfill(
            path=str(ROOT / "vendor" / name),
            content_type="text/javascript",
            headers={"Access-Control-Allow-Origin": "*"},
        )
    else:
        route.continue_()


def ready(page, url):
    page.goto(url)
    page.wait_for_function("window.__gameReady === true", timeout=90000)
    require(page.title() == "Pit & Run — A jungle jaunt", "wrong page served")


def evaluate(page, source):
    return page.evaluate("() => {" + source + "}")


HELPERS = """
window.resetRun=(count=1)=>{
 const a=__game;a.net.disconnect();a.dev.god=false;a.dev.fly=false;
 a.tuning={speed:6.2,jump:10.8,gravity:25,hazardSpeed:1,timeLimit:360,timeScale:1};
 a.physics.gravity.y=-25;a.start(count);a.manual=true;
 a.testInput={};a.ignoreInputUntil=0;
};
window.advance=(seconds,input={},id=0)=>{
 const a=__game;a.testInput[id]={x:0,y:0,jump:false,action:false,...input};
 for(let n=0;n<Math.round(seconds*60);n++)a.step(1/60);
 a.updateHud();
 const p=a.players.find(p=>p.id===id);
 return {x:p.x,y:p.y,vx:p.vx,vy:p.vy,hp:p.health,grounded:p.grounded,
  swing:p.swing,climb:p.climb,state:a.state,found:a.found,score:a.score,stats:a.stats};
};
window.at=(x,y=0)=>{const a=__game;a.teleport(a.primary(),x,y);a.primary().invuln=0;advance(.04);};\nvoid 0;
"""


def run_game_checks(browser, base):
    ctx = browser.new_context(viewport={"width": 1600, "height": 900})
    ctx.route("https://cdn.jsdelivr.net/**", dependencies)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    ready(page, (ROOT / GAME).as_uri())
    page.evaluate(HELPERS)
    page.evaluate((ROOT / "playthrough.js").read_text())
    check("file:// boots with native WebGPU", lambda: page.evaluate("__game.backend==='WebGPU' && __game.state==='title'"))
    check("music defaults to ten percent", lambda: page.evaluate("__game.settings.music===.1 && __game.audio.music===.1"))
    check("declared multiplayer metadata", lambda: page.locator('meta[name="hub:session-mode"]').get_attribute("content") == "shared-world")

    def enter_start():
        page.keyboard.press("Enter")
        page.wait_for_function("__game.state==='playing'")
        require(page.evaluate("__game.players.length") == 1, "Enter did not begin a solo expedition")
    check("keyboard title selection", enter_start)

    def run_and_jump():
        return evaluate(page, """
        resetRun();advance(.15);const start=__game.primary().x;
        const run=advance(.3,{x:1});if(run.x<start+1)throw Error('run did not advance');
        at(3);const base=__game.primary().y;
        let max=base;for(let i=0;i<30;i++){advance(1/60,{jump:true});max=Math.max(max,__game.primary().y);}
        if(max-base<1.5)throw Error('jump height '+(max-base));
        advance(.8);if(Math.abs(__game.primary().y)>.08)throw Error('did not land on terrain');
        """)
    check("Rapier movement, jump and landing", run_and_jump)
    check("player removal preserves the rest of the expedition", lambda: evaluate(page, """
        resetRun(4);__game.removePlayer(3);
        if(__game.players.length!==3||!__game.players.some(p=>p.id===0))throw Error('departure removed other scouts');
        __game.clearPlayers();if(__game.players.length||__game.physics.bodies.len()!==__game.world.logs.length)throw Error('player bodies leaked');resetRun();
        """))
    check("player is constrained to the gameplay plane", lambda: abs(page.evaluate("__game.primary().body.translation().z")) < .001)

    def variable_jump():
        return evaluate(page, """
        resetRun();at(3);let high=0;for(let i=0;i<45;i++){advance(1/60,{jump:i<35});high=Math.max(high,__game.primary().y);}
        at(3);__game.primary().jumpPrev=false;let low=0;for(let i=0;i<45;i++){advance(1/60,{jump:i<6});low=Math.max(low,__game.primary().y);}
        if(high<low+.2)throw Error('release did not shorten jump '+JSON.stringify({high,low}));
        """)
    check("variable-height jump", variable_jump)
    check("treasure collection and scoring", lambda: evaluate(page, "resetRun();at(11.4);advance(.4,{x:1});if(!__game.found[0]||__game.score<1000)throw Error('first treasure not collected');"))

    def vine():
        return evaluate(page, """
        resetRun();const a=__game,v=a.world.vines[0];
        a.world.update(0,0,a.found);a.teleport(a.primary(),v.end.x,v.end.y-1.8);
        a.primary().grabCooldown=0;a.primary().body.setLinvel({x:0,y:1,z:0},true);
        advance(.04);if(a.primary().swing!==0)throw Error('vine did not catch');
        advance(.1,{x:1});advance(.02,{x:1,jump:true});
        if(a.primary().swing!==null||a.primary().vy<3)throw Error('vine release failed');
        if(a.stats.swings!==1)throw Error('swing not counted');
        """)
    check("vine catch, pumping and release", vine)

    def ladder():
        return evaluate(page, """
        resetRun();at(48);advance(.04,{action:true});advance(2.3);
        if(__game.primary().layer!==1||__game.primary().y>-6.8)throw Error('descent failed '+__game.primary().y);
        advance(.6);advance(.04,{y:-1});advance(2.4,{y:-1});
        if(__game.primary().layer!==0||__game.primary().y<-.1)throw Error('ascent failed '+__game.primary().y);
        """)
    check("ladder descent and ascent", ladder)
    check("timed tar alternates collider and artwork", lambda: evaluate(page, """
        resetRun();const a=__game;const tar=a.world.colliders.find(c=>Math.abs(c.x-62.5)<.1);
        a.world.update(0,0,a.found);const first=tar.c.isEnabled();
        a.world.update(2,0,a.found);if(first===tar.c.isEnabled())throw Error('tar did not change');
        """))

    def damage_hazards():
        return evaluate(page, """
        const results=[];
        for(const h of ['snake','log','crocodile','fire','scorpion']){
         resetRun();const a=__game,p=a.primary();a.simTime=1;
         let x=17,y=.02;
         if(h==='log'){a.world.update(1,0,a.found);x=a.world.logs[1].x;}
         if(h==='crocodile'){x=24;a.world.crocs[0].phase=Math.PI/2-1.55;}
         if(h==='fire'){x=95;a.world.fires.find(f=>!f.decor&&f.x===95).phase=Math.PI/2-1.65;}
         if(h==='scorpion'){a.world.update(1,0,a.found);x=a.world.scorpions[0].x;y=-6.98;}
         a.teleport(p,x,y);p.invuln=0;advance(.08);results.push([h,p.health]);
        }
        __game.world.crocs[0].phase=24*.37;__game.world.fires.find(f=>!f.decor&&f.x===95).phase=95*.3;
        const failed=results.filter(r=>r[1]!==2);if(failed.length)throw Error(JSON.stringify(failed));
        """)
    check("all five contact hazard types cause damage", damage_hazards)
    check("fall rescue uses checkpoint and daylight penalty", lambda: evaluate(page, """
        resetRun();at(40);const a=__game;if(a.teamCamp!==1)throw Error('camp not activated');
        a.teleport(a.primary(),26,-1.4);const t=a.timeLeft;advance(.04);
        if(a.primary().x<40||a.primary().x>43||a.timeLeft>t-5||a.primary().health!==2)throw Error('fall rescue failed');
        """))
    check("checkpoint refills hearts for every couch scout", lambda: evaluate(page, """
        resetRun(2);const a=__game;a.players.forEach(p=>p.health=1);a.teleport(a.players[1],84,0);advance(.04);
        if(a.teamCamp!==2||a.players.some(p=>p.health!==3||p.camp!==2))throw Error('shared camp failed');
        """))
    check("couch camera keeps surface and underground scouts visible", lambda: evaluate(page, """
        resetRun(2);const a=__game;a.teleport(a.players[0],44,0);a.teleport(a.players[1],50,-7);
        a.updateCamera(2);a.camera.updateMatrixWorld();
        for(const p of a.players)for(const height of [0,2]){const v=p.rig.root.position.clone();v.y+=height;v.project(a.camera);if(Math.abs(v.x)>1||Math.abs(v.y)>1)throw Error('scout clipped '+JSON.stringify({id:p.id,y:v.y}));}
        """))
    check("damage invulnerability prevents repeated hits", lambda: evaluate(page, """
        resetRun();at(17);const a=__game,p=a.primary();const hp=p.health;a.hurt(p);a.hurt(p);
        if(p.health<hp-1)throw Error('invulnerability failed');
        """))
    check("failure screen and checkpoint retry", lambda: evaluate(page, """
        resetRun();const a=__game,p=a.primary();p.health=1;a.hurt(p);
        if(a.state!=='lost'||a.ui.current!=='results')throw Error('failure screen missing');
        a.retry();if(a.state!=='playing'||p.health!==3)throw Error('retry failed');
        """))
    check("sunset timeout ends the expedition", lambda: evaluate(page, "resetRun();__game.timeLeft=.01;advance(.04);if(__game.state!=='lost')throw Error('timeout failed');"))
    check("locked exit blocks incomplete treasure run", lambda: evaluate(page, """
        resetRun();at(233);advance(.04);
        if(__game.state!=='playing'||__game.primary().x>232)throw Error('gate allowed incomplete run');
        """))

    def full_route():
        result = evaluate(page, """
        resetRun();const a=__game,p=a.primary();a.dev.god=true;
        const records=[];
        // Each authored region is traversed through normal physics. Travel between
        // encounter starts uses the shipped developer travel tool's teleport.
        const walk=(target)=>{
          for(let i=0;i<900&&Math.abs(p.x-target)>.35;i++)advance(1/60,{x:Math.sign(target-p.x)});
          if(Math.abs(p.x-target)>1)throw Error('route blocked '+JSON.stringify({target,x:p.x,y:p.y,climb:p.climb,swing:p.swing}));
        };
        at(11);walk(13);records.push('sun coin');
        at(35);walk(38);records.push('chalice');
        at(48);advance(.04,{action:true});advance(2.4);walk(65);records.push('emerald');
        walk(89.7);advance(.6);advance(.04,{y:-1});advance(2.4,{y:-1});records.push('first cave ascent');
        at(114);walk(120);records.push('opal');
        at(132);advance(.04,{action:true});advance(2.4);walk(149);records.push('moon idol');
        walk(175.8);advance(.6);advance(.04,{y:-1});advance(2.4,{y:-1});records.push('second cave ascent');
        at(215);walk(219);records.push('golden grin');
        if(!a.found.every(Boolean))throw Error('missing treasure '+JSON.stringify(a.found));
        at(228);walk(233);
        if(a.state!=='won'||a.ui.current!=='results')throw Error('victory not reached');
        return {records,state:a.state,treasures:a.found,score:a.score,stats:a.stats};
        """)
        DETAILS["completeRoute"] = result
    check("complete six-treasure expedition and victory", full_route)
    def continuous_playthrough():
        DETAILS["continuousPlaythrough"] = page.evaluate("() => scriptedExpedition()")
    check("continuous controller playthrough without developer travel", continuous_playthrough)

    def dev_sliders():
        evaluate(page, "resetRun();__game.ui.pause();__game.ui.dev();")
        speed = page.locator("#tuning-speed")
        speed.fill("8.5")
        speed.dispatch_event("input")
        gravity = page.locator("#tuning-gravity")
        gravity.fill("18")
        gravity.dispatch_event("input")
        require(page.evaluate("__game.tuning.speed===8.5 && __game.physics.gravity.y===-18"), "live tuning did not apply")
        page.get_by_role("button", name="Reset tuning").click()
        require(page.evaluate("__game.tuning.speed===6.2 && __game.physics.gravity.y===-25"), "tuning reset failed")
        page.locator("#dev-collisions").check()
        require(page.evaluate("__game.colliderView.visible"), "collider visualization missing")
        page.get_by_role("button", name="Back to the trail").click()
    check("developer live sliders, reset and collision display", dev_sliders)
    check("pause freezes the solo simulation", lambda: evaluate(page, """
        resetRun();__game.ui.pause();const t=__game.timeLeft;advance(2);
        if(__game.timeLeft!==t)throw Error('pause failed');__game.ui.action('resume');
        """))

    def settings():
        evaluate(page, "resetRun();__game.ui.pause();__game.ui.settings();")
        page.locator("#setting-music").fill("23")
        page.locator("#setting-music").dispatch_event("input")
        require(page.evaluate("__game.audio.music===.23"), "music gain did not change")
        page.locator("#glyphs").select_option("xbox")
        evaluate(page, "__game.controls.device='gamepad';__game.ui.prompts();")
        require(page.evaluate("__game.controls.glyph('jump')==='Ⓐ'"), "Xbox prompts missing")
        page.locator("#setting-music").fill("10")
        page.locator("#setting-music").dispatch_event("input")
        page.locator("#glyphs").select_option("playstation")
    check("settings update audio, persistence and controller glyphs", settings)

    def pad():
        evaluate(page, """
        __game.ui.action('resume');resetRun();__game.manual=false;__game.testInput=null;
        window.mockPad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
        Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.mockPad]});
        """)
        page.wait_for_timeout(250)
        x = page.evaluate("__game.primary().x")
        page.evaluate("mockPad.axes[0]=1")
        page.wait_for_timeout(350)
        page.evaluate("mockPad.axes[0]=0;mockPad.buttons[0]={pressed:true,value:1}")
        page.wait_for_timeout(120)
        require(page.evaluate("__game.primary().x") > x + .6, "gamepad axis failed")
        require(page.evaluate("__game.primary().y") > .2, "gamepad jump failed")
        page.evaluate("mockPad.buttons[0]={pressed:false,value:0};mockPad.buttons[9]={pressed:true,value:1}")
        page.wait_for_function("__game.ui.current==='pause'")
        page.evaluate("mockPad.buttons[9]={pressed:false,value:0}")
        page.wait_for_timeout(100)
        page.evaluate("mockPad.buttons[0]={pressed:true,value:1}")
        page.wait_for_function("__game.ui.current===null")
        page.evaluate("mockPad.buttons[0]={pressed:false,value:0};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]})")
    check("standard gamepad movement, jump and pause navigation", pad)

    def audio():
        data = page.evaluate("""async () => {
         const a=__game,ctx=new OfflineAudioContext(1,44100,44100),synth=new a.audio.constructor();
         synth.ctx=ctx;synth.fxBus=ctx.createGain();synth.musicBus=ctx.createGain();
         synth.fxBus.gain.value=.75;synth.musicBus.gain.value=.1;synth.fxBus.connect(ctx.destination);synth.musicBus.connect(ctx.destination);
         synth.tone(440,0,.3,'triangle',.2);synth.noise(.3,.1,.15);synth.speak(1);
         const b=await ctx.startRendering(),d=b.getChannelData(0);let sum=0,peak=0;
         for(const v of d){sum+=v*v;peak=Math.max(peak,Math.abs(v));}
         return {rms:Math.sqrt(sum/d.length),peak,syllables:synth.metrics.syllables};
        }""")
        DETAILS["audio"] = data
        require(data["rms"] > .005 and data["peak"] < 1 and data["syllables"] == 5, "synthesis silent or clipped: " + str(data))
    check("offline synthesis produces effects and gibberish without clipping", audio)

    def attract():
        evaluate(page, "__game.net.disconnect();__game.title();__game.lastInput=performance.now()-10020;")
        page.wait_for_function("__game.state==='attract'")
        require(page.locator("#attractBadge").is_visible(), "attract badge missing")
        evaluate(page, "__game.attractStep(52);")
        require(page.evaluate("__game.primary().layer===1"), "attract did not visit underground")
        page.keyboard.press("KeyQ")
        page.wait_for_function("__game.state==='title'")
    check("ten-second attract mode, underground reel and input exit", attract)

    def about():
        page.get_by_role("button", name="About", exact=True).click()
        for label in ["Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"]:
            page.get_by_role("button", name=label, exact=True).click()
            require(page.locator(".panel").inner_text().find("unknown") >= 0 or page.locator(".panel").inner_text().find("Source") >= 0, "about content missing")
        require(page.evaluate("JSON.parse(document.getElementById('sourceInfo').textContent).sourceInformation.usage") == "added on import", "usage contract missing")
    check("all four required About and feedback sections", about)

    check("no uncaught gameplay errors", lambda: require(not errors, "; ".join(errors[:4])))
    DETAILS["gameplayErrors"] = errors
    ctx.close()


def touch_checks(browser, base):
    ctx = browser.new_context(
        viewport={"width": 844, "height": 390},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    ctx.route("https://cdn.jsdelivr.net/**", dependencies)
    page = ctx.new_page()
    ready(page, base + "/" + GAME)
    def touch_play():
        page.get_by_role("button", name="Begin expedition").tap()
        page.wait_for_timeout(250)
        cdp = ctx.new_cdp_session(page)
        start = page.evaluate("__game.primary().x")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 130, "y": 240, "id": 1}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": 200, "y": 240, "id": 1}]})
        page.wait_for_timeout(300)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 200, "y": 240, "id": 1}, {"x": 650, "y": 230, "id": 2}]})
        page.wait_for_timeout(160)
        require(page.evaluate("__game.primary().x") > start + .5, "touch stick did not move")
        require(page.evaluate("__game.primary().y") > .1, "multitouch jump did not work")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        require(page.evaluate("__game.controls.device") == "touch", "touch prompts missing")
        require(page.locator("#pauseButton").is_visible(), "touch menu inaccessible")
    check("touch movement and simultaneous jump", touch_play)
    check("touch menu fits the viewport", lambda: evaluate(page, """
        __game.ui.pause();const r=document.querySelector('.panel').getBoundingClientRect();
        if(r.left<0||r.right>innerWidth||r.height>innerHeight)throw Error('touch panel overflow');
        """))
    ctx.close()


def peer_checks(browser, base):
    ctx = browser.new_context(viewport={"width": 960, "height": 540})
    ctx.route("https://cdn.jsdelivr.net/**", dependencies)
    host, guest = ctx.new_page(), ctx.new_page()
    ready(host, base + "/" + GAME)
    ready(guest, base + "/" + GAME)
    def direct_link():
        offer = host.evaluate("() => __game.net.createPeer(true)")
        answer = guest.evaluate("(code) => __game.net.createPeer(false,code)", offer)
        host.evaluate("(code) => __game.net.answer(code)", answer)
        host.wait_for_function("__game.net.active && __game.players.length===2", timeout=15000)
        guest.wait_for_function("__game.net.active && __game.net.remoteSeen>0", timeout=15000)
        guest.evaluate("__game.ignoreInputUntil=0;__game.controls.keys.add('KeyD')")
        guest.wait_for_timeout(450)
        guest.evaluate("__game.controls.keys.clear()")
        require(host.evaluate("__game.players.find(p=>p.id===1).x") > 3, "guest input did not reach host")
        host.evaluate("__game.teleport(__game.players[0],13,0)")
        guest.wait_for_function("__game.found[0]===true")
        require(guest.evaluate("__game.score") >= 1000, "treasure not synchronized")
        guest.keyboard.press("Space")
        host.wait_for_function("__game.players.find(p=>p.id===1).y>.15", timeout=3000)
        host.evaluate("__game.found.fill(true);__game.teleport(__game.players[0],233,0)")
        guest.wait_for_function("__game.state==='won'")
        host.evaluate("__game.ui.action('restart')")
        guest.wait_for_function("__game.state==='playing' && __game.ui.current===null")
        require(guest.evaluate("__game.found.every(x=>!x)"), "restart did not synchronize")
        DETAILS["directLink"] = {"hostPlayers": host.evaluate("__game.players.length"), "guestSnapshots": guest.evaluate("__game.net.remoteSeen")}
    check("standalone WebRTC co-op input and shared treasure", direct_link)
    def malformed():
        result = guest.evaluate("async()=>{try{await __game.net.createPeer(false,'bad-code');return false;}catch(e){return /incomplete/.test(e.message)}}")
        require(result, "bad connection code was not explained")
    check("invalid direct-link code gets a readable error", malformed)
    host.close()
    guest.close()
    ctx.close()


def hub_checks(driver, base):
    for players, scenario, net in [(2, "standard", ""), (4, "standard", "&latency=150&jitter=50&loss=5"), (4, "host-leave", "&latency=150&jitter=50&loss=5"), (2, "server", "")]:
        def scenario_check(players=players, scenario=scenario, net=net):
            browser = driver.chromium.launch(headless=True, args=["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--disable-dev-shm-usage"])
            ctx = browser.new_context(viewport={"width": 1280, "height": 720})
            ctx.route("https://cdn.jsdelivr.net/**", dependencies)
            page = ctx.new_page()
            url = base + "/hub/harness.html?game=../" + GAME + "&players=" + str(players) + "&scenario=" + scenario + "&auto=1" + net
            ready_harness = page.goto(url)
            page.wait_for_function("document.body.dataset.complete==='true'", timeout=100000)
            report = page.evaluate("window.__hubCheck")
            DETAILS["hub-" + scenario + "-" + str(players)] = report
            bad = [c["name"] + ": " + c.get("detail", "") for c in report["checks"] if not c["pass"]]
            ctx.close()
            browser.close()
            require(report["pass"], "; ".join(bad))
        check("AI Hub " + str(players) + " players / " + scenario, scenario_check)


def visual_checks(browser, base):
    if not VISUAL:
        return
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    ctx.route("https://cdn.jsdelivr.net/**", dependencies)
    page = ctx.new_page()
    ready(page, base + "/" + GAME + "?renderer=webgl")
    page.evaluate("__game.lastInput=performance.now()+60000")
    page.screenshot(path=str(ROOT / "title.png"))
    page.evaluate("__game.start(1)")
    page.evaluate("__game.teleport(__game.primary(),34,0);__game.cameraX=38;")
    page.wait_for_timeout(600)
    page.screenshot(path=str(ROOT / "gameplay.png"))
    page.evaluate("__game.teleport(__game.primary(),63,-7);__game.cameraX=66;__game.cameraY=-4;")
    page.wait_for_timeout(700)
    page.screenshot(path=str(ROOT / "underground.png"))
    ctx.close()


def main():
    for name in ["combined-check.mjs", "build.mjs"]:
        def syntax(name=name):
            result = subprocess.run(["node", "--check", str(ROOT / name)], text=True, capture_output=True)
            require(result.returncode == 0, result.stderr)
        check("JavaScript syntax " + name, syntax)
    check("exit interview JSON shape", lambda: require(set(json.loads((ROOT.parent / "exit-interview.json").read_text())) == {"sourceInformation", "testingFeedback", "engineFeedback", "promptFeedback", "aiHub"}, "invalid JSON shape"))
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.server_address[1])
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--disable-dev-shm-usage"])
            try:
                if "--playthrough-only" in sys.argv:
                    ctx=browser.new_context()
                    ctx.route("https://cdn.jsdelivr.net/**",dependencies)
                    page=ctx.new_page()
                    ready(page,(ROOT/GAME).as_uri())
                    page.evaluate(HELPERS)
                    page.evaluate((ROOT/"playthrough.js").read_text())
                    def bot_only():
                        DETAILS["continuousPlaythrough"]=page.evaluate("()=>scriptedExpedition()")
                    check("continuous controller playthrough",bot_only)
                    ctx.close()
                else:
                    check("core browser suite", lambda: run_game_checks(browser, base))
                if "--playthrough-only" not in sys.argv:
                    check("touch browser suite", lambda: touch_checks(browser, base))
                if "--playthrough-only" not in sys.argv:
                    check("standalone network suite", lambda: peer_checks(browser, base))
                browser.close()
                if "--playthrough-only" not in sys.argv:
                    hub_checks(p, base)
                browser = p.chromium.launch(headless=True, args=["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--disable-dev-shm-usage"])
                if VISUAL:
                    check("visual capture for TV review", lambda: visual_checks(browser, base))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (ROOT / "test-results.json").write_text(json.dumps({"checks": CHECKS, "failures": FAILURES, "details": DETAILS}, indent=2))
    for failure in FAILURES:
        print("FAIL: " + failure)
    print(str(CHECKS - len(FAILURES)) + "/" + str(CHECKS) + " checks passed; " + str(len(FAILURES)) + " failures")
    return 1 if FAILURES else 0


if __name__ == "__main__":
    sys.exit(main())
