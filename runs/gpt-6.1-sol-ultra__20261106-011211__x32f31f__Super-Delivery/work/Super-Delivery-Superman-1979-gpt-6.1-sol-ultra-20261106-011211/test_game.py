"""One command validates the shipped game, procedural audio and both peer directions.

Run: /home/micha/.local/share/pipx/venvs/playwright/bin/python test_game.py
Only failures and one aggregate count are printed. No screenshots are taken.
"""

import json
import os
import re
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright
from test_audio import audio_checks
from test_game_coop import game_coop_checks, invite_cancel_checks
from test_hub import hub_checks, hub_gameplay_checks
from test_network import network_checks

ROOT = Path(__file__).resolve().parent.parent
FOLDER = Path(__file__).resolve().parent.name
GAME = FOLDER + ".html"
FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--use-angle=swiftshader",
    "--disable-vulkan-surface",
    "--disable-gpu-sandbox",
    "--ignore-gpu-blocklist",
]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class Checks:
    def __init__(self):
        self.results = []

    def add(self, name, passed, detail=""):
        self.results.append((name, bool(passed), str(detail)))
        Path(__file__).with_name("test-progress.json").write_text(
            json.dumps(
                {"completed": len(self.results), "last": name, "passed": bool(passed)}
            )
        )

    def run(self, name, operation):
        try:
            result = operation()
            self.add(
                name,
                result is not False,
                "" if result is not False else "condition was false",
            )
            return result
        except Exception as exc:
            self.add(name, False, str(exc))
            return False


def wait_ready(page, url):
    page.add_init_script(
        "window.addEventListener('error',e=>{window.__testBootError=e.message});"
    )
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_function(
        "window.__gameReady || window.__bootError || window.__testBootError",
        timeout=90000,
    )
    if page.evaluate("window.__bootError || window.__testBootError || null"):
        raise RuntimeError(
            page.evaluate("window.__bootError || window.__testBootError")
        )
    return page.evaluate("__game.ready")


def press_pad(page, button, duration=160):
    before = page.evaluate("__game.engine.frames")
    page.evaluate("b => window.testPad.buttons[b].pressed=true", button)
    page.wait_for_function("n=>__game.engine.frames >= n+2", arg=before, timeout=30000)
    page.wait_for_timeout(duration)
    before = page.evaluate("__game.engine.frames")
    page.evaluate("b => window.testPad.buttons[b].pressed=false", button)
    page.wait_for_function("n=>__game.engine.frames >= n+2", arg=before, timeout=30000)


