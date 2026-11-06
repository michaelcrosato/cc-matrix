#!/home/micha/.local/share/pipx/venvs/playwright/bin/python
"""Pier Pressure integration checks. Prints failures and one summary line."""

from __future__ import annotations

import contextlib
import hashlib
import http.server
import json
import re
import subprocess
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
INFO = json.loads((HERE / "build-info.json").read_text())
GAME_FILE = (
    HERE / "dev.html" if "--dev" in sys.argv else ROOT / (INFO["folder"] + ".html")
)
GAME_URL_PATH = GAME_FILE.relative_to(ROOT).as_posix()
FAILURES: list[str] = []
CHECKS = 0
EVIDENCE = {}
ALL_CHECKS = []


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_):
        pass


@contextlib.contextmanager
def serve():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def check(name, condition, detail=""):
    global CHECKS
    CHECKS += 1
    ALL_CHECKS.append({"name": name, "passed": bool(condition)})
    if not condition:
        FAILURES.append(f"{name}: {detail or 'assertion failed'}")


def scenario(name, run):
    try:
        run()
    except Exception as exc:  # noqa: BLE001 - report a scenario failure and continue the suite
        check(name, False, f"{type(exc).__name__}: {exc}")


def network_checks(browser, base):
    """Exercise the standalone transport independently of rendering/physics."""
    context = browser.new_context()
    host = context.new_page()
    guest = context.new_page()
    net_url = f"{base}/{INFO['folder']}/net.js"
    for page in (host, guest):
        page.goto(base + "/" + INFO["folder"] + "/build-info.json")
        page.evaluate(
            """async url => {
          const {Network} = await import(url);
          window.events = { inputs:[], states:[], results:[], disconnected:0 };
          window.net = new Network({
            onInput:(input,seat)=>events.inputs.push({input,seat}),
            onState:state=>events.states.push(state),
            onResult:(score,won)=>events.results.push({score,won}),
            onDisconnect:()=>events.disconnected++
          });
          await net.init();
        }""",
            net_url,
        )
    room = host.evaluate("net.hostLocal('QATEST')")
    guest.evaluate("code=>net.joinLocal(code)", room)
    host.wait_for_function("net.connected")
    guest.wait_for_function("net.connected")
    check(
        "local co-op role/seat",
        host.evaluate("net.isHost && net.localSeat===0")
        and guest.evaluate("net.isGuest && net.localSeat===1"),
    )
    guest.evaluate("net.tick(.2,{aim:.4,fire:true,burst:false},null)")
    host.wait_for_function("events.inputs.length===1")
    incoming = host.evaluate("events.inputs[0]")
    check(
        "guest input delivered",
        incoming["seat"] == 1
        and incoming["input"]["fire"]
        and incoming["input"]["aim"] == 0.4,
    )
    host.evaluate("net.tick(.2,{}, {score:123,wave:2,health:4})")
    guest.wait_for_function("events.states.length===1")
    check(
        "host snapshot delivered",
        guest.evaluate("events.states[0].score===123 && events.states[0].wave===2"),
    )
    guest.evaluate(
        "net._send({protocol:'pier-pressure-1',kind:'state',seq:99,state:{score:999999}})"
    )
    host.wait_for_timeout(80)
    check(
        "host rejects guest world authority", host.evaluate("events.states.length===0")
    )
    host.evaluate("net.finish(123,true,{hits:3})")
    guest.wait_for_function("events.results.length===1")
    check(
        "co-op result delivered",
        guest.evaluate("events.results[0].score===123 && events.results[0].won"),
    )
    guest.evaluate("net.leave()")
    host.wait_for_function("!net.connected")
    check(
        "disconnect clears session",
        host.evaluate("events.disconnected===1 && !net.connected"),
    )
    host.evaluate("net.leave()")
    offer = host.evaluate("net.hostRoom()")
    answer = guest.evaluate("offer=>net.joinRoom(offer)", offer)
    host.evaluate("answer=>net.acceptAnswer(answer)", answer)
    host.wait_for_function("net.connected", timeout=20000)
    guest.wait_for_function("net.connected", timeout=20000)
    check(
        "WebRTC token negotiation",
        offer.startswith("PP1.") and answer.startswith("PP1."),
    )
    host.evaluate("events.states=[]; events.inputs=[]")
    guest.evaluate("events.states=[]; events.inputs=[]")
    guest.evaluate("net.tick(.2,{angle:1.1,fire:true},null)")
    host.wait_for_function("events.inputs.length>0")
    check(
        "WebRTC input delivered",
        host.evaluate(
            "events.inputs[0].input.angle===1.1 && events.inputs[0].seat===1"
        ),
    )
    host.evaluate("net.tick(.2,{}, {score:321,wave:3})")
    guest.wait_for_function("events.states.length>0")
    check("WebRTC snapshot delivered", guest.evaluate("events.states[0].score===321"))
    host.evaluate("net.leave()")
    guest.wait_for_function("!net.connected")
    check("WebRTC disconnect", guest.evaluate("!net.connected"))
    guest.evaluate("net.leave()")
    context.close()


