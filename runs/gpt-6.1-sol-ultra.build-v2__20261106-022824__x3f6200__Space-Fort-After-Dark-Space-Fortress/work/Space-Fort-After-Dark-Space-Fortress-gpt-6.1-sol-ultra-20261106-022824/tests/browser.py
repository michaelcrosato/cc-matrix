"""Packaged standalone UI/input checks with browser-emulated devices."""

import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

PAD_SCRIPT = """
window.__pad={id:'Synthetic DualSense',index:0,connected:true,mapping:'standard',timestamp:1,
  axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
window.__pads=[__pad];
Object.defineProperty(navigator,'getGamepads',{value:()=>__pads.filter(p=>p.connected)});
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--report", type=Path, default=Path("docs/browser-report.json"))
    args = parser.parse_args()
    records = []
    page_errors = []
    engine_errors = []
    requests = []
    contexts = []
    artifact = args.artifact.resolve()

    def check(name, fn):
        try:
            detail = fn()
            records.append({"name": name, "pass": True, "detail": detail or ""})
        except (
            AssertionError,
            PlaywrightError,
            ValueError,
            KeyError,
            TypeError,
        ) as error:
            records.append({"name": name, "pass": False, "detail": str(error)})

    def require(condition, message):
        if not condition:
            raise AssertionError(message)

    def pump(page, seconds=0.05):
        page.evaluate("s=>__game.advance(s,{draw:true})", seconds)

    def key(page, name):
        page.keyboard.down(name)
        pump(page, 0.025)
        page.keyboard.up(name)
        pump(page, 0.025)

    def pad(page, index):
        page.evaluate(
            "i=>{__pad.buttons[i]={pressed:true,value:1,touched:true};__pad.timestamp++}",
            index,
        )
        pump(page, 0.025)
        page.evaluate(
            "i=>{__pad.buttons[i]={pressed:false,value:0,touched:false};__pad.timestamp++}",
            index,
        )
        pump(page, 0.025)

    def second_pad(page, index):
        page.evaluate(
            "i=>{__pads[1].buttons[i]={pressed:true,value:1,touched:true};__pads[1].timestamp++}",
            index,
        )
        pump(page, 0.025)
        page.evaluate(
            "i=>{__pads[1].buttons[i]={pressed:false,value:0,touched:false};__pads[1].timestamp++}",
            index,
        )
        pump(page, 0.025)

    def pad_to(page, text, *, label=False):
        for _ in range(100):
            found = page.evaluate(
                "q=>{const e=document.activeElement;return !!e&&(q.label?(e.getAttribute('aria-label')||'').startsWith(q.text):(e.textContent||'').trim().startsWith(q.text))}",
                {"text": text, "label": label},
            )
            if found:
                return
            pad(page, 13)
        raise AssertionError(f"Pad could not reach {text}")

    def title(page):
        page.evaluate("__game.debug.title();__game.debug.manual(true)")
        pump(page)
        page.evaluate("__siege.activity()")

    def close_page(page):
        engine_errors.extend(page.evaluate("__game.errors"))
        page.context.close()

    def start(page):
        title(page)
        page.get_by_role("button", name="Play siege", exact=True).click()
        pump(page, 4.1)
        require(
            page.evaluate("__siege.world.s.state === 'play'"),
            "Play did not reach combat",
        )

    def open_page(browser, *, touch=False, width=1920, height=1080, pad_device=False):
        context = browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=1,
            has_touch=touch,
            is_mobile=touch,
        )
        contexts.append(context)
        if pad_device:
            context.add_init_script(PAD_SCRIPT)
        page = context.new_page()
        page.set_default_timeout(1800)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        page.goto(artifact.as_uri(), wait_until="load")
        page.wait_for_function(
            "document.body.dataset.ready === 'true' && !!window.__game?.debug?.manual",
            timeout=20000,
        )
        page.evaluate("__game.debug.manual(true)")
        pump(page)
        return page

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = open_page(browser)

            def title_focus():
                require(
                    page.evaluate("__siege.shell.screen === 'title'"), "Title missing"
                )
                require(
                    page.evaluate(
                        "document.activeElement.textContent.trim() === 'Play siege'"
                    ),
                    "Primary action has no initial focus",
                )
                page.get_by_role("button", name="Settings", exact=True).hover()
                require(
                    page.evaluate(
                        "document.activeElement.textContent.trim() === 'Settings'"
                    ),
                    "Hover did not establish focus",
                )

            check("title primary focus and native mouse hover focus", title_focus)

            def settings():
                page.get_by_role("button", name="Settings", exact=True).click()
                pump(page)
                music = page.get_by_role("slider", name="Music", exact=True)
                require(music.count() == 1, "Music slider unavailable")
                music.fill("0.35")
                require(
                    page.evaluate("Math.abs(__game.settings.music-.35)<.001"),
                    "Slider did not adjust native setting",
                )
                music.fill("1")
                key(page, "ArrowRight")
                require(
                    page.evaluate("__game.settings.music<=1"),
                    "Setting exceeded upper bound",
                )
                music.fill("0.1")
                symbols = page.get_by_role(
                    "button", name=re.compile("^Button symbols:")
                )
                for _ in range(6):
                    if page.evaluate("__game.settings.glyphs === 'xbox'"):
                        break
                    symbols.click()
                require(
                    page.evaluate("__game.settings.glyphs === 'xbox'"),
                    "Xbox symbols unavailable",
                )
                key(page, "Escape")
                require(
                    page.evaluate("__siege.shell.screen === 'title'"),
                    "Escape did not return to title",
                )

            check("settings sliders clamp and glyph choice is reachable", settings)

            def keyboard_move():
                start(page)
                require(
                    page.evaluate(
                        "!__siege.world.s.modified && __siege.world.s.players[0].invuln>0"
                    ),
                    "Ordinary launch marked the run modified or lost initial protection",
                )
                before = page.evaluate("__siege.world.s.players[0].x")
                page.keyboard.down("d")
                pump(page, 0.55)
                page.keyboard.up("d")
                pump(page)
                after = page.evaluate("__siege.world.s.players[0].x")
                require(
                    after > before + 30, f"WASD did not thrust: {before} -> {after}"
                )
                require(
                    page.evaluate("__game.input.lastDevice === 'keyboard'"),
                    "Keyboard prompt source did not update",
                )

            check("real keyboard thrust moves the interceptor", keyboard_move)

            def mouse_combat():
                position = page.evaluate(
                    "(()=>{const c=__game.screen;const r=c.canvas.getBoundingClientRect();return [r.left+(800*c.S+c.OX)/c.dpr,r.top+(140*c.S+c.OY)/c.dpr]})()"
                )
                page.mouse.move(*position)
                page.mouse.down()
                pump(page, 0.25)
                page.mouse.up()
                pump(page)
                result = page.evaluate(
                    "({shots:__siege.world.s.shots.filter(q=>q.owner===0).length,angle:__siege.world.s.players[0].angle,device:__game.input.lastDevice})"
                )
                require(
                    result["shots"] > 0 and -1.7 < result["angle"] < -0.1,
                    f"Mouse fire/aim failed: {result}",
                )
                require(result["device"] == "mouse", "Mouse glyphs not selected")

            check("real mouse aims and fires through the arena transform", mouse_combat)

            def abilities():
                energy = page.evaluate("__siege.world.s.players[0].energy")
                key(page, "Space")
                require(
                    page.evaluate("__siege.world.s.players[0].energy") < energy - 20,
                    "Boost did not consume reserve",
                )
                page.mouse.down(button="right")
                pump(page)
                page.mouse.up(button="right")
                pump(page)
                require(
                    page.evaluate("__siege.world.s.players[0].pulse > 0"),
                    "Right mouse did not trigger defensive pulse",
                )

            check(
                "keyboard boost and right mouse pulse use real action bindings",
                abilities,
            )

            def resize_aim():
                page.set_viewport_size({"width": 1280, "height": 800})
                page.wait_for_function(
                    "Math.abs(__game.screen.canvas.width-innerWidth*Math.min(devicePixelRatio,3))<2 && Math.abs(__game.screen.canvas.height-innerHeight*Math.min(devicePixelRatio,3))<2"
                )
                pump(page)
                position = page.evaluate(
                    "(()=>{const c=__game.screen,r=c.canvas.getBoundingClientRect(),p=__siege.world.s.players[0];return [r.left+((p.x+180)*c.S+c.OX)/c.dpr,r.top+((p.y-180)*c.S+c.OY)/c.dpr]})()"
                )
                page.mouse.move(*position)
                pump(page)
                angle = page.evaluate("__siege.world.s.players[0].angle")
                require(abs(angle + 0.7854) < 0.08, f"Resized aim jumped: {angle}")
                require(
                    page.evaluate("__game.W===960 && __game.H===540"),
                    "Viewport resize changed logical arena",
                )

            check("resize preserves full logical arena and world aim", resize_aim)

            def pause_freeze():
                key(page, "Escape")
                require(
                    page.evaluate("__game.paused && __siege.shell.screen==='pause'"),
                    "Escape failed to open pause",
                )
                tick = page.evaluate("__siege.world.s.tick")
                pump(page, 0.8)
                require(
                    page.evaluate("__siege.world.s.tick") == tick,
                    "Standalone pause advanced simulation",
                )

            check("standalone pause freezes the simulation", pause_freeze)

            def rebind():
                page.get_by_role("button", name="Controls", exact=True).click()
                pump(page)
                bind = page.get_by_role("button", name=re.compile("^Laser, keyboard:"))
                require(bind.count() == 1, "Laser rebinding is not exposed")
                bind.click()
                key(page, "r")
                require(
                    page.evaluate("__game.input.map.attack.includes('KeyR')"),
                    "Keyboard rebind did not change action",
                )
                require(
                    "R"
                    in page.get_by_role(
                        "button", name=re.compile("^Laser, keyboard:")
                    ).inner_text(),
                    "Displayed rebind label is stale",
                )
                page.get_by_role("button", name="Restore defaults", exact=True).click()
                pump(page)
                require(
                    page.evaluate("__game.input.map.attack.includes('Mouse0')"),
                    "Binding defaults failed",
                )
                page.get_by_role("button", name="Back", exact=True).last.click()
                pump(page)

            check(
                "native control rebinding changes displayed labels and restores defaults",
                rebind,
            )

            def dev_sliders():
                if page.evaluate("__siege.shell.screen") != "pause":
                    page.evaluate("__siege.shell.back()")
                    pump(page)
                page.get_by_role("button", name="Dev mode", exact=True).click()
                pump(page)
                thrust = page.get_by_role("slider", name="Thrust", exact=True)
                thrust.fill("800")
                require(
                    page.evaluate(
                        "__siege.world.balance.thrust===800 && __siege.world.s.modified"
                    ),
                    "Live balance slider did not update authoritative state",
                )
                page.get_by_role(
                    "button", name="Single step (1/120 s)", exact=True
                ).click()
                before = page.evaluate("__siege.world.s.tick")
                page.get_by_role(
                    "button", name="Single step (1/120 s)", exact=True
                ).click()
                require(
                    page.evaluate("__siege.world.s.tick") == before + 1,
                    "Single-step did not advance exactly one tick",
                )
                page.get_by_role(
                    "button", name="Reset balance to defaults", exact=True
                ).click()
                require(
                    page.evaluate(
                        "__siege.world.balance.thrust===SF.DEFAULTS.thrust && __game.settings.devSpeed===1"
                    ),
                    "Reset balance did not restore defaults",
                )
                page.get_by_role("button", name="Back", exact=True).last.click()
                pump(page)
                page.get_by_role("button", name="Resume", exact=True).click()
                pump(page)
                require(
                    page.evaluate("!__game.paused && !__siege.shell.screen"),
                    "Resume failed",
                )

            check(
                "pause-accessible dev sliders, single-step, reset and resume work",
                dev_sliders,
            )

            def results():
                start(page)
                page.evaluate("__game.debug.step(780,true)")
                pump(page)
                require(
                    page.evaluate(
                        "__siege.world.s.result?.won && __siege.shell.screen==='results'"
                    ),
                    "Normal bot win did not present results",
                )
                epoch = page.evaluate("__siege.world.s.epoch")
                page.get_by_role("button", name="Retry siege", exact=True).click()
                pump(page)
                require(
                    page.evaluate("__siege.world.s.epoch") == epoch + 1,
                    "Retry failed to create clean epoch",
                )
                require(
                    page.evaluate(
                        "!__siege.world.s.result && __siege.world.s.score===0 && __siege.world.s.enemies.length===0"
                    ),
                    "Retry retained combat state",
                )
                page.evaluate(
                    "__game.debug.action('boss',2);__siege.world.s.players[0].hp=0"
                )
                pump(page)
                require(
                    page.evaluate(
                        "__siege.world.s.result?.won===false && __siege.shell.screen==='results'"
                    ),
                    "Defeat did not present results",
                )
                page.get_by_role("button", name="Title", exact=True).click()
                pump(page)
                require(
                    page.evaluate("__siege.mode==='title'"),
                    "Results title action failed",
                )

            check("real win and defeat results support clean retry and title", results)

            def couch():
                title(page)
                page.get_by_role("button", name="Co-op", exact=True).click()
                pump(page)
                key(page, "2")
                require(
                    page.evaluate("__game.players.length===2"),
                    "Second keyboard pilot did not join",
                )
                page.get_by_role("button", name="Launch 2 pilots", exact=True).click()
                pump(page, 4.1)
                positions = page.evaluate("__siege.world.s.players.map(p=>p.x)")
                page.keyboard.down("d")
                pump(page, 0.4)
                page.keyboard.up("d")
                moved = page.evaluate("__siege.world.s.players.map(p=>p.x)")
                require(
                    moved[0] > positions[0] + 20 and abs(moved[1] - positions[1]) < 1,
                    "P1 thrust moved the wrong keyboard seat",
                )
                page.keyboard.down("ArrowLeft")
                page.keyboard.down(".")
                pump(page, 0.4)
                page.keyboard.up("ArrowLeft")
                page.keyboard.up(".")
                require(
                    page.evaluate("__siege.world.s.players[1].x") < moved[1] - 20,
                    "P2 arrows did not move independently",
                )
                require(
                    page.evaluate("__siege.world.s.shots.some(q=>q.owner===1)"),
                    "P2 independent fire failed",
                )

            check(
                "couch keyboard joining produces two independent moving and firing ships",
                couch,
            )

            def credits():
                title(page)
                page.get_by_role("button", name="About / Credits", exact=True).click()
                pump(page)
                content = ""
                for _ in range(11):
                    content += page.locator(".esh-sh").inner_text()
                    page.get_by_role("button", name="Next page", exact=True).click()
                    pump(page)
                for section in [
                    "Source Information",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                ]:
                    require(section in content, f"Missing credits section: {section}")
                require(
                    "added on import" in content and "PLAN.md" in content,
                    "Credits omit required factual values",
                )
                source = json.loads(
                    (artifact.parent / "exit-interview.json").read_text()
                )
                require(
                    page.evaluate("SF.ABOUT") == source,
                    "Displayed credits source differs from exit interview",
                )

            check(
                "paged credits expose all required factual feedback and match interview JSON",
                credits,
            )

            def attract_threshold():
                title(page)
                before = page.evaluate(
                    "({best:__siege.best,saved:localStorage.getItem('sfad-best')})"
                )
                pump(page, 9.98)
                require(
                    page.evaluate("!__siege.attract"),
                    "Attract began before ten seconds",
                )
                pump(page, 0.02)
                require(
                    page.evaluate("__siege.attract"),
                    "Attract did not begin at ten seconds",
                )
                stages = []
                for dt in [14.1, 16, 14, 14, 14, 18]:
                    pump(page, dt)
                    stages.append(
                        page.evaluate(
                            "({act:__siege.world.s.act,phase:__siege.world.s.boss?.phase,stage:__siege.demoStage})"
                        )
                    )
                require(
                    any(s["act"] == 1 for s in stages)
                    and any(s["act"] == 2 for s in stages),
                    f"Attract failed to tour all acts: {stages}",
                )
                require(stages[-1]["stage"] == 0, f"Attract failed to loop: {stages}")
                key(page, "q")
                require(
                    page.evaluate("__siege.mode==='title' && !__siege.attract"),
                    "Keyboard did not consume attract exit",
                )
                after = page.evaluate(
                    "({best:__siege.best,saved:localStorage.getItem('sfad-best')})"
                )
                require(
                    before == after, "Attract polluted saved or displayed best score"
                )
                return stages

            check(
                "exact ten-second attract tours every act, loops and cannot save scores",
                attract_threshold,
            )

            def mouse_attract_exit():
                title(page)
                pump(page, 10)
                page.mouse.move(90, 100)
                pump(page)
                require(
                    page.evaluate("__siege.mode==='title' && !__siege.attract"),
                    "Meaningful pointer did not exit attract",
                )

            check(
                "meaningful mouse movement exits attract without starting a run",
                mouse_attract_exit,
            )
            close_page(page)

            pad_page = open_page(browser, pad_device=True)

            def pad_deadzone():
                title(pad_page)
                pad_page.evaluate("__pad.axes=[.05,-.05,.04,.04]")
                pump(pad_page, 9.98)
                require(
                    pad_page.evaluate(
                        "__game.input.lastDevice!=='gamepad' && !__siege.attract"
                    ),
                    "Stick drift changed device or activity",
                )
                pump(pad_page, 0.02)
                require(
                    pad_page.evaluate("__siege.attract"),
                    "Stick drift prevented exact attract timeout",
                )
                pad_page.evaluate("__pad.axes=[.8,0,0,0]")
                pump(pad_page)
                require(
                    pad_page.evaluate("__siege.mode==='title' && !__siege.attract"),
                    "Meaningful stick did not exit attract",
                )
                pad_page.evaluate("__pad.axes=[0,0,0,0]")

            check(
                "synthetic standard-pad deadzone ignores drift and meaningful stick exits attract",
                pad_deadzone,
            )

            def pad_settings():
                pad_to(pad_page, "Settings")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate("__siege.shell.screen==='options'"),
                    "Pad cannot open settings",
                )
                pad_to(pad_page, "Music", label=True)
                value = pad_page.evaluate("__game.settings.music")
                pad(pad_page, 15)
                require(
                    pad_page.evaluate("__game.settings.music") > value,
                    "Pad cannot adjust a focused slider",
                )
                pad_to(pad_page, "Button symbols:", label=True)
                for _ in range(6):
                    if pad_page.evaluate("__game.settings.glyphs==='xbox'"):
                        break
                    pad(pad_page, 15)
                require(
                    pad_page.evaluate(
                        "__game.settings.glyphs==='xbox' && __game.input.label('confirm')==='A'"
                    ),
                    "Xbox prompts do not follow pad setting",
                )
                pad(pad_page, 1)
                require(
                    pad_page.evaluate("__siege.shell.screen==='title'"),
                    "Pad back failed",
                )

            check(
                "pad-only settings navigation adjusts sliders, chooses Xbox glyphs and backs out",
                pad_settings,
            )

            def pad_credits_couch():
                pad_to(pad_page, "About / Credits")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate("__siege.shell.screen==='credits'"),
                    "Pad cannot open credits",
                )
                pad_to(pad_page, "Next page")
                pad(pad_page, 0)
                require(
                    "PAGE 2" in pad_page.locator(".esh-sh").inner_text(),
                    "Pad cannot page credits",
                )
                pad(pad_page, 1)
                # Paging adds a native screen in place, so Circle should return directly to title.
                require(
                    pad_page.evaluate("__siege.shell.screen==='title'"),
                    "Pad cannot leave credits",
                )
                pad_to(pad_page, "Co-op")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate("__siege.shell.screen==='join'"),
                    "Pad cannot open couch join",
                )
                pad(pad_page, 1)
                require(
                    pad_page.evaluate(
                        "__siege.shell.screen==='title' && !__game._join"
                    ),
                    "Native Circle back leaked join mode",
                )
                pad_to(pad_page, "Co-op")
                pad(pad_page, 0)
                pad_page.evaluate(
                    "__pads.push({...__pad,index:1,id:'Synthetic second controller',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});__pads[1].buttons[9]={pressed:true,value:1}"
                )
                pump(pad_page)
                pad_page.evaluate("__pads[1].buttons[9]={pressed:false,value:0}")
                pump(pad_page)
                require(
                    pad_page.evaluate("__game.players.length===2"),
                    "Options on a second controller failed to join",
                )
                pad_to(pad_page, "Launch 2 pilots")
                pad(pad_page, 0)
                pump(pad_page, 4.1)
                before = pad_page.evaluate("__siege.world.s.players[1].x")
                pad_page.evaluate(
                    "__pads[1].axes=[-1,0,0,-1];__pads[1].buttons[7]={pressed:true,value:1}"
                )
                pump(pad_page, 0.4)
                pad_page.evaluate(
                    "__pads[1].axes=[0,0,0,0];__pads[1].buttons[7]={pressed:false,value:0}"
                )
                require(
                    pad_page.evaluate("__siege.world.s.players[1].x") < before - 20,
                    "Second controller failed to control its independent ship",
                )
                require(
                    pad_page.evaluate("__siege.world.s.shots.some(q=>q.owner===1)"),
                    "Second controller failed to fire independently",
                )
                pad_page.evaluate("__siege.world.retreat(true)")
                pump(pad_page, 4.1)
                require(
                    pad_page.evaluate("__siege.shell.screen==='upgrade'"),
                    "Co-op retreat did not open field refit",
                )
                pad_to(pad_page, "RAPID PULSE")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate("__siege.world.s.players[0].choice===2"),
                    "P1 upgrade choice did not apply",
                )
                second_pad(pad_page, 13)
                second_pad(pad_page, 0)
                require(
                    pad_page.evaluate("__siege.world.s.players[1].choice===1"),
                    "P2 cannot independently navigate and confirm its own upgrade",
                )
                title(pad_page)
                require(
                    pad_page.evaluate("__game.players.length===1 && !__game._join"),
                    "Title did not reset roster and joining mode",
                )
                pad_page.evaluate("__pads[1].connected=false")

            check(
                "pad-only credits, clean join/back, second-controller couch control and independent upgrades",
                pad_credits_couch,
            )

            def pad_combat():
                pad_to(pad_page, "Play siege")
                pad(pad_page, 0)
                pump(pad_page, 4.1)
                before = pad_page.evaluate("__siege.world.s.players[0].x")
                pad_page.evaluate(
                    "__pad.axes=[1,0,.3,-.8];__pad.buttons[7]={pressed:true,value:1}"
                )
                pump(pad_page, 0.4)
                pad_page.evaluate(
                    "__pad.axes=[0,0,0,0];__pad.buttons[7]={pressed:false,value:0}"
                )
                pump(pad_page)
                require(
                    pad_page.evaluate("__siege.world.s.players[0].x") > before + 20,
                    "Pad left stick did not move",
                )
                require(
                    pad_page.evaluate("__siege.world.s.shots.some(q=>q.owner===0)"),
                    "Pad R2 did not shoot",
                )
                energy = pad_page.evaluate("__siege.world.s.players[0].energy")
                pad(pad_page, 6)
                pad(pad_page, 2)
                require(
                    pad_page.evaluate("__siege.world.s.players[0].energy")
                    < energy - 15,
                    "L2 boost failed",
                )
                require(
                    pad_page.evaluate("__siege.world.s.players[0].pulse>0"),
                    "Square pulse failed",
                )

            check(
                "pad movement, right-stick aim, R2 laser, L2 boost and Square pulse work",
                pad_combat,
            )

            def reserved_chord():
                pad_page.evaluate("__pad.buttons[8]={pressed:true,value:1}")
                pump(pad_page)
                pad(pad_page, 9)
                pad_page.evaluate("__pad.buttons[8]={pressed:false,value:0}")
                pump(pad_page)
                require(
                    pad_page.evaluate("!__game.paused"),
                    "Create+Options chord incorrectly paused game",
                )

            check("Hub-reserved Create and Options chord is left alone", reserved_chord)

            def pad_pause_dev():
                pad(pad_page, 9)
                require(
                    pad_page.evaluate(
                        "__game.paused && __siege.shell.screen==='pause'"
                    ),
                    "Options did not pause",
                )
                pad_to(pad_page, "Controls")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate("__siege.shell.screen==='controls'"),
                    "Pad cannot open controls",
                )
                pad(pad_page, 1)
                pad_to(pad_page, "Dev mode")
                pad(pad_page, 0)
                pad_to(pad_page, "Thrust", label=True)
                value = pad_page.evaluate("__siege.world.balance.thrust")
                pad(pad_page, 15)
                require(
                    pad_page.evaluate("__siege.world.balance.thrust") > value,
                    "Pad cannot adjust dev slider",
                )
                pad_to(pad_page, "Reset balance to defaults")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate(
                        "__siege.world.balance.thrust===SF.DEFAULTS.thrust"
                    ),
                    "Pad cannot reset dev balance",
                )
                pad(pad_page, 1)
                pad_to(pad_page, "Resume")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate("!__game.paused && !__siege.shell.screen"),
                    "Pad cannot resume",
                )

            check(
                "pad-only pause, controls, dev balance/reset and resume traversal",
                pad_pause_dev,
            )

            def pad_results():
                pad_page.evaluate(
                    "__game.debug.action('boss',2);__siege.world.s.players[0].hp=0"
                )
                pump(pad_page)
                require(
                    pad_page.evaluate("__siege.shell.screen==='results'"),
                    "Pad results missing",
                )
                pad_to(pad_page, "Retry siege")
                pad(pad_page, 0)
                require(
                    pad_page.evaluate(
                        "!__siege.world.s.result && __siege.mode==='play'"
                    ),
                    "Pad retry failed",
                )

            check("pad-only results retry creates a playable new run", pad_results)

            def pad_disconnect():
                pump(pad_page, 4.1)
                pad_page.evaluate(
                    "__pad.axes=[.8,0,0,0];__pad.buttons[7]={pressed:true,value:1}"
                )
                pump(pad_page)
                pad_page.evaluate("__pad.connected=false")
                pump(pad_page)
                require(
                    pad_page.evaluate(
                        "__game.paused && __game.input.padMove.every(v=>v===0) && !__game.input.held.has('Pad7')"
                    ),
                    "Disconnected controller retained movement/fire or failed to pause",
                )

            check(
                "synthetic pad disconnect neutralizes controls and opens pause",
                pad_disconnect,
            )
            close_page(pad_page)

            for label, width, height in [("phone", 390, 844), ("tablet", 820, 1180)]:
                touch_page = open_page(browser, touch=True, width=width, height=height)
                cdp = touch_page.context.new_cdp_session(touch_page)

                def touch_start(p=touch_page):
                    p.get_by_role("button", name="Play siege", exact=True).tap()
                    pump(p, 4.1)
                    require(
                        p.evaluate(
                            "__siege.world.s.state==='play' && !__siege.world.s.shots.length"
                        ),
                        "Menu tap leaked a shot into briefing/combat",
                    )

                check(
                    f"{label} touch title tap launches cleanly without firing leakage",
                    touch_start,
                )

                def full_arena(p=touch_page):
                    state = p.evaluate(
                        "(()=>{const c=__game.screen,r=c.canvas.getBoundingClientRect();return {W:__game.W,H:__game.H,x:r.left+c.OX/c.dpr,y:r.top+c.OY/c.dpr,right:r.left+(c.OX+960*c.S)/c.dpr,bottom:r.top+(c.OY+540*c.S)/c.dpr,vw:innerWidth,vh:innerHeight}})()"
                    )
                    require(
                        state["W"] == 960
                        and state["H"] == 540
                        and state["x"] >= -1
                        and state["y"] >= -1
                        and state["right"] <= state["vw"] + 1
                        and state["bottom"] <= state["vh"] + 1,
                        f"Arena is cropped or resized: {state}",
                    )
                    return state

                check(f"{label} portrait fits the entire fixed arena", full_arena)

                def touch_two(p=touch_page, session=cdp):
                    points = p.evaluate(
                        "(()=>{const c=__game.screen,r=c.canvas.getBoundingClientRect(),P=(x,y)=>({x:r.left+(x*c.S+c.OX)/c.dpr,y:r.top+(y*c.S+c.OY)/c.dpr});return [P(150,400),P(780,150)]})()"
                    )
                    left, right = points
                    before = p.evaluate("__siege.world.s.players[0].x")
                    contacts = [
                        {"x": left["x"], "y": left["y"], "id": 1},
                        {"x": right["x"], "y": right["y"], "id": 2},
                    ]
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchStart", "touchPoints": contacts},
                    )
                    contacts[0]["x"] += 65
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchMove", "touchPoints": contacts},
                    )
                    pump(p, 0.45)
                    state = p.evaluate(
                        "({contacts:__siege.controls.touch.size,x:__siege.world.s.players[0].x,shots:__siege.world.s.shots.length,device:__game.input.lastDevice})"
                    )
                    require(
                        state["contacts"] == 2
                        and state["x"] > before + 25
                        and state["shots"] > 0
                        and state["device"] == "touch",
                        f"Multitouch move/aim/fire failed: {state}",
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchCancel", "touchPoints": []},
                    )
                    pump(p)
                    require(
                        p.evaluate(
                            "__siege.controls.touch.size===0 && __game.input.move().every(v=>Math.abs(v)<.01)"
                        ),
                        "Touch cancellation retained a contact or native thumbstick",
                    )

                check(
                    f"{label} two emulated contacts move, aim and fire; cancel clears them",
                    touch_two,
                )

                def conditional_touch(p=touch_page):
                    p.evaluate(
                        "(()=>{const p=__siege.world.s.players[0];__siege.world.shoot(p.x+80,p.y,0,1,-1,1,0)})()"
                    )
                    pump(p, 0.11)
                    require(
                        p.locator("#pulse-touch").is_visible(),
                        "Useful ready pulse is not offered",
                    )
                    p.locator("#pulse-touch").tap()
                    pump(p, 0.12)
                    require(
                        p.evaluate("__siege.world.s.players[0].pulse>0")
                        and not p.locator("#pulse-touch").is_visible(),
                        "Touch pulse did not activate and hide on cooldown",
                    )

                check(
                    f"{label} contextual pulse appears for danger and activates",
                    conditional_touch,
                )

                def touch_menu_landscape(p=touch_page, w=width, h=height):
                    p.set_viewport_size({"width": h, "height": w})
                    p.wait_for_function(
                        "Math.abs(__game.screen.canvas.width-innerWidth*Math.min(devicePixelRatio,3))<2 && Math.abs(__game.screen.canvas.height-innerHeight*Math.min(devicePixelRatio,3))<2"
                    )
                    pump(p)
                    full_arena(p)
                    p.locator("#flight-menu").tap()
                    pump(p)
                    require(
                        p.evaluate("__game.paused && __siege.shell.screen==='pause'"),
                        "Touch pause menu unreachable",
                    )
                    tick = p.evaluate("__siege.world.s.tick")
                    pump(p, 0.4)
                    require(
                        p.evaluate("__siege.world.s.tick") == tick,
                        "Touch pause failed to freeze",
                    )
                    p.get_by_role("button", name="Resume", exact=True).tap()
                    pump(p)
                    require(
                        p.evaluate("!__game.paused && __siege.controls.touch.size===0"),
                        "Touch resume retained stale contacts",
                    )
                    title(p)
                    pump(p, 10)
                    p.touchscreen.tap(3, 3)
                    pump(p)
                    require(
                        p.evaluate("!__siege.attract && __siege.mode==='title'"),
                        "Touch cannot exit attract",
                    )

                check(
                    f"{label} landscape framing, reachable pause/resume and touch attract exit",
                    touch_menu_landscape,
                )
                close_page(touch_page)

            def no_errors_dependencies():
                require(not page_errors, f"Uncaught browser errors: {page_errors}")
                require(not engine_errors, f"Native engine errors: {engine_errors}")
                foreign = [
                    url
                    for url in requests
                    if not (url == artifact.as_uri() or url.startswith("data:"))
                ]
                require(not foreign, f"Runtime dependency requests: {foreign}")

            browser.close()

            def engine_smoke(engine, profile=None):
                cross_browser = engine.launch(headless=True)
                try:
                    options = profile or {"viewport": {"width": 1280, "height": 800}}
                    cross_context = cross_browser.new_context(**options)
                    cross_page = cross_context.new_page()
                    cross_page.set_default_timeout(2500)
                    cross_page.on(
                        "pageerror", lambda error: page_errors.append(str(error))
                    )
                    cross_page.on(
                        "request", lambda request: requests.append(request.url)
                    )
                    cross_page.goto(artifact.as_uri(), wait_until="load")
                    cross_page.wait_for_function(
                        "document.body.dataset.ready==='true' && !!window.__game?.debug?.manual",
                        timeout=20000,
                    )
                    cross_page.evaluate("__game.debug.manual(true)")
                    pump(cross_page)
                    require(
                        cross_page.evaluate("__siege.mode==='title'"),
                        "file:// title failed to boot",
                    )
                    cross_page.get_by_role(
                        "button", name="Play siege", exact=True
                    ).click()
                    pump(cross_page, 4.1)
                    require(
                        cross_page.evaluate(
                            "__siege.world.s.state==='play' && !__siege.world.s.modified"
                        ),
                        "Real Play action did not reach normal combat",
                    )
                    before = cross_page.evaluate("__siege.world.s.players[0].x")
                    cross_page.keyboard.down("d")
                    cross_page.keyboard.down("j")
                    pump(cross_page, 0.45)
                    cross_page.keyboard.up("d")
                    cross_page.keyboard.up("j")
                    require(
                        cross_page.evaluate("__siege.world.s.players[0].x")
                        > before + 25,
                        "WASD thrust failed",
                    )
                    require(
                        cross_page.evaluate(
                            "__siege.world.s.shots.some(q=>q.owner===0)"
                        ),
                        "Real bound laser input failed",
                    )
                    key(cross_page, "e")
                    require(
                        cross_page.evaluate("__siege.world.s.players[0].pulse>0"),
                        "Real pulse input failed",
                    )
                    frame = cross_page.evaluate(
                        "(()=>{const c=__game.screen,r=c.canvas.getBoundingClientRect();return {w:__game.W,h:__game.H,x:r.left+c.OX/c.dpr,y:r.top+c.OY/c.dpr,right:r.left+(c.OX+960*c.S)/c.dpr,bottom:r.top+(c.OY+540*c.S)/c.dpr,vw:innerWidth,vh:innerHeight}})()"
                    )
                    require(
                        frame["w"] == 960
                        and frame["h"] == 540
                        and frame["x"] >= -1
                        and frame["y"] >= -1
                        and frame["right"] <= frame["vw"] + 1
                        and frame["bottom"] <= frame["vh"] + 1,
                        f"Fixed arena cropped: {frame}",
                    )
                    require(
                        cross_page.evaluate("__game.errors.length===0"),
                        "Native engine recorded cross-engine errors",
                    )
                    close_page(cross_page)
                    return frame
                finally:
                    cross_browser.close()

            check(
                "WebKit desktop file boot, real play/move/fire/pulse and full fixed arena",
                lambda: engine_smoke(playwright.webkit),
            )
            check(
                "WebKit iPhone profile file boot, real play/move/fire/pulse and portrait arena",
                lambda: engine_smoke(
                    playwright.webkit, dict(playwright.devices["iPhone 13"])
                ),
            )
            check(
                "Firefox desktop file boot, real play/move/fire/pulse and full fixed arena",
                lambda: engine_smoke(playwright.firefox),
            )
            check(
                "packaged game has no uncaught errors or external/local fetch dependencies",
                no_errors_dependencies,
            )
    except (PlaywrightError, OSError, ValueError, KeyError, TypeError) as error:
        records.append(
            {
                "name": "packaged standalone browser run",
                "pass": False,
                "detail": str(error),
            }
        )

    report = {
        "passed": sum(record["pass"] for record in records),
        "failed": sum(not record["pass"] for record in records),
        "results": records,
        "limitations": "Chromium at 1920x1080 and 1280x800; synthetic standard gamepad; CDP-emulated phone/tablet multitouch in portrait and landscape; WebKit desktop and iPhone 13 profile; Firefox desktop. WebKit emulation is not actual iOS Safari. Physical controllers, touch hardware, TVs, iOS and human audio listening unknown.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    for record in records:
        if not record["pass"]:
            print(f"FAIL {record['name']}: {record['detail']}")
    print(f"{report['passed']} passed, {report['failed']} failed")
    raise SystemExit(1 if report["failed"] else 0)


if __name__ == "__main__":
    main()
