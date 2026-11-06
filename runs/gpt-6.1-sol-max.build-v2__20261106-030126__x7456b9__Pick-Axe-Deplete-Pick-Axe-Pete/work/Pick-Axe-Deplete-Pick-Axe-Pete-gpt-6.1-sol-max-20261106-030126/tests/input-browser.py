"""Real-browser input, menu, attract and coded-audio checks. Quiet JSON output."""

import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "index.html"
EVIDENCE = ROOT / "docs" / "evidence"
PAD_STUB = """window.__pads=[{id:'DualSense standard mapping',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}];navigator.getGamepads=()=>window.__pads;"""


class Suite:
    def __init__(self):
        self.count = 0
        self.failures = []

    def check(self, name, fn):
        self.count += 1
        try:
            fn()
        except Exception as e:  # noqa: BLE001 - aggregate independent test failures
            self.failures.append(f"{name}: {str(e).splitlines()[0]}")

    def ok(self, condition, message):
        if not condition:
            raise AssertionError(message)


def boot(context, pad=False):
    page = context.new_page()
    page.set_default_timeout(5000)
    if pad:
        page.add_init_script(PAD_STUB)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(ARTIFACT.as_uri(), wait_until="load")
    page.wait_for_function('window.__pd && document.body.dataset.ready === "true"')
    page.evaluate("__pd.game.stop()")
    return page, errors


def capture(page, filename):
    # Finish finite CSS opening fades even while the native simulation clock is stopped.
    page.screenshot(path=str(EVIDENCE / filename), animations="disabled")


def advance(page, seconds, render=False):
    page.evaluate("([s,r])=>__pd.advance(s,null,r)", [seconds, render])


def tap_pad(page, button, index=0):
    page.evaluate(
        "([k,i])=>{const p=__pads[i];p.buttons[k]={pressed:true,touched:true,value:1};p.timestamp++;__pd.advance(.025);p.buttons[k]={pressed:false,touched:false,value:0};p.timestamp++;__pd.advance(.025)}",
        [button, index],
    )


def pad_choose(page, name, role="button"):
    target = page.get_by_role(
        role,
        name=(
            re.compile(name.pattern, re.IGNORECASE)
            if hasattr(name, "pattern")
            else name
        ),
        exact=False,
    ).first

    try:
        target.wait_for(state="visible")
    except Exception as e:
        raise AssertionError(
            f"Pad target {name} unavailable on " + str(page.evaluate("__pd.ui.screen"))
        ) from e
    target.evaluate('(el)=>el.dataset.testTarget="yes"')
    try:
        count = page.evaluate(
            '[...document.querySelectorAll(".esh-sh button,.esh-sh input")].filter(e=>e.offsetParent&&e.tabIndex!==-1).length'
        )
        for _ in range(count + 4):
            if page.evaluate('document.activeElement?.dataset.testTarget === "yes"'):
                if role == "button":
                    tap_pad(page, 0)
                return
            tap_pad(page, 13)
        raise AssertionError(
            f"Pad focus could not reach {name}; at "
            + page.evaluate("document.activeElement.textContent")
        )
    finally:
        page.evaluate(
            'document.querySelectorAll("[data-test-target]").forEach(e=>delete e.dataset.testTarget)'
        )


def reset_play(page, coop=False):
    page.evaluate(
        "(coop)=>{__pd.title();__pd.start({coop});__pd.mine.relief=0;__pd.mine.nextSpawn=__pd.mine.nextPair=100000;__pd.mine.players.forEach(p=>p.invuln=100000);__pd.advance(.025)}",
        coop,
    )