def scene_checks(browser, base):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(base + "/" + INFO["folder"] + "/build-info.json")
    result = page.evaluate(
        """async ({base,folder}) => {
      document.body.innerHTML='<canvas id="test-scene"></canvas>';
      const map=document.createElement('script');map.type='importmap';
      map.textContent=JSON.stringify({imports:{
        'three/webgpu':`${base}/${folder}/vendor/three.webgpu.js`,
        'three/tsl':`${base}/${folder}/vendor/three.tsl.js`,
        'three':`${base}/${folder}/vendor/three.webgpu.js`
      }});document.head.append(map);
      const {Coast}=await import(`${base}/${folder}/scene.js`);
      const coast=new Coast(document.querySelector('canvas'));await coast.init();
      const target=coast.makeTarget('plane',1);target.position.set(0,15,0);
      coast.update(.1);coast.render();await new Promise(r=>setTimeout(r,300));
      return {backend:coast.backend,objects:coast.scene.children.length,webgpu:!!navigator.gpu,
        camera:coast.camera.isOrthographicCamera};
    }""",
        {"base": base, "folder": INFO["folder"]},
    )
    check(
        "WebGPU scene initializes",
        result["backend"] == "WebGPU" and result["webgpu"],
        str(result),
    )
    check(
        "procedural scene and side camera",
        result["objects"] > 100 and result["camera"],
        str(result),
    )
    check("scene has no runtime errors", not errors, " | ".join(errors))
    context.close()


def audio_checks(page):
    result = page.evaluate("""async () => {
      const ctx = new OfflineAudioContext(1,44100,44100);
      const sound = new __Sound({context:ctx});
      const unlocked = await sound.unlock();
      sound.update(.1,true,.8); sound.shot(); sound.hit('ship'); sound.splash(); sound.hurt(); sound.voice();
      const buffer = await ctx.startRendering();
      const samples = buffer.getChannelData(0);
      let sum=0,peak=0; for(const x of samples) {sum+=x*x;peak=Math.max(peak,Math.abs(x));}
      return {unlocked,volume:sound.musicVolume,bus:sound.musicBus.gain.value,
        rms:Math.sqrt(sum/samples.length),peak,stats:sound.stats};
    }""")
    check("audio unlock", result["unlocked"])
    check(
        "music defaults to ten percent",
        result["volume"] == 0.1 and abs(result["bus"] - 0.1) < 1e-5,
    )
    check(
        "procedural audio produces samples",
        result["rms"] > 0.001 and result["peak"] > 0.02,
        str(result),
    )
    EVIDENCE["offlineAudio"] = result
    check("procedural audio avoids clipping", result["peak"] <= 1)
    check(
        "effects music gibberish generated",
        result["stats"]["effects"] >= 4
        and result["stats"]["notes"] > 0
        and result["stats"]["voices"] > 0,
    )


PAD_SCRIPT = """
window.__testPad={id:'DualSense test pad',index:0,connected:true,mapping:'standard',timestamp:1,
 axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};
window.__padConnected=false;
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__padConnected?[window.__testPad]:[]});
"""


def pad_button(page, index, pressed=True):
    page.evaluate(
        """([i,p])=>{__padConnected=true; __testPad.buttons[i]={pressed:p,touched:p,value:p?1:0};__testPad.timestamp=performance.now();window.__game?.advance(1/60);}""",
        [index, pressed],
    )
    page.wait_for_timeout(160)


def open_game(browser, base, **options):
    context = browser.new_context(**options)
    context.add_init_script(PAD_SCRIPT)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    EVIDENCE.setdefault(
        "artifactSha256", hashlib.sha256(GAME_FILE.read_bytes()).hexdigest()
    )
    page.goto(f"{base}/{GAME_URL_PATH}", wait_until="domcontentloaded")
    page.wait_for_function("window.__game?.state().ready", timeout=60000)
    check(
        "page is Pier Pressure", page.title().startswith("Pier Pressure"), page.title()
    )
    return context, page, errors


