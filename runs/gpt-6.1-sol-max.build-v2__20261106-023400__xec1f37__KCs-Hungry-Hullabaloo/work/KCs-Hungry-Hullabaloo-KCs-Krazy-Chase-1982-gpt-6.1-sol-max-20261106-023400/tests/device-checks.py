"""Assembled-file device and native-menu checks. Uses installed Playwright 1.63.

Run with ~/.local/share/pipx/venvs/playwright/bin/python tests/device-checks.py.
The script emits only failures and one summary line. Runtime is deterministic:
physical browser events are consumed by exact native-engine steps.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from collections.abc import Callable

from playwright.sync_api import Error, sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
ROOT = DEV.parent
DELIVERY = json.loads((DEV / "delivery.json").read_text())
CAPTURES = DEV / "artifacts" / "captures"
PAD_SCRIPT = """
window.__pads = Array.from({length:2},(_,index)=>({index,id:'Test DualSense '+index,
 connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],
 buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});
"""


class Checks:
    def __init__(self, browser, url: str, capture: bool = True):
        self.browser = browser
        self.url = url
        self.capture = capture
        self.passed = 0
        self.failures = []
        self.evidence = []

    def expect(self, value, detail: str):
        if not value:
            raise AssertionError(detail)
        self.passed += 1

    def run(self, label: str, fn: Callable):
        try:
            fn()
        except (AssertionError, Error, KeyError, TypeError, ValueError) as exc:
            message = f"FAIL {label}: {str(exc).splitlines()[0]}"
            self.failures.append(message)
            print(message)

    def load(self, options=None, pads=False):
        context = self.browser.new_context(
            **(options or {"viewport": {"width": 1280, "height": 720}})
        )
        if pads:
            context.add_init_script(PAD_SCRIPT)
        page = context.new_page()
        errors, requests = [], []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        page.goto(self.url)
        page.wait_for_function('window.__game?.snapshot().scene === "title"')
        page.evaluate("__game.game.stop(); __game.game.advance(.2,{draw:true})")
        return context, page, errors, requests

    @staticmethod
    def advance(page, seconds=0.05):
        page.evaluate("s=>__game.game.advance(s,{draw:true})", seconds)

    @staticmethod
    def snap(page):
        return page.evaluate("__game.snapshot()")

    def key(self, page, key, held=0.035, after=0.24):
        page.keyboard.down(key)
        self.advance(page, held)
        page.keyboard.up(key)
        self.advance(page, after)

    def pad(self, page, button, index=0, after=0.24):
        page.evaluate(
            "([i,b,on])=>Object.assign(__pads[i].buttons[b],{pressed:on,touched:on,value:on?1:0})",
            [index, button, True],
        )
        self.advance(page, 0.035)
        page.evaluate(
            "([i,b])=>Object.assign(__pads[i].buttons[b],{pressed:false,touched:false,value:0})",
            [index, button],
        )
        self.advance(page, after)

    def select(self, page, label, method="keyboard"):
        for _ in range(20):
            menu = self.snap(page)["menu"]
            if not menu or label not in menu["items"]:
                raise AssertionError(f"Menu has no {label!r}: {menu and menu['items']}")
            if menu["items"][menu["focus"]] == label:
                break
            if method == "pad":
                self.pad(page, 13)
            else:
                self.key(page, "ArrowDown")
        else:
            raise AssertionError(f"Could not focus {label!r}")
        if method == "pad":
            self.pad(page, 0)
        else:
            self.key(page, "Enter")

    @staticmethod
    def css_point(page, x, y):
        return page.evaluate(
            """([x,y])=>{const s=__game.game.screen,r=s.canvas.getBoundingClientRect();return [r.left+(s.OX+x*s.S)/s.dpr,r.top+(s.OY+y*s.S)/s.dpr]}""",
            [x, y],
        )

    def menu_point(self, page, label):
        menu = self.snap(page)["menu"]
        index = menu["items"].index(label)
        row = menu["rows"][index]
        if not row:
            raise AssertionError(f"{label!r} is not visible")
        return self.css_point(page, row[0] + row[2] / 2, row[1] + row[3] / 2)

    def click_menu(self, page, label, touch=False):
        x, y = self.menu_point(page, label)
        if touch:
            page.touchscreen.tap(x, y)
        else:
            page.mouse.click(x, y)
        self.advance(page, 0.3)

    def shot(self, page, name):
        if self.capture:
            page.screenshot(path=str(CAPTURES / f"device-{name}.png"))
            self.evidence.append(f"device-{name}.png")

    def clean(self, page, errors, requests):
        self.expect(not errors, "Browser errors: " + repr(errors))
        self.expect(not self.snap(page)["errors"], "Native engine errors")
        audio = [
            url
            for url in requests
            if re.search(r"\.(wav|mp3|ogg|m4a|flac|opus)(?:$|[?#])", url, re.IGNORECASE)
        ]
        self.expect(not audio, "Requested an audio asset: " + repr(audio))

    def bounds(self, page):
        info = page.evaluate(
            """()=>{const s=__game.game.screen;return {W:s.W,H:s.H,ox:s.OX,oy:s.OY,b:__game.view.bounds}}"""
        )
        self.expect(
            info["ox"] >= -1 and info["oy"] >= -1,
            "Physical canvas clips logical buffer",
        )
        b = info["b"]
        self.expect(
            b["x"] >= 10
            and b["y"] >= 25
            and b["x1"] <= info["W"] - 8
            and b["y1"] <= info["H"] - 16,
            "Garden extends beyond its safe margins",
        )

    def quit_title(self, page, touch=False):
        button = page.get_by_role("button", name="Quit to title", exact=True)
        button.tap() if touch else button.click()
        self.advance(page, 0.02)
        if page.evaluate("__game.game.shell.screen") == "confirm":
            confirm = page.get_by_role("button", name="Quit", exact=True)
            confirm.tap() if touch else confirm.click()
        self.advance(page, 0.3)

    def desktop(self):
        context, page, errors, requests = self.load(
            {"viewport": {"width": 1920, "height": 1080}}
        )
        try:
            self.expect(
                self.snap(page)["defaultMusic"] == 0.1, "Fresh music gain is not 0.1"
            )
            self.expect(
                "Continue" not in self.snap(page)["menu"]["items"],
                "Fresh profile exposes Continue",
            )
            self.shot(page, "tv-title")
            page.mouse.move(*self.menu_point(page, "About / credits"))
            self.advance(page)
            self.expect(
                self.snap(page)["menu"]["items"][self.snap(page)["menu"]["focus"]]
                == "About / credits",
                "Mouse hover does not focus a native menu row",
            )
            self.click_menu(page, "Play")
            self.expect(self.snap(page)["scene"] == "play", "Mouse Play did not start")
            self.bounds(page)
            self.shot(page, "tv-first")
            before = self.snap(page)["world"]["players"][0]["x"]
            self.key(page, "ArrowRight", held=0.35, after=0.02)
            self.expect(
                self.snap(page)["world"]["players"][0]["x"] > before + 0.8,
                "Keyboard movement failed",
            )
            goal = page.evaluate(
                """()=>{const v=__game.view;return [v.bounds.x+(10.5)*16*v.zoom,v.bounds.y+7.5*16*v.zoom]}"""
            )
            page.mouse.click(*self.css_point(page, *goal))
            self.advance(page, 0.08)
            self.expect(
                page.evaluate("__game.controls.goals.size") > 0,
                "Reachable mouse click did not create a route",
            )
            self.key(page, "ArrowUp", after=0.01)
            self.expect(
                page.evaluate("__game.controls.goals.size") == 0,
                "Directional input did not cancel mouse navigation",
            )
            self.key(page, "Escape")
            self.expect(self.snap(page)["paused"], "Escape did not pause")
            self.expect(
                page.get_by_role(
                    "button", name="Developer Tools", exact=True
                ).is_visible(),
                "Native pause lacks Developer Tools",
            )
            page.get_by_role("button", name="Controls", exact=True).click()
            self.advance(page)
            symbols = page.get_by_role("button", name=re.compile(r"Button symbols:"))
            for _ in range(5):
                if "Xbox" in (symbols.get_attribute("aria-label") or ""):
                    break
                symbols.click()
            self.expect(
                page.evaluate("__game.game.settings.glyphs") == "xbox",
                "Native Xbox symbols setting failed",
            )
            page.get_by_role("button", name="Close", exact=True).click()
            self.advance(page)
            if self.snap(page)["paused"]:
                page.get_by_role("button", name="Resume", exact=True).click()
                self.advance(page)
            self.expect(
                not self.snap(page)["paused"], "Controls close did not restore gameplay"
            )
            self.key(page, "Escape")
            self.quit_title(page)
            self.expect(
                self.snap(page)["scene"] == "title",
                "Native Quit did not return to title",
            )
            self.expect(
                "Continue" in self.snap(page)["menu"]["items"],
                "Valid garden checkpoint did not expose Continue",
            )
            self.select(page, "About / credits")
            self.expect(self.snap(page)["scene"] == "about", "About menu unreachable")
            for label, expected in [
                ("Source information", 0),
                ("Testing feedback", 1),
                ("Engine feedback", 2),
                ("Prompt feedback", 3),
                ("Credits & rules", 4),
            ]:
                self.select(page, label)
                self.expect(
                    page.evaluate("__game.state.about") == expected,
                    f"{label} card unreachable",
                )
                old = page.evaluate("__game.state.aboutPage")
                self.key(page, "ArrowRight")
                self.expect(
                    page.evaluate("__game.state.aboutPage") == old + 1,
                    f"{label} next-page input failed",
                )
                self.key(page, "Escape")
            self.shot(page, "tv-about")
            self.key(page, "Escape")
            self.expect(
                self.snap(page)["scene"] == "title", "About Back did not return"
            )
            page.evaluate(
                "__game.start(1,4)"
            )  # Isolated render coverage; campaign completion is tested separately.
            self.advance(page, 0.1)
            self.bounds(page)
            self.expect(
                len(self.snap(page)["world"]["crawlers"]) == 2,
                "Final garden lacks two crawlers",
            )
            self.shot(page, "tv-finale")
            self.clean(page, errors, requests)
        finally:
            context.close()

    def workshop(self):
        context, page, errors, requests = self.load()
        try:
            self.select(page, "Maze workshop")
            self.expect(self.snap(page)["scene"] == "workshop", "Workshop entry failed")
            self.key(page, "e")
            self.expect(
                self.snap(page)["editor"]["brush"] == 1, "Next brush input failed"
            )
            self.key(page, "Enter")
            self.expect(
                page.evaluate("__game.state.editor.level.rows[1][1]") == "#",
                "Workshop paint input failed",
            )
            self.key(page, "z")
            self.expect(
                page.evaluate("__game.state.editor.level.rows[1][1]") == ".",
                "Workshop undo failed",
            )
            self.key(page, "y")
            self.expect(
                page.evaluate("__game.state.editor.level.rows[1][1]") == "#",
                "Workshop redo failed",
            )
            self.key(page, "z")
            self.key(page, "Tab")
            self.select(page, "Validate")
            self.expect(
                self.snap(page)["editor"]["validation"]["ok"],
                "Original template no longer validates after undo",
            )
            self.key(page, "Tab")
            self.select(page, "Save garden")
            self.expect(
                page.evaluate("__game.store.creations().length") == 1,
                "Workshop save did not persist a creation",
            )
            self.key(page, "Tab")
            self.select(page, "Playtest")
            self.expect(
                self.snap(page)["scene"] == "play"
                and self.snap(page)["world"]["modified"],
                "Workshop playtest did not use modified common simulation",
            )
            self.key(page, "Escape")
            page.get_by_role("button", name="Return to workshop", exact=True).click()
            self.advance(page, 0.3)
            self.expect(
                self.snap(page)["scene"] == "workshop",
                "Playtest Return to workshop failed",
            )
            self.expect(
                page.evaluate("__game.state.editor.level.rows[1][1]") == ".",
                "Playtest return lost edits",
            )
            self.shot(page, "workshop")
            self.key(page, "Escape")
            self.expect(self.snap(page)["scene"] == "title", "Workshop Back failed")
            self.clean(page, errors, requests)
        finally:
            context.close()

    def pads(self):
        context, page, errors, requests = self.load(pads=True)
        try:
            self.pad(page, 0)
            self.expect(
                self.snap(page)["scene"] == "play",
                "Controller Cross could not start from title",
            )
            self.expect(
                self.snap(page)["input"]["device"] == "gamepad"
                and self.snap(page)["input"]["plant"] == "✕",
                "PlayStation prompts do not follow the pad",
            )
            page.evaluate("__pads[0].axes[0]=.75")
            before = self.snap(page)["world"]["players"][0]["x"]
            self.advance(page, 0.3)
            self.expect(
                self.snap(page)["world"]["players"][0]["x"] > before,
                "Controller stick did not move the keeper",
            )
            page.evaluate("__pads[0].axes[0]=0")
            page.evaluate(
                "Object.assign(__pads[0].buttons[8],{pressed:true,value:1});Object.assign(__pads[0].buttons[9],{pressed:true,value:1})"
            )
            self.advance(page, 0.03)
            self.expect(
                not self.snap(page)["paused"], "Create+Options was consumed as Pause"
            )
            page.evaluate(
                "for(const b of __pads[0].buttons)Object.assign(b,{pressed:false,value:0})"
            )
            self.advance(page)
            self.pad(page, 9)
            self.expect(self.snap(page)["paused"], "Controller Options did not pause")
            self.quit_title(page)
            self.select(page, "Local co-op", method="pad")
            self.expect(
                self.snap(page)["scene"] == "join", "Pad-only Local co-op entry failed"
            )
            self.pad(
                page, 0
            )  # Blue keyboard -> controller 1; coral automatically moves to controller 2.
            self.expect(
                page.evaluate("JSON.stringify(__game.state.assignment)") == "[0,1]",
                "Two pads did not receive separate seats",
            )
            self.select(page, "Start the feast", method="pad")
            self.expect(
                len(self.snap(page)["world"]["players"]) == 2,
                "Two-pad co-op did not start",
            )
            self.expect(
                [s["pad"] for s in self.snap(page)["input"]["seats"]] == [0, 1],
                "Physical device ownership is duplicated",
            )
            before = [(p["x"], p["y"]) for p in self.snap(page)["world"]["players"]]
            page.evaluate("__pads[0].axes[0]=.85")
            self.advance(page, 0.25)
            after = self.snap(page)["world"]["players"]
            self.expect(
                after[0]["x"] > before[0][0] + 0.5
                and abs(after[1]["x"] - before[1][0]) < 0.01,
                "Pad 1 silently moves both keepers",
            )
            page.evaluate("__pads[1].axes[0]=-.85")
            self.advance(page, 0.2)
            latest = self.snap(page)["world"]["players"]
            self.expect(
                latest[1]["x"] < after[1]["x"] - 0.4 and latest[0]["x"] > after[0]["x"],
                "Pad 2 steering leaks into pad 1's seat",
            )
            page.evaluate("__pads[1]=null")
            self.advance(page, 0.05)
            self.expect(
                self.snap(page)["paused"],
                "Controller disconnect did not pause standalone co-op",
            )
            self.expect(
                page.get_by_role(
                    "button", name="Continue solo", exact=True
                ).is_visible(),
                "Disconnect has no Continue solo action",
            )
            page.get_by_role("button", name="Continue solo", exact=True).click()
            self.advance(page, 0.15)
            self.expect(
                len(self.snap(page)["world"]["players"]) == 1
                and not self.snap(page)["paused"],
                "Continue solo failed after disconnect",
            )
            self.clean(page, errors, requests)
        finally:
            context.close()

    def keyboard_pad(self):
        context, page, errors, requests = self.load(pads=True)
        try:
            self.select(page, "Local co-op")
            self.select(page, "Start the feast")
            self.expect(
                [s["pad"] for s in self.snap(page)["input"]["seats"]] == [None, 0],
                "Keyboard plus pad ownership is wrong",
            )
            before = [p["x"] for p in self.snap(page)["world"]["players"]]
            self.key(page, "ArrowRight", held=0.25, after=0.01)
            after = self.snap(page)["world"]["players"]
            self.expect(
                after[0]["x"] > before[0] + 0.5
                and abs(after[1]["x"] - before[1]) < 0.01,
                "Keyboard steers the pad seat",
            )
            page.evaluate("__pads[0].axes[0]=-.85")
            self.advance(page, 0.2)
            self.expect(
                self.snap(page)["world"]["players"][1]["x"] < before[1] - 0.4,
                "Pad cannot steer the second seat",
            )
            self.key(page, "ArrowDown", after=0.01)
            page.evaluate("__pads[0].axes[0]=.03")
            self.advance(page, 0.15)
            self.expect(
                self.snap(page)["input"]["device"] == "keyboard",
                "Gamepad drift steals keyboard prompts",
            )
            self.clean(page, errors, requests)
        finally:
            context.close()

    def device(self, label, options, touch=True, multitouch=False):
        context, page, errors, requests = self.load(options)
        try:
            self.shot(page, label + "-title")
            self.bounds(page)
            self.click_menu(page, "Play", touch=touch)
            self.expect(
                self.snap(page)["scene"] == "play",
                label + " cannot start by tapping Play",
            )
            self.bounds(page)
            self.shot(page, label + "-play")
            if multitouch:
                session = context.new_cdp_session(page)
                start_x, start_y = 70, options["viewport"]["height"] - 150
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart",
                        "touchPoints": [{"id": 1, "x": start_x, "y": start_y}],
                    },
                )
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchMove",
                        "touchPoints": [{"id": 1, "x": start_x + 45, "y": start_y}],
                    },
                )
                before = self.snap(page)["world"]["players"][0]["x"]
                self.advance(page, 0.28)
                self.expect(
                    self.snap(page)["world"]["players"][0]["x"] > before + 0.6,
                    "Invisible touch stick did not move",
                )
                self.expect(
                    page.evaluate("__game.game.input._stickEl?.style.display")
                    == "none",
                    "Touch movement drew a permanent joystick deck",
                )
                plant = page.locator('button[data-act="plant"]')
                self.expect(
                    plant.is_visible(), "Legal touch planting has no contextual button"
                )
                rect = plant.bounding_box()
                old = self.snap(page)["world"]["seeds"]
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart",
                        "touchPoints": [
                            {"id": 1, "x": start_x + 45, "y": start_y},
                            {
                                "id": 2,
                                "x": rect["x"] + rect["width"] / 2,
                                "y": rect["y"] + rect["height"] / 2,
                            },
                        ],
                    },
                )
                self.advance(page, 0.06)
                self.expect(
                    self.snap(page)["world"]["seeds"] == old - 1,
                    "Second-finger PLANT did not spend exactly one seed",
                )
                session.send(
                    "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
                )
                self.advance(page, 0.04)
                self.expect(
                    not plant.is_visible(),
                    "Plant button remained while keeper already owns a sprout",
                )
            menu = page.get_by_role("button", name="Menu", exact=True)
            menu.tap() if touch else menu.click()
            self.advance(page)
            self.expect(self.snap(page)["paused"], label + " menu button cannot pause")
            self.quit_title(page, touch=touch)
            self.click_menu(page, "About / credits", touch=touch)
            self.expect(
                self.snap(page)["scene"] == "about", label + " cannot tap into About"
            )
            self.click_menu(page, "Source information", touch=touch)
            H = page.evaluate("__game.game.H")
            W = page.evaluate("__game.game.W")
            page.touchscreen.tap(*self.css_point(page, W / 2, H - 30))
            self.advance(page)
            self.expect(
                page.evaluate("__game.state.about") is None,
                label + " About Back tap failed",
            )
            self.clean(page, errors, requests)
        finally:
            context.close()

    def attract(self):
        context, page, errors, requests = self.load(pads=True)
        try:
            idle = page.evaluate("__game.arcade._idle")
            self.advance(page, max(0, 9.99 - idle))
            self.expect(
                self.snap(page)["scene"] == "title",
                "Attract started before ten idle seconds",
            )
            self.advance(page, 0.02)
            self.expect(
                self.snap(page)["attract"], "Attract did not begin at ten idle seconds"
            )
            self.key(page, "Enter", after=0.03)
            self.expect(
                self.snap(page)["scene"] == "title"
                and self.snap(page)["world"] is None,
                "Keyboard attract wake activated Play too",
            )
            self.advance(page, 10.1)
            page.mouse.move(500, 100)
            self.advance(page, 0.03)
            self.expect(
                self.snap(page)["scene"] == "title",
                "Pointer movement did not wake attract",
            )
            self.advance(page, 10.1)
            self.pad(page, 0, after=0.03)
            self.expect(
                self.snap(page)["scene"] == "title"
                and self.snap(page)["world"] is None,
                "Controller attract wake activated Play too",
            )
            self.advance(page, 10.1)
            page.evaluate("__pads[0].axes[1]=-.8")
            self.advance(page, 0.03)
            self.expect(
                self.snap(page)["scene"] == "title",
                "Analog movement did not wake attract",
            )
            page.evaluate("__pads[0].axes[1]=0")
            self.advance(page, 0.3)
            self.expect(
                not page.evaluate("!!__game.store.loadCheckpoint()"),
                "Attract wrote a campaign checkpoint",
            )
            self.clean(page, errors, requests)
        finally:
            context.close()

    def write_notes(self):
        notes = "# Assembled device checks\n\n"
        notes += f"Command: installed Playwright Python environment, `tests/device-checks.py`. {self.passed} passed assertions; {len(self.failures)} failed groups.\n\n"
        notes += "Chromium, the assembled single HTML opened over file://, exact native engine steps after real keyboard/mouse/touch events, standard-mapped gamepad stubs. No physical pads, touch hardware, television or iOS Safari were available.\n\n"
        notes += "## Failures\n\n" + (
            "\n".join(f"- {failure}" for failure in self.failures) or "None."
        )
        notes += (
            "\n\n## Purposeful captures\n\n"
            + "\n".join(f"- captures/{name}" for name in self.evidence)
            + "\n"
        )
        (DEV / "artifacts" / "device-notes.md").write_text(notes)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=(ROOT / DELIVERY["html"]).as_uri())
    parser.add_argument("--no-captures", action="store_true")
    parser.add_argument(
        "--groups",
        default="desktop,workshop,pads,keyboard_pad,phone,landscape_phone,tablet,attract",
    )
    args = parser.parse_args()
    CAPTURES.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        checks = Checks(browser, args.url, not args.no_captures)
        groups = {
            "desktop": checks.desktop,
            "workshop": checks.workshop,
            "pads": checks.pads,
            "keyboard_pad": checks.keyboard_pad,
            "phone": lambda: checks.device(
                "phone", p.devices["iPhone 13"], multitouch=True
            ),
            "landscape_phone": lambda: checks.device(
                "landscape-phone", p.devices["iPhone 13 landscape"]
            ),
            "tablet": lambda: checks.device("tablet", p.devices["iPad Mini"]),
            "attract": checks.attract,
        }
        for label in args.groups.split(","):
            if label not in groups:
                checks.failures.append(f"FAIL Unknown group: {label}")
                print(checks.failures[-1])
                continue
            checks.run(label, groups[label])
        checks.write_notes()
        browser.close()
        print(f"Device checks: {checks.passed} passed, {len(checks.failures)} failed")
        return bool(checks.failures)


if __name__ == "__main__":
    sys.exit(main())
