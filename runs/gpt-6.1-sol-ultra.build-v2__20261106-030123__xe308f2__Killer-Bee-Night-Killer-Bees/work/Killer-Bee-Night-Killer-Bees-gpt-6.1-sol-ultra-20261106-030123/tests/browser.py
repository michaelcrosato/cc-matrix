"""Packaged game integration checks using installed browser/device stand-ins."""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
PAD_STUB = """window.__pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});
window.__newPad=i=>({index:i,id:'DualSense standard test '+i,mapping:'standard',connected:true,
axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:0});
window.__button=(i,n,on)=>{let b=__pads[i].buttons[n];b.pressed=on;b.touched=on;b.value=on?1:0;};"""


class Checks:
    def __init__(self):
        self.items = []

    def check(self, passed, name, detail=None):
        self.items.append({"name": name, "pass": bool(passed), "detail": detail})

    def case(self, name, fn):
        try:
            fn()
        except Exception as error:
            self.check(False, name, str(error))


def ready(page, url):
    page.goto(url, wait_until="load")
    page.wait_for_function("!!window.__night", timeout=10000)
    page.evaluate("__night.game.o.loop=false;__night.game.stop();__night.step(.025)")


def step(page, seconds=.05, bot=False):
    return page.evaluate("([s,b])=>{__night.step(s,b);return __night.game.debug.snapshot()}", [seconds, bot])


def native_row(page, index):
    return page.evaluate("""i=>{const n=__night,g=n.game,s=g.screen,b=n.menu.rowAt(i),r=s.canvas.getBoundingClientRect();
      return {x:r.left+(s.OX+(b[0]+b[2]/2)*s.S)/s.dpr,y:r.top+(s.OY+(b[1]+b[3]/2)*s.S)/s.dpr};}""", index)


def key(page, value):
    page.keyboard.press(value)
    step(page)