def game_checks(browser, url, checks):
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    errors = []
    gpu_errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: (
            gpu_errors.append(message.text)
            if re.search(
                r"(?:device.*lost|GPUValidationError|GPU.*validation error)",
                message.text,
                re.IGNORECASE,
            )
            else None
        ),
    )
    try:
        if not checks.run("Shipped single HTML boots", lambda: wait_ready(page, url)):
            return
        page.wait_for_function(
            "__game.engine.frames > 2 && __game.engine.drawCalls > 0", timeout=30000
        )
        engine = page.evaluate("__game.engine")
        checks.add("Actual WebGPU backend", engine["webgpu"], engine)
        checks.add(
            "Pinned Three r180 and Rapier 0.19.3",
            engine["three"] == "180" and engine["rapier"] == "0.19.3",
            engine,
        )
        checks.add(
            "Rapier world has real bodies and colliders",
            engine["bodies"] > 10 and engine["colliders"] > 10,
            engine,
        )
        checks.add(
            "Title and accessible start button",
            page.evaluate("__game.screen") == "title"
            and page.locator("#start").is_visible(),
        )
        page.click("#settings")
        checks.add(
            "Music defaults to ten percent",
            page.locator("#music").input_value() == "0.1",
        )
        page.locator("#music").evaluate(
            "e=>{e.value=.23;e.dispatchEvent(new Event('input'))}"
        )
        checks.add(
            "Music setting changes audio volume live",
            page.evaluate(
                "__game.audio.musicVolume === .23 && __game.settings.music === .23"
            ),
        )
        page.locator("#glyph").select_option("xbox")
        checks.add(
            "Xbox prompt preference", page.evaluate('__game.settings.glyphs === "xbox"')
        )
        page.locator("#sound").uncheck()
        checks.add("Sound toggle mutes audio", page.evaluate("__game.audio.muted"))
        page.locator("#sound").check()
        page.locator("#music").evaluate(
            "e=>{e.value=.1;e.dispatchEvent(new Event('input'))}"
        )
        page.click("#back")
        page.click("#about")
        text = page.locator("#screen").inner_text()
        checks.add(
            "Credits include all feedback sections",
            all(
                x in text
                for x in [
                    "Source Information",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                    "added on import",
                ]
            ),
        )
        page.click("#back")
        page.click("#how")
        checks.add(
            "Mission briefing documents controls and final objective",
            "FILE" in page.locator("#screen").inner_text().upper()
            and "WASD" in page.locator("#screen").inner_text(),
        )
        page.click("#back")
        page.click("#start")
        checks.add(
            "Start enters reporter mission",
            page.evaluate(
                '__game.screen === "play" && __game.player.reporter && __game.state.phase === "reporter"'
            ),
        )
        page.keyboard.press("e")
        page.wait_for_function('__game.state.phase === "active"', timeout=15000)
        checks.add(
            "Keyboard booth interaction transforms reporter",
            page.evaluate("!__game.player.reporter"),
        )
        page.evaluate(
            '__game.teleport(-80,-75,0); __game.setConfig("satelliteSpeed",0)'
        )
        initial = page.evaluate("__game.player.pos[0]")
        page.keyboard.down("d")
        page.wait_for_function(
            "x=>__game.player.pos[0]>x+2", arg=initial, timeout=15000
        )
        page.keyboard.up("d")
        checks.add(
            "Keyboard movement uses physics",
            page.evaluate("__game.player.pos[0]") > initial + 2,
        )
        page.keyboard.down("Space")
        page.wait_for_function("__game.player.pos[1] > 3", timeout=15000)
        page.keyboard.up("Space")
        checks.add("Flight launches and climbs", page.evaluate("__game.player.flying"))
        zoom_before = page.evaluate("__game.camera.zoom")
        page.mouse.move(760, 410)
        page.mouse.wheel(0, -200)
        page.wait_for_function(
            "z=>__game.camera.zoom>z+.05", arg=zoom_before, timeout=15000
        )
        checks.add(
            "Mouse wheel changes effective orthographic zoom",
            page.evaluate("__game.camera.zoom") > zoom_before + 0.05,
        )
        orbit_before = page.evaluate("__game.camera.orbit")
        page.mouse.down(button="right")
        page.mouse.move(900, 450, steps=5)
        page.mouse.up(button="right")
        checks.add(
            "Right mouse drag orbits the camera",
            abs(page.evaluate("__game.camera.orbit") - orbit_before) > 0.5,
        )
        page.keyboard.press("q")
        page.wait_for_function("__game.state.scans > 0", timeout=15000)
        checks.add(
            "Keyboard X-ray scan dispatches",
            page.evaluate("__game.state.scans > 0 && __game.audio.events.scan > 0"),
        )
        page.evaluate("__game.teleport(-80,-75,14); __game.damage(6)")
        checks.add(
            "Satellites drain power and disable flight",
            page.evaluate(
                "__game.player.weak && !__game.player.flying && __game.player.power===0 && __game.state.damageCount===1"
            ),
        )
        page.evaluate("__game.teleport(-35,-8,0); __game.interact()")
        checks.add(
            "Mina restores drained powers",
            page.evaluate(
                "!__game.player.weak && __game.player.power===100 && __game.state.healCount>0"
            ),
        )
        page.keyboard.press("Escape")
        page.wait_for_function('__game.screen === "pause"')
        before = page.evaluate("__game.state.time")
        page.wait_for_timeout(250)
        checks.add(
            "Pause suspends solo simulation",
            page.evaluate("__game.state.time") == before,
        )
        page.click("#dev")
        checks.add(
            "Dev tools reachable from pause with seven live sliders",
            page.locator("[data-var]").count() == 7,
        )
        page.locator('[data-var="flightSpeed"]').evaluate(
            "e=>{e.value=38;e.dispatchEvent(new Event('input'))}"
        )
        checks.add(
            "Dev slider changes live balance",
            page.evaluate("__game.config.flightSpeed===38"),
        )
        for selector in ["#god", "#freeze", "#noclip"]:
            page.locator(selector).check()
        page.click("#resetDefaults")
        checks.add(
            "Dev reset restores balance and switches",
            page.evaluate(
                "__game.config.flightSpeed===24 && __game.config.powerDrain===26"
            )
            and not page.locator("#god").is_checked()
            and not page.locator("#freeze").is_checked()
            and not page.locator("#noclip").is_checked(),
        )
        before = page.evaluate("__game.state.time")
        page.click("#step")
        after = page.evaluate("__game.state.time")
        checks.add(
            "Dev step advances one second",
            abs(after - before - 1) < 0.001,
            f"{before} -> {after}",
        )
        page.evaluate("__game.setPower(3)")
        page.click("#recharge")
        checks.add(
            "Dev recharge restores power",
            page.evaluate("__game.player.power===100 && !__game.player.weak"),
        )
        page.click("#nextBridge")
        page.click("#nextGang")
        checks.add(
            "Dev objective shortcuts work",
            page.evaluate(
                "__game.state.built.filter(Boolean).length===1 && __game.state.arrested.filter(Boolean).length===1"
            ),
        )
        page.click("#resetMission")
        checks.add(
            "Dev mission reset clears progress",
            page.evaluate(
                '__game.state.phase==="reporter" && !__game.state.built.some(Boolean) && !__game.state.arrested.some(Boolean)'
            ),
        )
        page.click("#back")
        page.click("#resume")
        checks.run(
            "Complete mission through real pickup and delivery actions",
            lambda: complete_mission(page, checks),
        )
        checks.add(
            "Victory screen shows completed objective results",
            page.evaluate('__game.screen==="win" && __game.state.won')
            and "3 / 3" in page.locator("#screen").inner_text()
            and "6 / 6" in page.locator("#screen").inner_text(),
        )
        page.click("#again")
        checks.add(
            "Another edition starts clean mission",
            page.evaluate(
                '__game.screen==="play" && !__game.state.won && __game.state.pickups===0'
            ),
        )
        # Test actual automatic 10-second trigger. Poll state rather than canvas pixels.
        page.evaluate("__game.title()")
        start = time.monotonic()
        page.wait_for_function(
            'document.querySelector("#attractTag").hidden === false', timeout=180000
        )
        elapsed = time.monotonic() - start
        checks.add(
            "Attract mode starts after title inactivity",
            9.5 <= elapsed < 16 and page.evaluate('__game.screen==="play"'),
            f"{elapsed:.2f}s elapsed",
        )
        page.wait_for_function(
            '__game.state.phase === "active" && __game.state.time > 1', timeout=45000
        )
        checks.add(
            "Attract AI plays mission",
            page.evaluate('__game.state.phase==="active" && __game.state.time>1'),
        )
        replay = page.evaluate("""() => {
          __game.attract();__game.tick(7000);
          const before=__game.state.time;__game.tick(120);
          return {before,after:__game.state.time,won:__game.state.won,phase:__game.state.phase};
        }""")
        checks.add(
            "Attract replay loops and continues after a complete edition",
            replay["before"] != replay["after"] and not replay["won"],
            replay,
        )
        page.keyboard.press("a")
        checks.add(
            "Any input exits attract mode to title",
            page.evaluate(
                '__game.screen==="title" && document.querySelector("#attractTag").hidden'
            ),
        )
        checks.add("No uncaught game exceptions", not errors, "; ".join(errors))
        checks.add(
            "WebGPU device remains healthy through playthrough",
            not gpu_errors
            and page.evaluate(
                "__game.engine.webgpu && __game.engine.recoveries===0 && __game.engine.frames>30 && __game.engine.drawCalls>0"
            ),
            "; ".join(gpu_errors) or page.evaluate("JSON.stringify(__game.engine)"),
        )
        checks.run("Driver-loss recovery", lambda: recovery_checks(page, checks))
    finally:
        page.close()


