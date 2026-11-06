import json
import traceback
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

base = Path(__file__).resolve().parents[1]
release = json.loads((base / "release.json").read_text())
url = (base.parent / (release["basename"] + ".html")).as_uri()
checks = []


def check(name, ok, detail=""):
    checks.append(
        {"name": name, "pass": bool(ok), "detail": str(detail) if not ok else ""}
    )
    (base / "evidence/browser-live.json").write_text(json.dumps(checks))


def marker(page):
    return page.evaluate(
        "window.__game?.debug.snapshot().fingerprint==='buzz-comb-party-20261106'"
    )


def reset(page):
    page.evaluate("__BUZZ.title(); __game.input.clear()")
    page.wait_for_function("__game.sceneName==='title'")


def shot(page, name):
    page.evaluate("__game.advance(0,{draw:true})")
    page.screenshot(path=str(base / "evidence" / name))


PAD = """window.__pads=[];window.__setPad=(i,buttons=[],axis=0)=>{__pads[i]={id:'Wireless Controller',index:i,connected:true,mapping:'standard',axes:[axis,0,0,0],buttons:Array.from({length:18},(_,k)=>({pressed:buttons.includes(k),value:buttons.includes(k)?1:0,touched:buttons.includes(k)}))};};Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});"""
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script(PAD)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        page.wait_for_function("window.__BUZZ?.ready")
        check(
            "single-file Chromium boot and build marker",
            marker(page) and page.evaluate("__game.sceneName") == "title",
        )
        check(
            "default music and PlayStation glyphs",
            page.evaluate(
                "__game.settings.music===.1 && __game.settings.glyphs==='playstation'"
            ),
        )
        shot(page, "title.png")
        # Native menu navigation from standard pad.
        page.evaluate("__setPad(0,[0])")
        page.wait_for_timeout(150)
        page.evaluate("__setPad(0,[])")
        page.wait_for_function("__game.sceneName==='play'")
        check(
            "standard controller starts the game without a mouse",
            page.evaluate("__game.sceneName") == "play",
        )
        page.evaluate("__game.advance(3.1)")
        x = page.evaluate("__BUZZ.world.players[0].x")
        ammo = page.evaluate("__BUZZ.world.players[0].ammo")
        page.evaluate("__setPad(0,[0],.8)")
        page.wait_for_timeout(500)
        page.evaluate("__setPad(0,[])")
        check(
            "stick movement plus Cross sprays",
            page.evaluate("__BUZZ.world.players[0].x") > x + 5
            and page.evaluate("__BUZZ.world.players[0].ammo") < ammo,
        )
        ammo = page.evaluate("__BUZZ.world.players[0].ammo")
        page.evaluate("__setPad(0,[7])")
        page.wait_for_timeout(300)
        page.evaluate("__setPad(0,[])")
        check("R2 also sprays", page.evaluate("__BUZZ.world.players[0].ammo") < ammo)
        page.evaluate(
            "BCP.placeComb(__BUZZ.world,430,3,false,'pad-call-proof');__setPad(0,[2])"
        )
        page.wait_for_timeout(150)
        page.evaluate("__setPad(0,[])")
        check(
            "Square calls Pip through shared ability",
            page.evaluate("__BUZZ.world.coverage.call===true"),
        )
        page.evaluate("__setPad(0,[9])")
        page.wait_for_timeout(200)
        page.evaluate("__setPad(0,[])")
        page.wait_for_function("__game.paused")
        before = page.evaluate("JSON.stringify(BCP.snapshot(__BUZZ.world))")
        page.wait_for_timeout(200)
        check(
            "Options pauses all standalone simulation timers",
            before == page.evaluate("JSON.stringify(BCP.snapshot(__BUZZ.world))"),
        )
        shot(page, "pause.png")
        page.get_by_role("button", name="Developer Tools", exact=True).click()
        page.get_by_role("button", name="Live tuning: combat", exact=True).click()
        page.evaluate(
            "__game.settings.set('lab_capacity',24); __game.settings.set('lab_beeSpeed',82)"
        )
        check(
            "live tuning changes real simulation and clamps fill",
            page.evaluate(
                "__BUZZ.world.tuning.beeSpeed===82 && __BUZZ.world.players[0].ammo<=24 && __BUZZ.world.assisted"
            ),
        )
        page.get_by_role(
            "button", name="Reset all tuning to defaults", exact=True
        ).click()
        check(
            "tuning reset restores widgets and simulation",
            page.evaluate(
                "__game.settings.lab_beeSpeed===48 && __BUZZ.world.tuning.beeSpeed===48 && __BUZZ.world.tuning.capacity===56"
            ),
        )
        page.get_by_role("button", name="Back", exact=True).last.click()
        page.get_by_role("button", name="Timing & protection", exact=True).click()
        tick = page.evaluate("__BUZZ.world.tick")
        page.get_by_role("button", name="Advance one tick", exact=True).click()
        check(
            "developer single tick works while overlay is frozen",
            page.evaluate("__BUZZ.world.tick") == tick + 1,
        )
        shot(page, "dev-tools.png")
        imported = page.evaluate('__game.debug.import(\'{"tuning":{"capacity":-4}}\')')
        check(
            "invalid JSON profile keeps known-good tuning",
            not imported["ok"] and page.evaluate("__BUZZ.world.tuning.capacity") == 56,
        )
        page.evaluate("__game.shell.hide();__game.advance(.05);null")
        page.keyboard.press("Escape")
        page.wait_for_function("__game.paused && __game.shell.screen==='pause'")
        page.get_by_role("button", name="Settings", exact=True).click()
        page.evaluate(
            "__game.settings.set('music',.25);__game.settings.set('glyphs','xbox')"
        )
        page.reload()
        page.wait_for_function("window.__BUZZ?.ready")
        check(
            "ordinary settings persist across reload",
            page.evaluate(
                "__game.settings.music===.25 && __game.settings.glyphs==='xbox'"
            ),
        )
        page.evaluate(
            "__game.settings.reset('Sound');__game.settings.reset('Controller')"
        )
        check(
            "settings defaults restore ten-percent music and PS symbols",
            page.evaluate(
                "__game.settings.music===.1 && __game.settings.glyphs==='playstation'"
            ),
        )
        # Native controls rebinding and PS/Xbox label selection.
        page.evaluate(
            "__game.input.rebind('call','keys','KeyQ');__game.settings.set('glyphs','xbox');__game.input.lastDevice='gamepad'"
        )
        check(
            "rebindings and device labels come from native input",
            page.evaluate(
                "__game.input.label('call','keys')==='Q' && __game.input.label('fire','gamepad')==='A'"
            ),
        )
        page.evaluate(
            "__game.input.resetBindings();__game.settings.set('glyphs','playstation')"
        )
        reset(page)
        page.keyboard.press("Enter")
        page.evaluate("__game.advance(3)")
        # Pointer aim is actual horizontal travel; parked pointer relinquishes to keys.
        page.mouse.move(1500, 850)
        page.mouse.down()
        page.wait_for_timeout(400)
        page.mouse.up()
        check(
            "mouse aim and spray use bounded can travel",
            page.evaluate(
                "__BUZZ.world.players[0].x>320 && __BUZZ.world.players[0].x<550 && __BUZZ.world.stats.shots>0"
            ),
        )
        x = page.evaluate("__BUZZ.world.players[0].x")
        page.keyboard.down("a")
        page.wait_for_timeout(300)
        page.keyboard.up("a")
        check(
            "parked pointer does not fight keyboard movement",
            page.evaluate("__BUZZ.world.players[0].x") < x,
        )
        # Pad disconnect pauses safely and consumes held fire.
        page.evaluate("__setPad(0,[],.8)")
        page.wait_for_timeout(100)
        page.evaluate("__pads=[]")
        page.wait_for_timeout(200)
        check(
            "controller disconnect pauses standalone and explains recovery",
            page.evaluate("__game.paused && __game.pauseReason==='controller'"),
        )
        # Attract threshold and consumed interruptions, driven on exact engine clock.
        reset(page)
        page.evaluate(
            "__game.stop();__BUZZ.adapter.activityAt=__game.real;__game.advance(9.99)"
        )
        check(
            "attract waits until ten seconds of real idle",
            not page.evaluate("__BUZZ.attract"),
        )
        page.evaluate("__game.advance(.02)")
        check(
            "ten-second idle starts real simulation demonstration",
            page.evaluate("__BUZZ.attract && __BUZZ.world.demo"),
        )
        page.keyboard.press("Space")
        page.evaluate("__game.advance(.1)")
        check(
            "keyboard attract wake is consumed at title",
            page.evaluate(
                "__game.sceneName==='title' && !__BUZZ.attract && !__BUZZ.world"
            ),
        )
        page.evaluate("__game.advance(10.3)")
        page.mouse.move(50, 600)
        page.evaluate("__game.advance(.1)")
        check(
            "pointer movement interrupts attract and is consumed",
            page.evaluate("__game.sceneName==='title' && !__BUZZ.attract"),
        )
        page.evaluate("__game.advance(10.3);__setPad(0,[],.12);__game.advance(.05)")
        check(
            "analog movement below gameplay dead zone wakes attract",
            page.evaluate("__game.sceneName==='title' && !__BUZZ.attract"),
        )
        page.evaluate(
            "__setPad(0,[]);__game.advance(.3);__game.advance(10.1);__setPad(0,[0]);__game.advance(.05);__setPad(0,[])"
        )
        check(
            "controller button wake cannot also start a run",
            page.evaluate("__game.sceneName==='title' && !__BUZZ.attract"),
        )
        check(
            "attract and assisted play do not write normal records",
            page.evaluate("__BUZZ.records().runs===0"),
        )
        # Content visual evidence: actual simulation, not screenshots used as score tests.
        page.evaluate(
            "__BUZZ.start();__game.advance(3);BCP.enterEncounter(__BUZZ.world,3);__BUZZ.world.status='live';__BUZZ.world.stageTime=26;for(let i=0;i<10;i++)BCP.spawnBee(__BUZZ.world,{x:60+i*54,tier:i%5,kind:i%3?'worker':'fast',dir:i%2?1:-1,reward:'visual'+i});BCP.queueGrowth(__BUZZ.world,280,360,3);__BUZZ.visual.update(__BUZZ.world,.02);__game.advance(.02)"
        )
        shot(page, "mixed-and-flower-warning.png")
        page.evaluate(
            "BCP.enterEncounter(__BUZZ.world,5);__BUZZ.world.status='live';BCP.placeComb(__BUZZ.world,288,2,true,'visual-red');__BUZZ.visual.update(__BUZZ.world,.02);__game.advance(.02)"
        )
        shot(page, "finale.png")
        # Complete ordinary-input run inside the final assembled artifact, then real result/restart flow.
        report = page.evaluate(
            """(()=>{__BUZZ.start();const w=__BUZZ.world;for(let i=0;i<120*1000&&!w.result;i++){if(i%12===0)BCP.applyAction(w,1,BCP.pilot(w));BCP.step(w);}__game.advance(.02);return {won:w.result?.won,time:w.time,scene:__game.sceneName,score:w.score,records:__BUZZ.records()};})()"""
        )
        check(
            "assembled game ordinary-input whole campaign reaches real win card",
            report.get("won")
            and report.get("scene") == "results"
            and 500 < report.get("time", 0) < 900,
            report,
        )
        check(
            "unassisted full campaign updates local records once",
            report["records"]["runs"] == 1 and report["records"]["wins"] == 1,
        )
        shot(page, "results.png")
        page.evaluate("__game.advance(.3)")
        page.keyboard.press("Enter")
        page.evaluate("__game.advance(.2)")
        check(
            "win card can start a clean fresh run",
            page.evaluate(
                "__game.sceneName==='play' && __BUZZ.world.score===0 && !__BUZZ.world.result"
            ),
        )
        # Explicit local device ownership, including independent two-keyboard halves.
        page.evaluate("__BUZZ.start(2,'mixed');__game.advance(3)")
        check(
            "keyboard plus pad assigns exclusive devices",
            page.evaluate(
                "__game.players.length===2 && __game.players[0].pad===null && __game.players[1].pad===0"
            ),
        )
        page.evaluate("__setPad(0,[0],.7);__game.advance(.4);__setPad(0,[])")
        check(
            "one pad cannot control both co-op cans",
            page.evaluate(
                "__BUZZ.world.stats.seats[1].hits===0 && __BUZZ.world.players[0].ammo===56 && __BUZZ.world.players[1].ammo<56"
            ),
        )
        page.evaluate("__BUZZ.start(2,'keys');__game.advance(3)")
        x1 = page.evaluate("__BUZZ.world.players[0].x")
        x2 = page.evaluate("__BUZZ.world.players[1].x")
        page.keyboard.down("d")
        page.keyboard.down("ArrowLeft")
        page.evaluate("__game.advance(.3)")
        page.keyboard.up("d")
        page.keyboard.up("ArrowLeft")
        check(
            "shared keyboard controls simultaneous independent cans",
            page.evaluate("__BUZZ.world.players[0].x") > x1
            and page.evaluate("__BUZZ.world.players[1].x") < x2,
        )
        # Objective code-audio evidence using the same oscillator envelope implementation.
        audio = page.evaluate(
            """async()=>{async function render(gain){const c=new OfflineAudioContext(1,22050,22050),bus=c.createGain();bus.gain.value=gain;bus.connect(c.destination);BCP.synthTone(c,bus,.01,440,.2,.2);BCP.synthTone(c,bus,.12,660,.3,.15,'square');const b=await c.startRendering(),d=b.getChannelData(0);return {peak:Math.max(...d.map(Math.abs)),rms:Math.sqrt(d.reduce((a,x)=>a+x*x,0)/d.length),finite:d.every(Number.isFinite)};}const loud=await render(1),music=await render(.1),mute=await render(0);return {loud,music,mute};}"""
        )
        check(
            "code audio produces finite non-silent non-clipped output",
            audio["loud"]["finite"] and 0.001 < audio["loud"]["peak"] < 1,
        )
        check(
            "music bus ten-percent gain and mute are correct",
            abs(audio["music"]["rms"] / audio["loud"]["rms"] - 0.1) < 0.001
            and audio["mute"]["peak"] == 0,
        )
        page.evaluate("__BUZZ.sound.stop()")
        check(
            "audio teardown stops generated voice nodes",
            page.evaluate("__BUZZ.sound.activeNodes===0 && __BUZZ.sound.paused"),
        )
        (base / "evidence/audio-report.json").write_text(json.dumps(audio, indent=2))
        for idx, label in enumerate(
            [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]
        ):
            page.evaluate("i=>__BUZZ.screens.about(i)", idx)
            check(
                "About includes " + label,
                page.get_by_role("heading", name=label, exact=True).count() == 1,
            )
            if idx == 0:
                shot(page, "about.png")
        page.evaluate("__game.shell.hide();__game.advance(.05);null")
        check(
            "Chromium session has no page or native game errors",
            not errors and page.evaluate("__game.errors.length") == 0,
            errors,
        )
        context.close()
        # Touch landscape and portrait. Native invisible steering, assist and contextual actions.
        touch = browser.new_context(**p.devices["iPhone 13"])
        phone = touch.new_page()
        phone_errors = []
        phone.on("pageerror", lambda e: phone_errors.append(str(e)))
        phone.goto(url)
        phone.wait_for_function("window.__BUZZ?.ready")
        phone.evaluate(
            '__game.input.lastDevice="touch";__game.advance(.02,{draw:true})'
        )
        shot(phone, "touch-title-portrait.png")
        phone.evaluate("__BUZZ.start();__game.advance(3);__game.stop();null")
        lower = phone.evaluate(
            "(()=>{const s=__game.screen,rc=s.canvas.getBoundingClientRect(),x=(__game.W-640)/2+320,y=(__game.H-360)/2+300;return {x:rc.left+(x*s.S+s.OX)/s.dpr,y:rc.top+(y*s.S+s.OY)/s.dpr};})()"
        )
        before = phone.evaluate("__BUZZ.world.players[0].x")
        cdp = touch.new_cdp_session(phone)
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [{"x": lower["x"], "y": lower["y"], "id": 1}],
            },
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [{"x": lower["x"] + 45, "y": lower["y"], "id": 1}],
            },
        )
        phone.evaluate("__game.advance(.3)")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        check(
            "touch drag steers the can with invisible controls",
            phone.evaluate("__BUZZ.world.players[0].x") > before + 12,
        )
        phone.evaluate(
            "const w=__BUZZ.world;w.bird.state='retreat';w.bird.timer=99;BCP.spawnBee(w,{x:w.players[0].x,tier:6,kind:'worker',dir:1,reward:'touch-proof'});__game.input.lastDevice='touch';__game.advance(.2)"
        )
        check(
            "safe touch assistance fires useful ordinary spray",
            phone.evaluate("__BUZZ.world.stats.shots>0"),
        )
        phone.evaluate(
            "__game.input.lastDevice='touch';__BUZZ.world.bird.state='idle';__BUZZ.world.bird.timer=20;__BUZZ.world.pulses=[]; __BUZZ.world.obstacles=[];BCP.placeComb(__BUZZ.world,320,3,true,'touch-context');__game.advance(.02)"
        )
        # Convert canonical comb coordinates through native screen buffer fit.
        # Native screen uses centered buffer offset; calculate by pointer round-trip where no margin API is public.
        point = phone.evaluate(
            "(()=>{const s=__game.screen,rc=s.canvas.getBoundingClientRect(),x=(__game.W-640)/2+320,y=(__game.H-360)/2+173;return {x:rc.left+(x*s.S+s.OX)/s.dpr,y:rc.top+(y*s.S+s.OY)/s.dpr};})()"
        )
        phone.touchscreen.tap(point["x"], point["y"])
        phone.evaluate("__game.advance(.05)")
        check(
            "touch parcel tap exposes contextual actions",
            phone.get_by_role("button", name="Harvest parcel", exact=True).count() == 1,
        )
        if phone.get_by_role("button", name="Harvest parcel", exact=True).count():
            phone.get_by_role("button", name="Harvest parcel", exact=True).click()
            phone.evaluate("__game.advance(.3)")
            check(
                "touch harvest uses the ordinary shared call",
                phone.evaluate("__BUZZ.world.coverage.call===true"),
            )
        phone.evaluate("__game.menu();__game.advance(.02)")
        check(
            "touch menu opens native pause",
            phone.evaluate("__game.paused && __game.shell.screen==='pause'"),
        )
        phone.evaluate("__game.shell.hide();__game.advance(.02)")
        phone.set_viewport_size({"width": 844, "height": 390})
        phone.wait_for_function("!__game.screen.portrait")
        phone.evaluate("__game.advance(.05,{draw:true})")
        check(
            "orientation change preserves canonical arena geometry",
            phone.evaluate(
                "BCP.ARENA.w===640 && BCP.ARENA.h===360 && __BUZZ.world.players.every(p=>p.x>=28&&p.x<=612)"
            ),
        )
        check(
            "touch rotation draws without native or page errors",
            not phone_errors and phone.evaluate("__game.errors.length===0"),
            phone_errors,
        )
        check(
            "rotation keeps arena centered in the visible buffer",
            phone.evaluate(
                "Math.abs(__game.r.w(320,180)[0]-__game.W/2)<3 && Math.abs(__game.r.w(320,180)[1]-__game.H/2)<3"
            ),
        )
        shot(phone, "touch-landscape.png")
        # Real multi-touch steering plus a second touch, then cancellation releases both.
        lower = phone.evaluate(
            "(()=>{const s=__game.screen,rc=s.canvas.getBoundingClientRect();return {x:rc.left+((__game.W-640)/2+320)*s.S/s.dpr+s.OX/s.dpr,y:rc.top+((__game.H-360)/2+300)*s.S/s.dpr+s.OY/s.dpr};})()"
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": lower["x"], "y": lower["y"], "id": 1},
                    {"x": lower["x"] + 70, "y": lower["y"] - 65, "id": 2},
                ],
            },
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [
                    {"x": lower["x"] + 35, "y": lower["y"], "id": 1},
                    {"x": lower["x"] + 70, "y": lower["y"] - 65, "id": 2},
                ],
            },
        )
        phone.evaluate("__game.advance(.1)")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
        phone.evaluate("__game.advance(.1)")
        check(
            "multi-touch cancellation releases invisible steering",
            phone.evaluate("!__game.input.stickOn && __game.input._fingers.size===0"),
        )
        phone.evaluate(
            "__BUZZ.title();__game.advance(.3);__BUZZ.adapter.activityAt=__game.real;__game.advance(10.02)"
        )
        phone.touchscreen.tap(300, 150)
        phone.evaluate("__game.advance(.05)")
        check(
            "touch wakes attract and consumes its opening tap",
            phone.evaluate(
                "!__BUZZ.attract && __game.sceneName==='title' && !__BUZZ.world"
            ),
        )
        touch.close()
        denied = browser.new_context(viewport={"width": 960, "height": 540})
        denied.add_init_script(
            "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError')}})"
        )
        dp = denied.new_page()
        dp.goto(url)
        dp.wait_for_function("window.__BUZZ?.ready")
        dp.keyboard.press("Enter")
        dp.wait_for_function("__game.sceneName==='play'")
        check(
            "denied local storage falls back to a playable visit",
            dp.evaluate("__BUZZ.world!==null && __game.errors.length===0"),
        )
        denied.close()
        isolated = base / "evidence/isolated-release.html"
        isolated.write_bytes(
            (base.parent / (release["basename"] + ".html")).read_bytes()
        )
        moved = browser.new_context(viewport={"width": 960, "height": 540})
        mp = moved.new_page()
        mp.goto(isolated.as_uri())
        mp.wait_for_function("window.__BUZZ?.ready")
        check(
            "HTML copied away from sources boots without dependencies",
            marker(mp) and mp.evaluate("__game.errors.length===0"),
        )
        moved.close()
        browser.close()
        # A second compatible browser; WebKit is an emulation, not physical iOS.
        webkit = p.webkit.launch(headless=True)
        context = webkit.new_context(viewport={"width": 1280, "height": 720})
        other = context.new_page()
        other.goto(url)
        other.wait_for_function("window.__BUZZ?.ready")
        other.keyboard.press("Enter")
        other.wait_for_function("__game.sceneName==='play'")
        other.evaluate("__game.advance(3)")
        other.keyboard.down("Space")
        other.wait_for_timeout(250)
        other.keyboard.up("Space")
        check(
            "WebKit boots, takes input and draws native game without errors",
            other.evaluate("__BUZZ.world.stats.shots>0 && __game.errors.length===0"),
        )
        context.close()
        webkit.close()
except (PlaywrightError, OSError, ValueError, TypeError):
    check("browser automation completed", False, traceback.format_exc())
(base / "evidence/browser-report.json").write_text(
    json.dumps({"checks": checks}, indent=2)
)
print(json.dumps({"checks": checks}))
