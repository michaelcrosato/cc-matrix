import json
import subprocess
from html.parser import HTMLParser


def configure(root, art, ready_fn, shot_fn):
    global ROOT, ART, ready, shot
    ROOT, ART, ready, shot = root, art, ready_fn, shot_fn


class ScriptReader(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.scripts = []
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            assert not dict(attrs).get("src"), "External script found in offline bundle"
            self.in_script = True
            self.scripts.append("")

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_script = False

    def handle_data(self, data):
        if self.in_script:
            self.scripts[-1] += data


def package():
    selection = json.loads((ROOT / "selection.json").read_text())
    draw = json.loads((ROOT / "title-draw.json").read_text())
    assert (
        len(draw["candidates"]) == 50
        and draw["candidates"][draw["index"]] == selection["title"]
    )
    html = (ROOT.parent / (selection["stem"] + ".html")).read_text()
    assert html == (ROOT / "index.html").read_text(), "Preview differs from delivery"
    assert (
        "<script>" + (ROOT / "vendor/session.js").read_text() + "</script>" in html
    ), "Hub client modified"
    parser = ScriptReader()
    parser.feed(html)
    assert len(parser.scripts) == 2, len(parser.scripts)
    script = ART / "bundle-syntax.mjs"
    script.write_text(parser.scripts[1])
    proc = subprocess.run(
        ["node", "--check", str(script)], capture_output=True, text=True, check=False
    )
    assert proc.returncode == 0, proc.stderr
    data = json.loads((ROOT.parent / "exit-interview.json").read_text())
    assert set(data) == {
        "sourceInformation",
        "testingFeedback",
        "engineFeedback",
        "promptFeedback",
        "aiHub",
    }
    assert (
        len(data["testingFeedback"]) == 4
        and len(data["engineFeedback"]) == 6
        and len(data["promptFeedback"]) == 4
    )
    assert all(data["sourceInformation"].values())
    assert data["sourceInformation"]["usage"] == "added on import"
    assert 'hub:session-mode" content="ghost' in html
    return {"bytes": len(html.encode()), "inlineScripts": 2, "feedbackShape": "valid"}


def wildlife(page):
    return page.evaluate(r"""() => {
     const a=__below,g=a.game;a.test.start();a.test.manual(true);const contacts=[];
     for(const type of ['frog','scorpion','bat','condor','eel']){
      g.reset();g.updateEnemies(0);const e=g.enemies.find(e=>e.type===type);g.teleport(e.x,e.y);g.invuln=0;g.tick(1/60,{});if(g.deaths!==1)throw Error(type+' contact did not rewind');contacts.push(type);
     }
     g.reset();g.updateEnemies(0);const rat=g.enemies.find(e=>e.type==='rat');g.teleport(rat.x-rat.dir*.5,rat.y);g.invuln=0;g.tick(1/60,{});if(!g.collected.has('rat'))throw Error('Rear approach did not collect cave rat');
     g.reset();g.updateEnemies(0);const bat=g.enemies.find(e=>e.type==='bat'&&e.bx===76);g.teleport(bat.x,bat.y-2.8);g.carry=true;g.boardCooldown=2;g.tick(1/60,{});if(g.carry||g.balloon.respawn<=0)throw Error('Bat did not pop balloon');
     a.test.start();return{contacts,rat:'rear approach collected',pop:'safe drop and respawn'};
    }""")


def attract_check(page):
    page.evaluate("__below.test.title();__below.test.idle();")
    page.wait_for_function("__below.snapshot().attract", timeout=10000)
    page.mouse.move(30, 30)
    page.wait_for_function(
        '__below.ui.screen==="title"&&!__below.snapshot().attract', timeout=10000
    )
    page.evaluate("__below.test.idle();")
    page.wait_for_function("__below.snapshot().attract", timeout=10000)
    data = page.evaluate(
        r"""() => {const modes=new Set();for(let i=0;i<172;i++){__below.test.replay(.5);modes.add(__below.game.mode);}return{modes:[...modes],found:__below.game.rescued};}"""
    )
    assert all(k in data["modes"] for k in ["climb", "swim", "float"]), data
    assert all(data["found"].values()), data
    page.keyboard.press("Enter")
    page.wait_for_function(
        '__below.snapshot().screen==="title"&&!__below.snapshot().attract'
    )
    return data


def pad_set(page, buttons=None, x=0, y=0):
    page.evaluate(
        """({buttons,x,y})=>{__pad.axes=[x,y,0,0];__pad.buttons.forEach((b,i)=>{b.pressed=buttons.includes(i);b.value=b.pressed?1:0;});}""",
        {"buttons": buttons or [], "x": x, "y": y},
    )


def pad_press(page, index):
    pad_set(page, [index])
    page.wait_for_timeout(200)
    pad_set(page)
    page.wait_for_timeout(150)


def controller(page):
    page.evaluate(
        r"""() => {__below.test.title();__below.test.manual(false);window.__pad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__pad]});}"""
    )
    pad_press(page, 0)
    page.wait_for_function('__below.ui.screen===""', timeout=15000)
    pad_set(page, x=1)
    page.wait_for_function("__below.game.position.x>4.5", timeout=15000)
    pad_set(page)
    pad_press(page, 0)
    page.wait_for_function("__below.game.position.y>1.2", timeout=15000)
    pad_set(page, [8, 9])
    page.wait_for_timeout(250)
    assert page.evaluate("__below.ui.screen") == "", (
        "Create + Options incorrectly paused game"
    )
    pad_set(page)
    page.wait_for_timeout(160)
    pad_press(page, 9)
    page.wait_for_function('__below.ui.screen==="pause"', timeout=15000)
    data = page.evaluate(
        r"""() => {const a=__below;const ps=document.querySelector('#control-hints').textContent;a.ui.settings.glyphs='xbox';a.ui.hints();const xbox=document.querySelector('#control-hints').textContent;a.ui.settings.glyphs='ps';a.ui.hints();return{ps,xbox,input:a.ui.input,moves:a.snapshot().diagnostics.gamepadInputs};}"""
    )
    assert "×" in data["ps"] and "A" in data["xbox"] and data["input"] == "gamepad", (
        data
    )
    pad_set(page)
    page.set_viewport_size({"width": 1280, "height": 720})
    page.evaluate("__below.ui.open('guide')")
    pad_set(page, [13])
    page.wait_for_timeout(450)
    pad_set(page)
    assert page.evaluate("document.querySelector('.panel-body').scrollTop>0"), (
        "Controller could not scroll the field guide"
    )
    page.evaluate("__below.test.manual(true)")
    return data


def offline(browser):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    external = []

    def block(route):
        external.append(route.request.url)
        route.abort()

    page.route("http://**/*", block)
    page.route("https://**/*", block)
    try:
        page.goto((ROOT / "index.html").as_uri() + "?test=1")
        ready(page)
        data = page.evaluate("__below.snapshot()")
        assert data["screen"] == "title" and not external, external
        return {"backend": data["diagnostics"]["backend"], "externalRequests": external}
    finally:
        context.close()


def touch(browser, origin):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = context.new_page()
    try:
        page.goto(origin + "/index.html?test=1")
        ready(page)
        page.locator('[data-action="start"]').tap()
        page.wait_for_function('__below.ui.screen===""')
        client = context.new_cdp_session(page)
        client.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 100, "y": 290, "id": 1}]},
        )
        client.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 152, "y": 290, "id": 1}]},
        )
        page.wait_for_function("__below.game.position.x>3.9", timeout=15000)
        client.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 152, "y": 290, "id": 1},
                    {"x": 745, "y": 290, "id": 2},
                ],
            },
        )
        page.wait_for_function(
            "__below.snapshot().diagnostics.jumpInputs>0", timeout=10000
        )
        client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        data = page.evaluate(
            """() => ({input:__below.ui.input,touch:__below.snapshot().diagnostics.touchInputs,jumps:__below.snapshot().diagnostics.jumpInputs,minimal:getComputedStyle(document.querySelector('.hud-left')).display})"""
        )
        assert data["input"] == "touch" and data["minimal"] == "none", data
        page.locator("#touch-menu").tap()
        page.wait_for_function('__below.ui.screen==="pause"')
        page.locator('[data-action="resume"]').tap()
        page.screenshot(path=str(ART / "touch-landscape.png"))
        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("__below.test.title()")
        page.screenshot(path=str(ART / "touch-title.png"))
        return data
    finally:
        context.close()


