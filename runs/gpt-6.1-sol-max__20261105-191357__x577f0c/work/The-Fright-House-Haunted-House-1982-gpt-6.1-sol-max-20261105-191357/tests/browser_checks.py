import json
from urllib.parse import urlencode


def exercise(page, context, browser, origin, check, artifacts, logs):
    def state():
        return page.evaluate("__fright.getState()")

    def app(js):
        return page.evaluate(js)

    app("__fright.manual(true);__fright.app.view.pauseDrawing=true")
    t = state()["animations"]["player"]
    page.wait_for_function(
        "(t)=>__fright.getState().animations.player>t", arg=t, timeout=10000
    )
    check("native AnimationMixer advances", state()["animations"]["player"] > t)
    check(
        "WebGPU submits scene geometry without validation errors",
        app(
            "__fright.app.view.renderer.info.render.calls>0 && !__fright.app.view.renderer._isDeviceLost && __fright.app.view.gpuErrors.length===0"
        ),
    )
    page.keyboard.press("Escape")
    check("keyboard pause", state()["screen"] == "pause")
    page.get_by_role("button", name="Developer tools", exact=False).click()
    check("developer mode reachable from pause", state()["screen"] == "dev")
    page.locator("#tune-speed").evaluate(
        "el => { el.value=7; el.dispatchEvent(new Event('input',{bubbles:true})); }"
    )
    check("developer slider changes live state", state()["tuning"]["speed"] == 7)
    page.get_by_role("button", name="Infinite nerve:", exact=False).click()
    check("developer invincibility toggle works", state()["cheats"]["invincible"])
    page.get_by_role("button", name="Reset tuning", exact=False).click()
    check(
        "developer reset restores defaults",
        state()["tuning"]["speed"] == 4 and not any(state()["cheats"].values()),
    )
    page.get_by_role("button", name="Resume", exact=False).click()
    app("__fright.manual(false)")
    page.keyboard.press("Space")
    page.wait_for_function("__fright.getState().matches>0", timeout=5000)
    check("Space strikes a match", state()["match"] > 0 and state()["matches"] == 1)
    page.keyboard.press("Tab")
    check("Tab opens the remembered-room map", state()["screen"] == "map")
    page.get_by_role("button", name="Upper floor", exact=False).click()
    check(
        "map can inspect another floor",
        page.locator(".map-floor").text_content().startswith("Floor 2"),
    )
    page.screenshot(path=str(artifacts / "map.png"))
    page.get_by_role("button", name="Close map", exact=False).click()
    app(
        "window.__pad={id:'Simulated DualSense',index:0,mapping:'standard',connected:true,timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad]"
    )

    def pad_button(i, held=None):
        app(
            f"__pad.buttons[{i}]={{pressed:true,value:1}};"
            + (
                f"__pad.buttons[{held}]={{pressed:true,value:1}};"
                if held is not None
                else ""
            )
            + "__fright.app.pollPad(performance.now())"
        )
        app(
            "__pad.buttons.forEach(b=>{b.pressed=false;b.value=0});__fright.app.pollPad(performance.now()+200)"
        )

    app("__pad.axes[0]=.8;__pad.axes[1]=-.3")
    before = state()
    page.wait_for_function(
        "Math.abs(__fright.getState().x)+Math.abs(__fright.getState().z-2.6)>.3",
        timeout=5000,
    )
    app("__pad.axes[0]=0;__pad.axes[1]=0")
    after = state()
    check(
        "standard gamepad moves the explorer",
        abs(after["x"] - before["x"]) + abs(after["z"] - before["z"]) > 0.3,
    )
    check(
        "last input switches to PlayStation prompts",
        after["inputType"] == "pad"
        and "□" in page.locator("#match-prompt").inner_text(),
    )
    pad_button(9, 8)
    check("Create plus Options is reserved for the hub", state()["screen"] is None)
    pad_button(9)
    check("Options pauses", state()["screen"] == "pause")
    page.get_by_role("button", name="Settings", exact=False).click()
    page.get_by_role("button", name="PlayStation", exact=False).click()
    app("__fright.app.setInput('pad');__fright.app.ui.hud()")
    check(
        "Xbox glyph option changes prompts",
        state()["settings"]["glyphs"] == "xbox"
        and "X" in page.locator("#match-prompt").inner_text(),
    )
    page.locator("#set-music").evaluate(
        "el => { el.value=.17; el.dispatchEvent(new Event('input',{bubbles:true})); }"
    )
    check(
        "music volume slider updates the audio bus",
        abs(app("__fright.audio.music.gain.value") - 0.17) < 0.001,
    )
    page.get_by_role("button", name="Back", exact=False).click()
    page.get_by_role("button", name="Back to the house", exact=False).click()
    page.keyboard.press("Space")
    check(
        "keyboard restores key prompts",
        state()["inputType"] == "keyboard"
        and "Space" in page.locator("#match-prompt").inner_text(),
    )
    probe_audio = app("__fright.audio.probe()")
    check(
        "procedural audio produces a non-clipping signal",
        0.005 < probe_audio["rms"] < 0.4 and 0.02 < probe_audio["peak"] < 1,
        probe_audio,
    )
    app("__fright.audio.sfx('join');__fright.audio.voice('happy')")
    page.wait_for_timeout(120)
    check(
        "live sound and gibberish voices reach the analyser",
        app("__fright.audio.levels()") > 0.0001
        and app("__fright.audio.voiceEvents") > 0,
    )
    app(
        "__fright.manual(true);__fright.app.toTitle();__fright.app.lastActivity=performance.now()-9000"
    )
    page.wait_for_timeout(200)
    check("attract does not begin before ten idle seconds", state()["mode"] == "title")
    app("__fright.manual(false);__fright.app.lastActivity=performance.now()-10010")
    page.wait_for_function('__fright.getState().mode === "attract"', timeout=5000)
    check("attract begins after ten idle seconds", state()["mode"] == "attract")
    app(
        "__fright.manual(true);for(let i=0;i<1500;i++){let input=__fright.app.pilot(1/60);__fright.model.step(1/60,input)}"
    )
    check(
        "attract AI explores and demonstrates inventory",
        len(state()["visited"]) >= 3 and state()["matches"] >= 3,
    )
    tour = app(
        """(()=>{const a=__fright.app,m=__fright.model;let escaped=false,reset=false;a.audio.setPlaying(false);for(let i=0;i<7200;i++){const previous=a.tourElapsed;const input=a.pilot(1/60);m.step(1/60,input);if(m.result==='win')escaped=true;if(previous>100&&a.tourElapsed<1){reset=true;break;}if(a.view.roomId!==m.room)a.view.sync(m,1/60);}a.view.sync(m,1/60);a.audio.setPlaying(true);return{escaped,reset,actors:a.view.enemyModels.length===m.enemies.length};})()"""
    )
    check(
        "attract completes an escape and loops into a clean mansion",
        tour["escaped"] and tour["reset"] and tour["actors"],
        tour,
    )
    page.keyboard.press("x")
    check(
        "any input exits attract without starting a game",
        state()["mode"] == "title" and state()["screen"] == "title",
    )
    app("__fright.app.lastActivity=performance.now()+1000000")
    app("__fright.app.setInput('pad')")
    page.get_by_role("button", name="About & credits", exact=False).click()
    check(
        "switching from controller to mouse preserves the first menu click",
        state()["screen"] == "about",
    )
    headings = []
    about_text = []
    for i in range(6):
        headings.append(page.locator(".panel h2").inner_text())
        about_text.append(page.locator(".about-content").inner_text())
        if i < 5:
            page.get_by_role("button", name="Next", exact=False).click()
    check(
        "all four required credits categories are in-game",
        all(
            any(h.startswith(name) for h in headings)
            for name in [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]
        ),
    )
    check(
        "usage is explicitly added on import",
        "added on import" in "\n".join(about_text),
    )
    page.get_by_role("button", name="Back", exact=False).click()
    page.get_by_role("button", name="Enter the house", exact=False).click()
    app("__fright.manual(true)")
    room_errors = []
    for room in range(24):
        app(
            f"__fright.model.enter({room});__fright.app.view.pauseDrawing=false;__fright.app.view.sync(__fright.model,1/60);__fright.app.view.pauseDrawing=true"
        )
        page.wait_for_function(f"__fright.app.view.roomId === {room}", timeout=15000)
        ok = app(
            "__fright.app.view.enemyModels.length === __fright.model.enemies.length && !__fright.app.view.renderer._isDeviceLost && __fright.app.view.gpuErrors.length===0"
        )
        if not ok:
            room_errors.append(room)
    check(
        "all twenty-four dioramas render with their creatures",
        not room_errors,
        room_errors,
    )
    app(
        "__fright.model.enter(14);__fright.model.strike();__fright.app.view.titleBlend=0;__fright.app.view.pauseDrawing=false;__fright.app.view.sync(__fright.model,1/60);__fright.app.view.pauseDrawing=true;__fright.app.ui.hud()"
    )
    page.screenshot(path=str(artifacts / "nursery.png"))
    app("__fright.app.startGame();__fright.manual(false)")
    position = app("__fright.app.view.project(1.5,1.8,0)")
    before = state()
    page.mouse.click(position["x"], position["y"])
    page.wait_for_function(
        "Math.abs(__fright.getState().x)+Math.abs(__fright.getState().z-2.6)>.3",
        timeout=5000,
    )
    check(
        "mouse click walks to the world position",
        abs(state()["x"] - before["x"]) + abs(state()["z"] - before["z"]) > 0.3,
    )
    page.mouse.click(position["x"], position["y"], button="right")
    page.wait_for_function("__fright.getState().matches>0", timeout=5000)
    check("right mouse button strikes a match", state()["matches"] > 0)
    check(
        "mouse prompts name the active mouse button",
        "RMB" in page.locator("#match-prompt").inner_text(),
    )
    check(
        "no WebGPU validation errors or lost device",
        app(
            "__fright.app.view.gpuErrors.length===0 && !__fright.app.view.renderer._isDeviceLost"
        ),
    )
    context.close()

    # A touch profile uses the same screens and world, with assisted matches.
    touch_context = browser.new_context(
        viewport={"width": 844, "height": 390},
        has_touch=True,
        is_mobile=True,
        device_scale_factor=1,
    )
    touch_page = touch_context.new_page()
    touch_page.goto(origin + "/game.html?test=1&localonly=1")
    touch_page.wait_for_function("window.__fright?.getState().ready", timeout=90000)
    touch_page.evaluate("__fright.app.view.pauseDrawing=true")
    touch_page.get_by_role("button", name="Enter the house", exact=False).tap()
    cdp = touch_context.new_cdp_session(touch_page)
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchStart", "touchPoints": [{"x": 150, "y": 260, "id": 1}]},
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchMove", "touchPoints": [{"x": 205, "y": 230, "id": 1}]},
    )
    touch_page.wait_for_function(
        "Math.abs(__fright.getState().x)>.1 && __fright.getState().matches>0",
        timeout=5000,
    )
    touch_state = touch_page.evaluate("__fright.getState()")
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    check(
        "touch drag moves with assisted matchlight",
        touch_state["inputType"] == "touch"
        and touch_state["matches"] > 0
        and abs(touch_state["x"]) > 0.1,
    )
    check(
        "touch keeps controls minimal",
        touch_page.locator("#hud-help").is_hidden()
        and touch_page.locator(".match-card").is_hidden()
        and touch_page.locator(".hand-card").is_hidden()
        and touch_page.locator("#objective").is_hidden(),
    )
    touch_page.evaluate(
        "__fright.app.view.titleBlend=0;__fright.app.view.pauseDrawing=false;__fright.app.view.sync(__fright.model,1/60);__fright.app.view.pauseDrawing=true"
    )
    touch_page.screenshot(path=str(artifacts / "touch.png"))
    touch_page.locator("#pause-button").tap()
    check(
        "touch menu button opens the shared pause screen",
        touch_page.evaluate("__fright.getState().screen") == "pause",
    )
    touch_context.close()


