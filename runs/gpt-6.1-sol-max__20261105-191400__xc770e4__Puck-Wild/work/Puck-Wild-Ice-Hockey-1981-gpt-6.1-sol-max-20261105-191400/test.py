# ruff: noqa: BLE001
# Collect failures while keeping independent browser scenarios running.
import functools
import http.server
import json
import os
import pathlib
import re
import subprocess
import sys
import threading
import urllib.parse

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
(ROOT / "browser-temp").mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(ROOT / "browser-temp")
project = json.loads((ROOT / "project.json").read_text())
VISUAL = bool(os.environ.get("PUCK_VISUAL"))
failures = []
reports = {}
count = 0


def check(name, condition, detail=""):
    global count
    count += 1
    if not condition:
        failures.append(f"{name}: {detail}")


interview = json.loads((ROOT.parent / "exit-interview.json").read_text())
html = (ROOT.parent / (project["name"] + ".html")).read_text()
check(
    "exit interview has exact root schema",
    set(interview)
    == {
        "sourceInformation",
        "testingFeedback",
        "engineFeedback",
        "promptFeedback",
        "aiHub",
    },
)
check(
    "all interview responses filled",
    all(
        len(interview[key]) == length
        and all(isinstance(v, str) and v for v in interview[key])
        for key, length in [
            ("testingFeedback", 4),
            ("engineFeedback", 6),
            ("promptFeedback", 4),
        ]
    ),
)
embedded = json.loads(
    re.search(
        r'<script id="game-metadata" type="application/json">(.*?)</script>',
        html,
        re.DOTALL,
    )[1]
)
check("credits metadata matches exit interview", embedded == interview)
client = (ROOT / "vendor/session.js").read_text()
check("AI Hub client embedded unmodified", "<script>" + client + "</script>" in html)
check(
    "bundle has no unresolved template slots",
    not any(
        slot in html
        for slot in [
            "/*METADATA*/",
            "/*GAME_BUNDLE*/",
            "/*HUB_CLIENT*/",
            "/*FONTS*/",
            "/*LICENSES*/",
        ]
    ),
)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT.parent))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
URL = f"{base}/{project['name']}.html" + ("?graphics=webgl" if VISUAL else "")
sim = subprocess.run(
    ["node", str(ROOT / "simulation-tests.mjs")],
    check=False,
    capture_output=True,
    text=True,
    cwd=ROOT,
)
try:
    reports["simulation"] = json.loads(sim.stdout)
    for r in reports["simulation"]:
        check(r["name"], r["pass"], r["detail"])
except Exception:
    check("simulation subprocess", False, sim.stderr + sim.stdout)

PAD_STUB = """window.__pads=Array.from({length:4},(_,i)=>({id:'Emulated standard DualSense '+i,index:i,connected:false,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});"""


def ready(page):
    page.wait_for_function(
        "window.__PUCK__?.ready || window.__PUCK_ERROR__", timeout=90000
    )
    if not page.evaluate("!!window.__PUCK__?.ready"):
        raise RuntimeError(page.evaluate("window.__PUCK_ERROR__"))


