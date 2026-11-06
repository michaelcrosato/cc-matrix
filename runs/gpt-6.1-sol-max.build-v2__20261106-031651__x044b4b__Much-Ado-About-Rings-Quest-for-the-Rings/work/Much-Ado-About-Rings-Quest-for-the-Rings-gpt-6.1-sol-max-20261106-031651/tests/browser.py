import functools
import http.server
import json
import sys
import threading
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DELIVERABLE = ROOT.parent / f"{ROOT.name}.html"
SUITE = sys.argv[1] if len(sys.argv) > 1 else "all"
results = []


def check(name, fn):
    (ROOT / "evidence/live-browser-status.json").write_text(
        json.dumps({"running": name, "completed": len(results)})
    )
    if SUITE == "pad" and not name.startswith("standard pad"):
        return
    try:
        fn()
        results.append({"name": name, "pass": True})
    except Exception as error:  # noqa: BLE001 - aggregate independent test failures
        results.append({"name": name, "pass": False, "detail": str(error)})


def require(value, message):
    if not value:
        raise AssertionError(message)


def capture(page, name):
    page.evaluate("__game.advance(.01,{draw:true})")
    page.screenshot(path=str(ROOT / f"evidence/{name}.png"), animations="disabled")


def ready(page):
    page.goto(DELIVERABLE.as_uri())
    page.wait_for_function("window.__rings && __rings.ui.shell.screen === 'title'")


def start(page, a="Warrior", b="Wizard"):
    page.get_by_role("button", name="New Expedition", exact=True).click()
    page.get_by_role("button", name=f"{a}.", exact=False).click()
    page.get_by_role("button", name=f"{b}.", exact=False).click()
    page.wait_for_function(
        "__rings.stage === 'expedition' && __rings.world.mode === 'court'"
    )


GAMEPAD = """(() => {
const make = index => ({id:'Standard Gamepad',index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:0});
window.__pads=[make(0),make(1)];window.__makePad=make;
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});
})()"""