def rtc(browser, origin):
    process = subprocess.Popen(
        ["node", "tests/peer-server.mjs"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    contexts = []
    try:
        line = process.stdout.readline()
        port = json.loads(line)["port"]
        contexts = [
            browser.new_context(viewport={"width": 960, "height": 540})
            for _ in range(2)
        ]
        pages = [c.new_page() for c in contexts]
        for p in pages:
            p.goto(origin + "/index.html?test=1")
            ready(p)
            p.evaluate(
                """port=>{__below.test.manual(true);__below.network.peerOptions={host:'127.0.0.1',port,path:'/below',secure:false,config:{iceServers:[]}};}""",
                port,
            )
        code = pages[0].evaluate("__below.network.create()")
        pages[1].evaluate("code=>__below.network.join(code)", code)
        for p in pages:
            p.wait_for_function(
                "__below.network.roster.size===2&&__below.network.connections.size===1",
                timeout=25000,
            )
        pages[0].evaluate("__below.network.begin()")
        for p in pages:
            p.wait_for_function('__below.ui.screen===""', timeout=10000)
        pages[0].evaluate(
            "__below.game.teleport(25,.85);__below.network.broadcast(__below.game.snapshot())"
        )
        pages[1].wait_for_function(
            "[...__below.network.ghosts.values()].some(g=>g.x===25)", timeout=10000
        )
        pages[1].evaluate(
            "__below.game.teleport(8,-11.15);__below.network.broadcast(__below.game.snapshot())"
        )
        pages[0].wait_for_function(
            "[...__below.network.ghosts.values()].some(g=>Math.abs(g.y+11.15)<.01)",
            timeout=10000,
        )
        data = [
            p.evaluate(
                """() => ({roster:__below.network.roster.size,ghosts:__below.network.getGhosts().length,sent:__below.network.sent,received:__below.network.received,rtc:[...__below.network.connections.values()].map(c=>c.peerConnection.connectionState)})"""
            )
            for p in pages
        ]
        assert all("connected" in d["rtc"] for d in data), data
        pages[0].evaluate(
            "__below.game.rescue('pip');__below.game.rescue('fox');__below.game.rescue('prism')"
        )
        pages[0].wait_for_function(
            '__below.ui.screen==="win"&&document.querySelectorAll("#race-results>div").length===2',
            timeout=10000,
        )
        pages[1].evaluate("__below.network.close()")
        pages[0].wait_for_function("__below.network.roster.size===1", timeout=10000)
        return {
            "devices": data,
            "publicRelay": "not required for controlled local signaling test",
        }
    finally:
        for c in contexts:
            c.close()
        process.terminate()
        try:
            process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


def broadcast(browser, origin):
    context = browser.new_context(viewport={"width": 960, "height": 540})
    pages = [context.new_page(), context.new_page()]
    try:
        for p in pages:
            p.goto(origin + "/index.html?test=1")
            ready(p)
            p.evaluate("__below.test.manual(true);__below.network.setupPeer=()=>{}")
        code = pages[0].evaluate("__below.network.create()")
        pages[1].evaluate("code=>__below.network.join(code)", code)
        for p in pages:
            p.wait_for_function("__below.network.roster.size===2", timeout=10000)
        pages[0].evaluate("__below.network.begin()")
        for p in pages:
            p.wait_for_function('__below.ui.screen===""')
        pages[0].evaluate("__below.network.broadcast(__below.game.snapshot())")
        pages[1].wait_for_function(
            "__below.network.getGhosts().length===1", timeout=10000
        )
        return {"players": 2, "transport": "BroadcastChannel", "ghostVisible": True}
    finally:
        context.close()


def fallback(browser, origin):
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    try:
        page.goto(origin + "/index.html?test=1&renderer=webgl")
        ready(page)
        assert page.evaluate("__below.snapshot().diagnostics.backend") == "WebGL 2"
        page.evaluate("__below.test.manual(true)")
        shot(page, "title-webgl.png")
        page.evaluate(
            "__below.test.start();__below.test.step(60,{});__below.art.snapCamera()"
        )
        page.wait_for_timeout(400)
        page.screenshot(path=str(ART / "porch.png"))
        page.evaluate(
            "__below.game.teleport(25,-28);__below.test.step(1,{});__below.art.snapCamera()"
        )
        page.wait_for_timeout(400)
        page.screenshot(path=str(ART / "river.png"))
        page.evaluate(
            "__below.game.teleport(76,-15);__below.game.carry=true;__below.test.step(1,{});__below.art.snapCamera()"
        )
        page.wait_for_timeout(400)
        page.screenshot(path=str(ART / "balloon.png"))
        page.evaluate('__below.ui.open("map")')
        page.screenshot(path=str(ART / "map.png"))
        return {
            "fallback": "WebGL 2",
            "compositions": ["title", "porch", "river", "balloon", "map"],
        }
    finally:
        context.close()


def harness(browser, origin, players, scenario):
    context = browser.new_context(viewport={"width": 1600, "height": 900})
    page = context.new_page()
    try:
        url = (
            origin
            + f"/harness.html?game=index.html&players={players}&latency=150&jitter=50&loss=5&scenario={scenario}&play=3500&auto=1"
        )
        page.goto(url, wait_until="load", timeout=120000)
        page.wait_for_function("window.__hubCheck?.done===true", timeout=90000)
        report = page.evaluate("window.__hubCheck")
        report["copies"] = [
            f.evaluate(
                '({url:location.href,boot:window.__belowBoot,loading:document.querySelector("#loading")?.textContent,errors:window.__below?.snapshot().diagnostics.errors})'
            )
            for f in page.frames[1:]
            if f.url.startswith(origin + "/index.html")
        ]
        (ART / f"hub-{players}-{scenario}.json").write_text(
            json.dumps(report, indent=2)
        )
        assert report["pass"], [c for c in report["checks"] if not c["pass"]]
        for f in page.frames[1:]:
            if f.url.startswith(origin + "/index.html") and f.evaluate(
                "!!window.__below"
            ):
                assert f.evaluate("__below.snapshot().hub.ended"), (
                    "Game did not stop at hub end"
                )
        return {
            "pass": report["pass"],
            "checks": len(report["checks"]),
            "latency": 150,
            "jitter": 50,
            "loss": 5,
        }
    finally:
        context.close()


def developer_tools(page):
    data = page.evaluate(r"""() => {
     const a=__below,g=a.game;a.test.manual(true);a.test.start();a.ui.open('pause');a.ui.open('dev');a.ui.act('noclip');a.test.step(180,{y:-1});const flight={y:g.position.y,sensor:g.collider.isSensor()};
     if(flight.y>-40||!flight.sensor)throw Error('Free flight did not pass through solid floors');
     a.ui.act('reset-balance');const select=document.querySelector('#warp');select.value='0';a.ui.act('warp');a.test.step(60,{});const warp={x:g.position.x,y:g.position.y,screen:a.ui.screen,noclip:g.noclip,sensor:g.collider.isSensor()};
     if(warp.x!==3||Math.abs(warp.y-.75)>.1||warp.noclip||warp.sensor)throw Error('Warp/reset failed');
     a.ui.open('pause');a.ui.open('dev');const old=g.stepCount;a.ui.act('single-step');if(g.stepCount!==old+1)throw Error('Single-step did not advance exactly once');return{flight,warp,singleStep:true};
    }""")
    return data


def falls_and_live_audio(page):
    data = page.evaluate(
        r"""() => {const a=__below,g=a.game;a.test.start();g.invincible=true;g.teleport(17,-.8);a.test.step(150,{});return{falls:g.falls,score:g.score};}"""
    )
    assert data["falls"] == 1 and data["score"] == 3900, data
    page.mouse.click(40, 40)
    page.evaluate("__below.audio.voice();")
    page.wait_for_function(
        "__below.audio.notes>0&&__below.audio.level()>.00001", timeout=10000
    )
    signal = page.evaluate(
        "({notes:__below.audio.notes,voices:__below.audio.voices,level:__below.audio.level(),state:__below.audio.ctx.state})"
    )
    assert (
        signal["notes"] > 0 and signal["voices"] > 0 and signal["state"] == "running"
    ), signal
    return {"fall": data, "signal": signal}


def credits(page):
    data = page.evaluate(
        r"""() => {const a=__below;a.ui.playing();a.ui.open('credits');a.ui.tab=0;a.ui.render();const source=document.querySelector('.credit-list').textContent;if(!source.includes('added on import')||!source.includes('2026-11-05 20:08:40')||!source.includes('reasoning effort max'))throw Error('Source Information missing required fields');const sourceFields=document.querySelectorAll('.credit-list dt').length;const counts=[];for(let i=1;i<=3;i++){a.ui.act('credit-tab',{dataset:{index:String(i)}});counts.push(document.querySelectorAll('.feedback-list li').length);}a.ui.playing();return{sourceFields,feedbackAnswers:counts};}"""
    )
    assert data["feedbackAnswers"] == [4, 6, 4], data
    return data
