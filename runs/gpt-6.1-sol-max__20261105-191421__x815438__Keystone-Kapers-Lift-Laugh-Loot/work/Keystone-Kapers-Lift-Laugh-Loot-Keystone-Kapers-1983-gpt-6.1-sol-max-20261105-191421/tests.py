"""One-command release checks. Prints failures and one final count only."""

import functools
import http.server
import json
import os
import re
import subprocess
import sys
import threading
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
GAME = ROOT / (DEV.name + ".html")
RESULTS = []
ERRORS = []
DETAILS = {}
SHUTDOWNS = []
NETWORK_ONLY = "--network" in sys.argv


def test(name, fn):
    if (
        NETWORK_ONLY
        and "room co-op" not in name
        and name != "No uncaught browser errors"
    ):
        return
    try:
        detail = fn()
        RESULTS.append({"name": name, "pass": True})
        if detail is not None:
            DETAILS[name] = detail
    except Exception as exc:  # noqa: BLE001 — aggregate independent release checks
        message = str(exc).splitlines()[0][:700]
        RESULTS.append({"name": name, "pass": False, "detail": message})
        print(f"FAIL {name}: {message}", flush=True)


def require(value, message):
    if not value:
        raise AssertionError(message)


def evaluate(page, script):
    return page.evaluate("() => {" + script + "}")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def open_game(context, url=None, manual=True):
    page = context.new_page()
    page.on("pageerror", lambda e: ERRORS.append(str(e)))

    def console(message):
        if message.type != "error":
            return
        if (
            "Device was destroyed" in message.text
            and "Reason: destroyed" in message.text
        ):
            SHUTDOWNS.append("Expected browser-context device destruction")
        elif any(s in message.text for s in ["WebGPU", "Shader", "THREE."]):
            ERRORS.append(message.text[:500])

    page.on("console", console)
    page.goto(url or GAME.as_uri(), wait_until="load")
    try:
        page.wait_for_function("window.__game?.ready", timeout=60000)
    except PlaywrightError:
        raise AssertionError(
            "Game did not boot: "
            + page.locator("#load-status").inner_text()
            + "; "
            + "; ".join(ERRORS[-3:])
        )
    if manual:
        page.evaluate("__game.manual(true)")
    return page


def packaging():
    html = GAME.read_text()
    require(html.count('<script type="module">') == 1, "Expected one bundled module")
    require("/*__GAME__*/" not in html, "Unexpanded game token")
    code = re.search(r'<script type="module">(.*?)</script>', html, re.DOTALL).group(1)
    (DEV / "embedded-check.mjs").write_text(code)
    result = subprocess.run(
        ["node", "--check", str(DEV / "embedded-check.mjs")],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode:
        error = re.search(r"(?:SyntaxError|ReferenceError):.*", result.stderr)
        raise AssertionError(
            error.group(0) if error else "Embedded JavaScript failed syntax check"
        )
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
        "Exit interview shape differs",
    )
    require(
        [len(data[k]) for k in ["testingFeedback", "engineFeedback", "promptFeedback"]]
        == [4, 6, 4],
        "Feedback count differs",
    )
    require(
        data["sourceInformation"]["usage"] == "added on import", "Usage value differs"
    )
    require(
        "<script src=" not in html and '<link rel="stylesheet"' not in html,
        "Offline dependencies not embedded",
    )
    return {"bytes": GAME.stat().st_size, "embeddedSyntax": "valid"}