# This driver submits ordinary movement/action intentions. It never writes world/objective fields.
DRIVER = """(function drive(){
const app=__rings,w=app.world,h=w.heroes[0],dt=1/120,c=MA.neutral();
if(w.mode==='board'){const next=['dungeon','crystal','inferno','shifting','final'].find(s=>w.reachable(s));if(next)app.intent('travel',next);return c;}
if(h.down)return c;
const partner=w.heroes[1];let target=partner.down?partner:w.objectivePoint(h);
if(w.dangerAt(h.x,h.y,true))target=w.nearestSafe(h);
[c.mx,c.my]=w.steer(h,target,dt,true);
const e=w.enemies.filter(e=>!e.dead&&e.kind!=='dragon').sort((a,b)=>MA.distance(h,a)-MA.distance(h,b))[0];
if(e&&MA.distance(h,e)<130){const n=MA.distance(h,e)||1;c.ax=(e.x-h.x)/n;c.ay=(e.y-h.y)/n;c.primary=n<(h.classId==='wizard'?125:46);c.power=n<44;}
if(MA.distance(h,target)<23){c.interact=true;if(e&&MA.distance(h,e)<90&&h.classId!=='warrior')c.power=true;}
if(w.dangerAt(h.x,h.y,true))c.dodge=true;
return c;})"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


with sync_playwright() as p:
    browser = p.chromium.launch()
    if SUITE in ["all", "browser", "visual"]:
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        errors = []
        requests = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        ready(page)

        def boot():
            require(page.title() == "Much Ado About Rings", "Wrong page identity")
            require(page.evaluate("__game.settings.music") == 0.1, "Music is not 10%")
            require(
                len(page.locator("script[src]").all()) == 0,
                "External script dependency",
            )
            html = DELIVERABLE.read_text()
            client = (ROOT / "vendor/hub/session.js").read_text()
            require(
                html.split("<script>", 1)[1].split("</script>", 1)[0] == client,
                "Hub client was modified",
            )
            page.keyboard.press("Escape")
            require(
                page.evaluate("__rings.ui.shell.screen") == "title",
                "Escape stranded title",
            )
            capture(page, "title")

        check(
            "final file boots independently, unchanged first Hub script, title back and 10% music",
            boot,
        )

        def ui_path():
            page.get_by_role("button", name="New Expedition", exact=True).click()
            capture(page, "selection")
            page.get_by_role("button", name="Warrior.", exact=False).click()
            page.get_by_role("button", name="Wizard.", exact=False).click()
            page.wait_for_function(
                "__rings.stage === 'expedition' && __rings.world.mode === 'court'"
            )
            page.keyboard.down("d")
            page.wait_for_function("__rings.world.heroes[0].x > 70")
            page.keyboard.up("d")
            capture(page, "courtyard")
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Dev Mode", exact=True).wait_for()
            page.get_by_role("button", name="Dev Mode", exact=True).click()
            page.get_by_role("button", name="Live balance sliders", exact=True).click()
            require(
                page.locator("input[type=range]").count() >= 12,
                "Missing tuning controls",
            )
            require(
                page.evaluate("document.activeElement.type") == "range",
                "Slider focus missing",
            )
            before = page.evaluate("__rings.world.tuning.speed")
            page.keyboard.press("ArrowRight")
            page.wait_for_function("__rings.world.assisted")
            require(
                page.evaluate("__rings.world.tuning.speed") > before, "Slider not live"
            )
            capture(page, "dev")
            page.get_by_role("button", name="Reset to Defaults", exact=True).click()
            require(page.evaluate("__rings.world.tuning.speed") == 66, "Reset failed")
            page.evaluate("__rings.ui.shell.hide()")
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Quit to Title", exact=True).click()
            page.wait_for_function(
                "__rings.ui.shell.screen==='title'&&__rings.stage==='title'"
            )

        check(
            "keyboard/pointer gameplay, native Dev focus, live slider and reset",
            ui_path,
        )

        def save_continue():
            page.evaluate(
                """__game.stop();__rings.world.toBoard();__rings.intent('travel','dungeon');__rings.world.transition=0;__rings.world.completeRoom();__rings.world.checkpoint();"""
            )
            page.reload()
            page.wait_for_function(
                "window.__rings && __rings.ui.shell.screen === 'title'"
            )
            page.get_by_role("button", name="Continue Expedition", exact=True).click()
            page.wait_for_function("__rings.world.roomId === 'd2'")
            require(page.evaluate("__rings.world.dread") == 1, "Continue charged Dread")
            require(
                page.evaluate("__rings.world.ring.carrier") is None,
                "Continue ring not restored",
            )
            page.evaluate("__rings.ui.title()")
            page.get_by_role("button", name="About & Credits", exact=True).click()
            capture(page, "credits")
            for title in ["Testing Feedback", "Engine Feedback", "Prompt Feedback"]:
                page.get_by_role("button", name="Next page", exact=True).click()
                require(
                    page.get_by_role("heading", name=title, exact=True).count() == 1,
                    "About page missing",
                )
            page.locator(".esh-btns").get_by_role(
                "button", name="Back", exact=True
            ).click()

        check(
            "safe room-two checkpoint Continue and all four credits pages",
            save_continue,
        )

        def audio():
            data = page.evaluate(
                """async()=>{const ctx=new OfflineAudioContext(1,24000,24000);MA.tone(ctx,ctx.destination,0,440,.25,.15,'triangle',660);MA.tone(ctx,ctx.destination,.35,110,.1,.1,'sine',160);const b=await ctx.startRendering(),a=b.getChannelData(0);let peak=0,sum=0,finite=true;for(const v of a){peak=Math.max(peak,Math.abs(v));sum+=v*v;finite=finite&&Number.isFinite(v);}return {peak,rms:Math.sqrt(sum/a.length),finite,tail:Array.from(a.slice(-100)).every(x=>Math.abs(x)<.00001),music:__game.settings.music,voice:__game.audio.voiceVolume,ready:__game.audio.ready};}"""
            )
            require(
                data["finite"]
                and data["tail"]
                and 0.03 < data["peak"] < 0.4
                and data["rms"] > 0.01,
                json.dumps(data),
            )
            require(data["music"] == 0.1 and data["ready"], "Audio routing/unlock")
            page.evaluate(
                "__game.settings.set('music',.7);__game.settings.reset('Sound')"
            )
            require(
                page.evaluate("__game.settings.music") == 0.1, "Music reset not 10%"
            )
            page.evaluate("__game.settings.set('sound',false)")
            require(
                page.evaluate(
                    "__game.audio.muted&&__game.audio.bus('master').gain.value===0"
                ),
                "Mute did not silence the master bus",
            )
            page.evaluate("__game.settings.set('sound',true)")
            (ROOT / "evidence/audio.json").write_text(json.dumps(data, indent=2))

        check(
            "procedural audio finite/non-silent/enveloped with gesture unlock and 10% reset",
            audio,
        )

        def attract():
            page.evaluate(
                "__game.stop();__rings.ui.title();__rings.lastInput=__game.real;window.__savedBefore=localStorage.getItem('ma-rings-checkpoint-v2');window.__realBefore=JSON.stringify(__rings.world.save());__game.advance(9.99,{draw:false})"
            )
            require(not page.evaluate("!!__rings.demo"), "Attract entered early")
            page.evaluate("__game.advance(.02,{draw:false})")
            require(
                page.evaluate("!!__rings.demo"), "Attract did not enter at ten seconds"
            )
            page.evaluate("__game.advance(92,{draw:false})")
            require(
                page.evaluate("new Set(__rings.demo.seen).size") == 5,
                "Attract missed families/dragon",
            )
            require(
                page.evaluate(
                    "__savedBefore===localStorage.getItem('ma-rings-checkpoint-v2')&&__realBefore===JSON.stringify(__rings.world.save())"
                ),
                "Attract altered real run/save",
            )
            page.keyboard.press("Enter")
            require(
                page.evaluate("!__rings.demo && __rings.ui.shell.screen==='title'"),
                "Input not consumed on attract exit",
            )
            page.evaluate("__game.advance(10.4,{draw:false})")
            require(page.evaluate("!!__rings.demo"), "Attract did not repeat")
            page.mouse.move(20, 20)
            require(
                page.evaluate("!__rings.demo && __rings.ui.shell.screen==='title'"),
                "Pointer did not exit",
            )
            page.get_by_role("button", name="Settings", exact=True).click()
            page.evaluate("__game.advance(12,{draw:false})")
            require(not page.evaluate("!!__rings.demo"), "Attract over Settings")
            page.evaluate("__rings.ui.title();__game.start()")

        check(
            "exact ten-second disposable attract, all five segments, repeat, exits and Settings exclusion",
            attract,
        )

        def full_browser_run():
            page.evaluate(
                "__game.stop();__rings.startRun(['warrior','wizard']);__rings.ui.shell.hide();__game.advance(.02,{draw:false})"
            )
            summary = page.evaluate(
                f"""()=>{{const drive={DRIVER};let n=0;for(;n<120*500;n++){{const c=drive();__rings.scriptCommands=[c];__game.advance(1/120,{{draw:false}});if(['victory','failure'].includes(__rings.world.mode))break;}}__rings.scriptCommands=null;__game.advance(.02);return {{n,state:__rings.world.snapshot(),errors:__game.errors}};}}"""
            )
            (ROOT / "evidence/browser-normal-playthrough.json").write_text(
                json.dumps(summary, indent=2)
            )
            require(
                summary["state"]["mode"] == "victory"
                and not summary["state"]["assisted"],
                json.dumps(summary),
            )
            require(
                len(summary["state"]["rings"]) == 4 and all(summary["state"]["bound"]),
                "Missing actual rings/bindings",
            )
            capture(page, "victory")
            page.get_by_role("button", name="Another Expedition", exact=True).click()
            page.get_by_role("button", name="Phantom.", exact=False).click()
            page.get_by_role("button", name="Changeling.", exact=False).click()
            page.evaluate("__game.advance(.1)")
            require(
                page.evaluate(
                    "__rings.world.rings.length===0&&__rings.world.roomId==='court'&&!__rings.world.assisted"
                ),
                "Replay did not reset",
            )

        check(
            "bundled HTML normal-action complete expedition, actual ending and clean replay",
            full_browser_run,
        )
        check(
            "no missing runtime requests or browser/native errors",
            lambda: require(
                not errors
                and page.evaluate("__game.errors.length") == 0
                and not any(url.startswith("http") for url in requests),
                json.dumps({"errors": errors, "requests": requests}),
            ),
        )

        if SUITE in ["all", "visual"]:

            def visuals():
                page.evaluate(
                    "__rings.ui.shell.hide();__rings.world.toBoard();__rings.world.rings=['dungeon'];__rings.world.shortcut=['dungeon'];__rings.ui.board();__game.advance(.05)"
                )
                capture(page, "map")
                for room in ["d2", "c2", "i2", "s2", "final"]:
                    page.evaluate(
                        """room=>{__rings.world.debug('jump',room);__rings.ui.shell.hide();__game.resume();__rings.ui.lastMode='';__game.advance(.8);const h=__rings.world.heroes[0];const p=room==='final'?{x:280,y:190}:__rings.world.nearestSafe({x:290,y:170});Object.assign(h,p);Object.assign(__rings.world.heroes[1],{x:p.x-25,y:p.y+10});__rings.ui.shell.tutorial(null);__game.cam.snap=true;__game.advance(.05);}""",
                        room,
                    )
                    capture(page, room)
                page.evaluate("__rings.ui.about();__game.advance(.05)")
                capture(page, "credits")
                require(
                    not page.evaluate("__game.errors.length"),
                    page.evaluate("JSON.stringify(__game.errors)"),
                )

            check(
                "visual captures of board, all four families, dragon and credits",
                visuals,
            )
        context.close()

    if SUITE in ["all", "browser", "browser-input", "pad"]:

        def pad_path():
            ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
            ctx.add_init_script(GAMEPAD)
            pg = ctx.new_page()
            ready(pg)
            pg.evaluate("__game.stop()")

            def button(index, b):
                pg.evaluate(
                    "([i,b])=>{__pads[i].buttons[b]={pressed:true,touched:true,value:1};__game.advance(.04);__pads[i].buttons[b]={pressed:false,touched:false,value:0};__game.advance(.24);}",
                    [index, b],
                )

            pg.evaluate(
                "__rings.lastInput=__game.real;__game.advance(10.1,{draw:false})"
            )
            require(pg.evaluate("!!__rings.demo"), "Pad attract fixture did not start")
            button(0, 0)
            require(
                pg.evaluate("!__rings.demo&&__rings.ui.shell.screen==='title'"),
                "Pad attract exit was not consumed",
            )
            button(0, 0)
            require(
                pg.evaluate("__rings.ui.shell.screen") == "selection",
                "Pad confirm title",
            )
            button(0, 0)
            button(0, 0)
            pg.evaluate(
                "__pads[0].axes=[1,0,0,0];__game.advance(.7);__pads[0].axes=[0,0,0,0];__game.advance(.03)"
            )
            require(pg.evaluate("__rings.world.heroes[0].x") > 75, "Pad did not move")
            require(
                pg.evaluate("__game.input.label('interact')") == "△",
                "PlayStation glyph",
            )
            pg.evaluate("__game.settings.set('glyphs','xbox')")
            require(pg.evaluate("__game.input.label('interact')") == "Y", "Xbox glyph")
            pg.keyboard.down("d")
            pg.evaluate("__game.advance(.1)")
            pg.keyboard.up("d")
            require(
                pg.evaluate("__game.input.lastDevice") == "keyboard",
                "Keyboard hot switch",
            )
            pg.mouse.move(1000, 450)
            pg.evaluate("__game.advance(.1)")
            require(
                pg.evaluate("__game.input.lastDevice") == "mouse", "Mouse hot switch"
            )
            button(1, 9)
            require(
                pg.evaluate("!!__rings.pendingJoin"), "Spare pad did not request join"
            )
            pg.evaluate("__rings.world.toBoard();__game.advance(.1)")
            require(
                pg.evaluate("__rings.localJoined&&!__rings.world.heroes[1].ai"),
                "Couch takeover not applied",
            )
            button(1, 2)
            require(
                pg.evaluate("__rings.ui.shell.screen==='selection'"),
                "P2 waystone inaccessible",
            )
            button(1, 13)
            button(1, 0)
            require(
                pg.evaluate("__rings.world.classes[1]==='wizard'"),
                "P2 could not choose own hero: "
                + pg.evaluate(
                    "JSON.stringify({classes:__rings.world.classes,screen:__rings.ui.shell.screen,focus:document.activeElement?.textContent})"
                ),
            )
            pg.evaluate(
                "__rings.intent('travel','dungeon');__rings.ui.shell.hide();__game.advance(.8);window.__p2before=__rings.world.heroes[1].x;__pads[1].axes=[1,0,0,0];__game.advance(.5);__pads[1].axes=[0,0,0,0]"
            )
            require(
                pg.evaluate("__rings.world.heroes[1].x>__p2before+8"),
                "Player two pad did not move own hero",
            )
            pg.evaluate("__pads[1]=null;__game.advance(.1)")
            require(
                pg.evaluate("__rings.ui.shell.screen") == "reconnect",
                "Disconnect did not show recovery choice",
            )
            pg.get_by_role(
                "button", name="Continue with AI companion", exact=True
            ).click()
            pg.evaluate("__game.advance(.1)")
            require(
                pg.evaluate("__rings.world.heroes[1].ai"), "Companion recovery failed"
            )

            def focus(label):
                for _ in range(18):
                    if (
                        pg.evaluate("document.activeElement?.textContent.trim()")
                        == label
                    ):
                        return
                    button(0, 13)
                raise AssertionError("Pad focus could not reach " + label)

            button(0, 9)
            focus("Dev Mode")
            button(0, 0)
            focus("Live balance sliders")
            button(0, 0)
            require(
                pg.evaluate("document.activeElement.type==='range'"),
                "Pad cannot focus slider",
            )
            old = pg.evaluate("__rings.world.tuning.speed")
            button(0, 15)
            require(
                pg.evaluate("__rings.world.tuning.speed") > old,
                "Pad cannot adjust slider",
            )
            button(0, 1)
            button(0, 1)
            focus("About & Credits")
            button(0, 0)
            button(0, 0)
            require(
                pg.get_by_role("heading", name="Testing Feedback", exact=True).count()
                == 1,
                "Pad credits navigation",
            )
            pg.evaluate("__rings.ui.shell.hide();__game.menu('controls')")
            pg.locator('button[aria-label^="Interact / revive, keyboard"]').click()
            pg.keyboard.press("r")
            require(
                pg.evaluate("__game.input.map.interact.includes('KeyR')"),
                "Native key rebinding failed",
            )
            pg.evaluate("__rings.ui.shell.hide();__game.advance(.4)")
            pg.keyboard.down("r")
            pg.evaluate("__game.advance(.02)")
            require(
                pg.evaluate("__game.input.down('interact')"), "Rebound key does not act"
            )
            pg.keyboard.up("r")
            if pg.get_by_role("button", name="Dismiss", exact=True).count():
                pg.get_by_role("button", name="Dismiss", exact=True).click()
            pg.evaluate("__game.advance(.25,{draw:true})")
            target = pg.evaluate(
                """()=>{const h=__rings.world.heroes[0],p=__game.r.w(h.x+70,h.y-30,0),b=__game.screen.canvas.getBoundingClientRect();return {x:b.left+(p[0]*__game.screen.S+__game.screen.OX-Math.round(__game.screen.fx*__game.screen.S))/__game.screen.dpr,y:b.top+(p[1]*__game.screen.S+__game.screen.OY-Math.round(__game.screen.fy*__game.screen.S))/__game.screen.dpr};}"""
            )
            pg.mouse.move(target["x"], target["y"])
            pg.evaluate("__game.advance(.05)")
            require(
                pg.evaluate(
                    "Math.abs(My3D2dge.angDiff(__rings.world.heroes[0].facing,Math.atan2(-30,70)))<.15"
                ),
                "Mouse aim did not transform through native camera: "
                + pg.evaluate(
                    "JSON.stringify({aim:__game.mouseGround(),facing:__rings.world.heroes[0].facing,hero:[__rings.world.heroes[0].x,__rings.world.heroes[0].y],screen:[__game.W,__game.H,__game.screen.S,__game.screen.OX,__game.screen.OY],mouse:__game.input.mouse,device:__game.input.lastDevice})"
                ),
            )
            ctx.close()

        check(
            "standard pad navigation/movement, glyph switch, hot devices, couch takeover and disconnect",
            pad_path,
        )

        def mobile():
            ctx = browser.new_context(**p.devices["iPhone 13"])
            pg = ctx.new_page()
            ready(pg)
            capture(pg, "phone-title")
            pg.evaluate(
                "__game.stop();__rings.lastInput=__game.real;__game.advance(10.1,{draw:false})"
            )
            require(
                pg.evaluate("!!__rings.demo"), "Touch attract fixture did not start"
            )
            pg.touchscreen.tap(20, 20)
            require(
                pg.evaluate("!__rings.demo&&__rings.ui.shell.screen==='title'"),
                "Touch attract exit was not consumed",
            )
            pg.evaluate("__game.start()")
            start(pg, "Phantom", "Wizard")
            pg.evaluate("__game.stop();__game.advance(.8)")
            if pg.get_by_role("button", name="Dismiss", exact=True).count():
                pg.get_by_role("button", name="Dismiss", exact=True).click()
            cdp = ctx.new_cdp_session(pg)
            points = [{"x": 70, "y": 500, "id": 11}]
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": points},
            )
            points = [{"x": 120, "y": 500, "id": 11}, {"x": 290, "y": 440, "id": 22}]
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": points},
            )
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": points}
            )
            pg.evaluate(
                "window.__touchBefore=__rings.world.heroes[0].x;__game.advance(.5)"
            )
            require(
                pg.evaluate("__rings.touch.points.size") == 2,
                "Actual two-pointer tracking failed",
            )
            require(
                pg.evaluate("__rings.world.heroes[0].x>__touchBefore+5"),
                "Invisible stick did not move",
            )
            power = pg.locator('#touch-actions button[data-action="power"]')
            require(power.is_visible(), "Context class power unavailable")
            box = power.bounding_box()
            points.append(
                {
                    "x": box["x"] + box["width"] / 2,
                    "y": box["y"] + box["height"] / 2,
                    "id": 33,
                }
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": points},
            )
            pg.evaluate("__game.advance(.08)")
            require(
                pg.evaluate("__rings.world.heroes[0].powerTime") > 0,
                "Touch power did not activate",
            )
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []}
            )
            pg.evaluate("__game.advance(.05)")
            require(
                pg.evaluate(
                    "__rings.touch.points.size===0&&__rings.touch.actions.size===0"
                ),
                "Touch cancellation left held input",
            )
            held_move = False
            for _ in range(240):
                state = pg.evaluate(
                    """()=>{const w=__rings.world,h=w.heroes[0],goal=w.objectivePoint(h),d=w.steer(h,goal,.15,true),v=__game.view.p(d[0],d[1],0),n=Math.hypot(...v)||1;return {mode:w.mode,distance:MA.distance(h,goal),dx:v[0]/n,dy:v[1]/n};}"""
                )
                if state["mode"] == "board":
                    break
                if state["distance"] < 21:
                    if held_move:
                        cdp.send(
                            "Input.dispatchTouchEvent",
                            {"type": "touchEnd", "touchPoints": []},
                        )
                    held_move = False
                    pg.evaluate("__game.advance(.03)")
                    action = pg.locator('#touch-actions button[data-action="interact"]')
                    require(
                        action.is_visible(), "Touch interaction missing at objective"
                    )
                    box = action.bounding_box()
                    cdp.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchStart",
                            "touchPoints": [
                                {
                                    "x": box["x"] + box["width"] / 2,
                                    "y": box["y"] + box["height"] / 2,
                                    "id": 33,
                                }
                            ],
                        },
                    )
                    pg.evaluate("__game.advance(1.4)")
                    cdp.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchEnd", "touchPoints": []},
                    )
                    pg.evaluate("__game.advance(.03)")
                else:
                    if not held_move:
                        cdp.send(
                            "Input.dispatchTouchEvent",
                            {
                                "type": "touchStart",
                                "touchPoints": [{"x": 70, "y": 500, "id": 11}],
                            },
                        )
                        held_move = True
                    cdp.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchMove",
                            "touchPoints": [
                                {
                                    "x": 70 + state["dx"] * 58,
                                    "y": 500 + state["dy"] * 58,
                                    "id": 11,
                                }
                            ],
                        },
                    )
                    pg.evaluate("__game.advance(.15)")
            if held_move:
                cdp.send(
                    "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
                )
            require(
                pg.evaluate("__rings.world.mode==='board'&&!__rings.world.assisted"),
                "Ordinary touch ring extraction did not finish",
            )
            require(
                pg.evaluate("__rings.ui.shell.screen==='route'&&!__game.paused"),
                "Touch extraction release activated the next menu",
            )
            capture(pg, "phone-map")
            pg.evaluate(
                "__rings.world.debug('jump','c1');__rings.ui.shell.hide();__game.advance(.1);__rings.ui.shell.tutorial(null)"
            )
            capture(pg, "phone-play")
            pg.set_viewport_size({"width": 844, "height": 390})
            pg.evaluate("__game.advance(.05)")
            capture(pg, "phone-landscape")
            require(
                pg.evaluate("__game.errors.length") == 0, "Mobile native draw errors"
            )
            ctx.close()

        check(
            "phone multitouch power, cancellation, ordinary ring extraction and resize",
            mobile,
        )

        def tablet():
            ctx = browser.new_context(**p.devices["iPad Pro 11"])
            pg = ctx.new_page()
            ready(pg)
            start(pg, "Changeling", "Phantom")
            pg.evaluate("__game.stop();__game.advance(.8)")
            capture(pg, "tablet-play")
            require(
                pg.evaluate(
                    "__game.errors.length===0&&__rings.world.heroes[0].classId==='changeling'"
                ),
                "Tablet play failed",
            )
            ctx.close()
            ios = p.webkit.launch()
            ctx = ios.new_context(**p.devices["iPhone 13"])
            pg = ctx.new_page()
            ready(pg)
            start(pg)
            require(
                pg.evaluate("__rings.world.mode==='court'&&__game.errors.length===0"),
                "WebKit phone emulation failed",
            )
            ctx.close()
            ios.close()

        check("tablet and WebKit iPhone-profile gameplay stand-ins", tablet)

        def alternate_browsers():
            for kind in [p.webkit, p.firefox]:
                other = kind.launch()
                ctx = other.new_context(viewport={"width": 1024, "height": 768})
                pg = ctx.new_page()
                ready(pg)
                start(pg)
                pg.evaluate("__game.stop();__game.advance(.7)")
                require(
                    pg.evaluate(
                        "__rings.world.mode==='court'&&__game.errors.length===0"
                    ),
                    f"{kind.name}: native path failed",
                )
                pg.close()
                ctx.close()
                other.close()

        check(
            "native renderer and gameplay boot in WebKit and Firefox stand-ins",
            alternate_browsers,
        )

        def blocked_storage():
            ctx = browser.new_context()
            ctx.add_init_script(
                "Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied')}})"
            )
            pg = ctx.new_page()
            ready(pg)
            start(pg)
            pg.evaluate("__rings.world.checkpoint();__game.advance(.1)")
            require(
                pg.evaluate("__rings.storageFailed&&__rings.world.mode==='court'"),
                "Storage denial prevented play",
            )
            ctx.close()

        check("unavailable storage does not block new expeditions", blocked_storage)

    if SUITE in ["all", "hub", "hub-gameplay"]:
        handler = functools.partial(QuietHandler, directory=str(ROOT.parent))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        port = server.server_address[1]
        base = f"http://127.0.0.1:{port}/{quote(ROOT.name)}/vendor/hub/harness.html"
        game = quote(f"../../../{ROOT.name}.html")
        try:
            for name, extra in [
                ("two-player", "players=2"),
                ("bad-network", "players=2&latency=150&jitter=50&loss=5"),
                ("host-departure", "players=2&scenario=host-leave"),
                ("server-only-host", "players=2&scenario=server"),
                ("one-player", "players=1"),
            ]:

                def conformance(name=name, extra=extra):
                    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
                    pg = ctx.new_page()
                    pg.goto(f"{base}?game={game}&auto=1&play=2400&{extra}")
                    pg.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=65000
                    )
                    report = pg.evaluate("window.__hubCheck")
                    (ROOT / f"evidence/hub-{name}.json").write_text(
                        json.dumps(report, indent=2)
                    )
                    require(
                        report["pass"],
                        json.dumps([c for c in report["checks"] if not c["pass"]]),
                    )
                    identities = pg.evaluate(
                        "Array.from(document.querySelectorAll('iframe')).map(f=>f.contentDocument?.title).filter(Boolean)"
                    )
                    require(
                        all(n == "Much Ado About Rings" for n in identities),
                        "Wrong served game identity",
                    )
                    ctx.close()

                if SUITE != "hub-gameplay":
                    check(f"AI Hub conformance: {name}", conformance)

            def gameplay_network():
                ctx = browser.new_context(viewport={"width": 1440, "height": 1000})
                pg = ctx.new_page()
                pg.goto(
                    f"{base}?game={game}&players=2&latency=80&jitter=20&loss=3&limit=300"
                )
                pg.locator("#restart").click()
                pg.wait_for_function(
                    "document.querySelectorAll('iframe').length===2&&Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__rings?.net.active)"
                )
                pg.locator("#release").click()
                pg.wait_for_function(
                    "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__rings?.net.canPlay())"
                )
                frames = [frame for frame in pg.frames if frame != pg.main_frame]
                host = next(frame for frame in frames if frame.evaluate("AIHub.isHost"))

                def wait(frame, expression, **options):
                    try:
                        frame.wait_for_function(
                            expression, timeout=options.get("timeout", 9000)
                        )
                    except Exception as error:
                        raise AssertionError(
                            expression
                            + " :: "
                            + json.dumps(host.evaluate("__game.debug.snapshot()"))
                        ) from error

                guest = next(
                    frame for frame in frames if not frame.evaluate("AIHub.isHost")
                )
                require(
                    host.evaluate(
                        "!AIHub.server&&__rings.stage==='expedition'&&!__rings.demo"
                    ),
                    "Session boot gates",
                )
                require(
                    guest.evaluate("!__rings.net.command(AIHub.me,'travel','dungeon')")
                    is False,
                    "Guest intent submission failed",
                )
                host.get_by_role("button", name="The Hollow Keep", exact=True).click()
                host.get_by_role(
                    "button", name="Cross the threshold", exact=True
                ).click()
                wait(guest, "__rings.world.roomId==='d1'")
                host.evaluate(
                    """()=>{const w=__rings.world;w.debug('jump','d2');w.transition=0;const a=w.heroes[0],b=w.heroes[1];Object.assign(a,{x:168,y:328,hp:5,hurt:0});Object.assign(b,{x:188,y:328,hp:5,hurt:0});const e=w.makeEnemy('fighter',a.x-12,a.y);e.cd=0;w.enemies=[e];__rings.net.broadcast();}"""
                )
                wait(host, "__rings.world.heroes[0].hp<5", timeout=12000)
                wait(guest, "__rings.world.heroes[0].hp<5", timeout=12000)
                host.evaluate(
                    "__rings.world.enemies=[];const w=__rings.world;Object.assign(w.ring,{x:w.heroes[0].x+3,y:w.heroes[0].y,carrier:null});__game.input.hold('interact')"
                )
                wait(host, "__rings.world.ring.carrier===0")
                host.evaluate("__game.input.hold('interact',false)")
                wait(guest, "__rings.world.ring.carrier===0")
                guest.evaluate("__game.input.hold('interact')")
                wait(host, "__rings.world.heroes[1].cmd.interact")
                host.evaluate("__game.input.hold('interact')")
                wait(host, "__rings.world.ring.carrier===1")
                host.evaluate("__game.input.hold('interact',false)")
                wait(guest, "__rings.world.ring.carrier===1")
                host.evaluate(
                    "const w=__rings.world,h=w.heroes[0];h.hp=1;h.hurt=0;w.hurt(h,1);__rings.net.broadcast()"
                )
                wait(host, "!__rings.world.heroes[0].down", timeout=12000)
                wait(
                    guest,
                    "!__rings.world.heroes[0].down&&__rings.world.ring.carrier===1",
                    timeout=12000,
                )
                guest.evaluate(
                    "__game.input.hold('interact',false);__game.input.hold('right')"
                )
                wait(host, "__rings.world.heroes[1].cmd.mx>.5")
                guest.evaluate("__game.menu()")
                before = host.evaluate("__rings.world.tick")
                wait(host, "__rings.world.tick>" + str(before + 25))
                wait(host, "__rings.world.heroes[1].cmd.mx===0")
                guest.evaluate(
                    "__rings.ui.shell.hide();__game.input.hold('right',false)"
                )
                host.evaluate(
                    "const w=__rings.world,h=w.heroes[1];Object.assign(h,w.room.exit);__rings.net.broadcast()"
                )
                guest.evaluate("__game.input.hold('interact')")
                wait(
                    host,
                    "__rings.world.mode==='board'&&__rings.world.rings.includes('dungeon')",
                    timeout=12000,
                )
                wait(
                    guest,
                    "__rings.world.mode==='board'&&__rings.world.rings.includes('dungeon')",
                    timeout=12000,
                )
                host.evaluate("__rings.world.debug('tune',{key:'speed',value:80})")
                wait(guest, "__rings.world.tuning.speed===80")
                stale_before = host.evaluate("__rings.net.metrics.stale")
                guest.evaluate(
                    "__rings.net.send({t:'input',ep:__rings.world.epoch-1,q:++__rings.net.outSeq,c:{mx:1,my:Infinity}},false,AIHub.host)"
                )
                wait(host, "__rings.net.metrics.stale>" + str(stale_before))
                pg.locator("#who").select_option(label="Blue Otter (p1)")
                pg.locator("#remove").click()
                wait(host, "__rings.world.heroes[1].ai&&__rings.world.chooser()===0")
                state = host.evaluate("__game.debug.snapshot()")
                require(
                    state["stats"]["revives"] >= 1 and state["stats"]["passes"] >= 1,
                    json.dumps(state),
                )
                require(
                    state["net"]["maxBytes"] < 16384 and state["errorCount"] == 0,
                    "Traffic/errors",
                )
                (ROOT / "evidence/hub-gameplay.json").write_text(
                    json.dumps(state, indent=2)
                )
                pg.locator("#timeup").click()
                wait(host, "__rings.net.ended")
                count = host.evaluate("__rings.net.metrics.sent")
                host.evaluate("__game.advance(.5)")
                require(
                    host.evaluate("__rings.net.metrics.sent") == count,
                    "Traffic after end",
                )
                ctx.close()

            check(
                "AI Hub real shared damage/pickup/pass/revive/extraction, live menus, tuning and departure",
                gameplay_network,
            )

            def server_campaign():
                ctx = browser.new_context(viewport={"width": 1280, "height": 900})
                pg = ctx.new_page()
                pg.goto(f"{base}?game={game}&players=2&scenario=server&limit=300")
                pg.locator("#restart").click()
                pg.wait_for_function(
                    "document.querySelectorAll('iframe').length===3&&Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__rings?.net.active)"
                )
                pg.locator("#release").click()
                pg.wait_for_function(
                    "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__rings?.net.canPlay())"
                )
                frames = [frame for frame in pg.frames if frame != pg.main_frame]
                server_frame = next(
                    frame for frame in frames if frame.evaluate("AIHub.server===true")
                )
                require(
                    server_frame.evaluate("__rings.net.seat()===-1&&AIHub.isHost"),
                    "Server incorrectly owns a hero",
                )
                state = server_frame.evaluate(
                    f"""()=>{{const app=__rings,w=app.world,drive={DRIVER};__game.stop();let n=0;for(;n<120*500;n++){{if(w.mode==='board'){{const next=['dungeon','crystal','inferno','shifting','final'].find(s=>w.reachable(s));if(next)w.intent(w.chooser(),'travel',next);}}else{{const c=drive(),c2=w.aiInput(w.heroes[1],1/120);w.step(1/120,[c,c2]);}}if(['victory','failure'].includes(w.mode))break;}}app.net.broadcast();if(w.mode==='victory')app.net.finish(true);return {{n,state:w.snapshot(),hasLocalHero:app.net.seat()>=0}};}}"""
                )
                require(
                    state["state"]["mode"] == "victory"
                    and not state["state"]["assisted"]
                    and not state["hasLocalHero"],
                    json.dumps(state),
                )
                pg.wait_for_function(
                    "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__rings?.net.ended)"
                )
                (ROOT / "evidence/hub-server-campaign.json").write_text(
                    json.dumps(state, indent=2)
                )
                ctx.close()

            check(
                "server-only authority completes the entire campaign with ordinary hero commands",
                server_campaign,
            )
        finally:
            server.shutdown()
            server.server_close()
    browser.close()

print(json.dumps(results))