def cadence_checks(browser, base):
    context, page, errors = open_game(
        browser, base, viewport={"width": 1280, "height": 720}
    )
    records = []
    for cadence in [0.01, 0.02, 0.033]:
        result = page.evaluate(
            """delta=>{
          __game.start('solo');__game.dev({wind:0});
          __game.setInput({angle:Math.PI/2,fire:true,salvo:false});
          const before=__game.state().physicsSteps;__game.advance(1,delta);
          const state=__game.state();const ys=__game.entities().filter(e=>e.type==='shot').map(e=>e.y);
          return {cadence:delta,steps:state.physicsSteps-before,time:state.time,maxY:Math.max(...ys)};
        }""",
            cadence,
        )
        records.append(result)
        check(
            f"fixed physics at {cadence}s frame cadence",
            result["steps"] == 60 and abs(result["time"] - 1) < 0.0001,
            str(result),
        )
    EVIDENCE["frameCadence"] = records
    heights = [r["maxY"] for r in records]
    check(
        "projectile motion independent of frame cadence",
        min(heights) > 20 and max(heights) - min(heights) < 0.02,
        str(records),
    )
    check("cadence simulation has no runtime errors", not errors, " | ".join(errors))
    context.close()


def aim_checks(page):
    for name, x, y, low, high in [
        ("horizontal left", -1, 0, 3.0, 3.1),
        ("diagonal left up", -0.7, -0.7, 2.2, 2.5),
        ("horizontal right", 1, 0, 0.1, 0.2),
    ]:
        angle = page.evaluate(
            """([x,y])=>{__testPad.axes[0]=x;__testPad.axes[1]=y;__game.advance(.02);return __game.state().angles[0]}""",
            [x, y],
        )
        check("controller aim " + name, low <= angle <= high, str(angle))
    page.evaluate("__testPad.axes[0]=0;__testPad.axes[1]=0")


def controller_checks(browser, base):
    context, page, _errors = open_game(
        browser, base, viewport={"width": 1280, "height": 720}
    )
    page.evaluate("document.activeElement?.blur()")
    pad_button(page, 0)
    pad_button(page, 0, False)
    result = page.evaluate("({state:__game.state(),focus:document.activeElement?.id})")
    check(
        "fresh first-pad confirm", result["state"]["screen"] == "playing", str(result)
    )
    aim_checks(page)
    context.close()