def mechanics(page):
    tests = [
        (
            "Rapier grounded movement",
            "const g=__game;g.start();g.control(0,{axis:1});g.step(60);const p=g.snapshot().players[0];if(!(p.x>-16&&p.x<-13&&p.grounded))throw Error(JSON.stringify(p));return {x:p.x,y:p.y};",
        ),
        (
            "Running jump and landing",
            "const g=__game;g.start();g.control(0,{jump:true,axis:1});g.step(16);if(g.snapshot().players[0].y<1.4)throw Error('Jump did not rise');g.step(50);if(!g.snapshot().players[0].grounded)throw Error('Did not land');return g.sim.metrics.jumps;",
        ),
        (
            "Low hazard time penalty and invulnerability",
            "const g=__game;g.start();const s=g.sim,p=s.players[0];for(const h of [...s.hazards])s.removeHazard(h);p.invuln=0;s.spawnHazard('cart',0,p.x,0);const t=s.clock;g.step(4);if(s.metrics.hits!==1||t-s.clock<9||t-s.clock>9.2)throw Error(JSON.stringify({hits:s.metrics.hits,delta:t-s.clock}));",
        ),
        (
            "Duck clears plane; standing loses badge",
            "const g=__game;g.start();const s=g.sim,p=s.players[0];for(const h of [...s.hazards])s.removeHazard(h);p.invuln=0;g.control(0,{duck:true});s.spawnHazard('plane',0,p.x,0);g.step(4);if(s.badges!==3)throw Error('Crouch hit plane');g.control(0,{});g.step(4);if(s.badges!==2)throw Error('Standing did not hit plane');",
        ),
        (
            "Loot collection is shared and counted once",
            "const g=__game;g.start(2);g.sim.teleport(0,0,-15);g.step(5);const score=g.sim.score;g.step(5);if(score!==150||g.sim.score!==150||g.sim.recovered!==1)throw Error(JSON.stringify({score:g.sim.score,recovered:g.sim.recovered}));",
        ),
        (
            "Lift boards, carries, and exits",
            "const g=__game;g.start();const s=g.sim;s.teleport(0,0,0);Object.assign(s.lift,{floor:0,dir:1,phase:'dwell',t:0,open:1,y:0});g.control(0,{up:true});g.step(12);if(s.players[0].ride?.type!=='lift')throw Error('Did not board');g.control(0,{});g.step(237);g.control(0,{down:true});g.step(1);if(s.players[0].ride||s.players[0].floor!==1)throw Error(JSON.stringify(s.players[0].ride));return s.metrics.lifts;",
        ),
        (
            "All three one-way escalators",
            "const g=__game;g.start();const s=g.sim;for(let f=0;f<3;f++){const d=f%2?-1:1;s.teleport(0,f,d*19.4);g.control(0,{axis:d});g.step(125);if(s.players[0].floor!==f+1||s.players[0].ride)throw Error('Escalator '+f+' failed');}if(s.metrics.escalators!==3)throw Error('Ride count mismatch');",
        ),
        (
            "Whistle stuns crook and merchandise",
            "const g=__game;g.start();const s=g.sim;s.teleport(0,1,-10);Object.assign(s.crook,{x:-4,y:6,floor:1,ride:null,rummage:0,stun:0});const h=s.spawnHazard('cart',1,-7,-1);g.control(0,{whistle:true});g.step(1);const x=s.crook.x;g.step(30);if(s.crook.x!==x||s.crook.stun<=0||h.stunned<=0||s.players[0].whistle<7)throw Error('Whistle failed');",
        ),
        (
            "Clock expiry retries case and spends badge",
            "const g=__game;g.start();g.sim.clock=.001;g.step(1);if(g.sim.badges!==2||g.sim.state!=='playing'||g.sim.clock<90)throw Error('Timeout retry failed');",
        ),
        (
            "Game over and retry restore a playable case",
            "const g=__game;g.start();const s=g.sim;s.badges=1;s.players[0].invuln=0;s.spawnHazard('plane',0,s.players[0].x,0);g.step(2);if(s.state!=='gameover')throw Error('No game over');g.command('retry');if(s.state!=='playing'||s.badges!==3)throw Error('Retry failed');",
        ),
    ]
    for name, script in tests:
        test(name, lambda script=script: evaluate(page, script))


