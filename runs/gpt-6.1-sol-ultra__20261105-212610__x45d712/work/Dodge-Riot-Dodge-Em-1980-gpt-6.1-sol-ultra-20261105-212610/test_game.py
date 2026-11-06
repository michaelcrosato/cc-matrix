#!/usr/bin/env python3
"""One-command regression checks. Prints only failures and a one-line count.

Run with the workstation's Playwright interpreter:
/home/micha/.local/share/pipx/venvs/playwright/bin/python <this file>
"""

from __future__ import annotations

import base64
import functools
import http.server
import json
import os
import re
import struct
import subprocess
import sys
import tempfile
import threading
import traceback
import zlib
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
STEM = HERE.name
ARTIFACTS = HERE / "test-artifacts"
ARTIFACTS.mkdir(exist_ok=True)
TEMP = ARTIFACTS / "tmp"
TEMP.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(TEMP)
tempfile.tempdir = str(TEMP)

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(line_buffering=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class Checks:
    def __init__(self):
        self.passed = 0
        self.failures = []
        self.details = {}

    def run(self, name, fn):
        (ARTIFACTS / "progress.json").write_text(
            json.dumps(
                {
                    "pid": os.getpid(),
                    "current": name,
                    "passed": self.passed,
                    "failed": len(self.failures),
                }
            )
        )
        try:
            result = fn()
            self.passed += 1
            if result is not None:
                self.details[name] = result
        except Exception as exc:  # noqa: BLE001 - isolate and report every regression
            text = f"FAIL {name}: {type(exc).__name__}: {exc}"
            self.failures.append(text)
            print(text)
            self.details[name] = {
                "error": str(exc),
                "traceback": traceback.format_exc(),
            }


def require(ok, message):
    if not ok:
        raise AssertionError(message)


PAD_SCRIPT = """(() => {
    window.__testErrors=[];
    addEventListener('error',e=>window.__testErrors.push(e.message));
    addEventListener('unhandledrejection',e=>window.__testErrors.push(String(e.reason)));
    window.__testPad = null;
    Object.defineProperty(navigator, 'getGamepads', {
      configurable:true, value:()=>window.__testPad ? [window.__testPad] : []
    });
    window.__makeTestPad = () => {
      window.__testPad = {
        id:'DualSense standard test controller', index:0, connected:true,
        mapping:'standard', timestamp:performance.now(), axes:[0,0,0,0],
        buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),
        vibrationActuator:{type:'dual-rumble',playEffect:()=>Promise.resolve('complete')}
      };
      window.dispatchEvent(new Event('gamepadconnected'));
    };
})();"""


RENDER_GATE_SCRIPT = """(() => {
    let game;
    Object.defineProperty(window,'__game',{
        configurable:true,
        get:()=>game,
        set:value=>{
            game=value;
            const scene=value.scene;
            scene.__testDraw=scene.render.bind(scene);
            scene.render=()=>{};
        }
    });
})();"""


def save_rgba_png(path, width, height, pixels):
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
        )

    rows = b"".join(
        b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height)
    )
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(rows))
        + chunk(b"IEND", b"")
    )


def canary_main():
    if "--full-chromium" in sys.argv:
        os.chdir(ARTIFACTS)
        os.environ["TMPDIR"] = "."
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    results = []
    variants = {
        "baseline" if "--baseline" in sys.argv else "vulkan": []
        if "--baseline" in sys.argv
        else ["--use-angle=vulkan"]
    }
    if "--matrix" in sys.argv:
        variants = {
            "angle-vulkan": ["--use-angle=vulkan"],
            "angle-swiftshader": ["--use-angle=swiftshader"],
            "vulkan-swiftshader": ["--use-angle=vulkan", "--use-vulkan=swiftshader"],
            "vulkan-nosurface": [
                "--use-angle=vulkan",
                "--use-vulkan=swiftshader",
                "--disable-vulkan-surface",
            ],
        }
    try:
        with sync_playwright() as playwright:
            for variant, flags in variants.items():
                browser = playwright.chromium.launch(
                    headless=True,
                    channel="chromium" if "--full-chromium" in sys.argv else None,
                    args=[
                        "--enable-unsafe-webgpu",
                        "--enable-features=Vulkan",
                        "--use-webgpu-adapter=swiftshader",
                        *flags,
                    ],
                )
                context = browser.new_context(ignore_https_errors=True)
                for mode in ("raw", "raw-all-features", "three-basic", "three-toon"):
                    page = context.new_page()
                    errors = []
                    page.on(
                        "pageerror",
                        lambda error, errors=errors: errors.append(str(error)),
                    )
                    try:
                        page.goto(
                            f"http://127.0.0.1:{server.server_address[1]}/{STEM}/test-artifacts/webgpu-canary.html?mode={mode}",
                            wait_until="domcontentloaded",
                        )
                        page.wait_for_function("window.canary?.done", timeout=20000)
                        result = page.evaluate("window.canary")
                    except Exception as error:  # noqa: BLE001 - diagnostic isolation
                        result = {
                            "mode": mode,
                            "pass": False,
                            "errors": errors + [str(error)],
                        }
                    result["variant"] = variant
                    results.append(result)
                    if not result["pass"]:
                        print(
                            "FAIL WebGPU canary "
                            + variant
                            + "/"
                            + mode
                            + ": "
                            + json.dumps(
                                {
                                    k: v
                                    for k, v in result.items()
                                    if k in {"lost", "errors", "center"}
                                }
                            )
                        )
                    page.close()
                context.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    name = (
        "webgpu-matrix-results.json"
        if "--matrix" in sys.argv
        else "webgpu-canary-results.json"
    )
    (ARTIFACTS / name).write_text(json.dumps(results, indent=2))
    passed = sum(result["pass"] for result in results)
    print(f"{passed} canary checks passed, {len(results) - passed} failed")
    return passed != len(results)