def desktop(browser, name, url, checks):
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    errors = []
    audio_requests = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: audio_requests.append(request.url) if request.resource_type == "media" else None)
    ready(page, url)
    checks.check(page.evaluate("__night.game.sceneName==='title'&&__night.game.view.id==='overhead'"), f"{name}: packaged file opens in native overhead title")
    checks.check(page.evaluate("__night.game.settings.default('music')===.1&&__night.game.settings.glyphs==='playstation'"), f"{name}: initial native music/glyph defaults")
    point = native_row(page, 1)
    page.mouse.move(point["x"], point["y"])
    step(page)
    checks.check(page.evaluate("__night.menu.i===1"), f"{name}: pointer hover moves native menu focus")
    page.mouse.click(point["x"], point["y"])
    step(page)
    checks.check(page.evaluate("__night.game.sceneName==='choice'"), f"{name}: native pointer opens co-op choice")
    key(page, "Escape")
    checks.check(page.evaluate("__night.game.sceneName==='title'"), f"{name}: keyboard back returns to title")
    page.mouse.move(1, 1)
    step(page)
    page.evaluate("__night.menu.i=0")
    key(page, "Enter")
    checks.check(page.evaluate("__night.game.sceneName==='play'&&__night.world.players.length===1&&__night.world.players[0].charge"), f"{name}: confirm starts without spending held ray")
    start = page.evaluate("__night.world.players[0].x")
    page.keyboard.down("d")
    step(page, .4)
    page.keyboard.up("d")
    step(page)
    checks.check(page.evaluate("__night.world.players[0].x") > start + 20, f"{name}: real keyboard steers authoritative swarm")
    mouse_target = page.evaluate("""(()=>{const g=__night.game,p=__night.world.players[0],s=g.screen,r=s.canvas.getBoundingClientRect(),v=g.r.w(p.x+70,p.y,0);return{x:r.left+(s.OX+v[0]*s.S)/s.dpr,y:r.top+(s.OY+v[1]*s.S)/s.dpr};})()""")
    mouse_start = page.evaluate("__night.world.players[0].x")
    page.mouse.move(mouse_target["x"], mouse_target["y"])
    page.mouse.down(button="right")
    step(page, .2)
    page.mouse.up(button="right")
    step(page)
    checks.check(page.evaluate("__night.world.players[0].x") > mouse_start+10 and page.evaluate("__night.game.input.lastDevice==='mouse'"), f"{name}: held right mouse steers toward ground cursor and changes prompts")
    page.keyboard.down("Shift")
    step(page, .1)
    checks.check(page.evaluate("__night.world.players[0].focus&&__night.world.players[0].r<10"), f"{name}: held Focus compresses collision footprint")
    page.keyboard.up("Shift")
    step(page, .1)
    checks.check(page.evaluate("!__night.world.players[0].focus&&__night.world.players[0].r>10"), f"{name}: Focus release restores roam")
    key(page, "Space")
    checks.check(page.evaluate("!__night.world.players[0].charge&&__night.world.stats.ray===1"), f"{name}: keyboard ray is one press/one charge")
    key(page, "Escape")
    tick = page.evaluate("__night.world.tick")
    step(page, .5)
    checks.check(page.evaluate("__night.game.paused&&__night.game.shell.screen==='pause'&&__night.world.tick") == tick, f"{name}: native pause freezes standalone simulation")
    page.get_by_role("button", name="Settings", exact=True).click()
    slider = page.get_by_role("slider", name="Music", exact=True)
    slider.fill("0.25")
    slider.dispatch_event("input")
    checks.check(page.evaluate("__night.game.settings.music===.25&&__night.game.audio.musicVolume===.25"), f"{name}: native music slider drives actual bus")
    page.get_by_role("button", name="Controls", exact=True).click()
    page.get_by_role("button", name="Horizontal ray, keyboard:", exact=False).click()
    page.keyboard.press("r")
    step(page)
    checks.check(page.evaluate("__night.game.input.bindings.ray.keys[0]==='KeyR'&&__night.game.input.label('ray')==='R'"), f"{name}: native rebinding updates keyboard prompt")
    page.reload(wait_until="load")
    page.wait_for_function("!!window.__night")
    page.evaluate("__night.game.o.loop=false;__night.game.stop();__night.step(.025)")
    checks.check(page.evaluate("__night.game.settings.music===.25&&__night.game.input.bindings.ray.keys[0]==='KeyR'"), f"{name}: settings and binding survive packaged file reload")
    # Return to defaults so subsequent proof uses the documented Space control.
    page.evaluate("__night.game.settings.reset('Sound');__night.game.input.resetBindings();__night.start(1);__night.step(.05)")
    page.keyboard.down("d")
    step(page, .05)
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    step(page, .05)
    checks.check(page.evaluate("__night.game.input.held.size===0&&__night.game.paused"), f"{name}: focus loss neutralizes held input and pauses")
    page.keyboard.up("d")
    page.evaluate("window.dispatchEvent(new Event('focus'));__night.game.resume();__night.start(2);__night.step(.05)")
    p0, p1 = page.evaluate("__night.world.players.map(p=>p.x)")
    page.keyboard.down("d")
    page.keyboard.down("ArrowLeft")
    step(page, .3)
    page.keyboard.up("d")
    page.keyboard.up("ArrowLeft")
    step(page)
    after = page.evaluate("__night.world.players.map(p=>p.x)")
    checks.check(after[0] > p0 + 10 and after[1] < p1 - 10, f"{name}: couch keyboard halves independently steer two swarms", {"before":[p0,p1],"after":after,"inputs":page.evaluate("__night.game.players.map(i=>({half:i.half,map:i.map,bindings:i.bindings}))")})
    page.keyboard.down("/")
    step(page)
    checks.check(page.evaluate("!__night.world.players[0].focus&&__night.world.players[1].focus"), f"{name}: couch player two owns Focus independently")
    page.keyboard.up("/")
    step(page)
    p2_before_ray = page.evaluate("({x:__night.world.players[1].x,y:__night.world.players[1].y})")
    page.keyboard.down(".")
    step(page, .05)
    page.keyboard.up(".")
    step(page)
    checks.check(page.evaluate("__night.world.players[0].charge&&!__night.world.players[1].charge"), f"{name}: couch player two owns its ray")
    p2_after_ray = page.evaluate("({x:__night.world.players[1].x,y:__night.world.players[1].y})")
    checks.check(abs(p2_after_ray["x"]-p2_before_ray["x"])+abs(p2_after_ray["y"]-p2_before_ray["y"])<.001, f"{name}: couch ray binding does not also activate pointer steering", {"before":p2_before_ray,"after":p2_after_ray})
    # A small failure fixture exercises the actual failure/retry UI; campaign tests use normal rules.
    page.evaluate("__night.start(1);__night.step(.05);__night.world.players[0].bees=0;__night.step(.05)")
    checks.check(page.evaluate("__night.world.phase==='failed'&&__night.menu.items[0]==='Retry encounter'"), f"{name}: final bee loss exposes retry screen")
    key(page, "Enter")
    checks.check(page.evaluate("__night.world.phase==='playing'&&__night.world.assisted&&__night.world.players[0].bees===12"), f"{name}: retry restores checkpoint and marks assisted")
    page.evaluate("__night.start(1);__night.step(.05)")
    key(page, "Escape")
    page.get_by_role("button", name="Developer tools", exact=True).click()
    checks.check(page.evaluate("__night.game.shell.screen==='dev'&&!__night.world.assisted"), f"{name}: native pause reaches developer tools without changing score eligibility")
    page.get_by_role("button", name="Encounter & tools", exact=True).click()
    page.get_by_role("button", name="Collision & state labels", exact=True).click()
    checks.check(page.evaluate("!__night.world.assisted"), f"{name}: collision inspection is read-only")
    tick = page.evaluate("__night.world.tick")
    page.get_by_role("button", name="Single fixed step", exact=True).click()
    checks.check(page.evaluate("__night.world.tick") == tick+1 and page.evaluate("__night.world.assisted"), f"{name}: single-step advances exactly one authoritative tick and marks assisted")
    page.get_by_role("button", name="Export state", exact=True).click()
    exported = page.locator(".night-export").input_value()
    checks.check(json.loads(exported)["seed"] == page.evaluate("__night.world.seed"), f"{name}: developer snapshot export is real parseable world state")
    page.locator(".esh-btns").get_by_role("button", name="Back", exact=True).click()
    page.locator(".esh-btns").get_by_role("button", name="Back", exact=True).click()
    speed = page.get_by_role("slider", name="Movement · units/s", exact=True)
    speed.fill("101")
    speed.dispatch_event("input")
    checks.check(page.evaluate("__night.world.tuning.speed===101&&__night.world.assisted"), f"{name}: live developer slider updates authoritative tuning")
    page.get_by_role("button", name="Reset tuning to defaults", exact=True).click()
    checks.check(page.evaluate("__night.world.tuning.speed===88&&__night.world.assisted"), f"{name}: reset tuning preserves assisted history")
    page.get_by_role("button", name="Encounter & tools", exact=True).click()
    page.get_by_role("button", name="Next encounter", exact=True).click()
    step(page)
    checks.check(page.evaluate("__night.world.stage===1&&!__night.game.paused&&__night.game.timeScale===1"), f"{name}: encounter tool loads next content and restores normal play clock")
    # Camera proof checks actual projected ground coordinates, excluding HUD and footer.
    for width, height in ((1920, 1080), (1280, 720), (640, 480), (390, 844), (844, 390)):
        page.set_viewport_size({"width": width, "height": height})
        page.evaluate("__night.game.screen.resize()")
        step(page)
        frame = page.evaluate("""(()=>{const g=__night.game;return {W:g.W,H:g.H,corners:[[0,0],[384,0],[0,240],[384,240]].map(p=>g.r.w(...p,0))};})()""")
        valid = all(8 <= x <= frame["W"]-8 and 46 <= y <= frame["H"]-32 for x, y in frame["corners"])
        checks.check(valid, f"{name}: all four fixed arena corners visible at {width}x{height}", frame)
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.evaluate("__night.game.screen.resize();__night.toTitle();__night.step(.05);__night.openAbout()")
    step(page, .02)
    checks.check(page.get_by_role("dialog").get_attribute("aria-label") == "Source Information", f"{name}: About exposes required source information")
    for expected in ("Testing Feedback", "Engine Feedback", "Prompt Feedback", "Credits & source notes"):
        page.get_by_role("button", name="Next page", exact=True).click()
        step(page, .02)
        checks.check(page.get_by_role("dialog").get_attribute("aria-label") == expected, f"{name}: About exposes {expected}")
    page.locator(".esh-mod").evaluate("el=>{el.scrollTop=el.scrollHeight}")
    back_rect = page.locator(".esh-btns").get_by_role("button", name="Back", exact=True).bounding_box()
    checks.check(back_rect and back_rect["y"]+back_rect["height"]<=1080, f"{name}: About overflow scrolls to reachable Back action")
    if name == "chromium":
        page.wait_for_timeout(250)
        page.screenshot(path=str(ROOT / "evidence/about-browser.png"))
    checks.check(not errors and not page.evaluate("__night.game.errors.length"), f"{name}: no page or native game errors", errors + page.evaluate("__night.game.errors"))
    checks.check(not audio_requests, f"{name}: packaged game requests no external audio files", audio_requests)
    context.close()