def full_playthrough(page):
    return evaluate(
        page,
        """
    const g=__game;g.start();const results=[];
    for(let round=0;round<3;round++){
      for(let i=0;i<5400&&g.sim.state==='playing';i++){
        for(const p of g.sim.players)g.sim.input(p.id,g.sim.getAI(p));
        g.sim.step(1/60);
      }
      g.step(0);
      if(g.sim.state!=='caught')throw Error('Case '+(round+1)+' did not finish: '+JSON.stringify({state:g.sim.state,clock:g.sim.clock,players:g.snapshot().players,crook:g.sim.crook,metrics:g.sim.metrics}));
      results.push({case:round+1,clock:g.sim.clock,score:g.sim.score});g.command('next-case');
    }
    if(g.sim.state!=='victory'||g.sim.captures!==3)throw Error('No final victory');
    return {cases:results,metrics:g.sim.metrics,score:g.sim.score};
    """,
    )


def menus_and_devices(page):
    test(
        "Keyboard uses native movement, jump, and pause keys",
        lambda: keyboard_test(page),
    )
    test(
        "Pause workshop has live sliders and default reset", lambda: workshop_test(page)
    )
    test(
        "Native AnimationMixer clips are active",
        lambda: evaluate(
            page,
            "const g=__game;g.start();g.draw();const a=g.art.actors.get(0);if(!a||a.userData.mixer._actions.length<6)throw Error('Missing native character clips');return a.userData.mixer._actions.map(a=>a.getClip().name);",
        ),
    )
    test(
        "About contains every required feedback section",
        lambda: evaluate(
            page,
            "__game.command('about');const ui=__game.ui;const pages=ui.aboutPages();for(const title of ['SOURCE INFORMATION','TESTING FEEDBACK','ENGINE FEEDBACK','PROMPT FEEDBACK'])if(!pages.some(p=>p.title===title))throw Error('Missing '+title);return pages.length;",
        ),
    )
    test(
        "Hub time-up retains the latest team score and loot statistics",
        lambda: evaluate(
            page,
            "const n=new (__game.net.constructor)({});let result;n.hubActive=true;n.role='host';n.roster=[{id:0},{id:1}];n.hub={send:()=>true,finish:r=>{result=r}};n.update({}, {score:1234,recovered:5,captures:2},.1);n.finish(false);if(result.scores[0]!==1234||result.stats[1]['Recovered loot']!==5||result.stats[0]['Crooks caught']!==2)throw Error(JSON.stringify(result));return result;",
        ),
    )
    test("Emulated standard pad navigates and starts", lambda: gamepad_test(page))
    test(
        "Synthesized music, effects, and voices produce audio", lambda: audio_test(page)
    )
    test(
        "Attract starts after ten idle seconds and any input exits",
        lambda: attract_test(page),
    )


def keyboard_test(page):
    page.evaluate("__game.start();__game.manual(true)")
    page.keyboard.down("d")
    require(page.evaluate("__game.input.sample(0).axis") == 1, "D did not move right")
    page.keyboard.up("d")
    page.evaluate("__game.manual(false)")
    page.keyboard.down("Space")
    page.wait_for_function("__game.sim.metrics.jumps>0", timeout=10000)
    page.keyboard.up("Space")
    page.keyboard.press("Escape")
    require(page.evaluate("__game.screen") == "pause", "Escape did not pause")


def workshop_test(page):
    page.evaluate("__game.start();__game.command('pause')")
    page.locator('[data-action="dev"]').click()
    require(page.locator("input[data-tune]").count() == 7, "Missing balance sliders")
    page.locator("#tune-speed").evaluate(
        '(e)=>{e.value=12;e.dispatchEvent(new Event("input",{bubbles:true}))}'
    )
    require(page.evaluate("__game.sim.tune.speed") == 12, "Live speed did not change")
    page.locator('[data-action="tune-toggle-invincible"]').click()
    require(
        page.evaluate("__game.sim.tune.invincible"),
        "Invincibility toggle did not change",
    )
    page.locator('[data-action="dev-reset"]').click()
    require(
        page.evaluate(
            "JSON.stringify(__game.sim.tune)===JSON.stringify(__game.defaults)"
        ),
        "Defaults did not reset",
    )
    page.screenshot(path=str(DEV / "workshop.png"), timeout=60000)
    page.locator('[data-action="resume"]').click()