def complete_mission(page, checks):
    result = page.evaluate("""() => {
      const g=__game; g.start(); g.setConfig('enemySpeed',0);g.setConfig('satelliteSpeed',0);
      g.teleport(-22,0,0);g.interact();
      const delivered=[];
      for(const type of ['citizen','girder','crook','mastermind']) {
        for(const e of g.entities().filter(e=>e.type===type)) {
          g.teleport(e.pos[0],e.pos[2],e.pos[1]);g.interact();
          if(g.player.carrying!==type) throw Error('Cannot pick up '+type+' '+e.index);
          const to=type==='girder'?[0,24]:type==='citizen'?[-35,-8]:[-52,-40];
          g.teleport(to[0],to[1],type==='girder'?12:0);g.interact();
          if(g.player.carrying) throw Error('Cannot deliver '+type+' '+e.index);
          delivered.push(type+':'+e.index);
        }
      }
      const allJobs=g.state.built.every(Boolean)&&g.state.arrested.every(Boolean)&&g.state.rescued.every(Boolean)&&g.state.phase==='return';
      g.teleport(-22,0,0);g.interact();
      const reporter=g.player.reporter&&g.state.phase==='file';
      g.teleport(-65,10,0);g.interact();
      const subway=g.state.subways===1&&g.player.pos[0]===60;
      g.teleport(48,-45,0);g.interact();
      return {delivered,allJobs,reporter,subway,won:g.state.won,pickups:g.state.pickups};
    }""")
    checks.add(
        "All six gang members and all three bridge pieces delivered",
        result["allJobs"] and result["pickups"] == 11,
        result,
    )
    checks.add(
        "Both optional citizens rescued",
        len([x for x in result["delivered"] if x.startswith("citizen:")]) == 2,
    )
    checks.add("Return booth restores reporter identity", result["reporter"])
    checks.add("Subway shortcut carries reporter across city", result["subway"])
    checks.add("Filing story completes the mission", result["won"])
    return all(result[key] for key in ["allJobs", "reporter", "subway", "won"])