def isolate(page, players=1):
    page.evaluate(
        """n=>{__PUCK__.start({players:n});const g=__PUCK__.game;g.phase='play';for(const i of [1,2,3]){const p=g.players[i];p.x=i%2?-17:19;p.z=10;p.body.setTranslation({x:p.x,y:.65,z:10},true);}}""",
        players,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--no-sandbox",
            "--enable-unsafe-swiftshader",
        ],
    )
    errors, messages = [], []
    context = browser.new_context(
        viewport={"width": 1440, "height": 900}, device_scale_factor=1
    )
    context.add_init_script(PAD_STUB)
    if VISUAL:
        context.add_init_script(
            "const nativeRaf=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>setTimeout(()=>nativeRaf(f),200)"
        )
    page = context.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: messages.append({"type": m.type, "text": m.text}))
    try:
        page.goto(URL, wait_until="load", timeout=90000)
        ready(page)
        check("correct game", page.title().startswith("Puck Wild"), page.title())
        backend = page.evaluate("__PUCK__.backend")
        check(
            "renderer backend",
            backend == ("WebGL 2 compatibility" if VISUAL else "WebGPU"),
            backend,
        )
        check("title screen", page.evaluate("__PUCK__.screen") == "title")
        check(
            "music defaults to ten percent",
            page.evaluate("__PUCK__.audio.musicVolume") == 0.1,
        )
        if VISUAL:
            page.wait_for_timeout(1200)
            page.screenshot(path=str(ROOT / "title.png"))
            page.evaluate("__PUCK__.title()")
        else:
            page.evaluate('__PUCK__.controls.activity("pad",true)')
            check(
                "controller input initializes procedural audio",
                page.evaluate("!!__PUCK__.audio.ctx"),
            )
        page.locator('#title-screen [data-action="play"]').click()
        page.wait_for_function('__PUCK__.game.phase==="play"', timeout=20000)
        check("cup starts from menu", page.evaluate("__PUCK__.screen") == "play")
        if VISUAL:
            page.wait_for_timeout(700)
            page.screenshot(path=str(ROOT / "match.png"))
        if not VISUAL:
            isolate(page)
            start_x = page.evaluate("__PUCK__.game.players[0].x")
            page.keyboard.down("d")
            page.wait_for_function("x=>__PUCK__.game.players[0].x>x+1.5", arg=start_x)
            page.keyboard.up("d")
            check(
                "keyboard controls skating",
                page.evaluate("__PUCK__.game.players[0].x") > start_x + 1,
            )
            page.keyboard.press("Escape")
            page.wait_for_function('__PUCK__.modal==="pause"')
            old_time = page.evaluate("__PUCK__.game.remaining")
            page.wait_for_timeout(250)
            check(
                "pause freezes standalone simulation",
                page.evaluate("__PUCK__.game.remaining") == old_time,
            )
            page.locator('[data-action="dev"]').click()
            page.locator("#speed").evaluate(
                "e=>{e.value=12;e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            check(
                "developer slider is live",
                page.evaluate("__PUCK__.game.tune.speed") == 12,
            )
            page.locator('[data-action="reset-tuning"]').click()
            check(
                "developer defaults reset",
                page.evaluate("__PUCK__.game.tune.speed") == 8.8,
            )
            page.locator('[data-action="back"]').click()
            page.locator('#panel-content [data-action="settings"]').click()
            page.locator('[data-action="glyph"]').click()
            page.evaluate("__PUCK__.controls.activity('pad',true)")
            check(
                "Xbox prompt follows input",
                "RT" in page.locator("#game-prompts").inner_text(),
            )
            page.locator('[data-action="reset-settings"]').click()
            page.locator('[data-action="back"]').click()
            page.locator('#panel-content [data-action="about"]').click()
            check(
                "source information in credits",
                "Ice Hockey - 1981" in page.locator("#credit-text").inner_text(),
            )
            for tab in ["testing", "engine", "prompt"]:
                page.locator(f'[data-credit="{tab}"]').click()
                check(
                    f"{tab} feedback in credits",
                    len(page.locator("#credit-text").inner_text()) > 20,
                )
            page.locator('[data-credit="licenses"]').click()
            check(
                "embedded third-party license notices",
                "The MIT License" in page.locator("#credit-text").inner_text()
                and "Apache License" in page.locator("#credit-text").inner_text(),
            )
            page.evaluate(
                "document.getElementById('panel-content').scrollTop=0;__pads[0].connected=true;__pads[0].axes[3]=.8"
            )
            page.wait_for_function(
                "document.getElementById('panel-content').scrollTop>80"
            )
            check(
                "right stick scrolls long controller menus",
                page.evaluate("document.getElementById('panel-content').scrollTop")
                > 80,
            )
            check(
                "right stick updates active input",
                page.evaluate("__PUCK__.controls.last") == "pad",
            )
            page.evaluate("__pads[0].axes[3]=0;__pads[0].connected=false")
            page.evaluate("__PUCK__.action('resume')")
            isolate(page)
            page.evaluate("__pads[0].connected=true;__pads[0].axes[0]=.8")
            start_x = page.evaluate("__PUCK__.game.players[0].x")
            page.wait_for_function("x=>__PUCK__.game.players[0].x>x+1.5", arg=start_x)
            page.evaluate("__pads[0].axes[0]=0")
            check(
                "emulated standard pad moves skater",
                page.evaluate("__PUCK__.game.players[0].x") > start_x + 1,
            )
            check(
                "PlayStation glyphs follow pad",
                "R2" in page.locator("#game-prompts").inner_text(),
            )
            page.evaluate(
                "__pads[0].buttons[8].pressed=true;__pads[0].buttons[9].pressed=true"
            )
            page.wait_for_timeout(180)
            check(
                "Create + Options reserved for Hub",
                page.evaluate("__PUCK__.modal") is None,
            )
            page.evaluate(
                "__pads[0].buttons[8].pressed=false;__pads[0].buttons[9].pressed=false"
            )
            page.wait_for_timeout(100)
            page.evaluate("__pads[0].buttons[9].pressed=true")
            page.wait_for_function('__PUCK__.modal==="pause"')
            check("Options opens pause", page.evaluate("__PUCK__.modal") == "pause")
            page.evaluate(
                '__pads[0].buttons[9].pressed=false;__PUCK__.action("resume")'
            )
            isolate(page)
            page.evaluate("__PUCK__.game.givePuck(0);__pads[0].buttons[7].pressed=true")
            page.wait_for_function("__PUCK__.game.players[0].charge>.3")
            check(
                "R2 charges shot",
                page.evaluate("__PUCK__.game.players[0].charge") > 0.2,
            )
            page.evaluate("__pads[0].buttons[7].pressed=false")
            page.wait_for_function("__PUCK__.game.stats.shots[0]>0")
            check(
                "R2 release shoots", page.evaluate("__PUCK__.game.stats.shots[0]") == 1
            )
            page.evaluate('__PUCK__.audio.event({type:"goal",team:0})')
            page.wait_for_timeout(180)
            sound = page.evaluate(
                """()=>{const a=__PUCK__.audio,b=new Uint8Array(a.analyser.fftSize);a.analyser.getByteTimeDomainData(b);return{state:a.ctx.state,level:Math.max(...b)-Math.min(...b),voices:a.voiceCount,volume:a.music.gain.value}}"""
            )
            check(
                "synthesized sound has signal",
                sound["state"] == "running" and sound["level"] > 0,
                str(sound),
            )
            check("gibberish voices generated", sound["voices"] > 0)
            check("music bus remains ten percent", abs(sound["volume"] - 0.1) < 0.001)
            page.evaluate(
                '__pads.forEach(p=>p.connected=false);__PUCK__.start({players:2});__PUCK__.game.phase="play"'
            )
            old = page.evaluate(
                "[__PUCK__.game.players[0].z,__PUCK__.game.players[2].z]"
            )
            page.keyboard.down("w")
            page.keyboard.down("i")
            page.wait_for_function(
                "a=>__PUCK__.game.players[0].z<a[0]-1.5&&__PUCK__.game.players[2].z<a[1]-1.5",
                arg=old,
            )
            page.keyboard.up("w")
            page.keyboard.up("i")
            new = page.evaluate(
                "[__PUCK__.game.players[0].z,__PUCK__.game.players[2].z]"
            )
            check(
                "two keyboard players move independently",
                all(new[i] < old[i] - 1 for i in range(2)),
                str((old, new)),
            )
            page.evaluate(
                '__pads.forEach((p,i)=>{p.connected=true;p.axes[0]=i%2?-.7:.7});__PUCK__.start({players:4});__PUCK__.game.phase="play"'
            )
            old = page.evaluate("__PUCK__.game.players.slice(0,4).map(p=>p.x)")
            page.wait_for_function(
                "a=>__PUCK__.game.players.slice(0,4).every((p,i)=>Math.abs(p.x-a[i])>1)",
                arg=old,
            )
            new = page.evaluate("__PUCK__.game.players.slice(0,4).map(p=>p.x)")
            check(
                "four controller seats move",
                all(abs(new[i] - old[i]) > 0.5 for i in range(4)),
                str((old, new)),
            )
            page.evaluate(
                "__pads.forEach(p=>{p.connected=false;p.axes[0]=0});__PUCK__.title()"
            )
            page.wait_for_function('__PUCK__.screen==="attract"', timeout=18000)
            check(
                "attract starts after idle",
                page.evaluate("__PUCK__.game.attract") is True,
            )
            page.mouse.wheel(0, 120)
            page.wait_for_function('__PUCK__.screen==="title"')
            check(
                "any input exits attract", page.evaluate("__PUCK__.screen") == "title"
            )
            page.evaluate(
                '__PUCK__.start();const g=__PUCK__.game;g.phase="play";g.tune.periodLength=.2;g.remaining=.2;g.score=[3,0];__PUCK__.step(1000,{0:{}})'
            )
            check(
                "complete match reaches results screen",
                page.evaluate("__PUCK__.modal") == "result",
            )
            check(
                "results display winner and stats",
                "NORTH STARS TAKE THE CUP"
                in page.locator("#panel-content").inner_text(),
            )
    except Exception as e:
        check("desktop browser suite", False, str(e))
    finally:
        check("desktop runtime errors", not errors, "; ".join(errors[:8]))
        reports["browserConsole"] = messages
        context.close()

    mobile = browser.new_context(
        **{**p.devices["Pixel 7"], **({"device_scale_factor": 1} if VISUAL else {})}
    )
    if VISUAL:
        mobile.add_init_script(
            "const nativeRaf=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>setTimeout(()=>nativeRaf(f),200)"
        )
    phone = mobile.new_page()
    mobile_errors = []
    phone.on("pageerror", lambda e: mobile_errors.append(str(e)))
    try:
        phone.goto(URL, wait_until="load", timeout=90000)
        ready(phone)
        if VISUAL:
            phone.evaluate('__PUCK__.start();__PUCK__.controls.activity("touch",true)')
        else:
            phone.locator('#title-screen [data-action="play"]').tap()
        phone.wait_for_function('__PUCK__.game.phase==="play"', timeout=20000)
        phone.evaluate("__PUCK__.game.givePuck(__PUCK__.game.seats[0].index)")
        phone.locator("#touch-action").wait_for(state="visible")
        check(
            "touch layout detected", phone.evaluate("__PUCK__.controls.last") == "touch"
        )
        check("touch action is contextual", phone.locator("#touch-action").is_visible())
        check(
            "desktop prompts hidden on touch",
            not phone.locator("#game-prompts").is_visible(),
        )
        if VISUAL:
            phone.screenshot(path=str(ROOT / "phone.png"))
        if not VISUAL:
            isolate(phone)
            cdp = mobile.new_cdp_session(phone)
            old = phone.evaluate(
                "[__PUCK__.game.players[0].x,__PUCK__.game.players[0].z]"
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 70, "y": 650, "id": 1}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 150, "y": 620, "id": 1}]},
            )
            phone.wait_for_timeout(500)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            new = phone.evaluate(
                "[__PUCK__.game.players[0].x,__PUCK__.game.players[0].z]"
            )
            check(
                "invisible touch stick moves player",
                sum((new[i] - old[i]) ** 2 for i in range(2)) > 1,
                str((old, new)),
            )
            check(
                "touch release clears stick",
                phone.evaluate(
                    "Math.abs(__PUCK__.controls.touch.x)+Math.abs(__PUCK__.controls.touch.z)"
                )
                == 0,
            )
            phone.evaluate("__PUCK__.game.givePuck(__PUCK__.game.seats[0].index)")
            phone.locator("#touch-action").wait_for(state="visible")
            box = phone.locator("#touch-action").bounding_box()
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {
                            "x": box["x"] + box["width"] / 2,
                            "y": box["y"] + box["height"] / 2,
                            "id": 2,
                        }
                    ],
                },
            )
            phone.wait_for_timeout(400)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            phone.wait_for_function("__PUCK__.game.stats.shots[0]>0")
            check(
                "touch hold and release shoots",
                phone.evaluate("__PUCK__.game.stats.shots[0]") > 0,
            )
            phone.locator('[data-action="pause"]').tap()
            phone.wait_for_function('__PUCK__.modal==="pause"')
            check("touch menu opens pause", phone.evaluate("__PUCK__.modal") == "pause")
            phone.locator('[data-action="resume"]').tap()
            check("touch resumes", phone.evaluate("__PUCK__.modal") is None)
    except Exception as e:
        check("touch browser suite", False, str(e))
    finally:
        check("touch runtime errors", not mobile_errors, "; ".join(mobile_errors[:8]))
        mobile.close()

    if not VISUAL:
        fc = browser.new_context()
        fp = fc.new_page()
        try:
            fp.goto((ROOT.parent / (project["name"] + ".html")).as_uri(), timeout=90000)
            ready(fp)
            check(
                "single HTML boots from file URL",
                fp.evaluate("__PUCK__.screen") == "title",
            )
        except Exception as e:
            check("file URL boot", False, str(e))
        finally:
            fc.close()
        for players, scenario, stress in [
            (2, "standard", False),
            (4, "standard", True),
            (4, "host-leave", True),
            (2, "server", False),
        ]:
            hc = browser.new_context(viewport={"width": 1280, "height": 900})
            hp = hc.new_page()
            name = f"hub-{players}-{scenario}"
            params = {
                "game": "../../" + project["name"] + ".html",
                "players": players,
                "auto": 1,
                "limit": 20,
                "play": 5000,
                "scenario": scenario,
            }
            if stress:
                params.update(latency=150, jitter=50, loss=5)
            try:
                hp.goto(
                    f"{base}/{project['name']}/vendor/harness.html?"
                    + urllib.parse.urlencode(params),
                    timeout=90000,
                )
                hp.wait_for_function("window.__hubCheck?.done", timeout=120000)
                report = hp.evaluate("window.__hubCheck")
                reports[name] = report
                for c in report["checks"]:
                    check(name + ": " + c["name"], c["pass"], c["detail"])
                check(name + ": overall conformance", report["pass"])
                ended = hp.evaluate(
                    """()=>Array.from(document.querySelectorAll('iframe')).map(f=>f.contentWindow?.__PUCK__).filter(Boolean).every(g=>g.audio.ended&&g.network.hubEnded)"""
                )
                check(name + ": sound and input stop at end", ended)
            except Exception as e:
                check(name, False, str(e))
            finally:
                hc.close()
    browser.close()
server.shutdown()
server.server_close()
reports["summary"] = {
    "checks": count,
    "passed": count - len(failures),
    "failures": failures,
    "visualBackend": "WebGL compatibility" if VISUAL else "WebGPU",
}
(ROOT / ("visual-results.json" if VISUAL else "test-results.json")).write_text(
    json.dumps(reports, indent=2)
)
for failure in failures:
    print("FAIL " + failure)
print(f"{count - len(failures)}/{count} checks passed")
sys.exit(bool(failures))