def gamepad_test(page):
    page.evaluate(
        """__game.command('title');__game.manual(true);window.__pad={id:'Emulated standard DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false})),timestamp:1};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});__pad.buttons[0]={pressed:true,value:1};__game.input.poll();__pad.buttons[0]={pressed:false,value:0};__game.input.poll();"""
    )
    require(page.evaluate("__game.mode") == "game", "Cross did not start from title")
    require(page.evaluate("__game.input.kind") == "pad", "Pad was not last input")
    mapping = evaluate(
        page,
        "__pad.axes[0]=.8;__pad.buttons[1]={pressed:true,value:1};__pad.buttons[2]={pressed:true,value:1};__game.input.poll();const s=__game.input.sample(0);__pad.axes[0]=0;__pad.buttons.forEach(b=>{b.pressed=false;b.value=0});__game.input.poll();if(s.axis<.7||!s.duck||!s.whistle)throw Error(JSON.stringify(s));return s;",
    )
    evaluate(
        page,
        "__game.command('pause');__game.command('settings');__game.command('setting-toggle-glyphs');__pad.axes[0]=.6;__game.input.poll();__pad.axes[0]=0;__game.input.poll();__game.ui.refreshPrompts('pad',__game.settings.glyphs);if(__game.settings.glyphs!=='xbox'||!document.querySelector('#play-prompts').textContent.includes('A'))throw Error('Xbox glyphs missing');__game.command('title');Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});",
    )
    return mapping


def audio_test(page):
    data = page.evaluate("__game.auditAudio()")
    require(data["musicDefault"] == 0.1, "Music default is not 10%")
    require(
        0.001 < data["rms"] < 0.5 and 0 < data["peak"] < 1 and data["voices"] == 1,
        f"Invalid audio signal: {data}",
    )
    return data


def attract_test(page):
    page.evaluate("__game.command('title');__game.manual(false)")
    page.wait_for_function("__game.app.firstDraw", timeout=15000)
    page.evaluate("__game.app.idleAt=performance.now()-9400")
    page.wait_for_timeout(150)
    require(
        page.evaluate("__game.mode") == "title", "Attract started before ten seconds"
    )
    page.wait_for_function('__game.mode==="attract"', timeout=8000)
    require(page.locator("#attract-label").is_visible(), "Attract label missing")
    page.keyboard.press("x")
    page.wait_for_function('__game.mode==="title"', timeout=5000)
    page.evaluate("__game.manual(true)")


def touch_test(browser, p):
    context = browser.new_context(**p.devices["iPhone 13"])
    page = open_game(context)
    page.locator('[data-action="start"]').tap()
    page.evaluate("__game.manual(true)")
    require(
        page.evaluate("__game.input.kind") == "touch",
        "Touch input did not become active",
    )
    require(page.locator("#play-prompts").is_hidden(), "Touch controls cover the view")
    data = evaluate(
        page,
        """
    const cv=document.querySelector('#world canvas');
    cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:11,pointerType:'touch',clientX:50,clientY:500}));
    cv.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:11,pointerType:'touch',clientX:100,clientY:500}));
    cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:12,pointerType:'touch',clientX:320,clientY:500}));
    const i=__game.input.sample(0);if(i.axis<.9||!i.jump)throw Error(JSON.stringify(i));
    cv.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:11,pointerType:'touch'}));cv.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:12,pointerType:'touch'}));return i;
    """,
    )
    page.evaluate("__game.draw()")
    page.screenshot(path=str(DEV / "touch.png"), timeout=60000)
    context.close()
    return data