def game_checks(browser, base):
    context, page, errors = open_game(
        browser, base, viewport={"width": 1280, "height": 720}
    )
    state = page.evaluate("__game.state()")
    check("game starts at title", state["screen"] == "title")
    check("game uses WebGPU", state["backend"] == "WebGPU", str(state))
    check("game music default", state["musicVolume"] == 0.1)
    page.evaluate("__game.advance(10.1)")
    check(
        "ten second title attract",
        page.evaluate(
            "__game.state().mode==='demo' && __game.state().screen==='playing'"
        ),
    )
    page.evaluate("__game.advance(12)")
    check(
        "attract AI fires",
        page.evaluate("__game.state().shotsFired>0 && __game.state().physicsSteps>0"),
    )
    page.keyboard.press("Space")
    check(
        "first input exits attract",
        page.evaluate(
            "__game.state().screen==='title' && __game.state().mode==='solo'"
        ),
    )
    page.keyboard.press("Enter")
    check(
        "keyboard starts game",
        page.evaluate(
            "__game.state().screen==='playing' && __game.state().mode==='solo'"
        ),
    )
    before = page.evaluate("__game.state().shotsFired")
    page.keyboard.down("Space")
    page.evaluate("__game.advance(.8)")
    page.keyboard.up("Space")
    check(
        "keyboard fires native shells",
        page.evaluate("__game.state().shotsFired") >= before + 2,
    )
    before = page.evaluate("__game.state().shotsFired")
    page.keyboard.down("e")
    page.evaluate("__game.advance(.1)")
    page.keyboard.up("e")
    check(
        "special broadside spends charge",
        page.evaluate("__game.state().shotsFired") >= before + 7
        and page.evaluate("__game.state().energy[0]") < 5,
    )
    page.keyboard.press("Escape")
    check("keyboard pause", page.evaluate("__game.state().screen==='pause'"))
    before = page.evaluate("__game.state().physicsSteps")
    page.evaluate("__game.advance(3)")
    check(
        "pause freezes physics", page.evaluate("__game.state().physicsSteps") == before
    )
    page.locator("#dev").click()
    check("dev reachable from pause", page.evaluate("__game.state().screen==='dev'"))
    check(
        "live balance sliders", page.locator("#sliders input[type=range]").count() == 8
    )
    page.locator("#tune-speed").focus()
    page.locator("#tune-speed").press("ArrowRight")
    check(
        "live slider changes balance",
        page.evaluate("__game.state().tuning.speed") == 29.5,
    )
    page.locator("#resetTuning").click()
    check(
        "reset default balance",
        page.evaluate(
            "__game.state().tuning.speed===29 && __game.state().tuning.damage===1"
        ),
    )
    page.keyboard.press("Escape")
    page.locator("#resume").click()
    check("resume gameplay", page.evaluate("__game.state().screen==='playing'"))
    page.evaluate("__game.start('coop')")
    page.keyboard.down("Enter")
    page.evaluate("__game.advance(.8)")
    page.keyboard.up("Enter")
    check(
        "second local keyboard gunner",
        page.evaluate("__game.state().mode==='coop' && __game.state().shotsFired>=2"),
    )
    page.evaluate("__game.start('solo');__game.setAutoplay(true)")
    waves = {0}
    for _ in range(35):
        page.evaluate("__game.advance(8)")
        state = page.evaluate("__game.state()")
        waves.add(state["wave"])
        if state["screen"] == "results":
            break
    EVIDENCE["playthrough"] = {"waves": sorted(waves), "final": state}
    check("scripted circuit covers all operations", waves == {0, 1, 2}, str(state))
    check(
        "scripted circuit wins through physics hits",
        state["screen"] == "results"
        and state["won"]
        and state["hits"] >= 24
        and state["kills"] >= 19,
        str(state),
    )
    page.locator("#retry").click()
    check(
        "victory retry",
        page.evaluate("__game.state().screen==='playing' && __game.state().health===7"),
    )
    page.evaluate("__game.setAutoplay(false);__game.dev({health:1});__game.damage()")
    check(
        "defeat produces results",
        page.evaluate("__game.state().screen==='results' && !__game.state().won"),
    )
    page.locator("#retry").click()
    check(
        "defeat retry",
        page.evaluate("__game.state().screen==='playing' && __game.state().health===7"),
    )
    page.evaluate("__game.goto('title')")
    page.locator("#settings").click()
    page.locator("#glyph").select_option("xbox")
    page.locator("#music").evaluate(
        "el=>{el.value=25;el.dispatchEvent(new Event('input',{bubbles:true}))}"
    )
    check(
        "settings music and glyphs live",
        page.evaluate(
            "__game.state().glyph==='xbox' && __game.state().musicVolume===.25"
        ),
    )
    page.locator("#music").evaluate(
        "el=>{el.value=10;el.dispatchEvent(new Event('input',{bubbles:true}))}"
    )
    page.keyboard.press("Escape")
    page.wait_for_function("__game.state().screen==='title'")
    page.mouse.move(1270, 710)
    page.wait_for_timeout(100)
    page.evaluate("document.activeElement?.blur()")
    pad_button(page, 0)
    pad_button(page, 0, False)
    check(
        "first controller confirm focuses menu",
        page.evaluate("__game.state().screen==='playing'"),
        str(page.evaluate("({state:__game.state(),focus:document.activeElement?.id})")),
    )
    page.evaluate("__game.goto('title')")
    page.wait_for_timeout(80)
    before = page.evaluate("document.activeElement?.id")
    pad_button(page, 13)
    pad_button(page, 13, False)
    after = page.evaluate("document.activeElement?.id")
    check(
        "controller focus navigation",
        before != after and bool(after),
        f"{before} -> {after}",
    )
    check(
        "controller last input prompts",
        page.evaluate(
            "__game.state().inputMode==='gamepad' && [...document.querySelectorAll('[data-prompt=confirm]')].some(x=>x.textContent==='A')"
        ),
    )
    pad_button(page, 0)
    pad_button(page, 0, False)
    check(
        "controller confirms menu", page.evaluate("__game.state().screen==='playing'")
    )
    aim_checks(page)
    before = page.evaluate("__game.state().shotsFired")
    pad_button(page, 7)
    page.evaluate("__game.advance(.8)")
    pad_button(page, 7, False)
    check(
        "controller trigger fires", page.evaluate("__game.state().shotsFired") > before
    )
    pad_button(page, 9)
    pad_button(page, 9, False)
    check("controller options pauses", page.evaluate("__game.state().screen==='pause'"))
    page.keyboard.press("Escape")
    check(
        "keyboard restores native prompts",
        page.evaluate("__game.state().inputMode==='keyboard'"),
    )
    page.evaluate("__game.goto('title')")
    page.locator("#about").click()
    text = page.locator(".panel:not([hidden])").inner_text()
    check(
        "credits source and usage",
        "Air-Sea Battle" in text and "added on import" in text,
    )
    check(
        "credits feedback sections",
        all(
            x in text.lower()
            for x in [
                "source information",
                "testing feedback",
                "engine feedback",
                "prompt feedback",
            ]
        ),
    )
    scroll_before = page.evaluate(
        "document.querySelector('[data-panel=about] .menuInner').scrollTop"
    )
    page.evaluate("__testPad.axes[3]=.9;__game.advance(.7);__testPad.axes[3]=0")
    check(
        "controller right stick scrolls credits",
        page.evaluate(
            "document.querySelector('[data-panel=about] .menuInner').scrollTop"
        )
        > scroll_before + 20,
    )
    scenario("offline procedural audio", lambda: audio_checks(page))
    check("game has no runtime errors", not errors, " | ".join(errors))
    context.close()