def attract_and_pad(browser, url, checks):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    ready(page, url)
    page.evaluate("__night.toTitle();__night.step(.01)")
    saved = page.evaluate("JSON.stringify({best:My3D2dge.store.get('night-best-clean',0),settings:__night.game.settings.music})")
    step(page, 9.9)
    checks.check(page.evaluate("!__night.attract&&__night.game.sceneName==='title'"), "attract: waits for ten full idle seconds")
    step(page, .2)
    checks.check(page.evaluate("__night.attract&&__night.game.sceneName==='attract'&&__night.world.players.length===2"), "attract: begins real two-swarm simulation after ten seconds")
    step(page, 80)
    coverage = page.evaluate("({stage:__night.world.stage,stats:__night.world.stats})")
    checks.check(coverage["stats"].get("focusTicks", 0) > 0 and coverage["stats"].get("roamTicks", 0) > 0 and coverage["stats"].get("collapse", 0) > 0 and coverage["stats"].get("ray", 0) > 0, "attract: bot demonstrates roam, Focus, stings, husks and rays", coverage)
    key(page, "d")
    checks.check(page.evaluate("!__night.attract&&__night.game.sceneName==='title'&&__night.world===null"), "attract: keyboard exits and consumes input")
    checks.check(page.evaluate("JSON.stringify({best:My3D2dge.store.get('night-best-clean',0),settings:__night.game.settings.music})") == saved, "attract: score and settings stay isolated")
    for family in ("pointer", "gamepad", "touch"):
        page.evaluate("__night.toTitle();__night.step(.05);__night.step(10.1)")
        if family == "pointer":
            page.mouse.move(90, 90)
        elif family == "gamepad":
            page.evaluate("__pads=[__newPad(0)];__pads[0].axes=[.8,0,0,0]")
        else:
            page.dispatch_event("#screen", "pointerdown", {"pointerType": "touch", "pointerId": 91, "clientX": 500, "clientY": 200})
        step(page)
        checks.check(page.evaluate("!__night.attract&&__night.game.sceneName==='title'"), f"attract: {family} activity exits demonstration")
        page.evaluate("__pads=[];__night.game.input.clear()")
    page.evaluate("__night.toTitle();__night.step(.05);__pads=[__newPad(0)];__pads[0].axes=[.1,0,0,0];__night.step(10.1)")
    checks.check(page.evaluate("__night.attract"), "gamepad: stick drift inside dead zone permits attract")
    page.evaluate("__pads[0].axes=[.8,0,0,0];__night.step(.05);__pads[0].axes=[0,0,0,0];__night.step(.05);__button(0,0,true);__night.step(.05);__button(0,0,false);__night.step(.05)")
    checks.check(page.evaluate("__night.game.sceneName==='play'&&__night.world.players[0].charge"), "gamepad: Cross starts without firing first ray")
    checks.check(page.evaluate("__night.game.input.label('ray')==='✕'"), "gamepad: last-device prompt uses PlayStation default")
    before = page.evaluate("__night.world.players[0].x")
    page.evaluate("__pads[0].axes=[.1,0,0,0];__night.step(.5)")
    checks.check(abs(page.evaluate("__night.world.players[0].x")-before)<.001, "gamepad: radial dead zone prevents swarm creep")
    page.evaluate("__pads[0].axes=[.9,0,0,0];__button(0,7,true);__night.step(.3)")
    checks.check(page.evaluate("__night.world.players[0].focus") and page.evaluate("__night.world.players[0].x") > before + 10, "gamepad: analogue steering and R2 Focus act simultaneously")
    page.evaluate("__pads[0].axes=[0,0,0,0];__button(0,7,false);__button(0,0,true);__night.step(.05);__button(0,0,false);__night.step(.05)")
    checks.check(page.evaluate("!__night.world.players[0].charge&&__night.world.stats.ray===1"), "gamepad: Cross fires horizontal ray exactly once")
    page.evaluate("__night.game.settings.set('glyphs','xbox')")
    checks.check(page.evaluate("__night.game.input.label('ray')==='A'"), "gamepad: Xbox setting changes device prompt")
    page.evaluate("__pads=[];__night.step(.05)")
    checks.check(page.evaluate("__night.game.paused&&__night.game.input.padMove.every(v=>v===0)"), "gamepad: disconnect pauses and neutralizes axes")
    page.evaluate("__pads=[__newPad(0),__newPad(1)];__night.game.resume();__night.start(2);__night.step(.05)")
    positions = page.evaluate("__night.world.players.map(p=>p.x)")
    page.evaluate("__pads[0].axes=[.9,0,0,0];__pads[1].axes=[-.9,0,0,0];__night.step(.4)")
    after = page.evaluate("__night.world.players.map(p=>p.x)")
    checks.check(after[0] > positions[0]+10 and after[1] < positions[1]-10, "gamepad: two standard pads own independent shared-world swarms")
    page.evaluate("__pads[0].axes=[0,0,0,0];__pads[1].axes=[0,0,0,0];__button(1,0,true);__night.step(.05);__button(1,0,false);__night.step(.05)")
    checks.check(page.evaluate("__night.world.players[0].charge&&!__night.world.players[1].charge"), "gamepad: second pad independently spends its own ray")
    context.close()


