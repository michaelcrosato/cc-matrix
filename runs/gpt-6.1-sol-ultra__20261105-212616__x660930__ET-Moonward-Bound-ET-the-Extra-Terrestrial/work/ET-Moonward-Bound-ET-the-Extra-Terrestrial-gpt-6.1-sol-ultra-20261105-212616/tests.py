#!/usr/bin/env python3
"""One-command headless verification. Prints failures and a one-line count."""

from __future__ import annotations

import http.server
import json
import re
import subprocess
import sys
import threading
from pathlib import Path
from urllib.parse import quote, urlencode

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
GAME = ROOT / (HERE.name + ".html")
RESULTS = HERE / "test-results.json"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *_args):
        pass


def main():
    outcomes, errors, diagnostics = [], [], {}
    filters = []
    if "--only" in sys.argv:
        filters = sys.argv[sys.argv.index("--only") + 1].lower().split(",")
    result_path = HERE / "test-results-targeted.json" if filters else RESULTS

    def check(name, fn):
        if filters and not any(token in name.lower() for token in filters):
            return
        try:
            fn()
            outcomes.append({"name": name, "passed": True})
        except Exception as error:  # noqa: BLE001 -- continue independent QA checks
            detail = str(error) or type(error).__name__
            outcomes.append({"name": name, "passed": False, "error": detail})
            print(f"FAIL {name}: {detail}", flush=True)
        result_path.write_text(
            json.dumps(
                {
                    "checks": outcomes,
                    "browserErrors": errors,
                    "diagnostics": diagnostics,
                },
                indent=2,
            )
        )

    def require(value, message):
        if not value:
            raise AssertionError(message)

    def package_check():
        require(GAME.exists(), f"missing {GAME.name}")
        html = GAME.read_text()
        require("Moonward Bound" in html, "wrong packaged title")
        for source in re.findall(r"<script[^>]+src=[\"\']([^\"\']+)", html):
            require(
                source.startswith(("https://", "data:")),
                f"unbundled script dependency: {source}",
            )
        require("hub:session-players" in html, "AI Hub player metadata missing")

    check("single-file package", package_check)
    if not GAME.exists():
        result_path.write_text(json.dumps({"checks": outcomes}, indent=2))
        print(f"0 passed, {len(outcomes)} failed ({len(outcomes)} checks)")
        return 1

    def metadata_check():
        data = json.loads((ROOT / "exit-interview.json").read_text())
        expected = {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        }
        require(
            set(data) == expected,
            "exit interview top-level shape differs from requested schema",
        )
        source = data["sourceInformation"]
        required = {
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
        require(
            set(source) == required,
            "source information fields differ from requested schema",
        )
        require(
            all(isinstance(x, str) and x.strip() for x in source.values()),
            "source information contains empty values",
        )
        require(
            source["usage"] == "added on import", "usage field must be added on import"
        )
        for key, count in [
            ("testingFeedback", 4),
            ("engineFeedback", 6),
            ("promptFeedback", 4),
        ]:
            require(
                len(data[key]) == count
                and all(isinstance(x, str) and x.strip() for x in data[key]),
                f"{key} answer count or content is invalid",
            )
        hub = data["aiHub"]
        require(
            set(hub)
            == {
                "name",
                "tagline",
                "description",
                "type",
                "genre",
                "source",
                "series",
                "players",
                "controls",
                "tags",
            },
            "catalogue field shape differs from requested schema",
        )
        require(
            all(
                isinstance(v, str) and (v.strip() or key == "series")
                for key, v in hub.items()
                if key != "tags"
            ),
            "catalogue contains empty or invalid text fields",
        )
        require(
            hub["name"] == "E.T. Moonward Bound" and hub["players"] == "1–2",
            "catalogue title/player count differs from game",
        )
        require(
            3 <= len(hub["tags"]) <= 6 and all(x == x.lower() for x in hub["tags"]),
            "catalogue tags must be 3–6 lowercase strings",
        )

    if (ROOT / "exit-interview.json").exists():
        check("exit-interview JSON schema and complete catalogue", metadata_check)
    else:
        diagnostics["metadataDeferredUntilFinalReport"] = True

    def subprocess_check(command, name):
        result = subprocess.run(
            command, cwd=HERE, capture_output=True, text=True, timeout=90, check=False
        )
        diagnostics[name] = {
            "returncode": result.returncode,
            "output": result.stdout.strip(),
        }
        require(result.returncode == 0, (result.stdout + result.stderr).strip()[-2500:])

    check(
        "network protocol and room unit integration",
        lambda: subprocess_check(["node", "network-test.mjs"], "networkUnit"),
    )
    check(
        "direct WebRTC invitation and bidirectional browser transport",
        lambda: subprocess_check(
            [sys.executable, "network-browser-test.py"], "directWebRTC"
        ),
    )

    check(
        "procedural world, patrol, flower reset and collider integration",
        lambda: subprocess_check(["node", "world-test.mjs"], "worldUnit"),
    )
    check(
        "offline music, all effects and gibberish voice synthesis",
        lambda: subprocess_check([sys.executable, "audio-test.py"], "audioUnit"),
    )

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    url = origin + "/" + quote(GAME.name)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url, wait_until="networkidle", timeout=120000)
            page.wait_for_function(
                "window.__game?.getState().ready && document.querySelector('#loading').classList.contains('hidden')",
                timeout=120000,
            )
            require("Moonward" in page.title(), "server page is not this game")

            def state():
                return page.evaluate("__game.getState()")

            def advance(seconds):
                return page.evaluate("s => __game.advance(s)", seconds)

            check(
                "correct game and ready",
                lambda: require(state().get("ready"), "game did not initialize"),
            )

            def renderer_check():
                info = page.evaluate("__game.renderInfo()")
                diagnostics["renderer"] = info
                require(
                    info["backend"] == "WebGPU",
                    f"expected actual WebGPU, received {info}",
                )
                require(
                    str(info["three"]) == "180" and info["rapier"] == "0.19.3",
                    f"wrong engine versions: {info}",
                )
                require(
                    info["animationMixers"] >= 3,
                    "native character animation mixers missing",
                )

            check("WebGPU, engine versions and native animation", renderer_check)
            check(
                "title screen",
                lambda: require(
                    state()["mode"] == "title", f"initial mode: {state()['mode']}"
                ),
            )
            page.screenshot(path=str(HERE / "title-1920.png"))

            def landscape_layout():
                page.set_viewport_size({"width": 844, "height": 390})
                rects = page.locator("#title button:visible").evaluate_all(
                    "(xs)=>xs.map(x=>({text:x.innerText,top:x.getBoundingClientRect().top,bottom:x.getBoundingClientRect().bottom}))"
                )
                viewport = page.evaluate("innerHeight")
                clipped = [
                    r["text"] for r in rects if r["top"] < 0 or r["bottom"] > viewport
                ]
                if clipped:
                    # A scrollable title is valid when every menu control can be reached.
                    for element in page.locator("#title button:visible").all():
                        element.scroll_into_view_if_needed()
                        box = element.bounding_box()
                        require(
                            box
                            and box["y"] >= 0
                            and box["y"] + box["height"] <= viewport + 1,
                            f"unreachable landscape title control: {element.inner_text()}",
                        )
                page.set_viewport_size({"width": 1920, "height": 1080})

            check("landscape title controls reachable", landscape_layout)
            page.set_viewport_size({"width": 1920, "height": 1080})

            def settings_and_credits():
                page.locator('#title [data-action="settings"]').hover()
                require(
                    page.evaluate("document.activeElement.dataset.action")
                    == "settings",
                    "mouse hover did not focus menu item",
                )
                page.locator('#title [data-action="settings"]').click()
                require(
                    page.locator("#music").input_value() == "10",
                    "music default is not 10 percent",
                )
                require(
                    abs(page.evaluate("__game.audioDebug().musicVolume") - 0.1)
                    < 0.0001,
                    "music bus default is not 10 percent",
                )
                page.locator("#glyph-toggle").click()
                require(
                    page.locator("#glyph-toggle").inner_text() == "Xbox",
                    "Xbox glyph preference did not toggle",
                )
                page.locator("#glyph-toggle").click()
                page.locator('#settings [data-action="back"]').click()
                page.locator('#title [data-action="about"]').click()
                text = page.locator("#credits-content").inner_text()
                for heading in [
                    "Source Information",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                    "added on import",
                ]:
                    require(heading in text, f"credits missing {heading}")
                page.locator('#about [data-action="back"]').click()

            check(
                "controller settings, music default, mouse focus and credits",
                settings_and_credits,
            )

            def persisted_settings():
                page.evaluate(
                    "localStorage.setItem('moonward-settings',JSON.stringify({music:10,sfx:75,glyphs:'xbox',captions:false,cameraSensitivity:1}))"
                )
                page.reload(wait_until="networkidle")
                page.wait_for_function(
                    "window.__game?.getState().ready", timeout=120000
                )
                page.locator('#title [data-action="settings"]').click()
                require(
                    page.locator("#glyph-toggle").inner_text() == "Xbox",
                    "persisted glyph setting was overwritten at startup",
                )
                require(
                    page.locator("#captions-toggle").inner_text() == "Off",
                    "persisted captions setting was overwritten at startup",
                )
                page.locator("#glyph-toggle").click()
                page.locator("#captions-toggle").click()
                page.locator('#settings [data-action="back"]').click()

            check(
                "persisted controller glyphs and captions survive reload",
                persisted_settings,
            )

            def keyboard_movement():
                page.locator('#title [data-action="start"]').click()
                initial = state()["player"]
                page.keyboard.down("w")
                try:
                    page.wait_for_function(
                        "p => {const q=__game.getState().player;return Math.hypot(q.x-p.x,q.z-p.z)>.45}",
                        arg=initial,
                        timeout=10000,
                    )
                finally:
                    page.keyboard.up("w")
                require(
                    state()["lastInput"] == "keyboard", "keyboard prompts not selected"
                )

            check("keyboard begins and moves bicycle", keyboard_movement)

            def gamepad_check():
                page.evaluate("""() => {
                    window.__pad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
                    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});
                }""")
                initial = state()["player"]
                page.evaluate("__pad.axes[0]=.9")
                try:
                    page.wait_for_function(
                        "p => {const s=__game.getState();return s.lastInput==='pad'&&Math.hypot(s.player.x-p.x,s.player.z-p.z)>.4}",
                        arg=initial,
                        timeout=10000,
                    )
                finally:
                    page.evaluate("__pad.axes[0]=0")
                require(
                    "✕" in page.locator("#controls").inner_text(),
                    "PlayStation interaction glyph missing",
                )
                page.evaluate("__pad.buttons[9]={pressed:true,touched:true,value:1}")
                page.wait_for_function(
                    "__game.getState().mode==='pause'", timeout=10000
                )
                page.evaluate("__pad.buttons[9]={pressed:false,touched:false,value:0}")
                page.wait_for_timeout(150)
                require(
                    page.locator("#pause").is_visible(), "Options did not show pause"
                )
                page.locator('#pause [data-action="resume"]').click()

            check("standard gamepad movement, glyphs and pause", gamepad_check)

            def pause_and_dev():
                page.keyboard.press("Escape")
                require(state()["mode"] == "pause", "Escape did not pause")
                elapsed = state()["elapsed"]
                advance(1)
                require(
                    state()["elapsed"] == elapsed,
                    "physics/gameplay advanced while paused",
                )
                page.locator('#pause [data-action="dev"]').click()
                page.locator("#dev-rideSpeed").evaluate(
                    "e=>{e.value='9';e.dispatchEvent(new Event('input'))}"
                )
                require(
                    state()["balance"]["rideSpeed"] == 9,
                    "live ride-speed slider did not apply",
                )
                page.locator("#god-toggle").click()
                require(state()["god"], "invincibility toggle did not apply")
                page.locator('[data-dev="reset"]').click()
                require(
                    state()["balance"]["rideSpeed"] == 6.3 and not state()["god"],
                    "reset did not restore live balance and invincibility",
                )
                page.locator('#dev [data-action="back"]').click()
                page.locator('#pause [data-action="resume"]').click()

            check("pause freezes simulation and developer sliders reset", pause_and_dev)

            def glow_check():
                before = state()
                page.keyboard.press("Space")
                after = state()
                require(
                    after["pulses"] == before["pulses"] + 1,
                    "Space did not trigger glow",
                )
                require(
                    after["bond"] < before["bond"] - 10, "glow did not spend friendship"
                )
                page.evaluate("__game.pulse()")
                require(
                    state()["pulses"] == after["pulses"],
                    "cooldown allowed duplicate glow",
                )
                advance(3.2)
                page.evaluate("__game.pulse()")
                require(
                    state()["pulses"] == after["pulses"] + 1,
                    "glow did not recover after cooldown",
                )

            check("glow cost and cooldown", glow_check)

            def audio_check():
                page.evaluate("__game.audio.sfx('pickup');__game.audio.voice('friend')")
                page.wait_for_function("__game.audioDebug().peak>0.0001", timeout=10000)
                data = page.evaluate("__game.audioDebug()")
                diagnostics["audio"] = data
                require(
                    data["unlocked"] and data["contextState"] == "running",
                    f"audio context did not unlock: {data}",
                )
                require(
                    data["sfxCount"] > 0
                    and data["voiceCount"] > 0
                    and data["notes"] > 0,
                    "music, effects or gibberish voice did not synthesize",
                )

            check("Web Audio produces music, effects and voice", audio_check)

            def campaign_check():
                page.evaluate("__game.start();__game.dev('god',true)")
                flower = state()["flowers"][0]
                page.evaluate("p=>__game.teleport(p.x,p.z)", flower)
                page.keyboard.press("e")
                require(
                    state()["flowersHealed"] == 1 and state()["flowers"][0]["healed"],
                    "flower healing interaction failed",
                )
                for number, target in enumerate(state()["targets"], 1):
                    page.evaluate("p=>__game.teleport(p.x,p.z)", target)
                    page.keyboard.press("e")
                    require(
                        len(state()["inventory"]) == number,
                        f"part pickup failed: {target['name']}",
                    )
                    page.keyboard.press("e")
                    require(
                        len(state()["inventory"]) == number,
                        "part could be collected twice",
                    )
                require(
                    state()["phase"] == "signal",
                    "all three parts did not unlock clearing",
                )
                saved = page.evaluate(
                    "JSON.parse(localStorage.getItem('moonward-save'))"
                )
                require(
                    len(saved["inventory"]) == 3,
                    "checkpoint failed to save borrowed parts",
                )
                page.evaluate("__game.start({resume:true})")
                require(
                    len(state()["inventory"]) == 3 and state()["phase"] == "signal",
                    "checkpoint resume lost progress",
                )
                page.evaluate("__game.teleport(0,-34)")
                page.keyboard.press("e")
                require(
                    state()["mode"] == "signal", "clearing did not open signal puzzle"
                )
                advance(5)
                require(state()["signalReady"], "signal demonstration did not finish")
                pattern = state()["pattern"]
                page.keyboard.press(str((pattern[0] + 1) % 3 + 1))
                require(
                    state()["signalIndex"] == 0 and state()["mode"] == "signal",
                    "wrong signal answer did not permit retry",
                )
                for note in pattern:
                    page.keyboard.press(str(note + 1))
                require(
                    state()["phase"] == "flight" and state()["mode"] == "play",
                    "correct signal did not launch bicycle",
                )
                for hoop in state()["hoops"]:
                    page.evaluate("h=>__game.teleport(h.x,h.z+1,h.y)", hoop)
                    advance(0.1)
                require(
                    state()["stars"] == 12,
                    f"ring collection failed: {state()['stars']}/12",
                )
                advance(3)
                require(
                    state()["phase"] == "complete" and state()["mode"] == "win",
                    "flight did not reach complete ending",
                )
                require(page.locator("#win").is_visible(), "ending screen missing")
                require(
                    page.evaluate("localStorage.getItem('moonward-save')") is None,
                    "completed checkpoint was not cleared",
                )
                diagnostics["playthrough"] = state()
                page.screenshot(path=str(HERE / "ending-1920.png"))

            check(
                "complete campaign: healing, parts, checkpoint, signal retry, 12 rings and ending",
                campaign_check,
            )

            def attract_check():
                timing = page.evaluate(
                    "(()=>{__game.toTitle();__game.advance(9.8);const before=__game.getState().mode;__game.advance(.3);return{before,after:__game.getState()}})()"
                )
                require(
                    timing["before"] == "title", "attract mode began before ten seconds"
                )
                require(
                    state()["attract"] and state()["mode"] == "play",
                    "ten-second idle did not begin AI demo",
                )
                replay = page.evaluate("""(()=>{
                    const phases=[],modes=[];let completed=false,looped=false,flowers=0;
                    for(let seconds=0;seconds<180;seconds++){
                        __game.advance(1);const s=__game.getState();flowers=Math.max(flowers,s.flowersHealed);
                        if(phases.at(-1)!==s.phase)phases.push(s.phase);
                        if(modes.at(-1)!==s.mode)modes.push(s.mode);
                        if(s.phase==='complete')completed=true;
                        if(completed&&s.phase==='scavenge'){looped=true;break;}
                    }
                    return {phases,modes,completed,looped,flowers};
                })()""")
                diagnostics["attractReplay"] = replay
                require(
                    replay["completed"] and replay["looped"],
                    f"attract replay did not finish and loop: {replay}",
                )
                require(
                    replay["flowers"] > 0
                    and "signal" in replay["modes"]
                    and "flight" in replay["phases"],
                    f"attract replay omitted a major mechanic: {replay}",
                )
                page.keyboard.press("x")
                require(
                    state()["mode"] == "title" and not state()["attract"],
                    "input did not exit demo to title",
                )
                page.evaluate("""()=>{
                    window.__pad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
                    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__pad]});
                    __game.advance(10.1);__pad.buttons[0]={pressed:true,touched:true,value:1};
                }""")
                page.wait_for_function("!__game.getState().attract", timeout=10000)
                page.wait_for_timeout(350)
                require(
                    state()["mode"] == "title",
                    "held Cross exited attract and immediately started a game",
                )
                page.evaluate("__pad.buttons[0]={pressed:false,touched:false,value:0}")

            check(
                "ten-second attract mode, complete AI replay, loop and input exit",
                attract_check,
            )

            check(
                "uncaught browser errors",
                lambda: require(not errors, "; ".join(errors)),
            )
            context.close()

            def touch_check():
                mobile = browser.new_context(
                    viewport={"width": 390, "height": 844},
                    device_scale_factor=1,
                    is_mobile=True,
                    has_touch=True,
                )
                touch = mobile.new_page()
                try:
                    touch.goto(url, wait_until="networkidle", timeout=120000)
                    touch.wait_for_function(
                        "window.__game?.getState().ready", timeout=120000
                    )
                    touch.locator('#title [data-action="start"]').tap()
                    touch.evaluate("__game.teleport(0,18)")
                    initial = touch.evaluate("__game.getState().player")
                    cdp = mobile.new_cdp_session(touch)
                    cdp.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchStart", "touchPoints": [{"x": 65, "y": 650}]},
                    )
                    cdp.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchMove", "touchPoints": [{"x": 130, "y": 650}]},
                    )
                    try:
                        touch.wait_for_function(
                            "p=>{const s=__game.getState();return s.lastInput==='touch'&&Math.hypot(s.player.x-p.x,s.player.z-p.z)>.35}",
                            arg=initial,
                            timeout=10000,
                        )
                    finally:
                        cdp.send(
                            "Input.dispatchTouchEvent",
                            {"type": "touchEnd", "touchPoints": []},
                        )
                    require(
                        touch.locator("#pause-fab").is_visible(),
                        "touch pause menu button missing",
                    )
                    flower = touch.evaluate("__game.getState().flowers[0]")
                    touch.evaluate(
                        "p=>{__game.teleport(p.x,p.z);__game.advance(.05)}", flower
                    )
                    touch.locator("#touch-action").tap()
                    require(
                        touch.evaluate("__game.getState().flowersHealed") == 1,
                        "touch context HELP action did not heal flower",
                    )
                    require(
                        touch.evaluate(
                            "document.documentElement.scrollWidth<=innerWidth"
                        ),
                        "phone HUD causes horizontal overflow",
                    )
                    touch.locator("#pause-fab").tap()
                    require(
                        touch.evaluate("__game.getState().mode") == "pause",
                        "touch menu did not pause",
                    )
                finally:
                    mobile.close()

            check(
                "phone touch stick, context interaction, clear HUD and pause",
                touch_check,
            )

            def coop_check():
                coop = browser.new_context(viewport={"width": 900, "height": 600})
                host, guest = coop.new_page(), coop.new_page()
                try:
                    for copy in [host, guest]:
                        copy.goto(url, wait_until="networkidle", timeout=120000)
                        copy.wait_for_function(
                            "window.__game?.getState().ready", timeout=120000
                        )
                    room = host.evaluate("__game.network.host()")
                    guest.evaluate("code=>__game.network.join(code)", room)
                    host.wait_for_function(
                        "__game.network.info.connected", timeout=10000
                    )
                    guest.wait_for_function(
                        "__game.network.info.connected", timeout=10000
                    )
                    host.evaluate("__game.start();__game.dev('god',true)")
                    guest.wait_for_function(
                        "__game.getState().mode==='play'", timeout=10000
                    )
                    initial = host.evaluate("__game.snapshot().players[1]")
                    guest.keyboard.down("d")
                    try:
                        host.wait_for_function(
                            "p=>Math.abs(__game.snapshot().players[1].x-p.x)>.5",
                            arg=initial,
                            timeout=10000,
                        )
                    finally:
                        guest.keyboard.up("d")
                    target = host.evaluate("__game.getState().targets[0]")
                    host.evaluate(
                        "p=>{__game.teleport(p.x,p.z);__game.interact()}", target
                    )
                    guest.wait_for_function(
                        "__game.getState().inventory.length===1", timeout=10000
                    )
                    require(
                        guest.evaluate("__game.getState().inventory")
                        == host.evaluate("__game.getState().inventory"),
                        "shared objective inventory diverged",
                    )
                    pulses_before = host.evaluate("__game.getState().pulses")
                    result = guest.evaluate(
                        "(()=>{__game.network.sendInput({x:0,z:0});return __game.network.sendInput({x:0,z:0,pulse:true})})()"
                    )
                    require(
                        result, "one-shot co-op action was dropped by movement throttle"
                    )
                    host.wait_for_function(
                        "n=>__game.getState().pulses>n",
                        arg=pulses_before,
                        timeout=10000,
                    )
                    guest.keyboard.press("Escape")
                    host.wait_for_function(
                        "__game.getState().mode==='pause'", timeout=10000
                    )
                    guest.wait_for_function(
                        "__game.getState().mode==='pause'", timeout=10000
                    )
                    guest.keyboard.press("Escape")
                    host.wait_for_function(
                        "__game.getState().mode==='play'", timeout=10000
                    )
                    host.evaluate(
                        "__game.dev('parts');__game.beginSignal();__game.advance(5)"
                    )
                    guest.wait_for_function(
                        "__game.getState().mode==='signal'&&__game.getState().signalReady",
                        timeout=10000,
                    )
                    for index, note in enumerate(
                        host.evaluate("__game.getState().pattern")
                    ):
                        guest.keyboard.press(str(note + 1))
                        if index < 3:
                            host.wait_for_function(
                                "n=>__game.getState().signalIndex===n",
                                arg=index + 1,
                                timeout=10000,
                            )
                    host.wait_for_function(
                        "__game.getState().phase==='flight'", timeout=10000
                    )
                    guest.wait_for_function(
                        "__game.getState().phase==='flight'", timeout=10000
                    )
                    guest.evaluate("__game.network.close()")
                    host.wait_for_function(
                        "!__game.network.info.connected", timeout=10000
                    )
                finally:
                    coop.close()

            check(
                "standalone two-player movement, shared objectives, action delivery and leave",
                coop_check,
            )

            def hub_check(scenario="standard"):
                hub_context = browser.new_context(
                    viewport={"width": 1200, "height": 800}
                )
                harness = hub_context.new_page()
                try:
                    query = urlencode(
                        {
                            "game": "/" + GAME.name,
                            "players": 2,
                            "auto": 1,
                            "play": 1500,
                            "latency": 50,
                            "jitter": 15,
                            "loss": 2,
                            "scenario": scenario,
                        }
                    )
                    harness.goto(
                        origin + "/" + quote(HERE.name) + "/hub/harness.html?" + query,
                        wait_until="domcontentloaded",
                    )
                    harness.wait_for_function(
                        "document.body.dataset.complete==='true'", timeout=120000
                    )
                    report = harness.evaluate("__hubCheck")
                    diagnostics["hub-" + scenario] = report
                    failed = [
                        f"{r['name']}: {r.get('detail', '')}"
                        for r in report["checks"]
                        if not r["pass"]
                    ]
                    require(report["pass"], "; ".join(failed))
                finally:
                    hub_context.close()

            check(
                "upstream AI Hub two-player conformance with simulated network impairment",
                hub_check,
            )
            check(
                "upstream AI Hub dedicated-server conformance",
                lambda: hub_check("server"),
            )
            check(
                "upstream AI Hub host-departure conformance",
                lambda: hub_check("host-leave"),
            )

            def file_smoke():
                local = browser.new_context(viewport={"width": 960, "height": 640})
                try:
                    copy = local.new_page()
                    copy.goto(GAME.as_uri(), wait_until="networkidle", timeout=120000)
                    copy.wait_for_function(
                        "window.__game?.getState().ready", timeout=120000
                    )
                    require(
                        copy.evaluate("__game.renderInfo().backend") == "WebGPU",
                        "file package failed to initialize WebGPU",
                    )
                    copy.locator('#title [data-action="start"]').click()
                    copy.evaluate("__game.advance(.2)")
                    require(
                        copy.evaluate("__game.getState().mode") == "play",
                        "file package could not start gameplay",
                    )
                finally:
                    local.close()

            check("shared single HTML starts from file URL", file_smoke)

            def visual_capture():
                visual = browser.new_context(viewport={"width": 1920, "height": 1080})
                try:
                    copy = visual.new_page()
                    copy.goto(
                        url + "?webgl=1", wait_until="networkidle", timeout=120000
                    )
                    copy.wait_for_function(
                        "window.__game?.getState().ready", timeout=120000
                    )
                    require(
                        copy.evaluate("__game.renderInfo().backend") == "WebGL2",
                        "visual compatibility renderer unavailable",
                    )
                    copy.wait_for_timeout(800)
                    copy.screenshot(path=str(HERE / "title-final.png"))
                    copy.evaluate(
                        "__game.start();__game.beginFlight();__game.advance(2)"
                    )
                    copy.wait_for_timeout(1000)
                    copy.screenshot(path=str(HERE / "flight-final.png"))
                finally:
                    visual.close()

            check(
                "WebGL compatibility and title/flight visual captures", visual_capture
            )
            browser.close()
    except Exception as error:  # noqa: BLE001 -- report harness setup failure once
        outcomes.append({"name": "harness", "passed": False, "error": str(error)})
        print(f"FAIL harness: {error}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    passed = sum(x["passed"] for x in outcomes)
    failed = len(outcomes) - passed
    result_path.write_text(
        json.dumps(
            {"checks": outcomes, "browserErrors": errors, "diagnostics": diagnostics},
            indent=2,
        )
    )
    print(f"{passed} passed, {failed} failed ({len(outcomes)} checks)")
    return int(bool(failed))


if __name__ == "__main__":
    raise SystemExit(main())