def touch_checks(browser, base):
    context, page, errors = open_game(
        browser,
        base,
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    title_rect = page.evaluate(
        """()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('h1 .outline'));const b=r.getBoundingClientRect();return {left:b.left,right:b.right,width:innerWidth}}"""
    )
    check(
        "phone title fits viewport",
        title_rect["left"] >= 0 and title_rect["right"] <= title_rect["width"] + 2,
        str(title_rect),
    )
    page.locator("#start").tap()
    check(
        "touch starts same game",
        page.evaluate(
            "__game.state().screen==='playing' && __game.state().inputMode==='touch'"
        ),
    )
    session = context.new_cdp_session(page)
    page.evaluate(
        """()=>{window.__touchEvents=[]; for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>__touchEvents.push({type,id:e.pointerId,pointer:e.pointerType,target:e.target.id}),true)}"""
    )
    point = {"x": 270, "y": 300, "id": 1}
    session.send(
        "Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [point]}
    )
    before = page.evaluate("__game.state().shotsFired")
    page.evaluate("__game.advance(.7)")
    check(
        "held touch fires with assist",
        page.evaluate("__game.state().shotsFired") > before,
    )
    rect = page.locator("#salvoTouch").bounding_box()
    check(
        "touch contextual salvo reachable",
        bool(rect) and page.locator("#salvoTouch").is_visible(),
    )
    if rect:
        second = {
            "x": rect["x"] + rect["width"] * 0.5,
            "y": rect["y"] + rect["height"] * 0.5,
            "id": 2,
        }
        session.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [point, second]},
        )
        session.send(
            "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": [second]}
        )
        before = page.evaluate("__game.state().shotsFired")
        page.evaluate("__game.advance(.7)")
        check(
            "second touch release preserves aim contact",
            page.evaluate("__game.state().shotsFired") > before,
            str(
                {
                    "before": before,
                    "state": page.evaluate("__game.state()"),
                    "events": page.evaluate("__touchEvents"),
                }
            ),
        )
    session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    page.locator("#pause").tap()
    check("touch pause reachable", page.evaluate("__game.state().screen==='pause'"))
    page.locator("#resume").tap()
    page.keyboard.press("ArrowLeft")
    check(
        "touch to keyboard hides contextual button",
        page.locator("#salvoTouch").is_hidden(),
    )
    page.touchscreen.tap(270, 300)
    check(
        "keyboard to touch reveals contextual button",
        page.locator("#salvoTouch").is_visible(),
    )
    check(
        "touch viewport no horizontal overflow",
        page.evaluate("document.documentElement.scrollWidth<=innerWidth"),
    )
    check("touch has no runtime errors", not errors, " | ".join(errors))
    context.close()