def multiplayer(browser, origin, check, artifacts):
    context = browser.new_context(viewport={"width": 960, "height": 640})
    host = context.new_page()
    guest = context.new_page()
    for page in [host, guest]:
        page.goto(origin + "/game.html?test=1&localonly=1")
        page.wait_for_function("window.__fright?.getState().ready", timeout=90000)
        page.evaluate("__fright.app.view.pauseDrawing=true")
    code = host.evaluate("__fright.app.net.hostRoom()")
    guest.evaluate("(code)=>__fright.app.net.joinRoom(code)", code)
    guest.wait_for_function(
        "__fright.getState().network.roster.length === 2", timeout=10000
    )
    host.wait_for_function(
        "__fright.getState().network.roster.length === 2", timeout=10000
    )
    check(
        "standalone room code pairs two pages",
        host.evaluate("__fright.getState().network.me") == 0
        and guest.evaluate("__fright.getState().network.me") == 1,
    )
    host.evaluate("__fright.app.net.start()")
    host.wait_for_function('__fright.getState().mode === "play"', timeout=10000)
    guest.wait_for_function('__fright.getState().mode === "play"', timeout=10000)
    check(
        "standalone race starts both players",
        guest.evaluate("__fright.getState().time") < 2,
    )
    host.wait_for_function(
        "__fright.getState().network.remotes.length > 0", timeout=5000
    )
    guest.wait_for_function(
        "__fright.getState().network.remotes.length > 0", timeout=5000
    )
    check("standalone ghosts send and receive positions", True)
    check(
        "remote explorer has a rendered native animation",
        host.evaluate("__fright.app.view.remote.size") == 1,
    )
    host.evaluate(
        "__fright.model.enter(0);__fright.model.carried={id:'test-urn',type:'urn',parts:7};__fright.model.win()"
    )
    guest.wait_for_function("__fright.app.net.results.has(0)", timeout=5000)
    check(
        "standalone race propagates completed results",
        guest.evaluate("__fright.app.net.results.get(0).time") is not None,
    )
    check(
        "standalone race records elapsed wall-clock time",
        abs(
            host.evaluate(
                "Date.now()-__fright.app.net.startAt-__fright.app.net.results.get(0).time"
            )
        )
        < 1000,
    )
    host.evaluate("__fright.app.net.close()")
    guest.wait_for_function(
        "__fright.getState().network.roster.length === 1", timeout=5000
    )
    check(
        "standalone departure removes the departed ghost",
        guest.evaluate("__fright.getState().network.remotes.length") == 0,
    )
    context.close()

    # Official hub checks, including adverse networking and a departing host.
    for label, players, scenario, adverse in [
        ("standard", 2, "standard", False),
        ("adverse", 4, "standard", True),
        ("host-leave", 4, "host-leave", True),
    ]:
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        context.add_init_script(
            "Object.defineProperty(window,'__fright',{configurable:true,get(){return window.__gameValue},set(v){window.__gameValue=v;queueMicrotask(()=>{if(v.app)v.app.view.pauseDrawing=true})}})"
        )
        page = context.new_page()
        query = {
            "game": "../game.html?test=1",
            "players": players,
            "scenario": scenario,
            "auto": 1,
        }
        if adverse:
            query.update(latency=150, jitter=50, loss=5)
        page.goto(origin + "/hub/harness.html?" + urlencode(query))
        page.wait_for_function("window.__hubCheck?.done === true", timeout=120000)
        report = page.evaluate("window.__hubCheck")
        (artifacts / f"hub-{label}.json").write_text(json.dumps(report, indent=2))
        for c in report["checks"]:
            check(f"AI Hub {label}: {c['name']}", c["pass"], c.get("detail", ""))
        context.close()


