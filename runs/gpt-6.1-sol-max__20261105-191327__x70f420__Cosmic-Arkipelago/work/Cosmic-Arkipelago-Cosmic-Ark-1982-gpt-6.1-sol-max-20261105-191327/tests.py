"""One-command acceptance suite: npm test --silent. Emits failures and one count line."""

import functools
import http.server
import json
import pathlib
import threading
import traceback

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
GAME = ROOT.name + ".html"
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
results = []
details = {}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def test(name, fn):
    try:
        fn()
        results.append({"name": name, "pass": True})
    except Exception as error:  # noqa: BLE001
        results.append(
            {
                "name": name,
                "pass": False,
                "error": str(error),
                "traceback": traceback.format_exc(),
            }
        )
        print(f"FAIL {name}: {error}", flush=True)


def require(condition, message):
    assert condition, message


def boot(page, url):
    page.goto(url, wait_until="load", timeout=60000)
    page.wait_for_function("window.__ark?.ready || window.__arkError", timeout=60000)
    require(page.evaluate("!!window.__ark?.ready"), page.evaluate("window.__arkError"))
    page.wait_for_function("__ark.engine.renderFrames > 2")


def jscheck(page, expression):
    result = page.evaluate(expression)
    require(result is True, str(result))


def state_test(page, setup, assertion):
    page.evaluate(setup)
    jscheck(page, assertion)


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT.parent))
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f"http://127.0.0.1:{server.server_address[1]}"
url = origin + "/" + GAME

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--enable-unsafe-swiftshader",
            ],
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        test(
            "offline single-file WebGPU startup",
            lambda: boot(page, (ROOT.parent / GAME).as_uri()),
        )
        if not page.evaluate("!!window.__ark?.ready"):
            raise RuntimeError("Startup failed; dependent checks cannot run")
        test(
            "WebGPU backend selected",
            lambda: jscheck(page, '__ark.engine.backend === "WebGPU"'),
        )
        test(
            "single-file dependencies embedded",
            lambda: require(
                "<script src=" not in (ROOT.parent / GAME).read_text(),
                "External script dependency",
            ),
        )

        def keyboard_menu():
            page.keyboard.press("ArrowDown")
            require(
                page.evaluate("document.activeElement.dataset.action") == "crew",
                "Down did not focus Crew up",
            )
            page.keyboard.press("ArrowUp")
            page.keyboard.press("Enter")
            page.wait_for_function('__ark.mode === "playing" && __ark.menu === null')
            require(
                page.evaluate("__ark.sim.started"), "Launch did not start simulation"
            )

        test("keyboard focus and launch", keyboard_menu)
        test(
            "unmodified Hub client embedded first",
            lambda: require(
                (ROOT / "session.js").read_text()
                in (ROOT.parent / GAME)
                .read_text()
                .split("<script>", 1)[1]
                .split("</script>", 1)[0],
                "Hub client was altered or moved after game code",
            ),
        )

        def mouse_controls():
            page.evaluate("__ark.start();__ark.sim.spawnClock=999")
            page.mouse.move(1320, 450)
            page.mouse.down()
            page.wait_for_function(
                '__ark.sim.events.some(e=>e.type==="shot" && e.x===1 && e.y===0)'
            )
            page.mouse.up()
            jscheck(page, '__ark.input.last === "keyboard"')

        test("mouse aims and fires at world coordinates", mouse_controls)

        test(
            "Rapier shot/meteor collision and reward",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.spawnClock=999;a.sim.spawnRock(0,'rock');a.advance(3,{x:1,y:0});}""",
                "__ark.sim.destroyed > 0 && __ark.sim.score > 0",
            ),
        )
        test(
            "Rapier meteor/Ark collision and fuel loss",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.spawnClock=999;const e=a.sim.spawnRock(0,'rock');a.sim.move(e,2.1,0);a.advance(.8,{x:0,y:0});}""",
                "__ark.sim.damageTaken > 0 && __ark.sim.energy < 90",
            ),
        )
        test(
            "shield pulse clears nearby hazards and recharges",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.spawnClock=999;for(let d=0;d<4;d++){const e=a.sim.spawnRock(d,'heavy');a.sim.move(e,Math.cos(d*Math.PI/2)*5,Math.sin(d*Math.PI/2)*5);}a.sim.pulse();window.pulseAgain=a.sim.pulse();}""",
                "__ark.sim.destroyed === 4 && __ark.sim.pulseCd > 9 && pulseAgain === false",
            ),
        )

        def rescue():
            page.evaluate(
                """() => {const a=__ark;a.start();a.sim.beginRescue();a.sim.laserClock=999;a.sim.shuttle.x=-8;a.sim.shuttle.y=-2.5;a.advance(2,{beam:true,x:0,y:0});}"""
            )
            jscheck(page, "__ark.state.shuttle.cargo.length === 1")
            page.evaluate(
                """() => {const a=__ark;a.sim.shuttle.x=0;a.sim.shuttle.y=5.7;a.advance(.5,{x:0,y:0});}"""
            )
            jscheck(
                page,
                "__ark.state.totalRescued === 1 && __ark.state.bank[0] && __ark.state.shuttle.cargo.length === 0",
            )
            page.evaluate(
                """() => {const a=__ark;a.sim.shuttle.x=8;a.sim.shuttle.y=-2.5;a.advance(2,{beam:true,x:0,y:0});a.sim.shuttle.x=0;a.sim.shuttle.y=5.7;a.advance(.5,{x:0,y:0});}"""
            )
            jscheck(
                page,
                '__ark.state.totalRescued === 2 && __ark.state.phase === "transit"',
            )

        test("tractor pickup, partial docking, and world completion", rescue)

        test(
            "planetary defense telegraph and physics hit",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.beginRescue();a.sim.laserClock=999;a.sim.shuttle.inv=0;a.sim.shuttle.x=5;a.sim.shuttle.y=-2;a.sim.spawnLaser();a.sim.lasers[0].y=-2;a.advance(1.5,{x:0,y:0});}""",
                "__ark.sim.damageTaken > 0 && __ark.state.shuttle.y > 4",
            ),
        )
        test(
            "cargo setback releases exactly one beastie",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.beginRescue();a.sim.shuttle.inv=0;a.sim.shuttle.cargo=[0,1];a.sim.creatures.forEach(c=>c.state='cargo');a.sim.hurt(12,'pilot');}""",
                '__ark.state.shuttle.cargo.length === 1 && __ark.state.creatures.filter(c=>c.state === "ground").length === 1',
            ),
        )
        test(
            "boost grants brief invulnerability",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.beginRescue();a.advance(.05,{x:1,y:0,dash:true});window.beforeBoost=a.sim.energy;a.sim.hurt(20,'pilot');window.boostPrevented=a.sim.energy===beforeBoost;}""",
                "boostPrevented && __ark.state.shuttle.dash > 0 && __ark.state.shuttle.dashCd > 2",
            ),
        )
        test(
            "rescue timeout recalls into a fresh storm",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.beginRescue();a.sim.timer=.03;a.advance(.1,{x:0,y:0});}""",
                '__ark.state.phase === "orbit" && __ark.sim.retries === 1 && __ark.state.energy < 90',
            ),
        )
        test(
            "Glasswake crosswinds affect unpowered shuttle",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.worldIndex=1;a.sim.beginRescue();a.sim.time=Math.PI/.65/2;a.advance(1,{x:0,y:0});}""",
                "__ark.state.shuttle.x > .8",
            ),
        )
        test(
            "Embermere has crossing defense schedules",
            lambda: state_test(
                page,
                """() => {const a=__ark;a.start();a.sim.worldIndex=2;a.sim.beginRescue();a.sim.laserClock=.01;a.advance(.1,{x:0,y:0});}""",
                "__ark.state.lasers.length === 2 && __ark.state.lasers[0].y !== __ark.state.lasers[1].y",
            ),
        )
        test(
            "meteor events retain their event type",
            lambda: state_test(
                page,
                """() => {__ark.start();__ark.sim.spawnRock(1,'waver');}""",
                '__ark.sim.events.some(e=>e.type === "meteor" && e.meteorType === "waver" && e.eventId > 0)',
            ),
        )
        test(
            "Sunheart impact cannot count as defeating the boss",
            lambda: state_test(
                page,
                """() => {__ark.start();__ark.sim.beginFinale();__ark.sim.spawnClock=999;const e=__ark.sim.spawnRock(2,'sunheart');__ark.sim.move(e,0,2);__ark.advance(.1,{x:0,y:0});}""",
                '!__ark.state.bossDefeated && __ark.state.entities.some(e=>e.type === "sunheart" && e.hp === 14) && __ark.sim.damageTaken > 0',
            ),
        )

        def native_animation():
            page.evaluate("__ark.start();__ark.sim.beginRescue()")
            before = page.evaluate("__ark.engine.petGroups[0].g.children[0].position.y")
            page.wait_for_timeout(250)
            after = page.evaluate("__ark.engine.petGroups[0].g.children[0].position.y")
            require(before != after, "Native creature animation did not advance")
            jscheck(page, "__ark.engine.mixes.every(m=>m._actions.length > 0)")

        test("native AnimationMixer creature and ship clips advance", native_animation)

        def campaign():
            page.evaluate(
                """() => {__ark.start();window.campaignLog=[];const old=__ark.sim.onEvent;__ark.sim.onEvent=e=>{if(['phase','captured','delivered','boss','boss-down','victory'].includes(e.type))campaignLog.push(e);old(e);};__ark.advance(400);__ark.sim.onEvent=old;}"""
            )
            s = page.evaluate("__ark.state")
            require(s["phase"] == "victory", f"Campaign ended in {s['phase']}")
            require(
                s["totalRescued"] == 6 and s["bossDefeated"],
                "Campaign did not deliver all six and beat Sunheart",
            )
            log = page.evaluate("campaignLog")
            require(
                len([e for e in log if e["type"] == "captured"]) == 6,
                "Not every creature was actually beamed",
            )
            require(
                len([e for e in log if e["type"] == "delivered"]) == 6,
                "Not every creature was actually docked",
            )
            require(
                {
                    e["world"]
                    for e in log
                    if e["type"] == "phase" and e["phase"] == "rescue"
                }
                == {0, 1, 2},
                "Missing a world",
            )
            details["campaign"] = {
                k: s[k]
                for k in [
                    "phase",
                    "time",
                    "score",
                    "totalRescued",
                    "destroyed",
                    "damageTaken",
                    "bossDefeated",
                ]
            }

        test("complete campaign with default tuning and no invulnerability", campaign)
        test(
            "energy exhaustion produces defeat",
            lambda: state_test(
                page,
                """() => {__ark.start();__ark.sim.energy=.05;__ark.advance(.5,{x:0,y:0});}""",
                '__ark.state.phase === "defeat" && __ark.state.finished',
            ),
        )

        def menus():
            page.evaluate('__ark.start();__ark.act("pause")')
            before = page.evaluate("__ark.sim.time")
            page.wait_for_timeout(200)
            require(
                page.evaluate("__ark.sim.time") == before,
                "Pause did not freeze simulation",
            )
            page.evaluate('__ark.act("settings")')
            require(
                page.locator("#music").input_value() == "10", "Default music is not 10%"
            )
            page.locator("#music").fill("17")
            require(
                page.evaluate("__ark.settings.music") == 17,
                "Music slider did not apply",
            )
            page.evaluate(
                '__ark.act("reset-settings");__ark.act("back");__ark.act("dev")'
            )
            page.locator("#dev-shipSpeed").fill("11")
            require(
                page.evaluate("__ark.sim.cfg.shipSpeed") == 11,
                "Live tuning did not apply",
            )
            page.evaluate(
                '__ark.act("god");__ark.act("autopilot");__ark.act("colliders")'
            )
            jscheck(
                page,
                "__ark.sim.cheats.invulnerable && __ark.sim.cheats.autopilot && __ark.sim.cheats.colliders",
            )
            page.evaluate('__ark.act("dev-reset")')
            jscheck(
                page,
                "__ark.sim.cfg.shipSpeed === 7.5 && !__ark.sim.cheats.invulnerable && __ark.sim.cfg.timeScale === 1",
            )
            page.evaluate('__ark.act("resume")')

        test("pause, settings, live tuning, cheats, and reset", menus)

        def guide_about():
            page.evaluate('__ark.act("pause");__ark.act("guide")')
            for _ in range(3):
                require(
                    len(page.locator("#guide-copy").inner_text()) > 180,
                    "Empty guide page",
                )
                page.evaluate('__ark.act("guide-next")')
            page.evaluate('__ark.act("back");__ark.act("about")')
            for key in ["source", "testing", "engine", "prompt"]:
                page.evaluate('(k)=>__ark.act("about-"+k)', key)
                require(
                    len(page.locator("#about-copy").inner_text()) > 60,
                    "Missing credits section " + key,
                )
            page.evaluate('__ark.act("resume")')

        test("field guide and all four credits sections", guide_about)

        def gamepad():
            page.evaluate(
                """() => {window.testPad={index:0,connected:true,mapping:'standard',id:'Emulated DualSense',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[testPad]});__ark.toTitle();}"""
            )
            page.wait_for_timeout(100)
            page.evaluate("testPad.buttons[0]={pressed:true,value:1}")
            page.wait_for_function('__ark.mode === "playing"')
            page.evaluate(
                "testPad.buttons[0]={pressed:false,value:0};testPad.axes[0]=1"
            )
            page.wait_for_timeout(300)
            jscheck(
                page,
                '__ark.input.last === "gamepad" && __ark.sim.entities.some(e=>e.kind === "shot")',
            )
            page.evaluate(
                "testPad.axes[0]=0;testPad.buttons[8].pressed=true;testPad.buttons[9].pressed=true"
            )
            page.wait_for_timeout(100)
            jscheck(page, "__ark.menu === null")
            page.evaluate(
                "testPad.buttons[8].pressed=false;testPad.buttons[9].pressed=false"
            )
            page.wait_for_timeout(80)
            page.evaluate("testPad.buttons[9].pressed=true")
            page.wait_for_function('__ark.menu === "pause"')
            page.evaluate(
                'testPad.buttons[9].pressed=false;__ark.act("settings");__ark.act("glyphs")'
            )
            jscheck(page, '__ark.settings.glyphs === "xbox"')
            page.evaluate(
                '__ark.act("resume");__ark.sim.beginRescue();__ark.sim.shuttle.y=-2.5;testPad.axes[0]=1;testPad.buttons[0].pressed=true;testPad.buttons[1].pressed=true'
            )
            page.wait_for_function(
                "__ark.state.shuttle.beam && __ark.state.shuttle.dashCd > 0 && __ark.state.shuttle.x > 0"
            )
            page.evaluate(
                "testPad.axes[0]=0;testPad.buttons[0].pressed=false;testPad.buttons[1].pressed=false"
            )
            page.evaluate(
                '__ark.act("reset-settings");__ark.act("resume");Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[]})'
            )

        test("standard gamepad, Options chord, and Xbox glyph option", gamepad)

        def local_coop():
            page.evaluate("__ark.start({coop:true});__ark.sim.beginRescue()")
            page.keyboard.down("w")
            require(
                page.evaluate('__ark.input.sample("rescue",true).y') == 0,
                "P1 steered P2 in local co-op",
            )
            page.keyboard.up("w")
            page.keyboard.down("ArrowDown")
            require(
                page.evaluate('__ark.input.sample("rescue",true).y') == -1,
                "P2 arrow controls absent",
            )
            page.keyboard.up("ArrowDown")

        test("local co-op separates gunner and pilot keyboard controls", local_coop)

        def sound():
            page.mouse.click(20, 200)
            page.evaluate(
                '__ark.audio.unlock();__ark.audio.voice(1);__ark.audio.event({type:"pulse"})'
            )
            page.wait_for_timeout(120)
            a = page.evaluate("__ark.audioLevels()")
            require(a["rms"] > 0.0001 and a["notes"] > 0 and a["voices"] > 0, str(a))
            require(a["music"] == 10, "Music default changed")
            details["audio"] = a

        test("synth music, effects, and gibberish produce audio energy", sound)

        def attract_mode():
            page.evaluate(
                'Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[]});__ark.input.clear();__ark.toTitle();__ark.sim.cfg.stormSeconds=19;__ark.forceIdle()'
            )
            page.wait_for_function("__ark.attract")
            page.evaluate("__ark.advance(16)")
            require(
                page.evaluate("__ark.state.phase") == "rescue",
                "Attract did not show rescue",
            )
            page.evaluate("__ark.advance(300);__ark.sim.phaseTime=5")
            page.wait_for_function(
                '__ark.state.phase === "orbit" && __ark.state.worldIndex === 0'
            )
            page.keyboard.press("ArrowDown")
            page.wait_for_function('__ark.menu === "title" && !__ark.attract')
            jscheck(page, "__ark.sim.cfg.stormSeconds === 19")
            page.evaluate("__ark.sim.cfg.stormSeconds=23")

        test("ten-second attract, AI campaign, looping, and input exit", attract_mode)
        test(
            "no standalone runtime exceptions",
            lambda: require(not errors, "; ".join(errors)),
        )

        # WebGL is used for visual inspection because WSL WebGPU screenshots may be blank.
        page.set_viewport_size({"width": 1920, "height": 1080})
        boot(page, url + "?renderer=webgl")
        test(
            "WebGL 2 fallback startup",
            lambda: jscheck(page, '__ark.engine.backend === "WebGL 2 fallback"'),
        )
        page.screenshot(path=str(ART / "title.png"))
        page.evaluate(
            "__ark.start();__ark.sim.beginRescue();__ark.sim.shuttle.x=-8;__ark.sim.shuttle.y=-2.5"
        )
        page.wait_for_timeout(200)
        page.screenshot(path=str(ART / "rescue.png"))
        page.evaluate("__ark.sim.worldIndex=1;__ark.sim.beginRescue()")
        page.wait_for_timeout(150)
        page.screenshot(path=str(ART / "glasswake.png"))
        page.evaluate("__ark.sim.worldIndex=2;__ark.sim.beginRescue()")
        page.wait_for_timeout(150)
        page.screenshot(path=str(ART / "embermere.png"))
        page.evaluate("__ark.sim.beginFinale()")
        page.wait_for_timeout(150)
        page.screenshot(path=str(ART / "orbit.png"))
        context.close()

        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=1,
        )
        mp = mobile.new_page()

        def mobile_test():
            boot(mp, url + "?renderer=webgl")
            mp.screenshot(path=str(ART / "mobile-title.png"))
            button = mp.locator('[data-screen="title"] [data-action="launch"]')
            box = button.bounding_box()
            mp.touchscreen.tap(
                box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            )
            mp.wait_for_function('__ark.mode === "playing"')
            mp.evaluate("__ark.sim.beginRescue();__ark.sim.shuttle.y=-2.5")
            cdp = mobile.new_cdp_session(mp)
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 80, "y": 600, "id": 1}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 140, "y": 550, "id": 1}]},
            )
            mp.wait_for_timeout(100)
            jscheck(
                mp,
                '__ark.input.last === "touch" && __ark.input.sample("rescue").x > .8 && __ark.input.sample("rescue").y > .7',
            )
            jscheck(
                mp,
                '!document.getElementById("touch-action").hidden && __ark.state.shuttle.beam',
            )
            jscheck(mp, "__ark.engine.camera.right === 11")
            action = mp.locator("#touch-action").bounding_box()
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 140, "y": 550, "id": 1},
                        {
                            "x": action["x"] + action["width"] / 2,
                            "y": action["y"] + action["height"] / 2,
                            "id": 2,
                        },
                    ],
                },
            )
            mp.wait_for_timeout(100)
            jscheck(mp, "__ark.state.shuttle.dashCd > 0 && __ark.state.pulseCd === 0")
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            mp.screenshot(path=str(ART / "mobile-rescue.png"))
            require(mp.locator("#touch-action").is_visible(), "Context action missing")
            mp.touchscreen.tap(370, 30)

        test(
            "touch launch, invisible stick, assisted beam, and context action",
            mobile_test,
        )
        mobile.close()

        netcontext = browser.new_context(viewport={"width": 960, "height": 600})
        captain = netcontext.new_page()
        guest = netcontext.new_page()

        def rooms():
            boot(captain, url + "?renderer=webgl")
            boot(guest, url + "?renderer=webgl")
            captain.evaluate('__ark.toTitle();__ark.act("crew");__ark.act("host")')
            code = captain.evaluate("__ark.link.code")
            guest.evaluate(
                '(code)=>{__ark.toTitle();__ark.act("crew");document.getElementById("join-code").value=code;__ark.act("join")}',
                code,
            )
            captain.wait_for_function("__ark.link.connected")
            guest.wait_for_function("__ark.link.connected")
            captain.evaluate('__ark.act("launch-room")')
            guest.wait_for_function(
                '__ark.mode === "playing" && __ark.networkStats().remoteSeq > 0'
            )
            guest.keyboard.down("d")
            captain.wait_for_function("__ark.networkStats().remoteInputs > 0")
            guest.wait_for_timeout(300)
            guest.keyboard.up("d")
            captain.evaluate("__ark.sim.worldIndex=1;__ark.sim.beginRescue()")
            guest.wait_for_function(
                '__ark.state.phase === "rescue" && __ark.state.worldIndex === 1'
            )
            guest.evaluate("__ark.settings.assist=true")
            captain.wait_for_function(
                '[...__ark.sim.events].some(e=>e.type === "phase" && e.phase === "rescue")'
            )
            guest.wait_for_function('__ark.audio.stage === "rescue"')
            guest.keyboard.down("ArrowDown")
            guest.wait_for_timeout(120)
            guest.keyboard.up("ArrowDown")
            require(
                captain.evaluate("__ark.networkStats().sent") > 0
                and guest.evaluate("__ark.networkStats().sent") > 0,
                "Missing bidirectional traffic",
            )
            captain.evaluate('__ark.act("pause")')
            guest.wait_for_function(
                'document.getElementById("net-notice").textContent.includes("paused")'
            )
            captain.evaluate('__ark.act("resume")')
            guest.evaluate('__ark.act("pause")')
            guest.keyboard.down("d")
            guest.wait_for_timeout(200)
            captain.wait_for_function(
                "__ark.networkStats().remoteControls.every(i=>i.x===0 && i.y===0 && !i.beam)"
            )
            guest.keyboard.up("d")
            guest.evaluate('__ark.act("resume")')
            details["standaloneNetwork"] = {
                "captain": captain.evaluate("__ark.networkStats()"),
                "guest": guest.evaluate("__ark.networkStats()"),
                "webRTCOpen": captain.evaluate("!!__ark.link.conn?.open"),
            }
            captain.evaluate("__ark.sim.finish(true)")
            guest.wait_for_function('__ark.menu === "results"')
            require(
                guest.locator("#result-title").inner_text() == "All aboard!",
                "Guest did not receive expedition ending",
            )
            captain.evaluate('__ark.act("again")')
            guest.wait_for_function(
                '__ark.menu === null && __ark.state.phase === "orbit"'
            )
            captain.evaluate('__ark.act("pause")')
            guest.wait_for_function(
                'document.getElementById("net-notice").textContent.includes("paused")'
            )

        test("two-page standalone room, inputs, state, world change, and pause", rooms)

        def solo_after_remote_pause():
            guest.evaluate("__ark.toTitle();__ark.start()")
            before = guest.evaluate("__ark.sim.time")
            guest.wait_for_function("(before)=>__ark.sim.time > before", arg=before)
            require(
                guest.evaluate("__ark.link.role === null && __ark.menu === null"),
                "Solo restart retained room state",
            )
            captain.evaluate("__ark.link.close()")
            guest.evaluate("__ark.link.close()")

        test("leaving a remotely paused room can launch solo", solo_after_remote_pause)

        def broadcast_fallback():
            captain.evaluate(
                '__ark.toTitle();__ark.act("crew");__ark.act("host");__ark.link.peer.destroy()'
            )
            code = captain.evaluate("__ark.link.code")
            guest.evaluate(
                '(code)=>{__ark.toTitle();__ark.act("crew");document.getElementById("join-code").value=code;__ark.act("join");__ark.link.peer.destroy()}',
                code,
            )
            guest.wait_for_function("__ark.link.connected")
            captain.wait_for_function("__ark.link.connected")
            captain.evaluate('__ark.act("launch-room")')
            guest.wait_for_function(
                '__ark.mode === "playing" && __ark.networkStats().remoteSeq > 0'
            )
            require(
                not captain.evaluate("!!__ark.link.conn?.open"),
                "Fallback test still used WebRTC",
            )
            guest.keyboard.down("d")
            guest.wait_for_timeout(200)
            captain.wait_for_function("__ark.networkStats().remoteInputs > 0")
            guest.keyboard.up("d")
            captain.evaluate("__ark.link.close()")
            guest.evaluate("__ark.link.close()")

        test(
            "standalone BroadcastChannel fallback without signaling", broadcast_fallback
        )
        netcontext.close()

        for players, scenario, impaired in [
            (2, "standard", False),
            (4, "standard", True),
            (4, "host-leave", False),
            (2, "server", False),
        ]:
            hc = browser.new_context(viewport={"width": 1280, "height": 800})
            hp = hc.new_page()

            def hubtest(players=players, scenario=scenario, impaired=impaired, hp=hp):
                query = f"?game=../{GAME}&players={players}&scenario={scenario}&auto=1&play=1800"
                if impaired:
                    query += "&latency=150&jitter=50&loss=5"
                hp.goto(
                    origin + "/" + ROOT.name + "/harness.html" + query, timeout=60000
                )
                require(
                    hp.locator("#game").input_value().endswith(GAME),
                    "Harness is testing a different game",
                )
                hp.wait_for_function("window.__hubCheck?.done", timeout=100000)
                report = hp.evaluate("window.__hubCheck")
                details[f"hub-{players}-{scenario}-{impaired}"] = report
                require(
                    report["pass"],
                    "; ".join(
                        c["name"] + ": " + c.get("detail", "")
                        for c in report["checks"]
                        if not c["pass"]
                    ),
                )
                frames = [f for f in hp.frames if f != hp.main_frame]
                for f in frames:
                    if f.evaluate("!!window.__ark?.ready"):
                        require(
                            f.evaluate("__ark.hubEnded"), "Copy did not stop on end"
                        )
                        require(
                            f.evaluate("__ark.audio.muted"), "Copy did not mute on end"
                        )

            test(
                f"official Hub harness: {players} players / {scenario}"
                + (" / 150ms, jitter, 5% loss" if impaired else ""),
                hubtest,
            )
            hc.close()
        browser.close()
except Exception as error:  # noqa: BLE001
    error_message = str(error)
    test(
        "suite completion",
        lambda message=error_message: (_ for _ in ()).throw(RuntimeError(message)),
    )
finally:
    server.shutdown()
    server.server_close()
    report = {
        "checks": results,
        "details": details,
        "passed": sum(r["pass"] for r in results),
        "failed": sum(not r["pass"] for r in results),
    }
    (ART / "test-results.json").write_text(json.dumps(report, indent=2))
    print(
        f"{report['passed']}/{len(results)} checks passed; {report['failed']} failures.",
        flush=True,
    )
    if report["failed"]:
        raise SystemExit(1)