def visual_fallback_test(browser):
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    page = open_game(context, GAME.as_uri() + "?renderer=webgl")
    info = evaluate(
        page,
        "__game.draw();const r=__game.art.renderer.info.render;if(r.drawCalls<100||r.triangles<1000)throw Error(JSON.stringify(r));return {backend:__game.backend,render:{...r}};",
    )
    page.screenshot(path=str(DEV / "title-visual.png"), timeout=60000)
    page.evaluate("__game.start();__game.step(200,true);__game.draw()")
    page.screenshot(path=str(DEV / "play-visual.png"), timeout=60000)
    context.close()
    return info


def room_test(browser, base, internet=False):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    if internet:
        context.add_init_script("globalThis.BroadcastChannel = undefined")
    host = open_game(context, base + "/" + quote(GAME.name))
    host.evaluate("__game.command('host')")
    host.wait_for_function("__game.net.code.length===5", timeout=5000)
    code = host.evaluate("__game.net.code")
    guest = open_game(context, base + "/" + quote(GAME.name))
    guest.evaluate("__game.command('join-screen')")
    guest.locator("#join-code").fill(code)
    guest.locator('[data-action="join"]').click()
    try:
        guest.wait_for_function(
            "__game.net.welcomed", timeout=30000 if internet else 15000
        )
    except PlaywrightError:
        script = """() => { const n=__game.net;return {role:n.role,code:n.code,peerOpen:n.peer?.open,peerId:n.peer?.id,error:n.lastError,transport:n.transport,welcomed:n.welcomed,status:document.querySelector('#room-status')?.textContent,connections:[...(n.peer?._connections?.values()||[])].flat().map(c=>({peer:c.peer,open:c.open,ice:c.peerConnection?.iceConnectionState,state:c.peerConnection?.connectionState,signaling:c.peerConnection?.signalingState}))};}"""
        diagnostic = {"host": host.evaluate(script), "guest": guest.evaluate(script)}
        (DEV / "network-diagnostic.json").write_text(json.dumps(diagnostic, indent=2))
        context.close()
        raise AssertionError(json.dumps(diagnostic))
    host.wait_for_function("__game.net.roster.length===2", timeout=5000)
    host.evaluate("__game.command('begin-room');__game.manual(false)")
    guest.wait_for_function(
        '__game.mode==="game"&&__game.snapshot().players.length===2', timeout=15000
    )
    start = host.evaluate("__game.snapshot().players.find(p=>p.id===1).x")
    guest.keyboard.down("d")
    host.wait_for_function(
        f"__game.snapshot().players.find(p=>p.id===1).x>{start}+.4", timeout=15000
    )
    guest.keyboard.up("d")
    host.evaluate("__game.manual(true)")
    data = {
        "transport": guest.evaluate("__game.net.transport"),
        "hostSent": host.evaluate("__game.net.sent"),
        "guestSent": guest.evaluate("__game.net.sent"),
        "publicSignallingOpen": host.evaluate("!!__game.net.peer?.open"),
    }
    if internet:
        require(data["transport"] == "peer", "WebRTC transport was not used")
    require(
        data["transport"] in ["bc", "peer"]
        and data["hostSent"] > 0
        and data["guestSent"] > 0,
        "No two-way room traffic",
    )
    host.evaluate("__game.sim.catchCrook(1);__game.draw()")
    guest.wait_for_function('__game.snapshot().state==="caught"', timeout=10000)
    host.evaluate("__game.command('title')")
    guest.wait_for_function('__game.mode==="title"', timeout=10000)
    context.close()
    return data