def recovery_checks(page, checks):
    progress = page.evaluate("""() => {
      __game.start();__game.teleport(-22,0,0);__game.interact();
      const e=__game.entities().find(e=>e.type==='girder');
      __game.teleport(e.pos[0],e.pos[2],0);__game.interact();
      __game.teleport(0,24,12);__game.interact();
      return JSON.stringify({phase:__game.state.phase,built:__game.state.built,arrested:__game.state.arrested,pickups:__game.state.pickups});
    }""")
    page.evaluate("__game.loseDevice()")
    recovered = page.wait_for_function(
        "__game.engine.recoveries===1 && !__game.engine.recovering && !__game.engine.webgpu && __game.engine.drawCalls>0",
        timeout=45000,
    ).json_value()
    checks.add(
        "Destroyed WebGPU device recovers to a working renderer",
        recovered,
        page.evaluate("JSON.stringify(__game.engine)"),
    )
    after = page.evaluate(
        "JSON.stringify({phase:__game.state.phase,built:__game.state.built,arrested:__game.state.arrested,pickups:__game.state.pickups})"
    )
    checks.add("Graphics recovery preserves mission progress", progress == after)
    page.evaluate("__game.teleport(-80,-75,0)")
    initial = page.evaluate("__game.player.pos[0]")
    page.keyboard.down("d")
    page.wait_for_function("x=>__game.player.pos[0]>x+1", arg=initial, timeout=15000)
    page.keyboard.up("d")
    checks.add(
        "Movement remains playable after graphics recovery",
        page.evaluate("__game.player.pos[0]") > initial + 1,
    )
    distance = page.evaluate("__game.camera.distance")
    page.mouse.move(760, 410)
    page.mouse.wheel(0, 150)
    page.wait_for_function("d=>__game.camera.distance>d", arg=distance, timeout=10000)
    checks.add(
        "Replacement canvas retains mouse wheel controls",
        page.evaluate("__game.camera.distance") > distance,
    )
    return True


def controller_checks(browser, url, checks):
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.add_init_script(
        """window.testPad={id:'Test Standard DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad]});"""
    )
    try:
        wait_ready(page, url)
        press_pad(page, 0)
        checks.add(
            "Standard gamepad starts the game", page.evaluate('__game.screen==="play"')
        )
        press_pad(page, 2)
        checks.add(
            "DualSense square interacts with phone booth",
            page.evaluate('__game.state.phase==="active" && !__game.player.reporter'),
        )
        press_pad(page, 0, 600)
        checks.add(
            "DualSense cross launches flight", page.evaluate("__game.player.flying")
        )
        press_pad(page, 3)
        checks.add("DualSense triangle scans", page.evaluate("__game.state.scans>0"))
        press_pad(page, 9)
        checks.add(
            "Gamepad options pauses the game", page.evaluate('__game.screen==="pause"')
        )
        checks.add(
            "Controller HUD uses PlayStation glyphs",
            "□" in page.locator("#context").inner_text()
            or "×" in page.locator("#controls").inner_text(),
        )
        press_pad(page, 13)
        press_pad(page, 13)
        press_pad(page, 0)
        checks.add(
            "D-pad navigates pause menu to settings",
            page.evaluate('__game.screen==="settings"'),
        )
        volume_before = page.evaluate("__game.settings.music")
        page.evaluate("testPad.axes[0]=1")
        page.wait_for_function(
            "v=>__game.settings.music>v", arg=volume_before, timeout=15000
        )
        page.evaluate("testPad.axes[0]=0")
        checks.add(
            "Controller axis adjusts stepped music slider",
            page.evaluate("__game.settings.music") > volume_before,
        )
        press_pad(page, 13)
        press_pad(page, 13)
        press_pad(page, 15)
        checks.add(
            "D-pad changes controller glyph preference",
            page.evaluate('__game.settings.glyphs === "xbox"'),
        )
        press_pad(page, 1)
        press_pad(page, 0)
        checks.add(
            "Gamepad cross resumes focused menu item",
            page.evaluate('__game.screen==="play"'),
        )
    finally:
        page.close()