def validate_metadata():
    metadata = json.loads((ROOT / "exit-interview.json").read_text())
    require(
        set(metadata)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
        "Exit interview top-level shape differs from requested schema",
    )
    source_keys = {
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
        set(metadata["sourceInformation"]) == source_keys,
        "Source Information fields differ from requested schema",
    )
    require(
        all(isinstance(v, str) and v for v in metadata["sourceInformation"].values()),
        "Source Information contains empty/non-text values",
    )
    require(
        metadata["sourceInformation"]["usage"] == "added on import",
        "Usage must be added on import",
    )
    for key, length in (
        ("testingFeedback", 4),
        ("engineFeedback", 6),
        ("promptFeedback", 4),
    ):
        values = metadata[key]
        require(
            isinstance(values, list)
            and len(values) == length
            and all(isinstance(value, str) and value for value in values),
            f"{key} has missing or invalid answers",
        )
    hub = metadata["aiHub"]
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
        "Catalogue fields differ from requested schema",
    )
    require(
        hub["name"] == "Dodge Riot" and hub["type"] == "Game",
        "Catalogue name/type is incorrect",
    )
    require(
        all(
            isinstance(value, str) and (value or key == "series")
            for key, value in hub.items()
            if key != "tags"
        ),
        "Catalogue contains empty/non-text fields",
    )
    require(
        3 <= len(hub["tags"]) <= 6
        and all(
            isinstance(tag, str) and tag and tag == tag.lower() for tag in hub["tags"]
        ),
        "Catalogue tags must be 3–6 lowercase strings",
    )
    html = (ROOT / f"{STEM}.html").read_text()
    prefix = "const METADATA="
    require(prefix in html, "HTML has no embedded credits metadata")
    embedded = json.JSONDecoder().raw_decode(html.split(prefix, 1)[1])[0]
    require(embedded == metadata, "Root JSON and in-game About metadata differ")
    return {
        "sourceFields": len(source_keys),
        "feedbackAnswers": 14,
        "catalogueFields": len(hub),
    }


def package_main():
    checks = Checks()
    checks.run(
        "exit interview schema and embedded credits consistency", validate_metadata
    )
    print(f"{checks.passed} passed, {len(checks.failures)} failed")
    return bool(checks.failures)


