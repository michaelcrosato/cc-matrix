"""Headless integration checks. Run ./test.sh; successful checks stay quiet."""

from __future__ import annotations

import argparse
import contextlib
import http.server
import json
import pathlib
import subprocess
import sys
import threading
import time
import traceback
from collections.abc import Callable
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
GAME_FILE = HERE.parent / (HERE.name + ".html")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def local_server():
    def handler(*args, **kwargs):
        return QuietHandler(*args, directory=str(HERE.parent), **kwargs)

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/{GAME_FILE.name}"
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=2)


PAD_STUB = """(() => {
 const p={id:'Test DualSense',index:0,connected:true,mapping:'standard',timestamp:0,
 axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
 window.__testPad=p; window.__padConnected=false;
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__padConnected?[p]:[]});
})();"""


class Suite:
    def __init__(self):
        self.results = []
        self.errors = []
        self.page = None
        self.context = None
        self.browser = None
        self.url = ""

    def check(self, name: str, operation: Callable):
        started = time.monotonic()
        try:
            details = operation()
            self.results.append(
                {
                    "name": name,
                    "passed": True,
                    "seconds": round(time.monotonic() - started, 3),
                    "details": details,
                }
            )
            return details
        except Exception as exc:  # noqa: BLE001 - a check must not abort later checks
            message = str(exc).splitlines()[0]
            print(f"FAIL {name}: {message}", flush=True)
            self.results.append(
                {
                    "name": name,
                    "passed": False,
                    "seconds": round(time.monotonic() - started, 3),
                    "error": str(exc),
                    "trace": traceback.format_exc(),
                }
            )
            return None

    def js(self, source, arg=None):
        return self.page.evaluate(source, arg)

    def snapshot(self):
        return self.js("() => window.__game.snapshot()")

    def ready(self, page):
        page.goto(self.url, wait_until="domcontentloaded", timeout=90000)
        assert "Haunted House Party" in page.title(), "The served page is not this game"
        page.wait_for_function("window.__game?.ready === true", timeout=120000)
        page.wait_for_timeout(300)

    def start(self, mode="solo"):
        self.js("mode => window.__game.start(mode)", mode)
        self.page.wait_for_timeout(80)

    def step(self, seconds, movement=None):
        return self.js(
            "([s,i])=>window.__game.testStep(s,i)", [seconds, movement or {}]
        )

    def action(self, name):
        return self.js("n=>window.__game.action(n)", name)

    def player(self):
        return self.js("()=>({...window.__game.state.players[0]})")

    def run(self, browser, url, screenshots=False):
        self.browser, self.url = browser, url
        self.context = browser.new_context(viewport={"width": 1440, "height": 900})
        self.context.add_init_script(PAD_STUB)
        self.page = self.context.new_page()
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        loaded = self.check(
            "boot/title", lambda: self.ready(self.page) or self.snapshot()
        )
        if not loaded:
            self.context.close()
            return
        self.run_checks()
        self.check("no uncaught browser errors", self.assert_no_errors)
        self.context.close()
        if screenshots:
            self.check("TV visual capture", self.capture_views)
        self.check("AI Hub protocol conformance", self.test_hub)

    def assert_no_errors(self):
        assert not self.errors, "; ".join(self.errors[:4])
        return {"pageErrors": 0}

    def run_checks(self):
        # Game-specific checks are deliberately kept together below.
        self.check("start solo", self.test_start)
        self.check("keyboard movement and Rapier wall collision", self.test_movement)
        self.check("match light and one-hand inventory swapping", self.test_inventory)
        self.check("mouse world navigation and object click", self.test_mouse)
        self.check("storm audio, gust and flash setting", self.test_storm)
        self.check("key locks, sealed vault and stairs", self.test_gates_stairs)
        self.check("dodge, enemy contact, scepter protection", self.test_combat)
        self.check("pause, developer sliders and defaults", self.test_pause_developer)
        self.check("journal and settings glyphs", self.test_journal)
        self.check("standard gamepad input", self.test_gamepad)
        self.check("local two-player controls", self.test_local_coop)
        self.check("complete four-floor physics playthrough", self.test_playthrough)
        self.check("loss result and replay", self.test_loss)
        self.check("attract mode and input exit", self.test_attract)
        self.check("attract AI complete mansion route", self.test_attract_route)
        self.check("source information and feedback credits", self.test_credits)
        self.check(
            "long-menu controller scrolling and focus visibility",
            self.test_menu_accessibility,
        )
        self.check("procedural audio offline render", self.test_audio)
        self.check("standalone two-page shared world", self.test_standalone)
        self.check(
            "touch movement, automatic light and context action", self.test_touch
        )

        self.check("single HTML file launch", self.test_file_launch)

    def test_mouse(self):
        self.start()
        self.page.wait_for_timeout(150)
        point = self.js("()=>window.__game.view.project(4,5)")
        self.page.mouse.click(point["x"], point["y"])
        self.page.wait_for_function(
            "Math.hypot(window.__game.state.players[0].x-4,window.__game.state.players[0].z-5)<1.7",
            timeout=10000,
        )
        self.page.keyboard.press("Space")
        self.page.wait_for_timeout(100)
        self.page.locator("#context").click()
        self.page.wait_for_function(
            "window.__game.state.players[0].carry==='key'", timeout=5000
        )
        return {"worldClickNavigates": True, "contextClickPicksUp": True}

    def test_storm(self):
        self.start()
        self.js(
            "()=>{window.__game.state.enemies=[];window.__game.state.stormTimer=.05;}"
        )
        before = self.js("()=>window.__game.audio.stats().counts.thunder||0")
        state = self.step(0.1, {"match": True})
        assert state["lightning"] > 0 and state["players"][0]["lit"] == 0, state
        assert (
            self.js("()=>window.__game.audio.stats().counts.thunder||0") == before + 1
        )
        self.js(
            "()=>{window.__game.config.flashes=false;window.__game.state.stormTimer=.05;}"
        )
        state = self.step(0.1, {"match": True})
        assert state["lightning"] == 0
        self.js("()=>window.__game.resetConfig()")
        return {
            "gustSnuffsMatch": True,
            "thunderSynthesized": True,
            "flashesCanBeDisabled": True,
        }

    def test_gates_stairs(self):
        self.start()
        self.js("()=>window.__game.teleport(4.2,5.5,1)")
        self.step(1 / 60, {"interact": True})
        assert all(d["locked"] for d in self.snapshot()["doors"] if d["floor"] == 1)
        self.start()
        self.js("()=>window.__game.teleport(4,5,0)")
        self.step(1 / 60, {"match": True, "interact": True})
        self.js("()=>window.__game.teleport(4.2,5.5,1)")
        self.step(1 / 60, {"interact": True})
        assert all(not d["locked"] for d in self.snapshot()["doors"] if d["floor"] == 1)
        self.js("()=>window.__game.teleport(0,1.8,3)")
        self.step(1 / 60, {"interact": True})
        assert all(d["locked"] for d in self.snapshot()["doors"] if d["floor"] == 3)
        self.start()
        route = self.js("()=>window.__game.routeTo(-14,-8)")
        assert route["ok"], route
        self.step(1 / 60, {"interact": True})
        assert self.snapshot()["floor"] == 1
        self.js("()=>window.__game.teleport(14,8,1)")
        self.step(1 / 60, {"interact": True})
        assert self.snapshot()["floor"] == 0
        return {"keyRequired": True, "vaultRejectsKey": True, "stairsRoundTrip": True}

    def test_attract_route(self):
        self.start("attract")
        state = self.step(420)
        assert state["phase"] == "won", {
            "phase": state["phase"],
            "floor": state["floor"],
            "player": state["players"][0],
            "doors": state["doors"],
        }
        assert state["players"][0]["pieces"] == 3
        assert all(any(floor) for floor in state["visited"])
        self.action("title")
        return {
            "simulatedSeconds": 420,
            "finishedAt": round(state["elapsed"], 2),
            "pieces": 3,
        }

    def test_file_launch(self):
        context = self.browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            page.goto(GAME_FILE.as_uri(), wait_until="domcontentloaded", timeout=90000)
            assert "Haunted House Party" in page.title()
            page.wait_for_function("window.__game?.ready === true", timeout=120000)
            assert page.evaluate("window.__game.renderer") == "WebGPU"
            page.evaluate("()=>window.__game.start('solo')")
            assert page.evaluate("window.__game.state.phase") == "playing"
            return {"scheme": "file://", "renderer": "WebGPU"}
        finally:
            context.close()

    def capture_views(self):
        context = self.browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        try:
            page.goto(
                self.url + "?renderer=webgl",
                wait_until="domcontentloaded",
                timeout=90000,
            )
            page.wait_for_function("window.__game?.ready === true", timeout=120000)
            page.evaluate(
                "()=>{window.__game.action('title');window.__game.setIdle(-1000);}"
            )
            page.wait_for_timeout(300)
            page.evaluate("()=>window.__game.freezeRender(true)")
            assert page.locator("#title").is_visible()
            page.screenshot(path=str(HERE / "title-screenshot.png"), timeout=90000)
            page.evaluate(
                "()=>{window.__game.start('solo');window.__game.teleport(0,5.5,0);window.__game.testStep(.02,{match:true});window.__game.freezeRender(false);}"
            )
            page.wait_for_timeout(500)
            page.evaluate("()=>window.__game.freezeRender(true)")
            page.screenshot(path=str(HERE / "game-screenshot.png"), timeout=90000)
            return {
                "viewport": "1920x1080",
                "renderer": "WebGL diagnostic fallback",
                "files": ["title-screenshot.png", "game-screenshot.png"],
            }
        finally:
            context.close()

    def test_movement(self):
        self.start()
        before = self.player()
        self.page.keyboard.down("KeyD")
        self.page.wait_for_timeout(500)
        self.page.keyboard.up("KeyD")
        after = self.player()
        distance = (
            (after["x"] - before["x"]) ** 2 + (after["z"] - before["z"]) ** 2
        ) ** 0.5
        assert distance > 0.15, {"before": before, "after": after}
        assert self.js("window.__game.inputMode") == "keyboard"
        self.js("()=>window.__game.teleport(0,-9.5,0)")
        self.step(2, {"z": -1})
        stopped = self.player()
        assert -10.7 < stopped["z"] < -9.5, stopped
        self.js("()=>window.__game.teleport(0,-5.5,0)")
        route = self.js("()=>window.__game.routeTo(12,-5.5)")
        assert route["ok"] and route["steps"] > 50, route
        return {
            "keyboardDistance": round(distance, 2),
            "wallStopZ": stopped["z"],
            "doorwayRoute": route,
        }

    def test_inventory(self):
        self.start()
        self.js("()=>window.__game.teleport(4,5,0)")
        self.step(1 / 60, {"interact": True})
        assert self.player()["carry"] is None, "An unlit object was collected"
        state = self.step(1 / 60, {"match": True, "interact": True})
        assert self.player()["carry"] == "key", state
        assert state["matches"] >= 1 and self.player()["lit"] > 0
        route = self.js("()=>window.__game.routeTo(-12,5)")
        assert route["ok"], route
        self.step(1 / 60, {"match": True, "interact": True})
        state = self.snapshot()
        assert self.player()["carry"] == "scepter", state
        key = next(item for item in state["items"] if item["type"] == "key")
        assert key["held"] is None and abs(key["x"] + 12) < 1, key
        self.step(1 / 60, {"drop": True})
        assert self.player()["carry"] is None
        self.js(
            "()=>{window.__game.config.matchDuration=3;window.__game.state.enemies=[]}"
        )
        self.step(3.1, {"match": True})
        assert self.player()["lit"] == 0
        self.js("()=>window.__game.resetConfig()")
        return {"matches": state["matches"], "swappedKey": key}

    def test_combat(self):
        self.start()
        self.js("()=>window.__game.teleport(0,5.5,0)")
        before = self.player()
        self.step(0.1, {"x": 1, "dash": True})
        after = self.player()
        assert after["x"] - before["x"] > 0.7 and after["dashCooldown"] > 2, after
        self.js("""()=>{const s=window.__game.state,p=s.players[0];
          s.elapsed=12;p.invulnerable=0;p.dashing=0;p.lit=15;
          s.enemies=[{id:999,type:'ghost',x:p.x,z:p.z,homeX:p.x,homeZ:p.z,stun:0,phase:0,windCooldown:0}];} """)
        hit = self.step(1 / 60)
        assert hit["lives"] == 8 and self.player()["invulnerable"] > 0, hit
        assert self.player()["lit"] == 0, "A nearby creature did not snuff the match"
        self.start()
        self.js("()=>window.__game.teleport(-12,5,0)")
        self.step(1 / 60, {"match": True, "interact": True})
        self.js("""()=>{const s=window.__game.state,p=s.players[0];s.elapsed=12;p.invulnerable=0;
          s.enemies=[{id:998,type:'ghost',x:p.x,z:p.z,homeX:p.x,homeZ:p.z,stun:0,phase:0,windCooldown:0}];} """)
        protected = self.step(0.2)
        assert protected["lives"] == 9 and self.player()["carry"] == "scepter", (
            protected
        )
        return {"afterHit": hit["lives"], "protected": protected["lives"]}

    def test_pause_developer(self):
        self.start()
        self.page.keyboard.press("Escape")
        assert self.snapshot()["phase"] == "paused"
        before = self.player()
        self.step(0.5, {"x": 1})
        assert self.player()["x"] == before["x"], "Pause did not stop simulation"
        self.page.locator('[data-action="dev"]').click()
        assert self.page.locator('[data-config="speed"]').count() == 1
        self.page.locator('[data-config="speed"]').evaluate(
            "el=>{el.value='8.4';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}"
        )
        assert abs(float(self.js("window.__game.config.speed")) - 8.4) < 0.001
        self.page.locator('[data-action="reset-dev"]').click()
        defaults = self.js("()=>({...window.__game.config})")
        assert (
            defaults["speed"] == 4.8
            and defaults["enemySpeed"] == 1
            and defaults["matchDuration"] == 20
        ), defaults
        self.action("resume")
        assert self.snapshot()["phase"] == "playing"
        return {"resetSpeed": defaults["speed"], "liveSliders": 4}

    def test_journal(self):
        self.start()
        self.page.keyboard.press("Tab")
        assert self.page.locator(".map-room").count() == 6
        assert self.page.locator(".floor-tabs button").count() == 4
        self.page.locator('[data-map-floor="3"]').click()
        assert self.page.locator(".map-room").count() == 6
        self.action("resume")
        self.action("settings")
        self.page.locator('[data-config="glyphs"]').select_option("xbox")
        assert self.js("window.__game.config.glyphs") == "xbox"
        self.action("reset-settings")
        self.action("resume")
        return {"floors": 4, "roomsPerFloor": 6, "glyphOption": "Xbox ABXY"}

    def pad_press(self, index):
        self.js(
            "i=>{window.__padConnected=true;window.__testPad.buttons[i].pressed=true;window.__testPad.buttons[i].value=1}",
            index,
        )
        self.page.wait_for_timeout(220)
        self.js(
            "i=>{window.__testPad.buttons[i].pressed=false;window.__testPad.buttons[i].value=0}",
            index,
        )
        self.page.wait_for_timeout(110)

    def test_gamepad(self):
        self.start()
        self.js("()=>{window.__padConnected=true;window.__testPad.axes[0]=.85;}")
        before = self.player()
        self.page.wait_for_timeout(500)
        self.js("()=>window.__testPad.axes[0]=0")
        after = self.player()
        assert self.js("window.__game.inputMode") == "gamepad"
        distance = (
            (after["x"] - before["x"]) ** 2 + (after["z"] - before["z"]) ** 2
        ) ** 0.5
        assert distance > 0.15, {"before": before, "after": after}
        matches = self.snapshot()["matches"]
        self.js(
            "()=>{window.__testPad.buttons[2].pressed=true;window.__testPad.buttons[2].value=1}"
        )
        self.page.wait_for_timeout(220)
        self.js(
            "()=>{window.__testPad.buttons[2].pressed=false;window.__testPad.buttons[2].value=0;window.__padConnected=false}"
        )
        assert self.snapshot()["matches"] > matches
        self.action("title")
        self.action("settings")
        self.page.locator("#cfg-music").focus()
        volume = self.js("window.__game.config.music")
        self.pad_press(15)
        assert self.js("window.__game.config.music") > volume
        self.pad_press(0)
        assert (
            self.snapshot()["phase"] == "title"
            and self.page.locator("#overlay").is_visible()
        )
        self.page.locator('[data-config="glyphs"]').focus()
        self.pad_press(15)
        assert self.js("window.__game.config.glyphs") == "xbox"
        self.action("resume")
        self.start()
        self.page.wait_for_timeout(100)
        assert self.js("window.__game.inputMode") == "gamepad"
        assert "LB" in self.page.locator("#controls").inner_text()
        self.js("()=>{window.__padConnected=false;window.__game.resetConfig()}")
        return {
            "movement": round(distance, 2),
            "standardSquareLightsMatch": True,
            "padAdjustsSliderAndGlyphs": True,
            "crossKeepsSettingsOpen": True,
        }

    def test_local_coop(self):
        self.start("local")
        state = self.snapshot()
        assert len(state["players"]) == 2, state
        before = state["players"][1]
        self.page.keyboard.down("ArrowRight")
        self.page.wait_for_timeout(450)
        self.page.keyboard.up("ArrowRight")
        after = self.snapshot()["players"][1]
        assert after["x"] - before["x"] > 0.1, {"before": before, "after": after}
        return {"players": 2, "secondPlayerMoved": True}

    def test_playthrough(self):
        self.start()
        result = self.js("()=>window.__game.debug.solve()")
        state = self.snapshot()
        assert result["won"] and state["phase"] == "won", result
        assert result["pieces"] == 3 and len(result["log"]) >= 13, result
        assert state["floor"] == 0 and all(any(floor) for floor in state["visited"]), (
            state["visited"]
        )
        assert all(not door["locked"] for door in state["doors"]), state["doors"]
        assert state["elapsed"] > 50 and state["matches"] >= 3, result
        assert self.page.locator('[data-action="retry"]').is_visible()
        return result

    def test_loss(self):
        self.start()
        self.js("()=>window.__game.debug.lose()")
        assert self.snapshot()["phase"] == "lost"
        assert "Scared out" in self.page.locator("#overlay").inner_text()
        self.page.locator('[data-action="retry"]').click()
        assert self.snapshot()["phase"] == "playing" and self.snapshot()["lives"] == 9
        return {"replayRestoresLives": 9}

    def test_attract(self):
        self.action("title")
        self.js("()=>window.__game.setIdle(10.1)")
        self.page.wait_for_function(
            "window.__game.state.phase==='attract'", timeout=5000
        )
        before = self.player()
        self.step(2)
        after = self.player()
        assert ((after["x"] - before["x"]) ** 2 + (after["z"] - before["z"]) ** 2) > 0.1
        self.page.keyboard.press("KeyA")
        assert self.snapshot()["phase"] == "title"
        return {"idleSeconds": 10, "aiMoved": True, "inputReturnsToTitle": True}

    def test_menu_accessibility(self):
        self.action("title")
        self.action("about")
        self.page.wait_for_timeout(120)
        panel = self.page.locator("#overlay .panel")
        assert panel.evaluate("el=>el.scrollHeight>el.clientHeight+100")
        panel.evaluate("el=>el.scrollTop=0")
        self.page.keyboard.press("PageDown")
        assert panel.evaluate("el=>el.scrollTop") > 50
        panel.evaluate("el=>el.scrollTop=0")
        self.js("()=>{window.__padConnected=true;window.__testPad.axes[3]=.9}")
        self.page.wait_for_timeout(300)
        self.js("()=>window.__testPad.axes[3]=0")
        assert panel.evaluate("el=>el.scrollTop") > 0
        assert self.js("window.__game.inputMode") == "gamepad"
        assert self.page.locator("#overlay a").count() >= 2
        self.js("()=>window.__padConnected=false")
        self.action("back")
        self.start()
        self.action("pause")
        self.action("dev")
        self.page.wait_for_timeout(100)
        self.page.locator("#cfg-speed").focus()
        for _ in range(10):
            self.page.keyboard.press("ArrowDown")
        visible = self.page.locator('[data-action="reset-dev"]').evaluate(
            "el=>{const r=el.getBoundingClientRect(),p=el.closest('.panel').getBoundingClientRect();return {focused:document.activeElement===el,visible:r.top>=p.top&&r.bottom<=p.bottom+2,scroll:el.closest('.panel').scrollTop}}"
        )
        assert visible["focused"] and visible["visible"] and visible["scroll"] > 0, (
            visible
        )
        self.action("resume")
        return {
            "pageDownScroll": True,
            "rightStickScroll": True,
            "lastInputUpdates": True,
            "developerFocusVisible": True,
        }

    def test_credits(self):
        self.action("about")
        text = self.page.locator("#overlay").inner_text()
        for label in [
            "Source Information",
            "Testing Feedback",
            "Engine Feedback",
            "Prompt Feedback",
            "added on import",
            "Haunted House",
            "1982",
        ]:
            assert label in text, f"Missing credits field {label}"
        self.action("back")
        return {"requiredCreditsSections": 4}

    def test_standalone(self):
        self.action("title")
        guest = self.context.new_page()
        try:
            self.ready(guest)
            code = self.js("()=>window.__game.network.host()")
            assert len(code) == 6
            guest.evaluate("code=>window.__game.network.join(code)", code)
            guest.wait_for_function(
                "window.__game.network.started && window.__game.state.players.length===2",
                timeout=10000,
            )
            self.page.wait_for_function(
                "window.__game.state.players.length===2", timeout=10000
            )
            before = self.js("()=>window.__game.state.players.find(p=>p.id===1).x")
            guest.keyboard.down("KeyD")
            guest.wait_for_timeout(650)
            guest.keyboard.up("KeyD")
            self.page.wait_for_timeout(300)
            after = self.js("()=>window.__game.state.players.find(p=>p.id===1).x")
            assert after > before + 0.1, {"before": before, "after": after}
            a = self.js("()=>window.__game.network.stats()")
            b = guest.evaluate("()=>window.__game.network.stats()")
            assert a["sent"] and a["received"] and b["sent"] and b["received"], {
                "host": a,
                "guest": b,
            }
            assert (
                guest.evaluate("window.__game.state.floor") == self.snapshot()["floor"]
            )
            guest.evaluate("()=>window.__game.network.leave()")
            self.page.wait_for_function(
                "window.__game.state.players.length===1", timeout=5000
            )
            return {"host": a, "guest": b, "remoteInputMovedHostPlayer": True}
        finally:
            guest.close()
            self.action("title")

    def test_touch(self):
        context = self.browser.new_context(
            viewport={"width": 844, "height": 390},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=1,
        )
        page = context.new_page()
        try:
            self.ready(page)
            page.locator('[data-action="solo"]').tap()
            page.wait_for_timeout(200)
            assert page.evaluate("window.__game.inputMode") == "touch"
            assert page.evaluate("window.__game.state.players[0].lit") > 0
            before = page.evaluate("()=>({...window.__game.state.players[0]})")
            cdp = context.new_cdp_session(page)
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 280, "y": 220}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 340, "y": 220}]},
            )
            page.wait_for_timeout(450)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            after = page.evaluate("()=>({...window.__game.state.players[0]})")
            assert (
                (after["x"] - before["x"]) ** 2 + (after["z"] - before["z"]) ** 2
            ) > 0.03, {"before": before, "after": after}
            page.evaluate("()=>window.__game.teleport(4,5,0)")
            page.wait_for_timeout(150)
            page.locator("#context").tap()
            page.wait_for_timeout(150)
            assert page.evaluate("window.__game.state.players[0].carry") == "key"
            assert page.locator("#controls").is_hidden()
            return {
                "viewport": "844x390",
                "automaticLight": True,
                "dragMovement": True,
                "contextPickup": True,
            }
        finally:
            context.close()

    def test_audio(self):
        result = self.js("()=>window.__game.audio.testOffline()")
        assert result.get("finite") is True, result
        assert result.get("soundsRendered", 0) >= 16, result
        assert result.get("nonZeroSamples", 0) > 10000, result
        assert result.get("rms", 0) > 0.005, result
        assert result.get("peak", 0) > 0.05, result
        stats = self.js("()=>window.__game.audio.stats()")
        assert abs(stats["musicVolume"] - 0.1) < 0.001, stats
        return result

    def test_hub(self):
        base = self.url.rsplit("/", 1)[0]
        query = urlencode(
            {
                "game": "../" + GAME_FILE.name,
                "auto": "1",
                "players": "2",
                "play": "2500",
                "latency": "40",
                "jitter": "10",
            }
        )
        context = self.browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        try:
            page.goto(
                f"{base}/{HERE.name}/harness.html?{query}",
                wait_until="domcontentloaded",
            )
            assert page.title() == "AI Hub Session Harness", "Wrong harness page"
            page.wait_for_function("window.__hubCheck?.done === true", timeout=120000)
            result = page.evaluate("window.__hubCheck")
            (HERE / "hub-test-results.json").write_text(json.dumps(result, indent=2))
            failures = [item for item in result["checks"] if not item["pass"]]
            assert result["pass"], "; ".join(
                f"{item['name']}: {item['detail']}" for item in failures
            )
            return {
                "checks": len(result["checks"]),
                "players": result["players"],
                "pass": result["pass"],
            }
        finally:
            context.close()

    def test_start(self):
        self.start()
        state = self.snapshot()
        assert state["phase"] == "playing", state
        assert len(state["players"]) == 1
        return {"phase": state["phase"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--screenshots",
        action="store_true",
        help="Capture title and play views for visual inspection",
    )
    parser.add_argument(
        "--network",
        action="store_true",
        help="Also run adverse AI Hub, roster and real WebRTC checks",
    )
    options = parser.parse_args()
    suite = Suite()
    if not GAME_FILE.is_file():
        print(f"FAIL package: missing {GAME_FILE.name}")
        print("0 passed, 1 failed")
        return 1
    with local_server() as url, sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        try:
            suite.run(browser, url, options.screenshots)
        finally:
            browser.close()
    if options.network:
        started = time.monotonic()
        try:
            process = subprocess.run(
                [sys.executable, str(HERE / "network-tests.py")],
                cwd=HERE,
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )
            network_report = json.loads(
                (HERE / "network-test-results.json").read_text()
            )
            for line in process.stdout.splitlines():
                if line.startswith("FAIL"):
                    print(line)
            for check in network_report["checks"]:
                suite.results.append(
                    {
                        "name": "extended network: " + check["name"],
                        "passed": check["passed"] is not False,
                        "unknown": check["passed"] is None,
                        "seconds": check.get("seconds", 0),
                        "details": check,
                    }
                )
            if process.returncode and not network_report.get("failed"):
                raise RuntimeError(
                    process.stderr.strip() or "Network runner failed without a report"
                )
        except (OSError, ValueError, subprocess.TimeoutExpired, RuntimeError) as exc:
            print(f"FAIL extended network runner: {exc}")
            suite.results.append(
                {
                    "name": "extended network runner",
                    "passed": False,
                    "seconds": round(time.monotonic() - started, 3),
                    "error": str(exc),
                }
            )
    failures = sum(not result["passed"] for result in suite.results)
    unknown = sum(bool(result.get("unknown")) for result in suite.results)
    passed = len(suite.results) - failures - unknown
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "parameters": {
            "browser": "Chromium 153 / Playwright 1.63",
            "viewport": "1440x900 + mobile touch",
            "graphics": "software WebGPU",
            "controller": "emulated standard DualSense",
            "network": "two pages on loopback",
            "audio": "OfflineAudioContext",
        },
        "passed": passed,
        "failed": failures,
        "unknown": unknown,
        "checks": suite.results,
    }
    (HERE / "test-results.json").write_text(json.dumps(report, indent=2))
    suffix = f", {unknown} unknown" if unknown else ""
    print(f"{passed} passed, {failures} failed{suffix}")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