def internet_race(browser, origin, check, artifacts):
    """Use actual WebRTC data channels; BroadcastChannel is disabled in both pages."""
    context = browser.new_context(viewport={"width": 960, "height": 640})
    context.add_init_script("window.BroadcastChannel=undefined")
    host = context.new_page()
    guest = context.new_page()
    try:
        for page in [host, guest]:
            page.goto(origin + "/game.html?test=1")
            page.wait_for_function("window.__fright?.getState().ready", timeout=90000)
            page.evaluate("__fright.app.view.pauseDrawing=true")
        code = host.evaluate("__fright.app.net.hostRoom()")
        host.wait_for_function("__fright.app.net.internet===true", timeout=25000)
        check("public PeerJS signaling opens a standalone room", True)
        guest.evaluate("(code)=>__fright.app.net.joinRoom(code)", code)
        guest.wait_for_function(
            "__fright.getState().network.roster.length===2", timeout=35000
        )
        check(
            "WebRTC pairs pages without BroadcastChannel",
            host.evaluate("__fright.app.net.connections.size") == 1
            and guest.evaluate("__fright.app.net.connections.size") == 1,
        )
        host.evaluate("__fright.app.net.start()")
        guest.wait_for_function(
            '__fright.getState().mode==="play" && __fright.getState().network.remotes.length===1',
            timeout=12000,
        )
        host.wait_for_function(
            "__fright.getState().network.remotes.length===1", timeout=5000
        )
        check("WebRTC carries the synchronized race and live ghost state", True)
        (artifacts / "internet-race.json").write_text(
            json.dumps(
                {
                    "signaling": "public PeerJS cloud",
                    "transport": "WebRTC data channel; BroadcastChannel disabled",
                    "host": host.evaluate("__fright.getState().network"),
                    "guest": guest.evaluate("__fright.getState().network"),
                },
                indent=2,
            )
        )
    finally:
        for page in [host, guest]:
            if not page.is_closed():
                page.evaluate("__fright?.app.net.close()")
        context.close()