def main():
    checks = Checks()
    html = ROOT / f"{STEM}.html"
    if not html.exists():
        print(f"FAIL package: missing {html.name}")
        print("0 passed, 1 failed")
        return 1

    simulation = subprocess.run(
        ["node", str(HERE / "sim-tests.mjs")],
        cwd=HERE,
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
    )
    sim_output = simulation.stdout + simulation.stderr
    sim_counts = re.search(
        r"(\d+) simulation checks: (\d+) passed, (\d+) failed", sim_output
    )
    if sim_counts:
        checks.passed += int(sim_counts[2])
        for failure in (
            line for line in sim_output.splitlines() if line.startswith("FAIL ")
        ):
            print(failure)
            checks.failures.append(failure)
        if simulation.returncode and not int(sim_counts[3]):
            checks.failures.append("simulation process failed")
            print("FAIL simulation process: " + sim_output[-1000:])
    else:
        checks.failures.append("simulation suite did not report results")
        print("FAIL simulation suite: " + sim_output[-1000:])
    checks.details["simulation"] = sim_output
    networking = subprocess.run(
        ["node", str(HERE / "hub-tests.mjs")],
        cwd=HERE,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    net_output = networking.stdout + networking.stderr
    net_counts = re.search(r"(\d+) networking checks, (\d+) failures", net_output)
    if net_counts:
        checks.passed += int(net_counts[1]) - int(net_counts[2])
        for failure in (
            line for line in net_output.splitlines() if line.startswith("FAIL ")
        ):
            print(failure)
            checks.failures.append(failure)
    else:
        checks.failures.append("networking suite did not report results")
        print("FAIL networking suite: " + net_output[-1000:])
    checks.details["networking"] = net_output
    checks.run(
        "exit interview schema and embedded credits consistency", validate_metadata
    )

    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    url = f"{origin}/{STEM}.html?test=1"
    errors = []
    console_errors = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                channel="chromium" if "--full-chromium" in sys.argv else None,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--use-angle=vulkan",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                device_scale_factor=1,
                ignore_https_errors=True,
            )
            context.add_init_script(PAD_SCRIPT)
            context.add_init_script(RENDER_GATE_SCRIPT)
            page = context.new_page()
            page.on("pageerror", lambda err: errors.append(str(err)))
            page.on(
                "console",
                lambda message: (
                    console_errors.append(message.text)
                    if message.type == "error"
                    else None
                ),
            )
            page.goto(url, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_function(
                "(window.__game && typeof window.__game.snapshot === 'function') || window.__testErrors.length || document.querySelector('.error-screen')",
                timeout=120000,
            )
            require(
                page.evaluate("!!window.__game"),
                "Boot failed: "
                + " | ".join(errors + console_errors)
                + " "
                + page.locator("body").inner_text()[-1000:],
            )

            def snap():
                return page.evaluate("window.__game.snapshot()")

            def act(name, arg=None):
                return page.evaluate(
                    "([n,a]) => window.__game.action(n,a)", [name, arg]
                )

            def step(seconds):
                return page.evaluate("s => window.__game.step(s)", seconds)

            def wait_graphics(target):
                target.bring_to_front()
                target.evaluate("""() => {
                    const g=window.__game;
                    g.scene.update(0,g.sim,g.snapshot().screen);
                    (g.scene.__testDraw||g.scene.render.bind(g.scene))();
                }""")
                target.wait_for_function(
                    "window.__game.snapshot().drawCalls > 0", timeout=30000
                )
                target.evaluate("""async () => {
                    const frame=()=>Promise.race([new Promise(resolve=>requestAnimationFrame(resolve)),new Promise(resolve=>setTimeout(resolve,150))]);
                    await frame();
                    await frame();
                    const device=window.__game.scene.renderer.backend.device;
                    if(device)await Promise.race([device.queue.onSubmittedWorkDone(),new Promise(resolve=>setTimeout(resolve,1500))]);
                    await frame();
                }""")

            def ready_play(players=1):
                act("title")
                act("start", {"players": players})
                step(3)
                require(snap()["screen"] == "play", f"Expected play, got {snap()}")

            def title_package():
                require(
                    "Dodge Riot" in page.title(), f"Wrong page title {page.title()!r}"
                )
                require(snap()["screen"] == "title", f"Expected title screen: {snap()}")
                require(page.locator("canvas").count() > 0, "No rendering canvas")
                source = html.read_text()
                require(
                    "0.180.0" in source or "three@0.180" in source,
                    "Three.js R180 not pinned",
                )
                require("0.19.3" in source, "Rapier 0.19.3 not pinned")
                return {"bytes": html.stat().st_size, "title": page.title()}

            checks.run("single-file package and correct game", title_package)

            def renderer_physics():
                state = snap()
                require(
                    "webgpu" in str(state.get("renderer", "")).lower(),
                    f"WebGPU not active: {state.get('renderer')}",
                )
                require(bool(state.get("rapier")), "Rapier physics did not initialize")
                wait_graphics(page)
                pixels = page.evaluate("""async () => {
                    const T=await import('three');
                    const g=window.__game,r=g.scene.renderer;
                    const target=new T.RenderTarget(512,320,{type:T.UnsignedByteType});
                    const previous=r.getRenderTarget();
                    try{
                        r.setRenderTarget(target);
                        r.render(g.scene.scene,g.scene.camera);
                        const data=await r.readRenderTargetPixelsAsync(target,0,0,512,320);
                        const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
                        let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
                        return {width:512,height:320,data:btoa(binary)};
                    }finally{r.setRenderTarget(previous);target.dispose();}
                }""")
                rgba = base64.b64decode(pixels["data"])
                colors = {rgba[i : i + 3] for i in range(0, len(rgba), 4)}
                require(
                    8 < len(colors) < pixels["width"] * pixels["height"] // 2,
                    f"Offscreen scene output resembles blank/corrupt pixels: {len(colors)} colors",
                )
                save_rgba_png(
                    ARTIFACTS / "game-webgpu-readback.png",
                    pixels["width"],
                    pixels["height"],
                    rgba,
                )
                state = snap()
                require(
                    state.get("drawCalls", 0) > 0,
                    "Renderer never submitted live geometry draw calls",
                )
                return {
                    "renderer": state.get("renderer"),
                    "rapier": state.get("rapier"),
                    "drawCalls": state.get("drawCalls"),
                    "graphicsRecovery": state.get("graphicsRecovery"),
                    "offscreenColors": len(colors),
                }

            checks.run("WebGPU renderer and Rapier initialization", renderer_physics)

            def attract_timing():
                act("title")
                step(9.7)
                require(not snap().get("attract"), "Attract started before ten seconds")
                step(0.5)
                require(
                    snap().get("attract"),
                    f"Attract did not start after ten seconds: {snap()}",
                )
                initial = snap()
                step(14)
                require(snap().get("attract"), "Attract stopped instead of looping")
                require(
                    snap().get("score", 0) > 0 or snap().get("round", 1) > 1,
                    "Attract did not demonstrate gameplay",
                )
                page.keyboard.press("ArrowLeft")
                page.wait_for_timeout(100)
                require(
                    not snap().get("attract") and snap()["screen"] == "title",
                    "Input did not exit attract to title",
                )
                return {"initial": initial, "after": snap()}

            checks.run(
                "ten-second attract mode, AI play, and input exit", attract_timing
            )

            def start_keyboard_pause():
                act("title")
                start_button = page.locator(
                    '[data-action="start"], [data-action="solo"]'
                ).first
                require(
                    start_button.is_visible(), "Title's start button is not visible"
                )
                start_button.focus()
                page.keyboard.press("Enter")
                step(3)
                require(
                    snap()["screen"] == "play", f"Enter did not start game: {snap()}"
                )
                before = snap()
                page.wait_for_function(
                    "value => window.__game.snapshot().players[0].progress !== value",
                    arg=before["players"][0]["progress"],
                    timeout=5000,
                )
                after = snap()
                require(
                    after["players"][0]["progress"] != before["players"][0]["progress"],
                    "Player car did not drive automatically",
                )
                page.keyboard.press("Escape")
                page.wait_for_timeout(80)
                require(snap()["screen"] == "paused", "Escape did not pause")
                paused = snap()
                step(2)
                require(
                    snap()["players"][0]["progress"]
                    == paused["players"][0]["progress"],
                    "Simulation advanced while paused",
                )
                page.keyboard.press("Escape")
                page.wait_for_timeout(80)
                require(snap()["screen"] == "play", "Escape did not resume")
                return {"progress": after["players"][0]["progress"]}

            checks.run(
                "keyboard start, automatic driving, pause and resume",
                start_keyboard_pause,
            )

            def driving_input():
                ready_play()
                act("charge", 100)
                before = snap()
                page.keyboard.down("Space")
                page.wait_for_function(
                    "charge=>window.__game.snapshot().players[0].charge < charge",
                    arg=before["players"][0]["charge"],
                    timeout=5000,
                )
                page.keyboard.up("Space")
                after = snap()
                require(
                    after.get("boost", 100) < before.get("boost", 100)
                    or after["players"][0].get(
                        "charge", after["players"][0].get("boost", 100)
                    )
                    < before["players"][0].get(
                        "charge", before["players"][0].get("boost", 100)
                    ),
                    "Boost input did not spend charge",
                )
                lane = after["players"][0]["lane"]
                key = "ArrowRight" if lane == 0 else "ArrowLeft"
                page.keyboard.down(key)
                step(8)
                page.keyboard.up(key)
                require(
                    snap()["players"][0]["lane"] != lane,
                    f"Lane control never changed lanes: {snap()}",
                )
                return {"before": before, "after": snap()}

            checks.run("keyboard boost and junction lane change", driving_input)

            def pickup_scoring():
                ready_play()
                before = snap()
                step(3)
                after = snap()
                require(
                    after["score"] > before["score"],
                    "Driving over lane dots did not score",
                )
                require(
                    after["dotsLeft"] < before["dotsLeft"], "Dots were not collected"
                )
                return {"score": after["score"], "dotsLeft": after["dotsLeft"]}

            checks.run("dot collection and scoring", pickup_scoring)

            def collisions_restart():
                ready_play()
                before = snap()["lives"]
                act("hit")
                require(snap()["lives"] == before - 1, "Hit did not remove one life")
                step(3)
                for _ in range(10):
                    if snap()["screen"] == "results":
                        break
                    act("hit")
                    step(3)
                require(
                    snap()["screen"] == "results",
                    f"Exhausting lives did not end run: {snap()}",
                )
                act("restart")
                step(3)
                require(snap()["screen"] == "play", "Restart did not return to play")
                require(snap()["lives"] == before, "Restart did not reset lives")
                require(snap()["round"] == 1, "Restart did not reset rounds")

            checks.run("damage, game over, and fresh restart", collisions_restart)

            def full_playthrough():
                ready_play()
                reached = []
                for round_number in range(1, 4):
                    state = snap()
                    require(
                        state["round"] == round_number,
                        f"Wrong progression before round {round_number}: {state}",
                    )
                    reached.append(round_number)
                    act("collectAll")
                    step(0.1)
                    require(
                        snap()["screen"] in {"roundclear", "results"}
                        or snap().get("phase") == "clear",
                        f"Round {round_number} did not complete: {snap()}",
                    )
                    if round_number < 3:
                        step(6)
                        require(
                            snap()["screen"] == "play",
                            f"Round transition did not resume: {snap()}",
                        )
                step(4)
                require(
                    snap()["screen"] == "results", "Final round did not reach results"
                )
                require(snap()["score"] > 0, "Completed run had no score")
                return {"rounds": reached, "result": snap()}

            checks.run("scripted complete three-round arcade run", full_playthrough)

            def coop():
                ready_play(2)
                state = snap()
                require(
                    len(state["players"]) == 2, "Local co-op did not spawn two cars"
                )
                first = [p["progress"] for p in state["players"]]
                step(2)
                second = [p["progress"] for p in snap()["players"]]
                require(
                    all(a != b for a, b in zip(first, second)),
                    "Both co-op cars did not advance",
                )
                return {"players": snap()["players"]}

            checks.run("simultaneous local two-player mode", coop)

            def dev_tools():
                ready_play()
                act("pause")
                dev_button = page.locator('[data-action="dev"]').first
                require(
                    dev_button.is_visible(), "Dev mode is not reachable from pause menu"
                )
                dev_button.click()
                ranges = page.locator('input[type="range"]:visible')
                require(
                    ranges.count() >= 3,
                    "Dev mode needs meaningful live balance sliders",
                )
                slider = ranges.first
                old = float(slider.input_value())
                minimum = float(slider.get_attribute("min") or 0)
                maximum = float(slider.get_attribute("max") or 100)
                stride = float(slider.get_attribute("step") or 1)
                new = old + stride if old + stride <= maximum else old - stride
                require(
                    minimum <= new <= maximum and new != old,
                    "First dev slider cannot change",
                )
                slider.focus()
                page.keyboard.press("ArrowRight" if new > old else "ArrowLeft")
                require(
                    float(slider.input_value()) == new,
                    "Slider did not accept changed value",
                )
                reset = page.locator('[data-action="resetConfig"]').first
                require(reset.is_visible(), "Dev balance reset button is absent")
                reset.click()
                require(
                    float(
                        page.locator('input[type="range"]:visible').first.input_value()
                    )
                    == old,
                    "Reset did not restore defaults",
                )
                return {"sliders": ranges.count()}

            checks.run("pause-accessible dev sliders and default reset", dev_tools)

            def settings_credits():
                act("title")
                act("settings")
                require(snap()["screen"] == "settings", "Settings did not open")
                body = page.locator("body").inner_text()
                require("music" in body.lower(), "Music volume setting absent")
                page.locator('[data-action="glyphs"]').click()
                require(
                    "xbox" in page.locator("body").inner_text().lower(),
                    "Xbox glyph setting absent",
                )
                page.locator('[data-action="glyphs"]').click()
                act("title")
                act("about")
                require(snap()["screen"] == "about", "About screen did not open")
                body = page.locator("body").inner_text().lower()
                for title in (
                    "source information",
                    "testing feedback",
                    "engine feedback",
                    "prompt feedback",
                    "added on import",
                ):
                    require(title in body, f"Missing credits content: {title}")
                require("dodge" in body and "1980" in body, "Source credit absent")

            checks.run(
                "settings and required About/Credits disclosures", settings_credits
            )

            def controller():
                act("title")
                page.evaluate("window.__makeTestPad()")
                try:
                    page.evaluate(
                        "window.__testPad.buttons[0]={pressed:true,touched:true,value:1}"
                    )
                    page.wait_for_function(
                        "window.__game.snapshot().screen === 'play'", timeout=5000
                    )
                    page.evaluate(
                        "window.__testPad.buttons[0]={pressed:false,touched:false,value:0}"
                    )
                    step(3)
                    page.evaluate(
                        "window.__testPad.buttons[9]={pressed:true,touched:true,value:1}"
                    )
                    page.wait_for_function(
                        "window.__game.snapshot().screen === 'paused'", timeout=5000
                    )
                    page.evaluate(
                        "window.__testPad.buttons[9]={pressed:false,touched:false,value:0}"
                    )
                    act("title")
                    act("about")
                    page.evaluate("window.__testPad.axes[3]=0.8")
                    page.wait_for_function(
                        "document.querySelector('.panel').scrollTop > 30", timeout=5000
                    )
                    scroll = page.locator(".panel").evaluate("el=>el.scrollTop")
                    return {"input": snap().get("inputType"), "creditsScroll": scroll}
                finally:
                    page.evaluate("window.__testPad=null")

            checks.run("standard gamepad confirm and Options pause", controller)

            def audio():
                ready_play()
                page.mouse.click(1800, 900)
                page.evaluate(
                    "async () => { await window.__game.audio.unlock(); window.__game.audio.sfx('boost'); window.__game.audio.sfx('voice'); }"
                )
                page.wait_for_timeout(180)
                data = page.evaluate("""() => {
                    const a=window.__game.audio, n=a.analyser;
                    const data=new Uint8Array(n.frequencyBinCount); n.getByteFrequencyData(data);
                    return {sum:Array.from(data).reduce((x,y)=>x+y,0),stats:a.stats,context:a.context?.state || a.ctx?.state};
                }""")
                require(
                    data["sum"] > 0,
                    f"Synthesized audio had no measurable signal: {data}",
                )
                return data

            checks.run("procedural music, effects, and gibberish audio signal", audio)

            def desktop_layout():
                act("title")
                bounds = page.evaluate("""() => {
                    const els=[...document.querySelectorAll('button')].filter(e=>e.offsetParent!==null);
                    return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
                      buttons:els.map(e=>{const r=e.getBoundingClientRect();return {text:e.innerText,x:r.x,y:r.y,w:r.width,h:r.height}})};
                }""")
                require(
                    bounds["scrollWidth"] <= bounds["width"] + 1,
                    "Desktop has horizontal overflow",
                )
                require(
                    all(b["w"] >= 40 and b["h"] >= 36 for b in bounds["buttons"]),
                    f"TV controls too small: {bounds}",
                )
                require(
                    all(
                        b["x"] >= -1
                        and b["y"] >= -1
                        and b["x"] + b["w"] <= 1921
                        and b["y"] + b["h"] <= 1081
                        for b in bounds["buttons"]
                    ),
                    f"Desktop menu controls clipped: {bounds}",
                )
                visual = context.new_page()
                try:
                    visual.goto(
                        url,
                        wait_until="domcontentloaded",
                        timeout=90000,
                    )
                    visual.wait_for_function("window.__game", timeout=120000)
                    wait_graphics(visual)
                    visual.screenshot(path=str(ARTIFACTS / "title-1920.png"))
                    visual.evaluate(
                        "window.__game.action('start',{players:1});window.__game.step(6)"
                    )
                    wait_graphics(visual)
                    visual.screenshot(path=str(ARTIFACTS / "play-1920.png"))
                finally:
                    visual.close()
                return bounds

            checks.run(
                "ten-foot desktop menu layout and visual captures", desktop_layout
            )

            def mobile():
                mobile_context = browser.new_context(
                    viewport={"width": 844, "height": 390},
                    device_scale_factor=1,
                    is_mobile=True,
                    has_touch=True,
                    ignore_https_errors=True,
                )
                mobile_context.add_init_script(RENDER_GATE_SCRIPT)
                try:
                    mobile_page = mobile_context.new_page()
                    mobile_page.goto(url, wait_until="domcontentloaded", timeout=90000)
                    mobile_page.wait_for_function("window.__game", timeout=120000)
                    mobile_page.locator(
                        '[data-action="start"], [data-action="solo"]'
                    ).first.tap()
                    mobile_page.evaluate("window.__game.step(3)")
                    require(
                        mobile_page.evaluate("window.__game.snapshot().screen")
                        == "play",
                        "Touch did not start play",
                    )
                    mobile_page.touchscreen.tap(220, 220)
                    mobile_page.wait_for_timeout(150)
                    bounds = mobile_page.evaluate(
                        "({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})"
                    )
                    require(
                        bounds["scrollWidth"] <= bounds["width"] + 1,
                        f"Mobile horizontal overflow: {bounds}",
                    )
                    require(
                        bounds["scrollHeight"] <= bounds["height"] + 1,
                        f"Mobile vertical overflow: {bounds}",
                    )
                    wait_graphics(mobile_page)
                    mobile_page.locator("#touch-menu").tap()
                    require(
                        mobile_page.evaluate("window.__game.snapshot().screen")
                        == "paused",
                        "Touch menu did not pause the game",
                    )
                    mobile_page.locator('[data-action="dev"]').tap()
                    require(
                        mobile_page.evaluate("window.__game.snapshot().screen")
                        == "dev",
                        "Touch could not reach the dev garage",
                    )
                    require(
                        mobile_page.locator('input[type="range"]:visible').count() >= 3,
                        "Touch dev garage has no live sliders",
                    )
                    mobile_page.locator('[data-action="back"]').first.tap()
                    mobile_page.locator('[data-action="resume"]').tap()
                    require(
                        mobile_page.evaluate("window.__game.snapshot().screen")
                        == "play",
                        "Touch resume did not return to play",
                    )
                    mobile_page.evaluate("window.__game.step(3)")
                    wait_graphics(mobile_page)
                    mobile_page.screenshot(path=str(ARTIFACTS / "play-mobile.png"))
                    mobile_page.set_viewport_size({"width": 390, "height": 844})
                    wait_graphics(mobile_page)
                    portrait = mobile_page.evaluate(
                        "({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})"
                    )
                    require(
                        portrait["scrollWidth"] <= portrait["width"] + 1
                        and portrait["scrollHeight"] <= portrait["height"] + 1,
                        f"Portrait touch overflow: {portrait}",
                    )
                    mobile_page.screenshot(
                        path=str(ARTIFACTS / "play-mobile-portrait.png")
                    )
                    return {"landscape": bounds, "portrait": portrait}
                finally:
                    mobile_context.close()

            checks.run("touch-only landscape play and layout", mobile)

            def file_loading():
                direct = context.new_page()
                try:
                    direct.goto(
                        html.as_uri() + "?test=1",
                        wait_until="domcontentloaded",
                        timeout=90000,
                    )
                    direct.wait_for_function("window.__game", timeout=120000)
                    require(
                        "Dodge Riot" in direct.title(),
                        "Shared file loaded the wrong game",
                    )
                    state = direct.evaluate("window.__game.snapshot()")
                    require(
                        state["screen"] == "title",
                        f"file:// did not reach title: {state}",
                    )
                    require(
                        bool(state.get("rapier")),
                        "Rapier failed when opening shared HTML directly",
                    )
                    return {
                        "renderer": state.get("renderer"),
                        "rapier": state.get("rapier"),
                    }
                finally:
                    direct.close()

            checks.run("single HTML opens directly through file://", file_loading)

            def direct_online():
                act("title")
                partner = context.new_page()
                try:
                    partner.goto(url, wait_until="domcontentloaded", timeout=90000)
                    partner.wait_for_function(
                        "window.__game && window.__game.network", timeout=120000
                    )
                    require(
                        page.evaluate("!!window.__game.network"),
                        "HubLink is not exposed as __game.network",
                    )
                    offer = page.evaluate("() => window.__game.network.createOffer()")
                    require(
                        offer.startswith("RIOT1."),
                        "Host did not produce a Dodge Riot connection code",
                    )
                    answer = partner.evaluate(
                        "code => window.__game.network.joinOffer(code)", offer
                    )
                    page.evaluate(
                        "code => window.__game.network.acceptAnswer(code)", answer
                    )
                    page.wait_for_function(
                        "window.__game.network.connected && window.__game.network.started",
                        timeout=20000,
                    )
                    partner.wait_for_function(
                        "window.__game.network.connected && window.__game.network.started",
                        timeout=20000,
                    )
                    page.wait_for_timeout(4200)
                    host_state = snap()
                    guest_state = partner.evaluate("window.__game.snapshot()")
                    require(
                        host_state["screen"] == "play",
                        f"Online host did not start playing: {host_state}",
                    )
                    require(
                        guest_state["screen"] == "play",
                        f"Online guest did not start playing: {guest_state}",
                    )
                    require(
                        len(host_state["players"]) == 2
                        and len(guest_state["players"]) == 2,
                        "Online co-op did not share both cars",
                    )
                    partner.keyboard.down("Space")
                    partner.wait_for_timeout(250)
                    partner.keyboard.up("Space")
                    hs = page.evaluate("window.__game.network.stats")
                    gs = partner.evaluate("window.__game.network.stats")
                    require(
                        hs["snapshotsSent"] > 0 and hs["inputsReceived"] > 0,
                        f"Host missing game traffic: {hs}",
                    )
                    require(
                        gs["snapshotsReceived"] > 0 and gs["inputsSent"] > 0,
                        f"Guest missing game traffic: {gs}",
                    )
                    act("finish")
                    partner.wait_for_function(
                        "window.__game.snapshot().screen === 'results'", timeout=10000
                    )
                    final_host = snap()
                    final_guest = partner.evaluate("window.__game.snapshot()")
                    require(
                        final_host["phase"] == "won" and final_guest["phase"] == "won",
                        "Direct co-op did not synchronize a winning result",
                    )
                    require(
                        final_guest["score"] == final_host["score"],
                        "Direct co-op guest final score differs from host",
                    )
                    require(
                        final_guest["dotsLeft"] == final_host["dotsLeft"],
                        "Direct co-op guest final pickups differ from host",
                    )
                    partner.evaluate("window.__game.network.disconnect()")
                    return {
                        "host": hs,
                        "guest": gs,
                        "finalHost": final_host,
                        "finalGuest": final_guest,
                    }
                finally:
                    partner.close()
                    page.evaluate("window.__game.network.disconnect()")
                    act("title")

            checks.run(
                "standalone two-page WebRTC co-op and bidirectional game traffic",
                direct_online,
            )

            def runtime_clean():
                require(not errors, "Browser runtime errors: " + " | ".join(errors))
                relevant = [
                    e
                    for e in console_errors
                    if "favicon" not in e and "net::ERR" not in e
                ]
                require(not relevant, "Browser console errors: " + " | ".join(relevant))
                return {"runtimeErrors": errors, "consoleErrors": console_errors}

            checks.run("no browser runtime or renderer errors", runtime_clean)
            context.close()
            for scenario in ("standard", "server", "host-leave"):

                def harness_check(scenario=scenario):
                    harness_context = browser.new_context(
                        viewport={"width": 1280, "height": 720},
                        ignore_https_errors=True,
                    )
                    harness_context.add_init_script(RENDER_GATE_SCRIPT)
                    try:
                        harness = harness_context.new_page()
                        harness_url = (
                            f"{origin}/{STEM}/hub-reference/harness.html"
                            f"?game=../../{STEM}.html&players=2&auto=1"
                            f"&play=2500&scenario={scenario}"
                        )
                        harness.goto(
                            harness_url, wait_until="domcontentloaded", timeout=90000
                        )
                        harness.wait_for_function(
                            "window.__hubCheck?.done", timeout=120000
                        )
                        report = harness.evaluate("window.__hubCheck")
                        failures = [c for c in report["checks"] if not c["pass"]]
                        require(
                            report["pass"],
                            " | ".join(
                                c["name"] + ": " + c.get("detail", "") for c in failures
                            ),
                        )
                        return report
                    finally:
                        harness_context.close()

                checks.run(f"official AI Hub harness: {scenario}", harness_check)
            browser.close()

            def graphics_recovery():
                recovery_browser = playwright.chromium.launch(
                    headless=True,
                    args=[
                        "--enable-unsafe-webgpu",
                        "--enable-features=Vulkan",
                        "--use-webgpu-adapter=swiftshader",
                    ],
                )
                recovery_context = recovery_browser.new_context(
                    ignore_https_errors=True, viewport={"width": 1280, "height": 720}
                )
                try:
                    recovery_page = recovery_context.new_page()
                    recovery_page.goto(
                        url, wait_until="domcontentloaded", timeout=90000
                    )
                    recovery_page.wait_for_function("window.__game", timeout=120000)
                    recovery_page.wait_for_function(
                        "window.__game.snapshot().renderer.toLowerCase().includes('recovery') && window.__game.snapshot().drawCalls>0 && window.__game.snapshot().framesRendered>1",
                        timeout=30000,
                    )
                    state = recovery_page.evaluate("window.__game.snapshot()")
                    require(
                        "recovery" in state["renderer"].lower(),
                        f"Graphics did not recover: {state}",
                    )
                    recovery_page.locator('[data-action="solo"]').click()
                    recovery_page.evaluate("window.__game.step(3)")
                    require(
                        recovery_page.evaluate("window.__game.snapshot().screen")
                        == "play",
                        "Graphics recovery blocked starting a game",
                    )
                    recovery_page.screenshot(path=str(ARTIFACTS / "recovery-1280.png"))
                    return state
                finally:
                    recovery_context.close()
                    recovery_browser.close()

            checks.run(
                "lost WebGPU device recovers drawing through native WebGL2",
                graphics_recovery,
            )
    except Exception as exc:  # noqa: BLE001 - isolate and report every regression
        checks.failures.append(str(exc))
        print(f"FAIL runner setup: {type(exc).__name__}: {exc}")
        checks.details["setup"] = traceback.format_exc()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)

    report = {
        "passed": checks.passed,
        "failed": len(checks.failures),
        "failures": checks.failures,
        "details": checks.details,
        "browserErrors": errors,
        "consoleErrors": console_errors,
    }
    (ARTIFACTS / "results.json").write_text(json.dumps(report, indent=2))
    print(f"{checks.passed} passed, {len(checks.failures)} failed")
    return bool(checks.failures)


if __name__ == "__main__":
    sys.exit(
        canary_main()
        if "--canary" in sys.argv
        else package_main()
        if "--package" in sys.argv
        else main()
    )
