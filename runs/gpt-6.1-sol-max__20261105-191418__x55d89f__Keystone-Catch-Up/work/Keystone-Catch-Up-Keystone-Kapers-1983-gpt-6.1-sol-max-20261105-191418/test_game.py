"""One-command gameplay, input, audio, rendering and AI Hub regression checks."""

import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
NAME = json.loads((BASE / "title-selection.json").read_text())["base"]
ART = BASE / "test-artifacts"
ART.mkdir(exist_ok=True)
results = []


def check(name, fn):
    try:
        detail = fn()
        if detail is False:
            raise AssertionError("returned false")
        results.append({"name": name, "pass": True, "detail": detail})
    except Exception as error:  # noqa: BLE001 - report independent test failures
        results.append({"name": name, "pass": False, "detail": str(error)})
        print(f"FAIL {name}: {error}", flush=True)
    (ART / "test-results.json").write_text(json.dumps(results, indent=2))


def require(value, message):
    if not value:
        raise AssertionError(message)
    return True


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f"http://127.0.0.1:{server.server_port}"


def boot(page, url):
    page.goto(url, wait_until="load", timeout=60000)
    page.wait_for_function("window.__game?.ready || window.__bootError", timeout=90000)
    require(
        page.evaluate("!window.__bootError"), page.evaluate('window.__bootError || ""')
    )
    page.evaluate("__game.external(true)")


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--disable-dev-shm-usage",
            "--disable-gpu-watchdog",
        ],
    )
    page = browser.new_page(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    check(
        "self-contained file URL boots with WebGPU",
        lambda: (
            (
                boot(page, (ROOT / (NAME + ".html")).as_uri()),
                require(
                    page.evaluate('__game.state.initialRenderer === "WebGPU"'),
                    "WebGPU did not initialize",
                ),
                page.wait_for_function(
                    "!__game.state.recovering && !__game.state.gpuLost", timeout=15000
                ),
            )
            and True
        ),
    )

    def ev(code):
        return page.evaluate(code)

    def clean():
        ev(
            """()=>{__game.start();__game.clearHazards();__game.setConfig({hazardRate:999,crookSpeed:0});__game.setCheats({freezeCrook:true});__game.advance(.5); }"""
        )

    check(
        "music defaults to ten percent",
        lambda: require(
            ev("__game.state.audio.music === .1"), "wrong default music gain"
        ),
    )
    check(
        "title is controller-sized and contains expected menus",
        lambda: require(
            page.locator("#main-menu button").count() == 5, "missing title action"
        ),
    )

    def keyboard_start():
        page.keyboard.press("Enter")
        return require(
            ev('__game.state.phase === "playing"'), "Enter did not start the shift"
        )

    check("keyboard starts the shift", keyboard_start)

    def movement():
        clean()
        x0 = ev("__game.state.players[0].x")
        s = ev('__game.advance(.5,"idle",{0:{x:1}})')
        require(s["players"][0]["x"] > x0 + 3, "officer did not move right")
        s = ev("__game.advance(.4)")
        return require(
            abs(s["players"][0]["y"]) < 0.1,
            "Rapier did not support the officer on the floor",
        )

    check("Rapier movement and stable floor contact", movement)

    def jumping():
        clean()
        s = ev('__game.advance(.35,"idle",{0:{jump:true}})')
        require(s["players"][0]["y"] > 1.5, "jump too low")
        s = ev("__game.advance(.8)")
        require(abs(s["players"][0]["y"]) < 0.1, "officer did not land")
        return require(s["stats"]["jumps"] == 1, "held jump repeatedly jumped")

    check("jump arc, landing and edge-triggered jump", jumping)

    def dash():
        clean()
        ev("__game.teleport(0,0,-15)")
        normal = ev('__game.advance(.25,"idle",{0:{x:1}}).players[0].x') + 15
        ev("__game.teleport(0,0,-15)")
        fast = ev('__game.advance(.25,"idle",{0:{x:1,dash:true}})')
        require(
            fast["players"][0]["x"] + 15 > normal * 1.4,
            "dash did not accelerate the officer",
        )
        return require(fast["stats"]["dashes"] == 1, "dash count wrong")

    check("dash provides a real, cooldown-limited burst", dash)

    def hazard_trial(kind, duck=False, jump=False):
        clean()
        ev("__game.teleport(0,0,-5);__game.advance(.4)")
        ev(f"__game.spawnHazard({json.dumps(kind)},0,-2.7,-1)")
        if kind == "cart" and jump:
            ev("__game.advance(.2)")
        return ev(
            '__game.advance(.65,"idle",{0:{duck:'
            + str(duck).lower()
            + ",jump:"
            + str(jump).lower()
            + "}})"
        )

    check(
        "toy plane hits a standing officer",
        lambda: require(
            hazard_trial("plane")["stats"]["hits"] == 1,
            "standing plane collision was missed",
        ),
    )
    check(
        "ducking physically clears a toy plane",
        lambda: require(
            hazard_trial("plane", duck=True)["stats"]["hits"] == 0,
            "duck did not clear plane",
        ),
    )
    check(
        "jumping physically clears rolling balls",
        lambda: require(
            hazard_trial("ball", jump=True)["stats"]["hits"] == 0,
            "jump did not clear ball",
        ),
    )
    check(
        "jumping physically clears shopping carts",
        lambda: require(
            hazard_trial("cart", jump=True)["stats"]["hits"] == 0,
            "jump did not clear cart",
        ),
    )
    check(
        "cart contact damages the officer",
        lambda: require(
            hazard_trial("cart")["stats"]["hits"] == 1, "cart contact missed"
        ),
    )

    def immunity():
        s = hazard_trial("ball")
        require(s["stats"]["hits"] == 1, "first ball did not hit")
        ev('__game.spawnHazard("ball",0,-5,1)')
        s = ev("__game.advance(.2)")
        return require(
            s["stats"]["hits"] == 1 and s["players"][0]["hp"] == 3,
            "damage repeated during immunity",
        )

    check("contact damage grants temporary immunity", immunity)

    def coffee_and_loot():
        clean()
        ev("__game.setTime(100);__game.teleport(0,0,4)")
        s = ev("__game.advance(.1)")
        require(
            s["time"] > 104 and "coffee" in s["seen"], "coffee did not restore time"
        )
        ev("__game.teleport(0,0,-8)")
        s = ev("__game.advance(.1)")
        return require(
            s["score"] == 100 and s["stats"]["pickups"] == 1, "loot was not recovered"
        )

    check("coffee and recovered loot affect the clock and score", coffee_and_loot)

    def lift():
        clean()
        ev("__game.teleport(0,0,0);__game.advance(.1)")
        s = ev('__game.advance(1.8,"idle",{0:{act:true}})')
        require(
            s["players"][0]["floor"] == 1 and abs(s["players"][0]["y"] - 5.4) < 0.1,
            "up lift failed",
        )
        ev("__game.advance(.1)")
        s = ev('__game.advance(1.8,"idle",{0:{act:true,down:true,duck:true}})')
        return require(
            s["players"][0]["floor"] == 0 and "lift" in s["seen"], "down lift failed"
        )

    check("express lift carries an officer up and down", lift)

    def escalator():
        clean()
        ev("__game.teleport(0,0,14);__game.advance(.1)")
        s = ev('__game.advance(2.2,"idle",{0:{act:true}})')
        require(
            s["players"][0]["floor"] == 1 and abs(s["players"][0]["x"] - 21) < 0.2,
            "up escalator failed",
        )
        ev("__game.advance(.1)")
        s = ev('__game.advance(2.2,"idle",{0:{act:true}})')
        return require(
            s["players"][0]["floor"] == 0 and abs(s["players"][0]["x"] - 14) < 0.2,
            "down escalator failed",
        )

    check("escalators support both directions and physical landing", escalator)

    def full_playthrough():
        ev(
            "__game.setConfig({runSpeed:7.8,crookSpeed:3.6,jumpPower:9.7,hazardRate:4.5,clockSeconds:180,damageSeconds:6});__game.start()"
        )
        trace = ev(
            """()=>{const trace=[];for(let i=0;i<150;i++){const s=__game.advance(1,'bot');trace.push({second:i+1,phase:s.phase,wave:s.wave,stats:s.stats,floor:s.players[0].floor,seen:s.seen});if(s.phase==='win'||s.phase==='lose')break;}return trace;}"""
        )
        (ART / "full-playthrough.json").write_text(json.dumps(trace, indent=2))
        last = trace[-1]
        require(
            last["phase"] == "win" and last["stats"]["captures"] == 3,
            f"bot did not finish: {last}",
        )
        require(last["stats"]["rides"] >= 2, "bot skipped floor navigation")
        return {"seconds": len(trace), "stats": last["stats"], "seen": last["seen"]}

    check(
        "complete three-case playthrough through normal movement and cuffing",
        full_playthrough,
    )

    def failure_and_restart():
        clean()
        ev("__game.setTime(.05)")
        s = ev("__game.advance(.2)")
        require(
            s["phase"] == "lose" and s["menu"] == "result",
            "closing time did not end the shift",
        )
        page.locator('[data-action="restart"]').click()
        s = ev("__game.state")
        return require(
            s["phase"] == "playing" and s["wave"] == 0 and s["score"] == 0,
            "restart retained the old shift",
        )

    check("time-up, results and complete restart", failure_and_restart)

    def pause_dev():
        ev("__game.pause()")
        t0 = ev("__game.state.time")
        ev("__game.advance(1)")
        require(ev("__game.state.time") == t0, "paused clock advanced")
        page.locator('[data-action="dev"]').click()
        page.locator("#dev-runSpeed").fill("11")
        page.locator("#dev-runSpeed").dispatch_event("input")
        require(
            ev("__game.state.config.runSpeed") == 11, "live slider did not change speed"
        )
        page.locator('[data-action="god"]').click()
        require(
            ev("__game.state.cheats.invulnerable"), "invulnerability tool did not work"
        )
        page.locator('[data-action="defaults"]').click()
        s = ev("__game.state")
        require(
            s["config"]["runSpeed"] == 7.8 and not s["cheats"]["invulnerable"],
            "reset defaults failed",
        )
        page.locator('[data-action="resume"]').click()
        return require(not ev("__game.state.paused"), "resume left the clock paused")

    check("pause menu, live balance sliders, cheats and reset", pause_dev)

    def native_animation():
        before = ev("__game.state.animationTime")
        page.wait_for_timeout(450)
        return require(
            ev("__game.state.animationTime") > before, "AnimationMixer did not advance"
        )

    check("native Three.js animation mixer advances", native_animation)

    def audio_signal():
        page.keyboard.press("Space")
        rendered = ev("__game.audioProbe()")
        ev("__game.pause()")
        page.locator('#modal [data-action="settings"]').click()
        page.locator("#vol-sfx").fill("20")
        page.locator("#vol-sfx").dispatch_event("input")
        page.wait_for_function(
            "Math.abs(__game.state.audio.sfxGain - .2) < .015", timeout=5000
        )
        page.locator("#vol-sfx").fill("65")
        page.locator("#vol-sfx").dispatch_event("input")
        page.locator('#modal [data-action="back"]').click()
        page.locator('#modal [data-action="resume"]').click()
        s = ev("__game.state.audio")
        require(
            s["state"] == "running" and s["notes"] > 0,
            f"realtime context did not start: {s}",
        )
        return require(
            rendered["finite"]
            and rendered["frames"] == 22050
            and rendered["rms"] > 0.001,
            f"no synthesized audio signal: {rendered}",
        )

    check(
        "Web Audio renders nonzero music, effects and gibberish samples", audio_signal
    )

    def gamepad_input():
        ev(
            """()=>{window.__pad={id:'Emulated DualSense',mapping:'standard',connected:true,index:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0,touched:false})),timestamp:0};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});__game.title();}"""
        )
        page.wait_for_timeout(150)
        ev("__pad.buttons[0].pressed=true")
        page.wait_for_function('__game.state.phase === "playing"', timeout=15000)
        ev("__pad.buttons[0].pressed=false;__pad.axes[0]=.8")
        page.wait_for_timeout(200)
        x0 = ev("__game.state.players[0].x")
        s = ev('__game.advance(.5,"live")')
        require(
            s["players"][0]["x"] > x0 + 2, "standard gamepad axis did not move player"
        )
        ev("__pad.axes[0]=0;__pad.buttons[0].pressed=true")
        page.wait_for_timeout(100)
        s = ev('__game.advance(.3,"live")')
        require(s["players"][0]["y"] > 1, "Cross did not jump")
        ev("__pad.buttons[0].pressed=false")
        ev("__game.pause()")
        page.locator('#modal [data-action="settings"]').click()
        page.locator('[data-action="xbox"]').click()
        page.locator('[data-action="back"]').click()
        page.locator('[data-action="resume"]').click()
        ev("__pad.axes[0]=.45")
        page.wait_for_function(
            'document.querySelector("#play-prompts").textContent.includes("A JUMP")',
            timeout=15000,
        )
        ev("__game.render()")
        require(
            "A JUMP" in page.locator("#play-prompts").inner_text(),
            "Xbox glyph preference was ignored",
        )
        ev("__pad.axes[0]=0")
        return True

    check("standard gamepad menu, movement, Cross and Xbox glyphs", gamepad_input)

    def local_coop():
        ev("__game.start(true);__game.clearHazards()")
        x0 = ev("__game.state.players[1].x")
        page.keyboard.down("KeyL")
        s = ev('__game.advance(.4,"live")')
        page.keyboard.up("KeyL")
        return require(
            len(s["players"]) == 2 and s["players"][1]["x"] > x0 + 2,
            "local partner did not move independently",
        )

    check("local co-op independently controls the second officer", local_coop)

    def attract_mode():
        ev("__game.title();__game.external(false);__game.idleFor(10.1)")
        page.wait_for_function("__game.state.attract", timeout=15000)
        ev("__game.external(true)")
        s = ev('__game.advance(8,"bot")')
        require(
            s["stats"]["rides"] > 0 and s["stats"]["dashes"] > 0,
            "attract officer did not demonstrate gameplay",
        )
        page.keyboard.press("KeyZ")
        require(
            ev('__game.state.phase === "title" && !__game.state.attract'),
            "key input did not exit attract mode",
        )
        ev("__game.attract()")
        page.mouse.move(800, 400)
        page.wait_for_function(
            '__game.state.phase === "title" && !__game.state.attract', timeout=10000
        )
        return require(
            ev('__game.state.phase === "title" && !__game.state.attract'),
            "input did not exit attract mode",
        )

    check("ten-second attract demo plays and any input exits", attract_mode)

    def credits_and_interview():
        data = json.loads((ROOT / "exit-interview.json").read_text())
        require(
            set(data)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
            "exit interview shape differs from required schema",
        )
        require(
            data == ev("__game.credits"),
            "in-game metadata differs from exit-interview.json",
        )
        require(
            len(data["testingFeedback"]) == 4
            and len(data["engineFeedback"]) == 6
            and len(data["promptFeedback"]) == 4,
            "missing interview answers",
        )
        page.locator('#main-menu [data-action="about"]').click()
        for index, title in enumerate(
            [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]
        ):
            page.locator(f'[data-action="credits{index}"]').click()
            require(
                title in page.locator("#modal h3").inner_text(),
                "credits page missing: " + title,
            )
        page.locator('#modal [data-action="back"]').click()
        return True

    check(
        "exit interview JSON matches all four in-game credits pages",
        credits_and_interview,
    )
    check(
        "no uncaught game runtime errors",
        lambda: require(not errors, "; ".join(errors)),
    )
    (ART / "webgpu-state.json").write_text(json.dumps(ev("__game.state"), indent=2))
    check(
        "WebGPU device remains healthy",
        lambda: require(
            not ev("__game.state.gpuLost"), "WebGPU device was lost during gameplay"
        ),
    )
    page.close()

    # Visual inspection uses the same renderer's WebGL compatibility backend because
    # headless WebGPU screenshots may omit the composited canvas on this workstation.
    visual = browser.new_page(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )

    def visual_check():
        boot(visual, origin + "/" + NAME + ".html?renderer=webgl")
        visual.evaluate("__game.render()")
        visual.screenshot(path=str(ART / "title-1920.png"))
        visual.evaluate('__game.start();__game.advance(3,"bot");__game.render()')
        visual.wait_for_timeout(100)
        visual.screenshot(path=str(ART / "gameplay-1920.png"))
        visual.evaluate("__game.pause()")
        visual.locator('[data-action="dev"]').click()
        visual.screenshot(path=str(ART / "dev-tools-1920.png"))
        return True

    check("TV-size title, gameplay and dev-tool screenshots", visual_check)
    visual.close()

    mobile_ctx = browser.new_context(**pw.devices["Pixel 7"])
    mobile = mobile_ctx.new_page()

    def touch_check():
        boot(mobile, origin + "/" + NAME + ".html?renderer=webgl")
        mobile.locator('[data-action="solo"]').tap()
        require(
            mobile.evaluate('document.body.classList.contains("touch-game")'),
            "touch mode was not enabled",
        )
        mobile.evaluate(
            "__game.clearHazards();__game.teleport(0,0,-15);__game.advance(.5);__game.render()"
        )
        require(
            not mobile.locator(".case-panel").is_visible()
            and not mobile.locator(".score-panel").is_visible(),
            "touch HUD is too dense",
        )
        clock_box = mobile.locator("#clock").bounding_box()
        menu_box = mobile.locator("#touch-menu").bounding_box()
        require(
            clock_box["x"] + clock_box["width"] < menu_box["x"],
            "touch timer overlaps menu",
        )
        x0 = mobile.evaluate("__game.state.players[0].x")
        mobile.dispatch_event(
            "#game",
            "pointerdown",
            {"pointerType": "touch", "pointerId": 11, "clientX": 60, "clientY": 650},
        )
        mobile.dispatch_event(
            "#game",
            "pointermove",
            {"pointerType": "touch", "pointerId": 11, "clientX": 125, "clientY": 650},
        )
        s = mobile.evaluate('__game.advance(.4,"live")')
        require(
            s["players"][0]["x"] > x0 + 2, "invisible thumb stick did not move officer"
        )
        mobile.touchscreen.tap(340, 650)
        s = mobile.evaluate('__game.advance(.3,"live")')
        require(s["players"][0]["y"] > 1, "right-thumb tap did not jump")
        mobile.evaluate('__game.advance(.8,"live")')
        mobile.touchscreen.tap(340, 650)
        s = mobile.evaluate('__game.advance(.3,"live")')
        require(
            s["players"][0]["y"] > 1 and s["stats"]["jumps"] >= 2,
            "repeated jump failed while movement touch stayed held",
        )
        mobile.dispatch_event(
            "#game", "pointerup", {"pointerType": "touch", "pointerId": 11}
        )
        mobile.evaluate("__game.teleport(0,0,0);__game.advance(.3);__game.render()")
        require(
            mobile.locator("#touch-action").is_visible(),
            "contextual ride action missing",
        )
        mobile.evaluate("__game.render()")
        mobile.screenshot(path=str(ART / "touch-portrait.png"))
        return True

    check("touch thumb stick, jump and contextual ride action", touch_check)
    mobile_ctx.close()

    for n, scenario, impairment in [
        (2, "standard", False),
        (4, "standard", True),
        (4, "host-leave", True),
        (2, "server", False),
    ]:
        hp = browser.new_page(viewport={"width": 1280, "height": 800})

        def harness_run(n=n, scenario=scenario, impairment=impairment, hp=hp):
            query = {
                "game": "/" + NAME + ".html",
                "players": n,
                "scenario": scenario,
                "auto": 1,
                "play": 16000 if n == 2 and scenario == "standard" else 4000,
            }
            if impairment:
                query.update(latency=150, jitter=50, loss=5)
            hp.goto(
                origin + "/" + BASE.name + "/harness.html?" + urlencode(query),
                timeout=60000,
            )
            guest_taps = None
            if n == 2 and scenario == "standard":
                hp.wait_for_function(
                    """()=>{
                    const copies=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow).filter(w=>w?.__game);
                    return copies.length===2&&copies.every(w=>w.__game.state.hub.started&&w.AIHub.time()>100&&w.__game.state.gameTime>.05);
                }""",
                    timeout=40000,
                )
                guest_taps = hp.evaluate("""async()=>{
                    const copies=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow).filter(w=>w?.__game);
                    const h=copies.find(w=>w.AIHub.isHost),g=copies.find(w=>!w.AIHub.isHost);
                    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
                    h.__game.external(true);g.__game.external(true);
                    h.__game.setCheats({noHazards:true,freezeCrook:true});h.__game.teleport(1,0,-6);
                    const before=h.__game.state.stats.jumps;
                    const tap=()=>{
                        g.document.body.dispatchEvent(new g.KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));
                        g.document.body.dispatchEvent(new g.KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true,cancelable:true}));
                        g.__game.flushNetwork();
                    };
                    const consume=async target=>{
                        for(let i=0;i<80;i++){
                            await sleep(20);h.__game.advance(1/60,'live');
                            if(h.__game.state.stats.jumps>=target)return;
                        }
                        throw new Error('Guest jump was not consumed: '+JSON.stringify({target,host:h.__game.state,guest:g.__game.state}));
                    };
                    try{
                        tap();await consume(before+1);
                        await sleep(120);g.__game.flushNetwork();await sleep(80);h.__game.advance(1.1,'live');
                        tap();await consume(before+2);
                        return {before,after:h.__game.state.stats.jumps,passed:true};
                    }finally{
                        h.__game.external(false);g.__game.external(false);h.__game.setCheats({noHazards:false,freezeCrook:false});
                    }
                }""")

            hp.wait_for_function(
                'document.body.dataset.complete === "true"', timeout=100000
            )
            result = hp.evaluate("window.__hubCheck")
            if guest_taps:
                result["guestRapidJumpRegression"] = guest_taps
            (ART / f"hub-{n}-{scenario}.json").write_text(json.dumps(result, indent=2))
            failed = [c for c in result["checks"] if not c["pass"]]
            return require(result["pass"], json.dumps(failed))

        check(
            f"AI Hub {n} players, {scenario}"
            + (" with latency/jitter/loss" if impairment else ""),
            harness_run,
        )
        hp.close()

    browser.close()

server.shutdown()
passed = sum(item["pass"] for item in results)
print(
    f"{passed}/{len(results)} checks passed; {len(results) - passed} failures.",
    flush=True,
)
raise SystemExit(0 if passed == len(results) else 1)