def keyboard_and_mouse(s, page, errors):
    s.check(
        "fresh file bootstrap",
        lambda: s.ok(
            page.title() == "Pick Axe Deplete"
            and page.evaluate("__pd.ui.screen") == "title",
            "Fresh file did not open title",
        ),
    )
    s.check(
        "music starts at ten percent",
        lambda: s.ok(
            page.evaluate(
                "__pd.game.settings.music===.1 && __pd.audio.diagnostics().musicGain===.1"
            ),
            "Music gain does not start at .1",
        ),
    )

    def mouse_hover():
        button = page.get_by_role("button", name="Chamber practice", exact=True)
        button.hover()
        s.ok(
            button.evaluate("(el)=>document.activeElement===el"),
            "Hover did not focus menu item",
        )
        button.click()
        s.ok(
            page.evaluate("__pd.ui.screen") == "practice",
            "Mouse click did not activate practice",
        )
        page.get_by_role("button", name="02 · Crosscurrent", exact=True).click()
        s.ok(
            page.evaluate(
                "__pd.mine.chamber===1 && __pd.mine.practice && __pd.ui.screen===null"
            ),
            "Practice selection did not launch",
        )

    s.check("mouse hover, click and practice", mouse_hover)
    reset_play(page)

    def movement():
        x = page.evaluate("__pd.mine.players[0].body.x")
        page.keyboard.down("KeyD")
        advance(page, 0.5)
        page.keyboard.up("KeyD")
        advance(page, 0.03)
        s.ok(
            page.evaluate("__pd.mine.players[0].body.x") > x + 30,
            "D did not move native body",
        )
        page.keyboard.down("Space")
        advance(page, 0.1)
        s.ok(page.evaluate("__pd.mine.players[0].body.z") > 25, "Space did not jump")
        page.keyboard.up("Space")
        advance(page, 0.7)
        page.keyboard.down("KeyS")
        advance(page, 0.08)
        s.ok(
            page.evaluate("__pd.mine.players[0].body.crouching"),
            "S did not duck outside ladder",
        )
        page.keyboard.up("KeyS")
        advance(page, 0.08)

    s.check("actual keyboard movement, variable jump and duck", movement)

    def actions():
        reset_play(page)
        page.evaluate(
            """()=>{const m=__pd.mine,p=m.players[0];p.body.x=140;p.body.facing=1;m.spawnRock('ore',162,26,0)}"""
        )
        page.keyboard.down("KeyJ")
        advance(page, 0.25)
        page.keyboard.up("KeyJ")
        advance(page, 0.15)
        s.ok(
            page.evaluate("__pd.mine.stats.chops>0 && __pd.mine.players[0].tool===5"),
            "J did not chop and wear real tool",
        )
        page.evaluate(
            "()=>{const m=__pd.mine,p=m.players[0];m.rocks=[];p.body.x=140;p.body.facing=1;m.spawnRock('ore',162,26,0)}"
        )
        page.keyboard.down("KeyW")
        page.keyboard.down("KeyQ")
        advance(page, 0.14)
        page.keyboard.up("KeyQ")
        page.keyboard.up("KeyW")
        advance(page, 0.2)
        s.ok(
            page.evaluate(
                "__pd.mine.stats.redirects===1 && __pd.mine.stats.high===1 && __pd.mine.players[0].tool===4"
            ),
            "Q did not produce high redirect and contact wear",
        )
        page.evaluate(
            "()=>{const m=__pd.mine,p=m.players[0];m.rocks=[];p.body.x=140;p.body.facing=1;m.spawnRock('ore',162,26,0)}"
        )
        advance(page, 0.05, True)
        q = page.evaluate(
            """()=>{const r=__pd.game.r,q=r.w(170,0,0),c=__pd.game.screen.canvas.getBoundingClientRect();return [c.left+q[0]/__pd.game.W*c.width,c.top+q[1]/__pd.game.H*c.height]}"""
        )
        page.mouse.move(*q)
        page.mouse.down(button="right")
        advance(page, 0.14)
        page.mouse.up(button="right")
        advance(page, 0.2)
        s.ok(
            page.evaluate("__pd.mine.stats.redirects===2 && __pd.mine.stats.low===1"),
            "Right-click pointer did not select low arc",
        )

    s.check("keyboard chop, high redirect and mouse low aim", actions)

    def world_click():
        reset_play(page)
        page.evaluate(
            """()=>{const p=__pd.mine.players[0];p.body.x=60;p.body.facing=-1;__pd.advance(.025,null,true)}"""
        )
        xy = page.evaluate(
            """()=>{const r=__pd.game.r,q=r.w(48,0,31),c=__pd.game.screen.canvas.getBoundingClientRect();return [c.left+q[0]/__pd.game.W*c.width,c.top+q[1]/__pd.game.H*c.height]}"""
        )
        page.mouse.click(*xy)
        advance(page, 0.04)
        s.ok(
            page.evaluate("__pd.mine.features.jam===1 && __pd.mine.stats.chops===0"),
            "Clicking in-range marked door did not deliberately interact",
        )
        advance(page, 1.1)
        s.ok(
            page.evaluate("__pd.mine.features.jam===1"),
            "Quick mouse door click repeated after its press was consumed",
        )

    s.check("in-range world door click", world_click)

    def mouse_rescue():
        reset_play(page, coop=True)
        page.evaluate(
            """()=>{const m=__pd.mine,p=m.players[0],q=m.players[1];
            Object.assign(p.body,{x:60,z:16,vx:0,vz:0,facing:1});
            Object.assign(q.body,{x:80,z:16,vx:0,vz:0});q.hp=0;q.down=true;
            m.spawnRock('ore',80,26,0);__pd.advance(.025,null,true)}"""
        )
        xy = page.evaluate(
            """()=>{const r=__pd.game.r,q=r.w(80,0,31),c=__pd.game.screen.canvas.getBoundingClientRect();return [c.left+q[0]/__pd.game.W*c.width,c.top+q[1]/__pd.game.H*c.height]}"""
        )
        page.mouse.move(*xy)
        page.mouse.down(button="left")
        advance(page, 0.5)
        s.ok(
            page.evaluate(
                '__pd.mine.players[1].down && __pd.mine.players[0].rescueT>.4 && __pd.controls.mouseAction?.type==="rescue"'
            ),
            "Mouse hold did not begin a real timed rescue with marker priority",
        )
        # Pointer drift retains the captured target; the miner still has to remain near it.
        page.mouse.move(xy[0] + 160, xy[1] - 80)
        advance(page, 1.0)
        s.ok(
            page.evaluate(
                "!__pd.mine.players[1].down && __pd.mine.players[1].hp===2 && __pd.mine.stats.rescues===1 && __pd.mine.players[0].tool===6 && __pd.mine.stats.chops===0 && !__pd.mine.features.jam"
            ),
            "Mouse rescue did not complete once through native rules without chopping or door activation",
        )
        page.mouse.up(button="left")
        advance(page, 0.3)
        s.ok(
            page.evaluate(
                "__pd.controls.mouseAction===null && __pd.controls.queuedMouseAction===null && __pd.mine.players[0].rescueT===0 && __pd.mine.stats.rescues===1 && __pd.mine.players[0].tool===6"
            ),
            "Released mouse rescue left a held action or duplicate reward",
        )
        # Solo keeps Mouse0 bound to Chop; two-keyboard mode has its own native bindings.
        # Clicking away from contextual targets still makes one ordinary, free miss.
        reset_play(page)
        elsewhere = page.evaluate(
            """()=>{const r=__pd.game.r,q=r.w(260,0,80),c=__pd.game.screen.canvas.getBoundingClientRect();return [c.left+q[0]/__pd.game.W*c.width,c.top+q[1]/__pd.game.H*c.height]}"""
        )
        page.mouse.click(*elsewhere)
        advance(page, 0.2)
        s.ok(
            page.evaluate(
                '__pd.mine.features.swing===1 && __pd.mine.players[0].actionKind==="chop" && __pd.mine.players[0].tool===6'
            ),
            "A mouse click missing context targets failed to swing normally",
        )

    s.check(
        "mouse held rescue, target priority, release and ordinary miss", mouse_rescue
    )

    def keyboard_pause():
        page.keyboard.press("Escape")
        advance(page, 0.03)
        s.ok(
            page.evaluate('__pd.game.paused && __pd.ui.screen==="pause"'),
            "Escape did not pause",
        )
        t = page.evaluate("__pd.mine.tick")
        advance(page, 0.5)
        s.ok(page.evaluate("__pd.mine.tick") == t, "Standalone pause advanced world")
        advance(page, 0, True)
        capture(page, "pause-tv.png")
        page.get_by_role("button", name="Resume", exact=False).click()
        advance(page, 0.04)
        s.ok(
            page.evaluate("!__pd.game.paused && __pd.ui.screen===null"),
            "Resume did not restore play",
        )

    s.check("keyboard pause and clickable resume", keyboard_pause)
    s.check(
        "no page or native game errors after keyboard/mouse",
        lambda: s.ok(not errors and not page.evaluate("__pd.game.errors"), str(errors)),
    )


