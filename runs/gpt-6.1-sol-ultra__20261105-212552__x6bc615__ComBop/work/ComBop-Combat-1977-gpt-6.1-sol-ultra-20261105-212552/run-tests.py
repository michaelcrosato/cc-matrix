#!/home/micha/.local/share/pipx/venvs/playwright/bin/python
"""ComBop regression runner. Run this file directly from any directory."""

from __future__ import annotations

import argparse
import contextlib
import functools
import hashlib
import http.server
import json
import pathlib
import runpy
import threading
import time
import traceback
from collections.abc import Callable, Iterator
from typing import Any

from playwright.sync_api import Browser, Page, sync_playwright

PROJECT = pathlib.Path(__file__).resolve().parent
ROOT = PROJECT.parent
SLUG = PROJECT.name
GAME = ROOT / f"{SLUG}.html"
RESULT = PROJECT / "test-results.json"
GPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=swiftshader",
    "--use-vulkan=swiftshader",
    "--disable-vulkan-surface",
    "--autoplay-policy=no-user-gesture-required",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        pass


@contextlib.contextmanager
def local_server() -> Iterator[str]:
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


class Suite:
    def __init__(
        self,
        browser: Browser,
        origin: str,
        only: list[str] | None = None,
        preserve: bool = False,
    ) -> None:
        self.browser = browser
        self.origin = origin
        self.results: list[dict[str, Any]] = []
        self.started = time.monotonic()
        self.only = only or []
        self.previous = (
            json.loads(RESULT.read_text()).get("results", [])
            if preserve and RESULT.exists()
            else []
        )
        self.package_hash = (
            hashlib.sha256(GAME.read_bytes()).hexdigest()
            if GAME.exists()
            else "missing"
        )

    def check(self, name: str, action: Callable[[], Any]) -> None:
        if self.only and not any(
            fragment.casefold() in name.casefold() for fragment in self.only
        ):
            return
        start = time.monotonic()
        try:
            detail = action()
            self.results.append(
                {
                    "name": name,
                    "packageSha256": self.package_hash,
                    "pass": True,
                    "seconds": round(time.monotonic() - start, 2),
                    "detail": detail,
                }
            )
        except Exception as error:  # noqa: BLE001 - Keep running after an individual check fails.
            message = f"{type(error).__name__}: {error}"
            print(f"FAIL {name}: {message}", flush=True)
            self.results.append(
                {
                    "name": name,
                    "packageSha256": self.package_hash,
                    "pass": False,
                    "seconds": round(time.monotonic() - start, 2),
                    "error": message,
                    "traceback": traceback.format_exc(),
                }
            )

    @contextlib.contextmanager
    def page(
        self, *, touch: bool = False, controller: bool = False, controllers: int = 1
    ) -> Iterator[Page]:
        context = self.browser.new_context(
            viewport={"width": 844, "height": 390}
            if touch
            else {"width": 1600, "height": 900},
            has_touch=touch,
            is_mobile=touch,
            device_scale_factor=1,
        )
        if controller:
            context.add_init_script(
                """window.__testPads = Array.from({length:CONTROLLERS}, (_, index) => ({id:'DualSense Wireless Controller',index,
                connected:true,mapping:'standard',timestamp:0,
                axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));
                window.__testPad = window.__testPads[0];
                window.__padPolls=0;
                navigator.getGamepads = ()=>{window.__padPolls++;return [...window.__testPads,...Array(4-window.__testPads.length).fill(null)]};""".replace(
                    "CONTROLLERS", str(controllers)
                )
            )
        page = context.new_page()
        errors: list[str] = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: (
                errors.append(message.text) if message.type == "error" else None
            ),
        )
        try:
            yield page
            assert not errors, "Uncaught browser errors: " + " | ".join(errors)
        except Exception as error:
            if errors and not str(error).startswith("Uncaught browser errors:"):
                raise AssertionError(
                    f"{error}; browser errors: {' | '.join(errors)}"
                ) from error
            raise
        finally:
            context.close()

    def open_game(self, page: Page, *, file: bool = False) -> None:
        url = GAME.as_uri() if file else f"{self.origin}/{GAME.name}"
        response = page.goto(url, wait_until="domcontentloaded", timeout=90000)
        if response:
            assert response.ok, f"Game returned HTTP {response.status}"
        page.wait_for_function("Boolean(window.__COMBOP__)", timeout=90000)
        page.wait_for_function("window.__COMBOP__.ready === true", timeout=90000)
        assert "ComBop" in page.title(), "Served page is not ComBop"

    @staticmethod
    def state(page: Page) -> dict[str, Any]:
        return page.evaluate("window.__COMBOP__.inspect()")

    @staticmethod
    def debug(page: Page, method: str, *args: Any) -> Any:
        return page.evaluate(
            "([method,args]) => window.__COMBOP__.debug[method](...args)",
            [method, list(args)],
        )

    @staticmethod
    def screen(page: Page, expected: str) -> None:
        page.wait_for_function(
            "screen => window.__COMBOP__.inspect().screen === screen",
            arg=expected,
            timeout=10000,
        )

    @staticmethod
    def back(page: Page, panel: str) -> None:
        page.locator(f"#{panel}-screen [data-action='back']").first.click()

    @staticmethod
    def pad(
        page: Page,
        *,
        buttons: list[int] | None = None,
        axes: list[float] | None = None,
        index: int = 0,
    ) -> None:
        polls = page.evaluate(
            """({buttons, axes, index}) => {
                const pad = window.__testPads[index];
                pad.timestamp = performance.now();
                if (buttons !== null) pad.buttons.forEach((b,i)=>{
                    b.pressed=buttons.includes(i);b.touched=b.pressed;b.value=b.pressed?1:0;
                });
                if (axes !== null) pad.axes=axes;
                return window.__padPolls;
            }""",
            {"buttons": buttons, "axes": axes, "index": index},
        )
        page.wait_for_function(
            "polls=>window.__padPolls>polls", arg=polls, timeout=10000
        )

    def boot(self, *, file: bool) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page, file=file)
            state = self.state(page)
            assert state["screen"] == "title", state
            assert state["ready"] is True
            assert "webgpu" in json.dumps(state["renderer"]).lower(), state["renderer"]
            assert state["physics"], "Rapier world was not initialized"
            assert state["musicVolume"] == 0.1, state["musicVolume"]
            assert page.locator("canvas").count() >= 1
            return {
                "renderer": state["renderer"],
                "physics": state["physics"],
                "screen": state["screen"],
            }

    def menus(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            page.locator("#settings-button").click()
            self.screen(page, "settings")
            music = page.locator("#music-volume")
            music.evaluate(
                "el=>{el.value='23';el.dispatchEvent(new Event('input',{bubbles:true}));}"
            )
            assert abs(self.state(page)["musicVolume"] - 0.23) < 0.001
            page.locator("#glyph-style").select_option("xbox")
            assert "xbox" in json.dumps(self.state(page)["settings"]).lower()
            self.back(page, "settings")
            self.screen(page, "title")
            page.locator("#guide-button").click()
            self.screen(page, "guide")
            guide = page.locator("#guide-screen").inner_text().lower()
            assert "bounce" in guide and "burst" in guide, guide
            self.back(page, "guide")
            page.locator("#about-button").click()
            self.screen(page, "about")
            credit_panels: dict[str, str] = {}
            for section in [
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
            ]:
                page.locator(f"[data-credit='{section}']").click()
                credit_panels[section] = (
                    page.locator("#credits-body").inner_text().lower()
                )
                assert len(credit_panels[section]) > 80, f"Credits omit {section}"
            credits = credit_panels["sourceInformation"]
            for value in ["1977", "2026-11-05", "added on import", "gpt-6.1-sol"]:
                assert value in credits, f"Credits omit {value}"
            self.back(page, "about")
            page.locator("#start-solo").click()
            self.screen(page, "play")
            page.keyboard.press("Escape")
            self.screen(page, "paused")
            before = self.state(page)
            page.wait_for_timeout(450)
            after = self.state(page)
            assert before["tanks"] == after["tanks"], (
                "Tanks continued moving during local pause"
            )
            page.locator("#pause-screen [data-action='settings']").click()
            self.screen(page, "settings")
            assert abs(self.state(page)["musicVolume"] - 0.23) < 0.001, (
                "Music setting was not retained"
            )
            self.back(page, "settings")
            self.screen(page, "paused")
            page.locator("#dev-button").click()
            self.screen(page, "dev")
            original: dict[str, float] = {}
            changed: dict[str, float] = {}
            for name in ["speed", "shellSpeed", "reload", "ai", "ricochets", "damage"]:
                slider = page.locator(f"[data-dev='{name}']")
                assert slider.count() == 1, f"Missing {name} balance slider"
                original[name] = float(slider.input_value())
                changed[name] = slider.evaluate(
                    """el=>{const min=Number(el.min),max=Number(el.max),old=Number(el.value);
                    el.value=String(old===max?min:max);el.dispatchEvent(new Event('input',{bubbles:true}));
                    return Number(el.value);}"""
                )
                assert changed[name] != original[name], f"{name} slider did not move"
            page.locator("#dev-screen [data-action='dev-reset']").click()
            for name, value in original.items():
                assert (
                    float(page.locator(f"[data-dev='{name}']").input_value()) == value
                ), f"{name} reset failed"
            self.back(page, "dev")
            page.locator("#resume").click()
            self.screen(page, "play")
            return {
                "pauseFrozen": True,
                "music": 0.23,
                "slidersReset": list(original),
                "credits": "all required sections",
            }

    def gameplay(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            page.locator("#start-solo").click()
            self.screen(page, "play")
            self.debug(
                page,
                "setInput",
                1,
                {"mx": 0, "mz": 0, "ax": 1, "az": 0, "fire": False, "dash": False},
            )
            self.debug(page, "step", 3)
            self.debug(page, "setTank", 0, {"x": -10, "z": 7, "shield": 0, "ammo": 3})
            self.debug(page, "setTank", 1, {"x": 10, "z": 7, "shield": 0})
            before = self.state(page)
            page.keyboard.down("d")
            self.debug(page, "step", 0.25)
            page.keyboard.up("d")
            moved = self.state(page)
            displacement = (
                (moved["tanks"][0]["x"] - before["tanks"][0]["x"]) ** 2
                + (moved["tanks"][0]["z"] - before["tanks"][0]["z"]) ** 2
            ) ** 0.5
            assert displacement > 0.05, "WASD input did not move the tank"
            page.mouse.move(1100, 450)
            page.mouse.down()
            self.debug(page, "step", 0.25)
            page.mouse.up()
            fired = self.state(page)
            assert fired["metrics"]["shots"] > before["metrics"]["shots"], (
                "Mouse fire produced no shot"
            )
            page.keyboard.press("Space")
            self.debug(page, "step", 0.1)
            dashed = self.state(page)
            assert dashed["metrics"]["dashes"] > before["metrics"]["dashes"], (
                "Space produced no dash"
            )
            bounce_before = dashed["metrics"]["bounces"]
            self.debug(page, "spawnShot", 0, {"x": 0, "z": 7.8, "dx": 0, "dz": 1})
            self.debug(page, "step", 0.35)
            banked = self.state(page)
            assert banked["metrics"]["bounces"] > bounce_before, (
                "Boundary collision did not ricochet"
            )
            tank = banked["tanks"][0]
            self.debug(page, "spawnPickup", "overdrive", tank["x"], tank["z"])
            self.debug(page, "step", 0.2)
            picked = self.state(page)
            assert picked["metrics"]["pickups"] > banked["metrics"]["pickups"], (
                "Overlapping pickup was not collected"
            )
            self.debug(page, "damage", 1, 999)
            destroyed = self.state(page)
            assert destroyed["scores"][0] > before["scores"][0], (
                "Destruction did not credit attacker"
            )
            self.debug(page, "step", 3)
            respawned = self.state(page)
            assert respawned["tanks"][1]["hp"] > 0, "Destroyed tank failed to respawn"
            return {
                "movement": round(displacement, 3),
                "metrics": respawned["metrics"],
                "scores": respawned["scores"],
            }

    def circuit(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            page.locator("#start-solo").click()
            rounds: list[int] = []
            for expected in range(3):
                self.screen(page, "play")
                state = self.state(page)
                assert state["round"] == expected, state
                rounds.append(state["round"])
                for _ in range(20):
                    self.debug(page, "award", 0)
                    if self.state(page)["screen"] != "play":
                        break
                assert self.state(page)["screen"] == "roundover", self.state(page)
                page.locator("#next-round").click()
            self.screen(page, "results")
            assert len(set(rounds)) == 3, "Solo circuit skipped an arena"
            return {"rounds": rounds, "screen": "results"}

    def physics_circuit(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            page.locator("#start-solo").click()
            kills = 0
            for arena in range(3):
                self.screen(page, "play")
                assert self.state(page)["round"] == arena
                self.debug(
                    page,
                    "setInput",
                    1,
                    {"mx": 0, "mz": 0, "ax": -1, "az": 0, "fire": False, "dash": False},
                )
                self.debug(
                    page,
                    "setInput",
                    0,
                    {"mx": 0, "mz": 0, "ax": 1, "az": 0, "fire": True, "dash": False},
                )
                for point in range(1, 4):
                    self.debug(
                        page,
                        "setTank",
                        0,
                        {
                            "x": -2,
                            "z": 7,
                            "hp": 3,
                            "shield": 0,
                            "ammo": 3,
                            "cooldown": 0,
                            "reload": 0,
                        },
                    )
                    self.debug(
                        page, "setTank", 1, {"x": 2, "z": 7, "hp": 3, "shield": 0}
                    )
                    self.debug(page, "step", 1.25)
                    state = self.state(page)
                    assert state["scores"][0] == point, (
                        f"Arena {arena + 1}, point {point}: shells failed to wreck the rival: {state}"
                    )
                    kills += 1
                self.screen(page, "roundover")
                page.locator("#next-round").click()
            self.screen(page, "results")
            state = self.state(page)
            assert state["metrics"]["hits"] >= 27
            assert state["metrics"]["kills"] >= 9
            assert state["completed"] == [0, 1, 2]
            return {
                "arenas": 3,
                "physicsKills": kills,
                "metrics": state["metrics"],
                "screen": state["screen"],
            }

    def variant_mechanics(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            self.debug(page, "start", "solo", 1)
            neutral = {"mx": 0, "mz": 0, "ax": 1, "az": 0, "fire": False, "dash": False}
            self.debug(page, "setInput", 0, neutral)
            self.debug(page, "setInput", 1, neutral)
            self.debug(page, "step", 3)
            cloaked = self.state(page)
            assert all(tank["cloak"] > 0 for tank in cloaked["tanks"]), (
                "Ghost arena did not cloak idle tanks"
            )
            self.debug(page, "setInput", 0, {**neutral, "fire": True})
            self.debug(page, "step", 0.1)
            revealed = self.state(page)
            assert (
                revealed["tanks"][0]["cloak"] == 0
                and revealed["tanks"][0]["reveal"] > 0
            ), "Firing did not reveal the ghost tank"
            self.debug(page, "start", "solo", 2)
            self.debug(page, "setInput", 0, neutral)
            self.debug(page, "setInput", 1, neutral)
            self.debug(page, "setTank", 0, {"x": -8, "z": 7, "hp": 1, "shield": 0})
            self.debug(page, "spawnPickup", "repair", -8, 7)
            self.debug(page, "step", 0.1)
            assert self.state(page)["tanks"][0]["hp"] == 2, (
                "Repair pickup did not restore one armour"
            )
            self.debug(page, "spawnPickup", "overdrive", -8, 7)
            self.debug(page, "step", 0.1)
            boosted = self.state(page)
            assert boosted["tanks"][0]["overdrive"] > 6, (
                "Lightning did not activate rapid fire"
            )
            self.debug(page, "setTime", 0)
            self.debug(page, "step", 0.1)
            sudden = self.state(page)
            assert sudden["sudden"] and all(
                tank["hp"] <= 1 for tank in sudden["tanks"]
            ), "Time-up did not start one-hit sudden death"
            self.debug(page, "step", 2)
            shrunk = self.state(page)
            assert shrunk["zone"] < sudden["zone"], "Sudden-death zone did not shrink"
            return {
                "cloak": True,
                "fireReveals": True,
                "repair": True,
                "rapidFire": True,
                "suddenDeath": True,
                "zone": shrunk["zone"],
            }

    def combat_cover(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            self.debug(page, "start", "solo", 0)
            neutral = {"mx": 0, "mz": 0, "ax": 0, "az": 1, "fire": False, "dash": False}
            for seat in [0, 1]:
                self.debug(page, "setInput", seat, neutral)
            self.debug(page, "setTank", 0, {"x": 0, "z": 5.4, "hp": 3, "shield": 0})
            self.debug(page, "setTank", 1, {"x": 10, "z": -5, "hp": 3, "shield": 0})
            self.debug(page, "spawnShot", 0, {"x": 0, "z": 7, "dx": 0, "dz": 1})
            self.debug(page, "step", 0.5)
            own_hit = self.state(page)
            assert (
                own_hit["metrics"]["bounces"] >= 1 and own_hit["tanks"][0]["hp"] == 2
            ), "A banked own shell did not damage its owner"
            self.debug(
                page,
                "setTank",
                0,
                {"x": -3, "z": 6.5, "hp": 3, "shield": 0, "ammo": 3, "cooldown": 0},
            )
            self.debug(page, "setInput", 0, {**neutral, "az": -1, "fire": True})
            self.debug(page, "step", 1.1)
            self.debug(page, "setInput", 0, neutral)
            crate_state = self.state(page)
            assert any(
                o["type"] == "crate" and o["hp"] <= 0 for o in crate_state["obstacles"]
            ), "Three shells did not break the gold crate"
            self.debug(page, "start", "solo", 0)
            for seat in [0, 1]:
                self.debug(page, "setInput", seat, neutral)
            self.debug(
                page,
                "setTank",
                0,
                {"x": -6, "z": 2.65, "hp": 3, "shield": 0, "ammo": 3, "cooldown": 0},
            )
            before = self.state(page)
            self.debug(page, "setInput", 0, {**neutral, "az": -1, "fire": True})
            self.debug(page, "step", 0.1)
            self.debug(page, "setInput", 0, neutral)
            blocked = self.state(page)
            assert blocked["metrics"]["shots"] > before["metrics"]["shots"], (
                "Point-blank shot did not register"
            )
            assert blocked["bullets"] == 0, (
                "Point-blank shell spawned through solid cover"
            )
            self.debug(
                page,
                "setTank",
                0,
                {"x": -6, "z": 7.5, "hp": 3, "shield": 0, "ammo": 3, "cooldown": 0},
            )
            self.debug(page, "setTank", 1, {"x": -4, "z": 5, "hp": 3, "shield": 0})
            self.debug(page, "setInput", 0, {**neutral, "az": -1, "fire": True})
            self.debug(page, "step", 0.2)
            self.debug(page, "setInput", 0, neutral)
            blast = self.state(page)
            assert any(
                o["type"] == "barrel" and o["hp"] <= 0 for o in blast["obstacles"]
            ), "Fuel can did not explode"
            assert all(t["hp"] == 1 for t in blast["tanks"]), (
                "Fuel blast did not damage both tanks in range"
            )
            return {
                "bankedSelfHit": True,
                "breakableCover": True,
                "pointBlankCover": True,
                "fuelBlast": True,
            }

    def attract(self) -> dict[str, Any]:
        with self.page() as page:
            self.open_game(page)
            start = time.monotonic()
            self.screen(page, "title")
            page.wait_for_function(
                "window.__COMBOP__.inspect().screen === 'attract'", timeout=15000
            )
            elapsed = time.monotonic() - start
            before = self.state(page)
            self.debug(page, "step", 4)
            after = self.state(page)
            assert after["metrics"]["shots"] > before["metrics"]["shots"], (
                "Attract demo did not fire"
            )
            assert after["tanks"] != before["tanks"], "Attract demo did not move"
            page.keyboard.press("Enter")
            self.screen(page, "title")
            page.wait_for_timeout(200)
            assert self.state(page)["screen"] == "title", (
                "Attract exit key leaked into the menu"
            )
            return {
                "startedAfterSeconds": round(elapsed, 2),
                "motion": True,
                "fire": True,
                "exitConsumed": True,
            }

    def controller(self) -> dict[str, Any]:
        with self.page(controller=True) as page:
            self.open_game(page)
            self.pad(page, buttons=[13])
            page.wait_for_function(
                "document.querySelector('#start-local').classList.contains('focused')",
                timeout=10000,
            )
            self.pad(page, buttons=[])
            self.pad(page, buttons=[12])
            page.wait_for_function(
                "document.querySelector('#start-solo').classList.contains('focused')",
                timeout=10000,
            )
            self.pad(page, buttons=[])
            self.pad(page, buttons=[0])
            self.screen(page, "play")
            self.pad(page, buttons=[])
            self.debug(
                page,
                "setInput",
                1,
                {"mx": 0, "mz": 0, "ax": -1, "az": 0, "fire": False, "dash": False},
            )
            self.debug(page, "step", 3)
            self.debug(
                page,
                "setTank",
                0,
                {"x": -8, "z": 7, "hp": 3, "shield": 0, "ammo": 3, "cooldown": 0},
            )
            self.debug(page, "setTank", 1, {"x": 8, "z": 7, "hp": 3, "shield": 0})
            before = self.state(page)
            self.pad(page, axes=[0.8, 0, 1, 0], buttons=[7])
            self.debug(page, "step", 0.25)
            self.pad(page, axes=[0, 0, 0, 0], buttons=[])
            after = self.state(page)
            assert after["inputMode"] == "gamepad", after["inputMode"]
            assert after["metrics"]["shots"] > before["metrics"]["shots"], (
                "R2 produced no shot"
            )
            assert after["tanks"][0]["x"] != before["tanks"][0]["x"], (
                "Left stick did not move the tank"
            )
            dashes_before = after["metrics"]["dashes"]
            self.pad(page, buttons=[1])
            self.debug(page, "step", 0.1)
            self.pad(page, buttons=[])
            assert self.state(page)["metrics"]["dashes"] > dashes_before, (
                "Circle produced no burst"
            )
            self.pad(page, buttons=[9])
            self.screen(page, "paused")
            self.pad(page, buttons=[])
            self.pad(page, buttons=[9])
            self.screen(page, "play")
            self.pad(page, buttons=[])
            self.pad(page, buttons=[9])
            self.screen(page, "paused")
            self.pad(page, buttons=[])
            self.debug(page, "setTank", 0, {"dash": 0, "dashing": 0})
            dash_count = self.state(page)["metrics"]["dashes"]
            self.pad(page, buttons=[1])
            self.screen(page, "play")
            self.debug(page, "step", 0.1)
            assert self.state(page)["metrics"]["dashes"] == dash_count, (
                "Circle used to leave pause also triggered a burst"
            )
            self.pad(page, buttons=[])
            page.keyboard.press("Escape")
            self.screen(page, "paused")
            assert self.state(page)["inputMode"] != "gamepad", (
                "Keyboard input did not update prompt mode"
            )
            return {"movement": True, "fire": True, "pause": True, "inputSwitch": True}

    def touch(self) -> dict[str, Any]:
        with self.page(touch=True) as page:
            self.open_game(page)
            page.locator("#start-solo").tap()
            self.screen(page, "play")
            self.debug(page, "step", 3)
            before = self.state(page)
            cdp = page.context.new_cdp_session(page)
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 110, "y": 260, "id": 1},
                        {"x": 690, "y": 250, "id": 2},
                    ],
                },
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": 170, "y": 220, "id": 1},
                        {"x": 740, "y": 220, "id": 2},
                    ],
                },
            )
            page.wait_for_timeout(650)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            after = self.state(page)
            assert after["inputMode"] == "touch", after["inputMode"]
            assert (
                before["tanks"][0]["x"] != after["tanks"][0]["x"]
                or before["tanks"][0]["z"] != after["tanks"][0]["z"]
            ), "Touch stick did not move the tank"
            assert after["metrics"]["shots"] > before["metrics"]["shots"], (
                "Touch aim/assisted fire produced no shot"
            )
            page.locator("#pause-button").tap()
            self.screen(page, "paused")
            overflow = page.evaluate(
                "document.documentElement.scrollWidth > innerWidth"
            )
            assert not overflow, "Touch layout overflows the viewport"
            return {
                "viewport": "844x390",
                "twoTouches": True,
                "movement": True,
                "fire": True,
                "pause": True,
            }

    def local_versus(self) -> dict[str, Any]:
        with self.page(controller=True, controllers=2) as page:
            self.open_game(page)
            page.locator("#start-local").click()
            self.screen(page, "play")
            assert self.state(page)["mode"] == "local"
            self.debug(page, "step", 3)
            self.debug(page, "setTank", 0, {"x": -8, "z": 7, "shield": 0})
            self.debug(page, "setTank", 1, {"x": 8, "z": 7, "shield": 0})
            before = self.state(page)
            self.pad(page, index=0, axes=[0.8, 0, 1, 0], buttons=[7])
            self.pad(page, index=1, axes=[-0.8, 0, -1, 0], buttons=[7])
            page.wait_for_timeout(400)
            self.pad(page, index=0, axes=[0, 0, 0, 0], buttons=[])
            self.pad(page, index=1, axes=[0, 0, 0, 0], buttons=[])
            after = self.state(page)
            assert after["tanks"][0]["x"] > before["tanks"][0]["x"], (
                "Local player one did not move"
            )
            assert after["tanks"][1]["x"] < before["tanks"][1]["x"], (
                "Local player two did not move independently"
            )
            assert after["metrics"]["shots"] >= before["metrics"]["shots"] + 2, (
                "Both local players could not fire"
            )
            for _ in range(20):
                self.debug(page, "award", 1)
                if self.state(page)["screen"] != "play":
                    break
            self.screen(page, "roundover")
            assert self.state(page)["scores"][1] > self.state(page)["scores"][0]
            page.locator("#next-round").click()
            self.screen(page, "play")
            assert self.state(page)["scores"] == [0, 0], (
                "Rematch retained the old score"
            )
            return {"twoIndependentPlayers": True, "winner": 1, "rematch": True}

    def standalone_online(self) -> dict[str, Any]:
        with self.page() as host, self.page() as guest:
            self.open_game(host)
            host.locator("#settings-button").click()
            host.locator("#arena-select").select_option("2")
            self.back(host, "settings")
            host.locator("#start-online").click()
            self.open_game(guest)
            guest.locator("#start-online").click()
            invite = host.evaluate("async()=>await window.__COMBOP__.online.host()")
            assert isinstance(invite, str) and len(invite) > 50, (
                "Host generated no invitation"
            )
            answer = guest.evaluate(
                "async invite=>await window.__COMBOP__.online.join(invite)", invite
            )
            assert isinstance(answer, str) and len(answer) > 50, (
                "Guest generated no answer"
            )
            host.evaluate(
                "async answer=>await window.__COMBOP__.online.accept(answer)", answer
            )
            self.screen(host, "play")
            self.screen(guest, "play")
            guest.wait_for_function(
                "window.__COMBOP__.inspect().round===2", timeout=10000
            )
            assert self.state(host)["round"] == 2 and self.state(guest)["round"] == 2, (
                "Guest did not follow host's selected arena"
            )
            self.debug(host, "step", 3)
            self.debug(host, "setTank", 1, {"x": 6, "z": 7, "shield": 0})
            host.wait_for_timeout(200)
            before = self.state(host)
            guest.keyboard.down("d")
            host.wait_for_function(
                "before=>window.__COMBOP__.inspect().tanks[1].x>before+0.1",
                arg=before["tanks"][1]["x"],
                timeout=10000,
            )
            guest.keyboard.up("d")
            guest.wait_for_timeout(250)
            authoritative = self.state(host)
            observed = self.state(guest)
            assert authoritative["tanks"][1]["x"] > before["tanks"][1]["x"] + 0.1, (
                "Guest keyboard did not move the host's tank"
            )
            assert (
                abs(authoritative["tanks"][1]["x"] - observed["tanks"][1]["x"]) < 0.8
            ), "Guest did not receive the authoritative position"
            host_transport = host.evaluate("window.__COMBOP__.online.inspect()")
            guest_transport = guest.evaluate("window.__COMBOP__.online.inspect()")
            assert host_transport["connected"] and guest_transport["connected"], (
                "WebRTC connection dropped"
            )
            assert host_transport["sent"] > 0 and host_transport["received"] > 0, (
                "Host did not exchange snapshots and inputs"
            )
            assert guest_transport["sent"] > 0 and guest_transport["received"] > 0, (
                "Guest did not exchange inputs and snapshots"
            )
            host.evaluate("window.__COMBOP__.online.leave()")
            guest.wait_for_timeout(200)
            return {
                "host": host_transport,
                "guest": guest_transport,
                "synchronized": True,
            }

    def audio(self) -> dict[str, Any]:
        with self.page() as page:
            run_audio_checks = runpy.run_path(str(PROJECT / "test-audio.py"))[
                "run_audio_checks"
            ]
            report = run_audio_checks(page)
            assert not report["failures"], " | ".join(report["failures"])
            return report

    def capture(self, *, extra: bool = False) -> int:
        cases = (
            [
                (1920, 1080, "visual-tv", False, False),
                (390, 844, "visual-phone", True, True),
            ]
            if extra
            else [(1600, 900, "visual", False, True)]
        )
        count = 0
        for width, height, prefix, touch, play in cases:
            context = self.browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1,
                has_touch=touch,
                is_mobile=touch,
            )
            page = context.new_page()
            try:
                self.open_game(page)
                if touch:
                    page.touchscreen.tap(width - 20, 150)
                page.wait_for_timeout(3000)
                page.screenshot(path=str(PROJECT / f"{prefix}-title.png"))
                count += 1
                if play:
                    if touch:
                        page.locator("#start-solo").tap()
                    else:
                        page.locator("#start-solo").click()
                    page.wait_for_timeout(3000)
                    page.screenshot(path=str(PROJECT / f"{prefix}-play.png"))
                    count += 1
                (PROJECT / f"{prefix}-state.json").write_text(
                    json.dumps(self.state(page), indent=2) + "\n"
                )
            finally:
                context.close()
        return count

    def metadata(self) -> dict[str, Any]:
        assert GAME.is_file(), f"Missing packaged game: {GAME.name}"
        interview_path = ROOT / "exit-interview.json"
        data = json.loads(interview_path.read_text())
        assert set(data) == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        }
        expected_source = {
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
        assert set(data["sourceInformation"]) == expected_source
        assert data["sourceInformation"]["usage"] == "added on import"
        assert all(
            isinstance(value, str) and value.strip()
            for value in data["sourceInformation"].values()
        )
        for key, count in [
            ("testingFeedback", 4),
            ("engineFeedback", 6),
            ("promptFeedback", 4),
        ]:
            assert len(data[key]) == count, f"{key} must have {count} answers"
            assert all(
                isinstance(answer, str) and answer.strip() for answer in data[key]
            )
        catalogue = data["aiHub"]
        assert set(catalogue) == {
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
        }
        assert catalogue["name"] == "ComBop"
        assert catalogue["type"] in {"Game", "Tech demo", "Tool"}
        assert 3 <= len(catalogue["tags"]) <= 6
        assert all(tag == tag.lower() for tag in catalogue["tags"])
        assert all(
            isinstance(value, str) for key, value in catalogue.items() if key != "tags"
        )
        with self.page() as page:
            self.open_game(page)
            page.locator("#about-button").click()
            self.screen(page, "about")
            for tab in [
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
            ]:
                page.locator(f"[data-credit='{tab}']").click()
                actual = page.locator("#credits-body").text_content() or ""
                values = data[tab].values() if tab == "sourceInformation" else data[tab]
                for value in values:
                    assert value in actual, (
                        f"About {tab} does not match exit interview: {value}"
                    )
        return {
            "packageBytes": GAME.stat().st_size,
            "interview": "valid",
            "about": "matches exit-interview.json",
        }

    def hub(self, query: str) -> dict[str, Any]:
        with self.page() as page:
            url = f"{self.origin}/{SLUG}/harness.html?game=../{GAME.name}&auto=1&limit=8&{query}"
            response = page.goto(url, wait_until="domcontentloaded", timeout=90000)
            assert response and response.ok, "Hub harness unavailable"
            assert "Hub" in page.title(), "Unexpected harness page"
            page.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=180000
            )
            report = page.evaluate("window.__hubCheck")
            assert report and report.get("pass"), json.dumps(report, ensure_ascii=False)
            return report

    def save(self) -> int:
        failed = sum(not item["pass"] for item in self.results)
        merged = {item["name"]: item for item in self.previous}
        merged.update({item["name"]: item for item in self.results})
        recorded = list(merged.values())
        total_failed = sum(not item["pass"] for item in recorded)
        RESULT.write_text(
            json.dumps(
                {
                    "game": GAME.name,
                    "passed": len(recorded) - total_failed,
                    "failed": total_failed,
                    "lastRun": {
                        "passed": len(self.results) - failed,
                        "failed": failed,
                        "names": [item["name"] for item in self.results],
                    },
                    "latestPackageSha256": self.package_hash,
                    "seconds": round(time.monotonic() - self.started, 2),
                    "results": recorded,
                },
                indent=2,
                ensure_ascii=False,
            )
            + "\n"
        )
        print(
            f"{len(self.results) - failed}/{len(self.results)} checks passed; {failed} failed ({len(recorded) - total_failed}/{len(recorded)} recorded)",
            flush=True,
        )
        return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--hub-only",
        action="store_true",
        help="Run only the supplied AI Hub harness scenarios",
    )
    parser.add_argument(
        "--skip-hub", action="store_true", help="Run standalone checks only"
    )
    parser.add_argument(
        "--only",
        action="append",
        default=[],
        help="Run only check names containing this text (repeatable)",
    )
    parser.add_argument(
        "--capture",
        action="store_true",
        help="Capture title and gameplay composition images only",
    )
    parser.add_argument(
        "--capture-extra",
        action="store_true",
        help="Capture 1920px title and portrait phone title/gameplay only",
    )
    args = parser.parse_args()
    with local_server() as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=GPU_ARGS)
        try:
            suite = Suite(
                browser,
                origin,
                only=args.only,
                preserve=bool(args.only or args.hub_only or args.skip_hub),
            )
            if args.capture or args.capture_extra:
                count = suite.capture(extra=args.capture_extra)
                print(f"{count} screenshots captured; 0 checks run", flush=True)
                return 0
            if not args.hub_only:
                suite.check("package and exit interview", suite.metadata)
                suite.check(
                    "file boot and required engines", lambda: suite.boot(file=True)
                )
                suite.check(
                    "HTTP boot and required engines", lambda: suite.boot(file=False)
                )
                suite.check(
                    "menus, settings, pause, developer controls and credits",
                    suite.menus,
                )
                suite.check(
                    "real keyboard/mouse gameplay, pickup, damage and respawn",
                    suite.gameplay,
                )
                suite.check("complete three-arena solo circuit", suite.circuit)
                suite.check(
                    "scripted full circuit earned through physics combat",
                    suite.physics_circuit,
                )
                suite.check(
                    "ghost, repair, rapid fire and sudden death mechanics",
                    suite.variant_mechanics,
                )
                suite.check(
                    "ricochet self-hit, crates, fuel blasts and point-blank cover",
                    suite.combat_cover,
                )
                suite.check("ten-second attract demo and input exit", suite.attract)
                suite.check(
                    "standard controller movement, fire and pause", suite.controller
                )
                suite.check("multitouch play and compact pause", suite.touch)
                suite.check("local versus and rematch", suite.local_versus)
                suite.check("two-page standalone online match", suite.standalone_online)
                suite.check(
                    "synthesized audio energy, defaults and lifecycle", suite.audio
                )
            if not args.skip_hub:
                for name, query in [
                    ("two players", "players=2"),
                    ("impaired network", "players=2&latency=150&jitter=50&loss=5"),
                    ("host departure", "players=2&scenario=host-leave"),
                    ("server host", "players=2&scenario=server"),
                ]:
                    suite.check(f"AI Hub {name}", lambda query=query: suite.hub(query))
            return suite.save()
        finally:
            browser.close()


if __name__ == "__main__":
    raise SystemExit(main())