def game_network_checks(browser, base):
    context, host, errors = open_game(
        browser, base, viewport={"width": 960, "height": 540}
    )
    guest = context.new_page()
    guest.goto(f"{base}/{GAME_URL_PATH}", wait_until="domcontentloaded")
    guest.wait_for_function("window.__game?.state().ready", timeout=60000)
    code = host.evaluate("__game.net.hostLocal('QAGAME')")
    guest.evaluate("code=>__game.net.joinLocal(code)", code)
    host.wait_for_function("__game.state().mode==='online' && __game.net.connected")
    guest.wait_for_function("__game.state().mode==='online' && __game.net.connected")
    host.evaluate("__game.dev({damage:0})")
    guest.evaluate(
        "__game.setInput({angle:2.2,fire:true,salvo:false});__game.advance(.3)"
    )
    host.wait_for_timeout(150)
    host.evaluate("__game.advance(3)")
    guest.wait_for_function("__game.state().shotsFired>0")
    check("co-op guest controls real gun", host.evaluate("__game.state().shotsFired>0"))
    check(
        "co-op guest sees host world",
        guest.evaluate("__game.state().shotsFired>0 && __game.state().time>1"),
    )
    check(
        "co-op sends both directions",
        host.evaluate("__game.net.stats.sent>0 && __game.net.stats.received>0")
        and guest.evaluate("__game.net.stats.sent>0 && __game.net.stats.received>0"),
    )
    guest.evaluate("__game.setInput(null)")
    before = host.evaluate("__game.state().shotsFired")
    guest.mouse.click(700, 300, button="right")
    guest.evaluate("__game.advance(.2)")
    host.wait_for_function("__game.state().energy[1]<20", timeout=5000)
    check(
        "guest native broadside reaches host",
        host.evaluate("__game.state().shotsFired") >= before + 7,
    )
    guest.wait_for_function("__game.state().energy[1]<20", timeout=5000)
    check(
        "guest broadside charge is synchronized",
        guest.evaluate(
            "!document.querySelector('#salvoText').textContent.includes('READY')"
        ),
    )
    guest.evaluate(
        "__game.setInput({angle:2.2,fire:true,salvo:false});__game.advance(.12)"
    )
    host.wait_for_timeout(150)
    host.evaluate("__game.advance(.4)")
    guest.evaluate("__game.pause()")
    host.wait_for_timeout(180)
    before = host.evaluate("__game.state().shotsFired")
    host.evaluate("__game.advance(.8)")
    check(
        "guest pause sends neutral input",
        host.evaluate("__game.state().shotsFired") == before,
    )
    guest.locator("#pauseSettings").click()
    host.evaluate("__game.advance(.2)")
    guest.wait_for_timeout(120)
    check(
        "guest settings survive host snapshots",
        guest.evaluate("__game.state().screen==='settings'"),
    )
    guest.keyboard.press("Escape")
    guest.locator("#pauseAbout").click()
    host.evaluate("__game.advance(.2)")
    guest.wait_for_timeout(120)
    check(
        "guest credits survive host snapshots",
        guest.evaluate("__game.state().screen==='about'"),
    )
    guest.keyboard.press("Escape")
    guest.evaluate("__game.pause();__game.setInput(null);__game.net.leave()")
    host.wait_for_function("__game.state().mode==='solo'")
    check(
        "co-op disconnect continues solo",
        host.evaluate(
            "__game.state().screen==='playing' && __game.state().mode==='solo'"
        ),
    )
    code = host.evaluate("__game.net.hostLocal('QAREJOIN')")
    guest.evaluate("code=>__game.net.joinLocal(code)", code)
    host.wait_for_function("__game.net.connected")
    guest.wait_for_function("__game.net.connected")
    host.evaluate("__game.net.leave()")
    guest.wait_for_function("__game.state().screen==='results'")
    check(
        "host disconnect ends guest watch",
        guest.evaluate(
            "!__game.state().won && document.querySelector('#resultTitle').textContent==='RADIO LINK LOST'"
        ),
    )
    before = guest.evaluate("__game.state().physicsSteps")
    guest.evaluate("__game.advance(1)")
    check(
        "disconnected guest world stops",
        guest.evaluate("__game.state().physicsSteps") == before,
    )
    guest.locator("#retry").click()
    check(
        "disconnected guest retries as solo host",
        guest.evaluate(
            "__game.state().mode==='solo' && __game.net.isHost && !__game.net.connected"
        ),
    )
    check("co-op game has no runtime errors", not errors, " | ".join(errors))
    context.close()