def pads_and_menus(s, page, errors):
    def pad_title():
        tap_pad(page, 9)
        s.ok(
            page.evaluate('__pd.app.state==="title" && __pd.ui.screen==="title"'),
            "Options hid the root title navigation",
        )
        tap_pad(page, 13)
        s.ok(
            page.evaluate(
                '__pd.game.input.padIndex===0 && __pd.game.input.lastDevice==="gamepad"'
            ),
            "Pad not assigned to P1",
        )
        s.ok(
            page.evaluate('__pd.game.input.label("jump")==="✕"'),
            "Default controller glyph is not PlayStation",
        )
        pad_choose(page, "Chamber practice")
        s.ok(page.evaluate("__pd.ui.screen") == "practice", "Pad did not open practice")
        tap_pad(page, 9)
        s.ok(
            page.evaluate('__pd.app.state==="title" && __pd.ui.screen==="title"'),
            "Options did not restore the title behind practice",
        )
        pad_choose(page, "Chamber practice")
        pad_choose(page, "03 · The Motherload")
        s.ok(
            page.evaluate("__pd.mine.chamber===2 && __pd.mine.practice"),
            "Pad could not launch third chamber practice",
        )

    s.check("standard-mapping pad title and practice", pad_title)

    def pad_options():
        tap_pad(page, 9)
        s.ok(page.evaluate("__pd.ui.screen") == "pause", "Options did not open pause")
        pad_choose(page, "Settings & controls")
        s.ok(page.evaluate("__pd.ui.screen") == "options", "Pad options path failed")
        pad_choose(page, "Settings")
        s.ok(
            page.evaluate("__pd.ui.screen") == "preferences", "Pad settings path failed"
        )
        pad_choose(page, re.compile("Music", re.IGNORECASE), role="slider")
        old = page.evaluate("__pd.game.settings.music")
        tap_pad(page, 15)
        s.ok(
            page.evaluate("__pd.game.settings.music") > old,
            "Pad slider right did not increase music",
        )
        pad_choose(page, "Next · Comfort")
        pad_choose(page, "Next · Controller")
        pad_choose(page, re.compile("Button symbols: PlayStation"))
        for _ in range(5):
            if page.evaluate("__pd.game.settings.glyphs") == "xbox":
                break
            tap_pad(page, 0)
        s.ok(
            page.evaluate("__pd.game.settings.glyphs") == "xbox",
            "Pad could not choose Xbox glyphs",
        )
        s.ok(
            page.evaluate('__pd.game.input.label("jump")==="A"'),
            "Xbox glyph change not reflected in prompts",
        )
        pad_choose(page, "Controls & rebinding")
        s.ok(
            page.evaluate("__pd.ui.screen") == "controls",
            "Pad controls screen unreachable",
        )
        pad_choose(page, re.compile("Chop, controller:"))
        tap_pad(page, 4)
        s.ok(
            page.evaluate('__pd.game.input.bindings.attack.pad[0]==="Pad4"'),
            "Pad rebind did not capture L1",
        )
        tap_pad(page, 1)
        s.ok(
            page.evaluate("__pd.ui.screen") == "preferences",
            "Cancel did not restore parent settings",
        )

    s.check("pad-only pause/options/sliders/glyphs/rebinding", pad_options)

    def persistence():
        page.reload()
        page.wait_for_function("window.__pd")
        page.evaluate("__pd.game.stop()")
        tap_pad(page, 13)
        s.ok(
            page.evaluate(
                '__pd.game.input.bindings.attack.pad[0]==="Pad4" && __pd.game.settings.glyphs==="xbox"'
            ),
            "Bindings or glyphs lost across reload",
        )
        # Reset through the native UI, leaving every later test on defaults.
        pad_choose(page, "Options & About")
        pad_choose(page, "Controls & rebinding")
        pad_choose(page, "Restore defaults")
        tap_pad(page, 1)
        tap_pad(page, 1)
        s.ok(
            page.evaluate("__pd.ui.screen") == "title",
            "Pad back navigation did not restore title",
        )

    s.check("native rebind and glyph persistence", persistence)

    def about_and_developer():
        pad_choose(page, re.compile("Start expedition"))
        tap_pad(page, 9)
        pad_choose(page, "About / Credits")
        for _ in range(8):
            s.ok(
                page.evaluate("__pd.ui.screen") == "about",
                "Pad About pagination left credits",
            )
            pad_choose(page, re.compile("Next page|Back to first page"))
        advance(page, 0, True)
        capture(page, "about-tv.png")
        tap_pad(page, 1)
        pad_choose(page, "Developer")
        s.ok(
            page.evaluate('__pd.mine.developer && __pd.ui.screen==="developer"'),
            "Pause Developer unreachable or records still enabled",
        )
        advance(page, 0, True)
        capture(page, "developer-tv.png")
        pad_choose(page, "Live balance sliders")
        slider = page.get_by_role("slider").first.get_attribute("aria-label")
        pad_choose(page, slider, role="slider")
        before = page.evaluate("__pd.mine.tuning.moveSpeed")
        tap_pad(page, 15)
        s.ok(
            page.evaluate("__pd.mine.tuning.moveSpeed") > before,
            "Live slider did not affect native simulation",
        )
        pad_choose(page, "Reset ALL defaults")
        s.ok(
            page.evaluate("__pd.mine.tuning.moveSpeed===PD.TUNING.moveSpeed.value"),
            "Reset did not restore tuning",
        )
        for _ in range(3):
            pad_choose(page, "Next page")
        tap_pad(page, 1)
        pad_choose(page, "Tools & supplies")
        pad_choose(page, "Grant fresh pick")
        tap_pad(page, 1)
        pad_choose(page, "Hazards & instruments")
        pad_choose(page, "Spawn next ore family")
        pad_choose(page, "Purge rocks & supplies")
        tap_pad(page, 1)
        pad_choose(page, "Chamber, route & replay")
        s.ok(
            page.evaluate("__pd.ui.screen") == "devChamber",
            "Developer launcher unreachable",
        )
        tap_pad(page, 1)
        tap_pad(page, 1)
        pad_choose(page, "How to work the mine")
        tap_pad(page, 1)
        pad_choose(page, "Resume")
        s.ok(
            page.evaluate(
                '__pd.app.state==="play" && __pd.ui.screen===null && !__pd.game.paused'
            ),
            "Pad could not return to play",
        )

    s.check("pad-only paginated About and every Developer panel", about_and_developer)

    def ownership():
        reset_play(page)
        page.evaluate(
            """()=>{__pads.push({id:'Second DualSense',index:1,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))});}"""
        )
        tap_pad(page, 9, 1)
        s.ok(
            page.evaluate(
                "__pd.game.players.length===2 && __pd.mine.players.length===2"
            ),
            "Second pad did not join during entry",
        )
        s.ok(
            page.evaluate(
                "__pd.game.players[0].padIndex===0 && __pd.game.players[1].pad===1"
            ),
            "Second pad stole P1 ownership",
        )
        old = page.evaluate("__pd.mine.players.map(p=>p.body.x)")
        page.evaluate(
            """()=>{__pads[1].axes[0]=1;__pd.advance(.35);__pads[1].axes[0]=0;__pd.advance(.025)}"""
        )
        new = page.evaluate("__pd.mine.players.map(p=>p.body.x)")
        s.ok(
            abs(new[0] - old[0]) < 2 and new[1] > old[1] + 20,
            "Separate pad movement ownership failed",
        )
        page.evaluate("""()=>{__pads[1].connected=false;__pd.advance(.025)}""")
        s.ok(
            page.evaluate("__pd.game.paused"),
            "Controller disconnect did not pause local play",
        )
        page.evaluate("""()=>{__pads[1].connected=true;__pads[1].timestamp++;}""")
        tap_pad(page, 0, 1)
        tap_pad(page, 0, 0)
        s.ok(
            page.evaluate("!__pd.game.paused"),
            "P1 could not recover from partner controller disconnect",
        )

    s.check("two-pad ownership, join and disconnect recovery", ownership)

    def results():
        page.evaluate("__pd.title();__pd.start()")
        result = page.evaluate("__pd.script(0,900)")
        s.ok(
            result["status"] == "victory"
            and page.evaluate("__pd.ui.screen") == "results",
            "Browser canonical normal-input expedition did not reach results",
        )
        for feature in [
            "break",
            "pick",
            "key",
            "door",
            "redirect",
            "waveClear",
            "victory",
        ]:
            s.ok(
                result["features"].get(feature, 0) > 0,
                f"Full browser expedition omitted {feature}",
            )
        pad_choose(page, "Chamber practice")
        tap_pad(page, 1)
        pad_choose(page, "Another spectacular payday")
        s.ok(
            page.evaluate(
                '__pd.app.state==="play" && __pd.mine.chamber===0 && __pd.mine.score===0'
            ),
            "Pad replay did not start clean",
        )
        replay = page.evaluate("__pd.script(0,900)")
        s.ok(replay["status"] == "victory", "Replay did not complete the expedition")
        tap_pad(page, 9)
        s.ok(
            page.evaluate('__pd.app.state==="title" && __pd.ui.screen==="title"'),
            "Options hid results without restoring title navigation",
        )

    s.check("browser normal-input expedition, results and pad replay", results)

    def local_coop_start_and_leave():
        page.evaluate("__pd.title()")
        pad_choose(page, "Local co-op")
        pad_choose(page, "Start local co-op")
        s.ok(
            page.evaluate(
                "__pd.game.players.length===2 && __pd.mine.players.length===2 && __pd.mine.players[0].id!==__pd.mine.players[1].id"
            ),
            "Local co-op start did not create two native inputs and two distinct miners",
        )
        old = page.evaluate("__pd.mine.players.map(p=>p.body.x)")
        page.evaluate(
            """()=>{__pads[1].axes[0]=1;__pd.advance(.3);__pads[1].axes[0]=0;__pd.advance(.025)}"""
        )
        new = page.evaluate("__pd.mine.players.map(p=>p.body.x)")
        s.ok(
            abs(new[0] - old[0]) < 2 and new[1] > old[1] + 15,
            "Precreated local-coop P2 could not move independently",
        )
        # Test setup: isolate the carrier-departure path, without advancing progression.
        page.evaluate("__pd.mine.key=null;__pd.mine.keyOwner=1")
        tap_pad(page, 9)
        pad_choose(page, "Settings & controls")
        pad_choose(page, "Controller ownership")
        s.ok(
            page.evaluate("__pd.ui.screen") == "ownership",
            "Controller ownership panel unreachable by pad",
        )
        tap_pad(page, 1)
        tap_pad(page, 1)
        pad_choose(page, "Checkpoint & title")
        pad_choose(page, "Partner leaves the shift")
        s.ok(
            page.evaluate(
                "__pd.game.players.length===1 && __pd.mine.players.length===1 && (__pd.mine.key?.recovered || __pd.mine.keyOwner===0) && __pd.mine.features.keyLost>0"
            ),
            "Partner dropout failed to remove input/miner and recover shared key",
        )

    s.check(
        "local-coop bootstrap, independent P2, ownership panel and carrier dropout",
        local_coop_start_and_leave,
    )
    s.check(
        "no page/native errors after pad paths",
        lambda: s.ok(not errors and not page.evaluate("__pd.game.errors"), str(errors)),
    )