def blocked_storage(browser, url, checks):
    context = browser.new_context()
    context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})")
    page = context.new_page()
    ready(page, url)
    page.evaluate("__night.game.settings.set('music',.2);__night.start(1);__night.step(.1)")
    checks.check(page.evaluate("__night.world.phase==='playing'&&__night.game.settings.music===.2&&__night.game.errors.length===0"), "storage: blocked persistence keeps settings and game usable for visit")
    context.close()


def touch(browser, name, url, checks):
    context = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    ready(page, url)
    point = native_row(page, 0)
    page.touchscreen.tap(point["x"], point["y"])
    step(page)
    checks.check(page.evaluate("__night.game.sceneName==='play'"), f"touch/{name}: actual touchscreen tap activates native title menu")
    # CDP sends real multi-touch in Chromium; WebKit has no multi-touch API, so dispatch
    # PointerEvents with capture disabled only for those synthetic IDs.
    session = context.new_cdp_session(page) if name == "chromium" else None
    if not session:
        page.evaluate("document.querySelector('#screen').setPointerCapture=()=>{}")
    points = {}

    def touches(kind, changed=None):
        if session:
            session.send("Input.dispatchTouchEvent", {"type": kind, "touchPoints": (changed or []) if kind == "touchEnd" else list(points.values())})
        else:
            mapping = {"touchStart": "pointerdown", "touchMove": "pointermove", "touchEnd": "pointerup", "touchCancel": "pointercancel"}
            for item in changed or []:
                page.dispatch_event("#screen", mapping[kind], {"pointerType": "touch", "pointerId": item["id"], "clientX": item["x"], "clientY": item["y"], "bubbles": True})

    before = page.evaluate("__night.world.players[0].x")
    points[11] = {"id": 11, "x": 90, "y": 590}
    touches("touchStart", [points[11]])
    points[11] = {"id": 11, "x": 145, "y": 590}
    touches("touchMove", [points[11]])
    points[12] = {"id": 12, "x": 335, "y": 490}
    touches("touchStart", [points[12]])
    step(page, .35)
    checks.check(page.evaluate("__night.world.players[0].focus&&__night.game.input.stickOn") and page.evaluate("__night.world.players[0].x") > before+8, f"touch/{name}: independent fingers move and hold Focus together")
    ray_before = page.evaluate("__night.world.stats.ray||0")
    released = points.pop(12)
    touches("touchEnd", [released])
    step(page)
    checks.check(page.evaluate("!__night.world.players[0].focus&&__night.game.input.stickOn") and page.evaluate("__night.world.stats.ray||0") == ray_before, f"touch/{name}: releasing Focus preserves movement and never emits ray")
    # The real contextual DOM action is independently tappable while the stick is held.
    page.locator(".night-touch-ray").dispatch_event("pointerdown", {"pointerType": "touch", "pointerId": 13, "bubbles": True})
    step(page)
    checks.check(page.evaluate("!__night.world.players[0].charge&&__night.game.input.stickOn") and page.evaluate("__night.world.stats.ray||0") == ray_before+1, f"touch/{name}: contextual ray works during held movement")
    released = list(points.values())
    points.clear()
    touches("touchCancel", released)
    step(page)
    checks.check(page.evaluate("!__night.game.input.stickOn&&!__night.game.input.down('focus')&&__night.game.input.move().every(v=>v===0)"), f"touch/{name}: cancellation releases all movement and Focus")
    page.evaluate("__night.start(2);__night.step(.1)")
    page.screenshot(path=str(ROOT / f"evidence/portrait-{name}.png"))
    checks.check(not errors and page.evaluate("__night.game.errors.length===0"), f"touch/{name}: no page/native errors across multi-touch lifecycle", errors)
    context.close()