def deployment_checks(browser, base):
    for label, url, expected in [
        ("single file", GAME_FILE.as_uri(), "WebGPU"),
        ("WebGL fallback", f"{base}/{GAME_URL_PATH}?webgl=1", "WebGL"),
    ]:
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error, errors=errors: errors.append(str(error)))
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_function("window.__game?.state().ready", timeout=60000)
        check(
            label + " loads requested backend",
            expected in page.evaluate("__game.state().backend"),
        )
        page.locator("#start").click()
        page.keyboard.down("Space")
        page.evaluate("__game.advance(.6)")
        page.keyboard.up("Space")
        check(
            label + " plays with physics",
            page.evaluate(
                "__game.state().screen==='playing' && __game.state().shotsFired>=2 && __game.state().physicsSteps>0"
            ),
        )
        check(label + " has no runtime errors", not errors, " | ".join(errors))
        context.close()


def hub_harness_checks(browser, base):
    context = browser.new_context(viewport={"width": 1600, "height": 900})
    page = context.new_page()
    from urllib.parse import urlencode

    EVIDENCE["hubHarness"] = []
    for scenario_name, players in [("standard", 2), ("host-leave", 2), ("server", 1)]:
        params = urlencode(
            {
                "game": "/" + GAME_URL_PATH,
                "players": players,
                "scenario": scenario_name,
                "auto": 1,
                "play": 8000 if scenario_name == "server" else 2000,
                "latency": 30,
                "jitter": 5,
            }
        )
        page.goto(
            f"{base}/{INFO['folder']}/hub-contract/harness.html?{params}",
            wait_until="domcontentloaded",
        )
        if scenario_name == "server":
            page.wait_for_function(
                """()=>{const copies=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow);return copies.length===2&&copies.every(w=>w.__game?.state().screen==='playing'&&w.__game.net.running)}""",
                timeout=60000,
            )
            copies = page.frames[1:]
            server_frame = next(
                frame
                for frame in copies
                if frame.evaluate("!!window.__game?.net.server")
            )
            guest_frame = next(
                frame
                for frame in copies
                if frame.evaluate("!!window.__game?.net.isGuest")
            )
            before = server_frame.evaluate("__game.state().shotsFired")
            guest_frame.evaluate(
                "__game.setInput({angle:1.1,fire:true,salvo:false});__game.advance(.12)"
            )
            page.wait_for_timeout(140)
            server_frame.evaluate("__game.advance(.05)")
            server_frame.wait_for_function("__game.state().shotsFired>0", timeout=3000)
            check(
                "dedicated server player seat0 fires",
                server_frame.evaluate("__game.state().shotsFired") > before,
            )
            guest_frame.evaluate("__game.setInput(null)")
            guest_frame.locator("#game").click(
                button="right", position={"x": 200, "y": 200}
            )
            guest_frame.evaluate("__game.advance(.12)")
            server_frame.wait_for_function("__game.state().energy[0]<20", timeout=3000)
            check(
                "dedicated server seat0 native broadside",
                server_frame.evaluate(
                    "__game.state().energy[0]<20 && __game.state().energy[1]===100"
                ),
            )
            guest_frame.wait_for_function("__game.state().energy[0]<20", timeout=3000)
            check(
                "dedicated server guest HUD follows seat0",
                guest_frame.evaluate(
                    "parseFloat(document.querySelector('#energyFill').style.width)<20 && !document.querySelector('#salvoText').textContent.includes('READY')"
                ),
            )
        page.wait_for_function("window.__hubCheck?.done", timeout=90000)
        report = page.evaluate("window.__hubCheck")
        EVIDENCE["hubHarness"].append(report)
        for item in report["checks"]:
            check(
                "AI Hub " + scenario_name + ": " + item["name"],
                item["pass"],
                item.get("detail", ""),
            )
    context.close()


def visual_captures(browser, base):
    out = HERE / "screenshots"
    out.mkdir(exist_ok=True)
    for label, options in [
        ("desktop", {"viewport": {"width": 1920, "height": 1080}}),
        (
            "phone",
            {
                "viewport": {"width": 390, "height": 844},
                "is_mobile": True,
                "has_touch": True,
                "device_scale_factor": 1,
            },
        ),
    ]:
        context = browser.new_context(**options)
        page = context.new_page()
        page.goto(f"{base}/{GAME_URL_PATH}?webgl=1", wait_until="domcontentloaded")
        page.wait_for_function("window.__game?.state().ready", timeout=60000)
        page.wait_for_timeout(500)
        page.screenshot(path=str(out / f"final-{label}-title.png"))
        if label == "phone":
            page.locator("#start").tap()
        else:
            page.locator("#start").click()
        page.evaluate("__game.setAutoplay(true)")
        for _ in range(80):
            if page.evaluate("__game.state().wave") >= 2:
                break
            page.evaluate("__game.advance(1)")
        page.evaluate("__game.advance(3.4)")
        page.wait_for_timeout(150)
        page.screenshot(path=str(out / f"final-{label}-game.png"))
        context.close()