def attract_and_audio(s, page):
    def boundary():
        page.evaluate(
            '__pd.title();__pd.game.settings.set("music",.1);__pd.game.settings.set("glyphs","playstation")'
        )
        before = page.evaluate("window.__attractBest=__pd.snapshot().best")
        advance(page, 9.99)
        s.ok(
            page.evaluate("__pd.app.state") == "title",
            "Attract started before 10 seconds",
        )
        advance(page, 0.02)
        s.ok(
            page.evaluate("__pd.app.state") == "attract",
            "Attract did not start at 10 seconds",
        )
        s.ok(
            page.evaluate("__pd.snapshot().best") == before,
            "Attract modified completed record",
        )

    s.check("exact native-clock ten-second attract boundary", boundary)

    def coverage():
        result = page.evaluate(
            """()=>{const seen={},chambers=new Set();let loops=0,prior=__pd.mine;for(let i=0;i<260;i++){__pd.advance(1);for(const [k,v] of Object.entries(__pd.mine.features))seen[k]=Math.max(seen[k]||0,v);chambers.add(__pd.mine.chamber);if(__pd.mine!==prior){loops++;prior=__pd.mine;}if(loops&&Object.keys(seen).includes('waveClear'))break;}return {seen,chambers:[...chambers],loops,state:__pd.app.state,best:__pd.snapshot().best}}"""
        )
        for feature in [
            "jump",
            "duck",
            "break",
            "pick",
            "redirect",
            "collision",
            "key",
            "door",
            "climb",
            "waveClear",
        ]:
            s.ok(
                result["seen"].get(feature, 0) > 0,
                f"Attract did not demonstrate {feature}: {result}",
            )
        s.ok(
            len(result["chambers"]) == 3 and result["loops"] > 0,
            "Attract did not traverse three rooms and loop",
        )
        s.ok(
            page.evaluate("__pd.snapshot().best===window.__attractBest"),
            "Complete attract loop modified saved record",
        )

    s.check("real attract traversal, systems and loop", coverage)

    def wake_keyboard():
        page.keyboard.down("Enter")
        advance(page, 0.03)
        page.keyboard.up("Enter")
        advance(page, 0.15)
        s.ok(
            page.evaluate('__pd.app.state==="title" && __pd.ui.screen==="title"'),
            "Keyboard wake leaked accept into a real run",
        )
        s.ok(
            page.evaluate("__pd.mine.score===0 && !__pd.mine.attract"),
            "Wake did not restore clean title mine",
        )

    s.check("attract keyboard wake and consumption", wake_keyboard)

    def wake_pad():
        page.evaluate("__pd.title()")
        advance(page, 10.01)
        tap_pad(page, 0)
        advance(page, 0.15)
        s.ok(
            page.evaluate('__pd.app.state==="title" && __pd.ui.screen==="title"'),
            "Pad wake leaked accept or did not exit demo",
        )

    s.check("attract gamepad wake and consumption", wake_pad)

    def offline():
        result = page.evaluate("__pd.audio.renderProof()")
        s.ok(
            result["available"] and result["defaultMusicGain"] == 0.1,
            "Offline audio proof unavailable or wrong default",
        )
        for k in ["music", "sfx", "voice", "total"]:
            s.ok(result["channels"][k]["rms"] > 1e-5, f"{k} bus silent")
        s.ok(
            result["peakBounded"]
            and result["mutePeak"] == 0
            and result["voiceOffPeak"] == 0
            and result["cleanupPeak"] == 0,
            "Audio bound/mute/voice/cleanup proof failed",
        )

    s.check(
        "offline coded audio buses, mute, voice-off, bounds and tail cleanup", offline
    )

    def live():
        page.keyboard.press("KeyM")
        advance(page, 0.03)
        page.evaluate(
            """()=>{__pd.audio.set({music:.1,sfx:.7,voice:.4,mute:false});__pd.audio.wake();__pd.audio.event({id:'proof-live-key',type:'key'});__pd.audio.update(.1,{chamber:2,pressure:1,relief:0,status:'playing',finale:{wave:1}})}"""
        )
        diag = page.evaluate("__pd.audio.diagnostics()")
        s.ok(
            diag["awakened"] and diag["musicGain"] == 0.1,
            "Gesture did not wake live audio",
        )
        page.evaluate("__pd.audio.set({music:.1,sfx:.7,voice:.4,mute:true})")
        s.ok(page.evaluate("__pd.audio.diagnostics().muted"), "Live mute did not apply")
        page.evaluate("__pd.audio.stop()")
        advance(page, 0.4)
        d = page.evaluate("__pd.audio.diagnostics()")
        s.ok(
            d["activeSources"] == 0 and d["activeEffects"] == 0 and not d["scheduled"],
            "stop left future audio output scheduled",
        )

    s.check("gesture audio wake, live mute and scheduling cleanup", live)