def run(artifact):
    url = pathlib.Path(artifact).resolve().as_uri()
    checks = Checks()
    with sync_playwright() as playwright:
        for name in ("chromium", "webkit", "firefox"):
            browser = getattr(playwright, name).launch(headless=True)
            checks.case(f"{name}: desktop sequence completed", lambda: desktop(browser, name, url, checks))
            if name == "chromium":
                checks.case("attract and pads sequence completed", lambda: attract_and_pad(browser, url, checks))
                checks.case("blocked storage sequence completed", lambda: blocked_storage(browser, url, checks))
            if name in ("chromium", "webkit"):
                checks.case(f"{name}: touch sequence completed", lambda: touch(browser, name, url, checks))
            browser.close()
    (ROOT / "evidence/browser-results.json").write_text(json.dumps(checks.items, indent=2))
    failures = ["FAIL browser/"+item["name"]+(": "+str(item["detail"]) if item["detail"] else "") for item in checks.items if not item["pass"]]
    return len(checks.items), failures


if __name__ == "__main__":
    artifact = sys.argv[1] if len(sys.argv)>1 else str(ROOT)+".html"
    count, failures = run(artifact)
    for failure in failures:
        print(failure)
    print(f"Browser: {count-len(failures)}/{count} checks passed")
    raise SystemExit(bool(failures))