def report_checks():
    report = json.loads((ROOT / "exit-interview.json").read_text())
    expected = {
        "sourceInformation",
        "testingFeedback",
        "engineFeedback",
        "promptFeedback",
        "aiHub",
    }
    check("exit interview exact shape", set(report) == expected)
    fields = {
        "date",
        "source",
        "plan",
        "genre",
        "perspective",
        "tech",
        "artDirection",
        "animation",
        "audio",
        "online",
        "testing",
        "research",
        "environment",
        "model",
        "usage",
    }
    check(
        "source information fields",
        set(report["sourceInformation"]) == fields
        and all(isinstance(x, str) and x for x in report["sourceInformation"].values()),
    )
    check(
        "usage preserved for importer",
        report["sourceInformation"]["usage"] == "added on import",
    )
    for key, count in [
        ("testingFeedback", 4),
        ("engineFeedback", 6),
        ("promptFeedback", 4),
    ]:
        check(
            key + " answered",
            len(report[key]) == count
            and all(isinstance(x, str) and x for x in report[key]),
        )
    hub = report["aiHub"]
    check(
        "catalogue identity", hub["name"] == "Pier Pressure" and hub["type"] == "Game"
    )
    check(
        "catalogue tags",
        3 <= len(hub["tags"]) <= 6 and all(x == x.lower() for x in hub["tags"]),
    )
    selection = json.loads((HERE / "selection.json").read_text())
    check(
        "fifty-title random selection",
        selection["candidateCount"] == 50
        and 1 <= selection["index"] <= 50
        and selection["method"] == "secrets.randbelow",
    )


def contract_checks():
    global CHECKS
    result = subprocess.run(
        ["node", str(HERE / "hub-contract" / "net-test.mjs")],
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    if result.returncode:
        check("AI Hub mocked contract", False, (result.stdout + result.stderr).strip())
    else:
        found = re.search(r"(\d+) network checks passed", result.stdout)
        if found:
            CHECKS += int(found.group(1))
        else:
            check("AI Hub contract summary", False, result.stdout.strip())


def main():
    if all(
        flag not in sys.argv
        for flag in [
            "--touch-only",
            "--controller-only",
            "--game-only",
            "--cadence-only",
        ]
    ):
        scenario("AI Hub mocked contract", contract_checks)
    with serve() as base, sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        try:
            if "--cadence-only" in sys.argv:
                scenario("frame cadence", lambda: cadence_checks(browser, base))
            elif "--game-only" in sys.argv:
                scenario("gameplay", lambda: game_checks(browser, base))
            elif "--controller-only" in sys.argv:
                scenario("controller", lambda: controller_checks(browser, base))
            elif "--touch-only" in sys.argv:
                scenario("touch", lambda: touch_checks(browser, base))
            else:
                scenario("standalone network", lambda: network_checks(browser, base))
                scenario("WebGPU scene", lambda: scene_checks(browser, base))
                scenario("frame cadence", lambda: cadence_checks(browser, base))
                scenario("gameplay", lambda: game_checks(browser, base))
                scenario("touch", lambda: touch_checks(browser, base))
                scenario("game multiplayer", lambda: game_network_checks(browser, base))
                scenario("AI Hub harness", lambda: hub_harness_checks(browser, base))
                scenario("deployment", lambda: deployment_checks(browser, base))
                if "--screenshots" in sys.argv:
                    scenario("visual captures", lambda: visual_captures(browser, base))
        finally:
            browser.close()
    if (ROOT / "exit-interview.json").exists():
        scenario("exit interview", report_checks)
    if "artifactSha256" in EVIDENCE:
        check(
            "tested artifact stayed unchanged",
            EVIDENCE["artifactSha256"]
            == hashlib.sha256(GAME_FILE.read_bytes()).hexdigest(),
        )
    (HERE / "qa-results.json").write_text(
        json.dumps(
            {
                "game": str(GAME_FILE.relative_to(ROOT)),
                "checks": CHECKS,
                "failures": FAILURES,
                "results": ALL_CHECKS,
                "evidence": EVIDENCE,
            },
            indent=2,
        )
    )
    for message in FAILURES:
        print("FAIL " + message)
    print(f"{CHECKS} checks, {len(FAILURES)} failures")
    return bool(FAILURES)


if __name__ == "__main__":
    raise SystemExit(main())