def touch_checks(s, context, orientation):
    page, errors = boot(context)
    cdp = page.context.new_cdp_session(page)
    active_touches = set()

    def touches(kind, points):
        if kind == "touchEnd" and not active_touches:
            return
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": kind,
                "touchPoints": [
                    {"id": i, "x": x, "y": y, "radiusX": 4, "radiusY": 4, "force": 1}
                    for i, x, y in points
                ],
            },
        )
        if kind == "touchStart":
            active_touches.update(point[0] for point in points)
        elif kind == "touchEnd":
            if points:
                active_touches.difference_update(point[0] for point in points)
            else:
                active_touches.clear()

    def touch_check(name, fn):
        def case():
            try:
                fn()
            finally:
                # A failed assertion must not leave physical CDP fingers held for later cases.
                touches("touchEnd", [])

        s.check(name, case)

    width = page.viewport_size["width"]
    height = page.viewport_size["height"]

    def touch_boot():
        button = page.get_by_role(
            "button", name=re.compile("Start expedition", re.IGNORECASE)
        ).bounding_box()
        page.touchscreen.tap(
            button["x"] + button["width"] / 2, button["y"] + button["height"] / 2
        )
        advance(page, 0.05, True)
        s.ok(
            page.evaluate('__pd.app.state==="play" && __pd.ui.screen===null'),
            "Touch did not activate title Start",
        )

    touch_check(f"{orientation} touch-only title start", touch_boot)

    def multitouch():
        page.evaluate(
            """()=>{const m=__pd.mine,p=m.players[0];m.relief=0;m.nextSpawn=m.nextPair=100000;p.invuln=100000;p.body.x=140;p.body.z=16;p.body.vx=p.body.vz=0;__pd.advance(.03,null,true)}"""
        )
        y = height * 0.72
        left = width * 0.2
        right = width * 0.78
        touches("touchStart", [(1, left, y)])
        touches("touchMove", [(1, left + 45, y)])
        advance(page, 0.2)
        x = page.evaluate("__pd.mine.players[0].body.x")
        touches("touchStart", [(1, left + 45, y), (2, right, y)])
        advance(page, 0.12)
        s.ok(
            page.evaluate("__pd.mine.players[0].body.z") > 24,
            "Second right thumb did not jump while movement held",
        )
        s.ok(
            page.evaluate("__pd.mine.players[0].body.x") > x + 5,
            "Left movement stopped during simultaneous jump",
        )
        s.ok(
            page.evaluate(
                "__pd.controls.fingers.size===2 && __pd.controls.stick.id!==__pd.controls.jumpId"
            ),
            "Multitouch pointer ownership collapsed",
        )
        touches("touchEnd", [(2, right, y)])
        advance(page, 0.05)
        s.ok(
            page.evaluate("__pd.controls.stick!==null && __pd.controls.jumpId===null"),
            "Lifting action finger lost movement ownership",
        )
        touches("touchEnd", [])
        advance(page, 0.7)
        # Down gesture ducks away from a ladder.
        touches("touchStart", [(3, left, y)])
        touches("touchMove", [(3, left, y + 38)])
        advance(page, 0.08)
        s.ok(
            page.evaluate("__pd.mine.players[0].body.crouching"),
            "Touch down did not duck",
        )
        touches("touchEnd", [])
        advance(page, 0.05)

    touch_check(
        f"{orientation} actual CDP multitouch movement, jump and duck", multitouch
    )

    def bubble():
        page.evaluate(
            """()=>{const p=__pd.mine.players[0];p.body.x=60;p.body.z=16;p.body.vx=p.body.vz=0;p.body.facing=-1;p.body.climbing=false;__pd.advance(.04,null,true)}"""
        )
        # A real touch identifies the device and exposes the context bubble.
        touches("touchStart", [(4, width * 0.18, height * 0.70)])
        advance(page, 0.03)
        s.ok(
            page.locator("#context").is_visible(),
            "In-range touch context bubble did not appear",
        )
        box = page.locator("#context").bounding_box()
        x = box["x"] + box["width"] / 2
        y = box["y"] + box["height"] / 2
        touches("touchStart", [(4, width * 0.18, height * 0.70), (5, x, y)])
        advance(page, 0.08)
        s.ok(
            page.evaluate("__pd.mine.features.jam>0"),
            "Touch door bubble did not use deliberate interaction",
        )
        s.ok(
            page.evaluate(
                '__pd.controls.action?.type==="door" && __pd.controls.stick!==null'
            ),
            "Context target did not remain held beside movement finger",
        )
        touches("touchEnd", [(5, x, y)])
        touches("touchEnd", [])
        advance(page, 0.1)
        advance(page, 0, True)
        capture(page, f"touch-{orientation}.png")

    touch_check(f"{orientation} touch context target and simultaneous action", bubble)

    def touch_pause():
        page.locator("#menu-button").tap()
        advance(page, 0.03)
        s.ok(
            page.evaluate('__pd.game.paused && __pd.ui.screen==="pause"'),
            "Touch menu did not pause",
        )
        page.get_by_role("button", name="Resume", exact=False).tap()
        advance(page, 0.03)
        s.ok(
            page.evaluate("!__pd.game.paused && __pd.ui.screen===null"),
            "Touch could not resume",
        )

    touch_check(f"{orientation} touch-only menu/resume", touch_pause)

    def quick_context():
        page.evaluate(
            """()=>{__pd.start();const m=__pd.mine,p=m.players[0];m.relief=0;m.nextSpawn=m.nextPair=100000;p.invuln=100000;p.body.x=60;p.body.facing=-1;}"""
        )
        page.touchscreen.tap(width * 0.18, height * 0.70)
        advance(page, 0.03)
        page.locator("#context").tap()
        advance(page, 0.06)
        s.ok(
            page.evaluate("__pd.mine.features.jam===1"),
            "Short context tap released before next tick lost its interaction edge",
        )
        advance(page, 1.2)
        s.ok(
            page.evaluate("__pd.mine.features.jam===1"),
            "Short context tap latched interaction or replayed its edge",
        )

    touch_check(
        f"{orientation} short touch context press survives release once", quick_context
    )

    def assisted_redirect():
        page.evaluate(
            """()=>{__pd.start();const m=__pd.mine,p=m.players[0];m.relief=0;m.nextSpawn=m.nextPair=100000;p.invuln=100000;p.body.x=140;p.body.facing=1;}"""
        )
        page.touchscreen.tap(width * 0.18, height * 0.70)
        advance(page, 0.03)
        page.evaluate('__pd.mine.spawnRock("ore",174,26,0)')
        advance(page, 0.025)
        s.ok(
            page.locator("#context").is_visible()
            and page.locator("#context").get_attribute("data-kind") == "redirect",
            "Reachable rock did not expose redirect bubble",
        )
        box = page.locator("#context").bounding_box()
        x = box["x"] + box["width"] / 2
        y = box["y"] + box["height"] / 2
        touches("touchStart", [(6, x, y)])
        advance(page, 0.18)
        s.ok(
            page.evaluate(
                "__pd.mine.stats.redirects===1 && __pd.mine.stats.chops===0 && __pd.mine.players[0].tool===5"
            ),
            "Assisted chop preempted deliberate touch redirect during anticipation",
        )
        touches("touchEnd", [])

    touch_check(
        f"{orientation} deliberate touch redirect takes priority over assisted chop",
        assisted_redirect,
    )

    def touch_wake():
        page.evaluate("__pd.title()")
        advance(page, 10.01)
        s.ok(
            page.evaluate("__pd.app.state") == "attract",
            "Touch test demo did not start",
        )
        page.touchscreen.tap(width * 0.8, height * 0.7)
        advance(page, 0.15)
        s.ok(
            page.evaluate('__pd.app.state==="title" && __pd.ui.screen==="title"'),
            "Touch wake leaked action: "
            + str(page.evaluate("({state:__pd.app.state,screen:__pd.ui.screen})")),
        )

    touch_check(f"{orientation} attract touch wake consumed", touch_wake)
    touch_check(
        f"{orientation} no browser/native errors",
        lambda: s.ok(not errors and not page.evaluate("__pd.game.errors"), str(errors)),
    )
    page.evaluate("__pd.end()")
    page.close()