def visuals(page, context, browser, origin, check, artifacts):
    """Capture authored composition and phone framing using the documented stand-in."""
    page.evaluate(
        "__fright.manual(true);__fright.app.view.pauseDrawing=true;__fright.app.view.titleBlend=0;__fright.model.enter(14);__fright.model.strike();__fright.app.view.pauseDrawing=false;__fright.app.view.sync(__fright.model,1/60);__fright.app.view.pauseDrawing=true;__fright.app.ui.hud()"
    )
    page.screenshot(path=str(artifacts / "nursery.png"))
    page.evaluate("__fright.app.ui.dev()")
    page.screenshot(path=str(artifacts / "developer-tools.png"))
    page.evaluate("__fright.app.ui.aboutPage=4;__fright.app.ui.about()")
    page.screenshot(path=str(artifacts / "credits.png"))
    check(
        "TV developer tools and credits have visible navigation",
        page.locator(".about-nav").is_visible(),
    )
    context.close()
    for name, width, height in [("touch", 844, 390), ("portrait", 390, 844)]:
        mobile = browser.new_context(
            viewport={"width": width, "height": height},
            has_touch=True,
            is_mobile=True,
            device_scale_factor=1,
        )
        phone = mobile.new_page()
        phone.goto(origin + "/game.html?test=1&localonly=1")
        phone.wait_for_function("window.__fright?.getState().ready", timeout=90000)
        phone.evaluate(
            '__fright.app.view.pauseDrawing=true;__fright.app.startGame();__fright.manual(true);__fright.app.setInput("touch");__fright.model.strike();__fright.app.view.titleBlend=0'
        )
        if name == "portrait":
            phone.evaluate("__fright.model.x=6;__fright.model.z=0")
        phone.evaluate(
            "for(let i=0;i<90;i++)__fright.app.view.sync(__fright.model,1/60);__fright.app.view.pauseDrawing=false;__fright.app.view.sync(__fright.model,1/60);__fright.app.view.pauseDrawing=true;__fright.app.ui.hud()"
        )
        pos = phone.evaluate(
            "__fright.app.view.project(__fright.model.x,__fright.model.z,1)"
        )
        check(
            f"{name} camera keeps the explorer on screen",
            15 < pos["x"] < width - 15 and 15 < pos["y"] < height - 15,
            pos,
        )
        phone.screenshot(path=str(artifacts / f"{name}.png"))
        mobile.close()