def hub_test(browser, base, players, scenario="standard", impaired=False):
    context = browser.new_context(viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    suffix = "&latency=150&jitter=50&loss=5" if impaired else ""
    url = f"{base}/{quote(DEV.name)}/harness.html?game={quote('../' + GAME.name)}&players={players}&auto=1&play=4000&limit=20&scenario={scenario}{suffix}"
    page.goto(url, wait_until="load")
    require(
        page.locator("h1").inner_text().strip().startswith("AI Hub"),
        "Wrong harness page",
    )
    page.wait_for_function('document.body.dataset.complete==="true"', timeout=100000)
    report = page.evaluate("window.__hubCheck")
    (DEV / f"hub-{players}-{scenario}.json").write_text(json.dumps(report, indent=2))
    context.close()
    require(
        report["pass"],
        "; ".join(
            x["name"] + ": " + x.get("detail", "")
            for x in report["checks"]
            if not x["pass"]
        ),
    )
    return {
        "checks": len(report["checks"]),
        "players": players,
        "scenario": scenario,
        "impaired": impaired,
    }


def main():
    (DEV / "test-process.pid").write_text(str(os.getpid()))
    test("Single-file package and metadata", packaging)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080}, device_scale_factor=1
            )
            page = None

            def boot_test():
                nonlocal page
                page = open_game(context)
                require(
                    page.title() == "Keystone Kapers: Lift, Laugh, Loot",
                    "Wrong game page",
                )
                require(
                    page.evaluate("__game.backend") == "WebGPU",
                    "WebGPU renderer was not used",
                )
                require(
                    page.locator('[data-action="start"]').is_visible(),
                    "Start button missing",
                )
                page.evaluate("__game.draw()")
                require(
                    page.evaluate("__game.art.renderer.info.render.drawCalls") > 100,
                    "Scene has no draw calls",
                )
                page.screenshot(path=str(DEV / "title.png"), timeout=60000)
                return page.evaluate("__game.versions")

            test("Offline file boots with real WebGPU", boot_test)
            if page and page.evaluate("!!window.__game"):
                mechanics(page)
                test(
                    "Complete three-case playthrough with normal rules",
                    lambda: full_playthrough(page),
                )
                page.evaluate("__game.start();__game.step(200,true);__game.draw()")
                page.screenshot(path=str(DEV / "play.png"), timeout=60000)
                menus_and_devices(page)
            context.close()
            test(
                "WebGL compatibility scene for visual inspection",
                lambda: visual_fallback_test(browser),
            )
            test(
                "Phone profile, touch taps and multitouch movement",
                lambda: touch_test(browser, p),
            )
            test(
                "Standalone room co-op synchronizes both players and arrests",
                lambda: room_test(browser, base),
            )
            test(
                "Internet-signalled WebRTC room co-op without BroadcastChannel",
                lambda: room_test(browser, base, True),
            )
            test(
                "AI Hub standard two-player conformance",
                lambda: hub_test(browser, base, 2),
            )
            test(
                "AI Hub four players with latency, jitter and loss",
                lambda: hub_test(browser, base, 4, impaired=True),
            )
            test(
                "AI Hub host departure",
                lambda: hub_test(browser, base, 4, "host-leave", True),
            )
            test(
                "AI Hub dedicated server without a local player",
                lambda: hub_test(browser, base, 2, "server"),
            )
            browser.close()
        test(
            "No uncaught browser errors",
            lambda: require(not ERRORS, "; ".join(ERRORS[:6])),
        )
    finally:
        server.shutdown()
        server.server_close()
    report = {
        "tests": RESULTS,
        "details": DETAILS,
        "errors": ERRORS,
        "expectedContextShutdowns": len(SHUTDOWNS),
        "passed": sum(x["pass"] for x in RESULTS),
        "failed": sum(not x["pass"] for x in RESULTS),
    }
    (DEV / ("test-network.json" if NETWORK_ONLY else "test-results.json")).write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(
        f"{len(RESULTS)} checks: {report['passed']} passed, {report['failed']} failed",
        flush=True,
    )
    raise SystemExit(1 if report["failed"] else 0)


if __name__ == "__main__":
    main()