def touch_checks(browser, url, checks):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    try:
        wait_ready(page, url)
        page.locator("#start").tap()
        page.touchscreen.tap(700, 190)
        page.wait_for_timeout(120)
        checks.add(
            "Touch starts game with compact contextual actions",
            page.evaluate('__game.screen==="play"')
            and page.locator("#touchAction").is_visible(),
        )
        page.locator("#touchInteract").tap()
        page.wait_for_function('__game.state.phase==="active"', timeout=15000)
        checks.add(
            "Touch contextual action transforms hero",
            page.evaluate("!__game.player.reporter"),
        )
        page.locator("#pauseBtn").tap()
        checks.add(
            "Touch pause menu is accessible",
            page.evaluate('__game.screen==="pause"')
            and page.locator("#resume").is_visible(),
        )
    finally:
        context.close()


def file_checks(browser, checks):
    page = browser.new_page(viewport={"width": 960, "height": 540})
    try:
        wait_ready(page, (ROOT / GAME).as_uri())
        checks.add(
            "Single HTML opens directly from file scheme",
            page.evaluate(
                '__game.ready && __game.screen === "title" && __game.engine.webgpu'
            ),
        )
        page.locator("#start").click()
        checks.add(
            "File-scheme deployment starts a playable mission",
            page.evaluate(
                '__game.screen === "play" && __game.state.phase === "reporter"'
            ),
        )
    finally:
        page.close()


def main():
    os.chdir(Path(__file__).resolve().parent)
    Path(".browser-temp").mkdir(exist_ok=True)
    os.environ["TMPDIR"] = "/proc/self/cwd/.browser-temp"
    checks = Checks()
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=FLAGS)
            try:
                checks.run(
                    "Game integration",
                    lambda: game_checks(browser, base + "/" + GAME, checks),
                )
                checks.run(
                    "Controller integration",
                    lambda: controller_checks(browser, base + "/" + GAME, checks),
                )
                checks.run(
                    "Touch integration",
                    lambda: touch_checks(browser, base + "/" + GAME, checks),
                )
                checks.run("File deployment", lambda: file_checks(browser, checks))
                checks.results.extend(audio_checks(browser))
                checks.results.extend(network_checks(browser, base + "/" + FOLDER))
                checks.results.extend(hub_checks(browser, base, GAME))
                checks.results.extend(hub_gameplay_checks(browser, base, GAME))
                checks.results.extend(game_coop_checks(browser, base, GAME))
                checks.results.extend(invite_cancel_checks(browser, base, GAME))
            finally:
                browser.close()
    except Exception as exc:
        checks.add("Test runner", False, str(exc))
    finally:
        server.shutdown()
        server.server_close()
    for name, passed, detail in checks.results:
        if not passed:
            print(f"FAIL {name}: {detail}")
    passed = sum(passed for _, passed, _ in checks.results)
    Path(__file__).with_name("test-results.json").write_text(
        json.dumps(
            {
                "passed": passed,
                "total": len(checks.results),
                "checks": [
                    {"name": name, "passed": ok, "detail": detail}
                    for name, ok, detail in checks.results
                ],
            },
            indent=2,
        )
    )
    print(f"{passed}/{len(checks.results)} checks passed")
    raise SystemExit(0 if passed == len(checks.results) else 1)


if __name__ == "__main__":
    main()