def main():
    s = Suite()
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page, errors = boot(context)
            keyboard_and_mouse(s, page, errors)
            page.evaluate("__pd.end()")
            context.close()
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page, errors = boot(context, pad=True)
            pads_and_menus(s, page, errors)
            attract_and_audio(s, page)
            s.check(
                "final native/browser error collection",
                lambda: s.ok(
                    not errors and not page.evaluate("__pd.game.errors"), str(errors)
                ),
            )
            page.evaluate("__pd.end()")
            context.close()
            for name, w, h in [("portrait", 390, 844), ("landscape", 844, 390)]:
                context = browser.new_context(
                    viewport={"width": w, "height": h},
                    is_mobile=True,
                    has_touch=True,
                    device_scale_factor=1,
                )
                touch_checks(s, context, name)
                context.close()
        except Exception as e:  # noqa: BLE001 - aggregate independent test failures and close browsers
            s.failures.append("browser runner: " + str(e).splitlines()[0])
        finally:
            browser.close()
        # WebKit is a browser stand-in, not a claim of testing actual iOS hardware.
        browser = p.webkit.launch(headless=True)
        try:
            context = browser.new_context(
                viewport={"width": 390, "height": 844},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            page, errors = boot(context)

            def webkit_phone():
                page.get_by_role(
                    "button", name=re.compile("Start expedition", re.IGNORECASE)
                ).tap()
                advance(page, 0.15, True)
                s.ok(
                    page.evaluate('__pd.app.state==="play" && __pd.mine.tick>0'),
                    "WebKit phone did not start native mine",
                )
                s.ok(not errors and not page.evaluate("__pd.game.errors"), str(errors))
                capture(page, "webkit-phone.png")

            s.check("WebKit phone file launch/touch/renderer", webkit_phone)
            page.evaluate("__pd.end()")
            context.close()
        except Exception as e:  # noqa: BLE001 - aggregate independent test failures
            s.failures.append("WebKit runner: " + str(e).splitlines()[0])
        finally:
            browser.close()
    print(json.dumps({"count": s.count, "failures": s.failures}))
    return bool(s.failures)


if __name__ == "__main__":
    raise SystemExit(main())
